/* ============================================================
   item-a-venda.test.jsx — o item anunciado fica no inventário, travado
   ============================================================
   "O item à venda, continua ocupando espaço no inventário." (usuário,
   02/10/2026). Decisão do usuário: enquanto à venda, nada de usar, equipar,
   vestir, transferir, guardar, descartar nem vender — só retirando o anúncio.
   A instância à venda carrega `anuncio_id` (ver scripts/sql/
   venda-pendente-2026-10-02.sql); aqui, o lado do cliente.
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
import '../12-batalha/batalha.jsx';

const it_ = (instanceId, slug, extra) => ({ instanceId, slug, quantidade: 1, containerId: null, equipado: false, slot: null, ...extra });
const CAT = {
  flecha:  { slug: 'flecha', nome: 'Flecha', grupo: 'Consumíveis', tipo: 'S', ocupa: 0.1 },
  pocao:   { slug: 'pocao', nome: 'Poção', grupo: 'Consumíveis', tipo: 'S', ocupa: 0.5 },
  mochila: { slug: 'mochila', nome: 'Mochila', grupo: 'Recipientes', tipo: 'S', armazena: 10 },
  carne:   { slug: 'carne', nome: 'Carne', grupo: 'Consumíveis', tipo: 'S', ocupa: 0.5 },
};

describe('estaAVenda / itensLivres', () => {
  it('quem tem anuncio_id está à venda; itensLivres tira esses', () => {
    const livre = it_('a', 'flecha');
    const travado = it_('b', 'flecha', { anuncio_id: 7 });
    expect(window.estaAVenda(travado)).toBe(true);
    expect(window.estaAVenda(livre)).toBe(false);
    expect(window.estaAVenda(null)).toBe(false);
    expect(window.itensLivres([livre, travado, null])).toEqual([livre]);
  });
});

describe('o item à venda não some nem se funde', () => {
  it('normalizarPilhas não funde a pilha à venda com a pilha solta do mesmo slug', () => {
    const itens = [it_('a', 'flecha', { quantidade: 6 }), it_('b', 'flecha', { quantidade: 4, anuncio_id: 7 })];
    const out = window.normalizarPilhas(itens, CAT);
    expect(out).toHaveLength(2);
    expect(out.find((x) => x.anuncio_id === 7).quantidade).toBe(4);
  });
});

describe('consumir ignora o que está à venda', () => {
  it('consumirDoInventario tira da pilha livre, nunca da travada', () => {
    const itens = [it_('b', 'pocao', { quantidade: 2, anuncio_id: 7 }), it_('a', 'pocao', { quantidade: 1 })];
    const out = window.MotorBatalha.consumirDoInventario(itens, 'pocao', 2);
    // Só 1 livre: consome 1, a travada fica intacta.
    expect(out).toEqual([it_('b', 'pocao', { quantidade: 2, anuncio_id: 7 })]);
  });

  it('flechasNoInventario não oferece flecha à venda ao arco', () => {
    const r = window.flechasNoInventario([it_('a', 'flecha', { quantidade: 3 }), it_('b', 'flecha', { quantidade: 9, anuncio_id: 7 })], CAT);
    expect(r).toEqual([expect.objectContaining({ slug: 'flecha', quantidade: 3 })]);
  });

  it('o ritual não conta nem gasta o que está à venda', () => {
    const conf = window.conferirItensDoRitual('Poção (2)', [it_('a', 'pocao', { quantidade: 1 }), it_('b', 'pocao', { quantidade: 5, anuncio_id: 7 })], CAT);
    expect(conf.ok).toBe(false);
    expect(conf.faltam[0].tem).toBe(1);
  });

  it('carneDisponivel não conta carne à venda', () => {
    expect(window.carneDisponivel([it_('a', 'carne', { quantidade: 2 }), it_('b', 'carne', { quantidade: 3, anuncio_id: 7 })], 'carne')).toBe(2);
  });

  it('pergaminho à venda não dá magia na batalha', () => {
    const catalogos = {
      pjById: { 1: { inventario: { itens: [it_('p', 'perg', { anuncio_id: 7 })] } } },
      catalogoBySlug: { perg: { slug: 'perg', nome: 'Pergaminho', grupo: 'Consumíveis', magia: 'Luz' } },
      magiasByKey: { luz: { key: 'luz', nome: 'Luz' } },
    };
    expect(window.MotorBatalha.magiasDeItensDoAtor({ tipo: 'pj', ref_id: 1 }, catalogos)).toEqual([]);
  });

  it('animal à venda não entra na batalha nem aparece como companheiro', () => {
    const pj = { inventario: { itens: [it_('c', 'cavalo', { anuncio_id: 7 })] } };
    const porSlug = { cavalo: { slug: 'cavalo', criatura_id: 5 } };
    const criaturas = { 5: { id: 5, nome: 'Cavalo' } };
    expect(window.MotorBatalha.animaisParaBatalha(pj, porSlug, criaturas)).toEqual([]);
    expect(window.animaisDoPersonagem(pj.inventario.itens, porSlug, criaturas)).toEqual([]);
  });
});

describe('guardar na mochila recusa item à venda', () => {
  it('guardarNoRecipiente devolve a_venda', () => {
    const itens = [it_('m', 'mochila', { casa: 0 }), it_('p', 'pocao', { casa: 1, anuncio_id: 7 })];
    expect(window.guardarNoRecipiente(itens, 'p', 'm', CAT)).toMatchObject({ ok: false, motivo: 'a_venda' });
  });
});
