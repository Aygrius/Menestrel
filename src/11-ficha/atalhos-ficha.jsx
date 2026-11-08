/* ============================================================
   ATALHOS DA FICHA — Habilidade, Magia e Item flutuantes
   ============================================================
   "Assim como hoje existe um ícone flutuante de dado, tenha ícones de
   habilidade, magia, item. Quase como um atalho." (usuário, 12/09/2026)

   Por que existe: as janelas de usar habilidade (HabilidadeDetalhesModal) e
   de evocar magia (MagiaDetalhesModal) estavam prontas na ficha, mas NADA as
   abria — o card lateral que as chamava saiu num redesenho antigo, e o que
   sobrou foi código morto. Fora de combate o jogador não tinha onde clicar.

   Os botões empilham na coluna direita, abaixo dos dados
   (top 16 → D20, 76 → D10, 136 em diante → estes). Cada um abre
   uma lista com busca, à esquerda do botão; escolher uma linha fecha a lista
   e entrega a chave para a ficha, que abre a janela que já existia. Nenhuma
   regra de jogo mora aqui: este componente só escolhe.

   Quem monta é a FichaPersonagem, e só para o DONO do personagem, nas abas
   Ficha e Informações. Nas abas Inventário e Loja não: ali o InventarioList
   tem a própria cópia do inventário e do estado, e gravar pelos dois lados
   ao mesmo tempo é a corrida que estado-handoff.test.js vigia. Em batalha a
   ficha nem está montada (FichaComBatalha troca pela tela de batalha), então
   os atalhos são, por construção, de fora de combate.
   ============================================================ */

const semAcentoAtalho = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* O item entra no atalho quando a janela dele mostraria "Usar" — a mesma
   condição do DetalhesItemModal (07-inventario): consumível, e não é peça de
   equipar, recipiente nem pergaminho de magia (esses têm ações próprias). */
function itemUsavelNoAtalho(cat) {
  if (!cat) return false;
  const consumivel = cat.grupo === 'Consumíveis' || cat.tipo === 'L';
  if (!consumivel) return false;
  if (cat.categoria_equip) return false;
  if (cat.armazena != null && Number(cat.armazena) > 0) return false;
  // Pergaminho (nivel_magia nulo desde 22/10/2026) e item que carrega magia: ações próprias.
  if (cat.magia) return false;
  // Flecha: quem gasta é o ataque com arco, não o jogador (14/09/2026).
  const _ehFlecha = (typeof window !== 'undefined' && window.ehFlecha) || null;
  if (_ehFlecha && _ehFlecha(cat)) return false;
  return true;
}

/* ── A DIFICULDADE EM CÍRCULOS DE COR (28/10/2026, pedido do usuário) ─────
   "Fácil amarelo, Médio laranja, Difícil vermelho, Muito Difícil azul,
   Absurdo cinza. O tooltip continua mostrando o texto."

   Os tons saem da paleta onde ela já tem a cor — ouro de lei, cobre, sangue,
   bronze apagado; só o azul é novo, no tom do índigo da Resistência Mágica.
   O QUE O BALÃO DIZ (30/10/2026, usuário: "o que significa o tooltip +20,
   +40?"). Dizia um modificador (+20, −40) que a rolagem NUNCA aplicou: o
   jogo rola 1d20 na Tabela de Resolução, na coluna do total, e a dificuldade
   é a QUALIDADE MÍNIMA que o resultado precisa alcançar (D20_QUALIDADE_MINIMA,
   02-shell/dado-d20.jsx). O balão passou a dizer isso. */
const ATALHO_DIFICULDADES = [
  { id: 'facil',         pt: 'Fácil',         en: 'Easy',      exigePt: 'Fácil ou melhor',         exigeEn: 'Easy or better',      cor: '#C9A44E' },
  { id: 'medio',         pt: 'Médio',         en: 'Medium',    exigePt: 'Médio ou melhor',         exigeEn: 'Medium or better',    cor: '#B8702E' },
  { id: 'dificil',       pt: 'Difícil',       en: 'Hard',      exigePt: 'Difícil ou melhor',       exigeEn: 'Hard or better',      cor: '#A23B2F' },
  { id: 'muito_dificil', pt: 'Muito difícil', en: 'Very hard', exigePt: 'Muito Difícil ou melhor', exigeEn: 'Very Hard or better', cor: '#3E5A96' },
  { id: 'absurdo',       pt: 'Absurdo',       en: 'Absurd',    exigePt: 'Absurdo',                 exigeEn: 'Absurd',              cor: '#6B6256' },
];

