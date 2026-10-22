/* treino-relogio.test.js — o relógio da mesa move a fila de treino (22/10/2026)
   Quando o Mestre avança o tempo, o laço que já aplica desgaste e
   recuperação por atividade também avança a fila de treino. A fila anda NO
   BANCO (RPC avancar_treinos, linha travada): gravar a coluna inteira daqui
   apagava a compra que o jogador fizesse entre a leitura e a escrita. A regra
   em si está em 01-core/treinos.test.js (espelho JS) e no script SQL; aqui
   trava a ligação. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const fonte = readFileSync('src/10-shell/shell.jsx', 'utf8').replace(/\r\n/g, '\n');

describe('laço do relógio', () => {
  it('chama a RPC avancar_treinos com o PJ, a atividade e as horas', () => {
    expect(fonte).toMatch(/rpc\('avancar_treinos', \{ p_pj_id: pj\.id, p_atividade: tipoAtividade, p_horas: horas \}\)/);
  });
  it('morto não treina, e PJ sem fila não chama a RPC', () => {
    expect(fonte).toMatch(/const treina = tipoAtividade && !morto && Array\.isArray\(pj\.treinos\) && pj\.treinos\.length > 0;/);
  });
  it('o update do estado NÃO regrava treinos, tecnicas nem magias', () => {
    expect(fonte).toMatch(/update\(\{ estado_atual: novo \}\)\.eq\('id', pj\.id\)/);
    expect(fonte).not.toMatch(/aplicarTreinoNoPj\(pj/);
  });
});
