/* ============================================================
   CONVITES — Convites de história (Mestre + Jogador)
   ============================================================
   Tema único: convites de uma história / mesa de RPG.

   - ConvitesHistoriaModal  — modal do Mestre pra gerenciar convites
                              de UMA história. Aberto pelo card de
                              história. Gera/revoga códigos.
   - ConvitesJogador        — aba inteira do console do Jogador.
                              Aceita convites por código + lista mesas.
   - AceitarConviteModal    — aceite rápido pós-criação de um PJ.

   MIGRADO pro tema "Pedra & Bronze" (paleta oficial atual):
   - Visual nos tokens Pedra & Bronze (inline + <style> escopado .cv-*).
   - Retint jun/2026: a 1ª migração saiu no tema antigo "Grimório do dragão"
     (púrpura/ouro-vivo); agora alinhado ao bronze/pedra de index.css/shell.
   - Cores semânticas de status preservadas: verde = ativo/sucesso, vermelho
     = revogado/erro; azul de "usado" passou pro gelo da paleta.
   - Tabela de convites do Mestre usa UI.Table + UI.Badge (kit shadcn via ui-bridge).
   - AceitarConviteModal usa o ModalShell (moldura compartilhada já migrada).
   - Lógica 100% preservada: RPCs (listar/gerar/revogar/aceitar/listar_minhas_mesas),
     estados, handlers, labels de erro, escape/overflow, JSON.parse de fallback.

   Depende de: React (global), supabaseClient, FANTASY_MONTHS, UI (ui-bridge),
   ModalShell (10-shell). useState/useEffect globais.
   ============================================================ */

