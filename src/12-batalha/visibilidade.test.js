/* ============================================================
   visibilidade.test.js — escuridão no tabuleiro
   ============================================================
   "O Mestre poderá adicionar um efeito de visibilidade no tabuleiro da
   batalha: escuridão parcial, escuridão total, escuridão mágica."

   Os três níveis não são invenção minha: estão escritos na magia VISÃO
   ANIMAL, que os define um a um —

     Escuridão Parcial   equivalente a uma noite sem lua
     Escuridão Total     equivalente a um ambiente fechado
     Escuridão Mágica    ausência total de luz

   — e a magia ESCURIDÃO é o que os cria em jogo. Quem os vence também já
   estava escrito: Visão Animal enxerga na parcial (nível 1), total (3) e
   mágica (5); Luta às Cegas dispensa enxergar.

   O que NÃO estava escrito em lugar nenhum é o tamanho da penalidade. Esse
   número é balanceamento, e está declarado como padrão em
   VISIBILIDADE_PENALIDADE — não foi descoberto no catálogo.
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

const lutador = (over = {}) => ({
  inst_id: 'p1', nome: 'Lutador', tipo: 'pj', status: 'ativo',
  eh: 10, eh_max: 10, ef: 20, ef_max: 20, status_temp: [], ...over,
});
const comVisao = (ate) => lutador({
  status_temp: [{ id: 'mag_visao_animal', nome: 'Visão Animal', rodadas_rest: 5,
                  efeito: { tipo: 'visao_escuridao', valor: ate } }],
});
const cego = () => lutador({
  status_temp: [{ id: 'tec_luta_as_cegas', nome: 'Luta às Cegas', rodadas_rest: 3,
                  efeito: { tipo: 'luta_sem_ver', valor: true } }],
});

describe('a escada dos quatro estados', () => {
  it('clara é zero e os três crescem', () => {
    expect(M.nivelVisibilidade('clara')).toBe(0);
    expect(M.nivelVisibilidade('parcial')).toBe(1);
    expect(M.nivelVisibilidade('total')).toBe(2);
    expect(M.nivelVisibilidade('magica')).toBe(3);
  });

  it('valor desconhecido cai em claro — nunca escurece por acidente', () => {
    expect(M.nivelVisibilidade('qualquer')).toBe(0);
    expect(M.nivelVisibilidade(undefined)).toBe(0);
  });

  it('a penalidade cresce junto', () => {
    const P = window.MotorBatalha.VISIBILIDADE_PENALIDADE;
    expect(P.clara).toBe(0);
    expect(P.parcial).toBeLessThan(0);
    expect(P.total).toBeLessThan(P.parcial);
    expect(P.magica).toBeLessThan(P.total);
  });
});

describe('quem enxerga no escuro', () => {
  it('no claro, todo mundo enxerga — inclusive quem não tem nada', () => {
    expect(M.enxergaNaEscuridao(lutador(), 'clara')).toBe(true);
  });

  it('sem magia nem técnica, ninguém enxerga na parcial', () => {
    expect(M.enxergaNaEscuridao(lutador(), 'parcial')).toBe(false);
  });

  it('Visão Animal nível 1 vence a parcial e SÓ ela', () => {
    expect(M.enxergaNaEscuridao(comVisao(1), 'parcial')).toBe(true);
    expect(M.enxergaNaEscuridao(comVisao(1), 'total')).toBe(false);
    expect(M.enxergaNaEscuridao(comVisao(1), 'magica')).toBe(false);
  });

  it('nível 2 vence parcial e total', () => {
    expect(M.enxergaNaEscuridao(comVisao(2), 'total')).toBe(true);
    expect(M.enxergaNaEscuridao(comVisao(2), 'magica')).toBe(false);
  });

  it('nível 3 vence as três', () => {
    ['parcial', 'total', 'magica'].forEach((v) => {
      expect(M.enxergaNaEscuridao(comVisao(3), v), v).toBe(true);
    });
  });

  it('Luta às Cegas vence as três de uma vez — não enxerga, não precisa', () => {
    ['parcial', 'total', 'magica'].forEach((v) => {
      expect(M.enxergaNaEscuridao(cego(), v), v).toBe(true);
    });
  });
});

describe('o que a escuridão cobra', () => {
  it('quem não enxerga perde coluna', () => {
    expect(M.penalidadeDeVisibilidade(lutador(), 'total')).toBeLessThan(0);
  });

  it('quem enxerga não paga nada', () => {
    expect(M.penalidadeDeVisibilidade(comVisao(3), 'magica')).toBe(0);
    expect(M.penalidadeDeVisibilidade(cego(), 'magica')).toBe(0);
  });

  it('no claro ninguém paga', () => {
    expect(M.penalidadeDeVisibilidade(lutador(), 'clara')).toBe(0);
  });

  it('visão insuficiente paga o preço CHEIO — não há meio-termo', () => {
    // Visão Animal nível 1 na escuridão mágica é o mesmo que nada: ou vence o
    // nível, ou não vence.
    const P = window.MotorBatalha.VISIBILIDADE_PENALIDADE;
    expect(M.penalidadeDeVisibilidade(comVisao(1), 'magica')).toBe(P.magica);
  });
});

describe('Visão Animal lê do TEXTO até qual escuridão enxerga', () => {
  /* Frases literais do banco. A escada está no texto, como todo número deste
     catálogo — reescalonar é trabalho de banco, não de código. */
  const VISAO = { key: 'visao_animal', nome: 'Visão Animal', duracao: '10 rodadas',
                  nivel_1: 'Permite enxergar na escuridão parcial.',
                  nivel_3: 'Permite enxergar na escuridão total.',
                  nivel_5: 'Permite enxergar na escuridão mágica.' };

  it.each([[1, 1], [3, 2], [5, 3]])('nível %i enxerga até %i', (nivel, ate) => {
    expect(window.visaoEscuridaoNoNivel(VISAO, nivel)).toBe(ate);
  });

  it('nível que não fala de enxergar devolve null', () => {
    expect(window.visaoEscuridaoNoNivel({ nivel_1: 'Causa 4 de dano.' }, 1)).toBeNull();
  });

  it('aplicar grava o NÚMERO do nível, não a bandeira do registro', () => {
    const r = M.aplicarEfeitoMagia(lutador(), VISAO, 3);
    expect(r.status_temp[0].efeito).toEqual({ tipo: 'visao_escuridao', valor: 2 });
  });

  it('e o status gravado realmente vence a escuridão daquele nível', () => {
    const r = M.aplicarEfeitoMagia(lutador(), VISAO, 5);
    expect(M.enxergaNaEscuridao(r, 'magica')).toBe(true);
  });

  it('nível sem texto de visão não grava status nenhum', () => {
    const r = M.aplicarEfeitoMagia(lutador(), { ...VISAO, nivel_7: 'Outra coisa.' }, 7);
    expect(r.status_temp).toHaveLength(0);
  });
});

