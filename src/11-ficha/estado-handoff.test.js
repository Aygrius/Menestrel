/* ============================================================
   estado-handoff.test.js — Ficha ↔ Inventário não podem divergir
   ============================================================
   Bug que motivou o arquivo (auditoria 01/09/2026):

   A Ficha embute o InventarioList (aba "Inventário"). Os dois gravam em
   personagens.estado_atual, cada um com seu debounce e sua cópia:

     Ficha           salvarEstadoAtual, 400ms, estado = pj.estado_atual
     InventarioList  autosave de estadoAtual, 450ms, semeado no mount

   Pro INVENTÁRIO isso já era resolvido: o InventarioList avisa a Ficha por
   `onInventarioChange`, e ela atualiza pj.inventario. Pro ESTADO não havia
   equivalente — e a Ficha carrega `pj` uma vez por pjAtivoId, sem refetch ao
   trocar de aba. Bastava:

     1. usar um item na aba Inventário (InventarioList grava estado_atual);
     2. voltar pra ficha — pj.estado_atual continua o do carregamento inicial;
     3. o Mestre ajustar qualquer barra — aplicarEstado espalha esse valor
        velho e APAGA o efeito do item.

   As abas nunca ficam montadas ao mesmo tempo (são exclusivas no fpTab), então
   o que se precisa não é binding bidirecional vivo: é um HANDOFF nas duas
   pontas — quem sai avisa o valor novo, quem entra recebe a semente.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const ficha = readFileSync(resolve(aqui, 'ficha.jsx'), 'utf8');
const inventario = readFileSync(resolve(aqui, '../07-inventario/inventario.jsx'), 'utf8');

// Trecho do JSX que monta o InventarioList dentro da Ficha.
const montagem = (() => {
  const i = ficha.indexOf('<InventarioList');
  expect(i, 'a Ficha precisa montar o InventarioList').toBeGreaterThan(-1);
  return ficha.slice(i, ficha.indexOf('/>', i) + 2);
})();

describe('handoff de estado_atual entre Ficha e Inventário', () => {
  it('a Ficha recebe de volta o estado alterado no Inventário', () => {
    // Sem isto, pj.estado_atual fica congelado no carregamento inicial e a
    // próxima gravação da Ficha apaga o que o Inventário fez.
    expect(montagem).toMatch(/onEstadoChange=/);
    expect(montagem).toMatch(/estado_atual:/);
  });

  it('a Ficha entrega o estado atual como semente ao Inventário', () => {
    // Fecha o outro sentido: trocar pra aba Inventário dentro dos 400ms do
    // debounce da Ficha faria o InventarioList ler do banco um valor que a
    // Ficha ainda não gravou.
    expect(montagem).toMatch(/estadoAtualSeed=/);
  });

  it('o InventarioList aceita as duas pontas do handoff', () => {
    const assinatura = inventario.slice(
      inventario.indexOf('function InventarioList('),
      inventario.indexOf(')', inventario.indexOf('function InventarioList(')) + 1
    );
    expect(assinatura).toMatch(/onEstadoChange/);
    expect(assinatura).toMatch(/estadoAtualSeed/);
  });

  it('estado e inventário avisam o pai da MESMA forma (simetria)', () => {
    // O inventário já fazia certo; o estado copiou o padrão. Se um dia alguém
    // remover um dos dois avisos, este teste cai junto.
    expect(inventario).toMatch(/if \(onInventarioChange\) onInventarioChange\(inv\)/);
    expect(inventario).toMatch(/if \(onEstadoChange\) onEstadoChange\(estadoAtual\)/);
  });

  it('a semente só vale pro PJ fixo — num seletor seria o PJ errado', () => {
    // InventarioList também roda solto, com abas de vários PJs (quando não há
    // pjIdFixo). Aplicar ali a semente da Ficha misturaria os personagens.
    expect(inventario).toMatch(/pjIdFixo[\s\S]{0,120}?estadoAtualSeed|estadoAtualSeed[\s\S]{0,160}?pjIdFixo/);
  });
});
