/* ============================================================
   vestir-capacidade.test.js — as casas do corpo e o teto de vestir
   ============================================================
   "Os botões de despir e equipar de alguns itens não estão funcionando."
   (usuário, 16/09/2026)

   Não era o botão: era o teto. O mapa do corpo na ficha desenha DUAS casas de
   brinco e QUATRO de joia, mas VESTE_SLOTS permitia 1 e 2 — o segundo brinco e
   o terceiro anel nasciam com "Vestir" desabilitado, dizendo "slot cheio".

   Este teste trava os dois lados juntos: o número de casas que a ficha desenha
   e o teto que o inventário aplica. Se um mudar sem o outro, quebra aqui.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './inventario.jsx';

const G = globalThis;
const ficha = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '..', '11-ficha', 'ficha.jsx'), 'utf8');

/* Quantas casas a ficha desenha para uma região: acha o fpSlotTile dela e
   volta lendo o `length: N` do Array.from logo acima. Sem regex acrobática —
   o fonte é curto e a leitura fica óbvia. */
const casasNaFicha = (regiao) => {
  const marca = `fpSlotTile('${regiao}'`;
  const i = ficha.indexOf(marca, ficha.indexOf('createPortal'));
  expect(i, `não achei as casas de ${regiao} na ficha`).toBeGreaterThan(0);
  const antes = ficha.slice(Math.max(0, i - 200), i);
  const n = antes.lastIndexOf('length: ');
  expect(n, `não achei o Array.from de ${regiao}`).toBeGreaterThan(-1);
  return parseInt(antes.slice(n + 'length: '.length), 10);
};

describe('o teto de vestir acompanha as casas do corpo', () => {
  it('brinco: duas orelhas, dois brincos', () => {
    expect(casasNaFicha('orelha')).toBe(2);
    const est = G.vesteSlotState('orelhas', [
      { vestido: true, vesteSlot: 'orelha', quantidade: 1 },
    ], {});
    expect(est.max).toBe(2);
    expect(est.livre).toBe(1);   // com um brinco posto, ainda cabe o outro
  });

  it('joia: quatro dedos, quatro anéis', () => {
    expect(casasNaFicha('dedos')).toBe(4);
    const doisAneis = [
      { vestido: true, vesteSlot: 'joia', quantidade: 1 },
      { vestido: true, vesteSlot: 'joia', quantidade: 1 },
    ];
    const est = G.vesteSlotState('dedos', doisAneis, {});
    expect(est.max).toBe(4);
    expect(est.livre).toBe(2);   // antes dava 0 e o terceiro anel não entrava
  });

  it('cintura e roupa continuam batendo com a ficha', () => {
    expect(G.vesteSlotState('cintura', [], {}).max).toBe(casasNaFicha('cintura'));
    expect(G.vesteSlotState('corpo', [], {}).max).toBe(casasNaFicha('roupa'));
  });

  it('cheio de verdade ainda bloqueia', () => {
    const quatro = Array.from({ length: 4 }, () => ({ vestido: true, vesteSlot: 'joia', quantidade: 1 }));
    expect(G.vesteSlotState('dedos', quatro, {}).livre).toBe(0);
  });
});
