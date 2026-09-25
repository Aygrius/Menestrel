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
  // Cintura: 3 casas, como na ficha (cinto + alforge + algibeira…). Era 1, e
  // com um cinto vestido o alforge dava "Slot cheio" (13/09/2026).
  cintura: { max: 3,  gastaSlot: true  }, // Cintura
  /* 16/09/2026: o mapa do corpo na ficha tem DUAS casas de brinco e QUATRO de
     joia, mas aqui o teto era 1 e 2 — o segundo brinco e o terceiro anel
     nasciam com "Vestir" desabilitado por "slot cheio". Os números agora
     acompanham as casas que a ficha desenha. */
  orelha:  { max: 2,  gastaSlot: true  }, // Brincos (2 orelhas)
  brinco:  { max: 2,  gastaSlot: true  }, // alias de orelha (categoria_equip do banco)
  pescoco: { max: 1,  gastaSlot: false }, // Colar (pescoço)
  colar:   { max: 1,  gastaSlot: false }, // alias de pescoco (categoria_equip do banco)
  joia:    { max: 4,  gastaSlot: false }, // Joias (4 dedos)
};

// O slot da peça vem do catálogo (cat.slot_equip). O banco grava alguns com
// outro nome (13/09/2026 — Aldren não vestia a capa: as capas vêm 'costas' e
// a região aqui é 'capa'). Traduz para a chave de VESTE_SLOTS e da ficha.
const VESTE_SLOT_ALIAS = { costas: 'capa', corpo: 'roupa', orelhas: 'orelha', dedos: 'joia', cinto: 'cintura' };
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
// magias + experiencia (13/09/2026): o botão "Aprender" do pergaminho precisa
// saber se o PJ já tem o nível, se falta o anterior e o estágio — ver
// bloqueioPergaminho.
const PJ_COLS = 'id,nome,sobrenome,raca,profissao,forca_base,fisico_base,inventario,estado_atual,magias,experiencia,especializacao';

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
  // Fase 3
  const [pjsHistoria, setPjsHistoria] = useState([]);
  const [containerAberto, setContainerAberto] = useState(null); // instanceId
  const [transferError, setTransferError] = useState(null);
  // Ação pendente que aguarda escolha de quantidade no QuantidadeModal
  // formato: { tipo: 'usar'|'destruir'|'mover', instanceId, max, extra? }
  const [acaoPendente, setAcaoPendente] = useState(null);
  /* Catálogo ENXUTO de magias (13/09/2026): só o que o botão "Aprender" do
     pergaminho precisa para dizer no tooltip por que não dá — custo (pontos) e
     permissão (profissão/especialização). Falhar aqui não trava o inventário:
     sem a lista, esses dois motivos ficam só com a RPC, como antes.
     Descrição e texto dos níveis (13/09/2026): a janela do pergaminho mostra
     o que a magia faz. */
  const [magiasDb, setMagiasDb] = useState(null);
  useEffect(() => {
    let vivo = true;
    Promise.resolve(supabaseClient.from('magias').select('key,nome,custo,permissao,tipo,descricao,nivel_1,nivel_3,nivel_5,nivel_7,nivel_9'))
      .then((res) => { if (vivo && res && !res.error && Array.isArray(res.data)) setMagiasDb(res.data); })
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
  // Criaturas marcadas como montaria (criaturas.montaria, 14/09/2026). O animal
  // do inventário é montável quando o NOME casa com uma delas (criaturaDoItem).
  const criaturasMontaria = useCriaturasMontaria();
  // True quando auth.uid() === currentUserId, ou seja, o usuário logado
  // é o dono dos PJs listados. False quando um Mestre está vendo o inventário
  // de outro jogador — nesse caso a RPC usar_pergaminho_magia falha (auth.uid()
  // ≠ user_id do PJ), então o botão "Aprender" deve ficar oculto.
  const [authUserIsOwner, setAuthUserIsOwner] = useState(false);

  /* Venda (13/09/2026): negociações ABERTAS deste PJ — o botão do item vira
     "Negociação" — e qual item está com o VendaModal aberto. Quando o Mestre
     aceita, o Realtime avisa e o inventário é relido do banco: o item saiu e
     as moedas entraram no servidor, e a cópia local (que o autosave grava)
     não pode continuar com o retrato velho. */
  const [vendasAbertas, setVendasAbertas] = useState([]);
  const [vendaInstanceId, setVendaInstanceId] = useState(null);
  const carregarVendasAbertas = React.useCallback(async (pjId) => {
    try {
      const res = await supabaseClient.from('vendas_item').select('id,instance_id,status,vez')
        .eq('pj_id', pjId).eq('status', 'aberta');
      setVendasAbertas(res && !res.error && Array.isArray(res.data) ? res.data : []);
    } catch (_) { setVendasAbertas([]); }
  }, []);
  useEffect(() => {
    if (!selectedId) { setVendasAbertas([]); return undefined; }
    carregarVendasAbertas(selectedId);
    if (typeof supabaseClient.channel !== 'function') return undefined;
    const ch = supabaseClient
      .channel('vendas_pj_' + selectedId + '_' + Math.random().toString(36).slice(2, 8))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas_item', filter: 'pj_id=eq.' + selectedId },
        (payload) => {
          carregarVendasAbertas(selectedId);
          if (payload && payload.new && payload.new.status === 'aceita') recarregarInventario();
        })
      .subscribe();
    return () => { supabaseClient.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

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
    const inventario = pj.inventario || { moedas: { ouro: 0, prata: 0, cobre: 0, latao: 0 }, itens: [] };
    if (!inventario.moedas) inventario.moedas = { ouro: 0, prata: 0, cobre: 0, latao: 0 };
    if (!Array.isArray(inventario.itens)) inventario.itens = [];
    setInv(inventario);
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
  useEffect(() => () => {
    if (estadoDirtyRef.current && estadoRef.current && selRef.current) {
      gravarEstadoAtual(selRef.current, patchDeEstado(estadoBaseRef.current, estadoRef.current));
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
      const nomePj = pjAtual ? [pjAtual.nome, pjAtual.sobrenome].filter(Boolean).join(' ') : null;
      if (nomePj) {
        const texto = lang === 'en' ? `${nomePj} used ${cat.nome}` : `${nomePj} usou ${cat.nome}.`;
        registrarEventoMesa('item', texto, { item: cat.nome, quantidade, instanceId });
      }
    }
  };

  // Nome do PJ selecionado — usado nos textos do log da mesa.
  const nomeDoPjSelecionado = () => {
    const pjAtual = (pjs || []).find((p) => p.id === selectedId);
    return pjAtual ? [pjAtual.nome, pjAtual.sobrenome].filter(Boolean).join(' ') : null;
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
      return 'feito';
    }
    setAcaoPendente({ tipo: 'mover', instanceId, max: maxPossivel, extra: { containerId } });
    return 'pendente';   // a janela do item fecha quando a quantidade for confirmada
  };

  // Transferir com pilha > 1: pergunta quantidade (mesmo padrão das outras
  // três ações acima). Devolve uma Promise porque o botão "Confirmar" do
  // modal de transferência (DetalhesItemModal) já esperava uma Promise de
  // transferirItem pra saber quando fechar — aqui ela só demora mais a
  // resolver, até o usuário confirmar (ou cancelar) o QuantidadeModal que
  // aparece por cima. Item avulso (quantidade 1) transfere direto, sem
  // seletor a mais — coerente com usar/destruir/mover.
  const solicitarTransferir = (instanceId, pjDestinoId, qtd) => {
    const it = inv?.itens.find((x) => x.instanceId === instanceId);
    if (!it || it.quantidade <= 1) return transferirItem(instanceId, pjDestinoId, null);
    // Quantidade escolhida no seletor da própria janela: vai direto.
    if (qtd != null) return transferirItem(instanceId, pjDestinoId, null, qtd);
    return new Promise((resolve) => {
      setAcaoPendente({ tipo: 'transferir', instanceId, max: it.quantidade, extra: { pjDestinoId, resolve } });
    });
  };

  // Executa a ação que estava aguardando escolha de quantidade
  const executarAcaoPendente = async (qtd) => {
    if (!acaoPendente) return;
    const { tipo, instanceId, extra } = acaoPendente;
    if (tipo === 'usar')     usarItem(instanceId, qtd);
    if (tipo === 'destruir') destruirItem(instanceId, qtd);
    if (tipo === 'mover')    moverParaContainer(instanceId, extra?.containerId ?? null, qtd);
    if (tipo === 'transferir') {
      // O botão "Confirmar" do modal de transferência (DetalhesItemModal)
      // está com uma Promise pendurada em extra.resolve — resolve ela agora
      // pra ele saber se pode fechar (res.ok) ou ficar mostrando o erro.
      const res = await transferirItem(instanceId, extra?.pjDestinoId, null, qtd);
      extra?.resolve?.(res);
      setAcaoPendente(null);
      if (res?.ok) setDetalhesId(null);
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
      // Atualizar inv local do PJ remetente
      const pjAtual = pjsAtualizados.find((p) => p.id === selectedId);
      if (pjAtual) setInv(pjAtual.inventario);
    }
    return { ok: true };
  };

  // Relê os PJs e o inventário do selecionado — depois de uma mudança feita no
  // servidor (venda aceita).
  const recarregarInventario = async () => {
    const { data: pjsAtualizados } = await supabaseClient
      .from('personagens')
      .select(PJ_COLS)
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: true });
    if (pjsAtualizados) {
      setPjs(pjsAtualizados);
      const pjAtual = pjsAtualizados.find((p) => p.id === selRef.current);
      if (pjAtual) setInv(pjAtual.inventario);
    }
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
      .select(PJ_COLS)
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
                // Equipados/vestidos agora aparecem no grid visível junto com o
                // resto (mesma regra de itensVisiveis em InvItemsTable) — só o
                // que está dentro de container fica de fora (tratamento próprio
                // no ContainerModal).
                const visivelSet = new Set(
                  prev.itens
                    .filter((it) => !it.containerId)
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
          onPrepararCarne={prepararCarneAcao}
          criaturaMontaria={criaturaDoItem(catalogoBySlug[instanceDetalhes.slug], criaturasMontaria)}
          onMontar={montar}
          onDesmontar={desmontar}
          onAprenderMagia={authUserIsOwner ? aprenderMagiaPergaminho : undefined}
          pjAprendiz={(pjs || []).find((x) => x.id === selectedId) || null}
          magiasDb={magiasDb}
          vendaAberta={vendasAbertas.some((v) => v.instance_id === instanceDetalhes.instanceId)}
          podeVender={{ ehDono: authUserIsOwner, historiaId }}
          onVender={(id) => { setDetalhesId(null); setVendaInstanceId(id); }}
          onDestruir={solicitarDestruir}
          onObservacao={setObservacao}
          onBonus={isMestre ? ajustarBonus : undefined}
          onMoverParaContainer={solicitarMover}
          onTransferir={(pjDestinoId, qtd) => solicitarTransferir(instanceDetalhes.instanceId, pjDestinoId, qtd)}
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

      {vendaInstanceId && (() => {
        const it = inv?.itens.find((x) => x.instanceId === vendaInstanceId);
        const aberta = vendasAbertas.find((v) => v.instance_id === vendaInstanceId);
        if (!it && !aberta) return null;
        return (
          <VendaModal
            lang={lang}
            papel={authUserIsOwner ? 'jogador' : 'mestre'}
            pjId={selectedId}
            instance={it || null}
            cat={it ? catalogoBySlug[it.slug] : null}
            vendaId={aberta ? aberta.id : null}
            onClose={() => { setVendaInstanceId(null); carregarVendasAbertas(selectedId); }}
            onConcluida={() => { recarregarInventario(); carregarVendasAbertas(selectedId); }}
          />
        );
      })()}

      {acaoPendente && (() => {
        const it = inv?.itens.find((x) => x.instanceId === acaoPendente.instanceId);
        const cat = it ? catalogoBySlug[it.slug] : null;
        const nome = cat?.nome || it?.slug || '';
        const titulosPt = {
          usar:       `Usar ${nome}`,
          destruir:   `Destruir ${nome}`,
          mover:      acaoPendente.extra?.containerId
            ? `Armazenar ${nome}`
            : `Retirar ${nome}`,
          transferir: `Transferir ${nome}`,
        };
        const titulosEn = {
          usar:       `Use ${nome}`,
          destruir:   `Destroy ${nome}`,
          mover:      acaoPendente.extra?.containerId
            ? `Store ${nome}`
            : `Take out ${nome}`,
          transferir: `Transfer ${nome}`,
        };
        const t = (lang === 'en' ? titulosEn : titulosPt)[acaoPendente.tipo];
        return (
          <QuantidadeModal
            titulo={t}
            max={acaoPendente.max}
            lang={lang}
            irreversivel={acaoPendente.tipo === 'usar' || acaoPendente.tipo === 'destruir'}
            onConfirm={executarAcaoPendente}
            onCancel={() => {
              // Cancelar transferência resolve a Promise pendente com ok:false —
              // senão o botão "Confirmar" do det-transf (DetalhesItemModal) fica
              // com "Enviando…" preso pra sempre, esperando uma Promise que nunca ia terminar.
              if (acaoPendente.tipo === 'transferir') acaoPendente.extra?.resolve?.({ ok: false });
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

  // Equipados (it.slot) e vestidos (it.vestido) aparecem aqui junto com o
  // resto da bolsa — só o que está DENTRO de um container some daqui (tem
  // tela própria, o ContainerModal). O pill "eq"/"vst" no card (ver
  // renderItemCard/renderContainerCard) é o que distingue visualmente.
  const itensVisiveis = (itens || []).filter((it) => !it.containerId);

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

  // Itens filtrados pela busca + chip de grupo, com os EM USO na frente
  // (pedido do usuário, 11/09/2026). Equipado e vestido contam igual — é a
  // mesma distinção que o selo E faz.
  //
  // A ordenação é ESTÁVEL (sort só compara o par em-uso/solto): dentro de
  // cada bloco a ordem manual que o jogador arrastou continua valendo, e é
  // ela que commitReorder persiste.
  const itensFiltrados = useMemo(() => {
    const visiveis = itensVisiveis.filter((it) => {
      const cat = catalogoBySlug[it.slug];
      const g = cat?.grupo || (en ? 'Other' : 'Outros');
      if (grupoSel && g !== grupoSel) return false;
      // Nome E descrição (24/09/2026) — ver itemCasaBusca.
      if (q && !itemCasaBusca(cat, q, it.slug)) return false;
      return true;
    });
    const emUso = (it) => (it.slot || it.vestido) ? 0 : 1;
    return visiveis.slice().sort((a, b) => emUso(a) - emUso(b));
  }, [itensVisiveis, catalogoBySlug, grupoSel, q, en]);

  // Mantém a ref sempre atualizada para o commitReorder ler sem closure stale.
  itensFiltradosRef.current = itensFiltrados;

  // Monta o content do tooltip para um item/container.
  // Mostra apenas o NOME do item (a descrição vive no modal de detalhes).
  const tipContent = (it, cat) => {
    const b = bonusDoItem(it);
    return { title: cat ? (b > 0 ? `${cat.nome} +${b}` : cat.nome) : `(? ${it.slug})` };
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
        {/* Container vestido (ex.: cinto) também entra no grid — mesmo pill de "em uso". */}
        {(it.slot || it.vestido) && (
          <span className="inv-card-pills">
            {(it.slot || it.vestido) && <span className="inv-pill eq" role="img" aria-label={en ? 'Equipped' : 'Equipado'}><i className="ti ti-letter-e-small" aria-hidden="true" /></span>}
          </span>
        )}
        <span className="inv-cont-bar">
          <span style={{ width: pct + '%', background: liquido ? '#47aad8' : undefined }} />
        </span>
      </button>
    );
  };

  const renderItemCard = (it, cat, idx) => {
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
        {/* A faísca é IRMÃ de .inv-card-pills, não filha.

            Estava dentro, e como .inv-card-pills é `position: absolute`, ela
            virava o contexto de posicionamento: a faísca se ancorava no
            container dos selos em vez do card, e caía por cima do E. Fora
            dele, o `right: 3px` passa a valer contra o card, que é o canto
            oposto onde ela deveria estar. */}
        {cat?.magico && (
          <span className="inv-faisca" role="img" aria-label={en ? 'Magic' : 'Mágico'}>
            <i className="ti ti-sparkles" aria-hidden="true" />
          </span>
        )}
        <span className="inv-card-pills">
          {cat?.tipo === 'L' && (
            <span className="inv-pill liq"><i className="ti ti-droplet" aria-hidden="true" /></span>
          )}
          {it.observacao && (
            <span className="inv-pill nor"><i className="ti ti-feather" aria-hidden="true" /></span>
          )}
          {/* Equipado (arma/armadura no slot) e vestido (roupa) agora aparecem
              no mesmo grid da bolsa — este pill é o que distingue de um item
              solto. Mesmos glifos do EquipadoBoard/VestesBoard (ti-shield/ti-shirt). */}
          {/* Um selo só: E de "em uso", para equipado E para vestido
              (pedido do usuário, 11/09/2026 — "visualmente não faz
              diferença"). A distinção entre arma no slot e roupa vestida
              continua existindo nos dados e no modal; no grid ela não
              ajudava a decidir nada e gastava um segundo glifo. */}
          {(it.slot || it.vestido) && (
            <span className="inv-pill eq" role="img" aria-label={en ? 'Equipped' : 'Equipado'}><i className="ti ti-letter-e-small" aria-hidden="true" /></span>
          )}
          {/* Montaria em uso (14/09/2026) — mesmo selo dourado do "em uso". */}
          {it.montado && (
            <span className="inv-pill eq" role="img" aria-label={en ? 'Mounted' : 'Montado'}><i className="ti ti-horse" aria-hidden="true" /></span>
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
        {resMax > 0 && (
          <span className="inv-res-bar" data-baixa={resPct <= 25 ? 2 : (resPct <= 50 ? 1 : 0)}
            role="img"
            aria-label={`${en ? 'Durability' : 'Resistência'}: ${resAtual}/${resMax}`}>
            <span style={{ width: resPct + '%' }} />
          </span>
        )}
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
/* ── O pergaminho ainda ensina algo a ESTE personagem? (13/09/2026) ──
   "Depois que a magia é aprendida, qual é o comportamento do item? Acho que o
   botão de aprender deve ficar bloqueado." (usuário)

   A RPC usar_pergaminho_magia é quem decide de verdade, e consome o
   pergaminho quando ensina. Mas ela só respondia DEPOIS do clique — o botão
   ficava ativo num pergaminho que não tinha mais o que ensinar (Galadar
   carrega "Pergaminho Oferenda 1" e já sabe Oferenda 1). Aqui a tela
   antecipa as três recusas que dá pra saber sem ir ao banco, com os MESMOS
   motivos da RPC:

     ja_possui_nivel       o PJ já tem este nível ou maior;
     falta_nivel_anterior  cada nível exige o anterior (nível 3 pede o 1);
     acima_do_estagio      o nível do pergaminho passa do estágio do PJ.

   Desde 13/09/2026 ("independente da situação, o botão deve aparecer. No
   tooltip você informa porque não é possível aprender"), o botão aparece em
   TODO pergaminho, e a tela antecipa também permissão e pontos — com o
   catálogo enxuto de magias (`magiasDb`) e as mesmas contas da ficha
   (podeAcessarMagia, pontosMagiasTotal, gastoMagias), que são as da RPC.

   Devolve null (pode aprender) ou { motivo, ...números para o tooltip }.
   A ORDEM é a de uma pergunta de cada vez, a mais decisiva primeiro:

     aprender_no_inventario  a janela está na ficha, onde não se aprende;
     nao_e_dono              só o dono do personagem aprende (a RPC exige);
     magia_nao_encontrada    o nome no item não existe no catálogo;
     ja_possui_nivel         já tem este nível ou maior;
     magia_nao_permitida     outra profissão/especialização;
     falta_nivel_anterior    o nível 3 pede o 1, e assim por diante;
     acima_do_estagio        o nível passa do estágio;
     pontos_insuficientes    { faltam, gasto, total }.

   A chave sai do NOME, pela mesma regra do catálogo (a key deriva do nome
   em todas as magias desde scripts/sql/magias-key-alinha-nome.sql). */
function chaveDaMagiaPorNome(nome) {
  return String(nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
/* Pergaminho de magia = CONSUMÍVEL com magia + nível (13/09/2026).
   Antes bastava ter magia e nível, mas ~50 itens mágicos guardam assim a magia
   que CARREGAM (Livro das Revelações, anéis, armas, o Alaúde…) — são para usar,
   não para aprender, e ganhavam o botão "Aprender". No catálogo, os 286
   pergaminhos são exatamente os Consumíveis com magia. A RPC
   usar_pergaminho_magia tem a mesma trava (scripts/sql/pergaminho-so-consumivel.sql). */
function ehPergaminhoDeMagia(cat) {
  return !!(cat && cat.magia && cat.nivel_magia != null && cat.grupo === 'Consumíveis');
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
  return (Array.isArray(itens) ? itens : []).map((instancia) => {
    const cat = catalogoBySlug && catalogoBySlug[instancia.slug];
    const criatura = cat && cat.criatura_id != null ? mapa[cat.criatura_id] : null;
    return criatura ? { instancia, cat, criatura } : null;
  }).filter(Boolean);
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

function bloqueioPergaminho(cat, pj, opcoes) {
  if (!ehPergaminhoDeMagia(cat)) return null;
  const op = opcoes || {};
  if (op.noInventario === false) return { motivo: 'aprender_no_inventario' };
  if (op.podeAprender === false) return { motivo: 'nao_e_dono' };
  if (!pj) return null;
  const nivel = Number(cat.nivel_magia);
  if (![1, 3, 5, 7, 9].includes(nivel)) return null;   // a RPC explica
  const key = chaveDaMagiaPorNome(cat.magia);
  const lista = Array.isArray(op.magiasDb) ? op.magiasDb : null;
  const magia = magiaDoItem(cat, lista);
  if (lista && lista.length && !magia) return { motivo: 'magia_nao_encontrada' };
  const keyReal = magia ? magia.key : key;

  const passosAlvo = (nivel + 1) / 2;
  const passosAtual = Number((pj.magias || {})[keyReal]) || 0;
  if (passosAtual >= passosAlvo) return { motivo: 'ja_possui_nivel' };

  const g = (nome) => ((typeof window !== 'undefined' && window[nome]) || null);
  const _podeAcessar = g('podeAcessarMagia');
  if (magia && _podeAcessar && !_podeAcessar(magia, pj.profissao, pj.especializacao || null)) {
    return { motivo: 'magia_nao_permitida' };
  }
  if (passosAtual < passosAlvo - 1) return { motivo: 'falta_nivel_anterior' };

  const _calcEstagio = g('calcEstagio');
  const estagio = (pj.experiencia != null && _calcEstagio) ? _calcEstagio(pj.experiencia) : null;
  if (estagio != null && nivel > estagio) return { motivo: 'acima_do_estagio' };

  const _pontos = g('pontosMagiasTotal');
  const _gasto = g('gastoMagias');
  if (magia && lista && estagio != null && _pontos && _gasto) {
    const total = _pontos(pj.profissao, estagio);
    const gasto = _gasto(pj.magias || {}, lista);
    const gastoNovo = _gasto({ ...(pj.magias || {}), [keyReal]: passosAlvo }, lista);
    if (gastoNovo > total) return { motivo: 'pontos_insuficientes', faltam: gastoNovo - total, gasto, total };
  }
  return null;
}

function motivoAprenderLabel(motivo, en, dados) {
  // Pontos com os números: é o motivo que o jogador mais precisa entender.
  if (motivo === 'pontos_insuficientes' && dados && dados.faltam != null) {
    return en
      ? `Not enough magic points: ${dados.faltam} short (using ${dados.gasto} of ${dados.total}).`
      : `Pontos de magia insuficientes: faltam ${dados.faltam} (usa ${dados.gasto} de ${dados.total}).`;
  }
  const map = {
    nao_e_dono:             en ? 'Only the character’s owner can learn from this scroll.' : 'Só o dono do personagem pode aprender com este pergaminho.',
    aprender_no_inventario: en ? 'Learn it from the Inventory.'                          : 'Aprenda pelo Inventário.',
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
  onClose, onEquipar, onDesequipar, onUsar, onPreparar, onPrepararCarne, onAprenderMagia, pjAprendiz, magiasDb, onDestruir, onObservacao,
  onMoverParaContainer, onTransferir, transferError, onTransferReset,
  onVestir, onDespir,
  criaturaMontaria, onMontar, onDesmontar,
  onRemoverDoContainer, onAbrirDetalhesFilho, contexto,
  onVender, vendaAberta, podeVender,
  onBonus,
}) {
  const [tip, abrirTip, fecharTip, manterTip] = usePortalTooltip(60);
  const [confirmandoDestruir, setConfirmandoDestruir] = useState(false);
  const [confirmandoUsar, setConfirmandoUsar] = useState(false);
  const [confirmandoPreparar, setConfirmandoPreparar] = useState(false);
  const [preparandoCarne, setPreparandoCarne] = useState(false);
  const [aprendendo, setAprendendo] = useState(false);
  const [aprenderErro, setAprenderErro] = useState(null);
  const [mostrarArmazenar, setMostrarArmazenar] = useState(false);
  const [mostrarTransferir, setMostrarTransferir] = useState(false);
  const [transfPjId, setTransfPjId] = useState('');
  const [transferindo, setTransferindo] = useState(false);
  const [armazContId, setArmazContId] = useState('');
  // Janela de leitura do livro (itens.doc_url), 13/09/2026.
  const [lendo, setLendo] = useState(false);
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
    setAprendendo(false);
    setAprenderErro(null);
    setMostrarArmazenar(false);
    setMostrarTransferir(false);
    setTransfPjId('');
    setArmazContId('');
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
  const ehAnimal = cat.grupo === 'Animais' && !!cat.consumiveis;
  // Pergaminho de magia: consumível que declara magia + nivel_magia. Item mágico
  // de outro grupo com magia (livro, anel, arma) NÃO é pergaminho.
  const ehPergaminhoMagia = ehPergaminhoDeMagia(cat);
  const isContainer = ehContainer(cat);
  // Pré-calcula conteúdo do container uma única vez; usado tanto para renderizar
  // det-container-content como para suprimir o espaçamento quando vazio/ausente.
  const containerData = isContainer ? capacidadeContainer(instance, todosItens, catalogoBySlug) : null;
  const hasContainerContent = !!(containerData?.filhos?.length);
  const temMultiplos = instance.quantidade > 1;
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
        if (livres < maosReq) bloqueioEquipar = en ? `Needs ${maosReq} free hand(s) (${livres} free).` : `Precisa de ${maosReq} mão(s) livre(s) (${livres} livre${livres === 1 ? '' : 's'}).`;
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

  return (
    <ModalShell
      title={<><i className={'ti ' + invItemIcon(cat) + ' det-title-ic'} aria-hidden="true" /> {cat.nome}{bonusItem > 0 ? ` +${bonusItem}` : ''}</>}
      lang={lang}
      size="md"
      extraClass="modal-detalhes"
      onClose={onClose}
    >
        {/* ── Seção A: Atributos inline ──── */}
        {/* Na transferência, a janela mostra só a escolha do destinatário:
            ícones, descrição e conteúdo saem (pedido do usuário, 12/09/2026). */}
        {!mostrarTransferir && !mostrarArmazenar &&(cat.ocupa != null || cat.armazena != null || cat.efeito_positivo || cat.efeito_negativo || cat.magia || cat.nivel_magia != null || cat.dano || Number(cat.absorcao) > 0 || mostraResistencia) && (
          <div className="det-sec-a">
            {cat.ocupa != null && (
              <span className="det-sec-chip"
                onMouseEnter={(e) => abrirTip(e, { title: en ? 'Takes up' : 'Ocupa', desc: fmtNum(cat.ocupa) })}
                onMouseLeave={fecharTip}
                tabIndex={0}
                onFocus={(e) => abrirTip(e, { title: en ? 'Takes up' : 'Ocupa', desc: fmtNum(cat.ocupa) })}
                onBlur={fecharTip}>
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
              <span className="det-sec-chip"
                onMouseEnter={(e) => abrirTip(e, { title: en ? 'Absorbs' : 'Absorção', desc: String(cat.absorcao) })}
                onMouseLeave={fecharTip}
                tabIndex={0}
                onFocus={(e) => abrirTip(e, { title: en ? 'Absorbs' : 'Absorção', desc: String(cat.absorcao) })}
                onBlur={fecharTip}>
                <span className="det-sec-ic-box">
                  <i className="ti ti-shield-half" aria-hidden="true" />
                </span>
                <span className="det-sec-val">{cat.absorcao}</span>
              </span>
            )}
            {mostraResistencia && (
              <span className="det-sec-chip det-sec-chip--resistencia"
                onMouseEnter={(e) => abrirTip(e, { title: en ? 'Durability' : 'Resistência', desc: `${resAtualItem}/${resMaxItem}` })}
                onMouseLeave={fecharTip}
                tabIndex={0}
                onFocus={(e) => abrirTip(e, { title: en ? 'Durability' : 'Resistência', desc: `${resAtualItem}/${resMaxItem}` })}
                onBlur={fecharTip}>
                <span className={'det-sec-ic-box' + (resAtualItem < resMaxItem ? ' det-sec-ic--neg' : '')}>
                  <i className="ti ti-hammer" aria-hidden="true" />
                </span>
                <span className="det-sec-val">{resAtualItem}</span>
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
            {/* Efeito é TEXTO, e texto não cabe num selo de canto (pedido do
                usuário, 11/09/2026: "quando houver um efeito no item, não
                precisa mostrar qual efeito é, o efeito vira tooltip").

                Os chips numéricos acima continuam com o número no canto —
                número cabe. Estes três viram só o ícone, e o conteúdo sai no
                hover. Sem o texto ao lado, a linha de atributos para de
                quebrar quando o item tem efeito longo. */}
            {cat.efeito_positivo && (
              <span className="det-sec-chip det-sec-chip--efeito"
                onMouseEnter={(e) => abrirTip(e, { title: en ? 'Positive effect' : 'Efeito positivo', desc: cat.efeito_positivo })}
                onMouseLeave={fecharTip}
                tabIndex={0}
                onFocus={(e) => abrirTip(e, { title: en ? 'Positive effect' : 'Efeito positivo', desc: cat.efeito_positivo })}
                onBlur={fecharTip}>
                <span className="det-sec-ic-box det-sec-ic--pos">
                  <i className="ti ti-plus" aria-hidden="true" />
                </span>
              </span>
            )}
            {cat.efeito_negativo && (
              <span className="det-sec-chip det-sec-chip--efeito"
                onMouseEnter={(e) => abrirTip(e, { title: en ? 'Negative effect' : 'Efeito negativo', desc: cat.efeito_negativo })}
                onMouseLeave={fecharTip}
                tabIndex={0}
                onFocus={(e) => abrirTip(e, { title: en ? 'Negative effect' : 'Efeito negativo', desc: cat.efeito_negativo })}
                onBlur={fecharTip}>
                <span className="det-sec-ic-box det-sec-ic--neg">
                  <i className="ti ti-minus" aria-hidden="true" />
                </span>
              </span>
            )}
            {(cat.magia || cat.nivel_magia != null) && (
              <span className="det-sec-chip det-sec-chip--efeito"
                onMouseEnter={(e) => abrirTip(e, { title: en ? 'Spell' : 'Magia', desc: [cat.magia, cat.nivel_magia].filter((x) => x != null && x !== '').join(' ') || null })}
                onMouseLeave={fecharTip}
                tabIndex={0}
                onFocus={(e) => abrirTip(e, { title: en ? 'Spell' : 'Magia', desc: [cat.magia, cat.nivel_magia].filter((x) => x != null && x !== '').join(' ') || null })}
                onBlur={fecharTip}>
                <span className="det-sec-ic-box ">
                  <i className="ti ti-sparkle" aria-hidden="true" />
                </span>
              </span>
            )}
          </div>
        )}

        {/* ── Sagração (15/09/2026) ───────────────────────────────
            Bônus permanente do item: arma soma no dano, armadura e escudo na
            absorção. Todos veem; só o Mestre (onBonus) sobe e desce, na
            escada 0 → 1 → 3 → 5 → 7 → 9. */}
        {!mostrarTransferir && !mostrarArmazenar && destinoBonus && (bonusItem > 0 || onBonus) && (
          <div className="det-bonus" data-bonus={bonusItem}>
            <span className="det-bonus-lbl">
              <i className="ti ti-sparkles" aria-hidden="true" />
              {en ? 'Consecration' : 'Sagração'}
              <span className="det-bonus-onde">
                {destinoBonus === 'dano' ? (en ? 'damage' : 'dano') : (en ? 'absorption' : 'absorção')}
              </span>
            </span>
            <span className="det-bonus-ctrl">
              {onBonus && (
                <button type="button" className="btn-icon btn-sm" disabled={bonusItem === 0}
                  aria-label={en ? 'Lower bonus' : 'Reduzir bônus'}
                  onClick={() => onBonus(instance.instanceId, -1)}>
                  <i className="ti ti-minus" aria-hidden="true" />
                </button>
              )}
              <span className="det-bonus-val">+{bonusItem}</span>
              {onBonus && (
                <button type="button" className="btn-icon btn-sm"
                  disabled={bonusItem === BONUS_ITEM_VALORES[BONUS_ITEM_VALORES.length - 1]}
                  aria-label={en ? 'Raise bonus' : 'Aumentar bônus'}
                  onClick={() => onBonus(instance.instanceId, 1)}>
                  <i className="ti ti-plus" aria-hidden="true" />
                </button>
              )}
            </span>
          </div>
        )}

        {/* ── Linha divisória ──────────────────────────────────── */}
        {!mostrarTransferir && !mostrarArmazenar &&(cat.ocupa != null || cat.armazena != null || cat.efeito_positivo || cat.efeito_negativo || cat.magia || cat.nivel_magia != null || cat.dano || Number(cat.absorcao) > 0 || mostraResistencia) &&
         cat.descricao && (
          <hr className="det-sec-divider" />
        )}

        {/* ── Seção B: Descrição ───────────────────────────────── */}
        {!mostrarTransferir && !mostrarArmazenar && cat.descricao && (
          <div className="det-sec-b">
            <span className="det-sec-desc-val">{cat.descricao}</span>
          </div>
        )}

        {/* ── Magia do pergaminho (13/09/2026) ─────────────────────
            "No pergaminho de magias para serem aprendidas, mostre a descrição
            da magia." Descrição geral, um <p> por parágrafo como na ficha, e o
            texto do nível que o pergaminho ensina. */}
        {!mostrarTransferir && !mostrarArmazenar && ehPergaminhoMagia && (() => {
          const magia = magiaDoItem(cat, magiasDb);
          const textoNivel = magia ? magia['nivel_' + Number(cat.nivel_magia)] : null;
          if (!magia || (!magia.descricao && !textoNivel)) return null;
          return (
            <div className="det-magia-pergaminho">
              <div className="det-sec-head">
                <span>{magia.nome} · {en ? 'Level' : 'Nível'} {cat.nivel_magia}</span>
              </div>
              <div className="det-desc">
                {String(magia.descricao || '').split(/\r?\n/).map((p) => p.trim()).filter(Boolean)
                  .map((p, i) => <p key={i}>{p}</p>)}
                {textoNivel && <p className="det-efeito">{textoNivel}</p>}
              </div>
            </div>
          );
        })()}

        {/* ── Conteúdo do container ────────────────────────────── */}
        {/* Só renderiza quando há itens dentro; container vazio = sem bloco,
            sem espaçamento fantasma (o margin-top de det-actions abaixo fica 0). */}
        {!mostrarTransferir && !mostrarArmazenar &&hasContainerContent && (
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
                        {...propsTip(abrirTip, fecharTip, en ? 'Details' : 'Detalhes')}
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
        {lendo && cat.doc_url && (
          <LeituraDocModal titulo={cat.nome} docUrl={cat.doc_url} lang={lang} onClose={() => setLendo(false)} />
        )}
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
          ) : preparandoCarne ? (
            /* Preparar carne (24/09/2026): as três receitas daquela carne. A
               que pede mais carne do que o personagem tem fica desativada e
               diz por quê. A conta soma todas as pilhas, não só esta. */
            <div className="det-act-confirm">
              <div className="det-act-confirm-title">
                {en ? 'Prepare food' : 'Preparar alimento'}
              </div>
              <span className="det-act-confirm-lbl">
                {en ? `You have ${carneTotal}× ${cat.nome}.` : `Você tem ${carneTotal}× ${cat.nome}.`}
              </span>
              <div className="det-act-confirm-btns det-receitas">
                {receitasCarne.map((r) => {
                  const prato = catalogoBySlug[r.resultado];
                  const falta = carneTotal < r.custo;
                  return (
                    <button key={r.resultado} className="btn-primary"
                      data-receita={r.resultado}
                      disabled={falta || !prato}
                      onClick={() => { onPrepararCarne(instance.instanceId, r.resultado); onClose(); }}
                      {...propsTip(abrirTip, fecharTip, falta
                        ? (en ? `Needs ${r.custo}× ${cat.nome}.` : `Precisa de ${r.custo}× ${cat.nome}.`)
                        : ((prato && prato.efeito_positivo) || ''))}>
                      {r.custo}× → {prato ? prato.nome : r.resultado}
                    </button>
                  );
                })}
                <button className="btn-ghost" onClick={() => setPreparandoCarne(false)}>
                  {en ? 'Cancel' : 'Cancelar'}
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
              {/* Mini cards com foto e nome — o mesmo seletor do alvo de magia
                  (det-opt-grid / det-opt-card), no lugar do <select> (pedido
                  do usuário, 12/09/2026). Sem foto, a inicial do nome. */}
              <div className="det-opt-grid" role="radiogroup" aria-label={en ? 'Recipient' : 'Destinatário'}>
                {(pjsHistoria || []).map((pj) => {
                  const id = String(pj.id);
                  const nome = [pj.nome, pj.sobrenome].filter(Boolean).join(' ');
                  const selecionado = transfPjId === id;
                  const detalhe = [pj.raca, pj.profissao].filter(Boolean).join(' · ');
                  return (
                    <button
                      type="button"
                      key={id}
                      role="radio"
                      aria-checked={selecionado}
                      data-pj-id={id}
                      className={'det-opt-card' + (selecionado ? ' det-opt-card--sel' : '')}
                      disabled={transferindo}
                      onClick={() => { setTransfPjId(id); onTransferReset && onTransferReset(); }}
                      onMouseEnter={(e) => abrirTip(e, { title: nome, desc: detalhe || null })}
                      onMouseLeave={fecharTip}
                      onFocus={(e) => abrirTip(e, { title: nome, desc: detalhe || null })}
                      onBlur={fecharTip}
                    >
                      {pj.foto_url ? (
                        <img className="det-opt-foto" src={pj.foto_url} alt="" />
                      ) : (
                        <span className="det-opt-foto det-opt-foto--vazia">{(nome || '?').trim().slice(0, 1).toUpperCase()}</span>
                      )}
                      <span className="det-opt-nome">{nome}</span>
                      {selecionado && <i className="ti ti-check" aria-hidden="true" style={{ color: 'var(--gold, #C9A44E)' }} />}
                    </button>
                  );
                })}
              </div>
              {/* Primeiro o aliado; a quantidade vem DEPOIS, na janela padrão de
                  quantidade (QuantidadeModal), quando a pilha tem mais de uma
                  unidade (pedido do usuário, 12/09/2026). */}
              {transferError && <div className="transf-error">{motivoTransferenciaLabel(transferError, en)}</div>}
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
              {/* Cards clicáveis dos compartimentos — o mesmo seletor da
                  transferência (det-opt-grid / det-opt-card), no lugar do
                  <select> (pedido do usuário, 13/09/2026). O ícone é o do item;
                  o espaço usado vai no tooltip e o compartimento onde o item
                  já está fica marcado e desativado. */}
              <div className="det-opt-grid" role="radiogroup" aria-label={en ? 'Compartment' : 'Compartimento'}>
                {opcoesContainer.map((c) => {
                  const cc = catalogoBySlug[c.slug];
                  const nome = cc?.nome || c.slug;
                  const { usado, armazena: cap } = capacidadeContainer(c, todosItens, catalogoBySlug);
                  const atual = c.instanceId === instance.containerId;
                  const selecionado = armazContId === c.instanceId;
                  const detalhe = (en ? 'Space: ' : 'Espaço: ') + used(usado, cap)
                    + (atual ? (en ? ' · the item is already here' : ' · o item já está aqui') : '');
                  return (
                    <button
                      type="button"
                      key={c.instanceId}
                      role="radio"
                      aria-checked={selecionado}
                      data-container-id={c.instanceId}
                      className={'det-opt-card' + (selecionado || atual ? ' det-opt-card--sel' : '')}
                      disabled={atual}
                      onClick={() => setArmazContId(c.instanceId)}
                      onMouseEnter={(e) => abrirTip(e, { title: nome, desc: detalhe })}
                      onMouseLeave={fecharTip}
                      onFocus={(e) => abrirTip(e, { title: nome, desc: detalhe })}
                      onBlur={fecharTip}
                    >
                      <span className="det-opt-foto det-opt-foto--vazia">
                        <i className={'ti ' + invItemIcon(cc)} aria-hidden="true" />
                      </span>
                      <span className="det-opt-nome">{nome}</span>
                      {(selecionado || atual) && <i className="ti ti-check" aria-hidden="true" style={{ color: 'var(--gold, #C9A44E)' }} />}
                    </button>
                  );
                })}
              </div>
              <div className="det-act-confirm-btns">
                <button className="btn-ghost"
                  onClick={() => { fecharTip(); setMostrarArmazenar(false); setArmazContId(''); }}>
                  {en ? 'Cancel' : 'Cancelar'}
                </button>
                <button className="btn-primary" disabled={!armazContId}
                  onClick={() => {
                    fecharTip();
                    const r = handleContainerChange(armazContId);
                    // Moveu direto: fecha a janela (13/09/2026). Pilha: fecha
                    // quando a quantidade for confirmada (executarAcaoPendente).
                    if (r === 'feito') { onClose(); return; }
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
                      {...propsTip(abrirTip, fecharTip, bloqueioEquipar || '')}>
                      {en ? 'Equip' : 'Equipar'}
                    </button>
                  )
                )}
                {/* Flecha não tem Usar: o ataque com arco a gasta (14/09/2026). */}
                {consumivel && !equipavel && !isContainer && !ehPergaminhoMagia && !ehFlecha(cat) && (
                  <button className="btn-primary"
                    // Pilha: vai direto pra janela de quantidade (a padrão).
                    onClick={() => {
                      if (temMultiplos) onUsar(instance.instanceId);
                      else setConfirmandoUsar(true);
                    }}>
                    {en ? 'Use' : 'Usar'}
                  </button>
                )}
                {/* Montar / Desmontar — animal cuja criatura é montaria. */}
                {acoesPesadas && criaturaMontaria && onMontar && (
                  instance.montado ? (
                    <button className="btn-primary" onClick={() => onDesmontar(instance.instanceId)}>
                      {en ? 'Dismount' : 'Desmontar'}
                    </button>
                  ) : (
                    <button className="btn-primary" onClick={() => onMontar(instance.instanceId)}>
                      {en ? 'Mount' : 'Montar'}
                    </button>
                  )
                )}
                {acoesPesadas && onPrepararCarne && receitasCarne.length > 0 && (
                  <button className="btn-primary" onClick={() => setPreparandoCarne(true)}>
                    {en ? 'Prepare' : 'Preparar'}
                  </button>
                )}
                {acoesPesadas && ehAnimal && onPreparar && !instance.montado && (
                  <button className="btn-primary"
                    onClick={() => setConfirmandoPreparar(true)}>
                    {en ? 'Prepare' : 'Preparar'}
                  </button>
                )}
                {/* APRENDER aparece em TODO pergaminho de magia (13/09/2026):
                    quando não dá, fica desativado e o tooltip diz por quê. */}
                {ehPergaminhoMagia && (() => {
                  const bloqueio = bloqueioPergaminho(cat, pjAprendiz, {
                    magiasDb, noInventario: acoesPesadas, podeAprender: !!onAprenderMagia,
                  });
                  return (
                  <button className="btn-primary"
                    data-aprender-bloqueio={bloqueio ? bloqueio.motivo : undefined}
                    disabled={aprendendo || !!bloqueio}
                    {...propsTip(abrirTip, fecharTip, bloqueio ? motivoAprenderLabel(bloqueio.motivo, en, bloqueio) : '')}
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
                  );
                })()}

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
                      {...propsTip(abrirTip, fecharTip, bloqueioVestir || '')}>
                      {en ? 'Wear' : 'Vestir'}
                    </button>
                  )
                )}

                {/* Ler — livro com conteúdo no Google Docs (itens.doc_url).
                    Vale na ficha e no inventário: ler não gasta nem move nada. */}
                {cat.doc_url && (
                  <button className="btn-primary" onClick={() => setLendo(true)}>
                    {en ? 'Read' : 'Ler'}
                  </button>
                )}

                {/* Transferir */}
                {acoesPesadas && pjsHistoria.length > 0 && !instance.vestido && !instance.montado && (
                  <button className="btn-ghost" onClick={() => { onTransferReset && onTransferReset(); setMostrarTransferir(true); }}>
                    {en ? 'Transfer' : 'Transferir'}
                  </button>
                )}

                {/* Armazenar em */}
                {acoesPesadas && !isContainer && !instance.equipado && !instance.vestido && !instance.montado && (
                  <button className="btn-ghost"
                    disabled={!temOndeArmazenar}
                    onClick={() => setMostrarArmazenar(true)}
                    {...propsTip(abrirTip, fecharTip, !temOndeArmazenar
                      ? (en ? 'No compatible container in inventory' : 'Nenhum recipiente compatível no inventário')
                      : '')}>
                    {en ? 'Store' : 'Armazenar'}
                  </button>
                )}

                {/* Vender — negociação com o Mestre (13/09/2026). Aparece
                    sempre (menos em moedas); quando não dá, desativado com o
                    motivo no tooltip. Com negociação aberta, vira "Negociação"
                    e abre o andamento. */}
                {acoesPesadas && onVender && cat.grupo !== 'Moedas' && (() => {
                  const motivo = bloqueioVenda(instance, {
                    ...(podeVender || {}), temConteudo: hasContainerContent, vendaAberta: !!vendaAberta,
                  });
                  return (
                    <button className="btn-ghost"
                      data-venda-bloqueio={motivo || undefined}
                      disabled={!!motivo}
                      onClick={() => { fecharTip(); onVender(instance.instanceId); }}
                      {...propsTip(abrirTip, fecharTip, motivo ? motivoVendaLabel(motivo, en) : '')}>
                      {vendaAberta ? (en ? 'Negotiation' : 'Negociação') : (en ? 'Sell' : 'Vender')}
                    </button>
                  );
                })()}

                {/* Descartar — mesma linha dos demais botões */}
                <button className="btn-danger"
                  // Pilha: vai direto pra janela de quantidade (a padrão).
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

      <PortalTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </ModalShell>
  );
}
/* ============================================================
   VENDA DE ITEM — negociação com o Mestre (13/09/2026)
   ============================================================
   "Adicione um botão de vender o item do inventário, abrindo um modal para
   negociar e registrar o preço de venda. O mestre poderá aceitar, recusar a
   proposta ou negociar." (usuário)

   O estado vive em public.vendas_item e só muda pelas RPCs (ver
   scripts/sql/vendas-item-negociacao.sql):
     propor_venda_item     o dono propõe quantidade + preço; a vez vai ao Mestre;
     responder_venda_item  quem tem a vez aceita, recusa ou contrapropõe (a
                           vez troca); o dono pode cancelar a qualquer hora.
   Aceitar tira o item e deposita as moedas no servidor, de uma vez. Cada passo
   grava na mesa_log — é o que notifica a mesa.

   O mesmo VendaModal serve aos dois lados: `papel` 'jogador' (inventário) ou
   'mestre' (fila da Central de Mensagens, ou o inventário do jogador aberto
   pelo Mestre).
   ============================================================ */
const VENDA_COLS = 'id,historia_id,pj_id,pj_nome,instance_id,slug,item_nome,quantidade,valor_tabela_latao,preco_latao,vez,status,rodadas,created_at,updated_at';

function motivoVendaLabel(motivo, en) {
  const map = {
    nao_autenticado:         en ? 'Sign in again.'                                          : 'Entre de novo na sua conta.',
    nao_e_dono:              en ? 'Only the character’s owner can sell.'                    : 'Só o dono do personagem pode vender.',
    sem_historia:            en ? 'The character is not in an adventure — no GM to buy it.' : 'O personagem não está numa aventura — não há Mestre para comprar.',
    preco_invalido:          en ? 'Enter a price above zero.'                               : 'Informe um preço maior que zero.',
    mesmo_preco:             en ? 'That is already the price on the table.'                 : 'Esse já é o preço na mesa.',
    item_indisponivel:       en ? 'The item is no longer in the inventory.'                 : 'O item não está mais no inventário.',
    item_nao_existe:         en ? 'Item not found in the catalog.'                          : 'Item não encontrado no catálogo.',
    moeda_nao_vende:         en ? 'Coins cannot be sold.'                                   : 'Moedas não se vendem.',
    item_em_uso:             en ? 'Unequip or take off the item first.'                     : 'Desequipe ou dispa o item antes de vender.',
    recipiente_com_itens:    en ? 'Empty the container first.'                              : 'Esvazie o recipiente antes de vender.',
    quantidade_invalida:     en ? 'Invalid quantity.'                                       : 'Quantidade inválida.',
    quantidade_indisponivel: en ? 'That quantity is no longer in the inventory.'            : 'Essa quantidade não está mais no inventário.',
    ja_em_negociacao:        en ? 'This item is already being negotiated.'                  : 'Este item já está em negociação.',
    sem_espaco_moedas:       en ? 'No room in a purse for the coins.'                       : 'Não há espaço numa bolsa para as moedas.',
    venda_nao_encontrada:    en ? 'Negotiation not found.'                                  : 'Negociação não encontrada.',
    venda_encerrada:         en ? 'This negotiation is already closed.'                     : 'Esta negociação já foi encerrada.',
    nao_e_sua_vez:           en ? 'Waiting for the other side to answer.'                   : 'Aguardando o outro lado responder.',
    sem_permissao:           en ? 'You cannot answer this negotiation.'                     : 'Você não pode responder esta negociação.',
    acao_invalida:           en ? 'Invalid action.'                                         : 'Ação inválida.',
    pj_nao_encontrado:       en ? 'Character not found.'                                    : 'Personagem não encontrado.',
  };
  return map[motivo] || (en ? 'Could not complete the sale.' : 'Não foi possível concluir a venda.');
}

// Por que o botão "Vender" não dá (null = dá). Espelha as recusas da RPC que
// dependem só da tela. Com negociação aberta, nunca bloqueia: abre o andamento.
function bloqueioVenda(instance, opcoes) {
  const o = opcoes || {};
  if (o.vendaAberta) return null;
  if (!o.ehDono) return 'nao_e_dono';
  if (!o.historiaId) return 'sem_historia';
  if (instance && (instance.equipado || instance.vestido)) return 'item_em_uso';
  if (o.temConteudo) return 'recipiente_com_itens';
  return null;
}

// O que `papel` pode fazer agora. Na vez dele: aceitar, negociar, recusar.
// Fora da vez, o jogador ainda pode desistir; o Mestre só espera.
function vendaAcoesDisponiveis(venda, papel) {
  if (!venda || venda.status !== 'aberta') return [];
  if (venda.vez === papel) return ['aceitar', 'contrapropor', 'recusar'];
  return papel === 'jogador' ? ['cancelar'] : [];
}

// Quatro campos (ouro, prata, cobre, latão) → total em latão. Remonte com
// `key` para recomeçar de outro valor.
function PrecoMoedasInput({ latao, onChange, lang, disabled }) {
  const en = lang === 'en';
  const [campos, setCampos] = useState(() => latoesToMoedas(Math.max(0, Math.round(Number(latao) || 0))));
  const nomes = en
    ? { ouro: 'Gold', prata: 'Silver', cobre: 'Copper', latao: 'Brass' }
    : { ouro: 'Ouro', prata: 'Prata', cobre: 'Cobre', latao: 'Latão' };
  const mudar = (k, valor) => {
    const n = Math.max(0, parseInt(String(valor).replace(/\D/g, ''), 10) || 0);
    const novo = { ...campos, [k]: n };
    setCampos(novo);
    if (onChange) onChange(moedasToLatao(novo));
  };
  return (
    <div className="venda-moedas">
      {MOEDA_ORDEM.map((k) => (
        <label key={k} className={'venda-moeda venda-moeda--' + k}>
          <span className="venda-moeda-nome"><i className="ti ti-coins" aria-hidden="true" /> {nomes[k]}</span>
          <input type="text" inputMode="numeric" placeholder="0" disabled={disabled}
            aria-label={nomes[k]}
            value={campos[k] ? String(campos[k]) : ''}
            onChange={(e) => mudar(k, e.target.value)} />
        </label>
      ))}
    </div>
  );
}

function VendaModal({ lang, papel, pjId, instance, cat, vendaId, onClose, onConcluida }) {
  const en = lang === 'en';
  const [venda, setVenda] = useState(undefined);   // undefined carregando · null nenhuma aberta
  const [catLocal, setCatLocal] = useState(cat || null);
  const [qtd, setQtd] = useState(1);
  const [preco, setPreco] = useState(0);
  const [mensagem, setMensagem] = useState('');
  const [negociando, setNegociando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const sufixo = useRef(Math.random().toString(36).slice(2, 8));

  const instanceId = instance ? instance.instanceId : null;
  const maxQtd = instance ? Math.max(1, Number(instance.quantidade) || 1) : 1;
  const equipavel = !!(catLocal && catLocal.categoria_equip);
  const valorUnit = Number(catLocal && catLocal.valor_latao) || 0;

  const carregar = React.useCallback(async () => {
    try {
      let q = supabaseClient.from('vendas_item').select(VENDA_COLS);
      q = vendaId
        ? q.eq('id', vendaId)
        : q.eq('pj_id', pjId).eq('instance_id', instanceId).eq('status', 'aberta');
      const { data, error } = await q.maybeSingle();
      setVenda(error ? null : (data || null));
    } catch (_) { setVenda(null); }
  }, [vendaId, pjId, instanceId]);

  useEffect(() => { carregar(); }, [carregar]);

  // Proposta nova: começa pela pilha inteira (equipável é indivisível) e pelo
  // valor de tabela; mudar a quantidade recomeça o preço.
  useEffect(() => { setQtd(maxQtd); }, [maxQtd]);
  useEffect(() => { setPreco(valorUnit * qtd); }, [valorUnit, qtd]);

  // Quem abre pela fila (Mestre) não tem o item do catálogo em mãos.
  useEffect(() => {
    if (catLocal || !venda || !venda.slug) return;
    let vivo = true;
    Promise.resolve(supabaseClient.from('itens').select('*').eq('slug', venda.slug).maybeSingle())
      .then((res) => { if (vivo && res && res.data) setCatLocal(res.data); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [venda && venda.slug, catLocal]);

  // A resposta do outro lado chega sem recarregar.
  useEffect(() => {
    const id = venda && venda.id;
    if (!id || typeof supabaseClient.channel !== 'function') return undefined;
    const ch = supabaseClient
      .channel('venda_' + id + '_' + sufixo.current)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vendas_item', filter: 'id=eq.' + id },
        (payload) => { if (payload && payload.new) setVenda((v) => ({ ...(v || {}), ...payload.new })); })
      .subscribe();
    return () => { supabaseClient.removeChannel(ch); };
  }, [venda && venda.id]);

  const falhou = (data, error) => {
    setErro(motivoVendaLabel((data && data.motivo) || (error && error.message), en));
    if (data && (data.motivo === 'ja_em_negociacao' || data.motivo === 'venda_encerrada')) carregar();
  };

  const propor = async () => {
    setEnviando(true); setErro(null);
    const { data, error } = await supabaseClient.rpc('propor_venda_item', {
      p_pj_id: pjId, p_instance_id: instanceId, p_quantidade: qtd,
      p_preco_latao: preco, p_mensagem: mensagem.trim() || null,
    });
    setEnviando(false);
    if (error || !data || !data.ok) { falhou(data, error); return; }
    setMensagem('');
    await carregar();
  };

  const responder = async (acao) => {
    setEnviando(true); setErro(null);
    const { data, error } = await supabaseClient.rpc('responder_venda_item', {
      p_venda_id: venda.id, p_acao: acao,
      p_preco_latao: acao === 'contrapropor' ? preco : null,
      p_mensagem: mensagem.trim() || null,
    });
    setEnviando(false);
    if (error || !data || !data.ok) { falhou(data, error); return; }
    setMensagem('');
    setNegociando(false);
    if (data.status === 'aceita' && onConcluida) onConcluida();
    if (data.status !== 'aberta') { onClose(); return; }
    await carregar();
  };

  const nomeItem = (catLocal && catLocal.nome) || (venda && (venda.item_nome || venda.slug)) || '';
  const quantidade = venda ? Number(venda.quantidade) : qtd;
  const valorTabela = venda && venda.valor_tabela_latao != null ? Number(venda.valor_tabela_latao) : valorUnit * quantidade;
  const acoes = vendaAcoesDisponiveis(venda, papel);
  const nomePj = (venda && venda.pj_nome) || (en ? 'Player' : 'Jogador');
  const quemFoi = (autor) => (autor === 'mestre' ? (en ? 'GM' : 'Mestre') : nomePj);
  const verbo = (r) => ({
    propor:       en ? 'asked' : 'pediu',
    contrapropor: r.autor === 'mestre' ? (en ? 'offered' : 'ofereceu') : (en ? 'asked' : 'pediu'),
    aceitar:      en ? 'accepted' : 'aceitou',
    recusar:      en ? 'refused' : 'recusou',
    cancelar:     en ? 'gave up' : 'desistiu',
  }[r.acao] || r.acao);
  const statusFechado = venda && venda.status !== 'aberta' ? ({
    aceita:    en ? 'Sold.' : 'Vendido.',
    recusada:  en ? 'Refused.' : 'Recusada.',
    cancelada: en ? 'Cancelled.' : 'Cancelada.',
  }[venda.status]) : null;

  const campoMensagem = (
    <textarea className="venda-mensagem" rows={2} maxLength={500} value={mensagem} disabled={enviando}
      placeholder={en ? 'Message (optional)' : 'Mensagem (opcional)'}
      onChange={(e) => setMensagem(e.target.value)} />
  );

  return (
    <ModalShell
      title={<><i className={'ti ' + invItemIcon(catLocal) + ' det-title-ic'} aria-hidden="true" /> {venda ? (en ? 'Negotiate ' : 'Negociar ') : (en ? 'Sell ' : 'Vender ')}{nomeItem}</>}
      lang={lang}
      size="md"
      extraClass="modal-detalhes modal-venda"
      onClose={onClose}
    >
      <div className="venda-resumo">
        <span className="venda-resumo-item">
          <span className="venda-rot">{en ? 'Quantity' : 'Quantidade'}</span>
          <strong>{quantidade}</strong>
        </span>
        <span className="venda-resumo-item">
          <span className="venda-rot">{en ? 'List value' : 'Valor de tabela'}</span>
          <MoedaPills latao={valorTabela} lang={lang} tamanho="sm" mostrarGratis />
        </span>
        {venda && (
          <span className="venda-resumo-item">
            <span className="venda-rot">{en ? 'On the table' : 'Na mesa'}</span>
            <MoedaPills latao={Number(venda.preco_latao) || 0} lang={lang} tamanho="sm" />
          </span>
        )}
      </div>

      {venda === undefined && (
        <p className="venda-status">{en ? 'Loading…' : 'Carregando…'}</p>
      )}

      {/* Proposta nova */}
      {venda === null && (
        papel !== 'jogador' || !instance ? (
          <p className="venda-status">{en ? 'No open negotiation.' : 'Nenhuma negociação aberta.'}</p>
        ) : (
          <div className="venda-form">
            {!equipavel && maxQtd > 1 && (
              <div className="venda-qtd">
                <span className="venda-rot">{en ? 'How many?' : 'Quantos?'}</span>
                <button type="button" className="btn-ghost btn-sm" disabled={enviando || qtd <= 1}
                  onClick={() => setQtd((q) => Math.max(1, q - 1))} aria-label="-"><i className="ti ti-minus" aria-hidden="true" /></button>
                <strong>{qtd} <span className="venda-rot">{en ? `of ${maxQtd}` : `de ${maxQtd}`}</span></strong>
                <button type="button" className="btn-ghost btn-sm" disabled={enviando || qtd >= maxQtd}
                  onClick={() => setQtd((q) => Math.min(maxQtd, q + 1))} aria-label="+"><i className="ti ti-plus" aria-hidden="true" /></button>
              </div>
            )}
            <span className="venda-rot">{en ? 'Asking price' : 'Preço pedido'}</span>
            <PrecoMoedasInput key={'novo-' + qtd + '-' + valorUnit} latao={valorUnit * qtd} onChange={setPreco} lang={lang} disabled={enviando} />
            {campoMensagem}
            {erro && <div className="err-msg">{erro}</div>}
            <div className="det-act-confirm-btns">
              <button className="btn-ghost" disabled={enviando} onClick={onClose}>{en ? 'Cancel' : 'Cancelar'}</button>
              <button className="btn-primary" disabled={enviando || !(preco > 0)} onClick={propor}>
                {enviando ? (en ? 'Sending…' : 'Enviando…') : (en ? 'Offer to the GM' : 'Propor ao Mestre')}
              </button>
            </div>
          </div>
        )
      )}

      {/* Negociação existente */}
      {venda && (
        <>
          <p className="venda-status" data-venda-vez={venda.vez}>
            {statusFechado
              || (venda.vez === papel
                ? (en ? 'Your turn: accept, negotiate or refuse.' : 'Sua vez: aceite, negocie ou recuse.')
                : (papel === 'jogador'
                  ? (en ? 'Waiting for the GM.' : 'Aguardando o Mestre.')
                  : (en ? `Waiting for ${nomePj}.` : `Aguardando ${nomePj}.`)))}
          </p>

          <ol className="venda-rodadas">
            {(Array.isArray(venda.rodadas) ? venda.rodadas : []).map((r, i) => (
              <li key={i} className={'venda-rodada venda-rodada--' + r.autor}>
                <span className="venda-rodada-linha">
                  <strong>{quemFoi(r.autor)}</strong> {verbo(r)}
                  {(r.acao === 'propor' || r.acao === 'contrapropor' || r.acao === 'aceitar') && (
                    <> <MoedaPills latao={Number(r.preco_latao) || 0} lang={lang} tamanho="sm" /></>
                  )}
                </span>
                {r.mensagem && <span className="venda-rodada-msg">“{r.mensagem}”</span>}
              </li>
            ))}
          </ol>

          {negociando ? (
            <div className="venda-form">
              <span className="venda-rot">{papel === 'mestre' ? (en ? 'Your offer' : 'Sua oferta') : (en ? 'Your price' : 'Seu preço')}</span>
              <PrecoMoedasInput key={'contra-' + venda.id + '-' + venda.preco_latao} latao={venda.preco_latao}
                onChange={setPreco} lang={lang} disabled={enviando} />
              {campoMensagem}
              {erro && <div className="err-msg">{erro}</div>}
              <div className="det-act-confirm-btns">
                <button className="btn-ghost" disabled={enviando} onClick={() => { setNegociando(false); setErro(null); }}>{en ? 'Back' : 'Voltar'}</button>
                <button className="btn-primary" disabled={enviando || !(preco > 0) || preco === Number(venda.preco_latao)}
                  onClick={() => responder('contrapropor')}>
                  {enviando ? (en ? 'Sending…' : 'Enviando…') : (en ? 'Send offer' : 'Enviar proposta')}
                </button>
              </div>
            </div>
          ) : acoes.length > 0 ? (
            <>
              {erro && <div className="err-msg">{erro}</div>}
              <div className="det-act-confirm-btns venda-acoes">
                {acoes.includes('recusar') && (
                  <button className="btn-danger" disabled={enviando} onClick={() => responder('recusar')}>{en ? 'Refuse' : 'Recusar'}</button>
                )}
                {acoes.includes('cancelar') && (
                  <button className="btn-danger" disabled={enviando} onClick={() => responder('cancelar')}>{en ? 'Give up selling' : 'Desistir da venda'}</button>
                )}
                {acoes.includes('contrapropor') && (
                  <button className="btn-ghost" disabled={enviando}
                    onClick={() => { setPreco(Number(venda.preco_latao) || 0); setNegociando(true); setErro(null); }}>
                    {en ? 'Negotiate' : 'Negociar'}
                  </button>
                )}
                {acoes.includes('aceitar') && (
                  <button className="btn-primary" disabled={enviando} onClick={() => responder('aceitar')}>
                    {enviando ? (en ? 'Sending…' : 'Enviando…') : (en ? 'Accept' : 'Aceitar')}
                  </button>
                )}
              </div>
            </>
          ) : (
            erro && <div className="err-msg">{erro}</div>
          )}
        </>
      )}
    </ModalShell>
  );
}

// Helper de exibição: "2.0/10"
function used(usado, cap) { return `${fmtNum(usado)}/${fmtNum(cap)}`; }

// ── ContainerModal (Fase 3) ──────────────────────────────────────────────────
function ContainerModal({ containerInst, catalogoBySlug, todosItens, lang, onClose, onRemoverDoContainer, onAbrirDetalhes }) {
  const [tip, abrirTip, fecharTip, manterTip] = usePortalTooltip(60);
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
                    {...propsTip(abrirTip, fecharTip, en ? 'Details' : 'Detalhes')}
                    aria-label={en ? 'Details' : 'Detalhes'}>
                    <i className="ti ti-eye" aria-hidden="true" />
                  </button>
                  )}
                </div>
              </div>
            );
          })}
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

/* A JANELA PADRÃO de quantidade (padronizada em 12/09/2026, pedido do
   usuário): usar, descartar, guardar/retirar e transferir passam todos por
   ela, na ficha e no inventário. `irreversivel` decide só o aviso — transferir
   e guardar têm volta, e dizer "irreversível" ali era mentira. */
function QuantidadeModal({ titulo, max, lang, onConfirm, onCancel, irreversivel = true }) {
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
  InventarioList, EquipadoBoard, VestesBoard, MoedaPills,
  CabecalhoInvLoja, InvItemsTable, DetStat, DetalhesItemModal, ContainerModal, QuantidadeModal,
  // Leitura de livro (itens.doc_url) — o bestiário também abre por aqui.
  LeituraDocModal, urlLeituraDoc,
  // Slot de vestir do banco → casa da ficha ('costas' → 'capa'…).
  vesteSlotDe,
  // Teto de peças por região — precisa bater com as casas que a ficha desenha
  // (vestir-capacidade.test.js trava os dois lados juntos, 16/09/2026).
  VESTE_SLOTS, vesteSlotState,
  // Pergaminho: o botão "Aprender" bloqueia quando não há o que ensinar.
  bloqueioPergaminho, chaveDaMagiaPorNome, motivoAprenderLabel, ehPergaminhoDeMagia,
  // A magia que o item carrega — o bestiário mostra nome e descrição.
  magiaDoItem,
  // Montaria: a ficha abre a aba da montaria a partir daqui.
  criaturaDoItem, itemMontado, useCriaturasMontaria,
  // Aba Animais da ficha: todos os animais vinculados a criatura.
  animaisDoPersonagem, useCriaturasPorIds,
  VendaModal, PrecoMoedasInput, motivoVendaLabel, bloqueioVenda, vendaAcoesDisponiveis,
  // ↓ expostos para a Loja (07-inventario/loja.jsx) consumir via window:
  fmtNum, calcCarga, invItemIcon, recipienteAceitaSlug, usePortalTooltip, PortalTooltip,
  useGridDimensions,
});