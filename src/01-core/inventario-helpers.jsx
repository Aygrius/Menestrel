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

// ── Leitura de tabela inteira ───────────────────────────────────────────────
// fetchTabelaPaginada — lê uma tabela INTEIRA em blocos de 1000.
//
// ⚠️ O PostgREST devolve no máximo 1000 linhas por request e NÃO avisa: a
// resposta vem 200 OK com os primeiros 1000 e ponto. Um `.select('*')` cru
// numa tabela que cresceu passa a mentir em silêncio — no caso de `itens`,
// armas e armaduras sumiriam do combate sem erro nenhum.
//
// Opções (todas opcionais):
//   colunas  string do select ('*' por padrão)
//   ordem    array de colunas, aplicadas em sequência (['grupo','nome'])
//   filtros  array de [coluna, valor] aplicados como .eq()
//
// Genérica porque as chamadas do app não têm o mesmo formato: uma filtra por
// grupo, outra pede só duas colunas, outras ordenam diferente.
// Cobertura: 01-core/paginacao.test.js.
async function fetchTabelaPaginada(tabela, opcoes) {
  const { colunas = '*', ordem = [], filtros = [] } = opcoes || {};
  const PAGE = 1000;
  let all = [];
  let from = 0;
  for (;;) {
    let q = supabaseClient.from(tabela).select(colunas);
    for (const [col, val] of filtros) q = q.eq(col, val);
    for (const col of ordem) q = q.order(col);
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) return { data: null, error };
    all = all.concat(data || []);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return { data: all, error: null };
}

