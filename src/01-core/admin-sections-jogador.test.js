/* ============================================================
   admin-sections-jogador.test.js — menu lateral do jogador
   (spec 2026-09-11-catalogos-visao-jogador-design.md §4)
   ============================================================
   O que pega alguém mexendo no perfil errado: master não pode perder nem
   ganhar seção.

   `criaturas` ficou de fora na Fase A porque a spec §5 dizia que dependia
   de infraestrutura nova (tabela + RLS + tela de liberação). Ao implementar
   a Fase B descobriu-se que essa infraestrutura JÁ EXISTIA desde a
   migration 017 — historias.criatura_ids + historias.lore_acesso_pj, com o
   Mestre liberando pelo Diário. Nenhuma tabela foi criada, e a seção entrou.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';

let ADMIN_SECTIONS;
beforeAll(async () => {
  await import('./constants.jsx');
  ADMIN_SECTIONS = window.ADMIN_SECTIONS;
});

const CATALOGOS = ['criaturas', 'itens', 'magias', 'tecnicas', 'habilidades'];

describe('ADMIN_SECTIONS.player — os 5 catálogos', () => {
  it('ganhou as 5 seções de catálogo', () => {
    const ids = ADMIN_SECTIONS.player.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(CATALOGOS));
  });

  it('criaturas entrou na Fase B — e sem tabela nova', () => {
    expect(ADMIN_SECTIONS.player.map((s) => s.id)).toContain('criaturas');
  });

  it('usa os mesmos ícones do perfil master nos 5 catálogos', () => {
    const iconePor = (lista, id) => lista.find((s) => s.id === id)?.icon;
    for (const id of CATALOGOS) {
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
