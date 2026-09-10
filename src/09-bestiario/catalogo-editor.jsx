/* ============================================================
   CATALOGO-EDITOR — editor genérico de catálogo, montado do descritor
   ============================================================
   Generalização de NovaCriaturaModal (13-diario/diario.jsx): mesma forma
   (ModalShell + campos + derivados por useMemo + salvar() com insert/update
   e erro no rodapé), mas monta os campos a partir de `descritorDe(tabela)`
   (catalogo-descritores.jsx) em vez de ter uma tabela hardcoded. Cobre as
   5 tabelas de catálogo (tecnicas, habilidades, magias, criaturas, itens)
   com o MESMO componente. NovaCriaturaModal é aposentado na Task 6; até lá
   este arquivo é o único a usar CriaturaFormulas fora dos testes dela.

   Props: { tabela, linha, lang, onSalvo, onCancel }. `linha` null = criação.
   `onSalvo(linhaSalva)` é chamado depois do sucesso.

   Campo derivado sobrescrevível (spec §6): 12 colunas de `criaturas` são
   calculadas (EF, EH, absorção, defesa, velocidade, L/M/P, dano e os 3
   tiers), mas a classe Dragão fixa absorção em 30 e velocidade por
   linhagem — nenhum dos dois bate com a fórmula. Por isso o campo aceita
   edição manual e, uma vez editado à mão, para de recalcular (Set
   `sobrescritos` no estado, classe `campo-sobrescrito` na marcação visual).
   Ao EDITAR uma linha existente, todos os derivados entram no Set já no
   mount: o valor gravado no banco (que pode ser o de um dragão) não pode
   ser silenciosamente substituído pela fórmula assim que o admin mexe em
   outro campo do formulário.
   ============================================================ */

