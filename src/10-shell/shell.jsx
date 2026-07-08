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
  const [diaOpen, setDiaOpen] = useState(false);
  const [mesOpen, setMesOpen] = useState(false);
  const diaRef = React.useRef(null);
  const mesRef = React.useRef(null);

  const update = (k, v) => {
    const next = { ...val, [k]: Number(v) };
    const maxD = FANTASY_MONTHS[next.mes - 1]?.dias || 30;
    if (next.dia > maxD) next.dia = maxD;
    onChange(next);
  };

  // Fecha ao clicar fora
  useEffect(() => {
    if (!diaOpen && !mesOpen) return undefined;
    const handler = (e) => {
      if (diaRef.current && !diaRef.current.contains(e.target)) setDiaOpen(false);
      if (mesRef.current && !mesRef.current.contains(e.target)) setMesOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [diaOpen, mesOpen]);

  // Pill — mesmo visual do seletor de mesa (sem borda, fundo escuro translúcido)
  const pill = {
    background: 'rgba(106, 85, 48, 0.12)',
    border: 'none', borderRadius: 999, height: 32, outline: 'none',
    fontFamily: "'Lora', serif", fontSize: 13, flexShrink: 0,
  };

  // dropBtn — mesmo pill, mas com borda (padrão SelectPill/.select-pill-btn,
  // ver campo "Arma" em batalha.jsx) já que dia/mês agora usam essa classe.
  const dropBtn = {
    ...pill,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, width: '100%',
    color: '#E8DDC6', textAlign: 'left', border: 'none',
    padding: '0 12px 0 16px', cursor: 'pointer',
  };

  const dropList = {
    position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: '100%',
    background: 'rgba(18, 13, 6, 1)', border: 'none', borderRadius: 6,
    padding: 4, margin: 0, listStyle: 'none', zIndex: 60,
    maxHeight: 220, overflowY: 'auto',
  };

  const dropItem = (active) => ({
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
    fontFamily: "'Lora', serif", fontSize: 13,
    color: active ? '#C9A44E' : '#C8BCAA',
    background: 'transparent',
    whiteSpace: 'nowrap',
  });

  const chevron = (open) => (
    <i className="ti ti-chevron-down" aria-hidden="true"
       style={{ fontSize: 12, color: '#C9A44E', opacity: 0.7, flexShrink: 0,
                transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
  );

  return (
    <div className="menestrel-ui" style={{ display: 'grid', gridTemplateColumns: '70px 1fr 130px 80px', gap: 8 }}>

      {/* Dia — dropdown customizado, mesmo tipo de seletor do SelectPill (ver "Arma") */}
      <div ref={diaRef} style={{ position: 'relative' }}>
        <button type="button" className="select-pill-btn" data-open={diaOpen ? 'true' : 'false'} style={dropBtn} onClick={() => { setDiaOpen((v) => !v); setMesOpen(false); }}>
          <span>{val.dia}</span>
          {chevron(diaOpen)}
        </button>
        {diaOpen && (
          <ul className="fdp-drop" style={dropList}>
            {Array.from({ length: maxDias }, (_, i) => i + 1).map((d) => (
              <li key={d}
                style={dropItem(d === val.dia)}
                onMouseEnter={(e) => { if (d !== val.dia) e.currentTarget.style.background = 'rgba(106, 85, 48, 0.12);'; e.currentTarget.style.color = '#E8DDC6'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = d === val.dia ? '#C9A44E' : '#C8BCAA'; }}
                onClick={() => { update('dia', d); setDiaOpen(false); }}
              >
                {d}
                {d === val.dia && <i className="ti ti-check" style={{ fontSize: 12, color: '#C9A44E', flexShrink: 0 }} />}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Mês — dropdown customizado, mesmo tipo de seletor do SelectPill (ver "Arma") */}
      <div ref={mesRef} style={{ position: 'relative' }}>
        <button type="button" className="select-pill-btn" data-open={mesOpen ? 'true' : 'false'} style={dropBtn} onClick={() => { setMesOpen((v) => !v); setDiaOpen(false); }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {FANTASY_MONTHS[val.mes - 1]?.nome || ''}
          </span>
          {chevron(mesOpen)}
        </button>
        {mesOpen && (
          <ul className="fdp-drop" style={dropList}>
            {FANTASY_MONTHS.map((m) => (
              <li key={m.n}
                style={dropItem(m.n === val.mes)}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201,164,78,0.10)'; e.currentTarget.style.color = '#E8DDC6'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = m.n === val.mes ? '#C9A44E' : '#C8BCAA'; }}
                onClick={() => { update('mes', m.n); setMesOpen(false); }}
              >
                {m.nome}
                {m.n === val.mes && <i className="ti ti-check" style={{ fontSize: 12, color: '#C9A44E', flexShrink: 0 }} />}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dia da semana */}
      <input
        type="text"
        readOnly
        value={`✦ ${diaSemana}`}
        style={{ ...pill, border: 'none', color: '#C9A44E', cursor: 'default', padding: '0 16px', width: '100%' }}
      />

      {/* Ano */}
      <input
        type="number"
        min={0}
        className="fdp-ano"
        value={val.ano}
        onChange={(e) => update('ano', e.target.value)}
        style={{ ...pill, border: 'none', color: '#E8DDC6', padding: '0 16px', width: '100%' }}
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
  Scroll:   TI_cls('ti-book-2'),         // Histórias / Inventário
  Crown:    TI_cls('ti-mail'),           // Convites
  Compass:  TI_cls('ti-user'),          // Personagens (jogador)
  Tower:    TI_cls('ti-bat'),           // Criaturas
  Chest:    TI_cls('ti-backpack'),      // Itens
  Flame:    TI_cls('ti-meteor'),        // Magias
  Sword:    TI_cls('ti-bow'),           // Técnicas
  Shield:   TI_cls('ti-tools'),         // Habilidades
  Sheet:    TI_cls('ti-file-description'), // Loja / Itens (lista)
  BookOpen: TI_cls('ti-book'),          // Aventuras (histórias do jogador)

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
   Fontes (Cinzel + Lora) já vêm do projeto migrado; não precisa reimportar.
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
    fd: "'Cinzel',serif", fb: "'Lora',serif",
  };

  return (
    <div className="menestrel-ui" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', justifyContent: 'center', padding: '13px 24px' }}>
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
  color: '#E8DDC6', fontFamily: "'Lora',serif", fontSize: 13,
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
      style={{ position: 'fixed', left: pos.left, bottom: pos.bottom, zIndex: 1000 }}
    >
      {/* ── Cabeçalho: avatar + nome/email ── */}
      <div className="mc-um-header">
        {avatarUrl ? (
          <img src={avatarUrl} alt={firstName || ''} referrerPolicy="no-referrer"
            className="mc-um-avatar-img" />
        ) : (
          <div className="mc-um-avatar-initials">
            {(firstName || email || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="mc-um-names">
          {fullName && fullName !== email && (
            <div className="mc-um-fullname">{fullName}</div>
          )}
          {email && (
            <div className="mc-um-email">{email}</div>
          )}
        </div>
      </div>

      {/* ── Perfil (Mestre / Jogador) — item de menu que expande inline ── */}
      <div>
        <MenuRow onClick={() => { setRoleOpen((v) => !v); setLangOpen(false); }}>
          <Icon.Profile style={{ fontSize: 16, lineHeight: 1 }} />
          {t.roleLabel}
          <i className="ti ti-chevron-down" style={{ fontSize: 14, opacity: 0.6, transition: 'transform .14s ease', transform: roleOpen ? 'rotate(180deg)' : 'none' }} aria-hidden="true" />
        </MenuRow>
        {roleOpen && (
          <div className="mc-um-submenu">
            <MenuRow onClick={() => { onSetProfile('master'); setRoleOpen(false); }}>
              {t.master} {profile === 'master' && <Icon.Check style={{ fontSize: 14, lineHeight: 1, color: '#C9A44E', marginLeft: 'auto' }} />}
            </MenuRow>
            <MenuRow onClick={() => { onSetProfile('player'); setRoleOpen(false); }}>
              {t.player} {profile === 'player' && <Icon.Check style={{ fontSize: 14, lineHeight: 1, color: '#C9A44E', marginLeft: 'auto' }} />}
            </MenuRow>
          </div>
        )}
      </div>

      {/* ── Idioma — mostra valor atual, expande inline (abaixo) pra trocar ── */}
      <div>
        <MenuRow onClick={() => { setLangOpen((v) => !v); setRoleOpen(false); }}>
          <Icon.Language style={{ fontSize: 16, lineHeight: 1 }} />
          {t.language}
          <i className="ti ti-chevron-down" style={{ fontSize: 14, opacity: 0.6, transition: 'transform .14s ease', transform: langOpen ? 'rotate(180deg)' : 'none' }} aria-hidden="true" />
        </MenuRow>
        {langOpen && (
          <div className="mc-um-submenu">
            <MenuRow onClick={() => { setLang('pt'); setLangOpen(false); onClose(); }}>
              Português (Brasil) {lang === 'pt' && <Icon.Check style={{ fontSize: 14, lineHeight: 1, color: '#C9A44E', marginLeft: 'auto' }} />}
            </MenuRow>
            <MenuRow onClick={() => { setLang('en'); setLangOpen(false); onClose(); }}>
              English {lang === 'en' && <Icon.Check style={{ fontSize: 14, lineHeight: 1, color: '#C9A44E', marginLeft: 'auto' }} />}
            </MenuRow>
          </div>
        )}
      </div>

      <hr />

      {/* ── Plano (desativado por enquanto, mostra valor atual) ── */}
      <MenuRow disabled title={t.soon} extraStyle={{ opacity: 0.55 }}>
        <i className="ti ti-credit-card" style={{ fontSize: 16, lineHeight: 1 }} aria-hidden="true" />
        {t.planLabel}
        <span className="mc-um-plan-badge">{planoBadge}</span>
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

// ── Tooltip local do AdminConsole ────────────────────────────────────────────
// useTooltip e Tooltip são definidos em 01-core mas não ficam no window.
// Como shell.jsx carrega antes de inventario/ficha, implementação local autônoma —
// mesmo padrão visual (.mn-tip + .mn-tip-title/.mn-tip-desc), sem dependência externa.
function useNavTooltip(delay) {
  const [tip, setTip] = React.useState(null);
  const timerRef = React.useRef(null);
  const abrirTip = React.useCallback((e, content) => {
    clearTimeout(timerRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    timerRef.current = setTimeout(() => {
      setTip({ rect, content });
    }, delay || 0);
  }, [delay]);
  const fecharTip = React.useCallback(() => {
    clearTimeout(timerRef.current);
    setTip(null);
  }, []);
  const manterTip = React.useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);
  return [tip, abrirTip, fecharTip, manterTip];
}
function NavTooltip({ tip, onEnter, onLeave }) {
  if (!tip) return null;
  const { rect, content } = tip;
  const left = rect.right + 10;
  const top  = rect.top + rect.height / 2;
  // content pode ser string ou { title }
  const label = typeof content === 'string' ? content : (content?.title || '');
  if (!label) return null;
  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', left, top, transform: 'translateY(-50%)',
        zIndex: 9999,
        background: '#141009',
        borderRadius: 6, padding: '12px 12px 12px 12px',
        pointerEvents: 'none', whiteSpace: 'nowrap',
        animation: 'fpItemTipIn .12s ease-out',
        fontFamily: "'Lora', serif", fontSize: 12, color: '#E8DDC6',
      }}
    >
      {/* seta apontando para a esquerda */}
      <div style={{
        position: 'absolute', right: '100%', top: '50%', transform: 'translateY(-50%)',
        borderWidth: 5, borderStyle: 'solid',
        borderColor: 'transparent #141009 transparent transparent',
        width: 0, height: 0,
      }} />
      {label}
    </div>,
    document.body
  );
}

/* ============================== [9] CentralMensagens — feed retrátil de eventos da mesa ==============================
   Notifica TODOS na mesma mesa (Mestre + Jogadores) sobre avisos/ações
   uns dos outros (ex.: "Victor usou Alfabetização (Médio) e obteve uma
   falha."). Aparece em qualquer tela do AdminConsole, montada uma única
   vez fora do switch de seções — para ambos os perfis (ver chamada no
   fim do AdminConsole).

   ESTADO ATUAL: dados reais via Supabase. Histórico vem de
   listar_eventos_mesa(historiaId) (RPC, SECURITY DEFINER — já valida
   que o usuário é Mestre da história ou tem PJ vinculado); eventos novos
   chegam por Realtime (subscrição em mesa_log filtrada por historia_id).
   Quem GRAVA evento usa registrar_evento_mesa (RPC) — ver
   src/11-ficha/ficha.jsx (aoResolverTesteHabilidade) para o primeiro
   produtor real (teste de habilidade).

   Sem historiaId (Mestre sem mesa selecionada, ou Jogador sem PJ
   vinculado a uma história) o componente não monta nada — não tem o
   que mostrar.

   Tipos de evento (`tipo`) — mesmo enum da tabela mesa_log:
   magia, ataque, tecnica, item, teste, sistema, aviso.

   Comportamento (compactado a pedido do usuário — ocupar pouco espaço):
   - Retraído: botão circular flutuante (canto inferior direito) com
     badge de não-lidas.
   - Mensagem nova chega → abre a gaveta automaticamente, mostra, depois
     retrai sozinha após alguns segundos.
   - Gaveta SEM cabeçalho (só a lista) e com ALTURA FIXA pequena (ver
     .cm-drawer no CSS) — mostra só algumas mensagens por vez, scroll
     interno pra ver as mais antigas. Mais recente no topo.
   - Exibe as últimas 20 mensagens (a tabela no banco não tem esse teto —
     ver listar_eventos_mesa — só a UI mantém a janela de 20).
*/
const MSG_TIPO_ICON = {
  magia: 'ti-meteor',
  ataque: 'ti-bow',
  tecnica: 'ti-sword',
  item: 'ti-backpack',
  teste: 'ti-dice',
  sistema: 'ti-info-circle',
  aviso: 'ti-bell',
};

function MensagemEvento({ msg }) {
  const iconClass = MSG_TIPO_ICON[msg.tipo] || MSG_TIPO_ICON.sistema;
  return (
    <div className="cm-msg">
      <div className="cm-msg-icon">
        <i className={'ti ' + iconClass} aria-hidden="true" />
      </div>
      <div className="cm-msg-body">
        {msg.hora && <span className="cm-msg-hora">{msg.hora}</span>}
        <span className="cm-msg-texto">{msg.texto}</span>
      </div>
    </div>
  );
}

// Converte uma linha de mesa_log (banco) pro formato de exibição da gaveta.
function linhaParaMensagem(row, lang) {
  const dt = new Date(row.created_at);
  const locale = lang === 'en' ? 'en-US' : 'pt-BR';
  const dataHora = dt.toLocaleString(locale, {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
  return {
    id: 'db-' + row.id,
    tipo: row.tipo,
    texto: row.texto,
    hora: dataHora,
  };
}

function CentralMensagens({ lang, historiaId, sidebarLargura = 208 }) {
  const [mensagens, setMensagens] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [naoLidas, setNaoLidas] = useState(0);
  const retrairTimeoutRef = React.useRef(null);
  const vistosRef = React.useRef(new Set()); // ids já inseridos — evita duplicar entre carga inicial e Realtime
  // AudioContext reutilizável. Criado (e desbloqueado) na primeira interação
  // do usuário com o FAB — browsers bloqueiam AudioContext sem gesto prévio.
  const audioCtxRef = React.useRef(null);

  // Limpa timeout pendente ao desmontar.
  useEffect(() => () => {
    if (retrairTimeoutRef.current) clearTimeout(retrairTimeoutRef.current);
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch (_) {} }
  }, []);

  // Desbloqueia o AudioContext no primeiro clique em qualquer lugar da página.
  // Browsers exigem gesto do usuário — registrar no document garante que qualquer
  // interação (não só o FAB) seja suficiente para liberar o contexto.
  useEffect(() => {
    const desbloquear = () => {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
      } catch (_) {}
      // Remove o listener após o primeiro clique — não precisa mais.
      document.removeEventListener('click', desbloquear);
    };
    document.addEventListener('click', desbloquear);
    return () => document.removeEventListener('click', desbloquear);
  }, []);

  // Toca dois beeps curtos estilo notificação de sistema (notebook).
  // Beep 1: 1046 Hz (Dó5), Beep 2: 1318 Hz (Mi5) — intervalo de terça maior,
  // mesmo padrão de alertas do Windows/macOS. Cada beep: attack 5ms, sustain
  // 80ms, release 40ms. Volume baixo (0.14) para não assustar.
  const tocarSino = () => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state !== 'running') return;
      const beep = (freq, startTime) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.14, startTime + 0.005);
        gain.gain.setValueAtTime(0.14, startTime + 0.085);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.125);
        osc.start(startTime);
        osc.stop(startTime + 0.13);
      };
      const t = ctx.currentTime;
      beep(1046, t);        // Dó5 — primeiro beep
      beep(1318, t + 0.16); // Mi5  — segundo beep (160ms depois)
    } catch (_) {}
  };

  const abrirGaveta = (autoRetrair) => {
    setAberto(true);
    setNaoLidas(0);
    if (retrairTimeoutRef.current) clearTimeout(retrairTimeoutRef.current);
    if (autoRetrair) {
      retrairTimeoutRef.current = setTimeout(() => setAberto(false), 6000);
    }
  };

  const fecharGaveta = () => {
    setAberto(false);
    if (retrairTimeoutRef.current) { clearTimeout(retrairTimeoutRef.current); retrairTimeoutRef.current = null; }
  };

  // Carrega histórico (listar_eventos_mesa) e assina Realtime sempre que a
  // mesa (historiaId) muda — troca de mesa do Mestre, ou troca de PJ ativo
  // do Jogador. Limpa estado e desfaz a assinatura anterior antes de montar a nova.
  useEffect(() => {
    vistosRef.current = new Set();
    setMensagens([]);
    setNaoLidas(0);
    setAberto(false);
    if (!historiaId) return undefined;

    let cancel = false;
    (async () => {
      const { data, error } = await supabaseClient.rpc('listar_eventos_mesa', { p_historia_id: historiaId });
      if (cancel || error || !data) return;
      const ordenado = [...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20);
      ordenado.forEach((row) => vistosRef.current.add(row.id));
      setMensagens(ordenado.map((row) => linhaParaMensagem(row, lang)));
    })();

    const channel = supabaseClient
      .channel('mesa_log_' + historiaId)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mesa_log',
        filter: 'historia_id=eq.' + historiaId,
      }, (payload) => {
        const row = payload.new;
        if (!row || vistosRef.current.has(row.id)) return;
        vistosRef.current.add(row.id);
        setMensagens((prev) => [linhaParaMensagem(row, lang), ...prev].slice(0, 20));
        setNaoLidas((n) => n + 1);
        tocarSino(); // sino suave — AudioContext já desbloqueado pelo FAB
        abrirGaveta(true); // chegou mensagem nova -> expande e depois retrai sozinha
      })
      .subscribe();

    return () => { cancel = true; supabaseClient.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historiaId, lang]);

  if (!historiaId) return null; // sem mesa resolvida — nada pra acompanhar

  return (
    <div className="menestrel-ui cm-root">
      {/* Botão flutuante — sempre visível, retraído ou não */}
      <button
        type="button"
        className={'cm-fab' + (aberto ? ' is-active' : '')}
        onClick={() => { aberto ? fecharGaveta() : abrirGaveta(false); }}
        aria-label={lang === 'en' ? 'Table messages' : 'Mensagens da mesa'}
        aria-expanded={aberto}
      >
        <i className="ti ti-bell" aria-hidden="true" />
        {naoLidas > 0 && (
          <span className="cm-fab-badge">{naoLidas > 9 ? '9+' : naoLidas}</span>
        )}
      </button>

      {/* Gaveta — faixa fixa no rodapé, altura fixa pequena (ver CSS cm-drawer)
          + scroll interno. Sem cabeçalho — só a lista de mensagens (decisão
          combinada com o usuário pra ocupar menos espaço na tela). */}
      <div
        className={'cm-drawer' + (aberto ? ' is-open' : '')}
        role="log"
        aria-live="polite"
        aria-label={lang === 'en' ? 'Table messages' : 'Mensagens da mesa'}
      >
        <div className="cm-drawer-body" style={{ paddingLeft: `calc(${sidebarLargura}px + max(20px, (100vw - ${sidebarLargura}px - 1060px) / 2))`, paddingRight: `max(20px, (100vw - ${sidebarLargura}px - 1060px) / 2)` }}>
          {mensagens.length === 0 ? (
            <div className="cm-empty">{lang === 'en' ? 'No messages yet.' : 'Nenhuma mensagem ainda.'}</div>
          ) : (
            mensagens.map((m) => <MensagemEvento key={m.id} msg={m} />)
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================== [9.5] CardDataJogoAtual — card flutuante com data/local atual da mesa ==============================
   Mostra sempre (Mestre e Jogador) onde a aventura está agora — separado
   da "data de início" (data_inicio/data_jogo, fixas, só editadas na criação
   da história em NovaHistoriaModal). Este card lê/escreve historias.data_jogo_atual
   (jsonb: { dia, mes, ano, local }), que avança manualmente conforme o Mestre
   narra a passagem do tempo/viagem da mesa.

   Fixo no TOPO da tela (barra), igual decisão combinada com o usuário —
   diferente da CentralMensagens (FAB no rodapé). Convive bem com a Topbar
   porque só aparece dentro do AdminConsole (sessão/mesa ativa resolvida),
   nunca na landing.

   Mestre: clique no card → vira formulário inline (FantasyDatePicker + input
   de local) → Salvar grava direto em historias.data_jogo_atual (update
   simples, sem RPC — mesmo padrão de campo solto que NovaHistoriaModal usa
   pra data_inicio/data_jogo).
   Jogador: mesmo card, somente leitura (sem affordance de clique).

   Sem historiaId (mesa não resolvida) não monta nada — mesmo contrato da
   CentralMensagens.
*/
function CardDataJogoAtual({ lang, historiaId, podeEditar, minhasHistorias, mesaAtivaId, setMesaAtivaId, profile, onNovaHistoria, limiteFreeHistoria, esconderSeletorEBotaoNovo, sidebarLargura = 208, onNovoPersonagem, limiteFreePersonagem, esconderBotaoPersonagem }) {
  const [dataAtual, setDataAtual] = useState(null); // { dia, mes, ano, local } | null
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(null); // null | 'data' | 'local'
  const [rascunho, setRascunho] = useState({ dia: 1, mes: 1, ano: 0, local: '' });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [mesaDropOpen, setMesaDropOpen] = useState(false);
  const mesaDropRef = React.useRef(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    if (!mesaDropOpen) return undefined;
    const handler = (e) => {
      if (mesaDropRef.current && !mesaDropRef.current.contains(e.target)) setMesaDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mesaDropOpen]);

  // Carrega data_jogo_atual sempre que a mesa ativa muda (troca de história do
  // Mestre, ou troca de PJ ativo do Jogador) — mesmo gatilho de CentralMensagens.
  useEffect(() => {
    setEditando(null);
    setErro(null);
    if (!historiaId) { setDataAtual(null); setCarregando(false); return undefined; }
    let cancel = false;
    setCarregando(true);
    (async () => {
      const { data, error } = await supabaseClient
        .from('historias').select('data_jogo_atual').eq('id', historiaId).maybeSingle();
      if (cancel) return;
      setCarregando(false);
      if (error) { console.error('[data-jogo-atual] carga falhou:', error); return; }
      setDataAtual(data && data.data_jogo_atual ? data.data_jogo_atual : null);
    })();
    return () => { cancel = true; };
  }, [historiaId]);

  const abrirEdicao = (modo) => {
    if (!podeEditar) return;
    setRascunho({
      dia: (dataAtual && dataAtual.dia) || 1,
      mes: (dataAtual && dataAtual.mes) || 1,
      ano: (dataAtual && dataAtual.ano) || 0,
      local: (dataAtual && dataAtual.local) || '',
    });
    setErro(null);
    setEditando(modo);
  };

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    const payload = { dia: rascunho.dia, mes: rascunho.mes, ano: rascunho.ano, local: rascunho.local.trim() };
    const { error } = await supabaseClient
      .from('historias').update({ data_jogo_atual: payload }).eq('id', historiaId);
    setSalvando(false);
    if (error) {
      console.error('[data-jogo-atual] salvar falhou:', error);
      setErro(error.hint || error.message);
      return;
    }
    setDataAtual(payload);
    setEditando(null);
  };

  // Carregando ainda bloqueia tudo (evita flash). Sem historiaId mas com
  // onNovoPersonagem disponível, segue renderizando — é exatamente o caso de
  // um Jogador sem nenhum PJ ainda (sem PJ não há história vinculada, então
  // historiaId fica null), e o botão "Novo personagem" precisa aparecer pra
  // ele poder criar o primeiro. Sem historiaId e sem onNovoPersonagem (ex.:
  // outras abas, ou Mestre sem histórias), não há nada útil pra mostrar.
  if (carregando) return null;
  if (!historiaId && !onNovoPersonagem) return null;

  const en = lang === 'en';
  const mostrarSeletorMesa = profile === 'master' && minhasHistorias && minhasHistorias.length > 1 && setMesaAtivaId && !esconderSeletorEBotaoNovo;

  return (
    <div className="menestrel-ui cdj-root" style={{ left: sidebarLargura, transition: 'left .32s cubic-bezier(.4,0,.2,1)' }}>
      {mostrarSeletorMesa && (() => {
        const historiaAtiva = minhasHistorias.find((h) => h.id === mesaAtivaId);
        return (
          <div className="cdj-mesa-seletor" ref={mesaDropRef}>
            <button
              type="button"
              className={'cdj-mesa-pill' + (mesaDropOpen ? ' is-open' : '')}
              onClick={() => setMesaDropOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={mesaDropOpen}
              aria-label={en ? 'Active table' : 'Mesa ativa'}
            >
              <span className="cdj-mesa-titulo">{historiaAtiva ? historiaAtiva.titulo : '—'}</span>
              <i className="ti ti-chevron-down cdj-mesa-chevron" aria-hidden="true" />
            </button>
            {mesaDropOpen && (
              <ul className="cdj-mesa-lista" role="listbox">
                {minhasHistorias.map((h) => (
                  <li
                    key={h.id}
                    role="option"
                    aria-selected={h.id === mesaAtivaId}
                    className={'cdj-mesa-opcao' + (h.id === mesaAtivaId ? ' is-ativa' : '')}
                    onClick={() => { setMesaAtivaId(h.id); setMesaDropOpen(false); }}
                  >
                    {h.titulo}
                    {h.id === mesaAtivaId && <i className="ti ti-check" aria-hidden="true" />}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })()}
      {editando === null ? (
        historiaId && (
          <>
            <button
              type="button"
              className={'cdj-bar' + (podeEditar ? ' is-editavel' : '')}
              onClick={() => abrirEdicao('data')}
              disabled={!podeEditar}
              aria-label={en ? 'Current in-game date' : 'Data atual do jogo'}
            >
              <i className="ti ti-calendar-event" aria-hidden="true" />
              {dataAtual ? (
                <span className="cdj-data">
                  {(() => {
                    const nomeMes = FANTASY_MONTHS[dataAtual.mes - 1]?.nome || '';
                    const diaSemana = calcDiaSemanaFantasy(dataAtual.ano, dataAtual.mes, dataAtual.dia);
                    const nomeMesShort = nomeMes.replace(/^Mês /, '');
                    const diaSemanaCap = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1).toLowerCase();
                    return `${diaSemanaCap}, ${dataAtual.dia} ${nomeMesShort} de ${dataAtual.ano}`;
                  })()}
                </span>
              ) : (
                <span className="cdj-vazio">
                  {podeEditar
                    ? (en ? 'Set the current date' : 'Definir data atual')
                    : (en ? 'Date not set yet' : 'Data ainda não definida')}
                </span>
              )}
            </button>
            {dataAtual && dataAtual.local && (
              <button
                type="button"
                className={'cdj-bar' + (podeEditar ? ' is-editavel' : '')}
                onClick={() => abrirEdicao('local')}
                disabled={!podeEditar}
                aria-label={en ? 'Current in-game location' : 'Local atual do jogo'}
              >
                <i className="ti ti-map-pin" aria-hidden="true" />
                <span className="cdj-local">{dataAtual.local}</span>
              </button>
            )}
          </>
        )
      ) : editando === 'data' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', pointerEvents: 'auto' }}>
          <FantasyDatePicker
            value={{ dia: rascunho.dia, mes: rascunho.mes, ano: rascunho.ano }}
            onChange={(v) => setRascunho((r) => ({ ...r, ...v }))}
            lang={lang}
          />
          {/* Cancelar — btn-ghost padrão do sistema */}
          <button
            type="button"
            className="cdj-pill-btn"
            onClick={() => setEditando(null)}
            disabled={salvando}
            style={{
              background: 'rgba(106,85,48,0.12)',
              border: 'none', borderRadius: 999, height: 32, outline: 'none',
              fontFamily: "'Lora', serif", fontSize: 13, fontWeight: 600, flexShrink: 0,
              color: '#E8DDC6', padding: '0 20px', cursor: 'pointer', opacity: salvando ? 0.5 : 1,
            }}
          >
            {en ? 'Cancel' : 'Cancelar'}
          </button>
          {/* Salvar — btn-primary padrão do sistema */}
          <button
            type="button"
            className="cdj-pill-btn-salvar"
            onClick={salvar}
            disabled={salvando}
            style={{
              background: salvando ? 'rgba(201,164,78,0.5)' : 'linear-gradient(135deg,#C9A44E 0%,#B8702E 100%)',
              border: 'none', borderRadius: 999, height: 32, outline: 'none',
              fontFamily: "'Lora', serif", fontSize: 13, fontWeight: 600, flexShrink: 0,
              color: '#1C1407', padding: '0 20px', cursor: salvando ? 'default' : 'pointer',
            }}
          >
            {salvando ? (en ? 'Saving…' : 'Salvando…') : (en ? 'Save' : 'Salvar')}
          </button>
          {erro && (
            <span style={{ color: '#E08A6F', fontFamily: "'Lora', serif", fontSize: 12, flexBasis: '100%' }}>
              {erro}
            </span>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', pointerEvents: 'auto' }}>
          {/* Input local — pill escuro para edição */}
          <input
            type="text"
            value={rascunho.local}
            onChange={(e) => setRascunho((r) => ({ ...r, local: e.target.value }))}
            placeholder={en ? 'Current location' : 'Local atual'}
            autoFocus
            style={{
              background: 'rgba(24,17,8,0.92)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              border: 'none', borderRadius: 999, height: 32, outline: 'none',
              fontFamily: "'Lora', serif", fontSize: 13, color: '#E8DDC6',
              padding: '0 16px', width: 160, flexShrink: 0,
            }}
          />
          {/* Cancelar — btn-ghost padrão do sistema */}
          <button
            type="button"
            className="cdj-pill-btn"
            onClick={() => setEditando(null)}
            disabled={salvando}
            style={{
              background: 'rgba(106,85,48,0.12)',
              border: 'none', borderRadius: 999, height: 32, outline: 'none',
              fontFamily: "'Lora', serif", fontSize: 13, fontWeight: 600, flexShrink: 0,
              color: '#E8DDC6', padding: '0 20px', cursor: 'pointer', opacity: salvando ? 0.5 : 1,
            }}
          >
            {en ? 'Cancel' : 'Cancelar'}
          </button>
          {/* Salvar — btn-primary padrão do sistema */}
          <button
            type="button"
            className="cdj-pill-btn-salvar"
            onClick={salvar}
            disabled={salvando}
            style={{
              background: salvando ? 'rgba(201,164,78,0.5)' : 'linear-gradient(135deg,#C9A44E 0%,#B8702E 100%)',
              border: 'none', borderRadius: 999, height: 32, outline: 'none',
              fontFamily: "'Lora', serif", fontSize: 13, fontWeight: 600, flexShrink: 0,
              color: '#1C1407', padding: '0 20px', cursor: salvando ? 'default' : 'pointer',
            }}
          >
            {salvando ? (en ? 'Saving…' : 'Salvando…') : (en ? 'Save' : 'Salvar')}
          </button>
          {erro && (
            <span style={{ color: '#E08A6F', fontFamily: "'Lora', serif", fontSize: 12, flexBasis: '100%' }}>
              {erro}
            </span>
          )}
        </div>
      )}
      {profile === 'master' && onNovaHistoria && !editando && !esconderSeletorEBotaoNovo && (
        <button
          type="button"
          className="cdj-pill-btn-salvar"
          onClick={onNovaHistoria}
          disabled={!!limiteFreeHistoria}
          title={limiteFreeHistoria ? (en ? 'Free plan limit reached (2 stories)' : 'Limite do plano free atingido (2 histórias)') : undefined}
          style={{
            pointerEvents: 'auto',
            background: limiteFreeHistoria ? 'rgba(201,164,78,0.25)' : 'linear-gradient(135deg,#C9A44E 0%,#B8702E 100%)',
            border: 'none', borderRadius: 999, height: 32, outline: 'none',
            fontFamily: "'Lora', serif", fontSize: 13, fontWeight: 600, flexShrink: 0,
            color: limiteFreeHistoria ? '#9C8F73' : '#1C1407',
            padding: '0 18px 0 14px', cursor: limiteFreeHistoria ? 'help' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {en ? 'New story' : 'Nova história'}
        </button>
      )}
      {profile === 'player' && onNovoPersonagem && !editando && !esconderBotaoPersonagem && (
        <button
          type="button"
          className="cdj-pill-btn-salvar"
          onClick={onNovoPersonagem}
          disabled={!!limiteFreePersonagem}
          title={limiteFreePersonagem ? (en ? 'Free plan limit reached (3 characters)' : 'Limite do plano free atingido (3 personagens)') : undefined}
          style={{
            pointerEvents: 'auto',
            background: limiteFreePersonagem ? 'rgba(201,164,78,0.25)' : 'linear-gradient(135deg,#C9A44E 0%,#B8702E 100%)',
            border: 'none', borderRadius: 999, height: 32, outline: 'none',
            fontFamily: "'Lora', serif", fontSize: 13, fontWeight: 600, flexShrink: 0,
            color: limiteFreePersonagem ? '#9C8F73' : '#1C1407',
            padding: '0 18px 0 14px', cursor: limiteFreePersonagem ? 'help' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {en ? 'New character' : 'Novo personagem'}
        </button>
      )}
    </div>
  );
}

/* ============================== [9.5] Dado d10 "Gema Facetada" (inline) ==============================
   Dado de 10 faces (TRAPEZOEDRO PENTAGONAL — o formato real do d10, achatado
   no centro) + overlay de rolagem livre. Irmão do DadoD20/RolagemD20Overlay.

   Geometria derivada do sólido 3D correto: a amplitude do equador é
   h = c·(1-cos36°)/(1+cos36°) (faces planas); o RAIO do equador é livre, então
   foi alargado (R=1.20) para deixar o dado mais achatado/largo no meio.

   Estilo: facetas bronze sombreadas por face-normal (igual ao D20), aresta
   dourada e UM número na face-kite frontal central. 1 = brasa (falha crítica),
   10 = ouro (crítico).

   POR QUE INLINE: RolagemLivreFab precisa de window.RolagemD10Overlay; mantido
   aqui, o global é garantido sem depender de import em main.tsx. Registrado no
   window ao fim do bloco. */

var MS_D10_KEYFRAMES =
  ".ms-d10-svg{animation:msD10Float 5.5s ease-in-out infinite;transform-origin:center;will-change:transform}" +
  ".ms-d10-svg.is-rolling{animation:msD10Tumble .76s cubic-bezier(.34,.16,.2,1)}" +
  "@keyframes msD10Float{0%{transform:translateY(0) rotate(1.5deg)}50%{transform:translateY(-5px) rotate(-1.5deg)}100%{transform:translateY(0) rotate(1.5deg)}}" +
  "@keyframes msD10Tumble{0%{transform:rotate(0) scale(1)}30%{transform:rotate(-220deg) scale(1.08)}70%{transform:rotate(-560deg) scale(.95)}100%{transform:rotate(-720deg) scale(1)}}" +
  ".ms-d10-hit:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(201,164,78,0.6);border-radius:6px}" +
  "@media (prefers-reduced-motion:reduce){.ms-d10-svg,.ms-d10-svg.is-rolling{animation:none!important}}";

var DadoD10 = React.forwardRef(function DadoD10(props, ref) {
  var size = props.size;
  var disabled = !!props.disabled;
  var className = props.className || "";
  var initialValue = typeof props.initialValue === "number" ? props.initialValue : 10;

  var valueState = useState(initialValue);
  var value = valueState[0];
  var setValue = valueState[1];

  var rollingState = useState(false);
  var rolling = rollingState[0];
  var setRolling = rollingState[1];

  var rollingRef = useRef(false);
  var intervalRef = useRef(null);
  var timeoutRef = useRef(null);
  var onRollRef = useRef(props.onRoll);
  onRollRef.current = props.onRoll;

  useEffect(function () {
    if (document.getElementById("ms-d10-style")) return;
    var el = document.createElement("style");
    el.id = "ms-d10-style";
    el.textContent = MS_D10_KEYFRAMES;
    document.head.appendChild(el);
  }, []);

  useEffect(function () {
    return function () {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  var api = useRef({});
  api.current.roll = function (forcado) {
    if (rollingRef.current || disabled) return;
    rollingRef.current = true;
    setRolling(true);
    var reduz = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var assentar = function () {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      var v = typeof forcado === "number"
        ? Math.max(1, Math.min(10, Math.round(forcado)))
        : 1 + Math.floor(Math.random() * 10);
      setValue(v);
      setRolling(false);
      rollingRef.current = false;
      if (onRollRef.current) onRollRef.current(v);
    };
    if (reduz) { timeoutRef.current = setTimeout(assentar, 220); return; }
    intervalRef.current = setInterval(function () { setValue(1 + Math.floor(Math.random() * 10)); }, 55);
    timeoutRef.current = setTimeout(assentar, 760);
  };

  React.useImperativeHandle(ref, function () {
    return {
      roll: function (forcado) { api.current.roll(forcado); },
      isRolling: function () { return rollingRef.current; },
    };
  }, []);

  var crit = value === 1 ? "fail" : value === 10 ? "hit" : null;
  var numFill = crit === "fail" ? "#F0997B" : crit === "hit" ? "#FBE9B8" : "var(--foreground)";
  var glow =
    crit === "hit"
      ? "drop-shadow(0 10px 18px rgba(233,210,150,0.40))"
      : crit === "fail"
      ? "drop-shadow(0 10px 18px rgba(184,71,47,0.38))"
      : "drop-shadow(0 10px 18px rgba(201,164,78,0.22))";
  var haloBg =
    crit === "hit"
      ? "radial-gradient(circle, rgba(233,210,150,0.45), rgba(201,164,78,0) 70%)"
      : crit === "fail"
      ? "radial-gradient(circle, rgba(184,71,47,0.40), rgba(184,71,47,0) 70%)"
      : "radial-gradient(circle, rgba(201,164,78,0.28), rgba(201,164,78,0) 68%)";

  var dim = typeof size === "number" ? size + "px" : (size || "clamp(96px, 18vw, 150px)");

  return (
    <span
      className={"menestrel-ui ms-d10 " + className}
      style={{ display: "inline-block", width: dim, height: dim, lineHeight: 0 }}
    >
      <span
        className="ms-d10-hit"
        aria-hidden="true"
        style={{
          background: "none", border: "none", padding: 0, margin: 0,
          width: "100%", height: "100%", position: "relative",
          display: "grid", placeItems: "center", cursor: "default",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: "absolute", zIndex: 0, width: "118%", height: "118%",
            borderRadius: "50%", background: haloBg, filter: "blur(2px)",
            pointerEvents: "none", transition: "background .4s",
          }}
        />
        <svg
          className={"ms-d10-svg" + (rolling ? " is-rolling" : "")}
          viewBox="0 0 200 210"
          width="100%"
          height="100%"
          role="img"
          aria-hidden="true"
          style={{ position: "relative", zIndex: 1, filter: glow, transition: "filter .25s" }}
        >
          {/* ── Trapezoedro pentagonal (formato real do d10, face no topo) ── */}
          <polygon points="100.0,196.0 47.6,90.0 100.0,64.9 152.4,90.0" fill="rgba(66,49,21,0.12)" />
          <polygon points="100.0,14.0 100.0,64.9 152.4,90.0 184.7,86.0" fill="rgba(66,49,21,0.12)" />
          <polygon points="100.0,14.0 15.3,86.0 47.6,90.0 100.0,64.9" fill="rgba(66,49,21,0.14)" />
          <polygon points="100.0,196.0 152.4,90.0 184.7,86.0 184.7,124.0" fill="rgba(66,49,21,0.12)" />
          <polygon points="100.0,196.0 15.3,124.0 15.3,86.0 47.6,90.0" fill="rgba(66,49,21,0.12)" />
          <polygon points="100.0,14.0 184.7,86.0 184.7,124.0 152.4,120.0" fill="rgba(174,106,43,0.32)" />
          <polygon points="100.0,14.0 47.6,120.0 15.3,124.0 15.3,86.0" fill="rgba(240,196,93,0.30)" />
          <polygon points="100.0,196.0 184.7,124.0 152.4,120.0 100.0,145.1" fill="rgba(128,78,32,0.20)" />
          <polygon points="100.0,196.0 100.0,145.1 47.6,120.0 15.3,124.0" fill="rgba(143,116,55,0.24)" />
          <polygon points="100.0,14.0 152.4,120.0 100.0,145.1 47.6,120.0" fill="rgba(255,255,189,0.38)" />

          {/* Especular sutil na face frontal mais iluminada */}
          <polygon points="100.0,14.0 152.4,120.0 100.0,145.1 47.6,120.0" fill="rgba(255,248,230,0.14)" />

          {/* ── Arestas visíveis ── */}
          <path
            d="M100.0,14.0 L152.4,120.0 M152.4,120.0 L100.0,145.1 M100.0,145.1 L47.6,120.0 M47.6,120.0 L100.0,14.0 M47.6,120.0 L15.3,124.0 M15.3,124.0 L15.3,86.0 M15.3,86.0 L100.0,14.0 M184.7,86.0 L100.0,14.0 M184.7,86.0 L184.7,124.0 M184.7,124.0 L152.4,120.0 M100.0,196.0 L100.0,145.1 M15.3,124.0 L100.0,196.0 M184.7,124.0 L100.0,196.0"
            fill="none"
            stroke="rgba(233,214,160,0.42)"
            strokeWidth="0.8"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* ── Número central (ícone Tabler ti-number-N-small) ── */}
          <foreignObject x="40" y="70" width="120" height="70">
            <div xmlns="http://www.w3.org/1999/xhtml" style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <i
                className={"ti ti-number-" + value + "-small"}
                style={{
                  fontSize: "clamp(48px, 12vw, 80px)",
                  color: numFill,
                  transition: "color .25s",
                  filter: "drop-shadow(0 1px 2px rgba(28,20,7,0.55))",
                  lineHeight: 1,
                }}
              />
            </div>
          </foreignObject>
        </svg>
      </span>
    </span>
  );
});

/* ================== [9.5] RolagemD10Overlay (dado no centro da tela) ================== */
/* Overlay full-screen do D10, sempre em modo livre: rola sozinho ao abrir,
   mostra Crítico/Falha Crítica no 10/1, e os botões Rolar de novo / Concluir.
   PROPS: nome, lang, onClose, onResultado?({ d10 }). */
function RolagemD10Overlay(props) {
  var nome = props.nome;
  var onClose = props.onClose;
  var en = props.lang === "en";

  var resultadoState = useState(null);
  var resultado = resultadoState[0];
  var setResultado = resultadoState[1];

  var dadoRef = useRef(null);
  var jaRolou = useRef(false);

  useEffect(function () {
    var onKey = function (e) { if (e.key === "Escape" && onClose) onClose(); };
    document.addEventListener("keydown", onKey);
    var prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return function () {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(function () {
    var t = setTimeout(function () {
      if (dadoRef.current && !jaRolou.current) { jaRolou.current = true; dadoRef.current.roll(); }
    }, 260);
    return function () { clearTimeout(t); };
  }, []);

  function aoRolar(d10) {
    var r = { d10: d10 };
    setResultado(r);
    if (props.onResultado) props.onResultado(r);
  }
  function rolarDeNovo() {
    setResultado(null);
    if (dadoRef.current) dadoRef.current.roll();
  }

  return (
    <div
      className="menestrel-ui"
      role="dialog"
      aria-modal="true"
      aria-label={(en ? "Roll: " : "Rolagem: ") + (nome || "d10")}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "grid", placeItems: "center",
        padding: "clamp(16px, 4vw, 40px)",
        background: "rgba(8,6,2,0.66)",
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", maxWidth: "min(92vw, 460px)" }}>
        {nome && (
          <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: "clamp(24px, 4.5vw, 38px)", color: "var(--foreground)", letterSpacing: ".01em", marginBottom: 2 }}>
            {nome}
          </div>
        )}
        <div style={{ fontSize: "clamp(11px, 2.5vw, 13px)", color: "var(--muted-foreground)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 4 }}>
          d10
        </div>

        <DadoD10 ref={dadoRef} size="clamp(150px, 42vw, 208px)" onRoll={aoRolar} />

        <div
          aria-live="polite"
          style={{
            minHeight: 1, width: "100%",
            opacity: resultado ? 1 : 0,
            transform: resultado ? "translateY(0)" : "translateY(6px)",
            transition: "opacity .35s ease, transform .35s ease",
            pointerEvents: resultado ? "auto" : "none",
          }}
        >
          {resultado && (resultado.d10 === 10 || resultado.d10 === 1) && (
            <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: "clamp(20px, 4vw, 32px)", color: resultado.d10 === 10 ? "var(--gold)" : "var(--ember-bright, #B8472F)", letterSpacing: ".01em" }}>
              {resultado.d10 === 10 ? (en ? "Critical!" : "Crítico!") : (en ? "Fumble!" : "Falha Crítica!")}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "clamp(8px, 2vw, 12px)", flexWrap: "wrap", justifyContent: "center", marginTop: 10 }}>
          <button type="button" className="btn-ghost" onClick={rolarDeNovo} disabled={!resultado}>
            <i className="ti ti-refresh" aria-hidden="true" style={{ marginRight: 6, verticalAlign: "-2px" }} />
            {en ? "Roll again" : "Rolar de novo"}
          </button>
          <button type="button" className="btn-primary" onClick={onClose}>
            {en ? "Done" : "Concluir"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Registro global — RolagemLivreFab resolve via window.RolagemD10Overlay.
Object.assign(window, { DadoD10, RolagemD10Overlay });

/* ============================== [9.6] RolagemLivreFab — botões flutuantes D20 e D10 ==============================
   Dois botões independentes no canto superior direito da tela:
     - Fab principal (ícone ti-dice, .rl-fab) → D20 livre
     - Fab secundário (label "D10", .rl-fab-d10) → D10 livre, posicionado
       abaixo do principal com a mesma pele visual (vidro escuro + blur + dourado)

   Cada botão abre seu próprio overlay. Ambos disparam registrar_evento_mesa
   ao assentar (sem historiaId, notificação silenciosa — igual comportamento
   anterior).

   Globals defensivos (typeof + window) igual ficha.jsx:
     - RolagemD20Overlay  (dado-d20.jsx, Fase 02)
     - RolagemD10Overlay  (dado-d10.jsx, Fase 02) */
function RolagemLivreFab({ lang, historiaId, nomeUsuario }) {
  const [abertoD20, setAbertoD20] = useState(false);
  const [abertoD10, setAbertoD10] = useState(false);
  const en = lang === 'en';

  const _RolagemD20Overlay = (typeof RolagemD20Overlay !== 'undefined' ? RolagemD20Overlay : null) || window.RolagemD20Overlay || null;
  const _RolagemD10Overlay = (typeof RolagemD10Overlay !== 'undefined' ? RolagemD10Overlay : null) || window.RolagemD10Overlay || null;

  const aoResultado = (res) => {
    if (!historiaId) return;
    const nome  = nomeUsuario || (en ? 'Someone' : 'Alguém');
    const valor = res.d20 ?? res.d10;
    const tipo  = res.d20 != null ? 'd20' : 'd10';
    const texto = en
      ? `${nome} made a free ${tipo} roll and got ${valor}.`
      : `${nome} fez um rolamento livre de ${tipo} e obteve ${valor}.`;
    supabaseClient
      .rpc('registrar_evento_mesa', {
        p_historia_id: historiaId,
        p_tipo: 'teste',
        p_texto: texto,
        p_meta: { [tipo]: valor, livre: true },
      })
      .then(({ error }) => {
        if (error) console.error('[RolagemLivreFab] registrar_evento_mesa falhou:', error);
      });
  };

  return (
    <>
      <div className="menestrel-ui rl-root">
        {/* Fab D20 — .rl-fab garante pointer-events:auto */}
        <button
          type="button"
          className="rl-fab"
          onClick={() => setAbertoD20(true)}
          aria-label={en ? 'Free roll D20' : 'Rolamento livre D20'}
          title="D20"
        >
          <i className="ti ti-number-20-small" aria-hidden="true" />
        </button>

        {/* Fab D10 — também usa .rl-fab para herdar pointer-events:auto;
            sobrescreve top para empilhar abaixo do D20 */}
        <button
          type="button"
          className="rl-fab"
          style={{ top: 76 }}
          onClick={() => setAbertoD10(true)}
          aria-label={en ? 'Free roll D10' : 'Rolamento livre D10'}
          title="D10"
        >
          <i className="ti ti-number-10-small" aria-hidden="true" />
        </button>
      </div>

      {/* Overlay D20 */}
      {abertoD20 && _RolagemD20Overlay && (() => {
        const D20Overlay = _RolagemD20Overlay;
        return (
          <D20Overlay
            nome={en ? 'Free Roll' : 'Rolamento Livre'}
            livre
            lang={lang}
            onClose={() => setAbertoD20(false)}
            onResultado={aoResultado}
          />
        );
      })()}

      {/* Overlay D10 */}
      {abertoD10 && _RolagemD10Overlay && (() => {
        const D10Overlay = _RolagemD10Overlay;
        return (
          <D10Overlay
            nome={en ? 'Free Roll' : 'Rolamento Livre'}
            lang={lang}
            onClose={() => setAbertoD10(false)}
            onResultado={aoResultado}
          />
        );
      })()}
    </>
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
function AdminConsole({ user, userProfile, onLogout, t, lang, setLang, onViewLanding }) {
  const ac = ADMIN_COPY[lang] || ADMIN_COPY.pt;
  const [navTip, abrirNavTip, fecharNavTip, manterNavTip] = useNavTooltip(60);

  // Perfil persistido.
  // Prioridade de restauração: Supabase (userProfile prop) > localStorage > 'player' (novo usuário).
  const [profile, setProfile] = useState(() => {
    if (userProfile && typeof userProfile.perfil_tipo === 'string') return userProfile.perfil_tipo;
    try { const s = localStorage.getItem('menestrel.profile'); if (s === 'master' || s === 'player') return s; }
    catch (e) {}
    return 'player'; // padrão para contas novas
  });

  // Sincroniza com o Supabase na primeira chegada de userProfile (que carrega async após o login).
  // Usa ref para garantir que a sincronização não sobrescreve uma troca manual feita pelo usuário
  // na mesma sessão.
  const _perfilSynced = React.useRef(false);
  useEffect(() => {
    if (!_perfilSynced.current && userProfile && typeof userProfile.perfil_tipo === 'string') {
      _perfilSynced.current = true;
      setProfile(userProfile.perfil_tipo);
    }
  }, [userProfile]);

  useEffect(() => {
    try { localStorage.setItem('menestrel.profile', profile); } catch (e) {}
    // Persiste no Supabase para restaurar entre dispositivos/sessões
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
  // "guia_personagem" é tratada como seção especial (fora do ADMIN_SECTIONS) — não aparece
  // no menu lateral, só é acessada via onHelp. Por isso o useEffect de guarda não a reverte.
  const SECTIONS_OCULTAS = ['inventario', 'loja', 'itens_campanha'];
  const SECTIONS_ESPECIAIS = ['guia_personagem'];
  const sections = (ADMIN_SECTIONS[profile] || []).filter((s) => !SECTIONS_OCULTAS.includes(s.id));
  const [currentId, setCurrentId] = useState(() => {
    try { return localStorage.getItem('menestrel.section') || sections[0].id; }
    catch (e) { return sections[0].id; }
  });
  useEffect(() => {
    // Não reverte seções especiais (guia_personagem etc.) — navegadas via onHelp,
    // não precisam estar no ADMIN_SECTIONS.
    if (SECTIONS_ESPECIAIS.includes(currentId)) return;
    if (!sections.find((s) => s.id === currentId)) {
      setCurrentId(sections[0].id);
    }
  }, [profile, sections, currentId]);
  useEffect(() => {
    try { localStorage.setItem('menestrel.section', currentId); } catch (e) {}
  }, [currentId]);

  const current = sections.find((s) => s.id === currentId) || { id: currentId };
  const sectionMeta = ac.sections[current.id] || { label: current.id };
  const isWide = ['criaturas', 'magias', 'habilidades', 'tecnicas', 'itens', 'itens_campanha', 'fichas', 'personagens_j', 'personagens_m', 'historias', 'convites', 'aventuras', 'guia_personagem'].includes(current.id);

  // ── Modal de convite (botão "Convites" na sidebar) ───────────
  const [conviteModalAberto, setConviteModalAberto] = useState(false);
  // Token que incrementa quando um convite é aceito — força AventurasJogador a recarregar.
  const [aventurasReloadToken, setAventurasReloadToken] = useState(0);

  // ── Mesa ativa (p/ Central de Mensagens) ────────────────────
  // Jogador: a mesa é resolvida automaticamente pelo PJ ativo (1 PJ -> 1
  // história via protagonista_ids), igual já faz a Ficha. Mestre pode ter
  // N histórias simultâneas — minhasHistorias alimenta um seletor simples
  // (dropdown) pra ele escolher qual mesa acompanhar agora. Persistido em
  // localStorage só pra não perder a escolha ao trocar de aba (mesmo
  // padrão de menestrel.profile/section/sidebarCollapsed acima).
  const [minhasHistorias, setMinhasHistorias] = useState(null); // null = ainda não carregou; [] = carregou mas vazio; [{id, titulo}] = lista real
  const [mesaAtivaId, setMesaAtivaId] = useState(() => {
    try { const v = localStorage.getItem('menestrel.mesaAtivaId'); return v ? Number(v) : null; }
    catch (e) { return null; }
  });
  // Ref pra abrir o modal "Nova história" de fora — o botão fica no pill do
  // topo (CardDataJogoAtual), mas quem dono do modal continua sendo a
  // HistoriasList (regra de limite do plano free fica encapsulada lá).
  const abrirNovaHistoriaRef = React.useRef(null);
  // Mesma regra de limite que a HistoriasList aplica internamente — calculada
  // aqui também só pra decidir o estado visual (disabled + tooltip) do botão
  // do pill, que vive fora da HistoriasList.
  const limiteFreeHistorias = userProfile?.plano === 'free' && (minhasHistorias?.length ?? 0) >= 2;
  // Quando a HistoriasList está dentro de um menu interno da aventura (loja,
  // lore, batalhas, convites), o pill do topo inteiro (seletor de mesa +
  // "Nova história") fica escondido — esses controles só existem na tela
  // inicial de Histórias, pra nunca mostrar uma mesa no pill diferente da
  // que está sendo gerenciada na tela abaixo.
  const [historiasDentroDeMenu, setHistoriasDentroDeMenu] = useState(false);
  // Mesmo padrão pra "Novo personagem" (visão Jogador, aba personagens_j):
  // ref pra abrir o modal de fora, flag de "dentro da ficha" (esconde o
  // botão) e flag de limite do plano free — calculadas dentro da própria
  // PersonagensList (que tem os dados) e reportadas via callback, já que o
  // AdminConsole não tem uma query própria de personagens.
  const abrirNovoPersonagemRef = React.useRef(null);
  const [personagensDentroDeMenu, setPersonagensDentroDeMenu] = useState(false);
  const [limiteFreePersonagens, setLimiteFreePersonagens] = useState(false);
  // true quando FichaPersonagem está montada (PersonagensList reporta via onFichaAberta)
  const [fichaAtiva, setFichaAtiva] = useState(false);
  // nome do PJ ativo (PersonagensList reporta via onNomePjAtivo) — usado na notificação de rolamento livre
  const [nomePjAtivo, setNomePjAtivo] = useState(null);
  useEffect(() => {
    if (!user || !user.id) return;
    let cancel = false;
    (async () => {
      if (profile === 'master') {
        const { data, error } = await supabaseClient
          .from('historias').select('id, titulo').eq('mestre_id', user.id)
          .order('created_at', { ascending: false });
        if (cancel) return;
        setMinhasHistorias(error ? [] : (data || []));
      } else {
        // Jogador: resolve a história do PJ ativo (mesmo pj_ativo_id usado por FichaPersonagem).
        const { data: prof } = await supabaseClient.from('profiles').select('pj_ativo_id').eq('id', user.id).maybeSingle();
        if (cancel) return;
        const pjAtivoId = prof && prof.pj_ativo_id;
        if (!pjAtivoId) { setMinhasHistorias([]); return; }
        const { data: hist, error } = await supabaseClient
          .from('historias').select('id, titulo').contains('protagonista_ids', [pjAtivoId]).maybeSingle();
        if (cancel) return;
        setMinhasHistorias(!error && hist ? [hist] : []);
      }
    })();
    return () => { cancel = true; };
  }, [user, profile]);
  // Auto-seleciona quando há exatamente 1 opção, ou quando a selecionada saiu da lista.
  // Guard: minhasHistorias===null significa "ainda carregando" — não resetar o id salvo.
  useEffect(() => {
    if (minhasHistorias === null) return; // ainda carregando — preserva o id do localStorage
    if (minhasHistorias.length === 0) { setMesaAtivaId(null); return; }
    if (!minhasHistorias.find((h) => h.id === mesaAtivaId)) {
      setMesaAtivaId(minhasHistorias[0].id);
    }
  }, [minhasHistorias, mesaAtivaId]);
  useEffect(() => {
    try {
      if (mesaAtivaId) localStorage.setItem('menestrel.mesaAtivaId', String(mesaAtivaId));
    } catch (e) {}
  }, [mesaAtivaId]);

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
      <div className="menestrel-ui mc-root" style={{ '--sidebar-w': sidebarCollapsed ? '64px' : '208px' }}>

        {/* ── Fundo animado — baseado em DarkGradientBg (paleta Pedra & Bronze) ── */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>

          {/* Gradiente base: bronze escuro no canto superior esquerdo → preto */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 1,
            background: 'radial-gradient(100% 100% at 0% 0%, #000000 0%, #000000 100%)',
            mask: 'radial-gradient(125% 100% at 0% 0%, #000 0%, rgba(0,0,0,0.22) 88%, transparent 100%)',
          }} >

            {/* Filetes inclinados — ouro translúcido em vez de ciano */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.1, background: 'linear-gradient(rgba(201,164,78,1) 0%, rgba(201,164,78,0) 100%)', mask: 'linear-gradient(90deg, transparent 0%, #000 20%, transparent 36%, #000 55%, rgba(0,0,0,0.13) 67%, #000 78%, transparent 97%)', transform: 'skewX(45deg)' }} />
            <div style={{ position: 'absolute', inset: 0, opacity: 0.1, background: 'linear-gradient(rgba(201,164,78,1) 0%, rgba(201,164,78,0) 100%)', mask: 'linear-gradient(90deg, transparent 11%, #000 25%, rgba(0,0,0,0.55) 41%, rgba(0,0,0,0.13) 67%, #000 78%, transparent 97%)', transform: 'skewX(45deg)' }} />
            <div style={{ position: 'absolute', inset: 0, opacity: 0.1, background: 'linear-gradient(rgba(184,112,46,1) 0%, rgba(184,112,46,0) 100%)', mask: 'linear-gradient(90deg, transparent 9%, #000 20%, rgba(0,0,0,0.55) 28%, rgba(0,0,0,0.42) 40%, #000 48%, rgba(0,0,0,0.27) 54%, rgba(0,0,0,0.13) 78%, #000 88%, transparent 97%)', transform: 'skewX(45deg)' }} />
            <div style={{ position: 'absolute', inset: 0, opacity: 0.1, background: 'linear-gradient(rgba(184,112,46,1) 0%, rgba(184,112,46,0) 100%)', mask: 'linear-gradient(90deg, transparent 0%, #000 17%, rgba(0,0,0,0.55) 26%, #000 35%, transparent 47%, rgba(0,0,0,0.13) 69%, #000 79%, transparent 97%)', transform: 'skewX(45deg)' }} />
            <div style={{ position: 'absolute', inset: 0, opacity: 0.1, background: 'linear-gradient(rgba(184,112,46,1) 0%, rgba(184,112,46,0) 100%)', mask: 'linear-gradient(90deg, transparent 0%, #000 20%, rgba(0,0,0,0.55) 27%, #000 42%, transparent 48%, rgba(0,0,0,0.13) 67%, #000 74%, #000 82%, rgba(0,0,0,0.47) 88%, transparent 97%)', transform: 'skewX(45deg)' }} />
          </div>

          {/* Grade de pontos sutil */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(201,164,78,0.6) 1px, transparent 0)', backgroundSize: '20px 20px' }} />
        </div>

        {/* SIDEBAR */}
        <aside className={'mc-sidebar' + (sidebarCollapsed ? ' is-collapsed' : '')}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 4px' }}>
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

          {/* Botão de recolher/expandir — dentro da sidebar, abaixo da logo */}
          <button
            className="mc-navitem"
            onClick={() => setSidebarCollapsed((v) => !v)}
            aria-label={sidebarCollapsed ? (lang === 'en' ? 'Expand menu' : 'Expandir menu') : (lang === 'en' ? 'Collapse menu' : 'Recolher menu')}
            onMouseEnter={(e) => abrirNavTip(e, sidebarCollapsed ? (lang === 'en' ? 'Expand menu' : 'Expandir menu') : (lang === 'en' ? 'Collapse menu' : 'Recolher menu'))}
            onMouseLeave={fecharNavTip}
          >
            <i className="ti ti-menu-2" style={{ fontSize: 20, lineHeight: 1, flex: '0 0 auto' }} aria-hidden="true" />
            <span>{lang === 'en' ? 'Collapse' : 'Recolher'}</span>
          </button>

          <nav className="mc-nav">
            {sections.map((s) => {
              const IconComp = Icon[s.icon] || Icon.Scroll;
              const meta = ac.sections[s.id] || { label: s.id };
              // "convites" agora abre modal em vez de navegar para uma aba
              const isConvites = s.id === 'convites';
              return (
                <button
                  key={s.id}
                  className={'mc-navitem' + (!isConvites && currentId === s.id ? ' is-active' : '')}
                  onClick={() => {
                    if (isConvites) {
                      setConviteModalAberto(true);
                    } else {
                      setCurrentId(s.id);
                    }
                  }}
                  aria-label={meta.label}
                  onMouseEnter={(e) => abrirNavTip(e, { title: meta.label })}
                  onMouseLeave={fecharNavTip}
                  onFocus={(e) => abrirNavTip(e, { title: meta.label })}
                  onBlur={fecharNavTip}
                >
                  <IconComp />
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </nav>

          <div
            className="mc-user"
            style={{ position: 'relative' }}
            onClick={() => setUserMenuOpen((v) => !v)}
            onMouseEnter={(e) => abrirNavTip(e, fullName || user.email)}
            onMouseLeave={fecharNavTip}
          >
            {avatarUrl ? (
              <img
                ref={avatarRef}
                src={avatarUrl} alt={firstName} referrerPolicy="no-referrer"
                style={{ width: 30, height: 30, borderRadius: 999, objectFit: 'cover', border: '1px solid rgba(201,164,78,0.35)', flexShrink: 0, cursor: 'pointer' }} />
            ) : (
              <div
                ref={avatarRef}
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
                onHelp={() => { setUserMenuOpen(false); setCurrentId('guia_personagem'); }}
                onLogout={onLogout}
                onClose={() => setUserMenuOpen(false)}
              />
            )}
          </div>
        </aside>

        {/* Tooltip do menu lateral */}
        <NavTooltip tip={navTip} onEnter={manterNavTip} onLeave={fecharNavTip} />

        {/* CONTEÚDO (switch das abas — inalterado; estilo legado por enquanto) */}
        <main className="mc-main">
          <div className="mc-content" style={{ maxWidth: isWide ? 'none' : 860, paddingBottom: 80 }}>
            {current.id === 'criaturas' ? (
              <CriaturasList ac={ac} lang={lang} />
            ) : current.id === 'personagens_j' ? (
              <PersonagensList ac={ac} t={t} lang={lang} profile="player" currentUserId={user.id} userProfile={userProfile} soAcoes={['modal', 'editar', 'evoluir', 'deletar']} abrirNovoPersonagemRef={abrirNovoPersonagemRef} onDentroDeMenu={setPersonagensDentroDeMenu} onLimiteFreeChange={setLimiteFreePersonagens} onFichaAberta={setFichaAtiva} onNomePjAtivo={setNomePjAtivo} />
            ) : current.id === 'personagens_m' ? (
              <PersonagensList ac={ac} t={t} lang={lang} profile="master" currentUserId={user.id} userProfile={userProfile} mesaAtivaId={mesaAtivaId} />
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
            ) : current.id === 'itens_campanha' ? (
              <ItensCampanhaManager ac={ac} lang={lang} />
            ) : current.id === 'historias' ? (
              <HistoriasList ac={ac} t={t} lang={lang} currentUserId={user.id} userProfile={userProfile} mesaAtivaId={mesaAtivaId} abrirNovaHistoriaRef={abrirNovaHistoriaRef} onDentroDeMenu={setHistoriasDentroDeMenu} />
            ) : current.id === 'aventuras' ? (
              <AventurasJogador t={t} lang={lang} currentUserId={user.id} reloadToken={aventurasReloadToken} />
            ) : current.id === 'guia_personagem' ? (
              <GuiaPersonagem lang={lang} />
            ) : (
              <AdminEmpty ac={ac} sectionLabel={sectionMeta.label} />
            )}
          </div>
        </main>

        {/* Card flutuante com data/local atuais do jogo — topo da tela.
            A barra de data/local em si fica sempre visível. O seletor de
            mesa (Mestre, >1 história) e o botão "Nova história" — que vivem
            dentro do mesmo CardDataJogoAtual — desaparecem quando o Mestre
            entra num menu interno da aventura (loja/lore/batalhas/convites),
            via esconderSeletorEBotaoNovo: esses dois controles só existem na
            tela inicial de Histórias, pra nunca mostrar uma mesa diferente da
            que está sendo gerenciada na tela abaixo. Mesmo padrão pro botão
            "Novo personagem" (visão Jogador, aba personagens_j): só existe na
            view de lista — some quando o Jogador está vendo a ficha de um PJ
            ativo (esconderBotaoPersonagem). */}
        <CardDataJogoAtual
          lang={lang}
          historiaId={current.id === 'aventuras' || current.id === 'guia_personagem' ? null : mesaAtivaId}
          podeEditar={profile === 'master'}
          minhasHistorias={minhasHistorias}
          mesaAtivaId={mesaAtivaId}
          setMesaAtivaId={setMesaAtivaId}
          profile={profile}
          onNovaHistoria={current.id === 'historias' ? () => abrirNovaHistoriaRef.current && abrirNovaHistoriaRef.current() : null}
          limiteFreeHistoria={limiteFreeHistorias}
          esconderSeletorEBotaoNovo={current.id === 'historias' && historiasDentroDeMenu}
          sidebarLargura={sidebarCollapsed ? 64 : 208}
          onNovoPersonagem={current.id === 'personagens_j' ? () => abrirNovoPersonagemRef.current && abrirNovoPersonagemRef.current() : null}
          limiteFreePersonagem={limiteFreePersonagens}
          esconderBotaoPersonagem={current.id === 'personagens_j' && personagensDentroDeMenu}
        />

        {/* Central de mensagens da mesa — Mestre e Jogador.
            Resolve a história via mesaAtivaId (Mestre: seletor acima;
            Jogador: PJ ativo, automático). Sem mesa resolvida, o próprio
            componente decide não montar nada. */}
        <CentralMensagens lang={lang} historiaId={mesaAtivaId} sidebarLargura={sidebarCollapsed ? 64 : 208} />

        {/* Botão de rolagem de d20 livre — só aparece quando a FichaPersonagem
            está montada (fichaAtiva=true). O dado é vinculado ao PJ ativo, não
            à conta — fora da ficha o botão não existe. */}
        {fichaAtiva && (
          <RolagemLivreFab lang={lang} historiaId={mesaAtivaId} nomeUsuario={nomePjAtivo || firstName} />
        )}

        {/* Modal de aceite de convite — abre via botão "Convites" na sidebar */}
        {conviteModalAberto && typeof ConviteModal !== 'undefined' && (
          <ConviteModal
            t={t}
            lang={lang}
            currentUserId={user.id}
            onClose={() => setConviteModalAberto(false)}
            onAccepted={() => {
              setAventurasReloadToken((n) => n + 1);
              setConviteModalAberto(false);
            }}
          />
        )}
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
      .select('plano, plano_escolhido_em, pj_ativo_id, perfil_tipo')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('[profile] carga falhou:', error);
      setProfile({ plano: 'free', plano_escolhido_em: new Date().toISOString(), perfil_tipo: 'player' });
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
          perfil_tipo: 'player',   // ← primeiro login sempre começa como jogador
          email: authUser.email || null,
          full_name: meta.full_name || meta.name || null,
          avatar_url: meta.avatar_url || meta.picture || null,
        }, { onConflict: 'id' });
      if (insErr) console.error('[profile] upsert fallback falhou:', insErr);
      setProfile({ plano: 'free', plano_escolhido_em: null, perfil_tipo: 'player' });
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
          t={t}
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

    </>);

}

Object.assign(window, {
  ModalShell,
  FantasyDatePicker, Topbar, AdminEmpty, FichasJogador, AdminConsole, App,
  CentralMensagens, CardDataJogoAtual, RolagemLivreFab,
});