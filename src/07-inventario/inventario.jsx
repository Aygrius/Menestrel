/* ============================================================
   INVENTÁRIO — Lado Jogador (aba "Inventário" do console)
   ============================================================
   Tudo que o Jogador faz com itens, moedas e equipamento.
   (A aba "Loja" foi extraída para 07-inventario/loja.jsx.)

   - InventarioList      — orquestrador: lista PJs, carrega catálogo
                           e inventário JSONB, autosave 450ms
   - CofreMoedas / MoedasBoard / MoedaPills / CabecalhoInvLoja
                         — exibição de moedas { ouro, prata, cobre, latao }
   - EquipadoBoard / VestesBoard — slots de equipamento e vestimenta
   - InvItemsTable       — tabela de itens (qtd, equipar, container, ...)
   - DetStat / DetalhesItemModal — detalhe + ações (equipar/desequipar,
                           usar, destruir, mover, transferir via transfer_item)
   - ContainerModal      — visualiza/remove itens de um container
   - QuantidadeModal     — escolha de quantidade (usar/destruir/mover)
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
   fmtNum, calcCarga, invItemIcon, MoedaPills, MoedasBoard, CabecalhoInvLoja
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
    timerRef.current = setTimeout(() => setTip({ rect, content }), delay || 0);
  }, [delay]);
  const fecharTip = React.useCallback(() => { clearTimeout(timerRef.current); setTip(null); }, []);
  const manterTip = React.useCallback(() => { clearTimeout(timerRef.current); }, []);
  return [tip, abrirTip, fecharTip, manterTip];
}
function PortalTooltip({ tip, onEnter, onLeave }) {
  if (!tip) return null;
  const { rect, content } = tip;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top;
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
    const cat = catalogoBySlug?.[it.slug];
    const container = ehContainer(cat);

    // Dentro de armazenamento → SOMA: itens do mesmo slug no mesmo container
    // viram UMA pilha só (consumíveis, materiais E equipáveis/vestíveis —
    // "dentro do armazenamento some"). Só sub-containers ficam de fora: cada
    // recipiente é uma instância distinta e não se funde com outro.
    if (it.containerId) {
      if (container) { saida.push(it); continue; }
      const chave = it.slug + '|' + it.containerId;
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
    if (it.equipado || it.vestido) {
      const qtdEq = it.quantidade || 1;
      saida.push(qtdEq <= 1 ? it : { ...it, quantidade: 1 });
      for (let k = 1; k < qtdEq; k++) {
        saida.push({ ...it, instanceId: novoInstanceId() + '-eq' + k, quantidade: 1, equipado: false, vestido: false, slot: null, vesteSlot: null });
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

// Ordem canônica dos slots de equipamento (paper-doll do quadro "Equipado").
const SLOT_ORDER = ['cabeca', 'ombros', 'peito', 'mao_d', 'mao_e', 'maos', 'pernas', 'pes'];

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
const VESTE_SLOTS = {
  cabeca:  { max: 1,  gastaSlot: true  }, // Cabeça
  pes:     { max: 1,  gastaSlot: true  }, // Pés
  ombros:  { max: 1,  gastaSlot: true  }, // Ombros
  pernas:  { max: 1,  gastaSlot: true  }, // Pernas
  bracos:  { max: 1,  gastaSlot: true  }, // Braços
  peito:   { max: 1,  gastaSlot: true  }, // Peito
  maos:    { max: 2,  gastaSlot: true  }, // Mãos
  capa:    { max: 1,  gastaSlot: true  }, // Capa
  roupa:   { max: 2,  gastaSlot: true  }, // Roupa (corpo, 2 compartimentos)
  cintura: { max: 1,  gastaSlot: true  }, // Cintura
  orelha:  { max: 1,  gastaSlot: true  }, // Brinco (orelha)
  brinco:  { max: 1,  gastaSlot: true  }, // alias de orelha (categoria_equip do banco)
  pescoco: { max: 1,  gastaSlot: false }, // Colar (pescoço)
  colar:   { max: 1,  gastaSlot: false }, // alias de pescoco (categoria_equip do banco)
  joia:    { max: 2,  gastaSlot: false }, // Joia (dedos)
};

// O slot da peça vem direto do catálogo (cat.slot_equip), sem normalização.
function vesteSlotDe(slotEquip) {
  return slotEquip || null;
}
// inferirSlotEquip — deduz o slot de vestimenta pelo grupo/categoria quando
// cat.slot_equip nao esta definido no catalogo. Cobre brincos e colares
// que sao vestimentas mas nao tem slot_equip gravado no banco.
function inferirSlotEquip(cat) {
  if (!cat) return null;
  if (cat.slot_equip) return cat.slot_equip;
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

  for (const it of itens) {
    const cat = catalogoBySlug[it.slug];
    if (!cat) continue;
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

// ── InventarioList ────────────────────────────────────────────────────────────
function InventarioList({ ac, lang, currentUserId, pjIdFixo, onInventarioChange, maximos }) {
  const [pjs, setPjs] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [catalogo, setCatalogo] = useState(null);
  const [inv, setInv] = useState(null);
  const [estadoAtual, setEstadoAtual] = useState(null); // efeitos de item (Reputação, Sono, EH/EF, ...)
  const [saving, setSaving] = useState('idle');
  const [error, setError] = useState(null);
  const [detalhesId, setDetalhesId] = useState(null);
  // Fase 3
  const [pjsHistoria, setPjsHistoria] = useState([]);
  const [containerAberto, setContainerAberto] = useState(null); // instanceId
  const [transferError, setTransferError] = useState(null);
  // Ação pendente que aguarda escolha de quantidade no QuantidadeModal
  // formato: { tipo: 'usar'|'destruir'|'mover', instanceId, max, extra? }
  const [acaoPendente, setAcaoPendente] = useState(null);
  // Nome da mesa (história) do PJ selecionado — mesma info exibida na Loja.
  // Fonte: RPC get_loja_pj (já retorna historia_titulo). Só leitura; estoque é ignorado aqui.
  const [mesaTitulo, setMesaTitulo] = useState(null);
  // historia_id real do PJ selecionado — NÃO vem de get_loja_pj (schema não
  // confirmado pra esse campo); resolvido pela mesma query reversa que
  // src/11-ficha/ficha.jsx já usa (protagonista_ids @> [pjId]). Usado só
  // pra notificar a Central de Mensagens da Mesa (registrar_evento_mesa).
  const [historiaId, setHistoriaId] = useState(null);
  // True quando auth.uid() === currentUserId, ou seja, o usuário logado
  // é o dono dos PJs listados. False quando um Mestre está vendo o inventário
  // de outro jogador — nesse caso a RPC usar_pergaminho_magia falha (auth.uid()
  // ≠ user_id do PJ), então o botão "Aprender" deve ficar oculto.
  const [authUserIsOwner, setAuthUserIsOwner] = useState(false);

  // Carregar PJs + catálogo
  useEffect(() => {
    if (!currentUserId) return;
    (async () => {
      const [pjRes, itRes, authRes] = await Promise.all([
        supabaseClient.from('personagens').select('id,nome,sobrenome,raca,profissao,forca_base,fisico_base,inventario,estado_atual').eq('user_id', currentUserId).order('created_at', { ascending: true }),
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
        supabaseClient.from('historias').select('id').contains('protagonista_ids', [selectedId]).maybeSingle(),
      ]);
      setPjsHistoria(pjsRes.data || []);
      setMesaTitulo(lojaRes.data?.ok ? (lojaRes.data.historia_titulo || null) : null);
      setHistoriaId(!histRes.error && histRes.data ? histRes.data.id : null);
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
  useEffect(() => {
    const pjsAtual = pjsRef.current;
    if (!pjsAtual || !selectedId) { setInv(null); setEstadoAtual(null); return; }
    const pj = pjsAtual.find((p) => p.id === selectedId);
    if (!pj) return;
    const inventario = pj.inventario || { moedas: { ouro: 0, prata: 0, cobre: 0, latao: 0 }, itens: [] };
    if (!inventario.moedas) inventario.moedas = { ouro: 0, prata: 0, cobre: 0, latao: 0 };
    if (!Array.isArray(inventario.itens)) inventario.itens = [];
    setInv(inventario);
    setEstadoAtual(pj.estado_atual || {});
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

  // Save com debounce. Sincroniza a ficha (onInventarioChange) na hora
  // e dá FLUSH do save pendente ao desmontar — senão trocar de aba logo
  // após equipar cancelava o setTimeout e a alteração se perdia.
  const firstRender = useRef(true);
  const invRef = useRef(inv);
  const selRef = useRef(selectedId);
  const dirtyRef = useRef(false);
  useEffect(() => { invRef.current = inv; }, [inv]);
  useEffect(() => { selRef.current = selectedId; }, [selectedId]);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    if (!inv || !selectedId) return;
    if (onInventarioChange) onInventarioChange(inv);
    dirtyRef.current = true;
    setSaving('saving');
    const id = setTimeout(async () => {
      const { error } = await supabaseClient.from('personagens').update({ inventario: inv }).eq('id', selectedId);
      if (error) { setSaving('error'); }
      else {
        dirtyRef.current = false;
        setSaving('saved');
        setPjs((arr) => arr.map((p) => p.id === selectedId ? { ...p, inventario: inv } : p));
        setTimeout(() => setSaving('idle'), 1500);
      }
    }, 450);
    return () => clearTimeout(id);
  }, [inv, selectedId]);
  // Flush ao desmontar (troca de aba/PJ): persiste a última alteração.
  useEffect(() => () => {
    if (dirtyRef.current && invRef.current && selRef.current) {
      supabaseClient.from('personagens').update({ inventario: invRef.current }).eq('id', selRef.current);
    }
  }, []);

  // Save de estado_atual (Reputação, Sono, EH/EF, ...) — mesmo padrão de
  // debounce/flush do inventário, mas COLUNA separada (estado_atual). Só
  // dispara quando usarItem/vestir/despir mexem em algo via aplicarEfeitosItem;
  // edição manual das barras continua exclusiva do Mestre, em ficha.jsx.
  const firstRenderEstado = useRef(true);
  const estadoRef = useRef(estadoAtual);
  const estadoDirtyRef = useRef(false);
  useEffect(() => { estadoRef.current = estadoAtual; }, [estadoAtual]);
  useEffect(() => {
    if (firstRenderEstado.current) { firstRenderEstado.current = false; return; }
    if (!estadoAtual || !selectedId) return;
    estadoDirtyRef.current = true;
    const id = setTimeout(async () => {
      const { error } = await supabaseClient.from('personagens').update({ estado_atual: estadoAtual }).eq('id', selectedId);
      if (!error) {
        estadoDirtyRef.current = false;
        setPjs((arr) => arr.map((p) => p.id === selectedId ? { ...p, estado_atual: estadoAtual } : p));
      }
    }, 450);
    return () => clearTimeout(id);
  }, [estadoAtual, selectedId]);
  useEffect(() => () => {
    if (estadoDirtyRef.current && estadoRef.current && selRef.current) {
      supabaseClient.from('personagens').update({ estado_atual: estadoRef.current }).eq('id', selRef.current);
    }
  }, []);

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
    const normalizados = normalizarPilhas(inv.itens, catalogoBySlug);
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
      if (cat.slot_equip === 'cabeca' || cat.slot_equip === 'pes') {
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
      const catInvertido = { efeito_positivo: cat.efeito_negativo, efeito_negativo: cat.efeito_positivo };
      setEstadoAtual((cur) => aplicarEfeitosItem(cur, catInvertido, 1, maximos));
    }
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
      const nomePj = pjAtual ? [pjAtual.nome, pjAtual.sobrenome].filter(Boolean).join(' ') : null;
      if (nomePj) {
        const texto = lang === 'en' ? `${nomePj} used ${cat.nome}` : `${nomePj} usou ${cat.nome}.`;
        registrarEventoMesa('item', texto, { item: cat.nome, quantidade, instanceId });
      }
    }
  };

  const destruirItem = (instanceId, quantidade) => {
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

  // Fase — preparar animal: remove 1 unidade do animal e adiciona o item resultante
  // (cat.consumiveis = slug, cat.consumiveis_peso = quantidade) na bag do personagem.
  const prepararAnimal = (instanceId) => {
    const it = inv?.itens.find((x) => x.instanceId === instanceId);
    const cat = it ? catalogoBySlug[it.slug] : null;
    if (!it || !cat?.consumiveis) return;
    const slugResultado = cat.consumiveis;
    const qtdResultado = Number(cat.consumiveis_peso) || 1;
    setInv((cur) => {
      const itens = cur.itens
        .map((x) => x.instanceId === instanceId
          ? { ...x, quantidade: x.quantidade - 1 }
          : x)
        .filter((x) => x.quantidade > 0);
      // Tenta acumular com item igual já solto na bag (mesmo slug, sem container, sem slot)
      const existente = itens.find((x) => x.slug === slugResultado && !x.containerId && !x.slot && !x.equipado && !x.vestido);
      if (existente) {
        return {
          ...cur,
          itens: itens.map((x) => x.instanceId === existente.instanceId
            ? { ...x, quantidade: x.quantidade + qtdResultado }
            : x),
        };
      }
      return {
        ...cur,
        itens: [...itens, {
          instanceId: novoInstanceId(),
          slug: slugResultado,
          quantidade: qtdResultado,
          equipado: false,
          slot: null,
          containerId: null,
          observacao: null,
        }],
      };
    });
  };

  const setObservacao = (instanceId, texto) => {
    setInv((cur) => ({
      ...cur,
      itens: cur.itens.map((it) => it.instanceId === instanceId ? { ...it, observacao: texto || null } : it),
    }));
  };

  // Fase 3 — mover item para/de container (com split parcial e validação de capacidade)
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
  const solicitarUsar = (instanceId) => {
    const it = inv?.itens.find((x) => x.instanceId === instanceId);
    if (!it) return;
    if (it.quantidade > 1) {
      setAcaoPendente({ tipo: 'usar', instanceId, max: it.quantidade });
    } else {
      usarItem(instanceId, 1);
    }
  };

  const solicitarDestruir = (instanceId) => {
    const it = inv?.itens.find((x) => x.instanceId === instanceId);
    if (!it) return;
    if (it.quantidade > 1) {
      setAcaoPendente({ tipo: 'destruir', instanceId, max: it.quantidade });
    } else {
      destruirItem(instanceId, 1);
    }
  };

  const solicitarMover = (instanceId, containerId) => {
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
    if (maxPossivel === 1 && it.quantidade === 1) {
      // único, cabe certinho: move direto
      moverParaContainer(instanceId, containerId, 1);
      return;
    }
    setAcaoPendente({ tipo: 'mover', instanceId, max: maxPossivel, extra: { containerId } });
  };

  // Executa a ação que estava aguardando escolha de quantidade
  const executarAcaoPendente = (qtd) => {
    if (!acaoPendente) return;
    const { tipo, instanceId, extra } = acaoPendente;
    if (tipo === 'usar')     usarItem(instanceId, qtd);
    if (tipo === 'destruir') destruirItem(instanceId, qtd);
    if (tipo === 'mover')    moverParaContainer(instanceId, extra?.containerId ?? null, qtd);
    setAcaoPendente(null);
  };

  // Fase 3 — transferir item entre PJs (chama RPC). Recebe o instanceId
  // explicitamente (usado tanto pela transferência inline quanto por outros pontos).
  const transferirItem = async (instanceId, pjDestinoId, moedas) => {
    setTransferError(null);
    const instance = inv?.itens.find((it) => it.instanceId === instanceId);
    if (!instance) return { ok: false };
    const { data, error } = await supabaseClient.rpc('transfer_item', {
      p_from_pj_id: selectedId,
      p_to_pj_id: pjDestinoId,
      p_instance_id: instanceId,
      p_moedas: moedas && moedasToLatao(moedas) > 0 ? moedas : null,
    });
    if (error || !data?.ok) {
      setTransferError(error?.message || data?.motivo || 'Erro desconhecido');
      return { ok: false };
    }
    // Recarregar todos os PJs do usuário para refletir ambos os inventários
    const { data: pjsAtualizados } = await supabaseClient
      .from('personagens')
      .select('id,nome,sobrenome,raca,profissao,inventario')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: true });
    if (pjsAtualizados) {
      setPjs(pjsAtualizados);
      // Atualizar inv local do PJ remetente
      const pjAtual = pjsAtualizados.find((p) => p.id === selectedId);
      if (pjAtual) setInv(pjAtual.inventario);
    }
    return { ok: true };
  };

  // Fase 7 — usar pergaminho de magia (aprende magia Perdida/Ancestral).
  // Validação + aplicação atômica no servidor (RPC usar_pergaminho_magia):
  // checa pontos de magia, pré-requisito de nível, permissão e teto de estágio,
  // grava o passo em personagens.magias e consome 1 pergaminho. Recarrega o PJ
  // pra refletir a remoção (as magias vivem fora do inventário).
  const aprenderMagiaPergaminho = async (instanceId) => {
    const { data, error } = await supabaseClient.rpc('usar_pergaminho_magia', {
      p_pj_id: selectedId,
      p_instance_id: instanceId,
    });
    if (error || !data?.ok) {
      return { ok: false, motivo: error?.message || data?.motivo || 'erro_desconhecido' };
    }
    const { data: pjsAtualizados } = await supabaseClient
      .from('personagens')
      .select('id,nome,sobrenome,raca,profissao,forca_base,fisico_base,inventario')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: true });
    if (pjsAtualizados) {
      setPjs(pjsAtualizados);
      const pjAtual = pjsAtualizados.find((p) => p.id === selectedId);
      if (pjAtual) setInv(pjAtual.inventario);
    }
    return { ok: true, magiaNome: data.magia_nome, nivel: data.nivel };
  };

  // Cálculo derivado — peso/carga (medidor único). O armazenamento por
  // container continua sendo tratado pelo capacidadeContainer (intacto).
  const carga = useMemo(() => {
    const pjSel = pjs?.find((p) => p.id === selectedId);
    return calcCarga(inv?.itens, catalogoBySlug, pjSel?.forca_base, pjSel?.fisico_base);
  }, [inv, catalogoBySlug, pjs, selectedId]);

  // ── Render ────────────────────────────────────────────────
  if (pjs === null || catalogo === null) {
    return <div className="admin-loading"><span>{lang === 'en' ? 'Loading inventory…' : 'Abrindo as algibeiras…'}</span></div>;
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
          <CabecalhoInvLoja carga={carga} lang={lang} />
          <InvItemsTable
            itens={inv.itens}
            catalogoBySlug={catalogoBySlug}
            mudarQtd={mudarQtd}
            onAbrirDetalhes={(id) => setDetalhesId(id)}
            onAbrirContainer={(id) => setContainerAberto(id)}
            lang={lang}
            onReordenarItens={(novaOrdem) => {
              // novaOrdem: array de instanceIds representando a nova sequência
              // dos itens visíveis (soltos, não equipados, não em container).
              // Reconstrói inv.itens preservando itens invisíveis (equipados,
              // em container) na posição relativa entre si, inserindo os
              // reordenados nos slots de itens visíveis.
              setInv((prev) => {
                if (!prev) return prev;
                const visivelSet = new Set(
                  prev.itens
                    .filter((it) => !it.containerId && !it.slot && !it.vestido)
                    .map((it) => it.instanceId)
                );
                const byId = Object.fromEntries(prev.itens.map((it) => [it.instanceId, it]));
                // itens que NÃO fazem parte do grid visível (mantêm posição relativa)
                const invisíveis = prev.itens.filter((it) => !visivelSet.has(it.instanceId));
                // itens visíveis na nova ordem
                const reordenados = novaOrdem.map((id) => byId[id]).filter(Boolean);
                return { ...prev, itens: [...reordenados, ...invisíveis] };
              });
            }}
          />
        </>
      )}

      {/* <div className="inv-save-status" data-state={saving}>
        {saving === 'saving' && (lang === 'en' ? 'Saving…' : 'Salvando…')}
        {saving === 'saved'  && (lang === 'en' ? 'Saved ✓'  : 'Salvo')}
        {saving === 'error'  && (lang === 'en' ? 'Save failed' : 'Falha ao salvar')}
      </div> */}

      {detalhesId && instanceDetalhes && (
        <DetalhesItemModal
          instance={instanceDetalhes}
          catalogoBySlug={catalogoBySlug}
          raca={racaPj}
          slotsState={slotsState}
          todosItens={inv.itens}
          containersDisponiveis={containersDisponiveis}
          pjsHistoria={pjsHistoria}
          lang={lang}
          onClose={() => setDetalhesId(null)}
          onEquipar={equipar}
          onDesequipar={desequipar}
          onVestir={vestir}
          onDespir={despir}
          onUsar={solicitarUsar}
          onPreparar={prepararAnimal}
          onAprenderMagia={authUserIsOwner ? aprenderMagiaPergaminho : undefined}
          onDestruir={solicitarDestruir}
          onObservacao={setObservacao}
          onMoverParaContainer={solicitarMover}
          onTransferir={(pjDestinoId) => transferirItem(instanceDetalhes.instanceId, pjDestinoId, null)}
          transferError={transferError}
          onTransferReset={() => setTransferError(null)}
          onRemoverDoContainer={(id) => solicitarMover(id, null)}
          onAbrirDetalhesFilho={(id) => setDetalhesId(id)}
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
          onAbrirDetalhes={(id) => { setContainerAberto(null); setDetalhesId(id); }}
        />
      )}

      {acaoPendente && (() => {
        const it = inv?.itens.find((x) => x.instanceId === acaoPendente.instanceId);
        const cat = it ? catalogoBySlug[it.slug] : null;
        const nome = cat?.nome || it?.slug || '';
        const titulosPt = {
          usar:     `Usar ${nome}`,
          destruir: `Destruir ${nome}`,
          mover:    acaoPendente.extra?.containerId
            ? `Armazenar ${nome}`
            : `Retirar ${nome}`,
        };
        const titulosEn = {
          usar:     `Use ${nome}`,
          destruir: `Destroy ${nome}`,
          mover:    acaoPendente.extra?.containerId
            ? `Store ${nome}`
            : `Take out ${nome}`,
        };
        const t = (lang === 'en' ? titulosEn : titulosPt)[acaoPendente.tipo];
        return (
          <QuantidadeModal
            titulo={t}
            max={acaoPendente.max}
            lang={lang}
            onConfirm={executarAcaoPendente}
            onCancel={() => setAcaoPendente(null)}
          />
        );
      })()}
    </div>
  );
}

