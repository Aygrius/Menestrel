/* ============================================================
   ESTOQUE DO MESTRE — lojas por cidade e propostas de venda
   (23/10/2026, aprovado na prévia: "Ficou ótimo, pode aplicar.")
   ============================================================
   - Uma loja por cidade: historias.estoque_loja.comercios[] ganha `lugar`
     (o nome da cidade/local). A Loja do jogador mostra só a loja da cidade
     onde a mesa está (get_loja_pj) — desde 28/10/2026 a loja SEM cidade não
     aparece mais em lugar nenhum, a pedido do usuário.
   - "Abrir lojas das cidades" (28/10/2026) cria de uma vez a loja de cada
     lugar desta aventura que é cidade no catálogo, com o estoque lido da
     ECONOMIA dela (01-core/lojas-cidade.jsx) e ilimitado. É sugestão: depois
     de criada, a loja é do Mestre e cada item se edita como sempre.
   - O estoque usa as mesmas casas e o mesmo painel do Inventário.
   - Propostas: as vendas propostas pelos jogadores (anuncios_loja com status
     'proposta'/'contraproposta'). Aceitar paga o jogador e põe o item no
     estoque da loja escolhida pelo preço de tabela (RPC
     responder_proposta_venda); Contrapropor manda outro valor; Recusar
     devolve o item.
   - Cada mudança no estoque relê o estoque do banco, aplica e grava — assim
     uma proposta aceita no meio da edição não é apagada por uma cópia velha.

   Depende de: supabaseClient, fetchCatalogoCompleto (01-core),
   invItemIcon/MoedaPills/CampoPreco (07-inventario, no window),
   migrarEstoqueLoja (06-historias/historias.jsx), useAlvoPortal.
   Exporta (window): EstoqueMestreView
   ============================================================ */

function estNovoId() {
  return Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8);
}
const estSemAcento = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/* ── FILEIRAS DE DEZ, ABERTAS OU FECHADAS (29/10/2026) ──────────────────────
   "A cada 10 slots de uma loja, eu tenho como abrir ou fechar a loja. Por
   exemplo, do item 1 ao item 10 eu posso abrir para os personagens comprar, e
   fechar do item 11 ao 60. Cada divisão dessa deve ter uma etiqueta informando
   se está aberta ou fechada para compra." (usuário)

   A grade do estoque tem 10 colunas, então a divisão já existia no olho: é a
   FILEIRA. Itens 1–10 são a fileira 0, 11–20 a fileira 1, e assim por diante.
   O estado mora no comércio, em `fileiras` — um booleano por fileira. Ausente
   ou `true` é ABERTA, que é como toda loja se comportou até hoje; só `false`
   fecha, e por isso nenhuma loja antiga muda de comportamento.

   A fileira de um item é a POSIÇÃO DELE em `itens`, não a casa onde ele aparece
   na tela: a busca reordena a grade, e uma etiqueta sobre a grade reordenada
   mentiria. Por isso a grade sem busca é a ordem crua de `itens` (item cujo
   slug saiu do catálogo guarda a casa dele, em vez de empurrar a fileira dos
   outros) e as etiquetas só aparecem com a busca vazia.

   Quem fecha de verdade é o servidor: `estoque_loja_flat` deixa de achatar o
   item da fileira fechada, e `comprar_item` procura a entrada justamente nesse
   achatado — então o item desaparece do balcão E não pode ser comprado por
   quem souber o entryId (scripts/sql/fileiras-e-conteudo-da-loja-2026-10-29.sql). */
const EST_POR_FILEIRA = 10;
function estFileiraDoIndice(i) {
  return Math.floor(Math.max(0, Number(i) || 0) / EST_POR_FILEIRA);
}

/* ── A CASA DO ITEM NA LOJA (29/10/2026) ────────────────────────────────────
   "Eu preciso ter permissão para mudar o item de casa na loja, para dizer em
   qual linha ele está." (usuário)

   Até aqui a casa era a POSIÇÃO no array `itens`: mexer num item empurrava
   todos os seguintes, e com fileira que abre e fecha isso é grave — mover uma
   peça mudaria de fileira todas as outras depois dela, mudando em silêncio o
   que está à venda. Agora a casa é uma PROPRIEDADE do item (`casa`), o mesmo
   vocabulário do Inventário (`posicionarCasas`, `onMoverCasa` em
   07-inventario/inventario.jsx), e a grade é esparsa: buraco é buraco.

   Mover TROCA com quem estiver na casa de destino. Trocar mexe em dois itens e
   só neles — nenhuma outra peça muda de fileira pelo caminho.

   Item sem `casa` é dado antigo: vale a posição no array, que é exatamente o
   que o servidor usa como reserva (COALESCE(casa, ord-1) no
   estoque_loja_flat). Para os dois nunca divergirem, toda gravação que mexe
   nos itens passa por estComCasas e carimba a casa de quem não tem — depois do
   primeiro clique do Mestre, não sobra item sem casa. */
function estCasaDoItem(it, i) {
  const c = it && it.casa;
  return Number.isInteger(c) && c >= 0 ? c : i;
}
function estComCasas(comercio) {
  const itens = (comercio && comercio.itens) || [];
  if (itens.every((it) => Number.isInteger(it && it.casa))) return comercio;
  const usadas = new Set(itens.filter((it) => Number.isInteger(it && it.casa)).map((it) => it.casa));
  let vaga = 0;
  const novos = itens.map((it) => {
    if (Number.isInteger(it && it.casa)) return it;
    while (usadas.has(vaga)) vaga += 1;
    usadas.add(vaga);
    return { ...it, casa: vaga };
  });
  return { ...comercio, itens: novos };
}
function estMoverCasa(comercio, entryId, destino) {
  const c = estComCasas(comercio);
  const origem = (c.itens || []).find((it) => it.entryId === entryId);
  if (!origem || origem.casa === destino) return c;
  const ocupante = (c.itens || []).find((it) => it.casa === destino && it.entryId !== entryId);
  const de = origem.casa;
  return {
    ...c,
    itens: c.itens.map((it) => {
      if (it.entryId === entryId) return { ...it, casa: destino };
      if (ocupante && it.entryId === ocupante.entryId) return { ...it, casa: de };
      return it;
    }),
  };
}
function estFileiraAberta(comercio, f) {
  const flags = (comercio && Array.isArray(comercio.fileiras)) ? comercio.fileiras : [];
  return flags[f] !== false;
}
function estComFileira(comercio, f, aberta) {
  const flags = (comercio && Array.isArray(comercio.fileiras)) ? comercio.fileiras.slice() : [];
  while (flags.length <= f) flags.push(true);
  flags[f] = !!aberta;
  return { ...comercio, fileiras: flags };
}

