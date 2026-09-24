/* ============================================================
   visibilidade-entrada.test.js — quem pode ver uma entrada
   ============================================================
   "Do lado do botão de editar (lápis), vamos adicionar um botão de ver
    (olho), onde teremos um modal para permitir quem pode ver aquela entrada,
    na história selecionada." (usuário, 17/09/2026)

   Antes disso, "quem vê" estava espalhado em DOIS lugares que ninguém olhava
   juntos:

     historias.<tipo>_ids    — a entrada está disponibilizada pra história?
     historias.lore_acesso_pj — { "tipo:ref_id": [pj_id...] }, a liberação
                                individual, que o Mestre marcava dentro da
                                ficha da entrada

   E a regra que os liga é assimétrica: lista VAZIA ou chave AUSENTE significa
   "todos os protagonistas veem", não "ninguém vê" (é o que
   listar_diario_disponivel faz no banco). Então o estado real é um de três, e
   não duas caixas independentes:

     ninguem  — id fora de <tipo>_ids. Quem não está disponibilizado não é
                visto por PJ nenhum, não importa o que diga o acesso_pj.
     todos    — id dentro, e nenhum PJ listado.
     alguns   — id dentro, e a lista tem gente.

   Estas duas funções são o único lugar que sabe disso. O modal só escolhe um
   dos três nomes; a tradução para as duas colunas mora aqui, e é o que este
   teste trava.

   O outro ponto: `ninguem` tem que LIMPAR a chave do acesso_pj. Sem isso, um
   "só a Thalia vê" desligado e religado meses depois voltaria com a Thalia
   marcada — e o Mestre não teria como saber por quê.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';
import '../13-diario/diario.jsx';

let visibilidadeDaEntrada, patchDeVisibilidade;
beforeAll(() => {
  ({ visibilidadeDaEntrada, patchDeVisibilidade } = window.DiarioVisibilidade || {});
  expect(visibilidadeDaEntrada, 'visibilidadeDaEntrada precisa estar exposta').toBeTypeOf('function');
  expect(patchDeVisibilidade, 'patchDeVisibilidade precisa estar exposta').toBeTypeOf('function');
});

const historia = (extra) => ({
  id: 3,
  criatura_ids: [], reino_ids: [], cidade_ids: [], npc_ids: [],
  lore_acesso_pj: {},
  ...extra,
});

describe('visibilidadeDaEntrada — ler os três estados', () => {
  it('fora de <tipo>_ids é "ninguem"', () => {
    const h = historia({ npc_ids: ['outro-npc'] });
    expect(visibilidadeDaEntrada(h, 'npc', 'arissia-h3')).toEqual({ modo: 'ninguem', pjIds: [] });
  });

  it('dentro, sem lista, é "todos"', () => {
    const h = historia({ npc_ids: ['arissia-h3'] });
    expect(visibilidadeDaEntrada(h, 'npc', 'arissia-h3')).toEqual({ modo: 'todos', pjIds: [] });
  });

  it('dentro, com lista, é "alguns"', () => {
    const h = historia({
      npc_ids: ['arissia-h3'],
      lore_acesso_pj: { 'npc:arissia-h3': [42, 87] },
    });
    expect(visibilidadeDaEntrada(h, 'npc', 'arissia-h3')).toEqual({ modo: 'alguns', pjIds: [42, 87] });
  });

  /* A regra do banco: lista vazia = todos. Se isto virasse "ninguem", uma
     entrada disponibilizada desapareceria da tela do Jogador enquanto o
     Mestre a via como liberada. */
  it('lista VAZIA é "todos", não "ninguem"', () => {
    const h = historia({ npc_ids: ['arissia-h3'], lore_acesso_pj: { 'npc:arissia-h3': [] } });
    expect(visibilidadeDaEntrada(h, 'npc', 'arissia-h3').modo).toBe('todos');
  });

  /* Não disponibilizado ganha de qualquer acesso_pj: é a coluna _ids que
     listar_diario_disponivel percorre primeiro. */
  it('"ninguem" ganha de uma lista sobrando no acesso_pj', () => {
    const h = historia({ npc_ids: [], lore_acesso_pj: { 'npc:arissia-h3': [42] } });
    expect(visibilidadeDaEntrada(h, 'npc', 'arissia-h3')).toEqual({ modo: 'ninguem', pjIds: [] });
  });

  it('criatura é bigint no banco e chega como número — compara por texto', () => {
    const h = historia({ criatura_ids: [15, 16], lore_acesso_pj: { 'criatura:15': [42] } });
    expect(visibilidadeDaEntrada(h, 'criatura', 15)).toEqual({ modo: 'alguns', pjIds: [42] });
    expect(visibilidadeDaEntrada(h, 'criatura', '15').modo).toBe('alguns');
    expect(visibilidadeDaEntrada(h, 'criatura', 16).modo).toBe('todos');
  });

  it('história crua, sem as colunas, não explode', () => {
    expect(visibilidadeDaEntrada({ id: 1 }, 'npc', 'x')).toEqual({ modo: 'ninguem', pjIds: [] });
    expect(visibilidadeDaEntrada(null, 'npc', 'x')).toEqual({ modo: 'ninguem', pjIds: [] });
  });

  it('reino e cidade leem colunas diferentes', () => {
    const h = historia({ reino_ids: ['verrogar'], cidade_ids: ['brann'] });
    expect(visibilidadeDaEntrada(h, 'reino', 'verrogar').modo).toBe('todos');
    expect(visibilidadeDaEntrada(h, 'cidade', 'verrogar').modo).toBe('ninguem');
    expect(visibilidadeDaEntrada(h, 'cidade', 'brann').modo).toBe('todos');
  });
});

