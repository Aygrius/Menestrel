/* ============================================================
   card-numeros.test.jsx — números do card na fileira das ações
   ============================================================
   "Quero melhorar o card de ações dos combatentes. Os ícones PA, velocidade,
   etc ficam inline com os botões mover, ação, etc. Padronize esses ícones.
   Remova os ícones de velocidade, defesa, etc, e use os números de
   ti-number-50-small." (usuário, 13/09/2026)

   Mesma técnica de card-jogador.test.jsx: renderiza a view do Jogador e olha
   o card que o token abre. O card do Mestre usa o MESMO componente
   (NumerosDoCombatente), travado pela checagem de fonte no fim.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

const stubOriginal = globalThis.supabaseClient;
afterEach(() => { cleanup(); globalThis.supabaseClient = stubOriginal; });

const EU = 64;
const lutador = (over) => ({
  tipo: 'pj', ref_id: EU, inst_id: 'eu', nome: 'Yuldrous', ordem: 1,
  status: 'ativo', atual: true, vb: 20, pa_max: 2, pa_rest: 2,
  mov_rest: 5, moveu_na_rodada: false, pos: { x: 10, y: 10 },
  defesa_sigla: 'M', defesa_valor: 4,
  ef: 10, ef_max: 10, eh: 5, eh_max: 5, ar: 3, ar_max: 3, karma: 0, karma_max: 0,
  status_temp: [], ...over,
});

async function cardDe(parts, nome) {
  globalThis.supabaseClient = fakeSupabase({
    personagens: [], itens: [], magias: [], tecnicas: [], habilidades: [], criaturas: [],
  });
  const { container } = render(React.createElement(window.BatalhaJogadorView, {
    batalha: { id: 1, estado: 'ativa', rodada: 3, historia_id: 9, participantes: parts, log: [], rolagem_pendente: null },
    pjAtivoId: EU, lang: 'pt', onVoltar: () => {},
  }));
  await waitFor(() => expect(container.querySelector('.batalha-token')).toBeTruthy());
  const tokens = [...container.querySelectorAll('.batalha-token')];
  (tokens.find((t) => (t.textContent || '').includes(nome)) || tokens[0]).click();
  await waitFor(() => expect(document.querySelector('.batalha-token-menu')).toBeTruthy());
  return document.querySelector('.batalha-token-menu');
}

describe('números e ações na MESMA fileira', () => {
  it('velocidade, PA, defesa e absorção ficam na barra junto dos botões do turno, sem ícone de status no nome', async () => {
    const menu = await cardDe([lutador()], 'Yuldrous');
    const barra = menu.querySelector('.batalha-card-barra');
    expect(barra, 'fileira única do card').toBeTruthy();
    expect(barra.querySelectorAll('.batalha-stat-num')).toHaveLength(4);
    expect(barra.querySelectorAll('.batalha-card-botoes .batalha-menu-acao-ic')).toHaveLength(4);
    // nada de números sobrando no cabeçalho do nome
    expect(menu.querySelector('.batalha-fighter-head .batalha-stat-num')).toBeNull();
    // "Remova o ícone de status do lado do nome do personagem" (13/09/2026)
    expect(menu.querySelector('.batalha-fighter-status-ic')).toBeNull();
  });

  it('os números são ti-number-N-small, sem os ícones antigos', async () => {
    const menu = await cardDe([lutador()], 'Yuldrous');
    const icones = [...menu.querySelectorAll('.batalha-stat-num i')].map((i) => i.className);
    expect(icones).toEqual([
      'ti ti-number-20-small', 'ti ti-number-2-small', 'ti ti-number-4-small', 'ti ti-number-3-small',
    ]);
    expect(menu.querySelector('.ti-run-sprint, .ti-shield-half, [class*="ti-hexagon-number"]')).toBeNull();
    // Sem a letra da armadura desde 13/09/2026 ("Remova o L de L9"); cada
    // número diz o que é no aria-label.
    expect(menu.querySelector('.batalha-stat-sigla')).toBeNull();
    const rotulos = [...menu.querySelectorAll('.batalha-stat-num')].map((s) => s.getAttribute('aria-label'));
    expect(rotulos[1]).toContain('2/2');
    expect(rotulos[2]).toBe('Média: 4');
  });

  it('fora da família de ícones (defesa negativa) o número vai escrito', async () => {
    const menu = await cardDe([lutador({ defesa_valor: -2 })], 'Yuldrous');
    const defesa = menu.querySelectorAll('.batalha-stat-num')[2];
    expect(defesa.querySelector('i')).toBeNull();
    expect(defesa.textContent).toBe('-2');
  });

  it('quem não está na vez: a fileira mostra só os números e o estado', async () => {
    const outro = lutador({ ref_id: 99, inst_id: 'outro', nome: 'Aliado', ordem: 2, atual: false, ar: 0 });
    const menu = await cardDe([lutador(), outro], 'Aliado');
    const barra = menu.querySelector('.batalha-card-barra');
    expect(barra.querySelectorAll('.batalha-stat-num')).toHaveLength(3);   // sem absorção
    expect(barra.querySelector('.batalha-card-botoes')).toBeNull();
    expect(barra.querySelector('.batalha-stat-estado')).toBeTruthy();
  });
});

/* Segunda leva, 13/09/2026: "As barras vão virar botões com ícone, e o fundo
   vermelho ou verde, etc, vai descendo conforme vai gastando. No tooltip, ao
   invés de mostrar 'velocidade - 33', mostre só velocidade. Só 'ações'. Em
   defesa 'Média'. Remova 'Lobo Adulto ataca com', e o ícone de atacar fica
   inline com os outros." */
