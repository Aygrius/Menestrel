/* ============================================================
   efeitos-apos-gravar.test.js — auditoria 13/11/2026, item 9
   ============================================================
   A flecha, a ação do veneno da arma, o pergaminho, o item da aba Item e os
   avisos à mesa saíam ANTES de gravar a batalha. Se a gravação falhasse
   (nao_e_sua_vez, cortina, rede), o item já tinha ido e a mesa lia um golpe
   que não aconteceu. Agora a ação enfileira (aposGravar) e o persistir — do
   Mestre e do Jogador — só roda a fila com o OK do banco.
   Usuário, 14/11/2026: "Não podemos nos esquecer das flechas, etc."
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import './batalha.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; expect(M.rodarEfeitosDaAcao).toBeTypeOf('function'); });

const fonte = fs.readFileSync(path.resolve(__dirname, 'batalha.jsx'), 'utf8');
const corpoDe = (inicio, fim) => {
  const i = fonte.indexOf(inicio);
  expect(i, inicio).toBeGreaterThan(-1);
  return fonte.slice(i, fonte.indexOf(fim, i + inicio.length));
};

describe('rodarEfeitosDaAcao', () => {
  it('roda na ordem, e um que estoura não impede os outros', () => {
    const feitos = [];
    M.rodarEfeitosDaAcao([() => feitos.push(1), () => { throw new Error('x'); }, () => feitos.push(3)]);
    expect(feitos).toEqual([1, 3]);
  });
  it('lista vazia ou ausente não quebra', () => {
    expect(() => M.rodarEfeitosDaAcao(null)).not.toThrow();
  });
});

describe.each([
  ['Mestre', 'const persistir = async (campos, locais) => {', 'onAtualizado && onAtualizado();'],
  ['Jogador', 'const persistJogador = async (campos, opcoes) => {', 'if (!manterAberto) setAcaoOpen(false);'],
])('o persistir do %s', (_quem, inicio, fim) => {
  const corpo = corpoDe(inicio, fim);
  it('toma a fila da ação logo no começo (síncrono, antes de qualquer await)', () => {
    const tomou = corpo.indexOf('efeitosDaAcao.current = [];');
    expect(tomou).toBeGreaterThan(0);
    expect(tomou).toBeLessThan(corpo.indexOf('await'));
  });
  it('roda a fila só DEPOIS de conferir o erro da gravação', () => {
    const roda = corpo.indexOf('rodarEfeitosDaAcao(efeitos)');
    const ultimoReturnFalse = corpo.lastIndexOf('return false;');
    expect(roda).toBeGreaterThan(ultimoReturnFalse);
  });
  it('a fuga do bando e a evocação quebrada também esperam', () => {
    expect(corpo).toMatch(/efeitos\.push\(\(\) => avisarFugaNaMesa/);
    expect(corpo).toMatch(/quebras\.eventos\.forEach\(\(ev\) => efeitos\.push/);
  });
});

describe('nenhuma ação consome nem avisa antes de gravar', () => {
  const handlers = [
    ['const aplicarAcao = (payload) => {', '/* MAGIA DE 1 RODADA — a guarda'],
    ['const guardarPendente = (atorIdx', '// A pendente perdeu o alvo'],
    ['const aplicarTeste = (payload) => {', 'const aplicarItem = (payload) => {'],
    ['const aplicarItem = (payload) => {', 'const aplicarApoio = (payload) => {'],
    ['const aplicarApoio = (payload) => {', 'const novaRodada = '],
    ['const novaRodada = ', 'const passarVez = '],
    ['const handleAcao = (payload) => {', '/* Largada da canalização ofensiva (lado Jogador)'],
    ['const handleTeste = (payload) => {', 'const handleItem = (payload) => {'],
    ['const handleItem = (payload) => {', '// ── Passar a vez'],
    ['const handleApoio = (payload) => {', 'const moverNoTabuleiroJogador = '],
    ['const handlePassar = () => {', 'const nomeStatus = '],
  ];
  it.each(handlers)('%s', (inicio, fim) => {
    const corpo = corpoDe(inicio, fim);
    // Toda chamada de consumo ou de aviso está dentro de aposGravar(() => …).
    const soltos = [];
    const re = /(consumirItemDaMagia|gastarMunicaoEVeneno|consumirItemDoPJ|supabaseClient\.rpc\('registrar_evento_mesa'|textoPassoDeApoioComCura)\(/g;
    let m;
    while ((m = re.exec(corpo))) {
      const antes = corpo.slice(Math.max(0, m.index - 20), m.index);
      // textoPassoDeApoioComCura(...).then(rpc...) — o rpc vem depois dele, dentro do mesmo aposGravar.
      if (/aposGravar\(\(\) => $/.test(antes)) continue;
      if (/\.then\(\(texto\) => $/.test(antes)) continue;
      soltos.push(m[1]);
    }
    expect(soltos).toEqual([]);
  });

  it('a flecha e o veneno da arma: os dois lados', () => {
    expect((fonte.match(/aposGravar\(\(\) => gastarMunicaoEVeneno\(atirador, arma, catalogos\)\)/g) || []).length).toBe(2);
  });
  it('o item da aba Item: os dois lados', () => {
    expect((fonte.match(/aposGravar\(\(\) => consumirItemDoPJ\(/g) || []).length).toBe(2);
  });
});
