/* ============================================================
   AUTH — Login único (Google) + onboarding de plano
   ============================================================
   Componentes exportados:
   - GoogleIcon        — ícone oficial Google (4 cores)
   - LoginPage         — ÚNICA página pública do app. Não existe mais
                         landing de SaaS, nem cadastro por e-mail/senha,
                         nem Apple: só "Continuar com Google" (OAuth do
                         Supabase). Estados: 'idle' | 'redirecting'.
                         Quem nunca entrou não precisa se cadastrar — o
                         primeiro login cria a conta e cai no
                         PlanoEscolhaModal.
   - PlanoEscolhaModal — onboarding pós-primeiro-login (inalterado)

   Copy da tela vem de AUTH_COPY (src/01-core/constants.jsx), em PT/EN.
   O fundo animado reaproveita os shaders da fase 02.
   ============================================================ */

// ─── Tokens visuais locais (Pedra & Bronze) ─────────────────────────────
const AUTH_GRAD   = 'linear-gradient(90deg,#B8472F,#B8702E,#C9A44E,#B8862E,#7A5E2A)';
const AUTH_GOLD   = '#C9A44E';
const AUTH_FD     = "'Cinzel',serif";
const AUTH_FB     = "'Lora',serif";
const AUTH_BORDER = 'rgba(255,255,255,0.10)';
const AUTH_MUTED  = '#9C8F73';
const AUTH_INK    = '#E8DDC6';

// ─── GoogleIcon ─────────────────────────────────────────────────────────────
const GoogleIcon = (props) => (
  <svg viewBox="0 0 48 48" {...props}>
    <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3c-2 1.6-4.6 2.6-7.4 2.6-5.2 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.3 5.3c-.4.4 6.6-4.9 6.6-14.9 0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

/* ─── Marca ──────────────────────────────────────────────────────────────────
   A SEGUNDA cópia do anel de gradiente — a primeira estava na sidebar. Trocar
   o ícone do sistema em 12/09/2026 deixou esta para trás, e o usuário viu o
   antigo no login. A marca aparece em dois lugares e agora é a mesma nos dois:
   ti-currency-monero, sem círculo. */
const MarcaMenestrel = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
    <i className="ti ti-currency-monero" aria-hidden="true"
       style={{ fontSize: 40, lineHeight: 1, color: '#C9A44E' }} />
    <span style={{ fontFamily: AUTH_FB, fontWeight: 400, fontSize: 34, color: AUTH_INK, lineHeight: 1 }}>Menestrel</span>
  </div>
);

