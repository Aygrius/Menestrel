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
// dano100/danoLMP usam o próprio `ataque` escolhido no dropdown (peso e
// offset por tipo de ataque — ataques-criatura.jsx), não mais um "dano de
// arma" fixo: essa era a conta de PERSONAGEM que motivou a correção de
// 10/09/2026 (ver criatura-formulas.jsx).
function calcularDerivadosCriatura(form) {
  const F = CriaturaFormulas;
  const { peso, fisico, aura, estagio, forca, coletivo, agilidade, percepcao, ataque } = form;
  const lmp = F.danoLMP({ ataque, estagio, agilidade });
  const dano100 = F.dano100({ estagio, forca, peso });
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

// ---------- CatalogoLista — escolher nomes do catálogo (13/09/2026) ----------
/* "Quero poder escolher quais técnicas, habilidades e magias a criatura
   possui, escolhendo na lista que temos disponíveis." (usuário)

   O valor continua sendo o TEXTO separado por vírgula da coluna — é o que a
   batalha (resolverNomesDeMagia) e o Diário leem. A tela só troca o jeito de
   escrever: etiquetas + busca na lista.

   Duas coisas do banco real moldam a comparação (listaChave):
     • nível colado no nome: "Esquiva 7" é a técnica Esquiva — já escolhida,
       não pode ser oferecida de novo;
     • nome sem par no catálogo ("Bote", "Carga de Quadrúpede"): é da criatura
       e FICA. Aparece marcado, e só sai se o Mestre remover. */
const listaChave = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/\s+\d+$/, '').trim();
const listaSeparar = (csv) => String(csv || '').split(',').map((s) => s.trim()).filter(Boolean);

