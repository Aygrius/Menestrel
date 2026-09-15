/* ============================================================
   montaria-inventario.test.js — montar o animal do inventário
   ============================================================
   Pedidos do usuário (14/09/2026):
     "Adicione uma nova característica das criaturas, que é de montaria. As
      criaturas que podem ser montadas, o jogador poderá clicar no animal no
      inventário e clicar e montar. Ao montar, aparecerá uma ficha extra da
      montaria."
     "as características do Cavalo em criaturas e Cavalo em itens devem ser o
      mesmo" → "Faça pelo vínculo."

   O item (itens, grupo Animais) aponta para a criatura por `criatura_id`, e a
   característica mora só na criatura. Este arquivo trava o casamento pelo
   vínculo — e que o NOME não conta mais.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';

let criaturaDoItem, itemMontado;
beforeAll(() => {
  criaturaDoItem = window.criaturaDoItem;
  itemMontado = window.itemMontado;
  expect(criaturaDoItem).toBeTypeOf('function');
  expect(itemMontado).toBeTypeOf('function');
});

// Linhas reais: Cavalo Quarter (157), Tigre-Dente-de-Sabre (156), Pônei (135).
const QUARTER = { id: 157, nome: 'Cavalo Quarter', montaria: true };
const TIGRE = { id: 156, nome: 'Tigre-Dente-de-Sabre', montaria: false };
const PONEI = { id: 135, nome: 'Pônei', montaria: true };

describe('criaturaDoItem — pelo vínculo itens.criatura_id', () => {
  it('acha a criatura-montaria para a qual o item aponta', () => {
    expect(criaturaDoItem({ slug: 'cavalo_quarter', nome: 'Cavalo Quarter', criatura_id: 157 }, [TIGRE, QUARTER])).toBe(QUARTER);
  });

  it('o vínculo vale mesmo com nomes diferentes', () => {
    expect(criaturaDoItem({ nome: 'Pônei de Carga', criatura_id: 135 }, [PONEI])).toBe(PONEI);
  });

  it('o NOME sozinho não liga mais nada', () => {
    expect(criaturaDoItem({ nome: 'Cavalo Quarter' }, [QUARTER])).toBeNull();
  });

  it('criatura que NÃO é montaria não oferece Montar', () => {
    expect(criaturaDoItem({ nome: 'Tigre-dente-de-sabre', criatura_id: 156 }, [TIGRE])).toBeNull();
  });

  it('sem lista ou sem item, é null', () => {
    expect(criaturaDoItem({ criatura_id: 157 }, [])).toBeNull();
    expect(criaturaDoItem(null, [QUARTER])).toBeNull();
  });
});

describe('itemMontado', () => {
  it('devolve a instância montada', () => {
    const itens = [{ instanceId: 'a', slug: 'cavalo_quarter' }, { instanceId: 'b', slug: 'ponei', montado: true }];
    expect(itemMontado(itens).instanceId).toBe('b');
  });

  it('nada montado → null', () => {
    expect(itemMontado([{ instanceId: 'a' }])).toBeNull();
    expect(itemMontado(undefined)).toBeNull();
  });
});
