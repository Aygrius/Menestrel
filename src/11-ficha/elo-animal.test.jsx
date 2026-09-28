/* ============================================================
   elo-animal.test.jsx — Elo Permanente com o animal (27/09/2026)
   ============================================================
   "Teremos um status nos animais, mesmo aqueles que não se pode montar, que
    é resultado de magias que criam um Elo Permanente com o animal." (usuário)
   Escolhas do usuário: o elo vem da MAGIA (Elo Animal evocada num animal do
   personagem); aparece na aba do animal, na ficha do animal e no inventário;
   o Mestre pode desfazer.
   Regras da magia: nível 1 → estágio 3, 3 → 5, 5 → 7, 7 → 9, 9 → 11; no
   máximo 3 elos permanentes.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/select-pill.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';
import '../09-bestiario/ataques-criatura.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../09-bestiario/conhecido-jogador.jsx';
import '../09-bestiario/catalogo-descritores.jsx';
import '../09-bestiario/catalogo-editor.jsx';
import '../09-bestiario/bestiario.jsx';
import '../12-batalha/batalha.jsx';
import './ficha.jsx';

let W;
beforeAll(() => { W = window; });
afterEach(cleanup);

const LOBO = { instancia: { instanceId: 'l1', slug: 'lobo', quantidade: 1 }, cat: { nome: 'Lobo' }, criatura: { id: 1, nome: 'Lobo', estagio: 3 } };
const URSO = { instancia: { instanceId: 'u1', slug: 'urso', quantidade: 1 }, cat: { nome: 'Urso' }, criatura: { id: 2, nome: 'Urso', estagio: 6 } };
const ELO = { permanente: true, magia: 'elo_animal', conjurador_pj_id: 7, conjurador_nome: 'Yuldrous' };

describe('as regras do elo', () => {
  it('só Elo Animal cria elo', () => {
    expect(W.magiaCriaElo({ key: 'elo_animal' })).toBe(true);
    expect(W.magiaCriaElo({ key: 'bola_de_fogo' })).toBe(false);
  });
  it('o nível limita o estágio do animal (nível + 2)', () => {
    expect(W.bloqueioElo(LOBO, 1, 0)).toBeNull();          // estágio 3 no nível 1
    expect(W.bloqueioElo(URSO, 1, 0)).toBe('estagio_alto'); // estágio 6 > 3
    expect(W.bloqueioElo(URSO, 5, 0)).toBeNull();          // teto 7
  });
  it('já com elo, ou com 3 elos, não dá', () => {
    expect(W.bloqueioElo({ ...LOBO, instancia: { ...LOBO.instancia, elo: ELO } }, 9, 0)).toBe('ja_tem_elo');
    expect(W.bloqueioElo(LOBO, 9, 3)).toBe('limite_elos');
  });
  it('gravar divide a pilha: o elo é com UM animal', () => {
    const itens = W.comEloNoAnimal([{ instanceId: 'l1', slug: 'lobo', quantidade: 2 }], 'l1', ELO);
    expect(itens).toHaveLength(2);
    expect(itens[0]).toMatchObject({ quantidade: 1 });
    expect(itens[0].elo).toBeUndefined();
    expect(itens[1]).toMatchObject({ quantidade: 1, elo: ELO });
    expect(W.semEloNoAnimal(itens, itens[1].instanceId)[1].elo).toBeUndefined();
  });
});

describe('a aba Evocar de Elo Animal: os animais são os alvos', () => {
  const MAGIA = { key: 'elo_animal', nome: 'Elo Animal', descricao: 'Cria um elo.', nivel_1: 'Estágio 3.' };
  const montar = (props) => render(
    <div className="menestrel-ui">
      <W.MagiaDetalhesModal magia={MAGIA} passos={1} nivelMagiaEfetivoFn={() => 1} eu={{ id: 7, nome: 'Yuldrous' }}
        colegas={[{ id: 8, nome: 'Aliado' }]} animais={[LOBO, URSO]} elosAtuais={0}
        lang="pt" onClose={() => {}} onEvocar={() => {}} abrirTip={() => {}} fecharTip={() => {}} {...props} />
    </div>,
  );
  const card = (id) => document.querySelector(`[data-animal="${id}"]`);

  it('mostra os animais (não os protagonistas), com o estágio ou o porquê', () => {
    montar();
    expect(document.body.textContent).not.toMatch(/Aliado/);
    expect(card('l1').textContent).toMatch(/Estágio 3/);
    expect(card('u1').textContent).toMatch(/Acima do estágio 3/);
    expect(card('u1').getAttribute('aria-disabled')).toBe('true');
  });

  it('dois cliques no animal evocam com ele como alvo; o bloqueado não responde', () => {
    const onEvocar = vi.fn();
    montar({ onEvocar });
    fireEvent.click(card('u1')); fireEvent.click(card('u1'));
    expect(onEvocar).not.toHaveBeenCalled();
    fireEvent.click(card('l1')); fireEvent.click(card('l1'));
    expect(onEvocar).toHaveBeenCalledWith(expect.objectContaining({
      nivel: 1, alvo: expect.objectContaining({ tipo: 'animal', instanceId: 'l1' }),
    }));
  });
});

describe('o status aparece no animal', () => {
  const animais = [{ ...LOBO, instancia: { ...LOBO.instancia, elo: ELO } }];
  it('ícone de elo na aba e a linha na Identidade; o x só para o Mestre', () => {
    const onDesfazerElo = vi.fn();
    render(<W.FichaAnimaisView animais={animais} en={false} podeEditar onMontar={() => {}} onDesmontar={() => {}}
      catalogoBySlug={{}} habsByKey={{}} tecnicasByKey={{}} magiasByKey={{}} onDesfazerElo={onDesfazerElo} />);
    expect(document.querySelector('[role="tab"] .ti-link')).toBeTruthy();
    expect(document.querySelector('.fp-row--elo').textContent).toMatch(/Elo Permanente.*Yuldrous/);
    fireEvent.click(document.querySelector('[data-desfazer-elo]'));
    expect(onDesfazerElo).toHaveBeenCalledWith('l1');
  });
  it('sem onDesfazerElo (jogador), sem o x', () => {
    render(<W.FichaAnimaisView animais={animais} en={false} podeEditar onMontar={() => {}} onDesmontar={() => {}}
      catalogoBySlug={{}} habsByKey={{}} tecnicasByKey={{}} magiasByKey={{}} />);
    expect(document.querySelector('.fp-row--elo')).toBeTruthy();
    expect(document.querySelector('[data-desfazer-elo]')).toBeNull();
  });
});
