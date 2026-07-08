/* ============================================================
   AUTH — UI de autenticação: Google, Apple, E-mail+Senha
   ============================================================
   Componentes exportados:
   - GoogleIcon          — ícone oficial Google (4 cores)
   - AppleIcon           — ícone Apple monocromático (branco)
   - SignupModal         — modal principal com 3 métodos:
                           Google (OAuth) | Apple (OAuth) | E-mail+Senha
                           Subestados do modal:
                           · 'choice'      — tela inicial (botões OAuth + form)
                           · 'emailForm'   — formulário email/senha visível
                           · 'redirecting' — aguardando redirect OAuth
                           · 'forgotSent'  — confirmação de reset enviado
   - PlanoEscolhaModal   — onboarding pós-primeiro-login (sem mudanças)

   INSTRUÇÕES PARA ATIVAR APPLE SIGN IN NO SUPABASE
   ─────────────────────────────────────────────────
   1. Crie um App ID no Apple Developer Portal
      (developer.apple.com → Certificates → Identifiers → App IDs)
      Marque "Sign In with Apple" nas Capabilities.

   2. Crie um Services ID (mesmo portal, tipo: Services)
      - Primary App ID: o criado no passo 1
      - Domains: seu domínio de produção (ex.: menestrel.app)
      - Return URLs: https://<project>.supabase.co/auth/v1/callback

   3. Gere uma Private Key (.p8) vinculada ao App ID.

   4. No Supabase Dashboard → Authentication → Providers → Apple:
      - Service ID: o Services ID do passo 2
      - Team ID: seu Apple Team ID (10 chars, no canto sup. dir. do portal)
      - Key ID: o ID da chave gerada no passo 3
      - Private Key: conteúdo do arquivo .p8

   5. No Apple Developer Portal → Services ID → Configure:
      adicione window.location.origin + '/auth/v1/callback' como
      Return URL autorizado.

   Enquanto não configurar, o botão Apple aparece desabilitado com
   "Em breve" — basta mudar APPLE_ENABLED = true aqui abaixo quando
   a configuração estiver pronta.
   ============================================================ */

// ─── Flag: Apple configurado no Supabase? ───────────────────────────────────
const APPLE_ENABLED = false; // mude para true após configurar o provider

// ─── Tokens visuais locais (Pedra & Bronze) ─────────────────────────────
// AUTH_GRAD e AUTH_BG migraram para o CSS (.ms-modal.auth-modal, index.css) —
// removidos daqui para não duplicar a fonte de verdade do visual.
const AUTH_GOLD = '#C9A44E';
const AUTH_FD   = "'Cinzel',serif";
const AUTH_FB   = "'Lora',serif";
const AUTH_SURFACE = 'rgba(255,255,255,0.05)';
const AUTH_BORDER  = 'rgba(255,255,255,0.10)';
const AUTH_MUTED   = '#9C8F73';
const AUTH_INK     = '#E8DDC6';

