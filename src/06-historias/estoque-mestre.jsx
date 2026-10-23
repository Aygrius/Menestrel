/* ============================================================
   ESTOQUE DO MESTRE — lojas por cidade e propostas de venda
   (23/10/2026, aprovado na prévia: "Ficou ótimo, pode aplicar.")
   ============================================================
   - Uma loja por cidade: historias.estoque_loja.comercios[] ganha `lugar`
     (o nome da cidade/local). A Loja do jogador mostra só as lojas sem
     cidade ou a da cidade onde a mesa está (get_loja_pj).
   - O estoque usa as mesmas casas e o mesmo painel do Inventário.
   - Propostas: as vendas propostas pelos jogadores (anuncios_loja com status
     'proposta'/'contraproposta'). Aceitar paga o jogador e põe o item no
     estoque da loja escolhida pelo preço de tabela (RPC
     responder_proposta_venda); Contrapropor manda outro valor; Recusar
     devolve o item.
   - Cada mudança no estoque relê o estoque do banco, aplica e grava — assim
     uma proposta aceita no meio da edição não é apagada por uma cópia velha.

   Depende de: supabaseClient, fetchCatalogoCompleto (01-core),
   invItemIcon/MoedaPills/CampoPreco (07-inventario, no window),
   migrarEstoqueLoja (06-historias/historias.jsx), useAlvoPortal.
   Exporta (window): EstoqueMestreView
   ============================================================ */