/* `verbo` é o que o rodapé da janela confirma (28/10/2026): rolar a
   habilidade, usar o item. Fica na tabela do tipo porque é propriedade do
   tipo, não do componente. */
const ATALHOS_TIPOS = [
  { id: 'habilidade', icone: 'ti-brain', pt: 'Habilidades', en: 'Skills',
    verbo: 'Rolar', verboEn: 'Roll',
    buscaPt: 'Buscar habilidade', buscaEn: 'Search skill',
    vazioPt: 'Nenhuma habilidade encontrada.', vazioEn: 'No skill found.' },
  { id: 'magia', icone: 'ti-comet', pt: 'Magias', en: 'Spells',
    verbo: 'Evocar', verboEn: 'Cast',
    buscaPt: 'Buscar magia', buscaEn: 'Search spell',
    vazioPt: 'Nenhuma magia encontrada.', vazioEn: 'No spell found.' },
  { id: 'item', icone: 'ti-flask', pt: 'Itens', en: 'Items',
    verbo: 'Usar', verboEn: 'Use',
    buscaPt: 'Buscar item', buscaEn: 'Search item',
    vazioPt: 'Nenhum item encontrado.', vazioEn: 'No item found.' },
];

/* Props:
   - habilidades: [{ key, nome, grupo, total }]
   - magias:      [{ key, nome, nivel, descricao, alcance, duracao,
                     niveis: [{ n, titulo, valor }] }]
   - magiaPasso(key, nivel) → { karma, nota, alvos, ritual, bloqueio, euId,
                                semAlvo } — a REGRA da magia, calculada na
     ficha, onde moram os dados (ver magiaPassoDoAtalho em ficha.jsx)
   - itens:       [{ id, nome, quantidade, icone }]
   - onHabilidade(key) / onMagia(key) / onItem(id)
   Lista vazia = botão não aparece (PJ sem magia não ganha um atalho morto). */
/* O ModalShell mora no shell (fase 10, carregada antes desta) e chega pelo
   window, como os demais globais do projeto. */
/* DIRETO NO PASSO (02/11/2026): as páginas de casas (paginas-ficha.jsx)
   abrem a janela já no detalhe — `direto` = { tipo, id } —, sem os botões
   (`semBotoes`) e sem a lista: o Voltar do rodapé fecha, e `onFecharDireto`
   avisa quem abriu. */
