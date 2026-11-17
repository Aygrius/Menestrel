/* ============================================================
   ENTIDADES — a página da Ambientação (08/11/2026)
   ============================================================
   Deuses, titãs e príncipes, lidos de ENTIDADES (01-core/entidades.jsx).
   A página é a mesma de Reinos/Cidades/Locais — o trilho com a busca e os
   cartões de Personagens (.pjs-grid / .pj-card) — e a ficha abre na janela
   de abas do catálogo (BestDetalheModal): uma aba por tópico pedido pelo
   usuário — Prefácio, Descrição, Relações, Locais, Feriados e Itens. O Nome
   é o título da janela.

   Catálogo do mundo, igual para o Mestre e o Jogador e sem mesa nem
   personagem. Desde 15/11/2026 o admin edita e cria pela tela (o + e o
   lápis), numa versão só — ver 13-diario/catalogo-mundo.jsx.
   ============================================================ */

const _ent = (nome) => (typeof window !== 'undefined' ? window[nome] : undefined);

/* A data do feriado por extenso. O mês 13 é o dia avulso do fim do ano —
   "1 do Dia de Cruine" seria estranho de ler. */
function dataDoFeriado(f, lang) {
  const en = lang === 'en';
  // A data por extenso que o cronista escreveu vence a conta (várias datas, "no fim do inverno").
  if (f.quando) return f.quando;
  if (!f.dia || !f.mes) return null;
  const meses = (typeof FANTASY_MONTHS !== 'undefined' && FANTASY_MONTHS) || _ent('FANTASY_MONTHS') || [];
  const m = meses.find((x) => x.n === f.mes);
  if (f.mes === 13) return en ? 'Cruine\'s Day, the last day of the year' : 'Dia de Cruine, o último do ano';
  return m ? (en ? `${f.dia}, ${m.nome}` : `${f.dia} do ${m.nome}`) : `${f.dia}/${f.mes}`;
}

/* Uma lista de entradas com nome (Relações, Locais, Feriados, Itens): o nome
   forte, a linha de contexto fraca e o texto. Réguas entre elas, como os
   quadros do resto do app. */
function EntidadeLista({ itens, meta }) {
  return (
    <ul className="ent-lista">
      {itens.map((it, i) => {
        const m = meta ? meta(it) : null;
        return (
          <li key={i} className="ent-item">
            <div className="ent-item-cab">
              <span className="ent-item-nome">{it.nome}</span>
              {m && <span className="ent-item-meta">{m}</span>}
            </div>
            {it.texto && String(it.texto).split(/\n+/).map((p, j) => (
              <p key={j} className="diario-det-desc ent-item-texto">{p}</p>
            ))}
          </li>
        );
      })}
    </ul>
  );
}