// ─── GoogleIcon ─────────────────────────────────────────────────────────────
const GoogleIcon = (props) => (
  <svg viewBox="0 0 48 48" {...props}>
    <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3c-2 1.6-4.6 2.6-7.4 2.6-5.2 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.3 5.3c-.4.4 6.6-4.9 6.6-14.9 0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

// ─── AppleIcon ───────────────────────────────────────────────────────────────
const AppleIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.2.06 2.02.51 2.73.55.85-.17 1.65-.67 2.79-.72 1.39-.07 2.49.48 3.19 1.37-2.89 1.73-2.4 5.56.21 6.84-.44 1.17-.97 2.32-1.92 4.84zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

// ─── MailIcon (inline — não depende do global Icon.*) ────────────────────────
const MailIcon = ({ style }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

// ─── ChevronLeftIcon (inline — não depende do global Icon.*) ─────────────────
const ChevronLeftIcon = ({ style }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="m15 18-6-6 6-6"/>
  </svg>
);

// ─── SkullIcon (inline — fallback caso Icon.Skull não exista no global) ──────
const SkullIcon = ({ style }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M12 2a8 8 0 0 0-8 8c0 3.1 1.8 5.8 4.4 7.1V20a1 1 0 0 0 1 1h5.2a1 1 0 0 0 1-1v-2.9C18.2 15.8 20 13.1 20 10a8 8 0 0 0-8-8z"/>
    <line x1="9" y1="17" x2="9" y2="21"/><line x1="15" y1="17" x2="15" y2="21"/>
    <circle cx="9.5" cy="10" r="1.5" fill="currentColor"/><circle cx="14.5" cy="10" r="1.5" fill="currentColor"/>
  </svg>
);

// ─── Helpers de estilo reutilizáveis ────────────────────────────────────────
const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 6,
  border: `1px solid ${AUTH_BORDER}`,
  background: AUTH_SURFACE,
  color: AUTH_INK,
  fontFamily: AUTH_FB,
  fontSize: 15,
  outline: 'none',
  transition: 'border-color .15s',
};

const labelStyle = {
  display: 'block',
  fontFamily: AUTH_FB,
  fontSize: 15,
  color: AUTH_MUTED,
  marginBottom: 6,
};

const oauthBtnBase = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  width: '100%',
  padding: '13px 18px',
  borderRadius: 6,
  border: `1px solid ${AUTH_BORDER}`,
  background: AUTH_SURFACE,
  color: AUTH_INK,
  fontFamily: AUTH_FB,
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background .15s, border-color .15s',
};

