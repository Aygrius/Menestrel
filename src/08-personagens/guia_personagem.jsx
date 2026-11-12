/* ============================================================
   GUIA DE CRIAÇÃO DE PERSONAGEM (AJUDA) — src/08-personagens/guia_personagem.jsx
   ============================================================
   AS CARTAS DA REGRA (11/11/2026). Usuário: "A página de ajuda, ou 'guia
   para criação de personagem' precisa passar por uma atualização de estilo,
   e atualização de regras. Vamos usar o impeccable para transformar essa
   página em uma apresentação mais didática. Neste guia não precisamos
   mostrar o clima." Estrutura escolhida na página de decisão do impeccable:
   cada regra é uma carta — na frente, a regra numa frase e os números que
   importam; no verso, o porquê, o exemplo e a tabela. Contrato da direção em
   .impeccable/surfaces/src-08-personagens-guia-personagem-jsx.md.

   As regras foram conferidas contra o código em 11/11/2026 (pontos de magia
   e técnica por base + Intelecto, aprender só na primeira compra, condições
   de 0 a 100 em degraus, armadura que desconta, bandos pela multidão, carga,
   iniciativa extra no d10, livro inicial…). Sempre que dá, o número vem do
   código, ao vivo:
     GAME_DATA.racas / .profissoes / .especializacoes, bonusPontosRaca,
     pontosMagiasPorEstagio, pontosTecnicasPorEstagio,
     GRUPOS_ARMAS / GRUPOS_ARMAS_POR_PROFISSAO, bonusElemental (01-core).
   Ao mudar uma regra lá, conferir aqui o texto do verso.

   Sem barra vertical na página: a carta ocupa a altura útil e o verso rola
   por dentro quando a tabela é longa. Anterior e Próximo atravessam os
   capítulos; ← e → também. O clima não aparece no guia (10-shell).

   Exposto via: window.GuiaPersonagem (AdminConsole, seção guia_personagem)
   Estilo: seção "AS CARTAS DA REGRA" do index.css (classes gc-*), com as
   peças do sistema (.mn-passe, .mn-celula, .mn-rotulo, .mn-quadro).
   i18n: PT-only — bilinguar sob pedido explícito.
   ============================================================ */

/* ============================== [08.5] Peças ============================== */

/* Casca do SelectPill (25/09/2026): o único dropdown do sistema. */
function GpSelect({ value, options, onChange, minWidth = 200 }) {
  return (
    <div style={{ minWidth }}>
      <SelectPill options={options} value={value} onChange={onChange} />
    </div>
  );
}

const GP_ELEMENTOS = [
  { v: 'Fogo', icon: 'ti-flame' }, { v: 'Ar', icon: 'ti-wind' },
  { v: 'Terra', icon: 'ti-mountain' }, { v: 'Água', icon: 'ti-droplet' },
  { v: 'Luz', icon: 'ti-sun' }, { v: 'Escuridão', icon: 'ti-moon' },
];
const GP_PROFISSOES = ['Guerreiro', 'Ladino', 'Rastreador', 'Bardo', 'Sacerdote', 'Mago'];
const GP_ELEMENTO_DA = { Guerreiro: 'Fogo', Ladino: 'Ar', Rastreador: 'Terra', Bardo: 'Água', Sacerdote: 'Luz', Mago: 'Escuridão' };
const GP_ATR_COLS = [
  ['forca', 'For'], ['fisico', 'Fís'], ['agilidade', 'Agi'], ['percepcao', 'Per'],
  ['intelecto', 'Int'], ['aura', 'Aur'], ['carisma', 'Car'],
];
const GP_RACAS = ['Humano', 'Meio-Elfo', 'Meio-Orc', 'Anão', 'Elfo-Florestal', 'Elfo-Dourado', 'Elfo-Sombrio', 'Pequenino'];

const gd = () => (typeof GAME_DATA !== 'undefined' ? GAME_DATA : {});
const fmtMod = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
const fmtNum = (n) => String(n).replace('.', ',');
const ehBaseDe = (p) => ((gd().profissoes || {})[p] || {}).ehBase || 0;
const habDe = (p) => ((gd().profissoes || {})[p] || {}).habilidadesPontos || 0;
const armasDe = (p) => ((typeof GRUPOS_ARMAS_POR_PROFISSAO !== 'undefined' ? GRUPOS_ARMAS_POR_PROFISSAO : {})[p] || {}).pontosPorEstagio || 0;
const magiaBaseDe = (p) => (typeof pontosMagiasPorEstagio === 'function' ? pontosMagiasPorEstagio(p, 0, 0) : 0);
const tecBaseDe = (p) => (typeof pontosTecnicasPorEstagio === 'function' ? pontosTecnicasPorEstagio(p, 0) : 0);

/* ============================== [08.6] Simuladores ============================== */
/* O RESULTADO NO LUGAR DO PASSE (11/11/2026, usuário: o quadro "feminino,
   neutro, masculino" fica abaixo da frase da carta). A carta com simulador
   (carta.sim) não tem passe próprio: o simulador desenha o resultado logo
   abaixo da frase, como o passe das outras cartas, e depois a explicação
   (children) com os campos que o alimentam. */
function SimCarta({ valores, campos, children }) {
  return (<>
    <div className="mn-passe gc-passe gc-sim-passe">
      {valores.map(([r, v]) => (
        <div key={r} className="mn-celula"><span className="mn-rotulo">{r}</span><span className="mn-celula-valor">{v}</span></div>
      ))}
    </div>
    <div className="gc-porque">
      {children}
      <div className="gc-sim"><div className="gc-sim-campos">{campos}</div></div>
    </div>
  </>);
}

// Fórmula real (calcularFicha): EH = Percepção + ehBase × estágio.
// Masculino: floor(ehBase × 0,9). Feminino: floor(ehBase × 1,1). Neutro: base.
function SimuladorEH({ children }) {
  const [prof, setProf] = useState('Guerreiro');
  const [est, setEst] = useState(5);
  const [perc, setPerc] = useState(1);
  const base = ehBaseDe(prof) || 6;
  return (
    <SimCarta valores={[
      ['Feminino', perc + Math.floor(base * 1.1) * est],
      ['Neutro', perc + base * est],
      ['Masculino', perc + Math.floor(base * 0.9) * est],
    ]} campos={<>
      <label className="gc-sim-campo"><span className="mn-rotulo">Profissão</span>
        <GpSelect value={prof} onChange={setProf} minWidth={170}
          options={GP_PROFISSOES.map((p) => ({ value: p, label: p }))} /></label>
      <label className="gc-sim-campo"><span className="mn-rotulo">Estágio</span>
        <GpSelect value={est} onChange={setEst} minWidth={120}
          options={[1, 3, 5, 10, 20].map((v) => ({ value: v, label: `Estágio ${v}` }))} /></label>
      <label className="gc-sim-campo"><span className="mn-rotulo">Percepção</span>
        <GpSelect value={perc} onChange={setPerc} minWidth={90}
          options={[0, 1, 2, 3].map((v) => ({ value: v, label: `+${v}` }))} /></label>
    </>}>{children}</SimCarta>
  );
}

/* A Energia Física pelas mesmas funções da ficha (altura e peso, 01-core):
   EF = ⌊peso ÷ 5⌋ + Físico; o peso sai da altura da raça, que o gênero muda
   em 10% (Feminino × 0,9, Masculino × 1,1). */
function SimuladorEF({ children }) {
  const [raca, setRaca] = useState('Humano');
  const [fis, setFis] = useState(1);
  const efDe = (g) => {
    const p = typeof peso === 'function' ? peso(raca, g) : 0;
    return Math.floor(p / 5) + Math.max(0, fis);
  };
  return (
    <SimCarta valores={[['Feminino', efDe('Feminino')], ['Neutro', efDe('Neutro')], ['Masculino', efDe('Masculino')]]}
      campos={<>
        <label className="gc-sim-campo"><span className="mn-rotulo">Raça</span>
          <GpSelect value={raca} onChange={setRaca} minWidth={170}
            options={GP_RACAS.map((r) => ({ value: r, label: r }))} /></label>
        <label className="gc-sim-campo"><span className="mn-rotulo">Físico</span>
          <GpSelect value={fis} onChange={setFis} minWidth={90}
            options={[0, 1, 2, 3].map((v) => ({ value: v, label: `+${v}` }))} /></label>
      </>}>{children}</SimCarta>
  );
}