describe('Luta às Cegas entrou no motor', () => {
  it('o registro declara 3 rodadas e Difícil, como o banco', () => {
    expect(window.TECNICA_EFEITO_MAP.luta_as_cegas)
      .toMatchObject({ modo: 'teste', rodadas: 3, dificuldade: 'dificil', alvo: 'self' });
  });

  it('e saiu da lista de técnicas sem motor', () => {
    expect(window.tecnicaForaDoRegistro('luta_as_cegas')).toBeNull();
  });

  it('aplicada, dispensa enxergar de verdade', () => {
    const r = M.aplicarEfeitoTecnica(lutador(), { key: 'luta_as_cegas', nome: 'Luta às Cegas' }, 0);
    expect(M.penalidadeDeVisibilidade(r, 'magica')).toBe(0);
  });
});

describe('a penalidade chega no golpe', () => {
  /* Teste de fonte: a penalidade entra junto do mod_coluna, e é isso que a
     faz valer para arma E magia sem duplicar a conta. */
  let fonte;
  beforeAll(async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'batalha.jsx'), 'utf8');
  });

  it('modColunaAtor soma a penalidade de visibilidade', () => {
    const i = fonte.indexOf('const modColunaAtor =');
    expect(i).toBeGreaterThan(-1);
    expect(fonte.slice(i, i + 200)).toMatch(/penalidadeDeVisibilidade\(ator, visibilidade\)/);
  });

  it('a visibilidade é estado da BATALHA e chega aos dois lados', () => {
    // Mestre define e persiste; Jogador lê por prop e vê pelo realtime.
    expect(fonte).toMatch(/const \[visibilidade, setVisibilidade\] = useState\(batalha\.visibilidade/);
    expect(fonte).toMatch(/const visibilidade = batalha\.visibilidade \|\| 'clara'/);
    // 2 painéis de ação (Mestre e Jogador) + 3 tabuleiros (montagem, Mestre e
    // Jogador), que escurecem com a iluminação desde 13/09/2026.
    expect((fonte.match(/visibilidade=\{visibilidade\}/g) || []).length).toBe(5);
    const tabuleiros = fonte.split('<TabuleiroBatalha').slice(1);
    expect(tabuleiros).toHaveLength(3);
    tabuleiros.forEach((t) => expect(t.slice(0, 400)).toMatch(/visibilidade=\{visibilidade\}/));
  });
});