describe('patchDeVisibilidade — escrever os três estados', () => {
  it('"todos" entra em <tipo>_ids e não deixa lista', () => {
    const h = historia();
    expect(patchDeVisibilidade(h, 'npc', 'arissia-h3', 'todos', [])).toEqual({
      npc_ids: ['arissia-h3'],
      lore_acesso_pj: {},
    });
  });

  it('"alguns" entra em <tipo>_ids E grava a lista', () => {
    const h = historia();
    expect(patchDeVisibilidade(h, 'npc', 'arissia-h3', 'alguns', [42, 87])).toEqual({
      npc_ids: ['arissia-h3'],
      lore_acesso_pj: { 'npc:arissia-h3': [42, 87] },
    });
  });

  /* O ponto do teste: "ninguem" limpa as DUAS colunas. */
  it('"ninguem" sai de <tipo>_ids e APAGA a chave do acesso_pj', () => {
    const h = historia({
      npc_ids: ['arissia-h3', 'outro'],
      lore_acesso_pj: { 'npc:arissia-h3': [42], 'npc:outro': [87] },
    });
    expect(patchDeVisibilidade(h, 'npc', 'arissia-h3', 'ninguem', [])).toEqual({
      npc_ids: ['outro'],
      lore_acesso_pj: { 'npc:outro': [87] },
    });
  });

  it('"alguns" com lista vazia cai em "todos" — não há meio-termo silencioso', () => {
    const h = historia();
    expect(patchDeVisibilidade(h, 'npc', 'x', 'alguns', [])).toEqual({
      npc_ids: ['x'],
      lore_acesso_pj: {},
    });
  });

  it('não duplica quando já estava disponibilizado', () => {
    const h = historia({ npc_ids: ['x'] });
    expect(patchDeVisibilidade(h, 'npc', 'x', 'todos', []).npc_ids).toEqual(['x']);
  });

  it('mexe só na entrada pedida — as outras chaves e ids ficam', () => {
    const h = historia({
      npc_ids: ['a', 'b'],
      cidade_ids: ['brann'],
      lore_acesso_pj: { 'npc:a': [1], 'cidade:brann': [2] },
    });
    const patch = patchDeVisibilidade(h, 'npc', 'a', 'alguns', [9]);
    expect(patch.npc_ids).toEqual(['a', 'b']);
    expect(patch.lore_acesso_pj).toEqual({ 'npc:a': [9], 'cidade:brann': [2] });
    // cidade_ids não entra no patch: só se escreve a coluna que mudou.
    expect(patch).not.toHaveProperty('cidade_ids');
  });

  it('não muta a história recebida', () => {
    const h = historia({ npc_ids: ['a'], lore_acesso_pj: { 'npc:a': [1] } });
    patchDeVisibilidade(h, 'npc', 'a', 'ninguem', []);
    expect(h.npc_ids).toEqual(['a']);
    expect(h.lore_acesso_pj).toEqual({ 'npc:a': [1] });
  });

  it('criatura preserva o número, não vira texto na coluna bigint', () => {
    const h = historia({ criatura_ids: [15] });
    const patch = patchDeVisibilidade(h, 'criatura', 16, 'todos', []);
    expect(patch.criatura_ids).toEqual([15, 16]);
    expect(patch.criatura_ids.every((x) => typeof x === 'number')).toBe(true);
  });

  it('remover criatura compara por texto mas devolve os números que sobram', () => {
    const h = historia({ criatura_ids: [15, 16] });
    expect(patchDeVisibilidade(h, 'criatura', '15', 'ninguem', []).criatura_ids).toEqual([16]);
  });

  it('tipo desconhecido não inventa coluna', () => {
    expect(() => patchDeVisibilidade(historia(), 'item', 'x', 'todos', [])).toThrow(/item/);
  });

  it('modo desconhecido é erro, não um silêncio', () => {
    expect(() => patchDeVisibilidade(historia(), 'npc', 'x', 'talvez', [])).toThrow(/talvez/);
  });
});

describe('ida e volta: escrever e ler de novo dá o mesmo estado', () => {
  it.each([
    ['ninguem', []],
    ['todos', []],
    ['alguns', [42, 87]],
  ])('%s', (modo, pjIds) => {
    const h = historia({ npc_ids: ['x'], lore_acesso_pj: { 'npc:x': [1] } });
    const depois = { ...h, ...patchDeVisibilidade(h, 'npc', 'x', modo, pjIds) };
    expect(visibilidadeDaEntrada(depois, 'npc', 'x')).toEqual({ modo, pjIds });
  });
});
