/* nomes-criatura.test.js — o nome próprio de quem entra na batalha
   (14/11/2026: "Um orc não se chama orc, ele se chama Mudush"). A lista
   manda: raça com lista ganha nome, qualquer intelecto; animal nunca. */
import { describe, it, expect, beforeAll } from 'vitest';
import './nomes-criatura.jsx';

let N;
beforeAll(() => { N = window; expect(N.batizarCriaturas).toBeTypeOf('function'); });

const ORC = { id: 1, nome: 'Orc', tipo: 'Civilizado', intelecto: '-1', estagio: 1 };
const ORC_REI = { id: 2, nome: 'Orc Rei', tipo: 'Civilizado', estagio: 11 };
const LOBO = { id: 3, nome: 'Lobo-cinzento', tipo: 'Animal' };
const GOBLIN = { id: 4, nome: 'Goblin', tipo: 'Civilizado' };
const DEMONIO_V = { id: 5, nome: 'Demônio V', tipo: 'Infernal', estagio: 30 };
const AGUA = { id: 6, nome: 'Elemental da Água II', tipo: 'Elemental' };
const PARA = { id: 7, nome: 'Paraelemental Etéreo', tipo: 'Elemental' };

describe('racaDeNomes', () => {
  it('pelo nome da espécie', () => {
    expect(N.racaDeNomes(ORC)).toBe('orc');
    expect(N.racaDeNomes(ORC_REI)).toBe('orc');
    expect(N.racaDeNomes(AGUA)).toBe('elemental_agua');
    expect(N.racaDeNomes(DEMONIO_V)).toBe('demonio');
  });
  it('sem lista ou animal: null', () => {
    expect(N.racaDeNomes(GOBLIN)).toBeNull();
    expect(N.racaDeNomes(LOBO)).toBeNull();
    expect(N.racaDeNomes(PARA)).toBeNull();
  });
});

describe('nomeParaCriatura', () => {
  it('o orc ganha um nome da lista de orcs, mesmo com intelecto −1', () => {
    const n = N.nomeParaCriatura(ORC, [], () => 0);
    expect([...N.NOMES_POR_RACA.orc.m, ...N.NOMES_POR_RACA.orc.f]).toContain(n);
  });
  it('não repete enquanto houver nome livre', () => {
    const lista = N.NOMES_POR_RACA.elemental_agua.nomes;
    const n = N.nomeParaCriatura(AGUA, [lista[0]], () => 0);
    expect(n).toBe(lista[1]);
  });
  it('o chefe com lista de títulos leva o epíteto', () => {
    expect(N.nomeParaCriatura(DEMONIO_V, [], () => 0)).toBe('Gothmog, A Perdição de Durin');
  });
  it('raça com sobrenome sempre leva o sobrenome', () => {
    const n = N.nomeParaCriatura({ nome: 'Anão', tipo: 'Civilizado' }, [], () => 0);
    expect(n.split(' ')).toHaveLength(2);
  });
});

describe('batizarCriaturas', () => {
  const de = (p) => [ORC, LOBO, GOBLIN].find((c) => c.id === p.ref_id);
  it('batiza, guarda a espécie e deixa quem não tem lista com o nome do bestiário', () => {
    const out = N.batizarCriaturas([
      { tipo: 'criatura', ref_id: 1, nome: 'Orc' },
      { tipo: 'criatura', ref_id: 4, nome: 'Goblin' },
      { tipo: 'criatura', ref_id: 3, nome: 'Lobo-cinzento' },
    ], de);
    expect(out[0].nome).not.toBe('Orc');
    expect(out[0].especie).toBe('Orc');
    expect(out[1].nome).toBe('Goblin');
    expect(out[2].nome).toBe('Lobo-cinzento');
  });
  it('o companheiro do PJ fica com o nome que tem', () => {
    const p = { tipo: 'criatura', ref_id: 1, nome: 'Orc (Eco)', dono_pj: 66 };
    expect(N.batizarCriaturas([p], de)[0]).toBe(p);
    const batizado = { tipo: 'criatura', ref_id: 1, nome: 'Brutus' };
    expect(N.batizarCriaturas([batizado], de)[0]).toBe(batizado);
  });
  it('dois orcs, dois nomes', () => {
    const out = N.batizarCriaturas([
      { tipo: 'criatura', ref_id: 1, nome: 'Orc' }, { tipo: 'criatura', ref_id: 1, nome: 'Orc' },
    ], de, [], () => 0);
    expect(out[0].nome).not.toBe(out[1].nome);
  });
});
