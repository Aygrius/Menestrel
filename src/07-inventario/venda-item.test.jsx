/* ============================================================
   venda-item.test.jsx — vender = publicar na loja da aventura
   ============================================================
   "O sistema de venda funcionará da seguinte maneira, o jogador irá
    'publicar' os itens na loja pelo preço que ele quiser, outros jogadores ou
    o mestre podem comprar dele. A ação não precisa acontecer na mesma hora, o
    item ficará na loja da aventura." (usuário, 27/09/2026)

   A regra de verdade mora nas RPCs (scripts/sql/anuncios-loja-2026-09-27.sql).
   Aqui fica o que a tela decide sozinha:
     • por que o ícone Vender está desativado;
     • a etapa de publicar (quantidade + preço) no modal do item;
     • a janela do anúncio na loja: Comprar e Retirar em dois cliques;
     • os quatro campos de moeda somando em latão.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/select-pill.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './inventario.jsx';
import './loja.jsx';
import '../09-bestiario/ataques-criatura.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../09-bestiario/conhecido-jogador.jsx';
import '../09-bestiario/catalogo-descritores.jsx';
import '../09-bestiario/catalogo-editor.jsx';
import '../09-bestiario/bestiario.jsx';

let bloqueio, label, PrecoMoedasInput, Modal, Anuncio;
beforeAll(() => {
  bloqueio = window.bloqueioVenda;
  label = window.motivoVendaLabel;
  PrecoMoedasInput = window.PrecoMoedasInput;
  Modal = window.DetalhesItemModal;
  Anuncio = window.AnuncioLojaModal;
  expect(window.VendaModal).toBeUndefined();          // a negociação saiu
  expect(window.vendaAcoesDisponiveis).toBeUndefined();
});
afterEach(cleanup);

const DONO = { ehDono: true, historiaId: 7 };
const noop = () => {};
const ESPADA = { slug: 'espada', nome: 'Espada Longa', grupo: 'Armas', categoria_equip: 'arma', grupo_armas: 'CM',
  descricao: 'Uma lâmina reta.', valor_latao: 100, dano: 12, maos_outras: 1 };
const FLECHA = { slug: 'pedra', nome: 'Pederneira', grupo: 'Ferramentas', descricao: 'Faísca.', valor_latao: 5 };

describe('bloqueioVenda — o porquê do ícone desativado', () => {
  it('item solto, dono, numa aventura: pode vender', () => {
    expect(bloqueio({ instanceId: 'a' }, DONO)).toBeNull();
  });
  it('quem não é o dono não vende', () => {
    expect(bloqueio({ instanceId: 'a' }, { ...DONO, ehDono: false })).toBe('nao_e_dono');
  });
  it('fora de uma aventura não há loja', () => {
    expect(bloqueio({ instanceId: 'a' }, { ...DONO, historiaId: null })).toBe('sem_historia');
    expect(label('sem_historia', false)).toMatch(/loja/);
  });
  it('equipado, vestido ou montado: tire antes', () => {
    expect(bloqueio({ instanceId: 'a', equipado: true }, DONO)).toBe('item_em_uso');
    expect(bloqueio({ instanceId: 'a', vestido: true }, DONO)).toBe('item_em_uso');
    expect(bloqueio({ instanceId: 'a', montado: true }, DONO)).toBe('item_em_uso');
  });
  it('recipiente com coisas dentro: esvazie antes', () => {
    expect(bloqueio({ instanceId: 'a' }, { ...DONO, temConteudo: true })).toBe('recipiente_com_itens');
  });
});

const abrir = (instance, cat, onVender) => render(
  <Modal
    instance={instance} catalogoBySlug={{ [cat.slug]: cat }} raca="Humano"
    slotsState={{}} todosItens={[instance]} containersDisponiveis={[]} pjsHistoria={[]}
    lang="pt" onClose={noop} onEquipar={noop} onDesequipar={noop} onUsar={noop}
    onDestruir={noop} onMoverParaContainer={noop} onTransferir={noop}
    onTransferReset={noop} onVestir={noop} onDespir={noop} onRemoverDoContainer={noop}
    onAbrirDetalhesFilho={noop} onVender={onVender} podeVender={DONO}
  />,
);

const centros = () => [...document.querySelectorAll('.venda-moedas .venda-moeda-centro')].map((c) => c.textContent);

describe('a etapa de publicar no modal do item', () => {
  it('Vender: quantidade e moedas no seletor da casa; preço de CADA um, no de tabela', async () => {
    const onVender = vi.fn(async () => ({ ok: true }));
    abrir({ instanceId: 'p1', slug: 'pedra', quantidade: 3 }, FLECHA, onVender);
    fireEvent.click(document.querySelector('[data-acao="vender"]'));
    expect(document.querySelector('.det-venda')).toBeTruthy();
    // sem campo de texto: só seletores (– N +) — 4 de moedas no corpo e o de
    // itens no centro do rodapé (27/09/2026)
    expect(document.querySelector('.det-venda input')).toBeNull();
    expect(document.querySelectorAll('.det-venda-linha .fp-pop-stepper')).toHaveLength(4);
    expect(document.querySelector('.ms-footer-center .fp-pop-stepper').textContent).toMatch(/3\s*de 3/);
    expect(centros()).toEqual(['0', '0', '0', '5']);   // 5 latão cada
    // Inline e só "Total" (27/09/2026): sem "preço de cada um".
    expect(document.querySelector('.det-venda-nota').textContent).toMatch(/^Total/);
    expect(document.querySelector('.det-venda').textContent).not.toMatch(/cada/);
    // + no latão: 6 cada
    const latao = document.querySelectorAll('.venda-moedas .fp-pop-stepper')[3];
    fireEvent.click(latao.querySelector('[aria-label="+"]'));
    expect(centros()).toEqual(['0', '0', '0', '6']);
    await act(async () => { fireEvent.click(document.querySelector('[data-publicar]')); });
    expect(onVender).toHaveBeenCalledWith('p1', 3, 6);
  });

  it('sem títulos (Preço, Valor de tabela); Cancelar e Pôr à venda no rodapé', () => {
    abrir({ instanceId: 'e1', slug: 'espada', quantidade: 1 }, ESPADA, vi.fn());
    fireEvent.click(document.querySelector('[data-acao="vender"]'));
    expect(document.body.textContent).not.toMatch(/Valor de tabela|Preço/);
    expect([...document.querySelectorAll('.ms-footer button')].map((x) => x.textContent)).toEqual(['Cancelar', 'Pôr à venda']);
    expect(document.querySelector('.det-venda button[data-publicar]')).toBeNull();
  });

  it('equipável vai inteiro, sem stepper; clicar de novo em Vender fecha', () => {
    abrir({ instanceId: 'e1', slug: 'espada', quantidade: 1 }, ESPADA, vi.fn());
    const vender = document.querySelector('[data-acao="vender"]');
    fireEvent.click(vender);
    expect(document.querySelector('.det-venda .qtd-de-max')).toBeNull();
    fireEvent.click(vender);
    expect(document.querySelector('.det-venda')).toBeNull();
  });

  it('a recusa do servidor vira texto', async () => {
    abrir({ instanceId: 'e1', slug: 'espada', quantidade: 1 }, ESPADA, vi.fn(async () => ({ ok: false, motivo: 'recipiente_com_itens' })));
    fireEvent.click(document.querySelector('[data-acao="vender"]'));
    await act(async () => { fireEvent.click(document.querySelector('[data-publicar]')); });
    expect(document.querySelector('.det-venda .err-msg').textContent).toMatch(/Esvazie o recipiente/);
  });
});

const ANUNCIO = { id: 9, slug: 'espada', item_nome: 'Espada Longa', quantidade: 1, preco_latao: 1110,
  vendedor_nome: 'Victor Beaufort', vendedor_user_id: 'u-vendedor', vendedor_pj_id: 67 };
const abrirAnuncio = (extra) => render(
  <Anuncio anuncio={ANUNCIO} cat={ESPADA} lang="pt" onClose={noop} onComprar={noop} onRetirar={noop} {...extra} />,
);
const acoes = () => [...document.querySelectorAll('.ms-header [data-acao]')].map((b) => b.getAttribute('data-acao'));

describe('a janela do anúncio na loja', () => {
  it('mostra preço e vendedor em Características', () => {
    abrirAnuncio({ podeComprar: true });
    expect(document.body.textContent).toMatch(/Vendedor/);
    expect(document.body.textContent).toMatch(/Victor Beaufort/);
  });

  it('outro jogador: Comprar abre a etapa da loja, com Cancelar e Comprar no rodapé', () => {
    const onComprar = vi.fn();
    abrirAnuncio({ podeComprar: true, podeRetirar: false, onComprar, totalLatao: 5000, moedasHeld: { ouro: 5, prata: 0, cobre: 0, latao: 0 } });
    expect(acoes()).toEqual(['comprar']);
    fireEvent.click(document.querySelector('[data-acao="comprar"]'));
    expect(onComprar).not.toHaveBeenCalled();
    expect(document.querySelector('.loja-resumo')).toBeTruthy();
    expect([...document.querySelectorAll('.ms-footer button')].map((x) => x.textContent)).toEqual(['Cancelar', 'Comprar']);
    // 1110 não fecha com 5 ouros (sem troco): Comprar desativado
    expect(document.querySelector('.ms-footer [data-comprar]').disabled).toBe(true);
  });

  /* "Quantidade no anúncio" (27/09/2026): pode levar só parte; o preço é de cada um. */
  it('pilha anunciada: o seletor escolhe quantos e o total acompanha', () => {
    const onComprar = vi.fn();
    render(<Anuncio anuncio={{ ...ANUNCIO, slug: 'pedra', quantidade: 4, preco_latao: 100 }} cat={FLECHA} lang="pt"
      podeComprar onComprar={onComprar} onClose={noop} onRetirar={noop}
      totalLatao={1000} moedasHeld={{ ouro: 0, prata: 10, cobre: 0, latao: 0 }} />);
    fireEvent.click(document.querySelector('[data-acao="comprar"]'));
    expect(document.querySelector('.modal-loja .qtd-de-max').textContent).toMatch(/de 4/);
    fireEvent.click(document.querySelector('.modal-loja .fp-pop-stepper [aria-label="+"]'));
    expect(document.body.textContent).toMatch(/Total \(2\)/);
    fireEvent.click(document.querySelector('.ms-footer [data-comprar]'));
    expect(onComprar).toHaveBeenCalledWith(2);
  });

  it('o dono: só Retirar, também em dois cliques', () => {
    const onRetirar = vi.fn();
    abrirAnuncio({ podeComprar: false, podeRetirar: true, onRetirar });
    expect(acoes()).toEqual(['retirar']);
    fireEvent.click(document.querySelector('[data-acao="retirar"]'));
    fireEvent.click(document.querySelector('[data-acao="retirar"]'));
    expect(onRetirar).toHaveBeenCalledTimes(1);
  });

  it('o Mestre: Comprar (o item sai do jogo) e Retirar', () => {
    abrirAnuncio({ podeComprar: true, podeRetirar: true, compraDoMestre: true });
    expect(acoes()).toEqual(['comprar', 'retirar']);
  });

  it('todo motivo das RPCs tem texto', () => {
    for (const m of ['anuncio_encerrado', 'proprio_anuncio', 'moedas_nao_fecham', 'vendedor_sem_espaco_moedas']) {
      expect(window.motivoAnuncioLabel(m, 'pt')).not.toBe('Não foi possível concluir.');
    }
  });
});

describe('PrecoMoedasInput — ouro, prata, cobre e latão em latão', () => {
  it('começa decomposto e soma o que os seletores mudam', () => {
    let total = null;
    const { container } = render(<PrecoMoedasInput latao={1234} lang="pt" onChange={(v) => { total = v; }} />);
    expect([...container.querySelectorAll('.venda-moeda-centro')].map((c) => c.textContent)).toEqual(['1', '2', '3', '4']);
    const [ouro, prata] = container.querySelectorAll('.fp-pop-stepper');
    fireEvent.click(prata.querySelector('[aria-label="+"]'));
    expect(total).toBe(1000 + 300 + 30 + 4);
    fireEvent.click(ouro.querySelector('[aria-label="-"]'));
    expect(total).toBe(300 + 30 + 4);
    // zero é o piso
    expect(ouro.querySelector('[aria-label="-"]').disabled).toBe(true);
  });
});
