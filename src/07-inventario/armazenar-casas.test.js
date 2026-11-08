/* armazenar-casas.test.js — o Armazenar também respeita as casas
   07/11/2026, usuário: "Algumas bolsas dos personagens atuais estão com 10/9
   casas ocupadas. Como isso foi possível?" O limite de casas (29/10/2026)
   valia só no arrastar; o Armazenar da janela e do leque conferia só o peso. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fonte = readFileSync(resolve(__dirname, 'inventario.jsx'), 'utf8');
const trecho = (de, ate) => fonte.slice(fonte.indexOf(de), fonte.indexOf(ate, fonte.indexOf(de)));

describe('Armazenar pela janela confere as casas', () => {
  it('solicitarMover recusa recipiente sem casa livre, a não ser para somar numa pilha igual', () => {
    const t = trecho('const solicitarMover', 'TRANSFERIR = ARRASTAR');
    expect(t).toMatch(/casasLivres <= 0 && !\(filhos \|\| \[\]\)\.some\(\(f\) => f\.slug === it\.slug\)/);
    expect(t).toMatch(/está com todas as casas ocupadas/);
  });
  it('moverParaContainer soma na pilha igual e não abre casa além do limite', () => {
    const t = trecho('const moverParaContainer', '// ── Wrappers');
    expect(t).toMatch(/if \(!pilha && casasLivres <= 0\) return cur;/);
  });
});
