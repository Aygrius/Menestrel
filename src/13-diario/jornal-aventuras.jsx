/* ============================================================
   [13] JORNAL DE AVENTURAS — o mural da cidade
   ============================================================
   Pedido do usuário (06/10/2026):
     "Quero criar um jornal para divulgação das aventuras que os personagens
      podem explorar, teremos a seguinte estrutura:
        Nome da Aventura: Exemplo 'A Viúva'
        Estágio: Exemplo '5'
        Personagem: Exemplo 'Celsior Altana'
        Recompensa: Exemplo '2 moedas de ouro'
        Experiência: Exemplo '15 pontos de experiência'
        Início: Exemplo 'Dizem as más línguas que Celsior Altana está
                procurando aventureiros para investigar a morte de um homem...'
        Fim: Exemplo 'Envilla Demiris assassinou o próprio marido enquanto ele
             dormia...'
      As aventuras vão estar em uma aba da cidade."

   ── POR QUE UMA ABA DA CIDADE SAI DE GRAÇA ────────────────────────────────
   A ficha de uma entrada do Diário vira abas a partir das SEÇÕES que o
   conteúdo desenha (ver DetalheMoldura, diario.jsx: "as abas saem das seções
   .best-secao com título"). Então o jornal não precisou de mecanismo de aba
   nenhum: ele é uma seção chamada "Aventuras" dentro da ficha da cidade, e o
   modelo único de janela faz o resto. Uma peça a menos para manter.

   ── O ANÚNCIO E A SOLUÇÃO ─────────────────────────────────────────────────
   O pedido chama o campo de "Fim", e o exemplo dele é o assassino revelado.
   Isso não é parte do anúncio: um jornal "para divulgação das aventuras que os
   personagens podem explorar" divulga o CONVITE. Entregar o fim junto do
   início resolveria o mistério antes de o grupo sair da taverna.

   Então o Fim é do MESTRE — ele o vê marcado como solução, o jogador não o vê.
   É a única parte do pedido que não está literal na tela, e está aqui escrita
   para poder ser revertida numa linha (`podeEditar` deixa de guardá-lo).

   ── QUEM ESCREVE ──────────────────────────────────────────────────────────
   O Mestre da história da cidade, ou o admin nas cidades do mundo — a mesma
   divisão que o Diário já faz para reino, cidade e NPC. A trava é do banco
   (policy `aventuras_*` + `pode_editar_aventura`), não desta tela: ver
   scripts/sql/jornal-de-aventuras-2026-10-06.sql.

   Depende de: ModalShell/SelectPill (01-core) e supabaseClient.
   ============================================================ */

/* Os sete campos, na ORDEM DO PEDIDO. A ordem é a do jornal lido em voz alta —
   o que a aventura é, para quem serve, quem oferece, o que paga, e só então a
   história. Mudar a ordem aqui muda a ficha e o formulário juntos. */
const AVENTURA_CAMPOS = [
  { col: 'nome',        pt: 'Nome da Aventura', en: 'Adventure',   tipo: 'texto', obrigatorio: true,
    exemplo: { pt: 'A Viúva', en: 'The Widow' } },
  { col: 'estagio',     pt: 'Estágio',          en: 'Stage',       tipo: 'numero',
    exemplo: { pt: '5', en: '5' } },
  { col: 'personagem',  pt: 'Personagem',       en: 'Character',   tipo: 'texto',
    exemplo: { pt: 'Celsior Altana', en: 'Celsior Altana' } },
  { col: 'recompensa',  pt: 'Recompensa',       en: 'Reward',      tipo: 'texto',
    exemplo: { pt: '2 moedas de ouro', en: '2 gold coins' } },
  { col: 'experiencia', pt: 'Experiência',      en: 'Experience',  tipo: 'texto',
    exemplo: { pt: '15 pontos de experiência', en: '15 experience points' } },
  { col: 'inicio',      pt: 'Início',           en: 'Opening',     tipo: 'area',
    exemplo: { pt: 'Dizem as más línguas que…', en: 'Rumour has it that…' } },
  /* `soMestre`: ver "O ANÚNCIO E A SOLUÇÃO" no cabeçalho. */
  { col: 'fim',         pt: 'Fim',              en: 'Ending',      tipo: 'area', soMestre: true,
    exemplo: { pt: 'Envilla Demiris assassinou…', en: 'Envilla Demiris murdered…' } },
];

const AVENTURA_COLUNAS = 'id, cidade_slug, nome, estagio, personagem, recompensa, experiencia, inicio, fim';

// A linha vazia de uma aventura nova.
const aventuraVazia = (cidadeSlug) => ({
  cidade_slug: cidadeSlug, nome: '', estagio: '', personagem: '',
  recompensa: '', experiencia: '', inicio: '', fim: '',
});

/* O payload para o banco: `estagio` é o único número, e vazio tem de virar
   NULL — '' num smallint é erro de tipo, não zero. */
