/* A PINTURA DA CRIATURA (28/11/2026). Usuário: "quero apenas o rosto dos
   animais em destaque […] eu quero uma imagem para cada tipo de criatura. Ou
   seja, para todos os tipos de enviados, será uma única imagem."

   Uma pintura por TIPO, não por ficha: Enviado Menor, I, II… V dividem a
   mesma. A regra casa o NOME normalizado (sem acento, minúsculo), na ordem —
   a primeira que casar vence. Pelo nome e não pelo subtipo porque o subtipo
   mistura planos: "Águia" é tanto a Águia Real celestial quanto a
   Águia-careca do plano material, e cada uma tem o seu rosto.

   Arquivos em public/criaturas/<arquivo>.webp (320px, rosto em close sobre o
   fundo #17110A das outras pinturas). Progresso em .impeccable/arte-equipamentos.md. */

const ARTE_CRIATURA = [
  // Celestiais (28/11/2026)
  [/^enviado\b/, 'enviado'],
  [/^pegaso\b/, 'pegaso'],
  [/^planindea\b/, 'planindea'],
  [/^aguia real$/, 'aguia_real'],
  [/^cronomante\b/, 'cronomante'],
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
