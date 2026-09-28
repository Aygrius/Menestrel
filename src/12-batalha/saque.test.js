/* ============================================================
   saque.test.js — saquear a criatura derrotada
   ============================================================
   "Quando a criatura for derrotada no tabuleiro, o jogador poderá saquear o
    inimigo derrotado." (usuário, 25/09/2026)

   Decisões dele no mesmo dia:
     • derrotada = morta OU desmaiada;
     • quem saqueia: um PJ de pé ENCOSTADO nela no tabuleiro; sem tabuleiro,
       qualquer PJ da batalha. Não gasta PA;
     • SÓ NA VEZ DELE (correção do mesmo dia: "Só dá para saquear na sua vez,
       ou seja, isso impede dois jogadores de saquear ao mesmo tempo");
     • item a item — o que um pega some para os outros.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; expect(M).toBeDefined(); });

const pj = (extra) => ({ tipo: 'pj', ref_id: '66', inst_id: 'pj:66', nome: 'Eco', status: 'ativo', atual: true, pos: { x: 10, y: 10 }, ...extra });
const goblin = (extra) => ({ tipo: 'criatura', ref_id: 7, inst_id: 'cri:7:a', nome: 'Goblin', status: 'morto', pos: { x: 12, y: 10 }, ...extra });

describe('podeSaquear', () => {
  it('criatura morta ou desmaiada, PJ de pé e encostado', () => {
    expect(M.podeSaquear(pj(), goblin())).toBe(true);
    expect(M.podeSaquear(pj(), goblin({ status: 'desmaiado' }))).toBe(true);
  });
  it('criatura de pé não se saqueia', () => {
    expect(M.podeSaquear(pj(), goblin({ status: 'ativo' }))).toBe(false);
  });
  it('PJ caído, morto ou fora de cena não saqueia', () => {
    expect(M.podeSaquear(pj({ status: 'desmaiado' }), goblin())).toBe(false);
    expect(M.podeSaquear(pj({ status: 'morto' }), goblin())).toBe(false);
    expect(M.podeSaquear(pj({ ausente: true }), goblin())).toBe(false);
  });
  it('fora da vez não saqueia — dois não saqueiam ao mesmo tempo', () => {
    expect(M.podeSaquear(pj({ atual: false }), goblin())).toBe(false);
  });
  it('longe no tabuleiro não saqueia', () => {
    expect(M.podeSaquear(pj(), goblin({ pos: { x: 30, y: 10 } }))).toBe(false);
  });
  it('sem tabuleiro, qualquer PJ da batalha', () => {
    expect(M.podeSaquear(pj({ pos: null }), goblin({ pos: null }))).toBe(true);
    expect(M.podeSaquear(pj(), goblin({ pos: null }))).toBe(true);
  });
  it('PJ não é saqueado, e criatura não saqueia', () => {
    expect(M.podeSaquear(pj(), pj({ inst_id: 'pj:2', status: 'morto' }))).toBe(false);
    expect(M.podeSaquear(goblin({ status: 'ativo' }), goblin())).toBe(false);
  });
});

describe('saqueadoresDe', () => {
  it('os PJs que podem saquear aquela criatura', () => {
    const lista = [pj(), pj({ ref_id: '75', inst_id: 'pj:75', nome: 'Elarion', atual: false, pos: { x: 11, y: 11 } }), goblin()];
    expect(M.saqueadoresDe(lista[2], lista).map((p) => p.nome)).toEqual(['Eco']);
  });
});

describe('anotarSaque', () => {
  it('soma no que já foi tirado daquela instância, e só dela', () => {
    const a = goblin();
    const b = goblin({ inst_id: 'cri:7:b' });
    let lista = M.anotarSaque([a, b], 'cri:7:a', 'espada', 1);
    lista = M.anotarSaque(lista, 'cri:7:a', 'corda', 2);
    lista = M.anotarSaque(lista, 'cri:7:a', 'corda', 1);
    expect(lista[0].saqueado).toEqual({ espada: 1, corda: 3 });
    expect(lista[1].saqueado).toBeUndefined();
  });
});

describe('adicionarAoInventario', () => {
  const id = () => 'novo';
  it('acumula numa pilha solta igual', () => {
    const inv = { itens: [{ instanceId: 'a', slug: 'corda', quantidade: 1, containerId: null, slot: null }] };
    expect(window.adicionarAoInventario(inv, 'corda', 2, id).itens[0].quantidade).toBe(3);
  });
  it('cria a instância quando não há pilha solta', () => {
    const inv = { itens: [{ instanceId: 'a', slug: 'corda', quantidade: 1, containerId: 'mochila', slot: null }] };
    const r = window.adicionarAoInventario(inv, 'corda', 1, id);
    expect(r.itens).toHaveLength(2);
    expect(r.itens[1]).toMatchObject({ instanceId: 'novo', slug: 'corda', quantidade: 1, containerId: null });
  });
  it('inventário vazio ou ausente', () => {
    expect(window.adicionarAoInventario(null, 'espada', 1, id).itens).toHaveLength(1);
  });
  it('preserva o resto do inventário', () => {
    const inv = { itens: [], moedas: { ouro: 3 } };
    expect(window.adicionarAoInventario(inv, 'espada', 1, id).moedas).toEqual({ ouro: 3 });
  });
});
