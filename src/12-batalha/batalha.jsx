/* ============================================================
   BATALHA — Console de Batalha
   ============================================================
   Fase 3b: launcher (a partir do HistoriaCard), lista de batalhas
   da história, e tela de montagem (setup) que cria a batalha.

   A condução em si (iniciativa, rodadas, dado, ações, dano) entra
   nas Fases 4-6. Aqui a batalha nasce em estado 'setup'.

   Exports:
   - BatalhasHistoriaView — PÁGINA do Mestre (chamada a partir do
                             HistoriaCard, 06-historias/historias.jsx,
                             mesmo molde de GerenciarLojaView/loja-mng-v3
                             e GerenciarLoreView/lore-mng — header
                             .ms-header com seta de voltar + corpo solto
                             sem moldura própria, não mais ModalShell).
                             3 sub-views internas (lista/nova/conduzir) —
                             ⚠️ 'view' NUNCA assume o valor 'conduzir' de
                             fato; quem controla a condução é o state
                             `abrindo` sozinho (truthy = está conduzindo),
                             independente de `view`. Não testar
                             `view === 'conduzir'` em lugar nenhum — usar só
                             `abrindo`. Nenhuma das 3 sub-views tem footer
                             fixo — todas as ações vivem no slot direito do
                             HEADER, na mesma linha do título; voltar é
                             sempre pela seta (sem botão "Voltar" duplicado
                             em nenhuma sub-view). Durante a condução
                             (abrindo truthy), os botões dinâmicos do filho
                             chegam via onHeaderActionsChange (Iniciar, ou
                             Ação/Passar/Nova Rodada/Encerrar — sem Voltar).
                             DadoOverlay continua como overlay próprio
                             (position:fixed, z-index alto) por cima de
                             tudo — não precisou mudar.

   DB: tabela `batalhas` (migration 007). Vínculos de participantes
   vêm de historias.protagonista_ids (PJs) e historias.criatura_ids
   (criaturas) — migration 008.

   Carregar no HTML APÓS historias.jsx é desnecessário (funções são
   globais e resolvidas em runtime), mas precisa estar na lista de
   <script> antes do App renderizar.
   Depende de: supabaseClient, useState/useEffect (helpers.jsx).

   PRÓXIMO PROJETO (registrado em 06/07/2026, decisão do usuário — NÃO
   tratar como bug em auditorias): automatizar os efeitos hoje apenas
   narrativos/registrados — (a) fórmula do bônus de TÉCNICA anexada ao
   ataque de arma; (b) efeitos da CRITICOS_TABELA (dano EF citado, -4,
   desarme, "impede de atacar por N rodadas").
   FEITO em 07/2026 (Fase 1.2): (d) dano por rodada em status_temp —
   efeito dano_por_rodada DIRETO na EF (ignora EH/AR, decisão do usuário),
   valor digitado pelo Mestre no painel do atalho Envenenado; morde a cada
   virada de rodada ANTES do decremento (montarNovaRodada, consolidada
   entre Mestre e Jogador — a cópia do jogador nem decrementava status).
   FEITO em 07/2026 (Fase 1.1): (c) autodano da Falha Crítica —
   FALHA_CRITICA_TABELA (Config_-_CRITICOS.csv, 5 tipos × 8) com segundo
   dado na mesma coluna, dano pulando EH (AR→EF), e a 1ª leva de EFEITOS
   MECÂNICOS de status_temp (adiantada do item d, decisão do usuário):
   sem_acoes (auto-passe), mod_coluna (−7 em todas as ações), mod_defesa
   (−5 na defesa_valor do alvo) e mod_vb (−5 na iniciativa efetiva);
   rodadas_rest null = até o fim da batalha.
   ============================================================ */

/* ============================== [26] BATALHA — Console ============================== */

function BatalhasHistoriaView({ historia, personagens = [], criaturas = [], lang, currentUserId, onClose }) {
  const [tip, abrirTip, fecharTip] = usePortalTooltip(300);
  const isEn = lang === 'en';
  const tb = tBat(lang); // i18n-sync (Fase 3.3)
  const [view, setView] = useState('lista');     // 'lista' | 'nova' | 'conduzir'
  const [batalhas, setBatalhas] = useState(null);
  const [error, setError] = useState(null);
  const [abrindo, setAbrindo] = useState(null);   // batalha sendo aberta (placeholder Fase 4)

  // Estado das ações do header quando view === 'nova' ("Criar batalha (N)")
  const novaBatalhaRef = useRef(null);           // ref para acionar criar() do filho
  const [novaState, setNovaState] = useState({ saving: false, canConfirm: false, total: 0 });
  // Ações de condução (Ação/Passar/Nova Rodada/Encerrar) recebidas via
  // onHeaderActionsChange do filho — sobem pro slot direito do HEADER
  // (ao lado do título), não mais um footer fixo na base da página. Voltar
  // saiu da fileira: a seta de voltar do header (sempre onClose) cobre essa
  // ação agora, mesmo durante a condução (decisão consciente — antes a seta
  // só fechava a tela vinda de fora; "voltar só pra lista" deixou de existir
  // como destino separado).
  const [headerActions, setHeaderActions] = useState(null);
  // Rolagem pendente sem aplicar dentro da condução (AcaoPanel → ConduzirBatalhaView
  // → aqui) — trava a seta de voltar enquanto durar, fechando a brecha de
  // sair da tela de combate pra escapar de gastar PA numa rolagem já feita.
  const [rolagemPendenteConducao, setRolagemPendenteConducao] = useState(false);

  // Participantes vinculados à história (PJs + criaturas)
  const pjsVinc = (historia.protagonista_ids || [])
    .map((id) => personagens.find((p) => p.id === id))
    .filter(Boolean);
  const criaturasVinc = (historia.criatura_ids || [])
    .map((id) => criaturas.find((c) => c.id === id))
    .filter(Boolean);

  const carregar = async () => {
    const { data, error: err } = await supabaseClient
      .from('batalhas')
      .select('*')
      .eq('historia_id', historia.id)
      .order('created_at', { ascending: false });
    if (err) { setError(err.message); setBatalhas([]); }
    else { setError(null); setBatalhas(data || []); }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, []);

  const excluirBatalha = async (id) => {
    const { error: err } = await supabaseClient.from('batalhas').delete().eq('id', id);
    if (err) { setError(err.message); return; }
    carregar();
  };

  const estadoLabel = (e) => ({
    setup:     tb.montagem,
    ativa:     tb.ativa,
    encerrada: tb.encerrada,
  }[e] || e);

  return (
    <div className="fp-page">
      <div className="fp-card batalha-mng-page">
        <div className="fp-card-top">
          <header className="ms-header ficha-page-header">
        <button
          type="button"
          className="btn-icon btn-sm"
          onClick={onClose}
          disabled={rolagemPendenteConducao}
          onMouseEnter={(e) => rolagemPendenteConducao && abrirTip(e, tb.concluaARolagemPendente)}
          onMouseLeave={fecharTip}
          aria-label={tb.voltarAsHistorias}>
          <i className="ti ti-arrow-left" />
        </button>
        <PortalTooltip tip={tip} onEnter={() => {}} onLeave={fecharTip} />
        <div className="fp-flex-fill">
          <div className="ficha-page-eyebrow">
            <i className="ti ti-swords" aria-hidden="true" />
            {historia.titulo}
          </div>
          <h2 className="ms-title" style={{ margin: 0 }}>{tb.batalhas}</h2>
        </div>
        {view === 'lista' && !abrindo && (
          <button type="button" className="btn-primary btn-sm" onClick={() => setView('nova')}>
            {tb.novaBatalha}
          </button>
        )}
        {view === 'nova' && (
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={!novaState.canConfirm}
            onClick={() => { if (novaBatalhaRef.current) novaBatalhaRef.current(); }}>
            {novaState.saving
              ? (tb.criando)
              : (tb.criarBatalha)}
          </button>
        )}
        {abrindo && headerActions && (
          <div className="batalha-header-acoes">{headerActions}</div>
        )}
          </header>
        </div>
        <div className="batalha-mng-page-body">
        {error && <div className="err-msg">{error}</div>}

        {view === 'nova' ? (
          <NovaBatalhaView
            isEn={isEn}
            pjsVinc={pjsVinc}
            criaturasVinc={criaturasVinc}
            criarRef={novaBatalhaRef}
            onStateChange={setNovaState}
            onCriar={async (participantes) => {
              const { error: err } = await supabaseClient.from('batalhas').insert({
                historia_id: historia.id,
                mestre_id: currentUserId,
                estado: 'setup',
                participantes,
              });
              if (err) { setError(err.message); return; }
              setView('lista');
              carregar();
            }}
          />
        ) : abrindo ? (
          <ConduzirBatalhaView
            batalha={abrindo}
            historia={historia}
            personagens={personagens}
            criaturas={criaturas}
            lang={lang}
            onVoltar={() => { setAbrindo(null); setHeaderActions(null); carregar(); }}
            onAtualizado={() => carregar()}
            onHeaderActionsChange={setHeaderActions}
            onRolagemPendenteChange={setRolagemPendenteConducao}
          />
        ) : (
          <>
            {batalhas === null ? (
              <div className="admin-loading"><span>{tb.carregandoBatalhas}</span></div>
            ) : batalhas.length === 0 ? (
              <div className="hist-protag-empty">
                {tb.nenhumaBatalhaNestaHistoria}
              </div>
            ) : (
              <div className="batalha-lista">
                {batalhas.map((b) => {
                  const qtd = Array.isArray(b.participantes) ? b.participantes.length : 0;
                  const data = b.created_at
                    ? new Date(b.created_at).toLocaleDateString(tb.ptBr,
                        { day: '2-digit', month: 'short', year: 'numeric' })
                    : '';
                  // Rótulo descritivo sem expor o id da linha (que pula números após DELETE).
                  const titulo = b.estado === 'setup'
                    ? (tb.batalhaEmMontagem)
                    : b.estado === 'ativa'
                      ? interpolate(tb.batalhaEmAndamentoRodada, { rodada: b.rodada || 1 })
                      : (tb.batalha);
                  return (
                    <div key={b.id} className="batalha-card">
                      <div className="batalha-card-main">
                        <div className="batalha-card-titulo">
                          {titulo}
                        </div>
                        <div className="batalha-card-meta">
                          {qtd} {tb.participantes}
                          {data ? ` · ${data}` : ''}
                        </div>
                      </div>
                      <div className="batalha-card-actions">
                        <button className="btn-icon btn-sm"
                          onMouseEnter={(e) => abrirTip(e, tb.abrir)} onMouseLeave={fecharTip}
                          onClick={() => setAbrindo(b)}>
                          <i className="ti ti-arrow-right" aria-hidden="true" />
                        </button>
                        <button className="btn-icon btn-danger btn-sm"
                          onMouseEnter={(e) => abrirTip(e, tb.excluir)} onMouseLeave={fecharTip}
                          onClick={() => excluirBatalha(b.id)}>
                          <i className="ti ti-trash" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}

// ── ParticipantSection — seção reutilizável com eyebrow, filtro, bulk-select e grid 4 colunas
// keys: array de strings "tipo:id" que pertencem a esta seção
// items: array de { key, nome, meta, icone } já montado pelo pai
function ParticipantSection({ label, items, sel, onToggle, onSelectAll, onDeselectAll, isEn, qtdMap, onQtd }) {
  const tb = tBat(isEn ? 'en' : 'pt'); // i18n-sync (Fase 3.3): este componente recebe o boolean
  const { Input } = (typeof UI !== 'undefined' ? UI : {});
  const [q, setQ] = useState('');
  const modoQtd = !!qtdMap; // true pra criaturas (stepper), false pra PJs (checkbox)
  const filtered = q.trim()
    ? items.filter((it) => it.nome.toLowerCase().includes(q.trim().toLowerCase()) ||
                           it.meta.toLowerCase().includes(q.trim().toLowerCase()))
    : items;

  const selCount = modoQtd
    ? Array.from(qtdMap.values()).filter((v) => v > 0).length
    : items.filter((it) => sel.has(it.key)).length;
  const allOn  = !modoQtd && items.length > 0 && selCount === items.length;
  const noneOn = !modoQtd && selCount === 0;

  // estilos migrados para index.css (.part-section-eyebrow, .part-section-label,
  // .part-section-count, .part-section-bulk, .part-section-grid)

  const [tip, abrirTip, fecharTip] = usePortalTooltip(300);

  if (items.length === 0) {
    return (
      <div className="part-section">
        <div className="hist-protag-empty part-section-empty">
          {tb.nenhumVinculadoAEsta}
        </div>
      </div>
    );
  }

  return (
    <div className="part-section">
      {/* Filtro inline com bulk actions — mesma linha */}
      <div className="part-section-filter-row">
        <div className="best-search">
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tb.filtrar}
          />
        </div>
        <div className="part-section-bulk">
          {modoQtd ? (
            /* Criaturas: bulk actions — ícones representativos da ação */
            <>
              <button type="button" className="btn-icon btn-sm"
                onMouseEnter={(e) => abrirTip(e, tb.umaDeCada)}
                onMouseLeave={fecharTip}
                onClick={() => items.forEach((it) => onQtd(it.key, 1))}>
                <i className="ti ti-copy" aria-hidden="true" />
              </button>
              <button type="button" className="btn-icon btn-sm"
                onMouseEnter={(e) => abrirTip(e, tb.zerarTodas)}
                onMouseLeave={fecharTip}
                disabled={selCount === 0}
                onClick={() => items.forEach((it) => onQtd(it.key, 0))}>
                <i className="ti ti-ban" aria-hidden="true" />
              </button>
              <button type="button" className="btn-icon btn-sm"
                onMouseEnter={(e) => abrirTip(e, tb.maisUmaDeCada)}
                onMouseLeave={fecharTip}
                onClick={() => items.forEach((it) => onQtd(it.key, (qtdMap.get(it.key) ?? 0) + 1))}>
                <i className="ti ti-plus" aria-hidden="true" />
              </button>
            </>
          ) : (
            /* PJs: bulk actions originais */
            <>
              <button type="button" className="btn-icon btn-sm"
                onMouseEnter={(e) => abrirTip(e, tb.selecionarTodos)}
                onMouseLeave={fecharTip}
                disabled={allOn}
                onClick={onSelectAll}>
                <i className="ti ti-checkbox" aria-hidden="true" />
              </button>
              <button type="button" className="btn-icon btn-sm"
                onMouseEnter={(e) => abrirTip(e, tb.desmarcarTodos)}
                onMouseLeave={fecharTip}
                disabled={noneOn}
                onClick={onDeselectAll}>
                <i className="ti ti-square" aria-hidden="true" />
              </button>
              <button type="button" className="btn-icon btn-sm"
                onMouseEnter={(e) => abrirTip(e, tb.inverterSelecao)}
                onMouseLeave={fecharTip}
                onClick={() => items.forEach((it) => onToggle(it.key))}>
                <i className="ti ti-switch-horizontal" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
      <PortalTooltip tip={tip} onEnter={() => {}} onLeave={fecharTip} />

      {/* Grid 4 colunas */}
      {filtered.length === 0 ? (
        <div className="part-section-empty">
          {tb.semResultados}
        </div>
      ) : (
        <div className="part-section-grid">
          {filtered.map((it) => {
            if (modoQtd) {
              // Modo criatura: checkbox + nome inline; stepper aparece só quando selecionada (qtd > 0)
              const qtd = qtdMap.get(it.key) ?? 1;
              const ativa = qtd > 0;
              return (
                <div
                  key={it.key}
                  className={'hist-protag-item modo-qtd' + (ativa ? ' on' : '')}
                  onClick={() => onQtd(it.key, ativa ? 0 : 1)}
                >
                  {/* Checkbox visual (não nativo) */}
                  <div className="part-check-visual">
                    {ativa && <i className="ti ti-check" aria-hidden="true" />}
                  </div>
                  {/* Linha 1: nome + stepper inline (só quando ativa) */}
                  <div className="part-item-row1">
                    <span className="hist-protag-name">{it.nome}</span>
                    {ativa && (
                      <div className="part-qty-stepper" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="part-qty-btn" disabled={qtd <= 1}
                          onClick={() => onQtd(it.key, qtd - 1)} aria-label="-">
                          <i className="ti ti-minus" aria-hidden="true" />
                        </button>
                        <span className="part-qty-val">{qtd}</span>
                        <button type="button" className="part-qty-btn"
                          onClick={() => onQtd(it.key, qtd + 1)} aria-label="+">
                          <i className="ti ti-plus" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Linha 2: meta */}
                  <div className="hist-protag-meta">{it.meta}</div>
                </div>
              );
            }
            // Modo PJ: checkbox original
            const on = sel.has(it.key);
            return (
              <label
                key={it.key}
                className={'hist-protag-item' + (on ? ' on' : '')}
              >
                <input type="checkbox" checked={on} onChange={() => onToggle(it.key)} />
                <div className="hist-protag-name">{it.nome}</div>
                <div className="hist-protag-meta">{it.meta}</div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Tela de montagem: lista PJs e criaturas vinculados, todos pré-marcados.
// onCriar      — callback assíncrono que recebe o array de participantes
// criarRef     — ref exposto ao pai para que ele possa acionar criar() via ModalShell footer
// onStateChange— notifica o pai sempre que saving/canConfirm mudam (para controlar confirmDisabled/confirmLabel)
function NovaBatalhaView({ isEn, pjsVinc, criaturasVinc, onCriar, criarRef, onStateChange }) {
  const tb = tBat(isEn ? 'en' : 'pt'); // i18n-sync (Fase 3.3): este componente recebe o boolean
  const nomePj = (p) => `${p.nome}${p.sobrenome ? ' ' + p.sobrenome : ''}`;

  // PJs: Set simples (checkbox — cada PJ entra 0 ou 1 vez)
  const [selPj, setSelPj] = useState(() => new Set(pjsVinc.map((p) => 'pj:' + p.id)));
  // Criaturas: Map<key, qtd> — 0 = não inclusa, N ≥ 1 = N instâncias
  const [qtdCri, setQtdCri] = useState(() => new Map(criaturasVinc.map((c) => ['cri:' + c.id, 1])));
  const [saving, setSaving] = useState(false);

  const togglePj = (key) => setSelPj((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
  const setQtd = (key, v) => setQtdCri((prev) => {
    const next = new Map(prev);
    next.set(key, Math.max(0, v));
    return next;
  });

  const totalCri = Array.from(qtdCri.values()).reduce((s, q) => s + q, 0);
  const total = selPj.size + totalCri;
  const semVinculados = pjsVinc.length === 0 && criaturasVinc.length === 0;

  const criar = async () => {
    setSaving(true);
    const participantes = [
      ...pjsVinc.filter((p) => selPj.has('pj:' + p.id))
        .map((p) => ({ tipo: 'pj', ref_id: p.id, nome: nomePj(p) })),
      // Criaturas: expande qtd>1 em múltiplos participantes, cada uma com inst_id único
      // para que duas criaturas da mesma raça (mesmo ref_id) sejam distinguíveis em combate.
      ...criaturasVinc.flatMap((c) => {
        const q = qtdCri.get('cri:' + c.id) || 0;
        return Array.from({ length: q }, (_, i) => ({
          tipo: 'criatura', ref_id: c.id, nome: c.nome,
          inst_id: `cri:${c.id}:${Date.now()}:${i}:${Math.random().toString(36).slice(2,7)}`,
        }));
      }),
    ];
    await onCriar(participantes);
    setSaving(false);
  };

  // Expõe criar() ao pai via ref
  useEffect(() => { if (criarRef) criarRef.current = criar; });

  // Notifica o pai sobre mudanças de estado que afetam o footer do ModalShell
  useEffect(() => {
    if (onStateChange) onStateChange({ saving, canConfirm: !saving && total > 0 && !semVinculados, total });
  }, [saving, total, semVinculados]); // eslint-disable-line react-hooks/exhaustive-deps

  // Monta arrays de itens para cada seção
  const pjItems    = pjsVinc.map((p) => ({ key: 'pj:' + p.id, nome: nomePj(p), meta: [p.raca, p.profissao].filter(Boolean).join(' · ') }));
  const criatItems = criaturasVinc.map((c) => ({ key: 'cri:' + c.id, nome: c.nome, meta: [c.tipo || null, c.estagio != null ? `${tb.estagio} ${c.estagio}` : null].filter(Boolean).join(' · ') }));

  const selectAll   = (keys) => setSelPj((prev) => { const next = new Set(prev); keys.forEach((k) => next.add(k)); return next; });
  const deselectAll = (keys) => setSelPj((prev) => { const next = new Set(prev); keys.forEach((k) => next.delete(k)); return next; });

  return (
    <>
      <p className="subhead nova-batalha-intro">
        {tb.essaEAHora}
      </p>
      <ParticipantSection
        label={tb.jogadores}
        items={pjItems}
        sel={selPj}
        onToggle={togglePj}
        onSelectAll={()  => selectAll(pjItems.map((i) => i.key))}
        onDeselectAll={() => deselectAll(pjItems.map((i) => i.key))}
        isEn={isEn}
      />
      <ParticipantSection
        label={tb.criaturas}
        items={criatItems}
        sel={selPj}
        onToggle={togglePj}
        onSelectAll={null}
        onDeselectAll={null}
        isEn={isEn}
        qtdMap={qtdCri}
        onQtd={setQtd}
      />
      {/* Footer renderizado pelo ModalShell do pai via onCancel/onConfirm — não há wiz-actions aqui */}
    </>
  );
}

/* ── Dano de uma magia no nível efetivo do conjurador ─────────── */
/* Extrai o número do texto `nivel_N` (ex.: "Cause 16 de dano base."). */
/* Fallback: campo `dano` da tabela (que costuma ser o do nível 9).    */
function danoMagiaNoNivel(magia, nivelEfetivo) {
  if (!magia) return 0;
  const campo = 'nivel_' + nivelEfetivo;
  const txt = magia[campo];
  if (txt) {
    const m = /(\d+)\s*de\s*dano/i.exec(txt);
    if (m) return parseInt(m[1], 10);
  }
  return magia.dano || 0;
}

/* ── Modificador de VELOCIDADE lido do texto do nível ──────────────
   Mesmo molde de danoMagiaNoNivel acima: o catálogo descreve o efeito em
   prosa, e a gente pesca o número. Levantamento de 01/09/2026 mostrou que as
   oito magias que modificam velocidade seguem um padrão único:

     "Aumente 2 de velocidade."                        → +2
     "Reduza 4 pontos de velocidade."                  → -4
     "Aumente 1 coluna de ataque e 2 de velocidade."   → +2

   O DISCRIMINADOR é a posição do número: modificador é sempre
   `número + "de velocidade"`. Quem só DESCREVE velocidade põe o número
   depois ("velocidade de 5 metros por rodada" na Telecinese, "com velocidade
   20" na Unidade Natural) ou não põe número nenhum ("revele sua velocidade",
   Olhar de Predador) — e esses não podem entrar, senão Telecinese viraria um
   buff de +5.

   Sem verbo Aumente/Reduza abrindo a frase o sinal é ambíguo: devolve 0 em
   vez de chutar. RE_VERBO_MOD aceita "Reduza5" grudado, typo real do
   catálogo em Ruído Extenuante. */
const RE_MOD_VEL = /(\d+)\s*(?:pontos?\s+)?de\s+velocidade/i;
const RE_VERBO_MOD = /^\s*(aumente|reduza)/i;

function modVelocidadeNoNivel(magia, nivelEfetivo) {
  if (!magia) return 0;
  const txt = magia['nivel_' + nivelEfetivo];
  if (!txt) return 0;
  const mv = RE_MOD_VEL.exec(txt);
  if (!mv) return 0;
  const verbo = RE_VERBO_MOD.exec(txt);
  if (!verbo) return 0;
  const valor = parseInt(mv[1], 10);
  if (!Number.isFinite(valor)) return 0;
  return /reduza/i.test(verbo[1]) ? -valor : valor;
}

/* ── Duração da magia, traduzida para rodadas de batalha ───────────
   A coluna `duracao` é texto livre e heterogênea. Três casos:
     "2 rodadas", "10 rodadas"  → contagem direta
     "Variável"                 → CONCENTRAÇÃO (ver quebrarConcentracao): o
                                  conjurador sustenta a magia e não pode fazer
                                  mais nada. Não é uma duração.
     "30 minutos", "1 hora", "6 horas", "1 ano e 1 dia"
                                → mais longo que qualquer batalha; dentro do
                                  combate equivale a "até o fim". */
const RE_RODADAS = /(\d+)\s*rodadas?/i;

function duracaoEmRodadas(magia) {
  const txt = (magia && magia.duracao) || '';
  if (/vari[áa]vel/i.test(txt)) return { rodadas: null, concentracao: true };
  const m = RE_RODADAS.exec(txt);
  if (m) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n > 0) return { rodadas: n, concentracao: false };
  }
  return { rodadas: null, concentracao: false };
}

/* ── A magia exige teste de resistência do alvo? ───────────────────
   Levantamento de 01/09/2026: as quatro magias que exigem rolagem dizem,
   todas, literalmente "teste de resistência mágica" na descrição. As outras
   quatro não mencionam teste algum.

   ANCORAR NA FRASE INTEIRA, nunca em palavras soltas: um padrão largo
   (teste|resist|falh|passar) casa o "passar" dentro de "ultrapassar 30" na
   descrição da magia Velocidade — que NÃO pede teste nenhum. Erro cometido de
   verdade na investigação; há teste de regressão pra ele. */
const RE_RESIST = /teste\s+de\s+resist[êe]ncia\s+(m[áa]gica|f[íi]sica)/i;

function exigeResistencia(magia) {
  const txt = (magia && magia.descricao) || '';
  const m = RE_RESIST.exec(txt);
  if (!m) return null;
  return /m[áa]gica/i.test(m[1]) ? 'rm' : 'rf';
}

/* ── Magias ofensivas conhecidas pelo PJ ──────────────────────── */
/* Filtra magias com passos>0 que entregam dano > 0 no nível efetivo. */
/* Custo de karma = nível efetivo (1/3/5/7/9), por decisão do sistema. */
function magiasOfensivasDoAtor(ator, catalogos) {
  if (!ator || ator.tipo !== 'pj' || !catalogos) return [];
  const pj = catalogos.pjById[ator.ref_id];
  if (!pj || !pj.magias) return [];
  const out = [];
  Object.entries(pj.magias).forEach(([key, passos]) => {
    const p = passos || 0;
    if (p <= 0) return;
    const m = catalogos.magiasByKey[key];
    if (!m) return;
    const nivel = (typeof nivelMagiaEfetivo === 'function') ? nivelMagiaEfetivo(p) : (p * 2 - 1);
    const dano  = danoMagiaNoNivel(m, nivel);
    if (dano <= 0) return; // não-ofensiva → fora desta fase (cura/buff vêm depois)
    out.push({
      fonte: 'magia',
      key, nome: m.nome,
      passos: p, nivel,           // nível efetivo (1/3/5/7/9)
      custo_karma: nivel,         // 1 karma p/ nível, conforme regra
      dano,                       // base; tier final calculado por danoNoTier
      descricao: m['nivel_' + nivel] || null, // texto do nível efetivo
      evocacao: m.evocacao || null,
      alcance: m.alcance || null,
    });
  });
  return out;
}

/* ── Magias de APOIO conhecidas pelo PJ ────────────────────────────
   Espelha magiasOfensivasDoAtor logo acima, trocando o critério: em vez de
   "entrega dano > 0 no nível efetivo", é "modifica velocidade no nível
   efetivo". Mesma regra de karma do sistema (custo = nível efetivo).

   Uma magia pode causar dano E mexer em velocidade; nesse caso aparece nas
   duas listas, e é o Mestre que escolhe por qual aba usá-la. */
function magiasDeApoioDoAtor(ator, catalogos) {
  if (!ator || ator.tipo !== 'pj' || !catalogos) return [];
  const pj = catalogos.pjById[ator.ref_id];
  if (!pj || !pj.magias) return [];
  const out = [];
  Object.entries(pj.magias).forEach(([key, passos]) => {
    const p = passos || 0;
    if (p <= 0) return;
    const m = catalogos.magiasByKey[key];
    if (!m) return;
    const nivel = (typeof nivelMagiaEfetivo === 'function') ? nivelMagiaEfetivo(p) : (p * 2 - 1);
    const mod_vb = modVelocidadeNoNivel(m, nivel);
    if (mod_vb === 0) return;   // não modifica velocidade → fora da lista
    const dur = duracaoEmRodadas(m);
    out.push({
      fonte: 'magia',
      key, nome: m.nome,
      passos: p, nivel,
      custo_karma: nivel,         // 1 karma por nível, mesma regra das ofensivas
      mod_vb,
      rodadas: dur.rodadas,
      concentracao: dur.concentracao,
      resistencia: exigeResistencia(m),
      // alcance "Pessoal" = só em si mesmo. É o caso da magia Velocidade, a
      // única das nove com esse alcance — e justamente a que os PJs conhecem.
      pessoal: /pessoal/i.test(m.alcance || ''),
      alcance: m.alcance || null,
      descricao: m['nivel_' + nivel] || null,
    });
  });
  return out;
}

/* ── Técnicas conhecidas pelo PJ ──────────────────────────────── */
/* Hoje a técnica vive como "modificador anexado ao ataque da arma". */
/* Retornamos os metadados úteis pro select; a mecânica fica TODO    */
/* até o usuário definir a fórmula numérica do bônus.                */
function tecnicasDoAtor(ator, catalogos) {
  if (!ator || ator.tipo !== 'pj' || !catalogos || !catalogos.tecnicasByKey) return [];
  const pj = catalogos.pjById[ator.ref_id];
  if (!pj || !pj.tecnicas) return [];
  const ficha = (typeof calcularFicha === 'function')
    ? calcularFicha(pj, catalogos.catalogoBySlug, ator.condicoes || pj.estado_atual?.condicoes) : { atributos: {} };
  const atributos = ficha.atributos || {};
  const out = [];
  Object.entries(pj.tecnicas).forEach(([key, nivel]) => {
    const n = nivel || 0;
    if (n <= 0) return;
    const t = catalogos.tecnicasByKey[key];
    if (!t) return;
    const total = (typeof totalTecnica === 'function') ? totalTecnica(t, pj.tecnicas, atributos) : null;
    out.push({
      fonte: 'tecnica',
      key, nome: t.nome, nivel: n,
      total,
      uso: t.uso || null,
      grupo_armas: t.grupo_armas || null,
      // 09/09/2026: grupo_armaduras passou a ser regra (tecnicaPermitida).
      grupo_armaduras: t.grupo_armaduras || null,
      efeito: t.efeito || null,
    });
  });
  return out;
}

/* ── Filtra técnicas compatíveis com a arma equipada ──────────── */
/* Regra: técnica com `grupo_armas` específico (ex.: "CM") só       */
/* aparece para armas daquele grupo. 'Livre', vazio e null são      */
/* genéricas e aparecem para todas.                                 */
/* 09/09/2026 — 'Livre' NÃO era tratado: o teste era `!t.grupo_armas`,
   e 'Livre' é truthy, então caía no includes e as 31 técnicas
   genéricas (mais da metade da tabela) sumiam do dropdown. Agora a
   normalização passa por gruposDeArma, que devolve null para 'Livre'. */
function tecnicasCompativeisComArma(tecnicas, arma, catalogos) {
  if (!Array.isArray(tecnicas) || tecnicas.length === 0) return [];
  // grupoDaArma unifica a derivação (higiene 9, revisão final): sem arma OU
  // arma sem grupo identificável colapsam no mesmo `null`, e o filtro abaixo
  // já trata os dois casos igual (só as técnicas genéricas passam).
  const grupoArma = grupoDaArma(arma, catalogos);
  return tecnicas.filter((t) => {
    const grupos = gruposDeArma(t.grupo_armas);
    if (!grupos) return true;              // genérica
    if (!grupoArma) return false;          // arma sem grupo → não casa específica
    return grupos.includes(grupoArma);
  });
}

/* A técnica pode ser ATIVADA com o equipamento atual?
   Duas portas, as duas vindas do banco:
     grupo_armas      → a arma empunhada (grupo_sigla do ataque)
     grupo_armaduras  → a armadura vestida (defesa_sigla do snapshot, L/M/P)
   'Livre' libera. A arma é checada primeiro porque é a restrição que o
   jogador resolve trocando de item na hora.

   grupo_armaduras nunca tinha virado regra em lugar nenhum até 09/09/2026 —
   só era exibido no bestiário e na ficha. */
function tecnicaPermitida(tecnica, ator, arma, catalogos) {
  const gArmas = gruposDeArma(tecnica && tecnica.grupo_armas);
  if (gArmas) {
    const grupoArma = grupoDaArma(arma, catalogos);
    if (!grupoArma || !gArmas.includes(grupoArma)) return { pode: false, motivo: 'arma' };
  }
  const gArmaduras = gruposDeArma(tecnica && tecnica.grupo_armaduras);
  if (gArmaduras) {
    const sigla = ((ator && ator.defesa_sigla) || 'L').toUpperCase();
    if (!gArmaduras.includes(sigla)) return { pode: false, motivo: 'armadura' };
  }
  return { pode: true, motivo: null };
}

/* ── Pontos de ação por classe (spec do sistema) ──────────────── */
// 09/09/2026: o 2º ponto de ação passou a ser prêmio da ESPECIALIZAÇÃO.
// Antes, Guerreiro/Ladino já nasciam com 2 e subiam para 4 especializados —
// saíam na frente das demais profissões desde o estágio 1. Agora todo mundo
// começa com 1.
// O +1 por velocidade > 30 (processarViradaDeRodada) continua por cima disto:
// um especializado veloz age 3 vezes, não 2.
function pontosAcaoPJ(pj) {
  const prof = pj.profissao;
  const guerreiroOuLadino = prof === 'Guerreiro' || prof === 'Ladino';
  return (guerreiroOuLadino && pj.especializacao) ? 2 : 1;
}

/* ── Dano em cascata EH → AR → EF (com transbordo) ────────────── */
/* Crítico pula a EH e começa na AR. Excedente após a EF bater o piso de   */
/* morte é "sobra" (overkill).                                             */
/* Regras confirmadas (06/07/2026):                                        */
/*   • EH chegar a 0 DESMAIA sempre (também no meio do combate). Guarda    */
/*     eh_max > 0: combatente sem pool de EH não vive desmaiado.           */
/*   • A EF fica NEGATIVA: absorve dano até o piso EF_MORTE (−15). Entre   */
/*     0 e −14 o personagem está caído (desmaiado, morrendo); EF ≤ −15 =   */
/*     MORTO. EF 0 deixou de ser morte imediata.                           */
/* O 3º parâmetro era um booleano `critico`. Virou objeto de modificadores
   na Fase 2 das técnicas, porque agora há três motivos diferentes pra pular
   uma camada: crítico, `ignora_eh` (Golpe Letal e as 5 irmãs, mais a
   condição Derrubado) e `ignora_armadura` (Disparo Certeiro, Explorar
   Fraqueza). Booleano ainda é aceito e vira `{ critico: <valor> }` — os
   chamadores antigos não mudam de comportamento, e motor-batalha.test.js
   prova isso sem alterar uma expectativa. */
const EF_MORTE = -15;
function aplicarDanoCascata(dano, p, mods) {
  const m = (mods && typeof mods === 'object') ? mods : { critico: !!mods };
  const pulaEh = !!(m.critico || m.ignoraEh);
  let r = Math.max(0, Math.floor(dano || 0));
  let eh = p.eh, ar = p.ar, ef = p.ef;
  if (!pulaEh && eh > 0)          { const c = Math.min(eh, r); eh -= c; r -= c; }
  if (r > 0 && !m.ignoraArmadura && ar > 0) { const c = Math.min(ar, r); ar -= c; r -= c; }
  if (r > 0 && ef > EF_MORTE) { const c = Math.min(ef - EF_MORTE, r); ef -= c; r -= c; }
  let status = p.status;
  // Qualquer um que não esteja morto pode morrer — inclusive quem desistiu.
  // Espelha podeSerAtacado: se dá pra atacar, tem que dar pra matar, senão o
  // alvo vira saco de pancada imortal.
  if (ef <= EF_MORTE && status !== 'morto') status = 'morto';
  else if ((ef <= 0 || (eh === 0 && (p.eh_max || 0) > 0)) && status === 'ativo') status = 'desmaiado';
  return { ...p, eh, ar, ef, status, sobra: r };
}

/* ── Chaves das 8 condições (Reputação, Sono, Sanidade, Saúde, Hidratação,
   Sobriedade, Temperatura, Alimentação) — derivadas de EFEITO_CONDICAO_MAP
   (01-core/inventario-helpers.jsx) por scope==='condicoes', pra nunca
   divergir do mapa real caso ganhe/perca um label. Fallback hardcoded só
   se o helper ainda não tiver carregado (não deveria acontecer na ordem
   real de import, mas evita undefined.values() quebrar o snapshot). */
const CONDICOES_KEYS = (typeof EFEITO_CONDICAO_MAP === 'object' && EFEITO_CONDICAO_MAP)
  ? Object.values(EFEITO_CONDICAO_MAP).filter((v) => v.scope === 'condicoes').map((v) => v.key)
  : ['reputacao', 'animo', 'sanidade', 'vitalidade', 'hidratacao', 'euforia', 'termorregulacao', 'nutricao'];


/* ── Monta o snapshot de combate de cada participante ───────────
   personagensPools (opcional): jsonb da história { [pjId]: { ef, eh, ar, karma } }.
   Se a chave do PJ existe, esses valores entram como o "atual" do snapshot;
   max continua sendo o calculado da ficha (sequela = atual < max).      */
async function montarSnapshots(parts, personagensPools) {
  const pools = personagensPools || {};
  // Garante inst_id único em todos os participantes — inclusive batalhas antigas
  // criadas antes desta correção, que não têm inst_id no banco.
  const partsComInstId = parts.map((p, i) => ({
    ...p,
    inst_id: p.inst_id || `${p.tipo}:${p.ref_id}:boot:${i}:${Math.random().toString(36).slice(2, 7)}`,
  }));
  const pjIds  = partsComInstId.filter((p) => p.tipo === 'pj').map((p) => p.ref_id);
  const criIds = partsComInstId.filter((p) => p.tipo === 'criatura').map((p) => p.ref_id);
  const [pjRes, itRes, criRes] = await Promise.all([
    pjIds.length  ? supabaseClient.from('personagens').select('*').in('id', pjIds) : Promise.resolve({ data: [] }),
    fetchCatalogoCompleto(),
    criIds.length ? supabaseClient.from('criaturas').select('*').in('id', criIds)  : Promise.resolve({ data: [] }),
  ]);
  const catalogoBySlug = {};
  (itRes.data || []).forEach((it) => { catalogoBySlug[it.slug] = it; });
  const pjById = {};  (pjRes.data  || []).forEach((p) => { pjById[p.id] = p; });
  const criById = {}; (criRes.data || []).forEach((c) => { criById[c.id] = c; });

  return partsComInstId.map((p) => {
    if (p.tipo === 'pj') {
      const pj = pjById[p.ref_id];
      if (!pj) {
        const condicoesVazias = {};
        CONDICOES_KEYS.forEach((k) => { condicoesVazias[k] = 0; });
        return { ...p, vb: 0, pa_max: 1, pa_rest: 1, eh: 0, eh_max: 0, ar: 0, ar_max: 0, ef: 0, ef_max: 0, karma: 0, karma_max: 0, condicoes: condicoesVazias, defesa_sigla: 'L', defesa_valor: 0, rf: 0, rm: 0, status: 'ativo', ausente: true };
      }
      const d = calcularFicha(pj, catalogoBySlug, pj.estado_atual?.condicoes).derivadas;
      const pa = pontosAcaoPJ(pj);
      const defParsed = /^([TLMP])(-?\d+)$/.exec(String(d.defesa || ''));
      // Pools atuais — PRIORIDADE: estado_atual.vitalidade (fonte canônica —
      // é onde a ficha grava edições e onde o encerramento persiste as
      // sequelas) → personagens_pools (só dados LEGADOS de batalhas
      // encerradas antes da migração p/ estado_atual; encerramentos novos
      // limpam o pool) → máximo (barras cheias).
      // Sem essa ordem, um pool antigo com ef −15 "ressuscitava" a morte
      // mesmo depois do usuário restaurar a saúde na ficha.
      const persist   = pools[p.ref_id] || null;                 // legado
      const vitEstado = pj.estado_atual?.vitalidade || null;     // canônico
      const ehMax = d.energiaHeroica || 0;
      const arMax = d.absorcao || 0;
      const efMax = d.energiaFisica || 0;
      const kMax  = d.karma || 0;
      const ehCur = (vitEstado && Number.isFinite(vitEstado.eh))
        ? Math.max(0, Math.min(ehMax, vitEstado.eh))
        : (persist && Number.isFinite(persist.eh))
          ? Math.max(0, Math.min(ehMax, persist.eh))
          : ehMax;
      // AR é a ÚNICA pool sem teto na entrada (decisão do usuário,
      // 01/09/2026: "o buff pode ficar acima fora de combate"). Um elixir de
      // Absorção passa do ar_max de propósito — aplicarEfeitosItem e
      // aplicarEfeitoItemSnapshot já não põem teto nesse escopo, e cortar
      // aqui fazia o buff evaporar entre um combate e o seguinte. Piso 0
      // continua valendo. Cobertura: 12-batalha/entrada-pools.test.js.
      const arCur = (vitEstado && Number.isFinite(vitEstado.ar))
        ? Math.max(0, vitEstado.ar)
        : (persist && Number.isFinite(persist.ar))
          ? Math.max(0, persist.ar)
          : arMax;
      // EF aceita NEGATIVO (piso EF_MORTE): morto encerrado persiste ef −15;
      // caído-vivo pode persistir entre −14 e 0. ⚠️ Dados LEGADOS: batalhas
      // encerradas antes desta regra gravavam morto como ef 0 — esses PJs
      // passam a entrar como DESMAIADOS (vivos).
      const efCur = (vitEstado && Number.isFinite(vitEstado.ef))
        ? Math.max(EF_MORTE, Math.min(efMax, vitEstado.ef))
        : (persist && Number.isFinite(persist.ef))
          ? Math.max(EF_MORTE, Math.min(efMax, persist.ef))
          : efMax;
      // Karma: estado_atual.vitalidade usa 'ka' (padrão ficha); pools usa 'karma'.
      const kCur  = (vitEstado && Number.isFinite(vitEstado.ka))
        ? Math.max(0, Math.min(kMax, vitEstado.ka))
        : (persist && Number.isFinite(persist.karma))
          ? Math.max(0, Math.min(kMax, persist.karma))
          : kMax;
      // Status de entrada espelha a cascata: morto só no piso; EF ≤ 0 ou EH
      // zerada (com pool) entram desmaiados.
      const status = (efCur <= EF_MORTE) ? 'morto'
        : ((efCur <= 0 || (ehMax > 0 && ehCur <= 0)) ? 'desmaiado' : 'ativo');
      // Condições (Reputação, Sono, Sanidade, Saúde, Hidratação, Sobriedade,
      // Temperatura, Alimentação) — herdam direto de pj.estado_atual.condicoes
      // (NÃO via personagens_pools, que é só pra eh/ar/ef/karma). Escala
      // -COND_LIMITE..+COND_LIMITE, 0 = neutro; sem "_max" próprio; ausente =
      // 0 (mesmo default de aplicarEfeitosItem — era 100/"cheio" na escala antiga).
      const _COND_LIMITE = (typeof COND_LIMITE !== 'undefined' ? COND_LIMITE : null) ?? window.COND_LIMITE ?? 50;
      const condBase = (pj.estado_atual && pj.estado_atual.condicoes) || {};
      const condicoes = {};
      CONDICOES_KEYS.forEach((k) => {
        const v = Number(condBase[k]);
        condicoes[k] = Number.isFinite(v) ? Math.max(-_COND_LIMITE, Math.min(_COND_LIMITE, v)) : 0;
      });
      return {
        tipo: 'pj', ref_id: p.ref_id, nome: p.nome,
        inst_id: p.inst_id,   // garantido por partsComInstId acima
        // TABULEIRO: posição herdada do participante (quem já estava colocado
        // não volta pra bancada ao remontar), movimento cheio da rodada, e
        // foto/raça pro token. Ver 12-batalha/tabuleiro.jsx.
        pos: (p.pos && posValida(p.pos)) ? { x: p.pos.x, y: p.pos.y } : null,
        mov_rest: movimentoBase(d.velocidade || 0),
        foto_url: pj.foto_url || null,
        raca: pj.raca || null,
        vb: d.velocidade || 0, pa_max: pa, pa_rest: pa,
        eh: ehCur, eh_max: ehMax,
        ar: arCur, ar_max: arMax,
        ef: efCur, ef_max: efMax,
        karma: kCur, karma_max: kMax,
        condicoes,
        defesa_sigla: defParsed ? defParsed[1] : 'L',
        defesa_valor: defParsed ? parseInt(defParsed[2], 10) : 0,
        rf: d.resistenciaFisica || 0,
        rm: d.resistenciaMagica || 0,
        status,
        status_temp: [],   // Fase 6: array de { id, nome, icone, rodadas_rest }
        tecnicas_usadas: [],   // Task 8: keys de técnicas Único já gastas nesta batalha
        tecnica_livre_usada: false,   // REGRA NOVA: ativação livre (0 PA) já usada nesta rodada
      };
    }
    const c = criById[p.ref_id];
    if (!c) return { ...p, vb: 0, pa_max: 1, pa_rest: 1, eh: 0, eh_max: 0, ar: 0, ar_max: 0, ef: 0, ef_max: 0, karma: 0, karma_max: 0, defesa_sigla: 'L', defesa_valor: 0, rf: 0, rm: 0, status: 'ativo', ausente: true };
    // RF/RM DERIVADOS, não lidos da linha: a tabela `criaturas` não tem colunas
    // de resistência (`resistencia_fisica`/`resistencia_magica` nem existem — o
    // SELECT falha com 42703), então o `|| 0` de antes deixava TODA criatura com
    // RF 0 e RM 0 no card do lutador. Mesma resistenciasBase do PJ
    // (01-core/game-data.jsx) sobre estagio/fisico/aura, preenchidos nas 207.
    const resist = resistenciasBase(c.estagio, c.fisico, c.aura);
    return {
      tipo: 'criatura', ref_id: p.ref_id, nome: p.nome,
      inst_id: p.inst_id,   // garantido por partsComInstId acima
      // TABULEIRO (ver bloco equivalente do PJ acima). Criatura não tem foto;
      // o token cai na inicial do nome. `raca` vem do tipo da criatura.
      pos: (p.pos && posValida(p.pos)) ? { x: p.pos.x, y: p.pos.y } : null,
      mov_rest: movimentoBase(c.velocidade || 0),
      foto_url: null,
      raca: c.tipo || null,
      vb: c.velocidade || 0, pa_max: 1, pa_rest: 1,
      eh: c.energia_heroica || 0, eh_max: c.energia_heroica || 0,
      ar: c.absorcao || 0,        ar_max: c.absorcao || 0,
      ef: c.energia_fisica || 0,  ef_max: c.energia_fisica || 0,
      karma: 0, karma_max: 0,
      // Sigla de defesa: `criaturas.armadura` (L/M/P) — é o campo que o
      // formulário de criatura grava ("Tipo de Armadura", 13-diario) e que a
      // ficha da criatura exibe fundido com a defesa ("M4"). NÃO usar
      // `tipo_armadura`: essa coluna existe na tabela mas está NULL em todas
      // as 207 criaturas (é o nome do campo equivalente em `itens`) — lê-la
      // fazia TODA criatura defender como Leve, e o atacante caía na coluna L
      // em vez da M/P do alvo (89 das 207 criaturas são M ou P).
      defesa_sigla: siglaArmadura(c.armadura),
      defesa_valor: c.defesa || 0,
      rf: resist.rf,
      rm: resist.rm,
      status: 'ativo',
      status_temp: [],
      tecnicas_usadas: [],   // Task 8: keys de técnicas Único já gastas nesta batalha
      tecnica_livre_usada: false,   // REGRA NOVA: ativação livre (0 PA) já usada nesta rodada
    };
  });
}

/* ── Aplica o efeito de um item consumível no SNAPSHOT de um participante
   de batalha — adaptação de aplicarEfeitosItem (01-core/inventario-helpers.jsx),
   que mira pj.estado_atual (fora de combate). Aqui o alvo é o shape do
   snapshot: eh/eh_max, ef/ef_max, karma/karma_max (clamp no _max real do
   snapshot, que pode já estar reduzido por sequela — não no max "cheio" da
   ficha), ar sem teto pro label 'Absorção' (buff temporário, mesma regra
   do original), e condicoes na escala -COND_LIMITE..+COND_LIMITE.

   O PARSE dos deltas (efeitosDoItem) e o clamp da condição
   (aplicarDeltaCondicao) vêm de 01-core/inventario-helpers.jsx, os mesmos
   que aplicarEfeitosItem usa fora de combate: as duas funções continuam
   separadas só porque os shapes de destino diferem — a CONTA é uma só.
   Isso não é preciosismo: no encerramento, as condições do snapshot vão pra
   personagens.estado_atual (estadoAoEncerrar), então uma divergência de
   escala faria o combate gravar por cima da ficha em outra unidade.
   Acordo travado em 12-batalha/efeito-item-escala.test.js.

   Retorna um NOVO objeto de participante (não muta o original). */
function aplicarEfeitoItemSnapshot(participante, cat, quantidade) {
  const efeitos = efeitosDoItem(cat, quantidade);
  if (efeitos.length === 0) return participante;

  const novo = { ...participante, condicoes: { ...(participante.condicoes || {}) } };

  for (const ef of efeitos) {
    const delta = ef.delta;
    if (ef.scope === 'condicoes') {
      novo.condicoes[ef.key] = aplicarDeltaCondicao(novo.condicoes[ef.key], delta);
    } else if (ef.scope === 'vitalidade') {
      // eh/ef/ka (Karma) no snapshot — clamp no _max do snapshot (respeita
      // sequela já presente: se eh_max já está reduzido, não estoura ele).
      const campo = ef.key === 'ka' ? 'karma' : ef.key;       // EFEITO_CONDICAO_MAP usa 'ka' p/ Karma
      const max = Number(novo[campo + '_max']);
      const tetoOk = Number.isFinite(max) ? max : Infinity;
      // EF pode ficar negativa até o piso de morte (EF_MORTE); demais pools
      // seguem com piso 0.
      const piso = campo === 'ef' ? EF_MORTE : 0;
      const atual = Number(novo[campo]) || 0;
      novo[campo] = Math.max(piso, Math.min(tetoOk, atual + delta));
    } else if (ef.scope === 'absorcao') {
      // Sem clamp de máximo — pode passar o ar_max normal (buff temporário
      // de poção/elixir), só não deixa ir negativo. Mesma regra do original.
      const atual = Number(novo.ar) || 0;
      novo.ar = Math.max(0, atual + delta);
    }
  }
  return statusPorPools(novo);
}

/* ── Status derivado das POOLS (puro) ──────────────────────────────
   Recalcula morto/desmaiado/ativo a partir de EF e EH. Regra:
     • EF ≤ EF_MORTE mata;
     • EF ≤ 0, ou EH zerada em quem TEM pool de EH, derruba;
     • desmaiado reanima só quando as DUAS causas somem (EF > 0 e EH > 0).
   Morto não ressuscita sozinho e quem desistiu não é tocado — as duas são
   decisão do Mestre, pelo seletor de estado.

   Vivia embutida no fim de aplicarEfeitoItemSnapshot. Virou função quando o
   Mestre passou a editar as pools clicando na barra (01/09/2026): as duas
   portas mexem nos mesmos números e precisam derivar o status igual, senão
   zerar a EH pela barra deixaria o lutador de pé enquanto zerá-la por um
   item o derrubaria. Cobertura: 12-batalha/edicao-pool.test.js. */
function statusPorPools(p) {
  const st = p.status || 'ativo';
  const efV = Number(p.ef) || 0;
  const ehV = Number(p.eh) || 0;
  const temEH = (Number(p.eh_max) || 0) > 0;
  let status = st;
  if (efV <= EF_MORTE && (st === 'ativo' || st === 'desmaiado')) status = 'morto';
  else if (st === 'ativo' && (efV <= 0 || (temEH && ehV === 0))) status = 'desmaiado';
  else if (st === 'desmaiado' && efV > 0 && (ehV > 0 || !temEH)) status = 'ativo';
  return status === st ? p : { ...p, status };
}

/* ── Valor de uma pool depois de editada à mão (puro) ──────────────
   O clamp NÃO é uniforme entre as quatro:
     EF     piso EF_MORTE — ela fica negativa de propósito (caído-vivo entre
            0 e −14, morto em −15);
     AR     SEM teto — buff de poção/elixir passa do ar_max por desenho,
            mesma regra que montarSnapshots aplica na entrada do combate;
     EH/KA  faixa 0..max.
   Cobertura: 12-batalha/edicao-pool.test.js. */
function valorPoolEditado(p, pool, bruto) {
  const n = parseInt(bruto, 10);
  const v = Number.isFinite(n) ? n : 0;
  const max = Number(p[pool + '_max']) || 0;
  if (pool === 'ef') return Math.max(EF_MORTE, Math.min(max, v));
  if (pool === 'ar') return Math.max(0, v);
  return Math.max(0, Math.min(max, v));
}

/* ── Baixa `qtd` unidades de um slug no array de itens do inventário ─────
   Distribui a baixa entre TODAS as instâncias empilhadas daquele slug, na
   ordem em que aparecem no array. Corrige o consumo em combate quando o
   AcaoPanel agrupa pilhas múltiplas do mesmo slug num card só: o código
   antigo descontava a quantidade INTEIRA da primeira instância
   (`quantidade - qtd`) e filtrava <= 0 — com pilhas 2+3 e uso de 4, a
   pilha de 2 ia a -2 e sumia (baixa real de 2) enquanto a de 3 ficava
   intacta: efeito aplicado como 4, inventário baixado em 2. Instância que
   chega a 0 sai do array. Não muta o array original.                      */
function consumirDoInventario(itens, slug, qtd) {
  let restante = Math.max(0, Number(qtd) || 0);
  const out = [];
  for (const it of (itens || [])) {
    if (!it || it.slug !== slug || restante <= 0) { out.push(it); continue; }
    const q = Number(it.quantidade) || 0;
    const baixa = Math.min(q, restante);
    restante -= baixa;
    if (q - baixa > 0) out.push({ ...it, quantidade: q - baixa });
  }
  return out;
}

/* ── Baixa de item no inventário do PJ, relendo antes de escrever ──
   Mestre e Jogador consomem itens em combate, cada um pela SUA tela, e os
   dois escrevem a linha inteira de personagens.inventario. O Mestre carrega
   `catalogos.pjById` uma única vez (quando a batalha vira 'ativa') e usava
   esse cache como base da baixa — então uma poção que o jogador tinha gastado
   minutos antes VOLTAVA pra mochila na primeira vez que o Mestre consumisse
   qualquer coisa.

   Relê a linha imediatamente antes de escrever, pra baixa partir sempre do
   estado corrente. Devolve { ok, inventario } ou { ok:false, error }.

   ⚠️ Ainda é read-then-write, não atômico: duas baixas exatamente simultâneas
   podem se perder. Fechar isso de vez pede uma RPC que faça a conta no
   servidor (como comprar_item/transfer_item já fazem). O que esta função
   elimina é a janela LONGA — de minutos — que era o problema real.
   Cobertura: 12-batalha/consumo-item.test.js. */
async function consumirItemDoPJ(pjId, slug, qtd) {
  const { data, error } = await supabaseClient
    .from('personagens').select('inventario').eq('id', pjId).maybeSingle();
  if (error) return { ok: false, error };
  const inv = (data && data.inventario) || {};
  const novoInv = { ...inv, itens: consumirDoInventario(inv.itens || [], slug, qtd) };
  const { error: upErr } = await supabaseClient
    .from('personagens').update({ inventario: novoInv }).eq('id', pjId);
  if (upErr) return { ok: false, error: upErr };
  return { ok: true, inventario: novoInv };
}

/* ── usePortalTooltip + PortalTooltip — padrão único de tooltip do sistema ──
   Usa portal no .menestrel-ui para escapar de overflow:hidden.
   Mesma implementação de 13-diario/diario.jsx.                              */
function usePortalTooltip(delay) {
  const [tip, setTip] = React.useState(null);
  const timerRef = React.useRef(null);
  const abrirTip = React.useCallback((e, content) => {
    clearTimeout(timerRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    timerRef.current = setTimeout(() => setTip({ rect, content }), delay || 0);
  }, [delay]);
  const fecharTip = React.useCallback(() => { clearTimeout(timerRef.current); setTip(null); }, []);
  const manterTip = React.useCallback(() => { clearTimeout(timerRef.current); }, []);
  return [tip, abrirTip, fecharTip, manterTip];
}
function PortalTooltip({ tip, onEnter, onLeave }) {
  if (!tip) return null;
  const { rect, content } = tip;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top;
  const portalTarget = document.querySelector('.menestrel-ui') || document.body;
  return ReactDOM.createPortal(
    <div className="mn-tip" style={{ left: cx, top: cy, zIndex: 9999 }}
      onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <div className="mn-tip-title">{content}</div>
    </div>,
    portalTarget
  );
}

/* ── EstadoDropPortal — renderiza o dropdown de estado via portal no body ──
   Evita ser cortado pelo overflow-y: auto do .batalha-mng-page-body.
   Posicionado via getBoundingClientRect do botão de referência.          */
function EstadoDropPortal({ anchorRef, onClose, children }) {
  const [pos, setPos] = React.useState(null);

  React.useEffect(() => {
    if (!anchorRef || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    const onScroll = () => onClose();
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [anchorRef, onClose]);

  if (!pos) return null;
  return ReactDOM.createPortal(
    <div className="batalha-estado-drop-portal" style={{ top: pos.top, right: pos.right }}>
      {children}
    </div>,
    document.body
  );
}

/* ── Ordena por VB (desc); empate: PJ antes, depois nome ──────── */
function ordenarIniciativa(snaps) {
  return [...snaps]
    .sort((a, b) => {
      if (b.vb !== a.vb) return b.vb - a.vb;
      if (a.tipo !== b.tipo) return a.tipo === 'pj' ? -1 : 1;
      return (a.nome || '').localeCompare(b.nome || '');
    })
    .map((p, i) => ({ ...p, ordem: i + 1 }));
}

/* ── Compara dois participantes como sendo o mesmo combatente ──────
   Usa inst_id quando disponível (criaturas do mesmo tipo precisam
   disso para não confundir dois Cães, por ex.) e cai em tipo+ref_id
   apenas para snapshots legados sem inst_id.                         */
function mesmoParticipante(a, b) {
  if (!a || !b) return false;
  if (a.inst_id && b.inst_id) return a.inst_id === b.inst_id;
  return a.tipo === b.tipo && a.ref_id === b.ref_id;
}

/* ── Ícone de cada estado de combate ───────────────────────────────
   Mapa ÚNICO. O par status→ícone estava escrito à mão em quatro lugares (o
   gatilho do EstadoDrop, os itens do dropdown, o indicador no cabeçalho do
   card do Mestre e o do card do Jogador) e já tinha divergido: "desistiu"
   era porta no Mestre e bandeira no Jogador.

   Revisão dos ícones em 01/09/2026, a pedido do usuário. O que estava errado
   de fato: ENVENENADO usava `ti-skull`, o MESMO ícone de morto — dois estados
   diferentes com o mesmo desenho, no mesmo menu. Agora:
     ativo       ti-heartbeat  pulso: vivo e agindo (era `ti-check`, genérico)
     desmaiado   ti-zzz        caído, inconsciente
     morto       ti-skull      caveira, só dele
     desistiu    ti-flag       bandeira branca; unifica no que o Jogador já usava
     envenenado  ti-flask-2    frasco: veneno, sem colidir com a caveira
   Trocar qualquer um é editar aqui, uma linha. */
const ICONE_STATUS = {
  ativo:      'ti-heartbeat',
  desmaiado:  'ti-zzz',
  morto:      'ti-skull',
  desistiu:   'ti-flag',
  envenenado: 'ti-flask-2',
};
const iconeStatus = (k) => ICONE_STATUS[k] || ICONE_STATUS.ativo;

/* Ícone dos PA restantes: o próprio ícone é o número (03/09/2026, a pedido
   do usuário). O chip mostrava "1/1"; agora mostra só quanto sobrou, e o
   máximo foi pro tooltip — em combate o que se olha o tempo todo é quantas
   ações ainda dá pra gastar, não de quantas se partiu.
   A família vai só de 0 a 9; acima disso ficaria sem ícone, então prende
   em 9. PA nunca chega perto, mas um snapshot torto não pode apagar o chip. */
const iconePA = (n) => {
  const v = Math.max(0, Math.min(9, Math.trunc(Number(n) || 0)));
  return 'ti-hexagon-number-' + v;
};

/* ── EstadoDrop — botão de estado + dropdown via portal por fighter ── */
function EstadoDrop({ p, isEn, STATUS, onMudar, onEnvenenar, abrirTip, fecharTip }) {
  const tb = tBat(isEn ? 'en' : 'pt'); // i18n-sync (Fase 3.3): este componente recebe o boolean
  const [aberto, setAberto] = React.useState(false);
  const btnRef = React.useRef(null);

  React.useEffect(() => {
    if (!aberto) return;
    // Usa setTimeout para registrar o listener só após o ciclo atual,
    // evitando que o click que abriu o dropdown o feche imediatamente.
    const id = setTimeout(() => {
      const fechar = (e) => {
        if (btnRef.current && !btnRef.current.contains(e.target)) setAberto(false);
      };
      document.addEventListener('click', fechar);
      // Guarda referência para cleanup
      btnRef.current._fecharDrop = fechar;
    }, 0);
    return () => {
      clearTimeout(id);
      if (btnRef.current && btnRef.current._fecharDrop) {
        document.removeEventListener('click', btnRef.current._fecharDrop);
        btnRef.current._fecharDrop = null;
      }
    };
  }, [aberto]);

  // "Ativo — mudar estado". Mesmo formato das barras de pool ("EF — editar"):
  // o estado atual primeiro, a ação depois.
  const nomeEstado = isEn ? STATUS[p.status || 'ativo'].en : STATUS[p.status || 'ativo'].pt;
  const rotuloEstado = `${nomeEstado} — ${tb.mudarEstado}`;

  return (
    <div className="estado-drop-wrap" ref={btnRef}>
      {/* Só ícone, como os outros da fileira (01/09/2026). O rótulo escrito e
          o chevron saíram; o ÍCONE continua dizendo o estado (check / zzz /
          caveira / porta) e a classe st-* continua colorindo por ele — verde
          ativo, azul desmaiado, vermelho morto. O que o texto dizia foi pro
          tooltip, que agora nomeia o estado ATUAL além da ação: sem isso o
          Mestre perderia a leitura, já que o botão era o único lugar do card
          que escrevia o estado por extenso. */}
      <button
        className={'btn-ghost btn-sm estado batalha-menu-acao-ic st-' + (p.status || 'ativo')}
        data-on="true"
        onClick={() => { fecharTip(); setAberto((v) => !v); }}
        onMouseEnter={(e) => abrirTip(e, rotuloEstado)}
        onMouseLeave={fecharTip}
        aria-label={rotuloEstado}>
        <i className={'ti ' + iconeStatus(p.status || 'ativo')} aria-hidden="true" />
      </button>
      {/* Só ícone no menu também (01/09/2026): é uma fileira de círculos, e o
          nome de cada estado vive no tooltip/aria-label. Sem texto o dropdown
          deixa de ser uma lista alta e vira uma tira do tamanho da própria
          fileira de botões. */}
      {aberto && (
        <EstadoDropPortal anchorRef={btnRef} onClose={() => setAberto(false)}>
          {Object.keys(STATUS).map((k) => {
            const ativo = (p.status || 'ativo') === k;
            const nome = isEn ? STATUS[k].en : STATUS[k].pt;
            return (
              <button key={k} className={'batalha-estado-drop-item' + (ativo ? ' on' : '')}
                onClick={() => { fecharTip(); onMudar(k); setAberto(false); }}
                aria-label={nome}
                onMouseEnter={(e) => abrirTip(e, nome)}
                onMouseLeave={fecharTip}>
                <i className={'ti ' + iconeStatus(k)} aria-hidden="true" />
              </button>
            );
          })}
          {/* A régua que separava os 4 estados do Envenenado saiu em
              01/09/2026: Envenenar é mais um item da mesma lista de coisas
              que o Mestre aplica ao combatente, não uma seção à parte. */}
          <button className="batalha-estado-drop-item poison"
            onClick={() => { fecharTip(); onEnvenenar(); setAberto(false); }}
            aria-label={tb.envenenado}
            onMouseEnter={(e) => abrirTip(e, tb.envenenado)}
            onMouseLeave={fecharTip}>
            <i className={'ti ' + iconeStatus('envenenado')} aria-hidden="true" />
          </button>
        </EstadoDropPortal>
      )}
    </div>
  );
}

/* ── Quem ainda pode ser ATACADO ──────────────────────────────────
   Regra confirmada em 01/09/2026: só o morto sai da lista de alvos.
   Desmaiado continua alvejável (golpe de misericórdia) e desistiu também
   — largar a luta não dá imunidade.

   NÃO confundir com proximoAtivo, logo abaixo: apanhar e AGIR são coisas
   diferentes. Quem desmaiou ou desistiu vira alvo, mas não ganha a vez. */
function podeSerAtacado(p) {
  return !!p && p.status !== 'morto';
}

/* ── próximo participante ATIVO na ordem de iniciativa ────────── */
function proximoAtivo(parts, fromOrdem) {
  // Pula quem está sem ações (FC "caído por N rodadas") — o status expira no
  // decremento de Nova Rodada, então ninguém fica preso pra sempre.
  return [...parts].sort((a, b) => a.ordem - b.ordem)
    .find((p) => p.ordem > fromOrdem && p.status === 'ativo' && !statusTemEfeito(p, 'sem_acoes')) || null;
}

/* ── Ataques disponíveis para o ator ──────────────────────────── */
/* PJ: usa gerarAtaques mas só mantém ARMAS reais (com slug em itens). */
/*     Magias com dano vêm separadas via magiasOfensivasDoAtor.        */
/* Criatura: 1 ataque implícito (dano_l/m/p + dano_25/50/75/100).      */
function ataquesDoAtor(ator, catalogos) {
  if (!ator || !catalogos) return [];
  if (ator.tipo === 'pj') {
    const pj = catalogos.pjById[ator.ref_id];
    if (!pj) return [];
    // Condições do SNAPSHOT (evoluem em combate — itens etc.), com fallback
    // pro estado_atual da ficha em snapshots legados sem `condicoes`.
    const ficha = calcularFicha(pj, catalogos.catalogoBySlug, ator.condicoes || pj.estado_atual?.condicoes);
    let lista = [];
    try {
      lista = gerarAtaques(pj, catalogos.catalogoBySlug, catalogos.magiasByKey, ficha.atributos) || [];
    } catch (e) {
      console.error('[batalha] gerarAtaques falhou:', e);
    }
    // ESPELHO DA FICHA (Arsenal, 11-ficha/ficha.jsx — regra confirmada com o
    // usuário: "na batalha, os valores devem respeitar o que aparece na ficha"):
    //   L/M/P efetivos = o que gerarAtaques já devolve (catálogo + o atributo
    //     de `ajuste_atributo` da arma), passado adiante SEM MEXER; o bônus de
    //     grupo fica separado em bonus_ga e é somado por colunaAtaque — total
    //     idêntico ao `ap(v) = v + bonusGA` que a Ficha exibe;
    //   dano base dos tiers = dano100 da Ficha = dano da arma + Força +
    //     Bônus manual do Mestre (estado_atual.bonusArmas[slug], clamp 0..9).
    //
    // NÃO somar Agilidade aqui: gerarAtaques (01-core/inventario-helpers) JÁ
    // aplicou o atributo de ajuste da arma em dano_l/m/p. Somar de novo
    // inflava toda coluna em +AGI acima da Ficha — e em arma de ajuste
    // PER/FOR (28 das 75 do catálogo) somava Agilidade por cima do atributo
    // errado. Coberto por arsenal-espelho.test.js.
    const forca = (ficha.atributos && ficha.atributos.forca) || 0;
    return lista
      .filter((a) => a && a.dano != null && a.slug && catalogos.catalogoBySlug[a.slug])
      .map((a) => {
        const arma = catalogos.catalogoBySlug[a.slug];
        const grupoSigla = arma && arma.grupo_armas ? arma.grupo_armas : null;
        const bonus = (typeof bonusGrupoArma === 'function')
          ? (bonusGrupoArma(grupoSigla, pj.grupos_armas || {}) || 0) : 0;
        const bonusArma = Math.max(0, Math.min(9, Number(pj.estado_atual?.bonusArmas?.[a.slug]) || 0));
        // grupo_sigla ANEXADO ao ataque: tipoCriticoDoGrupo (AcaoPanel) lê
        // arma.grupo_sigla pra escolher a tabela de crítico (CORTE/
        // PERFURACAO/ESMAGAMENTO/DESARMADO). O objeto vindo de gerarAtaques
        // não carrega o grupo (a Ficha também rebusca no catálogo), então
        // sem esta linha TODO crítico caía em DESARMADO — espada dava
        // narrativa de chute/soco.
        return {
          ...a,   // dano_l/m/p vêm prontos de gerarAtaques — ver comentário acima
          dano: (a.dano || 0) + forca + bonusArma,   // dano100 da Ficha
          bonus_ga: bonus, grupo_sigla: grupoSigla, fonte: 'arma',
        };
      });
  }
  const c = catalogos.criById[ator.ref_id];
  if (!c) return [];
  return [{
    nome: c.ataque || (ator.nome + ' ataque'),
    dano_l: c.dano_l, dano_m: c.dano_m, dano_p: c.dano_p,
    dano_25: c.dano_25, dano_50: c.dano_50, dano_75: c.dano_75, dano_100: c.dano_100,
    bonus_ga: 0, fonte: 'criatura',
  }];
}

/* ── Sigla de armadura normalizada (L/M/P) ──────────────────────────────────
   Aceita o que o banco tiver e devolve sempre uma sigla que `colunaAtaque`
   entende. 'T' (couro/tecido de armaduras antigas do catálogo de itens) é
   preservado — colunaAtaque já o trata como L, mesma regra do parser da
   defesa do PJ (/^([TLMP])(-?\d+)$/). Qualquer outra coisa vira 'L'. */
function siglaArmadura(valor) {
  const s = String(valor || '').trim().toUpperCase();
  return (s === 'M' || s === 'P' || s === 'T') ? s : 'L';
}

/* ── Coluna de Ação do ataque: dano_categoria_alvo + bônus − valor_defesa ──── */
function colunaAtaque(arma, alvo) {
  if (!arma || !alvo) return 0;
  const sigla = (alvo.defesa_sigla || 'L').toUpperCase();
  const campo = sigla === 'M' ? 'dano_m' : (sigla === 'P' ? 'dano_p' : 'dano_l');
  const base = arma[campo] != null ? arma[campo] : 0;
  const bonus = arma.bonus_ga || 0;
  return (base + bonus) - (alvo.defesa_valor || 0);
}

/* ── Dano final no tier do resultado da tabela ────────────────── */
function danoNoTier(arma, codigo) {
  if (!arma || !codigo || codigo === 'FC' || codigo === 'R') return 0;
  if (arma.fonte === 'criatura') {
    // Tiers 25/50/75% DERIVADOS do dano_100, não lidos de dano_25/50/75:
    // o formulário de criatura (13-diario, NovaCriatura) grava só dano_100,
    // então toda criatura criada pelo app tinha esses campos NULL e causava
    // 0 de dano em Fraco/Médio/Difícil mesmo com dano_100 > 0.
    // Derivar é seguro e não muda nada nos dados existentes: nas 185
    // criaturas com dano_100 > 0, as colunas batem com ceil(dano_100 × n/4)
    // em 185 — zero divergências. É a MESMA regra que o ramo de ARMA aplica
    // logo abaixo ("arredondamento SEMPRE pra cima").
    const d100 = arma.dano_100 || 0;
    if (codigo === 'F')  return Math.ceil(d100 / 4);
    if (codigo === 'M')  return Math.ceil(d100 / 2);
    if (codigo === 'D')  return Math.ceil((3 * d100) / 4);
    if (codigo === 'MD') return d100;
    // 125/150% com ceil, alinhados ao ramo de ARMA (30/08/2026). Estavam em
    // floor, então criatura tirava 1 a menos que PJ no mesmo crítico —
    // dano_100 33 dava 41/49 onde a arma equivalente dava 42/50. "Arredonda-
    // mento SEMPRE pra cima" agora vale para os seis tiers dos dois ramos.
    if (codigo === 'E')  return Math.ceil(d100 * 1.25);
    if (codigo === 'A')  return Math.ceil(d100 * 1.5);
    return 0;
  }
  const base = arma.dano || 0;
  if (arma.fonte === 'magia') {
    // Magia mantém o arredondamento antigo (floor): a Ficha não exibe tiers
    // de magia, então não há referência pra espelhar — decisão em aberto.
    if (codigo === 'F')  return Math.floor(base / 4);
    if (codigo === 'M')  return Math.floor(base / 2);
    if (codigo === 'D')  return Math.floor((3 * base) / 4);
    if (codigo === 'MD') return base;
    if (codigo === 'E')  return Math.floor(base * 1.25);
    if (codigo === 'A')  return Math.floor(base * 1.5);
    return 0;
  }
  // ARMA — espelho exato do Arsenal da Ficha (11-ficha): tiers 25/50/75%
  // são Math.ceil(dano100 × N/4) e 100% é o próprio dano100 ("Arredondamento
  // SEMPRE pra cima", regra confirmada). `base` aqui JÁ é o dano100 (dano da
  // arma + Força + Bônus manual, ver ataquesDoAtor). 125/150% seguem a mesma
  // regra do ceil (não existem na Ficha; são tiers só de combate).
  if (codigo === 'F')  return Math.ceil(base / 4);
  if (codigo === 'M')  return Math.ceil(base / 2);
  if (codigo === 'D')  return Math.ceil((3 * base) / 4);
  if (codigo === 'MD') return base;
  if (codigo === 'E')  return Math.ceil(base * 1.25);
  if (codigo === 'A')  return Math.ceil(base * 1.5);
  return 0;
}

/* ============================== Tabela de Críticos (Absurdo — segundo dado) ============================== */
/*
   Fonte: Config_-_CRITICOS.csv (5 tipos × 8 qualidades q0..q7).
   Uso: quando o primeiro dado produz q=7 (Absurdo/cinza), o sistema pede
   um segundo dado. O resultado desse dado (q0..q7, resolvido via resolverAcao
   com a mesma coluna) é cruzado com o TIPO_CRITICO do grupo de arma
   para gerar o texto narrativo do efeito crítico.

   O segundo dado pode cair em q=0 (VERDE) ou q=7 (CINZA) normalmente —
   o texto do CSV já cobre os 8 resultados para cada tipo.

   Variáveis interpoladas nas mensagens:
     ${danos.d25}  → danoNoTier(arma, 'F')     (25%)
     ${danos.d50}  → danoNoTier(arma, 'M')     (50%)
     ${danos.d75}  → danoNoTier(arma, 'D')     (75%)
     ${danos.d100} → danoNoTier(arma, 'MD')    (100%)
     ${d125}       → danoNoTier(arma, 'E')     (125%)
     ${d150}       → danoNoTier(arma, 'A')     (150%)
     ${d175}       → Math.floor(dano_base * 1.75) (estimativa; sem tier oficial)
*/
const CRITICOS_TABELA = {
  CORTE: {
    0: 'Você provoca um corte na perna do oponente, ele terá -4 na próxima rodada. (${danos.d25} EF)',
    1: 'Você provoca um corte no ombro do oponente, ele terá -4 por 1 dia. (${danos.d50} EF)',
    2: 'Você provoca um corte na mão do oponente, ele é desarmado. (${danos.d50} EF)',
    3: 'Você provoca um corte no braço do oponente, e o impede de atacar por 1 rodada. (${danos.d75} EF)',
    4: 'Você provoca um corte nas costas do oponente, e o impede de atacar por 2 rodadas. (${danos.d100} EF)',
    5: 'Você provoca um corte no rosto do oponente, e o impede de atacar por 3 rodadas. (${d125} EF)',
    6: 'Você provoca um corte profundo no abdome do oponente, ele está fora de combate. (${d150} EF)',
    7: 'Você arranca a cabeça do oponente! Se ele pesar mais que o dobro do seu peso, ele apenas está fora de combate. (${d175} EF)',
  },
  PERFURACAO: {
    0: 'Você provoca uma perfuração no pé do oponente, ele terá -4 na próxima rodada. (${danos.d25} EF)',
    1: 'Você provoca uma perfuração na perna do oponente, ele terá -4 por 1 dia. (${danos.d50} EF)',
    2: 'Você provoca uma perfuração na mão do oponente, ele é desarmado. (${danos.d50} EF)',
    3: 'Você provoca uma perfuração no ombro do oponente, e o impede de atacar por 1 rodada. (${danos.d75} EF)',
    4: 'Você provoca uma perfuração no quadril do oponente, e o impede de atacar por 2 rodadas. (${danos.d100} EF)',
    5: 'Você provoca uma perfuração no abdome do oponente, e o impede de atacar por 3 rodadas. (${d125} EF)',
    6: 'Você provoca uma perfuração no peito do oponente, ele está fora de combate. (${d150} EF)',
    7: 'Você perfura a cabeça do oponente! Se ele pesar mais que o dobro do seu peso, ele apenas está fora de combate. (${d175} EF)',
  },
  ESMAGAMENTO: {
    0: 'Você provoca um esmagamento nas pernas do oponente, ele terá -4 próxima rodada. (${danos.d25} EF)',
    1: 'Você provoca um esmagamento no ombro, ele terá -4 por 1 dia. (${danos.d50} EF)',
    2: 'Você provoca um esmagamento na mão, ele é derrubado. (${danos.d50} EF)',
    3: 'Você provoca um esmagamento nos braços, e o impede de atacar por 1 rodada. (${danos.d75} EF)',
    4: 'Você provoca um esmagamento no abdome, e o impede de atacar por 2 rodadas. (${danos.d100} EF)',
    5: 'Você provoca um esmagamento nas costas, e o impede de atacar por 3 rodadas. (${d125} EF)',
    6: 'Você provoca um esmagamento no peito, ele está fora de combate. (${d150} EF)',
    7: 'Você esmaga a cabeça do oponente! Se ele pesar mais que o dobro do seu peso, ele apenas está fora de combate. (${d175} EF)',
  },
  MAGIA: {
    0: 'Você acerta as pernas do oponente, ele terá -4 próxima rodada. (${danos.d25} EF)',
    1: 'Você acerta as pernas do oponente, ele terá -4 por 1 dia. (${danos.d50} EF)',
    2: 'Você acerta os braços do oponente, ele é desarmado. (${danos.d50} EF)',
    3: 'Você acerta os braços do oponente, e o impede de atacar por 1 rodada. (${danos.d75} EF)',
    4: 'Você acerta o peito do oponente, e o impede de atacar por 2 rodadas. (${danos.d100} EF)',
    5: 'Você acerta o peito do oponente, e o impede de atacar por 3 rodadas. (${d125} EF)',
    6: 'Você acerta a cabeça do oponente, ele está fora de combate. (${d150} EF)',
    7: 'Você explode a cabeça do oponente! Se ele pesar mais que o dobro do seu peso, ele apenas está fora de combate. (${d175} EF)',
  },
  DESARMADO: {
    0: 'Você realiza um chute nas pernas do oponente, ele terá -4 próxima rodada. (${danos.d25} EF)',
    1: 'Você realiza um chute nas pernas do oponente, ele terá -4 por 1 dia. (${danos.d50} EF)',
    2: 'Você realiza um chute nos braços do oponente, ele é desarmado. (${danos.d50} EF)',
    3: 'Você realiza um chute nos braços do oponente, e o impede de atacar por 1 rodada. (${danos.d75} EF)',
    4: 'Você realiza um soco no peito do oponente, e o impede de atacar por 2 rodadas. (${danos.d100} EF)',
    5: 'Você realiza um soco no peito do oponente, e o impede de atacar por 3 rodadas. (${d125} EF)',
    6: 'Você realiza um soco na cabeça do oponente, ele está fora de combate. (${d150} EF)',
    7: 'Você afunda a cabeça do oponente! Se ele pesar mais que o dobro do seu peso, ele apenas está fora de combate. (${d175} EF)',
  },
};

// Mapeia sigla de grupo de arma → tipo de crítico do CSV.
// CD (Combate Desarmado) e CI (Combate de Imobilização) → DESARMADO.
// CL/CM/CP → CORTE. PL/PM/PP → PERFURACAO. EL/EM/EP → ESMAGAMENTO.
function tipoCriticoDoGrupo(sigla) {
  if (!sigla) return 'DESARMADO';
  const s = sigla.toUpperCase();
  if (s[0] === 'C' && (s === 'CD' || s === 'CI')) return 'DESARMADO';
  if (s[0] === 'C') return 'CORTE';
  if (s[0] === 'P') return 'PERFURACAO';
  if (s[0] === 'E') return 'ESMAGAMENTO';
  return 'DESARMADO';
}

// Interpola as variáveis ${danos.dXX} / ${d125} / ${d150} / ${d175} de uma
// mensagem de crítico com os valores reais de dano daquela arma.
function interpolarCritico(msg, arma) {
  if (!msg || !arma) return msg || '';
  const base = arma.dano || 0;
  const danos = {
    d25:  danoNoTier(arma, 'F'),
    d50:  danoNoTier(arma, 'M'),
    d75:  danoNoTier(arma, 'D'),
    d100: danoNoTier(arma, 'MD'),
  };
  const d125 = danoNoTier(arma, 'E');
  const d150 = danoNoTier(arma, 'A');
  const d175 = Math.ceil(base * 1.75);   // ceil: mesma regra "sempre pra cima" da Ficha
  return msg
    .replace(/\$\{danos\.d25\}/g,  String(danos.d25))
    .replace(/\$\{danos\.d50\}/g,  String(danos.d50))
    .replace(/\$\{danos\.d75\}/g,  String(danos.d75))
    .replace(/\$\{danos\.d100\}/g, String(danos.d100))
    .replace(/\$\{d125\}/g,        String(d125))
    .replace(/\$\{d150\}/g,        String(d150))
    .replace(/\$\{d175\}/g,        String(d175));
}

/* ============================== Tabela de FALHA CRÍTICA (Verde — segundo dado) ============================== */
/*
   Fonte: Config_-_CRITICOS.csv v2 (07/2026) — 5 tipos × 8 qualidades q0..q7.
   Uso: quando o PRIMEIRO dado produz q=0 (Falha Crítica/verde), o sistema pede
   um segundo dado (mesma coluna, resolverAcao). A consequência cai no PRÓPRIO
   ATACANTE. Lógica invertida do crítico: quanto MELHOR o segundo dado, mais
   branda a consequência (q0 = 100% de dano; q7 = nada).
   Regras confirmadas (07/2026, decisões do usuário):
     • Dano de autodano SEMPRE pula a EH → cascata AR→EF (aplicarDanoCascata
       com critico=true). Percentual sobre a força total do ataque, via
       danoNoTier (100%=MD, 75%=D, 50%=M, 25%=F — ceil arma / floor magia).
     • q1 "ações −7 por 1 mês": mecânico ATÉ O FIM DA BATALHA (mod_coluna −7,
       rodadas_rest null); o mês fora da batalha fica no log pro Mestre.
     • q2/q4 "perde N rodadas": mecânico (sem_acoes — auto-passe da vez).
     • q6 "velocidade −5": mecânico (mod_vb — iniciativa efetiva reordena na
       próxima rodada; o vb REAL do snapshot não muda).
   Tokens ${danos.dXX} interpolados por interpolarCritico (mesmos do crítico).
*/
const FALHA_CRITICA_TABELA = {
  CORTE: {
    0: 'Você escorrega e cai sobre sua própria arma, ela corta seu abdome e você desmaia. Você sofre ${danos.d100} de dano na EF.',
    1: 'Sua arma cai sobre sua perna e provoca um corte profundo. Suas ações tem -7 por 1 mês e você sofre ${danos.d75} de dano na EF.',
    2: 'Você perde o equilíbrio e bate a cabeça. Você perde 2 rodadas e sofre ${danos.d50} de dano na EF.',
    3: 'Você torce seu tornozelo enquanto se preparava para atacar. Você sofre ${danos.d25} de dano na EF.',
    4: 'Um movimento precipitado faz com que você perca 1 rodada.',
    5: 'Uma péssima escolha de posicionamento expõe suas vulnerabilidades. Sua defesa tem -5 até o fim da batalha.',
    6: 'Seu adversário desvia facilmente de seu golpe e agora ele tem uma vantagem sobre você. Sua velocidade tem -5 até o fim da batalha.',
    7: 'Apesar de errar o golpe, você mantêm firme sua posição sem nenhuma dificuldade.',
  },
  PERFURACAO: {
    0: 'Você escorrega para trás e sua arma perfura seus órgãos, e você desmaia. Você sofre ${danos.d100} de dano na EF.',
    1: 'Ao girar o corpo você perfura suas próprias pernas com sua arma. Suas ações tem -7 por 1 mês e você sofre ${danos.d75} de dano na EF.',
    2: 'Você perde o equilíbrio e bate a cabeça. Você perde 2 rodadas e sofre ${danos.d50} de dano na EF.',
    3: 'Você torce seu tornozelo enquanto se preparava para atacar. Você sofre ${danos.d25} de dano na EF.',
    4: 'Um movimento precipitado faz com que você perca 1 rodada.',
    5: 'Uma péssima escolha de posicionamento expõe suas vulnerabilidades. Sua defesa tem -5 até o fim da batalha.',
    6: 'Seu adversário desvia facilmente de seu golpe e agora ele tem uma vantagem sobre você. Sua velocidade tem -5 até o fim da batalha.',
    7: 'Apesar de errar seu golpe, você mantêm firme sua posição sem nenhuma dificuldade.',
  },
  ESMAGAMENTO: {
    0: 'Você escorrega para o lado e sua arma cai sob sua cabeça, e você desmaia. Você sofre ${danos.d100} de dano na EF.',
    1: 'Ao girar o corpo você esmaga seus próprios pés com sua arma. Suas ações tem -7 por 1 mês e você sofre ${danos.d75} de dano na EF.',
    2: 'Você perde o equilíbrio e bate a cabeça. Você perde 2 rodadas e sofre ${danos.d50} de dano na EF.',
    3: 'Você torce seu tornozelo enquanto se preparava para atacar. Você sofre ${danos.d25} de dano na EF.',
    4: 'Um movimento precipitado faz com que você perca 1 rodada.',
    5: 'Uma péssima escolha de posicionamento expõe suas vulnerabilidades. Sua defesa tem -5 até o fim da batalha.',
    6: 'Seu adversário desvia facilmente de seu golpe e agora ele tem uma vantagem sobre você. Sua velocidade tem -5 até o fim da batalha.',
    7: 'Apesar de errar seu golpe, você mantêm firme sua posição sem nenhuma dificuldade.',
  },
  MAGIA: {
    0: 'Você escorrega para trás e sua magia detona com todo seu potencial, e você desmaia. Você sofre ${danos.d100} de dano na EF.',
    1: 'Sua magia é mal evocada e detona em seus braços. Suas ações tem -7 por 1 mês e você sofre ${danos.d75} de dano na EF.',
    2: 'Você perde o equilíbrio e bate a cabeça. Você perde 2 rodadas e sofre ${danos.d50} de dano na EF.',
    3: 'Você torce seu tornozelo enquanto se preparava para evocar. Você sofre ${danos.d25} de dano na EF.',
    4: 'Um movimento precipitado faz com que você perca 1 rodada.',
    5: 'Uma péssima escolha de posicionamento expõe suas vulnerabilidades. Sua defesa tem -5 até o fim da batalha.',
    6: 'Seu adversário desvia facilmente de sua magia e agora ele tem uma vantagem sobre você. Sua velocidade tem -5 até o fim da batalha.',
    7: 'Apesar de errar sua magia, você mantêm firme sua posição sem nenhuma dificuldade.',
  },
  DESARMADO: {
    0: 'Você escorrega e cai sobre a arma do inimigo, o golpe rasga seu abdome e você desmaia. Você sofre ${danos.d100} de dano na EF.',
    1: 'Seu chute atinge uma região resistente do adversário e quebra sua perna. Suas ações tem -7 por 1 mês e você sofre ${danos.d75} de dano na EF.',
    2: 'Você perde o equilíbrio e bate a cabeça. Você perde 2 rodadas e sofre ${danos.d50} de dano na EF.',
    3: 'Você torce seu tornozelo enquanto se preparava para atacar. Você sofre ${danos.d25} de dano na EF.',
    4: 'Um movimento precipitado faz com que você perca 1 rodada.',
    5: 'Uma péssima escolha de posicionamento expõe suas vulnerabilidades. Sua defesa tem -5 até o fim da batalha.',
    6: 'Seu adversário desvia facilmente de seu golpe e agora ele tem uma vantagem sobre você. Sua velocidade tem -5 até o fim da batalha.',
    7: 'Apesar de errar o golpe, você mantêm firme sua posição sem nenhuma dificuldade.',
  },
};

/* Mecânica por qualidade do segundo dado (uniforme entre tipos — só o texto
   narrativo da FALHA_CRITICA_TABELA varia). rodadas_rest null = até o fim da
   batalha (decrementarStatusTemp preserva; encerramento descarta o snapshot). */
const FC_EFEITOS = {
  0: { danoTier: 'MD', desmaia: true },
  1: { danoTier: 'D',  status: { id: 'fc_acoes',  nome: 'Ações −7',      icone: '🤕', rodadas_rest: null, efeito: { tipo: 'mod_coluna', valor: -7 } } },
  2: { danoTier: 'M',  status: { id: 'fc_caido',  nome: 'Caído',         icone: '💫', rodadas_rest: 2,    efeito: { tipo: 'sem_acoes' } } },
  3: { danoTier: 'F' },
  4: {                 status: { id: 'fc_caido',  nome: 'Caído',         icone: '💫', rodadas_rest: 1,    efeito: { tipo: 'sem_acoes' } } },
  5: {                 status: { id: 'fc_defesa', nome: 'Defesa −5',     icone: '🛡️', rodadas_rest: null, efeito: { tipo: 'mod_defesa', valor: -5 } } },
  6: {                 status: { id: 'fc_veloc',  nome: 'Velocidade −5', icone: '🐌', rodadas_rest: null, efeito: { tipo: 'mod_vb', valor: -5 } } },
  7: {},
};

/* ── Helpers PUROS de efeito de status_temp (1ª leva mecânica) ────── */
// Soma os `valor` dos efeitos de um tipo ativos no participante.
function somaEfeitosStatus(p, tipo) {
  if (!p || !Array.isArray(p.status_temp)) return 0;
  return p.status_temp.reduce((s, st) => s + ((st.efeito && st.efeito.tipo === tipo) ? (st.efeito.valor || 0) : 0), 0);
}
// O participante tem algum efeito do tipo? (usado por sem_acoes, sem valor)
function statusTemEfeito(p, tipo) {
  return !!(p && Array.isArray(p.status_temp) && p.status_temp.some((st) => st.efeito && st.efeito.tipo === tipo));
}
/* Soma os mod_ataque válidos para a arma em uso.
   Por que não é só somaEfeitosStatus(p, 'mod_ataque'): a técnica pode estar
   restrita a grupos de arma (Mira só em PL/PM/PP, Pugilato só em CD), e a
   lista viaja no efeito. Ativar com arco e trocar para espada não mantém o
   bônus — o status continua correndo, mas não entra nesta soma. Efeito sem
   `grupos` vale para qualquer arma.

   mod_ataque é DELIBERADAMENTE separado do mod_coluna: o −7 da Falha
   Crítica pune toda ação (arma, magia, habilidade, técnica), enquanto
   "coluna de ataque" das técnicas só toca arma e magia. */
function somaModAtaque(p, grupoArma) {
  if (!p || !Array.isArray(p.status_temp)) return 0;
  return p.status_temp.reduce((s, st) => {
    const ef = st.efeito;
    if (!ef || ef.tipo !== 'mod_ataque') return s;
    if (ef.grupos && !ef.grupos.includes(grupoArma)) return s;
    return s + (ef.valor || 0);
  }, 0);
}
/* O que este golpe fura, deste atacante contra este alvo.
   Duas ancoragens diferentes, e a distinção é regra, não detalhe:
     • `ignora_eh`/`ignora_armadura` ficam no ATACANTE e carregam
       `alvo_inst_id` — Golpe Letal deixa VOCÊ furar a EH daquele inimigo,
       e não abre ele para os outros combatentes;
     • `derrubado` fica no ALVO e vale para QUALQUER atacante — é condição
       dele, não golpe seu.
   Decisão do usuário em 10/09/2026 (spec §3, itens 5 e 6). */
function modsDoGolpe(atacante, alvo) {
  const alvoId = alvo && alvo.inst_id;
  const doAtacante = (tipo) => !!(atacante && Array.isArray(atacante.status_temp)
    && atacante.status_temp.some((s) => s.efeito && s.efeito.tipo === tipo
      && (!s.efeito.alvo_inst_id || s.efeito.alvo_inst_id === alvoId)));
  const derrubado = !!(alvo && Array.isArray(alvo.status_temp)
    && alvo.status_temp.some((s) => s.efeito && s.efeito.tipo === 'derrubado'));
  return {
    ignoraEh: doAtacante('ignora_eh') || derrubado,
    ignoraArmadura: doAtacante('ignora_armadura'),
  };
}
/* Esquiva é o ÚNICO status consumido por evento, não por contagem de
   rodadas: ela é gasta pelo próximo golpe recebido, ou expira por tempo se
   ninguém atacar — o que vier primeiro.
   O campo `consome_em` é opcional e aditivo: status sem ele segue exatamente
   como antes, expirando só em processarViradaDeRodada. */
function consumirEvitaGolpe(alvo) {
  const st = (alvo && Array.isArray(alvo.status_temp)) ? alvo.status_temp : null;
  if (!st || !st.some((s) => s.consome_em === 'golpe_recebido' && s.efeito && s.efeito.tipo === 'evita_golpe')) {
    return { evitou: false, participante: alvo };
  }
  const restante = st.filter((s) => !(s.consome_em === 'golpe_recebido' && s.efeito && s.efeito.tipo === 'evita_golpe'));
  return { evitou: true, participante: { ...alvo, status_temp: restante } };
}
// VB efetiva pra iniciativa: vb do snapshot + mod_vb de status. NÃO persiste.
function vbEfetivo(p) {
  return (p.vb || 0) + somaEfeitosStatus(p, 'mod_vb');
}
/* RF/RM efetivas: o valor do snapshot mais os mod_rf/mod_rm de técnica.
   Piso 1 porque resolverResistencia só aceita 1..20 — deixar cair a 0
   estouraria o índice da tabela. Não persiste: o rf/rm cru do snapshot
   fica intacto, mesma disciplina de vbEfetivo. */
function rfEfetivo(p) {
  return Math.max(1, (Number(p && p.rf) || 0) + somaEfeitosStatus(p, 'mod_rf'));
}
function rmEfetivo(p) {
  return Math.max(1, (Number(p && p.rm) || 0) + somaEfeitosStatus(p, 'mod_rm'));
}

/* Dano final depois do mod_dano_max do ALVO (Posicionamento).
   Entra DEPOIS de danoNoTier de propósito: a função de tier é espelho do
   Arsenal da Ficha e não deve saber de status de combate. Piso 0 — reduzir
   dano nunca pode virar cura. */
function danoComModMax(dano, alvo) {
  const base = Math.max(0, Math.floor(dano || 0));
  if (base === 0) return 0;
  return Math.max(0, base + somaEfeitosStatus(alvo, 'mod_dano_max'));
}

/* Percentuais de dano das técnicas da Fase 2.
   SOMAM antes de multiplicar (spec §4.3): Ambidestria +25% com Brutalizar
   +50% dá +75%, não +87,5%. Compor em cadeia inflaria o dano de quem
   empilha técnicas, e a regra do sistema é aditiva. */
function somaDanoPct(p) { return somaEfeitosStatus(p, 'dano_pct'); }
function somaDanoRecebidoPct(p) { return somaEfeitosStatus(p, 'dano_recebido_pct'); }

/* Dano final, na ordem fixada pela spec §4.3. A ordem MUDA O NÚMERO — em
   especial, mod_dano_max (Posicionamento) é subtração ABSOLUTA e entra antes
   da redução percentual; invertido, o resultado é outro.
   Arredonda pra cima, como o resto do sistema de dano ("arredondamento SEMPRE
   pra cima", regra confirmada). Piso 0: reduzir dano nunca vira cura. */
function danoFinal(danoBase, atacante, alvo) {
  const base = Math.max(0, Math.floor(danoBase || 0));
  if (base === 0) return 0;
  const comBonus = base * (1 + somaDanoPct(atacante) / 100);
  const aposMaximo = comBonus + somaEfeitosStatus(alvo, 'mod_dano_max');
  const aposReducao = aposMaximo * (1 + somaDanoRecebidoPct(alvo) / 100);
  return Math.max(0, Math.ceil(aposReducao - 1e-9));
}

// Decremento por rodada: null = até o fim da batalha (preservado);
// numérico decrementa e sai quando zera. Status sem efeito seguem a mesma regra.
function decrementarStatusTemp(statusTemp) {
  return (statusTemp || [])
    .map((s) => (s.rodadas_rest == null ? s : { ...s, rodadas_rest: Math.max(0, s.rodadas_rest - 1) }))
    .filter((s) => s.rodadas_rest == null || s.rodadas_rest > 0);
}

/* Devolve a EH emprestada pelos mod_eh_temp que acabaram de expirar.
   Recebe `removidos` em vez de reler o status_temp porque decrementarStatusTemp
   remove o status na MESMA passada em que ele chega a zero — depois dele não há
   mais o que inspecionar, e antes dele o status ainda está vivo. A lista de
   removidos é a única janela em que dá pra saber quanto foi emprestado.

   O eh é aparado no teto novo, com piso 0: quem gastou o bônus durante o buff
   não é punido de novo na devolução. */
function expirarEhTemp(p, removidos) {
  if (!p || !Array.isArray(removidos) || removidos.length === 0) return p;
  const devolver = removidos
    .filter((s) => s.efeito && s.efeito.tipo === 'mod_eh_temp')
    .reduce((soma, s) => soma + (s.efeito.valor || 0), 0);
  if (devolver === 0) return p;
  const ehMax = Math.max(0, (Number(p.eh_max) || 0) - devolver);
  return { ...p, eh_max: ehMax, eh: Math.max(0, Math.min(ehMax, Number(p.eh) || 0)) };
}

/* Remove um status_temp pelo id (clique no chip, Fase 6) — núcleo puro.
   I3 (revisão final, 09/09/2026): filtrar sem passar por expirarEhTemp
   deixava o eh_max inflado pelo resto da batalha ao cancelar Heroísmo/
   Fúria/Animosidade/Segundo Fôlego na mão — só a expiração NATURAL (virada
   de rodada) devolvia a EH emprestada. Mesmo tratamento dos dois lados;
   statusPorPools roda ao fim porque zerar a EH pode derrubar (mesma ordem
   de processarViradaDeRodada). Devolve null quando o id não existe, pro
   call site saber que não há nada pra persistir. */
function removerStatusTempParticipante(p, statusId) {
  if (!p) return null;
  const atual = Array.isArray(p.status_temp) ? p.status_temp : [];
  const removidos = atual.filter((s) => s.id === statusId);
  if (!removidos.length) return null;
  const novoArr = atual.filter((s) => s.id !== statusId);
  return statusPorPools(expirarEhTemp({ ...p, status_temp: novoArr }, removidos));
}
// ordenarIniciativa usando a VB EFETIVA (mod_vb), preservando o vb real.
function ordenarIniciativaEfetiva(snaps) {
  return ordenarIniciativa(snaps.map((p) => ({ ...p, vb: vbEfetivo(p), __orig: p })))
    .map((d, i) => ({ ...d.__orig, ordem: i + 1 }));
}

/* ── Dano por rodada (Fase 1.2 — ex.: Envenenado) ──────────────────
   Regras confirmadas (07/2026, decisões do usuário):
     • Dano DIRETO na EF — veneno é interno, ignora EH e AR. Respeita o
       piso EF_MORTE e as mesmas transições de status da cascata.
     • Valor definido pelo Mestre ao aplicar (painel do atalho Envenenado).
     • Timing: a cada virada de rodada o dano MORDE ANTES do decremento —
       um veneno de 1 rodada causa dano na virada e então expira. */
function aplicarDanoDiretoEF(dano, p) {
  let r = Math.max(0, Math.floor(dano || 0));
  let ef = p.ef;
  if (r > 0 && ef > EF_MORTE) {
    const c = Math.min(ef - EF_MORTE, r);
    ef -= c; r -= c;
  }
  let status = p.status;
  if (ef <= EF_MORTE && status !== 'morto') status = 'morto';
  else if ((ef <= 0 || ((p.eh || 0) === 0 && (p.eh_max || 0) > 0)) && status === 'ativo') status = 'desmaiado';
  return { ...p, ef, status, sobra: r };
}

// Aplica TODOS os dano_por_rodada de um participante de uma vez (soma) e
// devolve o detalhe por status pro log. Sem efeitos → mesma referência.
function processarDanoPorRodada(p) {
  const eventos = (Array.isArray(p.status_temp) ? p.status_temp : [])
    .filter((s) => s.efeito && s.efeito.tipo === 'dano_por_rodada' && (s.efeito.valor || 0) > 0)
    .map((s) => ({ nome: s.nome, valor: s.efeito.valor }));
  if (!eventos.length) return { participante: p, eventos: [], total: 0 };
  const total = eventos.reduce((a, e) => a + e.valor, 0);
  return { participante: aplicarDanoDiretoEF(total, p), eventos, total };
}

// Virada de rodada de UM participante: reset de PA (ativos) → veneno morde
// (mortos e desistentes não sofrem) → decrementa status (null persiste).
function processarViradaDeRodada(p) {
  // Rodada nova devolve PA, movimento cheio E o direito de mover de novo
  // (moveu_na_rodada). Quem não está ativo não recupera nada.
  //
  // Movimento e PA saem da VB EFETIVA (01/09/2026), não do vb cru:
  //   • movimento — "velocidade" governa o passo, não só a ordem de agir. Isso
  //     muda também o alcance da Velocidade -5 da Falha Crítica, que antes só
  //     atrasava a iniciativa e agora encurta o passo. Intencional.
  //   • ação extra — regra do sistema, lida da descrição da magia Velocidade:
  //     "Se sua velocidade ultrapassar 30, você terá uma segunda ação na mesma
  //     rodada". Vale pra QUALQUER combatente acima de 30, venha o bônus de
  //     magia ou de vb nenhum (quem já nasce rápido também ganha).
  //     "Ultrapassar" é estrito: 30 exatos não ganham.
  //
  // Os dois recalculam AQUI, na virada, junto da reordenação de iniciativa em
  // montarNovaRodada — os três andam sempre juntos.
  const vbEf = vbEfetivo(p);
  let next = (p.status === 'ativo')
    ? { ...p, pa_rest: p.pa_max + (vbEf > 30 ? 1 : 0),
              mov_rest: movimentoBase(vbEf), moveu_na_rodada: false,
              // REGRA NOVA: a cota de 1 ativação livre (0 PA) de técnica
              // modo 'total' é POR RODADA — mesmo padrão de moveu_na_rodada.
              tecnica_livre_usada: false }
    : { ...p };
  let eventos = [], total = 0;
  if (p.status !== 'morto' && p.status !== 'desistiu') {
    const r = processarDanoPorRodada(next);
    next = r.participante; eventos = r.eventos; total = r.total;
  }
  if (Array.isArray(next.status_temp) && next.status_temp.length) {
    const antes = next.status_temp;
    const depois = decrementarStatusTemp(antes);
    // Comparar por ID, não por referência: decrementarStatusTemp recria via
    // spread TODO status com rodadas_rest numérico, sobrevivente ou não, então
    // identidade de objeto não distingue "decrementado" de "removido".
    const idsDepois = new Set(depois.map((s) => s.id));
    const removidos = antes.filter((s) => !idsDepois.has(s.id));
    next = { ...next, status_temp: depois };
    // Devolve a EH emprestada por técnica pelos status que saíram agora.
    next = expirarEhTemp(next, removidos);
    // Perder EH emprestada pode derrubar: statusPorPools decide.
    next = statusPorPools(next);
  }
  // Rodada nova invalida a rolagem feita e não aplicada na anterior (o campo
  // é do lado Jogador — ver o bloco de rolagem em BatalhaJogadorView). Sem
  // isto, uma rolagem pendente atravessava a virada quando quem virou a
  // rodada foi OUTRA pessoa (o Mestre no botão "Nova Rodada", por exemplo).
  if (next.rolagem_pendente) next.rolagem_pendente = null;
  return { participante: next, eventos, total };
}

// Virada COMPLETA da rodada — usada pelo Mestre (novaRodada) E pelo Jogador
// (handlePassar quando dá a volta), pra manter os dois lados idênticos:
// processa cada participante, reordena pela iniciativa EFETIVA e escolhe o
// primeiro elegível (ativo e não sem_acoes; se ninguém, ninguém fica atual).
/* ── Volta do combate pra ficha (puro) ─────────────────────────────
   O ciclo do sistema é: a ficha calcula os atributos e guarda os valores
   atuais → o personagem ENTRA em combate com esses valores (montarSnapshots)
   → ao SAIR, a ficha é atualizada com o que aconteceu. Esta é a peça da
   volta: dado o estado_atual que está na ficha e o snapshot final do
   participante, devolve o estado_atual novo.

   Devolve `null` quando o participante NÃO deve escrever nada.

   Duas guardas, e as duas cobrem perda de dado real:

   • AUSENTE. montarSnapshots marca `ausente: true` e zera todas as pools
     quando não consegue ler o PJ — deletado, ou um tropeço de rede no
     `.in(ids)`. Escrever esses zeros de volta fazia um PJ que só falhou de
     carregar sair do combate com ef 0 (desmaiado) e as 8 condições zeradas.

   • SNAPSHOT SEM CONDIÇÕES. Batalha criada antes das condições existirem não
     tem `condicoes` no participante, e `{ ...(p.condicoes || {}) }` gravava
     `{}` por cima das da ficha. Como condição ausente é lida como 0 (neutro)
     em toda a aplicação, isso neutralizava tudo de uma vez. Ter as chaves
     valendo 0 é diferente de não ter chave nenhuma: o primeiro é um
     personagem legitimamente neutro e SOBRESCREVE.

   Cobertura: 12-batalha/ciclo-ficha-batalha.test.js. */
function estadoAoEncerrar(estadoAtual, p) {
  if (!p || p.ausente) return null;
  const base = estadoAtual || {};
  const morto = p.status === 'morto';
  const num = (v) => (Number.isFinite(v) ? v : undefined);
  const vitalidade = {
    ...(base.vitalidade || {}),
    // Morto volta com a EF no piso: é assim que a morte sobrevive à volta —
    // montarSnapshots relê ef <= EF_MORTE e remonta o status na próxima.
    ef: morto ? EF_MORTE : num(p.ef),
    eh: morto ? 0        : num(p.eh),
    ar: num(p.ar),
    ka: num(p.karma),
  };
  const temCondicoes = p.condicoes && typeof p.condicoes === 'object'
    && Object.keys(p.condicoes).length > 0;
  return {
    ...base,
    condicoes: temCondicoes ? { ...p.condicoes } : (base.condicoes || {}),
    vitalidade,
  };
}

/* ── Concentração derrubada pelo VENENO da virada (puro) ───────────
   O dano_por_rodada vai DIRETO na EF (ignora EH e AR), e dano na EF derruba
   a magia sustentada — mesma regra dos golpes (decisão de 01/09/2026). Um
   conjurador envenenado, portanto, não sustenta magia.

   Roda ANTES da virada de verdade, e é de propósito: a magia que cai muda o
   vb de QUEM A RECEBIA, e é o vb que define movimento, ação extra (>30) e
   iniciativa da rodada nova. Se a quebra viesse depois, o alvo entraria na
   rodada com movimento e PA calculados sobre um bônus que já tinha caído.

   Por isso o dano é calculado duas vezes: aqui só pra DESCOBRIR quem foi
   ferido (o resultado é descartado), e de novo na virada de verdade, que é
   quem aplica. processarDanoPorRodada é pura e devolve o MESMO participante
   quando não há veneno, então a sonda é barata e o dano nunca conta dobrado.
   Cobertura: 12-batalha/concentracao-dano.test.js. */
function quebrarConcentracaoPorVeneno(participantes) {
  let out = participantes;
  for (const p of (participantes || [])) {
    // Mesma guarda de processarViradaDeRodada: morto e desistente não sofrem.
    if (p.status === 'morto' || p.status === 'desistiu') continue;
    const { participante: depois } = processarDanoPorRodada(p);
    if (depois === p) continue;                 // sem veneno, nada a fazer
    out = quebrarConcentracaoPorDano(out, p, depois);
  }
  return out;
}

function montarNovaRodada(participantes) {
  // Veneno morde na EF, e dano na EF derruba a magia sustentada. Resolve
  // ANTES de renovar recursos — ver quebrarConcentracaoPorVeneno.
  const base = quebrarConcentracaoPorVeneno(participantes);
  const eventosRodada = [];
  const processados = base.map((p) => {
    const r = processarViradaDeRodada(p);
    if (r.eventos.length) eventosRodada.push({ nome: p.nome, eventos: r.eventos, total: r.total });
    return r.participante;
  });
  const reordered = ordenarIniciativaEfetiva(processados);
  const primeiro = [...reordered].sort((a, b) => a.ordem - b.ordem)
    .find((p) => p.status === 'ativo' && !statusTemEfeito(p, 'sem_acoes'));
  return {
    participantes: reordered.map((p) => ({ ...p, atual: !!(primeiro && mesmoParticipante(p, primeiro)) })),
    eventos: eventosRodada,
  };
}

/* ── Linha de log do dano por rodada de uma virada (puro) ──────────
   `eventos` é o que montarNovaRodada devolve. Devolve null quando ninguém
   sangrou na virada — o chamador então não mexe no log.

   Existe pra que TODO caminho que vira a rodada registre a mordida do
   veneno do mesmo jeito. Antes o texto estava copiado no novaRodada do
   Mestre e no handlePassar do Jogador, e os quatro handle* do Jogador
   (ação/teste/item/apoio) simplesmente DESCARTAVAM os eventos: quando o
   turno do jogador virava a rodada, o dano por rodada era aplicado de
   verdade nas pools, mas não aparecia no log nem na Central de Mensagens
   — a EF caía sozinha, sem nada explicando. */
function entradaLogViradaRodada(eventos, rodadaNova) {
  if (!eventos || !eventos.length) return null;
  const texto = eventos
    .map((e) => `${e.nome} sofreu ${e.total} de dano (${e.eventos.map((x) => `${x.nome} ${x.valor}`).join(' + ')})`)
    .join('; ');
  return { rodada: rodadaNova, ts: Date.now(), acao: 'sistema', texto };
}

/* ── Aplica a consequência da Falha Crítica no ATACANTE (puro) ─────
   objDano: a arma OU a magia usada (danoNoTier respeita a fonte).
   q: qualidade do SEGUNDO dado (0..7). Retorna { participante, dano }. */
function aplicarFalhaCritica(atacante, objDano, q) {
  const ef = FC_EFEITOS[q] || {};
  let p = atacante;
  let dano = 0;
  if (ef.danoTier) {
    dano = danoNoTier(objDano, ef.danoTier);
    if (dano > 0) p = aplicarDanoCascata(dano, p, true); // pula EH → AR→EF (regra confirmada)
  }
  // q0: "e você desmaia" — força o status mesmo que a cascata não derrube
  // (morto tem precedência: a cascata pode ter matado).
  if (ef.desmaia && p.status === 'ativo') p = { ...p, status: 'desmaiado' };
  if (ef.status) {
    const atual = Array.isArray(p.status_temp) ? p.status_temp : [];
    const novo = {
      ...ef.status,
      id: ef.status.id + ':' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      efeito: { ...ef.status.efeito },
    };
    p = { ...p, status_temp: [...atual, novo] };
  }
  return { participante: p, dano };
}

/* ── Aplica um efeito de apoio (magia) num participante ────────────
   Só mexe em status_temp — o `vb` do snapshot fica intacto, exatamente como
   aplicarFalhaCritica faz acima. vbEfetivo soma os mod_vb na hora de ordenar
   a iniciativa e de calcular movimento/PA na virada da rodada.

   Empilha por construção: cada aplicação é uma entrada nova, e
   somaEfeitosStatus reduz por soma. Duas poções de pressa dão o dobro, e cada
   uma expira no seu próprio prazo. */
function aplicarEfeitoApoio(participante, magiaApoio, atorInstId) {
  const atual = Array.isArray(participante.status_temp) ? participante.status_temp : [];
  const novo = {
    id: 'mag:' + magiaApoio.key + ':' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    nome: magiaApoio.nome,
    icone: '🌀',
    rodadas_rest: magiaApoio.rodadas != null ? magiaApoio.rodadas : null,
    efeito: { tipo: 'mod_vb', valor: magiaApoio.mod_vb },
  };
  // Concentração: o efeito fica amarrado a QUEM o sustenta, pra que
  // quebrarConcentracao saiba o que derrubar quando esse alguém agir.
  if (magiaApoio.concentracao) {
    novo.concentracao = { ator: atorInstId, magia_key: magiaApoio.key };
  }
  return { ...participante, status_temp: [...atual, novo] };
}

/* ── Efeito de TÉCNICA no status_temp (Fase 1, 09/09/2026) ─────────
   Espelha aplicarEfeitoApoio: só mexe em status_temp, devolve objeto
   novo, não busca nada no banco. O valorTotal chega PRONTO do chamador
   (totalTecnica), pra função continuar pura e testável sem catálogo.

   Uma técnica pode gerar VÁRIOS status (Fúria gera 4). Todos levam o
   mesmo id 'tec_<key>' — é assim que a regra de não-acumular encontra
   e substitui a leva anterior inteira.

   REAPLICAR NÃO ACUMULA (decisão de 09/09/2026): a segunda ativação
   remove a leva antiga e grava outra com a duração cheia. Sem isso,
   ativar Mira cinco vezes somaria 5× o total na mesma coluna. */

/* Lê `grupo_armas`/`grupo_armaduras` do banco (CSV: "PL, PM, PP").
   Devolve null quando não há restrição — 'Livre' e vazio são o mesmo caso.
   Existe porque as duas colunas usam o MESMO formato, e porque o teste
   ingênuo `!col` não pega o 'Livre' (é truthy) — exatamente o bug que a
   Task 7 corrige em tecnicasCompativeisComArma. */
function gruposDeArma(csv) {
  if (!csv) return null;
  const txt = String(csv).trim();
  if (!txt || txt.toLowerCase() === 'livre') return null;
  const lista = txt.split(',').map((s) => s.trim()).filter(Boolean);
  return lista.length ? lista : null;
}

/* Deriva o grupo de arma (sigla, ex. 'CM') de um objeto de ataque do
   ataquesDoAtor. Três lugares reimplementavam esta mesma regra até
   09/09/2026 (tecnicasCompativeisComArma, tecnicaPermitida, o call site de
   somaModAtaque em AcaoPanel) — coincidiam porque as duas fontes têm a MESMA
   origem (catalogoBySlug[slug].grupo_armas, anexado como grupo_sigla em
   ataquesDoAtor:1352), mas eram três leituras separadas da mesma regra.
   Prioriza o catálogo (fonte de verdade) quando `catalogos` está à mão; cai
   pro grupo_sigla/grupo já anexado ao objeto quando não está. Ataque de
   CRIATURA não tem slug no catálogo de itens nem grupo_sigla — as duas
   pontas caem em null, sem quebrar (a técnica genérica libera). */
function grupoDaArma(arma, catalogos) {
  if (!arma) return null;
  if (catalogos && catalogos.catalogoBySlug && arma.slug) {
    const item = catalogos.catalogoBySlug[arma.slug];
    if (item && item.grupo_armas) return String(item.grupo_armas);
  }
  return arma.grupo_sigla || arma.grupo || null;
}

function aplicarEfeitoTecnica(participante, tecnica, valorTotal) {
  const key = tecnica && tecnica.key;
  const reg = (typeof tecnicaEfeitoDe === 'function') ? tecnicaEfeitoDe(key) : null;
  if (!reg) return participante;   // Fase 2 ou narrativa — segue como antes

  const id = 'tec_' + key;
  const anteriores = Array.isArray(participante.status_temp) ? participante.status_temp : [];
  // Tira a leva anterior DESTA técnica (e só dela) antes de gravar a nova.
  const semEsta = anteriores.filter((s) => s.id !== id);

  const novos = reg.efeitos.map((ef) => {
    const efeito = (reg.modo === 'teste')
      ? { tipo: ef.tipo, valor: ef.valor }
      : { tipo: ef.tipo, valor: (ef.sinal || 1) * (Number(valorTotal) || 0) };
    // Restrição de arma: vem de tecnicas.grupo_armas, não do registro.
    // Ativar Mira (PL,PM,PP) com um arco e trocar para espada não deve manter
    // o bônus — por isso a lista viaja NO EFEITO, e somaModAtaque a consulta
    // a cada golpe. 'Livre' e vazio significam "qualquer arma": grupos = null.
    if (ef.tipo === 'mod_ataque') {
      const grupos = gruposDeArma(tecnica.grupo_armas);
      if (grupos) efeito.grupos = grupos;
    }
    return {
      id,
      nome: tecnica.nome || key,
      icone: reg.icone,
      rodadas_rest: reg.rodadas,
      efeito,
    };
  });

  let resultado = { ...participante, status_temp: [...semEsta, ...novos] };

  // mod_eh_temp é o ÚNICO efeito que muda o snapshot em vez de ser lido
  // on-the-fly: EH é pool com teto, e o combate clampa em eh_max. Emprestar
  // exige subir os dois. A devolução mora em expirarEhTemp.
  // Como a leva anterior foi removida acima, o empréstimo velho tem que ser
  // devolvido ANTES de emprestar de novo — senão reaplicar Heroísmo empilha.
  const devolverAntigo = anteriores
    .filter((s) => s.id === id && s.efeito && s.efeito.tipo === 'mod_eh_temp')
    .reduce((soma, s) => soma + (s.efeito.valor || 0), 0);
  const emprestarNovo = novos
    .filter((s) => s.efeito.tipo === 'mod_eh_temp')
    .reduce((soma, s) => soma + (s.efeito.valor || 0), 0);
  const delta = emprestarNovo - devolverAntigo;
  if (delta !== 0) {
    const ehMax = Math.max(0, (Number(resultado.eh_max) || 0) + delta);
    resultado = {
      ...resultado,
      eh_max: ehMax,
      eh: Math.max(0, Math.min(ehMax, (Number(resultado.eh) || 0) + delta)),
    };
  }
  // C2 (revisão final, 09/09/2026): esta função NÃO marca mais o uso. Ela
  // grava só o efeito no participante recebido — que nos dois call sites de
  // aplicarTeste é o DESTINO do efeito, não necessariamente o ator (Voz de
  // Comando/Pressionar Oponente miram em outros). Chamar marcarTecnicaUsada
  // aqui queimava o uso Único do ALVO em vez do ATOR: Voz de Comando (Único,
  // até 4 aliados) gastava a técnica dos quatro. O uso é anotado à parte
  // pelos dois aplicarTeste, sobre o TESTADOR — ver marcarTecnicaUsada.
  return resultado;
}

/* ── Texto do efeito de técnica pra Central de Mensagens (puro) ────
   Fecha a lacuna relatada em mesa: "usou Esquiva → Falha Crítica (col 11,
   d20 1)" não dizia NADA sobre o efeito, e o jogador não distinguia (1)
   aplicou, (2) o teste falhou e NÃO aplicou, de (3) a técnica não tem
   automação nenhuma (Fase 2/narrativa — 34 das 58 hoje). Três ramos:

     1. efeitoAplicado != null    → "efeito aplicado[ em <alvos>]: <valor>"
     2. reg existe, mas é null    → "efeito não aplicado (teste falhou)"
        (só ocorre em modo 'teste' — Sangramento é o único hoje)
     3. reg não existe (`tecnicaEfeitoDe` devolve null) → "efeito narrativo"

   O <valor> usa o mesmo par (sinal/valor fixo) que aplicarEfeitoTecnica usa
   pro PRIMEIRO efeito do registro — pra técnicas com mais de um efeito de
   sinais opostos (Postura Ofensiva/Defensiva), é o efeito principal que
   aparece na mensagem; o card de status_temp mostra os demais. Modo 'teste'
   usa o valor FIXO do registro (não payload.valor_total: o total do d20 não
   é o que foi de fato gravado — ver o teste "modo teste usa o valor FIXO").

   PT-only por decisão de projeto, não esquecimento: Central de Mensagens é
   mesa_log COMPARTILHADO entre Mestre e Jogadores (não UI por-viewer), e
   NENHUMA outra chamada de registrar_evento_mesa neste arquivo passa por
   COPY/tBat — todas são literais em português, e mesmo `resultado.pt` é
   usado sempre (nunca `.en`) na montagem deste mesmo texto, duas linhas
   acima. Ver o comentário de tBat no fim do arquivo: "FORA do i18n por
   decisão". Introduzir i18n só neste trecho quebraria essa consistência. */
function textoEfeitoTecnica(chaveTecnica, efeitoAplicado, nomeAutor) {
  const reg = (typeof tecnicaEfeitoDe === 'function') ? tecnicaEfeitoDe(chaveTecnica) : null;
  if (!reg) return ' — efeito narrativo, resolva na mesa';
  if (!efeitoAplicado) return ' — efeito não aplicado (teste falhou)';
  const primeiro = (reg.efeitos && reg.efeitos[0]) || {};
  const valor = (reg.modo === 'teste')
    ? (primeiro.valor || 0)
    : (primeiro.sinal || 1) * (Number(efeitoAplicado.valor) || 0);
  const valorTxt = valor > 0 ? `+${valor}` : `${valor}`;
  const alvos = (efeitoAplicado.alvos || []).filter((n) => n !== nomeAutor);
  return alvos.length
    ? ` — efeito aplicado em ${alvos.join(', ')}: ${valorTxt}`
    : ` — efeito aplicado: ${valorTxt}`;
}

/* `uso: 'Único'` significa uma vez por batalha (decisão de 09/09/2026).
   'Intermitente' e 'Livre' ficam sem limite — reaplicar só renova a duração,
   sem somar, o que já tira o incentivo de spammar. */
function podeUsarTecnica(p, tecnica) {
  const usadas = (p && Array.isArray(p.tecnicas_usadas)) ? p.tecnicas_usadas : [];
  if (tecnica && tecnica.uso === 'Único' && usadas.includes(tecnica.key)) {
    return { pode: false, motivo: 'ja_usada' };
  }
  return { pode: true, motivo: null };
}

/* Anota a técnica como usada nesta batalha. Separada de aplicarEfeitoTecnica
   porque o uso é sempre do ATOR, enquanto o efeito pode cair só nos alvos
   (Voz de Comando, Pressionar Oponente): os dois não andam no mesmo
   participante. Idempotente. */
function marcarTecnicaUsada(p, key) {
  if (!p || !key) return p;
  const usadas = Array.isArray(p.tecnicas_usadas) ? p.tecnicas_usadas : [];
  if (usadas.includes(key)) return p;
  return { ...p, tecnicas_usadas: [...usadas, key] };
}

/* Custo de PA da ativação de uma técnica (REGRA NOVA, revisão final,
   09/09/2026): modo 'total' (23 das 24 técnicas da Fase 1) é ativação LIVRE
   — 0 PA, até 1 vez por rodada por combatente (a flag zera em
   processarViradaDeRodada, mesmo padrão de moveu_na_rodada). modo 'teste'
   (só Sangramento) e técnica sem entrada no registro (Fase 2, narrativa)
   seguem custando 1 PA como antes — o próprio PA já as limita, não precisam
   de flag. Função pura reusada pelos dois aplicarTeste (Mestre/Jogador), no
   mesmo molde de aplicarEfeitoTecnica: a regra mora aqui, a duplicação fica
   só no call site.

   Decisão de regra CONFIRMADA PELO USUÁRIO em 09/09/2026, que parece bug mas
   não é: atacar antes de ativar a técnica livre da rodada IMPEDE de usá-la
   depois. "0 PA" é o custo em Pontos de Ação, não uma isenção do turno — quem
   gasta o último PA atacando aciona o auto-passe da vez (pa_rest === 0, ver
   os call sites de autoPassarSeNecessario) antes de ter a chance de ativar a
   técnica, e a ativação livre não faz nada pra segurar o turno aberto. Na
   prática, "0 PA" para o jogador significa "ative antes de agir, ou perdeu
   a rodada". Não corrigir sem confirmar de novo com o usuário. */
function debitarCustoTecnica(participante, tecnicaKey) {
  const reg = (typeof tecnicaEfeitoDe === 'function') ? tecnicaEfeitoDe(tecnicaKey) : null;
  if (reg && reg.modo === 'total') {
    return { ...participante, tecnica_livre_usada: true };
  }
  return { ...participante, pa_rest: Math.max(0, (participante.pa_rest || 0) - 1) };
}

/* Teto de 1 ativação LIVRE (modo 'total') por rodada. Devolve bloqueado só
   quando a técnica É modo 'total' E a flag já foi consumida nesta rodada —
   toda técnica modo 'teste' (Sangramento) e toda técnica sem entrada no
   registro passam livres, porque não disputam a cota. */
function podeAtivarTecnicaLivre(p, tecnica) {
  const reg = (typeof tecnicaEfeitoDe === 'function')
    ? tecnicaEfeitoDe(tecnica && tecnica.key) : null;
  if (!reg || reg.modo !== 'total') return { pode: true, motivo: null };
  if (p && p.tecnica_livre_usada) return { pode: false, motivo: 'livre_usada' };
  return { pode: true, motivo: null };
}

/* ── Quebra a concentração de um conjurador ────────────────────────
   Regra confirmada em 01/09/2026: duração "Variável" significa que o
   conjurador sustenta a magia e não pode fazer mais nada. Se atacar, lançar
   outra magia, usar item, ANDAR, levar dano que chegue na EF, desmaiar,
   morrer ou desistir, a magia cai — em TODOS os alvos de uma vez.

   NÃO quebra: passar a vez sem agir (é assim que se sustenta), nem dano
   inteiramente absorvido por EH ou AR — a cascata é EH → AR → EF, e a regra
   é "dano na EF".

   Devolve o MESMO array quando não há nada a remover: os chamadores usam
   isso pra decidir se vale persistir. */
function quebrarConcentracao(participantes, atorInstId) {
  if (!atorInstId || !Array.isArray(participantes)) return participantes;
  let mudou = false;
  const next = participantes.map((p) => {
    const st = Array.isArray(p.status_temp) ? p.status_temp : null;
    if (!st || st.length === 0) return p;
    const filtrado = st.filter((x) => !(x.concentracao && x.concentracao.ator === atorInstId));
    if (filtrado.length === st.length) return p;
    mudou = true;
    return { ...p, status_temp: filtrado };
  });
  return mudou ? next : participantes;
}

/* ── Consequência de LEVAR DANO, em concentração (puro) ────────────
   Regra única dos três caminhos de dano — aplicarDano (manual do Mestre),
   aplicarAcao (ataque do Mestre) e handleAcao (ataque do Jogador).

   A magia sustentada cai quando o dano CHEGA NA EF, ou quando o golpe
   derruba/mata quem a sustentava. Dano contido inteiramente por EH ou AR
   não quebra — a cascata é EH → AR → EF e a regra é "dano na Energia
   Física" (ver quebrarConcentracao acima).

   As DUAS condições importam, e é aí que os call sites erravam:

     • aplicarDano não checava nenhuma. O dano manual é o caminho mais usado
       pro dano que vem de fora do motor (queda, armadilha, narrativa), então
       a vítima morria e o buff que ela sustentava seguia ativo no alvo.
     • aplicarAcao e handleAcao checavam só a EF. Quem zera a EH DESMAIA sem
       a EF ser tocada, e desmaiar quebra por si só — esse caso escapava.

   Recebe o participante ANTES e DEPOIS do dano; sem motivo pra quebrar,
   devolve o MESMO array. Cobertura: 12-batalha/concentracao-dano.test.js. */
function quebrarConcentracaoPorDano(participantes, antes, depois) {
  if (!antes || !depois) return participantes;
  const chegouNaEF = (Number(depois.ef) || 0) < (Number(antes.ef) || 0);
  const caiu = antes.status === 'ativo' && depois.status !== 'ativo';
  if (!chegouNaEF && !caiu) return participantes;
  return quebrarConcentracao(participantes, depois.inst_id);
}

/* ── Botão de ação do menu do token — só ícone ─────────────────────
   Mover / Ação / Passar / Desistir aparecem no card do Mestre E no do
   Jogador. Eram dois blocos de JSX quase iguais, com o rótulo escrito ao
   lado do ícone; viraram este componente pra que a fileira não divirja
   entre as duas telas.

   Só ícone (pedido do usuário, 01/09/2026), então o rótulo PRECISA existir
   em algum lugar: vai no aria-label sempre, e no tooltip do sistema quando
   quem monta tem `abrirTip`. O `title` nativo é o fallback — o card do
   Jogador não tinha tooltip nenhum até agora, e um ícone mudo ali seria
   pior que o texto que saiu. */
function BotaoAcaoMenu({ icone, rotulo, variante, onClick, disabled, extraClasse, abrirTip, fecharTip }) {
  const temTip = typeof abrirTip === 'function';
  return (
    <button
      type="button"
      className={`btn-${variante || 'ghost'} btn-sm batalha-menu-acao-ic${extraClasse ? ' ' + extraClasse : ''}`}
      /* Fecha o tooltip ANTES de agir. Vários destes botões trocam o que
         está na tela (Ação abre o painel e some com a fileira inteira): o
         botão desmonta com o tip aberto, o mouseleave nunca chega nele e o
         balão fica órfão flutuando por cima do painel até o próximo hover. */
      onClick={(e) => { if (typeof fecharTip === 'function') fecharTip(); if (onClick) onClick(e); }}
      disabled={disabled}
      aria-label={rotulo}
      {...propsTip(abrirTip, fecharTip, temTip ? undefined : rotulo)}
      onMouseEnter={temTip ? (e) => abrirTip(e, rotulo) : undefined}
      onMouseLeave={temTip ? fecharTip : undefined}
    >
      <i className={'ti ' + icone} aria-hidden="true" />
    </button>
  );
}

/* ── Saída de combate: desmaiar, morrer ou desistir (puro) ─────────
   Regra ÚNICA do Mestre (mudarStatus) e do Jogador (handleDesistir) —
   as duas telas chamam esta função em vez de cada uma reimplementar as
   três consequências:

     1. o status do participante muda;
     2. a magia que ele sustentava CAI em todos os alvos
        (quebrarConcentracao — sair de combate é "não pode fazer mais
        nada", ver a regra em quebrarConcentracao acima);
     3. se era a VEZ dele, a vez passa pro próximo ativo; e se ele era o
        ÚLTIMO da ordem, devolve viraRodada:true pro chamador virar a
        rodada — em vez de zerar o `atual` de todos e deixar a batalha
        parada sem ninguém pra agir.

   O passo 3 é o que faltava no lado do Jogador (auditoria 01/09/2026):
   desistir sendo o último da ordem era softlock, o MESMO que a virada
   automática de 30/08/2026 já tinha matado em todos os outros caminhos.

   A virada em si fica com o chamador porque cada lado persiste do seu
   jeito: o Mestre por novaRodada() (que ainda loga o dano por rodada e
   avisa a mesa), o Jogador por montarNovaRodada() + RPC.

   Devolve { participantes, viraRodada }. Não muta o array recebido; sem
   nada a fazer, devolve o MESMO array. */
function saidaDeCombate(participantes, ref, novoStatus) {
  const idx = (participantes || []).findIndex((p) => mesmoParticipante(p, ref));
  if (idx < 0) return { participantes, viraRodada: false };
  const antes = participantes[idx];
  let next = participantes.map((p, i) => (i === idx ? { ...p, status: novoStatus } : p));
  next = [...quebrarConcentracao(next, next[idx].inst_id)];
  if (!antes.atual) return { participantes: next, viraRodada: false };
  const prox = proximoAtivo(next, antes.ordem);
  if (!prox) return { participantes: next, viraRodada: true };
  return {
    participantes: next.map((p) => ({ ...p, atual: mesmoParticipante(p, prox) })),
    viraRodada: false,
  };
}

/* ============================== Condução (Fase 4b: turnos + iniciativa) ============================== */
function ConduzirBatalhaView({ batalha, historia, personagens = [], criaturas = [], lang, onVoltar, onAtualizado, onHeaderActionsChange, onRolagemPendenteChange }) {
  const isEn = lang === 'en';
  const tb = tBat(lang); // i18n-sync (Fase 3.3)
  const [tip, abrirTip, fecharTip, manterTip] = usePortalTooltip(60);
  const [estado, setEstado] = useState(batalha.estado);
  const [participantes, setParticipantes] = useState(batalha.participantes || []);
  const [rodada, setRodada] = useState(batalha.rodada || 0);
  const [iniciando, setIniciando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState(null);
  const [motorAberto, setMotorAberto] = useState(false);
  /* Edição de pool pelo card: clique numa das 4 barras (EF/EH/AR/KA) abre um
     campo pro Mestre digitar o valor. Substituiu o par de botões coração
     (dano/cura) em 01/09/2026 — eram dois painéis, um que SUBTRAÍA com
     cascata e outro que SOMAVA numa pool escolhida num seletor. Agora é um
     gesto só, e o mesmo da Ficha: clicou na barra, digitou o valor.
     `poolOpen` guarda "fkey|pool" pra saber qual barra de qual lutador. */
  const [poolOpen, setPoolOpen] = useState(null);
  const [poolVal, setPoolVal] = useState('');
  // Fase 6 — Status temporários, Encerrar
  const [statusNome,    setStatusNome]    = useState('');
  const [statusIcone,   setStatusIcone]   = useState('');
  const [statusRodadas, setStatusRodadas] = useState(3);
  // Fase 1.2 — painel do Envenenado (dano por rodada): valor digitado pelo Mestre.
  const [venenoOpen,    setVenenoOpen]    = useState(null);  // fkey do lutador com painel aberto
  const [venenoVal,     setVenenoVal]     = useState('');
  const [venenoRodadas, setVenenoRodadas] = useState(3);
  const [encerrarOpen,  setEncerrarOpen]  = useState(false); // painel inline com toggle de restaurar
  const [catalogos, setCatalogos] = useState(null);
  const [acaoOpen, setAcaoOpen] = useState(false);
  // Teste agora é uma tab dentro do painel de Ação (AcaoPanel) — não tem mais
  // estado/botão próprio no footer da batalha.
  // Rolagem comprometida dentro do AcaoPanel (já existe d20 sem aplicar) —
  // reportada via onRolagemPendenteChange, usada pra travar os botões do
  // header (Passar/Nova Rodada/Encerrar) enquanto durar. Ver AcaoPanel.
  const [rolagemPendente, setRolagemPendente] = useState(false);

  /* Rolagem feita e não aplicada, PERSISTIDA em batalhas.rolagem_pendente.
     Semeada da linha do banco: é isso que faz o resultado sobreviver a
     trocar de menu e a fechar o navegador. Toda escrita que APLICA a ação
     zera a coluna no mesmo update — ver os `rolagem_pendente: null`. */
  const [rolagemSalva, setRolagemSalva] = useState(batalha.rolagem_pendente || null);
  const salvarRolagem = (r) => { setRolagemSalva(r); persistir({ rolagem_pendente: r }); };
  // Sobe esse mesmo estado mais um nível, pro avô (BatalhasHistoriaView)
  // travar também a seta de voltar do header da página — mesmo padrão já
  // usado por onHeaderActionsChange logo abaixo.
  useEffect(() => {
    onRolagemPendenteChange && onRolagemPendenteChange(rolagemPendente);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolagemPendente]);
  const [log, setLog] = useState(batalha.log || []);

  const STATUS = {
    ativo:     { pt: 'Ativo',     en: 'Active'   },
    desmaiado: { pt: 'Desmaiado', en: 'Fainted'  },
    morto:     { pt: 'Morto',     en: 'Dead'     },
    desistiu:  { pt: 'Desistiu',  en: 'Withdrew' },
  };

  // Persiste no banco e aplica o estado local (locais) de forma otimista.
  const persistir = async (campos, locais) => {
    if (locais) locais();
    setSalvando(true);
    const { error: err } = await supabaseClient.from('batalhas').update(campos).eq('id', batalha.id);
    setSalvando(false);
    if (err) { setError(err.message); return false; }
    onAtualizado && onAtualizado();
    return true;
  };

  // Carrega catálogos quando a batalha está ativa (necessários p/ as ações)
  useEffect(() => {
    if (estado !== 'ativa') return;
    let cancelled = false;
    (async () => {
      const pjIds  = participantes.filter((p) => p.tipo === 'pj').map((p) => p.ref_id);
      const criIds = participantes.filter((p) => p.tipo === 'criatura').map((p) => p.ref_id);
      const [pjRes, itRes, magRes, tecRes, habRes, criRes] = await Promise.all([
        pjIds.length  ? supabaseClient.from('personagens').select('*').in('id', pjIds) : Promise.resolve({ data: [] }),
        fetchCatalogoCompleto(),
        supabaseClient.from('magias').select('*'),
        supabaseClient.from('tecnicas').select('*'),
        supabaseClient.from('habilidades').select('*'),
        criIds.length ? supabaseClient.from('criaturas').select('*').in('id', criIds)  : Promise.resolve({ data: [] }),
      ]);
      if (cancelled) return;
      const cat = {
        pjById: {}, criById: {}, catalogoBySlug: {},
        magiasByKey: {}, tecnicasByKey: {},
        habilidadesByKey: {}, habilidadesDb: habRes.data || [],
      };
      (pjRes.data  || []).forEach((p) => { cat.pjById[p.id] = p; });
      (itRes.data  || []).forEach((it) => { cat.catalogoBySlug[it.slug] = it; });
      (magRes.data || []).forEach((m) => { cat.magiasByKey[m.key] = m; });
      (tecRes.data || []).forEach((t) => { cat.tecnicasByKey[t.key] = t; });
      (habRes.data || []).forEach((h) => { cat.habilidadesByKey[h.key] = h; });
      (criRes.data || []).forEach((c) => { cat.criById[c.id] = c; });
      setCatalogos(cat);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, [estado]);

  // Realtime: reflete no Mestre as ações feitas por OUTRO cliente na mesma
  // batalha — em especial as do JOGADOR (que resolve via RPC
  // atualizar_batalha_jogador). Sem isto, a tela do Mestre só atualizaria após
  // ele próprio agir. O eco das escritas do próprio Mestre é idempotente
  // (mesmos valores → mesmo estado). Filtrado por id pra ignorar outras batalhas.
  useEffect(() => {
    if (!batalha || !batalha.id) return;
    const ch = supabaseClient
      .channel('batalha_mestre_' + batalha.id)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'batalhas', filter: 'id=eq.' + batalha.id },
        (payload) => {
          const nova = payload && payload.new;
          if (!nova) return;
          if (nova.estado != null)        setEstado(nova.estado);
          if (nova.participantes != null) setParticipantes(nova.participantes);
          if (nova.rodada != null)        setRodada(nova.rodada);
          if (nova.log != null)           setLog(nova.log);
        })
      .subscribe();
    return () => { supabaseClient.removeChannel(ch); };
    // eslint-disable-next-line
  }, [batalha && batalha.id]);

    const iniciar = async () => {
    setIniciando(true); setError(null);
    try {
      // Lê personagens_pools fresh da história (Fase 6: pools persistidos).
      let pools = null;
      if (historia && historia.id) {
        const { data: histRow } = await supabaseClient
          .from('historias').select('personagens_pools').eq('id', historia.id).maybeSingle();
        pools = histRow ? (histRow.personagens_pools || {}) : null;
      }
      // `participantes` (estado), NÃO `batalha.participantes` (prop).
      // O estado é inicializado da prop uma única vez (useState lá em cima) e
      // nunca ressincronizado, então é ELE que acumula o posicionamento do
      // setup — posicionarNoSetup escreve `pos` nele. Ler a prop aqui
      // ressuscitava a lista sem posição nenhuma, e todo mundo voltava para a
      // bancada assim que a batalha começava.
      const snaps = await montarSnapshots(participantes || [], pools);
      let ordenados = ordenarIniciativa(snaps);
      const primeiro = [...ordenados].sort((a, b) => a.ordem - b.ordem).find((p) => p.status === 'ativo');
      ordenados = ordenados.map((p) => ({ ...p, atual: !!(primeiro && mesmoParticipante(p, primeiro)) }));
      await persistir({ estado: 'ativa', rodada: 1, participantes: ordenados }, () => {
        setParticipantes(ordenados); setRodada(1); setEstado('ativa');
      });
    } catch (e) {
      setError((e && e.message) || String(e));
    } finally {
      setIniciando(false);
    }
  };

  const current = participantes.find((p) => p.atual)
    || participantes.find((p) => p.status === 'ativo') || null;

  /* ── TABULEIRO ────────────────────────────────────────────────────────
     Dois modos de colocar token no grid, propositalmente diferentes:

     SETUP — posicionamento livre. A batalha ainda não começou, então não
     há PA nem movimento pra gastar; a única regra é caber no tabuleiro e
     não empilhar. Escreve `pos` direto no participante CRU, que é o que
     `montarSnapshots` lê no iniciar() pra semear o snapshot.

     ATIVA — movimento de verdade: passa por moverParticipante, que cobra
     as células andadas do mov_rest e 1 PA, e recusa com motivo.

     Ambos devolvem boolean: true = o clique foi consumido (o tabuleiro
     limpa a seleção), false = recusado (a mensagem vai pro `error`).    */
  const posicionarNoSetup = (p, idx, destino) => {
    if (salvando) return false;
    if (!posValida(destino)) { setError(motivoMovimento('fora_do_tabuleiro', isEn)); return false; }
    if (celulaOcupada(destino, participantes, p)) { setError(motivoMovimento('celula_ocupada', isEn)); return false; }
    const next = participantes.map((q, i) => (i === idx ? { ...q, pos: { x: destino.x, y: destino.y } } : q));
    setError(null);
    persistir({ participantes: next }, () => setParticipantes(next));
    return true;
  };

  const moverNoTabuleiro = (p, idx, destino) => {
    if (salvando) return false;
    if (!p.atual) { setError(motivoMovimento('nao_e_a_vez', isEn)); return false; }
    const r = moverParticipante(p, destino, participantes);
    if (!r.ok) { setError(motivoMovimento(r.motivo, isEn)); return false; }
    // Mover não gasta PA nem passa a vez (30/08/2026): quem anda continua com
    // a ação dele para gastar. A vez só passa por Passar, por aplicarAcao ou
    // por ficar sem PA agindo.
    // Andar quebra a concentração (regra confirmada em 01/09/2026): sustentar
    // a magia exige ficar parado evocando.
    const movido = participantes.map((q, i) => (i === idx ? r.participante : q));
    const next = [...quebrarConcentracao(movido, p.inst_id)];
    setError(null);
    persistir({ participantes: next }, () => setParticipantes(next));
    return true;
  };

  // Enriquecimento do token (foto/raça). O snapshot já carrega os dois, mas
  // no SETUP os participantes ainda são crus — aí isto é a única fonte.
  const metaTokens = useMemo(() => {
    const m = {};
    (personagens || []).forEach((x) => { m['pj:' + x.id] = { foto_url: x.foto_url || null, raca: x.raca || null }; });
    (criaturas || []).forEach((x) => { m['criatura:' + x.id] = { foto_url: null, raca: x.tipo || null }; });
    return m;
  }, [personagens, criaturas]);

  /* Edição manual de UMA pool (EF/EH/AR/KA) pelo clique na barra.
     Substituiu aplicarDano + aplicarCura em 01/09/2026. A diferença de fundo:
     os dois antigos operavam por DELTA — o dano descia em cascata EH→AR→EF
     com opção de crítico, a cura somava numa pool escolhida num seletor.
     Este DEFINE o valor da pool que o Mestre clicou, que é o gesto pedido e o
     mesmo que a Ficha já usa.

     O que NÃO se perde no caminho, e é por isso que não é um setState seco:
     baixar a EF pela barra tem as mesmas consequências de levar um golpe —
     derruba a magia que o lutador sustentava e, se ele cair na própria vez,
     passa o turno. Sem isso, a edição manual seria a porta pela qual o buraco
     de concentração voltaria. O status sai de statusPorPools, o mesmo que o
     consumo de item usa. */
  const aplicarPool = (idx, pool) => {
    const p = participantes[idx];
    if (!p) return;
    const atualizado = statusPorPools({ ...p, [pool]: valorPoolEditado(p, pool, poolVal) });
    let next = participantes.map((q, k) => (k === idx ? atualizado : q));
    next = [...quebrarConcentracaoPorDano(next, p, atualizado)];
    const fechar = fecharPool;
    if (atualizado.status !== 'ativo' && p.atual) {
      const prox = proximoAtivo(next, p.ordem);
      if (!prox) { fechar(); novaRodada(next); return; }   // era o último → vira a rodada
      next = next.map((q) => ({ ...q, atual: mesmoParticipante(q, prox) }));
    }
    persistir({ participantes: next }, () => { setParticipantes(next); fechar(); });
  };

  // Fase 6 — Status temporário: adiciona ao array do participante.
  const aplicarStatusTemp = (idx) => {
    const nome = String(statusNome || '').trim();
    const rodadas = Math.max(1, parseInt(statusRodadas || '1', 10) || 1);
    if (!nome) return;
    const novoStatus = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      nome,
      icone: String(statusIcone || '').trim() || null,
      rodadas_rest: rodadas,
    };
    const p = participantes[idx];
    const atual = Array.isArray(p.status_temp) ? p.status_temp : [];
    const atualizado = { ...p, status_temp: [...atual, novoStatus] };
    const next = participantes.map((q, i) => (i === idx ? atualizado : q));
    persistir({ participantes: next }, () => {
      setParticipantes(next);
      setStatusNome(''); setStatusIcone(''); setStatusRodadas(3);
    });
  };

  // Fecha o modal de Envenenar e devolve os campos ao padrão. Um lugar só,
  // porque o modal fecha por três vias (x, Cancelar e Escape do ModalShell).
  const fecharVeneno = () => { setVenenoOpen(null); setVenenoVal(''); setVenenoRodadas(3); };

  // Idem para o editor de pool. Mesmas três vias de saída do ModalShell.
  const fecharPool = () => { setPoolOpen(null); setPoolVal(''); };

  // Fase 1.2 — Aplica Envenenado com dano por rodada (direto na EF, regra
  // confirmada). O valor é digitado pelo Mestre; morde a cada Nova Rodada.
  const aplicarVeneno = (idx) => {
    const valor = Math.max(1, parseInt(venenoVal || '0', 10) || 0);
    const rodadas = Math.max(1, parseInt(venenoRodadas || '1', 10) || 1);
    if (!venenoVal || valor < 1) return;
    const novoStatus = {
      id: 'veneno:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      nome: tb.envenenado,
      icone: '☠',
      rodadas_rest: rodadas,
      efeito: { tipo: 'dano_por_rodada', valor },
    };
    const p = participantes[idx];
    const atual = Array.isArray(p.status_temp) ? p.status_temp : [];
    const atualizado = { ...p, status_temp: [...atual, novoStatus] };
    const next = participantes.map((q, i) => (i === idx ? atualizado : q));
    persistir({ participantes: next }, () => { setParticipantes(next); fecharVeneno(); });
  };

  // Fase 6 — Remove um status temporário (clique no chip). O núcleo puro
  // mora em removerStatusTempParticipante (I3, abaixo); aqui é só o
  // call site: acha o participante, persiste.
  const removerStatusTemp = (idx, statusId) => {
    const atualizado = removerStatusTempParticipante(participantes[idx], statusId);
    if (!atualizado) return;
    const next = participantes.map((q, i) => (i === idx ? atualizado : q));
    persistir({ participantes: next }, () => setParticipantes(next));
  };

  const aplicarAcao = (payload) => {
    // payload: { tipo: 'arma'|'magia', arma?, magia?, tecnica?, alvo, coluna, d20, resultado, dano, custo_karma,
    //            d20_critico?, res_critico?, tipo_critico?, tipo_critico_arma?, msg_critico? }
    const { tipo, arma, magia, tecnica, alvo, coluna, d20, resultado, dano, custo_karma,
            d20_critico, res_critico, tipo_critico, tipo_critico_arma, msg_critico } = payload;
    const critico = !!(resultado && resultado.critico);
    const alvoIdx = participantes.findIndex((p) => mesmoParticipante(p, alvo));
    const atorIdx = participantes.findIndex((p) => p.atual);
    if (alvoIdx < 0 || atorIdx < 0) return;

    let next = [...participantes];
    // Atacar É uma ação: derruba a concentração de quem ataca.
    next = [...quebrarConcentracao(next, next[atorIdx].inst_id)];
    if (dano > 0) {
      const alvoAntes = next[alvoIdx];
      // Fase 2: além do crítico, o golpe pode furar EH e/ou AR por técnica
      // (ignora_eh, ignora_armadura) ou por condição do alvo (derrubado).
      // Esquiva anula o golpe inteiro — dano ZERO mesmo com crítico ou
      // ignora_eh: esquivar é não ser atingido (ver consumirEvitaGolpe).
      const esq = consumirEvitaGolpe(alvoAntes);
      if (esq.evitou) {
        next[alvoIdx] = esq.participante;   // dano nenhum, status consumido
      } else {
        const modsG = modsDoGolpe(next[atorIdx], alvoAntes);
        next[alvoIdx] = aplicarDanoCascata(dano, alvoAntes, { critico, ...modsG });
      }
      // E o golpe derruba a concentração do ALVO se furou até a EF dele ou
      // se o derrubou/matou. Dano contido em EH ou AR não quebra — mas zerar
      // a EH desmaia, e desmaiar quebra (ver quebrarConcentracaoPorDano).
      next = [...quebrarConcentracaoPorDano(next, alvoAntes, next[alvoIdx])];
    }
    // Debita PA (sempre 1) e karma (se for magia).
    const k = Math.max(0, custo_karma || 0);
    next[atorIdx] = {
      ...next[atorIdx],
      pa_rest: Math.max(0, (next[atorIdx].pa_rest || 0) - 1),
      karma:   Math.max(0, (next[atorIdx].karma   || 0) - k),
    };

    // Falha Crítica (q=0): a consequência do segundo dado cai no PRÓPRIO
    // atacante (Fase 1.1) — dano pulando EH + status mecânico da tabela.
    let danoSelf = 0;
    if (tipo_critico === 'self' && res_critico) {
      const fc = aplicarFalhaCritica(next[atorIdx], tipo === 'magia' ? magia : arma, res_critico.q);
      next[atorIdx] = fc.participante;
      danoSelf = fc.dano;
    }

    // PA zerado, incapaz OU sem ações (FC caído) → auto-passa a vez
    let viraRodada = false;
    const ator = next[atorIdx];
    if ((ator.pa_rest === 0 || ator.status !== 'ativo' || statusTemEfeito(ator, 'sem_acoes')) && ator.atual) {
      const prox = proximoAtivo(next, ator.ordem);
      if (prox) {
        next = next.map((p) => ({ ...p, atual: mesmoParticipante(p, prox) }));
      } else {
      // Sem próximo elegível: era o último da ordem. A rodada vira sozinha
      // no fim (novaRodada abaixo), em vez de largar a batalha sem `atual`.
        viraRodada = true;
      }
    }

    const nomeAcao = tipo === 'magia' ? (magia && magia.nome) : (arma && arma.nome);
    const entry = {
      rodada, ts: Date.now(),
      autor_tipo: ator.tipo, autor_ref_id: ator.ref_id, autor_nome: participantes[atorIdx].nome,
      acao: tipo,                                // 'arma' | 'magia'
      alvo_tipo: alvo.tipo, alvo_ref_id: alvo.ref_id, alvo_nome: alvo.nome,
      arma_nome: nomeAcao,                       // mantém nome do campo p/ retrocompat do render
      coluna, d20,
      resultado: resultado ? resultado.codigo : null,
      resultado_nome: resultado ? resultado.pt : null,
      dano, critico,
      ...(tipo_critico ? {
        d20_critico,
        critico_tipo: tipo_critico,
        critico_arma_tipo: tipo_critico_arma,
        dano_self: danoSelf || undefined,
        critico_resultado: res_critico ? res_critico.codigo : null,
        critico_resultado_nome: res_critico ? res_critico.pt : null,
        critico_q: res_critico ? res_critico.q : null,
        critico_msg: msg_critico || null,
      } : {}),
      ...(tipo === 'magia' ? { magia_key: magia.key, magia_nivel: magia.nivel, custo_karma: k } : {}),
      ...(tecnica ? { tecnica_key: tecnica.key, tecnica_nome: tecnica.nome, tecnica_efeito: tecnica.efeito || null } : {}),
    };
    const novoLog = [...log, entry];

    // Notifica a Central de Mensagens da Mesa via RPC (fire-and-forget).
    // Todos na história (Mestre + Jogadores) recebem via Realtime.
    // Falha de rede não bloqueia o fluxo local.
    if (historia && historia.id) {
      const atorNome = participantes[atorIdx].nome;
      const resultadoNome = resultado ? resultado.pt : null;
      let texto;
      if (tipo === 'magia') {
        texto = `${atorNome} conjurou ${nomeAcao} em ${alvo.nome}`;
        if (resultadoNome) texto += ` → ${resultadoNome}`;
        if (dano > 0)      texto += ` (${dano} de dano)`;
        if (msg_critico)   texto += `. ${msg_critico}`;
      } else {
        texto = `${atorNome} atacou ${alvo.nome} com ${nomeAcao || 'arma'}`;
        if (resultadoNome) texto += ` → ${resultadoNome}`;
        if (dano > 0)      texto += ` (${dano} de dano)`;
        if (msg_critico)   texto += `. ${msg_critico}`;
      }
      supabaseClient.rpc('registrar_evento_mesa', {
        p_historia_id: historia.id,
        p_tipo: tipo === 'magia' ? 'magia' : 'ataque',
        p_texto: texto,
        p_meta: {
          batalha_id:     batalha.id,
          rodada,
          autor_nome:     atorNome,
          alvo_nome:      alvo.nome,
          acao_nome:      nomeAcao,
          coluna,         d20,
          resultado:      resultado ? resultado.codigo : null,
          resultado_q:    resultado ? resultado.q      : null,
          dano,
          critico:        critico || undefined,
          ...(tipo_critico ? {
            d20_critico,
            critico_tipo:          tipo_critico,
            critico_resultado:     res_critico ? res_critico.codigo : null,
            critico_q:             res_critico ? res_critico.q      : null,
            critico_msg:           msg_critico || undefined,
          } : {}),
          ...(tipo === 'magia' ? { magia_key: magia.key, custo_karma: k } : {}),
        },
      }).then(({ error: rpcErr }) => {
        if (rpcErr) console.error('[batalha] registrar_evento_mesa (ataque) falhou:', rpcErr);
      });
    }

    if (viraRodada) { setRolagemSalva(null); novaRodada(next, novoLog, true); return; }
    setRolagemSalva(null);
    persistir({ participantes: next, log: novoLog, rolagem_pendente: null }, () => {
      setParticipantes(next); setLog(novoLog); setAcaoOpen(false);
    });
  };

  // Fase 5d — aplica um teste (Habilidade / Técnica / Resistência).
  // Debita 1 PA do testador (não necessariamente o ator da vez), não aplica
  // dano (efeito é narrativo), e loga em batalha.log com acao='teste'.
  const aplicarTeste = (payload) => {
    // payload comum: { tipo_teste, testador, d20 }
    //   tipo_teste='habilidade'|'tecnica' → { chave, nome, coluna, resultado }
    //   tipo_teste='resistencia'          → { resistencia_tipo, forca_ataque, forca_defesa, alvo_resist, resultado }
    const { tipo_teste, testador } = payload;
    const testIdx = participantes.findIndex((p) => mesmoParticipante(p, testador));
    if (testIdx < 0) return;

    let next = [...participantes];
    // Fazer um teste é uma ação: quebra a concentração de quem testou.
    next = [...quebrarConcentracao(next, next[testIdx].inst_id)];
    // REGRA NOVA (revisão final): técnica modo 'total' é ativação LIVRE — 0
    // PA, marca a flag em vez de debitar. Qualquer outro teste (habilidade,
    // resistência, técnica modo 'teste') segue debitando 1 PA como sempre.
    next[testIdx] = (tipo_teste === 'tecnica' && payload.tecnica)
      ? debitarCustoTecnica(next[testIdx], payload.tecnica.key)
      : { ...next[testIdx], pa_rest: Math.max(0, (next[testIdx].pa_rest || 0) - 1) };

    // Fase 1 das técnicas: aplica o efeito mecânico.
    //   modo 'total' → aplica sempre (não há dado).
    //   modo 'teste' → só no sucesso (o resultado já veio resolvido no payload).
    // Aparece nas DUAS cópias de aplicarTeste porque o Mestre e o Jogador têm
    // handlers separados; a REGRA mora em aplicarEfeitoTecnica, aqui é só a
    // chamada. Ver batalha.jsx:5517 pro precedente de cópia dessincronizada.
    let efeitoTecnicaAplicado = null;
    if (tipo_teste === 'tecnica' && payload.tecnica) {
      const reg = tecnicaEfeitoDe(payload.tecnica.key);
      const passou = payload.sem_dado
        || (payload.resultado && payload.resultado.q >= D20_QUALIDADE_MINIMA[reg && reg.dificuldade]);
      if (reg && passou) {
        // Lista vazia = alvo é o próprio testador ('self').
        const destinos = (payload.alvos_efeito && payload.alvos_efeito.length)
          ? payload.alvos_efeito.slice(0, reg.maxAlvos || payload.alvos_efeito.length)
          : [next[testIdx]];
        const atingidos = [];
        destinos.forEach((destino) => {
          const dIdx = next.findIndex((p) => mesmoParticipante(p, destino));
          if (dIdx < 0) return;
          next[dIdx] = aplicarEfeitoTecnica(next[dIdx], payload.tecnica, payload.valor_total);
          atingidos.push(next[dIdx].nome);
        });
        // O uso Único é do ATOR, mesmo quando o efeito cai só nos outros.
        next[testIdx] = marcarTecnicaUsada(next[testIdx], payload.tecnica.key);
        if (atingidos.length) {
          efeitoTecnicaAplicado = {
            key: payload.tecnica.key, valor: payload.valor_total, alvos: atingidos,
          };
        }
      }
    }

    // Se quem testou era o ator da vez e ficou sem PA → passa a vez.
    let viraRodada = false;
    const t = next[testIdx];
    if (t.atual && t.pa_rest === 0) {
      const prox = proximoAtivo(next, t.ordem);
      if (prox) {
        next = next.map((p) => ({ ...p, atual: mesmoParticipante(p, prox) }));
      } else {
      // Sem próximo elegível: era o último da ordem. A rodada vira sozinha
      // no fim (novaRodada abaixo), em vez de largar a batalha sem `atual`.
        viraRodada = true;
      }
    }

    const base = {
      rodada, ts: Date.now(),
      autor_tipo: t.tipo, autor_ref_id: t.ref_id, autor_nome: testador.nome,
      acao: 'teste', tipo_teste,
      d20: payload.d20,
    };
    let entry;
    if (tipo_teste === 'resistencia') {
      entry = {
        ...base,
        resistencia_tipo: payload.resistencia_tipo,    // 'rf' | 'rm'
        forca_ataque:     payload.forca_ataque,
        forca_defesa:     payload.forca_defesa,
        alvo_resist:      payload.alvo_resist,
        resultado:        payload.resultado,           // 'resistiu' | 'falhou' | 'empate'
      };
    } else {
      entry = {
        ...base,
        chave: payload.chave, nome: payload.nome,
        coluna: payload.coluna,
        resultado:      payload.resultado ? payload.resultado.codigo : null,
        resultado_nome: payload.resultado ? payload.resultado.pt     : null,
        critico:       !!(payload.resultado && payload.resultado.critico),
        tecnica_efeito_aplicado: efeitoTecnicaAplicado,
      };
    }

    const novoLog = [...log, entry];

    // Notifica a Central de Mensagens da Mesa (fire-and-forget).
    if (historia && historia.id) {
      let texto, tipoEvento;
      if (tipo_teste === 'resistencia') {
        tipoEvento = 'teste';
        const resLabel = payload.resultado === 'resistiu' ? 'Resistiu'
          : payload.resultado === 'falhou' ? 'Não resistiu' : 'Empate — role de novo';
        texto = `${testador.nome} testou resistência (${(payload.resistencia_tipo || '').toUpperCase()}) → ${resLabel} (d20 ${payload.d20})`;
      } else {
        tipoEvento = 'teste';
        const resNome = payload.resultado ? payload.resultado.pt : null;
        texto = `${testador.nome} usou ${payload.nome || payload.chave}`;
        if (resNome) texto += ` → ${resNome}`;
        // Técnica modo 'total' não rola d20 (payload.d20 fica null) — omite o
        // trecho do dado pra não virar "d20 null" na Central de Mensagens.
        // Duplicado no handler do Jogador logo abaixo; mantenha os dois iguais.
        texto += payload.d20 == null ? ` (col ${payload.coluna})` : ` (col ${payload.coluna}, d20 ${payload.d20})`;
        // Lacuna relatada em mesa: sem isto a mensagem só dizia o resultado do
        // dado, e "Falha Crítica" ficava indistinguível de "sem automação" —
        // ver textoEfeitoTecnica. Duplicado no handler do Jogador; mantenha
        // os dois iguais.
        if (tipo_teste === 'tecnica' && payload.tecnica) {
          texto += textoEfeitoTecnica(payload.tecnica.key, efeitoTecnicaAplicado, testador.nome);
        }
      }
      supabaseClient.rpc('registrar_evento_mesa', {
        p_historia_id: historia.id,
        p_tipo: tipoEvento,
        p_texto: texto,
        p_meta: {
          batalha_id: batalha.id,
          rodada,
          testador_nome: testador.nome,
          tipo_teste,
          d20: payload.d20,
          ...(tipo_teste === 'resistencia' ? {
            resistencia_tipo: payload.resistencia_tipo,
            forca_ataque:     payload.forca_ataque,
            forca_defesa:     payload.forca_defesa,
            resultado:        payload.resultado,
          } : {
            chave:          payload.chave,
            nome:           payload.nome,
            coluna:         payload.coluna,
            resultado:      payload.resultado ? payload.resultado.codigo : null,
            resultado_q:    payload.resultado ? payload.resultado.q      : null,
          }),
        },
      }).then(({ error: rpcErr }) => {
        if (rpcErr) console.error('[batalha] registrar_evento_mesa (teste) falhou:', rpcErr);
      });
    }

    if (viraRodada) { setRolagemSalva(null); novaRodada(next, novoLog, true); return; }
    setRolagemSalva(null);
    persistir({ participantes: next, log: novoLog, rolagem_pendente: null }, () => {
      setParticipantes(next); setLog(novoLog); setAcaoOpen(false);
    });
  };

  // Fase 7 — usar um item consumível do inventário do PJ em combate.
  // Debita 1 PA do ator (mesmo padrão de aplicarTeste), aplica o efeito do
  // item (efeito_positivo/efeito_negativo do catálogo) no SNAPSHOT do
  // participante via aplicarEfeitoItemSnapshot, loga em batalha.log com
  // acao='item' (tipo já previsto no schema), e — diferente de
  // aplicarAcao/aplicarTeste — CONSOME o item de verdade: escreve a baixa
  // de quantidade direto em personagens.inventario (mesmo padrão de
  // escrita otimista que inventario.jsx usa pro autosave, sem RPC).
  const aplicarItem = (payload) => {
    // payload: { ator, instanceId, slug, nome, quantidade }
    const { ator, instanceId, slug, nome, quantidade } = payload;
    const atorIdx = participantes.findIndex((p) => mesmoParticipante(p, ator));
    if (atorIdx < 0) return;
    const cat = (catalogos && catalogos.catalogoBySlug) ? catalogos.catalogoBySlug[slug] : null;
    const qtd = Math.max(1, Number(quantidade) || 1);

    let next = [...participantes];
    // Usar item é uma ação: quebra a concentração de quem usou.
    next = [...quebrarConcentracao(next, next[atorIdx].inst_id)];
    // Aplica o efeito (se houver) no snapshot do ator.
    next[atorIdx] = aplicarEfeitoItemSnapshot(next[atorIdx], cat, qtd);
    // Debita 1 PA (mesmo custo de qualquer ação do turno).
    next[atorIdx] = { ...next[atorIdx], pa_rest: Math.max(0, (next[atorIdx].pa_rest || 0) - 1) };

    // PA zerado OU ator incapacitado pelo próprio item (efeito negativo
    // derrubou/matou) → auto-passa a vez (mesmo comportamento do lado do
    // jogador, autoPassarSeNecessario).
    let viraRodada = false;
    const atorSnap = next[atorIdx];
    // `sem_acoes` entra aqui igual em aplicarAcao/aplicarApoio — era a única
    // das três que não checava, e um FC "caído por N rodadas" que usasse item
    // ficava com a vez presa.
    if (atorSnap.atual && (atorSnap.pa_rest === 0 || atorSnap.status !== 'ativo'
                           || statusTemEfeito(atorSnap, 'sem_acoes'))) {
      const prox = proximoAtivo(next, atorSnap.ordem);
      if (prox) {
        next = next.map((p) => ({ ...p, atual: mesmoParticipante(p, prox) }));
      } else {
      // Sem próximo elegível: era o último da ordem. A rodada vira sozinha
      // no fim (novaRodada abaixo), em vez de largar a batalha sem `atual`.
        viraRodada = true;
      }
    }

    const entry = {
      rodada, ts: Date.now(),
      autor_tipo: atorSnap.tipo, autor_ref_id: atorSnap.ref_id, autor_nome: atorSnap.nome,
      acao: 'item',
      item_slug: slug, item_nome: nome, quantidade: qtd,
      efeito_positivo: cat ? (cat.efeito_positivo || null) : null,
      efeito_negativo: cat ? (cat.efeito_negativo || null) : null,
    };
    const novoLog = [...log, entry];

    // Notifica a Central de Mensagens da Mesa (fire-and-forget — mesmo padrão das demais ações).
    if (historia && historia.id) {
      const texto = `${atorSnap.nome} usou ${nome}`;
      supabaseClient.rpc('registrar_evento_mesa', {
        p_historia_id: historia.id,
        p_tipo: 'item',
        p_texto: texto,
        p_meta: { batalha_id: batalha.id, rodada, autor_nome: atorSnap.nome, item_nome: nome, quantidade: qtd },
      }).then(({ error: rpcErr }) => {
        if (rpcErr) console.error('[batalha] registrar_evento_mesa (item) falhou:', rpcErr);
      });
    }

    // Consumo real: baixa a quantidade no inventário do PJ (tabela personagens),
    // escrita otimista direta do client — mesmo padrão do autosave que
    // 07-inventario/inventario.jsx já usa pra usarItem() fora de combate.
    // Só pra ator.tipo==='pj' (criaturas não têm inventário consumível aqui).
    // SÓ o inventário vai pra ficha agora. Condição e vitalidade alteradas em
    // combate ficam no snapshot e só chegam na ficha no ENCERRAMENTO (decisão
    // do usuário, 01/09/2026: "os status alterados em combate só são levados
    // para a ficha após o combate"), o que reverte o write-through de
    // condições que existia aqui desde 06/07/2026.
    //
    // O inventário é exceção consciente: o item saiu da mochila de fato, não é
    // status. Adiar isso exigiria carregar o consumo no snapshot até o fim e
    // ainda deixaria a bolsa mentindo durante toda a batalha.
    if (ator.tipo === 'pj') {
      consumirItemDoPJ(ator.ref_id, slug, qtd).then((r) => {
        if (!r.ok) { console.error('[batalha] consumo de item falhou:', r.error); return; }
        // Reflete no cache local pra lista do AcaoPanel não esperar refetch.
        const cache = catalogos && catalogos.pjById && catalogos.pjById[ator.ref_id];
        if (cache) catalogos.pjById[ator.ref_id] = { ...cache, inventario: r.inventario };
      });
    }

    if (viraRodada) { setRolagemSalva(null); novaRodada(next, novoLog, true); return; }
    setRolagemSalva(null);
    persistir({ participantes: next, log: novoLog, rolagem_pendente: null }, () => {
      setParticipantes(next); setLog(novoLog); setAcaoOpen(false);
    });
  };

  // Fase 5e (01/09/2026) — aplica uma magia de APOIO (buff/debuff de
  // velocidade). Debita 1 PA e o karma do conjurador, aplica o efeito no alvo
  // (se ele não resistiu) e loga. Diferente de aplicarAcao: não há dano nem
  // cascata, e o dado só entra quando a magia exige teste de resistência.
  const aplicarApoio = (payload) => {
    const { ator, alvo, magia, custo_karma, resistencia, d20, resistiu } = payload;
    const atorIdx = participantes.findIndex((p) => mesmoParticipante(p, ator));
    const alvoIdx = participantes.findIndex((p) => mesmoParticipante(p, alvo));
    if (atorIdx < 0 || alvoIdx < 0) return;

    // Lançar uma magia é uma ação: derruba qualquer concentração ANTERIOR
    // deste conjurador antes de aplicar a nova. Ninguém sustenta duas.
    let next = [...quebrarConcentracao(participantes, participantes[atorIdx].inst_id)];

    const k = Math.max(0, custo_karma || 0);
    next[atorIdx] = {
      ...next[atorIdx],
      pa_rest: Math.max(0, (next[atorIdx].pa_rest || 0) - 1),
      karma:   Math.max(0, (next[atorIdx].karma   || 0) - k),
    };
    if (!resistiu) {
      next[alvoIdx] = aplicarEfeitoApoio(next[alvoIdx], magia, next[atorIdx].inst_id);
    }

    const entry = {
      rodada, ts: Date.now(),
      autor_tipo: ator.tipo, autor_ref_id: ator.ref_id, autor_nome: participantes[atorIdx].nome,
      acao: 'apoio',
      alvo_tipo: alvo.tipo, alvo_ref_id: alvo.ref_id, alvo_nome: alvo.nome,
      magia_key: magia.key, magia_nivel: magia.nivel, arma_nome: magia.nome,
      mod_vb: magia.mod_vb, rodadas: magia.rodadas,
      concentracao: !!magia.concentracao,
      custo_karma: k,
      ...(resistencia ? { resistencia, d20, resistiu: !!resistiu } : {}),
    };
    const novoLog = [...log, entry];

    if (historia && historia.id) {
      const sinal = magia.mod_vb > 0 ? '+' : '';
      const nomeAtor = participantes[atorIdx].nome;
      const texto = resistiu
        ? `${nomeAtor} lançou ${magia.nome} em ${alvo.nome} — resistiu`
        : `${nomeAtor} lançou ${magia.nome} em ${alvo.nome} (${sinal}${magia.mod_vb} de velocidade)`;
      supabaseClient.rpc('registrar_evento_mesa', {
        p_historia_id: historia.id,
        p_tipo: 'magia',
        p_texto: texto,
        p_meta: { batalha_id: batalha.id, ...entry },
      }).then(({ error: rpcErr }) => {
        if (rpcErr) console.error('[batalha] registrar_evento_mesa (apoio) falhou:', rpcErr);
      });
    }

    // Mesma regra de fim de turno das outras ações.
    let viraRodada = false;
    const a = next[atorIdx];
    if ((a.pa_rest === 0 || a.status !== 'ativo' || statusTemEfeito(a, 'sem_acoes')) && a.atual) {
      const prox = proximoAtivo(next, a.ordem);
      if (prox) next = next.map((q) => ({ ...q, atual: mesmoParticipante(q, prox) }));
      else viraRodada = true;
    }
    if (viraRodada) { setRolagemSalva(null); novaRodada(next, novoLog, true); return; }
    setRolagemSalva(null);
    persistir({ participantes: next, log: novoLog, rolagem_pendente: null }, () => {
      setParticipantes(next); setLog(novoLog); setAcaoOpen(false);
    });
  };

  const mudarStatus = (idx, novo) => {
    const alvo = participantes[idx];
    // Reativar não tem consequência nenhuma além do próprio status: não
    // devolve concentração e não toma a vez de quem está agindo.
    if (novo === 'ativo' || !alvo) {
      const next = participantes.map((p, i) => (i === idx ? { ...p, status: novo } : p));
      persistir({ participantes: next }, () => setParticipantes(next));
      return;
    }
    // Desmaiar, morrer ou desistir: status + concentração + vez, na mesma
    // regra que o Jogador usa em handleDesistir (saidaDeCombate).
    const { participantes: next, viraRodada } = saidaDeCombate(participantes, alvo, novo);
    if (viraRodada) { novaRodada(next); return; }          // era o último → vira a rodada
    persistir({ participantes: next }, () => setParticipantes(next));
  };

  /* Virada consolidada (Fase 1.2): dano por rodada morde → decrementa status
     → reordena por iniciativa efetiva → escolhe o primeiro elegível.
     MESMA função usada pelo handlePassar do Jogador quando a rodada vira.

     `base`/`logBase` existem porque a virada deixou de ser só do botão "Nova
     Rodada" (30/08/2026): todo caminho que termina o turno do ÚLTIMO da ordem
     — atacar, testar, usar item, morrer, mudar de status — cai aqui com o
     estado que ele acabou de montar, em vez de zerar o `atual` de todos e
     deixar a batalha parada esperando um clique. */
  const novaRodada = (base, logBase, limpaRolagem) => {
    const { participantes: next, eventos } = montarNovaRodada(base || participantes);
    const novaR = rodada + 1;
    // Mesmo texto de virada que o Jogador escreve (entradaLogViradaRodada) —
    // era copiado aqui e lá, e passou a ser um só quando os quatro handle* do
    // Jogador também precisaram dele.
    const entradaVirada = entradaLogViradaRodada(eventos, novaR);
    let novoLog = logBase || log;
    if (entradaVirada) {
      novoLog = [...novoLog, entradaVirada];
      if (historia && historia.id) {
        supabaseClient.rpc('registrar_evento_mesa', {
          p_historia_id: historia.id,
          p_tipo: 'sistema',
          p_texto: `Rodada ${novaR}: ${entradaVirada.texto}`,
          p_meta: { batalha_id: batalha.id, rodada: novaR, dano_por_rodada: eventos },
        }).then(({ error: rpcErr }) => {
          if (rpcErr) console.error('[batalha] registrar_evento_mesa (rodada) falhou:', rpcErr);
        });
      }
    }
    persistir({ participantes: next, log: novoLog, rodada: novaR,
                ...(limpaRolagem ? { rolagem_pendente: null } : {}) }, () => {
      setParticipantes(next); setLog(novoLog); setRodada(novaR);
      // Fecha o painel de Ação SEMPRE que a rodada vira — aqui, e não em cada
      // chamador. aplicarAcao/aplicarTeste/aplicarItem só fechavam o painel no
      // callback do persistir do caminho normal; quando a ação virava a rodada
      // (`if (viraRodada) { ...; novaRodada(...); return; }`) o return pulava
      // esse fechamento e o painel ficava montado. Como o menu do token é uma
      // render-prop, o React preservava a instância do AcaoPanel COM o d20 já
      // rolado: matar o último oponente com o último PA deixava o painel preso
      // exibindo "Sem alvos válidos." junto de "Já rolou — continue em Atacar.",
      // com Atacar desabilitado (sem alvo), abas e header travados pela rolagem
      // pendente e o X do menu escondido por menuTravado — softlock só resolvido
      // recarregando a página. Rodada nova = ator novo e PA novo: nenhum painel
      // aberto na rodada anterior continua válido.
      setAcaoOpen(false);
    });
  };

  const passarVez = () => {
    if (!current) return;
    const prox = proximoAtivo(participantes, current.ordem);
    if (prox) {
      const next = participantes.map((p) => ({ ...p, atual: mesmoParticipante(p, prox) }));
      persistir({ participantes: next }, () => setParticipantes(next));
    } else {
      novaRodada();                                        // deu a volta → nova rodada
    }
  };

  // Fase 6 — Abrir o painel inline de encerrar (3 opções: cancelar / restaurar / sequelas).
  const encerrarBatalha = () => {
    setEncerrarOpen(true);
  };

  // Sobe os botões de ação da BATALHA (Nova Rodada/Encerrar, ou Iniciar) pro
  // slot de ações do HEADER da página via onHeaderActionsChange — não mais um
  // footer fixo na base da tela. "Voltar" saiu da fileira: a seta do header
  // (sempre onClose, ver BatalhasHistoriaView) cobre essa ação agora, mesmo
  // durante a condução. Fica aqui, depois de todas as funções que referencia.
  //
  // Ação e Passar NÃO estão aqui (30/08/2026): agem sobre UM participante — o
  // da vez — e por isso moraram no menu do avatar dele, junto de dano, cura e
  // estado. No header ficavam órfãs de dono, longe do lutador que afetavam.
  // Nova Rodada e Encerrar continuam no topo: são da batalha inteira.
  useEffect(() => {
    if (!onHeaderActionsChange) return;
    if (estado === 'setup') {
      onHeaderActionsChange(
        <button type="button" className="btn-primary btn-sm"
          disabled={iniciando || participantes.length === 0}
          onClick={iniciar}>
          <i className="ti ti-swords" aria-hidden="true" />
          {iniciando ? (tb.iniciando) : (tb.iniciar)}
        </button>
      );
      return;
    }
    if (estado === 'encerrada') {
      // Nada sobra na fileira (só tinha Voltar, que a seta do header já cobre).
      onHeaderActionsChange(null);
      return;
    }
    onHeaderActionsChange(
      <>
        <button type="button" className="btn-icon btn-ghost btn-sm" disabled={salvando || rolagemPendente} onClick={novaRodada}
          onMouseEnter={(e) => abrirTip(e, tb.novaRodada)} onMouseLeave={fecharTip}>
          <i className="ti ti-refresh" aria-hidden="true" />
        </button>
        <button type="button" className="btn-danger btn-sm" disabled={salvando || rolagemPendente} onClick={encerrarBatalha}
          onMouseEnter={(e) => rolagemPendente && abrirTip(e, tb.concluaARolagemPendente)}
          onMouseLeave={fecharTip}>
          {tb.encerrar}
        </button>
      </>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, acaoOpen, salvando, current, catalogos, participantes, iniciando, isEn, rolagemPendente]);

  // Encerra a batalha: leva o estado final pra ficha de cada PJ, limpa o
  // personagens_pools da história e arquiva o log pela RPC.
  //
  // NÃO EXISTE MODO (decisão do usuário, 01/09/2026): "em combate nunca vamos
  // sair restaurando — o que ficar em combate vai prevalecer SEMPRE". Antes
  // havia dois caminhos, "Encerrar com sequelas" e "Restaurar e encerrar";
  // o segundo devolvia os PJs às pools cheias e era até o botão primário do
  // painel. Ficou um só: o combate é a verdade, e a ficha recebe o que saiu
  // dele.
  //
  // Vale pras DUAS famílias de valor, que moram em lugares diferentes:
  //   • eh/ef/ar/karma → estado_atual.vitalidade
  //   • as 8 condicoes (Saúde/Sono/Hidratação/...) → estado_atual.condicoes
  // Nenhuma das duas passa por historias.personagens_pools, que é legado e
  // por isso é LIMPO no passo 1 — mantê-lo preenchido faria montarSnapshots
  // preferi-lo a estado_atual e ignorar edição feita na ficha.
  //
  // O que é gravado por participante sai de estadoAoEncerrar (puro), que
  // também barra PJ ausente e snapshot legado sem condições.
  const finalizarEncerramento = async () => {
    setSalvando(true); setError(null);

    const pjsDaBatalha = participantes.filter((p) => p.tipo === 'pj');

    // 0) Condições + Vitalidade. Persiste TANTO condicoes (Saúde/Sono/etc.)
    // QUANTO vitalidade (EF/EH/AR/Karma) em estado_atual, que é o que a ficha
    // lê. Reads+writes em paralelo: cada PJ é linha independente.
    if (pjsDaBatalha.length > 0) {
      const resultados = await Promise.all(pjsDaBatalha.map(async (p) => {
        const { data: pjRow, error: pjErr } = await supabaseClient
          .from('personagens').select('estado_atual').eq('id', p.ref_id).maybeSingle();
        if (pjErr) return { ok: false, error: pjErr };
        const estadoAtual = (pjRow && pjRow.estado_atual) || {};

        // Volta do combate pra ficha — ver estadoAoEncerrar. null = este
        // participante não deve escrever nada (PJ ausente/não carregado).
        const novoEstado = estadoAoEncerrar(estadoAtual, p);
        if (!novoEstado) return { ok: true };
        const { error: condErr } = await supabaseClient
          .from('personagens').update({ estado_atual: novoEstado }).eq('id', p.ref_id);
        if (condErr) return { ok: false, error: condErr };
        return { ok: true };
      }));
      const falha = resultados.find((r) => !r.ok);
      if (falha) { setSalvando(false); setError(falha.error.message); return; }
    }

    // 1) Lê personagens_pools atual da história (fresh).
    if (historia && historia.id) {
      const { data: histRow, error: histErr } = await supabaseClient
        .from('historias').select('personagens_pools').eq('id', historia.id).maybeSingle();
      if (histErr) { setSalvando(false); setError(histErr.message); return; }
      const poolsAtual = (histRow && histRow.personagens_pools) || {};
      const novoPools  = { ...poolsAtual };

      // 2) Para cada PJ da batalha, LIMPA o pool da história.
      // estado_atual.vitalidade (gravado no step 0) é a fonte canônica
      // de EF/EH/AR/Karma. Manter o pool preenchido fazia montarSnapshots
      // ignorar edições manuais na ficha (pool tem prioridade sobre
      // estado_atual no fallback de montarSnapshots). Ao limpar, a próxima
      // batalha lê direto de estado_atual — que reflete a ficha editada.
      pjsDaBatalha.forEach((p) => {
        delete novoPools[p.ref_id];
      });

      // 3) Grava no banco.
      const { error: upErr } = await supabaseClient
        .from('historias').update({ personagens_pools: novoPools }).eq('id', historia.id);
      if (upErr) { setSalvando(false); setError(upErr.message); return; }
    }

    // 4) Arquiva o log da batalha + deleta a linha (RPC 010).
    const { data, error: err } = await supabaseClient
      .rpc('encerrar_batalha', { p_batalha_id: batalha.id });
    setSalvando(false);
    if (err) { setError(err.message); return; }
    if (data && data.ok === false) {
      const motivo = data.motivo || 'erro_desconhecido';
      setError(interpolate(tb.falhaMotivo, { motivo }));
      return;
    }
    onAtualizado && onAtualizado();
    onVoltar && onVoltar();
  };


  // Barra de pool do card: EF / EH / AR / KA. Cada uma tem cor de categoria
  // própria, vinda do CSS (.pool-ef i, .pool-eh i, …), então aqui só entra a
  // largura.
  //
  // As opções `corDinamica` (cor por sinal do valor) e `min` (piso negativo
  // da faixa) existiam só para as 8 CONDIÇÕES, que saíram do card em
  // 01/09/2026 — saíram junto. A condição continua com faixa bidirecional e
  // cor por sinal na Ficha, que é quem a exibe agora (11-ficha/ficha.jsx,
  // corCondicao/corTemperatura/corSobriedade).
  //
  // opts: { key, title, icon, onEditar } — todos opcionais. `icon` substitui o
  // texto do label por um ícone tabler; `title` vira tooltip; `key` é
  // repassada pro React quando poolBar é chamado dentro de um .map();
  // `onEditar`, quando existe, transforma a barra num BOTÃO que abre o editor
  // daquela pool — é como o Mestre passou a ajustar EF/EH/AR/KA desde que os
  // botões coração saíram (01/09/2026). Sem ele a barra é só leitura, que é o
  // caso do card do Jogador.
  const poolBar = (label, v, max, opts) => {
    const { key, title, icon, onEditar } = opts || {};
    const pct = max > 0 ? Math.max(0, Math.min(100, (v / max) * 100)) : 0;
    const conteudo = (
      <>
        <span className="batalha-pool-label">{icon || label}</span>
        <span className="batalha-pool-bar">
          <i style={{ width: pct + '%' }} />
        </span>
      </>
    );
    const classe = 'batalha-pool pool-' + label.toLowerCase() + (onEditar ? ' editavel' : '');
    if (onEditar) {
      return (
        /* Fecha o tooltip ANTES de abrir o editor: a barra fecha o card
           junto, some da tela com o balão aberto, e aí o mouseleave nunca
           chega nela — o "EF — editar" ficava flutuando sobre o modal.
           Mesmo caso do BotaoAcaoMenu. */
        <button key={key} type="button" className={classe}
          onClick={(e) => { fecharTip(); onEditar(e); }}
          aria-label={title || label}
          onMouseEnter={(e) => title && abrirTip(e, title)} onMouseLeave={fecharTip}>
          {conteudo}
        </button>
      );
    }
    return (
      <div key={key} className={classe}
        onMouseEnter={(e) => title && abrirTip(e, title)} onMouseLeave={fecharTip}>
        {conteudo}
      </div>
    );
  };

  // ── SETUP ──
  if (estado === 'setup') {
    return (
      <div className="batalha-conduzir">
        <p className="batalha-setup-intro">
          {tb.tudoProntoParaO}
        </p>
        <ul className="batalha-part-list">
          {participantes.map((p, i) => (
            <li key={i} className="batalha-part-row">
              <span className="batalha-part-nome">{p.nome}</span>
            </li>
          ))}
        </ul>
        {/* Tabuleiro em modo POSICIONAMENTO: sem PA nem movimento, só
            colocar cada token onde vai começar. As posições vão pro
            participante cru e o iniciar() as herda no snapshot. */}
        <TabuleiroBatalha
          entradas={participantes.map((p, i) => ({ p, i }))}
          meta={metaTokens}
          podeSelecionar={() => !salvando}
          alcanceDe={() => null}
          onMover={posicionarNoSetup}
          salvando={salvando}
          isEn={isEn}
          tb={tb}
          abrirTip={abrirTip}
          fecharTip={fecharTip}
        />
        {error && <div className="err-msg" style={{ marginTop: 10 }}>{error}</div>}
        {/* Botão "Iniciar batalha" é renderizado no slot de ações do HEADER
            da página (via onHeaderActionsChange, junto do mesmo padrão usado
            nos estados ativa/encerrada) — não duplicar aqui no corpo. Voltar
            não tem mais botão próprio: a seta do header cobre. */}
      </div>
    );
  }

  // ── ATIVA / ENCERRADA ──
  return (
    <>
    <div className="batalha-conduzir">
      {/* Barra de Rodada/Vez/Encerrada removida: o card do lutador atual já
          fica evidenciado visualmente (borda dourada) quando é a vez dele. */}

      {/* Fase 6 — Painel inline ao clicar Encerrar: 3 opções (cancelar / restaurar / sequelas) */}
      {estado === 'ativa' && encerrarOpen && (() => {
        const vivos = participantes.filter((p) => p.tipo === 'pj' && p.status !== 'morto');
        const mortos = participantes.filter((p) => p.tipo === 'pj' && p.status === 'morto');
        const feridos = vivos.filter((p) =>
          (p.ef || 0) < (p.ef_max || 0) ||
          (p.eh || 0) < (p.eh_max || 0) ||
          (p.ar || 0) < (p.ar_max || 0) ||
          (p.karma || 0) < (p.karma_max || 0)
        );
        return (
          <div className="batalha-encerrar-painel">
            <div className="batalha-encerrar-aviso">
              {tb.encerrarArquivaOLog}
            </div>
            <div className="batalha-encerrar-resumo">
              {feridos.length > 0 && (
                <span>
                  {feridos.length}{' '}{tb.feridoS}
                </span>
              )}
              {mortos.length > 0 && (
                <span className="mortos">
                  {' · '}{mortos.length}{' '}{tb.mortoS}{' '}
                  ({tb.persistemComEf0})
                </span>
              )}
              {feridos.length === 0 && mortos.length === 0 && (
                <span>{tb.todosOsPjsNo}</span>
              )}
            </div>
            {/* Um caminho só: encerrar leva o estado do combate pra ficha.
                O "Restaurar e encerrar" saiu em 01/09/2026 — ver o comentário
                de finalizarEncerramento. */}
            <div className="batalha-encerrar-acoes">
              <button className="btn-ghost btn-sm" onClick={() => setEncerrarOpen(false)} disabled={salvando}>
                {tb.cancelar}
              </button>
              <button className="btn-primary btn-sm" onClick={() => finalizarEncerramento()} disabled={salvando}
                onMouseEnter={(e) => abrirTip(e, tb.pjsFeridosMantemAs)}
                onMouseLeave={fecharTip}>
                {tb.encerrar}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Tabuleiro em modo COMBATE: só quem está na vez se move, o halo
          mostra as células que ainda restam, e cada movimento cobra 1 PA.
          Encerrada continua exibindo o grid, mas sem permitir mover.

          Os cards do roster saíram (30/08/2026): tudo o que ficava neles —
          status, chips, stats, dano/cura/estado e as pools — mora agora no
          menu que abre ao clicar no avatar do token. O painel de Ação (arma,
          habilidade, técnica, resistência, item) também mora nele desde
          30/08/2026 — clicar em "Ação" TROCA o conteúdo do menu pelo painel,
          em vez de abrir uma segunda área no corpo da página. Por isso
          `menuDe` continua ativo com `acaoOpen`; só motor e encerramento,
          que são telas de batalha inteira, ainda o escondem.

          `podeSelecionar` exige `p.atual`: tem que ser a MESMA condição de
          moverNoTabuleiro (que recusa com `!p.atual`) e de alcanceDe (só o da
          vez ganha halo). Quando era só `estado === 'ativa'`, o menu oferecia
          "Mover" para todo participante, fechava, não desenhava halo nenhum e
          o clique na grade era recusado com a mensagem fora da tela — parecia
          que o tabuleiro simplesmente não movia ninguém. */}
      <TabuleiroBatalha
        entradas={participantes.map((p, i) => ({ p, i }))}
        meta={metaTokens}
        podeSelecionar={(p) => !salvando && estado === 'ativa' && !!p.atual && !p.moveu_na_rodada}
        alcanceDe={(p) => (estado === 'ativa' && p.atual
          ? (Number.isFinite(p.mov_rest) ? p.mov_rest : movimentoBase(p.vb))
          : null)}
        onMover={estado === 'ativa' ? moverNoTabuleiro : undefined}
        salvando={salvando}
        isEn={isEn}
        tb={tb}
        abrirTip={abrirTip}
        fecharTip={fecharTip}
        aviso={error}
        menuTravado={rolagemPendente}
        /* O X volta pras ações iniciais em vez de fechar o card, quando é o
           painel de Ação que está na tela. A condição é a MESMA do menuDe
           logo abaixo — se divergirem, o X ou fecha quando devia voltar, ou
           volta pra um painel que não está aberto. */
        menuVoltar={(p) => (estado === 'ativa' && acaoOpen && p.atual && catalogos)
          ? () => setAcaoOpen(false) : null}
        menuDe={(motorAberto || encerrarOpen) ? undefined : (p, i, fechar, mover) => {
          const fkey = p.inst_id || (p.tipo + ':' + p.ref_id + ':' + i);
          // Painel de Ação: ocupa o menu inteiro de quem está agindo. Só faz
          // sentido para o lutador da vez — é dele o PA que a ação gasta.
          if (estado === 'ativa' && acaoOpen && p.atual && catalogos) {
            return (
              <AcaoPanel
                ator={p}
                participantes={participantes}
                catalogos={catalogos}
                lang={lang}
                onAplicar={aplicarAcao}
                onAplicarTeste={aplicarTeste}
                onAplicarItem={aplicarItem}
                onAplicarApoio={aplicarApoio}
                onCancel={() => setAcaoOpen(false)}
                onRolagemPendenteChange={setRolagemPendente}
                rolagemSalva={rolagemSalva}
                onRolagemSalvaChange={salvarRolagem}
                abrirTip={abrirTip}
                fecharTip={fecharTip}
              />
            );
          }
          return (
          <div className={'batalha-fighter em-menu status-' + (p.status || 'ativo') + (p.atual && estado === 'ativa' ? ' atual' : '')}>
            <div className="batalha-fighter-main">
              <div className="batalha-fighter-head">
                <div className="batalha-fighter-id no-pointer">
                  <span className={'batalha-fighter-status-ic st-' + (p.status || 'ativo')}
                    onMouseEnter={(e) => abrirTip(e, isEn ? STATUS[p.status || 'ativo'].en : STATUS[p.status || 'ativo'].pt)}
                    onMouseLeave={fecharTip}>
                    <i className={'ti ' + iconeStatus(p.status || 'ativo')} aria-hidden="true" />
                  </span>
                  {/* No menu cabe o nome inteiro — o card cortava no primeiro
                      nome por causa da largura da coluna, restrição que sumiu. */}
                  <span className="batalha-fighter-nome">{p.nome}</span>
                  {p.ausente && <span className="batalha-aviso">{tb.ausente}</span>}
                  {/* Chips de status temporários — clique remove.
                      I2 (revisão final): todos os efeitos de UMA técnica
                      compartilham `id: 'tec_'+key` de propósito (é o que faz
                      a regra de não-acumular funcionar) — Fúria gera 4
                      status com o mesmo id, e a key de React precisa
                      distinguir os chips mesmo assim. NÃO mude `s.id` aqui:
                      só a key da renderização. */}
                  {Array.isArray(p.status_temp) && p.status_temp.map((s) => (
                    <span key={s.id + '_' + (s.efeito ? s.efeito.tipo : '')} className="batalha-status-chip"
                      onClick={(e) => { e.stopPropagation(); if (estado === 'ativa') removerStatusTemp(i, s.id); }}
                      onMouseEnter={(e) => abrirTip(e, `${s.nome} · ${s.rodadas_rest == null ? (tb.ateOFimDa) : `${s.rodadas_rest} ${tb.rodadaSRestantes}`} · ${tb.cliqueParaRemover}`)}
                      onMouseLeave={fecharTip}>
                      {s.icone
                        ? <span className="batalha-status-chip-icone">{s.icone}</span>
                        : <i className="ti ti-bolt batalha-status-chip-icone" aria-hidden="true" />}
                      {s.nome}
                      <span className="batalha-status-chip-rod">{s.rodadas_rest}</span>
                    </span>
                  ))}
                </div>

                {/* Velocidade, ações e defesa ao lado do NOME desde
                    03/09/2026, como ícone + valor. RM e RF saíram: são
                    consultados na hora de um teste de resistência, e a aba
                    Resistência do painel já os traz — na fileira do card
                    ocupavam espaço todo turno pra serem lidos quase nunca.
                    Com só três restando, a fileira separada perdeu a razão
                    de existir e virou esta faixa. O seletor de estado veio
                    junto: ele tem que ficar inline com os stats. */}
                <div className="batalha-fighter-stats">
                  <span className="batalha-stat ic"
                    onMouseEnter={(e) => abrirTip(e, (tb.statNome && tb.statNome.vb) || 'VB')}
                    onMouseLeave={fecharTip}>
                    <i className="ti ti-run-sprint" aria-hidden="true" /><b>{p.vb}</b>
                  </span>
                  <span className="batalha-stat ic so-ic"
                    onMouseEnter={(e) => abrirTip(e, `${(tb.statNome && tb.statNome.pa) || tb.pa} · ${p.pa_rest}/${p.pa_max}`)}
                    onMouseLeave={fecharTip}
                    aria-label={`${(tb.statNome && tb.statNome.pa) || tb.pa}: ${p.pa_rest}/${p.pa_max}`}>
                    <i className={'ti ' + iconePA(p.pa_rest)} aria-hidden="true" />
                  </span>
                  <span className="batalha-stat ic"
                    onMouseEnter={(e) => abrirTip(e, (tb.statNome && tb.statNome.df) || tb.df)}
                    onMouseLeave={fecharTip}>
                    {/* shield-half, não shield: a pool AR logo abaixo já usa
                        o escudo cheio, e dois escudos idênticos no mesmo
                        card não se distinguem de relance. */}
                    <i className="ti ti-shield-half" aria-hidden="true" /><b>{p.defesa_sigla || 'L'}{p.defesa_valor || 0}</b>
                  </span>
                  {/* O seletor de estado mora NESTA linha, junto de VB/PA/DF/
                      RM/RF — é leitura do combatente, como os outros pills,
                      não uma ação de turno. Não vai na fileira de baixo:
                      Mover/Ação/Passar só existem pra quem está na vez, e o
                      estado vale pra qualquer participante. */}
                  {estado === 'ativa' && (
                    <EstadoDrop
                      p={p}
                      isEn={isEn}
                      STATUS={STATUS}
                      onMudar={(k) => mudarStatus(i, k)}
                      abrirTip={abrirTip}
                      fecharTip={fecharTip}
                      onEnvenenar={() => {
                        // Guarda o ÍNDICE (e o nome, pro título): o modal vive
                        // fora do card, então não tem `p` nem `i` no escopo.
                        setVenenoOpen({ idx: i, nome: p.nome });
                        setPoolOpen(null);
                        // Fecha o card: ele tem z-index 9600 e nasceria POR
                        // CIMA do modal, tapando o primeiro campo.
                        fechar();
                      }}
                    />
                  )}
                </div>
                {/* A linha de ações inline (coração de dano, coração de cura e
                    o seletor de estado) saiu em 01/09/2026: o Mestre edita as
                    pools clicando direto na barra, e o seletor de estado
                    desceu pra fileira de ações junto de Mover/Ação/Passar. */}
              </div>

              {/* Mover, Ação e Passar agem sobre quem está na vez, então
                  dividem a fileira. Só Mover e Passar fecham o menu — Mover
                  porque o popover cobre o tabuleiro, Passar porque a vez muda
                  de dono. "Ação" MANTÉM o menu aberto e troca o conteúdo dele
                  pelo painel (ver acima). `mover` vem null quando o
                  participante não pode mover (não é a vez, ou já andou). */}
              {/* A fileira é INTEIRA do turno: Mover, Ação e Passar só existem
                  pra quem está na vez. Por isso a guarda pede `p.atual` —
                  sem ele o <div> nascia pra qualquer participante e, como os
                  três botões dentro já exigiam a vez, sobrava uma faixa VAZIA
                  com border-top e padding: uma segunda linha no card sem nada
                  dentro (03/09/2026).

                  A guarda dupla que existia aqui fazia sentido enquanto o
                  seletor de estado morava nesta fileira — ele vale pra
                  qualquer um, na vez ou não. O seletor subiu pra linha dos
                  stats, e com ele foi embora a razão de o <div> existir fora
                  do turno. O card do Jogador já era guardado assim
                  (ehEu && ehMinhaVez && souAtivo); agora os dois batem. */}
              {estado === 'ativa' && p.atual && (
                <div className="batalha-menu-acoes">
                  {mover && (
                    <BotaoAcaoMenu icone="ti-footsteps" onClick={mover}
                      rotulo={tb.tabMover || (isEn ? 'Move' : 'Mover')}
                      abrirTip={abrirTip} fecharTip={fecharTip} />
                  )}
                  <BotaoAcaoMenu icone="ti-swords" variante="primary" rotulo={tb.acao}
                    disabled={salvando || !catalogos || p.pa_rest <= 0 || rolagemPendente}
                    onClick={() => setAcaoOpen(true)}
                    // Com rolagem pendente o motivo da trava importa mais que
                    // o nome do botão — é o único jeito de o Mestre entender
                    // por que "Ação" está apagado.
                    abrirTip={(e, r) => abrirTip(e, rolagemPendente ? tb.concluaARolagemPendente : r)}
                    fecharTip={fecharTip} />
                  <BotaoAcaoMenu icone="ti-player-skip-forward" rotulo={tb.passar}
                    disabled={salvando || rolagemPendente}
                    onClick={() => { fechar(); passarVez(); }}
                    abrirTip={abrirTip} fecharTip={fecharTip} />
                </div>
              )}

              {/* O Envenenado virou MODAL (01/09/2026) e é renderizado fora do
                  card, no fim da view — dois campos numa faixa inline dentro
                  de um popover que já é estreito ficavam espremidos, e o
                  segundo campo (rodadas) passava despercebido. */}
              {/* O editor de pool também virou MODAL (02/09/2026), renderizado
                  fora do card junto do de Envenenar. A faixa inline que ficava
                  aqui espremia campo, valor atual e dois botões numa linha só
                  dentro de um popover estreito. */}
              {/* Pools sempre abertas: o menu mostra UM participante por vez,
                  então o colapso que o roster tinha perdeu a razão de ser.
                  Com a batalha ativa cada barra é um BOTÃO: clicar abre o
                  editor daquela pool (substituiu os botões coração). */}
              <div className="batalha-fighter-pools-wrap">
                <div className="batalha-pools">
                  {[
                    ['EF', 'ef',    p.ef,    p.ef_max,    'ti-heart'],
                    ['EH', 'eh',    p.eh,    p.eh_max,    'ti-heart'],
                    ['AR', 'ar',    p.ar,    p.ar_max,    'ti-shield'],
                    ['KA', 'karma', p.karma, p.karma_max, 'ti-sparkle-highlight'],
                  ].map(([sigla, campo, valor, maximo, ic]) => poolBar(sigla, valor, maximo, {
                    key: campo,
                    title: estado === 'ativa' ? `${sigla} — ${tb.editar || (isEn ? 'edit' : 'editar')}` : sigla,
                    icon: <i className={'ti ' + ic} aria-hidden="true" />,
                    // Guarda ÍNDICE, nome, sigla e ícone: o editor virou
                    // modal (02/09/2026) e vive fora do card, sem `p` nem
                    // `i` no escopo — mesma razão do Envenenar.
                    onEditar: estado === 'ativa' ? () => {
                      setPoolOpen({ idx: i, pool: campo, sigla, icone: ic,
                                    nome: p.nome, atual: valor ?? 0, max: maximo ?? 0 });
                      setPoolVal(String(valor ?? 0));
                      setVenenoOpen(null);
                      // Fecha o card: z-index 9600, nasceria por cima do modal.
                      fechar();
                    } : undefined,
                  }))}
                </div>
                {/* As 8 CONDIÇÕES (Saúde/Sono/Sobriedade/…) saíram daqui em
                    01/09/2026, a pedido do usuário. Eram duas fileiras de 4
                    barrinhas que dobravam a altura do card e competiam com o
                    que importa em combate — EF/EH/AR/KA, logo acima.
                    Continuam vivas e editáveis na Ficha, que é onde a
                    condição é consultada e alterada; o combate só as carrega
                    no snapshot e as devolve no encerramento.
                    O card do Jogador nunca as mostrou — agora os dois batem. */}
              </div>
            </div>
          </div>
          );
        }}
      />

    </div>
    <PortalTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />

    {/* Envenenar — modal próprio desde 01/09/2026. Fica FORA do card de
        propósito: são dois campos, e o menu do token é estreito demais pra
        eles numa faixa inline (o de rodadas passava despercebido). */}
    {venenoOpen && (
      <ModalShell
        title={<><i className={'ti ' + iconeStatus('envenenado')} aria-hidden="true" /> {tb.envenenado}</>}
        lang={lang}
        size="sm"
        onClose={fecharVeneno}
        onCancel={fecharVeneno}
        onConfirm={() => aplicarVeneno(venenoOpen.idx)}
        confirmLabel={tb.aplicar}
        confirmDisabled={salvando || !venenoVal}
      >
        <p className="subhead">{venenoOpen.nome}</p>
        <div className="batalha-campos-modal">
          <label className="batalha-campo-modal">
            <span>{tb.danoRodada}</span>
            <input type="number" min="1" value={venenoVal} autoFocus
              onChange={(e) => setVenenoVal(e.target.value)} />
          </label>
          <label className="batalha-campo-modal">
            <span>{tb.rodadas}</span>
            <input type="number" min="1" value={venenoRodadas}
              onChange={(e) => setVenenoRodadas(e.target.value)} />
          </label>
        </div>
        {/* O total é a conta que o Mestre fazia de cabeça pra decidir a dose:
            4/rodada por 3 rodadas tira 12 — em alguém com 11 de EF isso é
            letal, e isso não se via em lugar nenhum antes de aplicar. */}
        {(() => {
          const d = Math.max(0, parseInt(venenoVal || '0', 10) || 0);
          const r = Math.max(1, parseInt(venenoRodadas || '1', 10) || 1);
          if (d < 1) return null;
          return (
            <p className="batalha-modal-total">
              <b>{d * r}</b> {tb.venenoTotal} <span>({d} × {r})</span>
            </p>
          );
        })()}
        <p className="batalha-modal-nota">{tb.venenoDireto}</p>
      </ModalShell>
    )}

    {/* Editar EF/EH/AR/KA — modal desde 02/09/2026, a pedido do usuário, no
        mesmo molde do de Envenenar. Qual pool editar já foi dito pelo clique
        na barra, então não há seletor aqui: só o valor, com o atual/máximo
        embaixo pra referência. O clamp de cada pool (EF pode ir a EF_MORTE,
        AR não tem teto) mora em valorPoolEditado, não no input. */}
    {poolOpen && (
      <ModalShell
        /* Nome por extenso, não a sigla: no card a sigla basta porque a
           barra está do lado, aqui o título é o único contexto. Vem da
           mesma tabela que a Ficha usa, pra os dois não divergirem. */
        title={<><i className={'ti ' + poolOpen.icone} aria-hidden="true" />{' '}
          {(tb.poolNome && tb.poolNome[poolOpen.pool]) || poolOpen.sigla}</>}
        lang={lang}
        size="sm"
        onClose={fecharPool}
        onCancel={fecharPool}
        onConfirm={() => aplicarPool(poolOpen.idx, poolOpen.pool)}
        confirmLabel={tb.aplicar}
        confirmDisabled={salvando || poolVal === ''}
      >
        <p className="subhead">{poolOpen.nome}</p>
        <div className="batalha-campos-modal">
          {/* Sem rótulo (03/09/2026, a pedido do usuário): o "valor" que
              ficava aqui não dizia nada que o título já não dissesse — o
              modal inteiro é sobre um número só. O nome da pool vai no
              aria-label pra quem lê a tela não ficar com um campo mudo. */}
          <label className="batalha-campo-modal">
            <input type="number" value={poolVal} autoFocus
              aria-label={(tb.poolNome && tb.poolNome[poolOpen.pool]) || poolOpen.sigla}
              onChange={(e) => setPoolVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') aplicarPool(poolOpen.idx, poolOpen.pool); }} />
          </label>
        </div>
        <PreviaPool poolOpen={poolOpen} bruto={poolVal} tb={tb} />
      </ModalShell>
    )}
    </>
  );
}

/* ── Prévia do efeito, no modal de editar pool ─────────────────────
   O modal pedia um valor ABSOLUTO e não mostrava consequência nenhuma: o
   Mestre lia "Lysandra levou 5", digitava 3 e só descobria o resultado
   depois de aplicar e reabrir o card.

   Duas coisas ficam visíveis aqui, ambas caladas antes:

   • o DELTA (8 → 3, −5). É como o dano chega na mesa, e é a conta que o
     Mestre estava fazendo de cabeça pra preencher um campo absoluto;
   • o CLAMP. valorPoolEditado apara em silêncio — digitar 99 numa EH de 14
     salva 14, e nada avisava. Agora o número que vai ser gravado aparece
     antes do Aplicar. A regra continua sendo dele, aqui só se lê: EF desce
     até EF_MORTE, AR não tem teto, EH/KA ficam em 0..max.

   A barra usa o valor JÁ aparado, senão a prévia mentiria justamente no
   caso em que ela mais serve. */
function PreviaPool({ poolOpen, bruto, tb }) {
  const { pool, atual, max } = poolOpen;
  const salvo = valorPoolEditado({ [pool + '_max']: max }, pool, bruto);
  const delta = salvo - Number(atual || 0);
  const pct = max > 0 ? Math.max(0, Math.min(100, (salvo / max) * 100)) : 0;
  const digitado = parseInt(bruto, 10);
  const aparou = Number.isFinite(digitado) && digitado !== salvo;
  return (
    <div className={'batalha-previa-pool pool-' + pool}>
      <span className="bpp-bar"><i style={{ width: pct + '%' }} /></span>
      <span className="bpp-nums">
        <b>{atual}</b>
        <i className="ti ti-arrow-narrow-right" aria-hidden="true" />
        <b className="bpp-novo">{salvo}</b>
        <em>/{max}</em>
        {delta !== 0 && (
          <span className={'bpp-delta ' + (delta > 0 ? 'sobe' : 'desce')}>
            {delta > 0 ? '+' : ''}{delta}
          </span>
        )}
      </span>
      {aparou && <span className="bpp-aviso">{tb.foraDaFaixa} {salvo}.</span>}
    </div>
  );
}

/* ── Helper de clamp 1..20 ─────────────────────────────────────── */
function _clamp1a20(v) { const n = parseInt(v || '0', 10) || 0; return Math.max(1, Math.min(20, n)); }

/* ============================== DadoD20 — icosaedro SVG (cópia fiel do dado-d20.jsx) ============================== */
/* Keyframes injetados uma vez no <head> — mesmo mecanismo do dado-d20.jsx original */
var _MS_D20_KF =
  ".ms-d20-svg{animation:msD20Float 5.5s ease-in-out infinite;transform-origin:center;will-change:transform}" +
  ".ms-d20-svg.is-rolling{animation:msD20Tumble .76s cubic-bezier(.34,.16,.2,1)}" +
  "@keyframes msD20Float{0%{transform:translateY(0) rotate(-1.5deg)}50%{transform:translateY(-5px) rotate(1.5deg)}100%{transform:translateY(0) rotate(-1.5deg)}}" +
  "@keyframes msD20Tumble{0%{transform:rotate(0) scale(1)}30%{transform:rotate(220deg) scale(1.08)}70%{transform:rotate(560deg) scale(.95)}100%{transform:rotate(720deg) scale(1)}}" +
  ".ms-d20-hit:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(201,164,78,0.6);border-radius:6px}" +
  "@media(prefers-reduced-motion:reduce){.ms-d20-svg,.ms-d20-svg.is-rolling{animation:none!important}}";

function _injetarD20Style() {
  if (document.getElementById('ms-d20-style')) return;
  var el = document.createElement('style');
  el.id = 'ms-d20-style';
  el.textContent = _MS_D20_KF;
  document.head.appendChild(el);
}

/* DadoD20Bat — wrapper local do DadoD20 do dado-d20.jsx.
   Usa window.DadoD20 se disponível (carregado antes); caso contrário renderiza
   o SVG inline idêntico ao original para que batalha.jsx seja auto-suficiente. */
const DadoD20Bat = React.forwardRef(function DadoD20Bat(props, ref) {
  // Prefere o componente global já carregado pelo dado-d20.jsx
  if (window.DadoD20) {
    return React.createElement(window.DadoD20, Object.assign({}, props, { ref }));
  }
  // Fallback inline — cópia fiel do SVG do dado-d20.jsx
  const { size, disabled, onRoll, initialValue = 20, ariaLabel = 'Rolar dado de 20 faces', className = '' } = props;
  const [value, setValue] = useState(initialValue);
  const [rolling, setRolling] = useState(false);
  const rollingRef = useRef(false);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const onRollRef = useRef(onRoll);
  onRollRef.current = onRoll;
  const api = useRef({});

  useEffect(() => { _injetarD20Style(); }, []);
  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current)  clearTimeout(timeoutRef.current);
  }, []);

  api.current.roll = function(forcado) {
    if (rollingRef.current || disabled) return;
    rollingRef.current = true; setRolling(true);
    const reduz = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const assentar = () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      const v = typeof forcado === 'number' ? Math.max(1, Math.min(20, Math.round(forcado))) : 1 + Math.floor(Math.random() * 20);
      setValue(v); setRolling(false); rollingRef.current = false;
      if (onRollRef.current) onRollRef.current(v);
    };
    if (reduz) { timeoutRef.current = setTimeout(assentar, 220); return; }
    intervalRef.current = setInterval(() => setValue(1 + Math.floor(Math.random() * 20)), 55);
    timeoutRef.current = setTimeout(assentar, 760);
  };

  React.useImperativeHandle(ref, () => ({
    roll: (f) => api.current.roll(f),
    isRolling: () => rollingRef.current,
  }), []);

  const crit = value === 1 ? 'fail' : value === 20 ? 'hit' : null;
  const numFill = crit === 'fail' ? '#F0997B' : crit === 'hit' ? '#FBE9B8' : 'var(--foreground, #E8DDC6)';
  const glow = crit === 'hit'
    ? 'drop-shadow(0 10px 18px rgba(233,210,150,0.40))'
    : crit === 'fail'
    ? 'drop-shadow(0 10px 18px rgba(184,71,47,0.38))'
    : 'drop-shadow(0 10px 18px rgba(201,164,78,0.22))';
  const haloBg = crit === 'hit'
    ? 'radial-gradient(circle, rgba(233,210,150,0.45), rgba(201,164,78,0) 70%)'
    : crit === 'fail'
    ? 'radial-gradient(circle, rgba(184,71,47,0.40), rgba(184,71,47,0) 70%)'
    : 'radial-gradient(circle, rgba(201,164,78,0.28), rgba(201,164,78,0) 68%)';
  const dim = typeof size === 'number' ? size + 'px' : (size || 'clamp(96px, 18vw, 150px)');

  return (
    <span className={'menestrel-ui ms-d20 ' + className}
      style={{ width: dim, height: dim }}>
      <button type="button" className="ms-d20-hit"
        onClick={() => api.current.roll()} disabled={disabled} aria-label={ariaLabel}>
        <span aria-hidden="true" className="ms-d20-halo" style={{ background: haloBg }} />
        <svg className={'ms-d20-svg' + (rolling ? ' is-rolling' : '')}
          viewBox="0 0 200 200" width="100%" height="100%" role="img" aria-hidden="true"
          style={{ filter: glow }}>
          <polygon points="100,18 29,59 100,62"   fill="rgba(233,210,150,0.40)" />
          <polygon points="100,18 171,59 100,62"  fill="rgba(201,164,78,0.32)" />
          <polygon points="29,59 29,141 62,130 100,62"    fill="rgba(184,134,46,0.30)" />
          <polygon points="171,59 171,141 138,130 100,62" fill="rgba(184,112,46,0.26)" />
          <polygon points="29,141 100,182 62,130"  fill="rgba(122,94,42,0.32)" />
          <polygon points="171,141 100,182 138,130" fill="rgba(60,44,18,0.36)" />
          <polygon points="100,182 62,130 138,130"  fill="rgba(184,112,46,0.22)" />
          <polygon points="100,62 62,130 138,130"   fill="rgba(40,30,14,0.34)" />
          <polygon points="100,18 60,42 92,44"      fill="rgba(255,248,230,0.22)" />
          <g fill="none" stroke="rgba(233,214,160,0.45)" strokeWidth="0.8" strokeLinejoin="round">
            <polygon points="100,18 171,59 171,141 100,182 29,141 29,59" />
            <path d="M100,18 L100,62 M29,59 L100,62 L171,59 M62,130 L138,130 M100,62 L62,130 M100,62 L138,130 M29,141 L62,130 M171,141 L138,130 M100,182 L62,130 M100,182 L138,130" />
          </g>
          <text x="100" y="104" textAnchor="middle" dominantBaseline="middle"
            fontFamily="'Cinzel', serif" fontWeight="700" fontSize="46"
            stroke="rgba(28,20,7,0.55)" strokeWidth="0.5" paintOrder="stroke"
            style={{ fill: numFill, transition: 'fill .25s' }}>
            {value}
          </text>
        </svg>
      </button>
    </span>
  );
});

/* ============================== DadoOverlay — overlay fiel ao RolagemD20Overlay da ficha ============================== */
/*
   Props:
     titulo       — ex: "Espada Curta → Orc Soldado"
     subtitulo    — ex: "Coluna de Ação: 1" (opcional)
     coluna       — número para resolverAcao (null = modo resistência, sem resolução automática)
     lang
     onFechar()
     onConfirmar({ valor, resultado }) — resultado = objeto resolverAcao ou null
     isCritico / tipoCritico / msgCritico — segundo dado de crítico
*/
function DadoOverlay({ titulo, subtitulo, coluna, alvoResist, semCard, lang, onFechar, onConfirmar, onRolou,
                       isCritico, tipoCritico, msgCritico }) {
  const isEn = lang === 'en';
  const tb = tBat(lang); // i18n-sync (Fase 3.3)
  const [resultado, setResultado] = useState(null);
  const dadoRef = useRef(null);
  const jaRolou = useRef(false);

  // Trava scroll + Escape. Escape só fecha ANTES do dado assentar (resultado
  // ainda null) — depois que existe um resultado, a única saída é
  // "Confirmar". Sem essa trava, dava pra usar Escape como um "rolar de
  // novo" disfarçado: fechar o overlay sem confirmar deixa d20/d20Critico
  // null no AcaoPanel, o que reabilita o botão que abre este mesmo overlay
  // pra um novo sorteio — repetível até sair um número que agrade.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !resultado) onFechar(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onFechar, resultado]);

  // Rola sozinho ao abrir
  useEffect(() => {
    const t = setTimeout(() => {
      if (dadoRef.current && !jaRolou.current) { jaRolou.current = true; dadoRef.current.roll(); }
    }, 260);
    return () => clearTimeout(t);
  }, []);

  function aoRolar(d20) {
    const res = (coluna != null && typeof resolverAcao === 'function')
      ? resolverAcao(coluna, d20)
      : null;
    setResultado({ d20, res });
    // Salva NO ATO (31/08/2026). Antes o valor só subia pro AcaoPanel no
    // Confirmar, e entre o dado assentar e o clique havia uma janela em que
    // `d20` ainda era null: temRolagemPendente era false, nada travava, e
    // sair dali (trocar de token, fechar o menu) descartava a rolagem — dava
    // pra rolar de novo a mesma ação. Reportando aqui, a trava liga no mesmo
    // instante em que o resultado existe.
    if (onRolou) onRolou({ valor: d20, resultado: res });
  }

  // Sem "rolar de novo" aqui de propósito: o dado assenta uma única vez por
  // abertura do overlay (regra "rolou, não rola de novo" — ver
  // dadoPrimarioTravado/dadoCriticoTravado em AcaoPanel, que são quem
  // decide SE este overlay pode reabrir). Botões abaixo ficam só
  // Confirmar (ou Concluir, no caminho sem onConfirmar).

  const corRes = resultado && resultado.res ? resultado.res.cor : 'var(--gold, #C9A44E)';
  const nomeRes = resultado && resultado.res ? (isEn ? resultado.res.en : resultado.res.pt) : null;

  // Linha de detalhe do resultado (dano, miss, crítico)
  let detalheRes = null;
  if (resultado && resultado.res) {
    const r = resultado.res;
    if (r.erra) {
      detalheRes = tb.errou;
    } else {
      detalheRes = `${Math.round(r.dano * 100)}% ${tb.dano2}`;
    }
    if (r.autodano) detalheRes += tb.autoDano;
    if (r.critico)  detalheRes += tb.critico;
  }

  const labelCriticoTipo = isCritico
    ? (tipoCritico === 'alvo'
        ? (tb.criticoNoAlvo)
        : (tb.criticoEmSiMesmo))
    : null;

  /* PORTAL obrigatório (30/08/2026): o AcaoPanel agora vive dentro do
     .batalha-token-menu, que tem `transform: translateX(-50%)`. Um ancestral
     transformado vira o BLOCO CONTENTOR de descendentes `position: fixed` —
     então o `inset: 0` deste backdrop passava a valer para a caixa do modal,
     não para a viewport, e o `overflow: auto` do modal ainda cortava o resto.
     O dado ficava espremido num retângulo de 680px. Saindo por portal para
     .menestrel-ui (mesmo alvo do PortalTooltip), o fixed volta a ser da tela
     inteira. */
  return ReactDOM.createPortal((
    <div
      className="menestrel-ui dado-overlay-backdrop"
      role="dialog" aria-modal="true"
      aria-label={(tb.rolagem) + titulo}
    >
      <div className="dado-overlay-inner">
        {/* Cabeçalho */}
        <div>
          <div className="dado-overlay-head">
            {isCritico && labelCriticoTipo ? labelCriticoTipo : titulo}
          </div>
          {subtitulo && <div className="dado-overlay-sub">{subtitulo}</div>}
        </div>

        {/* Dado icosaedro */}
        <DadoD20Bat
          ref={dadoRef}
          size="clamp(150px, 42vw, 208px)"
          ariaLabel={(tb.rolandoDadoPara) + titulo}
          onRoll={aoRolar}
          disabled={!!resultado}
        />

        {/* Card de resultado */}
        <div aria-live="polite" className={'dado-overlay-result-wrap' + (resultado ? ' visible' : '')}>
          {resultado && (
            <div className={'dado-overlay-result-card' + (!semCard && nomeRes ? ' com-card' : '')}>
              {nomeRes && (
                <div className="dado-overlay-result-nome" style={{ color: corRes }}>
                  {nomeRes}
                </div>
              )}
              {detalheRes && !semCard && (
                <div className="dado-overlay-result-detalhe">{detalheRes}</div>
              )}
              {msgCritico && (
                <div className="dado-overlay-result-critico-msg">{msgCritico}</div>
              )}
              {resultado && !resultado.res && resultado.d20 != null && (
                <div className="dado-overlay-resist-nome"
                  style={{ color: resultado.d20 > alvoResist ? 'var(--gold, #C9A44E)' : 'var(--ember-bright, #B8472F)' }}>
                  {resultado.d20 > alvoResist
                    ? (tb.sucesso)
                    : (resultado.d20 === alvoResist
                      ? (tb.empate)
                      : (tb.fracasso))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="dado-overlay-btns">
          {onConfirmar && (
            <button type="button" className="btn-primary"
              disabled={!resultado}
              onClick={() => resultado && onConfirmar({ valor: resultado.d20, resultado: resultado.res })}>
              {tb.confirmar}
            </button>
          )}
          {!onConfirmar && (
            <button type="button" className="btn-primary" onClick={onFechar}>
              {tb.concluir}
            </button>
          )}
        </div>
      </div>
    </div>
  ), document.querySelector('.menestrel-ui') || document.body);
}

/* ── Portal da lista do SelectPill ─────────────────────────────────
   Tira o dropdown de dentro do painel de Ação. Sem isto a lista nasce
   `position:absolute` dentro do menu do token, que tem `overflow: auto`:
   ela era recortada na borda do card e, com opções demais, criava barra de
   rolagem no MODAL inteiro em vez de rolar só a si mesma.

   Mede o botão a cada scroll/resize (o tabuleiro é panorâmico e o menu
   acompanha o token), e vira pra cima quando não cabe embaixo. Monta dentro
   de .menestrel-ui, não no body: as regras do pill são escopadas em
   "#root .menestrel-ui" e no body a lista sairia sem estilo — mesmo alvo que
   PortalTooltip e EstadoDropPortal usam. */
function SelectPillDrop({ anchorRef, dropRef, children }) {
  const [pos, setPos] = React.useState(null);
  React.useLayoutEffect(() => {
    const medir = () => {
      const el = anchorRef && anchorRef.current;
      if (!el || !el.isConnected) { setPos(null); return; }
      const r = el.getBoundingClientRect();
      const abaixo = window.innerHeight - r.bottom - 8;
      const paraCima = abaixo < 180 && r.top > abaixo;
      const p = { left: r.left, largura: r.width, paraCima,
                  top: paraCima ? r.top - 4 : r.bottom + 4,
                  maxH: Math.max(120, (paraCima ? r.top : abaixo) - 12) };
      setPos((ant) => (ant && ant.left === p.left && ant.top === p.top
        && ant.largura === p.largura && ant.paraCima === p.paraCima && ant.maxH === p.maxH) ? ant : p);
    };
    medir();
    window.addEventListener('scroll', medir, true);
    window.addEventListener('resize', medir);
    return () => {
      window.removeEventListener('scroll', medir, true);
      window.removeEventListener('resize', medir);
    };
  }, [anchorRef]);
  if (!pos) return null;
  return ReactDOM.createPortal(
    <div className="select-pill-drop-portal" ref={dropRef}
      style={{ position: 'fixed', left: pos.left, top: pos.top, width: pos.largura,
               maxHeight: pos.maxH, zIndex: 9800,
               transform: pos.paraCima ? 'translateY(-100%)' : 'none' }}>
      {children}
    </div>,
    document.querySelector('.menestrel-ui') || document.body
  );
}

/* ============================== SelectPill — dropdown no estilo FantasyDatePicker ============================== */
/*
   Drop-in replacement para <select>. Mesmo visual pill do datepicker:
   fundo escuro translúcido, borda-radius 999, dropdown customizado com lista absoluta.
   Props: options [{value, label}], value, onChange(value), placeholder?, disabled?
*/
function SelectPill({ options = [], value, onChange, placeholder, disabled, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    // A lista vive em PORTAL, fora de ref.current. Sem olhar o dropRef aqui,
    // o mousedown numa opção contava como "clique fora": fechava a lista antes
    // do onClick do <li> e a seleção nunca acontecia.
    const handler = (e) => {
      const noBotao = ref.current && ref.current.contains(e.target);
      const naLista = dropRef.current && dropRef.current.contains(e.target);
      if (!noBotao && !naLista) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find((o) => String(o.value) === String(value));
  // displayLabel (botão fechado) pode divergir do label da lista aberta —
  // usado pra opções tipo "— nenhuma —": a lista mostra o traço (item
  // continua identificável/clicável), o botão fechado mostra vazio.
  const displayLabel = selected
    ? (selected.labelBotao != null ? selected.labelBotao : selected.label)
    : (placeholder || '—');

  // pillStyle e dropStyle migrados para index.css (.select-pill-btn, .select-pill-drop)

  return (
    <div className="motor-field" ref={ref} style={{ position: 'relative' }}>
      {label && <span>{label}</span>}
      <button type="button" className="select-pill-btn" data-open={open ? 'true' : 'false'} disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => { e.currentTarget.blur(); !disabled && setOpen((v) => !v); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v); } }}>
        <span className="select-pill-btn-label">{displayLabel}</span>
        <i className="ti ti-chevron-down select-pill-btn-ic" aria-hidden="true" />
      </button>
      {/* O dropdown sai por PORTAL (02/09/2026). Era `position: absolute`
          dentro do painel, e o menu do token tem `overflow: auto` — a lista
          ficava PRESA lá dentro: recortada na borda e empurrando barra de
          rolagem quando tinha opções demais. Portal + position:fixed medido
          do botão tira a lista do fluxo e ela passa por cima de tudo. */}
      {open && (
        <SelectPillDrop anchorRef={ref} dropRef={dropRef}>
          <ul className="select-pill-drop">
            {options.map((opt) => {
              const active = String(opt.value) === String(value);
              return (
                <li key={opt.value} className={active ? 'active' : ''}
                  onClick={() => { onChange(opt.value); setOpen(false); }}>
                  {opt.label}
                  {active && <i className="ti ti-check select-pill-check" />}
                  {!active && <span className="select-pill-spacer" />}
                </li>
              );
            })}
          </ul>
        </SelectPillDrop>
      )}
    </div>
  );
}

/* ============================== QuantityStepper — seletor de quantidade, mesmo visual do SelectPill ============================== */
/*
   Drop-in replacement para <input type="number">. Mesmo pill (fundo escuro
   translúcido, borda-radius 999, altura 40) do SelectPill, mas com botões
   de incrementar/decrementar em vez de dropdown — usado como padrão pra
   qualquer seletor de quantidade no painel de Ação (ex.: aba Item).
   Props: value, onChange(value), min?, max?, step?, disabled?, label?
*/
function QuantityStepper({ value, onChange, min = 1, max = Infinity, step = 1, disabled, label }) {
  const clamp = (v) => Math.max(min, Math.min(max, v));
  const dec = () => { if (disabled) return; const v = clamp((Number(value) || 0) - step); if (v !== value) onChange(v); };
  const inc = () => { if (disabled) return; const v = clamp((Number(value) || 0) + step); if (v !== value) onChange(v); };

  // pillStyle e btnStyle migrados para index.css (.qty-stepper-pill, .qty-stepper-btn)
  const podeDec = !disabled && (Number(value) || 0) > min;
  const podeInc = !disabled && (Number(value) || 0) < max;

  return (
    <div className="motor-field">
      {label && <span>{label}</span>}
      <div className="qty-stepper-pill">
        <button type="button" className="qty-stepper-btn" disabled={!podeDec}
          onMouseDown={(e) => e.preventDefault()} onClick={dec} aria-label="-">
          <i className="ti ti-minus" aria-hidden="true" />
        </button>
        <span className="qty-stepper-val">{value}</span>
        <button type="button" className="qty-stepper-btn" disabled={!podeInc}
          onMouseDown={(e) => e.preventDefault()} onClick={inc} aria-label="+">
          <i className="ti ti-plus" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/* ============================== Motor de Resolução (Fase 5a) ============================== */
function MotorResolucao({ lang }) {
  const isEn = lang === 'en';
  const tb = tBat(lang); // i18n-sync (Fase 3.3)
  const [modo, setModo] = useState('acao');
  const [coluna, setColuna] = useState(0);
  const [ataque, setAtaque] = useState(10);
  const [defesa, setDefesa] = useState(10);
  const [d20, setD20] = useState(null);

  const trocaModo = (m) => { setModo(m); setD20(null); };

  const resAcao = d20 != null ? resolverAcao(coluna, d20) : null;
  const alvoResist = resolverResistencia(ataque, defesa);
  const resResist = d20 == null ? null
    : (d20 === alvoResist ? 'empate' : (d20 > alvoResist ? 'resistiu' : 'falhou'));

  return (
    <div className="motor">
      <div className="motor-tabs">
        <button className={modo === 'acao' ? 'on' : ''} onClick={() => trocaModo('acao')}>
          {tb.acao}
        </button>
        <button className={modo === 'resistencia' ? 'on' : ''} onClick={() => trocaModo('resistencia')}>
          {tb.resistencia}
        </button>
      </div>

      {modo === 'acao' ? (
        <div className="motor-body">
          <label className="motor-field">
            <span>{tb.colunaDeAcao7}</span>
            <input type="number" value={coluna}
              onChange={(e) => setColuna(Math.max(-7, Math.min(50, parseInt(e.target.value || '0', 10) || 0)))} />
          </label>
          <Dado value={d20} onChange={setD20} lang={lang} />
          {resAcao && (
            <div className="motor-result" style={{ borderColor: resAcao.cor }}>
              <span className="motor-swatch" style={{ background: resAcao.cor }} />
              <div>
                <div className="motor-result-nome">{isEn ? resAcao.en : resAcao.pt}</div>
                <div className="motor-result-meta">
                  {tb.coluna} {resAcao.coluna} · d20 {resAcao.d20} ·{' '}
                  {resAcao.erra ? (tb.erra) : `${Math.round(resAcao.dano * 100)}% ${tb.dano3}`}
                  {resAcao.autodano ? (tb.autoDano) : ''}
                  {resAcao.critico ? (tb.critico2) : ''}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="motor-body">
          <div className="motor-row2">
            <label className="motor-field">
              <span>{tb.forcaDeAtaque1}</span>
              <input type="number" value={ataque} onChange={(e) => setAtaque(_clamp1a20(e.target.value))} />
            </label>
            <label className="motor-field">
              <span>{tb.defesaResist120}</span>
              <input type="number" value={defesa} onChange={(e) => setDefesa(_clamp1a20(e.target.value))} />
            </label>
          </div>
          <div className="motor-alvo">
            {tb.alvoNoD20}: <strong>{alvoResist}</strong>{' '}
            <span className="motor-alvo-hint">({tb.resisteSeD20Alvo})</span>
          </div>
          <Dado value={d20} onChange={setD20} lang={lang} />
          {resResist && (
            <div className={'motor-result resist-' + resResist}>
              <div className="motor-result-nome">
                {resResist === 'empate' ? (tb.empateRoleDeNovo)
                  : resResist === 'resistiu' ? (tb.resistiu)
                  : (tb.naoResistiu)}
              </div>
              <div className="motor-result-meta">
                d20 {d20} {resResist === 'empate' ? '=' : (d20 > alvoResist ? '>' : '<')} {alvoResist}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================== Painel "Ação" (Fase 5c) ============================== */
/* Tabs: Arma | Magia. Técnica vive como sub-select dentro de Arma     */
/* (modificador anexado ao golpe), filtrada por grupo_armas.           */
/* Magia ignora defesa: coluna = nível efetivo do conjurador.          */
/* `rolagemSalva` / `onRolagemSalvaChange`: a rolagem feita e não aplicada é
   PERSISTIDA (batalhas.rolagem_pendente), não guardada só aqui. O d20 morava
   no estado deste componente, então qualquer desmontagem o descartava —
   trocar de menu, fechar o modal ou fechar o navegador devolvia o combatente
   ao "pode rolar de novo", e a regra "rolou, não rola de novo" não tinha onde
   se apoiar. Semeando o estado a partir do banco, o resultado atravessa
   reload e troca de tela.

   ONDE fica persistida depende de quem conduz, e o painel não precisa saber:
   o Mestre escreve a coluna batalhas.rolagem_pendente (ele tem UPDATE direto
   na tabela e age por um combatente de cada vez); o Jogador escreve
   participantes[].rolagem_pendente do PRÓPRIO PJ, porque só alcança a tabela
   pela RPC atualizar_batalha_jogador, que recebe participantes/log/rodada e
   não a coluna. Os dois entregam o mesmo objeto por `rolagemSalva`. */
function AcaoPanel({ ator, participantes, catalogos, lang, onAplicar, onAplicarTeste, onAplicarItem, onAplicarApoio, onCancel, onRolagemPendenteChange, rolagemSalva, onRolagemSalvaChange, abrirTip, fecharTip }) {
  // Só vale a rolagem DESTE ator: a linha é da batalha, não do participante.
  const salva = (rolagemSalva && ator
    && rolagemSalva.ator && rolagemSalva.ator.tipo === ator.tipo
    && String(rolagemSalva.ator.ref_id) === String(ator.ref_id)) ? rolagemSalva : null;
  const isEn = lang === 'en';
  const tb = tBat(lang); // i18n-sync (Fase 3.3)

  // Listas pré-computadas
  const armas    = useMemo(() => ataquesDoAtor(ator, catalogos), [ator, catalogos]);
  const magias   = useMemo(() => magiasOfensivasDoAtor(ator, catalogos), [ator, catalogos]);
  const tecnicas = useMemo(() => tecnicasDoAtor(ator, catalogos), [ator, catalogos]);
  const alvos = useMemo(() => participantes.filter(
    (p) => podeSerAtacado(p) && !mesmoParticipante(p, ator)
  ), [participantes, ator]);
  // Magias que alteram velocidade (01/09/2026). A aba Apoio só existe quando
  // esta lista não é vazia.
  const magiasApoio = useMemo(() => magiasDeApoioDoAtor(ator, catalogos), [ator, catalogos]);
  const temApoio = magiasApoio.length > 0;

  // Tabs disponíveis: Arma sempre; Magia só se PJ é conjurador com magias ofensivas
  const podeMagia = ator.tipo === 'pj' && magias.length > 0;

  // ── Habilidade / Resistência: usam sempre o ATOR (lutador da vez), sem
  // seletor de testador (decisão de produto — diferente do antigo TestePanel). ──
  const isPJ = ator && ator.tipo === 'pj';
  const pj = (isPJ && catalogos && catalogos.pjById) ? catalogos.pjById[ator.ref_id] : null;
  const ficha = useMemo(() => {
    if (!isPJ || !pj) return null;
    // Condições do SNAPSHOT do ator (evoluem em combate — itens etc.), com
    // fallback pro estado_atual em snapshots legados. Regra confirmada:
    // "as condições devem ser alteradas conforme a luta avança" — habilidade,
    // técnica e RF/RM refletem o valor ATUAL da batalha, não o pré-batalha.
    return (typeof calcularFicha === 'function')
      ? calcularFicha(pj, catalogos.catalogoBySlug, (ator && ator.condicoes) || pj.estado_atual?.condicoes) : null;
  }, [isPJ, pj, catalogos, ator]);
  const atributosFicha = (ficha && ficha.atributos) || {};
  const habilidadesAtor = useMemo(() => {
    if (!isPJ || !pj || !pj.habilidades) return [];
    const habsByKey = (catalogos && catalogos.habilidadesByKey) || {};
    const habsDb    = (catalogos && catalogos.habilidadesDb)    || [];
    const bonusObj  = (typeof calcBonusHabilidadesRacaReino === 'function')
      ? calcBonusHabilidadesRacaReino(pj.raca, pj.reino, habsDb) : {};
    const lista = [];
    Object.entries(pj.habilidades).forEach(([key, qtd]) => {
      const h = habsByKey[key];
      if (!h) return;
      const total = (typeof totalHabilidadeComCondicoes === 'function')
        ? totalHabilidadeComCondicoes(key, pj.habilidades, atributosFicha, bonusObj, habsByKey, (ator && ator.condicoes) || pj.estado_atual?.condicoes)
        : (typeof totalHabilidade === 'function' ? totalHabilidade(key, pj.habilidades, atributosFicha, bonusObj, habsByKey) : null);
      lista.push({ key, nome: h.nome, qtd: qtd || 0, total, ajuste: h.ajuste, descricao: h.descricao });
    });
    return lista.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [isPJ, pj, catalogos, atributosFicha, ator]);

  const semHab = !isPJ || habilidadesAtor.length === 0;
  const semTecTeste = tecnicas.length === 0;   // tecnicas (todas do ator) já existe abaixo

  // ── Tab ITEM — consumíveis do inventário REAL do ator (lido de
  // catalogos.pjById, que ConduzirBatalhaView já carrega com select('*') ao
  // ativar a batalha — sem prop/query nova). Mesmo critério de "consumível"
  // que 07-inventario/inventario.jsx usa: grupo==='Consumíveis' ou tipo==='L'.
  // Agrupado por slug (soma quantidade) pra cobrir o caso defensivo de mais
  // de uma instância empilhável do mesmo item — no inventário real elas já
  // costumam vir fundidas num card só, mas o snapshot de batalha não pode
  // assumir isso. Cada entrada guarda o instanceId da PRIMEIRA instância
  // encontrada (suficiente: usar/consumir desconta nela e o resto da pilha,
  // se houver, continua intacto pro próximo uso).
  //
  // ehContainer (sourced from 01-core/inventario-helpers.jsx, same window.X
  // bridge as EFEITO_CONDICAO_MAP) exclui RECIPIENTES (ex.: Cantil) do
  // filtro. cat.tipo==='L' sozinho não basta como critério de "consumível
  // líquido": um recipiente pode TER tipo:'L' só pra indicar que aceita
  // conteúdo líquido (ver recipienteAceitaSlug em inventario.jsx), sem ser
  // ele próprio algo bebível/usável — a marca real de container é
  // cat.armazena>0 (capacidade), checada por ehContainer.
  const itensConsumiveisAtor = useMemo(() => {
    if (!isPJ || !pj || !pj.inventario || !Array.isArray(pj.inventario.itens)) return [];
    const catBySlug = (catalogos && catalogos.catalogoBySlug) || {};
    const porSlug = {};
    pj.inventario.itens.forEach((it) => {
      if (!it || (it.quantidade || 0) <= 0) return;
      const cat = catBySlug[it.slug];
      if (!cat) return;
      if (typeof ehContainer === 'function' && ehContainer(cat)) return;   // recipiente — nunca consumível
      const consumivel = (cat.grupo === 'Consumíveis') || cat.tipo === 'L';
      if (!consumivel) return;
      if (!porSlug[it.slug]) {
        porSlug[it.slug] = {
          slug: it.slug, instanceId: it.instanceId, nome: cat.nome || it.slug,
          quantidade: 0, cat,
        };
      }
      porSlug[it.slug].quantidade += it.quantidade;
    });
    return Object.values(porSlug).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [isPJ, pj, catalogos]);
  const semItem = !isPJ || itensConsumiveisAtor.length === 0;

  // A aba também vem da rolagem salva: reabrir em outra aba mostraria o painel
  // limpo com a rolagem pendente escondida.
  const [tab, setTab] = useState(
    (salva && salva.tab)
    || (armas.length > 0 ? 'arma' : (podeMagia ? 'magia' : (!semItem ? 'item' : 'habilidade')))
  );

  // Estado por tab
  const [armaIdx, setArmaIdx]   = useState(0);
  const [tecIdx,  setTecIdx]    = useState(-1);   // -1 = sem técnica (tab Arma)
  const [magiaIdx, setMagiaIdx] = useState(0);
  const [alvoIdx, setAlvoIdx]  = useState(0);
  const [apoioIdx, setApoioIdx] = useState(0);
  const [alvoApoioIdx, setAlvoApoioIdx] = useState(0);
  const [d20, setD20] = useState(salva ? salva.d20 : null);
  // Segundo dado: só pedido quando primeiro resultado é FC (q=0, verde) ou A (q=7, cinza).
  // FC → autodano crítico no atacante; A → crítico devastador no alvo.
  const [d20Critico, setD20Critico] = useState(salva ? (salva.d20_critico ?? null) : null);
  // Overlay do dado: 'primario' | 'critico' | null
  const [overlayAberto, setOverlayAberto] = useState(null);

  // Estado das tabs Habilidade / Técnica (teste) / Resistência / Item
  const [habKey, setHabKey] = useState(null);
  const [tecTesteKey, setTecTesteKey] = useState(null);
  // C1 (revisão final): alvo ÚNICO da técnica (grupo alvo: 'inimigo') tem
  // seletor e estado PRÓPRIOS — não reusa alvoIdx da aba Arma (estado
  // compartilhado era o bug: default silencioso no índice 0, sem separar
  // aliado de inimigo). `tecAliados` é a multisseleção de 'aliados' (Voz de
  // Comando, até 4) — item 10: estava solto no meio da seção de cálculos,
  // longe dos outros useState da aba; movido pra junto deles.
  const [tecAlvoIdx, setTecAlvoIdx] = useState(0);
  const [tecAliados, setTecAliados] = useState([]);   // inst_id[] dos escolhidos
  const [resTipo, setResTipo] = useState('rf');               // 'rf' | 'rm'
  const [forcaAtaque, setForcaAtaque] = useState(10);
  const [forcaDefesa, setForcaDefesa] = useState(10);
  const [itemSlug, setItemSlug] = useState(null);
  const [itemQtd, setItemQtd]  = useState(1);

  // Quando muda de tab, zera dados/overlays de TODOS os fluxos
  const trocaTab = (t) => {
    setTab(t); setD20(null); setD20Critico(null); setOverlayAberto(null);
  };

  // Default de seleção ao entrar em Habilidade/Técnica(teste)/Item
  useEffect(() => {
    // Zera a multisseleção de aliados e o alvo único: ao trocar de aba ou de
    // técnica, a escolha da técnica anterior não pode sobreviver pra seguinte.
    setTecAliados([]);
    setTecAlvoIdx(0);
    if (tab === 'habilidade') {
      if (!habilidadesAtor.find((h) => h.key === habKey)) {
        setHabKey(habilidadesAtor[0] ? habilidadesAtor[0].key : null);
      }
    } else if (tab === 'tecnica_teste') {
      if (!tecnicas.find((t) => t.key === tecTesteKey)) {
        setTecTesteKey(tecnicas[0] ? tecnicas[0].key : null);
      }
    } else if (tab === 'item') {
      if (!itensConsumiveisAtor.find((it) => it.slug === itemSlug)) {
        setItemSlug(itensConsumiveisAtor[0] ? itensConsumiveisAtor[0].slug : null);
        setItemQtd(1);
      }
    }
    // eslint-disable-next-line
  }, [tab, habilidadesAtor.length, tecnicas.length, itensConsumiveisAtor.length, tecTesteKey]);

  // Auto-puxa RF/RM da ficha quando tab é Resistência
  // I4 (revisão final): RF/RM EFETIVAS — antes lia direto de ficha.derivadas,
  // ignorando status_temp (Resistência à Dor/Extrema, metade de Fúria); só a
  // aba Apoio (defesa de OUTRO alvo) passava por rfEfetivo/rmEfetivo.
  // ator.rf/rm é a MESMA fonte que ficha.derivadas (montarSnapshots copia
  // 1:1), então rfEfetivo(ator)/rmEfetivo(ator) soma só o que faltava. `ficha`
  // já é dependência do efeito e é recriada a cada mudança de `ator`
  // (useMemo, deps inclui ator), então este efeito recalcula sozinho quando
  // um status muda — não precisa entrar de novo nas deps.
  useEffect(() => {
    if (tab !== 'resistencia') return;
    if (!isPJ || !ficha) return;
    const v = resTipo === 'rf' ? rfEfetivo(ator) : rmEfetivo(ator);
    setForcaDefesa(_clamp1a20(v));
    setD20(null);
  }, [tab, resTipo, isPJ, ficha]);

  // Fallback automático: se a tab ativa fica sem opção pro ator atual, pula
  // pra próxima disponível (Resistência está sempre disponível).
  useEffect(() => {
    if (tab === 'habilidade' && semHab) setTab(semTecTeste ? 'resistencia' : 'tecnica_teste');
    else if (tab === 'tecnica_teste' && semTecTeste) setTab(semHab ? 'resistencia' : 'habilidade');
  }, [tab, semHab, semTecTeste]);

  // ── Tab ARMA ───────────────────────────────────────────────
  const arma = armas[armaIdx] || null;
  const tecnicasCompat = useMemo(
    () => tecnicasCompativeisComArma(tecnicas, arma, catalogos),
    [tecnicas, arma, catalogos]
  );
  const tecnica = (tecIdx >= 0 && tecnicasCompat[tecIdx]) || null;

  // ── Tab MAGIA ──────────────────────────────────────────────
  const magia = magias[magiaIdx] || null;

  // ── Alvo (compartilhado) ───────────────────────────────────
  const alvo = alvos[alvoIdx] || null;

  // ── Tab APOIO ──────────────────────────────────────────────
  const apoioSel = magiasApoio[apoioIdx] || null;

  // A aba Apoio tem lista de alvos PRÓPRIA: diferente de Arma/Magia, aqui o
  // conjurador pode (e às vezes DEVE) mirar em si mesmo.
  //   • alcance "Pessoal"  → só ele, mais ninguém;
  //   • buff  (mod_vb > 0) → ele primeiro, aliados depois;
  //   • debuff (mod_vb < 0) → os outros primeiro, ele por último.
  // A ordem define o alvo PADRÃO, e isso evita o tiro no pé de escurecer a
  // própria iniciativa por deixar o seletor no valor inicial.
  const alvosApoio = useMemo(() => {
    if (!apoioSel) return [];
    if (apoioSel.pessoal) return [ator];
    return apoioSel.mod_vb < 0 ? [...alvos, ator] : [ator, ...alvos];
  }, [apoioSel, alvos, ator]);
  const alvoApoio = alvosApoio[alvoApoioIdx] || null;

  // ── Alcance do tabuleiro (ligado em 30/08/2026) ─────────────
  // A camada pura existia em 12-batalha/tabuleiro.jsx desde a reconstrução,
  // testada, mas NINGUÉM a chamava: dava pra acertar de adaga alguém do
  // outro lado do grid. `alvoNoAlcance` devolve true quando ator ou alvo não
  // estão posicionados, então batalha sem tabuleiro segue exatamente como
  // antes — a trava só existe para quem está no grid.
  const alcanceAcao = (tab === 'arma' || tab === 'magia')
    ? alcanceDaAcao({ arma: tab === 'arma' ? arma : null, magia: tab === 'magia' ? magia : null, tecnica })
    : null;
  const distanciaAoAlvo = alvo ? distanciaEntre(ator, alvo) : null;
  const foraDeAlcance = !!(alcanceAcao != null && alvo && !alvoNoAlcance(ator, alvo, alcanceAcao));

  // ── Cálculos por tab ───────────────────────────────────────
  // Arma: coluna = dano_categoria + bônus_grupo − defesa_valor (clamp [-7,50]).
  // Magia: coluna = nível efetivo do conjurador (passa por toda defesa).
  // Habilidade/Técnica(teste): coluna = total do item (clamp [-7,50]).
  const habilidadeSel = habilidadesAtor.find((h) => h.key === habKey) || null;
  const tecnicaTesteSel = tecnicas.find((t) => t.key === tecTesteKey) || null;
  // Fase 1 (09/09/2026): a aba Técnica passou a APLICAR efeito, não só rolar.
  const tecRegistro = tecnicaTesteSel ? tecnicaEfeitoDe(tecnicaTesteSel.key) : null;
  const tecPrecisaAlvo = !!tecRegistro && tecRegistro.alvo !== 'self';
  // modo 'total' não rola dado: o valor é o total da técnica, direto. Vem
  // ANTES de tecBloqueio porque a REGRA NOVA (0 PA, 1 ativação livre por
  // rodada) só vale pra modo 'total', e o bloqueio precisa saber disso.
  const tecSemDado = !!tecRegistro && tecRegistro.modo === 'total';
  // Três portas de bloqueio: equipamento incompatível (grupo_armas /
  // grupo_armaduras, Task 7), uso Único já gasto, e a REGRA NOVA — ativação
  // livre já gasta nesta rodada. Equipamento vem primeiro porque o jogador
  // resolve trocando de item; a cota livre vem por último porque só ela
  // libera de novo sozinha (na próxima rodada), sem o jogador fazer nada.
  const tecEquip = tecnicaTesteSel
    ? tecnicaPermitida(tecnicaTesteSel, ator, arma, catalogos) : { pode: true, motivo: null };
  const tecUso = tecnicaTesteSel
    ? podeUsarTecnica(ator, tecnicaTesteSel) : { pode: true, motivo: null };
  const tecLivre = tecnicaTesteSel
    ? podeAtivarTecnicaLivre(ator, tecnicaTesteSel) : { pode: true, motivo: null };
  const tecBloqueio = !tecEquip.pode ? tecEquip : (!tecUso.pode ? tecUso : tecLivre);
  // 'aliados' (só Voz de Comando: até 4) precisa de multisseleção; 'inimigo'
  // usa o seletor de alvo PRÓPRIO da técnica (C1, abaixo) — nenhuma das duas
  // reusa o `alvo`/`alvoIdx` da aba Arma (estado compartilhado era o bug:
  // default silencioso, sem separar aliado de inimigo, e sangrava o próprio
  // companheiro em silêncio).
  const tecMultiAlvo = !!tecRegistro && tecRegistro.alvo === 'aliados';
  const tecAlvoUnico = tecPrecisaAlvo && !tecMultiAlvo;
  const tecAlvoSel = tecAlvoUnico ? (alvos[tecAlvoIdx] || null) : null;
  const tecAliadosOpcoes = useMemo(
    // O próprio ator NÃO entra na lista (item 11): Voz de Comando pode
    // legitimamente mirar em qualquer um (o texto do banco diz "4 alvos"),
    // mas incluir o ATOR numa lista rotulada "Aliados" é confuso.
    () => (tecMultiAlvo ? participantes.filter((p) => p.status === 'ativo' && !mesmoParticipante(p, ator)) : []),
    [tecMultiAlvo, participantes, ator]
  );
  const tecAlvosEscolhidos = tecMultiAlvo
    ? tecAliadosOpcoes.filter((p) => tecAliados.includes(p.inst_id))
    : (tecAlvoUnico && tecAlvoSel ? [tecAlvoSel] : []);
  const tecMultiCheio = tecMultiAlvo && tecAliados.length >= (tecRegistro.maxAlvos || 1);
  const itemSelecionado = itensConsumiveisAtor.find((it) => it.slug === itemSlug) || null;

  // Modificadores mecânicos de status_temp (Fase 1.1): "Suas ações tem −7"
  // (FC branco) pega TODAS as ações do ator — arma, magia, habilidade e
  // técnica; "defesa −5" (FC azul) reduz a defesa_valor EFETIVA do alvo
  // (a coluna do atacante sobe). colunaAtaque segue pura — o mod entra aqui.
  const modColunaAtor = somaEfeitosStatus(ator, 'mod_coluna');
  let coluna = null, colunaClamped = null, alvoResist = null;
  if (tab === 'arma' && arma && alvo) {
    const alvoEfetivo = { ...alvo, defesa_valor: (alvo.defesa_valor || 0) + somaEfeitosStatus(alvo, 'mod_defesa') };
    // mod_ataque (técnicas, Fase 1) entra SÓ aqui e na magia — teste de
    // habilidade e de técnica não recebem bônus de "coluna de ataque".
    coluna = colunaAtaque(arma, alvoEfetivo)
           + modColunaAtor
           + somaModAtaque(ator, grupoDaArma(arma, catalogos));
    colunaClamped = Math.max(-7, Math.min(50, coluna));
  } else if (tab === 'magia' && magia) {
    // Magia não tem grupo de arma: só os mod_ataque irrestritos valem.
    coluna = magia.nivel + modColunaAtor + somaModAtaque(ator, null);
    colunaClamped = Math.max(-7, Math.min(50, coluna));
  } else if (tab === 'habilidade' && habilidadeSel && habilidadeSel.total != null) {
    coluna = habilidadeSel.total + modColunaAtor;
    colunaClamped = Math.max(-7, Math.min(50, coluna));
  } else if (tab === 'tecnica_teste' && tecnicaTesteSel && tecnicaTesteSel.total != null) {
    coluna = tecnicaTesteSel.total + modColunaAtor;
    colunaClamped = Math.max(-7, Math.min(50, coluna));
  } else if (tab === 'apoio' && apoioSel && apoioSel.resistencia && alvoApoio) {
    // Força de ATAQUE = nível efetivo da magia; força de DEFESA = o RF/RM do
    // alvo. Ambas presas em 1..20, que é o intervalo que resolverResistencia
    // aceita (ele mesmo já faz o clamp, mas explicitar deixa o cálculo legível).
    const fAtk = Math.max(1, Math.min(20, apoioSel.nivel));
    // RF/RM EFETIVAS (Fase 1 das técnicas): Resistência à Dor / Extrema /
    // Fúria sobem estes números enquanto o status durar.
    const fDefBruta = apoioSel.resistencia === 'rm' ? rmEfetivo(alvoApoio) : rfEfetivo(alvoApoio);
    const fDef = Math.max(1, Math.min(20, fDefBruta));
    alvoResist = (typeof resolverResistencia === 'function')
      ? resolverResistencia(fAtk, fDef) : null;
  } else if (tab === 'resistencia') {
    alvoResist = (typeof resolverResistencia === 'function')
      ? resolverResistencia(forcaAtaque, forcaDefesa) : null;
  }

  const res = (tab !== 'resistencia' && colunaClamped != null && d20 != null) ? resolverAcao(colunaClamped, d20) : null;
  const resResist = ((tab === 'resistencia' || tab === 'apoio') && d20 != null && alvoResist != null)
    ? (d20 === alvoResist ? 'empate' : (d20 > alvoResist ? 'resistiu' : 'falhou'))
    : null;
  const armaPraDano = tab === 'magia' ? magia : arma;        // o objeto cujo `dano` será multiplicado pelo tier
  const danoBruto = (tab === 'arma' || tab === 'magia') && res && !res.erra ? danoNoTier(armaPraDano, res.codigo) : 0;
  // danoFinal engloba o que danoComModMax fazia (mod_dano_max) e acrescenta
  // os percentuais da Fase 2, na ordem da spec §4.3.
  const dano = danoFinal(danoBruto, ator, alvo);
  const custoKarma = tab === 'magia' && magia ? magia.custo_karma : 0;
  const semKarma = custoKarma > 0 && (ator.karma || 0) < custoKarma;
  const semPA = (ator.pa_rest || 0) <= 0;

  // Resultado primário que exige segundo dado:
  //   q=0 (FC, verde) → consequência contra SI MESMO (FALHA_CRITICA_TABELA,
  //   arma E magia — a tabela tem o tipo MAGIA); q=7 (A, cinza) → crítico
  //   contra o alvo (CRITICOS_TABELA, exclusivo de arma). Testes (habilidade/
  //   técnica/resistência) nunca entram no fluxo de segundo dado.
  const precisaCritico = !!(res && ((tab === 'arma' && (res.q === 0 || res.q === 7)) || (tab === 'magia' && res.q === 0)));
  const tipoCritico = res && res.q === 7 ? 'alvo' : (res && res.q === 0 ? 'self' : null);

  // Trava de re-roll do dado primário: a partir do momento em que existe um
  // resultado (d20 != null), a rolagem primária fica travada em QUALQUER
  // aba — Arma, Magia, Habilidade, Técnica (teste) e Resistência —, sem
  // exceção por qualidade do resultado. Habilidade/Técnica/Resistência não
  // têm o conceito de crítico (precisaCritico é exclusivo de 'arma'), então
  // pra elas a trava é simplesmente "rolou, acabou" — sem uma segunda
  // rolagem de efeito depois. Em Arma/Magia, Falha Crítica (q=0) e Absurdo
  // (q=7) não reabrem o dado primário pra um novo sorteio; eles disparam,
  // em vez disso, a rolagem SEPARADA do dado de crítico (precisaCritico/
  // d20Critico, ver abaixo), que por sua vez também trava sozinha depois de
  // rolada uma vez (dadoCriticoTravado). Nenhum dado, em nenhuma aba, é
  // re-rolável "até o jogador gostar do número".
  //
  // ÚNICA exceção: EMPATE na Resistência (d20 === alvoResist). Pela regra
  // do sistema, empate não é um resultado — é "role de novo" (ver
  // resolverResistencia em game-data.jsx). Sem esta exceção o painel
  // entrava em softlock total: Resistir desabilitado (podeAplicar exige
  // resultado != empate), Rolar d20 travado, Cancelar substituído pelo
  // aviso, abas/header/seta de voltar travados por temRolagemPendente —
  // sem nenhuma saída além de recarregar a página. A trava de rolagem
  // pendente PERMANECE durante o empate (continua impossível escapar sem
  // resolver): a única porta que o empate reabre é o próprio Rolar d20.
  const empateResist = tab === 'resistencia' && resResist === 'empate';
  const dadoPrimarioTravado = d20 != null && !empateResist;

  // Rótulo do botão do dado — só-ícone desde 02/09/2026, então o texto vive no
  // tooltip. Traz o valor rolado junto quando já houve rolagem.
  const rotuloDado = empateResist ? tb.rolarDeNovo
    : (d20 != null ? `${tb.rolarD20} · d20: ${d20}` : tb.rolarD20);

  // Trava simétrica do dado de crítico (segundo dado, só existe quando
  // precisaCritico é true): uma vez rolado, também não pode ser rolado de
  // novo — mesma regra "rola uma vez só" do dado primário, aplicada à
  // rolagem de efeito.
  const dadoCriticoTravado = d20Critico != null;

  // Tipo de crítico da tabela (CORTE/PERFURACAO/ESMAGAMENTO/DESARMADO) — lido do grupo da arma.
  const tipoCriticoArma = tab === 'magia' ? 'MAGIA'
    : (tab === 'arma' && arma) ? tipoCriticoDoGrupo(arma.grupo_sigla || arma.grupo || '') : 'DESARMADO';

  // Zera o segundo dado se o primeiro mudar (evita estado órfão).
  const setD20ComReset = (v) => { setD20(v); setD20Critico(null); };

  // Segundo resultado (só calculado quando necessário e disponível).
  const resCritico = (precisaCritico && d20Critico != null)
    ? resolverAcao(colunaClamped, d20Critico) : null;

  // Texto narrativo do crítico interpolado com os danos reais da arma.
  // Tabela por direção do segundo dado: 'self' (q=0) pune o ATACANTE
  // (FALHA_CRITICA_TABELA); 'alvo' (q=7) pune o OPONENTE (CRITICOS_TABELA).
  // Magia interpola com a própria magia (danoNoTier fonte 'magia' → floor).
  const objDanoCritico = tab === 'magia' ? magia : arma;
  const msgCritico = (resCritico && tipoCriticoArma)
    ? interpolarCritico(((tipoCritico === 'self' ? FALHA_CRITICA_TABELA : CRITICOS_TABELA)[tipoCriticoArma] || {})[resCritico.q], objDanoCritico)
    : null;

  // Pode confirmar: depende de qual tab está ativa.
  // I5 (revisão final): modo 'total' não rola dado — a spec §6 pede "sem
  // overlay de dado; aplica e debita PA" (0 PA agora, REGRA NOVA), então
  // podeAplicar não pode exigir d20/res pra essas. semPA também não entra:
  // ativação livre não gasta PA nenhum, o único teto é tecBloqueio
  // (tecLivre) — quem já ativou nesta rodada fica bloqueado por ELE, mesmo
  // com PA sobrando.
  const podeAplicar =
    (tab === 'arma' || tab === 'magia')
      ? (!!res && !semKarma && alvo && !foraDeAlcance && (!precisaCritico || d20Critico != null))
    : (tab === 'habilidade')
      ? (!semPA && d20 != null && !!res)
    : (tab === 'tecnica_teste')
      ? (!!tecnicaTesteSel && tecBloqueio.pode
          && (tecPrecisaAlvo ? tecAlvosEscolhidos.length > 0 : true)
          && (tecSemDado ? true : (!semPA && d20 != null && !!res)))
    : (tab === 'resistencia')
      ? (!semPA && d20 != null && !!resResist && resResist !== 'empate')
    : (tab === 'apoio')
      ? (!semPA && !!apoioSel && !!alvoApoio
         && (ator.karma || 0) >= apoioSel.custo_karma
         && (!apoioSel.resistencia || (d20 != null && resResist !== 'empate')))
    : (tab === 'item')
      ? (!semPA && !!itemSelecionado && itemQtd >= 1 && itemQtd <= itemSelecionado.quantidade)
    : false;

  // Rolagem comprometida: a partir do momento em que existe um resultado de
  // dado primário (em qualquer tab que rola — Item não rola, não entra
  // aqui), o jogador não pode mais escapar sem aplicar. Isso trava o botão
  // Cancelar (ver footer) e é reportado pro componente pai via
  // onRolagemPendenteChange, pra travar também os botões do header
  // (Ação/Passar/Nova Rodada/Encerrar) — fecha a brecha de "passar a vez"
  // ou fechar o painel de outro jeito pra escapar sem gastar PA.
  //
  // SEGUNDA exceção (além do empate na Resistência): se não sobrou alvo
  // válido, a ação rolada é IMPOSSÍVEL de aplicar — podeAplicar exige `alvo`
  // e não há nenhum. Manter a trava aqui não protege PA nenhum (não há como
  // gastá-lo nesta ação); só tranca o painel exibindo "Sem alvos válidos." e
  // "Já rolou — continue em Atacar." ao mesmo tempo, sem Cancelar, sem abas,
  // sem X no menu e sem header. Devolver o Cancelar é a única saída sã.
  const semAlvoPossivel = (tab === 'arma' || tab === 'magia') && alvos.length === 0;
  // Apoio sem teste de resistência não rola dado nenhum — não há rolagem pra
  // ficar pendente, e travar o painel aqui só prenderia o Mestre.
  const apoioSemDado = tab === 'apoio' && !(apoioSel && apoioSel.resistencia);
  const temRolagemPendente = tab !== 'item' && !apoioSemDado && d20 != null && !semAlvoPossivel;

  // Reporta o estado de "rolagem pendente" pro pai sempre que muda.
  useEffect(() => {
    onRolagemPendenteChange && onRolagemPendenteChange(temRolagemPendente);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temRolagemPendente]);

  // Cleanup separado, só ao desmontar o painel (array vazio) — garante que o
  // pai volte a liberar o header mesmo se o painel sumir com uma rolagem
  // ainda marcada como pendente no último render (não deveria acontecer no
  // fluxo normal, já que aplicar/cancelar zeram d20 antes, mas cobre o caso
  // defensivo). Separado do efeito acima pra não disparar onRolagemPendenteChange(false)
  // a cada troca de aba — só quando o componente realmente desmonta.
  useEffect(() => {
    return () => { onRolagemPendenteChange && onRolagemPendenteChange(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aviso nativo do navegador (beforeunload) — único mecanismo possível pra
  // sinalizar "há uma rolagem não aplicada" ao fechar a aba/navegador. Não é
  // garantia de que o PA será debitado (não dá pra rodar uma chamada de rede
  // assíncrona de forma confiável nesse evento) — só dificulta a saída
  // acidental ou deliberada sem aplicar.
  useEffect(() => {
    if (!temRolagemPendente) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [temRolagemPendente]);

  const aplicar = () => {
    if (!podeAplicar) return;
    if (tab === 'resistencia') {
      onAplicarTeste && onAplicarTeste({
        tipo_teste: 'resistencia',
        testador: ator,
        resistencia_tipo: resTipo,
        forca_ataque: forcaAtaque,
        forca_defesa: forcaDefesa,
        alvo_resist: alvoResist,
        d20,
        resultado: resResist,
      });
    } else if (tab === 'habilidade' && habilidadeSel) {
      onAplicarTeste && onAplicarTeste({
        tipo_teste: 'habilidade',
        testador: ator,
        chave: habilidadeSel.key,
        nome:  habilidadeSel.nome,
        coluna: colunaClamped,
        d20,
        resultado: res,
      });
    } else if (tab === 'tecnica_teste' && tecnicaTesteSel) {
      onAplicarTeste && onAplicarTeste({
        tipo_teste: 'tecnica',
        testador: ator,
        chave: tecnicaTesteSel.key,
        nome:  tecnicaTesteSel.nome,
        // Fase 1: o que o motor precisa pra aplicar o efeito.
        // alvos_efeito é SEMPRE lista — 'self' manda vazia (o motor usa o
        // testador), 'inimigo' manda um, 'aliados' manda até maxAlvos.
        tecnica: tecnicaTesteSel,
        alvos_efeito: tecAlvosEscolhidos,
        valor_total: tecnicaTesteSel.total,
        sem_dado: tecSemDado,
        coluna: colunaClamped,
        d20,
        resultado: res,
      });
    } else if (tab === 'apoio' && apoioSel && alvoApoio) {
      onAplicarApoio && onAplicarApoio({
        ator, alvo: alvoApoio, magia: apoioSel,
        custo_karma: apoioSel.custo_karma,
        resistencia: apoioSel.resistencia || null,
        d20: apoioSel.resistencia ? d20 : null,
        resistiu: apoioSel.resistencia ? (resResist === 'resistiu') : false,
      });
    } else if (tab === 'item' && itemSelecionado) {
      onAplicarItem && onAplicarItem({
        ator,
        instanceId: itemSelecionado.instanceId,
        slug: itemSelecionado.slug,
        nome: itemSelecionado.nome,
        quantidade: itemQtd,
      });
    } else if (tab === 'magia') {
      onAplicar({
        tipo: 'magia',
        magia, alvo,
        coluna: colunaClamped, d20: res.d20, resultado: res, dano,
        custo_karma: custoKarma,
        // Segundo dado de FALHA CRÍTICA (magia só entra no fluxo com q=0).
        d20_critico: precisaCritico ? d20Critico : undefined,
        res_critico: precisaCritico ? resCritico  : undefined,
        tipo_critico: precisaCritico ? tipoCritico : undefined,
        tipo_critico_arma: precisaCritico ? tipoCriticoArma : undefined,
        msg_critico: precisaCritico ? msgCritico : undefined,
      });
    } else {
      onAplicar({
        tipo: 'arma',
        arma, tecnica, alvo,
        coluna: colunaClamped, d20: res.d20, resultado: res, dano,
        custo_karma: 0,
        // Segundo dado de crítico (presente só quando q=0 ou q=7).
        d20_critico: precisaCritico ? d20Critico : undefined,
        res_critico: precisaCritico ? resCritico  : undefined,
        tipo_critico: precisaCritico ? tipoCritico : undefined,
        tipo_critico_arma: precisaCritico ? tipoCriticoArma : undefined,
        msg_critico: precisaCritico ? msgCritico : undefined,
      });
    }
  };

  return (
    <div className="atacar acao">
      {/* Tabs + combatente atual */}
      {/* Travadas inteiras quando temRolagemPendente: trocar de aba reseta
          d20/d20Critico (ver trocaTab) e por padrão SelectPill de arma/alvo/
          técnica/etc já travam nesse estado — mas as próprias abas não
          travavam, permitindo escapar de uma rolagem já feita (ex.: Arma
          rolou Falha Crítica → trocar pra Resistência ou Item some com o
          resultado sem custo). Fecha essa brecha: nenhuma aba é trocável
          enquanto há rolagem pendente, só Atacar/Usar/Resistir. */}
      <div className="acao-tabs">
        <button className={'acao-tab' + (tab === 'arma' ? ' on' : '')}
          onClick={() => trocaTab('arma')} disabled={armas.length === 0 || temRolagemPendente}>
          <i className="ti ti-sword" aria-hidden="true" />{tb.arma}
        </button>
        <button className={'acao-tab' + (tab === 'habilidade' ? ' on' : '')}
          onClick={() => trocaTab('habilidade')} disabled={semHab || temRolagemPendente}>
          <i className="ti ti-list-check" aria-hidden="true" />{tb.habilidade}
        </button>
        <button className={'acao-tab' + (tab === 'tecnica_teste' ? ' on' : '')}
          onClick={() => trocaTab('tecnica_teste')} disabled={semTecTeste || temRolagemPendente}>
          <i className="ti ti-bolt" aria-hidden="true" />{tb.tecnica}
        </button>
        <button className={'acao-tab' + (tab === 'resistencia' ? ' on' : '')}
          onClick={() => trocaTab('resistencia')} disabled={temRolagemPendente}>
          <i className="ti ti-shield-check" aria-hidden="true" />{tb.resistencia}
        </button>
        {!semItem && (
          <button className={'acao-tab' + (tab === 'item' ? ' on' : '')}
            onClick={() => trocaTab('item')} disabled={temRolagemPendente}>
            <i className="ti ti-bottle" aria-hidden="true" />{tb.item}
          </button>
        )}
        {podeMagia && (
          <button className={'acao-tab acao-tab-magia' + (tab === 'magia' ? ' on' : '')}
            onClick={() => trocaTab('magia')} disabled={temRolagemPendente}>
            <i className="ti ti-sparkles" aria-hidden="true" />{tb.magia}
          </button>
        )}
        {temApoio && (
          <button className={'acao-tab' + (tab === 'apoio' ? ' on' : '')}
            onClick={() => trocaTab('apoio')} disabled={temRolagemPendente}>
            <i className="ti ti-wand" aria-hidden="true" />{tb.apoio}
          </button>
        )}
      </div>

      {(tab === 'arma' || tab === 'magia') && armas.length === 0 && !podeMagia ? (
        <p className="atacar-aviso-vazio">
          {tb.semAcoesDeCombate}
        </p>
      ) : (tab === 'arma' || tab === 'magia') && alvos.length === 0 ? (
        <p className="atacar-aviso-vazio">{tb.semAlvosValidos}</p>
      ) : (
      <>
      {tab === 'arma' && (
        <>
          <div className={tecnicasCompat.length > 0 ? 'atacar-row3' : 'atacar-row2'}>
            <SelectPill
              label={tb.arma}
              value={armaIdx}
              disabled={temRolagemPendente}
              onChange={(v) => { setArmaIdx(parseInt(v, 10)); setTecIdx(-1); setD20(null); }}
              options={armas.map((a, i) => ({
                value: i,
                label: a.nome,
              }))}
            />
            <SelectPill
              label={tb.alvo}
              value={alvoIdx}
              disabled={temRolagemPendente}
              onChange={(v) => { setAlvoIdx(parseInt(v, 10)); setD20(null); }}
              options={alvos.map((p, i) => {
                const d = distanciaEntre(ator, p);
                const longe = alcanceAcao != null && !alvoNoAlcance(ator, p, alcanceAcao);
                return { value: i, label: p.nome + (longe ? ` · ${d} m` : '') };
              })}
            />
            {tecnicasCompat.length > 0 && (
              <SelectPill
                label={tb.tecnicaOpcional}
                value={tecIdx}
                disabled={temRolagemPendente}
                onChange={(v) => setTecIdx(parseInt(v, 10))}
                options={[
                  { value: -1, label: tb.nenhuma, labelBotao: '' },
                  ...tecnicasCompat.map((t, i) => ({
                    value: i,
                    label: t.nome,
                  })),
                ]}
              />
            )}
          </div>

          {tecnica && tecnica.efeito && (
            <div className="acao-tecnica-efeito">
              <strong>{tecnica.nome}:</strong> {tecnica.efeito}
            </div>
          )}

        </>
      )}

      {tab === 'magia' && (
        <>
          <div className="atacar-row2">
            <SelectPill
              label={tb.magia}
              value={magiaIdx}
              disabled={temRolagemPendente}
              onChange={(v) => { setMagiaIdx(parseInt(v, 10)); setD20(null); }}
              options={magias.map((m, i) => ({
                value: i,
                label: `${m.nome} ${m.nivel}`,
              }))}
            />
            <SelectPill
              label={tb.alvo}
              value={alvoIdx}
              disabled={temRolagemPendente}
              onChange={(v) => { setAlvoIdx(parseInt(v, 10)); setD20(null); }}
              options={alvos.map((p, i) => ({ value: i, label: p.nome }))}
            />
          </div>

          {magia && magia.descricao && (
            <p className="acao-efeito-texto">{magia.descricao}</p>
          )}

          {semKarma && (
            <span className="acao-karma-warn">
              {tb.karmaInsuficiente}
            </span>
          )}
        </>
      )}

      {/* Tab Habilidade */}
      {tab === 'habilidade' && (
        semHab ? (
          <p className="atacar-aviso-vazio">
            {tb.esteLutadorNaoTem}
          </p>
        ) : (
          <>
            <SelectPill
              label={tb.habilidade}
              value={habKey || ''}
              disabled={temRolagemPendente}
              onChange={(v) => { setHabKey(v); setD20(null); }}
              options={habilidadesAtor.map((h) => ({
                value: h.key,
                label: h.nome,
              }))}
            />
            {habilidadeSel && habilidadeSel.descricao && (
              <p className="acao-efeito-texto">{habilidadeSel.descricao}</p>
            )}
          </>
        )
      )}

      {/* Tab Técnica (teste — independente de arma) */}
      {tab === 'tecnica_teste' && (
        semTecTeste ? (
          <p className="atacar-aviso-vazio">
            {tb.esteLutadorNaoTem2}
          </p>
        ) : (
          <>
            <SelectPill
              label={tb.tecnica}
              value={tecTesteKey || ''}
              disabled={temRolagemPendente}
              onChange={(v) => { setTecTesteKey(v); setD20(null); }}
              options={tecnicas.map((t) => ({
                value: t.key,
                label: t.nome,
              }))}
            />
            {/* C1 (revisão final): seletor de alvo PRÓPRIO da técnica, para
                as 5 de alvo único ('inimigo' — sangramento, expectativa,
                resguardar, pressionar_oponente, posicionamento). Antes o
                efeito caía em alvos[alvoIdx], estado COMPARTILHADO com a aba
                Arma: o jogador não escolhia e a tela não dizia quem foi.
                Molde copiado do seletor de alvo da aba Arma (tb.alvo). */}
            {tecAlvoUnico && (
              <SelectPill
                label={tb.alvo}
                value={tecAlvoIdx}
                disabled={temRolagemPendente}
                onChange={(v) => { setTecAlvoIdx(parseInt(v, 10)); setD20(null); }}
                options={alvos.map((p, i) => ({ value: i, label: p.nome }))}
              />
            )}
            {tecMultiAlvo && (
              <div className="acao-aliados">
                <span className="acao-aliados-lbl">
                  {interpolate(tb.tecnicaAliadosRotulo, { atual: tecAliados.length, max: tecRegistro.maxAlvos })}
                </span>
                {tecAliadosOpcoes.map((p) => {
                  const marcado = tecAliados.includes(p.inst_id);
                  return (
                    <label key={p.inst_id} className={'acao-aliado' + (marcado ? ' on' : '')}>
                      <input
                        type="checkbox"
                        checked={marcado}
                        // Teto de maxAlvos: quem não está marcado trava quando lota.
                        disabled={!marcado && tecMultiCheio}
                        onChange={() => setTecAliados((atual) => (
                          marcado ? atual.filter((id) => id !== p.inst_id) : [...atual, p.inst_id]
                        ))}
                      />
                      {p.nome}
                    </label>
                  );
                })}
              </div>
            )}
            {tecnicaTesteSel && tecnicaTesteSel.efeito && (
              <p className="acao-efeito-texto">{tecnicaTesteSel.efeito}</p>
            )}
            {!tecBloqueio.pode && (
              <p className="acao-efeito-texto acao-efeito-bloqueio">
                {tecBloqueio.motivo === 'arma'
                  ? interpolate(tb.tecnicaExigeArma, { grupo: tecnicaTesteSel.grupo_armas })
                  : tecBloqueio.motivo === 'armadura'
                  ? interpolate(tb.tecnicaExigeArmadura, { grupo: tecnicaTesteSel.grupo_armaduras })
                  : tecBloqueio.motivo === 'livre_usada'
                  ? tb.tecnicaGratuitaJaUsada
                  : tb.tecnicaUsoUnicoJaUsada}
              </p>
            )}
            {tecRegistro && tecRegistro.parcial === 'ignora_armadura' && (
              <p className="acao-efeito-texto acao-efeito-parcial">
                {tb.tecnicaParcialIgnoraArmadura}
              </p>
            )}
          </>
        )
      )}

      {/* Tab Resistência */}
      {tab === 'resistencia' && (
        <>
          {/* RF/RM e as forças abaixo travam com temRolagemPendente: sem a
              trava, dava pra rolar, não gostar do resultado, trocar RF↔RM
              (ou mudar a força) e sumir com o d20 pelo useEffect que
              reseta a rolagem nesses casos — reabrindo a chance de rolar
              de novo mesmo sem trocar de aba. */}
          {/* RF/RM na MESMA linha das duas forças (02/09/2026) — eram uma
              fileira própria acima. São o mesmo assunto: o par escolhe QUAL
              resistência, os dois campos dizem os valores dela. */}
          <div className="atacar-row2 com-resist-tipo">
            <div className="teste-resist-tipo">
              <button className="btn-ghost btn-sm polo-btn"
                data-on={resTipo === 'rf' ? 'true' : undefined}
                disabled={temRolagemPendente}
                onClick={() => { setResTipo('rf'); }}>RF</button>
              <button className="btn-ghost btn-sm polo-btn"
                data-on={resTipo === 'rm' ? 'true' : undefined}
                disabled={temRolagemPendente}
                onClick={() => { setResTipo('rm'); }}>RM</button>
            </div>
            <label className="motor-field">
              <span>{tb.forcaDeAtaque}</span>
              <input type="number" min="1" max="20" value={forcaAtaque} disabled={temRolagemPendente}
                className="round"
                onChange={(e) => { setForcaAtaque(_clamp1a20(e.target.value)); setD20(null); }} />
            </label>
            <label className="motor-field">
              <span>
                {tb.forcaDeDefesa}
                <em className="atacar-resist-label">
                  ({resTipo.toUpperCase()}{isPJ ? ` · ${tb.auto}` : ''})
                </em>
              </span>
              <input type="number" min="1" max="20" value={forcaDefesa} disabled={isPJ || temRolagemPendente}
                className="round"
                onChange={(e) => { setForcaDefesa(_clamp1a20(e.target.value)); setD20(null); }} />
            </label>
          </div>
        </>
      )}

      {tab === 'apoio' && (
        magiasApoio.length === 0 ? (
          <p className="atacar-aviso-vazio">{tb.semMagiasDeApoio}</p>
        ) : (
          <>
            <div className="atacar-row2">
              <SelectPill
                label={tb.magiaDeApoio}
                value={apoioIdx}
                disabled={temRolagemPendente}
                onChange={(v) => { setApoioIdx(parseInt(v, 10)); setAlvoApoioIdx(0); setD20(null); }}
                options={magiasApoio.map((m, i) => ({
                  value: i, label: `${m.nome} · ${tb.nivel} ${m.nivel}`,
                }))}
              />
              <SelectPill
                label={tb.alvo}
                value={alvoApoioIdx}
                disabled={temRolagemPendente || alvosApoio.length <= 1}
                onChange={(v) => { setAlvoApoioIdx(parseInt(v, 10)); setD20(null); }}
                options={alvosApoio.map((q, i) => ({
                  value: i,
                  label: q.nome + (mesmoParticipante(q, ator) ? tb.voce : ''),
                }))}
              />
            </div>
            {apoioSel && (
              <div className="acao-item-efeito">
                <strong>{tb.efeito}:</strong>{' '}
                {apoioSel.mod_vb > 0 ? `+${apoioSel.mod_vb}` : apoioSel.mod_vb} {tb.velocidade}
                {' · '}
                {apoioSel.concentracao
                  ? tb.concentracao
                  : apoioSel.rodadas != null
                    ? interpolate(tb.porRodadas, { n: apoioSel.rodadas })
                    : tb.ateOFimDa}
              </div>
            )}
            {apoioSel && apoioSel.concentracao && (
              <p className="acao-karma-line">{tb.avisoConcentracao}</p>
            )}
            {apoioSel && apoioSel.resistencia && resResist === 'resistiu' && (
              <div className="err-msg">{tb.alvoResistiu}</div>
            )}
          </>
        )
      )}

      {tab === 'item' && (
        <>
          {itensConsumiveisAtor.length === 0 ? (
            <p className="atacar-aviso-vazio">
              {tb.semItensConsumiveisNo}
            </p>
          ) : (
            <>
              <div className="atacar-row2">
                <SelectPill
                  label={tb.item}
                  value={itemSlug}
                  onChange={(v) => { setItemSlug(v); setItemQtd(1); }}
                  options={itensConsumiveisAtor.map((it) => ({
                    value: it.slug,
                    label: `${it.nome} ×${it.quantidade}`,
                  }))}
                />
                <QuantityStepper
                  label={tb.quantidade}
                  value={itemQtd}
                  min={1}
                  max={itemSelecionado ? itemSelecionado.quantidade : 1}
                  onChange={setItemQtd}
                />
              </div>
              {itemSelecionado && (itemSelecionado.cat.efeito_positivo || itemSelecionado.cat.efeito_negativo) && (
                <div className="acao-item-efeito">
                  <strong>{itemSelecionado.nome}:</strong>{' '}
                  {[itemSelecionado.cat.efeito_positivo, itemSelecionado.cat.efeito_negativo].filter(Boolean).join(' · ')}
                  {itemQtd > 1 && (
                    <span className="item-qtd-dim">
                      {' '}({interpolate(tb.aplicadoJunto, { qtd: itemQtd })})
                    </span>
                  )}
                </div>
              )}
              {itemSelecionado && !itemSelecionado.cat.efeito_positivo && !itemSelecionado.cat.efeito_negativo && (
                <p className="atacar-aviso-vazio com-margem">
                  {tb.semEfeitoMecanicoSo}
                </p>
              )}
            </>
          )}
        </>
      )}

      {/* Botão segundo dado — crítico */}
      {precisaCritico && (
        <div className="dado-ov-trigger com-margem">
          <div className="motor-critico-aviso"
            style={{ borderLeftColor: tipoCritico === 'alvo' ? '#808080' : '#10b020' }}>
            {tipoCritico === 'alvo'
              ? (tb.absurdoRoleNovamentePara)
              : (tb.falhaCriticaRoleNovamente)}
          </div>
          <button className="btn-ghost btn-sm btn-critico-rolar"
            disabled={dadoCriticoTravado}
            onClick={() => setOverlayAberto('critico')}>
            <i className="ti ti-cube" aria-hidden="true" />
            {d20Critico != null
              ? `d20: ${d20Critico}`
              : (tb.rolarD20DeCritico)}
          </button>
          {resCritico && (
            <span className="dado-ov-trigger-chip"
              style={{ color: tipoCritico === 'alvo' ? '#808080' : '#10b020',
                       borderColor: tipoCritico === 'alvo' ? '#808080' : '#10b020' }}>
              {isEn ? resCritico.en : resCritico.pt}
              {msgCritico && <span className="critico-chip-msg">{msgCritico}</span>}
            </span>
          )}
        </div>
      )}

      {/* Overlay do dado primário */}
      {overlayAberto === 'primario' && ((tab === 'resistencia' || tab === 'apoio') ? alvoResist != null : colunaClamped != null) && (
        <DadoOverlay
          titulo={
            tab === 'arma' ? `${arma ? arma.nome : '?'} → ${alvo ? alvo.nome : '?'}`
            : tab === 'magia' ? `${magia ? magia.nome : '?'} → ${alvo ? alvo.nome : '?'}`
            : tab === 'habilidade' ? `${habilidadeSel ? habilidadeSel.nome : '?'}`
            : tab === 'tecnica_teste' ? `${tecnicaTesteSel ? tecnicaTesteSel.nome : '?'}`
            : `${resTipo === 'rf' ? (tb.resistenciaFisica) : (tb.resistenciaMagica)}`
          }
          subtitulo={
            tab === 'resistencia'
              ? `${tb.forcaDeAtaque}: ${forcaAtaque}`
              : `${tb.colunaDeAcao}: ${colunaClamped}`
          }
          coluna={tab === 'resistencia' ? null : colunaClamped}
          alvoResist={tab === 'resistencia' ? alvoResist : null}
          /* I1 (revisão final): `semCard` NÃO controla card de alvo — controla
             a linha de DETALHE DE DANO do DadoOverlay. A Task 8 tinha
             mudado esta condição pra uma expressão com tecPrecisaAlvo, e
             técnicas de alvo único passaram a anunciar "135% dano"/"Errou"
             numa ativação que não causa dano de arma nenhum. O seletor de
             alvo (C1, acima) é o que a spec pedia ali — não isto. */
          semCard={tab === 'habilidade' || tab === 'tecnica_teste'}
          lang={lang}
          onFechar={() => setOverlayAberto(null)}
          onRolou={({ valor }) => {
            setD20ComReset(valor);
            onRolagemSalvaChange && onRolagemSalvaChange({
              ator: { tipo: ator.tipo, ref_id: ator.ref_id, inst_id: ator.inst_id || null },
              tab, d20: valor, d20_critico: null,
            });
          }}
          onConfirmar={() => setOverlayAberto(null)}
        />
      )}

      {/* Overlay do dado de crítico */}
      {overlayAberto === 'critico' && colunaClamped != null && (
        <DadoOverlay
          titulo={tipoCritico === 'alvo'
            ? (tb.criticoAlvo)
            : (tb.falhaCriticaSiMesmo)}
          subtitulo={`${tb.colunaDeAcao}: ${colunaClamped}`}
          coluna={colunaClamped}
          lang={lang}
          isCritico
          tipoCritico={tipoCritico}
          onFechar={() => setOverlayAberto(null)}
          onRolou={({ valor }) => {
            setD20Critico(valor);
            onRolagemSalvaChange && onRolagemSalvaChange({
              ator: { tipo: ator.tipo, ref_id: ator.ref_id, inst_id: ator.inst_id || null },
              tab, d20, d20_critico: valor,
            });
          }}
          onConfirmar={() => setOverlayAberto(null)}
        />
      )}

      </>
      )}

      {semPA && (
        <div className="acao-karma-line">
          <strong className="neg">{tb.semPaDisponivel}</strong>
        </div>
      )}

      <div className="atacar-footer">
        {/* Botão "Rolar dado" — abre o DadoOverlay (inline com Cancelar/Aplicar).
            I5 (revisão final): modo 'total' NÃO rola dado (spec §6) — o botão
            nem aparece pra essas técnicas, senão o jogador rolava um d20 sem
            nenhum significado e o log sugeria sucesso/fracasso à toa. */}
        {!(tab === 'tecnica_teste' && tecSemDado)
          && ((tab === 'resistencia' || tab === 'apoio') ? alvoResist != null : colunaClamped != null) && (
          <div className="dado-ov-trigger">
            <button className="btn-primary btn-sm" onClick={() => setOverlayAberto('primario')}
              disabled={
                dadoPrimarioTravado ? true
                : tab === 'arma' ? !(arma && alvo)
                : tab === 'magia' ? !magia
                : tab === 'habilidade' ? !habilidadeSel
                : tab === 'tecnica_teste' ? (!tecnicaTesteSel || !tecBloqueio.pode
                    || (tecPrecisaAlvo && tecAlvosEscolhidos.length === 0))
                : tab === 'resistencia' ? alvoResist == null
                : tab === 'apoio' ? alvoResist == null
                : true
              }
              /* Só o ícone do dado (02/09/2026). O rótulo escrito foi pro
                 tooltip DO SISTEMA (.mn-tip, via abrirTip) — o `title` nativo
                 que eu tinha usado aqui destoava de todo o resto do card.
                 O NÚMERO rolado fica na tela: não é rótulo, é o resultado, e
                 este botão é o único lugar do painel que o mostra (o chip ao
                 lado traz o nome do resultado e o dano, nunca o d20 cru). */
              aria-label={rotuloDado}
              onMouseEnter={abrirTip ? (e) => abrirTip(e, rotuloDado) : undefined}
              onMouseLeave={fecharTip || undefined}>
              <i className="ti ti-cube" aria-hidden="true" />
            </button>
            {/* O d20 cru fica FORA do botão (02/09/2026) — dentro dele o
                círculo esticava em pílula. Continua ao lado, que é o único
                lugar do painel onde o valor bruto aparece: o chip vizinho
                traz o nome do resultado e o dano, nunca o dado. */}
            {d20 != null && !empateResist && <b className="dado-ov-trigger-num">{d20}</b>}
            {tab !== 'resistencia' && res && (
              <span className="dado-ov-trigger-chip" style={{ color: res.cor, borderColor: res.cor }}>
                {isEn ? res.en : res.pt}
                {!res.erra && (tab === 'arma' || tab === 'magia') && ` · ${dano} ${tb.dano3}`}
              </span>
            )}
            {tab === 'resistencia' && resResist && (
              <span className={'dado-ov-trigger-chip resist-' + resResist}
                style={{ color: resResist === 'resistiu' ? '#a4cf85' : resResist === 'empate' ? 'var(--gold)' : '#d98a7a',
                         borderColor: 'currentColor' }}>
                {resResist === 'empate'    ? (tb.empateRoleDeNovo2)
                 : resResist === 'resistiu' ? (tb.resistiu)
                                            : (tb.naoResistiu)}
              </span>
            )}
          </div>
        )}
        <div className="atacar-footer-spacer" />
        {/* O "Cancelar" saiu em 02/09/2026. A saída do painel é o X do menu do
            token — que já existe e fecha tudo. O aviso de rolagem pendente
            fica: ele explica por que o X sumiu (menuTravado) e é a única
            mensagem que o Mestre tem naquele estado. */}
        {temRolagemPendente && (
          <span className="acao-travado-aviso">
            {empateResist
              ? (tb.empateRoleOD20)
              : (() => {
                  // i18n-sync (Fase 3.3): o EN não cita o verbo; o {v} some na
                  // interpolação porque a string en não tem o placeholder.
                  const v = tab === 'arma' || tab === 'magia' ? tb.verboAtacar
                          : tab === 'resistencia' ? tb.verboResistir
                          : tb.verboUsar;
                  return interpolate(tb.jaRolouContinueEm, { v });
                })()}
          </span>
        )}
        {foraDeAlcance && (
          <span className="batalha-fora-alcance">
            {interpolate(tb.alvoForaDeAlcance || (isEn
              ? 'Target out of reach ({dist} m - weapon reaches {alc} m)'
              : 'Alvo fora de alcance ({dist} m - a arma alcança {alc} m)'),
              { dist: distanciaAoAlvo, alc: alcanceAcao })}
          </span>
        )}
        {/* Confirmar a ação: só o ícone (02/09/2026). O verbo e o CUSTO (1 PA,
            mais o karma quando é magia) vão pro title — some da tela, mas não
            do alcance do Mestre. O ícone acompanha a aba: espada pra atacar,
            escudo pra resistir, check pra usar; uma espada em "Usar item"
            seria desenho errado. */}
        {(() => {
          const sufKa = custoKarma > 0 ? ` · ${custoKarma} KA` : '';
          const atacando = tab === 'arma' || tab === 'magia';
          const v = atacando ? tb.verboAtacar
                  : tab === 'resistencia' ? tb.verboResistir
                  : tb.verboUsar;
          // REGRA NOVA (revisão final): técnica modo 'total' é ativação
          // livre — 0 PA, refletido no rótulo pra não anunciar um custo que
          // não é debitado (debitarCustoTecnica é quem de fato aplica isto).
          const custoPA = (tab === 'tecnica_teste' && tecSemDado) ? 0 : 1;
          const rotulo = `${v} (${custoPA} PA${sufKa})`;
          const ic = atacando ? 'ti-swords'
                   : tab === 'resistencia' ? 'ti-shield'
                   : 'ti-check';
          return (
            <button className="btn-primary btn-sm atacar-confirmar" disabled={!podeAplicar}
              onClick={aplicar} aria-label={rotulo}
              onMouseEnter={abrirTip ? (e) => abrirTip(e, rotulo) : undefined}
              onMouseLeave={fecharTip || undefined}>
              <i className={'ti ' + ic} aria-hidden="true" />
            </button>
          );
        })()}
      </div>
    </div>
  );
}




/* ============================== [12] BatalhaJogadorView — condução pelo JOGADOR ==============================
   Tela de batalha do lado do Jogador (PJ ativo), montada por FichaComBatalha
   (08-personagens) quando existe uma batalha 'ativa' em que o PJ participa.

   Reaproveita o MESMO motor de ação do Mestre (AcaoPanel + aplicarDanoCascata,
   aplicarEfeitoItemSnapshot, proximoAtivo, mesmoParticipante, ordenarIniciativa),
   mas com quatro diferenças em relação ao ConduzirBatalhaView:
     1. o ator é SEMPRE o PJ do jogador (meuParticipante); os controles de ação
        só aparecem na vez dele (p.atual) e enquanto estiver 'ativo';
     2. a persistência NÃO é `from('batalhas').update` (bloqueado por RLS pro
        jogador) e sim a RPC `atualizar_batalha_jogador` (SECURITY DEFINER);
     3. "Encerrar" = DESISTIR → o status do próprio PJ vira 'desistiu' (não
        encerra a batalha inteira — isso segue sendo ação exclusiva do Mestre);
     4. as pools (EF/EH/AR/KA) dos OUTROS participantes ficam ocultas; só as do
        próprio PJ aparecem.

   Sem realtime próprio: FichaComBatalha já assina a tabela `batalhas` e repassa
   `batalha` atualizado por prop — este componente deriva tudo de props e, após
   cada RPC, a tela se atualiza sozinha quando o evento de realtime chega.
   ============================================================================= */
function BatalhaJogadorView({ batalha, pjAtivoId, lang, onVoltar }) {
  const isEn = lang === 'en';
  const tb = tBat(lang); // i18n-sync (Fase 3.3)
  const [catalogos, setCatalogos] = useState(null);
  const [acaoOpen, setAcaoOpen] = useState(false);
  const [rolagemPendente, setRolagemPendente] = useState(false);
  // Tooltip próprio: os botões do menu do token viraram só ícone (01/09/2026)
  // e sem isto o jogador ficaria com quatro ícones mudos. O Mestre já tinha.
  const [tip, abrirTip, fecharTip, manterTip] = usePortalTooltip(60);

  /* Rolagem feita e não aplicada — PERSISTIDA no PRÓPRIO participante
     (participantes[].rolagem_pendente), não na coluna batalhas.rolagem_pendente
     que o Mestre usa.
     ────────────────────────────────────────────────────────────────────
     Por quê a diferença: o jogador não escreve em `batalhas` (RLS), só passa
     pela RPC atualizar_batalha_jogador — e ela recebe participantes/log/rodada,
     NÃO a coluna de rolagem. Enquanto isso, `salvarRolagem` mandava a rolagem
     pra persistJogador numa chave solta: ela era descartada na montagem da
     RPC, e a chamada ainda saía sem p_participantes. Resultado: a rolagem do
     jogador nunca sobreviveu a trocar de menu nem a recarregar, apesar do
     comentário antigo prometer que sim.

     O jsonb de participantes é o único canal que o jogador tem, e guardar ali
     sai melhor que a coluna: a rolagem passa a ser POR JOGADOR (dois PJs podem
     ter uma pendente ao mesmo tempo, coisa que uma coluna única não comporta)
     e o Mestre enxerga pelo realtime de `participantes`, que ele já assina.

     `rolagemOtimista` é só o eco entre o clique e a volta do realtime.
     Ele sai de cena quando o snapshot novo JÁ carrega o mesmo valor — não a
     cada snapshot que chega. A versão anterior descartava cego, e bastava o
     Mestre gravar enquanto a RPC do jogador estava em voo pro painel exibir
     "ainda não rolou" por alguns centenas de ms: janela pra rolar de novo,
     que é justamente a regra que a persistência existe pra sustentar. */
  const [rolagemOtimista, setRolagemOtimista] = useState(undefined);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  const participantes = (batalha && batalha.participantes) || [];
  const rodada = (batalha && batalha.rodada) || 0;
  const log = (batalha && batalha.log) || [];
  const meuParticipante = participantes.find((p) => p.tipo === 'pj' && p.ref_id === pjAtivoId) || null;
  const current = participantes.find((p) => p.atual) || null;
  const ehMinhaVez = !!(current && meuParticipante && mesmoParticipante(current, meuParticipante));
  const souAtivo = !!(meuParticipante && (meuParticipante.status || 'ativo') === 'ativo');
  // FC "caído por N rodadas" (sem_acoes): mecanicamente igual a incapaz — a vez
  // passa sozinha; o status expira no decremento de Nova Rodada do Mestre.
  const podeAgir = souAtivo && !statusTemEfeito(meuParticipante, 'sem_acoes');

  // Rolagem pendente: o eco otimista manda enquanto existe; caso contrário
  // vale o que está persistido no meu participante (ver o bloco de estado).
  const rolagemPersistida = (meuParticipante && meuParticipante.rolagem_pendente) || null;
  const rolagemSalva = rolagemOtimista !== undefined ? rolagemOtimista : rolagemPersistida;
  // Solta o eco só quando o banco confirmou o MESMO valor. Enquanto não
  // bater, o eco continua — assim um snapshot de outra pessoa (o Mestre
  // agindo) não apaga da tela uma rolagem que o jogador acabou de fazer.
  const _rolagemPersistidaJson = JSON.stringify(rolagemPersistida);
  useEffect(() => {
    setRolagemOtimista((eco) => (
      eco !== undefined && JSON.stringify(eco ?? null) === _rolagemPersistidaJson ? undefined : eco
    ));
  }, [_rolagemPersistidaJson]);
  // Grava/limpa a rolagem no MEU participante dentro de um array de
  // participantes. `null` limpa — toda escrita que APLICA a ação (ou encerra
  // o turno) passa por aqui, no MESMO update, pra rolagem não sobreviver ao
  // uso. Não muta o array recebido.
  const comMinhaRolagem = (arr, r) => (arr || []).map((p) => (
    mesmoParticipante(p, meuParticipante) ? { ...p, rolagem_pendente: r } : p
  ));
  const salvarRolagem = (r) => {
    setRolagemOtimista(r);
    persistJogador({ participantes: comMinhaRolagem(participantes, r) });
  };

  // Auto-passe: quando o personagem incapaz (morto/desmaiado/desistiu) tem
  // atual: true, passa a vez automaticamente para não travar a batalha.
  // Depende de catalogos estar carregado (handlePassar usa participantes,
  // mas persistJogador só deve rodar depois que o catálogo chegou).
  const autoPassRef = React.useRef(false);
  useEffect(() => {
    if (!ehMinhaVez || podeAgir || !current || !catalogos) {
      autoPassRef.current = false; // reset quando a condição some
      return;
    }
    if (autoPassRef.current) return; // já passou neste ciclo
    autoPassRef.current = true;
    // Pequeno delay p/ garantir que o estado do realtime se estabilizou
    const t = setTimeout(() => { handlePassar(); }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [ehMinhaVez, podeAgir, current?.inst_id, !!catalogos]);

  // Catálogos p/ o AcaoPanel. RLS: o jogador só lê o PRÓPRIO PJ em `personagens`
  // (por isso .eq('id', pjAtivoId)); itens/magias/tecnicas/habilidades/criaturas
  // são catálogos públicos (SELECT all). Só o ator (meu PJ) precisa aqui.
  useEffect(() => {
    if (!batalha || batalha.estado !== 'ativa') return;
    let cancel = false;
    (async () => {
      const criIds = participantes.filter((p) => p.tipo === 'criatura').map((p) => p.ref_id);
      const [pjRes, itRes, magRes, tecRes, habRes, criRes] = await Promise.all([
        pjAtivoId ? supabaseClient.from('personagens').select('*').eq('id', pjAtivoId) : Promise.resolve({ data: [] }),
        fetchCatalogoCompleto(),
        supabaseClient.from('magias').select('*'),
        supabaseClient.from('tecnicas').select('*'),
        supabaseClient.from('habilidades').select('*'),
        criIds.length ? supabaseClient.from('criaturas').select('*').in('id', criIds) : Promise.resolve({ data: [] }),
      ]);
      if (cancel) return;
      const cat = { pjById: {}, criById: {}, catalogoBySlug: {}, magiasByKey: {}, tecnicasByKey: {}, habilidadesByKey: {}, habilidadesDb: habRes.data || [] };
      (pjRes.data  || []).forEach((p) => { cat.pjById[p.id] = p; });
      (itRes.data  || []).forEach((it) => { cat.catalogoBySlug[it.slug] = it; });
      (magRes.data || []).forEach((m) => { cat.magiasByKey[m.key] = m; });
      (tecRes.data || []).forEach((t) => { cat.tecnicasByKey[t.key] = t; });
      (habRes.data || []).forEach((h) => { cat.habilidadesByKey[h.key] = h; });
      (criRes.data || []).forEach((c) => { cat.criById[c.id] = c; });
      setCatalogos(cat);
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line
  }, [batalha && batalha.id, pjAtivoId]);

  // Persistência do jogador — via RPC (não pode escrever direto em `batalhas`).
  const persistJogador = async (campos) => {
    if (!batalha) return false;
    setSalvando(true); setErro(null);
    const { data, error } = await supabaseClient.rpc('atualizar_batalha_jogador', {
      p_batalha_id: batalha.id,
      p_participantes: campos.participantes,
      p_log: (campos.log != null ? campos.log : null),
      p_rodada: (campos.rodada != null ? campos.rodada : null),
    });
    setSalvando(false);
    if (error || (data && data.ok === false)) {
      const motivo = (data && data.motivo) || (error && error.message) || (tb.falhaAoSalvar);
      setErro(motivo);
      return false;
    }
    setAcaoOpen(false);
    return true;
    // Sem update local: o realtime de FichaComBatalha traz o novo snapshot.
  };

  // Passa a vez automaticamente quando o participante referenciado ficou
  // incapaz (morto / desmaiado / desistiu) ou zerou PA — espelha o Mestre.
  /* Passa a vez quando o ator terminou o turno. Se ele era o ÚLTIMO da ordem,
     VIRA a rodada (30/08/2026) em vez de devolver todo mundo com `atual`
     falso — antes a batalha ficava sem ninguém na vez até alguém clicar.
     Devolve `rodadaNova` para o chamador incluir na persistência (null quando
     a rodada não virou) e `eventos`, o dano por rodada que a virada cobrou —
     que o chamador PRECISA passar por registrarViradaNoLog, senão a mordida
     do veneno acontece nas pools sem aparecer no log nem na mesa. */
  const autoPassarSeNecessario = (arr, ref) => {
    const idx = arr.findIndex((p) => mesmoParticipante(p, ref));
    const vazio = { participantes: arr, rodadaNova: null, eventos: [] };
    if (idx < 0) return vazio;
    const a = arr[idx];
    const incapaz = a.status === 'morto' || a.status === 'desmaiado' || a.status === 'desistiu';
    if (!(a.atual && (a.pa_rest === 0 || incapaz || statusTemEfeito(a, 'sem_acoes')))) {
      return vazio;
    }
    const prox = proximoAtivo(arr, a.ordem);
    if (prox) {
      return {
        participantes: arr.map((p) => ({ ...p, atual: mesmoParticipante(p, prox) })),
        rodadaNova: null, eventos: [],
      };
    }
    const { participantes, eventos } = montarNovaRodada(arr);
    return { participantes, rodadaNova: rodada + 1, eventos };
  };

  /* Registra no log (e avisa a mesa) o dano por rodada de uma virada.
     Devolve o log novo — igual ao recebido quando ninguém sangrou. Mesma
     saída do handlePassar e do novaRodada do Mestre, agora numa função só
     porque os quatro handle* passaram a precisar dela também. */
  const registrarViradaNoLog = (logBase, eventos, novaR) => {
    const entrada = entradaLogViradaRodada(eventos, novaR);
    if (!entrada) return logBase;
    const historiaId = batalha && batalha.historia_id;
    if (historiaId) {
      supabaseClient.rpc('registrar_evento_mesa', {
        p_historia_id: historiaId,
        p_tipo: 'sistema',
        p_texto: `Rodada ${novaR}: ${entrada.texto}`,
        p_meta: { batalha_id: batalha.id, rodada: novaR, dano_por_rodada: eventos },
      }).then(({ error: rpcErr }) => {
        if (rpcErr) console.error('[batalha-jogador] registrar_evento_mesa (rodada) falhou:', rpcErr);
      });
    }
    return [...logBase, entrada];
  };

  // ── Ação (arma/magia) — espelha aplicarAcao do Mestre, ator = meu PJ ──
  const handleAcao = (payload) => {
    if (!ehMinhaVez || !meuParticipante) return;
    const { tipo, arma, magia, tecnica, alvo, coluna, d20, resultado, dano, custo_karma,
            d20_critico, res_critico, tipo_critico, tipo_critico_arma, msg_critico } = payload;
    const critico = !!(resultado && resultado.critico);
    const alvoIdx = participantes.findIndex((p) => mesmoParticipante(p, alvo));
    const atorIdx = participantes.findIndex((p) => mesmoParticipante(p, meuParticipante));
    if (alvoIdx < 0 || atorIdx < 0) return;

    let next = [...participantes];
    // Guarda a rodada nova de QUALQUER um dos dois auto-passar abaixo: se o
    // turno acabou no último da ordem, a persistência precisa levar o número
    // novo junto, senão o participante vira mas o contador fica para trás.
    let rodadaNova = null;
    // Idem pro dano por rodada cobrado na virada: sai no MESMO log da ação.
    // Hoje só o auto-passar do ATOR chega a virar a rodada (a lista de alvos
    // exclui o próprio ator, então o alvo nunca é o `atual`), mas acumular os
    // dois custa nada e não depende dessa regra continuar valendo.
    let eventosVirada = [];
    // Atacar quebra a concentração de quem ataca — espelha aplicarAcao.
    next = [...quebrarConcentracao(next, next[atorIdx].inst_id)];
    if (dano > 0) {
      const alvoAntes = next[alvoIdx];
      // Fase 2: além do crítico, o golpe pode furar EH e/ou AR por técnica
      // (ignora_eh, ignora_armadura) ou por condição do alvo (derrubado).
      // Esquiva anula o golpe inteiro — dano ZERO mesmo com crítico ou
      // ignora_eh: esquivar é não ser atingido (ver consumirEvitaGolpe).
      const esq = consumirEvitaGolpe(alvoAntes);
      if (esq.evitou) {
        next[alvoIdx] = esq.participante;   // dano nenhum, status consumido
      } else {
        const modsG = modsDoGolpe(next[atorIdx], alvoAntes);
        next[alvoIdx] = aplicarDanoCascata(dano, alvoAntes, { critico, ...modsG });
      }
      // Dano que FURA até a EF quebra a concentração do alvo; contido em EH
      // ou AR, não. Zerar a EH desmaia, e desmaiar quebra — espelha
      // aplicarAcao via quebrarConcentracaoPorDano.
      next = [...quebrarConcentracaoPorDano(next, alvoAntes, next[alvoIdx])];
      // Se o ALVO ficou morto/desmaiado e era o atual, passa a vez dele
      const rAlvo = autoPassarSeNecessario(next, next[alvoIdx]);
      next = rAlvo.participantes;
      if (rAlvo.rodadaNova != null) rodadaNova = rAlvo.rodadaNova;
      if (rAlvo.eventos.length) eventosVirada = [...eventosVirada, ...rAlvo.eventos];
    }
    const k = Math.max(0, custo_karma || 0);
    next[atorIdx] = { ...next[atorIdx], pa_rest: Math.max(0, (next[atorIdx].pa_rest || 0) - 1), karma: Math.max(0, (next[atorIdx].karma || 0) - k) };
    // Falha Crítica (q=0): consequência no PRÓPRIO atacante — espelha o Mestre (Fase 1.1).
    let danoSelf = 0;
    if (tipo_critico === 'self' && res_critico) {
      const fc = aplicarFalhaCritica(next[atorIdx], tipo === 'magia' ? magia : arma, res_critico.q);
      next[atorIdx] = fc.participante;
      danoSelf = fc.dano;
    }
    // Se o ATOR zerou PA, ficou incapaz OU está sem ações (FC caído), passa a vez também
    const rAtor = autoPassarSeNecessario(next, next[atorIdx]);
    next = rAtor.participantes;
    if (rAtor.rodadaNova != null) rodadaNova = rAtor.rodadaNova;
    if (rAtor.eventos.length) eventosVirada = [...eventosVirada, ...rAtor.eventos];

    const nomeAcao = tipo === 'magia' ? (magia && magia.nome) : (arma && arma.nome);
    const entry = {
      rodada, ts: Date.now(),
      autor_tipo: meuParticipante.tipo, autor_ref_id: meuParticipante.ref_id, autor_nome: meuParticipante.nome,
      acao: tipo, alvo_tipo: alvo.tipo, alvo_ref_id: alvo.ref_id, alvo_nome: alvo.nome,
      arma_nome: nomeAcao, coluna, d20,
      resultado: resultado ? resultado.codigo : null,
      resultado_nome: resultado ? resultado.pt : null,
      dano, critico,
      ...(tipo_critico ? {
        d20_critico, critico_tipo: tipo_critico, critico_arma_tipo: tipo_critico_arma,
        dano_self: danoSelf || undefined,
        critico_resultado: res_critico ? res_critico.codigo : null,
        critico_resultado_nome: res_critico ? res_critico.pt : null,
        critico_q: res_critico ? res_critico.q : null, critico_msg: msg_critico || null,
      } : {}),
      ...(tipo === 'magia' ? { magia_key: magia.key, magia_nivel: magia.nivel, custo_karma: k } : {}),
      ...(tecnica ? { tecnica_key: tecnica.key, tecnica_nome: tecnica.nome, tecnica_efeito: tecnica.efeito || null } : {}),
    };

    // Notifica a Central de Mensagens da Mesa (fire-and-forget — mesmo padrão do Mestre).
    const historiaId = batalha && batalha.historia_id;
    if (historiaId) {
      const resultadoNome = resultado ? resultado.pt : null;
      let texto;
      if (tipo === 'magia') {
        texto = `${meuParticipante.nome} conjurou ${nomeAcao} em ${alvo.nome}`;
        if (resultadoNome) texto += ` → ${resultadoNome}`;
        if (dano > 0)      texto += ` (${dano} de dano)`;
        if (msg_critico)   texto += `. ${msg_critico}`;
      } else {
        texto = `${meuParticipante.nome} atacou ${alvo.nome} com ${nomeAcao || 'arma'}`;
        if (resultadoNome) texto += ` → ${resultadoNome}`;
        if (dano > 0)      texto += ` (${dano} de dano)`;
        if (msg_critico)   texto += `. ${msg_critico}`;
      }
      supabaseClient.rpc('registrar_evento_mesa', {
        p_historia_id: historiaId,
        p_tipo: tipo === 'magia' ? 'magia' : 'ataque',
        p_texto: texto,
        p_meta: {
          batalha_id:     batalha.id,
          rodada,
          autor_nome:     meuParticipante.nome,
          alvo_nome:      alvo.nome,
          acao_nome:      nomeAcao,
          coluna,         d20,
          resultado:      resultado ? resultado.codigo : null,
          resultado_q:    resultado ? resultado.q      : null,
          dano,
          critico:        critico || undefined,
          ...(tipo_critico ? {
            d20_critico,
            critico_tipo:      tipo_critico,
            critico_resultado: res_critico ? res_critico.codigo : null,
            critico_q:         res_critico ? res_critico.q      : null,
            critico_msg:       msg_critico || undefined,
          } : {}),
          ...(tipo === 'magia' ? { magia_key: magia.key, custo_karma: k } : {}),
        },
      }).then(({ error: rpcErr }) => {
        if (rpcErr) console.error('[batalha-jogador] registrar_evento_mesa (ataque) falhou:', rpcErr);
      });
    }

    // Aplicou → a rolagem sai junto, no MESMO update (comMinhaRolagem(…, null)).
    persistJogador({ participantes: comMinhaRolagem(next, null),
      // Se a ação virou a rodada, o dano por rodada que ela cobrou entra no
      // MESMO log — senão a EF cai sozinha, sem nada explicando.
      log: registrarViradaNoLog([...log, entry], eventosVirada, rodadaNova),
      ...(rodadaNova != null ? { rodada: rodadaNova } : {}) });
  };

  // ── Teste (habilidade/técnica/resistência) — espelha aplicarTeste ──
  const handleTeste = (payload) => {
    if (!ehMinhaVez || !meuParticipante) return;
    const { tipo_teste } = payload;
    const idx = participantes.findIndex((p) => mesmoParticipante(p, meuParticipante));
    if (idx < 0) return;
    let next = [...participantes];
    // Testar é uma ação: quebra a concentração — espelha aplicarTeste.
    next = [...quebrarConcentracao(next, next[idx].inst_id)];
    // REGRA NOVA (revisão final): técnica modo 'total' é ativação LIVRE — 0
    // PA, marca a flag em vez de debitar. Espelha aplicarTeste (Mestre).
    next[idx] = (tipo_teste === 'tecnica' && payload.tecnica)
      ? debitarCustoTecnica(next[idx], payload.tecnica.key)
      : { ...next[idx], pa_rest: Math.max(0, (next[idx].pa_rest || 0) - 1) };

    // Fase 1 das técnicas: aplica o efeito mecânico.
    //   modo 'total' → aplica sempre (não há dado).
    //   modo 'teste' → só no sucesso (o resultado já veio resolvido no payload).
    // Aparece nas DUAS cópias de aplicarTeste porque o Mestre e o Jogador têm
    // handlers separados; a REGRA mora em aplicarEfeitoTecnica, aqui é só a
    // chamada. Ver batalha.jsx:5517 pro precedente de cópia dessincronizada.
    let efeitoTecnicaAplicado = null;
    if (tipo_teste === 'tecnica' && payload.tecnica) {
      const reg = tecnicaEfeitoDe(payload.tecnica.key);
      const passou = payload.sem_dado
        || (payload.resultado && payload.resultado.q >= D20_QUALIDADE_MINIMA[reg && reg.dificuldade]);
      if (reg && passou) {
        // Lista vazia = alvo é o próprio testador ('self').
        const destinos = (payload.alvos_efeito && payload.alvos_efeito.length)
          ? payload.alvos_efeito.slice(0, reg.maxAlvos || payload.alvos_efeito.length)
          : [next[idx]];
        const atingidos = [];
        destinos.forEach((destino) => {
          const dIdx = next.findIndex((p) => mesmoParticipante(p, destino));
          if (dIdx < 0) return;
          next[dIdx] = aplicarEfeitoTecnica(next[dIdx], payload.tecnica, payload.valor_total);
          atingidos.push(next[dIdx].nome);
        });
        // O uso Único é do ATOR, mesmo quando o efeito cai só nos outros.
        next[idx] = marcarTecnicaUsada(next[idx], payload.tecnica.key);
        if (atingidos.length) {
          efeitoTecnicaAplicado = {
            key: payload.tecnica.key, valor: payload.valor_total, alvos: atingidos,
          };
        }
      }
    }

    const rVez = autoPassarSeNecessario(next, meuParticipante);
    next = rVez.participantes;
    const rodadaNova = rVez.rodadaNova;
    const eventosVirada = rVez.eventos;

    const base = { rodada, ts: Date.now(), autor_tipo: meuParticipante.tipo, autor_ref_id: meuParticipante.ref_id, autor_nome: meuParticipante.nome, acao: 'teste', tipo_teste, d20: payload.d20 };
    const entry = (tipo_teste === 'resistencia')
      ? { ...base, resistencia_tipo: payload.resistencia_tipo, forca_ataque: payload.forca_ataque, forca_defesa: payload.forca_defesa, alvo_resist: payload.alvo_resist, resultado: payload.resultado }
      : { ...base, chave: payload.chave, nome: payload.nome, coluna: payload.coluna, resultado: payload.resultado ? payload.resultado.codigo : null, resultado_nome: payload.resultado ? payload.resultado.pt : null, critico: !!(payload.resultado && payload.resultado.critico), tecnica_efeito_aplicado: efeitoTecnicaAplicado };

    // Notifica a Central de Mensagens da Mesa (fire-and-forget — mesmo padrão do Mestre).
    const historiaId = batalha && batalha.historia_id;
    if (historiaId) {
      let texto;
      if (tipo_teste === 'resistencia') {
        const resLabel = payload.resultado === 'resistiu' ? 'Resistiu'
          : payload.resultado === 'falhou' ? 'Não resistiu' : 'Empate — role de novo';
        texto = `${meuParticipante.nome} testou resistência (${(payload.resistencia_tipo || '').toUpperCase()}) → ${resLabel} (d20 ${payload.d20})`;
      } else {
        const resNome = payload.resultado ? payload.resultado.pt : null;
        texto = `${meuParticipante.nome} usou ${payload.nome || payload.chave}`;
        if (resNome) texto += ` → ${resNome}`;
        // Técnica modo 'total' não rola d20 (payload.d20 fica null) — omite o
        // trecho do dado pra não virar "d20 null" na Central de Mensagens.
        // Duplicado no handler do Mestre acima; mantenha os dois iguais.
        texto += payload.d20 == null ? ` (col ${payload.coluna})` : ` (col ${payload.coluna}, d20 ${payload.d20})`;
        // Lacuna relatada em mesa: sem isto a mensagem só dizia o resultado do
        // dado, e "Falha Crítica" ficava indistinguível de "sem automação" —
        // ver textoEfeitoTecnica. Duplicado no handler do Mestre; mantenha os
        // dois iguais.
        if (tipo_teste === 'tecnica' && payload.tecnica) {
          texto += textoEfeitoTecnica(payload.tecnica.key, efeitoTecnicaAplicado, meuParticipante.nome);
        }
      }
      supabaseClient.rpc('registrar_evento_mesa', {
        p_historia_id: historiaId,
        p_tipo: 'teste',
        p_texto: texto,
        p_meta: {
          batalha_id: batalha.id,
          rodada,
          testador_nome: meuParticipante.nome,
          tipo_teste,
          d20: payload.d20,
          ...(tipo_teste === 'resistencia' ? {
            resistencia_tipo: payload.resistencia_tipo,
            forca_ataque:     payload.forca_ataque,
            forca_defesa:     payload.forca_defesa,
            resultado:        payload.resultado,
          } : {
            chave:       payload.chave,
            nome:        payload.nome,
            coluna:      payload.coluna,
            resultado:   payload.resultado ? payload.resultado.codigo : null,
            resultado_q: payload.resultado ? payload.resultado.q      : null,
          }),
        },
      }).then(({ error: rpcErr }) => {
        if (rpcErr) console.error('[batalha-jogador] registrar_evento_mesa (teste) falhou:', rpcErr);
      });
    }

    // Aplicou → a rolagem sai junto, no MESMO update (comMinhaRolagem(…, null)).
    persistJogador({ participantes: comMinhaRolagem(next, null),
      // Se a ação virou a rodada, o dano por rodada que ela cobrou entra no
      // MESMO log — senão a EF cai sozinha, sem nada explicando.
      log: registrarViradaNoLog([...log, entry], eventosVirada, rodadaNova),
      ...(rodadaNova != null ? { rodada: rodadaNova } : {}) });
  };

  // ── Item — espelha aplicarItem (inclui baixa no PRÓPRIO inventário, RLS ok) ──
  const handleItem = (payload) => {
    if (!ehMinhaVez || !meuParticipante) return;
    const { instanceId, slug, nome, quantidade } = payload;
    const idx = participantes.findIndex((p) => mesmoParticipante(p, meuParticipante));
    if (idx < 0) return;
    const cat = (catalogos && catalogos.catalogoBySlug) ? catalogos.catalogoBySlug[slug] : null;
    const qtd = Math.max(1, Number(quantidade) || 1);

    let next = [...participantes];
    // Usar item é uma ação: quebra a concentração — espelha aplicarItem.
    next = [...quebrarConcentracao(next, next[idx].inst_id)];
    next[idx] = aplicarEfeitoItemSnapshot(next[idx], cat, qtd);
    next[idx] = { ...next[idx], pa_rest: Math.max(0, (next[idx].pa_rest || 0) - 1) };
    const rVez = autoPassarSeNecessario(next, meuParticipante);
    next = rVez.participantes;
    const rodadaNova = rVez.rodadaNova;
    const eventosVirada = rVez.eventos;

    const entry = { rodada, ts: Date.now(), autor_tipo: meuParticipante.tipo, autor_ref_id: meuParticipante.ref_id, autor_nome: meuParticipante.nome, acao: 'item', item_slug: slug, item_nome: nome, quantidade: qtd, efeito_positivo: cat ? (cat.efeito_positivo || null) : null, efeito_negativo: cat ? (cat.efeito_negativo || null) : null };

    // Notifica a Central de Mensagens da Mesa (fire-and-forget — mesmo padrão do Mestre).
    const historiaId = batalha && batalha.historia_id;
    if (historiaId) {
      const texto = `${meuParticipante.nome} usou ${nome}`;
      supabaseClient.rpc('registrar_evento_mesa', {
        p_historia_id: historiaId,
        p_tipo: 'item',
        p_texto: texto,
        p_meta: { batalha_id: batalha.id, rodada, autor_nome: meuParticipante.nome, item_nome: nome, quantidade: qtd },
      }).then(({ error: rpcErr }) => {
        if (rpcErr) console.error('[batalha-jogador] registrar_evento_mesa (item) falhou:', rpcErr);
      });
    }

    // Consumo real no PRÓPRIO inventário (personagens RLS: user_id = auth.uid()).
    // Só o inventário — espelha aplicarItem do Mestre. Condição e vitalidade
    // do combate esperam o encerramento (decisão de 01/09/2026).
    consumirItemDoPJ(meuParticipante.ref_id, slug, qtd).then((r) => {
      if (!r.ok) { console.error('[batalha-jogador] consumo de item falhou:', r.error); return; }
      const cache = catalogos && catalogos.pjById && catalogos.pjById[meuParticipante.ref_id];
      if (cache) catalogos.pjById[meuParticipante.ref_id] = { ...cache, inventario: r.inventario };
    });
    // Aplicou → a rolagem sai junto, no MESMO update (comMinhaRolagem(…, null)).
    persistJogador({ participantes: comMinhaRolagem(next, null),
      // Se a ação virou a rodada, o dano por rodada que ela cobrou entra no
      // MESMO log — senão a EF cai sozinha, sem nada explicando.
      log: registrarViradaNoLog([...log, entry], eventosVirada, rodadaNova),
      ...(rodadaNova != null ? { rodada: rodadaNova } : {}) });
  };

  // ── Passar a vez — espelha passarVez/novaRodada ──
  /* TABULEIRO (lado Jogador): o jogador só mexe no PRÓPRIO token, e só na
     vez dele — as duas guardas ficam no podeSelecionar/onMover, e a regra
     de custo é a mesma moverParticipante do Mestre. */
  // ── Apoio — espelha aplicarApoio do Mestre ──
  const handleApoio = (payload) => {
    if (!ehMinhaVez || !meuParticipante) return;
    const { ator, alvo, magia, custo_karma, resistencia, d20, resistiu } = payload;
    const atorIdx = participantes.findIndex((q) => mesmoParticipante(q, ator));
    const alvoIdx = participantes.findIndex((q) => mesmoParticipante(q, alvo));
    if (atorIdx < 0 || alvoIdx < 0) return;

    // Lançar magia derruba a concentração anterior deste conjurador.
    let next = [...quebrarConcentracao(participantes, participantes[atorIdx].inst_id)];

    const k = Math.max(0, custo_karma || 0);
    next[atorIdx] = {
      ...next[atorIdx],
      pa_rest: Math.max(0, (next[atorIdx].pa_rest || 0) - 1),
      karma:   Math.max(0, (next[atorIdx].karma   || 0) - k),
    };
    if (!resistiu) {
      next[alvoIdx] = aplicarEfeitoApoio(next[alvoIdx], magia, next[atorIdx].inst_id);
    }
    const rVez = autoPassarSeNecessario(next, next[atorIdx]);
    next = rVez.participantes;
    const rodadaNova = rVez.rodadaNova;
    const eventosVirada = rVez.eventos;

    const entry = {
      rodada, ts: Date.now(),
      autor_tipo: meuParticipante.tipo, autor_ref_id: meuParticipante.ref_id,
      autor_nome: meuParticipante.nome,
      acao: 'apoio',
      alvo_tipo: alvo.tipo, alvo_ref_id: alvo.ref_id, alvo_nome: alvo.nome,
      magia_key: magia.key, magia_nivel: magia.nivel, arma_nome: magia.nome,
      mod_vb: magia.mod_vb, rodadas: magia.rodadas,
      concentracao: !!magia.concentracao,
      custo_karma: k,
      ...(resistencia ? { resistencia, d20, resistiu: !!resistiu } : {}),
    };

    const historiaId = batalha && batalha.historia_id;
    if (historiaId) {
      const sinal = magia.mod_vb > 0 ? '+' : '';
      const texto = resistiu
        ? `${meuParticipante.nome} lançou ${magia.nome} em ${alvo.nome} — resistiu`
        : `${meuParticipante.nome} lançou ${magia.nome} em ${alvo.nome} (${sinal}${magia.mod_vb} de velocidade)`;
      supabaseClient.rpc('registrar_evento_mesa', {
        p_historia_id: historiaId,
        p_tipo: 'magia',
        p_texto: texto,
        p_meta: { batalha_id: batalha.id, ...entry },
      }).then(({ error: rpcErr }) => {
        if (rpcErr) console.error('[batalha-jogador] registrar_evento_mesa (apoio) falhou:', rpcErr);
      });
    }

    // Aplicou → a rolagem sai junto, no MESMO update (comMinhaRolagem(…, null)).
    persistJogador({ participantes: comMinhaRolagem(next, null),
      // Se a ação virou a rodada, o dano por rodada que ela cobrou entra no
      // MESMO log — senão a EF cai sozinha, sem nada explicando.
      log: registrarViradaNoLog([...log, entry], eventosVirada, rodadaNova),
      ...(rodadaNova != null ? { rodada: rodadaNova } : {}) });
  };

  const moverNoTabuleiroJogador = (p, idx, destino) => {
    if (salvando || !meuParticipante || !mesmoParticipante(p, meuParticipante)) return false;
    if (!ehMinhaVez) { setErro(motivoMovimento('nao_e_a_vez', isEn)); return false; }
    const r = moverParticipante(p, destino, participantes);
    if (!r.ok) { setErro(motivoMovimento(r.motivo, isEn)); return false; }
    // Ver moverNoTabuleiro: mover não gasta PA nem encerra o turno, mas
    // QUEBRA a concentração (01/09/2026).
    const movido = participantes.map((q, i) => (i === idx ? r.participante : q));
    const next = [...quebrarConcentracao(movido, p.inst_id)];
    setErro(null);
    persistJogador({ participantes: next });
    return true;
  };

  const handlePassar = () => {
    if (!ehMinhaVez || !current) return;

    // Notifica a Central de Mensagens da Mesa (fire-and-forget).
    const historiaId = batalha && batalha.historia_id;
    if (historiaId && meuParticipante) {
      supabaseClient.rpc('registrar_evento_mesa', {
        p_historia_id: historiaId,
        p_tipo: 'sistema',
        p_texto: `${meuParticipante.nome} passou a vez`,
        p_meta: { batalha_id: batalha.id, rodada, autor_nome: meuParticipante.nome },
      }).then(({ error: rpcErr }) => {
        if (rpcErr) console.error('[batalha-jogador] registrar_evento_mesa (passar) falhou:', rpcErr);
      });
    }

    // Passar encerra o turno: a rolagem feita e não aplicada morre com ele.
    const participantesLimpos = comMinhaRolagem(participantes, null);
    const prox = proximoAtivo(participantesLimpos, current.ordem);
    if (prox) {
      const next = participantesLimpos.map((p) => ({ ...p, atual: mesmoParticipante(p, prox) }));
      persistJogador({ participantes: next });
    } else {
      // deu a volta → nova rodada — MESMA virada consolidada do Mestre
      // (Fase 1.2): dano por rodada + decremento + iniciativa efetiva.
      // (Antes esta cópia nem decrementava status_temp — inconsistência corrigida.)
      const { participantes: next, eventos } = montarNovaRodada(participantesLimpos);
      const novaR = rodada + 1;
      persistJogador({
        participantes: next,
        log: registrarViradaNoLog(log, eventos, novaR),
        rodada: novaR,
      });
    }
  };

  // ── Encerrar (desistir) — status do próprio PJ vira 'desistiu' ──
  const handleDesistir = () => {
    if (!meuParticipante) return;
    // MESMA regra do Mestre (mudarStatus): muda o status, derruba a magia
    // que o PJ sustentava e libera a vez. Antes esta cópia não fazia nem uma
    // nem outra — e quando o desistente era o ÚLTIMO da ordem, zerava o
    // `atual` de todos e a batalha ficava sem ninguém na vez (softlock).
    const r = saidaDeCombate(participantes, meuParticipante, 'desistiu');
    if (r.participantes === participantes) return;  // não achou o PJ na lista
    // Sair da batalha também mata a rolagem feita e não aplicada.
    let next = comMinhaRolagem(r.participantes, null);
    let rodadaNova = null;
    if (r.viraRodada) {                             // era o último → vira a rodada
      next = montarNovaRodada(next).participantes;
      rodadaNova = rodada + 1;
    }

    // Notifica a Central de Mensagens da Mesa (fire-and-forget).
    const historiaId = batalha && batalha.historia_id;
    if (historiaId) {
      supabaseClient.rpc('registrar_evento_mesa', {
        p_historia_id: historiaId,
        p_tipo: 'aviso',
        p_texto: `${meuParticipante.nome} desistiu da batalha`,
        p_meta: { batalha_id: batalha.id, rodada, autor_nome: meuParticipante.nome },
      }).then(({ error: rpcErr }) => {
        if (rpcErr) console.error('[batalha-jogador] registrar_evento_mesa (desistir) falhou:', rpcErr);
      });
    }

    persistJogador({ participantes: next, ...(rodadaNova != null ? { rodada: rodadaNova } : {}) });
  };

  // poolBar local (sem a maquinaria de tooltip do ConduzirBatalhaView).
  const poolBar = (label, v, max) => {
    const span = max || 0;
    const pct = span > 0 ? Math.max(0, Math.min(100, (v / span) * 100)) : 0;
    const ic = label === 'AR' ? 'ti-shield' : label === 'KA' ? 'ti-sparkle-highlight' : 'ti-heart';
    return (
      <div key={label} className={'batalha-pool pool-' + label.toLowerCase()}>
        <span className="batalha-pool-label"><i className={'ti ' + ic} aria-hidden="true" /></span>
        <span className="batalha-pool-bar"><i style={{ width: pct + '%' }} /></span>
      </div>
    );
  };

  const nomeStatus = (s) => {
    const st = s || 'ativo';
    // i18n-sync (Fase 3.3): rótulos de status via COPY[lang].batalha
    const map = {
      ativo: tb.statusAtivo, passou: tb.statusPassou, desmaiado: tb.statusDesmaiado,
      morto: tb.statusMorto, desistiu: tb.statusDesistiu,
    };
    return map[st] || st;
  };

  return (
    <div className="menestrel-ui fp-page batalha-jog-root">
      <div className="fp-card batalha-jog-card">
        <div className="fp-card-top">
          <header className="ms-header ficha-page-header">
        <button type="button" className="btn-icon btn-sm" onClick={onVoltar}
          aria-label={tb.voltarAFicha}>
          <i className="ti ti-arrow-left" />
        </button>
        <div className="fp-flex-fill">
          <div className="ficha-page-eyebrow">
            <i className="ti ti-swords" aria-hidden="true" />
            {tb.batalha} · {tb.rodada} {rodada}
          </div>
          <h2 className="ms-title" style={{ margin: 0 }}>
            {meuParticipante ? meuParticipante.nome : (tb.batalha)}
          </h2>
        </div>
        {/* Ação/Passar/Desistir saíram do header (30/08/2026): as três agem
            sobre o próprio PJ, então vivem no menu do avatar dele — mesmo
            princípio da tela do Mestre. */}
          </header>
        </div>

      <div className="batalha-jog-body">
        {!catalogos ? (
          <div className="batalha-loading-msg">
            {tb.carregandoBatalha}
          </div>
        ) : (
          <>
            {/* Mensagem de vez */}
            {!ehMinhaVez && current && (
              <div className="batalha-vez-msg">
                <i className="ti ti-clock btn-ic-mr" aria-hidden="true" style={{ color: '#C9A44E' }} />
                {interpolate(tb.eAVezDe, { nome: current.nome })}
              </div>
            )}
            {/* Tabuleiro: o jogador enxerga todos os tokens, mas só o dele
                é selecionável, e só quando for a vez. */}
            <TabuleiroBatalha
              entradas={participantes.map((p, i) => ({ p, i }))}
              meta={{}}
              podeSelecionar={(p) => !salvando && podeAgir && ehMinhaVez
                && !!meuParticipante && mesmoParticipante(p, meuParticipante)
                && !p.moveu_na_rodada}
              alcanceDe={(p) => (meuParticipante && mesmoParticipante(p, meuParticipante)
                ? (Number.isFinite(p.mov_rest) ? p.mov_rest : movimentoBase(p.vb))
                : null)}
              onMover={moverNoTabuleiroJogador}
              salvando={salvando}
              isEn={isEn}
              tb={tb}
              abrirTip={abrirTip}
              fecharTip={fecharTip}
              aviso={erro}
              menuTravado={rolagemPendente}
              /* Idem card do Jogador — mesma condição do menuDe abaixo. */
              menuVoltar={(p) => (acaoOpen && meuParticipante
                && mesmoParticipante(p, meuParticipante) && ehMinhaVez && souAtivo && catalogos)
                ? () => setAcaoOpen(false) : null}
              menuDe={(p, i, fechar, mover) => {
                const ehEu = meuParticipante && mesmoParticipante(p, meuParticipante);
                // Mesma troca do Mestre: o painel toma o menu do próprio PJ.
                if (acaoOpen && ehEu && ehMinhaVez && souAtivo && catalogos) {
                  return (
                    <AcaoPanel
                      ator={meuParticipante}
                      participantes={participantes}
                      catalogos={catalogos}
                      lang={lang}
                      onAplicar={handleAcao}
                      onAplicarTeste={handleTeste}
                      onAplicarItem={handleItem}
                      onAplicarApoio={handleApoio}
                      onCancel={() => { setAcaoOpen(false); setRolagemPendente(false); }}
                      onRolagemPendenteChange={setRolagemPendente}
                      rolagemSalva={rolagemSalva}
                      onRolagemSalvaChange={salvarRolagem}
                      abrirTip={abrirTip}
                      fecharTip={fecharTip}
                    />
                  );
                }
                return (
                  <div className={'batalha-fighter em-menu status-' + (p.status || 'ativo') + (p.atual ? ' atual' : '')}>
                    <div className="batalha-fighter-main">
                      <div className="batalha-fighter-head">
                        <div className="batalha-fighter-id no-pointer">
                          <span className={'batalha-fighter-status-ic st-' + (p.status || 'ativo')}>
                            {/* 'passou' não existe em STATUS — é um estado que
                                o Jogador nunca recebe do snapshot. Fica fora
                                do mapa; se voltar a existir, entra lá. */}
                            <i className={'ti ' + iconeStatus(p.status || 'ativo')} aria-hidden="true" />
                          </span>
                          <span className={'batalha-fighter-nome' + (ehEu ? ' eu' : '')}>
                            {p.nome || ''}{ehEu ? (tb.voce) : ''}
                          </span>
                        </div>
                        {/* Mesmos ícones do card do Mestre (03/09/2026). O
                            card do Jogador nunca mostrou a defesa; entra
                            agora junto, pra os dois lerem igual. */}
                        <div className="batalha-fighter-stats">
                          <span className="batalha-stat ic"
                            onMouseEnter={(e) => abrirTip(e, (tb.statNome && tb.statNome.vb) || 'VB')}
                            onMouseLeave={fecharTip}>
                            <i className="ti ti-run-sprint" aria-hidden="true" /><b>{p.vb || 0}</b>
                          </span>
                          <span className="batalha-stat ic so-ic"
                            onMouseEnter={(e) => abrirTip(e, `${(tb.statNome && tb.statNome.pa) || tb.pa} · ${p.pa_rest || 0}/${p.pa_max || 0}`)}
                            onMouseLeave={fecharTip}
                            aria-label={`${(tb.statNome && tb.statNome.pa) || tb.pa}: ${p.pa_rest || 0}/${p.pa_max || 0}`}>
                            <i className={'ti ' + iconePA(p.pa_rest)} aria-hidden="true" />
                          </span>
                          <span className="batalha-stat ic"
                            onMouseEnter={(e) => abrirTip(e, (tb.statNome && tb.statNome.df) || tb.df)}
                            onMouseLeave={fecharTip}>
                            <i className="ti ti-shield-half" aria-hidden="true" /><b>{p.defesa_sigla || 'L'}{p.defesa_valor || 0}</b>
                          </span>
                          {/* Estado dos OUTROS combatentes: círculo com ícone,
                              no fim da linha de stats — mesma posição e mesmo
                              desenho que o seletor do Mestre ocupa no card
                              dele. Aqui é só leitura: o jogador não muda o
                              estado de ninguém (o dele sai pelo Desistir), por
                              isso é um <span>, não um <button>. O nome do
                              estado, que era o texto do pill, foi pro tooltip. */}
                          {!ehEu && (
                            <span className="batalha-stat batalha-stat-estado dim"
                              onMouseEnter={(e) => abrirTip(e, nomeStatus(p.status))}
                              onMouseLeave={fecharTip}
                              aria-label={nomeStatus(p.status)}>
                              <i className={'ti ' + iconeStatus(p.status || 'ativo')} aria-hidden="true" />
                            </span>
                          )}
                        </div>
                      </div>
                      {/* As ações do turno só aparecem no próprio token, e só
                          quando é a vez — as mesmas condições que o header
                          usava pra mostrar a fileira. */}
                      {ehEu && ehMinhaVez && souAtivo && (
                        <div className="batalha-menu-acoes">
                          {mover && (
                            <BotaoAcaoMenu icone="ti-footsteps" onClick={mover}
                              rotulo={tb.tabMover || (isEn ? 'Move' : 'Mover')}
                              abrirTip={abrirTip} fecharTip={fecharTip} />
                          )}
                          <BotaoAcaoMenu icone="ti-swords" variante="primary" rotulo={tb.acao}
                            disabled={salvando} onClick={() => setAcaoOpen(true)}
                            abrirTip={abrirTip} fecharTip={fecharTip} />
                          <BotaoAcaoMenu icone="ti-player-skip-forward" rotulo={tb.passar}
                            disabled={salvando} onClick={() => { fechar(); handlePassar(); }}
                            abrirTip={abrirTip} fecharTip={fecharTip} />
                          <BotaoAcaoMenu icone="ti-flag" rotulo={tb.encerrar2}
                            extraClasse="btn-desistir" disabled={salvando}
                            onClick={() => { fechar(); handleDesistir(); }}
                            abrirTip={abrirTip} fecharTip={fecharTip} />
                        </div>
                      )}
                      {/* Pools continuam só do próprio PJ: o jogador vê o token
                          dos outros, mas não os números deles. */}
                      {ehEu && (
                        <div className="batalha-fighter-pools-wrap"><div className="batalha-pools">
                          {poolBar('EF', p.ef, p.ef_max)}
                          {poolBar('EH', p.eh, p.eh_max)}
                          {poolBar('AR', p.ar, p.ar_max)}
                          {poolBar('KA', p.karma, p.karma_max)}
                        </div></div>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            {ehMinhaVez && souAtivo && (
              <div className="batalha-vez-msg minha-vez">
                <i className="ti ti-player-play btn-ic-mr" aria-hidden="true" style={{ color: '#C9A44E' }} />
                {tb.eASuaVez}
              </div>
            )}
            {ehMinhaVez && !souAtivo && meuParticipante && (
              <div className="batalha-vez-msg">
                <i className="ti ti-clock btn-ic-mr" aria-hidden="true" style={{ color: '#C9A44E' }} />
                {interpolate(tb.seuStatusPassando, { status: nomeStatus(meuParticipante.status) })}
              </div>
            )}


            {/* Fora da vez / status não-ativo → sem controles, só o status */}
            {(!souAtivo && meuParticipante) && (
              <div className="batalha-status-inativo">
                {interpolate(tb.seuStatus, { status: nomeStatus(meuParticipante.status) })}
              </div>
            )}
          </>
        )}
      </div>
      </div>
      {/* Tooltip do menu do token (botões só-ícone). Portal, então pode ficar
          no fim da árvore — sai por cima do menu de qualquer jeito. */}
      <PortalTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </div>
  );
}


// MotorBatalha: funções PURAS do motor expostas pra testes (Vitest) — não usar na UI de outras fases.
// ── i18n-sync (Fase 3.3, 07/2026) ─────────────────────────────────
// Strings da UI de batalha vêm de COPY[lang].batalha (padrão 05-convites).
// FORA do i18n por decisão: CRITICOS_TABELA, FALHA_CRITICA_TABELA e os nomes
// de status do FC_EFEITOS — são CONTEÚDO de jogo da camada pura (testada),
// PT-only como o catálogo. Fallback pt cobre COPY ausente (testes Vitest).
function tBat(lang) {
  return (((typeof COPY !== 'undefined' && (COPY[lang] || COPY.pt)) || {}).batalha) || {};
}

Object.assign(window, {
  BatalhasHistoriaView, BatalhaJogadorView,
  // AcaoPanel NÃO entra em MotorBatalha (que é contrato de funções puras):
  // é componente. Exposto à parte pro teste de render softlock-acao.test.jsx,
  // que verifica que o painel nunca fica sem saída com uma rolagem pendente.
  AcaoPanel,
  // Idem: componente, não função pura. A prévia é o único lugar que mostra
  // o clamp de valorPoolEditado ANTES do Aplicar, e edicao-pool.test.js
  // renderiza pra travar isso.
  PreviaPool,
  // montarSnapshots NÃO entra em MotorBatalha: é async e lê o banco, enquanto
  // MotorBatalha é contrato de funções puras. Exposta à parte pro teste de
  // integração snapshot-criatura.test.js, que troca o stub de supabaseClient.
  montarSnapshots,
  // tecnicasCompativeisComArma exposta solta (fora de MotorBatalha) pro
  // teste de regressão do "Livre" em tecnica-efeitos.test.js — ela também
  // vive dentro de MotorBatalha, mas o teste chama via window direto.
  tecnicasCompativeisComArma,
  MotorBatalha: {
    EF_MORTE, pontosAcaoPJ, aplicarDanoCascata, ordenarIniciativa,
    // mesmoParticipante é usado também pelo tabuleiro (12-batalha/tabuleiro.jsx)
    // pra ignorar o próprio token ao testar colisão de célula.
    mesmoParticipante,
    colunaAtaque, danoNoTier, interpolarCritico, CRITICOS_TABELA,
    // Leitura de velocidade do catálogo (01/09/2026): o texto do nível é a
    // fonte, como já acontece com o dano. duracao e descricao completam o
    // quadro (por quantas rodadas, e se o alvo tem direito a resistir).
    modVelocidadeNoNivel, duracaoEmRodadas, exigeResistencia,
    magiasDeApoioDoAtor, aplicarEfeitoApoio, quebrarConcentracao,
    // Fase 1 das técnicas (09/09/2026): grava o efeito da técnica no
    // status_temp. Reaplicar substitui a leva anterior em vez de somar.
    // gruposDeArma é o parser das colunas grupo_armas/grupo_armaduras.
    aplicarEfeitoTecnica, gruposDeArma,
    // Complemento da Central de Mensagens (10/09/2026): extraída dos dois
    // aplicarTeste pra eliminar a dessincronização entre as cópias e pra
    // ficar testável — ver tecnica-efeitos.test.js.
    textoEfeitoTecnica,
    // Task 8: uso Único é uma vez por batalha; o registro fica em
    // tecnicas_usadas, separado do efeito (Voz de Comando atinge o alvo,
    // mas o uso é do ator).
    podeUsarTecnica, marcarTecnicaUsada,
    // REGRA NOVA (revisão final, 09/09/2026): ativação de técnica modo
    // 'total' é LIVRE — 0 PA, teto de 1 por rodada. debitarCustoTecnica
    // decide PA-vs-flag na aplicação; podeAtivarTecnicaLivre é o predicado
    // que a UI consulta pra bloquear a segunda ativação (mesmo padrão de
    // tecEquip/tecUso). A flag zera em processarViradaDeRodada.
    debitarCustoTecnica, podeAtivarTecnicaLivre,
    // Task 7: grupo_armas/grupo_armaduras viram regra de ativação (não só
    // filtro de dropdown). tecnicaPermitida decide; tecnicasCompativeisComArma
    // é o filtro do select de ataque (Object.assign(window,...) abaixo
    // também expõe esta última — ver tecnicasCompativeisComArma —
    // regressão do "Livre" em tecnica-efeitos.test.js).
    tecnicaPermitida, tecnicasCompativeisComArma,
    // higiene 9 (revisão final): as três leituras de "grupo da arma"
    // (acima e o call site de somaModAtaque em AcaoPanel) unificadas aqui.
    grupoDaArma,
    // Task 5 das técnicas: mod_rf/mod_rm na resistência e mod_dano_max no
    // dano recebido (Resistência à Dor/Extrema, Fúria, Posicionamento).
    rfEfetivo, rmEfetivo, danoComModMax,
    // Task 3 (Fase 2 das técnicas): ordem completa do dano — dano_pct do
    // atacante, mod_dano_max e dano_recebido_pct do alvo, nessa ordem
    // (spec §4.3). danoComModMax acima continua isolada e testada.
    somaDanoPct, somaDanoRecebidoPct, danoFinal,
    // quebrarConcentracaoPorDano é a regra compartilhada dos TRÊS caminhos de
    // dano (manual do Mestre, ataque do Mestre, ataque do Jogador) — ver
    // concentracao-dano.test.js.
    quebrarConcentracaoPorDano,
    // Veneno é dano na EF, logo também derruba concentração — resolvido antes
    // da renovação de recursos porque muda o vb de quem recebia a magia.
    quebrarConcentracaoPorVeneno,
    // Volta do combate pra ficha (o outro extremo de montarSnapshots) —
    // ver ciclo-ficha-batalha.test.js.
    estadoAoEncerrar,
    // saidaDeCombate é a regra compartilhada de desmaiar/morrer/desistir
    // entre mudarStatus (Mestre) e handleDesistir (Jogador) — ver
    // saida-de-combate.test.js.
    saidaDeCombate,
    siglaArmadura,
    // ataquesDoAtor depende dos globais de 01-core (calcularFicha,
    // gerarAtaques, bonusGrupoArma): quem for usá-la precisa importar
    // esses arquivos de fase antes.
    ataquesDoAtor,
    // Fase 1.1 — Falha Crítica + 1ª leva de efeitos mecânicos de status_temp
    FALHA_CRITICA_TABELA, FC_EFEITOS, aplicarFalhaCritica,
    somaEfeitosStatus, statusTemEfeito, somaModAtaque, modsDoGolpe, consumirEvitaGolpe, vbEfetivo,
    decrementarStatusTemp, ordenarIniciativaEfetiva,
    // Task 6 das técnicas: mod_eh_temp sobe eh/eh_max ao aplicar (Fase 1 acima)
    // e devolve o empréstimo quando o status sai na virada de rodada.
    expirarEhTemp,
    // I3 (revisão final): núcleo puro de removerStatusTemp — devolve a EH
    // emprestada ao cancelar um mod_eh_temp pelo chip, não só na expiração
    // natural.
    removerStatusTempParticipante,
    // Fase 1.2 — dano por rodada (Envenenado) + virada de rodada consolidada
    aplicarDanoDiretoEF, processarDanoPorRodada, processarViradaDeRodada, montarNovaRodada,
    // entradaLogViradaRodada é o texto único da virada: o Mestre usa em
    // novaRodada, o Jogador em registrarViradaNoLog (que os quatro handle*
    // passaram a chamar — antes eles descartavam os eventos).
    entradaLogViradaRodada,
    // proximoAtivo entra pro teste da virada automática de rodada: é ele que
    // devolve null quando o turno acabou no último da ordem.
    proximoAtivo,
    // podeSerAtacado é o par de proximoAtivo do outro lado: quem apanha, não
    // quem age. Só o morto sai da lista de alvos (regra de 01/09/2026).
    podeSerAtacado,
    // Consumo de item em combate. aplicarEfeitoItemSnapshot tem que dar o
    // MESMO resultado que aplicarEfeitosItem (01-core) pro mesmo item — as
    // duas compartilham efeitosDoItem/aplicarDeltaCondicao justamente por
    // isso, e efeito-item-escala.test.js trava o acordo entre elas.
    aplicarEfeitoItemSnapshot, consumirDoInventario, consumirItemDoPJ,
    // Edição manual das pools pelo card (clique na barra) — mesma regra de
    // status que o consumo de item usa. Ver edicao-pool.test.js.
    statusPorPools, valorPoolEditado,
    // Ícone dos PA restantes no card. A família ti-hexagon-number vai só de
    // 0 a 9, e nome fora dela não renderiza NADA — some o chip inteiro, sem
    // erro nenhum. Por isso o clamp, e por isso ele é testado.
    iconePA,
  },
});