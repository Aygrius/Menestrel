/* ============================================================
   CONVITES — Convites de história (Mestre + Jogador)
   ============================================================
   Tema único: convites de uma história / mesa de RPG.

   - ConvitesHistoriaView   — PÁGINA do Mestre pra gerenciar convites
                              de UMA história (mesmo molde de
                              GerenciarLojaView/GerenciarLoreView/
                              BatalhasHistoriaView: header .ms-header
                              com seta de voltar + eyebrow + título,
                              corpo solto sem moldura própria, não mais
                              ModalShell). Aberta a partir do card de
                              história. Gera/revoga códigos. Botão
                              "Novo convite" mora no header (ação
                              principal à direita, como "Salvar" na loja).
   - ConvitesJogador        — aba inteira do console do Jogador.
                              Aceita convites por código + lista mesas.
   - AceitarConviteModal    — aceite rápido pós-criação de um PJ.
                              CONTINUA como ModalShell (modal pequeno,
                              não faz parte desta conversão).

   MIGRADO pro tema "Pedra & Bronze" (paleta oficial atual):
   - Visual nos tokens Pedra & Bronze. O CSS das classes .cv-* foi
     MIGRADO para src/index.css (seção "CONVITES (05)", sob
     #root .menestrel-ui) — não há mais <style>{CONV_CSS}</style> inline.
   - Retint jun/2026: a 1ª migração saiu no tema antigo "Grimório do dragão"
     (púrpura/ouro-vivo); agora alinhado ao bronze/pedra de index.css/shell.
   - Cores semânticas de status preservadas: verde = ativo/sucesso, vermelho
     = revogado/erro; azul de "usado" passou pro gelo da paleta.
   - Tabela de convites do Mestre usa UI.Table + UI.Badge (kit shadcn via ui-bridge).
   - AceitarConviteModal usa o ModalShell (moldura compartilhada já migrada).
   - Lógica 100% preservada: RPCs (listar/gerar/revogar/aceitar/listar_minhas_mesas),
     estados, handlers, labels de erro, escape/overflow, JSON.parse de fallback.

   I18N — REFATORADO (i18n-sync, fase "Convites"):
   - Texto deixou de ser ternário inline (`lang === 'en' ? 'X' : 'Y'`) e
     passou a vir de `t.convites.*`, populado por COPY[lang] em copy.jsx
     (seção `convites`). Os 3 componentes agora recebem `t` ALÉM de
     `lang` — `lang` foi mantido só onde é estritamente necessário
     (toLocaleDateString('pt-BR', ...) na formatação de data, que não é
     texto de UI e não tem equivalente em t).
   - motivoLabel() estava DUPLICADO (idêntico) em ConvitesJogador e em
     AceitarConviteModal — centralizado em t.convites.motivo, resolvendo
     a duplicação.
   - Strings com variável (ex.: "Falhou: {motivo}") usam o helper
     interpolate() de 01-core/helpers.jsx — ver chamadas marcadas com
     TODO-INTERPOLATE abaixo; ajustar import/nome se necessário
     ao integrar com o helpers.jsx real do projeto.
   - Os <strong> de destaque nas mensagens de sucesso ("Seu personagem
     X agora faz parte de Y") foram removidos por decisão do time —
     texto plano agora, sem negrito embutido.

   Depende de: React (global), supabaseClient, FANTASY_MONTHS, UI (ui-bridge),
   ModalShell (10-shell), interpolate (01-core/helpers). useState/useEffect globais.
   ============================================================ */

// CSS migrado para src/index.css (seção "CONVITES (05)"). As classes .cv-*
// são estilizadas lá, sob #root .menestrel-ui, junto dos overrides de retint
// que antes ficavam soltos. Aqui não há mais <style> inline.