// ── CofreMoedas — ícone Tabler ti-coins padrão, cor por denominação ───────────
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
  const en = lang === 'en';
  const nome = MOEDA_PILL_NOMES[en ? 'en' : 'pt'][tipo];
  return (
    <span
      className={'moeda-pill moeda-pill--' + tipo
        + (zerado ? ' is-zero' : '')
        + (mudo ? ' is-mudo' : '')
        + (tamanho ? ' moeda-pill--' + tamanho : '')}
      title={nome}>
      <i
        className="ti ti-coins moeda-pill-ic"
        style={{ color: MOEDA_COR[tipo] }}
        aria-hidden="true"
      />
      <span className="moeda-pill-nome">{nome}</span>
      <span className="moeda-pill-qtd"><span className="moeda-pill-x"></span>{(qtd || 0).toLocaleString(en ? 'en-US' : 'pt-BR')}</span>
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

// CofreMoedas mantém a MESMA API (moedas/lang/mostrarGratis/mostrarZeros) mas
// agora só delega no padrão novo (pílulas, tamanho compacto). Consumido pelo
// cofre e pela coluna "Valor" do bestiário.
function CofreMoedas({ moedas, lang, mostrarGratis, mostrarZeros }) {
  return (
    <MoedaPills
      moedas={moedas}
      lang={lang}
      mostrarGratis={mostrarGratis}
      mostrarZeros={mostrarZeros}
      tamanho="sm"
    />
  );
}
// ── MoedasBoard — moedas como seção própria dentro do inventário ──────────────
// Variante PADRÃO (inventário): ornamento (listra com ícone) + cabeçalho
// "Moedas · total" + as 4 denominações como pílulas (padrão novo, MoedaPills).
// Variante `compacto` (cabeçalho da Loja): cabeçalho + mesmas pílulas, tamanho sm.
function MoedasBoard({ moedas, lang, compacto }) {
  const en = lang === 'en';
  const totalMoedas = MOEDA_ORDEM.reduce((s, t) => s + (moedas?.[t] || 0), 0);

  const grouphead = (
    <div className="inv-bag-grouphead">
      <i className="ti ti-coins" aria-hidden="true" />
      <span className="inv-bag-grp-name">{en ? 'Coins' : 'Moedas'}</span>
      <span className="inv-bag-grp-count">{totalMoedas.toLocaleString(en ? 'en-US' : 'pt-BR')}</span>
    </div>
  );

  if (compacto) {
    return (
      <div className="inv-bag-group inv-bag-group--moedas">
        {grouphead}
        <div className="inv-moedas-pills">
          <MoedaPills moedas={moedas} lang={lang} mostrarZeros tamanho="sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="inv-eq-board inv-moedas-board">
      <div className="inv-divider">
        <span className="inv-divider-ln" />
        <span className="inv-divider-lbl"><i className="ti ti-coins" aria-hidden="true" /></span>
        <span className="inv-divider-ln" />
      </div>
      {grouphead}
      <div className="inv-moedas-pills">
        <MoedaPills moedas={moedas} lang={lang} mostrarZeros />
      </div>
    </div>
  );
}

// ── CabecalhoInvLoja — topo padronizado de Inventário e Loja ──────────────────

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
            desc: [cat.descricao, cat.efeito ? `${en ? 'Effect' : 'Efeito'}: ${cat.efeito}` : null].filter(Boolean).join(' ') || null,
            clamp: true,
          } : <span style={{ fontFamily: "'Lora', serif", fontSize: 13, color: '#E8DDC6' }}>{slotLabel}</span>;   // slot vazio → React element com Lora
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
              onClick={() => onAbrir(it.instanceId)} title={nome}>
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
    </div>
  );
}

