/* ============================================================
   SELECT-PILL — o dropdown único do sistema
   ============================================================
   "Em todos os menus dropdown do sistema, use o mesmo estilo de dropdown do
    seletor de data do início do jogo, em editar história." (usuário, 25/09/2026)

   Até esta data havia QUATRO cópias de SelectPill (08-personagens,
   09-bestiario/catalogo-editor, 12-batalha, 13-diario) e dez <select> nativos.
   As cópias tinham divergido: a do diário desenhava borda e abria a lista
   `position: absolute` (recortada dentro de modal), a do editor fechava a
   lista antes do clique numa opção fora do botão. Esta é a da batalha — a
   mais completa: lista em PORTAL que abre para cima quando falta espaço,
   opção desativada, rótulo próprio do botão fechado — com a PELE do
   FantasyDatePicker (10-shell/shell.jsx): pílula de tinta quente sem borda,
   lista escura sem borda, ativo em dourado com ✓. A pele mora no CSS
   (.select-pill-btn / .select-pill-drop, fim do index.css).

   Props: options [{ value, label, labelBotao?, disabled? }], value,
          onChange(value), placeholder?, disabled?, label?
   ============================================================ */

/* A lista sai por PORTAL, `position: fixed` medida do botão: dentro de modal
   e de menu com `overflow: auto` a lista absoluta era recortada. Abre para
   cima quando embaixo sobra pouco. */
function SelectPillDrop({ anchorRef, dropRef, children }) {
  const [pos, setPos] = React.useState(null);
  React.useLayoutEffect(() => {
    const medir = () => {
      const el = anchorRef && anchorRef.current;
      if (!el || !el.isConnected) { setPos(null); return; }
      const r = el.getBoundingClientRect();
      const abaixo = window.innerHeight - r.bottom - 8;
      const paraCima = abaixo < 180 && r.top > abaixo;
      const p = { left: r.left, largura: r.width, paraCima,
                  top: paraCima ? r.top - 4 : r.bottom + 4,
                  maxH: Math.min(220, Math.max(120, (paraCima ? r.top : abaixo) - 12)) };
      setPos((ant) => (ant && ant.left === p.left && ant.top === p.top
        && ant.largura === p.largura && ant.paraCima === p.paraCima && ant.maxH === p.maxH) ? ant : p);
    };
    medir();
    window.addEventListener('scroll', medir, true);
    window.addEventListener('resize', medir);
    return () => {
      window.removeEventListener('scroll', medir, true);
      window.removeEventListener('resize', medir);
    };
  }, [anchorRef]);
  if (!pos) return null;
  return ReactDOM.createPortal(
    <div className="select-pill-drop-portal" ref={dropRef}
      style={{ position: 'fixed', left: pos.left, top: pos.top, minWidth: pos.largura,
               maxHeight: pos.maxH, zIndex: 9800,
               transform: pos.paraCima ? 'translateY(-100%)' : 'none' }}>
      {children}
    </div>,
    document.querySelector('.menestrel-ui') || document.body
  );
}

