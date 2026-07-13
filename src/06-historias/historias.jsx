/* ============================================================
   HISTÓRIAS — Mestre cria/edita/gerencia campanhas
   ============================================================
   Lado Mestre. Lista de histórias + ações (criar, editar,
   excluir, gerenciar loja, gerenciar convites).

   - HistoriasList                  — lista e cria histórias do mestre
   - HistoriaCard                   — card individual com ações
   - ConfirmarExclusaoHistoriaModal — confirma deleção (input do título)
   - GerenciarLojaView              — edita estoque_loja JSONB (página, não modal)
   - NovaHistoriaModal              — modal de criação/edição (multi-step)

   Depende de:
   - React (useState/useEffect/useMemo desestruturados localmente)
   - supabaseClient (01-core/supabase.jsx)
   - FANTASY_MONTHS, calcDiaSemanaFantasy (01-core)
   - ConvitesHistoriaModal (05-convites/convites.jsx)
   - Icon, FantasyDatePicker, CofreMoedas (ainda no app.jsx) —
     consumidos em runtime, sempre disponíveis quando os
     componentes renderizam

   Consumidores no app.jsx:
   - <HistoriasList />  — aba "Histórias" do console do Mestre

   Carregar depois de 05-convites/ e antes do app.jsx.
   ============================================================ */


/* ============================== [23] HistoriasList — Mestre cria/lista suas histórias ============================== */
function HistoriasList({ ac, t, lang, currentUserId, userProfile = null, mesaAtivaId = null, abrirNovaHistoriaRef, onDentroDeMenu }) {
  const th = t.historias;
  const { data: histData, isLoading: histLoading, error: histError, refetch } =
    window.useHistoriasData(currentUserId);
  const historias = histLoading ? null : (histData?.historias ?? []);
  const personagens = histData?.personagens ?? [];
  const criaturas = histData?.criaturas ?? [];
  const error = histError ? histError.message : null;

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);       // história em edição (objeto) ou null
  const [excluindo, setExcluindo] = useState(null);     // história alvo do confirm de delete ou null
  const [deleteError, setDeleteError] = useState(null);
  const [lojaAberta, setLojaAberta] = useState(null);  // história com loja aberta como página
  const [gerenciandoLore, setGerenciandoLore] = useState(null); // história sendo gerenciada no diário/lore
  const [gerenciandoConvites, setGerenciandoConvites] = useState(null); // história gerenciando convites
  const [batalhando, setBatalhando] = useState(null); // história com console de batalha aberto

  // Avisa o AdminConsole quando alguma view de página interna (loja/lore/
  // batalha/convites) está aberta, pra ele esconder o pill do topo (seletor
  // de mesa + "Nova história"). Esses controles só fazem sentido na tela
  // inicial — dentro de um menu interno da aventura eles desapareceriam, daí
  // não há mais risco de o pill mostrar uma mesa e o conteúdo abaixo mostrar
  // outra.
  const dentroDeMenu = !!(lojaAberta || gerenciandoLore || batalhando || gerenciandoConvites);
  useEffect(() => {
    if (onDentroDeMenu) onDentroDeMenu(dentroDeMenu);
  }, [dentroDeMenu, onDentroDeMenu]);

  const confirmarExclusao = async () => {
    if (!excluindo) return;
    setDeleteError(null);
    const { error } = await supabaseClient.from('historias').delete().eq('id', excluindo.id);
    if (error) {
      console.error('[historias] delete falhou:', error);
      setDeleteError(error.message);
    } else {
      setExcluindo(null);
      refetch();
    }
  };

  // Pausar/retomar: update direto client-side (RLS por mestre_id já permite),
  // mesmo padrão de estoque_loja/lore_ids — sem RPC. refetch() sincroniza o
  // valor com quem mais consumir historias (ex.: PersonagensList, que usa
  // pausada pra bloquear os botões dos cards de personagem vinculados).
  const togglePausar = async (h) => {
    const { error } = await supabaseClient
      .from('historias')
      .update({ pausada: !h.pausada })
      .eq('id', h.id);
    if (error) {
      console.error('[historias] pausar falhou:', error);
    } else {
      refetch();
    }
  };

  // Limite do plano free (mesma regra que existia no botão flutuante antigo).
  const limiteFree = userProfile?.plano === 'free' && (historias?.length ?? 0) >= 2;

  // Expõe abrir() via ref pro botão "Nova história" do pill do topo (shell.jsx)
  // acionar de fora — mesmo padrão de criarRef em batalha.jsx. Respeita o
  // limite do plano free aqui dentro, então o chamador não precisa saber da regra.
  useEffect(() => {
    if (abrirNovaHistoriaRef) {
      abrirNovaHistoriaRef.current = () => { if (!limiteFree) setModalOpen(true); };
    }
  }, [abrirNovaHistoriaRef, limiteFree]);

  if (historias === null) {
    return <div className="admin-loading"><span>{th.lista.carregando}</span></div>;
  }
  if (error) {
    return (
      <div className="admin-error">
        <div className="err-msg">{error}</div>
        <div className="admin-error-hint">
          {th.lista.erroTabela}
        </div>
      </div>
    );
  }

  // ── View de página: loja aberta substitui a lista inteira
  if (lojaAberta) {
    return (
      <GerenciarLojaView
        historia={lojaAberta}
        t={t}
        lang={lang}
        onClose={() => setLojaAberta(null)}
        onSaved={() => { setLojaAberta(null); refetch(); }}
      />
    );
  }

  // ── View de página: lore aberta substitui a lista inteira (mesmo padrão da loja)
  if (gerenciandoLore) {
    return (
      <GerenciarLoreView
        historia={gerenciandoLore}
        lang={lang}
        onClose={() => setGerenciandoLore(null)}
        onChanged={() => refetch()}
      />
    );
  }

  // ── View de página: console de batalha substitui a lista inteira (mesmo padrão da loja)
  if (batalhando) {
    return (
      <BatalhasHistoriaView
        historia={batalhando}
        personagens={personagens}
        criaturas={criaturas}
        lang={lang}
        currentUserId={currentUserId}
        onClose={() => setBatalhando(null)}
      />
    );
  }

  // ── View de página: convites abertos substitui a lista inteira (mesmo padrão da loja)
  if (gerenciandoConvites) {
    return (
      <ConvitesHistoriaView
        historia={gerenciandoConvites}
        t={t}
        lang={lang}
        onClose={() => setGerenciandoConvites(null)}
        onChanged={() => refetch()}
      />
    );
  }

  // Mostra apenas a história da mesa ativa (mesma fonte de mesaAtivaId usada
  // no resto do app — pill do topo, PersonagensList, CentralMensagens etc.).
  // Sem mesaAtivaId resolvido ainda (ex.: primeiro carregamento), mostra tudo
  // pra não esconder histórias enquanto o id sincroniza.
  const historiasFiltradas = mesaAtivaId
    ? historias.filter((h) => h.id === mesaAtivaId)
    : historias;

  return (
    <div className="hist">
      {historiasFiltradas.length === 0 ? (
        <div className="pjs-empty">
          <p>{th.lista.comecarAventura}</p>
        </div>
      ) : (
        <div className="hist-grid">
          {historiasFiltradas.map((h) => (
            <HistoriaCard
              key={h.id}
              h={h}
              personagens={personagens}
              t={t}
              lang={lang}
              onEdit={() => setEditando(h)}
              onDelete={() => setExcluindo(h)}
              onManageLoja={() => setLojaAberta(h)}
              onManageLore={() => setGerenciandoLore(h)}
              onManageConvites={() => setGerenciandoConvites(h)}
              onBatalhas={() => setBatalhando(h)}
              onTogglePausar={() => togglePausar(h)}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <NovaHistoriaModal
          t={t}
          lang={lang}
          personagens={personagens}
          criaturas={criaturas}
          currentUserId={currentUserId}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); refetch(); }}
        />
      )}

      {editando && (
        <NovaHistoriaModal
          t={t}
          lang={lang}
          personagens={personagens}
          criaturas={criaturas}
          currentUserId={currentUserId}
          historiaExistente={editando}
          onClose={() => setEditando(null)}
          onSaved={() => { setEditando(null); refetch(); }}
        />
      )}

      {excluindo && (
        <ConfirmarExclusaoHistoriaModal
          historia={excluindo}
          t={t}
          lang={lang}
          error={deleteError}
          onCancel={() => { setExcluindo(null); setDeleteError(null); }}
          onConfirm={confirmarExclusao}
        />
      )}

    </div>
  );
}

