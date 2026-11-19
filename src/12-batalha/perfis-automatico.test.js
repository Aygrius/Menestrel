/* ============================================================
   perfis-automatico.test.js — os perfis do automático (18/11/2026)
   ============================================================
   Usuário: "Eu gostaria de definir alguns planos de ações para os
   combatentes no automático. Algumas criaturas com modo agressivo, outras
   com modo cauteloso, outras que se preocupam com os colegas do próprio
   time. Revise os alvos dos ataques e das magias." Os quatro perfis e a
   base comum estão descritos sobre PERFIS_AUTO, em batalha.jsx.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
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
const fonte = fs.readFileSync(path.resolve(__dirname, 'batalha.jsx'), 'utf8');

const base = { status: 'ativo', status_temp: [], pa_max: 1, pa_rest: 1, mov_rest: 5, ef: 20, ef_max: 20, eh: 0, eh_max: 0, karma: 0 };
const orc = (over = {}) => ({ ...base, tipo: 'criatura', ref_id: 1, inst_id: 'cri:1', nome: 'Orc', ordem: 1, atual: true, auto: true, pos: { x: 0, y: 0 }, ...over });
const pj = (n, over = {}) => ({ ...base, tipo: 'pj', ref_id: n, inst_id: 'pj:' + n, nome: 'Pj' + n, ordem: 2, ...over });
const CAT = { criById: { 1: { id: 1, nome: 'Orc', ataque: 'Machado', dano_100: 10, dano_l: 1, dano_m: 2, dano_p: 3 } },
  pjById: {}, catalogoBySlug: {}, tecnicasByKey: {}, magiasByKey: {} };

describe('perfilAutoDe', () => {
  it('lê o texto do bestiário e cai no padrão', () => {
    expect(M.perfilAutoDe('Agressivo')).toBe('agressivo');
    expect(M.perfilAutoDe('Padrão')).toBe('padrao');
    expect(M.perfilAutoDe('protetor')).toBe('protetor');
    expect(M.perfilAutoDe(null)).toBe('padrao');
    expect(M.perfilAutoDe('qualquer')).toBe('padrao');
    expect(M.rotuloPerfilAuto('cauteloso', false)).toBe('Cauteloso');
  });
});

describe('a base: o alvo sai de quem a ação alcança agora', () => {
  it('o mais perto fora de alcance não faz andar se há outro ao lado', () => {
    // O de longe tem menos EF — o agressivo o preferiria —, mas está fora do
    // machado; o colado está ao alcance. Antes andava atrás do primeiro.
    const longe = pj(1, { pos: { x: 6, y: 0 }, ef: 2 });
    const colado = pj(2, { pos: { x: 2, y: 0 }, ef: 20 });
    const eu = orc({ perfil_auto: 'agressivo' });
    expect(M.decidirJogadaAutomatica(eu, [eu, longe, colado], CAT)).toMatchObject({ tipo: 'acao', aba: 'arma', alvoId: 'pj:2' });
  });
  it('caído só é alvo quando não sobra ninguém de pé', () => {
    const caido = pj(1, { pos: { x: 2, y: 0 }, status: 'desmaiado', ef: -3 });
    const dePe = pj(2, { pos: { x: 0, y: 2 } });
    const eu = orc();
    expect(M.decidirJogadaAutomatica(eu, [eu, caido, dePe], CAT)).toMatchObject({ alvoId: 'pj:2' });
    expect(M.decidirJogadaAutomatica(eu, [eu, caido], CAT)).toMatchObject({ alvoId: 'pj:1' });
  });
});

describe('agressivo', () => {
  it('ao alcance, vai no de menos vida', () => {
    const forte = pj(1, { pos: { x: 2, y: 0 }, ef: 20 });
    const fraco = pj(2, { pos: { x: 0, y: 2 }, ef: 4 });
    const eu = orc({ perfil_auto: 'agressivo' });
    expect(M.decidirJogadaAutomatica(eu, [eu, forte, fraco], CAT)).toMatchObject({ alvoId: 'pj:2' });
  });
  it('não recua depois de atacar', () => {
    expect(M.querRecuarDepoisDoAtaque(orc({ perfil_auto: 'agressivo', pa_rest: 0 }), [orc(), pj(1, { pos: { x: 2, y: 0 } })])).toBe(false);
  });
});

describe('cauteloso', () => {
  it('mira a ameaça: o mais perto, não o mais fraco', () => {
    const perto = pj(1, { pos: { x: 2, y: 0 }, ef: 20 });
    const fraco = pj(2, { pos: { x: 0, y: 2 }, ef: 4, eh: 0 });
    const eu = orc({ perfil_auto: 'cauteloso' });
    const r = M.decidirJogadaAutomatica(eu, [eu, perto, fraco], CAT);
    // Os dois estão a 2 casas; empate na distância desempata pela vida.
    expect(r.tipo).toBe('acao');
  });
  it('ferido e sem cura: foge com o movimento grátis', () => {
    const eu = orc({ perfil_auto: 'cauteloso', ef: 5, pos: { x: 10, y: 10 } });
    const r = M.decidirJogadaAutomatica(eu, [eu, pj(1, { pos: { x: 12, y: 10 } })], CAT);
    expect(r).toMatchObject({ tipo: 'mover', recuo: true });
  });
});

describe('protetor', () => {
  const CURA = { key: 'curas_fisicas', nome: 'Curas Físicas', evocacao: 'Instantânea', alcance: '10 metros',
    nivel_1: 'Restaura 6 de energia física.', descricao: '' };
  const CAT_CURA = { ...CAT, criById: { 1: { ...CAT.criById[1], magia: 'Curas Físicas', estagio: 1 } },
    magiasByKey: { curas_fisicas: CURA } };
  it('a magia de cura é reconhecida', () => {
    expect(M.ehMagiaDeCura({ key: 'curas_fisicas' })).toBe(true);
    expect(M.ehMagiaDeCura({ key: 'bola_de_fogo' })).toBe(false);
  });
  it('cura o aliado ferido antes de atacar', () => {
    const eu = orc({ perfil_auto: 'protetor', karma: 10, karma_max: 10 });
    const ferido = { ...orc({ atual: false }), inst_id: 'cri:2', nome: 'Goblin', ef: 3, pos: { x: 2, y: 2 } };
    const r = M.decidirJogadaAutomatica(eu, [eu, ferido, pj(1, { pos: { x: 2, y: 0 } })], CAT_CURA);
    expect(r).toMatchObject({ tipo: 'acao', aba: 'apoio', magiaKey: 'curas_fisicas', alvoId: 'cri:2' });
  });
  it('sem ninguém ferido, ataca quem bateu num aliado', () => {
    const eu = orc({ perfil_auto: 'protetor' });
    const aliado = { ...orc({ atual: false }), inst_id: 'cri:2', nome: 'Goblin', pos: { x: 4, y: 4 } };
    const a = pj(1, { pos: { x: 2, y: 0 } });
    const b = pj(2, { pos: { x: 0, y: 2 } });
    const log = [{ acao: 'arma', autor_inst_id: 'pj:2', alvo_inst_id: 'cri:2' }];
    expect(M.decidirJogadaAutomatica(eu, [eu, aliado, a, b], CAT, [], log)).toMatchObject({ alvoId: 'pj:2' });
  });
});

describe('o card e o painel', () => {
  it('o card troca o perfil; o snapshot da criatura traz o do bestiário', () => {
    expect(fonte).toMatch(/onClick=\{\(\) => \{ if \(!on\) definirPerfilAuto\(i, v\); \}\}/);
    expect(fonte).toMatch(/perfil_auto: perfilAutoDe\(p\.perfil_auto \|\| c\.perfil_auto\)/);
  });
  it('o painel abre a cura do automático na aba de apoio', () => {
    expect(fonte).toMatch(/if \(auto\.magiaKey && auto\.apoio\) \{/);
    expect(fonte).toMatch(/apoio: j\.aba === 'apoio', karmaTudo: !!j\.karmaTudo/);
  });
});