function SelectPill({ options = [], value, onChange, placeholder, disabled, label }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const dropRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return undefined;
    // A lista vive em portal, fora de ref.current: sem olhar o dropRef, o
    // mousedown numa opção contava como clique fora e a escolha se perdia.
    const fora = (e) => {
      const noBotao = ref.current && ref.current.contains(e.target);
      const naLista = dropRef.current && dropRef.current.contains(e.target);
      if (!noBotao && !naLista) setOpen(false);
    };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', fora);
    window.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); window.removeEventListener('keydown', esc); };
  }, [open]);

  const selected = options.find((o) => String(o.value) === String(value));
  // labelBotao: o botão fechado pode dizer outra coisa que a lista ("— nenhuma —"
  // na lista, vazio no botão).
  const displayLabel = selected
    ? (selected.labelBotao != null ? selected.labelBotao : selected.label)
    : (placeholder || '—');

  return (
    <div className="motor-field" ref={ref} style={{ position: 'relative' }}>
      {label && <span>{label}</span>}
      <button type="button" className="select-pill-btn" data-open={open ? 'true' : 'false'}
        data-empty={selected ? undefined : 'true'} disabled={disabled}
        aria-haspopup="listbox" aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => { e.currentTarget.blur(); if (!disabled) setOpen((v) => !v); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!disabled) setOpen((v) => !v); } }}>
        <span className="select-pill-btn-label">{displayLabel}</span>
        <i className="ti ti-chevron-down select-pill-btn-ic" aria-hidden="true" />
      </button>
      {open && (
        <SelectPillDrop anchorRef={ref} dropRef={dropRef}>
          <ul className="select-pill-drop" role="listbox">
            {options.map((opt) => {
              const active = String(opt.value) === String(value);
              return (
                <li key={opt.value} role="option" aria-selected={active}
                  className={(active ? 'active' : '') + (opt.disabled ? ' disabled' : '')}
                  aria-disabled={opt.disabled ? 'true' : undefined}
                  onClick={() => { if (opt.disabled) return; onChange(opt.value); setOpen(false); }}>
                  <span className="select-pill-opt-label">{opt.label}</span>
                  {active && <i className="ti ti-check select-pill-check" aria-hidden="true" />}
                </li>
              );
            })}
          </ul>
        </SelectPillDrop>
      )}
    </div>
  );
}

/* ── SelectPillMulti — o mesmo dropdown, várias opções (26/09/2026) ──
   "Mantenha o dropdown menu para selecionar mais de uma opção." (usuário)
   A pele e a lista em portal do SelectPill; a diferença é o clique: marca e
   desmarca SEM fechar a lista, e o botão fechado mostra as escolhidas
   separadas por vírgula. `values` é um array; `onChange` recebe o array novo.
   Quem decide ordem e exclusividade é quem usa (ver CatalogoMulti). */
function SelectPillMulti({ options = [], values = [], onChange, placeholder, disabled, label }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const dropRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return undefined;
    const fora = (e) => {
      const noBotao = ref.current && ref.current.contains(e.target);
      const naLista = dropRef.current && dropRef.current.contains(e.target);
      if (!noBotao && !naLista) setOpen(false);
    };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', fora);
    window.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); window.removeEventListener('keydown', esc); };
  }, [open]);

  const marcados = new Set(values.map(String));
  const escolhidas = options.filter((o) => marcados.has(String(o.value)));
  const displayLabel = escolhidas.length ? escolhidas.map((o) => o.label).join(', ') : (placeholder || '—');
  const alternar = (v) => {
    const k = String(v);
    onChange(marcados.has(k) ? values.filter((x) => String(x) !== k) : [...values, v]);
  };

  return (
    <div className="motor-field select-pill-multi" ref={ref} style={{ position: 'relative' }}>
      {label && <span>{label}</span>}
      <button type="button" className="select-pill-btn" data-open={open ? 'true' : 'false'}
        data-empty={escolhidas.length ? undefined : 'true'} disabled={disabled}
        aria-haspopup="listbox" aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => { e.currentTarget.blur(); if (!disabled) setOpen((v) => !v); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!disabled) setOpen((v) => !v); } }}>
        <span className="select-pill-btn-label">{displayLabel}</span>
        <i className="ti ti-chevron-down select-pill-btn-ic" aria-hidden="true" />
      </button>
      {open && (
        <SelectPillDrop anchorRef={ref} dropRef={dropRef}>
          <ul className="select-pill-drop" role="listbox" aria-multiselectable="true">
            {options.map((opt) => {
              const active = marcados.has(String(opt.value));
              return (
                <li key={opt.value} role="option" aria-selected={active}
                  className={(active ? 'active' : '') + (opt.recuo ? ' select-pill-opt--recuo' : '')}
                  onClick={() => alternar(opt.value)}>
                  {/* Sem ✓ (25/09/2026, "remova o V do card elemento
                      selecionado"): o dourado já diz que está marcado. */}
                  <span className="select-pill-opt-label">{opt.label}</span>
                </li>
              );
            })}
          </ul>
        </SelectPillDrop>
      )}
    </div>
  );
}

Object.assign(window, { SelectPill, SelectPillDrop, SelectPillMulti });