const CONV_CSS = `
  /* ---- tela do Jogador ---- */
  .cv-jog { font-family:'Plus Jakarta Sans', system-ui, sans-serif; color:#E8DDC6; display:grid; grid-template-columns:1fr 1fr; gap:32px; align-items:stretch; }
  .cv-jog > section { display:flex; flex-direction:column; }
  .cv-jog > section .cv-card { flex:1; }
  .cv-jog > section .cv-mesas-grid { flex:1; }
  .cv-jog > section .cv-mesa { height:100%; }
  @media (max-width:720px) { .cv-jog { grid-template-columns:1fr; } }
  .cv-sechead { margin-bottom:16px; }
  .cv-eyebrow { display:inline-block; font-size:12px; font-weight:600; letter-spacing:.18em; text-transform:uppercase; color:#C9A44E; margin-bottom:8px; }
  .cv-title { font-family:'Cinzel', serif; font-weight:700; font-size:clamp(22px,3vw,28px); color:#E8DDC6; margin:0; letter-spacing:.3px; }
  .cv-card { position:relative; overflow:hidden; background:linear-gradient(180deg, rgba(34,29,21,0.55), rgba(24,19,8,0.55)); border:1px solid rgba(106,85,48,0.26); border-radius:6px; padding:clamp(20px,3vw,28px); }
  .cv-card::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,#C9A44E,#B8702E,transparent); opacity:.6; }
  .cv-form-title { font-family:'Cinzel', serif; font-weight:700; font-size:18px; margin:0 0 6px; color:#E8DDC6; }
  .cv-sub { font-size:14px; color:#9C8F73; line-height:1.55; margin:0 0 16px; }
  .cv-input-row { display:flex; gap:10px; flex-wrap:wrap; }
  .cv-input { flex:1; min-width:200px; height:46px; background:rgba(16,11,5,0.4); border:1px solid rgba(106,85,48,0.35); border-radius:12px; color:#E8DDC6; font-family:ui-monospace, monospace; font-size:16px; letter-spacing:.12em; text-transform:uppercase; padding:0 16px; text-align:center; transition:border-color .15s ease; }
  .cv-input:focus { outline:none; border-color:rgba(201,164,78,0.55); }
  .cv-input::placeholder { color:#6E6147; letter-spacing:.12em; }
  .cv-instr { font-size:14px; color:#C7B79A; margin:0 0 14px; }
  .cv-pj-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:10px; }
  .cv-pj-card { text-align:left; padding:14px 16px; border-radius:14px; cursor:pointer; background:rgba(106,85,48,0.10); border:1px solid rgba(106,85,48,0.28); transition:all .15s ease; }
  .cv-pj-card:hover { border-color:rgba(201,164,78,0.40); background:rgba(106,85,48,0.18); }
  .cv-pj-card.selected { border-color:#C9A44E; background:rgba(201,164,78,0.10); box-shadow:0 0 0 1px rgba(201,164,78,0.40) inset; }
  .cv-pj-nome { font-weight:700; font-size:15px; color:#E8DDC6; margin-bottom:3px; }
  .cv-pj-meta { font-size:12.5px; color:#9C8F73; }
  .cv-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:16px; }
  .cv-success { text-align:center; padding:12px 0; }
  .cv-success-icon { font-size:40px; color:#C9A44E; line-height:1; margin-bottom:10px; }
  .cv-success h3 { font-family:'Cinzel', serif; font-weight:700; font-size:20px; color:#E8DDC6; margin:0 0 8px; }
  .cv-success p { font-size:14px; color:#C7B79A; line-height:1.6; margin:0 auto 18px; max-width:420px; }
  .cv-success strong { color:#C9A44E; }
  .cv-count { font-size:13px; color:#7E7258; margin-top:6px; }
  .cv-mesas-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px; }
  .cv-mesa { position:relative; overflow:hidden; border:1px solid rgba(106,85,48,0.26); border-radius:6px; background:linear-gradient(180deg, rgba(34,29,21,0.55), rgba(24,19,8,0.60)); }
  .cv-mesa::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,#C9A44E,#B8702E,transparent); opacity:.6; z-index:1; }
  .cv-mesa-top { display:flex; align-items:center; gap:8px; padding:12px 18px; border-bottom:1px solid rgba(106,85,48,0.20); background:rgba(16,11,5,0.25); }
  .cv-mesa-star { color:#C9A44E; }
  .cv-mesa-data { font-size:12.5px; color:#9C8F73; }
  .cv-mesa-data--tba { font-style:italic; opacity:.8; }
  .cv-mesa-body { padding:16px 18px; }
  .cv-mesa-titulo { font-family:'Cinzel', serif; font-weight:700; font-size:18px; color:#E8DDC6; margin:0 0 8px; }
  .cv-mesa-intro { font-size:13px; color:#9C8F73; line-height:1.55; margin:0 0 12px; }
  .cv-mesa-eyebrow { font-size:11px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:#7E7258; margin-bottom:8px; }
  .cv-mesa-sep { display:flex; align-items:center; gap:8px; margin:12px 0; }
  .cv-mesa-sep .l { flex:1; height:1px; background:rgba(106,85,48,0.30); }
  .cv-mesa-sep .d { font-size:10px; color:#7A5E2A; }
  .cv-mesa-pjs { display:flex; flex-wrap:wrap; gap:6px; }
  .cv-mesa-pj { font-size:13px; font-weight:400; color:#DCC9A6; background:rgba(122,94,42,0.22); border:1px solid rgba(106,85,48,0.35); border-radius:999px; padding:4px 12px; }

  /* .cv-btn/.cv-btn-ghost migraram para .btn-primary/.btn-ghost (index.css) —
     padronização geral do sistema de botões do projeto. */
  .cv-err { color:#F0A6A0; background:rgba(200,33,44,0.10); border:1px solid rgba(200,33,44,0.40); border-radius:6px; padding:10px 14px; font-size:13px; }

  /* ---- modal do Mestre: zonas + tabela + chip + form ---- */
  .cv-mng-body { flex:1; overflow-y:auto; }
  .cv-mng-empty, .cv-mng-loading { text-align:center; color:#9C8F73; padding:32px 12px; font-size:14px; }
  .cv-table-wrap { border:1px solid rgba(106,85,48,0.28); border-radius:14px; overflow:hidden; }
  .cv-table-wrap table { width:100%; border-collapse:collapse; font-size:13px; }
  .cv-table-wrap thead th { background:#2C2417; color:#9C8F73; font-weight:600; font-size:11px; letter-spacing:.04em; text-transform:uppercase; text-align:left; padding:10px 12px; white-space:nowrap; border-bottom:1px solid rgba(106,85,48,0.30); height:auto; }
  .cv-table-wrap tbody td { padding:10px 12px; text-align:left; color:#C7B79A; border-bottom:1px solid rgba(232,221,198,0.06); vertical-align:middle; }
  .cv-table-wrap tbody tr:last-child td { border-bottom:none; }
  .cv-chip { display:inline-flex; align-items:center; gap:8px; font-family:ui-monospace, monospace; font-size:13px; font-weight:700; letter-spacing:.06em; color:#C9A44E; background:rgba(201,164,78,0.10); border:1px solid rgba(201,164,78,0.28); border-radius:8px; padding:5px 10px; cursor:pointer; transition:all .15s ease; }
  .cv-chip:hover:not(:disabled) { background:rgba(201,164,78,0.18); }
  .cv-chip:disabled { color:#7E7258; background:rgba(232,221,198,0.04); border-color:rgba(232,221,198,0.10); cursor:default; }
  .cv-copiado { font-family:'Plus Jakarta Sans', system-ui, sans-serif; font-size:10px; font-weight:600; color:#7BE0A0; letter-spacing:.02em; }
  .cv-pj-arrow { font-size:12px; color:#9C8F73; margin-top:2px; }
  .cv-gen-input { height:40px; min-width:180px; background:rgba(16,11,5,0.40); border:1px solid rgba(106,85,48,0.35); border-radius:10px; color:#E8DDC6; font-family:inherit; font-size:13.5px; padding:0 14px; transition:border-color .15s ease; }
  .cv-gen-input:focus { outline:none; border-color:rgba(201,164,78,0.50); }
  .cv-gen-input::placeholder { color:#6E6147; }
`;