const dicaDe = async (el) => {
  fireEvent.mouseEnter(el);
  await waitFor(() => expect(document.querySelector('.mn-tip-title')).toBeTruthy());
  const t = document.querySelector('.mn-tip-title').textContent;
  fireEvent.mouseLeave(el);
  return t;
};

describe('tooltip dos números: só o nome', () => {
  it('Velocidade, Ações, Média e Absorção — sem o valor', async () => {
    const menu = await cardDe([lutador()], 'Yuldrous');
    const chips = [...menu.querySelectorAll('.batalha-stat-num')];
    const dicas = [];
    for (const c of chips) dicas.push(await dicaDe(c));
    expect(dicas).toEqual(['Velocidade', 'Ações', 'Média', 'Absorção']);
  });

  it('a defesa se chama pela armadura: Leve, Média, Pesada', () => {
    expect(['L', 'M', 'P', 'T', undefined].map((s) => window.MotorBatalha.nomeDefesa(s)))
      .toEqual(['Leve', 'Média', 'Pesada', 'Leve', 'Leve']);
    expect(window.MotorBatalha.nomeDefesa('P', true)).toBe('Heavy');
  });
});

/* Terceira leva, 13/09/2026: "Os botões de EF, EH, etc ficam inline com os
   demais e ao invés do fundo, eu quero uma borda que diminui." */
/* Quarta leva, 13/09/2026: "Os 4 itens de eh, ef, etc devem ficar inline com
   o nome, e o botão de X fica redondo igual os demais." */
describe('pools viram botões com anel que diminui, ao lado do nome', () => {
  it('um círculo por pool, na linha do nome, com o anel na fração atual', async () => {
    const menu = await cardDe([lutador({ ef: 5, ef_max: 10, eh: 5, eh_max: 5, res: 0, res_max: 4 })], 'Yuldrous');
    expect(menu.querySelector('.batalha-pool-bar')).toBeNull();
    const botoes = [...menu.querySelectorAll('.batalha-pool-botao')];
    expect(botoes.map((b) => b.className.match(/\bpool-(ef|eh|res|ka)\b/)[1])).toEqual(['ef', 'eh', 'res', 'ka']);
    expect(botoes.every((b) => b.closest('.batalha-fighter-id') && b.closest('.batalha-card-pools-nome'))).toBe(true);
    expect(menu.querySelector('.batalha-card-barra .batalha-pool-botao')).toBeNull();
    expect(menu.querySelector('.batalha-fighter-pools-wrap, .batalha-pool-nivel')).toBeNull();
    const anel = (pool) => menu.querySelector(`.batalha-pool-botao.pool-${pool} .batalha-pool-anel-nivel`).getAttribute('stroke-dasharray');
    expect(anel('ef')).toBe('50 100');
    expect(anel('eh')).toBe('100 100');
    expect(anel('res')).toBe('0 100');
    expect(menu.querySelector('.batalha-pool-botao.pool-res').classList.contains('vazia')).toBe(true);
    expect(botoes.every((b) => b.querySelector('i.ti'))).toBe(true);
  });

  it('o tooltip da pool traz o nome e o valor, que não está à vista', async () => {
    const menu = await cardDe([lutador({ ef: 5, ef_max: 10 })], 'Yuldrous');
    expect(await dicaDe(menu.querySelector('.batalha-pool-botao.pool-ef'))).toBe('Energia Física · 5/10');
  });

  it('fracaoDaPool: EF negativa é vazia, acima do máximo é cheia', () => {
    const { fracaoDaPool } = window.MotorBatalha;
    expect(fracaoDaPool(-8, 20)).toBe(0);
    expect(fracaoDaPool(30, 20)).toBe(1);
    expect(fracaoDaPool(5, 0)).toBe(0);
  });
});

