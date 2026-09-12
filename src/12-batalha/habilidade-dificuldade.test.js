/* ============================================================
   habilidade-dificuldade.test.js — a aba Habilidade dá veredito
   ============================================================
   A aba rolava o dado e mostrava a QUALIDADE ("→ Difícil"), e parava aí. Quem
   lia — Mestre ou jogador — tinha que julgar de cabeça se aquilo bastava para
   o que havia sido pedido.

   Na FICHA o mesmo teste sempre pediu a dificuldade e respondeu sucesso ou
   falha. A divergência virou gritante em 12/09/2026, quando o motor aprendeu a
   julgar teste de habilidade por causa da magia Proteção Natural: a aba
   Habilidade passou a ser o único lugar do jogo que rolava sem régua.

   O que este arquivo trava é que a régua é UMA SÓ.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import '../02-shell/dado-d20.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; });

describe('a régua é a mesma da ficha', () => {
  it('a tabela de qualidade mínima é a do overlay da ficha', () => {
    // Não é uma cópia: é o MESMO objeto. Duas tabelas divergiriam no dia em
    // que alguém mexesse numa só.
    expect(window.D20_QUALIDADE_MINIMA).toBeDefined();
    expect(window.D20_QUALIDADE_MINIMA.absurdo).toBe(7);
  });

  it.each(Object.entries({ facil: 2, medio: 3, dificil: 4, muito_dificil: 5, absurdo: 7 }))(
    '%s exige qualidade %i', (dif, min) => {
      expect(M.passouNoTesteDeHabilidade(min, dif)).toBe(true);
      expect(M.passouNoTesteDeHabilidade(min - 1, dif)).toBe(false);
    });

  it('Falha Crítica (q=0) não passa nem no Fácil', () => {
    expect(M.passouNoTesteDeHabilidade(0, 'facil')).toBe(false);
  });

  it('Absurdo (q=7) passa em qualquer dificuldade', () => {
    Object.keys(window.D20_QUALIDADE_MINIMA).forEach((dif) => {
      expect(M.passouNoTesteDeHabilidade(7, dif), dif).toBe(true);
    });
  });
});

describe('o painel manda a dificuldade e o veredito no payload', () => {
  /* Teste de fonte: o payload é montado dentro do componente, e sem ele o
     veredito não sai da tela para o log da mesa. */
  let fonte;
  beforeAll(async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'batalha.jsx'), 'utf8');
  });

  it('o payload de habilidade carrega dificuldade e passou', () => {
    const i = fonte.indexOf("tipo_teste: 'habilidade'");
    expect(i).toBeGreaterThan(-1);
    const bloco = fonte.slice(i, i + 1400);
    expect(bloco).toMatch(/dificuldade: habDificuldade/);
    expect(bloco).toMatch(/passouNoTesteDeHabilidade\(res\.q, habDificuldade\)/);
  });

  it('e os DOIS lados escrevem o veredito na mensagem da mesa', () => {
    // Mestre e Jogador têm handlers separados que precisam ficar iguais.
    const ocorrencias = fonte.match(/payload\.passou \? 'passou' : 'falhou'/g) || [];
    expect(ocorrencias.length, 'Mestre e Jogador').toBe(2);
  });

  it('a dificuldade também fica gravada no log da batalha', () => {
    const ocorrencias = fonte.match(/dificuldade: payload\.dificuldade/g) || [];
    expect(ocorrencias.length).toBeGreaterThanOrEqual(1);
  });
});
