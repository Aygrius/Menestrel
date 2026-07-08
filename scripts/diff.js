// diff.js — decide o que precisa ser (re)traduzido.
//
// Regra:
//  - chave existe em pt, NÃO existe em en           -> traduzir (nova)
//  - chave existe em pt e en, mas pt mudou desde o   -> traduzir (atualizada)
//    snapshot anterior (snapshot = último pt sincronizado)
//  - chave existe em pt e en e pt NÃO mudou          -> não tocar (preserva
//                                                        edição manual do en)
//  - chave existe em en mas não existe mais em pt    -> reporta como "órfã"
//                                                        (não apaga automaticamente)
//
// Trabalha em "folhas": strings e arrays de strings/objetos simples são
// tratados como unidade de tradução (não quebra frase por frase).

function isLeaf(value) {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  if (Array.isArray(value)) {
    // array de primitivos = folha. array de objetos = container (desce).
    return value.every((v) => typeof v !== 'object' || v === null);
  }
  return false;
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function walk(ptNode, enNode, snapshotNode, pathArr, acc) {
  if (isLeaf(ptNode)) {
    const pathStr = pathArr.join('.');
    const existsInEn = enNode !== undefined;
    const hasSnapshot = snapshotNode !== undefined;
    // Só considera "pt mudou" se havia um snapshot anterior para comparar.
    // Sem snapshot (ex.: primeira execução do script neste projeto), não dá
    // pra saber se pt mudou — e nesse caso o en existente nunca é
    // sobrescrito sem motivo; só traduz o que realmente falta.
    const changedSincePtSnapshot = hasSnapshot && !deepEqual(ptNode, snapshotNode);

    if (!existsInEn) {
      acc.toTranslate.push({ path: pathStr, pt: ptNode, reason: 'nova' });
    } else if (changedSincePtSnapshot) {
      acc.toTranslate.push({ path: pathStr, pt: ptNode, currentEn: enNode, reason: 'pt_mudou' });
    } else {
      acc.unchanged.push({ path: pathStr });
    }
    return;
  }

  if (typeof ptNode === 'object' && ptNode !== null) {
    for (const key of Object.keys(ptNode)) {
      const childPt = ptNode[key];
      const childEn = enNode && typeof enNode === 'object' ? enNode[key] : undefined;
      const childSnap = snapshotNode && typeof snapshotNode === 'object' ? snapshotNode[key] : undefined;
      walk(childPt, childEn, childSnap, [...pathArr, key], acc);
    }
  }
}

function findOrphans(enNode, ptNode, pathArr, acc) {
  if (typeof enNode !== 'object' || enNode === null || Array.isArray(enNode)) return;
  for (const key of Object.keys(enNode)) {
    const childPt = ptNode && typeof ptNode === 'object' ? ptNode[key] : undefined;
    if (childPt === undefined) {
      acc.push([...pathArr, key].join('.'));
    } else {
      findOrphans(enNode[key], childPt, [...pathArr, key], acc);
    }
  }
}

function diffCopy({ pt, en, snapshot }) {
  const acc = { toTranslate: [], unchanged: [] };
  walk(pt, en || {}, snapshot || {}, [], acc);

  const orphans = [];
  findOrphans(en || {}, pt, [], orphans);

  return {
    toTranslate: acc.toTranslate,
    unchangedCount: acc.unchanged.length,
    orphans, // chaves em en sem correspondente em pt — reportar, não apagar
  };
}

module.exports = { diffCopy, isLeaf, deepEqual };
