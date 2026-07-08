#!/usr/bin/env node
// apply-manual.js — versão SEM custo de API.
//
// Use isso quando você já sabe a tradução (eu te dei no chat, ou você
// mesmo escreveu) e só quer aplicar no copy.jsx com segurança — preserva
// formatação, revalida sintaxe, sem chamar a Anthropic API.
//
// Uso:
//   1. Edite a lista TRADUCOES_MANUAIS abaixo com os paths e textos.
//   2. node apply-manual.js ../src/01-core/copy.jsx
//
// Não precisa de ANTHROPIC_API_KEY — não faz nenhuma chamada de rede.

const fs = require('fs');
const path = require('path');
const { applyTranslationsToSource } = require('./apply-and-write');

// ====== EDITE AQUI: cole os paths e as traduções que você já tem ======
const TRADUCOES_MANUAIS = [
  { path: 'pain.h1_accent', en: 'You love RPG,' },
];
// ========================================================================

function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Uso: node apply-manual.js <caminho/copy.jsx>');
    process.exit(1);
  }

  const resolved = path.resolve(filePath);
  console.log(`Aplicando ${TRADUCOES_MANUAIS.length} tradução(ões) manual(is) em ${resolved}...\n`);

  TRADUCOES_MANUAIS.forEach((t) => console.log(`  ${t.path} -> ${JSON.stringify(t.en)}`));

  const { appliedCount, skipped } = applyTranslationsToSource({
    originalFilePath: resolved,
    outputFilePath: resolved,
    translations: TRADUCOES_MANUAIS,
  });

  if (skipped.length > 0) {
    console.log(`\n⚠ ${skipped.length} item(ns) não aplicados:`);
    skipped.forEach((s) => console.log(`   - ${s.path}: ${s.reason}`));
  }

  console.log(`\n✅ ${appliedCount} edição(ões) aplicada(s) em ${resolved}`);
  console.log('Confira o diff (git diff) antes de comitar.');
}

main();
