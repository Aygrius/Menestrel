/* Desequipar/despir pela Ficha grava só a peça (02/10/2026): a cópia da
   Ficha pode estar velha, e gravar o JSONB inteiro apagava o que mudou por
   fora. O fluxo de mescla está coberto em inventario-concorrencia.test.js;
   aqui só a porta. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'ficha.jsx'), 'utf8');
const corpo = fonte.slice(fonte.indexOf('const salvarItensFicha'), fonte.indexOf('const desequiparFicha'));

describe('salvarItensFicha', () => {
  it('grava pelo gravarInventario, com base e versão da cópia da Ficha', () => {
    expect(corpo).toMatch(/gravarInventario\(pj\.id,\s*\{\s*base,\s*local: novoInv,\s*versao: pj\.inventario_versao\s*\}\)/);
  });
  it('não grava mais a coluna inteira direto', () => {
    expect(corpo).not.toMatch(/\.update\(\{\s*inventario/);
  });
});
