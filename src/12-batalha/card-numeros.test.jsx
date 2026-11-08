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
  await waitFor(() => expect(document.querySelector('.batalha-mesa-painel .batalha-fighter')).toBeTruthy());
  return document.querySelector('.batalha-mesa-painel .batalha-fighter');
}

describe('números e ações na MESMA fileira', () => {
  /* A MESA DO JOGADOR (08/11/2026): o card é o do painel fixo do Mestre —
     as células Ações/Movimento/Defesa/Velocidade/Absorção e, na vez, os botões do
     turno com nome (BotoesDoTurno). Sem ícone de status ao lado do nome. */
  it('as células e os botões do turno ficam na mesma barra do card', async () => {
    const menu = await cardDe([lutador()], 'Yuldrous');
    const barra = menu.querySelector('.batalha-card-barra');
    expect(barra, 'fileira única do card').toBeTruthy();
    expect([...barra.querySelectorAll('.batalha-cel-rot')].map((c) => c.textContent))
      .toEqual(['Ações', 'Movimento', 'Defesa', 'Velocidade', 'Absorção']);
    expect([...barra.querySelectorAll('.batalha-turno button')].map((b) => b.getAttribute('aria-label')))
      .toEqual(['Atacar', 'Magia', 'Técnica', 'Habilidade', 'Item', 'Mover', 'Encerrar a vez']);
    expect(menu.querySelector('.batalha-fighter-head .batalha-cel')).toBeNull();
    expect(menu.querySelector('.batalha-fighter-status-ic')).toBeNull();
  });

  it('as células trazem os números: ações x/y, a defesa com a sigla', async () => {
    const menu = await cardDe([lutador()], 'Yuldrous');
    const val = [...menu.querySelectorAll('.batalha-cel-val')].map((c) => c.textContent);
    expect(val[0]).toBe('2/2');
    expect(val[2]).toBe('M4');
    expect(val[3]).toBe('20');
    expect(val[4]).toBe('3');
  });

  // "O jogador não vê velocidade, ações e armadura do adversário. Apenas o
  // status." (14/09/2026)
  it('card de outro combatente: sem números, só o estado', async () => {
    const outro = lutador({ ref_id: 99, inst_id: 'outro', nome: 'Aliado', ordem: 2, atual: false, ar: 0 });
    const menu = await cardDe([lutador(), outro], 'Aliado');
    expect(menu.querySelector('.batalha-card-barra')).toBeNull();
    expect(menu.querySelectorAll('.batalha-stat-num')).toHaveLength(0);
    expect(menu.querySelector('.batalha-card-pools-nome .batalha-stat-estado')).toBeTruthy();
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
  // "Armadura Leve", não só "Leve" (14/09/2026).
  it('a defesa se chama pela armadura: Armadura Leve, Média, Pesada', () => {
    expect(['L', 'M', 'P', 'T', undefined].map((s) => window.MotorBatalha.nomeDefesa(s)))
      .toEqual(['Armadura Leve', 'Armadura Média', 'Armadura Pesada', 'Armadura Leve', 'Armadura Leve']);
    expect(window.MotorBatalha.nomeDefesa('P', true)).toBe('Heavy Armor');
  });
});

/* Terceira leva, 13/09/2026: "Os botões de EF, EH, etc ficam inline com os
   demais e ao invés do fundo, eu quero uma borda que diminui." */
/* Quarta leva, 13/09/2026: "Os 4 itens de eh, ef, etc devem ficar inline com
   o nome, e o botão de X fica redondo igual os demais." */
/* A mesa do jogador (08/11/2026): as energias do próprio personagem são as
   linhas do painel do Mestre — nome, barra e número à vista. */
describe('pools do próprio personagem: linhas com barra e número', () => {
  it('uma linha por pool, na ordem EF, EH, RES, KA, com o número à vista', async () => {
    const menu = await cardDe([lutador({ ef: 5, ef_max: 10, eh: 5, eh_max: 5, res: 0, res_max: 4, karma: 3, karma_max: 6 })], 'Yuldrous');
    const linhas = [...menu.querySelectorAll('.batalha-pool-linha')];
    expect(linhas.map((b) => b.className.match(/\bpool-(ef|eh|res|ka)\b/)[1])).toEqual(['ef', 'eh', 'res', 'ka']);
    expect(linhas.every((b) => b.closest('.batalha-card-pools-nome'))).toBe(true);
    expect(menu.querySelector('.batalha-pool-linha.pool-ef .batalha-pool-linha-num').textContent).toBe('5/10');
    // Só leitura: o jogador não edita a pool.
    expect(menu.querySelector('.batalha-pool-linha.editavel')).toBeNull();
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
    await waitFor(() => expect(document.querySelector('.batalha-mesa-painel .batalha-fighter')).toBeTruthy());
    const menu = document.querySelector('.batalha-mesa-painel .batalha-fighter');
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
  // O card mora no painel fixo (08/11/2026): não há o que fechar.
  it('o painel fixo do jogador não tem o X do antigo card flutuante', async () => {
    const menu = await cardDe([lutador()], 'Yuldrous');
    expect(menu.querySelector('.batalha-token-menu-fechar')).toBeNull();
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
  it('as duas views renderizam NumerosDoCombatente em células dentro de .batalha-card-barra', () => {
    const fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'batalha.jsx'), 'utf8');
    const comNumeros = fonte.split('className="batalha-menu-acoes batalha-card-barra"').slice(1)
      .filter((b) => /<NumerosDoCombatente /.test(b.slice(0, 300)));
    expect(comNumeros).toHaveLength(2);
    comNumeros.forEach((b) => expect(b.slice(0, 300)).toMatch(/celulas \/>/));
  });
});
