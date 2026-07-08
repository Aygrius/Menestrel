// apply-and-write.js — aplica traduções diretamente no texto-fonte do
// copy.jsx, editando SÓ os ranges de caracteres que correspondem aos valores
// que mudaram ou que precisam ser criados. Não regenera o arquivo inteiro:
// isso garante que o diff no git seja mínimo e que toda formatação manual
// (estilo inline vs. multi-linha, comentários, espaçamento) seja preservada
// intacta em todo o resto do arquivo.

const fs = require('fs');
const parser = require('@babel/parser');
const traverseMod = require('@babel/traverse');
const traverse = traverseMod.default;
const t = require('@babel/types');

function jsStringLiteral(value) {
  // Gera um literal de string JS com aspas simples como delimitador.
  // Apóstrofos dentro do texto usam a aspa curva tipográfica (’, U+2019)
  // em vez de escapar (\'), pra casar com o estilo já usado no copy.jsx
  // original (ex.: "Bard's Guarantee" -> Bard\u2019s). Isso também evita
  // strings com `\'` visualmente ruidosas em copy de marketing.
  const withCurlyApostrophe = String(value).replace(/'/g, '\u2019');
  const escaped = withCurlyApostrophe.replace(/\\/g, '\\\\');
  return `'${escaped}'`;
}

function jsValueLiteral(value) {
  if (typeof value === 'string') return jsStringLiteral(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => jsValueLiteral(v)).join(', ')}]`;
  }
  if (typeof value === 'object' && value !== null) {
    const entries = Object.keys(value).map((k) => `${k}: ${jsValueLiteral(value[k])}`);
    return `{ ${entries.join(', ')} }`;
  }
  throw new Error(`Não sei gerar literal para: ${JSON.stringify(value)}`);
}

// Localiza, dentro do AST de COPY.en, o nó-container (Object ou Array) pai e
// a propriedade/elemento (folha) correspondentes a um path do tipo "a.0.b".
// Suporta tanto chaves de objeto quanto índices numéricos de array.
function locateInEnAst(enNode, pathParts) {
  let current = enNode; // ObjectExpression ou ArrayExpression
  for (let i = 0; i < pathParts.length - 1; i++) {
    const key = pathParts[i];
    const isIndex = /^\d+$/.test(key);

    if (isIndex && t.isArrayExpression(current)) {
      const idx = Number(key);
      const el = current.elements[idx];
      if (!el || !(t.isObjectExpression(el) || t.isArrayExpression(el))) {
        return { parentNode: current, propertyNode: null, lastKey: key, missingFrom: i, isArrayParent: true };
      }
      current = el;
      continue;
    }

    if (!isIndex && t.isObjectExpression(current)) {
      const prop = current.properties.find(
        (p) => t.isObjectProperty(p) && (p.key.name === key || p.key.value === key)
      );
      if (!prop || !(t.isObjectExpression(prop.value) || t.isArrayExpression(prop.value))) {
        return { parentNode: current, propertyNode: null, lastKey: key, missingFrom: i, isArrayParent: false };
      }
      current = prop.value;
      continue;
    }

    // Tipo de nó incompatível com o tipo de chave do path (ex.: path pede
    // índice numérico mas o nó atual é objeto, ou vice-versa).
    return { parentNode: current, propertyNode: null, lastKey: key, missingFrom: i, isArrayParent: t.isArrayExpression(current) };
  }

  const lastKey = pathParts[pathParts.length - 1];
  const lastIsIndex = /^\d+$/.test(lastKey);

  if (lastIsIndex && t.isArrayExpression(current)) {
    const idx = Number(lastKey);
    const el = current.elements[idx] || null;
    return { parentNode: current, propertyNode: el, lastKey, missingFrom: null, isArrayParent: true, arrayIndex: idx };
  }

  if (!lastIsIndex && t.isObjectExpression(current)) {
    const propertyNode =
      current.properties.find(
        (p) => t.isObjectProperty(p) && (p.key.name === lastKey || p.key.value === lastKey)
      ) || null;
    return { parentNode: current, propertyNode, lastKey, missingFrom: null, isArrayParent: false };
  }

  return { parentNode: current, propertyNode: null, lastKey, missingFrom: pathParts.length - 1, isArrayParent: t.isArrayExpression(current) };
}

// Aplica uma lista de { path, en } no texto-fonte do arquivo, editando
// apenas os trechos necessários.
function applyTranslationsToSource({ originalFilePath, outputFilePath, translations }) {
  const code = fs.readFileSync(originalFilePath, 'utf8');
  const useCRLF = code.includes('\r\n');
  const NL = useCRLF ? '\r\n' : '\n';
  const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] });

  let enObjectNode = null;
  traverse(ast, {
    VariableDeclarator(node) {
      if (t.isIdentifier(node.node.id) && node.node.id.name === 'COPY') {
        const init = node.node.init;
        for (const prop of init.properties) {
          if (t.isObjectProperty(prop) && t.isIdentifier(prop.key) && prop.key.name === 'en') {
            enObjectNode = prop.value;
          }
        }
      }
    },
  });

  if (!enObjectNode) throw new Error('Não encontrei `en:` dentro de COPY.');

  const edits = [];
  const skipped = [];

  for (const { path: pathStr, en: value } of translations) {
    const parts = pathStr.split('.');
    const { parentNode, propertyNode, lastKey, missingFrom, isArrayParent } = locateInEnAst(enObjectNode, parts);

    if (missingFrom !== null) {
      skipped.push({ path: pathStr, reason: `caminho pai "${parts.slice(0, missingFrom + 1).join('.')}" não existe em en` });
      continue;
    }

    if (propertyNode) {
      // Já existe — substitui só o valor/elemento, no range exato do nó.
      // Para ObjectProperty o nó de valor é `propertyNode.value`; para
      // elemento de array o próprio `propertyNode` já é o nó de valor.
      const valueNode = isArrayParent ? propertyNode : propertyNode.value;
      edits.push({ start: valueNode.start, end: valueNode.end, replacement: jsValueLiteral(value) });
    } else if (isArrayParent) {
      // Índice novo num array (ex.: item adicionado a uma lista) — insere
      // como último elemento, antes do `]` de fechamento.
      const elements = parentNode.elements;
      const last = elements[elements.length - 1];
      const insertionPoint = last ? last.end : parentNode.start + 1;
      const lineStart = code.lastIndexOf('\n', last ? last.start : parentNode.start) + 1;
      const indent = code.slice(lineStart, last ? last.start : parentNode.start).match(/^[ \t]*/)[0];
      const newElSource = `,${NL}${indent}${jsValueLiteral(value)}`;
      edits.push({ start: insertionPoint, end: insertionPoint, replacement: newElSource });
    } else {
      // Chave nova num objeto — insere como última propriedade, antes do
      // `}` de fechamento, copiando a indentação da última propriedade
      // existente nesse mesmo objeto.
      const props = parentNode.properties;
      const last = props[props.length - 1];
      const insertionPoint = last ? last.end : parentNode.start + 1;

      const lineStart = code.lastIndexOf('\n', last ? last.start : parentNode.start) + 1;
      const indent = code.slice(lineStart, last ? last.start : parentNode.start).match(/^[ \t]*/)[0];

      const keyOut = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(lastKey) ? lastKey : jsStringLiteral(lastKey);
      const newPropSource = `,${NL}${indent}${keyOut}: ${jsValueLiteral(value)}`;

      edits.push({ start: insertionPoint, end: insertionPoint, replacement: newPropSource });
    }
  }

  edits.sort((a, b) => b.start - a.start);

  let newCode = code;
  for (const { start, end, replacement } of edits) {
    newCode = newCode.slice(0, start) + replacement + newCode.slice(end);
  }

  // Rede de segurança: nunca escrever um arquivo que não seja JS/JSX válido.
  // Se a edição quebrou a sintaxe por algum motivo, aborta sem tocar o disco.
  try {
    parser.parse(newCode, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
  } catch (err) {
    throw new Error(
      `As edições geradas quebrariam a sintaxe do arquivo (${err.message}). ` +
        `Nada foi escrito em disco — revise manualmente.`
    );
  }

  fs.writeFileSync(outputFilePath, newCode, 'utf8');

  return { appliedCount: edits.length, skipped };
}

module.exports = { applyTranslationsToSource };
