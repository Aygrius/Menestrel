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

   4. O TEMPO corre em HORAS DA ATIVIDADE FABRICAR desde 31/10/2026 (antes,
      dias de jogo vencendo contra historias.data_jogo_atual): o prazo sai do
      grupo do item (horasDeFabricacao) e anda quando o Mestre avança o
      relógio com o personagem em Fabricar (avancarFabricacao, chamado pelo
      shell). O carimbo antigo por data continua sendo lido.

   O item em construção é uma instância normal do inventário com um carimbo
   `construindo: { horas, horas_restantes }`. Normal de propósito: ele pesa,
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

/* [{ slug, qtd }] — o que a receita pede, já saneado. Duas formas novas
   (31/10/2026, reforma dos materiais pedida pelo usuário):
     • MATERIAL À ESCOLHA — { slugs: [...], qtd, nome }: "5x Osso Animal, Osso
       Profano, etc > 1x Marfim". Qualquer mistura dos slugs serve ("o
       roleplay que conta"); `slug` é o primeiro, para ícone e chave.
     • FERRAMENTA — { slug, qtd, ferramenta: true }: "Equipamentos podem ser
       usados 10 vezes antes de sumir". Precisa estar à mão; a tentativa gasta
       UM uso da instância (`usos`), não a peça. */
