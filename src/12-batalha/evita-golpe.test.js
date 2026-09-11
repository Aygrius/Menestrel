/* ============================================================
   evita-golpe.test.js — o único status consumido por EVENTO
   ============================================================
   Esquiva ("evita o golpe de 1 alvo por 1 rodada") é gasta pelo próximo
   golpe recebido, ou pelo fim da duração, o que vier primeiro. Todo o
   resto do status_temp expira só por tempo.

   `consome_em` é opcional: status sem ele não muda em nada.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/tecnicas-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; expect(M.consumirEvitaGolpe).toBeTypeOf('function'); });

const comEsquiva = () => ({
  inst_id: 'a', eh: 10, eh_max: 10, ar: 0, ar_max: 0, ef: 20, ef_max: 20, status: 'ativo',
  status_temp: [{ id: 'tec_esquiva', nome: 'Esquiva', icone: '🌀', rodadas_rest: 1,
    consome_em: 'golpe_recebido', efeito: { tipo: 'evita_golpe', valor: true } }],
});
const semNada = () => ({ inst_id: 'a', eh: 10, eh_max: 10, ar: 0, ar_max: 0, ef: 20, ef_max: 20, status: 'ativo', status_temp: [] });

describe('consumirEvitaGolpe', () => {
  it('evita o golpe e remove o status', () => {
    const r = M.consumirEvitaGolpe(comEsquiva());
    expect(r.evitou).toBe(true);
    expect(r.participante.status_temp).toHaveLength(0);
  });

  it('o segundo golpe da mesma rodada JÁ NÃO é evitado', () => {
    const r1 = M.consumirEvitaGolpe(comEsquiva());
    const r2 = M.consumirEvitaGolpe(r1.participante);
    expect(r2.evitou).toBe(false);
  });

  it('sem o status, não evita e devolve o mesmo objeto', () => {
    const p = semNada();
    const r = M.consumirEvitaGolpe(p);
    expect(r.evitou).toBe(false);
    expect(r.participante).toBe(p);
  });

  it('não toca status de outra origem', () => {
    const p = comEsquiva();
    p.status_temp.push({ id: 'fc_defesa', nome: 'Defesa −5', icone: '🛡️', rodadas_rest: null, efeito: { tipo: 'mod_defesa', valor: -5 } });
    const r = M.consumirEvitaGolpe(p);
    expect(r.participante.status_temp).toHaveLength(1);
    expect(r.participante.status_temp[0].id).toBe('fc_defesa');
  });
});

describe('expiração por tempo continua valendo', () => {
  it('se ninguém atacar, a Esquiva some na virada de rodada', () => {
    const p = comEsquiva();
    const { participante } = M.processarViradaDeRodada(p);
    expect(participante.status_temp).toHaveLength(0);
  });
});
