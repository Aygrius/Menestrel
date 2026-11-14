/* ============================================================
   uma-acao-por-vez.test.js — auditoria 13/11/2026, item 8
   ============================================================
   Na mesa do Jogador não há update local: o painel fica aberto com a mesa
   velha até a gravação voltar. Nessa janela um segundo clique — ou o clique
   somado à aplicação automática depois do dado — rodava o handler de novo, e
   o item saía duas vezes do inventário. criarTravaDeAcao segura a segunda
   chamada até a gravação da primeira terminar.
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
beforeAll(() => { M = window.MotorBatalha; expect(M.criarTravaDeAcao).toBeTypeOf('function'); });

// Uma fila como a da mesa: cada "gravação" troca a promessa, de forma síncrona.
function mesa() {
  const f = { atual: Promise.resolve(), liberar: null };
  f.gravar = () => { f.atual = new Promise((r) => { f.liberar = r; }); };
  return f;
}

describe('criarTravaDeAcao', () => {
  it('o segundo clique, com a gravação do primeiro em voo, é ignorado', () => {
    const f = mesa();
    const trava = M.criarTravaDeAcao(() => f.atual);
    let usos = 0;
    const usarItem = trava(() => { usos += 1; f.gravar(); });
    usarItem(); usarItem();
    expect(usos).toBe(1);
  });

  it('a gravação terminou: a próxima ação passa', async () => {
    const f = mesa();
    const trava = M.criarTravaDeAcao(() => f.atual);
    let usos = 0;
    const usarItem = trava(() => { usos += 1; f.gravar(); });
    usarItem();
    f.liberar();
    await f.atual; await Promise.resolve();
    usarItem();
    expect(usos).toBe(2);
  });

  it('a trava é uma por mesa: usar item segura também o ataque', () => {
    const f = mesa();
    const trava = M.criarTravaDeAcao(() => f.atual);
    const log = [];
    const usarItem = trava(() => { log.push('item'); f.gravar(); });
    const atacar = trava(() => { log.push('ataque'); f.gravar(); });
    usarItem(); atacar();
    expect(log).toEqual(['item']);
  });

  it('handler que recusou sem gravar solta na hora', () => {
    const f = mesa();
    const trava = M.criarTravaDeAcao(() => f.atual);
    let chamadas = 0;
    const recusa = trava(() => { chamadas += 1; });
    recusa(); recusa();
    expect(chamadas).toBe(2);
  });

  it('handler que estourou também solta', () => {
    const f = mesa();
    const trava = M.criarTravaDeAcao(() => f.atual);
    let chamadas = 0;
    const quebra = trava(() => { chamadas += 1; throw new Error('x'); });
    expect(() => quebra()).toThrow('x');
    expect(() => quebra()).toThrow('x');
    expect(chamadas).toBe(2);
  });
});

describe('a mesa do Jogador entrega os handlers travados (fonte)', () => {
  const fonte = fs.readFileSync(path.resolve(__dirname, 'batalha.jsx'), 'utf8');
  it('a trava lê a filaGravacao da mesa', () => {
    expect(fonte).toMatch(/const umaAcaoPorVez = React\.useMemo\(\(\) => criarTravaDeAcao\(\(\) => filaGravacao\.current\), \[\]\);/);
  });
  it.each(['onAplicar={umaAcaoPorVez(handleAcao)}', 'onAplicarTeste={umaAcaoPorVez(handleTeste)}',
    'onAplicarItem={umaAcaoPorVez(handleItem)}', 'onAplicarApoio={umaAcaoPorVez(handleApoio)}'])('%s', (trecho) => {
    expect(fonte).toContain(trecho);
  });
});
