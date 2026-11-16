/* ============================================================
   CATÁLOGO DO MUNDO — Entidades e Grupos, no banco (15/11/2026)
   ============================================================
   Usuário: "Eu quero editar as informações da ambientação, como grupos,
   entidades, assim como edito de reinos e cidades." Escolhas dele: só o
   admin edita, numa versão só para todas as mesas, e o calendário segue os
   feriados editados. E, no mesmo dia: "O texto original não precisa ser
   guardado [...] Usamos o PDF apenas como pontapé inicial. E iremos subir
   mais coisas da ambientação."

   UMA FONTE SÓ: catalogo_mundo (scripts/sql/catalogo-mundo-2026-11-15.sql).
   O texto que estava no código (01-core) subiu para lá e saiu de lá; o que
   ficou em 01-core é o vocabulário (classes, tipos, contas dos feriados).
   Lote escrito fora da tela: scripts/mundo/subir-catalogo.mjs.

   Quem lê: useCatalogoMundo(tipo) nas páginas (null enquanto não chegou);
   mundoVigente(tipo) fora do React. A cada mudança, o calendário refaz os
   feriados das entidades (refazerFeriadosDoCalendario, 10-shell/shell.jsx).
   ============================================================ */

const _cm = { linhas: null, pedido: null, ouvintes: new Set() };
const _cmw = (nome) => (typeof window !== 'undefined' ? window[nome] : undefined);

/* As entradas de um tipo, como a ficha as lê (slug junto dos dados). */
function mundoVigente(tipo, linhas = _cm.linhas) {
  return (linhas || []).filter((l) => l.tipo === tipo).map((l) => ({ ...l.dados, slug: l.slug }));
}

function _avisarMundo() {
  _cm.ouvintes.forEach((f) => f());
  const refazer = _cmw('refazerFeriadosDoCalendario');
  const feriados = (typeof feriadosDasEntidades === 'function' ? feriadosDasEntidades : _cmw('feriadosDasEntidades'));
  if (refazer && feriados) refazer(feriados(mundoVigente('entidade')));
}

/* Busca o banco uma vez por sessão (ou de novo, com forcar). */
function carregarCatalogoMundo(forcar = false) {
  if (_cm.pedido && !forcar) return _cm.pedido;
  const sb = (typeof supabaseClient !== 'undefined' ? supabaseClient : _cmw('supabaseClient'));
  if (!sb) return Promise.resolve(null);
  _cm.pedido = sb.from('catalogo_mundo').select('tipo, slug, dados')
    .then(({ data, error }) => {
      if (error) { _cm.pedido = null; _cm.erro = true; _cm.ouvintes.forEach((f) => f()); return null; }
      _cm.erro = false;
      _cm.linhas = data || [];
      _avisarMundo();
      return _cm.linhas;
    }, () => { _cm.pedido = null; _cm.erro = true; _cm.ouvintes.forEach((f) => f()); return null; });
  return _cm.pedido;
}

/* Põe um catálogo já pronto, sem ir ao banco — a prévia sem login e os
   testes de página usam. */
function definirCatalogoMundo(linhas) {
  _cm.linhas = linhas || [];
  _cm.pedido = Promise.resolve(_cm.linhas);
  _avisarMundo();
}

/* null enquanto o banco não respondeu; 'erro' se ele falhou; a lista, depois. */
function useCatalogoMundo(tipo) {
  const [, mexeu] = React.useState(0);
  React.useEffect(() => {
    const f = () => mexeu((n) => n + 1);
    _cm.ouvintes.add(f);
    carregarCatalogoMundo();
    return () => { _cm.ouvintes.delete(f); };
  }, []);
  if (_cm.linhas) return mundoVigente(tipo);
  return _cm.erro ? 'erro' : null;
}

/* Grava a entrada inteira. `.select()`: UPDATE barrado pela RLS volta sem
   erro e sem linha. */
