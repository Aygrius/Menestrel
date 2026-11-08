/* ============================================================
   aviso-atualizacao.test.jsx — as boas-vindas com as novidades
   ============================================================
   Usuário (07/11/2026): "Quando um usuário logar no sistema, mostre um modal
   de aviso que o sistema foi atualizado, como boas vindas." Uma vez por
   versão e por usuário: depois do Começar, a mesma versão não volta.
   ============================================================ */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../10-shell/shell.jsx';

beforeEach(() => { try { localStorage.clear(); } catch (e) {} });
afterEach(cleanup);

const abrir = (userId = 'u1') => render(<window.AvisoDeAtualizacao userId={userId} nome="Ana" lang="pt" />);

describe('AvisoDeAtualizacao', () => {
  it('aparece na primeira entrada, com a saudação e as novidades', () => {
    abrir();
    expect(document.querySelector('.modal-novidades')).toBeTruthy();
    expect(document.body.textContent).toMatch(/O Menestrel foi atualizado/);
    expect(document.body.textContent).toMatch(/Que bom ter você de volta, Ana!/);
    expect(document.querySelectorAll('.novidades-linha').length).toBeGreaterThan(0);
  });

  it('Começar fecha e a mesma versão não volta para o mesmo usuário', () => {
    abrir();
    fireEvent.click(document.querySelector('.modal-novidades .ms-footer .btn-primary'));
    expect(document.querySelector('.modal-novidades')).toBeNull();
    expect(window.novidadesJaVistas('u1')).toBe(true);
    cleanup();
    abrir();
    expect(document.querySelector('.modal-novidades')).toBeNull();
  });

  it('outro usuário no mesmo navegador ainda vê', () => {
    abrir('u1');
    fireEvent.click(document.querySelector('.modal-novidades .ms-footer .btn-primary'));
    cleanup();
    abrir('u2');
    expect(document.querySelector('.modal-novidades')).toBeTruthy();
  });
});
