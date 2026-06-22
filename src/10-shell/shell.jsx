/* ============================================================
   SHELL — Componentes raiz da aplicação
   ============================================================
   O último arquivo da árvore de extração. Concentra tudo que
   ainda não tinha tema próprio:

   - FantasyDatePicker — input de data fantasy (dia/mes/ano com
                         dia da semana calculado). Reutilizável,
                         mas hoje só usado pelo NovaHistoriaModal.
   - Icon              — namespace de ícones SVG ornamentais
                         (Skull, Sword, Crown, Flame, ...). É o
                         único símbolo deste arquivo exposto também
                         via `window.Icon` pra consumo retrocompat.
   - Topbar            — barra superior (logo, nav, idioma, tema,
                         login)
   - AdminEmpty        — estado vazio reutilizável (com ornamento)
   - AdminConsole      — layout principal do console (sidebar com
                         abas + main com a aba ativa). Onde quase
                         todas as features extraídas se encontram.
   - App               — raiz da aplicação. Estado de auth, callbacks
                         OAuth, alternância landing/console. A lógica
                         de auth foi mantida inline (decisão de não
                         refatorar agora — `useAuth` fica pra depois).

   Depende de:
   - Tudo o que foi extraído nas fases anteriores (Hero, ...,
     ConvitesJogador, ItensList, etc).
   - TWEAKS_DEFAULTS (no app.jsx, último script) — resolvido em
     runtime quando App() é renderizado.

   Carregar imediatamente antes do app.jsx (que só tem TWEAKS_DEFAULTS
   + bootstrap ReactDOM).
   ============================================================ */



