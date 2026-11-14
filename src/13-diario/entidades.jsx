/* ============================================================
   ENTIDADES — a página da Ambientação (08/11/2026)
   ============================================================
   Deuses, titãs e príncipes, lidos de ENTIDADES (01-core/entidades.jsx).
   A página é a mesma de Reinos/Cidades/Locais — o trilho com a busca e os
   cartões de Personagens (.pjs-grid / .pj-card) — e a ficha abre na janela
   de abas do catálogo (BestDetalheModal): uma aba por tópico pedido pelo
   usuário — Prefácio, Descrição, Relações, Locais, Feriados e Itens. O Nome
   é o título da janela.

   Catálogo do mundo, só leitura: sem +, sem lápis, sem olho. É igual para o
   Mestre e o Jogador e não depende de mesa nem de personagem.
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

function EntidadeDetalhe({ entidade: e, lang, onClose }) {
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
    <Janela title={e.nome} lang={lang} onClose={onClose} acoes={[]}>
      {e.prefacio && secao(en ? 'Preface' : 'Prefácio', (
        <>
          {paragrafos(e.prefacio.texto)}
          {e.prefacio.fonte && <p className="ent-fonte">{e.prefacio.fonte}</p>}
        </>
      ), 'ent-prefacio')}
      {secao(en ? 'Description' : 'Descrição', (
        <>
          {(classe || e.titulo) && (
            <p className="diario-det-resumo">{[classe, e.titulo].filter(Boolean).join(' · ')}</p>
          )}
          {e.imagem && <div className="diario-det-art"><img src={e.imagem} alt={e.nome} /></div>}
          {paragrafos(e.descricao)}
        </>
      ), 'best-secao--descricao')}
      {tem(e.relacoes) && secao(en ? 'Relations' : 'Relações', <EntidadeLista itens={e.relacoes} />)}
      {tem(e.locais) && secao(en ? 'Places' : 'Locais', <EntidadeLista itens={e.locais} meta={(l) => l.onde} />)}
      {tem(e.feriados) && secao(en ? 'Holidays' : 'Feriados', <EntidadeLista itens={e.feriados} meta={(f) => dataDoFeriado(f, lang)} />)}
      {tem(e.itens) && secao(en ? 'Items' : 'Itens', <EntidadeLista itens={e.itens} />)}
    </Janela>
  );
}

function EntidadesView({ lang, trilhoPaginas = null, entidades }) {
  const en = lang === 'en';
  const lista0 = entidades || (typeof ENTIDADES !== 'undefined' && ENTIDADES) || _ent('ENTIDADES') || [];
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
          {lista.map((e) => {
            const abrir = () => setAberta(e.slug);
            return (
              <div className="pj-card-wrap" key={e.slug}>
                <article className="pj-card is-clickable diario-cartao" role="button" tabIndex={0}
                  onClick={abrir}
                  onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(); } }}>
                  <div className="pj-card-body">
                    <div className={'pj-card-portrait' + (e.imagem ? '' : ' is-empty')}>
                      {e.imagem
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
                        <div className="pj-meta pj-meta--quem diario-cartao-meta"><span>{classeDe(e, lang)}</span></div>
                        {e.titulo && <div className="pj-meta pj-meta--estagio diario-cartao-meta">{e.titulo}</div>}
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      )}

      {entAberta && <EntidadeDetalhe entidade={entAberta} lang={lang} onClose={() => setAberta(null)} />}
    </div>
  );
}

Object.assign(window, { EntidadesView, EntidadeDetalhe, EntidadeLista, dataDoFeriado });
