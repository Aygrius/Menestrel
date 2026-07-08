/* ============================================================
   ITENS DA CAMPANHA — Aba do Mestre (CRUD por história)
   ============================================================
   Aba global do Mestre pra criar / editar / excluir itens da
   PRÓPRIA aventura. Não toca o catálogo global (tabela `itens`):
   escreve só em `itens_historia`, escopado à história escolhida
   num seletor no topo. Os itens padronizados continuam read-only
   (vê-los é o ItensList do bestiário).

   Fluxo: escolhe a história -> lista os itens dela -> "Novo item"
   abre o editor -> salva via RPC -> recarrega. Editar/Excluir saem
   da linha expandida de cada item.

   Acesso ao banco:
   - Leitura: SELECT direto em itens_historia (RLS deixa o Mestre
              ver só as linhas das histórias dele).
   - Escrita: RPCs SECURITY DEFINER salvar_item_historia /
              excluir_item_historia (retornam { ok, motivo? }).

   Visual (Pedra & Bronze): reaproveita o CSS das listas do
   bestiário (.best / .best-table-wrap / .best-toolbar / .best-detail
   etc.) e o do ModalShell (.ms-modal / .ms-header / .ms-body /
   .ms-footer) — ambos já no src/index.css. Os campos do editor
   herdam a pele de input do .ms-body. Botões: .btn-primary /
   .btn-ghost / .btn-danger (padrão único do console).

   Helpers de tabela são LOCAIS e prefixados (Ic*) de propósito:
   os do bestiário (useFitPageSize/useSort/SortHead/BestPagination)
   NÃO vão pro window, então não dá pra reusar de outra fase — mesmo
   motivo que a Fase 13 declarou os próprios DiarioLoading/etc.

   Depende de:
   - React (useState/useEffect/useMemo/useRef desestruturados em
            01-core/helpers.jsx)
   - supabaseClient (01-core/supabase.jsx)
   - UI.* (kit shadcn via ui-bridge)

   Exporta (window): ItensCampanhaManager
   Consumidor: AdminConsole (10-shell/shell.jsx) renderiza
   <ItensCampanhaManager ac={ac} lang={lang} /> na seção nova do
   Mestre (ver ADMIN_SECTIONS em 01-core/constants.jsx).

   Carregar depois de 09-bestiario/ e antes do app.jsx.
   ============================================================ */


/* ============================== [22] Itens da Campanha — listas de opção ============================== */
const IC_ORIGENS       = ['Comum', 'Raro', 'Mágico'];
const IC_CATEGORIAS    = ['arma', 'escudo', 'armadura'];
const IC_SLOTS         = ['bracos', 'cabeca', 'dedos', 'maos', 'ombros', 'orelha', 'peito', 'pernas', 'pes', 'pescoco', 'cintura', 'colar', 'joia', 'brinco', 'capa'];
const IC_TIPOS_SL      = ['S', 'L'];
const IC_TIPO_ARMADURA = ['L', 'M', 'P'];
const IC_ATRIBUTOS     = ['FOR', 'FIS', 'AGI', 'PER', 'INT', 'AUR', 'CAR'];

const IC_INP = { width: '100%', padding: '8px 10px', fontFamily: "'Lora', serif", fontSize: 13, boxSizing: 'border-box' };

function icMotivoMsg(motivo, lang) {
  const en = lang === 'en';
  switch (motivo) {
    case 'nao_autenticado':         return en ? 'You are not signed in.' : 'Você não está autenticado.';
    case 'historia_nao_encontrada': return en ? 'Story not found (or not yours).' : 'História não encontrada (ou não é sua).';
    case 'nome_obrigatorio':        return en ? 'The name is required.' : 'O nome é obrigatório.';
    case 'item_nao_encontrado':     return en ? 'Item not found.' : 'Item não encontrado.';
    case 'valor_invalido':          return en ? 'Some value is invalid.' : 'Algum valor é inválido.';
    default:                        return en ? `Could not save (${motivo || 'error'}).` : `Não foi possível salvar (${motivo || 'erro'}).`;
  }
}