function EntidadeDetalhe({ entidade: e, lang, onClose, onEditar = null }) {
  const en = lang === 'en';
  const Janela = (typeof BestDetalheModal !== 'undefined' && BestDetalheModal) || _ent('BestDetalheModal');
  if (!Janela) return null;
  const paragrafos = (texto) => String(texto || '').split(/\n+/).filter(Boolean)
    .map((p, i) => <p key={i} className="diario-det-desc">{p}</p>);
  const secao = (titulo, conteudo, cls) => (
    <div className={'best-secao diario-secao' + (cls ? ' ' + cls : '')}>
      <h4 className="best-secao-titulo">{titulo}</h4>
      {conteudo}
    </div>
  );
  const tem = (lista) => Array.isArray(lista) && lista.length > 0;
  const classe = (typeof classeDaEntidade === 'function' ? classeDaEntidade : _ent('classeDaEntidade'))?.(e, lang);
  return (
    <Janela title={e.nome} lang={lang} onClose={onClose} extraClass="modal-ambientacao"
      acoes={onEditar ? [{ chave: 'editar', icone: 'ti-pencil', rotulo: en ? 'Edit' : 'Editar', onClick: onEditar }] : []}>
      {/* O PREFÁCIO COMO A EPÍGRAFE DOS GRUPOS (15/11/2026, usuário: "a imagem
          das entidades não foi atualizada como em 'grupos'"): a imagem numa
          coluna, o texto na outra, alinhados ao topo; sem imagem, o texto
          ocupa a largura. A imagem saiu da História. */}
      {((e.prefacio && e.prefacio.texto) || e.imagem) && secao(en ? 'Preface' : 'Prefácio', (
        <div className={'grp-epigrafe' + (e.imagem ? ' grp-epigrafe--com-imagem' : '')}>
          {e.imagem && <div className="grp-epigrafe-arte"><img src={e.imagem} alt={e.nome} /></div>}
          <div className="grp-epigrafe-texto">
            {e.prefacio && paragrafos(e.prefacio.texto)}
            {e.prefacio && e.prefacio.fonte && <p className="ent-fonte">{e.prefacio.fonte}</p>}
          </div>
        </div>
      ), 'ent-prefacio')}
      {/* PREFÁCIO · HISTÓRIA · POLÍTICA (15/11/2026, usuário). Nada saiu ("só
          não exclua nenhuma informação"): a História é a descrição, e os
          Locais, os Itens e os Feriados — que alimentam o calendário — moram
          dentro dela, cada um com o seu rótulo. A Política é a lista das
          Relações. */}
      {secao(en ? 'History' : 'História', (
        <>
          {(classe || e.titulo) && (
            <p className="diario-det-resumo">{[classe, e.titulo].filter(Boolean).join(' · ')}</p>
          )}
          {paragrafos(e.descricao)}
          {tem(e.locais) && <><h5 className="mn-rotulo ent-sub">{en ? 'Places' : 'Locais'}</h5><EntidadeLista itens={e.locais} meta={(l) => l.onde} /></>}
          {tem(e.itens) && <><h5 className="mn-rotulo ent-sub">{en ? 'Items' : 'Itens'}</h5><EntidadeLista itens={e.itens} /></>}
          {tem(e.feriados) && <><h5 className="mn-rotulo ent-sub">{en ? 'Holidays' : 'Feriados'}</h5><EntidadeLista itens={e.feriados} meta={(f) => dataDoFeriado(f, lang)} /></>}
        </>
      ), 'best-secao--descricao')}
      {tem(e.relacoes) && secao(en ? 'Politics' : 'Política', <EntidadeLista itens={e.relacoes} />)}
    </Janela>
  );
}

