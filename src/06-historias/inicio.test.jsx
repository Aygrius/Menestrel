/* ============================================================
   inicio.test.jsx — a página do Mestre sem mesa (15/11/2026)
   ============================================================
   Usuário: "Quando não houver mesa selecionada, eu não quero os cards de
   histórias na tela principal, ao contrário disso eu quero uma 'home page'
   com as atualizações do sistema. Notícias sobre sistema de batalha, sistema
   de mapa, criação de personagem, etc." e "No botão 'Escolher mesa' faltou a
   opção 'Criar mesa'".
   ============================================================ */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import './inicio.jsx';

afterEach(cleanup);
const fonte = (rel) => readFileSync(resolve(__dirname, rel), 'utf8');

describe('as novidades do sistema', () => {
  it('trazem batalha, mapa e criação de personagem, da mais nova para a mais velha', () => {
    const areas = window.NOTICIAS_DO_SISTEMA.map((n) => n.area);
    for (const a of ['batalha', 'mapa', 'personagem']) expect(areas).toContain(a);
    const datas = window.NOTICIAS_DO_SISTEMA.map((n) => n.data);
    expect([...datas].sort().reverse()).toEqual(datas);
    window.NOTICIAS_DO_SISTEMA.forEach((n) => expect(window.AREAS_NOTICIA[n.area]).toBeTruthy());
  });
  it('a página mostra uma linha por notícia, com data e área', () => {
    render(<div id="root"><div className="menestrel-ui"><window.InicioNovidades lang="pt" /></div></div>);
    expect(document.querySelector('.inicio-titulo').textContent).toBe('Novidades do Menestrel');
    expect(document.querySelectorAll('.inicio-noticia')).toHaveLength(window.NOTICIAS_DO_SISTEMA.length);
    expect(document.querySelector('.inicio-noticia time').getAttribute('dateTime')).toBe(window.NOTICIAS_DO_SISTEMA[0].data);
  });
  it('sem mesa escolhida, a lista de histórias mostra o início no lugar dos cards', () => {
    expect(fonte('historias.jsx')).toMatch(/\(!mesaAtivaId && window\.InicioNovidades\) \? \([\s\S]{0,300}<window\.InicioNovidades lang=\{lang\} \/>[\s\S]{0,40}\) : \(\s*<div className="hist-grid">/);
  });
});

describe('Criar mesa no menu da mesa', () => {
  const shell = fonte('../10-shell/shell.jsx');
  it('o menu "Escolher mesa" tem Criar mesa, que pede o modal à lista de histórias', () => {
    expect(shell).toMatch(/setPedirNovaMesa\(true\);[\s\S]{0,200}'Create table' : 'Criar mesa'/);
    expect(shell).toMatch(/pedirNova=\{pedirNovaMesa\} onNovaAtendida=\{novaMesaAtendida\}/);
  });
  it('a lista abre o modal quando recebe o pedido e avisa as mesas ao menu', () => {
    const h = fonte('historias.jsx');
    expect(h).toMatch(/if \(!pedirNova \|\| !Array\.isArray\(historias\)\) return;\s*setModalOpen\(true\);/);
    expect(h).toMatch(/onHistorias\(histData\.historias\)/);
  });
});

/* 15/11/2026, usuário: "Para o jogador, na página 'Ficha' quando não houver
   personagem criado, mostre um grande card ocupando a tela toda" — "uma tela
   convidando o jogador a criar seu personagem". */
describe('a Ficha do Jogador sem personagem', () => {
  const pjs = fonte('../08-personagens/personagens.jsx');
  it('vira o convite, com um botão que abre o assistente de criação', () => {
    expect(pjs).toMatch(/const primeiroPj = convidarPrimeiro && !isMaster && personagens\.length === 0;/);
    expect(pjs).toMatch(/onClick=\{\(\) => setModalOpen\(true\)\}>\s*<i className="ti ti-user-plus" aria-hidden="true" \/>\s*\{lang === 'en' \? 'Create character' : 'Criar personagem'\}/);
  });
  it('só na página Ficha', () => {
    expect(fonte('../10-shell/shell.jsx')).toMatch(/convidarPrimeiro=\{current\.id === 'ficha'\}/);
  });
});