/* Quanto um golpe de um elemento rende contra o outro — a MESMA função que o
   motor de batalha usa (bonusElemental), para a ajuda nunca discordar dele. */
function SimuladorElemento() {
  const [golpe, setGolpe] = useState('Fogo');
  const [alvo, setAlvo] = useState('Ar');
  const pct = typeof bonusElemental === 'function' ? bonusElemental(golpe, alvo) : 0;
  const opts = GP_ELEMENTOS.map((e) => ({ value: e.v, label: e.v }));
  return (
    <div className="gc-sim">
      <div className="gc-sim-campos">
        <label className="gc-sim-campo"><span className="mn-rotulo">Golpe de</span>
          <GpSelect value={golpe} onChange={setGolpe} minWidth={140} options={opts} /></label>
        <label className="gc-sim-campo"><span className="mn-rotulo">Contra</span>
          <GpSelect value={alvo} onChange={setAlvo} minWidth={140} options={opts} /></label>
      </div>
      <p className="gc-sim-texto">
        {pct > 0
          ? <>{golpe} tem vantagem sobre {alvo}: <b>+{pct}%</b>, e um golpe de 20 vira {Math.ceil(20 * (1 + pct / 100))}.</>
          : <>{golpe} não tem vantagem sobre {alvo}: <b>0%</b>, o dano fica como está.</>}
      </p>
    </div>
  );
}

/* ============================== [08.7] As cartas ============================== */
/* Cada carta: { id, titulo, frase (a regra numa frase), numeros: [[rótulo,
   valor]] (o passe), sim (simulador opcional, que ocupa o lugar do passe),
   verso: () => JSX (a explicação) }.
   A VOZ DO GUIA (11/11/2026). O usuário reescreveu a carta do Gênero e pediu
   "altere todos os cards de acordo com essa mudança": fala-se COM o jogador,
   em frases corridas, como quem explica na mesa. Regras dessa voz:
   - o passe diz o efeito em palavras ("Mais forte"), não em número solto
     ("Força +2", "Corpo +10%");
   - energia heroica, energia física, velocidade, defesa, karma, atributos,
     raças e profissões vão em minúscula no meio da frase — maiúscula só no
     começo da frase, em nome próprio (reino, idioma, magia, Tagmar) e no
     rótulo de botão da interface (Subir nível);
   - nunca o nome por extenso como explicação: diz-se o que a coisa É e o que
     ela FAZ para o personagem;
   - conta só em palavras, sem notação (⌊⌋, "+ Int").
   SEM TABELAS (11/11/2026, usuário: "Ao invés de ter tabelas nos cards,
   porque não criamos um texto didático usando a tabela como fonte?"): o dado
   vira frase — "o anão é bem mais forte", "o ladino é o mais habilidoso".
   Onde o texto lê o catálogo (raças, especializações), a frase é montada a
   partir de GAME_DATA, para nunca discordar dele.
   O capítulo "Começo" saiu: cada informação dele foi para o tópico a que
   pertence (o que fica gravado → Gênero, Raça, Reino, Profissão,
   Especialização; o livro inicial → Profissão; os 15 pontos → Atributos;
   Subir nível → Habilidades). */

/* "a, b e c" */
const gpLista = (itens, conj = 'e') => (itens.length <= 1 ? itens.join('')
  : itens.slice(0, -1).join(', ') + ` ${conj} ` + itens[itens.length - 1]);

/* O que cada atributo acima ou abaixo da média quer dizer, em palavras. */
const GP_TALENTO = {
  forca: ['forte', 'fraco'], fisico: ['resistente', 'frágil'], agilidade: ['ágil', 'lento'],
  percepcao: ['atento', 'distraído'], intelecto: ['inteligente', 'menos inteligente'],
  aura: ['desperto para a magia', 'distante da magia'], carisma: ['carismático', 'menos carismático'],
};
const GP_ORDEM_ATR = ['forca', 'fisico', 'agilidade', 'percepcao', 'intelecto', 'aura', 'carisma'];

/* "O anão é bem mais forte e bem mais resistente, mas bem mais lento…" —
   a frase de cada raça sai dos modificadores do catálogo. */
function fraseDaRaca(r, d, livres) {
  const mods = (d && d.mods) || {};
  const peca = (k, v) => {
    const [bom, ruim] = GP_TALENTO[k];
    const palavra = v > 0 ? bom : ruim;
    const grau = Math.abs(v) >= 2 ? 'bem ' : 'um pouco ';
    return palavra.startsWith('menos ') ? grau + palavra : grau + 'mais ' + palavra;
  };
  const ordenar = (lista) => lista.sort((a, b) => Math.abs(mods[b]) - Math.abs(mods[a]) || GP_ORDEM_ATR.indexOf(a) - GP_ORDEM_ATR.indexOf(b));
  const bons = ordenar(GP_ORDEM_ATR.filter((k) => (mods[k] || 0) > 0)).map((k) => peca(k, mods[k]));
  const ruins = ordenar(GP_ORDEM_ATR.filter((k) => (mods[k] || 0) < 0)).map((k) => peca(k, mods[k]));
  const nome = r.toLowerCase();
  let t;
  if (!bons.length && !ruins.length) t = `é a média em tudo: não nasce com talentos nem fraquezas`;
  else if (!ruins.length) t = `é ${gpLista(bons)}`;
  else if (!bons.length) t = `é ${gpLista(ruins)}`;
  else t = `é ${gpLista(bons)}, mas ${gpLista(ruins)}`;
  const pts = livres > 0 ? `, e recebe ${fmtNum(livres)} ${livres === 1 ? 'ponto livre' : 'pontos livres'}` : '';
  return <p key={r}>O <b>{nome}</b> {t}. Mede cerca de {fmtNum(d ? d.altura : 0)} m{pts}.</p>;
}

