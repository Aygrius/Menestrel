/* ============================================================
   mescla-gravacao.test.js — gravar a batalha MESCLA, não sobrescreve
   ============================================================
   "O status envenenado não está mostrando. Não persiste." (usuário,
   13/09/2026)

   Mestre e jogadores gravavam a lista INTEIRA de participantes a partir do
   que cada tela tinha: a gravação do jogador apagava o Envenenado que o
   Mestre tinha acabado de pôr (e vice-versa). A regra de mesclagem mora no
   banco (scripts/sql/batalha-mescla-gravacoes.sql) e foi testada lá com os
   casos do veneno, da virada e da remoção. Aqui fica a guarda do lado do
   cliente: as duas telas precisam MANDAR A BASE, senão o banco cai no
   comportamento antigo (sobrescrever).

   Guarda de invariante sobre o código-fonte — a view grande não monta
   isolada, mesmo padrão de globais-tabuleiro.test.js.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
let fonte;
beforeAll(() => { fonte = readFileSync(resolve(aqui, 'batalha.jsx'), 'utf8'); });

const corpoDe = (inicio) => {
  const i = fonte.indexOf(inicio);
  expect(i, 'não achei: ' + inicio).toBeGreaterThan(-1);
  return fonte.slice(i, i + 2600);
};

describe('Mestre — persistir', () => {
  it('participantes/log vão pela RPC que mescla, com a base', () => {
    const corpo = corpoDe('const persistir = async (campos, locais) => {');
    expect(corpo).toMatch(/rpc\('atualizar_batalha_mestre'/);
    expect(corpo).toMatch(/p_base_participantes:/);
    expect(corpo).toMatch(/p_base_log:/);
    // a base é capturada ANTES de `locais()` trocar o estado local
    expect(corpo.indexOf('const baseParticipantes = participantes;'))
      .toBeLessThan(corpo.indexOf('if (locais) locais();'));
  });

  it('não sobrescreve mais participantes direto na tabela', () => {
    const corpo = corpoDe('const persistir = async (campos, locais) => {');
    const trechoDireto = corpo.slice(corpo.indexOf('} else {'), corpo.indexOf('setSalvando(false);'));
    expect(trechoDireto).toMatch(/from\('batalhas'\)\.update\(campos\)/);   // só no ramo sem participantes/log
    expect(corpo.indexOf("rpc('atualizar_batalha_mestre'")).toBeLessThan(corpo.indexOf('} else {'));
  });
});

describe('Jogador — persistJogador', () => {
  it('manda a base de participantes e de log à RPC', () => {
    const corpo = corpoDe('const persistJogador = async (campos, opcoes) => {');
    expect(corpo).toMatch(/rpc\('atualizar_batalha_jogador'/);
    // A base é o snapshot, com a marca de "zerando" quando a gravação limpa a
    // minha rolagem (baseQueZeraMinhaRolagem).
    expect(corpo).toMatch(/p_base_participantes: baseQueZeraMinhaRolagem\(participantes,/);
    expect(corpo).toMatch(/p_base_log:/);
  });
});