function HistoriaCard({ h, personagens, t, lang, onEdit, onDelete, onManageLoja, onManageLore, onManageConvites, onBatalhas, onTogglePausar }) {
  const th = t.historias;
  const protags = (h.protagonista_ids || [])
    .map((id) => personagens.find((x) => x.id === id))
    .filter(Boolean)
    .map((p) => `${p.nome}${p.sobrenome ? ' ' + p.sobrenome : ''}`);
  const qtdLoja = (() => {
    const el = h.estoque_loja;
    if (!el) return 0;
    if (Array.isArray(el)) return el.length;
    if (el && Array.isArray(el.comercios))
      return el.comercios.reduce((sum, c) => sum + (Array.isArray(c.itens) ? c.itens.length : 0), 0);
    return 0;
  })();
  const en = lang === 'en';
  const [tip, abrirTip, fecharTip, manterTip] = useTooltip(60);
  // Antes era só um useState local (nunca persistia, resetava a cada render).
  // Agora vem direto da coluna historias.pausada — refetch() no toggle mantém sincronizado.
  const pausada = !!h.pausada;
  return (
    <article className="hist-card">
      <header className="hist-card-head">

        {/* Botões de contexto (esquerda) */}
        {(onBatalhas || onManageConvites || onManageLore || onManageLoja) && (
          <div className="hist-card-actions">
            {onBatalhas && (
              <button className="btn-icon btn-sm" onClick={onBatalhas} aria-label={th.card.batalhas}
                onMouseEnter={(e) => abrirTip(e, th.card.batalhas)} onMouseLeave={fecharTip}>
                <i className="ti ti-swords" />
              </button>
            )}
            {onManageConvites && (
              <button className="btn-icon btn-sm" onClick={onManageConvites} aria-label={th.card.convites}
                onMouseEnter={(e) => abrirTip(e, th.card.convites)} onMouseLeave={fecharTip}>
                <i className="ti ti-mail" />
              </button>
            )}
            {onManageLore && (
              <button className="btn-icon btn-sm" onClick={onManageLore} aria-label={th.card.lore}
                onMouseEnter={(e) => abrirTip(e, th.card.loreTip)} onMouseLeave={fecharTip}>
                <i className="ti ti-book" />
              </button>
            )}
            {onManageLoja && (
              <button className="btn-icon btn-sm" onClick={onManageLoja} aria-label={th.card.loja}
                onMouseEnter={(e) => abrirTip(e, interpolate(th.card.lojaTip, { qtd: qtdLoja }))} onMouseLeave={fecharTip}>
                <i className="ti ti-shopping-bag" />
              </button>
            )}
          </div>
        )}

        {/* Título + protagonistas em linha (sem data, sem eyebrow) */}
        <div className="hist-card-head-main">
          <div className="hist-title">
            {h.titulo}
            {pausada && (
              <span className="hist-pausada-badge">
                {en ? 'Paused' : 'Pausada'}
              </span>
            )}
          </div>
          {protags.length > 0 && (
            <div className="hist-card-protags">
              {protags.join(' · ')}
            </div>
          )}
          {h.introducao && (
            <div className="hist-card-intro">
              {h.introducao.split(/\n+/).map((par, i) => (
                <p key={i}>{par}</p>
              ))}
            </div>
          )}
        </div>

        {/* Ações à direita (topo direito absoluto): pausar/iniciar · editar · excluir */}
        {(onEdit || onDelete) && (
          <div className="hist-card-actions hist-card-actions--right">
            {onEdit && onTogglePausar && (
              <button className="btn-icon btn-sm" onClick={onTogglePausar}
                aria-label={pausada ? (en ? 'Resume story' : 'Iniciar aventura') : (en ? 'Pause story' : 'Pausar aventura')}
                onMouseEnter={(e) => abrirTip(e, pausada ? (en ? 'Resume' : 'Iniciar') : (en ? 'Pause' : 'Pausar'))} onMouseLeave={fecharTip}>
                <i className={pausada ? 'ti ti-player-play' : 'ti ti-player-pause'} />
              </button>
            )}
            {onEdit && (
              <button className="btn-icon btn-sm" onClick={onEdit} aria-label={th.card.editar}
                onMouseEnter={(e) => abrirTip(e, th.card.editar)} onMouseLeave={fecharTip}>
                <i className="ti ti-pencil" />
              </button>
            )}
            {onDelete && (
              <button className="btn-icon btn-danger btn-sm" onClick={onDelete} aria-label={th.card.excluir}
                onMouseEnter={(e) => abrirTip(e, th.card.excluir)} onMouseLeave={fecharTip}>
                <i className="ti ti-trash" />
              </button>
            )}
            <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
          </div>
        )}

      </header>
    </article>
  );
}

// Modal de confirmação para excluir uma história
function ConfirmarExclusaoHistoriaModal({ historia, t, lang, error, onCancel, onConfirm }) {
  const th = t.historias;
  return (
    <ModalShell
      title={th.excluirModal.titulo}
      lang={lang}
      size="sm"
      onClose={onCancel}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmLabel={th.excluirModal.confirmar}
    >
      <p className="subhead">
        {interpolate(th.excluirModal.aviso, { titulo: historia.titulo })}
      </p>
      {error && <div className="err-msg">{error}</div>}
    </ModalShell>
  );
}

/* ============================== [24] Gerenciar Loja ============================== */
// Helpers locais (mesma implementação do bestiário — src/09-bestiario/bestiario.jsx —
// copiados para evitar dependência de runtime entre fases; bestiario.jsx não expõe
// essas funções no window). Mantém o padrão visual "Pedra & Bronze" (.best/.best-chip/
// .best-table-wrap etc, CSS em index.css seção "BESTIÁRIO (09)") consistente entre as
// duas telas. Qualquer ajuste nesse molde deve ser replicado nos dois arquivos.

