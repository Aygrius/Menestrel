/* ============================================================
   saque-modal.test.jsx — a janela de saque
   ============================================================
   Lista o que a criatura ainda tem (cadastro menos o já saqueado desta
   instância), deixa escolher a quantidade e entrega ao PJ escolhido.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../10-shell/shell.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let Saque;
beforeAll(() => { Saque = window.SaqueModal; expect(Saque).toBeTypeOf('function'); });
afterEach(cleanup);

const CAT = {
  espada: { slug: 'espada', nome: 'Espada', grupo: 'Armas' },
  corda: { slug: 'corda', nome: 'Corda', grupo: 'Itens' },
  peitoral: { slug: 'peitoral', nome: 'Peitoral', grupo: 'Armaduras' },
};
const CRIATURA = { id: 7, equipamento: [
  { slug: 'espada', slot: 'arma' }, { slug: 'peitoral', slot: 'peito' }, { slug: 'corda', slot: 'mochila', qtd: 3 },
] };
const alvo = (extra) => ({ tipo: 'criatura', ref_id: 7, inst_id: 'cri:7:a', nome: 'Goblin', status: 'morto', ...extra });
const eco = { tipo: 'pj', ref_id: '66', inst_id: 'pj:66', nome: 'Eco', status: 'ativo' };
const itens = () => Array.from(document.querySelectorAll('.saque-item')).map((li) => li.getAttribute('data-slug'));

const montar = (props) => render(
  <div className="menestrel-ui">
    <Saque alvo={alvo()} criatura={CRIATURA} catalogoBySlug={CAT} saqueadores={[eco]}
      isEn={false} lang="pt" onPegar={async () => ({})} onClose={() => {}} {...props} />
  </div>,
);

describe('SaqueModal', () => {
  it('lista tudo o que a criatura tem', () => {
    montar();
    expect(itens()).toEqual(['espada', 'peitoral', 'corda']);
  });

  it('esconde o que já saiu desta instância', () => {
    montar({ alvo: alvo({ saqueado: { espada: 1, corda: 3 } }) });
    expect(itens()).toEqual(['peitoral']);
  });

  it('Pegar entrega ao PJ, na quantidade escolhida', async () => {
    const onPegar = vi.fn(async () => ({}));
    montar({ onPegar });
    const corda = document.querySelector('[data-slug="corda"]');
    fireEvent.click(corda.querySelector('[aria-label="Um a mais"]'));
    fireEvent.click(corda.querySelector('.saque-pegar'));
    await vi.waitFor(() => expect(onPegar).toHaveBeenCalledWith(eco, 'corda', 2));
  });

  it('erro na gravação aparece na janela', async () => {
    montar({ onPegar: async () => ({ error: new Error('sem permissão') }) });
    fireEvent.click(document.querySelector('[data-slug="espada"] .saque-pegar'));
    expect((await screen.findByRole('alert')).textContent).toBe('sem permissão');
  });

  it('nada sobrando diz isso', () => {
    montar({ criatura: { id: 7, equipamento: [] } });
    expect(screen.getByText('Nada para saquear.')).toBeTruthy();
  });
});