const cvStatusBadge = (s) => {
  const map = {
    ativo:    { background: 'rgba(123,224,160,0.16)', color: '#7BE0A0', border: '1px solid rgba(123,224,160,0.40)', fontWeight: 600 },
    usado:    { background: 'rgba(110,138,166,0.18)',  color: '#9DB6CE', border: '1px solid rgba(110,138,166,0.40)',  fontWeight: 600 },
    revogado: { background: 'rgba(200,33,44,0.16)',   color: '#F0A6A0', border: '1px solid rgba(200,33,44,0.40)',   fontWeight: 600 },
    expirado: { background: 'rgba(var(--tinta-rgb),0.08)', color: 'var(--tinta-2)', border: '1px solid rgba(var(--tinta-rgb),0.16)', fontWeight: 600 },
  };
  return map[s] || map.expirado;
};

/* ============================== [25] ConvitesHistoriaModal — Mestre gerencia convites de uma história ============================== */
function ConvitesHistoriaView({ historia, t, lang, onClose, onChanged }) {
  const { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } = (typeof UI !== 'undefined' ? UI : {});
  const tc = t.convites;

  const [convites, setConvites] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiouId, setCopiouId] = useState(null);
  const [tip, abrirTip, fecharTip, manterTip] = (window.usePortalTooltip || useTooltip)(60);
  // Cartões (23/10/2026): busca, lixeira armada e as fotos dos personagens.
  const [busca, setBusca] = useState('');
  const [lixeira, setLixeira] = useState(null);
  const [fotos, setFotos] = useState({});

  const carregar = async () => {
    setError(null);
    const { data, error: err } = await supabaseClient.rpc('listar_convites_da_historia', {
      p_historia_id: historia.id,
    });
    if (err) {
      console.error('[convites] carga falhou:', err);
      setError(err.message);
      setConvites([]);
      return;
    }
    const arr = Array.isArray(data) ? data : (data ? JSON.parse(data) : []);
    setConvites(arr);
    // A foto de cada personagem que entrou por convite — o retrato do cartão.
    const ids = arr.map((c) => c.personagem_id).filter((v) => v != null);
    if (ids.length) {
      const { data: pjs } = await supabaseClient.from('personagens').select('id, foto_url').in('id', ids);
      const mapa = {};
      (pjs || []).forEach((pj) => { if (pj.foto_url) mapa[pj.id] = pj.foto_url; });
      setFotos(mapa);
    }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [historia.id]);

  const gerarConvite = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabaseClient.rpc('gerar_convite_historia', {
      p_historia_id: historia.id,
      p_dias_validade: 7,
    });
    setLoading(false);
    if (err) {
      console.error('[convites] gerar falhou:', err);
      setError(err.message);
      return;
    }
    if (!data?.ok) {
      /* TODO-INTERPOLATE: confirmar nome/import real do helper em 01-core/helpers.jsx */
      setError(interpolate(tc.mng.falhouComMotivo, { motivo: data?.motivo || tc.mng.falhouDesconhecido }));
      return;
    }
    await carregar();
  };

  const excluirConvite = async (conviteId) => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabaseClient.rpc('excluir_convite_historia', {
      p_convite_id: conviteId,
    });
    setLoading(false);
    if (err) {
      console.error('[convites] excluir falhou:', err);
      setError(err.message);
      return;
    }
    if (data && !data.ok) {
      /* TODO-INTERPOLATE */
      setError(interpolate(tc.mng.falhouComMotivo, { motivo: data.motivo }));
      return;
    }
    await carregar();
  };

  const reativarConvite = async (conviteId) => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabaseClient.rpc('reativar_convite_historia', {
      p_convite_id: conviteId,
    });
    setLoading(false);
    if (err) {
      console.error('[convites] reativar falhou:', err);
      setError(err.message);
      return;
    }
    if (data && !data.ok) {
      /* TODO-INTERPOLATE */
      setError(interpolate(tc.mng.falhouComMotivo, { motivo: data.motivo }));
      return;
    }
    await carregar();
  };

  const copiarCodigo = async (conviteId, codigo) => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiouId(conviteId);
      setTimeout(() => setCopiouId(null), 1500);
    } catch (e) {
      console.error('[convites] clipboard falhou:', e);
    }
  };

  const statusLabel = (s) => tc.status[s] || s;

  const fmtData = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    // Formatação de data (não é texto de UI traduzível) — mantém pt-BR
    // independente do idioma da interface, como já era antes.
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const fechar = () => { onChanged?.(); onClose(); };

  /* JOGADORES EM CARTÕES (23/10/2026): "A página de jogadores terá cards
     também, igual em personagens e diário." Cada convite é um cartão de
     Personagens (.pjs-grid / .pj-card): o retrato é o do personagem que
     entrou por ele; sem uso, o envelope. O nome é o do jogador (ou o código,
     enquanto ninguém usou). Clicar num convite ativo copia o código. A busca
     e o + (gerar convite) na barra acima, como em Personagens. */
  const semAcentoC = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const termo = semAcentoC(busca.trim());
  const lista = (convites || []).filter((c) => !termo
    || semAcentoC([c.codigo, c.usado_por_nome, c.personagem_nome].join(' ')).includes(termo));
  const BuscaENovo = window.BestBuscaENovo;
  const en = lang === 'en';

  return (
    <div className="pjs convites-cartoes-pagina">
      {BuscaENovo && (
        <div className="cartoes-barra">
          <BuscaENovo
            ac={ADMIN_COPY[lang] || ADMIN_COPY.pt}
            placeholder={en ? 'Search' : 'Buscar'}
            query={busca}
            setQuery={setBusca}
            podeCriar={!loading}
            onNovo={gerarConvite}
            dicaNovo={tc.mng.novoConvite} />
        </div>
      )}

      {error && <div className="cv-err" style={{ marginBottom: 14 }}>{error}</div>}

      {convites === null ? (
        <div className="cv-mng-loading">{tc.mng.carregando}</div>
      ) : lista.length === 0 ? (
        <div className="best-empty">
          {termo ? (en ? `No invite matches "${busca.trim()}".` : `Nenhum convite com "${busca.trim()}".`) : tc.mng.vazio}
        </div>
      ) : (
        <div className="pjs-grid">
          {lista.map((c) => {
            const st = c.status_real || c.status;
            const ativo = st === 'ativo';
            const foto = c.personagem_id != null ? fotos[c.personagem_id] : null;
            const nome = c.usado_por ? (c.usado_por_nome || c.usado_por.slice(0, 8)) : c.codigo;
            const armada = lixeira === c.id;
            const copiar = () => { if (ativo) copiarCodigo(c.id, c.codigo); };
            return (
              <div key={c.id} className="pj-card-wrap">
                <article className={'pj-card convite-cartao' + (ativo ? ' is-clickable' : '')}
                  role={ativo ? 'button' : undefined} tabIndex={ativo ? 0 : undefined}
                  onClick={copiar}
                  onKeyDown={(ev) => { if (ativo && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); copiar(); } }}
                  onMouseEnter={(ev) => { if (ativo) abrirTip(ev, tc.mng.copiar); }}
                  onMouseLeave={fecharTip}>
                  <div className="pj-card-body">
                    <div className={'pj-card-portrait' + (foto ? '' : ' is-empty')}>
                      {foto
                        ? <img src={foto} alt="" className="pj-card-portrait-img" />
                        : c.usado_por
                          ? <span className="pj-card-portrait-mono" aria-hidden="true">{String(nome).charAt(0).toUpperCase()}</span>
                          : <i className="ti ti-mail convite-cartao-envelope" aria-hidden="true" />}
                    </div>
                    <div className="pj-card-info">
                      <header className="pj-card-head">
                        <div className="pj-name-linha">
                          <div className="pj-name">{nome}</div>
                          <div className="convite-cartao-acoes" onClick={(ev) => ev.stopPropagation()}>
                            {st === 'revogado' && (
                              <button type="button" className="convite-cartao-botao" onClick={() => reativarConvite(c.id)} disabled={loading}
                                aria-label={tc.mng.reativar}>
                                <i className="ti ti-refresh" aria-hidden="true" />
                              </button>
                            )}
                            {/* Excluir em dois cliques, como no Diário e em Batalhas. */}
                            <button type="button" className={'convite-cartao-botao is-perigo' + (armada ? ' is-armada' : '')}
                              disabled={loading}
                              aria-label={armada ? (en ? 'Click again to delete' : 'Clique de novo para excluir') : tc.mng.remover}
                              onClick={() => { if (armada) { setLixeira(null); excluirConvite(c.id); } else setLixeira(c.id); }}
                              onMouseLeave={() => { if (armada) setLixeira(null); }}>
                              <i className={'ti ' + (armada ? 'ti-trash-x' : 'ti-trash')} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </header>
                      <div className="pj-meta-linhas">
                        <div className="pj-meta pj-meta--quem">
                          {c.personagem_nome && (
                            <>
                              <span>{c.personagem_nome}</span>
                              <span className="sep" aria-hidden="true">·</span>
                            </>
                          )}
                          {c.usado_por && <span className="convite-cartao-codigo">{c.codigo}</span>}
                          {!c.usado_por && <span>{statusLabel(st)}</span>}
                          {copiouId === c.id && <span className="convite-cartao-copiado">{tc.mng.copiado}</span>}
                        </div>
                        <div className="pj-meta pj-meta--estagio">
                          {c.usado_por
                            ? (en ? 'Joined on ' : 'Entrou em ') + fmtData(c.usado_em)
                            : (ativo ? (en ? 'Expires on ' : 'Vale até ') : (en ? 'Expired on ' : 'Venceu em ')) + fmtData(c.expira_em)}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      )}
      {window.PortalTooltip
        ? <window.PortalTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
        : null}
    </div>
  );
}

/* ============================== [26a] ConviteModal — Modal para aceitar convite por código ==============================
   Substitui a tela de aceite inline que ficava misturada com a listagem de mesas em ConvitesJogador.
   Agora é um ModalShell puro: o botão "Convites" na sidebar abre este modal.
   Fluxo: input → escolher_pj → success (mesmo de antes, só que dentro de um modal).
   Props: t, lang, currentUserId, onClose, onAccepted (callback pós-aceite, p/ AventurasJogador recarregar).
*/
function ConviteModal({ t, lang, currentUserId, onClose, onAccepted }) {
  const tc = t.convites;

  const [codigo, setCodigo] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null); // { historia_titulo, pj_nome }
  const [meusPjs, setMeusPjs] = useState([]);
  const [pjSelecionado, setPjSelecionado] = useState(null);
  const [step, setStep] = useState('input'); // input | escolher_pj | success

  useEffect(() => {
    (async () => {
      const { data } = await supabaseClient
        .from('personagens')
        .select('id, nome, sobrenome, raca, profissao')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: true });
      setMeusPjs(data || []);
    })();
    /* eslint-disable-next-line */
  }, [currentUserId]);

  const motivoLabel = (m) => tc.motivo[m] || m;

  const validar = () => {
    const c = (codigo || '').trim().toUpperCase();
    if (!c) { setError(tc.jogador.digiteCodigoPrimeiro); return; }
    if (meusPjs.length === 0) { setError(tc.jogador.semPersonagem); return; }
    setError(null);
    setStep('escolher_pj');
    setPjSelecionado(null);
  };

  const aceitar = async () => {
    if (!pjSelecionado) return;
    setAccepting(true);
    setError(null);
    const c = codigo.trim().toUpperCase();
    const { data, error: err } = await supabaseClient.rpc('aceitar_convite', {
      p_codigo: c,
      p_personagem_id: pjSelecionado,
    });
    setAccepting(false);
    if (err) { console.error('[convites] aceitar falhou:', err); setError(err.message); return; }
    if (!data?.ok) {
      setError(motivoLabel(data?.motivo));
      if (['codigo_invalido', 'convite_expirado', 'convite_ja_usado', 'convite_revogado'].includes(data?.motivo)) {
        setStep('input');
      }
      return;
    }
    const pj = meusPjs.find((p) => p.id === pjSelecionado);
    setSuccess({
      historia_titulo: data.historia_titulo,
      pj_nome: pj ? `${pj.nome}${pj.sobrenome ? ' ' + pj.sobrenome : ''}` : '',
    });
    setStep('success');
    setCodigo('');
    setPjSelecionado(null);
    onAccepted?.(); // notifica AventurasJogador para recarregar
  };

  const novoConvite = () => { setStep('input'); setSuccess(null); setError(null); };

  // ── Sucesso
  if (step === 'success' && success) {
    return (
      <ModalShell
        title={tc.jogador.conviteAceito}
        lang={lang}
        onClose={onClose}
        onConfirm={onClose}
        confirmLabel={lang === 'en' ? 'Done' : 'Concluir'}
      >
        <div className="cv-success">
          <div className="cv-success-icon">✦</div>
          <p>
            {/* TODO-INTERPOLATE — destaque em <strong> removido por decisão do time (texto plano) */}
            {interpolate(tc.jogador.sucesso, { pjNome: success.pj_nome, historiaTitulo: success.historia_titulo })}
          </p>
          <button className="btn-ghost btn-md" onClick={novoConvite} style={{ marginBottom: 8 }}>
            {tc.jogador.aceitarOutro}
          </button>
        </div>
      </ModalShell>
    );
  }

  // ── Escolher PJ
  if (step === 'escolher_pj') {
    return (
      <ModalShell
        title={lang === 'en' ? 'Choose your character' : 'Escolher personagem'}
        lang={lang}
        onClose={onClose}
        onCancel={() => setStep('input')}
        cancelLabel={tc.jogador.voltar}
        onConfirm={aceitar}
        confirmLabel={accepting ? tc.jogador.aceitando : tc.jogador.aceitarConvite}
        confirmDisabled={!pjSelecionado || accepting}
      >
        <p className="cv-instr" style={{ marginBottom: 16 }}>
          {/* TODO-INTERPOLATE */}
          {interpolate(tc.jogador.escolherPj, { codigo })}
        </p>
        <div className="cv-pj-grid">
          {meusPjs.map((p) => {
            const selected = pjSelecionado === p.id;
            return (
              <button
                key={p.id}
                className={'cv-pj-card' + (selected ? ' selected' : '')}
                onClick={() => setPjSelecionado(p.id)}
              >
                <div className="cv-pj-nome">{p.nome}{p.sobrenome ? ' ' + p.sobrenome : ''}</div>
                <div className="cv-pj-meta">{p.raca} · {p.profissao}</div>
              </button>
            );
          })}
        </div>
        {error && <div className="cv-err" style={{ marginTop: 12 }}>{error}</div>}
      </ModalShell>
    );
  }

  // ── Input (step inicial)
  return (
    <ModalShell
      title={lang === 'en' ? 'Enter invite code' : 'Inserir código de convite'}
      lang={lang}
      onClose={onClose}
      onCancel={onClose}
      cancelLabel={lang === 'en' ? 'Cancel' : 'Cancelar'}
      onConfirm={validar}
      confirmLabel={tc.jogador.continuar}
    >
      <p className="cv-sub" style={{ marginBottom: 16 }}>
        {tc.jogador.instrucao}
      </p>
      <div className="cv-input-row" style={{ marginBottom: 4 }}>
        <input
          type="text"
          className="cv-input"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="MEN-XXXXXX"
          maxLength={20}
          autoComplete="off"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); validar(); } }}
        />
      </div>
      {error && <div className="cv-err" style={{ marginTop: 12 }}>{error}</div>}
    </ModalShell>
  );
}

