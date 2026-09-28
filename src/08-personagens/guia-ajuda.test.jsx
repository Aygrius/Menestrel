/* ============================================================
   guia-ajuda.test.jsx — a página de Ajuda readequada (26/09/2026)
   ============================================================
   "Faça uma readequação da página ajuda, explicando todas as regras do jogo
    atuais." + "Mude os nomes dos tópicos para Gêneros, Raças, Reinos,
    Profissões, Especializações, Atributos, Armas, Habilidades, Magias,
    Arquétipos, Resumo." (usuário)

   A página antiga dizia que o Meio-Elfo não tinha Físico negativo e que o
   Anão tinha Agilidade −1 — números digitados à mão que envelheceram. A
   tabela de raças agora lê GAME_DATA; este teste prende as duas coisas: os
   tópicos pedidos e os modificadores vindos do código.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/select-pill.jsx';
import './guia_personagem.jsx';

afterEach(cleanup);

let Guia;
beforeAll(() => { Guia = window.GuiaPersonagem; });

describe('Ajuda — tópicos e regras', () => {
  it('o sumário tem os onze tópicos pedidos, na ordem', () => {
    render(<Guia lang="pt" />);
    const toc = [...document.querySelectorAll('.gp-toc-link')].map((a) => a.textContent.trim());
    expect(toc).toEqual(['Gêneros', 'Raças', 'Reinos', 'Profissões', 'Especializações',
      'Atributos', 'Armas', 'Habilidades', 'Magias', 'Arquétipos', 'Resumo']);
    // Cada link aponta para uma seção que existe.
    [...document.querySelectorAll('.gp-toc-link')].forEach((a) => {
      expect(document.getElementById(a.getAttribute('href').slice(1))).toBeTruthy();
    });
  });

  it('a tabela de raças usa os modificadores do GAME_DATA', () => {
    render(<Guia lang="pt" />);
    const linha = (nome) => [...document.querySelectorAll('#gp-racas tbody tr')]
      .find((tr) => tr.querySelector('td').textContent === nome);
    // Colunas: Raça, For, Fís, Agi, Per, Int, Aur, Car, Altura, Pontos livres
    const anao = [...linha('Anão').querySelectorAll('td')].map((t) => t.textContent);
    expect(anao.slice(1, 8)).toEqual(['+2', '+2', '−2', '0', '0', '−1', '−1']);
    const meioElfo = [...linha('Meio-Elfo').querySelectorAll('td')].map((t) => t.textContent);
    expect(meioElfo[2]).toBe('−1');                 // Físico −1, não "sem Físico negativo"
    expect(meioElfo[9]).toBe('+2,5');               // bonusPontosRaca
    expect(linha('Humano').lastChild.textContent).toBe('+4');
  });

  it('as especializações vêm do catálogo, com o título', () => {
    render(<Guia lang="pt" />);
    const txt = document.getElementById('gp-especializacoes').textContent;
    expect(txt).toContain('Colégio Necromântico');
    expect(txt).toContain('Necromante');
    expect(txt).toContain('Ordem de Plandis');
  });

  it('o simulador de elementos segue a regra do motor', () => {
    render(<Guia lang="pt" />);
    const txt = document.getElementById('gp-profissoes').textContent;
    expect(txt).toContain('+10%');                  // Fogo contra Ar, o par inicial
    expect(txt).toMatch(/um golpe de 20 vira 22/);
  });

  it('título sem degradê e sem rótulo acima dele', () => {
    render(<Guia lang="pt" />);
    expect(document.querySelector('.gp-h1-grad')).toBeNull();
    expect(document.querySelector('.gp-eyebrow')).toBeNull();
    expect(document.querySelector('.gp-h1').textContent)
      .toBe('Guia para criação de personagens: o peso de cada escolha');
  });
});