async function salvarNoMundo(tipo, dados) {
  const linha = { tipo, slug: dados.slug, dados, updated_at: new Date().toISOString() };
  const { data, error } = await supabaseClient.from('catalogo_mundo').upsert(linha).select('tipo, slug');
  if (error) throw error;
  if (!data || !data.length) throw new Error('sem_permissao');
  _cm.linhas = [...(_cm.linhas || []).filter((l) => !(l.tipo === tipo && l.slug === dados.slug)), { tipo, slug: dados.slug, dados }];
  _avisarMundo();
}
async function removerDoMundo(tipo, slug) {
  const { data, error } = await supabaseClient.from('catalogo_mundo').delete().eq('tipo', tipo).eq('slug', slug).select('slug');
  if (error) throw error;
  if (!data || !data.length) throw new Error('sem_permissao');
  _cm.linhas = (_cm.linhas || []).filter((l) => !(l.tipo === tipo && l.slug === slug));
  _avisarMundo();
}

/* ── O FORMULÁRIO ────────────────────────────────────────────────────────
   Os campos de cada tipo, na ordem das abas da ficha. `lista` são as
   entradas com nome (Relações, Locais, Feriados…), editadas uma a uma. */
const _dataTxt = (f) => (Array.isArray(f.datas) ? f.datas : (f.dia && f.mes ? [{ dia: f.dia, mes: f.mes }] : []))
  .map((d) => d.dia + '/' + d.mes).join(', ');
const _lerDatas = (txt) => String(txt || '').split(/[,;]+/).map((s) => s.trim()).filter(Boolean).map((s) => {
  const m = /^(\d{1,2})\s*\/\s*(\d{1,2})$/.exec(s);
  return m ? { dia: Number(m[1]), mes: Number(m[2]) } : null;
}).filter((d) => d && d.dia >= 1 && d.dia <= 30 && d.mes >= 1 && d.mes <= 13);

