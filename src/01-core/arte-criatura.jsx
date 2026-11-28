/* A PINTURA DA CRIATURA (28/11/2026). Usuário: "quero apenas o rosto dos
   animais em destaque […] eu quero uma imagem para cada tipo de criatura. Ou
   seja, para todos os tipos de enviados, será uma única imagem."

   Uma pintura por TIPO, não por ficha: Enviado Menor, I, II… V dividem a
   mesma. A regra casa o NOME normalizado (sem acento, minúsculo), na ordem —
   a primeira que casar vence; o terceiro campo é o nome na galeria (menu
   Imagens). Pelo nome e não pelo subtipo porque o subtipo
   mistura planos: "Águia" é tanto a Águia Real celestial quanto a
   Águia-careca do plano material, e cada uma tem o seu rosto.

   Arquivos em public/criaturas/<arquivo>.webp (320px, rosto em close sobre o
   fundo #17110A das outras pinturas). Progresso em .impeccable/arte-equipamentos.md. */

const ARTE_CRIATURA = [
  // Celestiais (28/11/2026)
  [/^enviado\b/, 'enviado', 'Enviado (Menor, I a V)'],
  [/^pegaso\b/, 'pegaso', 'Pégaso'],
  [/^planindea\b/, 'planindea', 'Planindea'],
  [/^aguia real$/, 'aguia_real', 'Águia Real'],
  [/^cronomante\b/, 'cronomante', 'Cronomante'],
  // Infernais (28/11/2026). O Simbionte é subtipo Demônio no banco, mas tem rosto próprio.
  [/^demonio\b/, 'demonio', 'Demônio (Menor, I a V)'],
  [/^simbionte\b/, 'simbionte', 'Simbionte (e I a III)'],
  [/^cerberus\b/, 'cerberus', 'Cérberus'],
  [/^bulgae\b/, 'bulgae', 'Bulgae'],
  [/^cavalum\b/, 'cavalum', 'Cavalum'],
  [/^haalin\b/, 'haalin', 'Haalin'],
  // Civilizados (28/11/2026)
  [/^orc\b/, 'orc', 'Orc (Capitão, Rei)'],
  [/^goblin\b/, 'goblin', 'Goblin (Líder, Rei)'],
  [/^ogro\b/, 'ogro', 'Ogro (Líder, Rei)'],
  [/^gigante\b/, 'gigante', 'Gigante (da Colina, do Deserto, da Neve)'],
  [/^dragoniano\b/, 'dragoniano', 'Dragoniano (Jovem, Guerreiro, Líder)'],
];

/* OS ANIMAIS VÃO PELO SUBTIPO (28/11/2026, usuário: "para todos os tipos de
   cavalos, será uma única imagem"). O nome do animal quase nunca diz a
   espécie — Andaluz, Ardennes, Labrador, Sucuri —, e o subtipo da ficha diz.
   Vale só para tipo Animal: o Bulgae também é subtipo Cão, mas é Infernal e
   tem o seu rosto pela regra do nome. Chave: o subtipo normalizado. */
const ARTE_ANIMAL = [
  ['aguia', 'aguia', 'Águia (Águia-careca)'],
  ['avestruz', 'avestruz', 'Avestruz'],
  ['baleia', 'baleia', 'Baleia (Orca, Tagmariana)'],
  ['bufalo', 'bufalo', 'Búfalo (Lanoso, Mediterrâneo)'],
  ['camelo', 'camelo', 'Camelo'],
  ['canario', 'canario', 'Canário'],
  ['cao', 'cao', 'Cão (Labrador)'],
  ['cavalo', 'cavalo', 'Cavalo (Andaluz, Ardennes, do Rei, Élfico, Selvagem)'],
  ['cobra', 'cobra', 'Cobra (Sucuri)'],
  ['coruja', 'coruja', 'Coruja'],
];

const _normal = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function arteDaCriatura(criatura) {
  if (!criatura) return null;
  const n = _normal(criatura.nome);
  if (n) {
    for (const [re, arquivo] of ARTE_CRIATURA) {
      if (re.test(n)) return '/criaturas/' + arquivo + '.webp';
    }
  }
  if (_normal(criatura.tipo) === 'animal') {
    const sub = _normal(criatura.subtipo);
    const achou = sub && ARTE_ANIMAL.find(([chave]) => chave === sub);
    if (achou) return '/criaturas/' + achou[1] + '.webp';
  }
  return null;
}

// Todos os rostos pintados, para a galeria: [{ arq, nome }].
function rostosDeCriatura() {
  return [
    ...ARTE_CRIATURA.map(([, arq, nome]) => ({ arq, nome })),
    ...ARTE_ANIMAL.map(([, arq, nome]) => ({ arq, nome })),
  ];
}

Object.assign(window, { ARTE_CRIATURA, ARTE_ANIMAL, arteDaCriatura, rostosDeCriatura });
export { ARTE_CRIATURA, ARTE_ANIMAL, arteDaCriatura, rostosDeCriatura };
