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

// fmtNum — formato amigável de número:
// inteiros sem decimal ("3" e não "3.0"), fracionários com 1 casa ("1.5").
// Usado em ocupa/armazena/usado/capacidade tanto em barras como em tabelas.
function fmtNum(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return n;
  return Number.isInteger(x) ? String(x) : x.toFixed(1);
}

// normalizarPilhas — política de pilhas do inventário:
//   • Itens SOLTOS (sem containerId) NUNCA empilham: cada unidade vira uma
//     instância separada (quantidade 1). Uma pilha quantidade>1 que esteja solta
//     é "explodida" em N instâncias individuais (cada uma com instanceId próprio).
//     Isso inclui RECIPIENTES vazios (Algibeira ×2 → duas Algibeiras). Um
//     recipiente COM conteúdo nunca é dividido (quebraria as referências dos
//     filhos); na prática um recipiente cheio já tem quantidade 1.
//   • Itens DENTRO de armazenamento (containerId != null) continuam empilhando:
//     itens de QUALQUER grupo com o mesmo slug no mesmo container viram uma pilha
//     só, somando a quantidade (ex.: Água ×2 + Água ×5 → Água ×7).
// Equipados/vestidos e equipáveis ficam sempre intactos (já são instâncias
// únicas) e nunca empilham. Devolve o MESMO array quando nada muda (guarda
// contra re-render/loop no efeito que dispara o autosave).
function normalizarPilhas(itens, catalogoBySlug) {
  if (!Array.isArray(itens)) return itens;
  // instanceIds que são "pais" de algum item (recipientes com conteúdo).
  const comFilhos = new Set();
  for (const it of itens) if (it.containerId) comFilhos.add(it.containerId);

  const saida = [];
  const idxPorChave = new Map();
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

    // Solto → cada unidade separada: NADA empilha fora de container ("fora do
    // armazenamento fica separado"). Equipáveis/vestíveis soltos em pilha (ex.:
    // comprados em quantidade) são explodidos em instâncias únicas. Equipados/
    // vestidos (já quantidade 1) ficam intactos.
    const qtd = it.quantidade || 1;
    if (it.equipado || it.vestido || qtd <= 1) { saida.push(it); continue; }

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
  // fallback por grupo e nome
  const g = (cat.grupo || '').toLowerCase();
  const n = (cat.nome || '').toLowerCase();
  if (g.includes('brinco') || n.includes('brinco') || g.includes('orelh') || n.includes('orelh')) return 'brinco';
  if (g.includes('colar') || n.includes('colar') || g.includes('pescoc') || n.includes('pescoc') || g.includes('amuleto') || n.includes('amuleto')) return 'colar';
  if (g.includes('joia') || g.includes('jóia') || g.includes('anel') || n.includes('anel')) return 'joia';
  if (g.includes('cinto') || n.includes('cinto') || g.includes('cintura') || n.includes('cintura')) return 'cintura';
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

  if (ehContainer(cat)) {
    return cat.tipo === 'L' ? 'ti-bottle' : 'ti-moneybag';
  }

  const grupo = normalizar(cat.grupo);

  return ICONE_POR_GRUPO[grupo] || 'ti-box';
}

/* ── Peso / capacidade de carga ────────────────────────────────────
   Medidor ÚNICO de "peso": o quanto o personagem está carregando, em % da
   capacidade. É independente do controle de armazenamento por container (esse
   continua intacto, via capacidadeContainer). Regras de peso:
     • Capacidade base = 20 unidades, +10% por ponto de (forca_base + fisico_base)
       somados. Itens de armazenamento AUMENTAM a capacidade pelo tamanho de
       armazenamento de cada um (o `armazena` do container).
     • Equipado (arma / escudo / armadura): pesa 50% do `ocupa`.
     • Solto no inventário (sem containerId): pesa 100% do `ocupa`.
     • Dentro de armazenamento (containerId != null): pesa 50% do `ocupa`.
     • O próprio container pesa pelo `ocupa` conforme seu estado (equipado 50% /
       solto 100% / vestido 0) e, em paralelo, soma capacidade.
     • Vestimentas não pesam (sistema paralelo). */
