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

   dano100 e danoLMP dependem de AtaquesCriatura (ataques-criatura.jsx) —
   as tabelas de faixa-de-peso e offset-por-ataque. Precisa estar carregado
   ANTES deste arquivo (ver ordem em src/main.tsx e nos testes). As duas
   fórmulas foram CORRIGIDAS em 10/09/2026: a versão anterior vinha do
   NovaCriaturaModal só de nome — na prática era a conta de PERSONAGEM
   (dano de uma arma específica + modificador), que nunca reproduziu
   nenhuma criatura do banco porque criatura não tem "uma arma", tem faixa
   de peso e offset por tipo de ataque. Ver comentário em cada função.
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

// L/M/P = Estágio + Agilidade + offset do ataque (ataques-criatura.jsx).
// ⚠️ CORRIGIDA em 10/09/2026: a fórmula original ("dano_l/m/p da arma +
// Agilidade") foi migrada do formulário de PERSONAGEM, que soma o dano
// impresso de UMA arma escolhida. Criatura não tem isso — o campo `ataque`
// era texto livre e o editor sempre passava dano-da-arma = 0, então na
// prática a fórmula só devolvia Agilidade, e nunca bateu com nenhuma
// criatura do banco. O offset por ataque é tabela fechada (banco,
// 10/09/2026), não “dano de uma peça de equipamento”.
// Sem offset pro ataque (ex.: "Toque" — o único cujo offset NÃO é
// constante entre criaturas, ver ataques-criatura.jsx) devolve string
// vazia: o campo fica em branco pro admin preencher, em vez de mostrar um
// número calculado sem base nenhuma.
function danoLMP({ ataque, estagio, agilidade } = {}) {
  const offset = AtaquesCriatura.offsetLMP(ataque);
  if (!offset) return { l: '', m: '', p: '' };
  const base = num(estagio) + num(agilidade);
  return { l: base + offset.l, m: base + offset.m, p: base + offset.p };
}

// Dano = Estágio + Força + faixa de peso (ataques-criatura.jsx).
// ⚠️ CORRIGIDA em 10/09/2026: a fórmula original ("ROUNDUP(dano da arma +
// √peso)") também veio do formulário de PERSONAGEM (dano de arma + raiz
// do peso carregado) — outra conta de personagem, não de criatura. A
// nova bate com as 9 criaturas conferidas contra o banco (ver
// criatura-formulas.test.js); os 8 dragões são exceção conhecida e
// aceita (+4 além da fórmula, revisão adiada pelo usuário).
function dano100({ estagio, forca, peso } = {}) {
  return num(estagio) + num(forca) + AtaquesCriatura.danoPorFaixaDePeso(peso);
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