const cvStatusBadge = (s) => {
  const map = {
    ativo:    { background: 'rgba(123,224,160,0.16)', color: '#7BE0A0', border: '1px solid rgba(123,224,160,0.40)', fontWeight: 600 },
    usado:    { background: 'rgba(110,138,166,0.18)',  color: '#9DB6CE', border: '1px solid rgba(110,138,166,0.40)',  fontWeight: 600 },
    revogado: { background: 'rgba(200,33,44,0.16)',   color: '#F0A6A0', border: '1px solid rgba(200,33,44,0.40)',   fontWeight: 600 },
    expirado: { background: 'rgba(232,221,198,0.08)', color: '#9C8F73', border: '1px solid rgba(232,221,198,0.16)', fontWeight: 600 },
  };
  return map[s] || map.expirado;
};

/* ============================== [25] ConvitesHistoriaModal — Mestre gerencia convites de uma história ============================== */
function ConvitesHistoriaModal({ historia, lang, onClose, onChanged }) {
  const { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } = (typeof UI !== 'undefined' ? UI : {});

  const [convites, setConvites] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [obs, setObs] = useState('');
  const [copiouId, setCopiouId] = useState(null);

  // Escape e travamento de scroll já são responsabilidade do ModalShell — não duplicar aqui.

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
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [historia.id]);

  const gerarConvite = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabaseClient.rpc('gerar_convite_historia', {
      p_historia_id: historia.id,
      p_observacao: obs.trim() || null,
      p_dias_validade: 7,
    });
    setLoading(false);
    if (err) {
      console.error('[convites] gerar falhou:', err);
      setError(err.message);
      return;
    }
    if (!data?.ok) {
      setError(lang === 'en'
        ? `Failed: ${data?.motivo || 'unknown'}`
        : `Falhou: ${data?.motivo || 'desconhecido'}`);
      return;
    }
    setObs('');
    await carregar();
  };

  const revogarConvite = async (conviteId) => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabaseClient.rpc('revogar_convite', {
      p_convite_id: conviteId,
    });
    setLoading(false);
    if (err) {
      console.error('[convites] revogar falhou:', err);
      setError(err.message);
      return;
    }
    if (!data?.ok) {
      setError(lang === 'en' ? `Failed: ${data?.motivo}` : `Falhou: ${data?.motivo}`);
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

  const statusLabel = (s) => {
    const labels = {
      pt: { ativo: 'Ativo', usado: 'Usado', revogado: 'Revogado', expirado: 'Expirado' },
      en: { ativo: 'Active', usado: 'Used', revogado: 'Revoked', expirado: 'Expired' },
    };
    return (labels[lang] || labels.pt)[s] || s;
  };

  const fmtData = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  return (
    <ModalShell
      title={lang === 'en' ? 'Manage invites' : 'Gerenciar convites'}
      lang={lang}
      size="lg"
      onClose={onClose}
      onCancel={() => { onChanged?.(); onClose(); }}
      cancelLabel={lang === 'en' ? 'Close' : 'Fechar'}
    >
      <style>{CONV_CSS}</style>

      <p style={{ margin: '0 0 16px', fontSize: 13.5, color: '#9C8F73', lineHeight: 1.5 }}>
        {lang === 'en'
          ? `Generate codes to invite players to the adventure "${historia.titulo}".`
          : `Gere códigos para convidar jogadores para a aventura "${historia.titulo}".`}
      </p>

      {/* Gerar novo convite */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
        <input className="cv-gen-input" type="text" value={obs} onChange={(e) => setObs(e.target.value)} placeholder={lang === 'en' ? 'Message' : 'Mensagem'} maxLength={60} style={{ flex: '1 1 180px' }} />
        <button className="btn-primary btn-md" onClick={gerarConvite} disabled={loading}>
          {loading ? (lang === 'en' ? 'Generating…' : 'Gerando…') : (lang === 'en' ? 'New invite' : 'Gerar convite')}
        </button>
      </div>

      {error && <div className="cv-err" style={{ marginBottom: 12 }}>{error}</div>}

      {convites === null ? (
        <div className="cv-mng-loading">{lang === 'en' ? 'Loading…' : 'Carregando…'}</div>
      ) : convites.length === 0 ? (
        <div className="cv-mng-empty">{lang === 'en' ? "You haven't generated any invitations yet." : 'Você ainda não gerou nenhum convite.'}</div>
      ) : !Table ? (
        <div className="cv-mng-empty">{lang === 'en' ? 'UI kit not loaded (ui-bridge).' : 'Kit de UI não carregado (ui-bridge).'}</div>
      ) : (
        <div className="cv-table-wrap">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{lang === 'en' ? 'Code' : 'Código'}</TableHead>
              <TableHead>{lang === 'en' ? 'Note' : 'Observação'}</TableHead>
              <TableHead>{lang === 'en' ? 'Status' : 'Status'}</TableHead>
              <TableHead>{lang === 'en' ? 'Expires' : 'Expira'}</TableHead>
              <TableHead>{lang === 'en' ? 'Used by' : 'Aceito por'}</TableHead>
              <TableHead>{lang === 'en' ? 'Action' : 'Ação'}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {convites.map((c) => {
                const s = c.status_real || c.status;
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <button
                        className="cv-chip"
                        onClick={() => copiarCodigo(c.id, c.codigo)}
                        disabled={s !== 'ativo'}
                        title={s === 'ativo' ? (lang === 'en' ? 'Copy' : 'Copiar') : ''}>
                        <span>{c.codigo}</span>
                        {copiouId === c.id && <span className="cv-copiado">{lang === 'en' ? 'Copied' : 'Copiado'}</span>}
                      </button>
                    </TableCell>
                    <TableCell>{c.observacao || '—'}</TableCell>
                    <TableCell><Badge style={cvStatusBadge(s)}>{statusLabel(s)}</Badge></TableCell>
                    <TableCell style={{ whiteSpace: 'nowrap' }}>{fmtData(c.expira_em)}</TableCell>
                    <TableCell>
                      {c.usado_por ? (
                        <div>
                          <div>{c.usado_por_nome || c.usado_por.slice(0, 8)}</div>
                          {c.personagem_nome && <div className="cv-pj-arrow">→ {c.personagem_nome}</div>}
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {s === 'ativo' && (
                        <button className="btn-danger btn-sm" onClick={() => revogarConvite(c.id)} disabled={loading}>
                          {lang === 'en' ? 'Revoke' : 'Revogar'}
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </ModalShell>
  );
}

/* ============================== [26] ConvitesJogador — Jogador aceita convites e vê suas mesas ============================== */
function ConvitesJogador({ lang, currentUserId }) {
  const [codigo, setCodigo] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null); // { historia_titulo, pj_nome }
  const [meusPjs, setMeusPjs] = useState([]);
  const [pjSelecionado, setPjSelecionado] = useState(null);
  const [step, setStep] = useState('input'); // input | escolher_pj | success
  const [mesas, setMesas] = useState(null);

  const carregarMesas = async () => {
    const { data, error: err } = await supabaseClient.rpc('listar_minhas_mesas');
    if (err) {
      console.error('[mesas] carga falhou:', err);
      setMesas([]);
      return;
    }
    setMesas(Array.isArray(data) ? data : (data ? JSON.parse(data) : []));
  };

  useEffect(() => {
    carregarMesas();
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

  const motivoLabel = (m) => {
    const labels = {
      pt: {
        codigo_invalido:    'Código inválido',
        convite_expirado:   'Convite expirado',
        convite_ja_usado:   'Convite já foi usado',
        convite_revogado:   'Convite foi revogado pelo Mestre',
        pj_nao_pertence:    'Esse personagem não é seu',
        pj_nao_encontrado:  'Personagem não encontrado',
        pj_ja_vinculado:    'Esse personagem já está nessa mesa',
        nao_autenticado:    'Sessão expirada — faça login de novo',
      },
      en: {
        codigo_invalido:    'Invalid code',
        convite_expirado:   'Invite expired',
        convite_ja_usado:   'Invite already used',
        convite_revogado:   'Invite was revoked by the Master',
        pj_nao_pertence:    'That character is not yours',
        pj_nao_encontrado:  'Character not found',
        pj_ja_vinculado:    'That character is already in this table',
        nao_autenticado:    'Session expired — sign in again',
      },
    };
    return (labels[lang] || labels.pt)[m] || m;
  };

  const validar = () => {
    const c = (codigo || '').trim().toUpperCase();
    if (!c) {
      setError(lang === 'en' ? 'Enter a code first' : 'Digite um código primeiro');
      return;
    }
    if (meusPjs.length === 0) {
      setError(lang === 'en'
        ? 'You haven\'t created a character yet — you need to create one before accepting the invitation'
        : 'Você ainda não criou um personagem — é necessário criar um antes de aceitar o convite');
      return;
    }
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
    if (err) {
      console.error('[convites] aceitar falhou:', err);
      setError(err.message);
      return;
    }
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
    await carregarMesas();
  };

  const novoConvite = () => {
    setStep('input');
    setSuccess(null);
    setError(null);
  };

  return (
    <div className="menestrel-ui cv-jog">
      <style>{CONV_CSS}</style>

      {/* ====== Coluna esquerda: Aceitar convite ====== */}
      <section>

        <div className="cv-card">
          {step === 'input' && (
            <div>
              <p className="cv-sub">
                {lang === 'en'
                  ? 'Paste below the code your Game Master shared with you.'
                  : 'Cole abaixo o código que o Mestre do Jogo compartilhou com você.'}
              </p>
              <div className="cv-input-row">
                <input
                  type="text"
                  className="cv-input"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="MEN-XXXXXX"
                  maxLength={20}
                  autoComplete="off"
                />
                <button className="btn-primary btn-md" onClick={validar}>{lang === 'en' ? 'Continue' : 'Continuar'}</button>
              </div>
            </div>
          )}

          {step === 'escolher_pj' && (
            <div>
              <p className="cv-instr">
                {lang === 'en'
                  ? `Code: ${codigo}. Choose which character to link to this story:`
                  : `Código: ${codigo}. Escolha qual personagem você quer vincular a essa história:`}
              </p>
              <div className="cv-pj-grid">
                {meusPjs.map((p) => {
                  const selected = pjSelecionado === p.id;
                  return (
                    <button
                      key={p.id}
                      className={'cv-pj-card' + (selected ? ' selected' : '')}
                      onClick={() => setPjSelecionado(p.id)}>
                      <div className="cv-pj-nome">{p.nome}{p.sobrenome ? ' ' + p.sobrenome : ''}</div>
                      <div className="cv-pj-meta">{p.raca} · {p.profissao}</div>
                    </button>
                  );
                })}
              </div>
              <div className="cv-actions">
                <button className="btn-ghost btn-md" onClick={() => setStep('input')} disabled={accepting}>
                  {lang === 'en' ? 'Back' : 'Voltar'}
                </button>
                <button className="btn-primary btn-md" onClick={aceitar} disabled={!pjSelecionado || accepting}>
                  {accepting ? (lang === 'en' ? 'Accepting…' : 'Aceitando…') : (lang === 'en' ? 'Accept invite' : 'Aceitar convite')}
                </button>
              </div>
            </div>
          )}

          {step === 'success' && success && (
            <div className="cv-success">
              <div className="cv-success-icon">✦</div>
              <h3>{lang === 'en' ? 'Invite accepted!' : 'Convite aceito!'}</h3>
              <p>
                {lang === 'en'
                  ? <>Your character <strong>{success.pj_nome}</strong> is now part of <strong>{success.historia_titulo}</strong>.</>
                  : <>Seu personagem <strong>{success.pj_nome}</strong> agora faz parte de <strong>{success.historia_titulo}</strong>.</>}
              </p>
              <button className="btn-primary btn-md" onClick={novoConvite}>{lang === 'en' ? 'Accept another' : 'Aceitar outro'}</button>
            </div>
          )}

          {error && <div className="cv-err" style={{ marginTop: 12 }}>{error}</div>}
        </div>
      </section>

      {/* ====== Coluna direita: Minhas aventuras (só exibe se houver mesas) ====== */}
      {mesas === null ? null : mesas.length > 0 ? (
        <section>

          <div className="cv-mesas-grid">
            {mesas.map((m) => {
              const pjs = m.meus_pjs || [];
              return (
                <article key={m.id} className="cv-mesa">
                  <div className="cv-mesa-top">
                    <span className="cv-mesa-star" aria-hidden="true">✦</span>
                    {m.data_jogo ? (
                      <span className="cv-mesa-data">
                        {(() => {
                          const dj = m.data_jogo;
                          const nomeMes = FANTASY_MONTHS[dj.mes - 1]?.nome || '';
                          return `${dj.dia} do ${nomeMes}, de ${dj.ano}.`;
                        })()}
                      </span>
                    ) : (
                      <span className="cv-mesa-data cv-mesa-data--tba">{lang === 'en' ? 'Date to be set' : 'Data a definir'}</span>
                    )}
                  </div>
                  <div className="cv-mesa-body">
                    <h3 className="cv-mesa-titulo">{m.titulo}</h3>
                    {m.introducao && <p className="cv-mesa-intro">{m.introducao}</p>}
                    {pjs.length > 0 && (
                      <>
                        <div className="cv-mesa-pjs">
                          {pjs.map((p) => (
                            <span key={p.id} className="cv-mesa-pj">{p.nome}{p.sobrenome ? ' ' + p.sobrenome : ''}</span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/* ============================== [27] AceitarConviteModal — aceite rápido (modal) logo após criar um PJ ============================== */
// O PJ já vem definido (o recém-criado), então só pedimos o código. Reusa aceitar_convite.
// Usa o ModalShell (moldura compartilhada migrada) pra herdar a pele dos modais.
function AceitarConviteModal({ pj, lang, onClose, onAccepted }) {
  const [codigo, setCodigo] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null); // { historia_titulo }

  // Escape e travamento de scroll já são responsabilidade do ModalShell — não duplicar aqui.

  const motivoLabel = (m) => {
    const labels = {
      pt: {
        codigo_invalido:   'Código inválido',
        convite_expirado:  'Convite expirado',
        convite_ja_usado:  'Convite já foi usado',
        convite_revogado:  'Convite foi revogado pelo Mestre',
        pj_nao_pertence:   'Esse personagem não é seu',
        pj_nao_encontrado: 'Personagem não encontrado',
        pj_ja_vinculado:   'Esse personagem já está nessa mesa',
        nao_autenticado:   'Sessão expirada — faça login de novo',
      },
      en: {
        codigo_invalido:   'Invalid code',
        convite_expirado:  'Invite expired',
        convite_ja_usado:  'Invite already used',
        convite_revogado:  'Invite was revoked by the Master',
        pj_nao_pertence:   'That character is not yours',
        pj_nao_encontrado: 'Character not found',
        pj_ja_vinculado:   'That character is already in this table',
        nao_autenticado:   'Session expired — sign in again',
      },
    };
    return (labels[lang] || labels.pt)[m] || m;
  };

  const nomePj = `${pj.nome}${pj.sobrenome ? ' ' + pj.sobrenome : ''}`;

  const aceitar = async () => {
    const c = (codigo || '').trim().toUpperCase();
    if (!c) {
      setError(lang === 'en' ? 'Enter a code first' : 'Digite um código primeiro');
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
        title={lang === 'en' ? 'Invite accepted!' : 'Convite aceito!'}
        lang={lang}
        onClose={onClose}
        onConfirm={onClose}
        confirmLabel={lang === 'en' ? 'Done' : 'Concluir'}>
        <style>{CONV_CSS}</style>
        <div className="cv-success">
          <div className="cv-success-icon">✦</div>
          <p>
            {lang === 'en'
              ? <>Your character <strong>{nomePj}</strong> is now part of <strong>{done.historia_titulo}</strong>.</>
              : <>Seu personagem <strong>{nomePj}</strong> agora faz parte de <strong>{done.historia_titulo}</strong>.</>}
          </p>
        </div>
      </ModalShell>
    );
  }

  // Formulário
  return (
    <ModalShell
      title={lang === 'en' ? 'Join a table' : 'Entrar em uma mesa'}
      lang={lang}
      onClose={onClose}
      onCancel={onClose}
      cancelLabel={lang === 'en' ? 'Later' : 'Depois'}
      onConfirm={aceitar}
      confirmLabel={accepting ? (lang === 'en' ? 'Accepting…' : 'Aceitando…') : (lang === 'en' ? 'Accept invite' : 'Aceitar convite')}
      confirmDisabled={accepting}>
      <style>{CONV_CSS}</style>
      <p className="cv-sub" style={{ marginBottom: 14 }}>
        {lang === 'en'
          ? <>Got an invite code from a Game Master? Use it to bring <strong style={{ color: '#C9A44E' }}>{nomePj}</strong> into a story.</>
          : <>Recebeu um código de convite de um Mestre? Use-o para levar <strong style={{ color: '#C9A44E' }}>{nomePj}</strong> para uma história.</>}
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
  ConvitesHistoriaModal, ConvitesJogador, AceitarConviteModal,
});
