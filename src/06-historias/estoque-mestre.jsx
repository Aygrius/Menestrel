/* ============================================================
   ESTOQUE DO MESTRE — lojas por cidade e propostas de venda
   (23/10/2026, aprovado na prévia: "Ficou ótimo, pode aplicar.")
   ============================================================
   - Uma loja por cidade: historias.estoque_loja.comercios[] ganha `lugar`
     (o nome da cidade/local). A Loja do jogador mostra só a loja da cidade
     onde a mesa está (get_loja_pj) — desde 28/10/2026 a loja SEM cidade não
     aparece mais em lugar nenhum, a pedido do usuário.
   - Toda cidade e todo reino do catálogo têm loja FIXA, criada vazia ao
     abrir o Estoque e sem botão de excluir (30/10/2026). O "+" que criava
     loja escolhendo a cidade saiu junto, e o "Refazer estoque pela
     economia" também (30/10/2026): o Mestre monta cada loja à mão.
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

/* ── AS LOJAS FIXAS (30/10/2026) — regras puras ───────────────────────────
   "Crie uma 'loja' para cada cidade e reino cadastrados no sistema, essas
   lojas são fixas e não podem ser excluídas." (usuário)

   lugaresComLoja: os nomes de cidades e reinos, sem repetir (uma cidade e
     um reino com o mesmo nome dividem a loja — o local da mesa é texto, e a
     Loja do jogador não teria como separar as duas) e em ordem alfabética.
   lojasQueFaltam: os lugares que ainda não têm loja. Compara sem acento e
     sem caixa, como o "+" fazia — "Saravossa" e "saravossa" são a mesma.
   lojaEhFixa: a loja de um desses lugares. */
function lugaresComLoja(cidades, reinos) {
  const vistos = new Set();
  const nomes = [];
  [...(cidades || []), ...(reinos || [])].forEach((l) => {
    const nome = String((l && l.nome) || '').trim();
    const chave = estSemAcento(nome);
    if (!nome || vistos.has(chave)) return;
    vistos.add(chave);
    nomes.push(nome);
  });
  return nomes.sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
function lojasQueFaltam(comercios, lugares) {
  const tem = new Set((comercios || []).map((c) => estSemAcento(c.lugar || c.nome)));
  return (lugares || []).filter((n) => !tem.has(estSemAcento(n)));
}
function lojaEhFixa(loja, lugares) {
  if (!loja) return false;
  const chave = estSemAcento(loja.lugar || loja.nome);
  return !!chave && (lugares || []).some((n) => estSemAcento(n) === chave);
}

/* ── A QUANTIDADE SE DIGITA (29/10/2026) ────────────────────────────────────
   "Eu quero mudar a quantidade do item na loja como eu mudo o preço, além dos
   botões + e -, eu posso digitar o número manualmente." (usuário)

   O número do meio do stepper vira campo, como no CampoPreco
   (07-inventario/inventario.jsx). Diferença: o preço grava a cada tecla, e
   aqui cada gravação relê e regrava a loja inteira — então o número só vale
   ao sair do campo ou no Enter. Esc desiste. Vazio ou "∞" = ilimitado, o
   mesmo degrau abaixo do zero que o "−" já alcança. */
function EstoqueDigitavel({ estoque, disabled, label, onConfirmar }) {
  const atual = estoque == null ? '∞' : String(estoque);
  const [texto, setTexto] = React.useState(null);   // null = mostra o gravado
  // O Esc desiste ANTES do blur, e o blur ainda enxerga o texto da renderização.
  const desistiu = React.useRef(false);
  const confirmar = () => {
    if (desistiu.current) { desistiu.current = false; setTexto(null); return; }
    if (texto == null) return;
    const t = texto.trim();
    setTexto(null);
    if (t === atual) return;
    if (t === '' || t === '∞') { onConfirmar(null); return; }
    const n = parseInt(t, 10);
    if (Number.isFinite(n) && n >= 0) onConfirmar(n);
  };
  return (
    <input className="campo-preco-input" type="text" inputMode="numeric" aria-label={label}
      value={texto == null ? atual : texto} disabled={disabled}
      onFocus={(e) => { setTexto(atual === '∞' ? '' : atual); e.target.select(); }}
      onChange={(e) => setTexto(e.target.value.replace(/[^\d∞]/g, ''))}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') { e.stopPropagation(); desistiu.current = true; e.currentTarget.blur(); }
      }} />
  );
}

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

