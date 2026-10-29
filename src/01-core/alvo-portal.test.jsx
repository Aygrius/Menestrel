/* ============================================================
   alvo-portal.test.jsx — o alvo de portal aparece depois
   ============================================================
   "Como mestre, quando eu clico no card de um personagem, aparece o botão de
   notificação sozinho no topo. Quando eu passo o mouse sob o menu lateral à
   esquerda, o trilho fica certo." (usuário, 28/10/2026)

   O sintoma inteiro cabe nessa segunda frase. O efeito antigo de
   `useAlvoPortal` não tinha dependências e rodava a cada render DE QUEM O
   USA — e só. O trilho da ficha nasce depois, com o personagem carregado, e a
   Central de Mensagens não renderiza nesse intervalo: o sino ficava no alvo
   de reserva até que qualquer outra coisa a fizesse renderizar. Passar o
   mouse na lateral muda a largura do menu, que é prop dela.

   Estes testes montam o buraco: um componente que só renderiza uma vez, e um
   alvo que entra no DOM depois — por fora do React, como é na vida real
   (outro componente o monta).
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor, act } from '@testing-library/react';
import './helpers.jsx';

let useAlvoPortal;
beforeAll(() => {
  useAlvoPortal = window.useAlvoPortal;
  expect(useAlvoPortal).toBeTypeOf('function');
});
afterEach(() => { cleanup(); document.body.innerHTML = ''; });

/* Conta os renders: o teste precisa provar que o alvo chega SEM que o
   componente tenha sido re-renderizado por fora. */
function Sonda({ id, aoAchar, renders }) {
  const alvo = useAlvoPortal(id);
  renders.push(alvo ? alvo.id : null);
  if (alvo && aoAchar) aoAchar(alvo);
  return <span data-achou={alvo ? 'sim' : 'nao'} />;
}

const achou = () => document.querySelector('[data-achou]').getAttribute('data-achou');

describe('useAlvoPortal', () => {
  it('acha o alvo que já está no DOM', () => {
    const el = document.createElement('div');
    el.id = 'trilho';
    document.body.appendChild(el);
    render(<Sonda id="trilho" renders={[]} />);
    expect(achou()).toBe('sim');
  });

  /* O CASO DO SINO: o alvo entra depois, e o componente NÃO renderiza de novo
     por conta própria. Antes de 28/10/2026 isto ficava em 'nao' para sempre. */
  it('acha o alvo que entra no DOM depois, sem precisar de outro render', async () => {
    const renders = [];
    render(<Sonda id="fp-acoes-ficha" renders={renders} />);
    expect(achou()).toBe('nao');

    await act(async () => {
      const el = document.createElement('div');
      el.id = 'fp-acoes-ficha';
      document.body.appendChild(el);
      // deixa o MutationObserver disparar
      await new Promise((r) => setTimeout(r, 0));
    });

    await waitFor(() => expect(achou()).toBe('sim'));
  });

  /* O caminho de volta: fechada a ficha, o trilho some e quem usa o alvo
     precisa saber — é o que faz o sino voltar para a reserva. */
  it('solta o alvo quando ele sai do DOM', async () => {
    const el = document.createElement('div');
    el.id = 'trilho';
    document.body.appendChild(el);
    render(<Sonda id="trilho" renders={[]} />);
    expect(achou()).toBe('sim');

    await act(async () => {
      el.remove();
      await new Promise((r) => setTimeout(r, 0));
    });
    await waitFor(() => expect(achou()).toBe('nao'));
  });

  /* Mutação que não muda o alvo não pode virar render: o observador olha o
     documento inteiro, e sem a comparação cada tecla digitada em qualquer
     campo redesenharia quem usa o hook. */
  it('mexer no DOM sem mexer no alvo não redesenha', async () => {
    const el = document.createElement('div');
    el.id = 'trilho';
    document.body.appendChild(el);
    const renders = [];
    render(<Sonda id="trilho" renders={renders} />);
    const antes = renders.length;

    await act(async () => {
      for (let i = 0; i < 5; i++) document.body.appendChild(document.createElement('span'));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(renders.length, 'o hook redesenhou sem o alvo ter mudado').toBe(antes);
  });
});