// ─── LoginPage ──────────────────────────────────────────────────────────────
function LoginPage({ lang = 'pt', setLang, authCopy, shader = true, shaderKind = 'mesh', mode = 'grimoire' }) {
  const [step, setStep]   = useState('idle');   // idle | redirecting
  const [error, setError] = useState(null);
  const ac = authCopy || {};

  const entrarComGoogle = async () => {
    setError(null);
    setStep('redirecting');
    const { error: err } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (err) {
      console.error('[auth] signInWithOAuth(google) falhou:', err);
      setError(err.message || ac.erro);
      setStep('idle');
    }
  };

  return (
    <section
      className="menestrel-ui"
      style={{
        position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(32px,7vw,72px) 24px', background: 'var(--background)',
      }}
    >
      {/* ── Atmosfera: shader + brumas douradas ── */}
      {shader && shaderKind === 'mesh' && <MeshGradientShader opacity={0.85} dots={true} />}
      {shader && shaderKind !== 'mesh' && (
        <ShaderAnimation tint={mode === 'modern' ? 'cool' : 'blood'} opacity={mode === 'modern' ? 0.45 : 0.5} blend="screen" />
      )}
      <div aria-hidden="true" style={{ position: 'absolute', width: 420, height: 420, left: -110, top: -80, pointerEvents: 'none', filter: 'blur(60px)', background: 'radial-gradient(closest-side,#B8862E45,transparent)' }} />
      <div aria-hidden="true" style={{ position: 'absolute', width: 420, height: 420, right: -110, bottom: -80, pointerEvents: 'none', filter: 'blur(60px)', background: 'radial-gradient(closest-side,#7A5E2A33,transparent)' }} />
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(to bottom, rgba(24,18,8,.35) 0%, transparent 26%, transparent 68%, #15120C 100%)' }} />

      {/* ── Cartão de login ── */}
      <div
        style={{
          position: 'relative', zIndex: 2, width: 'min(440px, 100%)',
          background: 'rgba(34,29,21,0.82)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: `1px solid ${AUTH_BORDER}`, borderRadius: 6,
          padding: 'clamp(28px,5vw,40px) clamp(22px,4vw,34px) 26px',
          boxShadow: '0 40px 90px -30px rgba(0,0,0,0.85), 0 -50px 90px -60px rgba(201,164,78,0.35)',
          textAlign: 'center',
        }}
      >
        <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: AUTH_GRAD, borderRadius: '6px 6px 0 0' }} />

        <MarcaMenestrel />

        <div style={{ fontFamily: AUTH_FD, fontSize: 13, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', backgroundImage: AUTH_GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', marginTop: 22 }}>
          {ac.eyebrow}
        </div>

        {step === 'redirecting' ? (
          /* ══ aguardando o redirect do OAuth ══ */
          <div style={{ padding: '26px 0 10px' }}>
            <div aria-hidden="true" style={{ width: 46, height: 46, margin: '0 auto', borderRadius: 999, border: '3px solid rgba(255,255,255,0.12)', borderTopColor: AUTH_GOLD, animation: 'spin 0.9s linear infinite' }} />
            <h1 style={{ fontFamily: AUTH_FD, fontSize: 24, fontWeight: 400, color: AUTH_INK, margin: '22px 0 0' }}>{ac.redirecting}</h1>
            <p style={{ fontFamily: AUTH_FB, fontSize: 15, color: AUTH_MUTED, margin: '8px 0 0' }}>{ac.aguarde}</p>
          </div>
        ) : (
          /* ══ estado normal ══ */
          <>
            <h1 style={{ fontFamily: AUTH_FD, fontSize: 'clamp(23px,3.4vw,27px)', fontWeight: 700, lineHeight: 1.25, color: AUTH_INK, margin: '10px 0 0' }}>
              {ac.title}
            </h1>
            <p style={{ fontFamily: AUTH_FB, fontSize: 15.5, lineHeight: 1.65, color: AUTH_MUTED, margin: '12px 0 0' }}>
              {ac.sub}
            </p>

            <button
              type="button"
              onClick={entrarComGoogle}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                width: '100%', marginTop: 28, padding: '14px 18px',
                borderRadius: 6, border: 'none', background: '#FFFFFF', color: '#15120C',
                fontFamily: AUTH_FB, fontSize: 16, fontWeight: 500, cursor: 'pointer',
                boxShadow: '0 14px 34px -18px rgba(0,0,0,0.6)',
              }}
            >
              <GoogleIcon style={{ width: 20, height: 20, flexShrink: 0 }} />
              {ac.google_btn}
            </button>

            {error && <div className="err-msg" style={{ marginTop: 14 }}>{error}</div>}
          </>
        )}

        <div aria-hidden="true" style={{ height: 1, background: AUTH_BORDER, margin: '24px 0 14px' }} />

        <p style={{ fontFamily: AUTH_FB, fontSize: 13, lineHeight: 1.55, color: '#7E7258', margin: 0 }}>
          {ac.consent}
        </p>

        {setLang && (
          <div role="group" aria-label="Idioma" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <button type="button" onClick={() => setLang('pt')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: AUTH_FB, fontSize: 14, color: lang === 'pt' ? AUTH_GOLD : AUTH_MUTED, padding: '4px 6px' }}>PT</button>
            <span aria-hidden="true" style={{ width: 1, height: 14, background: AUTH_BORDER }} />
            <button type="button" onClick={() => setLang('en')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: AUTH_FB, fontSize: 14, color: lang === 'en' ? AUTH_GOLD : AUTH_MUTED, padding: '4px 6px' }}>EN</button>
          </div>
        )}
      </div>
    </section>
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
  GoogleIcon, LoginPage, PlanoEscolhaModal,
});
