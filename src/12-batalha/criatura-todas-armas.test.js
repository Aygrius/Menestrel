/* criatura-todas-armas.test.js — a criatura luta com todas as armas (10/11/2026)
   Usuário: "Porque ao iniciar uma batalha com Dradenar, só aparece uma arma e
   uma magia dele? No catálogo ele tem mais ataques e magias?" */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/magias-efeito.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; });

// Números do banco (Dradenar, id 215, e as três armas naturais).
const cat = {
  cauda:   { slug: 'cauda', nome: 'Cauda', dano: 4, dano_l: 0, dano_m: 1, dano_p: -2, alcance: 5, grupo_armas: 'Livre' },
  halito:  { slug: 'halito', nome: 'Hálito', dano: 8, dano_l: 1, dano_m: 1, dano_p: 1, alcance: 25, grupo_armas: 'Livre' },
  mordida: { slug: 'mordida', nome: 'Mordida', dano: 4, dano_l: 1, dano_m: 0, dano_p: -1, alcance: 0, grupo_armas: 'Livre' },
};
const dradenar = { id: 215, nome: 'Dradenar', estagio: 22, forca: 7, agilidade: 6, percepcao: 2, fisico: 5, aura: 3, carisma: -1,
  ataque: 'Cauda', dano_l: 32, dano_m: 33, dano_p: 30, dano_25: 3, dano_50: 6, dano_75: 9, dano_100: 11,
  equipamento: [{ slot: 'arma', slug: 'cauda' }, { slot: 'arma', slug: 'halito' }, { slot: 'arma', slug: 'mordida' }] };
const ator = { tipo: 'criatura', ref_id: 215, inst_id: 'cri:215', nome: 'Dradenar' };

describe('as armas da criatura na batalha', () => {
  it('as três aparecem; a primeira segue as colunas do bestiário', () => {
    const lista = M.ataquesDoAtor(ator, { criById: { 215: dradenar }, catalogoBySlug: cat });
    expect(lista.map((a) => a.nome)).toEqual(['Cauda', 'Hálito', 'Mordida']);
    expect(lista[0]).toMatchObject({ dano_l: 32, dano_100: 11, slug: 'cauda' });
    expect(lista[1]).toMatchObject({ slug: 'halito', alcance: 25, dano_100: 15 });
  });
  it('sem equipamento, o Ataque único de sempre', () => {
    const { equipamento, ...semEq } = dradenar;
    expect(M.ataquesDoAtor(ator, { criById: { 215: semEq }, catalogoBySlug: cat })).toHaveLength(1);
  });
});
