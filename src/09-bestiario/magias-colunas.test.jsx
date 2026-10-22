/* ============================================================
   magias-colunas.test.jsx — colunas da tabela de magias (22/10/2026)
   ============================================================
   "Na tabela de magias, adicione a coluna evocação, alcance e duração."
   O alcance sai abreviado como na janela da magia ("20 metros" → "20 m"),
   campo vazio vira "—", e as colunas novas ordenam como o Nome — com os
   números na ordem natural ("2 rodadas" antes de "10 rodadas").
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
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
  await vi.waitFor(() => expect(document.querySelector('tbody tr')).toBeTruthy());
};
const cabecalhos = () => [...document.querySelectorAll('thead th')].map((th) => th.textContent.replace(/[▲▼]/g, '').trim());
const linha = (nome) => [...document.querySelectorAll('tbody tr')]
  .find((tr) => tr.querySelector('.best-name').textContent.trim() === nome);
const celulas = (nome) => [...linha(nome).querySelectorAll('td')].map((td) => td.textContent.trim());
const nomes = () => [...document.querySelectorAll('.best-name')].map((el) => el.textContent.trim());

describe('tabela de magias', () => {
  it('cabeçalho: Nome, Evocação, Alcance, Duração', async () => {
    await montar();
    expect(cabecalhos()).toEqual(['Nome', 'Evocação', 'Alcance', 'Duração']);
  });

  it('cada linha traz os três valores; alcance abreviado', async () => {
    await montar();
    expect(celulas('Bola de Fogo')).toEqual(['Bola de Fogo', '10 rodadas', '20 m', 'Instantânea']);
    expect(celulas('Cura')).toEqual(['Cura', '2 rodadas', 'Toque', '1 hora']);
  });

  it('campo vazio vira travessão', async () => {
    await montar();
    expect(celulas('Vôo')).toEqual(['Vôo', 'Ritual', '—', '—']);
  });

  it('Evocação ordena com os números na ordem natural', async () => {
    await montar();
    fireEvent.click([...document.querySelectorAll('thead th')][1]);
    expect(nomes()).toEqual(['Cura', 'Bola de Fogo', 'Vôo']);
  });
});
