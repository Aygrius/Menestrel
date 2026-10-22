/* ============================================================
   milagres-batalha.test.js — o milagre na batalha (22/10/2026)
   ============================================================
   "Um personagem vampiro, lobisomem ou sem religião não pode usar ou ser
   alvo de milagres. Uma criatura de elemento 'escuridão' não pode usar
   milagres." Escuridão vale para todo ator (o Mago também).

   Quem não pode usar continua VENDO o milagre, desativado com o motivo — o
   Mago que aprendeu Curas antes da regra não fica sem saber por que sumiu.
   Quem não pode receber não é alvo — nem escolhido, nem pego pela área.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; });

const CURA = { key: 'curas_fisicas', nome: 'Curas Físicas', classe: 'Milagre', tipo: 'Básica',
  duracao: 'Instantânea', evocacao: 'Instantânea', alcance: 'Toque',
  nivel_1: 'Cura 4 pontos de Energia Física.' };
const FOGO = { key: 'piromanipulacao', nome: 'Piromanipulação', classe: 'Feitiço', tipo: 'Básica',
  duracao: 'Instantânea', evocacao: 'Instantânea', alcance: '20 metros',
  nivel_1: 'Causa 4 de dano elemental de fogo.' };
const catalogos = (pj, cri) => ({
  pjById: pj ? { 7: { id: 7, ...pj } } : {},
  criById: cri ? { 9: { id: 9, ...cri } } : {},
  magiasByKey: { curas_fisicas: CURA, piromanipulacao: FOGO },
  catalogoBySlug: {},
});
const PJ = { tipo: 'pj', ref_id: 7 };
const CRI = { tipo: 'criatura', ref_id: 9 };

describe('milagre na lista de magias', () => {
  it('Mago com Curas Físicas aprendida: aparece, bloqueada pela Escuridão', () => {
    const lista = M.magiasDeApoioDoAtor(PJ, catalogos({ profissao: 'Mago', deus: 'Lena', magias: { curas_fisicas: 1 } }));
    const cura = lista.find((m) => m.key === 'curas_fisicas');
    expect(cura).toBeTruthy();
    expect(cura.bloqueio_milagre).toEqual({ motivo: 'milagre_escuridao' });
  });

  it('Sacerdote de Lena: livre', () => {
    const lista = M.magiasDeApoioDoAtor(PJ, catalogos({ profissao: 'Sacerdote', deus: 'Lena', magias: { curas_fisicas: 1 } }));
    expect(lista.find((m) => m.key === 'curas_fisicas').bloqueio_milagre).toBeNull();
  });

  it('feitiço não é afetado, nem para quem não tem religião', () => {
    const lista = M.magiasOfensivasDoAtor(PJ, catalogos({ profissao: 'Sacerdote', deus: null, magias: { piromanipulacao: 1 } }));
    expect(lista.find((m) => m.key === 'piromanipulacao').bloqueio_milagre).toBeNull();
  });

  it('criatura "Fogo, Escuridão" com milagre no catálogo: bloqueado', () => {
    const lista = M.magiasDeApoioDoAtor(CRI, catalogos(null, { elemento: 'Fogo, Escuridão', estagio: 3, magia: 'Curas Físicas' }));
    expect(lista.find((m) => m.key === 'curas_fisicas').bloqueio_milagre).toEqual({ motivo: 'milagre_escuridao' });
  });
});

describe('alvo de milagre', () => {
  it('PJ vampiro, PJ sem deus e criatura lobisomem não são alvo; Escuridão é', () => {
    expect(M.alvoPermitidoParaMagia({ tipo: 'pj', deus: 'Lena', subraca: 'Vampiro', elemento: 'Luz' }, 'curas_fisicas', CURA, 1))
      .toEqual({ pode: false, motivo: 'alvo_milagre_vampiro' });
    expect(M.alvoPermitidoParaMagia({ tipo: 'pj', deus: null, elemento: 'Fogo' }, 'curas_fisicas', CURA, 1).motivo)
      .toBe('alvo_milagre_sem_religiao');
    expect(M.alvoPermitidoParaMagia({ tipo: 'criatura', subtipo: 'Lobisomem', elemento: 'Terra' }, 'curas_fisicas', CURA, 1).motivo)
      .toBe('alvo_milagre_lobisomem');
    expect(M.alvoPermitidoParaMagia({ tipo: 'pj', deus: 'Lena', elemento: 'Escuridão' }, 'curas_fisicas', CURA, 1).pode).toBe(true);
  });

  it('feitiço não liga para religião', () => {
    expect(M.alvoPermitidoParaMagia({ tipo: 'pj', deus: null }, 'piromanipulacao', FOGO, 1).pode).toBe(true);
  });
});

describe('milagre em área', () => {
  it('o vampiro no raio é pulado; os demais recebem', () => {
    const parts = [
      { nome: 'Ana', tipo: 'pj', deus: 'Lena', elemento: 'Luz', pos: { x: 0, y: 0 } },
      { nome: 'Vlad', tipo: 'pj', deus: 'Lena', subraca: 'Vampiro', elemento: 'Luz', pos: { x: 1, y: 0 } },
      { nome: 'Bia', tipo: 'pj', deus: 'Crezir', elemento: 'Fogo', pos: { x: 0, y: 1 } },
    ];
    const r = M.alvosNoRaio(CURA, { x: 0, y: 0 }, 5, parts, 1);
    expect(r.map((p) => p.nome)).toEqual(['Ana', 'Bia']);
  });
});
