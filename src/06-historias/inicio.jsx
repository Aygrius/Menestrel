/* ============================================================
   INÍCIO — a página do Mestre sem mesa escolhida (15/11/2026)
   ============================================================
   Usuário: "Quando não houver mesa selecionada, eu não quero os cards de
   histórias na tela principal, ao contrário disso eu quero uma 'home page'
   com as atualizações do sistema. Notícias sobre sistema de batalha, sistema
   de mapa, criação de personagem, etc."

   Os cards saíram: escolher e criar mesa mora no "Escolher mesa" do menu
   lateral. Aqui fica o que mudou no Menestrel, da notícia mais nova para a
   mais velha. Cada notícia é um fato que está no sistema (o histórico do git
   diz quando entrou) — não anunciar o que não existe.

   NOTÍCIA NOVA: uma linha no topo de NOTICIAS_DO_SISTEMA, com a data em
   que entrou no ar. A área é uma das chaves de AREAS_NOTICIA.
   ============================================================ */

const AREAS_NOTICIA = {
  mapa:        ['Mapa', 'Map', 'ti-map'],
  batalha:     ['Batalha', 'Battle', 'ti-swords'],
  personagem:  ['Criação de personagem', 'Character creation', 'ti-user-plus'],
  ficha:       ['Ficha', 'Sheet', 'ti-id'],
  ambientacao: ['Ambientação', 'Setting', 'ti-crown'],
  aparencia:   ['Aparência', 'Appearance', 'ti-palette'],
};

const NOTICIAS_DO_SISTEMA = [
  { data: '2026-11-15', area: 'aparencia',
    pt: ['Quatro paletas com nomes de deuses', 'Crezir, Crizagom, Ganis e Maira: as cores do sistema mudam nas Configurações. Crizagom é cinza e prata; Ganis, púrpura, ciano e turquesa; Maira, verde escuro, terracota e amarelo ouro.'],
    en: ['Four palettes named after gods', 'Crezir, Crizagom, Ganis and Maira: the system colors change in Settings. Crizagom is grey and silver; Ganis, purple, cyan and turquoise; Maira, dark green, terracotta and golden yellow.'] },
  { data: '2026-11-15', area: 'mapa',
    pt: ['O mapa da mesa', 'A pintura de Tagmar oriental em alta resolução, para arrastar e aproximar. O Mestre põe as cidades cadastradas, marca pontos, traça caminhos e a rota da mesa; o jogador vê onde o personagem está, quanto falta até o destino e marca os seus interesses.'],
    en: ['The table map', 'The painting of eastern Tagmar in high resolution, to drag and zoom. The Game Master places registered cities, marks points, draws paths and the table route; players see where their character is, how far the destination is and mark their own interests.'] },
  { data: '2026-11-14', area: 'batalha',
    pt: ['A luta anda com o relógio', 'Cada ação vale 30 segundos de jogo, e o relógio da mesa avança junto com a batalha. As criaturas têm karma pela mesma regra dos personagens e pagam as magias que lançam.'],
    en: ['The fight moves the clock', 'Each action is worth 30 seconds of game time, and the table clock moves with the battle. Creatures have karma by the same rule as characters and pay for the spells they cast.'] },
  { data: '2026-11-13', area: 'ambientacao',
    pt: ['Deuses, príncipes e colégios', 'Os oito deuses e os sete príncipes infernais que faltavam chegaram às Entidades, e a página Grupos traz os seis colégios de magia.'],
    en: ['Gods, princes and colleges', 'The eight gods and seven infernal princes that were missing joined Entities, and the Groups page brings the six colleges of magic.'] },
  { data: '2026-11-13', area: 'ficha',
    pt: ['Habilidades novas', 'Três habilidades novas por grupo, e as receitas de fabricar passam a ser ensinadas pela habilidade.'],
    en: ['New skills', 'Three new skills per group, and crafting recipes are now taught by the skill.'] },
  { data: '2026-11-11', area: 'batalha',
    pt: ['Criaturas que pensam', 'No automático, quem atira recua para atirar e quem luta de perto ataca e se afasta. A narração dos golpes foi reescrita, a iniciativa usa d10 e cada rodada termina com um resumo.'],
    en: ['Creatures that think', 'On automatic, shooters back off to shoot and melee fighters strike and step away. Blow narration was rewritten, initiative uses a d10 and each round ends with a summary.'] },
  { data: '2026-11-08', area: 'batalha',
    pt: ['Saque e tela cheia', 'O campo de batalha tem zoom e tela cheia, e o saque que ninguém leva vai de graça para a loja da mesa.'],
    en: ['Loot and full screen', 'The battlefield has zoom and full screen, and loot nobody takes goes to the table shop for free.'] },
  { data: '2026-11-07', area: 'personagem',
    pt: ['Livro inicial da profissão', 'Todo personagem novo começa com o livro da sua profissão — o Sacerdote, com o do seu deus — com 10 magias, 10 técnicas e 10 habilidades para aprender. O assistente de criação ficou mais curto.'],
    en: ['Starting profession book', 'Every new character starts with the book of their profession — a Priest, with their god\'s — holding 10 spells, 10 techniques and 10 skills to learn. The creation wizard is shorter.'] },
  { data: '2026-11-06', area: 'ficha',
    pt: ['Evoluir pela ficha', 'Magias, técnicas e habilidades sobem de nível direto na ficha, e os pontos de magia e técnica passam a ser (base + Intelecto) × estágio.'],
    en: ['Level up from the sheet', 'Spells, techniques and skills level up right on the sheet, and spell and technique points become (base + Intellect) × stage.'] },
];

function InicioNovidades({ lang = 'pt' }) {
  const en = lang === 'en';
  const fmt = (iso) => {
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(a, m - 1, d).toLocaleDateString(en ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  };
  return (
    <section className="inicio" aria-labelledby="inicio-titulo">
      <header className="inicio-cabeca">
        <h2 id="inicio-titulo" className="inicio-titulo">{en ? 'What is new in Menestrel' : 'Novidades do Menestrel'}</h2>
        <p className="inicio-sub">
          {en ? 'Pick a table in the side menu to start a session, or create a new one.'
              : 'Escolha uma mesa no menu lateral para começar a sessão, ou crie uma nova.'}
        </p>
      </header>
      <ol className="inicio-lista">
        {NOTICIAS_DO_SISTEMA.map((n) => {
          const [titulo, texto] = en ? n.en : n.pt;
          const area = AREAS_NOTICIA[n.area] || ['', '', 'ti-point'];
          return (
            <li key={n.data + n.area + titulo} className="inicio-noticia">
              <div className="inicio-meta">
                <time dateTime={n.data} className="inicio-data">{fmt(n.data)}</time>
                <span className="inicio-area"><i className={'ti ' + area[2]} aria-hidden="true" />{en ? area[1] : area[0]}</span>
              </div>
              <div className="inicio-corpo">
                <h3 className="inicio-noticia-titulo">{titulo}</h3>
                <p className="inicio-noticia-texto">{texto}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

Object.assign(window, { InicioNovidades, NOTICIAS_DO_SISTEMA, AREAS_NOTICIA });
