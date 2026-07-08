#!/usr/bin/env node
// sync-i18n.js — CLI principal.
//
// Uso:
//   ANTHROPIC_API_KEY=sk-... node sync-i18n.js <caminho/copy.jsx> [--write] [--snapshot <arquivo>]
//
// Por padrão roda em modo "dry-run": mostra o que seria traduzido, sem
// gravar nada. Passe --write para de fato atualizar o copy.jsx e o
// snapshot.
//
// O que faz:
//   1. Extrai pt/en atuais do copy.jsx (via AST real, não regex).
//   2. Compara pt contra o snapshot salvo da última sincronização e
//      contra o que já existe em en.
//   3. Para o que for novo ou tiver mudado, chama a API da Anthropic
//      pra traduzir, em UM único request (mais barato e consistente
//      que indicar e por chave).
//   4. Aplica as traduções no objeto en, escreve copy.jsx atualizado,
//      e atualiza o snapshot.
//   5. Imprime um relatório (novos, atualizados, inalterados, órfãos)
//      pra revisão humana rápida.

const fs = require('fs');
const path = require('path');

const { extractCopy } = require('./extract');
const { diffCopy } = require('./diff');
const { translateBatch } = require('./translate');
const { applyTranslationsToSource } = require('./apply-and-write');

function parseArgs(argv) {
  const args = { write: false, snapshot: null, file: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--write') args.write = true;
    else if (argv[i] === '--snapshot') args.snapshot = argv[++i];
    else if (!args.file) args.file = argv[i];
  }
  return args;
}

async function main() {
  const argv = process.argv.slice(2);
  const { write, snapshot: snapshotArg, file } = parseArgs(argv);

  if (!file) {
    console.error('Uso: node sync-i18n.js <caminho/copy.jsx> [--write] [--snapshot <arquivo>]');
    process.exit(1);
  }

  const filePath = path.resolve(file);
  const snapshotPath = path.resolve(snapshotArg || path.join(path.dirname(filePath), '.i18n-snapshot.json'));

  console.log(`Lendo ${filePath}...`);
  const { pt, en } = extractCopy(filePath);

  let snapshot = {};
  if (fs.existsSync(snapshotPath)) {
    snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    console.log(`Snapshot anterior carregado de ${snapshotPath}.`);
  } else {
    console.log('Nenhum snapshot anterior encontrado — primeira execução (tudo que faltar em en será traduzido; o resto fica intocado).');
  }

  const { toTranslate, unchangedCount, orphans } = diffCopy({ pt, en, snapshot });

  console.log(`\n--- Diagnóstico ---`);
  console.log(`Chaves inalteradas (não serão tocadas): ${unchangedCount}`);
  console.log(`Chaves a traduzir: ${toTranslate.length}`);
  if (orphans.length > 0) {
    console.log(`\n⚠ Chaves existem em EN mas não em PT (possível texto morto, não foi apagado):`);
    orphans.forEach((o) => console.log(`   - ${o}`));
  }

  if (toTranslate.length === 0) {
    console.log('\nNada para traduzir. EN já está sincronizado com PT.');
    return;
  }

  console.log(`\n--- Itens a traduzir ---`);
  toTranslate.forEach((item) => {
    console.log(`[${item.reason}] ${item.path}`);
  });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('\n[sem ANTHROPIC_API_KEY] Diagnóstico mostrado acima, mas não é possível traduzir.');
    console.log('Defina ANTHROPIC_API_KEY no ambiente e rode de novo para gerar as traduções.');
    return;
  }

  console.log(`\nChamando a API Claude para traduzir ${toTranslate.length} item(ns)...`);
  const translations = await translateBatch(toTranslate, { apiKey });

  console.log(`\n--- Traduções recebidas ---`);
  translations.forEach(({ path: p, en: enValue }) => {
    console.log(`${p} -> ${JSON.stringify(enValue)}`);
  });

  if (!write) {
    console.log('\n[dry-run] Nada foi escrito em disco. Rode novamente com --write para aplicar.');
    return;
  }

  const { appliedCount, skipped } = applyTranslationsToSource({
    originalFilePath: filePath,
    outputFilePath: filePath,
    translations,
  });

  if (skipped.length > 0) {
    console.log(`\n⚠ ${skipped.length} item(ns) não puderam ser aplicados automaticamente:`);
    skipped.forEach((s) => console.log(`   - ${s.path}: ${s.reason}`));
    console.log('Adicione essas chaves manualmente e rode o script de novo.');
  }

  fs.writeFileSync(snapshotPath, JSON.stringify(pt, null, 2), 'utf8');

  console.log(`\n✅ copy.jsx atualizado em ${filePath} (${appliedCount} edição(ões) aplicada(s))`);
  console.log(`✅ snapshot atualizado em ${snapshotPath}`);
  console.log('\nRevise o diff no git antes de commitar — tradução automática merece revisão humana.');
}

main().catch((err) => {
  console.error('\n❌ Erro:', err.message);
  process.exit(1);
});
