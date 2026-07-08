// extract.js — lê copy.jsx, extrai os objetos `pt` e `en` como dados JS reais
// (via AST, não regex) e devolve { pt, en } em JSON puro pro resto do pipeline.

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');

function astLiteralToJs(node) {
  // Converte um nó AST de objeto/array/string/número em valor JS real.
  if (t.isStringLiteral(node)) return node.value;
  if (t.isNumericLiteral(node)) return node.value;
  if (t.isBooleanLiteral(node)) return node.value;
  if (t.isArrayExpression(node)) {
    return node.elements.map((el) => (el === null ? null : astLiteralToJs(el)));
  }
  if (t.isObjectExpression(node)) {
    const obj = {};
    for (const prop of node.properties) {
      if (!t.isObjectProperty(prop)) continue;
      const key = t.isIdentifier(prop.key) ? prop.key.name : prop.key.value;
      obj[key] = astLiteralToJs(prop.value);
    }
    return obj;
  }
  // Template literals sem interpolação (comuns em copy) — trata como string.
  if (t.isTemplateLiteral(node) && node.expressions.length === 0) {
    return node.quasis.map((q) => q.value.cooked).join('');
  }
  throw new Error(`Tipo de nó não suportado em copy.jsx: ${node.type}`);
}

function extractCopy(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });

  let result = null;

  traverse(ast, {
    VariableDeclarator(node) {
      if (t.isIdentifier(node.node.id) && node.node.id.name === 'COPY') {
        const init = node.node.init;
        if (!t.isObjectExpression(init)) {
          throw new Error('COPY não é um ObjectExpression — verifique o arquivo.');
        }
        result = astLiteralToJs(init);
      }
    },
  });

  if (!result) throw new Error('Não encontrei `const COPY = {...}` no arquivo.');
  if (!result.pt) throw new Error('COPY.pt não encontrado.');

  return result; // { pt: {...}, en: {...} | undefined }
}

if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Uso: node extract.js <caminho/copy.jsx>');
    process.exit(1);
  }
  const data = extractCopy(path.resolve(filePath));
  console.log(JSON.stringify(data, null, 2));
}

module.exports = { extractCopy };
