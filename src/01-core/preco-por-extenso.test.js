/* preco-por-extenso.test.js — o valor nas moedas maiores (23/10/2026)
   "o custo da arma Hongor-Tun está como 12000 moedas, fica a pergunta, moedas
   de que? [...] seria mais interessante que o preço fosse 12 moedas de ouro."
   (usuário). O banco segue em latão; a tela mostra a quantia em ouro, prata,
   cobre e latão (1 ouro = 10 prata = 100 cobre = 1000 latão). */
import { describe, it, expect } from 'vitest';
import './inventario-helpers.jsx';

const { precoPorExtenso, ajudaDoPreco } = window;

describe('precoPorExtenso', () => {
  it('12000 latão são 12 moedas de ouro', () => {
    expect(precoPorExtenso(12000, 'pt')).toBe('12 moedas de ouro');
    expect(precoPorExtenso(12000, 'en')).toBe('12 gold coins');
  });
  it('quantia quebrada lista as moedas da maior para a menor', () => {
    expect(precoPorExtenso(5234, 'pt')).toBe('5 moedas de ouro, 2 de prata, 3 de cobre e 4 de latão');
    expect(precoPorExtenso(1100, 'pt')).toBe('1 moeda de ouro e 1 de prata');
  });
  it('singular, e o texto do zero', () => {
    expect(precoPorExtenso(100, 'pt')).toBe('1 moeda de prata');
    expect(precoPorExtenso(0, 'pt')).toBe('nenhuma moeda');
    expect(precoPorExtenso(0, 'pt', 'Sem valor')).toBe('Sem valor');
  });
});

describe('ajudaDoPreco (embaixo dos campos de valor)', () => {
  it('mostra a conversão; vazio não mostra nada', () => {
    expect(ajudaDoPreco('12000', 'pt')).toBe('= 12 moedas de ouro');
    expect(ajudaDoPreco('', 'pt')).toBe('');
  });
});
