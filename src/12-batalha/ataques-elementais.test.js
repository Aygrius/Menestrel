/* ============================================================
   ataques-elementais.test.js — a família -ataque golpeia (10/11/2026)
   ============================================================
   Usuário: "Aeroataque, Piroataque, etc são magias de ataque, não? Veja isso
   e arrume." e "Aeroataque pode derrubar um combatente." Ao arrumar, o motor
   passou a aplicar o efeito que acompanha o golpe de QUALQUER magia de ataque
   (efeitoDaMagiaNoGolpe) — antes só o dano chegava ao alvo.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/magias-efeito.jsx';
import '../01-core/tecnicas-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; });

// Textos do banco (10/11/2026).
const BANCO = {
  aeroataque:  { nome: 'Aeroataque', duracao: '1 rodada', nivel_1: 'Causa 12 de dano elemental de ar e derruba o alvo.' },
  hidroataque: { nome: 'Hidroataque', duracao: '3 rodadas', nivel_1: 'Causa 16 de dano elemental de água e, 1 de dano máximo na energia física por rodada.' },
  piroataque:  { nome: 'Piroataque', duracao: '3 rodadas', nivel_1: 'Causa 16 de dano elemental de fogo e, 1 de dano máximo na energia física por rodada.' },
  geoataque:   { nome: 'Geoataque', duracao: 'Instantânea', nivel_1: 'Causa 20 de dano elemental de terra.' },
};
const magia = (key) => ({ key, nome: BANCO[key].nome, nivel: 1, catalogo: { key, ...BANCO[key] } });
const mago = { tipo: 'pj', ref_id: 1, inst_id: 'pj:1', nome: 'Eco', status: 'ativo', ef: 10, ef_max: 10, eh: 10, eh_max: 10, status_temp: [] };
const orc = () => ({ tipo: 'criatura', ref_id: 9, inst_id: 'cri:9', nome: 'Orc', status: 'ativo', ef: 30, ef_max: 30, eh: 20, eh_max: 20, res: 0, status_temp: [] });

describe('as quatro são de ataque, com o elemento certo', () => {
  it.each([['aeroataque', 12, 'ar'], ['hidroataque', 16, 'agua'], ['piroataque', 16, 'fogo'], ['geoataque', 20, 'terra']])(
    '%s causa %i de dano de %s', (key, dano, el) => {
      const cat = { key, ...BANCO[key] };
      expect(window.efeitosNoNivel(cat, 1).dano).toBe(dano);
      expect(window.elementoDoNivel(cat, 1)).toBe(el);
    });
});

describe('o efeito que acompanha o golpe', () => {
  const golpe = (key) => {
    const antes = orc();
    const arr = M.aplicarGolpeEmAlvo([mago, antes], 0, 1, 12, false, null, false, false);
    return M.efeitoDaMagiaNoGolpe(arr, 0, 1, antes, magia(key))[1];
  };
  it('Aeroataque derruba: no chão, o próximo golpe fura a EH', () => {
    const alvo = golpe('aeroataque');
    expect(alvo.status_temp.some((s) => s.efeito.tipo === 'derrubado')).toBe(true);
    expect(M.modsDoGolpe(mago, alvo).ignoraEh).toBe(true);
  });
  it('Hidro e Piroataque deixam a perda por rodada', () => {
    ['hidroataque', 'piroataque'].forEach((k) => {
      const s = golpe(k).status_temp.find((x) => x.efeito.tipo === 'dano_por_rodada');
      expect(s.efeito.valor).toBe(1);
      expect(s.rodadas_rest).toBe(3);
    });
  });
  it('Geoataque é só o impacto', () => {
    expect(golpe('geoataque').status_temp).toEqual([]);
  });
  it('errou (nada caiu no alvo): o efeito não vai', () => {
    const antes = orc();
    expect(M.efeitoDaMagiaNoGolpe([mago, antes], 0, 1, antes, magia('aeroataque'))[1].status_temp).toEqual([]);
  });
});
