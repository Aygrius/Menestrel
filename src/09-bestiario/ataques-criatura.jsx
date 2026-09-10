/* ============================================================
   ATAQUES-CRIATURA — as duas tabelas por trás de dano_100 e L/M/P
   ============================================================
   As fórmulas antigas de criatura-formulas.jsx (dano100/danoLMP) foram
   migradas de um formulário de PERSONAGEM, que soma o dano de UMA arma
   específica (dano fixo da arma + modificador). Criatura não tem "uma
   arma": o dano dela é função da FAIXA DE PESO (dano_100) e de um OFFSET
   fixo por tipo de ataque (L/M/P) — duas tabelas fechadas, não um número
   de arma. As fórmulas antigas nunca reproduziram nenhuma criatura do
   banco; estas batem nas 9 conferidas em 10/09/2026 (ver
   criatura-formulas.test.js).

   ---- Tabela 1: faixa de peso -> dano ----
   Origem: public/ataques.csv (bloco "De/Até/Dano" no fim do arquivo — o
   CSV também tem uma tabela de ataques-modelo com nomes que NÃO são os do
   banco, ver aviso abaixo). Conferida contra
   scripts/sql/criaturas-garras-dano.sql, que já usava esta mesma faixa
   pra corrigir 18 criaturas de ataque "Garras" com dano_100 zerado.
   A última faixa (9001+) não tem teto: Dragão Imperial (peso 64.000) e
   Leviatã (100.000) caem nela igual a uma criatura de 9001, e os dois
   usam dano 48 no banco.

   ---- Tabela 2: offset de L/M/P por ataque ----
   dano_l − estágio − agilidade, calculado pra cada criatura do banco em
   10/09/2026 e conferido como CONSTANTE dentro de cada nome de ataque (a
   coluna `n` é quantas criaturas confirmaram aquele offset — não entra na
   conta, é só rastro de auditoria). 30 dos 31 nomes de ataque do banco
   têm offset constante.

   ⚠️ `Toque` fica de fora de propósito. É o único ataque cujo offset NÃO
   é constante entre criaturas — 12 criaturas confirmadas, valores de 1 a
   3 conforme a criatura. Uma média (ou qualquer outro valor único)
   inventaria uma regra onde os PRÓPRIOS DADOS discordam. Por isso
   `offsetLMP('Toque')` devolve null: o campo L/M/P fica em branco pro
   admin preencher à mão, em vez de mostrar um número calculado errado
   com confiança de fórmula. Por decisão explícita do usuário (spec da
   Task), `NOMES_ATAQUE_CRIATURA` — as opções do dropdown — também fica só
   com os 30 nomes desta tabela: "Toque" não é oferecido, embora seja um
   ataque real do banco (12 criaturas). O valor gravado dessas 12 não é
   apagado (o SelectPill só passa a exibir "—" em vez de "Toque" até o
   admin trocar o ataque por outro), mas fica sem opção própria no
   dropdown — ponto sinalizado no relatório da task, não uma correção
   silenciosa.

   ⚠️ NOMES: o dropdown usa os nomes COMO ESTÃO NO BANCO, não os do CSV.
   O CSV (histórico, tabela de ataques-modelo) usa "Garra", "Mordida",
   "Patada", "Hálito"; as 114 criaturas do banco usam "Garras", "Presas"
   (ou "Dentes"), "Patas", "Hálito Encantado". Não renomear — decisão do
   usuário em 10/09/2026.
   ============================================================ */

// ---------- Tabela 1: faixa de peso -> dano ----------
const FAIXAS_PESO_DANO = [
  { ate: 5, dano: 2 },
  { ate: 20, dano: 4 },
  { ate: 50, dano: 8 },
  { ate: 100, dano: 12 },
  { ate: 200, dano: 16 },
  { ate: 350, dano: 20 },
  { ate: 500, dano: 24 },
  { ate: 1000, dano: 28 },
  { ate: 3000, dano: 32 },
  { ate: 4500, dano: 36 },
  { ate: 6500, dano: 40 },
  { ate: 9000, dano: 44 },
  { ate: Infinity, dano: 48 },
];

