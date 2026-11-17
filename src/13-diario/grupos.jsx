/* ============================================================
   GRUPOS — a página da Ambientação (13/11/2026)
   ============================================================
   Usuário: "Crie um novo grupo chamado 'Grupos' e faça a construção dos
   colégios de magia." Lê GRUPOS (01-core/grupos.jsx).

   É a página de Entidades com outro catálogo, de propósito: o trilho com a
   busca, os cartões de Personagens e a ficha na janela de abas do catálogo
   (BestDetalheModal), uma aba por capítulo do livro dos colégios. As listas
   (Locais, Lideranças, Rumores) usam a mesma EntidadeLista — nome forte,
   contexto fraco, texto — para as duas fichas lerem igual.

   Catálogo do mundo, só leitura: sem +, sem lápis, sem olho.
   ============================================================ */

const _grp = (nome) => (typeof window !== 'undefined' ? window[nome] : undefined);

function GrupoDetalhe({ grupo: g, lang, onClose, onEditar = null }) {
  const en = lang === 'en';
  const Janela = (typeof BestDetalheModal !== 'undefined' && BestDetalheModal) || _grp('BestDetalheModal');
  const Lista = (typeof EntidadeLista !== 'undefined' && EntidadeLista) || _grp('EntidadeLista');
  if (!Janela || !Lista) return null;
  const paragrafos = (texto) => String(texto || '').split(/\n+/).filter(Boolean)
    .map((p, i) => <p key={i} className="diario-det-desc">{p}</p>);
  const secao = (titulo, conteudo, cls) => (
    <div className={'best-secao diario-secao' + (cls ? ' ' + cls : '')}>
      <h4 className="best-secao-titulo">{titulo}</h4>
      {conteudo}
    </div>
  );
  const texto = (titulo, valor) => (valor ? secao(titulo, paragrafos(valor), 'grp-texto') : null);
  const tem = (lista) => Array.isArray(lista) && lista.length > 0;
  const tipo = (typeof tipoDoGrupo === 'function' ? tipoDoGrupo : _grp('tipoDoGrupo'))?.(g, lang);
  return (
    <Janela title={g.nome} lang={lang} onClose={onClose} extraClass="modal-ambientacao"
      acoes={onEditar ? [{ chave: 'editar', icone: 'ti-pencil', rotulo: en ? 'Edit' : 'Editar', onClick: onEditar }] : []}>
      {/* OS SETE TÓPICOS (15/11/2026, usuário): Epígrafe, História,
          Localização, Admissão, Organização, Relíquias e Rumores. O tipo, o
          título e a pintura abrem a História, que é por onde se começa. */}
      {/* A EPÍGRAFE EM DUAS COLUNAS (15/11/2026, usuário: "na aba 'Epígrafe' a
          tela estará dividida em duas colunas, em uma teremos a imagem e na
          outra, o texto"). Sem imagem, o texto ocupa a largura. A imagem saiu
          da História. */}
      {((g.epigrafe && g.epigrafe.texto) || g.imagem) && secao(en ? 'Epigraph' : 'Epígrafe', (
        <div className={'grp-epigrafe' + (g.imagem ? ' grp-epigrafe--com-imagem' : '')}>
          {g.imagem && <div className="grp-epigrafe-arte"><img src={g.imagem} alt={g.nome} /></div>}
          <div className="grp-epigrafe-texto">
            {/* Com imagem, o título da aba mora na coluna do texto (17/11/2026). */}
            {g.imagem && <h4 className="best-secao-titulo ent-titulo-na-coluna">{en ? 'Epigraph' : 'Epígrafe'}</h4>}
            {g.epigrafe && paragrafos(g.epigrafe.texto)}
            {g.epigrafe && g.epigrafe.autor && <p className="ent-fonte">{g.epigrafe.autor}</p>}
          </div>
        </div>
      ), 'ent-prefacio')}
      {secao(en ? 'History' : 'História', (
        <>
          {(tipo || g.titulo) && (
            <p className="diario-det-resumo">{[tipo, g.titulo].filter(Boolean).join(' · ')}</p>
          )}
          {paragrafos(g.historia)}
        </>
      ), 'best-secao--descricao grp-texto')}
      {tem(g.locais) && secao(en ? 'Location' : 'Localização', <Lista itens={g.locais} meta={(l) => l.onde} />)}
      {texto(en ? 'Admission' : 'Admissão', g.admissao)}
      {texto(en ? 'Organization' : 'Organização', g.organizacao)}
      {tem(g.reliquias) && secao(en ? 'Relics' : 'Relíquias', <Lista itens={g.reliquias} />)}
      {tem(g.rumores) && secao(en ? 'Rumors' : 'Rumores', <Lista itens={g.rumores} />)}
    </Janela>
  );
}

