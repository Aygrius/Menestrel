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

   NOTÍCIA NOVA: uma linha no topo de NOTICIAS_DO_SISTEMA, com um `id` que
   nunca muda (é a chave do gostei / não gostei no banco), a data em que
   entrou no ar e a área, uma das chaves de AREAS_NOTICIA.

   SEM ROLAGEM (15/11/2026, usuário: "eu não quero o uso de barra de rolagem,
   quero rodapé com menu de navegação"): quatro por página, com a paginação
   das outras páginas no pé do cartão. E cada notícia tem o coração e o dedo
   para baixo ("para dizer se gostou da novidade") — noticias_reacoes,
   scripts/sql/noticias-reacoes-2026-11-15.sql.
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
  { id: 'paletas-deuses', data: '2026-11-15', area: 'aparencia',
    pt: ['Quatro paletas com nomes de deuses', 'Crezir, Crizagom, Ganis e Maira: as cores do sistema mudam nas Configurações. Crizagom é cinza e prata; Ganis, púrpura e nácar; Maira, malaquita e cobre.'],
    en: ['Four palettes named after gods', 'Crezir, Crizagom, Ganis and Maira: the system colors change in Settings. Crizagom is grey and silver; Ganis, purple and mother-of-pearl; Maira, malachite and copper.'] },
  { id: 'mapa-da-mesa', data: '2026-11-15', area: 'mapa',
    pt: ['O mapa da mesa', 'A pintura de Tagmar oriental em alta resolução, para arrastar e aproximar. O Mestre põe as cidades cadastradas, marca pontos, traça caminhos e a rota da mesa; o jogador vê onde o personagem está, quanto falta até o destino e marca os seus interesses.'],
    en: ['The table map', 'The painting of eastern Tagmar in high resolution, to drag and zoom. The Game Master places registered cities, marks points, draws paths and the table route; players see where their character is, how far the destination is and mark their own interests.'] },
  { id: 'luta-e-relogio', data: '2026-11-14', area: 'batalha',
    pt: ['A luta anda com o relógio', 'Cada ação vale 30 segundos de jogo, e o relógio da mesa avança junto com a batalha. As criaturas têm karma pela mesma regra dos personagens e pagam as magias que lançam.'],
    en: ['The fight moves the clock', 'Each action is worth 30 seconds of game time, and the table clock moves with the battle. Creatures have karma by the same rule as characters and pay for the spells they cast.'] },
  { id: 'deuses-principes-colegios', data: '2026-11-13', area: 'ambientacao',
    pt: ['Deuses, príncipes e colégios', 'Os oito deuses e os sete príncipes infernais que faltavam chegaram às Entidades, e a página Grupos traz os seis colégios de magia.'],
    en: ['Gods, princes and colleges', 'The eight gods and seven infernal princes that were missing joined Entities, and the Groups page brings the six colleges of magic.'] },
  { id: 'habilidades-novas', data: '2026-11-13', area: 'ficha',
    pt: ['Habilidades novas', 'Três habilidades novas por grupo, e as receitas de fabricar passam a ser ensinadas pela habilidade.'],
    en: ['New skills', 'Three new skills per group, and crafting recipes are now taught by the skill.'] },
  { id: 'criaturas-que-pensam', data: '2026-11-11', area: 'batalha',
    pt: ['Criaturas que pensam', 'No automático, quem atira recua para atirar e quem luta de perto ataca e se afasta. A narração dos golpes foi reescrita, a iniciativa usa d10 e cada rodada termina com um resumo.'],
    en: ['Creatures that think', 'On automatic, shooters back off to shoot and melee fighters strike and step away. Blow narration was rewritten, initiative uses a d10 and each round ends with a summary.'] },
  { id: 'saque-tela-cheia', data: '2026-11-08', area: 'batalha',
    pt: ['Saque e tela cheia', 'O campo de batalha tem zoom e tela cheia, e o saque que ninguém leva vai de graça para a loja da mesa.'],
    en: ['Loot and full screen', 'The battlefield has zoom and full screen, and loot nobody takes goes to the table shop for free.'] },
  { id: 'livro-inicial', data: '2026-11-07', area: 'personagem',
    pt: ['Livro inicial da profissão', 'Todo personagem novo começa com o livro da sua profissão — o Sacerdote, com o do seu deus — com 10 magias, 10 técnicas e 10 habilidades para aprender. O assistente de criação ficou mais curto.'],
    en: ['Starting profession book', 'Every new character starts with the book of their profession — a Priest, with their god\'s — holding 10 spells, 10 techniques and 10 skills to learn. The creation wizard is shorter.'] },
  { id: 'evoluir-pela-ficha', data: '2026-11-06', area: 'ficha',
    pt: ['Evoluir pela ficha', 'Magias, técnicas e habilidades sobem de nível direto na ficha, e os pontos de magia e técnica passam a ser (base + Intelecto) × estágio.'],
    en: ['Level up from the sheet', 'Spells, techniques and skills level up right on the sheet, and spell and technique points become (base + Intellect) × stage.'] },
];