function AtalhosFicha({ lang, habilidades = [], magias = [], itens = [], onHabilidade, onMagia, onItem, magiaPasso, naBarra = false, semBotoes = false, direto = null, onFecharDireto }) {
  const _ModalShell = (typeof window !== 'undefined' && window.ModalShell) || null;
  const _QtdStep = (typeof window !== 'undefined' && window.QuantidadeStepper) || null;
  const en = lang === 'en';
  const [aberto, setAberto] = React.useState(null);   // 'habilidade' | 'magia' | 'item' | null
  /* O SEGUNDO PASSO DA MESMA JANELA (28/10/2026, pedido do usuário: "refazer
     os modais ... um novo layout mais próximo do modal de atividades").

     Era assim: a lista fechava e uma SEGUNDA janela abria por cima, com o
     detalhe. O jogador perdia o lugar, e voltar à lista significava reabrir o
     atalho e procurar de novo. Agora a janela TROCA de passo — e o rodapé,
     que é onde o sistema confirma, ganha [Voltar] e o verbo.

     `foco` é a linha escolhida; `dificuldade`, a escolha que o segundo passo
     pede na habilidade. */
  const [foco, setFoco] = React.useState(null);
  const [dificuldade, setDificuldade] = React.useState(null);
  /* A magia escolhe duas coisas: o NÍVEL em que se evoca (o karma sai dele) e
     o ALVO. `nivel` começa no maior que o personagem tem — é o caso comum —
     e `alvo` começa vazio de propósito: evocar no colega sem querer manda um
     pedido para a fila do Mestre. */
  const [nivel, setNivel] = React.useState(null);
  const [alvo, setAlvo] = React.useState(null);
  /* Karma na coluna da magia de dano (07/11/2026): soma ao do nível, e a
     coluna do ataque é ele. Volta a zero quando o nível ou a magia mudam. */
  const [karmaColuna, setKarmaColuna] = React.useState(0);
  React.useEffect(() => { setKarmaColuna(0); }, [nivel, foco]);
  const [tipDif, abrirTipDif, fecharTipDif, manterTipDif] = useTooltip(60);
  const [busca, setBusca] = React.useState('');
  const rootRef = React.useRef(null);
  const buscaRef = React.useRef(null);
  const [tip, abrirTip, fecharTip, manterTip] = useTooltip(60);

  const listas = { habilidade: habilidades, magia: magias, item: itens };
  const visiveis = ATALHOS_TIPOS.filter((t) => (listas[t.id] || []).length > 0);

  // Fecha no Esc e no clique fora — o mesmo trato dos demais flutuantes.
  React.useEffect(() => {
    if (!aberto) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setAberto(null); };
    /* O clique fora só vale para a folha ancorada (.at-panel). Com o modal,
       quem fecha é o "x", o Esc e o véu do ModalShell — e o modal vai por
       portal, então estaria SEMPRE "fora" deste rootRef: o primeiro clique
       dentro dele fecharia a lista. */
    const onDown = _ModalShell
      ? null
      : (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setAberto(null); };
    document.addEventListener('keydown', onKey);
    if (onDown) document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (onDown) document.removeEventListener('mousedown', onDown);
    };
  }, [aberto]);

  React.useEffect(() => { if (direto) setAberto(direto.tipo); }, [direto]);

  // Busca limpa a cada lista aberta, e o cursor já vai para ela.
  React.useEffect(() => {
    setBusca('');
    setDificuldade(null);
    setAlvo(null);
    const d = direto && aberto === direto.tipo
      ? (listas[aberto] || []).find((l) => (aberto === 'item' ? l.id : l.key) === direto.id) || null
      : null;
    setFoco(d);
    setNivel(d && aberto === 'magia' ? (d.nivel || null) : null);
    if (aberto && !d && buscaRef.current) buscaRef.current.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, direto]);

  // A lista aberta pode sumir (último item usado): fecha em vez de ficar órfã.
  React.useEffect(() => {
    if (aberto && !(listas[aberto] || []).length) setAberto(null);
  });

  if (!visiveis.length) return null;

  const alternar = (id) => { fecharTip(); setAberto((cur) => (cur === id ? null : id)); };

  const fechar = () => {
    setAberto(null); setFoco(null); setDificuldade(null); setNivel(null); setAlvo(null);
    if (direto && onFecharDireto) onFecharDireto();
  };
  /* Voltar à lista: limpa o que o passo pediu, não o que a lista mostra.
     Aberta direto, não há lista para onde voltar: fecha. */
  const voltar = () => {
    if (direto) { fechar(); return; }
    setFoco(null); setDificuldade(null); setNivel(null); setAlvo(null);
  };
  const escolher = (tipo, id, extra) => {
    fechar();
    if (tipo === 'habilidade' && onHabilidade) onHabilidade(id, extra);
    if (tipo === 'magia' && onMagia) onMagia(id, extra);
    if (tipo === 'item' && onItem) onItem(id);
  };
  /* Habilidade e item já têm o passo de detalhe; a magia entra em seguida —
     é a que carrega regra de verdade (alvo, nível, karma, milagre bloqueado)
     e não cabe na mesma leva que uma troca de layout. */
  const temPasso = (tipo) => tipo === 'habilidade' || tipo === 'item' || tipo === 'magia';
  /* Abrir o detalhe de uma linha: a magia já chega com o nível dela armado. */
  const abrirFoco = (tipo, l) => {
    setFoco(l); setDificuldade(null); setAlvo(null);
    setNivel(tipo === 'magia' ? (l.nivel || null) : null);
  };

  const indiceAberto = visiveis.findIndex((t) => t.id === aberto);
  const tipoAberto = indiceAberto >= 0 ? visiveis[indiceAberto] : null;
  /* Só a habilidade PEDE algo antes de agir. O item usa direto: o que ele faz
     já está escrito no quadro, e perguntar de novo seria confirmar duas
     vezes. Depois de `tipoAberto`, porque depende dele. */
  /* "N" sem compra (30/10/2026): a habilidade não rola, e a janela diz por
     quê no lugar do "Escolha a dificuldade". */
  const faltaHabilidade = foco && tipoAberto && tipoAberto.id === 'habilidade' ? (foco.bloqueio || null) : null;
  const faltaEscolher = !!(foco && tipoAberto && tipoAberto.id === 'habilidade' && !dificuldade && !faltaHabilidade);
  /* A REGRA DA MAGIA vem da ficha (magiaPasso): aqui só se desenha. Depois de
     `nivel`, porque o nível escolhido muda o karma e o bloqueio do animal. */
  const passoMag = foco && tipoAberto && tipoAberto.id === 'magia' && typeof magiaPasso === 'function'
    ? magiaPasso(foco.key, nivel) : null;
  /* UM MOTIVO SÓ, na ordem em que o jogador tropeça neles. A trava é a mesma
     do `podeEvocar` da janela antiga — milagre bloqueado, ritual sem itens,
     nível e alvo —, agora com o porquê escrito na linha. */
  /* O que a coluna pode levar: o karma que sobra depois do nível. Sem o
     karma de agora (quem não é o dono), não há teto. */
  const karmaLivreMag = passoMag && passoMag.deDano && passoMag.dono !== false && Number.isFinite(passoMag.karmaAtual)
    ? Math.max(0, passoMag.karmaAtual - (passoMag.karma || 0)) : Infinity;
  const kColunaMag = passoMag && passoMag.deDano ? Math.min(karmaColuna, karmaLivreMag) : 0;
  const karmaTotalMag = passoMag ? (passoMag.karma || 0) + (passoMag.dono === false ? 0 : kColunaMag) : 0;
  const faltaMagia = !passoMag ? null
    : passoMag.bloqueio ? passoMag.bloqueio
    : (passoMag.ritual && !passoMag.ritual.ok)
      ? (en ? 'Missing items for the ritual.' : 'Faltam itens para o ritual.')
    : !nivel ? (en ? 'Choose the level.' : 'Escolha o nível.')
    : (!passoMag.semAlvo && !alvo) ? (en ? 'Choose the target.' : 'Escolha o alvo.')
    : (alvo && alvo.bloqueio) ? alvo.bloqueio
    : null;

  let linhas = [];
  if (tipoAberto) {
    const termo = semAcentoAtalho(busca.trim());
    linhas = [...(listas[tipoAberto.id] || [])]
      .filter((l) => !termo || semAcentoAtalho(l.nome).includes(termo)
        || (l.grupo && semAcentoAtalho(l.grupo).includes(termo)))
      .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt'));
  }

  /* O número de cada linha vem com o NOME do que ele é (pedido do usuário,
     12/09/2026): "Total" na habilidade, "Nível" na magia, "Quantidade" no
     item. Sozinho, o número não dizia de onde vinha. */
  /* SÓ O NÚMERO desde 26/09/2026 ("'QUANTIDADE 30' vira 'x30'. Em magia fica
     '9'. Em habilidade fica '-10'"): o rótulo sai; o item ganha o "x" da
     quantidade, que é o que distingue as três leituras. O nome continua no
     aria-label, para quem usa leitor de tela. */
  const metaDaLinha = (tipo, l) => {
    if (tipo === 'habilidade') return l.total != null ? { lbl: 'Total', val: String(l.total) } : null;
    if (tipo === 'magia') return l.nivel != null ? { lbl: en ? 'Level' : 'Nível', val: String(l.nivel) } : null;
    return l.quantidade != null ? { lbl: en ? 'Quantity' : 'Quantidade', val: 'x' + l.quantidade } : null;
  };

  return (
    <div className={'menestrel-ui at-root' + (naBarra ? ' mc-acao-grupo' : '')} ref={rootRef}>
      {!semBotoes && visiveis.map((t, i) => {
        const rotulo = en ? t.en : t.pt;
        const ativo = aberto === t.id;
        return (
          <button
            key={t.id}
            type="button"
            className={'at-fab' + (ativo ? ' is-aberto' : '')}
            style={{ '--at-i': i }}
            onClick={() => alternar(t.id)}
            aria-label={rotulo}
            aria-expanded={ativo}
            data-atalho={t.id}
            {...(ativo || naBarra ? {} : propsTip(abrirTip, fecharTip, rotulo))}
          >
            <i className={'ti ' + t.icone} aria-hidden="true" />
            {naBarra && <span className="mc-acao-rotulo">{rotulo}</span>}
          </button>
        );
      })}

      {/* MODAL, não painel flutuante (26/10/2026, pedido do usuário): "na ficha
          do personagem, quando eu clico em habilidades, magias, etc, deve
          abrir modal". A lista é a mesma; o que muda é a moldura — o
          ModalShell do sistema, com véu, título, Esc e trava de rolagem, no
          lugar da folha ancorada no botão.

          O título volta aqui: no painel, o botão aceso ao lado dizia qual
          lista estava aberta; no modal, que nasce no meio da tela longe do
          trilho, nada diria. */}
      {/* POR PORTAL, no body (26/10/2026): os atalhos moram no trilho, que é
          descendente do .fp-card — e o cartão tem `zoom` nas telas grandes,
          o que cria contexto de empilhamento próprio. Dentro dele o modal
          ficava ATRÁS da ficha (medido: elementFromPoint no meio do modal
          devolvia .fp3-regiao). No body ele volta a ser a camada de cima, e
          de quebra escapa do `pointer-events: none` da casa dos atalhos. */}
      {tipoAberto && _ModalShell && ReactDOM.createPortal(
        <_ModalShell
          /* Sem seta no título: quem volta é o rodapé, como em Atividades. */
          title={<><i className={'ti ' + tipoAberto.icone + ' det-title-ic'} aria-hidden="true" />{' '}{foco ? foco.nome : (en ? tipoAberto.en : tipoAberto.pt)}</>}
          lang={lang}
          size="sm"
          extraClass={'modal-atalho' + (foco ? ' modal-uso' : '')}
          onClose={fechar}
          {...(foco ? {
            onCancel: voltar,
            // Aberta direto da página, não há lista atrás: o botão fecha.
            cancelLabel: direto ? (en ? 'Cancel' : 'Cancelar') : (en ? 'Back' : 'Voltar'),
            /* O `extra` é do TIPO: a habilidade entrega a dificuldade, a magia
               entrega nível e alvo. Um objeto só, com os campos dos dois,
               passaria `nivel: null` para toda rolagem de habilidade. */
            onConfirm: () => escolher(tipoAberto.id, tipoAberto.id === 'item' ? foco.id : foco.key,
              tipoAberto.id === 'magia'
                /* Alcance pessoal não pergunta o alvo: o único é ele mesmo, e
                   é ele que segue para a evocação. */
                ? { nivel, alvo: alvo || (passoMag && passoMag.semAlvo ? passoMag.alvos[0] : null),
                    ...(passoMag && passoMag.deDano ? { karmaColuna: kColunaMag } : {}) }
                : { dificuldade }),
            confirmLabel: en ? tipoAberto.verboEn : tipoAberto.verbo,
            confirmDisabled: faltaEscolher || !!faltaMagia || !!faltaHabilidade,
          } : {})}
        >
        {foco ? (
          /* ── O PASSO DO DETALHE ────────────────────────────────────────
             A ordem é a da janela de Atividades: frase, quadro, escolha. O
             número de 20px é só dos DÍGITOS; o resto do texto é 16. */
          <div className="mn-janela-corpo">
            {foco.descricao && <p className="mn-janela-frase">{foco.descricao}</p>}
            {foco.restricao && <p className="mn-janela-frase mn-janela-nota">{foco.restricao}</p>}

            {tipoAberto.id === 'magia' && passoMag ? (
              <>
                {/* O quadro diz o que a magia CUSTA e por quanto tempo vale.
                    Karma é número (20px); alcance e duração são palavra. */}
                <dl className="mn-janela-quadro">
                  <div className="mn-janela-linha"><dt>{en ? 'Karma' : 'Karma'}</dt><dd>{karmaTotalMag}</dd></div>
                  {foco.alcance && (
                    <div className="mn-janela-linha is-texto">
                      <dt>{en ? 'Range' : 'Alcance'}</dt><dd>{foco.alcance}</dd>
                    </div>
                  )}
                  {foco.duracao && (
                    <div className="mn-janela-linha is-texto">
                      <dt>{en ? 'Duration' : 'Duração'}</dt><dd>{foco.duracao}</dd>
                    </div>
                  )}
                </dl>

                {/* O NÍVEL, em discos de um dígito. Só os aprendidos entram —
                    e é o nível que define o karma, por isso ele vem antes do
                    alvo. Sem nenhum nível escrito no catálogo, a seção não
                    aparece: um rótulo "Nível" sem disco embaixo é um buraco,
                    não uma escolha. */}
                {!!(foco.niveis || []).length && (
                <section className="mn-janela-escolha">
                  <h4 className="mn-rotulo">{en ? 'Level' : 'Nível'}</h4>
                  <div className="mn-janela-pilulas">
                    {(foco.niveis || []).map((nv) => (
                      <button key={nv.n} type="button"
                        className="mn-janela-pilula mn-janela-pilula--disco"
                        aria-pressed={nivel === nv.n}
                        onClick={() => { setNivel(nv.n); setAlvo(null); }}>
                        {nv.n}
                      </button>
                    ))}
                  </div>
                  {(() => {
                    const nv = (foco.niveis || []).find((x) => x.n === nivel);
                    if (!nv) return null;
                    return (
                      <p className="mn-janela-detalhe">
                        {nv.titulo}{nv.titulo && nv.valor ? ' — ' : ''}{nv.valor}
                      </p>
                    );
                  })()}
                </section>
                )}

                {/* KARMA NA COLUNA (07/11/2026): só na magia que causa dano.
                    "O karma define a coluna de ataque da magia, sem limite." */}
                {passoMag.deDano && !!nivel && (
                  <section className="mn-janela-escolha">
                    <h4 className="mn-rotulo">{en ? 'Karma on the column' : 'Karma na coluna'}</h4>
                    <div className="karma-coluna">
                      {_QtdStep && <_QtdStep value={kColunaMag} min={0} max={karmaLivreMag}
                        onChange={setKarmaColuna} label={en ? 'Karma on the column' : 'Karma na coluna'} />}
                      {Number.isFinite(karmaLivreMag) && karmaLivreMag > 0 && kColunaMag < karmaLivreMag && (
                        <button type="button" className="karma-coluna-max" onClick={() => setKarmaColuna(karmaLivreMag)}>
                          {en ? 'All' : 'Tudo'}
                        </button>
                      )}
                    </div>
                  </section>
                )}

                {/* ALVO: fora quando o alcance é pessoal (28/10/2026, usuário:
                    "magias de alcance pessoal não precisam escolher alvo").
                    "Em mim" é o primeiro da lista porque é o caso comum — e é
                    o único que a ficha aplica na hora; o resto vai para a fila
                    do Mestre.

                    Só o PRIMEIRO NOME na pílula, e "Eu" no lugar de "Em mim"
                    (30/10/2026, pedido do usuário). O alvo entregue ao
                    lançamento segue com o nome inteiro.

                    Fora também quando a lista é VAZIA: num milagre em quem
                    não pode recebê-lo (sem religião, vampiro, lobisomem)
                    todos saem da lista, e um rótulo "Alvo" sem pílula embaixo
                    não escolhe nada — quem explica é a linha de brasa. */}
                {!passoMag.semAlvo && !!passoMag.alvos.length && (
                  <section className="mn-janela-escolha">
                    <h4 className="mn-rotulo">{en ? 'Target' : 'Alvo'}</h4>
                    <div className="mn-janela-pilulas">
                      {passoMag.alvos.map((a) => (
                        <button key={a.id} type="button" className="mn-janela-pilula"
                          aria-pressed={!!(alvo && alvo.id === a.id)}
                          disabled={!!a.bloqueio}
                          onClick={() => setAlvo(a)}>
                          {String(a.id) === passoMag.euId ? (en ? 'Me' : 'Eu') : String(a.nome || '').trim().split(/\s+/)[0]}
                          {a.bloqueio ? ' · ' + a.bloqueio : ''}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {/* O RITUAL, com o que sai da mochila — ou o que falta. */}
                {passoMag.ritual && (
                  <section className="mn-janela-grupo">
                    <h4 className="mn-rotulo">{en ? 'Ritual' : 'Ritual'}</h4>
                    <p className="mn-janela-detalhe">
                      {passoMag.ritual.ok
                        ? (en ? 'Casting consumes: ' : 'Evocar consome: ')
                          + passoMag.ritual.gastos.map((g) => g.nome + ' ×' + g.qtd).join(', ')
                        : (en ? 'Missing: ' : 'Faltam: ')
                          + passoMag.ritual.faltam.map((f) => f.nome + ' (' + f.tem + '/' + f.precisa + ')').join(', ')}
                    </p>
                  </section>
                )}

                {/* ONDE O EFEITO POUSA. Sem nota, a magia resolve aqui e o
                    karma sai agora; com nota, ela diz quem resolve — a
                    batalha, o Mestre ou a mesa. */}
                <p className="mn-janela-detalhe">
                  {passoMag.dono === false
                    /* O Mestre na ficha do jogador: o Evocar dele registra, e
                       só. Dizer "gasta karma" ali seria mentira. */
                    ? (en
                      ? 'Only the sheet owner spends karma and takes the effect; casting from here is just logged at the table.'
                      : 'Só o dono da ficha gasta karma e recebe o efeito; daqui a evocação fica apenas registrada na mesa.')
                    : passoMag.nota
                    ? passoMag.nota
                    /* Magia de dano: o ataque sai na coluna do karma, e a mesa
                       resolve o dano (07/11/2026). */
                    : passoMag.deDano
                    ? (en
                      ? <>Casting spends <strong>{karmaTotalMag}</strong> karma ({passoMag.karma} level + {kColunaMag} column) and attacks on column <strong>{kColunaMag}</strong>; resolve the damage at the table.</>
                      : <>Evocar gasta <strong>{karmaTotalMag}</strong> de karma ({passoMag.karma} do nível + {kColunaMag} da coluna) e ataca na coluna <strong>{kColunaMag}</strong>; o dano se resolve na mesa.</>)
                    /* Magia emprestada por item (06/11/2026): não gasta karma. */
                    : passoMag.item
                    ? (en
                      ? <>The spell comes from <strong>{passoMag.item}</strong>: casting spends no karma.</>
                      : <>A magia vem de <strong>{passoMag.item}</strong>: evocar não gasta karma.</>)
                    : (alvo && String(alvo.id) !== passoMag.euId
                      ? (en
                        ? <>Casting spends <strong>{passoMag.karma}</strong> karma; the GM applies the effect on the target.</>
                        : <>Evocar gasta <strong>{passoMag.karma}</strong> de karma; o Mestre aplica o efeito no alvo.</>)
                      : (en
                        ? <>Casting spends <strong>{passoMag.karma}</strong> karma and applies the effect to you right away.</>
                        : <>Evocar gasta <strong>{passoMag.karma}</strong> de karma e aplica o efeito em você na hora.</>))}
                </p>
              </>
            ) : tipoAberto.id === 'item' ? (
              <>
                <dl className="mn-janela-quadro">
                  <div className="mn-janela-linha">
                    <dt>{en ? 'Quantity' : 'Quantidade'}</dt><dd>{'x' + foco.quantidade}</dd>
                  </div>
                  {/* O efeito em NÚMEROS, não em prosa: é o que o jogador vem
                      conferir antes de gastar a última poção. Vem de
                      efeitosEmNumeros (01-core/inventario-helpers). */}
                  {(foco.efeitos || []).map(([rot, val]) => (
                    <div key={rot} className="mn-janela-linha"><dt>{rot}</dt><dd>{val}</dd></div>
                  ))}
                </dl>
                {/* A frase do efeito só existe quando HÁ efeito: um item sem
                    número nenhum (material de ofício que caiu no atalho)
                    ficava prometendo "aplica o efeito em você" sem ter
                    efeito algum. Promessa que a janela não cumpre é pior que
                    uma linha a menos. */}
                <p className="mn-janela-detalhe">
                  {(foco.efeitos || []).length
                    ? (en
                      ? <>Using spends <strong>one unit</strong> and applies the effect to you right away.</>
                      : <>Usar gasta <strong>uma unidade</strong> e aplica o efeito em você na hora.</>)
                    : (en
                      ? <>Using spends <strong>one unit</strong>.</>
                      : <>Usar gasta <strong>uma unidade</strong>.</>)}
                </p>
              </>
            ) : (
            <>
            <dl className="mn-janela-quadro">
              <div className="mn-janela-linha"><dt>{en ? 'Total' : 'Total'}</dt><dd>{foco.total}</dd></div>
              {foco.ajuste && (
                <div className="mn-janela-linha is-texto">
                  <dt>{en ? 'Attribute' : 'Atributo'}</dt><dd>{foco.ajuste}</dd>
                </div>
              )}
              {foco.grupo && (
                <div className="mn-janela-linha is-texto">
                  <dt>{en ? 'Group' : 'Grupo'}</dt><dd>{foco.grupo}</dd>
                </div>
              )}
            </dl>
            {!faltaHabilidade && <section className="mn-janela-escolha">
              <h4 className="mn-rotulo">{en ? 'Difficulty' : 'Dificuldade'}</h4>
              <div className="mn-janela-cores" role="radiogroup" aria-label={en ? 'Difficulty' : 'Dificuldade'}>
                {ATALHO_DIFICULDADES.map((d) => {
                  const nome = en ? d.en : d.pt;
                  const exige = en ? `Needs a result of ${d.exigeEn}` : `Exige resultado ${d.exigePt}`;
                  return (
                    <button key={d.id} type="button" className="mn-janela-cor"
                      role="radio" aria-checked={dificuldade === d.id}
                      aria-label={`${nome} — ${exige}`}
                      style={{ '--cor': d.cor }}
                      onClick={() => { fecharTipDif(); setDificuldade(d.id); }}
                      /* Só o NOME no balão (30/10/2026, usuário: "Remova os
                         tooltips que não dizem nada em habilidades"): a
                         segunda linha (era o "+20") saiu; o que a dificuldade
                         exige vem no texto abaixo dos discos, ao escolher. */
                      {...propsTip(abrirTipDif, fecharTipDif, nome)}>
                      <span className="mn-janela-cor-disco" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
              <Tooltip tip={tipDif} onEnter={manterTipDif} onLeave={fecharTipDif} />
              {dificuldade && (() => {
                /* A frase do usuário (30/10/2026): "Faça um teste na coluna -7,
                   você precisa de um resultado médio ou melhor." O que ela diz
                   exigir já é o EFETIVO: a armadura da restrição sobe um grau. */
                const i = ATALHO_DIFICULDADES.findIndex((x) => x.id === dificuldade);
                const j = Math.min(ATALHO_DIFICULDADES.length - 1, i + (Number(foco.passosArmadura) || 0));
                const d = ATALHO_DIFICULDADES[j];
                return (
                  <p className="mn-janela-detalhe">
                    {en
                      ? <>Make a test on column <strong>{foco.total}</strong>; you need a result of <strong>{d.exigeEn.toLowerCase()}</strong>.</>
                      : <>Faça um teste na coluna <strong>{foco.total}</strong>, você precisa de um resultado <strong>{d.exigePt.toLowerCase()}</strong>.</>}
                  </p>
                );
              })()}
            </section>}
            </>
            )}

            {/* Bloqueado diz por quê, na própria linha. */}
            {faltaEscolher && (
              <p className="mn-janela-falta">{en ? 'Choose the difficulty.' : 'Escolha a dificuldade.'}</p>
            )}
            {faltaMagia && <p className="mn-janela-falta">{faltaMagia}</p>}
            {faltaHabilidade && <p className="mn-janela-falta">{faltaHabilidade}</p>}
          </div>
        ) : (
        <>
          <div className="at-busca-wrap">
            <i className="ti ti-eye busca-ic" aria-hidden="true" />
            <input
              ref={buscaRef}
              type="text"
              className="at-busca"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={en ? 'Search' : 'Buscar'}
              aria-label={en ? tipoAberto.buscaEn : tipoAberto.buscaPt}
            />
          </div>
          <div className="at-lista" role="list">
            {linhas.length === 0 ? (
              <p className="at-vazio">{en ? tipoAberto.vazioEn : tipoAberto.vazioPt}</p>
            ) : linhas.map((l) => {
              const id = tipoAberto.id === 'item' ? l.id : l.key;
              const meta = metaDaLinha(tipoAberto.id, l);
              return (
                <button key={id} type="button" role="listitem" className="at-linha"
                  onClick={() => (temPasso(tipoAberto.id) ? abrirFoco(tipoAberto.id, l) : escolher(tipoAberto.id, id))}>
                  {/* O ÍCONE SAIU (27/10/2026, pedido do usuário: "ao clicar
                      em 'itens' do trilho superior, remova o ícone ao lado do
                      nome"). Ele só aparecia na lista de ITENS — as outras
                      quatro (magias, técnicas, habilidades, status) nunca o
                      tiveram —, e um glifo genérico por linha dizia menos
                      sobre o item do que o nome ao lado dele já diz.

                      Só o nome: o grupo embaixo era ruído (pedido do usuário,
                      12/09/2026). A busca continua casando pelo grupo. */}
                  <span className="at-linha-texto">
                    <span className="at-linha-nome">{l.nome}</span>
                  </span>
                  {meta && (
                    <span className="at-linha-meta" aria-label={meta.lbl + ': ' + meta.val}>
                      <span className="at-linha-meta-val">{meta.val}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
        )}
        </_ModalShell>,
        /* Na raiz do app, NÃO no body: todo o CSS do sistema é escopado em
           `#root .menestrel-ui`, e no body o modal saía sem pele nenhuma.
           Mesmo alvo que o shell usa para a janela do Livro de Regras. */
        document.querySelector('#root .menestrel-ui') || document.body,
      )}
      {/* À esquerda (26/09/2026): os botões moram na borda direita da tela. */}
      <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} esquerda />
    </div>
  );
}

Object.assign(window, { AtalhosFicha, itemUsavelNoAtalho, ATALHO_DIFICULDADES });