const CAMPOS_MUNDO = {
  entidade: [
    /* Nome, Classe, Domínio e Imagem numa linha, a imagem por upload — como
       no grupo (15/11/2026, usuário: "também deve estar em entidades"). */
    { chave: 'nome', pt: 'Nome', en: 'Name', tipo: 'texto', obrigatorio: true, quarto: true },
    { chave: 'classe', pt: 'Classe', en: 'Class', tipo: 'opcoes', quarto: true,
      opcoes: () => Object.entries((typeof ENTIDADE_CLASSES !== 'undefined' && ENTIDADE_CLASSES) || _cmw('ENTIDADE_CLASSES') || {}) },
    { chave: 'titulo', pt: 'Domínio', en: 'Domain', tipo: 'texto', quarto: true },
    { chave: 'imagem', pt: 'Imagem', en: 'Image', tipo: 'imagem', quarto: true },
    /* Prefácio · História · Política (15/11/2026, usuário), sem tirar nada:
       a História é a descrição, com Locais, Itens e Feriados (o calendário lê
       estes) dentro dela; a Política são as Relações. */
    { chave: 'prefacio.texto', pt: 'Prefácio', en: 'Preface', tipo: 'area', linhas: 6 },
    { chave: 'prefacio.fonte', pt: 'Fonte do prefácio', en: 'Preface source', tipo: 'texto' },
    { chave: 'descricao', pt: 'História', en: 'History', tipo: 'area', linhas: 8 },
    { chave: 'locais', pt: 'História · Locais', en: 'History · Places', tipo: 'lista', campos: [['nome', 'Nome', 'Name'], ['onde', 'Onde', 'Where'], ['texto', 'Texto', 'Text', 'area']] },
    { chave: 'itens', pt: 'História · Itens', en: 'History · Items', tipo: 'lista', campos: [['nome', 'Nome', 'Name'], ['texto', 'Texto', 'Text', 'area']] },
    { chave: 'feriados', pt: 'História · Feriados (calendário)', en: 'History · Holidays (calendar)', tipo: 'lista',
      campos: [['nome', 'Nome', 'Name'], ['_datas', 'Datas (dia/mês, separadas por vírgula)', 'Dates (day/month, comma-separated)'],
        ['quando', 'Quando, por extenso (opcional)', 'When, in words (optional)'], ['texto', 'Texto', 'Text', 'area']] },
    { chave: 'relacoes', pt: 'Política', en: 'Politics', tipo: 'lista', campos: [['nome', 'Nome', 'Name'], ['texto', 'Texto', 'Text', 'area']] },
  ],
  grupo: [
    /* NOME, TIPO, TÍTULO E IMAGEM NUMA LINHA (15/11/2026, usuário: "Os botões
       'nome, tipo, título e imagem' devem ficar inline"); a imagem é um
       upload, não mais um endereço digitado. */
    { chave: 'nome', pt: 'Nome', en: 'Name', tipo: 'texto', obrigatorio: true, quarto: true },
    { chave: 'tipo', pt: 'Tipo', en: 'Type', tipo: 'opcoes', quarto: true,
      opcoes: () => Object.entries((typeof GRUPO_TIPOS !== 'undefined' && GRUPO_TIPOS) || _cmw('GRUPO_TIPOS') || {}) },
    { chave: 'titulo', pt: 'Título', en: 'Title', tipo: 'texto', quarto: true },
    { chave: 'imagem', pt: 'Imagem', en: 'Image', tipo: 'imagem', quarto: true },
    /* Os sete tópicos de 15/11/2026, na ordem da janela: Epígrafe, História,
       Localização, Admissão, Organização, Relíquias, Rumores. */
    { chave: 'epigrafe.texto', pt: 'Epígrafe', en: 'Epigraph', tipo: 'area', linhas: 3 },
    { chave: 'epigrafe.autor', pt: 'Autor da epígrafe', en: 'Epigraph author', tipo: 'texto' },
    { chave: 'historia', pt: 'História', en: 'History', tipo: 'area', linhas: 10 },
    /* "Onde" busca uma cidade do catálogo, e a Relíquia, um item (15/11/2026):
       grava o nome (o que a ficha mostra) e a chave (cidade, item). */
    { chave: 'locais', pt: 'Localização', en: 'Location', tipo: 'lista', campos: [['nome', 'Nome', 'Name'], ['onde', 'Onde (cidade)', 'Where (city)', 'cidade'], ['texto', 'Texto', 'Text', 'area']] },
    { chave: 'admissao', pt: 'Admissão', en: 'Admission', tipo: 'area', linhas: 4 },
    { chave: 'organizacao', pt: 'Organização', en: 'Organization', tipo: 'area', linhas: 10 },
    { chave: 'reliquias', pt: 'Relíquias', en: 'Relics', tipo: 'lista', campos: [['nome', 'Item', 'Item', 'item'], ['texto', 'Texto', 'Text', 'area']] },
    { chave: 'rumores', pt: 'Rumores', en: 'Rumors', tipo: 'lista', campos: [['nome', 'Nome', 'Name'], ['texto', 'Texto', 'Text', 'area']] },
  ],
};

const _ler = (o, chave) => chave.split('.').reduce((v, k) => (v == null ? v : v[k]), o);
function _gravar(o, chave, valor) {
  const [a, b] = chave.split('.');
  if (!b) return { ...o, [a]: valor };
  return { ...o, [a]: { ...(o[a] || {}), [b]: valor } };
}
/* O que vai para o banco: sem campos vazios, sem objetos vazios, e o feriado
   com `datas` (várias) ou `dia`/`mes` (uma), como no código. */
