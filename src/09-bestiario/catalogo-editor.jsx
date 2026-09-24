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

   Props: { tabela, linha, lang, onSalvo, onCancel, onExcluido }. `linha` null
   = criação. `onSalvo(linhaSalva)` é chamado depois do sucesso;
   `onExcluido(linha)`, depois de excluir (só criaturas).

   Campo derivado (criaturas): calculado e SÓ LEITURA desde 14/09/2026 — atributos
   e equipamento entram, e Ataque, EF, EH, RF, RM, Tipo de Armadura, Absorção,
   Defesa, Velocidade, L/M/P e Dano 100% saem da conta (derivadosDaCriatura,
   criatura-formulas.jsx). Até essa data eram sugestões sobrescrevíveis, por
   causa dos dragões feitos à mão; o usuário decidiu que a conta manda. Desde
   15/09/2026 nem aparecem no modal: vão no payload e a linha expandida da
   CriaturasList (bestiario.jsx) é quem os mostra.
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

// ---------- Equipamento de criatura (14/09/2026) ----------
/* "deve ser possível equipar a criatura com armas e armaduras." O valor é a
   lista { slug, slot } de criaturas.equipamento; o slot sai de slotParaPeca
   (criatura-formulas.jsx): armas sem limite, um escudo, o slot próprio para
   a armadura. O que não cabe não entra — e a busca diz por quê.

   Sem rótulo de lugar ("Mão", "Peito"…) desde 15/09/2026: "não haverá
   limitação de equipamentos de ataque, ou seja, remova o identificador 'mão',
   etc do modal". O slot continua gravado — a conta precisa dele —, só não
   aparece.

   `catalogo` são os itens de Armas e Armaduras, com as colunas que a conta
   usa; `porSlug` é o mesmo catálogo indexado. */
const EQUIP_MOTIVO = { ja_equipada: 'equipJaEquipada', slot_ocupado: 'equipSlotOcupado', sem_slot: 'equipSemSlot' };

