/* ============================================================
   vestir-capacidade.test.js — as casas do corpo e o teto de vestir
   ============================================================
   "Os botões de despir e equipar de alguns itens não estão funcionando."
   (usuário, 16/09/2026)

   Não era o botão: era o teto. O mapa do corpo desenhava casas que o
   inventário não deixava preencher ("slot cheio").

   Desde 26/10/2026 a fonte da verdade das casas é REGIOES_EQUIP
   (01-core/inventario-helpers.jsx): 17 regiões da proposta aprovada
   (cabeça 1 · orelha 4 · rosto 2 · pescoço 3 · ombro 2 · costas 2 ·
   dorso 1 · peito 3 · braço 2 · dedo 10 · pulso 2 · mão 2 · perna 2 ·
   cintura 2 · canela 2 · pé 2 · alforje 3). Este teste trava o teto de
   vestir (VESTE_SLOTS, 07-inventario) nessas casas, incluindo os aliases
   do vocabulário antigo gravado nas instâncias.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './inventario.jsx';

const G = globalThis;

describe('o teto de vestir acompanha as casas do corpo (REGIOES_EQUIP)', () => {
  it('toda região tem o teto da proposta', () => {
    Object.entries(G.REGIOES_EQUIP).forEach(([regiao, casas]) => {
      expect(G.vesteSlotState(regiao, [], {}).max, `região ${regiao}`).toBe(casas);
    });
  });

  it('orelha: quatro casas (brincos e piercings)', () => {
    const est = G.vesteSlotState('orelhas', [
      { vestido: true, vesteSlot: 'orelha', quantidade: 1 },
    ], {});
    expect(est.max).toBe(4);
    expect(est.livre).toBe(3);
  });

  it('dedo: dez casas de anel, e o vocabulário antigo (dedos/joia) ainda conta', () => {
    const doisAneis = [
      { vestido: true, vesteSlot: 'joia', quantidade: 1 },   // instância antiga
      { vestido: true, vesteSlot: 'dedo', quantidade: 1 },   // instância nova
    ];
    const est = G.vesteSlotState('dedos', doisAneis, {});
    expect(est.max).toBe(10);
    expect(est.livre).toBe(8);
  });

  it('cheio de verdade ainda bloqueia', () => {
    const dez = Array.from({ length: 10 }, () => ({ vestido: true, vesteSlot: 'dedo', quantidade: 1 }));
    expect(G.vesteSlotState('dedo', dez, {}).livre).toBe(0);
  });

  it('o alforje existe e tem três casas', () => {
    const est = G.vesteSlotState('alforje', [
      { vestido: true, vesteSlot: 'alforje', quantidade: 1 },
    ], {});
    expect(est.max).toBe(3);
    expect(est.livre).toBe(2);
  });
});
