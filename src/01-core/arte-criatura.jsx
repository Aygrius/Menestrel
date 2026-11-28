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
];

function arteDaCriatura(criatura) {
  if (!criatura) return null;
  const n = String(criatura.nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  if (!n) return null;
  for (const [re, arquivo] of ARTE_CRIATURA) {
    if (re.test(n)) return '/criaturas/' + arquivo + '.webp';
  }
  return null;
}

Object.assign(window, { ARTE_CRIATURA, arteDaCriatura });
export { ARTE_CRIATURA, arteDaCriatura };