// ── InvItemsTable — Mochila Visual: grid flat com busca + chips de categoria ───
// Mantém o mesmo nome/props de antes (chamado por InventarioList e pela ficha).
// A "bolsa" mostra só itens fora de container E não equipados — os equipados
// vivem na ficha (Defesa/Vestes); os de dentro de container, no ContainerModal.
// Layout flat (sem agrupamento por categoria) com busca + chips, igual à loja.
// Hook que observa o tamanho do container ref e do scroll-container (.mc-main)
// para calcular quantas colunas e linhas de slots cabem na área visível.
// SLOT_SIZE = 50px de célula + 4px de gap = 54px por unidade.
// Calibrado para 19 itens por linha.
const SLOT_SIZE = 54;
// Teto de colunas por linha — limita a grade para não gerar espaço desperdiçado.
const MAX_GRID_COLS = 20;
// offsetExtra: altura extra a descontar dentro do ref antes do grid
// (ex: toolbar de busca ~48px na loja).
// Teto de linhas da grade: o preenchimento com slots fantasmas para em
// MAX_GRID_ROWS linhas em vez de descer pela viewport inteira. Itens reais
// acima desse teto continuam renderizando (a grade cresce), só o "chão" de
// células vazias é limitado. Compartilhado por Inventário e Loja (loja.jsx usa
// window.useGridDimensions). O Diário tem cópia própria deste teto.
const MAX_GRID_ROWS = 11;
// useGridDimensions — calcula quantas colunas/linhas de slots (50px) cabem na
// área visível, preenchendo todo o espaço do .mc-main (scroll container).
//
// Usa CALLBACK REF (setGridEl) em vez de useRef + useEffect[]. Isso é o que
// torna o hook robusto e idêntico entre Inventário (grid monta sync) e Loja
// (grid monta async, depois da RPC get_loja_pj): o ResizeObserver é anexado no
// exato momento em que o elemento entra no DOM, qualquer que seja o timing.
// Retorna [setGridEl, dims] — espalhe setGridEl como `ref` no <div> do grid.
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
    const cols = Math.min(MAX_GRID_COLS, Math.max(3, Math.floor(w / SLOT_SIZE)));
    const rows = Math.min(MAX_GRID_ROWS, Math.max(2, Math.floor(h / SLOT_SIZE)));
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

