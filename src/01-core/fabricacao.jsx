/* ============================================================
   FABRICAÇÃO — a bancada: receita, teste e tempo de construção
   ============================================================
   Pedidos do usuário (06/10/2026):
     "Com base nesses novos itens será possível fabricar armas e outros itens e
      acessórios, com um teste específico de cada habilidade que possuir nível
      Difícil, por exemplo, para fabricar uma Capa Simples, é necessário 20 de
      algodão, possuir a habilidade artesanato e um teste difícil."
     "Para fazer uma adaga, será necessário 20 aço, 2 madeira, 1 couro, possuir
      metalurgia e um teste dificil. Para fazer um violão, será necessário 40
      madeira, 5 linho, 5 seda e 5 cânhamo, possuir artesanato e um teste
      dificil. Adicione também um tempo para construção dos itens, assim que o
      teste for bem sucedido, o item em construção vai aparecer no inventário
      com uma linha inferior representando o tempo."
     "Teste falho consome os materiais."
     "Teremos um novo menu 'Fabricar', com todos os possíveis itens a serem
      fabricados, com sua 'receita' e itens necessários para o preparo."

   AS QUATRO REGRAS, e onde cada uma mora:

   1. A RECEITA é dado, não código: public.receitas (resultado_slug,
      habilidade_key, dificuldade, dias, materiais jsonb). 226 receitas geradas
      em scripts/sql/fabricacao-2026-10-06.sql, derivadas do próprio catálogo.

   2. O TESTE é o mesmo d20 do resto do jogo — RolagemD20Overlay resolve por
      resolverAcao e devolve { q, sucesso }. Nada novo: a bancada só escolhe a
      habilidade e a dificuldade da receita.

   3. O MATERIAL É CONSUMIDO NOS DOIS CASOS, decisão do usuário. É por isso que
      `consumirMateriais` roda ANTES de saber o resultado: o custo é da
      tentativa, não do sucesso. Errar a têmpera estraga o aço.

   4. O TEMPO corre em DIAS DE JOGO, e vence na leitura contra
      historias.data_jogo_atual — como status, magia ativa e bônus temporário.
      Nada avança a data sozinho neste projeto; um item que dependesse de
      rotina de fundo para ficar pronto nunca ficaria.

   O item em construção é uma instância normal do inventário com um carimbo
   `construindo: { pronto_em, dias, desde }`. Normal de propósito: ele pesa,
   ocupa casa e aparece na grade — o que ele não faz é ser usado, equipado,
   vendido ou transferido antes da hora (ver emConstrucao nos gates).

   Depende de: somarDiasFantasy / dataFantasyParaAbsoluto (01-core/helpers.jsx)
   e novoInstanceId (01-core/inventario-helpers.jsx).
   ============================================================ */

/* ── O QUE NÃO SE FABRICA ───────────────────────────────────────────────── */

/* ATAQUE NATURAL NÃO É ITEM (06/10/2026, pedido do usuário: "Coice, Mordida,
   etc não podem ser fabricados").

   Coice, Mordida, Garra, Bico, Chifre, Patada, Cauda, Hálito e Toque estão no
   catálogo como ARMAS porque é assim que a criatura os "equipa" (ver
   09-bestiario/criatura-formulas.jsx: as armas naturais entraram no catálogo
   de itens em 14/09/2026, no lugar da tabela fechada de offsets). A geração
   de receitas varreu o grupo Armas inteiro e, sem saber disso, prometeu uma
   bancada capaz de forjar uma mordida com 20 de aço.

   O que os separa de uma adaga não é o nome, é `ocupa`: eles não ocupam casa
   na mochila, porque não são objeto — são parte do corpo do bicho. Toda arma
   de verdade ocupa espaço. É esse o teste, e não uma lista de nomes que a
   próxima criatura com uma presa nova deixaria desatualizada.

   As linhas correspondentes saíram de public.receitas
   (scripts/sql/sem-receita-de-ataque-natural-2026-10-06.sql); esta função é a
   trava do lado de cá, para uma re-geração do catálogo não as trazer de volta
   à bancada sem ninguém notar. */
function ehAtaqueNatural(cat) {
  return !!(cat && cat.grupo === 'Armas' && (cat.ocupa == null || Number(cat.ocupa) === 0));
}

/* ── A RECEITA ──────────────────────────────────────────────────────────── */

// [{ slug, qtd }] — o que a receita pede, já saneado.
function materiaisDaReceita(receita) {
  const arr = (receita && Array.isArray(receita.materiais)) ? receita.materiais : [];
  return arr
    .map((m) => ({ slug: String((m && m.slug) || ''), qtd: Math.max(1, Math.trunc(Number(m && m.qtd) || 0)) }))
    .filter((m) => m.slug && m.qtd > 0);
}

