/* ============================================================
   FÓRMULAS DERIVADAS DE CRIATURA
   ============================================================
   Puras — sem React, banco ou catálogo carregado por conta própria — pra
   serem testáveis sem renderizar nada, e pra que o editor de catálogo e o
   recálculo em lote usem a MESMA conta.

   REFORMA DE 14/09/2026 (usuário). "Os campos Ataque, Energia Física, Energia
   Heroica, Tipo de Armadura, Absorção, Defesa, Velocidade, L, M, P e Dano 100%
   são calculados automaticamente com base nas informações inseridas. Por isso
   deve ser possível equipar a criatura com armas e armaduras."

     EF = 2·√Peso + Físico            (arredondado pra cima: a coluna é inteira)
     EH = (12 + Aura) × Estágio
     RF = Estágio + Físico
     RM = Estágio + Aura
     VB = (Físico + Agilidade) × Estágio

   E o que vem do EQUIPAMENTO segue a conta do PERSONAGEM (decisão do usuário):
     • Absorção = soma da absorção das peças equipadas;
     • Defesa   = soma da defesa das peças + Agilidade;
     • Tipo     = o do peitoral (slot 'peito'); sem peitoral, Leve;
     • Ataque   = a primeira arma equipada (sem limite de armas desde 15/09/2026);
     • L/M/P    = dano_l/m/p da arma + o atributo de ajuste dela;
     • Dano 100% = dano da arma + Força.
   Sem arma não há ataque: as armas NATURAIS (Presas, Garras…) entram no
   catálogo de itens e são equipadas como qualquer outra — antes eram uma
   tabela fechada de offsets (ataques-criatura.jsx) que não sai mais daqui.

   O que saiu: a EH por coletivo (Grupo Grande 10…Solitário 21), a couraça
   natural pelo Físico (absorção Físico×5, defesa Agilidade+8), a velocidade
   (Agilidade+Estágio)×Percepção e o dano por faixa de peso.
   ============================================================ */

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const teto = (v) => Math.ceil(v - 1e-9) || 0;   // margem contra ruído de ponto flutuante; `|| 0` normaliza -0

// EF = ROUNDUP(2·√peso + Físico)
function energiaFisica({ peso, fisico } = {}) {
  return teto(2 * Math.sqrt(Math.max(0, num(peso))) + num(fisico));
}

// EH = (12 + Aura) × Estágio
const EH_BASE = 12;
function energiaHeroica({ aura, estagio } = {}) {
  return teto((EH_BASE + num(aura)) * num(estagio));
}

// RF = Estágio + Físico · RM = Estágio + Aura. Sem piso aqui: o piso 0 de
// combate é do motor (resistenciasBase, 01-core/game-data.jsx), que usa a
// mesma conta. Não há coluna no banco — o editor só mostra.
function resistenciaFisica({ estagio, fisico } = {}) { return num(estagio) + num(fisico); }
function resistenciaMagica({ estagio, aura } = {}) { return num(estagio) + num(aura); }

// VB = (Físico + Agilidade) × Estágio
function velocidade({ fisico, agilidade, estagio } = {}) {
  return (num(fisico) + num(agilidade)) * num(estagio);
}

// Tiers 25/50/75% — mesma regra de arredondamento pra cima do Arsenal da Ficha.
function tiersDeDano(d100) {
  const d = Math.max(0, num(d100));
  return { d25: Math.ceil(d / 4), d50: Math.ceil(d / 2), d75: Math.ceil((3 * d) / 4) };
}

/* ── EQUIPAMENTO ──────────────────────────────────────────────────────
   `criaturas.equipamento` (jsonb) é uma lista de { slug, slot }:
     slot 'arma'              arma (itens do grupo Armas) — SEM LIMITE
     slot 'escudo'            escudo (item de mão que não é arma) — um só
     slot = itens.slot_equip  peça de armadura (cabeca, peito, pernas, pes,
                              ombros, bracos) — uma por slot

   15/09/2026 (usuário): "Para as criaturas, não haverá limitação de
   equipamentos de ataque." Até aqui arma e escudo disputavam duas mãos
   (mao_d/mao_e) como no personagem; criatura não tem mão — a Hydra morde com
   todas as cabeças. Equipamento gravado antes, em mao_d/mao_e, continua
   valendo: a ordem dos ataques é mão direita, mão esquerda, e depois as
   armas na ordem em que foram equipadas. */
