/* ============================================================
   refetch-pjs.test.js — todo refetch de PJ traz as MESMAS colunas
   ============================================================
   Bug que motivou o arquivo (auditoria 01/09/2026):

   InventarioList lia `personagens` em três lugares, com três listas de
   colunas DIFERENTES:

     carga inicial   id,nome,sobrenome,raca,profissao,forca_base,fisico_base,
                     inventario,estado_atual
     transferirItem  id,nome,sobrenome,raca,profissao,inventario
     aprenderMagia   id,nome,sobrenome,raca,profissao,forca_base,fisico_base,
                     inventario

   Como os dois refetches fazem `setPjs(pjsAtualizados)` — substituindo o
   array inteiro —, transferir um item apagava `estado_atual`, `forca_base` e
   `fisico_base` do cache local de TODOS os PJs. Efeitos:

     • a capacidade de carga desabava na hora, porque calcCarga recebe
       forca_base/fisico_base do `pjs` (ver o useMemo `carga`) e passava a
       receber undefined — o medidor mostrava só a base;
     • `estado_atual` sumia do cache, e o autosave de estado (que semeia de
       pjs[selectedId].estado_atual ao trocar de PJ) podia gravar `{}` por
       cima das condições e da vitalidade no banco.

   A lista virou uma constante única. Este teste existe pra que um quarto
   refetch não nasça com a própria lista.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Mesmo padrão de 12-batalha/globais-tabuleiro.test.js: import.meta.url não
// chega como file:// neste setup, então resolve pelo dirname.
const aqui = dirname(fileURLToPath(import.meta.url));
const fonte = readFileSync(resolve(aqui, 'inventario.jsx'), 'utf8');

describe('refetch de personagens em InventarioList', () => {
  it('nenhum select de personagens traz lista de colunas literal', () => {
    // Toda leitura tem que passar pela constante compartilhada. Um literal
    // aqui é exatamente como as três listas divergiram.
    const literais = fonte.match(/from\('personagens'\)\s*\.?\s*\n?\s*\.select\('[^']+'\)/g) || [];
    expect(literais, `select com colunas literais: ${literais.join(' | ')}`).toHaveLength(0);
  });

  it('a constante cobre o que o resto do componente consome', () => {
    const m = fonte.match(/const PJ_COLS\s*=\s*'([^']+)'/);
    expect(m, 'PJ_COLS precisa existir').toBeTruthy();
    const cols = m[1].split(',').map((s) => s.trim());
    // calcCarga lê forca_base/fisico_base; o autosave de estado semeia de
    // estado_atual; o resto identifica e desenha o PJ.
    for (const c of ['id', 'nome', 'sobrenome', 'raca', 'profissao',
                     'forca_base', 'fisico_base', 'inventario', 'estado_atual']) {
      expect(cols, `PJ_COLS sem ${c}`).toContain(c);
    }
  });

  it('todo select de personagens usa a constante', () => {
    const selects = (fonte.match(/from\('personagens'\)[\s\S]{0,60}?\.select\(([^)]+)\)/g) || []);
    expect(selects.length).toBeGreaterThanOrEqual(3);
    for (const s of selects) {
      expect(s, `select fora da constante: ${s.slice(0, 80)}`).toMatch(/\.select\(PJ_COLS\)/);
    }
  });
});
