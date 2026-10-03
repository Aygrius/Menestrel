/* ============================================================
   chuva-na-loja.test.js — a chuva soma água SEM apagar a loja
   ============================================================
   Bug de 02/10/2026: aplicarChuvaNaLoja (10-shell/shell.jsx) só conhecia o
   formato ANTIGO de historias.estoque_loja (array flat). No formato atual —
   { comercios: [...] } — ela lia "nada" e gravava só a água por cima, e a
   loja inteira da mesa sumia (aconteceu com a história 13). A água ainda
   nascia sem entryId, então o balcão não a abria nem a vendia.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import './clima-desgaste.jsx';

const S = (...a) => window.somarAguaNaLoja(...a);
let n = 0;
const novoId = () => 'id-' + (++n);

describe('somarAguaNaLoja', () => {
  it('formato atual: soma na entrada de água que já existe, sem tocar no resto', () => {
    const loja = {
      comercios: [
        { id: 'c1', nome: 'Feira', ativo: true, itens: [{ entryId: 'e1', slug: 'corda', estoque: 3 }] },
        { id: 'c2', nome: 'Poço', ativo: true, itens: [{ entryId: 'e2', slug: 'agua', estoque: 4, preco_latao_override: 1 }] },
      ],
      editando_em: null,
    };
    const out = S(loja, 5, novoId);
    expect(out.comercios[0]).toEqual(loja.comercios[0]);
    expect(out.comercios[1].itens).toEqual([{ entryId: 'e2', slug: 'agua', estoque: 9, preco_latao_override: 1 }]);
    expect(out.editando_em).toBeNull();
  });

  it('formato atual sem água: entra no primeiro comércio ativo, com entryId', () => {
    const loja = {
      comercios: [
        { id: 'c0', nome: 'Fechado', ativo: false, itens: [] },
        { id: 'c1', nome: 'Feira', ativo: true, itens: [{ entryId: 'e1', slug: 'corda', estoque: 3 }] },
      ],
    };
    const out = S(loja, 2, novoId);
    expect(out.comercios[0].itens).toEqual([]);
    expect(out.comercios[1].itens).toHaveLength(2);
    expect(out.comercios[1].itens[1]).toMatchObject({ slug: 'agua', estoque: 2 });
    expect(out.comercios[1].itens[1].entryId).toBeTruthy();
  });

  it('água sem entryId (do bug) ganha um ao ser somada', () => {
    const loja = { comercios: [{ id: 'c1', nome: 'Estoque', ativo: true, itens: [{ slug: 'agua', estoque: 2 }] }] };
    const out = S(loja, 1, novoId);
    expect(out.comercios[0].itens[0]).toMatchObject({ slug: 'agua', estoque: 3 });
    expect(out.comercios[0].itens[0].entryId).toBeTruthy();
  });

  it('estoque infinito (null) continua infinito', () => {
    const loja = { comercios: [{ id: 'c1', nome: 'Poço', ativo: true, itens: [{ entryId: 'e', slug: 'agua', estoque: null }] }] };
    expect(S(loja, 3, novoId).comercios[0].itens[0].estoque).toBeNull();
  });

  it('loja sem comércio nenhum: cria um "Estoque" ativo com a água', () => {
    for (const vazia of [null, undefined, { comercios: [] }, []]) {
      const out = S(vazia, 4, novoId);
      expect(out.comercios).toHaveLength(1);
      expect(out.comercios[0]).toMatchObject({ nome: 'Estoque', ativo: true });
      expect(out.comercios[0].itens[0]).toMatchObject({ slug: 'agua', estoque: 4 });
    }
  });

  it('formato antigo (array flat) é convertido sem perder os itens', () => {
    const out = S([{ entryId: 'e1', slug: 'corda', estoque: 3 }], 2, novoId);
    expect(out.comercios).toHaveLength(1);
    expect(out.comercios[0].itens).toEqual([
      { entryId: 'e1', slug: 'corda', estoque: 3 },
      expect.objectContaining({ slug: 'agua', estoque: 2 }),
    ]);
  });

  it('ganho zero ou negativo devolve a loja intacta', () => {
    const loja = { comercios: [{ id: 'c1', nome: 'F', ativo: true, itens: [] }] };
    expect(S(loja, 0, novoId)).toBe(loja);
    expect(S(loja, -2, novoId)).toBe(loja);
  });
});
