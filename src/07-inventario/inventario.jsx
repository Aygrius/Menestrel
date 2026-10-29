/* ============================================================
   INVENTÁRIO — Lado Jogador (aba "Inventário" do console)
   ============================================================
   Tudo que o Jogador faz com itens, moedas e equipamento.
   (A aba "Loja" foi extraída para 07-inventario/loja.jsx.)

   - InventarioList      — orquestrador: lista PJs, carrega catálogo
                           e inventário JSONB, autosave 450ms
   - MoedaPills / CabecalhoInvLoja
                         — exibição de moedas { ouro, prata, cobre, latao }
   - EquipadoBoard / VestesBoard — slots de equipamento e vestimenta
   - InvItemsTable       — tabela de itens (qtd, equipar, container, ...)
   - DetStat / DetalhesItemModal — detalhe + ações (equipar/desequipar,
                           usar, destruir, mover, transferir via transfer_item)
   - ContainerModal      — visualiza/remove itens de um container
   - QuantidadeModal     — escolha de quantidade (usar/destruir/mover/transferir)
   - Helpers de carga/ícone: calcCarga, invItemIcon, fmtNum, normalizarPilhas

   Depende de:
   - React (useState/useEffect/useMemo/useRef desestruturados)
   - supabaseClient (01-core/supabase.jsx)
   - Helpers do 01-core/inventario-helpers.jsx:
     MOEDA_ORDEM, moedasToLatao, latoesToMoedas, SLOT_LABELS,
     getMaosRequeridas, getSlotsState, novoInstanceId,
     ehContainer, capacidadeContainer, podeMoverParaContainer,
     aplicarEfeitosItem (efeito_positivo/efeito_negativo do catálogo)
   - Icon (ainda no app.jsx, resolvido em runtime)

   Prop NOVA em InventarioList: `maximos` (opcional) = { ef, eh, ka, ar },
   os máximos derivados da ficha (calcularFicha, em 11-ficha/ficha.jsx).
   Usado só pro clamp de teto ao aplicar efeito_positivo/negativo de item
   em estado_atual.vitalidade. Sem essa prop, vitalidade não tem teto
   (Infinity) — o clamp de PISO (nunca < 0) continua valendo sempre.

   Expõe no window (além dos componentes consumidos pelo app.jsx):
   fmtNum, calcCarga, invItemIcon, MoedaPills, CabecalhoInvLoja
   — usados também pela Loja (07-inventario/loja.jsx), que carrega DEPOIS.

   Carregar depois de 01-core/inventario-helpers.jsx e ANTES de
   07-inventario/loja.jsx (que consome os globais acima).
   ============================================================ */



/* ============================================================
   [06] INVENTÁRIO
   ============================================================ */

