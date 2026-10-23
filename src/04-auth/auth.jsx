/* ============================================================
   AUTH — Login único (Google) + primeira entrada
   ============================================================
   Componentes exportados:
   - GoogleIcon      — ícone oficial Google (4 cores)
   - LoginPage       — ÚNICA página pública do app: só "Continuar com Google"
                       (OAuth do Supabase). Estados: 'idle' | 'redirecting'.
                       Quem nunca entrou não precisa se cadastrar — o primeiro
                       login cria a conta e cai na PrimeiraEntrada.
   - PrimeiraEntrada — primeiro login: "Vou mestrar" / "Vou jogar" (substituiu
                       o PlanoEscolhaModal em 22/10/2026).

   As duas usam CenaDeEntrada (cena + painel). Copy do login em AUTH_COPY
   (src/01-core/constants.jsx); a marca é SeloMenestrel (01-core/helpers.jsx).
   O fundo animado reaproveita os shaders da fase 02.
   ============================================================ */

// ─── GoogleIcon ─────────────────────────────────────────────────────────────
const GoogleIcon = (props) => (
  <svg viewBox="0 0 48 48" {...props}>
    <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3c-2 1.6-4.6 2.6-7.4 2.6-5.2 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.3 5.3c-.4.4 6.6-4.9 6.6-14.9 0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

/* ─── CenaDeEntrada ─────────────────────────────────────────────────────────
   A moldura das duas telas de fora do console (22/10/2026): à esquerda a
   CENA — o shader, a marca e a frase do produto —, à direita o PAINEL, onde
   se age. Era um cartão de vidro centralizado sobre o shader, com um rótulo em
   degradê acima do título; o usuário escolheu as duas partes. No celular a
   cena sobe e o painel vem embaixo. */
function CenaDeEntrada({ lang = 'pt', setLang, shader = true, shaderKind = 'mesh', mode = 'grimoire', cena, children, rodape }) {
  const en = lang === 'en';
  const reduzMovimento = typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <section className="menestrel-ui entrada">
      <div className="entrada-cena">
        {shader && shaderKind === 'mesh' && <MeshGradientShader opacity={0.85} dots={true} paused={reduzMovimento} />}
        {shader && shaderKind !== 'mesh' && (
          <ShaderAnimation tint={mode === 'modern' ? 'cool' : 'blood'} opacity={mode === 'modern' ? 0.45 : 0.5} blend="screen" />
        )}
        <div className="entrada-marca">
          <SeloMenestrel size={44} />
          <span>Menestrel</span>
        </div>
        <div className="entrada-cena-txt">{cena}</div>
      </div>

      <main className="entrada-painel">
        <div className="entrada-miolo">{children}</div>
        <div className="entrada-rodape">
          {rodape || <span />}
          {setLang && (
            <div role="group" aria-label={en ? 'Language' : 'Idioma'} className="entrada-idioma">
              <button type="button" aria-pressed={!en} onClick={() => setLang('pt')}>PT</button>
              <button type="button" aria-pressed={en} onClick={() => setLang('en')}>EN</button>
            </div>
          )}
        </div>
      </main>
    </section>
  );
}

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
    <CenaDeEntrada lang={lang} setLang={setLang} shader={shader} shaderKind={shaderKind} mode={mode}
      cena={<>
        <h1 className="entrada-lema">{ac.lema}</h1>
        <p className="entrada-feito">{ac.feito}</p>
      </>}>
      {step === 'redirecting' ? (
        /* ══ aguardando o redirect do OAuth ══ */
        <div className="entrada-espera" role="status">
          <div aria-hidden="true" className="entrada-giro" />
          <h2 className="entrada-titulo">{ac.redirecting}</h2>
          <p className="entrada-sub">{ac.aguarde}</p>
        </div>
      ) : (
        <>
          <h2 className="entrada-titulo">{ac.title}</h2>
          <p className="entrada-sub">{ac.sub}</p>
          <button type="button" className="entrada-google" onClick={entrarComGoogle}>
            <GoogleIcon style={{ width: 20, height: 20, flexShrink: 0 }} aria-hidden="true" />
            {ac.google_btn}
          </button>
          {error && <div className="err-msg" role="alert" style={{ marginTop: 14 }}>{error}</div>}
        </>
      )}
      <p className="entrada-consent">{ac.consent}</p>
    </CenaDeEntrada>
  );
}

