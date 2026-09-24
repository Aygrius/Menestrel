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
   - AdminEmpty        — estado vazio reutilizável (com ornamento)
   - AdminConsole      — layout principal do console (sidebar com
                         abas + main com a aba ativa). Onde quase
                         todas as features extraídas se encontram.
   - App               — raiz da aplicação. Estado de auth, callbacks
                         OAuth e a bifurcação login/console: deslogado
                         vê a LoginPage (04-auth), logado vê o console.
                         A lógica de auth foi mantida inline (decisão de
                         não refatorar agora — `useAuth` fica pra depois).

   Depende de:
   - Tudo o que foi extraído nas fases anteriores (LoginPage,
     ConvitesJogador, ItensList, etc).
   - TWEAKS_DEFAULTS (no app.jsx, último script) — resolvido em
     runtime quando App() é renderizado.

   Carregar imediatamente antes do app.jsx (que só tem TWEAKS_DEFAULTS
   + bootstrap ReactDOM).
   ============================================================ */



// ─── FantasyDatePicker ──────────────────────────────────────────────────────
// FdpDrop — portal com position:fixed para não ser cortado por overflow do modal.
// listRef é necessário: o portal vive fora do DOM do anchorRef, então o handler
// de mousedown precisa checar AMBOS para não fechar antes do onClick do item.
function FdpDrop({ anchorRef, children, onClose }) {
  const [pos, setPos] = React.useState(null);
  const listRef = React.useRef(null);

  React.useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, minWidth: rect.width });
  }, [anchorRef]);

  React.useEffect(() => {
    const handler = (e) => {
      if (anchorRef.current && anchorRef.current.contains(e.target)) return;
      if (listRef.current && listRef.current.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [anchorRef, onClose]);

  if (!pos) return null;
  const portalTarget = document.querySelector('.menestrel-ui') || document.body;
  return ReactDOM.createPortal(
    <ul ref={listRef} className="fdp-drop" style={{
      position: 'fixed', top: pos.top, left: pos.left, minWidth: pos.minWidth,
      background: 'rgba(18,13,6,1)', border: 'none', borderRadius: 6,
      padding: 4, margin: 0, listStyle: 'none', zIndex: 9999,
      maxHeight: 220, overflowY: 'auto',
    }}>
      {children}
    </ul>,
    portalTarget
  );
}

/* `disabled` (12/09/2026): a data de nascimento trava depois que o personagem
   existe — "não devem ficar disponíveis para editar depois de criar o
   personagem, mesmo para o mestre" (usuário). Os quatro campos continuam
   visíveis, com a mesma pele esmaecida dos SelectPill travados do wizard. */
function FantasyDatePicker({ value, onChange, disabled = false }) {
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

  // Pill — forma e tipografia só. FUNDO e BORDA ficam no CSS (.fdp-grid, ver
  // index.css): eles mudam por contexto, e estilo inline não pode ser
  // sobreposto por folha de estilo. No wizard de personagem, por exemplo, os
  // quatro campos precisam da mesma pele dos SelectPill vizinhos.
  const pill = {
    borderRadius: 999, height: 32, outline: 'none',
    fontFamily: "'Lora', serif", fontSize: 13, flexShrink: 0,
    ...(disabled ? { opacity: 0.45, cursor: 'not-allowed' } : null),
  };

  // dropBtn — o pill dos seletores de dia/mês (classe .select-pill-btn, mesmo
  // tipo do campo "Arma" em batalha.jsx).
  const dropBtn = {
    ...pill,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, width: '100%',
    color: '#E8DDC6', textAlign: 'left',
    padding: '0 12px 0 16px', cursor: disabled ? 'not-allowed' : 'pointer',
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
    /* Grid em CSS (.fdp-grid), não em style inline: inline vence folha de
       estilo, e o wizard de personagem precisa reencaixar as colunas no ritmo
       do formulário dele (ver .wiz-ident .fdp-grid no index.css). O padrão
       abaixo é o mesmo de antes — nada muda onde já era usado. */
    <div className="menestrel-ui fdp-grid">

      {/* Dia — dropdown customizado, mesmo tipo de seletor do SelectPill (ver "Arma") */}
      <div ref={diaRef}>
        <button type="button" className="select-pill-btn" data-open={diaOpen ? 'true' : 'false'} style={dropBtn} disabled={disabled} onClick={() => { if (disabled) return; setDiaOpen((v) => !v); setMesOpen(false); }}>
          <span>{val.dia}</span>
          {chevron(diaOpen)}
        </button>
        {diaOpen && !disabled && (
          <FdpDrop anchorRef={diaRef} onClose={() => setDiaOpen(false)}>
            {Array.from({ length: maxDias }, (_, i) => i + 1).map((d) => (
              <li key={d}
                style={dropItem(d === val.dia)}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(106,85,48,0.12)'; e.currentTarget.style.color = '#E8DDC6'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = d === val.dia ? '#C9A44E' : '#C8BCAA'; }}
                onClick={() => { update('dia', d); setDiaOpen(false); }}
              >
                {d}
                {d === val.dia && <i className="ti ti-check" style={{ fontSize: 12, color: '#C9A44E', flexShrink: 0 }} />}
              </li>
            ))}
          </FdpDrop>
        )}
      </div>

      {/* Mês — dropdown customizado, mesmo tipo de seletor do SelectPill (ver "Arma") */}
      <div ref={mesRef}>
        <button type="button" className="select-pill-btn" data-open={mesOpen ? 'true' : 'false'} style={dropBtn} disabled={disabled} onClick={() => { if (disabled) return; setMesOpen((v) => !v); setDiaOpen(false); }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {FANTASY_MONTHS[val.mes - 1]?.nome || ''}
          </span>
          {chevron(mesOpen)}
        </button>
        {mesOpen && !disabled && (
          <FdpDrop anchorRef={mesRef} onClose={() => setMesOpen(false)}>
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
          </FdpDrop>
        )}
      </div>

      {/* Dia da semana */}
      <input
        type="text"
        readOnly
        className="fdp-semana"
        value={`✦ ${diaSemana}`}
        style={{ ...pill, color: '#C9A44E', cursor: 'default', padding: '0 16px', width: '100%' }}
      />

      {/* Ano */}
      <input
        type="number"
        min={0}
        className="fdp-ano"
        value={val.ano}
        disabled={disabled}
        readOnly={disabled}
        onChange={(e) => { if (!disabled) update('ano', e.target.value); }}
        style={{ ...pill, color: '#E8DDC6', padding: '0 16px', width: '100%' }}
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
  Sheet:    TI_cls('ti-file-description'), // Itens (lista)
  /* A Loja tinha o MESMO icone de Itens. Nao incomodava enquanto a barra
     mostrava o nome de cada secao; com a barra so de icones (12/09/2026)
     virou duas portas identicas. Um teste agora exige icones distintos. */
  Store:    TI_cls('ti-building-store'), // Loja
  BookOpen: TI_cls('ti-book'),          // Aventuras (histórias do jogador)
  // As três que vieram do Diário em 12/09/2026 — ver ADMIN_SECTIONS.
  MapPin:   TI_cls('ti-map-pin'),       // Lugares
  Users:    TI_cls('ti-users'),         // Personagens (NPCs) conhecidos
  Feather:  TI_cls('ti-feather'),       // Memórias

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

// ---------- AdminEmpty: estado vazio (migrado · Pedra & Bronze) ----------
function AdminEmpty({ ac, sectionLabel }) {
  const [tip, abrirTip, fecharTip, manterTip] = useNavTooltip(60);
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
        {...propsTip(abrirTip, fecharTip, ac.coming_soon)}
        style={{ marginTop: 16, fontFamily: "'Lora', serif", fontWeight: 400, fontSize: 15, color: '#9C8F73', background: 'rgba(232,221,198,0.05)', border: '1px solid rgba(232,221,198,0.12)', borderRadius: 6, padding: '11px 20px', cursor: 'not-allowed', opacity: 0.7 }}>
        + {ac.create} {sectionLabel ? `· ${sectionLabel}` : ''}
      </button>
      <div style={{ marginTop: 10, fontSize: 15, color: 'rgba(156,143,115,0.7)' }}>{ac.coming_soon}</div>
      <NavTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </div>
  );
}

// ---------- FichasJogador: fichas dos personagens do jogador ----------
// Exibe cards de ficha para cada personagem do jogador. Clicar num card
// abre o modal de visualização completa (PersonagemFichaModal / onVerFicha).
// Depende de: calcularFicha, ATRIBUTOS_KEYS, ATRIBUTOS_LABEL (game-data.jsx)
//             supabaseClient (global), Icon (este arquivo)
function FichasJogador({ ac, lang, currentUserId }) {
  const [tip, abrirTip, fecharTip, manterTip] = useNavTooltip(60);
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
              {...propsTip(abrirTip, fecharTip, lang === 'en' ? 'Open sheet' : 'Abrir ficha')}
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
        <NavTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
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
// Modais abertos no momento. Só o de CIMA responde ao Escape — ver o
// useEffect de teclado dentro de ModalShell.
//
// O critério é ordem no documento: vale quem vier por último. Serve tanto pro
// modal aninhado (descendente sempre vem depois do ancestral) quanto pro que
// entra por portal (anexado ao fim de .mc-root, depois de quem o abriu).
//
// Não dá pra usar ordem de montagem: os efeitos do React rodam de baixo pra
// cima, então numa árvore <Wizard><Detalhe/></Wizard> quem se registra
// primeiro é o Detalhe, e "o último a entrar" elegeria o Wizard — o contrário
// do que se quer.
const MODAIS_ABERTOS = [];

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
  const backdropRef = useRef(null);   // usado pra saber quem é o modal mais interno

  useEffect(() => {
    // Sem onClose, o modal é bloqueante de propósito (ex.: PlanoEscolhaModal —
    // onboarding obrigatório) — Escape não faz nada nesse caso.
    //
    // O Escape só vale pro modal mais INTERNO. Cada instância registra o
    // listener em window, então com dois modais abertos um Escape fechava os
    // dois — e no wizard de personagem isso significava perder o PJ em
    // construção ao fechar a explicação de um atributo (08/09/2026).
    //
    // "De cima" = nenhum outro modal aberto vem depois dele no documento.
    // DOCUMENT_POSITION_FOLLOWING (4) cobre os dois arranjos: descendente
    // aninhado (vem como FOLLOWING|CONTAINED_BY) e irmão posterior por portal.
    const entrada = backdropRef;
    MODAIS_ABERTOS.push(entrada);
    const onKey = (e) => {
      if (e.key !== 'Escape' || !onCloseRef.current) return;
      const meu = backdropRef.current;
      const temOutroAcima = meu && MODAIS_ABERTOS.some((o) => (
        o !== entrada && o.current
        && (meu.compareDocumentPosition(o.current) & Node.DOCUMENT_POSITION_FOLLOWING)
      ));
      if (temOutroAcima) return;
      onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      const i = MODAIS_ABERTOS.indexOf(entrada);
      if (i !== -1) MODAIS_ABERTOS.splice(i, 1);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div className="menestrel-ui ms-backdrop" ref={backdropRef}>
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
  const [tip, abrirTip, fecharTip, manterTip] = useNavTooltip(60);
  const [hover, setHover] = useState(false);
  const bg = disabled ? 'transparent'
    : hover ? (danger ? 'rgba(200,33,44,0.14)' : 'rgba(232,221,198,0.07)')
    : 'transparent';
  return (
    <button
      role="menuitem"
      {...propsTip(abrirTip, fecharTip, title)}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...MENU_ITEM_STYLE, background: bg, cursor: disabled ? 'not-allowed' : 'pointer', ...extraStyle }}>
      {children}
      <NavTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </button>
  );
}

function UserMenu({ anchorRef, email, fullName, avatarUrl, firstName, planoBadge, planoPago, lang, setLang, profile, onSetProfile, onHelp, onConvites, onLogout, onClose }) {
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

      {/* ── Convites (12/09/2026) ────────────────────────────────────
          Saiu da barra lateral e veio para cá, a pedido do usuário. Convite
          não é um lugar do mundo do jogo — como criaturas, itens ou magias
          são; é administração da conta, e aqui já moram perfil e idioma.

          Só para o Jogador: quem convida é o Mestre, de dentro da história. */}
      {profile !== 'master' && onConvites && (
        <MenuRow onClick={() => { onConvites(); onClose(); }}>
          <Icon.Crown style={{ fontSize: 16, lineHeight: 1 }} />
          {lang === 'en' ? 'Invites' : 'Convites'}
        </MenuRow>
      )}

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
  /* CONTRASTE (16/09/2026): "o fundo está muito parecido com o fundo do site".
     Estava mesmo — #141009 contra a página #15120C é a mesma cor a olho nu, e
     não havia borda nem sombra para desenhar a silhueta.

     Veste a mesma pele que o .mn-tip recebeu e que .at-panel/.cdj-mesa-lista já
     usavam: quase preto, aro castanho e sombra funda. As duas famílias de
     tooltip do projeto têm que combinar — o usuário não sabe (nem deve saber)
     que são componentes diferentes; o pill do clima usa esta, o slot do
     inventário usa a outra. Por isso o fundo OPACO de 17/09/2026 chegou aqui
     junto com o do CSS: ver o comentário de .mn-tip em index.css.

     As cores vivem em constantes porque a seta repete as duas, e seta fora de
     sincronia com o balão é o defeito clássico deste arranjo. */
  const TIP_FUNDO = '#120D06';
  const TIP_ARO   = 'rgba(106,85,48,0.35)';
  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', left, top, transform: 'translateY(-50%)',
        zIndex: 9999,
        background: TIP_FUNDO,
        border: '1px solid ' + TIP_ARO, boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
        borderRadius: 6, padding: '10px 12px',
        pointerEvents: 'none', whiteSpace: 'nowrap',
        animation: 'fpItemTipIn .12s ease-out',
        fontFamily: "'Lora', serif", fontSize: 12, color: '#E8DDC6',
      }}
    >
      {/* Seta apontando para a esquerda — duas camadas: a de trás (6px) faz o
          contorno, a da frente (5px) o miolo, senão o bico sai sem aro. */}
      <div style={{
        position: 'absolute', right: '100%', top: '50%', transform: 'translateY(-50%)',
        borderWidth: 6, borderStyle: 'solid',
        borderColor: 'transparent ' + TIP_ARO + ' transparent transparent',
        width: 0, height: 0,
      }} />
      <div style={{
        position: 'absolute', right: '100%', top: '50%', transform: 'translateY(-50%)',
        borderWidth: 5, borderStyle: 'solid',
        borderColor: 'transparent ' + TIP_FUNDO + ' transparent transparent',
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

/* Eventos em DESTAQUE (15/09/2026): "Adicione no log da mesa com destaque
   quando um personagem evoluir um estágio." O evento marca `meta.destaque` e a
   linha ganha moldura dourada e o próprio ícone — subir de estágio acontece
   poucas vezes numa campanha e não pode passar batido no meio do feed. */
function MensagemEvento({ msg }) {
  const iconClass = msg.icone || MSG_TIPO_ICON[msg.tipo] || MSG_TIPO_ICON.sistema;
  return (
    <div className={'cm-msg' + (msg.destaque ? ' cm-msg--destaque' : '')}>
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
  const meta = (row.meta && typeof row.meta === 'object') ? row.meta : {};
  return {
    id: 'db-' + row.id,
    tipo: row.tipo,
    texto: row.texto,
    hora: dataHora,
    // Quem grava o evento decide o destaque e pode pedir um ícone próprio.
    destaque: !!meta.destaque,
    icone: typeof meta.icone === 'string' && /^ti-[a-z0-9-]+$/.test(meta.icone) ? meta.icone : null,
  };
}

/* ============================================================
   FILA DE APROVAÇÃO DO MESTRE — degrau 2, 12/09/2026
   ============================================================
   "Magias que aplicam efeitos em outros jogadores precisam de aprovação do
   Mestre." — decisão do usuário.

   Isso não contorna a regra do banco: torna-a desnecessária de contornar. A
   política `personagens_update_own_or_vinculado` já autoriza o Mestre a
   escrever em todo protagonista da história dele, então a escrita acontece na
   sessão de alguém que JÁ PODIA. A alternativa seria uma RPC SECURITY DEFINER
   reimplementando em código quem pode conjurar em quem — uma segunda cópia de
   uma regra que o banco já enuncia. Ver docs/fora-de-combate.md §2.

   O que o Mestre vê: os pedidos abertos, com quem evocou, o quê, em quem. Ele
   aplica ou dispensa. A resposta é um SEGUNDO evento no log apontando para o
   primeiro (`meta.responde_pedido`), porque mesa_log é append-only — e assim o
   histórico da mesa guarda quem aprovou o quê.

   O karma JÁ FOI COBRADO do conjurador no momento da evocação, na linha dele.
   Aqui só pousa o efeito no alvo. ============================================================ */
function FilaAprovacaoMagia({ lang, historiaId, pedidos, onRespondido }) {
  const en = lang === 'en';
  const [ocupado, setOcupado] = useState(null);   // id do pedido em trânsito
  const [erro, setErro] = useState(null);

  if (!pedidos || pedidos.length === 0) return null;

  const responder = async (pedido, aplicar) => {
    setOcupado(pedido.id);
    setErro(null);
    try {
      let texto;
      if (aplicar) {
        /* Lê a ficha do alvo AGORA: o estado pode ter mudado entre a evocação
           e a aprovação, e aplicar sobre um retrato velho sobrescreveria o que
           aconteceu no meio. */
        const { data: alvoPj, error: e1 } = await supabaseClient
          .from('personagens').select('*').eq('id', pedido.alvo_id).maybeSingle();
        if (e1 || !alvoPj) throw (e1 || new Error('alvo não encontrado'));

        const { data: mag, error: e2 } = await supabaseClient
          .from('magias').select('*').eq('key', pedido.magia_key).maybeSingle();
        if (e2 || !mag) throw (e2 || new Error('magia não encontrada'));

        /* calcularFicha SEM catálogo de itens: EH, EF e Karma vêm dos
           atributos, e só a armadura dependeria do catálogo — que nenhuma
           magia instantânea toca. Evita carregar 747 itens para curar 20. */
        const fichaAlvo = calcularFicha(alvoPj, null,
          (alvoPj.estado_atual && alvoPj.estado_atual.condicoes) || null);
        const dv = fichaAlvo.derivadas || {};
        const maximos = {
          ef: Number(dv.energiaFisica) || 0,
          eh: Number(dv.energiaHeroica) || 0,
          ka: Number(dv.karmamax) || 0,
        };

        /* A MESMA porta da ficha (aplicarMagiaNoEstado, 01-core). Antes esta
           aprovação aplicava só o instantâneo: uma magia de calendário aprovada
           no colega curava e esquecia de ficar ativa. A data do jogo é lida
           AGORA, pelo mesmo motivo da ficha do alvo acima. */
        const { data: hist } = await supabaseClient
          .from('historias').select('data_jogo_atual').eq('id', historiaId).maybeSingle();
        const novo = aplicarMagiaNoEstado(alvoPj.estado_atual, mag, pedido.nivel, maximos,
          hist && hist.data_jogo_atual);
        if (novo !== alvoPj.estado_atual) {
          const { error: e3 } = await supabaseClient
            .from('personagens').update({ estado_atual: novo }).eq('id', pedido.alvo_id);
          if (e3) throw e3;
        }
        texto = en
          ? `The GM applied ${pedido.magia} level ${pedido.nivel} on ${pedido.alvo_nome}.`
          : `O Mestre aplicou ${pedido.magia} nível ${pedido.nivel} em ${pedido.alvo_nome}.`;
      } else {
        texto = en
          ? `The GM did not apply ${pedido.magia} on ${pedido.alvo_nome}.`
          : `O Mestre não aplicou ${pedido.magia} em ${pedido.alvo_nome}.`;
      }

      const { error: e4 } = await supabaseClient.rpc('registrar_evento_mesa', {
        p_historia_id: historiaId,
        p_tipo: 'magia',
        p_texto: texto,
        // `responde_pedido` é o que tira o pedido da fila — não há update em
        // mesa_log, e não deveria haver.
        p_meta: { responde_pedido: pedido.id, aplicado: !!aplicar,
                  magia_key: pedido.magia_key, alvo_id: pedido.alvo_id },
      });
      if (e4) throw e4;
      if (onRespondido) onRespondido();
    } catch (err) {
      setErro(err.message || String(err));
    } finally {
      setOcupado(null);
    }
  };

  return (
    <div className="cm-fila">
      <div className="cm-fila-titulo">
        <i className="ti ti-hand-stop" aria-hidden="true" />
        {en ? 'Waiting for you' : 'Esperando você'} · {pedidos.length}
      </div>
      {pedidos.map((p) => (
        <div key={p.id} className="cm-fila-item">
          <span className="cm-fila-texto">
            {p.conjurador ? `${p.conjurador} → ` : ''}
            <strong>{p.magia}</strong> {en ? 'lv' : 'nv'} {p.nivel}
            {p.alvo_nome ? ` · ${p.alvo_nome}` : ''}
          </span>
          <span className="cm-fila-acoes">
            <button type="button" className="btn-primary btn-sm"
              disabled={ocupado === p.id} onClick={() => responder(p, true)}>
              {en ? 'Apply' : 'Aplicar'}
            </button>
            <button type="button" className="btn-ghost btn-sm"
              disabled={ocupado === p.id} onClick={() => responder(p, false)}>
              {en ? 'Dismiss' : 'Dispensar'}
            </button>
          </span>
        </div>
      ))}
      {erro && <div className="err-msg">{erro}</div>}
    </div>
  );
}

/* ============================================================
   FILA DE VENDAS — negociação de item com o Mestre (13/09/2026)
   ============================================================
   As negociações ABERTAS da mesa em que é a vez de quem está olhando: para o
   Mestre, as propostas e contrapropostas dos jogadores; para o jogador, as
   ofertas do Mestre (a RLS de vendas_item já limita o jogador aos PJs dele).
   "Negociar" abre o VendaModal (07-inventario) — aceitar, recusar ou
   contrapropor. O Realtime da tabela mantém a fila em dia. */
function precoCurtoVenda(latao, lang) {
  const t = Math.max(0, Math.round(Number(latao) || 0));
  const m = { ouro: Math.floor(t / 1000), prata: Math.floor((t % 1000) / 100), cobre: Math.floor((t % 100) / 10), latao: t % 10 };
  const suf = lang === 'en' ? { ouro: 'g', prata: 's', cobre: 'c', latao: 'b' } : { ouro: 'o', prata: 'p', cobre: 'c', latao: 'l' };
  const partes = ['ouro', 'prata', 'cobre', 'latao'].filter((k) => m[k] > 0).map((k) => `${m[k]}${suf[k]}`);
  return partes.length ? partes.join(' ') : `0${suf.latao}`;
}

function FilaVendas({ lang, historiaId, papel }) {
  const en = lang === 'en';
  const [vendas, setVendas] = useState([]);
  const [aberta, setAberta] = useState(null);
  const sufixo = useRef(Math.random().toString(36).slice(2, 8));

  const carregar = React.useCallback(async () => {
    try {
      const res = await supabaseClient.from('vendas_item')
        .select('id,pj_id,pj_nome,item_nome,slug,quantidade,preco_latao,vez,status')
        .eq('historia_id', historiaId).eq('status', 'aberta')
        .order('created_at', { ascending: true });
      setVendas(res && !res.error && Array.isArray(res.data) ? res.data : []);
    } catch (_) { setVendas([]); }
  }, [historiaId]);

  useEffect(() => {
    if (!historiaId) { setVendas([]); return undefined; }
    carregar();
    if (typeof supabaseClient.channel !== 'function') return undefined;
    const ch = supabaseClient
      .channel('vendas_hist_' + historiaId + '_' + sufixo.current)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas_item', filter: 'historia_id=eq.' + historiaId },
        () => carregar())
      .subscribe();
    return () => { supabaseClient.removeChannel(ch); };
  }, [historiaId, carregar]);

  const minhaVez = vendas.filter((v) => v.vez === papel);
  const Modal = typeof window !== 'undefined' ? window.VendaModal : null;
  const alvo = typeof document !== 'undefined' ? (document.getElementById('root') || document.body) : null;

  if (minhaVez.length === 0 && !aberta) return null;

  const modal = aberta && Modal ? (
    <div className="menestrel-ui">
      <Modal lang={lang} papel={papel} pjId={aberta.pj_id} vendaId={aberta.id}
        onClose={() => { setAberta(null); carregar(); }} />
    </div>
  ) : null;

  return (
    <>
      {minhaVez.length > 0 && (
        <div className="cm-fila cm-fila--vendas">
          <div className="cm-fila-titulo">
            <i className="ti ti-coins" aria-hidden="true" />
            {en ? 'Sales waiting for you' : 'Vendas esperando você'} · {minhaVez.length}
          </div>
          {minhaVez.map((v) => (
            <div key={v.id} className="cm-fila-item" data-venda-id={v.id}>
              <span className="cm-fila-texto">
                {papel === 'mestre' && v.pj_nome ? `${v.pj_nome} → ` : ''}
                <strong>{Number(v.quantidade) > 1 ? `${v.quantidade}× ` : ''}{v.item_nome || v.slug}</strong>
                {' · '}{precoCurtoVenda(v.preco_latao, lang)}
              </span>
              <span className="cm-fila-acoes">
                <button type="button" className="btn-primary btn-sm" onClick={() => setAberta(v)}>
                  {en ? 'Negotiate' : 'Negociar'}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
      {modal && (alvo && ReactDOM && ReactDOM.createPortal ? ReactDOM.createPortal(modal, alvo) : modal)}
    </>
  );
}

function CentralMensagens({ lang, historiaId, sidebarLargura = 208, ehMestre = false }) {
  const [mensagens, setMensagens] = useState([]);
  // Linhas CRUAS do log — o `meta` que a fila de aprovação lê. As mensagens
  // acima são formato de exibição e perdem o meta de propósito.
  const [linhasCruas, setLinhasCruas] = useState([]);
  /* Só o Mestre tem fila, e só ela justifica varrer o log inteiro. Para o
     jogador o cálculo nem roda. */
  const pedidosAbertos = React.useMemo(
    () => (ehMestre && typeof pedidosDeMagiaAbertos === 'function'
      ? pedidosDeMagiaAbertos(linhasCruas) : []),
    [ehMestre, linhasCruas]
  );
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
      /* A FILA DO MESTRE (degrau 2, 12/09/2026). Varre o log INTEIRO, não só
         as 20 da janela: um pedido feito há meia hora continua esperando, e
         sumir da lista não o resolve. Ver pedidosDeMagiaAbertos. */
      setLinhasCruas(data);
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
        // A fila acompanha em tempo real: um pedido novo aparece para o
        // Mestre sem recarregar, e a resposta some da fila do mesmo jeito.
        setLinhasCruas((prev) => [...prev, row]);
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
          {/* A fila vem ANTES do feed e só para o Mestre: é a única coisa
              aqui que pede ação, e o feed rola. */}
          {ehMestre && (
            <FilaAprovacaoMagia
              lang={lang}
              historiaId={historiaId}
              pedidos={pedidosAbertos}
              onRespondido={() => { /* o realtime traz a resposta e a fila encolhe */ }}
            />
          )}
          {/* Vendas de item: para os dois lados, só as da vez de quem olha. */}
          <FilaVendas lang={lang} historiaId={historiaId} papel={ehMestre ? 'mestre' : 'jogador'} />
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

/* ============================== [9.4] Calendário Fantasy — feriados e visualizador ==============================
   FERIADOS_FANTASY: lista fixa de feriados do calendário do mundo.
   Formato: { dia, mes, nome }. Meses 1–12 são os meses normais; mês 13 é o
   mês especial "Cruine" (1 dia). Espelha FANTASY_MONTHS de 01-core.
*/
const FERIADOS_FANTASY = [
  { dia:  2, mes:  1, nome: 'Festival da Benção Militar' },
  { dia: 12, mes:  1, nome: 'Amor da Deusa' },
  { dia: 17, mes:  1, nome: 'Adoração a Maira Mon' },
  { dia:  1, mes:  2, nome: 'Dia do Mar' },
  { dia:  5, mes:  2, nome: 'Jejum da Piedade' },
  { dia:  5, mes:  2, nome: 'Solstício de Verão' },
  { dia: 11, mes:  2, nome: 'Festa da Carne' },
  { dia: 19, mes:  2, nome: 'Culto à Elevação' },
  { dia:  5, mes:  3, nome: 'Condecoração Póstuma' },
  { dia:  9, mes:  3, nome: 'Vitória da Justiça' },
  { dia: 15, mes:  3, nome: 'Festa da Prosperidade' },
  { dia: 20, mes:  3, nome: 'Dia do Amor e Paz' },
  { dia:  2, mes:  4, nome: 'Adoração a Maira Vet' },
  { dia:  7, mes:  4, nome: 'Festa da Fertilidade' },
  { dia: 13, mes:  4, nome: 'Festa da Purificação de Parom' },
  { dia: 30, mes:  4, nome: 'Festa da Fartura' },
  { dia:  1, mes:  5, nome: 'Festa da Fartura' },
  { dia:  5, mes:  5, nome: 'Equinócio de Outono' },
  { dia:  9, mes:  5, nome: 'Dia das Ilusões' },
  { dia: 21, mes:  5, nome: 'Dia da Multiplicação' },
  { dia: 20, mes:  6, nome: 'Jornada da Paz' },
  { dia: 24, mes:  6, nome: 'Festa dos Artífices' },
  { dia: 30, mes:  6, nome: 'Festa da Colheita' },
  { dia:  1, mes:  7, nome: 'Noite dos Prazeres' },
  { dia: 13, mes:  7, nome: 'Batismo de Fogo' },
  { dia: 19, mes:  7, nome: 'Representação de Plandis' },
  { dia:  3, mes:  8, nome: 'Festival de Renascimento de Maira' },
  { dia:  5, mes:  8, nome: 'Solstício de Inverno' },
  { dia:  9, mes:  8, nome: 'Festa da Iluminação' },
  { dia: 23, mes:  8, nome: 'Oferenda de Sangue' },
  { dia:  4, mes:  9, nome: 'Memorial dos Ancestrais' },
  { dia:  6, mes:  9, nome: 'Dia da Magia' },
  { dia: 20, mes:  9, nome: 'Adoração a Maira Nil e Prisão Dourada' },
  { dia:  1, mes: 10, nome: 'Festa do Plantio' },
  { dia: 12, mes: 10, nome: 'Festa dos Amantes' },
  { dia: 27, mes: 10, nome: 'Festa da Vitória' },
  { dia:  6, mes: 11, nome: 'Equinócio de Primavera' },
  { dia: 13, mes: 11, nome: 'Culto à Tríade' },
  { dia: 26, mes: 11, nome: 'Dia da Sobra' },
  { dia: 16, mes: 12, nome: 'Festa dos Povos' },
  { dia: 27, mes: 12, nome: 'Noite do Entendimento entre os Povos' },
  { dia: 29, mes: 12, nome: 'Noite dos Justos' },
  { dia:  1, mes: 13, nome: 'Dia de Cruine e Retorno da Escuridão' },
];

// Converte (dia, mes) em número sequencial dentro do ano fantasy.
// Assume meses 1–12 com 30 dias cada + mês 13 com 1 dia = 361 dias/ano.
// Usa FANTASY_MONTHS para dias reais se disponível (window global de 01-core).
function _diaDaData(dia, mes) {
  const meses = typeof FANTASY_MONTHS !== 'undefined' ? FANTASY_MONTHS : null;
  let acc = 0;
  for (let m = 1; m < mes; m++) {
    acc += (meses ? (meses[m - 1]?.dias || 30) : 30);
  }
  return acc + dia;
}

// Retorna o próximo feriado a partir de (dia, mes) — exclusive, ou seja,
// se hoje É feriado, retorna o PRÓXIMO (não o atual).
// Volta ao início do ano se não houver feriado nos meses restantes.
function proximoFeriado(dia, mes) {
  const hoje = _diaDaData(dia, mes);
  // Feriados ordenados por dia sequencial
  const ordenados = [...FERIADOS_FANTASY].sort((a, b) => _diaDaData(a.dia, a.mes) - _diaDaData(b.dia, b.mes));
  // Próximo estritamente depois de hoje
  const proximo = ordenados.find((f) => _diaDaData(f.dia, f.mes) > hoje);
  if (proximo) return proximo;
  // Nenhum encontrado → retorna o primeiro do próximo ano (volta ao início)
  return ordenados[0] || null;
}

// Retorna array com os nomes dos feriados de um dia/mês específico (pode haver mais de um)
function feriadosDoDia(dia, mes) {
  return FERIADOS_FANTASY.filter((f) => f.dia === dia && f.mes === mes).map((f) => f.nome);
}

/* ============================== [9.4a] O tempo da mesa vira evento no log ==============================
   "As mudanças de data, hora e condições climáticas devem ser informadas no
    log da aventura para todos. Quando a data mudar, informe quando houver um
    feriado naquele dia." (usuário, 20/09/2026)

   O log já existia (RPC registrar_evento_mesa → mesa_log → Realtime). O que
   nasce aqui são os TEXTOS, puros e testáveis sem montar tela nenhuma — ver
   10-shell/log-tempo-mesa.test.js.

   Os nomes dos feriados ficam em português mesmo na versão inglesa: são nomes
   próprios da ambientação, como Farzelo ou Cruine, não rótulos de interface. */

/* A data por extenso. Esta função existe para o log e a BARRA DO TOPO nunca
   divergirem — a barra escrevia isto inline no JSX, e duas formatações da
   mesma data em lugares diferentes é o tipo de coisa que ninguém percebe até
   estar errada. Data incompleta devolve string vazia: quem chama decide se
   isso vira evento ou silêncio. */
function rotuloDataJogo(data) {
  const dia = data && Number(data.dia);
  const mes = data && Number(data.mes);
  const ano = data && Number(data.ano);
  if (!Number.isFinite(dia) || !Number.isFinite(mes) || !Number.isFinite(ano)) return '';
  const mesData = FANTASY_MONTHS[mes - 1];
  if (!mesData) return '';
  const nomeMes = mesData.nome.replace(/^Mês /, '');
  const semana = calcDiaSemanaFantasy(ano, mes, dia);
  const semanaCap = semana.charAt(0).toUpperCase() + semana.slice(1).toLowerCase();
  return `${semanaCap}, ${dia} ${nomeMes} de ${ano}`;
}

/* O feriado entra na MESMA frase da data, e no plural quando há mais de um —
   dia 5 do Mês da Água tem dois. Anunciar só o primeiro esconderia metade do
   calendário, e é por isso que feriadosDoDia devolve array. */
function textoEventoData(data, en) {
  const rotulo = rotuloDataJogo(data);
  if (!rotulo) return '';
  const base = en ? `The adventure is now ${rotulo}.` : `A aventura agora é ${rotulo}.`;
  const feriados = feriadosDoDia(Number(data.dia), Number(data.mes));
  if (feriados.length === 0) return base;
  const lista = feriados.length === 1
    ? feriados[0]
    : feriados.slice(0, -1).join(', ') + (en ? ' and ' : ' e ') + feriados[feriados.length - 1];
  return base + (en ? ` Today is ${lista}.` : ` Hoje é ${lista}.`);
}

/* DE ONDE PARA ONDE (20/09/2026): "use 'O tempo mudou de 12h para 13h.'"

   Dizia só o destino. Quem lê o log da aventura depois não estava na mesa
   quando aconteceu — sem o ponto de partida, não dá para saber se passou uma
   hora ou doze, e é justamente isso que o desgaste por hora cobra.

   Mesa que ainda não tinha hora não tem "de onde", e a frase vira só o
   destino em vez de inventar um ponto de partida. */
function textoEventoHora(horaAnterior, horaNova, en) {
  const nova = Number(horaNova);
  if (!Number.isFinite(nova)) return '';
  const antes = Number(horaAnterior);
  if (!Number.isFinite(antes)) {
    return en ? `Table time is now ${nova}h.` : `A hora da mesa agora é ${nova}h.`;
  }
  if (antes === nova) return '';
  return en
    ? `Time moved from ${antes}h to ${nova}h.`
    : `O tempo mudou de ${antes}h para ${nova}h.`;
}

function textoEventoLocal(local, en) {
  const l = (local || '').trim();
  if (!l) return '';
  return en ? `The table is now at ${l}.` : `A mesa agora está em ${l}.`;
}

/* "O clima mudou de Desértico para Árido." (usuário, 20/09/2026)

   A TRILHA SAIU DA FRASE. Dizer "Água · Árido" obrigava quem lê a saber que
   Árido é um degrau da trilha da Água; os nomes dos degraus já identificam o
   eixo sozinhos, e o par "de X para Y" conta o que de fato aconteceu.

   E "CLIMA", não "tempo": o usuário separou os dois vocabulários no mesmo
   pedido — tempo é o relógio, clima é a condição atmosférica.

   Sem degrau anterior, parte do PADRÃO da trilha: é o que a barra já mostrava
   antes de alguém tocar nela, então dizer "de Fresco" é verdade, e "de nada"
   não seria. Degrau desconhecido ou igual não vira evento — o id vem de um
   jsonb do banco e pode ser de uma versão anterior da trilha. */
function textoEventoTempo(trilhaChave, degrauAnterior, degrauNovo, en) {
  const trilha = TEMPO_TRILHAS.find((t) => t.chave === trilhaChave);
  if (!trilha) return '';
  const novo = trilha.degraus.find((d) => d.id === degrauNovo);
  if (!novo) return '';
  const antes = trilha.degraus.find((d) => d.id === degrauAnterior)
    || trilha.degraus.find((d) => d.id === trilha.padrao);
  if (!antes || antes.id === novo.id) return '';
  const de = en ? antes.en : antes.pt;
  const para = en ? novo.en : novo.pt;
  return en
    ? `The weather changed from ${de} to ${para}.`
    : `O clima mudou de ${de} para ${para}.`;
}

// Modal de calendário fantasy — visão de todos os meses com feriados destacados.
// Notas pessoais: armazenadas em historias.notas_calendario (JSONB) com chave "MES:DIA".
// Carregadas ao montar / trocar de mês; salvas/apagadas inline via Supabase.
function CalendarioFantasyModal({ dataAtual, dataNasc, lang, historiaId, podeEditar, userId, onDefinirDataAtual, onClose }) {
  const [tip, abrirTip, fecharTip, manterTip] = useNavTooltip(60);
  const en = lang === 'en';
  const meses = typeof FANTASY_MONTHS !== 'undefined' ? FANTASY_MONTHS : null;
  const totalMeses = meses ? meses.length : 13;

  // Mês inicial: o mês atual da data do jogo, ou 1
  const [mesFoco, setMesFoco] = useState(dataAtual ? dataAtual.mes : 1);
  const [anoFoco, setAnoFoco] = useState(dataAtual?.ano ?? 0);

  const mesAtual = meses ? meses[mesFoco - 1] : null;
  const nomeMes = mesAtual?.nome || `Mês ${mesFoco}`;
  const diasNoMes = mesAtual?.dias || (mesFoco === 13 ? 1 : 30);

  // Aniversário do PJ neste mês (se dataNasc fornecida)
  const ehMesAniversario = dataNasc && Number(dataNasc.mes) === mesFoco;
  const diaAniversario = ehMesAniversario ? Number(dataNasc.dia) : null;

  // Dias da semana do mês (para cabeçalho de grade)
  // FANTASY_WEEKDAYS: ['Anaesi','Basvo','Calcato','Moldio','Saegaeti','Saverieto','Sivonte']
  // Âncora: Dia 1, Mês 1, Ano 0 = Moldio (índice 3). Ano tem 361 dias (30×12 + 1 Dia de Cruine).
  const _wd = typeof FANTASY_WEEKDAYS !== 'undefined' ? FANTASY_WEEKDAYS : ['Anaesi','Basvo','Calcato','Moldio','Saegaeti','Saverieto','Sivonte'];
  const DIAS_SEMANA_FULL = _wd;
  const primeiroDiaSemana = (() => {
    const mesesArr = typeof FANTASY_MONTHS !== 'undefined' ? FANTASY_MONTHS : null;
    let acc = anoFoco * 361;
    for (let m = 1; m < mesFoco; m++) acc += (mesesArr ? (mesesArr[m - 1]?.dias || 30) : 30);
    return (acc + 3) % 7;
  })();

  const feriadosPorDia = useMemo(() => {
    const map = {};
    FERIADOS_FANTASY.filter((f) => f.mes === mesFoco).forEach((f) => {
      if (!map[f.dia]) map[f.dia] = [];
      map[f.dia].push(f.nome);
    });
    return map;
  }, [mesFoco]);

  // ── Notas ────────────────────────────────────────────────────────────────────
  // Mestre  → lê/escreve historias.notas_calendario  (JSONB { "mes:dia": texto })
  // Jogador → lê historias.notas_calendario (só leitura, notas do mestre)
  //          + lê/escreve profiles.notas_calendario  (JSONB { "historiaId:mes:dia": texto },
  //            isolado por user via RLS — cada jogador vê só as próprias notas)
  //
  // notasMestre:  { [dia]: string } — notas do mestre para o mês atual (leitura para todos)
  // notasProprias: { [dia]: string } — notas do jogador para o mês atual (só jogador)
  // notasPorDia:  { [dia]: string } — merge para exibição (mestre tem prioridade visual)
  const [notasMestre,   setNotasMestre]   = useState({});
  const [notasProprias, setNotasProprias] = useState({});
  const [todasMestre,   setTodasMestre]   = useState({}); // cache JSONB mestre
  const [todasProprias, setTodasProprias] = useState({}); // cache JSONB jogador
  const [carregandoNotas, setCarregandoNotas] = useState(false);

  // notasPorDia: merge para grade e legenda — notas próprias do jogador sobrepõem as do mestre no mesmo dia
  const notasPorDia = useMemo(() => ({ ...notasMestre, ...notasProprias }), [notasMestre, notasProprias]);

  // Carrega notas ao montar e ao trocar de mês
  useEffect(() => {
    if (!historiaId) return;
    let cancel = false;
    setNotasMestre({});
    setNotasProprias({});
    setCarregandoNotas(true);
    (async () => {
      try {
        // Notas do mestre — todos leem
        const { data: hData } = await supabaseClient
          .from('historias')
          .select('notas_calendario')
          .eq('id', historiaId)
          .single();
        if (cancel) return;
        const todasM = hData?.notas_calendario || {};
        setTodasMestre(todasM);
        const mapM = {};
        Object.entries(todasM).forEach(([k, v]) => {
          const [m, d] = k.split(':').map(Number);
          if (m === mesFoco) mapM[d] = v;
        });
        if (!cancel) setNotasMestre(mapM);

        // Notas próprias do jogador — só jogador carrega
        if (!podeEditar && userId) {
          const { data: pData } = await supabaseClient
            .from('profiles')
            .select('notas_calendario')
            .eq('id', userId)
            .single();
          if (cancel) return;
          const todasP = pData?.notas_calendario || {};
          setTodasProprias(todasP);
          const prefixo = `${historiaId}:${mesFoco}:`;
          const mapP = {};
          Object.entries(todasP).forEach(([k, v]) => {
            if (k.startsWith(prefixo)) {
              const d = Number(k.replace(prefixo, ''));
              if (d > 0) mapP[d] = v;
            }
          });
          if (!cancel) setNotasProprias(mapP);
        }
      } catch (_) {}
      if (!cancel) setCarregandoNotas(false);
    })();
    return () => { cancel = true; };
  }, [mesFoco, historiaId, podeEditar, userId]);

  // ── Dia selecionado + input de nota ─────────────────────────────────────────
  const [diaFoco, setDiaFoco] = useState(null);
  const [inputAtivo, setInputAtivo] = useState(false);
  const [rascunho, setRascunho] = useState('');
  const [salvando, setSalvando] = useState(false);
  const inputRef = useRef(null);

  // Ao focar um dia: preencher rascunho com nota própria existente (jogador) ou do mestre
  const selecionarDia = (dia) => {
    if (diaFoco === dia) { setDiaFoco(null); setInputAtivo(false); setRascunho(''); return; }
    setDiaFoco(dia);
    setInputAtivo(false);
    setRascunho(podeEditar ? (notasMestre[dia] || '') : (notasProprias[dia] || ''));
  };

  // Ao trocar de mês: desselecionar dia
  const trocarMes = (fn) => { setMesFoco(fn); setDiaFoco(null); setInputAtivo(false); setRascunho(''); };

  // Abre o input e foca
  const abrirInput = () => {
    setInputAtivo(true);
    setTimeout(() => inputRef.current?.focus(), 40);
  };

  // Salvar nota
  const salvarNota = async () => {
    if (!historiaId || diaFoco == null) return;
    const texto = rascunho.trim().slice(0, 25);
    setSalvando(true);
    try {
      if (podeEditar) {
        // Mestre → grava em historias.notas_calendario
        const chave = `${mesFoco}:${diaFoco}`;
        const novasNotas = { ...todasMestre };
        if (texto) novasNotas[chave] = texto;
        else delete novasNotas[chave];
        const { error } = await supabaseClient
          .from('historias')
          .update({ notas_calendario: novasNotas })
          .eq('id', historiaId);
        if (!error) {
          setTodasMestre(novasNotas);
          setNotasMestre((prev) => { const n = { ...prev }; if (texto) n[diaFoco] = texto; else delete n[diaFoco]; return n; });
        }
      } else if (userId) {
        // Jogador → grava em profiles.notas_calendario
        const chave = `${historiaId}:${mesFoco}:${diaFoco}`;
        const novasNotas = { ...todasProprias };
        if (texto) novasNotas[chave] = texto;
        else delete novasNotas[chave];
        const { error } = await supabaseClient
          .from('profiles')
          .update({ notas_calendario: novasNotas })
          .eq('id', userId);
        if (!error) {
          setTodasProprias(novasNotas);
          setNotasProprias((prev) => { const n = { ...prev }; if (texto) n[diaFoco] = texto; else delete n[diaFoco]; return n; });
        }
      }
    } catch (_) {}
    setSalvando(false);
    setInputAtivo(false);
  };

  // Apagar nota
  const apagarNota = async () => {
    if (!historiaId || diaFoco == null) return;
    setSalvando(true);
    try {
      if (podeEditar) {
        const chave = `${mesFoco}:${diaFoco}`;
        const novasNotas = { ...todasMestre };
        delete novasNotas[chave];
        const { error } = await supabaseClient
          .from('historias')
          .update({ notas_calendario: novasNotas })
          .eq('id', historiaId);
        if (!error) {
          setTodasMestre(novasNotas);
          setNotasMestre((prev) => { const n = { ...prev }; delete n[diaFoco]; return n; });
        }
      } else if (userId) {
        const chave = `${historiaId}:${mesFoco}:${diaFoco}`;
        const novasNotas = { ...todasProprias };
        delete novasNotas[chave];
        const { error } = await supabaseClient
          .from('profiles')
          .update({ notas_calendario: novasNotas })
          .eq('id', userId);
        if (!error) {
          setTodasProprias(novasNotas);
          setNotasProprias((prev) => { const n = { ...prev }; delete n[diaFoco]; return n; });
        }
      }
    } catch (_) {}
    setSalvando(false);
    setRascunho('');
    setInputAtivo(false);
  };

  // Definir a data atual da aventura (mestre) a partir do dia focado no calendário
  const [definindoData, setDefinindoData] = useState(false);
  const definirComoDataAtual = async () => {
    if (!onDefinirDataAtual || diaFoco == null) return;
    setDefinindoData(true);
    try { await onDefinirDataAtual({ dia: diaFoco, mes: mesFoco, ano: anoFoco }); } catch (_) {}
    setDefinindoData(false);
  };

  // Grade de dias: offset + dias
  const celulas = Array(primeiroDiaSemana).fill(null).concat(
    Array.from({ length: diasNoMes }, (_, i) => i + 1)
  );

  const hoje = dataAtual ? { dia: dataAtual.dia, mes: dataAtual.mes, ano: dataAtual.ano ?? 0 } : null;

  // O painel aparece para qualquer dia selecionado — sempre há pelo menos o botão de nota
  const temConteudoPainel = diaFoco != null;

  return ReactDOM.createPortal(
    <div
      className="cal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="menestrel-ui">
      <div className="cal-modal">

        {/* Header */}
        <div className="cal-header">
          <div className="cal-header-left">
            <i className="ti ti-calendar-month cal-header-icon" aria-hidden="true" />
            {podeEditar ? (
              <div className="cal-header-ano-nav">
                <button
                  className="cal-ano-btn"
                  onClick={() => setAnoFoco((a) => Math.max(0, a - 1))}
                  disabled={anoFoco <= 0}
                  aria-label={en ? 'Previous year' : 'Ano anterior'}
                >‹</button>
                <span className="cal-header-title">
                  {en ? `Year ${anoFoco}` : `Ano ${anoFoco}`}
                </span>
                <button
                  className="cal-ano-btn"
                  onClick={() => setAnoFoco((a) => a + 1)}
                  aria-label={en ? 'Next year' : 'Próximo ano'}
                >›</button>
              </div>
            ) : (
              <span className="cal-header-title">
                {en ? `Year ${anoFoco}` : `Ano ${anoFoco}`}
              </span>
            )}
          </div>
          <button className="cal-header-close" onClick={onClose} aria-label={en ? 'Close' : 'Fechar'}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        {/* Navegação de mês */}
        <div className="cal-nav">
          <button
            className="cal-nav-btn"
            onClick={() => trocarMes((m) => Math.max(1, m - 1))}
            disabled={mesFoco === 1}
            aria-label={en ? 'Previous month' : 'Mês anterior'}
          >‹</button>
          <span className="cal-nav-mes">{nomeMes}</span>
          <button
            className="cal-nav-btn"
            onClick={() => trocarMes((m) => Math.min(totalMeses, m + 1))}
            disabled={mesFoco === totalMeses}
            aria-label={en ? 'Next month' : 'Próximo mês'}
          >›</button>
        </div>

        {/* Cabeçalho dos dias da semana */}
        <div className="cal-weekdays">
          {DIAS_SEMANA_FULL.map((d) => (
            <div key={d} className="cal-weekday">{d}</div>
          ))}
        </div>

        {/* Grade de dias */}
        <div className="cal-grid">
          {celulas.map((dia, idx) => {
            if (dia === null) return <div key={`off-${idx}`} />;
            const ehHoje   = hoje && hoje.ano === anoFoco && hoje.mes === mesFoco && hoje.dia === dia;
            const feriados = feriadosPorDia[dia] || [];
            const temFeriado = feriados.length > 0;
            const ehAniv   = diaAniversario === dia;
            const temNota  = !!notasPorDia[dia];
            const focado   = diaFoco === dia;
            const classes  = [
              'cal-dia',
              ehHoje   ? 'is-hoje'        : '',
              ehAniv   ? 'is-aniversario' : '',
              (!ehHoje && !ehAniv && focado) ? 'is-focado' : '',
            ].filter(Boolean).join(' ');
            return (
              <button
                key={dia}
                className={classes}
                onClick={() => selecionarDia(dia)}
                aria-label={`${dia}${temFeriado ? ' — ' + feriados.join(', ') : ''}${ehAniv ? (en ? ' — Birthday' : ' — Aniversário') : ''}${temNota ? ' — ' + notasPorDia[dia] : ''}`}
              >
                <span>{dia}</span>
                {(temFeriado || ehAniv || temNota) && (
                  <div className="cal-dia-dots">
                    {temFeriado && <span className="cal-dot cal-dot-feriado" />}
                    {ehAniv     && <span className="cal-dot cal-dot-aniv" />}
                    {temNota    && <span className="cal-dot cal-dot-nota" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Painel de detalhe do dia selecionado */}
        {temConteudoPainel && (
          <div className="cal-painel">
            <div className="cal-painel-eyebrow">
              <span className="cal-painel-dia-label">
                {en ? `Day ${diaFoco}` : `Dia ${diaFoco}`}
              </span>
              <div className="cal-painel-acoes">
                {podeEditar && onDefinirDataAtual && (
                  (dataAtual && dataAtual.dia === diaFoco && dataAtual.mes === mesFoco && (dataAtual.ano ?? 0) === anoFoco) ? (
                    <span className="cal-data-atual-tag">
                      <i className="ti ti-map-pin-filled" aria-hidden="true" />
                      {en ? 'Current date' : 'Data atual'}
                    </span>
                  ) : (
                    <button
                      className="cal-definir-data-btn"
                      onClick={definirComoDataAtual}
                      disabled={definindoData}
                      {...propsTip(abrirTip, fecharTip, en ? 'Set as current date' : 'Definir como data atual')}
                    >
                      <i className="ti ti-calendar-check" aria-hidden="true" />
                      <span>{definindoData ? (en ? 'Setting…' : 'Definindo…') : (en ? 'Set as current' : 'Definir como atual')}</span>
                    </button>
                  )
                )}
                {!inputAtivo && (
                  <button
                    className="cal-nota-del"
                    onClick={abrirInput}
                    {...propsTip(abrirTip, fecharTip, notasPorDia[diaFoco] ? (en ? 'Edit note' : 'Editar nota') : (en ? 'Add note' : 'Adicionar nota'))}
                    aria-label={notasPorDia[diaFoco] ? (en ? 'Edit note' : 'Editar nota') : (en ? 'Add note' : 'Adicionar nota')}
                  >
                    <i className={`ti ${notasPorDia[diaFoco] ? 'ti-pencil' : 'ti-plus'}`} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            {/* Aniversário */}
            {diaFoco === diaAniversario && (
              <div className="cal-evento cal-evento-aniv">
                <i className="ti ti-cake" aria-hidden="true" />
                <span>
                  {en ? 'Birthday' : 'Aniversário do personagem'}
                  {dataAtual?.ano && dataNasc?.ano ? ` (${Number(dataAtual.ano) - Number(dataNasc.ano)} ${en ? 'years' : 'anos'})` : ''}
                </span>
              </div>
            )}

            {/* Feriados */}
            {(feriadosPorDia[diaFoco] || []).map((nome, i) => (
              <div key={i} className="cal-evento cal-evento-feriado">
                <i className="ti ti-sparkles" aria-hidden="true" />
                <span>{nome}</span>
              </div>
            ))}

            {/* Nota existente */}
            {notasPorDia[diaFoco] && !inputAtivo && (
              <div className="cal-nota-row">
                <i className="ti ti-notebook" aria-hidden="true" />
                <span className="cal-nota-texto">{notasPorDia[diaFoco]}</span>
                <button
                  className="cal-nota-del"
                  onClick={apagarNota}
                  disabled={salvando}
                  aria-label={en ? 'Delete note' : 'Apagar nota'}
                >
                  <i className="ti ti-trash" aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Input inline de nota */}
            {inputAtivo && (
              <div className="cal-input-row">
                <input
                  ref={inputRef}
                  type="text"
                  className="cal-input"
                  maxLength={25}
                  value={rascunho}
                  onChange={(e) => setRascunho(e.target.value.slice(0, 25))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter')  { e.preventDefault(); salvarNota(); }
                    if (e.key === 'Escape') { setInputAtivo(false); setRascunho(notasPorDia[diaFoco] || ''); }
                  }}
                  placeholder={en ? 'Up to 25 characters…' : 'Até 25 caracteres…'}
                />
                <button
                  className="cal-input-ok"
                  onClick={salvarNota}
                  disabled={salvando}
                  aria-label={en ? 'Save' : 'Salvar'}
                >
                  {salvando ? '…' : (en ? 'Save' : 'Ok')}
                </button>
                <button
                  className="cal-input-cancel"
                  onClick={() => { setInputAtivo(false); setRascunho(notasPorDia[diaFoco] || ''); }}
                  aria-label={en ? 'Cancel' : 'Cancelar'}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}

        {/* Legenda do mês — visível quando nenhum dia está selecionado */}
        {!diaFoco && (() => {
          // Mescla feriados, aniversário e notas numa lista plana ordenada por dia
          const itens = [];
          if (ehMesAniversario) itens.push({ dia: diaAniversario, tipo: 'aniv', texto: en ? 'Birthday' : 'Aniversário do personagem' });
          Object.entries(feriadosPorDia).forEach(([dia, nomes]) =>
            nomes.forEach((nome, i) => itens.push({ dia: Number(dia), tipo: 'feriado', texto: nome, i }))
          );
          Object.entries(notasPorDia).forEach(([dia, texto]) =>
            itens.push({ dia: Number(dia), tipo: 'nota', texto })
          );
          itens.sort((a, b) => a.dia - b.dia);
          if (itens.length === 0) return (
            <div className="cal-vazio">
              {en ? 'No holidays this month' : 'Nenhum feriado neste mês'}
            </div>
          );
          return (
            <div className="cal-legenda">
              {itens.map((item, idx) => (
                <div key={idx} className="cal-legenda-row">
                  <span className={`cal-legenda-num-${item.tipo}`}>{item.dia}</span>
                  <span className="cal-legenda-sep">·</span>
                  <span className={`cal-legenda-nome-${item.tipo}`}>{item.texto}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>{/* cal-modal */}
      </div>{/* menestrel-ui */}
      <NavTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </div>,
    document.body
  );
}

/* ============================== [9.4b] Condição do tempo — três trilhas de cinco degraus ==============================
   Mora ao lado de data e local, na mesma barra do topo, e é gravada no MESMO
   jsonb (historias.data_jogo_atual.tempo) — por isso já chega em todo mundo
   pelo realtime que o CardDataJogoAtual assina, sem coluna nova nem migração.

   Um botão por trilha, e o botão CICLA — mesmo trato da iluminação da batalha
   ativa (VISIBILIDADE_ORDEM em 12-batalha/batalha.jsx): são degraus numa
   escada, o ícone diz em qual você está e o Mestre avança a chuva no meio da
   narração sem abrir menu. O tooltip nomeia a trilha e o degrau, que é o que
   o ícone sozinho não consegue dizer.

   Só o Mestre cicla; o Jogador vê. E a leitura é o motivo de NÃO usar
   `disabled` no botão do Jogador: botão desabilitado não dispara mouseenter,
   e sem tooltip o ícone fica mudo justamente pra quem não pode clicar.

   Os ícones foram conferidos contra o tabler-icons.min.css que o index.html
   carrega — mesma disciplina do VISIBILIDADE_ICONE, onde um `ti-cloud-moon`
   inventado virou quadrado vazio na tela. */
const TEMPO_TRILHAS = [
  {
    chave: 'agua',
    rotulo: { pt: 'Água', en: 'Water' },
    degraus: [
      { id: 'desertico',  ic: 'ti-cactus',      pt: 'Desértico',   en: 'Desert' },
      { id: 'arido',      ic: 'ti-droplet-off', pt: 'Árido',       en: 'Arid' },
      { id: 'fresco',     ic: 'ti-droplet',     pt: 'Fresco',      en: 'Fresh' },
      { id: 'chuva_fina', ic: 'ti-cloud-rain',  pt: 'Chuva fina',  en: 'Light rain' },
      { id: 'tempestade', ic: 'ti-cloud-storm', pt: 'Tempestade',  en: 'Storm' },
    ],
    padrao: 'fresco',
  },
  {
    chave: 'vento',
    rotulo: { pt: 'Vento', en: 'Wind' },
    degraus: [
      { id: 'sem_vento', ic: 'ti-wind-off', pt: 'Sem vento',    en: 'No wind' },
      { id: 'leves',     ic: 'ti-wind',     pt: 'Ventos leves', en: 'Light winds' },
      { id: 'ventania',  ic: 'ti-windsock', pt: 'Ventania',     en: 'Strong wind' },
      { id: 'vendaval',  ic: 'ti-storm',    pt: 'Vendaval',     en: 'Gale' },
      { id: 'tornado',   ic: 'ti-tornado',  pt: 'Tornado',      en: 'Tornado' },
    ],
    padrao: 'sem_vento',
  },
  {
    chave: 'temperatura',
    rotulo: { pt: 'Temperatura', en: 'Temperature' },
    degraus: [
      { id: 'frio_extremo',  ic: 'ti-snowflake',        pt: 'Frio extremo',  en: 'Extreme cold' },
      { id: 'frio_leve',     ic: 'ti-temperature-snow', pt: 'Frio leve',     en: 'Mild cold' },
      { id: 'agradavel',     ic: 'ti-temperature',      pt: 'Agradável',     en: 'Pleasant' },
      { id: 'calor_leve',    ic: 'ti-temperature-sun',  pt: 'Calor leve',    en: 'Mild heat' },
      { id: 'calor_extremo', ic: 'ti-flame',            pt: 'Calor extremo', en: 'Extreme heat' },
    ],
    padrao: 'agradavel',
  },
];

/* Degrau em que a trilha está. Mesa antiga (sem `tempo` no jsonb) e valor
   desconhecido caem no padrão da trilha em vez de sumir da tela. */
function degrauTempo(trilha, tempo) {
  const id = tempo && tempo[trilha.chave];
  return trilha.degraus.find((d) => d.id === id)
    || trilha.degraus.find((d) => d.id === trilha.padrao);
}

/* O botão ABRE A LISTA em vez de ciclar (16/09/2026): "ao clicar em um botão,
   abre as opções para escolher". Ciclar obrigava a passar por Tempestade para
   voltar de Chuva fina a Fresco, e o Mestre não navega o clima em escada — ele
   já sabe onde quer parar. Some, com isso, o `proximoDegrauTempo`. */

/* "Água · Chuva fina" — a trilha antes do degrau, porque três ícones lado a
   lado só se distinguem quando o tooltip diz de qual eixo cada um fala. */
function textoTempo(trilha, degrau, en) {
  return `${en ? trilha.rotulo.en : trilha.rotulo.pt} · ${en ? degrau.en : degrau.pt}`;
}

/* ============================== [9.4b2] O clima pinta o fundo do console ==============================
   "Água: efeito de chuva mais forte em tempestade, e efeito de areia mais
    forte em desértico. Vento: efeito de vento mais forte em tornado, e ir
    diminuindo. Temperatura: efeito de insolação mais forte em calor extremo,
    e efeito de neve mais forte em frio extremo." (usuário, 20/09/2026)

   Duas das três trilhas são EIXOS, não escadas: a água vai de deserto a
   tempestade passando por um meio seco-nem-molhado, e a temperatura vai de
   frio a calor passando por agradável. Nesses dois, o degrau do meio não
   desenha nada, e os lados desenham coisas DIFERENTES — areia e chuva não são
   o mesmo efeito com o sinal trocado, e por isso o mapa é explícito em vez de
   uma conta sobre o índice do degrau. Vento é a única escada de verdade.

   A tabela repete os ids de TEMPO_TRILHAS de propósito: quem mexer num degrau
   lá precisa decidir o que ele pinta aqui, e um id órfão simplesmente não
   desenha (ver efeitosDoTempo) em vez de derrubar a tela. */
const CLIMA_EFEITOS = {
  agua: {
    desertico:  { tipo: 'areia', intensidade: 2 },
    arido:      { tipo: 'areia', intensidade: 1 },
    fresco:     null,
    chuva_fina: { tipo: 'chuva', intensidade: 1 },
    tempestade: { tipo: 'chuva', intensidade: 2 },
  },
  vento: {
    sem_vento: null,
    leves:     { tipo: 'vento', intensidade: 1 },
    ventania:  { tipo: 'vento', intensidade: 2 },
    vendaval:  { tipo: 'vento', intensidade: 3 },
    tornado:   { tipo: 'vento', intensidade: 4 },
  },
  temperatura: {
    frio_extremo:  { tipo: 'neve', intensidade: 2 },
    frio_leve:     { tipo: 'neve', intensidade: 1 },
    agradavel:     null,
    calor_leve:    { tipo: 'insolacao', intensidade: 1 },
    calor_extremo: { tipo: 'insolacao', intensidade: 2 },
  },
};

/* `hasOwnProperty` e não `mapa[id]` direto: o id vem de um jsonb do banco, e
   um valor como "constructor" acharia algo no protótipo e viraria um efeito
   sem tipo na tela. */
function efeitoDoDegrau(chave, id) {
  const mapa = CLIMA_EFEITOS[chave];
  return Object.prototype.hasOwnProperty.call(mapa, id) ? mapa[id] : null;
}

/* O que o fundo desenha, na ordem em que as camadas entram. Recebe o jsonb
   inteiro, não só `.tempo`, porque é assim que é chamada — e mesa sem clima
   definido, que é a maioria, tem que abrir com a tela limpa: os padrões das
   três trilhas (fresco, sem vento, agradável) são justamente os neutros. */
function efeitosDoTempo(data) {
  const tempo = (data && data.tempo) || {};
  const ventoEfeito = efeitoDoDegrau('vento', tempo.vento);
  const vento = ventoEfeito ? ventoEfeito.intensidade : 0;
  return ['agua', 'vento', 'temperatura'].reduce((acc, chave) => {
    const e = efeitoDoDegrau(chave, tempo[chave]);
    if (!e) return acc;
    // Chuva e neve caem tortas quando venta — o nível viaja junto na camada
    // em vez de ela ter que ir buscá-lo.
    const caiDoCeu = e.tipo === 'chuva' || e.tipo === 'neve';
    acc.push(caiDoCeu ? { ...e, vento } : { ...e });
    return acc;
  }, []);
}

/* ============================== [9.4c] Dia ou noite — o botão ao lado do clima ==============================
   "Juntamente com os cards de local, data e mesa do topo, adicione um botão
    para selecionar se é dia ou se é noite." (usuário, 17/09/2026)

   Mesmo arranjo do clima: mora no jsonb `historias.data_jogo_atual` (chave
   `periodo`), e por isso já chega a todo mundo pelo realtime que o card já
   assina — sem coluna nova nem migração.

   Diferente do clima, aqui o botão ALTERNA em vez de abrir lista: são dois
   estados, e uma lista de duas opções custa um clique a mais para dizer o que
   o ícone já diz. Mesa antiga (sem `periodo` no jsonb) é dia. */
const PERIODOS = [
  { id: 'dia',   ic: 'ti-sun',  pt: 'Dia',   en: 'Day' },
  { id: 'noite', ic: 'ti-moon', pt: 'Noite', en: 'Night' },
];

/* ============================== [9.4d] A hora do jogo e a luz que ela lança ==============================
   "a iluminação dourada mais à direita representa o sol nascendo no leste, e a
    luz mais à esquerda se pondo no oeste. (…) Para ambos, a iluminação ao meio
    representa meio dia e meia noite, horário onde a luz ficará mais forte."
   (usuário, 20/09/2026)

   A hora (0–23) mora no MESMO jsonb da data (`data_jogo_atual.hora`), como o
   clima e o período antes dela — nenhuma coluna nova, e o realtime que o card
   já assina entrega a mudança a todo mundo.

   O PERÍODO DEIXOU DE SER ESCOLHA e virou consequência: 6h–17h é dia, 18h–5h
   é noite. O sol/lua da barra continua lá, agora como leitura do que a hora
   diz. Isso põe meio-dia e meia-noite no centro exato de cada travessia, que é
   o que o efeito pede — o dia e a noite precisam ter a mesma duração pra luz
   chegar ao auge no meio dos dois.

   Mesa antiga não tem `hora`, e é aí que o `periodo` já gravado ainda serve:
   vale como fallback até alguém definir a hora. Sem isso, toda mesa em curso
   amanheceria à meia-noite no dia em que este código subisse. */
const HORA_NASCER = 6;          // primeira hora de dia
const HORAS_POR_PERIODO = 12;   // dia e noite têm a mesma duração

function periodoDaHora(hora) {
  return (hora >= HORA_NASCER && hora < HORA_NASCER + HORAS_POR_PERIODO) ? 'dia' : 'noite';
}

/* 0 no nascente (leste, à direita), 0.5 no meio da travessia (meio-dia ou
   meia-noite, no centro), 1 no poente (oeste, à esquerda).

   O `+ 24` antes do módulo é a virada das 23h para as 0h: sem ele a noite
   ganha fase negativa depois da meia-noite e a luz salta para fora da tela. */
function faseDoPeriodo(hora) {
  const inicio = periodoDaHora(hora) === 'dia' ? HORA_NASCER : HORA_NASCER + HORAS_POR_PERIODO;
  return ((hora - inicio + 24) % 24) / HORAS_POR_PERIODO;
}

/* Hora utilizável a partir do jsonb, que pode vir de mesa antiga, de mesa sem
   data nenhuma, ou com lixo — a barra do topo nunca pode sumir por causa disso. */
function horaDoJogo(data) {
  const h = data && data.hora;
  if (Number.isInteger(h) && h >= 0 && h <= 23) return h;
  return (data && data.periodo === 'noite') ? 0 : 12;
}

/* O que o fundo do console precisa saber. `origemX` é a posição horizontal da
   fonte de luz em %, e `forca` a intensidade — nunca 0, senão a tela fica
   chapada no nascer e no pôr do sol, onde ainda há luz rasante. `inclinacao`
   deixa os raios verticais no auge (sol a pino) e deitados no horizonte. */
function luzDaHora(data) {
  const hora = horaDoJogo(data);
  const periodo = periodoDaHora(hora);
  const fase = faseDoPeriodo(hora);
  const quente = periodo === 'dia';
  return {
    hora,
    periodo,
    fase,
    quente,
    origemX: (1 - fase) * 100,
    forca: 0.35 + 0.65 * Math.sin(Math.PI * fase),
    inclinacao: -45 + fase * 90,
    // Ouro e bronze de dia (os mesmos de sempre); luar de aço à noite.
    cor: quente ? '201,164,78' : '143,166,196',
    cor2: quente ? '184,112,46' : '92,115,146',
  };
}

/* O fundo do console pronto para aplicar: o AdminConsole não faz conta, só
   pinta. É o que permite provar a iluminação sem montar o console inteiro,
   com sessão, perfil e mesa. Os cinco valores são exatamente os que mudam com
   a hora — máscara (de onde a luz vem), inclinação (quão rasante ela é),
   opacidade (quão forte) e o par de cores dos filetes. */
function estiloLuzFundo(data) {
  const luz = luzDaHora(data);
  const doisDec = (n) => Math.round(n * 100) / 100;
  const rgba = (cor, a) => `rgba(${cor},${a})`;
  const filete = (cor) => `linear-gradient(${rgba(cor, 1)} 0%, ${rgba(cor, 0)} 100%)`;
  /* O AUGE É O PONTO ALTO (20/09/2026, "torne os horários 12h e 24h mais
     claros"). Duas coisas acontecem no meio da travessia, e nenhuma delas é
     levantar o dia inteiro:

     - a opacidade é o QUADRADO da força, não ela mesma. O teto subiu de 0.1
       para 0.24, mas o quadrado segura o horizonte onde ele já estava (0.03) e
       estreita a corcova, então o meio-dia se destaca das horas vizinhas em
       vez de arrastar a tarde toda com ele.
     - a máscara ABRE de 125% para 175%: a pino, a luz não é só mais forte,
       ela alcança mais tela. */
  const auge = Math.sin(Math.PI * luz.fase);
  return {
    mask: `radial-gradient(${doisDec(125 + 50 * auge)}% 100% at ${doisDec(luz.origemX)}% 0%, #000 0%, rgba(0,0,0,0.22) 88%, transparent 100%)`,
    transform: `skewX(${doisDec(luz.inclinacao)}deg)`,
    opacity: 0.24 * luz.forca * luz.forca,
    corA: rgba(luz.cor, 1),
    corB: rgba(luz.cor2, 1),
    gradA: filete(luz.cor),
    gradB: filete(luz.cor2),
  };
}

function periodoDoJogo(data) {
  const id = luzDaHora(data).periodo;
  return PERIODOS.find((p) => p.id === id) || PERIODOS[0];
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
function CardDataJogoAtual({ lang, historiaId, podeEditar, userId, minhasHistorias, mesaAtivaId, setMesaAtivaId, profile, onNovaHistoria, limiteFreeHistoria, esconderSeletorEBotaoNovo, sidebarLargura = 208, onNovoPersonagem, limiteFreePersonagem, esconderBotaoPersonagem, dataNascPjAtivo = null, onDataAtual = null }) {
  const [tip, abrirTip, fecharTip, manterTip] = useNavTooltip(60);
  const [dataAtual, setDataAtual] = useState(null); // { dia, mes, ano, local } | null
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(null); // null | 'data' | 'local'
  const [rascunho, setRascunho] = useState({ dia: 1, mes: 1, ano: 0, local: '' });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [tempoAberto, setTempoAberto] = useState(null); // chave da trilha com a lista aberta
  const [horaAberta, setHoraAberta] = useState(false); // lista das 24 horas
  const [calendarioAberto, setCalendarioAberto] = useState(false);
  const tempoDropRef = React.useRef(null);
  const horaDropRef = React.useRef(null);
  // Espelho de `editando` para o ouvinte de realtime, que é montado uma vez
  // por mesa e não pode depender do estado da edição em curso.
  const editandoRef = React.useRef(null);
  useEffect(() => { editandoRef.current = editando; }, [editando]);

  /* O fundo do console é iluminado pela hora da mesa (ver luzDaHora), e quem
     carrega e assina esse jsonb é este card — não o AdminConsole, que é o pai
     e só tem a pintura. Sem este aviso, o Mestre avançaria o relógio e a luz
     só mudaria no F5 seguinte. Vale para o Jogador também: a hora chega a ele
     pelo realtime, e o fundo dele tem que acompanhar. */
  useEffect(() => { if (onDataAtual) onDataAtual(dataAtual); }, [dataAtual, onDataAtual]);

  /* Mesmo trato para a lista do clima, mais o Escape: o grupo inteiro divide um
     ref, então clicar no pill do Vento com a lista da Água aberta troca de lista
     em vez de fechar — é um clique dentro do grupo, e o onClick do pill resolve. */
  useEffect(() => {
    if (!tempoAberto) return undefined;
    const fora = (e) => {
      if (tempoDropRef.current && !tempoDropRef.current.contains(e.target)) setTempoAberto(null);
    };
    const esc = (e) => { if (e.key === 'Escape') setTempoAberto(null); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [tempoAberto]);

  // Idem para a lista das horas, que tem o próprio ref por ser um pill só.
  useEffect(() => {
    if (!horaAberta) return undefined;
    const fora = (e) => {
      if (horaDropRef.current && !horaDropRef.current.contains(e.target)) setHoraAberta(false);
    };
    const esc = (e) => { if (e.key === 'Escape') setHoraAberta(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [horaAberta]);

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

    /* A data é DA MESA, não de quem olha (15/09/2026): o Mestre avança o dia e
       todo mundo tem que ver o mesmo dia, sem recarregar a página.

       Antes a carga acontecia uma vez, quando a mesa era resolvida — o jogador
       ficava com a data velha na tela até dar F5. `historias` já está na
       publicação de realtime (a mesma que mesa_log e batalhas usam), então é
       só ouvir o UPDATE da linha desta mesa.

       O `select` acima continua sendo a fonte da primeira pintura: realtime
       traz o que MUDA, não o que já estava lá. */
    const canal = (typeof supabaseClient.channel === 'function')
      ? supabaseClient
        .channel('historia_data_' + historiaId)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'historias', filter: 'id=eq.' + historiaId,
        }, (payload) => {
          if (cancel) return;
          const nova = payload && payload.new && payload.new.data_jogo_atual;
          // Editando: não puxa o tapete de quem está com o formulário aberto.
          setDataAtual((atual) => (editandoRef.current ? atual : (nova || null)));
        })
        .subscribe()
      : null;

    return () => {
      cancel = true;
      if (canal) supabaseClient.removeChannel(canal);
    };
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

  /* O TEMPO DA MESA VIRA EVENTO NO LOG (20/09/2026). Mesmo padrão de
     registrarEventoMesa em 11-ficha e 07-inventario: RPC SECURITY DEFINER que
     grava em mesa_log, e o Realtime distribui para Mestre e Jogadores.

     Não bloqueia nem desfaz nada: a data, a hora e o clima já foram gravados e
     já estão na tela de todo mundo quando isto dispara. Falhar aqui custa uma
     linha no log, não a mudança — por isso o erro só vai para o console.

     `meta` guarda o valor estruturado ao lado do texto já escrito. O texto é
     renderizado no idioma de QUEM MEXEU (é assim que todo evento de mesa já
     funciona); o meta é o que permitiria, um dia, reescrever o evento no
     idioma de quem lê. */
  const registrarEventoMesa = (texto, meta) => {
    if (!historiaId || !texto) return;
    supabaseClient
      .rpc('registrar_evento_mesa', {
        p_historia_id: historiaId,
        p_tipo: 'sistema',
        p_texto: texto,
        p_meta: meta || {},
      })
      .then(({ data, error }) => {
        if (error || (data && data.ok === false)) {
          console.error('[data-jogo-atual] registrar_evento_mesa falhou:', error || data);
        }
      });
  };

  /* ============================== O RELÓGIO DESGASTA A MESA ==============================
     Implementa docs/superpowers/specs/2026-09-20-clima-desgaste-design.md. As
     regras todas moram em 01-core/clima-desgaste.jsx, puras; o que está aqui é
     só a ida ao banco.

     Escreve nos PJs dos OUTROS: a policy personagens_update_own_or_vinculado
     autoriza o Mestre a mexer em quem está em `protagonista_ids` da história
     dele. Não é preciso RPC — foi conferido em pg_policies antes de desenhar.

     Nada disto bloqueia a barra: a hora e o clima já foram gravados e já estão
     na tela de todo mundo quando estas funções rodam. Falhar aqui deixa horas
     PENDENTES, não perdidas — é para isso que serve a âncora. */

  // O instante em que a mesa está, ou null quando ela ainda não tem data.
  const instanteDe = (d) => {
    if (!d || d.dia == null || d.mes == null || d.ano == null) return null;
    return { ano: d.ano, mes: d.mes, dia: d.dia, hora: horaDoJogo(d) };
  };

  /* A ÂNCORA é o instante até onde o desgaste já foi cobrado, e não o relógio
     anterior. A diferença importa quando uma escrita falha: com o relógio como
     referência, aquelas horas sumiriam para sempre; com a âncora, elas ficam
     devendo e são cobradas no próximo movimento.

     Mesa sem âncora (todas, no dia em que isto subir) ancora no relógio atual:
     ninguém acorda devendo quinhentas horas de fome. */
  const ancoraDe = (d) => (d && d.decaimento_em) || instanteDe(d);

  const aplicarDesgasteNosPJs = async (horas, horaInicial, tempo) => {
    if (horas <= 0) return;
    const { data: hist, error } = await supabaseClient
      .from('historias').select('protagonista_ids').eq('id', historiaId).maybeSingle();
    if (error || !hist) { console.error('[desgaste] não consegui ler os protagonistas:', error); return; }
    const ids = Array.isArray(hist.protagonista_ids) ? hist.protagonista_ids : [];
    if (ids.length === 0) return;
    // A linha INTEIRA: a atividade (dormir, meditar…) recupera energia até o
    // máximo da ficha e soma atributo, e os dois saem de calcularFicha.
    const { data: pjs, error: erroPjs } = await supabaseClient
      .from('personagens').select('*').in('id', ids);
    if (erroPjs || !pjs) { console.error('[desgaste] não consegui ler os PJs:', erroPjs); return; }
    const semKarma = window.SEM_KARMA || new Set(['Guerreiro', 'Ladino']);
    await Promise.all(pjs.map((pj) => {
      const est = pj.estado_atual || {};
      const tipoAtividade = est.atividade && est.atividade.tipo;
      const desgastado = { ...est, condicoes: decaimentoPorHoras(est.condicoes, horaInicial, horas, tempo, tipoAtividade) };
      /* O descanso vem DEPOIS do desgaste: o máximo de EF/EH/KA depende das
         condições (fome tira karma, por exemplo), e vale o das condições que
         a hora deixou. */
      let novo = desgastado;
      if (tipoAtividade) {
        const ficha = calcularFicha(pj, null, desgastado.condicoes);
        const d = ficha.derivadas || {};
        novo = recuperacaoPorAtividade(desgastado, horas, {
          atributos: ficha.atributos,
          maximos: { ef: Number(d.energiaFisica) || 0, eh: Number(d.energiaHeroica) || 0, ka: Number(d.karmamax) || 0 },
          semKarma: semKarma.has(pj.profissao),
          // Morto não descansa: EF no piso da batalha (EF_MORTE, −15) ou a
          // marca manual de "morto" do Mestre.
          morto: Number(est.vitalidade && est.vitalidade.ef) <= -15
            || (Array.isArray(est.status) && est.status.some((st) => (window.tipoDoStatus || (() => null))(st) === 'morto')),
        });
      }
      return supabaseClient.from('personagens').update({ estado_atual: novo }).eq('id', pj.id)
        .then(({ error: e }) => { if (e) console.error('[desgaste] PJ', pj.id, e); });
    }));
  };

  /* Chuva coletada. O estoque é reescrito inteiro, então a entrada da água é
     somada à que existir em vez de substituí-la — e nasce com preço nenhum,
     herdando o do catálogo, porque água da chuva não tem dono. */
  const aplicarChuvaNaLoja = async (horas, tempo) => {
    const porHora = aguaPorHoraDeChuva(tempo && tempo.agua);
    if (porHora <= 0 || horas <= 0) return;
    const ganho = porHora * horas;
    const { data: hist, error } = await supabaseClient
      .from('historias').select('estoque_loja').eq('id', historiaId).maybeSingle();
    if (error || !hist) { console.error('[desgaste] não consegui ler a loja:', error); return; }
    const estoque = Array.isArray(hist.estoque_loja) ? hist.estoque_loja : [];
    const i = estoque.findIndex((it) => it && it.slug === 'agua');
    const novo = i >= 0
      ? estoque.map((it, k) => k === i ? { ...it, estoque: (Number(it.estoque) || 0) + ganho } : it)
      : [...estoque, { slug: 'agua', estoque: ganho }];
    const { error: erroUp } = await supabaseClient
      .from('historias').update({ estoque_loja: novo }).eq('id', historiaId);
    if (erroUp) console.error('[desgaste] não consegui gravar a loja:', erroUp);
  };

  /* O desgaste de N horas: as condições dos PJs e a água da loja. `horaInicial`
     é a hora da ÂNCORA, não a nova — é dela que o motor parte para saber
     quantas das horas cruzadas caem na janela do sono. */
  /* A cobrança avulsa de mudar o clima: uma hora daquele degrau, em todos os
     PJs da mesa. Percorre os mesmos passos de aplicarDesgasteNosPJs, mas
     chamando tiqueDeClima — que cobra SÓ o efeito do clima, sem a fome, a sede
     de base e o sono, porque o relógio não andou. */
  const aplicarTiqueDeClima = async (trilhaChave, degrauId) => {
    if (trilhaChave !== 'temperatura') return;
    const { data: hist, error } = await supabaseClient
      .from('historias').select('protagonista_ids').eq('id', historiaId).maybeSingle();
    if (error || !hist) { console.error('[desgaste] tique: protagonistas', error); return; }
    const ids = Array.isArray(hist.protagonista_ids) ? hist.protagonista_ids : [];
    if (ids.length === 0) return;
    const { data: pjs, error: erroPjs } = await supabaseClient
      .from('personagens').select('id, estado_atual').in('id', ids);
    if (erroPjs || !pjs) { console.error('[desgaste] tique: PJs', erroPjs); return; }
    await Promise.all(pjs.map((pj) => {
      const est = pj.estado_atual || {};
      const novo = { ...est, condicoes: tiqueDeClima(est.condicoes, trilhaChave, degrauId) };
      return supabaseClient.from('personagens').update({ estado_atual: novo }).eq('id', pj.id)
        .then(({ error: e }) => { if (e) console.error('[desgaste] tique PJ', pj.id, e); });
    }));
  };

  const cobrarHoras = async (ancora, instanteNovo, tempo) => {
    const horas = horasEntre(ancora, instanteNovo);
    if (horas <= 0) return;
    await Promise.all([
      aplicarDesgasteNosPJs(horas, horaDoJogo(ancora), tempo),
      aplicarChuvaNaLoja(horas, tempo),
    ]);
  };

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    // Guardado ANTES do update: é com ele que se decide o que mudou de fato e,
    // portanto, o que merece virar evento no log.
    const anteriorSalvar = dataAtual;
    /* O jsonb é reescrito inteiro pelo update, então TUDO que mora nele tem
       que entrar no payload — inclusive o tempo, que este formulário nem
       mostra. Sem isso, editar o local apagava a condição do tempo. */
    const payload = {
      ...(dataAtual || {}),
      dia: rascunho.dia, mes: rascunho.mes, ano: rascunho.ano, local: rascunho.local.trim(),
      tempo: (dataAtual && dataAtual.tempo) || undefined,
    };
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
    /* Data E local numa mesma edição viram DOIS eventos: são duas informações
       diferentes para quem lê o log, e quem só mexeu no local não deve fazer o
       calendário parecer que andou. Por isso cada um só dispara se mudou de
       verdade — comparando com o que estava antes, não com o vazio. */
    const mudouData = !anteriorSalvar
      || anteriorSalvar.dia !== payload.dia
      || anteriorSalvar.mes !== payload.mes
      || anteriorSalvar.ano !== payload.ano;
    const mudouLocal = ((anteriorSalvar && anteriorSalvar.local) || '') !== payload.local;
    if (mudouData) {
      registrarEventoMesa(textoEventoData(payload, lang === "en"),
        { data: { dia: payload.dia, mes: payload.mes, ano: payload.ano } });
    }
    if (mudouLocal) registrarEventoMesa(textoEventoLocal(payload.local, lang === "en"), { local: payload.local });
  };

  // Define a data atual da aventura a partir do calendário (mestre) — preserva o local
  const definirDataAtual = async ({ dia, mes, ano }) => {
    const anterior = dataAtual;
    const ancora = ancoraDe(anterior);
    const instanteNovo = { ano, mes, dia, hora: horaDoJogo(anterior) };
    const payload = {
      ...(anterior || {}),
      dia, mes, ano,
      local: (anterior && anterior.local) || '',
      tempo: (anterior && anterior.tempo) || undefined,
      decaimento_em: instanteNovo,
    };
    const { error } = await supabaseClient
      .from('historias').update({ data_jogo_atual: payload }).eq('id', historiaId);
    if (error) { console.error('[data-jogo-atual] definir data falhou:', error); return { error }; }
    setDataAtual(payload);
    /* Avançar três dias no calendário são 72 horas de desgaste — data e
       relógio contam igual. Para TRÁS não cobra nada (horasEntre devolve 0) e
       só re-ancora: tempo que passou, passou. */
    await cobrarHoras(ancora, instanteNovo, anterior && anterior.tempo);
    registrarEventoMesa(textoEventoData(payload, lang === "en"), { data: { dia, mes, ano } });
    return {};
  };

  /* Grava UM degrau de UMA trilha. Otimista: a barra já mostra o degrau novo
     enquanto o update viaja — a lista fecha no clique, e esperar o banco para
     repintar deixaria o pill no valor velho por um tempo visível. Falhou, volta
     ao que estava e registra. */
  const definirTempo = async (trilha, prox) => {
    if (!podeEditar || !historiaId) return;
    setTempoAberto(null);
    const anterior = dataAtual;
    if (degrauTempo(trilha, anterior && anterior.tempo) === prox) return;
    /* Espalha o que já estava no jsonb em vez de remontar campo a campo: numa
       mesa que ainda não tem data, remontar inventaria um 1/1/0 e a barra
       passaria a exibir uma data que o Mestre nunca definiu. Mexer no tempo
       tem que mexer SÓ no tempo. */
    const payload = {
      ...(anterior || {}),
      tempo: { ...((anterior && anterior.tempo) || {}), [trilha.chave]: prox.id },
    };
    setDataAtual(payload);
    const { error } = await supabaseClient
      .from('historias').update({ data_jogo_atual: payload }).eq('id', historiaId);
    if (error) {
      console.error('[data-jogo-atual] definir tempo falhou:', error);
      setDataAtual(anterior);
      return;   // desfeito na tela, não anuncia no log o que não aconteceu
    }
    /* O TIQUE IMEDIATO. Mudar o degrau cobra UMA HORA daquele clima na hora,
       como se ela tivesse passado sob a condição nova — foi o que o usuário
       pediu depois de mudar o clima e ver as barras paradas.

       A ÂNCORA NÃO ANDA: o relógio não se moveu, e uma âncora adiantada faria
       a próxima virada de hora cobrar de menos. Esta é uma cobrança avulsa,
       por evento, fora da contagem de horas.

       Só a trilha que mudou tique, e na prática só a temperatura desgasta
       condição — água abastece a loja, vento penaliza a VB. Corrigir um clima
       clicado errado cobra assim mesmo: não há desfazer, pela mesma razão que
       o relógio para trás não devolve fome. */
    await aplicarTiqueDeClima(trilha.chave, prox.id);
    if (aguaPorHoraDeChuva(prox.id) > 0) await aplicarChuvaNaLoja(1, payload.tempo);
    const degrauAntes = (anterior && anterior.tempo && anterior.tempo[trilha.chave]) || null;
    registrarEventoMesa(textoEventoTempo(trilha.chave, degrauAntes, prox.id, lang === "en"),
      { tempo: { trilha: trilha.chave, de: degrauAntes, para: prox.id } });
  };

  /* Acerta o relógio da mesa. Mesmo otimismo e mesmo cuidado do definirTempo:
     o jsonb é ESPALHADO, não remontado — remontar inventaria um 1/1/0 numa mesa
     que ainda não definiu data.

     `periodo` continua sendo gravado, agora DERIVADO da hora: é o que uma mesa
     antiga lê enquanto ninguém acerta o relógio dela, e deixar o valor velho
     apodrecendo no jsonb ao lado de uma hora nova seria contradição pura. */
  const definirHora = async (hora) => {
    if (!podeEditar || !historiaId) return;
    setHoraAberta(false);
    const anterior = dataAtual;
    /* A hora de ONDE se partiu, para o log dizer "de 12h para 13h". Vem de
       horaDoJogo e não de `anterior.hora` cru: mesa antiga sem hora gravada
       cai no fallback do período, que é o que a barra estava mostrando. */
    const horaAntes = anterior ? horaDoJogo(anterior) : null;
    /* HORA MENOR VIRA O DIA. Data e relógio são uma linha do tempo só, e o
       tempo só anda para frente: às 22h, escolher 2h são quatro horas depois,
       não vinte antes. Quem precisa voltar usa o calendário. */
    const instanteNovo = proximoInstante(anterior, hora);
    const ancora = ancoraDe(anterior);
    const payload = {
      ...(anterior || {}),
      ...instanteNovo,
      periodo: periodoDaHora(hora),
      decaimento_em: instanteDe(instanteNovo) || undefined,
    };
    setDataAtual(payload);
    const { error } = await supabaseClient
      .from('historias').update({ data_jogo_atual: payload }).eq('id', historiaId);
    if (error) {
      console.error('[data-jogo-atual] definir hora falhou:', error);
      setDataAtual(anterior);
      return;   // desfeito na tela, não anuncia no log o que não aconteceu
    }
    /* A âncora já foi gravada acima; o desgaste roda depois e pode falhar sem
       derrubar a hora. Se falhar, as horas ficam devendo — e é justamente por
       isso que a âncora é gravada JUNTO com o relógio, e não depois. */
    const virouODia = instanteNovo.dia != null && anterior && anterior.dia !== instanteNovo.dia;
    await cobrarHoras(ancora, instanteDe(instanteNovo), anterior && anterior.tempo);
    registrarEventoMesa(textoEventoHora(horaAntes, hora, lang === "en"), { de: horaAntes, para: hora });
    // O dia virou junto: quem lê o log precisa saber, e é onde o feriado entra.
    if (virouODia) {
      registrarEventoMesa(textoEventoData(payload, lang === "en"),
        { data: { dia: payload.dia, mes: payload.mes, ano: payload.ano } });
    }
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
  /* Aparece sempre que o Mestre ESTÁ numa mesa — inclusive quando ele só tem
     uma história. O dropdown antigo se escondia com `length > 1` (uma lista de
     um item não serve pra nada), mas a porta de saída serve: sem ela, um
     Mestre de mesa única entrava e nunca mais via a tela de escolha. */
  const mostrarSairMesa = profile === 'master' && mesaAtivaId && minhasHistorias && setMesaAtivaId && !esconderSeletorEBotaoNovo;

  return (
    <div className="menestrel-ui cdj-root" style={{ left: sidebarLargura, transition: 'left .32s cubic-bezier(.4,0,.2,1)' }}>
      {/* SAIR DA MESA, no lugar do dropdown (20/09/2026). "Assim como o
          jogador escolhe o personagem, e continua com ele enquanto não clicar
          no botão sair. Isso deve acontecer com o mestre para a escolha a
          história" (usuário).

          O dropdown listava todas as mesas e trocava com um clique. Agora
          entrar numa mesa é clicar no card dela, e este botão é a porta de
          volta — a mesma gramática do PJ ativo do Jogador.

          O rótulo é a PALAVRA "Sair", não o título da mesa nem um ícone.
          Cheguei a pôr os dois achando que o botão deveria dizer onde o Mestre
          está; ele diz o que o clique FAZ, e quem diz onde a mesa está é a
          própria tela — a lista de histórias já mostra só a mesa ativa. Mesma
          palavra e mesma pele do "Sair" da ficha do Jogador. */}
      {mostrarSairMesa && (() => {
        const historiaAtiva = minhasHistorias.find((h) => h.id === mesaAtivaId);
        return (
          <button
            type="button"
            className="cdj-bar cdj-mesa-sair is-editavel"
            onClick={() => setMesaAtivaId(null)}
            aria-label={(en ? 'Leave table' : 'Sair da mesa') + (historiaAtiva ? ' · ' + historiaAtiva.titulo : '')}
          >
            {en ? 'Leave' : 'Sair'}
          </button>
        );
      })()}
      {/* `dataAtual` pode existir carregando SÓ o tempo (Mestre que mexeu no
          clima antes de definir a data). Data mesmo é a que tem dia. */}
      {editando === null ? (
        historiaId && (
          <>
            <button
              type="button"
              className="cdj-bar is-editavel"
              onClick={() => setCalendarioAberto(true)}
              disabled={false}
              aria-label={en ? 'Current in-game date' : 'Data atual do jogo'}
            >
              <i className="ti ti-calendar-event" aria-hidden="true" />
              {dataAtual && dataAtual.dia ? (
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
            {/* A HORA DO JOGO — ao lado da data, do local e do clima.
                Era o botão que ALTERNAVA dia↔noite (17/09/2026); virou o
                relógio da mesa (20/09/2026, "um controle apenas da hora, não
                precisa de minutos e segundos"). O sol e a lua continuam aqui,
                agora derivados da hora em vez de escolhidos — ver luzDaHora.

                Clicar ABRE A LISTA das 24, como os pills do clima: ninguém
                avança 14 cliques pra sair das 6h da manhã e chegar às 20h.
                O Jogador só lê, e o pill dele NÃO usa `disabled` — botão
                desabilitado não dispara mouseenter e o tooltip ficaria mudo
                justo pra quem não pode clicar. */}
            <div className="cdj-hora-wrap" ref={horaDropRef}>
              {(() => {
                const luz = luzDaHora(dataAtual);
                const periodo = periodoDoJogo(dataAtual);
                const texto = `${luz.hora}h · ${en ? periodo.en : periodo.pt}`;
                return (<>
                  <button
                    type="button"
                    className={'cdj-bar cdj-periodo cdj-hora' + (podeEditar ? ' is-editavel' : '') + (horaAberta ? ' is-open' : '')}
                    data-periodo={periodo.id}
                    aria-label={(en ? 'In-game hour' : 'Hora do jogo') + ' · ' + texto}
                    aria-haspopup={podeEditar ? 'listbox' : undefined}
                    aria-expanded={podeEditar ? horaAberta : undefined}
                    onClick={() => {
                      if (!podeEditar) return;
                      // O tooltip do pill taparia a primeira linha da lista.
                      fecharTip();
                      setHoraAberta((v) => !v);
                    }}
                    {...propsTip(abrirTip, fecharTip, texto)}
                  >
                    {/* SÓ O ÍCONE (20/09/2026): "no botão de horário, não
                        precisa do texto '12h', deixe apenas o ícone. E o texto
                        vem no tooltip." O sol e a lua já dizem o período; a
                        hora exata vive no balão, que `texto` acima já monta
                        como "14h · Dia". */}
                    <i className={'ti ' + periodo.ic} aria-hidden="true" />
                  </button>
                  {horaAberta && (
                    <ul className="cdj-hora-lista" role="listbox" aria-label={en ? 'In-game hour' : 'Hora do jogo'}>
                      {Array.from({ length: 24 }, (_, h) => (
                        <li
                          key={h}
                          role="option"
                          aria-selected={h === luz.hora}
                          data-hora={h}
                          data-periodo={periodoDaHora(h)}
                          className={'cdj-hora-opcao' + (h === luz.hora ? ' is-ativa' : '')}
                          onClick={() => definirHora(h)}
                        >
                          {h}h
                        </li>
                      ))}
                    </ul>
                  )}
                </>);
              })()}
            </div>
            {/* CONDIÇÃO DO TEMPO — ao lado de data e local (16/09/2026).
                Um pill por trilha; clicar abre a lista dos cinco degraus, no
                mesmo molde do seletor de mesa aqui ao lado. Ver TEMPO_TRILHAS. */}
            <div className="cdj-tempo-grupo" role="group" ref={tempoDropRef}
              aria-label={en ? 'Weather' : 'Condição do tempo'}>
              {TEMPO_TRILHAS.map((trilha) => {
                const degrau = degrauTempo(trilha, dataAtual && dataAtual.tempo);
                const texto = textoTempo(trilha, degrau, en);
                const aberta = tempoAberto === trilha.chave;
                const nomeTrilha = en ? trilha.rotulo.en : trilha.rotulo.pt;
                return (
                  <div key={trilha.chave} className="cdj-tempo-wrap">
                    <button
                      type="button"
                      className={'cdj-bar cdj-tempo' + (podeEditar ? ' is-editavel' : '') + (aberta ? ' is-open' : '')}
                      data-tempo={degrau.id}
                      aria-label={texto}
                      aria-haspopup={podeEditar ? 'listbox' : undefined}
                      aria-expanded={podeEditar ? aberta : undefined}
                      onClick={() => {
                        if (!podeEditar) return;
                        // O tooltip do pill taparia a primeira linha da lista.
                        fecharTip();
                        setTempoAberto(aberta ? null : trilha.chave);
                      }}
                      {...propsTip(abrirTip, fecharTip, texto)}
                    >
                      <i className={'ti ' + degrau.ic} aria-hidden="true" />
                    </button>
                    {aberta && (
                      <ul className="cdj-tempo-lista" role="listbox" aria-label={nomeTrilha}>
                        {trilha.degraus.map((d) => (
                          <li
                            key={d.id}
                            role="option"
                            aria-selected={d.id === degrau.id}
                            data-tempo={d.id}
                            className={'cdj-tempo-opcao' + (d.id === degrau.id ? ' is-ativa' : '')}
                            onClick={() => definirTempo(trilha, d)}
                          >
                            <i className={'ti ' + d.ic + ' cdj-tempo-ic'} aria-hidden="true" />
                            <span className="cdj-tempo-opcao-nome">{en ? d.en : d.pt}</span>
                            {d.id === degrau.id && <i className="ti ti-check cdj-tempo-check" aria-hidden="true" />}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
            {calendarioAberto && (
              <CalendarioFantasyModal
                dataAtual={dataAtual}
                dataNasc={dataNascPjAtivo}
                lang={lang}
                historiaId={historiaId}
                podeEditar={podeEditar}
                userId={podeEditar ? null : userId}
                onDefinirDataAtual={definirDataAtual}
                onClose={() => setCalendarioAberto(false)}
              />
            )}
          </>
        )
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
      {/* "Nova história" só FORA de uma mesa (20/09/2026). Dentro dela a lista
          mostra um card só — o da mesa ativa — e um botão de criar ali dentro
          convida a sair do lugar sem dizer que sai. Criar pertence à tela de
          escolha, junto com os outros cards, que é para onde o "Sair" leva.
          Mesma gramática do Jogador: ele cria personagem na lista, não de
          dentro da ficha de um. */}
      {profile === 'master' && onNovaHistoria && !editando && !esconderSeletorEBotaoNovo && !mesaAtivaId && (
        <button
          type="button"
          className="cdj-pill-btn-salvar"
          onClick={onNovaHistoria}
          disabled={!!limiteFreeHistoria}
          {...propsTip(abrirTip, fecharTip, limiteFreeHistoria ? (en ? `Free plan limit reached (${PLANO_FREE_LIMITES.historias} story)` : `Limite do plano free atingido (${PLANO_FREE_LIMITES.historias} história)`) : undefined)}
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
          {...propsTip(abrirTip, fecharTip, limiteFreePersonagem ? (en ? `Free plan limit reached (${PLANO_FREE_LIMITES.personagens} character)` : `Limite do plano free atingido (${PLANO_FREE_LIMITES.personagens} personagem)`) : undefined)}
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
      <NavTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </div>
  );
}

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
     - RolagemD10Overlay  (dado-d10.jsx, Fase 02)

   NOTA (07/2026): a cópia inline do DadoD10/RolagemD10Overlay que vivia aqui
   (antiga seção 9.5) foi removida — o canônico é src/02-shell/dado-d10.jsx,
   importado no main.tsx logo após dado-d20.jsx (mesmo padrão do D20). */
function RolagemLivreFab({ lang, historiaId, nomeUsuario }) {
  const [tip, abrirTip, fecharTip, manterTip] = useNavTooltip(60);
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
          {...propsTip(abrirTip, fecharTip, 'D20')}
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
          {...propsTip(abrirTip, fecharTip, 'D10')}
        >
          <i className="ti ti-number-10-small" aria-hidden="true" />
        </button>
        <NavTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
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
*/
/* Decide se a troca de perfil (Mestre/Jogador) deve ir pro banco.
   `noServidor` é o que sabemos estar gravado em profiles.perfil_tipo;
   null/undefined = ainda NÃO sabemos, e nesse estado nunca se escreve —
   é essa a guarda que impede o palpite da montagem de virar verdade.

   `noServidor` é acompanhado à parte (estado próprio, atualizado a cada
   escrita) em vez de sair da prop userProfile: a prop nunca é refetchada, e
   compará-la faria master→player→master pular a segunda escrita. */
/* Qual mesa deve ficar ativa depois que a lista de histórias chega.

   Devolve o id novo, ou `undefined` quando não há nada a mudar — e essa
   distinção é o recurso inteiro: `null` é "saia da mesa", `undefined` é "não
   toque no estado". Confundir os dois é o que fazia o console reentrar na mesa
   logo depois do Mestre sair dela.

   Lista `null`/`undefined` significa "a busca ainda não voltou", e é diferente
   de lista vazia: tratar carregamento como vazio apagava a mesa salva a cada
   recarga da página. Ver 10-shell/mesa-ativa.test.js. */
function proximaMesaAtiva(minhasHistorias, mesaAtivaId) {
  if (!Array.isArray(minhasHistorias)) return undefined;   // ainda carregando
  if (!mesaAtivaId) return undefined;                      // fora de mesa, por escolha
  if (minhasHistorias.some((h) => h.id === mesaAtivaId)) return undefined;
  return null;                                             // a mesa salva sumiu
}

function devePersistirPerfil(noServidor, local) {
  if (noServidor === null || noServidor === undefined) return false;
  return noServidor !== local;
}

function AdminConsole({ user, userProfile, onLogout, t, lang, setLang }) {
  const ac = ADMIN_COPY[lang] || ADMIN_COPY.pt;
  const [navTip, abrirNavTip, fecharNavTip, manterNavTip] = useNavTooltip(60);

  // Perfil persistido.
  // Prioridade de restauração: Supabase (userProfile prop) > localStorage > 'player' (novo usuário).
  // O valor inicial é um PALPITE: o AdminConsole monta antes de userProfile
  // chegar (App faz setUser(u) e só então `await carregarProfile(u)`).
  const [profile, setProfile] = useState(() => {
    if (userProfile && typeof userProfile.perfil_tipo === 'string') return userProfile.perfil_tipo;
    try { const s = localStorage.getItem('menestrel.profile'); if (s === 'master' || s === 'player') return s; }
    catch (e) {}
    return 'player'; // padrão para contas novas
  });

  // O que sabemos estar GRAVADO no servidor. null = ainda não sabemos — e
  // nesse estado não se escreve nada (ver devePersistirPerfil).
  const [perfilNoServidor, setPerfilNoServidor] = useState(null);
  // O usuário clicou no seletor nesta sessão? Se sim, a escolha dele vence o
  // valor que vier do servidor — que é mais velho que o clique.
  const trocaManualRef = React.useRef(false);
  const escolherPerfil = React.useCallback((novo) => {
    trocaManualRef.current = true;
    setProfile(novo);
  }, []);

  // Primeira chegada de userProfile: registra o que o servidor tem e adota
  // esse valor, a menos que o usuário já tenha trocado à mão nesta sessão.
  useEffect(() => {
    if (perfilNoServidor !== null) return;   // já sabemos
    if (!userProfile) return;                // ainda não carregou: não sabemos nada
    const doServidor = userProfile.perfil_tipo;
    if (doServidor !== 'master' && doServidor !== 'player') {
      // Carregou, mas a coluna está vazia/inválida (linha antiga, ou trigger
      // que nasceu sem default). Isso É saber o que há lá: nada. Marca com ''
      // pra que devePersistirPerfil libere a gravação e o palpite local vire
      // o valor de verdade — sem isso a guarda de null travaria a escrita
      // para sempre nessas contas.
      setPerfilNoServidor('');
      return;
    }
    setPerfilNoServidor(doServidor);
    if (!trocaManualRef.current) setProfile(doServidor);
  }, [userProfile, perfilNoServidor]);

  useEffect(() => {
    try { localStorage.setItem('menestrel.profile', profile); } catch (e) {}
  }, [profile]);

  // Persiste no Supabase para restaurar entre dispositivos/sessões.
  //
  // ⚠️ A guarda de devePersistirPerfil é o que fecha uma corrida real: este
  // efeito rodava na MONTAGEM e mandava o palpite inicial pro banco antes de
  // userProfile chegar. Num dispositivo novo (sem localStorage) o palpite é
  // 'player', e esse UPDATE podia ganhar do SELECT do carregarProfile — o
  // Mestre entrava como jogador, e de forma PERSISTENTE, porque o valor errado
  // já tinha sido gravado. Cobertura: 10-shell/perfil-persistencia.test.js.
  useEffect(() => {
    if (!user || !user.id) return;
    if (!devePersistirPerfil(perfilNoServidor, profile)) return;
    // Otimista: assume gravado pra não reescrever em loop. Se falhar, a tela
    // fica certa e o banco velho — a próxima troca tenta de novo.
    setPerfilNoServidor(profile);
    supabaseClient
      .from('profiles')
      .update({ perfil_tipo: profile })
      .eq('id', user.id)
      .then(({ error: err }) => {
        if (err) console.error('[perfil] update de perfil_tipo falhou:', err);
      });
  }, [profile, perfilNoServidor, user]);

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
    // `sections` FORA das deps de propósito: é derivado de `profile` por um
    // .filter() que devolve array novo a cada render, então listá-lo fazia
    // este efeito rodar em TODO render sem nunca ter o que fazer. `profile` é
    // a única entrada que muda o conteúdo dele.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, currentId]);
  useEffect(() => {
    try { localStorage.setItem('menestrel.section', currentId); } catch (e) {}
  }, [currentId]);

  const current = sections.find((s) => s.id === currentId) || { id: currentId };
  const sectionMeta = ac.sections[current.id] || { label: current.id };
  /* Seções sem o teto de 860px. Lugares/NPCs/Memórias entraram em 12/09/2026:
     viraram a mesma tabela de Itens e Magias, mas ficaram fora desta lista e a
     tabela saía mais estreita que a das outras ("a largura da tabela em
     lugares, npcs está menor que em itens, magias" — usuário). */
  const isWide = ['criaturas', 'magias', 'habilidades', 'tecnicas', 'itens', 'itens_campanha', 'lugares', 'npcs', 'memorias', 'fichas', 'personagens_j', 'personagens_m', 'historias', 'convites', 'aventuras', 'guia_personagem'].includes(current.id);

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
  // padrão de menestrel.profile/section acima).
  const [minhasHistorias, setMinhasHistorias] = useState(null); // null = ainda não carregou; [] = carregou mas vazio; [{id, titulo}] = lista real
  // Sobe a cada clique na barra lateral — ver o onClick do .mc-navitem.
  const [navToken, setNavToken] = useState(0);
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
  const limiteFreeHistorias = userProfile?.plano === 'free' && (minhasHistorias?.length ?? 0) >= PLANO_FREE_LIMITES.historias;
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
  // data de nascimento do PJ ativo — passada ao CalendarioFantasyModal para marcar o aniversário
  const [dataNascPjAtivo, setDataNascPjAtivo] = useState(null);
  // O PJ ativo inteiro — as secoes Lugares/Personagens/Memorias (ex-Diario)
  // precisam dele. null = jogador sem personagem ativo, e as telas dizem isso.
  const [pjAtivo, setPjAtivo] = useState(null);
  useEffect(() => {
    if (!user || !user.id) return;
    let cancel = false;
    (async () => {
      if (profile === 'master') {
        const { data, error } = await supabaseClient
          .from('historias').select('id, titulo').eq('mestre_id', user.id)
          .order('created_at', { ascending: false });
        if (cancel) return;
        /* Falha na busca NÃO vira lista vazia (15/09/2026: "às vezes o sistema
           muda de mesa sem minha autorização"). Lista vazia zera a mesa ativa, e
           o carregamento seguinte caía na primeira história — trocando a mesa do
           Mestre sozinho. Erro agora preserva o que já estava. */
        if (error) { console.error('[mesa] não consegui listar as histórias:', error); return; }
        setMinhasHistorias(data || []);
      } else {
        // Jogador: resolve a história do PJ ativo e busca data_nasc para o calendário.
        const { data: prof } = await supabaseClient.from('profiles').select('pj_ativo_id').eq('id', user.id).maybeSingle();
        if (cancel) return;
        const pjAtivoId = prof && prof.pj_ativo_id;
        if (!pjAtivoId) { setMinhasHistorias([]); setDataNascPjAtivo(null); setPjAtivo(null); return; }
        const [histRes, pjRes] = await Promise.all([
          supabaseClient.from('historias').select('id, titulo').contains('protagonista_ids', [pjAtivoId]).maybeSingle(),
          // A linha INTEIRA agora: as seções Lugares/Personagens/Memórias
          // (ex-Diário) precisam do PJ, não só da data de nascimento.
          supabaseClient.from('personagens').select('*').eq('id', pjAtivoId).maybeSingle(),
        ]);
        if (cancel) return;
        // Mesmo critério do Mestre: erro preserva a mesa; sem história, zera.
        if (histRes.error) { console.error('[mesa] não consegui resolver a história do PJ:', histRes.error); }
        else setMinhasHistorias(histRes.data ? [histRes.data] : []);
        setDataNascPjAtivo(pjRes.data?.data_nasc ?? null);
        setPjAtivo(pjRes.data || null);
      }
    })();
    return () => { cancel = true; };
  }, [user, profile]);
  /* ENTRAR NUMA MESA É GESTO DO MESTRE (20/09/2026). Este efeito ESCOLHIA uma
     mesa sozinho (`minhasHistorias[0]`) sempre que o id salvo não casava com a
     lista. Fazia sentido enquanto existia o dropdown de mesas; com o botão de
     sair, virava uma porta trancada — o clique zerava o id e o efeito reentrava
     na mesma mesa no quadro seguinte.

     Agora ele só LIMPA o que não existe mais. A regra mora em
     proximaMesaAtiva, pura e testada em 10-shell/mesa-ativa.test.js, porque
     montada dentro do console ela só se deixaria observar montando o console
     inteiro. */
  useEffect(() => {
    const prox = proximaMesaAtiva(minhasHistorias, mesaAtivaId);
    if (prox !== undefined) setMesaAtivaId(prox);
  }, [minhasHistorias, mesaAtivaId]);
  /* Sair precisa SOBREVIVER à recarga, e para isso a chave tem que sumir do
     localStorage — não basta parar de gravar. Sem o remove, o Mestre saía da
     mesa, recarregava a página e voltava para dentro dela. */
  useEffect(() => {
    try {
      if (mesaAtivaId) localStorage.setItem('menestrel.mesaAtivaId', String(mesaAtivaId));
      else localStorage.removeItem('menestrel.mesaAtivaId');
    } catch (e) {}
  }, [mesaAtivaId]);

  /* SIDEBAR SEMPRE PEQUENA — decisão do usuário, 12/09/2026: "remova o botão
     'expandir menu', esta opção não será mais permitida" e "o menu não irá se
     expandir mais porque ele sempre será pequeno".

     Era um estado persistido em localStorage com um botão de recolher. O
     estado inteiro saiu, não só o botão: sobrar a variável com um único valor
     possível convidaria alguém a religá-la, e a largura vira um número fixo em
     vez de um ternário repetido em quatro lugares. Quem tinha a chave antiga
     no navegador simplesmente a ignora daqui em diante.

     Só ícones, então o NOME de cada seção passa a viver inteiramente no
     tooltip — que já existia e já era acionado no hover (abrirNavTip). */
  const SIDEBAR_LARGURA = 64;

  /* A LUZ DO FUNDO SEGUE O RELÓGIO DA MESA (20/09/2026). Quem carrega e assina
     `historias.data_jogo_atual` é o CardDataJogoAtual, lá embaixo na barra do
     topo — este console só pinta o que ele avisa. `useCallback` com deps vazias
     porque o aviso é um efeito lá dentro: uma função nova a cada render faria
     o efeito re-disparar sem parar. */
  const [dataMesa, setDataMesa] = useState(null);
  const receberDataMesa = React.useCallback((d) => setDataMesa(d), []);
  const luzFundo = estiloLuzFundo(dataMesa);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const avatarRef = React.useRef(null);

  const fullName = (user.user_metadata && user.user_metadata.full_name) || user.email;
  const firstName = fullName.split(' ')[0];
  const avatarUrl = user.user_metadata && (user.user_metadata.avatar_url || user.user_metadata.picture);
  const planoPago = userProfile ? userProfile.plano === 'paid' : false;
  const planoBadge = planoPago ? 'Premium' : (lang === 'en' ? 'Free' : 'Gratuito');

  return (
    <>
      <div className="menestrel-ui mc-root" style={{ '--sidebar-w': SIDEBAR_LARGURA + 'px' }}>

        {/* ── Fundo animado — baseado em DarkGradientBg (paleta Pedra & Bronze) ── */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>

          {/* Gradiente base: a máscara é a FONTE DE LUZ, e ela atravessa o céu
              com a hora da mesa — à direita no nascente, no centro ao meio-dia
              (e à meia-noite), à esquerda no poente. Ver estiloLuzFundo. */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 1,
            background: 'radial-gradient(100% 100% at 0% 0%, #000000 0%, #000000 100%)',
            mask: luzFundo.mask,
            transition: 'mask 1.2s ease, -webkit-mask 1.2s ease',
          }} >

            {/* Filetes inclinados — os "raios". Os dois primeiros são a cor
                principal da hora (ouro de dia, luar de aço à noite), os três
                últimos a secundária. O desenho de cada máscara é o que dá o
                espaçamento irregular entre eles, e por isso continua fixo:
                quem responde à hora é a cor, a opacidade e a inclinação. */}
            {[
              { grad: luzFundo.gradA, mask: 'linear-gradient(90deg, transparent 0%, #000 20%, transparent 36%, #000 55%, rgba(0,0,0,0.13) 67%, #000 78%, transparent 97%)' },
              { grad: luzFundo.gradA, mask: 'linear-gradient(90deg, transparent 11%, #000 25%, rgba(0,0,0,0.55) 41%, rgba(0,0,0,0.13) 67%, #000 78%, transparent 97%)' },
              { grad: luzFundo.gradB, mask: 'linear-gradient(90deg, transparent 9%, #000 20%, rgba(0,0,0,0.55) 28%, rgba(0,0,0,0.42) 40%, #000 48%, rgba(0,0,0,0.27) 54%, rgba(0,0,0,0.13) 78%, #000 88%, transparent 97%)' },
              { grad: luzFundo.gradB, mask: 'linear-gradient(90deg, transparent 0%, #000 17%, rgba(0,0,0,0.55) 26%, #000 35%, transparent 47%, rgba(0,0,0,0.13) 69%, #000 79%, transparent 97%)' },
              { grad: luzFundo.gradB, mask: 'linear-gradient(90deg, transparent 0%, #000 20%, rgba(0,0,0,0.55) 27%, #000 42%, transparent 48%, rgba(0,0,0,0.13) 67%, #000 74%, #000 82%, rgba(0,0,0,0.47) 88%, transparent 97%)' },
            ].map((filete, i) => (
              <div key={i} style={{
                position: 'absolute', inset: 0,
                opacity: luzFundo.opacity,
                background: filete.grad,
                mask: filete.mask,
                transform: luzFundo.transform,
                transition: 'opacity 1.2s ease, transform 1.2s ease, background 1.2s ease',
              }} />
            ))}
          </div>

          {/* O CLIMA DA MESA, por cima da luz (20/09/2026). Uma camada por
              trilha acesa — chuva ou areia, vento, neve ou insolação. O
              desenho inteiro é CSS (.mc-clima em index.css): daqui saem só o
              tipo, o degrau e, pra chuva e a neve, o quanto está ventando,
              que é o que as inclina.

              O <i> é a TERCEIRA camada de profundidade: ::before e ::after
              dão duas, e chuva e neve precisam de três pra não parecerem um
              papel de parede rolando. */}
          {efeitosDoTempo(dataMesa).map((e) => (
            <div
              key={e.tipo}
              className={'mc-clima mc-clima-' + e.tipo}
              data-int={e.intensidade}
              style={e.vento != null ? { '--clima-vento': e.vento } : undefined}
            >
              <i aria-hidden="true" />
            </div>
          ))}

          {/* Grade de pontos sutil */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(201,164,78,0.6) 1px, transparent 0)', backgroundSize: '20px 20px' }} />
        </div>

        {/* SIDEBAR */}
        <aside className="mc-sidebar">
          {/* MARCA DO SISTEMA (12/09/2026). Era um anel em SVG com gradiente;
              virou o dragão e, na mesma tarde, ti-currency-monero — que é o
              que ficou. Sem círculo em volta, como o usuário pediu. */}
          <div className="mc-marca">
            <i className="ti ti-currency-monero" aria-label="Menestrel" />
          </div>

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
                      /* O TOQUE NO MENU CONTA, mesmo na seção já aberta
                         (17/09/2026). `setCurrentId` com o mesmo valor não
                         rerenderiza nada, então clicar em "Personagens" de
                         dentro da ficha de um PJ não fazia absolutamente nada —
                         e o Mestre, que não tem botão de sair, ficava sem
                         caminho de volta. Este contador é o sinal de "você
                         pediu esta seção de novo"; quem o escuta hoje é a
                         lista de personagens do Mestre. */
                      setNavToken((t) => t + 1);
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
                onSetProfile={escolherPerfil}
                lang={lang}
                setLang={setLang}
                onHelp={() => { setUserMenuOpen(false); setCurrentId('guia_personagem'); }}
                onConvites={() => { setUserMenuOpen(false); setConviteModalAberto(true); }}
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
              /* `historiaId` (17/09/2026): habilita o botão de OLHO na tabela
                 — quem pode ver cada criatura NA MESA ATIVA. Disponibilizar
                 criatura pra história era a aba "Criatura" do Lore, que só se
                 alcançava por Histórias → card da mesa → botão "Lore"; o
                 botão saiu no mesmo dia e a função veio pra cá. O Jogador
                 recebe o id igual e a CriaturasList ignora (modoJogador). */
              <CriaturasList ac={ac} lang={lang} modoJogador={profile === 'player'} historiaId={mesaAtivaId} />
            ) : current.id === 'personagens_j' ? (
              <PersonagensList ac={ac} t={t} lang={lang} profile="player" currentUserId={user.id} userProfile={userProfile} soAcoes={['modal', 'editar', 'evoluir', 'deletar']} abrirNovoPersonagemRef={abrirNovoPersonagemRef} onDentroDeMenu={setPersonagensDentroDeMenu} onLimiteFreeChange={setLimiteFreePersonagens} onFichaAberta={setFichaAtiva} onNomePjAtivo={setNomePjAtivo} />
            ) : current.id === 'personagens_m' ? (
              /* `voltarToken`: o Mestre sai da ficha pelo próprio menu, e não
                 por um botão dentro dela — "quem persiste no personagem
                 escolhido é o jogador". Por isso o token só chega aqui. */
              <PersonagensList ac={ac} t={t} lang={lang} profile="master" currentUserId={user.id} userProfile={userProfile} mesaAtivaId={mesaAtivaId} voltarToken={navToken} />
            ) : current.id === 'fichas' ? (
              <FichasJogador ac={ac} lang={lang} currentUserId={user.id} />
            ) : current.id === 'magias' ? (
              <MagiasList ac={ac} lang={lang} modoJogador={profile === 'player'} />
            ) : current.id === 'habilidades' ? (
              <HabilidadesList ac={ac} lang={lang} modoJogador={profile === 'player'} />
            ) : current.id === 'tecnicas' ? (
              <TecnicasList ac={ac} lang={lang} modoJogador={profile === 'player'} />
            ) : current.id === 'itens' ? (
              <ItensList ac={ac} lang={lang} modoJogador={profile === 'player'} />
            ) : current.id === 'itens_campanha' ? (
              <ItensCampanhaManager ac={ac} lang={lang} />
            ) : current.id === 'historias' ? (
              <HistoriasList ac={ac} t={t} lang={lang} currentUserId={user.id} userProfile={userProfile} mesaAtivaId={mesaAtivaId} abrirNovaHistoriaRef={abrirNovaHistoriaRef} onDentroDeMenu={setHistoriasDentroDeMenu} onEntrarMesa={setMesaAtivaId} />
            ) : (current.id === 'lugares' || current.id === 'npcs' || current.id === 'memorias') ? (
              /* AS TRÊS QUE VIERAM DO DIÁRIO. Para o JOGADOR são o mesmo
                 DiarioView travado num tipo (ver `tipoFixo`), e sem personagem
                 ativo não há diário de ninguém — a tela diz isso em vez de
                 aparecer vazia.

                 Para o MESTRE (17/09/2026) Lugares e NPCs são outra coisa: o
                 lore DA MESA, o mesmo que ele já administrava em Histórias →
                 "Lore", agora também no menu lateral e preso à mesa ativa. Ele
                 não tem PJ, então o que falta aqui é mesa, não personagem.
                 Memórias segue só do Jogador: memória é do personagem. */
              profile === 'master' && current.id !== 'memorias' ? (
                <LoreDaMesa
                  historiaId={mesaAtivaId}
                  lang={lang}
                  tipoFixo={current.id === 'lugares' ? 'lugar' : 'npc'}
                  vazio={<AdminEmpty ac={ac} sectionLabel={sectionMeta.label} />}
                />
              ) : !pjAtivo ? (
                <AdminEmpty ac={ac} sectionLabel={sectionMeta.label} />
              ) : (
                <DiarioView
                  pj={pjAtivo}
                  lang={lang}
                  currentUserId={user.id}
                  isMestre={false}
                  tipoFixo={current.id === 'lugares' ? 'lugar' : current.id === 'npcs' ? 'npc' : 'memoria'}
                  key={current.id + ':' + pjAtivo.id}
                />
              )
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
          userId={user.id}
          minhasHistorias={minhasHistorias}
          mesaAtivaId={mesaAtivaId}
          setMesaAtivaId={setMesaAtivaId}
          profile={profile}
          onNovaHistoria={current.id === 'historias' ? () => abrirNovaHistoriaRef.current && abrirNovaHistoriaRef.current() : null}
          limiteFreeHistoria={limiteFreeHistorias}
          esconderSeletorEBotaoNovo={current.id === 'historias' && historiasDentroDeMenu}
          sidebarLargura={SIDEBAR_LARGURA}
          onNovoPersonagem={current.id === 'personagens_j' ? () => abrirNovoPersonagemRef.current && abrirNovoPersonagemRef.current() : null}
          limiteFreePersonagem={limiteFreePersonagens}
          esconderBotaoPersonagem={current.id === 'personagens_j' && personagensDentroDeMenu}
          dataNascPjAtivo={dataNascPjAtivo}
          onDataAtual={receberDataMesa}
        />

        {/* Central de mensagens da mesa — Mestre e Jogador.
            Resolve a história via mesaAtivaId (Mestre: seletor acima;
            Jogador: PJ ativo, automático). Sem mesa resolvida, o próprio
            componente decide não montar nada. */}
        <CentralMensagens lang={lang} historiaId={mesaAtivaId} sidebarLargura={SIDEBAR_LARGURA}
          ehMestre={profile === 'master'} />

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
  const [user, setUser] = useState(null);  // sessão Supabase
  const [profile, setProfile] = useState(null); // { plano, plano_escolhido_em }

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
      // sem esses campos. NÃO toca plano_escolhido_em (preserva o onboarding).
      //
      // ⚠️ `ignoreDuplicates: true` (ON CONFLICT DO NOTHING) NÃO é detalhe.
      // Com o `onConflict:'id'` sozinho isto virava um UPDATE que sobrescrevia
      // a linha existente com plano:'free' e perfil_tipo:'player' — REBAIXANDO
      // quem já era pago ou Mestre. E o gatilho deste bloco não é "a linha não
      // existe": é "o SELECT acima não devolveu linha", que é coisa diferente.
      // O SELECT volta vazio sempre que a RLS não casa naquele instante (JWT
      // expirando, refresh de token, evento de auth com sessão ainda não
      // aplicada) — e carregarProfile roda em TODO onAuthStateChange, inclusive
      // TOKEN_REFRESHED. Ou seja: um soluço de sessão bastava pra derrubar o
      // plano e o perfil de uma conta boa.
      //
      // Reproduzido em transação abortada no banco: sem proteção, o upsert
      // levava paid→free e master→player. Hoje o gatilho
      // trg_plano_somente_admin segura o PLANO; o perfil_tipo dependia só
      // disto aqui.
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
        }, { onConflict: 'id', ignoreDuplicates: true });
      if (insErr) console.error('[profile] upsert fallback falhou:', insErr);
      setProfile({ plano: 'free', plano_escolhido_em: null, perfil_tipo: 'player' });
    }
  };

  // ── Tema: NÃO existe claro/escuro (decisão de 05-06/2026 — light removido
  // do CSS). A máquina dark/light/auto que vivia aqui era código zumbi
  // (Topbar nem aceitava as props) e foi removida em 07/2026. O único eixo
  // visual vivo é o data-mode (grimoire/modern) abaixo.
  const lang = tweaks.lang || 'pt';
  const mode = tweaks.mode || 'grimoire';
  const t = COPY[lang] || COPY.pt;

  useEffect(() => {
    document.body.setAttribute('data-mode', mode);
    document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
  }, [mode, lang]);

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
      } else {
        setProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const authCopy = AUTH_COPY[lang] || AUTH_COPY.pt;
  const adminCopy = ADMIN_COPY[lang] || ADMIN_COPY.pt;
  const logout = async () => {
    await supabaseClient.auth.signOut();
  };
  const setLang = (l) => setTweak('lang', l);

  // Logado → Admin Console. Deslogado → tela de login (única página pública).
  if (user) {
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

  // Deslogado → a única página pública do app: o login com Google.
  return (
    <>
      <LoginPage
        lang={lang}
        setLang={setLang}
        authCopy={authCopy}
        shader={tweaks.shader}
        shaderKind={tweaks.shaderKind}
        mode={mode}
      />

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
  FantasyDatePicker, AdminEmpty, FichasJogador, AdminConsole, App,
  CentralMensagens, CardDataJogoAtual, RolagemLivreFab,
  // A linha do feed e o conversor de evento — expostos para o teste do
  // destaque (log-eventos.test.jsx) montar só eles.
  MensagemEvento, linhaParaMensagem,
  // Puras, expostas pro teste da luz por horário (10-shell/luz-do-horario.test.js).
  periodoDaHora, faseDoPeriodo, horaDoJogo, luzDaHora, estiloLuzFundo,
  // Pura, exposta pro teste do clima (10-shell/clima-efeitos.test.js).
  efeitosDoTempo,
  proximaMesaAtiva,
  // Puras, expostas pro teste do log de tempo (10-shell/log-tempo-mesa.test.js).
  feriadosDoDia, rotuloDataJogo, textoEventoData, textoEventoHora, textoEventoLocal, textoEventoTempo,
  // Pura, exposta pro teste da corrida de perfil_tipo
  // (10-shell/perfil-persistencia.test.js).
  devePersistirPerfil,
});