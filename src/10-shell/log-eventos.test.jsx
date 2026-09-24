/* ============================================================
   log-eventos.test.jsx — o que a mesa fica sabendo (15/09/2026)
   ============================================================
   "Adicione no log da mesa com destaque quando um personagem evoluir um
    estágio. Quando transferir e destruir um item." (usuário)

   Três eventos, dois lugares:
     • subir de estágio  → salvarExperiencia (11-ficha), tipo 'sistema' com
                           meta.destaque — a linha ganha moldura dourada na
                           gaveta. Morava no DarExperienciaModal
                           (08-personagens) até 17/09/2026, quando o modal saiu
                           e a experiência virou a barra clicável da ficha;
     • transferir item   → InventarioList, tipo 'item';
     • descartar item    → InventarioList e ficha, tipo 'item'.

   `sistema` é um dos tipos que registrar_evento_mesa aceita (magia, ataque,
   tecnica, item, teste, sistema, aviso) — não precisou mexer no banco.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './shell.jsx';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let MensagemEvento, linhaParaMensagem;
beforeAll(() => {
  MensagemEvento = window.MensagemEvento;
  linhaParaMensagem = window.linhaParaMensagem;
});
afterEach(cleanup);

describe('linha em destaque na gaveta', () => {
  const linha = (meta) => ({ id: 7, created_at: '2026-09-15T20:00:00Z', tipo: 'sistema', texto: 'Aldren alcançou o estágio 5!', meta });

  it('meta.destaque acende a linha e aceita ícone próprio', () => {
    expect(MensagemEvento, 'MensagemEvento precisa estar no window').toBeTypeOf('function');
    const msg = linhaParaMensagem(linha({ destaque: true, icone: 'ti-star' }), 'pt');
    expect(msg).toMatchObject({ destaque: true, icone: 'ti-star' });
    const { container } = render(<div className="menestrel-ui cm-root"><MensagemEvento msg={msg} /></div>);
    const el = container.querySelector('.cm-msg');
    expect(el.classList.contains('cm-msg--destaque')).toBe(true);
    expect(el.querySelector('.ti-star')).toBeTruthy();
  });

  it('evento comum segue sem destaque', () => {
    const msg = linhaParaMensagem(linha({}), 'pt');
    expect(msg.destaque).toBe(false);
    const { container } = render(<div className="menestrel-ui cm-root"><MensagemEvento msg={msg} /></div>);
    expect(container.querySelector('.cm-msg--destaque')).toBeNull();
  });

  it('ícone fora do formato do Tabler é ignorado', () => {
    expect(linhaParaMensagem(linha({ icone: '<script>' }), 'pt').icone).toBeNull();
  });
});

/* Quem GRAVA os eventos vive em telas que só montam com banco (a ficha e o
   inventário inteiros). O que estes testes travam é o contrato: o evento é
   disparado no caminho certo, com o tipo certo. */
describe('os eventos são gravados onde a ação acontece', () => {
  const fonte = (p) => readFileSync(resolve(raiz, p), 'utf8');

  it('subir de estágio grava evento de sistema EM DESTAQUE', () => {
    const src = fonte('11-ficha/ficha.jsx');
    const i = src.indexOf('const salvarExperiencia = async');
    expect(i, 'o disparo tem que ficar no salvar da experiência').toBeGreaterThan(0);
    const trecho = src.slice(i, src.indexOf('\n  };', i));
    expect(trecho).toMatch(/registrarEventoMesa\('sistema'/);
    expect(trecho).toMatch(/destaque: true/);
    expect(trecho).toMatch(/estagio_para/);
    // Só sobe: descer de estágio não vira festa.
    expect(trecho).toMatch(/estDepois > estAntes/);
    expect(trecho).not.toMatch(/estDepois < estAntes/);
  });

  it('transferir item grava evento de item, com o destinatário', () => {
    const src = fonte('07-inventario/inventario.jsx');
    const i = src.indexOf('const transferirItem = async');
    const trecho = src.slice(i, src.indexOf('return { ok: true };', i));
    expect(trecho).toMatch(/registrarEventoMesa\('item'/);
    expect(trecho).toMatch(/acao: 'transferir'/);
    expect(trecho).toMatch(/destino_nome/);
  });

  it('descartar grava evento de item nas DUAS telas', () => {
    const inv = fonte('07-inventario/inventario.jsx');
    const iInv = inv.indexOf('const destruirItem = (');
    expect(inv.slice(iInv, iInv + 900)).toMatch(/acao: 'descartar'/);

    const ficha = fonte('11-ficha/ficha.jsx');
    const iFicha = ficha.indexOf('const destruirItemFicha = (');
    expect(ficha.slice(iFicha, iFicha + 1400)).toMatch(/acao: 'descartar'/);
  });

  it('o descarte lê o item ANTES de remover — senão não há nome para o texto', () => {
    const inv = fonte('07-inventario/inventario.jsx');
    const i = inv.indexOf('const destruirItem = (');
    const trecho = inv.slice(i, i + 1200);
    expect(trecho.indexOf('registrarEventoMesa')).toBeLessThan(trecho.indexOf('setInv('));
  });
});