function _limparEntrada(e) {
  const out = {};
  Object.entries(e).forEach(([k, v]) => {
    if (v == null || v === '') return;
    if (Array.isArray(v)) {
      const itens = v.map((it) => {
        const x = {};
        Object.entries(it).forEach(([ik, iv]) => { if (ik !== '_datas' && iv != null && iv !== '') x[ik] = iv; });
        if ('_datas' in it) {
          delete x.datas; delete x.dia; delete x.mes;
          const ds = _lerDatas(it._datas);
          if (ds.length === 1) { x.dia = ds[0].dia; x.mes = ds[0].mes; } else if (ds.length > 1) x.datas = ds;
        }
        return x;
      }).filter((x) => x.nome);
      if (itens.length) out[k] = itens;
      return;
    }
    if (typeof v === 'object') {
      const x = {};
      Object.entries(v).forEach(([ik, iv]) => { if (iv != null && iv !== '') x[ik] = iv; });
      if (Object.keys(x).length) out[k] = x;
      return;
    }
    out[k] = typeof v === 'string' ? v.replace(/\r\n/g, '\n') : v;
  });
  return out;
}
const _slugLivre = (tipo, nome) => {
  const base = String(nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || tipo;
  const usados = new Set(mundoVigente(tipo).map((e) => e.slug));
  let s = base, n = 2;
  while (usados.has(s)) s = base + '-' + (n++);
  return s;
};

/* ── A IMAGEM POR UPLOAD (15/11/2026, usuário: "Remova o botão 'Imagem
   (endereço)' em editar grupo e adicionar um botão para fazer upload de uma
   imagem") ────────────────────────────────────────────────────────────────
   Vai para o bucket `avatares`, na pasta de quem envia (a policy só deixa o
   dono escrever ali) — o mesmo caminho da imagem do capítulo. Imagem grande
   encolhe para 1600px em WebP antes de subir. */
const MUNDO_IMAGEM_LADO = 1600;
function _encolherImagem(file) {
  return new Promise((ok, falha) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const escala = Math.min(1, MUNDO_IMAGEM_LADO / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? ok(b) : falha(new Error('sem_imagem'))), 'image/webp', 0.86);
    };
    img.onerror = () => { URL.revokeObjectURL(url); falha(new Error('sem_imagem')); };
    img.src = url;
  });
}
function CampoImagemMundo({ id, rotulo, valor, onMudar, pasta, en }) {
  const [enviando, setEnviando] = React.useState(false);
  const [erro, setErro] = React.useState(null);
  const entradaRef = React.useRef(null);
  const enviar = async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    if (!/^image\//.test(file.type)) { setErro(en ? 'Choose an image file.' : 'Escolha um arquivo de imagem.'); return; }
    setErro(null); setEnviando(true);
    try {
      const arq = await _encolherImagem(file).catch(() => file);
      const { data: quem } = await supabaseClient.auth.getUser();
      const uid = quem && quem.user && quem.user.id;
      if (!uid) throw new Error(en ? 'Sign in again.' : 'Entre de novo.');
      const caminho = `${uid}/mundo/${pasta}-${Date.now()}.webp`;
      const up = await supabaseClient.storage.from('avatares')
        .upload(caminho, arq, { upsert: true, contentType: arq.type || 'image/webp', cacheControl: '3600' });
      if (up.error) throw up.error;
      const { data: pub } = supabaseClient.storage.from('avatares').getPublicUrl(caminho);
      onMudar(pub.publicUrl);
    } catch (e) {
      setErro((en ? 'Could not upload: ' : 'Não deu para enviar: ') + (e.message || e));
    } finally {
      setEnviando(false);
    }
  };
  return (
    <div className="mundo-imagem">
      <span className="diario-field-label" id={id + '-rot'}>{rotulo}</span>
      <div className="mundo-imagem-linha">
        {valor && <img className="mundo-imagem-mini" src={valor} alt="" />}
        <button type="button" className="btn-ghost btn-sm mundo-imagem-enviar" aria-describedby={id + '-rot'}
          disabled={enviando} onClick={() => entradaRef.current && entradaRef.current.click()}>
          <i className={'ti ' + (enviando ? 'ti-loader-2' : 'ti-upload')} aria-hidden="true" />
          {enviando ? (en ? 'Uploading…' : 'Enviando…') : valor ? (en ? 'Replace' : 'Trocar') : (en ? 'Upload' : 'Enviar')}
        </button>
        {valor && !enviando && (
          <button type="button" className="btn-icon btn-sm" aria-label={en ? 'Remove image' : 'Tirar a imagem'} onClick={() => onMudar('')}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        )}
        <input ref={entradaRef} type="file" accept="image/*" hidden onChange={enviar} />
      </div>
      {erro && <p className="mundo-imagem-erro" role="alert">{erro}</p>}
    </div>
  );
}

