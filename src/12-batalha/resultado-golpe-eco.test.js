/* ============================================================
   resultado-golpe-eco.test.js — "Rotineiro" sem dano, e o dado repetido
   ============================================================
   "Porque o ataque com chicote deu essa mensagem e não deu dano? 'Victor
    Beaufort atacou Haalin com Chicote de Armas Assassina de Vampiros →
    Rotineiro'" (usuário, 13/09/2026)

   1. Rotineiro (q 1) É ERRO na Tabela de Resolução (RESULTADOS_ACAO: dano 0,
      erra true). Coluna 1 com d20 8 cai em Rotineiro. O motor estava certo;
      a mensagem é que não dizia "errou" — só o nome do resultado.

   2. No log da batalha 96, os dois ataques do Victor em cada rodada saíram com
      o MESMO d20 (12 e 12; 8 e 8), ambos da tela do JOGADOR. Lá a rolagem
      tem um eco local (`rolagemOtimista`) que só sai quando o banco confirma o
      MESMO valor. Atacar antes da confirmação grava a rolagem já limpa; o
      banco nunca mostra o valor rolado, o eco não sai, e o painel reabre com
      a rolagem velha ("Já rolou") — o segundo ataque usa o dado do primeiro.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/magias-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; });

const R = (q) => window.RESULTADOS_ACAO[q];

describe('textoResultadoGolpe — a mensagem diz se errou', () => {
  // Frase reescrita em 14/09/2026: sem o nome do resultado, "e causou N de dano".
  it('Rotineiro é erro: "e errou"', () => {
    expect(window.resolverAcao(1, 8).codigo).toBe('R');   // o caso do Victor
    expect(M.textoResultadoGolpe(R(1), 0)).toBe(' e errou');
  });
  it('Falha Crítica também erra', () => {
    expect(M.textoResultadoGolpe(R(0), 0)).toBe(' e errou');
  });
  it('acerto com dano mostra o dano', () => {
    expect(M.textoResultadoGolpe(R(2), 8)).toBe(' e causou 8 de dano');
  });
  it('acerto que não passou dano diz isso, em vez de silêncio', () => {
    expect(M.textoResultadoGolpe(R(3), 0)).toBe(' e acertou, sem causar dano');
  });
  it('sem resultado (largada de magia canalizada) não escreve nada', () => {
    expect(M.textoResultadoGolpe(null, 0)).toBe('');
  });
});

/* "Lirael atacou Lobo Adulto com Arco Élfico e causou 35 de dano. Você provoca
   uma perfuração na perna do oponente com 12 de dano adicional, ele terá -4
   por 1 dia." (usuário, 14/09/2026) */
describe('textoGolpeNaMesa — a frase inteira', () => {
  const LIRAEL = { tipo: 'pj', nome: "Lirael Vel'Thalas" };
  const ARCO = { dano: 24, fonte: 'arma' };   // 50% → 12

  it('o exemplo do usuário, palavra por palavra', () => {
    const msgCritico = M.interpolarCritico(M.CRITICOS_TABELA.PERFURACAO[1], ARCO);
    expect(M.textoGolpeNaMesa({
      ator: LIRAEL, alvoNome: 'Lobo Adulto', acaoNome: 'Arco Élfico', tipo: 'arma',
      resultado: R(7), dano: 35, alvosExtras: [], msgCritico,
    })).toBe('Lirael atacou Lobo Adulto com Arco Élfico e causou 35 de dano. '
      + 'Você provoca uma perfuração na perna do oponente com 12 de dano adicional, ele terá -4 por 1 dia.');
  });

  it('criatura mantém o nome inteiro; sem crítico, a frase fecha com ponto', () => {
    expect(M.textoGolpeNaMesa({
      ator: { tipo: 'criatura', nome: 'Lobo Adulto' }, alvoNome: 'Lirael', acaoNome: 'Mordida', tipo: 'arma',
      resultado: R(1), dano: 0,
    })).toBe('Lobo Adulto atacou Lirael com Mordida e errou.');
  });

  it('magia e golpe em vários alvos', () => {
    expect(M.textoGolpeNaMesa({
      ator: LIRAEL, alvoNome: 'Haalin', acaoNome: 'Relâmpago', tipo: 'magia', resultado: R(4), dano: 20,
    })).toBe('Lirael conjurou Relâmpago em Haalin e causou 20 de dano.');
    expect(M.textoGolpeNaMesa({
      ator: LIRAEL, alvoNome: 'Lobo', acaoNome: 'Espada', tipo: 'arma', resultado: R(4), dano: 9,
      alvosExtras: ['Lobo 2', 'Lobo 3'],
    })).toBe('Lirael atacou Lobo com Espada e causou 9 de dano, e também atingiu Lobo 2, Lobo 3.');
  });

  it('nenhum texto de crítico sobra com "(N EF)" no fim', () => {
    for (const tipo of Object.values(M.CRITICOS_TABELA)) {
      for (const msg of Object.values(tipo)) {
        expect(msg).not.toMatch(/EF\)/);
        expect(msg).toMatch(/com \$\{[^}]+\} de dano adicional/);
      }
    }
  });
});

describe('ecoAoGravar — gravar a rolagem limpa limpa também o eco', () => {
  const EU = { tipo: 'pj', ref_id: 67, inst_id: 'pj:67' };
  const OUTRO = { tipo: 'criatura', ref_id: 242, inst_id: 'criatura:242' };
  const ROL = { ator: EU, tab: 'arma', d20: 12 };

  it('aplicar (minha rolagem gravada como null) zera o eco para null', () => {
    const gravados = [{ ...EU, rolagem_pendente: null }, OUTRO];
    expect(M.ecoAoGravar(ROL, gravados, EU)).toBeNull();
  });
  it('salvar a rolagem (valor novo) mantém o eco que acabou de ser posto', () => {
    const gravados = [{ ...EU, rolagem_pendente: ROL }, OUTRO];
    expect(M.ecoAoGravar(ROL, gravados, EU)).toBe(ROL);
  });
  it('gravação que não fala da minha rolagem não mexe no eco', () => {
    expect(M.ecoAoGravar(ROL, [{ ...EU }, OUTRO], EU)).toBe(ROL);
    expect(M.ecoAoGravar(undefined, [{ ...EU }], EU)).toBeUndefined();
  });

  it('o CASO: eco null + banco ainda com a rolagem velha → a tela não mostra a velha', () => {
    // Antes: eco {d20:12}; o snapshot pulava direto para null; o eco nunca
    // casava com o banco e ficava para sempre.
    const eco = M.ecoAoGravar(ROL, [{ ...EU, rolagem_pendente: null }], EU);
    expect(M.ecoDepoisDoSnapshot(eco, JSON.stringify(ROL))).toBeNull();   // snapshot atrasado
    expect(M.ecoDepoisDoSnapshot(eco, JSON.stringify(null))).toBeUndefined(); // banco confirmou
  });
  it('ecoDepoisDoSnapshot mantém a regra antiga: só solta quando o banco confirma o MESMO valor', () => {
    expect(M.ecoDepoisDoSnapshot(ROL, JSON.stringify(null))).toBe(ROL);
    expect(M.ecoDepoisDoSnapshot(ROL, JSON.stringify(ROL))).toBeUndefined();
    expect(M.ecoDepoisDoSnapshot(undefined, JSON.stringify(ROL))).toBeUndefined();
  });
});