function aventuraParaBanco(a) {
  const txt = (v) => { const s = String(v == null ? '' : v).trim(); return s || null; };
  /* `a.estagio == null` e NÃO `a.estagio || ''`: o `||` come o ZERO, e um
     Mestre que digitasse 0 veria o campo virar NULL em vez de ser preso em 1.
     O zero é um valor digitado — só nulo e vazio são "não informou". */
  const cru = a.estagio == null ? '' : String(a.estagio).trim();
  const n = Number(cru);
  return {
    cidade_slug: a.cidade_slug,
    nome: String(a.nome || '').trim(),
    estagio: (cru !== '' && Number.isFinite(n))
      ? Math.max(1, Math.min(40, Math.trunc(n))) : null,
    personagem: txt(a.personagem),
    recompensa: txt(a.recompensa),
    experiencia: txt(a.experiencia),
    inicio: txt(a.inicio),
    fim: txt(a.fim),
    updated_at: new Date().toISOString(),
  };
}

/* ── O JORNAL ───────────────────────────────────────────────────────────── */

function AventurasDaCidade({ cidadeSlug, lang, podeEditar }) {
  const en = lang === 'en';
  const [lista, setLista] = useState(null);     // null = carregando
  const [erro, setErro] = useState(null);
  const [editando, setEditando] = useState(null);   // a aventura no formulário
  const [abertas, setAbertas] = useState({});       // id → o Fim está à vista?

  const carregar = React.useCallback(() => {
    if (!cidadeSlug) { setLista([]); return undefined; }
    let cancel = false;
    supabaseClient.from('aventuras').select(AVENTURA_COLUNAS)
      .eq('cidade_slug', cidadeSlug)
      /* Por ESTÁGIO: é a pergunta que o grupo faz ao mural ("o que serve para
         nós?"), e o nome só desempata. `nullsFirst: false` manda a aventura
         sem estágio para o fim, onde ela não atrapalha a leitura. */
      .order('estagio', { ascending: true, nullsFirst: false })
      .order('nome', { ascending: true })
      .then(({ data, error }) => {
        if (cancel) return;
        if (error) { setErro(error.message); setLista([]); return; }
        setErro(null);
        setLista(data || []);
      });
    return () => { cancel = true; };
  }, [cidadeSlug]);

  useEffect(() => carregar(), [carregar]);

  const salvar = async (a) => {
    const payload = aventuraParaBanco(a);
    if (!payload.nome) { setErro(en ? 'The adventure needs a name.' : 'A aventura precisa de um nome.'); return; }
    const q = a.id
      ? supabaseClient.from('aventuras').update(payload).eq('id', a.id).select(AVENTURA_COLUNAS).single()
      : supabaseClient.from('aventuras').insert(payload).select(AVENTURA_COLUNAS).single();
    const { error } = await q;
    if (error) { setErro(error.message); return; }
    setErro(null);
    setEditando(null);
    carregar();
  };

  const excluir = async (id) => {
    /* `.select()` pelo mesmo motivo dos outros DELETEs do projeto: barrado
       pela RLS, o Postgres volta SEM erro e com zero linhas — sem conferir, a
       tela diria que apagou e o anúncio continuaria no mural. */
    const { data, error } = await supabaseClient
      .from('aventuras').delete().eq('id', id).select();
    if (error) { setErro(error.message); return; }
    if (!data || data.length === 0) {
      setErro(en ? 'Nothing was deleted (permission denied?).' : 'Nada foi excluído (sem permissão?).');
      return;
    }
    setErro(null);
    carregar();
  };

  if (lista === null) {
    return <p className="diario-det-desc">{en ? 'Loading…' : 'Carregando…'}</p>;
  }

  return (
    <div className="jornal">
      {erro && <div className="err-msg" role="alert">{erro}</div>}

      {lista.length === 0 && !editando && (
        <p className="diario-det-desc jornal-vazio">
          {podeEditar
            ? (en ? 'No adventures posted in this city yet.'
                  : 'Nenhuma aventura anunciada nesta cidade ainda.')
            : (en ? 'The board is empty. Come back another day.'
                  : 'O mural está vazio. Volte outro dia.')}
        </p>
      )}

      <ul className="jornal-lista">
        {lista.map((a) => (
          <JornalAnuncio key={a.id} a={a} lang={lang} podeEditar={podeEditar}
            fimAberto={!!abertas[a.id]}
            onFim={() => setAbertas((s) => ({ ...s, [a.id]: !s[a.id] }))}
            onEditar={() => setEditando(a)}
            onExcluir={() => excluir(a.id)} />
        ))}
      </ul>

      {podeEditar && !editando && (
        <button type="button" className="btn-ghost btn-sm jornal-novo" data-nova-aventura
          onClick={() => setEditando(aventuraVazia(cidadeSlug))}>
          <i className="ti ti-plus" aria-hidden="true" />
          {en ? 'Post an adventure' : 'Anunciar aventura'}
        </button>
      )}

      {editando && (
        <AventuraForm a={editando} lang={lang}
          onChange={setEditando}
          onSalvar={() => salvar(editando)}
          onCancelar={() => { setEditando(null); setErro(null); }} />
      )}
    </div>
  );
}