// ─── SignupModal ─────────────────────────────────────────────────────────────
function SignupModal({ t, lang = 'pt', onClose, authCopy }) {
  const [step, setStep]         = useState('choice');    // choice | emailForm | redirecting | forgotSent
  const [emailMode, setEmailMode] = useState('signup');  // signup | login | forgot
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [focusField, setFocusField] = useState(null);

  // Escape e travamento de scroll já são responsabilidade do ModalShell — não duplicar aqui.

  const resetForm = () => {
    setError(null);
    setEmail('');
    setPassword('');
    setConfirmPwd('');
    setLoading(false);
  };

  // ── OAuth ─────────────────────────────────────────────────────────────────
  const loginOAuth = async (provider) => {
    setError(null);
    setStep('redirecting');
    const { error: err } = await supabaseClient.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin }
    });
    if (err) {
      console.error(`[auth] signInWithOAuth(${provider}) falhou:`, err);
      setError(err.message);
      setStep('choice');
    }
  };

  const translateError = (msg) => {
    if (!msg) return msg;
    const m = msg.toLowerCase();
    if (m.includes('invalid format') || m.includes('unable to validate email'))
      return 'E-mail inválido. Verifique o endereço digitado.';
    if (m.includes('already registered') || m.includes('user already exists'))
      return 'Este e-mail já está cadastrado. Tente entrar.';
    if (m.includes('invalid login credentials') || m.includes('invalid credentials'))
      return 'E-mail ou senha incorretos.';
    if (m.includes('email not confirmed'))
      return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
    if (m.includes('too many requests'))
      return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
    return msg; // fallback: exibe o original
  };  

  // ── E-mail: cadastro ──────────────────────────────────────────────────────
  const handleSignup = async () => {
    setError(null);
    if (!email || !password) { setError('Preencha e-mail e senha.'); return; }
    if (password.length < 6)  { setError('Senha deve ter ao menos 6 caracteres.'); return; }
    if (password !== confirmPwd) { setError('As senhas não conferem.'); return; }
    setLoading(true);
    const { data: signUpData, error: err } = await supabaseClient.auth.signUp({ email, password });
    setLoading(false);
    if (err) { setError(translateError(err.message)); return; }
    setError(null);
    // Se o Supabase retornou sessão imediata ("Confirm email" desabilitado no dashboard),
    // fecha o modal — o onAuthStateChange cuida do resto.
    // Caso contrário ("Confirm email" ativo, padrão), não há sessão ainda:
    // mostra aviso para o usuário checar o e-mail antes de tentar entrar.
    if (signUpData?.session) {
      onClose();
    } else {
      setStep('signupSent');
    }
  };

  // ── E-mail: login ─────────────────────────────────────────────────────────
  const handleLogin = async () => {
    setError(null);
    if (!email || !password) { setError('Preencha e-mail e senha.'); return; }
    setLoading(true);
    const { error: err } = await supabaseClient.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(translateError(err.message)); return; }
    onClose();
  };

  // ── E-mail: esqueci senha ─────────────────────────────────────────────────
  const handleForgot = async () => {
    setError(null);
    if (!email) { setError('Informe o seu e-mail.'); return; }
    setLoading(true);
    const { error: err } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}?resetPassword=true`,
    });
    setLoading(false);
    if (err) { setError(translateError(err.message)); return; }
    setStep('forgotSent');
  };

  // ── Dispatch do submit do formulário ──────────────────────────────────────
  const handleEmailSubmit = () => {
    if (emailMode === 'signup')  handleSignup();
    else if (emailMode === 'login')  handleLogin();
    else handleForgot();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleEmailSubmit();
  };

  // ── Rótulos dinâmicos ──────────────────────────────────────────────────────
  const modeCopy = {
    signup: {
      title: t.modal.title,
      sub:   t.modal.sub,
      btn:   loading ? 'Criando conta…' : 'Criar conta',
      switch1: 'Já tem conta?',
      switch2: 'Entrar',
    },
    login: {
      title: 'Bem-vindo de volta',
      sub:   'Entre com sua conta Menestrel.',
      btn:   loading ? 'Entrando…' : 'Entrar',
      switch1: 'Ainda não tem conta?',
      switch2: 'Cadastrar',
    },
    forgot: {
      title: 'Recuperar senha',
      sub:   'Enviaremos um link de redefinição para o seu e-mail.',
      btn:   loading ? 'Enviando…' : 'Enviar link',
      switch1: 'Lembrou a senha?',
      switch2: 'Voltar ao login',
    },
  };
  const mc = modeCopy[emailMode];

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <ModalShell
      title={mc.title}
      lang={lang}
      size="sm"
      extraClass="auth-modal"
      onClose={onClose}
    >
        {/* ══ TELA: aguardando redirect OAuth ══════════════════════════════ */}
        {step === 'redirecting' && (
          <div style={{ position: 'relative', textAlign: 'center', padding: '30px 0 18px' }}>
            <div aria-hidden="true" style={{ width: 46, height: 46, margin: '0 auto', borderRadius: 6, border: '3px solid rgba(255,255,255,0.12)', borderTopColor: AUTH_GOLD, animation: 'spin 0.9s linear infinite' }} />
            <h3 style={{ fontFamily: AUTH_FD, fontSize: 22, fontWeight: 400, color: AUTH_INK, margin: '20px 0 0' }}>Redirecionando…</h3>
            <p style={{ fontFamily: AUTH_FB, fontSize: 15, color: AUTH_MUTED, margin: '8px 0 0' }}>Aguarde um momento.</p>
          </div>
        )}

        {/* ══ TELA: e-mail de reset enviado ════════════════════════════════ */}
        {step === 'forgotSent' && (
          <div style={{ position: 'relative', textAlign: 'center', padding: '10px 0 8px' }}>
            <div style={{ width: 52, height: 52, margin: '0 auto', borderRadius: 6, border: `1px solid rgba(83, 66, 27, 0.35)`, background: 'rgba(201,164,78,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: AUTH_GOLD }}>
              <MailIcon style={{ width: 24, height: 24 }} />
            </div>
            <h3 style={{ fontFamily: AUTH_FD, fontSize: 22, fontWeight: 700, color: AUTH_INK, margin: '18px 0 0' }}>E-mail enviado!</h3>
            <p style={{ fontFamily: AUTH_FB, fontSize: 15, color: AUTH_MUTED, margin: '10px 0 0', lineHeight: 1.6 }}>
              Verifique sua caixa de entrada em <strong style={{ color: AUTH_INK }}>{email}</strong> e clique no link para redefinir sua senha.
            </p>
            <button
              className="btn-ghost"
              onClick={() => { resetForm(); setEmailMode('login'); setStep('emailForm'); }}
              style={{ marginTop: 24 }}
            >
              Voltar ao login
            </button>
          </div>
        )}

        {/* ══ TELA: cadastro enviado (confirm email ativo no Supabase) ════ */}
        {step === 'signupSent' && (
          <div style={{ position: 'relative', textAlign: 'center', padding: '10px 0 8px' }}>
            <div style={{ width: 52, height: 52, margin: '0 auto', borderRadius: 6, border: `1px solid rgba(83, 66, 27, 0.35)`, background: 'rgba(201,164,78,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: AUTH_GOLD }}>
              <MailIcon style={{ width: 24, height: 24 }} />
            </div>
            <h3 style={{ fontFamily: AUTH_FD, fontSize: 22, fontWeight: 400, color: AUTH_INK, margin: '18px 0 0' }}>Confirme seu e-mail</h3>
            <p style={{ fontFamily: AUTH_FB, fontSize: 15, color: AUTH_MUTED, margin: '10px 0 0', lineHeight: 1.6 }}>
              Enviamos um link de confirmação para{' '}
              <strong style={{ color: AUTH_INK }}>{email}</strong>.
              <br />Clique no link para ativar sua conta e entrar.
            </p>
            <button
              className="btn-ghost"
              onClick={() => { resetForm(); setEmailMode('login'); setStep('emailForm'); }}
              style={{ marginTop: 24 }}
            >
              Já confirmei — Entrar
            </button>
          </div>
        )}

        {/* ══ TELA: choice (botões OAuth) ══════════════════════════════════ */}
        {step === 'choice' && (
          <div style={{ position: 'relative', textAlign: 'center' }}>

            {/* ── Botão Google ── */}
            <button
              onClick={() => loginOAuth('google')}
              style={{ ...oauthBtnBase, marginTop: 26, background: '#FFFFFF', border: 'none', color: '#15120C', boxShadow: '0 14px 34px -18px rgba(0,0,0,0.6)' }}
            >
              <GoogleIcon style={{ width: 20, height: 20, flexShrink: 0 }} />
              {authCopy.google_btn || 'Continuar com Google'}
            </button>

            {/* ── Botão Apple ── */}
            <button
              onClick={APPLE_ENABLED ? () => loginOAuth('apple') : undefined}
              disabled={!APPLE_ENABLED}
              title={!APPLE_ENABLED ? 'Em breve' : undefined}
              style={{
                ...oauthBtnBase,
                marginTop: 10,
                background: APPLE_ENABLED ? '#000000' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${APPLE_ENABLED ? '#000' : AUTH_BORDER}`,
                color: APPLE_ENABLED ? '#FFFFFF' : AUTH_MUTED,
                cursor: APPLE_ENABLED ? 'pointer' : 'not-allowed',
                opacity: APPLE_ENABLED ? 1 : 0.55,
              }}
            >
              <AppleIcon style={{ width: 20, height: 20, flexShrink: 0 }} />
              {APPLE_ENABLED ? (authCopy.apple_btn || 'Continuar com Apple') : 'Apple — Em breve'}
            </button>

            {/* ── Separador ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: AUTH_BORDER }} />
              <span style={{ fontFamily: AUTH_FB, fontSize: 15, color: AUTH_MUTED }}>ou</span>
              <div style={{ flex: 1, height: 1, background: AUTH_BORDER }} />
            </div>

            {/* ── Botão "Entrar com e-mail" ── */}
            <button
              className="btn-ghost"
              onClick={() => { setEmailMode('signup'); setStep('emailForm'); }}
              style={{ width: '100%', marginTop: 0 }}
            >
              <MailIcon style={{ width: 18, height: 18, flexShrink: 0 }} />
              Cadastrar
            </button>

            <button
              className="btn-ghost"
              onClick={() => { setEmailMode('login'); setStep('emailForm'); }}
              style={{ width: '100%', marginTop: 10, marginBottom: 4 }}
            >
              Já tenho conta — <span style={{ color: AUTH_GOLD }}>Entrar</span>
            </button>

            {error && <div className="err-msg" style={{ marginTop: 14, textAlign: 'center' }}>{error}</div>}

            <div aria-hidden="true" style={{ height: 1, background: AUTH_BORDER, margin: '10px 0 14px' }} />
            <p style={{ fontFamily: AUTH_FB, color: '#7E7258', fontSize: 13, textAlign: 'center', lineHeight: 1.55, margin: 0 }}>{t.modal.consent}</p>
          </div>
        )}

        {/* ══ TELA: formulário e-mail + senha ══════════════════════════════ */}
        {step === 'emailForm' && (
          <div style={{ position: 'relative' }}>
            {/* Voltar */}
            <button
              className="btn-ghost"
              onClick={() => { resetForm(); setStep('choice'); }}
              style={{ justifyContent: 'flex-start', marginBottom: 20, padding: 0, border: 'none', background: 'none' }}
            >
              <ChevronLeftIcon style={{ width: 16, height: 16 }} />
              Voltar
            </button>

            {/* Campo e-mail (sempre visível) */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>E-mail</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setFocusField('email')}
                onBlur={() => setFocusField(null)}
                style={{ ...inputStyle, borderColor: focusField === 'email' ? AUTH_GOLD : AUTH_BORDER }}
                autoFocus
              />
            </div>

            {/* Campos de senha — ocultos no modo forgot */}
            {emailMode !== 'forgot' && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Senha</label>
                <input
                  type="password"
                  placeholder={emailMode === 'signup' ? 'Mínimo 6 caracteres' : '••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setFocusField('password')}
                  onBlur={() => setFocusField(null)}
                  style={{ ...inputStyle, borderColor: focusField === 'password' ? AUTH_GOLD : AUTH_BORDER }}
                />
              </div>
            )}

            {/* Confirmar senha — só no signup */}
            {emailMode === 'signup' && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Confirmar senha</label>
                <input
                  type="password"
                  placeholder="Repita a senha"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setFocusField('confirm')}
                  onBlur={() => setFocusField(null)}
                  style={{ ...inputStyle, borderColor: focusField === 'confirm' ? AUTH_GOLD : AUTH_BORDER }}
                />
              </div>
            )}

            {/* Link "Esqueci a senha" — só no login */}
            {emailMode === 'login' && (
              <button
                className="btn-ghost"
                onClick={() => { setEmailMode('forgot'); resetForm(); }}
                style={{ display: 'block', marginBottom: 20, padding: 0, border: 'none', background: 'none' }}
              >
                Esqueci minha senha
              </button>
            )}

            {error && <div className="err-msg" style={{ marginBottom: 12 }}>{error}</div>}

            {/* Botão submit principal */}
            <button
              className="btn-primary"
              onClick={handleEmailSubmit}
              disabled={loading}
              style={{ width: '100%', fontSize: 16, marginBottom: 18 }}
            >
              {loading && (
                <span style={{ width: 16, height: 16, borderRadius: 6, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#15120C', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
              )}
              {mc.btn}
            </button>

            {/* Alternância signup ↔ login */}
            <p style={{ fontFamily: AUTH_FB, fontSize: 15, color: AUTH_MUTED, textAlign: 'center', margin: 0 }}>
              {mc.switch1}{' '}
              <span
                role="button"
                tabIndex={0}
                onClick={() => {
                  resetForm();
                  setEmailMode(emailMode === 'signup' ? 'login' : emailMode === 'login' ? 'signup' : 'login');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    resetForm();
                    setEmailMode(emailMode === 'signup' ? 'login' : emailMode === 'login' ? 'signup' : 'login');
                  }
                }}
                style={{ color: AUTH_GOLD, cursor: 'pointer', fontWeight: 600 }}
              >
                {mc.switch2}
              </span>
            </p>

            <div aria-hidden="true" style={{ height: 1, background: AUTH_BORDER, margin: '18px 0 12px' }} />
            <p style={{ fontFamily: AUTH_FB, color: '#7E7258', fontSize: 13, textAlign: 'center', lineHeight: 1.55, margin: 0 }}>{t.modal.consent}</p>
          </div>
        )}
    </ModalShell>
  );
}

