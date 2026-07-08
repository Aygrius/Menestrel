/* ============================================================
   GUIA DE CRIAÇÃO DE PERSONAGEM — src/08-personagens/guia_personagem.jsx
   ============================================================
   Guia interativo completo sobre as escolhas de criação de PJ,
   espelhando a ordem do wizard (NovoPersonagemModal): gênero,
   raça, reino/origem, profissão, atributos, grupos de armas,
   habilidades, magias, técnicas — mais builds recomendadas e a
   tabela-resumo de trocas. Inclui simulador de EH por estágio.

   Todos os números vêm de 01-core/game-data.jsx (GAME_DATA,
   MAGIAS_POR_PROFISSAO, TECNICAS_POR_PROFISSAO, GRUPOS_ARMAS,
   custoAtributo, calcularFicha) — ao mudar uma regra lá,
   conferir se algum texto aqui precisa acompanhar.

   Componentes internos (não exportados): GpSelect (dropdown
   custom no padrão pill do design system), SectionHead (placa
   numerada de bronze + eyebrow + título), Callout, SimuladorEH,
   GuiaFooter. Sumário/TOC no hero navega por scrollIntoView
   (sem tocar location.hash — app não usa router).

   Depende de: nada em runtime (componente puro, sem Supabase,
                sem React Query). Hooks globais de helpers.jsx.
   Exposto via: window.GuiaPersonagem (consumido pelo AdminConsole
                no switch de abas do shell.jsx)
   Estilo: seção "GUIA DE CRIAÇÃO DE PERSONAGEM" do index.css
           (classes gp-*, tokens "Pedra & Bronze")
   i18n: PT-only por enquanto (mesma pendência do LoreEntradaForm
         da Fase 13 — bilinguar sob pedido explícito).
   ============================================================ */

/* ============================== [08.5] Guia de Criação — helpers visuais ============================== */

// ── irPara — scroll suave até uma seção, respeitando reduced-motion ─────────
// Não altera location.hash (o app não usa router; hash sujo poderia
// vazar pra outros fluxos). scrollIntoView acha o container de scroll
// correto sozinho (funciona dentro do body do AdminConsole).
function gpIrPara(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduz = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  el.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'start' });
}

// ── SectionHead — placa numerada + eyebrow + título, padrão gp-section-head ─
// A numeração espelha a ordem real do wizard (NovoPersonagemModal):
// não é decoração, é o mapa do fluxo de criação.
function SectionHead({ num, tag, children }) {
  return (
    <div className="gp-section-head">
      <span className="gp-section-num" aria-hidden="true">{num}</span>
      <div className="gp-section-head-txt">
        <div className="gp-section-tag">{tag}</div>
        <h2 className="gp-h2">{children}</h2>
      </div>
    </div>
  );
}

// ── Callout — caixa de destaque com ícone Tabler ────────────────────────────
// variant: 'gold' (default, dica) | 'warn' (atenção/aviso)
function Callout({ icon = 'ti-bulb', variant, children }) {
  return (
    <div className={`gp-callout${variant === 'warn' ? ' gp-callout-warn' : ''}`}>
      <i className={`ti ${icon} gp-callout-icon`} aria-hidden="true"></i>
      <p className="gp-callout-text">{children}</p>
    </div>
  );
}