/* UM ANÚNCIO. O desenho é de recorte de jornal: a manchete com o estágio ao
   lado, a ficha curta (quem oferece, o que paga, o que rende) e o chamado por
   baixo. Não é tabela — o Início é prosa, e prosa em célula de tabela não se
   lê. */
function JornalAnuncio({ a, lang, podeEditar, fimAberto, onFim, onEditar, onExcluir }) {
  const en = lang === 'en';
  const rot = (c) => (en ? c.en : c.pt);
  const fichas = AVENTURA_CAMPOS.filter(
    (c) => ['personagem', 'recompensa', 'experiencia'].includes(c.col) && a[c.col]);

  return (
    <li className="jornal-anuncio" data-aventura={a.id}>
      <div className="jornal-manchete">
        <h5 className="jornal-nome">{a.nome}</h5>
        {a.estagio != null && (
          <span className="jornal-estagio">
            {en ? 'Stage' : 'Estágio'} <strong>{a.estagio}</strong>
          </span>
        )}
        {podeEditar && (
          <span className="jornal-acoes">
            <button type="button" className="jornal-acao" data-editar={a.id}
              aria-label={en ? 'Edit' : 'Editar'} onClick={onEditar}>
              <i className="ti ti-pencil" aria-hidden="true" />
            </button>
            <button type="button" className="jornal-acao jornal-acao--perigo" data-excluir={a.id}
              aria-label={en ? 'Delete' : 'Excluir'} onClick={onExcluir}>
              <i className="ti ti-trash" aria-hidden="true" />
            </button>
          </span>
        )}
      </div>

      {fichas.length > 0 && (
        <dl className="jornal-ficha">
          {fichas.map((c) => (
            <div key={c.col} className="jornal-ficha-par">
              <dt>{rot(c)}</dt>
              <dd>{a[c.col]}</dd>
            </div>
          ))}
        </dl>
      )}

      {a.inicio && <p className="jornal-inicio">{a.inicio}</p>}

      {/* O FIM, só para o Mestre, e FECHADO por padrão: ele não abre a ficha
          da cidade para ler o desfecho, e um spoiler à mostra é lido sem
          querer — inclusive por cima do ombro dele. */}
      {podeEditar && a.fim && (
        <div className="jornal-fim">
          <button type="button" className="jornal-fim-btn" data-fim={a.id}
            aria-expanded={fimAberto} onClick={onFim}>
            <i className={'ti ' + (fimAberto ? 'ti-eye-off' : 'ti-eye')} aria-hidden="true" />
            {en ? 'Ending (GM only)' : 'Fim (só o Mestre)'}
          </button>
          {fimAberto && <p className="jornal-fim-texto">{a.fim}</p>}
        </div>
      )}
    </li>
  );
}

/* O FORMULÁRIO — os campos do pedido, na mesma ordem e na pele do sistema
   (.diario-input / .diario-textarea, o CAMPO ÚNICO de index.css). O exemplo de
   cada campo entra como `placeholder`: é o que o pedido deu, e serve melhor ali
   do que num texto de ajuda que ninguém lê. */
function AventuraForm({ a, lang, onChange, onSalvar, onCancelar }) {
  const en = lang === 'en';
  const campo = (c) => {
    const rotulo = en ? c.en : c.pt;
    const valor = a[c.col] == null ? '' : a[c.col];
    const comum = {
      value: valor,
      placeholder: en ? c.exemplo.en : c.exemplo.pt,
      'aria-label': rotulo,
      [`data-campo-${c.col}`]: true,
      onChange: (e) => onChange({ ...a, [c.col]: e.target.value }),
    };
    return (
      <div key={c.col} className={'jornal-campo jornal-campo--' + c.tipo}>
        <label className="diario-field-label">
          {rotulo}
          {/* O Fim é o único campo que precisa dizer para quem ele é. */}
          {c.soMestre && (
            <span className="jornal-campo-so-mestre">
              {en ? ' · GM only' : ' · só o Mestre'}
            </span>
          )}
        </label>
        {c.tipo === 'area'
          ? <textarea className="diario-textarea" rows={3} {...comum} />
          : <input className="diario-input" type={c.tipo === 'numero' ? 'number' : 'text'}
              {...(c.tipo === 'numero' ? { min: 1, max: 40 } : {})} {...comum} />}
      </div>
    );
  };

  return (
    <div className="jornal-form">
      {AVENTURA_CAMPOS.map(campo)}
      <div className="jornal-form-acoes">
        <button type="button" className="btn-ghost btn-sm" onClick={onCancelar}>
          {en ? 'Cancel' : 'Cancelar'}
        </button>
        <button type="button" className="btn-primary btn-sm" data-salvar-aventura
          disabled={!String(a.nome || '').trim()}
          onClick={onSalvar}>
          {en ? 'Save' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, {
  AventurasDaCidade, JornalAnuncio, AventuraForm,
  AVENTURA_CAMPOS, aventuraVazia, aventuraParaBanco,
});
