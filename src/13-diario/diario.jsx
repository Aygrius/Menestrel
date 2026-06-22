/* ============================================================
   FASE 13 — DIÁRIO
   ============================================================
   O "caderno de descobertas" do PJ ativo, estilo Pokédex: o Mestre
   disponibiliza criaturas (bestiário) e lore (NPCs/reinos/cidades,
   catálogo novo desta fase) pra história; o Jogador "importa" pro
   diário do próprio PJ e pode escrever um comentário pessoal sobre
   cada entrada. Há também Memórias: registros de texto livre do PJ,
   sem vínculo com catálogo (diário pessoal de verdade).

   Exports:
   - DiarioView          — tela do Jogador (aba nova na ficha do PJ ativo,
                            11-ficha/ficha.jsx). 3 sub-abas internas:
                            Disponíveis / Minha Coleção / Memórias.
   - GerenciarLoreModal  — tela do Mestre (chamada a partir do
                            HistoriaCard, 06-historias/historias.jsx),
                            CRUD de lore_entradas (NPC/Reino/Cidade) +
                            checkboxes pra disponibilizar criaturas/lore
                            pra história (grava historias.lore_ids e
                            historias.criatura_ids).

   Depende de:
   - React (useState/useEffect/useMemo desestruturados, ver 01-core/helpers.jsx)
   - supabaseClient (01-core/supabase.jsx)
   - ModalShell (10-shell/shell.jsx) — usado no ComentarioModal/MemoriaModal/
     LoreEntradaForm (modais pequenos de formulário)
   - Tokens visuais "Pedra & Bronze": classes .fp-tab/.fp2-panel/.inv-divider/
     .best-toolbar/.best-chip/.best-empty já existentes no index.css —
     este arquivo só ADICIONA classes novas prefixadas .diario- pro grid
     de cards (pokedex), sem reinventar o que já existe.
   - ⚠️ NÃO depende de BestLoading/BestErrorBox/BestNoKit/useFitPageSize/
     useSort/SortHead/BestPagination de 09-bestiario/bestiario.jsx: esses
     helpers existem só no escopo do módulo bestiario.jsx — o
     Object.assign(window,{...}) de lá expõe SÓ as 5 Lists
     (CriaturasList/MagiasList/HabilidadesList/TecnicasList/ItensList),
     não os helpers internos. Este arquivo declara suas PRÓPRIAS versões
     locais (DiarioLoading/DiarioErrorBox, prefixo diario- pra não colidir),
     já que o Diário usa grid de cards, não tabela paginada — não precisa
     de useFitPageSize/useSort/BestPagination de qualquer forma.

   RPCs consumidas (Supabase, SECURITY DEFINER, retorno jsonb {ok, motivo?}
   — ver skill "RPCs novas" pra contrato completo; NENHUMA dessas RPCs
   existe ainda no banco, este arquivo assume o contrato combinado):
   - listar_diario_disponivel(p_personagem_id)
       → resolve a história do PJ internamente (protagonista_ids @> [pj_id]),
         retorna { ok, criaturas: [...], lore: [...], importados: [ref_ids] }
   - importar_diario(p_personagem_id, p_tipo, p_ref_id)
   - salvar_comentario_diario(p_diario_entrada_id, p_comentario)
   - salvar_memoria_diario(p_id?, p_personagem_id, p_titulo, p_conteudo)
   - excluir_entrada_diario(p_id)
   - listar_lore_historia(p_historia_id)            — Mestre
   - salvar_lore_entrada(p_id?, p_historia_id, p_tipo, p_nome, p_descricao,
                          p_imagem_url, p_atributos)  — Mestre
   - excluir_lore_entrada(p_id)                       — Mestre

   Até essas RPCs existirem no Supabase, os fetches falham com erro
   42883 (function does not exist) — o componente trata isso com
   DiarioErrorBox/hint (versão local, ver acima), igual ao padrão das
   outras fases; não há mock hardcoded de dados pra não mascarar esse estado.

   Consumido por:
   - 11-ficha/ficha.jsx — nova aba 'diario' na navbar fp-tabs
     (entre Loja e Editar), <DiarioView pj={pj} lang={lang} key={pjAtivoId} />
   - 06-historias/historias.jsx — botão "Lore" no HistoriaCard (entre
     Convites e Loja, ícone de livro), abre
     <GerenciarLoreModal historia={h} lang={lang} onClose={...} onChanged={refetch} />
     a partir do state gerenciandoLore em HistoriasList (mesmo padrão de
     gerenciandoLoja/GerenciarLojaModal). ATUALIZADO: GerenciarLoreModal
     migrou para o padrão único de modal (ModalShell, header/x + body +
     footer Cancelar-esquerda/Confirmar-direita) junto da padronização
     geral do projeto — o comentário anterior ("fora do ModalShell por
     consistência com GerenciarLojaModal") não se aplica mais, pois
     GerenciarLojaModal também migrou. Todos os modais de diario.jsx
     (ComentarioModal/MemoriaModal/GerenciarLoreModal) usam ModalShell hoje.

   Carregar em src/main.tsx depois de 12-batalha (última fase) e antes
   de data/bridge — ver patch em main.tsx.
   ============================================================ */

