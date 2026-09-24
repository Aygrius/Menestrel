/* ============================================================
   permissao-entrada-modal.test.jsx — o modal do botão de olho
   ============================================================
   "Do lado do botão de editar (lápis), vamos adicionar um botão de ver
    (olho), onde teremos um modal para permitir quem pode ver aquela entrada,
    na história selecionada." (usuário, 17/09/2026)

   O olho MUDOU DE FUNÇÃO nesta rodada: ele abria a ficha da entrada, e a
   ficha é o que a expansão da linha mostra agora. O olho é permissão.

   O que este teste guarda:

   1. Os três estados são EXCLUSIVOS (rádio, não caixas). O bug que isso
      previne é oferecer "ninguém" e "só a Thalia" marcados ao mesmo tempo —
      um estado que as colunas do banco não sabem representar (ver
      visibilidade-entrada.test.js).

   2. A lista de PJs só aparece em "alguns", e Salvar fica travado enquanto
      ela está vazia: "alguns" sem ninguém é "todos" disfarçado.

   3. Salvar entrega UM patch, não uma sequência de cliques. A versão
      anterior gravava por checkbox — marcar três PJs eram quatro idas ao
      banco, cada uma podendo falhar no meio.

   4. Sem protagonista nenhum na história, "alguns" não é oferecido: não há
      quem escolher, e um rádio que não faz nada é pior que rádio nenhum.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './diario.jsx';

let PermissaoEntradaModal;
beforeAll(() => {
  PermissaoEntradaModal = window.PermissaoEntradaModal;
  expect(PermissaoEntradaModal, 'PermissaoEntradaModal precisa estar no window').toBeTypeOf('function');
});
afterEach(cleanup);

const PROTAGONISTAS = [
  { id: 42, nome: 'Thalia' },
  { id: 87, nome: 'Yuldrous' },
];

const historia = (extra) => ({
  id: 3,
  criatura_ids: [], reino_ids: [], cidade_ids: [], npc_ids: [],
  lore_acesso_pj: {},
  ...extra,
});

const ENTRADA = { id: 'arissia-h3', tipo: 'npc', nome: 'Arissia' };

const montar = (props = {}) => render(
  <div className="menestrel-ui">
    <PermissaoEntradaModal
      entrada={ENTRADA}
      historia={historia()}
      protagonistas={PROTAGONISTAS}
      lang="pt"
      onClose={() => {}}
      onSalvar={() => {}}
      {...props}
    />
  </div>
);

const radios = () => [...document.querySelectorAll('input[type="radio"]')];
const radioDe = (valor) => document.querySelector(`input[type="radio"][value="${valor}"]`);
const marcado = () => (radios().find((r) => r.checked) || {}).value;
const botao = (re) => screen.getAllByRole('button').find(
  (b) => re.test(b.textContent) || re.test(b.getAttribute('aria-label') || '')
);
const salvar = () => botao(/Salvar/i);
const pjCheckboxes = () => [...document.querySelectorAll('.diario-liberar-lista input[type="checkbox"]')];

describe('é o modal do sistema', () => {
  it('usa ModalShell, com o nome da entrada no título', () => {
    montar();
    expect(document.querySelector('.ms-modal')).toBeTruthy();
    expect(document.querySelector('.ms-title').textContent).toContain('Arissia');
  });

  it('tem rodapé com Cancelar e Salvar', () => {
    montar();
    expect(document.querySelector('.ms-footer')).toBeTruthy();
    expect(botao(/Cancelar/i)).toBeTruthy();
    expect(salvar()).toBeTruthy();
  });
});

describe('os três estados são exclusivos', () => {
  it('são rádios, não caixas de seleção', () => {
    montar();
    expect(radios()).toHaveLength(3);
    expect(radios().map((r) => r.value)).toEqual(['ninguem', 'todos', 'alguns']);
    // Todos no MESMO grupo — sem isso dois ficariam marcáveis juntos.
    expect(new Set(radios().map((r) => r.name)).size).toBe(1);
  });

  it('abre no estado que a história já tem: ninguém', () => {
    montar();
    expect(marcado()).toBe('ninguem');
  });

  it('abre em "todos" quando está disponibilizada sem lista', () => {
    montar({ historia: historia({ npc_ids: ['arissia-h3'] }) });
    expect(marcado()).toBe('todos');
  });

  it('abre em "alguns" com os PJs certos já marcados', () => {
    montar({
      historia: historia({
        npc_ids: ['arissia-h3'],
        lore_acesso_pj: { 'npc:arissia-h3': [87] },
      }),
    });
    expect(marcado()).toBe('alguns');
    const marcados = pjCheckboxes().filter((c) => c.checked);
    expect(marcados).toHaveLength(1);
    expect(marcados[0].closest('label').textContent).toContain('Yuldrous');
  });
});

describe('a lista de PJs', () => {
  it('não aparece fora de "alguns"', () => {
    montar();
    expect(pjCheckboxes()).toHaveLength(0);
  });

  it('aparece ao escolher "alguns", com um item por protagonista', () => {
    montar();
    radioDe('alguns').click();
    expect(pjCheckboxes()).toHaveLength(2);
  });

  it('"alguns" sem ninguém marcado trava o Salvar', () => {
    montar();
    radioDe('alguns').click();
    expect(salvar().disabled).toBe(true);
    pjCheckboxes()[0].click();
    expect(salvar().disabled).toBe(false);
  });

  /* Sem protagonistas não há terceira opção: escolher "alguns" numa história
     sem PJs levaria a um Salvar travado para sempre, sem explicação. */
  it('sem protagonistas, "alguns" não é oferecido', () => {
    montar({ protagonistas: [] });
    expect(radios().map((r) => r.value)).toEqual(['ninguem', 'todos']);
  });
});

