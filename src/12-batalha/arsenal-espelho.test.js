/* ============================================================
   arsenal-espelho.test.js — batalha × Ficha: L/M/P têm que bater
   ============================================================
   Regra confirmada e documentada em ataquesDoAtor (batalha.jsx):
   "na batalha, os valores devem respeitar o que aparece na ficha".
   A Ficha (Arsenal, 11-ficha) é a FONTE DA VERDADE.

   Como cada lado monta a coluna L/M/P:
     gerarAtaques (01-core/inventario-helpers)
        dano_X = catalogo.dano_X + atributo de `ajuste_atributo`
     Ficha (11-ficha, Arsenal)
        exibe  = gerarAtaques.dano_X + bonusGrupoArma
     Batalha (ataquesDoAtor + colunaAtaque)
        usa    = gerarAtaques.dano_X + bonusGrupoArma

   O bug: ataquesDoAtor somava Agilidade OUTRA VEZ por cima do
   dano_X que já vinha ajustado, inflando a coluna em +AGI. Pior em
   arma de ajuste PER/FOR (28 das 75 armas do catálogo), onde somava
   Agilidade em cima do atributo errado.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';

let M;
beforeAll(() => {
  M = window.MotorBatalha;
  expect(M).toBeDefined();
  expect(typeof window.calcularFicha).toBe('function');
  expect(typeof window.gerarAtaques).toBe('function');
});

// Catálogo sintético: uma arma por tipo de `ajuste_atributo` + o peitoral.
const CATALOGO = {
  marreta_de_guerra: {
    slug: 'marreta_de_guerra', nome: 'Marreta de Guerra',
    dano: 28, dano_l: -4, dano_m: 0, dano_p: 4,
    ajuste_atributo: 'AGI', grupo_armas: 'EP', alcance: 0,
  },
  arco_curto: {
    slug: 'arco_curto', nome: 'Arco Curto',
    dano: 12, dano_l: 2, dano_m: 0, dano_p: -3,
    ajuste_atributo: 'PER', grupo_armas: 'CD', alcance: 30,
  },
  machado_pesado: {
    slug: 'machado_pesado', nome: 'Machado Pesado',
    dano: 20, dano_l: -3, dano_m: -1, dano_p: 2,
    ajuste_atributo: 'FOR', grupo_armas: 'CM', alcance: 0,
  },
  cota_de_malha: {
    slug: 'cota_de_malha', nome: 'Cota de Malha',
    tipo_armadura: 'M', defesa: 3, absorcao: 8,
  },
};

// PJ modelado no Yuldrous (id 64): Anão/Sacerdote, bônus de grupo EP 4 / CD 4 /
// CM 1, Sagração 3 na marreta — na instância do item desde 15/09/2026.
const PJ = {
  id: 64, nome: 'Yuldrous', raca: 'Anão', reino: 'Verrogar',
  profissao: 'Sacerdote', especializacao: 'Ordem de Crezir', deus: 'Crezir',
  intelecto_base: 2, aura_base: 2, carisma_base: 0,
  forca_base: 2, fisico_base: 2, agilidade_base: 2, percepcao_base: 1,
  experiencia: 42,
  habilidades: {}, habilidades_bonus: {}, magias: {}, tecnicas: {},
  aprimoramentos: {}, caracterizacao: {},
  grupos_armas: { CD: 4, CI: 1, CM: 1, EM: 1, EP: 4 },
  estado_atual: { condicoes: {} },
  inventario: {
    itens: [
      { slug: 'marreta_de_guerra', slot: 'mao_d', equipado: true, bonus: 3 },
      { slug: 'arco_curto',        slot: 'mao_e', equipado: true },
      { slug: 'machado_pesado',    slot: 'mao_d', equipado: true },
      { slug: 'cota_de_malha',     slot: 'peito', equipado: true },
    ],
  },
};

const ATOR = { tipo: 'pj', ref_id: 64, nome: 'Yuldrous', condicoes: {} };
const CATALOGOS = { pjById: { 64: PJ }, catalogoBySlug: CATALOGO, magiasByKey: {} };

// Valor que a Ficha EXIBE na coluna X do Arsenal (11-ficha: ap(v) = v + bonusGA).
function colunaNaFicha(slug, campo) {
  const ficha = window.calcularFicha(PJ, CATALOGO, PJ.estado_atual.condicoes);
  const ataques = window.gerarAtaques(PJ, CATALOGO, {}, ficha.atributos);
  const a = ataques.find((x) => x.slug === slug);
  const bonusGA = window.bonusGrupoArma(CATALOGO[slug].grupo_armas, PJ.grupos_armas);
  return a[campo] + bonusGA;
}

// Valor que a BATALHA usa: ataquesDoAtor + o bonus_ga que colunaAtaque soma.
function colunaNaBatalha(slug, campo) {
  const a = M.ataquesDoAtor(ATOR, CATALOGOS).find((x) => x.slug === slug);
  return a[campo] + a.bonus_ga;
}

describe('Arsenal: batalha espelha a Ficha', () => {
  for (const slug of ['marreta_de_guerra', 'arco_curto', 'machado_pesado']) {
    for (const campo of ['dano_l', 'dano_m', 'dano_p']) {
      it(`${slug} · ${campo}`, () => {
        expect(colunaNaBatalha(slug, campo)).toBe(colunaNaFicha(slug, campo));
      });
    }
  }

  it('dano100 (tier 100%) também espelha a Ficha: dano + Força + Sagração do item', () => {
    const ficha = window.calcularFicha(PJ, CATALOGO, PJ.estado_atual.condicoes);
    const esperado = CATALOGO.marreta_de_guerra.dano + ficha.atributos.forca + 3;
    const naBatalha = M.ataquesDoAtor(ATOR, CATALOGOS).find((x) => x.slug === 'marreta_de_guerra');
    expect(naBatalha.dano).toBe(esperado);
  });

  it('arma de ajuste PER/FOR não recebe Agilidade nenhuma', () => {
    const ficha = window.calcularFicha(PJ, CATALOGO, PJ.estado_atual.condicoes);
    const arco = M.ataquesDoAtor(ATOR, CATALOGOS).find((x) => x.slug === 'arco_curto');
    // dano_l do catálogo + Percepção (ajuste da arma) — sem Agilidade no meio.
    expect(arco.dano_l).toBe(CATALOGO.arco_curto.dano_l + ficha.atributos.percepcao);
  });
});
