/* ============================================================
   estudar-tecnica.test.jsx — técnicas pela janela Estudar (22/10/2026)
   ============================================================
   "todo mundo poderá aprender todas as técnicas. Toda técnica terá um
   pergaminho para aprender igual a magia" — e o que se compra entra na fila
   de treino (3 dias de Treinando por nível). A janela mostra o que já está
   em treino e quanto falta.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/clima-desgaste.jsx';
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';

let W;
beforeAll(() => { W = window; });
afterEach(cleanup);

const GOLPE = { key: 'golpe', nome: 'Golpe Duplo', custo: 2 };
const PERG_GOLPE = { slug: 'pergaminho_tecnica_golpe', grupo: 'Consumíveis', tecnica: 'Golpe Duplo' };
const MANUAL = { slug: 'manual_do_guerreiro', grupo: 'Itens', nome: 'Manual do Guerreiro' };
const CAT = { [PERG_GOLPE.slug]: PERG_GOLPE, [MANUAL.slug]: MANUAL };
const VINC = { manual_do_guerreiro: ['pergaminho_tecnica_golpe'] };
const PJ = { profissao: 'Guerreiro', experiencia: 0, fisico_base: 2, agilidade_base: 1, tecnicas: {}, treinos: [], magias: {} };
const OP = { noInventario: true, podeAprender: true, aVenda: false };

describe('o que o item ensina de técnica', () => {
  it('pergaminho de técnica', () => {
    expect(W.ehPergaminhoDeTecnica(PERG_GOLPE)).toBe(true);
    expect(W.ehPergaminhoDeMagia(PERG_GOLPE)).toBe(false);
    expect(W.tecnicasQueOItemEnsina(PERG_GOLPE, {}, CAT, [GOLPE]).map((t) => t.key)).toEqual(['golpe']);
  });
  it('manual vincula a técnica', () => {
    expect(W.tecnicasQueOItemEnsina(MANUAL, VINC, CAT, [GOLPE]).map((t) => t.key)).toEqual(['golpe']);
  });
});

const linhas = () => [...document.querySelectorAll('.estudar-linha')];
const confirmar = () => document.querySelector('.ms-footer .btn-primary');

describe('janela Estudar com técnica', () => {
  it('linha com nível e custo; confirmar pede { tipo: tecnica }', async () => {
    const onAprender = vi.fn(async () => ({ ok: true }));
    render(<W.EstudarMagiaModal titulo="Manual do Guerreiro" magias={[]} tecnicas={[GOLPE]} pj={PJ}
      magiasDb={[]} tecnicasDb={[GOLPE]} opcoes={OP} lang="pt" onAprender={onAprender} onClose={() => {}} />);
    const l = linhas()[0];
    expect(l.querySelector('.estudar-nome').textContent).toBe('Golpe Duplo');
    expect(l.querySelector('.estudar-nivel').textContent).toMatch(/—\s*→\s*1/);
    expect(l.querySelector('.estudar-custo').textContent).toMatch(/2/);
    fireEvent.click(confirmar());
    await waitFor(() => expect(onAprender).toHaveBeenCalledWith({ tipo: 'tecnica', key: 'golpe' }));
  });

  it('nível em treino aparece com o tempo que falta', () => {
    const pj = { ...PJ, experiencia: 100000, treinos: [{ id: 'x', tipo: 'tecnica', key: 'golpe', nivel: 1, atividade: 'treinando', horas_restantes: 36 }] };
    render(<W.EstudarMagiaModal titulo="M" magias={[]} tecnicas={[GOLPE]} pj={pj}
      magiasDb={[]} tecnicasDb={[GOLPE]} opcoes={OP} lang="pt" onAprender={async () => ({ ok: true })} onClose={() => {}} />);
    const l = linhas()[0];
    expect(l.querySelector('.estudar-treino').textContent).toMatch(/em treino.*1 d 12 h/i);
    // o próximo é o 2: o 1 já foi pago e está na fila
    expect(l.querySelector('.estudar-nivel').textContent).toMatch(/→\s*2/);
  });
});
