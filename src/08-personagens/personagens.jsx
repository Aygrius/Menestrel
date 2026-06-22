/* ============================================================
   PERSONAGENS — Fichas de personagem do Jogador + ações do Mestre
   ============================================================
   13 componentes — aba "Personagens" do console, modais de ações
   do Mestre, e o wizard de criação/edição em múltiplos steps.

   ── Listagem ───────────────────────────────────────────────
   - PersonagensList        — orquestrador da aba (lista PJs do
                              user, ou todos se Mestre)
   - PersonagemCard         — card individual (XP, moedas, ações)
   - ConfirmarExclusaoModal — confirmação de delete

   ── Ações do Mestre ────────────────────────────────────────
   - DarExperienciaModal    — Mestre adiciona XP a um PJ
   - DarMoedasModal         — Mestre concede ou subtrai moedas
                              (usa MOEDA_ORDEM + moedasToLatao)

   ── Wizard de criação/edição (NovoPersonagemModal) ─────────
   - NovoPersonagemModal    — shell do wizard (header, body
                              scrollável, footer com nav entre steps)
   - StepIdentidade         — nome, raça, classe, etc
   - StepAtributos          — distribuição de pontos
   - StepHabilidades        — escolha de habilidades + qtd
   - AprimoramentosPanel    — painel interno do step de habilidades
   - StepMagias             — escolha de magias (carrega DB)
   - StepTecnicas           — escolha de técnicas (carrega DB)
   - StepRevisao            — revisão final antes de salvar

   ── Helpers locais ─────────────────────────────────────────
   - temLevelUpPendente(p)  — detecta se PJ subiu de estágio e
                              ainda não viu (compara calcEstagio
                              com p.nivel_visto)

   Depende de:
   - React (useState/useEffect desestruturados)
   - supabaseClient (01-core/supabase.jsx)
   - GAME_DATA, calcEstagio (01-core/game-data.jsx)
   - MOEDA_ORDEM, moedasToLatao (01-core/inventario-helpers.jsx)
   - Icon (ainda no app.jsx, runtime)

   Consumidores no app.jsx:
   - <PersonagensList /> — aba "Personagens" no AdminConsole
                           (tanto perfil Mestre quanto Jogador)

   Carregar depois de 01-core/ e antes do app.jsx.
   ============================================================ */


/* ============================== [14] PersonagensList: cards dos personagens do jogador ============================== */
// Detecta se o personagem subiu de estágio e ainda não foi "reconhecido" pelo jogador
function temLevelUpPendente(p) {
  const estagio = calcEstagio(p.experiencia || 0);
  const visto = p.nivel_visto || 1;
  return estagio > visto;
}

