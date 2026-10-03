/* ============================================================
   guardar-no-recipiente.test.js — arrastar um item para a mochila
   ============================================================
   "Pegar um item, arrastar e soltar dentro de uma mochila, irá colocar este
    item dentro da mochila, respeitando as regras dos itens." (usuário,
    02/10/2026). Decisão do usuário: o que não cabe volta para a casa de
   origem — entra o que couber.

   As regras são as do botão Armazenar: recipiente não entra em recipiente,
   item em uso (equipado/vestido/montado) não é guardado, tipo S/L e grupo
   aceito batem, recipiente de líquido guarda um líquido só.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../01-core/select-pill.jsx';
import './inventario.jsx';

const CAT = {
  aljava:  { slug: 'aljava',  nome: 'Aljava',  grupo: 'Vestimentas', tipo: 'S', tipo_item: 'Consumíveis', armazena: 1 },
  mochila: { slug: 'mochila', nome: 'Mochila', grupo: 'Recipientes', tipo: 'S', armazena: 10 },
  cantil:  { slug: 'cantil',  nome: 'Cantil',  grupo: 'Recipientes', tipo: 'L', tipo_item: 'Consumíveis', armazena: 2 },
  flecha:  { slug: 'flecha',  nome: 'Flecha',  grupo: 'Consumíveis', tipo: 'S', ocupa: 0.1 },
  corda:   { slug: 'corda',   nome: 'Corda',   grupo: 'Itens',       tipo: 'S', ocupa: 1 },
  espada:  { slug: 'espada',  nome: 'Espada',  grupo: 'Armas',       tipo: 'S', ocupa: 2 },
  agua:    { slug: 'agua',    nome: 'Água',    grupo: 'Consumíveis', tipo: 'L', ocupa: 1 },
  vinho:   { slug: 'vinho',   nome: 'Vinho',   grupo: 'Consumíveis', tipo: 'L', ocupa: 1 },
};
const it_ = (instanceId, slug, extra) => ({ instanceId, slug, quantidade: 1, containerId: null, equipado: false, slot: null, ...extra });
const G = (itens, id, cont) => window.guardarNoRecipiente(itens, id, cont, CAT);

describe('guardarNoRecipiente', () => {
  it('cabe tudo: o item entra e ganha a primeira casa livre lá dentro', () => {
    const itens = [it_('m', 'mochila', { casa: 0 }), it_('c', 'corda', { casa: 3 })];
    const r = G(itens, 'c', 'm');
    expect(r).toMatchObject({ ok: true, qtd: 1, total: 1 });
    expect(r.itens.find((x) => x.instanceId === 'c')).toMatchObject({ containerId: 'm', casa: 0 });
  });

  it('não cabe tudo: entra o que couber e o resto fica na casa de origem', () => {
    // Aljava 1 de espaço, flecha 0.1 → cabem 10 de 20.
    const itens = [it_('a', 'aljava', { casa: 0 }), it_('f', 'flecha', { quantidade: 20, casa: 5 })];
    const r = G(itens, 'f', 'a');
    expect(r).toMatchObject({ ok: true, qtd: 10, total: 20 });
    const fora = r.itens.find((x) => x.instanceId === 'f');
    expect(fora).toMatchObject({ quantidade: 10, containerId: null, casa: 5 });
    const dentro = r.itens.find((x) => x.slug === 'flecha' && x.containerId === 'a');
    expect(dentro).toMatchObject({ quantidade: 10, casa: 0 });
  });

  it('sem espaço nenhum: recusa com motivo e não mexe em nada', () => {
    const itens = [it_('a', 'aljava', { casa: 0 }), it_('cheia', 'flecha', { quantidade: 10, containerId: 'a', casa: 0 }), it_('f', 'flecha', { quantidade: 3, casa: 1 })];
    const r = G(itens, 'f', 'a');
    expect(r.ok).toBe(false);
    expect(r.motivo).toBeTruthy();
  });

  it('recipiente não entra em recipiente', () => {
    const r = G([it_('m', 'mochila', { casa: 0 }), it_('a', 'aljava', { casa: 1 })], 'a', 'm');
    expect(r).toMatchObject({ ok: false, motivo: 'recipiente' });
  });

  it('item equipado, vestido ou montado não é guardado', () => {
    for (const extra of [{ equipado: true, slot: 'mao_d' }, { vestido: true }, { montado: true }]) {
      const r = G([it_('m', 'mochila', { casa: 0 }), it_('e', 'espada', { casa: 1, ...extra })], 'e', 'm');
      expect(r).toMatchObject({ ok: false, motivo: 'em_uso' });
    }
  });

  it('o grupo aceito pelo recipiente vale (aljava só leva consumíveis)', () => {
    const r = G([it_('a', 'aljava', { casa: 0 }), it_('c', 'corda', { casa: 1 })], 'c', 'a');
    expect(r).toMatchObject({ ok: false, motivo: 'regra' });
    expect(r.texto).toMatch(/Consumíveis/);
  });

  it('sólido não entra em recipiente de líquido', () => {
    const r = G([it_('k', 'cantil', { casa: 0 }), it_('f', 'flecha', { casa: 1 })], 'f', 'k');
    expect(r).toMatchObject({ ok: false, motivo: 'regra' });
  });

  it('recipiente de líquido guarda um líquido só', () => {
    const itens = [it_('k', 'cantil', { casa: 0 }), it_('w', 'agua', { containerId: 'k', casa: 0 }), it_('v', 'vinho', { casa: 1 })];
    expect(G(itens, 'v', 'k')).toMatchObject({ ok: false, motivo: 'outro_liquido' });
  });
});
