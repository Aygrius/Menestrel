/* ============================================================
   busca-item.test.js — a busca de item olha a descrição também
   ============================================================
   "A barra de pesquisa de item deve buscar a descrição também."
   (usuário, 24/09/2026)

   Mesma regra que o catálogo da tela da história já usava: sem acento,
   sem caixa, e cada palavra digitada precisa aparecer no nome OU na
   descrição (palavras podem cair uma em cada).
   ============================================================ */
import { describe, it, expect } from 'vitest';
import './helpers.jsx';
import './inventario-helpers.jsx';

const { itemCasaBusca } = window;
const carne = { nome: 'Carne Celestial', descricao: 'Carne de natureza celestial para consumo ou execução de rituais mágicos.' };

describe('itemCasaBusca', () => {
  it('busca vazia casa tudo', () => {
    expect(itemCasaBusca(carne, '')).toBe(true);
    expect(itemCasaBusca(carne, '   ')).toBe(true);
  });
  it('casa pelo nome', () => {
    expect(itemCasaBusca(carne, 'celestial')).toBe(true);
  });
  it('casa pela descrição', () => {
    expect(itemCasaBusca(carne, 'rituais')).toBe(true);
  });
  it('ignora acento e caixa', () => {
    expect(itemCasaBusca(carne, 'MAGICOS')).toBe(true);
    expect(itemCasaBusca(carne, 'execucao')).toBe(true);
  });
  it('cada palavra pode vir de um lado', () => {
    expect(itemCasaBusca(carne, 'carne rituais')).toBe(true);
  });
  it('toda palavra precisa aparecer', () => {
    expect(itemCasaBusca(carne, 'carne espada')).toBe(false);
  });
  it('sem catálogo, cai no texto de reserva (slug)', () => {
    expect(itemCasaBusca(null, 'agua', 'agua')).toBe(true);
    expect(itemCasaBusca(null, 'fogo', 'agua')).toBe(false);
  });
});