// Catálogo de itens completo, na ordem canônica de exibição.
function fetchCatalogoCompleto() {
  return fetchTabelaPaginada('itens', { ordem: ['grupo', 'nome'] });
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
// pecaNoCorpo — a peça está VESTIDA no personagem?
//
// Critério ÚNICO de quem contribui com absorção/defesa. Existem dois sistemas
// paralelos de "usar" um item: equipamento (armadura/arma → `equipado` +
// `slot`) e vestimenta (`vestido` + `vesteSlot`). Estar dentro de container,
// solto na mochila ou empilhado não conta.
//
// Nasceu porque a soma de absorção usava TRÊS critérios diferentes em três
// arquivos: calcArmadura olhava `it.equipado`, calcularFicha olhava `it.slot`
// e a ficha olhava `it.slot || it.vestido`. Hoje os três dão o mesmo número
// (nenhuma das 92 Vestimentas do catálogo tem absorcao ou defesa), mas no dia
// em que uma tiver, a ficha mostraria três valores diferentes pro mesmo PJ.
function pecaNoCorpo(it) {
  return !!(it && (it.equipado || it.vestido));
}

function calcArmadura(p, catalogoBySlug) {
  if (!catalogoBySlug || !p?.inventario?.itens) return 0;
  return p.inventario.itens.reduce((sum, it) => {
    if (!pecaNoCorpo(it)) return sum;
    const cat = catalogoBySlug[it.slug];
    return sum + Number(cat?.absorcao || 0);
  }, 0);
}

/* Resistência total da armadura = durabilidade.

   Regra do usuário (11/09/2026): `absorcao` deixa de ser uma poça que
   esvazia e passa a ser um LIMIAR — golpe até o limiar não faz nada. Golpe
   acima dele gasta 1 ponto de RESISTÊNCIA. Quando a resistência zera, a
   armadura está arrebentada e o dano passa a ir direto na Energia Física.

   Soma as mesmas peças que calcArmadura soma (pecaNoCorpo), pelo mesmo
   motivo: limiar e durabilidade têm que falar do mesmo conjunto de peças,
   senão dá pra ter limiar sem durabilidade. */
function calcResistenciaArmadura(p, catalogoBySlug) {
  if (!catalogoBySlug || !p?.inventario?.itens) return 0;
  return p.inventario.itens.reduce((sum, it) => {
    if (!pecaNoCorpo(it)) return sum;
    const cat = catalogoBySlug[it.slug];
    return sum + Number(cat?.resistencia || 0);
  }, 0);
}

/* As peças de armadura no corpo, cada uma com sua durabilidade.

   A durabilidade ATUAL mora na instância do item (`it.res`); o máximo vem
   do catálogo (`itens.resistencia`). Item que nunca apanhou não tem `res`
   gravado e entra cheio.

   Existe porque o desgaste é POR PEÇA: quando um golpe fura o limiar, quem
   perde o ponto é a peça com mais resistência restante (decisão do usuário,
   11/09/2026). Sem a lista, o motor só saberia o total e não teria em quem
   descontar. */
function pecasDeArmadura(p, catalogoBySlug) {
  if (!catalogoBySlug || !p?.inventario?.itens) return [];
  return p.inventario.itens.reduce((out, it) => {
    if (!pecaNoCorpo(it)) return out;
    const max = Number(catalogoBySlug[it.slug]?.resistencia || 0);
    if (max <= 0) return out;                      // peça sem durabilidade não entra
    const atual = Number.isFinite(Number(it.res)) ? Math.max(0, Math.min(max, Number(it.res))) : max;
    out.push({ instanceId: it.instanceId, slug: it.slug, res: atual, res_max: max });
    return out;
  }, []);
}

/* Resistência de CRIATURA — derivada, porque a tabela `criaturas` não tem
   a coluna (só `absorcao`).

   O fator 2 não é chute: nas 63 armaduras do catálogo, `resistencia` é
   EXATAMENTE `absorcao * 2`, sem uma única exceção (conferido no banco em
   11/09/2026). Derivar pela mesma razão mantém um modelo só no motor e
   dispensa migration. Se um dia uma criatura precisar de durabilidade
   própria, basta a coluna existir e este fallback sair do caminho. */
const FATOR_RESISTENCIA_CRIATURA = 2;
function resistenciaDeCriatura(c) {
  if (!c) return 0;
  if (Number.isFinite(Number(c.resistencia))) return Math.max(0, Number(c.resistencia));
  return Math.max(0, Number(c.absorcao || 0)) * FATOR_RESISTENCIA_CRIATURA;
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
      slug:    it.slug,
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
// As condições vivem na escala BIDIRECIONAL -COND_LIMITE..+COND_LIMITE
// (helpers.jsx), 0 = neutro — nunca 0–100. O parse dos deltas (efeitosDoItem)
// e o clamp da condição (aplicarDeltaCondicao) são compartilhados com o
// consumo DENTRO de combate (aplicarEfeitoItemSnapshot, 12-batalha), pra que
// o mesmo item não dê números diferentes nas duas telas.
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

// efeitosDoItem — parse único de efeito_positivo/efeito_negativo de UM item,
// já com o sinal aplicado e multiplicado por `quantidade` (usar 3 cervejas
// aplica o efeito ×3). Devolve [{ scope, key, delta }].
//
// Compartilhada de propósito: quem consome o item FORA de combate
// (aplicarEfeitosItem, logo abaixo — mira pj.estado_atual) e DENTRO
// (aplicarEfeitoItemSnapshot, 12-batalha/batalha.jsx — mira o snapshot do
// participante) precisa dos MESMOS deltas. As duas funções continuam
// separadas porque os SHAPES de destino são diferentes; o que não podia
// continuar divergindo era a conta.
function efeitosDoItem(cat, quantidade) {
  const qtd = Number(quantidade) || 1;
  return [
    ...parseEfeito(cat?.efeito_positivo).map((e) => ({ ...e, sinal: 1 })),
    ...parseEfeito(cat?.efeito_negativo).map((e) => ({ ...e, sinal: -1 })),
  ].map((e) => ({ scope: e.scope, key: e.key, delta: e.valor * e.sinal * qtd }));
}

// aplicarDeltaCondicao — soma `delta` numa das 8 condições respeitando a
// escala bidirecional -COND_LIMITE..+COND_LIMITE (helpers.jsx), 0 = neutro.
//
// ⚠️ Ausente = 0 (NEUTRO), não 100. A escala 0–100 "cheio/vazio" morreu
// junto com as barras antigas; enquanto esta função ficou pra trás, um gole
// d'água ("35 Hidratação") gravava 100 e a Ficha exibia a barra saturada no
// teto +50, e efeito negativo travava no piso 0 — condição negativa era
// inalcançável por item. Cobertura: 01-core/efeitos-item.test.js.
//
// COND_LIMITE vem de helpers.jsx via window (cada fase é um módulo próprio
// sob o Vite; o `const` de lá não vaza pro escopo daqui) — mesmo padrão
// defensivo já usado em ficha.jsx e batalha.jsx.
function aplicarDeltaCondicao(atual, delta) {
  const lim = (typeof COND_LIMITE !== 'undefined' ? COND_LIMITE : null) ?? window.COND_LIMITE ?? 50;
  const base = Number.isFinite(Number(atual)) ? Number(atual) : 0;
  return Math.max(-lim, Math.min(lim, base + delta));
}

// aplicarEfeitosItem — aplica os efeitos de UM item (ver efeitosDoItem) sobre
// um estado_atual existente. `maximos` = { ef, eh, ka } — máximos derivados
// da ficha (calcularFicha), usados só pro clamp de 'vitalidade'. Sem maximos,
// assume Infinity (sem teto) — quem chama deve passar os máximos reais sempre
// que disponíveis. Retorna um NOVO objeto estado_atual (não muta o original).
/* ── O APLICADOR, sozinho ──────────────────────────────────────────
   Recebe efeitos JÁ PRONTOS — [{ scope, key, delta }] — e os escreve no
   estado_atual. Extraído de aplicarEfeitosItem em 12/09/2026, quando a MAGIA
   fora de combate passou a precisar do mesmo caminho (degrau 1,
   docs/fora-de-combate.md).

   Extrair em vez de copiar é o ponto: o clamp de poço, a escala de condição e
   o piso de zero ficam num lugar só. Item consumido e magia evocada entram na
   ficha pela mesma porta, e quando um deles estiver errado há um lugar para
   corrigir — não dois que já divergiram.

   aplicarEfeitosItem continua existindo com a mesma assinatura: quem já a
   chamava não muda nada. */
function aplicarEfeitosNaFicha(estadoAtual, efeitos, maximos) {
  if (!Array.isArray(efeitos) || efeitos.length === 0) return estadoAtual;

  const mx = maximos || {};
  const base = estadoAtual || {};
  const novo = {
    ...base,
    condicoes: { ...(base.condicoes || {}) },
    vitalidade: { ...(base.vitalidade || {}) },
  };

  for (const ef of efeitos) {
    const delta = ef.delta;
    if (ef.scope === 'condicoes') {
      novo.condicoes[ef.key] = aplicarDeltaCondicao(novo.condicoes[ef.key], delta);
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

/* A composição de sempre: item → efeitos → ficha. Assinatura intocada, para
   que os chamadores de antes de 12/09/2026 não saibam que algo mudou. */
function aplicarEfeitosItem(estadoAtual, cat, quantidade, maximos) {
  return aplicarEfeitosNaFicha(estadoAtual, efeitosDoItem(cat, quantidade), maximos);
}

Object.assign(window, {
  MOEDA_FATOR, MOEDA_ORDEM, moedasToLatao, latoesToMoedas,
  fetchTabelaPaginada, fetchCatalogoCompleto, SLOT_LABELS, normalizaRaca, getMaosRequeridas,
  getSlotsState, novoInstanceId, ehContainer, capacidadeContainer,
  podeMoverParaContainer, pecaNoCorpo, calcArmadura, AJUSTE_KEY, gerarAtaques,
  calcResistenciaArmadura, resistenciaDeCriatura, FATOR_RESISTENCIA_CRIATURA,
  pecasDeArmadura,
  EFEITO_CONDICAO_MAP, parseEfeito, efeitosDoItem, aplicarDeltaCondicao,
  aplicarEfeitosItem, aplicarEfeitosNaFicha,
});