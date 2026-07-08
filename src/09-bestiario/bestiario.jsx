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
    const avail = window.innerHeight - top - reserved - headH;
    return Math.max(min, Math.floor(avail / rowH));
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


// ── BestPageHeader — header topo do card (fp-card-top) ──────────────────────
function BestPageHeader({ eyebrow, title }) {
  return (
    <div className="fp-card-top">
      <header className="ms-header ficha-page-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ficha-page-eyebrow">{eyebrow}</div>
          <h2 className="ms-title" style={{ margin: 0 }}>{title}</h2>
        </div>
      </header>
    </div>
  );
}

// ---------- Bestiário ----------
function CriaturasList({ ac, lang }) {
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

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data, error } = await supabaseClient
        .from('criaturas')
        .select('*')
        .order('estagio', { ascending: true })
        .order('nome', { ascending: true });
      if (cancel) return;
      if (error) { console.error('[criaturas] falha ao carregar:', error); setError(error.message); setCriaturas([]); }
      else { setCriaturas(data || []); }
    })();
    return () => { cancel = true; };
  }, []);
  useEffect(() => { setPage(1); setExpandida(null); }, [query, tipoFiltro]);

  if (!Table) return <BestNoKit />;
  if (criaturas === null) return <BestLoading text={lang === 'en' ? 'Loading bestiary…' : 'Consultando o bestiário…'} />;
  if (error) return <BestErrorBox error={error} hint={lang === 'en' ? "Make sure the 'criaturas' table exists in Supabase." : "Confira se a tabela 'criaturas' existe no Supabase."} />;

  const q = query.trim().toLowerCase();
  const tiposPresentes = ['all', ...Array.from(new Set(criaturas.map((c) => c.tipo).filter(Boolean))).sort()];
  const filtered = (criaturasSorted || []).filter((c) => {
    if (tipoFiltro !== 'all' && c.tipo !== tipoFiltro) return false;
    if (q && !(c.nome || '').toLowerCase().includes(q)) return false;
    return true;
  });
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
      <BestPageHeader eyebrow={lang === 'en' ? 'BESTIARY' : 'BESTIÁRIO'} title={lang === 'en' ? 'Creatures' : 'Criaturas'} />
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
        <div className="best-empty">{lang === 'en' ? `No creature matches "${query}".` : `Nenhuma criatura corresponde a "${query}".`}</div>
      ) : (
        <>
          <div className="best-table-wrap" ref={wrapRef}>
            <Table>
              <TableHeader><TableRow>
                {cols.map((c) => <SortHead key={c.key} col={c.key} sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{c.label}</SortHead>)}
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
                      </TableRow>
                      {isOpen && (
                        <TableRow className="best-detail"><TableCell colSpan={cols.length}>
                          <div className="best-detail-stats">
                            {atributos.map((a) => (
                              <div className="best-stat" key={a.key}><span className="best-stat-lbl">{a.label}</span><span className="best-stat-val">{fmt(row[a.key])}</span></div>
                            ))}
                          </div>
                          {row.descricao
                            ? <p className="best-desc">{row.descricao}</p>
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
  return <div style={{ textAlign: 'center', color: '#9C8F73', padding: 40, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 14 }}>{text}</div>;
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
  const items = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
    .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…'); acc.push(p); return acc; }, []);
  const close = () => setExpandida && setExpandida(null);
  return (
    <div className="best-pag">
      <button className="best-page-btn" onClick={() => { setPage((p) => Math.max(1, p - 1)); close(); }} disabled={safePage === 1} title={lang === 'en' ? 'Previous' : 'Anterior'}>‹</button>
      {items.map((p, idx) => p === '…'
        ? <span key={`ell-${idx}`} className="best-page-ellipsis">…</span>
        : <button key={p} className={'best-page-btn' + (p === safePage ? ' is-active' : '')} onClick={() => { setPage(p); close(); }}>{p}</button>)}
      <button className="best-page-btn" onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); close(); }} disabled={safePage === totalPages} title={lang === 'en' ? 'Next' : 'Próxima'}>›</button>
    </div>
  );
}

