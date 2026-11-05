/* ============================================================
   lamina-dos-trilhos.test.js — o efeito novo dos trilhos
   ============================================================
   Pedido do usuário (04/11/2026): "Crie uma animação no trilho ao passar o
   mouse entre um menu e outro, remova a borda amarela do botão ativo, crie um
   efeito novo." A lâmina desliza de um botão a outro e pousa, com a brasa,
   na página aberta. Conferido no navegador: trilho da ficha, das páginas
   (Mesa, Ambientação, Diário) e do Estoque.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const shell = readFileSync(resolve(__dirname, 'shell.jsx'), 'utf8');
const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');

describe('a lâmina dos trilhos', () => {
  it('é instalada uma vez, por delegação no document', () => {
    expect(shell).toMatch(/function instalarLaminaDosTrilhos\(\)/);
    expect(shell).toMatch(/window\.__laminaDosTrilhos = true;/);
    expect(shell).toMatch(/document\.addEventListener\('pointerover', sobre, true\);/);
    expect(shell).toMatch(/document\.addEventListener\('focusin', sobre, true\);/);
    expect(shell).toMatch(/\ninstalarLaminaDosTrilhos\(\);/);
  });

  it('não insere nós no DOM do React: marca com atributo e posiciona por variável', () => {
    expect(shell).toMatch(/trilho\.setAttribute\('data-lamina', ''\);/);
    expect(shell).toMatch(/st\.setProperty\('--lamina-x'/);
    expect(shell).not.toMatch(/createElement\('span'\)[\s\S]{0,80}trilho-lamina/);
  });

  it('desliza na curva de saída, e pousa parada para quem pede menos movimento', () => {
    expect(css).toMatch(/transform \.26s cubic-bezier\(\.16, 1, \.3, 1\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*#root \.menestrel-ui \[data-lamina\]::before \{ transition: opacity \.12s linear; \}/);
  });

  it('a página aberta é marcada pela brasa, não pelo aro amarelo', () => {
    expect(css).toMatch(/\[data-lamina\]\[data-lamina-modo="ativo"\]::before \{\s*background:\s*radial-gradient/);
    expect(css).toMatch(/\.livro-trilho \.mc-acao\.is-ativo,\s*\n#root \.menestrel-ui \.mc-acoes-ficha \.fp-aba-trilho\.is-ativo \{ border-color: transparent; \}/);
  });

  it('o trilho de ações do shell segue sticky; o da ficha vira referência', () => {
    expect(css).toMatch(/\[data-lamina\]:not\(#mc-acoes-ficha\) \{ position: relative; \}/);
  });

  it('o selo de pontos não recebe a lâmina', () => {
    expect(shell).toMatch(/b\.classList\.contains\('pc-pontos'\)\) return null;/);
  });
});

describe('o rodapé da ficha numa linha só', () => {
  it('a faixa da data não quebra; quem cede é o texto da data', () => {
    expect(css).toMatch(/\.fp3-rodape-dados \.cdj-trilho \{ flex-wrap: nowrap; \}/);
    expect(css).toMatch(/\.fp3-rodape-dados \.cdj-data \{ min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; \}/);
  });
});
