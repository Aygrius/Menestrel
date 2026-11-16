/* ============================================================
   forum.jsx — [Fórum] salas temáticas, tópicos e respostas (15/11/2026)
   ============================================================
   Pedido do usuário: "Vamos criar uma pagina de fórum, o perfil gratuito não
   poderá participar. Teremos salas temáticas, onde o perfil poderá criar
   tópicos para discussão. Os tópicos podem ter resposta de outros membros
   pagantes. Os membros de conta gratuita só podem visualizar e curtir o
   tópico e as respostas, não poderá responder ou criar tópicos."

   E as regras confirmadas no mesmo dia ("Em relação ao fórum, está correto"):
     • salas: só o Imperador cria, renomeia e fecha;
     • tópicos e respostas: Conselheiro, Nobre e Imperador; o autor edita e
       apaga o seu, o Imperador apaga qualquer um;
     • Plebeu (e o Nobre vencido) lê e curte.

   O banco decide (RLS e funções em scripts/sql/tipos-de-conta-e-forum-
   2026-11-15.sql); a tela só não oferece o que vai ser recusado. O nome de
   quem escreveu vem pelas funções forum_* — profiles só se lê a própria
   linha.

   A página é a da Ambientação: o cartão de página (.pjs.diario-pagina), o
   trilho de cima com o caminho (Salas › sala › tópico), a busca e o +.
   ============================================================ */

const { useState: useStateF, useEffect: useEffectF, useMemo: useMemoF, useCallback: useCallbackF } = React;
const _f = (nome) => (typeof window !== 'undefined' ? window[nome] : undefined);

const forumSemAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* O + DENTRO DA SALA (15/11/2026, usuário: "O botão 'nova sala aqui' não vai
   existir. Ao clicar em mais, terei a opção de criar um novo tópico ou nova
   sala"). Só para quem pode abrir sala (o Imperador); para os outros o +
   continua abrindo direto o tópico. Abre sob o +, alinhado pela direita, e
   fecha no clique fora, no Esc ou ao escolher. Vai para dentro do #root
   (portal), onde valem os tokens da .menestrel-ui. */
function ForumMenuNovo({ pos, en, onTopico, onSala, onClose }) {
  const ref = React.useRef(null);
  useEffectF(() => {
    const fora = (e) => { if (ref.current && !ref.current.contains(e.target) && !(e.target.closest && e.target.closest('.best-botao-novo'))) onClose(); };
    const tecla = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', fora, true);
    document.addEventListener('keydown', tecla, true);
    const primeiro = ref.current && ref.current.querySelector('button');
    if (primeiro) primeiro.focus({ preventScroll: true });
    return () => { document.removeEventListener('pointerdown', fora, true); document.removeEventListener('keydown', tecla, true); };
  }, [onClose]);
  const item = (icone, rotulo, onClick) => (
    <button type="button" role="menuitem" className="forum-menu-novo-item" onClick={() => { onClose(); onClick(); }}>
      <i className={'ti ' + icone} aria-hidden="true" />{rotulo}
    </button>
  );
  const alvo = document.getElementById('root') || document.body;
  return ReactDOM.createPortal(
    <div className="menestrel-ui forum-menu-novo" role="menu" ref={ref} aria-label={en ? 'Create' : 'Criar'}
      style={{ position: 'fixed', top: pos.top, right: pos.right }}>
      {item('ti-message', en ? 'New topic' : 'Novo tópico', onTopico)}
      {item('ti-door', en ? 'New room' : 'Nova sala', onSala)}
    </div>, alvo);
}

/* "há 5 min", "há 2 h", "ontem", "12/11/2026" — a hora de uma conversa. */
function forumQuando(iso, en) {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  const s = Math.max(0, (Date.now() - dt.getTime()) / 1000);
  if (s < 60) return en ? 'just now' : 'agora';
  if (s < 3600) { const m = Math.floor(s / 60); return en ? `${m} min ago` : `há ${m} min`; }
  if (s < 86400) { const h = Math.floor(s / 3600); return en ? `${h} h ago` : `há ${h} h`; }
  if (s < 172800) return en ? 'yesterday' : 'ontem';
  return dt.toLocaleDateString(en ? 'en-US' : 'pt-BR');
}

/* Quem pode o quê, perguntado ao banco uma vez por página. */
function useForumPapel() {
  const [papel, setPapel] = useStateF({ pronto: false, podeEscrever: false, ehImperador: false, eu: null });
  useEffectF(() => {
    let vivo = true;
    Promise.all([
      supabaseClient.rpc('pode_escrever_forum'),
      supabaseClient.rpc('eh_admin'),
      supabaseClient.auth.getUser(),
    ]).then(([esc, adm, u]) => {
      if (!vivo) return;
      setPapel({
        pronto: true,
        podeEscrever: !esc.error && esc.data === true,
        ehImperador: !adm.error && adm.data === true,
        eu: (u && u.data && u.data.user && u.data.user.id) || null,
      });
    }).catch(() => { if (vivo) setPapel((p) => ({ ...p, pronto: true })); });
    return () => { vivo = false; };
  }, []);
  return papel;
}

/* Curtir é de todo mundo logado; cada um mexe só na sua curtida. */
async function forumCurtir({ topicoId = null, respostaId = null, curtido, eu }) {
  const coluna = topicoId != null ? 'topico_id' : 'resposta_id';
  const valor = topicoId != null ? topicoId : respostaId;
  if (curtido) {
    return supabaseClient.from('forum_curtidas').delete().eq('user_id', eu).eq(coluna, valor);
  }
  return supabaseClient.from('forum_curtidas').insert({ [coluna]: valor });
}

/* O ESTADO DO TÓPICO EM UM ÍCONE (15/11/2026, usuário: "Crie um sistema de
   ícones para tópicos com novas mensagens, tópicos sem mensagens novas,
   tópico fechado"). O vocabulário é o da correspondência, o do Menestrel:
     novo     a carta LACRADA, em ouro — o que está vivo (o título sobe a 700);
     lido     a carta ABERTA, na tinta apagada — nada a ler;
     fechado  o cadeado, na tinta apagada — vale mais que os outros dois.
   Os três ícones têm versão preenchida (src/tabler-filled.css), então quem
   separa um do outro é a FORMA e a COR, nunca contorno contra cheio. O nome
   do estado vai no aria-label e na legenda, que mora no pé da lista. */
const ESTADOS_DO_TOPICO = {
  novo:    { icone: 'ti-mail',        pt: 'Mensagens novas',     en: 'New messages' },
  lido:    { icone: 'ti-mail-opened', pt: 'Sem mensagens novas', en: 'No new messages' },
  fechado: { icone: 'ti-lock',        pt: 'Tópico fechado',      en: 'Closed topic' },
};
const estadoDoTopico = (t) => (t.fechado ? 'fechado' : t.novas ? 'novo' : 'lido');
function ForumEstado({ estado, en }) {
  const e = ESTADOS_DO_TOPICO[estado] || ESTADOS_DO_TOPICO.lido;
  return (
    <span className={'forum-estado forum-estado--' + estado} role="img" aria-label={en ? e.en : e.pt}>
      <i className={'ti ' + e.icone} aria-hidden="true" />
    </span>
  );
}
function ForumLegenda({ en }) {
  return (
    <ul className="forum-legenda" aria-label={en ? 'Topic icons' : 'Os ícones dos tópicos'}>
      {Object.keys(ESTADOS_DO_TOPICO).map((k) => (
        <li key={k}><ForumEstado estado={k} en={en} /><span>{en ? ESTADOS_DO_TOPICO[k].en : ESTADOS_DO_TOPICO[k].pt}</span></li>
      ))}
    </ul>
  );
}

/* O CORAÇÃO É UM BOTÃO COMO OS OUTROS (15/11/2026, usuário: "o ícone de
   coração terá o mesmo estilo dos outros (editar, excluir, etc) não precisa
   mostrar a quantidade"). O .btn-icon de Editar e Apagar; curtido, em ouro. */
function ForumCurtir({ curtido, onAlternar, en, desativado = false }) {
  return (
    <button type="button" className={'btn-icon btn-sm forum-curtir' + (curtido ? ' is-on' : '')} aria-pressed={curtido}
      disabled={desativado}
      aria-label={curtido ? (en ? 'Unlike' : 'Descurtir') : (en ? 'Like' : 'Curtir')}
      onClick={(e) => { e.stopPropagation(); onAlternar(); }}>
      <i className="ti ti-heart" aria-hidden="true" />
    </button>
  );
}

/* Quem escreveu: retrato, nome e o tipo da conta (Imperador na tinta forte). */
function ForumAutor({ nome, avatar, conta, quando, editado, en }) {
  const nomeConta = (_f('nomeDaConta') || ((t) => t))(conta, en);
  return (
    <div className="forum-autor">
      {avatar
        ? <img className="forum-autor-foto" src={avatar} alt="" referrerPolicy="no-referrer" />
        : <span className="forum-autor-foto forum-autor-foto--vazia" aria-hidden="true">{String(nome || '?').trim().charAt(0).toUpperCase()}</span>}
      <span className="forum-autor-nome">{nome || (en ? 'Someone' : 'Alguém')}</span>
      {conta && conta !== 'plebeu' && <span className={'forum-autor-conta' + (conta === 'imperador' ? ' is-imperador' : '')}>{nomeConta}</span>}
      {quando && <span className="forum-autor-quando">{quando}{editado ? (en ? ' · edited' : ' · editado') : ''}</span>}
    </div>
  );
}

/* O texto do tópico ou da resposta: parágrafos, sem HTML. */
function ForumTexto({ texto }) {
  const paragrafos = String(texto || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="forum-texto">
      {paragrafos.map((p, i) => (
        <p key={i}>{p.split('\n').flatMap((l, j) => (j === 0 ? [l] : [<br key={j} />, l]))}</p>
      ))}
    </div>
  );
}

/* A janela de escrever: sala (nome + descrição), tópico (título + texto). */
function ForumEditor({ en, titulo, campos, inicial, rotuloConfirmar, onSalvar, onClose, extraRodape = null }) {
  const Janela = _f('ModalShell');
  const [v, setV] = useStateF(inicial || {});
  const [gravando, setGravando] = useStateF(false);
  const [erro, setErro] = useStateF(null);
  const completo = campos.every((c) => !c.obrigatorio || String(v[c.chave] || '').trim());
  const salvar = async () => {
    if (!completo || gravando) return;
    setGravando(true); setErro(null);
    const r = await onSalvar(v);
    setGravando(false);
    if (r && r.error) { setErro(r.error.message || String(r.error)); return; }
    onClose();
  };
  if (!Janela) return null;
  return (
    <Janela title={titulo} lang={en ? 'en' : 'pt'} size="lg" extraClass="forum-editor" onClose={onClose}
      onCancel={onClose} onConfirm={salvar} confirmLabel={rotuloConfirmar}
      confirmDisabled={!completo || gravando} footerLeft={extraRodape}>
      {campos.map((c, i) => (
        <React.Fragment key={c.chave}>
          <label className={'diario-field-label' + (i ? ' diario-field-label--mt' : '')} htmlFor={'forum-' + c.chave}>{c.rotulo}</label>
          {c.linhas
            ? <textarea id={'forum-' + c.chave} className="diario-textarea" rows={c.linhas} maxLength={c.max}
                value={v[c.chave] || ''} onChange={(e) => setV({ ...v, [c.chave]: e.target.value })} autoFocus={i === 0} />
            : <input id={'forum-' + c.chave} className="diario-input" type="text" maxLength={c.max}
                value={v[c.chave] || ''} onChange={(e) => setV({ ...v, [c.chave]: e.target.value })} autoFocus={i === 0} />}
        </React.Fragment>
      ))}
      {erro && <p className="forum-erro" role="alert">{erro}</p>}
    </Janela>
  );
}

/* Confirmar antes de apagar — na janela do sistema, nunca no confirm() do navegador. */
function ForumConfirmar({ en, titulo, texto, onConfirmar, onClose }) {
  const Janela = _f('ModalShell');
  const [gravando, setGravando] = useStateF(false);
  const [erro, setErro] = useStateF(null);
  if (!Janela) return null;
  return (
    <Janela title={titulo} lang={en ? 'en' : 'pt'} size="sm" onClose={onClose} onCancel={onClose}
      confirmLabel={en ? 'Delete' : 'Apagar'} confirmDisabled={gravando}
      onConfirm={async () => {
        setGravando(true);
        const r = await onConfirmar();
        setGravando(false);
        if (r && r.error) { setErro(r.error.message || String(r.error)); return; }
        onClose();
      }}>
      <p className="forum-confirmar">{texto}</p>
      {erro && <p className="forum-erro" role="alert">{erro}</p>}
    </Janela>
  );
}

function ForumView({ lang = 'pt' }) {
  const en = lang === 'en';
  const papel = useForumPapel();
  const [salaId, setSalaId] = useStateF(null);
  const [topicoId, setTopicoId] = useStateF(null);
  const [salas, setSalas] = useStateF(null);
  const [topicos, setTopicos] = useStateF(null);
  const [topico, setTopico] = useStateF(null);
  const [erro, setErro] = useStateF(null);
  const [query, setQuery] = useStateF('');
  const [janela, setJanela] = useStateF(null);     // { tipo, ... }
  const [resposta, setResposta] = useStateF('');
  const [enviando, setEnviando] = useStateF(false);
  const [editandoResposta, setEditandoResposta] = useStateF(null);  // { id, corpo }

  const carregarSalas = useCallbackF(async () => {
    const { data, error } = await supabaseClient.rpc('forum_salas_resumo');
    if (error) { console.error('[fórum] salas:', error); setErro(error.message); setSalas([]); return; }
    setErro(null); setSalas(data || []);
  }, []);
  const carregarTopicos = useCallbackF(async (id) => {
    const { data, error } = await supabaseClient.rpc('forum_topicos_da_sala', { p_sala: id });
    if (error) { console.error('[fórum] tópicos:', error); setErro(error.message); setTopicos([]); return; }
    setErro(null); setTopicos(data || []);
  }, []);
  const carregarTopico = useCallbackF(async (id) => {
    const { data, error } = await supabaseClient.rpc('forum_topico', { p_id: id });
    if (error) { console.error('[fórum] tópico:', error); setErro(error.message); setTopico(null); return; }
    setErro(null); setTopico(data || null);
  }, []);

  useEffectF(() => { carregarSalas(); }, [carregarSalas]);
  useEffectF(() => { setQuery(''); if (salaId != null) { setTopicos(null); carregarTopicos(salaId); } }, [salaId, carregarTopicos]);
  useEffectF(() => {
    setResposta(''); setEditandoResposta(null);
    // Voltando do tópico para a sala: a lista se refaz (o lido deixa de ser novo).
    if (topicoId == null) { if (salaId != null) carregarTopicos(salaId); return; }
    setTopico(null);
    // Cada abertura conta uma visualização (15/11/2026); depois carrega.
    Promise.resolve(supabaseClient.rpc('forum_ver_topico', { p_id: topicoId })).catch(() => {})
      .then(() => carregarTopico(topicoId));
  }, [topicoId, carregarTopico]);

  const sala = (salas || []).find((s) => s.id === salaId) || null;
  /* SALAS DENTRO DE SALAS (15/11/2026, usuário: "será possível o mestre criar
     salas dentro de salas"). A função devolve todas; a árvore e o caminho
     saem daqui. `pai_id` nulo é o primeiro nível. */
  const filhas = (pai) => (salas || []).filter((s) => (s.pai_id == null ? null : s.pai_id) === pai);
  const caminhoAte = (id) => {
    const porId = new Map((salas || []).map((s) => [s.id, s]));
    const passos = [];
    const vistos = new Set();
    let s = porId.get(id);
    while (s && !vistos.has(s.id)) { vistos.add(s.id); passos.unshift(s); s = s.pai_id != null ? porId.get(s.pai_id) : null; }
    return passos;
  };
  const salaFechada = !!(sala && sala.fechada);
  const podeEscreverAqui = papel.podeEscrever && !salaFechada;
  const recarregar = () => {
    carregarSalas();
    if (salaId != null) carregarTopicos(salaId);
    if (topicoId != null) carregarTopico(topicoId);
  };

  const irSalas = () => { setTopicoId(null); setSalaId(null); };
  const irSala = (id) => { setTopicoId(null); setSalaId(id); };

  /* O TRILHO: o caminho até aqui, como as páginas da Ambientação — o último
     passo aceso. */
  const passo = (chave, icone, rotulo, ativo, onClick) => (
    <button key={chave} type="button" className={'mc-acao' + (ativo ? ' is-ativo' : '')}
      aria-current={ativo ? 'page' : undefined} onClick={onClick}>
      <i className={'ti ' + icone} aria-hidden="true" />
      <span className="mc-acao-rotulo">{rotulo}</span>
    </button>
  );
  const trilho = (
    <nav className="mc-acao-grupo trilho-paginas forum-caminho" aria-label={en ? 'Forum path' : 'Caminho no fórum'}>
      {passo('salas', 'ti-building-castle', en ? 'Rooms' : 'Salas', salaId == null, irSalas)}
      {salaId != null && caminhoAte(salaId).map((s) => passo('sala-' + s.id, 'ti-door', s.nome, s.id === salaId && topicoId == null, () => irSala(s.id)))}
      {topico && topicoId != null && passo('topico', 'ti-message', topico.titulo, true, () => {})}
    </nav>
  );

  const Busca = _f('BestBuscaENovo');
  const ac = (typeof ADMIN_COPY !== 'undefined' && (ADMIN_COPY[lang] || ADMIN_COPY.pt)) || {};
  const q = forumSemAcento(query.trim());
  const naSala = salaId != null && topicoId == null;
  const naRaiz = salaId == null;
  const podeCriar = naRaiz ? papel.ehImperador : (naSala ? podeEscreverAqui : false);
  const [menuNovo, setMenuNovo] = useStateF(null);   // { top, right } do + que abriu
  const onNovo = () => {
    if (naRaiz) { setJanela({ tipo: 'sala' }); return; }
    if (naSala && papel.ehImperador) {
      if (menuNovo) { setMenuNovo(null); return; }
      const b = document.querySelector('.forum .best-botao-novo');
      const r = b ? b.getBoundingClientRect() : null;
      setMenuNovo(r ? { top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) } : { top: 80, right: 24 });
      return;
    }
    setJanela({ tipo: 'topico' });
  };

  const curtirTopico = async (t) => {
    await forumCurtir({ topicoId: t.id, curtido: t.eu_curti, eu: papel.eu });
    recarregar();
  };
  const curtirResposta = async (r) => {
    await forumCurtir({ respostaId: r.id, curtido: r.eu_curti, eu: papel.eu });
    carregarTopico(topicoId);
  };
  const responder = async () => {
    const corpo = resposta.trim();
    if (!corpo || enviando) return;
    setEnviando(true);
    const { error } = await supabaseClient.from('forum_respostas').insert({ topico_id: topicoId, corpo });
    setEnviando(false);
    if (error) { setErro(error.message); return; }
    setResposta('');
    carregarTopico(topicoId);
  };
  const salvarResposta = async () => {
    const corpo = String(editandoResposta.corpo || '').trim();
    if (!corpo) return;
    const { error } = await supabaseClient.from('forum_respostas').update({ corpo }).eq('id', editandoResposta.id);
    if (error) { setErro(error.message); return; }
    setEditandoResposta(null);
    carregarTopico(topicoId);
  };

  // Quem não escreve fica sabendo por quê, uma vez, sem bloquear a leitura.
  const avisoLeitura = papel.pronto && !papel.podeEscrever && (
    <p className="forum-aviso">
      <i className="ti ti-eye" aria-hidden="true" />
      {en ? 'Commoner accounts read and like. Writing is for Nobles and Counselors.'
          : 'Contas Plebeu leem e curtem. Escrever é para Nobres e Conselheiros.'}
    </p>
  );

  /* A LINHA DA SALA (15/11/2026, usuário: "Na sala, além da quantidade de
     tópicos, mostre a quantidade de salas, mostre também o título do último
     tópico postado, e o nome do usuário"): o nome e a descrição; quantos
     tópicos e quantas salas há dentro; o último tópico (dela ou das de
     dentro), com quem postou e quando. */
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  /* A LINHA NÃO É UM BOTÃO COM BOTÕES DENTRO (revisão de 15/11/2026): o título
     é o botão que abre, e a área dele se estende pela linha inteira
     (.forum-linha-abrir::after) — o coração e o lápis ficam por cima, como
     botões irmãos. Antes a linha era role="button" com botões dentro, o que
     confunde leitor de tela e teclado. */
  const linhaSala = (s) => (
    <li key={s.id} className="mn-quadro-linha forum-linha forum-linha--sala">
      <button type="button" className="forum-linha-txt forum-linha-abrir" onClick={() => irSala(s.id)}>
        <span className="forum-linha-titulo">
          {s.fechada && <i className="ti ti-lock forum-fechada" aria-label={en ? 'Closed' : 'Fechada'} />}
          {s.nome}
        </span>
        {s.descricao && <span className="forum-linha-meta">{s.descricao}</span>}
      </button>
      <div className="forum-contas">
        <span>{plural(s.topicos, en ? 'topic' : 'tópico', en ? 'topics' : 'tópicos')}</span>
        <span>{plural(s.salas, en ? 'room' : 'sala', en ? 'rooms' : 'salas')}</span>
      </div>
      <div className="forum-ultimo">
        {s.ultimo_topico_titulo ? (
          <>
            <span className="forum-ultimo-titulo">{s.ultimo_topico_titulo}</span>
            <span className="forum-ultimo-meta">
              {(s.ultimo_topico_autor || (en ? 'Someone' : 'Alguém')) + ' · ' + forumQuando(s.ultimo_topico_em, en)}
            </span>
          </>
        ) : <span className="forum-ultimo-meta">{en ? 'No topics yet' : 'Nenhum tópico ainda'}</span>}
      </div>
      {papel.ehImperador ? (
        <button type="button" className="btn-icon btn-sm forum-acao" aria-label={en ? 'Edit room' : 'Editar sala'}
          onClick={(e) => { e.stopPropagation(); setJanela({ tipo: 'sala', sala: s }); }}>
          <i className="ti ti-pencil" aria-hidden="true" />
        </button>
      ) : <span aria-hidden="true" />}
    </li>
  );
  /* A LINHA DO TÓPICO (15/11/2026, usuário: "Na página de tópicos, mostre a
     quantidade de visualizações e quantidade de comentários. Mostre o título
     do último post, horário e nome do usuário"). Resposta não tem título: o
     último post é o começo do texto dela; sem resposta, o próprio tópico. */
  const linhaTopico = (t) => (
    <li key={t.id} className={'mn-quadro-linha forum-linha forum-linha--topico' + (t.novas && !t.fechado ? ' is-novo' : '')}>
      <ForumEstado estado={estadoDoTopico(t)} en={en} />
      <button type="button" className="forum-linha-txt forum-linha-abrir" onClick={() => setTopicoId(t.id)}>
        <span className="forum-linha-titulo">{t.titulo}</span>
        <span className="forum-linha-meta">{(t.autor_nome || (en ? 'Someone' : 'Alguém')) + ' · ' + forumQuando(t.criado_em, en)}</span>
      </button>
      <div className="forum-contas">
        <span>{plural(t.visualizacoes || 0, en ? 'view' : 'visualização', en ? 'views' : 'visualizações')}</span>
        <span>{plural(t.respostas, en ? 'comment' : 'comentário', en ? 'comments' : 'comentários')}</span>
      </div>
      <div className="forum-ultimo">
        {t.ultima_resposta_em ? (
          <>
            <span className="forum-ultimo-titulo">{t.ultima_resposta_trecho}</span>
            <span className="forum-ultimo-meta">{(t.ultima_resposta_autor || (en ? 'Someone' : 'Alguém')) + ' · ' + forumQuando(t.ultima_resposta_em, en)}</span>
          </>
        ) : (
          /* Sem resposta, o último post é o próprio tópico — e o título já está
             ao lado. A coluna diz só que ainda não há conversa. */
          <span className="forum-ultimo-meta">{en ? 'No comments yet' : 'Sem comentários ainda'}</span>
        )}
      </div>
      <ForumCurtir curtidas={t.curtidas} curtido={t.eu_curti} en={en} onAlternar={() => curtirTopico(t)} />
    </li>
  );
  const cabeca = (rotulo, acao = null) => (
    <div className="mn-quadro-cabeca forum-cabeca">
      <span className="mn-rotulo">{rotulo}</span>
      {acao}
    </div>
  );

  /* ── as três vistas ── */
  let corpo;
  if (erro && !salas) {
    corpo = <p className="forum-erro" role="alert">{erro}</p>;
  } else if (naRaiz) {
    const lista = filhas(null).filter((s) => !q || forumSemAcento(s.nome + ' ' + (s.descricao || '')).includes(q));
    corpo = salas === null ? <p className="forum-vazio">{en ? 'Opening the forum…' : 'Abrindo o fórum…'}</p>
      : lista.length === 0 ? (
        <p className="forum-vazio">{q ? (en ? `No room with “${query.trim()}”.` : `Nenhuma sala com “${query.trim()}”.`)
          : papel.ehImperador ? (en ? 'No rooms yet. Open the first one with +.' : 'Nenhuma sala ainda. Abra a primeira no +.')
          : (en ? 'No rooms yet.' : 'Nenhuma sala ainda.')}</p>
      ) : (
        <div className="mn-quadro-grupo forum-quadro">
          <ul className="forum-linhas" aria-label={en ? 'Rooms' : 'Salas'}>{lista.map(linhaSala)}</ul>
        </div>
      );
  } else if (naSala) {
    const lista = (topicos || []).filter((t) => !q || forumSemAcento(t.titulo + ' ' + (t.autor_nome || '')).includes(q));
    const subsalas = filhas(salaId).filter((s) => !q || forumSemAcento(s.nome + ' ' + (s.descricao || '')).includes(q));
    corpo = (
      <>
        {sala && sala.descricao && <p className="forum-sala-desc">{sala.descricao}</p>}
        {salaFechada && <p className="forum-aviso is-alerta"><i className="ti ti-lock" aria-hidden="true" />{en ? 'This room is closed: it can be read, not written in.' : 'Esta sala está fechada: dá para ler, não para escrever.'}</p>}
        {/* As salas de dentro (15/11/2026): primeiro elas, depois os tópicos.
            O Imperador abre uma nova aqui mesmo. */}
        {/* Nova sala dentro desta: pelo + do trilho, que oferece tópico ou sala (ForumMenuNovo). */}
        {subsalas.length > 0 && (
          <div className="mn-quadro-grupo forum-quadro">
            {cabeca(en ? 'Rooms' : 'Salas')}
            <ul className="forum-linhas" aria-label={en ? 'Rooms' : 'Salas'}>{subsalas.map(linhaSala)}</ul>
          </div>
        )}
        {/* Sem tópicos e sem busca, nada (15/11/2026, usuário: "Remova esse
            texto 'Nenhum tópico ainda. Comece um no +.'"): o + está no trilho. */}
        {topicos === null ? <p className="forum-vazio">{en ? 'Loading topics…' : 'Carregando os tópicos…'}</p>
          : lista.length === 0 ? (q ? (
            <p className="forum-vazio">{en ? `No topic with “${query.trim()}”.` : `Nenhum tópico com “${query.trim()}”.`}</p>
          ) : null) : (
            <div className="mn-quadro-grupo forum-quadro">
              {cabeca(en ? 'Topics' : 'Tópicos')}
              <ul className="forum-linhas" aria-label={en ? 'Topics' : 'Tópicos'}>{lista.map(linhaTopico)}</ul>
              <ForumLegenda en={en} />
            </div>
          )}
      </>
    );
  } else {
    const meuTopico = topico && topico.autor_id === papel.eu;
    const podeApagar = (autorId) => autorId === papel.eu || papel.ehImperador;
    corpo = topico === null ? <p className="forum-vazio">{en ? 'Opening the topic…' : 'Abrindo o tópico…'}</p> : (
      <div className="forum-conversa">
        <article className="forum-post forum-post--topico">
          <header className="forum-post-cab">
            <ForumAutor nome={topico.autor_nome} avatar={topico.autor_avatar} conta={topico.autor_conta}
              quando={forumQuando(topico.criado_em, en)} editado={!!topico.editado_em} en={en} />
            <div className="forum-post-acoes">
              {meuTopico && papel.podeEscrever && (
                <button type="button" className="btn-icon btn-sm" aria-label={en ? 'Edit topic' : 'Editar tópico'}
                  onClick={() => setJanela({ tipo: 'topico', topico })}>
                  <i className="ti ti-pencil" aria-hidden="true" />
                </button>
              )}
              {/* Fechar e reabrir (15/11/2026): o autor e o Imperador, como o apagar. */}
              {podeApagar(topico.autor_id) && (
                <button type="button" className="btn-icon btn-sm"
                  aria-label={topico.fechado ? (en ? 'Reopen topic' : 'Reabrir tópico') : (en ? 'Close topic' : 'Fechar tópico')}
                  onClick={async () => {
                    const { error } = await supabaseClient.rpc('forum_fechar_topico', { p_id: topico.id, p_fechado: !topico.fechado });
                    if (error) { setErro(error.message); return; }
                    carregarTopico(topico.id);
                  }}>
                  <i className={'ti ' + (topico.fechado ? 'ti-lock-open' : 'ti-lock')} aria-hidden="true" />
                </button>
              )}
              {podeApagar(topico.autor_id) && (
                <button type="button" className="btn-icon btn-sm" aria-label={en ? 'Delete topic' : 'Apagar tópico'}
                  onClick={() => setJanela({ tipo: 'apagar-topico' })}>
                  <i className="ti ti-trash" aria-hidden="true" />
                </button>
              )}
              <ForumCurtir curtidas={topico.curtidas} curtido={topico.eu_curti} en={en}
                onAlternar={async () => { await forumCurtir({ topicoId: topico.id, curtido: topico.eu_curti, eu: papel.eu }); carregarTopico(topico.id); }} />
            </div>
          </header>
          <h2 className="forum-post-titulo">
            {topico.fechado && <ForumEstado estado="fechado" en={en} />}
            {topico.titulo}
          </h2>
          <ForumTexto texto={topico.corpo} />
        </article>

        {(topico.respostas || []).length > 0 && (
          <h3 className="mn-rotulo forum-respostas-cab">
            {topico.respostas.length}{topico.respostas.length === 1 ? (en ? ' reply' : ' resposta') : (en ? ' replies' : ' respostas')}
          </h3>
        )}
        {(topico.respostas || []).map((r) => {
          const editando = editandoResposta && editandoResposta.id === r.id;
          return (
            <article key={r.id} className="forum-post">
              <header className="forum-post-cab">
                <ForumAutor nome={r.autor_nome} avatar={r.autor_avatar} conta={r.autor_conta}
                  quando={forumQuando(r.criado_em, en)} editado={!!r.editado_em} en={en} />
                <div className="forum-post-acoes">
                  {r.autor_id === papel.eu && papel.podeEscrever && !editando && (
                    <button type="button" className="btn-icon btn-sm" aria-label={en ? 'Edit reply' : 'Editar resposta'}
                      onClick={() => setEditandoResposta({ id: r.id, corpo: r.corpo })}>
                      <i className="ti ti-pencil" aria-hidden="true" />
                    </button>
                  )}
                  {podeApagar(r.autor_id) && (
                    <button type="button" className="btn-icon btn-sm" aria-label={en ? 'Delete reply' : 'Apagar resposta'}
                      onClick={() => setJanela({ tipo: 'apagar-resposta', resposta: r })}>
                      <i className="ti ti-trash" aria-hidden="true" />
                    </button>
                  )}
                  <ForumCurtir curtidas={r.curtidas} curtido={r.eu_curti} en={en} onAlternar={() => curtirResposta(r)} />
                </div>
              </header>
              {editando ? (
                <div className="forum-responder">
                  <textarea className="diario-textarea" rows={4} maxLength={20000} value={editandoResposta.corpo}
                    aria-label={en ? 'Edit reply' : 'Editar resposta'}
                    onChange={(e) => setEditandoResposta({ ...editandoResposta, corpo: e.target.value })} autoFocus />
                  <div className="forum-responder-acoes">
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setEditandoResposta(null)}>{en ? 'Cancel' : 'Cancelar'}</button>
                    <button type="button" className="btn-primary btn-sm" disabled={!String(editandoResposta.corpo || '').trim()} onClick={salvarResposta}>{en ? 'Save' : 'Salvar'}</button>
                  </div>
                </div>
              ) : <ForumTexto texto={r.corpo} />}
            </article>
          );
        })}

        {topico.fechado ? (
          <p className="forum-aviso"><i className="ti ti-lock" aria-hidden="true" />{en ? 'This topic is closed: it can be read, not answered.' : 'Este tópico está fechado: dá para ler, não para responder.'}</p>
        ) : podeEscreverAqui ? (
          <div className="forum-responder">
            <label className="mn-rotulo" htmlFor="forum-resposta">{en ? 'Your reply' : 'Sua resposta'}</label>
            <textarea id="forum-resposta" className="diario-textarea" rows={4} maxLength={20000}
              value={resposta} onChange={(e) => setResposta(e.target.value)} />
            <div className="forum-responder-acoes">
              <button type="button" className="btn-primary" disabled={!resposta.trim() || enviando} onClick={responder}>
                {enviando ? (en ? 'Sending…' : 'Enviando…') : (en ? 'Reply' : 'Responder')}
              </button>
            </div>
          </div>
        ) : salaFechada ? (
          <p className="forum-aviso is-alerta"><i className="ti ti-lock" aria-hidden="true" />{en ? 'This room is closed.' : 'Esta sala está fechada.'}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="pjs diario-pagina forum">
      <div className="diario-pagina-barra cartoes-barra livro-trilho trilho-unido">
        {Busca ? (
          <Busca ac={ac} placeholder={en ? 'Search' : 'Buscar'} query={query} setQuery={setQuery}
            podeCriar={podeCriar} onNovo={onNovo}
            dicaNovo={naRaiz ? (en ? 'New room' : 'Nova sala') : (naSala && papel.ehImperador) ? (en ? 'New topic or room' : 'Novo tópico ou sala') : (en ? 'New topic' : 'Novo tópico')}
            antes={trilho} />
        ) : trilho}
      </div>
      {menuNovo && (
        <ForumMenuNovo pos={menuNovo} en={en} onClose={() => setMenuNovo(null)}
          onTopico={() => setJanela({ tipo: 'topico' })}
          onSala={() => setJanela({ tipo: 'sala', pai: salaId })} />
      )}

      {avisoLeitura}
      {erro && salas && <p className="forum-erro" role="alert">{erro}</p>}
      {corpo}

      {janela && janela.tipo === 'sala' && (
        <ForumEditor en={en}
          titulo={janela.sala ? (en ? 'Edit room' : 'Editar sala') : (en ? 'New room' : 'Nova sala')}
          rotuloConfirmar={janela.sala ? (en ? 'Save' : 'Salvar') : (en ? 'Open room' : 'Abrir sala')}
          inicial={janela.sala ? { nome: janela.sala.nome, descricao: janela.sala.descricao || '', fechada: janela.sala.fechada } : {}}
          campos={[
            { chave: 'nome', rotulo: en ? 'Name' : 'Nome', obrigatorio: true, max: 80 },
            { chave: 'descricao', rotulo: en ? 'What is talked about here' : 'O que se conversa aqui', linhas: 3, max: 400 },
          ]}
          extraRodape={janela.sala ? (
            <span className="forum-editor-extra">
              <button type="button" className="btn-ghost btn-sm" onClick={async () => {
                await supabaseClient.from('forum_salas').update({ fechada: !janela.sala.fechada }).eq('id', janela.sala.id);
                setJanela(null); carregarSalas();
              }}>
                <i className={'ti ' + (janela.sala.fechada ? 'ti-lock-open' : 'ti-lock')} aria-hidden="true" />
                {janela.sala.fechada ? (en ? 'Reopen' : 'Reabrir') : (en ? 'Close room' : 'Fechar sala')}
              </button>
              <button type="button" className="btn-ghost btn-sm forum-perigo" onClick={() => setJanela({ tipo: 'apagar-sala', sala: janela.sala })}>
                <i className="ti ti-trash" aria-hidden="true" />{en ? 'Delete' : 'Apagar'}
              </button>
            </span>
          ) : null}
          onSalvar={(v) => {
            const linha = { nome: String(v.nome || '').trim(), descricao: String(v.descricao || '').trim() || null };
            return janela.sala
              ? supabaseClient.from('forum_salas').update(linha).eq('id', janela.sala.id).then((r) => { carregarSalas(); return r; })
              : supabaseClient.from('forum_salas').insert({ ...linha, pai_id: janela.pai != null ? janela.pai : null, ordem: filhas(janela.pai != null ? janela.pai : null).length }).then((r) => { carregarSalas(); return r; });
          }}
          onClose={() => setJanela(null)} />
      )}
      {janela && janela.tipo === 'topico' && (
        <ForumEditor en={en}
          titulo={janela.topico ? (en ? 'Edit topic' : 'Editar tópico') : (en ? 'New topic' : 'Novo tópico')}
          rotuloConfirmar={janela.topico ? (en ? 'Save' : 'Salvar') : (en ? 'Publish' : 'Publicar')}
          inicial={janela.topico ? { titulo: janela.topico.titulo, corpo: janela.topico.corpo } : {}}
          campos={[
            { chave: 'titulo', rotulo: en ? 'Title' : 'Título', obrigatorio: true, max: 160 },
            { chave: 'corpo', rotulo: en ? 'Text' : 'Texto', obrigatorio: true, linhas: 10, max: 20000 },
          ]}
          onSalvar={(v) => {
            const linha = { titulo: String(v.titulo || '').trim(), corpo: String(v.corpo || '').trim() };
            if (janela.topico) {
              return supabaseClient.from('forum_topicos').update(linha).eq('id', janela.topico.id)
                .then((r) => { carregarTopico(janela.topico.id); carregarTopicos(salaId); return r; });
            }
            return supabaseClient.from('forum_topicos').insert({ ...linha, sala_id: salaId }).select('id').single()
              .then((r) => { if (!r.error && r.data) { carregarTopicos(salaId); carregarSalas(); setTopicoId(r.data.id); } return r; });
          }}
          onClose={() => setJanela(null)} />
      )}
      {janela && janela.tipo === 'apagar-sala' && (
        <ForumConfirmar en={en} titulo={en ? 'Delete room' : 'Apagar sala'}
          texto={en ? `“${janela.sala.nome}” and all its topics and replies will be deleted. This cannot be undone.`
                    : `“${janela.sala.nome}” e todos os tópicos e respostas dela serão apagados. Não dá para desfazer.`}
          onConfirmar={() => supabaseClient.from('forum_salas').delete().eq('id', janela.sala.id)
            .then((r) => { if (!r.error) { if (janela.sala.pai_id != null) irSala(janela.sala.pai_id); else irSalas(); carregarSalas(); } return r; })}
          onClose={() => setJanela(null)} />
      )}
      {janela && janela.tipo === 'apagar-topico' && topico && (
        <ForumConfirmar en={en} titulo={en ? 'Delete topic' : 'Apagar tópico'}
          texto={en ? `“${topico.titulo}” and its replies will be deleted. This cannot be undone.`
                    : `“${topico.titulo}” e as respostas dele serão apagados. Não dá para desfazer.`}
          onConfirmar={() => supabaseClient.from('forum_topicos').delete().eq('id', topico.id)
            .then((r) => { if (!r.error) { setTopicoId(null); carregarTopicos(salaId); carregarSalas(); } return r; })}
          onClose={() => setJanela(null)} />
      )}
      {janela && janela.tipo === 'apagar-resposta' && (
        <ForumConfirmar en={en} titulo={en ? 'Delete reply' : 'Apagar resposta'}
          texto={en ? 'This reply will be deleted. This cannot be undone.' : 'Esta resposta será apagada. Não dá para desfazer.'}
          onConfirmar={() => supabaseClient.from('forum_respostas').delete().eq('id', janela.resposta.id)
            .then((r) => { if (!r.error) carregarTopico(topicoId); return r; })}
          onClose={() => setJanela(null)} />
      )}
    </div>
  );
}

Object.assign(window, { ForumView, forumQuando });
