/* ============================================================
   aviso-condicao.test.js — o aviso único da condição ruim
   ============================================================
   Usuário (08/11/2026): "Mostre uma mensagem de aviso única na notificação
   da mesa quando a condição do personagem ficar ruim." O aviso sai quando a
   barra cruza para o primeiro degrau que cobra (25 de 100); enquanto segue
   ruim, não repete. O texto diz o efeito real (CONDICOES_MALEFICIO).
   ============================================================ */
import { describe, it, expect } from 'vitest';
import './copy.jsx';
import './constants.jsx';
import './helpers.jsx';
import './inventario-helpers.jsx';
import './game-data.jsx';

const avisos = (...a) => window.avisosDeCondicao(...a);

describe('avisosDeCondicao', () => {
  it('o sono que cruza 25 vira um aviso com o efeito real (velocidade)', () => {
    const r = avisos({ animo: 20 }, { animo: 30 }, {}, 'Lirael');
    expect(r).toEqual([{ condicao: 'animo', texto: 'Lirael está com muito sono! Se não descansar, sua velocidade será afetada.' }]);
  });

  it('já ruim antes: não repete', () => {
    expect(avisos({ animo: 30 }, { animo: 60 }, {}, 'Lirael')).toEqual([]);
  });

  it('abaixo do primeiro degrau: nada', () => {
    expect(avisos({ nutricao: 0 }, { nutricao: 24 }, {}, 'Lirael')).toEqual([]);
  });

  it('melhorou e piorou de novo: avisa outra vez', () => {
    expect(avisos({ nutricao: 10 }, { nutricao: 26 }, {}, 'Eco')[0].texto)
      .toBe('Eco está com muita fome! Se não comer, sua resistência física será afetada.');
  });

  it('frio coberto pela roupa não avisa', () => {
    // Termorregulação −40 = 40 de frio. Proteção 80 põe o teto da barra em 20,
    // abaixo do primeiro degrau: não avisa. Sem proteção, avisa.
    expect(avisos({ termorregulacao: 0 }, { termorregulacao: -40 }, { frio: 80 }, 'Eco')).toEqual([]);
    expect(avisos({ termorregulacao: 0 }, { termorregulacao: -40 }, {}, 'Eco')[0].condicao).toBe('frio');
  });

  it('má fama fala das habilidades do grupo', () => {
    expect(avisos({}, { reputacao: 50 }, {}, 'Eco')[0].texto).toMatch(/suas habilidades de influência serão afetadas\.$/);
  });
});
