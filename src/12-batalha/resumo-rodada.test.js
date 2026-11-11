/* ============================================================
   resumo-rodada.test.js — o card do combatente (11/11/2026)
   ============================================================
   Usuário: "Na página de batalhas, o ícone de mudar estado vai sair, ao
   clicar no nome do personagem é que o mestre irá selecionar o estado. E o
   ícone do estado ficará do lado do nome dele. Vamos adicionar no card da
   direita do personagem, abaixo do último botão, um resumo da última rodada
   do personagem."
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';

const W = window;
const fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'batalha.jsx'), 'utf8');
const lia = { tipo: 'pj', ref_id: 3, inst_id: 'pj-3', nome: 'Lia' };
const orc1 = { tipo: 'criatura', ref_id: 7, inst_id: 'o1', nome: 'Orc 1' };

const log = [
  { rodada: 1, acao: 'arma', autor_inst_id: 'pj-3', autor_tipo: 'pj', autor_ref_id: 3, autor_nome: 'Lia', arma_nome: 'Espada', alvo_nome: 'Orc 1', resultado_nome: 'Médio', dano: 5 },
  { rodada: 2, acao: 'arma', autor_inst_id: 'o1', autor_tipo: 'criatura', autor_ref_id: 7, autor_nome: 'Orc 1', arma_nome: 'Machado', alvo_nome: 'Lia', resultado_nome: 'Difícil', dano: 8 },
  { rodada: 2, acao: 'magia', autor_inst_id: 'pj-3', autor_tipo: 'pj', autor_ref_id: 3, autor_nome: 'Lia', arma_nome: 'Bola de Fogo', alvo_nome: 'Orc 1', alvos_extras_nomes: ['Orc 2'], resultado_nome: 'Absurdo', dano: 18, critico: true },
  { rodada: 2, acao: 'item', autor_tipo: 'pj', autor_ref_id: 3, autor_nome: 'Lia', item_nome: 'Poção de Cura', quantidade: 1 },
  { rodada: 2, acao: 'sistema', autor_nome: 'Lia' },
];

describe('o resumo da última rodada', () => {
  it('só o que ELE fez, na rodada mais recente em que agiu', () => {
    const r = W.resumoDaUltimaRodada(lia, log, false);
    expect(r.rodada).toBe(2);
    expect(r.linhas).toEqual([
      { icone: 'ti-comet', acao: 'Bola de Fogo', alvo: 'Orc 1, Orc 2', resultado: 'Absurdo · 18 de dano', critico: true },
      { icone: 'ti-flask', acao: 'Poção de Cura', alvo: null, resultado: null },
    ]);
  });
  it('casa pela instância: o outro orc não leva o golpe deste', () => {
    expect(W.resumoDaUltimaRodada(orc1, log).linhas.map((l) => l.acao)).toEqual(['Machado']);
    expect(W.resumoDaUltimaRodada({ ...orc1, inst_id: 'o2', nome: 'Orc 2' }, log)).toBeNull();
  });
  it('quem ainda não agiu não tem resumo', () => {
    expect(W.resumoDaUltimaRodada(lia, [])).toBeNull();
  });
  it('fica abaixo dos botões do card, na luta', () => {
    expect(fonte).toMatch(/estado === 'ativa' && <ResumoUltimaRodada p=\{p\} log=\{log\} isEn=\{isEn\} \/>/);
  });
});

describe('o estado se escolhe pelo nome', () => {
  it('o card do Mestre abre o estado pelo nome, e o botão do fim da linha saiu', () => {
    expect(fonte).toMatch(/<EstadoDrop comoNome\s/);
    expect(fonte.match(/<EstadoDrop\b/g)).toHaveLength(1);
  });
  it('o nome leva o ícone do estado ao lado', () => {
    expect(fonte).toMatch(/batalha-nome-estado-ic ' \+ iconeStatus\(p\.status \|\| 'ativo'\)/);
  });
});
