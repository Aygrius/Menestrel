/* ============================================================
   LOJA — Lado Jogador (aba "Loja" do console)
   ============================================================
   Extraído de 07-inventario/inventario.jsx (arquivo grande demais).
   O "balcão do mercador": lista o estoque_loja da história em que o
   PJ é protagonista (RPC get_loja_pj) e compra com validação atômica
   no servidor (RPC comprar_item: moedas + capacidade + estoque).

   - LojaJogador         — vitrine (banner da mesa, seletor de PJ,
                           busca + chips de categoria, grid de itens)
   - CompraLojaModal     — modal de compra (padrão de modal da casa)
   - Helpers de preço:    precoMoedaTexto, moedasPorExtenso,
                          motivoCompraLabel, PrecoMoedas (módulo-locais)

   Depende de:
   - React (useState/useEffect/useMemo/useRef desestruturados)
   - supabaseClient + RPCs get_loja_pj / comprar_item
   - 01-core/inventario-helpers.jsx: MOEDA_ORDEM, latoesToMoedas
   - GLOBAIS de 07-inventario/inventario.jsx (carregado ANTES):
     fmtNum, calcCarga, invItemIcon, recipienteAceitaSlug, MoedaPills, MoedasBoard, CabecalhoInvLoja

   Consumidor no app.jsx: <LojaJogador /> (aba "Loja" do AdminConsole).

   ⚠️ Carregar SEMPRE depois de 07-inventario/inventario.jsx — os globais
   acima precisam existir no window antes desta tela renderizar.
   ============================================================ */

/* ============================== [22] LojaJogador — Aba "Loja" do perfil Jogador ============================== */
// Redesenho "balcão do mercador" (v2) + revisões (v3):
// - Banner da mesa (eyebrow MESA + título Cinzel) com seletor de PJ em dropdown
//   (substitui as inv-pj-tabs nesta aba; o inventário continua com as tabs).
// - Fontes: Lora (--font-body) em todo o texto; Cinzel SÓ em títulos
//   (título do banner e h3 do modal, que herda de `.modal h3`).
// - Moedas do PJ: MoedasBoard PADRÃO (o mesmo trilho do inventário).
// - Preço 0 latão = item gratuito ("Grátis"), no card e no modal.
// - Busca + chips de categoria (substituem os agrupamentos inv-bag-group).
// - Vitrine em grid única; estados: hover (CTA revelado), esgotado,
//   "moedas insuficientes" (preço vermelho + cadeado já no card).
// - CompraLojaModal segue o padrão de modal da casa (modal-close, h3 + subhead,
//   err-msg, footer com Cancelar à esquerda do botão principal) e escreve
//   valores por extenso ("121 moedas de ouro"), nunca "121o".
// Backend intocado: RPC get_loja_pj + comprar_item, optimistic update mantido.

// Preço em texto compacto (denominações não-zero abreviadas pela inicial:
// o/p/c/l · en: g/s/c/b). Ex.: 5234 latões → "5o 2p 3c 4l". Usado em tooltips
// e onde espaço é curto; o modal usa moedasPorExtenso.
function precoMoedaTexto(latao, lang) {
  const en = lang === 'en';
  const m = latoesToMoedas(Math.max(0, Math.round(latao || 0)));
  const suf = en ? { ouro: 'g', prata: 's', cobre: 'c', latao: 'b' }
                 : { ouro: 'o', prata: 'p', cobre: 'c', latao: 'l' };
  const parts = MOEDA_ORDEM.filter((t) => m[t] > 0).map((t) => `${m[t]}${suf[t]}`);
  return parts.length ? parts.join(' ') : `0${suf.latao}`;
}

// Valor por extenso pro modal de compra: "121 moedas de ouro, 3 de prata e
// 4 de cobre" (en: "121 gold coins, 3 silver and 4 copper"). 0 → "nenhuma moeda".
function moedasPorExtenso(latao, lang) {
  const en = lang === 'en';
  const m = latoesToMoedas(Math.max(0, Math.round(latao || 0)));
  const nomes = en
    ? { ouro: 'gold', prata: 'silver', cobre: 'copper', latao: 'brass' }
    : { ouro: 'ouro', prata: 'prata', cobre: 'cobre', latao: 'latão' };
  const parts = MOEDA_ORDEM.filter((t) => m[t] > 0);
  if (!parts.length) return en ? 'no coins' : 'nenhuma moeda';
  const frag = parts.map((t, i) => {
    const n = m[t].toLocaleString(en ? 'en-US' : 'pt-BR');
    if (en) return i === 0 ? `${n} ${nomes[t]} coin${m[t] > 1 ? 's' : ''}` : `${n} ${nomes[t]}`;
    return i === 0 ? `${n} moeda${m[t] > 1 ? 's' : ''} de ${nomes[t]}` : `${n} de ${nomes[t]}`;
  });
  if (frag.length === 1) return frag[0];
  return frag.slice(0, -1).join(', ') + (en ? ' and ' : ' e ') + frag[frag.length - 1];
}

