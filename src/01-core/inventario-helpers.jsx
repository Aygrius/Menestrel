/* ============================================================
   INVENTÁRIO-HELPERS — Helpers compartilhados de domínio
   ============================================================
   Constantes e funções puras usadas por múltiplas fases:
   - Fase 7 (Inventário + Loja)
   - app.jsx: bloco [16] DarMoedasModal (usa MOEDA_ORDEM, moedasToLatao)
   - app.jsx: bloco [21] ItensList (usa latoesToMoedas)
   - Fases futuras (Personagens, Ficha, etc)

   ── Moedas ─────────────────────────────────────────────────
   - MOEDA_FATOR:    fatores de conversão (ouro=1000, prata=100,
                     cobre=10, latao=1 latões)
   - MOEDA_ORDEM:    ordem canônica de exibição
   - moedasToLatao:  objeto {ouro,prata,...} → total em latões
   - latoesToMoedas: total em latões → objeto canônico

   ── Slots de equipamento ───────────────────────────────────
   - SLOT_LABELS:        i18n PT/EN dos 8 slots
   - normalizaRaca:      normaliza raça pra pequenino/anao/outras
   - getMaosRequeridas:  quantas mãos uma arma exige p/ uma raça
   - getSlotsState:      mapa slot → instanceId atualmente equipado

   ── Inventário (instância + container) ─────────────────────
   - novoInstanceId:         gera ID único por instância (timestamp+random)
   - ehContainer:            o catálogo desse item declara armazena > 0?
   - capacidadeContainer:    {armazena, usado, livre, tipoAceito, filhos}
   - podeMoverParaContainer: valida mover item p/ container (tipo S/L
                             + espaço livre)

   ── Ficha do Personagem (Fase 11) ──────────────────────────
   - calcArmadura:   soma de absorção dos itens equipados
   - gerarAtaques:   lista de ataques derivados (armas equipadas + magias
                     com dano)

   Sem deps externas. Carregar em 01-core/, antes de qualquer
   arquivo que use esses identificadores.
   ============================================================ */

// ── Moedas ──────────────────────────────────────────────────────────────────
const MOEDA_FATOR = { ouro: 1000, prata: 100, cobre: 10, latao: 1 };
const MOEDA_ORDEM = ['ouro', 'prata', 'cobre', 'latao'];
function moedasToLatao(m) {
  return Object.entries(m || {}).reduce((s, [k, v]) => s + (MOEDA_FATOR[k] || 0) * (v || 0), 0);
}
// Helper local: latão (int) → objeto de moedas em representação canônica
function latoesToMoedas(total) {
  const t = Math.max(0, total | 0);
  return {
    ouro:  Math.floor(t / 1000),
    prata: Math.floor((t % 1000) / 100),
    cobre: Math.floor((t % 100) / 10),
    latao: t % 10,
  };
}

// ── Moedas ──────────────────────────────────────────────────────────────────
async function fetchCatalogoCompleto() {
  const PAGE = 1000;
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabaseClient
      .from('itens')
      .select('*')
      .order('grupo').order('nome')
      .range(from, from + PAGE - 1);
    if (error) return { data: null, error };
    all = all.concat(data || []);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return { data: all, error: null };
}

