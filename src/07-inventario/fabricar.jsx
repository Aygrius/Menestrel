/* ============================================================
   [07] FABRICAR — a bancada do personagem
   ============================================================
   Pedido do usuário (06/10/2026):
     "Teremos um novo menu 'Fabricar', com todos os possíveis itens a serem
      fabricados, com sua 'receita' e itens necessários para o preparo."
     "Teste falho consome os materiais."

   A tela é a VITRINE DA LOJA virada do avesso: mesma grade de casas
   (.loja-grid--slots), mesma busca e mesmos chips de grupo, mesmo card de
   ícone — porque é o mesmo gesto (procurar uma coisa numa lista grande e
   abrir), e duas telas que fazem o mesmo gesto não devem ter desenhos
   diferentes. O que muda é a moeda: aqui não se paga em latão, paga-se em
   material e num teste de habilidade.

   O CARD diz, sem abrir: o ícone do item e o estado da receita — pronta
   (ouro), sem material (apagada) ou sem a habilidade (apagada com cadeado). A
   JANELA diz o resto: a receita linha por linha, com "tem/precisa" em cada
   material, a habilidade exigida, a dificuldade e os dias de construção.

   QUEM ESCREVE: esta tela não grava nada. Devolve a intenção pelo
   `onFabricar(receita)` e a ficha é quem rola o d20 (RolagemD20Overlay, que já
   mora lá), paga os materiais e grava o inventário por salvarItensFicha. Um
   escritor só do inventário — a razão é a mesma de sempre: a cópia da ficha
   pode estar velha, e dois escritores se atropelam.

   As regras puras — o que a receita pede, o que o personagem tem, o custo da
   tentativa e o prazo — moram em 01-core/fabricacao.jsx.
   ============================================================ */