function montarCapitulos() {
  const racas = gd().racas || {};
  const bonus = (r) => (typeof bonusPontosRaca === 'function' ? bonusPontosRaca(r) : 0);
  const esp = gd().especializacoes || {};
  return [
    /* O texto do Gênero é o do usuário (11/11/2026), palavra por palavra onde
       a regra permite. */
    { id: 'genero', icone: 'ti-gender-bigender', titulo: 'Gênero', cartas: [
      { id: 'escolha', titulo: 'Escolha seu gênero', imagem: '/guia/genero.jpg', frase: 'O gênero do seu personagem muda duas coisas: seu tamanho e sua energia heroica. Nenhuma escolha é necessariamente melhor que a outra; depende do seu objetivo.',
        numeros: [['Feminino', 'Mais corajosa'], ['Masculino', 'Mais alto'], ['Neutro', 'Equilibrado']],
        verso: () => (<>
          <p>A <b>energia heroica (EH)</b> é o fôlego, a sorte e os seus reflexos. Quando o adversário ataca você, a primeira energia atingida é a energia heroica.</p>
          <p>A <b>energia física (EF)</b> é a vida, o corpo e a sua saúde. Quanto mais alto e pesado, maior é a sua energia física. Além disso, a sua altura também influencia na sua velocidade.</p>
          <p>A <b>velocidade (VB)</b> é a sua iniciativa em combate, e é ela que diz quantas vezes você pode agir em uma rodada.</p>
          <p>A <b>mulher</b> tem 10% menos altura e peso que a média da sua raça, mas ganha 10% a mais de energia heroica a cada estágio. O <b>homem</b> é o contrário: tem 10% mais altura e peso, mas ganha 10% a menos de energia heroica. E quem escolhe <b>neutro</b> fica com a altura e o peso médios da raça e com a energia heroica da profissão, sem mudança.</p>
        </>) },
      { id: 'eh', titulo: 'Quanto de energia heroica?', frase: 'A diferença parece pequena no começo, mas conforme o estágio aumenta, pode representar uma grande mudança na estratégia de uma luta.',
        sim: SimuladorEH,
        verso: () => (<>
          <p>A ficha calcula assim: a energia heroica da profissão é multiplicada pelo estágio, e a sua percepção é somada ao resultado. Cada profissão ganha uma quantidade fixa por estágio — por exemplo, o guerreiro ganha 14 e o mago ganha 6 —, influenciada pelo gênero.</p>
        </>) },
      { id: 'ef', titulo: 'Quanto de energia física?', frase: 'A diferença de tamanho parece pequena, mas decide quanto dano o seu corpo aguenta antes de cair.',
        sim: SimuladorEF,
        verso: () => (<>
          <p>A ficha calcula assim: o seu peso é dividido por 5, e o seu físico é somado ao resultado. O peso vem da altura da sua raça, que o gênero aumenta ou diminui em 10%.</p>
        </>) },
    ] },
    { id: 'raca', icone: 'ti-users', titulo: 'Raça', cartas: [
      { id: 'mods', titulo: 'Escolha sua raça', frase: 'Cada raça já nasce com os seus talentos e as suas fraquezas. Esse ponto de partida vem de graça: você não gasta nada por ele.',
        numeros: [['Anão', 'Mais forte'], ['Elfo-dourado', 'Mais desperto para a magia']],
        verso: () => (<>
          <p>São sete atributos, e juntos eles dizem quem o seu personagem é. A <b>força</b> é o músculo: aumenta o dano dos seus golpes e o peso que você consegue carregar. O <b>físico</b> é a resistência do corpo, o que faz você aguentar ferimentos, venenos e doenças. A <b>agilidade</b> são os reflexos, que deixam você mais rápido e mais difícil de acertar. A <b>percepção</b> são os sentidos atentos, e é dela que vem parte da sua energia heroica. O <b>intelecto</b> é a inteligência, que ajuda você a aprender magias e técnicas. A <b>aura</b> é a sua ligação com a magia: sem ela, não há karma para lançar feitiços. E o <b>carisma</b> é a presença, o jeito de convencer e inspirar as pessoas.</p>
          <p>Uma pessoa comum fica na média em todos eles. Veja onde cada raça nasce acima ou abaixo disso:</p>
          {GP_RACAS.map((r) => fraseDaRaca(r, racas[r], bonus(r)))}
          <p>A altura define o seu peso, a sua energia física e a sua velocidade. Depois de salvo, a raça não muda mais.</p>
        </>) },
      { id: 'livres', titulo: 'Por que algumas raças ganham pontos livres?', frase: 'Para nenhuma raça sair na frente. Quem nasce com menos talentos recebe a diferença em pontos, para gastar onde você quiser.',
        numeros: [['Humano', 'Ganha mais pontos para gastar'], ['Anão e meio-orc', 'Já nascem com tudo pago']],
        verso: () => (<p>Os talentos com que o anão e o meio-orc nascem valem 4 pontos de atributo; os do humano, nenhum. Por isso o humano recebe {fmtNum(bonus('Humano'))} pontos livres, e cada raça ganha o que falta para chegar a 4. No fim, a raça decide <i>onde</i> o seu personagem é forte, e não <i>quanto</i> ele vale.</p>) },
      { id: 'idioma', titulo: 'Quais idiomas você fala?', frase: 'Você já começa falando o Malês, a língua comum de todos, mais a língua da sua raça e a do seu reino — sem pagar nada.',
        numeros: [['Para começar', 'Até três línguas'], ['Depois', 'Uma nova a cada 10 em idioma']],
        verso: () => (<p>O Élfico, o Khuzdul, o Kurng e o Lanta vêm da raça; o Runa (Portis), o Abadrim (Abadom), o Lunês (Luna) e outros vêm do reino. Alguns reinos não têm língua própria. Se quiser aprender mais, é pela habilidade idioma: a cada 10 pontos nela, você ganha uma língua nova.</p>) },
    ] },
    { id: 'reino', icone: 'ti-crown', titulo: 'Reino', cartas: [
      { id: 'vantagens', titulo: 'O que o reino muda?', frase: 'O lugar onde você cresceu, assim como a sua raça, deixa algumas habilidades mais fáceis e outras mais difíceis. Os dois não somam entre si.',
        numeros: [['Habilidade favorecida', 'Fica 2 pontos mais fácil'], ['Habilidade prejudicada', 'Fica 2 pontos mais difícil']],
        verso: () => (<>
          <p>As <b>habilidades</b> são tudo o que o seu personagem sabe fazer fora da luta: escalar, negociar, rastrear, curar e muito mais. No catálogo, cada uma diz quais raças e reinos a favorecem ou atrapalham, e esse bônus entra sozinho, sem custar nada.</p>
          <p>Se a sua raça e o seu reino favorecem a mesma habilidade, ela continua 2 pontos mais fácil — não vira 4.</p>
          <p>Depois de salvo, o reino não muda mais.</p>
        </>) },
      { id: 'caracterizacao', titulo: 'Qualidades e defeitos', frase: 'Você começa com 4 pontos para dar personalidade ao seu personagem. Cada qualidade custa 2, e cada defeito devolve 2.',
        numeros: [['Para começar', '4 pontos'], ['Qualidade', 'Custa 2'], ['Defeito', 'Devolve 2']],
        verso: () => (<p>Bonito, rico e corajoso são qualidades; feio, pobre e covarde são defeitos. Com dois defeitos, você paga mais duas qualidades — e um defeito bem escolhido rende ótimas cenas na mesa. O passado histórico do seu reino (cada reino tem três para escolher) vem de graça.</p>) },
    ] },
    { id: 'profissao', icone: 'ti-briefcase', titulo: 'Profissão', cartas: [
      { id: 'reservatorios', titulo: 'Escolha sua profissão', frase: 'A profissão é o ofício do seu personagem, e é ela que decide no que ele melhora a cada estágio.',
        numeros: [['Guerreiro', 'Mais resistente'], ['Ladino', 'Mais habilidoso'], ['Mago', 'Mais estudioso']],
        verso: () => (<>
          <p>A cada estágio, a profissão dá a você energia heroica e pontos para gastar em quatro coisas: habilidades, armas, técnicas (as manobras de combate) e magias. Nas técnicas e nas magias, o seu intelecto ainda soma mais pontos.</p>
          <p>O <b>guerreiro</b> é o mais resistente e o que mais treina para a luta: a cada estágio, ganha {ehBaseDe('Guerreiro')} de energia heroica, {armasDe('Guerreiro')} pontos de armas e {tecBaseDe('Guerreiro')} + intelecto de técnica. Em troca, quase não estuda magia: {magiaBaseDe('Guerreiro')} + intelecto. O seu elemento é o fogo.</p>
          <p>O <b>ladino</b> é o mais habilidoso: ganha {habDe('Ladino')} pontos de habilidade por estágio, além de {armasDe('Ladino')} de armas e {tecBaseDe('Ladino')} + intelecto de técnica. A energia heroica é média ({ehBaseDe('Ladino')}) e a magia, quase nenhuma ({magiaBaseDe('Ladino')} + intelecto). O seu elemento é o ar.</p>
          <p>O <b>rastreador</b> é o meio-termo da natureza: {ehBaseDe('Rastreador')} de energia heroica, {habDe('Rastreador')} pontos de habilidade, {armasDe('Rastreador')} de armas, {tecBaseDe('Rastreador')} + intelecto de técnica e {magiaBaseDe('Rastreador')} + intelecto de magia. O seu elemento é a terra.</p>
          <p>O <b>bardo</b> estuda tanto quanto o mago — {magiaBaseDe('Bardo')} + intelecto de magia por estágio — e ainda ganha {habDe('Bardo')} pontos de habilidade. Luta pouco: {armasDe('Bardo')} de armas, {tecBaseDe('Bardo')} + intelecto de técnica e {ehBaseDe('Bardo')} de energia heroica. O seu elemento é a água.</p>
          <p>O <b>sacerdote</b> une fé e coragem: {ehBaseDe('Sacerdote')} de energia heroica, {armasDe('Sacerdote')} de armas e {magiaBaseDe('Sacerdote')} + intelecto de magia, mas só {habDe('Sacerdote')} de habilidade e {tecBaseDe('Sacerdote')} + intelecto de técnica. O seu elemento é a luz.</p>
          <p>O <b>mago</b> é o mais estudioso: {magiaBaseDe('Mago')} + intelecto de magia por estágio. Em troca, é o mais frágil — só {ehBaseDe('Mago')} de energia heroica —, quase não treina armas ({armasDe('Mago')}) nem técnicas ({tecBaseDe('Mago')} + intelecto) e ganha {habDe('Mago')} de habilidade. O seu elemento é a escuridão.</p>
          <p>Se o seu intelecto for negativo, ele não tira pontos: conta como zero. Já com a aura negativa, a profissão não dá pontos de magia, e sobram só os do intelecto. Depois de salva, a profissão não muda mais.</p>
        </>) },
      { id: 'livro', titulo: 'Seu primeiro livro', frase: 'Todo personagem começa com o livro da sua profissão, que ensina 10 magias, 10 técnicas e 10 habilidades.',
        numeros: [['Magias', '10'], ['Técnicas', '10'], ['Habilidades', '10']],
        verso: () => (<>
          <p>O livro não ensina de graça: ele abre a porta, e aprender continua custando os seus pontos. Ele também não se gasta — fica no seu inventário para os próximos estágios.</p>
          <p>O sacerdote recebe o livro do seu deus. Sem deus, não há livro.</p>
        </>) },
      { id: 'elemento', titulo: 'Seu elemento', frase: 'Cada profissão pertence a um elemento, e um golpe machuca mais quando o elemento dele vence o elemento do alvo.',
        numeros: [['No ciclo dos quatro', '10% a mais de dano'], ['Luz contra escuridão', '15% a mais'], ['Escuridão contra os quatro', '5% a mais']],
        verso: () => (<>
          <p>O fogo, o ar, a terra e a água formam um ciclo: o fogo vence o ar, o ar vence a terra, a terra vence a água e a água vence o fogo. A luz vence a escuridão, e a escuridão leva uma pequena vantagem sobre os outros quatro.</p>
          <p>Quando você lança uma magia que tem elemento, vale o elemento dela; nos outros golpes, vale o seu. A vantagem só funciona num sentido e não se acumula: conta a maior.</p>
          <SimuladorElemento />
        </>) },
      { id: 'deus', titulo: 'Deus e milagres', frase: 'Milagres são as magias que os deuses concedem a quem tem fé. Sem um deus, ou sendo do elemento escuridão, o seu personagem não aprende nem recebe milagres.',
        numeros: [['Mago', 'Não usa milagres']],
        verso: () => (<p>Qualquer profissão pode aprender qualquer magia, desde que tenha o item que a ensina — menos os milagres, que dependem da fé. O deus é escolhido na criação e não muda depois. O mago, que é do elemento escuridão, não usa milagres; vampiros e lobisomens também não.</p>) },
    ] },
    { id: 'especializacao', icone: 'ti-award', titulo: 'Especialização', cartas: [
      { id: 'escola', titulo: 'Escolha sua especialização', frase: 'A especialização é a escola onde o seu personagem se formou, e é dela que vem o título dele.',
        numeros: [['Quando', 'Na criação ou depois'], ['Quantas vezes', 'Uma só']],
        verso: () => (<>
          <p>Você pode deixar em branco na criação e escolher mais tarde — mas só uma vez. Depois de escolhida, ela não muda. Estas são as escolas de cada profissão, com o título que cada uma dá:</p>
          {Object.entries(esp).map(([prof, lista]) => (
            <p key={prof}>O <b>{prof.toLowerCase()}</b> pode se formar {gpLista(lista.map((e) => `${/^Col/.test(e.esp) ? 'no' : 'na'} ${e.esp} (${e.titulo.toLowerCase()})`), 'ou')}.</p>
          ))}
        </>) },
      { id: 'acao', titulo: 'O que a especialização dá', frase: 'Além do título, o guerreiro e o ladino especializados ganham uma ação a mais por rodada, só para usar técnicas.',
        numeros: [['Guerreiro e ladino', 'Uma ação a mais para técnicas']],
        verso: () => (<>
          <p>Na batalha, cada combatente tem um número de <b>pontos de ação</b> por rodada — quantas coisas pode fazer na sua vez. O guerreiro e o ladino especializados ganham mais um, que só serve para técnicas.</p>
          <p>A especialização não limita o que você aprende: “básica” e “especializada”, nas magias e técnicas, só organizam o catálogo.</p>
        </>) },
    ] },
    { id: 'atributos', icone: 'ti-chart-radar', titulo: 'Atributos', cartas: [
      { id: 'pontos', titulo: 'Quantos pontos você tem', frase: 'No estágio 1, você tem 15 pontos para distribuir nos seus atributos, e a cada dois estágios ganha mais um.',
        numeros: [['No estágio 1', '15 pontos'], ['Depois', 'Mais 1 a cada 2 estágios']],
        verso: () => (<p>Cada atributo começa onde a sua raça deixou. A partir dali, você sobe os que quiser com esses pontos — e também pode baixar um atributo para ganhar pontos de volta. Em cada passo da criação, o assistente mostra quanto ainda sobra antes de você clicar.</p>) },
      { id: 'custo', titulo: 'Quanto custa subir um atributo', frase: 'Quanto mais alto o atributo, mais caro fica subir: o primeiro ponto custa 1, mas chegar a +4 custa 10.',
        numeros: [['Até +1', '1 ponto'], ['Até +2', '3 pontos'], ['Até +3', '6 pontos'], ['Até +4', '10 pontos']],
        verso: () => (<>
          <p>Cada degrau custa um pouco mais que o anterior. Levar um atributo até +1 custa 1 ponto; até +2, 3 pontos; até +3, 6; até +4, 10; até +5, 15; e até +6, 21. Descer também vale: deixando um atributo em −1, você recebe meio ponto de volta, e em −2, um ponto inteiro.</p>
          <p>A conta começa de onde a sua raça deixou. O anão já nasce com físico +2 sem pagar nada; para chegar a +3, ele paga só a diferença: 6 menos 3, ou seja, 3 pontos. E se você baixar um atributo que a raça deu, recebe essa diferença de volta.</p>
        </>) },
      { id: 'negativo', titulo: 'Atributo abaixo de zero', frase: 'Deixar um atributo negativo devolve pontos para você gastar em outro — mas isso tem um preço.',
        numeros: [['Em −1', 'Devolve meio ponto'], ['Em −2', 'Devolve 1 ponto']],
        verso: () => (<>
          <p>A boa notícia: na sua energia física, energia heroica, resistências, karma, velocidade e defesa, o negativo conta como zero e não tira nada.</p>
          <p>O preço aparece nos testes. As habilidades e técnicas ligadas àquele atributo ficam mais difíceis, e se for o atributo que a sua arma usa, o ataque perde o dobro.</p>
        </>) },
      { id: 'alimenta', titulo: 'Para que serve cada atributo', frase: 'Cada atributo cuida de uma parte do seu personagem. Escolha os que combinam com o que você quer que ele faça.',
        numeros: [['Intelecto', 'Aprender magias e técnicas'], ['Percepção', 'Mais energia heroica']],
        verso: () => (<>
          <p>Quer bater mais forte, carregar mais peso e empunhar as armas pesadas? Invista em <b>força</b>. Quer aguentar mais dano e resistir a venenos e doenças? O <b>físico</b> enche a sua energia física e também ajuda a carregar peso.</p>
          <p>Se a ideia é agir primeiro e ser difícil de acertar, a <b>agilidade</b> aumenta a sua velocidade e a sua defesa. A <b>percepção</b> dá mais energia heroica, seja qual for a sua profissão.</p>
          <p>Para quem quer aprender muitas magias e técnicas, o <b>intelecto</b> dá mais pontos para isso, em todas as profissões. A <b>aura</b> protege você das magias inimigas e dá o karma para lançar as suas — com a aura abaixo de 1, não há karma nenhum.</p>
          <p>E o <b>carisma</b> ajuda a convencer e inspirar as pessoas, além de fazer voltar mais energia heroica quando você dorme ou medita.</p>
        </>) },
      { id: 'contas', titulo: 'Como a ficha calcula tudo', frase: 'Você não precisa fazer conta nenhuma: a ficha transforma os seus atributos nos números que você usa na mesa.',
        verso: () => (<>
          <p>Tudo começa na sua altura, que vem da raça e do gênero. Dela sai o seu <b>peso</b> — o anão é mais pesado para o tamanho que tem. O peso dividido por 5, mais o seu físico, dá a sua <b>energia física</b>, a vida do corpo: em 0 você cai, e em −15 morre.</p>
          <p>A <b>energia heroica</b>, o fôlego e a sorte que o dano gasta primeiro, é a da sua profissão multiplicada pelo estágio, mais a sua percepção.</p>
          <p>As duas resistências crescem com o estágio. A <b>resistência física</b>, que segura venenos, doenças e efeitos no corpo, soma o seu físico; a <b>resistência mágica</b>, que segura as magias lançadas contra você, soma a sua aura. O <b>karma</b>, a energia que você gasta para lançar magias, cresce com a resistência mágica e com a aura.</p>
          <p>Por fim, a <b>velocidade</b> vem da sua altura, mais a sua agilidade. Ela decide quem age primeiro e quanto você anda — e com 30 ou mais, você age duas vezes por rodada.</p>
        </>) },
      { id: 'defesa', titulo: 'Como a armadura protege', frase: 'A armadura protege você de dois jeitos: a defesa deixa você mais difícil de acertar, e a absorção segura parte do dano quando o golpe acerta.',
        numeros: [['Conjunto leve completo', 'Mais defesa e um pouco de absorção'], ['Conjunto médio', 'Um meio-termo'], ['Conjunto pesado', 'A maior absorção']],
        verso: () => (<>
          <p>A sua <b>defesa</b> soma o tipo do peitoral (leve, médio ou pesado), a proteção das outras peças e a sua agilidade. A ficha mostra algo como “M7”: armadura média, 7 de defesa. Cada ponto de defesa deixa o ataque do inimigo um pouco mais difícil.</p>
          <p>A <b>absorção</b> é a soma das peças que você veste, mais a sagração e a qualidade de quem as fabricou.</p>
          <p>Vestindo o conjunto completo — todas as peças do mesmo tipo, iguais e inteiras —, você ganha um bônus: o leve dá +2 de absorção e +2 de defesa; o médio, +3 e +1; o pesado, +4 de absorção. Peça quebrada não protege. Algumas peças tiram velocidade ou karma, mas o sacerdote não perde o karma.</p>
        </>) },
      { id: 'carga', titulo: 'Quanto você consegue carregar', frase: 'Carregar muito peso deixa você lento: passou da metade do que você aguenta, a velocidade e a defesa começam a cair.',
        numeros: [['Mais da metade', 'Um pouco mais lento'], ['Mais de três quartos', 'Bem mais lento'], ['Quase no limite', 'Arrastando os pés']],
        verso: () => (<>
          <p>O quanto você aguenta depende da sua força e do seu físico, mais o espaço das mochilas, bolsas e outros recipientes. E nem tudo pesa igual: o que você está vestindo ou empunhando pesa a metade; o que está dentro de um recipiente, três quartos; o que está solto, o peso inteiro.</p>
          <p>Passando da metade da carga (51%), você perde um quarto da velocidade e 1 de defesa. Passando de três quartos (76%), perde metade da velocidade e 2 de defesa, as habilidades de agilidade ficam 2 pontos mais difíceis, e a fome, a sede e o sono chegam 25% mais rápido.</p>
          <p>Quase no limite (91% ou mais), você perde três quartos da velocidade e 4 de defesa, fica sem a ação extra, e a fome, a sede e o sono chegam 50% mais rápido. Acima de 100%, nada novo cabe no inventário.</p>
        </>) },
    ] },
    { id: 'habilidades', icone: 'ti-tools', titulo: 'Habilidades', cartas: [
      { id: 'total', titulo: 'Como funciona uma habilidade', frase: 'As habilidades são o que o seu personagem sabe fazer fora da luta. Quanto mais nível você compra, melhor ele fica — e o atributo ligado a ela e o bônus da raça e do reino ajudam.',
        numeros: [['Ladino', 'O mais habilidoso'], ['Sacerdote e mago', 'Os que menos treinam']],
        verso: () => (<>
          <p>A cada estágio, a sua profissão dá pontos de habilidade. O <b>ladino</b> é o mais habilidoso: ganha {habDe('Ladino')} pontos por estágio. Depois vem o <b>rastreador</b>, com {habDe('Rastreador')}, e o <b>guerreiro</b> e o <b>bardo</b>, com {habDe('Guerreiro')}. O <b>sacerdote</b> e o <b>mago</b> são os que menos treinam: {habDe('Mago')} cada.</p>
          <p>O nível de uma habilidade nunca passa do seu estágio. Depois de criado, o seu personagem continua crescendo pela ficha: o botão <b>Subir nível</b> compra os próximos níveis de habilidades, técnicas e magias.</p>
        </>) },
      { id: 'menos7', titulo: 'Compre o primeiro nível', frase: 'Tentar uma habilidade sem nenhum treino é difícil: você perde 7 no teste. O primeiro nível já apaga essa perda, e é a compra que mais rende na ficha.',
        numeros: [['Sem treino', '−7'], ['Com 1 nível', '+1']],
        verso: () => (<>
          <p>Em Tagmar, os testes são resolvidos numa tabela de colunas: quanto mais alta a coluna, mais fácil o sucesso. Sair de −7 para +1 sobe 8 colunas pelo preço de um nível só.</p>
          <p>Por isso, antes de subir muito a sua habilidade favorita, vale comprar o primeiro nível nas habilidades que a sua mesa costuma pedir.</p>
        </>) },
      { id: 'aprimora', titulo: 'Habilidades que abrem escolhas', frase: 'Quatro habilidades dão algo novo conforme você melhora nelas: uma língua, um culto ou uma escolha a mais.',
        numeros: [['Idioma', 'Uma língua a cada 10'], ['Religião', 'Um culto a cada 5'], ['Arte e sabedoria', 'Uma escolha a cada 7']],
        verso: () => (<>
          <p>Na habilidade idioma, cada 10 pontos dão uma língua nova; em religião, cada 5 dão um culto; em arte e em sabedoria, cada 7 dão uma escolha a mais.</p>
          <p>Depois da criação, uma habilidade nova se aprende pelo livro, com 12 horas na atividade treinar. Os níveis seguintes sobem na hora, pela ficha.</p>
        </>) },
      { id: 'restricao', titulo: 'Habilidades que a armadura atrapalha', frase: 'Algumas habilidades ficam mais difíceis com armadura média ou pesada, e outras você só consegue usar se tiver comprado.',
        numeros: [['Marca M ou P', 'Mais difícil com essa armadura'], ['Marca N', 'Só se tiver comprado']],
        verso: () => (<>
          <p>O catálogo mostra uma marca em cada habilidade. Com <b>M</b> ou <b>P</b>, ela fica um nível mais difícil quando você veste armadura desse tipo. Com <b>N</b>, você não consegue usar sem ter comprado pelo menos um nível.</p>
          <p>Quem vive de furtividade ou acrobacia sente o peso da armadura — e precisa escolher entre proteção e destreza.</p>
        </>) },
    ] },
    { id: 'armas', icone: 'ti-sword', titulo: 'Armas e técnicas', cartas: [
      { id: 'grupos', titulo: 'Grupos de armas', frase: 'Você não treina uma espada só: treina um grupo de armas parecidas. Cada nível no grupo deixa mais fácil acertar com todas elas.',
        numeros: [['Armas leves', 'Mais baratas de treinar'], ['Armas pesadas', 'As mais caras']],
        verso: () => (<>
          <p>As armas se dividem pelo jeito de ferir. No <b>corte</b> ficam as facas, as machadinhas, as espadas e os grandes machados; na <b>perfuração</b>, as adagas, as lanças, os arcos e as bestas; no <b>esmagamento</b>, os porretes, as maças e os martelos. Cada um desses três tem um grupo leve, um médio e um pesado. Há ainda o combate desarmado (punhos e soqueiras) e o de imobilização (redes e boleadeiras).</p>
          <p>Os grupos leves, o desarmado e o de imobilização custam 2 pontos por nível; os médios, 3; os pesados, 4. Cada nível sobe uma coluna no seu ataque — e quanto mais alta a coluna, mais fácil acertar. O nível do grupo nunca passa do seu estágio.</p>
          <p>O <b>guerreiro</b> é quem mais treina armas: {armasDe('Guerreiro')} pontos por estágio. O <b>ladino</b> e o <b>rastreador</b> ganham {armasDe('Ladino')}; o <b>sacerdote</b>, {armasDe('Sacerdote')}; o <b>bardo</b>, {armasDe('Bardo')}; e o <b>mago</b>, só {armasDe('Mago')}.</p>
        </>) },
      { id: 'coluna', titulo: 'Como se calcula o ataque', frase: 'A sua chance de acertar depende de três coisas: a sua arma contra a armadura do alvo, o seu treino no grupo e a defesa do alvo.',
        verso: () => (<>
          <p>Cada arma tem três valores: um contra armadura leve, um contra média e um contra pesada. Eles já incluem o atributo que a arma usa — a força numa espada, a agilidade num arco — e a qualidade de quem a fabricou. Cada ponto nesse atributo vale 2 colunas, e o negativo também conta.</p>
          <p>Imagine um alvo com defesa “M7”: armadura média, 7 de defesa. A sua arma vale 12 contra armadura média, e você tem nível 2 no grupo. O seu ataque fica na coluna 12 mais 2 menos 7, ou seja, 7.</p>
          <p>Se acertar, o dano é o da arma mais a sua força e a sagração. Armas pesadas pedem uma <b>força mínima</b>: abaixo dela, você não consegue usá-las.</p>
        </>) },
      { id: 'tecnicas', titulo: 'O que são técnicas', frase: 'Técnicas são manobras de combate que você treina: um golpe especial, uma defesa, um truque. Sem treino, você perde 7 no teste.',
        numeros: [['Guerreiro', 'O que mais treina técnicas']],
        verso: () => (<>
          <p>Qualquer profissão aprende qualquer técnica, com o pergaminho ou o manual que a ensina. O item não se gasta. Cada técnica diz com quais armas (e às vezes com quais armaduras) ela funciona.</p>
          <p>A cada estágio, a profissão dá pontos para aprender técnicas, e o seu intelecto soma mais. O <b>guerreiro</b> é quem mais aprende: {tecBaseDe('Guerreiro')} pontos por estágio, mais o intelecto. O <b>ladino</b> ganha {tecBaseDe('Ladino')}; o <b>rastreador</b>, {tecBaseDe('Rastreador')}; o <b>sacerdote</b> e o <b>bardo</b>, {tecBaseDe('Bardo')}; e o <b>mago</b>, só {tecBaseDe('Mago')} — sempre mais o intelecto.</p>
        </>) },
      { id: 'aprender-tec', titulo: 'Aprender uma técnica', frase: 'Uma técnica nova leva 36 horas de treino. Depois disso, cada nível a mais vale na hora.',
        numeros: [['Técnica nova', '36 horas de treino'], ['Níveis seguintes', 'Na hora']],
        verso: () => (<>
          <p>Só contam as horas do relógio da mesa em que o seu personagem está com a atividade treinar ligada. Depois de aprendida, os próximos níveis se compram em <b>Subir nível</b> e valem na mesma hora.</p>
          <p>Na batalha, as técnicas que o sistema aplica sozinho podem ser ativadas uma vez por rodada sem gastar ponto de ação.</p>
        </>) },
    ] },
    { id: 'magias', icone: 'ti-wand', titulo: 'Magias', cartas: [
      { id: 'passos', titulo: 'Como a magia cresce', frase: 'Cada magia sobe de dois em dois níveis — 1, 3, 5, 7 e 9 — e nunca passa do seu estágio.',
        numeros: [['Para aprender', 'Mais caro a cada nível'], ['Para lançar', 'Gasta karma']],
        verso: () => (<>
          <p>O <b>karma</b> é a sua energia mágica: cada vez que você lança uma magia, gasta karma igual ao nível dela.</p>
          <p>Para aprender, você paga o nível vezes o custo da magia. Uma magia de custo 2 no nível 5, por exemplo, custa 10 pontos para aprender e gasta 5 de karma a cada vez que é lançada. As básicas custam 1 ou 2 por nível; as perdidas, 2 ou 3; as ancestrais, 3 ou 4.</p>
        </>) },
      { id: 'pontos-magia', titulo: 'Pontos para aprender magias', frase: 'A cada estágio, a sua profissão dá pontos para aprender magias, e o seu intelecto soma mais.',
        numeros: [['Mago e bardo', 'Mais estudiosos'], ['Guerreiro e ladino', 'Os que menos estudam']],
        verso: () => (<>
          <p>O <b>mago</b> e o <b>bardo</b> são os mais estudiosos: {magiaBaseDe('Mago')} pontos de magia por estágio, mais o intelecto. O <b>rastreador</b> e o <b>sacerdote</b> ganham {magiaBaseDe('Sacerdote')}, e o <b>guerreiro</b> e o <b>ladino</b>, só {magiaBaseDe('Guerreiro')} — sempre mais o intelecto.</p>
          <p>Se o seu intelecto for negativo, ele conta como zero. Se a sua aura for negativa, a profissão não dá pontos de magia, e sobram só os do intelecto.</p>
        </>) },
      { id: 'aprender-mag', titulo: 'Aprender uma magia', frase: 'Uma magia nova leva 24 horas de dedicação. Depois disso, cada nível a mais vale na hora.',
        numeros: [['Feitiço', 'Estudando'], ['Milagre', 'Orando'], ['Transmutação', 'Meditando'], ['Encanto', 'Praticando']],
        verso: () => (<>
          <p>Cada tipo de magia se aprende de um jeito: o feitiço, estudando; o milagre, orando; a transmutação, meditando; o encanto, praticando.</p>
          <p>Você aprende pelo item que ensina a magia: um livro (da profissão, do deus, da ordem, do colégio, da confraria ou da trilha) ou um pergaminho — as magias perdidas e ancestrais têm pergaminho próprio. O item não se gasta. Os rituais pedem ingredientes, e a própria magia diz quais.</p>
        </>) },
      { id: 'itens-magicos', titulo: 'Itens mágicos', frase: 'Um anel, um cajado ou uma arma encantada lança a sua magia de graça, sem gastar karma, desde que você esteja usando o item.',
        numeros: [['Karma gasto', 'Nenhum']],
        verso: () => (<p>Usar quer dizer empunhar ou vestir; os itens que se consomem funcionam direto da mochila. A magia sai no nível do item. O pergaminho é diferente: ele não lança a magia, só ensina. E a magia do item tem o próprio elemento — um mago, que é da escuridão, lançando fogo num alvo do ar, ganha os 10% do fogo.</p>) },
      { id: 'aura', titulo: 'Sem aura, sem magia', frase: 'Com a aura abaixo de 1, você não tem karma — e sem karma, nenhuma magia sai.',
        numeros: [['Aura 0', 'Nenhum karma']],
        verso: () => (<p>O intelecto dá os pontos para aprender; a aura dá o karma para lançar. Uma boa estratégia: aprenda várias magias no nível 1 (cada uma gasta só 1 de karma) e leve a sua favorita até o nível 5, que equilibra a força dela com quantas vezes você consegue lançá-la.</p>) },
    ] },
    { id: 'combate', icone: 'ti-swords', titulo: 'Combate', cartas: [
      { id: 'iniciativa', titulo: 'Quem age primeiro', frase: 'Na batalha, age primeiro quem é mais rápido: a sua velocidade, somada a um dado de dez lados rolado no começo.',
        numeros: [['O dado', 'De 1 a 10'], ['No empate', 'O personagem vai antes']],
        verso: () => (<p>Quando a batalha começa, cada jogador rola o dado do seu personagem, e o Mestre rola o das criaturas — um para cada tipo. O resultado se soma à velocidade e define a ordem da rodada. No empate, o personagem age antes da criatura.</p>) },
      { id: 'pa', titulo: 'Quantas ações por rodada', frase: 'Personagens muito velozes podem agir duas vezes por rodada.',
        numeros: [['Todos', 'Uma ação'], ['Velocidade alta', 'Uma ação a mais'], ['Guerreiro e ladino especializados', 'Mais uma, para técnicas']],
        verso: () => (<p>Em cada ação você pode atacar, evocar magias ou usar técnicas de combate. Se você estiver carregando muitos itens, ou itens muito pesados, perde a ação extra. O guerreiro e o ladino especializados têm um ponto a mais, usado exclusivamente para técnicas de combate.</p>) },
      { id: 'd20', titulo: 'O dado e a tabela', frase: 'Para atacar, você rola um dado de vinte lados na coluna do seu ataque. O resultado diz quanto do golpe entra — de nada até um golpe e meio.',
        numeros: [['Médio', 'Metade do dano'], ['Muito difícil', 'O dano inteiro'], ['Absurdo', 'Um golpe e meio']],
        verso: () => (<>
          <p>O resultado vai subindo conforme o dado. No <b>rotineiro</b>, você erra. No <b>fácil</b>, entra um quarto do dano; no <b>médio</b>, metade; no <b>difícil</b>, três quartos; no <b>muito difícil</b>, o dano inteiro; no <b>espetacular</b>, o dano inteiro e mais um quarto. E no <b>absurdo</b>, um golpe e meio — e você ainda rola o dado de crítico.</p>
          <p>O pior resultado é a <b>falha crítica</b>: você erra e se machuca, levando um terço do golpe direto no corpo, sem passar pela energia heroica.</p>
          <p>Tirar 1 no dado é sempre falha crítica; tirar 20 é sempre absurdo. Os bônus de dano em porcentagem (do elemento, das magias) se somam, e o total arredonda para cima.</p>
        </>) },
      { id: 'cascata', titulo: 'Para onde vai o dano', frase: 'O dano gasta primeiro a sua energia heroica. Quando ela acaba, a armadura segura uma parte, e o resto fere o seu corpo — a energia física.',
        numeros: [['Primeiro', 'A energia heroica'], ['Depois', 'A armadura'], ['Por fim', 'A energia física']],
        verso: () => (<>
          <p>Se o golpe for menor ou igual à absorção da sua armadura, ela segura tudo. Se for maior, só a diferença chega à energia física, e a armadura se desgasta um pouco. A peça que se desgasta toda quebra e para de proteger.</p>
          <p>Os golpes críticos e algumas técnicas passam direto pela energia heroica. Quem já está caído ou desmaiado também leva o golpe sem ela.</p>
        </>) },
      { id: 'queda', titulo: 'Desmaiar, cair e morrer', frase: 'Sem energia heroica, você desmaia. Com a energia física em zero, você cai. Se ela chegar a −15, o seu personagem morre.',
        numeros: [['Energia física de 0 a −14', 'Caído'], ['Energia física em −15', 'Morto']],
        verso: () => (<p>Com a energia física em zero ou menos, o seu personagem fica desmaiado por 4 rodadas e depois acorda — mas continua caído e morrendo, mesmo acordado, até alguém cuidar dele.</p>) },
      { id: 'escuridao', titulo: 'Lutar no escuro', frase: 'Sem luz, fica mais difícil acertar: o seu ataque perde 2 colunas na penumbra, 4 no escuro e 6 numa escuridão mágica.',
        numeros: [['Penumbra', 'Um pouco mais difícil'], ['Escuro', 'Bem mais difícil'], ['Escuridão mágica', 'Quase às cegas']],
        verso: () => (<p>Quem enxerga no escuro, por magia (Visão Animal) ou por técnica (Luta às Cegas), não perde nada.</p>) },
      { id: 'bandos', titulo: 'Bandos de criaturas', frase: 'Quando aparecem muitas criaturas iguais, elas lutam em bandos: um líder e seguidores mais fracos, que fogem se o líder morrer.',
        numeros: [['Até 6 criaturas', 'Cada uma luta sozinha'], ['7 ou mais', 'Formam bandos']],
        verso: () => (<>
          <p>De 7 a 10 criaturas, os bandos são de 3; de 11 a 16, de 4; com 17 ou mais, de 5. Cada seguidor tem só um quarto da energia física, da energia heroica e da absorção da criatura, e age junto do líder.</p>
          <p>Se o líder só desmaiar, o bando continua lutando: o que espanta o bando é só a morte dele.</p>
        </>) },
      { id: 'montaria', titulo: 'Lutar montado', frase: 'Montados, cavaleiro e animal lutam como um só, e a energia heroica do animal protege o cavaleiro.',
        numeros: [['Velocidade', 'A da montaria']],
        verso: () => (<p>O cavaleiro usa a velocidade da montaria. Se ela cair, ele desmonta e continua a pé.</p>) },
    ] },
    { id: 'condicoes', icone: 'ti-heartbeat', titulo: 'Condições', cartas: [
      { id: 'barras', titulo: 'Fome, sono, frio e outras condições', frase: 'Cada condição é uma barra que vai de 0 (ideal) a 100 (pior). A cada 25 pontos, ela piora alguma coisa no seu personagem.',
        numeros: [['Em 0', 'Tudo bem'], ['A cada 25', 'Piora um pouco mais']],
        verso: () => (<>
          <p>Cada condição pesa num lugar. A <b>doença</b> tira energia física. O <b>sono</b> e o <b>frio</b> deixam você mais lento. A <b>sede</b> enfraquece a sua resistência mágica, e a <b>fome</b>, a sua resistência física — até 4 pontos cada. O <b>vício</b> consome o seu karma. A <b>loucura</b> e o <b>calor</b> gastam a sua energia heroica. A <b>desonra</b> corta a sua influência sobre as pessoas, até a metade. E carregar peso demais conta como a condição <b>pesado</b> (veja Atributos).</p>
          <p>O tempo que passa na mesa enche as barras, e as atividades da ficha — dormir, meditar, orar, estudar, treinar, praticar, fabricar — esvaziam. A roupa certa limita o quanto o frio e o calor podem subir. Quando uma barra passa de 25, a mesa avisa você.</p>
        </>) },
    ] },
  ];
}