// ─── FantasyDatePicker ──────────────────────────────────────────────────────
function FantasyDatePicker({ value, onChange }) {
  const val = value || { dia: 1, mes: 1, ano: 0 };
  const maxDias = FANTASY_MONTHS[val.mes - 1]?.dias || 30;
  const diaSemana = calcDiaSemanaFantasy(val.ano, val.mes, val.dia);

  const update = (k, v) => {
    const next = { ...val, [k]: Number(v) };
    const maxD = FANTASY_MONTHS[next.mes - 1]?.dias || 30;
    if (next.dia > maxD) next.dia = maxD;
    onChange(next);
  };

  // Pele dos campos migrada (Pedra & Bronze) — substitui a classe legada .wiz-field.
  const field = {
    fontFamily: "'Lora', serif", fontSize: 15, color: '#E8DDC6',
    background: '#181308', border: '1px solid rgba(106,85,48,0.40)', borderRadius: 6,
    padding: '10px 12px', outline: 'none', width: '100%',
  };

  return (
    <div className="menestrel-ui" style={{ display: 'grid', gridTemplateColumns: '70px 1fr 130px 80px', gap: 8 }}>
      {/* Dia */}
      <select value={val.dia} onChange={(e) => update('dia', e.target.value)} style={field}>
        {Array.from({ length: maxDias }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>

      {/* Mês */}
      <select value={val.mes} onChange={(e) => update('mes', e.target.value)} style={field}>
        {FANTASY_MONTHS.map((m) => (
          <option key={m.n} value={m.n}>{m.nome}</option>
        ))}
      </select>

      {/* Dia da semana */}
      <input
        type="text"
        readOnly
        value={`✦ ${diaSemana}`}
        style={{ ...field, color: '#C9A44E', cursor: 'default', textAlign: 'left' }}
      />

      {/* Ano */}
      <input
        type="number"
        min={0}
        value={val.ano}
        onChange={(e) => update('ano', e.target.value)}
        style={field}
      />
    </div>
  );
}

/* ============================== [02] Icons — Tabler Icons (via CSS) ============================== */

// Ícones do Tabler Icons (MIT License) — mesma abordagem do inventario.jsx:
// <i className="ti ti-nome-do-icone" /> em vez de SVG inline.
// O font/CSS do Tabler deve estar carregado na página (CDN ou bundle).
//
// Cada helper aceita { style, className } e os repassa para o <i>.
// O Ornament é mantido como SVG pois é um visual decorativo único, não existente no Tabler.

const TI_cls = (tiClass) => ({ style, className, ...rest } = {}) => (
  <i
    className={['ti', tiClass, className].filter(Boolean).join(' ')}
    style={style}
    aria-hidden="true"
    {...rest}
  />
);

const Icon = {
  // ── Menu lateral ────────────────────────────────────────────────────────────
  Scroll:  TI_cls('ti-book-2'),          // Histórias
  Crown:   TI_cls('ti-mail'),     // Personagens (mestre)
  Compass: TI_cls('ti-user'),            // Personagens (jogador)
  Tower:   TI_cls('ti-bat'),             // Criaturas
  Chest:   TI_cls('ti-backpack'),        // Itens
  Flame:   TI_cls('ti-meteor'),            // Magias
  Sword:   TI_cls('ti-bow'),           // Técnicas
  Shield:  TI_cls('ti-tools'),     // Habilidades

  // ── Logo / cabeçalho ─────────────────────────────────────────────────────────
  Skull:   TI_cls('ti-id'),           // Logo ornamental

  // ── Utilitários ──────────────────────────────────────────────────────────────
  Dice:    TI_cls('ti-dice-3'),          // Dado
  Coin:    TI_cls('ti-coin'),            // Moeda

  // Ornamento (mantido como SVG — visual decorativo único, não disponível no Tabler)
  Ornament: (props) => (
    <svg viewBox="0 0 60 24" fill="none" stroke="currentColor" strokeWidth="1.2" {...props}>
      <path d="M0 12 L20 12" />
      <path d="M40 12 L60 12" />
      <path d="M22 12 C24 8 28 8 30 12 C32 16 36 16 38 12" />
      <path d="M30 12 L30 6 M30 12 L30 18" strokeWidth="0.8" />
      <circle cx="30" cy="3" r="1" fill="currentColor" />
      <circle cx="30" cy="21" r="1" fill="currentColor" />
    </svg>
  ),

  // ── Utilitários adicionais ───────────────────────────────────────────────────
  Check:      TI_cls('ti-check'),               // Confirmação
  Info:       TI_cls('ti-file-description'),    // Informação / ver ficha
  ArrowOut:   TI_cls('ti-upload'),              // Exportar / upload
  ArrowSwap:  TI_cls('ti-arrows-left-right'),   // Transferir / trocar
  Drop:       TI_cls('ti-droplet'),             // Líquido
  Logo:       TI_cls('ti-music'),               // Logo / música

  // ── Console (ações de UI) ────────────────────────────────────────────────────
  Logout:       TI_cls('ti-logout'),             // Sair
  ChevronLeft:  TI_cls('ti-menu-2'),             // Recolher/expandir sidebar
  ChevronRight: TI_cls('ti-chevron-right'),      // Indica que a linha abre um menu (rodapé da sidebar)

  // ── Menu de usuário ──────────────────────────────────────────────────────────
  Profile:     TI_cls('ti-user-circle'),        // Editar perfil
  Language:    TI_cls('ti-world'),              // Idioma
  Help:        TI_cls('ti-help'),               // Ajuda
};

window.Icon = Icon;

/* ============================== [10] Topbar (navbar branca · estilo EternaCloud · CTA ouro) ==============================
   Substitui a função Topbar existente em src/10-shell/shell.jsx.
   NÃO mexer no Object.assign(window, { ... Topbar ... }) do fim do arquivo — ele já exporta este nome.
   Fontes (Cinzel + Plus Jakarta Sans) já vêm do projeto migrado; não precisa reimportar.
   Tamanhos/cores ficam inline (regra de ouro); o <style> só cobre o que inline não faz: hover, ::after e responsivo.
*/
function Topbar({ lang = 'pt', setLang, user, onSignup, onStart, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);

  // ───────────── FIAÇÃO — casar com o que o App() já passa pro <Topbar/> ─────────────
  // Se o seu App usa outros nomes (ex.: idioma/setIdioma, abrirCadastro), renomeie aqui ou na chamada.
  const links = [
    { label: lang === 'en' ? 'About'        : 'O que é',        to: 'cap1' },
    { label: lang === 'en' ? 'How it works' : 'Como funciona',  to: 'recursos' },
    { label: lang === 'en' ? 'Plans'        : 'Planos',         to: 'planos' },
    { label: lang === 'en' ? 'Supporters'   : 'Apoiadores',     to: 'fundadores' },
  ];
  const ctaLabel = user
    ? (lang === 'en' ? 'My grimoire' : 'Meu grimório')
    : (lang === 'en' ? 'Get started' : 'Começar agora');
  const go = (to) => { setMenuOpen(false); if (onNavigate) onNavigate(to); else window.location.hash = to; };
  const handleCta = () => { if (onSignup) onSignup(); else if (onStart) onStart(); else go(user ? 'app' : 'planos'); };
  // ────────────────────────────────────────────────────────────────────────────────────

  const C = {
    white: '#FFFFFF', ink: '#2A1C08', link: '#4A3D26', linkMuted: '#9C8F73',
    hair: 'rgba(24,18,8,0.05)', sep: 'rgba(24,18,8,0.18)',
    ctaGrad: 'linear-gradient(135deg,#C9A44E 0%,#B8702E 100%)',
    ctaGlow: '0 12px 30px -10px rgba(201,164,78,0.45)',
    fd: "'Cinzel',serif", fb: "'Plus Jakarta Sans',system-ui,sans-serif",
  };

  return (
    <div className="menestrel-ui" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', justifyContent: 'center', padding: '13px 24px' }}>
      <style>{`
        .mn-link{ position:relative; }
        .mn-link::after{ content:""; position:absolute; left:0; right:100%; bottom:-2px; height:2px; border-radius:6px; background:#7A5E2A; transition:right .25s ease; }
        .mn-link:hover{ color:#7A5E2A !important; }
        .mn-link:hover::after{ right:0; }
        .mn-cta{ transition:transform .18s ease, box-shadow .18s ease, filter .18s ease; }
        .mn-cta:hover{ transform:translateY(-2px); filter:brightness(1.06); box-shadow:0 18px 34px -12px rgba(201,164,78,0.5); }
        .mn-cta:active{ transform:translateY(0); }
        .mn-lang button{ transition:color .2s ease; }
        .mn-lang button:hover{ color:#7A5E2A !important; }
        .mn-nav-desktop{ display:flex; }
        .mn-burger{ display:none; }
        @media (max-width:980px){
          .mn-nav-desktop{ display:none; }
          .mn-lang{ display:none; }
          .mn-burger{ display:flex; }
        }
        @media (max-width:560px){
          .mn-cta{ padding:14px 22px !important; font-size:16px !important; }
        }
      `}</style>

      <nav aria-label="Navegação principal" style={{
        position: 'relative', width: '100%', maxWidth: '1600px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center',
        background: C.white, borderRadius: '6px', padding: '5px 5px 5px 20px',
        boxShadow: '0 24px 64px -20px rgba(8,6,2,0.7), 0 2px 8px rgba(8,6,2,0.16)',
        outline: `1px solid ${C.hair}`,
      }}>
        {/* Marca */}
        <a href="#" onClick={(e) => { e.preventDefault(); go('topo'); }} aria-label="Menestrel — início"
           style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', flex: '0 0 auto' }}>
          <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center' }}>
            <svg viewBox="0 0 44 44" width="40" height="40">
              <defs>
                <linearGradient id="mn-ring" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#B8472F" />
                  <stop offset="0.3" stopColor="#B8702E" />
                  <stop offset="0.55" stopColor="#C9A44E" />
                  <stop offset="0.8" stopColor="#B8862E" />
                  <stop offset="1" stopColor="#7A5E2A" />
                </linearGradient>
              </defs>
              <circle cx="22" cy="22" r="16" fill="none" stroke="url(#mn-ring)" strokeWidth="5"
                      strokeLinecap="round" strokeDasharray="86 16" transform="rotate(-90 22 22)" />
            </svg>
          </span>
          <span style={{ fontFamily: C.fb, fontWeight: 400, fontSize: '32px', color: C.ink, lineHeight: 1 }}>Menestrel</span>
        </a>

        {/* Links (desktop) */}
        <ul className="mn-nav-desktop" style={{ listStyle: 'none', alignItems: 'center', gap: '38px', margin: 0, padding: 0, justifyContent: 'center' }}>
          {links.map((l) => (
            <li key={l.to}>
              <a href="#" className="mn-link" onClick={(e) => { e.preventDefault(); go(l.to); }}
                 style={{ fontFamily: C.fb, fontWeight: 500, fontSize: '18px', color: C.link, textDecoration: 'none', padding: '6px 0', whiteSpace: 'nowrap' }}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Ações */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '0 0 auto', justifyContent: 'flex-end' }}>
          <div className="mn-lang" role="group" aria-label="Idioma" style={{ alignItems: 'center', gap: '8px', padding: '0 4px' }}>
            <button type="button" onClick={() => setLang && setLang('pt')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: C.fb, fontWeight: 400, fontSize: '16px', color: lang === 'pt' ? C.ink : C.linkMuted, padding: '6px 4px' }}>PT</button>
            <span aria-hidden="true" style={{ width: '1px', height: '16px', background: C.sep }} />
            <button type="button" onClick={() => setLang && setLang('en')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: C.fb, fontWeight: 400, fontSize: '16px', color: lang === 'en' ? C.ink : C.linkMuted, padding: '6px 4px' }}>EN</button>
          </div>

          <a href="#" className="mn-cta" onClick={(e) => { e.preventDefault(); handleCta(); }}
             style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.fb, fontWeight: 400, fontSize: '18px', color: '#fff', textDecoration: 'none', background: C.ctaGrad, padding: '18px 34px', borderRadius: '16px', boxShadow: C.ctaGlow }}>
            {ctaLabel}
          </a>

          <button type="button" aria-label="Abrir menu" className="mn-burger" onClick={() => setMenuOpen((o) => !o)}
            style={{ flexDirection: 'column', gap: '5px', width: '48px', height: '48px', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(24,18,8,0.12)', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}>
            <span style={{ width: '20px', height: '2px', background: C.ink, borderRadius: '2px' }} />
            <span style={{ width: '20px', height: '2px', background: C.ink, borderRadius: '2px' }} />
            <span style={{ width: '20px', height: '2px', background: C.ink, borderRadius: '2px' }} />
          </button>
        </div>

        {/* Menu mobile */}
        {menuOpen && (
          <ul style={{ position: 'absolute', top: 'calc(100% + 12px)', left: 0, right: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px', background: '#fff', borderRadius: '6px', padding: '14px 18px', margin: 0, boxShadow: '0 22px 50px -18px rgba(8,6,2,0.6)' }}>
            {links.map((l) => (
              <li key={l.to}>
                <a href="#" className="mn-link" onClick={(e) => { e.preventDefault(); go(l.to); }}
                   style={{ display: 'block', fontFamily: C.fb, fontWeight: 500, fontSize: '18px', color: C.link, textDecoration: 'none', padding: '10px 0' }}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </div>
  );
}

// ---------- AdminEmpty: estado vazio (migrado · Pedra & Bronze) ----------
function AdminEmpty({ ac, sectionLabel }) {
  const lineL = { flex: 1, height: 1, maxWidth: 90, background: 'linear-gradient(90deg, transparent, rgba(201,164,78,0.45))' };
  const lineR = { flex: 1, height: 1, maxWidth: 90, background: 'linear-gradient(90deg, rgba(201,164,78,0.45), transparent)' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '64px 24px', minHeight: 280 }}>
      <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, width: '100%', maxWidth: 300, color: '#C9A44E' }}>
        <span style={lineL} />
        <Icon.Ornament style={{ width: 56, height: 22, flex: '0 0 auto' }} />
        <span style={lineR} />
      </div>
      <p style={{ margin: 0, fontSize: 15, color: '#9C8F73', lineHeight: 1.6, maxWidth: 420 }}>{ac.empty_sub}</p>
      <button
        disabled
        title={ac.coming_soon}
        style={{ marginTop: 16, fontFamily: "'Lora', serif", fontWeight: 400, fontSize: 15, color: '#9C8F73', background: 'rgba(232,221,198,0.05)', border: '1px solid rgba(232,221,198,0.12)', borderRadius: 6, padding: '11px 20px', cursor: 'not-allowed', opacity: 0.7 }}>
        + {ac.create} {sectionLabel ? `· ${sectionLabel}` : ''}
      </button>
      <div style={{ marginTop: 10, fontSize: 15, color: 'rgba(156,143,115,0.7)' }}>{ac.coming_soon}</div>
    </div>
  );
}

// ---------- FichasJogador: fichas dos personagens do jogador ----------
// Exibe cards de ficha para cada personagem do jogador. Clicar num card
// abre o modal de visualização completa (PersonagemFichaModal / onVerFicha).
// Depende de: calcularFicha, ATRIBUTOS_KEYS, ATRIBUTOS_LABEL (game-data.jsx)
//             supabaseClient (global), Icon (este arquivo)
function FichasJogador({ ac, lang, currentUserId }) {
  const [personagens, setPersonagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fichaAberta, setFichaAberta] = useState(null); // personagem selecionado pro modal

  // Busca os personagens do jogador logado
  useEffect(() => {
    if (!currentUserId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabaseClient
        .from('personagens')
        .select('*')
        .eq('user_id', currentUserId)
        .order('nome');
      if (!error && data) setPersonagens(data);
      setLoading(false);
    })();
  }, [currentUserId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: '#9C8F73' }}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.4" style={{ animation: 'spin 1s linear infinite' }}>
          <path d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round" />
        </svg>
        <span style={{ fontFamily: "'Lora', serif", fontSize: 15 }}>
          {lang === 'en' ? 'Loading sheets…' : 'Carregando fichas…'}
        </span>
      </div>
    );
  }

  if (!personagens.length) {
    const lineL = { flex: 1, height: 1, maxWidth: 90, background: 'linear-gradient(90deg, transparent, rgba(201,164,78,0.45))' };
    const lineR = { flex: 1, height: 1, maxWidth: 90, background: 'linear-gradient(90deg, rgba(201,164,78,0.45), transparent)' };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '64px 24px', minHeight: 260 }}>
        <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, width: '100%', maxWidth: 300, color: '#C9A44E' }}>
          <span style={lineL} /><Icon.Ornament style={{ width: 56, height: 22, flex: '0 0 auto' }} /><span style={lineR} />
        </div>
        <p style={{ margin: 0, fontSize: 15, color: '#9C8F73', lineHeight: 1.6, maxWidth: 420 }}>
          {lang === 'en'
            ? 'No characters yet. Create one in Personagens.'
            : 'Nenhum personagem ainda. Crie um em Personagens.'}
        </p>
      </div>
    );
  }

  const FB = "'Lora', serif";

  return (
    <>
      <style>{`
        .fj-card { transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease; }
        .fj-card:hover { transform: translateY(-3px); border-color: rgba(201,164,78,0.40); box-shadow: 0 22px 50px -28px rgba(8,6,2,0.9); }
      `}</style>
      {/* Grid de cards de ficha */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 20,
      }}>
        {personagens.map((p) => {
          // Calcula derivadas sem catálogo de itens (versão rápida p/ card)
          const ficha = calcularFicha(p, null);
          const { estagio, atributos, derivadas } = ficha;
          const titulo = tituloDoPersonagem(p);

          return (
            <div
              key={p.id}
              className="fj-card"
              style={{ cursor: 'pointer', position: 'relative', background: 'linear-gradient(180deg, #221D15 0%, #181308 100%)', border: '1px solid rgba(106,85,48,0.30)', borderRadius: 6, padding: 18, boxShadow: '0 16px 40px -28px rgba(8,6,2,0.8)' }}
              onClick={() => setFichaAberta(p)}
              title={lang === 'en' ? 'Open sheet' : 'Abrir ficha'}
            >
              {/* Cabeçalho do card */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{
                    fontFamily: "'Cinzel', serif",
                    fontWeight: 700,
                    fontSize: 16,
                    color: '#C9A44E',
                    lineHeight: 1.2,
                  }}>
                    {p.nome}
                  </div>
                  {titulo && (
                    <div style={{ fontSize: 13, color: '#9C8F73', textTransform: 'uppercase', marginTop: 2 }}>
                      {titulo}
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: '#9C8F73', marginTop: 4 }}>
                    {p.profissao} · {p.raca} · {lang === 'en' ? 'Stage' : 'Estágio'} {estagio}
                  </div>
                </div>
                <div style={{
                  background: 'rgba(201,164,78,0.12)',
                  border: '1px solid rgba(201,164,78,0.28)',
                  borderRadius: 6,
                  padding: '3px 9px',
                  fontSize: 13,
                  fontFamily: FB,
                  fontWeight: 400,
                  color: '#C9A44E',
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {p.experiencia ?? 0} XP
                </div>
              </div>

              {/* Divisor ornamental */}
              <div style={{ borderTop: '1px solid rgba(106,85,48,0.30)', marginBottom: 12 }} />

              {/* Derivadas principais */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px 10px', marginBottom: 12 }}>
                {[
                  { label: 'EF',  val: derivadas.energiaFisica },
                  { label: 'EH',  val: derivadas.energiaHeroica },
                  { label: 'RF',  val: derivadas.resistenciaFisica },
                  { label: 'RM',  val: derivadas.resistenciaMagica },
                  { label: 'KA',  val: derivadas.karma },
                  { label: 'VB',  val: derivadas.velocidade },
                ].map(({ label, val }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, textTransform: 'uppercase', color: '#9C8F73' }}>{label}</div>
                    <div style={{ fontSize: 15, fontFamily: FB, color: '#E8DDC6', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Atributos */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px' }}>
                {ATRIBUTOS_KEYS.map((k) => (
                  <div key={k} style={{
                    fontSize: 13,
                    fontFamily: FB,
                    fontVariantNumeric: 'tabular-nums',
                    color: atributos[k] >= 0 ? '#9C8F73' : '#C0563F',
                  }}>
                    <span style={{ opacity: 0.6 }}>{ATRIBUTOS_LABEL[k].slice(0, 3).toUpperCase()} </span>
                    <span style={{ color: atributos[k] > 0 ? '#C9A44E' : 'inherit' }}>
                      {atributos[k] > 0 ? '+' : ''}{atributos[k]}
                    </span>
                  </div>
                ))}
              </div>

              {/* Defesa/Absorção se disponível */}
              {(derivadas.defesa || derivadas.absorcao > 0) && (
                <div style={{ marginTop: 10, display: 'flex', gap: 12, fontSize: 13, color: '#9C8F73', fontFamily: FB, fontVariantNumeric: 'tabular-nums' }}>
                  <span>DEF <strong style={{ color: '#E8DDC6' }}>{derivadas.defesa}</strong></span>
                  <span>AR <strong style={{ color: '#E8DDC6' }}>{derivadas.absorcao}</strong></span>
                </div>
              )}

              {/* Indicador "abrir ficha" */}
              <div style={{
                position: 'absolute', bottom: 10, right: 12,
                fontSize: 9, color: '#9C8F73', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Icon.Info style={{ fontSize: 12, lineHeight: 1 }} />
                {lang === 'en' ? 'view sheet' : 'ver ficha'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de ficha completa — delega ao PersonagemFichaModal existente */}
      {fichaAberta && typeof PersonagemFichaModal !== 'undefined' && (
        <PersonagemFichaModal
          personagem={fichaAberta}
          lang={lang}
          ac={ac}
          onClose={() => setFichaAberta(null)}
        />
      )}
    </>
  );
}

/* ============================== [10] ModalShell — padrão único de modal do projeto (header / body / footer) ==============================
   Substitui a função ModalShell em src/10-shell/shell.jsx (procure por `function ModalShell({`).

   Estrutura fixa, não improvisar:
   - HEADER: título à esquerda + botão "x" de fechar à direita (ícone Tabler `ti-x`).
   - BODY: conteúdo livre (children), com scrollbar customizada (mesmo padrão visual de
     .bestiario-wrap/.inv-table-wrap já usados no projeto).
   - FOOTER: botão "Cancelar" (ghost) sempre à ESQUERDA + botão de ação primária à DIREITA.
     Footer só aparece se onCancel e/ou onConfirm forem passados.

   Comportamento:
   - Clique no backdrop NÃO fecha o modal (decisão do produto — evita fechar sem querer
     no meio de um formulário). Só fecha via "x", via Cancelar, ou via Escape.
   - Escape fecha (chama onClose). Scroll do body trancado enquanto o modal está aberto.

   Props:
     title          — string ou node, vai no header
     onClose        — opcional: handler do "x" e do Escape. Se omitido, o modal
                      NÃO mostra "x" e Escape não faz nada — usar só em casos
                      de produto deliberadamente bloqueantes (ex.: PlanoEscolhaModal,
                      onboarding obrigatório). Na grande maioria dos modais, passar sempre.
     onCancel       — opcional: se presente, mostra botão Cancelar (footer, esquerda)
     cancelLabel    — opcional, default 'Cancelar' / 'Cancel' conforme `lang`
     cancelDisabled — opcional, desabilita o botão Cancelar (ex.: durante uma operação
                      que não pode ser interrompida)
     onConfirm      — opcional: se presente, mostra botão de ação primária (footer, direita)
     confirmLabel   — opcional, default 'Salvar' / 'Save' conforme `lang`
     confirmDisabled— opcional, desabilita o botão de ação primária (ex.: durante saving)
     size           — 'sm' | 'md' | 'lg' | 'full' (default 'md') — controla max-width
     headerExtra    — opcional: node extra no header, à direita do título (ex.: stepper)
     footerCenter   — opcional: node centralizado no footer, entre Cancelar e a ação
                      primária (ex.: saldo de pontos de um wizard)
     footerBeforeConfirm — opcional: node inserido no lado direito do footer, ANTES do
                      botão de ação primária (ex.: botão "Voltar" de um wizard)
     extraClass     — opcional: classe extra no .ms-modal, para overrides pontuais
     lang           — 'pt' | 'en', default 'pt' — só usado pros rótulos default dos botões
     children       — conteúdo do body

   Uso típico:
     <ModalShell
       title="Confirmar exclusão"
       lang={lang}
       onClose={onClose}
       onCancel={onClose}
       onConfirm={handleConfirm}
       confirmLabel={lang === 'en' ? 'Delete' : 'Excluir'}
       confirmDisabled={saving}
     >
       <p>Conteúdo do corpo aqui.</p>
     </ModalShell>
*/
function ModalShell({
  title,
  onClose = null,
  onCancel,
  cancelLabel,
  cancelDisabled = false,
  onConfirm,
  confirmLabel,
  confirmDisabled = false,
  size = 'md',
  headerExtra = null,
  footerCenter = null,
  footerBeforeConfirm = null,
  extraClass = '',
  lang = 'pt',
  children,
}) {
  const en = lang === 'en';
  const finalCancelLabel = cancelLabel || (en ? 'Cancel' : 'Cancelar');
  const finalConfirmLabel = confirmLabel || (en ? 'Save' : 'Salvar');
  const hasFooter = !!(onCancel || onConfirm || footerCenter || footerBeforeConfirm);

  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    // Sem onClose, o modal é bloqueante de propósito (ex.: PlanoEscolhaModal —
    // onboarding obrigatório) — Escape não faz nada nesse caso.
    const onKey = (e) => { if (e.key === 'Escape' && onCloseRef.current) onCloseRef.current(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div className="menestrel-ui ms-backdrop">
      {/* Sem onClick aqui de propósito: clique fora NÃO fecha o modal
          (decisão de produto — ver cabeçalho do componente). Fechar só
          via "x", via Cancelar, ou via Escape. */}
      <div
        className={['ms-modal', `ms-${size}`, extraClass].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
      >
        {/* ── Header ── */}
        <div className="ms-header">
          <h3 className="ms-title">{title}</h3>
          {headerExtra && <div className="ms-header-extra">{headerExtra}</div>}
          {onClose && (
            <button
              type="button"
              className="ms-close"
              onClick={onClose}
              aria-label={en ? 'Close' : 'Fechar'}
            >
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* ── Body ── */}
        <div className="ms-body">
          {children}
        </div>

        {/* ── Footer ── */}
        {hasFooter && (
          <div className="ms-footer">
            <div className="ms-footer-left">
              {onCancel && (
                <button type="button" className="btn-ghost btn-md" onClick={onCancel} disabled={cancelDisabled}>
                  {finalCancelLabel}
                </button>
              )}
            </div>
            {footerCenter && <div className="ms-footer-center">{footerCenter}</div>}
            <div className="ms-footer-right">
              {footerBeforeConfirm}
              {onConfirm && (
                <button type="button" className="btn-primary btn-md" onClick={onConfirm} disabled={confirmDisabled}>
                  {finalConfirmLabel}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================== [09] UserMenu — popup do avatar (estilo Claude) ==============================
   Menu flutuante ancorado ACIMA do avatar, aberto ao clicar no avatar no rodapé da sidebar.
   Renderizado via portal (document.body) com posição fixa calculada a partir do anchor —
   necessário porque .mc-sidebar tem overflow:hidden (usado na animação de collapse) e cortaria
   um popup posicionado normalmente dentro dela.
   Fecha ao clicar fora, em Escape, ou em scroll/resize.
   Cabeçalho: avatar + nome + email.
   Seletor inline de perfil (Mestre/Jogador) que persiste na hora, sem botão Salvar.
   Itens: Idioma (expande inline) + Plano + Ajuda + Sair.
*/

// Estilo-base das linhas do menu de usuário.
const MENU_ITEM_STYLE = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
  padding: '7px 6px', borderRadius: 6, border: 'none', background: 'transparent',
  color: '#E8DDC6', fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", fontSize: 13,
  cursor: 'pointer', textAlign: 'left', transition: 'background .14s ease',
};

// Linha de menu com hover via ESTADO (não via CSS :hover). O reset global do projeto,
// `.menestrel-ui :where(button){background:none}`, define o fundo do botão como estilo de baixa
// especificidade, mas qualquer `background` inline (como o `transparent` do estilo-base) venceria
// um `.mc-usermenu button:hover` de CSS. Aplicando o fundo do hover INLINE via estado, a iluminação
// sempre vence. Definido FORA do UserMenu para ser um tipo de componente estável (não remonta a
// cada render do pai, o que resetaria o estado de hover ao abrir/fechar o submenu de idioma).
function MenuRow({ children, onClick, disabled, danger, extraStyle, title }) {
  const [hover, setHover] = useState(false);
  const bg = disabled ? 'transparent'
    : hover ? (danger ? 'rgba(200,33,44,0.14)' : 'rgba(232,221,198,0.07)')
    : 'transparent';
  return (
    <button
      role="menuitem"
      title={title}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...MENU_ITEM_STYLE, background: bg, cursor: disabled ? 'not-allowed' : 'pointer', ...extraStyle }}>
      {children}
    </button>
  );
}

function UserMenu({ anchorRef, email, fullName, avatarUrl, firstName, planoBadge, planoPago, lang, setLang, profile, onSetProfile, onHelp, onLogout, onClose }) {
  const ref = React.useRef(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    const updatePos = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ left: r.left, bottom: window.innerHeight - r.top + 8 });
    };
    updatePos();

    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target) && anchorRef.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };

    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose, anchorRef]);

  const [langOpen, setLangOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);

  const t = {
    roleLabel: lang === 'en' ? 'Role'     : 'Perfil',
    master:    lang === 'en' ? 'Master'   : 'Mestre',
    player:    lang === 'en' ? 'Player'   : 'Jogador',
    planLabel: lang === 'en' ? 'Plan'     : 'Plano',
    language:  lang === 'en' ? 'Language' : 'Idioma',
    help:      lang === 'en' ? 'Help'     : 'Ajuda',
    logout:    lang === 'en' ? 'Sign out' : 'Sair',
    soon:      lang === 'en' ? 'Coming soon' : 'Em breve',
    langLabel: lang === 'pt' ? 'PT-BR' : 'EN',
  };

  if (!pos) return null;

  return ReactDOM.createPortal(
    <div
      ref={ref}
      className="menestrel-ui mc-usermenu"
      role="menu"
      // Eventos do React propagam pela ÁRVORE REACT, não pela do DOM. Como o <UserMenu> é filho do
      // <div className="mc-user" onClick={toggleMenu}> na árvore (mesmo sendo portado pro body no DOM),
      // um clique aqui dentro subia até esse onClick e fazia setUserMenuOpen(v=>!v) → fechava o menu
      // inteiro ao clicar em "Perfil"/"Idioma". Conter o clique na raiz do menu impede esse vazamento;
      // os onClick internos (que já dispararam antes na fase de bubble) seguem funcionando normalmente.
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed', left: pos.left, bottom: pos.bottom, zIndex: 1000,
        width: 250, borderRadius: 6, padding: 6,
        background: '#1B1610', border: '1px solid rgba(201,164,78,0.22)',
      }}
    >
      <style>{`
        .mc-usermenu hr { border:none; border-top:1px solid rgba(232,221,198,0.08); margin:6px 4px; }
      `}</style>

      {/* ── Cabeçalho: avatar + nome/email ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px 12px', borderBottom: '1px solid rgba(232,221,198,0.08)', marginBottom: 6 }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={firstName || ''} referrerPolicy="no-referrer"
            style={{ width: 36, height: 36, borderRadius: 999, objectFit: 'cover', border: '1px solid rgba(201,164,78,0.35)', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: 999, display: 'grid', placeItems: 'center', background: 'rgba(106,85,48,0.35)', border: '1px solid rgba(106,85,48,0.50)', color: '#E8DDC6', fontWeight: 400, fontSize: 14, flexShrink: 0 }}>
            {(firstName || email || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          {fullName && fullName !== email && (
            <div style={{ fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", fontSize: 14, color: '#E8DDC6', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {fullName}
            </div>
          )}
          {email && (
            <div style={{ fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", fontSize: 12, color: '#9C8F73', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {email}
            </div>
          )}
        </div>
      </div>

      {/* ── Perfil (Mestre / Jogador) — item de menu que expande inline ── */}
      <div>
        <MenuRow onClick={() => { setRoleOpen((v) => !v); setLangOpen(false); }}>
          <Icon.Profile style={{ fontSize: 16, lineHeight: 1 }} />
          {t.roleLabel}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9C8F73' }}>{profile === 'master' ? t.master : t.player}</span>
          <i className="ti ti-chevron-down" style={{ fontSize: 14, opacity: 0.6, transition: 'transform .14s ease', transform: roleOpen ? 'rotate(180deg)' : 'none' }} aria-hidden="true" />
        </MenuRow>
        {roleOpen && (
          <div style={{ paddingLeft: 28, display: 'flex', flexDirection: 'column' }}>
            <MenuRow onClick={() => { onSetProfile('master'); setRoleOpen(false); }}>
              {profile === 'master' && <Icon.Check style={{ fontSize: 14, lineHeight: 1, color: '#C9A44E' }} />} {t.master}
            </MenuRow>
            <MenuRow onClick={() => { onSetProfile('player'); setRoleOpen(false); }}>
              {profile === 'player' && <Icon.Check style={{ fontSize: 14, lineHeight: 1, color: '#C9A44E' }} />} {t.player}
            </MenuRow>
          </div>
        )}
      </div>

      {/* ── Idioma — mostra valor atual, expande inline (abaixo) pra trocar ── */}
      <div>
        <MenuRow onClick={() => { setLangOpen((v) => !v); setRoleOpen(false); }}>
          <Icon.Language style={{ fontSize: 16, lineHeight: 1 }} />
          {t.language}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9C8F73' }}>{t.langLabel}</span>
          <i className="ti ti-chevron-down" style={{ fontSize: 14, opacity: 0.6, transition: 'transform .14s ease', transform: langOpen ? 'rotate(180deg)' : 'none' }} aria-hidden="true" />
        </MenuRow>
        {langOpen && (
          <div style={{ paddingLeft: 28, display: 'flex', flexDirection: 'column' }}>
            <MenuRow onClick={() => { setLang('pt'); setLangOpen(false); onClose(); }}>
              {lang === 'pt' && <Icon.Check style={{ fontSize: 14, lineHeight: 1, color: '#C9A44E' }} />} Português (Brasil)
            </MenuRow>
            <MenuRow onClick={() => { setLang('en'); setLangOpen(false); onClose(); }}>
              {lang === 'en' && <Icon.Check style={{ fontSize: 14, lineHeight: 1, color: '#C9A44E' }} />} English
            </MenuRow>
          </div>
        )}
      </div>

      <hr />

      {/* ── Plano (desativado por enquanto, mostra valor atual) ── */}
      <MenuRow disabled title={t.soon} extraStyle={{ opacity: 0.55 }}>
        <i className="ti ti-credit-card" style={{ fontSize: 16, lineHeight: 1 }} aria-hidden="true" />
        {t.planLabel}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9C8F73' }}>{planoBadge}</span>
      </MenuRow>

      <MenuRow onClick={() => { onClose(); if (onHelp) onHelp(); }}>
        <Icon.Help style={{ fontSize: 16, lineHeight: 1 }} />
        {t.help}
      </MenuRow>

      <hr />

      <MenuRow danger onClick={() => { onClose(); onLogout(); }} extraStyle={{ color: '#E08A7C' }}>
        <Icon.Logout style={{ fontSize: 16, lineHeight: 1, color: '#C0563F' }} />
        {t.logout}
      </MenuRow>
    </div>,
    document.body
  );
}

/* ============================== [10] AdminConsole — moldura migrada (Grimório do dragão) ==============================
   Substitui a função AdminConsole inteira em src/10-shell/shell.jsx
   (de `function AdminConsole(...) {` até o `}` logo antes de `function App() {`).
   NÃO mexer no Object.assign(window, { ... AdminConsole ... }) do fim do arquivo.

   O que mudou: SÓ a moldura (fundo + glows + sidebar + container do main) virou visual novo,
   inline + tokens (regra de ouro). Toda a lógica (perfil, seções, persistência) e o SWITCH das abas
   continuam idênticos — o conteúdo de cada aba segue no estilo legado, pra migrarmos um a um depois.
   `onViewLanding` continua disponível (hoje sem uso) caso queira um link "ver site" na sidebar.
*/
function AdminConsole({ user, userProfile, onLogout, lang, setLang, onViewLanding }) {
  const ac = ADMIN_COPY[lang] || ADMIN_COPY.pt;

  // Perfil persistido. Padrão = master.
  const [profile, setProfile] = useState(() => {
    try { return localStorage.getItem('menestrel.profile') || 'master'; }
    catch (e) { return 'master'; }
  });
  useEffect(() => {
    try { localStorage.setItem('menestrel.profile', profile); } catch (e) {}
    // Persiste também no Supabase (ignora silenciosamente se a coluna não existir ainda)
    if (user && user.id) {
      supabaseClient
        .from('profiles')
        .update({ perfil_tipo: profile })
        .eq('id', user.id)
        .then(() => {});
    }
  }, [profile]);

  // Seção atual também persiste. Se trocou de perfil e a seção não existe mais lá, cai na primeira.
  // "inventario" e "loja" foram removidos do menu lateral.
  const SECTIONS_OCULTAS = ['inventario', 'loja'];
  const sections = (ADMIN_SECTIONS[profile] || []).filter((s) => !SECTIONS_OCULTAS.includes(s.id));
  const [currentId, setCurrentId] = useState(() => {
    try { return localStorage.getItem('menestrel.section') || sections[0].id; }
    catch (e) { return sections[0].id; }
  });
  useEffect(() => {
    if (!sections.find((s) => s.id === currentId)) {
      setCurrentId(sections[0].id);
    }
  }, [profile, sections, currentId]);
  useEffect(() => {
    try { localStorage.setItem('menestrel.section', currentId); } catch (e) {}
  }, [currentId]);

  const current = sections.find((s) => s.id === currentId) || sections[0];
  const sectionMeta = ac.sections[current.id] || { label: current.id };
  const isWide = ['criaturas', 'magias', 'habilidades', 'tecnicas', 'itens', 'fichas', 'personagens_j', 'personagens_m', 'historias', 'convites'].includes(current.id);

  // Sidebar retrátil ("collapse"). Estado persiste entre sessões, igual perfil/seção.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('menestrel.sidebarCollapsed') === '1'; }
    catch (e) { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('menestrel.sidebarCollapsed', sidebarCollapsed ? '1' : '0'); } catch (e) {}
  }, [sidebarCollapsed]);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const avatarRef = React.useRef(null);

  const fullName = (user.user_metadata && user.user_metadata.full_name) || user.email;
  const firstName = fullName.split(' ')[0];
  const avatarUrl = user.user_metadata && (user.user_metadata.avatar_url || user.user_metadata.picture);
  const planoPago = userProfile ? userProfile.plano === 'paid' : false;
  const planoBadge = planoPago ? 'Premium' : (lang === 'en' ? 'Free' : 'Gratuito');

  return (
    <>
      <div className="menestrel-ui mc-root">
        <style>{`
          .mc-root { display:flex; height:100vh; width:100%; position:relative; overflow:hidden;
            background: radial-gradient(120% 80% at 50% -10%, #2A1E10 0%, #15120C 48%, #100B05 100%);
            color:#E8DDC6; font-family:'Plus Jakarta Sans',system-ui,sans-serif; }
          .mc-glow { position:absolute; z-index:0; pointer-events:none; border-radius:6px; filter:blur(90px); }
          .mc-sidebar { position:relative; z-index:2; flex:0 0 208px; height:100%;
            display:flex; flex-direction:column; padding:16px 10px; overflow:hidden;
            background:rgba(18,13,6,0.90); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
            border-right:1px solid rgba(106,85,48,0.20);
            transition: flex-basis .32s cubic-bezier(.4,0,.2,1), padding .32s cubic-bezier(.4,0,.2,1),
              opacity .2s ease, border-color .32s ease; }
          .mc-sidebar.is-collapsed { flex-basis:64px; padding:16px 8px; align-items:center; }
          .mc-sidebar-toggle { position:absolute; z-index:3; top:32px; left:192px; width:32px; height:32px;
            display:grid; place-items:center; border-radius:50%; cursor:pointer;
            background:#1B1610; border:1px solid rgba(201,164,78,0.35); color:#C9A44E;
            transition:left .32s cubic-bezier(.4,0,.2,1), background .16s ease, border-color .16s ease; }
          .mc-sidebar-toggle:hover { background:#241B0E; border-color:rgba(201,164,78,0.55); box-shadow:inset 0 0 0 999px rgba(201,164,78,0.16); }
          .mc-sidebar-toggle.is-collapsed { left:48px; }
          .mc-sidebar-toggle i { display:flex; align-items:center; justify-content:center; line-height:1; transition:transform .32s cubic-bezier(.4,0,.2,1); }
          .mc-sidebar-toggle.is-collapsed i { transform:rotate(180deg); }
          .mc-nav { display:flex; flex-direction:column; gap:2px; flex:1; min-height:0; overflow-y:auto; overflow-x:hidden;
            width:100%; padding-top:20px; }
          .mc-nav::-webkit-scrollbar { width:0; }
          .mc-navitem { position:relative; display:flex; align-items:center; gap:10px;
            width:100%; padding:9px 10px; border-radius:6px; cursor:pointer;
            border:none; background:transparent; color:#9C8F73;
            font-family:'Plus Jakarta Sans',sans-serif; font-weight:500; font-size:13px; line-height:1.2;
            white-space:nowrap; overflow:hidden;
            transition:background .16s ease,color .16s ease; }
          .mc-navitem:hover { background:rgba(232,221,198,0.06); color:#E8DDC6; }
          .mc-navitem.is-active { background:rgba(201,164,78,0.12); color:#C9A44E; }
          .mc-navitem.is-active::before { content:''; position:absolute; left:-10px; top:6px; bottom:6px; width:3px;
            border-radius:0 3px 3px 0; background:#C9A44E; }
          .mc-sidebar.is-collapsed .mc-navitem.is-active::before { left:-8px; }
          .mc-navitem i { flex:0 0 auto; font-size:20px; line-height:1; }
          .mc-navitem span { overflow:hidden; text-overflow:ellipsis; }
          .mc-sidebar.is-collapsed .mc-navitem { justify-content:center; padding:9px; }
          .mc-sidebar.is-collapsed .mc-navitem span { display:none; }
          .mc-user { display:flex; align-items:center; gap:10px; width:100%; padding:9px 10px; margin-top:8px;
            border-top:1px solid rgba(232,221,198,0.08); border-radius:6px; flex:0 0 auto; cursor:pointer;
            background:transparent; transition:background .16s ease; }
          .mc-user:hover { background:rgba(232,221,198,0.06); }
          .mc-sidebar.is-collapsed .mc-user { justify-content:center; padding:9px; border-top:none; }
          .mc-user-name { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
            font-size:13px; color:#E8DDC6; font-weight:500; }
          .mc-sidebar.is-collapsed .mc-user-name { display:none; }
          .mc-sidebar.is-collapsed .mc-user i.ti-chevron-right { display:none; }
          .mc-main { position:relative; z-index:1; flex:1; width:0; height:100%; overflow-y:auto;
            padding:32px clamp(20px,4vw,56px); }
          .mc-content { margin:0 auto; width:100%; }
        `}</style>

        {/* glows ambiente (fogo-e-gelo) */}
        <div className="mc-glow" aria-hidden="true" style={{ left: '-12%', bottom: '-18%', width: '48vw', height: '48vw', opacity: 0.5, background: 'radial-gradient(circle at 50% 50%, rgba(106,85,48,0.85), rgba(106,85,48,0.30) 46%, transparent 70%)' }} />
        <div className="mc-glow" aria-hidden="true" style={{ right: '-12%', top: '-16%', width: '42vw', height: '42vw', opacity: 0.4, background: 'radial-gradient(circle at 50% 50%, rgba(184,112,46,0.60), rgba(200,33,44,0.22) 46%, transparent 70%)' }} />

        {/* SIDEBAR */}
        <aside className={'mc-sidebar' + (sidebarCollapsed ? ' is-collapsed' : '')}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 16px' }}>
            <svg viewBox="0 0 44 44" width="32" height="32" aria-label="Menestrel">
              <defs>
                <linearGradient id="mc-ring" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#B8472F" />
                  <stop offset="0.3" stopColor="#B8702E" />
                  <stop offset="0.55" stopColor="#C9A44E" />
                  <stop offset="0.8" stopColor="#B8862E" />
                  <stop offset="1" stopColor="#7A5E2A" />
                </linearGradient>
              </defs>
              <circle cx="22" cy="22" r="16" fill="none" stroke="url(#mc-ring)" strokeWidth="5"
                      strokeLinecap="round" strokeDasharray="86 16" transform="rotate(-90 22 22)" />
            </svg>
          </div>

          <nav className="mc-nav">
            {sections.map((s) => {
              const IconComp = Icon[s.icon] || Icon.Scroll;
              const meta = ac.sections[s.id] || { label: s.id };
              return (
                <button
                  key={s.id}
                  className={'mc-navitem' + (currentId === s.id ? ' is-active' : '')}
                  onClick={() => setCurrentId(s.id)}
                  title={meta.label}>
                  <IconComp />
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mc-user" style={{ position: 'relative' }} onClick={() => setUserMenuOpen((v) => !v)}>
            {avatarUrl ? (
              <img
                ref={avatarRef}
                src={avatarUrl} alt={firstName} referrerPolicy="no-referrer"
                title={firstName}
                style={{ width: 30, height: 30, borderRadius: 999, objectFit: 'cover', border: '1px solid rgba(201,164,78,0.35)', flexShrink: 0, cursor: 'pointer' }} />
            ) : (
              <div
                ref={avatarRef}
                title={firstName}
                style={{ width: 30, height: 30, borderRadius: 999, display: 'grid', placeItems: 'center', background: 'rgba(106,85,48,0.35)', border: '1px solid rgba(106,85,48,0.50)', color: '#E8DDC6', fontWeight: 400, fontSize: 13, flexShrink: 0, cursor: 'pointer' }}>
                {firstName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="mc-user-name">{firstName}</span>
            <Icon.ChevronRight style={{ fontSize: 14, opacity: 0.6, flexShrink: 0 }} />

            {userMenuOpen && (
              <UserMenu
                anchorRef={avatarRef}
                email={user.email}
                fullName={fullName !== user.email ? fullName : null}
                avatarUrl={avatarUrl}
                firstName={firstName}
                planoBadge={planoBadge}
                planoPago={planoPago}
                profile={profile}
                onSetProfile={setProfile}
                lang={lang}
                setLang={setLang}
                onLogout={onLogout}
                onClose={() => setUserMenuOpen(false)}
              />
            )}
          </div>
        </aside>

        {/* Botão flutuante que retrai/expande a sidebar */}
        <button
          className={'mc-sidebar-toggle' + (sidebarCollapsed ? ' is-collapsed' : '')}
          onClick={() => setSidebarCollapsed((v) => !v)}
          title={sidebarCollapsed ? (lang === 'en' ? 'Expand menu' : 'Expandir menu') : (lang === 'en' ? 'Collapse menu' : 'Recolher menu')}
          aria-label={sidebarCollapsed ? (lang === 'en' ? 'Expand menu' : 'Expandir menu') : (lang === 'en' ? 'Collapse menu' : 'Recolher menu')}
        >
          <Icon.ChevronLeft style={{ fontSize: 15, lineHeight: 1 }} />
        </button>

        {/* CONTEÚDO (switch das abas — inalterado; estilo legado por enquanto) */}
        <main className="mc-main">
          <div className="mc-content" style={{ maxWidth: isWide ? 'none' : 860 }}>
            {current.id === 'criaturas' ? (
              <CriaturasList ac={ac} lang={lang} />
            ) : current.id === 'personagens_j' ? (
              <PersonagensList ac={ac} lang={lang} profile="player" currentUserId={user.id} userProfile={userProfile} soAcoes={['modal', 'editar', 'evoluir', 'deletar']} />
            ) : current.id === 'personagens_m' ? (
              <PersonagensList ac={ac} lang={lang} profile="master" currentUserId={user.id} userProfile={userProfile} />
            ) : current.id === 'fichas' ? (
              <FichasJogador ac={ac} lang={lang} currentUserId={user.id} />
            ) : current.id === 'magias' ? (
              <MagiasList ac={ac} lang={lang} />
            ) : current.id === 'habilidades' ? (
              <HabilidadesList ac={ac} lang={lang} />
            ) : current.id === 'tecnicas' ? (
              <TecnicasList ac={ac} lang={lang} />
            ) : current.id === 'itens' ? (
              <ItensList ac={ac} lang={lang} />
            ) : current.id === 'historias' ? (
              <HistoriasList ac={ac} lang={lang} currentUserId={user.id} userProfile={userProfile} />
            ) : current.id === 'convites' ? (
              <ConvitesJogador lang={lang} currentUserId={user.id} />
            ) : (
              <AdminEmpty ac={ac} sectionLabel={sectionMeta.label} />
            )}
          </div>
        </main>
      </div>
    </>
  );
}

/* ============================== [25] App — Raiz da aplicação ============================== */
function App() {
  const [tweaks, setTweak] = useTweaks(TWEAKS_DEFAULTS);
  const [signupOpen, setSignupOpen] = useState(false);
  const closeSignup = React.useCallback(() => setSignupOpen(false), []);
  const [user, setUser] = useState(null);  // sessão Supabase
  const [profile, setProfile] = useState(null); // { plano, plano_escolhido_em }
  const [previewLanding, setPreviewLanding] = useState(false); // user logado escolheu ver a landing

  // Carrega/recarrega o profile do usuário (chamada depois do login e
  // depois de confirmar um plano no PlanoEscolhaModal).
  const carregarProfile = async (authUser) => {
    const userId = authUser && authUser.id;
    if (!userId) { setProfile(null); return; }
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('plano, plano_escolhido_em, pj_ativo_id')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('[profile] carga falhou:', error);
      setProfile({ plano: 'free', plano_escolhido_em: new Date().toISOString() });
      return;
    }
    if (data) {
      setProfile(data);
    } else {
      // Trigger de signup ainda não criou a linha (corrida) ou não rodou.
      // Cria via upsert JÁ COM os metadados do OAuth pra a linha nunca nascer
      // sem esses campos. onConflict:'id' = idempotente se o trigger commitar
      // logo em seguida. NÃO toca plano_escolhido_em (preserva o onboarding).
      const meta = (authUser && authUser.user_metadata) || {};
      const { error: insErr } = await supabaseClient
        .from('profiles')
        .upsert({
          id: userId,
          plano: 'free',
          email: authUser.email || null,
          full_name: meta.full_name || meta.name || null,
          avatar_url: meta.avatar_url || meta.picture || null,
        }, { onConflict: 'id' });
      if (insErr) console.error('[profile] upsert fallback falhou:', insErr);
      setProfile({ plano: 'free', plano_escolhido_em: null });
    }
  };

  // ── Tema
  // Valor da preferência do usuário: 'dark' | 'light' | 'auto'
  // Persiste em localStorage para sobreviver entre sessões.
  const [theme, setThemePref] = useState(() => {
    try {
      const stored = localStorage.getItem('menestrel.theme');
      if (stored === 'dark' || stored === 'light' || stored === 'auto') return stored;
    } catch (e) {}
    return tweaks.theme || 'dark';
  });
  const setTheme = (v) => {
    setThemePref(v);
    try { localStorage.setItem('menestrel.theme', v); } catch (e) {}
  };
  // Tema EFETIVO (resolvido): se for 'auto', escolhe baseado na hora local.
  // 6h–17h59 → light (dia); demais horas → dark (noite).
  const [effectiveTheme, setEffectiveTheme] = useState(() => {
    if (theme !== 'auto') return theme;
    const h = new Date().getHours();
    return (h >= 6 && h < 18) ? 'light' : 'dark';
  });
  useEffect(() => {
    const resolve = () => {
      if (theme !== 'auto') { setEffectiveTheme(theme); return; }
      const h = new Date().getHours();
      setEffectiveTheme((h >= 6 && h < 18) ? 'light' : 'dark');
    };
    resolve();
    if (theme !== 'auto') return undefined;
    // Em modo auto, reavalia a cada 5 minutos para pegar a virada do dia/noite
    const id = setInterval(resolve, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [theme]);

  const lang = tweaks.lang || 'pt';
  const mode = tweaks.mode || 'grimoire';
  const t = COPY[lang] || COPY.pt;

  useEffect(() => {
    document.body.setAttribute('data-mode', mode);
    document.body.setAttribute('data-theme', effectiveTheme);
    document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
  }, [mode, lang, effectiveTheme]);

  // Escutar sessão do Supabase
  useEffect(() => {
    (async () => {
      // 1. Se a URL tem #access_token=..., processa manualmente
      const hash = window.location.hash;
      if (hash.includes('access_token=')) {
        const params = new URLSearchParams(hash.slice(1)); // tira o #
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          const { data, error } = await supabaseClient.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) {
            console.error('[auth] setSession falhou:', error);
          } else {
            console.log('[auth] sessão criada manualmente:', data.session?.user?.email);
            // Limpa o hash da URL pra não ficar feio
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
      }

      // 2. Pega sessão (agora deve existir, seja do localStorage seja da que acabamos de criar)
      const { data: { session } } = await supabaseClient.auth.getSession();
      console.log('[auth] sessão final:', session?.user?.email);
      const u = session ? session.user : null;
      setUser(u);
      if (u) await carregarProfile(u);
      else setProfile(null);
    })();

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      const u = session ? session.user : null;
      setUser(u);
      if (u) {
        carregarProfile(u);
        setSignupOpen(false); // fecha o modal de signup quando logar
      } else {
        setProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const authCopy = AUTH_COPY[lang] || AUTH_COPY.pt;
  const adminCopy = ADMIN_COPY[lang] || ADMIN_COPY.pt;
  const openSignup = () => setSignupOpen(true);
  const logout = async () => {
    await supabaseClient.auth.signOut();
    setPreviewLanding(false);
  };
  const setLang = (l) => setTweak('lang', l);

  // Se está logado e NÃO está em modo preview da landing, mostra a Admin Console
  if (user && !previewLanding) {
    // Primeiro login (sem plano escolhido ainda) → onboarding sobreposto ao Console
    const precisaEscolherPlano = profile && !profile.plano_escolhido_em;
    return (
      <>
        <AdminConsole
          user={user}
          userProfile={profile}
          onLogout={logout}
          lang={lang}
          setLang={setLang}
          onViewLanding={() => setPreviewLanding(true)}
        />
        {precisaEscolherPlano && (
          <PlanoEscolhaModal
            lang={lang}
            userId={user.id}
            onChosen={() => carregarProfile(user)}
          />
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </>
    );
  }

  // Caso contrário, mostra a landing (logado em preview, ou deslogado)
  return (
    <>
      <Topbar t={t} lang={lang} setLang={setLang} onSignup={openSignup} user={user} onLogout={logout} authCopy={authCopy} theme={theme} setTheme={setTheme} effectiveTheme={effectiveTheme} />
      <Hero t={t} onSignup={openSignup} shader={tweaks.shader} shaderKind={tweaks.shaderKind} mode={mode} />
      <Opening t={t} />
      <HOrnament />
      <Pain t={t} />
      <HOrnament />
      <Solution t={t} />
      <HOrnament />
      <Benefits t={t} />
      <HOrnament />
      <Social t={t} />
      <HOrnament />
      <Plans t={t} onSignup={openSignup} />
      <HOrnament />
      <Guarantee t={t} />
      <HOrnament />
      <Scarcity t={t} onSignup={openSignup} lang={lang} />
      <HOrnament />
      <Objections t={t} />
      <HOrnament />
      <FAQ t={t} />
      <HOrnament />
      <FinalCTA t={t} onSignup={openSignup} />
      <Foot t={t} />

      {signupOpen && <SignupModal t={t} lang={lang} onClose={closeSignup} authCopy={authCopy} />}

      <TweaksPanel title="Tweaks">
        <TweakSection label={lang === 'en' ? 'Atmosphere' : 'Atmosfera'}>
          <TweakToggle
            label={lang === 'en' ? 'Shader background' : 'Fundo animado'}
            value={!!tweaks.shader}
            onChange={(v) => setTweak('shader', v)} />

          <TweakRadio
            label={lang === 'en' ? 'Effect' : 'Efeito'}
            value={tweaks.shaderKind || 'mesh'}
            options={[
              { value: 'mesh', label: lang === 'en' ? 'Mesh' : 'Mesh' },
              { value: 'rays', label: lang === 'en' ? 'Rays' : 'Raios' }]
            }
            onChange={(v) => setTweak('shaderKind', v)} />

          <TweakRadio
            label={lang === 'en' ? 'Mode' : 'Modo'}
            value={mode}
            options={[
              { value: 'grimoire', label: lang === 'en' ? 'Grimoire' : 'Grimório' },
              { value: 'modern', label: lang === 'en' ? 'Modern' : 'Moderno' }]
            }
            onChange={(v) => setTweak('mode', v)} />

          <TweakRadio
            label={lang === 'en' ? 'Language' : 'Idioma'}
            value={lang}
            options={[
              { value: 'pt', label: 'PT-BR' },
              { value: 'en', label: 'EN' }]
            }
            onChange={(v) => setTweak('lang', v)} />

        </TweakSection>
      </TweaksPanel>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>);

}

Object.assign(window, {
  ModalShell,
  FantasyDatePicker, Topbar, AdminEmpty, FichasJogador, AdminConsole, App,
});