const MAOS = ['mao_d', 'mao_e'];
const SLOTS_DE_ARMA = ['mao_d', 'mao_e', 'arma'];
const AJUSTE_ATRIBUTO = { FOR: 'forca', AGI: 'agilidade', PER: 'percepcao', AUR: 'aura', FIS: 'fisico', CAR: 'carisma' };

function listaEquipamento(equipamento) {
  return (Array.isArray(equipamento) ? equipamento : []).filter((e) => e && e.slug);
}

const ehArma = (cat) => !!cat && cat.grupo === 'Armas';
const ehEscudo = (cat) => !!cat && !ehArma(cat) && cat.slot_equip === 'maos';

// Onde a peça entra. Devolve { slot } ou { motivo } quando não cabe.
function slotParaPeca(cat, equipamento, catalogoBySlug) {
  if (!cat) return { motivo: 'item_desconhecido' };
  const lista = listaEquipamento(equipamento);
  // A mesma arma duas vezes seria o mesmo ataque repetido — quase sempre um
  // Enter a mais na busca, não intenção.
  if (ehArma(cat)) {
    return lista.some((e) => e.slug === cat.slug) ? { motivo: 'ja_equipada' } : { slot: 'arma' };
  }
  if (ehEscudo(cat)) {
    const temEscudo = lista.some((e) => e.slot === 'escudo'
      || (MAOS.includes(e.slot) && ehEscudo(catalogoBySlug && catalogoBySlug[e.slug])));
    return temEscudo ? { motivo: 'slot_ocupado' } : { slot: 'escudo' };
  }
  const slot = cat.slot_equip;
  if (!slot) return { motivo: 'sem_slot' };
  if (lista.some((e) => e.slot === slot)) return { motivo: 'slot_ocupado' };
  return { slot };
}

// As armas equipadas, na ordem dos ataques: mão direita, mão esquerda (dados
// antigos) e depois as de slot 'arma' na ordem da lista. Só vale peça com dano.
function armasEquipadas(pecas) {
  return SLOTS_DE_ARMA.flatMap((s) => pecas.filter((p) => p.slot === s && p.cat.dano != null));
}

/* Tudo o que o equipamento decide, de uma vez. `atributos` = { forca,
   agilidade, percepcao, aura, fisico, carisma } da criatura. Peça cujo slug
   não está no catálogo é ignorada (item apagado não derruba a conta). */
function derivadosDoEquipamento({ equipamento, catalogoBySlug, atributos } = {}) {
  const at = atributos || {};
  const cats = catalogoBySlug || {};
  const pecas = listaEquipamento(equipamento)
    .map((e) => ({ ...e, cat: cats[e.slug] }))
    .filter((e) => e.cat);

  let absorcaoTotal = 0;
  let defesaTotal = 0;
  let tipo = '';
  pecas.forEach(({ slot, cat }) => {
    absorcaoTotal += num(cat.absorcao);
    defesaTotal += num(cat.defesa);
    if (slot === 'peito' && cat.tipo_armadura) tipo = cat.tipo_armadura;
  });

  // Todas as armas equipadas. A primeira é o Ataque.
  const armas = armasEquipadas(pecas);
  const arma = armas[0] || null;
  /* Dano 100% de CADA arma (14/09/2026): "o 'dano 100%' deve aparecer para
     todos os tipos de equipamentos de ataque que a criatura tiver". A coluna
     dano_100 continua sendo o da primeira (é a que a batalha lê); a lista é
     o que o editor mostra. */
  const danos_100 = armas.map((a) => ({
    slug: a.slug, nome: a.cat.nome || a.slug, dano_100: num(a.cat.dano) + num(at.forca),
  }));

  let ataque = null;
  let dano_l = null; let dano_m = null; let dano_p = null; let dano_100 = null;
  if (arma) {
    const c = arma.cat;
    const aj = AJUSTE_ATRIBUTO[String(c.ajuste_atributo || '').toUpperCase()];
    const bonus = aj ? num(at[aj]) : 0;
    ataque = c.nome || arma.slug;
    dano_l = num(c.dano_l) + bonus;
    dano_m = num(c.dano_m) + bonus;
    dano_p = num(c.dano_p) + bonus;
    dano_100 = num(c.dano) + num(at.forca);
  }

  return {
    ataque,
    armadura: tipo || 'L',
    absorcao: absorcaoTotal,
    defesa: defesaTotal + num(at.agilidade),
    dano_l, dano_m, dano_p, dano_100,
    danos_100,
  };
}