// ---------- Hooks e helpers compartilhados (locais a esta fase) ----------
function useIcFitPageSize(wrapRef, opts) {
  const o = opts || {};
  const reserved = o.reserved != null ? o.reserved : 96;
  const min = o.min || 3;
  const fallbackRowH = o.rowH || 42;
  const rowHRef = React.useRef(null);
  const [size, setSize] = useState(o.fallback || 10);
  const calc = () => {
    const w = wrapRef.current;
    if (!w) return null;
    if (rowHRef.current == null) {
      const r = w.querySelector('tbody tr:not(.best-detail)');
      if (r) { const h = r.getBoundingClientRect().height; if (h > 0) rowHRef.current = h; }
    }
    const rowH = rowHRef.current || fallbackRowH;
    const thead = w.querySelector('thead');
    const headH = thead ? thead.getBoundingClientRect().height : 40;
    const top = w.getBoundingClientRect().top;
    const avail = window.innerHeight - top - reserved - headH;
    return Math.max(min, Math.floor(avail / rowH));
  };
  useEffect(() => { const n = calc(); if (n != null && n !== size) setSize(n); });
  useEffect(() => {
    const onResize = () => { const n = calc(); if (n != null) setSize((prev) => prev === n ? prev : n); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return size;
}

function useIcSort(data) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const toggleSort = (key) => {
    setSortKey((prev) => { if (prev === key) { setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); return key; } setSortDir('asc'); return key; });
  };
  const sorted = React.useMemo(() => {
    if (!sortKey || !data) return data || [];
    return [...data].sort((a, b) => {
      const va = a[sortKey] ?? '';
      const vb = b[sortKey] ?? '';
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'pt-BR', { sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);
  return { sorted, sortKey, sortDir, toggleSort };
}

function IcSortHead({ col, sortKey, sortDir, toggleSort, children }) {
  const active = sortKey === col;
  return (
    <th onClick={() => toggleSort(col)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {children}
        <span style={{ fontSize: 10, opacity: active ? 1 : 0.3, color: active ? '#9A7B2E' : 'inherit' }}>
          {active && sortDir === 'desc' ? '▼' : '▲'}
        </span>
      </span>
    </th>
  );
}

function IcLoading({ text }) {
  return <div style={{ textAlign: 'center', color: '#9C8F73', padding: 40, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 14 }}>{text}</div>;
}
function IcErrorBox({ error, hint }) {
  return (
    <div style={{ border: '1px solid rgba(200,33,44,0.4)', background: 'rgba(200,33,44,0.10)', borderRadius: 12, padding: '16px 18px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <div style={{ color: '#F0A6A0', fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{error}</div>
      {hint && <div style={{ color: '#9C8F73', fontSize: 13, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}
function IcNoKit() {
  return <div style={{ padding: 24, color: '#9C8F73', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 14, lineHeight: 1.5 }}>Componentes do kit não carregados. Confira o <code>src/components/ui-bridge.ts</code> e o import dele no <code>main.tsx</code>.</div>;
}
function IcPagination({ page, safePage, totalPages, setPage, setExpandida, lang }) {
  const items = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
    .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…'); acc.push(p); return acc; }, []);
  const close = () => setExpandida && setExpandida(null);
  return (
    <div className="best-pag">
      <button className="best-page-btn" onClick={() => { setPage((p) => Math.max(1, p - 1)); close(); }} disabled={safePage === 1} title={lang === 'en' ? 'Previous' : 'Anterior'}>‹</button>
      {items.map((p, idx) => p === '…'
        ? <span key={`ell-${idx}`} className="best-page-ellipsis">…</span>
        : <button key={p} className={'best-page-btn' + (p === safePage ? ' is-active' : '')} onClick={() => { setPage(p); close(); }}>{p}</button>)}
      <button className="best-page-btn" onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); close(); }} disabled={safePage === totalPages} title={lang === 'en' ? 'Next' : 'Próxima'}>›</button>
      <span className="best-page-info">{lang === 'en' ? `${safePage} of ${totalPages}` : `${safePage} de ${totalPages}`}</span>
    </div>
  );
}

// ---------- Helpers visuais do editor ----------
function IcSecao({ children }) {
  return (
    <div style={{ gridColumn: '1 / -1', marginTop: 10, fontFamily: "'Cinzel', serif", fontSize: 13, letterSpacing: '.04em', color: 'var(--gold-bright, #C9A44E)', borderBottom: '1px solid rgba(106,85,48,0.30)', paddingBottom: 6 }}>
      {children}
    </div>
  );
}
function IcCampo({ label, hint, span, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: span === 'full' ? '1 / -1' : 'auto', minWidth: 0 }}>
      <span style={{ fontFamily: "'Lora', serif", fontSize: 12.5, color: 'var(--parchment-muted, #C9B98F)' }}>{label}</span>
      {children}
      {hint && <span style={{ fontFamily: "'Lora', serif", fontSize: 11, color: '#9C8F73' }}>{hint}</span>}
    </label>
  );
}
function IcSelect({ value, onChange, options, lang, includeEmpty }) {
  const withEmpty = includeEmpty !== false;
  const en = lang === 'en';
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  const select = (v) => { onChange({ target: { value: v } }); setOpen(false); };
  const isEmpty = !value;
  const displayLabel = value || (en ? '— none —' : '— nenhum —');
  return (
    <div style={{ position: 'relative', width: '100%' }} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: '100%', display: 'inline-flex', alignItems: 'center', gap: 8,
          height: 34, padding: '0 10px 0 12px', boxSizing: 'border-box',
          background: 'rgba(12,9,4,0.40)', border: open ? '1px solid rgba(201,164,78,0.50)' : '1px solid rgba(106,85,48,0.35)', borderRadius: 6,
          color: isEmpty ? '#9C8F73' : '#E8DDC6', fontFamily: "'Lora', serif", fontSize: 13,
          cursor: 'pointer', transition: 'border-color .15s ease', textAlign: 'left',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayLabel}</span>
        <i className="ti ti-chevron-down" style={{ fontSize: 12, color: '#C9A44E', opacity: 0.7, flexShrink: 0, transition: 'transform .15s ease', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <ul role="listbox" style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'rgba(18,12,5,0.98)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(201,164,78,0.20)', borderRadius: 8,
          padding: 4, margin: 0, listStyle: 'none',
          boxShadow: '0 16px 40px -12px rgba(0,0,0,0.9), 0 0 0 1px rgba(201,164,78,0.06)',
          zIndex: 55, maxHeight: 200, overflowY: 'auto',
        }}>
          {withEmpty && (
            <li role="option" aria-selected={isEmpty} onClick={() => select('')}
              style={{ padding: '8px 12px', borderRadius: 6, color: isEmpty ? '#C9A44E' : '#9C8F73', fontFamily: "'Lora', serif", fontSize: 13, cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201,164,78,0.10)'; e.currentTarget.style.color = '#E8DDC6'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = isEmpty ? '#C9A44E' : '#9C8F73'; }}
            >{en ? '— none —' : '— nenhum —'}</li>
          )}
          {options.map((v) => (
            <li key={v} role="option" aria-selected={value === v} onClick={() => select(v)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 6, color: value === v ? '#C9A44E' : '#C8BCAA', fontFamily: "'Lora', serif", fontSize: 13, cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201,164,78,0.10)'; e.currentTarget.style.color = '#E8DDC6'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = value === v ? '#C9A44E' : '#C8BCAA'; }}
            >
              {value === v && <i className="ti ti-check" style={{ fontSize: 12, color: '#C9A44E', flexShrink: 0 }} />}
              {v}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ============================== [22] Itens da Campanha — editor (criar/editar) ============================== */
function ItemCampanhaModal({ item, historiaId, lang, onClose, onSaved }) {
  const en = lang === 'en';
  const isEdit = !!(item && item.id);
  const blank = {
    nome: '', slug: '', grupo: '', origem: '', icone: '', descricao: '',
    ocupa: '', armazena: '', tipo: '', tipo_item: '', valor_latao: '',
    categoria_equip: '', slot_equip: '', grupo_equipamento: '', grupo_armas: '', forca_req: '', ajuste_atributo: '',
    dano: '', dano_l: '', dano_m: '', dano_p: '', alcance: '', defesa: '', absorcao: '', resistencia: '', tipo_armadura: '',
    maos_pequenino: '', maos_anao: '', maos_outras: '',
    efeito: '', efeito_positivo: '', efeito_negativo: '', magia: '', nivel_magia: '',
  };
  const fromItem = () => {
    const f = { ...blank };
    if (item) for (const k of Object.keys(blank)) { const v = item[k]; f[k] = (v === null || v === undefined) ? '' : String(v); }
    return f;
  };
  const [form, setForm] = useState(fromItem);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose, saving]);

  const ehMagico = (form.magia || '').trim() !== '';

  const salvar = async () => {
    if (!form.nome.trim()) { setError(en ? 'The name is required.' : 'O nome é obrigatório.'); return; }
    setSaving(true); setError(null);
    try {
      const { data, error } = await supabaseClient.rpc('salvar_item_historia', {
        p_id: isEdit ? item.id : null,
        p_historia_id: historiaId,
        p_payload: form,
      });
      if (error) { setError(error.hint || error.message); setSaving(false); return; }
      if (!data || !data.ok) {
        setError(icMotivoMsg(data && data.motivo, lang) + (data && data.detalhe ? ` — ${data.detalhe}` : ''));
        setSaving(false); return;
      }
      onSaved(data.item);
    } catch (err) {
      setError(String(err && err.message ? err.message : err));
      setSaving(false);
    }
  };

  const opt = (v) => <option key={v} value={v}>{v}</option>;
  const optEmpty = <option value="">{en ? '— none —' : '— nenhum —'}</option>;

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target.classList.contains('modal-backdrop') && !saving) onClose(); }}>
      <div className="ms-modal ms-lg" role="dialog" aria-modal="true">
        <div className="ms-header">
          <h3 className="ms-title">
            {isEdit ? (en ? 'Edit item' : 'Editar item') : (en ? 'New item' : 'Novo item')}
          </h3>
          {ehMagico && <span className="det-title-badge">{en ? 'Magic' : 'Mágico'}</span>}
          <button className="ms-close" onClick={onClose} disabled={saving} aria-label={en ? 'Close' : 'Fechar'}>×</button>
        </div>

        <div className="ms-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14, alignItems: 'start' }}>

            <IcSecao>{en ? 'Basics' : 'Básico'}</IcSecao>
            <IcCampo label={en ? 'Name *' : 'Nome *'} span="full">
              <input style={IC_INP} value={form.nome} onChange={set('nome')} placeholder={en ? 'e.g. Flaming Sword' : 'ex.: Espada Flamejante'} autoFocus />
            </IcCampo>
            <IcCampo label="Slug" hint={en ? 'Leave blank to auto-generate from the name.' : 'Deixe em branco pra gerar do nome.'}>
              <input style={IC_INP} value={form.slug} onChange={set('slug')} placeholder="auto" />
            </IcCampo>
            <IcCampo label={en ? 'Group' : 'Grupo'}>
              <input style={IC_INP} value={form.grupo} onChange={set('grupo')} placeholder={en ? 'e.g. Weapons' : 'ex.: Armas'} />
            </IcCampo>
            <IcCampo label={en ? 'Rarity' : 'Origem'}>
              <IcSelect value={form.origem} onChange={set('origem')} options={IC_ORIGENS} lang={lang} />
            </IcCampo>
            <IcCampo label={en ? 'Icon' : 'Ícone'} hint="ti-sword, ti-shield…">
              <input style={IC_INP} value={form.icone} onChange={set('icone')} placeholder="ti-..." />
            </IcCampo>
            <IcCampo label={en ? 'Description' : 'Descrição'} span="full">
              <textarea style={{ ...IC_INP, minHeight: 70, resize: 'vertical' }} value={form.descricao} onChange={set('descricao')} />
            </IcCampo>

            <IcSecao>{en ? 'Storage & price' : 'Armazenamento & preço'}</IcSecao>
            <IcCampo label={en ? 'Weight (ocupa)' : 'Peso (ocupa)'} hint={en ? 'Unit weight in the carry system.' : 'Peso unitário no sistema de carga.'}>
              <input type="number" step="0.1" style={IC_INP} value={form.ocupa} onChange={set('ocupa')} />
            </IcCampo>
            <IcCampo label={en ? 'Capacity (armazena)' : 'Capacidade (armazena)'} hint={en ? '> 0 makes it a container.' : '> 0 vira recipiente.'}>
              <input type="number" step="0.1" style={IC_INP} value={form.armazena} onChange={set('armazena')} />
            </IcCampo>
            <IcCampo label={en ? 'Content type' : 'Tipo (S/L)'} hint={en ? 'Solid or Liquid (containers).' : 'Sólido ou Líquido (recipientes).'}>
              <IcSelect value={form.tipo} onChange={set('tipo')} options={IC_TIPOS_SL} lang={lang} />
            </IcCampo>
            <IcCampo label={en ? 'Container accepts (group)' : 'Recipiente aceita (grupo)'} hint={en ? 'Restrict by item group. Blank = any.' : 'Restringe por grupo. Vazio = qualquer.'}>
              <input style={IC_INP} value={form.tipo_item} onChange={set('tipo_item')} />
            </IcCampo>
            <IcCampo label={en ? 'Value (in latão)' : 'Valor (em latão)'} hint="1 ouro = 1000 latão">
              <input type="number" step="1" style={IC_INP} value={form.valor_latao} onChange={set('valor_latao')} />
            </IcCampo>

            <IcSecao>{en ? 'Equipment' : 'Equipamento'}</IcSecao>
            <IcCampo label={en ? 'Equip category' : 'Categoria de equip.'}>
              <IcSelect value={form.categoria_equip} onChange={set('categoria_equip')} options={IC_CATEGORIAS} lang={lang} />
            </IcCampo>
            <IcCampo label="Slot">
              <IcSelect value={form.slot_equip} onChange={set('slot_equip')} options={IC_SLOTS} lang={lang} />
            </IcCampo>
            <IcCampo label={en ? 'Equipment group' : 'Grupo de equipamento'}>
              <input style={IC_INP} value={form.grupo_equipamento} onChange={set('grupo_equipamento')} />
            </IcCampo>
            <IcCampo label={en ? 'Weapon group' : 'Grupo de armas'} hint={en ? 'Sigla, e.g. CM, CL.' : 'Sigla, ex.: CM, CL.'}>
              <input style={IC_INP} value={form.grupo_armas} onChange={set('grupo_armas')} />
            </IcCampo>
            <IcCampo label={en ? 'Strength req.' : 'Força mínima'}>
              <input type="number" step="1" style={IC_INP} value={form.forca_req} onChange={set('forca_req')} />
            </IcCampo>
            <IcCampo label={en ? 'Attribute bonus' : 'Ajuste de atributo'}>
              <IcSelect value={form.ajuste_atributo} onChange={set('ajuste_atributo')} options={IC_ATRIBUTOS} lang={lang} />
            </IcCampo>

            <IcSecao>{en ? 'Combat' : 'Combate'}</IcSecao>
            <IcCampo label={en ? 'Damage' : 'Dano'}>
              <input type="number" step="1" style={IC_INP} value={form.dano} onChange={set('dano')} />
            </IcCampo>
            <IcCampo label={en ? 'Damage L' : 'Dano L'}>
              <input type="number" step="1" style={IC_INP} value={form.dano_l} onChange={set('dano_l')} />
            </IcCampo>
            <IcCampo label={en ? 'Damage M' : 'Dano M'}>
              <input type="number" step="1" style={IC_INP} value={form.dano_m} onChange={set('dano_m')} />
            </IcCampo>
            <IcCampo label={en ? 'Damage P' : 'Dano P'}>
              <input type="number" step="1" style={IC_INP} value={form.dano_p} onChange={set('dano_p')} />
            </IcCampo>
            <IcCampo label={en ? 'Range' : 'Alcance'}>
              <input type="number" step="1" style={IC_INP} value={form.alcance} onChange={set('alcance')} />
            </IcCampo>
            <IcCampo label={en ? 'Defense' : 'Defesa'}>
              <input type="number" step="1" style={IC_INP} value={form.defesa} onChange={set('defesa')} />
            </IcCampo>
            <IcCampo label={en ? 'Absorption' : 'Absorção'}>
              <input type="number" step="1" style={IC_INP} value={form.absorcao} onChange={set('absorcao')} />
            </IcCampo>
            <IcCampo label={en ? 'Resistance' : 'Resistência'}>
              <input type="number" step="1" style={IC_INP} value={form.resistencia} onChange={set('resistencia')} />
            </IcCampo>
            <IcCampo label={en ? 'Armor type' : 'Tipo de armadura'}>
              <IcSelect value={form.tipo_armadura} onChange={set('tipo_armadura')} options={IC_TIPO_ARMADURA} lang={lang} />
            </IcCampo>
            <IcCampo label={en ? 'Hands — Halfling' : 'Mãos — Pequenino'}>
              <input type="number" step="1" style={IC_INP} value={form.maos_pequenino} onChange={set('maos_pequenino')} />
            </IcCampo>
            <IcCampo label={en ? 'Hands — Dwarf' : 'Mãos — Anão'}>
              <input type="number" step="1" style={IC_INP} value={form.maos_anao} onChange={set('maos_anao')} />
            </IcCampo>
            <IcCampo label={en ? 'Hands — Other' : 'Mãos — Outras'}>
              <input type="number" step="1" style={IC_INP} value={form.maos_outras} onChange={set('maos_outras')} />
            </IcCampo>

            <IcSecao>{en ? 'Effects & magic' : 'Efeitos & magia'}</IcSecao>
            <IcCampo label={en ? 'Effect (free text)' : 'Efeito (texto livre)'} span="full">
              <input style={IC_INP} value={form.efeito} onChange={set('efeito')} />
            </IcCampo>
            <IcCampo label={en ? 'Positive effect' : 'Efeito positivo'} hint={en ? 'e.g. 35 Hidratação, 5 Temperatura' : 'ex.: 35 Hidratação, 5 Temperatura'}>
              <input style={IC_INP} value={form.efeito_positivo} onChange={set('efeito_positivo')} />
            </IcCampo>
            <IcCampo label={en ? 'Negative effect' : 'Efeito negativo'} hint={en ? 'e.g. 5 Sobriedade, 1 Sono' : 'ex.: 5 Sobriedade, 1 Sono'}>
              <input style={IC_INP} value={form.efeito_negativo} onChange={set('efeito_negativo')} />
            </IcCampo>
            <IcCampo label={en ? 'Spell (key)' : 'Magia (key)'} hint={en ? 'Filling this marks the item as magic.' : 'Preenchido marca o item como mágico.'}>
              <input style={IC_INP} value={form.magia} onChange={set('magia')} />
            </IcCampo>
            <IcCampo label={en ? 'Spell level' : 'Nível da magia'}>
              <input type="number" step="1" style={IC_INP} value={form.nivel_magia} onChange={set('nivel_magia')} />
            </IcCampo>
          </div>

          {error && <div className="err-msg" style={{ marginTop: 16, color: '#F0A6A0' }}>{error}</div>}
        </div>

        <div className="ms-footer">
          <div className="ms-footer-left">
            <button className="btn-ghost" onClick={onClose} disabled={saving}>{en ? 'Cancel' : 'Cancelar'}</button>
          </div>
          <div className="ms-footer-right">
            <button className="btn-primary" onClick={salvar} disabled={saving}>
              {saving ? (en ? 'Saving…' : 'Salvando…') : (en ? 'Save' : 'Salvar')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== [22] Itens da Campanha — confirmar exclusão ============================== */
function ConfirmarExclusaoItemModal({ item, lang, onClose, onDeleted }) {
  const en = lang === 'en';
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose, saving]);

  const excluir = async () => {
    setSaving(true); setError(null);
    try {
      const { data, error } = await supabaseClient.rpc('excluir_item_historia', { p_id: item.id });
      if (error) { setError(error.hint || error.message); setSaving(false); return; }
      if (!data || !data.ok) { setError(icMotivoMsg(data && data.motivo, lang)); setSaving(false); return; }
      onDeleted(item.id);
    } catch (err) {
      setError(String(err && err.message ? err.message : err));
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target.classList.contains('modal-backdrop') && !saving) onClose(); }}>
      <div className="ms-modal ms-sm" role="dialog" aria-modal="true">
        <div className="ms-header">
          <h3 className="ms-title">{en ? 'Delete item' : 'Excluir item'}</h3>
          <button className="ms-close" onClick={onClose} disabled={saving} aria-label={en ? 'Close' : 'Fechar'}>×</button>
        </div>
        <div className="ms-body">
          <p style={{ margin: 0, fontFamily: "'Lora', serif", fontSize: 14, lineHeight: 1.5, color: 'var(--parchment)' }}>
            {en
              ? <>Delete <strong>{item.nome}</strong> from this campaign? This can’t be undone.</>
              : <>Excluir <strong>{item.nome}</strong> desta campanha? Isso não pode ser desfeito.</>}
          </p>
          {error && <div className="err-msg" style={{ marginTop: 14, color: '#F0A6A0' }}>{error}</div>}
        </div>
        <div className="ms-footer">
          <div className="ms-footer-left">
            <button className="btn-ghost" onClick={onClose} disabled={saving}>{en ? 'Cancel' : 'Cancelar'}</button>
          </div>
          <div className="ms-footer-right">
            <button className="btn-danger" onClick={excluir} disabled={saving}>
              {saving ? (en ? 'Deleting…' : 'Excluindo…') : (en ? 'Delete' : 'Excluir')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== [22] Itens da Campanha — aba principal (Mestre) ============================== */
function ItensCampanhaManager({ ac, lang, historiaId, tituloHistoria, onBack }) {
  const en = lang === 'en';
  const { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Input } = (typeof UI !== 'undefined' ? UI : {});

  const [itens, setItens] = useState(null);
  const [itensError, setItensError] = useState(null);

  const [query, setQuery] = useState('');
  const [grupoFiltro, setGrupoFiltro] = useState('all');
  const [expandida, setExpandida] = useState(null);
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState(null);   // null | item-obj | 'new'
  const [deleting, setDeleting] = useState(null);  // null | item-obj

  const wrapRef = React.useRef(null);
  const PAGE_SIZE = useIcFitPageSize(wrapRef);
  const { sorted: itensSorted, sortKey, sortDir, toggleSort } = useIcSort(itens);

  // itens da história escolhida
  const recarregar = React.useCallback(async () => {
    if (historiaId == null) { setItens([]); return; }
    setItens(null); setItensError(null);
    const { data, error } = await supabaseClient
      .from('itens_historia')
      .select('*')
      .eq('historia_id', historiaId)
      .order('nome', { ascending: true });
    if (error) { setItensError(error.message); setItens([]); return; }
    setItens(data || []);
  }, [historiaId]);

  useEffect(() => { recarregar(); }, [recarregar]);
  useEffect(() => { setPage(1); setExpandida(null); }, [query, grupoFiltro, historiaId]);

  if (!Table) return <IcNoKit />;

  const onSaved = () => { setEditing(null); recarregar(); };
  const onDeleted = () => { setDeleting(null); setExpandida(null); recarregar(); };

  const renderTabela = () => {
    if (itens === null) return <IcLoading text={en ? 'Loading items…' : 'Carregando os itens…'} />;
    if (itensError) return <IcErrorBox error={itensError} hint={en ? "Make sure the 'itens_historia' table and RPCs exist in Supabase." : "Confira se a tabela 'itens_historia' e as RPCs existem no Supabase."} />;

    const gruposDisponiveis = Array.from(new Set(itens.map((i) => i.grupo).filter(Boolean))).sort();
    const q = query.trim().toLowerCase();
    const filtered = (itensSorted || []).filter((it) => {
      if (grupoFiltro !== 'all' && it.grupo !== grupoFiltro) return false;
      if (q && !(it.nome || '').toLowerCase().includes(q)) return false;
      return true;
    });
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageSlice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    return (
      <>
        <div className="best-toolbar">
          <div className="best-search"><Input type="search" placeholder={en ? 'Search item…' : 'Buscar item…'} value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <div className="best-chips">
            <button className={'best-chip' + (grupoFiltro === 'all' ? ' is-active' : '')} onClick={() => setGrupoFiltro('all')}>{en ? 'All' : 'Todos'}</button>
            {gruposDisponiveis.map((g) => (
              <button key={g} className={'best-chip' + (grupoFiltro === g ? ' is-active' : '')} onClick={() => setGrupoFiltro(g)}>{g}</button>
            ))}
          </div>
          <div className="best-count">{filtered.length} {en ? 'of' : 'de'} {itens.length}</div>
        </div>

        {itens.length === 0 ? (
          <div className="best-empty" style={{ justifyContent: 'flex-start', textAlign: 'left' }}>
            {en ? 'No items in this campaign yet.' : 'Nenhum item nesta campanha ainda.'}
          </div>
        ) : filtered.length === 0 ? (
          <div className="best-empty">{en ? `No item matches "${query}".` : `Nenhum item corresponde a "${query}".`}</div>
        ) : (
          <>
            <div className="best-table-wrap" ref={wrapRef}>
              <Table>
                <TableHeader><TableRow>
                  <IcSortHead col="nome" sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{en ? 'Name' : 'Nome'}</IcSortHead>
                  <IcSortHead col="grupo" sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{en ? 'Group' : 'Grupo'}</IcSortHead>
                  <IcSortHead col="categoria_equip" sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{en ? 'Type' : 'Tipo'}</IcSortHead>
                  <IcSortHead col="ocupa" sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{en ? 'Storage' : 'Armazenamento'}</IcSortHead>
                  <TableHead>{en ? 'Value' : 'Valor'}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pageSlice.map((it) => {
                    const isOpen = expandida === it.id;
                    const equipavel = !!it.categoria_equip;
                    const tipoLabel = it.categoria_equip
                      ? it.categoria_equip
                      : (it.magico ? (en ? 'magic' : 'mágico') : (it.armazena > 0 ? (en ? 'container' : 'recipiente') : '—'));
                    const armazenamento =
                      (it.armazena != null && it.armazena > 0) ? `+${Number(it.armazena).toFixed(1)}`
                      : (it.ocupa != null && it.ocupa !== '') ? `-${Number(it.ocupa).toFixed(1)}`
                      : '';
                    return (
                      <React.Fragment key={it.id}>
                        <TableRow className={isOpen ? 'on' : ''} style={{ cursor: 'pointer' }} onClick={() => setExpandida(isOpen ? null : it.id)}>
                          <TableCell className="best-name">
                            <span className="best-chevron" style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</span>
                            {it.nome}
                          </TableCell>
                          <TableCell>{it.grupo || '—'}</TableCell>
                          <TableCell>{tipoLabel}</TableCell>
                          <TableCell>{armazenamento}</TableCell>
                          <TableCell>{it.valor_latao ?? 0}</TableCell>
                        </TableRow>
                        {isOpen && (
                          <TableRow className="best-detail"><TableCell colSpan={5}>
                            {equipavel && (
                              <div className="best-detail-stats">
                                {it.slot_equip && (<div className="best-stat"><span className="best-stat-lbl">{en ? 'Slot' : 'Uso'}</span><span className="best-stat-val">{it.slot_equip}</span></div>)}
                                {it.dano != null && (<div className="best-stat"><span className="best-stat-lbl">{en ? 'Damage' : 'Dano'}</span><span className="best-stat-val">{it.dano}</span></div>)}
                                {it.alcance != null && it.alcance > 0 && (<div className="best-stat"><span className="best-stat-lbl">{en ? 'Range' : 'Alcance'}</span><span className="best-stat-val">{it.alcance}</span></div>)}
                                {it.ajuste_atributo && (<div className="best-stat"><span className="best-stat-lbl">{en ? 'Attribute' : 'Atributo'}</span><span className="best-stat-val">{it.ajuste_atributo}</span></div>)}
                                {it.defesa != null && (<div className="best-stat"><span className="best-stat-lbl">{en ? 'Defense' : 'Defesa'}</span><span className="best-stat-val">{it.defesa}</span></div>)}
                                {it.absorcao != null && (<div className="best-stat"><span className="best-stat-lbl">{en ? 'Absorption' : 'Absorção'}</span><span className="best-stat-val">{it.absorcao}</span></div>)}
                                {it.forca_req != null && it.forca_req !== 0 && (<div className="best-stat"><span className="best-stat-lbl">{en ? 'Min. Strength' : 'Força Mín.'}</span><span className="best-stat-val">{it.forca_req}</span></div>)}
                              </div>
                            )}
                            {(it.categoria_equip === 'arma' || it.categoria_equip === 'escudo') && (
                              <div className="best-maos">
                                <span className="best-stat-lbl">{en ? 'Hands' : 'Mãos'}</span>
                                <span>{en ? 'Halfling' : 'Pequenino'} {it.maos_pequenino ?? '✗'}</span>
                                <span>{en ? 'Dwarf' : 'Anão'} {it.maos_anao ?? '✗'}</span>
                                <span>{en ? 'Other' : 'Outros'} {it.maos_outras ?? '✗'}</span>
                              </div>
                            )}
                            {it.descricao && <p className="best-desc">{it.descricao}</p>}
                            {it.efeito && <p className="best-efeito">{it.efeito}</p>}
                            {it.efeito_positivo && <p className="best-efeito" style={{ color: '#7FB07F' }}>+ {it.efeito_positivo}</p>}
                            {it.efeito_negativo && <p className="best-efeito" style={{ color: '#C98A8A' }}>− {it.efeito_negativo}</p>}
                            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                              <button className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setEditing(it); }}>
                                <i className="ti ti-pencil" /> {en ? 'Edit' : 'Editar'}
                              </button>
                              <button className="btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); setDeleting(it); }}>
                                <i className="ti ti-trash" /> {en ? 'Delete' : 'Excluir'}
                              </button>
                            </div>
                          </TableCell></TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <IcPagination page={page} safePage={safePage} totalPages={totalPages} setPage={setPage} setExpandida={setExpandida} lang={lang} />
          </>
        )}
      </>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, paddingBottom: 24, boxSizing: 'border-box' }}>

      {/* ── Cabeçalho de página — padrão lore-mng / batalha-mng / loja-mng-v3 ── */}
      <div style={{ position: 'relative', paddingBottom: 10 }}>
        <div className="ms-header">
          {onBack && (
            <button
              type="button"
              className="ms-close"
              onClick={onBack}
              aria-label={en ? 'Back' : 'Voltar'}
              style={{ width: 32, height: 32, fontSize: 17, display: 'grid', placeItems: 'center', flexShrink: 0 }}
            >
              <i className="ti ti-arrow-left" />
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-bright, #C9A44E)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
              <i className="ti ti-backpack" style={{ fontSize: 12 }} />
              {en ? 'Campaign Items' : 'Itens da Campanha'}
            </div>
            <h3 className="ms-title">{tituloHistoria || '—'}</h3>
          </div>
          {historiaId != null && (
            <button className="btn-primary btn-sm" onClick={() => setEditing('new')}>
              <i className="ti ti-plus" /> {en ? 'New item' : 'Novo item'}
            </button>
          )}
        </div>
      </div>

      {/* ── Tabela de itens ── */}
      <div className="best best-auto">
        {renderTabela()}

        {editing && (
          <ItemCampanhaModal
            item={editing === 'new' ? null : editing}
            historiaId={historiaId}
            lang={lang}
            onClose={() => setEditing(null)}
            onSaved={onSaved}
          />
        )}
        {deleting && (
          <ConfirmarExclusaoItemModal
            item={deleting}
            lang={lang}
            onClose={() => setDeleting(null)}
            onDeleted={onDeleted}
          />
        )}
      </div>
    </div>
  );
}

Object.assign(window, {
  ItensCampanhaManager,
});
