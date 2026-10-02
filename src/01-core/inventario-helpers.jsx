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
  const aceitos = tiposAceitos(containerCat);
  if (aceitos.length && !aceitos.includes(itemCat?.grupo)) {
    return { ok: false, motivo: `só aceita ${aceitos.join(', ')}` };
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

/* ── Bônus de SAGRAÇÃO, por item (15/09/2026) ──────────────────────
   "A magia Sagração concede bônus a equipamentos de defesa e equipamentos de
   ataque, esse bônus é permanente. [...] preciso de uma forma do mestre
   alterar o bônus manualmente." Decisões do usuário:
     • arma                → soma no DANO;
     • armadura e escudo   → soma na ABSORÇÃO;
     • valores             → 0, 1, 3, 5, 7 e 9 (o 1 entrou na correção do
                             mesmo dia — são os níveis da Sagração).

   Mora na INSTÂNCIA (`it.bonus`), não no slug: duas adagas iguais têm cada
   uma o seu, e a adaga comprada amanhã nasce comum. Substitui
   estado_atual.bonusArmas[slug], que era por slug e só de arma
   (scripts/sql/bonus-item-sagracao-2026-09-15.sql migra os valores). */
const BONUS_ITEM_VALORES = [0, 1, 3, 5, 7, 9];

function bonusDoItem(it) {
  const v = Number(it && it.bonus);
  return BONUS_ITEM_VALORES.includes(v) ? v : 0;
}

// Onde o bônus do item entra: 'dano', 'absorcao' ou null (item sem bônus).
function destinoBonusItem(cat) {
  if (!cat) return null;
  if (cat.grupo === 'Armas' && cat.dano != null) return 'dano';
  if (cat.grupo === 'Armaduras') return 'absorcao';
  return null;
}

// Próximo valor da escada 0 → 1 → 3 → 5 → 7 → 9, para cima (+1) ou para baixo (−1).
function passoBonusItem(atual, direcao) {
  const i = BONUS_ITEM_VALORES.indexOf(bonusDoItem({ bonus: atual }));
  const j = Math.max(0, Math.min(BONUS_ITEM_VALORES.length - 1, i + (direcao < 0 ? -1 : 1)));
  return BONUS_ITEM_VALORES[j];
}

// Absorção de UMA peça: a do catálogo + o bônus de Sagração da instância.
function absorcaoDaPeca(it, cat) {
  const base = Number(cat?.absorcao || 0);
  return destinoBonusItem(cat) === 'absorcao' ? base + bonusDoItem(it) : base;
}

function calcArmadura(p, catalogoBySlug) {
  if (!catalogoBySlug || !p?.inventario?.itens) return 0;
  return p.inventario.itens.reduce((sum, it) => {
    if (!pecaNoCorpo(it)) return sum;
    const cat = catalogoBySlug[it.slug];
    return sum + absorcaoDaPeca(it, cat);
  }, 0);
}

/* Resistência total da armadura = durabilidade.

   Regra do usuário (11/09/2026): `absorcao` deixa de ser uma poça que
   esvazia e passa a ser um LIMIAR — golpe até o limiar não faz nada. Golpe
   acima dele gasta 1 ponto de RESISTÊNCIA. Quando a resistência zera, a
   armadura está arrebentada e o dano passa a ir direto na Energia Física.

   Soma as mesmas peças que calcArmadura soma (pecaNoCorpo), pelo mesmo
   motivo: limiar e durabilidade têm que falar do mesmo conjunto de peças,
   senão dá pra ter limiar sem durabilidade.

   E só peça que ABSORVE (14/09/2026): arma também tem `resistencia` no
   catálogo (84 das 93), mas é a durabilidade da ARMA. O arco equipado da
   Lirael somava 11 à armadura dela (31 em vez de 20) e passava a gastar os
   pontos dos golpes que furavam o limiar. Escudo absorve, então conta. */
function pecaQueAbsorve(cat) {
  return Number(cat?.absorcao || 0) > 0;
}

function calcResistenciaArmadura(p, catalogoBySlug) {
  if (!catalogoBySlug || !p?.inventario?.itens) return 0;
  return p.inventario.itens.reduce((sum, it) => {
    if (!pecaNoCorpo(it)) return sum;
    const cat = catalogoBySlug[it.slug];
    if (!pecaQueAbsorve(cat)) return sum;
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
    if (!pecaQueAbsorve(catalogoBySlug[it.slug])) return out;   // arma não é armadura
    const max = Number(catalogoBySlug[it.slug]?.resistencia || 0);
    if (max <= 0) return out;                      // peça sem durabilidade não entra
    const atual = Number.isFinite(Number(it.res)) ? Math.max(0, Math.min(max, Number(it.res))) : max;
    out.push({ instanceId: it.instanceId, slug: it.slug, res: atual, res_max: max });
    return out;
  }, []);
}

/* ── Editar a RESISTÊNCIA total da armadura (15/09/2026) ───────────
   "Na ficha do personagem, eu consigo editar a EF, KA, etc, mas não consigo
   editar a barra de resistência das armaduras." (usuário)

   A barra não é uma pool em estado_atual: ela é a soma do `res` das peças no
   corpo. Editar o TOTAL precisa dizer de qual peça sai (ou entra) cada ponto,
   e a ordem segue o que o combate já faz:

     gastar   tira da peça MAIS INTEIRA primeiro (mesma regra de
              desgastarArmadura, 12-batalha: assim nenhuma peça quebra
              enquanto outra está nova);
     consertar enche a peça MAIS DANIFICADA primeiro — o avesso.

   Puro: recebe as peças (pecasDeArmadura) e o total desejado, devolve a lista
   com o `res` de cada uma. Total fora da faixa é preso entre 0 e a soma dos
   máximos. */
function distribuirResistencia(pecas, novoTotal) {
  const lista = (Array.isArray(pecas) ? pecas : []).map((p) => ({
    ...p,
    res: Math.max(0, Math.min(Number(p.res_max) || 0, Number(p.res) || 0)),
    res_max: Math.max(0, Number(p.res_max) || 0),
  }));
  if (lista.length === 0) return lista;
  const teto = lista.reduce((s, p) => s + p.res_max, 0);
  const alvo = Math.max(0, Math.min(teto, Math.round(Number(novoTotal) || 0)));
  let atual = lista.reduce((s, p) => s + p.res, 0);

  // Laço de um ponto por vez: são no máximo algumas dezenas, e assim a regra
  // fica idêntica à do desgaste em combate, sem conta de proporção.
  while (atual > alvo) {
    let i = -1; let maior = 0;
    lista.forEach((p, k) => { if (p.res > maior) { maior = p.res; i = k; } });
    if (i < 0) break;
    lista[i].res -= 1;
    atual -= 1;
  }
  while (atual < alvo) {
    let i = -1; let menorFalta = Infinity;
    lista.forEach((p, k) => {
      const falta = p.res_max - p.res;
      if (falta > 0 && p.res < menorFalta) { menorFalta = p.res; i = k; }
    });
    if (i < 0) break;
    lista[i].res += 1;
    atual += 1;
  }
  return lista;
}

/* Resistência de CRIATURA — derivada, porque a tabela `criaturas` não tem
   a coluna (só `absorcao`).

   O fator não é chute: nas 63 armaduras do catálogo, `resistencia` era
   EXATAMENTE `absorcao * 2`, sem uma única exceção (conferido no banco em
   11/09/2026). Em 14/09/2026 a resistência de todos os equipamentos caiu pela
   metade (scripts/sql/itens-resistencia-metade-2026-09-14.sql) e as armaduras
   passaram a ter `resistencia = absorcao` — daí o fator 1. Derivar pela mesma
   razão mantém um modelo só no motor e dispensa migration. Se um dia uma
   criatura precisar de durabilidade própria, basta a coluna existir e este
   fallback sair do caminho. */
const FATOR_RESISTENCIA_CRIATURA = 1;
function resistenciaDeCriatura(c) {
  if (!c) return 0;
  if (Number.isFinite(Number(c.resistencia))) return Math.max(0, Number(c.resistencia));
  return Math.max(0, Number(c.absorcao || 0)) * FATOR_RESISTENCIA_CRIATURA;
}

// Mapeia siglas do `ajuste_atributo` pras chaves do objeto `atributos` da ficha.
// FIS entrou em 14/09/2026 com as armas naturais (Chifre, Bico, Cauda usam Físico).
const AJUSTE_KEY = { AGI: 'agilidade', AUR: 'aura', FIS: 'fisico', FOR: 'forca', PER: 'percepcao' };

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
      // "Espada envenenada" enquanto o veneno durar (28/09/2026).
      nome:    nomeComVeneno(cat.nome || it.slug, it),
      slug:    it.slug,
      // A instância e o veneno viajam com o ataque: a batalha gasta a ação do
      // veneno NESTA arma, e o arco precisa saber que é arco.
      instanceId: it.instanceId,
      veneno:  venenoDaArma(it),
      arco:    ehArco(cat),
      tipo:    it.slot === 'mao_d' ? 'mão direita' : 'mão esquerda',
      slot:    it.slot,
      alcance: cat.alcance || 0,
      ajuste:  sigla,
      dano_l:  Number(cat.dano_l || 0) + atrVal,
      dano_m:  Number(cat.dano_m || 0) + atrVal,
      dano_p:  Number(cat.dano_p || 0) + atrVal,
      dano:    cat.dano,
      // Sagração da instância (15/09/2026). Separado de `dano`, que continua
      // sendo o do catálogo: quem soma é a batalha, junto da Força.
      bonus:   bonusDoItem(it),
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

/* ── Gravar estado_atual SEM apagar o que outra tela mudou (15/09/2026) ──
   "Alguns atributos da barra de vitalidade não estão salvando quando eu
   altero." (usuário)

   A causa é perda de atualização, não a barra: QUATRO telas escrevem
   personagens.estado_atual — a ficha (edição do Mestre e efeito de item), o
   inventário (usar/vestir), a fila de aprovação de magia e o encerramento da
   batalha — e cada uma mandava o objeto INTEIRO, montado sobre a cópia que
   carregou quando abriu. Quem grava por último apaga o que as outras fizeram
   nesse meio tempo: o Mestre mexe na barra, o jogador usa um item com a ficha
   aberta desde antes, e a barra "volta sozinha".

   A correção é gravar só o que MUDOU:
     patchDeEstado   diferença entre o estado antes e depois (só as chaves
                     tocadas, incluindo dentro de vitalidade/condicoes);
     mesclarEstado   aplica esse patch sobre uma base, sem tocar no resto;
     gravarEstadoAtual  relê a linha ANTES de escrever e mescla o patch nela.

   Continua havendo uma janela de corrida do tamanho de uma ida ao banco (o
   jeito definitivo é uma função no servidor que faça o merge em SQL), mas o
   caso real — cópia velha de minutos atrás — deixa de existir. */
const ESTADO_SUBOBJETOS = ['vitalidade', 'condicoes'];

function patchDeEstado(antes, depois) {
  const a = antes || {};
  const d = depois || {};
  const patch = {};
  Object.keys(d).forEach((k) => {
    if (ESTADO_SUBOBJETOS.includes(k)) {
      const sa = a[k] || {};
      const sd = d[k] || {};
      const sub = {};
      Object.keys(sd).forEach((kk) => { if (sd[kk] !== sa[kk]) sub[kk] = sd[kk]; });
      if (Object.keys(sub).length) patch[k] = sub;
    } else if (d[k] !== a[k]) {
      patch[k] = d[k];
    }
  });
  return patch;
}

function mesclarEstado(base, patch) {
  const b = base || {};
  const p = patch || {};
  const out = { ...b };
  Object.keys(p).forEach((k) => {
    out[k] = ESTADO_SUBOBJETOS.includes(k) ? { ...(b[k] || {}), ...(p[k] || {}) } : p[k];
  });
  return out;
}

// Lê a linha, mescla o patch e grava. Devolve { data: estadoGravado, error }.
// Patch vazio não vai ao banco.
async function gravarEstadoAtual(pjId, patch) {
  if (!pjId || !patch || Object.keys(patch).length === 0) return { data: null, error: null };
  /* try/catch porque isto é chamado de autosave e de flush de desmontagem, sem
     ninguém esperando a promessa: um throw do cliente (rede fora, stub de
     teste) viraria unhandled rejection em vez de erro tratado. */
  try {
    const { data: linha, error: erroLeitura } = await supabaseClient
      .from('personagens').select('estado_atual').eq('id', pjId).maybeSingle();
    if (erroLeitura) return { data: null, error: erroLeitura };
    const novo = mesclarEstado(linha && linha.estado_atual, patch);
    const { error } = await supabaseClient
      .from('personagens').update({ estado_atual: novo }).eq('id', pjId);
    return { data: error ? null : novo, error: error || null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/* ── Loja fechada enquanto o Mestre edita (15/09/2026) ─────────────
   "Enquanto o mestre estiver editando a loja, ela automaticamente fecha e
   bloqueia para compra dos jogadores para impedir erros." (usuário)

   A marca vive no próprio estoque_loja (jsonb): `editando_em`, carimbo de
   tempo que a tela de gestão renova enquanto está aberta e apaga ao sair.
   É um carimbo, e não um booleano, porque aba fechada no tapa não avisa
   ninguém: sem renovação o cadeado cai sozinho em LOJA_EDICAO_TTL_MS. */
const LOJA_EDICAO_TTL_MS = 3 * 60 * 1000;

function lojaEmEdicao(estoqueLoja, agora) {
  const marca = estoqueLoja && !Array.isArray(estoqueLoja) ? estoqueLoja.editando_em : null;
  if (!marca) return false;
  const t = Date.parse(marca);
  if (!Number.isFinite(t)) return false;
  const ref = agora ? (agora instanceof Date ? agora.getTime() : Number(agora)) : Date.now();
  return ref - t < LOJA_EDICAO_TTL_MS;
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
/* NOMES NOVOS (27/09/2026): as barras dizem o MAL e vão de 0 (ideal) a 100.
   "Reduz 35 de Sede" melhora; "Aumenta 20 de Vício" piora. Frio e Calor são
   os dois lados da Temperatura (condicoesComDelta cuida do sinal).
   Os rótulos ANTIGOS ficam, com `inverte`: "Aumenta 35 de Hidratação" ainda
   quer dizer matar a sede. Texto de item de campanha que ninguém reescreveu
   continua funcionando do jeito que foi pensado. */
const EFEITO_CONDICAO_MAP = {
  'Doença':          { scope: 'condicoes',  key: 'vitalidade' },
  'Sono':            { scope: 'condicoes',  key: 'animo' },
  'Sede':            { scope: 'condicoes',  key: 'hidratacao' },
  'Fome':            { scope: 'condicoes',  key: 'nutricao' },
  'Vício':           { scope: 'condicoes',  key: 'euforia' },
  'Loucura':         { scope: 'condicoes',  key: 'sanidade' },
  'Desonra':         { scope: 'condicoes',  key: 'reputacao' },
  'Frio':            { scope: 'condicoes',  key: 'frio' },
  'Calor':           { scope: 'condicoes',  key: 'calor' },
  'Reputação':       { scope: 'condicoes',  key: 'reputacao', inverte: true },
  'Sanidade':        { scope: 'condicoes',  key: 'sanidade', inverte: true },
  'Saúde':           { scope: 'condicoes',  key: 'vitalidade', inverte: true },
  'Hidratação':      { scope: 'condicoes',  key: 'hidratacao', inverte: true },
  'Sobriedade':      { scope: 'condicoes',  key: 'euforia', inverte: true },
  'Temperatura':     { scope: 'condicoes',  key: 'termorregulacao' },
  'Alimentação':     { scope: 'condicoes',  key: 'nutricao', inverte: true },
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
/* O catálogo escreve em PROSA (leitura do banco, 15/09/2026):

     "Aumenta 35 de Hidratação e 1 de Sobriedade."
     "Diminui 50 de Sanidade, 25 de Sobriedade e 5 de Reputação."

   e NENHUM dos 140 itens com efeito usa mais a lista curta "35 Hidratação".
   O parser antigo só entendia a lista curta, então o verbo no começo e o
   " e " no meio faziam TODO item do catálogo aplicar efeito nenhum, calado —
   "usar item não está calculando corretamente" (usuário, 15/09/2026). Os
   testes não pegaram porque as fixtures deles estavam no formato curto.

   O que este parse aceita agora:
     • verbo na frente (Aumenta/Diminui/Restaura/Reduz…), que é ignorado: o
       SINAL vem do CAMPO (efeito_positivo soma, efeito_negativo subtrai);
     • separação por vírgula, ponto-e-vírgula ou " e ";
     • "de" antes do rótulo, inclusive colado ("10 deTemperatura", que é
       como dois chapéus estão gravados);
     • rótulo sem acento ou com caixa diferente;
     • o formato curto antigo, nas duas ordens ("35 Hidratação", "Reputação 1").
   Parte que não casa é ignorada, como antes: texto livre pode ganhar rótulo
   novo no catálogo antes de o código aprender. */
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
// Rótulo normalizado → { scope, key }, para casar sem depender de acento/caixa.
const EFEITO_CONDICAO_NORM = Object.entries(EFEITO_CONDICAO_MAP)
  .reduce((acc, [label, info]) => { acc[semAcento(label)] = info; return acc; }, {});
const RE_VERBO = /^(aumenta|aumente|adiciona|restaura|recupera|soma|ganha|causa|diminui|dimiuni|diminua|reduz|reduza|perde|subtrai|remove|cura|protege)\b/i;
/* O SINAL VEM DO VERBO (27/09/2026). Com as barras de mal (0..100), "Reduz 35
   de Sede" mora no efeito POSITIVO e tira da barra — o campo não diz mais o
   sinal sozinho. O verbo vale para as partes seguintes até aparecer outro:
   "Reduz 35 de Sede e 5 de Calor". Sem verbo, vale o campo, como antes. */
const SINAL_DO_VERBO = {
  aumenta: 1, aumente: 1, adiciona: 1, restaura: 1, recupera: 1, soma: 1, ganha: 1, causa: 1,
  diminui: -1, dimiuni: -1, diminua: -1, reduz: -1, reduza: -1, perde: -1, subtrai: -1, remove: -1, cura: -1,
  protege: 'protecao',
};

function parseEfeito(str) {
  if (!str || typeof str !== 'string') return [];
  const out = [];
  let verboAtual = null;   // o sinal do último verbo visto (vale para as partes seguintes)
  // " e " separa pares como a vírgula; nenhum rótulo do mapa contém " e "
  // solto ("Energia Heroica" tem a palavra colada, não isolada).
  for (const parteRaw of str.split(/,|;|\se\s/i)) {
    let parte = parteRaw.replace(/[.!]+\s*$/, '').trim();
    if (!parte) continue;
    const mv = parte.match(RE_VERBO);
    if (mv) verboAtual = SINAL_DO_VERBO[mv[1].toLowerCase()] ?? null;
    parte = parte.replace(RE_VERBO, '').trim();
    if (!parte) continue;
    let valor, label;
    let m = parte.match(/^([\d]+(?:[.,]\d+)?)\s*(.+)$/);   // "35 Hidratação" / "35 de Hidratação"
    if (m) {
      valor = Number(m[1].replace(',', '.'));
      label = m[2];
    } else {
      m = parte.match(/^(.+?)\s+([\d]+(?:[.,]\d+)?)$/);    // "Reputação 1"
      if (!m) continue;
      label = m[1];
      valor = Number(m[2].replace(',', '.'));
    }
    if (!Number.isFinite(valor)) continue;
    // "de Hidratação" e "deTemperatura" (sem espaço, como está no banco).
    const info = EFEITO_CONDICAO_NORM[semAcento(String(label).replace(/^de\s*/i, ''))];
    if (!info) continue;
    if (verboAtual === 'protecao') {
      out.push({ scope: 'protecao', key: info.key === 'termorregulacao' ? 'frio' : info.key, valor });
      continue;
    }
    out.push({ scope: info.scope, key: info.key, valor, verbo: verboAtual, inverte: !!info.inverte });
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
  // Sinal: o do verbo; sem verbo, o do campo (positivo soma, negativo subtrai).
  // Rótulo antigo de barra (inverte) vira o contrário: "+35 Hidratação" = −35 de Sede.
  const doCampo = (e, campo) => {
    const s = (e.verbo === 1 || e.verbo === -1) ? e.verbo : campo;
    return e.inverte ? -s : s;
  };
  return [
    ...parseEfeito(cat?.efeito_positivo).map((e) => ({ ...e, sinal: doCampo(e, 1) })),
    ...parseEfeito(cat?.efeito_negativo).map((e) => ({ ...e, sinal: doCampo(e, -1) })),
  ].filter((e) => e.scope !== 'protecao')
    .map((e) => ({ scope: e.scope, key: e.key, delta: e.valor * e.sinal * qtd }));
}

/* PROTEÇÃO DAS VESTIMENTAS (27/09/2026, decisão do usuário): "Protege 25 de
   Frio" limita a barra de Frio a 75 (teto, desde 27/09/2026 — antes
   descontava 25) enquanto a peça está VESTIDA. Nada é
   gravado na ficha — tirou a roupa, a proteção some. { chaveDaBarra: total } */
function protecoesDoItem(cat) {
  const out = {};
  [cat && cat.efeito_positivo, cat && cat.efeito_negativo].forEach((txt) => {
    parseEfeito(txt).forEach((e) => {
      if (e.scope !== 'protecao') return;
      out[e.key] = (out[e.key] || 0) + e.valor;
    });
  });
  return out;
}
function protecoesVestidas(itens, catalogoBySlug) {
  const out = {};
  (Array.isArray(itens) ? itens : []).forEach((it) => {
    if (!it || !(it.vestido || it.equipado)) return;
    const prot = protecoesDoItem(catalogoBySlug && catalogoBySlug[it.slug]);
    Object.entries(prot).forEach(([k, v]) => { out[k] = (out[k] || 0) + v; });
  });
  return out;
}

/* O delta numa barra, já com a escala nova: 0..100, e Frio/Calor mexendo na
   Temperatura (−100..+100). "Reduz 20 de Frio" aquece até o zero, não passa
   para o calor; "Aumenta 20 de Frio" esfria. Devolve um NOVO objeto. */
function condicoesComDelta(condicoes, key, delta) {
  const c = { ...(condicoes || {}) };
  const d = Number(delta) || 0;
  const trava = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
  if (key === 'frio' || key === 'calor' || key === 'termorregulacao') {
    let t = Number(c.termorregulacao) || 0;
    if (key === 'termorregulacao') t += d;
    else if (key === 'calor') t = d >= 0 ? t + d : (t > 0 ? Math.max(0, t + d) : t);
    else t = d >= 0 ? t - d : (t < 0 ? Math.min(0, t - d) : t);
    c.termorregulacao = trava(t, -100, 100);
    return c;
  }
  c[key] = trava((Number(c[key]) || 0) + d, 0, 100);
  return c;
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
// Compat: uma barra simples (0..100). Frio/Calor passam por condicoesComDelta.
function aplicarDeltaCondicao(atual, delta) {
  const base = Number.isFinite(Number(atual)) ? Number(atual) : 0;
  return Math.max(0, Math.min(100, base + (Number(delta) || 0)));
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
      novo.condicoes = condicoesComDelta(novo.condicoes, ef.key, delta);
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

/* Desfaz o que aplicarEfeitosItem fez — o DESPIR de uma vestimenta. Nega os
   deltas (27/09/2026). Antes se trocava efeito_positivo por efeito_negativo,
   o que parou de inverter quando o sinal passou a vir do VERBO ("Aumenta 1
   de Desonra" continua "Aumenta" no outro campo). */
function desfazerEfeitosItem(estadoAtual, cat, quantidade, maximos) {
  const efs = efeitosDoItem(cat, quantidade).map((e) => ({ ...e, delta: -e.delta }));
  return aplicarEfeitosNaFicha(estadoAtual, efs, maximos);
}

/* FLECHA (14/09/2026): "O item flecha é usado automaticamente ao atacar usando
   arco, remova o botão usar do item flecha no inventário." É consumível no
   catálogo (grupo Consumíveis), mas não se USA pela mão: quem gasta é o ataque
   com arco. Sai de todo lugar que oferece "Usar" — a janela do item, os atalhos
   da ficha e a aba Item da batalha.

   Pelo nome, sem acento e sem caixa: o catálogo tem Flecha, Flecha I, III e V
   (slugs flecha, flecha_i…). "Pergaminho Flecha Divina" é magia, não munição,
   e não casa porque o nome não COMEÇA com "flecha". */
function ehFlecha(cat) {
  if (!cat) return false;
  const nome = String(cat.nome || cat.slug || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return /^flechas?(\s|_|$)/.test(nome);
}

/* ============================== MUNIÇÃO E VENENO (28/09/2026) ==============================
   "Itens venenosos (Blueta, Leopis, Theonia) podem ser usados em armas e
    flechas, que se tornam (flecha envenenada, espada envenenada, etc). A
    flecha só pode ser usada uma vez, mas a arma aplica o efeito nas próximas
    15 ações (que persiste entre combates diferentes)." (usuário)

   Decisões do usuário no mesmo dia:
     • 1 dose de veneno = 1 flecha envenenada;
     • munição completa: todo ataque com ARCO gasta uma flecha, e sem flecha
       o arco não ataca;
     • o veneno só age se o golpe chegar à EF (passou pela EH e pela
       armadura), e o que ele faz é tirar Energia Física.

   A FLECHA envenenada é item do catálogo (flecha_envenenada_<veneno>): pilha
   própria, que o inventário, a loja e a transferência já sabem tratar. A
   ARMA envenenada é a própria instância com `veneno` = { slug, nome, ef,
   acoes } — mora no inventário, então atravessa combates sem mais nada. */
const VENENO_ACOES_ARMA = 15;
// Veneno → a flecha que ele unta.
const FLECHA_DO_VENENO = {
  secrecao_blueta: 'flecha_envenenada_blueta',
  secrecao_leopis: 'flecha_envenenada_leopis',
  secrecao_theonia: 'flecha_envenenada_theonia',
};
function ehVenenoDeArma(cat) {
  return !!(cat && FLECHA_DO_VENENO[cat.slug]);
}
// O arco é a arma que dispara flecha (a besta e a arlabesta usariam virote,
// que o catálogo não tem). Pelo slug, como o ehFlecha é pelo nome.
function ehArco(cat) {
  return !!(cat && /^arco(_|$)/.test(String(cat.slug || '')));
}
// "Diminui 5 de Energia Física; aumenta 50 de Doença." → 5. Só a EF: é o
// que o veneno faz no golpe (decisão do usuário).
function venenoEfDoItem(cat) {
  const m = /diminui\s+(\d+)\s+de\s+energia\s+f[ií]sica/i.exec(String((cat && cat.efeito_negativo) || ''));
  return m ? Number(m[1]) : 0;
}
// Arma que aceita veneno: arma de verdade, que não seja arco (quem leva o
// veneno no arco é a flecha).
function armaAceitaVeneno(cat) {
  return !!(cat && cat.grupo === 'Armas' && cat.categoria_equip === 'arma' && !ehArco(cat));
}
// Veneno ainda ativo na instância da arma (ações > 0), ou null.
function venenoDaArma(it) {
  const v = it && it.veneno;
  return v && Number(v.acoes) > 0 && Number(v.ef) > 0 ? v : null;
}
/* "Espada envenenada", "Punhal envenenado". O gênero sai da primeira palavra:
   terminada em -a é feminina, mais as femininas que não terminam em -a. */
const FEMININAS_SEM_A = new Set(['foice', 'rede']);
function nomeComVeneno(nome, it) {
  if (!venenoDaArma(it)) return nome;
  const primeira = String(nome || '').trim().split(/\s+/)[0]
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const fem = primeira.endsWith('a') || FEMININAS_SEM_A.has(primeira);
  return `${nome} ${fem ? 'envenenada' : 'envenenado'}`;
}

/* Aplica 1+ doses do veneno `venenoId` na instância `alvoId` (pura).
   Arma: gasta 1 dose e a arma passa a carregar o veneno por 15 ações (troca
   o que houver). Flecha: `qtd` doses viram `qtd` flechas envenenadas, na
   MESMA pilha/recipiente das flechas de origem. Devolve { ok, itens } ou
   { ok:false, motivo }. */
function envenenarNoInventario(itens, venenoId, alvoId, qtd, catalogoBySlug, novoId) {
  const lista = Array.isArray(itens) ? itens : [];
  const veneno = lista.find((x) => x && x.instanceId === venenoId);
  const alvo = lista.find((x) => x && x.instanceId === alvoId);
  const catV = veneno && catalogoBySlug[veneno.slug];
  const catA = alvo && catalogoBySlug[alvo.slug];
  if (!veneno || !ehVenenoDeArma(catV)) return { ok: false, motivo: 'nao_e_veneno' };
  if (!alvo || !catA) return { ok: false, motivo: 'alvo_invalido' };
  const doses = Number(veneno.quantidade) || 0;
  const baixarVeneno = (arr, n) => arr
    .map((x) => (x === veneno ? { ...x, quantidade: doses - n } : x))
    .filter((x) => !(x.instanceId === venenoId && x.quantidade <= 0));

  if (armaAceitaVeneno(catA)) {
    const novoVeneno = { slug: catV.slug, nome: catV.nome, ef: venenoEfDoItem(catV), acoes: VENENO_ACOES_ARMA };
    const comArma = lista.map((x) => (x === alvo ? { ...x, veneno: novoVeneno } : x));
    return { ok: true, itens: baixarVeneno(comArma, 1) };
  }
  if (catA.slug === 'flecha') {
    const n = Math.min(Math.max(1, Math.floor(Number(qtd) || 1)), doses, Number(alvo.quantidade) || 0);
    if (n < 1) return { ok: false, motivo: 'quantidade_invalida' };
    const slugNova = FLECHA_DO_VENENO[catV.slug];
    let out = baixarVeneno(lista, n)
      .map((x) => (x === alvo ? { ...x, quantidade: (Number(alvo.quantidade) || 0) - n } : x))
      .filter((x) => !(x.instanceId === alvoId && x.quantidade <= 0));
    const lugar = alvo.containerId || null;
    const pilha = out.find((x) => x.slug === slugNova && (x.containerId || null) === lugar && !x.equipado && !x.vestido);
    if (pilha) out = out.map((x) => (x === pilha ? { ...x, quantidade: (Number(x.quantidade) || 0) + n } : x));
    else out = [...out, { instanceId: (novoId || novoInstanceId)(), slug: slugNova, quantidade: n,
      equipado: false, slot: null, containerId: lugar, observacao: null }];
    return { ok: true, itens: out, quantidade: n };
  }
  return { ok: false, motivo: 'alvo_invalido' };
}

/* As flechas que o PJ carrega, por tipo (em qualquer recipiente): o que o
   seletor do arco oferece na batalha. [{ slug, nome, quantidade, venenoEf }] */
function flechasNoInventario(itens, catalogoBySlug) {
  const por = {};
  (Array.isArray(itens) ? itens : []).forEach((it) => {
    const cat = it && catalogoBySlug && catalogoBySlug[it.slug];
    if (!cat || !ehFlecha(cat) || !((Number(it.quantidade) || 0) > 0)) return;
    if (!por[it.slug]) {
      // "Flecha Envenenada (Blueta)" → "Blueta": o nome do veneno, para a mesa.
      const venenoNome = (/\(([^)]+)\)/.exec(cat.nome || '') || [])[1] || null;
      por[it.slug] = { slug: it.slug, nome: cat.nome || it.slug, quantidade: 0, venenoEf: venenoEfDoItem(cat), venenoNome };
    }
    por[it.slug].quantidade += Number(it.quantidade) || 0;
  });
  // A comum primeiro; as envenenadas depois, pelo nome.
  return Object.values(por).sort((a, b) => (a.venenoEf - b.venenoEf) || a.nome.localeCompare(b.nome, 'pt'));
}

/* ============================== ITENS DO RITUAL (28/09/2026) ==============================
   "Magias do tipo 'Ritual' consomem os itens necessários automaticamente do
    inventário, se o evocador não tiver os itens, ele será avisado." (usuário)

   O texto do catálogo é "Vela (7), Hidromel (1), Sangue Demoníaco (1)". Duas
   variações existem: alternativa ("Quartzo (1) ou Safira (1)" — basta uma) e
   quantidade "(Variável)", que vale 1 (o Mestre decide o resto na mesa).
   O item casa pelo NOME do catálogo, sem acento e sem caixa. */
const normRitual = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
function itensDoRitual(texto) {
  return String(texto || '').split(',').map((parte) => parte.trim()).filter(Boolean).map((parte) => ({
    opcoes: parte.split(/\s+ou\s+/i).map((op) => {
      const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(op.trim());
      const nome = (m ? m[1] : op).trim();
      const n = m ? parseInt(m[2], 10) : NaN;
      return { nome, qtd: Number.isFinite(n) && n > 0 ? n : 1 };
    }).filter((op) => op.nome),
  })).filter((g) => g.opcoes.length);
}
// Quantas unidades do item de nome `nome` o inventário tem, e em quais slugs.
function contarPorNome(itens, nome, catalogoBySlug) {
  const alvo = normRitual(nome);
  let total = 0;
  const slugs = new Set();
  (Array.isArray(itens) ? itens : []).forEach((it) => {
    const cat = it && catalogoBySlug && catalogoBySlug[it.slug];
    if (!cat || normRitual(cat.nome) !== alvo || it.equipado || it.vestido) return;
    total += Number(it.quantidade) || 0;
    slugs.add(it.slug);
  });
  return { total, slugs: [...slugs] };
}
/* Confere o ritual contra o inventário. Para cada grupo, escolhe a primeira
   alternativa que o PJ tem na quantidade pedida. Devolve
   { ok, faltam: [{ nome, precisa, tem }], gastos: [{ nome, qtd, slugs }] }. */
function conferirItensDoRitual(texto, itens, catalogoBySlug) {
  const faltam = [];
  const gastos = [];
  itensDoRitual(texto).forEach((g) => {
    const achada = g.opcoes.map((op) => ({ op, c: contarPorNome(itens, op.nome, catalogoBySlug) }))
      .find(({ op, c }) => c.total >= op.qtd);
    if (achada) { gastos.push({ nome: achada.op.nome, qtd: achada.op.qtd, slugs: achada.c.slugs }); return; }
    const op = g.opcoes[0];
    faltam.push({ nome: g.opcoes.map((o) => o.nome).join(' ou '), precisa: op.qtd,
      tem: contarPorNome(itens, op.nome, catalogoBySlug).total });
  });
  return { ok: faltam.length === 0, faltam, gastos };
}
/* Tira do inventário o que o ritual gasta (pura). Só consome se nada falta:
   ritual pela metade não existe. Devolve { ok, itens, faltam }. */
function consumirItensDoRitual(itens, texto, catalogoBySlug) {
  const conf = conferirItensDoRitual(texto, itens, catalogoBySlug);
  if (!conf.ok) return { ok: false, itens, faltam: conf.faltam };
  let out = Array.isArray(itens) ? [...itens] : [];
  conf.gastos.forEach(({ qtd, slugs }) => {
    let resta = qtd;
    out = out.map((it) => {
      if (resta <= 0 || !it || !slugs.includes(it.slug) || it.equipado || it.vestido) return it;
      const q = Number(it.quantidade) || 0;
      const baixa = Math.min(q, resta);
      resta -= baixa;
      return { ...it, quantidade: q - baixa };
    }).filter((it) => !it || !slugs.includes(it.slug) || (Number(it.quantidade) || 0) > 0);
  });
  return { ok: true, itens: out, faltam: [] };
}

/* Gasta 1 ação do veneno da arma `instanceId` (pura). Chegou a 0, o veneno
   sai da instância e a arma volta a ser só a arma. */
function gastarAcaoDoVeneno(itens, instanceId) {
  return (Array.isArray(itens) ? itens : []).map((x) => {
    if (!x || x.instanceId !== instanceId || !x.veneno) return x;
    const acoes = (Number(x.veneno.acoes) || 0) - 1;
    if (acoes > 0) return { ...x, veneno: { ...x.veneno, acoes } };
    const { veneno, ...semVeneno } = x;
    return semVeneno;
  });
}

/* ============================== Item novo no inventário (25/09/2026) ==============================
   O inventário inteiro depois de receber `qtd` de `slug`: soma numa pilha
   SOLTA igual (fora de recipiente, slot, equipado e vestido) ou cria a
   instância — a mesma regra do preparar animal e do preparar carne. Nasceu
   para o saque da batalha, que grava no PJ de fora do InventarioList.
   Preserva o resto do jsonb (moedas etc.). */
function adicionarAoInventario(inventario, slug, qtd, novoId) {
  const inv = inventario || {};
  const itens = Array.isArray(inv.itens) ? inv.itens : [];
  const n = Math.max(1, Math.trunc(Number(qtd) || 1));
  const pilha = itens.find((x) => x && x.slug === slug && !x.containerId && !x.slot && !x.equipado && !x.vestido);
  if (pilha) {
    return { ...inv, itens: itens.map((x) => (x === pilha ? { ...x, quantidade: (Number(x.quantidade) || 0) + n } : x)) };
  }
  return { ...inv, itens: [...itens, {
    instanceId: (novoId || novoInstanceId)(), slug, quantidade: n,
    equipado: false, slot: null, containerId: null, observacao: null,
  }] };
}

/* ============================== Busca de item (24/09/2026) ==============================
   "A barra de pesquisa de item deve buscar a descrição também." Uma regra
   para todas as buscas de item (bestiário, itens de campanha, inventário,
   loja, estoque da loja), a mesma que o catálogo da tela da história já
   usava: sem acento e sem caixa, e cada palavra digitada precisa aparecer no
   nome OU na descrição. `reserva` é o texto quando não há catálogo (slug). */
const _semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function itemCasaBusca(cat, busca, reserva) {
  const termos = _semAcento(busca).split(/\s+/).filter(Boolean);
  if (termos.length === 0) return true;
  const texto = _semAcento(cat ? `${cat.nome || ''} ${cat.descricao || ''}` : reserva);
  return termos.every((t) => texto.includes(t));
}

/* ============================== Preparar carne (24/09/2026) ==============================
   "Os itens Carne, Carne Celestial, etc. devem ter um botão para os
    personagens prepararem o alimento." 1 carne vira Ração, 2 viram Refeição,
   3 viram Banquete. As carnes especiais seguem as MESMAS quantidades, mas cada
   uma tem os pratos próprios (scripts/sql/refeicoes-especiais-2026-09-24.sql). */
const RECEITAS_CARNE = {
  carne:           ['racao',           'refeicao',           'banquete'],
  carne_celestial: ['racao_sagrada',   'refeicao_sagrada',   'banquete_sagrado'],
  carne_demoniaca: ['racao_profana',   'refeicao_profana',   'banquete_profano'],
  carne_draconica: ['racao_elemental', 'refeicao_elemental', 'banquete_elemental'],
  carne_mistica:   ['racao_magica',    'refeicao_magica',    'banquete_magico'],
};

// [{ resultado: slug, custo: carnes }] — vazio para o que não é carne.
function receitasDaCarne(slug) {
  const pratos = RECEITAS_CARNE[slug];
  return pratos ? pratos.map((resultado, i) => ({ resultado, custo: i + 1 })) : [];
}

// Quantas unidades daquela carne o personagem tem, somando todas as pilhas.
function carneDisponivel(itens, slug) {
  return (itens || []).reduce((s, it) => s + (it && it.slug === slug ? (Number(it.quantidade) || 0) : 0), 0);
}

/* A lista de itens depois de preparar \`resultado\` a partir da pilha clicada.
   Gasta primeiro a pilha clicada, completa com as outras pilhas da mesma
   carne, e acumula o prato numa pilha igual solta na bolsa (mesma regra do
   preparar animal). Devolve null quando não dá: carne insuficiente ou prato
   que não é receita daquela carne. */
function prepararCarne(itens, instanceId, resultado, novoId) {
  const lista = itens || [];
  const clicado = lista.find((x) => x.instanceId === instanceId);
  if (!clicado) return null;
  const receita = receitasDaCarne(clicado.slug).find((r) => r.resultado === resultado);
  if (!receita || carneDisponivel(lista, clicado.slug) < receita.custo) return null;

  let falta = receita.custo;
  const ordem = [clicado, ...lista.filter((x) => x !== clicado && x.slug === clicado.slug)];
  const gasto = new Map();
  ordem.forEach((x) => {
    if (falta <= 0) return;
    const tira = Math.min(falta, Number(x.quantidade) || 0);
    gasto.set(x.instanceId, tira);
    falta -= tira;
  });
  const restantes = lista
    .map((x) => (gasto.has(x.instanceId) ? { ...x, quantidade: x.quantidade - gasto.get(x.instanceId) } : x))
    .filter((x) => x.quantidade > 0);

  const pilha = restantes.find((x) => x.slug === resultado && !x.containerId && !x.slot && !x.equipado && !x.vestido);
  if (pilha) {
    return restantes.map((x) => (x === pilha ? { ...x, quantidade: x.quantidade + 1 } : x));
  }
  return [...restantes, {
    instanceId: (novoId || novoInstanceId)(), slug: resultado, quantidade: 1,
    equipado: false, slot: null, containerId: null, observacao: null,
  }];
}

/* tiposAceitos — os grupos que um recipiente aceita (itens.tipo_item). Desde
   27/09/2026 pode ser mais de um, separados por vírgula ("Consumíveis,
   Moedas"). Lista vazia = aceita qualquer grupo. */
function tiposAceitos(containerCat) {
  return String((containerCat && containerCat.tipo_item) || '')
    .split(',').map((t) => t.trim()).filter(Boolean);
}
Object.assign(window, { tiposAceitos });

Object.assign(window, { protecoesDoItem, protecoesVestidas, condicoesComDelta, desfazerEfeitosItem });
Object.assign(window, {
  itemCasaBusca, adicionarAoInventario,
  RECEITAS_CARNE, receitasDaCarne, carneDisponivel, prepararCarne,
  ehFlecha, ehArco, ehVenenoDeArma, venenoEfDoItem, armaAceitaVeneno, venenoDaArma, nomeComVeneno,
  envenenarNoInventario, flechasNoInventario, gastarAcaoDoVeneno, FLECHA_DO_VENENO, VENENO_ACOES_ARMA,
  itensDoRitual, conferirItensDoRitual, consumirItensDoRitual,
  MOEDA_FATOR, MOEDA_ORDEM, moedasToLatao, latoesToMoedas,
  fetchTabelaPaginada, fetchCatalogoCompleto, SLOT_LABELS, normalizaRaca, getMaosRequeridas,
  getSlotsState, novoInstanceId, ehContainer, capacidadeContainer,
  podeMoverParaContainer, pecaNoCorpo, calcArmadura, AJUSTE_KEY, gerarAtaques,
  BONUS_ITEM_VALORES, bonusDoItem, destinoBonusItem, passoBonusItem, absorcaoDaPeca,
  patchDeEstado, mesclarEstado, gravarEstadoAtual,
  LOJA_EDICAO_TTL_MS, lojaEmEdicao,
  calcResistenciaArmadura, resistenciaDeCriatura, FATOR_RESISTENCIA_CRIATURA,
  pecasDeArmadura, distribuirResistencia,
  EFEITO_CONDICAO_MAP, parseEfeito, efeitosDoItem, aplicarDeltaCondicao,
  aplicarEfeitosItem, aplicarEfeitosNaFicha,
});