// ── PortalTooltip — tooltip standalone com createPortal ──────────────────────
// Usado pelo EquipadoBoard e CabecalhoInvLoja como alternativa segura ao
// Tooltip/useTooltip global (que pode não estar disponível ou ser bloqueado
// por overflow:hidden/transform de ancestrais). Renderiza dentro do
// .menestrel-ui ativo (fallback document.body), garantindo que o
// seletor CSS #root .menestrel-ui .mn-tip case e position:fixed aplique.
// Mesmo visual do padrão .mn-tip do projeto (Pedra & Bronze).
function usePortalTooltip(delay) {
  const [tip, setTip] = React.useState(null);
  const timerRef = React.useRef(null);
  const abrirTip = React.useCallback((e, content) => {
    clearTimeout(timerRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    // Num trilho, o balão abre ABAIXO do botão, como os do trilho do topo (23/10/2026).
    const abaixo = !!(e.currentTarget.closest && e.currentTarget.closest('.inv-trilho, .cartoes-barra, .cdj-trilho, .mc-acoes-ficha'));
    timerRef.current = setTimeout(() => setTip({ rect, content, abaixo }), delay || 0);
  }, [delay]);
  const fecharTip = React.useCallback(() => { clearTimeout(timerRef.current); setTip(null); }, []);
  const manterTip = React.useCallback(() => { clearTimeout(timerRef.current); }, []);
  return [tip, abrirTip, fecharTip, manterTip];
}
function PortalTooltip({ tip, onEnter, onLeave }) {
  if (!tip) return null;
  const { rect, content, abaixo } = tip;
  const cx = rect.left + rect.width / 2;
  const cy = abaixo ? rect.bottom : rect.top;
  const rich = content && typeof content === 'object' && !React.isValidElement(content);
  // Precisa montar DENTRO de um ancestral .menestrel-ui real — o CSS
  // (#root .menestrel-ui .mn-tip) exige .mn-tip como DESCENDENTE de
  // .menestrel-ui, não no mesmo elemento. Sem isso, position:fixed nunca
  // era aplicado: o tooltip ficava no fluxo normal no fim do <body>,
  // aumentando scrollHeight e criando scroll fantasma no hover.
  const portalTarget = document.querySelector('.menestrel-ui') || document.body;
  return ReactDOM.createPortal(
    <div
      className="mn-tip"
      data-tip-abaixo={abaixo ? '' : undefined}
      style={{ left: cx, top: cy, zIndex: 9999 }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {rich ? (
        <>
          {content.title && <div className="mn-tip-title">{content.title}</div>}
          {content.desc  && <p className={'mn-tip-desc' + (content.clamp ? ' mn-tip-desc--clamp' : '')}>{content.desc}</p>}
          {content.stats?.length > 0 && (
            <div className="mn-tip-stats">
              {content.stats.map((s, i) => (
                <span key={i} className="mn-tip-stat">{s.label}<b>{s.value}</b></span>
              ))}
            </div>
          )}
          {content.hint && <div className="mn-tip-hint">{content.hint}</div>}
        </>
      ) : (
        <div className="mn-tip-title">{content}</div>
      )}
    </div>,
    portalTarget
  );
}

// fmtNum — formato amigável de número:
// inteiros sem decimal ("3" e não "3.0"), fracionários com 1 casa ("1.5").
// Usado em ocupa/armazena/usado/capacidade tanto em barras como em tabelas.
function fmtNum(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return n;
  return Number.isInteger(x) ? String(x) : x.toFixed(1);
}

// Grupos cujos itens SOLTOS (sem container) acumulam num card único, somando a
// quantidade e exibindo "×N" no card. Os demais grupos soltos continuam virando
// uma instância por unidade. Chaves já normalizadas (minúsculas, sem acento) —
// comparar sempre via normalizar(cat.grupo). Ajustar esta lista é o único ponto
// pra incluir/excluir um grupo do empilhamento solto.
const GRUPOS_ACUMULAVEIS = new Set(['consumiveis', 'minerais', 'itens', 'moedas', 'servicos']);

// normalizarPilhas — política de pilhas do inventário:
//   • Itens SOLTOS (sem containerId):
//       – grupos em GRUPOS_ACUMULAVEIS (Consumíveis/Minerais/Moedas/Serviços)
//         FUNDEM por slug num card único (Poção ×5). Várias instâncias
//         quantidade 1 do mesmo slug colapsam numa só, com a soma.
//       – os demais grupos (equipáveis, instrumentos, transportes, recipientes…)
//         NÃO empilham: cada unidade vira uma instância separada (quantidade 1),
//         e uma pilha quantidade>1 é "explodida". Recipientes vazios também
//         (Algibeira ×2 → duas Algibeiras); um recipiente COM conteúdo nunca é
//         dividido (quebraria as referências dos filhos).
//   • Itens DENTRO de armazenamento (containerId != null) continuam empilhando:
//     itens de QUALQUER grupo com o mesmo slug no mesmo container viram uma pilha
//     só, somando a quantidade (ex.: Água ×2 + Água ×5 → Água ×7).
// Equipados/vestidos ficam sempre intactos (instância única) e nunca empilham.
// Devolve o MESMO array quando nada muda (guarda contra re-render/loop no efeito
// que dispara o autosave).
function normalizarPilhas(itens, catalogoBySlug) {
  if (!Array.isArray(itens)) return itens;
  // instanceIds que são "pais" de algum item (recipientes com conteúdo).
  const comFilhos = new Set();
  for (const it of itens) if (it.containerId) comFilhos.add(it.containerId);

  const saida = [];
  const idxPorChave = new Map(); // pilhas dentro de container: slug|containerId
  const idxLoose = new Map();    // pilhas soltas acumuláveis: por slug
  let mudou = false;
  for (const it of itens) {
    // À venda (02/10/2026): instância intacta — não funde, não explode. O
    // anúncio aponta para ela pelo anuncio_id.
    if (estaAVenda(it)) { saida.push(it); continue; }
    // Companheiro com nome (23/10/2026) é único: não funde nem explode.
    if (it.apelido) { saida.push(it); continue; }
    const cat = catalogoBySlug?.[it.slug];
    const container = ehContainer(cat);

    // Dentro de armazenamento → SOMA: itens do mesmo slug no mesmo container
    // viram UMA pilha só (consumíveis, materiais E equipáveis/vestíveis —
    // "dentro do armazenamento some"). Só sub-containers ficam de fora: cada
    // recipiente é uma instância distinta e não se funde com outro.
    if (it.containerId) {
      if (container) { saida.push(it); continue; }
      // Item consagrado não funde com o comum do mesmo slug (15/09/2026).
      const chave = it.slug + '|' + it.containerId + '|' + bonusDoItem(it);
      if (idxPorChave.has(chave)) {
        const alvo = saida[idxPorChave.get(chave)];
        alvo.quantidade += it.quantidade;
        if (!alvo.observacao && it.observacao) alvo.observacao = it.observacao;
        mudou = true;
      } else {
        idxPorChave.set(chave, saida.length);
        saida.push({ ...it });
      }
      continue;
    }

    // ── Item SOLTO (containerId null) — política depende do grupo ──
    // Equipados/vestidos: instância única sempre, nunca empilham.
    // Se a quantidade for > 1 (ex.: RPC comprar_item incrementou a pilha
    // existente sem saber que estava equipada), mantém 1 unidade equipada
    // e explode o excedente em instâncias soltas novas.
    // Montaria em uso (montado, 14/09/2026) segue a mesma regra: um cavalo só.
    if (it.equipado || it.vestido || it.montado) {
      const qtdEq = it.quantidade || 1;
      saida.push(qtdEq <= 1 ? it : { ...it, quantidade: 1 });
      for (let k = 1; k < qtdEq; k++) {
        saida.push({ ...it, instanceId: novoInstanceId() + '-eq' + k, quantidade: 1, equipado: false, vestido: false, montado: false, slot: null, vesteSlot: null });
        mudou = true;
      }
      continue;
    }

    const grupo = normalizar(cat?.grupo);

    // Grupos acumuláveis (Consumíveis/Minerais/Moedas/Serviços) soltos FUNDEM
    // por slug num card único, somando quantidade — mesmo vindo como várias
    // instâncias quantidade 1 (colapsam numa só). Containers ficam de fora,
    // mesmo que caíssem num desses grupos: renomear o instanceId orfanaria os
    // filhos. Na 1ª carga após a regra, as instâncias antigas separadas se
    // fundem e o autosave persiste o formato novo.
    if (!container && GRUPOS_ACUMULAVEIS.has(grupo)) {
      const chave = 'solto|' + it.slug;
      if (idxLoose.has(chave)) {
        const alvo = saida[idxLoose.get(chave)];
        alvo.quantidade += (it.quantidade || 1);
        if (!alvo.observacao && it.observacao) alvo.observacao = it.observacao;
        mudou = true;
      } else {
        idxLoose.set(chave, saida.length);
        saida.push({ ...it, quantidade: it.quantidade || 1 });
      }
      continue;
    }

    // Demais soltos (equipáveis, instrumentos, transportes, recipientes…): cada
    // unidade é uma instância separada. Uma pilha quantidade>1 é explodida.
    const qtd = it.quantidade || 1;
    if (qtd <= 1) { saida.push(it); continue; }

    // Recipiente empilhado COM conteúdo dentro (ex.: comprou 2 cantis → pilha
    // quantidade:2 com 1 instanceId, e depois pôs água "no cantil" → a água
    // grudou na pilha inteira). Não dá pra renomear o instanceId (orfanaria os
    // filhos), então explode PARCIAL: 1 instância mantém o instanceId original
    // (e o conteúdo), as outras (qtd-1) viram recipientes VAZIOS novos. Assim o
    // "Cantil 2" se desfaz sozinho no próximo load, sem travar.
    if (container && comFilhos.has(it.instanceId)) {
      saida.push({ ...it, quantidade: 1 });
      for (let k = 1; k < qtd; k++) {
        saida.push({ ...it, instanceId: novoInstanceId() + '-' + k, quantidade: 1 });
      }
      mudou = true;
      continue;
    }

    // Demais soltos (inclui recipiente VAZIO): explode tudo em instâncias novas.
    for (let k = 0; k < qtd; k++) {
      saida.push({ ...it, instanceId: novoInstanceId() + '-' + k, quantidade: 1 });
    }
    mudou = true;
  }
  return mudou ? saida : itens;
}

// recipienteAceitaSlug — regra de "tipo único" para recipientes LÍQUIDOS:
// um recipiente do tipo L só guarda UM tipo de item por vez. Se já houver
// conteúdo de outro slug dentro, recusa o novo slug. Recipientes sólidos não
// têm essa restrição (misturam tipos livremente).
//   cont     = a INSTÂNCIA do recipiente (com instanceId/slug)
//   novoSlug = slug do item que se quer guardar dentro
function recipienteAceitaSlug(cont, novoSlug, itens, catalogoBySlug) {
  const c = catalogoBySlug?.[cont?.slug];
  if (!c || c.tipo !== 'L') return true; // só restringe líquidos
  return !(itens || []).some(
    (x) => x.containerId === cont.instanceId && x.slug !== novoSlug
  );
}

/* ARRASTAR PARA A MOCHILA (02/10/2026): "Pegar um item, arrastar e soltar
   dentro de uma mochila, irá colocar este item dentro da mochila, respeitando
   as regras dos itens." (usuário). As regras são as do botão Armazenar —
   recipiente não entra em recipiente, item em uso não é guardado, tipo e
   grupo aceito batem (podeMoverParaContainer), líquido um só por recipiente.
   O que não cabe fica na casa de origem: entra o que couber (decisão do
   usuário). Pura. Devolve { ok, itens, qtd, total } ou { ok:false, motivo,
   texto? } — motivo: recipiente | em_uso | outro_liquido | regra | sem_espaco
   | sem_casa | invalido | a_venda | propriedade_longe.
   `localizacaoDoPj` é opcional: sem ela, a regra do endereço da propriedade
   (05/10/2026) não é checada — ver podeMoverParaContainer. */
function guardarNoRecipiente(itens, instanceId, containerId, catalogoBySlug, localizacaoDoPj) {
  const lista = Array.isArray(itens) ? itens : [];
  const it = lista.find((x) => x && x.instanceId === instanceId);
  const cont = lista.find((x) => x && x.instanceId === containerId);
  const catI = it && catalogoBySlug[it.slug];
  const catC = cont && catalogoBySlug[cont.slug];
  if (!it || !cont || !catI || !catC || it === cont || it.containerId === containerId) return { ok: false, motivo: 'invalido' };
  if (ehContainer(catI)) return { ok: false, motivo: 'recipiente' };
  if (estaAVenda(it)) return { ok: false, motivo: 'a_venda' };
  if (it.equipado || it.vestido || it.montado) return { ok: false, motivo: 'em_uso' };
  if (!recipienteAceitaSlug(cont, it.slug, lista, catalogoBySlug)) return { ok: false, motivo: 'outro_liquido' };
  const pode = podeMoverParaContainer(catI, catC, cont, lista, catalogoBySlug, localizacaoDoPj);
  if (!pode.ok) {
    // A casa longe (ou sem endereço) carrega o porquê: a tela precisa dizer
    // "sua Casa está em Tronum", e não só "não deu".
    if (pode.motivo === 'propriedade_longe') {
      return { ok: false, motivo: 'propriedade_longe', cidade: pode.cidade, porque: pode.porque };
    }
    return /sem espaço/.test(pode.motivo || '') ? { ok: false, motivo: 'sem_espaco' } : { ok: false, motivo: 'regra', texto: pode.motivo };
  }
  const total = it.quantidade || 1;
  const ocupa = Number(catI.ocupa || 0);
  const { livre, casasLivres, filhos } = capacidadeContainer(cont, lista, catalogoBySlug);
  /* SEM CASA LIVRE não entra (29/10/2026) — a não ser que a peça vá se somar
     a uma pilha que já está lá dentro, que não gasta casa nova. */
  const empilha = (filhos || []).some((f) => f.slug === it.slug);
  if (casasLivres <= 0 && !empilha) return { ok: false, motivo: 'sem_casa' };
  // Tolerância para float (0.1 × 10 dá 0.9999…), a mesma do moverParaContainer.
  const qtd = Math.min(total, ocupa > 0 ? Math.floor((livre + 0.0001) / ocupa) : total);
  if (qtd <= 0) return { ok: false, motivo: 'sem_espaco' };
  const out = qtd === total
    ? lista.map((x) => (x === it ? { ...x, containerId, casa: undefined } : x))
    : [
      ...lista.map((x) => (x === it ? { ...x, quantidade: total - qtd } : x)),
      { instanceId: novoInstanceId(), slug: it.slug, quantidade: qtd, equipado: false, slot: null, containerId, observacao: it.observacao || null },
    ];
  return { ok: true, itens: posicionarCasas(out), qtd, total };
}

// Ordem canônica dos slots de equipamento (paper-doll do quadro "Equipado").
// Vocabulário novo de 26/10/2026 + o antigo das instâncias já gravadas.
const SLOT_ORDER = ['cabeca', 'ombro', 'ombros', 'dorso', 'peito', 'braco', 'bracos',
  'mao_d', 'mao_e', 'saque_e', 'saque_d', 'maos', 'perna', 'pernas', 'canela', 'pe', 'pes'];

// ── Vestir (grupo "Vestimentas") ─────────────────────────────────────────────
// Vestimenta é um sistema PARALELO ao de equipamento: a peça vestida ganha
// `vestido:true` + `vesteSlot` (NÃO usa o campo `slot`, pra não colidir com
// armaduras/armas no getSlotsState/ficha) e NÃO ocupa espaço de armazenamento.
const GRUPO_VESTIMENTA = 'Vestimentas';

// Capacidade de vestimenta por slot do catálogo (cat.slot_equip). O vocabulário
// é o do BANCO: cabeca, ombros, peito, bracos, maos, pernas, pes, pescoco, orelha, cintura, dedos.
//   max       = nº máximo de peças na região
//   gastaSlot = se a peça também disputa o slot de armadura (bloqueia/é bloqueada
//               por armadura no mesmo slot). Só cabeca e pes.
// AJUSTE os tetos aqui se quiser (pescoco/orelha são defaults).
/* As 17 regiões da proposta de 26/10/2026 (ver REGIOES_EQUIP, 01-core). O
   `max` é o TOTAL de casas da região — equipamento, vestimenta e adorno
   dividem as mesmas casas; `gastaSlot: true` marca as regiões onde a peça
   vestida disputa a casa com armadura equipada. */
const VESTE_SLOTS = {
  cabeca:  { max: 1,  gastaSlot: true  }, // Cabeça (capacete OU chapéu/tiara/coroa)
  rosto:   { max: 2,  gastaSlot: false }, // Rosto (máscara, capuz)
  orelha:  { max: 4,  gastaSlot: false }, // Orelha (brincos, piercings)
  pescoco: { max: 3,  gastaSlot: false }, // Pescoço (colar, gargantilha, cachecol/lenço)
  ombro:   { max: 2,  gastaSlot: true  }, // Ombro (ombreira + dragona)
  costas:  { max: 2,  gastaSlot: false }, // Costas (capa, sobretudo)
  dorso:   { max: 1,  gastaSlot: true  }, // Dorso (peitoral)
  peito:   { max: 3,  gastaSlot: false }, // Peito (broche/medalha/pingente, túnica, casaco)
  braco:   { max: 2,  gastaSlot: true  }, // Braço (braçadeiras)
  dedo:    { max: 10, gastaSlot: false }, // Dedo (anéis)
  pulso:   { max: 2,  gastaSlot: false }, // Pulso (pulseiras, luvas)
  mao:     { max: 2,  gastaSlot: true  }, // Mãos (arma, escudo)
  perna:   { max: 2,  gastaSlot: true  }, // Perna (grevas)
  cintura: { max: 2,  gastaSlot: true  }, // Cintura (cinta, calça)
  canela:  { max: 2,  gastaSlot: true  }, // Canela (caneleiras)
  pe:      { max: 2,  gastaSlot: true  }, // Pé (botas, sandálias)
  alforje: { max: 3,  gastaSlot: false }, // Alforje (estojo, aljava, bainha, algibeira)
};

// O slot da peça vem do catálogo (cat.slot_equip). Instâncias antigas e campos
// legados do banco usam outros nomes — tudo converge para a região nova.
const VESTE_SLOT_ALIAS = {
  costas: 'costas', capa: 'costas', corpo: 'peito', roupa: 'peito',
  orelhas: 'orelha', brinco: 'orelha', dedos: 'dedo', joia: 'dedo',
  cinto: 'cintura', colar: 'pescoco',
  ombros: 'ombro', bracos: 'braco', maos: 'mao', pernas: 'perna', pes: 'pe',
};
function vesteSlotDe(slotEquip) {
  if (!slotEquip) return null;
  return VESTE_SLOT_ALIAS[slotEquip] || slotEquip;
}
// inferirSlotEquip — deduz o slot de vestimenta pelo grupo/categoria quando
// cat.slot_equip nao esta definido no catalogo. Cobre brincos e colares
// que sao vestimentas mas nao tem slot_equip gravado no banco.
function inferirSlotEquip(cat) {
  if (!cat) return null;
  if (cat.slot_equip) return vesteSlotDe(cat.slot_equip);
  // categoria_equip do banco pode SER o slot diretamente
  const ce = (cat.categoria_equip || '').toLowerCase();
  if (ce === 'brinco' || ce === 'orelha') return 'brinco';
  if (ce === 'colar' || ce === 'pescoco' || ce === 'pescoço') return 'colar';
  if (ce === 'joia' || ce === 'jóia' || ce === 'anel') return 'joia';
  if (ce === 'cintura' || ce === 'cinto' || ce === 'capa') return ce;
  if (ce === 'roupa' || ce === 'veste' || ce === 'gandola' || ce === 'manto' || ce === 'tabardo' || ce === 'tunica' || ce === 'túnica') return 'roupa';
  // fallback por grupo e nome
  const g = (cat.grupo || '').toLowerCase();
  const n = (cat.nome || '').toLowerCase();
  if (g.includes('brinco') || n.includes('brinco') || g.includes('orelh') || n.includes('orelh')) return 'brinco';
  if (g.includes('colar') || n.includes('colar') || g.includes('pescoc') || n.includes('pescoc') || g.includes('amuleto') || n.includes('amuleto')) return 'colar';
  if (g.includes('joia') || g.includes('jóia') || g.includes('anel') || n.includes('anel')) return 'joia';
  if (g.includes('cinto') || n.includes('cinto') || g.includes('cintura') || n.includes('cintura')) return 'cintura';
  if (g.includes('manto') || g.includes('tabard') || g.includes('tunic') || n.includes('manto') || n.includes('gandola')) return 'roupa';
  return null;
}
// Detecção tolerante (igual ao invItemIcon): qualquer grupo cujo nome contenha
// "vestiment" (sem depender de caixa/plural). GRUPO_VESTIMENTA fica como referência.
function ehVestimenta(cat) {
  if (!cat) return false;
  /* ARREAMENTO NÃO SE VESTE EM GENTE (06/10/2026). "Os itens do tipo arreios
     são vestimentas ou armaduras" (usuário) mudou o GRUPO da sela e da barda,
     e com isso elas passaram a casar com o teste de grupo aqui embaixo — o
     inventário ofereceria VESTIR uma sela no personagem. Quem segura a porta é
     `slot_arreio`: peça que tem casa no bicho não tem casa no dono. */
  if (String(cat.slot_arreio || '').trim()) return false;
  if ((cat.grupo || '').toLowerCase().includes('vestiment')) return true;
  // categoria_equip de joias/acessorios vestíveis (valores reais do banco)
  const ce = (cat.categoria_equip || '').toLowerCase();
  return ce === 'brinco' || ce === 'colar' || ce === 'orelha' || ce === 'pescoco'
      || ce === 'joia' || ce === 'jóia' || ce === 'anel'
      || ce === 'acessorio' || ce === 'acessório' || ce === 'bijuteria';
}
// Estado de uma região de vestimenta: quantas peças vestidas e o limite.
function vesteSlotState(slotEquip, itens, catalogoBySlug) {
  const key = vesteSlotDe(slotEquip);
  const cfg = VESTE_SLOTS[key];
  if (!cfg) return { key, usado: 0, max: 0, livre: 0, gastaSlot: false, cfg: null };
  let usado = 0;
  for (const it of (itens || [])) {
    if (it.vestido && vesteSlotDe(it.vesteSlot) === key) usado += (it.quantidade || 1);
  }
  return { key, usado, max: cfg.max, livre: Math.max(0, cfg.max - usado), gastaSlot: cfg.gastaSlot, cfg };
}

function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const ICONE_POR_GRUPO = {
  animais: 'ti-deer',
  armaduras: 'ti-shield',
  armas: 'ti-swords',
  consumiveis: 'ti-bottle',
  instrumentos: 'ti-music',
  itens: 'ti-box',
  moedas: 'ti-coins',
  minerais: 'ti-diamond',
  propriedades: 'ti-tower',
  recipientes: 'ti-moneybag',
  servicos: 'ti-building-circus',
  transportes: 'ti-ship',
  vestimentas: 'ti-shirt',
};

function invItemIcon(cat) {
  if (!cat) return 'ti-box';

  // Containers mantêm glifo por tipo S/L (estado funcional, não estético) —
  // tem prioridade até sobre o icone do banco.
  if (ehContainer(cat)) {
    return cat.tipo === 'L' ? 'ti-bottle' : 'ti-moneybag';
  }

  // Ícone vindo do catálogo (coluna public.itens.icone, formato ti-*).
  // É a fonte de verdade quando preenchido; o banco já valida o formato
  // via constraint, mas guardamos contra valores legados malformados.
  if (cat.icone && /^ti-[a-z0-9-]+$/.test(cat.icone)) {
    return cat.icone;
  }

  // Fallback: ícone genérico do grupo, e por fim ti-box.
  const grupo = normalizar(cat.grupo);

  return ICONE_POR_GRUPO[grupo] || 'ti-box';
}

/* ── Peso / capacidade de carga ────────────────────────────────────
   Medidor ÚNICO de "peso": o quanto o personagem está carregando, em % da
   capacidade. É independente do controle de armazenamento por container (esse
   continua intacto, via capacidadeContainer). Regras de peso:
     • Capacidade base = 10 unidades, +10% por ponto de (forca_base + fisico_base)
       somados. Itens de armazenamento AUMENTAM a capacidade pelo tamanho de
       armazenamento de cada um (o `armazena` do container).
     • Equipado (arma / escudo / armadura) OU vestido (vestimenta / joia):
       pesa 50% do `ocupa` (PESO_FATOR_EQUIPADO).
     • Solto no inventário (sem containerId): pesa 100% do `ocupa`.
     • Dentro de armazenamento (containerId != null): pesa 75% do `ocupa`
       (PESO_FATOR_EM_CONTAINER).
     • O próprio container pesa pelo `ocupa` conforme seu estado (equipado 50% /
       solto 100%) e, em paralelo, soma capacidade. */
const PESO_CAP_BASE = 10;            // capacidade base (antes de atributos/armazenamento)
const PESO_GANHO_POR_PONTO = 0.10;   // +10% de capacidade por ponto de força+físico
const PESO_FATOR_EQUIPADO = 0.5;      // equipado (arma/escudo/armadura) OU vestido (vestimenta/joia) pesa 50% do ocupa
const PESO_FATOR_EM_CONTAINER = 0.75; // dentro de armazenamento pesa 75% do ocupa

// calcCarga — peso atual e capacidade do PJ → { peso, capacidade, pct, over }.
function calcCarga(itens, catalogoBySlug, forcaBase, fisicoBase) {
  const capBase = PESO_CAP_BASE * (1 + PESO_GANHO_POR_PONTO * ((forcaBase || 0) + (fisicoBase || 0)));
  if (!Array.isArray(itens) || !catalogoBySlug) {
    return { peso: 0, capacidade: capBase, pct: 0, over: false };
  }

  let peso = 0;                // carga atual
  let bonusArmazenamento = 0;  // capacidade extra vinda dos containers

  /* A PROPRIEDADE NÃO VAI NAS COSTAS (05/10/2026). Casa, Taverna e Castelo são
     containers pelo mesmo critério dos outros (armazena > 0), e por isso a Casa
     vinha somando +200 de capacidade ao personagem e o que estava guardado nela
     vinha pesando a 75% — como se ele carregasse a casa. Com o endereço
     (`it.cidade`) isso virou contradição aberta: um depósito trancado em outra
     cidade que ainda deixava o dono carregar mais. */
  const propriedades = new Set(itens
    .filter((x) => x && ehPropriedade(catalogoBySlug[x.slug]))
    .map((x) => x.instanceId));

  for (const it of itens) {
    const cat = catalogoBySlug[it.slug];
    if (!cat) continue;
    if (ehPropriedade(cat)) continue;                      // nem peso nem capacidade
    if (it.containerId && propriedades.has(it.containerId)) continue;  // guardado na casa
    /* O QUE ESTÁ NO BICHO NÃO PESA NO DONO (05/10/2026): uma Barda ocupa 12 e
       uma Sela de Guerra 6,5 — somadas, vestir o cavalo sobrecarregava o
       personagem. Ele não carrega a sela; o cavalo carrega. */
    if (it.animal_id) continue;
    const ocupaUnit = cat.ocupa != null ? Number(cat.ocupa) : 0;
    const qtd = it.quantidade || 1;

    if (ehContainer(cat)) {
      // Armazenamento: soma capacidade pelo seu tamanho de armazenamento…
      const { armazena } = capacidadeContainer(it, itens, catalogoBySlug);
      bonusArmazenamento += Number(armazena || 0);
      // …e o próprio container pesa pelo `ocupa` conforme seu estado.
      if (!it.vestido) peso += ocupaUnit * qtd * (it.equipado ? PESO_FATOR_EQUIPADO : 1);
      continue;
    }

    if (it.vestido) {
      peso += ocupaUnit * qtd * PESO_FATOR_EQUIPADO;            // vestido → 50% (mesmo fator do equipado)
    } else if (it.containerId) {
      peso += ocupaUnit * qtd * PESO_FATOR_EM_CONTAINER;        // dentro de armazenamento → 75%
    } else if (it.equipado) {
      peso += ocupaUnit * qtd * PESO_FATOR_EQUIPADO;            // equipado → 50%
    } else {
      peso += ocupaUnit * qtd;                                  // solto → 100%
    }
  }

  const capacidade = capBase + bonusArmazenamento;
  const pct = capacidade > 0 ? (peso / capacidade) * 100 : 0;
  return { peso, capacidade, pct, over: pct > 100 };
}

// Colunas de `personagens` que o InventarioList precisa. Constante ÚNICA
// porque os três lugares que leem a tabela fazem setPjs(resultado) — trocando
// o array inteiro —, então quem trouxer menos colunas APAGA as que faltam do
// cache local de todos os PJs.
//
// Foi exatamente o que acontecia: o refetch de transferirItem vinha sem
// forca_base/fisico_base/estado_atual e o de aprenderMagiaPergaminho sem
// estado_atual. Depois de transferir um item, calcCarga (que lê forca_base e
// fisico_base de `pjs`) recebia undefined e a capacidade de carga desabava
// para a base; e `estado_atual` sumia do cache, de onde o autosave de estado
// semeia ao trocar de PJ — podendo gravar {} por cima das condições no banco.
// Cobertura: 07-inventario/refetch-pjs.test.js.
// magias + experiencia (13/09/2026): a janela Estudar precisa saber o nível
// atual de cada magia e o estágio — ver bloqueioAprenderNoInventario.
// foto_url (27/09/2026): o card do alvo na aba Usar mostrava só a inicial.
// intelecto_base + aura_base (22/10/2026): orçamento de magia (pontosMagiasTotal).
// deus (22/10/2026): regra dos milagres na janela Estudar (sem religião, sem milagre).
const PJ_COLS = 'id,nome,sobrenome,foto_url,raca,subraca,profissao,deus,forca_base,fisico_base,intelecto_base,aura_base,agilidade_base,inventario,estado_atual,magias,tecnicas,treinos,experiencia,especializacao,inventario_versao';

// Inventário com os campos que a tela espera, sem mexer no objeto de origem.
const INV_VAZIO = () => ({ moedas: { ouro: 0, prata: 0, cobre: 0, latao: 0 }, itens: [] });
function invComPadroes(inventario) {
  const inv = inventario || INV_VAZIO();
  return {
    ...inv,
    moedas: inv.moedas || INV_VAZIO().moedas,
    itens: Array.isArray(inv.itens) ? inv.itens : [],
  };
}

// ── InventarioList ────────────────────────────────────────────────────────────
/* `onEstadoChange` / `estadoAtualSeed` — handoff de estado_atual com quem
   embute este componente (hoje a Ficha, 11-ficha/ficha.jsx).

   Os dois gravam em personagens.estado_atual, cada um com seu debounce e sua
   cópia. Como as abas da Ficha são exclusivas (o InventarioList só existe
   enquanto fpTab==='inventario'), os dois NUNCA estão montados juntos — não é
   caso de binding vivo, e sim de passar o bastão nas duas pontas:

     onEstadoChange   quem sai avisa o valor novo. Sem isso, pj.estado_atual
                      ficava congelado no carregamento inicial da Ficha (que
                      não refaz ao trocar de aba) e a gravação seguinte dela
                      apagava o efeito do item usado aqui.
     estadoAtualSeed  quem entra recebe a semente. Fecha o sentido inverso:
                      trocar pra esta aba dentro dos 400ms do debounce da
                      Ficha faria a carga daqui ler do banco um valor que a
                      Ficha ainda não gravou.

   Espelha o que `onInventarioChange` já fazia pro inventário. Cobertura:
   11-ficha/estado-handoff.test.js. */
function InventarioList({ ac, lang, currentUserId, pjIdFixo, onInventarioChange, onEstadoChange, estadoAtualSeed, maximos, isMestre }) {
  const [pjs, setPjs] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [catalogo, setCatalogo] = useState(null);
  const [inv, setInv] = useState(null);
  const [estadoAtual, setEstadoAtual] = useState(null); // efeitos de item (Reputação, Sono, EH/EF, ...)
  const [saving, setSaving] = useState('idle');
  const [error, setError] = useState(null);
  const [detalhesId, setDetalhesId] = useState(null);
  // Baú com painel (22/10/2026): na tela larga o item abre ao lado da grade.
  const bauLargo = useBauLargo();
  const [painelEl, setPainelEl] = useState(null);
  // Fase 3
  const [pjsHistoria, setPjsHistoria] = useState([]);
  const [containerAberto, setContainerAberto] = useState(null); // instanceId
  /* ── DE ONDE SE VEIO (28/10/2026) ───────────────────────────────────────
     "Cliquei para ver os detalhes da moeda de latão do personagem Eco que
     está em 'cinto de acessórios', mas ao lado de descartar não vejo o botão
     'voltar'." (usuário)

     O botão Voltar nasceu na ficha, onde a janela da REGIÃO fecha ao abrir a
     do item. No Inventário acontece o mesmo com o RECIPIENTE: abrir a moeda
     que está dentro do cinto fecha o cinto, e voltar significava fechar,
     achar o cinto na grade e clicar de novo — três gestos para desfazer um.

     `voltarPara` guarda o degrau anterior: o recipiente de onde a peça saiu,
     ou a peça-pai quando se navega de item em item dentro do painel. É null
     quando a janela é o primeiro degrau, e aí o botão não nasce. */
  const [voltarPara, setVoltarPara] = useState(null); // {tipo:'container'|'item', id}
  const [transferError, setTransferError] = useState(null);
  // Ação pendente que aguarda escolha de quantidade no QuantidadeModal
  // formato: { tipo: 'usar'|'destruir'|'mover', instanceId, max, extra? }
  const [acaoPendente, setAcaoPendente] = useState(null);
  /* Catálogo ENXUTO de magias (13/09/2026): só o que o botão "Aprender" do
     pergaminho precisa para dizer no tooltip por que não dá — custo (pontos) e
     textos dos níveis. Falhar aqui não trava o inventário: sem a lista, os
     motivos ficam só com a RPC.
     Descrição e texto dos níveis (13/09/2026): a janela do pergaminho mostra
     o que a magia faz. */
  const [magiasDb, setMagiasDb] = useState(null);
  useEffect(() => {
    let vivo = true;
    Promise.resolve(supabaseClient.from('magias').select('key,nome,custo,tipo,classe,evocacao,descricao,itens_necessarios,nivel_1,nivel_3,nivel_5,nivel_7,nivel_9'))
      .then((res) => { if (vivo && res && !res.error && Array.isArray(res.data)) setMagiasDb(res.data); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);
  // Técnicas (22/10/2026): a janela Estudar também ensina técnica (custo, nome).
  const [tecnicasDb, setTecnicasDb] = useState(null);
  useEffect(() => {
    let vivo = true;
    Promise.resolve(supabaseClient.from('tecnicas').select('key,nome,custo,descricao,efeito,ajuste'))
      .then((res) => { if (vivo && res && !res.error && Array.isArray(res.data)) setTecnicasDb(res.data); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);
  /* Livro → pergaminhos (livro_pergaminhos, 22/10/2026): é o que dá ao livro
     a ação "Estudar". Falhar aqui só esconde o Estudar dos livros. */
  const [vinculos, setVinculos] = useState({});
  useEffect(() => {
    let vivo = true;
    if (typeof fetchTabelaPaginada !== 'function') return undefined;
    Promise.resolve(fetchTabelaPaginada('livro_pergaminhos', { colunas: 'livro_slug,pergaminho_slug', ordem: ['livro_slug', 'pergaminho_slug'] }))
      .then((res) => { if (vivo && res && !res.error) setVinculos(vinculosDeLivros(res.data)); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);
  // Nome da mesa (história) do PJ selecionado — mesma info exibida na Loja.
  // Fonte: RPC get_loja_pj (já retorna historia_titulo). Só leitura; estoque é ignorado aqui.
  const [mesaTitulo, setMesaTitulo] = useState(null);
  // historia_id real do PJ selecionado — NÃO vem de get_loja_pj (schema não
  // confirmado pra esse campo); resolvido pela mesma query reversa que
  // src/11-ficha/ficha.jsx já usa (protagonista_ids @> [pjId]). Usado só
  // pra notificar a Central de Mensagens da Mesa (registrar_evento_mesa).
  const [historiaId, setHistoriaId] = useState(null);
  const [lugarAtual, setLugarAtual] = useState('');
  // Criaturas marcadas como montaria (criaturas.montaria, 14/09/2026). O animal
  // do inventário é montável quando o NOME casa com uma delas (criaturaDoItem).
  const criaturasMontaria = useCriaturasMontaria();
  // True quando auth.uid() === currentUserId, ou seja, o usuário logado
  // é o dono dos PJs listados. False quando um Mestre está vendo o inventário
  // de outro jogador — nesse caso a RPC aprender_magia falha (auth.uid()
  // ≠ user_id do PJ), então o botão "Aprender" deve ficar oculto.
  const [authUserIsOwner, setAuthUserIsOwner] = useState(false);

  /* A negociação com o Mestre (vendas_item, 13/09/2026) saiu em 27/09/2026:
     vender agora é PUBLICAR na loja da aventura (ver publicarNaLoja). */

  // Carregar PJs + catálogo
  useEffect(() => {
    if (!currentUserId) return;
    (async () => {
      const [pjRes, itRes, authRes] = await Promise.all([
        supabaseClient.from('personagens').select(PJ_COLS).eq('user_id', currentUserId).order('created_at', { ascending: true }),
        fetchCatalogoCompleto(),
        supabaseClient.auth.getUser(),
      ]);
      if (pjRes.error) { setError(pjRes.error.message); setPjs([]); return; }
      if (itRes.error) { setError(itRes.error.message); setCatalogo([]); return; }
      setPjs(pjRes.data || []);
      setCatalogo(itRes.data || []);
      if (pjRes.data?.length > 0) setSelectedId(pjIdFixo || pjRes.data[0].id);
      // Ownership: só o auth user real pode aprender magias — Mestre vendo PJ alheio não pode
      setAuthUserIsOwner(!!(authRes.data?.user?.id && authRes.data.user.id === currentUserId));
    })();
  }, [currentUserId]);

  // Carregar PJs da mesma história (via RPC SECURITY DEFINER) + nome da mesa
  useEffect(() => {
    if (!selectedId) { setPjsHistoria([]); setMesaTitulo(null); setHistoriaId(null); return; }
    (async () => {
      const [pjsRes, lojaRes, histRes] = await Promise.all([
        supabaseClient.rpc('get_pjs_historia', { p_pj_id: selectedId }),
        supabaseClient.rpc('get_loja_pj', { p_pj_id: selectedId }),
        // O PJ pode estar em mais de uma história: vale a mais nova (como o bridge.ts). Sem o limit, o maybeSingle dava erro e a tela ficava vazia (02/10/2026).
        supabaseClient.from('historias').select('id, data_jogo_atual').contains('protagonista_ids', [selectedId]).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      setPjsHistoria(pjsRes.data || []);
      setMesaTitulo(lojaRes.data?.ok ? (lojaRes.data.historia_titulo || null) : null);
      setHistoriaId(!histRes.error && histRes.data ? histRes.data.id : null);
      // Onde a mesa está (o "lugar" do trilho do topo) — a cidade da venda.
      setLugarAtual((!histRes.error && histRes.data && histRes.data.data_jogo_atual && histRes.data.data_jogo_atual.local) || '');
    })();
  }, [selectedId]);

  // Carregar inventário do PJ selecionado.
  // IMPORTANTE: depende só de [selectedId], NÃO de [selectedId, pjs]. `pjs` é
  // tocado por DOIS autosaves independentes (inventario e estado_atual, cada
  // um por debounce próprio — ver useEffects abaixo). Se este efeito reagisse
  // a QUALQUER mudança de `pjs`, o autosave de `inv` (que só atualiza
  // pjs[].inventario) re-disparava esta carga e resetava `estadoAtual` de
  // volta para o valor ANTIGO ainda em pjs[].estado_atual (e vice-versa) —
  // squashando silenciosamente o efeito de item recém aplicado (bug real:
  // usar a Água não refletia Hidratação/Temperatura/Sobriedade na tela).
  // pjsRef garante que lemos o `pjs` mais recente sem precisar listá-lo nas deps.
  const pjsRef = useRef(pjs);
  useEffect(() => { pjsRef.current = pjs; }, [pjs]);
  // Gravações do inventário por PJ: fila, base confirmada e rebase (02/10/2026).
  const gravadorRef = useRef(null);
  if (!gravadorRef.current) gravadorRef.current = criarGravadorInventario();
  // Semente do pai, em ref pelo mesmo motivo de pjsRef: entra na carga abaixo
  // sem virar dependência dela — listá-la re-semearia a cada render do pai,
  // atropelando o efeito de item recém aplicado aqui.
  const seedRef = useRef(estadoAtualSeed);
  useEffect(() => { seedRef.current = estadoAtualSeed; }, [estadoAtualSeed]);
  useEffect(() => {
    const pjsAtual = pjsRef.current;
    if (!pjsAtual || !selectedId) { setInv(null); setEstadoAtual(null); return; }
    const pj = pjsAtual.find((p) => p.id === selectedId);
    if (!pj) return;
    // O gravador já conhece o PJ (voltando a ele): vale o que ele tem, que
    // inclui gravação ainda na fila. Senão, o que veio do banco.
    const g = gravadorRef.current;
    if (!g.tem(pj.id)) g.carregar(pj.id, invComPadroes(pj.inventario), pj.inventario_versao);
    setInv(g.atual(pj.id));
    // Semente do pai vence a linha do banco quando existe: a Ficha atualiza
    // pj.estado_atual otimisticamente, então ela é sempre pelo menos tão nova
    // quanto o banco. Só vale pro PJ FIXO — com o seletor de vários PJs
    // (pjIdFixo ausente) a semente seria a do personagem errado.
    const semente = (pjIdFixo && selectedId === pjIdFixo) ? seedRef.current : null;
    setEstadoAtual(semente || pj.estado_atual || {});
    // Base do patch: o que acreditamos estar gravado neste PJ (ver o autosave
    // de estado_atual abaixo).
    estadoBaseRef.current = pj.estado_atual || {};
  }, [selectedId]);

  // Fechar modais SÓ ao trocar de PJ — não a cada writeback do autosave em `pjs`.
  // O autosave reescreve pjs[selectedId].inventario (mesma ref de `inv`); com o
  // reset embutido no efeito acima, ele re-rodava ~450ms depois e zerava
  // detalhesId/containerAberto, fechando o modal enquanto se digitava a Observação.
  // Trocar de PJ continua fechando os modais (e os safety-nets abaixo cobrem
  // o caso de a instância sumir do inventário novo).
  useEffect(() => {
    setDetalhesId(null);
    setContainerAberto(null);
  }, [selectedId]);

  /* Autosave pelo gravador (02/10/2026): debounce de 450ms; grava só o que
     esta tela mudou, mesclado com o que mudou por fora; o que a tela mudou
     durante a gravação é rebaseado, e o que veio de fora aparece na tela. */
  // PJ da última execução do autosave. Na troca de PJ o efeito roda uma vez
  // com o `inv` do PJ ANTERIOR (a carga do novo ainda não renderizou); essa
  // execução é pulada, senão o gravador do PJ novo receberia o inventário
  // do outro. Cobre também a carga inicial (o antigo firstRender).
  const autosavePjRef = useRef(null);
  const selRef = useRef(selectedId);
  useEffect(() => { selRef.current = selectedId; }, [selectedId]);
  const aplicarGravacao = (pjId, r) => {
    if (!r.ok) { setSaving('error'); return; }
    setPjs((arr) => (arr || []).map((p) => (p.id === pjId ? { ...p, inventario: r.inventario, inventario_versao: r.versao } : p)));
    if (r.gravou) { setSaving('saved'); setTimeout(() => setSaving('idle'), 1500); }
    if (selRef.current === pjId && r.enviado && !mesmoValor(r.inventario, r.enviado)) {
      // Veio mudança de fora: a tela passa a mostrar, por cima do que mudou
      // nela. O `inv` novo faz o autosave rodar de novo se sobrar diferença.
      setInv((cur) => (cur === r.enviado ? r.inventario : mesclarInventario(r.enviado, cur, r.inventario)));
      return;
    }
    /* A tela mudou DURANTE a gravação e o `inv` não vai mudar de novo
       (02/10/2026): equipar, e desequipar com o equipar em voo, deixa a tela
       igual à base antiga — o autosave achou que não havia o que gravar.
       Agora a base é o que foi gravado, a diferença existe: grava de novo.
       Sem loop: só sobra diferença se a tela mudou durante esta gravação. */
    const g = gravadorRef.current;
    if (g.sujo(pjId)) g.salvar(pjId).then((r2) => aplicarGravacao(pjId, r2));
  };
  useEffect(() => {
    if (autosavePjRef.current !== selectedId) { autosavePjRef.current = selectedId; return; }
    if (!inv || !selectedId) return;
    if (onInventarioChange) onInventarioChange(inv);
    const g = gravadorRef.current;
    g.alterar(selectedId, inv);
    if (!g.sujo(selectedId)) return;
    setSaving('saving');
    const pjId = selectedId;
    const id = setTimeout(() => { g.salvar(pjId).then((r) => aplicarGravacao(pjId, r)); }, 450);
    return () => clearTimeout(id);
  }, [inv, selectedId]);
  /* Flush ao desmontar E ao trocar de PJ: o debounce acima foi cancelado; o
     gravador já tem o último local deste PJ e grava na fila. O resultado
     passa por aplicarGravacao (02/10/2026): quem voltou a este PJ com o
     flush em voo vê o que mudou por fora — senão a tela seguia com a cópia
     velha e a próxima edição gravava a flecha gasta de volta. */
  useEffect(() => () => {
    const pjId = selRef.current;
    const g = gravadorRef.current;
    if (!pjId || !g.sujo(pjId)) return;
    g.salvar(pjId).then((r) => {
      if (!r.ok) console.error('[inventario] flush falhou:', r.error);
      aplicarGravacao(pjId, r);
    });
  }, [selectedId]);

  // Save de estado_atual (Reputação, Sono, EH/EF, ...) — mesmo padrão de
  // debounce/flush do inventário, mas COLUNA separada (estado_atual). Só
  // dispara quando usarItem/vestir/despir mexem em algo via aplicarEfeitosItem;
  // edição manual das barras continua exclusiva do Mestre, em ficha.jsx.
  const firstRenderEstado = useRef(true);
  const estadoRef = useRef(estadoAtual);
  const estadoDirtyRef = useRef(false);
  // Último estado_atual que sabemos estar no banco — a base do patch.
  const estadoBaseRef = useRef({});
  useEffect(() => { estadoRef.current = estadoAtual; }, [estadoAtual]);
  useEffect(() => {
    if (firstRenderEstado.current) { firstRenderEstado.current = false; return; }
    if (!estadoAtual || !selectedId) return;
    // Avisa o pai NA HORA, igual onInventarioChange faz com `inv` — sem isto,
    // a cópia da Ficha fica congelada e a próxima gravação dela apaga o que
    // foi feito aqui.
    if (onEstadoChange) onEstadoChange(estadoAtual);
    estadoDirtyRef.current = true;
    /* Só o que MUDOU vai ao banco (15/09/2026): esta tela guardava o
       estado_atual inteiro desde que o PJ foi carregado, e mandá-lo de volta
       apagava o que o Mestre tivesse mexido na ficha nesse meio tempo — a
       barra "voltava sozinha". `estadoBaseRef` é o último estado que sabemos
       que está no banco; a diferença até ele é o patch. */
    const id = setTimeout(async () => {
      const patch = patchDeEstado(estadoBaseRef.current, estadoAtual);
      if (Object.keys(patch).length === 0) { estadoDirtyRef.current = false; return; }
      const { data, error } = await gravarEstadoAtual(selectedId, patch);
      if (!error) {
        estadoDirtyRef.current = false;
        estadoBaseRef.current = data;
        setPjs((arr) => arr.map((p) => p.id === selectedId ? { ...p, estado_atual: data } : p));
      }
    }, 450);
    return () => clearTimeout(id);
  }, [estadoAtual, selectedId]);
  // Flush ao desmontar e ao trocar de PJ — mesmo motivo do flush do inventário.
  useEffect(() => () => {
    if (!estadoDirtyRef.current || !estadoRef.current || !selRef.current) return;
    const pjId = selRef.current;
    estadoDirtyRef.current = false;
    gravarEstadoAtual(pjId, patchDeEstado(estadoBaseRef.current, estadoRef.current)).then(({ data, error }) => {
      if (error || !data) return;
      setPjs((arr) => (arr || []).map((p) => (p.id === pjId ? { ...p, estado_atual: data } : p)));
    });
  }, [selectedId]);

  // Catálogo indexado
  const catalogoBySlug = useMemo(() => {
    const map = {};
    (catalogo || []).forEach((it) => { map[it.slug] = it; });
    return map;
  }, [catalogo]);

  // Normaliza pilhas a cada mudança do inventário (carga inicial, compra,
  // transferência, entrada/saída de recipiente): explode itens soltos em
  // unidades separadas e empilha consumíveis dentro de armazenamentos.
  // Depende de catalogoBySlug, por isso vem DEPOIS dele. O resultado persiste
  // pelo autosave, pois altera `inv`.
  useEffect(() => {
    if (!inv || !catalogoBySlug) return;
    // Depois das pilhas, as CASAS (02/10/2026): quem não tem casa — item
    // novo, unidade que a pilha separou, inventário antigo — ganha a primeira
    // livre do seu lugar. Ver 01-core/inventario-casas.jsx.
    const normalizados = posicionarCasas(normalizarPilhas(inv.itens, catalogoBySlug));
    if (normalizados !== inv.itens) setInv({ ...inv, itens: normalizados });
  }, [inv, catalogoBySlug]);

  const pjSelecionado = pjs?.find((p) => p.id === selectedId);
  const racaPj = pjSelecionado?.raca;

  const slotsState = useMemo(
    () => inv ? getSlotsState(inv.itens, catalogoBySlug, racaPj) : null,
    [inv, catalogoBySlug, racaPj]
  );

  // Containers disponíveis para o item em detalhes
  const instanceDetalhes = inv?.itens.find((it) => it.instanceId === detalhesId);
  const containersDisponiveis = useMemo(() => {
    if (!inv || !instanceDetalhes) return [];
    const itemCat = catalogoBySlug[instanceDetalhes.slug];
    if (!itemCat || ehContainer(itemCat)) return []; // containers não cabem dentro de outros
    return inv.itens.filter((it) => {
      if (it.instanceId === instanceDetalhes.instanceId) return false;
      const c = catalogoBySlug[it.slug];
      if (!ehContainer(c)) return false;
      if (!recipienteAceitaSlug(it, instanceDetalhes.slug, inv.itens, catalogoBySlug)) return false;
      return podeMoverParaContainer(itemCat, c, it, inv.itens, catalogoBySlug).ok;
    });
  }, [inv, instanceDetalhes, catalogoBySlug]);

  // Fechar modal se instância sumiu
  useEffect(() => {
    if (detalhesId && !instanceDetalhes) setDetalhesId(null);
  }, [detalhesId, instanceDetalhes]);
  const instanceContainer = inv?.itens.find((it) => it.instanceId === containerAberto);
  useEffect(() => {
    if (containerAberto && !instanceContainer) setContainerAberto(null);
  }, [containerAberto, instanceContainer]);

  // ── Mutações ─────────────────────────────────────────────────────────────
  // Moedas só são alteradas pelo Mestre (DarMoedasModal) ou via RPC comprar_item.
  // Adição manual de itens removida — jogador adquire itens pela Loja.

  const mudarQtd = (instanceId, delta) => {
    setInv((cur) => ({
      ...cur,
      itens: cur.itens
        .map((it) => {
          if (it.instanceId !== instanceId) return it;
          if (catalogoBySlug[it.slug]?.categoria_equip) return it;
          return { ...it, quantidade: it.quantidade + delta };
        })
        .filter((it) => it.quantidade > 0),
    }));
  };

  const equipar = (instanceId) => {
    // NOTA: equipar/desequipar (armas/armaduras, categoria_equip) NÃO chama
    // aplicarEfeitosItem hoje — no catálogo atual, só itens de Vestimentas
    // (vestir/despir) e Consumíveis (usar) têm efeito_positivo/negativo. Se
    // o catálogo passar a ter efeito em arma/armadura, replicar aqui o
    // mesmo padrão usado em vestir/despir abaixo.
    if (!inv) return { ok: false };
    const idx = inv.itens.findIndex((it) => it.instanceId === instanceId);
    if (idx < 0) return { ok: false };
    const it = inv.itens[idx];
    if (it.equipado) return { ok: false };
    const cat = catalogoBySlug[it.slug];
    if (!cat?.categoria_equip) return { ok: false };
    const slots = getSlotsState(inv.itens, catalogoBySlug, racaPj);
    let targetSlot = null;
    if (cat.categoria_equip === 'armadura') {
      if (!cat.slot_equip) return { ok: false, motivo: 'sem slot definido' };
      if (slots[cat.slot_equip]) return { ok: false, motivo: `slot ${cat.slot_equip} ocupado` };
      if (cat.slot_equip === 'cabeca' || cat.slot_equip === 'pes' || cat.slot_equip === 'pe') {
        if (vesteSlotState(cat.slot_equip, inv.itens, catalogoBySlug).usado > 0) {
          return { ok: false, motivo: `slot ${cat.slot_equip} ocupado por vestimenta` };
        }
      }
      targetSlot = cat.slot_equip;
    } else {
      const maos = getMaosRequeridas(cat, racaPj);
      if (!maos) return { ok: false, motivo: 'proibido para a raça' };
      const livres = (slots.mao_d ? 0 : 1) + (slots.mao_e ? 0 : 1);
      if (livres < maos) return { ok: false, motivo: 'mãos insuficientes' };
      targetSlot = !slots.mao_d ? 'mao_d' : 'mao_e';
    }
    const itens = [...inv.itens];
    let resultId = instanceId;
    if (it.quantidade > 1) {
      itens[idx] = { ...it, quantidade: it.quantidade - 1 };
      resultId = novoInstanceId();
      itens.push({ instanceId: resultId, slug: it.slug, quantidade: 1, equipado: true, slot: targetSlot, containerId: null, observacao: it.observacao || null });
    } else {
      itens[idx] = { ...it, equipado: true, slot: targetSlot, containerId: null };
    }
    setInv({ ...inv, itens });
    if (resultId !== instanceId) setDetalhesId(resultId);
    return { ok: true, newId: resultId };
  };

  const desequipar = (instanceId) => {
    setInv((cur) => ({
      ...cur,
      itens: cur.itens.map((it) => it.instanceId === instanceId ? { ...it, equipado: false, slot: null } : it),
    }));
  };

  // ── Vestir / Despir (grupo "Vestimentas") ──────────────────────────────────
  // Marca vestido:true + vesteSlot, faz split de stack e não ocupa espaço.
  // O slot vem SEMPRE do catálogo (cat.slot_equip) — o jogador não escolhe.
  // Valida capacidade da região e, nos slots compartilhados (cabeca/pes),
  // bloqueia se houver armadura equipada.
  const vestir = (instanceId, slotOverride) => {
    if (!inv) return { ok: false };
    const idx = inv.itens.findIndex((it) => it.instanceId === instanceId);
    if (idx < 0) return { ok: false };
    const it = inv.itens[idx];
    if (it.vestido) return { ok: false };
    const cat = catalogoBySlug[it.slug];
    if (!ehVestimenta(cat)) return { ok: false, motivo: 'não é vestimenta' };
    const slotEquip = slotOverride || inferirSlotEquip(cat);
    const st = vesteSlotState(slotEquip, inv.itens, catalogoBySlug);
    if (!st.cfg) return { ok: false, motivo: 'sem slot definido' };
    if (st.livre < 1) return { ok: false, motivo: `cheio (${st.usado}/${st.max})` };
    // Slots compartilhados (cabeca/pes): não pode haver armadura equipada lá.
    if (st.gastaSlot) {
      const slots = getSlotsState(inv.itens, catalogoBySlug, racaPj);
      if (slots[slotEquip]) return { ok: false, motivo: `slot ${slotEquip} ocupado por equipamento` };
    }
    const itens = [...inv.itens];
    let resultId = instanceId;
    if (it.quantidade > 1) {
      itens[idx] = { ...it, quantidade: it.quantidade - 1 };
      resultId = novoInstanceId();
      itens.push({ instanceId: resultId, slug: it.slug, quantidade: 1, vestido: true, vesteSlot: slotEquip, equipado: false, slot: null, containerId: null, observacao: it.observacao || null });
    } else {
      itens[idx] = { ...it, vestido: true, vesteSlot: slotEquip, equipado: false, slot: null, containerId: null };
    }
    setInv({ ...inv, itens });
    // Vestimenta com efeito (ex.: Reputação) aplica UMA vez ao vestir.
    setEstadoAtual((cur) => aplicarEfeitosItem(cur, cat, 1, maximos));
    if (resultId !== instanceId) setDetalhesId(resultId);
    return { ok: true, newId: resultId };
  };

  const despir = (instanceId) => {
    const it = inv?.itens.find((x) => x.instanceId === instanceId);
    const cat = it ? catalogoBySlug[it.slug] : null;
    setInv((cur) => ({
      ...cur,
      itens: cur.itens.map((it) => it.instanceId === instanceId ? { ...it, vestido: false, vesteSlot: null } : it),
    }));
    // Reverte o efeito aplicado ao vestir (inverte sinal: positivo vira negativo e vice-versa).
    if (cat && (cat.efeito_positivo || cat.efeito_negativo)) {
      setEstadoAtual((cur) => desfazerEfeitosItem(cur, cat, 1, maximos));
    }
  };

  // ── Montar / Desmontar (14/09/2026) ────────────────────────────────────────
  // "As criaturas que podem ser montadas, o jogador poderá clicar no animal no
  // inventário e clicar e montar. Ao montar, aparecerá uma ficha extra da
  // montaria." Montar marca `montado: true` na instância (a ficha lê daí e abre
  // a aba Montaria). Uma montaria por vez: montar outra desmonta a anterior.
  // Pilha se divide como no vestir — monta-se UM cavalo, não a manada.
  const montar = (instanceId) => {
    if (!inv) return { ok: false };
    const idx = inv.itens.findIndex((it) => it.instanceId === instanceId);
    if (idx < 0) return { ok: false };
    const it = inv.itens[idx];
    if (it.montado) return { ok: false };
    if (!criaturaDoItem(catalogoBySlug[it.slug], criaturasMontaria)) return { ok: false, motivo: 'não é montaria' };
    const itens = inv.itens.map((x) => (x.montado ? { ...x, montado: false } : x));
    let resultId = instanceId;
    if (it.quantidade > 1) {
      itens[idx] = { ...itens[idx], quantidade: it.quantidade - 1 };
      resultId = novoInstanceId();
      itens.push({ instanceId: resultId, slug: it.slug, quantidade: 1, montado: true, equipado: false, slot: null, containerId: null, observacao: it.observacao || null });
    } else {
      itens[idx] = { ...itens[idx], montado: true, containerId: null };
    }
    setInv({ ...inv, itens });
    if (resultId !== instanceId) setDetalhesId(resultId);
    return { ok: true, newId: resultId };
  };

  const desmontar = (instanceId) => {
    setInv((cur) => ({
      ...cur,
      itens: cur.itens.map((it) => it.instanceId === instanceId ? { ...it, montado: false } : it),
    }));
  };

  // ── Notificação na Central de Mensagens da Mesa ────────────────────
  // Mesmo padrão de src/11-ficha/ficha.jsx (registrarEventoMesa): dispara
  // a RPC registrar_evento_mesa (SECURITY DEFINER) — grava em mesa_log,
  // Realtime distribui pra Mestre + outros Jogadores da história. Não
  // bloqueia a UI: falha de rede aqui não deve travar o consumo do item,
  // que já foi aplicado localmente (otimista) antes desta chamada.
  const registrarEventoMesa = (tipo, texto, meta) => {
    if (!historiaId) return; // PJ fora de uma história — nada pra notificar
    supabaseClient
      .rpc('registrar_evento_mesa', {
        p_historia_id: historiaId,
        p_tipo: tipo,
        p_texto: texto,
        p_meta: meta || {},
      })
      .then(({ data, error }) => {
        if (error || (data && data.ok === false)) {
          console.error('registrar_evento_mesa falhou:', error || data);
        }
      });
  };

  const usarItem = (instanceId, quantidade = 1) => {
    const it = inv?.itens.find((x) => x.instanceId === instanceId);
    const cat = it ? catalogoBySlug[it.slug] : null;
    setInv((cur) => ({
      ...cur,
      itens: cur.itens
        .map((it) => it.instanceId === instanceId
          ? { ...it, quantidade: it.quantidade - quantidade }
          : it)
        .filter((it) => it.quantidade > 0),
    }));
    if (cat && (cat.efeito_positivo || cat.efeito_negativo)) {
      setEstadoAtual((cur) => aplicarEfeitosItem(cur, cat, quantidade, maximos));
    }
    // Notifica a mesa — só "Usar" gera notificação (Transferir/Armazenar/
    // Descartar, não). Texto combinado: "Victor usou Água". Sem menção a
    // quantidade/efeito por ora — só o nome do PJ e do item, como pedido.
    if (cat) {
      const pjAtual = (pjs || []).find((p) => p.id === selectedId);
      const nomePj = pjAtual ? primeiroNome(pjAtual.nome) : null;
      if (nomePj) {
        const texto = lang === 'en' ? `${nomePj} used ${cat.nome}` : `${nomePj} usou ${cat.nome}.`;
        registrarEventoMesa('item', texto, { item: cat.nome, quantidade, instanceId });
      }
    }
  };

  // Nome do PJ selecionado — usado nos textos do log da mesa.
  const nomeDoPjSelecionado = () => {
    const pjAtual = (pjs || []).find((p) => p.id === selectedId);
    // Só o primeiro nome no log da mesa (27/09/2026).
    return pjAtual ? primeiroNome(pjAtual.nome) : null;
  };

  const destruirItem = (instanceId, quantidade) => {
    /* Descartar vira linha na mesa (15/09/2026, pedido do usuário). Lê o item
       ANTES de mexer no inventário: depois da remoção não há mais o que nomear. */
    const alvo = inv?.itens.find((x) => x.instanceId === instanceId);
    const catAlvo = alvo ? catalogoBySlug[alvo.slug] : null;
    const qtdLog = quantidade ?? (alvo ? alvo.quantidade : 1);
    const nomePjLog = nomeDoPjSelecionado();
    if (catAlvo && nomePjLog) {
      const quanto = qtdLog > 1 ? `${qtdLog}× ` : '';
      const texto = lang === 'en'
        ? `${nomePjLog} discarded ${quanto}${catAlvo.nome}.`
        : `${nomePjLog} descartou ${quanto}${catAlvo.nome}.`;
      registrarEventoMesa('item', texto, { item: catAlvo.nome, quantidade: qtdLog, instanceId, acao: 'descartar' });
    }
    setInv((cur) => {
      const it = cur.itens.find((x) => x.instanceId === instanceId);
      if (!it) return cur;
      const qtdRemover = quantidade ?? it.quantidade;
      // Remoção total: tira o item e seus filhos (se era container)
      if (qtdRemover >= it.quantidade) {
        return { ...cur, itens: cur.itens.filter((x) => x.instanceId !== instanceId && x.containerId !== instanceId) };
      }
      // Remoção parcial: só decrementa
      return { ...cur, itens: cur.itens.map((x) => x.instanceId === instanceId ? { ...x, quantidade: x.quantidade - qtdRemover } : x) };
    });
  };

  /* ENVENENAR (28/09/2026): a conta mora em envenenarNoInventario (01-core),
     pura; aqui ela vira o inventário novo, que o autosave grava. */
  const envenenar = (venenoId, alvoId, qtd) => {
    if (!inv) return { ok: false };
    const r = envenenarNoInventario(inv.itens, venenoId, alvoId, qtd, catalogoBySlug);
    if (r.ok) setInv((cur) => ({ ...cur, itens: r.itens }));
    return r;
  };

  /* ABATER O ANIMAL (28/09/2026): "quando um animal é abatido, seja em
     combate, seja no inventário, ele automaticamente vai virar a carne do seu
     tipo [...] metade do peso total do animal. O item porém não irá para o
     inventário, ele irá para a loja." A conta e o anúncio moram na RPC
     abater_animal (a carne sai do tipo e do peso da CRIATURA ligada ao
     item); aqui o inventário só se relê. A mesa recebe a linha do servidor. */
  const prepararAnimal = async (instanceId) => {
    const { data, error } = await supabaseClient.rpc('abater_animal', {
      p_pj_id: selectedId, p_instance_id: instanceId,
    });
    if (error || !data || !data.ok) return { ok: false, motivo: (data && data.motivo) || (error && error.message) };
    await recarregarInventario();
    return { ok: true, slug: data.slug, quantidade: data.quantidade };
  };

  /* Preparar carne (24/09/2026): 1 carne vira Ração, 2 Refeição, 3 Banquete —
     ver prepararCarne (01-core/inventario-helpers.jsx). A troca vai para o
     log da mesa, como o Usar. */
  const prepararCarneAcao = (instanceId, resultado) => {
    const novos = prepararCarne(inv?.itens, instanceId, resultado);
    if (!novos) return;
    setInv((cur) => ({ ...cur, itens: prepararCarne(cur.itens, instanceId, resultado) || cur.itens }));
    const catPrato = catalogoBySlug[resultado];
    const nomePj = nomeDoPjSelecionado();
    if (catPrato && nomePj) {
      const texto = lang === 'en'
        ? `${nomePj} prepared 1× ${catPrato.nome}.`
        : `${nomePj} preparou 1× ${catPrato.nome}.`;
      registrarEventoMesa('item', texto, { item: catPrato.nome, quantidade: 1, acao: 'preparar' });
    }
  };

  /* Sagração (15/09/2026): o Mestre sobe ou desce o bônus do item na escada
     0 → 1 → 3 → 5 → 7 → 9. Grava na instância; o autosave leva ao banco. */
  const ajustarBonus = (instanceId, direcao) => {
    setInv((cur) => ({
      ...cur,
      itens: cur.itens.map((it) => {
        if (it.instanceId !== instanceId) return it;
        const novo = passoBonusItem(it.bonus, direcao);
        if (novo === bonusDoItem(it)) return it;
        const { bonus, ...resto } = it;
        return novo > 0 ? { ...resto, bonus: novo } : resto;
      }),
    }));
  };

  /* ── DAR ITEM (28/10/2026) ───────────────────────────────────────────────
     "Caso eu como mestre quiser dar um item para um personagem, como eu faço
     isso?" / "Quero uma opção de dar item." (usuário)

     Até aqui um item só entrava no inventário de três jeitos: comprado na
     loja, saqueado na batalha ou transferido por outro personagem. Nenhum
     deles é o Mestre entregando uma recompensa — o mais próximo era pôr o
     item na loja com preço zero e esperar o personagem passar pela cidade.

     Quem dá é o Mestre, e só ele: a ação aparece no trilho do inventário
     apenas quando `isMestre` — o mesmo poder que já deixa ele mexer na
     Sagração. A gravação é o caminho de sempre (`setInv` + o gravador com
     trava de versão), então uma entrega no meio de uma sessão não atropela o
     que o jogador estiver mexendo na ficha.

     A mesa fica sabendo: recompensa dada em silêncio é recompensa que o
     jogador descobre por acaso dias depois. */
  const [darAberto, setDarAberto] = useState(false);
  const darItem = (slug, qtd) => {
    const cat = catalogoBySlug[slug];
    const n = Math.max(1, Math.round(Number(qtd) || 1));
    if (!cat) return;
    setInv((cur) => (cur ? adicionarAoInventario(cur, slug, n) : cur));
    setDarAberto(false);
    avisar((lang === 'en' ? 'Given: ' : 'Entregue: ') + cat.nome + (n > 1 ? ' ×' + n : ''), 'ok');
    const pjAlvo = pjs?.find((p) => p.id === selectedId);
    const nomePj = primeiroNome(pjAlvo?.nome);
    if (nomePj) {
      registrarEventoMesa('item',
        lang === 'en' ? `${nomePj} received ${n}× ${cat.nome} from the Game Master.`
          : `${nomePj} recebeu ${n}× ${cat.nome} do Mestre.`,
        { item: cat.nome, quantidade: n, acao: 'dar' });
    }
  };

  // Fase 3 — mover item para/de container (com split parcial e validação de capacidade)
  /* ARRASTAR NA GRADE (02/10/2026) — casas livres e soltar na mochila.
     O aviso é curto e some sozinho: diz quanto entrou, ou por que não entrou. */
  const [avisoInv, setAvisoInv] = useState(null);
  const avisoTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(avisoTimerRef.current), []);
  const avisar = (texto, tipo) => {
    clearTimeout(avisoTimerRef.current);
    setAvisoInv({ texto, tipo, id: Date.now() });
    avisoTimerRef.current = setTimeout(() => setAvisoInv(null), 3200);
  };
  const moverCasa = (instanceId, casa) => {
    setInv((cur) => {
      if (!cur) return cur;
      const itens = moverParaCasa(cur.itens, instanceId, casa);
      return itens === cur.itens ? cur : { ...cur, itens };
    });
  };
  const guardarArrastando = (instanceId, containerId) => {
    if (!inv) return;
    const en = lang === 'en';
    const r = guardarNoRecipiente(inv.itens, instanceId, containerId, catalogoBySlug);
    const it = inv.itens.find((x) => x.instanceId === instanceId);
    const cont = inv.itens.find((x) => x.instanceId === containerId);
    const nome = (it && catalogoBySlug[it.slug]?.nome) || (it && it.slug) || '';
    const nomeCont = (cont && catalogoBySlug[cont.slug]?.nome) || (cont && cont.slug) || '';
    if (!r.ok) {
      const motivos = {
        recipiente: en ? 'Containers do not go inside other containers.' : 'Recipientes não entram em outros recipientes.',
        a_venda: en ? 'This item is for sale in the shop. Withdraw it first.' : 'Este item está à venda na loja. Retire o anúncio antes.',
        em_uso: en ? 'Take the item off before storing it.' : 'Tire o item do corpo antes de guardá-lo.',
        outro_liquido: en ? `${nomeCont} already holds another liquid.` : `${nomeCont} já guarda outro líquido.`,
        sem_espaco: en ? `No room in ${nomeCont}.` : `Não há espaço em ${nomeCont}.`,
        /* Casa cheia e peso cheio são recusas DIFERENTES (29/10/2026): numa
           sobra espaço e faltam casas, na outra o contrário. Dizer "não há
           espaço" nas duas deixa a pessoa procurando o que não é. */
        sem_casa: en ? `${nomeCont} has no free slot.` : `${nomeCont} está com todas as casas ocupadas.`,
        regra: `${nomeCont}: ${r.texto || ''}`,
      };
      if (motivos[r.motivo]) avisar(motivos[r.motivo], 'recusa');
      return;
    }
    setInv((cur) => (cur ? { ...cur, itens: r.itens } : cur));
    avisar(r.qtd === r.total
      ? (en ? `Stored in ${nomeCont}: ${nome}${r.total > 1 ? ` ×${r.total}` : ''}.` : `Guardado em ${nomeCont}: ${nome}${r.total > 1 ? ` ×${r.total}` : ''}.`)
      : (en ? `Stored in ${nomeCont}: ${r.qtd} of ${r.total} ${nome}. The rest did not fit.`
            : `Guardado em ${nomeCont}: ${r.qtd} de ${r.total} ${nome}. O resto não coube.`), 'ok');
  };

  const moverParaContainer = (instanceId, containerId, quantidade) => {
    setInv((cur) => {
      const itens = [...cur.itens];
      const idx = itens.findIndex((x) => x.instanceId === instanceId);
      if (idx < 0) return cur;
      const it = itens[idx];
      const qtdMover = Math.max(1, Math.min(it.quantidade, quantidade ?? it.quantidade));

      // Se estamos ENTRANDO num container, valida capacidade
      if (containerId) {
        const cont = itens.find((x) => x.instanceId === containerId);
        const catCont = catalogoBySlug[cont?.slug];
        const catItem = catalogoBySlug[it.slug];
        if (!cont || !catCont || !catItem) return cur;
        // Recipiente líquido só guarda um tipo por vez.
        if (!recipienteAceitaSlug(cont, it.slug, itens, catalogoBySlug)) return cur;
        const { livre } = capacidadeContainer(cont, itens, catalogoBySlug);
        const ocupaNecessaria = Number(catItem.ocupa || 0) * qtdMover;
        // Tolerância numérica pra floats (0.0001)
        if (ocupaNecessaria > livre + 0.0001) return cur;
      }

      // Mover tudo: atualiza in-place
      if (qtdMover === it.quantidade) {
        itens[idx] = { ...it, containerId: containerId || null };
      } else {
        // Split: decrementa origem e cria nova entrada no destino
        itens[idx] = { ...it, quantidade: it.quantidade - qtdMover };
        itens.push({
          instanceId: novoInstanceId(),
          slug: it.slug,
          quantidade: qtdMover,
          equipado: false,
          slot: null,
          containerId: containerId || null,
          observacao: it.observacao || null,
        });
      }
      return { ...cur, itens };
    });
  };

  // ── Wrappers que perguntam quantidade quando há mais de 1 em estoque ──
  // (e que validam capacidade do container destino, no caso de "mover")
  /* `qtd` (12/09/2026): a quantidade já escolhida DENTRO da janela do item —
     o seletor inline de usar/descartar/transferir. Vindo, age direto; sem ela
     (chamadas de outros pontos), segue o QuantidadeModal de antes. */
  const solicitarUsar = (instanceId, qtd) => {
    const it = inv?.itens.find((x) => x.instanceId === instanceId);
    if (!it) return;
    if (qtd != null) { usarItem(instanceId, Math.max(1, Math.min(it.quantidade || 1, qtd))); return; }
    if (it.quantidade > 1) {
      setAcaoPendente({ tipo: 'usar', instanceId, max: it.quantidade });
    } else {
      usarItem(instanceId, 1);
    }
  };

  const solicitarDestruir = (instanceId, qtd) => {
    const it = inv?.itens.find((x) => x.instanceId === instanceId);
    if (!it) return;
    if (qtd != null) { destruirItem(instanceId, Math.max(1, Math.min(it.quantidade || 1, qtd))); return; }
    if (it.quantidade > 1) {
      setAcaoPendente({ tipo: 'destruir', instanceId, max: it.quantidade });
    } else {
      destruirItem(instanceId, 1);
    }
  };

  const solicitarMover = (instanceId, containerId, qtd) => {
    const it = inv?.itens.find((x) => x.instanceId === instanceId);
    if (!it) return;
    let maxPossivel = it.quantidade;
    // Se estamos ENTRANDO em container, descobre quanto cabe lá
    if (containerId) {
      const cont = inv.itens.find((x) => x.instanceId === containerId);
      const catItem = catalogoBySlug[it.slug];
      // Recipiente líquido só guarda um tipo por vez — bloqueia silenciosamente.
      if (cont && !recipienteAceitaSlug(cont, it.slug, inv.itens, catalogoBySlug)) return;
      if (cont && catItem) {
        const { livre } = capacidadeContainer(cont, inv.itens, catalogoBySlug);
        const ocupaUnit = Number(catItem.ocupa || 0);
        const cabe = ocupaUnit > 0 ? Math.floor(livre / ocupaUnit) : it.quantidade;
        maxPossivel = Math.min(it.quantidade, cabe);
      }
    }
    if (maxPossivel <= 0) return; // sem espaço — bloqueia silenciosamente
    // Quantidade escolhida no seletor da própria janela (27/09/2026): vai direto,
    // limitada ao que cabe no recipiente.
    if (qtd != null) {
      moverParaContainer(instanceId, containerId, Math.max(1, Math.min(maxPossivel, qtd)));
      return 'feito';
    }
    if (maxPossivel === 1 && it.quantidade === 1) {
      // único, cabe certinho: move direto
      moverParaContainer(instanceId, containerId, 1);
      return 'feito';
    }
    setAcaoPendente({ tipo: 'mover', instanceId, max: maxPossivel, extra: { containerId } });
    return 'pendente';   // a janela do item fecha quando a quantidade for confirmada
  };

  /* TRANSFERIR = ARRASTAR PARA O AMIGO (28/09/2026): "para transferir um item
     para um amigo, só precisa arrastar o item do inventário para o card do
     amigo, ao soltar, será perguntado a quantidade que será enviada. O botão
     transferir do modal do item pode sair, pois este será a única maneira."
     O card do amigo é o AmigosFab (11-ficha/amigos-fab.jsx); só aparece quem
     selou o pacto de amizade, e a RPC transfer_item recusa (sem_pacto) quem
     não selou. A pergunta vem SEMPRE — com um item só, é a confirmação de que
     o soltar foi de propósito. */
  const soltarNoAmigo = (instanceId, pjDestinoId) => {
    const it = inv?.itens.find((x) => x.instanceId === instanceId);
    if (!it || !pjDestinoId) return;
    if (estaAVenda(it)) {
      avisar(lang === 'en' ? 'This item is for sale in the shop. Withdraw it first.' : 'Este item está à venda na loja. Retire o anúncio antes.', 'recusa');
      return;
    }
    setTransferError(null);
    setAcaoPendente({ tipo: 'transferir', instanceId, max: Math.max(1, it.quantidade || 1), extra: { pjDestinoId } });
  };

  // Executa a ação que estava aguardando escolha de quantidade
  const executarAcaoPendente = async (qtd) => {
    if (!acaoPendente) return;
    const { tipo, instanceId, extra } = acaoPendente;
    if (tipo === 'usar')     usarItem(instanceId, qtd);
    if (tipo === 'destruir') destruirItem(instanceId, qtd);
    if (tipo === 'mover')    moverParaContainer(instanceId, extra?.containerId ?? null, qtd);
    if (tipo === 'transferir') {
      // Falhou: a janela fica aberta, com o motivo (transferError) nela.
      const res = await transferirItem(instanceId, extra?.pjDestinoId, null, qtd);
      if (res?.ok) setAcaoPendente(null);
      return;
    }
    setAcaoPendente(null);
    // Confirmou a quantidade (usar, descartar, armazenar, retirar): a janela
    // do item fecha junto (pedido do usuário, 13/09/2026). Cancelar a
    // quantidade não passa por aqui — a janela do item continua aberta.
    setDetalhesId(null);
  };

  // Fase 3 — transferir item entre PJs (chama RPC). Recebe o instanceId
  // explicitamente (usado tanto pela transferência inline quanto por outros pontos).
  // `quantidade` é NOVO (transferência parcial): null/undefined mantém o
  // comportamento de sempre — transfere a pilha inteira. A RPC já limita ao
  // disponível, rejeita < 1 e ignora o parâmetro pra item equipável
  // (instância indivisível) — o cliente só repassa o que o usuário escolheu.
  const transferirItem = async (instanceId, pjDestinoId, moedas, quantidade = null) => {
    setTransferError(null);
    const instance = inv?.itens.find((it) => it.instanceId === instanceId);
    if (!instance) return { ok: false };
    const { data, error } = await supabaseClient.rpc('transfer_item', {
      p_from_pj_id: selectedId,
      p_to_pj_id: pjDestinoId,
      p_instance_id: instanceId,
      p_moedas: moedas && moedasToLatao(moedas) > 0 ? moedas : null,
      p_quantidade: quantidade,
    });
    if (error || !data?.ok) {
      setTransferError(error?.message || data?.motivo || 'Erro desconhecido');
      return { ok: false };
    }
    /* Transferência vira linha na mesa (15/09/2026). Quem recebeu sai de
       pjsHistoria, que é a mesma lista oferecida no modal. */
    const catTransf = catalogoBySlug[instance.slug];
    const nomePjTransf = nomeDoPjSelecionado();
    const destino = (pjsHistoria || []).find((p) => String(p.id) === String(pjDestinoId));
    if (catTransf && nomePjTransf && destino) {
      const nomeDestino = [destino.nome, destino.sobrenome].filter(Boolean).join(' ');
      const qtdTransf = Number(data.quantidade) || quantidade || instance.quantidade || 1;
      const quanto = qtdTransf > 1 ? `${qtdTransf}× ` : '';
      const texto = lang === 'en'
        ? `${nomePjTransf} gave ${quanto}${catTransf.nome} to ${nomeDestino}.`
        : `${nomePjTransf} entregou ${quanto}${catTransf.nome} para ${nomeDestino}.`;
      registrarEventoMesa('item', texto, {
        item: catTransf.nome, quantidade: qtdTransf, instanceId, acao: 'transferir',
        destino_pj_id: destino.id, destino_nome: nomeDestino,
      });
    }
    // Recarregar todos os PJs do usuário para refletir ambos os inventários
    const { data: pjsAtualizados } = await supabaseClient
      .from('personagens')
      .select(PJ_COLS)
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: true });
    if (pjsAtualizados) {
      setPjs(pjsAtualizados);
      // O banco mudou por uma RPC: quem não tem gravação pendente recarrega
      // a base; quem tem, mescla na próxima gravação (02/10/2026).
      const g = gravadorRef.current;
      pjsAtualizados.forEach((p) => { if (!g.sujo(p.id)) g.carregar(p.id, invComPadroes(p.inventario), p.inventario_versao); });
      // Atualizar inv local do PJ remetente
      const pjAtual = pjsAtualizados.find((p) => p.id === selectedId);
      if (pjAtual) setInv(g.atual(pjAtual.id));
    }
    return { ok: true };
  };

  // Relê os PJs e o inventário do selecionado — depois de uma mudança feita no
  // servidor (item publicado na loja).
  const recarregarInventario = async () => {
    const { data: pjsAtualizados } = await supabaseClient
      .from('personagens')
      .select(PJ_COLS)
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: true });
    if (pjsAtualizados) {
      setPjs(pjsAtualizados);
      // O banco mudou por uma RPC: quem não tem gravação pendente recarrega
      // a base; quem tem, mescla na próxima gravação (02/10/2026).
      const g = gravadorRef.current;
      pjsAtualizados.forEach((p) => { if (!g.sujo(p.id)) g.carregar(p.id, invComPadroes(p.inventario), p.inventario_versao); });
      const pjAtual = pjsAtualizados.find((p) => p.id === selRef.current);
      if (pjAtual) setInv(g.atual(pjAtual.id));
    }
  };

  /* VENDER = PUBLICAR NA LOJA (27/09/2026): "o jogador irá 'publicar' os itens
     na loja pelo preço que ele quiser, outros jogadores ou o mestre podem
     comprar dele. A ação não precisa acontecer na mesma hora, o item ficará na
     loja da aventura." O item sai do inventário no servidor (RPC
     publicar_item_loja) e fica reservado no anúncio até alguém comprar ou o
     dono retirar — então o inventário é relido. */
  /* VENDER = PROPOR AO COMERCIANTE (23/10/2026): o jogador diz onde vende
     (a cidade onde está, de saída) e quanto pede; o Mestre aceita,
     contrapropõe ou recusa. Aceito, o item entra na loja daquela cidade. */
  const publicarNaLoja = async (instanceId, quantidade, precoLatao, lugar) => {
    const { data, error } = await supabaseClient.rpc('propor_venda_loja', {
      p_pj_id: selectedId, p_instance_id: instanceId,
      p_quantidade: quantidade, p_preco_latao: precoLatao, p_lugar: lugar || lugarAtual || null,
    });
    if (error || !data || !data.ok) return { ok: false, motivo: (data && data.motivo) || (error && error.message) };
    await recarregarInventario();
    return { ok: true };
  };

  // Aprender magia com um item (22/10/2026): pergaminho ou livro, um nível
  // por vez, sem consumir (RPC aprender_magia — confere estágio, texto do
  // nível e pontos). Recarrega o PJ porque as magias vivem fora do inventário.
  /* Técnica ou magia (22/10/2026): as duas entram na fila de treino. */
  const aprenderComItem = async (instanceId, alvo) => {
    const ehTec = alvo && alvo.tipo === 'tecnica';
    const { data, error } = await supabaseClient.rpc(ehTec ? 'aprender_tecnica' : 'aprender_magia', ehTec
      ? { p_pj_id: selectedId, p_instance_id: instanceId, p_tecnica_key: alvo.key }
      : { p_pj_id: selectedId, p_instance_id: instanceId, p_magia_key: alvo && alvo.key });
    if (error || !data?.ok) {
      return { ok: false, motivo: error?.message || data?.motivo || 'erro_desconhecido' };
    }
    const { data: pjsAtualizados } = await supabaseClient
      .from('personagens')
      .select(PJ_COLS)
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: true });
    if (pjsAtualizados) {
      setPjs(pjsAtualizados);
      // O banco mudou por uma RPC: quem não tem gravação pendente recarrega
      // a base; quem tem, mescla na próxima gravação (02/10/2026).
      const g = gravadorRef.current;
      pjsAtualizados.forEach((p) => { if (!g.sujo(p.id)) g.carregar(p.id, invComPadroes(p.inventario), p.inventario_versao); });
      const pjAtual = pjsAtualizados.find((p) => p.id === selectedId);
      if (pjAtual) setInv(g.atual(pjAtual.id));
    }
    return { ok: true, magiaNome: data.magia_nome, nivel: data.nivel };
  };

  // Cálculo derivado — peso/carga (medidor único). O armazenamento por
  // container continua sendo tratado pelo capacidadeContainer (intacto).
  const carga = useMemo(() => {
    const pjSel = pjs?.find((p) => p.id === selectedId);
    // Força/Físico com a sub-raça aplicada (Vampiro/Lobisomem, 22/10/2026).
    const atr = pjSel ? atributosEfetivosPJ(pjSel) : {};
    return calcCarga(inv?.itens, catalogoBySlug, atr.forca, atr.fisico);
  }, [inv, catalogoBySlug, pjs, selectedId]);

  // ── Render ────────────────────────────────────────────────
  if (pjs === null || catalogo === null) {
    return <Carregando lang={lang} />;
  }
  if (error) {
    return (
      <div className="admin-error">
        <div className="err-msg">{error}</div>
        <div className="admin-error-hint">
          {lang === 'en'
            ? "Make sure tables 'itens' and column 'inventario' exist in Supabase."
            : "Confira se a tabela 'itens' e a coluna 'inventario' existem no Supabase."}
        </div>
      </div>
    );
  }

  return (
    <div className="inv">
      {!pjIdFixo && pjs.length > 1 && (
        <div className="inv-pj-tabs">
          {pjs.map((pj) => (
            <button key={pj.id} className={'inv-pj-tab' + (pj.id === selectedId ? ' active' : '')}
              onClick={() => setSelectedId(pj.id)}>
              {pj.nome} {pj.sobrenome || ''}
            </button>
          ))}
        </div>
      )}

      {inv && (
        <>
          {/* A bolsa foi para o trilho, ao lado da busca, e a carga desceu para o
              rodapé (23/10/2026) — ver BauCargaRodape, depois da grade. */}
          <div className={'bau-corpo' + (bauLargo ? ' bau-corpo--painel' : '')}>
          <InvItemsTable
            itens={inv.itens}
            catalogoBySlug={catalogoBySlug}
            mudarQtd={mudarQtd}
            onAbrirDetalhes={(id) => { setVoltarPara(null); setDetalhesId(id); }}
            onAbrirContainer={(id) => setContainerAberto(id)}
            onSoltarNoAmigo={authUserIsOwner ? soltarNoAmigo : null}
            lang={lang}
            onMoverCasa={moverCasa}
            onGuardarEm={guardarArrastando}
            compacta
            selecionadoId={bauLargo ? detalhesId : null}
            moedasNoTrilho={<MoedaPills moedas={inv.moedas} lang={lang} mostrarZeros tamanho="sm" />}
            acaoNoTrilho={isMestre ? (
              <button type="button" className="mc-acao inv-dar-acao" onClick={() => setDarAberto(true)}>
                <i className="ti ti-gift" aria-hidden="true" />
                <span className="mc-acao-rotulo">{lang === 'en' ? 'Give item' : 'Dar item'}</span>
              </button>
            ) : null}
          />
          {bauLargo && (
            <aside className="bau-painel" ref={setPainelEl} aria-label={lang === 'en' ? 'Item' : 'Item'}>
              {!(detalhesId && instanceDetalhes) && (
                <div className="bau-painel-vazio">
                  <i className="ti ti-hand-click" aria-hidden="true" />
                  <p>{lang === 'en'
                    ? 'Choose an item to see it here. Drag to move it; drop it on a container to store it.'
                    : 'Escolha um item para vê-lo aqui. Arraste para mudar de lugar; solte sobre um recipiente para guardar.'}</p>
                </div>
              )}
            </aside>
          )}
          </div>
          <BauCargaRodape carga={carga} lang={lang} />
          {avisoInv && (
            <div key={avisoInv.id} className={'inv-aviso inv-aviso--' + avisoInv.tipo} role="status">
              <i className={'ti ' + (avisoInv.tipo === 'ok' ? 'ti-package-import' : 'ti-alert-triangle')} aria-hidden="true" />
              <span>{avisoInv.texto}</span>
            </div>
          )}
        </>
      )}

      {/* <div className="inv-save-status" data-state={saving}>
        {saving === 'saving' && (lang === 'en' ? 'Saving…' : 'Salvando…')}
        {saving === 'saved'  && (lang === 'en' ? 'Saved ✓'  : 'Salvo')}
        {saving === 'error'  && (lang === 'en' ? 'Save failed' : 'Falha ao salvar')}
      </div> */}

      {detalhesId && instanceDetalhes && (!bauLargo || painelEl) && (
        <DetalhesItemModal
          key={bauLargo ? detalhesId : undefined}
          alvoPainel={bauLargo ? painelEl : null}
          instance={instanceDetalhes}
          catalogoBySlug={catalogoBySlug}
          raca={racaPj}
          slotsState={slotsState}
          todosItens={inv.itens}
          containersDisponiveis={containersDisponiveis}
          pjsHistoria={pjsHistoria}
          lang={lang}
          onClose={() => { setVoltarPara(null); setDetalhesId(null); }}
          onVoltar={voltarPara ? () => {
            const volta = voltarPara;
            setVoltarPara(null);
            setDetalhesId(null);
            if (volta.tipo === 'container') setContainerAberto(volta.id);
            else setDetalhesId(volta.id);
          } : undefined}
          onEquipar={equipar}
          onDesequipar={desequipar}
          onVestir={vestir}
          onDespir={despir}
          onUsar={solicitarUsar}
          onPreparar={prepararAnimal}
          onPrepararCarne={prepararCarneAcao}
          criaturaMontaria={criaturaDoItem(catalogoBySlug[instanceDetalhes.slug], criaturasMontaria)}
          onMontar={montar}
          onDesmontar={desmontar}
          onAprenderMagia={authUserIsOwner ? aprenderComItem : undefined}
          pjAprendiz={(pjs || []).find((x) => x.id === selectedId) || null}
          usuario={(() => { const p = (pjs || []).find((x) => x.id === selectedId); return p ? { nome: [p.nome, p.sobrenome].filter(Boolean).join(' '), foto_url: p.foto_url } : null; })()}
          magiasDb={magiasDb}
          tecnicasDb={tecnicasDb}
          vinculos={vinculos}
          podeVender={{ ehDono: authUserIsOwner, historiaId }}
          onVender={publicarNaLoja}
          lugarAtual={lugarAtual}
          /* A proposta em andamento (cancelar; aceitar ou recusar a contraproposta). */
          onProposta={authUserIsOwner ? async (acao, anuncioId) => {
            const { data, error } = acao === 'cancelar'
              ? await supabaseClient.rpc('retirar_item_loja', { p_anuncio_id: anuncioId })
              : await supabaseClient.rpc('responder_contraproposta', { p_anuncio_id: anuncioId, p_aceitar: acao === 'aceitar' });
            await recarregarInventario();
            if (error || !data || !data.ok) return { ok: false, motivo: (data && data.motivo) || (error && error.message) };
            setDetalhesId(null);
            return { ok: true };
          } : null}
          /* TRANSFERIR de volta à janela do item (23/10/2026): "Eu não vi o
             botão de ação de transferir item de personagem." Arrastar até o
             card do amigo continua valendo; o botão é o caminho à vista. */
          pjOrigemId={authUserIsOwner ? selectedId : null}
          onTransferir={authUserIsOwner ? (inst, destino) => { setDetalhesId(null); soltarNoAmigo(inst, destino); } : null}
          onEnvenenar={envenenar}
          onDestruir={solicitarDestruir}
          onBonus={isMestre ? ajustarBonus : undefined}
          onMoverParaContainer={solicitarMover}
          onRemoverDoContainer={(id) => solicitarMover(id, null)}
          onAbrirDetalhesFilho={(id) => { setVoltarPara({ tipo: 'item', id: detalhesId }); setDetalhesId(id); }}
        />
      )}

      {containerAberto && instanceContainer && (
        <ContainerModal
          containerInst={instanceContainer}
          catalogoBySlug={catalogoBySlug}
          todosItens={inv.itens}
          lang={lang}
          onClose={() => setContainerAberto(null)}
          onRemoverDoContainer={(id) => solicitarMover(id, null)}
          onAbrirDetalhes={(id) => {
            setVoltarPara({ tipo: 'container', id: containerAberto });
            setContainerAberto(null);
            setDetalhesId(id);
          }}
          onMoverCasa={moverCasa}
        />
      )}

      {/* A janela de dar item (28/10/2026): só o Mestre a abre — ver darItem. */}
      {darAberto && isMestre && (
        <DarItemModal
          catalogo={catalogo}
          lang={lang}
          onDar={darItem}
          onClose={() => setDarAberto(false)}
        />
      )}

      {acaoPendente && (() => {
        const it = inv?.itens.find((x) => x.instanceId === acaoPendente.instanceId);
        const cat = it ? catalogoBySlug[it.slug] : null;
        const nome = cat?.nome || it?.slug || '';
        const destino = (pjsHistoria || []).find((p) => String(p.id) === String(acaoPendente.extra?.pjDestinoId));
        const nomeDestino = destino ? destino.nome : (lang === 'en' ? 'your friend' : 'seu amigo');
        const titulosPt = {
          usar:       `Usar ${nome}`,
          destruir:   `Destruir ${nome}`,
          mover:      acaoPendente.extra?.containerId
            ? `Armazenar ${nome}`
            : `Retirar ${nome}`,
          transferir: `Enviar ${nome} para ${nomeDestino}`,
        };
        const titulosEn = {
          usar:       `Use ${nome}`,
          destruir:   `Destroy ${nome}`,
          mover:      acaoPendente.extra?.containerId
            ? `Store ${nome}`
            : `Take out ${nome}`,
          transferir: `Send ${nome} to ${nomeDestino}`,
        };
        const t = (lang === 'en' ? titulosEn : titulosPt)[acaoPendente.tipo];
        return (
          <QuantidadeModal
            titulo={t}
            max={acaoPendente.max}
            lang={lang}
            irreversivel={acaoPendente.tipo === 'usar' || acaoPendente.tipo === 'destruir'}
            erro={acaoPendente.tipo === 'transferir' && transferError ? motivoTransferenciaLabel(transferError, lang === 'en') : null}
            onConfirm={executarAcaoPendente}
            onCancel={() => {
              setAcaoPendente(null);
            }}
          />
        );
      })()}
    </div>
  );
}

// ── MoedaPills — ícone Tabler ti-coins padrão, cor por denominação ───────────
//
// Props:
//   moedas         — { ouro, prata, cobre, latao }
//   lang           — 'pt' | 'en'
//   mostrarGratis  — true: quando o saldo total = 0, mostra a pílula fantasma
//                    "Grátis" (ti-coins em azul claro).
//   mostrarZeros   — true: sempre renderiza as 4 denominações; uma denominação
//                    zerada fica apagada (is-zero). Default false.
//
// Toda denominação usa o MESMO glifo `ti-coins`; o que distingue ouro/prata/
// cobre/latão é a cor (MOEDA_COR) + o nome.

const MOEDA_COR = {
  ouro:  '#d9af45',
  prata: '#aebccd',
  cobre: '#aa5626',
  latao: '#3fb858',
  gratis: '#5FC1F0',
};

// ── MoedaPill / MoedaPills — PADRÃO NOVO de exibição de moeda ──────────────────
// Pílula única por denominação: [ícone ti-coins colorido] Nome ×qtd.
// Renderizador CANÔNICO de moeda do app — cofre, board, preço da loja, modais de
// compra e tabelas (bestiário) passam todos por aqui, pra manter UM padrão só.
//
// Props (MoedaPills):
//   moedas        — { ouro, prata, cobre, latao }   (ou informe `latao`)
//   latao         — total em latões; convertido via latoesToMoedas (alt. a `moedas`)
//   lang          — 'pt' | 'en'
//   mostrarGratis — saldo 0 → pílula "Grátis"/"Free"
//   mostrarZeros  — sempre as 4 denominações (zeradas ganham .is-zero)
//   mudo          — tom apagado (ex.: card esgotado na loja)
//   tamanho       — 'sm' compacto (tabelas/inline); undefined = padrão
const MOEDA_PILL_NOMES = {
  pt: { ouro: 'Ouro', prata: 'Prata', cobre: 'Cobre', latao: 'Latão' },
  en: { ouro: 'Gold', prata: 'Silver', cobre: 'Copper', latao: 'Brass' },
};

function MoedaPill({ tipo, qtd, lang, zerado, mudo, tamanho }) {
  const [tip, abrirTip, fecharTip, manterTip] = usePortalTooltip(60);
  const en = lang === 'en';
  const nome = MOEDA_PILL_NOMES[en ? 'en' : 'pt'][tipo];
  return (
    <span
      className={'moeda-pill moeda-pill--' + tipo
        + (zerado ? ' is-zero' : '')
        + (mudo ? ' is-mudo' : '')
        + (tamanho ? ' moeda-pill--' + tamanho : '')}
      {...propsTip(abrirTip, fecharTip, nome)}>
      <i
        className="ti ti-coins moeda-pill-ic"
        style={{ color: MOEDA_COR[tipo] }}
        aria-hidden="true"
      />
      <span className="moeda-pill-nome">{nome}</span>
      <span className="moeda-pill-qtd"><span className="moeda-pill-x"></span>{(qtd || 0).toLocaleString(en ? 'en-US' : 'pt-BR')}</span>
      <PortalTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </span>
  );
}

function MoedaPills({ moedas, latao, lang, mostrarGratis, mostrarZeros, mudo, tamanho }) {
  const en = lang === 'en';
  const m = moedas
    || (latao != null ? latoesToMoedas(Math.max(0, Math.round(latao))) : null)
    || { ouro: 0, prata: 0, cobre: 0, latao: 0 };
  const total = MOEDA_ORDEM.reduce((s, t) => s + (m?.[t] || 0), 0);

  if (total === 0 && mostrarGratis) {
    return (
      <span className="moeda-pills">
        <span
          className={'moeda-pill moeda-pill--gratis'
            + (mudo ? ' is-mudo' : '')
            + (tamanho ? ' moeda-pill--' + tamanho : '')}>
          <i className="ti ti-coins moeda-pill-ic" aria-hidden="true" />
          <span className="moeda-pill-nome">{en ? 'Free' : 'Grátis'}</span>
          <span className="moeda-pill-qtd"><span className="moeda-pill-x"></span>0</span>
        </span>
      </span>
    );
  }

  const tipos = mostrarZeros
    ? MOEDA_ORDEM
    : MOEDA_ORDEM.filter((t) => (m?.[t] || 0) > 0);
  const visiveis = tipos.length > 0 ? tipos : ['latao'];

  return (
    <span className="moeda-pills">
      {visiveis.map((tipo) => (
        <MoedaPill
          key={tipo}
          tipo={tipo}
          qtd={m?.[tipo] || 0}
          lang={lang}
          zerado={(m?.[tipo] || 0) === 0}
          mudo={mudo}
          tamanho={tamanho}
        />
      ))}
    </span>
  );
}

// ── CabecalhoInvLoja — topo padronizado de Inventário e Loja ──────────────────

/* ── BauTopo — carga e bolsa no alto do inventário (22/10/2026) ──────────────
   O peso tinha saído do inventário (ficava só na ficha); no "Baú com painel"
   voltou para o lugar onde se decide o que carregar, junto das moedas. A cor
   da barra: musgo normal, ouro a partir de 75%, brasa acima da capacidade. */
/* A CARGA NO RODAPÉ (23/10/2026): "A barra de carga deve ocupar a página
   toda, e ficar no rodapé igual a experiência na ficha do personagem." O
   rótulo à esquerda, a barra de ponta a ponta e o número à direita. */
function BauCargaRodape({ carga, lang }) {
  const en = lang === 'en';
  const pct = Math.max(0, Math.min(100, carga.pct || 0));
  const nivel = carga.over ? 'over' : (carga.pct > 75 ? 'pesado' : 'ok');
  return (
    <div className="bau-carga-rodape">
      <span className="bau-carga-rot">{en ? 'Load' : 'Carga'}</span>
      <span className="bau-carga-barra" role="meter" aria-label={en ? 'Load' : 'Carga'}
        aria-valuemin={0} aria-valuemax={Math.round(carga.capacidade)} aria-valuenow={Math.round(carga.peso)} data-nivel={nivel}>
        <span style={{ width: pct + '%' }} />
      </span>
      {carga.over && <span className="bau-carga-aviso">{en ? 'Overloaded' : 'Sobrecarregado'}</span>}
      <span className="bau-carga-num">{fmtNum(carga.peso)}<span>/{fmtNum(carga.capacidade)}</span></span>
    </div>
  );
}

function BauTopo({ carga, moedas, lang, semBolsa = false }) {
  const en = lang === 'en';
  const pct = Math.max(0, Math.min(100, carga.pct || 0));
  const nivel = carga.over ? 'over' : (carga.pct > 75 ? 'pesado' : 'ok');
  return (
    <div className="bau-topo">
      <div className="bau-carga">
        <span className="mn-rotulo">{en ? 'Load' : 'Carga'}</span>
        <span className="bau-carga-barra" role="meter" aria-label={en ? 'Load' : 'Carga'}
          aria-valuemin={0} aria-valuemax={Math.round(carga.capacidade)} aria-valuenow={Math.round(carga.peso)} data-nivel={nivel}>
          <span style={{ width: pct + '%' }} />
        </span>
        <span className="bau-carga-num">{fmtNum(carga.peso)}<span> / {fmtNum(carga.capacidade)}</span></span>
        {carga.over && <span className="bau-carga-aviso">{en ? 'Overloaded' : 'Sobrecarregado'}</span>}
      </div>
      {!semBolsa && (
        <div className="bau-bolsa">
          <span className="mn-rotulo">{en ? 'Purse' : 'Bolsa'}</span>
          <MoedaPills moedas={moedas} lang={lang} mostrarZeros tamanho="sm" />
        </div>
      )}
    </div>
  );
}

/* O painel ao lado só cabe a partir desta largura de janela. */
function useBauLargo() {
  const q = '(min-width: 1180px)';
  const [largo, setLargo] = React.useState(() => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(q).matches);
  React.useEffect(() => {
    if (!window.matchMedia) return undefined;
    const m = window.matchMedia(q);
    const f = () => setLargo(m.matches);
    m.addEventListener ? m.addEventListener('change', f) : m.addListener(f);
    return () => { m.removeEventListener ? m.removeEventListener('change', f) : m.removeListener(f); };
  }, []);
  return largo;
}

function CabecalhoInvLoja({ carga, lang }) {
  const en = lang === 'en';
  const pesoCls = carga.over ? ' over' : (carga.pct > 75 ? ' pesado' : '');
  const [tip, abrirTip, fecharTip, manterTip] = usePortalTooltip(80);
  const pesoTip = {
    title: en ? 'Weight' : 'Peso',
    stats: [
      { label: en ? 'Carried' : 'Carregando', value: fmtNum(carga.peso) },
      { label: en ? 'Capacity' : 'Capacidade', value: fmtNum(carga.capacidade) },
    ],
    desc: carga.over
      ? (en ? 'Overloaded!' : 'Sobrecarregado!')
      : carga.pct > 75
        ? (en ? 'Heavy load' : 'Carga pesada')
        : null,
  };
  // Cor da barra: vermelho (over) → ember/laranja (pesado) → musgo (normal)
  const barColor = carga.over ? '#B8472F' : carga.pct > 75 ? '#C9892E' : '#7A9550';

  // Barra de peso removida de inventário e loja (agora exibida na ficha do PJ).
  return null;
}

// ── EquipadoBoard — quadro de slots equipados (paper-doll) ────────────────────
// Lê os itens com `slot` definido e os dispõe na ordem canônica SLOT_ORDER.
// Slot preenchido abre o DetalhesItemModal (onAbrir); slot vazio é só visual.
function EquipadoBoard({ itens, catalogoBySlug, lang, onAbrir }) {
  const en = lang === 'en';
  const slotLabels = SLOT_LABELS[en ? 'en' : 'pt'] || {};
  const bySlot = {};
  for (const it of (itens || [])) { if (it.slot) bySlot[it.slot] = it; }

  const [tip, abrirTip, fecharTip, manterTip] = usePortalTooltip(80);

  return (
    <div className="inv-eq-board">
      <div className="inv-divider">
        <span className="inv-divider-ln" />
        <span className="inv-divider-lbl">
          <i className="ti ti-shield" aria-hidden="true" />
        </span>
        <span className="inv-divider-ln" />
      </div>
      <div className="inv-bag-grouphead">
        <i className="ti ti-shield" aria-hidden="true" />
        <span className="inv-bag-grp-name">{en ? 'Armor' : 'Armaduras'}</span>
        <span className="inv-bag-grp-count">{Object.keys(bySlot).length}</span>
      </div>
      <div className="inv-eq-grid">
        {SLOT_ORDER.map((slot) => {
          const it = bySlot[slot];
          const cat = it ? catalogoBySlug[it.slug] : null;
          const filled = !!it;
          const nome = cat ? cat.nome : (it ? it.slug : '');
          const slotLabel = slotLabels[slot] || slot;
          const tipContent = filled && cat ? {
            desc: cat.descricao || null,
            clamp: true,
          } : <span style={{ fontFamily: "var(--font-body)", fontSize: 'var(--fs-sm)', color: 'var(--tinta)' }}>{slotLabel}</span>;   // slot vazio → React element com Lora
          return (
            <button
              key={slot}
              type="button"
              className={'inv-slot' + (filled ? ' filled' : ' empty')}
              onClick={filled ? () => onAbrir(it.instanceId) : undefined}
              style={!filled ? { cursor: 'default' } : undefined}
              onMouseEnter={(e) => abrirTip(e, tipContent)}
              onMouseLeave={fecharTip}
              onFocus={(e) => abrirTip(e, tipContent)}
              onBlur={fecharTip}>
              <span className="inv-slot-ic">
                <i className={'ti ' + (filled ? invItemIcon(cat) : 'ti-shield-exclamation')} aria-hidden="true" />
              </span>
              <span className="inv-slot-meta">
                <span className="inv-slot-lbl">{slotLabel}</span>
                <span className="inv-slot-item">{filled ? nome : ''}</span>
              </span>
            </button>
          );
        })}
      </div>
      <PortalTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </div>
  );
}

// ── VestesBoard — seção "Vestes" (vestimentas vestidas) ───────────────────────
// Mesmo padrão visual do EquipadoBoard: cards alinhados em grade, cada um com o
// rótulo do slot (pequeno) + nome. Sem cabeçalhos de contagem. Múltiplas peças
// do mesmo slot ficam adjacentes (ordenadas pela ordem canônica das regiões).
function VestesBoard({ itens, catalogoBySlug, lang, onAbrir }) {
  const [tip, abrirTip, fecharTip, manterTip] = usePortalTooltip(60);
  const en = lang === 'en';
  const slotLabels = SLOT_LABELS[en ? 'en' : 'pt'] || {};
  const vestidas = (itens || []).filter((it) => it.vestido);
  if (vestidas.length === 0) return null;
  const ordem = ['cabeca', 'orelha', 'pescoco', 'colar', 'ombros', 'peito', 'bracos', 'capa', 'cintura', 'maos', 'pernas', 'pes', 'joia', 'dedos'];
  const ordOf = (it) => { const i = ordem.indexOf(vesteSlotDe(it.vesteSlot)); return i < 0 ? 99 : i; };
  const lista = [...vestidas].sort((a, b) => ordOf(a) - ordOf(b));

  return (
    <div className="inv-eq-board">
      <div className="inv-divider">
        <span className="inv-divider-ln" />
        <span className="inv-divider-lbl"><i className="ti ti-shirt" aria-hidden="true" /></span>
        <span className="inv-divider-ln" />
      </div>
      <div className="inv-bag-grouphead">
        <i className="ti ti-shirt" aria-hidden="true" />
        <span className="inv-bag-grp-name">{en ? 'Worn' : 'Vestimentas'}</span>
        <span className="inv-bag-grp-count">{lista.length}</span>
      </div>
      <div className="inv-eq-grid">
        {lista.map((it) => {
          const cat = catalogoBySlug[it.slug];
          const nome = cat ? cat.nome : it.slug;
          const slotLbl = slotLabels[vesteSlotDe(it.vesteSlot)] || it.vesteSlot || '';
          return (
            <button key={it.instanceId} type="button" className="inv-slot filled"
              onClick={() => onAbrir(it.instanceId)} {...propsTip(abrirTip, fecharTip, nome)}>
              <span className="inv-slot-ic">
                <i className={'ti ' + invItemIcon(cat)} aria-hidden="true" />
              </span>
              <span className="inv-slot-meta">
                <span className="inv-slot-lbl">{slotLbl}</span>
                <span className="inv-slot-item">{nome}</span>
              </span>
            </button>
          );
        })}
      </div>
      <PortalTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </div>
  );
}

// ── InvItemsTable — Mochila Visual: grid flat com busca + chips de categoria ───
// Mantém o mesmo nome/props de antes (chamado por InventarioList e pela ficha).
// A "bolsa" mostra TODOS os itens fora de container — soltos, equipados
// (it.slot) e vestidos (it.vestido) convivem no mesmo grid; um pill no canto
// do card ("eq"/ti-shield para equipado, "vst"/ti-shirt para vestido) marca
// o que está em uso, pro jogador não confundir com um item solto na mochila.
// Só o que está DENTRO de container fica de fora daqui (tem tela própria: o
// ContainerModal).
// Layout flat (sem agrupamento por categoria) com busca + chips, igual à loja.
// Hook que observa o tamanho do container ref e do scroll-container (.mc-main)
// para calcular quantas colunas e linhas de slots cabem na área visível.
/* SLOT_SIZE = a casa + o vão. O tamanho da casa vive no CSS (--inv-casa, em
   src/index.css) porque é lá que a grade e o cartão o usam; aqui ele é LIDO,
   e não repetido — escrever 64 nos dois lugares é exatamente o jeito de um
   ficar para trás do outro. Sem o CSS carregado (teste em jsdom), vale o
   padrão de 64 + 6. */
// Calibrado para 19 itens por linha.
function medirCasaDoBau(el) {
  const padrao = { casa: 64, vao: 6 };
  if (typeof window === 'undefined' || !window.getComputedStyle) return padrao;
  const cs = window.getComputedStyle(el || document.documentElement);
  const casa = parseFloat(cs.getPropertyValue('--inv-casa'));
  const vao = parseFloat(cs.getPropertyValue('--inv-casa-vao'));
  return { casa: casa || padrao.casa, vao: Number.isFinite(vao) ? vao : padrao.vao };
}
/* O BAÚ DE 8 × 10 (26/10/2026). Foram dois pedidos do usuário no mesmo dia:
   primeiro "10 linhas e 12 colunas, ganhando espaço para aumentar a
   visualização do item à direita", depois "aumentar o tamanho do slot […]
   talvez diminuindo a quantidade de casas para isso, pode ser 10x8". Menos
   casas, casas maiores (--inv-casa: 78px): a grade ocupa a mesma largura e o
   ícone cresce. São TETOS, não números fixos — em tela estreita a grade
   continua encolhendo em vez de vazar. */
const MAX_GRID_COLS = 10;
// offsetExtra: altura extra a descontar dentro do ref antes do grid
// (ex: toolbar de busca ~48px na loja).
// Teto de linhas da grade: o preenchimento com slots fantasmas para em
// MAX_GRID_ROWS linhas em vez de descer pela viewport inteira. Itens reais
// acima desse teto continuam renderizando (a grade cresce), só o "chão" de
// células vazias é limitado. Compartilhado por Inventário e Loja (loja.jsx usa
// window.useGridDimensions). O Diário tem cópia própria deste teto.
const MAX_GRID_ROWS = 8;
// Linhas mínimas da grade do baú — Inventário e vitrine da Loja (23/10/2026).
const LINHAS_BAU = 8;
// useGridDimensions — calcula quantas colunas/linhas de slots (50px) cabem na
// área visível, preenchendo todo o espaço do .mc-main (scroll container).
//
// Usa CALLBACK REF (setGridEl) em vez de useRef + useEffect[]. Isso é o que
// torna o hook robusto e idêntico entre Inventário (grid monta sync) e Loja
// (grid monta async, depois da RPC get_loja_pj): o ResizeObserver é anexado no
// exato momento em que o elemento entra no DOM, qualquer que seja o timing.
// Retorna [setGridEl, dims] — espalhe setGridEl como `ref` no <div> do grid.
/* O ÍCONE DO ITEM (23/10/2026): a pintura do equipamento quando o item tem
   uma (window.arteDoItem, 11-ficha), o glifo do Tabler quando não. Usado no
   inventário, na loja e no estoque do Mestre. */
function ItemIcone({ cat, icon }) {
  const arte = cat && typeof window !== 'undefined' && window.arteDoItem ? window.arteDoItem(cat) : null;
  return arte
    ? <img className="inv-card-arte" src={arte} alt="" draggable="false" />
    : <i className={'ti ' + icon} aria-hidden="true" />;
}
function useGridDimensions() {
  const [dims, setDims] = React.useState({ cols: 7, rows: 4, totalSlots: 28 });
  const elRef = React.useRef(null);
  const roRef = React.useRef(null);

  const calc = React.useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    // Largura: o grid tem width:100%, então clientWidth é a largura cheia do
    // container. 8px = padding interno (4px de cada lado) da grade.
    const w = el.clientWidth - 8;
    // Altura: sobe o DOM até .mc-main (height:100%, overflow-y:auto). Medir
    // contra ele (e não contra window.innerHeight) é o método robusto usado
    // pelo inventário — funciona mesmo com scroll ou padding no shell.
    let mcMain = el.parentElement;
    while (mcMain && !mcMain.classList.contains('mc-main')) {
      mcMain = mcMain.parentElement;
    }
    const containerH = mcMain ? mcMain.clientHeight : window.innerHeight;
    const elTop = mcMain
      ? (el.getBoundingClientRect().top - mcMain.getBoundingClientRect().top)
      : el.getBoundingClientRect().top;
    const h = Math.max(200, containerH - elTop - 8); // 8px de folga no fundo
    // A casa é medida NO PRÓPRIO GRID: assim a conta acompanha o token do
    // CSS mesmo quando ele muda (tema, media query) depois do primeiro render.
    const { casa, vao } = medirCasaDoBau(el);
    const SLOT_SIZE = casa + vao;
    let cols = Math.min(MAX_GRID_COLS, Math.max(3, Math.floor(w / SLOT_SIZE)));
    let rows = Math.min(MAX_GRID_ROWS, Math.max(2, Math.floor(h / SLOT_SIZE)));
    /* O BAÚ SOB MEDIDA (23/10/2026): "Essa diferença de espaçamento me
       incomoda [...] alterando e fixando o tamanho da página". No Inventário
       e na Loja da ficha, o cartão passa a ter a largura e a altura EXATAS
       da grade (+ painel do item), então a conta sai da página, não do
       próprio grid: quantas casas de 56px (50 + 6 de vão) cabem na largura
       livre e na altura até o pé da tela, descontados os 20px de respiro, o
       painel (360px) e a faixa da carga. Com o cartão justo, sobra o mesmo
       respiro nos quatro lados. */
    const pagina = el.closest && el.closest('.fp-page.is-inventario');
    if (pagina) {
      const PASSO = SLOT_SIZE;
      const comPainel = !!el.closest('.bau-corpo--painel');
      /* O painel do item + o vão de 20px. Sai do CSS (--bau-painel-w) para
         não haver dois números: a conta aqui e a coluna da grade lá. */
      const painelW = parseFloat(getComputedStyle(pagina).getPropertyValue('--bau-painel-w')) || 440;
      const livreW = pagina.clientWidth - 2 - 40 - (comPainel ? painelW + 20 : 0);
      cols = Math.min(MAX_GRID_COLS, Math.max(3, Math.floor((livreW + vao) / PASSO)));
      const card = el.closest('.fp-card');
      const topoGrade = el.getBoundingClientRect().top - (mcMain ? mcMain.getBoundingClientRect().top : 0);
      // abaixo da grade: 20 de respiro, a faixa da carga (~48) e 16 até o pé
      const livreH = containerH - topoGrade - 20 - 48 - 16;
      rows = Math.min(MAX_GRID_ROWS, Math.max(4, Math.floor((livreH + vao) / PASSO)));
      void card;
    }
    /* NO CELULAR (23/10/2026) a página rola, então medir pela altura da tela
       enchia o baú de fileiras vazias (11 com 16 itens). Lá a base é de 4
       fileiras; quem usa a grade já soma as linhas dos itens + uma vazia. */
    if (window.innerWidth <= 640) rows = 4;
    /* O TETO DO PAINEL DO ITEM (26/10/2026, pedido do usuário repetido): "do
       lado direito aparecem várias informações e essas informações criam uma
       barra de rolagem na página, eu quero que a barra de rolagem seja no
       card de visualização do item."

       O teto era `calc(100vh - 132px)` — um número chutado, que não sabe onde
       o card começa (a barra de busca e o cabeçalho ficam acima dele) nem do
       respiro de 80px que o .mc-content reserva no pé. Com descrição longa, o
       card passava do fim da tela e quem rolava era a página.

       Agora ele é a ALTURA DA GRADE, que já é calculada para caber na tela:
       assim o painel nunca é o item mais alto da linha, o cartão termina onde
       a grade termina, e o texto comprido rola por dentro do .ms-body. */
    const csGrade = window.getComputedStyle(el);
    const padV = (parseFloat(csGrade.paddingTop) || 0) + (parseFloat(csGrade.paddingBottom) || 0);
    const alturaDaGrade = rows * casa + (rows - 1) * vao + padV;
    const linha = el.closest && el.closest('.bau-corpo--painel');
    if (linha) linha.style.setProperty('--bau-painel-h', alturaDaGrade + 'px');
    setDims((prev) =>
      (prev.cols === cols && prev.rows === rows) ? prev : { cols, rows, totalSlots: cols * rows }
    );
  }, []);

  // Callback ref: roda quando o nó do grid é anexado/removido do DOM.
  const setGridEl = React.useCallback((node) => {
    if (roRef.current) { roRef.current.disconnect(); roRef.current = null; }
    elRef.current = node;
    if (node) {
      // mede no próximo frame (layout já assentou) e observa redimensionamento
      requestAnimationFrame(calc);
      const ro = new ResizeObserver(calc);
      ro.observe(node);
      roRef.current = ro;
    }
  }, [calc]);

  // Recalcula em resize de janela
  React.useEffect(() => {
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [calc]);

  return [setGridEl, dims];
}

/* CASAS LIVRES (02/10/2026): a grade deixou de ser lista compacta. Cada item
   fica na sua `casa` (01-core/inventario-casas.jsx); soltar numa casa vazia
   leva o item para lá, sobre outro item troca os dois, sobre um recipiente
   guarda dentro (onGuardarEm, regras do Armazenar). */
/* `lugar` (02/10/2026): null = o inventário solto; o instanceId de um
   recipiente = a grade de DENTRO dele (o ContainerModal usa assim, com
   semFerramentas: sem busca/filtro, sem guardar e sem soltar no amigo). */
/* `compacta` (22/10/2026, "Baú com painel"): a grade tem só as linhas que os
   itens ocupam e mais uma livre, em vez de encher a altura da tela de casas
   vazias. `selecionadoId`: o item aberto no painel ao lado fica marcado. */
function InvItemsTable({ itens, catalogoBySlug, mudarQtd, onAbrirDetalhes, onAbrirContainer, lang, onMoverCasa, onGuardarEm, onSoltarNoAmigo, lugar = null, semFerramentas = false, compacta = false, selecionadoId = null, moedasNoTrilho = null, acaoNoTrilho = null }) {
  const { Input } = (typeof UI !== 'undefined' ? UI : {});
  const en = lang === 'en';
  const [busca, setBusca] = useState('');
  const alvoTrilho = useAlvoPortal('fp-trilho-slot');
  const [grupoSel, setGrupoSel] = useState(null); // null = todos
  const [tip, abrirTip, fecharTip, manterTip] = usePortalTooltip(80);
  const [setGridEl, { cols, totalSlots }] = useGridDimensions();

  // ── Drag-and-drop via Pointer Events ──────────────────────────────────────────
  // Abordagem por pointer events (não HTML5 draggable): robusta contra os
  // re-renders do React durante o arraste (que faziam o drop nativo "voltar" o
  // item pro slot original) e funciona em toque (mobile) além de mouse.
  //
  // drag = { fromIdx, instanceId, x, y } enquanto um arraste está ativo (ou null).
  //   x/y acompanham o ponteiro para posicionar o "fantasma" que segue o cursor.
  // overIdx = índice do slot sob o ponteiro (destino do drop), ou null.
  const [drag, setDrag] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  // instanceId do card que está sendo SEGURADO (pointerdown ativo, antes do arraste começar).
  // Controla apenas o cursor — a classe .inv-card--holding é aplicada só enquanto o botão fica pressionado.
  const [holdingId, setHoldingId] = useState(null);

  // Refs pra ler valores atuais dentro dos listeners globais sem closure stale.
  const dragRef = React.useRef(null);
  const overIdxRef = React.useRef(null);
  // Casa→item e id→item da grade, e o catálogo, lidos pelos listeners do arraste.
  const porCasaRef = React.useRef(new Map());
  const porIdRef = React.useRef(new Map());
  const catalogoBySlugRef = React.useRef(catalogoBySlug);
  catalogoBySlugRef.current = catalogoBySlug;
  // Guarda o ponto onde o ponteiro desceu + se o limiar de arraste foi cruzado.
  // Enquanto não cruzar (~6px), tratamos como clique (abre detalhes).
  const pointerStartRef = React.useRef(null);
  // Sinaliza que o próximo 'click' (sintético, pós-arraste) deve ser ignorado.
  const suppressClickRef = React.useRef(false);
  // Soltar no card do amigo: lido por ref nos listeners globais do arraste.
  const soltarNoAmigoRef = React.useRef(onSoltarNoAmigo);
  soltarNoAmigoRef.current = onSoltarNoAmigo;

  // Evita que o tooltip apareça durante o arraste
  const abrirTipSafe = React.useCallback((e, content) => {
    if (dragRef.current) return;
    abrirTip(e, content);
  }, [abrirTip]);

  // Descobre qual slot (índice) está sob um ponto da tela. Usa document
  // .elementFromPoint e sobe até achar um [data-slot-idx]. Retorna número ou null.
  const slotIdxFromPoint = React.useCallback((x, y) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const slot = el.closest('[data-slot-idx]');
    if (!slot) return null;
    const idx = Number(slot.getAttribute('data-slot-idx'));
    return Number.isFinite(idx) ? idx : null;
  }, []);

  // Soltou na casa `targetIdx`: sobre um recipiente, guarda dentro (o item
  // arrastado não sendo recipiente); senão vai para a casa — vazia, ou trocando
  // com quem estiver nela.
  const moverCasaRef = React.useRef(onMoverCasa);
  moverCasaRef.current = onMoverCasa;
  const guardarEmRef = React.useRef(onGuardarEm);
  guardarEmRef.current = onGuardarEm;
  const commitSoltar = React.useCallback((instanceId, targetIdx) => {
    if (targetIdx === null || targetIdx === undefined) return;
    const arrastado = porIdRef.current.get(instanceId);
    if (!arrastado || arrastado.casa === targetIdx) return;
    const alvo = porCasaRef.current.get(targetIdx);
    const catAlvo = alvo && catalogoBySlugRef.current[alvo.slug];
    const catArr = catalogoBySlugRef.current[arrastado.slug];
    if (alvo && ehContainer(catAlvo) && !ehContainer(catArr) && guardarEmRef.current) {
      guardarEmRef.current(instanceId, alvo.instanceId);
      return;
    }
    if (moverCasaRef.current) moverCasaRef.current(instanceId, targetIdx);
  }, []);

  // Handlers globais (montados só enquanto um arraste está ativo).
  React.useEffect(() => {
    if (!drag) return;

    /* O CARD DO AMIGO também é destino (28/09/2026): "para transferir um item
       para um amigo, só precisa arrastar o item do inventário para o card do
       amigo". Os cards moram no AmigosFab (11-ficha/amigos-fab.jsx), fora
       desta árvore: acha-se pelo data-amigo-pj-id sob o ponteiro, e o aceso
       é uma classe posta direto no elemento. */
    const amigoSobPonto = (x, y) => {
      const el = document.elementFromPoint(x, y);
      return el ? el.closest('[data-amigo-pj-id]') : null;
    };
    const acenderAmigo = (el) => {
      document.querySelectorAll('[data-amigo-pj-id].is-alvo').forEach((a) => { if (a !== el) a.classList.remove('is-alvo'); });
      if (el) el.classList.add('is-alvo');
    };

    const onMove = (e) => {
      const x = e.clientX, y = e.clientY;
      dragRef.current = { ...dragRef.current, x, y };
      setDrag((d) => (d ? { ...d, x, y } : d));
      acenderAmigo(soltarNoAmigoRef.current ? amigoSobPonto(x, y) : null);
      const idx = slotIdxFromPoint(x, y);
      overIdxRef.current = idx;
      setOverIdx(idx);
      e.preventDefault();
    };

    const onUp = (e) => {
      const d = dragRef.current;
      const target = overIdxRef.current;
      const houveArraste = !!d;
      const amigo = d && soltarNoAmigoRef.current ? amigoSobPonto(e.clientX, e.clientY) : null;
      acenderAmigo(null);
      if (amigo) soltarNoAmigoRef.current(d.instanceId, Number(amigo.getAttribute('data-amigo-pj-id')));
      else if (d) commitSoltar(d.instanceId, target);
      dragRef.current = null;
      overIdxRef.current = null;
      setDrag(null);
      setOverIdx(null);
      setHoldingId(null);
      try { e.target.releasePointerCapture?.(e.pointerId); } catch (_) {}
      // Se houve arraste, o navegador ainda vai disparar um 'click' sintético no
      // card logo em seguida — marcamos pra suprimi-lo (senão abre os detalhes).
      // Limpamos pointerStartRef só no próximo tick, depois do click passar.
      // Reset de segurança: se o click NÃO vier (alguns navegadores suprimem o
      // click após setPointerCapture), zeramos a flag no tick seguinte pra não
      // engolir o próximo clique legítimo.
      if (houveArraste) {
        suppressClickRef.current = true;
        setTimeout(() => { suppressClickRef.current = false; }, 350);
      }
      setTimeout(() => { pointerStartRef.current = null; }, 0);
    };

    const onCancel = () => {
      acenderAmigo(null);
      dragRef.current = null;
      overIdxRef.current = null;
      pointerStartRef.current = null;
      setDrag(null);
      setOverIdx(null);
      setHoldingId(null);
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [drag ? drag.instanceId : null, commitSoltar, slotIdxFromPoint]);

  // pointerdown num card: registra o ponto de partida. O arraste só COMEÇA de
  // fato (setDrag) quando o ponteiro se move além do limiar — assim um clique
  // simples continua abrindo os detalhes.
  const onCardPointerDown = React.useCallback((e, idx, instanceId) => {
    // Só botão esquerdo do mouse / toque primário
    if (e.button != null && e.button !== 0) return;
    // Se há um modal aberto (backdrop visível), ignora o pointerdown — o evento
    // pode ter passado pelo backdrop/botão X do modal que ficou sobre o card.
    if (document.querySelector('.modal-backdrop')) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY, idx, instanceId, started: false };
    setHoldingId(instanceId);
  }, []);

  // Limpa holdingId assim que o ponteiro é solto, mesmo antes de um arraste começar.
  // O useEffect dos handlers globais (pointermove/pointerup) só monta após drag existir,
  // então este handler separado cobre a janela entre pointerdown e o início do arraste.
  React.useEffect(() => {
    const clearHold = () => setHoldingId(null);
    window.addEventListener('pointerup', clearHold);
    window.addEventListener('pointercancel', clearHold);
    return () => {
      window.removeEventListener('pointerup', clearHold);
      window.removeEventListener('pointercancel', clearHold);
    };
  }, []);

  const onCardPointerMove = React.useCallback((e, idx, instanceId) => {
    const st = pointerStartRef.current;
    if (!st || st.started || dragRef.current) return;
    const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (Math.hypot(dx, dy) < 6) return; // limiar pra distinguir clique de arraste
    st.started = true;
    fecharTip();
    const d = { fromIdx: idx, instanceId, x: e.clientX, y: e.clientY };
    dragRef.current = d;
    overIdxRef.current = idx;
    setDrag(d);
    setOverIdx(idx);
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch (_) {}
  }, [fecharTip]);

  // Clique abre detalhes. O click sintético pós-arraste é barrado antes daqui,
  // na fase de captura do onClickCapture do .inv-grid-wrap (via suppressClickRef).
  const onCardClick = React.useCallback((instanceId) => {
    if (dragRef.current) return;
    // Limpa o estado de "segurar" antes de abrir o modal — evita que o pointerdown
    // do card (que disparou este clique) fique preso caso o modal consuma o pointerup
    // correspondente (ex.: backdrop ou botão X sobre o card por trás).
    setHoldingId(null);
    pointerStartRef.current = null;
    onAbrirDetalhes(instanceId);
  }, [onAbrirDetalhes]);

  // Equipados (it.slot) e vestidos (it.vestido) aparecem aqui junto com o
  // resto da bolsa — só o que está DENTRO de um container some daqui (tem
  // tela própria, o ContainerModal). O pill "eq"/"vst" no card (ver
  // renderItemCard/renderContainerCard) é o que distingue visualmente.
  const itensVisiveis = (itens || []).filter((it) => (it.containerId || null) === lugar);

  // Chips de categoria (grupos presentes na bolsa)
  const grupos = useMemo(() => {
    const m = new Map();
    for (const it of itensVisiveis) {
      const cat = catalogoBySlug[it.slug];
      const g = cat?.grupo || (en ? 'Other' : 'Outros');
      m.set(g, (m.get(g) || 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [itensVisiveis, catalogoBySlug, en]);

  // Normalização para busca sem acento/case
  const normTxt = (s) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const q = normTxt(busca);

  // Itens que batem com a busca + chip de grupo. Desde 02/10/2026 a busca NÃO
  // tira ninguém do lugar: quem não bate fica apagado na sua casa e segue
  // arrastável (decisão do usuário). Saiu também o "em uso na frente" de
  // 11/09/2026 — com casas livres, cada item fica onde o jogador deixou.
  const itensFiltrados = useMemo(() => itensVisiveis.filter((it) => {
    const cat = catalogoBySlug[it.slug];
    const g = cat?.grupo || (en ? 'Other' : 'Outros');
    if (grupoSel && g !== grupoSel) return false;
    // Nome E descrição (24/09/2026) — ver itemCasaBusca.
    if (q && !itemCasaBusca(cat, q, it.slug)) return false;
    return true;
  }), [itensVisiveis, catalogoBySlug, grupoSel, q, en]);
  const idsQueBatem = useMemo(() => new Set(itensFiltrados.map((it) => it.instanceId)), [itensFiltrados]);

  // Cada item na sua casa. Quem ainda não tem (antes do efeito de normalização
  // do InventarioList gravar) ganha a primeira livre só para desenhar.
  /* NO CELULAR (23/10/2026) as casas guardadas vêm da grade larga do
     computador (casa 103 = 6ª fileira lá, 21ª aqui, com 5 colunas): o baú
     enchia de fileiras vazias até o item. Lá os itens seguem a ordem das
     casas, sem os buracos — só na exibição; as casas salvas não mudam. */
  const celular = typeof window !== 'undefined' && window.innerWidth <= 640;
  const posicionados = useMemo(() => {
    const p = posicionarCasas(itensVisiveis);
    if (!celular) return p;
    return [...p].sort((a, b) => a.casa - b.casa).map((it, i) => ({ ...it, casa: i }));
  }, [itensVisiveis, celular]);
  const porCasa = useMemo(() => new Map(posicionados.map((it) => [it.casa, it])), [posicionados]);
  porCasaRef.current = porCasa;
  porIdRef.current = new Map(posicionados.map((it) => [it.instanceId, it]));

  // Monta o content do tooltip para um item/container.
  // Mostra apenas o NOME do item (a descrição vive no modal de detalhes).
  const tipContent = (it, cat) => {
    const b = bonusDoItem(it);
    const nomeV = cat ? nomeComVeneno(cat.nome, it) : '';
    return { title: cat ? (b > 0 ? `${nomeV} +${b}` : nomeV) : `(? ${it.slug})` };
  };

  /* ── O +N ACOMPANHA O ITEM (28/10/2026, pedido do usuário) ──────────────
     "A informação que a arma está +5, etc, precisa acompanhar o item para o
     personagem ver que a arma dele foi melhorada."

     O número já existia em três lugares — o balão da casa, o balão da ficha e
     a linha Sagração da janela —, e os três exigem uma AÇÃO: passar o mouse ou
     abrir. Quem foi presenteado com uma arma sagrada não sabe disso olhando a
     mochila. O selo resolve: fica na casa, sem hover e sem clique. */
  const seloBonus = (it) => {
    const b = bonusDoItem(it);
    return b > 0 ? <span className="inv-selo-bonus" aria-hidden="true">+{b}</span> : null;
  };

  const renderContainerCard = (it, cat, idx, extra = '') => {
    const filhos = itens.filter((f) => f.containerId === it.instanceId);
    let usado = 0;
    for (const f of filhos) {
      const fc = catalogoBySlug[f.slug];
      if (fc?.ocupa != null) usado += Number(fc.ocupa) * f.quantidade;
    }
    const cap = Number(cat.armazena || 0);
    const pct = cap > 0 ? Math.min(100, (usado / cap) * 100) : 0;
    const liquido = cat.tipo === 'L';
    const isBeingDragged = drag && drag.fromIdx === idx;
    const isDropTarget = overIdx === idx && drag && drag.fromIdx !== idx;
    const isHolding = holdingId === it.instanceId && !isBeingDragged;
    return (
      <button
        key={it.instanceId}
        type="button"
        data-slot-idx={idx}
        className={
          'inv-card'
          + (cat?.magico ? ' inv-card--magico' : '')
          + (isBeingDragged ? ' inv-card--dragging' : '')
          + (isDropTarget ? ' inv-card--drop-target' : '')
          + (isHolding ? ' inv-card--holding' : '')
          + extra
        }
        style={{ touchAction: 'none' }}
        onClick={() => onCardClick(it.instanceId)}
        onMouseEnter={(e) => abrirTipSafe(e, tipContent(it, cat))}
        onMouseLeave={fecharTip}
        onPointerDown={(e) => onCardPointerDown(e, idx, it.instanceId)}
        onPointerMove={(e) => onCardPointerMove(e, idx, it.instanceId)}>
        {it.quantidade > 1 && <QtdDoCard n={it.quantidade} />}
        <span className="inv-card-head">
          <span className="inv-card-ic"><ItemIcone cat={cat} icon={invItemIcon(cat)} /></span>
        </span>
        {/* Container vestido (ex.: cinto) também entra no grid — mesmo pill de "em uso". */}
        {(it.slot || it.vestido || estaAVenda(it)) && (
          <span className="inv-card-pills">
            {/* À venda na loja (02/10/2026): o selo de etiqueta. */}
            {estaAVenda(it) && <span className="inv-pill inv-pill--venda" role="img" aria-label={en ? 'For sale' : 'À venda'}><i className="ti ti-tag" aria-hidden="true" /></span>}
            {/* A LETRA, NÃO O ÍCONE (28/10/2026, usuário: "o E está muito
                pequeno, ao invés de usar ícone, use a letra"). `ti-letter-e-small`
                é um glifo desenhado dentro de uma caixa com folga própria: na
                pastilha de 21px ele saía menor que a etiqueta e a faísca ao
                lado. A letra do corpo do texto ocupa a pastilha inteira e
                acompanha a fonte do sistema. */}
            {(it.slot || it.vestido) && <span className="inv-pill eq" role="img" aria-label={en ? 'Equipped' : 'Equipado'}><span className="inv-pill-letra" aria-hidden="true">E</span></span>}
          </span>
        )}
        <span className="inv-cont-bar">
          <span style={{ width: pct + '%', background: liquido ? '#47aad8' : undefined }} />
        </span>
      </button>
    );
  };

  const renderItemCard = (it, cat, idx, extra = '') => {
    const resMax = Number(cat?.resistencia || 0);
    const resAtual = Number.isFinite(Number(it.res))
      ? Math.max(0, Math.min(resMax, Number(it.res))) : resMax;
    const resPct = resMax > 0 ? Math.round((resAtual / resMax) * 100) : 0;
    const isBeingDragged = drag && drag.fromIdx === idx;
    const isDropTarget = overIdx === idx && drag && drag.fromIdx !== idx;
    const isHolding = holdingId === it.instanceId && !isBeingDragged;
    return (
      <button
        key={it.instanceId}
        type="button"
        data-slot-idx={idx}
        className={
          'inv-card'
          + (cat?.magico ? ' inv-card--magico' : '')
          + (isBeingDragged ? ' inv-card--dragging' : '')
          + (isDropTarget ? ' inv-card--drop-target' : '')
          + (isHolding ? ' inv-card--holding' : '')
          + extra
        }
        style={{ touchAction: 'none' }}
        onClick={() => onCardClick(it.instanceId)}
        onMouseEnter={(e) => abrirTipSafe(e, tipContent(it, cat))}
        onMouseLeave={fecharTip}
        onPointerDown={(e) => onCardPointerDown(e, idx, it.instanceId)}
        onPointerMove={(e) => onCardPointerMove(e, idx, it.instanceId)}>
        {it.quantidade > 1 && <QtdDoCard n={it.quantidade} />}
        <span className="inv-card-head">
          <span className="inv-card-ic"><ItemIcone cat={cat} icon={invItemIcon(cat)} /></span>
        </span>
        {/* A faísca é IRMÃ de .inv-card-pills, não filha.

            Estava dentro, e como .inv-card-pills é `position: absolute`, ela
            virava o contexto de posicionamento: a faísca se ancorava no
            container dos selos em vez do card, e caía por cima do E. Fora
            dele, o `right: 3px` passa a valer contra o card, que é o canto
            oposto onde ela deveria estar. */}
        {/* A LETRA M, NÃO A FAÍSCA (28/10/2026, usuário: "quando o item for
            mágico, use a letra M ao invés do ícone"). Mesma razão do E: na
            pastilha de 21px um glifo desenhado sai menor que a letra do corpo
            do texto. A classe `.inv-faisca` fica — ela é a POSIÇÃO (canto
            superior direito, oposto aos selos de estado), não o desenho. */}
        {cat?.magico && (
          <span className="inv-faisca" role="img" aria-label={en ? 'Magic' : 'Mágico'}>
            <span className="inv-pill-letra" aria-hidden="true">M</span>
          </span>
        )}
        {/* O +N da Sagração, à vista na casa (28/10/2026) — ver seloBonus. */}
        {seloBonus(it)}
        <span className="inv-card-pills">
          {/* À venda na loja (02/10/2026): o selo de etiqueta. */}
          {estaAVenda(it) && <span className="inv-pill inv-pill--venda" role="img" aria-label={en ? 'For sale' : 'À venda'}><i className="ti ti-tag" aria-hidden="true" /></span>}
          {/* O selo de LÍQUIDO (gota azul no topo esquerdo) saiu em 26/09/2026:
              "no caso do item tipo água, remova o ícone no topo esquerdo". */}
          {/* Equipado (arma/armadura no slot) e vestido (roupa) agora aparecem
              no mesmo grid da bolsa — este pill é o que distingue de um item
              solto. Mesmos glifos do EquipadoBoard/VestesBoard (ti-shield/ti-shirt). */}
          {/* Um selo só: E de "em uso", para equipado E para vestido
              (pedido do usuário, 11/09/2026 — "visualmente não faz
              diferença"). A distinção entre arma no slot e roupa vestida
              continua existindo nos dados e no modal; no grid ela não
              ajudava a decidir nada e gastava um segundo glifo. */}
          {(it.slot || it.vestido) && (
            <span className="inv-pill eq" role="img" aria-label={en ? 'Equipped' : 'Equipado'}><span className="inv-pill-letra" aria-hidden="true">E</span></span>
          )}
          {/* Montaria em uso (14/09/2026) — mesmo selo dourado do "em uso". */}
          {it.montado && (
            <span className="inv-pill eq" role="img" aria-label={en ? 'Mounted' : 'Montado'}><i className="ti ti-horse" aria-hidden="true" /></span>
          )}
          {/* Elo Permanente (27/09/2026) — o animal ligado ao personagem. */}
          {temElo(it) && (
            <span className="inv-pill eq inv-pill--elo" role="img" aria-label={en ? 'Permanent bond' : 'Elo Permanente'}><i className="ti ti-link" aria-hidden="true" /></span>
          )}
        </span>
        {/* Barra de RESISTÊNCIA (durabilidade) — mesmo molde da barra de
            capacidade dos containers, colada no rodapé do card.

            Só aparece em item que TEM resistência no catálogo (armas e
            armaduras); o resto do inventário não se desgasta. O atual vem da
            instância (`it.res`); item que nunca apanhou entra cheio.

            A cor avisa antes de acabar: aço > 50%, ouro até 50%, vermelho
            até 25%. Armadura zerada para de bloquear (ver aplicarDanoCascata),
            e isso é grande demais pra descobrir só na hora do golpe. */}
        {/* A barra saiu do ícone em 26/10/2026 (ver ficha.jsx): o número vive
            no painel do item, ao lado de ocupa e absorção. */}
      </button>
    );
  };

  /* Classe extra do card (02/10/2026): apagado = não bate com a busca/filtro, mas segue
     na sua casa e arrastável (decisão do usuário); guardar = um item está
     sendo arrastado sobre este recipiente e, solto, entra nele. */
  const renderCard = (it, idx) => {
    const cat = catalogoBySlug[it.slug];
    const apagado = !idsQueBatem.has(it.instanceId);
    const arrastado = drag && porIdRef.current.get(drag.instanceId);
    const guardar = !!(arrastado && arrastado.instanceId !== it.instanceId && overIdx === idx
      && ehContainer(cat) && !ehContainer(catalogoBySlug[arrastado.slug]));
    const extra = (apagado ? ' inv-card--apagado' : '') + (guardar ? ' inv-card--guardar' : '')
      + (selecionadoId && selecionadoId === it.instanceId ? ' inv-card--escolhido' : '');
    return ehContainer(cat)
      ? renderContainerCard(it, cat, idx, extra)
      : renderItemCard(it, cat, idx, extra);
  };

  if (itensVisiveis.length === 0 && !lugar) {
    return (
      <div className="loja-warn-empty">
        <span>{en ? 'You have no possessions.' : 'Você não tem nenhum pertence.'}</span>
      </div>
    );
  }

  return (
    <div
      className="inv-grid-wrap"
      onClickCapture={(e) => {
        // Reforço: bloqueia na fase de CAPTURA o click sintético disparado logo
        // após um arraste, antes de chegar ao onClick do card. Cobre navegadores
        // onde a flag no onClick do card não seria suficiente.
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          e.stopPropagation();
          e.preventDefault();
        }
      }}>
      {/* ── O TRILHO DO INVENTÁRIO (23/10/2026): "a barra de busca (não precisa
          do filtro de itens) e as moedas ficam em um trilho". Com
          `moedasNoTrilho`, a busca e a bolsa num trilho só, centralizado; os
          filtros por tipo e a contagem saem. ── */}
      {!semFerramentas && moedasNoTrilho && (() => {
        /* Fora do painel, como nas outras páginas (23/10/2026): no espaço que a
           ficha abre acima dele; sem esse espaço, fica aqui mesmo. */
        const trilho = (
        <div className="cartoes-barra inv-trilho">
          <div className="best-header-acoes">
            <div className="best-search">
              <i className="ti ti-eye busca-ic" aria-hidden="true" />
              <Input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={en ? 'Search' : 'Buscar'} />
            </div>
            <div className="inv-trilho-moedas">{moedasNoTrilho}</div>
            {/* A ação do Mestre na PONTA do trilho (28/10/2026), do mesmo jeito
                que "Nova loja" fica na ponta do trilho do Estoque: o que se vê
                (busca, bolsa) à esquerda, o que se faz na direita. */}
            {acaoNoTrilho}
            {/* A contagem saiu da vista com os filtros, mas segue para leitor de tela. */}
            <span className="sr-only" aria-live="polite">{itensFiltrados.length} de {itensVisiveis.length}</span>
          </div>
        </div>
        );
        return alvoTrilho ? ReactDOM.createPortal(trilho, alvoTrilho) : trilho;
      })()}
      {/* ── Busca + chips de categoria — mesmo padrão best-toolbar do bestiário ── */}
      {!semFerramentas && !moedasNoTrilho && (
      <div className="best-toolbar">
        <div className="best-search">
          <i className="ti ti-eye busca-ic" aria-hidden="true" />
          <Input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={en ? 'Search' : 'Buscar'}
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
              <i className={'ti ' + (ICONE_POR_GRUPO[normalizar(g)] || 'ti-box')} aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="best-count">{itensFiltrados.length} de {itensVisiveis.length}</div>
      </div>
      )}

      {/* ── Grid flat com slots fantasmas (ref sempre montado para o ResizeObserver) ── */}
      {(() => {
        // Casas livres (02/10/2026): a casa i mostra o item que mora nela ou
        // fica vazia — e cada vazia é um destino de verdade (antes, toda vazia
        // queria dizer "o fim da lista"). A grade cobre pelo menos a área
        // visível (totalSlots) e cresce até a casa mais alta ocupada; com
        // tudo cheio, ganha mais uma linha para sempre haver onde soltar.
        const maiorCasa = posicionados.reduce((m, it) => Math.max(m, it.casa), -1);
        let total = compacta
          /* A grade ocupa a altura visível (totalSlots), a mesma regra da vitrine da Loja (23/10/2026). */
          ? Math.max(totalSlots || cols * LINHAS_BAU, Math.ceil((maiorCasa + 1) / cols) * cols + cols)
          : Math.max(totalSlots, Math.ceil((maiorCasa + 1) / cols) * cols);
        if (posicionados.length >= total) total += cols;
        return (
          <div
            ref={setGridEl}
            className="inv-bag-grid inv-bag-grid--slots"
            style={{ gridTemplateColumns: `repeat(${cols}, var(--inv-casa))` }}>
            {Array.from({ length: total }, (_, i) => {
              const it = porCasa.get(i);
              if (it) return renderCard(it, i);
              const alvo = overIdx === i && drag;
              return (
                <span
                  key={'casa-' + i}
                  data-slot-idx={i}
                  className={'inv-slot-ghost' + (alvo ? ' inv-slot-ghost--drop-target' : '')}
                  aria-hidden="true"
                />
              );
            })}
          </div>
        );
      })()}

      {/* ── Fantasma que segue o cursor durante o arraste ──
          DENTRO de `.menestrel-ui`, e não no `<body>` (27/10/2026, pedido do
          usuário: "quando eu arrasto um item em loja/inventário a imagem fica
          gigante"). É a MESMA armadilha que o PortalTooltip aqui em cima já
          documenta: a folha inteira é escopada em `#root .menestrel-ui …`, e
          no body nenhuma regra alcança o fantasma. Sem regra, a pintura saía
          no tamanho natural do arquivo — 240px — e o `left/top` não colava,
          porque nem o `position: fixed` chegava nele.

          O bug é antigo, mas foi ficando pior: quando o fantasma era um glifo
          de fonte, o estrago passava despercebido; conforme os itens ganharam
          pintura (23/10 em diante), virou uma imagem de 240px no cursor. */}
      {drag && (() => {
        const it = porIdRef.current.get(drag.instanceId);
        if (!it) return null;
        const cat = catalogoBySlug[it.slug];
        const alvo = document.querySelector('.menestrel-ui') || document.body;
        return ReactDOM.createPortal(
          <div
            className="inv-drag-ghost"
            style={{ left: drag.x, top: drag.y }}
            aria-hidden="true">
            <span className="inv-card-ic"><ItemIcone cat={cat} icon={invItemIcon(cat)} /></span>
          </div>,
          alvo
        );
      })()}

      <PortalTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </div>
  );
}

// ── DetStat
function DetStat({ label, value }) {
  return (
    <div className="det-stat">
      <span className="det-stat-lbl">{label}</span>
      <span className="det-stat-val">{value}</span>
    </div>
  );
}

// ── DetalhesItemModal — Fase 3: seção de container + botão transferir ─────────
/* ── O QUE O ITEM ENSINA (22/10/2026) ─────────────────────────────────
   "todas as magias precisam ser aprendidas através do uso do item" — o
   pergaminho da magia, ou um livro que vincula pergaminhos
   (livro_pergaminhos: Livro do Mago, dos deuses, das Ordens…). Quem decide
   de verdade é a RPC aprender_magia; a tela antecipa as recusas com os
   MESMOS motivos para o botão nascer desativado com o porquê (pedido de
   13/09/2026: "Independente da situação, o botão deve aparecer. No tooltip
   você informa porque não é possível aprender"). Ordem: as da tela primeiro
   (onde, quem, à venda), depois as da regra (bloqueioAprenderMagia,
   01-core/game-data.jsx).

   A chave sai do NOME, pela mesma regra do catálogo (a key deriva do nome
   em todas as magias desde scripts/sql/magias-key-alinha-nome.sql). */
function chaveDaMagiaPorNome(nome) {
  return String(nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
/* Pergaminho de magia = CONSUMÍVEL com magia e slug pergaminho_ (13/09 e
   28/09/2026: anéis, armas e frascos também têm magia, mas não ensinam).
   Desde 22/10/2026 há UM pergaminho por magia, para todos os níveis — o
   nivel_magia é nulo, e por isso não entra mais na conta. */
function ehPergaminhoDeMagia(cat) {
  return !!(cat && cat.magia && cat.grupo === 'Consumíveis'
    && String(cat.slug || '').startsWith('pergaminho_'));
}
/* Consumível com magia que NÃO é pergaminho — os frascos alquímicos
   (28/09/2026): "para ser usado em batalha". Fora de combate não há o que
   usar; na batalha a magia aparece na aba Magia/Apoio, sem karma, e o frasco
   some (magiasDeItensDoAtor / consumirItemDaMagia, 12-batalha). */
function ehItemDeMagiaEmBatalha(cat) {
  return !!(cat && cat.magia && cat.nivel_magia != null && cat.grupo === 'Consumíveis'
    && !ehPergaminhoDeMagia(cat));
}
// A magia do catálogo que o item nomeia (itens.magia guarda o NOME).
function magiaDoItem(cat, magiasDb) {
  if (!cat || !cat.magia || !Array.isArray(magiasDb)) return null;
  const key = chaveDaMagiaPorNome(cat.magia);
  return magiasDb.find((m) => m.key === key)
    || magiasDb.find((m) => chaveDaMagiaPorNome(m.nome) === key) || null;
}
/* ── Montaria (14/09/2026) ────────────────────────────────────────────────
   O animal do inventário (itens, grupo Animais) aponta para a criatura do
   bestiário por `itens.criatura_id` — o vínculo que o usuário escolheu:
   "as características do Cavalo em criaturas e Cavalo em itens devem ser o
   mesmo". A característica mora SÓ na criatura (criaturas.montaria); o item
   herda. Até a mesma data a ligação era pelo nome, e 23 animais ficavam de
   fora sem aviso. Item sem vínculo, ou vinculado a criatura que não é
   montaria, não oferece Montar. */
function criaturaDoItem(cat, criaturas) {
  if (!cat || cat.criatura_id == null || !Array.isArray(criaturas) || !criaturas.length) return null;
  const id = String(cat.criatura_id);
  return criaturas.find((c) => c && c.montaria === true && String(c.id) === id) || null;
}
// A instância montada do inventário (uma por personagem), ou null.
function itemMontado(itens) {
  return (Array.isArray(itens) ? itens : []).find((it) => it && it.montado) || null;
}
/* Os animais do personagem (aba Animais da ficha, 14/09/2026): cada instância
   do inventário cujo item aponta para uma criatura carregada. Qualquer
   criatura, não só montaria — "a página da montaria, e de todos os animais".
   `criaturasPorId` = { [id]: linha de criaturas }. */
function animaisDoPersonagem(itens, catalogoBySlug, criaturasPorId) {
  const mapa = criaturasPorId || {};
  // Animal à venda (02/10/2026) não é companheiro: está travado na loja.
  return itensLivres(itens).map((instancia) => {
    const cat = catalogoBySlug && catalogoBySlug[instancia.slug];
    const criatura = cat && cat.criatura_id != null ? mapa[cat.criatura_id] : null;
    if (!criatura) return null;
    /* `nome` e `raca` já resolvidos (06/10/2026): a regra do batismo é uma só
       e mora aqui, para nenhuma tela repeti-la — e nenhuma esquecer que sem
       nome dado o bicho é chamado pela raça. */
    return {
      instancia, cat, criatura,
      raca: racaDoAnimal(cat, criatura),
      nome: nomeDoAnimal(instancia, cat, criatura),
    };
  }).filter(Boolean);
}

/* ============================================================
   O ANIMAL É UM ITEM — nome, barras, arreamento e comida
   ============================================================
   Quatro pedidos do usuário que caem todos no mesmo lugar, porque o animal do
   personagem é uma INSTÂNCIA do inventário e é nela que o estado dele mora:

     "Na ficha do animal, o que é atualmente 'nome' será 'Raça', e o nome
      poderá ser informado pelo seu dono, se assim desejar." (06/10/2026)
     "Adicione ao feno e a ração animal, a condição de alimentar os animais do
      personagem, e adicione o sistema das barras de vitalidade para o animal."
      (05/10/2026)
     "Vamos criar itens para vestir os animais, roupas específicas para cada
      tipo de animal." / "Os itens carroça, carro de boi, carruagem [...] podem
      ser equipados aos cavalos, bois, vacas, touros, búfalos e camelos. Trenó
      pode ser equipado em cães, lobos, raposas, javalis." (05/10/2026)

   POR QUE NA INSTÂNCIA, E NÃO NO CATÁLOGO. `public.itens` é global: a linha
   "Cavalo Quarter" é a mesma para todos os personagens de todas as mesas. Dois
   cavalos da mesma raça têm nomes, fome e feridas diferentes — então nome
   (`it.nome`), barras (`it.vitalidade`) e condições (`it.condicoes`) ficam na
   instância, com as MESMAS chaves do estado_atual do personagem, para a ficha
   do bicho desenhar as barras com o código da ficha do dono.

   O vínculo da peça com o bicho também é da instância: `animal_id` aponta para
   o instanceId do animal e `slot_animal` diz em que casa ela entrou. É isso
   que tira o peso das costas do personagem (calcCarga) e que mantém a peça
   fora do corpo dele (ehVestimenta recusa quem tem slot_arreio).
   ============================================================ */

/* ── O NOME É DO DONO; A RAÇA, DO CATÁLOGO ─────────────────────────────────
   24 é o espaço de um nome próprio com apelido ("Trovão de Farzelo"), e não
   de uma frase: o nome aparece em casa de 64px na ficha e em linha de lista. */
const NOME_ANIMAL_MAX = 24;

/* A ESPÉCIE do bicho — o nome do catálogo, que é o que ele é. A criatura é o
   recuo para o animal que existe no bestiário mas ainda não no catálogo. */
function racaDoAnimal(cat, criatura) {
  const n = (cat && cat.nome) || (criatura && criatura.nome) || '';
  return String(n).trim();
}

/* Como se chama este bicho. Sem batismo, pela raça: "se assim desejar" quer
   dizer que o campo é opcional, e nenhuma tela pode ficar com um vazio por
   causa de um campo que ninguém preencheu. */
function nomeDoAnimal(instancia, cat, criatura) {
  const dado = instancia && typeof instancia.nome === 'string' ? instancia.nome.trim() : '';
  return dado || racaDoAnimal(cat, criatura);
}

/* Batizar e desbatizar. Devolve a MESMA lista quando nada muda — é ela que
   decide se a gravação do inventário acontece, e um nome igual ao que já está
   lá não é motivo para um compare-and-swap.

   Texto em branco DESFAZ o batismo: a chave sai da instância em vez de ficar
   gravada como string vazia, para `nomeDoAnimal` voltar à raça sem ter de
   saber que '' também é "sem nome". */
function comNomeDoAnimal(itens, instanceId, nome) {
  const lista = Array.isArray(itens) ? itens : [];
  const i = lista.findIndex((x) => x && x.instanceId === instanceId);
  if (i < 0) return lista;
  const limpo = String(nome == null ? '' : nome).trim().slice(0, NOME_ANIMAL_MAX);
  const atual = typeof lista[i].nome === 'string' ? lista[i].nome : '';
  if (limpo === atual) return lista;
  const novo = { ...lista[i] };
  if (limpo) novo.nome = limpo; else delete novo.nome;
  const out = lista.slice();
  out[i] = novo;
  return out;
}

/* ── AS BARRAS DO BICHO ─────────────────────────────────────────────────────
   As MESMAS seis do personagem, pelas MESMAS chaves e na mesma ordem da ficha
   dele (condBars, 11-ficha): Doença, Sono, Sede, Fome, Frio e Calor. A
   criatura não tem Vício, Sanidade nem Reputação — essas três são de quem tem
   biografia. Frio e Calor são os dois lados da termorregulação. */
const CONDICOES_ANIMAL = [
  { key: 'vitalidade', sigla: 'DOE', label: 'Doença', labelEn: 'Illness', icone: 'ti-virus' },
  { key: 'animo', sigla: 'SON', label: 'Sono', labelEn: 'Sleepiness', icone: 'ti-zzz' },
  { key: 'hidratacao', sigla: 'SED', label: 'Sede', labelEn: 'Thirst', icone: 'ti-bottle' },
  { key: 'nutricao', sigla: 'FOM', label: 'Fome', labelEn: 'Hunger', icone: 'ti-apple' },
  { key: 'frio', sigla: 'FRI', label: 'Frio', labelEn: 'Cold', icone: 'ti-snowflake' },
  { key: 'calor', sigla: 'CAL', label: 'Calor', labelEn: 'Heat', icone: 'ti-sun-high' },
];
const COND_ANIMAL_MAX = 100;
const CONDICOES_ANIMAL_KEYS = new Set(CONDICOES_ANIMAL.map((c) => c.key));

/* ── A CARGA DO BICHO (27/10/2026) ──────────────────────────────────────────
   Pedido do usuário: "adicione também uma barra para mostrar o peso que o
   animal está carregando", com duas decisões dele sobre a regra:

     • a capacidade é 20% DO PESO DO CORPO. Um cavalo de 400kg leva 80; a
       águia de 6kg leva 1,2 — ou seja, não leva nada, que é o certo. É a
       mesma proporção que o sistema já usa para a Energia Física do
       personagem (floor(peso/5) + Físico, em 01-core/game-data.jsx), então o
       número não é estranho à mesa;
     • conta TUDO, "inclusive o cavaleiro montado nele". O arreamento
       completo soma ~39 e um humano adulto pesa ~70: um cavalo de guerra
       arreado e montado chega perto do teto, e é esse o aperto que o Mestre
       precisa ver.

   `calcCarga` (o do personagem, mais acima) é o espelho disto: lá o que tem
   `animal_id` é PULADO, porque quem carrega é o bicho. Aqui é o contrário —
   só o que tem `animal_id` entra. As duas contas não podem divergir sem
   alguém carregar a sela duas vezes, ou nenhuma.

   `pesoDoCavaleiro` vem de fora (ficha.derivadas.peso, calculado por raça,
   gênero e sub-raça) e só entra quando a instância está `montado`. */
const CARGA_ANIMAL_FRACAO = 0.20;
function cargaDoAnimal(instancia, criatura, itens, catalogoBySlug, pesoDoCavaleiro) {
  const inst = instancia || {};
  const corpo = Math.max(0, Number(criatura && criatura.peso) || 0);
  const capacidade = corpo * CARGA_ANIMAL_FRACAO;
  const mapa = catalogoBySlug || {};
  let peso = 0;
  for (const it of itensDoAnimal(itens, inst.instanceId)) {
    const cat = mapa[it.slug];
    if (!cat) continue;
    peso += (cat.ocupa != null ? Number(cat.ocupa) || 0 : 0) * (it.quantidade || 1);
  }
  const cavaleiro = inst.montado ? Math.max(0, Number(pesoDoCavaleiro) || 0) : 0;
  peso += cavaleiro;
  return {
    peso, cavaleiro, capacidade,
    pct: capacidade > 0 ? Math.min(1, peso / capacidade) : 0,
    over: capacidade > 0 && peso > capacidade,
  };
}

/* O estado do bicho pronto para desenhar: as duas energias com os tetos da
   criatura e as seis condições de 0 a 100.

   SEM NADA GRAVADO O ANIMAL ESTÁ INTEIRO. É a diferença que importa entre
   `undefined` e `0`: um cavalo que acabou de ser comprado tem a barra cheia,
   não vazia — por isso o recuo de `ef`/`eh` é o MÁXIMO, e não zero.

   Sem criatura ligada não há teto nem barra: o item é um animal de nome só, e
   inventar 1/1 seria inventar bicho. */
function vitalidadeDoAnimal(instancia, criatura) {
  const it = instancia || {};
  const c = criatura || null;
  const teto = (v) => (c ? Math.max(0, Math.round(Number(v) || 0)) : 0);
  const efMax = teto(c && c.energia_fisica);
  const ehMax = teto(c && c.energia_heroica);
  const v = it.vitalidade || {};
  const dentro = (val, max) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return max;        // nada gravado = inteiro
    return Math.max(0, Math.min(max, Math.round(n)));
  };
  return {
    ef: dentro(v.ef, efMax), efMax,
    eh: dentro(v.eh, ehMax), ehMax,
    cond: barrasDoAnimal(it.condicoes),
    condMax: COND_ANIMAL_MAX,
  };
}

/* Gravar UMA barra de UM animal. Energia vai para `vitalidade`, condição para
   `condicoes` — a mesma separação do estado_atual do personagem. Frio e Calor
   gravam os dois lados da mesma chave (`termorregulacao`), porque é uma trilha
   só: esfriar é o contrário de esquentar, não outra barra.

   Chave que não é barra do animal não grava nada: a ficha do bicho não tem
   Karma nem Reputação, e aceitar a chave calada deixaria um campo morto no
   jsonb que ninguém lê e ninguém limpa. */
function comVitalidadeDoAnimal(itens, instanceId, chave, valor, criatura) {
  const lista = Array.isArray(itens) ? itens : [];
  const i = lista.findIndex((x) => x && x.instanceId === instanceId);
  if (i < 0) return lista;
  const it = lista[i];
  const n = Math.round(Number(valor) || 0);
  const noTeto = (max) => Math.max(0, Math.min(max, n));
  let campo = null;
  let patch = null;
  if (chave === 'ef' || chave === 'eh') {
    const tetos = vitalidadeDoAnimal(it, criatura);
    campo = 'vitalidade';
    patch = { ...(it.vitalidade || {}), [chave]: noTeto(chave === 'ef' ? tetos.efMax : tetos.ehMax) };
  } else if (chave === 'frio' || chave === 'calor') {
    const v = noTeto(COND_ANIMAL_MAX);
    campo = 'condicoes';
    patch = { ...(it.condicoes || {}), termorregulacao: chave === 'frio' ? -v : v };
  } else if (CONDICOES_ANIMAL_KEYS.has(chave)) {
    campo = 'condicoes';
    patch = { ...(it.condicoes || {}), [chave]: noTeto(COND_ANIMAL_MAX) };
  } else {
    return lista;
  }
  const out = lista.slice();
  out[i] = { ...it, [campo]: patch };
  return out;
}

/* ── O ARREAMENTO ───────────────────────────────────────────────────────────
   Duas portas diferentes, porque são duas perguntas diferentes.

   PEÇA DE MONTARIA (sela, cabeçada, barda, chanfron… — as onze casas que não
   são o atrelado): quem decide é `criaturas.montaria`. Pedido do usuário em
   27/10/2026: "Os animais que podem ser montados, podem usar os itens de
   montaria."

   Até aqui a porta era a mesma do atrelado — o CSV `itens.animal_subtipos`,
   escrito à mão com sete subtipos (Cavalo, Grifo, Dragão, Avestruz, Pônei,
   Elefante, Camelo). O banco tem 28 criaturas montáveis em VINTE subtipos, e
   as treze que ficavam de fora (Pégaso, Unicórnio, Mula, Quimera, Mamute,
   Búfalo, Tigre, Águia, Drake, Dradenar, Cérberus, Cavalum, Vaca) não podiam
   receber peça nenhuma. Uma lista escrita à mão ao lado de uma coluna que já
   responde a mesma pergunta só sabe ficar velha: criatura montável nova
   nascia sem sela e ninguém era avisado.

   ATRELADO (carroça, trenó): continua no CSV, e é outra pergunta — quem PUXA
   não precisa ser montável. O boi puxa o carro e não se monta; o lobo puxa o
   trenó. Ver scripts/sql/arreamento-e-atrelado-2026-10-05.sql.

   CARGA SOLTA: peça sem casa e sem lista serve em qualquer bicho — um saco de
   farinha vai no lombo de qualquer um. Mas peça COM restrição e sem a criatura
   em mão é recusada: "não sei que bicho é este" não pode valer como "pode". */
function subtiposDaPeca(cat) {
  return String((cat && cat.animal_subtipos) || '')
    .split(',').map((s) => normalizar(s)).filter(Boolean);
}
const ARREIO_ATRELADO = 'atrelado';
function ehPecaDeMontaria(cat) {
  const casa = String((cat && cat.slot_arreio) || '').trim();
  return !!casa && casa !== ARREIO_ATRELADO;
}
function animalEhMontaria(criatura) {
  return !!criatura && criatura.montaria === true;
}
function animalAceitaAPeca(cat, criatura) {
  if (ehPecaDeMontaria(cat)) return animalEhMontaria(criatura);
  const lista = subtiposDaPeca(cat);
  if (!lista.length) return true;
  const sub = normalizar(criatura && criatura.subtipo);
  return !!sub && lista.includes(sub);
}
// Por que a peça foi recusada — a peça de montaria tem aviso próprio, senão o
// jogador lê uma lista de subtipos que não é mais a regra.
function motivoDaRecusaNoAnimal(cat, criatura) {
  if (animalAceitaAPeca(cat, criatura)) return null;
  return ehPecaDeMontaria(cat) ? 'nao_e_montaria' : 'animal_errado';
}

// A casa do mapa do animal em que a peça entra. Sem casa própria, vai carregada.
const ANIMAL_SLOT_MOCHILA = 'mochila';
function slotNoAnimal(cat) {
  if (!cat) return null;
  const arreio = String(cat.slot_arreio || '').trim();
  if (arreio) return arreio;
  const equip = String(cat.slot_equip || '').trim();
  return equip || ANIMAL_SLOT_MOCHILA;
}
// As peças que estão num animal (o inverso de animal_id).
function itensDoAnimal(itens, animalId) {
  return (Array.isArray(itens) ? itens : []).filter((it) => it && it.animal_id === animalId);
}
const _ehAnimalCat = (cat) => !!cat && cat.criatura_id != null;

/* Pôr uma peça no bicho. Devolve { ok, slot, itens } ou { ok:false, motivo }.
   `criatura` é a linha de criaturas do ALVO — é dela que sai o subtipo; sem
   ela, peça restrita é recusada. `novoId` existe para o teste poder prever o
   instanceId da unidade que se desgarra da pilha.

   A PILHA SE PARTE: levar 3 cordas de uma vez poria 3 no lombo quando o
   jogador arrastou uma. Uma unidade vai, o resto fica na mochila do dono.

   A CASA DO ARREAMENTO NÃO CAI NA MOCHILA quando está ocupada: a segunda sela
   é RECUSADA, e não guardada no bolso do bicho — senão o jogador acha que
   arreou e entra em viagem com a sela errada. A mochila, sim, é sem fim. */
function equiparNoAnimal(itens, itemId, animalId, catalogoBySlug, criatura, novoId) {
  const lista = Array.isArray(itens) ? itens : [];
  const cat = catalogoBySlug || {};
  const alvo = lista.find((x) => x && x.instanceId === animalId);
  if (!alvo || !_ehAnimalCat(cat[alvo.slug])) return { ok: false, motivo: 'alvo_invalido' };

  const it = lista.find((x) => x && x.instanceId === itemId);
  const catI = it && cat[it.slug];
  if (!it || !catI) return { ok: false, motivo: 'item_invalido' };
  // Em uso no corpo do dono, à venda, já noutro bicho — ou sendo um bicho.
  if (it.equipado || it.vestido || it.montado || estaAVenda(it)
      || it.animal_id || _ehAnimalCat(catI)) return { ok: false, motivo: 'item_invalido' };
  const recusa = motivoDaRecusaNoAnimal(catI, criatura);
  if (recusa) return { ok: false, motivo: recusa };

  const slot = slotNoAnimal(catI);
  if (slot !== ANIMAL_SLOT_MOCHILA
      && itensDoAnimal(lista, animalId).some((x) => x.slot_animal === slot)) {
    return { ok: false, motivo: 'slot_ocupado' };
  }

  // containerId: null — a peça sai do recipiente ao subir no bicho.
  const marcas = { animal_id: animalId, slot_animal: slot, containerId: null, casa: undefined };
  const total = it.quantidade || 1;
  const out = total <= 1
    ? lista.map((x) => (x === it ? { ...x, ...marcas } : x))
    : [
      ...lista.map((x) => (x === it ? { ...x, quantidade: total - 1 } : x)),
      {
        instanceId: (novoId || novoInstanceId)(), slug: it.slug, quantidade: 1,
        equipado: false, slot: null, observacao: it.observacao || null, ...marcas,
      },
    ];
  return { ok: true, slot, itens: out };
}

// Tirar a peça do bicho: ela volta solta para a mochila do personagem.
function desequiparDoAnimal(itens, instanceId) {
  return (Array.isArray(itens) ? itens : []).map((x) => {
    if (!x || x.instanceId !== instanceId) return x;
    const out = { ...x };
    delete out.animal_id;
    delete out.slot_animal;
    return out;
  });
}

/* O aviso da recusa. `animal_errado` NOMEIA os tipos que aceitam a peça, com o
   texto do catálogo: sem isso o jogador fica adivinhando por que a sela não
   entra, e a lista está a uma coluna de distância. */
function motivoAnimalLabel(motivo, en, cat) {
  if (motivo === 'animal_errado') {
    const tipos = String((cat && cat.animal_subtipos) || '')
      .split(',').map((s) => s.trim()).filter(Boolean).join(', ');
    if (!tipos) return en ? 'This piece does not fit this animal.' : 'Esta peça não serve neste animal.';
    return en
      ? `This piece only fits: ${tipos}.`
      : `Esta peça só serve em: ${tipos}.`;
  }
  const mapa = {
    // A peça de montaria não lista subtipos: a regra é uma só, e cabe numa frase.
    nao_e_montaria: [en
      ? 'This piece only fits animals that can be ridden.'
      : 'Esta peça só serve em animais que podem ser montados.'],
    slot_ocupado: [en ? 'That spot is taken.' : 'Esta casa já está ocupada.'],
    item_invalido: [en ? 'This item cannot go on an animal.' : 'Este item não pode ir no animal.'],
    alvo_invalido: [en ? 'That target is not an animal.' : 'O alvo não é um animal.'],
    nao_e_racao: [en ? 'This is not animal feed.' : 'Isto não é ração de animal.'],
    sem_fome: [en ? 'The animal is not hungry.' : 'O animal não está com fome.'],
  };
  return (mapa[motivo] || [en ? 'Not allowed.' : 'Não é permitido.'])[0];
}

/* ── COMIDA DE BICHO ───────────────────────────────────────────────────────
   Quem alimenta animal são o Feno e a Ração Animal, e são dois slugs — não um
   grupo nem um palpite pelo nome. "Ração" (sem o "Animal") é comida de gente e
   fica de fora de propósito: ver
   scripts/sql/veneno-por-rodada-e-elixires-2026-10-05.sql, que é onde o feno
   ganhou a condição ("Reduz 5 de Fome", contra 10 da ração animal — feno é
   forragem de inverno, se junta no campo e não custa nada).

   QUANTO cada uma mata de fome sai do CATÁLOGO, e não de uma tabela aqui: o
   Mestre ajusta o efeito do item no editor e a ação acompanha. */
const SLUGS_RACAO_ANIMAL = ['feno', 'racao_animal'];
const ehRacaoDeAnimal = (cat) => !!cat && SLUGS_RACAO_ANIMAL.includes(cat.slug);

/* Quanta Fome o item tira, lido pelo parser de efeitos do sistema — o MESMO
   que o consumo do personagem usa (efeitosDoItem, 01-core/inventario-helpers),
   para "Reduz 5 de Fome" nunca querer dizer uma coisa na boca do bicho e outra
   na do dono. Item sem efeito de Fome tira 0. */
function fomeQueOItemTira(cat) {
  if (!cat) return 0;
  const efeitos = (typeof efeitosDoItem === 'function' ? efeitosDoItem : window.efeitosDoItem)(cat, 1) || [];
  const fome = efeitos.find((e) => e && e.scope === 'condicoes' && e.key === 'nutricao');
  return fome ? Math.max(0, Math.round(-fome.delta)) : 0;
}

/* Alimentar o animal: gasta UMA unidade e baixa a Fome dele. Devolve
   { ok, quanto, fome, itens } ou { ok:false, motivo }.

   BICHO SEM FOME NÃO COME, e a ração não se gasta: deixar comer à toa
   transformaria o estoque de ração em lixo com dois cliques distraídos.
   Comida demais não deixa a barra negativa — `quanto` é o que de fato entrou,
   e é esse número que a tela mostra. */
function alimentarAnimal(itens, comidaId, animalId, catalogoBySlug, criatura) {
  const lista = Array.isArray(itens) ? itens : [];
  const cat = catalogoBySlug || {};
  const comida = lista.find((x) => x && x.instanceId === comidaId);
  const catC = comida && cat[comida.slug];
  if (!comida || !ehRacaoDeAnimal(catC) || estaAVenda(comida)) return { ok: false, motivo: 'nao_e_racao' };

  const animal = lista.find((x) => x && x.instanceId === animalId);
  if (!animal || !_ehAnimalCat(cat[animal.slug])) return { ok: false, motivo: 'alvo_invalido' };

  const fome = vitalidadeDoAnimal(animal, criatura).cond.nutricao;
  if (fome <= 0) return { ok: false, motivo: 'sem_fome' };

  const quanto = Math.min(fomeQueOItemTira(catC), fome);
  if (quanto <= 0) return { ok: false, motivo: 'nao_e_racao' };

  const comFome = comVitalidadeDoAnimal(lista, animalId, 'nutricao', fome - quanto, criatura);
  /* A última unidade some do inventário em vez de ficar como pilha de zero.
     O filtro é SÓ da comida (29/10/2026): escrito como `quantidade > 0` para
     toda a lista, ele apagava qualquer instância sem o campo — uma peça antiga
     gravada sem `quantidade` desaparecia do inventário por dar feno ao cavalo. */
  const out = comFome
    .map((x) => (x && x.instanceId === comidaId ? { ...x, quantidade: (x.quantidade || 1) - 1 } : x))
    .filter((x) => !x || x.instanceId !== comidaId || (x.quantidade || 0) > 0);
  return { ok: true, quanto, fome: fome - quanto, itens: out };
}
/* ── ELO PERMANENTE com o animal (27/09/2026) ─────────────────────────────
   "Teremos um status nos animais, mesmo aqueles que não se pode montar, que
    é resultado de magias que criam um Elo Permanente com o animal." A magia
   é quem cria (Elo Animal, evocada na ficha com o animal como alvo); o
   Mestre pode desfazer. Mora na INSTÂNCIA do animal no inventário:
     elo: { permanente: true, magia, conjurador_pj_id, conjurador_nome, desde }
   Regras da magia (descrição de Elo Animal): o nível limita o estágio do
   animal (nível 1 → estágio 3, 3 → 5, 5 → 7, 7 → 9, 9 → 11) e só se tem 3
   elos permanentes ao mesmo tempo. A resistência mágica do animal fica na
   mesa, como as outras magias narrativas. */
const MAGIAS_ELO_PERMANENTE = ['elo_animal'];
const ELO_MAX_PERMANENTES = 3;
const magiaCriaElo = (m) => !!m && MAGIAS_ELO_PERMANENTE.includes(m.key);
const eloTetoEstagio = (nivel) => (Number(nivel) || 0) + 2;
const temElo = (instancia) => !!(instancia && instancia.elo && instancia.elo.permanente);
// Por que este animal não pode receber o elo agora (null = pode).
function bloqueioElo(animal, nivel, elosAtuais) {
  if (!animal) return 'sem_animal';
  if (temElo(animal.instancia)) return 'ja_tem_elo';
  const est = Number(animal.criatura && animal.criatura.estagio) || 0;
  if (nivel != null && est > eloTetoEstagio(nivel)) return 'estagio_alto';
  if ((Number(elosAtuais) || 0) >= ELO_MAX_PERMANENTES) return 'limite_elos';
  return null;
}
function motivoEloLabel(motivo, en, nivel) {
  const m = {
    ja_tem_elo:   en ? 'Already bonded' : 'Já tem elo',
    estagio_alto: en ? `Above stage ${eloTetoEstagio(nivel)}` : `Acima do estágio ${eloTetoEstagio(nivel)}`,
    limite_elos:  en ? `Limit of ${ELO_MAX_PERMANENTES} bonds` : `Limite de ${ELO_MAX_PERMANENTES} elos`,
  };
  return m[motivo] || '';
}
// Grava o elo na instância. Pilha de animais se divide: o elo é com UM deles.
function comEloNoAnimal(itens, instanceId, elo) {
  const lista = Array.isArray(itens) ? itens.slice() : [];
  const idx = lista.findIndex((it) => it.instanceId === instanceId);
  if (idx < 0) return lista;
  const it = lista[idx];
  if ((Number(it.quantidade) || 1) > 1) {
    lista[idx] = { ...it, quantidade: it.quantidade - 1 };
    lista.push({ ...it, instanceId: novoInstanceId(), quantidade: 1, montado: false, elo });
  } else {
    lista[idx] = { ...it, elo };
  }
  return lista;
}
function semEloNoAnimal(itens, instanceId) {
  return (Array.isArray(itens) ? itens : []).map((it) => {
    if (it.instanceId !== instanceId) return it;
    const { elo, ...resto } = it;
    return resto;
  });
}

/* Carrega as criaturas pelos ids (a linha inteira: a ficha mostra tudo).
   `ids` entra como string ordenada para o efeito não refazer a cada render. */
function useCriaturasPorIds(ids) {
  const chave = Array.from(new Set((ids || []).filter((x) => x != null).map(String))).sort().join(',');
  const [mapa, setMapa] = useState({});
  useEffect(() => {
    if (!chave) { setMapa({}); return undefined; }
    let cancelado = false;
    supabaseClient.from('criaturas').select('*').in('id', chave.split(','))
      .then(({ data, error }) => {
        if (cancelado) return;
        const m = {};
        if (!error) (data || []).forEach((c) => { m[c.id] = c; });
        setMapa(m);
      });
    return () => { cancelado = true; };
  }, [chave]);
  return mapa;
}
/* Carrega as criaturas-montaria uma vez. Sem a coluna no banco (script não
   aplicado) a consulta falha e a lista fica vazia: ninguém monta, nada quebra. */
function useCriaturasMontaria() {
  const [lista, setLista] = useState([]);
  useEffect(() => {
    let cancelado = false;
    supabaseClient.from('criaturas').select('*').eq('montaria', true)
      .then(({ data, error }) => { if (!cancelado) setLista(error ? [] : (data || [])); });
    return () => { cancelado = true; };
  }, []);
  return lista;
}

// Linhas de livro_pergaminhos → { livro_slug: [pergaminho_slug, …] }.
function vinculosDeLivros(linhas) {
  const out = {};
  (Array.isArray(linhas) ? linhas : []).forEach((l) => {
    if (!l || !l.livro_slug || !l.pergaminho_slug) return;
    const lista = out[l.livro_slug] || (out[l.livro_slug] = []);
    if (!lista.includes(l.pergaminho_slug)) lista.push(l.pergaminho_slug);
  });
  return out;
}

// As magias que o item ensina: o pergaminho, a sua; o livro, as vinculadas.
function magiasQueOItemEnsina(cat, vinculos, catalogoBySlug, magiasDb) {
  if (!cat) return [];
  const pergaminhos = ehPergaminhoDeMagia(cat)
    ? [cat]
    : ((vinculos && vinculos[cat.slug]) || []).map((s) => catalogoBySlug && catalogoBySlug[s]).filter(Boolean);
  const vistas = new Set();
  const out = [];
  pergaminhos.forEach((p) => {
    /* O SLUG manda, como na RPC aprender_magia (pergaminho_<key>): o nome
       no campo magia pode ficar velho depois de renomear a magia. */
    const sl = String(p.slug || '');
    const porSlug = sl.startsWith('pergaminho_') && Array.isArray(magiasDb)
      ? magiasDb.find((mg) => mg.key === sl.slice('pergaminho_'.length)) : null;
    const m = porSlug || magiaDoItem(p, magiasDb);
    if (m && !vistas.has(m.key)) { vistas.add(m.key); out.push(m); }
  });
  /* Pergaminho cuja magia sumiu do catálogo: o Aprender continua, numa linha
     AUSENTE que explica o porquê (pedido de 13/09/2026). Só com o catálogo
     já carregado — antes disso não dá para dizer que ela não existe. O livro
     só esconde o vínculo que não resolve. */
  if (!out.length && ehPergaminhoDeMagia(cat) && Array.isArray(magiasDb)) {
    out.push({ key: 'ausente:' + cat.slug, nome: cat.magia, ausente: true });
  }
  return out.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt'));
}

function bloqueioAprenderNoInventario(magia, pj, opcoes) {
  const op = opcoes || {};
  if (op.noInventario === false) return { motivo: 'aprender_no_inventario' };
  if (op.podeAprender === false) return { motivo: 'nao_e_dono' };
  if (op.aVenda) return { motivo: 'item_a_venda' };
  if (!magia || magia.ausente) return { motivo: 'magia_nao_encontrada' };
  if (!pj) return null;
  const _regra = (typeof window !== 'undefined' && window.bloqueioAprenderMagia) || null;
  return _regra ? _regra(magia, pj, op.magiasDb || []) : null;
}

/* ── TÉCNICAS PELO ITEM (22/10/2026) ──────────────────────────────────
   "Toda técnica terá um pergaminho para aprender igual a magia" — o
   pergaminho de técnica (slug pergaminho_tecnica_, itens.tecnica) ou um
   Manual que o vincula (livro_pergaminhos). Mesmo molde das magias. */
function ehPergaminhoDeTecnica(cat) {
  return !!(cat && cat.tecnica && cat.grupo === 'Consumíveis'
    && String(cat.slug || '').startsWith('pergaminho_tecnica_'));
}
function tecnicaDoItem(cat, tecnicasDb) {
  if (!cat || !Array.isArray(tecnicasDb)) return null;
  /* O SLUG manda, como na RPC aprender_tecnica: o nome no campo pode ficar
     velho depois de renomear a técnica. */
  const slug = String(cat.slug || '');
  if (slug.startsWith('pergaminho_tecnica_')) {
    const porSlug = tecnicasDb.find((t) => t.key === slug.slice('pergaminho_tecnica_'.length));
    if (porSlug) return porSlug;
  }
  if (!cat.tecnica) return null;
  const k = chaveDaMagiaPorNome(cat.tecnica);
  return tecnicasDb.find((t) => t.key === k) || tecnicasDb.find((t) => chaveDaMagiaPorNome(t.nome) === k) || null;
}
function tecnicasQueOItemEnsina(cat, vinculos, catalogoBySlug, tecnicasDb) {
  if (!cat) return [];
  const pergaminhos = ehPergaminhoDeTecnica(cat)
    ? [cat]
    : ((vinculos && vinculos[cat.slug]) || []).map((sl) => catalogoBySlug && catalogoBySlug[sl])
        .filter((pc) => pc && pc.tecnica);
  const vistas = new Set();
  const out = [];
  pergaminhos.forEach((pc) => {
    const t = tecnicaDoItem(pc, tecnicasDb);
    if (t && !vistas.has(t.key)) { vistas.add(t.key); out.push(t); }
  });
  return out.sort((a, b2) => String(a.nome || '').localeCompare(String(b2.nome || ''), 'pt'));
}
function bloqueioTecnicaNoInventario(tecnica, pj, opcoes) {
  const op = opcoes || {};
  if (op.noInventario === false) return { motivo: 'aprender_no_inventario' };
  if (op.podeAprender === false) return { motivo: 'nao_e_dono' };
  if (op.aVenda) return { motivo: 'item_a_venda' };
  if (!tecnica) return { motivo: 'tecnica_nao_encontrada' };
  if (!pj) return null;
  const _regra = (typeof window !== 'undefined' && window.bloqueioAprenderTecnica) || null;
  return _regra ? _regra(tecnica, pj, op.tecnicasDb || []) : null;
}

function motivoAprenderLabel(motivo, en, dados) {
  // Milagre (22/10/2026): os textos moram com a regra, em game-data.jsx.
  const _mil = (typeof window !== 'undefined' && window.motivoMilagreLabel) || null;
  const txtMilagre = _mil && _mil(motivo, en);
  if (txtMilagre) return txtMilagre;
  /* Técnica (22/10/2026): a janela Estudar também ensina técnica — os
     textos que falam de magia trocam de palavra (dados.tipo). */
  const tec = !!(dados && dados.tipo === 'tecnica');
  // Pontos com os números: é o motivo que o jogador mais precisa entender.
  if (motivo === 'pontos_insuficientes' && dados && dados.faltam != null) {
    const qual = en ? (tec ? 'technique' : 'magic') : (tec ? 'técnica' : 'magia');
    return en
      ? `Not enough ${qual} points: ${dados.faltam} short (using ${dados.gasto} of ${dados.total}).`
      : `Pontos de ${qual} insuficientes: faltam ${dados.faltam} (usa ${dados.gasto} de ${dados.total}).`;
  }
  if (tec) {
    const mapTec = {
      item_nao_ensina:      en ? 'This item does not teach this technique.' : 'Este item não ensina essa técnica.',
      pontos_insuficientes: en ? 'Not enough technique points.'            : 'Pontos de técnica insuficientes.',
    };
    if (mapTec[motivo]) return mapTec[motivo];
  }
  const map = {
    nao_e_dono:             en ? 'Only the character’s owner can learn from this item.' : 'Só o dono do personagem pode aprender com este item.',
    aprender_no_inventario: en ? 'Learn it from the Inventory.'                       : 'Aprenda pelo Inventário.',
    item_a_venda:           en ? 'For sale in the shop — withdraw the listing first.' : 'À venda na loja — retire o anúncio para estudar.',
    item_nao_ensina:        en ? 'This item does not teach this spell.'               : 'Este item não ensina essa magia.',
    ja_no_maximo:           en ? 'You already know this spell at the highest level.'  : 'Você já tem essa magia no nível máximo.',
    nivel_sem_texto:        en ? 'This spell has no next level in the catalog — ask the GM.' : 'Essa magia não tem o próximo nível no catálogo — peça ao Mestre.',
    pontos_insuficientes:   en ? 'Not enough magic points.'                           : 'Pontos de magia insuficientes.',
    acima_do_estagio:       en ? "The next level exceeds your character's stage."     : 'O próximo nível passa do seu estágio.',
    magia_nao_encontrada:   en ? 'Spell not found in the catalog.'                    : 'Magia não encontrada no catálogo.',
    tecnica_nao_encontrada: en ? 'Technique not found in the catalog.'                : 'Técnica não encontrada no catálogo.',
    item_nao_encontrado:    en ? 'Item not found in your inventory.'                  : 'Item não encontrado no inventário.',
    pj_nao_encontrado:      en ? 'Character not found.'                               : 'Personagem não encontrado.',
    nao_autenticado:        en ? 'You are not signed in.'                             : 'Você não está autenticado.',
  };
  return map[motivo] || (tec
    ? (en ? 'Could not learn the technique.' : 'Não foi possível aprender a técnica.')
    : (en ? 'Could not learn the spell.' : 'Não foi possível aprender a magia.'));
}

/* ── QtdDoCard — a quantidade no canto do card do quadriculado (26/09/2026):
   'os números de quantidade no quadriculado devem usar os ícones
   ti-number-N-small'. O Tabler tem de 0 a 100; acima disso não há ícone, e o
   número volta a ser escrito. O leitor de tela lê o número pelo aria-label. */
function QtdDoCard({ n }) {
  const v = Number(n);
  const temIcone = Number.isInteger(v) && v >= 0 && v <= 100;
  return (
    <span className="inv-card-qty" data-qtd={v} aria-label={String(v)}>
      {temIcone ? <i className={'ti ti-number-' + v + '-small'} aria-hidden="true" /> : v}
    </span>
  );
}

/* ── GradeDoRecipiente — o conteúdo de um recipiente no QUADRICULADO do
   inventário (26/09/2026): "Ao clicar na aba conteúdo de um item, quero ver o
   quadriculado igual do inventário." Os mesmos cards (.inv-card: ícone,
   quantidade, selos, faísca de mágico, barra de resistência) na mesma grade
   (.inv-bag-grid--slots), com as casas vazias completando as linhas. Sem
   arrastar: aqui se olha e se abre o item. */
/* Quantas casas de 50px (vão de 5,4px) cabem na largura da grade. A janela
   do item mede 728px e o painel do baú ~310px: um número fixo de colunas
   sobrava ou transbordava num dos dois. */
function useColunasDaGrade(ref, padrao = 5) {
  const [cols, setCols] = useState(padrao);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    /* QUEM CONTA AS COLUNAS É O CSS (26/10/2026, pedido do usuário: "os
       ícones não estão alinhados, às vezes quebra em muitas linhas"). A
       conta à mão (50px de casa + 5,4px de vão) só valia para UMA das cinco
       regras que já pintaram esta grade; onde a casa ou o vão fossem outros,
       o número de casas-fantasma não fechava a fileira e a última linha
       saía torta. `grid-template-columns` resolvido traz as faixas que o
       navegador de fato desenhou — é sempre o número certo. */
    const medir = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      const faixas = String(getComputedStyle(el).gridTemplateColumns || '').trim();
      const n = faixas && faixas !== 'none' ? faixas.split(/\s+/).length : 0;
      setCols(n > 0 ? n : Math.max(1, Math.floor((w - 5.4) / 55.4)));
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref]);
  return cols;
}

/* 23/10/2026 — a grade só completa a última fileira (antes desenhava 26 casas
   vazias fixas, mesmo num recipiente que guarda 2). */
/* ── AS CASAS SÃO AS DO PORTE (29/10/2026) ───────────────────────────────
   "Vamos definir 4 tipos de quantidades de slots para os itens: pequenos 3,
   médios 6, grandes 9, muito grandes 15." (usuário)

   Antes disto o número de casas era inventado — pela largura da janela, ou
   (meu erro de 28/10) pelo peso que o recipiente suporta. Agora ele é uma
   propriedade do recipiente: `casasDoRecipiente` (01-core), 3, 6, 9 ou 15.

   O que continua saindo do modal são as COLUNAS: cabem tantas casas de 78px
   quantas a largura permitir, e as casas do porte se distribuem nelas. Assim
   o número é o que o Mestre definiu e o desenho é o que cabe na tela. */
function GradeDoRecipiente({ filhos, catalogoBySlug, lang, onAbrir, abrirTip, fecharTip, casas = null }) {
  const en = lang === 'en';
  const gradeRef = useRef(null);
  const COLS = useColunasDaGrade(gradeRef);
  const lista = filhos || [];
  /* Mais peças do que casas só acontece com dado antigo, de antes do porte:
     a grade cresce para não esconder nada de ninguém. */
  const total = Math.max(Number(casas) || 0, lista.length) || COLS;
  return (
    <div ref={gradeRef} className="inv-bag-grid inv-bag-grid--slots det-grade-recipiente">
      {lista.map((it) => {
        const cat = catalogoBySlug[it.slug];
        const nome = (cat && cat.nome) || it.slug;
        const resMax = Number((cat && cat.resistencia) || 0);
        const resAtual = Number.isFinite(Number(it.res)) ? Math.max(0, Math.min(resMax, Number(it.res))) : resMax;
        const resPct = resMax > 0 ? Math.round((resAtual / resMax) * 100) : 0;
        return (
          <button key={it.instanceId} type="button" data-filho={it.instanceId}
            className={'inv-card' + (cat && cat.magico ? ' inv-card--magico' : '')}
            onClick={() => onAbrir && onAbrir(it.instanceId)}
            aria-label={nome + (it.quantidade > 1 ? ' ×' + it.quantidade : '')}
            {...propsTip(abrirTip, fecharTip, { title: nome })}>
            {it.quantidade > 1 && <QtdDoCard n={it.quantidade} />}
            <span className="inv-card-head">
              <span className="inv-card-ic"><ItemIcone cat={cat} icon={invItemIcon(cat)} /></span>
            </span>
            {cat && cat.magico && (
              <span className="inv-faisca" role="img" aria-label={en ? 'Magic' : 'Mágico'}>
                <span className="inv-pill-letra" aria-hidden="true">M</span>
              </span>
            )}
            <span className="inv-card-pills">
            </span>
          </button>
        );
      })}
      {Array.from({ length: total - lista.length }).map((_, i) => (
        <span key={'vazio-' + i} className="inv-slot-ghost" aria-hidden="true" />
      ))}
    </div>
  );
}

function DetalhesItemModal({
  instance, catalogoBySlug, raca, slotsState, todosItens,
  containersDisponiveis, pjsHistoria, lang,
  onClose, onVoltar, onEquipar, onDesequipar, onUsar, onPreparar, onPrepararCarne, onAprenderMagia, pjAprendiz, magiasDb, tecnicasDb, vinculos, onDestruir,
  onMoverParaContainer,
  onVestir, onDespir,
  criaturaMontaria, onMontar, onDesmontar,
  onRemoverDoContainer, onAbrirDetalhesFilho, contexto,
  onVender, podeVender,
  // Veneno na arma ou na flecha (28/09/2026): (venenoId, alvoId, qtd) → { ok, motivo? }.
  onEnvenenar,
  onBonus,
  /* Quem usa o item — o card da aba Usar (26/09/2026). { nome, foto_url }.
     O uso de item vale para o próprio personagem, então há um card só. */
  usuario,
  /* No inventário largo, a janela vira o painel ao lado da grade (22/10/2026). */
  alvoPainel = null,
  pjOrigemId = null, onTransferir = null, lugarAtual = '', onProposta = null,
}) {
  const [tip, abrirTip, fecharTip, manterTip] = usePortalTooltip(60);
  const [confirmandoDestruir, setConfirmandoDestruir] = useState(false);
  const [confirmandoUsar, setConfirmandoUsar] = useState(false);
  const [confirmandoPreparar, setConfirmandoPreparar] = useState(false);
  const [abaterErro, setAbaterErro] = useState(null);
  const [abatendo, setAbatendo] = useState(false);
  const [preparandoCarne, setPreparandoCarne] = useState(false);
  // Janela Estudar (22/10/2026): livro ou pergaminho que ensina magia.
  const [estudando, setEstudando] = useState(false);
  const [mostrarArmazenar, setMostrarArmazenar] = useState(false);
  // Envenenar arma ou flecha com este veneno (28/09/2026): o alvo marcado.
  const [mostrarEnvenenar, setMostrarEnvenenar] = useState(false);
  const [envAlvoId, setEnvAlvoId] = useState('');
  const [armazContId, setArmazContId] = useState('');
  // Janela de leitura do livro (itens.doc_url), 13/09/2026.
  const [lendo, setLendo] = useState(false);
  /* A NOTA DO ITEM saiu por completo em 26/09/2026 ("remova completamente o
     sistema de nota dos itens"). O campo `observacao` que já estiver gravado
     nas instâncias fica no banco, sem tela. */
  /* A QUANTIDADE DENTRO DA JANELA (27/09/2026): "Ao clicar para usar água, eu
     vi que abriu outro modal para selecionar quantidade. O seletor de
     quantidade deve aparecer no modal de selecionar alvo." Pilha: o mesmo
     QuantidadeStepper aparece na aba Usar e nas etapas de Descartar,
     Transferir e Armazenar; a ação sai com a quantidade escolhida, sem a
     segunda janela. */
  const [qtdAcao, setQtdAcao] = useState(1);
  // Vender = publicar na loja (27/09/2026): quantidade e preço pedidos.
  const [mostrarVender, setMostrarVender] = useState(false);
  const [vendaLugar, setVendaLugar] = useState(lugarAtual || '');
  // A proposta deste item, quando ele está travado na venda.
  const [proposta, setProposta] = useState(null);
  const [propostaOcupada, setPropostaOcupada] = useState(false);
  useEffect(() => {
    if (!instance || !instance.anuncio_id || !onProposta) { setProposta(null); return; }
    let vivo = true;
    supabaseClient.from('anuncios_loja').select('id, status, lugar, preco_latao, preco_contra, quantidade')
      .eq('id', instance.anuncio_id).maybeSingle().then(({ data }) => { if (vivo) setProposta(data || null); });
    return () => { vivo = false; };
  }, [instance && instance.anuncio_id]);
  // Transferir: a etapa com os amigos de pacto selado (listar_amizades).
  const [mostrarTransferir, setMostrarTransferir] = useState(false);
  const [amigos, setAmigos] = useState(null);
  useEffect(() => {
    if (!mostrarTransferir || !pjOrigemId || amigos) return;
    let vivo = true;
    supabaseClient.rpc('listar_amizades', { p_pj_id: pjOrigemId }).then(({ data }) => {
      if (vivo) setAmigos((data || []).filter((p) => p.estado === 'selado'));
    });
    return () => { vivo = false; };
  }, [mostrarTransferir, pjOrigemId, amigos]);
  const [vendaQtd, setVendaQtd] = useState(1);
  const [vendaPreco, setVendaPreco] = useState(0);
  const [publicando, setPublicando] = useState(false);
  const [vendaErro, setVendaErro] = useState(null);
  const en = lang === 'en';
  const slotLabels = SLOT_LABELS[en ? 'en' : 'pt'];
  // contexto==='ficha' mostra só as ações locais (Usar/Descartar); as pesadas
  // (Equipar/Vestir/Transferir/Aprender/Armazenar) ficam para o Inventário.
  const acoesPesadas = contexto !== 'ficha';

  // Escape e travamento de scroll já são responsabilidade do ModalShell — não duplicar aqui.

  // Ao trocar de item, fecha confirmação de destruir e seletor de recipiente
  useEffect(() => {
    setConfirmandoDestruir(false);
    setConfirmandoUsar(false);
    setConfirmandoPreparar(false);
    setPreparandoCarne(false);
    setEstudando(false);
    setMostrarArmazenar(false);
    setMostrarEnvenenar(false);
    setArmazContId(''); setEnvAlvoId('');
    setLendo(false);
  }, [instance?.instanceId]);

  if (!instance) return null;
  const cat = catalogoBySlug[instance.slug];
  if (!cat) return null;

  const categoria = cat.categoria_equip;
  // Joias/acessórios vestíveis usam o sistema de vestir; não mostrar botão Equipar.
  const equipavel = !!categoria && !ehVestimenta(cat);
  const consumivel = (cat.grupo === 'Consumíveis') || cat.tipo === 'L';
  // Animal preparável: grupo Animais com slug de resultado definido no catálogo.
  // Animal ligado a uma criatura: é dela que saem a carne e o peso (28/09/2026).
  const ehAnimal = cat.grupo === 'Animais' && cat.criatura_id != null;
  // Pergaminho de magia: consumível que declara magia + nivel_magia. Item mágico
  // de outro grupo com magia (livro, anel, arma) NÃO é pergaminho.
  const ehPergaminhoMagia = ehPergaminhoDeMagia(cat);
  const isContainer = ehContainer(cat);
  // Pré-calcula conteúdo do container uma única vez; usado tanto para renderizar
  // det-container-content como para suprimir o espaçamento quando vazio/ausente.
  const containerData = isContainer ? capacidadeContainer(instance, todosItens, catalogoBySlug) : null;
  const hasContainerContent = !!(containerData?.filhos?.length);
  const temMultiplos = instance.quantidade > 1;
  const maxQtdAcao = Math.max(1, Number(instance.quantidade) || 1);
  const seletorQtd = temMultiplos ? (
    <QuantidadeStepper value={Math.min(qtdAcao, maxQtdAcao)} min={1} max={maxQtdAcao}
      onChange={setQtdAcao} label={en ? 'Quantity' : 'Quantidade'}
      centro={<>{Math.min(qtdAcao, maxQtdAcao)} <span className="qtd-de-max">{en ? 'of' : 'de'} {maxQtdAcao}</span></>} />
  ) : null;
  const qtdEscolhida = temMultiplos ? Math.min(qtdAcao, maxQtdAcao) : undefined;
  // O que este veneno pode untar: as armas (menos o arco) e as flechas comuns.
  const alvosDoVeneno = ehVenenoDeArma(cat)
    ? (todosItens || []).filter((x) => {
        const c = x && catalogoBySlug[x.slug];
        return c && (armaAceitaVeneno(c) || c.slug === 'flecha') && (Number(x.quantidade) || 0) > 0;
      })
    : [];
  // Carne que vira comida (24/09/2026): as receitas e quanto dela há no total.
  const receitasCarne = receitasDaCarne(instance.slug);
  const carneTotal = receitasCarne.length ? carneDisponivel(todosItens, instance.slug) : 0;
  const destinoBonus = destinoBonusItem(cat);
  const bonusItem = destinoBonus ? bonusDoItem(instance) : 0;
  /* Itens de defesa mostram a RESISTÊNCIA nos ícones, junto de ocupa e
     absorção (pedido do usuário, 12/09/2026). O número é a resistência atual
     da instância (a mesma conta da barra do card); o máximo vai no tooltip. */
  const resMaxItem = Number(cat.resistencia || 0);
  const mostraResistencia = cat.grupo === 'Armaduras' && resMaxItem > 0;
  const resAtualItem = Number.isFinite(Number(instance.res))
    ? Math.max(0, Math.min(resMaxItem, Number(instance.res))) : resMaxItem;

  // Análise de equipar
  let podeEquipar = false, bloqueioEquipar = null, maosReq = null;
  if (equipavel && !instance.equipado && slotsState) {
    if (categoria === 'armadura') {
      const slot = cat.slot_equip;
      if (!slot) bloqueioEquipar = en ? 'No slot defined.' : 'Sem slot definido.';
      else if (slotsState[slot]) bloqueioEquipar = en ? `Slot ${slotLabels[slot]} occupied.` : `Slot ${slotLabels[slot]} ocupado.`;
      else podeEquipar = true;
    } else {
      maosReq = getMaosRequeridas(cat, raca);
      if (!maosReq) bloqueioEquipar = en ? `Forbidden for ${raca}.` : `Proibido para ${raca}.`;
      else {
        const livres = (slotsState.mao_d ? 0 : 1) + (slotsState.mao_e ? 0 : 1);
        /* Sem "mão(s) livre(s)" (22/10/2026): singular e plural de verdade. */
        if (livres < maosReq) bloqueioEquipar = en
          ? `Needs ${maosReq} free hand${maosReq === 1 ? '' : 's'}; ${livres === 0 ? 'none' : livres} free.`
          : `Precisa de ${maosReq} ${maosReq === 1 ? 'mão livre' : 'mãos livres'}; ${livres === 0 ? 'nenhuma livre' : livres === 1 ? '1 livre' : livres + ' livres'}.`;
        else podeEquipar = true;
      }
    }
  }

  // Devolve 'feito' (moveu direto), 'pendente' (abriu a janela de quantidade)
  // ou undefined (não coube / não aceita).
  const handleContainerChange = (novoContainerId) => (
    onMoverParaContainer(instance.instanceId, novoContainerId || null)
  );

  // Análise de vestir (grupo "Vestimentas"). O slot vem do catálogo ou é inferido pelo grupo.
  const vestivel = ehVestimenta(cat);
  let podeVestir = false, bloqueioVestir = null, vesteInfo = null;
  if (vestivel && !instance.vestido) {
    const slotInferido = inferirSlotEquip(cat);
    const st = vesteSlotState(slotInferido, todosItens, catalogoBySlug);
    vesteInfo = st;
    if (!st.cfg) bloqueioVestir = en ? 'No slot defined for this item.' : 'Sem slot definido para este item.';
    else if (st.livre < 1) bloqueioVestir = en ? `Slot full (${st.usado}/${st.max}).` : `Slot cheio (${st.usado}/${st.max}).`;
    else if (st.gastaSlot && slotsState && slotsState[slotInferido]) bloqueioVestir = en ? `${slotLabels[slotInferido] || slotInferido} occupied by gear.` : `${slotLabels[slotInferido] || slotInferido} ocupado por equipamento.`;
    else podeVestir = true;
  }

  // Containers disponíveis incluem o atual do item (mesmo que "cheio", pois o item já está lá)
  const containerAtual = instance.containerId
    ? todosItens.find((it) => it.instanceId === instance.containerId)
    : null;
  const opcoesContainer = [
    ...containersDisponiveis,
    ...(containerAtual && !containersDisponiveis.find((c) => c.instanceId === containerAtual.instanceId)
      ? [containerAtual] : []),
  ];
  const temOndeArmazenar = opcoesContainer.length > 0;
  const containerAtualNome = containerAtual
    ? (catalogoBySlug[containerAtual.slug]?.nome || containerAtual.slug)
    : null;

  /* ── O MODAL NOVO (26/09/2026) ──────────────────────────────────────────
     "Eu quero que o modal de itens na ficha, na loja e no inventário, abram
      um modal igual [ao do Comércio]. Mas junto do X, teremos os seguintes
      ícones [...] Não teremos mais o rodapé." (usuário)
     A janela é o BestDetalheModal (09-bestiario) com o MESMO corpo do Comércio
     (BestItemFicha) — Descrição, Efeitos, Características, Magia — e as abas
     saem dele. As ações são ícones ao lado do X, com o nome e o motivo do
     bloqueio no tooltip. Uma ação que precisa de escolha (descartar, usar,
     preparar, transferir, armazenar, comentar) troca o CORPO pela etapa, com
     Cancelar/Confirmar dentro dela — não há mais rodapé. */
  const Janela = (typeof BestDetalheModal !== 'undefined' && BestDetalheModal) || window.BestDetalheModal;
  const Ficha = (typeof BestItemFicha !== 'undefined' && BestItemFicha) || window.BestItemFicha;
  const Linha = (typeof BestLinha !== 'undefined' && BestLinha) || window.BestLinha;
  const etapaAberta = confirmandoDestruir || confirmandoUsar || preparandoCarne || confirmandoPreparar
    || mostrarArmazenar || mostrarVender || mostrarEnvenenar || mostrarTransferir;
  const fecharEtapas = () => {
    fecharTip();
    setConfirmandoDestruir(false); setConfirmandoUsar(false); setPreparandoCarne(false);
    setConfirmandoPreparar(false); setMostrarArmazenar(false); setMostrarEnvenenar(false);
    setMostrarVender(false); setMostrarTransferir(false); setVendaErro(null); setQtdAcao(1); setAbaterErro(null);
    setArmazContId(''); setEnvAlvoId('');
  };
  const abrirEtapa = (setter) => { fecharEtapas(); setter(true); };

  // ── Os ícones, na ordem pedida; os que o pedido não listava vão ao fim. ──
  const motivoVenda = (acoesPesadas && onVender && cat.grupo !== 'Moedas')
    ? bloqueioVenda(instance, { ...(podeVender || {}), temConteudo: hasContainerContent })
    : null;
  // O que este item ensina (pergaminho: a sua magia; livro: as vinculadas).
  const ensina = magiasQueOItemEnsina(cat, vinculos, catalogoBySlug, magiasDb);
  const ensinaTec = tecnicasQueOItemEnsina(cat, vinculos, catalogoBySlug, tecnicasDb);
  const ehPergaminhoQueEnsina = ehPergaminhoMagia || ehPergaminhoDeTecnica(cat);
  // Frasco alquímico e flecha não se usam pela mão (28/09/2026).
  const podeUsar = consumivel && !equipavel && !isContainer && !ehPergaminhoQueEnsina && !ehFlecha(cat)
    && !ehItemDeMagiaEmBatalha(cat);
  const acoesTopo = [
    acoesPesadas && onVender && cat.grupo !== 'Moedas' && {
      chave: 'vender', icone: 'ti-coins', ativo: mostrarVender,
      rotulo: en ? 'Sell in the shop' : 'Vender na loja',
      dica: motivoVenda ? { title: en ? 'Sell' : 'Vender', desc: motivoVendaLabel(motivoVenda, en) } : null,
      desativado: !!motivoVenda,
      // Começa pela pilha inteira e pelo valor de tabela; clicar de novo fecha.
      onClick: () => {
        if (mostrarVender) { fecharEtapas(); return; }
        const q = Math.max(1, Number(instance.quantidade) || 1);
        setVendaQtd(q); setVendaPreco(Number(cat.valor_latao) || 0);
        abrirEtapa(setMostrarVender);
      },
    },
    onTransferir && pjOrigemId && cat.grupo !== 'Moedas' && {
      chave: 'transferir', icone: 'ti-arrows-left-right', ativo: mostrarTransferir,
      rotulo: en ? 'Transfer' : 'Transferir',
      dica: estaAVenda(instance) ? { title: en ? 'Transfer' : 'Transferir', desc: en ? 'This item is for sale in the shop. Withdraw it first.' : 'Este item está à venda na loja. Retire o anúncio antes.' } : null,
      desativado: estaAVenda(instance),
      onClick: () => { if (mostrarTransferir) { fecharEtapas(); return; } abrirEtapa(setMostrarTransferir); },
    },
    {
      chave: 'descartar', icone: 'ti-trash', perigo: true, armado: confirmandoDestruir,
      rotulo: en ? 'Discard' : 'Descartar',
      // Pilha: vai direto pra janela de quantidade (a padrão).
      onClick: () => (confirmandoDestruir ? fecharEtapas() : abrirEtapa(setConfirmandoDestruir)),
    },
    /* ── VOLTAR À JANELA DE ONDE SE VEIO (28/10/2026, pedido do usuário:
       "ao navegar por um item ou outro, adicione ao lado de descartar um
       botão para voltar ao modal anterior").

       Quem chega aqui pela casa do boneco passou pela janela da REGIÃO, e ela
       FECHA ao abrir esta (`fechar()` antes do `setDetalheCintoId`). Sem este
       botão, voltar significava fechar, procurar a casa no boneco e clicar de
       novo — três gestos para desfazer um.

       Só aparece quando há de onde voltar: o chamador passa `onVoltar`. No
       Inventário, onde esta janela é a primeira, ele não existe e o botão
       não nasce. O X continua fechando tudo, que é outra coisa. */
    onVoltar && {
      chave: 'voltar', icone: 'ti-arrow-back-up',
      rotulo: en ? 'Back' : 'Voltar',
      onClick: () => onVoltar(),
    },
    acoesPesadas && equipavel && (instance.equipado ? {
      chave: 'desequipar', icone: 'ti-shield-off', rotulo: en ? 'Unequip' : 'Desequipar',
      onClick: () => onDesequipar(instance.instanceId),
    } : {
      chave: 'equipar', icone: 'ti-shield', rotulo: en ? 'Equip' : 'Equipar',
      desativado: !podeEquipar,
      dica: bloqueioEquipar ? { title: en ? 'Equip' : 'Equipar', desc: bloqueioEquipar } : null,
      onClick: () => onEquipar(instance.instanceId),
    }),
    acoesPesadas && vestivel && (instance.vestido ? {
      chave: 'despir', icone: 'ti-shirt-off', rotulo: en ? 'Take off' : 'Despir',
      onClick: () => onDespir(instance.instanceId),
    } : {
      chave: 'vestir', icone: 'ti-shirt', rotulo: en ? 'Wear' : 'Vestir',
      desativado: !podeVestir,
      dica: bloqueioVestir ? { title: en ? 'Wear' : 'Vestir', desc: bloqueioVestir } : null,
      onClick: () => onVestir(instance.instanceId),
    }),
    acoesPesadas && !isContainer && !instance.equipado && !instance.vestido && !instance.montado && {
      chave: 'armazenar', icone: 'ti-download', ativo: mostrarArmazenar,
      rotulo: en ? 'Store' : 'Armazenar',
      desativado: !temOndeArmazenar,
      dica: !temOndeArmazenar ? { title: en ? 'Store' : 'Armazenar', desc: en ? 'No compatible container in inventory' : 'Nenhum recipiente compatível no inventário' } : null,
      // Clicar de novo fecha a escolha (26/09/2026 — não há mais Cancelar).
      onClick: () => (mostrarArmazenar ? fecharEtapas() : abrirEtapa(setMostrarArmazenar)),
    },
    /* ENVENENAR (28/09/2026): "Itens venenosos (Blueta, Leopis, Theonia) podem
       ser usados em armas e flechas". O card marca a arma ou a pilha de
       flechas; o rodapé envenena. */
    acoesPesadas && onEnvenenar && ehVenenoDeArma(cat) && {
      chave: 'envenenar', icone: 'ti-skull', ativo: mostrarEnvenenar,
      rotulo: en ? 'Poison a weapon or arrows' : 'Envenenar arma ou flechas',
      desativado: alvosDoVeneno.length === 0,
      dica: alvosDoVeneno.length === 0
        ? { title: en ? 'Poison' : 'Envenenar', desc: en ? 'No weapon or arrow in the inventory.' : 'Nenhuma arma ou flecha no inventário.' }
        : null,
      onClick: () => (mostrarEnvenenar ? fecharEtapas() : abrirEtapa(setMostrarEnvenenar)),
    },
    /* Usar saiu dos ícones em 26/09/2026: "Comportamento igual da magia, ao
       clicar no card do alvo, o card fica selecionado e vermelho, se clicar
       novamente [o item] é usado." — ver a aba Usar, abaixo. */
    acoesPesadas && onPrepararCarne && receitasCarne.length > 0 && {
      chave: 'preparar-carne', icone: 'ti-meat', ativo: preparandoCarne,
      rotulo: en ? 'Prepare' : 'Preparar',
      onClick: () => abrirEtapa(setPreparandoCarne),
    },
    acoesPesadas && ehAnimal && onPreparar && !instance.montado && {
      chave: 'preparar', icone: 'ti-meat', ativo: confirmandoPreparar,
      rotulo: en ? 'Slaughter' : 'Abater',
      onClick: () => abrirEtapa(setConfirmandoPreparar),
    },
    // ── Os que o pedido não listava (continuam existindo) ──
    acoesPesadas && criaturaMontaria && onMontar && (instance.montado ? {
      chave: 'desmontar', icone: 'ti-horse-toy', rotulo: en ? 'Dismount' : 'Desmontar',
      onClick: () => onDesmontar(instance.instanceId),
    } : {
      chave: 'montar', icone: 'ti-horse-toy', rotulo: en ? 'Mount' : 'Montar',
      onClick: () => onMontar(instance.instanceId),
    }),
    /* Aprender/Estudar (22/10/2026): sempre aparece quando o item ensina;
       o porquê de não dar mora na janela Estudar, linha a linha. */
    (ensina.length + ensinaTec.length) > 0 && {
      chave: ehPergaminhoQueEnsina ? 'aprender' : 'estudar',
      icone: 'ti-school',
      rotulo: ehPergaminhoQueEnsina ? (en ? 'Learn' : 'Aprender') : (en ? 'Study' : 'Estudar'),
      onClick: () => setEstudando(true),
    },
    cat.doc_url && {
      chave: 'ler', icone: 'ti-book', rotulo: en ? 'Read' : 'Ler',
      onClick: () => setLendo(true),
    },
  ];
  /* À VENDA NA LOJA (02/10/2026): travado até retirar o anúncio — decisão do
     usuário. Toda ação fica desativada com o motivo na dica; ler um livro
     não mexe no item e continua valendo. */
  const aVenda = estaAVenda(instance);
  const dicaAVenda = en ? 'For sale in the shop — withdraw the listing to use it.' : 'À venda na loja — retire o anúncio para usar.';
  /* BARRA COM NOME (22/10/2026): a ação que o item existe para fazer —
     equipar, vestir, estudar/aprender, montar — vem primeiro e acende em
     ouro; Descartar, a destrutiva, vai para o fim da faixa. */
  const PRINCIPAIS = ['equipar', 'vestir', 'aprender', 'estudar', 'montar'];
  const _acoes = acoesTopo.filter(Boolean);
  // Bloqueada, a principal continua no primeiro lugar (apagada, com o motivo
  // escrito): a barra nunca se reordena pelo estado.
  const _principal = _acoes.find((a) => PRINCIPAIS.includes(a.chave));
  const acoesOrdenadas = [
    ...(_principal ? [{ ..._principal, principal: true }] : []),
    ..._acoes.filter((a) => a !== _principal && a.chave !== 'descartar'),
    ..._acoes.filter((a) => a.chave === 'descartar'),
  ];
  const acoesDaJanela = aVenda
    ? acoesOrdenadas.map((a) => (a.chave === 'ler' ? a : {
      ...a, ativo: false, armado: false, desativado: true, onClick: () => {},
      dica: { title: a.rotulo, desc: dicaAVenda },
    }))
    : acoesOrdenadas;

  // ── Linhas da INSTÂNCIA dentro de Características ──
  const ondeEsta = aVenda ? (proposta && proposta.status === 'proposta' ? (en ? 'Offer sent' : 'Proposta enviada')
      : proposta && proposta.status === 'contraproposta' ? (en ? 'Counteroffer' : 'Contraproposta')
      : (en ? 'For sale in the shop' : 'À venda na loja'))
    : instance.montado ? (en ? 'Mounted' : 'Montado')
    : instance.equipado ? (en ? 'Equipped' : 'Equipado') + (instance.slot && slotLabels[instance.slot] ? ` · ${slotLabels[instance.slot]}` : '')
    : instance.vestido ? (en ? 'Worn' : 'Vestido')
    : containerAtualNome ? (en ? `In ${containerAtualNome}` : `Em ${containerAtualNome}`)
    : null;
  const linhasDaInstancia = Linha ? (
    <>
      {ondeEsta && <Linha rotulo={en ? 'Where' : 'Onde está'} valor={ondeEsta} />}
      {Number(instance.quantidade) > 1 && <Linha rotulo={en ? 'Quantity' : 'Quantidade'} valor={Number(instance.quantidade)} />}
      {temElo(instance) && (
        <Linha rotulo={en ? 'Permanent bond' : 'Elo Permanente'}
          valor={<><i className="ti ti-link" aria-hidden="true" /> {instance.elo.conjurador_nome || (en ? 'yes' : 'sim')}</>} />
      )}
      {/* Sagração (15/09/2026): todos veem; só o Mestre (onBonus) mexe. */}
      {/* O seletor do bônus SOZINHO NA LINHA e em PÍLULA (27/09/2026): "O
          seletor de aumentar bônus de uma arma deve ficar sozinho em uma linha,
          e os cantos devem ser arredondados como nos outros seletores." Linha
          larga (não divide a fileira com outra característica) e as classes do
          QuantidadeStepper; os botões seguem pulando pelos degraus da tabela
          (BONUS_ITEM_VALORES), por isso não é o componente em si. */}
      {destinoBonus && (bonusItem > 0 || onBonus) && (
        <Linha largo controle rotulo={(en ? 'Consecration' : 'Sagração') + ' · ' + (destinoBonus === 'dano' ? (en ? 'damage' : 'dano') : (en ? 'absorption' : 'absorção'))}
          valor={onBonus ? (
            /* ── O PRÓPRIO SELETOR DA LOJA (28/10/2026) ───────────────────
                 "O seletor de preço da loja, e o seletor de bônus de sagração,
                 ainda estão diferentes da quantidade em loja." (usuário)

                 Na primeira passada eu só VESTI as classes do stepper numa
                 marcação à mão — e marcação à mão volta a divergir na próxima
                 vez que alguém mexer numa das duas. Agora é o QuantidadeStepper
                 do sistema, o mesmo componente que a loja usa para Quantidade:
                 não há mais como ficarem diferentes.

                 A Sagração não soma de um em um, ela pula a escada 0 → 1 → 3 →
                 5 → 7 → 9. Quem anda na escada é o ÍNDICE: o stepper conta de
                 0 a 5, o `centro` mostra o valor do degrau, e `onBonus` recebe
                 a direção que sempre recebeu. */
            (() => {
              const degrau = BONUS_ITEM_VALORES.indexOf(bonusItem);
              const i = degrau < 0 ? 0 : degrau;
              return (
                <QuantidadeStepper
                  className="det-bonus-sag"
                  data-bonus={bonusItem}
                  value={i}
                  min={0}
                  max={BONUS_ITEM_VALORES.length - 1}
                  centro={<span className="det-bonus-val">+{bonusItem}</span>}
                  onChange={(alvo) => onBonus(instance.instanceId, alvo > i ? 1 : -1)}
                  label={en ? 'Consecration bonus' : 'Bônus de sagração'}
                  propsMenos={{ 'aria-label': en ? 'Lower bonus' : 'Reduzir bônus' }}
                  propsMais={{ 'aria-label': en ? 'Raise bonus' : 'Aumentar bônus' }}
                />
              );
            })()
          ) : (
            <span className="det-bonus det-bonus-ctrl" data-bonus={bonusItem}>
              <span className="det-bonus-val">+{bonusItem}</span>
            </span>
          )} />
      )}
      {/* Arma untada (28/09/2026): qual veneno e quantas ações ainda restam. */}
      {venenoDaArma(instance) && (
        <Linha rotulo={en ? 'Poison' : 'Veneno'}
          valor={`${venenoDaArma(instance).nome} · ${venenoDaArma(instance).acoes} ${en ? 'actions' : 'ações'}`} />
      )}
    </>
  ) : null;

  // O passe do topo (22/10/2026): onde está, quantos, e os números do item.
  const _passeDoItem = (typeof passeDoItem !== 'undefined' && passeDoItem) || window.passeDoItem;
  /* CARACTERÍSTICAS SEMPRE NA LISTA (23/10/2026): "As características do item
     ora aparece próximo do título, ora aparece abaixo. Padronize." O passe do
     topo saiu da janela do item do inventário; onde está e quantidade viram as
     primeiras linhas da lista, como os demais números. */
  const passe = { topo: null, omitir: [] };
  void _passeDoItem;

  // ── Seções da instância depois da magia: Conteúdo e Nota ──
  /* A PROPOSTA DE VENDA (23/10/2026): onde, quanto se pediu e, na
     contraproposta, quanto o comerciante oferece — com as respostas. */
  const responderProposta = async (acao) => {
    if (!onProposta || !proposta) return;
    setPropostaOcupada(true);
    const r = await onProposta(acao, proposta.id);
    setPropostaOcupada(false);
    if (r && r.ok) onClose();
  };
  const secaoProposta = aVenda && proposta && (proposta.status === 'proposta' || proposta.status === 'contraproposta') ? (
    <div className="best-secao det-proposta">
      <h4 className="best-secao-titulo">{en ? 'Sale' : 'Venda'}</h4>
      <p className="det-proposta-txt">
        {proposta.status === 'proposta'
          ? <>{en ? 'Waiting for the merchant' : 'Aguardando o comerciante'}{proposta.lugar ? <> {en ? 'in' : 'em'} <b>{proposta.lugar}</b></> : null}. {en ? 'You asked' : 'Você pediu'} <MoedaPills latao={Number(proposta.preco_latao) * Number(proposta.quantidade || 1)} lang={lang} tamanho="sm" />.</>
          : <>{en ? 'The merchant offers' : 'O comerciante oferece'} <MoedaPills latao={Number(proposta.preco_contra) * Number(proposta.quantidade || 1)} lang={lang} tamanho="sm" />{proposta.lugar ? <> {en ? 'in' : 'em'} <b>{proposta.lugar}</b></> : null}.</>}
      </p>
      {onProposta && (
        <div className="det-proposta-acoes">
          {proposta.status === 'contraproposta' && (
            <button type="button" className="btn-primary btn-sm" disabled={propostaOcupada} onClick={() => responderProposta('aceitar')}>{en ? 'Accept' : 'Aceitar'}</button>
          )}
          <button type="button" className="btn-ghost btn-sm" disabled={propostaOcupada}
            onClick={() => responderProposta(proposta.status === 'contraproposta' ? 'recusar' : 'cancelar')}>
            {proposta.status === 'contraproposta' ? (en ? 'Decline' : 'Recusar') : (en ? 'Cancel offer' : 'Cancelar proposta')}
          </button>
        </div>
      )}
    </div>
  ) : null;
  const secoesDepois = (
    <>
      {secaoProposta}
      {/* RECIPIENTE (23/10/2026): a seção tem título e medidor de quanto
          está ocupado, como a Carga do baú; vazio também aparece, com o
          caminho para guardar. */}
      {isContainer && containerData.armazena > 0 && (() => {
        const { usado, armazena, tipoAceito, casas, usadas } = containerData;
        const pct = Math.min(100, (usado / armazena) * 100);
        const cheio = usado >= armazena || usadas >= casas;
        return (
          <div className="best-secao det-recipiente">
            <h4 className="best-secao-titulo">{en ? 'Contents' : 'Conteúdo'}</h4>
            {/* OS DOIS LIMITES À VISTA (29/10/2026): as casas dizem quantos
                itens cabem, o peso diz quanto o recipiente aguenta, e o que
                estourar primeiro trava. Mostrar só um deles faria o outro
                recusar sem explicação. */}
            <span className="det-recip-medida" data-cheio={cheio ? '1' : undefined}
              aria-label={en
                ? `${usadas} of ${casas} slots, ${fmtNum(usado)} of ${fmtNum(armazena)} weight`
                : `${usadas} de ${casas} casas, ${fmtNum(usado)} de ${fmtNum(armazena)} de peso`}>
              <span className="det-recip-casas" aria-hidden="true">
                {usadas}<span>/{casas}</span> {en ? 'slots' : 'casas'}
              </span>
              <span className="det-recip-barra" data-liquido={tipoAceito === 'L' ? '1' : undefined} aria-hidden="true">
                <span style={{ width: pct + '%' }} />
              </span>
              <span className="det-recip-num" aria-hidden="true">{fmtNum(usado)}<span>/{fmtNum(armazena)}</span></span>
            </span>
            {hasContainerContent ? (
              /* O quadriculado do inventário (26/09/2026), no lugar da lista. */
              <GradeDoRecipiente filhos={containerData.filhos} catalogoBySlug={catalogoBySlug} lang={lang}
                casas={containerData.casas}
                onAbrir={onAbrirDetalhesFilho} abrirTip={abrirTip} fecharTip={fecharTip} />
            ) : (
              <p className="det-recip-vazio">
                {tipoAceito === 'L'
                  ? (en ? 'Empty. Holds liquids.' : 'Vazio. Guarda líquidos.')
                  : (en ? 'Empty.' : 'Vazio.')}
                {acoesPesadas && (en
                  ? ' To store something, drag the item onto this container in the chest.'
                  : ' Para guardar, arraste o item até este recipiente no baú.')}
              </p>
            )}
          </div>
        );
      })()}
    </>
  );

  /* ── A etapa de uma ação (troca o corpo) ──
     27/09/2026: "Nos modais, quando precisar de botão de confirme, use os
     botões em um rodapé. Mas não precisa de título como 'Descartar item'."
     O corpo fica só com a pergunta; Cancelar e a confirmação vão para o
     rodapé da janela (BestDetalheModal `rodape`). */
  let rodapeEtapa = null;
  const etapa = (texto, conteudo, confirmar) => {
    rodapeEtapa = { esquerda: cancelar, direita: confirmar || null };
    return (
      <div className="det-etapa">
        {texto && <span className="det-act-confirm-lbl">{texto}</span>}
        {conteudo}
      </div>
    );
  };
  const cancelar = (
    <button type="button" className="btn-ghost btn-md" onClick={fecharEtapas}>{en ? 'Cancel' : 'Cancelar'}</button>
  );

  let corpoEtapa = null;
  if (confirmandoDestruir) {
    corpoEtapa = etapa(temMultiplos
        ? (en ? 'How many to discard permanently?' : 'Quantos descartar permanentemente?')
        : (en ? 'Discard this item permanently?' : 'Descartar este item permanentemente?'), null,
      <button type="button" className="btn-danger btn-md" onClick={() => { onDestruir(instance.instanceId, qtdEscolhida); onClose(); }}>{en ? 'Discard' : 'Descartar'}</button>);
    // O seletor no centro do rodapé, como em Usar/Transferir/Armazenar (27/09/2026).
    rodapeEtapa.centro = seletorQtd;
  } else if (confirmandoUsar) {
    corpoEtapa = etapa(en ? 'Use this item?' : 'Usar este item?', null,
      <button type="button" className="btn-primary btn-md" onClick={() => { onUsar(instance.instanceId); onClose(); }}>{en ? 'Use' : 'Usar'}</button>);
  } else if (preparandoCarne) {
    /* Preparar carne (24/09/2026): as três receitas daquela carne. A que
       pede mais carne do que o personagem tem fica desativada e diz por quê.
       As receitas são a escolha (ficam no corpo); o rodapé só tem Cancelar. */
    corpoEtapa = etapa(en ? `You have ${carneTotal}× ${cat.nome}.` : `Você tem ${carneTotal}× ${cat.nome}.`,
      <div className="det-act-confirm-btns det-receitas">
        {receitasCarne.map((r) => {
          const prato = catalogoBySlug[r.resultado];
          const falta = carneTotal < r.custo;
          return (
            <button key={r.resultado} className="btn-primary" data-receita={r.resultado}
              disabled={falta || !prato}
              onClick={() => { onPrepararCarne(instance.instanceId, r.resultado); onClose(); }}
              {...propsTip(abrirTip, fecharTip, falta
                ? (en ? `Needs ${r.custo}× ${cat.nome}.` : `Precisa de ${r.custo}× ${cat.nome}.`)
                : ((prato && prato.efeito_positivo) || ''))}>
              {r.custo}× → {prato ? prato.nome : r.resultado}
            </button>
          );
        })}
      </div>);
  } else if (confirmandoPreparar) {
    /* ABATER (28/09/2026): a carne do tipo da criatura, metade do peso, vai
       para a loja da aventura à venda por você — não para a mochila. Quanto
       rendeu, o servidor diz na mesa. */
    const abater = async () => {
      setAbatendo(true); setAbaterErro(null);
      const r = await onPreparar(instance.instanceId);
      setAbatendo(false);
      if (r && r.ok) { onClose(); return; }
      setAbaterErro(r && r.motivo === 'sem_carne'
        ? (en ? 'This creature yields no meat.' : 'Esta criatura não rende carne.')
        : (r && r.motivo) || (en ? 'Could not slaughter.' : 'Não foi possível abater.'));
    };
    corpoEtapa = etapa(
      en ? `Slaughter ${cat.nome}? Its meat — half the animal's weight — goes to the adventure shop, for sale by you.`
         : `Abater ${cat.nome}? A carne — metade do peso do animal — vai para a loja da aventura, à venda por você.`,
      abaterErro ? <div className="err-msg">{abaterErro}</div> : null,
      <button type="button" className="btn-primary btn-md" data-confirmar="abater" disabled={abatendo} onClick={abater}>
        {abatendo ? (en ? 'Slaughtering…' : 'Abatendo…') : (en ? 'Slaughter' : 'Abater')}
      </button>);
  } else if (mostrarVender) {
    /* PUBLICAR NA LOJA (27/09/2026), sem títulos ("Preço", "Valor de
       tabela") — Cancelar e Pôr à venda no rodapé. Pilha divisível escolhe
       quantos; equipável vai inteiro. O preço é de CADA unidade (quem compra
       pode levar só parte) e começa no de tabela. */
    const maxQtd = Math.max(1, Number(instance.quantidade) || 1);
    const divisivel = !equipavel && !isContainer && maxQtd > 1;
    const valorUnit = Number(cat.valor_latao) || 0;
    /* Item SEM valor de tabela vende por 0 (28/09/2026: "Itens que não tem
       valor são vendidos e negociados com valor 0"); o que tem valor segue
       pedindo preço maior que zero — a mesma regra de publicar_item_loja. */
    const precoValido = vendaPreco > 0 || (valorUnit === 0 && vendaPreco === 0);
    const publicar = async () => {
      setPublicando(true); setVendaErro(null);
      const res = await onVender(instance.instanceId, divisivel ? vendaQtd : maxQtd, vendaPreco, vendaLugar.trim());
      setPublicando(false);
      if (res && res.ok) { onClose(); return; }
      setVendaErro(motivoVendaLabel(res && res.motivo, en));
    };
    /* INLINE (27/09/2026): "Em vender, coloque os inputs inline, e remova o
       texto 'preço de cada um' mantenha o texto 'Total'." Quantidade e as
       quatro moedas numa linha só (quebra em tela estreita). */
    corpoEtapa = (
      <div className="det-etapa det-venda">
        <label className="det-venda-lugar">
          <span>{en ? 'Where' : 'Onde vender'}</span>
          <input value={vendaLugar} onChange={(e) => setVendaLugar(e.target.value)} disabled={publicando}
            placeholder={en ? 'City or place' : 'Cidade ou local'} maxLength={60} />
        </label>
        <div className="det-venda-linha">
          <PrecoMoedasInput latao={vendaPreco} onChange={setVendaPreco} lang={lang} disabled={publicando} />
        </div>
        {divisivel && vendaQtd > 1 && vendaPreco > 0 && (
          <span className="det-venda-nota">
            Total
            <MoedaPills latao={vendaPreco * vendaQtd} lang={lang} tamanho="sm" />
          </span>
        )}
        {vendaErro && <div className="err-msg">{vendaErro}</div>}
      </div>
    );
    rodapeEtapa = {
      esquerda: cancelar,
      // A quantidade no centro do rodapé, como nas outras ações (27/09/2026).
      centro: divisivel ? (
        <QuantidadeStepper value={vendaQtd} min={1} max={maxQtd} label={en ? 'Quantity' : 'Quantidade'}
          centro={<>{vendaQtd} <span className="qtd-de-max">{en ? 'of' : 'de'} {maxQtd}</span></>}
          onChange={setVendaQtd} />
      ) : null,
      direita: (
        <button type="button" className="btn-primary btn-md" data-publicar disabled={publicando || !precoValido} onClick={publicar}>
          {publicando ? (en ? 'Sending…' : 'Enviando…') : (en ? 'Offer to the merchant' : 'Propor ao comerciante')}
        </button>
      ),
    };
  } else if (mostrarTransferir) {
    corpoEtapa = etapa(en ? 'Transfer to which friend?' : 'Transferir para qual amigo?', (
      amigos === null ? <p className="det-transf-vazio">{en ? 'Loading…' : 'Carregando…'}</p>
      : amigos.length === 0 ? <p className="det-transf-vazio">{en ? 'No friend yet. Seal a friendship pact in Friends.' : 'Nenhum amigo ainda. Sele um pacto de amizade em Amigos.'}</p>
      : (
        <ul className="det-transf-lista">
          {amigos.map((a) => (
            <li key={a.id}>
              <button type="button" className="det-transf-amigo"
                onClick={() => { fecharEtapas(); onTransferir(instance.instanceId, a.id); }}>
                <i className="ti ti-user" aria-hidden="true" />
                <span>{[a.nome, a.sobrenome].filter(Boolean).join(' ') || '—'}</span>
                <i className="ti ti-chevron-right det-transf-seta" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )
    ));
  } else if (mostrarEnvenenar) {
    /* ENVENENAR (28/09/2026). Arma: 1 dose, e ela carrega o veneno pelas
       próximas 15 ações. Flechas: 1 dose por flecha — o seletor do rodapé diz
       quantas, até o que houver de dose e de flecha. */
    const alvoSel = alvosDoVeneno.find((x) => x.instanceId === envAlvoId) || null;
    const ehFlechaSel = !!(alvoSel && alvoSel.slug === 'flecha');
    const maxFlechas = ehFlechaSel ? Math.max(1, Math.min(maxQtdAcao, Number(alvoSel.quantidade) || 1)) : 1;
    const qtdFlechas = Math.min(qtdAcao, maxFlechas);
    const envenenarAgora = () => {
      if (!alvoSel) return;
      const r = onEnvenenar(instance.instanceId, alvoSel.instanceId, ehFlechaSel ? qtdFlechas : 1);
      if (r && r.ok) onClose();
    };
    corpoEtapa = (
      <div className="det-etapa det-uso">
        <div className="det-uso-alvos det-uso-alvos--grade" role="radiogroup" aria-label={en ? 'Weapon or arrows' : 'Arma ou flechas'}>
          {alvosDoVeneno.map((x) => {
            const cx = catalogoBySlug[x.slug];
            const nome = nomeComVeneno(cx?.nome || x.slug, x);
            const selecionado = envAlvoId === x.instanceId;
            const v = venenoDaArma(x);
            const detalhe = cx && cx.slug === 'flecha'
              ? (en ? `${x.quantidade} arrows` : `${x.quantidade} flechas`)
              : v ? (en ? `Already poisoned with ${v.nome} (${v.acoes} actions). It will be replaced.`
                        : `Já envenenada com ${v.nome} (${v.acoes} ações). O veneno será trocado.`)
                  : (en ? 'Poisoned for the next 15 actions.' : 'Envenenada pelas próximas 15 ações.');
            return (
              <button type="button" key={x.instanceId} role="radio" aria-checked={selecionado}
                data-envenenar-id={x.instanceId}
                className={'det-opt-card det-opt-card--pilula' + (selecionado ? ' det-opt-card--sel' : '')}
                onClick={() => { setEnvAlvoId(x.instanceId); setQtdAcao(1); }}
                onMouseEnter={(e) => abrirTip(e, { title: nome, desc: detalhe })}
                onMouseLeave={fecharTip}>
                <span className="det-opt-foto det-opt-foto--vazia"><i className={'ti ' + invItemIcon(cx)} aria-hidden="true" /></span>
                <span className="det-opt-nome">{nome}{cx && cx.slug === 'flecha' ? ` ×${x.quantidade}` : ''}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
    rodapeEtapa = {
      esquerda: cancelar,
      centro: ehFlechaSel && maxFlechas > 1 ? (
        <QuantidadeStepper value={qtdFlechas} min={1} max={maxFlechas} onChange={setQtdAcao}
          label={en ? 'Arrows' : 'Flechas'}
          centro={<>{qtdFlechas} <span className="qtd-de-max">{en ? 'of' : 'de'} {maxFlechas}</span></>} />
      ) : null,
      direita: (
        <button type="button" className="btn-primary btn-md" data-confirmar="envenenar"
          disabled={!alvoSel} onClick={envenenarAgora}>
          {en ? 'Poison' : 'Envenenar'}
        </button>
      ),
    };
  } else if (mostrarArmazenar) {
    /* ARMAZENAR no mesmo padrão da transferência: o card marca o recipiente,
       o botão do rodapé armazena (27/09/2026). */
    const armazenarEm = (contId) => {
      fecharTip();
      const r = onMoverParaContainer(instance.instanceId, contId || null, qtdEscolhida);
      // Moveu direto: fecha a janela. Pilha: fecha quando a quantidade for
      // confirmada (executarAcaoPendente).
      if (r === 'feito') { onClose(); return; }
      fecharEtapas();
    };
    corpoEtapa = (
      <div className="det-etapa det-uso">
        <div className="det-uso-alvos det-uso-alvos--grade" role="radiogroup" aria-label={en ? 'Compartment' : 'Compartimento'}>
          {opcoesContainer.map((c) => {
            const cc = catalogoBySlug[c.slug];
            const nome = cc?.nome || c.slug;
            const { usado, armazena: cap } = capacidadeContainer(c, todosItens, catalogoBySlug);
            const atual = c.instanceId === instance.containerId;
            const selecionado = armazContId === c.instanceId;
            const detalhe = (en ? 'Space: ' : 'Espaço: ') + used(usado, cap)
              + (atual ? (en ? ' · the item is already here' : ' · o item já está aqui') : '');
            return (
              <button type="button" key={c.instanceId} role="radio" aria-checked={selecionado}
                data-container-id={c.instanceId}
                className={'det-opt-card det-opt-card--pilula' + (selecionado ? ' det-opt-card--sel' : '')}
                disabled={atual}
                onClick={() => setArmazContId(c.instanceId)}
                onMouseEnter={(e) => abrirTip(e, { title: nome, desc: detalhe })}
                onMouseLeave={fecharTip}>
                <span className="det-opt-foto det-opt-foto--vazia"><i className={'ti ' + invItemIcon(cc)} aria-hidden="true" /></span>
                <span className="det-opt-nome">{nome}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
    rodapeEtapa = {
      esquerda: cancelar,
      centro: seletorQtd,
      direita: (
        <button type="button" className="btn-primary btn-md" data-confirmar="armazenar"
          disabled={!armazContId} onClick={() => armazenarEm(armazContId)}>
          {en ? 'Store' : 'Armazenar'}
        </button>
      ),
    };
  }

  /* USAR DIRETO NO RODAPÉ (22/10/2026): "Usar um item consumível: o alvo é
     sempre o próprio personagem" — sem aba Usar e sem card do alvo para
     marcar antes (escolha do usuário). O seletor de quantidade segue no
     centro do rodapé (27/09/2026) e "Usar" à direita, sempre à mão. */
  const rodapeUsar = (!etapaAberta && podeUsar && onUsar) ? {
    esquerda: null,
    centro: seletorQtd,
    direita: (
      <button type="button" className="btn-primary btn-md" data-confirmar="usar"
        onClick={() => { onUsar(instance.instanceId, qtdEscolhida); onClose(); }}>
        {en ? 'Use' : 'Usar'}
      </button>
    ),
  } : null;

  return (
    <>
      <Janela
        title={<><i className={'ti ' + invItemIcon(cat) + ' det-title-ic'} aria-hidden="true" /> {instance.apelido ? `${instance.apelido} (${cat.nome})` : nomeComVeneno(cat.nome, instance)}{bonusItem > 0 ? ` +${bonusItem}` : ''}</>}
        lang={lang}
        onClose={onClose}
        alvoPainel={alvoPainel}
        /* SEM a pintura grande (26/10/2026, pedido do usuário: "remova a
           imagem em zoom na visualização de itens em loja/inventário"). Ela
           durou um dia: numa faixa de 190px a pintura de 320px aparecia
           ampliada, e quem abre um item aqui quer as AÇÕES, não o retrato —
           o ícone no título já diz o que é. No Livro de Regras, onde a
           janela é leitura e não manuseio, ela continua. */
        topo={passe.topo} semAbas acoesEmBarra
        acoes={acoesDaJanela}
        rodape={etapaAberta ? rodapeEtapa : rodapeUsar}>
        {etapaAberta ? corpoEtapa : (
          <Ficha it={cat} lang={lang} magias={magiasDb} omitir={passe.omitir}
            linhasDaInstancia={linhasDaInstancia}
            resistenciaTexto={mostraResistencia ? `${resAtualItem}/${resMaxItem}` : null}
            depois={secoesDepois} />
        )}
      </Janela>
      {lendo && cat.doc_url && (
        <LeituraDocModal titulo={cat.nome} docUrl={cat.doc_url} lang={lang} onClose={() => setLendo(false)} />
      )}
      {estudando && (ensina.length + ensinaTec.length) > 0 && (
        <EstudarMagiaModal
          titulo={cat.nome}
          magias={ensina}
          tecnicas={ensinaTec}
          tecnicasDb={tecnicasDb}
          pj={pjAprendiz}
          magiasDb={magiasDb}
          opcoes={{ noInventario: acoesPesadas, podeAprender: !!onAprenderMagia, aVenda: estaAVenda(instance) }}
          lang={lang}
          onAprender={(alvo) => onAprenderMagia(instance.instanceId, alvo)}
          onClose={() => setEstudando(false)}
        />
      )}
      <PortalTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </>
  );
}
/* ============================================================
   VENDA DE ITEM — publicar na loja da aventura (27/09/2026)
   ============================================================
   "O jogador irá 'publicar' os itens na loja pelo preço que ele quiser,
   outros jogadores ou o mestre podem comprar dele. A ação não precisa
   acontecer na mesma hora, o item ficará na loja da aventura." (usuário)

   Substituiu a negociação com o Mestre (vendas_item). O estado vive em
   public.anuncios_loja e só muda pelas RPCs (scripts/sql/anuncios-loja-
   2026-09-27.sql): publicar_item_loja (o item sai do inventário),
   retirar_item_loja (volta ao dono) e comprar_item_anunciado (jogador paga e
   leva; o Mestre paga e o item sai do jogo). A vitrine é a LojaJogador.
   ============================================================ */
function motivoVendaLabel(motivo, en) {
  const map = {
    nao_autenticado:         en ? 'Sign in again.'                                          : 'Entre de novo na sua conta.',
    nao_e_dono:              en ? 'Only the character’s owner can sell.'                    : 'Só o dono do personagem pode vender.',
    sem_historia:            en ? 'The character is not in an adventure — there is no shop to sell in.' : 'O personagem não está numa aventura — não há loja onde vender.',
    preco_invalido:          en ? 'Enter a price above zero.'                               : 'Informe um preço maior que zero.',
    mesmo_preco:             en ? 'That is already the price on the table.'                 : 'Esse já é o preço na mesa.',
    item_indisponivel:       en ? 'The item is no longer in the inventory.'                 : 'O item não está mais no inventário.',
    item_nao_existe:         en ? 'Item not found in the catalog.'                          : 'Item não encontrado no catálogo.',
    moeda_nao_vende:         en ? 'Coins cannot be sold.'                                   : 'Moedas não se vendem.',
    item_ja_a_venda:         en ? 'This item is already for sale.'                         : 'Este item já está à venda.',
    item_em_uso:             en ? 'Unequip, take off or dismount the item first.'           : 'Desequipe, dispa ou desmonte o item antes de vender.',
    recipiente_com_itens:    en ? 'Empty the container first.'                              : 'Esvazie o recipiente antes de vender.',
    quantidade_invalida:     en ? 'Invalid quantity.'                                       : 'Quantidade inválida.',
    quantidade_indisponivel: en ? 'That quantity is no longer in the inventory.'            : 'Essa quantidade não está mais no inventário.',
    pj_nao_encontrado:       en ? 'Character not found.'                                    : 'Personagem não encontrado.',
  };
  return map[motivo] || (en ? 'Could not put the item up for sale.' : 'Não foi possível pôr o item à venda.');
}

// Por que o botão "Vender" não dá (null = dá). Espelha as recusas da RPC que
// dependem só da tela.
function bloqueioVenda(instance, opcoes) {
  const o = opcoes || {};
  if (!o.ehDono) return 'nao_e_dono';
  if (!o.historiaId) return 'sem_historia';
  if (estaAVenda(instance)) return 'item_ja_a_venda';
  if (instance && (instance.equipado || instance.vestido || instance.montado)) return 'item_em_uso';
  if (o.temConteudo) return 'recipiente_com_itens';
  return null;
}

// Ouro, prata, cobre e latão → total em latão. Remonte com `key` para
// recomeçar de outro valor.
/* Os quatro campos viraram o SELETOR DE QUANTIDADE da casa (27/09/2026): "Colocar
   o item à venda usa um input sem o seletor de quantidade, eu digo em relação
   à quantidade de moedas e quantidade de itens." Um QuantidadeStepper por
   moeda, com o ícone da moeda (sem borda) e o número no meio. */
function PrecoMoedasInput({ latao, onChange, lang, disabled }) {
  const en = lang === 'en';
  const [campos, setCampos] = useState(() => latoesToMoedas(Math.max(0, Math.round(Number(latao) || 0))));
  const nomes = en
    ? { ouro: 'Gold', prata: 'Silver', cobre: 'Copper', latao: 'Brass' }
    : { ouro: 'Ouro', prata: 'Prata', cobre: 'Cobre', latao: 'Latão' };
  const mudar = (k, n) => {
    const novo = { ...campos, [k]: Math.max(0, Math.round(Number(n) || 0)) };
    setCampos(novo);
    if (onChange) onChange(moedasToLatao(novo));
  };
  return (
    <div className="venda-moedas">
      {MOEDA_ORDEM.map((k) => (
        <QuantidadeStepper key={k} className={'venda-moeda venda-moeda--' + k}
          value={campos[k] || 0} min={0} max={k === 'ouro' ? Infinity : 9999}
          disabled={disabled} label={nomes[k]} onChange={(n) => mudar(k, n)}
          centro={<span className="venda-moeda-centro">
            <i className="ti ti-coins" style={{ color: MOEDA_COR[k] }} aria-hidden="true" />{campos[k] || 0}
          </span>} />
      ))}
    </div>
  );
}

// Helper de exibição: "2.0/10"
function used(usado, cap) { return `${fmtNum(usado)}/${fmtNum(cap)}`; }

/* ── DarItemModal (28/10/2026) ───────────────────────────────────────────────
   O Mestre escolhe um item do catálogo e quantos, e entrega. Nada de preço,
   de cidade ou de loja: é o caminho curto que faltava para a recompensa.

   A busca olha nome E grupo, porque é assim que se procura o que se quer dar
   ("poção", "Armas"). A lista mostra no máximo 40 — o catálogo tem mais de
   mil itens, e uma lista sem fim não ajuda a escolher. */
function DarItemModal({ catalogo, lang, onDar, onClose }) {
  const en = lang === 'en';
  const [busca, setBusca] = useState('');
  const [slug, setSlug] = useState(null);
  const [qtd, setQtd] = useState(1);
  const { Input } = (typeof UI !== 'undefined' ? UI : {});
  const termo = busca.trim().toLowerCase();
  const achados = useMemo(() => {
    const todos = catalogo || [];
    const base = termo
      ? todos.filter((c) => (c.nome || '').toLowerCase().includes(termo)
        || (c.grupo || '').toLowerCase().includes(termo))
      : todos;
    return base.slice(0, 40);
  }, [catalogo, termo]);
  const escolhido = (catalogo || []).find((c) => c.slug === slug) || null;

  return (
    <ModalShell
      title={<><i className="ti ti-gift det-title-ic" aria-hidden="true" /> {en ? 'Give item' : 'Dar item'}</>}
      lang={lang}
      size="md"
      extraClass="modal-detalhes modal-dar-item"
      onClose={onClose}
    >
      <div className="best-search dar-item-busca">
        <i className="ti ti-eye busca-ic" aria-hidden="true" />
        <Input type="search" value={busca} autoFocus
          onChange={(e) => setBusca(e.target.value)}
          placeholder={en ? 'Search the catalogue' : 'Buscar no catálogo'} />
      </div>

      {achados.length === 0 ? (
        <p className="dar-item-vazio">{en ? 'Nothing found.' : 'Nada encontrado.'}</p>
      ) : (
        <ul className="dar-item-lista mn-rolagem">
          {achados.map((c) => (
            <li key={c.slug}>
              <button type="button"
                className={'dar-item-linha' + (c.slug === slug ? ' is-on' : '')}
                aria-pressed={c.slug === slug}
                onClick={() => setSlug(c.slug)}>
                <i className={'ti ' + invItemIcon(c)} aria-hidden="true" />
                <span className="dar-item-nome">{c.nome}</span>
                {c.grupo && <span className="dar-item-grupo">{c.grupo}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* A QUANTIDADE À ESQUERDA (28/10/2026, pedido do usuário: "o seletor de
          quantidade no rodapé poderia ficar à esquerda"). O rótulo não empurra
          mais o seletor para o meio: os dois andam juntos na ponta esquerda e
          a ação primária fica sozinha na direita, como em todo rodapé de
          janela do sistema. */}
      <div className="dar-item-rodape">
        <span className="dar-item-rotulo">{en ? 'Quantity' : 'Quantidade'}</span>
        <QuantidadeStepper className="dar-item-qtd" value={qtd} min={1} onChange={setQtd}
          label={en ? 'Quantity' : 'Quantidade'} />
        <button type="button" className="btn-primary dar-item-confirmar" disabled={!escolhido}
          onClick={() => escolhido && onDar(escolhido.slug, qtd)}>
          {en ? 'Give' : 'Dar'}
        </button>
      </div>
    </ModalShell>
  );
}

// ── ContainerModal (Fase 3) ──────────────────────────────────────────────────
function ContainerModal({ containerInst, catalogoBySlug, todosItens, lang, onClose, onRemoverDoContainer, onAbrirDetalhes, onMoverCasa }) {
  const [tip, abrirTip, fecharTip, manterTip] = usePortalTooltip(60);
  const en = lang === 'en';
  const cat = catalogoBySlug[containerInst?.slug];
  const { armazena, usado, livre, tipoAceito, filhos } = capacidadeContainer(containerInst, todosItens, catalogoBySlug);
  const pct = armazena > 0 ? Math.min(100, (usado / armazena) * 100) : 0;
  const tipoLabel = tipoAceito === 'L'
    ? (en ? 'liquids' : 'líquidos')
    : (en ? 'solids' : 'sólidos');

  /* A grade desta janela também mede o MODAL, não a capacidade (28/10/2026,
     2ª volta — ver GradeDoRecipiente). `armazena` é peso, não casas. */

  // Escape e travamento de scroll já são responsabilidade do ModalShell — não duplicar aqui.

  return (
    <ModalShell
      title={<><i className={'ti ' + invItemIcon(cat) + ' det-title-ic'} aria-hidden="true" /> {cat?.nome || containerInst?.slug}</>}
      lang={lang}
      size="md"
      extraClass="modal-detalhes modal-recipiente"
      onClose={onClose}
    >
        <div className="det-desc">
          {cat.descricao}
        </div>

        {/* O conteúdo em CASAS LIVRES (02/10/2026), como o inventário: o
            jogador espalha os itens pela grade da mochila. Só mover aqui
            dentro (decisão do usuário) — tirar continua pelo botão da janela
            do item. Clicar no item abre essa janela. */}
        <div className="cont-grade">
          <InvItemsTable
            itens={todosItens}
            lugar={containerInst.instanceId}
            semFerramentas
            catalogoBySlug={catalogoBySlug}
            lang={lang}
            onAbrirDetalhes={onAbrirDetalhes || (() => {})}
            onMoverCasa={onMoverCasa}
          />
        </div>

      <PortalTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </ModalShell>
  );
}

// ── QuantidadeModal ──────────────────────────────────────────────────────────
// Pergunta quanto aplicar de uma ação (usar/destruir/mover) quando há mais de 1
// em estoque. Stepper pill (−/valor/+) + chips de preset + aviso irreversível.
/* Motivos de recusa da RPC transfer_item, em texto de gente. Motivo novo que
   não esteja aqui aparece cru — é o sinal de que falta a tradução. */
function motivoTransferenciaLabel(motivo, en) {
  const M = {
    aventura_diferente: en ? 'Only characters in the same adventure can trade items.' : 'Só é possível transferir para personagens da mesma aventura.',
    sem_permissao:      en ? 'You cannot transfer items from this character.'         : 'Você não pode transferir itens deste personagem.',
    nao_autenticado:    en ? 'You are not signed in.'                                  : 'Você não está autenticado.',
    mesmo_personagem:   en ? 'Pick another character.'                                 : 'Escolha outro personagem.',
    quantidade_invalida: en ? 'Invalid quantity.'                                      : 'Quantidade inválida.',
    sem_bolsa_destino:  en ? 'The recipient has no purse for coins.'                   : 'O destinatário não tem bolsa para as moedas.',
    sem_pacto:          en ? 'You have not sealed a friendship pact with this character.' : 'Vocês ainda não selaram um pacto de amizade.',
    item_a_venda:       en ? 'This item is for sale in the shop. Withdraw it first.'    : 'Este item está à venda na loja. Retire o anúncio antes.',
    instancia_nao_encontrada: en ? 'Item not found in the inventory.'                  : 'Item não encontrado no inventário.',
  };
  return M[motivo] || motivo;
}

/* ── LEITURA DE LIVRO (13/09/2026) ─────────────────────────────────
   "Alguns itens, como livros, possuem uma URL, ela serve para abrir o
   conteúdo do google documents em um modal na tela." (usuário)

   `itens.doc_url` guarda o link de EDIÇÃO do Google Docs
   (…/document/d/<id>/edit?tab=…#heading=…). Esse endereço não embute: o
   Google recusa o editor dentro de um iframe. O que embute é o /preview do
   mesmo documento, somente leitura — por isso a conversão.

   Link que não é Google Docs volta como veio: a janela tenta mostrá-lo e o
   "Abrir em nova aba" fica sempre à mão. */
function urlLeituraDoc(docUrl) {
  const url = String(docUrl || '').trim();
  if (!url) return null;
  const m = /docs\.google\.com\/document\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]+)/.exec(url);
  return m ? `https://docs.google.com/document/d/${m[1]}/preview` : url;
}

/* A janela de leitura. Vai por PORTAL em #root: é aberta de dentro de outras
   janelas (a do item), e um fixed dentro delas ficaria preso no contêiner. */
function LeituraDocModal({ titulo, docUrl, lang, onClose }) {
  const en = lang === 'en';
  const src = urlLeituraDoc(docUrl);
  if (!src) return null;
  const conteudo = (
    <div className="menestrel-ui">
      <ModalShell
        title={<><i className="ti ti-book det-title-ic" aria-hidden="true" /> {titulo}</>}
        lang={lang}
        size="lg"
        extraClass="modal-leitura-doc"
        onClose={onClose}
      >
        {/* Só o documento: o link "Abrir em nova aba" saiu a pedido do
            usuário (13/09/2026) — o livro se lê aqui dentro. */}
        <iframe className="leitura-doc-frame" src={src} title={titulo || (en ? 'Book' : 'Livro')} />
      </ModalShell>
    </div>
  );
  const alvo = (typeof document !== 'undefined') && (document.getElementById('root') || document.body);
  return (alvo && ReactDOM && ReactDOM.createPortal) ? ReactDOM.createPortal(conteudo, alvo) : conteudo;
}

/* ── ESTUDAR (22/10/2026) ────────────────────────────────────────────
   "o personagem poderá aprender a magia usando o item que a ensina" — o
   livro abre a lista das magias vinculadas; o pergaminho, a sua. Escolhe-se
   uma linha e confirma-se no rodapé (padrão dos modais: confirmação no
   .ms-footer). Um nível por vez; o item não se gasta. A linha bloqueada
   continua escolhível: é escolhendo que o jogador lê o porquê no rodapé.
   Portal em #root pelo mesmo motivo do LeituraDocModal: abre de dentro da
   janela do item. */
function EstudarMagiaModal({ titulo, magias, tecnicas, pj, magiasDb, tecnicasDb, opcoes, lang, onAprender, onClose }) {
  const en = lang === 'en';
  const listaMag = Array.isArray(magias) ? magias : [];
  const listaTec = Array.isArray(tecnicas) ? tecnicas : [];
  const treinos = (pj && Array.isArray(pj.treinos)) ? pj.treinos : [];
  const unico = listaMag.length + listaTec.length === 1;
  const [escolhida, setEscolhida] = useState(unico
    ? (listaMag[0] ? 'magia:' + listaMag[0].key : 'tecnica:' + listaTec[0].key) : null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  const estagio = pj ? calcEstagio(pj.experiencia || 0) : 0;
  /* Fila de treino (22/10/2026): o que está em treino já foi pago — conta no
     gasto e no próximo nível — mas ainda não é usável. */
  const filaDe = (tipo, key) => treinos.filter((t) => t && t.tipo === tipo && t.key === key);
  const tempoTexto = (h) => {
    const n = Math.max(0, Math.ceil(Number(h) || 0));
    const d = Math.floor(n / 24), r = n % 24;
    return [d ? `${d} d` : '', r ? `${r} h` : ''].filter(Boolean).join(' ') || '0 h';
  };
  const emTreinoTexto = (tipo, key) => {
    const f = filaDe(tipo, key);
    if (!f.length) return null;
    const horas = f.reduce((s, t) => s + (Number(t.horas_restantes) || 0), 0);
    return `${en ? 'in training' : 'em treino'} · ${tempoTexto(horas)}`;
  };

  const magPj = comFila(pj && pj.magias, treinos, 'magia');
  const tecPj = comFila(pj && pj.tecnicas, treinos, 'tecnica');
  const totalMag = pj ? pontosMagiasTotal(pj.profissao, estagio, pj.intelecto_base, pj.aura_base) : 0;
  const gastoMag = pj ? gastoMagias(magPj, magiasDb || []) : 0;
  const totalTec = pj ? pontosTecnicasTotal(pj.profissao, estagio, pj.fisico_base, pj.agilidade_base) : 0;
  const gastoTec = pj ? gastoTecnicas(tecPj, tecnicasDb || []) : 0;

  const linhas = [
    ...listaMag.map((m) => {
      const sabido = Number(((pj && pj.magias) || {})[m.key]) || 0;
      const passos = Number(magPj[m.key]) || 0;
      const atual = sabido > 0 ? nivelMagiaEfetivo(sabido) : null;
      const base = passos > 0 ? nivelMagiaEfetivo(passos) : 0;
      const proximo = passos < 5 ? nivelMagiaEfetivo(passos + 1) : null;
      return {
        id: 'magia:' + m.key, tipo: 'magia', m, atual, proximo,
        custoPasso: proximo != null ? (m.custo || 0) * (proximo - base) : null,
        rotuloTipo: [m.tipo, m.classe].filter(Boolean).join(' · '),
        treino: emTreinoTexto('magia', m.key),
        bloqueio: bloqueioAprenderNoInventario(m, pj, { ...(opcoes || {}), magiasDb }),
      };
    }),
    ...listaTec.map((t) => {
      const sabido = Number(((pj && pj.tecnicas) || {})[t.key]) || 0;
      const nivel = Number(tecPj[t.key]) || 0;
      return {
        id: 'tecnica:' + t.key, tipo: 'tecnica', m: t,
        atual: sabido > 0 ? sabido : null, proximo: nivel + 1, custoPasso: t.custo || 0,
        rotuloTipo: en ? 'Technique' : 'Técnica',
        treino: emTreinoTexto('tecnica', t.key),
        bloqueio: bloqueioTecnicaNoInventario(t, pj, { ...(opcoes || {}), tecnicasDb }),
      };
    }),
  ];
  const sel = linhas.find((l) => l.id === escolhida) || null;
  const motivo = erro || (sel && sel.bloqueio
    ? motivoAprenderLabel(sel.bloqueio.motivo, en, { ...sel.bloqueio, tipo: sel.tipo }) : null);

  const escolher = (id) => { setEscolhida(id); setErro(null); };
  const confirmar = async () => {
    if (!sel || sel.bloqueio || enviando) return;
    setEnviando(true); setErro(null);
    const r = await onAprender({ tipo: sel.tipo, key: sel.m.key });
    if (r && r.ok) { onClose(); return; }
    setEnviando(false);
    setErro(motivoAprenderLabel(r && r.motivo, en, { tipo: sel.tipo }));
  };

  const rotuloConfirmar = sel && sel.proximo != null
    ? `${en ? 'Learn' : 'Aprender'} ${sel.m.nome} ${sel.proximo}`
    : (en ? 'Learn' : 'Aprender');

  /* QUADRO DE INICIATIVA (22/10/2026): o passe no topo mostra a decisão em
     números (nível, custo e o SALDO que sobra — ninguém precisa subtrair);
     o quadro separa o que dá para aprender agora do que está bloqueado, com o
     porquê na própria linha. */
  const pontosDo = (tipo) => (tipo === 'tecnica'
    ? { gasto: gastoTec, total: totalTec, rotulo: en ? 'Technique points left' : 'Saldo de técnica' }
    : { gasto: gastoMag, total: totalMag, rotulo: en ? 'Magic points left' : 'Saldo de magia' });
  const tiposPresentes = [listaMag.length > 0 && 'magia', listaTec.length > 0 && 'tecnica'].filter(Boolean);
  const livres = linhas.filter((l) => !l.bloqueio);
  const bloqueadas = linhas.filter((l) => l.bloqueio);
  const motivoDaLinha = (l) => motivoAprenderLabel(l.bloqueio.motivo, en, { ...l.bloqueio, tipo: l.tipo });
  /* Nível que não existe no catálogo: não se oferece nível nem custo — a
     linha diria "→ 1, custa 6" ao lado de "esse nível não existe". */
  const semNivel = (l) => !!(l && l.bloqueio && l.bloqueio.motivo === 'nivel_sem_texto');
  const nivelTexto = (l) => (semNivel(l) ? '—'
    : <>{l.atual != null ? l.atual : '—'} → {l.proximo != null ? l.proximo : (en ? 'max' : 'máx.')}</>);
  const custoTexto = (l) => (semNivel(l) || l.custoPasso == null ? '—' : String(l.custoPasso));

  const celulaPontos = (tipo) => {
    const p = pontosDo(tipo);
    const saldo = p.total - p.gasto;
    const depois = sel && sel.tipo === tipo && !semNivel(sel) && sel.custoPasso != null ? saldo - sel.custoPasso : null;
    const falta = (depois != null ? depois : saldo) < 0;
    return (
      <div className="mn-celula" key={tipo}>
        <span className="mn-rotulo">
          <span className="rotulo-longo">{p.rotulo}</span>
          <span className="rotulo-curto">{en ? "Left" : "Saldo"}</span>
        </span>
        <span key={sel ? sel.id : '-'}
          className={'mn-celula-valor mn-troca estudar-pontos' + (falta ? ' mn-celula-valor--alerta estudar-pontos--excedido' : '')}>
          {depois != null ? <>{saldo} → {depois}</> : saldo} <small>{en ? 'of' : 'de'} {p.total}</small>
        </span>
      </div>
    );
  };

  /* Teclado (22/10/2026): o quadro é UM grupo de rádio — Tab entra na linha
     escolhida (ou na primeira) e as setas andam entre as linhas, escolhendo. */
  const ordem = [...livres, ...bloqueadas].map((l) => l.id);
  const tabNa = escolhida && ordem.includes(escolhida) ? escolhida : ordem[0];
  const andar = (e, id) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); escolher(id); return; }
    const passo = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1
      : (e.key === 'ArrowUp' || e.key === 'ArrowLeft') ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const prox = ordem[(ordem.indexOf(id) + passo + ordem.length) % ordem.length];
    escolher(prox);
    const grupoEl = e.currentTarget.closest('[role="radiogroup"]');
    const alvoEl = grupoEl && grupoEl.querySelector('[data-linha="' + prox + '"]');
    if (alvoEl) alvoEl.focus();
  };

  const linhaDoQuadro = (l) => {
    const { id, tipo, m, bloqueio, rotuloTipo, treino } = l;
    return (
      <li key={id} data-linha={id}
        className={'mn-quadro-linha estudar-linha estudar-linha--' + tipo + (escolhida === id ? ' on' : '') + (bloqueio ? ' estudar-linha--bloqueada' : '')}
        role="radio" aria-checked={escolhida === id} tabIndex={tabNa === id ? 0 : -1}
        onClick={() => escolher(id)}
        onKeyDown={(e) => andar(e, id)}>
        <span className="estudar-ident">
          <span className="estudar-ident-linha">
            <span className="estudar-nome">{m.nome}</span>
            <span className="estudar-tipo">{rotuloTipo}</span>
          </span>
          {bloqueio && <span className="estudar-bloqueio">{motivoDaLinha({ tipo, bloqueio })}</span>}
          {treino && <span className="estudar-treino">{treino}</span>}
        </span>
        <span className="mn-quadro-num estudar-nivel">{nivelTexto(l)}</span>
        <span className="mn-quadro-num estudar-custo">{custoTexto(l)}</span>
      </li>
    );
  };

  const grupo = (titulo, lista, extraClasse) => lista.length > 0 && (
    <section className={'mn-quadro-grupo ' + extraClasse} role="presentation">
      <header className="mn-quadro-cabeca estudar-cabeca" aria-hidden="true">
        <span className="mn-rotulo">{titulo} <span className="estudar-cabeca-n">{lista.length}</span></span>
        <span className="mn-rotulo mn-quadro-num">{en ? 'Level' : 'Nível'}</span>
        <span className="mn-rotulo mn-quadro-num">{en ? 'Cost' : 'Custo'}</span>
      </header>
      <ul className="estudar-lista" role="presentation">{lista.map(linhaDoQuadro)}</ul>
    </section>
  );

  const conteudo = (
    <div className="menestrel-ui">
      <ModalShell
        title={<><i className="ti ti-school det-title-ic" aria-hidden="true" /> {titulo}</>}
        lang={lang}
        size="md"
        extraClass="modal-estudar"
        onClose={onClose}
        onCancel={onClose}
        cancelLabel={en ? 'Close' : 'Fechar'}
        onConfirm={confirmar}
        confirmLabel={enviando ? (en ? 'Learning…' : 'Aprendendo…') : rotuloConfirmar}
        confirmDisabled={!sel || !!sel.bloqueio || enviando}
        footerCenter={motivo ? <span className="estudar-motivo" role="status">{motivo}</span> : null}
      >
        {/* Sem escolha, o passe mostra só o saldo; nível e custo entram quando
            há o que dizer — célula com "—" é ruído. Os valores trocam com um
            deslize curto (.mn-troca): o único momento animado desta janela. */}
        <div className={"mn-passe estudar-passe" + (sel ? " estudar-passe--escolha" : "")} aria-live="polite">
          <div className="mn-celula estudar-passe-ident">
            <span className={'mn-rotulo' + (sel && sel.tipo === 'magia' ? ' estudar-rotulo-magia' : '')}>
              {sel ? (sel.tipo === 'tecnica' ? (en ? 'Technique' : 'Técnica') : (en ? 'Spell' : 'Magia')) : (en ? 'Choice' : 'Escolha')}
            </span>
            <span key={sel ? sel.id : '-'} className={'mn-celula-valor mn-troca' + (sel ? '' : ' mn-celula-valor--vazio')}>
              {sel ? sel.m.nome : (en ? 'Pick one below' : 'Escolha no quadro')}
            </span>
          </div>
          {sel && (
            <div className="mn-celula">
              <span className="mn-rotulo">{en ? 'Level' : 'Nível'}</span>
              <span key={sel.id} className="mn-celula-valor mn-troca">{nivelTexto(sel)}</span>
            </div>
          )}
          {sel && (
            <div className="mn-celula">
              <span className="mn-rotulo">{en ? 'Cost' : 'Custo'}</span>
              <span key={sel.id} className={'mn-celula-valor mn-troca' + (custoTexto(sel) !== '—' ? ' mn-celula-valor--vivo' : '')}>{custoTexto(sel)}</span>
            </div>
          )}
          {(sel ? [sel.tipo] : tiposPresentes).map(celulaPontos)}
        </div>
        <div className="mn-quadro estudar-quadro" role="radiogroup" aria-label={en ? 'What this item teaches' : 'O que este item ensina'}>
          {grupo(en ? 'Learn now' : 'Aprender agora', livres, 'estudar-grupo--livres')}
          {grupo(en ? 'Blocked' : 'Bloqueadas', bloqueadas, 'estudar-grupo--bloqueadas')}
        </div>
      </ModalShell>
    </div>
  );
  const alvo = (typeof document !== 'undefined') && (document.getElementById('root') || document.body);
  return (alvo && ReactDOM && ReactDOM.createPortal) ? ReactDOM.createPortal(conteudo, alvo) : conteudo;
}

/* A JANELA PADRÃO de quantidade (padronizada em 12/09/2026, pedido do
   usuário): usar, descartar, guardar/retirar e transferir passam todos por
   ela, na ficha e no inventário. `irreversivel` decide só o aviso — transferir
   e guardar têm volta, e dizer "irreversível" ali era mentira. */

function QuantidadeModal({ titulo, max, lang, onConfirm, onCancel, irreversivel = true, erro = null }) {
  const [qtd, setQtd] = useState(1);
  const en = lang === 'en';
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Enter') onConfirm(qtd); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [qtd, onConfirm]);

  /* O pill de estilo inline saiu em 17/09/2026: "onde houver seletor de
     quantidade, use esse design" — o do BarEditPopover, que agora é o
     QuantidadeStepper de 01-core/helpers.jsx. Com ele saíram o pillStyle e o
     btnStyle locais, que eram a terceira cópia do mesmo desenho.

     E os chips de atalho (1, 2, 5, 10, Máx, zerar) saíram logo depois:
     "remova os botões de filtro abaixo do seletor". Eu os tinha mantido
     argumentando que eram atalho, não seletor — mas eram uma segunda maneira
     de responder a mesma pergunta, logo abaixo da primeira, e o pedido era
     justamente ter uma só. */

  return (
    <ModalShell
      title={titulo}
      lang={lang}
      size="sm"
      onClose={onCancel}
      onCancel={onCancel}
      onConfirm={() => onConfirm(qtd)}
      confirmLabel={en ? 'Confirm' : 'Confirmar'}
    >
      {/* O texto padrão dos modais de quantidade (.loja-ficha-desc), no lugar
          do itálico cinza de estilo inline que só esta tela usava. */}
      <p className="loja-ficha-desc" style={{ margin: '0 0 14px' }}>
        {irreversivel
          ? (en ? 'Caution, this action is irreversible.' : 'Cuidado, essa ação é irreversível.')
          : (en ? 'How many?' : 'Quantos?')}
      </p>

      <QuantidadeStepper
        value={qtd}
        min={1}
        max={max}
        onChange={setQtd}
        centro={<>{qtd} <span className="qtd-de-max">{en ? `of ${max}` : `de ${max}`}</span></>}
        label={en ? 'Quantity' : 'Quantidade'}
      />
      {erro && <div className="transf-error" role="alert">{erro}</div>}

    </ModalShell>
  );
}

// ── Estilos de Drag-and-Drop para o grid de inventário ───────────────────────
// Injetados uma única vez; seguem a paleta "Pedra & Bronze" do projeto.
(function injectInvDndStyles() {
  const id = 'menestrel-inv-dnd-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    /* Card sendo arrastado: transparência + borda ouro tênue */
    .inv-card--dragging {
      opacity: 0.35;
      outline: 2px dashed rgba(201,164,78,0.60);
      outline-offset: -2px;
    }
    /* Slot alvo de drop: destaque ouro */
    .inv-card--drop-target {
      outline: 2px solid rgba(201,164,78,0.90);
      outline-offset: -2px;
      background: rgba(201,164,78,0.12) !important;
      box-shadow: 0 0 10px rgba(201,164,78,0.25) !important;
    }
    /* Slot fantasma quando é alvo de drop */
    .inv-slot-ghost--drop-target {
      outline: 2px solid rgba(201,164,78,0.70);
      outline-offset: -2px;
      background: rgba(201,164,78,0.10) !important;
      border-radius: 6px;
    }
    /* Cursor padrão nos cards: pointer (clique normal) */
    .inv-card {
      cursor: pointer;
    }
    /* Cursor grab aparece SÓ enquanto o botão está pressionado (segurar) */
    .inv-card--holding {
      cursor: grab;
    }
    /* Fantasma que segue o cursor durante o arraste */
    .inv-drag-ghost {
      position: fixed;
      z-index: 10000;
      width: 50px;
      height: 50px;
      transform: translate(-50%, -50%);
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      background: rgba(24,17,8,0.95);
      border: 1px solid rgba(201,164,78,0.70);
      box-shadow: 0 6px 20px rgba(0,0,0,0.55), 0 0 12px rgba(201,164,78,0.30);
      color: #E0BE68;
      font-size: 22px;
    }
    .inv-drag-ghost .inv-card-ic { display: flex; }
  `;
  document.head.appendChild(style);
})();


/* ── CampoPreco — o valor digitado NA MOEDA (23/10/2026) ──────────────────────
   "No modal de editar item, remova o texto '= 4 moedas de prata' e adicione um
   círculo dentro do campo à direita para selecionar a moeda, representada por
   um ícone de moeda com cor." (usuário). O campo mostra a quantidade; o
   círculo à direita é a moeda (ti-coins na cor dela) e abre a lista das
   quatro. O que sobe para o pai continua em LATÃO (é o que se grava):
   4 + prata → 400. Ao abrir, a moeda é a maior que divide o valor exato
   (400 → 4 prata; 5234 → 5234 latão). Trocar a moeda mantém a quantidade. */
const MOEDA_FATOR_CAMPO = { ouro: 1000, prata: 100, cobre: 10, latao: 1 };
function moedaQueDivide(latao) {
  const n = Math.round(Number(latao) || 0);
  if (n <= 0) return 'prata';
  return ['ouro', 'prata', 'cobre', 'latao'].find((k) => n % MOEDA_FATOR_CAMPO[k] === 0);
}
function CampoPreco({ valor, onChange, lang, name, disabled, id }) {
  const en = lang === 'en';
  const nomes = MOEDA_PILL_NOMES[en ? 'en' : 'pt'];
  const [moeda, setMoeda] = useState(() => moedaQueDivide(valor));
  const [aberto, setAberto] = useState(false);
  const caixaRef = useRef(null);
  const vazio = valor === '' || valor == null;
  const qtd = vazio ? '' : String(Math.round(Number(valor) || 0) / MOEDA_FATOR_CAMPO[moeda]);

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => { if (caixaRef.current && !caixaRef.current.contains(e.target)) setAberto(false); };
    const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setAberto(false); } };
    document.addEventListener('mousedown', fora);
    window.addEventListener('keydown', esc, true);
    return () => { document.removeEventListener('mousedown', fora); window.removeEventListener('keydown', esc, true); };
  }, [aberto]);

  const emitir = (q, m) => {
    if (q === '' || q == null) { onChange(''); return; }
    const n = Number(q);
    onChange(Number.isFinite(n) ? Math.max(0, Math.round(n * MOEDA_FATOR_CAMPO[m])) : '');
  };
  const escolher = (m) => {
    setMoeda(m);
    setAberto(false);
    if (!vazio) emitir(qtd, m);
  };

  /* ── A MOEDA SAIU DE DENTRO DA PÍLULA (28/10/2026) ──────────────────────
     "O seletor de preço está diferente porque ele tem o seletor de moeda, mas
     é possível colocar o seletor de moeda fora, mas do lado, e o seletor de
     preço ter o + e -." (usuário)

     Era isso que impedia os dois seletores da loja de serem a mesma peça: o
     preço tinha um botão a mais DENTRO do pill, no lugar onde o seletor de
     quantidade tem o "+", e por isso nunca ia bater por mais que a pele
     combinasse. Com a moeda do lado de fora, o preço vira o
     QuantidadeStepper de sempre — "−", o número, "+" —, e a moeda é um botão
     irmão, na mesma fileira.

     O número continua DIGITÁVEL (o `centro` é o input): preço de 8000 latões
     não se alcança clicando "+" oito mil vezes. O passo dos botões é 1 da
     moeda escolhida, que é como se pensa um preço — "mais um ouro". */
  const passo = (d) => {
    const atual = Number(qtd === '' ? 0 : qtd) || 0;
    emitir(String(Math.max(0, atual + d)), moeda);
  };

  return (
    <div className="campo-preco" ref={caixaRef}>
      <span className="fp-pop-stepper campo-preco-stepper" role="group"
        aria-label={en ? 'Price' : 'Preço'}>
        <button type="button" className="fp-step-btn" disabled={disabled || (Number(qtd) || 0) <= 0}
          aria-label="-" onClick={() => passo(-1)}>
          <i className="ti ti-minus" aria-hidden="true" />
        </button>
        <span className="fp-pop-stepper-label">
          <input className="campo-preco-input" type="number" min="0" step="1" inputMode="numeric"
            id={id} name={name} value={qtd} disabled={disabled}
            aria-label={en ? 'Price' : 'Preço'}
            onChange={(e) => emitir(e.target.value, moeda)} />
        </span>
        <button type="button" className="fp-step-btn" disabled={disabled}
          aria-label="+" onClick={() => passo(1)}>
          <i className="ti ti-plus" aria-hidden="true" />
        </button>
      </span>
      <button type="button" className="fp-step-btn campo-preco-moeda" disabled={disabled}
        aria-haspopup="listbox" aria-expanded={aberto}
        aria-label={(en ? 'Coin: ' : 'Moeda: ') + nomes[moeda]}
        onClick={() => setAberto((a) => !a)}>
        <i className="ti ti-coins" style={{ color: MOEDA_COR[moeda] }} aria-hidden="true" />
      </button>
      {aberto && (
        <ul className="campo-preco-lista" role="listbox" aria-label={en ? 'Coin' : 'Moeda'}>
          {['ouro', 'prata', 'cobre', 'latao'].map((m) => (
            <li key={m} role="option" aria-selected={m === moeda}>
              <button type="button" className={'campo-preco-opcao' + (m === moeda ? ' is-on' : '')} onClick={() => escolher(m)}>
                <i className="ti ti-coins" style={{ color: MOEDA_COR[m] }} aria-hidden="true" />
                {nomes[m]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
Object.assign(window, {
  BauTopo, BauCargaRodape,
  InventarioList, EquipadoBoard, VestesBoard, MoedaPills, CampoPreco, MOEDA_COR,
  CabecalhoInvLoja, InvItemsTable, DetStat, DetalhesItemModal, ContainerModal, QuantidadeModal, DarItemModal,
  guardarNoRecipiente, normalizarPilhas,
  // Leitura de livro (itens.doc_url) — o bestiário também abre por aqui.
  LeituraDocModal, urlLeituraDoc,
  // Janela Estudar: aprender magia de livro/pergaminho (22/10/2026).
  EstudarMagiaModal,
  // Slot de vestir do banco → casa da ficha ('costas' → 'capa'…).
  vesteSlotDe,
  // Teto de peças por região — precisa bater com as casas que a ficha desenha
  // (vestir-capacidade.test.js trava os dois lados juntos, 16/09/2026).
  VESTE_SLOTS, vesteSlotState, ehVestimenta,
  // O que o item ensina (livro/pergaminho) e por que não dá (22/10/2026).
  vinculosDeLivros, magiasQueOItemEnsina, bloqueioAprenderNoInventario,
  ehPergaminhoDeTecnica, tecnicasQueOItemEnsina, bloqueioTecnicaNoInventario, chaveDaMagiaPorNome, motivoAprenderLabel, ehPergaminhoDeMagia, ehItemDeMagiaEmBatalha,
  // A magia que o item carrega — o bestiário mostra nome e descrição.
  magiaDoItem,
  // Montaria: a ficha abre a aba da montaria a partir daqui.
  criaturaDoItem, itemMontado, useCriaturasMontaria,
  // Aba Animais da ficha: todos os animais vinculados a criatura.
  animaisDoPersonagem, useCriaturasPorIds,
  /* O animal como item (05–06/10/2026): nome do dono, barras na instância,
     arreamento por subtipo e a ação Alimentar. */
  NOME_ANIMAL_MAX, racaDoAnimal, nomeDoAnimal, comNomeDoAnimal,
  CONDICOES_ANIMAL, COND_ANIMAL_MAX, vitalidadeDoAnimal, comVitalidadeDoAnimal,
  cargaDoAnimal, CARGA_ANIMAL_FRACAO,
  subtiposDaPeca, animalAceitaAPeca, ehPecaDeMontaria, animalEhMontaria, motivoDaRecusaNoAnimal,
  slotNoAnimal, itensDoAnimal,
  equiparNoAnimal, desequiparDoAnimal, motivoAnimalLabel,
  SLUGS_RACAO_ANIMAL, ehRacaoDeAnimal, fomeQueOItemTira, alimentarAnimal,
  PrecoMoedasInput, motivoVendaLabel, bloqueioVenda,
  MAGIAS_ELO_PERMANENTE, ELO_MAX_PERMANENTES, magiaCriaElo, eloTetoEstagio, temElo, bloqueioElo,
  motivoEloLabel, comEloNoAnimal, semEloNoAnimal,
  // ↓ expostos para a Loja (07-inventario/loja.jsx) consumir via window:
  fmtNum, calcCarga, invItemIcon, recipienteAceitaSlug, usePortalTooltip, PortalTooltip,
  useGridDimensions, LINHAS_BAU, ItemIcone,
});