const PESO_CAP_BASE = 10;            // capacidade base (antes de atributos/armazenamento)
const PESO_GANHO_POR_PONTO = 0.10;   // +10% de capacidade por ponto de força+físico
const PESO_FATOR_EQUIPADO = 0.75;     // equipado (arma/escudo/armadura) pesa 50% do ocupa
const PESO_FATOR_EM_CONTAINER = 0.75; // dentro de armazenamento pesa 50% do ocupa

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

    if (it.vestido) continue;                                   // vestimenta não pesa

    if (it.containerId) {
      peso += ocupaUnit * qtd * PESO_FATOR_EM_CONTAINER;        // dentro de armazenamento → 50%
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

  // Carregar PJs + catálogo
  useEffect(() => {
    if (!currentUserId) return;
    (async () => {
      const [pjRes, itRes] = await Promise.all([
        supabaseClient.from('personagens').select('id,nome,sobrenome,raca,profissao,forca_base,fisico_base,inventario,estado_atual').eq('user_id', currentUserId).order('created_at', { ascending: true }),
        fetchCatalogoCompleto(),
      ]);
      if (pjRes.error) { setError(pjRes.error.message); setPjs([]); return; }
      if (itRes.error) { setError(itRes.error.message); setCatalogo([]); return; }
      setPjs(pjRes.data || []);
      setCatalogo(itRes.data || []);
      if (pjRes.data?.length > 0) setSelectedId(pjIdFixo || pjRes.data[0].id);
    })();
  }, [currentUserId]);

  // Carregar PJs da mesma história (via RPC SECURITY DEFINER) + nome da mesa
  useEffect(() => {
    if (!selectedId) { setPjsHistoria([]); setMesaTitulo(null); return; }
    (async () => {
      const [pjsRes, lojaRes] = await Promise.all([
        supabaseClient.rpc('get_pjs_historia', { p_pj_id: selectedId }),
        supabaseClient.rpc('get_loja_pj', { p_pj_id: selectedId }),
      ]);
      setPjsHistoria(pjsRes.data || []);
      setMesaTitulo(lojaRes.data?.ok ? (lojaRes.data.historia_titulo || null) : null);
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
  if (pjs.length === 0) {
    return (
      <>
        <div className="admin-empty-sub">
          {lang === 'en' ? 'Create a character to manage your inventory' : 'Crie um personagem para gerenciar seu inventário'}
        </div>
      </>
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
          <div className="inv-divider">
            <span className="inv-divider-ln" />
            <span className="inv-divider-lbl">
              <i className="ti ti-backpack" aria-hidden="true" />
            </span>
            <span className="inv-divider-ln" />
          </div>
          <CabecalhoInvLoja carga={carga} lang={lang} />
          <InvItemsTable
            itens={inv.itens}
            catalogoBySlug={catalogoBySlug}
            mudarQtd={mudarQtd}
            onAbrirDetalhes={(id) => setDetalhesId(id)}
            onAbrirContainer={(id) => setContainerAberto(id)}
            lang={lang}
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
          onAprenderMagia={aprenderMagiaPergaminho}
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
  return (
    <div>     
      {/* Peso — 100% */}
      <div className="inv-topo-peso" style={{ flex: '1 1 100%' }}>
        <div className="inv-bag-grouphead">
          <i className="ti ti-weight" aria-hidden="true" />
          <span className="inv-bag-grp-name">{en ? 'Weight' : 'Peso'}</span>
          <span className="inv-bag-grp-count">{Math.round(carga.pct)}%</span>
        </div>
        <div
          className={'inv-summary-bar inv-summary-bar--peso' + pesoCls}
          title={en
            ? `Weight ${fmtNum(carga.peso)} of ${fmtNum(carga.capacidade)}`
            : `Peso ${fmtNum(carga.peso)} de ${fmtNum(carga.capacidade)}`}
          style={{ width: '100%'}}>
          <div className="inv-summary-railbox">
            <div className="inv-summary-progress" aria-hidden="true">
              <div className="inv-summary-progress-fill" style={{ width: `${Math.min(100, carga.pct)}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── EquipadoBoard — quadro de slots equipados (paper-doll) ────────────────────
// Lê os itens com `slot` definido e os dispõe na ordem canônica SLOT_ORDER.
// Slot preenchido abre o DetalhesItemModal (onAbrir); slot vazio é só visual.
function EquipadoBoard({ itens, catalogoBySlug, lang, onAbrir }) {
  const en = lang === 'en';
  const slotLabels = SLOT_LABELS[en ? 'en' : 'pt'] || {};
  const bySlot = {};
  for (const it of (itens || [])) { if (it.slot) bySlot[it.slot] = it; }

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
          return (
            <button
              key={slot}
              type="button"
              className={'inv-slot' + (filled ? ' filled' : ' empty')}
              onClick={filled ? () => onAbrir(it.instanceId) : undefined}
              disabled={!filled}
              title={filled ? nome : (slotLabels[slot] || slot)}>
              <span className="inv-slot-ic">
                <i className={'ti ' + (filled ? invItemIcon(cat) : 'ti-shield-exclamation')} aria-hidden="true" />
              </span>
              <span className="inv-slot-meta">
                <span className="inv-slot-lbl">{slotLabels[slot] || slot}</span>
                <span className="inv-slot-item">{filled ? nome : ''}</span>
              </span>
            </button>
          );
        })}
      </div>
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

// ── InvItemsTable — Modelo "Mochila Visual": grade de cards por categoria ──────
// Mantém o mesmo nome/props de antes (chamado por InventarioList e pela ficha).
// A "bolsa" mostra só itens fora de container E não equipados — os equipados
// vivem na ficha (Defesa/Vestes); os de dentro de container, no ContainerModal.
function InvItemsTable({ itens, catalogoBySlug, mudarQtd, onAbrirDetalhes, onAbrirContainer, lang }) {
  const en = lang === 'en';
  const itensVisiveis = (itens || []).filter((it) => !it.containerId && !it.slot && !it.vestido);

  if (itensVisiveis.length === 0) {
    return (
      <div className="inv-bag">
        <div className="inv-empty">
          <p>{en ? 'Your bag is empty' : 'Sua bolsa está vazia'}</p>
        </div>
      </div>
    );
  }

  // Agrupa por cat.grupo. Grupos com container vêm primeiro; depois ordem alfabética.
  const grupos = (() => {
    const m = new Map();
    for (const it of itensVisiveis) {
      const cat = catalogoBySlug[it.slug];
      const g = cat?.grupo || (en ? 'Other' : 'Outros');
      if (!m.has(g)) m.set(g, []);
      m.get(g).push(it);
    }
    const arr = Array.from(m.entries());
    arr.sort((a, b) => {
      const aHas = a[1].some((it) => ehContainer(catalogoBySlug[it.slug]));
      const bHas = b[1].some((it) => ehContainer(catalogoBySlug[it.slug]));
      if (aHas !== bHas) return aHas ? -1 : 1;
      return a[0].localeCompare(b[0]);
    });
    return arr;
  })();

  const renderContainerCard = (it, cat) => {
    const filhos = itens.filter((f) => f.containerId === it.instanceId);
    let usado = 0;
    for (const f of filhos) {
      const fc = catalogoBySlug[f.slug];
      if (fc?.ocupa != null) usado += Number(fc.ocupa) * f.quantidade;
    }
    const cap = Number(cat.armazena || 0);
    const pct = cap > 0 ? Math.min(100, (usado / cap) * 100) : 0;
    const liquido = cat.tipo === 'L';
    return (
      <button
        key={it.instanceId}
        type="button"
        className={'inv-card' + (cat?.magico ? ' inv-card--magico' : '')}
        onClick={() => onAbrirDetalhes(it.instanceId)}
        title={en ? 'Details' : 'Detalhes'}>
        {it.quantidade > 1 && <span className="inv-card-qty">{it.quantidade}</span>}
        <span className="inv-card-head">
          <span className="inv-card-ic"><i className={'ti ' + invItemIcon(cat)} aria-hidden="true" /></span>
          <span className="inv-card-name">{cat.nome}</span>
        </span>
        <span className="inv-cont-bar">
          <span style={{ width: pct + '%', background: liquido ? '#47aad8' : undefined }} />
        </span>
      </button>
    );
  };

  const renderItemCard = (it, cat) => {
    const nome = cat ? cat.nome : `(? ${it.slug})`;
    return (
      <button
        key={it.instanceId}
        type="button"
        className={'inv-card' + (cat?.magico ? ' inv-card--magico' : '')}
        onClick={() => onAbrirDetalhes(it.instanceId)}
        title={en ? 'Details' : 'Detalhes'}>
        {it.quantidade > 1 && <span className="inv-card-qty">{it.quantidade}</span>}
        <span className="inv-card-head">
          <span className="inv-card-ic"><i className={'ti ' + invItemIcon(cat)} aria-hidden="true" /></span>
          <span className="inv-card-name">{nome}</span>
        </span>
        <span className="inv-card-pills">
          {cat?.magico && (
            <span className="inv-pill mag"><i className="ti ti-sparkle-highlight" aria-hidden="true" /></span>
          )}
          {cat?.tipo === 'L' && (
            <span className="inv-pill liq"><i className="ti ti-droplet" aria-hidden="true" /></span>
          )}
          {it.observacao && (
            <span className="inv-pill nor" title={it.observacao}><i className="ti ti-feather" aria-hidden="true" /></span>
          )}
        </span>
      </button>
    );
  };

  const renderCard = (it) => {
    const cat = catalogoBySlug[it.slug];
    return ehContainer(cat) ? renderContainerCard(it, cat) : renderItemCard(it, cat);
  };

  return (
    <div className="inv-bag">
      <div className="inv-bag-cols">
      {grupos.map(([grupo, itensGrupo]) => {
        const primeira = catalogoBySlug[itensGrupo[0]?.slug];

        // Fora do armazenamento NADA empilha: cada instância (já explodida pelo
        // normalizarPilhas) vira seu próprio card. Sem reagrupar por slug.
        return (
          <div key={grupo} className="inv-bag-group">
            <div className="inv-bag-grouphead">
              <i className={'ti ' + invItemIcon(primeira)} aria-hidden="true" />
              <span className="inv-bag-grp-name">{grupo}</span>
              <span className="inv-bag-grp-count">{itensGrupo.length}</span>
            </div>
            <div className="inv-bag-grid">
              {itensGrupo.map(renderCard)}
            </div>
          </div>
        );
      })}
      </div>
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
  onClose, onEquipar, onDesequipar, onUsar, onAprenderMagia, onDestruir, onObservacao,
  onMoverParaContainer, onTransferir, transferError, onTransferReset,
  onVestir, onDespir,
  onRemoverDoContainer, onAbrirDetalhesFilho, contexto,
}) {
  const [confirmandoDestruir, setConfirmandoDestruir] = useState(false);
  const [confirmandoUsar, setConfirmandoUsar] = useState(false);
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
  // Pergaminho de magia: catálogo declara magia (key) + nivel_magia (nível efetivo).
  const ehPergaminhoMagia = !!(cat.magia && cat.nivel_magia != null);
  const isContainer = ehContainer(cat);
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
      title={cat.nome}
      lang={lang}
      size="md"
      extraClass="modal-detalhes"
      onClose={onClose}
    >
        {(cat.descricao || cat.efeito) && (
          <div className="det-desc">
            {cat.descricao && <p>{cat.descricao}</p>}
            {cat.efeito && <p className="det-efeito">{en ? 'Effect' : 'Efeito'}: {cat.efeito}</p>}
          </div>
        )}

        {/* ── Conteúdo do container ────────────────────────────── */}
        {isContainer && (() => {
          const { armazena, usado, tipoAceito, filhos } = capacidadeContainer(instance, todosItens, catalogoBySlug);
          const pct = armazena > 0 ? Math.min(100, (usado / armazena) * 100) : 0;
          const tipoLabel = tipoAceito === 'L'
            ? (en ? 'liters' : 'litros')
            : (en ? 'kilos' : 'quilos');
          return (
            <div className="det-container-content">

              <div className="cont-list">
                {filhos.map((it) => {
                  const fc = catalogoBySlug[it.slug];
                  const presoNoContainer = fc?.grupo === 'Consumíveis' || fc?.grupo === 'Moedas';
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
                        <button className="btn-icon btn-sm inv-act-btn" onClick={() => onRemoverDoContainer?.(it.instanceId)}
                          disabled={presoNoContainer}
                          title={presoNoContainer
                            ? (en ? 'Consumables and coins cannot be removed from containers' : 'Consumíveis e moedas não podem ser retirados do container')
                            : (en ? 'Remove from container' : 'Remover do container')}
                          aria-label={en ? 'Remove from container' : 'Remover do container'}>
                          <i className="ti ti-x" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          );
        })()}

        {/* (Armazenar em container agora é uma ação na lista abaixo) */}

        {/* ── Ações do item — Modelo C: lista descritiva ───────────── */}
        <div className="det-actions">
          {confirmandoDestruir ? (
            <div className="det-act-confirm">
              <div className="det-act-confirm-title">
                {en ? 'Destroy item' : 'Destruir item'}
              </div>
              <span className="det-act-confirm-lbl">
                {en ? 'Destroy this item permanently?' : 'Destruir este item permanentemente?'}
              </span>
              <div className="det-act-confirm-btns">
                <button className="btn-ghost btn-sm" onClick={() => setConfirmandoDestruir(false)}>
                  {en ? 'Cancel' : 'Cancelar'}
                </button>
                <button className="btn-danger btn-sm"
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
                <button className="btn-ghost btn-sm" onClick={() => setConfirmandoUsar(false)}>
                  {en ? 'Cancel' : 'Cancelar'}
                </button>
                <button className="btn-primary btn-sm"
                  onClick={() => { onUsar(instance.instanceId); onClose(); }}>
                  {en ? 'Yes, use' : 'Sim, usar'}
                </button>
              </div>
            </div>
          ) : mostrarTransferir ? (
            <div className="det-transf">
              <label htmlFor={`transf-${instance.instanceId}`}>
                {en ? 'Transfer to' : 'Transferir para'}
              </label>
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
                <button className="btn-ghost btn-sm" disabled={transferindo}
                  onClick={() => { setMostrarTransferir(false); setTransfPjId(''); onTransferReset && onTransferReset(); }}>
                  {en ? 'Cancel' : 'Cancelar'}
                </button>
                <button className="btn-primary btn-sm" disabled={transferindo || !transfPjId}
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
              <label htmlFor={`cont-${instance.instanceId}`}>
                {en ? 'Store inside' : 'Armazenar em'}
              </label>
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
                <button className="btn-ghost btn-sm"
                  onClick={() => { setMostrarArmazenar(false); setArmazContId(''); }}>
                  {en ? 'Cancel' : 'Cancelar'}
                </button>
                <button className="btn-primary btn-sm" disabled={!armazContId}
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
                    <button className="det-act det-act-primary"
                      onClick={() => onDesequipar(instance.instanceId)}>
                      <span className="det-act-lbl">{en ? 'Unequip' : 'Desequipar'}</span>
                    </button>
                  ) : (
                    <button className="det-act det-act-primary"
                      disabled={!podeEquipar}
                      onClick={() => onEquipar(instance.instanceId)}
                      title={bloqueioEquipar || ''}>
                      <span className="det-act-lbl">{en ? 'Equip' : 'Equipar'}</span>
                    </button>
                  )
                )}
                {consumivel && !equipavel && !isContainer && !ehPergaminhoMagia && (
                  <button className="det-act det-act-primary"
                    onClick={() => {
                      if (temMultiplos) onUsar(instance.instanceId);
                      else setConfirmandoUsar(true);
                    }}>
                    <span className="det-act-lbl">{en ? 'Use' : 'Usar'}</span>
                  </button>
                )}
                {acoesPesadas && ehPergaminhoMagia && (
                  <button className="det-act det-act-primary"
                    disabled={aprendendo}
                    onClick={async () => {
                      setAprendendo(true);
                      setAprenderErro(null);
                      const r = await onAprenderMagia(instance.instanceId);
                      if (r?.ok) { onClose(); return; }
                      setAprendendo(false);
                      setAprenderErro(motivoAprenderLabel(r?.motivo, en));
                    }}>
                    <i className="ti ti-sparkles" aria-hidden="true" />
                    <span className="det-act-lbl">
                      {aprendendo ? (en ? 'Learning…' : 'Aprendendo…') : (en ? 'Learn' : 'Aprender')}
                    </span>
                  </button>
                )}

                {/* Vestir / Despir */}
                {acoesPesadas && vestivel && (
                  instance.vestido ? (
                    <button className="det-act det-act-primary"
                      onClick={() => onDespir(instance.instanceId)}>
                      <span className="det-act-lbl">{en ? 'Take off' : 'Despir'}</span>
                    </button>
                  ) : (
                    <button className="det-act det-act-primary"
                      disabled={!podeVestir}
                      onClick={() => onVestir(instance.instanceId)}
                      title={bloqueioVestir || ''}>
                      <span className="det-act-lbl">{en ? 'Wear' : 'Vestir'}</span>
                    </button>
                  )
                )}

                {/* Transferir */}
                {acoesPesadas && pjsHistoria.length > 0 && !instance.vestido && (
                  <button className="det-act" onClick={() => { onTransferReset && onTransferReset(); setMostrarTransferir(true); }}>
                    <span className="det-act-lbl">{en ? 'Transfer' : 'Transferir'}</span>
                  </button>
                )}

                {/* Armazenar em */}
                {acoesPesadas && !isContainer && !instance.equipado && !instance.vestido && (
                  <button className="det-act"
                    disabled={!temOndeArmazenar}
                    onClick={() => setMostrarArmazenar(true)}
                    title={!temOndeArmazenar
                      ? (en ? 'No compatible container in inventory' : 'Nenhum recipiente compatível no inventário')
                      : ''}>
                    <span className="det-act-lbl">{en ? 'Store' : 'Armazenar'}</span>
                  </button>
                )}

                {/* Descartar — mesma linha dos demais botões */}
                <button className="det-act danger"
                  onClick={() => {
                    if (temMultiplos) onDestruir(instance.instanceId);
                    else setConfirmandoDestruir(true);
                  }}>
                  <span className="det-act-lbl">{en ? 'Descart' : 'Descartar'}</span>
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
      title={cat?.nome || containerInst?.slug}
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
                  <button className="btn-icon btn-sm inv-act-btn" onClick={() => onRemoverDoContainer(it.instanceId)}
                    disabled={presoNoContainer}
                    title={presoNoContainer
                      ? (en ? 'Consumables and coins cannot be removed from containers' : 'Consumíveis e moedas não podem ser retirados do container')
                      : (en ? 'Remove from container' : 'Remover do container')}
                    aria-label={en ? 'Remove from container' : 'Remover do container'}>
                    <i className="ti ti-package-export" aria-hidden="true" />
                  </button>
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
// em estoque. Stepper + input number + Confirmar/Cancelar.
function QuantidadeModal({ titulo, max, lang, onConfirm, onCancel }) {
  const [qtd, setQtd] = useState(1);
  const en = lang === 'en';
  // Escape já é responsabilidade do ModalShell. Mantemos só o atalho Enter=confirmar aqui.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Enter') onConfirm(qtd); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [qtd, onConfirm]);
  const dec = () => setQtd((q) => Math.max(1, q - 1));
  const inc = () => setQtd((q) => Math.min(max, q + 1));
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
        <div className="modal-qtd-stepper">
          <button className="btn-icon btn-sm" onClick={dec} disabled={qtd <= 1} aria-label="−">−</button>
          <input
            type="number"
            min="1"
            max={max}
            value={qtd}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (Number.isNaN(v)) setQtd(1);
              else setQtd(Math.max(1, Math.min(max, v)));
            }}
          />
          <button className="btn-icon btn-sm" onClick={inc} disabled={qtd >= max} aria-label="+">+</button>
          <span className="modal-qtd-max">{en ? 'of' : 'de'} {max}</span>
        </div>
    </ModalShell>
  );
}

Object.assign(window, {
  InventarioList, EquipadoBoard, VestesBoard, CofreMoedas, MoedasBoard, MoedaPills,
  CabecalhoInvLoja, InvItemsTable, DetStat, DetalhesItemModal, ContainerModal, QuantidadeModal,
  // ↓ expostos para a Loja (07-inventario/loja.jsx) consumir via window:
  fmtNum, calcCarga, invItemIcon, recipienteAceitaSlug,
});
