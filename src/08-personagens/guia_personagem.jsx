/* ============================================================
   GUIA DO AVENTUREIRO (AJUDA) — src/08-personagens/guia_personagem.jsx
   ============================================================
   A página de Ajuda: as regras ATUAIS do jogo, na ordem em que o jogador
   as encontra. Reescrita em 26/09/2026 ("faça uma readequação da página
   ajuda, explicando todas as regras do jogo atuais"), com os tópicos que o
   usuário definiu: Gêneros, Raças, Reinos, Profissões, Especializações,
   Atributos, Armas, Habilidades, Magias, Arquétipos e Resumo. Técnicas e o
   combate moram em Armas; elementos, em Profissões (e na magia).

   Todos os números vêm do código — ao mudar uma regra lá, conferir aqui:
     01-core/game-data.jsx     GAME_DATA (raças, profissões, especializações,
                               custoAtributo), calcularFicha, peso/altura,
                               bonusPontosRaca, MAGIAS/TECNICAS/GRUPOS_ARMAS
                               _POR_PROFISSAO, RESULTADOS_ACAO,
                               ELEMENTO_PROFISSAO, VANTAGEM_ELEMENTAL
     12-batalha/batalha.jsx    colunaAtaque, danoNoTier, danoFinal,
                               aplicarDanoCascata (EF_MORTE), paDaRodada,
                               pontosAcaoTecnicaPJ, ordenarIniciativa,
                               formarBandos, VISIBILIDADE_PENALIDADE

   Componentes internos (não exportados): GpSelect (casca do SelectPill),
   SectionHead (placa com ícone + título), Essencial (o resumo da seção),
   Callout, SimuladorEH, SimuladorElemento, GuiaFooter. O sumário navega por
   scrollIntoView (sem tocar location.hash — o app não usa router).

   Depende de: nada em runtime além dos globais de 01-core (sem Supabase).
   Exposto via: window.GuiaPersonagem (AdminConsole, seção guia_personagem)
   Estilo: seção "GUIA DO AVENTUREIRO" do index.css (classes gp-*)
   i18n: PT-only por enquanto — bilinguar sob pedido explícito.
   ============================================================ */

/* ============================== [08.5] Helpers visuais ============================== */

// Scroll suave até uma seção, respeitando reduced-motion. Não altera
// location.hash; scrollIntoView acha o container de scroll do AdminConsole.
function gpIrPara(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduz = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  el.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'start' });
}

/* Placa de bronze com o ícone do tópico + título. Era numerada (01…11) quando
   a página espelhava o wizard; com Arquétipos e Resumo no meio dos tópicos a
   ordem deixou de ser a do wizard, e o número virou enfeite — saiu. */
function SectionHead({ icon, titulo, children }) {
  return (
    <div className="gp-section-head">
      <span className="gp-section-num" aria-hidden="true"><i className={`ti ${icon}`} /></span>
      <div className="gp-section-head-txt">
        <h2 className="gp-h2">{titulo}</h2>
        {children && <p className="gp-section-sub">{children}</p>}
      </div>
    </div>
  );
}

/* O ESSENCIAL da seção: as regras que o jogador precisa guardar, antes da
   explicação. Quem só passa os olhos sai com o que importa; quem lê tudo
   encontra o porquê logo abaixo. */
