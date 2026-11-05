/* ============================================================
   paginas-ficha.test.jsx — Status, Atividades, Habilidades… em casas
   ============================================================
   Pedido do usuário (02/11/2026): "As páginas status, atividades,
   habilidades, magias, companheiros, amigos, vão abrir uma página igual
   'inventário', com casas para selecionar o conteúdo, e mostrar os detalhes
   do conteúdo à direita, com os botões de ações em forma de leque."
   ============================================================ */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/status-efeito.jsx';
import '../01-core/clima-desgaste.jsx';
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';
import './atalhos-ficha.jsx';
import './paginas-ficha.jsx';

// A grade mede o espaço (useGridDimensions); o jsdom não tem ResizeObserver.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}
afterEach(cleanup);

const casas = () => Array.from(document.querySelectorAll('button[data-casa]')).map((b) => b.dataset.casa);
const HABS = [
  { key: 'correr', nome: 'Correr', grupo: 'Manobra', total: 4 },
  { key: 'arrombar', nome: 'Arrombar', grupo: 'Subterfúgio', total: -5, bloqueio: 'Precisa comprar.' },
];

describe('a moldura é a do Inventário', () => {
  it('as casas moram na grade de casas do baú', () => {
    render(<window.PaginaHabilidades lang="pt" habilidades={HABS} onRolar={() => {}} />);
    expect(casas()).toEqual(['arrombar', 'correr']);
    const casa = document.querySelector('button[data-casa="correr"]');
    expect(casa.classList.contains('inv-card')).toBe(true);
    expect(casa.closest('.inv-bag-grid--slots')).toBeTruthy();
  });
});

describe('Habilidades: o leque é a dificuldade', () => {
  it('cinco discos, e escolher um rola com a dificuldade', () => {
    let rolou = null;
    render(<window.PaginaHabilidades lang="pt" habilidades={HABS} onRolar={(k, x) => { rolou = [k, x]; }} />);
    fireEvent.click(document.querySelector('button[data-casa="correr"]'));
    const bolhas = document.querySelectorAll('.inv-leque-bolha .inv-leque-disco');
    expect(bolhas.length).toBe(5);
    fireEvent.click(document.querySelector('[data-acao-leque="medio"]'));
    expect(rolou).toEqual(['correr', { dificuldade: 'medio' }]);
  });

  it('a bloqueada fica apagada e o leque não rola', () => {
    let rolou = false;
    render(<window.PaginaHabilidades lang="pt" habilidades={HABS} onRolar={() => { rolou = true; }} />);
    const casa = document.querySelector('button[data-casa="arrombar"]');
    expect(casa.classList.contains('is-apagada')).toBe(true);
    fireEvent.click(casa);
    fireEvent.click(document.querySelector('[data-acao-leque="facil"]'));
    expect(rolou).toBe(false);
  });
});

describe('Status: o que está valendo fica aceso', () => {
  it('o status vigente ganha o ponto e o leque de remover', () => {
    const removidos = [];
    render(<window.PaginaStatus lang="pt" lista={[{ id: 'veneno:abc', nome: 'Envenenado' }]}
      podeEditar onAplicar={() => {}} onRemover={(id) => removidos.push(id)} />);
    const casa = document.querySelector('button[data-casa="veneno"]');
    expect(casa.classList.contains('is-acesa')).toBe(true);
    fireEvent.click(casa);
    fireEvent.click(document.querySelector('[data-acao-leque="remover"]'));
    expect(removidos).toEqual(['veneno:abc']);
  });

  it('o Jogador só olha: sem leque', () => {
    render(<window.PaginaStatus lang="pt" lista={[]} podeEditar={false} />);
    fireEvent.click(document.querySelector('button[data-casa="veneno"]'));
    expect(document.querySelector('.inv-leque-bolha')).toBeNull();
  });
});

describe('Atividades: o verbo, ou Parar na ligada', () => {
  it('a ligada oferece Parar', () => {
    let escolhida = 'x';
    render(<window.PaginaAtividades lang="pt" atividade={{ tipo: 'dormindo' }} podeEditar
      onEscolher={(id) => { escolhida = id; }} />);
    fireEvent.click(document.querySelector('button[data-casa="dormindo"]'));
    fireEvent.click(document.querySelector('[data-acao-leque="parar"]'));
    expect(escolhida).toBeNull();
  });
});