/* ============================== [08.8] GuiaPersonagem — a mesa de cartas ============================== */
function GuiaPersonagem({ lang = 'pt' }) {
  const caps = React.useMemo(() => montarCapitulos(), []);
  const [ci, setCi] = useState(0);         // capítulo
  const [ki, setKi] = useState(0);         // carta no capítulo
  const [tip, abrirTip, fecharTip, manterTip] = useTooltip(60);
  const palcoRef = useRef(null);
  const [altura, setAltura] = useState(null);
  const cap = caps[ci];
  const carta = cap.cartas[ki];
  const totalCartas = caps.reduce((n, c) => n + c.cartas.length, 0);
  const posGlobal = caps.slice(0, ci).reduce((n, c) => n + c.cartas.length, 0) + ki + 1;

  /* A altura útil: da carta até o pé da janela, menos a fileira e a régua de
     baixo — a página não ganha barra vertical. */
  const medir = React.useCallback(() => {
    const el = palcoRef.current;
    if (!el) return;
    const topo = el.getBoundingClientRect().top;
    // Reserva o pé (.pg-rodape) e o respiro do cartão abaixo do corpo.
    setAltura(Math.max(360, Math.floor(window.innerHeight - topo - 96)));
  }, []);
  React.useLayoutEffect(() => {
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [medir]);

  const ir = (c, k) => { setCi(c); setKi(k); };
  /* O capítulo e a carta acesos sempre à vista (revisão final): no celular o
     trilho e a fileira rolam de lado, e o atual podia ficar fora da tela. */
  const raizRef = useRef(null);
  useEffect(() => {
    const raiz = raizRef.current;
    if (!raiz) return;
    // Rola só o trilho e a fileira (nunca a página): o aceso vai para o meio.
    [['.gc-trilho', '.is-ativo'], ['.gc-baralho', '.is-atual']].forEach(([cx, sel]) => {
      const caixa = raiz.querySelector(cx);
      const el = caixa && caixa.querySelector(sel);
      if (!el || caixa.scrollWidth <= caixa.clientWidth) return;
      const dx = el.getBoundingClientRect().left - caixa.getBoundingClientRect().left + caixa.scrollLeft
        - (caixa.clientWidth - el.offsetWidth) / 2;
      caixa.scrollLeft = Math.max(0, dx);
    });
  }, [ci, ki]);
  /* O texto da carta avisa que tem mais: esmaece a borda de baixo enquanto há rolagem. */
  const versoRef = useRef(null);
  const [versoRola, setVersoRola] = useState(false);
  useEffect(() => {
    const el = versoRef.current;
    if (!el) return undefined;
    const medirVerso = () => setVersoRola(el.scrollHeight - el.clientHeight - el.scrollTop > 4);
    medirVerso();
    el.addEventListener('scroll', medirVerso);
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(medirVerso) : null;
    if (ro) ro.observe(el);
    return () => { el.removeEventListener('scroll', medirVerso); if (ro) ro.disconnect(); };
  }, [ci, ki]);
  const temAnterior = ci > 0 || ki > 0;
  const temProxima = ci < caps.length - 1 || ki < cap.cartas.length - 1;
  const voltar = () => {
    if (ki > 0) ir(ci, ki - 1);
    else if (ci > 0) ir(ci - 1, caps[ci - 1].cartas.length - 1);
  };
  const avancar = () => {
    if (ki < cap.cartas.length - 1) ir(ci, ki + 1);
    else if (ci < caps.length - 1) ir(ci + 1, 0);
  };
  useEffect(() => {
    const onKey = (e) => {
      const alvo = e.target;
      if (alvo && (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName))) return;
      if (document.querySelector('.ms-backdrop')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); voltar(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); avancar(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* A PÁGINA NO PADRÃO DA FICHA (11/11/2026, usuário: "E o nosso padrão de
     layout? Trilhos dentro da página, cores sem transparência"). Cartão
     sólido da página (.pjs dentro do .mc-content), o trilho dos capítulos
     DENTRO dele com as pílulas do Livro de Regras (.livro-trilho .mc-acao),
     réguas de borda a borda, e o pé (.pg-rodape) com Anterior · carta ·
     Próxima. Cada carta: a arte vertical à esquerda (carta.imagem; sem ela,
     o ícone do capítulo guarda o lugar) e o texto à direita, com o título
     de cartão da Ficha (.fp-col-tit).
     SEM VIRAR (11/11/2026, usuário: "Remova o 'ver o porquê' e coloque o
     texto no card, pois há muito espaço vazio"): a frase, os números e o
     porquê ficam juntos na carta; o texto rola por dentro quando é longo. */
  const arteDe = (k) => (k.imagem
    ? <img src={k.imagem} alt="" className="gc-arte-img" />
    : <i className={'ti ' + cap.icone + ' gc-arte-ic'} aria-hidden="true" />);
  return (
    <div className="pjs gc-page" id="gp-topo" ref={raizRef}>
      <div className="cartoes-barra livro-trilho gc-trilho-barra">
        <div className="best-header-acoes gc-trilho mn-rolagem" role="toolbar" aria-label="Capítulos do guia">
          {caps.map((c, i) => (
            <button key={c.id} type="button" className={'mc-acao gc-cap' + (i === ci ? ' is-ativo is-atual' : '')}
              aria-current={i === ci ? 'step' : undefined} data-cap={c.id} aria-label={c.titulo}
              {...(i === ci ? {} : propsTip(abrirTip, fecharTip, c.titulo))}
              onClick={() => { fecharTip(); ir(i, 0); }}>
              <i className={'ti ' + c.icone} aria-hidden="true" />
              {/* Treze capítulos não cabem no trilho com nome: o atual diz o
                  nome; os outros, só o ícone — o nome no balão do sistema. */}
              {i === ci && <span className="mc-acao-rotulo">{c.titulo}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="gc-corpo" ref={palcoRef} style={altura ? { height: altura + 'px' } : undefined}>
        <article className="gc-carta" aria-labelledby="gc-carta-tit" key={cap.id + ':' + carta.id}>
          <figure className={'gc-arte' + (carta.imagem ? '' : ' is-vazia')}>{arteDe(carta)}</figure>
          <div className="gc-texto">
            <h2 id="gc-carta-tit" className="fp-col-tit gc-titulo">{carta.titulo}</h2>
            <div ref={versoRef} className={'gc-carta-corpo mn-rolagem' + (versoRola ? ' tem-mais' : '')}>
              <p className="gc-frase">{carta.frase}</p>
              {carta.numeros && carta.numeros.length > 0 && (
                <div className="mn-passe gc-passe">
                  {carta.numeros.map(([r, v]) => (
                    <div key={r} className="mn-celula"><span className="mn-rotulo">{r}</span><span className="mn-celula-valor">{v}</span></div>
                  ))}
                </div>
              )}
              {carta.sim
                ? <carta.sim>{carta.verso()}</carta.sim>
                : <div className="gc-porque">{carta.verso()}</div>}
            </div>
          </div>
        </article>

        {cap.cartas.length > 1 && (
        <div className="gc-baralho mn-rolagem" role="tablist" aria-label={'Cartas de ' + cap.titulo}>
          {cap.cartas.map((k, i) => (
            <button key={k.id} type="button" role="tab" aria-selected={i === ki}
              className={'gc-mini' + (i === ki ? ' is-atual' : '')} onClick={() => ir(ci, i)}>
              <span className="gc-mini-n">{i + 1}</span>
              <span className="gc-mini-tit">{k.titulo}</span>
            </button>
          ))}
        </div>
        )}
      </div>

      <nav className="pg-rodape gc-nav" aria-label="Cartas">
        <button type="button" className="btn-ghost btn-sm" disabled={!temAnterior} onClick={voltar}>
          <i className="ti ti-chevron-left" aria-hidden="true" />Anterior
        </button>
        <span className="gc-pos" aria-live="polite">{cap.titulo} · carta <b>{ki + 1}</b> de {cap.cartas.length}<span className="gc-pos-total"> · {posGlobal} de {totalCartas}</span></span>
        <button type="button" className="btn-ghost btn-sm" disabled={!temProxima} onClick={avancar}>
          Próxima<i className="ti ti-chevron-right" aria-hidden="true" />
        </button>
      </nav>
      <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} abaixo />
    </div>
  );
}

Object.assign(window, { GuiaPersonagem, montarCapitulosDoGuia: montarCapitulos });
