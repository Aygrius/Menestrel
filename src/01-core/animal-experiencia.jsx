/* ============================================================
   EXPERIÊNCIA DO ANIMAL — um quinto da do dono, e o estágio que vem dela
   ============================================================
   Pedido do usuário (06/10/2026):
     "Os animais do personagem devem ganhar sempre 1/5 da experiência do
      personagem enquanto estiverem com ele, e evoluir quando alcançar a xp
      certa."

   TRÊS DECISÕES, e o porquê de cada uma:

   1. O ANIMAL GUARDA O QUE GANHOU, NÃO O TOTAL. Na instância do inventário
      entra só `xp`: o quinto acumulado desde que o bicho está com o
      personagem. O total de experiência dele é esse ganho SOMADO ao piso do
      estágio que o catálogo já lhe dava (xpMinimoDoEstagio).

      Sem esse piso, um cavalo de Estágio 4 (31 de XP na tabela) começaria a
      contar do zero e precisaria de 230 de XP do dono só para voltar a ser o
      que já era. Com o piso, ele parte de onde seu estágio o põe e sobe pela
      MESMA tabela do personagem (GAME_DATA.estagios) — é o que "alcançar a xp
      certa" quer dizer: a xp certa é a da tabela, a mesma para os dois.

   2. O ESTÁGIO NUNCA DESCE. `estagio = max(estágio do catálogo, calcEstagio
      (total))`. A espécie é o piso: um dragão de Estágio 20 não vira Estágio 1
      porque entrou na mochila hoje.

   3. A FRAÇÃO NÃO SE PERDE. `xp` guarda o quinto EXATO (0,2 por ponto do
      dono), e só o estágio e a leitura arredondam. Arredondar cada concessão
      jogaria fora quase toda a experiência de um Mestre que dá 1 de XP por
      vez — e o pedido diz "sempre 1/5", não "1/5 quando der número redondo".

   EVOLUIR É SUBIR DE ESTÁGIO, e estágio é o que move as fórmulas da criatura
   (EH = (12+Aura)×Estágio, VB = (Físico+Agilidade)×Estágio, RF/RM = Estágio +
   Físico/Aura). Como as colunas derivadas estão GRAVADAS no bestiário,
   `criaturaDoAnimal` recalcula as que dependem do estágio com as fórmulas de
   CriaturaFormulas — as mesmas que o editor de catálogo usa, para a ficha do
   bicho não dizer um número e o bestiário outro.

   Quem rega isto é a ficha: salvarExperiencia vê o quanto o personagem subiu
   e chama `distribuirXpNosAnimais` antes de gravar o inventário. Aqui não há
   banco nem React — só as contas.

   Depende de: GAME_DATA/calcEstagio (01-core/game-data.jsx), itensLivres
   (01-core/inventario-helpers.jsx) e CriaturaFormulas (09-bestiario) — todos
   lidos na hora da chamada, e com recuo seguro, para o módulo poder ser
   testado sozinho.
   ============================================================ */

/* "1/5 da experiência do personagem" — o divisor é UM número e mora aqui, não
   espalhado em cada chamada. */
const XP_ANIMAL_DIVISOR = 5;

// O quinto, exato: 7 de XP do dono valem 1,4 para o bicho.
function xpDoQuinto(deltaPj) {
  const d = Number(deltaPj) || 0;
  return d / XP_ANIMAL_DIVISOR;
}

/* Casas suficientes para o quinto de qualquer inteiro ser exato (0,2 / 0,4 /
   0,6 / 0,8) sem levar ruído de ponto flutuante para o jsonb. */
function arredondarXp(v) {
  const n = Number(v) || 0;
  return Math.round(n * 1e4) / 1e4;
}

function _tabelaEstagios() {
  const G = (typeof GAME_DATA !== 'undefined' ? GAME_DATA : null) || window.GAME_DATA || null;
  return (G && Array.isArray(G.estagios)) ? G.estagios : [];
}
function _calcEstagio(xp) {
  const f = (typeof calcEstagio === 'function' ? calcEstagio : null) || window.calcEstagio;
  if (f) return f(xp);
  const tbl = _tabelaEstagios();
  const x = Number(xp) || 0;
  const achou = tbl.find((e) => x >= e.min && x <= e.max);
  return achou ? achou.n : 1;
}

/* O PISO DE XP DE UM ESTÁGIO — o `min` da faixa dele na tabela. É o que põe o
   animal na mesma régua do personagem (decisão 1 acima). Estágio fora da
   tabela cai no piso da última faixa; sem tabela, 0. */
function xpMinimoDoEstagio(n) {
  const tbl = _tabelaEstagios();
  if (!tbl.length) return 0;
  const alvo = Math.max(1, Math.trunc(Number(n) || 1));
  const faixa = tbl.find((e) => e.n === alvo);
  if (faixa) return faixa.min;
  return alvo > tbl[tbl.length - 1].n ? tbl[tbl.length - 1].min : tbl[0].min;
}

// A faixa { min, max, n } em que um total de XP cai.
function faixaDoXp(xp) {
  const tbl = _tabelaEstagios();
  const x = Number(xp) || 0;
  return tbl.find((e) => x >= e.min && x <= e.max) || tbl[tbl.length - 1] || { min: 0, max: 1, n: 1 };
}

/* A EXPERIÊNCIA DO BICHO, pronta para a ficha e para a barra:
     ganho       o quinto acumulado na instância (`xp`)
     base/total  o piso do estágio de catálogo e a soma com o ganho
     estagioBase o estágio que o catálogo dá; estagio, o de agora
     dentro/span quanto já andou dentro do estágio atual, e o tamanho dele
     falta       quanto de XP ainda falta para o estágio seguinte (0 no teto)
   A barra do animal desenha dentro/span como a do personagem. */