/* Quantas unidades soltas de `slug` o personagem tem. Conta a mochila e o que
   está em recipiente (material guardado na bolsa continua sendo material), e
   ignora o que está à venda, no bicho ou em construção — nenhum dos três está
   à mão da bancada. */
function materialDisponivel(itens, slug) {
  const aVenda = (typeof estaAVenda === 'function') ? estaAVenda : (() => false);
  return (Array.isArray(itens) ? itens : []).reduce((s, it) => {
    if (!it || it.slug !== slug) return s;
    if (aVenda(it) || it.animal_id || it.construindo) return s;
    if (it.equipado || it.vestido) return s;
    return s + (Number(it.quantidade) || 0);
  }, 0);
}

/* O que falta para a receita → { ok, faltando: [{ slug, precisa, tem }] }. */
function conferirMateriais(receita, itens) {
  const faltando = materiaisDaReceita(receita)
    .map((m) => ({ ...m, tem: materialDisponivel(itens, m.slug) }))
    .filter((m) => m.tem < m.qtd)
    .map((m) => ({ slug: m.slug, precisa: m.qtd, tem: m.tem }));
  return { ok: faltando.length === 0, faltando };
}

/* A habilidade da receita, no nível que o personagem tem. `pjHabilidades` é
   personagens.habilidades ({ key: nivel }). Nível 0 ou ausente = não tem. */
function nivelDaHabilidade(pjHabilidades, key) {
  const n = Number((pjHabilidades || {})[key]);
  return Number.isFinite(n) ? n : 0;
}
function temAHabilidade(pjHabilidades, key) {
  return nivelDaHabilidade(pjHabilidades, key) > 0;
}

/* Dá para TENTAR esta receita? → { ok, motivo?, faltando? }
     'sem_receita'    o item não se fabrica
     'sem_habilidade' falta a habilidade que a receita exige
     'sem_material'   falta material (a lista vem em `faltando`)
   Note que "dá para tentar" não é "dá para conseguir": o teste pode falhar, e
   falhando o material vai embora do mesmo jeito. */
function podeFabricar(receita, itens, pjHabilidades) {
  if (!receita) return { ok: false, motivo: 'sem_receita' };
  if (!temAHabilidade(pjHabilidades, receita.habilidade_key)) {
    return { ok: false, motivo: 'sem_habilidade' };
  }
  const mat = conferirMateriais(receita, itens);
  if (!mat.ok) return { ok: false, motivo: 'sem_material', faltando: mat.faltando };
  return { ok: true };
}

/* ── O CUSTO DA TENTATIVA ───────────────────────────────────────────────── */

/* Os itens depois de pagar a receita. Gasta das pilhas na ordem em que estão,
   e some com a pilha que zerar — a mesma mecânica de prepararCarne e de
   consumirItensDoRitual. Devolve a lista nova, ou null se não dava para pagar
   (quem chama já conferiu com podeFabricar; isto é a rede). */
function consumirMateriais(itens, receita) {
  const lista = Array.isArray(itens) ? itens : [];
  const pedidos = materiaisDaReceita(receita);
  if (!conferirMateriais(receita, lista).ok) return null;

  const aVenda = (typeof estaAVenda === 'function') ? estaAVenda : (() => false);
  const usavel = (it) => it && !aVenda(it) && !it.animal_id && !it.construindo
    && !it.equipado && !it.vestido;

  let out = lista;
  pedidos.forEach(({ slug, qtd }) => {
    let falta = qtd;
    out = out.map((it) => {
      if (falta <= 0 || !usavel(it) || it.slug !== slug) return it;
      const tem = Number(it.quantidade) || 0;
      const tira = Math.min(falta, tem);
      falta -= tira;
      return tira >= tem ? { ...it, quantidade: 0 } : { ...it, quantidade: tem - tira };
    });
  });
  return out.filter((it) => (Number(it.quantidade) || 0) > 0 || it.quantidade == null);
}

/* ── A CONSTRUÇÃO ───────────────────────────────────────────────────────── */

/* A instância em construção, pronta para entrar no inventário. `dataJogo` é a
   data da mesa; sem ela o item entra SEM prazo e fica pronto na hora — o lado
   seguro (o jogador não perde o que fabricou porque a mesa não tem
   calendário). */
