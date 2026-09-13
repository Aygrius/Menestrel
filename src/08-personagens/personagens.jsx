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
   - AprimoramentoInline    — vagas de idioma/religião/arte/sabedoria, dentro da habilidade-mãe
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



/* ============================== FichaComBatalha — wrapper do jogador ==============================
   Envolve FichaPersonagem adicionando:
   1. Detecção de batalha ativa em que o PJ participa
   2. Botão "Batalha" vermelho antes das abas da ficha (injetado via posicionamento fixo)
   3. View de batalha do jogador com restrições (só age na vez do seu PJ)
   4. Mensagem "vez de X" quando não é a vez do PJ
*/
function FichaComBatalha({ ac, lang, currentUserId, pjAtivoId, onVoltar, onEditar, onExcluir }) {
  const isEn = lang === 'en';
  const [batalhaAtiva, setBatalhaAtiva] = useState(null);   // { id, estado, participantes, historia_id, ... }
  const [viewBatalha, setViewBatalha] = useState(false);    // true = mostra tela de batalha
  const [carregando, setCarregando] = useState(true);

  // Busca batalha ativa onde o PJ participa
  useEffect(() => {
    if (!pjAtivoId) return;
    let cancel = false;
    (async () => {
      setCarregando(true);
      const { data } = await supabaseClient
        .from('batalhas')
        .select('*')
        .eq('estado', 'ativa')
        .order('created_at', { ascending: false });
      if (cancel) return;
      const batalhaDoJogador = (data || []).find((b) =>
        (b.participantes || []).some((p) => p.tipo === 'pj' && p.ref_id === pjAtivoId)
      );
      setBatalhaAtiva(batalhaDoJogador || null);
      setCarregando(false);
    })();

    // Realtime: atualiza quando a batalha muda
    const channel = supabaseClient
      .channel('batalha_jogador_' + pjAtivoId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batalhas' }, async (payload) => {
        // Filtra ANTES de consultar. Sem isto, QUALQUER ação em QUALQUER
        // batalha do sistema disparava um refetch em TODO jogador logado —
        // um combate movimentado de outra mesa custava uma query por jogador
        // por golpe. A linha do evento já traz `participantes`, então dá pra
        // decidir sem ir ao banco.
        //
        // Quando a lista não vem (DELETE com REPLICA IDENTITY só da PK, por
        // exemplo) o refetch acontece: não dá pra concluir que é irrelevante,
        // e sumir com a batalha da tela importa mais que a query extra.
        const linha = (payload && (payload.new || payload.old)) || null;
        const lista = linha && linha.participantes;
        if (Array.isArray(lista)
            && !lista.some((p) => p.tipo === 'pj' && p.ref_id === pjAtivoId)) return;
        const { data } = await supabaseClient
          .from('batalhas')
          .select('*')
          .eq('estado', 'ativa')
          .order('created_at', { ascending: false });
        if (cancel) return;
        const b = (data || []).find((b2) =>
          (b2.participantes || []).some((p) => p.tipo === 'pj' && p.ref_id === pjAtivoId)
        );
        setBatalhaAtiva(b || null);
        // Se a batalha encerrou, volta para a ficha
        if (!b && viewBatalha) setViewBatalha(false);
      })
      .subscribe();

    return () => { cancel = true; supabaseClient.removeChannel(channel); };
  }, [pjAtivoId]);

  // View de batalha do jogador — delega pro motor da fase 12 (batalha.jsx),
  // onde o AcaoPanel e os helpers de combate vivem. Aqui só detectamos a
  // batalha ativa e repassamos o snapshot fresquinho (vindo do realtime).
  if (viewBatalha && batalhaAtiva) {
    return (
      <BatalhaJogadorView
        batalha={batalhaAtiva}
        pjAtivoId={pjAtivoId}
        lang={lang}
        onVoltar={() => setViewBatalha(false)}
      />
    );
  }

  // Botão "Batalha" — só quando há batalha ativa do PJ. Renderizado
  // nativamente na barra de abas da ficha via prop `navSlot`. Sem portal:
  // o alvo `.fp-tabs` não existe mais (hoje é `.diario-subtabs`), e injetar
  // por querySelector é frágil. Sem hooks aqui embaixo → não quebra a ordem
  // de hooks quando `viewBatalha` dispara o return antecipado lá em cima.
  const btnBatalha = (!carregando && batalhaAtiva) ? (
    <button
      type="button"
      onClick={() => setViewBatalha(true)}
      style={{
        background: 'linear-gradient(135deg,#B8472F 0%,#8B1A10 100%)',
        color: '#F8E8DC', fontFamily: "'Lora',serif", fontWeight: 600,
        fontSize: 13, border: 'none', borderRadius: 999,
        padding: '0 16px', height: 32, cursor: 'pointer',
        boxShadow: '0 4px 16px -6px rgba(184,70,47,0.7)',
        display: 'inline-flex', alignItems: 'center', gap: 4,
        animation: 'batalha-pulse 2s ease-in-out infinite',
        flexShrink: 0, whiteSpace: 'nowrap',
      }}>
      <i className="ti ti-swords" aria-hidden="true" style={{ fontSize: 13 }} />
      {isEn ? 'Battle' : 'Batalha'}
    </button>
  ) : null;

  return (
    <FichaPersonagem
      ac={ac}
      lang={lang}
      currentUserId={currentUserId}
      pjAtivoId={pjAtivoId}
      onVoltar={onVoltar}

      onEditar={onEditar}
      onExcluir={onExcluir}
      navSlot={btnBatalha}
    />
  );
}



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
function PersonagensList({ ac, t, lang, profile = 'player', currentUserId, userProfile = null, mesaAtivaId = null, abrirNovoPersonagemRef, onDentroDeMenu, onLimiteFreeChange, onFichaAberta, onNomePjAtivo }) {
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
  // Mestre: mesaAtivaId (seletor do canto, vindo do shell) filtra a lista pra
  // mostrar só os personagens vinculados àquela história — sem isso, o Mestre
  // via PJs de TODAS as histórias misturados (bug reportado pelo usuário).
  // Sem mesaAtivaId (ex.: 0 ou 1 história só) mostra tudo, como antes.
  const personagens = pjLoading ? null : (
    !isMaster || !mesaAtivaId
      ? (pjData?.personagens ?? [])
      : (pjData?.personagens ?? []).filter(
          (p) => (pjData?.historiaIdPorPersonagem?.[p.id]) === mesaAtivaId
        )
  );
  const profilesMap = pjData?.profilesMap ?? {};
  const error = pjError ? pjError.message : null;
  // idsComMesa volta como array do cache; reconstrói o Set que o .has() espera.
  const idsComMesa = useMemo(
    () => new Set(pjData?.idsComMesa ?? []),
    [pjData]
  );

  // História pausada → só alimenta a tag "Pausada" no card (puramente
  // informativa pro Mestre; ele mantém acesso total mesmo com a história
  // pausada). O bloqueio de verdade é do lado do Jogador, dentro da ficha
  // (11-ficha/ficha.jsx bloqueia o ACESSO inteiro quando isMestre é falso).
  // Reaproveita o mesmo hook-ponte que 06-historias/historias.jsx usa pra
  // ler historias (não precisa de mudança em bridge.ts: a query de lá já
  // traz a linha inteira, então h.pausada aparece assim que a coluna
  // existir no banco). RLS por mestre_id filtra sozinho pro Jogador (SELECT
  // em historias volta [] sem erro), então é seguro chamar o hook
  // incondicionalmente aqui.
  const { data: histData } = window.useHistoriasData(currentUserId);
  const historiaIdsPausadas = useMemo(
    () => new Set((histData?.historias ?? []).filter((h) => h.pausada).map((h) => h.id)),
    [histData]
  );

  // "Novo personagem" só existe pro Jogador (Mestre não cria PJ pra si) e só
  // na view de lista — quando o Jogador já tem um PJ ativo, a tela mostra a
  // ficha em vez da lista, e criar um personagem novo não faz sentido nesse
  // contexto (mesmo padrão usado em "Nova história": o botão do pill do topo
  // só existe junto da tela que ele afeta).
  const limiteFree = !isMaster && userProfile?.plano === 'free' && (personagens?.length ?? 0) >= PLANO_FREE_LIMITES.personagens;
  const dentroDeMenu = isMaster ? (fichaAbertoId != null) : (pjAtivoIdLocal != null);
  useEffect(() => {
    if (onDentroDeMenu) onDentroDeMenu(dentroDeMenu);
  }, [dentroDeMenu, onDentroDeMenu]);
  useEffect(() => {
    if (onLimiteFreeChange) onLimiteFreeChange(limiteFree);
  }, [limiteFree, onLimiteFreeChange]);
  // Informa o AdminConsole quando a FichaPersonagem do Jogador está visível —
  // só então o RolagemLivreFab aparece. Mestre abrindo ficha alheia NÃO conta
  // (dado livre é vinculado ao PJ ativo do Jogador, não à conta/sessão).
  const fichaJogadorVisivel = !isMaster && pjAtivoIdLocal != null;
  useEffect(() => {
    if (onFichaAberta) onFichaAberta(fichaJogadorVisivel);
    return () => { if (onFichaAberta) onFichaAberta(false); };
  }, [fichaJogadorVisivel, onFichaAberta]);
  // Informa o nome do PJ ativo pro AdminConsole (usado na notificação de rolamento livre).
  // Resolvido a partir de personagens já carregados — sem fetch extra.
  useEffect(() => {
    if (!onNomePjAtivo) return;
    if (!fichaJogadorVisivel || !personagens) { onNomePjAtivo(null); return; }
    const pj = personagens.find((p) => p.id === pjAtivoIdLocal);
    onNomePjAtivo(pj ? pj.nome : null);
    return () => { onNomePjAtivo(null); };
  }, [fichaJogadorVisivel, pjAtivoIdLocal, personagens, onNomePjAtivo]);

  // Expõe abrir() via ref pro botão "Novo personagem" do pill do topo
  // (shell.jsx) acionar de fora — mesmo padrão de abrirNovaHistoriaRef em
  // historias.jsx. Respeita o limite do plano free aqui dentro.
  useEffect(() => {
    if (abrirNovoPersonagemRef) {
      abrirNovoPersonagemRef.current = () => { if (!isMaster && !limiteFree) setModalOpen(true); };
    }
  }, [abrirNovoPersonagemRef, isMaster, limiteFree]);

  const persistirPjAtivo = async (novoId) => {
    if (isMaster || !currentUserId) return;
    const { error } = await supabaseClient
      .from('profiles')
      .update({ pj_ativo_id: novoId })
      .eq('id', currentUserId);
    if (error) console.error('[ficha] pj_ativo_id update failed:', error);
  };
  /* SELEÇÃO EXCLUSIVA — decisão do usuário, 12/09/2026.

     "Depois que um jogador selecionar o personagem, todos os demais menus
     serão seu ponto de vista [...]. Portanto, para selecionar outro
     personagem, será necessário desativar o personagem ativo."

     É consequência direta do ponto de vista: se magias, técnicas e criaturas
     passam a ser as que AQUELE personagem conhece (ver useConhecidoDoJogador),
     então trocar de personagem com um clique trocaria o mundo inteiro por
     baixo do jogador sem ele perceber. Desativar primeiro torna a troca um
     gesto consciente.

     `pjAtivoNoPerfil` é a verdade — o que o banco guarda e o que as outras
     telas leem. `pjAtivoIdLocal` continua sendo só navegação (qual ficha está
     aberta nesta tela). */
  const [pjAtivoNoPerfil, setPjAtivoNoPerfil] = useState(
    !isMaster ? (userProfile?.pj_ativo_id || null) : null
  );

  const ativarPj = async (pjId) => {
    // Com alguém ativo, ativar outro não faz nada: desative primeiro.
    if (pjAtivoNoPerfil && pjAtivoNoPerfil !== pjId) return;
    setPjAtivoNoPerfil(pjId);
    setPjAtivoIdLocal(pjId);
    await persistirPjAtivo(pjId);
  };

  /* Desativar: some o ponto de vista, e o jogador volta a poder escolher. As
     listas ficam vazias até ele escolher de novo — de propósito, porque o
     recorte da união de vários personagens não é de ninguém. */
  const desativarPj = async () => {
    setPjAtivoNoPerfil(null);
    setPjAtivoIdLocal(null);
    await persistirPjAtivo(null);
  };
  const voltarParaLista = () => {
    // só navegação local — não mexe no banco. pj_ativo_id segue salvo.
    setPjAtivoIdLocal(null);
  };
  /* `trocarPjAtivo` SAIU em 12/09/2026. Trocava o PJ ativo direto, sem
     desativar — exatamente o que a regra nova proíbe. Estava morto (a ficha
     recebia o prop `onTrocar` e nunca o chamava), mas arma carregada na
     gaveta dispara sozinha um dia: a próxima pessoa a precisar de um
     "trocar" acharia esta função pronta e a usaria.

     Quem troca de personagem passa por desativarPj. */

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

  // Havia aqui um confirmarExclusaoAtivo — exclusão a partir da própria ficha
  // do PJ ativo, que limpava o pj_ativo_id no banco depois de apagar. Saiu com
  // o botão Excluir da ficha do jogador (08/09/2026): Excluir virou exclusivo
  // do Mestre, que exclui pela lista/ficha dele por confirmarExclusao, e
  // ninguém mais chamava esta versão.

  if (personagens === null) {
    return <Carregando lang={lang} />;
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
          key={fichaAbertoId}
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
  //
  // Sem onEditar nem onExcluir: Editar e Excluir na ficha são só do Mestre
  // (o ramo isMaster acima passa os dois). Os botões só renderizam quando a
  // prop existe (11-ficha/ficha.jsx), então omitir já os esconde. O jogador
  // evolui pela seta do card, que abre o mesmo wizard — ver .pj-evoluiu em
  // PersonagemCard.
  //
  // Por isso aqui não há mais os modais de edição e de exclusão: nada neste
  // ramo consegue definir toEdit/toDelete, e a lista (onde a seta vive) só
  // aparece quando NÃO há PJ ativo, ou seja, os dois estados são exclusivos.
  if (!isMaster && pjAtivoIdLocal != null) {
    return (
      <FichaComBatalha
        key={pjAtivoIdLocal}
        ac={ac}
        lang={lang}
        currentUserId={currentUserId}
        pjAtivoId={pjAtivoIdLocal}
        onVoltar={voltarParaLista}

      />
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
            pausado={isMaster && historiaIdsPausadas.has(pjData?.historiaIdPorPersonagem?.[p.id])}
            onEntrarMesa={!isMaster ? () => setConvidarPj({ id: p.id, nome: p.nome, sobrenome: p.sobrenome }) : undefined}
            onEdit={() => setToEdit(p)}
            onDelete={() => setToDelete(p)}
            onGiveXp={() => setToGiveXp(p)}
            onGiveMoedas={() => setToGiveMoedas(p)}
            /* Ativo/inativo, o termo que o usuário pediu. O card do ativo
               mostra "Desativar"; os outros ficam bloqueados enquanto houver
               um ativo — e dizem por quê. */
            ativo={!isMaster && pjAtivoNoPerfil === p.id}
            bloqueadoPorOutroAtivo={!isMaster && !!pjAtivoNoPerfil && pjAtivoNoPerfil !== p.id}
            onAtivar={!isMaster ? () => ativarPj(p.id) : undefined}
            onDesativar={!isMaster && pjAtivoNoPerfil === p.id ? desativarPj : undefined}
            /* Voltar à ficha do ativo sem passar pela barra lateral: quem veio
               para a lista pelo "voltar" da ficha não tinha caminho de volta
               a partir do próprio card (o clique no ativo não faz nada). */
            onAbrir={!isMaster && pjAtivoNoPerfil === p.id ? () => setPjAtivoIdLocal(p.id) : undefined}
            ultimoCapitulo={!isMaster ? pjData?.ultimoCapituloPorPersonagem?.[p.id] : undefined}
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
          t={t}
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
    </div>
  );
}

function PersonagemCard({ p, isMaster, isOwn, onEdit, onDelete, onGiveXp, onGiveMoedas, onAtivar, onDesativar, onAbrir, ultimoCapitulo, ativo, bloqueadoPorOutroAtivo, onAbrirFicha, onEntrarMesa, semMesa, pausado, lang, playerName }) {
  const ficha = calcularFicha(p);
  const titulo = tituloDoPersonagem(p);
  const levelUp = temLevelUpPendente(p);
  const fotoUrl = p.foto_url || p.foto || p.avatar_url || null;
  const inicial = (p.nome || '?').trim().charAt(0).toUpperCase();
  const en = lang === 'en';
  const [tip, abrirTip, fecharTip, manterTip] = useTooltip(60);

  // Degradê contínuo de cor baseado no ratio EF atual / EF máxima.
  // Sem estado_atual → considera cheio (ratio 1).
  const maxEF = Number(ficha.derivadas?.energiaFisica) || 0;
  const efAtual = p.estado_atual?.vitalidade?.ef != null
    ? Number(p.estado_atual.vitalidade.ef)
    : maxEF;
  const efRatio = maxEF > 0 ? Math.max(0, Math.min(1, efAtual / maxEF)) : 1;
  const maxEH = Number(ficha.derivadas?.energiaHeroica) || 0;
  const ehAtual = p.estado_atual?.vitalidade?.eh != null
    ? Number(p.estado_atual.vitalidade.eh)
    : maxEH;

  // Três âncoras de cor:
  //   0%   → púrpura  rgb(107, 20,128)
  //   50%  → carmesim rgb(139, 26, 26)
  //   100% → dourado  rgb(201,164, 78)  (#C9A44E — ouro Pedra & Bronze)
  const lerp = (a, b, t) => Math.round(a + (b - a) * t);
  const lerpRGB = (r1,g1,b1, r2,g2,b2, t) => [lerp(r1,r2,t), lerp(g1,g2,t), lerp(b1,b2,t)];
  const [hr, hg, hb] = efRatio < 0.5
    ? lerpRGB(107,20,128, 139,26,26,  efRatio / 0.5)
    : lerpRGB(139,26,26,  201,164,78, (efRatio - 0.5) / 0.5);

  const healthStyle = {
    '--pj-health-r': hr,
    '--pj-health-g': hg,
    '--pj-health-b': hb,
    /* O ativo fica sem a cor de saúde na borda: inline ganha do CSS, e a
       borda dele é a dourada de .pj-card--ativo. A saúde do ativo aparece
       na barra de EF. */
    ...(ativo ? null : {
      borderColor: `rgba(${hr},${hg},${hb},0.55)`,
      boxShadow:   `0 0 24px rgba(${hr},${hg},${hb},0.20)`,
    }),
    transition:  'border-color .4s ease, box-shadow .4s ease',
  };
  const pulsoClass = efRatio < 0.25 ? ' pj-card--ef-critico' : '';

  /* A seta de evoluir só aparece no personagem ATIVO (ou, para o Mestre, em
     qualquer um — ele não tem PJ ativo). O invólucro precisa saber disso
     para marcar o card (.pj-card-wrap--seta). */
  const mostrarSetaEvoluir = !!(levelUp && onEdit && (isMaster || ativo));

  const podeSelecionar = !!(onAtivar && !bloqueadoPorOutroAtivo && !ativo);
  const nomeCompleto = [p.nome, p.sobrenome].filter(Boolean).join(' ');

  /* Vitais do ativo (12/09/2026). O card ativo ocupa a linha inteira e, só
     com nome e uma linha de meta, era uma faixa larga e vazia. Energia física
     e heroica é o que o jogador quer saber de relance sobre quem está em jogo.
     A barra de EF usa a mesma cor de saúde que já tinge a borda do card. */
  const vitais = [
    { k: 'ef', rotulo: en ? 'Physical energy' : 'Energia física', atual: efAtual, max: maxEF, cor: `rgb(${hr},${hg},${hb})` },
    { k: 'eh', rotulo: en ? 'Heroic energy' : 'Energia heroica', atual: ehAtual, max: maxEH },
  ].filter((v) => v.max > 0);

  /* Último capítulo (pedido do usuário, 12/09/2026): "no card de personagem
     principal, adicione o último capítulo da história". Só no ativo — é ele
     que está vivendo a história; nos outros seria texto demais numa grade. */
  const cap = ativo ? ultimoCapitulo : null;
  const capData = cap?.data && typeof formatarDataFantasy === 'function' && cap.data.dia && cap.data.mes
    ? formatarDataFantasy(cap.data, lang) : null;

  return (
    <div className={'pj-card-wrap' + (ativo ? ' pj-card-wrap--ativo' : '') + (bloqueadoPorOutroAtivo ? ' pj-card-wrap--inerte' : '') + (mostrarSetaEvoluir ? ' pj-card-wrap--seta' : '')}>
    <article
      className={'pj-card' + pulsoClass + (levelUp ? ' pj-card--levelup' : '') + (ativo ? ' pj-card--ativo' : '') + (bloqueadoPorOutroAtivo ? ' pj-card--inerte' : '') + (podeSelecionar ? ' is-clickable' : '')}
      style={healthStyle}
      onClick={podeSelecionar ? onAtivar : undefined}
      /* O bloqueado continua SEM frase no card — o usuário mandou tirar. O
         motivo aparece só para quem pousa o mouse nele, que é quem perguntou. */
      onMouseEnter={bloqueadoPorOutroAtivo
        ? (e) => abrirTip(e, en ? 'Deactivate your active character to choose this one' : 'Desative o personagem ativo para escolher este')
        : undefined}
      onMouseLeave={bloqueadoPorOutroAtivo ? fecharTip : undefined}
    >
      {bloqueadoPorOutroAtivo && (
        <span className="pj-card-cadeado" aria-hidden="true"><i className="ti ti-lock" /></span>
      )}

      <div className="pj-card-body">
        <div className={'pj-card-portrait' + (!fotoUrl ? ' is-empty' : '')}>
          {fotoUrl
            ? <img src={fotoUrl} alt={nomeCompleto} className="pj-card-portrait-img" />
            : <span className="pj-card-portrait-mono">{inicial}</span>}
        </div>
        <div className="pj-card-info">
          <header className="pj-card-head">
            <div className="pj-card-actions">
              {isMaster && (
                <button
                  className="btn-icon btn-sm pj-card-action pj-card-action-moedas"
                  onClick={(e) => { e.stopPropagation(); onGiveMoedas(); }}
                  aria-label={en ? 'Coins' : 'Moedas'}
                  onMouseEnter={(e) => { e.stopPropagation(); abrirTip(e, en ? 'Coins' : 'Moedas'); }}
                  onMouseLeave={fecharTip}>
                  <i className="ti ti-coins" aria-hidden="true" />
                </button>
              )}
              {isMaster && (
                <button
                  className="btn-icon btn-sm pj-card-action pj-card-action-xp"
                  onClick={(e) => { e.stopPropagation(); onGiveXp(); }}
                  aria-label={en ? 'Experience' : 'Experiência'}
                  onMouseEnter={(e) => { e.stopPropagation(); abrirTip(e, en ? 'Experience' : 'Experiência'); }}
                  onMouseLeave={fecharTip}>
                  <i className="ti ti-star" aria-hidden="true" />
                </button>
              )}
              {isMaster && onAbrirFicha && (
                <button
                  className="btn-icon btn-sm pj-card-action pj-card-action-ficha"
                  onClick={(e) => { e.stopPropagation(); onAbrirFicha(); }}
                  aria-label={en ? 'Sheet' : 'Ficha'}
                  onMouseEnter={(e) => { e.stopPropagation(); abrirTip(e, en ? 'Sheet' : 'Ficha'); }}
                  onMouseLeave={fecharTip}>
                  <i className="ti ti-file-description" aria-hidden="true" />
                </button>
              )}
              {/* Editar (lápis) e Excluir (lixeira) removidos do card — edição via ficha do PJ ativo */}
              <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
            </div>
            {/* Selo ATIVO — elemento de verdade, e não um ::after (ver a
                nota de 12/09/2026 no CSS). Saiu do canto do card e virou o
                sobrescrito do nome: no canto era uma pílula de 10px disputando
                lugar com a seta de evoluir, e o olho lia o nome sem ver o selo.
                Acima do nome, o selo é a primeira coisa lida no card. */}
            {ativo && (
              <span className="pj-card-selo">
                <span className="pj-card-selo-chama" aria-hidden="true" />
                {en ? 'Active character' : 'Personagem ativo'}
              </span>
            )}
            <div className="pj-name">{nomeCompleto}</div>
          </header>
          {/* Estágio, raça/profissão e título — 12/09/2026.

              `titulo` já era calculado aqui e não ia para lugar nenhum: o
              card mostrava só o nome do jogador, que é a mesma palavra em
              todos os cards de um mesmo dono. Isto é o que distingue um
              personagem do outro. */}
          <div className="pj-meta">
            <span>{en ? `Stage ${ficha.estagio}` : `Estágio ${ficha.estagio}`}</span>
            {(p.raca || p.profissao) && <span className="sep">·</span>}
            {(p.raca || p.profissao) && <span>{[p.raca, p.profissao].filter(Boolean).join(' ')}</span>}
            {titulo && <span className="sep">·</span>}
            {titulo && <span>{titulo}</span>}
            {/* O dono só interessa ao Mestre. Na lista do jogador todos os
                cards traziam o nome DELE, repetido card a card. */}
            {isMaster && <span className="sep">·</span>}
            {isMaster && <span>{playerName}</span>}
            {pausado && <span className="pj-card-pausada">{en ? 'Paused' : 'Pausada'}</span>}
          </div>

          {ativo && vitais.length > 0 && (
            <div className="pj-vitais">
              {vitais.map((v) => (
                <div key={v.k} className={'pj-vital pj-vital--' + v.k}>
                  <div className="pj-vital-top">
                    <span className="pj-vital-rot">{v.rotulo}</span>
                    <span className="pj-vital-num">{v.atual}<span className="pj-vital-max">/{v.max}</span></span>
                  </div>
                  <div className="pj-vital-barra">
                    <span
                      className="pj-vital-fill"
                      style={{
                        width: `${Math.max(0, Math.min(100, (v.atual / v.max) * 100))}%`,
                        ...(v.cor ? { background: v.cor } : null),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ações do ATIVO — refeitas em 12/09/2026.

            Antes: um "Desativar" fantasma, sozinho, centralizado no rodapé
            de um card da largura da tela — a única ação do personagem em jogo
            parecia um rodapé esquecido. Agora as duas ações moram ao lado do
            nome, empilhadas: "Abrir ficha" é a principal (é o que se faz com
            o personagem ativo), "Desativar" fica abaixo, mais discreto, e só
            ganha cor de alerta no hover — trocar de personagem troca o mundo
            inteiro do jogador, não é o clique que se quer dar por engano. */}
        {ativo && (onAbrir || onDesativar) && (
          <div className="pj-card-acoes-ativo">
            {onAbrir && (
              <button
                type="button"
                className="btn-primary btn-sm pj-card-abrir"
                onClick={(e) => { e.stopPropagation(); onAbrir(); }}>
                <i className="ti ti-book-2" aria-hidden="true" />
                {en ? 'Open sheet' : 'Abrir ficha'}
              </button>
            )}
            {onDesativar && (
              <button
                type="button"
                className="btn-ghost btn-sm pj-card-desativar"
                onClick={(e) => { e.stopPropagation(); onDesativar(); }}>
                <i className="ti ti-player-stop" aria-hidden="true" />
                {en ? 'Deactivate' : 'Desativar'}
              </button>
            )}
          </div>
        )}
      </div>

      {cap && (
        <section className="pj-capitulo" aria-label={en ? 'Latest chapter' : 'Último capítulo'}>
          <div className="pj-capitulo-eyebrow">
            <i className="ti ti-feather" aria-hidden="true" />
            <span>{en ? 'Latest chapter' : 'Último capítulo'}</span>
            <span className="sep">·</span>
            <span className="pj-capitulo-historia">{cap.historia}</span>
          </div>
          <h4 className="pj-capitulo-titulo">
            <span className="pj-capitulo-num">{en ? `Ch. ${cap.numero}` : `Cap. ${cap.numero}`}</span>
            {cap.titulo || (en ? 'Untitled' : 'Sem título')}
          </h4>
          {capData && <div className="pj-capitulo-data">{capData}</div>}
          {cap.texto && <p className="pj-capitulo-texto">{cap.texto}</p>}
        </section>
      )}

      {/* Selecionar personagem (pedido do usuário, 11/09/2026). O clique no
          card continua funcionando; o botão torna a ação nomeada.

          Pílula centralizada no rodapé, ou nada — o bloqueado simplesmente
          não oferece ação, porque não há ação. Em repouso a pílula é
          discreta: três botões dourados lado a lado numa grade gritavam
          todos ao mesmo tempo. Ela acende quando o mouse chega no card (ver
          .pj-card.is-clickable:hover no CSS), que é quando a escolha
          acontece. */}
      {podeSelecionar && (
        <div className="pj-card-foot">
          <button
            type="button"
            className="btn-ghost btn-sm pj-card-selecionar"
            onClick={(e) => { e.stopPropagation(); onAtivar(); }}>
            <i className="ti ti-user-check" aria-hidden="true" />
            {en ? 'Select character' : 'Selecionar personagem'}
          </button>
        </div>
      )}
    </article>

      {/* Seta de evolução — é o caminho do JOGADOR pra gastar os pontos do
          estágio novo. O lápis de edição livre saiu da ficha dele e ficou só
          com o Mestre, então esta seta é o acesso ao wizard: aparece apenas
          quando há pontos a distribuir (temLevelUpPendente) e some sozinha
          quando eles são gastos. stopPropagation porque o card inteiro é
          clicável pra ativar o PJ. */}
      {/* Só no personagem ATIVO (12/09/2026). A seta aparecia em qualquer card
          com pontos a distribuir — inclusive em quem o jogador não escolheu —
          e pedia que ele evoluísse um personagem que não está em jogo. Com o
          ponto de vista único, evoluir é coisa do ativo; os outros esperam a
          vez, e quem quiser mexer neles desativa este primeiro.

          O Mestre é exceção: para ele não existe PJ ativo (ele administra
          todos), então a seta segue como era. */}
      {mostrarSetaEvoluir && (
        <button
          type="button"
          className="pj-evoluiu"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          aria-label={en ? 'Click here to level up your character!' : 'Clique aqui para evoluir seu personagem!'}
          onMouseEnter={(e) => { e.stopPropagation(); abrirTip(e, en ? 'Click here to level up your character!' : 'Clique aqui para evoluir seu personagem!'); }}
          onMouseLeave={fecharTip}
        >
          <i className="ti ti-arrow-big-up-lines" aria-hidden="true" />
        </button>
      )}

    </div>
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

// ---------- DeltaStepper — variante EDITÁVEL do padrão pill (nosso seletor de valores) ----------
// Mesma pele "pill" do QuantityStepper e do stepper de condição do
// BarEditPopover (ambos cópias locais de 12-batalha/batalha.jsx, o segundo
// em 11-ficha/ficha.jsx): fundo escuro translúcido com blur, borda dourada
// fraca, botões circulares dourados. Diferença: aqui o valor no meio é um
// <input> de verdade, não <span> — conceder XP/moedas precisa aceitar
// qualquer número digitado, não só clique em -1/+1/preset. Delta pode ser
// negativo (Mestre também subtrai). `presets`, se passado, desenha uma
// fileira de chips "+N" abaixo (SOMA ao valor atual, não substitui, diferente
// dos presets de condição que saltam pro valor exato) + botão de zerar via
// `onReset`. Usado hoje em DarExperienciaModal (com presets) e, uma
// instância por linha, em DarMoedasModal (sem presets).
function DeltaStepper({ value, onChange, presets, onReset, inputClassName }) {
  const d = parseInt(value, 10) || 0;
  const dec = () => onChange(d - 1);
  const inc = () => onChange(d + 1);
  const bump = (n) => onChange(d + n);

  const pillStyle = {
    background: 'rgba(24,17,8,0.92)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(106,85,48,0.50)', borderRadius: 999, height: 32,
    display: 'flex', alignItems: 'center', gap: 4, padding: '0 4px', width: '100%',
  };
  const btnStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, flexShrink: 0, borderRadius: '50%', border: 'none',
    background: 'transparent', color: '#C9A44E', cursor: 'pointer', transition: 'background .15s, color .15s',
  };

  return (
    <div className="delta-stepper">
      <div style={pillStyle}>
        <button type="button" style={btnStyle}
          onMouseDown={(e) => e.preventDefault()} onClick={dec} aria-label="-"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201,164,78,0.16)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
          <i className="ti ti-minus" aria-hidden="true" style={{ fontSize: 14 }} />
        </button>
        <input
          type="number"
          className={'delta-stepper-input' + (inputClassName ? ' ' + inputClassName : '')}
          value={value}
          onChange={(e) => onChange(e.target.value === '' || e.target.value === '-' ? e.target.value : (parseInt(e.target.value, 10) || 0))}
        />
        <button type="button" style={btnStyle}
          onMouseDown={(e) => e.preventDefault()} onClick={inc} aria-label="+"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201,164,78,0.16)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
          <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: 14 }} />
        </button>
      </div>
      {presets && presets.length > 0 && (
        <div className="delta-stepper-chips">
          {presets.map((n) => (
            <button type="button" key={n} className="delta-chip" onClick={() => bump(n)}>+{n}</button>
          ))}
          {onReset && (
            <button type="button" className="delta-chip delta-chip--reset" onClick={onReset} disabled={d === 0} aria-label={'Zerar'}>
              <i className="ti ti-rotate" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================== [15] DarExperienciaModal — Mestre concede XP a um personagem ============================== */
function DarExperienciaModal({ personagem, lang, onCancel, onSaved }) {
  const en = lang === 'en';
  const [delta, setDelta] = useState(0);          // começa em 0: nada de concessão acidental
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Escape e travamento de scroll já são responsabilidade do ModalShell — não duplicar aqui.

  const xpAtual      = personagem.experiencia || 0;
  const d            = parseInt(delta, 10) || 0;
  const xpNovo       = Math.max(0, xpAtual + d);  // XP nunca negativo
  const estAtual     = calcEstagio(xpAtual);
  const estNovo      = calcEstagio(xpNovo);
  const subiuEstagio = estNovo > estAtual;
  const caiuEstagio  = estNovo < estAtual;
  const semMudanca   = xpNovo === xpAtual;

  const fullName = `${personagem.nome}${personagem.sobrenome ? ' ' + personagem.sobrenome : ''}`;

  const CHIPS = [1, 2, 5, 10, 15];

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
      title={<><i className="ti ti-star xp-give-title-ic" aria-hidden="true" /> {en ? 'Experience' : 'Experiência'}</>}
      lang={lang}
      size="sm"
      onClose={onCancel}
      onCancel={onCancel}
      onConfirm={salvar}
      confirmLabel={saving ? (en ? 'Saving…' : 'Salvando…') : (en ? 'Grant' : 'Conceder')}
      confirmDisabled={saving || semMudanca}
    >
      <div className="xp-give">
        <p className="xp-give-sub">
          {en
            ? <>Award experience to <strong>{fullName}.</strong></>
            : <>Conceder experiência para <strong>{fullName}</strong>.</>}
        </p>

        {/* Valor a conceder: stepper + atalhos */}
        <div className="xp-amount">
          <DeltaStepper
            value={delta}
            onChange={setDelta}
            presets={CHIPS}
            onReset={() => setDelta(0)}
          />
        </div>

        {subiuEstagio && (
          <div className="xp-levelup">
            <i className="ti ti-stars" aria-hidden="true" />
            <span>
              {en
                ? <><strong>{fullName}</strong> will advance to stage {estNovo}.</>
                : <><strong>{fullName}</strong> vai evoluir para o estágio {estNovo}.</>}
            </span>
          </div>
        )}

        {error && <div className="err-msg xp-give-err">{error}</div>}
      </div>
    </ModalShell>
  );
}

/* ============================== [16] DarMoedasModal: Mestre concede ou subtrai moedas de um PJ ============================== */
/* Rótulos dos motivos da RPC mestre_ajustar_moedas. (inalterado) */
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
  const en = lang === 'en';
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

  const labels = en
    ? { ouro: 'Gold Coin', prata: 'Silver Coin', cobre: 'Copper Coin', latao: 'Brass Coin' }
    : { ouro: 'Moeda de Ouro', prata: 'Moeda de Prata', cobre: 'Moeda de Cobre', latao: 'Moeda de Latão' };

  const PRESETS_MOEDA = [1, 2, 5, 10, 15];

  const novosValores = {
    ouro:  (moedasAtuais.ouro  || 0) + (parseInt(deltas.ouro,  10) || 0),
    prata: (moedasAtuais.prata || 0) + (parseInt(deltas.prata, 10) || 0),
    cobre: (moedasAtuais.cobre || 0) + (parseInt(deltas.cobre, 10) || 0),
    latao: (moedasAtuais.latao || 0) + (parseInt(deltas.latao, 10) || 0),
  };
  const denomNegativa = MOEDA_ORDEM.find((k) => novosValores[k] < 0);
  const totalAtual  = moedasToLatao(moedasAtuais);
  const totalNovo   = moedasToLatao(novosValores);
  const netChange   = totalNovo - totalAtual;
  const haDelta = MOEDA_ORDEM.some((k) => (parseInt(deltas[k], 10) || 0) !== 0);

  const fullName = `${personagem.nome}${personagem.sobrenome ? ' ' + personagem.sobrenome : ''}`;
  const nf = (n) => n.toLocaleString(en ? 'en-US' : 'pt-BR');

  const salvar = async () => {
    if (denomNegativa) return;
    setSaving(true);
    setError(null);
    const deltasInt = {
      ouro:  parseInt(deltas.ouro,  10) || 0, prata: parseInt(deltas.prata, 10) || 0,
      cobre: parseInt(deltas.cobre, 10) || 0, latao: parseInt(deltas.latao, 10) || 0,
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
      <ModalShell title={en ? 'Coins' : 'Moedas'} lang={lang} size="sm" onClose={onCancel} onCancel={onCancel}>
        <Carregando lang={lang} compacto />
      </ModalShell>
    );
  }

  return (
    <ModalShell
      title={<><i className="ti ti-coins gc-title-ic" aria-hidden="true" /> {en ? 'Coins' : 'Moedas'}</>}
      lang={lang}
      size="sm"
      onClose={onCancel}
      onCancel={onCancel}
      onConfirm={salvar}
      confirmLabel={saving ? (en ? 'Saving…' : 'Salvando…') : (en ? 'Apply' : 'Aplicar')}
      confirmDisabled={saving || !haDelta || !!denomNegativa}
    >
      <div className="give-coins">
        <p className="give-coins-sub">
          {en
            ? <>Adjust the coins of <strong>{fullName}</strong>.</>
            : <>Ajuste a algibeira de <strong>{fullName}</strong>.</>}
        </p>

        <div className="gc-rows">
          {MOEDA_ORDEM.map((tipo, idx) => {
            const dv  = parseInt(deltas[tipo], 10) || 0;
            const neg = novosValores[tipo] < 0;
            return (
              <div key={tipo} style={{ marginBottom: idx < MOEDA_ORDEM.length - 1 ? 18 : 0 }}>
                {/* label acima, igual ao padrão give-xp-sub */}
                <p style={{
                  fontFamily: "'Lora', serif", fontSize: 13,
                  color: 'var(--parchment-muted, #9C8F73)', marginBottom: 8,
                  fontStyle: 'italic',
                }}>
                  {labels[tipo]}
                </p>
                <DeltaStepper
                  value={deltas[tipo]}
                  onChange={(v) => setDeltas((d) => ({ ...d, [tipo]: v }))}
                  inputClassName={neg ? 'is-err' : dv > 0 ? 'is-pos' : ''}
                  presets={PRESETS_MOEDA}
                  onReset={() => setDeltas((d) => ({ ...d, [tipo]: 0 }))}
                />
              </div>
            );
          })}
        </div>

        {denomNegativa && (
          <div className="err-msg gc-err" style={{ marginTop: 14 }}>
            {en
              ? `Cannot make ${labels[denomNegativa]} negative — the character has only ${moedasAtuais[denomNegativa] || 0}.`
              : `A moeda ${labels[denomNegativa]} ficaria negativa, e o personagem só possui ${moedasAtuais[denomNegativa] || 0}.`}
          </div>
        )}
        {error && <div className="err-msg gc-err" style={{ marginTop: 14 }}>{error}</div>}
      </div>
    </ModalShell>
  );
}

/* ============================== [17] NovoPersonagemModal: wizard de criação em 3 passos ============================== */
function NovoPersonagemModal({ lang, onClose, onSaved, personagemExistente = null, isMaster = false }) {
  const isEdit = !!personagemExistente;
  const [tip, abrirTip, fecharTip, manterTip] = useTooltip(60);
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
    caracterizacao: personagemExistente.caracterizacao || {},
    data_nasc: personagemExistente.data_nasc ?? null, // { dia, mes, ano } | null
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
    caracterizacao: {},
    data_nasc: null, // { dia, mes, ano } | null
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
  // Grava uma escolha de caracterização. `grupo` = 'fisica'|'social'|'pessoal'
  // (aninhado por `chave`, a categoria) ou 'historica' (valor direto, sem
  // `chave`). valor === '' remove a chave (volta a "nenhuma escolhida") em
  // vez de guardar string vazia — mantém o JSONB salvo enxuto.
  const updateCaract = (grupo, chave, valor) => {
    setForm((f) => {
      const atual = f.caracterizacao || {};
      if (grupo === 'historica') {
        const prox = { ...atual };
        if (valor) prox.historica = valor; else delete prox.historica;
        return { ...f, caracterizacao: prox };
      }
      const doGrupo = { ...(atual[grupo] || {}) };
      if (valor) doGrupo[chave] = valor; else delete doGrupo[chave];
      return { ...f, caracterizacao: { ...atual, [grupo]: doGrupo } };
    });
  };
  const baseVals = ATRIBUTOS_KEYS.reduce((acc, k) => { acc[k] = form[`${k}_base`]; return acc; }, {});
  const gastos = pontosGastos(baseVals, form.raca);
  // Pool de atributos = a do estágio + o bônus de equalização da raça, que
  // devolve em pontos livres o que a raça não deu em nível inicial.
  const totalPontos = pontosAtributosTotal(calcEstagio(form.experiencia), form.raca);
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

  // ---- Caracterização (pool único, compartilhado entre as telas fisica/
  // social/pessoal — Histórica não participa, é escolha sem custo) ----
  const caractTotalPontos = pontosCaracterizacaoTotal(form.caracterizacao);
  const caractGasto       = gastoCaracterizacao(form.caracterizacao);
  const caractRestantes   = caractTotalPontos - caractGasto;

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
    { id: 'identidade',   sub: 'fisica',    label: lang === 'en' ? 'Physical Traits'   : 'Caracterização Física'    },
    { id: 'identidade',   sub: 'social',    label: lang === 'en' ? 'Social Traits'     : 'Caracterização Social'    },
    { id: 'identidade',   sub: 'pessoal',   label: lang === 'en' ? 'Personal Traits'   : 'Caracterização Pessoal'   },
    { id: 'identidade',   sub: 'historica', label: lang === 'en' ? 'Historical Traits' : 'Caracterização Histórica' },
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
    'identidade:principal': 'Todo herói começa com uma boa história de origem. Defina seu nome, e suas características do seu personagem para dar vida a quem enfrentará os desafios da aventura. Depois de criado, ele estará pronto para participar de qualquer mesa.',
    'identidade:fisica':    'Personalize a aparência do personagem com traços físicos opcionais. Cada escolha fortalece uma característica, mas reduz outra, tornando cada combinação única.',
    'identidade:social':    'Defina como o personagem se relaciona com o mundo por meio de traços sociais opcionais. Cada escolha concede vantagens em um aspecto e limita outro.',
    'identidade:pessoal':   'Dê personalidade ao personagem escolhendo traços opcionais que influenciam seu comportamento. Cada decisão fortalece uma característica em troca de outra.',
    'identidade:historica': 'Escolha o legado histórico do seu povo de acordo com o reino de origem. Essa decisão representa as tradições e influências que acompanharam o personagem desde o nascimento.',
    'atributos':            'Distribua seus pontos entre os atributos básicos para definir os pontos fortes e fracos do personagem.',
    'grupos_armas':         'Escolha os grupos de armas em que o personagem possui treinamento. Quanto maior a proficiência, melhor será seu desempenho em combate.',
    'habilidades':          'Invista pontos nas habilidades para especializar o personagem nas áreas que mais combinam com seu estilo de jogo.',
    'magias':               'Escolha as magias que o personagem conhece e desenvolva seu domínio sobre as artes místicas.',
    'tecnicas':             'Aprenda técnicas de combate que concedem novas opções táticas e tornam o personagem mais eficiente durante as batalhas.',
    'revisao':              '',
  };
  const descricaoTela = DESCRICOES_TELA[stepKey] || DESCRICOES_TELA[currentId] || '';  

  // Validações por passo
  /* Data de nascimento trava ao editar — inclusive para o Mestre (pedido do
     usuário, 12/09/2026). Exceção: personagem antigo SEM data. A validação
     da Identidade exige a data, e travar um campo vazio deixaria a edição
     impossível de salvar; ele preenche uma vez e, dali em diante, trava. */
  const dataNascTravada = isEdit && personagemExistente?.data_nasc?.ano != null;

  const erroIdentidade =
    !form.nome.trim()         ? 'Escolha um nome' :
    !form.raca                ? 'Escolha uma raça' :
    !form.reino               ? 'Escolha um reino' :
    !form.profissao           ? 'Escolha uma profissão' :
    (!form.data_nasc || form.data_nasc.dia == null || form.data_nasc.mes == null || form.data_nasc.ano == null || form.data_nasc.ano === '')
                              ? 'Informe a data de nascimento' : null;

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

  const erroCaracterizacao = caractRestantes < 0
    ? `Você gastou ${caractGasto} pontos em caracterização, mas só tem ${caractTotalPontos}`
    : null;

  // 'identidade' cobre 5 telas (principal + fisica/social/pessoal +
  // historica) — cada uma valida só a própria preocupação: a tela
  // principal valida nome/raça/reino/profissão, fisica/social/pessoal
  // validam o pool de pontos compartilhado, historica é livre (sem custo).
  const podeAvancar =
    currentId === 'identidade' ? (
      currentSub === 'principal' ? !erroIdentidade :
      (currentSub === 'fisica' || currentSub === 'social' || currentSub === 'pessoal') ? !erroCaracterizacao :
      true
    ) :
    currentId === 'atributos'    ? !erroAtributos :
    currentId === 'grupos_armas' ? !erroGruposArmas :
    currentId === 'habilidades'  ? !erroHabilidades :
    currentId === 'magias'       ? !erroMagias :
    currentId === 'tecnicas'     ? !erroTecnicas : true;

  // Atributos finais usados nos Totais de habilidade/magia/técnica das telas
  // seguintes. O modificador racial NÃO é somado aqui: ele já está dentro de
  // `X_base` desde a escolha da raça (handleRacaChange semeia). Somar de novo
  // era a contagem dupla que fazia o wizard divergir da ficha — o
  // StepRevisao, que chama calcularFicha, sempre mostrou o valor certo.
  const atributosFinais = ATRIBUTOS_KEYS.reduce((acc, k) => {
    acc[k] = form[`${k}_base`] ?? 0;
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
      caracterizacao: form.caracterizacao || {},
      data_nasc: form.data_nasc ?? null,
    };

    // Marca que o jogador já viu o estágio atual — é isso que esconde o badge
    // "Pronto pra evoluir!" (temLevelUpPendente). O Mestre NÃO atualiza isso.
    //
    // Só quando os pontos do estágio foram REALMENTE distribuídos (regra do
    // usuário, 01/09/2026). Antes bastava abrir o wizard e salvar: o badge
    // sumia e os pontos ficavam esquecidos, sem nada lembrando o jogador.
    if (isEdit && !isMaster && todosOsPontosGastos({
      atributos: restantes, habilidades: habRestantes, magias: magRestantes,
      tecnicas: tecRestantes, gruposArmas: grpRestantes, usaMagia,
    })) {
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
  ) : (currentId === 'identidade' && (currentSub === 'fisica' || currentSub === 'social' || currentSub === 'pessoal')) ? (
    <WizSaldo lang={lang} disponiveis={caractTotalPontos} gastos={caractGasto} restantes={caractRestantes} />
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
            {...propsTip(abrirTip, fecharTip, s.label)}
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
      size="md"
      extraClass="ms-wizard"
      onClose={onClose}
      onCancel={onClose}
      headerExtra={wizStepper}
      footerCenter={footerSaldo}
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
          {currentId === 'identidade' && <StepIdentidade form={form} update={update} updateCaract={updateCaract} lang={lang} isEdit={isEdit} dataNascTravada={dataNascTravada} sub={currentSub} caractRestantes={caractRestantes} />}
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
          <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
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

// ---------- SelectPill — cópia local de 11-ficha/ficha.jsx (originalmente de
// 12-batalha/batalha.jsx), com um ajuste LOCAL nesta cópia ----------
// Não exportado via window por nenhuma das fases de origem. Padrão do
// projeto: cada módulo que precisa declara sua própria cópia local em vez
// de importar. Copiado aqui pros selects de Identidade (Gênero/Raça/
// Profissão/Especialização/Reino/Deus) e das novas telas de Caracterização —
// este é o dropdown padrão REAL do projeto (ver comentário completo na
// cópia de 11-ficha/ficha.jsx). CSS já existe em index.css (blocos
// .select-pill-btn / .select-pill-drop / .motor-field) — só foi somado um
// ajuste de margin-bottom escopado a `.wiz-ident .motor-field`, nada mais.
//
// AJUSTE NESTA CÓPIA (não replicado em ficha.jsx): a versão original abre o
// painel com `position:absolute` dentro do próprio `.motor-field`. No
// wizard, o rodapé (Cancelar/saldo/Avançar) cobria o painel aberto em
// campos perto do fim do formulário — o rodapé é irmão do corpo rolável do
// ModalShell e "ganha" do z-index do painel porque o painel fica preso no
// stacking context do corpo. Troquei pra `ReactDOM.createPortal` com
// `position:fixed`, coordenadas calculadas do botão via
// getBoundingClientRect — a mesma ideia documentada em index.css pro
// MenestrelSelect que nunca chegou a ser construído (ver skill, seção
// "Padrão de dropdown/select"). Portal alvo: o `.menestrel-ui` mais próximo
// do botão (mantém o escopo dos seletores CSS `#root .menestrel-ui …`).
function SelectPill({ options = [], value, onChange, placeholder, disabled, label }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = React.useRef(null);
  const panelRef = React.useRef(null);

  const recalc = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const PANEL_MAX  = 200; // altura máxima desejada do painel
    const GAP        = 4;
    const spaceBelow = window.innerHeight - r.bottom - GAP;
    const spaceAbove = r.top - GAP;
    // Abre acima quando não há espaço suficiente abaixo E há mais espaço acima
    const openUp = spaceBelow < PANEL_MAX && spaceAbove > spaceBelow;
    const maxH   = openUp
      ? Math.min(PANEL_MAX, spaceAbove)
      : Math.min(PANEL_MAX, spaceBelow);
    setCoords({
      top:    openUp ? undefined : r.bottom + GAP,
      bottom: openUp ? window.innerHeight - r.top + GAP : undefined,
      left:   r.left,
      width:  r.width,
      maxH,
    });
  };

  React.useEffect(() => {
    if (!open) return;
    recalc();
    // Clique fora fecha — "fora" agora precisa considerar o botão E o painel
    // portalizado (que não é mais descendente do wrapper no DOM).
    const handler = (e) => {
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      setOpen(false);
    };
    // Scroll não borbulha (bubbling) — só captura (capture:true) pega o
    // scroll do corpo rolável do modal por trás do botão.
    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', recalc, true);
    window.addEventListener('resize', recalc);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', recalc, true);
      window.removeEventListener('resize', recalc);
    };
  }, [open]);

  const selected = options.find((o) => String(o.value) === String(value));
  const displayLabel = selected
    ? (selected.labelBotao != null ? selected.labelBotao : selected.label)
    : (placeholder || '—');

  const pillStyle = {
    background: 'rgba(24,17,8,0.92)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(106,85,48,0.50)', borderRadius: 999, height: 32,
    fontFamily: "'Lora', serif", fontSize: 13, flexShrink: 0, width: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
    color: '#E8DDC6', padding: '0 12px 0 16px', cursor: disabled ? 'default' : 'pointer',
    outline: 'none', outlineOffset: 0, boxShadow: 'none', appearance: 'none', WebkitAppearance: 'none',
    WebkitTapHighlightColor: 'transparent', transition: 'border-color .15s',
  };

  const dropStyle = coords ? {
    position: 'fixed',
    top: coords.top, bottom: coords.bottom,
    left: coords.left, width: coords.width,
    background: 'rgba(18,12,5,0.98)', border: '1px solid rgba(201,164,78,0.20)', borderRadius: 8,
    padding: 4, margin: 0, listStyle: 'none', zIndex: 9999,
    boxShadow: '0 16px 40px -12px rgba(0,0,0,0.9)',
    maxHeight: coords.maxH, overflowY: 'auto',
  } : null;

  return (
    <div className="motor-field" style={{ position: 'relative' }}>
      {label && <span>{label}</span>}
      <button type="button" className="select-pill-btn" data-open={open ? 'true' : 'false'} style={pillStyle} disabled={disabled}
        ref={btnRef}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => { e.currentTarget.blur(); !disabled && setOpen((v) => !v); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v); } }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayLabel}</span>
        <i className="ti ti-chevron-down" aria-hidden="true"
           style={{ fontSize: 12, color: '#C9A44E', opacity: 0.7, flexShrink: 0,
                    transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>
      {open && coords && ReactDOM.createPortal(
        <ul className="select-pill-drop menestrel-ui" ref={panelRef} style={dropStyle}>
          {options.map((opt) => {
            const active = String(opt.value) === String(value);
            const optDisabled = !!opt.disabled;
            if (!opt.label) return null;
            return (
              <li key={opt.value}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 10px',
                  borderRadius: 6, cursor: optDisabled ? 'not-allowed' : 'pointer', fontFamily: "'Lora', serif", fontSize: 13,
                  color: active ? '#C9A44E' : optDisabled ? 'rgba(200,188,170,0.30)' : '#C8BCAA',
                  background: 'transparent', whiteSpace: 'pre-wrap', userSelect: 'none' }}
                onMouseEnter={(e) => { if (!active && !optDisabled) { e.currentTarget.style.background = 'rgba(201,164,78,0.10)'; e.currentTarget.style.color = '#E8DDC6'; } }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = active ? '#C9A44E' : optDisabled ? 'rgba(200,188,170,0.30)' : '#C8BCAA'; }}
                onClick={() => { if (!optDisabled) { onChange(opt.value); setOpen(false); } }}>
                <span>{opt.label}</span>
                {active && <i className="ti ti-check" style={{ fontSize: 12, color: '#C9A44E', flexShrink: 0 }} />}
              </li>
            );
          })}
        </ul>,
        // .menestrel-ui mais próximo do botão — mantém os seletores CSS
        // `#root .menestrel-ui …` válidos. document.body só entra como rede
        // de segurança (não deveria disparar: todo componente do projeto
        // nasce dentro de .menestrel-ui).
        // Portal vai direto pro document.body pra escapar de qualquer
        // overflow:hidden ou backdrop-filter do ancestral (o .modal-backdrop
        // com backdrop-filter cria stacking context e confina position:fixed
        // mesmo que o elemento esteja fora do overflow:hidden do .modal-wizard).
        // A classe menestrel-ui no <ul> garante que os seletores CSS
        // `#root .menestrel-ui .select-pill-drop` continuem válidos.
        document.body
      )}
    </div>
  );
}

// wizInputStyle — MESMOS valores do pillStyle do SelectPill acima, pra que os
// <input> de Nome/Sobrenome fiquem pixel-a-pixel iguais aos SelectPill de
// Raça/Gênero, travados (isEdit) ou não. As divergências que existiam com a
// classe .wiz-field-locked (background sólido, borda mais fraca, sem
// backdrop-filter, opacity 0.55 em vez de 0.45) somem porque aqui o estilo é
// inline (vence a cascata) e replica o pill exatamente.
function wizInputStyle(locked) {
  return {
    background: 'rgba(24,17,8,0.92)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(106,85,48,0.50)', borderRadius: 999, height: 32,
    fontFamily: "'Lora', serif", fontSize: 13, flexShrink: 0, width: '100%',
    color: '#E8DDC6', padding: '0 16px',
    outline: 'none', outlineOffset: 0, boxShadow: 'none',
    WebkitTapHighlightColor: 'transparent', transition: 'border-color .15s',
    opacity: locked ? 0.45 : 1, cursor: locked ? 'not-allowed' : 'text',
  };
}

function StepIdentidade({ form, update, lang, isEdit, dataNascTravada = false, sub = 'principal', updateCaract, caractRestantes = 0 }) {
  const opcoesEsp = GAME_DATA.especializacoes[form.profissao] || [];
  // O campo aparece sempre que a profissão tiver especializações. Havia aqui um
  // `estagio >= 5 &&`, que escondia o campo na criação (personagem novo nasce
  // com XP 0, ou seja, estágio 1) — decisão revista em 08/09/2026 a pedido do
  // usuário. Era o único lugar do app que amarrava especialização a estágio.
  const mostraEsp = opcoesEsp.length > 0;
  const fotoRaca  = WIZ_RACA_FOTO[form.raca] || null;
  const nenhumaLabel = '';
  const escolhaLabel = lang === 'en' ? '— choose —' : '— escolha —';

  // ── Telas 2–4: Caracterização Física / Social / Pessoal ──
  // Cada categoria = 1 SelectPill de 3 estados (nenhuma / opcaoConcede +N /
  // opcaoCusta −N), 2 por linha via .wiz-row-2col. Dados em
  // GAME_DATA.caracterizacoes; pontos calculados em gastoCaracterizacao/
  // pontosCaracterizacaoTotal (01-core/game-data.jsx), consumidos pelo
  // WizSaldo do rodapé (ver NovoPersonagemModal).
  if (sub === 'fisica' || sub === 'social' || sub === 'pessoal') {
    const categorias = GAME_DATA.caracterizacoes[sub] || [];
    const escolhas = (form.caracterizacao && form.caracterizacao[sub]) || {};
    // Pontos esgotados → bloqueia novas compras de vantagem (opcaoCusta).
    // Desvantagens (opcaoConcede) e remoções sempre liberadas.
    const semPontos = caractRestantes === 0;
    const linhas = [];
    for (let i = 0; i < categorias.length; i += 2) linhas.push(categorias.slice(i, i + 2));
    return (
      <div className="wiz-ident wiz-ident-caract">
        {linhas.map((par, i) => (
          <div className="wiz-row-2col" key={i}>
            {par.map((cat) => {
              const jaEscolheu = !!(escolhas[cat.key]);
              // Em edição: se já escolheu, trava (não pode desfazer).
              // Se ainda não escolheu, permite (compra nova).
              const bloqueado = isEdit && jaEscolheu;
              // Trava o pill inteiro quando pontos = 0 E categoria ainda vazia:
              // não há nada útil a fazer sem saldo. Categorias com escolha
              // permanecem abertas (remover em criação, trocar concede↔custa).
              const pillDesabilitado = bloqueado || (semPontos && !jaEscolheu);
              // Opção "remover": aparece apenas no wizard de criação (não edição)
              // e somente quando há uma escolha feita — permite desfazer antes
              // de concluir a revisão do personagem.
              const removeOpt = (!isEdit && jaEscolheu)
                ? [{ value: '', label: lang === 'en' ? '— remove —' : '— remover —' }]
                : [];
              return (
                <SelectPill
                  key={cat.key}
                  label={cat.nome}
                  value={escolhas[cat.key] || ''}
                  onChange={(v) => updateCaract(sub, cat.key, v)}
                  placeholder={nenhumaLabel}
                  disabled={pillDesabilitado}
                  options={[
                    ...removeOpt,
                    { value: cat.opcaoConcede.key, label: `${cat.opcaoConcede.nome} (+${GANHO_CARACTERIZACAO})` },
                    {
                      value: cat.opcaoCusta.key,
                      label: `${cat.opcaoCusta.nome} (−${CUSTO_CARACTERIZACAO})`,
                      // Se o pill está aberto (jaEscolheu), bloqueia a vantagem
                      // enquanto não há pontos — salvo se já é a escolha atual.
                      disabled: semPontos && escolhas[cat.key] !== cat.opcaoCusta.key,
                    },
                  ]}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  // ── Tela 5: Caracterização Histórica — 1 escolha por reino, sem custo ──
  // Opções vêm de GAME_DATA.caracterizacaoHistorica[form.reino]; como reino
  // é travado após a criação, a lista de opções aqui também é fixa.
  if (sub === 'historica') {
    const opcoes = GAME_DATA.caracterizacaoHistorica[form.reino] || [];
    const jaEscolheu = !!(form.caracterizacao && form.caracterizacao.historica);
    const bloqueado = isEdit && jaEscolheu;
    return (
      <div className="wiz-ident">
        <div className="wiz-col">
          <SelectPill
            label={lang === 'en' ? `${form.reino} history` : `História de ${form.reino}`}
            value={(form.caracterizacao && form.caracterizacao.historica) || ''}
            onChange={(v) => updateCaract('historica', null, v)}
            placeholder={nenhumaLabel}
            disabled={bloqueado}
            options={[
              { value: '', label: nenhumaLabel },
              ...opcoes.map((op) => ({ value: op, label: op })),
            ]}
          />
        </div>
      </div>
    );
  }

  // ── Tela 1: Imagem + Identidade ──
  // Trocar de raça re-semeia os 7 atributos com o modificador racial, que é o
  // NÍVEL INICIAL gratuito de cada um (decisão de 08/09/2026): o Anão já
  // nasce com Físico 2 sem gastar ponto, e pontosGastos mede o gasto a partir
  // daí. A distribuição feita até aqui é descartada de propósito — o custo de
  // cada atributo é relativo à raça, então manter os valores mudaria o preço
  // do que já foi comprado. Raça é a tela 1 e atributos a tela 2, e o seletor
  // é `disabled={isEdit}`, então isso só acontece durante a criação.
  const handleRacaChange = (v) => {
    const mods = GAME_DATA.racas[v]?.mods;
    update('raca', v);
    // `update` usa setForm com updater funcional, então as chamadas em
    // sequência se acumulam num render só.
    ATRIBUTOS_KEYS.forEach((k) => update(`${k}_base`, mods?.[k] ?? 0));
  };

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
        {/* Nome e Sobrenome inline — <input> recebe wizInputStyle (cópia exata
            do pillStyle do SelectPill) via inline, ficando idêntico aos campos
            de Raça/Gênero. Sem a classe .wiz-field-locked de propósito: era ela
            que divergia o estilo (fundo/borda/opacity). */}
        <div className="wiz-row-2col">
          <label className="motor-field">
            <span>{lang === 'en' ? 'Name' : 'Nome'}</span>
            <input type="text" value={form.nome} onChange={(e) => update('nome', e.target.value)}
              placeholder="Aygrius" disabled={isEdit} readOnly={isEdit} style={wizInputStyle(isEdit)} />
          </label>
          <label className="motor-field">
            <span>{lang === 'en' ? 'Surname' : 'Sobrenome'}</span>
            <input type="text" value={form.sobrenome} onChange={(e) => update('sobrenome', e.target.value)}
              disabled={isEdit} readOnly={isEdit} style={wizInputStyle(isEdit)} />
          </label>
        </div>

        {/* Raça e Gênero inline */}
        <div className="wiz-row-2col">
          <SelectPill
            label={lang === 'en' ? 'Race' : 'Raça'}
            value={form.raca}
            onChange={handleRacaChange}
            disabled={isEdit}
            options={Object.keys(GAME_DATA.racas).map((r) => ({ value: r, label: r }))}
          />
          <SelectPill
            label={lang === 'en' ? 'Gender' : 'Gênero'}
            value={form.genero}
            onChange={(v) => update('genero', v)}
            placeholder={escolhaLabel}
            disabled={isEdit}
            options={GAME_DATA.generos.map((g) => ({ value: g, label: g }))}
          />
        </div>

        {/* Profissão e Especialização inline. O par só não aparece quando a
            profissão não tem especializações no catálogo — aí Profissão volta
            a ocupar a linha inteira, no `else` abaixo. */}
        {mostraEsp ? (
          <div className="wiz-row-2col">
            <SelectPill
              label={lang === 'en' ? 'Profession' : 'Profissão'}
              value={form.profissao}
              onChange={(v) => update('profissao', v)}
              disabled={isEdit}
              options={Object.keys(GAME_DATA.profissoes).map((p) => ({ value: p, label: p }))}
            />
            <SelectPill
              label={lang === 'en' ? 'Specialization' : 'Especialização'}
              value={form.especializacao || ''}
              onChange={(v) => update('especializacao', v)}
              placeholder={escolhaLabel}
              disabled={isEdit && !!form.especializacao}
              options={opcoesEsp.map((o) => ({ value: o.esp, label: o.esp }))}
            />
          </div>
        ) : (
          <SelectPill
            label={lang === 'en' ? 'Profession' : 'Profissão'}
            value={form.profissao}
            onChange={(v) => update('profissao', v)}
            disabled={isEdit}
            options={Object.keys(GAME_DATA.profissoes).map((p) => ({ value: p, label: p }))}
          />
        )}

        {/* Reino e Deus inline */}
        <div className="wiz-row-2col">
          <SelectPill
            label={lang === 'en' ? 'Kingdom' : 'Reino'}
            value={form.reino}
            onChange={(v) => update('reino', v)}
            disabled={isEdit}
            options={GAME_DATA.reinos.map((r) => ({ value: r, label: r }))}
          />
          <SelectPill
            label={lang === 'en' ? 'God' : 'Deus'}
            value={form.deus}
            onChange={(v) => update('deus', v)}
            placeholder={escolhaLabel}
            disabled={isEdit}
            options={GAME_DATA.deuses.map((d) => ({ value: d, label: d }))}
          />
        </div>

        {/* Data de Nascimento — usa FantasyDatePicker (dia, mês, ano do calendário do jogo).
            A idade é calculada dinamicamente pela data atual do jogo.
            FantasyDatePicker vive em 10-shell e está disponível no window quando esta fase renderiza. */}
        <div className="motor-field">
          <span>{lang === 'en' ? 'Date of Birth' : 'Data de Nascimento'}</span>
          {typeof FantasyDatePicker !== 'undefined' ? (
            <FantasyDatePicker
              value={form.data_nasc ?? { dia: 1, mes: 1, ano: 0 }}
              onChange={(v) => { if (!dataNascTravada) update('data_nasc', v); }}
              disabled={dataNascTravada}
              lang={lang}
            />
          ) : (
            /* Fallback caso FantasyDatePicker ainda não esteja disponível — 3 inputs inline */
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number" placeholder="Dia" min={1} max={30} step={1}
                disabled={dataNascTravada}
                value={form.data_nasc?.dia ?? ''}
                onChange={(e) => {
                  const v = e.target.value === '' ? null : Number(e.target.value);
                  update('data_nasc', { ...(form.data_nasc || {}), dia: v });
                }}
                style={{ ...wizInputStyle(false), width: 64 }}
              />
              <input
                type="number" placeholder="Mês" min={1} max={13} step={1}
                disabled={dataNascTravada}
                value={form.data_nasc?.mes ?? ''}
                onChange={(e) => {
                  const v = e.target.value === '' ? null : Number(e.target.value);
                  update('data_nasc', { ...(form.data_nasc || {}), mes: v });
                }}
                style={{ ...wizInputStyle(false), width: 64 }}
              />
              <input
                type="number" placeholder="Ano"
                disabled={dataNascTravada}
                value={form.data_nasc?.ano ?? ''}
                onChange={(e) => {
                  const v = e.target.value === '' ? null : Number(e.target.value);
                  update('data_nasc', { ...(form.data_nasc || {}), ano: v });
                }}
                style={{ ...wizInputStyle(false), flex: 1 }}
              />
            </div>
          )}
        </div>
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

/* ---- Modal de explicação, compartilhado pelos passos do wizard ----
   Substitui o acordeão inline que cada passo mantinha (08/09/2026): com a
   lista em duas colunas, abrir um bloco de texto no meio da grade empurrava
   os vizinhos e bagunçava o alinhamento dos steppers.

   Os cinco passos (Atributos, Grupos de Armas, Habilidades, Magias, Técnicas)
   e o painel de Aprimoramentos montam o mesmo formato a partir dos próprios
   dados, então o markup do detalhe vive num lugar só:

     { titulo, linhas: [{ rotulo, valor }], descricao, niveis: [{ n, t }] }

   `niveis` é opcional e só as Magias usam — é a tabela do que a magia faz em
   cada nível efetivo (1, 3, 5, 7, 9). Linha com valor vazio é descartada, o
   que dispensa cada chamador de filtrar campo em branco do banco.

   Fica por cima do wizard — ver .modal-detalhe no index.css e a pilha de
   Escape em ModalShell (10-shell/shell.jsx), que impede um Escape aqui de
   fechar o wizard inteiro junto.

   Sem rodapé de propósito: é só leitura, não tem nada a confirmar nem a
   cancelar. Fecha no "x" ou no Escape.

   VAI POR PORTAL pra .mc-root, em vez de renderizar onde foi declarado
   (08/09/2026, relato de modal descentralizado). Declarado dentro do passo,
   o backdrop nascia ANINHADO no backdrop do wizard, e backdrop aninhado é
   frágil: `.ms-backdrop` tem backdrop-filter, que cria bloco de contenção
   pros filhos `position: fixed`, então a caixa do de dentro deixa de ser a
   viewport e a compensação `padding-left: var(--sidebar-w)` acaba contada
   duas vezes — o modal escorrega pra direita pela largura do menu lateral.
   Como irmão em .mc-root ele cai exatamente no mesmo caminho de qualquer
   outro modal do app: mesma regra de CSS, mesmo --sidebar-w, mesma
   centralização.

   O alvo é .mc-root e não document.body porque os seletores do backdrop são
   ancorados em `#root .menestrel-ui` — fora dali o modal perderia o estilo
   todo. document.body só serve de rede pros testes, que montam um passo
   avulso sem o shell em volta. */
function DetalheModal({ detalhe, lang, onClose }) {
  if (!detalhe) return null;
  const alvo = (typeof document !== 'undefined'
    && (document.querySelector('#root .menestrel-ui.mc-root') || document.body)) || null;
  if (!alvo) return null;
  const linhas = (detalhe.linhas || []).filter((l) => l && l.valor != null && l.valor !== '');
  const niveis = (detalhe.niveis || []).filter((x) => x && x.t);
  return ReactDOM.createPortal(
    <ModalShell
      title={detalhe.titulo}
      onClose={onClose}
      size="sm"
      extraClass="modal-detalhe"
      lang={lang}
    >
      {linhas.length > 0 && (
        <div className="wiz-mag-niveis">
          {linhas.map((l) => (
            <div className="wiz-mag-nivel" key={l.rotulo}>
              <span className="wiz-mag-nivel-n">{l.rotulo}: </span>
              <span className="wiz-mag-nivel-t">{l.valor}</span>
            </div>
          ))}
        </div>
      )}
      {detalhe.descricao && <p className="wiz-mag-desc">{detalhe.descricao}</p>}
      {niveis.length > 0 && (
        <div className="wiz-mag-niveis">
          {niveis.map((x) => (
            <div className="wiz-mag-nivel" key={x.n}>
              <span className="wiz-mag-nivel-n">{x.n}</span>
              <span className="wiz-mag-nivel-t">{x.t}</span>
            </div>
          ))}
        </div>
      )}
      {linhas.length === 0 && niveis.length === 0 && !detalhe.descricao && (
        <p className="wiz-mag-desc">
          {lang === 'en' ? 'No description available.' : 'Sem descrição disponível.'}
        </p>
      )}
    </ModalShell>,
    alvo
  );
}

// Botão do nome de um item da lista. Abre o DetalheModal quando há o que
// explicar; sem detalhe, vira texto simples e não recebe foco de teclado.
function NomeItem({ nome, onAbrir, className = 'wiz-hab-name' }) {
  if (!onAbrir) {
    return (
      <span className={className} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>{nome}</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      className={`${className} wiz-mag-name--clickable`}
      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0, textAlign: 'left' }}
      onClick={onAbrir}
    >
      <span>{nome}</span>
    </button>
  );
}

function StepAtributos({ form, update, lang, gastos, totalPontos, restantes, isEdit, isMaster, originais }) {
  const [tip, abrirTip, fecharTip, manterTip] = useTooltip(60);
  const [detalhe, setDetalhe] = useState(null);
  const incrementar = (k, delta) => {
    const atual = form[`${k}_base`] ?? 0;
    const novo = atual + delta;
    if (novo < -2 || novo > 6) return;
    if (isEdit && originais && novo < (originais[`${k}_base`] ?? 0)) return;
    if (delta > 0 && restantes - (custoAtributo(novo) - custoAtributo(atual)) < 0) return;
    update(`${k}_base`, novo);
  };

  // Estilos do stepper pill — mesmo padrão de BarEditPopover / batalha
  const pillStyle = {
    background: 'rgba(24,17,8,0.92)', border: '1px solid rgba(106,85,48,0.50)',
    borderRadius: 999, height: 32, display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: 4, padding: '0 4px',
  };
  const btnStyle = (enabled) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 24, height: 24, flexShrink: 0, borderRadius: '50%', border: 'none',
    background: 'transparent', color: enabled ? '#C9A44E' : 'rgba(201,164,78,0.30)',
    cursor: enabled ? 'pointer' : 'default', transition: 'background .15s',
  });

  return (
    <div className="wiz-attrs wiz-lista-dupla">
      {ATRIBUTOS_KEYS.map((k) => {
        const base = form[`${k}_base`] ?? 0;
        const descricao = ATRIBUTOS_DESCRICAO[k];
        const semSaldoPraMais = restantes - (custoAtributo(base + 1) - custoAtributo(base)) < 0;
        const podeMais = base < 6 && !semSaldoPraMais;
        const podeMenos = base > -2 && !(isEdit && originais && base <= (originais[`${k}_base`] ?? 0));

        return (
          <div key={k} className="wiz-item">
            {/* Nome clicável — abre o modal de explicação */}
            <NomeItem
              nome={ATRIBUTOS_LABEL[k]}
              className="wiz-attrs-name"
              onAbrir={descricao ? () => setDetalhe({ titulo: ATRIBUTOS_LABEL[k], descricao }) : null}
            />

            {/* Stepper pill */}
            <div style={pillStyle}>
              <button type="button" style={btnStyle(podeMenos)} disabled={!podeMenos}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => incrementar(k, -1)} aria-label="−"
                onMouseEnter={(e) => { if (podeMenos) e.currentTarget.style.background = 'rgba(201,164,78,0.16)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                <i className="ti ti-minus" aria-hidden="true" style={{ fontSize: 14 }} />
              </button>
              <span style={{ flex: '1 1 auto', textAlign: 'center', fontFamily: "'Lora', serif", fontSize: 13, color: '#E8DDC6', fontVariantNumeric: 'tabular-nums' }}>
                {base}
              </span>
              <button type="button" style={btnStyle(podeMais)} disabled={!podeMais}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => incrementar(k, +1)} aria-label="+"
                {...propsTip(abrirTip, fecharTip, base >= 6 ? (lang === 'en' ? 'Maximum value' : 'Valor máximo') : semSaldoPraMais ? (lang === 'en' ? 'Not enough points' : 'Pontos insuficientes') : undefined)}
                onMouseEnter={(e) => { if (podeMais) e.currentTarget.style.background = 'rgba(201,164,78,0.16)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: 14 }} />
              </button>
            </div>
          </div>
        );
      })}
      <DetalheModal detalhe={detalhe} lang={lang} onClose={() => setDetalhe(null)} />
      <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </div>
  );
}

// ---- Step 3: Grupos de Armas (todas as profissões) ----
// Adiciona bônus em L, M e P ao usar uma arma do grupo treinado.
// Catálogo fixo (sem DB query) — GRUPOS_ARMAS em game-data.jsx.
function StepGruposArmas({ form, update, lang, grpTotalPontos, grpGasto, grpRestantes, grpQtd, estagio, isEdit, personagemExistente }) {
  const [tip, abrirTip, fecharTip, manterTip] = useTooltip(60);
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

  const [detalhe, setDetalhe] = useState(null);

  // Coluna 1: grupos especificados manualmente
  const NOMES_COLUNA1_PT = ['Combate Desarmado', 'Combate de Imobilização', 'Corte Leve', 'Corte Médio', 'Corte Pesado'];
  const NOMES_COLUNA1_EN = ['Unarmed Combat', 'Grappling Combat', 'Light Cut', 'Medium Cut', 'Heavy Cut'];
  const coluna1 = GRUPOS_ARMAS.filter((g) =>
    NOMES_COLUNA1_PT.includes(g.nome) || NOMES_COLUNA1_EN.includes(g.nomeEn || '')
  );
  const coluna2 = GRUPOS_ARMAS.filter((g) =>
    !NOMES_COLUNA1_PT.includes(g.nome) && !NOMES_COLUNA1_EN.includes(g.nomeEn || '')
  );

  const pillStyle = {
    background: 'rgba(24,17,8,0.92)', border: '1px solid rgba(106,85,48,0.50)',
    borderRadius: 999, height: 32, display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: 4, padding: '0 4px',
  };
  const btnStyle = (enabled) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 24, height: 24, flexShrink: 0, borderRadius: '50%', border: 'none',
    background: 'transparent', color: enabled ? '#C9A44E' : 'rgba(201,164,78,0.30)',
    cursor: enabled ? 'pointer' : 'default', transition: 'background .15s',
  });

  const renderLista = (lista) => lista.map((g) => {
    const nivel = compradas[g.sigla] || 0;
    const original = personagemExistente?.grupos_armas?.[g.sigla] || 0;
    const acimaDoEstagio = nivel >= estagio;
    const semSaldoPraMais = grpRestantes - g.custo < 0;
    const podeMais = !acimaDoEstagio && !semSaldoPraMais;
    const podeMenos = nivel > 0 && !(isEdit && nivel <= original);
    const nomeMostrado = lang === 'en' ? (g.nomeEn || g.nome) : g.nome;
    const temDetalhe = !!(g.exemplos);
    return (
      <div key={g.sigla} className="wiz-item">
        <NomeItem
          nome={nomeMostrado}
          onAbrir={temDetalhe ? () => setDetalhe({
            titulo: nomeMostrado,
            linhas: [{ rotulo: lang === 'en' ? 'Cost' : 'Custo', valor: g.custo }],
            descricao: g.exemplos,
          }) : null}
        />
        <div style={pillStyle}>
          <button type="button" style={btnStyle(podeMenos)} disabled={!podeMenos}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => mudarNivel(g.sigla, -1)} aria-label="−"
            onMouseEnter={(e) => { if (podeMenos) e.currentTarget.style.background = 'rgba(201,164,78,0.16)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
            <i className="ti ti-minus" aria-hidden="true" style={{ fontSize: 14 }} />
          </button>
          <span style={{ flex: '1 1 auto', textAlign: 'center', fontFamily: "'Lora', serif", fontSize: 13, color: '#E8DDC6', fontVariantNumeric: 'tabular-nums' }}>
            {nivel}
          </span>
          <button type="button" style={btnStyle(podeMais)} disabled={!podeMais}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => mudarNivel(g.sigla, +1)} aria-label="+"
            {...propsTip(abrirTip, fecharTip, acimaDoEstagio ? (lang === 'en' ? `Max for stage (${estagio})` : `Máximo do estágio (${estagio})`) : semSaldoPraMais ? (lang === 'en' ? 'Not enough points' : 'Pontos insuficientes') : undefined)}
            onMouseEnter={(e) => { if (podeMais) e.currentTarget.style.background = 'rgba(201,164,78,0.16)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
            <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: 14 }} />
          </button>
        </div>
      </div>
    );
  });

  return (
    <div className="wiz-habs">
      {grpTotalPontos === 0 ? (
        <div className="wiz-magias-empty">
          {lang === 'en'
            ? 'No weapon-group points for this profession'
            : 'Esta profissão não possui pontos de grupo de armas'}
        </div>
      ) : (
        <div className="wiz-habs-list wiz-lista-dupla">
          {renderLista([...coluna1, ...coluna2])}
        </div>
      )}
      <DetalheModal detalhe={detalhe} lang={lang} onClose={() => setDetalhe(null)} />
      <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
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
  // Item com o modal de explicação aberto. Null = nenhum.
  const [detalhe, setDetalhe] = useState(null);
  const [tip, abrirTip, fecharTip, manterTip] = useTooltip(60);

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

  const pillStyle = {
    background: 'rgba(24,17,8,0.92)', border: '1px solid rgba(106,85,48,0.50)',
    borderRadius: 999, height: 32, display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: 4, padding: '0 4px',
  };
  const btnStyle = (enabled) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 24, height: 24, flexShrink: 0, borderRadius: '50%', border: 'none',
    background: 'transparent', color: enabled ? '#C9A44E' : 'rgba(201,164,78,0.30)',
    cursor: enabled ? 'pointer' : 'default', transition: 'background .15s',
  });

  const renderGrupo = ([categoria, lista]) => (
    <div className="wiz-hab-cat wiz-lista-dupla" key={categoria}>
      {lista.map((h) => {
        const comprado = hab[h.key] || 0;
        const nivelBruto = (h.nivel_inicial ?? 0) + comprado;
        const nivelAtual = Math.min(nivelBruto, estagio);
        const podeMaisEstagio = (h.nivel_inicial ?? 0) + comprado + 1 <= estagio;
        const semSaldoPraMais = habRestantes - (h.custo ?? 0) < 0;
        const podeMais = podeMaisEstagio && !semSaldoPraMais;
        const podeMenos = comprado > 0 && !(isEdit && comprado <= (personagemExistente?.habilidades?.[h.key] || 0));
        // Aprimorável sempre tem o que explicar (a regra de vagas), mesmo que
        // o banco não traga descrição nem vantagem.
        const temDetalhe = !!(h.descricao || h.vantagem || h.desvantagem || h.restricao
          || GAME_DATA.aprimoramentoPorHab[h.key]);
        return (
          <div key={h.key} className="wiz-item">
            <NomeItem
              nome={h.nome}
              onAbrir={temDetalhe ? () => setDetalhe({
                titulo: h.nome,
                linhas: [
                  { rotulo: lang === 'en' ? 'Attribute' : 'Atributo', valor: ATRIBUTOS_LABEL[h.ajuste] },
                  { rotulo: lang === 'en' ? 'Cost' : 'Custo', valor: h.custo },
                  // Só nas quatro aprimoráveis: como se ganha vaga, e os
                  // idiomas que a raça e o reino já dão de graça. Vivia solto
                  // na lista e desalinhava as colunas — o lugar de explicação
                  // é aqui.
                  { rotulo: lang === 'en' ? 'Improvement slots' : 'Vagas de aprimoramento',
                    valor: GAME_DATA.aprimoramentoPorHab[h.key]
                      ? (lang === 'en'
                          ? `1 per ${GAME_DATA.aprimoramentoPorHab[h.key]} points of total`
                          : `1 a cada ${GAME_DATA.aprimoramentoPorHab[h.key]} pontos de total`)
                      : null },
                  { rotulo: lang === 'en' ? 'Native languages' : 'Idiomas nativos',
                    valor: h.key === 'idioma' ? idiomasIniciais(form.raca, form.reino).join(', ') : null },
                  { rotulo: lang === 'en' ? 'Advantage' : 'Vantagem', valor: h.vantagem },
                  { rotulo: lang === 'en' ? 'Disadvantage' : 'Desvantagem', valor: h.desvantagem },
                  { rotulo: lang === 'en' ? 'Restriction' : 'Restrição',
                    valor: h.restricao
                      ? (String(h.restricao).trim().toUpperCase() === 'N'
                          ? (lang === 'en' ? 'Can only be used with level' : 'Só pode ser usado com nível')
                          : h.restricao)
                      : null },
                ],
                descricao: h.descricao,
              }) : null}
            />
            <div style={pillStyle}>
              <button type="button" style={btnStyle(podeMenos)} disabled={!podeMenos}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => mudarNivel(h.key, -1)} aria-label="−"
                onMouseEnter={(e) => { if (podeMenos) e.currentTarget.style.background = 'rgba(201,164,78,0.16)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                <i className="ti ti-minus" aria-hidden="true" style={{ fontSize: 14 }} />
              </button>
              <span style={{ flex: '1 1 auto', textAlign: 'center', fontFamily: "'Lora', serif", fontSize: 13, color: '#E8DDC6', fontVariantNumeric: 'tabular-nums' }}>
                {nivelAtual}
              </span>
              <button type="button" style={btnStyle(podeMais)} disabled={!podeMais}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => mudarNivel(h.key, +1)} aria-label="+"
                {...propsTip(abrirTip, fecharTip, !podeMaisEstagio ? (lang === 'en' ? `Cannot exceed stage (${estagio})` : `Não pode passar do estágio (${estagio})`) : semSaldoPraMais ? (lang === 'en' ? 'Not enough points' : 'Pontos insuficientes') : undefined)}
                onMouseEnter={(e) => { if (podeMais) e.currentTarget.style.background = 'rgba(201,164,78,0.16)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: 14 }} />
              </button>
            </div>
            {/* Vagas de aprimoramento da própria habilidade, quando ela for
                uma das quatro aprimoráveis. */}
            {GAME_DATA.aprimoramentoPorHab[h.key] && (
              <AprimoramentoInline
                habKey={h.key} form={form} update={update} lang={lang}
                slots={slotsAprimoramento(h.key, totalHabilidade(h.key, hab, atributosFinais, bonusHabilidades, habilidadesByKey))}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  // Cada tela = 1 grupo (sub = nome do grupo). Mostra só a tabela daquele grupo.
  const grupoAtual = porGrupo.find(([cat]) => cat === sub);

  return (
    <div className="wiz-habs">
      <div className="wiz-habs-list wiz-habs-list--single">
        {grupoAtual ? renderGrupo(grupoAtual) : (
          <div className="wiz-magias-empty">
            {lang === 'en' ? 'No skills in this group yet.' : 'Nenhuma habilidade neste grupo ainda.'}
          </div>
        )}
      </div>

      <DetalheModal detalhe={detalhe} lang={lang} onClose={() => setDetalhe(null)} />
      <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </div>
  );
}

/* ---- Aprimoramentos, colados na habilidade-mãe ----
   Idiomas, religiões, artes e sabedorias são vagas que a PRÓPRIA habilidade
   destrava: Idioma a cada 10 pontos, Religião a cada 5, Arte e Sabedoria a
   cada 7 (GAME_DATA.aprimoramentoPorHab). Os idiomas nativos (raça + reino +
   Malês) são automáticos e não ocupam vaga.

   Antes isto era um painel só, empilhado DEPOIS de todas as habilidades e
   separado por uma borda — o que abria um vão no meio da lista e deixava as
   vagas longe da habilidade que as gera (08/09/2026). Agora cada bloco mora
   dentro do item da sua habilidade.

   Bloco sem vaga aparece ESMAECIDO em vez de sumir: a habilidade existe e
   pode ser essencial pra profissão — Religião pro Sacerdote, por exemplo —
   e escondê-la fazia parecer que o jogo não tinha aquilo. Esmaecido, mostra
   que existe e quanto falta pra destravar. */
function AprimoramentoInline({ habKey, form, update, lang, slots }) {
  const aprim = form.aprimoramentos || {};
  const escolhidos = aprim[habKey] || [];
  if (!GAME_DATA.aprimoramentoPorHab[habKey]) return null;

  const en = lang === 'en';

  // Forma ÚNICA pras quatro (08/09/2026): só os seletores de vaga, nada em
  // volta. Já saíram daqui o texto da regra, os chips de idioma nativo (que
  // eram exceção do Idioma e desalinhavam a lista) e o contador X/N — as vagas
  // vazias já dizem quantas faltam, e "1/1" ou "0/0" só ocupavam linha.
  // A regra de quantos pontos rendem uma vaga e os idiomas nativos vivem no
  // modal de explicação da habilidade (ver StepHabilidades).
  const placeholderOpt = en ? '— choose —' : '— escolha —';

  // Sem vaga destravada: um seletor desabilitado e esmaecido. Não desaparece
  // porque a habilidade existe e pode ser central pra profissão (Religião pro
  // Sacerdote) — sumir fazia parecer que o jogo não tinha aquilo.
  if (slots <= 0) {
    return (
      <div className="wiz-aprim-inline is-travado">
        <SelectPill options={[{ value: '', label: placeholderOpt }]} value="" placeholder={placeholderOpt} disabled />
      </div>
    );
  }

  const opcoes = opcoesAprimoramento(habKey, form.raca, form.reino);

  return (
    <div className="wiz-aprim-inline">
      {Array.from({ length: slots }, (_, i) => {
        // Opção já usada em OUTRA vaga não reaparece — não dá pra escolher o
        // mesmo idioma duas vezes.
        const emOutroSlot = new Set(escolhidos.filter((v, idx) => v && idx !== i));
        return (
          <SelectPill
            key={i}
            options={[
              { value: '', label: placeholderOpt },
              ...opcoes.filter((o) => !emOutroSlot.has(o)).map((o) => ({ value: o, label: o })),
            ]}
            value={escolhidos[i] || ''}
            placeholder={placeholderOpt}
            onChange={(novoVal) => {
              const lista = [...escolhidos];
              while (lista.length < i) lista.push('');
              lista[i] = novoVal;
              update('aprimoramentos', { ...aprim, [habKey]: lista.slice(0, slots) });
            }}
          />
        );
      })}
    </div>
  );
}

// ---- Step 4: Magias (Bardo/Mago/Rastreador/Sacerdote) ----
function StepMagias({ form, update, lang, sub, magiasDb, magiasError, magTotalPontos, magGasto, magRestantes, isEdit, personagemExistente }) {
  const [detalhe, setDetalhe] = useState(null); // magia com o modal de explicação aberto
  const [tip, abrirTip, fecharTip, manterTip] = useTooltip(60);
  const estagio = calcEstagio(form.experiencia);

  if (magiasDb === null) {
    return <Carregando lang={lang} />;
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

  // Filtra as magias que o personagem realmente pode COMPRAR. Dois crivos:
  //   podeAcessarMagia  — a profissão (ou a especialização) alcança a magia;
  //   magiaEhTravada    — a raridade permite comprar (só 'Básica' permite).
  //
  // A travada aparecia na lista esmaecida, com um selo de origem. Mostrar o
  // que não se pode comprar só gerava dúvida sobre por que o botão + não
  // respondia (decisão de 08/09/2026: não listar).
  const especializacao = form.especializacao || null;
  const disponiveis = magiasDb.filter((m) =>
    podeAcessarMagia(m, form.profissao, especializacao) && !magiaEhTravada(m)
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
    // Nível sem texto não se compra (ver passosDisponiveisMagia). Vale só
    // pra SUBIR: quem já tinha o passo antes de o admin apagar o nível não
    // é rebaixado à força — podeMenos/originalPasso seguem mandando na
    // descida, e ninguém perde o que já comprou.
    if (delta > 0 && proposto > passosDisponiveisMagia(magiasDb.find((x) => x.key === key))) return;

    // Perdida/Ancestral não se compram com pontos: cada nível exige o seu
    // pergaminho, usado no inventário (RPC usar_pergaminho_magia).
    // É RARIDADE, não a aba: uma magia de especialização pode ser Básica e
    // comprável, e uma de profissão pode ser Perdida e travada.
    if (delta > 0 && magiaEhTravada(magiasDb.find((x) => x.key === key))) return;

    // Bloqueia a compra se não houver pontos suficientes
    if (delta > 0 && gastoMagias({ ...compradas, [key]: proposto }, magiasDb) > magTotalPontos) return;
    const novoObj = { ...compradas };
    if (proposto === 0) delete novoObj[key];
    else                novoObj[key] = proposto;
    update('magias', novoObj);
  };

  // "Avançada = Especialização" (03/09/2026, regra do usuário): a aba separa
  // por QUEM ALCANÇA a magia, não por raridade.
  //   Básicas    permissao cita a profissão — todo Mago alcança
  //   Avançadas  permissao cita a especialização — só o Colégio Necromântico
  //
  // Antes as duas abas eram filtradas por `tipo`, e "Avançadas" era
  // `tipo !== 'Básica'` — o MESMO critério que trava a compra. A aba era, por
  // construção, a lista do que ninguém podia comprar: um personagem com
  // especialização e pontos sobrando não conseguia gastar um ponto ali, e as
  // magias que a especialização realmente liberava estavam na aba "Básicas".
  // A ficha, enquanto isso, já chamava essas de "Avançadas" — a divergência
  // entre as duas telas é que fazia a compra parecer quebrada.
  const disponiveisTela = sub === 'avancada'
    ? disponiveis.filter((m) =>  magiaEhAvancada(m))
    : disponiveis.filter((m) => !magiaEhAvancada(m));

  const pillStyle = {
    background: 'rgba(24,17,8,0.92)', border: '1px solid rgba(106,85,48,0.50)',
    borderRadius: 999, height: 32, display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: 4, padding: '0 4px',
  };
  const btnStyle = (enabled) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 24, height: 24, flexShrink: 0, borderRadius: '50%', border: 'none',
    background: 'transparent', color: enabled ? '#C9A44E' : 'rgba(201,164,78,0.30)',
    cursor: enabled ? 'pointer' : 'default', transition: 'background .15s',
  });

  const renderTabela = (lista) => lista.map((m) => {
    const passos = compradas[m.key] || 0;
    const originalPasso = personagemExistente?.magias?.[m.key] || 0;
    // Sem estado "travada" aqui: `disponiveis` já descartou o que não se pode
    // comprar. mudarPasso mantém a checagem de magiaEhTravada como rede — é a
    // regra, e não custa nada.
    // Teto de níveis que a magia realmente tem — o admin pode ter apagado
    // um nível no editor de catálogo, e nível sem texto não se compra.
    const passosDisponiveis = passosDisponiveisMagia(m);
    const temProximoNivel = passos + 1 <= passosDisponiveis;
    const podeMaisEstagio = passos < 5 && nivelMagiaEfetivo(passos + 1) <= estagio;
    const semSaldoPraMais = passos < 5 && gastoMagias({ ...compradas, [m.key]: passos + 1 }, magiasDb) > magTotalPontos;
    const podeMais = temProximoNivel && podeMaisEstagio && !semSaldoPraMais;
    const podeMenos = passos > 0 && !(isEdit && passos <= originalPasso);
    return (
      <div key={m.key} className="wiz-item">
        <NomeItem
          nome={m.nome}
          onAbrir={() => setDetalhe({
            titulo: m.nome,
            linhas: [
              { rotulo: lang === 'en' ? 'Evocation' : 'Evocação', valor: m.evocacao },
              { rotulo: lang === 'en' ? 'Range' : 'Alcance', valor: m.alcance },
              { rotulo: lang === 'en' ? 'Duration' : 'Duração', valor: m.duracao },
              { rotulo: lang === 'en' ? 'Cost' : 'Custo', valor: m.custo },
            ],
            descricao: m.descricao,
            // Nível apagado pelo admin não aparece na ficha da magia — se
            // não dá pra comprar, mostrar o rótulo vazio só confunde.
            niveis: [
              { n: 1, t: m.nivel_1 }, { n: 3, t: m.nivel_3 }, { n: 5, t: m.nivel_5 },
              { n: 7, t: m.nivel_7 }, { n: 9, t: m.nivel_9 },
            ].filter((x) => x.t != null && String(x.t).trim() !== ''),
          })}
        />
        <div style={pillStyle}>
          <button type="button" style={btnStyle(podeMenos)} disabled={!podeMenos}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => mudarPasso(m.key, -1)} aria-label="−"
            onMouseEnter={(e) => { if (podeMenos) e.currentTarget.style.background = 'rgba(201,164,78,0.16)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
            <i className="ti ti-minus" aria-hidden="true" style={{ fontSize: 14 }} />
          </button>
          <span style={{ flex: '1 1 auto', textAlign: 'center', fontFamily: "'Lora', serif", fontSize: 13, color: '#E8DDC6', fontVariantNumeric: 'tabular-nums' }}>
            {passos > 0 ? nivelMagiaEfetivo(passos) : 0}
          </span>
          <button type="button" style={btnStyle(podeMais)} disabled={!podeMais}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => mudarPasso(m.key, +1)} aria-label="+"
            {...propsTip(abrirTip, fecharTip, !temProximoNivel && passos < 5 ? (lang === 'en' ? 'This spell has no further level' : 'Esta magia não tem nível seguinte') : !podeMaisEstagio && passos < 5 ? (lang === 'en' ? `Cannot exceed stage (${estagio})` : `Não pode passar do estágio (${estagio})`) : semSaldoPraMais ? (lang === 'en' ? 'Not enough points' : 'Pontos insuficientes') : undefined)}
            onMouseEnter={(e) => { if (podeMais) e.currentTarget.style.background = 'rgba(201,164,78,0.16)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
            <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: 14 }} />
          </button>
        </div>
      </div>
    );
  });

  return (
    <div className="wiz-habs">
      {disponiveisTela.length === 0 ? (
        <div className="wiz-magias-empty">
          {sub === 'avancada'
            /* A aba agora depende da ESPECIALIZAÇÃO, não da profissão: quem
               ainda não escolheu uma (estágio < 5) não tem nada aqui, e o
               texto tem que dizer isso — "para essa profissão" mandava o
               usuário procurar o problema no lugar errado. */
            ? (especializacao
                ? (lang === 'en' ? `No advanced spells for ${especializacao} yet.` : `Nenhuma magia avançada de ${especializacao} ainda.`)
                : (lang === 'en' ? 'Advanced spells come from a specialization, chosen at stage 5.' : 'As magias avançadas vêm da especialização, escolhida no estágio 5.'))
            : (lang === 'en' ? 'No basic spells available for this profession yet.' : 'Nenhuma magia básica disponível para essa profissão ainda.')}
        </div>
      ) : (
        <div className="wiz-habs-list wiz-lista-dupla">
          {renderTabela(disponiveisTela)}
        </div>
      )}
      <DetalheModal detalhe={detalhe} lang={lang} onClose={() => setDetalhe(null)} />
      <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </div>
  );
}

// ---- Step 5: Técnicas de Combate (todas as profissões) ----
function StepTecnicas({ form, update, lang, tecnicasDb, tecnicasError, tecTotalPontos, tecGasto, tecRestantes, tecQtd, isEdit, personagemExistente, atributosFinais }) {
  const [detalhe, setDetalhe] = useState(null); // técnica com o modal de explicação aberto
  const [tip, abrirTip, fecharTip, manterTip] = useTooltip(60);

  if (tecnicasDb === null) {
    return <Carregando lang={lang} />;
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

  const especializacao = form.especializacao || null;
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

  const pillStyle = {
    background: 'rgba(24,17,8,0.92)', border: '1px solid rgba(106,85,48,0.50)',
    borderRadius: 999, height: 32, display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: 4, padding: '0 4px',
  };
  const btnStyle = (enabled) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 24, height: 24, flexShrink: 0, borderRadius: '50%', border: 'none',
    background: 'transparent', color: enabled ? '#C9A44E' : 'rgba(201,164,78,0.30)',
    cursor: enabled ? 'pointer' : 'default', transition: 'background .15s',
  });

  const renderTabela = (lista) => lista.map((t) => {
    const passos = compradas[t.key] || 0;
    const originalPasso = personagemExistente?.tecnicas?.[t.key] || 0;
    const acimaDoEstagio = passos >= estagio;
    const semSaldoPraMais = !acimaDoEstagio && gastoTecnicas({ ...compradas, [t.key]: passos + 1 }, tecnicasDb) > tecTotalPontos;
    const podeMais = !acimaDoEstagio && !semSaldoPraMais;
    const podeMenos = passos > 0 && !(isEdit && passos <= originalPasso);
    return (
      <div key={t.key} className="wiz-item">
        <NomeItem
          nome={t.nome}
          onAbrir={() => setDetalhe({
            titulo: t.nome,
            linhas: [
              { rotulo: lang === 'en' ? 'Use' : 'Uso', valor: t.uso },
              { rotulo: lang === 'en' ? 'Weapons' : 'Armas', valor: t.grupo_armas },
              { rotulo: lang === 'en' ? 'Armor' : 'Armaduras', valor: t.grupo_armaduras },
              { rotulo: lang === 'en' ? 'Cost' : 'Custo', valor: t.custo },
              { rotulo: lang === 'en' ? 'Effect' : 'Efeito', valor: t.efeito },
            ],
            descricao: t.descricao,
          })}
        />
        <div style={pillStyle}>
          <button type="button" style={btnStyle(podeMenos)} disabled={!podeMenos}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => mudarPasso(t.key, -1)} aria-label="−"
            onMouseEnter={(e) => { if (podeMenos) e.currentTarget.style.background = 'rgba(201,164,78,0.16)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
            <i className="ti ti-minus" aria-hidden="true" style={{ fontSize: 14 }} />
          </button>
          <span style={{ flex: '1 1 auto', textAlign: 'center', fontFamily: "'Lora', serif", fontSize: 13, color: '#E8DDC6', fontVariantNumeric: 'tabular-nums' }}>
            {passos}
          </span>
          <button type="button" style={btnStyle(podeMais)} disabled={!podeMais}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => mudarPasso(t.key, +1)} aria-label="+"
            {...propsTip(abrirTip, fecharTip, acimaDoEstagio ? (lang === 'en' ? `Max for stage (${estagio})` : `Máximo do estágio (${estagio})`) : semSaldoPraMais ? (lang === 'en' ? 'Not enough points' : 'Pontos insuficientes') : undefined)}
            onMouseEnter={(e) => { if (podeMais) e.currentTarget.style.background = 'rgba(201,164,78,0.16)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
            <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: 14 }} />
          </button>
        </div>
      </div>
    );
  });

  return (
    <div className="wiz-habs">
      {disponiveis.length === 0 ? (
        <div className="wiz-magias-empty">
          {lang === 'en'
            ? 'No techniques available for this profession yet.'
            : 'Nenhuma técnica disponível para essa profissão ainda.'}
        </div>
      ) : (
        <div className="wiz-habs-list wiz-lista-dupla">
          {renderTabela(disponiveis)}
        </div>
      )}
      <DetalheModal detalhe={detalhe} lang={lang} onClose={() => setDetalhe(null)} />
      <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
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
      </div>

      <div className="wiz-review-grid">
        <section>
          <div className="wiz-review-eyebrow">{lang === 'en' ? 'Identity' : 'Identidade'}</div>
          <dl>
            <div><dt>{lang === 'en' ? 'Race' : 'Raça'}</dt><dd>{form.raca}</dd></div>
            <div><dt>{lang === 'en' ? 'Gender' : 'Gênero'}</dt><dd>{form.genero}</dd></div>
            {form.data_nasc?.ano != null && (() => {
              const dn = form.data_nasc;
              const meses = typeof FANTASY_MONTHS !== 'undefined' ? FANTASY_MONTHS : null;
              const nomeMes = meses ? (meses[dn.mes - 1]?.nome || '').replace(/^Mês /, '') : `Mês ${dn.mes}`;
              const anoAtual = form._anoJogo ?? null;
              const idadeCalc = (anoAtual != null && dn.ano != null) ? anoAtual - Number(dn.ano) : null;
              return (
                <div>
                  <dt>{lang === 'en' ? 'Date of Birth' : 'Data de Nascimento'}</dt>
                  <dd>
                    {dn.dia} {nomeMes} de {dn.ano}
                    {idadeCalc != null && (
                      <span style={{ opacity: 0.6, marginLeft: 6, fontSize: '0.88em' }}>
                        ({idadeCalc} {lang === 'en' ? 'years' : 'anos'})
                      </span>
                    )}
                  </dd>
                </div>
              );
            })()}
            {(() => { const h = GAME_DATA?.racas?.[form.raca]?.altura; return h != null ? <div><dt>{lang === 'en' ? 'Height' : 'Altura'}</dt><dd>{h.toFixed(2).replace('.', ',')} m</dd></div> : null; })()}
            <div><dt>{lang === 'en' ? 'Profession' : 'Profissão'}</dt><dd>{form.profissao}</dd></div>
            <div><dt>{lang === 'en' ? 'Kingdom' : 'Reino'}</dt><dd>{form.reino}</dd></div>
            <div><dt>{lang === 'en' ? 'Stage' : 'Estágio'}</dt><dd>{ficha.estagio}</dd></div>
            {form.deus && <div><dt>{lang === 'en' ? 'Devoted to' : 'Devoto de'}</dt><dd>{form.deus}</dd></div>}
          </dl>
        </section>
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
  StepIdentidade, StepAtributos, StepGruposArmas, StepHabilidades, AprimoramentoInline,
  StepMagias, StepTecnicas, StepRevisao,
});
