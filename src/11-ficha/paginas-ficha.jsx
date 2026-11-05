/* ============================================================
   [11] AS PÁGINAS DE CASAS DA FICHA
   ============================================================
   Pedido do usuário (02/11/2026):
     "As páginas status, atividades, habilidades, magias, companheiros,
      amigos, vão abrir uma página igual 'inventário', com casas para
      selecionar o conteúdo, e mostrar os detalhes do conteúdo à direita, com
      os botões de ações em forma de leque. Dessa forma, não precisamos mais
      do menu 'itens', pois os itens estarão no menu 'inventário'."

   Era uma janela por botão do trilho (a lista e um segundo passo). Agora é a
   página do Inventário, da Loja e do Fabricar: a mesma grade de casas, o
   mesmo leque e o mesmo painel à direita. Um gesto só para tudo o que se
   escolhe numa lista.

   PaginaCasas é a moldura; cada página diz o que mora nas casas, o que o
   painel conta e quais ações o leque oferece. Nenhuma regra de jogo mora
   aqui: as páginas desenham e devolvem a intenção para a ficha, que é quem
   rola, evoca, aplica e grava.
   ============================================================ */

/* O ícone do grupo de habilidade, para a casa ter o que mostrar: habilidade
   não tem pintura. */
const ICONE_GRUPO_HAB = {
  'Profissional': 'ti-tools',
  'Subterfúgio': 'ti-spy',
  'Manobra': 'ti-run',
  'Influência': 'ti-message-circle',
  'Conhecimento': 'ti-book-2',
  'Geral': 'ti-star',
};

const semAcentoPagina = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* ── PaginaCasas — a moldura comum ─────────────────────────────────────────
   casas: [{ id, nome, sub?, busca?, icone (nó), marca?, apagada?, acesa? }]
   acoesDe(casa) → as ações do leque ({ chave, icone, rotulo, cor?, texto?,
     desativado?, dica?, perigo? }); lista vazia = só leitura.
   onAcao(casa, chave) — a página resolve.
   painelDe(casa) → o corpo do painel (o cabeçalho é da moldura). */
