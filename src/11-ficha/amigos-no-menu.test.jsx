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

/* AMIGOS É PÁGINA (02/11/2026, paginas-ficha.jsx): o evento do menu leva a
   ficha à página Amigos; a coluna dos cards não abre mais modal nenhum. */
describe('o menu da esquerda abre a página Amigos', () => {
  it('o evento `menestrel:amigos` não abre mais o modal da coluna', async () => {
    await montar();
    await act(async () => { window.dispatchEvent(new CustomEvent('menestrel:amigos')); });
    expect(document.querySelector('.amg-lista')).toBeNull();
  });

  it('quem ouve é a ficha, e ela vai para a página Amigos', () => {
    const ficha = readFileSync(resolve(__dirname, './ficha.jsx'), 'utf8');
    expect(ficha).toMatch(/const abrir = \(\) => setFpTab\('amigos'\);/);
    expect(ficha).toMatch(/window\.addEventListener\('menestrel:amigos', abrir\)/);
    expect(ficha).toMatch(/window\.__amigosPedido/);
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

  /* 04/11/2026: saiu do menu do Jogador junto com a gaveta da Mesa — Amigos
     é botão do trilho da ficha ("O menu mesa não está atualizado como
     fizemos para o mestre", com a escolha "Mesa + Diário em trilho"). */
  it('não existe mais no menu do Jogador: mora no trilho da ficha', () => {
    expect(constantes).not.toMatch(/id: 'ficha_amigos', evento: 'menestrel:amigos'/);
    const ficha = readFileSync(resolve(__dirname, 'ficha.jsx'), 'utf8');
    expect(ficha).toMatch(/botaoPagina\('amigos', 'ti-heart-handshake', 'Amigos', 'Friends'\)/);
  });

  // 02/11/2026: no Mestre, Amigos mora só no trilho da ficha.
  it('não existe mais no submenu do personagem, no Mestre', () => {
    expect(shell).not.toMatch(/':amigos', secao: 'personagens_m'/);
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
