/* ============================================================
   ficha-animais.test.jsx — a aba Animais da ficha
   ============================================================
   Pedido do usuário (14/09/2026): "Na ficha dos animais, é preciso montar
   todos os ataques, o nível das técnicas e habilidades e magias. Use a seta
   para o lado igual nas informações do personagem. Use abas internas para
   selecionar a ficha do animal."

   Trava: abas internas trocam de animal; a seta de Ataques passa pelos
   ataques (com a sequência real de clique — ver ficha-info-nav.test.jsx,
   é o mesmo risco de remontagem); Capacidades mostra os níveis.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../12-batalha/batalha.jsx';
import './ficha.jsx';

let FichaAnimaisView;
beforeAll(() => {
  FichaAnimaisView = window.FichaAnimaisView;
  expect(FichaAnimaisView).toBeDefined();
});
afterEach(() => cleanup());

const CAT = {
  garras: { slug: 'garras', nome: 'Garras', grupo: 'Armas', slot_equip: 'maos', dano: 8, dano_l: 1, dano_m: 2, dano_p: 3, ajuste_atributo: 'AGI', maos_outras: 1 },
  presas: { slug: 'presas', nome: 'Presas', grupo: 'Armas', slot_equip: 'maos', dano: 10, dano_l: 0, dano_m: 1, dano_p: 2, ajuste_atributo: 'FOR', maos_outras: 1 },
};
const LOBO = {
  id: 9, nome: 'Lobo Alfa', tipo: 'Animal', estagio: 5, peso: 50, montaria: false,
  forca: 2, agilidade: 3, fisico: 1, aura: 0, carisma: 0, percepcao: 2, intelecto: '0',
  equipamento: [{ slug: 'presas', slot: 'mao_d' }, { slug: 'garras', slot: 'mao_e' }],
  habilidades: 'Rastrear', tecnicas_especiais: '', magia: '',
};
const CAVALO = { id: 157, nome: 'Cavalo Quarter', tipo: 'Animal', estagio: 4, montaria: true, equipamento: [] };
const HABS = { rastrear: { key: 'rastrear', nome: 'Rastrear', grupo: 'Geral', ajuste: 'PER' } };

const animais = [
  { instancia: { instanceId: 'a1', slug: 'lobo_alfa' }, cat: { nome: 'Lobo Alfa' }, criatura: LOBO },
  { instancia: { instanceId: 'a2', slug: 'cavalo_quarter', montado: true }, cat: { nome: 'Cavalo Quarter' }, criatura: CAVALO },
];

const montar = (over) => render(
  <FichaAnimaisView animais={animais} en={false} podeEditar onMontar={() => {}} onDesmontar={() => {}}
    catalogoBySlug={CAT} habsByKey={HABS} tecnicasByKey={{}} magiasByKey={{}} {...over} />
);
const coluna = (titulo) => [...document.querySelectorAll('.fp-col-title-main')]
  .find((el) => el.textContent === titulo).closest('.fp-col-title-nav').parentElement;

describe('FichaAnimaisView', () => {
  it('abre no montado e as abas internas trocam de animal', () => {
    montar();
    const abas = [...document.querySelectorAll('[role="tab"]')];
    expect(abas.map((a) => a.getAttribute('aria-selected'))).toEqual(['false', 'true']);
    fireEvent.click(abas[0]);
    expect(coluna('Animal').textContent).toContain('Lobo Alfa');
  });

  it('a seta de Ataques passa por todos os ataques (clique real)', () => {
    montar();
    fireEvent.click(document.querySelectorAll('[role="tab"]')[0]);
    const col = coluna('Ataques');
    expect(col.querySelector('.fp-col-title-sub').textContent).toBe('Presas');
    const btn = col.querySelector('.fp-col-title-nav-btn');
    fireEvent.mouseDown(btn); fireEvent.focus(btn); fireEvent.mouseUp(btn); fireEvent.click(btn);
    expect(coluna('Ataques').querySelector('.fp-col-title-sub').textContent).toBe('Garras');
  });

  it('Capacidades mostra a habilidade com o total da regra da criatura', () => {
    montar();
    fireEvent.click(document.querySelectorAll('[role="tab"]')[0]);
    const linha = [...coluna('Capacidades').querySelectorAll('.fp-row')]
      .find((r) => r.textContent.includes('Rastrear'));
    expect(linha).toBeTruthy();
    expect(linha.querySelector('.fp-row-value').textContent).not.toBe('—');
  });

  it('montaria tem Desmontar na linha das abas; o lobo não tem ação', () => {
    montar();
    expect(document.querySelector('.fp-animais-acao').textContent).toBe('Desmontar');
    fireEvent.click(document.querySelectorAll('[role="tab"]')[0]);
    expect(document.querySelector('.fp-animais-acao')).toBeNull();
  });
});