/* ─── PrimeiraEntrada ────────────────────────────────────────────────────────
   O primeiro login (22/10/2026). Antes caía num modal "Escolha seu plano" com
   um plano gratuito e um Premium "em breve" — uma escolha que não existia — e
   a conta nascia sempre como Jogador; o Mestre tinha que achar a troca de
   perfil no menu da conta. Agora a pergunta é a que muda o que se vê: vai
   mestrar ou vai jogar?

   O plano gratuito entra sozinho. `plano_escolhido_em` continua sendo o sinal
   de "onboarding feito": o gatilho trg_plano_somente_admin deixa o dono
   preenchê-lo UMA vez (scripts/sql/plano-somente-admin.sql) e não deixa mexer
   no plano — por isso o UPDATE não manda `plano`. */
function PrimeiraEntrada({ lang = 'pt', setLang, userId, nome, shader = true, shaderKind = 'mesh', mode = 'grimoire', onEscolhido, onSair }) {
  const en = lang === 'en';
  const [salvando, setSalvando] = useState(null);   // 'master' | 'player' | null
  const [error, setError] = useState(null);

  const escolher = async (papel) => {
    if (salvando) return;
    setSalvando(papel);
    setError(null);
    const { error: err } = await supabaseClient
      .from('profiles')
      .update({ perfil_tipo: papel, plano_escolhido_em: new Date().toISOString() })
      .eq('id', userId);
    if (err) {
      console.error('[primeira entrada] update falhou:', err);
      setError(en ? 'Could not save your choice. Try again.' : 'Não foi possível salvar a escolha. Tente de novo.');
      setSalvando(null);
      return;
    }
    onEscolhido(papel);
  };

  const papeis = [
    { id: 'master', icone: 'ti-crown',
      titulo: en ? "I'll run the game" : 'Vou mestrar',
      texto: en ? 'Create the table, run scenes and battles, invite your players.'
                : 'Crie a mesa, conduza cenas e batalhas, convide seus jogadores.' },
    { id: 'player', icone: 'ti-shield',
      titulo: en ? "I'll play" : 'Vou jogar',
      texto: en ? "Create your character and join a Game Master's table by invite."
                : 'Crie seu personagem e entre na mesa de um Mestre por convite.' },
  ];

  return (
    <CenaDeEntrada lang={lang} setLang={setLang} shader={shader} shaderKind={shaderKind} mode={mode}
      cena={<>
        <h1 className="entrada-lema">
          {nome
            ? (en ? `Welcome to the table, ${nome}.` : `Boas-vindas à mesa, ${nome}.`)
            : (en ? 'Welcome to the table.' : 'Boas-vindas à mesa.')}
        </h1>
        <p className="entrada-feito">{en ? 'Made for Tagmar · Game Masters and Players' : 'Feito para Tagmar · Mestres e Jogadores'}</p>
      </>}
      rodape={onSair && (
        <button type="button" className="entrada-outra-conta" onClick={onSair}>
          {en ? 'Use another account' : 'Entrar com outra conta'}
        </button>
      )}>
      <h2 className="entrada-titulo">{en ? 'How do you come to the table?' : 'Como você chega à mesa?'}</h2>
      <p className="entrada-sub">
        {en ? 'You can switch later in your account menu.' : 'Dá para trocar depois, no menu da sua conta.'}
      </p>
      <div className="entrada-papeis">
        {papeis.map((p) => (
          <button key={p.id} type="button" className="entrada-papel" onClick={() => escolher(p.id)}
            disabled={!!salvando} aria-busy={salvando === p.id || undefined}>
            <span className="entrada-papel-icone" aria-hidden="true">
              <i className={'ti ' + (salvando === p.id ? 'ti-loader-2 entrada-girando' : p.icone)} />
            </span>
            <span className="entrada-papel-titulo">{p.titulo}</span>
            <span className="entrada-papel-texto">{p.texto}</span>
          </button>
        ))}
      </div>
      {error && <div className="err-msg" role="alert" style={{ marginTop: 14 }}>{error}</div>}
    </CenaDeEntrada>
  );
}

Object.assign(window, {
  GoogleIcon, LoginPage, PrimeiraEntrada,
});