describe('Salvar entrega um patch só', () => {
  it('"todos" → entra na coluna, sem lista', () => {
    let recebido = null;
    montar({ onSalvar: (patch) => { recebido = patch; } });
    radioDe('todos').click();
    salvar().click();
    expect(recebido).toEqual({ npc_ids: ['arissia-h3'], lore_acesso_pj: {} });
  });

  it('"alguns" → entra na coluna e grava a lista', () => {
    let recebido = null;
    montar({ onSalvar: (patch) => { recebido = patch; } });
    radioDe('alguns').click();
    pjCheckboxes()[0].click();  // Thalia (42)
    salvar().click();
    expect(recebido).toEqual({
      npc_ids: ['arissia-h3'],
      lore_acesso_pj: { 'npc:arissia-h3': [42] },
    });
  });

  it('"ninguem" → sai da coluna e apaga a chave', () => {
    let recebido = null;
    montar({
      historia: historia({
        npc_ids: ['arissia-h3'],
        lore_acesso_pj: { 'npc:arissia-h3': [42] },
      }),
      onSalvar: (patch) => { recebido = patch; },
    });
    radioDe('ninguem').click();
    salvar().click();
    expect(recebido).toEqual({ npc_ids: [], lore_acesso_pj: {} });
  });

  it('desmarcar o último PJ volta a travar o Salvar', () => {
    montar({
      historia: historia({
        npc_ids: ['arissia-h3'],
        lore_acesso_pj: { 'npc:arissia-h3': [42] },
      }),
    });
    expect(salvar().disabled).toBe(false);
    pjCheckboxes().find((c) => c.checked).click();
    expect(salvar().disabled).toBe(true);
  });

  it('salvando trava os dois botões do rodapé', () => {
    montar({ salvando: true });
    expect(salvar().disabled).toBe(true);
    expect(botao(/Cancelar/i).disabled).toBe(true);
  });
});

describe('serve a criatura também, que é bigint', () => {
  it('lê e grava criatura_ids com número', () => {
    let recebido = null;
    montar({
      entrada: { id: 15, tipo: 'criatura', nome: 'Lobisomem' },
      historia: historia({ criatura_ids: [] }),
      onSalvar: (patch) => { recebido = patch; },
    });
    expect(marcado()).toBe('ninguem');
    radioDe('todos').click();
    salvar().click();
    expect(recebido.criatura_ids).toEqual([15]);
    expect(typeof recebido.criatura_ids[0]).toBe('number');
  });
});
