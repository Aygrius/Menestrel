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
   desarme, "impede de atacar por N rodadas"); (c) autodano da Falha
   Crítica (RESULTADOS_ACAO.autodano, game-data.jsx); (d) efeito
   mecânico de status_temp (ex.: Envenenado causar dano por rodada).
   ============================================================ */

/* ============================== [26] BATALHA — Console ============================== */

function BatalhasHistoriaView({ historia, personagens = [], criaturas = [], lang, currentUserId, onClose }) {
  const [tip, abrirTip, fecharTip] = usePortalTooltip(300);
  const isEn = lang === 'en';
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
    setup:     isEn ? 'Setup'     : 'Montagem',
    ativa:     isEn ? 'Active'    : 'Ativa',
    encerrada: isEn ? 'Ended'     : 'Encerrada',
  }[e] || e);

  return (
    <div className="fp-page">
      <div className="fp-card batalha-mng-page">
        <div className="fp-card-top">
          <header className="ms-header batalha-mng-page-header">
        <button
          type="button"
          className="btn-icon btn-sm"
          onClick={onClose}
          disabled={rolagemPendenteConducao}
          onMouseEnter={(e) => rolagemPendenteConducao && abrirTip(e, isEn ? 'Finish the pending roll first' : 'Conclua a rolagem pendente primeiro')}
          onMouseLeave={fecharTip}
          aria-label={isEn ? 'Back to stories' : 'Voltar às histórias'}>
          <i className="ti ti-arrow-left" />
        </button>
        <PortalTooltip tip={tip} onEnter={() => {}} onLeave={fecharTip} />
        <div className="batalha-header-title-wrap">
          <div className="batalha-mng-page-eyebrow">
            <i className="ti ti-swords" aria-hidden="true" />
            {historia.titulo}
          </div>
          <h2 className="ms-title">{isEn ? 'Battles' : 'Batalhas'}</h2>
        </div>
        {view === 'lista' && !abrindo && (
          <button type="button" className="btn-primary btn-sm" onClick={() => setView('nova')}>
            {isEn ? 'New battle' : 'Nova batalha'}
          </button>
        )}
        {view === 'nova' && (
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={!novaState.canConfirm}
            onClick={() => { if (novaBatalhaRef.current) novaBatalhaRef.current(); }}>
            {novaState.saving
              ? (isEn ? 'Creating…' : 'Criando…')
              : (isEn ? 'Create battle' : 'Criar batalha')}
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
            lang={lang}
            onVoltar={() => { setAbrindo(null); setHeaderActions(null); carregar(); }}
            onAtualizado={() => carregar()}
            onHeaderActionsChange={setHeaderActions}
            onRolagemPendenteChange={setRolagemPendenteConducao}
          />
        ) : (
          <>
            {batalhas === null ? (
              <div className="admin-loading"><span>{isEn ? 'Loading battles…' : 'Carregando batalhas…'}</span></div>
            ) : batalhas.length === 0 ? (
              <div className="hist-protag-empty">
                {isEn ? 'No battles yet for this story.' : 'Nenhuma batalha nesta história ainda.'}
              </div>
            ) : (
              <div className="batalha-lista">
                {batalhas.map((b) => {
                  const qtd = Array.isArray(b.participantes) ? b.participantes.length : 0;
                  const data = b.created_at
                    ? new Date(b.created_at).toLocaleDateString(isEn ? 'en-US' : 'pt-BR',
                        { day: '2-digit', month: 'short', year: 'numeric' })
                    : '';
                  // Rótulo descritivo sem expor o id da linha (que pula números após DELETE).
                  const titulo = b.estado === 'setup'
                    ? (isEn ? 'Battle in setup' : 'Batalha em montagem')
                    : b.estado === 'ativa'
                      ? (isEn ? `Battle in progress · round ${b.rodada || 1}` : `Batalha em andamento · rodada ${b.rodada || 1}`)
                      : (isEn ? 'Battle' : 'Batalha');
                  return (
                    <div key={b.id} className="batalha-card">
                      <div className="batalha-card-main">
                        <div className="batalha-card-titulo">
                          {titulo}
                        </div>
                        <div className="batalha-card-meta">
                          {qtd} {isEn ? 'participants' : 'participantes'}
                          {data ? ` · ${data}` : ''}
                        </div>
                      </div>
                      <div className="batalha-card-actions">
                        <button className="btn-icon btn-sm"
                          onMouseEnter={(e) => abrirTip(e, isEn ? 'Open' : 'Abrir')} onMouseLeave={fecharTip}
                          onClick={() => setAbrindo(b)}>
                          <i className="ti ti-arrow-right" aria-hidden="true" />
                        </button>
                        <button className="btn-icon btn-danger btn-sm"
                          onMouseEnter={(e) => abrirTip(e, isEn ? 'Delete' : 'Excluir')} onMouseLeave={fecharTip}
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
          {isEn ? 'None linked to this story' : 'Nenhum vinculado a esta história'}
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
            placeholder={isEn ? 'Filter…' : 'Filtrar…'}
          />
        </div>
        <div className="part-section-bulk">
          {modoQtd ? (
            /* Criaturas: bulk actions — ícones representativos da ação */
            <>
              <button type="button" className="btn-icon btn-sm"
                onMouseEnter={(e) => abrirTip(e, isEn ? 'One of each' : 'Uma de cada')}
                onMouseLeave={fecharTip}
                onClick={() => items.forEach((it) => onQtd(it.key, 1))}>
                <i className="ti ti-copy" aria-hidden="true" />
              </button>
              <button type="button" className="btn-icon btn-sm"
                onMouseEnter={(e) => abrirTip(e, isEn ? 'Remove all' : 'Zerar todas')}
                onMouseLeave={fecharTip}
                disabled={selCount === 0}
                onClick={() => items.forEach((it) => onQtd(it.key, 0))}>
                <i className="ti ti-ban" aria-hidden="true" />
              </button>
              <button type="button" className="btn-icon btn-sm"
                onMouseEnter={(e) => abrirTip(e, isEn ? 'Add one more of each' : 'Mais uma de cada')}
                onMouseLeave={fecharTip}
                onClick={() => items.forEach((it) => onQtd(it.key, (qtdMap.get(it.key) ?? 0) + 1))}>
                <i className="ti ti-plus" aria-hidden="true" />
              </button>
            </>
          ) : (
            /* PJs: bulk actions originais */
            <>
              <button type="button" className="btn-icon btn-sm"
                onMouseEnter={(e) => abrirTip(e, isEn ? 'Select all' : 'Selecionar todos')}
                onMouseLeave={fecharTip}
                disabled={allOn}
                onClick={onSelectAll}>
                <i className="ti ti-checkbox" aria-hidden="true" />
              </button>
              <button type="button" className="btn-icon btn-sm"
                onMouseEnter={(e) => abrirTip(e, isEn ? 'Deselect all' : 'Desmarcar todos')}
                onMouseLeave={fecharTip}
                disabled={noneOn}
                onClick={onDeselectAll}>
                <i className="ti ti-square" aria-hidden="true" />
              </button>
              <button type="button" className="btn-icon btn-sm"
                onMouseEnter={(e) => abrirTip(e, isEn ? 'Invert selection' : 'Inverter seleção')}
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
          {isEn ? 'No results' : 'Sem resultados'}
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
  const criatItems = criaturasVinc.map((c) => ({ key: 'cri:' + c.id, nome: c.nome, meta: [c.tipo || null, c.estagio != null ? `${isEn ? 'Stage' : 'Estágio'} ${c.estagio}` : null].filter(Boolean).join(' · ') }));

  const selectAll   = (keys) => setSelPj((prev) => { const next = new Set(prev); keys.forEach((k) => next.add(k)); return next; });
  const deselectAll = (keys) => setSelPj((prev) => { const next = new Set(prev); keys.forEach((k) => next.delete(k)); return next; });

  return (
    <>
      <p className="subhead nova-batalha-intro">
        {isEn
          ? 'Choose who will take part in the battle. Select the player characters and creatures that will join the confrontation. Once the combatants are set, everything will be ready to start combat and track each turn.'
          : 'Essa é a hora de escolher quem participará da batalha. Selecione os personagens dos jogadores e as criaturas que farão parte do confronto. Após definir os combatentes, tudo estará pronto para iniciar o combate e acompanhar cada turno da batalha.'}
      </p>
      <ParticipantSection
        label={isEn ? 'Players' : 'Jogadores'}
        items={pjItems}
        sel={selPj}
        onToggle={togglePj}
        onSelectAll={()  => selectAll(pjItems.map((i) => i.key))}
        onDeselectAll={() => deselectAll(pjItems.map((i) => i.key))}
        isEn={isEn}
      />
      <ParticipantSection
        label={isEn ? 'Creatures' : 'Criaturas'}
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
      efeito: t.efeito || null,
    });
  });
  return out;
}

/* ── Filtra técnicas compatíveis com a arma equipada ──────────── */
/* Regra: técnica com `grupo_armas` específico (ex.: "CM") só       */
/* aparece para armas daquele grupo. Sem `grupo_armas` ou genéricas */
/* aparecem para todas as armas.                                    */
function tecnicasCompativeisComArma(tecnicas, arma, catalogos) {
  if (!Array.isArray(tecnicas) || tecnicas.length === 0) return [];
  if (!arma || !arma.slug || !catalogos || !catalogos.catalogoBySlug) return tecnicas.filter((t) => !t.grupo_armas);
  const itemArma = catalogos.catalogoBySlug[arma.slug];
  const grupoArma = itemArma && itemArma.grupo_armas ? String(itemArma.grupo_armas) : null;
  return tecnicas.filter((t) => {
    if (!t.grupo_armas) return true;       // técnica genérica
    if (!grupoArma) return false;          // arma sem grupo → não casa específica
    // grupo_armas no DB pode ser CSV ("CM,CL"); aceita todos
    const lista = String(t.grupo_armas).split(',').map((s) => s.trim()).filter(Boolean);
    return lista.includes(grupoArma);
  });
}

/* ── Pontos de ação por classe (spec do sistema) ──────────────── */
function pontosAcaoPJ(pj) {
  const prof = pj.profissao;
  const guerreiroOuLadino = prof === 'Guerreiro' || prof === 'Ladino';
  if (guerreiroOuLadino && pj.especializacao) return 4;   // especializado (não-MVP, regra pronta)
  return guerreiroOuLadino ? 2 : 1;                        // Mago/Sacerdote/Rastreador/Bardo = 1
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
const EF_MORTE = -15;
function aplicarDanoCascata(dano, p, critico) {
  let r = Math.max(0, Math.floor(dano || 0));
  let eh = p.eh, ar = p.ar, ef = p.ef;
  if (!critico && eh > 0) { const c = Math.min(eh, r); eh -= c; r -= c; }
  if (r > 0 && ar > 0)    { const c = Math.min(ar, r); ar -= c; r -= c; }
  if (r > 0 && ef > EF_MORTE) { const c = Math.min(ef - EF_MORTE, r); ef -= c; r -= c; }
  let status = p.status;
  if (ef <= EF_MORTE && (status === 'ativo' || status === 'desmaiado')) status = 'morto';
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

/* Rótulos de exibição das 8 condições (roster, Fase de combate) — mesma
   correspondência posicional documentada no comentário acima
   (Reputação, Sono, Sanidade, Saúde, Hidratação, Sobriedade, Temperatura,
   Alimentação). Curto o suficiente pra caber como label de poolBar. */
const CONDICAO_LABEL = {
  reputacao:       { pt: 'Reputação',  en: 'Reputation',  icon: 'ti-certificate'    },
  animo:           { pt: 'Sono',       en: 'Sleep',       icon: 'ti-bed'            },
  sanidade:        { pt: 'Sanidade',   en: 'Sanity',      icon: 'ti-mood-sick'      },
  vitalidade:      { pt: 'Saúde',      en: 'Health',      icon: 'ti-heart-down'     },
  hidratacao:      { pt: 'Hidratação', en: 'Hydration',   icon: 'ti-droplet-down'   },
  euforia:         { pt: 'Sobriedade', en: 'Sobriety',    icon: 'ti-glass-full'     },
  termorregulacao: { pt: 'Temperatura',en: 'Temperature', icon: 'ti-temperature'    },
  nutricao:        { pt: 'Alimentação',en: 'Nutrition',   icon: 'ti-meat'           },
};

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
    supabaseClient.from('itens').select('*'),
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
      const arCur = (vitEstado && Number.isFinite(vitEstado.ar))
        ? Math.max(0, Math.min(arMax, vitEstado.ar))
        : (persist && Number.isFinite(persist.ar))
          ? Math.max(0, Math.min(arMax, persist.ar))
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
      };
    }
    const c = criById[p.ref_id];
    if (!c) return { ...p, vb: 0, pa_max: 1, pa_rest: 1, eh: 0, eh_max: 0, ar: 0, ar_max: 0, ef: 0, ef_max: 0, karma: 0, karma_max: 0, defesa_sigla: 'L', defesa_valor: 0, rf: 0, rm: 0, status: 'ativo', ausente: true };
    return {
      tipo: 'criatura', ref_id: p.ref_id, nome: p.nome,
      inst_id: p.inst_id,   // garantido por partsComInstId acima
      vb: c.velocidade || 0, pa_max: 1, pa_rest: 1,
      eh: c.energia_heroica || 0, eh_max: c.energia_heroica || 0,
      ar: c.absorcao || 0,        ar_max: c.absorcao || 0,
      ef: c.energia_fisica || 0,  ef_max: c.energia_fisica || 0,
      karma: 0, karma_max: 0,
      defesa_sigla: c.tipo_armadura || 'L',
      defesa_valor: c.defesa || 0,
      rf: c.resistencia_fisica || 0,
      rm: c.resistencia_magica || 0,
      status: 'ativo',
      status_temp: [],
    };
  });
}

/* ── Aplica o efeito de um item consumível no SNAPSHOT de um participante
   de batalha — adaptação de aplicarEfeitosItem (01-core/inventario-helpers.jsx),
   que mira pj.estado_atual (fora de combate). Aqui o alvo é o shape do
   snapshot: eh/eh_max, ef/ef_max, karma/karma_max (clamp no _max real do
   snapshot, que pode já estar reduzido por sequela — não no max "cheio" da
   ficha), ar sem teto pro label 'Absorção' (buff temporário, mesma regra
   do original), e condicoes (0-100, sem _max próprio). Reaproveita
   parseEfeito (mesmo parser de texto livre "N Condição, N Condição").
   Retorna um NOVO objeto de participante (não muta o original). */
function aplicarEfeitoItemSnapshot(participante, cat, quantidade) {
  const efeitos = [
    ...parseEfeito(cat && cat.efeito_positivo).map((e) => ({ ...e, sinal: 1 })),
    ...parseEfeito(cat && cat.efeito_negativo).map((e) => ({ ...e, sinal: -1 })),
  ];
  if (efeitos.length === 0) return participante;

  const qtd = Number(quantidade) || 1;
  const novo = { ...participante, condicoes: { ...(participante.condicoes || {}) } };
  const _COND_LIMITE = (typeof COND_LIMITE !== 'undefined' ? COND_LIMITE : null) ?? window.COND_LIMITE ?? 50;

  for (const ef of efeitos) {
    const delta = ef.valor * ef.sinal * qtd;
    if (ef.scope === 'condicoes') {
      const atual = novo.condicoes[ef.key] ?? 0;
      novo.condicoes[ef.key] = Math.max(-_COND_LIMITE, Math.min(_COND_LIMITE, atual + delta));
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
  // Status coerente com as regras da cascata/cura: item negativo pode
  // derrubar (EF ≤ 0 / EH 0 com pool) ou matar (EF ≤ EF_MORTE); item
  // positivo reanima quando saneia as DUAS causas (EH > 0 e EF > 0).
  const st = novo.status || 'ativo';
  const efV = Number(novo.ef) || 0;
  const ehV = Number(novo.eh) || 0;
  const temEH = (Number(novo.eh_max) || 0) > 0;
  if (efV <= EF_MORTE && (st === 'ativo' || st === 'desmaiado')) novo.status = 'morto';
  else if (st === 'ativo' && (efV <= 0 || (temEH && ehV === 0))) novo.status = 'desmaiado';
  else if (st === 'desmaiado' && efV > 0 && (ehV > 0 || !temEH)) novo.status = 'ativo';
  return novo;
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

/* ── EstadoDrop — botão "Ativo" + dropdown via portal por fighter ── */
function EstadoDrop({ p, isEn, STATUS, onMudar, onEnvenenar, abrirTip, fecharTip }) {
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

  return (
    <div className="estado-drop-wrap" ref={btnRef}>
      <button
        className={'btn-ghost btn-sm estado st-' + (p.status || 'ativo')}
        data-on="true"
        onClick={() => setAberto((v) => !v)}
        onMouseEnter={(e) => abrirTip(e, isEn ? 'Change state' : 'Mudar estado')}
        onMouseLeave={fecharTip}
        aria-label={isEn ? 'Change state' : 'Mudar estado'}>
        {(p.status || 'ativo') === 'morto' ? <i className="ti ti-skull" aria-hidden="true" />
          : (p.status || 'ativo') === 'desmaiado' ? <i className="ti ti-zzz" aria-hidden="true" />
          : (p.status || 'ativo') === 'desistiu' ? <i className="ti ti-door-exit" aria-hidden="true" />
          : <i className="ti ti-check" aria-hidden="true" />}
        <span className="bfi-btn-lbl">{isEn ? STATUS[p.status || 'ativo'].en : STATUS[p.status || 'ativo'].pt}</span>
        <i className="ti ti-chevron-down estado-drop-chevron" aria-hidden="true" />
      </button>
      {aberto && (
        <EstadoDropPortal anchorRef={btnRef} onClose={() => setAberto(false)}>
          {Object.keys(STATUS).map((k) => {
            const ativo = (p.status || 'ativo') === k;
            return (
              <button key={k} className={'batalha-estado-drop-item' + (ativo ? ' on' : '')}
                onClick={() => { onMudar(k); setAberto(false); }}>
                {k === 'morto' ? <i className="ti ti-skull" aria-hidden="true" />
                  : k === 'desmaiado' ? <i className="ti ti-zzz" aria-hidden="true" />
                  : k === 'desistiu' ? <i className="ti ti-door-exit" aria-hidden="true" />
                  : <i className="ti ti-check" aria-hidden="true" />}
                {isEn ? STATUS[k].en : STATUS[k].pt}
              </button>
            );
          })}
          <div className="batalha-estado-drop-sep" />
          <button className="batalha-estado-drop-item poison"
            onClick={() => { onEnvenenar(); setAberto(false); }}>
            <i className="ti ti-skull" aria-hidden="true" />
            {isEn ? 'Poisoned' : 'Envenenado'}
          </button>
        </EstadoDropPortal>
      )}
    </div>
  );
}

/* ── próximo participante ATIVO na ordem de iniciativa ────────── */
function proximoAtivo(parts, fromOrdem) {
  return [...parts].sort((a, b) => a.ordem - b.ordem)
    .find((p) => p.ordem > fromOrdem && p.status === 'ativo') || null;
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
    //   L/M/P efetivos = base + Agilidade (o bônus de grupo continua separado
    //     em bonus_ga, somado por colunaAtaque — total idêntico ao da Ficha);
    //   dano base dos tiers = dano100 da Ficha = dano da arma + Força +
    //     Bônus manual do Mestre (estado_atual.bonusArmas[slug], clamp 0..9).
    // Sem isto a batalha usava números MENORES do que a Ficha mostra.
    const agil  = (ficha.atributos && ficha.atributos.agilidade) || 0;
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
          ...a,
          dano_l: a.dano_l != null ? a.dano_l + agil : a.dano_l,
          dano_m: a.dano_m != null ? a.dano_m + agil : a.dano_m,
          dano_p: a.dano_p != null ? a.dano_p + agil : a.dano_p,
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
    if (codigo === 'F')  return arma.dano_25  || 0;
    if (codigo === 'M')  return arma.dano_50  || 0;
    if (codigo === 'D')  return arma.dano_75  || 0;
    if (codigo === 'MD') return arma.dano_100 || 0;
    if (codigo === 'E')  return Math.floor((arma.dano_100 || 0) * 1.25);
    if (codigo === 'A')  return Math.floor((arma.dano_100 || 0) * 1.5);
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

/* ============================== Condução (Fase 4b: turnos + iniciativa) ============================== */
function ConduzirBatalhaView({ batalha, historia, lang, onVoltar, onAtualizado, onHeaderActionsChange, onRolagemPendenteChange }) {
  const isEn = lang === 'en';
  const [tip, abrirTip, fecharTip, manterTip] = usePortalTooltip(60);
  const [estado, setEstado] = useState(batalha.estado);
  const [participantes, setParticipantes] = useState(batalha.participantes || []);
  const [rodada, setRodada] = useState(batalha.rodada || 0);
  const [iniciando, setIniciando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState(null);
  const [motorAberto, setMotorAberto] = useState(false);
  const [danoOpen, setDanoOpen] = useState(null);   // ref_id+tipo do lutador com painel de dano aberto
  const [danoVal, setDanoVal] = useState('');
  const [danoCrit, setDanoCrit] = useState(false);
  // Fase 6 — Cura, Status temporários, Encerrar com restauração
  const [curaOpen, setCuraOpen] = useState(null);   // key do lutador com painel de cura
  const [curaPool, setCuraPool] = useState('eh');   // 'eh' | 'ar' | 'ef'
  const [curaVal,  setCuraVal]  = useState('');
  const [statusOpen,    setStatusOpen]    = useState(null);  // key do lutador com painel de status temp
  const [statusNome,    setStatusNome]    = useState('');
  const [statusIcone,   setStatusIcone]   = useState('');
  const [statusRodadas, setStatusRodadas] = useState(3);
  const [encerrarOpen,  setEncerrarOpen]  = useState(false); // painel inline com toggle de restaurar
  // Fase 7 — Roster colapsável: por padrão só nome+ícones ficam visíveis;
  // as barras (EF/EH/AR/KA + condições) só aparecem expandidas. O lutador
  // "atual" (vez dele, só em estado==='ativa') fica SEMPRE expandido — não
  // é chave neste objeto, é forçado via `(estado==='ativa' && p.atual) ||
  // !!rosterAbertos[fkey]` na hora de renderizar. Clique manual em
  // qualquer card (inclusive o atual, mas aí não muda nada visualmente,
  // já que o OR com "atual" domina) alterna sua própria chave aqui —
  // outros cards não fecham junto, cada um guarda seu próprio estado.
  const [rosterAbertos, setRosterAbertos] = useState({});
  const alternarRoster = (fkey) => setRosterAbertos((prev) => ({ ...prev, [fkey]: !prev[fkey] }));
  const [catalogos, setCatalogos] = useState(null);
  const [acaoOpen, setAcaoOpen] = useState(false);
  // Teste agora é uma tab dentro do painel de Ação (AcaoPanel) — não tem mais
  // estado/botão próprio no footer da batalha.
  const abrirAcao = () => setAcaoOpen((v) => !v);
  // Rolagem comprometida dentro do AcaoPanel (já existe d20 sem aplicar) —
  // reportada via onRolagemPendenteChange, usada pra travar os botões do
  // header (Passar/Nova Rodada/Encerrar) enquanto durar. Ver AcaoPanel.
  const [rolagemPendente, setRolagemPendente] = useState(false);
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
        supabaseClient.from('itens').select('*'),
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
      const snaps = await montarSnapshots(batalha.participantes || [], pools);
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

  const aplicarDano = (idx) => {
    const v = parseInt(danoVal || '0', 10) || 0;
    if (v <= 0) return;
    const p = participantes[idx];
    const atualizado = aplicarDanoCascata(v, p, !!danoCrit);
    let next = participantes.map((q, i) => (i === idx ? atualizado : q));
    // se deixou de estar ativo (morto OU desmaiado) e era o ator da vez, passa a vez
    if (atualizado.status !== 'ativo' && p.atual) {
      const prox = proximoAtivo(next, p.ordem);
      next = next.map((q) => ({ ...q, atual: !!(prox && mesmoParticipante(q, prox)) }));
    }
    persistir({ participantes: next }, () => { setParticipantes(next); setDanoOpen(null); setDanoVal(''); setDanoCrit(false); });
  };

  // Fase 6 — Cura inline (espelha aplicarDano). Adiciona à pool selecionada, capped no max.
  // Se EH estava zerado e foi curada > 0 → reanima 'desmaiado' pra 'ativo'.
  const aplicarCura = (idx) => {
    const v = parseInt(curaVal || '0', 10) || 0;
    if (v <= 0) return;
    const p = participantes[idx];
    const pool = curaPool;                              // 'eh' | 'ar' | 'ef'
    const max  = p[pool + '_max'] || 0;
    // EF pode estar NEGATIVA (piso EF_MORTE) — a cura parte do valor real
    // (−10 + 5 → −5), sem o antigo floor em 0 que "teleportava" pra zero.
    const piso = pool === 'ef' ? EF_MORTE : 0;
    const novo = Math.max(piso, Math.min(max, (p[pool] || 0) + v));
    const atualizado = { ...p, [pool]: novo };
    // Reanimação: desmaiado só volta a 'ativo' quando as DUAS causas de
    // queda estão sanadas — EH > 0 (se o combatente tem pool de EH) e
    // EF > 0. Ex.: curar EH com EF ainda em −5 mantém o personagem caído.
    if (p.status === 'desmaiado') {
      const ehOk = pool === 'eh' ? novo > 0 : ((p.eh || 0) > 0 || (p.eh_max || 0) === 0);
      const efOk = pool === 'ef' ? novo > 0 : (p.ef || 0) > 0;
      if (ehOk && efOk) atualizado.status = 'ativo';
    }
    // Cura EF acima de 0 NÃO ressuscita morto — Mestre tem que mudar status manualmente
    // (ressuscitar é decisão narrativa, não automática).
    const next = participantes.map((q, i) => (i === idx ? atualizado : q));
    persistir({ participantes: next }, () => {
      setParticipantes(next); setCuraOpen(null); setCuraVal(''); setCuraPool('eh');
    });
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
      setStatusOpen(null); setStatusNome(''); setStatusIcone(''); setStatusRodadas(3);
    });
  };

  // Fase 6 — Remove um status temporário (clique no chip).
  const removerStatusTemp = (idx, statusId) => {
    const p = participantes[idx];
    const atual = Array.isArray(p.status_temp) ? p.status_temp : [];
    const novoArr = atual.filter((s) => s.id !== statusId);
    if (novoArr.length === atual.length) return;
    const atualizado = { ...p, status_temp: novoArr };
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
    if (dano > 0) {
      next[alvoIdx] = aplicarDanoCascata(dano, next[alvoIdx], critico);
    }
    // Debita PA (sempre 1) e karma (se for magia).
    const k = Math.max(0, custo_karma || 0);
    next[atorIdx] = {
      ...next[atorIdx],
      pa_rest: Math.max(0, (next[atorIdx].pa_rest || 0) - 1),
      karma:   Math.max(0, (next[atorIdx].karma   || 0) - k),
    };

    // PA zerado → auto-passa a vez
    const ator = next[atorIdx];
    if (ator.pa_rest === 0 && ator.atual) {
      const prox = proximoAtivo(next, ator.ordem);
      if (prox) {
        next = next.map((p) => ({ ...p, atual: mesmoParticipante(p, prox) }));
      } else {
        // ninguém mais ativo nessa rodada → marca prox=null; nova rodada via clique manual
        next = next.map((p) => ({ ...p, atual: false }));
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

    persistir({ participantes: next, log: novoLog }, () => {
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
    next[testIdx] = {
      ...next[testIdx],
      pa_rest: Math.max(0, (next[testIdx].pa_rest || 0) - 1),
    };
    // Se quem testou era o ator da vez e ficou sem PA → passa a vez.
    const t = next[testIdx];
    if (t.atual && t.pa_rest === 0) {
      const prox = proximoAtivo(next, t.ordem);
      if (prox) {
        next = next.map((p) => ({ ...p, atual: mesmoParticipante(p, prox) }));
      } else {
        next = next.map((p) => ({ ...p, atual: false }));
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
        texto += ` (col ${payload.coluna}, d20 ${payload.d20})`;
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

    persistir({ participantes: next, log: novoLog }, () => {
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
    // Aplica o efeito (se houver) no snapshot do ator.
    next[atorIdx] = aplicarEfeitoItemSnapshot(next[atorIdx], cat, qtd);
    // Debita 1 PA (mesmo custo de qualquer ação do turno).
    next[atorIdx] = { ...next[atorIdx], pa_rest: Math.max(0, (next[atorIdx].pa_rest || 0) - 1) };

    // PA zerado OU ator incapacitado pelo próprio item (efeito negativo
    // derrubou/matou) → auto-passa a vez (mesmo comportamento do lado do
    // jogador, autoPassarSeNecessario).
    const atorSnap = next[atorIdx];
    if (atorSnap.atual && (atorSnap.pa_rest === 0 || atorSnap.status !== 'ativo')) {
      const prox = proximoAtivo(next, atorSnap.ordem);
      if (prox) {
        next = next.map((p) => ({ ...p, atual: mesmoParticipante(p, prox) }));
      } else {
        next = next.map((p) => ({ ...p, atual: false }));
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
    if (ator.tipo === 'pj' && catalogos && catalogos.pjById && catalogos.pjById[ator.ref_id]) {
      const pjAtual = catalogos.pjById[ator.ref_id];
      const invAtual = (pjAtual.inventario && pjAtual.inventario.itens) || [];
      // Baixa por SLUG distribuída entre as pilhas (consumirDoInventario) —
      // o card do AcaoPanel agrupa todas as instâncias do slug, então a
      // baixa não pode assumir que a 1ª instância tem a quantidade toda.
      const novosItens = consumirDoInventario(invAtual, slug, qtd);
      const novoInv = { ...(pjAtual.inventario || {}), itens: novosItens };
      // WRITE-THROUGH das condições (regra confirmada 06/07/2026: "usar um
      // item muda os valores pré-batalha"): as condições finais do snapshot
      // do ator vão pra ficha real (estado_atual.condicoes) IMEDIATAMENTE,
      // no MESMO update do inventário (mesma linha de `personagens`) — não
      // só no encerramento. Consequência assumida: "Encerrar restaurando"
      // não desfaz condição alterada por item durante a batalha.
      const novoEstado = { ...(pjAtual.estado_atual || {}), condicoes: { ...(next[atorIdx].condicoes || {}) } };
      // Atualiza o cache local de catalogos.pjById otimisticamente, pra a
      // lista do AcaoPanel refletir o consumo sem esperar um refetch.
      catalogos.pjById[ator.ref_id] = { ...pjAtual, inventario: novoInv, estado_atual: novoEstado };
      supabaseClient.from('personagens').update({ inventario: novoInv, estado_atual: novoEstado }).eq('id', ator.ref_id)
        .then(({ error: invErr }) => {
          if (invErr) console.error('[batalha] consumo de item (personagens.inventario) falhou:', invErr);
        });
    }

    persistir({ participantes: next, log: novoLog }, () => {
      setParticipantes(next); setLog(novoLog); setAcaoOpen(false);
    });
  };

  const mudarStatus = (idx, novo) => {
    const alvo = participantes[idx];
    let next = participantes.map((p, i) => (i === idx ? { ...p, status: novo } : p));
    if (alvo && alvo.atual && novo !== 'ativo') {          // o ator da vez saiu → passa a vez
      const prox = proximoAtivo(next, alvo.ordem);
      next = next.map((p) => ({ ...p, atual: !!(prox && mesmoParticipante(p, prox)) }));
    }
    persistir({ participantes: next }, () => setParticipantes(next));
  };

  const novaRodada = () => {
    // Reseta PA dos ativos + decrementa status_temp de todos (remove os que zeraram).
    const reset = participantes.map((p) => {
      const next = (p.status === 'ativo') ? { ...p, pa_rest: p.pa_max } : { ...p };
      if (Array.isArray(p.status_temp) && p.status_temp.length) {
        next.status_temp = p.status_temp
          .map((s) => ({ ...s, rodadas_rest: Math.max(0, (s.rodadas_rest || 0) - 1) }))
          .filter((s) => s.rodadas_rest > 0);
      }
      return next;
    });
    const reordered = ordenarIniciativa(reset);          // recalcula iniciativa pela VB
    const primeiro = [...reordered].sort((a, b) => a.ordem - b.ordem).find((p) => p.status === 'ativo');
    const next = reordered.map((p) => ({ ...p, atual: !!(primeiro && mesmoParticipante(p, primeiro)) }));
    const novaR = rodada + 1;
    persistir({ participantes: next, rodada: novaR }, () => { setParticipantes(next); setRodada(novaR); });
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

  // Sobe os botões de ação (Ação/Passar/Nova Rodada/Encerrar, ou Iniciar) pro
  // slot de ações do HEADER da página via onHeaderActionsChange — não mais um
  // footer fixo na base da tela. "Voltar" saiu da fileira: a seta do header
  // (sempre onClose, ver BatalhasHistoriaView) cobre essa ação agora, mesmo
  // durante a condução. Fica aqui, depois de todas as funções que referencia.
  useEffect(() => {
    if (!onHeaderActionsChange) return;
    if (estado === 'setup') {
      onHeaderActionsChange(
        <button type="button" className="btn-primary btn-sm"
          disabled={iniciando || participantes.length === 0}
          onClick={iniciar}>
          <i className="ti ti-swords" aria-hidden="true" />
          {iniciando ? (isEn ? 'Starting…' : 'Iniciando…') : (isEn ? 'Start' : 'Iniciar')}
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
        <button type="button" className={acaoOpen ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
          disabled={salvando || !current || !catalogos || (current && current.pa_rest <= 0) || rolagemPendente}
          onMouseEnter={(e) => rolagemPendente && abrirTip(e, isEn ? 'Finish the pending roll first' : 'Conclua a rolagem pendente primeiro')}
          onMouseLeave={fecharTip}
          onClick={abrirAcao}>
          {isEn ? 'Action' : 'Ação'}
        </button>
        <button type="button" className="btn-icon btn-ghost btn-sm" disabled={salvando || !current || rolagemPendente} onClick={passarVez}
          onMouseEnter={(e) => abrirTip(e, isEn ? 'Pass' : 'Passar')} onMouseLeave={fecharTip}>
          <i className="ti ti-player-skip-forward" aria-hidden="true" />
        </button>
        <button type="button" className="btn-icon btn-ghost btn-sm" disabled={salvando || rolagemPendente} onClick={novaRodada}
          onMouseEnter={(e) => abrirTip(e, isEn ? 'New Turn' : 'Nova Rodada')} onMouseLeave={fecharTip}>
          <i className="ti ti-refresh" aria-hidden="true" />
        </button>
        <button type="button" className="btn-danger btn-sm" disabled={salvando || rolagemPendente} onClick={encerrarBatalha}
          onMouseEnter={(e) => rolagemPendente && abrirTip(e, isEn ? 'Finish the pending roll first' : 'Conclua a rolagem pendente primeiro')}
          onMouseLeave={fecharTip}>
          {isEn ? 'End' : 'Encerrar'}
        </button>
      </>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, acaoOpen, salvando, current, catalogos, participantes, iniciando, isEn, rolagemPendente]);

  // Aplica a escolha: atualiza historia.personagens_pools e chama a RPC de arquivamento.
  // restaurar=true  → remove chaves dos PJs vivos do jsonb (volta ao max na próxima batalha)
  // restaurar=false → grava snapshot final dos PJs no jsonb (vivos com pools atuais; mortos com ef=0)
  //
  // Fase 7 — condicoes (Reputação/Sono/Sanidade/Saúde/Hidratação/Sobriedade/
  // Temperatura/Alimentação) NÃO passam por personagens_pools (essas 4 chaves
  // são as únicas que esse jsonb conhece) — vivem direto em
  // personagens.estado_atual.condicoes, lidas/escritas também fora de
  // batalha. Por decisão confirmada, seguem a MESMA regra de restaurar/
  // sequelas que eh/ef/ar/karma: restaurar=true → não toca em estado_atual
  // (ficha real do PJ permanece como estava antes da batalha); restaurar=
  // false → grava as condições finais do snapshot de volta na ficha.
  // NOTA (06/07/2026): com o write-through de condições no USO DE ITEM
  // (aplicarItem/handleItem gravam estado_atual.condicoes na hora),
  // restaurar=true já NÃO devolve a ficha ao estado pré-batalha para
  // condições alteradas por item — só evita gravar as demais variações do
  // snapshot. Decisão do usuário: "usar um item muda os valores
  // pré-batalha". Por
  // isso é uma segunda leitura+escrita (tabela personagens), separada da
  // de historias.personagens_pools logo abaixo.
  const finalizarEncerramento = async (restaurar) => {
    setSalvando(true); setError(null);

    const pjsDaBatalha = participantes.filter((p) => p.tipo === 'pj');

    // 0) Condições + Vitalidade — só roda se não for restaurar.
    // Persiste TANTO condicoes (Saúde/Sono/etc.) QUANTO vitalidade
    // (EF/EH/AR/Karma) em estado_atual, que é o que a ficha lê.
    // Reads+writes em paralelo: cada PJ é linha independente.
    if (!restaurar && pjsDaBatalha.length > 0) {
      const resultados = await Promise.all(pjsDaBatalha.map(async (p) => {
        const { data: pjRow, error: pjErr } = await supabaseClient
          .from('personagens').select('estado_atual').eq('id', p.ref_id).maybeSingle();
        if (pjErr) return { ok: false, error: pjErr };
        const estadoAtual = (pjRow && pjRow.estado_atual) || {};

        // Vitalidade: persiste os valores do snapshot de batalha em
        // estado_atual.vitalidade (chaves lidas pelas barras da ficha).
        // Personagem morto recebe ef: EF_MORTE e eh: 0 para indicar morte.
        const ismorto = p.status === 'morto';
        const novoVit = {
          ...(estadoAtual.vitalidade || {}),
          ef: ismorto ? EF_MORTE : (Number.isFinite(p.ef)    ? p.ef    : undefined),
          eh: ismorto ? 0         : (Number.isFinite(p.eh)    ? p.eh    : undefined),
          ar: Number.isFinite(p.ar)    ? p.ar    : undefined,
          ka: Number.isFinite(p.karma) ? p.karma : undefined,
        };

        const novoEstado = {
          ...estadoAtual,
          condicoes:  { ...(p.condicoes || {}) },
          vitalidade: novoVit,
        };
        const { error: condErr } = await supabaseClient
          .from('personagens').update({ estado_atual: novoEstado }).eq('id', p.ref_id);
        if (condErr) return { ok: false, error: condErr };
        return { ok: true };
      }));
      const falha = resultados.find((r) => !r.ok);
      if (falha) { setSalvando(false); setError(falha.error.message); return; }
    }

    // 0b) Restaurar: limpa vitalidade de estado_atual para que a ficha
    // exiba barras cheias (personagens_pools já é deletado abaixo para o
    // mesmo efeito dentro da batalha, mas a ficha lê estado_atual).
    // Erros silenciosos — não bloqueia o encerramento.
    if (restaurar && pjsDaBatalha.length > 0) {
      await Promise.all(pjsDaBatalha.map(async (p) => {
        const { data: pjRow } = await supabaseClient
          .from('personagens').select('estado_atual').eq('id', p.ref_id).maybeSingle();
        if (!pjRow?.estado_atual?.vitalidade) return;
        const novoEstado = { ...pjRow.estado_atual, vitalidade: {} };
        await supabaseClient.from('personagens').update({ estado_atual: novoEstado }).eq('id', p.ref_id);
      }));
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
      setError(isEn ? `Failed: ${motivo}` : `Falha: ${motivo}`);
      return;
    }
    onAtualizado && onAtualizado();
    onVoltar && onVoltar();
  };


  // Cor das 8 condições: por SINAL do valor bruto (corCondicao, helpers.jsx
  // — negativo vermelho / neutro / positivo verde), não mais gradiente por
  // percentual. EF/EH/AR/KA não usam isto (corDinamica fica de fora pra eles).
  const _corCondicao = (typeof corCondicao !== 'undefined' ? corCondicao : null) || window.corCondicao || (() => '#888');
  const _COND_LIMITE = (typeof COND_LIMITE !== 'undefined' ? COND_LIMITE : null) ?? window.COND_LIMITE ?? 50;

  // opts: { key, title, icon, corDinamica, min } — todos opcionais. icon
  // substitui o texto do label por um ícone (Fase: ícones tabler em EF/EH/
  // AR/KA); title vira tooltip (usado pelas condições, label abreviado); key
  // é repassada pro React quando poolBar é chamado dentro de um .map();
  // corDinamica troca o gradiente fixo de .pool-X i pela cor por sinal
  // (usado pelas 8 condições, que não têm uma cor de categoria própria como
  // EF/EH/AR/KA têm — sem isso a barra preenche a largura certa mas fica
  // invisível, sem nenhum background definido); min (default 0) é o piso da
  // faixa — condições usam -COND_LIMITE pra preencher a barra pela POSIÇÃO
  // no intervalo [min,max] inteiro, não só v/max (que quebraria pra v<0).
  const poolBar = (label, v, max, opts) => {
    const { key, title, icon, corDinamica, min } = opts || {};
    const lo = min ?? 0;
    const span = max - lo;
    const pct = span > 0 ? Math.max(0, Math.min(100, ((v - lo) / span) * 100)) : 0;
    return (
      <div key={key} className={'batalha-pool pool-' + label.toLowerCase()}
        onMouseEnter={(e) => title && abrirTip(e, title)} onMouseLeave={fecharTip}>
        <span className="batalha-pool-label">{icon || label}</span>
        <span className="batalha-pool-bar">
          <i style={{ width: pct + '%', ...(corDinamica ? { background: _corCondicao(v) } : null) }} />
        </span>
      </div>
    );
  };

  // ── SETUP ──
  if (estado === 'setup') {
    return (
      <div className="batalha-conduzir">
        <p className="batalha-setup-intro">
          {isEn
            ? 'Everything is ready for the battle to begin. The turn order, or initiative, is determined by each participants speed.'
            : 'Tudo pronto para o início da batalha. A ordem de ação, ou iniciativa, é determinada pela velocidade de cada participante.'}
        </p>
        <ul className="batalha-part-list">
          {participantes.map((p, i) => (
            <li key={i} className="batalha-part-row">
              <span className="batalha-part-nome">{p.nome}</span>
            </li>
          ))}
        </ul>
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
              {isEn
                ? 'Ending archives the log and removes this battle. Choose how to persist pools:'
                : 'Encerrar arquiva o log e remove esta batalha. Escolha o que persistir nos PJs:'}
            </div>
            <div className="batalha-encerrar-resumo">
              {feridos.length > 0 && (
                <span>
                  {feridos.length}{' '}{isEn ? 'wounded' : 'ferido(s)'}
                </span>
              )}
              {mortos.length > 0 && (
                <span className="mortos">
                  {' · '}{mortos.length}{' '}{isEn ? 'dead' : 'morto(s)'}{' '}
                  ({isEn ? 'persist with EF=0' : 'persistem com EF=0'})
                </span>
              )}
              {feridos.length === 0 && mortos.length === 0 && (
                <span>{isEn ? 'All PCs at full pools.' : 'Todos os PJs no máximo.'}</span>
              )}
            </div>
            <div className="batalha-encerrar-acoes">
              <button className="btn-ghost btn-sm" onClick={() => setEncerrarOpen(false)} disabled={salvando}>
                {isEn ? 'Cancel' : 'Cancelar'}
              </button>
              <button className="btn-ghost btn-sm" onClick={() => finalizarEncerramento(false)} disabled={salvando}
                onMouseEnter={(e) => abrirTip(e, isEn ? 'Wounded PCs keep current pools in the story' : 'PJs feridos mantêm as pools atuais na história')}
                onMouseLeave={fecharTip}>
                {isEn ? 'End with consequences' : 'Encerrar com sequelas'}
              </button>
              <button className="btn-primary btn-sm" onClick={() => finalizarEncerramento(true)} disabled={salvando}
                onMouseEnter={(e) => abrirTip(e, isEn ? 'Wounded PCs return to max in the story' : 'PJs feridos voltam ao máximo na história')}
                onMouseLeave={fecharTip}>
                {isEn ? 'Restore & end' : 'Restaurar e encerrar'}
              </button>
            </div>
          </div>
        );
      })()}

      {estado === 'ativa' && acaoOpen && current && catalogos && (
        <AcaoPanel
          ator={current}
          participantes={participantes}
          catalogos={catalogos}
          lang={lang}
          onAplicar={aplicarAcao}
          onAplicarTeste={aplicarTeste}
          onAplicarItem={aplicarItem}
          onCancel={() => setAcaoOpen(false)}
          onRolagemPendenteChange={setRolagemPendente}
        />
      )}

      {error && <div className="err-msg">{error}</div>}

      <div className={'batalha-roster' + (acaoOpen || motorAberto || encerrarOpen ? ' batalha-roster--hidden' : '')}>
        {participantes.map((p, i) => {
          const fkey = p.inst_id || (p.tipo + ':' + p.ref_id + ':' + i);
          // Atual (vez dele) fica sempre expandido enquanto a batalha está
          // ativa; os demais só expandem se o Mestre clicou pra abrir.
          const expandido = (estado === 'ativa' && p.atual) || !!rosterAbertos[fkey];
          return (
          <div key={fkey}
            className={'batalha-fighter status-' + (p.status || 'ativo') + (p.atual && estado === 'ativa' ? ' atual' : '')}>
            <div className="batalha-fighter-main">
              <div className="batalha-fighter-head">
                <div className="batalha-fighter-id"
                  role="button" tabIndex={0}
                  aria-expanded={expandido}
                  aria-label={(isEn ? 'Toggle pools for ' : 'Expandir/recolher barras de ') + p.nome}
                  onClick={() => alternarRoster(fkey)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternarRoster(fkey); } }}>
                  <span className={'batalha-fighter-status-ic st-' + (p.status || 'ativo')}
                    onMouseEnter={(e) => abrirTip(e, isEn ? STATUS[p.status || 'ativo'].en : STATUS[p.status || 'ativo'].pt)}
                    onMouseLeave={fecharTip}>
                    {p.status === 'morto' ? <i className="ti ti-skull" aria-hidden="true" />
                      : p.status === 'desmaiado' ? <i className="ti ti-zzz" aria-hidden="true" />
                      : p.status === 'desistiu' ? <i className="ti ti-door-exit" aria-hidden="true" />
                      : <i className="ti ti-check" aria-hidden="true" />}
                  </span>
                  <span className="batalha-fighter-nome">{p.nome.split(' ')[0]}</span>
                  {p.ausente && <span className="batalha-aviso">{isEn ? 'missing' : 'ausente'}</span>}
                  {/* Fase 6: chips de status temporarios - clique remove. stopPropagation
                      pra não alternar o collapse junto (clicou no chip, não no card). */}
                  {Array.isArray(p.status_temp) && p.status_temp.map((s) => (
                    <span key={s.id} className="batalha-status-chip"
                      onClick={(e) => { e.stopPropagation(); if (estado === 'ativa') removerStatusTemp(i, s.id); }}
                      onMouseEnter={(e) => abrirTip(e, `${s.nome} · ${s.rodadas_rest} ${isEn ? 'rounds left · click to remove' : 'rodada(s) restantes · clique para remover'}`)}
                      onMouseLeave={fecharTip}>
                      {s.icone
                        ? <span className="batalha-status-chip-icone">{s.icone}</span>
                        : <i className="ti ti-bolt batalha-status-chip-icone" aria-hidden="true" />}
                      {s.nome}
                      <span className="batalha-status-chip-rod">{s.rodadas_rest}</span>
                    </span>
                  ))}
                  <i className="ti ti-chevron-down batalha-fighter-toggle-ic" aria-hidden="true" />
                </div>

                <div className="batalha-fighter-stats">
                  <span className="batalha-stat"><span>VB</span><b>{p.vb}</b></span>
                  <span className="batalha-stat"><span>{isEn ? 'AP' : 'PA'}</span><b>{p.pa_rest}/{p.pa_max}</b></span>
                  <span className="batalha-stat"><span>{isEn ? 'DF' : 'DF'}</span><b>{p.defesa_sigla || 'L'}{p.defesa_valor || 0}</b></span>
                  <span className="batalha-stat"><span>RM</span><b>{p.rm || 0}</b></span>
                  <span className="batalha-stat"><span>RF</span><b>{p.rf || 0}</b></span>
                </div>
                {estado === 'ativa' && (
                  <div className="batalha-fighter-acoes-inline">
                    <button className="btn-icon btn-sm dmg"
                      onClick={() => {
                        setDanoOpen(danoOpen === fkey ? null : fkey); setCuraOpen(null); setStatusOpen(null);
                        setDanoVal(''); setDanoCrit(false);
                      }}
                      aria-label={isEn ? 'Damage' : 'Dano'}
                      onMouseEnter={(e) => abrirTip(e, isEn ? 'Damage' : 'Dano')}
                      onMouseLeave={fecharTip}>
                      <i className="ti ti-heart-minus" aria-hidden="true" />
                    </button>
                    <button className="btn-icon btn-sm heal"
                      onClick={() => {
                        setCuraOpen(curaOpen === fkey ? null : fkey); setDanoOpen(null); setStatusOpen(null);
                        setCuraVal(''); setCuraPool('eh');
                      }}
                      aria-label={isEn ? 'Heal' : 'Cura'}
                      onMouseEnter={(e) => abrirTip(e, isEn ? 'Heal' : 'Cura')}
                      onMouseLeave={fecharTip}>
                      <i className="ti ti-heart-plus" aria-hidden="true" />
                    </button>
                    {/* Estado — dropdown via portal, não cortado pelo overflow do pai */}
                    <EstadoDrop
                      p={p}
                      isEn={isEn}
                      STATUS={STATUS}
                      onMudar={(k) => mudarStatus(i, k)}
                      abrirTip={abrirTip}
                      fecharTip={fecharTip}
                      onEnvenenar={() => {
                        const novoStatus = {
                          id: Date.now() + Math.floor(Math.random() * 1000),
                          nome: isEn ? 'Poisoned' : 'Envenenado',
                          icone: '☠',
                          rodadas_rest: 3,
                        };
                        const atual = Array.isArray(p.status_temp) ? p.status_temp : [];
                        const atualizado = { ...p, status_temp: [...atual, novoStatus] };
                        const next = participantes.map((q, j) => (j === i ? atualizado : q));
                        persistir({ participantes: next }, () => setParticipantes(next));
                      }}
                    />
                  </div>
                )}
              </div>

              {estado === 'ativa' && danoOpen === fkey && (
                <div className="batalha-dano-painel">
                  <input className="batalha-dano-input" type="number" min="0" value={danoVal}
                    onChange={(e) => setDanoVal(e.target.value)} placeholder={isEn ? 'amount' : 'valor'} autoFocus />
                  <label className="batalha-dano-crit">
                    <input type="checkbox" checked={danoCrit} onChange={(e) => setDanoCrit(e.target.checked)} />
                    {isEn ? 'critical (skips EH)' : 'cr\u00edtico (pula EH)'}
                  </label>
                  <button className="btn-primary btn-sm" onClick={() => aplicarDano(i)} disabled={salvando}>
                    {isEn ? 'Apply' : 'Aplicar'}
                  </button>
                  <button className="btn-ghost btn-sm" onClick={() => { setDanoOpen(null); setDanoVal(''); setDanoCrit(false); }}>
                    {isEn ? 'Cancel' : 'Cancelar'}
                  </button>
                </div>
              )}
              {/* Fase 6 - Painel inline de Cura */}
              {estado === 'ativa' && curaOpen === fkey && (
                <div className="batalha-dano-painel cura">
                  <span className="batalha-painel-lbl">{isEn ? 'Pool' : 'Pool'}:</span>
                  {['eh', 'ar', 'ef'].map((pool) => (
                    <button key={pool}
                      className="btn-ghost btn-sm pool-btn"
                      data-on={curaPool === pool ? 'true' : undefined}
                      data-tone="heal"
                      onClick={() => setCuraPool(pool)}>
                      {pool.toUpperCase()}
                    </button>
                  ))}
                  <input className="batalha-dano-input" type="number" min="0" value={curaVal}
                    onChange={(e) => setCuraVal(e.target.value)} placeholder={isEn ? 'amount' : 'valor'} autoFocus />
                  <span className="batalha-painel-hint">{p[curaPool]}/{p[curaPool + '_max']}</span>
                  <button className="btn-primary btn-sm" onClick={() => aplicarCura(i)} disabled={salvando}>
                    {isEn ? 'Apply' : 'Aplicar'}
                  </button>
                  <button className="btn-ghost btn-sm" onClick={() => { setCuraOpen(null); setCuraVal(''); }}>
                    {isEn ? 'Cancel' : 'Cancelar'}
                  </button>
                </div>
              )}
              {/* Pools: renderizado condicionalmente — evita espaço residual do gap quando fechado */}
              {expandido && (
              <div className="batalha-fighter-collapse is-open">
                <div className="batalha-fighter-collapse-inner">
              <div className="batalha-fighter-pools-wrap">
                <div className="batalha-pools">
                  {poolBar('EF', p.ef, p.ef_max, { title: 'EF', icon: <i className="ti ti-heart" aria-hidden="true" /> })}
                  {poolBar('EH', p.eh, p.eh_max, { title: 'EH', icon: <i className="ti ti-heart" aria-hidden="true" /> })}
                  {poolBar('AR', p.ar, p.ar_max, { title: 'AR', icon: <i className="ti ti-shield" aria-hidden="true" /> })}
                  {/* ti-sparkle-highlight é um ícone recente do Tabler (v3.44, maio/2026) —
                      se o CDN do projeto estiver fixado numa versão anterior a essa, o
                      ícone não vai renderizar. Conferir no navegador; se faltar, trocar
                      por "ti-sparkles" (v2.1, já usado e confirmado funcionando na aba
                      Magia deste mesmo arquivo — fallback seguro e visualmente próximo). */}
                  {poolBar('KA', p.karma, p.karma_max, { title: 'KA', icon: <i className="ti ti-sparkle-highlight" aria-hidden="true" /> })}
                </div>
                {/* Condições divididas em 2 linhas de 4 (só PJ) */}
                {p.tipo === 'pj' && p.condicoes && (
                  <>
                    <div className="batalha-pools batalha-pools-condicoes">
                      {CONDICOES_KEYS.slice(0, 4).map((k) => {
                        const lbl = CONDICAO_LABEL[k];
                        const nomeCompleto = lbl ? (isEn ? lbl.en : lbl.pt) : k;
                        const sigla = nomeCompleto.slice(0, 3).toUpperCase();
                        const v = p.condicoes[k] != null ? p.condicoes[k] : 0;
                        const icon = lbl?.icon ? <i className={'ti ' + lbl.icon} aria-hidden="true" /> : undefined;
                        return poolBar(sigla, v, _COND_LIMITE, { key: k, title: nomeCompleto, corDinamica: true, icon, min: -_COND_LIMITE });
                      })}
                    </div>
                    <div className="batalha-pools batalha-pools-condicoes">
                      {CONDICOES_KEYS.slice(4).map((k) => {
                        const lbl = CONDICAO_LABEL[k];
                        const nomeCompleto = lbl ? (isEn ? lbl.en : lbl.pt) : k;
                        const sigla = nomeCompleto.slice(0, 3).toUpperCase();
                        const v = p.condicoes[k] != null ? p.condicoes[k] : 0;
                        const icon = lbl?.icon ? <i className={'ti ' + lbl.icon} aria-hidden="true" /> : undefined;
                        return poolBar(sigla, v, _COND_LIMITE, { key: k, title: nomeCompleto, corDinamica: true, icon, min: -_COND_LIMITE });
                      })}
                    </div>
                  </>
                )}
                {/* Espaçadores invisíveis nas criaturas removidos — criaturas têm altura natural */}
              </div>
                </div>
              </div>
              )}
            </div>
          </div>
          );
        })}
      </div>

    </div>
    <PortalTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </>
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
function DadoOverlay({ titulo, subtitulo, coluna, alvoResist, semCard, lang, onFechar, onConfirmar,
                       isCritico, tipoCritico, msgCritico }) {
  const isEn = lang === 'en';
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
      detalheRes = isEn ? 'Miss' : 'Errou';
    } else {
      detalheRes = `${Math.round(r.dano * 100)}% ${isEn ? 'damage' : 'dano'}`;
    }
    if (r.autodano) detalheRes += isEn ? ' · self-damage' : ' · auto-dano';
    if (r.critico)  detalheRes += isEn ? ' · critical!'   : ' · crítico!';
  }

  const labelCriticoTipo = isCritico
    ? (tipoCritico === 'alvo'
        ? (isEn ? 'Critical on target' : 'Crítico no alvo')
        : (isEn ? 'Critical on self'   : 'Crítico em si mesmo'))
    : null;

  return (
    <div
      className="menestrel-ui dado-overlay-backdrop"
      role="dialog" aria-modal="true"
      aria-label={(isEn ? 'Roll: ' : 'Rolagem: ') + titulo}
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
          ariaLabel={(isEn ? 'Rolling die for ' : 'Rolando dado para ') + titulo}
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
                    ? (isEn ? 'Success' : 'Sucesso')
                    : (resultado.d20 === alvoResist
                      ? (isEn ? 'Tie' : 'Empate')
                      : (isEn ? 'Failure' : 'Fracasso'))}
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
              {isEn ? 'Confirm' : 'Confirmar'}
            </button>
          )}
          {!onConfirmar && (
            <button type="button" className="btn-primary" onClick={onFechar}>
              {isEn ? 'Done' : 'Concluir'}
            </button>
          )}
        </div>
      </div>
    </div>
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

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
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
      {open && (
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
          {isEn ? 'Action' : 'Ação'}
        </button>
        <button className={modo === 'resistencia' ? 'on' : ''} onClick={() => trocaModo('resistencia')}>
          {isEn ? 'Resistance' : 'Resistência'}
        </button>
      </div>

      {modo === 'acao' ? (
        <div className="motor-body">
          <label className="motor-field">
            <span>{isEn ? 'Action column (-7…50)' : 'Coluna de Ação (-7…50)'}</span>
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
                  {isEn ? 'Col' : 'Coluna'} {resAcao.coluna} · d20 {resAcao.d20} ·{' '}
                  {resAcao.erra ? (isEn ? 'miss' : 'erra') : `${Math.round(resAcao.dano * 100)}% ${isEn ? 'dmg' : 'dano'}`}
                  {resAcao.autodano ? (isEn ? ' · self-damage' : ' · auto-dano') : ''}
                  {resAcao.critico ? (isEn ? ' · critical' : ' · crítico') : ''}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="motor-body">
          <div className="motor-row2">
            <label className="motor-field">
              <span>{isEn ? 'Attack force (1-20)' : 'Força de Ataque (1-20)'}</span>
              <input type="number" value={ataque} onChange={(e) => setAtaque(_clamp1a20(e.target.value))} />
            </label>
            <label className="motor-field">
              <span>{isEn ? 'Defense / Resist. (1-20)' : 'Defesa / Resist. (1-20)'}</span>
              <input type="number" value={defesa} onChange={(e) => setDefesa(_clamp1a20(e.target.value))} />
            </label>
          </div>
          <div className="motor-alvo">
            {isEn ? 'Target on d20' : 'Alvo no d20'}: <strong>{alvoResist}</strong>{' '}
            <span className="motor-alvo-hint">({isEn ? 'resists if d20 > target' : 'resiste se d20 > alvo'})</span>
          </div>
          <Dado value={d20} onChange={setD20} lang={lang} />
          {resResist && (
            <div className={'motor-result resist-' + resResist}>
              <div className="motor-result-nome">
                {resResist === 'empate' ? (isEn ? 'Tie — roll again' : 'Empate — role de novo')
                  : resResist === 'resistiu' ? (isEn ? 'Resisted' : 'Resistiu')
                  : (isEn ? 'Not resisted' : 'Não resistiu')}
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
function AcaoPanel({ ator, participantes, catalogos, lang, onAplicar, onAplicarTeste, onAplicarItem, onCancel, onRolagemPendenteChange }) {
  const isEn = lang === 'en';

  // Listas pré-computadas
  const armas    = useMemo(() => ataquesDoAtor(ator, catalogos), [ator, catalogos]);
  const magias   = useMemo(() => magiasOfensivasDoAtor(ator, catalogos), [ator, catalogos]);
  const tecnicas = useMemo(() => tecnicasDoAtor(ator, catalogos), [ator, catalogos]);
  const alvos = useMemo(() => participantes.filter(
    (p) => p.status === 'ativo' && !mesmoParticipante(p, ator)
  ), [participantes, ator]);

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

  const [tab, setTab] = useState(
    armas.length > 0 ? 'arma' : (podeMagia ? 'magia' : (!semItem ? 'item' : 'habilidade'))
  );

  // Estado por tab
  const [armaIdx, setArmaIdx]   = useState(0);
  const [tecIdx,  setTecIdx]    = useState(-1);   // -1 = sem técnica (tab Arma)
  const [magiaIdx, setMagiaIdx] = useState(0);
  const [alvoIdx, setAlvoIdx]  = useState(0);
  const [d20, setD20] = useState(null);
  // Segundo dado: só pedido quando primeiro resultado é FC (q=0, verde) ou A (q=7, cinza).
  // FC → autodano crítico no atacante; A → crítico devastador no alvo.
  const [d20Critico, setD20Critico] = useState(null);
  // Overlay do dado: 'primario' | 'critico' | null
  const [overlayAberto, setOverlayAberto] = useState(null);

  // Estado das tabs Habilidade / Técnica (teste) / Resistência / Item
  const [habKey, setHabKey] = useState(null);
  const [tecTesteKey, setTecTesteKey] = useState(null);
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
  }, [tab, habilidadesAtor.length, tecnicas.length, itensConsumiveisAtor.length]);

  // Auto-puxa RF/RM da ficha quando tab é Resistência
  useEffect(() => {
    if (tab !== 'resistencia') return;
    if (!isPJ || !ficha) return;
    const v = resTipo === 'rf' ? ficha.derivadas.resistenciaFisica : ficha.derivadas.resistenciaMagica;
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

  // ── Cálculos por tab ───────────────────────────────────────
  // Arma: coluna = dano_categoria + bônus_grupo − defesa_valor (clamp [-7,50]).
  // Magia: coluna = nível efetivo do conjurador (passa por toda defesa).
  // Habilidade/Técnica(teste): coluna = total do item (clamp [-7,50]).
  const habilidadeSel = habilidadesAtor.find((h) => h.key === habKey) || null;
  const tecnicaTesteSel = tecnicas.find((t) => t.key === tecTesteKey) || null;
  const itemSelecionado = itensConsumiveisAtor.find((it) => it.slug === itemSlug) || null;

  let coluna = null, colunaClamped = null, alvoResist = null;
  if (tab === 'arma' && arma && alvo) {
    coluna = colunaAtaque(arma, alvo);
    colunaClamped = Math.max(-7, Math.min(50, coluna));
  } else if (tab === 'magia' && magia) {
    coluna = magia.nivel;
    colunaClamped = Math.max(-7, Math.min(50, coluna));
  } else if (tab === 'habilidade' && habilidadeSel && habilidadeSel.total != null) {
    coluna = habilidadeSel.total;
    colunaClamped = Math.max(-7, Math.min(50, coluna));
  } else if (tab === 'tecnica_teste' && tecnicaTesteSel && tecnicaTesteSel.total != null) {
    coluna = tecnicaTesteSel.total;
    colunaClamped = Math.max(-7, Math.min(50, coluna));
  } else if (tab === 'resistencia') {
    alvoResist = (typeof resolverResistencia === 'function')
      ? resolverResistencia(forcaAtaque, forcaDefesa) : null;
  }

  const res = (tab !== 'resistencia' && colunaClamped != null && d20 != null) ? resolverAcao(colunaClamped, d20) : null;
  const resResist = (tab === 'resistencia' && d20 != null && alvoResist != null)
    ? (d20 === alvoResist ? 'empate' : (d20 > alvoResist ? 'resistiu' : 'falhou'))
    : null;
  const armaPraDano = tab === 'magia' ? magia : arma;        // o objeto cujo `dano` será multiplicado pelo tier
  const dano = (tab === 'arma' || tab === 'magia') && res && !res.erra ? danoNoTier(armaPraDano, res.codigo) : 0;
  const custoKarma = tab === 'magia' && magia ? magia.custo_karma : 0;
  const semKarma = custoKarma > 0 && (ator.karma || 0) < custoKarma;
  const semPA = (ator.pa_rest || 0) <= 0;

  // Resultado primário que exige segundo dado:
  //   q=0 (FC, verde) → crítico contra si mesmo; q=7 (A, cinza) → crítico contra o alvo.
  // Magia e testes (habilidade/técnica/resistência) nunca entram no fluxo de
  // crítico de ataque (esse fluxo é só arma).
  const precisaCritico = !!(tab === 'arma' && res && (res.q === 0 || res.q === 7));
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

  // Trava simétrica do dado de crítico (segundo dado, só existe quando
  // precisaCritico é true): uma vez rolado, também não pode ser rolado de
  // novo — mesma regra "rola uma vez só" do dado primário, aplicada à
  // rolagem de efeito.
  const dadoCriticoTravado = d20Critico != null;

  // Tipo de crítico da tabela (CORTE/PERFURACAO/ESMAGAMENTO/DESARMADO) — lido do grupo da arma.
  const tipoCriticoArma = (tab === 'arma' && arma) ? tipoCriticoDoGrupo(arma.grupo_sigla || arma.grupo || '') : 'DESARMADO';

  // Zera o segundo dado se o primeiro mudar (evita estado órfão).
  const setD20ComReset = (v) => { setD20(v); setD20Critico(null); };

  // Segundo resultado (só calculado quando necessário e disponível).
  const resCritico = (precisaCritico && d20Critico != null)
    ? resolverAcao(colunaClamped, d20Critico) : null;

  // Texto narrativo do crítico interpolado com os danos reais da arma.
  const msgCritico = (resCritico && tipoCriticoArma)
    ? interpolarCritico((CRITICOS_TABELA[tipoCriticoArma] || {})[resCritico.q], arma)
    : null;

  // Pode confirmar: depende de qual tab está ativa.
  const podeAplicar =
    (tab === 'arma' || tab === 'magia')
      ? (!!res && !semKarma && alvo && (!precisaCritico || d20Critico != null))
    : (tab === 'habilidade' || tab === 'tecnica_teste')
      ? (!semPA && d20 != null && !!res)
    : (tab === 'resistencia')
      ? (!semPA && d20 != null && !!resResist && resResist !== 'empate')
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
  const temRolagemPendente = tab !== 'item' && d20 != null;

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
        coluna: colunaClamped,
        d20,
        resultado: res,
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
        <span className="acao-ator">{ator.nome}</span>
        <button className={'acao-tab' + (tab === 'arma' ? ' on' : '')}
          onClick={() => trocaTab('arma')} disabled={armas.length === 0 || temRolagemPendente}>
          <i className="ti ti-sword" aria-hidden="true" />{isEn ? 'Weapon' : 'Arma'}
        </button>
        <button className={'acao-tab' + (tab === 'habilidade' ? ' on' : '')}
          onClick={() => trocaTab('habilidade')} disabled={semHab || temRolagemPendente}>
          <i className="ti ti-list-check" aria-hidden="true" />{isEn ? 'Skill' : 'Habilidade'}
        </button>
        <button className={'acao-tab' + (tab === 'tecnica_teste' ? ' on' : '')}
          onClick={() => trocaTab('tecnica_teste')} disabled={semTecTeste || temRolagemPendente}>
          <i className="ti ti-bolt" aria-hidden="true" />{isEn ? 'Technique' : 'Técnica'}
        </button>
        <button className={'acao-tab' + (tab === 'resistencia' ? ' on' : '')}
          onClick={() => trocaTab('resistencia')} disabled={temRolagemPendente}>
          <i className="ti ti-shield-check" aria-hidden="true" />{isEn ? 'Resistance' : 'Resistência'}
        </button>
        {!semItem && (
          <button className={'acao-tab' + (tab === 'item' ? ' on' : '')}
            onClick={() => trocaTab('item')} disabled={temRolagemPendente}>
            <i className="ti ti-bottle" aria-hidden="true" />{isEn ? 'Item' : 'Item'}
          </button>
        )}
        {podeMagia && (
          <button className={'acao-tab acao-tab-magia' + (tab === 'magia' ? ' on' : '')}
            onClick={() => trocaTab('magia')} disabled={temRolagemPendente}>
            <i className="ti ti-sparkles" aria-hidden="true" />{isEn ? 'Spell' : 'Magia'}
          </button>
        )}
      </div>

      {(tab === 'arma' || tab === 'magia') && armas.length === 0 && !podeMagia ? (
        <p className="atacar-aviso-vazio">
          {isEn ? 'No combat actions available for this actor.'
                : 'Sem ações de combate disponíveis para este lutador.'}
        </p>
      ) : (tab === 'arma' || tab === 'magia') && alvos.length === 0 ? (
        <p className="atacar-aviso-vazio">{isEn ? 'No valid targets.' : 'Sem alvos válidos.'}</p>
      ) : (
      <>
      {tab === 'arma' && (
        <>
          <div className={tecnicasCompat.length > 0 ? 'atacar-row3' : 'atacar-row2'}>
            <SelectPill
              label={isEn ? 'Weapon' : 'Arma'}
              value={armaIdx}
              disabled={temRolagemPendente}
              onChange={(v) => { setArmaIdx(parseInt(v, 10)); setTecIdx(-1); setD20(null); }}
              options={armas.map((a, i) => ({
                value: i,
                label: a.nome,
              }))}
            />
            <SelectPill
              label={isEn ? 'Target' : 'Alvo'}
              value={alvoIdx}
              disabled={temRolagemPendente}
              onChange={(v) => { setAlvoIdx(parseInt(v, 10)); setD20(null); }}
              options={alvos.map((p, i) => ({
                value: i,
                label: p.nome,
              }))}
            />
            {tecnicasCompat.length > 0 && (
              <SelectPill
                label={isEn ? 'Technique (optional)' : 'Técnica (opcional)'}
                value={tecIdx}
                disabled={temRolagemPendente}
                onChange={(v) => setTecIdx(parseInt(v, 10))}
                options={[
                  { value: -1, label: isEn ? '— none —' : '— nenhuma —', labelBotao: '' },
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
              label={isEn ? 'Spell' : 'Magia'}
              value={magiaIdx}
              disabled={temRolagemPendente}
              onChange={(v) => { setMagiaIdx(parseInt(v, 10)); setD20(null); }}
              options={magias.map((m, i) => ({
                value: i,
                label: `${m.nome} ${m.nivel}`,
              }))}
            />
            <SelectPill
              label={isEn ? 'Target' : 'Alvo'}
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
              {isEn ? 'Not enough karma' : 'Karma insuficiente'}
            </span>
          )}
        </>
      )}

      {/* Tab Habilidade */}
      {tab === 'habilidade' && (
        semHab ? (
          <p className="atacar-aviso-vazio">
            {isEn ? 'This fighter has no skills.' : 'Este lutador não tem habilidades.'}
          </p>
        ) : (
          <>
            <SelectPill
              label={isEn ? 'Skill' : 'Habilidade'}
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
            {isEn ? 'This fighter has no techniques.' : 'Este lutador não tem técnicas.'}
          </p>
        ) : (
          <>
            <SelectPill
              label={isEn ? 'Technique' : 'Técnica'}
              value={tecTesteKey || ''}
              disabled={temRolagemPendente}
              onChange={(v) => { setTecTesteKey(v); setD20(null); }}
              options={tecnicas.map((t) => ({
                value: t.key,
                label: t.nome,
              }))}
            />
            {tecnicaTesteSel && tecnicaTesteSel.efeito && (
              <p className="acao-efeito-texto">{tecnicaTesteSel.efeito}</p>
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
          <div className="atacar-row2">
            <label className="motor-field">
              <span>{isEn ? 'Attack force' : 'Força de Ataque'}</span>
              <input type="number" min="1" max="20" value={forcaAtaque} disabled={temRolagemPendente}
                className="round"
                onChange={(e) => { setForcaAtaque(_clamp1a20(e.target.value)); setD20(null); }} />
            </label>
            <label className="motor-field">
              <span>
                {isEn ? 'Defense force' : 'Força de Defesa'}
                <em className="atacar-resist-label">
                  ({resTipo.toUpperCase()}{isPJ ? ` · ${isEn ? 'auto' : 'auto'}` : ''})
                </em>
              </span>
              <input type="number" min="1" max="20" value={forcaDefesa} disabled={isPJ || temRolagemPendente}
                className="round"
                onChange={(e) => { setForcaDefesa(_clamp1a20(e.target.value)); setD20(null); }} />
            </label>
          </div>
        </>
      )}

      {tab === 'item' && (
        <>
          {itensConsumiveisAtor.length === 0 ? (
            <p className="atacar-aviso-vazio">
              {isEn ? 'No consumable items in inventory.' : 'Sem itens consumíveis no inventário.'}
            </p>
          ) : (
            <>
              <div className="atacar-row2">
                <SelectPill
                  label={isEn ? 'Item' : 'Item'}
                  value={itemSlug}
                  onChange={(v) => { setItemSlug(v); setItemQtd(1); }}
                  options={itensConsumiveisAtor.map((it) => ({
                    value: it.slug,
                    label: `${it.nome} ×${it.quantidade}`,
                  }))}
                />
                <QuantityStepper
                  label={isEn ? 'Quantity' : 'Quantidade'}
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
                      {' '}({isEn ? `×${itemQtd}, applied together` : `×${itemQtd}, aplicado junto`})
                    </span>
                  )}
                </div>
              )}
              {itemSelecionado && !itemSelecionado.cat.efeito_positivo && !itemSelecionado.cat.efeito_negativo && (
                <p className="atacar-aviso-vazio com-margem">
                  {isEn ? 'No mechanical effect — consumes the item only.' : 'Sem efeito mecânico — só consome o item.'}
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
              ? (isEn ? '⚠ Absurd — roll again for critical effect on target.' : '⚠ Absurdo — role novamente para o efeito crítico no alvo.')
              : (isEn ? '⚠ Critical Failure — roll again for self-damage effect.' : '⚠ Falha Crítica — role novamente para o efeito em si mesmo.')}
          </div>
          <button className="btn-ghost btn-sm btn-critico-rolar"
            disabled={dadoCriticoTravado}
            onClick={() => setOverlayAberto('critico')}>
            <i className="ti ti-cube" aria-hidden="true" />
            {d20Critico != null
              ? `d20: ${d20Critico}`
              : (isEn ? 'Roll critical d20' : 'Rolar d20 de crítico')}
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
      {overlayAberto === 'primario' && (tab === 'resistencia' ? alvoResist != null : colunaClamped != null) && (
        <DadoOverlay
          titulo={
            tab === 'arma' ? `${arma ? arma.nome : '?'} → ${alvo ? alvo.nome : '?'}`
            : tab === 'magia' ? `${magia ? magia.nome : '?'} → ${alvo ? alvo.nome : '?'}`
            : tab === 'habilidade' ? `${habilidadeSel ? habilidadeSel.nome : '?'}`
            : tab === 'tecnica_teste' ? `${tecnicaTesteSel ? tecnicaTesteSel.nome : '?'}`
            : `${resTipo === 'rf' ? (isEn ? 'Physical Resistance' : 'Resistência Física') : (isEn ? 'Magic Resistance' : 'Resistência Mágica')}`
          }
          subtitulo={
            tab === 'resistencia'
              ? `${isEn ? 'Attack force' : 'Força de Ataque'}: ${forcaAtaque}`
              : `${isEn ? 'Action column' : 'Coluna de Ação'}: ${colunaClamped}`
          }
          coluna={tab === 'resistencia' ? null : colunaClamped}
          alvoResist={tab === 'resistencia' ? alvoResist : null}
          semCard={tab === 'habilidade' || tab === 'tecnica_teste'}
          lang={lang}
          onFechar={() => setOverlayAberto(null)}
          onConfirmar={({ valor, resultado: res2 }) => {
            setD20ComReset(valor);
            setOverlayAberto(null);
          }}
        />
      )}

      {/* Overlay do dado de crítico */}
      {overlayAberto === 'critico' && colunaClamped != null && (
        <DadoOverlay
          titulo={tipoCritico === 'alvo'
            ? (isEn ? 'Critical — target' : 'Crítico — alvo')
            : (isEn ? 'Critical Failure — self' : 'Falha Crítica — si mesmo')}
          subtitulo={`${isEn ? 'Action column' : 'Coluna de Ação'}: ${colunaClamped}`}
          coluna={colunaClamped}
          lang={lang}
          isCritico
          tipoCritico={tipoCritico}
          onFechar={() => setOverlayAberto(null)}
          onConfirmar={({ valor, resultado: res2 }) => {
            setD20Critico(valor);
            setOverlayAberto(null);
          }}
        />
      )}

      </>
      )}

      {semPA && (
        <div className="acao-karma-line">
          <strong className="neg">{isEn ? 'No AP left' : 'Sem PA disponível'}</strong>
        </div>
      )}

      <div className="atacar-footer">
        {/* Botão "Rolar dado" — abre o DadoOverlay (inline com Cancelar/Aplicar) */}
        {(tab === 'resistencia' ? alvoResist != null : colunaClamped != null) && (
          <div className="dado-ov-trigger">
            <button className="btn-primary btn-sm" onClick={() => setOverlayAberto('primario')}
              disabled={
                dadoPrimarioTravado ? true
                : tab === 'arma' ? !(arma && alvo)
                : tab === 'magia' ? !magia
                : tab === 'habilidade' ? !habilidadeSel
                : tab === 'tecnica_teste' ? !tecnicaTesteSel
                : tab === 'resistencia' ? alvoResist == null
                : true
              }>
              <i className="ti ti-cube" aria-hidden="true" />
              {d20 != null
                ? (empateResist ? (isEn ? 'Roll again' : 'Rolar de novo') : `d20: ${d20}`)
                : (isEn ? 'Roll d20' : 'Rolar d20')}
            </button>
            {tab !== 'resistencia' && res && (
              <span className="dado-ov-trigger-chip" style={{ color: res.cor, borderColor: res.cor }}>
                {isEn ? res.en : res.pt}
                {!res.erra && (tab === 'arma' || tab === 'magia') && ` · ${dano} ${isEn ? 'dmg' : 'dano'}`}
              </span>
            )}
            {tab === 'resistencia' && resResist && (
              <span className={'dado-ov-trigger-chip resist-' + resResist}
                style={{ color: resResist === 'resistiu' ? '#a4cf85' : resResist === 'empate' ? 'var(--gold)' : '#d98a7a',
                         borderColor: 'currentColor' }}>
                {resResist === 'empate'    ? (isEn ? 'Tie — re-roll' : 'Empate — role de novo')
                 : resResist === 'resistiu' ? (isEn ? 'Resisted'     : 'Resistiu')
                                            : (isEn ? 'Not resisted' : 'Não resistiu')}
              </span>
            )}
          </div>
        )}
        <div className="atacar-footer-spacer" />
        {temRolagemPendente ? (
          <span className="acao-travado-aviso">
            {empateResist
              ? (isEn ? 'Tie — roll the d20 again.' : 'Empate — role o d20 de novo.')
              : isEn
              ? 'Already rolled — continue to confirm.'
              : (() => {
                  const v = tab === 'arma' || tab === 'magia' ? 'Atacar'
                          : tab === 'resistencia' ? 'Resistir'
                          : 'Usar';
                  return `Já rolou — continue em ${v}.`;
                })()}
          </span>
        ) : (
          <button className="btn-ghost btn-sm" onClick={onCancel}>{isEn ? 'Cancel' : 'Cancelar'}</button>
        )}
        <button className="btn-primary btn-sm" disabled={!podeAplicar} onClick={aplicar}>
          {(() => {
            const sufKa = custoKarma > 0 ? ` · ${custoKarma} KA` : '';
            if (isEn) {
              const v = tab === 'arma' || tab === 'magia' ? 'Attack'
                      : tab === 'resistencia' ? 'Resist'
                      : 'Use';
              return `${v} (1 PA${sufKa})`;
            }
            const v = tab === 'arma' || tab === 'magia' ? 'Atacar'
                    : tab === 'resistencia' ? 'Resistir'
                    : 'Usar';
            return `${v} (1 PA${sufKa})`;
          })()}
        </button>
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
  const [catalogos, setCatalogos] = useState(null);
  const [acaoOpen, setAcaoOpen] = useState(false);
  const [rolagemPendente, setRolagemPendente] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  const participantes = (batalha && batalha.participantes) || [];
  const rodada = (batalha && batalha.rodada) || 0;
  const log = (batalha && batalha.log) || [];
  const meuParticipante = participantes.find((p) => p.tipo === 'pj' && p.ref_id === pjAtivoId) || null;
  const current = participantes.find((p) => p.atual) || null;
  const ehMinhaVez = !!(current && meuParticipante && mesmoParticipante(current, meuParticipante));
  const souAtivo = !!(meuParticipante && (meuParticipante.status || 'ativo') === 'ativo');

  // Auto-passe: quando o personagem incapaz (morto/desmaiado/desistiu) tem
  // atual: true, passa a vez automaticamente para não travar a batalha.
  // Depende de catalogos estar carregado (handlePassar usa participantes,
  // mas persistJogador só deve rodar depois que o catálogo chegou).
  const autoPassRef = React.useRef(false);
  useEffect(() => {
    if (!ehMinhaVez || souAtivo || !current || !catalogos) {
      autoPassRef.current = false; // reset quando a condição some
      return;
    }
    if (autoPassRef.current) return; // já passou neste ciclo
    autoPassRef.current = true;
    // Pequeno delay p/ garantir que o estado do realtime se estabilizou
    const t = setTimeout(() => { handlePassar(); }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [ehMinhaVez, souAtivo, current?.inst_id, !!catalogos]);

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
        supabaseClient.from('itens').select('*'),
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
      const motivo = (data && data.motivo) || (error && error.message) || (isEn ? 'Failed to save' : 'Falha ao salvar');
      setErro(motivo);
      return false;
    }
    setAcaoOpen(false);
    return true;
    // Sem update local: o realtime de FichaComBatalha traz o novo snapshot.
  };

  // Passa a vez automaticamente quando o participante referenciado ficou
  // incapaz (morto / desmaiado / desistiu) ou zerou PA — espelha o Mestre.
  const autoPassarSeNecessario = (arr, ref) => {
    const idx = arr.findIndex((p) => mesmoParticipante(p, ref));
    if (idx < 0) return arr;
    const a = arr[idx];
    const incapaz = a.status === 'morto' || a.status === 'desmaiado' || a.status === 'desistiu';
    if (a.atual && (a.pa_rest === 0 || incapaz)) {
      const prox = proximoAtivo(arr, a.ordem);
      return arr.map((p) => ({ ...p, atual: !!(prox && mesmoParticipante(p, prox)) }));
    }
    return arr;
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
    if (dano > 0) {
      next[alvoIdx] = aplicarDanoCascata(dano, next[alvoIdx], critico);
      // Se o ALVO ficou morto/desmaiado e era o atual, passa a vez dele
      next = autoPassarSeNecessario(next, next[alvoIdx]);
    }
    const k = Math.max(0, custo_karma || 0);
    next[atorIdx] = { ...next[atorIdx], pa_rest: Math.max(0, (next[atorIdx].pa_rest || 0) - 1), karma: Math.max(0, (next[atorIdx].karma || 0) - k) };
    // Se o ATOR zerou PA ou ficou incapaz, passa a vez também
    next = autoPassarSeNecessario(next, next[atorIdx]);

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

    persistJogador({ participantes: next, log: [...log, entry] });
  };

  // ── Teste (habilidade/técnica/resistência) — espelha aplicarTeste ──
  const handleTeste = (payload) => {
    if (!ehMinhaVez || !meuParticipante) return;
    const { tipo_teste } = payload;
    const idx = participantes.findIndex((p) => mesmoParticipante(p, meuParticipante));
    if (idx < 0) return;
    let next = [...participantes];
    next[idx] = { ...next[idx], pa_rest: Math.max(0, (next[idx].pa_rest || 0) - 1) };
    next = autoPassarSeNecessario(next, meuParticipante);

    const base = { rodada, ts: Date.now(), autor_tipo: meuParticipante.tipo, autor_ref_id: meuParticipante.ref_id, autor_nome: meuParticipante.nome, acao: 'teste', tipo_teste, d20: payload.d20 };
    const entry = (tipo_teste === 'resistencia')
      ? { ...base, resistencia_tipo: payload.resistencia_tipo, forca_ataque: payload.forca_ataque, forca_defesa: payload.forca_defesa, alvo_resist: payload.alvo_resist, resultado: payload.resultado }
      : { ...base, chave: payload.chave, nome: payload.nome, coluna: payload.coluna, resultado: payload.resultado ? payload.resultado.codigo : null, resultado_nome: payload.resultado ? payload.resultado.pt : null, critico: !!(payload.resultado && payload.resultado.critico) };

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
        texto += ` (col ${payload.coluna}, d20 ${payload.d20})`;
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

    persistJogador({ participantes: next, log: [...log, entry] });
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
    next[idx] = aplicarEfeitoItemSnapshot(next[idx], cat, qtd);
    next[idx] = { ...next[idx], pa_rest: Math.max(0, (next[idx].pa_rest || 0) - 1) };
    next = autoPassarSeNecessario(next, meuParticipante);

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
    if (catalogos && catalogos.pjById && catalogos.pjById[meuParticipante.ref_id]) {
      const pjAtual = catalogos.pjById[meuParticipante.ref_id];
      const invAtual = (pjAtual.inventario && pjAtual.inventario.itens) || [];
      // Mesma baixa distribuída por slug do Mestre (consumirDoInventario).
      const novosItens = consumirDoInventario(invAtual, slug, qtd);
      const novoInv = { ...(pjAtual.inventario || {}), itens: novosItens };
      // Mesmo write-through de condições do Mestre (ver aplicarItem):
      // item muda os valores pré-batalha na hora, no mesmo update.
      const novoEstado = { ...(pjAtual.estado_atual || {}), condicoes: { ...(next[idx].condicoes || {}) } };
      catalogos.pjById[meuParticipante.ref_id] = { ...pjAtual, inventario: novoInv, estado_atual: novoEstado };
      supabaseClient.from('personagens').update({ inventario: novoInv, estado_atual: novoEstado }).eq('id', meuParticipante.ref_id)
        .then(({ error: invErr }) => { if (invErr) console.error('[batalha-jogador] consumo de item falhou:', invErr); });
    }
    persistJogador({ participantes: next, log: [...log, entry] });
  };

  // ── Passar a vez — espelha passarVez/novaRodada ──
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

    const prox = proximoAtivo(participantes, current.ordem);
    if (prox) {
      const next = participantes.map((p) => ({ ...p, atual: mesmoParticipante(p, prox) }));
      persistJogador({ participantes: next });
    } else {
      // deu a volta → nova rodada (reset PA dos ativos + reordena por VB)
      const reset = participantes.map((p) => (p.status === 'ativo') ? { ...p, pa_rest: p.pa_max } : { ...p });
      const reordered = ordenarIniciativa(reset);
      const primeiro = [...reordered].sort((a, b) => a.ordem - b.ordem).find((p) => p.status === 'ativo');
      const next = reordered.map((p) => ({ ...p, atual: !!(primeiro && mesmoParticipante(p, primeiro)) }));
      persistJogador({ participantes: next, rodada: rodada + 1 });
    }
  };

  // ── Encerrar (desistir) — status do próprio PJ vira 'desistiu' ──
  const handleDesistir = () => {
    if (!meuParticipante) return;
    const idx = participantes.findIndex((p) => mesmoParticipante(p, meuParticipante));
    if (idx < 0) return;
    let next = participantes.map((p, i) => (i === idx ? { ...p, status: 'desistiu' } : p));
    if (meuParticipante.atual) {                    // era a vez dele → passa adiante
      const prox = proximoAtivo(next, meuParticipante.ordem);
      next = next.map((p) => ({ ...p, atual: !!(prox && mesmoParticipante(p, prox)) }));
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

    persistJogador({ participantes: next });
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
    const map = isEn
      ? { ativo: 'Active', passou: 'Passed', desmaiado: 'Downed', morto: 'Dead', desistiu: 'Withdrew' }
      : { ativo: 'Ativo', passou: 'Passou', desmaiado: 'Desmaiado', morto: 'Morto', desistiu: 'Desistiu' };
    return map[st] || st;
  };

  return (
    <div className="menestrel-ui batalha-jog-root">
      <header className="ms-header batalha-mng-page-header">
        <button type="button" className="btn-icon btn-sm" onClick={onVoltar}
          aria-label={isEn ? 'Back to sheet' : 'Voltar à ficha'}>
          <i className="ti ti-arrow-left" />
        </button>
        <div className="batalha-header-title-wrap">
          <div className="batalha-mng-page-eyebrow">
            <i className="ti ti-swords" aria-hidden="true" />
            {isEn ? 'Battle' : 'Batalha'} · {isEn ? 'Round' : 'Rodada'} {rodada}
          </div>
          <h2 className="ms-title">
            {meuParticipante ? meuParticipante.nome : (isEn ? 'Battle' : 'Batalha')}
          </h2>
        </div>
        {ehMinhaVez && souAtivo && !acaoOpen && (
          <div className="batalha-header-acoes">
            <button type="button" className="btn-primary btn-sm" disabled={salvando} onClick={() => setAcaoOpen(true)}>
              <i className="ti ti-swords btn-ic-mr" aria-hidden="true" />
              {isEn ? 'Action' : 'Ação'}
            </button>
            <button type="button" className="btn-ghost btn-sm" disabled={salvando} onClick={handlePassar}>
              <i className="ti ti-player-skip-forward btn-ic-mr" aria-hidden="true" />
              {isEn ? 'Pass' : 'Passar'}
            </button>
            <button type="button" className="btn-ghost btn-sm btn-desistir" disabled={salvando} onClick={handleDesistir}>
              <i className="ti ti-flag btn-ic-mr" aria-hidden="true" />
              {isEn ? 'Withdraw' : 'Encerrar'}
            </button>
          </div>
        )}
      </header>

      <div className="batalha-jog-body">
        {!catalogos ? (
          <div className="batalha-loading-msg">
            {isEn ? 'Loading battle…' : 'Carregando batalha…'}
          </div>
        ) : (
          <>
            {/* Mensagem de vez */}
            {!ehMinhaVez && current && (
              <div className="batalha-vez-msg">
                <i className="ti ti-clock btn-ic-mr" aria-hidden="true" style={{ color: '#C9A44E' }} />
                {isEn ? `It's ${current.nome}'s turn` : `É a vez de ${current.nome}`}
              </div>
            )}
            {ehMinhaVez && souAtivo && (
              <div className="batalha-vez-msg minha-vez">
                <i className="ti ti-player-play btn-ic-mr" aria-hidden="true" style={{ color: '#C9A44E' }} />
                {isEn ? "It's your turn" : 'É a sua vez'}
              </div>
            )}
            {ehMinhaVez && !souAtivo && meuParticipante && (
              <div className="batalha-vez-msg">
                <i className="ti ti-clock btn-ic-mr" aria-hidden="true" style={{ color: '#C9A44E' }} />
                {isEn
                  ? `Your status: ${nomeStatus(meuParticipante.status)} — passing turn…`
                  : `Seu status: ${nomeStatus(meuParticipante.status)} — passando a vez…`}
              </div>
            )}

            {/* Painel de ação — aparece no lugar do roster (mesmo padrão do Mestre) */}
            {ehMinhaVez && souAtivo && acaoOpen && (
              <AcaoPanel
                ator={meuParticipante}
                participantes={participantes}
                catalogos={catalogos}
                lang={lang}
                onAplicar={handleAcao}
                onAplicarTeste={handleTeste}
                onAplicarItem={handleItem}
                onCancel={() => { setAcaoOpen(false); setRolagemPendente(false); }}
                onRolagemPendenteChange={setRolagemPendente}
              />
            )}

            {erro && <div className="err-msg mb">{erro}</div>}

            {/* Roster — pools só do próprio PJ; esconde quando AcaoPanel está aberto */}
            <div className={'batalha-roster com-margem' + (acaoOpen ? ' batalha-roster--hidden' : '')}>
              {participantes.map((p, i) => {
                const fkey = p.inst_id || (p.tipo + ':' + p.ref_id + ':' + i);
                const ehEu = meuParticipante && mesmoParticipante(p, meuParticipante);
                const isAtual = !!p.atual;
                return (
                  <div key={fkey}
                    className={'batalha-fighter status-' + (p.status || 'ativo') + (isAtual ? ' atual' : '')}>
                    <div className="batalha-fighter-main">
                      <div className="batalha-fighter-head">
                        <div className="batalha-fighter-id no-pointer">
                          <span className={'batalha-fighter-status-ic st-' + (p.status || 'ativo')}>
                            {(p.status || 'ativo') === 'ativo'     && <i className="ti ti-check" />}
                            {(p.status || 'ativo') === 'passou'    && <i className="ti ti-player-skip-forward" />}
                            {(p.status || 'ativo') === 'desmaiado' && <i className="ti ti-zzz" />}
                            {(p.status || 'ativo') === 'desistiu'  && <i className="ti ti-flag" />}
                            {(p.status || 'ativo') === 'morto'     && <i className="ti ti-skull" />}
                          </span>
                          <span className={'batalha-fighter-nome' + (ehEu ? ' eu' : '')}>
                            {(p.nome || '').split(' ')[0]}{ehEu ? (isEn ? ' (you)' : ' (você)') : ''}
                          </span>
                        </div>
                        <div className="batalha-fighter-stats">
                          <span className="batalha-stat"><span>VB</span><b>{p.vb || 0}</b></span>
                          <span className="batalha-stat"><span>{isEn ? 'AP' : 'PA'}</span><b>{p.pa_rest || 0}/{p.pa_max || 0}</b></span>
                          {!ehEu && <span className="batalha-stat dim"><span>{nomeStatus(p.status)}</span></span>}
                        </div>
                      </div>
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
              })}
            </div>

            {/* Fora da vez / status não-ativo → sem controles, só o status */}
            {(!souAtivo && meuParticipante) && (
              <div className="batalha-status-inativo">
                {isEn ? `Your status: ${nomeStatus(meuParticipante.status)}` : `Seu status: ${nomeStatus(meuParticipante.status)}`}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


Object.assign(window, { BatalhasHistoriaView, BatalhaJogadorView });