describe('atacar fica inline, sem "Fulano ataca com"', () => {
  it('no avatar do inimigo não sobra o texto nem a fileira separada de ataque', async () => {
    const lobo = lutador({ tipo: 'criatura', ref_id: 7, inst_id: 'lobo', nome: 'Lobo Adulto', ordem: 2, atual: false });
    globalThis.supabaseClient = fakeSupabase({
      personagens: [{ id: EU, nome: 'Yuldrous', inventario: { itens: [] }, estado_atual: {} }],
      itens: [], magias: [], tecnicas: [], habilidades: [], criaturas: [{ id: 7, nome: 'Lobo Adulto' }],
    });
    const { container } = render(React.createElement(window.BatalhaJogadorView, {
      batalha: { id: 1, estado: 'ativa', rodada: 3, historia_id: 9, participantes: [lutador(), lobo], log: [], rolagem_pendente: null },
      pjAtivoId: EU, lang: 'pt', onVoltar: () => {},
    }));
    await waitFor(() => expect(container.querySelectorAll('.batalha-token').length).toBe(2));
    const token = [...container.querySelectorAll('.batalha-token')].find((t) => t.textContent.includes('Lobo'));
    token.click();
    await waitFor(() => expect(document.querySelector('.batalha-token-menu')).toBeTruthy());
    const menu = document.querySelector('.batalha-token-menu');
    expect(menu.textContent).not.toMatch(/ataca com|Atacar com/);
    // Com ou sem arma no fixture, o que não pode existir é a fileira separada.
    expect(menu.querySelector('.batalha-menu-atacar-lbl')).toBeNull();
    const atacar = menu.querySelector('.batalha-menu-atacar');
    if (atacar) {
      expect(atacar.closest('.batalha-card-barra')).toBeTruthy();
      atacar.querySelectorAll('.batalha-menu-acao-ic').forEach((b) => expect(b.className).toContain('btn-ghost'));
    }
  });
});

describe('o X do card e o Encerrar do topo', () => {
  it('o X continua existindo como botão próprio do menu', async () => {
    const menu = await cardDe([lutador()], 'Yuldrous');
    const x = menu.querySelector('.batalha-token-menu-fechar');
    expect(x).toBeTruthy();
    expect(x.querySelector('i.ti-x')).toBeTruthy();
  });

  it('Encerrar do header virou círculo com ícone, sem o botão vermelho com texto', () => {
    const fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'batalha.jsx'), 'utf8');
    expect(fonte).not.toContain('className="btn-danger btn-sm" disabled={salvando || rolagemPendente} onClick={encerrarBatalha}');
    const i = fonte.indexOf('batalha-encerrar-ic');
    expect(i).toBeGreaterThan(-1);
    expect(fonte.slice(i, i + 700)).toContain('encerrarBatalha()');
    expect(fonte.slice(i, i + 700)).toContain('ti-door-exit');
  });
});

describe('o card do Mestre usa o mesmo componente', () => {
  it('as duas views renderizam NumerosDoCombatente dentro de .batalha-card-barra', () => {
    const fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'batalha.jsx'), 'utf8');
    const barras = fonte.split('className="batalha-menu-acoes batalha-card-barra"').slice(1);
    expect(barras).toHaveLength(2);
    barras.forEach((b) => expect(b.slice(0, 300)).toMatch(/<NumerosDoCombatente /));
  });
});
