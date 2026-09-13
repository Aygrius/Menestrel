/* ============================================================
   atalhos-ficha.test.jsx — Habilidade, Magia e Item flutuantes
   ============================================================
   "Assim como hoje existe um ícone flutuante de dado, tenha ícones de
   habilidade, magia, item. Quase como um atalho." (usuário, 12/09/2026)

   Antes disto as janelas de usar habilidade e evocar magia existiam na ficha
   e nada as abria. Os testes cobrem o componente de verdade (abrir, buscar,
   escolher) e a FIAÇÃO na ficha, lida do texto-fonte: se alguém desligar o
   atalho da janela, o jogador volta a não ter onde clicar — e isso não pode
   passar calado de novo.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import '../01-core/helpers.jsx';
import './atalhos-ficha.jsx';

let Atalhos, usavel;
beforeAll(() => {
  Atalhos = window.AtalhosFicha;
  usavel = window.itemUsavelNoAtalho;
  expect(Atalhos).toBeTypeOf('function');
});
afterEach(cleanup);

const HABS = [
  { key: 'furtividade', nome: 'Furtividade', grupo: 'Subterfúgio', total: 7 },
  { key: 'alfabetizacao', nome: 'Alfabetização', grupo: 'Conhecimento', total: 3 },
];
const MAGS = [{ key: 'faro', nome: 'Faro', nivel: 3 }];
const ITENS = [{ id: 'i1', nome: 'Poção Menor de Vigor', quantidade: 2, icone: 'ti-flask' }];

const montar = (props = {}) => render(
  <Atalhos lang="pt" habilidades={HABS} magias={MAGS} itens={ITENS} {...props} />
).container;

const fab = (c, tipo) => c.querySelector(`.at-fab[data-atalho="${tipo}"]`);

describe('os botões', () => {
  it('um por tipo, na ordem Habilidade · Magia · Item', () => {
    const c = montar();
    const tipos = [...c.querySelectorAll('.at-fab')].map((b) => b.dataset.atalho);
    expect(tipos).toEqual(['habilidade', 'magia', 'item']);
  });

  it('lista vazia não ganha botão, e os de baixo sobem', () => {
    const c = montar({ magias: [] });
    expect(fab(c, 'magia')).toBeNull();
    expect(fab(c, 'item').style.getPropertyValue('--at-i')).toBe('1');
  });

  it('sem nada para usar, não monta nada', () => {
    const c = montar({ habilidades: [], magias: [], itens: [] });
    expect(c.querySelector('.at-root')).toBeNull();
  });
});

describe('a lista', () => {
  it('começa fechada; o botão abre e fecha', () => {
    const c = montar();
    expect(c.querySelector('.at-panel')).toBeNull();
    fireEvent.click(fab(c, 'habilidade'));
    expect(c.querySelector('.at-panel')).toBeTruthy();
    expect(fab(c, 'habilidade').getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(fab(c, 'habilidade'));
    expect(c.querySelector('.at-panel')).toBeNull();
  });

  it('ordena por nome e mostra o total da habilidade', () => {
    const c = montar();
    fireEvent.click(fab(c, 'habilidade'));
    const nomes = [...c.querySelectorAll('.at-linha-nome')].map((n) => n.textContent);
    expect(nomes).toEqual(['Alfabetização', 'Furtividade']);
    expect(c.querySelector('.at-linha-meta-lbl').textContent).toBe('Total');
    expect(c.querySelector('.at-linha-meta-val').textContent).toBe('3');
  });

  it('não mostra o grupo embaixo do nome (pedido do usuário, 12/09/2026)', () => {
    const c = montar();
    fireEvent.click(fab(c, 'habilidade'));
    expect(c.querySelector('.at-linha-sub')).toBeNull();
    expect(c.querySelector('.at-lista').textContent).not.toMatch(/Subterfúgio|Conhecimento/);
  });

  it('busca ignora acento e acha pelo grupo', () => {
    const c = montar();
    fireEvent.click(fab(c, 'habilidade'));
    const busca = c.querySelector('.at-busca');
    fireEvent.change(busca, { target: { value: 'alfabetizacao' } });
    expect(c.querySelectorAll('.at-linha')).toHaveLength(1);
    fireEvent.change(busca, { target: { value: 'subterf' } });
    expect(c.querySelector('.at-linha-nome').textContent).toBe('Furtividade');
    fireEvent.change(busca, { target: { value: 'zzz' } });
    expect(c.querySelector('.at-vazio').textContent).toMatch(/Nenhuma habilidade/);
  });

  it('magia mostra o nível; item mostra a quantidade — com o nome escrito', () => {
    const c = montar();
    fireEvent.click(fab(c, 'magia'));
    expect(c.querySelector('.at-linha-meta-lbl').textContent).toBe('Nível');
    expect(c.querySelector('.at-linha-meta-val').textContent).toBe('3');
    fireEvent.click(fab(c, 'item'));
    expect(c.querySelector('.at-linha-meta-lbl').textContent).toBe('Quantidade');
    expect(c.querySelector('.at-linha-meta-val').textContent).toBe('2');
  });

  it('Esc fecha', () => {
    const c = montar();
    fireEvent.click(fab(c, 'magia'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(c.querySelector('.at-panel')).toBeNull();
  });
});

describe('escolher entrega a chave e fecha', () => {
  it.each([
    ['habilidade', 'onHabilidade', 'furtividade', 'Furtividade'],
    ['magia', 'onMagia', 'faro', 'Faro'],
    ['item', 'onItem', 'i1', 'Poção Menor de Vigor'],
  ])('%s', (tipo, prop, chave, nome) => {
    const cb = vi.fn();
    const c = montar({ [prop]: cb });
    fireEvent.click(fab(c, tipo));
    const linha = [...c.querySelectorAll('.at-linha')].find((l) => l.textContent.includes(nome));
    fireEvent.click(linha);
    expect(cb).toHaveBeenCalledWith(chave);
    expect(c.querySelector('.at-panel')).toBeNull();
  });
});

describe('itemUsavelNoAtalho — só o que a janela deixaria Usar', () => {
  it.each([
    [{ grupo: 'Consumíveis' }, true],
    [{ grupo: 'Bebidas', tipo: 'L' }, true],
    [{ grupo: 'Armas', categoria_equip: 'mao' }, false],
    [{ grupo: 'Consumíveis', armazena: 4 }, false],
    [{ grupo: 'Consumíveis', magia: 'faro', nivel_magia: 3 }, false],
    [{ grupo: 'Ferramentas' }, false],
    [null, false],
  ])('%j → %s', (cat, esperado) => {
    expect(usavel(cat)).toBe(esperado);
  });
});

describe('a ficha liga os atalhos às janelas que já existiam', () => {
  const fonte = readFileSync(resolve(__dirname, 'ficha.jsx'), 'utf8');

  it('cada escolha abre a janela certa', () => {
    expect(fonte).toMatch(/onHabilidade=\{\(key\) => setHabilidadeDetalheKey\(key\)\}/);
    expect(fonte).toMatch(/onMagia=\{\(key\) => setMagiaDetalheKey\(key\)\}/);
    expect(fonte).toMatch(/onItem=\{\(id\) => setDetalheCintoId\(id\)\}/);
  });

  it('só o dono, e só fora das abas que têm cópia própria do inventário', () => {
    expect(fonte).toMatch(/mostrarAtalhos = [^;]*podeEditarFoto && \(fpTab === 'ficha' \|\| fpTab === 'info'\)/);
  });

  it('o main carrega os atalhos antes da ficha', () => {
    const main = readFileSync(resolve(__dirname, '../main.tsx'), 'utf8');
    expect(main.indexOf("./11-ficha/atalhos-ficha.jsx")).toBeGreaterThan(-1);
    expect(main.indexOf("./11-ficha/atalhos-ficha.jsx")).toBeLessThan(main.indexOf("./11-ficha/ficha.jsx"));
  });
});
