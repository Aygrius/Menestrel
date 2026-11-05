/* ============================================================
   inventario-casas.jsx — itens soltos em qualquer casa (02/10/2026)
   ============================================================
   "Tanto no inventário, como nos itens que armazenam outros itens, eu quero
    que o usuário possa mover os objetos livremente, podendo deixá-los
    espalhados em qualquer slot." (usuário)

   Cada item guarda `casa`: o índice da casa na grade do LUGAR onde está — o
   inventário solto (containerId null) ou o interior de um recipiente, que tem
   a sua grade própria. A grade continua acompanhando a largura da tela (o
   usuário pediu assim): numa tela mais estreita o item desce de linha, mas
   os vãos entre os itens continuam.

   Item sem casa — inventário antigo, compra, transferência, item que volta
   da loja, unidade criada pela separação de pilhas — vai para a primeira
   casa livre. Duas no mesmo lugar (mescla de duas telas) também: a segunda
   cede. Tudo puro, sem React nem banco.
   ============================================================ */

const casaValida = (c) => Number.isInteger(c) && c >= 0;
const lugarDe = (it) => (it && it.containerId) || null;

/* Dá casa a quem não tem (ou tem inválida, ou repetida no mesmo lugar),
   na primeira livre do lugar dele. Quem já tem casa válida fica onde está.
   Devolve o MESMO array quando nada muda — o efeito de normalização do
   inventário depende disso para não disparar o autosave em laço. */
function posicionarCasas(itens) {
  if (!Array.isArray(itens)) return itens;
  const ocupadas = new Map();          // lugar → Set de casas
  const semCasa = [];                  // índices a posicionar
  const ocup = (lugar) => {
    if (!ocupadas.has(lugar)) ocupadas.set(lugar, new Set());
    return ocupadas.get(lugar);
  };
  itens.forEach((it, i) => {
    if (!it) return;
    const set = ocup(lugarDe(it));
    if (casaValida(it.casa) && !set.has(it.casa)) set.add(it.casa);
    else semCasa.push(i);
  });
  if (semCasa.length === 0) return itens;
  const out = itens.slice();
  for (const i of semCasa) {
    const set = ocup(lugarDe(out[i]));
    let c = 0;
    while (set.has(c)) c++;
    set.add(c);
    out[i] = { ...out[i], casa: c };
  }
  return out;
}

/* Leva o item para `casa` no lugar onde ele está. Casa ocupada por outro
   item do mesmo lugar: os dois trocam. Nada a fazer (mesma casa, item que
   não existe, casa inválida): devolve o mesmo array. */
function moverParaCasa(itens, instanceId, casa) {
  if (!Array.isArray(itens) || !casaValida(casa)) return itens;
  const i = itens.findIndex((x) => x && x.instanceId === instanceId);
  if (i < 0) return itens;
  const it = itens[i];
  if (it.casa === casa) return itens;
  const lugar = lugarDe(it);
  const j = itens.findIndex((x, k) => k !== i && x && lugarDe(x) === lugar && x.casa === casa);
  const out = itens.slice();
  out[i] = { ...it, casa };
  if (j >= 0) {
    const origem = casaValida(it.casa) ? it.casa : undefined;
    out[j] = { ...out[j], casa: origem };
  }
  // Quem trocou com um item sem casa ganha a primeira livre.
  return j >= 0 && !casaValida(it.casa) ? posicionarCasas(out) : out;
}

/* ── 80 CASAS, NO MÁXIMO (30/10/2026) ─────────────────────────────────────
   "O inventário do personagem deve ter 80 casas fixas no máximo." · o 81º
   item: "Isso, 'Inventário cheio'" — recusado em todo caminho (usuário).

   Ocupa casa todo item fora de recipiente — o que a grade de fora desenha,
   equipados e peças do animal inclusive. A MESMA conta vive no banco
   (_menestrel_casas_no_bau, scripts/sql/inventario-80-casas-2026-10-30.sql),
   que recusa a gravação com 'inventario_cheio'; aqui ela recusa antes, na
   tela, sem ida ao servidor. */
const INV_CASAS_MAX = 80;
const INV_CHEIO = 'inventario_cheio';

function casasNoBau(itens) {
  return (Array.isArray(itens) ? itens : []).filter((it) => it && !lugarDe(it)).length;
}

/* A mudança de `antes` para `depois` passa das 80? Só o que AUMENTA conta:
   um inventário já acima (dado antigo) ainda grava o que não piora. */
function bauEstourou(antes, depois) {
  const n = casasNoBau(depois);
  return n > INV_CASAS_MAX && n > casasNoBau(antes);
}

/* O erro do banco (ou o da tela), em texto de gente. */
function textoInventarioCheio(en) {
  return en ? 'Inventory full — it has 80 slots.' : 'Inventário cheio — ele tem 80 casas.';
}
function ehInventarioCheio(erro) {
  const msg = typeof erro === 'string' ? erro : (erro && erro.message) || '';
  return msg.includes(INV_CHEIO);
}

Object.assign(window, {
  posicionarCasas, moverParaCasa,
  INV_CASAS_MAX, INV_CHEIO, casasNoBau, bauEstourou, textoInventarioCheio, ehInventarioCheio,
});
