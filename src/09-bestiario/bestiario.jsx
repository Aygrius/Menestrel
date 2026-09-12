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

/* Quantas linhas cabem na altura visível (em vez de PAGE_SIZE fixo). */
function useFitPageSize(wrapRef, opts) {
  const o = opts || {};
  const reserved = o.reserved != null ? o.reserved : 96;
  const min = o.min || 3;
  const fallbackRowH = o.rowH || 42;
  const rowHRef = React.useRef(null);
  const [size, setSize] = useState(o.fallback || 10);
  const calc = () => {
    const w = wrapRef.current;
    if (!w) return null;
    if (rowHRef.current == null) {
      const r = w.querySelector('tbody tr:not(.best-detail)');
      if (r) { const h = r.getBoundingClientRect().height; if (h > 0) rowHRef.current = h; }
    }
    const rowH = rowHRef.current || fallbackRowH;
    const thead = w.querySelector('thead');
    const headH = thead ? thead.getBoundingClientRect().height : 40;
    const top = w.getBoundingClientRect().top;
    return linhasQueCabem({ innerHeight: window.innerHeight, top, reserved, headH, rowH, min });
  };
  useEffect(() => { const n = calc(); if (n != null && n !== size) setSize(n); });
  useEffect(() => {
    const onResize = () => { const n = calc(); if (n != null) setSize((prev) => prev === n ? prev : n); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return size;
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
// Convenção compartilhada: "Novo" no cabeçalho abre o editor em criação
// (linha null), o lápis em cada linha abre em edição (linha = o registro).
function BestBotaoNovo({ ac, onClick }) {
  return (
    <button type="button" className="btn-ghost btn-sm" onClick={onClick}>
      <i className="ti ti-plus" aria-hidden="true" /> {ac.editorNovo}
    </button>
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
function CriaturasList({ ac, lang, modoJogador }) {
  const { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Input } = (typeof UI !== 'undefined' ? UI : {});
  const [criaturas, setCriaturas] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('all');
  const [expandida, setExpandida] = useState(null);
  const [page, setPage] = useState(1);
  const wrapRef = React.useRef(null);
  const PAGE_SIZE = useFitPageSize(wrapRef);
  const { sorted: criaturasSorted, sortKey, sortDir, toggleSort } = useSort(criaturas);
  const ehAdmin = useEhAdmin();
  const { carregando: carregandoConhecido, conhecido } = useConhecidoDoJogador(modoJogador);
  const [editando, setEditando] = useState(undefined); // undefined=fechado, null=criando, objeto=editando

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
  useEffect(() => { setPage(1); setExpandida(null); }, [query, tipoFiltro]);

  if (!Table) return <BestNoKit />;
  if (criaturas === null) return <BestLoading text={lang === 'en' ? 'Loading bestiary…' : 'Consultando o bestiário…'} />;
  if (error) return <BestErrorBox error={error} hint={lang === 'en' ? "Make sure the 'criaturas' table exists in Supabase." : "Confira se a tabela 'criaturas' existe no Supabase."} />;
  if (modoJogador && carregandoConhecido) return <BestLoading text={lang === 'en' ? 'Loading bestiary…' : 'Consultando o bestiário…'} />;

  const q = query.trim().toLowerCase();
  const tiposPresentes = ['all', ...Array.from(new Set(criaturas.map((c) => c.tipo).filter(Boolean))).sort()];
  let filtered = (criaturasSorted || []).filter((c) => {
    if (tipoFiltro !== 'all' && c.tipo !== tipoFiltro) return false;
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
  const cols = [
    { key: 'nome',            label: lang === 'en' ? 'Name' : 'Nome',     full: lang === 'en' ? 'Name' : 'Nome' },
    { key: 'tipo',            label: lang === 'en' ? 'Class' : 'Classe',  full: lang === 'en' ? 'Class' : 'Classe' },
    { key: 'estagio',         label: 'Est',    full: lang === 'en' ? 'Stage' : 'Estágio' },
    { key: 'energia_fisica',  label: 'EF',     full: 'Energia Física' },
    { key: 'energia_heroica', label: 'EH',     full: 'Energia Heroica' },
    { key: 'absorcao',        label: 'AB',     full: 'Absorção' },
    { key: 'defesa',          label: 'DF',     full: 'Defesa' },
    { key: 'armadura',        label: 'AR',     full: 'Armadura' },
    { key: 'velocidade',      label: 'VB',     full: 'Velocidade' },
    { key: 'peso',            label: 'PS',     full: 'Peso' },
  ];
  const atributos = [
    { key: 'intelecto', label: 'INT' }, { key: 'aura', label: 'AUR' }, { key: 'carisma', label: 'CAR' },
    { key: 'forca', label: 'FOR' }, { key: 'fisico', label: 'FIS' }, { key: 'agilidade', label: 'AGI' }, { key: 'percepcao', label: 'PER' },
  ];
  const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : v);

  return (
    <div className="fp-page">
    <div className="fp-card best best-criaturas">
      <BestPageHeader eyebrow={lang === 'en' ? 'BESTIARY' : 'BESTIÁRIO'} title={lang === 'en' ? 'Creatures' : 'Criaturas'}
        right={ehAdmin && <BestBotaoNovo ac={ac} onClick={() => setEditando(null)} />} />
      <div className="best-toolbar-bestiario">
        <div className="best-search"><Input type="search" placeholder={lang === 'en' ? 'Search creature…' : 'Buscar criatura…'} value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <div className="best-chips">
          {tiposPresentes.map((t) => (
            <ChipIcon
              key={t}
              value={t}
              label={t === 'all' ? (lang === 'en' ? 'All' : 'Todos') : t}
              active={tipoFiltro === t}
              onClick={() => setTipoFiltro(t)}
            />
          ))}
        </div>
        <div className="best-count">{filtered.length} de {criaturas.length}</div>
      </div>

      {filtered.length === 0 ? (
        <div className="best-empty">{textoListaVazia({ query, modoJogador, lang, oQue: 'criaturas', oQueEn: 'creature' })}</div>
      ) : (
        <>
          <div className="best-table-wrap" ref={wrapRef}>
            <Table>
              <TableHeader><TableRow>
                {cols.map((c) => <SortHead key={c.key} col={c.key} sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{c.label}</SortHead>)}
                {ehAdmin && <TableHead style={{ width: 40 }} />}
              </TableRow></TableHeader>
              <TableBody>
                {pageSlice.map((row) => {
                  const isOpen = expandida === row.id;
                  return (
                    <React.Fragment key={row.id}>
                      <TableRow className={isOpen ? 'on' : ''} style={{ cursor: 'pointer' }} onClick={() => setExpandida(isOpen ? null : row.id)}>
                        {cols.map((c) => c.key === 'nome' ? (
                          <TableCell key={c.key} className="best-name"><span className="best-chevron" style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</span>{fmt(row[c.key])}</TableCell>
                        ) : (
                          <TableCell key={c.key}>{fmt(row[c.key])}</TableCell>
                        ))}
                        {ehAdmin && <TableCell><BestBotaoEditar ac={ac} onClick={() => setEditando(row)} /></TableCell>}
                      </TableRow>
                      {isOpen && (
                        <TableRow className="best-detail"><TableCell colSpan={cols.length + (ehAdmin ? 1 : 0)}>
                          <div className="best-detail-stats">
                            {atributos.map((a) => (
                              <div className="best-stat" key={a.key}><span className="best-stat-lbl">{a.label}</span><span className="best-stat-val">{fmt(row[a.key])}</span></div>
                            ))}
                          </div>
                          {row.descricao
                            ? <TextoDoBanco texto={row.descricao} className="best-desc" />
                            : <p className="best-desc" style={{ opacity: 0.55 }}>{lang === 'en' ? 'No description yet.' : 'Sem descrição ainda.'}</p>}
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
        onCancel={() => setEditando(undefined)}
      />
    )}
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
function BestLoading({ text }) {
  return <div className="admin-loading"><span>{text}</span></div>;
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
function MagiasAuditoriaPainel({ magias, lang }) {
  const [aberto, setAberto] = React.useState(false);
  const en = lang === 'en';

  const r = React.useMemo(
    () => (typeof auditarMagias === 'function' ? auditarMagias(magias || []) : null),
    [magias]
  );
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
    <div className={'best-auditoria' + (temProblema ? ' com-problema' : '')}>
      <button type="button" className="best-aud-head" onClick={() => setAberto((v) => !v)}>
        <span className="best-aud-chevron" style={{ transform: aberto ? 'rotate(90deg)' : 'none' }}>›</span>
        <strong>{en ? 'Catalog check' : 'Verificação do catálogo'}</strong>
        <span className="best-aud-resumo">
          {temProblema
            ? (en ? `${s.quebrada} broken · ${s.ambigua} ambiguous` : `${s.quebrada} quebrada(s) · ${s.ambigua} ambígua(s)`)
            : (en ? `${s.ok} read correctly` : `${s.ok} lidas corretamente`)}
          {' · '}
          {en ? `${s.orfa} unmapped` : `${s.orfa} sem registro`}
        </span>
      </button>

      {aberto && (
        <div className="best-aud-corpo">
          <p className="best-aud-ajuda">
            {en
              ? 'Numbers in the level text drive the effect — edit them freely. Changing WHICH unit a spell affects needs a code change.'
              : 'O número no texto do nível governa o efeito — pode editar à vontade. Trocar QUAL unidade a magia afeta exige mudança no código.'}
          </p>

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
          <Secao
            titulo={en ? 'Unmapped — readable numbers, no engine entry' : 'Sem registro — têm número legível e o motor ignora'}
            itens={r.orfa}
            detalhe={(x) => <span className="best-aud-det"> — {x.unidades.join(', ')}</span>}
          />

          <p className="best-aud-rodape">
            {en
              ? `${s.ok} mapped and consistent · ${s.narrativa} narrative (nothing to do) · ${s.total} total`
              : `${s.ok} no motor e consistentes · ${s.narrativa} narrativas (nada a fazer) · ${s.total} no total`}
          </p>
        </div>
      )}
    </div>
  );
}

/* ============================== [18] MagiasList — Mestre vê todas as magias do banco; jogador só as compradas ============================== */
function MagiasList({ ac, lang, modoJogador }) {
  const { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Input } = (typeof UI !== 'undefined' ? UI : {});
  const [magias, setMagias] = useState(null);
  const { sorted: magiasSorted, sortKey, sortDir, toggleSort } = useSort(magias);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('all');
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
  useEffect(() => { setPage(1); setExpandida(null); }, [query, tipoFiltro]);

  if (!Table) return <BestNoKit />;
  if (magias === null) return <BestLoading text={lang === 'en' ? 'Loading spells…' : 'Consultando os grimórios…'} />;
  if (error) return <BestErrorBox error={error} hint={lang === 'en' ? "Make sure the 'magias' table exists in Supabase." : "Confira se a tabela 'magias' existe no Supabase."} />;
  if (modoJogador && carregandoConhecido) return <BestLoading text={lang === 'en' ? 'Loading spells…' : 'Consultando os grimórios…'} />;

  const q = query.trim().toLowerCase();
  let filtered = (magiasSorted || []).filter((m) => {
    if (tipoFiltro !== 'all' && m.tipo !== tipoFiltro) return false;
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
        right={ehAdmin && <BestBotaoNovo ac={ac} onClick={() => setEditando(null)} />} />
      <div className="best-toolbar-bestiario">
        <div className="best-search"><Input type="search" placeholder={lang === 'en' ? 'Search spell…' : 'Buscar magia…'} value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <div className="best-chips">
          {['all', 'Básica', 'Perdida', 'Ancestral'].map((t) => (
            <ChipIcon
              key={t}
              value={t}
              label={t === 'all' ? (lang === 'en' ? 'All' : 'Todas') : t}
              active={tipoFiltro === t}
              onClick={() => setTipoFiltro(t)}
            />
          ))}
        </div>
        <div className="best-count">{filtered.length} de {magias.length}</div>
      </div>

      {/* Auditoria do catálogo — só admin. Responde a pergunta de manutenção:
          "editei o texto de uma magia; o motor de combate ainda entende?"

          Mora AQUI, ao lado do editor, porque é aqui que o texto é editado —
          e porque a tabela `magias` exige autenticação, então um script de
          linha de comando precisaria de credencial que esta tela já tem. */}
      {ehAdmin && <MagiasAuditoriaPainel magias={magias} lang={lang} />}

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
  const { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Input } = (typeof UI !== 'undefined' ? UI : {});
  const [habilidades, setHabilidades] = useState(null);
  const { sorted: habSorted, sortKey, sortDir, toggleSort } = useSort(habilidades);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('all');
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
  useEffect(() => { setPage(1); setExpandida(null); }, [query, categoriaFiltro]);

  if (!Table) return <BestNoKit />;
  if (habilidades === null) return <BestLoading text={lang === 'en' ? 'Loading skills…' : 'Carregando habilidades…'} />;
  if (error) return <BestErrorBox error={error} hint={lang === 'en' ? "Make sure the 'habilidades' table exists in Supabase." : "Confira se a tabela 'habilidades' existe no Supabase."} />;
  if (modoJogador && carregandoConhecido) return <BestLoading text={lang === 'en' ? 'Loading skills…' : 'Carregando habilidades…'} />;

  const todasHabilidades = habSorted || [];
  // Categorias na ordem canônica, só as que aparecem (agora renderizadas como chips — antes só tinha "Todas").
  const categoriasPresentes = GRUPOS_HABILIDADES_ORDEM.filter((g) => todasHabilidades.some((h) => h.grupo === g));

  const q = query.trim().toLowerCase();
  let filtered = todasHabilidades.filter((h) => {
    if (categoriaFiltro !== 'all' && h.grupo !== categoriaFiltro) return false;
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
        right={ehAdmin && <BestBotaoNovo ac={ac} onClick={() => setEditando(null)} />} />
      <div className="best-toolbar-bestiario">
        <div className="best-search"><Input type="search" placeholder={lang === 'en' ? 'Search skill…' : 'Buscar habilidade…'} value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <div className="best-chips">
          <ChipIcon value="all" label={lang === 'en' ? 'All' : 'Todas'} active={categoriaFiltro === 'all'} onClick={() => setCategoriaFiltro('all')} />
          {categoriasPresentes.map((g) => (
            <ChipIcon key={g} value={g} label={g} active={categoriaFiltro === g} onClick={() => setCategoriaFiltro(g)} />
          ))}
        </div>
        <div className="best-count">{filtered.length} de {todasHabilidades.length}</div>
      </div>

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
                  const temDetalhe = !!(h.descricao || h.restricao);
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
                          {h.restricao && (
                            <div className="best-meta-list">
                              <div className="best-meta"><span className="best-meta-lbl">{lang === 'en' ? 'Restriction' : 'Restrição'}</span><span className="best-meta-val">{h.restricao}</span></div>
                            </div>
                          )}
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
function TecnicasList({ ac, lang, modoJogador }) {
  const { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Input } = (typeof UI !== 'undefined' ? UI : {});
  const [tecnicas, setTecnicas] = useState(null);
  const { sorted: tecnicasSorted, sortKey, sortDir, toggleSort } = useSort(tecnicas);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [usoFiltro, setUsoFiltro] = useState('all');
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
  useEffect(() => { setPage(1); setExpandida(null); }, [query, usoFiltro]);

  if (!Table) return <BestNoKit />;
  if (tecnicas === null) return <BestLoading text={lang === 'en' ? 'Loading techniques…' : 'Consultando os manuais de combate…'} />;
  if (error) return <BestErrorBox error={error} hint={lang === 'en' ? "Make sure the 'tecnicas' table exists in Supabase." : "Confira se a tabela 'tecnicas' existe no Supabase."} />;
  if (modoJogador && carregandoConhecido) return <BestLoading text={lang === 'en' ? 'Loading techniques…' : 'Consultando os manuais de combate…'} />;

  const usosDisponiveis = Array.from(new Set(tecnicas.map((t) => t.uso).filter(Boolean))).sort();

  const q = query.trim().toLowerCase();
  let filtered = (tecnicasSorted || []).filter((t) => {
    if (usoFiltro !== 'all' && t.uso !== usoFiltro) return false;
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
        right={ehAdmin && <BestBotaoNovo ac={ac} onClick={() => setEditando(null)} />} />
      <div className="best-toolbar-bestiario">
        <div className="best-search"><Input type="search" placeholder={lang === 'en' ? 'Search technique…' : 'Buscar técnica…'} value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <div className="best-chips">
          <ChipIcon value="all" label={lang === 'en' ? 'All' : 'Todas'} active={usoFiltro === 'all'} onClick={() => setUsoFiltro('all')} />
          {usosDisponiveis.map((u) => (
            <ChipIcon key={u} value={u} label={u} active={usoFiltro === u} onClick={() => setUsoFiltro(u)} />
          ))}
        </div>
        <div className="best-count">{filtered.length} de {tecnicas.length}</div>
      </div>

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

/* ============================== [21] ItensList — Mestre vê todos os itens; jogador só os que possui ============================== */
function ItensList({ ac, lang, modoJogador }) {
  const { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Input } = (typeof UI !== 'undefined' ? UI : {});
  const [itens, setItens] = useState(null);
  const { sorted: itensSorted, sortKey, sortDir, toggleSort } = useSort(itens);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [grupoFiltro, setGrupoFiltro] = useState('all');
  const [precoFiltro, setPrecoFiltro] = useState('all');
  const [expandida, setExpandida] = useState(null);
  const [page, setPage] = useState(1);
  const wrapRef = React.useRef(null);
  const PAGE_SIZE = useFitPageSize(wrapRef);
  const ehAdmin = useEhAdmin();
  const [editando, setEditando] = useState(undefined); // undefined=fechado, null=criando, objeto=editando
  const { carregando: carregandoConhecido, conhecido } = useConhecidoDoJogador(modoJogador);

  // Faixas de preço (valor_latao)
  const PRECO_FAIXAS = [
    { key: 'all',    label: lang === 'en' ? 'All prices' : 'Todos os preços', icon: 'ti-list',         min: 0,     max: Infinity },
    { key: 'gratis', label: lang === 'en' ? 'Free'        : 'Gratuito',        icon: 'ti-gift',         min: 0,     max: 0        },
    { key: 'barato', label: lang === 'en' ? '1–99'        : '1–99',            icon: 'ti-coin',         min: 1,     max: 99       },
    { key: 'medio',  label: lang === 'en' ? '100–999'     : '100–999',         icon: 'ti-coins',        min: 100,   max: 999      },
    { key: 'caro',   label: lang === 'en' ? '1 000–9 999' : '1.000–9.999',     icon: 'ti-cash',         min: 1000,  max: 9999     },
    { key: 'raro',   label: lang === 'en' ? '10 000+'     : '10.000+',         icon: 'ti-diamond',      min: 10000, max: Infinity },
  ];

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
  useEffect(() => { setPage(1); setExpandida(null); }, [query, grupoFiltro, precoFiltro]);

  if (!Table) return <BestNoKit />;
  if (itens === null) return <BestLoading text={lang === 'en' ? 'Loading items…' : 'Consultando o inventário do mundo…'} />;
  if (error) return <BestErrorBox error={error} hint={lang === 'en' ? "Make sure the 'itens' table exists in Supabase." : "Confira se a tabela 'itens' existe no Supabase."} />;
  if (modoJogador && carregandoConhecido) return <BestLoading text={lang === 'en' ? 'Loading items…' : 'Consultando o inventário do mundo…'} />;

  const gruposDisponiveis = Array.from(new Set(itens.map((i) => i.grupo).filter(Boolean))).sort();

  const q = query.trim().toLowerCase();
  const faixaAtiva = PRECO_FAIXAS.find((f) => f.key === precoFiltro) || PRECO_FAIXAS[0];
  let filtered = (itensSorted || []).filter((it) => {
    if (grupoFiltro !== 'all' && it.grupo !== grupoFiltro) return false;
    if (q && !(it.nome || '').toLowerCase().includes(q)) return false;
    if (precoFiltro !== 'all') {
      const v = it.valor_latao ?? 0;
      if (v < faixaAtiva.min || v > faixaAtiva.max) return false;
    }
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
        right={ehAdmin && <BestBotaoNovo ac={ac} onClick={() => setEditando(null)} />} />
      <div className="best-toolbar-bestiario">
        <div className="best-search"><Input type="search" placeholder={lang === 'en' ? 'Search item…' : 'Buscar item…'} value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <div className="best-chips">
          <ChipIcon value="all" label={lang === 'en' ? 'All' : 'Todos'} active={grupoFiltro === 'all'} onClick={() => setGrupoFiltro('all')} />
          {gruposDisponiveis.map((g) => (
            <ChipIcon key={g} value={g} label={g} active={grupoFiltro === g} onClick={() => setGrupoFiltro(g)} />
          ))}
        </div>
        <div className="best-count">{filtered.length} de {itens.length}</div>
      </div>

      {filtered.length === 0 ? (
        <div className="best-empty">{textoListaVazia({ query, modoJogador: modoJogador, lang, oQue: 'itens', oQueEn: 'item' })}</div>
      ) : (
        <>
          <div className="best-table-wrap" ref={wrapRef}>
            <Table>
              <TableHeader><TableRow>
                <SortHead col='nome' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Name' : 'Nome'}</SortHead>
                <SortHead col='grupo' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Group' : 'Grupo'}</SortHead>
                <SortHead col='ocupa' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Storage' : 'Armazenamento'}</SortHead>
                <SortHead col='valor_latao' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Value' : 'Valor'}</SortHead>
                {ehAdmin && <TableHead style={{ width: 40 }} />}
              </TableRow></TableHeader>
              <TableBody>
                {pageSlice.map((it) => {
                  const isOpen = expandida === it.slug;
                  const isContainer = ehContainer(it);
                  const equipavel = !!it.categoria_equip;
                  // Armazenamento: "+" quando é capacidade (armazena, recipiente),
                  // "-" quando é o espaço que ocupa. Vazio/branco -> célula em branco.
                  const armazenamento =
                    (it.armazena != null && it.armazena > 0) ? `+${Number(it.armazena).toFixed(1)}`
                    : (it.ocupa != null && it.ocupa !== '') ? `-${Number(it.ocupa).toFixed(1)}`
                    : '';
                  return (
                    <React.Fragment key={it.id || it.slug}>
                      <TableRow className={isOpen ? 'on' : ''} style={{ cursor: 'pointer' }} onClick={() => setExpandida(isOpen ? null : it.slug)}>
                        <TableCell className="best-name">
                          <span className="best-chevron" style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}><i class="ti ti-chevron-right"></i></span>
                          {it.nome}
                        </TableCell>
                        <TableCell>{it.grupo || '—'}</TableCell>
                        <TableCell>{armazenamento}</TableCell>
                        <TableCell>{it.valor_latao ?? 0}</TableCell>
                        {ehAdmin && <TableCell><BestBotaoEditar ac={ac} onClick={() => setEditando(it)} /></TableCell>}
                      </TableRow>
                      {isOpen && (
                        <TableRow className="best-detail"><TableCell colSpan={4 + (ehAdmin ? 1 : 0)}>
                          {equipavel && (
                            <div className="best-detail-stats">
                              {(it.categoria_equip === 'arma' || it.categoria_equip === 'escudo') && (
                                <div className="best-stat"><span className="best-stat-lbl">{lang === 'en' ? 'Halfling' : 'Pequenino'}</span><span className="best-stat-val">{it.maos_pequenino != null ? `${it.maos_pequenino} ${lang === 'en' ? (it.maos_pequenino === 1 ? 'hand' : 'hands') : (it.maos_pequenino === 1 ? 'mão' : 'mãos')}` : <span style={{ color: '#C0392B', fontWeight: 700 }}>✗</span>}</span></div>
                              )}
                              {(it.categoria_equip === 'arma' || it.categoria_equip === 'escudo') && (
                                <div className="best-stat"><span className="best-stat-lbl">{lang === 'en' ? 'Dwarf' : 'Anão'}</span><span className="best-stat-val">{it.maos_anao != null ? `${it.maos_anao} ${lang === 'en' ? (it.maos_anao === 1 ? 'hand' : 'hands') : (it.maos_anao === 1 ? 'mão' : 'mãos')}` : <span style={{ color: '#C0392B', fontWeight: 700 }}>✗</span>}</span></div>
                              )}
                              {(it.categoria_equip === 'arma' || it.categoria_equip === 'escudo') && (
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
                          {/* itens.doc_url guarda o link do CONTEÚDO do item — hoje só os
                              três livros da campanha o usam, apontando pro texto da obra.
                              Até 11/09/2026 o campo existia no editor e nenhuma tela o lia:
                              o Mestre digitava o link e ele não ia a lugar nenhum.
                              rel=noreferrer junto de target=_blank porque a aba aberta
                              ganha window.opener sem isso. */}
                          {it.doc_url && (
                            <p className="best-efeito">
                              <a href={it.doc_url} target="_blank" rel="noopener noreferrer">
                                <i className="ti ti-external-link" aria-hidden="true" />
                                {' '}{lang === 'en' ? 'Open content' : 'Abrir conteúdo'}
                              </a>
                            </p>
                          )}
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
  MagiasAuditoriaPainel,
  TecnicasList, ItensList, useEhAdmin,
  linhasQueCabem, paragrafosDe, TextoDoBanco, textoListaVazia,
});