function CatalogoLista({ campo, label, valor, onChange, disabled, nomes, t }) {
  const [busca, setBusca] = React.useState('');
  const escolhidos = listaSeparar(valor);
  const chavesEscolhidas = new Set(escolhidos.map(listaChave));
  const doCatalogo = new Set((nomes || []).map(listaChave));
  const termo = listaChave(busca);
  const sugestoes = termo
    ? (nomes || []).filter((n) => listaChave(n).includes(termo) && !chavesEscolhidas.has(listaChave(n))).slice(0, 40)
    : [];

  const gravar = (lista) => onChange(lista.join(', '));
  const adicionar = (nome) => { gravar([...escolhidos, nome]); setBusca(''); };
  const remover = (idx) => gravar(escolhidos.filter((_, i) => i !== idx));

  return (
    <div className="catalogo-campo-full catalogo-lista" data-lista={campo.col}>
      <label className="diario-field-label">{label}</label>
      <div className="catalogo-lista-caixa">
        {escolhidos.map((nome, i) => {
          const fora = nomes && nomes.length > 0 && !doCatalogo.has(listaChave(nome));
          return (
            <span key={nome + i} className={'catalogo-lista-chip' + (fora ? ' catalogo-lista-chip--fora' : '')}>
              {fora && <i className="ti ti-alert-circle catalogo-lista-chip-aviso" role="img" aria-label={t.listaForaCatalogo} />}
              <span className="catalogo-lista-chip-nome">{nome}</span>
              <button type="button" className="catalogo-lista-chip-x" disabled={disabled}
                aria-label={`${t.listaRemover} ${nome}`} onClick={() => remover(i)}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </span>
          );
        })}
        <div className="catalogo-lista-busca">
          <input className="diario-input" type="text" value={busca} disabled={disabled}
            placeholder={t.listaBuscar} aria-label={`${label}: ${t.listaBuscar}`}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); if (sugestoes[0]) adicionar(sugestoes[0]); }
              if (e.key === 'Escape') setBusca('');
            }} />
          {sugestoes.length > 0 && (
            <ul className="select-pill-drop catalogo-lista-drop">
              {sugestoes.map((n) => (
                <li key={n} onMouseDown={(e) => e.preventDefault()} onClick={() => adicionar(n)}>{n}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- CatalogoCampo — um controle por tipo do descritor ----------
function CatalogoCampo({ campo, label, valor, onChange, disabled, sobrescrito, nomes, t }) {
  if (campo.tipo === 'lista') {
    return <CatalogoLista campo={campo} label={label} valor={valor} onChange={onChange}
      disabled={disabled} nomes={nomes} t={t} />;
  }
  if (campo.tipo === 'area') {
    // catalogo-campo-full: só o texto livre (textarea) ocupa a largura
    // cheia do modal — mesmo padrão de grid-column:1/-1 já usado em
    // .fp-finger-strip/.fp2-col-vit/.loja-mng-row-nome/.moedas-row-label
    // (index.css), aplicado aqui via classe em vez de seletor de coluna
    // porque o grid é montado a partir do descritor, não hardcoded.
    return (
      <div className="catalogo-campo-full">
        <label className="diario-field-label">{label}</label>
        <textarea className="diario-textarea" rows={campo.linhas || 3} name={campo.col}
          value={valor} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      </div>
    );
  }
  if (campo.tipo === 'opcoes') {
    // opcoesNormalizadas (catalogo-descritores.jsx) aceita string e
    // { value, label }: é o que deixa itens.tipo mostrar "Sólido" e gravar "S".
    // Campo somenteLeitura sai desabilitado — o valor vem do banco e é o banco
    // que o calcula (itens.magico é coluna GERADA).
    return (
      <SelectPill label={label} value={valor} onChange={onChange}
        disabled={disabled || !!campo.somenteLeitura}
        options={opcoesNormalizadas(campo)} />
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

// itens.magico é boolean no banco e opções 'Sim'/'Não' na tela. A conversão
// acontece nas DUAS pontas: aqui na entrada, e no payload do salvar (mais
// abaixo). Sem a entrada, o SelectPill não casa com nenhuma opção
// (String(true) !== 'Sim'), o campo aparece vazio, e o salvar grava `false`
// em todo item mágico que o admin editar por outro motivo — 55 itens do
// catálogo (medido no banco) seriam corrompidos na primeira edição.
/* Chave a partir do nome — o admin não digita mais "chave"/"slug".

   O formato sai dos dados, não de gosto: as 4 tabelas usam snake_case sem
   acento ("Área de Paz" -> area_de_paz, "Aljava Reforçada" ->
   aljava_reforcada). Preposição NÃO é removida: "Bainha para Adagas" vira
   bainha_para_adagas.

   Só vale na CRIAÇÃO. Renomear um registro existente não pode mexer na
   chave: ela é a identidade, e inventário, ficha e batalha referenciam
   itens por slug — derivar de novo num rename quebraria essas referências
   em silêncio. Por isso salvar() só usa isto quando não há linha. */
function slugDeNome(nome) {
  return String(nome || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/* Primeira chave livre a partir da base: base, base_2, base_3...
   `usadas` são as chaves que já existem no banco começando por base — uma
   consulta só, em vez de tentar inserir e tomar erro de unicidade. */
function chaveLivre(base, usadas) {
  if (!base) return '';
  const set = usadas instanceof Set ? usadas : new Set(usadas || []);
  if (!set.has(base)) return base;
  for (let i = 2; i < 1000; i += 1) {
    const tentativa = base + '_' + i;
    if (!set.has(tentativa)) return tentativa;
  }
  return base + '_' + Date.now();
}

function linhaParaForm(linha, descritor) {
  if (!linha) return null;
  const out = { ...linha };
  if (descritor && descritor.tabela === 'itens' && typeof out.magico === 'boolean') {
    out.magico = out.magico ? 'Sim' : 'Não';
  }
  return out;
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

  const [form, setForm] = React.useState(() => (
    linha ? { ...camposVazios, ...linhaParaForm(linha, descritor) } : camposVazios
  ));
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

  // Dropdown de `ataque`: o descritor já traz os 30 nomes fechados de
  // ataques-criatura.jsx (estáticos, sem banco). As armas do catálogo
  // `itens` (grupo Armas) são um universo que MUDA com o catálogo, então
  // entram por busca — fetchTabelaPaginada porque `itens` já passou dos
  // 1000 registros do corte do PostgREST (01-core/inventario-helpers.jsx).
  // Só dispara pra `criaturas`: nenhuma outra tabela tem campo de ataque.
  const [armasCatalogo, setArmasCatalogo] = React.useState([]);
  React.useEffect(() => {
    if (!descritor || descritor.tabela !== 'criaturas') return;
    let cancelado = false;
    fetchTabelaPaginada('itens', { colunas: 'nome', filtros: [['grupo', 'Armas']], ordem: ['nome'] })
      .then(({ data }) => { if (!cancelado) setArmasCatalogo((data || []).map((i) => i.nome)); });
    return () => { cancelado = true; };
  }, [descritor]);

  // Nomes do catálogo para os campos `lista` (técnicas, habilidades, magias
  // da criatura). Uma busca por tabela de origem, só das que o descritor usa.
  const [nomesPorFonte, setNomesPorFonte] = React.useState({});
  React.useEffect(() => {
    if (!descritor) return;
    const fontes = [...new Set(descritor.campos.filter((c) => c.tipo === 'lista').map((c) => c.fonte))];
    let cancelado = false;
    fontes.forEach((fonte) => {
      fetchTabelaPaginada(fonte, { colunas: 'nome', ordem: ['nome'] })
        .then(({ data }) => {
          if (cancelado) return;
          setNomesPorFonte((m) => ({ ...m, [fonte]: [...new Set((data || []).map((r) => r.nome).filter(Boolean))] }));
        });
    });
    return () => { cancelado = true; };
  }, [descritor]);

  // Campos efetivamente renderizados: iguais ao descritor, exceto `ataque`
  // (criaturas), cujas opções ganham as armas do catálogo que ainda não
  // estiverem na lista fechada — sem duplicar nem reordenar as 30 fixas.
  const camposEfetivos = React.useMemo(() => {
    if (!descritor || descritor.tabela !== 'criaturas') return descritor ? descritor.campos : [];
    return descritor.campos.map((campo) => {
      if (campo.col !== 'ataque') return campo;
      const extras = armasCatalogo.filter((nome) => !campo.opcoes.includes(nome));
      return extras.length ? { ...campo, opcoes: [...campo.opcoes, ...extras] } : campo;
    });
  }, [descritor, armasCatalogo]);

  const onChangeCampo = (campo, valor) => {
    setForm((f) => ({ ...f, [campo.col]: valor }));
    // Editar um derivado à mão marca a sobrescrita — dali em diante ele para
    // de seguir a fórmula, mesmo que outras entradas continuem mudando.
    if (campo.tipo === 'derivado') {
      setSobrescritos((s) => { const novo = new Set(s); novo.add(campo.col); return novo; });
    }
  };

  if (!descritor) return null; // tabela sem descritor: nada a montar

  const valorDerivado = (campo) => (sobrescritos.has(campo.col) ? form[campo.col] : derivados[campo.col]);
  const valorDoCampo = (campo) => {
    // Derivado oculto que sai do Dano 100% (dano_25/50/75): sempre do valor
    // que está na tela, calculado ou digitado — ver catalogo-descritores.jsx.
    if (campo.deDano100) {
      const d100 = descritor.campos.find((c) => c.col === 'dano_100');
      return CriaturaFormulas.tiersDeDano(d100 ? valorDerivado(d100) : 0)[campo.deDano100];
    }
    return campo.tipo === 'derivado' ? valorDerivado(campo) : form[campo.col];
  };

  // O campo auto não entra na checagem: ele não é renderizado, e exigir o
  // preenchimento de um input que não existe travaria o Salvar pra sempre.
  const obrigatoriosOk = descritor.campos
    .filter((c) => c.obrigatorio && !c.autoDeNome)
    .every((c) => {
      const v = form[c.col];
      return v !== undefined && v !== null && String(v).trim() !== '';
    });

  /* Campo vazio no formulário: o que mandar pro banco?

     Até 11/09/2026 a resposta era "nada" — a coluna saía do payload. No
     INSERT isso dá NULL e está certo. No UPDATE não: o PostgREST só toca
     nas colunas que vierem no payload, então apagar o conteúdo de um campo
     e salvar deixava o valor antigo intacto. Havia um comentário longo aqui
     dizendo que distinguir "esvaziei de propósito" de "nunca preenchi" era
     decisão de produto separada.

     O usuário pediu essa decisão (11/09/2026): "ao editar uma magia,
     permitir excluir um nível". Então: só manda `null` quando o campo TINHA
     valor na linha carregada e agora está vazio. Campo que já nasceu vazio
     continua fora do payload, que é o que evita sobrescrever com NULL
     colunas que o formulário nem conhece. */
  const vazio = (v) => v === '' || v === null || v === undefined;
  const limpou = (campo) => !!linha && !vazio(linha[campo.col]);

  const salvar = async () => {
    const payload = {};
    descritor.campos.forEach((campo) => {
      /* Campo somenteLeitura NUNCA entra no payload.
         itens.magico é coluna GERADA no Postgres, e mencioná-la num UPDATE
         devolve "column magico can only be updated to DEFAULT" — o erro que
         fazia TODA edição de item falhar até 11/09/2026. A guarda é genérica
         de propósito: qualquer coluna gerada que apareça depois já nasce
         coberta. */
      if (campo.somenteLeitura) return;
      const bruto = valorDoCampo(campo);
      if (campo.tipo === 'derivado') {
        // Calculado ou sobrescrito, sempre grava — nunca some do payload.
        payload[campo.col] = Number(bruto) || 0;
        return;
      }
      if (campo.tipo === 'numero') {
        if (vazio(bruto)) { if (limpou(campo)) payload[campo.col] = null; return; }
        payload[campo.col] = Number(bruto);
        return;
      }
      const valor = typeof bruto === 'string' ? bruto.trim() : bruto;
      if (vazio(valor)) { if (limpou(campo)) payload[campo.col] = null; return; }
      // A conversão 'Sim'/'Não' -> boolean de itens.magico vivia aqui e foi
      // removida em 11/09/2026: o campo é somenteLeitura e sai na guarda do
      // topo do loop, então este ponto nunca o via. A conversão que RESTA é a
      // do sentido oposto (banco -> tela), em linhaParaForm.
      payload[campo.col] = valor;
    });
    payload.atualizado_em = new Date().toISOString();

    setSaving(true); setError(null);
    const idCol = descritor.chave || 'id';

    // Chave derivada do nome, SÓ na criação (ver slugDeNome). No update ela
    // sai do payload: é a identidade da linha e o .eq() abaixo depende dela.
    const campoAuto = descritor.campos.find((c) => c.autoDeNome);
    if (campoAuto && !linha) {
      const base = slugDeNome(form.nome);
      if (!base) { setSaving(false); setError(t.editorChaveVazia); return; }
      const { data: existentes, error: errBusca } = await supabaseClient
        .from(descritor.tabela).select(campoAuto.col).like(campoAuto.col, base + '%');
      if (errBusca) { setSaving(false); setError(errBusca.message); return; }
      payload[campoAuto.col] = chaveLivre(base, (existentes || []).map((r) => r[campoAuto.col]));
    } else if (campoAuto) {
      delete payload[campoAuto.col];
    }
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
    <ModalShell title={titulo} lang={lang} size="lg" extraClass="modal-catalogo"
      onClose={onCancel} onCancel={onCancel}
      onConfirm={salvar}
      confirmLabel={saving ? t.editorSalvando : undefined}
      confirmDisabled={saving || !obrigatoriosOk}>
      <div className="catalogo-form-grid">
        {camposEfetivos.filter((campo) => !campo.autoDeNome && !campo.oculto).map((campo) => (
          <CatalogoCampo key={campo.col} campo={campo}
            label={t[campo.rotuloKey] || campo.col}
            valor={valorDoCampo(campo)}
            onChange={(v) => onChangeCampo(campo, v)}
            disabled={!!(campo.somenteNovo && linha)}
            sobrescrito={sobrescritos.has(campo.col)}
            nomes={campo.tipo === 'lista' ? nomesPorFonte[campo.fonte] : undefined}
            t={t}
          />
        ))}
      </div>
      {error && <div className="err-msg">{error}</div>}
    </ModalShell>
  );
}

Object.assign(window, { CatalogoEditor, slugDeNome, chaveLivre });