function GruposView({ lang, trilhoPaginas = null, grupos , conhece = null }) {
  const en = lang === 'en';
  /* EDITÁVEL DESDE 15/11/2026 (13-diario/catalogo-mundo.jsx), como Entidades. */
  const vigentes = (_grp('useCatalogoMundo') || (() => null))('grupo');
  // Só pergunta ao banco se é admin quando o editor existe (sem ele não há o que liberar).
  const ehAdmin = ((_grp('EditorMundo') && _grp('useEhAdmin')) || (() => false))();
  const [editando, setEditando] = React.useState(null);
  const Editor = _grp('EditorMundo');
  const lista0 = grupos || (Array.isArray(vigentes) ? vigentes : []);
  const esperando = !grupos && !Array.isArray(vigentes);   // null = carregando; 'erro' = o banco falhou
  const [query, setQuery] = React.useState('');
  const [aberto, setAberto] = React.useState(null);
  const q = query.trim().toLowerCase();
  const tipoDe = (typeof tipoDoGrupo === 'function' ? tipoDoGrupo : _grp('tipoDoGrupo')) || (() => '');
  const lista = lista0
    .filter((g) => !q || [g.nome, g.titulo, tipoDe(g, lang)].some((s) => String(s || '').toLowerCase().includes(q)))
    .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR', { sensitivity: 'base' }));
  const Busca = (typeof BestBuscaENovo !== 'undefined' && BestBuscaENovo) || _grp('BestBuscaENovo');
  const ac = (typeof ADMIN_COPY !== 'undefined' && (ADMIN_COPY[lang] || ADMIN_COPY.pt)) || {};
  const grpAberto = aberto ? lista0.find((g) => g.slug === aberto) : null;
  /* PAGINADA COMO AS OUTRAS ABAS (15/11/2026, usuário: "Os cards na aba
     'grupos' parecem ligeiramente maiores que os cards das outras abas"). A
     grade divide a altura da página entre as fileiras, e as outras abas têm a
     paginação embaixo, que come a altura dela; sem ela, a grade de Grupos
     ficava mais alta e cada cartão, maior. Mesmo número de Entidades e Reinos. */
  const POR_PAGINA = 18;
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const safePage = Math.min(page, totalPages);
  const pagina = lista.slice((safePage - 1) * POR_PAGINA, safePage * POR_PAGINA);
  const Paginas = (typeof BestPagination !== 'undefined' && BestPagination) || _grp('BestPagination');
  /* O monograma do cartão: "Colégio Alquímico" daria seis "C" seguidos; vale
     a primeira letra do nome próprio, depois de "Colégio", "do", "das". */
  const inicial = (nome) => {
    const palavras = String(nome || '?').split(/\s+/)
      .filter((p) => !/^(col[eé]gio|ordem|guilda|confraria|academia|trilha|d[oae]s?)$/i.test(p));
    return (palavras[0] || String(nome || '?')).charAt(0).toUpperCase();
  };

  return (
    <div className="pjs diario-pagina">
      <div className={'diario-pagina-barra cartoes-barra' + (trilhoPaginas ? ' livro-trilho trilho-unido' : '')}>
        {Busca && (
          <Busca ac={ac} placeholder={en ? 'Search' : 'Buscar'} query={query} setQuery={(v) => { setQuery(v); setPage(1); }}
            podeCriar={!!(ehAdmin && Editor)} onNovo={() => setEditando({ entrada: null })}
            dicaNovo={en ? 'New group' : 'Novo grupo'} antes={trilhoPaginas} />
        )}
      </div>

      {esperando ? (
        vigentes === 'erro'
          ? <div className="best-empty diario-empty-lg">{en ? 'Could not load the groups. Reload the page to try again.' : 'Não foi possível carregar os grupos. Recarregue a página para tentar de novo.'}</div>
          : (_grp('Carregando') ? React.createElement(_grp('Carregando'), { lang }) : null)
      ) : lista.length === 0 ? (
        <div className="best-empty diario-empty-lg">
          {q ? (en ? `No result for "${query}".` : `Nenhum resultado para "${query}".`)
             : (en ? 'Nothing registered yet.' : 'Nada cadastrado ainda.')}
        </div>
      ) : (
        <>
        <div className="pjs-grid diario-cartoes">
          {pagina.map((g) => {
            /* SÓ O QUE O PERSONAGEM CONHECE (17/11/2026, usuário: "só será possível
               ver as informações das entidades e grupos que conhece" — escolha:
               automático pela ficha). `conhece` vem do console (10-shell) para o
               Jogador; o desconhecido mostra só o nome, apagado, e não abre. */
            const sabe = !conhece || conhece(g);
            const abrir = () => { if (sabe) setAberto(g.slug); };
            return (
              <div className="pj-card-wrap" key={g.slug}>
                <article className={'pj-card diario-cartao' + (sabe ? ' is-clickable' : ' is-desconhecido')} role="button" tabIndex={0} aria-disabled={sabe ? undefined : true}
                  onClick={abrir}
                  onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(); } }}>
                  <div className="pj-card-body">
                    <div className={'pj-card-portrait' + (g.imagem && sabe ? '' : ' is-empty')}>
                      {g.imagem && sabe
                        ? <img src={g.imagem} alt="" className="pj-card-portrait-img" />
                        : <span className="pj-card-portrait-mono" aria-hidden="true">{inicial(g.nome)}</span>}
                    </div>
                    <div className="pj-card-info">
                      <header className="pj-card-head">
                        <div className="pj-name-linha">
                          <div className="pj-name diario-cartao-nome">{g.nome}</div>
                        </div>
                      </header>
                      <div className="pj-meta-linhas">
                        {sabe ? <div className="pj-meta pj-meta--quem diario-cartao-meta"><span>{tipoDe(g, lang)}</span></div> : <div className="pj-meta pj-meta--quem diario-cartao-meta"><span>{lang === 'en' ? 'Unknown to your character' : 'Seu personagem não conhece'}</span></div>}
                        {sabe && g.titulo && <div className="pj-meta pj-meta--estagio diario-cartao-meta">{g.titulo}</div>}
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

      {grpAberto && !editando && <GrupoDetalhe grupo={grpAberto} lang={lang} onClose={() => setAberto(null)}
        onEditar={ehAdmin && Editor ? () => setEditando({ entrada: grpAberto }) : null} />}
      {editando && Editor && (
        <Editor tipo="grupo" entrada={editando.entrada} lang={lang}
          onClose={() => setEditando(null)}
          onSalvo={(d) => { setEditando(null); setAberto(d.slug); }}
          onExcluido={() => { setEditando(null); setAberto(null); }} />
      )}
    </div>
  );
}

Object.assign(window, { GruposView, GrupoDetalhe });
