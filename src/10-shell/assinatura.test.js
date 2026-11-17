/* O BR Code do Pix estático (17/11/2026) — ver 10-shell/assinatura.jsx. */
import { describe, it, expect, beforeAll } from 'vitest';

let W;
beforeAll(async () => {
  globalThis.React = globalThis.React || (await import('react')).default;
  await import('./assinatura.jsx');
  W = window;
});

describe('payloadPix', () => {
  it('bate com o exemplo do Manual do BR Code (sem valor)', () => {
    const p = W.payloadPix({ chave: '123e4567-e12b-12d1-a456-426655440000', nome: 'Fulano de Tal', cidade: 'BRASILIA', txid: '***' });
    expect(p).toBe('00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D');
  });

  it('leva o valor com duas casas e termina num CRC de 4 dígitos', () => {
    const p = W.payloadPix({ chave: 'abc', nome: 'Fulano', cidade: 'Rio', valor: 5.99, txid: 'NOBRE123' });
    expect(p).toContain('54045.99');
    expect(p).toContain('62120508NOBRE123');
    expect(p).toMatch(/6304[0-9A-F]{4}$/);
    expect(p.slice(-4)).toBe(W.crc16Pix(p.slice(0, -4)));
  });

  it('tira acento do nome e da cidade e corta no tamanho do campo', () => {
    const p = W.payloadPix({ chave: 'k', nome: 'João da Conceição Ávila Pereira', cidade: 'São José dos Campos', valor: 199 });
    expect(p).toContain('5925Joao da Conceicao Avila P');
    expect(p).toContain('6015Sao Jose dos Ca');
    expect(p).toContain('5406199.00');
  });

  it('os dois planos do pedido: 5,99 e 199,00', () => {
    expect(W.PLANOS_PIX.map((p) => [p.id, p.valor])).toEqual([['nobre', 5.99], ['conselheiro', 199]]);
  });
});
