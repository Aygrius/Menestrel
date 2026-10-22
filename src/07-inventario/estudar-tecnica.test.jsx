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

/* O pergaminho vale pelo SLUG, como nas RPCs (22/10/2026): o campo de nome
   (itens.magia / itens.tecnica) pode ficar velho depois de renomear a magia
   ou a técnica — a janela não pode oferecer outra coisa que a RPC recusa. */
describe('pergaminho achado pelo slug', () => {
  it('técnica: slug manda, mesmo com nome velho no campo', () => {
    const velho = { ...PERG_GOLPE, tecnica: 'Nome Antigo' };
    expect(W.tecnicasQueOItemEnsina(velho, {}, { [velho.slug]: velho }, [GOLPE]).map((t) => t.key)).toEqual(['golpe']);
  });
  it('magia: slug manda, mesmo com nome velho no campo', () => {
    const PRES = { key: 'pressagio_curativo', nome: 'Presságio', custo: 1, nivel_1: 'x' };
    const OUTRA = { key: 'outra', nome: 'Outra', custo: 1, nivel_1: 'x' };
    const perg = { slug: 'pergaminho_pressagio_curativo', grupo: 'Consumíveis', magia: 'Outra' };
    expect(W.magiasQueOItemEnsina(perg, {}, { [perg.slug]: perg }, [PRES, OUTRA]).map((m) => m.key)).toEqual(['pressagio_curativo']);
  });
});

/* Os motivos falam de TÉCNICA quando a linha é de técnica (22/10/2026). */
describe('motivo da técnica', () => {
  it('pontos insuficientes fala de técnica', () => {
    const t = W.motivoAprenderLabel('pontos_insuficientes', false, { tipo: 'tecnica', faltam: 2, gasto: 4, total: 6 });
    expect(t).toMatch(/Pontos de técnica insuficientes/);
    expect(W.motivoAprenderLabel('pontos_insuficientes', false, { tipo: 'tecnica' })).toMatch(/técnica/);
    expect(W.motivoAprenderLabel('item_nao_ensina', false, { tipo: 'tecnica' })).toMatch(/técnica/);
    expect(W.motivoAprenderLabel('erro_qualquer', false, { tipo: 'tecnica' })).toMatch(/técnica/);
  });
  it('magia continua igual', () => {
    expect(W.motivoAprenderLabel('pontos_insuficientes', false)).toBe('Pontos de magia insuficientes.');
  });
  it('a janela passa o tipo ao rótulo do bloqueio', () => {
    const pj = { ...PJ, experiencia: 0, fisico_base: 0, agilidade_base: 0 };
    const CARA = { key: 'golpe', nome: 'Golpe Duplo', custo: 9 };
    render(<W.EstudarMagiaModal titulo="M" magias={[]} tecnicas={[CARA]} pj={pj}
      magiasDb={[]} tecnicasDb={[CARA]} opcoes={OP} lang="pt" onAprender={async () => ({ ok: true })} onClose={() => {}} />);
    expect(document.querySelector('.estudar-motivo').textContent).toMatch(/Pontos de técnica insuficientes/);
  });
});
