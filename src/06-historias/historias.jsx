/* ============================================================
   HISTÓRIAS — Mestre cria/edita/gerencia campanhas
   ============================================================
   Lado Mestre. Lista de histórias + ações (criar, editar,
   excluir, gerenciar loja, gerenciar convites).

   - HistoriasList                  — lista e cria histórias do mestre
   - HistoriaCard                   — card individual com ações
   - ConfirmarExclusaoHistoriaModal — confirma deleção (input do título)
   - GerenciarLojaModal             — edita estoque_loja JSONB
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
function HistoriasList({ ac, lang, currentUserId, userProfile = null }) {
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
  const [gerenciandoLoja, setGerenciandoLoja] = useState(null); // história sendo gerenciada na loja
  const [gerenciandoLore, setGerenciandoLore] = useState(null); // história sendo gerenciada no diário/lore
  const [gerenciandoConvites, setGerenciandoConvites] = useState(null); // história gerenciando convites
  const [batalhando, setBatalhando] = useState(null); // história com console de batalha aberto

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

  if (historias === null) {
    return <div className="admin-loading"><span>{lang === 'en' ? 'Loading stories…' : 'Abrindo os pergaminhos…'}</span></div>;
  }
  if (error) {
    return (
      <div className="admin-error">
        <div className="err-msg">{error}</div>
        <div className="admin-error-hint">
          {lang === 'en'
            ? "Make sure the 'historias' table exists in Supabase."
            : "Confira se a tabela 'historias' existe no Supabase."}
        </div>
      </div>
    );
  }

  return (
    <div className="hist">
      {historias.length === 0 ? (
        <div className="pjs-empty">
          <p>{lang === 'en' ? 'Start a new adventure when you are ready' : 'Comece uma nova aventura quando estiver pronto'}</p>
        </div>
      ) : (
        <div className="hist-grid">
          {historias.map((h) => (
            <HistoriaCard
              key={h.id}
              h={h}
              personagens={personagens}
              lang={lang}
              onEdit={() => setEditando(h)}
              onDelete={() => setExcluindo(h)}
              onManageLoja={() => setGerenciandoLoja(h)}
              onManageLore={() => setGerenciandoLore(h)}
              onManageConvites={() => setGerenciandoConvites(h)}
              onBatalhas={() => setBatalhando(h)}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <NovaHistoriaModal
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
          lang={lang}
          error={deleteError}
          onCancel={() => { setExcluindo(null); setDeleteError(null); }}
          onConfirm={confirmarExclusao}
        />
      )}

      {gerenciandoLoja && (
        <GerenciarLojaModal
          historia={gerenciandoLoja}
          lang={lang}
          onClose={() => setGerenciandoLoja(null)}
          onSaved={() => { setGerenciandoLoja(null); refetch(); }}
        />
      )}

      {gerenciandoLore && (
        <GerenciarLoreModal
          historia={gerenciandoLore}
          lang={lang}
          onClose={() => setGerenciandoLore(null)}
          onChanged={() => refetch()}
        />
      )}

      {gerenciandoConvites && (
        <ConvitesHistoriaModal
          historia={gerenciandoConvites}
          lang={lang}
          onClose={() => setGerenciandoConvites(null)}
          onChanged={() => refetch()}
        />
      )}

      {batalhando && (
        <BatalhasHistoriaModal
          historia={batalhando}
          personagens={personagens}
          criaturas={criaturas}
          lang={lang}
          currentUserId={currentUserId}
          onClose={() => setBatalhando(null)}
        />
      )}

      <div style={{ position: 'fixed', bottom: 28, left: 'calc(50% + 132px)', transform: 'translateX(-50%)', zIndex: 40 }}>
        {(() => {
          const limiteFree = userProfile?.plano === 'free' && historias.length >= 2;
          if (limiteFree) {
            return (
              <button
                className="btn-ghost btn-sm limite-cta"
                disabled
                title={lang === 'en'
                  ? 'You\'ve reached the story limit for the free plan — upgrade now.'
                  : 'Você atingiu o limite de histórias do plano gratuito — faça um upgrade'}>
                ✦ {lang === 'en' ? 'You\'ve reached the story limit for the free plan — upgrade now.' : 'Você atingiu o limite de histórias do plano gratuito — faça um upgrade'} ✦
              </button>
            );
          }
          return (
            <button className="btn-primary btn-sm" onClick={() => setModalOpen(true)}>
              {lang === 'en' ? 'New story' : 'Nova história'}
            </button>
          );
        })()}
      </div>

    </div>
  );
}

function HistoriaCard({ h, personagens, lang, onEdit, onDelete, onManageLoja, onManageLore, onManageConvites, onBatalhas }) {
  const protags = (h.protagonista_ids || [])
    .map((id) => personagens.find((x) => x.id === id))
    .filter(Boolean)
    .map((p) => `${p.nome}${p.sobrenome ? ' ' + p.sobrenome : ''}`);
  const qtdLoja = Array.isArray(h.estoque_loja) ? h.estoque_loja.length : 0;
  return (
    <article className="hist-card">
      <header className="hist-card-head">
        <div className="hist-card-head-main">
          <div className="hist-title">{h.titulo}</div>
          {h.data_inicio && (
            <div className="hist-date">
              {new Date(h.data_inicio + 'T12:00:00').toLocaleDateString(
                lang === 'en' ? 'en-US' : 'pt-BR',
                { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }
              )}
            </div>
          )}
          {h.data_jogo && (
            <div className="hist-date hist-date--jogo">
              {(() => {
                const dj = h.data_jogo;
                const nomeMes = FANTASY_MONTHS[dj.mes - 1]?.nome || '';
                const diaSemana = calcDiaSemanaFantasy(dj.ano, dj.mes, dj.dia);
                const nomeMesShort = nomeMes.replace(/^Mês /, '').toLowerCase();
                return `${diaSemana.toLowerCase()}, ${dj.dia} ${nomeMesShort} de ${dj.ano}`;
              })()}
            </div>
          )}
        </div>
        {(onEdit || onDelete || onManageLoja || onManageLore || onManageConvites || onBatalhas) && (
          <div className="hist-card-actions">
            {onBatalhas && (
              <button
                className="btn-icon btn-sm"
                onClick={onBatalhas}
                title={lang === 'en' ? 'Battles' : 'Batalhas'}
                aria-label={lang === 'en' ? 'Battles' : 'Batalhas'}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 17.5 L3 6 V3 h3 l11.5 11.5" />
                  <path d="M13 19l6-6" /><path d="M16 16l4 4" /><path d="M19 21l2-2" />
                  <path d="M9.5 17.5 L21 6 V3 h-3 L6.5 14.5" />
                  <path d="M11 19l-6-6" /><path d="M8 16l-4 4" /><path d="M5 21l-2-2" />
                </svg>
              </button>
            )}
            {onManageConvites && (
              <button
                className="btn-icon btn-sm"
                onClick={onManageConvites}
                title={lang === 'en' ? 'Invites' : 'Convites'}
                aria-label={lang === 'en' ? 'Invites' : 'Convites'}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="6" width="18" height="13" rx="2" />
                  <path d="M3 8l9 6 9-6" />
                </svg>
              </button>
            )}
            {onManageLore && (
              <button
                className="btn-icon btn-sm"
                onClick={onManageLore}
                title={lang === 'en' ? 'Lore (NPCs, Kingdoms, Cities)' : 'Lore (NPCs, Reinos, Cidades)'}
                aria-label={lang === 'en' ? 'Lore' : 'Lore'}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 7c-1.5-1.3-3.6-2-6-2v13c2.4 0 4.5.7 6 2 1.5-1.3 3.6-2 6-2V5c-2.4 0-4.5.7-6 2z" />
                  <path d="M12 7v13" />
                </svg>
              </button>
            )}
            {onManageLoja && (
              <button
                className="btn-icon btn-sm"
                onClick={onManageLoja}
                title={lang === 'en' ? `Shop (${qtdLoja})` : `Loja (${qtdLoja})`}
                aria-label={lang === 'en' ? 'Shop' : 'Loja'}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9h18l-1.5 10a2 2 0 0 1-2 1.7H6.5a2 2 0 0 1-2-1.7L3 9z" />
                  <path d="M8 9V6a4 4 0 0 1 8 0v3" />
                </svg>
              </button>
            )}
            {onEdit && (
              <button
                className="btn-icon btn-sm"
                onClick={onEdit}
                title={lang === 'en' ? 'Edit' : 'Editar'}
                aria-label={lang === 'en' ? 'Edit' : 'Editar'}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" />
                  <path d="M14.06 6.19l3.75 3.75" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                className="btn-icon btn-danger btn-sm"
                onClick={onDelete}
                title={lang === 'en' ? 'Delete' : 'Excluir'}
                aria-label={lang === 'en' ? 'Delete' : 'Excluir'}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
              </button>
            )}
          </div>
        )}
      </header>
      <div className="hist-protag">
        <div className="hist-protag-eyebrow">{lang === 'en' ? 'Protagonists' : 'Protagonistas'}</div>
        {protags.length === 0 ? (
          <div className="hist-protag-empty">—</div>
        ) : (
          <ul>
            {protags.map((nome, i) => <li key={i}>{nome}</li>)}
          </ul>
        )}
      </div>
    </article>
  );
}

// Modal de confirmação para excluir uma história
function ConfirmarExclusaoHistoriaModal({ historia, lang, error, onCancel, onConfirm }) {
  return (
    <ModalShell
      title={lang === 'en' ? 'Delete?' : 'Excluir?'}
      lang={lang}
      size="sm"
      onClose={onCancel}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmLabel={lang === 'en' ? 'Delete' : 'Excluir'}
    >
      <p className="subhead">
        {lang === 'en'
          ? `The story "${historia.titulo}" will be permanently removed.`
          : `A história "${historia.titulo}" será removida permanentemente.`}
      </p>
      {error && <div className="err-msg">{error}</div>}
    </ModalShell>
  );
}

/* ============================== [24] Gerenciar Loja ============================== */
function GerenciarLojaModal({ historia, lang, onClose, onSaved }) {
  const [estoque, setEstoque] = useState(() => Array.isArray(historia.estoque_loja) ? [...historia.estoque_loja] : []);
  const [catalogo, setCatalogo] = useState(null);
  const [busca, setBusca] = useState('');
  const [grupoFiltro, setGrupoFiltro] = useState('');
  const [escolhido, setEscolhido] = useState(null);
  const [precoOverride, setPrecoOverride] = useState('');
  const [estoqueInicial, setEstoqueInicial] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [paginaCat, setPaginaCat] = useState(1);
  const catListRef = useRef(null);
  const PAGE_SIZE_CAT = 10;

  // ── Acessibilidade & lifecycle do modal já são responsabilidade do ModalShell.

  // Reset paginação quando filtros mudam
  useEffect(() => { setPaginaCat(1); }, [busca, grupoFiltro]);

  // Volta scroll da lista pro topo a cada troca de página
  useEffect(() => {
    if (catListRef.current) catListRef.current.scrollTop = 0;
  }, [paginaCat]);

  // ── Carrega catálogo paginado
  useEffect(() => {
    (async () => {
      const { data, error } = await fetchCatalogoCompleto();
      if (error) setError(error.message);
      else setCatalogo(data || []);
    })();
  }, []);

  // ── Index do catálogo por slug
  const catalogoBySlug = useMemo(() => {
    const map = {};
    (catalogo || []).forEach((it) => { map[it.slug] = it; });
    return map;
  }, [catalogo]);

  // ── Grupos pro dropdown
  const grupos = useMemo(
    () => catalogo ? Array.from(new Set(catalogo.map((i) => i.grupo).filter(Boolean))).sort() : [],
    [catalogo]
  );

  // ── Normaliza string pra busca (lowercase + remove acentos)
  const normalize = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // ── Termos da busca (split por espaços, AND entre eles)
  const termos = useMemo(
    () => normalize(busca).split(/\s+/).filter(Boolean),
    [busca]
  );

  // ── Filtro principal: nome + descricao + origem (TODOS os matches).
  //    Itens já na loja CONTINUAM listados — pode adicionar de novo com outro preço.
  const filtradosTotal = useMemo(() => {
    if (!catalogo) return [];
    return catalogo.filter((it) => {
      if (grupoFiltro && it.grupo !== grupoFiltro) return false;
      if (termos.length === 0) return true;
      const nome = normalize(it.nome);
      const desc = normalize(it.descricao || '');
      const orig = normalize(it.origem || '');
      return termos.every((t) => nome.includes(t) || desc.includes(t) || orig.includes(t));
    });
  }, [catalogo, grupoFiltro, termos]);

  // ── Paginação: 10 itens por página
  const totalPaginasCat = Math.max(1, Math.ceil(filtradosTotal.length / PAGE_SIZE_CAT));
  const paginaCatSafe = Math.min(Math.max(1, paginaCat), totalPaginasCat);
  const inicioCat = (paginaCatSafe - 1) * PAGE_SIZE_CAT;
  const filtrados = filtradosTotal.slice(inicioCat, inicioCat + PAGE_SIZE_CAT);

  // ── Indica de onde veio o match (pra chip "na descrição" / "na origem")
  const matchCampo = (it) => {
    if (termos.length === 0) return null;
    const nome = normalize(it.nome);
    if (termos.every((t) => nome.includes(t))) return null;
    const desc = normalize(it.descricao || '');
    if (termos.every((t) => desc.includes(t))) return 'descricao';
    const orig = normalize(it.origem || '');
    if (termos.every((t) => orig.includes(t))) return 'origem';
    return 'misto';
  };

  // ── Ações
  const adicionarAoEstoque = () => {
    if (!escolhido) return;
    const novaEntrada = {
      entryId: novoInstanceId(),
      slug: escolhido.slug,
      preco_latao_override: precoOverride === '' ? null : Math.max(0, parseInt(precoOverride, 10) || 0),
      estoque: estoqueInicial === '' ? null : Math.max(0, parseInt(estoqueInicial, 10) || 0),
    };
    setEstoque((arr) => [...arr, novaEntrada]);
    setEscolhido(null);
    setPrecoOverride('');
    setEstoqueInicial('');
    setBusca('');
  };

  const removerEntrada = (entryId) => {
    setEstoque((arr) => arr.filter((e) => e.entryId !== entryId));
  };

  const salvar = async () => {
    setSaving(true);
    setError(null);
    const { error } = await supabaseClient
      .from('historias')
      .update({ estoque_loja: estoque })
      .eq('id', historia.id);
    setSaving(false);
    if (error) {
      console.error('[loja] save falhou:', error);
      setError(error.message);
    } else {
      onSaved();
    }
  };

  // ── Labels i18n
  const t = {
    shop: lang === 'en' ? 'Shop' : 'Loja',
    shopSub: lang === 'en' ? `Items for sale to players of ${historia.titulo}.` : `Itens à venda para os jogadores de ${historia.titulo}.`,
    catalog: lang === 'en' ? 'Catalog' : 'Catálogo',
    catalogSub: lang === 'en' ? 'Search by name, description, or origin.' : 'Busque por nome, descrição ou origem.',
    empty: lang === 'en' ? 'Pick from the catalog →' : 'Escolha um item no catálogo →',
    none: lang === 'en' ? 'No items match.' : 'Nenhum item corresponde.',
    loading: lang === 'en' ? 'Loading catalog…' : 'Abrindo o catálogo…',
    price: lang === 'en' ? 'Price' : 'Preço',
    stock: lang === 'en' ? 'Stock' : 'Estoque',
    remove: lang === 'en' ? 'Remove' : 'Remover',
    cancel: lang === 'en' ? 'Cancel' : 'Cancelar',
    save: lang === 'en' ? 'Save' : 'Salvar',
    saving: lang === 'en' ? 'Saving…' : 'Salvando…',
    search: lang === 'en' ? 'Search by name, description, origin…' : 'Buscar por nome, descrição, origem…',
    allGroups: lang === 'en' ? 'All groups' : 'Todos os grupos',
    clear: lang === 'en' ? 'Clear' : 'Limpar',
    inDesc: lang === 'en' ? 'in description' : 'na descrição',
    inOrig: lang === 'en' ? 'in origin' : 'na origem',
    inDetails: lang === 'en' ? 'in details' : 'nos detalhes',
    catalogPrice: lang === 'en' ? 'Catalog price' : 'Preço do catálogo',
    addToShop: lang === 'en' ? 'Add to shop' : 'Adicionar à loja',
    origin: lang === 'en' ? 'Origin' : 'Origem',
    liquid: lang === 'en' ? 'liquid' : 'líquido',
    magic: lang === 'en' ? 'magic' : 'mágico',
    inShop: (n) => lang === 'en'
      ? `${n} ${n === 1 ? 'item' : 'items'} in shop`
      : `${n} ${n === 1 ? 'item' : 'itens'} na loja`,
    showing: (n, total) => lang === 'en'
      ? `${n} of ${total}`
      : `${n} de ${total}`,
  };

  return (
    <ModalShell
      title={t.shop}
      lang={lang}
      size="full"
      extraClass="loja-mng-v2"
      onClose={onClose}
      onCancel={onClose}
      cancelLabel={t.cancel}
      onConfirm={salvar}
      confirmLabel={saving ? t.saving : t.save}
      confirmDisabled={saving}
    >
      <p className="subhead" style={{ marginBottom: 18 }}>{t.shopSub}</p>

      {catalogo === null ? (
        <div className="admin-loading">
          <span>{t.loading}</span>
        </div>
      ) : (
        <div className="loja-mng-grid">

        {/* ═════════ COLUNA ESQUERDA: ESTOQUE DA LOJA ═════════ */}
        <section className="loja-mng-panel">
          <div className="loja-mng-panel-body">
                {estoque.length === 0 ? (
                  <div className="loja-mng-empty">
                    <div className="loja-mng-empty-arrow" aria-hidden="true">→</div>
                    <div>{t.empty}</div>
                  </div>
                ) : (
                  <div className="loja-mng-list">
                    {estoque.map((e) => {
                      const cat = catalogoBySlug[e.slug];
                      const precoCat = cat?.valor_latao ?? 0;
                      const precoFinal = e.preco_latao_override != null ? e.preco_latao_override : precoCat;
                      // Formata o preço como "1O 2P 3C 4L" mostrando só denominações > 0
                      const m = latoesToMoedas(precoFinal);
                      const partes = [];
                      if (m.ouro)  partes.push(m.ouro  + (lang === 'en' ? 'g' : 'O'));
                      if (m.prata) partes.push(m.prata + (lang === 'en' ? 's' : 'P'));
                      if (m.cobre) partes.push(m.cobre + (lang === 'en' ? 'c' : 'C'));
                      if (m.latao) partes.push(m.latao + (lang === 'en' ? 'b' : 'L'));
                      const precoFmt = partes.length ? partes.join(' ') : (lang === 'en' ? 'free' : 'grátis');
                      return (
                        <div className="loja-mng-row" key={e.entryId}>
                          <div className="loja-mng-row-nome">
                            <small>{cat?.grupo || '—'}</small>
                            {cat?.nome || `(? ${e.slug})`}
                          </div>
                          <div className="loja-mng-stat">
                            <span className="loja-mng-stat-label">{t.price}</span>
                            <span className="loja-mng-stat-value">{precoFmt}</span>
                          </div>
                          <div className="loja-mng-stat">
                            <span className="loja-mng-stat-label">{t.stock}</span>
                            <span className="loja-mng-stat-value">
                              {e.estoque == null ? '∞' : e.estoque}
                            </span>
                          </div>
                          <button
                            className="loja-mng-remove"
                            onClick={() => removerEntrada(e.entryId)}
                            title={t.remove}
                            aria-label={t.remove}>×</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* ═════════ COLUNA DIREITA: CATÁLOGO ═════════ */}
            <section className="loja-mng-panel">
              <div className="loja-mng-panel-head">
                <div>
                  <h3>{t.catalog}</h3>
                  <p className="subhead">{t.catalogSub}</p>
                </div>
                <div className="loja-mng-counter">
                  {t.showing(filtrados.length, filtradosTotal.length)}
                </div>
              </div>

              <div className="loja-mng-toolbar">
                <div className="loja-mng-search">
                  <span className="loja-mng-search-icon" aria-hidden="true">⌕</span>
                  <input
                    type="search"
                    placeholder={t.search}
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)} />
                  {busca && (
                    <button
                      type="button"
                      className="loja-mng-search-clear"
                      onClick={() => setBusca('')}
                      aria-label={t.clear}>×</button>
                  )}
                </div>
                <select
                  className="loja-mng-select"
                  value={grupoFiltro}
                  onChange={(e) => setGrupoFiltro(e.target.value)}>
                  <option value="">{t.allGroups}</option>
                  {grupos.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div className="loja-mng-cat-list" ref={catListRef}>
                {filtrados.length === 0 ? (
                  <div className="loja-mng-empty">{t.none}</div>
                ) : filtrados.map((it) => {
                  const mc = matchCampo(it);
                  const sel = escolhido?.slug === it.slug;
                  return (
                    <button
                      key={it.slug}
                      type="button"
                      className={'loja-mng-cat-row' + (sel ? ' selected' : '')}
                      onClick={() => setEscolhido(sel ? null : it)}>
                      <div className="loja-mng-cat-row-main">
                        <span className="loja-mng-cat-row-nome">{it.nome}</span>
                        {mc && (
                          <span className={'loja-mng-match loja-mng-match-' + mc}>
                            {mc === 'descricao' ? t.inDesc : mc === 'origem' ? t.inOrig : t.inDetails}
                          </span>
                        )}
                      </div>
                      <span className="loja-mng-cat-row-tag">
                        {it.tipo === 'L' && <span title={t.liquid}>✦</span>}
                        {it.magico && <span title={t.magic} className="mag">✦</span>}
                      </span>
                      <span className="loja-mng-cat-row-preco">
                        <CofreMoedas moedas={latoesToMoedas(it.valor_latao ?? 0)} lang={lang} mostrarGratis />
                      </span>
                    </button>
                  );
                })}
              </div>

              {filtradosTotal.length > PAGE_SIZE_CAT && (
                <div className="bestiario-pagination">
                  <button
                    className="btn-icon btn-sm bestiario-page-btn"
                    onClick={() => setPaginaCat(1)}
                    disabled={paginaCatSafe === 1}
                    title={lang === 'en' ? 'First page' : 'Primeira página'}>«</button>
                  <button
                    className="btn-icon btn-sm bestiario-page-btn"
                    onClick={() => setPaginaCat((p) => Math.max(1, p - 1))}
                    disabled={paginaCatSafe === 1}
                    title={lang === 'en' ? 'Previous' : 'Anterior'}>‹</button>

                  {Array.from({ length: totalPaginasCat }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPaginasCat || Math.abs(p - paginaCatSafe) <= 2)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) =>
                      p === '…' ? (
                        <span key={`elip-${idx}`} className="bestiario-page-ellipsis">…</span>
                      ) : (
                        <button
                          key={p}
                          className="btn-icon btn-sm bestiario-page-btn"
                          data-on={p === paginaCatSafe ? 'true' : undefined}
                          onClick={() => setPaginaCat(p)}>{p}</button>
                      )
                    )}

                  <button
                    className="btn-icon btn-sm bestiario-page-btn"
                    onClick={() => setPaginaCat((p) => Math.min(totalPaginasCat, p + 1))}
                    disabled={paginaCatSafe === totalPaginasCat}
                    title={lang === 'en' ? 'Next' : 'Próxima'}>›</button>
                  <button
                    className="btn-icon btn-sm bestiario-page-btn"
                    onClick={() => setPaginaCat(totalPaginasCat)}
                    disabled={paginaCatSafe === totalPaginasCat}
                    title={lang === 'en' ? 'Last page' : 'Última página'}>»</button>

                  <span className="bestiario-page-info">
                    {lang === 'en'
                      ? `Page ${paginaCatSafe} of ${totalPaginasCat}`
                      : `Página ${paginaCatSafe} de ${totalPaginasCat}`}
                  </span>
                </div>
              )}

              {escolhido && (
                <div className="loja-mng-det">
                  <div className="loja-mng-det-head">
                    <div className="loja-mng-det-title">
                      <div className="loja-mng-det-nome">{escolhido.nome} {escolhido.origem && (` (Item ${escolhido.origem})`)}</div>
                    </div>
                  </div>

                  {escolhido.descricao && (
                    <div className="loja-mng-det-desc">{escolhido.descricao}</div>
                  )}

                  <div className="loja-mng-det-actions">
                    <label className="loja-mng-det-input">
                      <span>{t.price}</span>
                      <input
                        type="number" min="0"
                        placeholder={String(escolhido.valor_latao ?? 0)}
                        value={precoOverride}
                        onChange={(e) => setPrecoOverride(e.target.value)}
                      />
                    </label>
                    <label className="loja-mng-det-input">
                      <span>{t.stock}</span>
                      <input
                        type="number" min="0"
                        placeholder="0"
                        value={estoqueInicial}
                        onChange={(e) => setEstoqueInicial(e.target.value)}
                      />
                    </label>
                    <button className="btn-primary btn-sm" onClick={adicionarAoEstoque}>
                      {t.addToShop}
                    </button>
                  </div>
                </div>
              )}
            </section>

            </div>
          )}
          {error && <div className="err-msg" style={{ marginTop: 14 }}>{error}</div>}
    </ModalShell>
  );
}

function NovaHistoriaModal({ lang, personagens, criaturas = [], currentUserId, onClose, onSaved, historiaExistente = null }) {
  const isEdit = !!historiaExistente;
  const [titulo, setTitulo] = useState(isEdit ? (historiaExistente.titulo || '') : '');
  const [reino, setReino] = useState(isEdit ? (historiaExistente.reino || '') : '');
  const [introducao, setIntroducao] = useState(isEdit ? (historiaExistente.introducao || '') : '');
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
  const [criaturaSel, setCriaturaSel] = useState(
    isEdit ? (historiaExistente.criatura_ids || []) : []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Escape e travamento de scroll já são responsabilidade do ModalShell — não duplicar aqui.

  const toggleCriatura = (id) => {
    setCriaturaSel((sel) => sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  };

  const valido = titulo.trim().length > 0;

  const salvar = async () => {
    setSaving(true);
    setError(null);
    const payload = {
      titulo: titulo.trim(),
      reino: reino.trim() || null,
      introducao: introducao.trim() || null,
      data_inicio: dataInicio || null,
      data_jogo: dataJogo || null,
      criatura_ids: criaturaSel,
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
      title={isEdit
        ? (lang === 'en' ? 'Edit story' : 'Editar história')
        : (lang === 'en' ? 'New story' : 'Nova história')}
      lang={lang}
      size="lg"
      onClose={onClose}
      onCancel={onClose}
      onConfirm={salvar}
      confirmLabel={saving
        ? (lang === 'en' ? 'Saving…' : 'Salvando…')
        : (isEdit
          ? (lang === 'en' ? 'Save' : 'Salvar')
          : (lang === 'en' ? 'Create' : 'Criar'))}
      confirmDisabled={saving || !valido}
    >
        <div className="wiz-row-2col">
            <label className="wiz-field">
              <span>{lang === 'en' ? 'Title' : 'Título'}</span>
              <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)}
                placeholder={lang === 'en' ? 'The Shadow of Verrogar' : 'A Sombra de Verrogar'}
                autoFocus />
            </label>
            <label className="wiz-field">
              <span>{lang === 'en' ? 'Realm' : 'Reino'}</span>
              <input type="text" value={reino} onChange={(e) => setReino(e.target.value)}
                placeholder={lang === 'en' ? 'Kingdom of Verrogar' : 'Verrogar'} />
            </label>
          </div>
          <div className="wiz-row-2col">
            <label className="wiz-field">
              <span>{lang === 'en' ? 'Start date' : 'Data de início'}</span>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </label>
            <label className="wiz-field">
              <span>{lang === 'en' ? 'Start in-game date' : 'Data de início no jogo'}</span>
              <FantasyDatePicker value={dataJogo} onChange={setDataJogo} />
            </label>
          </div>
          <div className="wiz-field">
            <span>{lang === 'en' ? 'Creatures' : 'Criaturas'} ({criaturaSel.length} {lang === 'en' ? 'selected' : 'selecionadas'})</span>
            {criaturas.length === 0 ? (
              <div className="hist-protag-empty" style={{ padding: '10px 0' }}>
                {lang === 'en' ? 'No creatures in the bestiary yet' : 'Nenhuma criatura disponível no bestiário'}
              </div>
            ) : (
              <div className="hist-protag-list">
                {criaturas.map((c) => {
                  const on = criaturaSel.includes(c.id);
                  return (
                    <label key={c.id} className={'hist-protag-item' + (on ? ' on' : '')}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleCriatura(c.id)}
                      />
                      <div className="hist-protag-name">{c.nome}</div>
                      <div className="hist-protag-meta">{c.tipo || '—'}{c.estagio != null ? ` · ${c.estagio}` : ''}</div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          {error && <div className="err-msg" style={{ marginTop: 14 }}>{error}</div>}
    </ModalShell>
  );
}

Object.assign(window, {
  HistoriasList, HistoriaCard,
  ConfirmarExclusaoHistoriaModal, GerenciarLojaModal,
  NovaHistoriaModal,
});