/* ============================== [18] MagiasList — Mestre vê todas as magias do banco ============================== */
function MagiasList({ ac, lang }) {
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

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data, error } = await supabaseClient.from('magias').select('*').order('nome', { ascending: true });
      if (cancel) return;
      if (error) { setError(error.message); setMagias([]); } else { setMagias(data || []); }
    })();
    return () => { cancel = true; };
  }, []);
  useEffect(() => { setPage(1); setExpandida(null); }, [query, tipoFiltro]);

  if (!Table) return <BestNoKit />;
  if (magias === null) return <BestLoading text={lang === 'en' ? 'Loading spells…' : 'Consultando os grimórios…'} />;
  if (error) return <BestErrorBox error={error} hint={lang === 'en' ? "Make sure the 'magias' table exists in Supabase." : "Confira se a tabela 'magias' existe no Supabase."} />;

  const q = query.trim().toLowerCase();
  const filtered = (magiasSorted || []).filter((m) => {
    if (tipoFiltro !== 'all' && m.tipo !== tipoFiltro) return false;
    if (q && !(m.nome || '').toLowerCase().includes(q)) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="fp-page">
    <div className="fp-card best best-auto">
      <BestPageHeader eyebrow={lang === 'en' ? 'BESTIARY' : 'BESTIÁRIO'} title={lang === 'en' ? 'Spells' : 'Magias'} />
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

      {filtered.length === 0 ? (
        <div className="best-empty">{lang === 'en' ? `No spell matches "${query}".` : `Nenhuma magia corresponde a "${query}".`}</div>
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
                      </TableRow>
                      {isOpen && (
                        <TableRow className="best-detail"><TableCell colSpan={6}>
                          {m.permissao && <div className="best-permissao">{m.permissao}</div>}
                          {m.descricao && <p className="best-desc">{m.descricao}</p>}
                          <div className="best-niveis">
                            {[{ n: 1, t: m.nivel_1 }, { n: 3, t: m.nivel_3 }, { n: 5, t: m.nivel_5 }, { n: 7, t: m.nivel_7 }, { n: 9, t: m.nivel_9 }].filter((x) => x.t).map((x) => (
                              <div key={x.n} className="best-nivel"><span className="best-nivel-n">{x.n}</span><span className="best-nivel-t">{x.t}</span></div>
                            ))}
                          </div>
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
    </div>
  );
}

/* ============================== [19] HabilidadesList — Mestre vê todas as habilidades (DB) ============================== */
function HabilidadesList({ ac, lang }) {
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

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data, error } = await supabaseClient.from('habilidades').select('*').order('nome', { ascending: true });
      if (cancel) return;
      if (error) { console.error('[habilidades] falha ao carregar:', error); setError(error.message); setHabilidades([]); } else { setHabilidades(data || []); }
    })();
    return () => { cancel = true; };
  }, []);
  useEffect(() => { setPage(1); setExpandida(null); }, [query, categoriaFiltro]);

  if (!Table) return <BestNoKit />;
  if (habilidades === null) return <BestLoading text={lang === 'en' ? 'Loading skills…' : 'Carregando habilidades…'} />;
  if (error) return <BestErrorBox error={error} hint={lang === 'en' ? "Make sure the 'habilidades' table exists in Supabase." : "Confira se a tabela 'habilidades' existe no Supabase."} />;

  const todasHabilidades = habSorted || [];
  // Categorias na ordem canônica, só as que aparecem (agora renderizadas como chips — antes só tinha "Todas").
  const categoriasPresentes = GRUPOS_HABILIDADES_ORDEM.filter((g) => todasHabilidades.some((h) => h.grupo === g));

  const q = query.trim().toLowerCase();
  const filtered = todasHabilidades.filter((h) => {
    if (categoriaFiltro !== 'all' && h.grupo !== categoriaFiltro) return false;
    if (q && !(h.nome || '').toLowerCase().includes(q)) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="fp-page">
    <div className="fp-card best best-auto">
      <BestPageHeader eyebrow={lang === 'en' ? 'BESTIARY' : 'BESTIÁRIO'} title={lang === 'en' ? 'Skills' : 'Habilidades'} />
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
        <div className="best-empty">{lang === 'en' ? `No skill matches "${query}".` : `Nenhuma habilidade corresponde a "${query}".`}</div>
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
                      </TableRow>
                      {isOpen && temDetalhe && (
                        <TableRow className="best-detail"><TableCell colSpan={6}>
                          {h.restricao && (
                            <div className="best-meta-list">
                              <div className="best-meta"><span className="best-meta-lbl">{lang === 'en' ? 'Restriction' : 'Restrição'}</span><span className="best-meta-val">{h.restricao}</span></div>
                            </div>
                          )}
                          {h.descricao && <p className="best-desc">{h.descricao}</p>}
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
    </div>
  );
}

/* ============================== [20] TecnicasList — Mestre vê todas as técnicas ============================== */
function TecnicasList({ ac, lang }) {
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

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data, error } = await supabaseClient.from('tecnicas').select('*').order('nome', { ascending: true });
      if (cancel) return;
      if (error) { setError(error.message); setTecnicas([]); } else { setTecnicas(data || []); }
    })();
    return () => { cancel = true; };
  }, []);
  useEffect(() => { setPage(1); setExpandida(null); }, [query, usoFiltro]);

  if (!Table) return <BestNoKit />;
  if (tecnicas === null) return <BestLoading text={lang === 'en' ? 'Loading techniques…' : 'Consultando os manuais de combate…'} />;
  if (error) return <BestErrorBox error={error} hint={lang === 'en' ? "Make sure the 'tecnicas' table exists in Supabase." : "Confira se a tabela 'tecnicas' existe no Supabase."} />;

  const usosDisponiveis = Array.from(new Set(tecnicas.map((t) => t.uso).filter(Boolean))).sort();

  const q = query.trim().toLowerCase();
  const filtered = (tecnicasSorted || []).filter((t) => {
    if (usoFiltro !== 'all' && t.uso !== usoFiltro) return false;
    if (q && !(t.nome || '').toLowerCase().includes(q)) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="fp-page">
    <div className="fp-card best best-auto">
      <BestPageHeader eyebrow={lang === 'en' ? 'BESTIARY' : 'BESTIÁRIO'} title={lang === 'en' ? 'Techniques' : 'Técnicas'} />
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
        <div className="best-empty">{lang === 'en' ? `No technique matches "${query}".` : `Nenhuma técnica corresponde a "${query}".`}</div>
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
                      </TableRow>
                      {isOpen && (
                        <TableRow className="best-detail"><TableCell colSpan={5}>
                          {t.permissao && <div className="best-permissao">{t.permissao}</div>}
                          {t.descricao && <p className="best-desc">{t.descricao}</p>}
                          {t.efeito && <p className="best-efeito">{lang === 'en' ? 'Effect' : 'Efeito'}: {t.efeito}</p>}
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
    </div>
  );
}

/* ============================== [21] ItensList — Mestre vê todos os itens ============================== */
function ItensList({ ac, lang }) {
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

  // Faixas de preço (valor_latao)
  const PRECO_FAIXAS = [
    { key: 'all',    label: lang === 'en' ? 'All prices' : 'Todos os preços', icon: 'ti-list',         min: 0,     max: Infinity },
    { key: 'gratis', label: lang === 'en' ? 'Free'        : 'Gratuito',        icon: 'ti-gift',         min: 0,     max: 0        },
    { key: 'barato', label: lang === 'en' ? '1–99'        : '1–99',            icon: 'ti-coin',         min: 1,     max: 99       },
    { key: 'medio',  label: lang === 'en' ? '100–999'     : '100–999',         icon: 'ti-coins',        min: 100,   max: 999      },
    { key: 'caro',   label: lang === 'en' ? '1 000–9 999' : '1.000–9.999',     icon: 'ti-cash',         min: 1000,  max: 9999     },
    { key: 'raro',   label: lang === 'en' ? '10 000+'     : '10.000+',         icon: 'ti-diamond',      min: 10000, max: Infinity },
  ];

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data, error } = await supabaseClient.from('itens').select('*').order('nome', { ascending: true });
      if (cancel) return;
      if (error) { setError(error.message); setItens([]); } else { setItens(data || []); }
    })();
    return () => { cancel = true; };
  }, []);
  useEffect(() => { setPage(1); setExpandida(null); }, [query, grupoFiltro, precoFiltro]);

  if (!Table) return <BestNoKit />;
  if (itens === null) return <BestLoading text={lang === 'en' ? 'Loading items…' : 'Consultando o inventário do mundo…'} />;
  if (error) return <BestErrorBox error={error} hint={lang === 'en' ? "Make sure the 'itens' table exists in Supabase." : "Confira se a tabela 'itens' existe no Supabase."} />;

  const gruposDisponiveis = Array.from(new Set(itens.map((i) => i.grupo).filter(Boolean))).sort();

  const q = query.trim().toLowerCase();
  const faixaAtiva = PRECO_FAIXAS.find((f) => f.key === precoFiltro) || PRECO_FAIXAS[0];
  const filtered = (itensSorted || []).filter((it) => {
    if (grupoFiltro !== 'all' && it.grupo !== grupoFiltro) return false;
    if (q && !(it.nome || '').toLowerCase().includes(q)) return false;
    if (precoFiltro !== 'all') {
      const v = it.valor_latao ?? 0;
      if (v < faixaAtiva.min || v > faixaAtiva.max) return false;
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="fp-page">
    <div className="fp-card best best-auto">
      <BestPageHeader eyebrow={lang === 'en' ? 'BESTIARY' : 'BESTIÁRIO'} title={lang === 'en' ? 'Items' : 'Itens'} />
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
        <div className="best-empty">{lang === 'en' ? `No item matches "${query}".` : `Nenhum item corresponde a "${query}".`}</div>
      ) : (
        <>
          <div className="best-table-wrap" ref={wrapRef}>
            <Table>
              <TableHeader><TableRow>
                <SortHead col='nome' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Name' : 'Nome'}</SortHead>
                <SortHead col='grupo' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Group' : 'Grupo'}</SortHead>
                <SortHead col='ocupa' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Storage' : 'Armazenamento'}</SortHead>
                <SortHead col='valor_latao' sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{lang === 'en' ? 'Value' : 'Valor'}</SortHead>
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
                      </TableRow>
                      {isOpen && (
                        <TableRow className="best-detail"><TableCell colSpan={4}>
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
                          {it.descricao && <p className="best-desc">{it.descricao}</p>}
                          {it.efeito && <p className="best-efeito">{it.efeito}</p>}
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
    </div>
  );
}

Object.assign(window, {
  CriaturasList, MagiasList, HabilidadesList,
  TecnicasList, ItensList,
});