/* TODOS os ataques da criatura (14/09/2026 — ficha dos animais do PJ: "é
   preciso montar todos os ataques"). Um por arma equipada, com a mesma conta
   de derivadosDoEquipamento: L/M/P = coluna da arma + atributo de ajuste;
   Dano 100% = dano da arma + Força; 75/50/25 pelos tiers. Sem arma no
   equipamento (criatura antiga), cai no ataque único das colunas gravadas. */
function ataquesDaCriatura(c, catalogoBySlug) {
  const x = c || {};
  const at = { forca: x.forca, agilidade: x.agilidade, percepcao: x.percepcao, aura: x.aura, fisico: x.fisico, carisma: x.carisma };
  const cats = catalogoBySlug || {};
  const pecas = listaEquipamento(x.equipamento).map((e) => ({ ...e, cat: cats[e.slug] })).filter((e) => e.cat);
  const armas = armasEquipadas(pecas);
  if (armas.length) {
    return armas.map(({ slug, cat }) => {
      const aj = AJUSTE_ATRIBUTO[String(cat.ajuste_atributo || '').toUpperCase()];
      const bonus = aj ? num(at[aj]) : 0;
      const d100 = num(cat.dano) + num(at.forca);
      const t = tiersDeDano(d100);
      return { slug, nome: cat.nome || slug,
        dano_l: num(cat.dano_l) + bonus, dano_m: num(cat.dano_m) + bonus, dano_p: num(cat.dano_p) + bonus,
        dano_100: d100, dano_75: t.d75, dano_50: t.d50, dano_25: t.d25 };
    });
  }
  if (!x.ataque && x.dano_100 == null) return [];
  return [{ slug: null, nome: x.ataque || '—',
    dano_l: x.dano_l, dano_m: x.dano_m, dano_p: x.dano_p,
    dano_100: x.dano_100, dano_75: x.dano_75, dano_50: x.dano_50, dano_25: x.dano_25 }];
}

/* A criatura inteira: atributos + equipamento → todas as colunas calculadas.
   É o que o editor mostra e o que o recálculo em lote grava. */
function derivadosDaCriatura(c, catalogoBySlug) {
  const x = c || {};
  const eq = derivadosDoEquipamento({
    equipamento: x.equipamento,
    catalogoBySlug,
    atributos: { forca: x.forca, agilidade: x.agilidade, percepcao: x.percepcao, aura: x.aura, fisico: x.fisico, carisma: x.carisma },
  });
  const tiers = eq.dano_100 == null ? { d25: null, d50: null, d75: null } : tiersDeDano(eq.dano_100);
  return {
    energia_fisica: energiaFisica(x),
    energia_heroica: energiaHeroica(x),
    resistencia_fisica: resistenciaFisica(x),
    resistencia_magica: resistenciaMagica(x),
    velocidade: velocidade(x),
    ataque: eq.ataque,
    armadura: eq.armadura,
    absorcao: eq.absorcao,
    defesa: eq.defesa,
    dano_l: eq.dano_l, dano_m: eq.dano_m, dano_p: eq.dano_p,
    dano_100: eq.dano_100, dano_25: tiers.d25, dano_50: tiers.d50, dano_75: tiers.d75,
    danos_100: eq.danos_100,
  };
}

Object.assign(window, {
  CriaturaFormulas: {
    EH_BASE,
    energiaFisica, energiaHeroica, resistenciaFisica, resistenciaMagica, velocidade,
    tiersDeDano,
    MAOS, AJUSTE_ATRIBUTO, slotParaPeca, derivadosDoEquipamento, derivadosDaCriatura,
    ataquesDaCriatura,
    /* listaEquipamento entrou no export em 17/09/2026: a seção Equipamentos da
       ficha do bestiário precisa das peças vestidas, e não só das armas que
       viram ataque. Era privada do módulo, e quem estava fora tinha que
       repetir o filtro `e && e.slug` — duas leituras do mesmo jsonb, com
       chance de discordarem sobre o que conta como peça. */
    listaEquipamento,
  },
});