function PaginaCasas({
  lang, casas, acoesDe, onAcao, painelDe, vazioTxt, escolhaTxt, buscaRotulo,
  painelRotulo, classe = '', selInicial = null,
  // O que a página diz no trilho de cima (os pontos de Técnicas e Magias).
  noTrilho = null,
}) {
  const en = lang === 'en';
  const [busca, setBusca] = useState('');
  const [sel, setSel] = useState(selInicial);
  const [aberta, setAberta] = useState(null);   // id da janela (tela estreita)
  const [leque, setLeque] = useState(null);     // { id, ancora }
  const [tip, abrirTip, fecharTip, manterTip] = usePortalTooltip(60);
  const [setGridEl, grade] = (window.useGridDimensions || (() => [() => {}, { cols: 10 }]))();
  // O painel ao lado só cabe a partir de 1180px — a régua do Inventário.
  const [larga, setLarga] = useState(() => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(min-width: 1180px)').matches);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const m = window.matchMedia('(min-width: 1180px)');
    const f = () => setLarga(m.matches);
    m.addEventListener ? m.addEventListener('change', f) : m.addListener(f);
    return () => { m.removeEventListener ? m.removeEventListener('change', f) : m.removeListener(f); };
  }, []);
  // A busca mora no trilho único da ficha, como a do Inventário.
  const alvoTrilho = (window.useAlvoPortal || (() => null))('fp-trilho-slot');
  const { Input } = (typeof UI !== 'undefined' ? UI : {});

  const q = semAcentoPagina(busca.trim());
  const visiveis = (casas || []).filter((c) => !q
    || semAcentoPagina(c.nome).includes(q) || (c.busca && semAcentoPagina(c.busca).includes(q)));

  const achar = (id) => (id == null ? null : (casas || []).find((c) => c.id === id) || null);
  const selC = achar(sel);
  const abertaC = achar(aberta);
  const lequeC = leque ? achar(leque.id) : null;
  const Leque = window.LequeDoItem || null;
  const Shell = (typeof ModalShell !== 'undefined' && ModalShell) || window.ModalShell || null;

  const COLS = grade.cols || 10;
  const total = Math.max(grade.totalSlots || COLS * (window.LINHAS_BAU || 8), Math.ceil((visiveis.length + 1) / COLS) * COLS);

  const trilho = (
    <div className="cartoes-barra inv-trilho pc-barra">
      <div className="best-header-acoes">
        <div className="best-search">
          <i className="ti ti-eye busca-ic" aria-hidden="true" />
          {Input ? (
            <Input type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder={en ? 'Search' : 'Buscar'} aria-label={buscaRotulo} />
          ) : (
            <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder={en ? 'Search' : 'Buscar'} aria-label={buscaRotulo} />
          )}
        </div>
      </div>
    </div>
  );

  const cabecalho = (c) => (
    /* Só o nome, sem o ícone ao lado (02/11/2026, usuário: "No card de
       visualização, não teremos o ícone junto com o nome, mesmo padrão de
       inventário/loja"). */
    <div className="loja-painel-cab pc-painel-cab">
      <div>
        <h3 className="loja-painel-nome">{c.nome}</h3>
        {c.sub && <p className="loja-painel-sub">{c.sub}</p>}
      </div>
    </div>
  );

  const clicar = (c, ancora) => {
    fecharTip();
    if (larga) setSel(c.id);
    const acoes = (acoesDe ? acoesDe(c) : []) || [];
    // Sem ação e com painel, o clique só escolhe; na tela estreita abre a janela.
    if (!acoes.length) { if (!larga) setAberta(c.id); return; }
    setLeque({ id: c.id, ancora });
  };

  return (
    <div className={'loja pc-pagina ' + classe}>
      {/* SEM BUSCA NO TRILHO (02/11/2026, usuário: "Remova o botão de buscar
          do trilho superior"): dentro da ficha o trilho é só a navegação. */}
      {!alvoTrilho && trilho}
      {noTrilho && (alvoTrilho && typeof ReactDOM !== 'undefined' && ReactDOM.createPortal
        ? ReactDOM.createPortal(
          <div className="cartoes-barra inv-trilho"><div className="best-header-acoes">{noTrilho}</div></div>, alvoTrilho)
        : <div className="pc-trilho-solto">{noTrilho}</div>)}
      {(casas || []).length === 0 && !larga && <div className="loja-warn-empty"><span>{vazioTxt}</span></div>}
      <div className={'bau-corpo loja-bau pc-bau' + (larga ? ' bau-corpo--painel' : '')}>
        {lequeC && Leque && (
          <Leque
            acoes={[
              !larga && { chave: '__detalhes', icone: 'ti-article', rotulo: en ? 'Details' : 'Detalhes' },
              ...((acoesDe ? acoesDe(lequeC) : []) || []),
            ].filter(Boolean)}
            ancora={leque.ancora} rotulo={lequeC.nome}
            onClose={() => setLeque(null)}
            onEscolher={(a) => {
              setLeque(null);
              if (a.chave === '__detalhes') setAberta(lequeC.id);
              else if (onAcao) onAcao(lequeC, a.chave);
            }} />
        )}
        <div className="inv-grid-wrap">
          <div ref={setGridEl} className="inv-bag-grid inv-bag-grid--slots" style={{ gridTemplateColumns: `repeat(${COLS}, var(--inv-casa))` }}>
            {Array.from({ length: total }, (_, i) => {
              const c = visiveis[i];
              if (!c) return <span key={'g' + i} className="inv-slot-ghost" aria-hidden="true" />;
              return (
                <button key={c.id} type="button" data-casa={c.id}
                  className={'inv-card loja-casa pc-casa' + (sel === c.id ? ' is-sel' : '')
                    + (c.apagada ? ' is-apagada' : '') + (c.acesa ? ' is-acesa' : '')
                    + (leque && leque.id === c.id ? ' inv-card--leque' : '')}
                  aria-label={c.nome + (c.marca != null ? ' — ' + c.marca : '')}
                  aria-current={c.acesa ? 'true' : undefined}
                  aria-haspopup="menu"
                  onClick={(e) => clicar(c, e.currentTarget)}
                  onMouseEnter={(e) => abrirTip(e, { desc: c.nome })}
                  onMouseLeave={fecharTip}>
                  <span className="inv-card-ic pc-casa-ic">{c.icone}</span>
                  {c.marca != null && <span className="pc-casa-marca" aria-hidden="true">{c.marca}</span>}
                  {/* O que está valendo (status, atividade ligada, montaria,
                      pacto): um ponto de ouro no canto. */}
                  {c.acesa && <span className="pc-casa-ponto" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
        {larga && (
          <aside className="bau-painel loja-painel pc-painel" aria-label={painelRotulo}>
            {!selC ? (
              <div className="bau-painel-vazio">
                <i className="ti ti-hand-click" aria-hidden="true" />
                <p>{(casas || []).length === 0 ? vazioTxt : escolhaTxt}</p>
              </div>
            ) : (
              <div className="loja-painel-corpo">
                {cabecalho(selC)}
                {painelDe ? painelDe(selC) : null}
              </div>
            )}
          </aside>
        )}
      </div>
      {abertaC && Shell && (
        <Shell title={abertaC.nome} lang={lang} size="md" extraClass="modal-detalhes" onClose={() => setAberta(null)}>
          {painelDe ? painelDe(abertaC) : null}
        </Shell>
      )}
      <PortalTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </div>
  );
}

/* ── SUBIR NÍVEL NO LEQUE (05/11/2026) ─────────────────────────────────────
   "Pode concluir o 'subir de nível' das magias, técnicas e habilidades"
   (usuário). A ficha decide a regra e manda `subir` pronto — rótulo com o
   nível novo e o custo, apagado com o porquê quando não dá. Aqui só vira a
   ação do leque, a mesma nas três páginas. null = quem olha não compra. */
function acaoSubir(subir, onSubir) {
  if (!subir || !onSubir) return null;
  return {
    chave: '__subir', icone: subir.novo ? 'ti-school' : 'ti-arrow-big-up', rotulo: subir.rotulo,
    desativado: !!subir.desativado, dica: subir.dica ? { desc: subir.dica } : null,
  };
}

/* ── HABILIDADES ───────────────────────────────────────────────────────────
   O leque é a dificuldade: cinco discos de cor, os mesmos da janela antiga
   (ATALHO_DIFICULDADES). Escolher um rola o teste — não há segundo passo.
   Habilidade bloqueada (N sem compra) oferece o disco apagado com o porquê. */
function PaginaHabilidades({ lang, habilidades, onRolar, onSubir = null, pontos = null }) {
  const en = lang === 'en';
  const DIFS = window.ATALHO_DIFICULDADES || [];
  const casas = (habilidades || []).map((h) => ({
    id: h.key, nome: h.nome, sub: h.grupo, busca: h.grupo, h,
    icone: <i className={'ti ' + (ICONE_GRUPO_HAB[h.grupo] || 'ti-brain')} aria-hidden="true" />,
    marca: h.total != null ? String(h.total) : null,
    apagada: !!h.bloqueio,
  })).sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt'));
  return (
    <PaginaCasas lang={lang} casas={casas} classe="pc-habilidades"
      noTrilho={<SeloPontos pontos={pontos} icone="ti-bulb" rotulo={en ? 'Skill points' : 'Pontos de habilidade'} />}
      buscaRotulo={en ? 'Search skill' : 'Buscar habilidade'}
      painelRotulo={en ? 'Skill' : 'Habilidade'}
      vazioTxt={en ? 'No skills.' : 'Nenhuma habilidade.'}
      escolhaTxt={en ? 'Select a skill to see it here.' : 'Selecione uma habilidade para vê-la aqui.'}
      acoesDe={(c) => [
        ...(onRolar ? DIFS.map((d) => ({
          chave: d.id, rotulo: (en ? 'Roll · ' + d.en : 'Rolar · ' + d.pt), cor: d.cor,
          desativado: !!c.h.bloqueio, dica: c.h.bloqueio ? { desc: c.h.bloqueio } : null,
        })) : []),
        acaoSubir(c.h.subir, onSubir),
      ].filter(Boolean)}
      onAcao={(c, chave) => {
        if (chave === '__subir') { if (onSubir) onSubir(c.h.key); return; }
        if (onRolar) onRolar(c.h.key, { dificuldade: chave });
      }}
      painelDe={(c) => (
        <div className="mn-janela-corpo pc-corpo">
          {c.h.descricao && <p className="mn-janela-frase">{c.h.descricao}</p>}
          {c.h.restricao && <p className="mn-janela-frase mn-janela-nota">{c.h.restricao}</p>}
          {c.h.subir && c.h.subir.fila && <p className="mn-janela-frase mn-janela-nota">{c.h.subir.fila}</p>}
          <dl className="mn-janela-quadro">
            <div className="mn-janela-linha"><dt>Total</dt><dd>{c.h.total}</dd></div>
            <div className="mn-janela-linha"><dt>{en ? 'Level' : 'Nível'}</dt><dd>{c.h.nivel || 0}</dd></div>
            {c.h.ajuste && <div className="mn-janela-linha is-texto"><dt>{en ? 'Attribute' : 'Atributo'}</dt><dd>{c.h.ajuste}</dd></div>}
            {c.h.grupo && <div className="mn-janela-linha is-texto"><dt>{en ? 'Group' : 'Grupo'}</dt><dd>{c.h.grupo}</dd></div>}
          </dl>
          {c.h.bloqueio && <p className="mn-janela-falta">{c.h.bloqueio}</p>}
        </div>
      )} />
  );
}

/* OS PONTOS NO TOPO DA PÁGINA (04/11/2026, usuário: "Quero, adicione os
   pontos"). Moravam nas colunas do antigo Conhecimento; agora são um selo no
   trilho de Técnicas e de Magias, com a mesma conta da janela Estudar e da
   RPC (a fila de treino já foi paga). Só se lê: não é botão. Os dois números
   no mesmo corpo e peso — só o tom muda. Gasto acima do total vira brasa. */
function SeloPontos({ rotulo, icone, pontos }) {
  if (!pontos || pontos.total == null) return null;
  const excedido = pontos.gasto > pontos.total;
  return (
    <span className={'mc-acao pc-pontos' + (excedido ? ' is-excedido' : '')} role="status"
      aria-label={`${rotulo}: ${pontos.gasto} / ${pontos.total}`}>
      <i className={'ti ' + icone} aria-hidden="true" />
      <span className="mc-acao-rotulo">{rotulo}</span>
      <span className="pc-pontos-num" aria-hidden="true">{pontos.gasto}<i>/{pontos.total}</i></span>
    </span>
  );
}

/* ── TÉCNICAS (04/11/2026) ─────────────────────────────────────────────────
   "Não precisamos mais das colunas habilidades, técnicas, magias, na aba
   Conhecimento. […] adicione a aba Técnicas." (usuário) Habilidades e Magias
   já eram páginas de casas; Técnicas entra no mesmo desenho. Só leitura:
   técnica se usa na batalha, então o leque não tem verbo — o clique escolhe
   e o painel conta o que ela é. */
function PaginaTecnicas({ lang, tecnicas, pontos = null, onSubir = null }) {
  const en = lang === 'en';
  const siglas = window.siglasDeArma || ((v) => v);
  const casas = (tecnicas || []).map((t) => {
    const especializada = t.tipo === 'Especializada';
    const categoria = especializada ? (en ? 'Specialized' : 'Especializada') : (en ? 'Basic' : 'Básica');
    return {
      id: t.key, nome: t.nome, t, categoria,
      sub: categoria, busca: categoria,
      icone: <i className="ti ti-sword" aria-hidden="true" />,
      marca: t.total != null ? String(t.total) : null,
    };
  }).sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt'));
  const linhaTexto = (dt, dd) => (dd == null || dd === '' ? null : (
    <div className="mn-janela-linha is-texto"><dt>{dt}</dt><dd>{dd}</dd></div>
  ));
  return (
    <PaginaCasas lang={lang} casas={casas} classe="pc-tecnicas"
      noTrilho={<SeloPontos pontos={pontos} icone="ti-sword" rotulo={en ? 'Technique points' : 'Pontos de técnica'} />}
      buscaRotulo={en ? 'Search technique' : 'Buscar técnica'}
      painelRotulo={en ? 'Technique' : 'Técnica'}
      vazioTxt={en ? 'No techniques learned.' : 'Nenhuma técnica aprendida.'}
      escolhaTxt={en ? 'Select a technique to see it here.' : 'Selecione uma técnica para vê-la aqui.'}
      /* O único verbo de técnica fora da batalha é subir (05/11/2026). */
      acoesDe={(c) => [acaoSubir(c.t.subir, onSubir)].filter(Boolean)}
      onAcao={(c, chave) => { if (chave === '__subir' && onSubir) onSubir(c.t.key); }}
      painelDe={(c) => (
        <div className="mn-janela-corpo pc-corpo">
          {c.t.descricao && <p className="mn-janela-frase">{c.t.descricao}</p>}
          {c.t.efeito && <p className="mn-janela-frase">{c.t.efeito}</p>}
          <dl className="mn-janela-quadro">
            {c.t.total != null && <div className="mn-janela-linha"><dt>Total</dt><dd>{c.t.total}</dd></div>}
            {!!c.t.nivel && <div className="mn-janela-linha"><dt>{en ? 'Level' : 'Nível'}</dt><dd>{c.t.nivel}</dd></div>}
            {linhaTexto(en ? 'Category' : 'Categoria', c.categoria)}
            {linhaTexto(en ? 'Use' : 'Uso', c.t.uso)}
            {linhaTexto(en ? 'Weapon groups' : 'Grupos de armas', c.t.grupo_armas ? siglas(c.t.grupo_armas) : null)}
            {linhaTexto(en ? 'Cost' : 'Custo', c.t.custo)}
          </dl>
        </div>
      )} />
  );
}

/* ── MAGIAS ────────────────────────────────────────────────────────────────
   Evocar pede nível e alvo, e essa escolha já tem casa: o segundo passo da
   janela dos atalhos (AtalhosFicha, aberta direto na magia). O leque só
   chama; o painel conta o que a magia é. */
function PaginaMagias({ lang, magias, onEvocar, pontos = null, onSubir = null }) {
  const en = lang === 'en';
  const casas = (magias || []).map((m) => ({
    id: m.key, nome: m.nome, m,
    sub: (en ? 'Level ' : 'Nível ') + m.nivel,
    icone: <i className="ti ti-comet" aria-hidden="true" />,
    marca: m.nivel != null ? String(m.nivel) : null,
  })).sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt'));
  return (
    <PaginaCasas lang={lang} casas={casas} classe="pc-magias"
      noTrilho={<SeloPontos pontos={pontos} icone="ti-comet" rotulo={en ? 'Magic points' : 'Pontos de magia'} />}
      buscaRotulo={en ? 'Search spell' : 'Buscar magia'}
      painelRotulo={en ? 'Spell' : 'Magia'}
      vazioTxt={en ? 'No spells learned.' : 'Nenhuma magia aprendida.'}
      escolhaTxt={en ? 'Select a spell to see it here.' : 'Selecione uma magia para vê-la aqui.'}
      acoesDe={(c) => [
        onEvocar && { chave: 'evocar', icone: 'ti-sparkles', rotulo: en ? 'Cast' : 'Evocar' },
        acaoSubir(c.m.subir, onSubir),
      ].filter(Boolean)}
      onAcao={(c, chave) => {
        if (chave === '__subir') { if (onSubir) onSubir(c.m.key); return; }
        if (onEvocar) onEvocar(c.m.key);
      }}
      painelDe={(c) => (
        <div className="mn-janela-corpo pc-corpo">
          {c.m.descricao && <p className="mn-janela-frase">{c.m.descricao}</p>}
          <dl className="mn-janela-quadro">
            {c.m.alcance && <div className="mn-janela-linha is-texto"><dt>{en ? 'Range' : 'Alcance'}</dt><dd>{c.m.alcance}</dd></div>}
            {c.m.duracao && <div className="mn-janela-linha is-texto"><dt>{en ? 'Duration' : 'Duração'}</dt><dd>{c.m.duracao}</dd></div>}
          </dl>
          {!!(c.m.niveis || []).length && (
            <dl className="mn-janela-quadro pc-niveis">
              {c.m.niveis.map((nv) => (
                <div key={nv.n} className="mn-janela-linha is-texto">
                  <dt>{(en ? 'Level ' : 'Nível ') + nv.n}</dt>
                  <dd>{nv.titulo}{nv.titulo && nv.valor ? ' — ' : ''}{nv.valor}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )} />
  );
}

/* ── STATUS ────────────────────────────────────────────────────────────────
   Todos os status que o Mestre aplica, e os que estão valendo acesos. Só o
   Mestre age (é a regra das barras de vitalidade): aplicar abre o prazo
   (StatusPrazoModal, pela ficha); remover tira na hora. */
function PaginaStatus({ lang, lista, dataJogo, podeEditar, onAplicar, onRemover }) {
  const en = lang === 'en';
  const TIPOS = window.STATUS_MESTRE_TIPOS || [];
  const tb = ((typeof COPY !== 'undefined' ? COPY[lang] : null) || {}).batalha || {};
  const vigentes = window.statusVigentes ? window.statusVigentes(lista, dataJogo) : (lista || []);
  const tipoDe = window.tipoDoStatus || ((st) => st && st.tipo);
  const fmt = window.formatarDataFantasy || ((d) => d);
  const casas = TIPOS.map((t) => {
    const vig = vigentes.find((st) => tipoDe(st) === t.tipo) || null;
    return {
      id: t.tipo, nome: tb[t.chaveCopy] || t.chaveCopy, t, vig,
      sub: vig ? (en ? 'In effect' : 'Valendo') : null,
      icone: <i className={'ti ' + t.ic} aria-hidden="true" />,
      acesa: !!vig,
    };
  });
  return (
    <PaginaCasas lang={lang} casas={casas} classe="pc-status"
      buscaRotulo={en ? 'Search status' : 'Buscar status'}
      painelRotulo="Status"
      vazioTxt={en ? 'No status.' : 'Nenhum status.'}
      escolhaTxt={en ? 'Select a status to see it here.' : 'Selecione um status para vê-lo aqui.'}
      acoesDe={(c) => (!podeEditar ? [] : c.vig
        ? [{ chave: 'remover', icone: 'ti-x', rotulo: en ? 'Remove' : 'Remover', perigo: true }]
        : [{ chave: 'aplicar', icone: 'ti-plus', rotulo: en ? 'Apply' : 'Aplicar' }])}
      onAcao={(c, chave) => {
        if (chave === 'aplicar' && onAplicar) onAplicar(c.t);
        if (chave === 'remover' && onRemover && c.vig) onRemover(c.vig.id);
      }}
      painelDe={(c) => (
        <div className="mn-janela-corpo pc-corpo">
          <dl className="mn-janela-quadro">
            <div className="mn-janela-linha is-texto">
              <dt>{en ? 'State' : 'Situação'}</dt>
              <dd>{c.vig ? (en ? 'In effect' : 'Valendo') : (en ? 'Not applied' : 'Não aplicado')}</dd>
            </div>
            {c.vig && c.vig.vence_em && (
              <div className="mn-janela-linha is-texto"><dt>{en ? 'Until' : 'Até'}</dt><dd>{fmt(c.vig.vence_em, lang)}</dd></div>
            )}
          </dl>
        </div>
      )} />
  );
}

/* ── ATIVIDADES ────────────────────────────────────────────────────────────
   A explicação de cada uma é a da janela antiga (_AtividadeExplicacao, em
   ficha.jsx): o porquê numa frase e o que ela devolve por hora. O leque tem
   o verbo — ou "Parar", na que está ligada.

   FABRICAR É A ATIVIDADE, NÃO UMA PÁGINA (02/11/2026, usuário: "Não
   precisamos de uma página 'fabricar', pois ao clicar na atividade fabricar,
   ao lado deve aparecer as receitas que o personagem sabe, e escolher uma
   para iniciar a atividade. Não será possível iniciar a atividade sem
   selecionar a receita."). O painel de Fabricar lista as receitas
   aprendidas; a escolhida mostra o teste, o prazo e os materiais
   (ReceitaCorpo, 07-inventario/fabricar.jsx). O leque só fabrica com uma
   receita escolhida e possível — o motivo, quando não, vai no balão da
   bolha. Quem rola, paga e liga a atividade é a ficha (onFabricar). */
function PaginaAtividades({
  lang, atividade, podeEditar, onEscolher, atributos, filaDe,
  // A bancada: receitas do catálogo, o que ele aprendeu e o que tem.
  receitas, receitasAprendidas, catalogoBySlug = {}, itens, pjHabilidades, habsByKey,
  onFabricar, resultado,
}) {
  const en = lang === 'en';
  const LISTA = window.ATIVIDADES || [];
  const atual = LISTA.find((a) => a.id === (atividade && atividade.tipo)) || null;
  const nomeDe = (a) => (en ? a.en : a.pt);
  const Explicacao = window._AtividadeExplicacao || null;
  const Corpo = window.ReceitaCorpo || null;
  const [receitaSel, setReceitaSel] = useState(null);   // resultado_slug

  /* Só as aprendidas, sem ataque natural nem receita sem item no catálogo —
     o mesmo filtro que a página Fabricar tinha. */
  const natural = window.ehAtaqueNatural || (() => false);
  const aprendida = window.receitaAprendida || (() => false);
  const podeFab = window.podeFabricar || (() => ({ ok: false }));
  const minhas = (receitas || [])
    .filter((r) => aprendida(receitasAprendidas, r))
    .map((r) => ({ r, cat: catalogoBySlug[r.resultado_slug] }))
    .filter((x) => x.cat && !natural(x.cat))
    .map((x) => ({ ...x, estado: podeFab(x.r, itens, pjHabilidades, receitasAprendidas) }))
    .sort((a, b) => String(a.cat.nome).localeCompare(String(b.cat.nome), 'pt-BR'));
  const escolhida = minhas.find((x) => x.r.resultado_slug === receitaSel) || null;

  const nomeDaHab = (key) => { const h = (habsByKey || {})[key]; return (h && h.nome) || key; };
  const nomeDoMaterial = (slug) => { const c = catalogoBySlug[slug]; return (c && c.nome) || slug; };
  const difLabel = (cod) => {
    const d = (window.RESULTADOS_ACAO || []).find((x) => x.codigo === cod);
    return d ? (en ? d.en : d.pt) : cod;
  };
  const motivoLabel = (estado) => {
    if (!estado || estado.ok) return null;
    if (estado.motivo === 'sem_habilidade') return en ? 'You lack the required skill.' : 'Falta a habilidade exigida.';
    if (estado.motivo === 'sem_material') return en ? 'Not enough materials.' : 'Material insuficiente.';
    return en ? 'This cannot be crafted.' : 'Isto não se fabrica.';
  };
  // Por que o leque não fabrica: sem receita escolhida, ou a escolhida não dá.
  const travaFab = !escolhida
    ? (minhas.length ? (en ? 'Choose a recipe first.' : 'Escolha uma receita primeiro.')
                     : (en ? 'No recipes learned yet.' : 'Nenhuma receita aprendida.'))
    : motivoLabel(escolhida.estado);

  const casas = LISTA.map((a) => ({
    id: a.id, nome: nomeDe(a), a,
    sub: (atual && atual.id === a.id) ? (en ? 'Current activity' : 'Atividade atual') : (en ? a.propositoEn : a.propositoPt),
    icone: <i className={'ti ' + a.icon} aria-hidden="true" />,
    acesa: !!(atual && atual.id === a.id),
  }));

  const acaoFabricar = {
    chave: 'fabricar', icone: 'ti-hammer', rotulo: en ? 'Craft' : 'Fabricar',
    desativado: !onFabricar || !!travaFab, dica: travaFab ? { desc: travaFab } : null,
  };

  const painelDaBancada = () => (
    <>
      {resultado && (
        <div className={'loja-feedback' + (resultado.sucesso ? '' : ' loja-feedback--erro')} role="status">
          {resultado.sucesso
            ? (en ? `${resultado.nome} is on the workbench.` : `${resultado.nome} está na bancada.`)
            : (en ? `${resultado.nome} failed: the materials are gone.` : `${resultado.nome} falhou: o material foi perdido.`)}
        </div>
      )}
      <section className="mn-janela-escolha pc-receitas">
        <h4 className="mn-rotulo">{en ? 'Recipe' : 'Receita'}</h4>
        {minhas.length === 0 ? (
          <p className="mn-janela-detalhe">
            {en ? 'No recipes learned yet. Buy a "Recipe for …" in a shop and learn it from the inventory.'
                : 'Nenhuma receita aprendida. Compre uma "Receita de …" na loja e aprenda pelo inventário.'}
          </p>
        ) : (
          <div className="mn-janela-pilulas" role="radiogroup" aria-label={en ? 'Recipe' : 'Receita'}>
            {minhas.map((x) => (
              <button key={x.r.resultado_slug} type="button" role="radio"
                className={'mn-janela-pilula' + (x.estado.ok ? '' : ' is-apagada')}
                data-receita={x.r.resultado_slug}
                aria-checked={receitaSel === x.r.resultado_slug}
                aria-pressed={receitaSel === x.r.resultado_slug}
                onClick={() => setReceitaSel(x.r.resultado_slug)}>
                {x.cat.nome}
              </button>
            ))}
          </div>
        )}
      </section>
      {escolhida && Corpo && (
        <Corpo receita={escolhida.r} cat={escolhida.cat} estado={escolhida.estado} itens={itens}
          catalogoBySlug={catalogoBySlug} nomeDaHab={nomeDaHab} nomeDoMaterial={nomeDoMaterial}
          difLabel={difLabel} motivoLabel={motivoLabel} lang={lang} emPainel />
      )}
    </>
  );

  return (
    <PaginaCasas lang={lang} casas={casas} classe="pc-atividades" selInicial={atual ? atual.id : null}
      buscaRotulo={en ? 'Search activity' : 'Buscar atividade'}
      painelRotulo={en ? 'Activity' : 'Atividade'}
      vazioTxt={en ? 'No activities.' : 'Nenhuma atividade.'}
      escolhaTxt={en ? 'Select an activity to see it here.' : 'Selecione uma atividade para vê-la aqui.'}
      acoesDe={(c) => {
        if (!podeEditar) return [];
        const parar = { chave: 'parar', icone: 'ti-player-stop', rotulo: en ? 'Stop' : 'Parar', perigo: true };
        // Fabricar começa (ou põe mais uma peça na bancada) pela receita.
        if (c.a.id === 'fabricando') return c.acesa ? [acaoFabricar, parar] : [acaoFabricar];
        return [c.acesa ? parar : { chave: 'iniciar', icone: c.a.icon, rotulo: nomeDe(c.a) }];
      }}
      onAcao={(c, chave) => {
        if (chave === 'fabricar') { if (escolhida && onFabricar) onFabricar(escolhida.r); return; }
        if (onEscolher) onEscolher(chave === 'parar' ? null : c.a.id);
      }}
      painelDe={(c) => (
        <>
          {Explicacao
            ? <Explicacao a={c.a} en={en} atributos={atributos} fila={filaDe ? filaDe(c.a.id) : []} />
            : <p className="mn-janela-frase">{en ? c.a.propositoEn : c.a.propositoPt}</p>}
          {c.a.id === 'fabricando' && painelDaBancada()}
        </>
      )} />
  );
}

/* ── COMPANHEIROS ──────────────────────────────────────────────────────────
   Uma casa por bicho, com a pintura do item. O leque abre as páginas dele —
   a ficha, a identificação, o conhecimento e o inventário —, que continuam
   sendo as de antes (FichaAnimaisView). */
function PaginaCompanheiros({ lang, animais, onAbrir }) {
  const en = lang === 'en';
  const Icone = window.ItemIcone || null;
  const icone = (cat) => (window.invItemIcon || (() => 'ti-paw'))(cat);
  const casas = (animais || []).map((x) => ({
    id: x.instancia.instanceId, nome: x.nome, sub: x.raca, busca: x.raca, x,
    icone: Icone && x.cat ? <Icone cat={x.cat} icon={icone(x.cat)} /> : <i className="ti ti-paw" aria-hidden="true" />,
    acesa: !!x.instancia.montado,
  }));
  const temElo = window.temElo || (() => false);
  return (
    <PaginaCasas lang={lang} casas={casas} classe="pc-companheiros"
      buscaRotulo={en ? 'Search companion' : 'Buscar companheiro'}
      painelRotulo={en ? 'Companion' : 'Companheiro'}
      vazioTxt={en ? 'No companions.' : 'Nenhum companheiro.'}
      escolhaTxt={en ? 'Select a companion to see it here.' : 'Selecione um companheiro para vê-lo aqui.'}
      acoesDe={() => [
        { chave: 'ficha', icone: 'ti-id', rotulo: en ? 'Sheet' : 'Ficha' },
        { chave: 'info', icone: 'ti-user', rotulo: en ? 'Identity' : 'Identificação' },
        { chave: 'conhecimento', icone: 'ti-book-2', rotulo: en ? 'Knowledge' : 'Conhecimento' },
        { chave: 'inventario', icone: 'ti-briefcase-2', rotulo: en ? 'Inventory' : 'Inventário' },
      ]}
      onAcao={(c, chave) => onAbrir && onAbrir(c.id, chave)}
      painelDe={(c) => (
        <div className="mn-janela-corpo pc-corpo">
          {c.x.cat && c.x.cat.descricao && <p className="mn-janela-frase">{c.x.cat.descricao}</p>}
          <dl className="mn-janela-quadro">
            <div className="mn-janela-linha is-texto"><dt>{en ? 'Breed' : 'Raça'}</dt><dd>{c.x.raca}</dd></div>
            <div className="mn-janela-linha is-texto"><dt>{en ? 'Mounted' : 'Montado'}</dt><dd>{c.x.instancia.montado ? (en ? 'Yes' : 'Sim') : (en ? 'No' : 'Não')}</dd></div>
            {temElo(c.x.instancia) && <div className="mn-janela-linha is-texto"><dt>{en ? 'Bond' : 'Elo'}</dt><dd>{en ? 'Permanent' : 'Permanente'}</dd></div>}
          </dl>
        </div>
      )} />
  );
}

/* ── AMIGOS ────────────────────────────────────────────────────────────────
   Os protagonistas da história, cada um com o pacto em que está. O leque é
   o passo seguinte do pacto (selar, aceitar, recusar, romper, retirar). As
   RPCs são as mesmas da janela antiga (AmigosFab, amigos-fab.jsx). */
function PaginaAmigos({ lang, pjId }) {
  const en = lang === 'en';
  const [lista, setLista] = useState([]);
  const [erro, setErro] = useState(null);
  const carregar = React.useCallback(async () => {
    if (!pjId || typeof supabaseClient === 'undefined') { setLista([]); return; }
    const { data, error } = await supabaseClient.rpc('listar_amizades', { p_pj_id: pjId });
    if (!error) setLista(data || []);
  }, [pjId]);
  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 30000);
    return () => clearInterval(t);
  }, [carregar]);
  const agir = async (rpc, outroId) => {
    setErro(null);
    const { data, error } = await supabaseClient.rpc(rpc, { p_pj_id: pjId, p_outro_id: outroId });
    if (error || !data || !data.ok) {
      setErro(en ? 'Could not update the pact. Try again.' : 'Não foi possível atualizar o pacto. Tente de novo.');
      return;
    }
    carregar();
  };
  const nomeDe = (p) => [p && p.nome, p && p.sobrenome].filter(Boolean).join(' ');
  const ESTADO = {
    selado: en ? 'Friends' : 'Amigos',
    recebido: en ? 'Offers you a pact' : 'Propõe um pacto',
    enviado: en ? 'Pact offered' : 'Pacto proposto',
    nenhum: en ? 'No pact' : 'Sem pacto',
  };
  const casas = lista.map((p) => ({
    id: String(p.id), nome: nomeDe(p), p,
    sub: ESTADO[p.estado] || null,
    icone: p.foto_url
      ? <img className="inv-card-arte pc-retrato" src={p.foto_url} alt="" draggable="false" />
      : <span className="pc-inicial" aria-hidden="true">{(nomeDe(p) || '?').trim().slice(0, 1).toUpperCase()}</span>,
    acesa: p.estado === 'selado' || p.estado === 'recebido',
  }));
  return (
    <>
      <PaginaCasas lang={lang} casas={casas} classe="pc-amigos"
        buscaRotulo={en ? 'Search friend' : 'Buscar amigo'}
        painelRotulo={en ? 'Friend' : 'Amigo'}
        vazioTxt={en ? 'Nobody else in this story yet.' : 'Ninguém mais nesta história ainda.'}
        escolhaTxt={en ? 'Select a character to see the pact here.' : 'Selecione um personagem para ver o pacto aqui.'}
        acoesDe={(c) => ({
          selado: [{ chave: 'desfazer_pacto', icone: 'ti-heart-broken', rotulo: en ? 'Break' : 'Romper', perigo: true }],
          recebido: [
            { chave: 'propor_pacto', icone: 'ti-heart-handshake', rotulo: en ? 'Accept' : 'Aceitar' },
            { chave: 'desfazer_pacto', icone: 'ti-x', rotulo: en ? 'Decline' : 'Recusar', perigo: true },
          ],
          enviado: [{ chave: 'desfazer_pacto', icone: 'ti-hourglass-off', rotulo: en ? 'Cancel offer' : 'Cancelar proposta' }],
        })[c.p.estado] || [{ chave: 'propor_pacto', icone: 'ti-heart-handshake', rotulo: en ? 'Seal pact' : 'Selar pacto' }]}
        onAcao={(c, chave) => agir(chave, c.p.id)}
        painelDe={(c) => (
          <div className="mn-janela-corpo pc-corpo">
            <dl className="mn-janela-quadro">
              <div className="mn-janela-linha is-texto"><dt>{en ? 'Pact' : 'Pacto'}</dt><dd>{ESTADO[c.p.estado] || ESTADO.nenhum}</dd></div>
            </dl>
            {c.p.estado === 'selado' && (
              <p className="mn-janela-detalhe">
                {en ? 'Drag an item from your inventory to their card to send it.'
                    : 'Arraste um item do inventário até o card dele para enviar.'}
              </p>
            )}
          </div>
        )} />
      {erro && <p className="amg-erro" role="alert">{erro}</p>}
    </>
  );
}

Object.assign(window, {
  PaginaCasas, PaginaHabilidades, PaginaTecnicas, PaginaMagias, PaginaStatus, PaginaAtividades,
  PaginaCompanheiros, PaginaAmigos, ICONE_GRUPO_HAB,
});
