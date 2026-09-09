/* ============================================================
   paginacao.test.js — leitura de tabela inteira sem o corte dos 1000
   ============================================================
   O PostgREST devolve no MÁXIMO 1000 linhas por request, e não avisa: a
   resposta vem 200 OK com os primeiros 1000 e ponto. Um `.select('*')` cru
   numa tabela que cresceu passa a mentir silenciosamente.

   Era o caso de `itens` em 6 lugares (batalha ×3, ficha, bestiário, diário),
   enquanto Inventário/Loja/Histórias já paginavam por fetchCatalogoCompleto.
   Com 746 itens hoje o corte ainda não acontecia; a tabela vai passar de
   1000 (confirmado pelo usuário em 01/09/2026), e o sintoma seria armas e
   armaduras sumindo do combate sem erro nenhum.

   fetchTabelaPaginada generaliza o laço que só existia pro catálogo, porque
   as 6 chamadas não tinham o mesmo formato: uma filtra por grupo, outra pede
   só duas colunas, outras ordenam diferente.
   ============================================================ */
import { describe, it, expect, afterEach } from 'vitest';
import './helpers.jsx';
import './inventario-helpers.jsx';

const stubOriginal = globalThis.supabaseClient;
afterEach(() => { globalThis.supabaseClient = stubOriginal; });

// Fake que RESPEITA o teto de 1000 do PostgREST e registra o que recebeu.
function fakeSupabase(linhas, espiao) {
  return {
    from(tabela) {
      const estado = { tabela, colunas: '*', ordem: [], filtros: [], range: null };
      const box = {
        select(c) { estado.colunas = c; return box; },
        eq(col, val) { estado.filtros.push([col, val]); return box; },
        order(col) { estado.ordem.push(col); return box; },
        range(de, ate) {
          estado.range = [de, ate];
          if (espiao) espiao.push({ ...estado, ordem: [...estado.ordem], filtros: [...estado.filtros] });
          const filtradas = estado.filtros.reduce(
            (acc, [col, val]) => acc.filter((r) => r[col] === val), linhas
          );
          // Teto duro de 1000, igual ao servidor.
          const fatia = filtradas.slice(de, Math.min(ate + 1, de + 1000));
          return Promise.resolve({ data: fatia, error: null });
        },
      };
      return box;
    },
  };
}

const linhasFake = (n, extra) => Array.from({ length: n }, (_, i) => ({
  id: i + 1, slug: `item-${i + 1}`, nome: `Item ${i + 1}`, ...(extra ? extra(i) : {}),
}));

describe('fetchTabelaPaginada', () => {
  it('traz tudo quando cabe numa página só', async () => {
    globalThis.supabaseClient = fakeSupabase(linhasFake(746));
    const { data, error } = await globalThis.fetchTabelaPaginada('itens');
    expect(error).toBeNull();
    expect(data).toHaveLength(746);
  });

  it('atravessa o corte dos 1000 — o bug que motivou tudo', async () => {
    globalThis.supabaseClient = fakeSupabase(linhasFake(2350));
    const { data } = await globalThis.fetchTabelaPaginada('itens');
    expect(data).toHaveLength(2350);
    expect(data[0].slug).toBe('item-1');
    expect(data[2349].slug).toBe('item-2350');
  });

  it('para exatamente no múltiplo de 1000, sem página vazia extra', async () => {
    const espiao = [];
    globalThis.supabaseClient = fakeSupabase(linhasFake(2000), espiao);
    const { data } = await globalThis.fetchTabelaPaginada('itens');
    expect(data).toHaveLength(2000);
    // 2000 linhas = 2 páginas cheias + 1 sonda que volta vazia.
    expect(espiao.length).toBeLessThanOrEqual(3);
  });

  it('tabela vazia devolve array vazio, não erro', async () => {
    globalThis.supabaseClient = fakeSupabase([]);
    const { data, error } = await globalThis.fetchTabelaPaginada('itens');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('propaga erro e não devolve dado pela metade', async () => {
    globalThis.supabaseClient = {
      from: () => ({
        select: () => ({
          order: function () { return this; },
          eq: function () { return this; },
          range: () => Promise.resolve({ data: null, error: { message: 'boom' } }),
        }),
      }),
    };
    const { data, error } = await globalThis.fetchTabelaPaginada('itens');
    expect(data).toBeNull();
    expect(error.message).toBe('boom');
  });

  it('repassa colunas, ordem e filtros em TODAS as páginas', async () => {
    const espiao = [];
    globalThis.supabaseClient = fakeSupabase(
      linhasFake(1500, (i) => ({ grupo: i < 1500 ? 'Armas' : 'Outro' })), espiao
    );
    await globalThis.fetchTabelaPaginada('itens', {
      colunas: 'nome, descricao', ordem: ['nome'], filtros: [['grupo', 'Armas']],
    });
    expect(espiao.length).toBeGreaterThan(1);
    for (const chamada of espiao) {
      expect(chamada.colunas).toBe('nome, descricao');
      expect(chamada.ordem).toEqual(['nome']);
      expect(chamada.filtros).toEqual([['grupo', 'Armas']]);
    }
  });

  it('o filtro realmente reduz o resultado', async () => {
    globalThis.supabaseClient = fakeSupabase(
      linhasFake(1200, (i) => ({ grupo: i % 2 === 0 ? 'Armas' : 'Poções' }))
    );
    const { data } = await globalThis.fetchTabelaPaginada('itens', { filtros: [['grupo', 'Armas']] });
    expect(data).toHaveLength(600);
  });
});

describe('fetchCatalogoCompleto continua funcionando por cima dela', () => {
  it('lê itens inteiro, ordenado por grupo e nome', async () => {
    const espiao = [];
    globalThis.supabaseClient = fakeSupabase(linhasFake(1200), espiao);
    const { data } = await globalThis.fetchCatalogoCompleto();
    expect(data).toHaveLength(1200);
    expect(espiao[0].tabela).toBe('itens');
    expect(espiao[0].ordem).toEqual(['grupo', 'nome']);
  });
});
