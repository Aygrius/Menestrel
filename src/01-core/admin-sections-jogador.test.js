/* ============================================================
   admin-sections-jogador.test.js — menu lateral do jogador ganha os 4
   catálogos da Fase A (spec 2026-09-11-catalogos-visao-jogador-design.md §4)
   ============================================================
   O que pega alguém mexendo no perfil errado: master não pode perder nem
   ganhar seção, e `criaturas` não pode vazar pro player nesta fase (§5 —
   criaturas depende de infraestrutura que ainda não existe).
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';

let ADMIN_SECTIONS;
beforeAll(async () => {
  await import('./constants.jsx');
  ADMIN_SECTIONS = window.ADMIN_SECTIONS;
});

describe('ADMIN_SECTIONS.player — Fase A', () => {
  it('ganhou as 4 seções de catálogo', () => {
    const ids = ADMIN_SECTIONS.player.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(['itens', 'magias', 'tecnicas', 'habilidades']));
  });

  it('NÃO ganhou criaturas (Fase B, depende de liberação por história)', () => {
    const ids = ADMIN_SECTIONS.player.map((s) => s.id);
    expect(ids).not.toContain('criaturas');
  });

  it('usa os mesmos ícones do perfil master pros 4 catálogos', () => {
    const iconePor = (lista, id) => lista.find((s) => s.id === id)?.icon;
    for (const id of ['itens', 'magias', 'tecnicas', 'habilidades']) {
      expect(iconePor(ADMIN_SECTIONS.player, id)).toBe(iconePor(ADMIN_SECTIONS.master, id));
    }
  });

  it('não perdeu nenhuma das 5 seções que já tinha', () => {
    const ids = ADMIN_SECTIONS.player.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(['personagens_j', 'inventario', 'loja', 'aventuras', 'convites']));
  });
});

describe('ADMIN_SECTIONS.master — intacto', () => {
  it('continua com as 8 seções originais, sem alteração', () => {
    const ids = ADMIN_SECTIONS.master.map((s) => s.id);
    expect(ids).toEqual([
      'historias', 'personagens_m', 'criaturas', 'itens',
      'itens_campanha', 'magias', 'tecnicas', 'habilidades',
    ]);
  });
});
