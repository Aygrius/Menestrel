/* ============================================================
   BESTIÁRIO — Listas de catálogo do Mestre
   ============================================================
   5 listas paginadas + filtros que o Mestre usa pra consultar
   os dados do mundo. Independentes entre si — zero cross-refs.

   - CriaturasList    — bestiário de NPCs/monstros (DB: criaturas)
   - MagiasList       — todas as magias (DB: magias)
   - HabilidadesList  — todas as habilidades (DB: habilidades, migration 008)
   - TecnicasList     — técnicas (DB: tecnicas)
   - ItensList        — itens do catálogo (DB: itens)

   Cada lista declara seu próprio componente nested `Pagination`
   no escopo da função — encapsulado, sem dependência externa.

   Padrão visual (Pedra & Bronze): as 5 listas usam o MESMO kit
   shadcn (UI.Table / UI.Input) dentro de .best-table-wrap, com a
   toolbar .best-toolbar (busca + chips) e linha de detalhe expansível
   (.best-detail via colSpan). Tabela em fundo branco, largura total,
   grade (linhas horizontais + verticais), 1ª coluna à esquerda e
   demais colunas centralizadas. O CSS compartilhado vive no
   src/index.css (seção "BESTIÁRIO (09)", escopado em .menestrel-ui);
   estas listas só aplicam as classes .best/.best-auto/.best-criaturas
   etc. A CriaturasList ainda usa o escopo extra .best-criaturas pra
   alargar a 1ª coluna (tem ~18).
   Loading/erro/paginação compartilham BestLoading/BestErrorBox/
   BestPagination.

   Depende de:
   - React (useState/useEffect desestruturados)
   - supabaseClient (01-core/supabase.jsx) — todas as 5 listas leem
                                              do DB (inclui habilidades)
   - GAME_DATA (01-core/game-data.jsx)
   - ehContainer (01-core/inventario-helpers.jsx)
   - AdminEmpty, Icon (ainda no app.jsx, runtime)

   Consumidores no app.jsx:
   - <CriaturasList />   — aba "Criaturas" (Mestre)
   - <MagiasList />      — aba "Magias" (Mestre)
   - <HabilidadesList /> — aba "Habilidades" (Mestre)
   - <TecnicasList />    — aba "Técnicas" (Mestre)
   - <ItensList />       — aba "Itens" (Mestre)

   Carregar depois de 07-inventario/ e antes do app.jsx.
   ============================================================ */
// Botão + janela da Verificação do catálogo (14/09/2026) — ver painel-modal.jsx.
import './painel-modal.jsx';


// ---------- Hooks e helpers compartilhados ----------

/* ── Tooltip de chip — aparece abaixo do elemento, padrão Pedra & Bronze ── */
function useBestTip() {
  const [tip, setTip] = React.useState(null);
  const timerRef = React.useRef(null);
  const show = React.useCallback((e, label) => {
    clearTimeout(timerRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    timerRef.current = setTimeout(() => setTip({ rect, label }), 400);
  }, []);
  const hide = React.useCallback(() => { clearTimeout(timerRef.current); setTip(null); }, []);
  return [tip, show, hide];
}
function BestTip({ tip }) {
  if (!tip) return null;
  const { rect, label } = tip;
  const left = rect.left + rect.width / 2;
  const top  = rect.bottom + 6;
  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed', left, top, transform: 'translateX(-50%)',
      zIndex: 9999, pointerEvents: 'none', whiteSpace: 'nowrap',
      background: '#141009', borderRadius: 6, padding: '6px 10px',
      fontFamily: "'Lora', serif", fontSize: 12, color: '#E8DDC6',
      animation: 'fpItemTipIn .12s ease-out',
    }}>
      {/* seta apontando para cima */}
      <div style={{
        position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
        borderWidth: 5, borderStyle: 'solid',
        borderColor: 'transparent transparent #141009 transparent',
        width: 0, height: 0,
      }} />
      {label}
    </div>,
    document.body
  );
}

/* ── Mapa de ícones Tabler por categoria/contexto ── */
const CHIP_ICON = {
  // "All" universal
  all:           'ti-list',
  // Criaturas
  Animal:        'ti-paw',
  Celestial:     'ti-star',
  Civilizado:    'ti-building',
  'Construído':  'ti-robot',
  'Demônio':     'ti-flame',
  'Dragão':      'ti-fish-bone',
  Elemental:     'ti-tornado',
  Morto:         'ti-skull',
  'Místico':     'ti-sparkles',
  // Magias
  'Básica':      'ti-wand',
  Perdida:       'ti-eye-off',
  Ancestral:     'ti-hourglass',
  // Habilidades
  Profissional:  'ti-briefcase',
  'Subterfúgio': 'ti-mask',
  Manobra:       'ti-swords',
  'Influência':  'ti-messages',
  Conhecimento:  'ti-book',
  Geral:         'ti-circles',
  // Técnicas
  Intermitente:  'ti-refresh',
  Livre:         'ti-wind',
  'Único':       'ti-diamond',
  // Itens
  Animais:       'ti-paw',
  Armaduras:     'ti-shield',
  Armas:         'ti-sword',
  'Consumíveis': 'ti-bottle',
  Diario:        'ti-notebook',
  Instrumentos:  'ti-music',
  Itens:         'ti-box',
  Minerais:      'ti-diamond',
  Moedas:        'ti-coins',
  Propriedades:  'ti-home',
  Recipientes:   'ti-bucket',
  'Serviços':    'ti-tools',
  Transportes:   'ti-horse',
  Vestimentas:   'ti-shirt',
};

/* ── ChipIcon — chip que mostra só ícone + tooltip abaixo ── */
function ChipIcon({ value, label, active, onClick, _icon }) {
  const [tip, showTip, hideTip] = useBestTip();
  const icon = _icon || CHIP_ICON[value] || 'ti-tag';
  return (
    <>
      <button
        className={'best-chip best-chip--icon' + (active ? ' is-active' : '')}
        onClick={onClick}
        onMouseEnter={(e) => showTip(e, label)}
        onMouseLeave={hideTip}
        aria-label={label}
        title=""
      >
        <i className={'ti ' + icon} aria-hidden="true" />
      </button>
      <BestTip tip={tip} />
    </>
  );
}

/* Por que a lista está vazia?

   O texto de vazio das 5 listas sempre disse "nada corresponde à busca" —
   certo quando há busca, errado quando não há. No modo jogador o caso comum
   é justamente esse: o jogador não tem personagem, ou tem personagem que
   não conhece nada daquele catálogo. Dizer 'Nenhuma magia corresponde a ""'
   faz parecer defeito de busca, quando é a resposta certa do sistema.

   Spec §2: "jogador sem personagem nenhum vê as abas vazias. A tela diz
   isso em texto, em vez de fingir que o catálogo não existe." */
function textoListaVazia({ query, modoJogador, lang, oQue, oQueEn }) {
  const buscando = !!(query && query.trim());
  if (buscando) {
    return lang === 'en'
      ? `No ${oQueEn} matches "${query}".`
      : `Nenhum resultado para "${query}" em ${oQue}.`;
  }
  if (modoJogador) {
    return lang === 'en'
      ? `Your characters don't know any ${oQueEn} yet.`
      : `Seus personagens ainda não conhecem ${oQue}.`;
  }
  return lang === 'en' ? `No ${oQueEn} here yet.` : `Nada em ${oQue} ainda.`;
}

/* Quebra um texto do banco em parágrafos.

   O campo `descricao` (e `efeito`) é digitado com quebras de linha, e até
   11/09/2026 ia inteiro dentro de um <p> — HTML colapsa \n em espaço, então
   tudo virava um bloco corrido. Pedido do usuário: "a descrição das magias,
   itens, etc, devem respeitar a formatação do texto (parágrafos)".

   A REGRA VEM DOS DADOS, não da convenção Markdown. Conferi o banco em
   11/09/2026: 36 magias, 6 criaturas e 1 item têm quebra de linha na
   descrição, e ZERO registros — em qualquer tabela — usam linha em branco.
   Ou seja, quem escreveu esses textos separa parágrafo com um \n simples.
   Tratar \n como <br> e exigir linha em branco pra parágrafo, que é o
   costume do Markdown, deixaria os 43 registros existentes exatamente como
   estão hoje: um bloco só, agora com quebras apertadas. Então aqui QUALQUER
   quebra abre parágrafo novo, e sequências de quebras contam como uma.

   Devolve array de strings, uma por parágrafo. Função pura de propósito —
   a renderização é de quem chama. */
function paragrafosDe(texto) {
  return String(texto == null ? '' : texto)
    .replace(/\r\n?/g, '\n')
    .split(/\n+/)
    .map((linha) => linha.trim())
    .filter((linha) => linha !== '');
}

/* Texto do banco com os parágrafos preservados. Substitui o <p>{texto}</p>
   cru que existia nas 5 listas. Sem texto, não renderiza nada — os call
   sites já faziam `texto && <p>`, e manter isso aqui evita <p> vazio. */
function TextoDoBanco({ texto, className, prefixo }) {
  const paragrafos = paragrafosDe(texto);
  if (!paragrafos.length) return null;
  return paragrafos.map((p, i) => (
    <p className={className} key={i}>{i === 0 && prefixo ? prefixo : null}{p}</p>
  ));
}

/* Quantas linhas cabem na altura visível — a CONTA, separada do hook pra
   poder ser testada sem DOM.

   O clamp em `top` é o conserto de um bug real (11/09/2026): `top` vem de
   getBoundingClientRect(), ou seja, é relativo à VIEWPORT e fica NEGATIVO
   quando a página está rolada. Sem clamp, `innerHeight - top` cresce junto
   com a rolagem e a página passa a "caber" dezenas de linhas.

   O sintoma era enganoso — aparecia ao CLICAR numa linha, não ao rolar —
   porque a conta só é refeita quando algo re-renderiza. Rolar sozinho não
   re-renderiza; expandir uma linha sim. Então a rolagem ficava represada e
   o efeito estourava no clique seguinte, junto com a navegação indo pra
   página 1 (totalPages cai pra 1 quando a página incha). */
function linhasQueCabem(m) {
  const alturaUtil = m.innerHeight - Math.max(0, m.top) - m.reserved - m.headH;
  return Math.max(m.min, Math.floor(alturaUtil / m.rowH));
}

/* DEZ LINHAS, SEMPRE (20/09/2026): "nas tabelas de técnicas, magias,
   habilidades, etc, eu quero 10 itens por página."

   Este hook media a altura visível e ajustava a página ao que coubesse na
   tela. A ideia era boa e o preço era alto: o número de linhas mudava com o
   tamanho da janela, com a rolagem e ao expandir uma linha, então a mesma
   tabela paginava diferente em cada máquina — e a página atual saltava
   sozinha quando a conta mudava (ver o comentário de linhasQueCabem, que
   documenta um bug inteiro nascido disso).

   Número fixo resolve os dois: previsível para quem usa, estável para quem
   mantém. `opts.fallback` continua sendo a porta para quem precisar de outro
   valor; hoje todos os chamadores usam 10.

   `linhasQueCabem` fica logo acima, ainda testada: a conta não tem culpa, e
   um dia pode voltar a servir para outra coisa. */
function useFitPageSize(wrapRef, opts) {
  return (opts && opts.fallback) || 10;
}

