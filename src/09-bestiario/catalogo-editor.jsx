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
/* SelectPill mora em 01-core/select-pill.jsx desde 25/09/2026 — uma peça só
   para o sistema inteiro, com a pele do seletor de data. */

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
const EQUIP_MOTIVO = { ja_equipada: 'equipJaEquipada', slot_ocupado: 'equipSlotOcupado', sem_slot: 'equipSemSlot', nao_e_arma: 'equipNaoEArma' };

/* `parte` (25/09/2026): o mesmo jsonb aparece em DOIS campos — 'ataque' (as
   armas) e 'itens' (peças vestidas e mochila). Cada um mostra só a sua parte,
   mas edita a lista inteira: o índice da etiqueta é o da lista completa, para
   tirar a peça certa. Sem `parte`, o comportamento de antes (tudo junto). */
function CatalogoEquipamento({ label, valor, onChange, catalogo, porSlug, t, parte }) {
  const [busca, setBusca] = React.useState('');
  const lista = Array.isArray(valor) ? valor : [];
  const F = CriaturaFormulas;
  const partes = parte ? F.partesDoEquipamento(lista, porSlug) : null;
  const daParte = parte === 'ataque' ? partes.ataque
    : parte === 'itens' ? [...partes.vestido, ...partes.mochila] : lista;
  const visiveis = lista.map((e, i) => ({ e, i })).filter(({ e }) => daParte.includes(e));
  const termo = listaChave(busca);
  const doCampo = parte === 'ataque' ? (catalogo || []).filter((it) => it.grupo === 'Armas') : (catalogo || []);
  const sugestoes = termo
    ? doCampo.filter((it) => listaChave(it.nome).includes(termo)).slice(0, 40)
    : [];
  const placeholder = parte === 'ataque' ? t.equipBuscarArma : parte === 'itens' ? t.equipBuscarItem : t.equipBuscar;

  const equipar = (it) => {
    const r = F.slotParaPeca(it, lista, porSlug, parte);
    if (!r.slot) return;
    onChange(r.slot === F.SLOT_MOCHILA ? F.guardarNaMochila(lista, it.slug, 1) : [...lista, { slug: it.slug, slot: r.slot }]);
    setBusca('');
  };
  const tirar = (idx) => onChange(lista.filter((_, i) => i !== idx));
  // Quantidade da mochila: menos 1 até 1 (abaixo disso é o X), mais 1 sem teto.
  const mudarQtd = (idx, delta) => onChange(lista.map((e, i) => (i === idx
    ? { ...e, qtd: Math.max(1, (Number(e.qtd) || 1) + delta) } : e)));

  return (
    <div className="catalogo-campo-full catalogo-lista catalogo-equipamento"
      data-lista={parte ? 'equipamento-' + parte : 'equipamento'}>
      <label className="diario-field-label">{label}</label>
      <div className="catalogo-lista-caixa">
        {visiveis.map(({ e, i }) => {
          const cat = porSlug && porSlug[e.slug];
          const nome = cat ? cat.nome : e.slug;
          const naMochila = e.slot === F.SLOT_MOCHILA;
          const qtd = Number(e.qtd) || 1;
          return (
            <span key={e.slug + ':' + e.slot + ':' + i} className={'catalogo-lista-chip' + (naMochila ? ' catalogo-lista-chip--mochila' : '')}
              data-slot={e.slot} data-slug={e.slug}>
              {naMochila && (
                <button type="button" className="catalogo-lista-chip-x" disabled={qtd <= 1}
                  aria-label={`${t.equipMenos}: ${nome}`} onClick={() => mudarQtd(i, -1)}>
                  <i className="ti ti-minus" aria-hidden="true" />
                </button>
              )}
              <span className="catalogo-lista-chip-nome">{naMochila ? `${qtd}× ${nome}` : nome}</span>
              {naMochila && (
                <button type="button" className="catalogo-lista-chip-x"
                  aria-label={`${t.equipMais}: ${nome}`} onClick={() => mudarQtd(i, 1)}>
                  <i className="ti ti-plus" aria-hidden="true" />
                </button>
              )}
              <button type="button" className="catalogo-lista-chip-x"
                aria-label={`${t.equipRemover} ${nome}`} onClick={() => tirar(i)}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </span>
          );
        })}
        <div className="catalogo-lista-busca">
          <input className="diario-input" type="text" value={busca}
            placeholder={placeholder} aria-label={`${label}: ${placeholder}`}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setBusca('');
              if (e.key === 'Enter') {
                e.preventDefault();
                const primeira = sugestoes.find((it) => F.slotParaPeca(it, lista, porSlug, parte).slot);
                if (primeira) equipar(primeira);
              }
            }} />
          {sugestoes.length > 0 && (
            <ul className="select-pill-drop catalogo-lista-drop">
              {sugestoes.map((it) => {
                const r = F.slotParaPeca(it, lista, porSlug, parte);
                return (
                  <li key={it.slug} data-slug={it.slug} aria-disabled={!r.slot}
                    className={r.slot ? undefined : 'catalogo-equip-bloqueado'}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => equipar(it)}>
                    {it.nome}
                    {!r.slot && <span className="catalogo-equip-onde">{t[EQUIP_MOTIVO[r.motivo]] || ''}</span>}
                    {r.slot === F.SLOT_MOCHILA && <span className="catalogo-equip-onde">{t.equipNaMochila}</span>}
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

/* `quantidade` (26/09/2026, itens do ritual da magia): cada escolhido é
   "Nome (n)". O chip mostra o nome e − n +; o catálogo é conferido pelo NOME,
   sem o (n). Quantidade que não é número ("Carcaça (Variável)") passa como
   veio, sem os botões. */
const RE_QTD = /^(.*?)\s*\((\d+)\)\s*$/;
const partesDoItem = (v) => { const m = String(v).match(RE_QTD); return m ? { nome: m[1], qtd: Number(m[2]) } : { nome: String(v), qtd: null }; };
function CatalogoLista({ campo, label, valor, onChange, disabled, nomes, t }) {
  const [busca, setBusca] = React.useState('');
  const escolhidos = listaSeparar(valor);
  const comQtd = !!campo.quantidade;
  const nomeBase = (v) => (comQtd ? partesDoItem(v).nome : v);
  const chavesEscolhidas = new Set(escolhidos.map((v) => listaChave(nomeBase(v))));
  const doCatalogo = new Set((nomes || []).map(listaChave));
  const termo = listaChave(busca);
  const sugestoes = termo
    ? (nomes || []).filter((n) => listaChave(n).includes(termo) && !chavesEscolhidas.has(listaChave(n))).slice(0, 40)
    : [];

  const gravar = (lista) => onChange(lista.join(', '));
  const adicionar = (nome) => { gravar([...escolhidos, comQtd ? `${nome} (1)` : nome]); setBusca(''); };
  const remover = (idx) => gravar(escolhidos.filter((_, i) => i !== idx));
  const mudarQtd = (idx, delta) => gravar(escolhidos.map((v, i) => {
    if (i !== idx) return v;
    const p = partesDoItem(v);
    return `${p.nome} (${Math.max(1, (p.qtd || 1) + delta)})`;
  }));

  return (
    <div className="catalogo-campo-full catalogo-lista" data-lista={campo.col}>
      <label className="diario-field-label">{label}</label>
      <div className="catalogo-lista-caixa">
        {escolhidos.map((nome, i) => {
          const fora = nomes && nomes.length > 0 && !doCatalogo.has(listaChave(nomeBase(nome)));
          const p = comQtd ? partesDoItem(nome) : null;
          return (
            <span key={nome + i} className={'catalogo-lista-chip' + (fora ? ' catalogo-lista-chip--fora' : '')}>
              {fora && <i className="ti ti-alert-circle catalogo-lista-chip-aviso" role="img" aria-label={t.listaForaCatalogo} />}
              <span className="catalogo-lista-chip-nome">{p && p.qtd != null ? p.nome : nome}</span>
              {p && p.qtd != null && (
                <span className="catalogo-lista-qtd">
                  <button type="button" disabled={disabled || p.qtd <= 1} aria-label={`Um a menos: ${p.nome}`} onClick={() => mudarQtd(i, -1)}>−</button>
                  <span className="catalogo-lista-qtd-n">{p.qtd}</span>
                  <button type="button" disabled={disabled} aria-label={`Um a mais: ${p.nome}`} onClick={() => mudarQtd(i, +1)}>+</button>
                </span>
              )}
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

/* ---------- CatalogoMulti — várias opções de uma lista fechada (25/09/2026) ----------
   "No input de elemento das criaturas, permita selecionar mais de uma opção."
   Um botão por opção, de liga/desliga, com a pele da pílula do dropdown. O
   valor é texto separado por vírgula, sempre na ORDEM DA LISTA (não na ordem
   do clique): "Fogo, Luz" e "Luz, Fogo" não viram dois valores diferentes.
   Escolha gravada fora da lista (catálogo antigo) aparece e pode ser tirada.

   DROPDOWN desde 26/09/2026 ("mantenha o dropdown menu para selecionar mais
   de uma opção"): o SelectPillMulti (01-core/select-pill.jsx), a mesma pílula
   dos outros campos, que marca sem fechar. Eram botões lado a lado. As regras
   de ordem, de valor fora da lista e de `exclusiva` continuam aqui. */
function CatalogoMulti({ campo, label, valor, onChange, disabled }) {
  const normalizadas = opcoesNormalizadas(campo);
  const opcoes = normalizadas.map((o) => String(o.value));
  const escolhidos = listaSeparar(valor);
  const marcado = new Set(escolhidos.map(listaChave));
  const fora = escolhidos.filter((v) => !opcoes.some((o) => listaChave(o) === listaChave(v)));
  const todas = [...normalizadas, ...fora.map((v) => ({ value: v, label: v }))];
  const aplicar = (novos) => {
    const proximo = new Set(novos.map(listaChave));
    /* `exclusiva` (26/09/2026): a opção que não convive com as outras — o
       "Livre" dos grupos de armas da técnica. Marcá-la limpa as demais;
       marcar outra a tira. */
    const ex = campo.exclusiva != null ? listaChave(campo.exclusiva) : null;
    const adicionada = [...proximo].find((k) => !marcado.has(k));
    if (ex && adicionada) {
      if (adicionada === ex) { proximo.clear(); proximo.add(ex); } else proximo.delete(ex);
    }
    const naOrdem = [...opcoes, ...fora].filter((o) => proximo.has(listaChave(o)));
    onChange(naOrdem.join(', '));
  };
  const Multi = (typeof SelectPillMulti !== 'undefined' && SelectPillMulti) || window.SelectPillMulti;
  return (
    <div className="catalogo-campo-full catalogo-multi" data-multi={campo.col}>
      <label className="diario-field-label">{label}</label>
      <Multi options={todas} disabled={disabled}
        values={todas.map((o) => String(o.value)).filter((o) => marcado.has(listaChave(o)))}
        onChange={aplicar} />
    </div>
  );
}

/* ---------- CatalogoEscolha / CatalogoEscala — botões de escolha única (25/09/2026) ----------
   "No modal de editar criaturas, transforme o plano, tipo, grupo e atributos
    como você fez com elemento. As opções viram botões seletores. No caso dos
    atributos, os atributos podem variar entre -2 e 8." (usuário)

   Mesma pele do CatalogoMulti, mas UMA escolha: clicar noutro troca; clicar
   no marcado desmarca (o campo pode ficar vazio, como no dropdown de antes).
   Valor gravado fora da lista/faixa (tipo "Demônio", atributo 10) aparece
   como botão extra, marcado — nada some da tela sem alguém ver. */
/* `redondo` (25/09/2026): "Os botões de atributo devem ser um círculo
   perfeito igual para todos os números." A escala de -2 a 8 desenha círculos
   do mesmo diâmetro; as listas de palavras seguem em pílula. */
function BotoesEscolha({ campo, label, itens, valor, onEscolher, disabled, t, redondo }) {
  const atual = valor == null ? '' : String(valor);
  const fora = atual !== '' && !itens.some((i) => String(i.value) === atual)
    ? [{ value: atual, label: `${atual} (${(t && t.campoForaDaLista) || '—'})` }] : [];
  return (
    <div className="catalogo-campo-full catalogo-multi" data-escolha={campo.col}>
      <label className="diario-field-label">{label}</label>
      <div className={'catalogo-multi-opcoes' + (redondo ? ' catalogo-multi-opcoes--redondo' : '')}
        role="radiogroup" aria-label={label}>
        {[...fora, ...itens].map((o) => {
          const on = String(o.value) === atual;
          return (
            <button key={String(o.value)} type="button" role="radio" aria-checked={on} disabled={disabled}
              className={'catalogo-multi-opcao' + (on ? ' is-on' : '')}
              onClick={() => onEscolher(on ? '' : o.value)}>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CatalogoEscolha({ campo, label, valor, onChange, disabled, t }) {
  return (
    <BotoesEscolha campo={campo} label={label} t={t} disabled={disabled || !!campo.somenteLeitura}
      itens={opcoesNormalizadas(campo)} valor={valor} onEscolher={onChange} />
  );
}

function CatalogoEscala({ campo, label, valor, onChange, disabled, t }) {
  const [min, max] = campo.escala;
  const itens = [];
  for (let n = min; n <= max; n++) itens.push({ value: n, label: String(n) });
  // O banco de intelecto é texto: grava "3", não 3.
  const gravar = (v) => onChange(v === '' ? '' : (campo.tipo === 'texto' ? String(v) : v));
  /* DROPDOWN desde 26/09/2026 (eram botões redondos): a mesma pílula dos
     outros campos. "—" deixa o atributo vazio, como o clique no botão marcado
     fazia. Valor fora da faixa aparece marcado, para não sumir da tela. */
  const atualEscala = valor === '' || valor == null ? '' : String(valor).trim();
  const foraEscala = atualEscala !== '' && !itens.some((i) => String(i.value) === atualEscala)
    ? [{ value: atualEscala, label: `${atualEscala} (${(t && t.campoForaDaLista) || '—'})` }] : [];
  const opcoesEscala = [{ value: '', label: '—' }, ...foraEscala,
    ...itens.map((i) => ({ value: String(i.value), label: i.label }))];
  return (
    <div className="catalogo-escala" data-escala={campo.col}>
      <SelectPill label={label} value={atualEscala} disabled={disabled} options={opcoesEscala}
        onChange={(v) => gravar(v === '' ? '' : (campo.tipo === 'texto' ? v : Number(v)))} />
    </div>
  );
}

// ---------- CatalogoCampo — um controle por tipo do descritor ----------
function CatalogoCampo({ campo, label, valor, onChange, disabled, nomes, refs, t, equip }) {
  if (campo.tipo === 'equipamento') {
    return <CatalogoEquipamento label={label} valor={valor} onChange={onChange} parte={campo.parte}
      catalogo={equip && equip.catalogo} porSlug={equip && equip.porSlug} t={t} />;
  }
  /* Campo `derivado` não chega aqui desde 15/09/2026: "No modal de editar
     criaturas, não precisa mostrar os campos preenchidos automaticamente, mas
     mostre ao expandir a criatura na tabela." A conta continua rodando e indo
     no payload (ver salvar); quem mostra é a linha expandida da CriaturasList. */
  if (campo.tipo === 'opcoes' && campo.botoes) {
    return <CatalogoEscolha campo={campo} label={label} valor={valor} onChange={onChange} disabled={disabled} t={t} />;
  }
  if (campo.escala) {
    return <CatalogoEscala campo={campo} label={label} valor={valor} onChange={onChange} disabled={disabled} t={t} />;
  }
  if (campo.tipo === 'multiopcoes') {
    return <CatalogoMulti campo={campo} label={label} valor={valor} onChange={onChange} disabled={disabled} />;
  }
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
  // Classe pode ter várias desde 26/09/2026 ("Animal, Místico").
  if (!listaSeparar(criatura.tipo).some((c) => listaChave(c) === listaChave('Animal'))) return null;

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

/* Campo específico de um grupo (itens: `grupos`, 26/09/2026) só aparece
   quando o item é desse grupo — ou quando já tem valor gravado, para nada
   sumir da tela sem alguém ver. Item sem grupo escolhido mostra só os comuns. */
function campoDoGrupo(campo, form) {
  if (!Array.isArray(campo.grupos)) return true;
  if (campo.grupos.includes(form && form.grupo)) return true;
  const v = form ? form[campo.col] : null;
  if (Array.isArray(v)) return v.length > 0;
  return !(v == null || v === '' || v === 0 || v === '0');
}

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
    /* O catálogo INTEIRO desde 25/09/2026: a mochila da criatura aceita
       qualquer item ("inclusive itens comuns disponíveis no catálogo"). O
       campo Ataque filtra as armas na tela. */
    Promise.all([
      fetchTabelaPaginada('itens', { colunas: COLUNAS_EQUIP, ordem: ['nome'] }),
    ]).then((respostas) => {
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
  /* ITENS também desde 26/09/2026 ("adicione um botão de excluir itens,
     igual em criaturas"). O risco que fez os catálogos nascerem sem DELETE é
     o slug dentro do JSON das fichas: o item some do inventário de quem o
     carrega (a tela pula slug sem catálogo, não quebra). Por isso o primeiro
     clique, além de armar, CONTA quantos personagens o têm — a confirmação
     diz o preço antes de ele ser pago. Precisa da política
     scripts/sql/itens-admin-delete.sql no banco. */
  // Magias, técnicas e habilidades desde 26/09/2026 (catalogos-admin-delete-2026-09-26.sql).
  const TABELAS_EXCLUIVEIS = ['criaturas', 'itens', 'magias', 'tecnicas', 'habilidades'];
  const podeExcluir = TABELAS_EXCLUIVEIS.includes(descritor.tabela) && !!linha && typeof onExcluido === 'function';
  const [emUso, setEmUso] = React.useState(null); // nº de personagens com o item; null = não contado
  const excluir = async () => {
    if (!confirmandoExcluir) {
      setConfirmandoExcluir(true);
      if (descritor.tabela === 'itens' && linha.slug) {
        /* `inventario @> {"itens":[{"slug":…}]}`. A contagem vê o que a RLS
           deixa ver — é um aviso, não uma trava. */
        const { count, error: errUso } = await supabaseClient
          .from('personagens').select('id', { count: 'exact', head: true })
          .contains('inventario', { itens: [{ slug: linha.slug }] });
        setEmUso(errUso ? null : (count || 0));
      }
      return;
    }
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
  /* Ícone AO LADO DO X desde 26/09/2026 ("o botão de excluir é um ícone ao
     lado do botão de x do modal") — era um botão com texto no rodapé. Mesma
     pele das ações do BestDetalheModal (ms-close ms-acao). Continua em dois
     cliques: o primeiro arma (lixeira com X, em vermelho) e o aviso no corpo
     diz o que vai acontecer; o segundo exclui. */
  const rotuloExcluir = excluindo ? t.editorExcluindo : (confirmandoExcluir ? t.editorExcluirConfirmar : t.editorExcluir);
  const botaoExcluir = podeExcluir ? (
    <button type="button"
      className={'ms-close ms-acao ms-acao--perigo catalogo-btn-excluir' + (confirmandoExcluir ? ' is-armado' : '')}
      onClick={excluir} disabled={saving || excluindo}
      aria-label={rotuloExcluir}>
      <i className={'ti ' + (confirmandoExcluir ? 'ti-trash-x' : 'ti-trash')} aria-hidden="true" />
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
      headerExtra={botaoExcluir}>
      {/* A lixeira armada avisa NO TOPO, perto do ícone que foi clicado — o
          formulário é longo e o fim dele fica fora da tela. Com itens, diz
          também quantos personagens perdem o item. */}
      {confirmandoExcluir && !excluindo && (
        <div className="err-msg catalogo-aviso-uso" role="alert">
          {lang === 'en' ? 'Click the trash again to delete. ' : 'Clique de novo na lixeira para excluir. '}
          {emUso > 0 && (lang === 'en'
            ? `${emUso} character${emUso === 1 ? ' carries' : 's carry'} this item. Deleting it removes it from ${emUso === 1 ? 'that inventory' : 'those inventories'}.`
            : `${emUso} personage${emUso === 1 ? 'm carrega' : 'ns carregam'} este item. Excluir o tira ${emUso === 1 ? 'desse inventário' : 'desses inventários'}.`)}
        </div>
      )}
      <div className="catalogo-form-grid">
        {/* `largura: 'curta'` (25/09/2026): meia coluna da grade — Estágio,
            Montaria, Peso e Altura cabem na linha de Nome e Subtipo. */}
        {descritor.campos.filter((campo) => !campo.autoDeNome && !campo.oculto && campo.tipo !== 'derivado' && campoDoGrupo(campo, form)).map((campo) => {
          const chave = campo.col + (campo.parte ? ':' + campo.parte : '');
          const el = (
          <CatalogoCampo key={chave} campo={campo}
            label={t[campo.rotuloKey] || campo.col}
            valor={valorDoCampo(campo)}
            onChange={(v) => onChangeCampo(campo, v)}
            disabled={!!(campo.somenteNovo && linha)}
            nomes={campo.tipo === 'lista' ? nomesPorFonte[campo.fonte] : undefined}
            refs={campo.tipo === 'referencia' ? refsPorFonte[campo.fonte] : undefined}
            equip={campo.tipo === 'equipamento' ? { catalogo: equipCatalogo, porSlug: equipPorSlug } : undefined}
            t={t}
          />
          );
          /* `meia` (26/09/2026): metade da linha — dois campos lado a lado. */
          /* `quarto` (26/09/2026): um quarto da linha — quatro lado a lado. */
          if (campo.largura === 'quarto') {
            return <div key={chave} className="catalogo-campo-quarto" data-campo={campo.col}>{el}</div>;
          }
          if (campo.largura === 'meia') {
            return <div key={chave} className="catalogo-campo-meia" data-campo={campo.col}>{el}</div>;
          }
          return campo.largura === 'curta'
            ? <div key={chave} className="catalogo-campo-curto" data-campo={campo.col}>{el}</div>
            : el;
        })}
      </div>
      {error && <div className="err-msg">{error}</div>}
    </ModalShell>
  );
}

Object.assign(window, { CatalogoEditor, slugDeNome, chaveLivre });