// Pagamento EXATO sem troco: dá pra fechar `custoLatao` com as moedas que o PJ
// tem? Greedy do maior valor pro menor — espelha a RPC comprar_item.
function moedasFechamExato(custoLatao, held) {
  let need = Math.max(0, Math.round(custoLatao || 0));
  for (const [k, v] of [['ouro', 1000], ['prata', 100], ['cobre', 10], ['latao', 1]]) {
    const take = Math.min(Math.floor(need / v), Number(held?.[k] || 0));
    need -= take * v;
  }
  return need === 0;
}

// Rótulos dos motivos de erro da RPC comprar_item (i18n). Fica no escopo do
// módulo porque é usado tanto pela LojaJogador quanto pelo CompraLojaModal.
function motivoCompraLabel(motivo, info, lang) {
  if (lang === 'en') {
    const m = {
      sem_historia: 'No story for this character',
      item_nao_listado: 'Item not listed in this shop',
      item_nao_existe: 'Item not found',
      estoque_insuficiente: 'Out of stock',
      moedas_insuficientes: info?.custo_latao ? `Not enough coin (cost: ${info.custo_latao} brass)` : 'Not enough coin',
      espaco_insuficiente: info?.ocupa ? `Not enough space (needs ${info.ocupa}, free ${info.livre})` : 'Not enough space',
      recipiente_obrigatorio: 'Consumables and coins must go inside a container',
      moedas_nao_fecham: 'Your coins can’t make the exact price (no change given)',
      recipiente_invalido: 'Invalid container',
      tipo_incompativel: 'Container does not accept this item type',
      pj_nao_encontrado: 'Character not found',
      quantidade_invalida: 'Invalid quantity',
    };
    return m[motivo] || motivo;
  }
  const m = {
    sem_historia: 'Sem história para este personagem',
    item_nao_listado: 'Item não está mais à venda',
    item_nao_existe: 'Item não encontrado',
    estoque_insuficiente: 'Estoque esgotado',
    moedas_insuficientes: info?.custo_latao ? `Moedas insuficientes (custo: ${info.custo_latao} latão)` : 'Moedas insuficientes',
    espaco_insuficiente: info?.ocupa ? `Espaço insuficiente (precisa ${info.ocupa}, livre ${info.livre})` : 'Espaço insuficiente',
    recipiente_obrigatorio: 'Consumíveis e moedas precisam ir dentro de um recipiente',
    moedas_nao_fecham: 'Suas moedas não fecham o valor exato (sem troco)',
    recipiente_invalido: 'Recipiente inválido',
    tipo_incompativel: 'O recipiente não aceita esse tipo de item',
    pj_nao_encontrado: 'Personagem não encontrado',
    quantidade_invalida: 'Quantidade inválida',
  };
  return m[motivo] || motivo;
}

// ── PrecoMoedas — preço no padrão novo (pílulas MoedaPills) ───────────────────
// Preço 0 = item gratuito → pílula "Grátis". `mudo` apaga o tom (cards esgotados).
function PrecoMoedas({ latao, lang, mudo }) {
  return <MoedaPills latao={latao} lang={lang} mostrarGratis mudo={mudo} tamanho="sm" />;
}