// ── GpSelect — dropdown custom no padrão pill do design system ──────────────
// Substitui o <select> nativo (que não aceita a paleta). Painel em
// position:fixed abaixo do trigger, fecha em clique fora / Esc / scroll.
// options: [{ value, label }]
function GpSelect({ value, options, onChange, minWidth = 200 }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  const abrir = () => {
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ left: r.left, top: r.bottom + 6, width: Math.max(r.width, minWidth) });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const fora = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    const fechar = () => setOpen(false);
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    window.addEventListener('scroll', fechar, true);
    window.addEventListener('resize', fechar);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('scroll', fechar, true);
      window.removeEventListener('resize', fechar);
    };
  }, [open]);

  const atual = options.find((o) => o.value === value);
  return (
    <>
      <button
        ref={btnRef} type="button" className="gp-sel-trigger"
        style={{ minWidth }} aria-haspopup="listbox" aria-expanded={open}
        onClick={abrir}
      >
        <span>{atual ? atual.label : '—'}</span>
        <i className={`ti ti-chevron-down gp-sel-chevron${open ? ' open' : ''}`} aria-hidden="true"></i>
      </button>
      {open && pos && (
        <ul ref={panelRef} className="gp-sel-panel" role="listbox"
            style={{ left: pos.left, top: pos.top, minWidth: pos.width }}>
          {options.map((o) => (
            <li key={String(o.value)}>
              <button
                type="button" role="option" aria-selected={o.value === value}
                className={`gp-sel-opt${o.value === value ? ' sel' : ''}`}
                onClick={() => { onChange(o.value); setOpen(false); }}
              >
                <span>{o.label}</span>
                {o.value === value && <i className="ti ti-check" aria-hidden="true"></i>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ============================== [08.6] Simulador de Energia Heroica ============================== */
// Fórmula real (calcularFicha): EH = Percepção + ehBase × estágio.
// Masculino: ehBase = floor(ehBase × 0.9). Feminino: ehBase = floor(ehBase × 1.1). Neutro: base exata.
function SimuladorEH() {
  const PROFS = { Guerreiro: 14, Sacerdote: 12, Ladino: 10, Rastreador: 10, Bardo: 8, Mago: 6 };

  const [prof, setProf] = useState('Guerreiro');
  const [est, setEst]   = useState(5);
  const [perc, setPerc] = useState(1);

  const base     = PROFS[prof] || 6;
  const baseMasc = Math.floor(base * 0.9);
  const baseFem  = Math.floor(base * 1.1);
  const ehNeut   = perc + base    * est;  // Neutro — base exata
  const ehFem    = perc + baseFem * est;  // Feminino — +10% arredondado pra baixo
  const ehMasc   = perc + baseMasc * est; // Masculino — −10% arredondado pra baixo
  const diffFemMasc = ehFem - ehMasc;

  return (
    <div className="gp-sim-wrap">
      <div className="gp-sim-controls">
        <div className="gp-sim-field">
          <span className="gp-field-label">Profissão</span>
          <GpSelect
            value={prof} onChange={setProf} minWidth={230}
            options={Object.entries(PROFS).map(([p]) => ({ value: p, label: `${p}` }))}
          />
        </div>
        <div className="gp-sim-field">
          <span className="gp-field-label">Estágio</span>
          <GpSelect
            value={est} onChange={setEst} minWidth={110}
            options={[1, 3, 5, 10, 20].map((v) => ({ value: v, label: `Estágio ${v}` }))}
          />
        </div>
        <div className="gp-sim-field">
          <span className="gp-field-label">Percepção</span>
          <GpSelect
            value={perc} onChange={setPerc} minWidth={110}
            options={[0, 1, 2, 3].map((v) => ({ value: v, label: `+${v}` }))}
          />
        </div>
      </div>

      <div className="gp-sim-out">
        <div className="gp-sim-row">
          <span className="gp-sim-label">Personagem Feminino</span>
          <span className="gp-sim-val gp-up">{ehFem}</span>
        </div>
        <div className="gp-sim-row">
          <span className="gp-sim-label">Personagem Neutro</span>
          <span className="gp-sim-val">{ehNeut}</span>
        </div>
        <div className="gp-sim-row">
          <span className="gp-sim-label">Personagem Masculino</span>
          <span className="gp-sim-val">{ehMasc}</span>
        </div>
        <div className="gp-sim-row gp-sim-row-last">
          <span className="gp-sim-label">Diferença do personagem Feminino vs Masculino no estágio {est}</span>
          <span className="gp-sim-val gp-up">+{diffFemMasc} EH</span>
        </div>
      </div>
    </div>
  );
}

/* ============================== [08.65] Sumário e rodapé do guia ============================== */

// ── Índice do guia — espelha a ordem das seções abaixo ──────────────────────
const GP_TOC = [
  { id: 'gp-s01', num: '01', label: 'Gênero' },
  { id: 'gp-s02', num: '02', label: 'Raça' },
  { id: 'gp-s03', num: '03', label: 'Reino e origem' },
  { id: 'gp-s04', num: '04', label: 'Profissão' },
  { id: 'gp-s05', num: '05', label: 'Atributos' },
  { id: 'gp-s06', num: '06', label: 'Grupos de armas' },
  { id: 'gp-s07', num: '07', label: 'Habilidades' },
  { id: 'gp-s08', num: '08', label: 'Magias' },
  { id: 'gp-s09', num: '09', label: 'Técnicas' },
  { id: 'gp-s10', num: '10', label: 'Builds' },
  { id: 'gp-s11', num: '11', label: 'Resumo' },
];

// ── GuiaFooter — fecho da página: conselho final + voltar ao topo ───────────
function GuiaFooter() {
  return (
    <footer className="gp-footer">
      <i className="ti ti-feather gp-footer-icon" aria-hidden="true"></i>
      <p className="gp-footer-quote">
        E o conselho final, de menestrel para herói: os números constroem o esqueleto,
        mas é a história que dá vida. Escolha a combinação que te faz querer jogar a
        próxima sessão — a matemática deste guia está aqui só para garantir que essa
        escolha também aguente uma batalha.
      </p>
      <button type="button" className="gp-top-link" onClick={() => gpIrPara('gp-topo')}>
        <i className="ti ti-arrow-up" aria-hidden="true"></i> Voltar ao topo
      </button>
    </footer>
  );
}

/* ============================== [08.7] GuiaPersonagem — página ============================== */
function GuiaPersonagem({ lang = 'pt' }) {
  return (
    <div className="gp-page">

      {/* ── Cabeçalho / hero ── */}
      <header className="gp-hero" id="gp-topo">
        <div className="gp-eyebrow">
          <i className="ti ti-compass" aria-hidden="true"></i>
          <span>Grimório do aventureiro · Guia de criação</span>
        </div>
        <h1 className="gp-h1">
          Guia para criação de personagens: <span className="gp-h1-grad">o peso de cada escolha</span>
        </h1>
        <p className="gp-lead">
          O wizard de criação faz nove perguntas, e nenhuma delas é só estética.
          Este guia percorre as escolhas na mesma ordem em que elas aparecem,
          mostra a matemática por trás de cada uma e dá conselhos práticos —
          para você sair da criação com exatamente o herói que imaginou,
          sem surpresas no meio da campanha.
        </p>
        <nav className="gp-toc" aria-label="Sumário do guia">
          {GP_TOC.map((t) => (
            <a
              key={t.id} href={`#${t.id}`} className="gp-toc-link"
              onClick={(e) => { e.preventDefault(); gpIrPara(t.id); }}
            >
              <span className="gp-toc-num">{t.num}</span>{t.label}
            </a>
          ))}
        </nav>
      </header>

      {/* ══ 01 · Gênero ══ */}
      <section className="gp-section" id="gp-s01">
        <SectionHead num="01" tag="Identidade · Gênero">Qual é o seu gênero?</SectionHead>
        <p className="gp-p">
          Aqui o gênero não é apenas narrativo: ele aplica modificadores reais sobre o corpo e a Energia Heroica — o principal recurso de sobrevivência em combate. São três opções, cada uma com uma troca diferente.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 16 }}>
          <div className="gp-card gp-card-fem">
            <span className="gp-card-tag gp-tag-fem"><i className="ti ti-gender-female" aria-hidden="true"></i> Feminino</span>
            <div className="gp-stat-row">
              <span className="gp-stat-key">Energia Física</span>
              <span className="gp-stat-val gp-danger">Recebe um redutor de 10% da altura e peso da raça. Menos peso significa menos energia física e a velocidade também cai um pouco, já que ela nasce da altura.</span>
            </div>
            <div className="gp-stat-row">
              <span className="gp-stat-key">Energia Heroica</span>
              <span className="gp-stat-val gp-accent">+10% na base da profissão (arredondado pra baixo). A vantagem se repete a cada estágio — quanto mais alto o nível, maior a distância sobre o Masculino.</span>
            </div>
          </div>

          <div className="gp-card gp-card-masc">
            <span className="gp-card-tag gp-tag-masc"><i className="ti ti-gender-male" aria-hidden="true"></i> Masculino</span>
            <div className="gp-stat-row">
              <span className="gp-stat-key">Energia Física</span>
              <span className="gp-stat-val gp-accent">+10% na altura e peso da raça — consequentemente a energia física e velocidade ficam acima do valor de referência.</span>
            </div>
            <div className="gp-stat-row">
              <span className="gp-stat-key">Energia Heroica</span>
              <span className="gp-stat-val gp-danger">−10% na base da profissão (arredondado pra baixo). A penalidade se repete a cada estágio — quanto mais alto o nível, maior a distância.</span>
            </div>
          </div>

          <div className="gp-card">
            <span className="gp-card-tag gp-tag-neut"><i className="ti ti-circle-half-2" aria-hidden="true"></i> Neutro</span>
            <div className="gp-stat-row">
              <span className="gp-stat-key">Energia Física</span>
              <span className="gp-stat-val gp-accent">Altura e peso padrão da raça, sem reduções.</span>
            </div>
            <div className="gp-stat-row">
              <span className="gp-stat-key">Energia Heroica</span>
              <span className="gp-stat-val gp-accent">Base exata da profissão, sem bônus nem penalidade.</span>
            </div>
          </div>
        </div>

        <Callout icon="ti-info-circle">
          <b>A Energia Heroica é a sua primeira linha de defesa</b> — o dano em
          batalha desce em cascata: primeiro consome a energia heroica, depois a absorção da armadura, e só então
          a sua energia física. A diferença entre Feminino (+10%) e Masculino (−10%) parece pequena no estágio 1, mas acumula:
          no estágio 10, uma guerreira já carrega um adicional de 30 pontos de energia heroica sobre um guerreiro masculino. Use o
          simulador abaixo para ver a conta com os seus números.
        </Callout>

        <div className="gp-sub-section">
          <h3 className="gp-h3">Simulador · Energia Heroica por estágio</h3>
          <SimuladorEH />
        </div>
      </section>

      <div className="gp-divider"></div>

      {/* ══ 02 · Raça ══ */}
      <section className="gp-section" id="gp-s02">
        <SectionHead num="02" tag="Identidade · Raça">Qual é a sua raça?</SectionHead>
        <p className="gp-p">
          A raça define o ponto de partida de todos os sete atributos, a altura de
          referência do corpo e um idioma nativo gratuito. É uma das duas escolhas
          que ficam travadas para sempre depois de salvar o personagem (a outra é o
          reino) — vale escolher com calma.
        </p>

        <div className="gp-raca-grid">
          {[
            { nome: 'Humano', altura: '1,77 m', idioma: 'Malês', vida: '~80 anos', profissoes: 'Todas', mod: 'A raça de referência: todos os atributos partem do zero, sem bônus nem penalidade. Essa neutralidade esconde a maior vantagem humana — adaptabilidade total. Nenhuma profissão é vedada, nenhum atributo começa no negativo. Para quem ainda não decidiu um estilo de jogo, os humanos são a tela em branco ideal.' },
            { nome: 'Meio-Orc', altura: '1,89 m', idioma: 'Malês + Kurng', vida: '~80 anos', profissoes: 'Guerreiro, Ladino, Sacerdote — bom em combate direto', mod: 'Força e Físico +2 fazem do meio-orc o maior tanque de dano do jogo — energia física e resistência física de nascença acima de qualquer outra raça. A contrapartida é real: Intelecto −1 e Carisma −2 fecham o caminho para magias arcanas e habilidades sociais. São frequentemente vistos com desconfiança por humanos e orcs, mas quem conquista sua lealdade encontra um companheiro inabalável.' },
            { nome: 'Anão', altura: '1,39 m', idioma: 'Khuzdul + Malês', vida: '~450 anos', profissoes: 'Guerreiro, Sacerdote — vedados Mago, Bardo e Rastreador', mod: 'Corpos atarracados que escondem força e resistência excepcionais. Força e Físico +2, mas Agilidade −1 e Aura −1 cortam mobilidade e magia. Incapazes de manipular magia não divina, compensam com talento artesanal lendário — armas, armaduras e joias de qualidade incomparável. Longevidade de até 450 anos torna cada aventureiro anão uma figura de peso em qualquer mesa.' },
            { nome: 'Elfo-Dourado', altura: '1,63 m', idioma: 'Élfico + Malês', vida: '~800 anos (alguns além)', profissoes: 'Mago, Bardo, Rastreador — Ladino e Guerreiro são raros', mod: 'A raça de maior aptidão mágica do jogo: Intelecto +1 e Aura +2 constroem o grimório e o tanque de karma mais poderosos disponíveis. O preço é Força −2 e Físico −1 — fragilidade física real. Raro entre os elfos; quando aparece como aventureiro, geralmente é a sede inesgotável de conhecimento que o empurra para fora de suas comunidades.' },
            { nome: 'Elfo-Florestal', altura: '1,71 m', idioma: 'Élfico + Malês', vida: '~800 anos', profissoes: 'Guerreiro, Rastreador, Ladino — Bardo é muito raro', mod: 'O grupo élfico mais numeroso e mais marcial. Percepção +2 traduz diretamente em energia heroica alta — ótimo para qualquer profissão. Agilidade +1 ajuda na defesa e velocidade. Físico −1 é a fragilidade élfica de sempre. Xenófobos por natureza, raramente se tornam bardos; mas como guerreiros e rastreadores das florestas, poucos rivalizam com eles.' },
            { nome: 'Elfo-Sombrio', altura: '1,65 m', idioma: 'Élfico + Malês', vida: '~800 anos', profissoes: 'Ladino, Rastreador, Mago — equilibrado para discrição', mod: 'Origem desconhecida, reputação enigmática. Combinam Agilidade +1, Percepção +1 e Aura +1 num equilíbrio voltado para a furtividade e o conhecimento oculto. Físico −1 é o custo élfico padrão. Mestres em venenos e na arte da paciência — preferem métodos calculados à força bruta. Vivem em florestas isoladas e raramente permitem estrangeiros em seus territórios.' },
            { nome: 'Meio-Elfo', altura: '1,68 m', idioma: 'Malês + Élfico', vida: '~450 anos', profissoes: 'Todas — a raça mais versátil', mod: 'Herdam o carisma e a agilidade dos elfos com a resistência física dos humanos — Carisma +1, Agilidade +1, sem Físico negativo. Nenhuma profissão é vedada. Vivem entre duas culturas sem pertencer completamente a nenhuma, o que leva muitos a se tornarem aventureiros em busca de identidade. Alguns dos maiores heróis da história de Tagmar eram meio-elfos.' },
            { nome: 'Pequenino', altura: '1,14 m', idioma: 'Lanta + Malês', vida: '~80 anos', profissoes: 'Bardo, Ladino — vedados Mago e Rastreador', mod: 'Pacíficos, festivos e discretos — e surpreendentemente corajosos para quem os subestima. Agilidade +2 e Percepção +1 com corpo leve fazem deles excelentes ladinos. A contrapartida: Aura −2 zera o karma e fecha o caminho da magia arcana, e Força −2 elimina qualquer pretensão de linha de frente. Não conseguem compreender magia não divina — vedados ao Mago e ao Rastreador.' },
          ].map((r) => (
            <div key={r.nome} className="gp-raca-card">
              <div className="gp-raca-nome">{r.nome}</div>
              <div className="gp-raca-altura">Altura base {r.altura}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0 8px' }}>
                <span style={{ fontSize: '0.72rem', background: 'var(--gold,#C9A44E)', color: '#1C1407', borderRadius: 4, padding: '2px 7px', fontFamily: 'var(--font-title,"Cinzel",serif)', fontWeight: 700, letterSpacing: '0.03em' }}>{r.vida}</span>
                <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.07)', color: 'var(--muted-foreground,#a89880)', borderRadius: 4, padding: '2px 7px', fontFamily: 'var(--font-body,"Plus Jakarta Sans",sans-serif)' }}>🗣 {r.idioma}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground,#a89880)', marginBottom: 6, fontStyle: 'italic' }}>Profissões: {r.profissoes}</div>
              <div className="gp-raca-mod">{r.mod}</div>
            </div>
          ))}
        </div>

        <Callout icon="ti-alert-triangle" variant="warn">
          Os modificadores raciais não são somados a um valor base: eles <b>definem</b> o
          nível inicial de cada atributo, e você gasta seus pontos a partir dali — construindo sua própria versão daquela raça. E lembre: depois de salvar,
          <b> raça e reino não mudam nunca mais</b>.
        </Callout>

      </section>

      <div className="gp-divider"></div>

      {/* ══ 03 · Reino e origem ══ */}
      <section className="gp-section" id="gp-s03">
        <SectionHead num="03" tag="Identidade · Reino e origem">De onde você vem?</SectionHead>
        <p className="gp-p">
          O reino natal é a segunda escolha permanente da ficha, e paga três dividendos
          diferentes ao longo do jogo:
        </p>
        <ul className="gp-list">
          <li><b>Idiomas gratuitos.</b> Todo personagem já fala Malês, e ganha de graça o idioma da raça (Élfico, Khuzdul, Kurng, Lanta…) e o do reino (Runa em Portis, Abadrim em Abadom, Verrogari em Verrogar…). Cada idioma extra depois disso custa 10 pontos na habilidade Idioma — dois idiomas de nascença são um belo adiantamento.</li>
          <li><b>Vantagens em habilidades.</b> Raça e reino concedem +2 (ou −2) em habilidades específicas do banco. Quando raça e reino favorecem a mesma habilidade, os bônus somam +4 — quatro níveis de graça, para sempre. Vale abrir o passo de Habilidades e conferir onde a sua origem brilha antes de gastar pontos.</li>
          <li><b>Caracterização histórica.</b> Cada reino oferece três backgrounds gratuitos (Verrogar dá Belicoso, Treinado ou Soldado; Portis dá Magista, Historiador ou Xenófobo…). É uma escolha sem custo em pontos — puro tempero de personagem.</li>
        </ul>

        <Callout icon="ti-scale">
          Além da histórica, existe a <b>caracterização de traços</b> (física, social e pessoal):
          você começa com 4 pontos, cada vantagem (Bonito, Rico, Corajoso…) custa 2, e cada
          desvantagem aceita (Feio, Pobre, Covarde…) <b>devolve</b> 2 ao pool. Aceitar duas
          fraquezas interessantes para a história do personagem banca duas forças — é a
          economia clássica do RPG: defeito bom é defeito que rende cena.
        </Callout>
      </section>

      <div className="gp-divider"></div>

      {/* ══ 04 · Profissão ══ */}
      <section className="gp-section" id="gp-s04">
        <SectionHead num="04" tag="Identidade · Profissão">Qual é a sua profissão?</SectionHead>
        <p className="gp-p">
          A cada estágio alcançado, a profissão despeja pontos novos em cinco reservatórios:
          Energia Heroica, habilidades, grupos de armas, técnicas e — para quatro delas —
          magia. Essa tabela é o coração do longo prazo do personagem:
        </p>

        <div className="gp-table-wrap">
          <table className="gp-table">
            <thead>
              <tr>
                <th>Profissão</th><th>EH Neutra</th><th>EH Masculina</th><th>EH Feminina</th>
                <th>Habilidades</th><th>Armas</th><th>Técnicas</th><th>Magia (atributo regente)</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Guerreiro</td><td>14</td><td>12</td><td>15</td><td>14</td><td>12</td><td>7</td><td className="gp-muted">—</td></tr>
              <tr><td>Sacerdote</td><td>12</td><td>10</td><td>13</td><td>10</td><td>8</td><td>6</td><td>10 (Aura)</td></tr>
              <tr><td>Ladino</td><td>10</td><td>9</td><td>11</td><td>20</td><td>10</td><td>5</td><td className="gp-muted">—</td></tr>
              <tr><td>Rastreador</td><td>10</td><td>9</td><td>11</td><td>16</td><td>10</td><td>6</td><td>8 (Percepção)</td></tr>
              <tr><td>Bardo</td><td>8</td><td>7</td><td>8</td><td>14</td><td>6</td><td>4</td><td>8 (Carisma)</td></tr>
              <tr><td>Mago</td><td>6</td><td>5</td><td>6</td><td>10</td><td>4</td><td>2</td><td>14 (Intelecto)</td></tr>
            </tbody>
          </table>
        </div>

        <div className="gp-col2" style={{ marginTop: 16 }}>
          <div className="gp-card">
            <div className="gp-card-title">Guerreiro — o extremo marcial</div>
            <p className="gp-card-text">
              É a profissão mais combatente do jogo, possui grande coragem natural (representada pela energia heroica), concentra o maior conhecimento sobre armas (representado pelo grupo de armas) e também o maior repertório de técnicas de combate. Apesar de não dominar a magia, compensa com a força física, resistência e capacidade de permanecer lutando quando qualquer outro já teria caído.
            </p>
          </div>
          <div className="gp-card">
            <div className="gp-card-title">Mago — o extremo arcano</div>
            <p className="gp-card-text">
              É a profissão com maior domínio da magia do jogo, dedicando anos ao estudo das artes arcanas. Possui a menor coragem natural (representada pela energia heroica), o que o torna especialmente vulnerável em confrontos diretos. Em compensação, recebe a maior quantidade de pontos de magia, permitindo conjurar feitiços com frequência e intensidade. Quando protegido por seus aliados, poucos conseguem rivalizar com o poder devastador de seus encantamentos.
            </p>
          </div>
        </div>

        <Callout icon="ti-award">
          No <b>estágio 5</b> o personagem escolhe uma <b>especialização</b> — Academias para
          o Guerreiro, Guildas para o Ladino, Colégios para o Mago, Ordens de cada deus para
          o Sacerdote — e ganha um título (Gladiador, Assassino, Necromante, Oráculo…).
          Além do prestígio, a especialização <b>amplia a lista de magias e técnicas que
          você pode comprar</b>: várias exigem uma especialização, não só a profissão.
          Vale planejar a build já pensando nesse destino.
        </Callout>
      </section>

      <div className="gp-divider"></div>

      {/* ══ 05 · Atributos ══ */}
      <section className="gp-section" id="gp-s05">
        <SectionHead num="05" tag="Atributos">Quais são seus pontos fortes?</SectionHead>
        <p className="gp-p">
          No estágio 1 você distribui <b>15 pontos</b> entre os sete atributos, e ganha
          <b> +1 ponto a cada 2 estágios</b>. Cada atributo alimenta uma ou mais
          estatísticas da ficha — entender essa conexão antes de gastar é o que
          separa uma build sólida de uma cheia de surpresas.
        </p>

        {/* ── Sete atributos: cards interativos ── */}
        <h3 className="gp-h3" style={{ marginBottom: 10 }}>Os sete atributos e o que eles alimentam</h3>
        <div className="gp-attr-grid">
          {[
            {
              icon: 'ti-sword',
              nome: 'Força',
              cor: '#D4856A',
              feeds: ['Dano corpo a corpo', 'Bônus em armas pesadas'],
              dica: 'Essencial para Guerreiros e Meio-Orcs. Conjuradores podem penalizar em −2 e recuperar 1 ponto para gastar em outro lugar.',
            },
            {
              icon: 'ti-heart-filled',
              nome: 'Físico',
              cor: '#C97B5A',
              feeds: ['Energia Física (EF)', 'Resistência Física (RF)'],
              dica: 'Quanto mais alto, mais pancada você aguenta antes de cair. Raças robustas como Meio-Orc e Anão já começam com +2 — aproveite.',
            },
            {
              icon: 'ti-run',
              nome: 'Agilidade',
              cor: '#7AB8A0',
              feeds: ['Velocidade', 'Defesa'],
              dica: 'Defesa mais alta significa ataques inimigos mais imprecisos. Ladinos e Rastreadores adoram esse atributo — e o Elfo-Florestal já nasce com +1.',
            },
            {
              icon: 'ti-eye',
              nome: 'Percepção',
              cor: '#A8C4A0',
              feeds: ['Energia Heroica (EH)', 'Magia do Rastreador'],
              dica: 'O atributo mais transversal do jogo: qualquer profissão se beneficia. Um ponto aqui rende EH diretamente, sem depender de profissão ou estágio.',
            },
            {
              icon: 'ti-brain',
              nome: 'Intelecto',
              cor: '#8BA8D4',
              feeds: ['Magia do Mago', 'Testes de conhecimento'],
              dica: 'Obrigatório para o Mago — é o atributo que amplia o poder e a variedade dos feitiços arcanos. Para as outras profissões, papel secundário.',
            },
            {
              icon: 'ti-sparkles',
              nome: 'Aura',
              cor: '#B07EC8',
              feeds: ['Resistência Mágica (RM)', 'Karma', 'Magia do Sacerdote'],
              dica: 'Karma = (RM + 1) × (Aura + 1). Aura < 1 zera o karma inteiro — conjuradores nunca devem deixar esse atributo cair a zero.',
            },
            {
              icon: 'ti-message-circle',
              nome: 'Carisma',
              cor: '#D4A86A',
              feeds: ['Magia do Bardo', 'Habilidades sociais'],
              dica: 'Fundamental para o Bardo e quem quer dominar influência, negociação e liderança. O Meio-Orc começa com −2 aqui — vale ponderar.',
            },
          ].map((a) => (
            <div key={a.nome} className="gp-attr-card">
              <div className="gp-attr-header">
                <i className={`ti ${a.icon} gp-attr-icon`} style={{ color: a.cor }} aria-hidden="true"></i>
                <span className="gp-attr-nome" style={{ color: a.cor }}>{a.nome}</span>
              </div>
              <div className="gp-attr-feeds">
                {a.feeds.map((f) => (
                  <span key={f} className="gp-attr-feed-tag">{f}</span>
                ))}
              </div>
              <div className="gp-attr-dica">{a.dica}</div>
            </div>
          ))}
        </div>

        {/* ── Fórmulas como tabela visual ── */}
        <h3 className="gp-h3" style={{ margin: '24px 0 10px' }}>Como os atributos viram estatísticas</h3>
        <div className="gp-formula-cards">
          {[
            { stat: 'Energia Física', abbr: 'EF', icon: 'ti-heart', formula: '⌊peso ÷ 5⌋ + Físico',                     desc: 'Seu tanque de dano físico — quanto você aguenta antes de entrar em colapso. Peso vem da raça e gênero.',           cor: '#C97B5A' },
            { stat: 'Energia Heroica', abbr: 'EH', icon: 'ti-shield-filled', formula: 'Percepção + (base prof. × estágio)', desc: 'Primeira linha de defesa em batalha. O dano desce aqui antes de chegar na EF. Feminino tem +10% na base.',      cor: '#A8C4A0' },
            { stat: 'Resist. Física', abbr: 'RF', icon: 'ti-shield', formula: 'estágio + Físico',                         desc: 'Reduz o dano físico que passa pela EH. Cresce com o nível e com Físico — tanques de guerra vivem aqui.',        cor: '#C9A44E' },
            { stat: 'Resist. Mágica', abbr: 'RM', icon: 'ti-wand', formula: 'estágio + Aura',                             desc: 'Reduz o dano mágico e também entra no cálculo do Karma. Aura alto vale dobrado para conjuradores.',            cor: '#B07EC8' },
            { stat: 'Karma',          abbr: 'KM', icon: 'ti-sparkles', formula: '(RM + 1) × (Aura + 1)',                  desc: 'Combustível das magias. Zera completamente se Aura < 1 — sem karma, o grimório inteiro vira decoração.',        cor: '#8BA8D4' },
            { stat: 'Velocidade',     abbr: 'VL', icon: 'ti-run', formula: '⌊altura × 11⌋ + Agilidade',                  desc: 'Determina ordem de iniciativa e alcance de movimento. Agilidade empurra, altura base vem da raça e gênero.',    cor: '#7AB8A0' },
            { stat: 'Defesa',         abbr: 'DF', icon: 'ti-eye-off', formula: 'def. equipamentos + Agilidade',           desc: 'Dificulta ser acertado. Armaduras contribuem com a base, Agilidade empilha em cima — cada ponto conta.',        cor: '#D4A86A' },
          ].map((f) => (
            <div key={f.abbr} className="gp-formula-row">
              <div className="gp-formula-abbr" style={{ background: f.cor + '22', borderColor: f.cor + '55' }}>
                <i className={`ti ${f.icon}`} style={{ color: f.cor, fontSize: 15, marginRight: 6 }} aria-hidden="true"></i>
                <span style={{ color: f.cor, fontFamily: 'var(--font-title,"Cinzel",serif)', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.04em' }}>{f.abbr}</span>
              </div>
              <div className="gp-formula-eq">
                <span className="gp-formula-stat">{f.stat}</span>
                <span className="gp-formula-expr">= {f.formula}</span>
              </div>
              <div className="gp-formula-desc">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* ── Tabela de custo visual ── */}
        <h3 className="gp-h3" style={{ margin: '24px 0 10px' }}>Quanto custa cada nível de atributo?</h3>
        <p className="gp-p" style={{ marginBottom: 12 }}>
          O custo não é linear — cresce em curva. Isso significa que <b>empurrar um único
          atributo ao máximo é muito mais caro</b> do que distribuir bem. Use a tabela
          abaixo como guia ao montar sua ficha:
        </p>
        <div className="gp-custo-grid">
          {[
            { val: '−2', custo: '−1 pt',   label: 'Devolve 1 ponto', cls: 'gp-custo-devolver', tip: 'Venda um atributo que não usa e recupere pontos para o que importa.' },
            { val: '−1', custo: '−0,5 pt', label: 'Devolve 0,5 ponto', cls: 'gp-custo-devolver', tip: 'Meio ponto devolvido. Combina com outra penalidade para liberar 1 ponto inteiro.' },
            { val: '0',  custo: '0 pt',    label: 'Valor base', cls: 'gp-custo-neutro', tip: 'Ponto de partida de todas as raças (antes dos modificadores raciais).' },
            { val: '+1', custo: '1 pt',    label: '1 ponto', cls: 'gp-custo-normal', tip: 'Barato e eficaz — o primeiro ponto em qualquer atributo rende bem.' },
            { val: '+2', custo: '3 pts',   label: '3 pontos', cls: 'gp-custo-medio', tip: 'Começa a ficar caro. Vale a pena para atributos que alimentam várias estatísticas.' },
            { val: '+3', custo: '6 pts',   label: '6 pontos', cls: 'gp-custo-alto', tip: 'Muito caro. Apenas para o atributo central da build — e só se a raça já não der +2.' },
            { val: '+4', custo: '10 pts',  label: '10 pontos', cls: 'gp-custo-max', tip: 'O nível máximo. Exige quase todo o pool do estágio 1. Raramente vale fora de builds muito especializadas.' },
          ].map((c) => (
            <div key={c.val} className={`gp-custo-card ${c.cls}`}>
              <div className="gp-custo-val">{c.val}</div>
              <div className="gp-custo-custo">{c.custo}</div>
              <div className="gp-custo-label">{c.label}</div>
              <div className="gp-custo-tip">{c.tip}</div>
            </div>
          ))}
        </div>

        <Callout icon="ti-coins">
          <b>A economia funciona nos dois sentidos.</b> Reduzir um atributo que você não vai usar
          devolve pontos ao pool — um Mago que aceita Força −2 recupera 1 ponto inteiro para
          investir em Intelecto. <b>Venda o que não usa, compre o que define o personagem.</b>
        </Callout>

        {/* ── Perfis de build ── */}
        <h3 className="gp-h3" style={{ margin: '24px 0 10px' }}>Perfis de distribuição: por onde começar</h3>
        <div className="gp-card-grid">
          {[
            { icon: 'ti-shield-filled', title: 'Tanque de Guerra',  cor: '#C97B5A',
              text: 'Físico +2 e Percepção +1 criam a base mais resistente do jogo: energia física alta, energia heroica sólida e resistência física crescendo a cada estágio. Ideal para Guerreiros — especialmente Meio-Orcs ou Anões que já chegam com Físico +2 de raça.' },
            { icon: 'ti-wand',          title: 'Mestre Arcano',     cor: '#8BA8D4',
              text: 'Leve o atributo regente da sua magia a +2 (Intelecto para o Mago, Aura para o Sacerdote, Carisma para o Bardo, Percepção para o Rastreador) e mantenha Aura em pelo menos +1. Sem karma, o grimório inteiro vira decoração.' },
            { icon: 'ti-heart-filled',  title: 'Sobrevivente',      cor: '#A8C4A0',
              text: 'Percepção +2 aumenta a Energia Heroica de qualquer profissão sem exigir compromisso marcial ou mágico. É a aposta mais segura para quem ainda não definiu seu estilo — e funciona especialmente bem com o Elfo-Florestal (+2 de raça).' },
            { icon: 'ti-run',           title: 'Esquivo Invisível',  cor: '#7AB8A0',
              text: 'Agilidade +2 empilha Velocidade e Defesa ao mesmo tempo. Combinado com raças ágeis (Pequenino +2, Elfo-Sombrio +1, Meio-Elfo +1), cria personagens quase impossíveis de acertar — perfeito para Ladinos e Rastreadores.' },
          ].map((c) => (
            <div key={c.title} className="gp-feat-card" style={{ borderColor: c.cor + '44' }}>
              <i className={`ti ${c.icon} gp-feat-icon`} style={{ color: c.cor }} aria-hidden="true"></i>
              <div className="gp-feat-title" style={{ color: c.cor }}>{c.title}</div>
              <div className="gp-feat-text">{c.text}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="gp-divider"></div>

      {/* ══ 06 · Grupos de armas ══ */}
      <section className="gp-section" id="gp-s06">
        <SectionHead num="06" tag="Combate · Grupos de armas">Quais armas você quer usar?</SectionHead>
        <p className="gp-p">
          Armas se dividem em 11 grupos, e cada nível treinado num grupo soma <b>direto na
          coluna de ataque</b> de qualquer arma daquele grupo. Os grupos leves custam 2 pontos
          por nível, os médios 3, e os pesados 4:
        </p>

        <div className="gp-table-wrap">
          <table className="gp-table">
            <thead>
              <tr><th>Grupo</th><th>Custo/nível</th><th>Exemplos</th></tr>
            </thead>
            <tbody>
              <tr><td>CD · Combate Desarmado</td><td>2</td><td>Punhos, soqueiras, golpes rápidos</td></tr>
              <tr><td>CI · Imobilização</td><td>2</td><td>Redes, boleadeiras, agarrões</td></tr>
              <tr><td>CL · Corte Leve</td><td>2</td><td>Facas, machadinhas</td></tr>
              <tr><td>PL · Perfuração Leve</td><td>2</td><td>Adagas, zarabatanas — armas ocultáveis</td></tr>
              <tr><td>EL · Esmagamento Leve</td><td>2</td><td>Porretes, cajados</td></tr>
              <tr><td>CM · Corte Médio</td><td>3</td><td>Espadas comuns, foices</td></tr>
              <tr><td>PM · Perfuração Média</td><td>3</td><td>Lanças, arcos — combate à distância</td></tr>
              <tr><td>EM · Esmagamento Médio</td><td>3</td><td>Clavas, maças — quebra-armaduras</td></tr>
              <tr><td>CP · Corte Pesado</td><td>4</td><td>Montantes, grandes machados</td></tr>
              <tr><td>PP · Perfuração Pesada</td><td>4</td><td>Bestas, arpões — fura armadura pesada</td></tr>
              <tr><td>EP · Esmagamento Pesado</td><td>4</td><td>Martelos de guerra, marretas</td></tr>
            </tbody>
          </table>
        </div>

        <ul className="gp-list">
          <li><b>Concentre.</b> Nível 2 em um grupo bate nível 1 em dois: a tabela de resolução recompensa colunas de ataque altas com resultados de dano dramaticamente melhores. Espalhar pontos é a receita da mediocridade em combate.</li>
          <li><b>Guerreiro (12 pts/estágio)</b> é o único que banca confortavelmente os grupos pesados de custo 4 — e é onde mora o maior dano bruto do jogo.</li>
          <li><b>Ladino e Rastreador (10 pts/estágio)</b> rendem mais nos grupos leves de custo 2: os mesmos pontos compram o dobro de níveis em PL ou CL — e adagas ainda têm o charme de serem ocultáveis.</li>
          <li><b>Conjuradores</b> (Mago 4, Bardo 6, Sacerdote 8) devem escolher um único grupo de emergência — EL para o cajado do Mago é o clássico — e aceitar que a arma é o plano B.</li>
        </ul>
      </section>

      <div className="gp-divider"></div>

      {/* ══ 07 · Habilidades ══ */}
      <section className="gp-section" id="gp-s07">
        <SectionHead num="07" tag="Habilidades">Quais habilidades você quer desenvolver?</SectionHead>
        <p className="gp-p">
          Habilidades se agrupam em seis trilhas (Profissional, Subterfúgio, Manobra,
          Influência, Conhecimento e Geral) e cada uma é regida por um atributo. O total
          rolado é simples: <b>nível comprado + atributo + bônus de origem</b>. Mas há uma
          pegadinha que separa fichas boas de fichas ótimas:
        </p>

        <Callout icon="ti-alert-triangle" variant="warn">
          Habilidade <b>não treinada rola com −7</b> além do atributo. Comprar o primeiro
          nível transforma esse −7 em +1 — <b>um salto de 8 pontos na coluna, pelo preço
          de um nível</b>. Antes de empilhar o nível 12 na sua especialidade, gaste alguns
          pontos espalhando nível 1 nas habilidades que sua mesa realmente rola.
        </Callout>

        <ul className="gp-list">
          <li><b>O Ladino é o rei aqui</b>: 20 pontos por estágio, o maior orçamento do jogo. É a profissão que pode se dar ao luxo de saber de tudo um pouco — e ainda ser o melhor em furtividade.</li>
          <li><b>Aproveite os +2 de origem.</b> A vantagem de raça/reino soma no total sem gastar ponto nenhum. Construir em cima de onde você já tem +2 (ou +4) rende os maiores totais da mesa.</li>
          <li><b>Quatro habilidades destravam aprimoramentos</b> conforme o total cresce: Idioma libera um idioma novo a cada 10 pontos, Religião um culto a cada 5, Arte e Sabedoria uma escolha a cada 7. Bardos e Sacerdotes têm bons motivos de personagem para investir cedo nelas.</li>
        </ul>
      </section>

      <div className="gp-divider"></div>

      {/* ══ 08 · Magias ══ */}
      <section className="gp-section" id="gp-s08">
        <SectionHead num="08" tag="Magias">Quais magias você quer evocar?</SectionHead>
        <p className="gp-p">
          Quatro profissões conjuram, cada uma regida por um atributo diferente — e a
          quantidade de pontos por estágio muda completamente a estratégia de compra:
        </p>

        <div className="gp-table-wrap">
          <table className="gp-table">
            <thead>
              <tr><th>Profissão</th><th>Pontos de magia/estágio</th><th>Atributo regente</th><th>Estilo natural</th></tr>
            </thead>
            <tbody>
              <tr><td>Mago</td><td>14</td><td>Intelecto</td><td>Grimório largo e profundo — pode ter de tudo</td></tr>
              <tr><td>Sacerdote</td><td>10</td><td>Aura</td><td>O melhor Karma do jogo: Aura alimenta a magia E o tanque de lançamentos</td></tr>
              <tr><td>Bardo</td><td>8</td><td>Carisma</td><td>Poucas magias, bem escolhidas, de suporte e influência</td></tr>
              <tr><td>Rastreador</td><td>8</td><td>Percepção</td><td>Percepção rende dobrado: alimenta a magia e a Energia Heroica</td></tr>
            </tbody>
          </table>
        </div>

        <p className="gp-p">
          A magia é aprendida através de passos, e cada passo destrava um nível ímpar: primeiro passo é magia nível 1, segundo passo é magia nível 3, e assim por diante até o nível 9. O preço de aprender uma nova magia é o nível efetivo × o seu custo. Em batalha, cada conjuração de magia consome karma igual ao nível usado. Uma magia no nível 9 gasta exatamente 9 pontos de karma por uso.
        </p>

        <ul className="gp-list">
          <li><b>Abra o leque no nível 1.</b> Primeiro passo é barato — ter cinco magias variadas no nível 1 dá respostas para cinco problemas diferentes, e cada uma custa só 1 de Karma para lançar.</li>
          <li><b>Eleja uma assinatura e leve ao 3º passo (nível 5).</b> É o ponto doce entre poder e sustentabilidade: forte o bastante para decidir rodadas, barata o bastante para ser usada várias vezes na mesma batalha.</li>
          <li><b>Níveis 7 e 9 são finishers</b>, não rotina. Confira seu Karma total — (RM+1) × (Aura+1) — antes de pagar por um nível que você só consegue lançar uma vez por dia.</li>
          <li><b>Aura ≥ 1 é inegociável para qualquer conjurador.</b> Com Aura zerada, o Karma é 0 e o grimório inteiro vira decoração — inclusive para o Mago, que rege por Intelecto mas lança com Karma.</li>
          <li><b>A permissão importa:</b> cada magia lista quais profissões (e especializações) podem comprá-la. A partir do estágio 5, a especialização abre uma prateleira nova do catálogo.</li>
          <li><b>Magias Perdidas e Ancestrais</b> não se compram com pontos: elas chegam em pergaminhos — de tempos em tempos um aparece na loja da história. Ao usar o pergaminho, o personagem aprende o passo em definitivo.</li>
        </ul>
      </section>

      <div className="gp-divider"></div>

      {/* ══ 09 · Técnicas ══ */}
      <section className="gp-section" id="gp-s09">
        <SectionHead num="09" tag="Técnicas de combate">O quão bem você sabe combater?</SectionHead>
        <p className="gp-p">
          Diferente das magias, <b>todas as profissões</b> compram técnicas — o que muda é
          o orçamento: Guerreiro recebe 7 pontos por estágio, Sacerdote e Rastreador 6,
          Ladino 5, Bardo 4 e Mago 2. A conta do teste é a mesma das habilidades:
          <b> nível comprado + atributo de ajuste</b> — e a técnica destreinada também
          rola com −7.
        </p>

        <ul className="gp-list">
          <li><b>Case a técnica com o grupo de armas.</b> Muitas técnicas só funcionam com armas de grupos específicos (uma técnica de Corte Médio não sai com uma adaga na mão). Compre técnicas do mesmo grupo em que você investiu no passo 06 — nada dói mais do que uma técnica linda que sua arma não executa.</li>
          <li><b>Guerreiro:</b> com 7 pontos por estágio, dá para manter duas ou três técnicas do seu grupo principal em nível alto e ainda experimentar. É o arsenal mais versátil do jogo — use-o.</li>
          <li><b>Ladino:</b> com 5 pontos, a disciplina paga: uma ou duas técnicas alinhadas às armas leves (PL/CL), empurradas para o nível mais alto possível. Agilidade alta como atributo de ajuste faz o resto.</li>
          <li><b>Priorize profundidade.</b> Como nas habilidades, o primeiro nível elimina o −7 — mas depois disso, uma técnica no nível 4 decide mais combates do que quatro técnicas no nível 1.</li>
          <li>Assim como as magias, técnicas têm <b>permissão por profissão e especialização</b> — Gladiadores, Assassinos e afins destravam manobras exclusivas no estágio 5.</li>
        </ul>
      </section>

      <div className="gp-divider"></div>

      {/* ══ 10 · Builds ══ */}
      <section className="gp-section" id="gp-s10">
        <SectionHead num="10" tag="Combinações recomendadas">Seis builds para começar com o pé direito</SectionHead>
        <p className="gp-p">
          Nenhuma combinação é proibida — o sistema recompensa criatividade. Mas se você
          quer uma fundação comprovadamente sólida, aqui vai uma sugestão por profissão,
          montada só com as sinergias que os números confirmam:
        </p>

        <div className="gp-build-grid">
          {[
            { label: 'A Muralha',            sub: 'Meio-Orc ou Anão · Guerreiro',        tag: 'Masculino', tagClass: 'gp-tag-masc',
              text: 'É o arquétipo com maior energia física e resistência física do jogo. O grande porte dessas raças aumenta naturalmente a energia física, enquanto o bônus no atributo físico fortalece também a resistência física. Mesmo a penalidade masculina na energia heroica tem pouco impacto aqui, já que o Guerreiro possui uma das maiores reservas naturais do jogo. Invista também no atributo percepção e em grupos de armas pesadas para criar um verdadeiro tanque de guerra.' },
            { label: 'A Voz dos Deuses',     sub: 'Elfo-Dourado · Sacerdote',            tag: 'Feminino',  tagClass: 'gp-tag-fem',
              text: 'É uma das melhores combinações para quem deseja dominar a magia divina. O bônus no atributo aura aumenta tanto o poder das magias quanto a quantidade de karma, permitindo conjurar mais feitiços ao longo da aventura. Sua elevada energia heroica também ajuda o Sacerdote a permanecer de pé para proteger e curar seus aliados nos momentos mais difíceis.' },
            { label: 'A Sombra',             sub: 'Elfo-Sombrio ou Pequenino · Ladino',  tag: 'Neutro',    tagClass: 'gp-tag-neut',
              text: 'É a combinação ideal para personagens que dependem de velocidade, precisão e versatilidade. O bônus no atributo agilidade aumenta a velocidade e a defesa, tornando o Ladino muito mais difícil de acertar. Além disso, a grande quantidade de pontos de habilidade permite dominar diversas especializações. Invista em grupos de armas leves e técnicas de combate para aproveitar ao máximo essa mobilidade.' },
            { label: 'O Arquivista de Fogo', sub: 'Elfo-Dourado · Mago',                 tag: 'Feminino',  tagClass: 'gp-tag-fem',
              text: 'É uma das melhores combinações para alcançar o máximo potencial mágico. O bônus no atributo intelecto fortalece diretamente as magias, enquanto o bônus no atributo aura aumenta a quantidade de karma disponível para conjurá-las. A boa energia heroica da raça também ajuda a compensar a fragilidade natural do Mago, permitindo que sobreviva por mais tempo aos combates.' },
            { label: 'O Olho da Floresta',   sub: 'Elfo-Florestal · Rastreador',         tag: 'Feminino',  tagClass: 'gp-tag-fem',
              text: 'É uma excelente escolha para personagens que desejam unir magia, influência e versatilidade. O bônus no atributo carisma fortalece as magias e habilidades de influência, enquanto o bônus no atributo agilidade aumenta a defesa e a velocidade, ajudando o Bardo a permanecer fora de perigo. Mantenha também o atributo aura em um bom nível para garantir karma suficiente para sustentar suas canções e encantamentos.' },
            { label: 'A Língua de Prata',    sub: 'Meio-Elfo · Bardo',                   tag: 'Neutro',    tagClass: 'gp-tag-neut',
              text: 'É uma combinação que aproveita ao máximo as características da profissão. O bônus no atributo percepção aumenta a energia heroica e também fortalece as magias do Rastreador, permitindo que um único atributo beneficie tanto a sobrevivência quanto a capacidade de conjuração. Complete a construção investindo em arcos e habilidades ligadas à exploração e à natureza.' },
          ].map((b) => (
            <div key={b.label} className="gp-build-card">
              <div className="gp-build-top">
                <span className="gp-build-label">{b.label}</span>
                <span className={`gp-card-tag ${b.tagClass}`} style={{ marginBottom: 0 }}>{b.tag}</span>
              </div>
              <div className="gp-build-sub">{b.sub}</div>
              <div className="gp-build-text">{b.text}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="gp-divider"></div>

      {/* ══ 11 · Resumo das trocas ══ */}
      <section className="gp-section" id="gp-s11">
        <SectionHead num="11" tag="Resumo">Toda escolha é uma troca — aqui está o mapa</SectionHead>
        <div className="gp-table-wrap">
          <table className="gp-table">
            <thead><tr><th>Escolha</th><th>Entrega</th><th>Custa</th></tr></thead>
            <tbody>
              <tr><td>Personagem Feminina</td><td>Possui mais energia heroica por estágio</td><td>Possui menos altura e peso</td></tr>
              <tr><td>Personagem Masculino</td><td>Possui mais altura e peso, e por consequência mais energia física e velocidade</td><td>Possui menos energia heroica por estágio</td></tr>
              <tr><td>Raças Robustas</td><td>Anões e Meio-Orcs possuem energia física alta de nascença</td><td>Mas possuem menor concentração de aura e carisma</td></tr>
              <tr><td>Raças Sábias</td><td>Elfos possuem aura, intelecto e percepção mais aflorados</td><td>Mas o físico e a resistência ficam comprometidos</td></tr>
              <tr><td>Guerreiro</td><td>Maior EH, mais armas e técnicas do jogo</td><td>Zero acesso a magia</td></tr>
              <tr><td>Mago</td><td>14 pontos de magia/estágio — o maior arsenal</td><td>Menor EH do jogo: fragilidade real</td></tr>
              <tr><td>Ladino</td><td>20 pontos de habilidade/estágio</td><td>EH mediana — sobrevive desviando, não aguentando</td></tr>
              <tr><td>Atributo em +2</td><td>+2 imediato em tudo que ele alimenta</td><td>3 pontos — o triplo do custo do +1</td></tr>
              <tr><td>Atributo em −1 ou −2</td><td>Devolve 0,5 ou 1 ponto ao pool</td><td>Fraqueza permanente na ficha (escolha uma que não doa)</td></tr>
              <tr><td>Grupo de armas pesado</td><td>O maior dano bruto do sistema</td><td>4 pontos por nível — só o Guerreiro banca com folga</td></tr>
              <tr><td>1º nível numa habilidade/técnica</td><td>Elimina o −7 de destreinado: salto de 8 na coluna</td><td>O custo de um único nível — a melhor barganha da ficha</td></tr>
              <tr><td>Magia no 5º passo (nível 9)</td><td>Efeito devastador</td><td>9 de Karma por lançamento — confira seu tanque antes</td></tr>
              <tr><td>Vantagem de raça/reino em habilidade</td><td>+2 (até +4) permanente e gratuito</td><td>Nada — só exige escolher a origem com intenção</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Rodapé ── */}
      <GuiaFooter />

    </div>
  );
}

Object.assign(window, { GuiaPersonagem });