function estNovoId() {
  return Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8);
}
const estSemAcento = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function EstoqueMestreView({ historia, lang, onChanged }) {
  const en = lang === 'en';
  const { Input } = (typeof UI !== 'undefined' ? UI : {});
  const migrar = window.migrarEstoqueLoja || ((x) => x || { comercios: [] });
  const icone = (cat) => (window.invItemIcon ? window.invItemIcon(cat) : 'ti-box');
  const Moedas = window.MoedaPills || (() => null);
  const CampoPreco = window.CampoPreco || null;
  const porExtenso = (l) => (window.precoPorExtenso ? window.precoPorExtenso(l, lang, en ? 'Free' : 'Grátis') : String(l));

  const [est, setEst] = useState(() => migrar(historia.estoque_loja));
  const [catalogo, setCatalogo] = useState(null);
  const [aba, setAba] = useState('loja');          // 'loja' | 'propostas'
  const [lojaId, setLojaId] = useState(null);
  const [busca, setBusca] = useState('');
  const [sel, setSel] = useState(null);             // { tipo: 'entrada'|'catalogo', id }
  const [novaLoja, setNovaLoja] = useState(null);   // texto do + no trilho
  const [propostas, setPropostas] = useState(null);
  const [erro, setErro] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [contra, setContra] = useState({});         // id -> latão da contraproposta
  const [destino, setDestino] = useState({});       // id -> comercio id
  const alvoTrilho = (typeof useAlvoPortal === 'function') ? useAlvoPortal('estoque-trilho-slot') : null;
  void alvoTrilho;

  // catálogo inteiro
  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data } = await fetchCatalogoCompleto();
      if (vivo) setCatalogo(data || []);
    })();
    return () => { vivo = false; };
  }, []);
  const catBySlug = useMemo(() => {
    const m = {}; (catalogo || []).forEach((c) => { m[c.slug] = c; }); return m;
  }, [catalogo]);

  const comercios = (est && est.comercios) || [];
  const loja = comercios.find((c) => c.id === lojaId) || comercios[0] || null;
  useEffect(() => { if (!lojaId && comercios[0]) setLojaId(comercios[0].id); }, [comercios.length]);

  // propostas
  const carregarPropostas = React.useCallback(async () => {
    const { data } = await supabaseClient.from('anuncios_loja')
      .select('id, status, lugar, slug, item, item_nome, quantidade, preco_latao, preco_contra, vendedor_nome, created_at')
      .eq('historia_id', historia.id).in('status', ['proposta', 'contraproposta'])
      .order('created_at', { ascending: true });
    setPropostas(data || []);
  }, [historia.id]);
  useEffect(() => { carregarPropostas(); }, [carregarPropostas]);

  /* Grava uma mudança: relê o estoque do banco, aplica `muda` e grava. */
  const alterar = async (muda) => {
    setOcupado(true); setErro(null);
    const { data, error } = await supabaseClient.from('historias').select('estoque_loja').eq('id', historia.id).maybeSingle();
    if (error) { setOcupado(false); setErro(error.message); return false; }
    const atual = migrar(data && data.estoque_loja);
    const novo = muda({ ...atual, comercios: (atual.comercios || []).map((c) => ({ ...c, itens: [...(c.itens || [])] })) });
    const payload = { ...novo, editando_em: null };
    const { error: e2 } = await supabaseClient.from('historias').update({ estoque_loja: payload }).eq('id', historia.id);
    setOcupado(false);
    if (e2) { setErro(e2.message); return false; }
    setEst(payload);
    if (onChanged) onChanged();
    return true;
  };
  const naLoja = (id, fn) => (e) => ({ ...e, comercios: e.comercios.map((c) => (c.id === id ? fn(c) : c)) });

  // ── a vitrine da loja escolhida, ou o catálogo filtrado pela busca
  const termo = estSemAcento(busca);
  const entradas = (loja && loja.itens || []).filter((it) => catBySlug[it.slug]);
  const visiveis = termo ? entradas.filter((it) => estSemAcento(catBySlug[it.slug].nome).includes(termo)) : entradas;
  const doCatalogo = termo
    ? (catalogo || []).filter((c) => c.grupo !== 'Moedas' && estSemAcento(c.nome).includes(termo)
        && !entradas.some((it) => it.slug === c.slug)).slice(0, 40)
    : [];
  const casas = [
    ...visiveis.map((it) => ({ tipo: 'entrada', id: it.entryId, cat: catBySlug[it.slug], it })),
    ...doCatalogo.map((c) => ({ tipo: 'catalogo', id: c.slug, cat: c })),
  ];
  const COLS = 10;
  const total = Math.max(COLS * 6, Math.ceil((casas.length + 1) / COLS) * COLS);
  const escolhida = sel && casas.find((c) => c.tipo === sel.tipo && c.id === sel.id);

  const pendentes = (propostas || []).filter((p) => p.status === 'proposta');
  const aguardando = (propostas || []).filter((p) => p.status === 'contraproposta');

  const responder = async (p, acao) => {
    setOcupado(true); setErro(null);
    const args = { p_anuncio_id: p.id, p_acao: acao, p_preco: null, p_comercio_id: null };
    if (acao === 'contrapropor') args.p_preco = Number(contra[p.id]) || 0;
    if (acao === 'aceitar') {
      args.p_comercio_id = destino[p.id] || (comercios.find((c) => estSemAcento(c.lugar) && estSemAcento(c.lugar) === estSemAcento(p.lugar)) || comercios[0] || {}).id || null;
    }
    const { data, error } = await supabaseClient.rpc('responder_proposta_venda', args);
    setOcupado(false);
    if (error || !data || !data.ok) { setErro((data && data.motivo) || (error && error.message) || 'erro'); return; }
    setContra((c) => { const n = { ...c }; delete n[p.id]; return n; });
    await carregarPropostas();
    if (acao === 'aceitar') {
      const { data: h } = await supabaseClient.from('historias').select('estoque_loja').eq('id', historia.id).maybeSingle();
      if (h) setEst(migrar(h.estoque_loja));
      if (onChanged) onChanged();
    }
  };

  // ── o trilho
  const trilho = (
    <div className="cartoes-barra inv-trilho estoque-trilho">
      <div className="best-header-acoes">
        {aba === 'loja' && (
          <div className="best-search">
            <i className="ti ti-eye busca-ic" aria-hidden="true" />
            {Input && <Input type="search" value={busca} onChange={(e) => { setBusca(e.target.value); setSel(null); }}
              placeholder={en ? 'Search' : 'Buscar'} aria-label={en ? 'Search the shop and catalog' : 'Buscar na loja e no catálogo'} />}
          </div>
        )}
        {comercios.map((c) => (
          <button key={c.id} type="button" className={'mc-acao' + (aba === 'loja' && loja && loja.id === c.id ? ' is-ativo' : '')}
            onClick={() => { setAba('loja'); setLojaId(c.id); setSel(null); }}>
            <i className="ti ti-building-store" aria-hidden="true" />
            <span className="mc-acao-rotulo">{c.lugar || c.nome}</span>
          </button>
        ))}
        {novaLoja != null ? (
          <form className="estoque-nova" onSubmit={async (e) => {
            e.preventDefault();
            const nome = novaLoja.trim(); if (!nome) { setNovaLoja(null); return; }
            const id = estNovoId();
            const ok = await alterar((x) => ({ ...x, comercios: [...x.comercios, { id, nome, lugar: nome, ativo: true, itens: [] }] }));
            if (ok) { setLojaId(id); setAba('loja'); }
            setNovaLoja(null);
          }}>
            <input autoFocus value={novaLoja} onChange={(e) => setNovaLoja(e.target.value)} placeholder={en ? 'City' : 'Cidade'}
              onKeyDown={(e) => { if (e.key === 'Escape') setNovaLoja(null); }} aria-label={en ? 'New shop city' : 'Cidade da nova loja'} />
          </form>
        ) : (
          <button type="button" className="mc-acao" onClick={() => setNovaLoja('')} aria-label={en ? 'New shop' : 'Nova loja'}>
            <i className="ti ti-plus" aria-hidden="true" />
          </button>
        )}
        <button type="button" className={'mc-acao' + (aba === 'propostas' ? ' is-ativo' : '')} onClick={() => { setAba('propostas'); setSel(null); }}>
          <i className="ti ti-scale" aria-hidden="true" />
          <span className="mc-acao-rotulo">{en ? 'Offers' : 'Propostas'}</span>
          {pendentes.length > 0 && <span className="estoque-num">{pendentes.length}</span>}
        </button>
      </div>
    </div>
  );

  // ── o painel do item / da loja
  const painelItem = () => {
    if (!loja) return null;
    if (!escolhida) {
      return (
        <div className="estoque-painel-corpo">
          <div className="loja-painel-cab">
            <span className="loja-painel-ic"><i className="ti ti-building-store" aria-hidden="true" /></span>
            <div>
              <h3 className="loja-painel-nome">{loja.lugar || loja.nome}</h3>
              <p className="loja-painel-sub">{entradas.length} {en ? 'items' : 'itens'}</p>
            </div>
          </div>
          <dl className="loja-painel-dados">
            <div><dt>{en ? 'City' : 'Cidade'}</dt><dd>
              <input className="estoque-campo" defaultValue={loja.lugar || ''} key={loja.id + ':lugar'}
                placeholder={en ? 'Every city' : 'Todas as cidades'}
                onBlur={(e) => { const v = e.target.value.trim(); if (v !== (loja.lugar || '')) alterar(naLoja(loja.id, (c) => ({ ...c, lugar: v || null, nome: v || c.nome }))); }} />
            </dd></div>
            <div><dt>{en ? 'Open' : 'Aberta'}</dt><dd>
              <button type="button" className={'estoque-chave' + (loja.ativo !== false ? ' is-on' : '')} disabled={ocupado}
                onClick={() => alterar(naLoja(loja.id, (c) => ({ ...c, ativo: c.ativo === false })))}>
                {loja.ativo !== false ? (en ? 'Yes' : 'Sim') : (en ? 'No' : 'Não')}
              </button>
            </dd></div>
          </dl>
          <p className="loja-painel-desc">{en ? 'Choose an item to edit it, or search to add one from the catalog.' : 'Escolha um item para editá-lo, ou busque para pôr um do catálogo.'}</p>
          {comercios.length > 1 && (
            <button type="button" className="btn-ghost btn-sm estoque-excluir" disabled={ocupado}
              onClick={async () => { if (await alterar((x) => ({ ...x, comercios: x.comercios.filter((c) => c.id !== loja.id) }))) setLojaId(null); }}>
              <i className="ti ti-trash" aria-hidden="true" /> {en ? 'Delete this shop' : 'Excluir esta loja'}
            </button>
          )}
        </div>
      );
    }
    const cat = escolhida.cat;
    if (escolhida.tipo === 'catalogo') {
      return (
        <div className="estoque-painel-corpo">
          <div className="loja-painel-cab">
            <span className="loja-painel-ic"><i className={'ti ' + icone(cat)} aria-hidden="true" /></span>
            <div><h3 className="loja-painel-nome">{cat.nome}</h3>{cat.grupo && <p className="loja-painel-sub">{cat.grupo}</p>}</div>
          </div>
          <dl className="loja-painel-dados">
            <div><dt>{en ? 'Price' : 'Preço'}</dt><dd>{porExtenso(Number(cat.valor_latao) || 0)}</dd></div>
          </dl>
          {cat.descricao && <p className="loja-painel-desc">{cat.descricao}</p>}
          <button type="button" className="btn-primary loja-painel-botao" disabled={ocupado}
            onClick={async () => {
              const entryId = estNovoId();
              const ok = await alterar(naLoja(loja.id, (c) => ({ ...c, itens: [...c.itens, { slug: cat.slug, entryId, estoque: 1, preco_latao_override: null }] })));
              if (ok) { setBusca(''); setSel({ tipo: 'entrada', id: entryId }); }
            }}>
            {en ? 'Put in the shop' : 'Pôr na loja'}
          </button>
        </div>
      );
    }
    const it = escolhida.it;
    const ilimitado = it.estoque == null;
    const preco = it.preco_latao_override != null ? Number(it.preco_latao_override) : (Number(cat.valor_latao) || 0);
    const setEntrada = (patch) => alterar(naLoja(loja.id, (c) => ({ ...c, itens: c.itens.map((x) => (x.entryId === it.entryId ? { ...x, ...patch } : x)) })));
    return (
      <div className="estoque-painel-corpo">
        <div className="loja-painel-cab">
          <span className="loja-painel-ic"><i className={'ti ' + icone(cat)} aria-hidden="true" /></span>
          <div><h3 className="loja-painel-nome">{cat.nome}</h3>{cat.grupo && <p className="loja-painel-sub">{cat.grupo}</p>}</div>
        </div>
        <dl className="loja-painel-dados">
          <div><dt>{en ? 'Quantity' : 'Quantidade'}</dt><dd>
            {ilimitado ? <span>∞</span> : (
              <span className="estoque-step">
                <button type="button" aria-label="−" disabled={ocupado || it.estoque <= 0} onClick={() => setEntrada({ estoque: Math.max(0, Number(it.estoque) - 1) })}>−</button>
                <b>{it.estoque}</b>
                <button type="button" aria-label="+" disabled={ocupado} onClick={() => setEntrada({ estoque: Number(it.estoque) + 1 })}>+</button>
              </span>
            )}
          </dd></div>
          <div><dt>{en ? 'Unlimited' : 'Ilimitado'}</dt><dd>
            <button type="button" className={'estoque-chave' + (ilimitado ? ' is-on' : '')} disabled={ocupado}
              onClick={() => setEntrada({ estoque: ilimitado ? 1 : null })}>{ilimitado ? (en ? 'Yes' : 'Sim') : (en ? 'No' : 'Não')}</button>
          </dd></div>
          <div><dt>{en ? 'Price' : 'Preço'}</dt><dd>
            {CampoPreco
              ? <CampoPreco valor={preco} lang={lang} onChange={(v) => setEntrada({ preco_latao_override: (v === '' || Number(v) === Number(cat.valor_latao)) ? null : Number(v) })} />
              : porExtenso(preco)}
          </dd></div>
        </dl>
        {cat.descricao && <p className="loja-painel-desc">{cat.descricao}</p>}
        <button type="button" className="btn-ghost btn-sm estoque-excluir" disabled={ocupado}
          onClick={async () => { if (await alterar(naLoja(loja.id, (c) => ({ ...c, itens: c.itens.filter((x) => x.entryId !== it.entryId) })))) setSel(null); }}>
          <i className="ti ti-trash" aria-hidden="true" /> {en ? 'Remove from the shop' : 'Tirar da loja'}
        </button>
      </div>
    );
  };

  const cartaoProposta = (p, esperando) => {
    const cat = catBySlug[p.slug] || null;
    const q = Number(p.quantidade) || 1;
    const nome = (p.item && p.item.apelido ? p.item.apelido + ' (' + (p.item_nome || p.slug) + ')' : (p.item_nome || p.slug)) + (q > 1 ? ' ×' + q : '');
    const quem = (p.vendedor_nome || '').split(' ')[0] || (en ? 'A character' : 'Um personagem');
    return (
      <li key={p.id} className="estoque-prop">
        <div className="estoque-prop-top">
          <span className="loja-painel-ic"><i className={'ti ' + icone(cat)} aria-hidden="true" /></span>
          <div className="estoque-prop-nome">
            <b>{nome}</b>
            <small>{quem}{p.lugar ? (en ? ' · in ' : ' · em ') + p.lugar : ''}</small>
          </div>
          <div className="estoque-prop-preco">
            <Moedas latao={(esperando ? Number(p.preco_contra) : Number(p.preco_latao)) * q} lang={lang} tamanho="sm" />
            <small>{esperando ? (en ? 'you offered' : 'você ofereceu') : (en ? 'table: ' : 'tabela: ') + (esperando ? '' : porExtenso((Number(cat && cat.valor_latao) || 0) * q))}</small>
          </div>
        </div>
        {!esperando && (
          <>
            <div className="estoque-prop-destino">
              <span>{en ? 'Store in' : 'Guardar em'}</span>
              <select value={destino[p.id] || (comercios.find((c) => estSemAcento(c.lugar) && estSemAcento(c.lugar) === estSemAcento(p.lugar)) || comercios[0] || {}).id || ''}
                onChange={(e) => setDestino((d) => ({ ...d, [p.id]: e.target.value }))}>
                {comercios.map((c) => <option key={c.id} value={c.id}>{c.lugar || c.nome}</option>)}
              </select>
            </div>
            {contra[p.id] != null && CampoPreco && (
              <div className="estoque-prop-contra">
                <span>{en ? 'Counteroffer (each)' : 'Contraproposta (cada)'}</span>
                <CampoPreco valor={contra[p.id]} lang={lang} onChange={(v) => setContra((c) => ({ ...c, [p.id]: v === '' ? 0 : Number(v) }))} />
              </div>
            )}
            <div className="estoque-prop-acoes">
              {contra[p.id] != null ? (
                <>
                  <button type="button" className="btn-primary btn-sm" disabled={ocupado} onClick={() => responder(p, 'contrapropor')}>{en ? 'Send' : 'Enviar'}</button>
                  <button type="button" className="btn-ghost btn-sm" disabled={ocupado} onClick={() => setContra((c) => { const n = { ...c }; delete n[p.id]; return n; })}>{en ? 'Cancel' : 'Cancelar'}</button>
                </>
              ) : (
                <>
                  <button type="button" className="btn-primary btn-sm" disabled={ocupado} onClick={() => responder(p, 'aceitar')}>{en ? 'Accept' : 'Aceitar'}</button>
                  <button type="button" className="btn-ghost btn-sm" disabled={ocupado} onClick={() => setContra((c) => ({ ...c, [p.id]: Number(p.preco_latao) || 0 }))}>{en ? 'Counteroffer' : 'Contrapropor'}</button>
                  <button type="button" className="btn-ghost btn-sm" disabled={ocupado} onClick={() => responder(p, 'recusar')}>{en ? 'Decline' : 'Recusar'}</button>
                </>
              )}
            </div>
          </>
        )}
      </li>
    );
  };

  return (
    <div className="estoque-pagina">
      {trilho}
      {erro && <div className="err-msg" style={{ margin: '0 auto 12px', maxWidth: 600 }}>{erro}</div>}
      {aba === 'propostas' ? (
        <div className="fp-card estoque-card estoque-card--propostas">
          <div className="estoque-props">
            <section className="bau-painel estoque-props-col">
              <p className="estoque-props-tit">{en ? 'Waiting for you' : 'Esperando você'}</p>
              {propostas === null ? <p className="estoque-vazio">{en ? 'Loading…' : 'Carregando…'}</p>
                : pendentes.length === 0 ? <p className="estoque-vazio">{en ? 'No offers.' : 'Nenhuma proposta.'}</p>
                : <ul className="estoque-props-lista">{pendentes.map((p) => cartaoProposta(p, false))}</ul>}
            </section>
            <section className="bau-painel estoque-props-col">
              <p className="estoque-props-tit">{en ? 'Waiting for the player' : 'Esperando o jogador'}</p>
              {aguardando.length === 0 ? <p className="estoque-vazio">{en ? 'Nothing here.' : 'Nada aqui.'}</p>
                : <ul className="estoque-props-lista">{aguardando.map((p) => cartaoProposta(p, true))}</ul>}
            </section>
          </div>
        </div>
      ) : !loja ? (
        <div className="best-empty">{en ? 'No shop yet. Create one with the +.' : 'Nenhuma loja ainda. Crie uma pelo +.'}</div>
      ) : (
        <div className="fp-card estoque-card">
          <div className="bau-corpo bau-corpo--painel estoque-bau">
            <div className="inv-grid-wrap">
              <div className="inv-bag-grid inv-bag-grid--slots" style={{ gridTemplateColumns: `repeat(${COLS}, 50px)` }}>
                {catalogo === null ? null : Array.from({ length: total }, (_, i) => {
                  const c = casas[i];
                  if (!c) return <span key={'g' + i} className="inv-slot-ghost" aria-hidden="true" />;
                  const escolhidaAqui = sel && sel.tipo === c.tipo && sel.id === c.id;
                  return (
                    <button key={c.tipo + c.id} type="button" aria-label={c.cat.nome}
                      className={'inv-card loja-casa' + (escolhidaAqui ? ' is-sel' : '') + (c.tipo === 'catalogo' ? ' estoque-casa--catalogo' : '') + (c.cat.magico ? ' is-magico' : '')}
                      onClick={() => setSel(escolhidaAqui ? null : { tipo: c.tipo, id: c.id })}>
                      <span className="inv-card-head"><span className="inv-card-ic"><i className={'ti ' + icone(c.cat)} aria-hidden="true" /></span></span>
                      {c.tipo === 'entrada' && <span className="estoque-qtd">{c.it.estoque == null ? '∞' : c.it.estoque}</span>}
                      {c.tipo === 'catalogo' && <span className="estoque-mais" aria-hidden="true"><i className="ti ti-plus" /></span>}
                    </button>
                  );
                })}
              </div>
            </div>
            <aside className="bau-painel loja-painel">{painelItem()}</aside>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { EstoqueMestreView });