describe('o trilho da ficha', () => {
  const ficha = readFileSync(resolve(__dirname, './ficha.jsx'), 'utf8');
  it('Itens saiu: os atalhos não desenham mais botão', () => {
    expect(ficha).toMatch(/semBotoes direto=\{\{ tipo: 'magia', id: magiaDireta \}\}/);
  });
  it('as páginas novas têm botão no trilho', () => {
    ['atividades', 'habilidades', 'tecnicas', 'magias', 'amigos'].forEach((aba) => {
      expect(ficha, aba).toMatch(new RegExp(`botaoPagina\\('${aba}'`));
    });
  });
  /* 04/11/2026, usuário: "Remova o menu 'status' da ficha do personagem,
     mesmo para o mestre, esse status irá acontecer apenas em batalha." */
  it('Status saiu da ficha: nem botão, nem página', () => {
    expect(ficha).not.toMatch(/botaoPagina\('status'/);
    expect(ficha).not.toMatch(/fpTab === 'status'/);
    expect(ficha).not.toMatch(/<FichaStatusSeletor/);
  });
  it('o main carrega as páginas antes da ficha', () => {
    const main = readFileSync(resolve(__dirname, '../main.tsx'), 'utf8');
    expect(main.indexOf('paginas-ficha.jsx')).toBeGreaterThan(-1);
    expect(main.indexOf('paginas-ficha.jsx')).toBeLessThan(main.indexOf('11-ficha/ficha.jsx'));
  });
});

/* TÉCNICAS VIRARAM PÁGINA (04/11/2026, usuário: "adicione a aba Técnicas").
   Só leitura: o clique escolhe, o leque não abre, e o painel conta a técnica. */
describe('Técnicas: casas e painel, sem leque', () => {
  const TECS = [
    { key: 'esquiva', nome: 'Esquiva', tipo: 'Básica', total: 7, nivel: 2, descricao: 'Desvia do golpe.', uso: '1 por rodada', custo: 2 },
    { key: 'furia', nome: 'Fúria', tipo: 'Especializada', total: 3, nivel: 1 },
  ];
  it('uma casa por técnica, com o total no canto', () => {
    render(<window.PaginaTecnicas lang="pt" tecnicas={TECS} />);
    expect(casas()).toEqual(['esquiva', 'furia']);
    expect(document.querySelector('button[data-casa="esquiva"] .pc-casa-marca').textContent).toBe('7');
  });
  it('clicar não abre leque de ações', () => {
    render(<window.PaginaTecnicas lang="pt" tecnicas={TECS} />);
    fireEvent.click(document.querySelector('button[data-casa="esquiva"]'));
    expect(document.querySelector('.inv-leque-bolha')).toBeNull();
  });
});

/* OS PONTOS NO TOPO (04/11/2026, usuário: "Quero, adicione os pontos"). */
describe('Técnicas e Magias mostram os pontos', () => {
  // 05/11/2026: o selo mostra o SALDO ("5/5" = ainda tem 5 de 5).
  it('Técnicas: saldo / total', () => {
    render(<window.PaginaTecnicas lang="pt" tecnicas={[]} pontos={{ gasto: 2, total: 14 }} />);
    const selo = document.querySelector('.pc-pontos');
    expect(selo.textContent).toMatch(/Pontos de técnica/);
    expect(selo.querySelector('.pc-pontos-num').textContent).toBe('12/14');
    expect(selo.classList.contains('is-excedido')).toBe(false);
  });
  it('Magias acima do total fica em brasa', () => {
    render(<window.PaginaMagias lang="pt" magias={[]} pontos={{ gasto: 5, total: 4 }} onEvocar={() => {}} />);
    const selo = document.querySelector('.pc-pontos');
    expect(selo.textContent).toMatch(/Pontos de magia/);
    expect(selo.querySelector('.pc-pontos-num').textContent).toBe('-1/4');
    expect(selo.classList.contains('is-excedido')).toBe(true);
  });
  it('nada gasto: 5/5', () => {
    render(<window.PaginaMagias lang="pt" magias={[]} pontos={{ gasto: 0, total: 5 }} onEvocar={() => {}} />);
    expect(document.querySelector('.pc-pontos-num').textContent).toBe('5/5');
  });
  it('sem conta, sem selo', () => {
    render(<window.PaginaMagias lang="pt" magias={[]} onEvocar={() => {}} />);
    expect(document.querySelector('.pc-pontos')).toBeNull();
  });
});