// ── PersonagensList ──────────────────────────────────────────────────────────
// Recebe `profile` ('master' | 'player') e `currentUserId` pra:
//   - 'player' → mostra só PJs do próprio user
//   - 'master' → mostra TODOS os PJs (RLS permite SELECT all)
//                e dá acesso a botões de Editar e Dar XP em qualquer um
function PersonagensList({ ac, lang, profile = 'player', currentUserId, userProfile = null }) {
  const isMaster = profile === 'master';
  const [modalOpen, setModalOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [toEdit, setToEdit] = useState(null);
  const [toGiveXp, setToGiveXp] = useState(null); 
  const [toGiveMoedas, setToGiveMoedas] = useState(null); 
  const [convidarPj, setConvidarPj] = useState(null);
  const [fichaAbertoId, setFichaAbertoId] = useState(null); 

// PJ ativo do jogador (lido do profile carregado pelo shell).
  // Setar local + persistir em profiles. Voltar pra lista é só setar null
  // localmente — o pj_ativo_id no banco mantém o último ativo.
  const [pjAtivoIdLocal, setPjAtivoIdLocal] = useState(
    !isMaster ? (userProfile?.pj_ativo_id || null) : null
  );

  // Fase 1 — leitura via React Query (hook-ponte). Mantém os nomes que o JSX
  // já consome. carregar() vira refetch().
  const { data: pjData, isLoading: pjLoading, error: pjError, refetch } =
    window.usePersonagensData(isMaster ? 'master' : 'player', currentUserId);
  const personagens = pjLoading ? null : (pjData?.personagens ?? []);
  const profilesMap = pjData?.profilesMap ?? {};
  const error = pjError ? pjError.message : null;
  // idsComMesa volta como array do cache; reconstrói o Set que o .has() espera.
  const idsComMesa = useMemo(
    () => new Set(pjData?.idsComMesa ?? []),
    [pjData]
  );

  const persistirPjAtivo = async (novoId) => {
    if (isMaster || !currentUserId) return;
    const { error } = await supabaseClient
      .from('profiles')
      .update({ pj_ativo_id: novoId })
      .eq('id', currentUserId);
    if (error) console.error('[ficha] pj_ativo_id update failed:', error);
  };
  const ativarPj = async (pjId) => {
    setPjAtivoIdLocal(pjId);
    await persistirPjAtivo(pjId);
  };
  const voltarParaLista = () => {
    // só navegação local — não mexe no banco. pj_ativo_id segue salvo.
    setPjAtivoIdLocal(null);
  };
  const trocarPjAtivo = async (novoPjId) => {
    setPjAtivoIdLocal(novoPjId);
    await persistirPjAtivo(novoPjId);
  };

  const confirmarExclusao = async () => {
    if (!toDelete) return;
    const id = toDelete.id;
    setToDelete(null);
    const { error } = await supabaseClient.from('personagens').delete().eq('id', id);
    if (error) {
      console.error('[personagens] delete falhou:', error);
      alert((lang === 'en' ? 'Failed to delete: ' : 'Falha ao excluir: ') + error.message);
      return; // ← faltava o return aqui também
    }
    // ← isso estava faltando:
    if (id === pjAtivoIdLocal) {
      setPjAtivoIdLocal(null);
      await persistirPjAtivo(null);
    }
    refetch();
  };

  // Exclusão a partir da própria ficha (PJ ativo): além de apagar, volta pra
  // lista e limpa o pj_ativo_id no banco, pois o ativo deixou de existir.
  const confirmarExclusaoAtivo = async () => {
    if (!toDelete) return;
    const id = toDelete.id;
    setToDelete(null);
    const { error } = await supabaseClient.from('personagens').delete().eq('id', id);
    if (error) {
      console.error('[personagens] delete falhou:', error);
      alert((lang === 'en' ? 'Failed to delete: ' : 'Falha ao excluir: ') + error.message);
      return;
    }
    if (id === pjAtivoIdLocal) {
      setPjAtivoIdLocal(null);
      await persistirPjAtivo(null);
    }
    refetch();
  };

  if (personagens === null) {
    return <div className="admin-loading"><span>{lang === 'en' ? 'Loading characters…' : 'Reunindo a comitiva…'}</span></div>;
  }
  if (error) {
    return (
      <div className="admin-error">
        <div className="err-msg">{error}</div>
        <div className="admin-error-hint">
          {lang === 'en'
            ? "Make sure the 'personagens' table exists in Supabase and policies are set."
            : "Confira se a tabela 'personagens' existe no Supabase e as policies estão criadas."}
        </div>
      </div>
    );
  }

    // Mestre com ficha aberta → renderiza a ficha do PJ selecionado com permissão de editar vitalidade/condições.
  if (isMaster && fichaAbertoId != null) {
    const pjAberto = personagens.find((p) => p.id === fichaAbertoId) || null;
    return (
      <>
        <FichaPersonagem
          ac={ac}
          lang={lang}
          currentUserId={currentUserId}
          pjAtivoId={fichaAbertoId}
          isMestre={true}
          onVoltar={() => setFichaAbertoId(null)}
          onEditar={pjAberto ? () => setToEdit(pjAberto) : undefined}
          onExcluir={pjAberto ? () => setToDelete(pjAberto) : undefined}
        />

        {toEdit && (
          <NovoPersonagemModal
            lang={lang}
            personagemExistente={toEdit}
            isMaster={isMaster}
            onClose={() => setToEdit(null)}
            onSaved={() => { setToEdit(null); refetch(); }}
          />
        )}

        {toDelete && (
          <ConfirmarExclusaoModal
            personagem={toDelete}
            lang={lang}
            onCancel={() => setToDelete(null)}
            onConfirm={async () => {
              await confirmarExclusao();
              setFichaAbertoId(null);
            }}
          />
        )}
      </>
    );
  }

  // Jogador com PJ ativo → renderiza a ficha em vez da lista.
  if (!isMaster && pjAtivoIdLocal != null) {
    const pjAtivo = personagens.find((p) => p.id === pjAtivoIdLocal) || null;
    return (
      <>
        <FichaPersonagem
          ac={ac}
          lang={lang}
          currentUserId={currentUserId}
          pjAtivoId={pjAtivoIdLocal}
          onVoltar={voltarParaLista}
          onTrocar={trocarPjAtivo}
          onEditar={pjAtivo ? () => setToEdit(pjAtivo) : undefined}
          onExcluir={pjAtivo ? () => setToDelete(pjAtivo) : undefined}
        />

        {toEdit && (
          <NovoPersonagemModal
            lang={lang}
            personagemExistente={toEdit}
            isMaster={isMaster}
            onClose={() => setToEdit(null)}
            onSaved={() => { setToEdit(null); refetch(); }}
          />
        )}

        {toDelete && (
          <ConfirmarExclusaoModal
            personagem={toDelete}
            lang={lang}
            onCancel={() => setToDelete(null)}
            onConfirm={confirmarExclusaoAtivo}
          />
        )}
      </>
    );
  }

  return (
    <div className="pjs">
      <div className="pjs-grid">
        {personagens.map((p) => (
          <PersonagemCard
            key={p.id}
            p={p}
            isMaster={isMaster}
            isOwn={currentUserId && p.user_id === currentUserId}
            playerName={profilesMap[p.user_id] || '—'}
            semMesa={!isMaster && !idsComMesa.has(p.id)}
            onEntrarMesa={!isMaster ? () => setConvidarPj({ id: p.id, nome: p.nome, sobrenome: p.sobrenome }) : undefined}
            onEdit={() => setToEdit(p)}
            onDelete={() => setToDelete(p)}
            onGiveXp={() => setToGiveXp(p)}
            onGiveMoedas={() => setToGiveMoedas(p)}
            onAtivar={!isMaster ? () => ativarPj(p.id) : undefined}
            onAbrirFicha={isMaster ? () => setFichaAbertoId(p.id) : undefined}
            lang={lang} />
        ))}
      </div>

      {modalOpen && (
        <NovoPersonagemModal
          lang={lang}
          onClose={() => setModalOpen(false)}
          onSaved={(novoPj) => {
            setModalOpen(false);
            refetch();
            // Logo após criar, abre o "entrar em uma mesa" com o PJ novo.
            if (novoPj) setConvidarPj(novoPj);
          }}
        />
      )}

      {convidarPj && (
        <AceitarConviteModal
          pj={convidarPj}
          lang={lang}
          onClose={() => setConvidarPj(null)}
          onAccepted={() => { refetch(); }}
        />
      )}

      {toEdit && (
        <NovoPersonagemModal
          lang={lang}
          personagemExistente={toEdit}
          isMaster={isMaster}
          onClose={() => setToEdit(null)}
          onSaved={() => { setToEdit(null); refetch(); }}
        />
      )}

      {toDelete && (
        <ConfirmarExclusaoModal
          personagem={toDelete}
          lang={lang}
          onCancel={() => setToDelete(null)}
          onConfirm={confirmarExclusao}
        />
      )}

      {toGiveXp && (
        <DarExperienciaModal
          personagem={toGiveXp}
          lang={lang}
          onCancel={() => setToGiveXp(null)}
          onSaved={() => { setToGiveXp(null); refetch(); }}
        />
      )}
      {toGiveMoedas && (
        <DarMoedasModal
          personagem={toGiveMoedas}
          lang={lang}
          onCancel={() => setToGiveMoedas(null)}
          onSaved={() => { setToGiveMoedas(null); refetch(); }}
        />
      )}
      <div style={{ position: 'fixed', bottom: 28, left: 'calc(50% + 132px)', transform: 'translateX(-50%)', zIndex: 40 }}>
        {!isMaster && (() => {
          const limiteFree = userProfile?.plano === 'free' && personagens.length >= 3;
          if (limiteFree) {
            return (
              <button
                className="btn-ghost btn-sm limite-cta"
                disabled
                title={lang === 'en'
                  ? 'You\'ve reached the character limit for the free plan — upgrade now!'
                  : 'Você atingiu o limite de personagens do plano gratuito — faça um upgrade'}>
                ✦ {lang === 'en' ? 'You\'ve reached the character limit for the free plan — upgrade now!' : 'Você atingiu o limite de personagensdo plano gratuito — faça um upgrade'} ✦
              </button>
            );
          }
          return (
            <button className="btn-primary btn-sm" onClick={() => setModalOpen(true)}>
              {lang === 'en' ? 'New character' : 'Novo personagem'}
            </button>
          );
        })()}
      </div>
    </div>
  );
}

function PersonagemCard({ p, isMaster, isOwn, onEdit, onDelete, onGiveXp, onGiveMoedas, onAtivar, onAbrirFicha, onEntrarMesa, semMesa, lang, playerName }) {
  const ficha = calcularFicha(p);
  const titulo = tituloDoPersonagem(p);
  const levelUp = temLevelUpPendente(p);
  // foto_url é salvo pelo ficha.jsx via Supabase Storage (bucket "avatares").
  // Suporta também os campos legados foto e avatar_url por retrocompat.
  const fotoUrl = p.foto_url || p.foto || p.avatar_url || null;
  const inicial = (p.nome || '?').trim().charAt(0).toUpperCase();
  return (
    <article
      className={'pj-card' + (levelUp ? ' pj-card--levelup' : '') + (onAtivar ? ' is-clickable' : '')}
      onClick={onAtivar}
    >
      <div className="pj-card-actions">
        {isMaster && (
          <button
            className="btn-icon btn-sm pj-card-action pj-card-action-moedas"
            onClick={(e) => { e.stopPropagation(); onGiveMoedas(); }}
            title={lang === 'en' ? 'Coins' : 'Moedas'}
            aria-label={lang === 'en' ? 'Coins' : 'Moedas'}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="8" />
              <path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 1.5-2.5 3" />
              <circle cx="12" cy="16" r="0.6" fill="currentColor" />
            </svg>
          </button>
        )}
        {isMaster && (
          <button
            className="btn-icon btn-sm pj-card-action pj-card-action-xp"
            onClick={(e) => { e.stopPropagation(); onGiveXp(); }}
            title={lang === 'en' ? 'Give XP' : 'Dar Experiência'}
            aria-label={lang === 'en' ? 'Give XP' : 'Dar Experiência'}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 L14 9 L21 9 L15.5 13 L17.5 20 L12 16 L6.5 20 L8.5 13 L3 9 L10 9 Z" />
            </svg>
          </button>
        )}
        {isMaster && onAbrirFicha && (
          <button
            className="btn-icon btn-sm pj-card-action pj-card-action-ficha"
            onClick={(e) => { e.stopPropagation(); onAbrirFicha(); }}
            title={lang === 'en' ? 'Open sheet' : 'Abrir ficha'}
            aria-label={lang === 'en' ? 'Open sheet' : 'Abrir ficha'}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </button>
        )}        
        {/* Editar (lápis) e Excluir (lixeira) removidos do card — edição via ficha do PJ ativo */}
      </div>

      {levelUp && (
        <span className="pj-evoluiu">
          {lang === 'en' ? 'Level Up' : 'Evoluiu'}
        </span>
      )}

      <div className="pj-card-body">
        <div className={'pj-card-portrait' + (!fotoUrl ? ' is-empty' : '')}>
          {fotoUrl
            ? <img src={fotoUrl} alt={[p.nome, p.sobrenome].filter(Boolean).join(' ')} className="pj-card-portrait-img" />
            : <span className="pj-card-portrait-mono">{inicial}</span>}
        </div>
        <div className="pj-card-info">
          <header className="pj-card-head">
            <div className="pj-name">
              {p.nome} {p.sobrenome || ''} · {ficha.estagio}
            </div>
          </header>
          <div className="pj-meta">
            <span>{playerName}</span>
            <span className="sep">·</span>
            <span>{p.raca}</span>
            <span className="sep">·</span>
            <span>{p.genero}</span>
            <span className="sep">·</span>
            <span>{p.profissao}</span>
            <span className="sep">·</span>
            <span>{titulo}</span>
          </div>
        </div>
      </div>

    </article>
  );
}

// ---------- Modal de confirmação de exclusão ----------
function ConfirmarExclusaoModal({ personagem, lang, onCancel, onConfirm }) {
  const fullName = `${personagem.nome}${personagem.sobrenome ? ' ' + personagem.sobrenome : ''}`;
  return (
    <ModalShell
      title={lang === 'en' ? 'Delete character?' : 'Excluir personagem?'}
      lang={lang}
      size="sm"
      onClose={onCancel}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmLabel={lang === 'en' ? 'Delete' : 'Excluir'}
    >
      <p className="subhead" style={{ margin: 0 }}>
        {lang === 'en'
          ? <>Are you sure you want to delete {fullName}?</>
          : <>Você tem certeza que quer apagar {fullName}?</>}
      </p>
    </ModalShell>
  );
}

/* ============================== [15] DarExperienciaModal — Mestre adiciona XP a um personagem ============================== */
function DarExperienciaModal({ personagem, lang, onCancel, onSaved }) {
  const [delta, setDelta] = useState(5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Escape e travamento de scroll já são responsabilidade do ModalShell — não duplicar aqui.

  const xpAtual    = personagem.experiencia || 0;
  const estAtual   = calcEstagio(xpAtual);
  const xpNovo     = xpAtual + (Number(delta) || 0);
  const estNovo    = calcEstagio(xpNovo);
  const subiuEstagio = estNovo > estAtual;

  const fullName = `${personagem.nome}${personagem.sobrenome ? ' ' + personagem.sobrenome : ''}`;

  const salvar = async () => {
    setSaving(true);
    setError(null);
    const { error } = await supabaseClient
      .from('personagens')
      .update({ experiencia: xpNovo })
      .eq('id', personagem.id);
    setSaving(false);
    if (error) {
      console.error('[xp] update falhou:', error);
      setError(error.message);
    } else {
      onSaved();
    }
  };

  return (
    <ModalShell
      title="XP"
      lang={lang}
      size="sm"
      onClose={onCancel}
      onCancel={onCancel}
      onConfirm={salvar}
      confirmLabel={saving ? (lang === 'en' ? 'Saving…' : 'Salvando…') : (lang === 'en' ? 'Grant' : 'Conceder')}
      confirmDisabled={saving || (Number(delta) || 0) === 0}
    >
        <p className="subhead" style={{ marginBottom: 22 }}>
          {lang === 'en'
            ? <>Award experience to {fullName}</>
            : <>Conceder experiência para {fullName}</>}
        </p>

        <div className="xp-grid">
          <div>
            <div className="xp-eyebrow">{lang === 'en' ? 'Current' : 'Atual'}</div>
            <div className="xp-num">{xpAtual}</div>
            <div className="xp-stage">{lang === 'en' ? 'Stage' : 'Estágio'} {estAtual}</div>
          </div>
          <div className="xp-arrow">→</div>
          <div>
            <div className="xp-eyebrow">{lang === 'en' ? 'After' : 'Depois'}</div>
            <div className="xp-num">{xpNovo}</div>
            <div className={'xp-stage' + (subiuEstagio ? ' xp-stage-up' : '')}>
              {lang === 'en' ? 'Stage' : 'Estágio'} {estNovo}
              {subiuEstagio && <span className="xp-up-mark"> ↑</span>}
            </div>
          </div>
        </div>

        <label className="wiz-field" style={{ marginTop: 18 }}>
          <span>{lang === 'en' ? 'Experience to add' : 'Experiência a adicionar'}</span>
          <input
            type="number"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            autoFocus />
        </label>

        {subiuEstagio && (
          <div className="xp-notice">
            {lang === 'en'
              ? `${fullName} will level`
              : `${fullName} irá evoluir`}
          </div>
        )}

        {error && <div className="err-msg" style={{ marginTop: 14 }}>{error}</div>}
    </ModalShell>
  );
}

/* ============================== [16] DarMoedasModal: mestre concede ou subtrai moedas de um PJ ============================== */
/* Rotulos dos motivos da RPC mestre_ajustar_moedas. */
function motivoAjusteMoedaLabel(motivo, info, lang) {
  const en = lang === 'en';
  const den = en
    ? { ouro: 'gold', prata: 'silver', cobre: 'copper', latao: 'brass' }
    : { ouro: 'ouro', prata: 'prata', cobre: 'cobre', latao: 'latao' };
  const d = info && info.denom ? den[info.denom] : '';
  if (motivo === 'sem_bolsa_com_espaco') return en
    ? `No bag with room for the ${d} (get a pouch first)`
    : `Sem bolsa com espaco para o ${d} (adquira uma bolsa antes)`;
  if (motivo === 'moeda_insuficiente') return en
    ? `Not enough ${d}: has ${info?.tem ?? 0}, asked ${info?.pedido ?? 0}`
    : `${d} insuficiente: tem ${info?.tem ?? 0}, pediu ${info?.pedido ?? 0}`;
  if (motivo === 'pj_nao_encontrado') return en ? 'Character not found' : 'Personagem nao encontrado';
  return motivo;
}

function DarMoedasModal({ personagem, lang, onCancel, onSaved }) {
  const [coinVals, setCoinVals] = useState(null);   // { slug: valor_latao } do grupo Moedas
  const [deltas, setDeltas] = useState({ ouro: 0, prata: 0, cobre: 0, latao: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Valores das moedas do catalogo (uma vez). Saldo e derivado dos itens-moeda.
  useEffect(() => {
    let vivo = true;
    supabaseClient.from('itens').select('slug,valor_latao').eq('grupo', 'Moedas')
      .then(({ data }) => {
        if (!vivo) return;
        const m = {};
        (data || []).forEach((r) => { m[r.slug] = Number(r.valor_latao || 0); });
        setCoinVals(m);
      });
    return () => { vivo = false; };
  }, []);

  // Saldo atual por denominacao = soma dos itens-moeda do PJ, agrupados por valor.
  const moedasAtuais = useMemo(() => {
    const m = { ouro: 0, prata: 0, cobre: 0, latao: 0 };
    if (!coinVals) return m;
    for (const it of (personagem.inventario?.itens || [])) {
      const v = coinVals[it.slug];
      if (v == null) continue;
      const q = Number(it.quantidade || 1);
      if (v === 1000) m.ouro += q; else if (v === 100) m.prata += q;
      else if (v === 10) m.cobre += q; else if (v === 1) m.latao += q;
    }
    return m;
  }, [coinVals, personagem]);

  // Escape e travamento de scroll já são responsabilidade do ModalShell — não duplicar aqui.

  const labels = lang === 'en'
    ? { ouro: 'Gold', prata: 'Silver', cobre: 'Copper', latao: 'Brass' }
    : { ouro: 'Ouro', prata: 'Prata', cobre: 'Cobre', latao: 'Latão' };

  const novosValores = {
    ouro:  (moedasAtuais.ouro  || 0) + (Number(deltas.ouro)  || 0),
    prata: (moedasAtuais.prata || 0) + (Number(deltas.prata) || 0),
    cobre: (moedasAtuais.cobre || 0) + (Number(deltas.cobre) || 0),
    latao: (moedasAtuais.latao || 0) + (Number(deltas.latao) || 0),
  };
  const denomNegativa = MOEDA_ORDEM.find((k) => novosValores[k] < 0);
  const totalAtual  = moedasToLatao(moedasAtuais);
  const totalNovo   = moedasToLatao(novosValores);
  const haDelta = MOEDA_ORDEM.some((k) => (Number(deltas[k]) || 0) !== 0);

  const fullName = `${personagem.nome}${personagem.sobrenome ? ' ' + personagem.sobrenome : ''}`;

  const salvar = async () => {
    if (denomNegativa) return;
    setSaving(true);
    setError(null);
    const deltasInt = {
      ouro:  Number(deltas.ouro)  || 0, prata: Number(deltas.prata) || 0,
      cobre: Number(deltas.cobre) || 0, latao: Number(deltas.latao) || 0,
    };
    const { data, error } = await supabaseClient.rpc('mestre_ajustar_moedas', {
      p_pj_id: personagem.id, p_deltas: deltasInt,
    });
    setSaving(false);
    if (error || !data?.ok) {
      const motivo = (data && data.motivo) || (error && error.message) || 'erro_desconhecido';
      setError(motivoAjusteMoedaLabel(motivo, data, lang));
      return;
    }
    onSaved();
  };

  if (!coinVals) {
    return (
      <ModalShell title={lang === 'en' ? 'Coins' : 'Moedas'} lang={lang} size="sm" onClose={onCancel} onCancel={onCancel}>
        <div className="admin-loading"><span>{lang === 'en' ? 'Loading...' : 'Carregando...'}</span></div>
      </ModalShell>
    );
  }

  return (
    <ModalShell
      title={lang === 'en' ? 'Coins' : 'Moedas'}
      lang={lang}
      size="sm"
      onClose={onCancel}
      onCancel={onCancel}
      onConfirm={salvar}
      confirmLabel={saving ? (lang === 'en' ? 'Saving…' : 'Salvando…') : (lang === 'en' ? 'Apply' : 'Aplicar')}
      confirmDisabled={saving || !haDelta || !!denomNegativa}
    >
        <p className="subhead" style={{ marginBottom: 22 }}>
          {lang === 'en'
            ? <>Adjust the coin purse of {fullName}</>
            : <>Ajuste a algibeira de {fullName}</>}
        </p>

        <div className="moedas-grid">
          {MOEDA_ORDEM.map((tipo) => (
            <div className={'moedas-row cofre-' + tipo} key={tipo}>
              <div className="moedas-row-label">
                <div className="cofre-coin" aria-hidden="true">
                  <div className="cofre-coin-inner">{tipo === 'ouro' ? 'O' : tipo === 'prata' ? 'P' : tipo === 'cobre' ? 'C' : 'L'}</div>
                </div>
                <span>{labels[tipo]}</span>
              </div>
              <div className="moedas-row-current"><small>{lang === 'en' ? 'now' : 'atual'}</small>
                <strong>{moedasAtuais[tipo] || 0}</strong>
              </div>
              <input
                type="number"
                className={'moedas-row-delta' + (novosValores[tipo] < 0 ? ' err' : '')}
                value={deltas[tipo]}
                onChange={(e) => setDeltas((d) => ({ ...d, [tipo]: e.target.value === '' || e.target.value === '-' ? e.target.value : (parseInt(e.target.value, 10) || 0) }))}
                placeholder="±0"
              />
              <div className="moedas-row-after"><small>{lang === 'en' ? 'after' : 'depois'}</small>
                <strong className={novosValores[tipo] < 0 ? 'err' : ''}>{novosValores[tipo]}</strong>
              </div>
            </div>
          ))}
        </div>

        <div className="moedas-total">
          <span>{lang === 'en' ? 'Total' : 'Total'}:</span>
          <strong>{totalAtual.toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR')}</strong>
          <span className="arrow">→</span>
          <strong className={totalNovo < 0 ? 'err' : ''}>
            {totalNovo.toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR')}
          </strong>
        </div>

        {denomNegativa && (
          <div className="err-msg" style={{ marginTop: 14 }}>
            {lang === 'en'
              ? `Cannot make ${labels[denomNegativa]} negative, the character has only ${moedasAtuais[denomNegativa] || 0}.`
              : `A moeda ${labels[denomNegativa]} ficaria com o valor negativo, e o personagem só possui ${moedasAtuais[denomNegativa] || 0}.`}
          </div>
        )}
        {error && <div className="err-msg" style={{ marginTop: 14 }}>{error}</div>}
    </ModalShell>
  );
}

/* ============================== [17] NovoPersonagemModal: wizard de criação em 3 passos ============================== */
function NovoPersonagemModal({ lang, onClose, onSaved, personagemExistente = null, isMaster = false }) {
  const isEdit = !!personagemExistente;
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [magiasDb, setMagiasDb] = useState(null);
  const [magiasError, setMagiasError] = useState(null);
  const [tecnicasDb, setTecnicasDb] = useState(null);
  const [tecnicasError, setTecnicasError] = useState(null);
  const [habilidadesDb, setHabilidadesDb] = useState(null);
  const [habilidadesError, setHabilidadesError] = useState(null);
  const [maxStep, setMaxStep] = useState(isEdit ? 999 : 1);

  // Form state — em criação começa com defaults; em edição vem do personagem
  const [form, setForm] = useState(() => isEdit ? {
    nome: personagemExistente.nome || '',
    sobrenome: personagemExistente.sobrenome || '',
    raca: personagemExistente.raca || 'Humano',
    genero: personagemExistente.genero || '',
    reino: personagemExistente.reino || 'Verrogar',
    profissao: personagemExistente.profissao || 'Guerreiro',
    especializacao: personagemExistente.especializacao || '',
    deus: personagemExistente.deus || '',
    intelecto_base: personagemExistente.intelecto_base ?? 0,
    aura_base: personagemExistente.aura_base ?? 0,
    carisma_base: personagemExistente.carisma_base ?? 0,
    forca_base: personagemExistente.forca_base ?? 0,
    fisico_base: personagemExistente.fisico_base ?? 0,
    agilidade_base: personagemExistente.agilidade_base ?? 0,
    percepcao_base: personagemExistente.percepcao_base ?? 0,
    experiencia: personagemExistente.experiencia ?? 0,
    habilidades: personagemExistente.habilidades || {},
    magias: personagemExistente.magias || {},
    tecnicas: personagemExistente.tecnicas || {},
    grupos_armas: personagemExistente.grupos_armas || {},
    aprimoramentos: personagemExistente.aprimoramentos || {},
  } : {
    nome: '',
    sobrenome: '',
    raca: 'Humano',
    genero: '',
    reino: 'Verrogar',
    profissao: 'Guerreiro',
    especializacao: '',
    deus: '',
    intelecto_base: 0, aura_base: 0, carisma_base: 0,
    forca_base: 0, fisico_base: 0, agilidade_base: 0, percepcao_base: 0,
    experiencia: 0,
    habilidades: {},
    magias: {},
    tecnicas: {},
    grupos_armas: {},
    aprimoramentos: {},
  });

  // Carrega magias do banco uma vez
  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data, error } = await supabaseClient
        .from('magias')
        .select('*')
        .order('nome', { ascending: true });
      if (cancel) return;
      if (error) {
        console.error('[magias] falha ao carregar:', error);
        setMagiasError(error.message);
        setMagiasDb([]);
      } else {
        setMagiasDb(data || []);
      }
    })();
    return () => { cancel = true; };
  }, []);

  // Carrega técnicas do banco uma vez
  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data, error } = await supabaseClient
        .from('tecnicas')
        .select('*')
        .order('nome', { ascending: true });
      if (cancel) return;
      if (error) {
        console.error('[tecnicas] falha ao carregar:', error);
        setTecnicasError(error.message);
        setTecnicasDb([]);
      } else {
        setTecnicasDb(data || []);
      }
    })();
    return () => { cancel = true; };
  }, []);

  // Carrega habilidades do banco uma vez
  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data, error } = await supabaseClient
        .from('habilidades')
        .select('*')
        .order('nome', { ascending: true });
      if (cancel) return;
      if (error) {
        console.error('[habilidades] falha ao carregar:', error);
        setHabilidadesError(error.message);
        setHabilidadesDb([]);
      } else {
        setHabilidadesDb(data || []);
      }
    })();
    return () => { cancel = true; };
  }, []);

  // Map key→row pros helpers de habilidade. Enquanto o banco não carregou,
  // fica vazio — os helpers já tratam ausência retornando 0.
  const habilidadesByKey = useMemo(() => {
    if (!habilidadesDb) return {};
    return habilidadesDb.reduce((acc, h) => { acc[h.key] = h; return acc; }, {});
  }, [habilidadesDb]);

  // Bônus de habilidade por raça + reino: cruza form.raca/form.reino com as
  // colunas vantagem/desvantagem da tabela `habilidades`. Resultado: objeto
  // `{ [habKey]: ±2 }` consumido por todas as chamadas de totalHabilidade.
  const bonusHabilidades = useMemo(
    () => calcBonusHabilidadesRacaReino(form.raca, form.reino, habilidadesDb),
    [form.raca, form.reino, habilidadesDb]
  );

  // Escape e travamento de scroll já são responsabilidade do ModalShell — não duplicar aqui.

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const baseVals = ATRIBUTOS_KEYS.reduce((acc, k) => { acc[k] = form[`${k}_base`]; return acc; }, {});
  const gastos = pontosGastos(baseVals);
  const totalPontos = pontosDisponiveis(calcEstagio(form.experiencia));
  const restantes = totalPontos - gastos;

  // ---- Habilidades ----
  const estagioForm = calcEstagio(form.experiencia);
  const habTotalPontos = pontosHabilidadesTotal(form.profissao, estagioForm);
  const habGasto       = gastoHabilidades(form.habilidades, habilidadesByKey);
  const habRestantes   = habTotalPontos - habGasto;

  // ---- Magias (só pra Bardo, Mago, Rastreador, Sacerdote) ----
  const usaMagia       = profissaoUsaMagia(form.profissao);
  const magTotalPontos = pontosMagiasTotal(form.profissao, estagioForm);
  const magGasto       = gastoMagias(form.magias, magiasDb);
  const magRestantes   = magTotalPontos - magGasto;

  // ---- Técnicas ----
  const tecTotalPontos = pontosTecnicasTotal(form.profissao, estagioForm);
  const tecGasto       = gastoTecnicas(form.tecnicas, tecnicasDb);
  const tecRestantes   = tecTotalPontos - tecGasto;
  const tecQtd         = qtdTecnicas(form.tecnicas);

  // ---- Grupos de Armas ----
  const grpTotalPontos = pontosGruposArmasTotal(form.profissao, estagioForm);
  const grpGasto       = gastoGruposArmas(form.grupos_armas);
  const grpRestantes   = grpTotalPontos - grpGasto;
  const grpQtd         = qtdGruposArmas(form.grupos_armas);

  // ---- Steps dinâmicos (cada "tela" é um passo) ----
  // Identidade = 5 telas; Habilidades = 1 tela por grupo (GRUPOS_HABILIDADES_ORDEM);
  // Magias = 2 telas (Básicas/Avançadas, só p/ quem usa magia). Atributos, Grupos
  // de Armas, Técnicas e Revisão são 1 tela cada.
  const SEC = {
    identidade:   lang === 'en' ? 'Identity'      : 'Identidade',
    atributos:    lang === 'en' ? 'Attributes'    : 'Atributos Básicos',
    grupos_armas: lang === 'en' ? 'Weapon Groups' : 'Grupos de Armas',
    habilidades:  lang === 'en' ? 'Skills'        : 'Habilidades',
    magias:       lang === 'en' ? 'Spells'        : 'Magias',
    tecnicas:     lang === 'en' ? 'Techniques'    : 'Técnicas de Combate',
    revisao:      lang === 'en' ? 'Review'        : 'Revisão',
  };
  const steps = [
    { id: 'identidade',   sub: 'principal', label: lang === 'en' ? 'Identity'         : 'Identidade'               },
    { id: 'identidade',   sub: 'fisica',    label: lang === 'en' ? 'Physical Traits'  : 'Caracterização Física'    },
    { id: 'identidade',   sub: 'social',    label: lang === 'en' ? 'Social Traits'    : 'Caracterização Social'    },
    { id: 'identidade',   sub: 'religiosa', label: lang === 'en' ? 'Religious Traits' : 'Caracterização Religiosa' },
    { id: 'identidade',   sub: 'pessoal',   label: lang === 'en' ? 'Personal Traits'  : 'Caracterização Pessoal'   },
    { id: 'atributos',    sub: null,        label: SEC.atributos    },
    { id: 'grupos_armas', sub: null,        label: SEC.grupos_armas },
    ...GRUPOS_HABILIDADES_ORDEM.map((g) => ({
      id: 'habilidades',
      sub: g,
      label: lang === 'en' ? `${g} Group Skill` : `Habilidade do Grupo ${g}`,
    })),
    ...(usaMagia ? [
      { id: 'magias', sub: 'basica',   label: lang === 'en' ? 'Basic Spells'    : 'Magias Básicas'   },
      { id: 'magias', sub: 'avancada', label: lang === 'en' ? 'Advanced Spells' : 'Magias Avançadas' },
    ] : []),
    { id: 'tecnicas', sub: null, label: SEC.tecnicas },
    { id: 'revisao',  sub: null, label: SEC.revisao  },
  ];

  // Sincroniza maxStep quando steps muda (ex: troca de profissão que usa magia)
  useEffect(() => {
    if (isEdit) setMaxStep(steps.length);
    // modo criação: nunca diminua — o usuário já visitou aquele step
    else setMaxStep((prev) => Math.max(prev, steps.length - 1));
  }, [steps.length, isEdit]);

  // Se a profissão mudou e o step atual ficou inválido (ex.: estava em magias
  // como Mago, trocou pra Guerreiro), volta pro último step válido.
  useEffect(() => {
    if (step > steps.length) setStep(steps.length);
  }, [step, steps.length]);

  // Limpa magias do form quando a profissão deixa de usar magia
  useEffect(() => {
    if (!usaMagia && Object.keys(form.magias || {}).length > 0) {
      setForm((f) => ({ ...f, magias: {} }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usaMagia]);

  const currentStep = steps[step - 1];
  const currentId = currentStep?.id;
  const currentSub = currentStep?.sub ?? null;

  // Texto descritivo da tela atual (placeholder — troque os textos depois).
  // Chave = `${id}` ou `${id}:${sub}` quando a seção tem várias telas.
  const stepKey = currentId + (currentSub ? `:${currentSub}` : '');
  const DESCRICOES_TELA = {
    'identidade:principal': 'Descreva quem é o seu personagem: nome, origem e vocação.',
    'identidade:fisica':    'Caracterização física do personagem (placeholder).',
    'identidade:social':    'Caracterização social do personagem (placeholder).',
    'identidade:religiosa': 'Caracterização religiosa do personagem (placeholder).',
    'identidade:pessoal':   'Caracterização pessoal do personagem (placeholder).',
    'atributos':            'Distribua os pontos entre os atributos básicos.',
    'grupos_armas':         'Treine grupos de armas para usá-las com proficiência.',
    'habilidades':          'Compre níveis nas habilidades deste grupo.',
    'magias':               'Escolha e desenvolva as magias do personagem.',
    'tecnicas':             'Adquira técnicas de combate para o personagem.',
    'revisao':              'Confira tudo antes de finalizar o personagem.',
  };
  const descricaoTela = DESCRICOES_TELA[stepKey] || DESCRICOES_TELA[currentId] || '';  

  // Validações por passo
  const erroIdentidade =
    !form.nome.trim()         ? 'Escolha um nome' :
    !form.raca                ? 'Escolha uma raça' :
    !form.reino               ? 'Escolha um reino' :
    !form.profissao           ? 'Escolha uma profissão' : null;

  const erroAtributos = restantes < 0
    ? `Você gastou ${gastos} pontos em atributos, mas só tem ${totalPontos}`
    : null;

  const erroHabilidades = habRestantes < 0
    ? `Você gastou ${habGasto} pontos em habilidades, mas só tem ${habTotalPontos}`
    : null;

  const erroMagias = magRestantes < 0
    ? `Você gastou ${magGasto} pontos em magias, mas só tem ${magTotalPontos}`
    : null;

  const erroTecnicas = tecRestantes < 0
    ? `Você gastou ${tecGasto} pontos em técnicas, mas só tem ${tecTotalPontos}`
    : null;

  const erroGruposArmas = grpRestantes < 0
    ? `Você gastou ${grpGasto} pontos em grupos de armas, mas só tem ${grpTotalPontos}`
    : null;

  const podeAvancar =
    currentId === 'identidade'   ? !erroIdentidade :
    currentId === 'atributos'    ? !erroAtributos :
    currentId === 'grupos_armas' ? !erroGruposArmas :
    currentId === 'habilidades'  ? !erroHabilidades :
    currentId === 'magias'       ? !erroMagias :
    currentId === 'tecnicas'     ? !erroTecnicas : true;

  // Calcula atributos finais (base + racial) pra usar nos cálculos de Total de habilidade
  const racaData = GAME_DATA.racas[form.raca];
  const atributosFinais = ATRIBUTOS_KEYS.reduce((acc, k) => {
    acc[k] = (form[`${k}_base`] ?? 0) + (racaData?.mods[k] ?? 0);
    return acc;
  }, {});

  const salvar = async () => {
    setSaveError(null);
    setSaving(true);
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      setSaveError('Você precisa estar logado para criar um personagem');
      setSaving(false);
      return;
    }
    const payload = {
      user_id: session.user.id,
      nome: form.nome.trim(),
      sobrenome: form.sobrenome.trim() || null,
      raca: form.raca,
      genero: form.genero,
      reino: form.reino,
      profissao: form.profissao,
      deus: form.deus || null,
      especializacao: form.especializacao || null,
      intelecto_base: form.intelecto_base,
      aura_base: form.aura_base,
      carisma_base: form.carisma_base,
      forca_base: form.forca_base,
      fisico_base: form.fisico_base,
      agilidade_base: form.agilidade_base,
      percepcao_base: form.percepcao_base,
      experiencia: form.experiencia,
      habilidades: form.habilidades || {},
      magias: usaMagia ? (form.magias || {}) : {},
      tecnicas: form.tecnicas || {},
      grupos_armas: form.grupos_armas || {},
      aprimoramentos: form.aprimoramentos || {},
    };

    // Quando o JOGADOR edita seu próprio PJ, marca que ele já viu o estágio atual
    // (isso esconde o badge "Pronto pra evoluir!"). O Mestre NÃO atualiza isso.
    if (isEdit && !isMaster) {
      payload.nivel_visto = calcEstagio(form.experiencia);
    }
    // Em UPDATE pelo Mestre, preserva user_id original (não muda dono)
    if (isEdit && isMaster) {
      payload.user_id = personagemExistente.user_id;
    }

    let error;
    let novoPj = null;
    if (isEdit) {
      // UPDATE — preserva id, user_id e created_at
      const { error: err } = await supabaseClient
        .from('personagens')
        .update(payload)
        .eq('id', personagemExistente.id);
      error = err;
    } else {
      // INSERT — retorna o PJ recém-criado pra encadear o "entrar em uma mesa"
      const { data, error: err } = await supabaseClient
        .from('personagens')
        .insert(payload)
        .select('id, nome, sobrenome')
        .single();
      error = err;
      novoPj = data || null;
    }
    setSaving(false);
    if (error) {
      console.error('[personagens] save falhou:', error);
      setSaveError(error.message);
    } else {
      // Em criação devolve o PJ novo (pra abrir o convite); em edição, null.
      onSaved(isEdit ? null : novoPj);
    }
  };

  const isUltimoStep = step === steps.length;

  // Saldo de pontos do footer central — varia conforme o step atual.
  const footerSaldo = currentId === 'atributos' ? (
    <WizSaldo lang={lang} disponiveis={totalPontos} gastos={gastos} restantes={restantes} />
  ) : currentId === 'grupos_armas' ? (
    <WizSaldo lang={lang} disponiveis={grpTotalPontos} gastos={grpGasto} restantes={grpRestantes} />
  ) : currentId === 'habilidades' ? (
    <WizSaldo lang={lang} disponiveis={habTotalPontos} gastos={habGasto} restantes={habRestantes} />
  ) : currentId === 'magias' ? (
    <WizSaldo lang={lang} disponiveis={magTotalPontos} gastos={magGasto} restantes={magRestantes} />
  ) : currentId === 'tecnicas' ? (
    <WizSaldo lang={lang} disponiveis={tecTotalPontos} gastos={tecGasto} restantes={tecRestantes} />
  ) : null;

  const wizStepper = (
    <div className="wiz-progress-track">
      {steps.map((s, i) => {
        const n = i + 1;
        const bloqueado = n > maxStep || (n > step && !podeAvancar);
        return (
          <button
            key={i}
            type="button"
            title={s.label}
            aria-label={s.label}
            aria-current={step === n ? 'step' : undefined}
            className={'wiz-progress-seg' + (step === n ? ' active' : '') + (step > n ? ' done' : '') + (bloqueado ? ' locked' : '')}
            onClick={() => {
              if (n === step) return;
              if (n > step && !podeAvancar) return;
              if (n > maxStep) return;
              setStep(n);
            }}
          />
        );
      })}
    </div>
  );

  return (
    <ModalShell
      title={currentStep?.label}
      lang={lang}
      size="lg"
      extraClass="ms-wizard"
      onClose={onClose}
      onCancel={onClose}
      headerExtra={wizStepper}
      footerCenter={footerSaldo}
      footerBeforeConfirm={step > 1 && (
        <button className="btn-ghost btn-sm" onClick={() => setStep(step - 1)} disabled={saving}>
          {lang === 'en' ? 'Back' : 'Voltar'}
        </button>
      )}
      onConfirm={isUltimoStep ? salvar : () => {
        const proximo = step + 1;
        setStep(proximo);
        if (proximo > maxStep) setMaxStep(proximo);
      }}
      confirmLabel={isUltimoStep
        ? (saving
          ? (lang === 'en' ? 'Saving…' : 'Salvando…')
          : (personagemExistente ? (lang === 'en' ? 'Save' : 'Salvar') : (lang === 'en' ? 'Create' : 'Criar')))
        : (lang === 'en' ? 'Next' : 'Avançar')}
      confirmDisabled={isUltimoStep ? saving : !podeAvancar}
    >
          {descricaoTela && <p className="wiz-screen-desc">{descricaoTela}</p>}
          {currentId === 'identidade' && <StepIdentidade form={form} update={update} lang={lang} isEdit={isEdit} estagio={estagioForm} sub={currentSub} />}
          {currentId === 'atributos' && (
            <StepAtributos
              form={form} update={update} lang={lang}
              gastos={gastos} totalPontos={totalPontos} restantes={restantes}
              isEdit={isEdit} isMaster={isMaster}
              originais={personagemExistente} />
          )}
          {currentId === 'grupos_armas' && (
            <StepGruposArmas
              form={form} update={update} lang={lang}
              grpTotalPontos={grpTotalPontos}
              grpGasto={grpGasto}
              grpRestantes={grpRestantes}
              grpQtd={grpQtd}
              estagio={estagioForm}
              isEdit={isEdit}
              personagemExistente={personagemExistente}
            />
          )}
          {currentId === 'habilidades' && (
            <StepHabilidades
              form={form} update={update} lang={lang}
              sub={currentSub}
              atributosFinais={atributosFinais}
              habTotalPontos={habTotalPontos}
              habGasto={habGasto}
              habRestantes={habRestantes}
              habilidadesDb={habilidadesDb} habilidadesError={habilidadesError}
              habilidadesByKey={habilidadesByKey}
              bonusHabilidades={bonusHabilidades}
              isEdit={isEdit}
              personagemExistente={personagemExistente}
            />
          )}
          {currentId === 'magias' && (
            <StepMagias
              form={form} update={update} lang={lang}
              sub={currentSub}
              magiasDb={magiasDb} magiasError={magiasError}
              magTotalPontos={magTotalPontos}
              magGasto={magGasto}
              magRestantes={magRestantes}
              isEdit={isEdit}
              personagemExistente={personagemExistente}
            />
          )}
          {currentId === 'tecnicas' && (
            <StepTecnicas
              form={form} update={update} lang={lang}
              atributosFinais={atributosFinais}
              tecnicasDb={tecnicasDb} tecnicasError={tecnicasError}
              tecTotalPontos={tecTotalPontos}
              tecGasto={tecGasto}
              tecRestantes={tecRestantes}
              tecQtd={tecQtd}
              isEdit={isEdit}
              personagemExistente={personagemExistente}
            />
          )}
          {currentId === 'revisao' && (
            <StepRevisao
              form={form} lang={lang}
              atributosFinais={atributosFinais}
              magiasDb={magiasDb}
              tecnicasDb={tecnicasDb}
              habilidadesByKey={habilidadesByKey}
              bonusHabilidades={bonusHabilidades} />
          )}
          {saveError && <div className="err-msg" style={{ marginTop: 14 }}>{saveError}</div>}
    </ModalShell>
  );
}

// ---- Step 1: Identidade ----
// Mapa raça → caminho da imagem. Coloque os arquivos em /img/racas/.
// As CHAVES têm que bater EXATAMENTE com Object.keys(GAME_DATA.racas)
// (mesma grafia que aparece no <select> de Raça). Quem não estiver
// listada aqui cai no placeholder com a inicial.
const WIZ_RACA_FOTO = {
  'Humano':    '/img/racas/humano.png',
  'Meio-Elfo': '/img/racas/meio-elfo.png',
  'Elfo-Dourado':    '/img/racas/elfo-dourado.png',
  'Anão':    '/img/racas/anao.png',
  'Pequenino':    '/img/racas/pequenino.png',
  'Elfo-Florestal':    '/img/racas/elfo-florestal.png',
  'Elfo-Sombrio':    '/img/racas/elfo-sombrio.png',
  'Meio-Orc':    '/img/racas/meio-orc.png',
};

function StepIdentidade({ form, update, lang, isEdit, estagio, sub = 'principal' }) {
  const opcoesEsp = GAME_DATA.especializacoes[form.profissao] || [];
  const mostraEsp = estagio >= 5 && opcoesEsp.length > 0;
  const fotoRaca  = WIZ_RACA_FOTO[form.raca] || null;
  const breveLabel = lang === 'en' ? 'Coming soon' : 'Em breve';

  // Telas de caracterização — por enquanto placeholders travados ("Em breve").
  // Quando os campos reais existirem, é só trocar o corpo de cada bloco.
  const CARACT = {
    fisica:    { nome: 'Física',    nomeEn: 'Physical'  },
    social:    { nome: 'Social',    nomeEn: 'Social'    },
    religiosa: { nome: 'Religiosa', nomeEn: 'Religious' },
    pessoal:   { nome: 'Pessoal',   nomeEn: 'Personal'  },
  };

  // ── Telas 2–5: Caracterização Física / Social / Religiosa / Pessoal ──
  if (sub && sub !== 'principal') {
    const col = CARACT[sub] || CARACT.fisica;
    const nome = lang === 'en' ? col.nomeEn : col.nome;
    return (
      <div className="wiz-ident wiz-ident-caract">
        {Array.from({ length: 8 }, (_, i) => {
          const n = i + 1;
          return (
            <label className="wiz-field wiz-field-locked" key={n}>
              <span>{lang === 'en' ? `${nome} Option ${n}` : `Opção ${nome} ${n}`}</span>
              <select disabled value="">
                <option value="">{breveLabel}</option>
              </select>
            </label>
          );
        })}
      </div>
    );
  }

  // ── Tela 1: Imagem + Identidade ──
  return (
    
    <div className="wiz-ident">
      {/* <div className="wiz-prof-retrato wiz-ident-retrato"> 
        {fotoRaca ? (
          <img src={fotoRaca} alt={form.raca} className="wiz-prof-img" />
        ) : (
          <div className="wiz-prof-placeholder">
            <span className="wiz-prof-inicial">{form.raca.charAt(0)}</span>
          </div>
        )}
        <div className="wiz-prof-legenda">{form.raca}</div>
      </div>*/}

      <div className="wiz-col">
        <label className={'wiz-field' + (isEdit ? ' wiz-field-locked' : '')}>
          <span>Nome</span>
          <input type="text" value={form.nome} onChange={(e) => update('nome', e.target.value)}
            placeholder="Aygrius" disabled={isEdit} readOnly={isEdit} />
        </label>
        <label className="wiz-field">
          <span>{lang === 'en' ? 'Surname' : 'Sobrenome'}</span>
          <input type="text" value={form.sobrenome} onChange={(e) => update('sobrenome', e.target.value)} />
        </label>
        {/* ── Gênero ──────────────────── */}
        <label className="wiz-field">
          <span>{lang === 'en' ? 'Gender' : 'Gênero'}</span>
          <select value={form.genero} onChange={(e) => update('genero', e.target.value)}>
            <option value=""></option>
            {GAME_DATA.generos.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        <label className={'wiz-field' + (isEdit ? ' wiz-field-locked' : '')}>
          <span>{lang === 'en' ? 'Race' : 'Raça'}</span>
          <select value={form.raca} onChange={(e) => update('raca', e.target.value)} disabled={isEdit}>
            {Object.keys(GAME_DATA.racas).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className={'wiz-field' + (isEdit ? ' wiz-field-locked' : '')}>
          <span>{lang === 'en' ? 'Profession' : 'Profissão'}</span>
          <select value={form.profissao} onChange={(e) => update('profissao', e.target.value)} disabled={isEdit}>
            {Object.keys(GAME_DATA.profissoes).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        {mostraEsp && (
          <label className="wiz-field">
            <span>{lang === 'en' ? 'Specialization' : 'Especialização'}</span>
            <select value={form.especializacao || ''} onChange={(e) => update('especializacao', e.target.value)}>
              <option value="">{lang === 'en' ? '— choose —' : '— escolha —'}</option>
              {opcoesEsp.map((o) => (
                <option key={o.esp} value={o.esp}>{o.esp}</option>
              ))}
            </select>
          </label>
        )}
        <label className={'wiz-field' + (isEdit ? ' wiz-field-locked' : '')}>
          <span>{lang === 'en' ? 'Kingdom' : 'Reino'}</span>
          <select value={form.reino} onChange={(e) => update('reino', e.target.value)} disabled={isEdit}>
            {GAME_DATA.reinos.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="wiz-field">
          <span>{lang === 'en' ? 'God' : 'Deus'}</span>
          <select value={form.deus} onChange={(e) => update('deus', e.target.value)}>
            <option value=""></option>
            {GAME_DATA.deuses.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

// ---- Barra de saldo do wizard (selo circular) ----
// Anel = progresso de gastos sobre o disponível. Centro = pontos restantes.
// `extra` é a 4ª métrica opcional (Treinados/Quantidade/Magias/Técnicas): { label, valor, warn? }.
function WizSaldo({ lang, disponiveis, gastos, restantes, extra }) {
  const pct = disponiveis > 0 ? Math.max(0, Math.min(100, (gastos / disponiveis) * 100)) : 0;
  const estado = restantes < 0 ? 'neg' : restantes === 0 ? 'ok' : '';
  return (
    <div className="wiz-saldo">
      <div className={'wiz-saldo-ring' + (estado ? ' ' + estado : '')} style={{ '--p': pct + '%' }}>
        <div className="wiz-saldo-hole">
          <span className="wiz-saldo-num">{restantes}</span>
        </div>
      </div>
      {extra && (
        <div className="wiz-saldo-stats">
          <div className={'wiz-saldo-stat accent' + (extra.warn ? ' warn' : '')}>
            <span className="k">{extra.label}</span>
            <span className="v">{extra.valor}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Step 2: Atributos ----
const ATRIBUTOS_DESCRICAO = {
  intelecto:  'O atributo intelecto representa sua capacidade de raciocínio, aprendizado e memória. É um atributo fundamental para o estudo de magias, conhecimentos em geral e habilidades complexas.',
  aura:       'Todos os seres são envolvidos por uma energia espiritual que os conecta a outros planos de existência. O atributo aura permite a concentração do karma (energia mágica) em seu corpo e fortalece sua resistência contra determinados efeitos mágicos.',
  carisma:    'O atributo carisma reflete na força de sua personalidade, autoconfiança, liderança e sua capacidade de influenciar os outros. Este atributo é essencial para habilidades de persuasão, negociação e liderança.',
  forca:      'O atributo força determina seu poder físico, incluindo sua capacidade de erguer pesos, realizar esforços intensos e causar dano em combate. Também influencia o uso eficiente de armas mais pesadas.',
  fisico:     'O atributo físico mede a resistência de seu corpo ao esforço, à dor e aos ferimentos. Influencia na saúde, vigor e na sua capacidade de suportar a fadiga do combate, além de melhorar as chances de sobreviver a ferimentos graves.',
  agilidade:  'O atributo agilidade representa os reflexos, a velocidade e a coordenação motora. É especialmente importante para manobras, ações de subterfúgio e esquivas, tornando você um alvo mais difícil de atingir em combate.',
  percepcao:  'O atributo percepção define a capacidade de observar, interpretar e compreender o ambiente ao redor. Engloba atenção, concentração e percepção de detalhes, sendo um atributo indispensável para rastreadores, exploradores e sentinelas.',
};

function StepAtributos({ form, update, lang, gastos, totalPontos, restantes, isEdit, isMaster, originais }) {
  const racaData = GAME_DATA.racas[form.raca];
  const [expandido, setExpandido] = useState(null);
  // Faixa permitida: -2 a +6 sempre. Reduzir atributo DEVOLVE pontos
  // (custoAtributo[-1] = -0.5 → +0.5 ponto; custoAtributo[-2] = -1 → +1 ponto).
  const incrementar = (k, delta) => {
    const atual = form[`${k}_base`] ?? 0;
    const novo = atual + delta;
    if (novo < -2 || novo > 6) return;
    // Em edição, não deixa reduzir abaixo do valor original salvo
    if (isEdit && originais && novo < (originais[`${k}_base`] ?? 0)) return;
    // Bloqueia o aumento se não houver pontos suficientes para o próximo nível
    if (delta > 0 && restantes - (custoAtributo(novo) - custoAtributo(atual)) < 0) return;
    update(`${k}_base`, novo);
  };

  return (
    <div className="wiz-attrs">
      <div className="table-wrap">
      <table className="wiz-hab-table wiz-attrs-table">
        <thead>
          <tr>
            <th>{lang === 'en' ? 'Attribute' : 'Atributo'}</th>
            <th>{lang === 'en' ? 'Racial' : 'Racial'}</th>
            <th>{lang === 'en' ? 'Cost' : 'Custo'}</th>
            <th>{lang === 'en' ? 'Level' : 'Nível'}</th>            
          </tr>
        </thead>
        <tbody>
          {ATRIBUTOS_KEYS.map((k) => {
            const base = form[`${k}_base`] ?? 0;
            const mod = racaData.mods[k] ?? 0;
            const isOpen = expandido === k;
            const descricao = ATRIBUTOS_DESCRICAO[k];
            const semSaldoPraMais = restantes - (custoAtributo(base + 1) - custoAtributo(base)) < 0;
            return (
              <React.Fragment key={k}>
              <tr>
                <td
                  className={"wiz-attrs-name wiz-mag-name--clickable"}
                  onClick={() => setExpandido(isOpen ? null : k)}>
                  <span className="wiz-mag-chevron" style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</span>
                  {ATRIBUTOS_LABEL[k]}
                </td>
                <td className={mod > 0 ? 'pos' : mod < 0 ? 'neg' : ''}>{mod >= 1 ? '+' : ''}{mod}</td>
                <td className="wiz-attrs-cost">{custoAtributo(base)}</td>
                <td>
                  <div className="wiz-hab-stepper">
                    <button
                      type="button"
                      className="wiz-hab-step"
                      onClick={() => incrementar(k, -1)}
                      aria-label="Diminuir"
                      disabled={base <= -2 || (isEdit && originais && base <= (originais[`${k}_base`] ?? 0))}>
                      −
                    </button>
                    <span className="wiz-hab-step-val">{base}</span>
                    <button
                      type="button"
                      className="wiz-hab-step"
                      onClick={() => incrementar(k, +1)}
                      aria-label="Aumentar"
                      disabled={base >= 6 || semSaldoPraMais}
                      title={base >= 6
                        ? (lang === 'en' ? 'Maximum value' : 'Valor máximo')
                        : semSaldoPraMais
                          ? (lang === 'en' ? 'Not enough points' : 'Pontos insuficientes')
                          : undefined}>
                      +
                    </button>
                  </div>
                </td>                
              </tr>
              {isOpen && descricao && (
                <tr className="wiz-mag-detail-row">
                  <td colSpan={4}>
                    <div className="wiz-mag-detail">
                      <p className="wiz-mag-desc">{descricao}</p>
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ---- Step 3: Grupos de Armas (todas as profissões) ----
// Adiciona bônus em L, M e P ao usar uma arma do grupo treinado.
// Catálogo fixo (sem DB query) — GRUPOS_ARMAS em game-data.jsx.
function StepGruposArmas({ form, update, lang, grpTotalPontos, grpGasto, grpRestantes, grpQtd, estagio, isEdit, personagemExistente }) {
  const compradas = form.grupos_armas || {};

  // Mudar nível: respeita estágio (teto), saldo (orçamento) e não desfaz comprado em edição.

  const mudarNivel = (sigla, delta) => {
    const atual = compradas[sigla] || 0;
    const proposto = atual + delta;
    if (proposto < 0) return;
    if (proposto > estagio) return;
    if (isEdit && proposto < (personagemExistente?.grupos_armas?.[sigla] || 0)) return;
    // Valida orçamento antes de aceitar +1 — evita o usuário "vazar" e só ver o erro no footer
    if (delta > 0) {
      const grupo = GRUPOS_ARMAS_BY_SIGLA[sigla];
      if (grupo && grpRestantes - grupo.custo < 0) return;
    }
    const novo = { ...compradas };
    if (proposto === 0) delete novo[sigla];
    else                novo[sigla] = proposto;
    update('grupos_armas', novo);
  };

  const [expandido, setExpandido] = useState(null);

  // Coluna 1: grupos especificados manualmente
  const NOMES_COLUNA1_PT = ['Combate Desarmado', 'Combate de Imobilização', 'Corte Leve', 'Corte Médio', 'Corte Pesado'];
  const NOMES_COLUNA1_EN = ['Unarmed Combat', 'Grappling Combat', 'Light Cut', 'Medium Cut', 'Heavy Cut'];
  const coluna1 = GRUPOS_ARMAS.filter((g) =>
    NOMES_COLUNA1_PT.includes(g.nome) || NOMES_COLUNA1_EN.includes(g.nomeEn || '')
  );
  const coluna2 = GRUPOS_ARMAS.filter((g) =>
    !NOMES_COLUNA1_PT.includes(g.nome) && !NOMES_COLUNA1_EN.includes(g.nomeEn || '')
  );

  const renderTabela = (lista) => (
    <div className="wiz-hab-cat">
      <div className="table-wrap">
      <table className="wiz-hab-table wiz-grp-table">
        <thead>
          <tr>
            <th>{lang === 'en' ? 'Weapon Group' : 'Grupo de Armas'}</th>
            <th>{lang === 'en' ? 'Sigil' : 'Sigla'}</th>
            <th>{lang === 'en' ? 'Cost' : 'Custo'}</th>
            <th>{lang === 'en' ? 'Level' : 'Nível'}</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((g) => {
            const nivel = compradas[g.sigla] || 0;
            const isOn = nivel > 0;
            const isOpen = expandido === g.sigla;
            const original = personagemExistente?.grupos_armas?.[g.sigla] || 0;
            const acimaDoEstagio = nivel >= estagio;
            const semSaldoPraMais = grpRestantes - g.custo < 0;
            const podeMais = !acimaDoEstagio && !semSaldoPraMais;
            const podeMenos = nivel > 0 && !(isEdit && nivel <= original);
            const nomeMostrado = lang === 'en' ? (g.nomeEn || g.nome) : g.nome;
            const temDetalhe = !!(g.exemplos);
            return (
              <React.Fragment key={g.sigla}>
                <tr className={isOn ? 'on' : ''}>
                  <td
                    className={"wiz-hab-name" + (temDetalhe ? " wiz-mag-name--clickable" : "")}
                    onClick={temDetalhe ? () => setExpandido(isOpen ? null : g.sigla) : undefined}>
                    {temDetalhe && <span className="wiz-mag-chevron" style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</span>}
                    {nomeMostrado}
                  </td>
                  <td className="wiz-hab-cost">{g.sigla}</td>
                  <td className="wiz-hab-cost">{g.custo}</td>
                  <td>
                    <div className="wiz-hab-stepper">
                      <button
                        type="button"
                        className="wiz-hab-step"
                        onClick={() => mudarNivel(g.sigla, -1)}
                        disabled={!podeMenos}
                        title={isEdit && nivel > 0 && nivel <= original
                          ? (lang === 'en' ? 'Cannot undo a purchased level' : 'Não é possível desfazer um nível já comprado')
                          : (lang === 'en' ? 'Decrease' : 'Diminuir')}
                        aria-label={lang === 'en' ? 'Decrease' : 'Diminuir'}>−</button>
                      <span className="wiz-hab-step-val">{nivel}</span>
                      <button
                        type="button"
                        className="wiz-hab-step"
                        onClick={() => mudarNivel(g.sigla, +1)}
                        disabled={!podeMais}
                        title={acimaDoEstagio
                          ? (lang === 'en' ? `Maximum level for your stage (${estagio})` : `Nível máximo para seu estágio (${estagio})`)
                          : semSaldoPraMais
                            ? (lang === 'en' ? 'Not enough points' : 'Pontos insuficientes')
                            : (lang === 'en' ? 'Increase' : 'Aumentar')}
                        aria-label={lang === 'en' ? 'Increase' : 'Aumentar'}>+</button>
                    </div>
                  </td>
                </tr>
                {isOpen && temDetalhe && (
                  <tr className="wiz-mag-detail-row">
                    <td colSpan={4}>
                      <div className="wiz-mag-detail">
                        <p className="wiz-mag-desc">{g.exemplos}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );

  return (
    <div className="wiz-habs">
      {grpTotalPontos === 0 ? (
        <div className="wiz-magias-empty">
          {lang === 'en'
            ? 'No weapon-group points for this profession'
            : 'Esta profissão não possui pontos de grupo de armas'}
        </div>
      ) : (
        <div className="wiz-habs-list wiz-habs-list--single">
          {renderTabela([...coluna1, ...coluna2])}
        </div>
      )}
    </div>
  );
}

// ---- Step 3 (era 3, agora 4): Habilidades ----
function StepHabilidades({
  form, update, lang, sub, atributosFinais,
  habTotalPontos, habGasto, habRestantes,
  habilidadesDb, habilidadesError, habilidadesByKey, bonusHabilidades,
  isEdit, personagemExistente,
}) {
  const hab = form.habilidades || {};
  const estagio = calcEstagio(form.experiencia);
  // Linha aberta no acordeão (key da habilidade). Null = nenhuma aberta.
  const [expandida, setExpandida] = useState(null);

  // Loading: habilidadesDb === null enquanto o useEffect carrega.
  if (habilidadesDb === null) {
    return (
      <div className="wiz-habs">
        <div className="wiz-magias-empty">
          {lang === 'en' ? 'Loading skills…' : 'Carregando habilidades…'}
        </div>
      </div>
    );
  }
  if (habilidadesError) {
    return (
      <div className="wiz-habs">
        <div className="err-msg">{habilidadesError}</div>
      </div>
    );
  }

  // Agrupa habilidadesDb por `grupo`, na ordem canônica GRUPOS_HABILIDADES_ORDEM.
  // Dentro de cada grupo, ordena por nome (estável). O banco já manda ordenado
  // por nome, então só precisamos do bucket por grupo.
  const porGrupo = useMemo(() => {
    const buckets = {};
    GRUPOS_HABILIDADES_ORDEM.forEach((g) => { buckets[g] = []; });
    for (const h of (habilidadesDb || [])) {
      const g = h.grupo;
      if (!buckets[g]) buckets[g] = []; // bucket extra se vier grupo desconhecido
      buckets[g].push(h);
    }
    // Mantém ordem da const + qualquer grupo extra no final
    const ordem = [
      ...GRUPOS_HABILIDADES_ORDEM,
      ...Object.keys(buckets).filter((g) => !GRUPOS_HABILIDADES_ORDEM.includes(g)),
    ];
    return ordem.filter((g) => buckets[g] && buckets[g].length > 0).map((g) => [g, buckets[g]]);
  }, [habilidadesDb]);

  // Aumenta/diminui o nível comprado de uma habilidade em `delta` (±1).
  // Única restrição: o nível final (nivel_inicial + comprado) nunca pode passar
  // do ESTÁGIO do personagem. Inferior natural: 0 (não dá pra negativar a compra).
  // Quando comprado volta a 0, a chave é removida do objeto pra manter limpo.
  const mudarNivel = (key, delta) => {
    const h = habilidadesByKey[key];
    if (!h) return;
    const atual = hab[key] || 0;
    const proposto = atual + delta;
    if (proposto < 0) return;
    // Em edição, não deixa reduzir abaixo do nível original salvo
    const originalNivel = personagemExistente?.habilidades?.[key] || 0;
    if (isEdit && proposto < originalNivel) return;
    const nivelFinal = (h.nivel_inicial ?? 0) + proposto;
    if (nivelFinal > estagio) return;
    // Bloqueia a compra se não houver pontos suficientes para mais um nível
    if (delta > 0 && habRestantes - (h.custo ?? 0) < 0) return;
    const novoObj = { ...hab };
    if (proposto === 0) delete novoObj[key];
    else                novoObj[key] = proposto;
    update('habilidades', novoObj);
  };

  const renderGrupo = ([categoria, lista]) => (
    <div className="wiz-hab-cat" key={categoria}>
      <div className="table-wrap">
      <table className="wiz-hab-table">
        <thead>
          <tr>
            <th>{categoria}</th>
            <th>{lang === 'en' ? 'Adjust' : 'Ajuste'}</th>
            <th>{lang === 'en' ? 'Cost' : 'Custo'}</th>
            <th>{lang === 'en' ? 'Level' : 'Nível'}</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((h) => {
            const comprado = hab[h.key] || 0;
            const isOn = comprado > 0;
            const isOpen = expandida === h.key;
            const nivelBruto = (h.nivel_inicial ?? 0) + comprado;
            const nivelAtual = Math.min(nivelBruto, estagio);
            const podeMaisEstagio = (h.nivel_inicial ?? 0) + comprado + 1 <= estagio;
            const semSaldoPraMais = habRestantes - (h.custo ?? 0) < 0;
            const podeMais = podeMaisEstagio && !semSaldoPraMais;
            const podeMenos = comprado > 0;
            const temDetalhe = !!(h.descricao || h.vantagem || h.desvantagem || h.restricao);
            return (
              <React.Fragment key={h.key}>
                <tr className={isOn ? 'on' : ''}>
                  <td
                    className={"wiz-hab-name" + (temDetalhe ? " wiz-mag-name--clickable" : "")}
                    onClick={temDetalhe ? () => setExpandida(isOpen ? null : h.key) : undefined}>
                    {temDetalhe && <span className="wiz-mag-chevron" style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</span>}
                    {h.nome}
                  </td>
                  <td className="wiz-hab-adj">{ATRIBUTOS_LABEL[h.ajuste]}</td>
                  <td className="wiz-hab-cost">{h.custo}</td>
                  <td>
                    <div className="wiz-hab-stepper">
                      <button
                        type="button"
                        className="wiz-hab-step"
                        onClick={() => mudarNivel(h.key, -1)}
                        disabled={!podeMenos}
                        aria-label={lang === 'en' ? 'Decrease level' : 'Diminuir nível'}>−</button>
                      <span className="wiz-hab-step-val">{comprado}</span>
                      <button
                        type="button"
                        className="wiz-hab-step"
                        onClick={() => mudarNivel(h.key, +1)}
                        disabled={!podeMais}
                        title={!podeMaisEstagio
                          ? (lang === 'en'
                            ? `Cannot exceed stage (level ${estagio})`
                            : `O nível de sua habilidade não pode ser maior que seu estágio (${estagio})`)
                          : semSaldoPraMais
                            ? (lang === 'en' ? 'Not enough points' : 'Pontos insuficientes')
                            : undefined}
                        aria-label={lang === 'en' ? 'Increase level' : 'Aumentar nível'}>+</button>
                    </div>
                  </td>
                </tr>
                {isOpen && temDetalhe && (
                  <tr className="wiz-mag-detail-row">
                    <td colSpan={4}>
                      <div className="wiz-mag-detail">
                        {h.descricao && <p className="wiz-mag-desc">{h.descricao}</p>}
                        {(h.vantagem || h.desvantagem || h.restricao) && (
                          <div className="wiz-mag-niveis">
                            {h.vantagem && (
                              <div className="wiz-mag-nivel">
                                <span className="wiz-mag-nivel-n">{lang === 'en' ? 'Advantage: ' : 'Vantagem: '}</span>
                                <span className="wiz-mag-nivel-t">{h.vantagem}</span>
                              </div>
                            )}
                            {h.desvantagem && (
                              <div className="wiz-mag-nivel">
                                <span className="wiz-mag-nivel-n">{lang === 'en' ? 'Disadvantage: ' : 'Desvantagem: '}</span>
                                <span className="wiz-mag-nivel-t">{h.desvantagem}</span>
                              </div>
                            )}
                            {h.restricao && (
                              <div className="wiz-mag-nivel">
                                <span className="wiz-mag-nivel-n">{lang === 'en' ? 'Restriction: ' : 'Restrição: '}</span>
                                <span className="wiz-mag-nivel-t">{h.restricao}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );

  // Cada tela = 1 grupo (sub = nome do grupo). Mostra só a tabela daquele grupo.
  const grupoAtual = porGrupo.find(([cat]) => cat === sub);
  const ultimoGrupo = GRUPOS_HABILIDADES_ORDEM[GRUPOS_HABILIDADES_ORDEM.length - 1];
  const ehUltimoGrupo = sub === ultimoGrupo;

  return (
    <div className="wiz-habs">
      <div className="wiz-habs-list wiz-habs-list--single">
        {grupoAtual ? renderGrupo(grupoAtual) : (
          <div className="wiz-magias-empty">
            {lang === 'en' ? 'No skills in this group yet.' : 'Nenhuma habilidade neste grupo ainda.'}
          </div>
        )}
      </div>

      {ehUltimoGrupo && (
        <AprimoramentosPanel form={form} update={update} lang={lang} atributosFinais={atributosFinais} habilidadesByKey={habilidadesByKey} bonusHabilidades={bonusHabilidades} />
      )}
    </div>
  );
}

// ---- Painel de Aprimoramentos (idiomas, religiões, artes, sabedorias) ----
// Idiomas iniciais (raça + reino + Malês) são automáticos.
// Aprimoramentos extras destravam conforme o TOTAL da habilidade correspondente:
//   Idioma a cada 10 pts · Religião a cada 5 pts · Arte e Sabedoria a cada 7 pts.
function AprimoramentosPanel({ form, update, lang, atributosFinais, habilidadesByKey, bonusHabilidades }) {
  const hab = form.habilidades || {};
  const aprim = form.aprimoramentos || {};

  // Calcula o total de cada habilidade aprimorável para saber quantos slots o PJ tem
  const slots = {
    idioma:    slotsAprimoramento('idioma',    totalHabilidade('idioma',    hab, atributosFinais, bonusHabilidades, habilidadesByKey)),
    religiao:  slotsAprimoramento('religiao',  totalHabilidade('religiao',  hab, atributosFinais, bonusHabilidades, habilidadesByKey)),
    arte:      slotsAprimoramento('arte',      totalHabilidade('arte',      hab, atributosFinais, bonusHabilidades, habilidadesByKey)),
    sabedoria: slotsAprimoramento('sabedoria', totalHabilidade('sabedoria', hab, atributosFinais, bonusHabilidades, habilidadesByKey)),
  };

  const escolhidos = {
    idioma:    aprim.idioma    || [],
    religiao:  aprim.religiao  || [],
    arte:      aprim.arte      || [],
    sabedoria: aprim.sabedoria || [],
  };

  const setEscolha = (habKey, novaLista) => {
    update('aprimoramentos', { ...aprim, [habKey]: novaLista });
  };

  const toggleEscolha = (habKey, opcao) => {
    const atual = escolhidos[habKey];
    if (atual.includes(opcao)) {
      setEscolha(habKey, atual.filter((x) => x !== opcao));
    } else {
      if (atual.length >= slots[habKey]) return; // sem slot disponível
      setEscolha(habKey, [...atual, opcao]);
    }
  };

  // Idiomas nativos (não contam slot, sempre presentes)
  const nativos = idiomasIniciais(form.raca, form.reino);

  const grupos = [
    { key: 'idioma',    titulo: lang === 'en' ? 'Languages' : 'Idiomas',     divisor: 10 },
    { key: 'religiao',  titulo: lang === 'en' ? 'Religions' : 'Religiões',   divisor: 5 },
    { key: 'arte',      titulo: lang === 'en' ? 'Arts'      : 'Artes',       divisor: 7 },
    { key: 'sabedoria', titulo: lang === 'en' ? 'Wisdoms'   : 'Sabedorias',  divisor: 7 },
  ];

  const gruposVisiveis = grupos.filter((g) => slots[g.key] > 0);
  if (gruposVisiveis.length === 0) return null;

  return (
    <div className="wiz-aprim">

      {gruposVisiveis.map((g) => {
        const opcoes = opcoesAprimoramento(g.key, form.raca, form.reino);
        const livres = slots[g.key] - escolhidos[g.key].length;
        return (
          <div className="wiz-aprim-grupo" key={g.key}>
            <div className="wiz-aprim-grupo-head">
              <span className="wiz-aprim-grupo-titulo">{g.titulo}</span>
              <span className="wiz-aprim-grupo-meta">
                {lang === 'en'
                  ? `${escolhidos[g.key].length}/${slots[g.key]} · 1 per ${g.divisor} points`
                  : `${escolhidos[g.key].length}/${slots[g.key]} · 1 por ${g.divisor} pontos`}
              </span>
            </div>

            {/* Idiomas nativos (só pro grupo idioma): chips informativos, não contam slot */}
            {g.key === 'idioma' && nativos.length > 0 && (
              <div className="wiz-aprim-nativos">
                {nativos.map((n) => (
                  <span className="wiz-aprim-chip nativo" key={n}>{n}</span>
                ))}
              </div>
            )}
              <div className="wiz-aprim-opcoes">
                {opcoes.map((opt) => {
                  const on = escolhidos[g.key].includes(opt);
                  const disabled = !on && livres <= 0;
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={'wiz-aprim-chip' + (on ? ' on' : '') + (disabled ? ' disabled' : '')}
                      onClick={() => toggleEscolha(g.key, opt)}
                      disabled={disabled}
                      title={disabled
                        ? (lang === 'en' ? 'No slots left' : 'Sem slots disponíveis')
                        : undefined}>
                      {opt}
                    </button>
                  );
                })}
              </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Step 4: Magias (Bardo/Mago/Rastreador/Sacerdote) ----
function StepMagias({ form, update, lang, sub, magiasDb, magiasError, magTotalPontos, magGasto, magRestantes, isEdit, personagemExistente }) {
  const [expandida, setExpandida] = useState(null); // key da magia com descrição aberta
  const estagio = calcEstagio(form.experiencia);

  if (magiasDb === null) {
    return <div className="admin-loading"><span>{lang === 'en' ? 'Loading spells…' : 'Consultando os grimórios…'}</span></div>;
  }
  if (magiasError) {
    return (
      <div className="admin-error">
        <div className="err-msg">{magiasError}</div>
        <div className="admin-error-hint">
          {lang === 'en'
            ? "Make sure the 'magias' table exists in Supabase and has data imported."
            : "Confira se a tabela 'magias' existe no Supabase e se você importou os dados."}
        </div>
      </div>
    );
  }

  // Filtra magias disponíveis pro personagem:
  const especializacao = form.especializacao || null;
  const disponiveis = magiasDb.filter((m) =>
    podeAcessarMagia(m, form.profissao, especializacao)
  );

  const compradas = form.magias || {};
  const cfg = MAGIAS_POR_PROFISSAO[form.profissao] || {};

  // Stepper de passos (0..5). Cada passo representa um nível efetivo da magia
  // pela tabela 1→1, 2→3, 3→5, 4→7, 5→9 (`nivelMagiaEfetivo`).
  // O nível efetivo NUNCA pode passar o ESTÁGIO do personagem.
  // Em edição, não permite baixar abaixo do passo original salvo.
  const mudarPasso = (key, delta) => {
    const atual = compradas[key] || 0;
    const proposto = atual + delta;
    if (proposto < 0 || proposto > 5) return;
    const originalPasso = personagemExistente?.magias?.[key] || 0;
    if (isEdit && proposto < originalPasso) return;
    if (proposto > 0 && nivelMagiaEfetivo(proposto) > estagio) return;

    if (delta > 0) {
      const mm = magiasDb.find((x) => x.key === key);
      if (mm && mm.tipo !== 'Básica') return;
    }    

    // Bloqueia a compra se não houver pontos suficientes
    if (delta > 0 && gastoMagias({ ...compradas, [key]: proposto }, magiasDb) > magTotalPontos) return;
    const novoObj = { ...compradas };
    if (proposto === 0) delete novoObj[key];
    else                novoObj[key] = proposto;
    update('magias', novoObj);
  };

  // Cada tela filtra por tipo: 'basica' → Básicas; 'avancada' → demais (Perdida/Ancestral…).
  const disponiveisTela = sub === 'avancada'
    ? disponiveis.filter((m) => m.tipo !== 'Básica')
    : disponiveis.filter((m) => m.tipo === 'Básica');

  const renderTabela = (lista) => (
    <div className="wiz-hab-cat">
      <div className="table-wrap">
      <table className="wiz-hab-table wiz-mag-table">
        <thead>
          <tr>
            <th>{lang === 'en' ? 'Spell' : 'Magia'}</th>
            <th>{lang === 'en' ? 'Cost' : 'Custo'}</th>
            <th>{lang === 'en' ? 'Level' : 'Nível'}</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((m) => {
            const passos = compradas[m.key] || 0;
            const isOn = passos > 0;
            const isOpen = expandida === m.key;
            const originalPasso = personagemExistente?.magias?.[m.key] || 0;
            // "Perdida"/"Ancestral": aparecem no stepper, mas a compra fica travada
            // (só serão liberadas por um item especial, ainda a ser criado).
            const bloqueada = m.tipo !== 'Básica';
            const podeMaisEstagio = passos < 5 && nivelMagiaEfetivo(passos + 1) <= estagio;
            const semSaldoPraMais = passos < 5 && gastoMagias({ ...compradas, [m.key]: passos + 1 }, magiasDb) > magTotalPontos;
            const podeMais = podeMaisEstagio && !semSaldoPraMais && !bloqueada;            
            const podeMenos = passos > 0 && !(isEdit && passos <= originalPasso);
            return (
              <React.Fragment key={m.key}>
                <tr className={`${isOn ? 'on' : ''}${bloqueada ? ' wiz-mag-row--locked' : ''}`} style={bloqueada ? { opacity: 0.6 } : undefined}>
                  <td className="wiz-hab-name wiz-mag-name--clickable" onClick={() => setExpandida(isOpen ? null : m.key)}>
                    <span className="wiz-mag-chevron" style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</span>
                    {m.nome}
                    {bloqueada && (
                      <span className="wiz-mag-locked-tag" style={{ marginLeft: 8, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.75, border: '1px solid currentColor', borderRadius: 4, padding: '1px 6px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                        {m.tipo}
                      </span>
                    )}
                  </td>
                  <td className="wiz-hab-cost">{m.custo}</td>
                  <td>
                    <div className="wiz-hab-stepper">
                      <button
                        type="button"
                        className="wiz-hab-step"
                        onClick={() => mudarPasso(m.key, -1)}
                        disabled={!podeMenos}
                        title={isEdit && passos > 0 && passos <= originalPasso
                          ? (lang === 'en' ? 'Cannot undo an already-purchased spell level' : 'Não é possível desfazer um nível já comprado')
                          : (lang === 'en' ? 'Decrease level' : 'Diminuir nível')}
                        aria-label={lang === 'en' ? 'Decrease level' : 'Diminuir nível'}>−</button>
                      <span className="wiz-hab-step-val">{passos > 0 ? nivelMagiaEfetivo(passos) : 0}</span>
                      <button
                        type="button"
                        className="wiz-hab-step"
                        onClick={() => mudarPasso(m.key, +1)}
                        disabled={!podeMais}
                        title={bloqueada
                          ? (lang === 'en'
                            ? `${m.tipo} spells require a special item (coming soon)`
                            : `Magias ${m.tipo} exigem um item especial (em breve)`)
                          : !podeMaisEstagio && passos < 5
                          ? (lang === 'en'
                            ? `Cannot exceed stage (next level would be ${nivelMagiaEfetivo(passos + 1)}, stage is ${estagio})`
                            : `Não pode passar do estágio (próximo nível seria ${nivelMagiaEfetivo(passos + 1)}, estágio é ${estagio})`)
                          : semSaldoPraMais
                            ? (lang === 'en' ? 'Not enough points' : 'Pontos insuficientes')
                            : (lang === 'en' ? 'Increase level' : 'Aumentar nível')}
                        aria-label={lang === 'en' ? 'Increase level' : 'Aumentar nível'}>+</button>
                    </div>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="wiz-mag-detail-row">
                    <td colSpan={3}>
                      <div className="wiz-mag-detail">
                        <div className="wiz-mag-niveis">
                          {[
                            { lbl: lang === 'en' ? 'Evocation' : 'Evocação', v: m.evocacao },
                            { lbl: lang === 'en' ? 'Range' : 'Alcance', v: m.alcance },
                            { lbl: lang === 'en' ? 'Duration' : 'Duração', v: m.duracao },
                          ].filter((x) => x.v).map((x) => (
                            <div key={x.lbl} className="wiz-mag-nivel">
                              <span className="wiz-mag-nivel-n">{x.lbl}: </span>
                              <span className="wiz-mag-nivel-t">{x.v}</span>
                            </div>
                          ))}
                        </div>
                        <p className="wiz-mag-desc">{m.descricao}</p>
                        <div className="wiz-mag-niveis">
                          {[
                            { n: 1, t: m.nivel_1 },
                            { n: 3, t: m.nivel_3 },
                            { n: 5, t: m.nivel_5 },
                            { n: 7, t: m.nivel_7 },
                            { n: 9, t: m.nivel_9 },
                          ].filter((x) => x.t).map((x) => (
                            <div key={x.n} className="wiz-mag-nivel">
                              <span className="wiz-mag-nivel-n">{x.n}</span>
                              <span className="wiz-mag-nivel-t">{x.t}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );

  return (
    <div className="wiz-habs">
      {disponiveisTela.length === 0 ? (
        <div className="wiz-magias-empty">
          {sub === 'avancada'
            ? (lang === 'en' ? 'No advanced spells available for this profession yet.' : 'Nenhuma magia avançada disponível para essa profissão ainda.')
            : (lang === 'en' ? 'No basic spells available for this profession yet.' : 'Nenhuma magia básica disponível para essa profissão ainda.')}
        </div>
      ) : (
        <div className="wiz-habs-list wiz-habs-list--single">
          {renderTabela(disponiveisTela)}
        </div>
      )}
    </div>
  );
}

// ---- Step 5: Técnicas de Combate (todas as profissões) ----
function StepTecnicas({ form, update, lang, tecnicasDb, tecnicasError, tecTotalPontos, tecGasto, tecRestantes, tecQtd, isEdit, personagemExistente, atributosFinais }) {
  const [expandida, setExpandida] = useState(null);

  if (tecnicasDb === null) {
    return <div className="admin-loading"><span>{lang === 'en' ? 'Loading techniques…' : 'Consultando os manuais de combate…'}</span></div>;
  }
  if (tecnicasError) {
    return (
      <div className="admin-error">
        <div className="err-msg">{tecnicasError}</div>
        <div className="admin-error-hint">
          {lang === 'en'
            ? "Make sure the 'tecnicas' table exists in Supabase and has data imported."
            : "Confira se a tabela 'tecnicas' existe no Supabase e se você importou os dados."}
        </div>
      </div>
    );
  }

  const especializacao = personagemExistente?.especializacao || null;
  const estagio = calcEstagio(form.experiencia);

  // Filtra técnicas: a profissão (ou especialização) precisa estar listada em permissão
  const disponiveis = tecnicasDb.filter((t) =>
    podeAcessarTecnica(t, form.profissao, especializacao)
  );

  const compradas = form.tecnicas || {};

  // Stepper 0/1: comprado ou não. Custo da técnica age como "nível mínimo"
  // — não pode ser comprada se custo > estágio. Em edição, não deixa baixar
  // de comprada para não-comprada (proteção contra perda de progresso).
  const mudarPasso = (key, delta) => {
    const atual = compradas[key] || 0;
    const proposto = atual + delta;
    if (proposto < 0) return;
    if (isEdit && proposto < (personagemExistente?.tecnicas?.[key] || 0)) return;
    if (proposto > estagio) return;
    // Bloqueia a compra se não houver pontos suficientes
    if (delta > 0 && gastoTecnicas({ ...compradas, [key]: proposto }, tecnicasDb) > tecTotalPontos) return;
    const novoObj = { ...compradas };
    if (proposto === 0) delete novoObj[key];
    else                novoObj[key] = proposto;
    update('tecnicas', novoObj);
  };

  // Técnica é 1 tela só — lista em coluna única.

  const renderTabela = (lista) => (
    <div className="wiz-hab-cat">
      <div className="table-wrap">
      <table className="wiz-hab-table wiz-tec-table">
        <thead>
          <tr>
            <th>{lang === 'en' ? 'Technique' : 'Técnica'}</th>
            <th>{lang === 'en' ? 'Cost' : 'Custo'}</th>
            <th>{lang === 'en' ? 'Level' : 'Nível'}</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((t) => {
            const passos = compradas[t.key] || 0;
            const isOn = passos > 0;
            const isOpen = expandida === t.key;
            const originalPasso = personagemExistente?.tecnicas?.[t.key] || 0;
            const acimaDoEstagio = passos >= estagio;
            const semSaldoPraMais = !acimaDoEstagio && gastoTecnicas({ ...compradas, [t.key]: passos + 1 }, tecnicasDb) > tecTotalPontos;
            const podeMais = !acimaDoEstagio && !semSaldoPraMais;
            const podeMenos = passos > 0 && !(isEdit && passos <= originalPasso);
            return (
              <React.Fragment key={t.key}>
                <tr className={isOn ? 'on' : ''}>
                  <td className="wiz-hab-name wiz-mag-name--clickable" onClick={() => setExpandida(isOpen ? null : t.key)}>
                    <span className="wiz-mag-chevron" style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</span>
                    {t.nome}
                  </td>
                  <td className="wiz-hab-cost">{t.custo}</td>
                  <td>
                    <div className="wiz-hab-stepper">
                      <button
                        type="button"
                        className="wiz-hab-step"
                        onClick={() => mudarPasso(t.key, -1)}
                        disabled={!podeMenos}
                        title={isEdit && passos > 0 && passos <= originalPasso
                          ? (lang === 'en' ? 'Cannot undo a purchased technique' : 'Não é possível desfazer uma técnica já comprada')
                          : (lang === 'en' ? 'Decrease' : 'Diminuir')}
                        aria-label={lang === 'en' ? 'Decrease' : 'Diminuir'}>−</button>
                      <span className="wiz-hab-step-val">{passos}</span>
                      <button
                        type="button"
                        className="wiz-hab-step"
                        onClick={() => mudarPasso(t.key, +1)}
                        disabled={!podeMais}
                        title={acimaDoEstagio
                          ? (lang === 'en'
                              ? `Maximum level reached for your stage (${estagio})`
                              : `Nível máximo para seu estágio (${estagio})`)
                          : semSaldoPraMais
                            ? (lang === 'en' ? 'Not enough points' : 'Pontos insuficientes')
                            : (lang === 'en' ? 'Increase' : 'Aumentar')}
                        aria-label={lang === 'en' ? 'Increase' : 'Aumentar'}>+</button>
                    </div>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="wiz-mag-detail-row">
                    <td colSpan={3}>
                      <div className="wiz-mag-detail">
                        {t.descricao && <p className="wiz-mag-desc">{t.descricao}</p>}
                        <div className="wiz-mag-niveis">
                          {[
                            { lbl: lang === 'en' ? 'Use' : 'Uso', v: t.uso },
                            { lbl: lang === 'en' ? 'Weapons' : 'Armas', v: t.grupo_armas },
                            { lbl: lang === 'en' ? 'Armor' : 'Armaduras', v: t.grupo_armaduras },
                          ].filter((x) => x.v).map((x) => (
                            <div key={x.lbl} className="wiz-mag-nivel">
                              <span className="wiz-mag-nivel-n">{x.lbl}: </span>
                              <span className="wiz-mag-nivel-t">{x.v}</span>
                            </div>
                          ))}
                        </div>
                        {t.efeito && (
                          <p className="wiz-tec-efeito">
                            {lang === 'en' ? 'Effect' : 'Efeito'}: {t.efeito}
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );

  return (
    <div className="wiz-habs">
      {disponiveis.length === 0 ? (
        <div className="wiz-magias-empty">
          {lang === 'en'
            ? 'No techniques available for this profession yet.'
            : 'Nenhuma técnica disponível para essa profissão ainda.'}
        </div>
      ) : (
        <div className="wiz-habs-list wiz-habs-list--single">
          {renderTabela(disponiveis)}
        </div>
      )}
    </div>
  );
}

// ---- Step 6 (ou 5 se sem magia): Revisão ----
function StepRevisao({ form, lang, atributosFinais, magiasDb, tecnicasDb, habilidadesByKey, bonusHabilidades }) {
  const ficha = calcularFicha({
    raca: form.raca,
    genero: form.genero,
    profissao: form.profissao,
    experiencia: form.experiencia,
    intelecto_base: form.intelecto_base,
    aura_base: form.aura_base,
    carisma_base: form.carisma_base,
    forca_base: form.forca_base,
    fisico_base: form.fisico_base,
    agilidade_base: form.agilidade_base,
    percepcao_base: form.percepcao_base,
  });

  // Resumo das habilidades compradas
  const hab = form.habilidades || {};
  const habCompradas = Object.entries(hab)
    .filter(([_, n]) => (n || 0) > 0)
    .map(([key, n]) => {
      const h = habilidadesByKey?.[key];
      const nivel = (h?.nivel_inicial || 0) + n;
      const total = totalHabilidade(key, hab, atributosFinais, bonusHabilidades, habilidadesByKey);
      return { key, nome: h?.nome || key, nivel, total };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  // Resumo das magias compradas
  const mag = form.magias || {};
  const magCompradas = Object.entries(mag)
    .filter(([_, p]) => (p || 0) > 0)
    .map(([key, passos]) => {
      const m = (magiasDb || []).find((x) => x.key === key);
      return {
        key,
        nome: m?.nome || key,
        nivel: nivelMagiaEfetivo(passos),
        custo: m?.custo || 0,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  // Resumo das técnicas compradas
  const tec = form.tecnicas || {};
  const tecCompradas = Object.entries(tec)
    .filter(([_, v]) => (v || 0) > 0)
    .map(([key, nivel]) => {
      const t = (tecnicasDb || []).find((x) => x.key === key);
      const total = t ? totalTecnica(t, tec, atributosFinais) : 0;
      return {
        key,
        nome: t?.nome || key,
        total,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  // Resumo dos grupos de armas comprados (catálogo fixo em GRUPOS_ARMAS_BY_SIGLA)
  const grp = form.grupos_armas || {};
  const grpCompradas = Object.entries(grp)
    .filter(([_, n]) => (n || 0) > 0)
    .map(([sigla, nivel]) => {
      const g = GRUPOS_ARMAS_BY_SIGLA[sigla];
      return {
        sigla,
        nome: lang === 'en' ? (g?.nomeEn || g?.nome || sigla) : (g?.nome || sigla),
        nivel,
      };
    })
    .sort((a, b) => a.sigla.localeCompare(b.sigla));

return (
    <div className="wiz-review">
      <div className="wiz-review-head">
        <div className="wiz-review-name">
          {form.nome} {form.sobrenome}
        </div>
        <div className="wiz-review-sub">
          {form.raca} · {form.genero} · {form.profissao} · {form.reino} · Estágio {ficha.estagio}
          {form.deus ? ` · ${lang === 'en' ? 'Devoted to' : 'Devoto de'} ${form.deus}` : ''}
        </div>
      </div>

      <div className="wiz-review-grid">
        <section>
          <div className="wiz-review-eyebrow">{lang === 'en' ? 'Resources' : 'Recursos'}</div>
          <dl>
            <div><dt>{lang === 'en' ? 'Physical Energy' : 'Energia Física'}</dt><dd>{ficha.derivadas.energiaFisica}</dd></div>
            <div><dt>{lang === 'en' ? 'Heroic Energy' : 'Energia Heroica'}</dt><dd>{ficha.derivadas.energiaHeroica}</dd></div>
            <div><dt>{lang === 'en' ? 'Karma' : 'Karma'}</dt><dd>{ficha.derivadas.karma}</dd></div>
            <div><dt>{lang === 'en' ? 'Defense' : 'Defesa'}</dt><dd>{ficha.derivadas.defesa}</dd></div>
            <div><dt>{lang === 'en' ? 'Phys. Resistance' : 'Resistência Física'}</dt><dd>{ficha.derivadas.resistenciaFisica}</dd></div>
            <div><dt>{lang === 'en' ? 'Magic Resistance' : 'Resistência Mágica'}</dt><dd>{ficha.derivadas.resistenciaMagica}</dd></div>
            <div><dt>{lang === 'en' ? 'Speed' : 'Velocidade'}</dt><dd>{ficha.derivadas.velocidade}</dd></div>            
          </dl>
        </section>
        <section>
          <div className="wiz-review-eyebrow">{lang === 'en' ? 'Attributes' : 'Atributos'}</div>
          <dl>
            {ATRIBUTOS_KEYS.map((k) => (
              <div key={k}><dt>{ATRIBUTOS_LABEL[k]}</dt><dd>{ficha.atributos[k]}</dd></div>
            ))}
          </dl>
        </section>
      {grpCompradas.length > 0 && (
        <section>
          <div className="wiz-review-eyebrow">
            {lang === 'en' ? 'Weapon Groups' : 'Grupo de Armas'}
          </div>
          <dl>
            {grpCompradas.map((g) => (
              <div key={g.sigla}>
                <dt>{g.nome}</dt>
                <dd>{g.nivel}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}        
        {profissaoUsaMagia(form.profissao) && (
          <section>
            <div className="wiz-review-eyebrow">
              {lang === 'en' ? 'Spells' : 'Magias'}
            </div>
            {magCompradas.length === 0 ? (
              <p className="wiz-review-empty">
                {lang === 'en' ? 'No spells acquired.' : 'Nenhuma magia adquirida.'}
              </p>
            ) : (
              <dl>
                {magCompradas.map((m) => (
                  <div key={m.key}>
                    <dt>{m.nome}</dt>
                    <dd>{m.nivel}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        )}

        <section>
          <div className="wiz-review-eyebrow">
            {lang === 'en' ? 'Combat Techniques' : 'Técnicas de Combate'}
          </div>
          {tecCompradas.length === 0 ? (
            <p className="wiz-review-empty">
              {lang === 'en' ? 'No combat techniques acquired.' : 'Nenhuma técnica de combate adquirida.'}
            </p>
          ) : (
            <dl>
              {tecCompradas.map((t) => (
                <div key={t.key}>
                  <dt>{t.nome}</dt>
                  <dd>{t.total >= 0 ? `${t.total}` : t.total}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <section>
          <div className="wiz-review-eyebrow">
            {lang === 'en' ? 'Skills' : 'Habilidades'}
          </div>
          {habCompradas.length === 0 ? (
            <p className="wiz-review-empty">
              {lang === 'en' ? 'No skills acquired.' : 'Nenhuma habilidade adquirida.'}
            </p>
          ) : (
            <dl>
              {habCompradas.map((h) => (
                <div key={h.key}>
                  <dt>{h.nome} {h.nivel}</dt>
                  <dd>{h.total}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      </div>
    </div>
  );
}


Object.assign(window, {
  PersonagensList, PersonagemCard, ConfirmarExclusaoModal,
  DarExperienciaModal, DarMoedasModal,
  NovoPersonagemModal,
  StepIdentidade, StepAtributos, StepGruposArmas, StepHabilidades, AprimoramentosPanel,
  StepMagias, StepTecnicas, StepRevisao,
});