function InvItemsTable({ itens, catalogoBySlug, mudarQtd, onAbrirDetalhes, onAbrirContainer, lang, onReordenarItens }) {
  const { Input } = (typeof UI !== 'undefined' ? UI : {});
  const en = lang === 'en';
  const [busca, setBusca] = useState('');
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
  const itensFiltradosRef = React.useRef([]);
  // Guarda o ponto onde o ponteiro desceu + se o limiar de arraste foi cruzado.
  // Enquanto não cruzar (~6px), tratamos como clique (abre detalhes).
  const pointerStartRef = React.useRef(null);
  // Sinaliza que o próximo 'click' (sintético, pós-arraste) deve ser ignorado.
  const suppressClickRef = React.useRef(false);

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

  // Efetiva a reordenação a partir do índice de origem e destino.
  const commitReorder = React.useCallback((fromIdx, targetIdx) => {
    const currentFiltered = itensFiltradosRef.current;
    if (fromIdx === null || targetIdx === null || fromIdx === targetIdx) return;
    const arr = [...currentFiltered];
    if (fromIdx < 0 || fromIdx >= arr.length) return;
    const [moved] = arr.splice(fromIdx, 1);
    const insertAt = Math.min(Math.max(targetIdx, 0), arr.length);
    arr.splice(insertAt, 0, moved);
    if (onReordenarItens) onReordenarItens(arr.map((it) => it.instanceId));
  }, [onReordenarItens]);

  // Handlers globais (montados só enquanto um arraste está ativo).
  React.useEffect(() => {
    if (!drag) return;

    const onMove = (e) => {
      const x = e.clientX, y = e.clientY;
      dragRef.current = { ...dragRef.current, x, y };
      setDrag((d) => (d ? { ...d, x, y } : d));
      const idx = slotIdxFromPoint(x, y);
      overIdxRef.current = idx;
      setOverIdx(idx);
      e.preventDefault();
    };

    const onUp = (e) => {
      const d = dragRef.current;
      const target = overIdxRef.current;
      const houveArraste = !!d;
      if (d) commitReorder(d.fromIdx, target);
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
  }, [drag ? drag.instanceId : null, commitReorder, slotIdxFromPoint]);

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

  const itensVisiveis = (itens || []).filter((it) => !it.containerId && !it.slot && !it.vestido);

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

  // Itens filtrados pela busca + chip de grupo
  const itensFiltrados = useMemo(() => {
    return itensVisiveis.filter((it) => {
      const cat = catalogoBySlug[it.slug];
      const g = cat?.grupo || (en ? 'Other' : 'Outros');
      if (grupoSel && g !== grupoSel) return false;
      if (q && !normTxt(cat?.nome || it.slug).includes(q)) return false;
      return true;
    });
  }, [itensVisiveis, catalogoBySlug, grupoSel, q, en]);

  // Mantém a ref sempre atualizada para o commitReorder ler sem closure stale.
  itensFiltradosRef.current = itensFiltrados;

  // Monta o content do tooltip para um item/container.
  // Mostra apenas o NOME do item (a descrição vive no modal de detalhes).
  const tipContent = (it, cat) => {
    return { title: cat ? cat.nome : `(? ${it.slug})` };
  };

  const renderContainerCard = (it, cat, idx) => {
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
        }
        style={{ touchAction: 'none' }}
        onClick={() => onCardClick(it.instanceId)}
        onMouseEnter={(e) => abrirTipSafe(e, tipContent(it, cat))}
        onMouseLeave={fecharTip}
        onPointerDown={(e) => onCardPointerDown(e, idx, it.instanceId)}
        onPointerMove={(e) => onCardPointerMove(e, idx, it.instanceId)}>
        {it.quantidade > 1 && <span className="inv-card-qty">{it.quantidade}</span>}
        <span className="inv-card-head">
          <span className="inv-card-ic"><i className={'ti ' + invItemIcon(cat)} aria-hidden="true" /></span>
        </span>
        <span className="inv-cont-bar">
          <span style={{ width: pct + '%', background: liquido ? '#47aad8' : undefined }} />
        </span>
      </button>
    );
  };

  const renderItemCard = (it, cat, idx) => {
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
        }
        style={{ touchAction: 'none' }}
        onClick={() => onCardClick(it.instanceId)}
        onMouseEnter={(e) => abrirTipSafe(e, tipContent(it, cat))}
        onMouseLeave={fecharTip}
        onPointerDown={(e) => onCardPointerDown(e, idx, it.instanceId)}
        onPointerMove={(e) => onCardPointerMove(e, idx, it.instanceId)}>
        {it.quantidade > 1 && <span className="inv-card-qty">{it.quantidade}</span>}
        <span className="inv-card-head">
          <span className="inv-card-ic"><i className={'ti ' + invItemIcon(cat)} aria-hidden="true" /></span>
        </span>
        <span className="inv-card-pills">
          {cat?.magico && (
            <span className="inv-pill mag"><i className="ti ti-sparkle-highlight" aria-hidden="true" /></span>
          )}
          {cat?.tipo === 'L' && (
            <span className="inv-pill liq"><i className="ti ti-droplet" aria-hidden="true" /></span>
          )}
          {it.observacao && (
            <span className="inv-pill nor"><i className="ti ti-feather" aria-hidden="true" /></span>
          )}
        </span>
      </button>
    );
  };

  const renderCard = (it, idx) => {
    const cat = catalogoBySlug[it.slug];
    return ehContainer(cat)
      ? renderContainerCard(it, cat, idx)
      : renderItemCard(it, cat, idx);
  };

  if (itensVisiveis.length === 0) {
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
              <i className={'ti ' + (ICONE_POR_GRUPO[normalizar(g)] || 'ti-box')} aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="best-count">{itensFiltrados.length} de {itensVisiveis.length}</div>
      </div>

      {/* ── Grid flat com slots fantasmas (ref sempre montado para o ResizeObserver) ── */}
      {itensFiltrados.length === 0 ? (
        <div
          ref={setGridEl}
          className="inv-bag-grid inv-bag-grid--slots"
          style={{ gridTemplateColumns: `repeat(${cols}, 50px)` }}>
          {Array.from({ length: totalSlots }).map((_, i) => (
            <span key={'ghost-' + i} className="inv-slot-ghost" aria-hidden="true" />
          ))}
        </div>
      ) : (() => {
        // Garante múltiplo de cols e pelo menos totalSlots (calculado pelo ResizeObserver)
        const filled = itensFiltrados.length;
        const total  = Math.max(totalSlots, Math.ceil(Math.max(filled, 1) / cols) * cols);
        const ghosts = total - filled;
        return (
          <div
            ref={setGridEl}
            className="inv-bag-grid inv-bag-grid--slots"
            style={{ gridTemplateColumns: `repeat(${cols}, 50px)` }}>
            {itensFiltrados.map((it, idx) => renderCard(it, idx))}
            {Array.from({ length: ghosts }).map((_, i) => {
              // O inventário é uma lista COMPACTA (itens preenchem do início, sem
              // buracos). Qualquer célula vazia representa o mesmo destino: o FIM
              // da lista (índice = filled). Por isso todos os fantasmas recebem
              // data-slot-idx=filled e soltar em qualquer um move o item pro fim.
              // O realce visual, porém, fica só no 1º vazio (onde o item cairá).
              const isGhostTarget = i === 0 && overIdx === filled && drag && drag.fromIdx !== filled - 1;
              return (
                <span
                  key={'ghost-' + i}
                  data-slot-idx={filled}
                  className={'inv-slot-ghost' + (isGhostTarget ? ' inv-slot-ghost--drop-target' : '')}
                  aria-hidden="true"
                />
              );
            })}
          </div>
        );
      })()}

      {/* ── Fantasma que segue o cursor durante o arraste ── */}
      {drag && (() => {
        const it = itensFiltrados[drag.fromIdx];
        if (!it) return null;
        const cat = catalogoBySlug[it.slug];
        return ReactDOM.createPortal(
          <div
            className="inv-drag-ghost"
            style={{ left: drag.x, top: drag.y }}
            aria-hidden="true">
            <span className="inv-card-ic"><i className={'ti ' + invItemIcon(cat)} aria-hidden="true" /></span>
          </div>,
          document.body
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
// Rótulo amigável pros motivos de falha da RPC usar_pergaminho_magia.
function motivoAprenderLabel(motivo, en) {
  const map = {
    ja_possui_nivel:      en ? 'You already know this spell at this level or higher.' : 'Você já tem essa magia neste nível ou superior.',
    falta_nivel_anterior: en ? 'You must learn the previous level first.'            : 'Você precisa aprender o nível anterior primeiro.',
    pontos_insuficientes: en ? 'Not enough magic points.'                            : 'Pontos de magia insuficientes.',
    magia_nao_permitida:  en ? 'Your class cannot learn this spell.'                 : 'Sua profissão não pode aprender essa magia.',
    acima_do_estagio:     en ? "Spell level exceeds your character's stage."         : 'O nível da magia passa do seu estágio.',
    magia_nao_encontrada: en ? 'Spell not found in the catalog.'                     : 'Magia não encontrada no catálogo.',
    item_nao_eh_pergaminho: en ? 'This item is not a spell scroll.'                  : 'Este item não é um pergaminho de magia.',
    item_nao_encontrado:  en ? 'Scroll not found in your inventory.'                 : 'Pergaminho não encontrado no inventário.',
    nivel_magia_invalido: en ? 'Invalid spell level on the scroll.'                  : 'Nível de magia inválido no pergaminho.',
    pj_nao_encontrado:    en ? 'Character not found.'                                : 'Personagem não encontrado.',
    nao_autenticado:      en ? 'You are not signed in.'                              : 'Você não está autenticado.',
  };
  return map[motivo] || (en ? 'Could not learn the spell.' : 'Não foi possível aprender a magia.');
}

function DetalhesItemModal({
  instance, catalogoBySlug, raca, slotsState, todosItens,
  containersDisponiveis, pjsHistoria, lang,
  onClose, onEquipar, onDesequipar, onUsar, onPreparar, onAprenderMagia, onDestruir, onObservacao,
  onMoverParaContainer, onTransferir, transferError, onTransferReset,
  onVestir, onDespir,
  onRemoverDoContainer, onAbrirDetalhesFilho, contexto,
}) {
  const [confirmandoDestruir, setConfirmandoDestruir] = useState(false);
  const [confirmandoUsar, setConfirmandoUsar] = useState(false);
  const [confirmandoPreparar, setConfirmandoPreparar] = useState(false);
  const [aprendendo, setAprendendo] = useState(false);
  const [aprenderErro, setAprenderErro] = useState(null);
  const [mostrarArmazenar, setMostrarArmazenar] = useState(false);
  const [mostrarTransferir, setMostrarTransferir] = useState(false);
  const [transfPjId, setTransfPjId] = useState('');
  const [transferindo, setTransferindo] = useState(false);
  const [armazContId, setArmazContId] = useState('');
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
    setAprendendo(false);
    setAprenderErro(null);
    setMostrarArmazenar(false);
    setMostrarTransferir(false);
    setTransfPjId('');
    setArmazContId('');
  }, [instance?.instanceId]);

  if (!instance) return null;
  const cat = catalogoBySlug[instance.slug];
  if (!cat) return null;

  const categoria = cat.categoria_equip;
  // Joias/acessórios vestíveis usam o sistema de vestir; não mostrar botão Equipar.
  const equipavel = !!categoria && !ehVestimenta(cat);
  const consumivel = (cat.grupo === 'Consumíveis') || cat.tipo === 'L';
  // Animal preparável: grupo Animais com slug de resultado definido no catálogo.
  const ehAnimal = cat.grupo === 'Animais' && !!cat.consumiveis;
  // Pergaminho de magia: catálogo declara magia (key) + nivel_magia (nível efetivo).
  const ehPergaminhoMagia = !!(cat.magia && cat.nivel_magia != null);
  const isContainer = ehContainer(cat);
  // Pré-calcula conteúdo do container uma única vez; usado tanto para renderizar
  // det-container-content como para suprimir o espaçamento quando vazio/ausente.
  const containerData = isContainer ? capacidadeContainer(instance, todosItens, catalogoBySlug) : null;
  const hasContainerContent = !!(containerData?.filhos?.length);
  const temMultiplos = instance.quantidade > 1;

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
        if (livres < maosReq) bloqueioEquipar = en ? `Needs ${maosReq} free hand(s) (${livres} free).` : `Precisa de ${maosReq} mão(s) livre(s) (${livres} livre${livres === 1 ? '' : 's'}).`;
        else podeEquipar = true;
      }
    }
  }

  const handleContainerChange = (novoContainerId) => {
    onMoverParaContainer(instance.instanceId, novoContainerId || null);
  };

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

  return (
    <ModalShell
      title={<><i className={'ti ' + invItemIcon(cat) + ' det-title-ic'} aria-hidden="true" /> {cat.nome}</>}
      lang={lang}
      size="md"
      extraClass="modal-detalhes"
      onClose={onClose}
    >
        {/* ── Seção A: Atributos inline ──── */}
        {(cat.ocupa != null || cat.armazena != null || cat.efeito_positivo || cat.efeito_negativo || cat.magia || cat.nivel_magia != null || cat.dano || Number(cat.absorcao) > 0) && (
          <div className="det-sec-a">
            {cat.ocupa != null && (
              <span className="det-sec-chip">
                <span className="det-sec-ic-box det-sec-ic--ocupa">
                  <i className="ti ti-package-import" aria-hidden="true" />
                </span>
                <span className="det-sec-val">{fmtNum(cat.ocupa)}</span>
              </span>
            )}
            {cat.armazena != null && (
              <span className="det-sec-chip">
                <span className="det-sec-ic-box det-sec-ic--armazena">
                  <i className="ti ti-box" aria-hidden="true" />
                </span>
                <span className="det-sec-val">{fmtNum(cat.armazena)}</span>
              </span>
            )}
            {Number(cat.absorcao) > 0 && (
              <span className="det-sec-chip">
                <span className="det-sec-ic-box">
                  <i className="ti ti-shield-half" aria-hidden="true" />
                </span>
                <span className="det-sec-val">{cat.absorcao}</span>
              </span>
            )}
            {cat.dano && (
              <span className="det-sec-chip">
                <span className="det-sec-ic-box">
                  <i className="ti ti-sword" aria-hidden="true" />
                </span>
                <span className="det-sec-val">{cat.dano}</span>
              </span>
            )}
            {cat.efeito_positivo && (
              <span className="det-sec-chip">
                <span className="det-sec-ic-box det-sec-ic--pos">
                  <i className="ti ti-plus" aria-hidden="true" />
                </span>
                <span className="det-sec-val">{cat.efeito_positivo}</span>
              </span>
            )}
            {cat.efeito_negativo && (
              <span className="det-sec-chip">
                <span className="det-sec-ic-box det-sec-ic--neg">
                  <i className="ti ti-minus" aria-hidden="true" />
                </span>
                <span className="det-sec-val">{cat.efeito_negativo}</span>
              </span>
            )}
            {(cat.magia || cat.nivel_magia != null) && (
              <span className="det-sec-chip">
                <span className="det-sec-ic-box">
                  <i className="ti ti-sparkle" aria-hidden="true" />
                </span>
                {cat.magia && <span className="det-sec-val">{cat.magia} {cat.nivel_magia}</span>}
              </span>
            )}
          </div>
        )}

        {/* ── Linha divisória ──────────────────────────────────── */}
        {(cat.ocupa != null || cat.armazena != null || cat.efeito_positivo || cat.efeito_negativo || cat.magia || cat.nivel_magia != null || cat.dano || Number(cat.absorcao) > 0) &&
         (cat.descricao || cat.efeito) && (
          <hr className="det-sec-divider" />
        )}

        {/* ── Seção B: Descrição ───────────────────────────────── */}
        {(cat.descricao || cat.efeito) && (
          <div className="det-sec-b">
            <span className="det-sec-desc-val">
              {cat.descricao}
              {cat.descricao && cat.efeito ? ' ' : ''}
              {cat.efeito && <em>{en ? 'Effect' : 'Efeito'}: {cat.efeito}</em>}
            </span>
          </div>
        )}

        {/* ── Conteúdo do container ────────────────────────────── */}
        {/* Só renderiza quando há itens dentro; container vazio = sem bloco,
            sem espaçamento fantasma (o margin-top de det-actions abaixo fica 0). */}
        {hasContainerContent && (
          <div className="det-container-content">
            <div className="cont-list">
              {containerData.filhos.map((it) => {
                const fc = catalogoBySlug[it.slug];
                return (
                  <div key={it.instanceId} className="cont-row">
                    <div className="cont-row-info">
                      <span className="cont-row-nome">{fc?.nome || it.slug}{fc?.magico && ' ✦'}</span>
                      {it.quantidade > 1 && <span className="inv-card-qty">{it.quantidade}</span>}
                    </div>
                    <div className="cont-row-actions">
                      <button className="btn-icon btn-sm inv-act-btn" onClick={() => onAbrirDetalhesFilho?.(it.instanceId)}
                        title={en ? 'Details' : 'Detalhes'}
                        aria-label={en ? 'Details' : 'Detalhes'}>
                        <i className="ti ti-eye" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* (Armazenar em container agora é uma ação na lista abaixo) */}

        {/* ── Ações do item — Modelo C: lista descritiva ───────────── */}
        {/* margin-top só existe quando há conteúdo de container acima; caso
            contrário o espaçamento vem apenas do margin-bottom do det-sec-b. */}
        <div className="det-actions" style={!hasContainerContent ? { marginTop: 0 } : undefined}>
          {confirmandoDestruir ? (
            <div className="det-act-confirm">
              <div className="det-act-confirm-title">
                {en ? 'Destroy item' : 'Destruir item'}
              </div>
              <span className="det-act-confirm-lbl">
                {en ? 'Destroy this item permanently?' : 'Destruir este item permanentemente?'}
              </span>
              <div className="det-act-confirm-btns">
                <button className="btn-ghost" onClick={() => setConfirmandoDestruir(false)}>
                  {en ? 'Cancel' : 'Cancelar'}
                </button>
                <button className="btn-danger"
                  onClick={() => { onDestruir(instance.instanceId); onClose(); }}>
                  {en ? 'Yes, destroy' : 'Sim, destruir'}
                </button>
              </div>
            </div>
          ) : confirmandoUsar ? (
            <div className="det-act-confirm">
              <div className="det-act-confirm-title">
                {en ? 'Use item' : 'Usar item'}
              </div>
              <span className="det-act-confirm-lbl">
                {en ? 'Use this item?' : 'Usar este item?'}
              </span>
              <div className="det-act-confirm-btns">
                <button className="btn-ghost" onClick={() => setConfirmandoUsar(false)}>
                  {en ? 'Cancel' : 'Cancelar'}
                </button>
                <button className="btn-primary"
                  onClick={() => { onUsar(instance.instanceId); onClose(); }}>
                  {en ? 'Yes, use' : 'Sim, usar'}
                </button>
              </div>
            </div>
          ) : confirmandoPreparar ? (
            <div className="det-act-confirm">
              <div className="det-act-confirm-title">
                {en ? 'Prepare animal' : 'Preparar animal'}
              </div>
              <span className="det-act-confirm-lbl">
                {en
                  ? `Slaughter and process ${cat.nome}? You will receive ${cat.consumiveis_peso || 1}× ${cat.consumiveis}.`
                  : `Abater e preparar ${cat.nome}? Você receberá ${cat.consumiveis_peso || 1}× ${cat.consumiveis}.`}
              </span>
              <div className="det-act-confirm-btns">
                <button className="btn-ghost" onClick={() => setConfirmandoPreparar(false)}>
                  {en ? 'Cancel' : 'Cancelar'}
                </button>
                <button className="btn-primary"
                  onClick={() => { onPreparar(instance.instanceId); onClose(); }}>
                  {en ? 'Yes, prepare' : 'Sim, preparar'}
                </button>
              </div>
            </div>
          ) : mostrarTransferir ? (
            <div className="det-transf">
              <select
                id={`transf-${instance.instanceId}`}
                value={transfPjId}
                onChange={(e) => { setTransfPjId(e.target.value); onTransferReset && onTransferReset(); }}>
                <option value=""></option>
                {(pjsHistoria || []).map((pj) => (
                  <option key={pj.id} value={pj.id}>
                    {pj.nome} {pj.sobrenome || ''} ({pj.raca} · {pj.profissao})
                  </option>
                ))}
              </select>
              {transferError && <div className="transf-error">{transferError}</div>}
              <div className="det-act-confirm-btns">
                <button className="btn-ghost" disabled={transferindo}
                  onClick={() => { setMostrarTransferir(false); setTransfPjId(''); onTransferReset && onTransferReset(); }}>
                  {en ? 'Cancel' : 'Cancelar'}
                </button>
                <button className="btn-primary" disabled={transferindo || !transfPjId}
                  onClick={async () => {
                    setTransferindo(true);
                    const res = await onTransferir(transfPjId);
                    setTransferindo(false);
                    if (res?.ok) onClose();   // item saiu do inventário deste PJ
                  }}>
                  {transferindo ? (en ? 'Sending…' : 'Enviando…') : (en ? 'Confirm' : 'Confirmar')}
                </button>
              </div>
            </div>
          ) : mostrarArmazenar ? (
            <div className="det-armazenar">
              <select
                id={`cont-${instance.instanceId}`}
                value={armazContId}
                onChange={(e) => setArmazContId(e.target.value)}>
                <option value=""></option>
                {opcoesContainer.map((c) => {
                  const cc = catalogoBySlug[c.slug];
                  const { usado, armazena: cap } = capacidadeContainer(c, todosItens, catalogoBySlug);
                  return (
                    <option key={c.instanceId} value={c.instanceId}>
                      {cc?.nome || c.slug} ({used(usado, cap)})
                    </option>
                  );
                })}
              </select>
              <div className="det-act-confirm-btns">
                <button className="btn-ghost"
                  onClick={() => { setMostrarArmazenar(false); setArmazContId(''); }}>
                  {en ? 'Cancel' : 'Cancelar'}
                </button>
                <button className="btn-primary" disabled={!armazContId}
                  onClick={() => {
                    handleContainerChange(armazContId);
                    setMostrarArmazenar(false);
                    setArmazContId('');
                  }}>
                  {en ? 'Confirm' : 'Confirmar'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Botões — todos na mesma linha, proporcionais; Descartar entra no final */}
              <div className="det-act-row">
                {/* Equipar / Desequipar / Usar */}
                {acoesPesadas && equipavel && (
                  instance.equipado ? (
                    <button className="btn-primary"
                      onClick={() => onDesequipar(instance.instanceId)}>
                      {en ? 'Unequip' : 'Desequipar'}
                    </button>
                  ) : (
                    <button className="btn-primary"
                      disabled={!podeEquipar}
                      onClick={() => onEquipar(instance.instanceId)}
                      title={bloqueioEquipar || ''}>
                      {en ? 'Equip' : 'Equipar'}
                    </button>
                  )
                )}
                {consumivel && !equipavel && !isContainer && !ehPergaminhoMagia && (
                  <button className="btn-primary"
                    onClick={() => {
                      if (temMultiplos) onUsar(instance.instanceId);
                      else setConfirmandoUsar(true);
                    }}>
                    {en ? 'Use' : 'Usar'}
                  </button>
                )}
                {acoesPesadas && ehAnimal && onPreparar && (
                  <button className="btn-primary"
                    onClick={() => setConfirmandoPreparar(true)}>
                    {en ? 'Prepare' : 'Preparar'}
                  </button>
                )}
                {acoesPesadas && ehPergaminhoMagia && onAprenderMagia && (
                  <button className="btn-primary"
                    disabled={aprendendo}
                    onClick={async () => {
                      setAprendendo(true);
                      setAprenderErro(null);
                      const r = await onAprenderMagia(instance.instanceId);
                      if (r?.ok) { onClose(); return; }
                      setAprendendo(false);
                      setAprenderErro(motivoAprenderLabel(r?.motivo, en));
                    }}>
                    {aprendendo ? (en ? 'Learning…' : 'Aprendendo…') : (en ? 'Learn' : 'Aprender')}
                  </button>
                )}

                {/* Vestir / Despir */}
                {acoesPesadas && vestivel && (
                  instance.vestido ? (
                    <button className="btn-primary"
                      onClick={() => onDespir(instance.instanceId)}>
                      {en ? 'Take off' : 'Despir'}
                    </button>
                  ) : (
                    <button className="btn-primary"
                      disabled={!podeVestir}
                      onClick={() => onVestir(instance.instanceId)}
                      title={bloqueioVestir || ''}>
                      {en ? 'Wear' : 'Vestir'}
                    </button>
                  )
                )}

                {/* Transferir */}
                {acoesPesadas && pjsHistoria.length > 0 && !instance.vestido && (
                  <button className="btn-ghost" onClick={() => { onTransferReset && onTransferReset(); setMostrarTransferir(true); }}>
                    {en ? 'Transfer' : 'Transferir'}
                  </button>
                )}

                {/* Armazenar em */}
                {acoesPesadas && !isContainer && !instance.equipado && !instance.vestido && (
                  <button className="btn-ghost"
                    disabled={!temOndeArmazenar}
                    onClick={() => setMostrarArmazenar(true)}
                    title={!temOndeArmazenar
                      ? (en ? 'No compatible container in inventory' : 'Nenhum recipiente compatível no inventário')
                      : ''}>
                    {en ? 'Store' : 'Armazenar'}
                  </button>
                )}

                {/* Descartar — mesma linha dos demais botões */}
                <button className="btn-danger"
                  onClick={() => {
                    if (temMultiplos) onDestruir(instance.instanceId);
                    else setConfirmandoDestruir(true);
                  }}>
                  {en ? 'Descart' : 'Descartar'}
                </button>
              </div>

              {aprenderErro && (
                <div className="err-msg" style={{ marginTop: 10 }}>{aprenderErro}</div>
              )}
            </>
          )}
        </div>

    </ModalShell>
  );
}
// Helper de exibição: "2.0/10"
function used(usado, cap) { return `${fmtNum(usado)}/${fmtNum(cap)}`; }

// ── ContainerModal (Fase 3) ──────────────────────────────────────────────────
function ContainerModal({ containerInst, catalogoBySlug, todosItens, lang, onClose, onRemoverDoContainer, onAbrirDetalhes }) {
  const en = lang === 'en';
  const cat = catalogoBySlug[containerInst?.slug];
  const { armazena, usado, livre, tipoAceito, filhos } = capacidadeContainer(containerInst, todosItens, catalogoBySlug);
  const pct = armazena > 0 ? Math.min(100, (usado / armazena) * 100) : 0;
  const tipoLabel = tipoAceito === 'L'
    ? (en ? 'liquids' : 'líquidos')
    : (en ? 'solids' : 'sólidos');

  // Escape e travamento de scroll já são responsabilidade do ModalShell — não duplicar aqui.

  return (
    <ModalShell
      title={<><i className={'ti ' + invItemIcon(cat) + ' det-title-ic'} aria-hidden="true" /> {cat?.nome || containerInst?.slug}</>}
      lang={lang}
      size="md"
      extraClass="modal-detalhes"
      onClose={onClose}
    >
        <div className="det-desc">
          {cat.descricao}
        </div>

        {/* Lista de itens dentro */}

        <div className="cont-list">
          {filhos.map((it) => {
            const fc = catalogoBySlug[it.slug];
            const ocupa = Number(fc?.ocupa || 0) * it.quantidade;
            const presoNoContainer = fc?.grupo === 'Consumíveis' || fc?.grupo === 'Moedas';
            return (
              <div key={it.instanceId} className="cont-row">
                <div className="cont-row-info">
                  <span className="cont-row-nome">{fc?.nome || it.slug}{fc?.magico && ' ✦'}</span>
                  {it.quantidade > 1 && <span className="inv-card-qty">×{it.quantidade}</span>}
                </div>
                <div className="cont-row-actions">
                  {onAbrirDetalhes && (
                  <button className="btn-icon btn-sm inv-act-btn" onClick={() => onAbrirDetalhes(it.instanceId)}
                    title={en ? 'Details' : 'Detalhes'}
                    aria-label={en ? 'Details' : 'Detalhes'}>
                    <i className="ti ti-eye" aria-hidden="true" />
                  </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

    </ModalShell>
  );
}

// ── QuantidadeModal ──────────────────────────────────────────────────────────
// Pergunta quanto aplicar de uma ação (usar/destruir/mover) quando há mais de 1
// em estoque. Stepper pill (−/valor/+) + chips de preset + aviso irreversível.
function QuantidadeModal({ titulo, max, lang, onConfirm, onCancel }) {
  const [qtd, setQtd] = useState(1);
  const en = lang === 'en';
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Enter') onConfirm(qtd); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [qtd, onConfirm]);

  const dec = () => setQtd((q) => Math.max(1, q - 1));
  const inc = () => setQtd((q) => Math.min(max, q + 1));
  const bump = (n) => setQtd((q) => Math.min(max, Math.max(1, q + n)));

  // Presets: valores fixos que façam sentido dentro do range disponível
  const RAW_PRESETS = [1, 2, 5, 10, 15];
  const presets = RAW_PRESETS.filter((n) => n <= max && n !== qtd);

  const pillStyle = {
    background: 'rgba(24,17,8,0.92)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(106,85,48,0.50)', borderRadius: 999, height: 40,
    display: 'flex', alignItems: 'center', gap: 4, padding: '0 4px', width: '100%',
  };
  const btnStyle = (enabled) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, flexShrink: 0, borderRadius: '50%', border: 'none',
    background: 'transparent', color: enabled ? '#C9A44E' : 'rgba(201,164,78,0.30)',
    cursor: enabled ? 'pointer' : 'default', transition: 'background .15s',
  });

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
      <p style={{
        fontFamily: "'Lora', serif", fontSize: 13, fontStyle: 'italic',
        color: 'var(--parchment-muted, #9C8F73)', marginBottom: 14,
      }}>
        {en ? 'Caution, this action is irreversible.' : 'Cuidado, essa ação é irreversível.'}
      </p>

      {/* stepper pill */}
      <div style={pillStyle}>
        <button type="button" style={btnStyle(qtd > 1)} disabled={qtd <= 1}
          onMouseDown={(e) => e.preventDefault()} onClick={dec} aria-label="-"
          onMouseEnter={(e) => { if (qtd > 1) e.currentTarget.style.background = 'rgba(201,164,78,0.16)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
          <i className="ti ti-minus" aria-hidden="true" style={{ fontSize: 14 }} />
        </button>
        <span style={{ flex: '1 1 auto', textAlign: 'center', fontFamily: "'Lora', serif", fontSize: 13, color: '#E8DDC6', fontVariantNumeric: 'tabular-nums' }}>
          {qtd} <span style={{ color: 'var(--parchment-muted, #9C8F73)', fontSize: 12 }}>{en ? `of ${max}` : `de ${max}`}</span>
        </span>
        <button type="button" style={btnStyle(qtd < max)} disabled={qtd >= max}
          onMouseDown={(e) => e.preventDefault()} onClick={inc} aria-label="+"
          onMouseEnter={(e) => { if (qtd < max) e.currentTarget.style.background = 'rgba(201,164,78,0.16)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
          <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: 14 }} />
        </button>
      </div>

      {/* chips de preset */}
      {presets.length > 0 && (
        <div className="delta-stepper-chips" style={{ marginTop: 8 }}>
          {presets.map((n) => (
            <button type="button" key={n} className="delta-chip" onClick={() => setQtd(n)}>
              {n}
            </button>
          ))}
          {/* botão de máximo */}
          {qtd < max && (
            <button type="button" className="delta-chip" onClick={() => setQtd(max)}>
              {en ? 'Max' : 'Máx'}
            </button>
          )}
          {/* zerar para 1 */}
          <button type="button" className="delta-chip delta-chip--reset" onClick={() => setQtd(1)} disabled={qtd <= 1} aria-label={en ? 'Reset' : 'Zerar'}>
            <i className="ti ti-rotate" aria-hidden="true" />
          </button>
        </div>
      )}
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
      color: #C9A44E;
      font-size: 22px;
    }
    .inv-drag-ghost .inv-card-ic { display: flex; }
  `;
  document.head.appendChild(style);
})();

Object.assign(window, {
  InventarioList, EquipadoBoard, VestesBoard, CofreMoedas, MoedasBoard, MoedaPills,
  CabecalhoInvLoja, InvItemsTable, DetStat, DetalhesItemModal, ContainerModal, QuantidadeModal,
  // ↓ expostos para a Loja (07-inventario/loja.jsx) consumir via window:
  fmtNum, calcCarga, invItemIcon, recipienteAceitaSlug, usePortalTooltip, PortalTooltip,
  useGridDimensions,
});