function CatalogoEquipamento({ label, valor, onChange, catalogo, porSlug, t }) {
  const [busca, setBusca] = React.useState('');
  const lista = Array.isArray(valor) ? valor : [];
  const termo = listaChave(busca);
  const sugestoes = termo
    ? (catalogo || []).filter((it) => listaChave(it.nome).includes(termo)).slice(0, 40)
    : [];

  const equipar = (it) => {
    const r = CriaturaFormulas.slotParaPeca(it, lista, porSlug);
    if (!r.slot) return;
    onChange([...lista, { slug: it.slug, slot: r.slot }]);
    setBusca('');
  };
  const tirar = (idx) => onChange(lista.filter((_, i) => i !== idx));

  return (
    <div className="catalogo-campo-full catalogo-lista catalogo-equipamento" data-lista="equipamento">
      <label className="diario-field-label">{label}</label>
      <div className="catalogo-lista-caixa">
        {lista.map((e, i) => {
          const cat = porSlug && porSlug[e.slug];
          return (
            <span key={e.slug + ':' + e.slot + ':' + i} className="catalogo-lista-chip" data-slot={e.slot}>
              <span className="catalogo-lista-chip-nome">{cat ? cat.nome : e.slug}</span>
              <button type="button" className="catalogo-lista-chip-x"
                aria-label={`${t.equipRemover} ${cat ? cat.nome : e.slug}`} onClick={() => tirar(i)}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </span>
          );
        })}
        <div className="catalogo-lista-busca">
          <input className="diario-input" type="text" value={busca}
            placeholder={t.equipBuscar} aria-label={`${label}: ${t.equipBuscar}`}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setBusca('');
              if (e.key === 'Enter') {
                e.preventDefault();
                const primeira = sugestoes.find((it) => CriaturaFormulas.slotParaPeca(it, lista, porSlug).slot);
                if (primeira) equipar(primeira);
              }
            }} />
          {sugestoes.length > 0 && (
            <ul className="select-pill-drop catalogo-lista-drop">
              {sugestoes.map((it) => {
                const r = CriaturaFormulas.slotParaPeca(it, lista, porSlug);
                return (
                  <li key={it.slug} data-slug={it.slug} aria-disabled={!r.slot}
                    className={r.slot ? undefined : 'catalogo-equip-bloqueado'}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => equipar(it)}>
                    {it.nome}
                    {!r.slot && <span className="catalogo-equip-onde">{t[EQUIP_MOTIVO[r.motivo]] || ''}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
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
function CatalogoCampo({ campo, label, valor, onChange, disabled, nomes, refs, t, equip }) {
  if (campo.tipo === 'equipamento') {
    return <CatalogoEquipamento label={label} valor={valor} onChange={onChange}
      catalogo={equip && equip.catalogo} porSlug={equip && equip.porSlug} t={t} />;
  }
  /* Campo `derivado` não chega aqui desde 15/09/2026: "No modal de editar
     criaturas, não precisa mostrar os campos preenchidos automaticamente, mas
     mostre ao expandir a criatura na tabela." A conta continua rodando e indo
     no payload (ver salvar); quem mostra é a linha expandida da CriaturasList. */
  if (campo.tipo === 'lista') {
    return <CatalogoLista campo={campo} label={label} valor={valor} onChange={onChange}
      disabled={disabled} nomes={nomes} t={t} />;
  }
  /* Referência (14/09/2026): UMA linha de outra tabela, gravada pelo id —
     itens.criatura_id aponta o animal para a criatura do bestiário. `refs` é
     [{ id, nome }] da tabela `fonte`. Vazio = sem vínculo (null no banco). */
  if (campo.tipo === 'referencia') {
    const opcoes = [{ value: '', label: t.campoSemVinculo || '—' },
      ...(refs || []).map((r) => ({ value: String(r.id), label: r.nome }))];
    return (
      <SelectPill label={label} value={valor == null ? '' : String(valor)} onChange={onChange}
        disabled={disabled} options={opcoes} />
    );
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
    /* Valor gravado FORA da lista (14/09/2026): quando um campo de texto livre
       vira lista fechada (tipo/subtipo/plano da criatura), o que já está no
       banco — "Demônio", "Lobo", "Astral" — não pode sumir da tela nem ser
       trocado sem ninguém ver. Ele entra como primeira opção, marcado, e só
       muda se alguém escolher outra. */
    const opcoes = opcoesNormalizadas(campo);
    const foraDaLista = valor != null && valor !== '' && !opcoes.some((o) => String(o.value) === String(valor));
    const opcoesComAtual = foraDaLista
      ? [{ value: valor, label: `${valor} (${t.campoForaDaLista})` }, ...opcoes]
      : opcoes;
    return (
      <SelectPill label={label} value={valor} onChange={onChange}
        disabled={disabled || !!campo.somenteLeitura}
        options={opcoesComAtual} />
    );
  }
  /* Ícone (itens.icone, 14/09/2026): o banco só aceita "ti-nome". A prévia
     mostra o que vai ser gravado; formato que não dá para aproveitar avisa
     aqui, e o salvar recusa com a mesma mensagem. */
  if (campo.formato === 'icone') {
    const n = normalizarIcone(valor);
    return (
      <div className="catalogo-campo-icone">
        <label className="diario-field-label">{label}</label>
        <div className="catalogo-icone-linha">
          <input className="diario-input" type="text" name={campo.col} placeholder="ti-paw"
            value={valor} onChange={(e) => onChange(e.target.value)} disabled={disabled}
            aria-invalid={!n.valido} />
          <span className="catalogo-icone-previa" aria-hidden="true">
            {n.valido && n.valor ? <i className={'ti ' + n.valor} /> : null}
          </span>
        </div>
        {!n.valido && <div className="catalogo-icone-erro" role="alert">{t.campoIconeInvalido}</div>}
      </div>
    );
  }
  // texto e numero.
  return (
    <div>
      <label className="diario-field-label">{label}</label>
      <input
        className="diario-input"
        type={campo.tipo === 'numero' ? 'number' : 'text'}
        name={campo.col}
        min={campo.min} max={campo.max}
        /* `passo` (17/09/2026): sem ele o input[type=number] assume step=1 e o
           navegador RECUSA 0,80 — o campo fica inválido e o salvar não passa.
           Só `altura` precisa hoje (metros com duas casas); os outros campos
           numéricos do catálogo são inteiros e seguem sem step. */
        step={campo.passo}
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
  // Campos `booleano` (criaturas.montaria): mesma conversão, no sentido
  // banco -> tela. O sentido oposto fica no salvar.
  (descritor ? descritor.campos : []).forEach((c) => {
    if (c.booleano && typeof out[c.col] === 'boolean') out[c.col] = out[c.col] ? 'Sim' : 'Não';
  });
  if (descritor && descritor.campos.some((c) => c.tipo === 'equipamento')) {
    out.equipamento = Array.isArray(out.equipamento) ? out.equipamento : [];
  }
  return out;
}

/* ── Criatura e item Animal: a mesma entrada (15/09/2026) ──────────
   "Os itens do tipo animal, e as criaturas, são em tese a mesma entrada no
   banco, fazem referência às criaturas que os jogadores podem comercializar e
   possuir, algumas, até montar." Decisão: unificar de verdade — o Mestre
   cadastra a criatura, e o item Animal vem junto.

   Depois de salvar a criatura:
     1. item já ligado (itens.criatura_id)  → acompanha o nome da criatura;
     2. senão, e a criatura é do tipo Animal:
        a. item Animal SEM vínculo com o mesmo nome (cadastro antigo)
           → ganha o vínculo, em vez de nascer um duplicado;
        b. nenhum → cria o item (grupo Animais), com a chave pelo nome.
   O slug do item nunca muda: inventários o referenciam. Preço, peso e o resto
   de loja ficam para o Mestre no editor de itens — não há de onde tirar.

   Devolve null ou a mensagem de erro. A criatura já está salva quando isto
   roda; erro aqui não pode fingir que a criatura falhou. */
async function sincronizarAnimalDaCriatura(criatura) {
  if (!criatura || criatura.id == null || !criatura.nome) return null;
  const itens = () => supabaseClient.from('itens');
  const { data: ligados, error: e1 } = await itens().select('slug, nome').eq('criatura_id', criatura.id);
  if (e1) return e1.message;
  if (ligados && ligados.length) {
    const renomear = ligados.filter((it) => it.nome !== criatura.nome);
    for (const it of renomear) {
      const { error } = await itens().update({ nome: criatura.nome, atualizado_em: new Date().toISOString() }).eq('slug', it.slug);
      if (error) return error.message;
    }
    return null;
  }
  if (criatura.tipo !== 'Animal') return null;

  const { data: soltos, error: e2 } = await itens().select('slug, nome').eq('grupo', 'Animais').is('criatura_id', null);
  if (e2) return e2.message;
  const alvo = listaChave(criatura.nome);
  const mesmoNome = (soltos || []).find((it) => listaChave(it.nome) === alvo);
  if (mesmoNome) {
    const { error } = await itens().update({ criatura_id: criatura.id, atualizado_em: new Date().toISOString() }).eq('slug', mesmoNome.slug);
    return error ? error.message : null;
  }

  const base = slugDeNome(criatura.nome);
  const { data: usadas, error: e3 } = await itens().select('slug').like('slug', base + '%');
  if (e3) return e3.message;
  const { error } = await itens().insert({
    slug: chaveLivre(base, (usadas || []).map((r) => r.slug)),
    nome: criatura.nome,
    grupo: 'Animais',
    tipo: 'S',
    origem: 'Comum',
    descricao: criatura.descricao || null,
    criatura_id: criatura.id,
    atualizado_em: new Date().toISOString(),
  });
  return error ? error.message : null;
}

/* As colunas que a conta do equipamento lê (criatura-formulas.jsx) e a busca
   mostra. `itens` passa de 1000 linhas: fetchTabelaPaginada. */
const COLUNAS_EQUIP = 'slug, nome, grupo, slot_equip, categoria_equip, dano, dano_l, dano_m, dano_p, ajuste_atributo, absorcao, defesa, tipo_armadura, maos_outras';

// ---------- CatalogoEditor ----------
/* `onExcluido` (14/09/2026): "No rodapé adicionar um botão para excluir." Só
   no editor de criaturas e só editando uma que existe. Dois cliques: o
   primeiro arma, o segundo apaga. */
function CatalogoEditor({ tabela, linha, lang, onSalvo, onCancel, onExcluido }) {
  const t = (ADMIN_COPY[lang] || ADMIN_COPY.pt);
  const descritor = descritorDe(tabela);

  const camposVazios = React.useMemo(() => {
    const base = {};
    (descritor ? descritor.campos : []).forEach((c) => { base[c.col] = c.tipo === 'equipamento' ? [] : ''; });
    return base;
  }, [descritor]);

  const [form, setForm] = React.useState(() => (
    linha ? { ...camposVazios, ...linhaParaForm(linha, descritor) } : camposVazios
  ));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [confirmandoExcluir, setConfirmandoExcluir] = React.useState(false);
  const [excluindo, setExcluindo] = React.useState(false);
  // Criatura criada cujo item Animal falhou: o modal fica aberto com o erro, e
  // o próximo Salvar precisa ATUALIZAR essa linha — inserir de novo duplicaria.
  const [criadaAgora, setCriadaAgora] = React.useState(null);

  const temEquipamento = !!descritor && descritor.campos.some((c) => c.tipo === 'equipamento');
  // Armas e Armaduras do catálogo — só para quem tem campo de equipamento.
  const [equipCatalogo, setEquipCatalogo] = React.useState([]);
  React.useEffect(() => {
    if (!temEquipamento) return undefined;
    let cancelado = false;
    Promise.all(['Armas', 'Armaduras'].map((grupo) => (
      fetchTabelaPaginada('itens', { colunas: COLUNAS_EQUIP, filtros: [['grupo', grupo]], ordem: ['nome'] })
    ))).then((respostas) => {
      if (cancelado) return;
      setEquipCatalogo(respostas.flatMap((r) => (r && r.data) || [])
        .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt')));
    });
    return () => { cancelado = true; };
  }, [temEquipamento]);
  const equipPorSlug = React.useMemo(() => {
    const m = {};
    equipCatalogo.forEach((it) => { m[it.slug] = it; });
    return m;
  }, [equipCatalogo]);

  /* Calculados (criaturas): TUDO sai da conta, sempre — atributos e
     equipamento. Até 14/09/2026 eram sugestões que o admin podia sobrescrever
     (os dragões tinham absorção e velocidade à mão); agora "são calculados
     automaticamente com base nas informações inseridas". */
  const derivados = React.useMemo(() => (
    descritor && descritor.tabela === 'criaturas'
      ? CriaturaFormulas.derivadosDaCriatura(form, equipPorSlug) : {}
  ), [descritor, form, equipPorSlug]);

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

  // Linhas de outra tabela para os campos `referencia` (itens.criatura_id).
  const [refsPorFonte, setRefsPorFonte] = React.useState({});
  React.useEffect(() => {
    if (!descritor) return undefined;
    const fontes = [...new Set(descritor.campos.filter((c) => c.tipo === 'referencia').map((c) => c.fonte))];
    let cancelado = false;
    fontes.forEach((fonte) => {
      fetchTabelaPaginada(fonte, { colunas: 'id, nome', ordem: ['nome'] })
        .then(({ data }) => {
          if (cancelado) return;
          setRefsPorFonte((m) => ({ ...m, [fonte]: data || [] }));
        });
    });
    return () => { cancelado = true; };
  }, [descritor]);

  const onChangeCampo = (campo, valor) => {
    setForm((f) => ({ ...f, [campo.col]: valor }));
  };

  if (!descritor) return null; // tabela sem descritor: nada a montar

  const valorDoCampo = (campo) => (campo.tipo === 'derivado' ? derivados[campo.col] : form[campo.col]);

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
    let iconeInvalido = false;
    descritor.campos.forEach((campo) => {
      /* Campo somenteLeitura NUNCA entra no payload.
         itens.magico é coluna GERADA no Postgres, e mencioná-la num UPDATE
         devolve "column magico can only be updated to DEFAULT" — o erro que
         fazia TODA edição de item falhar até 11/09/2026. A guarda é genérica
         de propósito: qualquer coluna gerada que apareça depois já nasce
         coberta. `semColuna` (RF/RM da criatura) nem existe no banco. */
      if (campo.somenteLeitura || campo.semColuna) return;
      const bruto = valorDoCampo(campo);
      if (campo.tipo === 'equipamento') {
        payload[campo.col] = Array.isArray(bruto) ? bruto : [];
        return;
      }
      if (campo.tipo === 'derivado') {
        // Sempre grava o que a conta dá — inclusive null (criatura sem arma
        // não tem Ataque nem L/M/P, e o valor velho não pode ficar).
        if (vazio(bruto)) { payload[campo.col] = null; return; }
        payload[campo.col] = campo.texto ? String(bruto) : (Number(bruto) || 0);
        return;
      }
      if (campo.tipo === 'numero') {
        if (vazio(bruto)) { if (limpou(campo)) payload[campo.col] = null; return; }
        payload[campo.col] = Number(bruto);
        return;
      }
      // Referência: id numérico no banco; vazio desfaz o vínculo.
      if (campo.tipo === 'referencia') {
        if (vazio(bruto)) { if (limpou(campo)) payload[campo.col] = null; return; }
        payload[campo.col] = Number(bruto);
        return;
      }
      // Booleano: 'Sim'/'Não' na tela, true/false no banco.
      if (campo.booleano) {
        if (bruto === 'Sim' || bruto === true) payload[campo.col] = true;
        else if (bruto === 'Não' || bruto === false || limpou(campo)) payload[campo.col] = false;
        return;
      }
      let valor = typeof bruto === 'string' ? bruto.trim() : bruto;
      // Ícone: grava sempre "ti-nome" (itens_icone_formato_chk).
      if (campo.formato === 'icone') {
        const n = normalizarIcone(valor);
        if (!n.valido) { iconeInvalido = true; return; }
        valor = n.valor || '';
      }
      if (vazio(valor)) { if (limpou(campo)) payload[campo.col] = null; return; }
      // A conversão 'Sim'/'Não' -> boolean de itens.magico vivia aqui e foi
      // removida em 11/09/2026: o campo é somenteLeitura e sai na guarda do
      // topo do loop, então este ponto nunca o via. A conversão que RESTA é a
      // do sentido oposto (banco -> tela), em linhaParaForm.
      payload[campo.col] = valor;
    });
    payload.atualizado_em = new Date().toISOString();
    if (iconeInvalido) { setError(t.campoIconeInvalido); return; }

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
    const alvo = linha || criadaAgora;
    const query = alvo
      ? supabaseClient.from(descritor.tabela).update(payload).eq(idCol, alvo[idCol]).select().single()
      : supabaseClient.from(descritor.tabela).insert(payload).select().single();
    const { data, error: err } = await query;
    if (err) { setSaving(false); setError(err.message); return; }
    if (descritor.tabela === 'criaturas' && data) {
      const erroAnimal = await sincronizarAnimalDaCriatura(data);
      if (erroAnimal) {
        if (!alvo) setCriadaAgora(data);
        setSaving(false);
        setError(`${t.editorAnimalFalhou} ${erroAnimal}`);
        return;
      }
    }
    setSaving(false);
    onSalvo(data);
  };

  // Excluir: só criaturas, só editando. `.select()` pelo mesmo motivo do
  // toggleDisponibilizar do Lore: DELETE barrado pela RLS volta sem erro e
  // com zero linhas — sem conferir, a janela fecharia e a criatura ficaria.
  const podeExcluir = descritor.tabela === 'criaturas' && !!linha && typeof onExcluido === 'function';
  const excluir = async () => {
    if (!confirmandoExcluir) { setConfirmandoExcluir(true); return; }
    setExcluindo(true); setError(null);
    const idCol = descritor.chave || 'id';
    const { data, error: err } = await supabaseClient
      .from(descritor.tabela).delete().eq(idCol, linha[idCol]).select();
    setExcluindo(false);
    if (err) { setError(err.message); setConfirmandoExcluir(false); return; }
    if (!data || data.length === 0) {
      setError(lang === 'en' ? 'Nothing was deleted (permission denied?).' : 'Nada foi excluído (sem permissão?).');
      setConfirmandoExcluir(false);
      return;
    }
    onExcluido(linha);
  };
  const botaoExcluir = podeExcluir ? (
    <button type="button" className={confirmandoExcluir ? 'btn-danger btn-md' : 'btn-ghost btn-md catalogo-btn-excluir'}
      onClick={excluir} disabled={saving || excluindo}>
      <i className="ti ti-trash" aria-hidden="true" />{' '}
      {excluindo ? t.editorExcluindo : (confirmandoExcluir ? t.editorExcluirConfirmar : t.editorExcluir)}
    </button>
  ) : null;

  const tabLabel = t[descritor.rotuloKey] || descritor.tabela;
  const titulo = `${tabLabel} — ${linha ? t.editorEditar : t.editorNovo}`;

  return (
    <ModalShell title={titulo} lang={lang} size="lg" extraClass="modal-catalogo"
      onClose={onCancel} onCancel={onCancel}
      onConfirm={salvar}
      confirmLabel={saving ? t.editorSalvando : undefined}
      confirmDisabled={saving || excluindo || !obrigatoriosOk}
      footerBeforeConfirm={botaoExcluir}>
      <div className="catalogo-form-grid">
        {descritor.campos.filter((campo) => !campo.autoDeNome && !campo.oculto && campo.tipo !== 'derivado').map((campo) => (
          <CatalogoCampo key={campo.col} campo={campo}
            label={t[campo.rotuloKey] || campo.col}
            valor={valorDoCampo(campo)}
            onChange={(v) => onChangeCampo(campo, v)}
            disabled={!!(campo.somenteNovo && linha)}
            nomes={campo.tipo === 'lista' ? nomesPorFonte[campo.fonte] : undefined}
            refs={campo.tipo === 'referencia' ? refsPorFonte[campo.fonte] : undefined}
            equip={campo.tipo === 'equipamento' ? { catalogo: equipCatalogo, porSlug: equipPorSlug } : undefined}
            t={t}
          />
        ))}
      </div>
      {error && <div className="err-msg">{error}</div>}
    </ModalShell>
  );
}

Object.assign(window, { CatalogoEditor, slugDeNome, chaveLivre });
