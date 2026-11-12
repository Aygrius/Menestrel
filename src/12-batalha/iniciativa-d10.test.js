/* ============================================================
   iniciativa-d10.test.js — o d10 da iniciativa extra (11/11/2026)
   ============================================================
   Usuário: "No momento de iniciar o combate, no seletor de iniciativa extra
   (1 a 9), vamos mudar de (1 a 10) e adicionar para o mestre rodar o dado
   para os inimigos e o jogador para rodar o dado para seu personagem."
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';

const W = window;
const aqui = dirname(fileURLToPath(import.meta.url));
const fonte = readFileSync(resolve(aqui, 'batalha.jsx'), 'utf8');
const pers = readFileSync(resolve(aqui, '../08-personagens/personagens.jsx'), 'utf8');

const orc = (inst) => ({ tipo: 'criatura', ref_id: 7, inst_id: inst, nome: 'Orc' });
const lobo = { tipo: 'criatura', ref_id: 9, inst_id: 'l1', nome: 'Lobo' };
const pj = { tipo: 'pj', ref_id: 3, nome: 'Lia' };
const animalDaLia = { tipo: 'criatura', ref_id: 11, inst_id: 'a1', nome: 'Falcão', dono_pj: 3 };
const aliado = { tipo: 'criatura', ref_id: 12, inst_id: 'x1', nome: 'Guarda', lado: 'aliados' };

describe('a montagem: duas colunas, só o dado', () => {
  /* 11/11/2026, usuário: "teremos uma coluna para jogadores e uma coluna para
     criaturas, e não teremos mais os botões de 1 a 10, apenas o dado". */
  it('o teto do bônus é 10, e os botões de 1 a 10 saíram', () => {
    expect(W.MotorBatalha.BONUS_INICIATIVA_MAX).toBe(10);
    expect(fonte).not.toMatch(/batalha-ini-bola/);
    expect(fonte).not.toMatch(/ti-hexagon-number-/);
  });
  it('Jogadores e Criaturas, cada um na sua coluna', () => {
    expect(fonte).toMatch(/className="batalha-ini-colunas"/);
    expect(fonte).toMatch(/aria-label=\{isEn \? 'Players' : 'Jogadores'\}/);
    expect(fonte).toMatch(/aria-label=\{isEn \? 'Creatures' : 'Criaturas'\}/);
    expect(fonte).toMatch(/const doLadoJogador = \(p\) => p\.tipo === 'pj' \|\| p\.dono_pj != null;/);
  });
  it('sem o botão "Rolar todas" na coluna de criaturas (11/11/2026)', () => {
    expect(fonte).not.toMatch(/'Roll all' : 'Rolar todas'/);
    expect(fonte).not.toMatch(/batalha-ini-rolar-todas/);
  });
  it('rolarIniciativaDosInimigos (no motor) rola as criaturas do Mestre, aliadas também', () => {
    const lista = [orc('o1'), aliado, animalDaLia, pj];
    const saida = W.rolarIniciativaDosInimigos(lista, () => 5, W.criaturaDoMestre);
    expect(saida.map((p) => p.bonus_iniciativa)).toEqual([5, 5, undefined, undefined]);
  });
  it('o d10 sai sempre entre 1 e 10', () => {
    const vistos = new Set();
    for (let i = 0; i < 500; i += 1) vistos.add(W.rolarD10());
    expect(Math.min(...vistos)).toBe(1);
    expect(Math.max(...vistos)).toBe(10);
  });
});

describe('o Mestre rola para os inimigos', () => {
  it('inimigo é a criatura sem dono do lado de lá', () => {
    expect(W.ehInimigoDoMestre(orc('o1'))).toBe(true);
    expect(W.ehInimigoDoMestre(pj)).toBe(false);
    expect(W.ehInimigoDoMestre(animalDaLia)).toBe(false);
    expect(W.ehInimigoDoMestre(aliado)).toBe(false);
  });
  it('um d10 por tipo, e o personagem fica como estava', () => {
    const lista = [orc('o1'), orc('o2'), lobo, { ...pj, bonus_iniciativa: 4 }, animalDaLia];
    let n = 0;
    const saida = W.rolarIniciativaDosInimigos(lista, () => { n += 1; return n === 1 ? 6 : 9; });
    expect(n).toBe(2);                                  // orc e lobo: dois tipos, dois dados
    expect(saida.map((p) => p.bonus_iniciativa)).toEqual([6, 6, 9, 4, undefined]);
  });
});

describe('o Jogador rola para o personagem dele', () => {
  it('a ficha acha a batalha também na montagem, e a montagem abre a tela do d10', () => {
    expect(pers.match(/\.in\('estado', \['setup', 'ativa'\]\)/g)).toHaveLength(2);
    expect(pers).toMatch(/batalhaAtiva\.estado === 'setup' && Preparo/);
    expect(typeof W.BatalhaPreparoJogador).toBe('function');
  });
  it('quem sorteia é o servidor, e o dado só assenta no número que voltou', () => {
    expect(fonte).toMatch(/rpc\('rolar_iniciativa_jogador'/);
    expect(fonte).toMatch(/dadoRef\.current\.roll\(v\)/);
  });
});

describe('restaurar no treino', () => {
  /* 11/11/2026, usuário: "Adicione um botão no modo treino para restaurar EF, EH, AR e KA". */
  it('EF, EH, AR e KA voltam ao máximo; o resto fica', () => {
    const [a, b] = W.restaurarPoolsDoTreino([
      { nome: 'Lia', ef: 3, ef_max: 20, eh: 0, eh_max: 15, res: 2, res_max: 10, karma: 1, karma_max: 8, status: 'desmaiado' },
      { nome: 'Orc', ef: 4, ef_max: 12, eh: 1, eh_max: 6 },
    ]);
    expect(a).toMatchObject({ ef: 20, eh: 15, res: 10, karma: 8, status: 'desmaiado' });
    expect(b).toMatchObject({ ef: 12, eh: 6 });
    expect(b.res).toBeUndefined();
  });
  it('o botão só existe na batalha de treino', () => {
    expect(fonte).toMatch(/\{batalha\.treinamento && \(\s*<button type="button" className="mc-acao" data-acao="restaurar"/);
  });
});

describe('o passe da ação', () => {
  it('"Custo" virou "Pontos de ação", só com o número; o karma tem a célula dele', () => {
    expect(fonte).toMatch(/\['custo', isEn \? 'Action points' : 'Pontos de ação', custoPA\]/);
    expect(fonte).toMatch(/custoKA > 0 \? \['karma', 'Karma', custoKA\] : null/);
    expect(fonte).not.toMatch(/isEn \? 'Cost' : 'Custo'/);
  });
});
