/* ============================================================
   magias-novas-cura.test.js — as magias de 10/11/2026
   ============================================================
   Usuário: "Não adicione Sopro de Vida e adicione a função de acordar aliado
   com cura, seja de EF ou EH. Adicione Purificação. Pode inserir Elo Vital.
   Pode inserir Peso de Selimon. Opção A de Espírito Felino." E as quatro
   curas propostas antes: Restauração Coletiva, Bênção de Plandis, Esplendor
   da Vida e Súplica à Ganis.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/magias-efeito.jsx';
import '../01-core/tecnicas-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; });

const pj = (over = {}) => ({ tipo: 'pj', ref_id: 1, inst_id: 'pj:1', nome: 'Lirael', status: 'ativo',
  ef: 10, ef_max: 20, eh: 10, eh_max: 30, karma: 10, karma_max: 10, vb: 10, pa_max: 1, pa_rest: 1,
  mov_rest: 5, status_temp: [], pos: { x: 5, y: 5 }, ...over });
const zz = { id: 'desmaio_ef:x', nome: 'Desmaiado', icone: '💤', rodadas_rest: 3, rodadas_total: 4, efeito: { tipo: 'desmaio_ef' } };
const caido = () => pj({ status: 'desmaiado', ef: -3, eh: 0, pa_rest: 0, status_temp: [zz] });

const MAGIA = (key, nome, nivel_1, extra = {}) => ({ key, nome, nivel: 1, catalogo: { key, nome, nivel_1, ...extra } });

describe('a cura acorda o desmaiado', () => {
  it('cura de EH: acorda na hora, sem o zz, com as ações da rodada, mesmo com a EF negativa', () => {
    const p = M.aplicarCuraPool(caido(), 'eh', 8);
    expect(p).toMatchObject({ status: 'ativo', eh: 8, ef: -3, desmaio_cumprido: true, pa_rest: 1 });
    expect(M.temDesmaioEf(p)).toBe(false);
  });
  it('cura de EF também acorda', () => {
    expect(M.aplicarCuraPool(caido(), 'ef', 4)).toMatchObject({ status: 'ativo', ef: 1 });
  });
  it('a poção que cura acorda', () => {
    // Texto real do catálogo (Elixir da Coragem I).
    const pocao = { efeito_positivo: 'Aumenta 10 de Energia Heroica.' };
    const p = (M.aplicarEfeitoItemSnapshot || window.aplicarEfeitoItemSnapshot)(caido(), pocao, 1);
    expect(p).toMatchObject({ eh: 10, status: 'ativo' });
  });
  it('a cura que não enche nada (poço cheio) não acorda; o morto não acorda', () => {
    const cheio = { ...caido(), eh: 30 };
    expect(M.aplicarCuraPool(cheio, 'eh', 5).status).toBe('desmaiado');
    expect(M.aplicarCuraPool({ ...caido(), status: 'morto' }, 'eh', 5).status).toBe('morto');
  });
  it('a magia de cura comum (Curas Heroicas) levanta o caído', () => {
    const p = M.aplicarEfeitoApoio(caido(), MAGIA('curas_heroicas', 'Curas Heroicas', 'Restaura 8 de energia heroica.'), 'pj:2');
    expect(p.status).toBe('ativo');
  });
});

describe('cura por rodada — Bênção de Plandis e Esplendor da Vida', () => {
  const plandis = MAGIA('bencao_de_plandis', 'Bênção de Plandis', 'Restaura 3 de energia heroica por rodada.', { duracao: '3 rodadas' });
  const esplendor = MAGIA('esplendor_da_vida', 'Esplendor da Vida', 'Restaura 2 de energia física por rodada.', { duracao: '3 rodadas' });
  it('vira um status com o valor e o poço', () => {
    const p = M.aplicarEfeitoApoio(pj(), plandis, 'pj:2');
    const s = p.status_temp.find((x) => x.efeito.tipo === 'cura_por_rodada');
    expect(s.efeito).toMatchObject({ valor: 3, pool: 'eh' });
    expect(s.rodadas_rest).toBe(3);
    expect(p.eh).toBe(10);                    // nada na hora
  });
  it('a cada virada enche o poço e conta para o log', () => {
    const p = M.aplicarEfeitoApoio(pj(), esplendor, 'pj:2');
    const r = M.processarViradaDeRodada(p);
    expect(r.participante.ef).toBe(12);
    expect(r.curas).toEqual([{ nome: 'Esplendor da Vida', valor: 2, pool: 'ef' }]);
  });
  it('na virada, acorda o caído', () => {
    const p = M.aplicarEfeitoApoio(caido(), plandis, 'pj:2');
    expect(M.processarViradaDeRodada(p).participante.status).toBe('ativo');
  });
  it('o log da virada diz quem recuperou', () => {
    const e = M.entradaLogViradaRodada([{ nome: 'Lirael', curou: 3, eventos: [{ nome: 'Bênção de Plandis', valor: 3 }] }], 2);
    expect(e.texto).toBe('Lirael recuperou 3 (Bênção de Plandis 3)');
  });
});

describe('Purificação', () => {
  const pur = (n) => MAGIA('purificacao', 'Purificação',
    `Informa se algo é impróprio. Em batalha, remove ${n} efeito${n > 1 ? 's negativos' : ' negativo'} do alvo.`);
  const veneno = { id: 'envenenado:1', nome: 'Envenenado', rodadas_rest: 3, efeito: { tipo: 'dano_por_rodada', valor: 2 } };
  const ruido = { id: 'mag_ruido', nome: 'Ruído', rodadas_rest: 3, efeito: { tipo: 'mod_ataque', valor: -2 } };
  const bencao = { id: 'mag_bencao', nome: 'Bênção', rodadas_rest: 3, efeito: { tipo: 'mod_ataque', valor: 1 } };
  it('o leitor entende "remove N efeitos negativos"', () => {
    expect(window.efeitosNoNivel({ nivel_1: 'Em batalha, remove 3 efeitos negativos do alvo.' }, 1).purificar).toBe(3);
  });
  it('tira os negativos, na ordem, até o número do nível; o positivo e o zz ficam', () => {
    const alvo = pj({ status_temp: [zz, bencao, veneno, ruido] });
    const um = M.aplicarEfeitoApoio(alvo, pur(1), 'pj:2');
    expect(um.status_temp.map((s) => s.nome)).toEqual(['Desmaiado', 'Bênção', 'Ruído']);
    const dois = M.aplicarEfeitoApoio(alvo, pur(2), 'pj:2');
    expect(dois.status_temp.map((s) => s.nome)).toEqual(['Desmaiado', 'Bênção']);
  });
  it('não deixa status próprio', () => {
    const p = M.aplicarEfeitoApoio(pj({ status_temp: [veneno] }), pur(1), 'pj:2');
    expect(p.status_temp).toEqual([]);
  });
});

describe('Elo Vital — a EF que o alvo perde volta para quem lançou', () => {
  it('fura a EH e cura a EF do conjurador na mesma quantia', () => {
    const conj = pj({ ef: 5 });
    const orc = { tipo: 'criatura', ref_id: 9, inst_id: 'cri:9', nome: 'Orc', status: 'ativo', ef: 20, ef_max: 20, eh: 15, eh_max: 15, res: 0, status_temp: [] };
    const [c, o] = M.aplicarGolpeEmAlvo([conj, orc], 0, 1, 6, false, null, 'ef', true);
    const perdeu = 20 - o.ef;
    expect(o.eh).toBe(15);
    expect(perdeu).toBeGreaterThan(0);
    expect(c.ef).toBe(Math.min(20, 5 + perdeu));
  });
});

describe('até N alvos — Restauração Coletiva, Súplica à Ganis, Espírito Felino, Peso de Selimon', () => {
  const sac = pj({ inst_id: 'pj:1', nome: 'Sacerdote', ef: 20, eh: 30, pos: { x: 0, y: 0 } });   // inteiro: fica de fora
  const a = pj({ inst_id: 'pj:2', ref_id: 2, nome: 'A', ef: 18, pos: { x: 1, y: 0 } });     // perdeu pouco
  const b = pj({ inst_id: 'pj:3', ref_id: 3, nome: 'B', ef: 2, pos: { x: 3, y: 0 } });      // perdeu muito
  const c = pj({ inst_id: 'pj:4', ref_id: 4, nome: 'C', ef: 10, pos: { x: 2, y: 0 } });
  const longe = pj({ inst_id: 'pj:5', ref_id: 5, nome: 'Longe', ef: 1, pos: { x: 40, y: 0 } });
  const orc = { tipo: 'criatura', ref_id: 9, inst_id: 'cri:9', nome: 'Orc', status: 'ativo', ef: 1, ef_max: 20, eh: 0, eh_max: 0, pos: { x: 1, y: 1 }, status_temp: [] };
  const arr = [sac, a, b, c, longe, orc];
  const rest = { key: 'restauracao_coletiva', nome: 'Restauração Coletiva', nivel: 1,
    catalogo: { key: 'restauracao_coletiva', alcance: '25 metros', evocacao: 'Instantânea', nivel_1: 'Restaura 4 de energia heroica.' } };

  it('o escolhido e mais dois aliados no alcance, os mais feridos primeiro; o inimigo e o longe ficam de fora', () => {
    const ex = M.extrasDoApoio(arr, 0, 1, rest, rest.catalogo);
    expect(ex.map((i) => arr[i].nome)).toEqual(['B', 'C']);
  });
  it('o passo de apoio aplica em todos e conta quem foi', () => {
    const r = M.passoDeApoio(arr, 0, 1, rest, 2, false, false, false);
    expect(r.atingidos).toEqual(['A', 'B', 'C']);
    expect(r.participantes.map((p) => p.eh)).toEqual([30, 14, 14, 14, 10, 0]);
  });
  it('Peso de Selimon pega até três do lado do alvo (os inimigos)', () => {
    const orc2 = { ...orc, inst_id: 'cri:8', ref_id: 8, nome: 'Orc 2', pos: { x: 2, y: 1 } };
    const peso = { key: 'peso_de_selimon', nome: 'Peso de Selimon', nivel: 1,
      catalogo: { key: 'peso_de_selimon', alcance: '25 metros', nivel_1: 'Reduz 3 de velocidade.' } };
    const todos = [...arr, orc2];
    const ex = M.extrasDoApoio(todos, 0, 5, peso, peso.catalogo);
    expect(ex.map((i) => todos[i].nome)).toEqual(['Orc 2']);
  });
  it('sem tabuleiro, só o escolhido', () => {
    const semPos = arr.map((p) => ({ ...p, pos: null }));
    expect(M.extrasDoApoio(semPos, 0, 1, rest, rest.catalogo)).toEqual([]);
  });
});