function itemEmConstrucao(receita, dataJogo, novoId) {
  const dias = Math.max(1, Math.trunc(Number(receita && receita.dias) || 1));
  const pronto = (typeof somarDiasFantasy === 'function' && dataJogo)
    ? somarDiasFantasy(dataJogo, dias) : null;
  const id = (novoId || (typeof novoInstanceId === 'function' ? novoInstanceId : null)
    || (() => `f${Date.now().toString(36)}`))();
  return {
    instanceId: id,
    slug: receita.resultado_slug,
    quantidade: 1,
    equipado: false,
    slot: null,
    containerId: null,
    observacao: null,
    ...(pronto ? { construindo: { desde: dataJogo, pronto_em: pronto, dias } } : {}),
  };
}

// Esta instância está na bancada, ainda não terminada?
function emConstrucao(it) {
  return !!(it && it.construindo && it.construindo.pronto_em);
}

/* Quanto já andou, de 0 a 100 — é o que a linha no rodapé do card desenha.
   Sem data de jogo, 100: não há prazo a correr. */
function progressoDaConstrucao(it, dataJogo) {
  if (!emConstrucao(it)) return 100;
  if (typeof dataFantasyParaAbsoluto !== 'function') return 0;
  const hoje = dataFantasyParaAbsoluto(dataJogo);
  const fim = dataFantasyParaAbsoluto(it.construindo.pronto_em);
  const ini = dataFantasyParaAbsoluto(it.construindo.desde);
  if (hoje == null || fim == null) return 0;
  const inicio = ini == null ? fim - Math.max(1, Number(it.construindo.dias) || 1) : ini;
  const total = fim - inicio;
  if (!(total > 0)) return 100;
  return Math.max(0, Math.min(100, Math.round(((hoje - inicio) / total) * 100)));
}

// Quantos dias de jogo ainda faltam. 0 = pronto.
function diasRestantes(it, dataJogo) {
  if (!emConstrucao(it)) return 0;
  if (typeof dataFantasyParaAbsoluto !== 'function') return 0;
  const hoje = dataFantasyParaAbsoluto(dataJogo);
  const fim = dataFantasyParaAbsoluto(it.construindo.pronto_em);
  if (hoje == null || fim == null) return 0;
  return Math.max(0, fim - hoje);
}

/* VENCIMENTO PREGUIÇOSO, como statusVigentes: o que ficou pronto perde o
   carimbo na LEITURA, e aí é item como qualquer outro. Pronto NO DIA — um item
   que fica pronto no 12 ainda está na bancada no 11 e já é item no 12.
   Devolve a MESMA lista quando nada mudou, para não disparar autosave à toa. */
function itensComConstrucaoPronta(itens, dataJogo) {
  const lista = Array.isArray(itens) ? itens : [];
  if (typeof dataFantasyParaAbsoluto !== 'function') return lista;
  const hoje = dataFantasyParaAbsoluto(dataJogo);
  if (hoje == null) return lista;
  let mudou = false;
  const out = lista.map((it) => {
    if (!emConstrucao(it)) return it;
    const fim = dataFantasyParaAbsoluto(it.construindo.pronto_em);
    if (fim == null || hoje < fim) return it;
    mudou = true;
    const { construindo, ...resto } = it;
    void construindo;
    return resto;
  });
  return mudou ? out : lista;
}

/* A tentativa inteira, pura: paga os materiais e, se o teste passou, põe o
   item na bancada. Devolve { ok, itens, sucesso, instanceId? } ou
   { ok:false, motivo }.

   `sucesso` vem de FORA (do d20, que já rolou): esta função não sorteia nada —
   é o que a deixa testável e o que mantém a rolagem num lugar só. */
function fabricar(itens, receita, pjHabilidades, sucesso, dataJogo, novoId) {
  const pode = podeFabricar(receita, itens, pjHabilidades);
  if (!pode.ok) return { ok: false, motivo: pode.motivo, faltando: pode.faltando };

  // O MATERIAL VAI EMBORA NOS DOIS CASOS (decisão do usuário): o custo é da
  // tentativa. Por isso o consumo vem antes de olhar `sucesso`.
  const semMaterial = consumirMateriais(itens, receita);
  if (!semMaterial) return { ok: false, motivo: 'sem_material' };
  if (!sucesso) return { ok: true, itens: semMaterial, sucesso: false };

  const novo = itemEmConstrucao(receita, dataJogo, novoId);
  return { ok: true, itens: [...semMaterial, novo], sucesso: true, instanceId: novo.instanceId };
}

Object.assign(window, {
  ehAtaqueNatural,
  materiaisDaReceita, materialDisponivel, conferirMateriais,
  nivelDaHabilidade, temAHabilidade, podeFabricar,
  consumirMateriais, itemEmConstrucao, emConstrucao,
  progressoDaConstrucao, diasRestantes, itensComConstrucaoPronta, fabricar,
});
