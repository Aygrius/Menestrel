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

  it('não perdeu as seções que já tinha', () => {
    const ids = ADMIN_SECTIONS.player.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(['personagens_j', 'inventario', 'loja', 'aventuras']));
  });
});

/* ============================================================
   A reorganização de 12/09/2026
   ============================================================
   Três mudanças pedidas pelo usuário, e cada uma é sobre ONDE a coisa mora:

     convites SAIU do jogador   → menu de baixo, com perfil e idioma. Não é um
                                  lugar do mundo do jogo; é conta.
     historias SAIU do mestre   → alcançado de dentro de Personagens, porque
                                  personagem pertence a história.
     lugar/npc/memoria ENTRARAM → vieram do Diário, que era uma aba dentro da
                                  ficha. Viraram três destinos próprios.

   O que estes testes protegem é a SAÍDA: um `historias` reaparecendo na barra
   voltaria a dividir a atenção com o caminho novo, e ninguém notaria. */
describe('o que saiu da barra lateral', () => {
  it('convites não é mais seção do jogador', () => {
    expect(ADMIN_SECTIONS.player.map((s) => s.id)).not.toContain('convites');
  });

  it('historias não é mais seção do mestre', () => {
    expect(ADMIN_SECTIONS.master.map((s) => s.id)).not.toContain('historias');
  });
});

describe('o que entrou: as três do ex-Diário', () => {
  it.each(['lugares', 'npcs', 'memorias'])('%s é seção do jogador', (id) => {
    expect(ADMIN_SECTIONS.player.map((s) => s.id)).toContain(id);
  });

  it('são só do JOGADOR — o Mestre vê o diário pela ficha do PJ', () => {
    ['lugares', 'npcs', 'memorias'].forEach((id) => {
      expect(ADMIN_SECTIONS.master.map((s) => s.id), id).not.toContain(id);
    });
  });

  it('cada uma tem ícone próprio, sem repetir as vizinhas', () => {
    const icones = ADMIN_SECTIONS.player.map((s) => s.icon);
    expect(new Set(icones).size, 'ícone repetido confunde numa barra só de ícones').toBe(icones.length);
  });
});

describe('ADMIN_SECTIONS.master — as 7 que sobraram', () => {
  it('mantém a ordem, sem historias', () => {
    const ids = ADMIN_SECTIONS.master.map((s) => s.id);
    expect(ids).toEqual([
      'personagens_m', 'criaturas', 'itens',
      'itens_campanha', 'magias', 'tecnicas', 'habilidades',
    ]);
  });
});

describe('numa barra só de ícones, rótulo repetido é destino indistinguível', () => {
  /* Com a sidebar sempre pequena (12/09/2026), o nome de cada seção vive
     apenas no tooltip. Dois rótulos iguais viram duas portas que dizem a
     mesma coisa e levam a lugares diferentes.

     Foi o que aconteceu ao criar a seção de NPCs: o usuário a chamou de
     "Personagens", e o jogador já tinha uma "Personagens" (as fichas dele).
     A dele virou "Meus Personagens". */
  let ADMIN_COPY_LOCAL;
  beforeAll(async () => {
    await import('./constants.jsx');
    ADMIN_COPY_LOCAL = window.ADMIN_COPY;
  });

  it.each(['pt', 'en'])('nenhum rótulo repetido no menu do jogador (%s)', (idioma) => {
    const secs = ADMIN_COPY_LOCAL[idioma].sections;
    const rotulos = ADMIN_SECTIONS.player.map((s) => (secs[s.id] || {}).label);
    expect(rotulos.every(Boolean), 'toda seção precisa de rótulo').toBe(true);
    expect(new Set(rotulos).size, rotulos.join(' · ')).toBe(rotulos.length);
  });

  it.each(['pt', 'en'])('nem no menu do mestre (%s)', (idioma) => {
    const secs = ADMIN_COPY_LOCAL[idioma].sections;
    const rotulos = ADMIN_SECTIONS.master.map((s) => (secs[s.id] || {}).label);
    expect(new Set(rotulos).size, rotulos.join(' · ')).toBe(rotulos.length);
  });
});