/* ── A BUSCA NO CATÁLOGO (15/11/2026, usuário: "Ao adicionar localização, o
   campo para dizer onde deve buscar uma cidade do catálogo. Ao adicionar
   relíquia também deve buscar um item do catálogo") ─────────────────────
   Digita, e até oito do catálogo aparecem embaixo; escolher grava o nome e
   a chave. O texto digitado sem escolher também vale — um lugar que ainda
   não está no catálogo continua podendo ser escrito. */
function BuscaNoCatalogo({ id, valor, opcoes, onDigitar, onEscolher, en, carregando }) {
  const [aberto, setAberto] = React.useState(false);
  const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = semAcento(valor).trim();
  const achados = q ? (opcoes || []).filter((o) => semAcento(o.nome).includes(q)).slice(0, 8) : [];
  return (
    <div className="mundo-busca">
      <input id={id} className="diario-input" value={valor || ''} autoComplete="off" role="combobox"
        aria-expanded={aberto && achados.length > 0} aria-controls={id + '-lista'}
        placeholder={carregando ? (en ? 'Loading the catalog…' : 'Carregando o catálogo…') : (en ? 'Search the catalog' : 'Buscar no catálogo')}
        onFocus={() => setAberto(true)} onBlur={() => setAberto(false)}
        onChange={(e) => { onDigitar(e.target.value); setAberto(true); }} />
      {aberto && achados.length > 0 && (
        <ul id={id + '-lista'} className="mundo-busca-lista" role="listbox">
          {achados.map((o) => (
            <li key={o.chave} role="option" aria-selected={false}
              onMouseDown={(e) => { e.preventDefault(); onEscolher(o); setAberto(false); }}>
              <span className="mundo-busca-nome">{o.nome}</span>
              {o.meta && <span className="mundo-busca-meta">{o.meta}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* As cidades e os itens do catálogo, para a busca — carregados uma vez. */
let _opcoesMundo = null;
function useOpcoesDoCatalogo(ligado) {
  const [opcoes, setOpcoes] = React.useState(_opcoesMundo);
  React.useEffect(() => {
    if (!ligado || _opcoesMundo) return undefined;
    let vivo = true;
    const paginada = (typeof fetchTabelaPaginada === 'function' ? fetchTabelaPaginada : _cmw('fetchTabelaPaginada'));
    Promise.all([
      supabaseClient.rpc('listar_catalogo_global', { p_tipo: 'cidade' }),
      paginada ? paginada('itens', { colunas: 'slug, nome, grupo', ordem: ['nome'] })
               : supabaseClient.from('itens').select('slug, nome, grupo').order('nome'),
    ]).then(([cid, its]) => {
      const cidades = ((cid && cid.data && cid.data.entradas) || []).map((c) => ({ chave: c.id, nome: c.nome }));
      const itens = ((its && its.data) || []).map((i) => ({ chave: i.slug, nome: i.nome, meta: i.grupo }));
      _opcoesMundo = { cidades, itens };
      if (vivo) setOpcoes(_opcoesMundo);
    }).catch(() => { if (vivo) setOpcoes({ cidades: [], itens: [] }); });
    return () => { vivo = false; };
  }, [ligado]);
  return opcoes;
}

/* A JANELA DE EDITAR — a mesma do editor de catálogo (.modal-catalogo):
   campos sem borda, Excluir no rodapé no lugar do Cancelar, em dois cliques. */
function EditorMundo({ tipo, entrada, lang, onClose, onSalvo, onExcluido }) {
  const en = lang === 'en';
  const Modal = (typeof ModalShell !== 'undefined' && ModalShell) || _cmw('ModalShell');
  const Select = (typeof SelectPill !== 'undefined' && SelectPill) || _cmw('SelectPill');
  const campos = CAMPOS_MUNDO[tipo];
  const [form, setForm] = React.useState(() => {
    const e = { ...(entrada || {}) };
    campos.filter((c) => c.tipo === 'lista').forEach((c) => {
      e[c.chave] = (e[c.chave] || []).map((it) => (c.chave === 'feriados' ? { ...it, _datas: _dataTxt(it) } : { ...it }));
    });
    return e;
  });
  const [salvando, setSalvando] = React.useState(false);
  const [armado, setArmado] = React.useState(false);
  const [erro, setErro] = React.useState(null);
  const nomeOk = String(form.nome || '').trim() !== '';
  const novo = !entrada;

  const salvar = async () => {
    if (!nomeOk || salvando) return;
    setSalvando(true); setErro(null);
    try {
      const dados = _limparEntrada({ ...form, slug: form.slug || _slugLivre(tipo, form.nome) });
      await salvarNoMundo(tipo, dados);
      onSalvo && onSalvo(dados);
    } catch (e) {
      setErro(en ? 'Could not save. Only the administrator edits the world catalog.' : 'Não foi possível salvar. Só o administrador edita o catálogo do mundo.');
      setSalvando(false);
    }
  };
  const excluir = async () => {
    if (!armado) { setArmado(true); return; }
    setSalvando(true); setErro(null);
    try { await removerDoMundo(tipo, entrada.slug); onExcluido && onExcluido(); }
    catch (e) { setErro(en ? 'Could not delete.' : 'Não foi possível excluir.'); setSalvando(false); setArmado(false); }
  };

  const rot = (c) => (en ? c.en : c.pt);
  // As buscas de cidade e item só carregam o catálogo se o formulário as tem.
  const precisaCatalogo = campos.some((c) => c.tipo === 'lista' && c.campos.some((x) => x[3] === 'cidade' || x[3] === 'item'));
  const opcoesCatalogo = useOpcoesDoCatalogo(precisaCatalogo);
  const classeCampo = (c) => 'mundo-campo' + (c.meia ? ' mundo-campo--meia' : '') + (c.quarto ? ' mundo-campo--quarto' : '');
  const campoSimples = (c) => {
    const id = 'mundo-' + c.chave.replace('.', '-');
    const v = _ler(form, c.chave) || '';
    const mudar = (val) => setForm((f) => _gravar(f, c.chave, val));
    if (c.tipo === 'opcoes' && Select) {
      const ops = [{ value: '', label: '—' }, ...c.opcoes().map(([k, o]) => ({ value: k, label: en ? o.en : o.pt }))];
      return <div key={c.chave} className={classeCampo(c)}><Select label={rot(c)} value={v} options={ops} onChange={mudar} /></div>;
    }
    if (c.tipo === 'imagem') {
      return (
        <div key={c.chave} className={classeCampo(c)}>
          <CampoImagemMundo id={id} rotulo={rot(c)} valor={v} onMudar={mudar} en={en}
            pasta={tipo + '-' + (form.slug || _slugLivre(tipo, form.nome || tipo))} />
        </div>
      );
    }
    return (
      <div key={c.chave} className={classeCampo(c)}>
        <label className="diario-field-label" htmlFor={id}>{rot(c)}</label>
        {c.tipo === 'area'
          ? <textarea id={id} className="diario-textarea" rows={c.linhas || 4} value={v} onChange={(e) => mudar(e.target.value)} />
          : <input id={id} className="diario-input" value={v} onChange={(e) => mudar(e.target.value)} autoComplete="off" />}
      </div>
    );
  };
  const campoLista = (c) => {
    const itens = form[c.chave] || [];
    const mudarItem = (i, k, val) => setForm((f) => ({ ...f, [c.chave]: f[c.chave].map((it, j) => (j === i ? { ...it, [k]: val } : it)) }));
    const mudarItemVarios = (i, patch) => setForm((f) => ({ ...f, [c.chave]: f[c.chave].map((it, j) => (j === i ? { ...it, ...patch } : it)) }));
    const tirar = (i) => setForm((f) => ({ ...f, [c.chave]: f[c.chave].filter((_, j) => j !== i) }));
    const por = () => setForm((f) => ({ ...f, [c.chave]: [...(f[c.chave] || []), {}] }));
    return (
      <section key={c.chave} className="mundo-lista" aria-label={rot(c)}>
        <div className="mundo-lista-cab">
          <span className="diario-field-label">{rot(c)}</span>
          <span className="mundo-lista-conta">{itens.length}</span>
        </div>
        {itens.map((it, i) => (
          <div key={i} className="mundo-lista-item">
            {c.campos.map(([k, pt, ing, area]) => {
              const id = `mundo-${c.chave}-${i}-${k}`;
              // 'cidade' e 'item': a busca no catálogo; grava o nome em `k` e a chave ao lado.
              const busca = area === 'cidade' || area === 'item';
              return (
                <div key={k} className={'mundo-campo' + (area && !busca ? '' : ' mundo-campo--meia')}>
                  <label className="diario-field-label" htmlFor={id}>{en ? ing : pt}</label>
                  {busca ? (
                    <BuscaNoCatalogo id={id} valor={it[k]} en={en} carregando={!opcoesCatalogo}
                      opcoes={opcoesCatalogo ? (area === 'cidade' ? opcoesCatalogo.cidades : opcoesCatalogo.itens) : []}
                      onDigitar={(val) => mudarItemVarios(i, { [k]: val, [area]: undefined })}
                      onEscolher={(o) => mudarItemVarios(i, { [k]: o.nome, [area]: o.chave })} />
                  ) : area
                    ? <textarea id={id} className="diario-textarea" rows={3} value={it[k] || ''} onChange={(e) => mudarItem(i, k, e.target.value)} />
                    : <input id={id} className="diario-input" value={it[k] || ''} onChange={(e) => mudarItem(i, k, e.target.value)} autoComplete="off" />}
                </div>
              );
            })}
            <button type="button" className="mundo-lista-tirar" onClick={() => tirar(i)}>
              <i className="ti ti-trash" aria-hidden="true" />{en ? 'Remove' : 'Tirar'}
            </button>
          </div>
        ))}
        <button type="button" className="btn-ghost btn-md mundo-lista-por" onClick={por}>
          <i className="ti ti-plus" aria-hidden="true" />{en ? 'Add' : 'Adicionar'}
        </button>
      </section>
    );
  };

  const titulo = tipo === 'entidade'
    ? (novo ? (en ? 'New entity' : 'Nova entidade') : (en ? 'Edit entity' : 'Editar entidade'))
    : (novo ? (en ? 'New group' : 'Novo grupo') : (en ? 'Edit group' : 'Editar grupo'));
  const botaoExcluir = !novo ? (
    <button type="button" className={'btn-danger btn-md' + (armado ? ' is-armado' : '')} onClick={excluir} disabled={salvando}>
      {armado ? (en ? 'Confirm delete' : 'Confirmar exclusão') : (en ? 'Delete' : 'Excluir')}
    </button>
  ) : null;

  return (
    <Modal title={titulo} lang={lang} size="lg" extraClass="modal-catalogo modal-mundo"
      onClose={onClose} onConfirm={salvar}
      confirmLabel={salvando ? (en ? 'Saving…' : 'Salvando…') : undefined}
      confirmDisabled={salvando || !nomeOk} footerLeft={botaoExcluir}>
      {armado && (
        <div className="err-msg" role="alert">
          {en ? 'Click "Confirm delete" to delete. It disappears for every table.' : 'Clique em "Confirmar exclusão" para excluir. Some para todas as mesas.'}
        </div>
      )}
      <div className="mundo-form">
        {campos.map((c) => (c.tipo === 'lista' ? campoLista(c) : campoSimples(c)))}
      </div>
      {erro && <div className="err-msg">{erro}</div>}
    </Modal>
  );
}

Object.assign(window, {
  mundoVigente, carregarCatalogoMundo, definirCatalogoMundo, useCatalogoMundo, salvarNoMundo, removerDoMundo,
  EditorMundo, CAMPOS_MUNDO, limparEntradaMundo: _limparEntrada,
  // O campo de imagem por upload também serve ao editor de Reinos (13-diario/diario.jsx).
  CampoImagemMundo,
});
