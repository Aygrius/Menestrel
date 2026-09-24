/* ============================================================
   preparar-carne-modal.test.jsx — o botão Preparar da carne
   ============================================================
   O modal do item oferece as três receitas da carne; a que pede mais carne
   do que o personagem tem fica desativada.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';

let Modal;
beforeAll(() => { Modal = window.DetalhesItemModal; expect(Modal).toBeTypeOf('function'); });
afterEach(cleanup);

const noop = () => {};
const CAT = {
  carne: { slug: 'carne', nome: 'Carne', grupo: 'Consumíveis' },
  racao: { slug: 'racao', nome: 'Ração', grupo: 'Consumíveis', efeito_positivo: 'Aumenta 20 de Alimentação.' },
  refeicao: { slug: 'refeicao', nome: 'Refeição', grupo: 'Consumíveis' },
  banquete: { slug: 'banquete', nome: 'Banquete', grupo: 'Consumíveis' },
  agua: { slug: 'agua', nome: 'Água', grupo: 'Consumíveis' },
};
const inst = (slug, quantidade, id = 'i1') => ({ instanceId: id, slug, quantidade, equipado: false, slot: null, containerId: null });

const abrir = (instance, todosItens, extra) => render(
  <Modal
    instance={instance} catalogoBySlug={CAT} raca="Humano"
    slotsState={{}} todosItens={todosItens} containersDisponiveis={[]} pjsHistoria={[]}
    lang="pt" onClose={noop} onEquipar={noop} onDesequipar={noop} onUsar={noop}
    onDestruir={noop} onObservacao={noop} onMoverParaContainer={noop} onTransferir={noop}
    onTransferReset={noop} onVestir={noop} onDespir={noop} onRemoverDoContainer={noop}
    onAbrirDetalhesFilho={noop}
    {...extra}
  />,
);
const botaoPreparar = () => Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Preparar');

describe('Preparar na carne', () => {
  it('abre as três receitas e desativa a que falta carne', () => {
    const escolhas = [];
    const carne = inst('carne', 1);
    abrir(carne, [carne, inst('carne', 1, 'i2')], { onPrepararCarne: (id, r) => escolhas.push([id, r]) });
    fireEvent.click(botaoPreparar());
    const receita = (slug) => document.querySelector(`button[data-receita="${slug}"]`);
    expect(receita('racao').disabled).toBe(false);
    expect(receita('refeicao').disabled).toBe(false);   // 1 + 1 de outra pilha
    expect(receita('banquete').disabled).toBe(true);
    fireEvent.click(receita('refeicao'));
    expect(escolhas).toEqual([['i1', 'refeicao']]);
  });

  it('o que não é carne não tem Preparar', () => {
    const agua = inst('agua', 3);
    abrir(agua, [agua], { onPrepararCarne: noop });
    expect(botaoPreparar()).toBeUndefined();
  });
});