function EstoqueMestreView({ historia, lang, onChanged, trilhoPaginas = null }) {
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
  /* O LEQUE NO ESTOQUE (30/10/2026, usuário: "Porque o leque não está lá
     para o mestre?"). Clicar na casa mostra o item no painel E abre o leque
     com as ações — que saíram do painel, onde ficam só os campos.
     { tipo, id, ancora } */
  const [lequeEst, setLequeEst] = useState(null);
  const [propostas, setPropostas] = useState(null);
  const [erro, setErro] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [propSel, setPropSel] = useState(null);       // id da proposta aberta no painel (04/11/2026)
  const [contra, setContra] = useState({});         // id -> latão da contraproposta
  const [destino, setDestino] = useState({});       // id -> comercio id
  const alvoTrilho = (typeof useAlvoPortal === 'function') ? useAlvoPortal('estoque-trilho-slot') : null;
  void alvoTrilho;
  const [lugares, setLugares] = useState(null);    // cidades e reinos que ganham loja (sem ruína)
  const [lugaresFixos, setLugaresFixos] = useState(null); // todos, ruína incluída: a loja deles não se exclui
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

  /* ── A CIDADE DA LOJA NOVA (29/10/2026, pedido do usuário) ──────────────
     "Ao criar uma loja nova, eu devo selecionar qual cidade aquela loja
     pertence. Não precisa de botão 'lojas das cidades'."

     O "+" era um campo de texto, e a cidade digitada só valia se batesse
     letra a letra com o local da mesa — um acento a menos e a loja nunca
     aparecia para os jogadores. Agora a cidade vem do CATÁLOGO, a mesma
     tabela de onde sai o local da mesa.

     O filtro por dono é o do seletor de lugares do shell: o mundo
     (historia_id nulo) mais as aventuras deste Mestre. Sem ele, a RLS deixa
     ler cidade de Mestre alheio. Ruína (população zero) não entra: não tem
     quem venda. */
  /* ── TODA CIDADE E TODO REINO TÊM LOJA, FIXA (30/10/2026) ───────────────
     "Crie uma 'loja' para cada cidade e reino cadastrados no sistema, essas
     lojas são fixas e não podem ser excluídas." (usuário)

     O "+" que criava loja escolhendo a cidade saiu: ao abrir o Estoque, as
     que faltam nascem sozinhas, VAZIAS (decisão do usuário — o Mestre enche
     à mão). Reino entra porque o local
     da mesa também pode ser um reino, e a Loja do jogador é a do local
     (get_loja_pj compara o `lugar` com ele).

     "Fixa" não é campo gravado: é a loja cujo lugar é uma cidade ou reino do
     catálogo (lojaEhFixa). Se a cidade sair do catálogo, a loja dela deixa de
     ser fixa e pode ser excluída — e loja sem cidade continua excluível.

     RUÍNA NÃO GANHA LOJA, MAS A QUE JÁ TEM NÃO SE EXCLUI (31/10/2026,
     usuário: "Lojas de cidades e reinos não podem ser excluídas, vejo que a
     loja Deiamon tem a exclusão habilitada"). Deiamon é ruína (população 0):
     o filtro de ruína servia para não CRIAR loja, e acabava tirando a loja
     que já existia da lista das fixas. Agora são duas listas — `lugares`
     cria, `lugaresFixos` (toda cidade e todo reino) protege. */
  useEffect(() => {
    let vivo = true;
    (async () => {
      let meus = [historia.id];
      try {
        const { data: au } = await supabaseClient.auth.getUser();
        const uid = au && au.user && au.user.id;
        if (uid) {
          const { data: hs } = await supabaseClient.from('historias').select('id').eq('mestre_id', uid);
          (hs || []).forEach((h) => { if (!meus.includes(h.id)) meus.push(h.id); });
        }
      } catch (_) { /* sem sessão: fica só esta aventura */ }
      const filtro = `historia_id.is.null,historia_id.in.(${meus.join(',')})`;
      const [{ data: cids }, { data: reis }] = await Promise.all([
        supabaseClient.from('cidades').select('nome, populacao').or(filtro),
        supabaseClient.from('reinos').select('nome').or(filtro),
      ]);
      if (!vivo) return;
      const temLoja = (c) => !(c.populacao != null && Number(c.populacao) === 0);
      setLugares(lugaresComLoja((cids || []).filter(temLoja), reis || []));
      setLugaresFixos(lugaresComLoja(cids || [], reis || []));
    })();
    return () => { vivo = false; };
  }, [historia.id]);

  /* As que faltam nascem uma vez por abertura. `alterar` relê o banco antes
     de gravar, e a conta se refaz LÁ DENTRO, sobre o estoque relido: duas
     telas abertas ao mesmo tempo não criam a mesma loja duas vezes. */
  const criouLojas = React.useRef(false);
  useEffect(() => {
    if (!lugares || criouLojas.current) return;
    if (!lojasQueFaltam(est && est.comercios, lugares).length) return;
    criouLojas.current = true;
    /* `global: true` (30/10/2026, usuário: "A loja fixa das cidades e reinos
       são globais [...] apenas na conta do mestre"). O banco sincroniza a loja
       global entre as mesas do mesmo Mestre e a recém-criada nasce com o
       estoque das outras (_menestrel_lojas_globais) — por isso o `itens: []`
       daqui não apaga nada. Loja nova feita na mesa não leva a marca. */
    alterar((x) => ({
      ...x,
      comercios: [...x.comercios, ...lojasQueFaltam(x.comercios, lugares)
        .map((nome) => ({ id: estNovoId(), nome, lugar: nome, ativo: true, global: true, itens: [] }))],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lugares]);

  const comercios = (est && est.comercios) || [];
  /* A LOJA DE ONDE A AVENTURA ESTÁ PRIMEIRO (08/11/2026, usuário: "Ao clicar na
     loja (mestre), deve mostrar sempre primeiro a loja de onde a aventura está
     como padrão"). O local da mesa (data_jogo_atual.local) casa com o lugar da
     loja sem acento; sem loja ali, a primeira, como antes. */
  const localDaMesa = estSemAcento((historia && historia.data_jogo_atual && historia.data_jogo_atual.local) || '');
  const lojaDaMesa = localDaMesa ? comercios.find((c) => estSemAcento(c.lugar || c.nome) === localDaMesa) || null : null;
  const loja = comercios.find((c) => c.id === lojaId) || lojaDaMesa || comercios[0] || null;
  useEffect(() => {
    if (!lojaId && (lojaDaMesa || comercios[0])) setLojaId((lojaDaMesa || comercios[0]).id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comercios.length, lojaDaMesa && lojaDaMesa.id]);

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
  /* OITO FILEIRAS, COMO O BAÚ DO PERSONAGEM (04/11/2026, usuário: "Na loja do
     mestre, deve ter 8 linhas igual no inventário e loja do personagem").
     Eram 6. O número é o LINHAS_BAU do 07-inventario, o mesmo do Inventário e
     da Loja da ficha — os três baús andam juntos. */
  const LINHAS = window.LINHAS_BAU || 8;
  const total = termo
    ? Math.max(COLS * LINHAS, Math.ceil((visiveis.length + doCatalogo.length + 1) / COLS) * COLS)
    : Math.max(COLS * LINHAS, Math.ceil((maiorCasa + 2) / COLS) * COLS);
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
    <div className={'cartoes-barra inv-trilho estoque-trilho' + (trilhoPaginas ? ' trilho-unido' : '')}>
      <div className="best-header-acoes">
        {/* As páginas da Mesa (Cena, Batalha, Loja) no início do trilho (04/11/2026). */}
        {trilhoPaginas}
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
        {/* Propostas saiu do trilho (11/11/2026): mora no painel da loja, à
            direita, abaixo de "Aberta" — ver o painel da loja. */}

        {/* O "Nova loja" saiu em 30/10/2026: toda cidade e todo reino já têm
            a sua, criada sozinha ao abrir o Estoque (ver lojasQueFaltam). */}
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
          {/* Sem o ícone ao lado do nome, também na loja (31/10/2026, usuário,
              com print: "ainda aparece o ícone na loja junto com o nome"). */}
          <div className="loja-painel-cab">
            <div>
              <h3 className="loja-painel-nome">{loja.lugar || loja.nome}</h3>
              <p className="loja-painel-sub">{entradas.length} {en ? 'items' : 'itens'}</p>
            </div>
          </div>
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
              liberado logo abaixo mesmo quando ela é a única — e as lojas fixas
              de cada cidade e reino, que nascem sozinhas. */}
          <dl className="loja-painel-dados">
            {/* SIM | NÃO NA PÍLULA DO SELETOR (31/10/2026, usuário: "pode ser
                um botão parecido com o seletor de quantidade, mas em pílula
                com Sim ou Não"). A mesma casca do QuantidadeStepper
                (.fp-pop-stepper, 160px como a quantidade e o preço), com as
                duas respostas à vista: a valendo acende em ouro, e clicar na
                outra troca. Antes era um botão só, que dizia o estado e
                escondia a outra opção. */}
            <div><dt>{en ? 'Open' : 'Aberta'}</dt><dd>
              <div className="fp-pop-stepper estoque-step estoque-sim-nao" role="radiogroup" aria-label={en ? 'Open' : 'Aberta'}>
                {[[true, en ? 'Yes' : 'Sim'], [false, en ? 'No' : 'Não']].map(([valor, rot]) => {
                  const marcada = (loja.ativo !== false) === valor;
                  return (
                    <button key={rot} type="button" role="radio" aria-checked={marcada}
                      className={'estoque-sim-nao-op' + (marcada ? ' is-on' : '')} disabled={ocupado}
                      onClick={() => { if (!marcada) alterar(naLoja(loja.id, (c) => ({ ...c, ativo: valor }))); }}>
                      {rot}
                    </button>
                  );
                })}
              </div>
            </dd></div>
          </dl>
          {/* PROPOSTAS NO PAINEL (11/11/2026, usuário: "No menu loja do mestre,
              o botão 'propostas' fica no menu lateral direito, abaixo de
              'aberta (sim/não)'"). Saiu do trilho de cima; o número diz
              quantas esperam resposta. */}
          <button type="button" className="btn-ghost estoque-propostas-btn"
            onClick={() => { setAba('propostas'); setSel(null); }}>
            <i className="ti ti-scale" aria-hidden="true" />
            {en ? 'Offers' : 'Propostas'}
            {pendentes.length > 0 && <span className="estoque-num">{pendentes.length}</span>}
          </button>
          <p className="loja-painel-desc">{en ? 'Choose an item to edit it, or search to add one from the catalog.' : 'Escolha um item para editá-lo, ou busque para pôr um do catálogo.'}</p>
          {/* EXCLUIR VALE TAMBÉM PARA A ÚLTIMA LOJA (29/10/2026) — sem o campo
              "Cidade", uma cidade digitada errada no "+" não tem mais conserto
              pelo painel; se ela fosse a única loja, a trava `length > 1`
              deixava o Mestre preso com uma loja que jogador nenhum vê. A tela
              sem loja já tem seu vazio ("Nenhuma loja ainda. Crie uma pelo +"). */}
          {/* LOJA DE CIDADE OU REINO NÃO SE EXCLUI (30/10/2026, usuário: "essas
              lojas são fixas e não podem ser excluídas"). Sem `lugaresFixos`
              carregado ainda, o botão espera — mostrá-lo e tirá-lo um instante
              depois seria oferecer o que não se pode. */}
          {lugaresFixos && !lojaEhFixa(loja, lugaresFixos) && (
            <button type="button" className="btn-ghost btn-sm estoque-excluir" disabled={ocupado}
              onClick={async () => { if (await alterar((x) => ({ ...x, comercios: x.comercios.filter((c) => c.id !== loja.id) }))) setLojaId(null); }}>
              <i className="ti ti-trash" aria-hidden="true" /> {en ? 'Delete this shop' : 'Excluir esta loja'}
            </button>
          )}
        </div>
      );
    }
    const cat = escolhida.cat;
    if (escolhida.tipo === 'catalogo') {
      return (
        <div className="estoque-painel-corpo">
          <div className="loja-painel-cab">
            <div><h3 className="loja-painel-nome">{cat.nome}</h3>{cat.grupo && <p className="loja-painel-sub">{cat.grupo}</p>}</div>
          </div>
          <dl className="loja-painel-dados">
            <div><dt>{en ? 'Price' : 'Preço'}</dt><dd>{porExtenso(Number(cat.valor_latao) || 0)}</dd></div>
          </dl>
          {cat.descricao && <p className="loja-painel-desc">{cat.descricao}</p>}
          {/* "Pôr na loja" saiu do painel para o leque (30/10/2026). */}
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
        {/* Sem o ícone ao lado do nome (31/10/2026, usuário, com print deste
            painel): vale para o painel do item do catálogo, logo acima. */}
        <div className="loja-painel-cab">
          <div><h3 className="loja-painel-nome">{cat.nome}</h3>{cat.grupo && <p className="loja-painel-sub">{cat.grupo}</p>}</div>
        </div>
        <dl className="loja-painel-dados">
          {/* ── O ∞ MORA NO FIM DA ESCADA (28/10/2026) ────────────────────
              "Remova o campo 'ilimitado'." (usuário)

              A chave Sim/Não saiu, mas o ESTOQUE ILIMITADO não podia sair com
              ela: `estoque: null` é como as lojas de cidade montadas pela
              economia nasciam, e sem um caminho de volta elas ficariam presas
              no ∞ para sempre.

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
                centro={<EstoqueDigitavel estoque={ilimitado ? null : (Number(it.estoque) || 0)}
                  disabled={ocupado} label={en ? 'Quantity' : 'Quantidade'}
                  onConfirmar={(n) => setEntrada({ estoque: n })} />}
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
        {/* Mudar de casa começa no leque (30/10/2026); aqui fica só o aviso
            de que o item está na mão, que também desiste. */}
        {movendo === it.entryId && (
          <button type="button" className="estoque-mover is-ativo" disabled={ocupado}
            onClick={() => setMovendo(null)}>
            <i className="ti ti-target" aria-hidden="true" />
            {en ? 'Pick a slot — Esc cancels' : 'Escolha a casa — Esc desiste'}
          </button>
        )}
        {painelDentro(it, cat, mudarDentro)}
        {cat.descricao && <p className="loja-painel-desc">{cat.descricao}</p>}
        {/* "Tirar da loja" saiu do painel para o leque (30/10/2026). */}
      </div>
    );
  };

  /* ── AS PROPOSTAS NO DESENHO DO SISTEMA (04/11/2026) ──────────────────────
     "Melhore a tela de proposta esperando o mestre e proposta esperando o
     jogador, padronize com base em nossos sistema" (usuário). Eram duas
     colunas de cartões soltos, cada um com nome, preço, seletor e três botões
     — um card por proposta, todos falando ao mesmo tempo.

     Agora é o gesto de toda página de escolher-e-agir (a aba Loja ao lado, o
     Inventário, as páginas de casas): a LISTA à esquerda, num .mn-quadro com
     dois grupos rotulados — "Esperando você" e "Esperando o jogador", cada um
     com a contagem —, e o PAINEL à direita com a proposta escolhida: o passe
     (quantidade, oferta, tabela) e, quando a vez é do Mestre, para onde a
     peça vai e as três respostas no pé. A linha escolhida acende em ouro;
     brasa só no que pede resposta (o ponto de "esperando você"). */
  const dadosDaProposta = (p) => {
    const cat = catBySlug[p.slug] || null;
    const q = Number(p.quantidade) || 1;
    const nomeItem = p.item && p.item.apelido ? p.item.apelido + ' (' + (p.item_nome || p.slug) + ')' : (p.item_nome || p.slug);
    const quem = (p.vendedor_nome || '').split(' ')[0] || (en ? 'A character' : 'Um personagem');
    const esperandoJogador = p.status === 'contraproposta';
    const cada = esperandoJogador ? Number(p.preco_contra) || 0 : Number(p.preco_latao) || 0;
    const tabela = Number(cat && cat.valor_latao) || 0;
    return { cat, q, nomeItem, quem, esperandoJogador, cada, tabela };
  };
  const destinoDe = (p) => destino[p.id]
    || (comercios.find((c) => estSemAcento(c.lugar) && estSemAcento(c.lugar) === estSemAcento(p.lugar)) || comercios[0] || {}).id || '';

  const linhaProposta = (p) => {
    const d = dadosDaProposta(p);
    // A acesa é a do painel: a escolhida, ou a primeira quando nada foi escolhido.
    const todas = [...pendentes, ...aguardando];
    const on = ((todas.find((x) => x.id === propSel) || todas[0]) || {}).id === p.id;
    const escolher = () => setPropSel(p.id);
    return (
      <div key={p.id} role="radio" aria-checked={on} tabIndex={0}
        className={'mn-quadro-linha estoque-prop-linha' + (on ? ' on' : '')}
        onClick={escolher}
        onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); escolher(); } }}>
        <span className="estoque-prop-arte" aria-hidden="true">
          {window.ItemIcone ? <window.ItemIcone cat={d.cat} icon={icone(d.cat)} /> : <i className={'ti ' + icone(d.cat)} />}
        </span>
        <span className="estoque-prop-quem">
          <span className="estoque-prop-item">{d.nomeItem}</span>
          <span className="estoque-prop-sub">{d.quem}{p.lugar ? (en ? ' · in ' : ' · em ') + p.lugar : ''}</span>
        </span>
        <span className="mn-quadro-num estoque-prop-qtd">×{d.q}</span>
        <span className="estoque-prop-oferta"><Moedas latao={d.cada * d.q} lang={lang} tamanho="sm" /></span>
      </div>
    );
  };

  const grupoDePropostas = (titulo, lista, vazioTxt) => (
    <div className="mn-quadro-grupo" role="radiogroup" aria-label={titulo}>
      <div className="mn-quadro-cabeca">
        <span className="mn-rotulo">{titulo}</span>
        <span className="mn-rotulo estoque-prop-conta">{lista.length}</span>
      </div>
      {lista.length ? lista.map(linhaProposta) : <p className="estoque-prop-vazio">{vazioTxt}</p>}
    </div>
  );

  const painelProposta = (p) => {
    const d = dadosDaProposta(p);
    const contraAberta = contra[p.id] != null;
    const celula = (rotulo, valor, extra) => (
      <div className={'mn-celula' + (extra || '')}>
        <span className="mn-rotulo">{rotulo}</span>
        <span className="mn-celula-valor">{valor}</span>
      </div>
    );
    return (
      <div className="loja-painel-corpo estoque-prop-painel">
        <div className="loja-painel-cab">
          <div>
            <h3 className="loja-painel-nome">{d.nomeItem}</h3>
            <p className="loja-painel-sub">{d.quem}{p.lugar ? (en ? ' · in ' : ' · em ') + p.lugar : ''}</p>
          </div>
        </div>
        {/* O QUE É O ITEM À VENDA (08/11/2026, usuário: "No item à venda, deve
            mostrar a descrição e as informações do item"): as células do item
            (as mesmas da janela de compra da loja, passeDoItem) e a descrição
            do catálogo. */}
        {d.cat && window.passeDoItem && window.passeDoItem(d.cat, lang).topo}
        {d.cat && d.cat.descricao && <p className="loja-painel-desc mn-rolagem estoque-prop-desc">{d.cat.descricao}</p>}
        <div className="mn-passe estoque-prop-passe">
          {celula(en ? 'Quantity' : 'Quantidade', '×' + d.q)}
          {celula(d.esperandoJogador ? (en ? 'You offered' : 'Você ofereceu') : (en ? 'Offer' : 'Oferta'),
            <Moedas latao={d.cada} lang={lang} tamanho="sm" />)}
          {celula(en ? 'Table' : 'Tabela', <Moedas latao={d.tabela} lang={lang} tamanho="sm" />)}
        </div>
        {d.q > 1 && (
          <p className="estoque-prop-total">
            <span className="mn-rotulo">{en ? 'Total' : 'Total'}</span>
            <Moedas latao={d.cada * d.q} lang={lang} tamanho="sm" />
          </p>
        )}
        {d.esperandoJogador ? (
          <p className="estoque-prop-nota">
            {en ? `Waiting for ${d.quem} to answer your counteroffer.` : `Esperando ${d.quem} responder à sua contraproposta.`}
          </p>
        ) : (
          <>
            {/* O DROPDOWN DO SISTEMA (04/11/2026, usuário: "A lista suspensa
                de 'guardar em' em propostas está fora de padrão"). Era um
                <select> nativo; agora é o SelectPill (01-core), o mesmo do
                seletor de lojas no trilho. O nativo fica só de reserva. */}
            <div className="estoque-prop-campo">
              <span className="mn-rotulo">{en ? 'Store in' : 'Guardar em'}</span>
              {SelectPill ? (
                <SelectPill value={destinoDe(p)} disabled={ocupado}
                  placeholder={en ? 'Shop' : 'Loja'}
                  onChange={(v) => setDestino((x) => ({ ...x, [p.id]: v }))}
                  options={comercios.map((c) => ({ value: c.id, label: c.lugar || c.nome }))} />
              ) : (
                <select value={destinoDe(p)} disabled={ocupado} aria-label={en ? 'Store in' : 'Guardar em'}
                  onChange={(e) => setDestino((x) => ({ ...x, [p.id]: e.target.value }))}>
                  {comercios.map((c) => <option key={c.id} value={c.id}>{c.lugar || c.nome}</option>)}
                </select>
              )}
            </div>
            {contraAberta && CampoPreco && (
              <div className="estoque-prop-campo">
                <span className="mn-rotulo">{en ? 'Counteroffer (each)' : 'Contraproposta (cada)'}</span>
                <CampoPreco valor={contra[p.id]} lang={lang} disabled={ocupado}
                  onChange={(v) => setContra((c) => ({ ...c, [p.id]: v === '' ? 0 : Number(v) }))} />
              </div>
            )}
            {/* As respostas no pé do painel, como o Comprar da loja: o verbo
                principal em ouro; Recusar é o único que desfaz, e fala em brasa. */}
            <div className="estoque-prop-acoes">
              {contraAberta ? (
                <>
                  <button type="button" className="btn-ghost btn-md" disabled={ocupado}
                    onClick={() => setContra((c) => { const n = { ...c }; delete n[p.id]; return n; })}>{en ? 'Back' : 'Voltar'}</button>
                  <button type="button" className="btn-primary btn-md" disabled={ocupado} onClick={() => responder(p, 'contrapropor')}>
                    {en ? 'Send counteroffer' : 'Enviar contraproposta'}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn-ghost btn-md estoque-prop-recusar" disabled={ocupado} onClick={() => responder(p, 'recusar')}>{en ? 'Decline' : 'Recusar'}</button>
                  <button type="button" className="btn-ghost btn-md" disabled={ocupado}
                    onClick={() => setContra((c) => ({ ...c, [p.id]: Number(p.preco_latao) || 0 }))}>{en ? 'Counteroffer' : 'Contrapropor'}</button>
                  <button type="button" className="btn-primary btn-md" disabled={ocupado} onClick={() => responder(p, 'aceitar')}>{en ? 'Accept' : 'Aceitar'}</button>
                </>
              )}
            </div>
          </>
        )}
      </div>
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

  /* O MESMO DESENHO DAS PÁGINAS DA FICHA (02/11/2026, usuário: "Na loja,
     visão do mestre, aplique o mesmo layout com o trilho interno, etc."). Um
     cartão só, com o trilho DENTRO dele, na largura e na altura de toda
     página (--fp-largura e --pg-altura, "A MOLDURA DE PÁGINA" no index.css). */

  return (
    <div className="fp-page is-inv is-inventario estoque-pagina">
      {/* O balão das línguetas (um só para a tela, como nas outras fases). */}
      <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
      <div className="fp-card estoque-card">
      {/* O trilho é a .cartoes-barra das listas (Cena, Personagens…), no alto do
          cartão: a mesma pílula em toda página que não é da ficha. */}
      <div className="fp3-pagina-topo estoque-topo">{trilho}</div>
      {erro && <div className="err-msg" style={{ margin: '0 auto 12px', maxWidth: 600 }}>{erro}</div>}
      {aba === 'propostas' ? (() => {
        const todas = [...pendentes, ...aguardando];
        // Sem escolha, abre a primeira que espera o Mestre — é a que pede resposta.
        const aberta = todas.find((p) => p.id === propSel) || todas[0] || null;
        return (
          <div className="estoque-conteudo estoque-conteudo--propostas">
            <div className="bau-corpo bau-corpo--painel estoque-props">
              <div className="mn-quadro estoque-props-quadro">
                {propostas === null ? <p className="estoque-prop-vazio">{en ? 'Loading…' : 'Carregando…'}</p> : (
                  <>
                    {grupoDePropostas(en ? 'Waiting for you' : 'Esperando você', pendentes, en ? 'No offer waiting for you.' : 'Nenhuma proposta esperando você.')}
                    {grupoDePropostas(en ? 'Waiting for the player' : 'Esperando o jogador', aguardando, en ? 'No counteroffer waiting.' : 'Nenhuma contraproposta esperando.')}
                  </>
                )}
              </div>
              <aside className="bau-painel loja-painel" aria-label={en ? 'Offer' : 'Proposta'}>
                {aberta ? painelProposta(aberta) : (
                  <div className="bau-painel-vazio">
                    <i className="ti ti-scale" aria-hidden="true" />
                    <p>{en ? 'When a player offers to sell an item, the offer shows up here.' : 'Quando um jogador propuser vender um item, a proposta aparece aqui.'}</p>
                  </div>
                )}
              </aside>
            </div>
          </div>
        );
      })() : !loja ? (
        <div className="best-empty">{lugares && !lugares.length
          ? (en ? 'No city or kingdom in the catalog yet. Each one gets its shop here.' : 'Nenhuma cidade ou reino no catálogo ainda. Cada um ganha a sua loja aqui.')
          : (en ? 'Opening the shops…' : 'Abrindo as lojas…')}</div>
      ) : (
        <div className="estoque-conteudo">
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
                        className={'inv-card loja-casa' + (escolhidaAqui ? ' is-sel' : '') + (c.tipo === 'catalogo' ? ' estoque-casa--catalogo' : '') + (c.cat.magico ? ' is-magico' : '') + (fechada ? ' estoque-casa--fechada' : '')
                          + (lequeEst && lequeEst.tipo === c.tipo && lequeEst.id === c.id ? ' inv-card--leque' : '')}
                        aria-haspopup="menu"
                        onClick={(e) => { setSel({ tipo: c.tipo, id: c.id }); setLequeEst({ tipo: c.tipo, id: c.id, ancora: e.currentTarget }); }}>
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
            {lequeEst && window.LequeDoItem && (() => {
              const Leque = window.LequeDoItem;
              const ent = lequeEst.tipo === 'entrada' ? ((loja && loja.itens) || []).find((x) => x.entryId === lequeEst.id) : null;
              const catL = lequeEst.tipo === 'entrada' ? (ent && catBySlug[ent.slug]) : catBySlug[lequeEst.id];
              if (!catL || (lequeEst.tipo === 'entrada' && !ent)) return null;
              const fileira = ent ? (fileiraPorEntry[ent.entryId] || 0) + 1 : 0;
              const acoes = lequeEst.tipo === 'entrada' ? [
                { chave: 'mover', icone: 'ti-arrows-move', desativado: ocupado,
                  rotulo: en ? `Move slot (row ${fileira})` : `Mudar de casa (fileira ${fileira})` },
                { chave: 'tirar', icone: 'ti-trash', perigo: true, desativado: ocupado,
                  rotulo: en ? 'Remove from the shop' : 'Tirar da loja' },
              ] : [
                { chave: 'por', icone: 'ti-plus', desativado: ocupado, rotulo: en ? 'Put in the shop' : 'Pôr na loja' },
              ];
              return (
                <Leque acoes={acoes} ancora={lequeEst.ancora} rotulo={catL.nome}
                  onClose={() => setLequeEst(null)}
                  onEscolher={async (a) => {
                    setLequeEst(null);
                    /* Sem "Detalhes" (31/10/2026, usuário: "a descrição abre ao
                       selecionar o item"): o item já está no painel desde o clique. */
                    if (a.chave === 'mover') { setBusca(''); setMovendo(ent.entryId); return; }
                    if (a.chave === 'tirar') {
                      if (await alterar(naLoja(loja.id, (c) => ({ ...c, itens: c.itens.filter((x) => x.entryId !== ent.entryId) })))) setSel(null);
                      return;
                    }
                    if (a.chave === 'por') {
                      const entryId = estNovoId();
                      // estComCasas carimba a casa do recém-chegado — a primeira vaga.
                      const ok = await alterar(naLoja(loja.id, (c) => estComCasas({ ...c, itens: [...c.itens, { slug: catL.slug, entryId, estoque: 1, preco_latao_override: null }] })));
                      if (ok) { setBusca(''); setSel({ tipo: 'entrada', id: entryId }); }
                    }
                  }} />
              );
            })()}
          </div>
        </div>
      )}
      {/* O RODAPÉ DA MESA (04/11/2026): a data, o lugar, a hora e o clima da
          Cena também na Loja — as três são uma página só. O CardDataJogoAtual
          (10-shell) entra por portal. */}
      {trilhoPaginas && <div id="pg-rodape-slot" className="pg-rodape estoque-rodape" />}
      </div>
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
  // As lojas fixas de cidade e reino (estoque-lojas-fixas.test.jsx).
  lugaresComLoja, lojasQueFaltam, lojaEhFixa,
});