function xpDoAnimal(instancia, criatura) {
  const it = instancia || {};
  const c = criatura || {};
  const estagioBase = Math.max(1, Math.trunc(Number(c.estagio) || 1));
  const base = xpMinimoDoEstagio(estagioBase);
  const ganho = Math.max(0, arredondarXp(it.xp));
  const total = base + ganho;
  const estagio = Math.max(estagioBase, _calcEstagio(total));
  const faixa = faixaDoXp(Math.max(total, xpMinimoDoEstagio(estagio)));
  const span = Math.max(1, faixa.max - faixa.min);
  const dentro = Math.max(0, Math.min(span, total - faixa.min));
  const tbl = _tabelaEstagios();
  const noTeto = faixa.n >= ((tbl[tbl.length - 1] || faixa).n);
  return {
    ganho, base, total, estagioBase, estagio,
    faixa, span, dentro, noTeto,
    // No último estágio não falta nada: não há estágio seguinte a alcançar.
    falta: noTeto ? 0 : Math.max(0, (faixa.max + 1) - total),
  };
}

// Só o número do estágio — o atalho que a maioria dos chamadores quer.
function estagioDoAnimal(instancia, criatura) {
  return xpDoAnimal(instancia, criatura).estagio;
}

/* A CRIATURA COMO O ANIMAL ESTÁ HOJE. Sem evolução devolve a MESMA referência
   (nada de objeto novo a cada render); evoluído, devolve a cópia com o estágio
   novo e as duas colunas gravadas que dependem dele recalculadas pelas
   fórmulas do bestiário. Resistência Física/Mágica não entram porque não são
   coluna: a ficha as calcula na hora, já a partir do estágio. */
function criaturaDoAnimal(instancia, criatura) {
  if (!criatura) return criatura;
  const estagio = estagioDoAnimal(instancia, criatura);
  const base = Math.max(1, Math.trunc(Number(criatura.estagio) || 1));
  if (estagio <= base) return criatura;
  const F = (typeof CriaturaFormulas !== 'undefined' ? CriaturaFormulas : null) || window.CriaturaFormulas || {};
  const evoluida = { ...criatura, estagio };
  if (F.energiaHeroica) evoluida.energia_heroica = F.energiaHeroica(evoluida);
  if (F.velocidade) evoluida.velocidade = F.velocidade(evoluida);
  return evoluida;
}

/* ── A DISTRIBUIÇÃO ─────────────────────────────────────────────────────── */

/* "enquanto estiverem COM ELE": animal que está na mochila do personagem e é
   dele. Fica fora o que está à venda (itensLivres já tira), porque anúncio na
   loja não é companhia, e o que está pendurado em outro bicho. */
function ehAnimalDoPersonagem(it, catalogoBySlug) {
  if (!it || it.animal_id) return false;
  const cat = (catalogoBySlug || {})[it.slug];
  return !!(cat && cat.criatura_id != null);
}

/* O inventário depois de o dono ganhar `deltaPj` de experiência. Devolve
     { itens, evoluiram: [{ instanceId, nome, de, para }], mudou }
   e a MESMA lista quando não há nada a fazer — delta não positivo, nenhum
   animal — para não disparar gravação à toa.

   Delta NEGATIVO não tira nada do bicho: o pedido fala em GANHAR, e o que o
   animal aprendeu correndo com o dono não se desaprende porque o Mestre
   corrigiu um número para baixo. */
function distribuirXpNosAnimais(itens, deltaPj, catalogoBySlug, criaturasPorId) {
  const lista = Array.isArray(itens) ? itens : [];
  const delta = Number(deltaPj) || 0;
  const quinto = xpDoQuinto(delta);
  if (!(quinto > 0)) return { itens: lista, evoluiram: [], mudou: false };

  const livres = (typeof itensLivres === 'function' ? itensLivres : null) || window.itensLivres
    || ((xs) => (Array.isArray(xs) ? xs.filter(Boolean) : []));
  const elegiveis = new Set(livres(lista)
    .filter((it) => ehAnimalDoPersonagem(it, catalogoBySlug))
    .map((it) => it.instanceId));
  if (!elegiveis.size) return { itens: lista, evoluiram: [], mudou: false };

  const evoluiram = [];
  const out = lista.map((it) => {
    if (!it || !elegiveis.has(it.instanceId)) return it;
    const cat = (catalogoBySlug || {})[it.slug] || {};
    const criatura = (criaturasPorId || {})[cat.criatura_id] || null;
    const antes = criatura ? estagioDoAnimal(it, criatura) : null;
    const novo = { ...it, xp: arredondarXp(Math.max(0, arredondarXp(it.xp)) + quinto) };
    const depois = criatura ? estagioDoAnimal(novo, criatura) : null;
    if (antes != null && depois > antes) {
      evoluiram.push({
        instanceId: it.instanceId,
        nome: cat.nome || criatura.nome || it.slug,
        de: antes, para: depois,
      });
    }
    return novo;
  });
  return { itens: out, evoluiram, mudou: true };
}

Object.assign(window, {
  XP_ANIMAL_DIVISOR, xpDoQuinto, arredondarXp,
  xpMinimoDoEstagio, faixaDoXp, xpDoAnimal, estagioDoAnimal,
  criaturaDoAnimal, ehAnimalDoPersonagem, distribuirXpNosAnimais,
});
