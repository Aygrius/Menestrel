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

function GrupoDetalhe({ grupo: g, lang, onClose }) {
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
    <Janela title={g.nome} lang={lang} onClose={onClose} acoes={[]}>
      {g.epigrafe && secao(en ? 'Epigraph' : 'Epígrafe', (
        <>
          {paragrafos(g.epigrafe.texto)}
          {g.epigrafe.autor && <p className="ent-fonte">{g.epigrafe.autor}</p>}
        </>
      ), 'ent-prefacio')}
      {g.prefacio && secao(en ? 'Prologue' : 'Prólogo', (
        <>
          {paragrafos(g.prefacio.texto)}
          {g.prefacio.fonte && <p className="ent-fonte">{g.prefacio.fonte}</p>}
        </>
      ), 'ent-prefacio')}
      {secao(en ? 'Description' : 'Descrição', (
        <>
          {(tipo || g.titulo) && (
            <p className="diario-det-resumo">{[tipo, g.titulo].filter(Boolean).join(' · ')}</p>
          )}
          {g.imagem && <div className="diario-det-art"><img src={g.imagem} alt={g.nome} /></div>}
          {paragrafos(g.descricao)}
        </>
      ), 'best-secao--descricao')}
      {texto(en ? 'History' : 'História', g.historia)}
      {tem(g.locais) && secao(en ? 'Places' : 'Locais', <Lista itens={g.locais} meta={(l) => l.onde} />)}
      {texto(en ? 'Symbols' : 'Símbolos', g.simbolos)}
      {texto(en ? 'Goals' : 'Objetivos', g.objetivos)}
      {texto(en ? 'Admission' : 'Admissão', g.admissao)}
      {texto(en ? 'Ethics' : 'Ética', g.etica)}
      {texto(en ? 'Organization' : 'Organização', g.organizacao)}
      {tem(g.liderancas) && secao(en ? 'Leaders' : 'Lideranças', <Lista itens={g.liderancas} meta={(l) => l.cargo} />)}
      {tem(g.rumores) && secao(en ? 'Rumors' : 'Rumores', <Lista itens={g.rumores} />)}
    </Janela>
  );
}

function GruposView({ lang, trilhoPaginas = null, grupos }) {
  const en = lang === 'en';
  const lista0 = grupos || (typeof GRUPOS !== 'undefined' && GRUPOS) || _grp('GRUPOS') || [];
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
  /* O monograma do cartão: "Colégio Alquímico" daria seis "C" seguidos; vale
     a primeira letra do nome próprio, depois de "Colégio", "do", "das". */
  const inicial = (nome) => {
    const palavras = String(nome || '?').split(/\s+/)
      .filter((p) => !/^(col[eé]gio|ordem|guilda|d[oae]s?)$/i.test(p));
    return (palavras[0] || String(nome || '?')).charAt(0).toUpperCase();
  };

  return (
    <div className="pjs diario-pagina">
      <div className={'diario-pagina-barra cartoes-barra' + (trilhoPaginas ? ' livro-trilho trilho-unido' : '')}>
        {Busca && (
          <Busca ac={ac} placeholder={en ? 'Search' : 'Buscar'} query={query} setQuery={setQuery}
            podeCriar={false} antes={trilhoPaginas} />
        )}
      </div>

      {lista.length === 0 ? (
        <div className="best-empty diario-empty-lg">
          {q ? (en ? `No result for "${query}".` : `Nenhum resultado para "${query}".`)
             : (en ? 'Nothing registered yet.' : 'Nada cadastrado ainda.')}
        </div>
      ) : (
        <div className="pjs-grid diario-cartoes">
          {lista.map((g) => {
            const abrir = () => setAberto(g.slug);
            return (
              <div className="pj-card-wrap" key={g.slug}>
                <article className="pj-card is-clickable diario-cartao" role="button" tabIndex={0}
                  onClick={abrir}
                  onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(); } }}>
                  <div className="pj-card-body">
                    <div className={'pj-card-portrait' + (g.imagem ? '' : ' is-empty')}>
                      {g.imagem
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
                        <div className="pj-meta pj-meta--quem diario-cartao-meta"><span>{tipoDe(g, lang)}</span></div>
                        {g.titulo && <div className="pj-meta pj-meta--estagio diario-cartao-meta">{g.titulo}</div>}
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      )}

      {grpAberto && <GrupoDetalhe grupo={grpAberto} lang={lang} onClose={() => setAberto(null)} />}
    </div>
  );
}

Object.assign(window, { GruposView, GrupoDetalhe });