// ─── PlanoEscolhaModal ───────────────────────────────────────────────────────
// Sem mudanças em relação à versão anterior.
function PlanoEscolhaModal({ lang, userId, onChosen }) {
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  // Travamento de scroll já é responsabilidade do ModalShell — não duplicar aqui.

  const confirmarFree = async () => {
    setSaving(true);
    setError(null);
    const { error: err } = await supabaseClient
      .from('profiles')
      .update({ plano: 'free', plano_escolhido_em: new Date().toISOString() })
      .eq('id', userId);
    setSaving(false);
    if (err) {
      console.error('[planos] update falhou:', err);
      setError(err.message);
    } else {
      onChosen();
    }
  };

  return (
    <ModalShell
      title={lang === 'en' ? 'Choose your plan' : 'Escolha seu plano'}
      lang={lang}
      size="lg"
    >
      <p className="subhead">
        {lang === 'en'
          ? 'Welcome, minstrel. Start free; upgrade whenever the saga grows.'
          : 'Bem-vindo, menestrel. Comece grátis e faça upgrade quando a saga crescer.'}
      </p>

      <div className="planos-grid">
        {/* Plano Free */}
        <article className="plano-card plano-free">
          <header className="plano-card-head">
            <div className="plano-eyebrow">{lang === 'en' ? 'Free' : 'Gratuito'}</div>
            <div className="plano-price">
              <span className="plano-price-main">{lang === 'en' ? 'No cost' : 'Sem custo'}</span>
            </div>
          </header>
          <ul className="plano-features">
            <li>{lang === 'en' ? '1 story' : '1 história'}</li>
            <li>{lang === 'en' ? '1 character' : '1 personagem'}</li>
            <li>{lang === 'en' ? 'Full bestiary, spells & techniques' : 'Bestiário, magias e técnicas completos'}</li>
            <li>{lang === 'en' ? 'Inventory, shop & coin chest' : 'Inventário, loja e cofre de moedas'}</li>
            <li>{lang === 'en' ? 'Invite players to your story' : 'Convide jogadores para a sua história'}</li>
          </ul>
          <button className="btn-primary" onClick={confirmarFree} disabled={saving} style={{ width: '100%' }}>
            {saving
              ? (lang === 'en' ? 'Saving…' : 'Salvando…')
              : (lang === 'en' ? 'Start free' : 'Começar grátis')}
          </button>
        </article>

        {/* Plano Premium */}
        <article className="plano-card plano-paid">
          <div className="plano-tag">{lang === 'en' ? 'Coming soon' : 'Em breve'}</div>
          <header className="plano-card-head">
            <div className="plano-eyebrow">Premium</div>
            <div className="plano-price">
              <span className="plano-price-main">{lang === 'en' ? 'Soon' : 'Em breve'}</span>
            </div>
          </header>
          <ul className="plano-features">
            <li>{lang === 'en' ? 'Unlimited stories' : 'Histórias ilimitadas'}</li>
            <li>{lang === 'en' ? 'Unlimited characters' : 'Personagens ilimitados'}</li>
            <li>{lang === 'en' ? 'Everything in Free' : 'Tudo do Gratuito'}</li>
            <li>{lang === 'en' ? 'Future: combat tools, dice log, audio' : 'Em breve: combate, dados, áudio'}</li>
          </ul>
          <button className="btn-ghost" disabled style={{ width: '100%' }}>
            {lang === 'en' ? 'Available soon' : 'Disponível em breve'}
          </button>
        </article>
      </div>

      {error && <div className="err-msg" style={{ marginTop: 14 }}>{error}</div>}

      <p className="planos-footnote">
        {lang === 'en'
          ? 'You can change your plan later from the console.'
          : 'Você pode mudar seu plano depois no console.'}
      </p>
    </ModalShell>
  );
}

Object.assign(window, {
  GoogleIcon, AppleIcon, SignupModal, PlanoEscolhaModal,
});