// ---------- Constantes ----------

const DIARIO_TIPOS = ['criatura', 'npc', 'reino', 'cidade'];

const DIARIO_TIPO_ICON = {
  criatura: 'ti-paw',
  npc: 'ti-user',
  reino: 'ti-flag',
  cidade: 'ti-building-castle',
  memoria: 'ti-feather',
};

const DIARIO_TIPO_LABEL = {
  pt: { criatura: 'Criatura', npc: 'NPC', reino: 'Reino', cidade: 'Cidade', memoria: 'Memória' },
  en: { criatura: 'Creature', npc: 'NPC', reino: 'Kingdom', cidade: 'City', memoria: 'Memory' },
};

function diarioTipoLabel(tipo, lang) {
  const l = lang === 'en' ? 'en' : 'pt';
  return DIARIO_TIPO_LABEL[l][tipo] || tipo;
}

// ---------- Helpers de dados ----------

/* Normaliza o retorno de listar_diario_disponivel num único array de
   "fichas" prontas pra render, já cruzando com o que foi importado. */
function montarCatalogoDisponivel(resp) {
  if (!resp) return [];
  const importadosSet = new Set((resp.importados || []).map((r) => `${r.tipo}:${r.ref_id}`));
  const criaturas = (resp.criaturas || []).map((c) => ({
    tipo: 'criatura', ref_id: c.id, nome: c.nome, subtitulo: c.tipo,
    descricao: c.descricao, imagem_url: c.imagem_url || null,
    jaImportado: importadosSet.has(`criatura:${c.id}`),
  }));
  const lore = (resp.lore || []).map((e) => ({
    tipo: e.tipo, ref_id: e.id, nome: e.nome, subtitulo: diarioTipoLabel(e.tipo, 'pt'),
    descricao: e.descricao, imagem_url: e.imagem_url || null,
    jaImportado: importadosSet.has(`${e.tipo}:${e.id}`),
  }));
  return [...criaturas, ...lore];
}

// ---------- Loading / erro (versões locais — ver nota "Depende de" no topo) ----------

function DiarioLoading({ text }) {
  return <div style={{ textAlign: 'center', color: '#9C8F73', padding: 40, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 14 }}>{text}</div>;
}

