/* ============================================================
   perfil-persistencia.test.js — quando gravar profiles.perfil_tipo
   ============================================================
   Bug que motivou o arquivo (auditoria 01/09/2026):

   O AdminConsole monta ANTES de userProfile chegar — App faz setUser(u) e só
   então `await carregarProfile(u)` (10-shell/shell.jsx). Nesse intervalo o
   estado `profile` vale um PALPITE: localStorage, ou 'player' pra conta nova.

   O efeito de persistência rodava na montagem e mandava esse palpite pro
   banco. Num dispositivo novo (sem localStorage), um MESTRE entrava assim:

     1. AdminConsole monta com profile='player' (palpite)
     2. efeito dispara → UPDATE profiles SET perfil_tipo='player'
     3. em paralelo, carregarProfile faz o SELECT

   Se o UPDATE ganhasse a corrida, o SELECT lia 'player' e o Mestre voltava
   como jogador — de forma PERSISTENTE, porque o valor errado já estava
   gravado. Nada no app o corrigia depois.

   `devePersistirPerfil` é a guarda: enquanto não se sabe o que está no
   servidor (null), não se escreve nada.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './shell.jsx';

const devePersistirPerfil = globalThis.devePersistirPerfil;

describe('devePersistirPerfil', () => {
  it('NÃO grava enquanto não se sabe o que há no servidor', () => {
    // O coração da correção: este é o estado da montagem, quando `profile`
    // ainda é só um palpite. Gravar aqui é o que rebaixava o Mestre.
    expect(devePersistirPerfil(null, 'player')).toBe(false);
    expect(devePersistirPerfil(null, 'master')).toBe(false);
    expect(devePersistirPerfil(undefined, 'player')).toBe(false);
  });

  it('não grava quando o servidor já tem o mesmo valor', () => {
    // Cobre o eco da sincronização: userProfile chega, setProfile roda, e o
    // efeito dispara com um valor que veio do próprio banco.
    expect(devePersistirPerfil('master', 'master')).toBe(false);
    expect(devePersistirPerfil('player', 'player')).toBe(false);
  });

  it('grava quando o usuário trocou de verdade', () => {
    expect(devePersistirPerfil('player', 'master')).toBe(true);
    expect(devePersistirPerfil('master', 'player')).toBe(true);
  });

  it('ida e volta grava as DUAS vezes', () => {
    // Regressão de uma versão intermediária desta correção: comparar contra a
    // prop `userProfile` (que nunca é refetchada) fazia master→player→master
    // pular a segunda escrita, deixando o banco em 'player' enquanto a tela
    // dizia 'master'. Por isso o "o que há no servidor" é acompanhado à parte,
    // e atualizado a cada escrita.
    let noServidor = 'master';
    const gravar = (novo) => {
      const deve = devePersistirPerfil(noServidor, novo);
      if (deve) noServidor = novo;
      return deve;
    };
    expect(gravar('player')).toBe(true);
    expect(gravar('master')).toBe(true);
    expect(noServidor).toBe('master');
  });
});

describe('devePersistirPerfil — linha com perfil_tipo vazio', () => {
  it("'' (carregou, coluna vazia) é DIFERENTE de null (não carregou)", () => {
    // Conta antiga ou trigger sem default: a linha existe mas a coluna está
    // NULL. Isso é saber o que há no servidor — nada —, então o palpite local
    // pode e deve ser gravado. Se '' caísse na mesma guarda de null, essas
    // contas nunca mais persistiriam a escolha de perfil.
    expect(devePersistirPerfil('', 'player')).toBe(true);
    expect(devePersistirPerfil('', 'master')).toBe(true);
    expect(devePersistirPerfil(null, 'master')).toBe(false);
  });
});