// ---------- SelectPill — cópia local, mesmo padrão de diario.jsx/batalha.jsx/
// personagens.jsx/ficha.jsx: o projeto não compartilha este componente via
// window, cada fase que precisa dele carrega a própria cópia. ----------
function SelectPill({ options = [], value, onChange, placeholder, disabled, label }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find((o) => String(o.value) === String(value));
  const displayLabel = selected ? selected.label : (placeholder || '—');

  return (
    <div className="motor-field" ref={ref} style={{ position: 'relative' }}>
      {label && <span>{label}</span>}
      <button type="button" className="select-pill-btn" data-open={open ? 'true' : 'false'} disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => { e.currentTarget.blur(); !disabled && setOpen((v) => !v); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v); } }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayLabel}</span>
        <i className="ti ti-chevron-down" aria-hidden="true" />
      </button>
      {open && (
        <ul className="select-pill-drop">
          {options.map((opt) => {
            const active = String(opt.value) === String(value);
            return (
              <li key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}>
                {active && <i className="ti ti-check" aria-hidden="true" />}
                {opt.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------- Derivados de criatura ----------
// Só `criaturas` tem colunas `derivado` no descritor hoje — ver
// catalogo-descritores.jsx. Cada fórmula pede parâmetros nomeados
// (criatura-formulas.jsx); aqui é só o encanamento form -> parâmetro.
// O editor genérico não tem seletor de arma (o campo `ataque` virou texto
// livre, diferente do NovaCriaturaModal original), então a parcela de dano
// da arma entra como 0 — só a de Agilidade/Peso é calculada.
function calcularDerivadosCriatura(form) {
  const F = CriaturaFormulas;
  const { peso, fisico, aura, estagio, coletivo, agilidade, percepcao } = form;
  const lmp = F.danoLMP({ armaDanoL: 0, armaDanoM: 0, armaDanoP: 0, agilidade });
  const dano100 = F.dano100({ armaDano: 0, peso });
  const tiers = F.tiersDeDano(dano100);
  return {
    energia_fisica: F.energiaFisica({ peso, fisico }),
    energia_heroica: F.energiaHeroica({ coletivo, aura, estagio }),
    absorcao: F.absorcao({ fisico }),
    defesa: F.defesa({ fisico, agilidade }),
    velocidade: F.velocidade({ agilidade, estagio, percepcao }),
    dano_l: lmp.l, dano_m: lmp.m, dano_p: lmp.p,
    dano_100: dano100, dano_25: tiers.d25, dano_50: tiers.d50, dano_75: tiers.d75,
  };
}

// ---------- CatalogoCampo — um controle por tipo do descritor ----------
function CatalogoCampo({ campo, label, valor, onChange, disabled, sobrescrito }) {
  if (campo.tipo === 'area') {
    return (
      <div>
        <label className="diario-field-label">{label}</label>
        <textarea className="diario-textarea" rows={campo.linhas || 3} name={campo.col}
          value={valor} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      </div>
    );
  }
  if (campo.tipo === 'opcoes') {
    return (
      <SelectPill label={label} value={valor} onChange={onChange} disabled={disabled}
        options={campo.opcoes.map((o) => ({ value: o, label: o }))} />
    );
  }
  // texto, numero e derivado (derivado é numérico, só ganha a marca de sobrescrita).
  return (
    <div>
      <label className="diario-field-label">{label}</label>
      <input
        className={'diario-input' + (sobrescrito ? ' campo-sobrescrito' : '')}
        type={campo.tipo === 'numero' || campo.tipo === 'derivado' ? 'number' : 'text'}
        name={campo.col}
        min={campo.min} max={campo.max}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}

// ---------- CatalogoEditor ----------
function CatalogoEditor({ tabela, linha, lang, onSalvo, onCancel }) {
  const t = (ADMIN_COPY[lang] || ADMIN_COPY.pt);
  const descritor = descritorDe(tabela);

  const camposVazios = React.useMemo(() => {
    const base = {};
    (descritor ? descritor.campos : []).forEach((c) => { base[c.col] = ''; });
    return base;
  }, [descritor]);

  const [form, setForm] = React.useState(() => (linha ? { ...camposVazios, ...linha } : camposVazios));
  // Ao editar, os derivados já entram sobrescritos (ver comentário no topo do
  // arquivo) — o valor do banco não pode ser trocado pela fórmula ao mount.
  const [sobrescritos, setSobrescritos] = React.useState(() => new Set(
    linha && descritor ? descritor.campos.filter((c) => c.tipo === 'derivado').map((c) => c.col) : []
  ));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);

  const derivados = React.useMemo(() => (
    descritor && descritor.tabela === 'criaturas' ? calcularDerivadosCriatura(form) : {}
  ), [descritor, form]);

  const onChangeCampo = (campo, valor) => {
    setForm((f) => ({ ...f, [campo.col]: valor }));
    // Editar um derivado à mão marca a sobrescrita — dali em diante ele para
    // de seguir a fórmula, mesmo que outras entradas continuem mudando.
    if (campo.tipo === 'derivado') {
      setSobrescritos((s) => { const novo = new Set(s); novo.add(campo.col); return novo; });
    }
  };

  if (!descritor) return null; // tabela sem descritor: nada a montar

  const valorDoCampo = (campo) => (
    campo.tipo === 'derivado'
      ? (sobrescritos.has(campo.col) ? form[campo.col] : derivados[campo.col])
      : form[campo.col]
  );

  const obrigatoriosOk = descritor.campos
    .filter((c) => c.obrigatorio)
    .every((c) => {
      const v = form[c.col];
      return v !== undefined && v !== null && String(v).trim() !== '';
    });

  const salvar = async () => {
    const payload = {};
    descritor.campos.forEach((campo) => {
      const bruto = valorDoCampo(campo);
      if (campo.tipo === 'derivado') {
        // Calculado ou sobrescrito, sempre grava — nunca some do payload.
        payload[campo.col] = Number(bruto) || 0;
        return;
      }
      if (campo.tipo === 'numero') {
        if (bruto === '' || bruto === null || bruto === undefined) return; // opcional vazio -> NULL
        payload[campo.col] = Number(bruto);
        return;
      }
      const valor = typeof bruto === 'string' ? bruto.trim() : bruto;
      if (valor === '' || valor === null || valor === undefined) return;
      // itens.magico é boolean no banco; o descritor usa opções Sim/Não —
      // a conversão de volta pra boolean é responsabilidade do editor.
      if (descritor.tabela === 'itens' && campo.col === 'magico') {
        payload[campo.col] = valor === 'Sim';
        return;
      }
      payload[campo.col] = valor;
    });
    payload.atualizado_em = new Date().toISOString();

    setSaving(true); setError(null);
    const idCol = descritor.chave || 'id';
    const query = linha
      ? supabaseClient.from(descritor.tabela).update(payload).eq(idCol, linha[idCol]).select().single()
      : supabaseClient.from(descritor.tabela).insert(payload).select().single();
    const { data, error: err } = await query;
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSalvo(data);
  };

  const tabLabel = t[descritor.rotuloKey] || descritor.tabela;
  const titulo = `${tabLabel} — ${linha ? t.editorEditar : t.editorNovo}`;

  return (
    <ModalShell title={titulo} lang={lang} size="lg"
      onClose={onCancel} onCancel={onCancel}
      onConfirm={salvar}
      confirmLabel={saving ? t.editorSalvando : undefined}
      confirmDisabled={saving || !obrigatoriosOk}>
      <div className="diario-form-grid">
        {descritor.campos.map((campo) => (
          <CatalogoCampo key={campo.col} campo={campo}
            label={t[campo.rotuloKey] || campo.col}
            valor={valorDoCampo(campo)}
            onChange={(v) => onChangeCampo(campo, v)}
            disabled={!!(campo.somenteNovo && linha)}
            sobrescrito={sobrescritos.has(campo.col)}
          />
        ))}
      </div>
      {error && <div className="err-msg">{error}</div>}
    </ModalShell>
  );
}

Object.assign(window, { CatalogoEditor });