function DiarioErrorBox({ error, hint }) {
  return (
    <div style={{ border: '1px solid rgba(200,33,44,0.4)', background: 'rgba(200,33,44,0.10)', borderRadius: 12, padding: '16px 18px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <div style={{ color: '#F0A6A0', fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{error}</div>
      <div style={{ color: '#9C8F73', fontSize: 13, lineHeight: 1.5 }}>{hint}</div>
    </div>
  );
}

// DiarioStyleTag: componente único pra injetar DIARIO_CSS. TODO return desta
// fase que usa classes .diario-* deve incluir <DiarioStyleTag /> — usar este
// componente em vez de <style>{DIARIO_CSS}</style> direto evita o bug de
// esquecer o CSS num early-return (aconteceu no form de edição do
// GerenciarLoreModal: o `if (editando) return (...)` não tinha o <style>,
// então o form renderizava sem nenhuma classe .diario-* aplicada).
function DiarioStyleTag() {
  return <style>{DIARIO_CSS}</style>;
}

// ---------- DiarioCard: card "pokedex" ----------

function DiarioCard({ entrada, lang, onClick, actionLabel, actionIcon, onAction, actionDisabled }) {
  const en = lang === 'en';
  return (
    <div className="diario-card" onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="diario-card-art">
        {entrada.imagem_url
          ? <img src={entrada.imagem_url} alt="" />
          : <i className={'ti ' + (DIARIO_TIPO_ICON[entrada.tipo] || 'ti-help')} aria-hidden="true" />}
      </div>
      <div className="diario-card-body">
        <div className="diario-card-tipo">{diarioTipoLabel(entrada.tipo, lang)}</div>
        <div className="diario-card-nome">{entrada.nome}</div>
        {entrada.subtitulo && entrada.tipo === 'criatura' && (
          <div className="diario-card-sub">{entrada.subtitulo}</div>
        )}
        {entrada.descricao && (
          <p className="diario-card-desc">{entrada.descricao}</p>
        )}
        {entrada.comentario && (
          <div className="diario-card-comentario">
            <i className="ti ti-quote" aria-hidden="true" />
            <span>{entrada.comentario}</span>
          </div>
        )}
      </div>
      {onAction && (
        <button
          className={'diario-card-action' + (actionDisabled ? ' is-disabled' : '')}
          onClick={(e) => { e.stopPropagation(); if (!actionDisabled) onAction(); }}
          disabled={actionDisabled}
          title={actionLabel}
        >
          <i className={'ti ' + actionIcon} aria-hidden="true" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}

// ---------- ComentarioModal ----------

function ComentarioModal({ entrada, lang, onClose, onSaved }) {
  const en = lang === 'en';
  const [texto, setTexto] = useState(entrada.comentario || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const salvar = async () => {
    setSaving(true); setError(null);
    const { data, error: err } = await supabaseClient.rpc('salvar_comentario_diario', {
      p_diario_entrada_id: entrada.diario_entrada_id,
      p_comentario: texto,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    if (data && data.ok === false) { setError(data.motivo || 'erro'); return; }
    onSaved({ ...entrada, comentario: texto });
  };

  return (
    <ModalShell
      title={en ? `Notes — ${entrada.nome}` : `Anotações — ${entrada.nome}`}
      lang={lang}
      onClose={onClose}
      onCancel={onClose}
      cancelLabel={en ? 'Cancel' : 'Cancelar'}
      onConfirm={salvar}
      confirmLabel={saving ? (en ? 'Saving…' : 'Salvando…') : (en ? 'Save' : 'Salvar')}
      confirmDisabled={saving}
    >
      <p style={{ color: '#9C8F73', fontSize: 13.5, marginBottom: 12 }}>
        {en
          ? 'A personal note only you can see — your character\'s impressions, theories, or memories about this entry.'
          : 'Uma anotação pessoal só sua — impressões, teorias ou lembranças do seu personagem sobre esta entrada.'}
      </p>
      <textarea
        className="diario-textarea"
        rows={6}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={en ? 'Write your notes…' : 'Escreva suas anotações…'}
        autoFocus
      />
      {error && <div className="err-msg" style={{ marginTop: 10 }}>{error}</div>}
    </ModalShell>
  );
}

// ---------- MemoriaModal ----------

function MemoriaModal({ memoria, lang, pjId, onClose, onSaved }) {
  const en = lang === 'en';
  const isEdit = !!memoria;
  const [titulo, setTitulo] = useState(memoria?.titulo || '');
  const [conteudo, setConteudo] = useState(memoria?.conteudo || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const salvar = async () => {
    if (!titulo.trim()) { setError(en ? 'Title is required.' : 'Título é obrigatório.'); return; }
    setSaving(true); setError(null);
    const { data, error: err } = await supabaseClient.rpc('salvar_memoria_diario', {
      p_id: memoria?.id ?? null,
      p_personagem_id: pjId,
      p_titulo: titulo,
      p_conteudo: conteudo,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    if (data && data.ok === false) { setError(data.motivo || 'erro'); return; }
    onSaved(data && data.entrada ? data.entrada : { ...memoria, titulo, conteudo });
  };

  return (
    <ModalShell
      title={isEdit ? (en ? 'Edit memory' : 'Editar memória') : (en ? 'New memory' : 'Nova memória')}
      lang={lang}
      onClose={onClose}
      onCancel={onClose}
      cancelLabel={en ? 'Cancel' : 'Cancelar'}
      onConfirm={salvar}
      confirmLabel={saving ? (en ? 'Saving…' : 'Salvando…') : (en ? 'Save' : 'Salvar')}
      confirmDisabled={saving}
    >
      <label className="diario-field-label">{en ? 'Title' : 'Título'}</label>
      <input
        className="diario-input"
        type="text"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder={en ? 'E.g. "The night in Verrogar"' : 'Ex.: "A noite em Verrogar"'}
        autoFocus
      />
      <label className="diario-field-label" style={{ marginTop: 14 }}>{en ? 'Content' : 'Conteúdo'}</label>
      <textarea
        className="diario-textarea"
        rows={8}
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
        placeholder={en ? 'Write freely…' : 'Escreva livremente…'}
      />
      {error && <div className="err-msg" style={{ marginTop: 10 }}>{error}</div>}
    </ModalShell>
  );
}

// ---------- DiarioView (Jogador) ----------

function DiarioView({ pj, lang }) {
  const en = lang === 'en';
  const pjId = pj?.id;

  const [subTab, setSubTab] = useState('disponiveis'); // disponiveis | colecao | memorias
  const [disponivel, setDisponivel] = useState(null);   // resp bruta de listar_diario_disponivel
  const [colecao, setColecao] = useState(null);          // diario_entradas do PJ (com dados cruzados)
  const [memorias, setMemorias] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('all');
  const [comentarioAlvo, setComentarioAlvo] = useState(null); // entrada da coleção pra abrir o modal
  const [memoriaAberta, setMemoriaAberta] = useState(null);   // memoria sendo editada, ou {} pra nova
  const [importando, setImportando] = useState(null);         // `${tipo}:${ref_id}` em voo

  const carregar = async () => {
    if (!pjId) return;
    setError(null);
    const { data, error: err } = await supabaseClient.rpc('listar_diario_disponivel', { p_personagem_id: pjId });
    if (err) { setError(err.message); setDisponivel({}); setColecao([]); setMemorias([]); return; }
    if (data && data.ok === false) { setError(data.motivo || 'erro'); setDisponivel({}); setColecao([]); setMemorias([]); return; }
    setDisponivel(data || {});
    setColecao((data && data.colecao) || []);
    setMemorias((data && data.memorias) || []);
  };

  useEffect(() => { carregar(); }, [pjId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setQuery(''); setTipoFiltro('all'); }, [subTab]);

  if (!pjId) return null;
  if (disponivel === null) return <DiarioLoading text={en ? 'Loading journal…' : 'Carregando diário…'} />;
  if (error) {
    return (
      <DiarioErrorBox
        error={error}
        hint={en
          ? 'Make sure the diario_entradas/lore_entradas tables and the diary RPCs exist in Supabase.'
          : 'Confira se as tabelas diario_entradas/lore_entradas e as RPCs do diário existem no Supabase.'}
      />
    );
  }

  const catalogo = montarCatalogoDisponivel({ ...disponivel, importados: colecao });

  const importar = async (entrada) => {
    const key = `${entrada.tipo}:${entrada.ref_id}`;
    setImportando(key);
    const { data, error: err } = await supabaseClient.rpc('importar_diario', {
      p_personagem_id: pjId, p_tipo: entrada.tipo, p_ref_id: entrada.ref_id,
    });
    setImportando(null);
    if (err) { setError(err.message); return; }
    if (data && data.ok === false) { setError(data.motivo || 'erro'); return; }
    await carregar();
  };

  const excluirDaColecao = async (id) => {
    const { data, error: err } = await supabaseClient.rpc('excluir_entrada_diario', { p_id: id });
    if (err) { setError(err.message); return; }
    if (data && data.ok === false) { setError(data.motivo || 'erro'); return; }
    await carregar();
  };

  const q = query.trim().toLowerCase();

  const disponiveisFiltrados = catalogo
    .filter((e) => !e.jaImportado)
    .filter((e) => tipoFiltro === 'all' || e.tipo === tipoFiltro)
    .filter((e) => !q || e.nome.toLowerCase().includes(q));

  const colecaoFiltrada = (colecao || [])
    .filter((e) => tipoFiltro === 'all' || e.tipo === tipoFiltro)
    .filter((e) => !q || (e.nome || '').toLowerCase().includes(q));

  const memoriasFiltradas = (memorias || [])
    .filter((m) => !q || (m.titulo || '').toLowerCase().includes(q) || (m.conteudo || '').toLowerCase().includes(q));

  return (
    <div className="diario-view">
      <DiarioStyleTag />

      <div className="inv-divider">
        <span className="inv-divider-ln" />
        <span className="inv-divider-lbl"><i className="ti ti-notebook" aria-hidden="true" /></span>
        <span className="inv-divider-ln" />
      </div>

      <div className="diario-subtabs" role="tablist">
        <button className={'diario-subtab' + (subTab === 'disponiveis' ? ' on' : '')} role="tab" aria-selected={subTab === 'disponiveis'} onClick={() => setSubTab('disponiveis')}>
          <i className="ti ti-list-search" aria-hidden="true" />
          {en ? 'Available' : 'Disponíveis'}
        </button>
        <button className={'diario-subtab' + (subTab === 'colecao' ? ' on' : '')} role="tab" aria-selected={subTab === 'colecao'} onClick={() => setSubTab('colecao')}>
          <i className="ti ti-bookmarks" aria-hidden="true" />
          {en ? 'My Collection' : 'Minha Coleção'}
          {colecao && colecao.length > 0 && <span className="diario-subtab-count">{colecao.length}</span>}
        </button>
        <button className={'diario-subtab' + (subTab === 'memorias' ? ' on' : '')} role="tab" aria-selected={subTab === 'memorias'} onClick={() => setSubTab('memorias')}>
          <i className="ti ti-feather" aria-hidden="true" />
          {en ? 'Memories' : 'Memórias'}
        </button>
      </div>

      {subTab !== 'memorias' && (
        <div className="best-toolbar">
          <div className="best-search">
            <input
              type="search"
              className="diario-input"
              placeholder={en ? 'Search…' : 'Buscar…'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="best-chips">
            <button className={'best-chip' + (tipoFiltro === 'all' ? ' is-active' : '')} onClick={() => setTipoFiltro('all')}>{en ? 'All' : 'Todos'}</button>
            {DIARIO_TIPOS.map((t) => (
              <button key={t} className={'best-chip' + (tipoFiltro === t ? ' is-active' : '')} onClick={() => setTipoFiltro(t)}>
                {diarioTipoLabel(t, lang)}
              </button>
            ))}
          </div>
        </div>
      )}

      {subTab === 'disponiveis' && (
        disponiveisFiltrados.length === 0 ? (
          <div className="best-empty">
            {en ? 'Nothing new to discover here — ask your Master to unlock more entries.' : 'Nada novo pra descobrir por aqui — peça ao Mestre pra liberar mais entradas.'}
          </div>
        ) : (
          <div className="diario-grid">
            {disponiveisFiltrados.map((e) => {
              const key = `${e.tipo}:${e.ref_id}`;
              return (
                <DiarioCard
                  key={key}
                  entrada={e}
                  lang={lang}
                  actionIcon="ti-download"
                  actionLabel={importando === key ? (en ? 'Importing…' : 'Importando…') : (en ? 'Import' : 'Importar')}
                  actionDisabled={importando === key}
                  onAction={() => importar(e)}
                />
              );
            })}
          </div>
        )
      )}

      {subTab === 'colecao' && (
        colecaoFiltrada.length === 0 ? (
          <div className="best-empty">
            {en ? 'No entries imported yet. Check "Available" to start your collection.' : 'Nenhuma entrada importada ainda. Veja "Disponíveis" pra começar sua coleção.'}
          </div>
        ) : (
          <div className="diario-grid">
            {colecaoFiltrada.map((e) => (
              <DiarioCard
                key={e.diario_entrada_id}
                entrada={e}
                lang={lang}
                actionIcon="ti-edit"
                actionLabel={en ? 'Notes' : 'Anotar'}
                onAction={() => setComentarioAlvo(e)}
              />
            ))}
          </div>
        )
      )}

      {subTab === 'memorias' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button className="btn-primary btn-md" onClick={() => setMemoriaAberta({})}>
              <i className="ti ti-plus" aria-hidden="true" />
              {en ? 'New memory' : 'Nova memória'}
            </button>
          </div>
          {memoriasFiltradas.length === 0 ? (
            <div className="best-empty">
              {en ? 'No memories written yet.' : 'Nenhuma memória escrita ainda.'}
            </div>
          ) : (
            <div className="diario-memorias-list">
              {memoriasFiltradas.map((m) => (
                <div key={m.id} className="diario-memoria-item" onClick={() => setMemoriaAberta(m)}>
                  <i className="ti ti-feather" aria-hidden="true" />
                  <div className="diario-memoria-body">
                    <div className="diario-memoria-titulo">{m.titulo}</div>
                    <p className="diario-memoria-preview">{(m.conteudo || '').slice(0, 140)}{(m.conteudo || '').length > 140 ? '…' : ''}</p>
                  </div>
                  <button
                    className="btn-icon btn-danger btn-sm"
                    title={en ? 'Delete' : 'Excluir'}
                    onClick={(ev) => { ev.stopPropagation(); excluirDaColecao(m.id); }}
                  >
                    <i className="ti ti-trash" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {comentarioAlvo && (
        <ComentarioModal
          entrada={comentarioAlvo}
          lang={lang}
          onClose={() => setComentarioAlvo(null)}
          onSaved={() => { setComentarioAlvo(null); carregar(); }}
        />
      )}

      {memoriaAberta && (
        <MemoriaModal
          memoria={memoriaAberta.id ? memoriaAberta : null}
          pjId={pjId}
          lang={lang}
          onClose={() => setMemoriaAberta(null)}
          onSaved={() => { setMemoriaAberta(null); carregar(); }}
        />
      )}
    </div>
  );
}

// ---------- LoreEntradaForm (corpo do form, usado dentro do modal manual de GerenciarLoreModal) ----------

function LoreEntradaForm({ tipo, entrada, onChange }) {
  const v = entrada || { nome: '', descricao: '', imagem_url: '', atributos: {} };
  const set = (patch) => onChange({ ...v, ...patch });
  const setAttr = (k, val) => onChange({ ...v, atributos: { ...(v.atributos || {}), [k]: val } });

  return (
    <>
      <label className="diario-field-label">Nome</label>
      <input className="diario-input" type="text" value={v.nome} onChange={(e) => set({ nome: e.target.value })} autoFocus />

      <label className="diario-field-label" style={{ marginTop: 14 }}>Descrição</label>
      <textarea className="diario-textarea" rows={5} value={v.descricao} onChange={(e) => set({ descricao: e.target.value })} />

      <label className="diario-field-label" style={{ marginTop: 14 }}>Imagem (URL, opcional)</label>
      <input className="diario-input" type="text" value={v.imagem_url || ''} onChange={(e) => set({ imagem_url: e.target.value })} placeholder="https://…" />

      {tipo === 'npc' && (
        <div className="diario-form-grid">
          <div>
            <label className="diario-field-label">Raça</label>
            <input className="diario-input" type="text" value={v.atributos?.raca || ''} onChange={(e) => setAttr('raca', e.target.value)} />
          </div>
          <div>
            <label className="diario-field-label">Profissão/Papel</label>
            <input className="diario-input" type="text" value={v.atributos?.profissao || ''} onChange={(e) => setAttr('profissao', e.target.value)} />
          </div>
          <div>
            <label className="diario-field-label">Afiliação</label>
            <input className="diario-input" type="text" value={v.atributos?.afiliacao || ''} onChange={(e) => setAttr('afiliacao', e.target.value)} />
          </div>
        </div>
      )}
      {tipo === 'reino' && (
        <div className="diario-form-grid">
          <div>
            <label className="diario-field-label">Governante</label>
            <input className="diario-input" type="text" value={v.atributos?.governante || ''} onChange={(e) => setAttr('governante', e.target.value)} />
          </div>
          <div>
            <label className="diario-field-label">Idioma</label>
            <input className="diario-input" type="text" value={v.atributos?.idioma || ''} onChange={(e) => setAttr('idioma', e.target.value)} />
          </div>
        </div>
      )}
      {tipo === 'cidade' && (
        <div className="diario-form-grid">
          <div>
            <label className="diario-field-label">Reino</label>
            <input className="diario-input" type="text" value={v.atributos?.reino || ''} onChange={(e) => setAttr('reino', e.target.value)} />
          </div>
          <div>
            <label className="diario-field-label">População</label>
            <input className="diario-input" type="text" value={v.atributos?.populacao || ''} onChange={(e) => setAttr('populacao', e.target.value)} />
          </div>
        </div>
      )}
    </>
  );
}

// ---------- GerenciarLoreModal (Mestre) ----------

function GerenciarLoreModal({ historia, lang, onClose, onChanged }) {
  const en = lang === 'en';
  const [tipoAba, setTipoAba] = useState('npc'); // npc | reino | cidade | criaturas (disponibilizar)
  const [lore, setLore] = useState(null);
  const [criaturas, setCriaturas] = useState(null);
  const [error, setError] = useState(null);
  const [editando, setEditando] = useState(null); // {} nova, objeto = editar, null = lista
  const [savingVinculo, setSavingVinculo] = useState(false);

  // Escape e travamento de scroll já são responsabilidade do ModalShell — não duplicar aqui.

  const carregar = async () => {
    setError(null);
    const [{ data: loreData, error: loreErr }, { data: critData, error: critErr }] = await Promise.all([
      supabaseClient.rpc('listar_lore_historia', { p_historia_id: historia.id }),
      supabaseClient.from('criaturas').select('id, nome, tipo').order('nome'),
    ]);
    if (loreErr) { setError(loreErr.message); return; }
    if (loreData && loreData.ok === false) { setError(loreData.motivo || 'erro'); return; }
    setLore((loreData && loreData.entradas) || []);
    if (critErr) { setError(critErr.message); return; }
    setCriaturas(critData || []);
  };

  useEffect(() => { carregar(); }, [historia.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const salvarLore = async () => {
    const { data, error: err } = await supabaseClient.rpc('salvar_lore_entrada', {
      p_id: editando.id ?? null,
      p_historia_id: historia.id,
      p_tipo: tipoAba,
      p_nome: editando.nome,
      p_descricao: editando.descricao,
      p_imagem_url: editando.imagem_url || null,
      p_atributos: editando.atributos || {},
    });
    if (err) { setError(err.message); return; }
    if (data && data.ok === false) { setError(data.motivo || 'erro'); return; }
    setEditando(null);
    await carregar();
    if (onChanged) onChanged();
  };

  const excluirLore = async (id) => {
    const { data, error: err } = await supabaseClient.rpc('excluir_lore_entrada', { p_id: id });
    if (err) { setError(err.message); return; }
    if (data && data.ok === false) { setError(data.motivo || 'erro'); return; }
    await carregar();
    if (onChanged) onChanged();
  };

  const toggleDisponibilizar = async (tipo, id, ligar) => {
    setSavingVinculo(true);
    const campo = tipo === 'criatura' ? 'criatura_ids' : 'lore_ids';
    const atual = historia[campo] || [];
    const novo = ligar ? [...new Set([...atual, id])] : atual.filter((x) => x !== id);
    const { error: err } = await supabaseClient.from('historias').update({ [campo]: novo }).eq('id', historia.id);
    setSavingVinculo(false);
    if (err) { setError(err.message); return; }
    historia[campo] = novo; // reflete localmente sem novo round-trip
    setLore((prev) => [...(prev || [])]); // força re-render
    if (onChanged) onChanged();
  };

  if (lore === null) {
    return (
      <ModalShell title={en ? 'Manage lore' : 'Gerenciar lore'} lang={lang} size="lg" onClose={onClose}>
        <DiarioStyleTag />
        <DiarioLoading text={en ? 'Loading…' : 'Carregando…'} />
      </ModalShell>
    );
  }

  if (editando) {
    return (
      <ModalShell
        title={editando.id
          ? (en ? `Edit ${diarioTipoLabel(tipoAba, lang)}` : `Editar ${diarioTipoLabel(tipoAba, lang)}`)
          : (en ? `New ${diarioTipoLabel(tipoAba, lang)}` : `Novo ${diarioTipoLabel(tipoAba, lang)}`)}
        lang={lang}
        onClose={() => setEditando(null)}
        onCancel={() => setEditando(null)}
        onConfirm={salvarLore}
      >
        <DiarioStyleTag />
        <LoreEntradaForm tipo={tipoAba} entrada={editando} onChange={setEditando} />
        {error && <div className="err-msg" style={{ marginTop: 10 }}>{error}</div>}
      </ModalShell>
    );
  }

  const loreDoTipo = (lore || []).filter((e) => e.tipo === tipoAba);

  const subtabs = (
    <div className="diario-subtabs" role="tablist">
      {DIARIO_TIPOS.map((t) => (
        <button key={t} className={'diario-subtab' + (tipoAba === t ? ' on' : '')} onClick={() => setTipoAba(t)}>
          <i className={'ti ' + DIARIO_TIPO_ICON[t]} aria-hidden="true" />
          {diarioTipoLabel(t, lang)}
        </button>
      ))}
    </div>
  );

  return (
    <ModalShell
      title={en ? 'Manage lore' : 'Gerenciar lore'}
      lang={lang}
      size="lg"
      onClose={onClose}
      onCancel={onClose}
      cancelLabel={en ? 'Close' : 'Fechar'}
    >
        <DiarioStyleTag />
        <p className="subhead">
          {en
            ? 'Register NPCs, Kingdoms and Cities, then choose what is available for this story.'
            : 'Cadastre NPCs, Reinos e Cidades, depois escolha o que fica disponível pra esta história.'}
        </p>

        {subtabs}

        {error && <div className="err-msg" style={{ marginBottom: 10 }}>{error}</div>}

        {tipoAba === 'criatura' ? (
          <div className="diario-vinculo-list">
            {(criaturas || []).map((c) => {
              const ligado = (historia.criatura_ids || []).includes(c.id);
              return (
                <label key={c.id} className="diario-vinculo-item">
                  <input type="checkbox" checked={ligado} disabled={savingVinculo} onChange={(e) => toggleDisponibilizar('criatura', c.id, e.target.checked)} />
                  <span>{c.nome}</span>
                  <span className="diario-vinculo-sub">{c.tipo}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button className="btn-primary btn-md" onClick={() => setEditando({})}>
                <i className="ti ti-plus" aria-hidden="true" />
                {en ? `New ${diarioTipoLabel(tipoAba, lang)}` : `Novo ${diarioTipoLabel(tipoAba, lang)}`}
              </button>
            </div>
            {loreDoTipo.length === 0 ? (
              <div className="best-empty" style={{ padding: '28px 12px' }}>{en ? 'Nothing registered yet.' : 'Nada cadastrado ainda.'}</div>
            ) : (
              <div className="diario-vinculo-list">
                {loreDoTipo.map((e) => {
                  const ligado = (historia.lore_ids || []).includes(e.id);
                  return (
                    <div key={e.id} className="diario-vinculo-item diario-vinculo-item--mestre">
                      <input type="checkbox" checked={ligado} disabled={savingVinculo} onChange={(ev) => toggleDisponibilizar('lore', e.id, ev.target.checked)} />
                      <span style={{ flex: 1 }}>{e.nome}</span>
                      <button className="btn-icon btn-sm" title={en ? 'Edit' : 'Editar'} onClick={() => setEditando(e)}><i className="ti ti-pencil" aria-hidden="true" /></button>
                      <button className="btn-icon btn-danger btn-sm" title={en ? 'Delete' : 'Excluir'} onClick={() => excluirLore(e.id)}><i className="ti ti-trash" aria-hidden="true" /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
    </ModalShell>
  );
}

// ---------- CSS (escopado, injetado via <style> dentro de .menestrel-ui) ----------

const DIARIO_CSS = `
.diario-subtabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; }
.diario-subtab { display:inline-flex; align-items:center; gap:7px; padding:9px 16px; border-radius:6px; font-family:'Plus Jakarta Sans', system-ui, sans-serif; font-weight:600; font-size:13.5px; color:#9C8F73; background:rgba(232,221,198,0.04); border:1px solid rgba(232,221,198,0.10); cursor:pointer; transition:all .15s ease; }
.diario-subtab:hover { color:#E8DDC6; background:rgba(232,221,198,0.08); }
.diario-subtab.on { color:#1C1407; background:linear-gradient(180deg,#E6C97A,#C9A44E); border-color:transparent; }
.diario-subtab-count { background:rgba(28,20,7,0.35); border-radius:999px; padding:1px 7px; font-size:11px; }

.diario-input, .diario-textarea {
  width:100%; font-family:'Plus Jakarta Sans', system-ui, sans-serif; font-size:14px; color:#E8DDC6;
  background:rgba(232,221,198,0.04); border:1px solid rgba(232,221,198,0.14); border-radius:6px; padding:10px 12px;
  outline:none; transition:border-color .15s ease;
}
.diario-input:focus, .diario-textarea:focus { border-color:rgba(201,164,78,0.5); }
.diario-textarea { resize:vertical; line-height:1.5; }
.diario-field-label { display:block; font-family:'Plus Jakarta Sans', system-ui, sans-serif; font-weight:600; font-size:12.5px; text-transform:uppercase; letter-spacing:.02em; color:#9C8F73; margin-bottom:6px; }
.diario-form-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(160px,1fr)); gap:14px; margin-top:14px; }

.diario-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:16px; }

.diario-card {
  position:relative; display:flex; flex-direction:column; background:linear-gradient(180deg,#1f1a12,#15110a);
  border:1px solid rgba(106,85,48,0.30); border-radius:6px; overflow:hidden; cursor:default;
  transition:transform .16s ease, border-color .16s ease, box-shadow .16s ease;
}
.diario-card:hover { transform:translateY(-3px); border-color:rgba(201,164,78,0.40); box-shadow:0 22px 50px -28px rgba(8,6,2,0.9); }
.diario-card::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,#B8472F,#B8702E,#C9A44E,#B8862E,#7A5E2A); opacity:.7; }
.diario-card-art { height:120px; display:flex; align-items:center; justify-content:center; background:rgba(201,164,78,0.06); color:#7A5E2A; font-size:42px; }
.diario-card-art img { width:100%; height:100%; object-fit:cover; }
.diario-card-body { padding:14px 16px; flex:1; display:flex; flex-direction:column; gap:4px; }
.diario-card-tipo { font-family:'Plus Jakarta Sans', system-ui, sans-serif; font-weight:600; font-size:10.5px; text-transform:uppercase; letter-spacing:.04em; color:#9C8F73; }
.diario-card-nome { font-family:'Cinzel', serif; font-weight:600; font-size:16px; color:#C9A44E; line-height:1.25; }
.diario-card-sub { font-size:12.5px; color:#9C8F73; text-transform:capitalize; }
.diario-card-desc { font-family:'Lora', serif; font-size:13px; color:#B8AB8E; line-height:1.5; margin:4px 0 0; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
.diario-card-comentario { display:flex; gap:6px; align-items:flex-start; margin-top:8px; padding-top:8px; border-top:1px dashed rgba(232,221,198,0.14); font-size:12.5px; color:#C9A44E; font-style:italic; }
.diario-card-comentario i { flex:0 0 auto; margin-top:2px; opacity:.7; }

.diario-card-action {
  display:flex; align-items:center; justify-content:center; gap:7px; width:100%; padding:10px;
  font-family:'Plus Jakarta Sans', system-ui, sans-serif; font-weight:600; font-size:13px;
  color:#1C1407; background:linear-gradient(180deg,#E6C97A,#C9A44E); border:none; cursor:pointer; transition:filter .15s ease;
}
.diario-card-action:hover:not(.is-disabled) { filter:brightness(1.06); }
.diario-card-action.is-disabled { opacity:.6; cursor:not-allowed; }

/* .diario-btn-nova migrou para .btn-primary (index.css) */

.diario-memorias-list { display:flex; flex-direction:column; gap:10px; }
.diario-memoria-item {
  display:flex; align-items:flex-start; gap:12px; padding:14px 16px; border-radius:6px; cursor:pointer;
  background:rgba(232,221,198,0.03); border:1px solid rgba(232,221,198,0.10); transition:all .15s ease;
}
.diario-memoria-item:hover { background:rgba(232,221,198,0.06); border-color:rgba(201,164,78,0.30); }
.diario-memoria-item > i { color:#C9A44E; font-size:18px; margin-top:2px; }
.diario-memoria-body { flex:1; min-width:0; }
.diario-memoria-titulo { font-family:'Cinzel', serif; font-weight:600; font-size:14.5px; color:#E8DDC6; }
.diario-memoria-preview { font-family:'Lora', serif; font-size:13px; color:#9C8F73; margin:4px 0 0; line-height:1.5; }
/* .diario-memoria-del migrou para .btn-icon.btn-danger (index.css) */

.diario-vinculo-list { display:flex; flex-direction:column; gap:6px; max-height:50vh; overflow-y:auto; }
.diario-vinculo-item { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:6px; background:rgba(232,221,198,0.03); border:1px solid rgba(232,221,198,0.08); font-family:'Plus Jakarta Sans', system-ui, sans-serif; font-size:13.5px; color:#E8DDC6; cursor:pointer; }
.diario-vinculo-item input[type="checkbox"] { accent-color:#C9A44E; width:16px; height:16px; }
.diario-vinculo-sub { margin-left:auto; font-size:12px; color:#9C8F73; text-transform:capitalize; }
.diario-vinculo-item--mestre { cursor:default; }
/* .diario-icon-btn/.diario-icon-btn--danger migraram para .btn-icon/.btn-icon.btn-danger (index.css) */
`;

Object.assign(window, { DiarioView, GerenciarLoreModal });