/* Ordenação por clique no cabeçalho. */
function useSort(data) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const toggleSort = (key) => {
    setSortKey((prev) => { if (prev === key) { setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); return key; } setSortDir('asc'); return key; });
  };
  const sorted = React.useMemo(() => {
    if (!sortKey || !data) return data || [];
    return [...data].sort((a, b) => {
      const va = a[sortKey] ?? '';
      const vb = b[sortKey] ?? '';
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'pt-BR', { sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);
  return { sorted, sortKey, sortDir, toggleSort };
}

/* Cabeçalho clicável com indicador de ordenação. */
function SortHead({ col, sortKey, sortDir, toggleSort, children }) {
  const active = sortKey === col;
  return (
    <th onClick={() => toggleSort(col)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {children}
        <span style={{ fontSize: 10, opacity: active ? 1 : 0.3, color: active ? '#9A7B2E' : 'inherit' }}>
          {active && sortDir === 'desc' ? '▼' : '▲'}
        </span>
      </span>
    </th>
  );
}


/* Gate de admin da interface.
   CONVENIÊNCIA, não segurança: quem impede a escrita é a RLS, gated em
   eh_admin() no banco. Este hook decide só se o lápis aparece. Um usuário
   comum que forje a chamada leva erro do Postgres.

   Chama a RPC em vez de comparar o e-mail no cliente de propósito: a
   definição de quem é admin fica com uma dona só. Comparar aqui duplicaria
   a regra em dois lugares que podem divergir. */
function useEhAdmin() {
  const [ehAdmin, setEhAdmin] = useState(false);
  useEffect(() => {
    let vivo = true;
    supabaseClient.rpc('eh_admin').then(({ data, error }) => {
      if (vivo && !error) setEhAdmin(data === true);
    })
      // Rejeição (falha de rede, não só {error} no retorno normal) sem catch
      // vira unhandled rejection. `false` já é o estado default/seguro —
      // não há controle de admin pra vazar, então só engole o erro.
      .catch(() => {});
    return () => { vivo = false; };
  }, []);
  return ehAdmin;
}

// ── BestPageHeader — header topo do card (fp-card-top) ──────────────────────
// `right` é opcional: as 5 listas passam o botão "Novo" do admin ali quando
// ehAdmin — BestPageHeader é privado deste arquivo, então isso não afeta
// nenhum outro consumidor.
function BestPageHeader({ eyebrow, title, right }) {
  return (
    <div className="fp-card-top">
      <header className="ms-header ficha-page-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ficha-page-eyebrow">{eyebrow}</div>
          <h2 className="ms-title" style={{ margin: 0 }}>{title}</h2>
        </div>
        {right}
      </header>
    </div>
  );
}

// ── BestBotaoNovo / BestBotaoEditar — controles do admin nas 5 listas ──────
// Convenção compartilhada: o + no cabeçalho abre o editor em criação
// (linha null), o lápis em cada linha abre em edição (linha = o registro).
// Só o símbolo desde 14/09/2026 (pedido do usuário); "Novo" fica no
// aria-label, para leitor de tela e teste.
// `dica`: o tooltip do + (14/09/2026) — "Nova magia", "Novo item"... Sem ela,
// cai no "Novo" do ADMIN_COPY.
function BestBotaoNovo({ ac, onClick, dica }) {
  const [tip, abrirTip, fecharTip, manterTip] = useTooltip(60);
  return (
    <>
      <button type="button" className="btn-icon btn-sm best-botao-novo"
        onClick={() => { fecharTip(); onClick(); }}
        aria-label={ac.editorNovo}
        {...propsTip(abrirTip, fecharTip, dica || ac.editorNovo)}>
        <i className="ti ti-plus" aria-hidden="true" />
      </button>
      <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </>
  );
}

/* Busca + botão +, juntos no cabeçalho (14/09/2026). "Remova os botões de
   filtro, e também o contador '1034 de 1034', e o botão de buscar fica ao lado
   do botão '+ novo'." A barra que ficava abaixo do título (busca, chips de
   filtro e contador) saiu das 5 listas; sobrou a busca, que sobe para cá. */
/* `ferramentas` (14/09/2026): Verificação, Sugestões e Estudo, que eram faixas
   recolhíveis abaixo do cabeçalho, viraram botões entre a busca e o + — cada
   um abre a sua janela (BestPainelModal, painel-modal.jsx). */
function BestBuscaENovo({ ac, placeholder, query, setQuery, podeCriar, onNovo, dicaNovo, ferramentas }) {
  const { Input } = (typeof UI !== 'undefined' ? UI : {});
  return (
    <div className="best-header-acoes">
      <div className="best-search">
        {Input && <Input type="search" placeholder={placeholder} value={query} onChange={(e) => setQuery(e.target.value)} />}
      </div>
      {ferramentas}
      {podeCriar && <BestBotaoNovo ac={ac} onClick={onNovo} dica={dicaNovo} />}
    </div>
  );
}
/* ── BestBotaoPermissao — o olho (17/09/2026) ───────────────────────────────
   "Do lado do botão de editar (lápis), vamos adicionar um botão de ver (olho),
   onde teremos um modal para permitir quem pode ver aquela entrada, na
   história selecionada." (usuário)

   Irmão do BestBotaoEditar, e igual a ele no essencial: só o ícone, o rótulo
   no aria-label, e stopPropagation no clique — sem isso o clique subiria para
   a <tr>, que é o gesto de expandir a linha, e o modal abriria com a ficha
   escancarada atrás dele.

   O rótulo sai do mesmo COPY do modal (lore.permissao.titulo), pra que o
   tooltip do botão e o título da janela não possam divergir. */
function BestBotaoPermissao({ lang, onClick, disabled }) {
  const rotulo = (((typeof COPY !== 'undefined' && (COPY[lang] || COPY.pt)) || {}).lore || {})
    .permissao?.titulo || (lang === 'en' ? 'Who can see' : 'Quem pode ver');
  const [tip, abrirTip, fecharTip, manterTip] = useTooltip(60);
  return (
    <>
      <button
        type="button"
        className="btn-icon btn-sm"
        aria-label={rotulo}
        disabled={disabled}
        onClick={(e) => { e.stopPropagation(); fecharTip(); onClick(); }}
        {...propsTip(abrirTip, fecharTip, rotulo)}
      >
        <i className="ti ti-eye" aria-hidden="true" />
      </button>
      <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </>
  );
}

function BestBotaoEditar({ ac, onClick }) {
  return (
    <button
      type="button"
      className="btn-icon btn-sm"
      aria-label={ac.editorEditar}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <i className="ti ti-pencil" aria-hidden="true" />
    </button>
  );
}

// ---------- Bestiário ----------
/* `historiaId` (17/09/2026): a mesa ativa do Mestre, que habilita o BOTÃO DE
   OLHO — "do lado do botão de editar (lápis), vamos adicionar um botão de ver
   (olho), onde teremos um modal para permitir quem pode ver aquela entrada, na
   história selecionada" (usuário).

   Por que a criatura entrou nesse escopo: disponibilizar criatura pra história
   era a aba "Criatura" do GerenciarLoreView, alcançável só por Histórias →
   card da mesa → botão "Lore" — o botão que saiu no mesmo dia. A função mudou
   de casa em vez de desaparecer, e esta é a tabela padrão das criaturas.

   Sem mesa, sem olho: "na história selecionada" não existe sem uma
   selecionada, e um olho que abrisse pra falhar no salvar seria pior que
   nenhum. Ver criatura-permissao-olho.test.jsx. */
function CriaturasList({ ac, lang, modoJogador, historiaId }) {
  const { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } = (typeof UI !== 'undefined' ? UI : {});
  const [criaturas, setCriaturas] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [expandida, setExpandida] = useState(null);
  const [page, setPage] = useState(1);
  const wrapRef = React.useRef(null);
  const PAGE_SIZE = useFitPageSize(wrapRef);
  const { sorted: criaturasSorted, sortKey, sortDir, toggleSort } = useSort(criaturas);
  const ehAdmin = useEhAdmin();
  const { carregando: carregandoConhecido, conhecido } = useConhecidoDoJogador(modoJogador);
  const [editando, setEditando] = useState(undefined); // undefined=fechado, null=criando, objeto=editando

  /* ── Permissão por história (o olho) ────────────────────────────────────
     A linha INTEIRA da história, não só o id: o modal precisa de
     criatura_ids, lore_acesso_pj e dos protagonistas. Mesmo motivo pelo qual
     LoreDaMesa existe em 13-diario — o que o AdminConsole tem em mãos é só a
     mesa ativa. */
  const podeGerirVisibilidade = !modoJogador && !!historiaId;
  const [historia, setHistoria] = useState(null);
  const [protagonistas, setProtagonistas] = useState([]);
  const [permissaoDe, setPermissaoDe] = useState(null);
  const [salvandoVis, setSalvandoVis] = useState(false);

  useEffect(() => {
    if (!podeGerirVisibilidade) { setHistoria(null); setProtagonistas([]); return undefined; }
    const cancel = { atual: false };
    (async () => {
      const { data, error: err } = await supabaseClient
        .from('historias').select('*').eq('id', historiaId).maybeSingle();
      if (cancel.atual) return;
      if (err) { setError(err.message); return; }
      setHistoria(data || null);
      const ids = (data && data.protagonista_ids) || [];
      if (!ids.length) { setProtagonistas([]); return; }
      const { data: pjs } = await supabaseClient
        .from('personagens').select('id, nome').in('id', ids).order('nome');
      if (!cancel.atual) setProtagonistas(pjs || []);
    })();
    return () => { cancel.atual = true; };
  }, [podeGerirVisibilidade, historiaId]);

  /* Um UPDATE só, com o patch que o modal montou — ver patchDeVisibilidade em
     13-diario/diario.jsx. O .select() não é zelo: sem ele um UPDATE barrado
     por RLS volta como sucesso com 0 linhas e a tela mente que salvou. */
  const salvarVisibilidade = async (patch) => {
    if (!historia) return;
    setSalvandoVis(true);
    setError(null);
    const colunas = ['id', ...Object.keys(patch)].join(', ');
    const { data: rows, error: err } = await supabaseClient
      .from('historias').update(patch).eq('id', historia.id).select(colunas);
    setSalvandoVis(false);
    if (err) { setError(err.message); return; }
    if (!rows || rows.length === 0) {
      setError(lang === 'en'
        ? 'Could not save: the update affected 0 rows (likely an RLS rule on "historias").'
        : 'Não foi possível salvar: o update não afetou nenhuma linha (provável regra de RLS em "historias").');
      return;
    }
    setHistoria((ant) => ({ ...ant, ...patch, ...rows[0] }));
    setPermissaoDe(null);
  };

  // Extraído do useEffect original SEM mudar comportamento (mesmo guard de
  // cancelamento, só que via objeto em vez da variável de closure) — assim dá
  // pra chamar de novo depois de salvar no CatalogoEditor.
  const carregarCriaturas = async (cancelRef) => {
    const { data, error } = await supabaseClient
      .from('criaturas')
      .select('*')
      .order('estagio', { ascending: true })
      .order('nome', { ascending: true });
    if (cancelRef && cancelRef.atual) return;
    if (error) { console.error('[criaturas] falha ao carregar:', error); setError(error.message); setCriaturas([]); }
    else { setCriaturas(data || []); }
  };

  useEffect(() => {
    const cancelRef = { atual: false };
    carregarCriaturas(cancelRef);
    return () => { cancelRef.atual = true; };
  }, []);
  useEffect(() => { setPage(1); setExpandida(null); }, [query]);

  /* Armas do catálogo para montar os ataques da linha expandida — uma arma,
     um ataque (ataquesDaCriatura). Só carrega na primeira expansão. Enquanto
     não chega, ataquesDaCriatura cai no ataque único das colunas gravadas. */
  const [armasPorSlug, setArmasPorSlug] = useState(null);
  /* Tooltip do projeto (nunca o `title` nativo — ver tooltip-padrao.test.js):
     o nome comprido da arma é cortado com reticências na caixa, e o inteiro
     aparece aqui. Serve também à sigla MON (Montaria). */
  const [tipStat, mostrarTipStat, esconderTipStat] = useBestTip();
  /* SEM o filtro `grupo = 'Armas'` desde 17/09/2026: a mesma leitura serve
     agora a DUAS seções da ficha. Ataques só quer armas, mas Equipamentos
     mostra o nome de qualquer peça que a criatura vista — e uma armadura
     ficaria como slug cru ("cota-de-malha") se o catálogo viesse filtrado.
     Uma leitura paginada a mais por tela é mais barato que duas leituras. */
  useEffect(() => {
    if (expandida == null || armasPorSlug || typeof fetchTabelaPaginada !== 'function') return undefined;
    let cancelado = false;
    fetchTabelaPaginada('itens', { colunas: 'slug, nome, grupo, dano, dano_l, dano_m, dano_p, ajuste_atributo' })
      .then(({ data }) => {
        if (cancelado) return;
        const m = {};
        (data || []).forEach((it) => { m[it.slug] = it; });
        setArmasPorSlug(m);
      });
    return () => { cancelado = true; };
  }, [expandida, armasPorSlug]);

  /* ── Catálogos das seções Habilidades, Técnicas e Magias (17/09/2026) ────
     O banco guarda só os NOMES na linha da criatura ("Sentidos, Rastrear"); o
     número sai do estágio e dos atributos, pelas mesmas funções da batalha
     (o trio ...DaCriaturaCrua). Para isso é preciso o catálogo de cada um.

     Preguiçoso e uma vez só, no mesmo molde do armasPorSlug acima: quem abre
     a tela para buscar uma criatura não paga por três leituras que só a ficha
     usa. As três em paralelo — não dependem uma da outra. */
  const [catalogosFicha, setCatalogosFicha] = useState(null);
  useEffect(() => {
    if (expandida == null || catalogosFicha) return undefined;
    let cancelado = false;
    (async () => {
      const [habs, tecs, mags] = await Promise.all([
        supabaseClient.from('habilidades').select('key, nome, grupo, ajuste, descricao'),
        supabaseClient.from('tecnicas').select('key, nome, uso, efeito, descricao, grupo_armas, grupo_armaduras'),
        supabaseClient.from('magias').select('key, nome, descricao'),
      ]);
      if (cancelado) return;
      const porKey = (rows) => {
        const m = {};
        (rows || []).forEach((r) => { if (r && r.key) m[r.key] = r; });
        return m;
      };
      setCatalogosFicha({
        habilidadesByKey: porKey(habs.data),
        tecnicasByKey: porKey(tecs.data),
        magiasByKey: porKey(mags.data),
      });
    })();
    return () => { cancelado = true; };
  }, [expandida, catalogosFicha]);

  if (!Table) return <BestNoKit />;
  if (criaturas === null) return <BestLoading lang={lang} />;
  if (error) return <BestErrorBox error={error} hint={lang === 'en' ? "Make sure the 'criaturas' table exists in Supabase." : "Confira se a tabela 'criaturas' existe no Supabase."} />;
  if (modoJogador && carregandoConhecido) return <BestLoading lang={lang} />;

  const q = query.trim().toLowerCase();
  let filtered = (criaturasSorted || []).filter((c) => {
    if (q && !(c.nome || '').toLowerCase().includes(q)) return false;
    return true;
  });
  // Criatura só aparece pro jogador se o Mestre a liberou na história dele
  // (historias.criatura_ids + lore_acesso_pj — ver criaturasLiberadas).
  if (modoJogador) filtered = filtered.filter((c) => conhecido.criaturas.has(c.id));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Colunas da linha. Os 7 atributos e a descrição vivem no painel expansível.
  /* COLUNAS (17/09/2026): "eu quero apenas as colunas de 'visibilidade',
     'classe', 'estágio', além dos botões de ver e editar." (usuário)

     Eram dez. As sete de números (EF, EH, AB, DF, AR, VB, PS) desceram para a
     ficha da linha expandida, em seções com subtítulo — ver SECOES_DA_FICHA.
     Uma tabela de catálogo serve para ACHAR a criatura; comparar números é o
     que a ficha faz, e ali cabe o rótulo inteiro.

     Nome fica porque é o identificador da linha e é onde mora o chevron de
     expandir. Visibilidade entra sob a MESMA condição do olho (mesa
     selecionada): sem mesa não existe "quem vê nesta história" para mostrar. */
  const cols = [
    { key: 'nome',    label: lang === 'en' ? 'Name' : 'Nome' },
    ...(podeGerirVisibilidade
      ? [{ key: '_visibilidade', label: lang === 'en' ? 'Visibility' : 'Visibilidade' }]
      : []),
    { key: 'tipo',    label: lang === 'en' ? 'Class' : 'Classe' },
    { key: 'estagio', label: lang === 'en' ? 'Stage' : 'Estágio' },
  ];
  const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : v);
  /* Calculados (15/09/2026): "No modal de editar criaturas, não precisa
     mostrar os campos preenchidos automaticamente, mas mostre ao expandir a
     criatura na tabela." Os gravados vêm da linha; RF e RM não têm coluna e
     saem da mesma conta do editor. */
  /* Rótulos ABREVIADOS (15/09/2026): "padronize o tamanho dos atributos,
     abreviando as palavras". São as mesmas siglas das colunas da tabela, e a
     armadura mostra a SIGLA (L/M/P), não "Leve" — o nome por extenso fazia a
     caixa dela ser o dobro das outras. */
  /* Quantos botões a coluna de ações tem: 0 (nenhum), 1 (só lápis ou só olho)
     ou 2. O número decide a largura do cabeçalho — e a EXISTÊNCIA da coluna,
     que antes era `ehAdmin` sozinho. */
  const temAcoes = (ehAdmin ? 1 : 0) + (podeGerirVisibilidade ? 1 : 0);

  /* ── A FICHA EM SEÇÕES (17/09/2026) ────────────────────────────────────
     "O restante das informações eu quero descritas, use cards depois de cada
     subtítulo (com tooltip)." (usuário, que ditou as oito seções e a ordem)

     ⚠️ RÓTULOS POR EXTENSO. Isto REVERTE 15/09/2026 ("padronize o tamanho dos
     atributos, abreviando as palavras"), o pedido que criou os EF/RF/AGI. Eles
     existiam porque cada card era uma célula de faixa apertada, do tamanho da
     coluna da tabela; agora as seções são largas e o nome inteiro cabe. Quem
     encontrar aquele comentário antigo em outro lugar: ele valia para a faixa
     única, que não existe mais aqui.

     O tooltip diz O QUE O CAMPO É — decisão do usuário entre explicar o campo
     e mostrar a conta. Para habilidade, técnica e magia, a explicação é a
     `descricao` do próprio catálogo, que já existe e já é mantida.

     `armadura` é a única de valor TEXTO nas Informações, e mostra a SIGLA que
     o banco guarda (L/M/P). Chegou a mostrar a palavra, traduzida pelo mapa do
     editor de catálogo; o usuário preferiu a sigla ("Leve = L", 17/09/2026), e
     com isso decodificá-la passou a ser trabalho do tooltip — que é por onde o
     card diz "L leve, M médio, P pesado". */
  const en = lang === 'en';
  const fmtAltura = (v) => (v == null || v === ''
    ? '—'
    // Metro com duas casas e vírgula decimal: 0,80 — a unidade do jogo.
    : Number(v).toFixed(2).replace('.', ','));

  /* O texto do chip de Visibilidade. Mesmo critério das tabelas de NPCs e
     Lugares: "ninguém"/"todos" pelo nome, e a liberação individual pela
     PROPORÇÃO (1/2), porque 1 de 4 e 3 de 4 são situações diferentes e um
     rótulo só não as distingue. */
  const rotuloVisibilidade = (vis) => {
    const tp = ((COPY[lang] || COPY.pt).lore || {}).permissao || {};
    if (vis.modo === 'ninguem') return tp.ninguem;
    if (vis.modo === 'todos') return tp.todos;
    return `${vis.pjIds.length}/${protagonistas.length || vis.pjIds.length}`;
  };

  /* Ícone da CLASSE: o mesmo mapa do token do tabuleiro
     (ICONE_TIPO_CRIATURA, 01-core/game-data.jsx). Devolve null para tipo sem
     ícone mapeado, e aí o card cai na palavra. */
  const iconeDeClasse = (tipo) => (
    (typeof iconeTipoCriatura === 'function' ? iconeTipoCriatura(tipo) : null) || null
  );

  /* Ícone do ELEMENTO (17/09/2026, ícones ditados pelo usuário).
     Lê a coluna `elemento`, que nasceu em 18/09/2026 justamente por causa
     deste card: antes o valor saía de `subtipo`, que declarava elementos no
     editor e guardava ESPÉCIE nos dados (~147 de ~218 diziam "Cavalo",
     "Goblin", "Esqueleto"), e o card mostrava espécie sob o rótulo Elemento.
     Ver scripts/sql/criaturas-elemento-2026-09-18.sql.
     Quem não casa com os quatro cai na palavra — 203 criaturas estão sem
     elemento informado, e "—" é a verdade ali.
     A chave é comparada sem acento e em minúsculas porque "Água" aparece
     escrita das duas formas em catálogos de jogo. */
  const ELEMENTO_ICONE = {
    fogo:  'ti-flame',
    ar:    'ti-tornado',
    agua:  'ti-droplet',
    terra: 'ti-frustum',
  };
  const iconeDeElemento = (v) => {
    if (!v) return null;
    const chave = String(v).trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
    return ELEMENTO_ICONE[chave] || null;
  };

  /* "Grupo Pequeno" → "Pequeno" (17/09/2026). O rótulo do card já é "Grupo";
     o prefixo no valor gastava metade da caixa repetindo a palavra. Só o
     prefixo sai — "Solitário", que não o tem, passa intacto, e um valor novo
     na coluna `coletivo` que não comece com "Grupo " também. */
  const semPrefixoGrupo = (v) => (v == null || v === ''
    ? v
    : String(v).replace(/^Grupo\s+/i, ''));

  /* O trio cri-based vive em 12-batalha, que carrega DEPOIS desta fase. Em
     tempo de render isso não é problema (main.tsx já carregou tudo), mas uma
     tela que monte só o bestiário — como bestiario-admin.test.jsx faz —
     encontraria `window.MotorBatalha` indefinido e quebraria a linha
     expandida inteira.

     Guarda com `typeof`, a mesma convenção dos outros globais entre fases
     (ver `iconeTipoCriatura` em 12-batalha/tabuleiro.jsx): sem o motor, as
     três seções que dependem dele vêm vazias, e o resto da ficha — que é a
     maior parte — continua de pé. Degradar é melhor que sumir. */
  const doMotor = (fn, ...args) => {
    const m = (typeof MotorBatalha !== 'undefined' && MotorBatalha)
      || (typeof window !== 'undefined' && window.MotorBatalha);
    return (m && typeof m[fn] === 'function') ? (m[fn](...args) || []) : [];
  };

  const SECOES_DA_FICHA = (row) => {
    const cri = catalogosFicha || {};
    /* `card(rotulo, valor, nomeInteiro, explicacao)`.
       O tooltip junta os dois últimos: quando o rótulo é uma SIGLA (Int, EF), o
       nome inteiro vem primeiro — é a primeira coisa que alguém quer ao parar
       o mouse num "Int" —, e a explicação vem depois. Onde o rótulo já é a
       palavra (Características, Habilidades, Ataques), `nomeInteiro` é null e
       sobra só a explicação: repetir "Estágio — Estágio" não informa nada.

       O par sigla+tooltip é o pedido de 17/09/2026 ("Int (tooltip Intelecto)");
       a explicação é o de mais cedo no mesmo dia, quando o usuário escolheu
       que o tooltip diz "o que aquilo significa". As duas coisas cabem juntas
       e nenhuma precisou ser desfeita. */
    /* `icone` (5º arg, 17/09/2026): quando presente, o VALOR do card é o
       glifo em vez do texto — é o pedido "para a classe, use o ícone, para o
       elemento, use os ícones". O texto correspondente vai para o tooltip
       (via `nomeInteiro`), e é obrigatório fazer isso: um ícone sozinho não se
       explica, e "Classe: 🐴" sem legenda vale menos que a palavra. */
    const card = (label, val, nomeInteiro, explicacao, icone) => ({
      label, val, icone,
      tip: [nomeInteiro, explicacao].filter(Boolean).join(' — '),
    });
    const listaEquip = (typeof CriaturaFormulas !== 'undefined'
      && CriaturaFormulas.listaEquipamento)
      ? CriaturaFormulas.listaEquipamento(row.equipamento) : [];
    const itens = armasPorSlug || {};

    return [
      {
        titulo: en ? 'Attributes' : 'Atributos',
        cards: [
          card('INT', row.intelecto, en ? 'Intellect' : 'Intelecto',
            en ? 'Reasoning and learning.' : 'Raciocínio e aprendizado.'),
          card('AUR', row.aura, 'Aura',
            en ? 'Magical presence — feeds Heroic Energy and Magic Resistance.' : 'Presença mágica — alimenta a Energia Heroica e a Resistência Mágica.'),
          card('CAR', row.carisma, en ? 'Charisma' : 'Carisma',
            en ? 'Influence over others.' : 'Influência sobre os outros.'),
          card('FOR', row.forca, en ? 'Strength' : 'Força',
            en ? 'Raw power — weighs on melee damage.' : 'Força bruta — pesa no dano corpo a corpo.'),
          card('FIS', row.fisico, en ? 'Physique' : 'Físico',
            en ? 'Body and stamina — feeds Physical Energy and Physical Resistance.' : 'Corpo e resistência — alimenta a Energia Física e a Resistência Física.'),
          card('AGI', row.agilidade, en ? 'Agility' : 'Agilidade',
            en ? 'Speed and reflexes.' : 'Rapidez e reflexo.'),
          card('PER', row.percepcao, en ? 'Perception' : 'Percepção',
            en ? 'What the creature notices around it.' : 'O que a criatura nota em volta.'),
        ],
      },
      {
        titulo: en ? 'Information' : 'Informações',
        cards: [
          card('EF', row.energia_fisica, en ? 'Physical Energy' : 'Energia Física',
            en ? 'The body’s pool — it runs out and the creature falls.' : 'A reserva do corpo — zera e a criatura cai.'),
          card('EH', row.energia_heroica, en ? 'Heroic Energy' : 'Energia Heroica',
            en ? 'The pool that absorbs the blow before the body does.' : 'A reserva que absorve o golpe antes do corpo.'),
          card('RF', CriaturaFormulas.resistenciaFisica(row), en ? 'Physical Resistance' : 'Resistência Física',
            en ? 'How much physical damage it endures.' : 'O quanto ela aguenta de dano físico.'),
          card('RM', CriaturaFormulas.resistenciaMagica(row), en ? 'Magic Resistance' : 'Resistência Mágica',
            en ? 'How much magical damage it endures.' : 'O quanto ela aguenta de dano mágico.'),
          /* O VALOR é a sigla que o banco guarda (L/M/P), não a palavra
             (17/09/2026: "Leve = L"). Com o valor abreviado, decodificá-lo
             passa a ser trabalho do tooltip — daí as três palavras nele. */
          card('AR', row.armadura, en ? 'Armor' : 'Armadura',
            en ? 'Armor class: L light, M medium, P heavy.' : 'Classe da armadura: L leve, M médio, P pesado.'),
          card('AB', row.absorcao, en ? 'Absorption' : 'Absorção',
            en ? 'Damage the armor swallows on every hit.' : 'Dano que a armadura engole em cada acerto.'),
          card('DF', row.defesa, en ? 'Defense' : 'Defesa',
            en ? 'How hard it is to hit.' : 'O quanto ela é difícil de acertar.'),
          card('VB', row.velocidade, en ? 'Speed' : 'Velocidade',
            en ? 'How far it moves in a round.' : 'O quanto ela anda numa rodada.'),
        ],
      },
      {
        titulo: en ? 'Traits' : 'Características',
        cards: [
          card(en ? 'Stage' : 'Estágio', row.estagio, null,
            en ? 'The creature’s level — it sets ability, technique and spell levels.' : 'O nível da criatura — é ele que dá o nível das habilidades, técnicas e magias.'),
          card(en ? 'Weight' : 'Peso', row.peso, null,
            en ? 'In kilograms.' : 'Em quilos.'),
          card(en ? 'Height' : 'Altura', fmtAltura(row.altura), null,
            en ? 'In meters.' : 'Em metros.'),
          /* CLASSE E ELEMENTO viram ÍCONE (17/09/2026). A palavra sai do card
             e vai para o tooltip — obrigatoriamente, porque um glifo sozinho
             não se explica.

             A classe reusa ICONE_TIPO_CRIATURA (01-core/game-data.jsx), o
             mesmo mapa do token do tabuleiro: dois mapas discordariam e a
             mesma criatura teria ícones diferentes na consulta e na batalha.
             Ele cobre os 10 tipos que o catálogo usa de fato; 'Gigante' e
             'Monstro', que o editor oferece e ninguém usa, caem na palavra. */
          card(en ? 'Class' : 'Classe',
            row.tipo, row.tipo,
            en ? 'What kind of creature it is — animal, undead, dragon…' : 'Que tipo de criatura ela é — animal, morto, dragão…',
            iconeDeClasse(row.tipo)),
          /* Coluna PRÓPRIA desde 18/09/2026. Lia `subtipo`, que declarava
             elementos no editor e guardava ESPÉCIE nos dados — o card dizia
             "Elemento: Cavalo" para a maior parte do catálogo. Ver
             scripts/sql/criaturas-elemento-2026-09-18.sql. */
          card(en ? 'Element' : 'Elemento',
            row.elemento, row.elemento,
            en ? 'The element it belongs to.' : 'O elemento a que ela pertence.',
            iconeDeElemento(row.elemento)),
          /* O valor perde o "Grupo " (17/09/2026: "Grupo Pequeno = Pequeno").
             O rótulo do card já diz Grupo; repeti-lo no valor gastava metade da
             caixa dizendo duas vezes a mesma coisa. "Solitário" não tem o
             prefixo e passa intacto. */
          card(en ? 'Group' : 'Grupo', semPrefixoGrupo(row.coletivo), null,
            en ? 'Whether it shows up alone or in a band.' : 'Se ela aparece sozinha ou em bando.'),
          /* Montaria não estava na lista ditada, e aparecia na faixa antiga
             como o chip "MON". Virou card em vez de desaparecer: é uma
             característica, e é ela que o inventário lê para oferecer
             "Montar". */
          card(en ? 'Mount' : 'Montaria',
            row.montaria === true ? (en ? 'Yes' : 'Sim') : (en ? 'No' : 'Não'), null,
            en ? 'Whether it can be ridden.' : 'Se ela pode ser montada.'),
        ],
      },
      {
        titulo: en ? 'Abilities' : 'Habilidades',
        // O total vem da MESMA função da batalha — ver o trio no batalha.jsx.
        cards: doMotor('habilidadesDaCriaturaCrua', row, cri.habilidadesByKey)
          .map((h) => card(h.nome, h.total, null, h.descricao)),
      },
      {
        titulo: en ? 'Combat Techniques' : 'Técnicas de Combate',
        cards: doMotor('tecnicasDaCriaturaCrua', row, cri.tecnicasByKey)
          .map((t) => card(t.nome, t.total, null, t.descricao || t.efeito)),
      },
      {
        titulo: en ? 'Equipment' : 'Equipamentos',
        /* SÓ EQUIPAMENTO DE DEFESA (17/09/2026: "são equipamentos de defesa,
           no caso da Águia não tem nenhum"). A coluna `equipamento` guarda as
           duas coisas na mesma lista — o bico e a garra da Águia são itens do
           grupo Armas —, e as armas já têm a seção Ataques, com o dano. Listar
           as duas vezes fazia a Águia parecer equipada com armadura.

           `grupo !== 'Armas'` é o MESMO discriminador que criatura-formulas usa
           (ehArma) para decidir o que vira ataque e o que vira absorção/defesa.
           Peça cujo slug não está no catálogo fica de fora: sem o item não há
           como saber se é arma ou proteção, e chutar erraria para um dos
           lados. */
        cards: listaEquip
          .map((p) => ({ p, it: itens[p.slug] }))
          .filter(({ it }) => it && it.grupo !== 'Armas')
          .map(({ p, it }) => card(
            it.nome,
            // O slot é o "valor" do card: onde a peça está vestida.
            p.slot || '—',
            null,
            en ? `Equipped in: ${p.slot || '—'}` : `Equipado em: ${p.slot || '—'}`
          )),
      },
      {
        titulo: en ? 'Spells' : 'Magias',
        /* O valor é o NÍVEL em que a criatura conjura, e ele sai do ESTÁGIO
           (nivelMagiaDeCriatura), não da coluna `magia_n` — abandonada em
           13/09/2026 e ainda preenchida no banco com valores velhos. */
        cards: doMotor('magiasDaCriaturaCrua', row, cri.magiasByKey)
          .map((m) => card(m.magia.nome, m.nivel, null, m.magia.descricao)),
      },
      {
        titulo: en ? 'Attacks' : 'Ataques',
        // O número é o Dano 100% da arma, como na faixa antiga.
        cards: (CriaturaFormulas.ataquesDaCriatura(row, itens) || [])
          .map((a) => card(a.nome, a.dano_100, null,
            en ? 'Damage at 100% of the Heroic Energy.' : 'Dano a 100% da Energia Heroica.')),
      },
    ];
  };

  return (
    <div className="fp-page">
    <div className="fp-card best best-criaturas">
      <BestPageHeader eyebrow={lang === 'en' ? 'BESTIARY' : 'BESTIÁRIO'} title={lang === 'en' ? 'Creatures' : 'Criaturas'}
        right={<BestBuscaENovo ac={ac} query={query} setQuery={setQuery}
          placeholder={lang === 'en' ? 'Search creature…' : 'Buscar criatura…'}
          podeCriar={ehAdmin} onNovo={() => setEditando(null)}
          dicaNovo={lang === 'en' ? 'New creature' : 'Nova criatura'}
          /* Verifica se os nomes em criaturas.magia ainda casam com o catálogo —
             o furo que a auditoria de magias não alcança (rename silencioso). */
          ferramentas={ehAdmin && <CriaturasAuditoriaPainel criaturas={criaturas} lang={lang} />} />} />

      {filtered.length === 0 ? (
        <div className="best-empty">{textoListaVazia({ query, modoJogador, lang, oQue: 'criaturas', oQueEn: 'creature' })}</div>
      ) : (
        <>
          <div className="best-table-wrap" ref={wrapRef}>
            <Table>
              <TableHeader><TableRow>
                {cols.map((c) => <SortHead key={c.key} col={c.key} sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{c.label}</SortHead>)}
                {/* Uma coluna de ações para o lápis e/ou o olho. `temAcoes`
                    em vez de `ehAdmin` sozinho: o olho depende de mesa
                    selecionada, não de ser admin, e sem ele o cabeçalho
                    ficava com uma coluna a menos que as linhas. */}
                {temAcoes && <TableHead style={{ width: temAcoes === 2 ? 80 : 40 }} />}
              </TableRow></TableHeader>
              <TableBody>
                {pageSlice.map((row) => {
                  const isOpen = expandida === row.id;
                  return (
                    <React.Fragment key={row.id}>
                      <TableRow className={isOpen ? 'on' : ''} style={{ cursor: 'pointer' }} onClick={() => setExpandida(isOpen ? null : row.id)}>
                        {cols.map((c) => c.key === 'nome' ? (
                          <TableCell key={c.key} className="best-name"><span className="best-chevron" style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</span>{fmt(row[c.key])}</TableCell>
                        ) : c.key === '_visibilidade' ? (
                          /* O MESMO chip das tabelas de NPCs e Lugares — o
                             estado que o olho edita, legível na linha. Vem de
                             13-diario porque "quem vê" tem uma regra só. */
                          <TableCell key={c.key}>{(() => {
                            const vis = window.DiarioVisibilidade.visibilidadeDaEntrada(historia, 'criatura', row.id);
                            return (
                              <span className={'diario-vis-chip diario-vis-chip--' + vis.modo}>
                                {rotuloVisibilidade(vis)}
                              </span>
                            );
                          })()}</TableCell>
                        ) : (
                          <TableCell key={c.key}>{fmt(row[c.key])}</TableCell>
                        ))}
                        {temAcoes && (
                          <TableCell className="best-td-acoes" onClick={(ev) => ev.stopPropagation()}>
                            {/* O olho vem ANTES do lápis, como nas tabelas de
                                NPCs e Lugares — a ordem é a mesma nas três. */}
                            {podeGerirVisibilidade && (
                              <BestBotaoPermissao
                                lang={lang}
                                onClick={() => setPermissaoDe(row)}
                                disabled={!historia} />
                            )}
                            {ehAdmin && <BestBotaoEditar ac={ac} onClick={() => setEditando(row)} />}
                          </TableCell>
                        )}
                      </TableRow>
                      {isOpen && (
                        <TableRow className="best-detail"><TableCell colSpan={cols.length + (temAcoes ? 1 : 0)}>
                          {/* A descrição ABRE a ficha, como no exemplo que o
                              usuário escreveu: o nome, o parágrafo, e só então
                              os números. Antes vinha por último, depois das
                              faixas de cards. */}
                          {row.descricao
                            ? <TextoDoBanco texto={row.descricao} className="best-desc" />
                            : <p className="best-desc" style={{ opacity: 0.55 }}>{lang === 'en' ? 'No description yet.' : 'Sem descrição ainda.'}</p>}
                          {/* Enquanto os catálogos não chegam, as três seções
                              que dependem deles vêm vazias — e "vazio" ali
                              significaria "esta criatura não tem magia", que é
                              mentira diferente de "ainda estou carregando". */}
                          {!catalogosFicha ? (
                            <div className="best-secao-vazia">{lang === 'en' ? 'Loading…' : 'Carregando…'}</div>
                          ) : SECOES_DA_FICHA(row)
                            /* SEÇÃO VAZIA NÃO APARECE (17/09/2026): "se a
                               criatura não possui magia ou equipamentos, não
                               precisa mostrar o título e -". Chegou a mostrar
                               o subtítulo com um travessão, por causa de como
                               o exemplo foi escrito; o usuário viu na tela e
                               preferiu sem. Vale para qualquer seção — a
                               Águia perde Equipamentos e Magias, um dragão sem
                               técnica perderia Técnicas de Combate. As três
                               primeiras nunca somem: sempre têm cards. */
                            .filter((s) => s.cards.length > 0)
                            .map((s) => (
                            <div className="best-secao" key={s.titulo}>
                              <h4 className="best-secao-titulo">{s.titulo}</h4>
                              <div className="best-detail-stats">
                                {s.cards.map((c, i) => (
                                  <div className="best-stat" key={c.label + '_' + i}>
                                    {/* O tooltip mora no RÓTULO, que é o que
                                        pede explicação — e é o padrão do
                                        projeto (useBestTip, nunca o `title`
                                        nativo: ver tooltip-padrao.test.js).
                                        `data-tip` deixa o texto legível ao
                                        teste sem abrir o tooltip. */}
                                    <span className="best-stat-lbl"
                                      data-tip={c.tip || c.label}
                                      onMouseEnter={(e) => mostrarTipStat(e, c.tip || c.label)}
                                      onMouseLeave={esconderTipStat}>{c.label}</span>
                                    {/* Ícone no lugar do texto (classe,
                                        elemento). A palavra vai no aria-label
                                        porque o tooltip não é anunciado por
                                        leitor de tela: sem ele, "Classe" ficaria
                                        com valor vazio para quem não vê o
                                        glifo. */}
                                    <span className="best-stat-val"
                                      aria-label={c.icone ? (c.val == null ? undefined : String(c.val)) : undefined}>
                                      {c.icone
                                        ? <i className={'ti ' + c.icone} aria-hidden="true" />
                                        : fmt(c.val)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </TableCell></TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <BestPagination page={page} safePage={safePage} totalPages={totalPages} setPage={setPage} setExpandida={setExpandida} lang={lang} />
        </>
      )}
    </div>
    {editando !== undefined && (
      <CatalogoEditor
        tabela="criaturas"
        linha={editando}
        lang={lang}
        onSalvo={() => { setEditando(undefined); carregarCriaturas(); }}
        onExcluido={() => { setEditando(undefined); setExpandida(null); carregarCriaturas(); }}
        onCancel={() => setEditando(undefined)}
      />
    )}
    {/* O modal do olho vem de 13-diario: é o MESMO que as tabelas de NPCs e
        Lugares abrem, e "quem pode ver" tem uma regra só (as colunas
        historias.<tipo>_ids + lore_acesso_pj, ver visibilidadeDaEntrada). Uma
        segunda cópia aqui é como as duas começariam a discordar. */}
    {permissaoDe && historia && (
      <PermissaoEntradaModal
        entrada={{ id: permissaoDe.id, tipo: 'criatura', nome: permissaoDe.nome }}
        historia={historia}
        protagonistas={protagonistas}
        lang={lang}
        salvando={salvandoVis}
        onClose={() => setPermissaoDe(null)}
        onSalvar={salvarVisibilidade}
      />
    )}
    <BestTip tip={tipStat} />
    </div>
  );
}

/* GAME_DATA + helpers de cálculo → src/01-core/game-data.jsx */

/* ============================================================
   BESTIÁRIO — 4 listas migradas pro kit (Pedra & Bronze)
   ============================================================
   Substitui em src/09-bestiario/bestiario.jsx o trecho que vai de
   `function MagiasList({` (logo após a CriaturasList) até o fim de
   `function ItensList`, ou seja as 4 funções + os banners entre elas.
   NÃO mexer no Object.assign(window, {...}) do fim do arquivo.

   PRÉ-REQUISITO: setup do kit (UI global do ui-bridge). Sem ele, cada
   lista mostra um aviso amigável em vez de quebrar.

   Mesmo molde da CriaturasList: helpers compartilhados (badgeStyle,
   BestPagination, BestLoading/BestErrorBox/BestNoKit; CSS no index.css) e
   render em UI.Table / UI.Input / UI.Badge re-skin pros tokens.
   Lógica 100% preservada (fetches, filtros, paginação, expandir,
   preço como número (valor_latao), campos de equipamento condicionais).
   ============================================================ */

// ---------- Helpers compartilhados das listas ----------
const badgeStyle = { background: '#F5ECD4', color: '#8A6B12', border: '1px solid #D8CCB4', fontWeight: 700 };

function BestNoKit() {
  return <div style={{ padding: 24, color: '#9C8F73', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 14, lineHeight: 1.5 }}>Componentes do kit não carregados. Confira o <code>src/components/ui-bridge.ts</code> e o import dele no <code>main.tsx</code>.</div>;
}
function BestLoading({ lang }) {
  return <Carregando lang={lang} />;
}
function BestErrorBox({ error, hint }) {
  return (
    <div style={{ border: '1px solid rgba(200,33,44,0.4)', background: 'rgba(200,33,44,0.10)', borderRadius: 6, padding: '16px 18px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <div style={{ color: '#F0A6A0', fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{error}</div>
      <div style={{ color: '#9C8F73', fontSize: 13, lineHeight: 1.5 }}>{hint}</div>
    </div>
  );
}
function BestPagination({ page, safePage, totalPages, setPage, setExpandida, lang }) {
  const [tip, abrirTip, fecharTip, manterTip] = useTooltip(60);
  const items = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
    .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…'); acc.push(p); return acc; }, []);
  const close = () => setExpandida && setExpandida(null);
  return (
    <div className="best-pag">
      <button className="best-page-btn" onClick={() => { setPage((p) => Math.max(1, p - 1)); close(); }} disabled={safePage === 1} {...propsTip(abrirTip, fecharTip, lang === 'en' ? 'Previous' : 'Anterior')}>‹</button>
      {items.map((p, idx) => p === '…'
        ? <span key={`ell-${idx}`} className="best-page-ellipsis">…</span>
        : <button key={p} className={'best-page-btn' + (p === safePage ? ' is-active' : '')} onClick={() => { setPage(p); close(); }}>{p}</button>)}
      <button className="best-page-btn" onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); close(); }} disabled={safePage === totalPages} {...propsTip(abrirTip, fecharTip, lang === 'en' ? 'Next' : 'Próxima')}>›</button>
      <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </div>
  );
}

/* ── Auditoria das magias DE CRIATURA (painel do admin) ────────────
   Fecha o furo que a auditoria de `magias` não alcança: renomear uma magia.

   `personagens.magias` referencia por `key` e sobrevive a um rename;
   `criaturas.magia` referencia por NOME, em texto livre. Trocar o nome de
   "Piromanipulação" quebra, em silêncio, as dez criaturas que a citam — e
   `nome` parece conteúdo editável, não identidade.

   Carrega o catálogo de magias SÓ ao abrir: fechado, não custa consulta. */
function CriaturasAuditoriaPainel({ criaturas, lang }) {
  const [aberto, setAberto] = React.useState(false);
  const [magias, setMagias] = React.useState(null);
  const en = lang === 'en';

  React.useEffect(() => {
    if (!aberto || magias !== null) return;
    let vivo = true;
    (async () => {
      const { data } = await supabaseClient.from('magias').select('key,nome');
      if (vivo) setMagias(data || []);
    })();
    return () => { vivo = false; };
  }, [aberto, magias]);

  const r = React.useMemo(
    () => ((magias && typeof auditarCriaturas === 'function')
      ? auditarCriaturas(criaturas || [], magias) : null),
    [criaturas, magias]
  );

  const s = r ? resumoAuditoriaCriaturas(r) : null;
  const temProblema = !!s && (s.nome_orfao > 0 || s.sem_nivel > 0);

  return (
    <BestPainelModal lang={lang}
      rotulo={en ? 'Check' : 'Verificação'}
      titulo={en ? 'Creature spells check' : 'Verificação das magias de criatura'}
      alerta={temProblema} aberto={aberto}
      onAbrir={() => setAberto(true)} onFechar={() => setAberto(false)}>
        <div className="best-aud-corpo">
          {s && (
            <p className="best-aud-resumo">
              {temProblema
                ? (en ? `${s.nome_orfao} unknown name(s)` : `${s.nome_orfao} nome(s) sem correspondência`)
                : (en ? `${s.ok} casting correctly` : `${s.ok} conjurando corretamente`)}
            </p>
          )}
          {!r ? (
            <p className="best-aud-ajuda">{en ? 'Loading…' : 'Consultando…'}</p>
          ) : (
            <>
              <p className="best-aud-ajuda">
                {en
                  ? 'Creatures reference spells by NAME, not key. Renaming a spell silently breaks every creature that cites it.'
                  : 'Criaturas referenciam magia por NOME, não por chave. Renomear uma magia quebra, em silêncio, toda criatura que a cita.'}
              </p>

              {r.nome_orfao.length > 0 && (
                <div className="best-aud-secao">
                  <div className="best-aud-titulo">
                    {en ? '⚠ Unknown spell name' : '⚠ Nome de magia que não existe'} · {r.nome_orfao.length}
                  </div>
                  <ul className="best-aud-lista">
                    {r.nome_orfao.map((x) => (
                      <li key={x.id}><strong>{x.nome}</strong>
                        <span className="best-aud-det"> — {x.nomes.join(', ')}</span></li>
                    ))}
                  </ul>
                </div>
              )}

              {r.sem_nivel.length > 0 && (
                <div className="best-aud-secao">
                  <div className="best-aud-titulo">
                    {en ? '⚠ No stage (spell level comes from it)' : '⚠ Sem estágio (o nível da magia vem dele)'} · {r.sem_nivel.length}
                  </div>
                  <ul className="best-aud-lista">
                    {r.sem_nivel.map((x) => (
                      <li key={x.id}><strong>{x.nome}</strong>
                        <span className="best-aud-det"> — {en ? 'falls back to level 1' : 'cai no nível 1'}</span></li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="best-aud-rodape">
                {en
                  ? `${s.ok} cast with effect · ${s.so_narrativa} narrative only · ${s.total} with spells`
                  : `${s.ok} conjuram com efeito · ${s.so_narrativa} só narrativas · ${s.total} com magia`}
              </p>
            </>
          )}
        </div>
    </BestPainelModal>
  );
}

/* ── Auditoria do catálogo de magias (painel do admin) ─────────────
   O motor de combate lê o EFEITO das magias do texto dos níveis (o número) e
   a SEMÂNTICA de um registro em código (a unidade, o alvo, o sinal). Mudar o
   número no catálogo muda o efeito sozinho — é assim de propósito, para
   equilibrar magia ser trabalho de banco e não de código.

   O que NÃO se resolve sozinho é mudar a FORMA: trocar "coluna de ataque" por
   "defesa" faz o registro apontar para uma unidade que o texto não tem mais,
   e a magia vira um efeito de zero, em silêncio.

   Existe um teste que trava esse acordo, mas ele compara o registro contra
   cópias do texto coladas no próprio teste: pega mudança no CÓDIGO, não no
   BANCO. Este painel fecha essa lacuna — roda a mesma leitura do motor contra
   o catálogo que está no ar, agora.

   Fechado por padrão: é ferramenta de manutenção, não de consulta diária. */
/* ── ESTATÍSTICAS DO CATÁLOGO (12/09/2026) ─────────────────────────
   "Na página de conferência, informa uma estatística de magias. Quantas
   magias para cada profissão, magias de suporte, de ataque, etc." (usuário)

   Mora dentro da conferência porque responde a pergunta vizinha: a
   verificação diz se o motor LÊ o catálogo; isto diz se o catálogo está
   EQUILIBRADO. A conta é estatisticasMagias (01-core), com as mesmas regras
   de profissão, raridade e função que o resto do sistema já usa. */
function MagiasEstatisticas({ magias, lang }) {
  const en = lang === 'en';
  const e = React.useMemo(
    () => (typeof estatisticasMagias === 'function' ? estatisticasMagias(magias || []) : null),
    [magias]
  );
  if (!e || !e.total) return null;
  const F = FUNCAO_DA_MAGIA;
  const rot = (f) => (F[f] ? (en ? F[f].en : F[f].pt) : f);
  const FUNCOES_MOTOR = ['ataque', 'controle', 'suporte', 'cura', 'protecao'];
  const FORA = ['decisao', 'sistema', 'narrativa', 'ritual', 'invocado'];
  const pct = (n) => (e.total ? Math.round((n / e.total) * 100) : 0);
  const ROTULO_ELEMENTO = {
    fogo: { pt: 'Fogo', en: 'Fire' }, terra: { pt: 'Terra', en: 'Earth' },
    agua: { pt: 'Água', en: 'Water' }, ar: { pt: 'Ar', en: 'Air' },
    celestial: { pt: 'Celestial', en: 'Celestial' }, infernal: { pt: 'Infernal', en: 'Infernal' },
    sem_elemento: { pt: 'Sem elemento (dano base)', en: 'No element (base damage)' },
    qualquer: { pt: 'Qualquer elemento', en: 'Any element' },
  };

  const Chips = ({ titulo, itens }) => (
    <div className="best-est-grupo">
      <div className="best-est-grupo-tit">{titulo}</div>
      <div className="best-est-chips">
        {itens.filter(([, n]) => n > 0).map(([rotulo, n]) => (
          <span key={rotulo} className="best-est-chip">
            {rotulo} <strong>{n}</strong> <span className="best-est-pct">{pct(n)}%</span>
          </span>
        ))}
      </div>
    </div>
  );

  // Profissões que não conjuram (Guerreiro, Ladino) só poluem a tabela.
  const profs = Object.entries(e.porProfissao).filter(([, p]) => p.total > 0)
    .sort((a, b) => b[1].total - a[1].total);
  const espsPorProf = {};
  Object.entries(e.porEspecializacao).forEach(([esp, v]) => {
    (espsPorProf[v.profissao] = espsPorProf[v.profissao] || []).push([esp, v.total]);
  });

  return (
    <div className="best-aud-secao best-est">
      {/* Classe própria, não best-aud-titulo: a estatística não é um grupo de
          pendência, e a ordem dos grupos ("pronta para entrar" primeiro) é regra. */}
      <div className="best-est-titulo">{en ? 'Catalog statistics' : 'Estatísticas do catálogo'} · {e.total}</div>

      <Chips titulo={en ? 'By role (engine)' : 'Por função (no motor)'}
        itens={FUNCOES_MOTOR.map((f) => [rot(f), e.porFuncao[f] || 0])} />
      <Chips titulo={en ? 'Off the engine' : 'Fora do motor'}
        itens={FORA.map((f) => [rot(f), e.porFuncao[f] || 0])} />
      <Chips titulo={en ? 'Rarity' : 'Raridade'}
        itens={Object.entries(e.porRaridade).map(([t, n]) => [
          t === 'Básica' ? (en ? 'Basic (buyable)' : 'Básica (comprável)')
            : t === '—' ? (en ? 'No type' : 'Sem tipo') : `${t} (${en ? 'special item' : 'item especial'})`, n])} />
      <Chips titulo={en ? 'Casting' : 'Evocação'}
        itens={[[en ? 'Instant' : 'Instantânea', e.porEvocacao.instantanea],
                [en ? 'Channeled (rounds)' : 'Canalizada (rodadas)', e.porEvocacao.canalizada],
                [en ? 'Ritual / long' : 'Ritual / longa', e.porEvocacao.ritual]]} />
      <Chips titulo={en ? 'Duration (level 1)' : 'Duração (nível 1)'}
        itens={[[en ? 'Instant' : 'Instantânea', e.porDuracao.instantanea],
                [en ? 'Rounds' : 'Rodadas', e.porDuracao.rodadas],
                [en ? 'Calendar' : 'Calendário', e.porDuracao.calendario],
                [en ? 'Permanent' : 'Permanente', e.porDuracao.permanente]]} />

      <div className="best-est-grupo-tit">{en ? 'By profession' : 'Por profissão'}</div>
      <div className="best-est-tabela-wrap">
        <table className="best-est-tabela best-est-profissoes">
          <thead>
            <tr>
              <th>{en ? 'Profession' : 'Profissão'}</th>
              <th>Total</th>
              <th>{en ? 'Basic' : 'Básicas'}</th>
              <th>{en ? 'Advanced' : 'Avançadas'}</th>
              <th>{en ? 'Buyable' : 'Compráveis'}</th>
              <th>{en ? 'Locked' : 'Travadas'}</th>
              <th>{en ? 'In engine' : 'No motor'}</th>
              {FUNCOES_MOTOR.map((f) => <th key={f}>{rot(f)}</th>)}
              <th>{en ? 'Off engine' : 'Fora do motor'}</th>
            </tr>
          </thead>
          <tbody>
            {profs.map(([nome, p]) => (
              <tr key={nome}>
                <td className="best-est-nome">{nome}</td>
                <td><strong>{p.total}</strong></td>
                <td>{p.basicas}</td>
                <td>{p.avancadas}</td>
                <td>{p.compraveis}</td>
                <td>{p.travadas}</td>
                <td>{p.noMotor}</td>
                {FUNCOES_MOTOR.map((f) => (
                  <td key={f} className={p.funcoes[f] === 0 ? 'best-est-zero' : ''}>{p.funcoes[f]}</td>
                ))}
                <td>{FORA.reduce((s, f) => s + (p.funcoes[f] || 0), 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Legenda em texto, não tooltip nativo: o projeto não usa `title` (ver
          tooltip-padrao.test.js), e estas definições são o que torna a tabela legível. */}
      <p className="best-aud-ajuda best-est-legenda">
        {en
          ? 'Total: reachable by the profession or one of its specializations. Basic: every member reaches. Advanced: only through a specialization. Locked: Lost or Ancestral, needs a special item. In orange: a role with no spell.'
          : 'Total: alcançáveis pela profissão ou por uma especialização dela. Básicas: todo membro alcança. Avançadas: só por especialização. Travadas: Perdida ou Ancestral, dependem de item especial. Em laranja: função sem nenhuma magia.'}
      </p>

      {/* POR ELEMENTO: "quero magias de proteção e dano por elemento" (usuário).
          Só o que o motor aplica; zero em laranja é o elemento sem cobertura. */}
      <div className="best-est-grupo-tit">{en ? 'By element (engine)' : 'Por elemento (no motor)'}</div>
      <div className="best-est-tabela-wrap">
        <table className="best-est-tabela best-est-elementos">
          <thead><tr>
            <th>{en ? 'Element' : 'Elemento'}</th>
            <th>{en ? 'Damage' : 'Dano'}</th>
            <th>{en ? 'Protection' : 'Proteção'}</th>
          </tr></thead>
          <tbody>
            {Object.entries(e.porElemento).map(([el, v]) => (
              <tr key={el}>
                <td className="best-est-nome">{ROTULO_ELEMENTO[el] ? (en ? ROTULO_ELEMENTO[el].en : ROTULO_ELEMENTO[el].pt) : el}</td>
                <td className={v.dano === 0 && el !== 'qualquer' ? 'best-est-zero' : ''}>{v.dano}</td>
                <td className={v.protecao === 0 && el !== 'sem_elemento' ? 'best-est-zero' : ''}>{v.protecao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="best-est-grupo-tit">{en ? 'By specialization' : 'Por especialização'}</div>
      <ul className="best-aud-lista best-est-esps">
        {profs.map(([nome]) => (espsPorProf[nome] || []).length > 0 && (
          <li key={nome}><strong>{nome}</strong>
            <span className="best-aud-det"> — {(espsPorProf[nome] || [])
              .sort((a, b) => b[1] - a[1]).map(([esp, n]) => `${esp} ${n}`).join(' · ')}</span>
          </li>
        ))}
      </ul>

      {(e.semPermissao.length > 0 || Object.keys(e.permissaoDesconhecida).length > 0) && (
        <>
          <div className="best-est-grupo-tit">{en ? 'Nobody can buy' : 'Ninguém consegue comprar'}</div>
          <ul className="best-aud-lista">
            {e.semPermissao.length > 0 && (
              <li><strong>{en ? 'No permission' : 'Sem permissão'}</strong>
                <span className="best-aud-det"> — {e.semPermissao.join(', ')}</span></li>
            )}
            {Object.entries(e.permissaoDesconhecida).map(([nome, mags]) => (
              <li key={nome}><strong>{en ? `Unknown "${nome}"` : `"${nome}" não é profissão nem especialização`}</strong>
                <span className="best-aud-det"> — {mags.join(', ')}</span></li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/* "Conferir novamente" + a hora da última conferência, no topo da janela da
   Verificação (magias e técnicas). Era um <span role="button"> dentro da faixa
   — botão aninhado em botão é HTML inválido; na janela voltou a ser <button>. */
function BotaoReconferir({ en, onRecarregar, recarregando, conferidoEm, onClick }) {
  if (!onRecarregar) return null;
  return (
    <span className="best-aud-reconferir">
      {conferidoEm && !recarregando && (
        <span className="best-aud-hora">
          {(en ? 'checked at ' : 'conferido às ')}
          {conferidoEm.toLocaleTimeString(en ? 'en-US' : 'pt-BR',
            { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      )}
      <button type="button" className="btn-ghost btn-sm best-aud-recarregar"
        aria-label={en ? 'Check again' : 'Conferir novamente'} onClick={onClick}>
        <i className={'ti ' + (recarregando ? 'ti-loader' : 'ti-refresh')} aria-hidden="true" />
        {recarregando
          ? (en ? 'Checking…' : 'Conferindo…')
          : (en ? 'Check again' : 'Conferir novamente')}
      </button>
    </span>
  );
}

function MagiasAuditoriaPainel({ magias, lang, onRecarregar }) {
  const [aberto, setAberto] = React.useState(false);
  const [recarregando, setRecarregando] = React.useState(false);
  const en = lang === 'en';

  /* BOTÃO DE RECONFERIR.

     A verificação recalcula sozinha quando a magia é salva pelo editor, mas
     NÃO quando o catálogo muda por fora — outro admin, ou SQL direto. A
     resposta que eu tinha dado para esse caso era "aperte F5", que é resposta
     ruim: obriga a recarregar a tela inteira e perder a posição na lista.

     O botão busca o catálogo de novo e o painel recalcula. `recarregando`
     existe só para o clique ter retorno visível — a consulta é rápida, mas
     sem ele o botão parece morto. */
  /* A HORA da última conferência.

     Sem ela, um clique que não muda nada na lista é indistinguível de um
     clique que não funcionou — foi exatamente a dúvida do usuário. A hora
     muda sempre, então o botão sempre prova que rodou. */
  const [conferidoEm, setConferidoEm] = React.useState(null);

  const reconferir = async (e) => {
    if (e) e.stopPropagation();
    if (!onRecarregar || recarregando) return;
    setRecarregando(true);
    try { await onRecarregar(); setConferidoEm(new Date()); }
    finally { setRecarregando(false); }
  };

  const r = React.useMemo(
    () => (typeof auditarMagias === 'function' ? auditarMagias(magias || []) : null),
    [magias]
  );
  // Tamanho do registro DESTE bundle — a identidade do motor carregado.
  const noMotor = (typeof MAGIA_EFEITO_MAP === 'object' && MAGIA_EFEITO_MAP)
    ? Object.keys(MAGIA_EFEITO_MAP).length : 0;
  if (!r) return null;
  const s = resumoAuditoria(r);
  // Quebrada é o único estado que exige ação imediata: a magia está no motor
  // e parou de funcionar. Ambígua é aviso; órfã é oportunidade.
  const temProblema = s.quebrada > 0 || s.ambigua > 0;

  const Secao = ({ titulo, itens, detalhe }) => (
    itens.length === 0 ? null : (
      <div className="best-aud-secao">
        <div className="best-aud-titulo">{titulo} · {itens.length}</div>
        <ul className="best-aud-lista">
          {itens.map((x) => (
            <li key={x.key}><strong>{x.nome}</strong>{detalhe ? detalhe(x) : null}</li>
          ))}
        </ul>
      </div>
    )
  );

  return (
    <BestPainelModal lang={lang}
      rotulo={en ? 'Check' : 'Verificação'}
      titulo={en ? 'Catalog check' : 'Verificação do catálogo'}
      alerta={temProblema} aberto={aberto}
      onAbrir={() => setAberto(true)} onFechar={() => setAberto(false)}
      acoesTopo={<BotaoReconferir en={en} onRecarregar={onRecarregar} recarregando={recarregando}
        conferidoEm={conferidoEm} onClick={reconferir} />}>
        <div className="best-aud-corpo">
          <p className="best-aud-resumo">
            {temProblema
              ? (en ? `${s.quebrada} broken · ${s.ambigua} ambiguous` : `${s.quebrada} quebrada(s) · ${s.ambigua} ambígua(s)`)
              : (en ? `${s.ok} read correctly` : `${s.ok} lidas corretamente`)}
            {' · '}
            {en ? `${s.orfa} unmapped` : `${s.orfa} sem registro`}
          </p>
          <p className="best-aud-ajuda">
            {en
              ? 'Numbers in the level text drive the effect — edit them freely. Changing WHICH unit a spell affects needs a code change.'
              : 'O número no texto do nível governa o efeito — pode editar à vontade. Trocar QUAL unidade a magia afeta exige mudança no código.'}
          </p>
          {/* AS DUAS METADES DA VERIFICAÇÃO, ditas em voz alta.

              O usuário corrigiu o texto de duas magias, eu as liguei no motor,
              ele clicou em "Conferir novamente" e as duas continuaram na lista
              — porque o botão rebusca o CATÁLOGO e o motor veio no JS que o
              navegador já tinha carregado. A confusão é legítima: nada na tela
              dizia que eram duas coisas com prazos diferentes.

              O número de magias registradas é o jeito mais curto de saber qual
              motor está no ar: se eu digo "liguei duas" e aqui ainda aparece o
              número velho, falta recarregar a página. */}
          <p className="best-aud-ajuda best-aud-motor">
            {en
              ? <>Engine loaded in this browser: <strong>{noMotor} spells</strong> registered. The button below re-fetches the CATALOG; a new engine (a spell I just wired up) only arrives when the page reloads.</>
              : <>Motor carregado neste navegador: <strong>{noMotor} magias</strong> registradas. O botão rebusca o CATÁLOGO; motor novo — magia que eu acabei de ligar — só chega recarregando a página.</>}
          </p>

          <MagiasEstatisticas magias={magias} lang={lang} />

          <Secao
            titulo={en ? '⚠ Broken — in the engine but no longer readable' : '⚠ Quebradas — estão no motor e pararam de ser lidas'}
            itens={r.quebrada}
            detalhe={(x) => <span className="best-aud-det"> — {en ? 'missing' : 'falta'}: {x.faltando.join(', ')}</span>}
          />
          <Secao
            titulo={en ? '⚠ Ambiguous — the reader found something odd' : '⚠ Ambíguas — o leitor achou algo estranho'}
            itens={r.ambigua}
            detalhe={(x) => (
              <span className="best-aud-det"> — {x.avisos.map((a) => (
                a.tipo === 'sobrescrita'
                  ? (en ? `"${a.campo}" written twice (${a.de}→${a.para})` : `"${a.campo}" escrito duas vezes (${a.de}→${a.para})`)
                  : (en ? `unknown unit near "${a.trecho}"` : `unidade desconhecida perto de "${a.trecho}"`)
              )).join('; ')}</span>
            )}
          />
          {/* Fora do motor, AGRUPADO POR MOTIVO.

              A versão anterior só listava os nomes, e o usuário perguntou —
              com razão — "qual é a dificuldade com a magia Heroísmo?". A
              resposta era "nenhuma, eu só não a liguei". O painel não tinha
              como dizer isso, e por isso a lista era inútil: nenhum item
              indicava o que fazer com ele.

              Agora cada magia carrega a classe e o motivo, de
              MAGIA_FORA_DO_REGISTRO. A classe SEM motivo registrado fica por
              último e é a que vale perguntar. */}
          {r.orfa.length > 0 && (() => {
            const CLASSES = [
              /* 'resolvido' vem PRIMEIRO e é o único acionável: a pendência já
                 foi sanada no texto e a magia só espera ser ligada. Sem este
                 grupo, corrigir a magia não mudava nada na tela — foi o que
                 aconteceu com Auxílio Natural. */
              { id: 'resolvido', pt: '✓ Pronta para entrar — me avise para ligar',
                                 en: '✓ Ready to wire up — let me know' },
              { id: 'decisao',  pt: 'Falta uma decisão sua — o motor daria conta',
                                en: 'Needs a rules decision — the engine could handle it' },
              { id: 'sistema',  pt: 'Falta um sistema que o combate não tem',
                                en: 'Needs a subsystem combat does not have' },
              { id: 'invocado', pt: 'Os números são a ficha de um invocado',
                                en: 'The numbers are a summoned creature sheet' },
              /* 'narrativa' entrou em 12/09/2026 com a varredura das magias que
                 nenhum personagem conhecia: sem número nenhum no texto, o Mestre
                 resolve na mesa. Aparecer aqui, com o motivo, é o que diz que
                 a magia FOI lida — e não esquecida no rodapé. */
              { id: 'narrativa', pt: 'Narrativa — o Mestre resolve na mesa',
                                 en: 'Narrative — the GM resolves it at the table' },
              { id: 'ritual',   pt: 'Ritual ou fora de combate — nada a fazer',
                                en: 'Ritual or out of combat — nothing to do' },
              { id: null,       pt: 'Sem motivo registrado — vale perguntar',
                                en: 'No reason on file — worth asking' },
            ];
            /* Passa a LINHA da magia, não só a chave: é ela que o predicado
               `resolvido` inspeciona para saber se o texto deixou de ser
               ambíguo. `x.magia` vem de auditarMagias. */
            const motivoDe = (x) => (typeof motivoForaDoRegistro === 'function'
              ? motivoForaDoRegistro(x.magia || x.key) : null);
            return CLASSES.map((c) => {
              const itens = r.orfa.filter((x) => {
                const m = motivoDe(x);
                return c.id ? (m && m.classe === c.id) : !m;
              });
              if (!itens.length) return null;
              return (
                <div className="best-aud-secao" key={c.id || 'sem'}>
                  <div className="best-aud-titulo">{en ? c.en : c.pt} · {itens.length}</div>
                  <ul className="best-aud-lista">
                    {itens.map((x) => {
                      const m = motivoDe(x);
                      return (
                        <li key={x.key}><strong>{x.nome}</strong>
                          <span className="best-aud-det"> — {m ? m.motivo
                            : (en ? `reads ${x.unidades.join(', ')}` : `lê ${x.unidades.join(', ')}`)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            });
          })()}

          <p className="best-aud-rodape">
            {en
              ? `${s.ok} mapped and consistent · ${s.narrativa} narrative (nothing to do) · ${s.total} total`
              : `${s.ok} no motor e consistentes · ${s.narrativa} narrativas (nada a fazer) · ${s.total} no total`}
          </p>
        </div>
    </BestPainelModal>
  );
}

/* ============================== [18] MagiasList — Mestre vê todas as magias do banco; jogador só as compradas ============================== */
function MagiasList({ ac, lang, modoJogador }) {
  const { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } = (typeof UI !== 'undefined' ? UI : {});
  const [magias, setMagias] = useState(null);
  const { sorted: magiasSorted, sortKey, sortDir, toggleSort } = useSort(magias);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [expandida, setExpandida] = useState(null);
  const [page, setPage] = useState(1);
  const wrapRef = React.useRef(null);
  const PAGE_SIZE = useFitPageSize(wrapRef);
  const ehAdmin = useEhAdmin();
  const [editando, setEditando] = useState(undefined); // undefined=fechado, null=criando, objeto=editando
  const { carregando: carregandoConhecido, conhecido } = useConhecidoDoJogador(modoJogador);

  // Extraído SEM mudar comportamento (ver comentário equivalente em CriaturasList).
  const carregarMagias = async (cancelRef) => {
    const { data, error } = await supabaseClient.from('magias').select('*').order('nome', { ascending: true });
    if (cancelRef && cancelRef.atual) return;
    if (error) { setError(error.message); setMagias([]); } else { setMagias(data || []); }
  };

  useEffect(() => {
    const cancelRef = { atual: false };
    carregarMagias(cancelRef);
    return () => { cancelRef.atual = true; };
  }, []);
  useEffect(() => { setPage(1); setExpandida(null); }, [query]);

  if (!Table) return <BestNoKit />;
  if (magias === null) return <BestLoading lang={lang} />;
  if (error) return <BestErrorBox error={error} hint={lang === 'en' ? "Make sure the 'magias' table exists in Supabase." : "Confira se a tabela 'magias' existe no Supabase."} />;
  if (modoJogador && carregandoConhecido) return <BestLoading lang={lang} />;

  const q = query.trim().toLowerCase();
  let filtered = (magiasSorted || []).filter((m) => {
    if (q && !(m.nome || '').toLowerCase().includes(q)) return false;
    return true;
  });
  if (modoJogador) filtered = filtered.filter((m) => conhecido.magias.has(m.key));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="fp-page">
    <div className="fp-card best best-auto">
      <BestPageHeader eyebrow={lang === 'en' ? 'BESTIARY' : 'BESTIÁRIO'} title={lang === 'en' ? 'Spells' : 'Magias'}
        right={<BestBuscaENovo ac={ac} query={query} setQuery={setQuery}
          placeholder={lang === 'en' ? 'Search spell…' : 'Buscar magia…'}
          podeCriar={ehAdmin} onNovo={() => setEditando(null)}
          dicaNovo={lang === 'en' ? 'New spell' : 'Nova magia'}
          /* Verificação do catálogo, Sugestões e Estudo — só admin. A
             verificação responde a pergunta de manutenção: "editei o texto de
             uma magia; o motor de combate ainda entende?" Mora AQUI, ao lado do
             editor, porque é aqui que o texto é editado — e porque a tabela
             `magias` exige autenticação que esta tela já tem. Sugestões e
             Estudo têm nome global com guarda: o arquivo carrega depois deste
             em main.tsx. */
          ferramentas={ehAdmin && (<>
            <MagiasAuditoriaPainel magias={magias} lang={lang} onRecarregar={carregarMagias} />
            {typeof MagiasSugestoesPainel === 'function' && <MagiasSugestoesPainel lang={lang} />}
            {typeof EstudoMagiasPainel === 'function' && <EstudoMagiasPainel lang={lang} />}
          </>)} />} />

      {filtered.length === 0 ? (
        <div className="best-empty">{textoListaVazia({ query, modoJogador: modoJogador, lang, oQue: 'magias', oQueEn: 'spell' })}</div>
      ) : (
        <>
          <div className="best-table-wrap" ref={wrapRef}>
            <Table>
              <TableHeader><TableRow>
                <SortHead col='nome' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Name' : 'Nome'}</SortHead>
                <SortHead col='tipo' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Type' : 'Tipo'}</SortHead>
                <SortHead col='evocacao' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Evocation' : 'Evocação'}</SortHead>
                <SortHead col='alcance' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Range' : 'Alcance'}</SortHead>
                <SortHead col='duracao' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Duration' : 'Duração'}</SortHead>
                <SortHead col='custo' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Cost' : 'Custo'}</SortHead>
                {ehAdmin && <TableHead style={{ width: 40 }} />}
              </TableRow></TableHeader>
              <TableBody>
                {pageSlice.map((m) => {
                  const isOpen = expandida === m.key;
                  return (
                    <React.Fragment key={m.id}>
                      <TableRow className={isOpen ? 'on' : ''} style={{ cursor: 'pointer' }} onClick={() => setExpandida(isOpen ? null : m.key)}>
                        <TableCell className="best-name"><span className="best-chevron" style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</span>{m.nome}</TableCell>
                        <TableCell>{m.tipo || '—'}</TableCell>
                        <TableCell>{m.evocacao || '—'}</TableCell>
                        <TableCell>{m.alcance || '—'}</TableCell>
                        <TableCell>{m.duracao || '—'}</TableCell>
                        <TableCell className="best-cost">{m.custo}</TableCell>
                        {ehAdmin && <TableCell><BestBotaoEditar ac={ac} onClick={() => setEditando(m)} /></TableCell>}
                      </TableRow>
                      {isOpen && (() => {
                        // Modo jogador: só os níveis que ele COMPROU (spec §3 "só os níveis
                        // comprados") — interseção entre "nível que existe" (m.nivel_N
                        // preenchido) e "nível que o passos comprados alcança"
                        // (NIVEIS_MAGIA.slice(0, passos), passosDisponiveisMagia já garante
                        // que o corte respeita buraco no texto — ver 01-core/game-data.jsx).
                        const niveisPermitidos = modoJogador
                          ? new Set(NIVEIS_MAGIA.slice(0, conhecido.magias.get(m.key) || 0))
                          : null;
                        return (
                        <TableRow className="best-detail"><TableCell colSpan={6 + (ehAdmin ? 1 : 0)}>
                          {m.permissao && <div className="best-permissao">{m.permissao}</div>}
                          {m.descricao && <TextoDoBanco texto={m.descricao} className="best-desc" />}
                          <div className="best-niveis">
                            {[{ n: 1, t: m.nivel_1 }, { n: 3, t: m.nivel_3 }, { n: 5, t: m.nivel_5 }, { n: 7, t: m.nivel_7 }, { n: 9, t: m.nivel_9 }]
                              .filter((x) => x.t)
                              .filter((x) => !niveisPermitidos || niveisPermitidos.has(x.n))
                              .map((x) => (
                              <div key={x.n} className="best-nivel"><span className="best-nivel-n">{x.n}</span><span className="best-nivel-t">{x.t}</span></div>
                            ))}
                          </div>
                        </TableCell></TableRow>
                        );
                      })()}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <BestPagination page={page} safePage={safePage} totalPages={totalPages} setPage={setPage} setExpandida={setExpandida} lang={lang} />
        </>
      )}
    </div>
    {editando !== undefined && (
      <CatalogoEditor
        tabela="magias"
        linha={editando}
        lang={lang}
        onSalvo={() => { setEditando(undefined); carregarMagias(); }}
        onCancel={() => setEditando(undefined)}
      />
    )}
    </div>
  );
}

/* ============================== [19] HabilidadesList — Mestre vê todas as habilidades (DB); jogador só as que tem ============================== */
function HabilidadesList({ ac, lang, modoJogador }) {
  const { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } = (typeof UI !== 'undefined' ? UI : {});
  const [habilidades, setHabilidades] = useState(null);
  const { sorted: habSorted, sortKey, sortDir, toggleSort } = useSort(habilidades);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [expandida, setExpandida] = useState(null);
  const [page, setPage] = useState(1);
  const wrapRef = React.useRef(null);
  const PAGE_SIZE = useFitPageSize(wrapRef);
  const ehAdmin = useEhAdmin();
  const [editando, setEditando] = useState(undefined); // undefined=fechado, null=criando, objeto=editando
  const { carregando: carregandoConhecido, conhecido } = useConhecidoDoJogador(modoJogador);

  // Extraído SEM mudar comportamento (ver comentário equivalente em CriaturasList).
  const carregarHabilidades = async (cancelRef) => {
    const { data, error } = await supabaseClient.from('habilidades').select('*').order('nome', { ascending: true });
    if (cancelRef && cancelRef.atual) return;
    if (error) { console.error('[habilidades] falha ao carregar:', error); setError(error.message); setHabilidades([]); } else { setHabilidades(data || []); }
  };

  useEffect(() => {
    const cancelRef = { atual: false };
    carregarHabilidades(cancelRef);
    return () => { cancelRef.atual = true; };
  }, []);
  useEffect(() => { setPage(1); setExpandida(null); }, [query]);

  if (!Table) return <BestNoKit />;
  if (habilidades === null) return <BestLoading lang={lang} />;
  if (error) return <BestErrorBox error={error} hint={lang === 'en' ? "Make sure the 'habilidades' table exists in Supabase." : "Confira se a tabela 'habilidades' existe no Supabase."} />;
  if (modoJogador && carregandoConhecido) return <BestLoading lang={lang} />;

  const todasHabilidades = habSorted || [];

  const q = query.trim().toLowerCase();
  let filtered = todasHabilidades.filter((h) => {
    if (q && !(h.nome || '').toLowerCase().includes(q)) return false;
    return true;
  });
  if (modoJogador) filtered = filtered.filter((h) => conhecido.habilidades.has(h.key));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="fp-page">
    <div className="fp-card best best-auto">
      <BestPageHeader eyebrow={lang === 'en' ? 'BESTIARY' : 'BESTIÁRIO'} title={lang === 'en' ? 'Skills' : 'Habilidades'}
        right={<BestBuscaENovo ac={ac} query={query} setQuery={setQuery}
          placeholder={lang === 'en' ? 'Search skill…' : 'Buscar habilidade…'}
          podeCriar={ehAdmin} onNovo={() => setEditando(null)}
          dicaNovo={lang === 'en' ? 'New skill' : 'Nova habilidade'} />} />

      {filtered.length === 0 ? (
        <div className="best-empty">{textoListaVazia({ query, modoJogador: modoJogador, lang, oQue: 'habilidades', oQueEn: 'skill' })}</div>
      ) : (
        <>
          <div className="best-table-wrap" ref={wrapRef}>
            <Table>
              <TableHeader><TableRow>
                <SortHead col='nome' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Name' : 'Nome'}</SortHead>
                <SortHead col='grupo' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Category' : 'Categoria'}</SortHead>
                <SortHead col='ajuste' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Attribute' : 'Atributo'}</SortHead>
                <SortHead col='vantagem' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Advantage' : 'Vantagem'}</SortHead>
                <SortHead col='desvantagem' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Disadvantage' : 'Desvantagem'}</SortHead>
                <SortHead col='custo' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Cost' : 'Custo'}</SortHead>
                {ehAdmin && <TableHead style={{ width: 40 }} />}
              </TableRow></TableHeader>
              <TableBody>
                {pageSlice.map((h) => {
                  const isOpen = expandida === h.key;
                  // Só a descrição: a restrição de uso saiu do detalhe em 14/09/2026
                  // (pedido do usuário). A coluna segue no banco e no editor.
                  const temDetalhe = !!h.descricao;
                  return (
                    <React.Fragment key={h.key}>
                      <TableRow className={isOpen ? 'on' : ''} style={temDetalhe ? { cursor: 'pointer' } : undefined} onClick={temDetalhe ? () => setExpandida(isOpen ? null : h.key) : undefined}>
                        <TableCell className="best-name">
                          {temDetalhe && <span className="best-chevron" style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</span>}
                          {h.nome}
                        </TableCell>
                        <TableCell>{h.grupo || '—'}</TableCell>
                        <TableCell>{ATRIBUTOS_LABEL[h.ajuste] || '—'}</TableCell>
                        <TableCell>{h.vantagem || '—'}</TableCell>
                        <TableCell>{h.desvantagem || '—'}</TableCell>
                        <TableCell className="best-cost">{h.custo}</TableCell>
                        {ehAdmin && <TableCell><BestBotaoEditar ac={ac} onClick={() => setEditando(h)} /></TableCell>}
                      </TableRow>
                      {isOpen && temDetalhe && (
                        <TableRow className="best-detail"><TableCell colSpan={6 + (ehAdmin ? 1 : 0)}>
                          {h.descricao && <TextoDoBanco texto={h.descricao} className="best-desc" />}
                        </TableCell></TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <BestPagination page={page} safePage={safePage} totalPages={totalPages} setPage={setPage} setExpandida={setExpandida} lang={lang} />
        </>
      )}
    </div>
    {editando !== undefined && (
      <CatalogoEditor
        tabela="habilidades"
        linha={editando}
        lang={lang}
        onSalvo={() => { setEditando(undefined); carregarHabilidades(); }}
        onCancel={() => setEditando(undefined)}
      />
    )}
    </div>
  );
}

/* ============================== [20] TecnicasList — Mestre vê todas as técnicas; jogador só as que tem ============================== */
/* ── Verificação do catálogo de TÉCNICAS (só admin) ────────────────
   Irmã do painel das magias, e existe pela mesma razão prática: a varredura
   de 12/09/2026 achou 8 técnicas fora do motor, e eu só as encontrei
   comparando catálogo e registro na mão. O Mestre não tinha instrumento.

   Mas a REGRA que ela verifica é o oposto da das magias, e o painel diz isso
   em voz alta:

     magia    o número mora no TEXTO. Editou, valeu na próxima conjuração.
     técnica  o número mora no CÓDIGO. Editar "por 2 rodadas" para "por 5"
              muda o que a tela promete e não muda o que o motor faz.

   Por isso o estado que importa aqui é DIVERGENTE — texto e motor contando
   histórias diferentes —, e não "ilegível". */
function TecnicasAuditoriaPainel({ tecnicas, lang, onRecarregar }) {
  const [aberto, setAberto] = React.useState(false);
  const [recarregando, setRecarregando] = React.useState(false);
  const [conferidoEm, setConferidoEm] = React.useState(null);
  const en = lang === 'en';

  const reconferir = async (e) => {
    if (e) e.stopPropagation();
    if (!onRecarregar || recarregando) return;
    setRecarregando(true);
    try { await onRecarregar(); setConferidoEm(new Date()); }
    finally { setRecarregando(false); }
  };

  const r = React.useMemo(
    () => (typeof auditarTecnicas === 'function' ? auditarTecnicas(tecnicas || []) : null),
    [tecnicas]
  );
  const noMotor = (typeof TECNICA_EFEITO_MAP === 'object' && TECNICA_EFEITO_MAP)
    ? Object.keys(TECNICA_EFEITO_MAP).length : 0;
  if (!r) return null;
  const s = resumoAuditoriaTecnicas(r);
  // Divergência é o único estado que exige ação: a tela está mentindo para o
  // jogador. Ficar de fora do motor é oportunidade, não erro.
  const temProblema = s.divergente > 0;

  const CLASSES = [
    { id: 'decisao',  pt: 'Falta uma decisão sua — o motor daria conta',
                      en: 'Needs a rules decision — the engine could handle it' },
    { id: 'sistema',  pt: 'Falta um sistema que o combate não tem',
                      en: 'Needs a system the engine lacks' },
    /* 'mestre' NÃO é pendência: é o desenho. A técnica rola o dado
       normalmente e o Mestre conduz o resultado na mesa — automatizar tiraria
       dele a decisão sobre o que o adversário faz. Vem depois das duas de
       cima justamente porque não pede nada de ninguém. */
    { id: 'mestre',   pt: 'O Mestre resolve na mesa — é assim de propósito',
                      en: 'The GM resolves it at the table — by design' },
    { id: null,       pt: 'Sem motivo registrado — vale perguntar',
                      en: 'No reason on file — worth asking' },
  ];

  return (
    <BestPainelModal lang={lang}
      rotulo={en ? 'Check' : 'Verificação'}
      titulo={en ? 'Catalog check' : 'Verificação do catálogo'}
      alerta={temProblema} aberto={aberto}
      onAbrir={() => setAberto(true)} onFechar={() => setAberto(false)}
      acoesTopo={<BotaoReconferir en={en} onRecarregar={onRecarregar} recarregando={recarregando}
        conferidoEm={conferidoEm} onClick={reconferir} />}>
        {/* O resumo "N em acordo com o motor · N fora do motor" e o aviso de que
            o número mora no código saíram em 15/09/2026, a pedido do usuário:
            técnica nova entra no motor, e a janela só lista o que pede ação. */}
        <div className="best-aud-corpo">
          <p className="best-aud-ajuda best-aud-motor">
            {en
              ? <>Engine loaded in this browser: <strong>{noMotor} techniques</strong> registered.</>
              : <>Motor carregado neste navegador: <strong>{noMotor} técnicas</strong> registradas.</>}
          </p>

          {r.divergente.length > 0 && (
            <div className="best-aud-secao">
              <div className="best-aud-titulo">
                {en ? '⚠ Text and engine disagree' : '⚠ Texto e motor discordam'} · {r.divergente.length}
              </div>
              <ul className="best-aud-lista">
                {r.divergente.map((x) => (
                  <li key={x.key}><strong>{x.nome}</strong>
                    <span className="best-aud-det"> — {x.avisos.map((a) => (
                      en ? `text says ${a.campo} ${a.texto}, engine uses ${a.motor}`
                         : `o texto diz ${a.campo} ${a.texto}, o motor usa ${a.motor}`
                    )).join('; ')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {r.fora.length > 0 && CLASSES.map((c) => {
            const itens = r.fora.filter((x) => (c.id ? (x.motivo && x.motivo.classe === c.id) : !x.motivo));
            if (!itens.length) return null;
            return (
              <div className="best-aud-secao" key={c.id || 'sem'}>
                <div className="best-aud-titulo">{en ? c.en : c.pt} · {itens.length}</div>
                <ul className="best-aud-lista">
                  {itens.map((x) => (
                    <li key={x.key}><strong>{x.nome}</strong>
                      <span className="best-aud-det"> — {x.motivo ? x.motivo.motivo
                        : (en ? 'not in the engine; tell me if it should be'
                              : 'não está no motor; me diga se deveria estar')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          <p className="best-aud-ajuda">
            {en ? `${s.ok} of ${s.total} techniques run in combat.`
                : `${s.ok} das ${s.total} técnicas funcionam em combate.`}
          </p>
        </div>
    </BestPainelModal>
  );
}

function TecnicasList({ ac, lang, modoJogador }) {
  const { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } = (typeof UI !== 'undefined' ? UI : {});
  const [tecnicas, setTecnicas] = useState(null);
  const { sorted: tecnicasSorted, sortKey, sortDir, toggleSort } = useSort(tecnicas);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [expandida, setExpandida] = useState(null);
  const [page, setPage] = useState(1);
  const wrapRef = React.useRef(null);
  const PAGE_SIZE = useFitPageSize(wrapRef);
  const ehAdmin = useEhAdmin();
  const [editando, setEditando] = useState(undefined); // undefined=fechado, null=criando, objeto=editando
  const { carregando: carregandoConhecido, conhecido } = useConhecidoDoJogador(modoJogador);

  // Extraído SEM mudar comportamento (ver comentário equivalente em CriaturasList).
  const carregarTecnicas = async (cancelRef) => {
    const { data, error } = await supabaseClient.from('tecnicas').select('*').order('nome', { ascending: true });
    if (cancelRef && cancelRef.atual) return;
    if (error) { setError(error.message); setTecnicas([]); } else { setTecnicas(data || []); }
  };

  useEffect(() => {
    const cancelRef = { atual: false };
    carregarTecnicas(cancelRef);
    return () => { cancelRef.atual = true; };
  }, []);
  useEffect(() => { setPage(1); setExpandida(null); }, [query]);

  if (!Table) return <BestNoKit />;
  if (tecnicas === null) return <BestLoading lang={lang} />;
  if (error) return <BestErrorBox error={error} hint={lang === 'en' ? "Make sure the 'tecnicas' table exists in Supabase." : "Confira se a tabela 'tecnicas' existe no Supabase."} />;
  if (modoJogador && carregandoConhecido) return <BestLoading lang={lang} />;

  const q = query.trim().toLowerCase();
  let filtered = (tecnicasSorted || []).filter((t) => {
    if (q && !(t.nome || '').toLowerCase().includes(q)) return false;
    return true;
  });
  if (modoJogador) filtered = filtered.filter((t) => conhecido.tecnicas.has(t.key));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="fp-page">
    <div className="fp-card best best-auto">
      <BestPageHeader eyebrow={lang === 'en' ? 'BESTIARY' : 'BESTIÁRIO'} title={lang === 'en' ? 'Techniques' : 'Técnicas'}
        right={<BestBuscaENovo ac={ac} query={query} setQuery={setQuery}
          placeholder={lang === 'en' ? 'Search technique…' : 'Buscar técnica…'}
          podeCriar={ehAdmin} onNovo={() => setEditando(null)}
          dicaNovo={lang === 'en' ? 'New technique' : 'Nova técnica'}
          /* Mesmo motivo do painel das magias: é onde o texto da técnica é
             editado, e a tabela exige autenticação que esta tela já tem. */
          ferramentas={ehAdmin && (<>
            <TecnicasAuditoriaPainel tecnicas={tecnicas} lang={lang} onRecarregar={carregarTecnicas} />
            {typeof TecnicasSugestoesPainel === 'function' && <TecnicasSugestoesPainel lang={lang} />}
          </>)} />} />

      {filtered.length === 0 ? (
        <div className="best-empty">{textoListaVazia({ query, modoJogador: modoJogador, lang, oQue: 'técnicas', oQueEn: 'technique' })}</div>
      ) : (
        <>
          <div className="best-table-wrap" ref={wrapRef}>
            <Table>
              <TableHeader><TableRow>
                <SortHead col='nome' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Name' : 'Nome'}</SortHead>
                <SortHead col='uso' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Use' : 'Uso'}</SortHead>
                <SortHead col='grupo_armas' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Weapons' : 'Armas'}</SortHead>
                <SortHead col='grupo_armaduras' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Armors' : 'Armaduras'}</SortHead>
                <SortHead col='custo' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Cost' : 'Custo'}</SortHead>
                {ehAdmin && <TableHead style={{ width: 40 }} />}
              </TableRow></TableHeader>
              <TableBody>
                {pageSlice.map((t) => {
                  const isOpen = expandida === t.key;
                  return (
                    <React.Fragment key={t.id || t.key}>
                      <TableRow className={isOpen ? 'on' : ''} style={{ cursor: 'pointer' }} onClick={() => setExpandida(isOpen ? null : t.key)}>
                        <TableCell className="best-name"><span className="best-chevron" style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</span>{t.nome}</TableCell>
                        <TableCell>{t.uso || '—'}</TableCell>
                        <TableCell>{t.grupo_armas || '—'}</TableCell>
                        <TableCell>{t.grupo_armaduras || '—'}</TableCell>
                        <TableCell className="best-cost">{t.custo}</TableCell>
                        {ehAdmin && <TableCell><BestBotaoEditar ac={ac} onClick={() => setEditando(t)} /></TableCell>}
                      </TableRow>
                      {isOpen && (
                        <TableRow className="best-detail"><TableCell colSpan={5 + (ehAdmin ? 1 : 0)}>
                          {t.permissao && <div className="best-permissao">{t.permissao}</div>}
                          {t.descricao && <TextoDoBanco texto={t.descricao} className="best-desc" />}
                          {/* O campo `efeito` NÃO aparece aqui (pedido do usuário,
                              11/09/2026): ele descreve o que acontece na resolução
                              do golpe, e o lugar disso é a mesa, na hora do combate
                              — o painel de ação já o mostra ao selecionar a técnica.
                              No catálogo ele só duplicava a descrição e antecipava
                              mecânica que o jogador não precisa ler ali. */}
                        </TableCell></TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <BestPagination page={page} safePage={safePage} totalPages={totalPages} setPage={setPage} setExpandida={setExpandida} lang={lang} />
        </>
      )}
    </div>
    {editando !== undefined && (
      <CatalogoEditor
        tabela="tecnicas"
        linha={editando}
        lang={lang}
        onSalvo={() => { setEditando(undefined); carregarTecnicas(); }}
        onCancel={() => setEditando(undefined)}
      />
    )}
    </div>
  );
}

/* ============================== [21a] Peças do detalhe do item ==============================
   14/09/2026, pedido do usuário:
     • "remova a coluna armazenamento. O armazenamento, quando houver, será um
       ícone dentro do item junto com os demais" — e depois, no mesmo dia, "ao
       invés de mostrar um ícone e tooltip, eu quero o texto 'ocupa'": virou um
       quadro com rótulo em texto, igual a Dano/Alcance;
     • "se for um item mágico, informe como texto qual magia é e a descrição
       da magia" — itens.magia guarda o NOME da magia (magiaDoItem, 07-inventario).
   Também usadas pela página de itens da campanha (itens-campanha.jsx). */
function temArmazenamentoItem(it) {
  const tem = (v) => v != null && v !== '' && Number.isFinite(Number(v));
  return !!it && ((tem(it.armazena) && Number(it.armazena) > 0) || tem(it.ocupa));
}

function BestItemArmazenamento({ item, lang }) {
  if (!temArmazenamentoItem(item)) return null;
  const en = lang === 'en';
  const fmt = (v) => Number(v).toFixed(1);
  // Rótulo em TEXTO, como os demais quadros (pedido do usuário, 14/09/2026:
  // "ao invés de mostrar um ícone e tooltip, eu quero o texto 'ocupa'").
  const quadro = (rotulo, valor) => (
    <div className="best-stat">
      <span className="best-stat-lbl">{rotulo}</span>
      <span className="best-stat-val">{valor}</span>
    </div>
  );
  return (
    <>
      {item.ocupa != null && item.ocupa !== '' && quadro(en ? 'Takes up' : 'Ocupa', fmt(item.ocupa))}
      {Number(item.armazena) > 0 && quadro(en ? 'Stores' : 'Armazena', fmt(item.armazena))}
    </>
  );
}

/* Animal ligado à criatura (itens.criatura_id, 14/09/2026): a característica
   vem da CRIATURA — o item só a mostra. `criaturasPorId` = { [id]: linha }. */
function useCriaturasPorId() {
  const [mapa, setMapa] = useState({});
  useEffect(() => {
    let cancelado = false;
    fetchTabelaPaginada('criaturas', { colunas: 'id, nome, montaria', ordem: ['nome'] })
      .then(({ data }) => {
        if (cancelado) return;
        const m = {};
        (data || []).forEach((c) => { m[c.id] = c; });
        setMapa(m);
      });
    return () => { cancelado = true; };
  }, []);
  return mapa;
}

function BestItemCriatura({ item, criaturasPorId, lang }) {
  if (!item || item.criatura_id == null) return null;
  const c = (criaturasPorId || {})[item.criatura_id];
  if (!c) return null;
  const en = lang === 'en';
  return (
    <>
      <div className="best-stat"><span className="best-stat-lbl">{en ? 'Creature' : 'Criatura'}</span><span className="best-stat-val">{c.nome}</span></div>
      {c.montaria === true && (
        <div className="best-stat"><span className="best-stat-lbl">{en ? 'Mount' : 'Montaria'}</span><span className="best-stat-val">{en ? 'Yes' : 'Sim'}</span></div>
      )}
    </>
  );
}

/* Catálogo de magias, carregado uma vez por tela de itens. */
function useMagiasParaItens() {
  const [magias, setMagias] = useState([]);
  useEffect(() => {
    let cancelado = false;
    supabaseClient.from('magias').select('key, nome, descricao, nivel_1, nivel_3, nivel_5, nivel_7, nivel_9')
      .then(({ data }) => { if (!cancelado) setMagias(data || []); });
    return () => { cancelado = true; };
  }, []);
  return magias;
}

function BestItemMagia({ item, magias, lang }) {
  if (!item || !item.magia) return null;
  const en = lang === 'en';
  const _magiaDoItem = window.magiaDoItem;
  const magia = _magiaDoItem ? _magiaDoItem(item, magias) : null;
  const nivel = item.nivel_magia != null && item.nivel_magia !== '' ? Number(item.nivel_magia) : null;
  const textoNivel = magia && nivel != null ? magia['nivel_' + nivel] : null;
  return (
    <div className="best-magia">
      {/* Só "Bola de Fogo · Nível 9" — sem ícone nem rótulo "Magia" (14/09/2026). */}
      <div className="best-magia-head">
        <span className="best-magia-nome">
          {magia ? magia.nome : item.magia}
          {nivel != null && ` · ${en ? 'Level' : 'Nível'} ${nivel}`}
        </span>
      </div>
      {magia && magia.descricao && <TextoDoBanco texto={magia.descricao} className="best-desc" />}
      {textoNivel && <p className="best-efeito">{textoNivel}</p>}
    </div>
  );
}

/* ============================== [21] ItensList — Mestre vê todos os itens; jogador só os que possui ============================== */
function ItensList({ ac, lang, modoJogador }) {
  const { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } = (typeof UI !== 'undefined' ? UI : {});
  const [itens, setItens] = useState(null);
  const { sorted: itensSorted, sortKey, sortDir, toggleSort } = useSort(itens);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [expandida, setExpandida] = useState(null);
  const [page, setPage] = useState(1);
  const wrapRef = React.useRef(null);
  const PAGE_SIZE = useFitPageSize(wrapRef);
  const ehAdmin = useEhAdmin();
  const [editando, setEditando] = useState(undefined); // undefined=fechado, null=criando, objeto=editando
  const { carregando: carregandoConhecido, conhecido } = useConhecidoDoJogador(modoJogador);
  // Livro aberto na janela de leitura (itens.doc_url), 13/09/2026: guarda o slug.
  const [lendoDoc, setLendoDoc] = useState(null);

  // Extraído SEM mudar comportamento (ver comentário equivalente em CriaturasList).
  const carregarItens = async (cancelRef) => {
    // Paginado: `itens` passa de 1000 linhas e o PostgREST corta em silêncio.
    const { data, error } = await fetchTabelaPaginada('itens', { ordem: ['nome'] });
    if (cancelRef && cancelRef.atual) return;
    if (error) { setError(error.message); setItens([]); } else { setItens(data || []); }
  };

  useEffect(() => {
    const cancelRef = { atual: false };
    carregarItens(cancelRef);
    return () => { cancelRef.atual = true; };
  }, []);
  // Magias do catálogo, para o item mágico dizer QUAL magia carrega (14/09/2026).
  const magias = useMagiasParaItens();
  // Criatura vinculada aos animais — de onde vem a característica Montaria.
  const criaturasPorId = useCriaturasPorId();
  useEffect(() => { setPage(1); setExpandida(null); }, [query]);

  if (!Table) return <BestNoKit />;
  if (itens === null) return <BestLoading lang={lang} />;
  if (error) return <BestErrorBox error={error} hint={lang === 'en' ? "Make sure the 'itens' table exists in Supabase." : "Confira se a tabela 'itens' existe no Supabase."} />;
  if (modoJogador && carregandoConhecido) return <BestLoading lang={lang} />;

  const q = query.trim().toLowerCase();
  let filtered = (itensSorted || []).filter((it) => {
    if (q && !(it.nome || '').toLowerCase().includes(q)) return false;
    return true;
  });
  if (modoJogador) filtered = filtered.filter((it) => conhecido.itens.has(it.slug));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="fp-page">
    <div className="fp-card best best-auto">
      <BestPageHeader eyebrow={lang === 'en' ? 'BESTIARY' : 'BESTIÁRIO'} title={lang === 'en' ? 'Items' : 'Itens'}
        right={<BestBuscaENovo ac={ac} query={query} setQuery={setQuery}
          placeholder={lang === 'en' ? 'Search item…' : 'Buscar item…'}
          podeCriar={ehAdmin} onNovo={() => setEditando(null)}
          dicaNovo={lang === 'en' ? 'New item' : 'Novo item'}
          /* Sugestões de itens para batalha. Itens não tem verificação. */
          ferramentas={ehAdmin && typeof ItensSugestoesPainel === 'function' && <ItensSugestoesPainel lang={lang} />} />} />

      {filtered.length === 0 ? (
        <div className="best-empty">{textoListaVazia({ query, modoJogador: modoJogador, lang, oQue: 'itens', oQueEn: 'item' })}</div>
      ) : (
        <>
          <div className="best-table-wrap" ref={wrapRef}>
            <Table>
              <TableHeader><TableRow>
                <SortHead col='nome' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Name' : 'Nome'}</SortHead>
                <SortHead col='grupo' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Group' : 'Grupo'}</SortHead>
                <SortHead col='valor_latao' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Value' : 'Valor'}</SortHead>
                {ehAdmin && <TableHead style={{ width: 40 }} />}
              </TableRow></TableHeader>
              <TableBody>
                {pageSlice.map((it) => {
                  const isOpen = expandida === it.slug;
                  const isContainer = ehContainer(it);
                  const equipavel = !!it.categoria_equip;
                  const temArmazenamento = temArmazenamentoItem(it);
                  const temCriatura = it.criatura_id != null && !!criaturasPorId[it.criatura_id];
                  return (
                    <React.Fragment key={it.id || it.slug}>
                      <TableRow className={isOpen ? 'on' : ''} style={{ cursor: 'pointer' }} onClick={() => setExpandida(isOpen ? null : it.slug)}>
                        <TableCell className="best-name">
                          <span className="best-chevron" style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}><i class="ti ti-chevron-right"></i></span>
                          {it.nome}
                        </TableCell>
                        <TableCell>{it.grupo || '—'}</TableCell>
                        <TableCell>{it.valor_latao ?? 0}</TableCell>
                        {ehAdmin && <TableCell><BestBotaoEditar ac={ac} onClick={() => setEditando(it)} /></TableCell>}
                      </TableRow>
                      {isOpen && (
                        <TableRow className="best-detail"><TableCell colSpan={3 + (ehAdmin ? 1 : 0)}>
                          {(equipavel || temArmazenamento || temCriatura) && (
                            <div className="best-detail-stats">
                              {/* Ocupa/Armazena num quadro, junto dos demais (14/09/2026) —
                                  era uma coluna da tabela. Ver BestItemArmazenamento. */}
                              <BestItemArmazenamento item={it} lang={lang} />
                              <BestItemCriatura item={it} criaturasPorId={criaturasPorId} lang={lang} />
                              {/* Mãos só no ESCUDO: na arma saiu (pedido de 14/09/2026). */}
                              {it.categoria_equip === 'escudo' && (
                                <div className="best-stat"><span className="best-stat-lbl">{lang === 'en' ? 'Halfling' : 'Pequenino'}</span><span className="best-stat-val">{it.maos_pequenino != null ? `${it.maos_pequenino} ${lang === 'en' ? (it.maos_pequenino === 1 ? 'hand' : 'hands') : (it.maos_pequenino === 1 ? 'mão' : 'mãos')}` : <span style={{ color: '#C0392B', fontWeight: 700 }}>✗</span>}</span></div>
                              )}
                              {it.categoria_equip === 'escudo' && (
                                <div className="best-stat"><span className="best-stat-lbl">{lang === 'en' ? 'Dwarf' : 'Anão'}</span><span className="best-stat-val">{it.maos_anao != null ? `${it.maos_anao} ${lang === 'en' ? (it.maos_anao === 1 ? 'hand' : 'hands') : (it.maos_anao === 1 ? 'mão' : 'mãos')}` : <span style={{ color: '#C0392B', fontWeight: 700 }}>✗</span>}</span></div>
                              )}
                              {it.categoria_equip === 'escudo' && (
                                <div className="best-stat"><span className="best-stat-lbl">{lang === 'en' ? 'Others' : 'Outros'}</span><span className="best-stat-val">{it.maos_outras != null ? `${it.maos_outras} ${lang === 'en' ? (it.maos_outras === 1 ? 'hand' : 'hands') : (it.maos_outras === 1 ? 'mão' : 'mãos')}` : <span style={{ color: '#C0392B', fontWeight: 700 }}>✗</span>}</span></div>
                              )}
                              {it.dano != null && (<div className="best-stat"><span className="best-stat-lbl">{lang === 'en' ? 'Damage' : 'Dano'}</span><span className="best-stat-val">{it.dano}</span></div>)}
                              {it.alcance != null && it.alcance > 0 && (<div className="best-stat"><span className="best-stat-lbl">{lang === 'en' ? 'Range' : 'Alcance'}</span><span className="best-stat-val">{it.alcance}</span></div>)}
                              {it.ajuste_atributo && (<div className="best-stat"><span className="best-stat-lbl">{lang === 'en' ? 'Attribute' : 'Atributo'}</span><span className="best-stat-val">{it.ajuste_atributo}</span></div>)}
                              {it.defesa != null && (<div className="best-stat"><span className="best-stat-lbl">{lang === 'en' ? 'Defense' : 'Defesa'}</span><span className="best-stat-val">{it.defesa}</span></div>)}
                              {it.absorcao != null && (<div className="best-stat"><span className="best-stat-lbl">{lang === 'en' ? 'Absorption' : 'Absorção'}</span><span className="best-stat-val">{it.absorcao}</span></div>)}
                              {it.forca_req != null && it.forca_req !== 0 && (<div className="best-stat"><span className="best-stat-lbl">{lang === 'en' ? 'Strength' : 'Força'}</span><span className="best-stat-val">{it.forca_req > 0 ? `${it.forca_req}` : it.forca_req}</span></div>)}
                            </div>
                          )}
                          {it.descricao && <TextoDoBanco texto={it.descricao} className="best-desc" />}
                          {it.efeito && <p className="best-efeito">{it.efeito}</p>}
                          <BestItemMagia item={it} magias={magias} lang={lang} />
                          {/* itens.doc_url guarda o link do CONTEÚDO do item — hoje só os
                              três livros da campanha o usam, apontando pro texto da obra.
                              Até 11/09/2026 o campo existia no editor e nenhuma tela o lia:
                              o Mestre digitava o link e ele não ia a lugar nenhum.
                              rel=noreferrer junto de target=_blank porque a aba aberta
                              ganha window.opener sem isso. */}
                          {/* Desde 13/09/2026 o conteúdo abre NUMA JANELA de leitura
                              (LeituraDocModal, 07-inventario), a mesma do botão "Ler"
                              do item — pedido do usuário. O link pra nova aba mora
                              dentro dela. Sem o componente carregado, cai no link. */}
                          {it.doc_url && (() => {
                            const LeituraDoc = (typeof window !== 'undefined' && window.LeituraDocModal) || null;
                            return (
                              <p className="best-efeito">
                                {LeituraDoc ? (
                                  <button type="button" className="btn-ghost btn-sm" onClick={() => setLendoDoc(it.slug)}>
                                    {lang === 'en' ? 'Read' : 'Ler'}
                                  </button>
                                ) : (
                                  <a href={it.doc_url} target="_blank" rel="noopener noreferrer">
                                    <i className="ti ti-external-link" aria-hidden="true" />
                                    {' '}{lang === 'en' ? 'Open content' : 'Abrir conteúdo'}
                                  </a>
                                )}
                                {LeituraDoc && lendoDoc === it.slug && (
                                  <LeituraDoc titulo={it.nome} docUrl={it.doc_url} lang={lang} onClose={() => setLendoDoc(null)} />
                                )}
                              </p>
                            );
                          })()}
                        </TableCell></TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <BestPagination page={page} safePage={safePage} totalPages={totalPages} setPage={setPage} setExpandida={setExpandida} lang={lang} />
        </>
      )}
    </div>
    {editando !== undefined && (
      <CatalogoEditor
        tabela="itens"
        linha={editando}
        lang={lang}
        onSalvo={() => { setEditando(undefined); carregarItens(); }}
        onCancel={() => setEditando(undefined)}
      />
    )}
    </div>
  );
}

Object.assign(window, {
  CriaturasList, MagiasList, HabilidadesList,
  // Exposto pro teste de render: e a tela que diz ao Mestre se a edicao dele
  // quebrou alguma magia no motor.
  MagiasAuditoriaPainel, CriaturasAuditoriaPainel, TecnicasAuditoriaPainel,
  TecnicasList, ItensList, useEhAdmin,
  // Detalhe do item (14/09/2026) — também na página de itens da campanha.
  BestItemArmazenamento, BestItemMagia, useMagiasParaItens, temArmazenamentoItem,
  linhasQueCabem, useFitPageSize, paragrafosDe, TextoDoBanco, textoListaVazia,
  /* O VOCABULÁRIO DA TABELA, exposto em 12/09/2026.

     As telas Lugares/Personagens/Memórias (13-diario) passaram a ser "uma
     tabela igual às demais", a pedido do usuário. Igual de verdade quer dizer
     as MESMAS peças — cabeçalho, busca, chips, ordenação, paginação —, não uma
     tabela parecida escrita de novo ali. Duplicar o vocabulário é como as duas
     telas começam a divergir sem ninguém decidir que deviam. */
  BestPageHeader, BestLoading, BestErrorBox, BestPagination,
  useFitPageSize, useSort, SortHead, ChipIcon,
  // 14/09/2026: o cabeçalho "busca + ferramentas + +" também serve às páginas
  // Lugares, NPCs e Memórias (13-diario/diario.jsx).
  BestBuscaENovo, BestBotaoNovo,
});