// ── CompraLojaModal — modal de compra, no padrão de modal da casa ─────────────
// h3 (Cinzel via `.modal h3`) + subhead, corpo (descrição, stats, quantidade,
// recipientes), resumo por extenso, err-msg e footer com Cancelar à esquerda
// do botão principal. Validação por quantidade aqui; a final é da RPC.
function CompraLojaModal({ entry, cat, lang, totalLatao, moedasHeld, livreS, livreL, recipientes, comprando, erro, onConfirm, onClose }) {
  const en = lang === 'en';
  const [qtd, setQtd] = useState(1);
  const [recipienteId, setRecipienteId] = useState(() => {
    // Pré-seleciona quando só existe 1 recipiente compatível com espaço.
    const aptos = (recipientes || []).filter((r) => r.livre > 0);
    return aptos.length === 1 ? aptos[0].inst.instanceId : '';
  });

  const preco = entry.preco_latao_override != null ? Number(entry.preco_latao_override) : Number(cat.valor_latao || 0);
  const gratis = preco === 0;
  const stockNull = entry.estoque == null;
  const stockNum = stockNull ? Infinity : Number(entry.estoque);
  const maxByStock = stockNull ? 999 : stockNum;

  const isContainer = ehContainer(cat);
  const ehLiquido = cat.tipo === 'L';
  const livreDoTipo = ehLiquido ? livreL : livreS;
  const exigeRecip = cat.grupo === 'Consumíveis' || cat.grupo === 'Moedas';

  const ocupaTotal = (Number(cat.ocupa || 0)) * qtd;
  const custoTotal = preco * qtd;
  const sobraLatao = totalLatao - custoTotal;

  const recipienteEscolhido = (recipientes || []).find((r) => r.inst.instanceId === recipienteId) || null;
  const semRecipienteCompat = exigeRecip && (recipientes || []).length === 0;
  const faltaEscolherRecip = exigeRecip && !semRecipienteCompat && !recipienteEscolhido;
  const recipienteSemEspaco = exigeRecip && recipienteEscolhido && (ocupaTotal > recipienteEscolhido.livre + 0.0001);

  const semMoeda = totalLatao < custoTotal;
  const naoFecha = !gratis && !semMoeda && !moedasFechamExato(custoTotal, moedasHeld);
  const semEspaco = exigeRecip
    ? (semRecipienteCompat || recipienteSemEspaco)
    : (!isContainer && ocupaTotal > livreDoTipo);
  const semEstoque = stockNum < qtd;
  const desabilitado = semMoeda || naoFecha || semEspaco || semEstoque || faltaEscolherRecip || !!comprando;

  const motivos = [];
  if (semEspaco && !exigeRecip) motivos.push(en
    ? `Needs ${fmtNum(ocupaTotal)} ${ehLiquido ? 'liquid' : 'solid'} space, free ${fmtNum(livreDoTipo)}`
    : `Precisa de ${fmtNum(ocupaTotal)} de espaço ${ehLiquido ? 'líquido' : 'sólido'}, livre ${fmtNum(livreDoTipo)}`);
  if (faltaEscolherRecip) motivos.push(en ? 'Choose a container' : 'Escolha um recipiente');
  if (semRecipienteCompat) motivos.push(en ? 'No compatible container — buy one first' : 'Sem recipiente compatível — compre um antes');
  if (recipienteSemEspaco) motivos.push(en
    ? `Container needs ${fmtNum(ocupaTotal)}, free ${fmtNum(recipienteEscolhido.livre)}`
    : `Recipiente precisa de ${fmtNum(ocupaTotal)}, livre ${fmtNum(recipienteEscolhido.livre)}`);
  if (semEstoque) motivos.push(en ? `Only ${stockNum} left` : `Só ${stockNum} restante(s)`);
  if (naoFecha) motivos.push(en ? 'Your coins can’t make the exact price (no change)' : 'Suas moedas não fecham o valor exato (sem troco)');

  // Escape já é responsabilidade do ModalShell. Mantemos só o atalho Enter=confirmar aqui.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' && !desabilitado) onConfirm(qtd, exigeRecip ? recipienteId : null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [qtd, recipienteId, desabilitado, exigeRecip, onConfirm]);

  const dec = () => setQtd((q) => Math.max(1, q - 1));
  const inc = () => setQtd((q) => Math.min(maxByStock, q + 1));

  // Faixa de stats: só o que se aplica ao item (máx. 4).
  const stats = [];
  if (cat.dano != null) stats.push({ v: cat.dano, l: en ? 'Damage' : 'Dano' });
  if (cat.alcance) stats.push({ v: cat.alcance, l: en ? 'Range' : 'Alcance' });
  if (cat.absorcao) stats.push({ v: cat.absorcao, l: en ? 'Absorb' : 'Absorção' });
  if (isContainer) stats.push({ v: fmtNum(cat.armazena), l: en ? 'Stores' : 'Armazena' });
  if (cat.ocupa != null) stats.push({ v: fmtNum(cat.ocupa), l: en ? 'Takes' : 'Ocupa' });
  const statsVis = stats.slice(0, 4);

  const subhead = [
    cat.grupo || (en ? 'Other' : 'Outros'),
    `${en ? 'stock' : 'estoque'} ${stockNull ? '∞' : stockNum}`,
  ].join(' · ');

  return (
    <ModalShell
      title={<><i className={'ti ' + invItemIcon(cat) + ' det-title-ic'} aria-hidden="true" /> {cat.nome}</>}
      lang={lang}
      size="md"
      extraClass="modal-loja"
      onClose={onClose}
    >
          {(cat.descricao || cat.efeito) && (
            <p className="loja-ficha-desc">
              {cat.descricao}
              {cat.descricao && cat.efeito ? ' ' : ''}
              {cat.efeito && <em>{en ? 'Effect' : 'Efeito'}: {cat.efeito}</em>}
            </p>
          )}

          {(cat.descricao || cat.efeito) && <hr className="det-sec-divider" />}

          <div className="loja-qtd-row">
            <span className="loja-qtd-lbl">{en ? 'Quantity' : 'Quantidade'}</span>
            <span className="loja-qtd-val-lbl">
              {qtd} <span className="loja-qtd-max">{en ? 'of' : 'de'} {stockNull ? '∞' : maxByStock}</span>
            </span>
          </div>
          <div className="loja-qtd-ctrl">
            <button type="button" className="btn-icon btn-sm" onClick={dec} disabled={qtd <= 1} aria-label="−">−</button>
            <div
              className={'loja-qtd-bar fp-bar-track' + (stockNull ? ' is-infinito' : '')}
              role="slider"
              aria-label={en ? 'Quantity' : 'Quantidade'}
              aria-valuemin={1}
              aria-valuemax={stockNull ? undefined : maxByStock}
              aria-valuenow={qtd}
              tabIndex={stockNull ? -1 : 0}
              style={{ '--bar-c': '#C9A44E' }}
              onClick={(e) => {
                if (stockNull) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                const v = Math.round(1 + pct * (maxByStock - 1));
                setQtd(Math.max(1, Math.min(maxByStock, v)));
              }}
              onKeyDown={(e) => {
                if (stockNull) return;
                if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); inc(); }
                if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); dec(); }
              }}>
              {!stockNull && (
                <div className="loja-qtd-bar-fill fp-bar-fill" aria-hidden="true" style={{ width: `${maxByStock > 1 ? ((qtd - 1) / (maxByStock - 1)) * 100 : 100}%` }} />
              )}
            </div>
            <button type="button" className="btn-icon btn-sm" onClick={inc} disabled={qtd >= maxByStock} aria-label="+">+</button>
          </div>

          {exigeRecip && !semRecipienteCompat && (
            <div className="loja-recips">
              <div className="loja-recips-lbl">
                {en ? 'Store in' : 'Guardar em'}{' '}
                <span>({en ? `needs ${fmtNum(ocupaTotal)} free` : `precisa de ${fmtNum(ocupaTotal)} livre`})</span>
              </div>
              {(recipientes || []).map((r) => {
                const cabe = ocupaTotal <= r.livre + 0.0001;
                const sel = r.inst.instanceId === recipienteId;
                const pct = r.cap > 0 ? Math.min(100, Math.round(((r.cap - r.livre) / r.cap) * 100)) : 100;
                return (
                  <button
                    key={r.inst.instanceId}
                    type="button"
                    className={'loja-recip' + (sel ? ' sel' : '') + (cabe ? '' : ' off')}
                    disabled={!cabe}
                    onClick={() => setRecipienteId(sel ? '' : r.inst.instanceId)}>
                    <i className={'ti ' + (sel ? 'ti-circle-check' : 'ti-circle')} aria-hidden="true" />
                    <span className="loja-recip-nome">{r.nome}</span>
                    <span className="loja-recip-bar" aria-hidden="true">
                      <span className={'loja-recip-fill' + (cabe ? '' : ' cheio')} style={{ width: pct + '%' }} />
                    </span>
                    <span className={'loja-recip-livre' + (cabe ? '' : ' off')}>
                      {fmtNum(r.livre)} {en ? 'free' : 'livre'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="loja-resumo">
            <div className="loja-resumo-row">
              <span>{en ? 'Unit price' : 'Preço unitário'}</span>
              {gratis
                ? <strong className="gratis">{en ? 'Free' : 'Gratuito'}</strong>
                : <strong className="total"><MoedaPills latao={preco} lang={lang} tamanho="sm" /></strong>}
            </div>
            <div className="loja-resumo-row">
              <span>{en ? `Total (${qtd})` : `Total (${qtd})`}</span>
              {gratis
                ? <strong className="gratis">{en ? 'Free' : 'Gratuito'}</strong>
                : <strong className="total"><MoedaPills latao={custoTotal} lang={lang} tamanho="sm" /></strong>}
            </div>
            <div className="loja-resumo-row">
              <span>{en ? 'You have' : 'Você tem'}</span>
              <strong><MoedaPills latao={totalLatao} lang={lang} mostrarGratis tamanho="sm" /></strong>
            </div>
          </div>

          {(motivos.length > 0 || erro) && (
            <div className="err-msg">
              {erro ? motivoCompraLabel(erro.motivo, erro.info, lang) : motivos.join(' · ')}
            </div>
          )}

          <div className="det-act-row">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={!!comprando}>
              {en ? 'Cancel' : 'Cancelar'}
            </button>
            <button type="button" className="btn-primary" onClick={() => onConfirm(qtd, exigeRecip ? recipienteId : null)} disabled={desabilitado}>
              {comprando ? <i className="ti ti-loader" aria-hidden="true" /> : (en ? 'Buy' : 'Comprar')}
            </button>
          </div>
    </ModalShell>
  );
}

// Lista o estoque_loja da história em que o PJ é protagonista (via RPC).
// Compra valida moedas e capacidade no servidor (RPC comprar_item).
function LojaJogador({ ac, lang, currentUserId, pjIdFixo }) {
  const { Input } = (typeof UI !== 'undefined' ? UI : {});
  const en = lang === 'en';
  const [pjs, setPjs] = useState(null);
  const [selectedId, setSelectedId] = useState(pjIdFixo || null);
  const [catalogo, setCatalogo] = useState(null);
  const [loja, setLoja] = useState(null);          // { ok, historia_id, historia_titulo, estoque } | { ok:false, motivo }
  const [busca, setBusca] = useState('');
  const [grupoSel, setGrupoSel] = useState(null);  // null = todos
  const [comprando, setComprando] = useState(null); // entryId em compra (loading)
  const [compraAberta, setCompraAberta] = useState(null); // entryId do popup de compra
  const [erroCompra, setErroCompra] = useState(null);
  const [feedback, setFeedback] = useState(null);  // mensagem de sucesso temporária
  const [error, setError] = useState(null);
  const [tip, abrirTip, fecharTip, manterTip] = (window.usePortalTooltip || useTooltip)(80);
  // Mesmo hook do inventário (07-inventario/inventario.jsx carrega ANTES da loja,
  // garantido pela ordem de import no main.tsx, então window.useGridDimensions
  // sempre existe). Callback ref + medição contra .mc-main = comportamento
  // idêntico ao inventário, robusto ao mount async do grid (após get_loja_pj).
  const [setGridEl, lojaGridDims] = window.useGridDimensions();
  const lojaGridCols  = lojaGridDims.cols;
  const lojaGridTotal = lojaGridDims.totalSlots;

  // Carregar APENAS o personagem-alvo (a ficha aberta) + catálogo.
  // O alvo é pjIdFixo (loja aberta a partir de uma ficha) ou, na ausência
  // dele, o pj_ativo_id do perfil (a ficha que está sendo editada).
  useEffect(() => {
    if (!currentUserId) return;
    (async () => {
      let alvoId = pjIdFixo || null;
      if (!alvoId) {
        const { data: perfil } = await supabaseClient
          .from('profiles').select('pj_ativo_id').eq('id', currentUserId).single();
        alvoId = perfil?.pj_ativo_id || null;
      }
      const [itRes, pjRes] = await Promise.all([
        fetchCatalogoCompleto(),
        alvoId
          ? supabaseClient.from('personagens').select('id,nome,sobrenome,raca,profissao,forca_base,fisico_base,inventario').eq('id', alvoId).single()
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (itRes.error) { setError(itRes.error.message); setCatalogo([]); return; }
      if (pjRes.error) { setError(pjRes.error.message); setPjs([]); return; }
      setCatalogo(itRes.data || []);
      setPjs(pjRes.data ? [pjRes.data] : []);
      setSelectedId(alvoId);
    })();
  }, [currentUserId, pjIdFixo]);

  const recarregarLoja = async (pjId) => {
    if (!pjId) return;
    const { data, error } = await supabaseClient.rpc('get_loja_pj', { p_pj_id: pjId });
    if (error) {
      console.error('[loja] get_loja_pj falhou:', error);
      setLoja({ ok: false, motivo: error.message });
    } else {
      setLoja(data);
    }
  };

  useEffect(() => { recarregarLoja(selectedId); }, [selectedId]);

  const recarregarPj = async (pjId) => {
    const { data } = await supabaseClient
      .from('personagens')
      .select('id,nome,sobrenome,raca,profissao,forca_base,fisico_base,inventario')
      .eq('id', pjId)
      .single();
    if (data) {
      setPjs((arr) => (arr || []).map((p) => p.id === pjId ? data : p));
    }
  };

  const catalogoBySlug = useMemo(() => {
    const map = {};
    (catalogo || []).forEach((it) => { map[it.slug] = it; });
    return map;
  }, [catalogo]);

  const pjSelecionado = pjs?.find((p) => p.id === selectedId);
  const inventario = pjSelecionado?.inventario || { itens: [] };
  const itensInv = Array.isArray(inventario.itens) ? inventario.itens : [];
  // Moedas agora são ITENS (grupo 'Moedas'). Riqueza e exibição saem dos
  // itens-moeda, agrupados por valor_latao (junta os vários slugs por valor).
  const moedas = useMemo(() => {
    const m = { ouro: 0, prata: 0, cobre: 0, latao: 0 };
    for (const it of itensInv) {
      const c = catalogoBySlug[it.slug];
      if (!c || c.grupo !== 'Moedas') continue;
      const v = Number(c.valor_latao || 0), q = Number(it.quantidade || 1);
      if (v === 1000) m.ouro += q; else if (v === 100) m.prata += q;
      else if (v === 10) m.cobre += q; else if (v === 1) m.latao += q;
    }
    return m;
  }, [itensInv, catalogoBySlug]);
  const totalLatao = useMemo(() => moedasToLatao(moedas), [moedas]);

  // Espaço usado / capacidade (espelha lógica do InventarioList, separando S/L)
  const { usadoS, capS, usadoL, capL, espacoUsado, capacidadeTotal } = useMemo(() => {
    let uS = 0, cS = 0, uL = 0, cL = 0;
    for (const it of (inventario.itens || [])) {
      const cat = catalogoBySlug[it.slug];
      if (!cat) continue;
      if (ehContainer(cat)) {
        const tipoAceito = cat.tipo === 'L' ? 'L' : 'S';
        const armazena = Number(cat.armazena) * (it.quantidade || 1);
        if (tipoAceito === 'L') cL += armazena;
        else                    cS += armazena;
      } else if (!it.containerId && !it.equipado && !it.vestido) {
        if (cat.ocupa != null) {
          const ocupa = Number(cat.ocupa) * (it.quantidade || 1);
          if (cat.tipo === 'L') uL += ocupa;
          else                  uS += ocupa;
        }
      }
    }
    return {
      usadoS: uS, capS: cS,
      usadoL: uL, capL: cL,
      espacoUsado: uS + uL,
      capacidadeTotal: cS + cL,
    };
  }, [inventario, catalogoBySlug]);

  const espacoLivre = Math.max(0, capacidadeTotal - espacoUsado);
  const livreS = Math.max(0, capS - usadoS);
  const livreL = Math.max(0, capL - usadoL);

  // Peso/carga (barra abaixo do trilho de moedas). Independe do controle de
  // armazenamento S/L acima — esse continua gateando a compra (livreS/livreL).
  const carga = useMemo(
    () => calcCarga(inventario?.itens, catalogoBySlug, pjSelecionado?.forca_base, pjSelecionado?.fisico_base),
    [inventario, catalogoBySlug, pjSelecionado]
  );

  // Recipientes do PJ compatíveis (mesmo tipo S/L + tipo_item, quando o
  // recipiente restringe por grupo) com um item da loja, com o espaço livre
  // e a capacidade total de cada um (barra do card de recipiente).
  const recipientesCompativeis = (itemCat) => {
    const tipoItem = itemCat?.tipo === 'L' ? 'L' : 'S';
    return (inventario.itens || [])
      .filter((it) => {
        const c = catalogoBySlug[it.slug];
        if (!ehContainer(c)) return false;
        if ((c.tipo === 'L' ? 'L' : 'S') !== tipoItem) return false;
        // tipo_item: recipiente só aceita itens do grupo declarado (se houver).
        if (c.tipo_item && itemCat?.grupo !== c.tipo_item) return false;
        // Recipiente líquido só guarda um tipo por vez.
        return recipienteAceitaSlug(it, itemCat.slug, inventario.itens, catalogoBySlug);
      })
      .map((it) => {
        const { livre, armazena } = capacidadeContainer(it, inventario.itens, catalogoBySlug);
        return { inst: it, nome: catalogoBySlug[it.slug]?.nome || it.slug, livre, cap: armazena };
      });
  };

  const comprar = async (entryId, slug, containerId, qtdParam) => {
    setErroCompra(null);
    setFeedback(null);
    const qtd = Math.max(1, qtdParam || 1);
    setComprando(entryId);
    const { data, error } = await supabaseClient.rpc('comprar_item', {
      p_pj_id: selectedId,
      p_entry_id: entryId,
      p_quantidade: qtd,
      p_container_id: containerId || null,
    });
    setComprando(null);
    if (error || !data?.ok) {
      const motivo = data?.motivo || error?.message || 'erro_desconhecido';
      setErroCompra({ entryId, motivo, info: data });
      return;
    }
    // Optimistic update: decrementa o estoque local IMEDIATAMENTE pra
    // o card refletir o novo estado sem esperar o roundtrip. Estoque
    // null = infinito, não decrementa. O `recarregarLoja` abaixo roda
    // depois como safety net (sobrescreve com a verdade do servidor).
    setLoja((prev) => {
      if (!prev?.ok || !Array.isArray(prev.estoque)) return prev;
      return {
        ...prev,
        estoque: prev.estoque.map((entry) => {
          if (entry.entryId !== entryId) return entry;
          if (entry.estoque == null) return entry;
          return { ...entry, estoque: Math.max(0, Number(entry.estoque) - qtd) };
        }),
      };
    });

    // Sucesso: recarrega PJ + loja (canonicaliza com o servidor)
    await recarregarPj(selectedId);
    await recarregarLoja(selectedId);
    setCompraAberta(null);
    const nome = catalogoBySlug[slug]?.nome || slug;
    setFeedback(en ? `Bought ${qtd} ${nome}.` : `Você comprou ${qtd} ${nome}.`);
    setTimeout(() => setFeedback(null), 2500);
  };

  // ── Render ────────────────────────────────────────────────
  if (pjs === null || catalogo === null) {
    return <div className="admin-loading"><span>{en ? 'Opening the shop…' : 'Abrindo a loja…'}</span></div>;
  }
  if (error) {
    return (
      <div className="admin-error">
        <div className="err-msg">{error}</div>
      </div>
    );
  }
  if (pjs.length === 0) {
    return (
      <div className="pjs-empty">
        {en ? 'Open a character\'s sheet to enter its shop' : 'Abra a ficha de um personagem para acessar a loja dele'}
      </div>
    );
  }

  const semHistoria = loja && loja.ok === false && loja.motivo === 'sem_historia';
  const estoqueLoja = (loja?.ok && Array.isArray(loja.estoque)) ? loja.estoque : [];

  // Entradas válidas (com catálogo), grupos com contagem e filtro busca+chip
  const normTxt = (s) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const entradas = estoqueLoja.filter((e) => catalogoBySlug[e.slug]);
  const grupos = (() => {
    const m = new Map();
    for (const e of entradas) {
      const g = catalogoBySlug[e.slug].grupo || (en ? 'Other' : 'Outros');
      m.set(g, (m.get(g) || 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  })();
  const q = normTxt(busca);
  const visiveis = entradas.filter((e) => {
    const cat = catalogoBySlug[e.slug];
    const g = cat.grupo || (en ? 'Other' : 'Outros');
    if (grupoSel && g !== grupoSel) return false;
    if (q && !normTxt(cat.nome).includes(q)) return false;
    return true;
  });

  return (
    <div className="loja">

      {/* ── Peso + Moedas: MESMO padrão do inventário (sem título da mesa) ── */}
      <CabecalhoInvLoja moedas={moedas} carga={carga} lang={lang} />

      {feedback && <div className="loja-feedback">{feedback}</div>}

      {loja === null ? (
        <div className="admin-loading"><span>{en ? 'Opening the shop…' : 'Abrindo a loja…'}</span></div>
      ) : (semHistoria || estoqueLoja.length === 0) ? (
        <div className="loja-warn-empty">
          <span>{en
            ? 'The Game Master has not listed any items yet'
            : 'O mestre ainda não disponibilizou itens à venda'}</span>
        </div>
      ) : (
        <>
          {/* ── Busca + chips de categoria — mesmo padrão best-toolbar do bestiário ── */}
          <div className="best-toolbar">
            <div className="best-search">
              <Input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={en ? 'Search' : 'Buscar…'}
              />
            </div>
            <div className="best-chips">
              <button
                type="button"
                className={'best-chip best-chip--icon' + (grupoSel === null ? ' is-active' : '')}
                onClick={() => setGrupoSel(null)}
                onMouseEnter={(e) => abrirTip(e, { desc: en ? 'All' : 'Todos' })}
                onMouseLeave={fecharTip}
                aria-label={en ? 'All' : 'Todos'}>
                <i className="ti ti-layout-grid" aria-hidden="true" />
              </button>
              {grupos.map(([g, n]) => (
                <button
                  key={g}
                  type="button"
                  className={'best-chip best-chip--icon' + (grupoSel === g ? ' is-active' : '')}
                  onClick={() => setGrupoSel(grupoSel === g ? null : g)}
                  onMouseEnter={(e) => abrirTip(e, { desc: g })}
                  onMouseLeave={fecharTip}
                  aria-label={g}>
                  <i className={'ti ' + invItemIcon({ grupo: g })} aria-hidden="true" />
                </button>
              ))}
            </div>
            <div className="best-count">{visiveis.length} de {entradas.length}</div>
          </div>

          {/* ── Vitrine — grid com ref sempre montado (mesmo padrão do inventário) ── */}
          {(() => {
            const filled = visiveis.length;
            const total  = Math.max(lojaGridTotal, Math.ceil(Math.max(filled, 1) / lojaGridCols) * lojaGridCols);
            const ghosts = total - filled;
            return (
              <div
                ref={setGridEl}
                className="loja-grid loja-grid--slots rpg-grid--slots"
                style={{ gridTemplateColumns: `repeat(${lojaGridCols}, 50px)` }}>
                {visiveis.map((entry) => {
                  const cat = catalogoBySlug[entry.slug];
                  const preco = entry.preco_latao_override != null ? Number(entry.preco_latao_override) : Number(cat.valor_latao || 0);
                  const stockNull = entry.estoque == null;
                  const stockNum = stockNull ? Infinity : Number(entry.estoque);
                  const esgotado = !stockNull && stockNum <= 0;
                  const semMoeda = !esgotado && totalLatao < preco;
                  const tipLoja = {
                    title: cat.nome,
                    hint: esgotado ? (en ? 'Out of stock' : 'Esgotado') : semMoeda ? (en ? 'Not enough coin' : 'Moedas insuficientes') : null,
                  };
                  return (
                    <button
                      key={entry.entryId}
                      type="button"
                      className={'loja-it' + (esgotado ? ' is-esgotado' : '') + (semMoeda ? ' sem-moeda' : '') + (cat?.magico ? ' loja-it--magico' : '')}
                      disabled={esgotado}
                      onMouseEnter={(e) => abrirTip(e, tipLoja)}
                      onMouseLeave={fecharTip}
                      onClick={() => { fecharTip(); setErroCompra(null); setCompraAberta(entry.entryId); }}>
                      <span className="loja-it-head">
                        <span className="loja-it-tile"><i className={'ti ' + invItemIcon(cat)} aria-hidden="true" /></span>
                      </span>
                    </button>
                  );
                })}
                {Array.from({ length: ghosts }).map((_, i) => (
                  <span key={'ghost-' + i} className="inv-slot-ghost" aria-hidden="true" />
                ))}
              </div>
            );
          })()}
        </>
      )}

      {window.PortalTooltip
        ? <window.PortalTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
        : <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />}

      {compraAberta && (() => {
        const entry = estoqueLoja.find((e) => e.entryId === compraAberta);
        const cat = entry ? catalogoBySlug[entry.slug] : null;
        if (!entry || !cat) return null;
        const exigeRecip = cat.grupo === 'Consumíveis' || cat.grupo === 'Moedas';
        return (
          <CompraLojaModal
            entry={entry}
            cat={cat}
            lang={lang}
            totalLatao={totalLatao}
            moedasHeld={moedas}
            livreS={livreS}
            livreL={livreL}
            recipientes={exigeRecip ? recipientesCompativeis(cat) : []}
            comprando={comprando === entry.entryId}
            erro={erroCompra?.entryId === entry.entryId ? erroCompra : null}
            onConfirm={(qtd, recipienteId) => comprar(entry.entryId, entry.slug, recipienteId || null, qtd)}
            onClose={() => { setCompraAberta(null); setErroCompra(null); }}
          />
        );
      })()}
    </div>
  );
}


Object.assign(window, {
  LojaJogador, CompraLojaModal,
});