/* ============================== [26b] AventurasJogador — Tela de aventuras vividas pelo jogador ==============================
   Exibe todas as mesas do jogador com os capítulos da história e o personagem vinculado.
   É a aba "Aventuras" no console — separada do fluxo de aceite de convite.
   Props: t, lang, currentUserId, reloadToken (número que muda quando um convite é aceito,
          forçando o recarregamento da lista).
*/
function AventurasJogador({ t, lang, currentUserId, reloadToken, mesaAtivaId = null, pjAtivoId = null }) {
  const [mesas, setMesas] = useState(null); // null = carregando; [] = vazio; [...] = lista

  const carregarMesas = async () => {
    setMesas(null);
    const { data, error: err } = await supabaseClient.rpc('listar_minhas_mesas');
    if (err) { console.error('[mesas] carga falhou:', err); setMesas([]); return; }
    setMesas(Array.isArray(data) ? data : (data ? JSON.parse(data) : []));
  };

  useEffect(() => {
    carregarMesas();
    /* eslint-disable-next-line */
  }, [currentUserId, reloadToken]);

  // ── Carregando
  if (mesas === null) {
    return (
      <div className="menestrel-ui" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 10, color: 'var(--tinta-2)' }}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ animation: 'spin 1s linear infinite' }}>
          <path d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round" />
        </svg>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 'var(--fs-md)' }}>
          {lang === 'en' ? 'Loading adventures…' : 'Carregando aventuras…'}
        </span>
      </div>
    );
  }

  // ── Sem mesas
  if (mesas.length === 0) {
    return (
      <div className="menestrel-ui" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '64px 24px', minHeight: 260, gap: 14 }}>
        <div style={{ fontSize: 40, color: 'var(--vivo)', lineHeight: 1 }}>✦</div>
        <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 'var(--fs-base)', color: 'var(--tinta-2)', lineHeight: 1.6, maxWidth: 400 }}>
          {lang === 'en'
            ? 'No adventures yet. Accept an invite using the Invites button in the menu.'
            : 'Nenhuma aventura ainda. Aceite um convite pelo botão Convites no menu.'}
        </p>
      </div>
    );
  }

  /* A MESA DO JOGADOR NO PADRÃO NOVO (23/10/2026): os cartões de capítulos da
     Cena do Mestre, só de leitura, com as anotações de cada personagem. */
  const Cena = window.CenaCronica;
  if (Cena) {
    const m = mesas.find((x) => x.id === mesaAtivaId) || mesas[0];
    const pjs = m.meus_pjs || [];
    const pj = pjs.find((p) => pjAtivoId != null && p.id === pjAtivoId) || pjs[0] || null;
    return (
      <div className="hist">
        <Cena key={m.id} h={m} lang={lang} somenteLeitura anotar userId={currentUserId}
          pjId={pj ? pj.id : null} autor={pj ? [pj.nome, pj.sobrenome].filter(Boolean).join(' ') : ''} />
      </div>
    );
  }

  // ── Lista de mesas / aventuras (sem a Cena carregada)
  return (
    <div className="menestrel-ui cv-av-page">
      {mesas.map((m) => {
        const pjs = m.meus_pjs || [];
        return (
          <article key={m.id} className="cv-mesa cv-av-card">
            {/* ── Cabeçalho da aventura ── */}
            <div className="cv-mesa-top">
              <span className="cv-mesa-star" aria-hidden="true">✦</span>
              <span className="cv-mesa-titulo-top">{m.titulo}</span>
              {/* PJ vinculado — pill à direita */}
              {pjs.length > 0 && (
                <div style={{ marginLeft: 'auto', display: 'flex', flexWrap: 'wrap', gap: 6, flexShrink: 0 }}>
                  {pjs.map((pj) => (
                    <span key={pj.id} style={{
                      fontFamily: "var(--font-body)", fontSize: 'var(--fs-xs)', color: '#DCC9A6',
                      background: 'rgba(122,94,42,0.22)', border: '1px solid rgba(var(--bronze-rgb),0.35)',
                      borderRadius: 999, padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}>
                      <i className="ti ti-user" aria-hidden="true" style={{ fontSize: 'var(--fs-2xs)' }} />
                      {pj.nome}{pj.sobrenome ? ' ' + pj.sobrenome : ''}
                      {pj.profissao && <span style={{ color: 'var(--tinta-2)' }}> · {pj.profissao}</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── Corpo: introdução + capítulos ── */}
            <div className="cv-mesa-body">
              {m.introducao && (
                <>
                  <div className="cv-mesa-eyebrow">
                    <i className="ti ti-book" aria-hidden="true" style={{ marginRight: 5, fontSize: 'var(--fs-2xs)' }} />
                    {lang === 'en' ? 'Introduction' : 'Introdução'}
                  </div>
                  <p className="cv-mesa-intro">{m.introducao}</p>
                </>
              )}

              {Array.isArray(m.capitulos) && m.capitulos.length > 0 && (
                <>
                  {m.capitulos.map((cap, i) => {
                    // Formata a data fantasy do capítulo, se existir
                    const dc = cap.data_capitulo;
                    const dataFmt = dc && dc.dia && dc.mes && FANTASY_MONTHS
                      ? (() => {
                          const nomeMes = (FANTASY_MONTHS[dc.mes - 1]?.nome) || '';
                          const diaSemana = typeof calcDiaSemanaFantasy === 'function'
                            ? calcDiaSemanaFantasy(dc.ano, dc.mes, dc.dia)
                            : null;
                          return `${dc.dia} de ${nomeMes}${dc.ano ? `, Ano ${dc.ano}` : ''}${diaSemana ? ` · ${diaSemana}` : ''}`;
                        })()
                      : null;
                    return (
                      <div key={cap.id || i} className="cv-mesa-capitulo">
                        {cap.titulo && (
                          <h4 className="cv-mesa-capitulo-titulo">
                            <span style={{ opacity: 0.5, marginRight: 8, fontSize: 'var(--fs-2xs)', fontFamily: "var(--font-body)", fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                              {lang === 'en' ? `Ch. ${i + 1}` : `Cap. ${i + 1}`}
                            </span>
                            {cap.titulo}
                          </h4>
                        )}
                        {dataFmt && (
                          <div className="cv-mesa-data" style={{ marginBottom: 6 }}>
                            <i className="ti ti-calendar-event" aria-hidden="true" style={{ fontSize: 'var(--fs-2xs)', marginRight: 5, opacity: 0.7 }} />
                            {dataFmt}
                          </div>
                        )}
                        {cap.texto && <p className="cv-mesa-capitulo-texto">{cap.texto}</p>}
                      </div>
                    );
                  })}
                </>
              )}

              {/* Sem capítulos ainda */}
              {(!m.introducao && (!Array.isArray(m.capitulos) || m.capitulos.length === 0)) && (
                <p style={{ fontFamily: "var(--font-body)", fontSize: 'var(--fs-sm)', color: '#A49372', fontStyle: 'italic', margin: 0 }}>
                  {lang === 'en' ? 'The story has not been written yet.' : 'A história ainda não foi narrada.'}
                </p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* ============================== [26c] ConvitesJogador — mantido por compatibilidade (legado) ==============================
   Este componente não é mais usado diretamente no menu lateral. O fluxo foi separado em:
     - ConviteModal   → abre via botão "Convites" na sidebar (modal)
     - AventurasJogador → nova aba "Aventuras" na sidebar (tela completa)
   Mantido apenas para não quebrar imports/exports que outros arquivos possam ter.
*/
function ConvitesJogador({ t, lang, currentUserId }) {
  // Mantido sem mudanças pra compat retroativa.
  // Novo fluxo: usar ConviteModal + AventurasJogador diretamente.
  const [modalAberto, setModalAberto] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  return (
    <div className="menestrel-ui" style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 8 }}>
        <button className="btn-primary btn-md" onClick={() => setModalAberto(true)}>
          <i className="ti ti-mail-plus" aria-hidden="true" style={{ marginRight: 8 }} />
          {lang === 'en' ? 'Accept invite' : 'Aceitar convite'}
        </button>
      </div>
      <AventurasJogador t={t} lang={lang} currentUserId={currentUserId} reloadToken={reloadToken} />
      {modalAberto && (
        <ConviteModal
          t={t} lang={lang} currentUserId={currentUserId}
          onClose={() => setModalAberto(false)}
          onAccepted={() => { setReloadToken((n) => n + 1); }}
        />
      )}
    </div>
  );
}

/* ============================== [27] AceitarConviteModal — aceite rápido (modal) logo após criar um PJ ============================== */
// O PJ já vem definido (o recém-criado), então só pedimos o código. Reusa aceitar_convite.
// Usa o ModalShell (moldura compartilhada migrada) pra herdar a pele dos modais.
function AceitarConviteModal({ pj, t, lang, onClose, onAccepted }) {
  const tc = t.convites;

  const [codigo, setCodigo] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null); // { historia_titulo }

  // Escape e travamento de scroll já são responsabilidade do ModalShell — não duplicar aqui.

  const motivoLabel = (m) => tc.motivo[m] || m;

  const nomePj = `${pj.nome}${pj.sobrenome ? ' ' + pj.sobrenome : ''}`;

  const aceitar = async () => {
    const c = (codigo || '').trim().toUpperCase();
    if (!c) {
      setError(tc.jogador.digiteCodigoPrimeiro);
      return;
    }
    setAccepting(true);
    setError(null);
    const { data, error: err } = await supabaseClient.rpc('aceitar_convite', {
      p_codigo: c,
      p_personagem_id: pj.id,
    });
    setAccepting(false);
    if (err) {
      console.error('[convites] aceitar falhou:', err);
      setError(err.message);
      return;
    }
    if (!data?.ok) {
      setError(motivoLabel(data?.motivo));
      return;
    }
    setDone({ historia_titulo: data.historia_titulo });
    onAccepted?.();
  };

  // Sucesso
  if (done) {
    return (
      <ModalShell
        title={tc.jogador.conviteAceito}
        lang={lang}
        onClose={onClose}
        onConfirm={onClose}
        confirmLabel={tc.aceitarModal.concluir}>
        <div className="cv-success">
          <div className="cv-success-icon">✦</div>
          <p>
            {/* TODO-INTERPOLATE — destaque em <strong> removido por decisão do time (texto plano) */}
            {interpolate(tc.jogador.sucesso, { pjNome: nomePj, historiaTitulo: done.historia_titulo })}
          </p>
        </div>
      </ModalShell>
    );
  }

  // Formulário
  return (
    <ModalShell
      title={tc.aceitarModal.entrarMesa}
      lang={lang}
      onClose={onClose}
      onCancel={onClose}
      cancelLabel={tc.aceitarModal.depois}
      onConfirm={aceitar}
      confirmLabel={accepting ? tc.jogador.aceitando : tc.jogador.aceitarConvite}
      confirmDisabled={accepting}>
      <p className="cv-sub" style={{ marginBottom: 14 }}>
        {/* TODO-INTERPOLATE — destaque em <strong style={{color: gold}}> removido por decisão do time (texto plano) */}
        {interpolate(tc.aceitarModal.convitePrompt, { nomePj })}
      </p>
      <input
        type="text"
        className="cv-input"
        style={{ width: '100%', textAlign: 'left', letterSpacing: '.08em' }}
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.toUpperCase())}
        placeholder="MEN-XXXXXX"
        maxLength={20}
        autoComplete="off"
        autoFocus
      />
      {error && <div className="cv-err" style={{ marginTop: 12 }}>{error}</div>}
    </ModalShell>
  );
}

Object.assign(window, {
  ConvitesHistoriaView, ConvitesJogador, ConviteModal, AventurasJogador, AceitarConviteModal,
});