function EntidadesView({ lang, trilhoPaginas = null, entidades , conhece = null }) {
  const en = lang === 'en';
  /* EDITÁVEL DESDE 15/11/2026 (13-diario/catalogo-mundo.jsx): o código junto
     com o que o admin editou no banco; o admin ganha o + e o lápis. */
  const vigentes = (_ent('useCatalogoMundo') || (() => null))('entidade');
  // Só pergunta ao banco se é admin quando o editor existe (sem ele não há o que liberar).
  const ehAdmin = ((_ent('EditorMundo') && _ent('useEhAdmin')) || (() => false))();
  const [editando, setEditando] = React.useState(null);   // null | { entrada }  (entrada null = nova)
  const Editor = _ent('EditorMundo');
  const lista0 = entidades || (Array.isArray(vigentes) ? vigentes : []);
  const esperando = !entidades && !Array.isArray(vigentes);   // null = carregando; 'erro' = o banco falhou
  const [query, setQuery] = React.useState('');
  const [aberta, setAberta] = React.useState(null);
  const q = query.trim().toLowerCase();
  const classeDe = (typeof classeDaEntidade === 'function' ? classeDaEntidade : _ent('classeDaEntidade')) || (() => '');
  const lista = lista0
    .filter((e) => !q || [e.nome, e.titulo, classeDe(e, lang)].some((s) => String(s || '').toLowerCase().includes(q)))
    .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR', { sensitivity: 'base' }));
  const Busca = (typeof BestBuscaENovo !== 'undefined' && BestBuscaENovo) || _ent('BestBuscaENovo');
  const ac = (typeof ADMIN_COPY !== 'undefined' && (ADMIN_COPY[lang] || ADMIN_COPY.pt)) || {};
  const entAberta = aberta ? lista0.find((e) => e.slug === aberta) : null;
  /* PAGINADA, COMO AS OUTRAS ABAS (15/11/2026, usuário: "a aba 'entidades' não
     está paginada e os cards estão todos bugados"). A grade de cartões divide a
     altura da página entre as fileiras; com as 28 entidades de uma vez, cada
     cartão ficava mais baixo que o próprio texto. 18 por página é o mesmo
     número de Reinos, Cidades, Locais e Pessoas (PAGE_SIZE_FALLBACK, diario.jsx). */
  const POR_PAGINA = 18;
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const safePage = Math.min(page, totalPages);
  const pagina = lista.slice((safePage - 1) * POR_PAGINA, safePage * POR_PAGINA);
  const Paginas = (typeof BestPagination !== 'undefined' && BestPagination) || _ent('BestPagination');

  return (
    <div className="pjs diario-pagina">
      <div className={'diario-pagina-barra cartoes-barra' + (trilhoPaginas ? ' livro-trilho trilho-unido' : '')}>
        {Busca && (
          <Busca ac={ac} placeholder={en ? 'Search' : 'Buscar'} query={query} setQuery={(v) => { setQuery(v); setPage(1); }}
            podeCriar={!!(ehAdmin && Editor)} onNovo={() => setEditando({ entrada: null })}
            dicaNovo={en ? 'New entity' : 'Nova entidade'} antes={trilhoPaginas} />
        )}
      </div>

      {esperando ? (
        vigentes === 'erro'
          ? <div className="best-empty diario-empty-lg">{en ? 'Could not load the entities. Reload the page to try again.' : 'Não foi possível carregar as entidades. Recarregue a página para tentar de novo.'}</div>
          : (_ent('Carregando') ? React.createElement(_ent('Carregando'), { lang }) : null)
      ) : lista.length === 0 ? (
        <div className="best-empty diario-empty-lg">
          {q ? (en ? `No result for "${query}".` : `Nenhum resultado para "${query}".`)
             : (en ? 'Nothing registered yet.' : 'Nada cadastrado ainda.')}
        </div>
      ) : (
        <>
        <div className="pjs-grid diario-cartoes">
          {pagina.map((e) => {
            /* SÓ O QUE O PERSONAGEM CONHECE (17/11/2026, usuário: "só será possível
               ver as informações das entidades e grupos que conhece" — escolha:
               automático pela ficha). `conhece` vem do console (10-shell) para o
               Jogador; o desconhecido mostra só o nome, apagado, e não abre. */
            const sabe = !conhece || conhece(e);
            const abrir = () => { if (sabe) setAberta(e.slug); };
            return (
              <div className="pj-card-wrap" key={e.slug}>
                <article className={'pj-card diario-cartao' + (sabe ? ' is-clickable' : ' is-desconhecido')} role="button" tabIndex={0} aria-disabled={sabe ? undefined : true}
                  onClick={abrir}
                  onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(); } }}>
                  <div className="pj-card-body">
                    <div className={'pj-card-portrait' + (e.imagem && sabe ? '' : ' is-empty')}>
                      {e.imagem && sabe
                        ? <img src={e.imagem} alt="" className="pj-card-portrait-img" />
                        : <span className="pj-card-portrait-mono" aria-hidden="true">{String(e.nome || '?').charAt(0).toUpperCase()}</span>}
                    </div>
                    <div className="pj-card-info">
                      <header className="pj-card-head">
                        <div className="pj-name-linha">
                          <div className="pj-name diario-cartao-nome">{e.nome}</div>
                        </div>
                      </header>
                      <div className="pj-meta-linhas">
                        {sabe ? <div className="pj-meta pj-meta--quem diario-cartao-meta"><span>{classeDe(e, lang)}</span></div> : <div className="pj-meta pj-meta--quem diario-cartao-meta"><span>{lang === 'en' ? 'Unknown to your character' : 'Seu personagem não conhece'}</span></div>}
                        {sabe && e.titulo && <div className="pj-meta pj-meta--estagio diario-cartao-meta">{e.titulo}</div>}
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
        {Paginas && <Paginas page={page} safePage={safePage} totalPages={totalPages} setPage={setPage} lang={lang} />}
        </>
      )}

      {entAberta && !editando && <EntidadeDetalhe entidade={entAberta} lang={lang} onClose={() => setAberta(null)}
        onEditar={ehAdmin && Editor ? () => setEditando({ entrada: entAberta }) : null} />}
      {editando && Editor && (
        <Editor tipo="entidade" entrada={editando.entrada} lang={lang}
          onClose={() => setEditando(null)}
          onSalvo={(d) => { setEditando(null); setAberta(d.slug); }}
          onExcluido={() => { setEditando(null); setAberta(null); }} />
      )}
    </div>
  );
}

Object.assign(window, { EntidadesView, EntidadeDetalhe, EntidadeLista, dataDoFeriado });