function danoPorFaixaDePeso(peso) {
  const p = Number(peso) || 0;
  const faixa = FAIXAS_PESO_DANO.find((f) => p <= f.ate);
  return faixa ? faixa.dano : 48; // inatingível: a última faixa é Infinity
}

// ---------- Tabela 2: offset L/M/P por ataque ----------
// { l, m, p, n } — n é só auditoria (quantas criaturas confirmaram),
// nunca usado no cálculo. Toque NÃO entra aqui (ver aviso acima).
const OFFSET_LMP_ATAQUE = {
  'Adaga':              { l: 3,  m: -2, p: -3, n: 2 },
  'Arco':                { l: 1,  m: 0,  p: -4, n: 4 },
  'Arco Composto':       { l: 3,  m: 1,  p: -4, n: 2 },
  'Bico':                { l: 2,  m: -1, p: -4, n: 12 },
  'Cajado':              { l: 2,  m: -1, p: -3, n: 3 },
  'Cauda':               { l: 0,  m: 1,  p: 2,  n: 17 },
  'Chifres':             { l: 0,  m: -1, p: 0,  n: 5 },
  'Cimitarra':           { l: 2,  m: 1,  p: -3, n: 2 },
  'Dentes':               { l: 3,  m: 0,  p: -3, n: 1 },
  'Desarmado':           { l: 0,  m: -5, p: -7, n: 9 },
  'Espada':              { l: 3,  m: 0,  p: -3, n: 6 },
  'Espada Curta':        { l: 2,  m: 1,  p: -3, n: 5 },
  'Espada Élfica':       { l: 3,  m: 0,  p: -3, n: 1 },
  'Espada Longa':        { l: 2,  m: 0,  p: 2,  n: 7 },
  'Espada Montante':     { l: -3, m: 2,  p: 3,  n: 8 },
  'Faca':                { l: 3,  m: -2, p: -3, n: 2 },
  'Garras':              { l: 3,  m: 0,  p: -3, n: 22 },
  'Hálito Encantado':    { l: 1,  m: 1,  p: 1,  n: 41 },
  'Maça':                { l: -1, m: 1,  p: 0,  n: 1 },
  'Machadinha':          { l: 1,  m: 2,  p: -3, n: 1 },
  'Machado':             { l: 0,  m: 3,  p: -3, n: 1 },
  'Machado Anão':        { l: 0,  m: 3,  p: -2, n: 3 },
  'Machado Crescente':   { l: 0,  m: 3,  p: -3, n: 2 },
  'Machado de Guerra':   { l: 1,  m: 2,  p: -3, n: 1 },
  'Machado Lábris':      { l: -2, m: 3,  p: 2,  n: 1 },
  'Malho':               { l: 1,  m: 0,  p: -3, n: 1 },
  'Patas':               { l: 0,  m: -1, p: -2, n: 22 },
  'Porrete':             { l: 1,  m: 0,  p: -3, n: 4 },
  'Presas':              { l: 3,  m: 0,  p: -3, n: 24 },
  'Punhal':              { l: 3,  m: -2, p: -3, n: 1 },
};

function offsetLMP(nomeAtaque) {
  const o = OFFSET_LMP_ATAQUE[nomeAtaque];
  return o ? { l: o.l, m: o.m, p: o.p } : null;
}

// Lista pro dropdown do campo `ataque` (catalogo-descritores.jsx): os 30
// nomes desta tabela — SEM "Toque" de propósito, mesmo motivo do offset
// ausente (ver aviso acima). catalogo-editor.jsx ainda acrescenta, em
// tempo de execução, as armas do catálogo `itens` (grupo Armas) que não
// estiverem aqui, buscadas do banco.
const NOMES_ATAQUE_CRIATURA = Object.keys(OFFSET_LMP_ATAQUE)
  .sort((a, b) => a.localeCompare(b, 'pt'));

Object.assign(window, {
  AtaquesCriatura: {
    FAIXAS_PESO_DANO, danoPorFaixaDePeso,
    OFFSET_LMP_ATAQUE, offsetLMP,
    NOMES_ATAQUE_CRIATURA,
  },
});