function Essencial({ itens }) {
  return (
    <div className="gp-essencial">
      <div className="gp-essencial-tit"><i className="ti ti-pin" aria-hidden="true" /> O essencial</div>
      <ul>
        {itens.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
    </div>
  );
}

// variant: 'gold' (padrão, dica) | 'warn' (atenção)
function Callout({ icon = 'ti-bulb', variant, children }) {
  return (
    <div className={`gp-callout${variant === 'warn' ? ' gp-callout-warn' : ''}`}>
      <i className={`ti ${icon} gp-callout-icon`} aria-hidden="true"></i>
      <p className="gp-callout-text">{children}</p>
    </div>
  );
}

/* Casca do SelectPill (25/09/2026): o único dropdown do sistema. `minWidth`
   continua valendo como largura mínima do campo. */
function GpSelect({ value, options, onChange, minWidth = 200 }) {
  return (
    <div style={{ minWidth }}>
      <SelectPill options={options} value={value} onChange={onChange} />
    </div>
  );
}

/* ============================== [08.6] Simuladores ============================== */

// Fórmula real (calcularFicha): EH = Percepção + ehBase × estágio.
// Masculino: floor(ehBase × 0,9). Feminino: floor(ehBase × 1,1). Neutro: base.
function SimuladorEH() {
  const PROFS = { Guerreiro: 14, Sacerdote: 12, Ladino: 10, Rastreador: 10, Bardo: 8, Mago: 6 };
  const [prof, setProf] = useState('Guerreiro');
  const [est, setEst]   = useState(5);
  const [perc, setPerc] = useState(1);

  const base   = PROFS[prof] || 6;
  const ehNeut = perc + base * est;
  const ehFem  = perc + Math.floor(base * 1.1) * est;
  const ehMasc = perc + Math.floor(base * 0.9) * est;

  return (
    <div className="gp-sim-wrap">
      <div className="gp-sim-controls">
        <div className="gp-sim-field">
          <span className="gp-field-label">Profissão</span>
          <GpSelect value={prof} onChange={setProf} minWidth={200}
            options={Object.keys(PROFS).map((p) => ({ value: p, label: p }))} />
        </div>
        <div className="gp-sim-field">
          <span className="gp-field-label">Estágio</span>
          <GpSelect value={est} onChange={setEst} minWidth={130}
            options={[1, 3, 5, 10, 20].map((v) => ({ value: v, label: `Estágio ${v}` }))} />
        </div>
        <div className="gp-sim-field">
          <span className="gp-field-label">Percepção</span>
          <GpSelect value={perc} onChange={setPerc} minWidth={100}
            options={[0, 1, 2, 3].map((v) => ({ value: v, label: `+${v}` }))} />
        </div>
      </div>
      <div className="gp-sim-out">
        <div className="gp-sim-row"><span className="gp-sim-label">Feminino</span><span className="gp-sim-val gp-up">{ehFem} EH</span></div>
        <div className="gp-sim-row"><span className="gp-sim-label">Neutro</span><span className="gp-sim-val">{ehNeut} EH</span></div>
        <div className="gp-sim-row"><span className="gp-sim-label">Masculino</span><span className="gp-sim-val">{ehMasc} EH</span></div>
        <div className="gp-sim-row gp-sim-row-last">
          <span className="gp-sim-label">Feminino sobre Masculino no estágio {est}</span>
          <span className="gp-sim-val gp-up">+{ehFem - ehMasc} EH</span>
        </div>
      </div>
    </div>
  );
}

const GP_ELEMENTOS = [
  { v: 'Fogo', icon: 'ti-flame' }, { v: 'Ar', icon: 'ti-wind' },
  { v: 'Terra', icon: 'ti-mountain' }, { v: 'Água', icon: 'ti-droplet' },
  { v: 'Luz', icon: 'ti-sun' }, { v: 'Escuridão', icon: 'ti-moon' },
];

/* Quanto um golpe de um elemento rende contra o outro — a MESMA função que o
   motor de batalha usa (bonusElemental), para a ajuda nunca discordar dele. */
function SimuladorElemento() {
  const [golpe, setGolpe] = useState('Fogo');
  const [alvo, setAlvo]   = useState('Ar');
  const pct = typeof bonusElemental === 'function' ? bonusElemental(golpe, alvo) : 0;
  const opts = GP_ELEMENTOS.map((e) => ({ value: e.v, label: e.v }));
  return (
    <div className="gp-sim-wrap">
      <div className="gp-sim-controls">
        <div className="gp-sim-field">
          <span className="gp-field-label">Golpe de</span>
          <GpSelect value={golpe} onChange={setGolpe} minWidth={150} options={opts} />
        </div>
        <div className="gp-sim-field">
          <span className="gp-field-label">Contra alvo de</span>
          <GpSelect value={alvo} onChange={setAlvo} minWidth={150} options={opts} />
        </div>
      </div>
      <div className="gp-sim-out">
        <div className="gp-sim-row gp-sim-row-last">
          <span className="gp-sim-label">
            {pct > 0
              ? `${golpe} tem vantagem sobre ${alvo}: um golpe de 20 vira ${Math.ceil(20 * (1 + pct / 100))}.`
              : `${golpe} não tem vantagem sobre ${alvo}: o dano fica como está.`}
          </span>
          <span className={'gp-sim-val' + (pct > 0 ? ' gp-up' : '')}>{pct > 0 ? `+${pct}%` : '0%'}</span>
        </div>
      </div>
    </div>
  );
}

/* ============================== [08.65] Sumário e rodapé ============================== */

const GP_TOC = [
  { id: 'gp-generos',       icon: 'ti-gender-bigender', label: 'Gêneros' },
  { id: 'gp-racas',         icon: 'ti-users',           label: 'Raças' },
  { id: 'gp-reinos',        icon: 'ti-crown',           label: 'Reinos' },
  { id: 'gp-profissoes',    icon: 'ti-briefcase',       label: 'Profissões' },
  { id: 'gp-especializacoes', icon: 'ti-award',         label: 'Especializações' },
  { id: 'gp-atributos',     icon: 'ti-chart-radar',     label: 'Atributos' },
  { id: 'gp-armas',         icon: 'ti-sword',           label: 'Armas' },
  { id: 'gp-habilidades',   icon: 'ti-tools',           label: 'Habilidades' },
  { id: 'gp-magias',        icon: 'ti-wand',            label: 'Magias' },
  { id: 'gp-arquetipos',    icon: 'ti-chess-knight',    label: 'Arquétipos' },
  { id: 'gp-resumo',        icon: 'ti-list-check',      label: 'Resumo' },
];

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

/* ============================== [08.66] Dados das tabelas ============================== */

// Modificadores de GAME_DATA.racas, na ordem das colunas da tabela.
const GP_ATR_COLS = [
  ['forca', 'For'], ['fisico', 'Fís'], ['agilidade', 'Agi'], ['percepcao', 'Per'],
  ['intelecto', 'Int'], ['aura', 'Aur'], ['carisma', 'Car'],
];

const GP_RACAS = [
  { nome: 'Humano', idioma: 'Malês', vida: '~80 anos', tradicao: 'Todas as profissões',
    txt: 'A raça de referência: nenhum modificador, nenhum atributo no negativo — e, por isso, o maior bônus de pontos livres (+4). É a tela em branco para quem ainda não decidiu um estilo.' },
  { nome: 'Meio-Elfo', idioma: 'Malês + Élfico', vida: '~450 anos', tradicao: 'Todas as profissões',
    txt: 'Carisma e Agilidade dos elfos, com o custo élfico de sempre no Físico. Vivem entre duas culturas sem pertencer a nenhuma, e muitos viram aventureiros em busca de identidade.' },
  { nome: 'Meio-Orc', idioma: 'Malês + Kurng', vida: '~80 anos', tradicao: 'Guerreiro, Ladino, Sacerdote',
    txt: 'Força e Físico +2 fazem dele o maior tanque de dano de nascença. O preço é real: Intelecto e Carisma −2 fecham o caminho da magia arcana e das habilidades sociais.' },
  { nome: 'Anão', idioma: 'Khuzdul + Malês', vida: '~450 anos', tradicao: 'Guerreiro, Sacerdote',
    txt: 'Corpos atarracados de força excepcional — Força e Físico +2 —, mas Agilidade −2 e Aura −1. Pesam mais para a altura que têm, e isso rende Energia Física. Artesãos lendários.' },
  { nome: 'Elfo-Florestal', idioma: 'Élfico + Malês', vida: '~800 anos', tradicao: 'Guerreiro, Rastreador, Ladino',
    txt: 'Percepção +2 vira Energia Heroica direto, em qualquer profissão; Agilidade +1 ajuda na defesa. Força e Físico −1. Poucos rivalizam com eles como rastreadores das florestas.' },
  { nome: 'Elfo-Dourado', idioma: 'Élfico + Malês', vida: '~800 anos', tradicao: 'Mago, Bardo, Rastreador',
    txt: 'A maior aptidão mágica do jogo: Aura +2, Intelecto e Percepção +1. A fragilidade é o preço — Força −2 e Físico −1.' },
  { nome: 'Elfo-Sombrio', idioma: 'Élfico + Malês', vida: '~800 anos', tradicao: 'Ladino, Rastreador, Mago',
    txt: 'Agilidade, Percepção e Aura +1 num equilíbrio voltado à furtividade e ao conhecimento oculto. Carisma e Físico −1. Preferem a paciência e o veneno à força bruta.' },
  { nome: 'Pequenino', idioma: 'Lanta + Malês', vida: '~80 anos', tradicao: 'Bardo, Ladino',
    txt: 'Agilidade +2, Percepção e Carisma +1: ladinos natos. Força e Aura −2 — sem linha de frente e com pouco karma. Pacíficos, festivos e mais corajosos do que parecem.' },
];

/* ============================== [08.7] GuiaPersonagem — página ============================== */
function GuiaPersonagem({ lang = 'pt' }) {
  const racas = (typeof GAME_DATA !== 'undefined' && GAME_DATA.racas) || {};
  const bonusRaca = (r) => (typeof bonusPontosRaca === 'function' ? bonusPontosRaca(r) : 0);
  const fmtMod = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
  const fmtNum = (n) => String(n).replace('.', ',');
  const especializacoes = (typeof GAME_DATA !== 'undefined' && GAME_DATA.especializacoes) || {};

  return (
    <div className="gp-page">

      {/* ── Cabeçalho ── */}
      <header className="gp-hero" id="gp-topo">
        <h1 className="gp-h1">Guia para criação de personagens: o peso de cada escolha</h1>
        <p className="gp-lead">
          Nenhuma escolha na ficha é só estética. Este guia reúne as regras do jogo
          como elas funcionam hoje — do gênero à magia, da primeira compra de pontos
          ao golpe que decide a batalha —, mostra a conta por trás de cada número e
          dá conselhos práticos para você sair da criação com o herói que imaginou.
        </p>
        <nav className="gp-toc" aria-label="Sumário do guia">
          {GP_TOC.map((t) => (
            <a key={t.id} href={`#${t.id}`} className="gp-toc-link"
              onClick={(e) => { e.preventDefault(); gpIrPara(t.id); }}>
              <i className={`ti ${t.icon}`} aria-hidden="true" />{t.label}
            </a>
          ))}
        </nav>
      </header>

      {/* ══ Gêneros ══ */}
      <section className="gp-section" id="gp-generos">
        <SectionHead icon="ti-gender-bigender" titulo="Gêneros">
          O gênero muda o corpo e a Energia Heroica — são três opções, cada uma com uma troca.
        </SectionHead>
        <Essencial itens={[
          <>Feminino: <b>−10% de altura e peso</b>, <b>+10% na Energia Heroica</b> da profissão.</>,
          <>Masculino: <b>+10% de altura e peso</b>, <b>−10% na Energia Heroica</b> da profissão.</>,
          <>Neutro: os valores exatos da raça e da profissão.</>,
        ]} />

        <div className="gp-trio">
          <div className="gp-card">
            <span className="gp-card-tag gp-tag-fem"><i className="ti ti-gender-female" aria-hidden="true"></i> Feminino</span>
            <div className="gp-stat-row">
              <span className="gp-stat-key">Corpo</span>
              <span className="gp-stat-val gp-danger">Altura e peso 10% abaixo da raça: menos Energia Física e um pouco menos de Velocidade, que nasce da altura.</span>
            </div>
            <div className="gp-stat-row">
              <span className="gp-stat-key">Energia Heroica</span>
              <span className="gp-stat-val gp-accent">+10% na base da profissão (arredondado para baixo), repetido a cada estágio.</span>
            </div>
          </div>
          <div className="gp-card">
            <span className="gp-card-tag gp-tag-masc"><i className="ti ti-gender-male" aria-hidden="true"></i> Masculino</span>
            <div className="gp-stat-row">
              <span className="gp-stat-key">Corpo</span>
              <span className="gp-stat-val gp-accent">Altura e peso 10% acima da raça: mais Energia Física e Velocidade.</span>
            </div>
            <div className="gp-stat-row">
              <span className="gp-stat-key">Energia Heroica</span>
              <span className="gp-stat-val gp-danger">−10% na base da profissão (arredondado para baixo), repetido a cada estágio.</span>
            </div>
          </div>
          <div className="gp-card">
            <span className="gp-card-tag gp-tag-neut"><i className="ti ti-circle-half-2" aria-hidden="true"></i> Neutro</span>
            <div className="gp-stat-row">
              <span className="gp-stat-key">Corpo</span>
              <span className="gp-stat-val gp-accent">Altura e peso padrão da raça.</span>
            </div>
            <div className="gp-stat-row">
              <span className="gp-stat-key">Energia Heroica</span>
              <span className="gp-stat-val gp-accent">A base exata da profissão.</span>
            </div>
          </div>
        </div>

        <Callout icon="ti-info-circle">
          <b>A Energia Heroica é a primeira linha de defesa.</b> Em batalha o dano consome
          primeiro a Energia Heroica, depois esbarra na armadura e só então chega à Energia
          Física (veja em Armas). A diferença de 10% parece pequena no estágio 1, mas se
          repete a cada estágio: no estágio 10, uma guerreira carrega 30 pontos de Energia
          Heroica a mais que um guerreiro.
        </Callout>

        <div className="gp-sub-section">
          <h3 className="gp-h3">Simulador · Energia Heroica por estágio</h3>
          <SimuladorEH />
        </div>
      </section>

      <div className="gp-divider"></div>

      {/* ══ Raças ══ */}
      <section className="gp-section" id="gp-racas">
        <SectionHead icon="ti-users" titulo="Raças">
          A raça define o ponto de partida dos sete atributos, a altura, um idioma de graça e o bônus de pontos livres.
        </SectionHead>
        <Essencial itens={[
          <>O modificador racial <b>é o nível inicial</b> do atributo, de graça — você compra a partir dali.</>,
          <>Toda raça começa com o <b>mesmo valor total</b>: quem ganha menos modificadores recebe a diferença em <b>pontos livres</b>.</>,
          <>Raça e reino <b>não mudam</b> depois de salvar o personagem.</>,
        ]} />

        <div className="gp-table-wrap">
          <table className="gp-table gp-table-num">
            <thead>
              <tr>
                <th>Raça</th>
                {GP_ATR_COLS.map(([k, s]) => <th key={k}>{s}</th>)}
                <th>Altura</th><th>Pontos livres</th>
              </tr>
            </thead>
            <tbody>
              {GP_RACAS.map((r) => {
                const d = racas[r.nome] || { mods: {}, altura: 0 };
                return (
                  <tr key={r.nome}>
                    <td>{r.nome}</td>
                    {GP_ATR_COLS.map(([k]) => {
                      const v = d.mods?.[k] || 0;
                      return <td key={k} className={v > 0 ? 'gp-pos' : v < 0 ? 'gp-neg' : 'gp-zero'}>{fmtMod(v)}</td>;
                    })}
                    <td>{fmtNum(d.altura)} m</td>
                    <td>{bonusRaca(r.nome) > 0 ? `+${fmtNum(bonusRaca(r.nome))}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="gp-legenda">
          For Força · Fís Físico · Agi Agilidade · Per Percepção · Int Intelecto · Aur Aura · Car Carisma
        </p>

        <div className="gp-raca-grid">
          {GP_RACAS.map((r) => (
            <div key={r.nome} className="gp-raca-card">
              <div className="gp-raca-nome">{r.nome}</div>
              <div className="gp-raca-meta">
                <span className="gp-chip gp-chip-ouro"><i className="ti ti-hourglass" aria-hidden="true" />{r.vida}</span>
                <span className="gp-chip"><i className="ti ti-language" aria-hidden="true" />{r.idioma}</span>
              </div>
              <div className="gp-raca-trad">Tradição: {r.tradicao}</div>
              <div className="gp-raca-mod">{r.txt}</div>
            </div>
          ))}
        </div>

        <Callout icon="ti-scale">
          <b>Por que existem pontos livres.</b> Somando o custo dos níveis que cada raça dá
          de graça, o Anão e o Meio-Orc valem 4 pontos e o Humano, 0. Para a raça decidir
          <i> onde</i> o personagem é forte — e não <i>quanto</i> ele vale —, cada raça recebe
          em pontos livres o que falta para alcançar a mais valiosa. As profissões de
          “Tradição” são costume do povo, não proibição: a ficha aceita qualquer combinação.
        </Callout>
      </section>

      <div className="gp-divider"></div>

      {/* ══ Reinos ══ */}
      <section className="gp-section" id="gp-reinos">
        <SectionHead icon="ti-crown" titulo="Reinos">
          O reino natal é a segunda escolha permanente da ficha, e paga três dividendos.
        </SectionHead>
        <Essencial itens={[
          <>Todo personagem fala <b>Malês</b>, mais o idioma da raça e o do reino — de graça.</>,
          <>Raça e reino dão <b>+2 ou −2</b> em habilidades específicas; quando os dois favorecem a mesma, soma <b>+4</b>.</>,
          <>Caracterização: <b>4 pontos</b>; cada vantagem custa 2 e cada desvantagem devolve 2.</>,
        ]} />
        <ul className="gp-list">
          <li><b>Idiomas.</b> O idioma da raça (Élfico, Khuzdul, Kurng, Lanta) e o do reino (Runa em Portis, Abadrim em Abadom, Lunês em Luna…) vêm de nascença. Cada idioma novo depois disso sai da habilidade Idioma: um a cada 10 pontos de total.</li>
          <li><b>Vantagens em habilidades.</b> Cada habilidade do catálogo lista as raças e reinos que a favorecem (+2) ou a dificultam (−2). O bônus soma no total sem gastar ponto nenhum — confira no passo de Habilidades onde a sua origem brilha.</li>
          <li><b>Caracterização histórica.</b> Cada reino oferece três passados (Verrogar: Belicoso, Treinado ou Soldado; Portis: Magista, Historiador ou Xenófobo…). Não custa pontos — é tempero de personagem.</li>
        </ul>
        <Callout icon="ti-masks-theater">
          A <b>caracterização de traços</b> (física, social e pessoal) começa com 4 pontos.
          Cada vantagem (Bonito, Rico, Corajoso…) custa 2; cada desvantagem aceita (Feio,
          Pobre, Covarde…) <b>devolve</b> 2. Duas fraquezas boas de interpretar bancam duas
          forças — defeito bom é defeito que rende cena.
        </Callout>
      </section>

      <div className="gp-divider"></div>

      {/* ══ Profissões ══ */}
      <section className="gp-section" id="gp-profissoes">
        <SectionHead icon="ti-briefcase" titulo="Profissões">
          A cada estágio a profissão despeja pontos em cinco reservatórios — e dá ao personagem o seu elemento.
        </SectionHead>
        <Essencial itens={[
          <>Os pontos da tabela abaixo são <b>por estágio</b>: no estágio 3, o Guerreiro tem 3 × 14 pontos de habilidade.</>,
          <>Só Sacerdote, Rastreador, Bardo e Mago conjuram magia.</>,
          <>Cada profissão tem um <b>elemento</b>, que dá vantagem de dano contra outros elementos.</>,
        ]} />

        <div className="gp-table-wrap">
          <table className="gp-table gp-table-num">
            <thead>
              <tr>
                <th>Profissão</th><th>EH neutra</th><th>EH masc.</th><th>EH fem.</th>
                <th>Habilidades</th><th>Armas</th><th>Técnicas</th><th>Magia</th><th>Elemento</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Guerreiro</td><td>14</td><td>12</td><td>15</td><td>14</td><td>12</td><td>7</td><td className="gp-muted">—</td><td>Fogo</td></tr>
              <tr><td>Sacerdote</td><td>12</td><td>10</td><td>13</td><td>10</td><td>8</td><td>6</td><td>10 · Aura</td><td>Luz</td></tr>
              <tr><td>Ladino</td><td>10</td><td>9</td><td>11</td><td>20</td><td>10</td><td>5</td><td className="gp-muted">—</td><td>Ar</td></tr>
              <tr><td>Rastreador</td><td>10</td><td>9</td><td>11</td><td>16</td><td>10</td><td>6</td><td>8 · Percepção</td><td>Terra</td></tr>
              <tr><td>Bardo</td><td>8</td><td>7</td><td>8</td><td>14</td><td>6</td><td>4</td><td>8 · Carisma</td><td>Água</td></tr>
              <tr><td>Mago</td><td>6</td><td>5</td><td>6</td><td>10</td><td>4</td><td>2</td><td>14 · Intelecto</td><td>Escuridão</td></tr>
            </tbody>
          </table>
        </div>

        {/* As seis profissões (26/09/2026): Guerreiro e Ladino lado a lado,
            Rastreador e Bardo lado a lado, Mago e Sacerdote numa linha cada —
            a ordem que o usuário pediu. */}
        <div className="gp-prof-grid">
          {[
            { nome: 'Guerreiro', el: 'Fogo', icon: 'ti-flame', cls: 'gp-elem-0',
              txt: 'O extremo marcial: a maior Energia Heroica (14 por estágio), o maior orçamento de armas (12) e de técnicas (7). Não conjura, e compensa com a capacidade de continuar lutando quando qualquer outro já teria caído. Especializado, ganha uma ação extra por rodada só para técnicas.' },
            { nome: 'Ladino', el: 'Ar', icon: 'ti-wind', cls: 'gp-elem-1',
              txt: 'O mestre das habilidades: 20 pontos por estágio, o maior orçamento do jogo. Energia Heroica mediana (10) — sobrevive desviando, não aguentando. Armas leves e técnicas afinadas com elas fazem o dano; especializado, também ganha a ação extra de técnica.' },
            { nome: 'Rastreador', el: 'Terra', icon: 'ti-mountain', cls: 'gp-elem-2',
              txt: 'O caçador versátil: 16 pontos de habilidade, 10 de armas e 6 de técnicas por estágio, e magia regida pela Percepção (8 por estágio). A Percepção rende dobrado: alimenta a magia e a Energia Heroica.' },
            { nome: 'Bardo', el: 'Água', icon: 'ti-droplet', cls: 'gp-elem-3',
              txt: 'A voz do grupo: magia regida pelo Carisma (8 por estágio) e 14 pontos de habilidade para influência e conhecimento. Energia Heroica baixa (8) e poucas armas (6) — luta melhor a partir da retaguarda.' },
            { nome: 'Mago', el: 'Escuridão', icon: 'ti-moon', cls: 'gp-elem-esc', largo: true,
              txt: 'O extremo arcano: o maior orçamento de magia (14 por estágio, regida pelo Intelecto) e a menor Energia Heroica do jogo (6). Poucas armas (4) e técnicas (2). Vulnerável no confronto direto; protegido pelos aliados, poucos rivalizam com o poder dos seus encantamentos — e a Escuridão rende 5% contra os quatro elementos.' },
            { nome: 'Sacerdote', el: 'Luz', icon: 'ti-sun', cls: 'gp-elem-luz', largo: true,
              txt: 'O guardião divino: Energia Heroica alta (12), magia regida pela Aura (10 por estágio) e um orçamento equilibrado de armas (8) e técnicas (6). A Aura alimenta a magia e o Karma ao mesmo tempo, e a Luz rende 15% contra criaturas da Escuridão.' },
          ].map((p) => (
            <div key={p.nome} className={'gp-card gp-prof-card' + (p.largo ? ' gp-prof-card--largo' : '')}>
              <div className="gp-prof-top">
                <span className="gp-card-title">{p.nome}</span>
                <span className={'gp-elem-chip ' + p.cls}><i className={'ti ' + p.icon} aria-hidden="true" />{p.el}</span>
              </div>
              <p className="gp-card-text">{p.txt}</p>
            </div>
          ))}
        </div>

        <div className="gp-sub-section">
          <h3 className="gp-h3">Elementos</h3>
          <p className="gp-p">
            O elemento do personagem é o da profissão; o da criatura está na ficha dela. Todo
            golpe carrega um elemento — o da <b>magia</b>, quando ela tem um, ou o de quem bate —
            e ganha dano extra contra o elemento que ele domina:
          </p>
          <div className="gp-elem">
            <div className="gp-elem-ciclo" aria-label="Fogo vence Ar, Ar vence Terra, Terra vence Água, Água vence Fogo: 10% cada">
              {['Fogo', 'Ar', 'Terra', 'Água'].map((el, i, arr) => {
                const e = GP_ELEMENTOS.find((x) => x.v === el);
                return (
                  <React.Fragment key={el}>
                    <span className={`gp-elem-chip gp-elem-${i}`}><i className={`ti ${e.icon}`} aria-hidden="true" />{el}</span>
                    <span className="gp-elem-seta" aria-hidden="true"><i className="ti ti-arrow-right" />10%</span>
                    {i === arr.length - 1 && <span className="gp-elem-chip gp-elem-0 gp-elem-volta"><i className="ti ti-flame" aria-hidden="true" />Fogo</span>}
                  </React.Fragment>
                );
              })}
            </div>
            <div className="gp-elem-linha">
              <span className="gp-elem-chip gp-elem-luz"><i className="ti ti-sun" aria-hidden="true" />Luz</span>
              <span className="gp-elem-seta" aria-hidden="true"><i className="ti ti-arrow-right" />15%</span>
              <span className="gp-elem-chip gp-elem-esc"><i className="ti ti-moon" aria-hidden="true" />Escuridão</span>
              <span className="gp-elem-seta" aria-hidden="true"><i className="ti ti-arrow-right" />5%</span>
              {/* Os quatro alvos da Escuridão em badges (26/09/2026), como o
                  resto da roda — era uma frase solta. */}
              {['Fogo', 'Ar', 'Terra', 'Água'].map((el, i) => {
                const e = GP_ELEMENTOS.find((x) => x.v === el);
                return <span key={el} className={`gp-elem-chip gp-elem-${i}`}><i className={`ti ${e.icon}`} aria-hidden="true" />{el}</span>;
              })}
            </div>
          </div>
          <ul className="gp-list">
            <li><b>Não é recíproco.</b> Fogo rende 10% a mais contra Ar; Ar contra Fogo não rende nada.</li>
            <li><b>Não soma.</b> Quem tem dois elementos (uma criatura de Fogo e Luz) usa a melhor vantagem entre os pares.</li>
            <li><b>Entra com os outros percentuais</b> de dano do atacante (magias e efeitos que aumentam dano), e o total arredonda para cima.</li>
          </ul>
          <SimuladorElemento />
        </div>
      </section>

      <div className="gp-divider"></div>

      {/* ══ Especializações ══ */}
      <section className="gp-section" id="gp-especializacoes">
        <SectionHead icon="ti-award" titulo="Especializações">
          A escola que forma o personagem: Academia, Guilda, Trilha, Colégio, Confraria ou Ordem — e o título que ela confere.
        </SectionHead>
        <Essencial itens={[
          <>A especialização é escolhida <b>já na criação</b>, junto com a profissão, e depois de salva <b>não muda</b>.</>,
          <>Ela abre a prateleira de <b>magias e técnicas avançadas</b> — as que exigem aquela escola, não só a profissão.</>,
          <>Guerreiro e Ladino especializados ganham <b>1 ponto de ação extra</b> por rodada, só para técnicas.</>,
        ]} />
        <div className="gp-esp-grid">
          {Object.entries(especializacoes).map(([prof, lista]) => (
            <div key={prof} className={'gp-esp-card' + (lista.length > 6 ? ' gp-esp-card-larga' : '')}>
              <div className="gp-esp-prof">{prof}</div>
              <ul>
                {lista.map((e) => (
                  <li key={e.esp}><span>{e.esp}</span><b>{e.titulo}</b></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Callout icon="ti-route">
          Deixar a especialização em branco é permitido, e ela pode ser escolhida depois —
          mas só uma vez. Antes de decidir, abra o catálogo de Magias ou Técnicas e veja o
          que cada escola libera: é ali que mora a diferença entre dois magos do mesmo estágio.
        </Callout>
      </section>

      <div className="gp-divider"></div>

      {/* ══ Atributos ══ */}
      <section className="gp-section" id="gp-atributos">
        <SectionHead icon="ti-chart-radar" titulo="Atributos">
          Sete atributos alimentam todas as estatísticas da ficha. Entender a ligação antes de gastar é o que separa uma ficha sólida de uma cheia de surpresas.
        </SectionHead>
        <Essencial itens={[
          <>No estágio 1 você tem <b>15 pontos</b> (mais os pontos livres da raça), e ganha <b>+1 a cada 2 estágios</b>.</>,
          <>O custo cresce em curva: +1 custa 1, +2 custa 3, +3 custa 6, +4 custa 10.</>,
          <>Atributo negativo <b>devolve</b> pontos, e nas estatísticas conta como zero.</>,
        ]} />

        <h3 className="gp-h3">Os sete atributos e o que eles alimentam</h3>
        <div className="gp-attr-grid">
          {[
            { icon: 'ti-sword',          nome: 'Força',     feeds: ['Dano das armas'],
              dica: 'Soma direto no dano de toda arma. Essencial para quem luta; um conjurador pode vendê-la em −2 e recuperar 1 ponto.' },
            { icon: 'ti-heart',          nome: 'Físico',    feeds: ['Energia Física', 'Resistência Física'],
              dica: 'Quanto mais alto, mais pancada você aguenta e melhor resiste a venenos e efeitos físicos.' },
            { icon: 'ti-run',            nome: 'Agilidade', feeds: ['Velocidade', 'Defesa'],
              dica: 'Defesa mais alta tira colunas do ataque inimigo. Ladinos e Rastreadores vivem aqui.' },
            { icon: 'ti-eye',            nome: 'Percepção', feeds: ['Energia Heroica', 'Magia do Rastreador'],
              dica: 'O atributo mais transversal: cada ponto soma Energia Heroica para qualquer profissão.' },
            { icon: 'ti-brain',          nome: 'Intelecto', feeds: ['Magia do Mago', 'Conhecimento'],
              dica: 'O atributo que rege a magia do Mago e as habilidades de estudo.' },
            { icon: 'ti-sparkles',       nome: 'Aura',      feeds: ['Resistência Mágica', 'Karma', 'Magia do Sacerdote'],
              dica: 'Com Aura abaixo de 1 o Karma é zero — e sem Karma nenhuma magia sai. Conjurador nunca a deixa cair.' },
            { icon: 'ti-message-circle', nome: 'Carisma',   feeds: ['Magia do Bardo', 'Influência'],
              dica: 'Rege a magia do Bardo e as habilidades de negociação e liderança.' },
          ].map((a) => (
            <div key={a.nome} className="gp-attr-card">
              <div className="gp-attr-header">
                <i className={`ti ${a.icon} gp-attr-icon`} aria-hidden="true"></i>
                <span className="gp-attr-nome">{a.nome}</span>
              </div>
              <div className="gp-attr-feeds">
                {a.feeds.map((f) => <span key={f} className="gp-attr-feed-tag">{f}</span>)}
              </div>
              <div className="gp-attr-dica">{a.dica}</div>
            </div>
          ))}
        </div>

        <h3 className="gp-h3 gp-h3-sep">Como os atributos viram estatísticas</h3>
        <div className="gp-formula-cards">
          {[
            { stat: 'Peso',               abbr: 'PS', icon: 'ti-weight',        formula: 'altura² × 28   (Anão: × 40)',          desc: 'A altura vem da raça e do gênero. Anões pesam mais para o tamanho que têm.' },
            { stat: 'Energia Física',     abbr: 'EF', icon: 'ti-heart',         formula: '⌊peso ÷ 5⌋ + Físico',                  desc: 'O corpo. Chegar a 0 derruba; a −15, o personagem morre.' },
            { stat: 'Energia Heroica',    abbr: 'EH', icon: 'ti-shield-half',   formula: 'Percepção + base da profissão × estágio', desc: 'Coragem e sorte: a primeira camada que o dano consome. Zerada, o personagem desmaia.' },
            { stat: 'Resistência Física', abbr: 'RF', icon: 'ti-shield',        formula: 'estágio + Físico',                     desc: 'Contra venenos, doenças e efeitos físicos.' },
            { stat: 'Resistência Mágica', abbr: 'RM', icon: 'ti-wand',          formula: 'estágio + Aura',                       desc: 'Contra magias que pedem teste de resistência — e entra no Karma.' },
            { stat: 'Karma',              abbr: 'KA', icon: 'ti-sparkles',      formula: '(RM + 1) × (Aura + 1)',                desc: 'O combustível das magias. Zero se a Aura for menor que 1.' },
            { stat: 'Velocidade',         abbr: 'VB', icon: 'ti-run',           formula: '⌊altura × 11⌋ + Agilidade',            desc: 'Ordem de iniciativa e alcance de movimento. Vento forte reduz; acima de 30, uma ação a mais por rodada.' },
            { stat: 'Defesa',             abbr: 'DF', icon: 'ti-shield-check',  formula: 'tipo do peitoral + defesa das peças + Agilidade', desc: 'Escrita como “L2”, “M7”: a letra é o tipo da armadura (Leve, Média, Pesada), o número tira colunas do ataque.' },
            { stat: 'Absorção',           abbr: 'AR', icon: 'ti-shield-lock',   formula: 'soma das absorções das peças',         desc: 'O limiar da armadura: golpe até esse valor é bloqueado inteiro (veja em Armas).' },
          ].map((f) => (
            <div key={f.abbr} className="gp-formula-row">
              <div className="gp-formula-abbr"><i className={`ti ${f.icon}`} aria-hidden="true" />{f.abbr}</div>
              <div className="gp-formula-eq">
                <span className="gp-formula-stat">{f.stat}</span>
                <span className="gp-formula-expr">= {f.formula}</span>
              </div>
              <div className="gp-formula-desc">{f.desc}</div>
            </div>
          ))}
        </div>

        <h3 className="gp-h3 gp-h3-sep">Quanto custa cada nível de atributo</h3>
        <div className="gp-custo-grid">
          {[
            { val: '−2', custo: 'devolve 1 ponto', cls: 'gp-custo-devolver' },
            { val: '−1', custo: 'devolve 0,5 ponto', cls: 'gp-custo-devolver' },
            { val: '0',  custo: 'grátis', cls: 'gp-custo-neutro' },
            { val: '+1', custo: '1 ponto', cls: 'gp-custo-normal' },
            { val: '+2', custo: '3 pontos', cls: 'gp-custo-medio' },
            { val: '+3', custo: '6 pontos', cls: 'gp-custo-alto' },
            { val: '+4', custo: '10 pontos', cls: 'gp-custo-max' },
            { val: '+5', custo: '15 pontos', cls: 'gp-custo-max' },
            { val: '+6', custo: '21 pontos', cls: 'gp-custo-max' },
          ].map((c) => (
            <div key={c.val} className={`gp-custo-card ${c.cls}`}>
              <div className="gp-custo-val">{c.val}</div>
              <div className="gp-custo-custo">{c.custo}</div>
            </div>
          ))}
        </div>
        <Callout icon="ti-coins">
          <b>A conta é a partir da raça.</b> O Anão já nasce com Físico +2 sem pagar nada;
          subir para +3 custa só o degrau (6 − 3 = 3). Vender um ponto racial também vale:
          devolve o degrau ao pool. <b>Venda o que não usa, compre o que define o personagem.</b>
        </Callout>

        <div className="gp-sub-section">
          <h3 className="gp-h3">Condições do corpo e da mente</h3>
          <p className="gp-p">
            Oito barras acompanham o personagem fora e dentro da batalha. Elas <b>não mexem
            nos atributos</b>: cada uma age direto numa estatística ou num par de grupos de
            habilidade, e o efeito é proporcional ao nível da barra — barra cheia dá o efeito
            máximo, meio da barra dá metade. O relógio e o clima da mesa gastam as barras
            (fome, sede, sono, frio e calor), e as atividades da ficha — dormir, meditar, orar,
            estudar, treinar — recuperam.
          </p>
          <div className="gp-table-wrap">
            <table className="gp-table">
              <thead><tr><th>Condição</th><th>Afeta</th></tr></thead>
              <tbody>
                <tr><td>Saúde</td><td>Energia Física</td></tr>
                <tr><td>Sono</td><td>Velocidade</td></tr>
                <tr><td>Hidratação</td><td>Karma</td></tr>
                <tr><td>Alimentação</td><td>Velocidade e Karma quando baixa; Energia Física (até +3) quando alta</td></tr>
                <tr><td>Sobriedade</td><td>Energia Heroica quando baixa; Karma quando alta</td></tr>
                <tr><td>Sanidade</td><td>Conhecimento sobe, Manobra desce — e vice-versa</td></tr>
                <tr><td>Reputação</td><td>Influência sobe, Subterfúgio desce — e vice-versa</td></tr>
                <tr><td>Temperatura</td><td>Geral sobe, Profissional desce — e vice-versa</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="gp-divider"></div>

      {/* ══ Armas ══ */}
      <section className="gp-section" id="gp-armas">
        <SectionHead icon="ti-sword" titulo="Armas">
          Grupos de armas, técnicas de combate e o caminho de um golpe, do dado até a Energia Física.
        </SectionHead>
        <Essencial itens={[
          <>Cada nível num grupo de armas soma <b>+1 na coluna de ataque</b> de toda arma do grupo.</>,
          <>Dano da arma = <b>dano do catálogo + Força + bônus de Sagração</b> do item.</>,
          <>O dano desce em cascata: <b>Energia Heroica → armadura → Energia Física</b>.</>,
        ]} />

        <h3 className="gp-h3">Grupos de armas</h3>
        <p className="gp-p">
          São 11 grupos. Os leves custam 2 pontos por nível, os médios 3 e os pesados 4 — e
          o orçamento vem da profissão: Guerreiro 12 por estágio, Ladino e Rastreador 10,
          Sacerdote 8, Bardo 6, Mago 4.
        </p>
        <div className="gp-table-wrap">
          <table className="gp-table">
            <thead><tr><th>Grupo</th><th>Custo por nível</th><th>Exemplos</th></tr></thead>
            <tbody>
              {(typeof GRUPOS_ARMAS !== 'undefined' ? GRUPOS_ARMAS : []).map((g) => (
                <tr key={g.sigla}><td>{g.sigla} · {g.nome}</td><td>{g.custo}</td><td>{g.exemplos}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="gp-list">
          <li><b>Concentre.</b> Nível 2 num grupo vale mais que nível 1 em dois: colunas altas na tabela de resolução rendem resultados de dano muito melhores.</li>
          <li><b>Conjuradores</b> escolhem um grupo de emergência — o cajado do Mago (Esmagamento Leve) é o clássico — e aceitam que a arma é o plano B.</li>
        </ul>

        <div className="gp-sub-section">
          <h3 className="gp-h3">Técnicas de combate</h3>
          <p className="gp-p">
            Todas as profissões compram técnicas; muda o orçamento: Guerreiro 7 pontos por
            estágio, Sacerdote e Rastreador 6, Ladino 5, Bardo 4, Mago 2. O teste é
            <b> nível comprado + atributo de ajuste</b>, e técnica sem treino rola com −7.
          </p>
          <ul className="gp-list">
            <li><b>Case a técnica com a arma.</b> Cada técnica lista os grupos de armas (e às vezes as armaduras) com que funciona. Uma técnica de Corte Médio não sai com uma adaga na mão.</li>
            <li><b>Profundidade vence largura.</b> O primeiro nível apaga o −7; depois disso, uma técnica no nível 4 decide mais combates que quatro no nível 1.</li>
            <li><b>Permissão.</b> Como as magias, cada técnica diz quais profissões e especializações podem comprá-la.</li>
          </ul>
        </div>

        <div className="gp-sub-section">
          <h3 className="gp-h3">O caminho de um golpe</h3>
          <ol className="gp-passos">
            <li>
              <b>A coluna de ataque.</b> Cada arma tem três valores de ataque — contra armadura
              Leve, Média e Pesada. Usa-se o do tipo de armadura do alvo, soma-se o nível do
              grupo de armas e subtrai-se o número da Defesa do alvo. Contra um alvo “M7”, uma
              arma com 12 contra Média e grupo no nível 2 ataca na coluna 12 + 2 − 7 = 7.
            </li>
            <li>
              <b>O d20 na tabela de resolução.</b> O dado cruza com a coluna e dá o resultado:
              Falha Crítica e Rotineiro erram; Fácil acerta 25% do dano, Médio 50%, Difícil
              75%, Muito Difícil 100%, Espetacular 125% e Absurdo 150% — com um segundo dado
              na tabela de críticos. 1 no dado é sempre Falha Crítica; 20, sempre Absurdo.
            </li>
            <li>
              <b>Os percentuais.</b> Vantagem elemental e efeitos que aumentam dano entram
              somados, e o total arredonda para cima.
            </li>
            <li>
              <b>A cascata.</b> O dano consome primeiro a Energia Heroica. O que sobra esbarra
              na armadura: golpe até a Absorção é bloqueado inteiro; golpe acima dela também é
              segurado, mas gasta 1 ponto de Resistência da peça mais inteira. Armadura com
              Resistência zerada arrebenta e deixa o dano passar. Só então o golpe chega à
              Energia Física.
            </li>
            <li>
              <b>O resultado.</b> Energia Heroica em 0 desmaia. Energia Física em 0 derruba —
              entre 0 e −14 o personagem está caído, morrendo; em −15, morto. O crítico e
              algumas técnicas pulam a Energia Heroica; outras ignoram a armadura.
            </li>
          </ol>
        </div>

        <div className="gp-sub-section">
          <h3 className="gp-h3">A rodada</h3>
          <ul className="gp-list">
            <li><b>Iniciativa.</b> Age primeiro quem tem mais Velocidade; no empate, o personagem antes da criatura.</li>
            <li><b>Pontos de ação.</b> Todo combatente tem 1 por rodada. Velocidade acima de 30 dá mais 1. Guerreiro e Ladino especializados têm 1 extra só para técnicas.</li>
            <li><b>Escuridão.</b> Sem luz, os ataques perdem colunas: −2 na penumbra, −4 no escuro total e −6 na escuridão mágica — a não ser para quem enxerga no escuro por magia ou técnica.</li>
            <li><b>Bandos.</b> Cinco criaturas iguais formam um bando: um líder e quatro minions, cada minion com ¼ da Energia Física, Heroica e Absorção. Os minions agem logo depois do líder — e fogem se ele cair.</li>
            <li><b>Montarias.</b> Montado, cavaleiro e animal lutam como um só, e a Energia Heroica do animal protege o cavaleiro. Se a montaria cai, o cavaleiro vai junto.</li>
          </ul>
        </div>
      </section>

      <div className="gp-divider"></div>

      {/* ══ Habilidades ══ */}
      <section className="gp-section" id="gp-habilidades">
        <SectionHead icon="ti-tools" titulo="Habilidades">
          Seis grupos — Profissional, Subterfúgio, Manobra, Influência, Conhecimento e Geral —, cada habilidade regida por um atributo.
        </SectionHead>
        <Essencial itens={[
          <>Total = <b>nível comprado + atributo + bônus de origem</b>.</>,
          <>Habilidade sem treino rola com <b>−7</b>: o primeiro nível é a melhor compra da ficha.</>,
          <>O Ladino tem o maior orçamento: <b>20 pontos por estágio</b>.</>,
        ]} />
        <Callout icon="ti-alert-triangle" variant="warn">
          Comprar o primeiro nível transforma o −7 em +1 — <b>um salto de 8 colunas pelo preço
          de um nível</b>. Antes de empilhar níveis na sua especialidade, espalhe nível 1 nas
          habilidades que a sua mesa realmente rola.
        </Callout>
        <ul className="gp-list">
          <li><b>Orçamento por estágio:</b> Ladino 20, Rastreador 16, Guerreiro e Bardo 14, Sacerdote e Mago 10. Cada habilidade tem o seu custo por nível.</li>
          <li><b>Aproveite a origem.</b> Os +2 (ou +4) de raça e reino somam de graça. Construir em cima deles rende os maiores totais da mesa.</li>
          <li><b>Quatro habilidades abrem aprimoramentos</b> conforme o total cresce: Idioma, um idioma novo a cada 10; Religião, um culto a cada 5; Arte e Sabedoria, uma escolha a cada 7.</li>
          <li><b>As condições pesam.</b> Sanidade, Reputação e Temperatura multiplicam pares de grupos de habilidade (veja em Atributos).</li>
        </ul>
      </section>

      <div className="gp-divider"></div>

      {/* ══ Magias ══ */}
      <section className="gp-section" id="gp-magias">
        <SectionHead icon="ti-wand" titulo="Magias">
          Quatro profissões conjuram, cada uma regida por um atributo. Magia se aprende em passos e se paga em Karma.
        </SectionHead>
        <Essencial itens={[
          <>Cada passo abre um nível ímpar: <b>1, 3, 5, 7 e 9</b>.</>,
          <>Aprender custa <b>nível × custo da magia</b>; conjurar gasta <b>Karma igual ao nível</b>.</>,
          <>Magias Perdidas e Ancestrais não se compram: chegam em <b>pergaminhos</b>.</>,
        ]} />
        <div className="gp-table-wrap">
          <table className="gp-table">
            <thead><tr><th>Profissão</th><th>Pontos por estágio</th><th>Atributo regente</th><th>Estilo natural</th></tr></thead>
            <tbody>
              <tr><td>Mago</td><td>14</td><td>Intelecto</td><td>Grimório largo e profundo</td></tr>
              <tr><td>Sacerdote</td><td>10</td><td>Aura</td><td>A Aura alimenta a magia e o Karma ao mesmo tempo</td></tr>
              <tr><td>Bardo</td><td>8</td><td>Carisma</td><td>Poucas magias, bem escolhidas, de apoio e influência</td></tr>
              <tr><td>Rastreador</td><td>8</td><td>Percepção</td><td>A Percepção rende dobrado: magia e Energia Heroica</td></tr>
            </tbody>
          </table>
        </div>
        <ul className="gp-list">
          <li><b>Passos.</b> O 1º passo é o nível 1, o 2º é o nível 3, e assim até o 5º, nível 9. Uma magia no nível 5 com custo 2 custa 10 pontos para aprender e gasta 5 de Karma por conjuração.</li>
          <li><b>Básicas e avançadas.</b> Magia básica é da profissão; avançada exige a especialização (um Colégio, uma Ordem, uma Trilha, uma Confraria).</li>
          <li><b>Raridade.</b> Magias Perdidas e Ancestrais chegam em pergaminhos — de tempos em tempos um aparece na loja da história. Ao usar o pergaminho, o personagem aprende aquele passo para sempre.</li>
          <li><b>Itens necessários.</b> Rituais pedem componentes: a magia lista os itens e as quantidades, e o Mestre confere se o personagem os tem antes da conjuração.</li>
          <li><b>Itens mágicos.</b> Anéis, cajados e armas que concedem magia conjuram de graça, sem Karma, no nível do item — desde que estejam em uso (empunhados ou vestidos).</li>
          <li><b>Elemento.</b> A magia leva o próprio elemento: um Mago (Escuridão) que lança uma magia de Fogo num alvo de Ar ganha os 10% do Fogo.</li>
          <li><b>Resistência.</b> Algumas magias pedem teste de Resistência Mágica ou Física do alvo: a força da magia contra a resistência dele decide se o efeito pega.</li>
        </ul>
        <Callout icon="ti-flame">
          Abra o leque no nível 1 (cada uma custa 1 de Karma) e leve uma magia-assinatura ao
          nível 5, o ponto doce entre poder e fôlego. Níveis 7 e 9 são finalizações, não
          rotina. E <b>Aura ≥ 1 é inegociável</b>: com Aura zero, o Karma é zero para qualquer
          conjurador — inclusive para o Mago, que rege por Intelecto mas lança com Karma.
        </Callout>
      </section>

      <div className="gp-divider"></div>

      {/* ══ Arquétipos ══ */}
      <section className="gp-section" id="gp-arquetipos">
        <SectionHead icon="ti-chess-knight" titulo="Arquétipos">
          Nenhuma combinação é proibida, mas estas seis nascem das sinergias que os números confirmam.
        </SectionHead>
        <div className="gp-build-grid">
          {[
            { label: 'A Muralha', sub: 'Meio-Orc ou Anão · Guerreiro · Fogo', tag: 'Masculino', tagClass: 'gp-tag-masc',
              text: 'A maior Energia Física e Resistência Física do jogo: o porte da raça engorda a EF e o Físico +2 sobe a RF. A penalidade masculina na Energia Heroica pesa pouco sobre a base 14 do Guerreiro. Complete com Percepção e um grupo de armas pesadas.' },
            { label: 'A Voz dos Deuses', sub: 'Elfo-Dourado · Sacerdote · Luz', tag: 'Feminino', tagClass: 'gp-tag-fem',
              text: 'Aura +2 rege a magia divina e enche o Karma ao mesmo tempo. A Energia Heroica feminina segura a sacerdotisa de pé para curar e proteger — e a Luz rende 15% contra criaturas da Escuridão.' },
            { label: 'A Sombra', sub: 'Elfo-Sombrio ou Pequenino · Ladino · Ar', tag: 'Neutro', tagClass: 'gp-tag-neut',
              text: 'Agilidade alta empilha Velocidade e Defesa: difícil de acertar e o primeiro a agir. Os 20 pontos de habilidade por estágio cobrem furtividade e o resto. Armas leves e técnicas afinadas com elas fazem o dano.' },
            { label: 'O Arquivista das Sombras', sub: 'Elfo-Dourado · Mago · Escuridão', tag: 'Feminino', tagClass: 'gp-tag-fem',
              text: 'Intelecto +1 fortalece as magias e Aura +2 sustenta o Karma para conjurá-las. A Energia Heroica feminina compensa um pouco a fragilidade do Mago; a Escuridão rende 5% contra os quatro elementos da natureza.' },
            { label: 'O Olho da Floresta', sub: 'Elfo-Florestal · Rastreador · Terra', tag: 'Feminino', tagClass: 'gp-tag-fem',
              text: 'Percepção +2 é o atributo que mais rende ao Rastreador: aumenta a Energia Heroica e rege a magia dele ao mesmo tempo. Complete com arcos (Perfuração Média) e habilidades de exploração e natureza.' },
            { label: 'A Língua de Prata', sub: 'Meio-Elfo · Bardo · Água', tag: 'Neutro', tagClass: 'gp-tag-neut',
              text: 'Carisma +1 fortalece a magia e as habilidades de Influência; Agilidade +1 mantém o Bardo fora de perigo. Guarde pontos para a Aura: sem Karma, as canções não saem.' },
          ].map((b) => (
            <div key={b.label} className="gp-build-card">
              <div className="gp-build-top">
                <span className="gp-build-label">{b.label}</span>
                <span className={`gp-card-tag ${b.tagClass}`}>{b.tag}</span>
              </div>
              <div className="gp-build-sub">{b.sub}</div>
              <div className="gp-build-text">{b.text}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="gp-divider"></div>

      {/* ══ Resumo ══ */}
      <section className="gp-section" id="gp-resumo">
        <SectionHead icon="ti-list-check" titulo="Resumo">
          Toda escolha é uma troca — aqui está o mapa.
        </SectionHead>
        <div className="gp-table-wrap">
          <table className="gp-table">
            <thead><tr><th>Escolha</th><th>Entrega</th><th>Custa</th></tr></thead>
            <tbody>
              <tr><td>Feminino</td><td>+10% de Energia Heroica por estágio</td><td>−10% de altura e peso</td></tr>
              <tr><td>Masculino</td><td>+10% de altura e peso: mais Energia Física e Velocidade</td><td>−10% de Energia Heroica por estágio</td></tr>
              <tr><td>Raças robustas</td><td>Anão e Meio-Orc: Energia Física alta de nascença</td><td>Aura, Carisma e (no Anão) Agilidade em baixa</td></tr>
              <tr><td>Raças élficas</td><td>Aura, Intelecto e Percepção aflorados</td><td>Físico −1 em todas</td></tr>
              <tr><td>Humano</td><td>+4 pontos livres e nenhum atributo negativo</td><td>Nenhum talento de nascença</td></tr>
              <tr><td>Guerreiro</td><td>Maior Energia Heroica, mais armas e técnicas</td><td>Nenhuma magia</td></tr>
              <tr><td>Mago</td><td>14 pontos de magia por estágio</td><td>A menor Energia Heroica do jogo</td></tr>
              <tr><td>Ladino</td><td>20 pontos de habilidade por estágio</td><td>Energia Heroica mediana: sobrevive desviando</td></tr>
              <tr><td>Especialização</td><td>Magias e técnicas avançadas; +1 ação de técnica para Guerreiro e Ladino</td><td>Uma escola só, para sempre</td></tr>
              <tr><td>Atributo em +2</td><td>+2 em tudo que ele alimenta</td><td>3 pontos — o triplo do +1</td></tr>
              <tr><td>Atributo em −1 ou −2</td><td>Devolve 0,5 ou 1 ponto</td><td>Fraqueza permanente (conta como 0 nas estatísticas)</td></tr>
              <tr><td>Grupo de armas pesado</td><td>O maior dano bruto</td><td>4 pontos por nível</td></tr>
              <tr><td>1º nível de habilidade ou técnica</td><td>Apaga o −7: salto de 8 colunas</td><td>O preço de um nível</td></tr>
              <tr><td>Magia no nível 9</td><td>Efeito devastador</td><td>9 de Karma por conjuração</td></tr>
              <tr><td>Vantagem elemental</td><td>+5% a +15% de dano contra o elemento certo</td><td>Nada — escolha o alvo com intenção</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <GuiaFooter />
    </div>
  );
}

Object.assign(window, { GuiaPersonagem });
