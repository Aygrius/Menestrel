/* ============================================================
   magias-colunas.test.jsx — Evocação, Alcance e Duração da magia
   ============================================================
   22/10/2026: "Na tabela de magias, adicione a coluna evocação, alcance e
   duração." O alcance sai abreviado como na janela da magia ("20 metros" →
   "20 m").

   15/11/2026: o Compêndio ficou igual à Ambientação (cartões, sem tabela).
   Os três valores moram na segunda linha do cartão, nesta ordem, e o que
   está vazio simplesmente não aparece. A primeira linha é classe e tipo.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './ataques-criatura.jsx';
import './criatura-formulas.jsx';
import './conhecido-jogador.jsx';
import './catalogo-descritores.jsx';
import './catalogo-editor.jsx';
import './bestiario.jsx';

const MAGIAS = [
  { id: 1, key: 'bola', nome: 'Bola de Fogo', tipo: 'Básica', evocacao: '10 rodadas', alcance: '20 metros', duracao: 'Instantânea' },
  { id: 2, key: 'cura', nome: 'Cura', tipo: 'Básica', evocacao: '2 rodadas', alcance: 'Toque', duracao: '1 hora' },
  { id: 3, key: 'voo', nome: 'Vôo', tipo: 'Perdida', evocacao: 'Ritual', alcance: null, duracao: '' },
];

beforeAll(() => {
  window.UI = { Table: 'table', TableHeader: 'thead', TableBody: 'tbody', TableRow: 'tr', TableHead: 'th', TableCell: 'td', Badge: 'span', Input: 'input' };
  window.supabaseClient = {
    from: () => {
      const resposta = () => Promise.resolve({ data: MAGIAS, error: null });
      const box = { select: () => box, eq: () => box, order: () => box, range: () => resposta(),
        like: () => Promise.resolve({ data: [], error: null }), then: (ok, f) => resposta().then(ok, f) };
      return box;
    },
    rpc: async () => ({ data: false, error: null }),
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
  };
  window.useConhecidoDoJogador = () => ({ carregando: false, erro: null,
    conhecido: { magias: new Map(), tecnicas: new Set(), habilidades: new Set(), itens: new Set(), criaturas: new Set() } });
});
afterEach(cleanup);

const montar = async () => {
  render(<div className="menestrel-ui"><window.MagiasList ac={{}} lang="pt" /></div>);
  await vi.waitFor(() => expect(document.querySelector('.diario-cartao')).toBeTruthy());
};
const cartao = (nome) => [...document.querySelectorAll('.diario-cartao')]
  .find((c) => c.querySelector('.diario-cartao-nome').textContent.trim() === nome);
const linhas = (nome) => [...cartao(nome).querySelectorAll('.diario-cartao-meta')].map((el) => el.textContent.trim());

describe('cartão de magia', () => {
  it('sem tabela', async () => {
    await montar();
    expect(document.querySelector('table')).toBeNull();
  });

  it('segunda linha: evocação · alcance abreviado · duração', async () => {
    await montar();
    expect(linhas('Bola de Fogo')).toEqual(['Básica', '10 rodadas·20 m·Instantânea'.split('·').join(' · ')]);
    expect(linhas('Cura')).toEqual(['Básica', '2 rodadas · Toque · 1 hora']);
  });

  it('campo vazio não aparece', async () => {
    await montar();
    expect(linhas('Vôo')).toEqual(['Perdida', 'Ritual']);
  });
});
