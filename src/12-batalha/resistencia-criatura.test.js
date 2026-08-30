/* ============================================================
   resistencia-criatura.test.js — RF/RM da criatura no snapshot
   ============================================================
   O snapshot lia `criaturas.resistencia_fisica` / `resistencia_magica`.
   Essas colunas NÃO EXISTEM na tabela (o SELECT falha com 42703), então
   `c.resistencia_* || 0` sempre caía em 0: toda criatura entrava em
   combate com RF 0 e RM 0, exibidos assim no card do lutador.

   Correção: derivar com a MESMA fórmula do PJ (game-data.jsx,
   calcularFicha) — RF = estágio + físico, RM = estágio + aura, piso 0.
   As 207 criaturas têm estagio/fisico/aura preenchidos (0 nulos), então
   a derivação vale pra todas sem migração de dados.
   ============================================================ */
import { describe, it, expect, afterEach } from 'vitest';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';

const stubOriginal = globalThis.supabaseClient;
afterEach(() => { globalThis.supabaseClient = stubOriginal; });

function fakeSupabase(tabelas) {
  const resultado = (nome) => {
    const box = {
      in: () => box,
      eq: () => box,
      then: (res, rej) => Promise.resolve({ data: tabelas[nome] || [], error: null }).then(res, rej),
    };
    return box;
  };
  return { from: (nome) => ({ select: () => resultado(nome) }) };
}

// Lobisomem real (criaturas.id 86): estágio 7.
const LOBISOMEM = {
  id: 86, nome: 'Lobisomem', ataque: 'Garras',
  armadura: 'M', defesa: 4, absorcao: 0, velocidade: 35,
  energia_fisica: 23, energia_heroica: 147,
  estagio: 7, fisico: 3, aura: 2,
  dano_l: 11, dano_m: 11, dano_p: 11,
};

const montar = (criatura) => {
  globalThis.supabaseClient = fakeSupabase({ criaturas: [criatura], itens: [] });
  return window.montarSnapshots([{ tipo: 'criatura', ref_id: criatura.id, nome: criatura.nome }], null);
};

describe('resistenciasBase — fórmula compartilhada com o PJ', () => {
  it('RF = estágio + físico, RM = estágio + aura', () => {
    expect(window.resistenciasBase(7, 3, 2)).toEqual({ rf: 10, rm: 9 });
    expect(window.resistenciasBase(1, 0, 0)).toEqual({ rf: 1, rm: 1 });
  });

  it('piso 0: atributo muito negativo não gera resistência negativa', () => {
    expect(window.resistenciasBase(1, -4, -1)).toEqual({ rf: 0, rm: 0 });
  });

  // Âncora contra regressão do refactor: resistenciasBase foi EXTRAÍDA de
  // dentro de calcularFicha. Estes números são os do Yuldrous (personagens.id
  // 64) como gravados no snapshot real da batalha 82 — se o refactor tivesse
  // mudado a conta do PJ, este teste cairia.
  it('PJ real (Yuldrous) mantém RF 7 / RM 7 como em produção', () => {
    const pj = {
      id: 64, nome: 'Yuldrous', raca: 'Anão', reino: 'Verrogar',
      profissao: 'Sacerdote', especializacao: 'Ordem de Crezir', deus: 'Crezir',
      intelecto_base: 2, aura_base: 2, carisma_base: 0, forca_base: 2,
      fisico_base: 2, agilidade_base: 2, percepcao_base: 1, experiencia: 42,
      habilidades: {}, magias: {}, tecnicas: {}, aprimoramentos: {},
      grupos_armas: {}, inventario: { itens: [] }, caracterizacao: {},
      estado_atual: {
        condicoes: {
          animo: -25, euforia: 0, nutricao: 25, sanidade: 25,
          reputacao: 10, hidratacao: 25, vitalidade: 25, termorregulacao: 0,
        },
      },
    };
    const f = window.calcularFicha(pj, {}, pj.estado_atual.condicoes);
    expect(f.estagio).toBe(4);
    expect(f.derivadas.resistenciaFisica).toBe(7);
    expect(f.derivadas.resistenciaMagica).toBe(7);
  });

  it('é a MESMA fórmula que calcularFicha usa pro PJ', () => {
    const pj = {
      id: 1, nome: 'T', raca: 'Humano', profissao: 'Guerreiro',
      intelecto_base: 0, aura_base: 2, carisma_base: 0,
      forca_base: 0, fisico_base: 3, agilidade_base: 0, percepcao_base: 0,
      experiencia: 42, habilidades: {}, magias: {}, tecnicas: {},
      aprimoramentos: {}, grupos_armas: {}, inventario: { itens: [] },
      estado_atual: {}, caracterizacao: {},
    };
    const f = window.calcularFicha(pj, {}, null);
    const esperado = window.resistenciasBase(f.estagio, f.atributos.fisico, f.atributos.aura);
    expect(f.derivadas.resistenciaFisica).toBe(esperado.rf);
    expect(f.derivadas.resistenciaMagica).toBe(esperado.rm);
  });
});

describe('montarSnapshots — RF/RM da criatura', () => {
  it('deriva RF/RM em vez de zerar (colunas resistencia_* não existem)', async () => {
    const [snap] = await montar(LOBISOMEM);
    expect(snap.rf).toBe(10);  // 7 + 3
    expect(snap.rm).toBe(9);   // 7 + 2
  });

  it('criatura fraca não fica com resistência negativa', async () => {
    const [snap] = await montar({ ...LOBISOMEM, estagio: 1, fisico: -4, aura: -1 });
    expect(snap.rf).toBe(0);
    expect(snap.rm).toBe(0);
  });

  it('ignora colunas resistencia_* mesmo se alguém as criar depois', async () => {
    const [snap] = await montar({ ...LOBISOMEM, resistencia_fisica: 99, resistencia_magica: 99 });
    expect(snap.rf).toBe(10);
    expect(snap.rm).toBe(9);
  });
});
