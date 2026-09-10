/* ============================================================
   FÓRMULAS DERIVADAS DE CRIATURA
   ============================================================
   Extraídas do NovaCriaturaModal (13-diario/diario.jsx), que é aposentado
   junto desta migração. Ficam puras — sem React, banco ou catálogo — pra
   serem testáveis sem renderizar nada, e pra que o editor de catálogo e
   qualquer outro consumidor futuro usem a MESMA conta.

   Fórmulas fornecidas pelo usuário no formato de planilha; conferidas
   contra os 8 dragões do banco em criatura-formulas.test.js.

   ⚠️ Estes valores são DERIVADOS, não IMPOSTOS. Várias criaturas fogem da
   fórmula de propósito — a classe Dragão fixa absorção em 30 e velocidade
   por linhagem, e nenhuma das duas bate com a conta. Por isso o editor
   preenche o campo mas DEIXA sobrescrever (spec §6).
   ============================================================ */

const EH_BASE_POR_COLETIVO = {
  'Grupo Grande': 10, 'Grupo Médio': 13, 'Grupo Pequeno': 17, 'Solitário': 21,
};

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const teto = (v) => Math.ceil(v - 1e-9) || 0;   // margem contra ruído de ponto flutuante; `|| 0` normaliza -0 (Math.ceil(0 - 1e-9) dá -0)

// EF = ROUNDUP(2·√peso + Físico)
function energiaFisica({ peso, fisico } = {}) {
  return teto(2 * Math.sqrt(Math.max(0, num(peso))) + num(fisico));
}

// EH = (base_do_coletivo + Aura) × Estágio.
// `base` crua tem precedência sobre `coletivo`: os dragões usam base 20, que
// não é nenhum dos quatro coletivos nomeados.
function energiaHeroica({ base, coletivo, aura, estagio } = {}) {
  const b = base != null ? num(base) : (EH_BASE_POR_COLETIVO[coletivo] || 0);
  return teto((b + num(aura)) * num(estagio));
}

// Absorção = Físico > 0 ? Físico × 5 : 0
function absorcao({ fisico } = {}) {
  const f = num(fisico);
  return f > 0 ? f * 5 : 0;
}

// Defesa = Absorção > 0 ? Agilidade + 8 : Agilidade
function defesa({ fisico, agilidade } = {}) {
  return absorcao({ fisico }) > 0 ? num(agilidade) + 8 : num(agilidade);
}

// Velocidade = (Agilidade + Estágio) × Percepção
function velocidade({ agilidade, estagio, percepcao } = {}) {
  return (num(agilidade) + num(estagio)) * num(percepcao);
}

// L/M/P = dano_l/m/p da arma + Agilidade
function danoLMP({ armaDanoL, armaDanoM, armaDanoP, agilidade } = {}) {
  const a = num(agilidade);
  return { l: num(armaDanoL) + a, m: num(armaDanoM) + a, p: num(armaDanoP) + a };
}

// Dano = ROUNDUP(dano da arma + √peso)
function dano100({ armaDano, peso } = {}) {
  return teto(num(armaDano) + Math.sqrt(Math.max(0, num(peso))));
}

// Tiers 25/50/75% — mesma regra de arredondamento pra cima do Arsenal da Ficha.
function tiersDeDano(d100) {
  const d = Math.max(0, num(d100));
  return { d25: Math.ceil(d / 4), d50: Math.ceil(d / 2), d75: Math.ceil((3 * d) / 4) };
}

Object.assign(window, {
  CriaturaFormulas: {
    EH_BASE_POR_COLETIVO,
    energiaFisica, energiaHeroica, absorcao, defesa, velocidade,
    danoLMP, dano100, tiersDeDano,
  },
});
