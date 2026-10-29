/* ============================================================
   compra-com-recheio.test.jsx — o lado do JOGADOR do pacote (29/10/2026)
   ============================================================
   "Torne possível vender itens na loja que tenham itens armazenados dentro
   deles, por exemplo uma algibeira sempre de moedas." (usuário)

   O painel do Mestre monta o pacote (06-historias/fileiras-e-conteudo-da-loja)
   e o comprar_item o entrega; aqui é o balcão: quem compra precisa VER o que
   vem dentro e pagar o preço do conjunto — nunca descobrir o recheio depois de
   pagar, nem levar 12 moedas de ouro pelo preço da bolsa.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../01-core/select-pill.jsx';
import './inventario.jsx';
import '../09-bestiario/ataques-criatura.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../09-bestiario/conhecido-jogador.jsx';
import '../09-bestiario/catalogo-descritores.jsx';
import '../09-bestiario/catalogo-editor.jsx';
import '../09-bestiario/bestiario.jsx';
import './loja.jsx';

window.UI = { ...window.UI, Input: (props) => <input {...props} /> };
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}

let Modal;
beforeAll(() => {
  Modal = window.CompraLojaModal;
  expect(Modal, 'CompraLojaModal precisa estar no window').toBeTypeOf('function');
});
afterEach(cleanup);

const ALGIBEIRA = {
  id: 'alg', slug: 'algibeira', nome: 'Algibeira', grupo: 'Vestimentas',
  tipo: 'S', tipo_item: 'Moedas', armazena: 2, ocupa: 0.2, valor_latao: 50,
};
const OURO = { id: 'ou', slug: 'moeda_ouro', nome: 'Moeda de Ouro', grupo: 'Moedas', tipo: 'S', ocupa: 0.01, valor_latao: 1000 };
const catBySlug = { algibeira: ALGIBEIRA, moeda_ouro: OURO };

function montar(entry) {
  return render(
    <Modal entry={entry} cat={ALGIBEIRA} catBySlug={catBySlug} lang="pt"
      totalLatao={999999} moedasHeld={[{ slug: 'moeda_latao', valor_latao: 1, quantidade: 999999 }]}
      livreS={99} livreL={99} recipientes={[]} comprando={false} erro={null}
      onConfirm={() => {}} onClose={() => {}} />
  );
}

const textoTodo = () => document.body.textContent.replace(/\s+/g, ' ');

describe('a janela de compra mostra o que vem dentro', () => {
  const comRecheio = {
    entryId: 'e1', slug: 'algibeira', estoque: 1, preco_latao_override: null,
    conteudo: [{ slug: 'moeda_ouro', quantidade: 12 }],
  };

  it('o recheio aparece no passe, antes de abrir a etapa de compra', () => {
    montar(comRecheio);
    expect(textoTodo()).toMatch(/Dentro/);
    expect(textoTodo()).toMatch(/12× Moeda de Ouro/);
  });

  /* 50 da algibeira + 12 × 1.000 do ouro. Se esta conta divergir do
     comprar_item, a vitrine anuncia um preço e o servidor cobra outro. */
  it('o preço é o do pacote, não o do recipiente vazio', () => {
    const { precoDaEntrada } = window;
    expect(precoDaEntrada(comRecheio, ALGIBEIRA, catBySlug)).toBe(12050);
    montar(comRecheio);
    /* No passe o preço é lido em moedas, não em latão: 12.050 vira
       "Ouro 12 · Cobre 5" (12 × 1.000 + 5 × 10). */
    expect(textoTodo()).toMatch(/Ouro12/);
    expect(textoTodo()).toMatch(/Cobre5/);
  });

  it('entrada sem recheio não inventa a linha "Dentro"', () => {
    montar({ entryId: 'e2', slug: 'algibeira', estoque: 1, preco_latao_override: null });
    expect(textoTodo()).not.toMatch(/Moeda de Ouro/);
  });
});
