/* ============================================================
   amigos-no-menu.test.jsx — Amigos saiu do trilho
   ============================================================
   Pedido do usuário (27/10/2026): "o menu 'amigos' que está no trilho vai
   para o menu da esquerda."

   O botão do pacto virou folha do menu; o que fica na tela são os CARDS dos
   amigos na borda esquerda — eles não são menu, são o destino do arraste de
   item do inventário. Entre o menu e o componente há um EVENTO, porque o
   clique no menu também navega: quem já está no ar ouve o evento; quem monta
   logo depois lê o pedido recente.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';

let AmigosFab;
beforeAll(async () => {
  window.supabaseClient = {
    rpc: () => Promise.resolve({
      data: [
        { id: 'pj-1', nome: 'Lirael', sobrenome: "Vel'Thalas", estado: 'selado' },
        { id: 'pj-2', nome: 'Eco', sobrenome: 'do Vale', estado: 'nenhum' },
      ],
      error: null,
    }),
  };
  await import('./amigos-fab.jsx');
  AmigosFab = window.AmigosFab;
  expect(AmigosFab).toBeTypeOf('function');
  if (!document.querySelector('#root .menestrel-ui')) {
    const root = document.createElement('div');
    root.id = 'root';
    root.innerHTML = '<div class="menestrel-ui"></div>';
    document.body.appendChild(root);
  }
});

afterEach(() => { cleanup(); window.__amigosPedido = 0; });

const montar = async (props = {}) => {
  await act(async () => { render(<AmigosFab lang="pt" pjId="pj-eu" semBotao {...props} />); });
};

describe('o botão do pacto', () => {
  it('não existe mais na tela quando o menu é quem chama', async () => {
    await montar();
    expect(document.querySelector('.amg-fab')).toBeNull();
  });

  it('os cards dos amigos ficam — eles são o alvo do arraste', async () => {
    await montar();
    expect(document.querySelectorAll('.amg-amigo').length).toBeGreaterThan(0);
  });

  it('sem o botão na frente, o primeiro card ocupa o lugar dele', async () => {
    await montar();
    const primeiro = document.querySelector('.amg-amigo');
    expect(primeiro.style.getPropertyValue('--amg-i')).toBe('0');
  });
});

describe('o menu da esquerda abre o modal', () => {
  it('o evento `menestrel:amigos` abre o pacto', async () => {
    await montar();
    expect(document.querySelector('.ms-modal')).toBeNull();
    await act(async () => { window.dispatchEvent(new CustomEvent('menestrel:amigos')); });
    expect(screen.getByText("Lirael Vel'Thalas")).toBeTruthy();
  });

  it('pedido recente de antes da montagem também abre (o clique navega primeiro)', async () => {
    window.__amigosPedido = Date.now();
    await montar();
    expect(screen.getByText('Eco do Vale')).toBeTruthy();
  });

  it('pedido velho não abre nada — é de outra visita', async () => {
    window.__amigosPedido = Date.now() - 60000;
    await montar();
    expect(document.querySelector('.amg-lista')).toBeNull();
  });
});

describe('a folha do menu', () => {
  const constantes = readFileSync(resolve(__dirname, '../01-core/constants.jsx'), 'utf8');
  const shell = readFileSync(resolve(__dirname, '../10-shell/shell.jsx'), 'utf8');

  it('existe no menu do Jogador, com evento em vez de seção', () => {
    expect(constantes).toMatch(/id: 'ficha_amigos', evento: 'menestrel:amigos'/);
  });

  it('existe no submenu do personagem, no Mestre', () => {
    expect(shell).toMatch(/':amigos'[\s\S]{0,160}evento: 'menestrel:amigos'/);
  });

  it('o clique dispara o evento em vez de navegar', () => {
    expect(shell).toMatch(/if \(no\.evento\) \{/);
    expect(shell).toMatch(/window\.dispatchEvent\(new CustomEvent\(no\.evento\)\)/);
  });

  it('a ficha não porta mais o Amigos para a barra de ações', () => {
    const ficha = readFileSync(resolve(__dirname, './ficha.jsx'), 'utf8');
    expect(ficha).toMatch(/<AmigosFab lang=\{lang\} pjId=\{pjAtivoId\} semBotao \/>/);
    expect(ficha).not.toMatch(/<AmigosFab[^>]*naBarra/);
  });
});
