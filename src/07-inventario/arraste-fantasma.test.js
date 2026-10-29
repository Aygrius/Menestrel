/* ============================================================
   arraste-fantasma.test.js — o que se arrasta mede o que se larga
   ============================================================
   Pedido do usuário (27/10/2026): "quando eu arrasto um item em
   loja/inventário a imagem fica gigante".

   `.inv-drag-ghost` — o quadrado que segue o cursor durante o arraste — não
   tinha regra NENHUMA no index.css, e era portado para o `<body>`. Como a
   folha inteira é escopada em `#root .menestrel-ui …`, no body nada o
   alcança: a pintura saía no tamanho natural do arquivo (240px, medido) e o
   `left/top` nem colava, porque o `position: fixed` também não chegava.

   É a MESMA armadilha que o PortalTooltip, no mesmo arquivo, já documenta
   desde que a sofreu: "precisa montar DENTRO de um ancestral .menestrel-ui
   real […] sem isso, position:fixed nunca era aplicado". O fantasma ficou
   para trás.

   O bug é antigo e foi ficando pior sozinho: enquanto o fantasma era um glifo
   de fonte o estrago passava, e conforme os itens ganharam pintura (23/10 em
   diante) virou uma imagem de 240px presa ao cursor.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const inv = readFileSync(resolve(__dirname, './inventario.jsx'), 'utf8');
const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');

describe('o fantasma do arraste', () => {
  it('monta dentro de .menestrel-ui, e não no body', () => {
    expect(inv).toMatch(/const alvo = document\.querySelector\('\.menestrel-ui'\) \|\| document\.body;/);
    // E o bloco do fantasma usa esse alvo.
    const i = inv.indexOf('className="inv-drag-ghost"');
    expect(i).toBeGreaterThan(-1);
    expect(inv.slice(i, i + 400)).toMatch(/\n\s*alvo\n/);
  });

  it('tem pele própria, escopada como o resto da folha', () => {
    expect(css).toMatch(/#root \.menestrel-ui \.inv-drag-ghost \{/);
  });

  /* O tamanho é o da casa, pelo token — o que está na mão mede o mesmo que a
     casa de onde saiu e a casa onde vai cair. */
  it('mede a casa da grade, pelo mesmo token', () => {
    const i = css.indexOf('#root .menestrel-ui .inv-drag-ghost {');
    const bloco = css.slice(i, css.indexOf('}', i));
    expect(bloco).toMatch(/width: var\(--inv-casa\); height: var\(--inv-casa\);/);
    expect(bloco).toMatch(/position: fixed;/);
  });

  /* Sem isto o fantasma tapa o slot de destino e `elementFromPoint` devolve
     ele mesmo — o arraste não saberia onde o item vai cair. */
  it('não recebe evento nenhum', () => {
    const i = css.indexOf('#root .menestrel-ui .inv-drag-ghost {');
    expect(css.slice(i, css.indexOf('}', i))).toMatch(/pointer-events: none;/);
  });

  it('e a pintura cabe na casa em vez de sair no tamanho do arquivo', () => {
    expect(css).toMatch(/\.inv-drag-ghost \.inv-card-arte \{\r?\n\s*width: 100%; height: 100%; object-fit: contain;/);
  });
});