function FabricarView({
  itens, catalogoBySlug, receitas, pjHabilidades, habsByKey, dataJogo, lang,
  // (receita) → a ficha rola o teste e resolve. Ausente = só leitura.
  onFabricar,
  // O resultado da última tentativa, para a tela dizer o que aconteceu:
  // { ok, sucesso, nome, motivo? }
  resultado,
}) {
  const en = lang === 'en';
  const [busca, setBusca] = useState('');
  const [grupoSel, setGrupoSel] = useState(null);
  const [aberta, setAberta] = useState(null);     // resultado_slug da janela
  const [tip, abrirTip, fecharTip, manterTip] = usePortalTooltip(60);
  const [setGridEl, { cols, totalSlots }] = useGridDimensions();

  const { Input } = (typeof UI !== 'undefined' ? UI : {});
  const normTxt = (s) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const q = normTxt(busca);

  /* As receitas que o catálogo conhece, já casadas com o item que produzem.
     Receita cujo item saiu do catálogo é ignorada: sem nome e sem ícone, ela
     seria uma casa vazia clicável.

     E ataque natural não entra na bancada (06/10/2026, pedido do usuário:
     "Coice, Mordida, etc não podem ser fabricados") — ehAtaqueNatural diz
     quais, e por quê, em 01-core/fabricacao.jsx. As linhas já saíram do banco;
     este filtro é para elas não voltarem pela próxima re-geração do catálogo. */
  const natural = window.ehAtaqueNatural || (() => false);
  const lista = useMemo(() => (receitas || [])
    .map((r) => ({ r, cat: catalogoBySlug[r.resultado_slug] }))
    .filter((x) => x.cat && !natural(x.cat))
    .sort((a, b) => String(a.cat.nome).localeCompare(String(b.cat.nome), 'pt-BR')),
  [receitas, catalogoBySlug]);

  // O estado de cada receita, calculado uma vez: é ele que pinta o card.
  const comEstado = useMemo(() => lista.map((x) => ({
    ...x,
    estado: (window.podeFabricar || (() => ({ ok: false })))(x.r, itens, pjHabilidades),
  })), [lista, itens, pjHabilidades]);

  const grupos = useMemo(() => {
    const m = new Map();
    comEstado.forEach((x) => {
      const g = x.cat.grupo || (en ? 'Other' : 'Outros');
      m.set(g, (m.get(g) || 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
  }, [comEstado, en]);

  const visiveis = comEstado.filter((x) => {
    if (q && !(typeof itemCasaBusca === 'function' ? itemCasaBusca(x.cat, q) : normTxt(x.cat.nome).includes(q))) return false;
    if (grupoSel && (x.cat.grupo || '') !== grupoSel) return false;
    return true;
  });

  const nomeDaHab = (key) => {
    const h = (habsByKey || {})[key];
    return (h && h.nome) || key;
  };
  const nomeDoMaterial = (slug) => {
    const c = catalogoBySlug[slug];
    return (c && c.nome) || slug;
  };
  const difLabel = (cod) => {
    const d = (window.RESULTADOS_ACAO || []).find((x) => x.codigo === cod);
    return d ? (en ? d.en : d.pt) : cod;
  };
  const icone = (cat) => (window.invItemIcon || (() => 'ti-box'))(cat);
  const iconeGrupo = (g) => {
    const mapa = window.ICONE_POR_GRUPO || {};
    const norm = window.normalizar || ((t) => String(t || '').toLowerCase());
    return mapa[norm(g)] || 'ti-box';
  };

  // O motivo, em texto de gente, para o tooltip do card e para a janela.
  const motivoLabel = (estado) => {
    if (!estado || estado.ok) return null;
    if (estado.motivo === 'sem_habilidade') return en ? 'You lack the required skill.' : 'Falta a habilidade exigida.';
    if (estado.motivo === 'sem_material') return en ? 'Not enough materials.' : 'Material insuficiente.';
    return en ? 'This cannot be crafted.' : 'Isto não se fabrica.';
  };

  const abertaX = aberta ? comEstado.find((x) => x.r.resultado_slug === aberta) : null;

  const gridCols = Math.max(1, cols || 13);
  const filled = visiveis.length;
  const total = Math.max(totalSlots || 0, Math.ceil(Math.max(filled, 1) / gridCols) * gridCols);

  return (
    <div className="loja fabricar">
      {/* A faixa de aviso no topo SAIU em 06/10/2026 (pedido do usuário:
          "remova esse texto em fabricar"). A regra do custo continua escrita
          onde ela é decisão — na janela da receita, ao lado do botão
          Fabricar —, e não repetida no alto de uma tela que o jogador abre
          dezenas de vezes. */}
      {resultado && (
        <div className={'loja-feedback' + (resultado.sucesso ? '' : ' loja-feedback--erro')} role="status">
          {resultado.sucesso
            ? (en ? `${resultado.nome} is on the workbench.` : `${resultado.nome} está na bancada.`)
            : (en ? `${resultado.nome} failed: the materials are gone.`
                  : `${resultado.nome} falhou: o material foi perdido.`)}
        </div>
      )}

      {/* A MESMA barra da mochila e da loja (.best-toolbar): busca à esquerda,
          chips de grupo e a contagem. */}
      <div className="best-toolbar">
        <div className="best-search loja-busca">
          <i className="ti ti-filter-2 busca-ic" aria-hidden="true" />
          {Input ? (
            <Input type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder={en ? 'Search recipes' : 'Buscar receitas'}
              aria-label={en ? 'Search recipes' : 'Buscar receitas'} />
          ) : (
            <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder={en ? 'Search recipes' : 'Buscar receitas'}
              aria-label={en ? 'Search recipes' : 'Buscar receitas'} />
          )}
        </div>
        {/* Os MESMOS chips de ícone da mochila e da loja (best-chip--icon,
            is-active, ICONE_POR_GRUPO): três telas, um filtro. */}
        <div className="best-chips">
          <button type="button"
            className={'best-chip best-chip--icon' + (grupoSel === null ? ' is-active' : '')}
            onClick={() => setGrupoSel(null)}
            onMouseEnter={(e) => abrirTip(e, { desc: en ? 'All' : 'Todos' })}
            onMouseLeave={fecharTip}
            aria-label={en ? 'All' : 'Todos'}>
            <i className="ti ti-layout-grid" aria-hidden="true" />
          </button>
          {grupos.map(([g, n]) => (
            <button key={g} type="button"
              className={'best-chip best-chip--icon' + (grupoSel === g ? ' is-active' : '')}
              onClick={() => setGrupoSel(grupoSel === g ? null : g)}
              onMouseEnter={(e) => abrirTip(e, { desc: `${g} · ${n}` })}
              onMouseLeave={fecharTip}
              aria-label={g}>
              <i className={'ti ' + (iconeGrupo(g) || 'ti-box')} aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="best-count">{visiveis.length} de {comEstado.length}</div>
      </div>

      {comEstado.length === 0 ? (
        <div className="loja-warn-empty">
          {/* O mesmo ícone da aba (ti-article, escolha do usuário): o estado
              vazio é a mesma tela, só sem conteúdo. */}
          <i className="ti ti-article" aria-hidden="true" />
          <span>{en ? 'No recipes yet.' : 'Ainda não há receitas.'}</span>
        </div>
      ) : (
        <div ref={setGridEl} className="loja-grid loja-grid--slots rpg-grid--slots"
          style={{ gridTemplateColumns: `repeat(${gridCols}, 50px)` }}>
          {visiveis.map(({ r, cat, estado }) => {
            const trava = !estado.ok;
            const semHab = estado.motivo === 'sem_habilidade';
            return (
              <button key={r.resultado_slug} type="button"
                data-receita={r.resultado_slug}
                className={'loja-it fab-it' + (trava ? ' is-esgotado' : '')
                  + (cat.magico ? ' loja-it--magico' : '')}
                onMouseEnter={(e) => abrirTip(e, {
                  title: cat.nome,
                  desc: `${nomeDaHab(r.habilidade_key)} · ${difLabel(r.dificuldade)} · ${r.dias} ${
                    r.dias === 1 ? (en ? 'day' : 'dia') : (en ? 'days' : 'dias')}`,
                  hint: motivoLabel(estado),
                })}
                onMouseLeave={fecharTip}
                onClick={() => { fecharTip(); setAberta(r.resultado_slug); }}>
                <span className="loja-it-head">
                  <span className="loja-it-tile"><i className={'ti ' + icone(cat)} aria-hidden="true" /></span>
                </span>
                {semHab && (
                  <span className="fab-it-trava" aria-hidden="true"><i className="ti ti-lock" /></span>
                )}
              </button>
            );
          })}
          {Array.from({ length: Math.max(0, total - filled) }).map((_, i) => (
            <span key={'ghost-' + i} className="inv-slot-ghost" aria-hidden="true" />
          ))}
        </div>
      )}

      {abertaX && (
        <ReceitaModal
          receita={abertaX.r}
          cat={abertaX.cat}
          estado={abertaX.estado}
          itens={itens}
          catalogoBySlug={catalogoBySlug}
          nomeDaHab={nomeDaHab}
          nomeDoMaterial={nomeDoMaterial}
          difLabel={difLabel}
          motivoLabel={motivoLabel}
          lang={lang}
          onClose={() => setAberta(null)}
          onFabricar={onFabricar ? () => { setAberta(null); onFabricar(abertaX.r); } : null}
        />
      )}
      <PortalTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </div>
  );
}

/* A JANELA DA RECEITA — "com sua 'receita' e itens necessários para o preparo".
   Uma linha por material, com tem/precisa: é a pergunta que o jogador faz, e
   responder com "falta material" sem dizer QUAL seria meio caminho. */
function ReceitaModal({
  receita, cat, estado, itens, catalogoBySlug, nomeDaHab, nomeDoMaterial,
  difLabel, motivoLabel, lang, onClose, onFabricar,
}) {
  const en = lang === 'en';
  const mats = (window.materiaisDaReceita || (() => []))(receita);
  const disp = window.materialDisponivel || (() => 0);
  const Shell = (typeof ModalShell !== 'undefined' && ModalShell) || window.ModalShell;
  if (!Shell) return null;

  const corpo = (
    <>
      {cat.descricao && <div className="det-desc">{cat.descricao}</div>}

      <div className="fab-receita">
        <div className="fab-receita-topo">
          <span className="fab-receita-hab">
            <i className="ti ti-school" aria-hidden="true" />
            {nomeDaHab(receita.habilidade_key)} · {difLabel(receita.dificuldade)}
          </span>
          <span className="fab-receita-tempo">
            <i className="ti ti-hourglass" aria-hidden="true" />
            {receita.dias} {receita.dias === 1 ? (en ? 'day' : 'dia') : (en ? 'days' : 'dias')}
          </span>
        </div>

        <ul className="fab-mats">
          {mats.map((m) => {
            const tem = disp(itens, m.slug);
            const falta = tem < m.qtd;
            return (
              <li key={m.slug} className={'fab-mat' + (falta ? ' is-falta' : '')}>
                <i className={'ti ' + ((window.invItemIcon || (() => 'ti-box'))(catalogoBySlug[m.slug]))} aria-hidden="true" />
                <span className="fab-mat-nome">{nomeDoMaterial(m.slug)}</span>
                <span className="fab-mat-conta">
                  <strong>{tem}</strong>
                  <span className="fab-mat-barra">/</span>
                  {m.qtd}
                </span>
              </li>
            );
          })}
        </ul>

        {/* A regra do custo, à vista e sempre — é a que surpreende. */}
        <p className="fab-receita-nota">
          {en
            ? 'The materials are spent on the attempt: if the roll fails, they are lost anyway.'
            : 'O material é gasto na tentativa: se o teste falhar, ele se perde do mesmo jeito.'}
        </p>

        {!estado.ok && (
          <div className="err-msg" role="alert">{motivoLabel(estado)}</div>
        )}
      </div>
    </>
  );

  /* Rodapé pelo contrato do ModalShell (onCancel à esquerda, onConfirm à
     direita). Sem onFabricar — Mestre olhando ficha alheia —, a janela é só
     leitura e não ganha rodapé nenhum. */
  return (
    <Shell
      title={<><i className={'ti ' + ((window.invItemIcon || (() => 'ti-box'))(cat)) + ' det-title-ic'} aria-hidden="true" /> {cat.nome}</>}
      lang={lang}
      size="md"
      extraClass="modal-detalhes"
      onClose={onClose}
      {...(onFabricar ? {
        onCancel: onClose,
        onConfirm: onFabricar,
        confirmLabel: en ? 'Craft' : 'Fabricar',
        confirmDisabled: !estado.ok,
      } : {})}
    >
      {corpo}
    </Shell>
  );
}

Object.assign(window, { FabricarView, ReceitaModal });
