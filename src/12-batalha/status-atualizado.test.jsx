/* ============================================================
   status-atualizado.test.jsx — pedidos de 10/11/2026 na batalha
   ============================================================
   • "Mostre o status atualizado, se o personagem usou alguma técnica ou magia
     que aumenta seu movimento, por exemplo, o movimento novo deve ser mostrado
     com um verde de bônus."
   • "Não abrevie PA, é 'Ponto de ação'."
   • "O card de ações não terá mais abas": a mesa abre o painel sempre numa
     ação só (abaUnica), inclusive na evocação pronta.
   ============================================================ */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

afterEach(cleanup);
const aqui = dirname(fileURLToPath(import.meta.url));
const fonte = readFileSync(resolve(aqui, 'batalha.jsx'), 'utf8');

const velocidade = (v) => ({ id: 'mag:velocidade:x', nome: 'Velocidade', rodadas_rest: 3, efeito: { tipo: 'mod_vb', valor: v } });
const base = (over) => ({ tipo: 'pj', ref_id: 1, nome: 'Yuldrous', status: 'ativo', vb: 20,
  pa_rest: 1, pa_max: 1, defesa_sigla: 'L', defesa_valor: 5, mov_rest: 5, mov_passo: 5, status_temp: [], ...over });

describe('o movimento muda na hora com o status', () => {
  it('magia de velocidade lançada no meio da rodada aumenta o movimento já', () => {
    // vb 20 → 5 casas; +20 de velocidade → vb 40 → 10 casas.
    expect(window.movimentoDisponivel(base())).toBe(5);
    expect(window.movimentoDisponivel(base({ status_temp: [velocidade(20)] }))).toBe(10);
  });
  it('o que já andou continua descontado', () => {
    expect(window.movimentoDisponivel(base({ mov_rest: 2, status_temp: [velocidade(20)] }))).toBe(7);
  });
  it('snapshot sem mov_passo segue como antes', () => {
    expect(window.movimentoDisponivel(base({ mov_passo: undefined, status_temp: [velocidade(20)] }))).toBe(5);
  });
  it('a virada e a largada gravam mov_passo junto do mov_rest', () => {
    expect(fonte).toMatch(/mov_rest: movimentoBase\(vbParaMovimento\(p\)\), mov_passo: movimentoBase\(vbParaMovimento\(p\)\)/);
  });
});

describe('as células mostram o número de agora', () => {
  const N = () => window.NumerosDoCombatente;
  const cel = (container, rot) => [...container.querySelectorAll('.batalha-cel')]
    .find((c) => c.querySelector('.batalha-cel-rot').textContent === rot);

  it('bônus de velocidade: Velocidade e Movimento em verde, com o valor novo', () => {
    const C = N();
    const { container } = render(<C p={base({ status_temp: [velocidade(20)] })} isEn={false} celulas />);
    expect(cel(container, 'Velocidade').classList.contains('is-bonus')).toBe(true);
    expect(cel(container, 'Velocidade').querySelector('.batalha-cel-val').textContent).toBe('40');
    expect(cel(container, 'Movimento').classList.contains('is-bonus')).toBe(true);
    expect(cel(container, 'Movimento').querySelector('.batalha-cel-val').textContent).toBe('10');
  });
  it('penalidade de defesa em brasa', () => {
    const C = N();
    const st = { id: 'fc_defesa', nome: 'Defesa −5', rodadas_rest: null, efeito: { tipo: 'mod_defesa', valor: -5 } };
    const { container } = render(<C p={base({ status_temp: [st] })} isEn={false} celulas />);
    expect(cel(container, 'Defesa').classList.contains('is-penalidade')).toBe(true);
    expect(cel(container, 'Defesa').querySelector('.batalha-cel-val').textContent).toBe('L0');
  });
  it('sem efeito, sem cor', () => {
    const C = N();
    const { container } = render(<C p={base()} isEn={false} celulas />);
    expect(container.querySelector('.is-bonus, .is-penalidade')).toBeNull();
  });
  it('o verde é o do status, a brasa é a do alerta', () => {
    const css = readFileSync(resolve(aqui, '..', 'index.css'), 'utf8');
    expect(css).toMatch(/\.batalha-cel\.is-bonus \.batalha-cel-val \{ color: var\(--st-verde\); \}/);
    expect(css).toMatch(/\.batalha-cel\.is-penalidade \.batalha-cel-val \{ color: var\(--alerta\); \}/);
  });
});

describe('ponto de ação por extenso', () => {
  it('nenhum texto da batalha diz "PA"', () => {
    const tb = window.COPY.pt.batalha;
    ['pa', 'semPaDisponivel', 'soAtaqueExtraDisponivel', 'soTecnicaDisponivel']
      .forEach((k) => expect(tb[k], k).not.toMatch(/\bPA\b/));
    expect(tb.pa).toBe('Ponto de ação');
    expect(fonte).not.toMatch(/<small> PA<\/small>/);
  });
});

describe('sem abas: a mesa abre sempre numa ação só', () => {
  it('a evocação pronta abre com abaUnica, nas duas visões', () => {
    expect(fonte.match(/setAtaqueContra\(\{ id: undefined, aba: 'magia', unica: true \}\); setAcaoOpen\(true\);/g)).toHaveLength(2);
    expect(fonte).not.toMatch(/setAtaqueContra\(null\); setAcaoOpen\(true\)/);
  });
  it('nenhum setAtaqueContra com alvo abre sem unica', () => {
    const chamadas = fonte.match(/setAtaqueContra\(\{[^}]*\}\)/g) || [];
    expect(chamadas.length).toBeGreaterThan(0);
    chamadas.forEach((c) => expect(c, c).toMatch(/unica: true/));
  });
});