/* ── Tooltip de chip — aparece abaixo do elemento, padrão Pedra & Bronze ── */
function useBestTip() {
  const [tip, setTip] = useState(null);
  const timerRef = useRef(null);
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

/* ── Mapa de ícones Tabler por grupo de item — mesmo mapa do bestiário (ItensList) ── */
const LOJA_CHIP_ICON = {
  all:           'ti-list',
  Animais:       'ti-paw',
  Armaduras:     'ti-shield',
  Armas:         'ti-sword',
  'Consumíveis': 'ti-bottle',
  Diario:        'ti-notebook',
  Instrumentos:  'ti-music',
  Itens:         'ti-box',
  Minerais:      'ti-gem',
  Moedas:        'ti-coin',
  Propriedades:  'ti-home',
  Recipientes:   'ti-bucket',
  'Serviços':    'ti-tools',
  Transportes:   'ti-horse',
  Vestimentas:   'ti-shirt',
};

/* ── ChipIcon — chip que mostra só ícone + tooltip abaixo ── */
function ChipIcon({ value, label, active, onClick }) {
  const [tip, showTip, hideTip] = useBestTip();
  const icon = LOJA_CHIP_ICON[value] || 'ti-tag';
  return (
    <>
      <button
        type="button"
        className={'best-chip best-chip--icon' + (active ? ' is-active' : '')}
        onClick={onClick}
        onMouseEnter={(e) => showTip(e, label)}
        onMouseLeave={hideTip}
        aria-label={label}
        title="">
        <i className={'ti ' + icon} aria-hidden="true" />
      </button>
      <BestTip tip={tip} />
    </>
  );
}

/* Ordenação por clique no cabeçalho — mesma lógica do bestiário (useSort). */
function useLojaSort(data, fields) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const toggleSort = (key) => {
    setSortKey((prev) => { if (prev === key) { setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); return key; } setSortDir('asc'); return key; });
  };
  const sorted = useMemo(() => {
    if (!sortKey || !data) return data || [];
    return [...data].sort((a, b) => {
      const get = fields && fields[sortKey] ? fields[sortKey] : (row) => row[sortKey];
      const va = get(a) ?? '';
      const vb = get(b) ?? '';
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'pt-BR', { sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, fields]);
  return { sorted, sortKey, sortDir, toggleSort };
}

/* Cabeçalho clicável com indicador de ordenação — mesmo visual do bestiário (SortHead). */
function LojaSortHead({ col, sortKey, sortDir, toggleSort, children, ...rest }) {
  const active = sortKey === col;
  return (
    <th onClick={() => toggleSort(col)} className="loja-sort-th" {...rest}>
      <span>
        {children}
        <span className="loja-sort-indicator" style={{ opacity: active ? 1 : 0.3, color: active ? '#9A7B2E' : 'inherit' }}>
          {active && sortDir === 'desc' ? '▼' : '▲'}
        </span>
      </span>
    </th>
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

function LojaPagePagination({ page, safePage, totalPages, setPage, lang }) {
  const en = lang === 'en';
  const items = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
    .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('\u2026'); acc.push(p); return acc; }, []);
  return (
    <div className="best-pag">
      <button className="best-page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} title={en ? 'Previous' : 'Anterior'}>‹</button>
      {items.map((p, idx) => p === '\u2026'
        ? <span key={`ell-${idx}`} className="best-page-ellipsis">…</span>
        : <button key={p} className={'best-page-btn' + (p === safePage ? ' is-active' : '')} onClick={() => setPage(p)}>{p}</button>)}
      <button className="best-page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} title={en ? 'Next' : 'Pr\u00f3xima'}>›</button>
    </div>
  );
}

// Helper local: converte latões em texto por extenso (ex: "2 moedas de prata")
// Usa latoesToMoedas de 01-core/inventario-helpers.jsx (global).
function precoTextoLoja(latao, en) {
  if (!latao || latao <= 0) return en ? 'Free' : 'Grátis';
  const fn = typeof latoesToMoedas === 'function' ? latoesToMoedas : (typeof window.latoesToMoedas === 'function' ? window.latoesToMoedas : null);
  if (!fn) return String(latao);
  const m = fn(Math.round(latao));
  const nomes = en
    ? { ouro: 'gold coin', prata: 'silver coin', cobre: 'copper coin', latao: 'brass coin' }
    : { ouro: 'moeda de ouro', prata: 'moeda de prata', cobre: 'moeda de cobre', latao: 'moeda de latão' };
  const ordem = ['ouro', 'prata', 'cobre', 'latao'];
  const parts = ordem.filter((t) => m[t] > 0).map((t) => {
    const n = m[t];
    const nome = en
      ? (n > 1 ? nomes[t] + 's' : nomes[t])
      : (n > 1 ? nomes[t].replace('moeda', 'moedas') : nomes[t]);
    return `${n} ${nome}`;
  });
  if (!parts.length) return en ? 'Free' : 'Grátis';
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(', ') + (en ? ' and ' : ' e ') + parts[parts.length - 1];
}

// ── migrarEstoqueLoja — normaliza formato antigo (array flat) para o novo
// (objeto com array de comércios). Idempotente.
// Formato novo: { comercios: [{id, nome, ativo, itens:[{entryId,slug,...}]}] }
function migrarEstoqueLoja(raw) {
  if (!raw) return { comercios: [] };
  // Já no formato novo
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && Array.isArray(raw.comercios)) {
    return raw;
  }
  // Formato legado: array flat de entradas → migra para 1 comércio padrão "Estoque"
  const itens = Array.isArray(raw) ? raw : [];
  return {
    comercios: itens.length > 0
      ? [{ id: novoInstanceId(), nome: 'Estoque', ativo: true, itens }]
      : [],
  };
}

// v4 — múltiplos comércios (barra lateral) + toggle habilitar/desabilitar.
function GerenciarLojaView({ historia, t: tc, lang, onClose, onSaved }) {
  const tl = tc.historias.loja;
  const en = lang === 'en';
  const { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Input } = (typeof UI !== 'undefined' ? UI : {});

  // ── Estado principal: { comercios: [{id, nome, ativo, itens:[]}] }
  const [lojaData, setLojaData] = useState(() => migrarEstoqueLoja(historia.estoque_loja));

  // Comércio selecionado no sidebar
  const [comercioSelId, setComercioSelId] = useState(() => {
    const d = migrarEstoqueLoja(historia.estoque_loja);
    return d.comercios.length > 0 ? d.comercios[0].id : null;
  });

  // Modal de criação/renomear comércio
  const [modalComercio, setModalComercio] = useState(null); // null | 'criar' | {id, nome} (editar)
  const [nomeComercioInput, setNomeComercioInput] = useState('');
  // Modal de confirmação de remoção de comércio
  const [confirmRemoverComercio, setConfirmRemoverComercio] = useState(null); // null | id

  const [catalogo, setCatalogo] = useState(null);
  const [busca, setBusca] = useState('');
  const [buscaEstoque, setBuscaEstoque] = useState('');
  const [grupoFiltro, setGrupoFiltro] = useState('');
  const [grupoFiltroEstoque, setGrupoFiltroEstoque] = useState('');
  const [escolhido, setEscolhido] = useState(null);
  const [precoOverride, setPrecoOverride] = useState('');
  const [estoqueInicial, setEstoqueInicial] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [abaLoja, setAbaLoja] = useState('catalogo');
  const buscaRef = useRef(null);
  const catListRef = useRef(null);
  const [pageEstoque, setPageEstoque] = useState(1);
  const estoqueWrapRef = useRef(null);
  const [pageCat, setPageCat] = useState(1);
  const catWrapRef = useRef(null);

  // ── Comércio atualmente selecionado (objeto)
  const comercioSel = useMemo(
    () => lojaData.comercios.find((c) => c.id === comercioSelId) || null,
    [lojaData.comercios, comercioSelId]
  );

  // Itens do comércio selecionado
  const estoque = comercioSel?.itens || [];

  // ── Helpers para mutação do lojaData ──────────────────────────────────────────
  const mutarComercio = (id, fn) => {
    setLojaData((prev) => ({
      ...prev,
      comercios: prev.comercios.map((c) => c.id === id ? { ...c, ...fn(c) } : c),
    }));
  };

  // Carrega catálogo completo uma vez
  useEffect(() => {
    (async () => {
      const { data, error } = await fetchCatalogoCompleto();
      if (error) setError(error.message);
      else setCatalogo(data || []);
    })();
  }, []);

  useEffect(() => {
    if (catalogo && buscaRef.current) buscaRef.current.focus();
  }, [catalogo !== null]);

  useEffect(() => {
    if (catListRef.current) catListRef.current.scrollTop = 0;
    setPageCat(1);
    setEscolhido(null);
  }, [busca, grupoFiltro]);

  useEffect(() => { setPageEstoque(1); }, [buscaEstoque, grupoFiltroEstoque]);

  useEffect(() => {
    setEscolhido(null);
    setPrecoOverride('');
    setEstoqueInicial('');
  }, [grupoFiltro]);

  // Reseta busca e seleção ao trocar de comércio
  useEffect(() => {
    setBusca('');
    setBuscaEstoque('');
    setGrupoFiltro('');
    setGrupoFiltroEstoque('');
    setEscolhido(null);
    setPageCat(1);
    setPageEstoque(1);
    setAbaLoja('catalogo');
  }, [comercioSelId]);

  const PAGE_SIZE_ESTOQUE = 7;
  const PAGE_SIZE_CAT     = 7;

  const catalogoBySlug = useMemo(() => {
    const map = {};
    (catalogo || []).forEach((it) => { map[it.slug] = it; });
    return map;
  }, [catalogo]);

  const grupos = useMemo(
    () => catalogo
      ? Array.from(new Set(catalogo.map((i) => i.grupo).filter(Boolean))).sort()
      : [],
    [catalogo]
  );

  const gruposEstoque = useMemo(
    () => Array.from(new Set(
      estoque.map((e) => catalogoBySlug[e.slug]?.grupo).filter(Boolean)
    )).sort(),
    [estoque, catalogoBySlug]
  );

  const {
    sorted: estoqueSorted, sortKey: sortKeyEstoque, sortDir: sortDirEstoque, toggleSort: toggleSortEstoque,
  } = useLojaSort(estoque, {
    nome:    (e) => catalogoBySlug[e.slug]?.nome || e.slug,
    preco:   (e) => e.preco_latao_override != null ? e.preco_latao_override : (catalogoBySlug[e.slug]?.valor_latao ?? 0),
    estoque: (e) => e.estoque == null ? Infinity : e.estoque,
  });

  const {
    sorted: catalogoSorted, sortKey: sortKeyCat, sortDir: sortDirCat, toggleSort: toggleSortCat,
  } = useLojaSort(catalogo, { nome: (it) => it.nome, preco: (it) => it.valor_latao ?? 0 });

  const normalize = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const termos = useMemo(() => normalize(busca).split(/\s+/).filter(Boolean), [busca]);
  const termosEstoque = useMemo(() => normalize(buscaEstoque).split(/\s+/).filter(Boolean), [buscaEstoque]);

  const filtrados = useMemo(() => {
    if (!catalogoSorted) return [];
    return catalogoSorted.filter((it) => {
      if (grupoFiltro && it.grupo !== grupoFiltro) return false;
      if (termos.length === 0) return true;
      const nome = normalize(it.nome);
      const desc = normalize(it.descricao || '');
      const orig = normalize(it.origem || '');
      return termos.every((t) => nome.includes(t) || desc.includes(t) || orig.includes(t));
    });
  }, [catalogoSorted, grupoFiltro, termos]);

  const estoqueFiltrado = useMemo(() => {
    return (estoqueSorted || []).filter((e) => {
      const cat = catalogoBySlug[e.slug];
      if (grupoFiltroEstoque && cat?.grupo !== grupoFiltroEstoque) return false;
      if (termosEstoque.length === 0) return true;
      const nome = normalize(cat?.nome || e.slug);
      return termosEstoque.every((t) => nome.includes(t));
    });
  }, [estoqueSorted, termosEstoque, catalogoBySlug, grupoFiltroEstoque]);

  const matchCampo = (it) => {
    if (termos.length === 0) return null;
    if (termos.every((t) => normalize(it.nome).includes(t))) return null;
    if (termos.every((t) => normalize(it.descricao || '').includes(t))) return 'descricao';
    if (termos.every((t) => normalize(it.origem || '').includes(t))) return 'origem';
    return 'misto';
  };

  const totalPagesEstoque = Math.max(1, Math.ceil(estoqueFiltrado.length / PAGE_SIZE_ESTOQUE));
  const safePageEstoque   = Math.min(pageEstoque, totalPagesEstoque);
  const estoqueSlice      = estoqueFiltrado.slice((safePageEstoque - 1) * PAGE_SIZE_ESTOQUE, safePageEstoque * PAGE_SIZE_ESTOQUE);
  const totalPagesCat     = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE_CAT));
  const safePageCat       = Math.min(pageCat, totalPagesCat);
  const filtradosSlice    = filtrados.slice((safePageCat - 1) * PAGE_SIZE_CAT, safePageCat * PAGE_SIZE_CAT);

  const selecionarItem = (it) => {
    if (escolhido?.slug === it.slug) {
      setEscolhido(null); setPrecoOverride(''); setEstoqueInicial('');
    } else {
      setEscolhido(it); setPrecoOverride(''); setEstoqueInicial('');
    }
  };

  // Adicionar item ao comércio selecionado
  const adicionarAoEstoque = () => {
    if (!escolhido || !comercioSelId) return;
    const novaEntrada = {
      entryId: novoInstanceId(),
      slug: escolhido.slug,
      preco_latao_override: precoOverride === '' ? null : Math.max(0, parseInt(precoOverride, 10) || 0),
      estoque: estoqueInicial === '' ? null : Math.max(0, parseInt(estoqueInicial, 10) || 0),
    };
    mutarComercio(comercioSelId, (c) => ({ itens: [...c.itens, novaEntrada] }));
    setEscolhido(null); setPrecoOverride(''); setEstoqueInicial('');
  };

  const removerEntrada = (entryId) => {
    if (!comercioSelId) return;
    mutarComercio(comercioSelId, (c) => ({ itens: c.itens.filter((e) => e.entryId !== entryId) }));
  };

  // Toggle habilitar/desabilitar comércio
  const toggleAtivo = (id) => {
    setLojaData((prev) => ({
      ...prev,
      comercios: prev.comercios.map((c) => c.id === id ? { ...c, ativo: !c.ativo } : c),
    }));
  };

  // Criar comércio novo
  const criarComercio = () => {
    const nome = nomeComercioInput.trim();
    if (!nome) return;
    const novoId = novoInstanceId();
    setLojaData((prev) => ({
      ...prev,
      comercios: [...prev.comercios, { id: novoId, nome, ativo: true, itens: [] }],
    }));
    setComercioSelId(novoId);
    setModalComercio(null);
    setNomeComercioInput('');
  };

  // Renomear comércio
  const renomearComercio = () => {
    const nome = nomeComercioInput.trim();
    if (!nome || !modalComercio?.id) return;
    mutarComercio(modalComercio.id, () => ({ nome }));
    setModalComercio(null);
    setNomeComercioInput('');
  };

  // Remover comércio (e seus itens)
  const removerComercio = (id) => {
    setLojaData((prev) => {
      const restantes = prev.comercios.filter((c) => c.id !== id);
      return { ...prev, comercios: restantes };
    });
    if (comercioSelId === id) {
      setComercioSelId((prev) => {
        const restantes = lojaData.comercios.filter((c) => c.id !== id);
        return restantes.length > 0 ? restantes[0].id : null;
      });
    }
    setConfirmRemoverComercio(null);
  };

  const salvar = async () => {
    setSaving(true);
    setError(null);
    const { error } = await supabaseClient
      .from('historias')
      .update({ estoque_loja: lojaData })
      .eq('id', historia.id);
    setSaving(false);
    if (error) {
      console.error('[loja] save falhou:', error);
      setError(error.message);
    } else {
      onSaved();
    }
  };

  if (!Table) {
    return (
      <div className="loja-mng-v3-page">
        <div className="fp-card-top">
          <header className="ms-header loja-mng-v3-page-header">
            <button type="button" className="btn-icon btn-sm" onClick={onClose} aria-label={en ? 'Back to stories' : 'Voltar às histórias'}>
              <i className="ti ti-arrow-left" />
            </button>
            <h2 className="ms-title">{historia.titulo}</h2>
          </header>
        </div>
        <div className="loja-mng-v3-fallback">
          Componentes do kit não carregados. Confira o <code>src/components/ui-bridge.ts</code> e o import dele no <code>main.tsx</code>.
        </div>
      </div>
    );
  }

  return (
    <div className="loja-mng-v3-page">
      <div className="fp-card-top">
        <header className="ms-header loja-mng-v3-page-header">
          <button
            type="button"
            className="btn-icon btn-sm"
            onClick={onClose}
            aria-label={en ? 'Back to stories' : 'Voltar às histórias'}>
            <i className="ti ti-arrow-left" />
          </button>
          <div className="loja-mng-v3-header-content">
            <div className="loja-mng-v3-page-eyebrow">
              <i className="ti ti-shopping-bag" aria-hidden="true" />
              {historia.titulo}
            </div>
            <h2 className="ms-title">{tl.shop}</h2>
          </div>
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={salvar}
            disabled={saving}>
            {saving ? tl.saving : tl.save}
          </button>
        </header>
      </div>

      {/* Modal de criar/renomear comércio */}
        {modalComercio && (
          <div className="loja-comercio-modal-backdrop" onClick={() => { setModalComercio(null); setNomeComercioInput(''); }}>
            <div className="loja-comercio-modal" onClick={(e) => e.stopPropagation()}>
              <div className="loja-comercio-modal-title">
                {modalComercio === 'criar'
                  ? (en ? 'New commerce' : 'Novo comércio')
                  : (en ? 'Rename commerce' : 'Renomear comércio')}
              </div>
              <input
                className="loja-comercio-modal-input"
                type="text"
                autoFocus
                placeholder={en ? 'e.g. Tavern of Saravossa' : 'ex: Taverna de Saravossa'}
                value={nomeComercioInput}
                onChange={(e) => setNomeComercioInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') modalComercio === 'criar' ? criarComercio() : renomearComercio();
                  if (e.key === 'Escape') { setModalComercio(null); setNomeComercioInput(''); }
                }}
                maxLength={60}
              />
              <div className="loja-comercio-modal-actions">
                <button type="button" className="btn-ghost btn-sm" onClick={() => { setModalComercio(null); setNomeComercioInput(''); }}>
                  {en ? 'Cancel' : 'Cancelar'}
                </button>
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  disabled={!nomeComercioInput.trim()}
                  onClick={modalComercio === 'criar' ? criarComercio : renomearComercio}>
                  {modalComercio === 'criar' ? (en ? 'Create' : 'Criar') : (en ? 'Rename' : 'Renomear')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmação de remoção */}
        {confirmRemoverComercio && (() => {
          const c = lojaData.comercios.find((x) => x.id === confirmRemoverComercio);
          return (
            <div className="loja-comercio-modal-backdrop" onClick={() => setConfirmRemoverComercio(null)}>
              <div className="loja-comercio-modal" onClick={(e) => e.stopPropagation()}>
                <div className="loja-comercio-modal-title" style={{ color: '#E57373' }}>
                  {en ? 'Remove commerce?' : 'Remover comércio?'}
                </div>
                <p className="loja-comercio-modal-desc">
                  {en
                    ? `"${c?.nome}" and all its items will be permanently removed.`
                    : `"${c?.nome}" e todos os seus itens serão removidos permanentemente.`}
                </p>
                <div className="loja-comercio-modal-actions">
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setConfirmRemoverComercio(null)}>
                    {en ? 'Cancel' : 'Cancelar'}
                  </button>
                  <button type="button" className="btn-danger btn-sm" onClick={() => removerComercio(confirmRemoverComercio)}>
                    {en ? 'Remove' : 'Remover'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        <div className="loja-mng-v3-page-body">
          {catalogo === null ? (
            <div className="admin-loading"><span>{tl.loading}</span></div>
          ) : (
            <div className="loja-mng-v4-layout">

              {/* ══════ SIDEBAR — lista de comércios ══════ */}
              <aside className="loja-mng-v4-sidebar">
                <div className="loja-mng-v4-sidebar-header">
                  <span className="loja-mng-v4-sidebar-title">
                    <i className="ti ti-store" aria-hidden="true" />
                    {en ? 'Commerces' : 'Comércios'}
                  </span>
                  <button
                    type="button"
                    className="btn-icon btn-sm"
                    title={en ? 'New commerce' : 'Novo comércio'}
                    aria-label={en ? 'New commerce' : 'Novo comércio'}
                    onClick={() => { setNomeComercioInput(''); setModalComercio('criar'); }}>
                    <i className="ti ti-plus" aria-hidden="true" />
                  </button>
                </div>

                {lojaData.comercios.length === 0 ? (
                  <div className="loja-mng-v4-sidebar-empty">
                    <i className="ti ti-store-off" aria-hidden="true" />
                    <span>{en ? 'No commerces yet' : 'Nenhum comércio ainda'}</span>
                  </div>
                ) : (
                  <ul className="loja-mng-v4-sidebar-list">
                    {lojaData.comercios.map((c) => (
                      <li
                        key={c.id}
                        className={'loja-mng-v4-sidebar-item' + (c.id === comercioSelId ? ' is-active' : '') + (!c.ativo ? ' is-disabled' : '')}
                        onClick={() => setComercioSelId(c.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setComercioSelId(c.id)}>

                        {/* Ícone de status (ativo/oculto) */}
                        <span
                          className={'loja-mng-v4-status-dot' + (c.ativo ? ' is-ativo' : ' is-oculto')}
                          title={c.ativo
                            ? (en ? 'Visible to players' : 'Visível para jogadores')
                            : (en ? 'Hidden from players' : 'Oculto dos jogadores')}
                          aria-label={c.ativo ? (en ? 'Enabled' : 'Habilitado') : (en ? 'Disabled' : 'Desabilitado')} />

                        <span className="loja-mng-v4-sidebar-nome">{c.nome}</span>
                        <span className="loja-mng-v4-sidebar-count">{c.itens.length}</span>

                        {/* Ações: toggle + renomear + remover — visíveis no hover */}
                        <span className="loja-mng-v4-sidebar-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className={'btn-icon btn-sm loja-mng-v4-toggle-btn' + (c.ativo ? ' is-ativo' : '')}
                            title={c.ativo
                              ? (en ? 'Hide from players' : 'Ocultar dos jogadores')
                              : (en ? 'Show to players' : 'Mostrar para jogadores')}
                            aria-label={c.ativo ? (en ? 'Disable' : 'Desabilitar') : (en ? 'Enable' : 'Habilitar')}
                            onClick={() => toggleAtivo(c.id)}>
                            <i className={'ti ' + (c.ativo ? 'ti-eye' : 'ti-eye-off')} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="btn-icon btn-sm"
                            title={en ? 'Rename' : 'Renomear'}
                            aria-label={en ? 'Rename' : 'Renomear'}
                            onClick={() => { setNomeComercioInput(c.nome); setModalComercio({ id: c.id, nome: c.nome }); }}>
                            <i className="ti ti-pencil" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="btn-icon btn-sm loja-mng-v4-remove-btn"
                            title={en ? 'Remove commerce' : 'Remover comércio'}
                            aria-label={en ? 'Remove commerce' : 'Remover comércio'}
                            onClick={() => setConfirmRemoverComercio(c.id)}>
                            <i className="ti ti-trash" aria-hidden="true" />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </aside>

              {/* ══════ PAINEL PRINCIPAL ══════ */}
              <div className="loja-mng-v4-main">
                {!comercioSel ? (
                  <div className="loja-mng-v4-no-sel">
                    <i className="ti ti-store" aria-hidden="true" />
                    <span>
                      {lojaData.comercios.length === 0
                        ? (en ? 'Create a commerce to start adding items.' : 'Crie um comércio para começar a adicionar itens.')
                        : (en ? 'Select a commerce on the left.' : 'Selecione um comércio à esquerda.')}
                    </span>
                    {lojaData.comercios.length === 0 && (
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        style={{ marginTop: 12 }}
                        onClick={() => { setNomeComercioInput(''); setModalComercio('criar'); }}>
                        <i className="ti ti-plus" aria-hidden="true" />
                        {en ? ' New commerce' : ' Novo comércio'}
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Cabeçalho do comércio selecionado com badge de status */}
                    <div className="loja-mng-v4-comercio-header">
                      <span className="loja-mng-v4-comercio-nome">
                        {comercioSel.nome}
                      </span>
                      <span
                        className={'loja-mng-v4-status-badge' + (comercioSel.ativo ? ' is-ativo' : ' is-oculto')}
                        onClick={() => toggleAtivo(comercioSel.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleAtivo(comercioSel.id)}
                        title={comercioSel.ativo
                          ? (en ? 'Click to hide from players' : 'Clique para ocultar dos jogadores')
                          : (en ? 'Click to show to players' : 'Clique para mostrar para jogadores')}>
                        <i className={'ti ' + (comercioSel.ativo ? 'ti-eye' : 'ti-eye-off')} aria-hidden="true" />
                        {comercioSel.ativo
                          ? (en ? 'Visible to players' : 'Visível para jogadores')
                          : (en ? 'Hidden from players' : 'Oculto dos jogadores')}
                      </span>
                    </div>

                    {/* Tabs catálogo / estoque */}
                    <div className="loja-mng-v3-tabs">
                      <button
                        type="button"
                        className={'loja-mng-v3-tab' + (abaLoja === 'catalogo' ? ' is-active' : '')}
                        onClick={() => setAbaLoja('catalogo')}>
                        {en ? 'Catalogue' : 'Catálogo'}
                        <span className="loja-mng-v3-tab-badge">{filtrados.length}</span>
                      </button>
                      <button
                        type="button"
                        className={'loja-mng-v3-tab' + (abaLoja === 'estoque' ? ' is-active' : '')}
                        onClick={() => setAbaLoja('estoque')}>
                        {en ? 'Stock' : 'Estoque'}
                        <span className="loja-mng-v3-tab-badge">{estoque.length}</span>
                      </button>
                    </div>

                    <div className="loja-mng-v3-grid">

                      {/* ── CATÁLOGO ── */}
                      <section className="loja-mng-v3-panel loja-mng-v3-panel--cat" style={{ display: abaLoja === 'catalogo' ? 'flex' : 'none' }}>
                        <div className="loja-mng-v3-toolbar" style={{ paddingBottom: grupoFiltro !== '' ? 20 : undefined }}>
                          <div className="loja-mng-v3-search">
                            <i className="ti ti-search" aria-hidden="true" />
                            <input
                              ref={buscaRef}
                              type="search"
                              placeholder={tl.search}
                              value={busca}
                              onChange={(e) => setBusca(e.target.value)} />
                            {busca && (
                              <button type="button" className="loja-mng-v3-search-clear" onClick={() => setBusca('')} aria-label={tl.clear}>
                                <i className="ti ti-x" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                          <div className="best-chips loja-mng-v3-chips">
                            <ChipIcon value="all" label={tl.allGroups} active={grupoFiltro === ''} onClick={() => setGrupoFiltro('')} />
                            {grupos.map((g) => (
                              <ChipIcon key={g} value={g} label={g} active={grupoFiltro === g} onClick={() => setGrupoFiltro(g)} />
                            ))}
                          </div>
                        </div>

                        {escolhido && (
                          <div className="loja-mng-v3-drawer" role="region" aria-label={en ? 'Add' : 'Adicionar'}>
                            <div className="loja-mng-v3-drawer-nome">
                              {escolhido.nome}
                              {escolhido.descricao && (
                                <span className="loja-mng-v3-drawer-desc"> — {escolhido.descricao}</span>
                              )}
                            </div>
                            {/* Badge mostrando destino */}
                            <div className="loja-mng-v4-drawer-destino">
                              <i className="ti ti-store" aria-hidden="true" />
                              {en ? `Adding to: ` : `Adicionando em: `}
                              <strong>{comercioSel.nome}</strong>
                            </div>
                            <div className="loja-mng-v3-drawer-fields">
                              <label className="loja-mng-v3-drawer-field">
                                <input
                                  type="number" min="0"
                                  placeholder={String(escolhido.valor_latao ?? 0)}
                                  value={precoOverride}
                                  onChange={(e) => setPrecoOverride(e.target.value)} />
                              </label>
                              <label className="loja-mng-v3-drawer-field">
                                <input
                                  type="number" min="0"
                                  placeholder={tl.stock || '∞'}
                                  value={estoqueInicial}
                                  onChange={(e) => setEstoqueInicial(e.target.value)} />
                              </label>
                              <div className="loja-mng-v3-drawer-actions">
                                <button type="button" className="btn-ghost btn-sm"
                                  onClick={() => { setEscolhido(null); setPrecoOverride(''); setEstoqueInicial(''); }}>
                                  {tl.cancel || (en ? 'Cancel' : 'Cancelar')}
                                </button>
                                <button type="button" className="btn-primary btn-sm" onClick={adicionarAoEstoque}>
                                  {tl.addToShop}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="loja-mng-v3-cat-list best best-auto" ref={catWrapRef} style={{ paddingBottom: totalPagesCat <= 1 ? 20 : 0 }}>
                          {filtrados.length === 0 ? (
                            <div className="best-empty">{tl.none}</div>
                          ) : (
                            <>
                              <div className="best-table-wrap" ref={catListRef}>
                                <Table>
                                  <TableHeader><TableRow>
                                    <LojaSortHead col="nome" sortKey={sortKeyCat} sortDir={sortDirCat} toggleSort={toggleSortCat}>{en ? 'Item' : 'Item'}</LojaSortHead>
                                    <LojaSortHead col="preco" sortKey={sortKeyCat} sortDir={sortDirCat} toggleSort={toggleSortCat}>{en ? 'Price' : 'Preço'}</LojaSortHead>
                                  </TableRow></TableHeader>
                                  <TableBody>
                                    {filtradosSlice.map((it) => {
                                      const mc = matchCampo(it);
                                      const sel = escolhido?.slug === it.slug;
                                      return (
                                        <TableRow key={it.slug} className={sel ? 'on' : ''} onClick={() => selecionarItem(it)} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && selecionarItem(it)}>
                                          <TableCell className="loja-mng-v3-td--nome">
                                            <span className="loja-mng-v3-row-grupo">{it.grupo || '—'}</span>
                                            <span className="best-name">
                                              {it.nome}
                                              {mc && <span className={'loja-mng-v3-match loja-mng-v3-match--' + mc}>{' '}({mc === 'descricao' ? tl.inDesc : mc === 'origem' ? tl.inOrig : tl.inDetails})</span>}
                                            </span>
                                          </TableCell>
                                          <TableCell className="loja-mng-v3-td--preco">{precoTextoLoja(it.valor_latao ?? 0, en)}</TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                              {totalPagesCat > 1 && <LojaPagePagination page={pageCat} safePage={safePageCat} totalPages={totalPagesCat} setPage={setPageCat} lang={lang} />}
                            </>
                          )}
                        </div>
                      </section>

                      {/* ── ESTOQUE ── */}
                      <section className="loja-mng-v3-panel" style={{ display: abaLoja === 'estoque' ? 'flex' : 'none' }}>
                        <div className="loja-mng-v3-toolbar" style={{ paddingBottom: grupoFiltroEstoque !== '' ? 20 : undefined }}>
                          <div className="loja-mng-v3-search">
                            <i className="ti ti-search" aria-hidden="true" />
                            <input type="search" placeholder={en ? 'Search…' : 'Buscar…'} value={buscaEstoque} onChange={(e) => setBuscaEstoque(e.target.value)} />
                            {buscaEstoque && (
                              <button type="button" className="loja-mng-v3-search-clear" onClick={() => setBuscaEstoque('')} aria-label={tl.clear}>
                                <i className="ti ti-x" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                          {estoque.length > 0 && (
                            <div className="best-chips loja-mng-v3-chips">
                              <ChipIcon value="all" label={tl.allGroups} active={grupoFiltroEstoque === ''} onClick={() => setGrupoFiltroEstoque('')} />
                              {gruposEstoque.map((g) => (
                                <ChipIcon key={g} value={g} label={g} active={grupoFiltroEstoque === g} onClick={() => setGrupoFiltroEstoque(g)} />
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="loja-mng-v3-estoque-body best best-auto" ref={estoqueWrapRef} style={{ paddingBottom: totalPagesEstoque <= 1 ? 20 : 0 }}>
                          {estoque.length === 0 ? (
                            <div className="loja-mng-v3-empty">
                              <i className="ti ti-shopping-bag-x" aria-hidden="true" />
                              <span>{tl.empty}</span>
                            </div>
                          ) : estoqueFiltrado.length === 0 ? (
                            <div className="best-empty">{tl.none}</div>
                          ) : (
                            <>
                              <div className="best-table-wrap">
                                <Table>
                                  <TableHeader><TableRow>
                                    <LojaSortHead col="nome" sortKey={sortKeyEstoque} sortDir={sortDirEstoque} toggleSort={toggleSortEstoque}>{en ? 'Item' : 'Item'}</LojaSortHead>
                                    <LojaSortHead col="preco" sortKey={sortKeyEstoque} sortDir={sortDirEstoque} toggleSort={toggleSortEstoque}>{en ? 'Price' : 'Preço'}</LojaSortHead>
                                    <LojaSortHead col="estoque" sortKey={sortKeyEstoque} sortDir={sortDirEstoque} toggleSort={toggleSortEstoque} title={en ? 'Stock' : 'Estoque'}>
                                      <i className="ti ti-packages" aria-hidden="true" />
                                    </LojaSortHead>
                                    <TableHead className="loja-mng-v3-th--action" />
                                  </TableRow></TableHeader>
                                  <TableBody>
                                    {estoqueSlice.map((e) => {
                                      const cat = catalogoBySlug[e.slug];
                                      const precoFinal = e.preco_latao_override != null ? e.preco_latao_override : (cat?.valor_latao ?? 0);
                                      const estoqueQtd = e.estoque == null ? '∞' : String(e.estoque);
                                      const semEstoque = e.estoque != null && e.estoque === 0;
                                      return (
                                        <TableRow key={e.entryId}>
                                          <TableCell className="loja-mng-v3-td--nome">
                                            <span className="loja-mng-v3-row-grupo">{cat?.grupo || '—'}</span>
                                            <span className="best-name">{cat?.nome || `(? ${e.slug})`}</span>
                                          </TableCell>
                                          <TableCell className="loja-mng-v3-td--preco">{precoTextoLoja(precoFinal, en)}</TableCell>
                                          <TableCell style={{ color: semEstoque ? '#E57373' : undefined }}>{estoqueQtd}</TableCell>
                                          <TableCell className="loja-mng-v3-td--action">
                                            <button type="button" className="loja-mng-v3-remove" onClick={() => removerEntrada(e.entryId)} title={tl.remove} aria-label={`${tl.remove} ${cat?.nome || e.slug}`}>
                                              <i className="ti ti-x" aria-hidden="true" />
                                            </button>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                              {totalPagesEstoque > 1 && <LojaPagePagination page={pageEstoque} safePage={safePageEstoque} totalPages={totalPagesEstoque} setPage={setPageEstoque} lang={lang} />}
                            </>
                          )}
                        </div>
                      </section>

                    </div>
                  </>
                )}
              </div>

            </div>
          )}

          {error && <div className="err-msg" style={{ marginTop: 12 }}>{error}</div>}
        </div>
    </div>
  );
}

function NovaHistoriaModal({ t, lang, personagens, currentUserId, onClose, onSaved, historiaExistente = null }) {
  const tn = t.historias.novaModal;
  const isEdit = !!historiaExistente;
  const en = lang === 'en';
  const [titulo, setTitulo] = useState(isEdit ? (historiaExistente.titulo || '') : '');
  const [reino, setReino] = useState(isEdit ? (historiaExistente.reino || '') : '');
  const [reinosDisponiveis, setReinosDisponiveis] = useState([]); // entradas tipo 'reino' do diário desta história (só edit — história nova ainda não tem id)
  const [reinoOpen, setReinoOpen] = useState(false);
  const reinoRef = React.useRef(null);
  const [introducao, setIntroducao] = useState(isEdit ? (historiaExistente.introducao || '') : '');

  // Capítulos: array de { id, titulo, texto } — ordem é a ordem na array.
  // Mestre pode adicionar quantos quiser; cada capítulo tem título e corpo livre.
  const [capitulos, setCapitulos] = useState(() => {
    if (isEdit && Array.isArray(historiaExistente.capitulos) && historiaExistente.capitulos.length > 0) {
      return historiaExistente.capitulos.map((c, i) => ({ id: c.id ?? `cap-${Date.now()}-${i}`, titulo: c.titulo ?? '', texto: c.texto ?? '', data_capitulo: c.data_capitulo ?? null }));
    }
    return [];
  });

  const addCapitulo = () =>
    setCapitulos((prev) => [...prev, { id: `cap-${Date.now()}-${prev.length}`, titulo: '', texto: '', data_capitulo: null }]);

  const updateCapitulo = (id, field, value) =>
    setCapitulos((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));

  const removeCapitulo = (id) =>
    setCapitulos((prev) => prev.filter((c) => c.id !== id));

  const moveCapitulo = (id, dir) =>
    setCapitulos((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });

  const [dataInicio, setDataInicio] = useState(
    isEdit
      ? (historiaExistente.data_inicio || '')
      : new Date().toISOString().slice(0, 10)
  );
  const [dataJogo, setDataJogo] = useState(
    isEdit && historiaExistente.data_jogo
      ? historiaExistente.data_jogo
      : { dia: 1, mes: 1, ano: 0 }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [pagina, setPagina] = useState('historia'); // 'historia' | 'capitulos'

  // Busca os reinos já cadastrados no diário desta história (RPC listar_lore_historia,
  // igual ao GerenciarLoreModal em diario.jsx) pra oferecer como dropdown no campo Reino.
  // Suposição: guardamos o NOME do reino escolhido em historias.reino, igual já era
  // salvo com texto livre — não mudei o formato do dado, só o jeito de preencher.
  useEffect(() => {
    if (!isEdit || !historiaExistente?.id) return undefined;
    let cancel = false;
    (async () => {
      const { data, error: err } = await supabaseClient.rpc('listar_lore_historia', { p_historia_id: historiaExistente.id });
      if (cancel || err || !data || data.ok === false) return;
      setReinosDisponiveis((data.entradas || []).filter((e) => e.tipo === 'reino'));
    })();
    return () => { cancel = true; };
  }, [isEdit, historiaExistente?.id]);

  // Fecha o dropdown de reino ao clicar fora.
  useEffect(() => {
    if (!reinoOpen) return undefined;
    const handler = (e) => { if (reinoRef.current && !reinoRef.current.contains(e.target)) setReinoOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [reinoOpen]);

  // Escape e travamento de scroll já são responsabilidade do ModalShell — não duplicar aqui.
  // criatura_ids é gerenciado pelo Lore — não sobrescrever aqui.

  const valido = titulo.trim().length > 0;

  const salvar = async () => {
    setSaving(true);
    setError(null);
    // Serializa capítulos: descarta id interno (gerado só pra key/React), guarda apenas titulo+texto.
    // Capítulos completamente vazios (sem título e sem texto) são descartados — o mestre clicou "+"
    // mas não digitou nada.
    const capitulosPayload = capitulos
      .map(({ titulo: t, texto, data_capitulo }) => ({ titulo: t.trim(), texto: texto.trim(), data_capitulo: data_capitulo || null }))
      .filter(({ titulo: t, texto }) => t.length > 0 || texto.length > 0);

    const payload = {
      titulo: titulo.trim(),
      reino: reino.trim() || null,
      introducao: introducao.trim() || null,
      data_inicio: dataInicio || null,
      data_jogo: dataJogo || null,
      capitulos: capitulosPayload.length > 0 ? capitulosPayload : null,
    };
    let error;
    if (isEdit) {
      // NÃO mexe em protagonista_ids: quem o preenche é o aceite de convite
      // (RPC aceitar_convite). Sobrescrever aqui apagaria quem já entrou.
      const { error: err } = await supabaseClient
        .from('historias')
        .update(payload)
        .eq('id', historiaExistente.id);
      error = err;
    } else {
      payload.mestre_id = currentUserId;
      payload.protagonista_ids = []; // começa vazia; jogadores entram por convite
      const { error: err } = await supabaseClient.from('historias').insert(payload);
      error = err;
    }
    setSaving(false);
    if (error) {
      console.error('[historias] save falhou:', error);
      setError(error.hint || error.message);
    } else {
      onSaved();
    }
  };

  return (
    <ModalShell
      title={isEdit ? tn.editarTitulo : tn.novaTitulo}
      lang={lang}
      size="lg"
      onClose={onClose}
      onCancel={onClose}
      onConfirm={salvar}
      confirmLabel={saving ? tn.salvando : (isEdit ? tn.salvar : tn.criar)}
      confirmDisabled={saving || !valido}
    >
      {/* ── Tabs de navegação ── */}
      <div className="hist-modal-tabs">
        <button
          type="button"
          className={'hist-modal-tab' + (pagina === 'historia' ? ' is-active' : '')}
          onClick={() => setPagina('historia')}>
          {en ? 'Story' : 'História'}
        </button>
        <button
          type="button"
          className={'hist-modal-tab' + (pagina === 'capitulos' ? ' is-active' : '')}
          onClick={() => setPagina('capitulos')}>
          {en ? 'Chapters' : 'Capítulos'}
          {capitulos.length > 0 && (
            <span className="hist-modal-tab-badge">{capitulos.length}</span>
          )}
        </button>
        {pagina === 'capitulos' && (
          <button type="button" className="btn-ghost btn-sm hist-cap-add-btn hist-modal-tab-add" onClick={addCapitulo}>
            <i className="ti ti-plus" aria-hidden="true" />
            {en ? 'Add chapter' : 'Adicionar capítulo'}
          </button>
        )}
      </div>

      {/* ── Página 1: dados da história ── */}
      {pagina === 'historia' && (
        <>
          <div className="wiz-row-2col">
            <label className="wiz-field">
              <span>{tn.titulo}</span>
              <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)}
                placeholder={tn.tituloPlaceholder}
                autoFocus />
            </label>
            <div className="wiz-field">
              <span>{tn.reino}</span>
              {reinosDisponiveis.length > 0 ? (
                <div ref={reinoRef} className="hist-reino-wrap">
                  <button type="button" className="select-pill-btn"
                    data-open={reinoOpen ? 'true' : 'false'}
                    data-empty={!reino ? 'true' : 'false'}
                    onClick={() => setReinoOpen((v) => !v)}>
                    <span>
                      {reino || tn.reinoPlaceholder}
                    </span>
                    <i className="ti ti-chevron-down select-pill-btn-chevron" aria-hidden="true"
                      style={{ transform: reinoOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                  </button>
                  {reinoOpen && (
                    <ul className="select-pill-drop">
                      {[{ nome: '', rotulo: tn.reinoPlaceholder }, ...reinosDisponiveis].map((r, i) => {
                        const active = String(r.nome) === String(reino);
                        return (
                          <li key={r.id ?? `ph-${i}`}
                            className={active ? 'is-active' : ''}
                            onClick={() => { setReino(r.nome); setReinoOpen(false); }}>
                            {active && <i className="ti ti-check" aria-hidden="true" />}
                            {!active && <span className="select-pill-drop-spacer" />}
                            {r.rotulo ?? r.nome}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : (
                <input type="text" value={reino} onChange={(e) => setReino(e.target.value)}
                  placeholder={tn.reinoPlaceholder} />
              )}
            </div>
          </div>
          <div className="wiz-row-2col">
            <label className="wiz-field">
              <span>{tn.dataInicio}</span>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </label>
            <label className="wiz-field">
              <span>{tn.dataInicioJogo}</span>
              <FantasyDatePicker value={dataJogo} onChange={setDataJogo} lang={lang} />
            </label>
          </div>
          <label className="wiz-field">
            <span>{en ? 'Introduction' : 'Introdução'}</span>
            <textarea rows={4} value={introducao} onChange={(e) => setIntroducao(e.target.value)}
              placeholder={en ? 'Optional' : 'Opcional'} />
          </label>
        </>
      )}

      {/* ── Página 2: capítulos ── */}
      {pagina === 'capitulos' && (
        <>
          {/* lista de capítulos */}
          {capitulos.map((cap, idx) => (
            <React.Fragment key={cap.id}>
              <div className="hist-cap-row">

                {/* Col esquerda: label "Título" (min-height 32px) + input */}
                <div className="wiz-field">
                  <span>{en ? 'Title' : 'Título'}</span>
                  <input
                    type="text"
                    value={cap.titulo}
                    onChange={(e) => updateCapitulo(cap.id, 'titulo', e.target.value)}
                    placeholder={en ? 'Chapter title (optional)' : 'Título do capítulo (opcional)'}
                  />
                </div>

                {/* Col direita: label acima; datepicker + botões na mesma linha abaixo */}
                <div className="hist-cap-date-col">
                  <span className="hist-cap-date-label">
                    <i className="ti ti-calendar-event hist-cap-date-icon" aria-hidden="true" />
                    {en ? 'Date (fantasy)' : 'Data (fantasia)'}
                  </span>
                  <div className="hist-cap-picker-row">
                    <FantasyDatePicker
                      value={cap.data_capitulo || { dia: 1, mes: 1, ano: 0 }}
                      onChange={(v) => updateCapitulo(cap.id, 'data_capitulo', v)}
                      lang={lang}
                    />
                    <div className="hist-cap-date-btns">
                      <button type="button" className="btn-icon btn-sm" onClick={() => moveCapitulo(cap.id, -1)}
                        disabled={idx === 0} title={en ? 'Move up' : 'Subir'}
                        aria-label={en ? 'Move chapter up' : 'Mover capítulo para cima'}>
                        <i className="ti ti-chevron-up" aria-hidden="true" />
                      </button>
                      <button type="button" className="btn-icon btn-sm" onClick={() => moveCapitulo(cap.id, 1)}
                        disabled={idx === capitulos.length - 1} title={en ? 'Move down' : 'Descer'}
                        aria-label={en ? 'Move chapter down' : 'Mover capítulo para baixo'}>
                        <i className="ti ti-chevron-down" aria-hidden="true" />
                      </button>
                      <button type="button" className="btn-icon btn-sm btn-danger" onClick={() => removeCapitulo(cap.id)}
                        title={en ? 'Remove chapter' : 'Remover capítulo'}
                        aria-label={en ? 'Remove chapter' : 'Remover capítulo'}>
                        <i className="ti ti-trash" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <label className="wiz-field">
                <span>{en ? `Chapter ${idx + 1}` : `Capítulo ${idx + 1}`}</span>
                <textarea
                  rows={4}
                  value={cap.texto}
                  onChange={(e) => updateCapitulo(cap.id, 'texto', e.target.value)}
                  placeholder={en ? 'Chapter content…' : 'Conteúdo do capítulo…'}
                />
              </label>
            </React.Fragment>
          ))}

          {/* estado vazio */}
          {capitulos.length === 0 && (
            <p className="subhead hist-cap-empty">
              {en
                ? 'No chapters yet. Click "Add chapter" to start.'
                : 'Nenhum capítulo ainda. Clique em "Adicionar capítulo" para começar.'}
            </p>
          )}
        </>
      )}

      {error && <div className="err-msg" style={{ marginTop: 14 }}>{error}</div>}
    </ModalShell>
  );
}

Object.assign(window, {
  HistoriasList, HistoriaCard,
  ConfirmarExclusaoHistoriaModal, GerenciarLojaView,
  NovaHistoriaModal,
});
