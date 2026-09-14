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
  it('Rotineiro é erro: "→ Rotineiro (errou)"', () => {
    expect(window.resolverAcao(1, 8).codigo).toBe('R');   // o caso do Victor
    expect(M.textoResultadoGolpe(R(1), 0)).toBe(' → Rotineiro (errou)');
  });
  it('Falha Crítica também erra', () => {
    expect(M.textoResultadoGolpe(R(0), 0)).toBe(' → Falha Crítica (errou)');
  });
  it('acerto com dano mostra o dano, como antes', () => {
    expect(M.textoResultadoGolpe(R(2), 8)).toBe(' → Fácil (8 de dano)');
  });
  it('acerto que não passou dano diz isso, em vez de silêncio', () => {
    expect(M.textoResultadoGolpe(R(3), 0)).toBe(' → Médio (acertou, 0 de dano)');
  });
  it('sem resultado (largada de magia canalizada) não escreve nada', () => {
    expect(M.textoResultadoGolpe(null, 0)).toBe('');
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