const USOS_FERRAMENTA = 10;
function materiaisDaReceita(receita) {
  const arr = (receita && Array.isArray(receita.materiais)) ? receita.materiais : [];
  return arr
    .map((m) => {
      const lista = Array.isArray(m && m.slugs) ? m.slugs.map(String).filter(Boolean) : [];
      const slug = String((m && m.slug) || lista[0] || '');
      const out = { slug, qtd: Math.max(1, Math.trunc(Number(m && m.qtd) || 0)) };
      if (lista.length > 1) out.slugs = lista;
      if (m && m.nome) out.nome = String(m.nome);
      if (m && m.ferramenta) out.ferramenta = true;
      return out;
    })
    .filter((m) => m.slug && m.qtd > 0);
}
const _slugsDo = (m) => m.slugs || [m.slug];
// Quanto do material (com as alternativas) está à mão.
function disponivelDoMaterial(itens, m) {
  return _slugsDo(m).reduce((s, slug) => s + materialDisponivel(itens, slug), 0);
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

/* A RECEITA É UM ITEM QUE SE COMPRA (31/10/2026, usuário: "só é possível
   fabricar com a receita, e eu quero saber como compra na loja. Mude o nome
   para 'Receita de Anel de Cobre'"). Cada linha de public.receitas tem o seu
   item no catálogo, `receita_<resultado_slug>`, chamado "Receita de <item>"
   (scripts/sql/receitas-viram-itens-2026-10-31.sql), e é ele que o Mestre
   põe na loja.

   APRENDER GASTA O ITEM (31/10/2026, usuário: "Quando o personagem aprende
   uma receita, o item da receita some e o personagem fica com a receita
   salva para fabricar quantos itens quiser"). O botão Aprender do item chama
   a RPC aprender_receita, que tira uma unidade do inventário e grava o
   resultado_slug em personagens.receitas_aprendidas — na mesma transação
   (scripts/sql/aprender-receita-2026-10-31.sql). A bancada lê essa lista;
   o item na mochila, sozinho, não fabrica nada. */
function receitaItemSlug(receita) {
  return receita && receita.resultado_slug ? 'receita_' + receita.resultado_slug : null;
}
function nomeDaReceita(cat, en) {
  const nome = (cat && cat.nome) || '';
  return en ? 'Recipe: ' + nome : 'Receita de ' + nome;
}
/* `aprendidas` é personagens.receitas_aprendidas: [resultado_slug, …].

   A HABILIDADE ENSINA A RECEITA (13/11/2026, usuário: "Ao comprar a
   habilidade 'Carpintaria', o personagem aprende as seguintes receitas").
   A receita com `aprende_com` (chave de habilidade) vem junto com o primeiro
   nível dela — sem item, sem RPC: deriva do nível, então quem perder a
   habilidade perde as receitas dela também. */
function receitaAprendida(aprendidas, receita, pjHabilidades) {
  if (!receita) return false;
  if (Array.isArray(aprendidas) && aprendidas.includes(receita.resultado_slug)) return true;
  return !!(receita.aprende_com && temAHabilidade(pjHabilidades, receita.aprende_com));
}
// Tem o item "Receita de …" à mão, ainda por aprender.
function temReceitaNaMochila(itens, receita) {
  const slug = receitaItemSlug(receita);
  return !!slug && materialDisponivel(itens, slug) > 0;
}

/* Quantas unidades UMA fabricação entrega (receitas.rende, padrão 1). A
   Porcelana rende 5 por Quartzo (31/10/2026, usuário: "1 quartzo fabrica 5
   porcelanas"). */
function rendeDaReceita(receita) {
  const n = Math.trunc(Number(receita && receita.rende) || 0);
  return n > 1 ? n : 1;
}

/* ── OS TESTES E O GRAU DA PEÇA (31/10/2026) ─────────────────────────────
   Pedido do usuário:
     "Para criar itens de armadura/arma pesada é necessário um teste Difícil de
      Metalurgia e um teste Difícil de Artesanato. [...] média [...] Metalurgia.
      [...] leve [...] Artesanato."
     "Espetacular e Absurdo +2 Defesa, Resistência, Absorção e +6 Dano. Muito
      Difícil +1 [...] e +3 Dano. Difícil o padrão. Médio −1 [...] e −3 Dano.
      Fácil −2 [...] e −6 Dano. Rotineiro −3 [...] e −9 Dano. Falha Crítica
      perde os itens e não cria nada."
     Com dois testes, vale o PIOR dos dois (sugestão aceita pelo usuário).

   Os testes moram na receita (receitas.testes, gravado pela classe da peça
   em scripts/sql/receita-por-peca-2026-10-31.sql). Receita sem a coluna
   segue com o teste único de sempre (habilidade_key), e só ela usa a régua
   antiga de sucesso/falha. */
function testesDaReceita(receita) {
  if (!receita) return [];
  const t = Array.isArray(receita.testes) ? receita.testes.filter(Boolean) : [];
  return t.length ? t : [receita.habilidade_key].filter(Boolean);
}
// A receita de peça de armadura/arma: o resultado do dado vira GRAU da peça.
function receitaComGrau(receita) {
  return !!(receita && Array.isArray(receita.testes) && receita.testes.length > 0);
}
// Os ajustes por grau moram em inventario-helpers (AJUSTE_POR_GRAU), que
// é quem soma Defesa, Absorção, Resistência e Dano da peça.
const _ORDEM_GRAU = ['FC', 'R', 'F', 'M', 'D', 'MD', 'E', 'A'];
// O pior de vários resultados (códigos ou índices q de RESULTADOS_ACAO).
function grauDosTestes(resultados) {
  const qs = (resultados || []).map((r) => (typeof r === 'number' ? r : _ORDEM_GRAU.indexOf(r)))
    .filter((q) => q >= 0);
  if (!qs.length) return null;
  return _ORDEM_GRAU[Math.min(...qs)];
}
/* O nome "Avambraço de Aldren" sai de `fabricado.por` — nomeDaPecaFabricada,
   em inventario-helpers, que os ataques e a janela do item também leem. */

/* O que falta para a receita → { ok, faltando: [{ slug, precisa, tem }] }. */
function conferirMateriais(receita, itens) {
  const faltando = materiaisDaReceita(receita)
    .map((m) => ({ ...m, tem: disponivelDoMaterial(itens, m) }))
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
     'sem_receita_item' o personagem não aprendeu a receita nem tem o item
     'receita_por_aprender' tem o item "Receita de …", mas ainda não aprendeu
     'sem_habilidade' falta a habilidade que a receita exige
     'sem_material'   falta material (a lista vem em `faltando`)
   Note que "dá para tentar" não é "dá para conseguir": o teste pode falhar, e
   falhando o material vai embora do mesmo jeito. */
function podeFabricar(receita, itens, pjHabilidades, aprendidas) {
  if (!receita) return { ok: false, motivo: 'sem_receita' };
  if (!receitaAprendida(aprendidas, receita, pjHabilidades)) {
    return { ok: false, motivo: temReceitaNaMochila(itens, receita) ? 'receita_por_aprender' : 'sem_receita_item' };
  }
  // Peça pesada pede as DUAS habilidades (31/10/2026).
  if (!testesDaReceita(receita).every((h) => temAHabilidade(pjHabilidades, h))) {
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
  pedidos.forEach((m) => {
    const slugs = _slugsDo(m);
    // Ferramenta: um uso a menos na primeira que estiver à mão. Acabaram os
    // usos, a unidade some (a pilha perde uma e a seguinte começa nova).
    if (m.ferramenta) {
      let feito = false;
      out = out.map((it) => {
        if (feito || !usavel(it) || !slugs.includes(it.slug)) return it;
        feito = true;
        const usos = (Number.isFinite(Number(it.usos)) ? Number(it.usos) : USOS_FERRAMENTA) - 1;
        if (usos > 0) return { ...it, usos };
        const q = Number(it.quantidade) || 1;
        const { usos: _u, ...semUsos } = it;
        void _u;
        return { ...semUsos, quantidade: q - 1 };
      });
      return;
    }
    let falta = m.qtd;
    out = out.map((it) => {
      if (falta <= 0 || !usavel(it) || !slugs.includes(it.slug)) return it;
      const tem = Number(it.quantidade) || 0;
      const tira = Math.min(falta, tem);
      falta -= tira;
      return tira >= tem ? { ...it, quantidade: 0 } : { ...it, quantidade: tem - tira };
    });
  });
  return out.filter((it) => (Number(it.quantidade) || 0) > 0 || it.quantidade == null);
}

/* ── A CONSTRUÇÃO ───────────────────────────────────────────────────────── */

/* O TEMPO SAI DO GRUPO, EM HORAS DE FABRICAR (31/10/2026, pedido do
   usuário: "Classifique o tempo de fabricação dos itens com base em seu
   grupo, armaduras 36 horas, armas 24 horas, por aí vai").

   Até aqui o prazo era em DIAS de calendário, tirados da raiz do valor
   (receitas.dias), e corria sozinho com a data da mesa. Agora a bancada é uma
   ATIVIDADE ("Adicione no menu atividades… Fabricar"): o item só anda nas
   horas em que o personagem está em Fabricar e o relógio da mesa avança —
   como a fila de treino. receitas.dias continua no banco, sem uso.

   Os dois do pedido ancoram a régua; os outros três ficam entre eles pelo
   tamanho do trabalho: instrumento é marcenaria fina (o mesmo dia da arma),
   roupa e joia meio dia, recipiente uma jornada. Grupo fora da tabela cai
   em HORAS_FABRICACAO_PADRAO. */
const HORAS_FABRICACAO_POR_GRUPO = {
  Armaduras: 36,
  Armas: 24,
  Instrumentos: 24,
  Vestimentas: 12,
  Recipientes: 8,
};
const HORAS_FABRICACAO_PADRAO = 12;

/* O PRAZO DA PRÓPRIA RECEITA (13/11/2026): as receitas que a habilidade
   ensina dizem o tempo ("fica pronto em 10 minutos", "em 24 horas") em
   receitas.minutos, que vence o do grupo. Pode dar fração de hora: a bancada
   anda com o relógio, e 10 minutos ficam prontos na primeira hora que passar. */
function horasDeFabricacao(cat, receita) {
  const min = Number(receita && receita.minutos);
  if (Number.isFinite(min) && min > 0) return min / 60;
  const h = cat && HORAS_FABRICACAO_POR_GRUPO[cat.grupo];
  return h || HORAS_FABRICACAO_PADRAO;
}

/* "10 min", "3 h", "1 d 12 h" — o prazo da receita e o que falta na fila. */
function textoDoPrazo(horas, en) {
  const total = Math.max(0, Math.ceil((Number(horas) || 0) * 60 - 1e-6));
  const d = Math.floor(total / 1440), h = Math.floor((total % 1440) / 60), m = total % 60;
  return [d ? `${d} d` : '', h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ')
    || (en ? '0 h' : '0 h');
}

/* A instância em construção, pronta para entrar no inventário, com as
   `horas` de Fabricar que ela pede. Sem horas (0, null) entra pronta.
   Fração de hora vale (receita em minutos). */
function itemEmConstrucao(receita, horas, novoId, fabricado) {
  const h = Math.max(0, Math.round((Number(horas) || 0) * 1000) / 1000);
  const id = (novoId || (typeof novoInstanceId === 'function' ? novoInstanceId : null)
    || (() => `f${Date.now().toString(36)}`))();
  return {
    instanceId: id,
    slug: receita.resultado_slug,
    quantidade: rendeDaReceita(receita),
    equipado: false,
    slot: null,
    containerId: null,
    observacao: null,
    // Quem fez e com que grau (31/10/2026): o nome e os ajustes saem daqui.
    ...(fabricado && fabricado.grau ? { fabricado: { por: fabricado.por || null, grau: fabricado.grau } } : {}),
    ...(h > 0 ? { construindo: { horas: h, horas_restantes: h } } : {}),
  };
}

/* Na bancada pelas HORAS (o carimbo de agora) ou pela DATA (o carimbo
   antigo, `pronto_em`, de quem fabricou antes de 31/10/2026 — esse continua
   vencendo na leitura, por itensComConstrucaoPronta). */
const _porHoras = (it) => !!(it && it.construindo && it.construindo.horas_restantes != null);
function emConstrucao(it) {
  if (!it || !it.construindo) return false;
  if (_porHoras(it)) return Number(it.construindo.horas_restantes) > 0;
  return !!it.construindo.pronto_em;
}

/* A FILA DA BANCADA: as horas de Fabricar vão para o PRIMEIRO item em
   construção, na ordem do inventário; a sobra passa ao seguinte — a mesma
   regra de avancarTreinos. O que zera perde o carimbo e vira item. Devolve
   { itens, prontos } com a MESMA lista quando nada andou, para
   alterarInventario não gravar à toa. */
function avancarFabricacao(itens, horas) {
  const lista = Array.isArray(itens) ? itens : [];
  let resto = Math.max(0, Number(horas) || 0);
  const prontos = [];
  if (resto <= 0 || !lista.some((it) => _porHoras(it) && emConstrucao(it))) return { itens: lista, prontos };
  const out = lista.map((it) => {
    if (resto <= 0 || !_porHoras(it) || !emConstrucao(it)) return it;
    const falta = Number(it.construindo.horas_restantes) || 0;
    const usa = Math.min(falta, resto);
    resto -= usa;
    if (falta - usa > 1e-6) return { ...it, construindo: { ...it.construindo, horas_restantes: falta - usa } };
    const { construindo, ...feito } = it;
    void construindo;
    prontos.push(feito);
    return feito;
  });
  return { itens: out, prontos };
}

/* Quanto já andou, de 0 a 100 — é o que a linha no rodapé do card desenha.
   Sem data de jogo, 100: não há prazo a correr. */
function progressoDaConstrucao(it, dataJogo) {
  if (!emConstrucao(it)) return 100;
  if (_porHoras(it)) {
    const total = Number(it.construindo.horas) > 0 ? Number(it.construindo.horas) : 1;
    const falta = Math.max(0, Number(it.construindo.horas_restantes) || 0);
    return Math.max(0, Math.min(100, Math.round(((total - falta) / total) * 100)));
  }
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
  if (!emConstrucao(it) || _porHoras(it)) return 0;
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
    if (!emConstrucao(it) || _porHoras(it)) return it;
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
   é o que a deixa testável e o que mantém a rolagem num lugar só. `horas` é
   o prazo do item (horasDeFabricacao do catálogo); `aprendidas`, as receitas
   que o personagem já sabe; `fabricado` ({ por, grau }), o carimbo da peça
   de receita com grau — quem chama já transformou o grau em `sucesso`
   (tudo menos Falha Crítica). */
function fabricar(itens, receita, pjHabilidades, sucesso, horas, novoId, aprendidas, fabricado) {
  const pode = podeFabricar(receita, itens, pjHabilidades, aprendidas);
  if (!pode.ok) return { ok: false, motivo: pode.motivo, faltando: pode.faltando };

  // O MATERIAL VAI EMBORA NOS DOIS CASOS (decisão do usuário): o custo é da
  // tentativa. Por isso o consumo vem antes de olhar `sucesso`.
  const semMaterial = consumirMateriais(itens, receita);
  if (!semMaterial) return { ok: false, motivo: 'sem_material' };
  if (!sucesso) return { ok: true, itens: semMaterial, sucesso: false };

  const novo = itemEmConstrucao(receita, horas, novoId, fabricado);
  return { ok: true, itens: [...semMaterial, novo], sucesso: true, instanceId: novo.instanceId };
}

Object.assign(window, {
  ehAtaqueNatural,
  materiaisDaReceita, materialDisponivel, conferirMateriais, disponivelDoMaterial, USOS_FERRAMENTA,
  receitaItemSlug, nomeDaReceita, receitaAprendida, temReceitaNaMochila, rendeDaReceita,
  testesDaReceita, receitaComGrau, grauDosTestes,
  nivelDaHabilidade, temAHabilidade, podeFabricar,
  consumirMateriais, itemEmConstrucao, emConstrucao,
  HORAS_FABRICACAO_POR_GRUPO, horasDeFabricacao, textoDoPrazo, avancarFabricacao,
  progressoDaConstrucao, diasRestantes, itensComConstrucaoPronta, fabricar,
});
