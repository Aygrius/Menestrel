/* ============================================================
   receita-por-habilidade.test.js — 13/11/2026
   ============================================================
   "Ao comprar a habilidade 'Carpintaria', o personagem aprende as seguintes
    receitas: 5x lenha (10x madeira, 1x equipamento de lenhador) fica pronto
    em 10 minutos …"
   "Os personagens só podem comprar um máximo de 10 caracterização."

   A receita com `aprende_com` vem com o primeiro nível da habilidade; o
   prazo dela (receitas.minutos) vence o do grupo e pode ser fração de hora.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import './copy.jsx';
import './constants.jsx';
import './helpers.jsx';
import './inventario-helpers.jsx';
import './game-data.jsx';
import './fabricacao.jsx';

const LENHA = {
  resultado_slug: 'lenha', habilidade_key: 'carpintaria', aprende_com: 'carpintaria',
  dificuldade: 'D', rende: 5, minutos: 10,
  materiais: [{ slug: 'madeira', qtd: 10 }, { slug: 'equipamento_de_lenhador', qtd: 1, ferramenta: true }],
};
const MOCHILA = [
  { instanceId: 'a', slug: 'madeira', quantidade: 12 },
  { instanceId: 'b', slug: 'equipamento_de_lenhador', quantidade: 1 },
];

describe('a habilidade ensina a receita', () => {
  it('com o primeiro nível, a receita está aprendida sem item nem RPC', () => {
    expect(window.receitaAprendida([], LENHA, { carpintaria: 1 })).toBe(true);
    expect(window.receitaAprendida([], LENHA, { carpintaria: 0 })).toBe(false);
    expect(window.receitaAprendida([], LENHA, {})).toBe(false);
  });
  it('a receita comprada continua valendo sem a habilidade', () => {
    expect(window.receitaAprendida(['lenha'], LENHA, {})).toBe(true);
  });
  it('podeFabricar aceita a receita da habilidade', () => {
    expect(window.podeFabricar(LENHA, MOCHILA, { carpintaria: 1 }, []).ok).toBe(true);
    expect(window.podeFabricar(LENHA, MOCHILA, {}, []).motivo).toBe('sem_receita_item');
  });
});

describe('o prazo da receita, em minutos', () => {
  it('receitas.minutos vence o grupo do item', () => {
    expect(window.horasDeFabricacao({ grupo: 'Armas' }, { minutos: 180 })).toBe(3);
    expect(window.horasDeFabricacao({ grupo: 'Armas' }, null)).toBe(24);
  });
  it('10 minutos ficam prontos na primeira hora de Fabricar', () => {
    const it0 = window.itemEmConstrucao(LENHA, window.horasDeFabricacao({ grupo: 'Consumíveis' }, LENHA), () => 'x');
    expect(it0.quantidade).toBe(5);
    expect(window.emConstrucao(it0)).toBe(true);
    expect(window.progressoDaConstrucao(it0)).toBe(0);
    const { prontos } = window.avancarFabricacao([it0], 1);
    expect(prontos).toHaveLength(1);
  });
  it('o texto do prazo mostra minutos, horas e dias', () => {
    expect(window.textoDoPrazo(10 / 60)).toBe('10 min');
    expect(window.textoDoPrazo(3)).toBe('3 h');
    expect(window.textoDoPrazo(36)).toBe('1 d 12 h');
  });
});

describe('teto de 10 caracterizações', () => {
  it('conta física, social e pessoal, sem a Histórica', () => {
    const c = {
      fisica: { porte: 'forte', beleza: 'feio', estatura: 'grande' },
      social: { fama: 'afamado' },
      pessoal: { humor: 'ranzinza' },
      historica: 'Teórico',
    };
    expect(window.qtdCaracterizacoes(c)).toBe(5);
    expect(window.qtdCaracterizacoes(null)).toBe(0);
    expect(window.MAX_CARACTERIZACOES).toBe(10);
  });
});