const NOTICIAS_POR_PAGINA = 4;

/* As reações da pessoa: { [id da notícia]: 'gostei' | 'nao_gostei' }. */
function useReacoesNoticias() {
  const [reacoes, setReacoes] = React.useState({});
  React.useEffect(() => {
    let vivo = true;
    const sb = (typeof supabaseClient !== 'undefined' ? supabaseClient : window.supabaseClient);
    if (!sb) return undefined;
    Promise.resolve(sb.from('noticias_reacoes').select('noticia, reacao'))
      .then(({ data }) => {
        if (!vivo || !Array.isArray(data)) return;
        const m = {};
        data.forEach((r) => { m[r.noticia] = r.reacao; });
        setReacoes(m);
      }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  /* Clicar na que já está marcada desmarca; na outra, troca. */
  const reagir = async (id, reacao) => {
    const sb = (typeof supabaseClient !== 'undefined' ? supabaseClient : window.supabaseClient);
    const antes = reacoes[id] || null;
    const depois = antes === reacao ? null : reacao;
    setReacoes((r) => ({ ...r, [id]: depois }));
    const { error } = depois
      ? await sb.from('noticias_reacoes').upsert({ noticia: id, reacao: depois }, { onConflict: 'user_id,noticia' })
      : await sb.from('noticias_reacoes').delete().eq('noticia', id);
    if (error) setReacoes((r) => ({ ...r, [id]: antes }));
  };
  return [reacoes, reagir];
}

function InicioNovidades({ lang = 'pt' }) {
  const en = lang === 'en';
  const fmt = (iso) => {
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(a, m - 1, d).toLocaleDateString(en ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  };
  const [reacoes, reagir] = useReacoesNoticias();
  const [page, setPage] = React.useState(1);
  /* QUANTAS COUBEREM (15/11/2026, usuário: "você só está mostrando 4 itens por
     página? Mostre quantos itens couber sem usar barra de rolagem vertical").
     As notícias têm alturas diferentes, então a página não é um número: uma
     lista escondida (.inicio-medida) mede cada uma, e as páginas são montadas
     em ordem até encher a altura que o cartão tem (--pg-altura) menos o
     cabeçalho e a paginação. Sem medida (teste, primeiro quadro), quatro. */
  const cartao = React.useRef(null), lista = React.useRef(null), medida = React.useRef(null);
  const [paginas, setPaginas] = React.useState(null);   // [[índices], ...]
  React.useLayoutEffect(() => {
    const medir = () => {
      const c = cartao.current, l = lista.current, m = medida.current;
      if (!c || !l || !m) return;
      const alturas = [...m.children].map((li) => li.getBoundingClientRect().height);
      const cs = getComputedStyle(c);
      const teto = parseFloat(cs.minHeight) || 0;
      if (!teto || !alturas.some((h) => h > 0)) { setPaginas(null); return; }
      const pag = c.querySelector(':scope > .best-pag');
      // A margem de cima da paginação é `auto` (empurra para o pé): não entra na conta.
      const pe = pag ? pag.getBoundingClientRect().height : 56;
      const util = teto - (l.getBoundingClientRect().top - c.getBoundingClientRect().top) - (parseFloat(cs.paddingBottom) || 0) - Math.max(pe, 56);
      const out = []; let atual = [], soma = 0;
      alturas.forEach((h, i) => {
        if (atual.length && soma + h > util) { out.push(atual); atual = []; soma = 0; }
        atual.push(i); soma += h;
      });
      if (atual.length) out.push(atual);
      setPaginas((antes) => (JSON.stringify(antes) === JSON.stringify(out) ? antes : out));
    };
    medir();
    // A fonte do corpo chega depois do primeiro quadro e muda a altura das linhas.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir).catch(() => {});
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [en]);
  const porNumero = Array.from({ length: Math.ceil(NOTICIAS_DO_SISTEMA.length / NOTICIAS_POR_PAGINA) },
    (_, p) => NOTICIAS_DO_SISTEMA.slice(p * NOTICIAS_POR_PAGINA, (p + 1) * NOTICIAS_POR_PAGINA).map((_n, i) => p * NOTICIAS_POR_PAGINA + i));
  const grupos = paginas || porNumero;
  const totalPages = Math.max(1, grupos.length);
  const safePage = Math.min(page, totalPages);
  const pagina = (grupos[safePage - 1] || []).map((i) => NOTICIAS_DO_SISTEMA[i]);
  const Paginas = (typeof BestPagination !== 'undefined' && BestPagination) || window.BestPagination;
  const botao = (n, reacao, icone, rotulo) => {
    const marcado = reacoes[n.id] === reacao;
    return (
      <button type="button" className={'btn-icon btn-sm inicio-reacao inicio-reacao--' + reacao + (marcado ? ' is-on' : '')}
        aria-pressed={marcado} aria-label={rotulo} onClick={() => reagir(n.id, reacao)}>
        <i className={'ti ' + icone} aria-hidden="true" />
      </button>
    );
  };
  const noticia = (n, deVerdade) => {
    const [titulo, texto] = en ? n.en : n.pt;
    const area = AREAS_NOTICIA[n.area] || ['', '', 'ti-point'];
    return (
      <li key={n.id} className="inicio-noticia">
        <div className="inicio-meta">
          <time dateTime={n.data} className="inicio-data">{fmt(n.data)}</time>
          <span className="inicio-area"><i className={'ti ' + area[2]} aria-hidden="true" />{en ? area[1] : area[0]}</span>
        </div>
        <div className="inicio-corpo">
          {deVerdade ? <h3 className="inicio-noticia-titulo">{titulo}</h3> : <p className="inicio-noticia-titulo">{titulo}</p>}
          <p className="inicio-noticia-texto">{texto}</p>
        </div>
        {deVerdade ? (
          <div className="inicio-reacoes" role="group" aria-label={en ? 'Did you like it?' : 'Gostou?'}>
            {botao(n, 'gostei', 'ti-heart', en ? 'I liked it' : 'Gostei')}
            {botao(n, 'nao_gostei', 'ti-thumb-down', en ? 'I did not like it' : 'Não gostei')}
          </div>
        ) : <div className="inicio-reacoes"><span className="btn-icon btn-sm" /><span className="btn-icon btn-sm" /></div>}
      </li>
    );
  };
  return (
    <section className="inicio" aria-labelledby="inicio-titulo" ref={cartao}>
      {/* Só o título (15/11/2026): o convite "Escolha uma mesa no menu lateral…"
          saiu, a pedido do usuário. */}
      <header className="inicio-cabeca">
        <h2 id="inicio-titulo" className="inicio-titulo">{en ? 'What is new in Menestrel' : 'Novidades do Menestrel'}</h2>
      </header>
      <ol className="inicio-lista" ref={lista}>
        {pagina.map((n) => noticia(n, true))}
      </ol>
      {/* A régua de medir: todas as notícias, invisíveis, na largura da lista. */}
      <ol className="inicio-lista inicio-medida" ref={medida} aria-hidden="true">
        {NOTICIAS_DO_SISTEMA.map((n) => noticia(n, false))}
      </ol>
      {Paginas && totalPages > 1 && (
        <Paginas page={page} safePage={safePage} totalPages={totalPages} setPage={setPage} setExpandida={() => {}} lang={lang} />
      )}
    </section>
  );
}

Object.assign(window, { InicioNovidades, NOTICIAS_DO_SISTEMA, AREAS_NOTICIA, NOTICIAS_POR_PAGINA });