function EstoqueMestreView({ historia, lang, onChanged }) {
  const en = lang === 'en';
  const { Input } = (typeof UI !== 'undefined' ? UI : {});
  const migrar = window.migrarEstoqueLoja || ((x) => x || { comercios: [] });
  const icone = (cat) => (window.invItemIcon ? window.invItemIcon(cat) : 'ti-box');
  const Moedas = window.MoedaPills || (() => null);
  const CampoPreco = window.CampoPreco || null;
  /* O MESMO SELETOR DE NÚMERO DO RESTO DO SISTEMA (28/10/2026) ────────────
     "A pílula de preço da loja não está igual a pílula de quantidade, e é a
     quarta vez que eu digo isso." (usuário)

     As três vezes anteriores eu comparei o preço com o seletor de quantidade
     da COMPRA — o do jogador —, e ali eles já batiam. A quantidade que o
     usuário tem na frente é esta, a do painel do Mestre, e ela nunca foi o
     seletor do sistema: era `.estoque-step`, escrita à mão, 32px de altura,
     botões quadrados de 24px com "−" e "+" datilografados e sem fundo. Ao
     lado da pílula de 40px do preço, duas peças de famílias diferentes.

     Agora é o QuantidadeStepper, como na compra, na ficha e na Sagração. */
  const Stepper = window.QuantidadeStepper || null;
  // O dropdown único do sistema (01-core/select-pill.jsx), carregado antes daqui.
  const SelectPill = (typeof window !== 'undefined' && window.SelectPill) || null;
  const porExtenso = (l) => (window.precoPorExtenso ? window.precoPorExtenso(l, lang, en ? 'Free' : 'Grátis') : String(l));
  /* As regras do pacote vêm de 01-core/inventario-helpers.jsx (carregado
     antes daqui, ver main.tsx) — as MESMAS que o balcão do jogador usa, para
     o preço na vitrine ser o preço que o servidor cobra. */
  const ehCont = window.ehContainer || (() => false);
  const gruposAceitos = window.tiposAceitos || (() => []);
  const doConteudo = window.conteudoDaEntrada || (() => []);
  const valorConteudo = window.valorDoConteudo || (() => 0);
  const ocupaConteudo = window.ocupaDoConteudo || (() => 0);
  const precoEntrada = window.precoDaEntrada
    || ((e, c) => (e && e.preco_latao_override != null ? Number(e.preco_latao_override) : Number((c && c.valor_latao) || 0)));

  const [est, setEst] = useState(() => migrar(historia.estoque_loja));
  const [catalogo, setCatalogo] = useState(null);
  const [aba, setAba] = useState('loja');          // 'loja' | 'propostas'
  const [lojaId, setLojaId] = useState(null);
  const [busca, setBusca] = useState('');
  const [dentroBusca, setDentroBusca] = useState('');   // busca do "Dentro" (29/10/2026)
  /* entryId do item que está esperando uma casa nova. O gesto é PEGAR E SOLTAR
     por clique, não arraste: a tela já é toda de clique (escolher a casa abre o
     painel), e a mesa também roda em tablet, onde arraste HTML5 não existe e o
     arraste por pointer-events do Inventário custaria uma segunda máquina de
     estado aqui. Clicar no item e depois na casa diz a mesma coisa em dois
     toques, e Esc desiste. */
  const [movendo, setMovendo] = useState(null);
  /* O balão do sistema, não o do navegador: a língueta é só um ícone, e a
     frase inteira ("Itens 11–20: fechada para compra…") mora no tooltip. O
     `title` do HTML é banido no projeto desde 08/09/2026 — o navegador o
     desenha com a cara dele e nenhum CSS nosso alcança (tooltip-padrao.test.js). */
  const [tip, abrirTip, fecharTip, manterTip] = useTooltip(60);
  const [sel, setSel] = useState(null);             // { tipo: 'entrada'|'catalogo', id }
  const [novaLoja, setNovaLoja] = useState(null);   // texto do + no trilho
  const [propostas, setPropostas] = useState(null);
  const [erro, setErro] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [contra, setContra] = useState({});         // id -> latão da contraproposta
  const [destino, setDestino] = useState({});       // id -> comercio id
  const alvoTrilho = (typeof useAlvoPortal === 'function') ? useAlvoPortal('estoque-trilho-slot') : null;
  void alvoTrilho;
  const [abrindoCidades, setAbrindoCidades] = useState(false);
  const [recado, setRecado] = useState(null);

  // catálogo inteiro
  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data } = await fetchCatalogoCompleto();
      if (vivo) setCatalogo(data || []);
    })();
    return () => { vivo = false; };
  }, []);
  const catBySlug = useMemo(() => {
    const m = {}; (catalogo || []).forEach((c) => { m[c.slug] = c; }); return m;
  }, [catalogo]);
  // Trocar de casa fecha a busca do "Dentro": ela é daquele item, não da tela.
  useEffect(() => { setDentroBusca(''); }, [sel && sel.id]);
  // Esc desiste da mudança de casa (e só dela: o painel segue aberto).
  useEffect(() => {
    if (!movendo) return undefined;
    const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setMovendo(null); } };
    window.addEventListener('keydown', esc, true);
    return () => window.removeEventListener('keydown', esc, true);
  }, [movendo]);

  /* ── ABRIR AS LOJAS DAS CIDADES (28/10/2026, pedido do usuário) ─────────
     "Para cada cidade do sistema, haverá uma loja aberta com itens à venda de
     forma fixa" — e, perguntado o que define a lista, "pela economia da
     cidade".

     Quais cidades: as que esta aventura visita (`historia.lugares`) e que
     existem no catálogo de cidades. Um lugar que não é cidade — "Montes
     Crássios", "Deserto do Real" — não ganha loja, e está certo.

     O filtro por dono é o mesmo do seletor de lugares do shell: o mundo
     (historia_id nulo) mais as aventuras deste Mestre. Sem ele, a RLS deixa
     ler cidade de Mestre alheio.

     Não toca em loja que já existe: a regra de uma loja por cidade é a mesma
     do botão "+", e reescrever o estoque que o Mestre ajustou seria perder o
     trabalho dele. */
  const abrirLojasDasCidades = async () => {
    const montar = window.lojaDaCidade, temLoja = window.cidadeTemLoja;
    if (!montar || !temLoja || !catalogo) return;
    setAbrindoCidades(true); setErro(null); setRecado(null);
    try {
      const lugares = Array.isArray(historia.lugares) ? historia.lugares : [];
      if (!lugares.length) {
        setRecado(en ? 'This story has no places yet.' : 'Esta aventura ainda não tem lugares.');
        return;
      }
      let meus = [historia.id];
      try {
        const { data: au } = await supabaseClient.auth.getUser();
        const uid = au && au.user && au.user.id;
        if (uid) {
          const { data: hs } = await supabaseClient.from('historias').select('id').eq('mestre_id', uid);
          (hs || []).forEach((h) => { if (!meus.includes(h.id)) meus.push(h.id); });
        }
      } catch (_) { /* sem sessão: fica só esta aventura */ }
      const { data: cids, error: eC } = await supabaseClient.from('cidades')
        .select('nome, populacao, economia')
        .or(`historia_id.is.null,historia_id.in.(${meus.join(',')})`);
      if (eC) { setErro(eC.message); return; }
      const doLugar = (nome) => (cids || []).find((c) => estSemAcento(c.nome) === estSemAcento(nome));
      /* ── POR QUE NADA FOI ABERTO (28/10/2026) ───────────────────────────
         "Ao clicar em 'lojas das cidades' aparece a mensagem 'Toda cidade
         desta aventura já tem loja.'" (usuário) — e, no caso dele, era
         verdade: as nove lojas já existiam, criadas no clique anterior. Mas
         a mesma frase saía em TRÊS situações diferentes: já existirem, nenhum
         lugar ser cidade do catálogo, e todas as cidades serem ruína.

         Uma mensagem que mente sobre o motivo é pior que nenhuma: manda
         procurar o problema no lugar errado. Agora cada caso é contado, e a
         frase diz qual deles aconteceu — e, quando já existem, diz QUANTAS e
         onde escolhê-las, que era a pergunta seguinte do usuário. */
      const conta = { jaTem: 0, naoEhCidade: 0, ruina: 0 };
      const novas = [];
      lugares.forEach((lugar) => {
        const cid = doLugar(lugar);
        if (!cid) { conta.naoEhCidade += 1; return; }
        if (!temLoja(cid)) { conta.ruina += 1; return; }
        if (comercios.some((c) => estSemAcento(c.lugar || c.nome) === estSemAcento(lugar))) {
          conta.jaTem += 1; return;
        }
        if (novas.some((c) => estSemAcento(c.lugar) === estSemAcento(lugar))) return;
        novas.push(montar(cid, catalogo, estNovoId));
      });
      if (!novas.length) {
        /* JÁ EXISTIREM NÃO É RECADO (28/10/2026, usuário: "remova o texto 'As
           9 loja(s) de cidade já existem — escolha no seletor ao lado'").

           A frase nasceu quando o seletor estava fora da tela e o Mestre não
           achava as lojas. Com o seletor à vista, ela virou ruído: dizer que
           existe o que está ali na lista não informa nada. Nada a abrir, nada
           a dizer.

           As outras duas continuam, porque explicam uma AUSÊNCIA — por que o
           botão não fez nada quando parecia que devia fazer. */
        if (!conta.jaTem) {
          setRecado(conta.ruina && !conta.naoEhCidade
            ? (en ? 'No inhabited city among this story\'s places.'
                  : 'Nenhuma cidade habitada entre os lugares desta aventura.')
            : (en ? 'No place in this story is a city in the catalog.'
                  : 'Nenhum lugar desta aventura é cidade do catálogo.'));
        }
        return;
      }
      const ok = await alterar((x) => ({ ...x, comercios: [...x.comercios, ...novas] }));
      if (ok) {
        setLojaId(novas[0].id); setAba('loja'); setSel(null);
        setRecado(en ? `${novas.length} shop(s) opened.` : `${novas.length} loja(s) aberta(s).`);
      }
    } finally { setAbrindoCidades(false); }
  };

  /* ── REFAZER O ESTOQUE PELA ECONOMIA (28/10/2026) ───────────────────────
     As lojas que o botão criou antes do teto de 60 ficaram enormes — Haafel
     com 240 itens, Saupami com 221. Sem uma forma de reaplicar a regra, o
     Mestre teria de apagar e recriar cada uma, ou tirar item por item.

     É uma ação do PAINEL, não do trilho, e por loja: refaz só a que está
     aberta, e só quando o Mestre pede. Ela SOBRESCREVE o estoque daquela
     loja — por isso não é automática e por isso o botão diz o que vai
     acontecer. */
  const refazerEstoqueDaLoja = async () => {
    const montar = window.lojaDaCidade;
    const alvo = comercios.find((c) => c.id === lojaId) || comercios[0];
    if (!montar || !catalogo || !alvo || !alvo.lugar) return;
    setErro(null); setRecado(null);
    const { data: cids, error: eC } = await supabaseClient.from('cidades')
      .select('nome,populacao,economia');
    if (eC) { setErro(eC.message); return; }
    const cid = (cids || []).find((c) => estSemAcento(c.nome) === estSemAcento(alvo.lugar));
    if (!cid) {
      setRecado(en ? 'This shop\'s city is not in the catalog.'
        : 'A cidade desta loja não está no catálogo.');
      return;
    }
    const nova = montar(cid, catalogo, () => alvo.id);
    const ok = await alterar(naLoja(alvo.id, (c) => ({ ...c, itens: nova.itens })));
    if (ok) {
      setSel(null);
      setRecado(en ? `Stock rebuilt: ${nova.itens.length} item(s).`
        : `Estoque refeito: ${nova.itens.length} item(ns).`);
    }
  };

  const comercios = (est && est.comercios) || [];
  const loja = comercios.find((c) => c.id === lojaId) || comercios[0] || null;
  useEffect(() => { if (!lojaId && comercios[0]) setLojaId(comercios[0].id); }, [comercios.length]);

  // propostas
  const carregarPropostas = React.useCallback(async () => {
    const { data } = await supabaseClient.from('anuncios_loja')
      .select('id, status, lugar, slug, item, item_nome, quantidade, preco_latao, preco_contra, vendedor_nome, created_at')
      .eq('historia_id', historia.id).in('status', ['proposta', 'contraproposta'])
      .order('created_at', { ascending: true });
    setPropostas(data || []);
  }, [historia.id]);
  useEffect(() => { carregarPropostas(); }, [carregarPropostas]);

  /* Grava uma mudança: relê o estoque do banco, aplica `muda` e grava. */
  const alterar = async (muda) => {
    setOcupado(true); setErro(null);
    const { data, error } = await supabaseClient.from('historias').select('estoque_loja').eq('id', historia.id).maybeSingle();
    if (error) { setOcupado(false); setErro(error.message); return false; }
    const atual = migrar(data && data.estoque_loja);
    const novo = muda({ ...atual, comercios: (atual.comercios || []).map((c) => ({ ...c, itens: [...(c.itens || [])] })) });
    const payload = { ...novo, editando_em: null };
    const { error: e2 } = await supabaseClient.from('historias').update({ estoque_loja: payload }).eq('id', historia.id);
    setOcupado(false);
    if (e2) { setErro(e2.message); return false; }
    setEst(payload);
    if (onChanged) onChanged();
    return true;
  };
  const naLoja = (id, fn) => (e) => ({ ...e, comercios: e.comercios.map((c) => (c.id === id ? fn(c) : c)) });

  // ── a vitrine da loja escolhida, ou o catálogo filtrado pela busca
  /* MOEDA TAMBÉM ENTRA NO ESTOQUE (29/10/2026, pedido do usuário) ──────────
     A busca do catálogo cortava `grupo === 'Moedas'`, e digitar "moeda" não
     devolvia casa nenhuma. "A loja, também pode representar itens que
     encontramos naquele lugar. Pode permitir." — então moeda é item de
     estoque como qualquer outro. O lado do jogador já sabia lidar: moeda
     exige recipiente na compra (07-inventario/loja.jsx), igual a consumível.
     Lembre que a compra é sem troco (`moedasFechamExato`): trocar uma de
     ouro por dez de prata só fecha com a moeda exata do preço em mão. */
  const termo = estSemAcento(busca);
  const entradas = (loja && loja.itens || []).filter((it) => catBySlug[it.slug]);
  const visiveis = termo ? entradas.filter((it) => estSemAcento(catBySlug[it.slug].nome).includes(termo)) : entradas;
  const doCatalogo = termo
    ? (catalogo || []).filter((c) => estSemAcento(c.nome).includes(termo)
        && !entradas.some((it) => it.slug === c.slug)).slice(0, 40)
    : [];
  /* A casa de cada item, e a fileira que sai dela — a mesma conta do servidor
     (COALESCE(casa, ord-1) no estoque_loja_flat). Vale nos dois modos: na
     busca a casa não governa a grade, mas ainda pinta a peça de fechada. */
  const COLS = EST_POR_FILEIRA;
  const porCasa = {};
  const fileiraPorEntry = {};
  ((loja && loja.itens) || []).forEach((it, i) => {
    if (!it || !it.entryId) return;
    const casa = estCasaDoItem(it, i);
    fileiraPorEntry[it.entryId] = estFileiraDoIndice(casa);
    if (catBySlug[it.slug]) porCasa[casa] = it;
  });
  const maiorCasa = Object.keys(porCasa).reduce((m, k) => Math.max(m, Number(k)), -1);
  const naCasa = (it) => ({
    tipo: 'entrada', id: it.entryId, cat: catBySlug[it.slug], it,
    fileira: fileiraPorEntry[it.entryId] || 0,
  });
  /* SEM BUSCA, A GRADE É O MAPA DE CASAS: a casa n da tela é a casa n do item,
     buraco incluído — é o que deixa a etiqueta dizer a verdade e o que dá ao
     Mestre uma casa vazia para onde mover. Com busca, a grade é o resultado da
     busca (mais o catálogo para adicionar), e aí as etiquetas saem de cena. */
  const comEtiquetas = !termo && !!loja;
  const total = termo
    ? Math.max(COLS * 6, Math.ceil((visiveis.length + doCatalogo.length + 1) / COLS) * COLS)
    : Math.max(COLS * 6, Math.ceil((maiorCasa + 2) / COLS) * COLS);
  const casas = termo
    ? [
      ...visiveis.map(naCasa),
      ...doCatalogo.map((c) => ({ tipo: 'catalogo', id: c.slug, cat: c })),
    ]
    : Array.from({ length: total }, (_, i) => (porCasa[i] ? naCasa(porCasa[i]) : null));
  const escolhida = sel && casas.find((c) => c && c.tipo === sel.tipo && c.id === sel.id);

  const pendentes = (propostas || []).filter((p) => p.status === 'proposta');
  const aguardando = (propostas || []).filter((p) => p.status === 'contraproposta');

  const responder = async (p, acao) => {
    setOcupado(true); setErro(null);
    const args = { p_anuncio_id: p.id, p_acao: acao, p_preco: null, p_comercio_id: null };
    if (acao === 'contrapropor') args.p_preco = Number(contra[p.id]) || 0;
    if (acao === 'aceitar') {
      args.p_comercio_id = destino[p.id] || (comercios.find((c) => estSemAcento(c.lugar) && estSemAcento(c.lugar) === estSemAcento(p.lugar)) || comercios[0] || {}).id || null;
    }
    const { data, error } = await supabaseClient.rpc('responder_proposta_venda', args);
    setOcupado(false);
    if (error || !data || !data.ok) { setErro((data && data.motivo) || (error && error.message) || 'erro'); return; }
    setContra((c) => { const n = { ...c }; delete n[p.id]; return n; });
    await carregarPropostas();
    if (acao === 'aceitar') {
      const { data: h } = await supabaseClient.from('historias').select('estoque_loja').eq('id', historia.id).maybeSingle();
      if (h) setEst(migrar(h.estoque_loja));
      if (onChanged) onChanged();
    }
  };

  // ── o trilho
  const trilho = (
    <div className="cartoes-barra inv-trilho estoque-trilho">
      <div className="best-header-acoes">
        {aba === 'loja' && (
          <div className="best-search">
            <i className="ti ti-eye busca-ic" aria-hidden="true" />
            {Input && <Input type="search" value={busca} onChange={(e) => { setBusca(e.target.value); setSel(null); }}
              placeholder={en ? 'Search' : 'Buscar'} aria-label={en ? 'Search the shop and catalog' : 'Buscar na loja e no catálogo'} />}
          </div>
        )}
        {/* ── AS LOJAS NUMA LISTA SUSPENSA (28/10/2026, pedido do usuário:
            "ao clicar em 'lojas das cidades', usar lista suspensa para o
            trilho não ficar muito grande").

            Era um botão por loja. Com uma ou duas, o trilho lia bem; com as
            doze cidades que "Lojas das cidades" abre de uma vez, ele dava
            duas voltas na tela e empurrava Propostas para fora da vista.

            O seletor tem largura FIXA, então o trilho não cresce mais com o
            número de cidades — é a propriedade que o pedido quer. Com uma
            loja só ele continua aparecendo: saber em qual cidade se está
            editando vale mais do que economizar uma pílula, e um trilho que
            muda de forma conforme a conta de lojas é pior que um estável. */}
        {/* ── O SELETOR NÃO PODE SUMIR (28/10/2026) ────────────────────────
            "Está aparecendo o texto 'As 9 lojas de cidade já existem — escolha
            no seletor ao lado' mas a lista suspensa não aparece." (usuário)

            Não reproduzi: com os mesmos dez comércios do banco dele, o
            seletor monta no teste e na prévia do componente inteiro
            (preview/loja-mestre.html). O que sobrou como explicação possível
            foi `window.SelectPill` ausente na hora do render — e aí a
            condição `&& SelectPill` apagava a única porta de entrada do
            estoque, em silêncio.

            Então a condição saiu. O SelectPill continua sendo o dropdown do
            sistema quando está lá; sem ele, entra um <select> nativo com a
            mesma pele. Trocar a aparência é um preço pequeno perto de o
            Mestre não ter como abrir a própria loja. */}
        {comercios.length > 0 && (
          <div className={'estoque-seletor-loja' + (aba === 'loja' ? ' is-ativo' : '')}>
            {SelectPill ? (
              <SelectPill
                value={loja ? loja.id : ''}
                onChange={(v) => { setAba('loja'); setLojaId(v); setSel(null); }}
                placeholder={en ? 'Shop' : 'Loja'}
                options={comercios.map((c) => ({ value: c.id, label: c.lugar || c.nome }))} />
            ) : (
              <select className="estoque-seletor-nativo" value={loja ? loja.id : ''}
                aria-label={en ? 'Shop' : 'Loja'}
                onChange={(e) => { setAba('loja'); setLojaId(e.target.value); setSel(null); }}>
                {comercios.map((c) => (
                  <option key={c.id} value={c.id}>{c.lugar || c.nome}</option>
                ))}
              </select>
            )}
          </div>
        )}
        {/* PROPOSTAS COLADO NAS LOJAS, O "+" NO FIM (28/10/2026, usuário:
            "o botão 'propostas' fica ao lado de 'estoque', e o + fica à
            direita").

            O "+" estava no meio do trilho, entre a última loja e Propostas —
            e separava duas coisas que são a mesma: as abas do que se está
            vendo. Criar loja não é uma aba, é uma AÇÃO, e ação mora na ponta.
            Agora o trilho lê: buscar · lojas · propostas | criar. */}
        <button type="button" className={'mc-acao' + (aba === 'propostas' ? ' is-ativo' : '')} onClick={() => { setAba('propostas'); setSel(null); }}>
          <i className="ti ti-scale" aria-hidden="true" />
          <span className="mc-acao-rotulo">{en ? 'Offers' : 'Propostas'}</span>
          {pendentes.length > 0 && <span className="estoque-num">{pendentes.length}</span>}
        </button>

        {/* Abre de uma vez a loja de cada cidade da aventura, com o estoque
            lido da economia dela. Fica junto do "+" porque as duas criam
            loja: uma à mão, a outra pelo catálogo. */}
        <button type="button" className="mc-acao" disabled={abrindoCidades || ocupado || !catalogo}
          onClick={abrirLojasDasCidades}
          aria-label={en ? 'Open city shops' : 'Abrir lojas das cidades'}>
          <i className={'ti ' + (abrindoCidades ? 'ti-loader-2' : 'ti-map-pin-plus')} aria-hidden="true" />
          <span className="mc-acao-rotulo">{en ? 'City shops' : 'Lojas das cidades'}</span>
        </button>

        {novaLoja != null ? (
          <form className="estoque-nova" onSubmit={async (e) => {
            e.preventDefault();
            const nome = novaLoja.trim(); if (!nome) { setNovaLoja(null); return; }
            /* UMA LOJA POR CIDADE (26/10/2026, pedido do usuário: "teremos
               fixo 1 loja por cidade"). Sem a trava, duas lojas na mesma
               cidade dividiriam a vitrine do jogador — ele veria metade do
               estoque em cada uma e nenhuma das duas estaria errada.
               Cidade já cadastrada: em vez de recusar, ABRE a que existe. */
            const jaTem = comercios.find((c) => estSemAcento(c.lugar || c.nome) === estSemAcento(nome));
            if (jaTem) { setLojaId(jaTem.id); setAba('loja'); setNovaLoja(null); return; }
            const id = estNovoId();
            const ok = await alterar((x) => ({ ...x, comercios: [...x.comercios, { id, nome, lugar: nome, ativo: true, itens: [] }] }));
            if (ok) { setLojaId(id); setAba('loja'); }
            setNovaLoja(null);
          }}>
            <input autoFocus value={novaLoja} onChange={(e) => setNovaLoja(e.target.value)} placeholder={en ? 'City' : 'Cidade'}
              onKeyDown={(e) => { if (e.key === 'Escape') setNovaLoja(null); }} aria-label={en ? 'New shop city' : 'Cidade da nova loja'} />
          </form>
        ) : (
          <button type="button" className="mc-acao" onClick={() => setNovaLoja('')} aria-label={en ? 'New shop' : 'Nova loja'}>
            <i className="ti ti-plus" aria-hidden="true" />
          </button>
        )}
      </div>
      {/* O que a ação fez, na mesma linha do erro: "3 lojas abertas" ou "toda
          cidade já tem loja". Some ao primeiro clique seguinte. */}
      {recado && <p className="estoque-recado">{recado}</p>}
    </div>
  );

  /* ── O QUE JÁ VAI DENTRO DO ITEM (29/10/2026) ───────────────────────────
     "Torne possível vender itens na loja que tenham itens armazenados dentro
     deles, por exemplo uma algibeira sempre de moedas." (usuário)

     Aparece só para recipiente (`armazena > 0`) e aceita só o que o recipiente
     aceitaria no inventário: mesmo tipo S/L, o `tipo_item` quando ele restringe
     o grupo, e o peso que ainda cabe — as travas de podeMoverParaContainer,
     aplicadas aqui sobre o CATÁLOGO em vez de sobre instâncias, porque o pacote
     ainda não existe no inventário de ninguém.

     Quem compra recebe o recipiente com o recheio dentro, e o preço sugerido já
     somou os dois (precoDaEntrada). */
  const painelDentro = (it, cat, mudarDentro) => {
    if (!ehCont(cat)) return null;
    const dentro = doConteudo(it);
    const livre = Math.max(0, Number(cat.armazena || 0) - ocupaConteudo(it, catBySlug));
    const um = (n) => String(Math.round(Number(n || 0) * 10) / 10);
    const grupos = gruposAceitos(cat);
    const cabe = (c) => (c.tipo || 'S') === (cat.tipo || 'S')
      && (!grupos.length || grupos.includes(c.grupo))
      && Number(c.ocupa || 0) <= livre + 0.0001;
    const termoD = estSemAcento(dentroBusca);
    const achados = termoD
      ? (catalogo || []).filter((c) => estSemAcento(c.nome).includes(termoD) && cabe(c)).slice(0, 6)
      : [];
    const nomeDe = (c, slug) => (c && c.nome) || slug;
    return (
      <section className="estoque-dentro">
        <p className="estoque-dentro-tit">
          <span>{en ? 'Inside' : 'Dentro'}</span>
          <span className="estoque-dentro-livre">
            {en ? `${um(livre)} of ${um(cat.armazena)} free` : `${um(livre)} de ${um(cat.armazena)} livre`}
          </span>
        </p>
        {dentro.length === 0 ? (
          <p className="estoque-dentro-nada">{en ? 'Nothing inside yet.' : 'Nada dentro ainda.'}</p>
        ) : (
          <ul className="estoque-dentro-lista">
            {dentro.map((c) => {
              const cc = catBySlug[c.slug];
              const cheio = !cc || Number(cc.ocupa || 0) > livre + 0.0001;
              return (
                <li key={c.slug}>
                  <i className={'ti ' + icone(cc)} aria-hidden="true" />
                  <span className="estoque-dentro-nome">{nomeDe(cc, c.slug)}</span>
                  <span className="estoque-dentro-qtd">×{c.quantidade}</span>
                  <button type="button" className="btn-icon btn-sm" disabled={ocupado}
                    onClick={() => mudarDentro(c.slug, -1)}
                    aria-label={en ? `One ${nomeDe(cc, c.slug)} less` : `Um ${nomeDe(cc, c.slug)} a menos`}>
                    <i className="ti ti-minus" aria-hidden="true" />
                  </button>
                  <button type="button" className="btn-icon btn-sm" disabled={ocupado || cheio}
                    onClick={() => mudarDentro(c.slug, 1)}
                    aria-label={en ? `One ${nomeDe(cc, c.slug)} more` : `Um ${nomeDe(cc, c.slug)} a mais`}>
                    <i className="ti ti-plus" aria-hidden="true" />
                  </button>
                  <button type="button" className="btn-icon btn-sm" disabled={ocupado}
                    onClick={() => mudarDentro(c.slug, 0)}
                    aria-label={en ? `Take ${nomeDe(cc, c.slug)} out` : `Tirar ${nomeDe(cc, c.slug)} de dentro`}>
                    <i className="ti ti-x" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <input className="estoque-campo" value={dentroBusca} onChange={(e) => setDentroBusca(e.target.value)}
          placeholder={en ? 'Search to put inside…' : 'Busque para pôr dentro…'}
          aria-label={en ? 'Put inside' : 'Pôr dentro'} />
        {achados.length > 0 && (
          <ul className="estoque-dentro-achados">
            {achados.map((c) => (
              <li key={c.slug}>
                <button type="button" disabled={ocupado}
                  onClick={() => { mudarDentro(c.slug, 1); setDentroBusca(''); }}>
                  <i className={'ti ' + icone(c)} aria-hidden="true" />
                  <span className="estoque-dentro-nome">{c.nome}</span>
                  <span className="estoque-dentro-val">{porExtenso(Number(c.valor_latao) || 0)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {/* Duas mensagens vazias diferentes, duas classes: "nada dentro ainda"
            é o estado do pacote, "nada que caiba" é o resultado da busca. */}
        {!!termoD && achados.length === 0 && (
          <p className="estoque-dentro-nada estoque-dentro-sem-achado">{livre <= 0
            ? (en ? 'No room left inside.' : 'Já não cabe mais nada.')
            : (en ? 'Nothing found that fits in here.' : 'Nada encontrado que caiba aqui.')}</p>
        )}
      </section>
    );
  };

  // ── o painel do item / da loja
  const painelItem = () => {
    if (!loja) return null;
    if (!escolhida) {
      return (
        <div className="estoque-painel-corpo">
          <div className="loja-painel-cab">
            <span className="loja-painel-ic"><i className="ti ti-building-store" aria-hidden="true" /></span>
            <div>
              <h3 className="loja-painel-nome">{loja.lugar || loja.nome}</h3>
              <p className="loja-painel-sub">{entradas.length} {en ? 'items' : 'itens'}</p>
            </div>
          </div>
          {/* Só faz sentido com cidade: a regra lê a ECONOMIA dela. */}
          {loja.lugar && (
            <button type="button" className="estoque-refazer" disabled={ocupado || !catalogo}
              onClick={refazerEstoqueDaLoja}>
              <i className="ti ti-refresh" aria-hidden="true" />
              {en ? 'Rebuild stock from the economy' : 'Refazer estoque pela economia'}
            </button>
          )}
          {/* ── A CIDADE NÃO É UM CAMPO, EM NENHUM CASO (29/10/2026) ─────────
              "Se a loja já existe com o nome da cidade, não preciso dizer ali
              em qual cidade ela está." (usuário, reafirmando o pedido anterior)

              A loja nasce com cidade pelos dois caminhos que a criam — o "+"
              pede a cidade, "Lojas das cidades" grava o nome dela —, e a cidade
              é o TÍTULO deste painel. O campo repetia o título e abria a porta
              de apagá-la, o que esconde a loja de todos
              (scripts/sql/loja-so-na-cidade-2026-10-28.sql).

              A loja legada "Estoque", que veio do formato antigo sem cidade
              (migrarEstoqueLoja), continua com saída: "Excluir esta loja" —
              liberado logo abaixo mesmo quando ela é a única — e o botão "Lojas
              das cidades", que abre as lojas certas com o estoque da economia
              de cada cidade. */}
          <dl className="loja-painel-dados">
            <div><dt>{en ? 'Open' : 'Aberta'}</dt><dd>
              <button type="button" className={'estoque-chave' + (loja.ativo !== false ? ' is-on' : '')} disabled={ocupado}
                onClick={() => alterar(naLoja(loja.id, (c) => ({ ...c, ativo: c.ativo === false })))}>
                {loja.ativo !== false ? (en ? 'Yes' : 'Sim') : (en ? 'No' : 'Não')}
              </button>
            </dd></div>
          </dl>
          <p className="loja-painel-desc">{en ? 'Choose an item to edit it, or search to add one from the catalog.' : 'Escolha um item para editá-lo, ou busque para pôr um do catálogo.'}</p>
          {/* EXCLUIR VALE TAMBÉM PARA A ÚLTIMA LOJA (29/10/2026) — sem o campo
              "Cidade", uma cidade digitada errada no "+" não tem mais conserto
              pelo painel; se ela fosse a única loja, a trava `length > 1`
              deixava o Mestre preso com uma loja que jogador nenhum vê. A tela
              sem loja já tem seu vazio ("Nenhuma loja ainda. Crie uma pelo +"). */}
          <button type="button" className="btn-ghost btn-sm estoque-excluir" disabled={ocupado}
            onClick={async () => { if (await alterar((x) => ({ ...x, comercios: x.comercios.filter((c) => c.id !== loja.id) }))) setLojaId(null); }}>
            <i className="ti ti-trash" aria-hidden="true" /> {en ? 'Delete this shop' : 'Excluir esta loja'}
          </button>
        </div>
      );
    }
    const cat = escolhida.cat;
    if (escolhida.tipo === 'catalogo') {
      return (
        <div className="estoque-painel-corpo">
          <div className="loja-painel-cab">
            <span className="loja-painel-ic"><i className={'ti ' + icone(cat)} aria-hidden="true" /></span>
            <div><h3 className="loja-painel-nome">{cat.nome}</h3>{cat.grupo && <p className="loja-painel-sub">{cat.grupo}</p>}</div>
          </div>
          <dl className="loja-painel-dados">
            <div><dt>{en ? 'Price' : 'Preço'}</dt><dd>{porExtenso(Number(cat.valor_latao) || 0)}</dd></div>
          </dl>
          {cat.descricao && <p className="loja-painel-desc">{cat.descricao}</p>}
          <button type="button" className="btn-primary loja-painel-botao" disabled={ocupado}
            onClick={async () => {
              const entryId = estNovoId();
              // estComCasas carimba a casa do recém-chegado — a primeira vaga.
              const ok = await alterar(naLoja(loja.id, (c) => estComCasas({ ...c, itens: [...c.itens, { slug: cat.slug, entryId, estoque: 1, preco_latao_override: null }] })));
              if (ok) { setBusca(''); setSel({ tipo: 'entrada', id: entryId }); }
            }}>
            {en ? 'Put in the shop' : 'Pôr na loja'}
          </button>
        </div>
      );
    }
    const it = escolhida.it;
    const ilimitado = it.estoque == null;
    /* O preço SUGERIDO soma o que vai dentro (precoDaEntrada, 01-core) — um
       pacote vale o recipiente mais o recheio. O override do Mestre vence, e é
       por isso que zerá-lo volta para a soma, não para o valor de tabela. */
    const sugerido = Number(cat.valor_latao || 0) + valorConteudo(it, catBySlug);
    const preco = precoEntrada(it, cat, catBySlug);
    const setEntrada = (patch) => alterar(naLoja(loja.id, (c) => ({ ...c, itens: c.itens.map((x) => (x.entryId === it.entryId ? { ...x, ...patch } : x)) })));
    const mudarDentro = (slug, delta) => {
      const atual = doConteudo(it);
      const tem = atual.find((c) => c.slug === slug);
      let lista;
      if (delta === 0 || (tem && delta < 0 && tem.quantidade <= 1)) lista = atual.filter((c) => c.slug !== slug);
      else if (!tem) lista = [...atual, { slug, quantidade: 1 }];
      else lista = atual.map((c) => (c.slug === slug ? { ...c, quantidade: c.quantidade + delta } : c));
      setEntrada({ conteudo: lista.length ? lista : null });
    };
    return (
      <div className="estoque-painel-corpo">
        <div className="loja-painel-cab">
          <span className="loja-painel-ic"><i className={'ti ' + icone(cat)} aria-hidden="true" /></span>
          <div><h3 className="loja-painel-nome">{cat.nome}</h3>{cat.grupo && <p className="loja-painel-sub">{cat.grupo}</p>}</div>
        </div>
        <dl className="loja-painel-dados">
          {/* ── O ∞ MORA NO FIM DA ESCADA (28/10/2026) ────────────────────
              "Remova o campo 'ilimitado'." (usuário)

              A chave Sim/Não saiu, mas o ESTOQUE ILIMITADO não podia sair com
              ela: `estoque: null` é como toda loja de cidade nasce (ver
              01-core/lojas-cidade.jsx, "de forma fixa"), e sem um caminho de
              volta elas ficariam presas no ∞ para sempre.

              Então o ilimitado virou o degrau abaixo do zero, na própria
              Quantidade: "−" em 0 mostra ∞, "+" no ∞ volta para 1. Um
              controle no lugar de dois, e nada se perdeu. */}
          <div><dt>{en ? 'Quantity' : 'Quantidade'}</dt><dd>
            {Stepper ? (
              <Stepper
                className="estoque-step"
                value={ilimitado ? -1 : (Number(it.estoque) || 0)}
                min={-1}
                disabled={ocupado}
                centro={ilimitado ? '∞' : (Number(it.estoque) || 0)}
                /* Saindo do ∞ (−1), o "+" cai em 0 — e 0 é esgotado, não "um
                   item à venda": o degrau de volta tem de ser 1, como diz o
                   comentário acima. Dentro da escada normal, 0 continua sendo
                   zero (29/10/2026). */
                onChange={(v) => setEntrada({ estoque: v < 0 ? null : (ilimitado ? Math.max(1, v) : Math.max(0, v)) })}
                label={en ? 'Quantity' : 'Quantidade'}
                propsMenos={{ 'aria-label': '−' }}
                propsMais={{ 'aria-label': '+' }}
              />
            ) : <b>{ilimitado ? '∞' : it.estoque}</b>}
          </dd></div>
          <div><dt>{en ? 'Price' : 'Preço'}</dt><dd>
            {CampoPreco
              ? <CampoPreco valor={preco} lang={lang} onChange={(v) => setEntrada({ preco_latao_override: (v === '' || Number(v) === sugerido) ? null : Number(v) })} />
              : porExtenso(preco)}
          </dd></div>
        </dl>
        {/* ── MUDAR DE CASA (29/10/2026) ──────────────────────────────────
            "Eu preciso ter permissão para mudar o item de casa na loja, para
            dizer em qual linha ele está." (usuário)

            O botão põe o item "na mão"; a próxima casa clicada o recebe (e
            troca de lugar com quem estiver lá). Limpa a busca junto, porque
            com busca a grade não é o mapa de casas e não haveria para onde
            soltar. A fileira atual vai no rótulo: é o que o Mestre veio
            decidir. */}
        <button type="button" className={'estoque-mover' + (movendo === it.entryId ? ' is-ativo' : '')}
          disabled={ocupado}
          onClick={() => { setBusca(''); setMovendo(movendo === it.entryId ? null : it.entryId); }}>
          <i className={'ti ' + (movendo === it.entryId ? 'ti-target' : 'ti-arrows-move')} aria-hidden="true" />
          {movendo === it.entryId
            ? (en ? 'Pick a slot — Esc cancels' : 'Escolha a casa — Esc desiste')
            : (en ? `Move slot (row ${(fileiraPorEntry[it.entryId] || 0) + 1})` : `Mudar de casa (fileira ${(fileiraPorEntry[it.entryId] || 0) + 1})`)}
        </button>
        {painelDentro(it, cat, mudarDentro)}
        {cat.descricao && <p className="loja-painel-desc">{cat.descricao}</p>}
        <button type="button" className="btn-ghost btn-sm estoque-excluir" disabled={ocupado}
          onClick={async () => { if (await alterar(naLoja(loja.id, (c) => ({ ...c, itens: c.itens.filter((x) => x.entryId !== it.entryId) })))) setSel(null); }}>
          <i className="ti ti-trash" aria-hidden="true" /> {en ? 'Remove from the shop' : 'Tirar da loja'}
        </button>
      </div>
    );
  };

  const cartaoProposta = (p, esperando) => {
    const cat = catBySlug[p.slug] || null;
    const q = Number(p.quantidade) || 1;
    const nome = (p.item && p.item.apelido ? p.item.apelido + ' (' + (p.item_nome || p.slug) + ')' : (p.item_nome || p.slug)) + (q > 1 ? ' ×' + q : '');
    const quem = (p.vendedor_nome || '').split(' ')[0] || (en ? 'A character' : 'Um personagem');
    return (
      <li key={p.id} className="estoque-prop">
        <div className="estoque-prop-top">
          <span className="loja-painel-ic"><i className={'ti ' + icone(cat)} aria-hidden="true" /></span>
          <div className="estoque-prop-nome">
            <b>{nome}</b>
            <small>{quem}{p.lugar ? (en ? ' · in ' : ' · em ') + p.lugar : ''}</small>
          </div>
          <div className="estoque-prop-preco">
            <Moedas latao={(esperando ? Number(p.preco_contra) : Number(p.preco_latao)) * q} lang={lang} tamanho="sm" />
            <small>{esperando ? (en ? 'you offered' : 'você ofereceu') : (en ? 'table: ' : 'tabela: ') + (esperando ? '' : porExtenso((Number(cat && cat.valor_latao) || 0) * q))}</small>
          </div>
        </div>
        {!esperando && (
          <>
            <div className="estoque-prop-destino">
              <span>{en ? 'Store in' : 'Guardar em'}</span>
              <select value={destino[p.id] || (comercios.find((c) => estSemAcento(c.lugar) && estSemAcento(c.lugar) === estSemAcento(p.lugar)) || comercios[0] || {}).id || ''}
                onChange={(e) => setDestino((d) => ({ ...d, [p.id]: e.target.value }))}>
                {comercios.map((c) => <option key={c.id} value={c.id}>{c.lugar || c.nome}</option>)}
              </select>
            </div>
            {contra[p.id] != null && CampoPreco && (
              <div className="estoque-prop-contra">
                <span>{en ? 'Counteroffer (each)' : 'Contraproposta (cada)'}</span>
                <CampoPreco valor={contra[p.id]} lang={lang} onChange={(v) => setContra((c) => ({ ...c, [p.id]: v === '' ? 0 : Number(v) }))} />
              </div>
            )}
            <div className="estoque-prop-acoes">
              {contra[p.id] != null ? (
                <>
                  <button type="button" className="btn-primary btn-sm" disabled={ocupado} onClick={() => responder(p, 'contrapropor')}>{en ? 'Send' : 'Enviar'}</button>
                  <button type="button" className="btn-ghost btn-sm" disabled={ocupado} onClick={() => setContra((c) => { const n = { ...c }; delete n[p.id]; return n; })}>{en ? 'Cancel' : 'Cancelar'}</button>
                </>
              ) : (
                <>
                  <button type="button" className="btn-primary btn-sm" disabled={ocupado} onClick={() => responder(p, 'aceitar')}>{en ? 'Accept' : 'Aceitar'}</button>
                  <button type="button" className="btn-ghost btn-sm" disabled={ocupado} onClick={() => setContra((c) => ({ ...c, [p.id]: Number(p.preco_latao) || 0 }))}>{en ? 'Counteroffer' : 'Contrapropor'}</button>
                  <button type="button" className="btn-ghost btn-sm" disabled={ocupado} onClick={() => responder(p, 'recusar')}>{en ? 'Decline' : 'Recusar'}</button>
                </>
              )}
            </div>
          </>
        )}
      </li>
    );
  };

  /* A LÍNGUETA DA FILEIRA — diz o estado e é o botão que o troca ─────────────
     Fileira ainda sem item nenhum não ganha língueta (não há o que abrir), mas
     ganha a vaga da altura dela: sem isso, a língueta da fileira seguinte
     subiria uma linha e passaria a apontar para a fileira errada.

     A faixa de itens ("11–20") vai no rótulo acessível porque é assim que o
     pedido foi escrito — "do item 1 ao item 10" —, contando de 1. */
  const etiquetaDaFileira = (f) => {
    const temItem = casas.slice(f * COLS, f * COLS + COLS).some(Boolean);
    if (!temItem) return <span key={'f' + f} className="estoque-lingueta-vaga" aria-hidden="true" />;
    const aberta = estFileiraAberta(loja, f);
    const de = f * COLS + 1;
    const ate = f * COLS + COLS;
    const rotulo = en
      ? `Items ${de}–${ate}: ${aberta ? 'open' : 'closed'} for purchase. Click to ${aberta ? 'close' : 'open'}.`
      : `Itens ${de}–${ate}: ${aberta ? 'aberta' : 'fechada'} para compra. Clique para ${aberta ? 'fechar' : 'abrir'}.`;
    return (
      <button key={'f' + f} type="button" disabled={ocupado}
        className={'estoque-lingueta' + (aberta ? ' is-aberta' : ' is-fechada')}
        onClick={() => alterar(naLoja(loja.id, (c) => estComFileira(c, f, !aberta)))}
        aria-label={rotulo} {...propsTip(abrirTip, fecharTip, rotulo)}>
        <i className={'ti ' + (aberta ? 'ti-lock-open' : 'ti-lock')} aria-hidden="true" />
      </button>
    );
  };

  return (
    <div className="estoque-pagina">
      {trilho}
      {/* O balão das línguetas (um só para a tela, como nas outras fases). */}
      <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
      {erro && <div className="err-msg" style={{ margin: '0 auto 12px', maxWidth: 600 }}>{erro}</div>}
      {aba === 'propostas' ? (
        <div className="fp-card estoque-card estoque-card--propostas">
          <div className="estoque-props">
            <section className="bau-painel estoque-props-col">
              <p className="estoque-props-tit">{en ? 'Waiting for you' : 'Esperando você'}</p>
              {propostas === null ? <p className="estoque-vazio">{en ? 'Loading…' : 'Carregando…'}</p>
                : pendentes.length === 0 ? <p className="estoque-vazio">{en ? 'No offers.' : 'Nenhuma proposta.'}</p>
                : <ul className="estoque-props-lista">{pendentes.map((p) => cartaoProposta(p, false))}</ul>}
            </section>
            <section className="bau-painel estoque-props-col">
              <p className="estoque-props-tit">{en ? 'Waiting for the player' : 'Esperando o jogador'}</p>
              {aguardando.length === 0 ? <p className="estoque-vazio">{en ? 'Nothing here.' : 'Nada aqui.'}</p>
                : <ul className="estoque-props-lista">{aguardando.map((p) => cartaoProposta(p, true))}</ul>}
            </section>
          </div>
        </div>
      ) : !loja ? (
        <div className="best-empty">{en ? 'No shop yet. Create one with the +.' : 'Nenhuma loja ainda. Crie uma pelo +.'}</div>
      ) : (
        <div className="fp-card estoque-card">
          <div className="bau-corpo bau-corpo--painel estoque-bau">
            {/* ── A LÍNGUETA FICA FORA DA LOJA (29/10/2026) ─────────────────
                "Essa etiqueta na loja pode ser um ícone em formato de língueta,
                do lado esquerdo e fora da loja, apontado para a fileira."
                (usuário)

                A primeira volta punha a etiqueta como 11ª coluna DA grade, com
                a palavra "Aberta"/"Fechada" — isto é, dentro da loja, como se
                fosse estoque. Agora é uma coluna própria à esquerda, fora da
                grade: línguetas de 78px (a altura da casa) com o mesmo vão de
                6px, de modo que cada uma fica na linha da sua fileira, com a
                ponta virada para ela. O estado está na forma do cadeado e na
                cor; o texto vive no aria-label e no title, para quem usa leitor
                de tela ou pousa o ponteiro. */}
            <div className="estoque-com-linguetas">
              {comEtiquetas && catalogo !== null && (
                <div className="estoque-linguetas">
                  {Array.from({ length: Math.ceil(total / COLS) }, (_, f) => etiquetaDaFileira(f))}
                </div>
              )}
              <div className="inv-grid-wrap">
                <div className={'inv-bag-grid inv-bag-grid--slots' + (movendo ? ' estoque-grade--movendo' : '')}
                  style={{ gridTemplateColumns: `repeat(${COLS}, var(--inv-casa))` }}>
                  {catalogo === null ? null : Array.from({ length: total }, (_, i) => {
                    const c = casas[i];
                    /* ── SOLTAR NUMA CASA (29/10/2026) ──────────────────────
                       Com um item "na mão", TODA casa é destino: a vazia o
                       recebe, a ocupada troca de lugar com ele. Sem item na
                       mão, a casa vazia não é botão — não há o que fazer nela,
                       e um botão que não faz nada é ruído para o teclado e
                       para o leitor de tela. */
                    if (movendo && !termo) {
                      const euMesmo = c && c.tipo === 'entrada' && c.id === movendo;
                      return (
                        <button key={'d' + i} type="button"
                          className={'inv-card loja-casa estoque-casa--destino'
                            + (c ? '' : ' estoque-casa--vazia')
                            + (euMesmo ? ' is-sel' : '')}
                          disabled={ocupado}
                          aria-label={c
                            ? (en ? `Swap with ${c.cat.nome} (slot ${i + 1})` : `Trocar com ${c.cat.nome} (casa ${i + 1})`)
                            : (en ? `Move here (slot ${i + 1}, row ${estFileiraDoIndice(i) + 1})` : `Mover para cá (casa ${i + 1}, fileira ${estFileiraDoIndice(i) + 1})`)}
                          onClick={async () => {
                            if (euMesmo) { setMovendo(null); return; }
                            const ok = await alterar(naLoja(loja.id, (x) => estMoverCasa(x, movendo, i)));
                            if (ok) setMovendo(null);
                          }}>
                          {c && (
                            <span className="inv-card-head"><span className="inv-card-ic">{window.ItemIcone ? <window.ItemIcone cat={c.cat} icon={icone(c.cat)} /> : <i className={'ti ' + icone(c.cat)} aria-hidden="true" />}</span></span>
                          )}
                          {!c && <i className="ti ti-arrow-move-down estoque-alvo" aria-hidden="true" />}
                        </button>
                      );
                    }
                    if (!c) return <span key={'g' + i} className="inv-slot-ghost" aria-hidden="true" />;
                    const escolhidaAqui = sel && sel.tipo === c.tipo && sel.id === c.id;
                    const fechada = c.tipo === 'entrada' && !estFileiraAberta(loja, c.fileira);
                    return (
                      <button key={c.tipo + c.id} type="button" aria-label={c.cat.nome}
                        className={'inv-card loja-casa' + (escolhidaAqui ? ' is-sel' : '') + (c.tipo === 'catalogo' ? ' estoque-casa--catalogo' : '') + (c.cat.magico ? ' is-magico' : '') + (fechada ? ' estoque-casa--fechada' : '')}
                        onClick={() => setSel(escolhidaAqui ? null : { tipo: c.tipo, id: c.id })}>
                        <span className="inv-card-head"><span className="inv-card-ic">{window.ItemIcone ? <window.ItemIcone cat={c.cat} icon={icone(c.cat)} /> : <i className={'ti ' + icone(c.cat)} aria-hidden="true" />}</span></span>
                        {c.tipo === 'entrada' && <span className="estoque-qtd">{c.it.estoque == null ? '∞' : c.it.estoque}</span>}
                        {c.tipo === 'catalogo' && <span className="estoque-mais" aria-hidden="true"><i className="ti ti-plus" /></span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <aside className="bau-painel loja-painel">{painelItem()}</aside>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  EstoqueMestreView,
  // Regras puras das fileiras e das casas, no window para o teste e para quem
  // precisar ler o mesmo critério do servidor
  // (src/06-historias/fileiras-e-conteudo-da-loja.test.jsx).
  EST_POR_FILEIRA, estFileiraDoIndice, estFileiraAberta, estComFileira,
  estCasaDoItem, estComCasas, estMoverCasa,
});