// ── Slots de equipamento ────────────────────────────────────────────────────
const SLOT_LABELS = {
  pt: { mao_d: 'Mão', mao_e: 'Mão', cabeca: 'Cabeça', ombros: 'Ombros', peito: 'Peito', maos: 'Mão',  bracos: 'Braços', pernas: 'Pernas', pes: 'Pés',  pescoco: 'Pescoço', orelha: 'Orelha' },
  en: { mao_d: 'Hand', mao_e: 'Hand', cabeca: 'Head',  ombros: 'Shoulders', peito: 'Chest', maos: 'Hand', bracos: 'Arms', pernas: 'Legs', pes: 'Feet', pescoco: 'Neck', orelha: 'Ear' },
};
function normalizaRaca(raca) {
  const r = (raca || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
  if (r.includes('pequen') || r.includes('halfling') || r.includes('hobbit')) return 'pequenino';
  if (r.includes('anao') || r.includes('dwarf')) return 'anao';
  return 'outras';
}
function getMaosRequeridas(cat, raca) {
  const r = normalizaRaca(raca);
  const v = r === 'pequenino' ? cat.maos_pequenino : r === 'anao' ? cat.maos_anao : cat.maos_outras;
  return v == null ? null : Number(v);
}
function getSlotsState(itens, catalogoBySlug, raca) {
  const s = { mao_d: null, mao_e: null, cabeca: null, ombros: null, peito: null, maos: null, pernas: null, pes: null };
  for (const it of (itens || [])) {
    if (!it.equipado || !it.slot) continue;
    const cat = catalogoBySlug[it.slug];
    if (!cat) continue;
    s[it.slot] = it.instanceId;
    if ((it.slot === 'mao_d' || it.slot === 'mao_e') && getMaosRequeridas(cat, raca) === 2) {
      s[it.slot === 'mao_d' ? 'mao_e' : 'mao_d'] = it.instanceId;
    }
  }
  return s;
}

// ── Instância de item ───────────────────────────────────────────────────────
function novoInstanceId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Container (nesting 1 nível, S/L exclusivos) ─────────────────────────────
function ehContainer(cat) {
  return !!(cat && cat.armazena != null && Number(cat.armazena) > 0);
}
function capacidadeContainer(containerInst, todosItens, catalogoBySlug) {
  const cat = catalogoBySlug[containerInst?.slug];
  const armazena = Number(cat?.armazena || 0);
  const tipoAceito = cat?.tipo || 'S';
  const filhos = (todosItens || []).filter((it) => it.containerId === containerInst?.instanceId);
  let usado = 0;
  for (const f of filhos) {
    const fc = catalogoBySlug[f.slug];
    if (fc?.ocupa != null) usado += Number(fc.ocupa) * f.quantidade;
  }
  return { armazena, usado, livre: Math.max(0, armazena - usado), tipoAceito, filhos };
}
function podeMoverParaContainer(itemCat, containerCat, containerInst, todosItens, catalogoBySlug) {
  if (!ehContainer(containerCat)) return { ok: false, motivo: 'não é container' };
  const tipoItem = itemCat?.tipo || 'S';
  const tipoContainer = containerCat?.tipo || 'S';
  if (tipoItem !== tipoContainer) {
    return { ok: false, motivo: tipoContainer === 'L' ? 'só aceita líquidos' : 'só aceita sólidos' };
  }
  // tipo_item: recipiente pode restringir por GRUPO do item (além do tipo S/L
  // acima). Ex.: container com tipo_item='Consumíveis' só aceita itens cujo
  // catálogo tenha grupo='Consumíveis'. NULL/vazio = sem restrição extra.
  if (containerCat?.tipo_item && itemCat?.grupo !== containerCat.tipo_item) {
    return { ok: false, motivo: `só aceita ${containerCat.tipo_item}` };
  }
  const { livre } = capacidadeContainer(containerInst, todosItens, catalogoBySlug);
  const ocupa = Number(itemCat?.ocupa || 0);
  if (ocupa > livre) return { ok: false, motivo: `sem espaço (precisa ${ocupa}, livre ${livre.toFixed(1)})` };
  return { ok: true };
}

// ── Ficha do Personagem (Fase 11) ───────────────────────────────────────────
// Soma da absorção de todos os itens equipados (campo `absorcao` do catálogo).
// Retorna 0 quando: sem catálogo, sem inventário, ou nenhum equipado tem absorção.
function calcArmadura(p, catalogoBySlug) {
  if (!catalogoBySlug || !p?.inventario?.itens) return 0;
  return p.inventario.itens.reduce((sum, it) => {
    if (!it.equipado) return sum;
    const cat = catalogoBySlug[it.slug];
    return sum + Number(cat?.absorcao || 0);
  }, 0);
}

// Mapeia siglas do `ajuste_atributo` pras chaves do objeto `atributos` da ficha.
const AJUSTE_KEY = { AGI: 'agilidade', AUR: 'aura', FOR: 'forca', PER: 'percepcao' };

// Gera a lista de ataques do PJ a partir das armas equipadas (slot mao_d/mao_e
// com `dano` no catálogo) e das magias com `dano > 0`.
// Retorna array de:
//   { origem, icone, nome, tipo, slot, alcance, ajuste, dano_l, dano_m, dano_p, dano, passos? }
// Os dano_l/m/p já vêm somados com o atributo de ajuste do PJ.
// Pré-requisitos: magiasByKey é objeto { [key]: row }, atributos é o ficha.atributos.
function gerarAtaques(p, catalogoBySlug, magiasByKey, atributos) {
  const ataques = [];

  // Armas equipadas (mão direita/esquerda) com dano declarado no catálogo.
  // Armas equipadas (mão direita/esquerda) com dano declarado no catálogo.
  for (const it of (p?.inventario?.itens || [])) {
    if (!it.equipado) continue;
    if (it.slot !== 'mao_d' && it.slot !== 'mao_e') continue;
    const cat = catalogoBySlug?.[it.slug];
    if (!cat || cat.dano == null) continue;

    const sigla  = cat.ajuste_atributo || null;
    const atrKey = sigla ? AJUSTE_KEY[sigla] : null;
    const atrVal = (atributos && atrKey) ? (atributos[atrKey] || 0) : 0;

    const entry = {
      origem:  'arma',
      icone:   '⚔',
      nome:    cat.nome || it.slug,
      tipo:    it.slot === 'mao_d' ? 'mão direita' : 'mão esquerda',
      slot:    it.slot,
      alcance: cat.alcance || 0,
      ajuste:  sigla,
      dano_l:  Number(cat.dano_l || 0) + atrVal,
      dano_m:  Number(cat.dano_m || 0) + atrVal,
      dano_p:  Number(cat.dano_p || 0) + atrVal,
      dano:    cat.dano,
    };
    ataques.push(entry);

    // Arma de duas mãos: duplica no slot oposto pra aparecer nas duas tabelas.
    if (getMaosRequeridas(cat, p?.raca) === 2) {
      const oposto = it.slot === 'mao_d' ? 'mao_e' : 'mao_d';
      ataques.push({
        ...entry,
        slot: oposto,
        tipo: oposto === 'mao_d' ? 'mão direita' : 'mão esquerda',
      });
    }
  }

  // Magias com dano > 0. Colunas que não se aplicam ficam null.
  for (const [key, passos] of Object.entries(p?.magias || {})) {
    if (!passos || passos === 0) continue;
    const m = magiasByKey?.[key];
    if (!m || m.dano == null || m.dano === 0) continue;
    ataques.push({
      origem: 'magia',
      icone:  '✦',
      nome:   m.nome || key,
      tipo:   'magia',
      passos,
      alcance: null,
      ajuste:  null,
      dano_l:  null,
      dano_m:  null,
      dano_p:  null,
      dano:    m.dano,
    });
  }

  return ataques;
}

// ── Efeitos de item (efeito_positivo / efeito_negativo do catálogo) ────────
// Formato no banco: texto livre "N Condição, N Condição, ...", ex.:
//   "35 Hidratação, 5 Temperatura, 1 Sobriedade"
// Aplicado ao USAR (consumível) ou VESTIR/DESVESTIR (vestimenta — soma ao
// vestir, reverte ao desvestir). efeito_positivo SOMA, efeito_negativo
// SUBTRAI, sempre na mesma chamada (ex.: cerveja dá +5 Energia Heroica E
// -5 Sobriedade/-1 Sono ao mesmo tempo).
//
// Cada condição cai em um dos três grupos já existentes na Ficha
// (11-ficha/ficha.jsx, pj.estado_atual):
//   'condicoes'  → estado_atual.condicoes[key], medidor fixo 0–100
//   'vitalidade' → estado_atual.vitalidade[key], medidor 0–max (max vem
//                  de ficha.derivadas: energiaFisica/energiaHeroica/karmamax)
//   'absorcao'   → especial: soma DIRETO em estado_atual.vitalidade.ar,
//                  SEM clamp de máximo (pode passar o AR normal — é um
//                  buff temporário de poção/elixir, não armadura real)
//
// Mapa label (como aparece no banco, PT, com acento) → { scope, key }.
const EFEITO_CONDICAO_MAP = {
  'Reputação':       { scope: 'condicoes',  key: 'reputacao' },
  'Sono':            { scope: 'condicoes',  key: 'animo' },
  'Sanidade':        { scope: 'condicoes',  key: 'sanidade' },
  'Saúde':           { scope: 'condicoes',  key: 'vitalidade' },
  'Hidratação':      { scope: 'condicoes',  key: 'hidratacao' },
  'Sobriedade':      { scope: 'condicoes',  key: 'euforia' },
  'Temperatura':     { scope: 'condicoes',  key: 'termorregulacao' },
  'Alimentação':     { scope: 'condicoes',  key: 'nutricao' },
  'Energia Heroica': { scope: 'vitalidade', key: 'eh' },
  'Energia Física':  { scope: 'vitalidade', key: 'ef' },
  'Karma':           { scope: 'vitalidade', key: 'ka' },
  'Absorção':        { scope: 'absorcao',   key: 'ar' },
};

// parseEfeito("35 Hidratação, 5 Temperatura") →
//   [{ scope:'condicoes', key:'hidratacao', valor:35 }, { scope:'condicoes', key:'termorregulacao', valor:5 }]
// O número pode vir ANTES ou DEPOIS do label — o catálogo usa os dois jeitos
// inconsistentemente ("35 Hidratação" vs "Reputação 1", às vezes no MESMO
// campo: "10 Hidratação, Alimentação 1"). Tenta número-antes primeiro, cai
// pro número-depois se não casar. Entradas que não casam com o vocabulário
// conhecido são ignoradas silenciosamente (não derruba o resto do parse —
// texto livre pode ganhar labels novos no catálogo antes do código ser
// atualizado).
function parseEfeito(str) {
  if (!str || typeof str !== 'string') return [];
  const out = [];
  for (const parteRaw of str.split(',')) {
    const parte = parteRaw.trim();
    if (!parte) continue;
    let valor, label;
    let m = parte.match(/^([\d]+(?:[.,]\d+)?)\s+(.+)$/); // "35 Hidratação"
    if (m) {
      valor = Number(m[1].replace(',', '.'));
      label = m[2].trim();
    } else {
      m = parte.match(/^(.+?)\s+([\d]+(?:[.,]\d+)?)$/); // "Reputação 1"
      if (!m) continue;
      label = m[1].trim();
      valor = Number(m[2].replace(',', '.'));
    }
    if (!Number.isFinite(valor)) continue;
    const info = EFEITO_CONDICAO_MAP[label];
    if (!info) continue;
    out.push({ scope: info.scope, key: info.key, valor });
  }
  return out;
}

// aplicarEfeitosItem — combina efeito_positivo (soma) e efeito_negativo
// (subtrai) de UM item, multiplicado por `quantidade` (ex.: usar 3 cervejas
// de uma vez aplica o efeito ×3), sobre um estado_atual existente.
// `maximos` = { ef, eh, ka } — máximos derivados da ficha (calcularFicha),
// usados só pro clamp de 'vitalidade'. Sem maximos, assume Infinity (sem
// teto) — quem chama deve passar os máximos reais sempre que disponíveis.
// Retorna um NOVO objeto estado_atual (não muta o original).
function aplicarEfeitosItem(estadoAtual, cat, quantidade, maximos) {
  const efeitos = [
    ...parseEfeito(cat?.efeito_positivo).map((e) => ({ ...e, sinal: 1 })),
    ...parseEfeito(cat?.efeito_negativo).map((e) => ({ ...e, sinal: -1 })),
  ];
  if (efeitos.length === 0) return estadoAtual;

  const mx = maximos || {};
  const base = estadoAtual || {};
  const novo = {
    ...base,
    condicoes: { ...(base.condicoes || {}) },
    vitalidade: { ...(base.vitalidade || {}) },
  };
  const qtd = Number(quantidade) || 1;

  for (const ef of efeitos) {
    const delta = ef.valor * ef.sinal * qtd;
    if (ef.scope === 'condicoes') {
      const atual = novo.condicoes[ef.key] ?? 100; // condições começam cheias (100) se nunca salvas
      novo.condicoes[ef.key] = Math.max(0, Math.min(100, atual + delta));
    } else if (ef.scope === 'vitalidade') {
      const max = Number(mx[ef.key]);
      const tetoOk = Number.isFinite(max) ? max : Infinity;
      const atual = novo.vitalidade[ef.key] ?? (Number.isFinite(max) ? max : 0);
      novo.vitalidade[ef.key] = Math.max(0, Math.min(tetoOk, atual + delta));
    } else if (ef.scope === 'absorcao') {
      // Sem clamp de máximo — pode passar o AR normal (buff temporário).
      // Só não deixa ir negativo.
      const atual = novo.vitalidade.ar ?? (Number.isFinite(Number(mx.ar)) ? Number(mx.ar) : 0);
      novo.vitalidade.ar = Math.max(0, atual + delta);
    }
  }
  return novo;
}

Object.assign(window, {
  MOEDA_FATOR, MOEDA_ORDEM, moedasToLatao, latoesToMoedas,
  fetchCatalogoCompleto, SLOT_LABELS, normalizaRaca, getMaosRequeridas,
  getSlotsState, novoInstanceId, ehContainer, capacidadeContainer,
  podeMoverParaContainer, calcArmadura, AJUSTE_KEY, gerarAtaques,
  EFEITO_CONDICAO_MAP, parseEfeito, aplicarEfeitosItem,
});