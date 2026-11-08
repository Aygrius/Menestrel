/* ============================================================
   faixas-de-carga.test.js — o que o peso custa (07/11/2026)
   ============================================================
   "Se um personagem tem 10/31, quer dizer que ele não pode passar de 31. A
    porcentagem ocupada que vai aplicar os efeitos de peso." As faixas
   aprovadas pelo usuário no mesmo dia (Velocidade em porcentagem; defesa e
   Agilidade entram; fome, sede e sono aceleram; bloqueio acima de 100%):
     0–50 nada · 51–75 Vel −25%, Def −1 · 76–90 Vel −50%, Def −2, Agi −2,
     consumo +25% · 91–100 Vel −75%, Def −4, Agi −2, consumo +50%, sem ação
     extra · >100 nada entra.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import './constants.jsx';
import './helpers.jsx';
import './inventario-helpers.jsx';
import './game-data.jsx';
import './clima-desgaste.jsx';
import '../07-inventario/inventario.jsx';

let W;
beforeAll(() => { W = window; });

describe('as faixas', () => {
  it('cada porcentagem cai na faixa aprovada', () => {
    expect([0, 50, 51, 75, 76, 90, 91, 100, 130].map((p) => W.faixaDeCarga(p).id))
      .toEqual(['leve', 'leve', 'carregado', 'carregado', 'pesado', 'pesado', 'no_limite', 'no_limite', 'no_limite']);
  });

  it('a Velocidade cai em porcentagem, arredondando para baixo', () => {
    expect(W.velocidadeComCarga(20, W.faixaDeCarga(40))).toBe(20);
    expect(W.velocidadeComCarga(20, W.faixaDeCarga(60))).toBe(15);
    expect(W.velocidadeComCarga(21, W.faixaDeCarga(80))).toBe(10);
    expect(W.velocidadeComCarga(20, W.faixaDeCarga(95))).toBe(5);
  });

  it('defesa, Agilidade, consumo e ação extra por faixa', () => {
    const f = (p) => W.faixaDeCarga(p);
    expect([f(60).defesa, f(80).defesa, f(95).defesa]).toEqual([1, 2, 4]);
    expect([f(60).agilidade, f(80).agilidade, f(95).agilidade]).toEqual([0, 2, 2]);
    expect([f(60).consumoPct, f(80).consumoPct, f(95).consumoPct]).toEqual([0, 25, 50]);
    expect([f(80).semAcaoExtra, f(95).semAcaoExtra]).toEqual([false, true]);
  });

  it('a barra diz o nome e o custo; Leve não diz nada', () => {
    expect(W.textoFaixaDeCarga(W.faixaDeCarga(10), false)).toBeNull();
    const t = W.textoFaixaDeCarga(W.faixaDeCarga(95), false);
    expect(t.nome).toBe('No limite');
    expect(t.efeito).toMatch(/Velocidade −75%.*Defesa −4.*Agilidade −2.*\+50%.*sem ação extra/);
  });
});

describe('as habilidades de Agilidade', () => {
  const HABS = { furt: { key: 'furt', ajuste: 'agilidade', grupo: 'Subterfúgio' },
    lab: { key: 'lab', ajuste: 'intelecto', grupo: 'Conhecimento' } };
  const tot = (key, pesado) => W.totalHabilidadeComCondicoes(key, { furt: 3, lab: 3 }, { agilidade: 2, intelecto: 2 },
    {}, HABS, { pesado });
  it('−2 de 76% em diante, só nas de Agilidade', () => {
    expect(tot('furt', 70)).toBe(5);
    expect(tot('furt', 80)).toBe(3);
    expect(tot('lab', 95)).toBe(5);
  });
});

describe('fome, sede e sono andam mais rápido', () => {
  it('+25% e +50% sobre a parte do tempo', () => {
    const d = (pct) => W.decaimentoPorHoras({}, 12, 4, null, null, pct);
    expect(d(0)).toMatchObject({ nutricao: 4, hidratacao: 4 });
    expect(d(25)).toMatchObject({ nutricao: 5, hidratacao: 5 });
    expect(d(50)).toMatchObject({ nutricao: 6, hidratacao: 6 });
  });
});

describe('acima de 100% nada entra', () => {
  const CAT = { pedra: { slug: 'pedra', ocupa: 5 }, pena: { slug: 'pena', ocupa: 0.1 } };
  // Capacidade com Força 0 e Físico 0 = 10.
  it('ganhar o que passa de 100% é barrado', () => {
    const antes = [{ instanceId: 'a', slug: 'pedra', quantidade: 1 }];
    const depois = [...antes, { instanceId: 'b', slug: 'pedra', quantidade: 2 }];
    expect(W.cargaEstourouCom(antes, depois, CAT, 0, 0)).toBe(true);
  });
  it('dentro do limite, e largar ou reorganizar acima dele, passam', () => {
    const antes = [{ instanceId: 'a', slug: 'pedra', quantidade: 1 }];
    expect(W.cargaEstourouCom(antes, [...antes, { instanceId: 'b', slug: 'pena', quantidade: 1 }], CAT, 0, 0)).toBe(false);
    const cheio = [{ instanceId: 'a', slug: 'pedra', quantidade: 3, equipado: true }];
    expect(W.cargaEstourouCom(cheio, [{ ...cheio[0], equipado: false }], CAT, 0, 0)).toBe(false);
  });
  it('a gravação central, a compra e a transferência conferem', () => {
    const conc = readFileSync(resolve(__dirname, 'inventario-concorrencia.jsx'), 'utf8');
    expect(conc.match(/await cargaEstoura\(pjId,/g)).toHaveLength(2);
    expect(readFileSync(resolve(__dirname, '../07-inventario/loja.jsx'), 'utf8')).toMatch(/motivo: 'carga_maxima'/);
    expect(readFileSync(resolve(__dirname, '../11-ficha/ficha.jsx'), 'utf8')).toMatch(/recebimentoEstouraCarga\(pjDestinoId/);
  });
});
