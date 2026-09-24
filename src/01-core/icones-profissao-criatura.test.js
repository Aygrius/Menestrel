/* ============================================================
   icones-profissao-criatura.test.js — o desenho de cada profissão e tipo
   ============================================================
   "Adicione o ícone da profissão dos personagens no card e na ficha" e "no
    tabuleiro de batalha, ao invés de mostrar a primeira letra do nome da
    criatura, mostre seu ícone de acordo com seu tipo." (usuário, 17/09/2026,
    com os ícones escolhidos um a um)

   As duas tabelas moram em 01-core porque TRÊS telas as consomem — card (08),
   ficha (11) e tabuleiro (12). Um par escrito três vezes é a receita de
   divergir sem ninguém decidir: aconteceu com status→ícone dentro da própria
   batalha, onde "desistiu" era porta no Mestre e bandeira no Jogador.

   O que este arquivo trava, além dos pares: que TODA profissão jogável tenha
   desenho (são seis e fechadas — um Bardo sem ícone seria um buraco visível),
   e que tipo de criatura sem desenho caia na inicial em vez de sumir.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';

let ICONE_PROFISSAO, ICONE_TIPO_CRIATURA, iconeProfissao, iconeTipoCriatura, GAME_DATA;
beforeAll(() => {
  ({ ICONE_PROFISSAO, ICONE_TIPO_CRIATURA, iconeProfissao, iconeTipoCriatura, GAME_DATA } = window);
  expect(iconeProfissao, 'as tabelas precisam estar no window').toBeTypeOf('function');
});

describe('profissões', () => {
  it.each([
    ['Guerreiro',  'ti-shield'],
    ['Rastreador', 'ti-bow'],
    ['Sacerdote',  'ti-bible'],
    ['Ladino',     'ti-sword'],
    ['Bardo',      'ti-music'],
    ['Mago',       'ti-crystal-ball'],
  ])('%s → %s', (prof, ic) => {
    expect(iconeProfissao(prof)).toBe(ic);
  });

  /* São seis e fechadas: qualquer profissão jogável sem desenho apareceria
     como um buraco no card e na ficha. */
  it('toda profissão de GAME_DATA tem ícone', () => {
    for (const prof of Object.keys(GAME_DATA.profissoes)) {
      expect(iconeProfissao(prof), prof + ' está sem ícone').toBeTruthy();
    }
  });

  it('e nenhum ícone sobra para profissão que não existe', () => {
    for (const prof of Object.keys(ICONE_PROFISSAO)) {
      expect(GAME_DATA.profissoes[prof], prof + ' não é profissão do jogo').toBeTruthy();
    }
  });

  it('profissão desconhecida não desenha nada', () => {
    expect(iconeProfissao('Alquimista')).toBeNull();
    expect(iconeProfissao(null)).toBeNull();
    expect(iconeProfissao('')).toBeNull();
  });
});

describe('tipos de criatura', () => {
  it.each([
    ['Animal',     'ti-horse'],
    ['Celestial',  'ti-cross'],
    ['Infernal',   'ti-pentagram'],
    ['Demônio',    'ti-pentagram'],
    ['Dragão',     'ti-dragon'],
    ['Civilizado', 'ti-user'],
    ['Construído', 'ti-robot'],
    ['Místico',    'ti-michelin-bib-gourmand'],
    ['Morto',      'ti-coffin'],
    ['Elemental',  'ti-ghost-2'],
  ])('%s → %s', (tipo, ic) => {
    expect(iconeTipoCriatura(tipo)).toBe(ic);
  });

  /* Os DEZ tipos com linha no banco estão todos nomeados desde a segunda
     passada de 17/09/2026. Sobraram Monstro e Gigante, que o editor oferece e
     nenhuma criatura usa; o tabuleiro os mantém na inicial do nome, que é
     melhor que um token vazio. E 'Selvagem', da primeira lista, saiu: não é
     tipo de criatura nenhum. */
  it('tipo sem desenho devolve null, e o token cai na inicial', () => {
    expect(iconeTipoCriatura('Monstro')).toBeNull();
    expect(iconeTipoCriatura('Gigante')).toBeNull();
    expect(iconeTipoCriatura('Selvagem')).toBeNull();
  });

  /* O mesmo tipo aparece como 'Dragão' na tabela e pode chegar como 'dragao'
     de dado antigo — uma das duas grafias sumiria. */
  it('acento e caixa não mudam a resposta', () => {
    expect(iconeTipoCriatura('dragao')).toBe('ti-dragon');
    expect(iconeTipoCriatura('CONSTRUIDO')).toBe('ti-robot');
    expect(iconeTipoCriatura('  mistico  ')).toBe('ti-michelin-bib-gourmand');
  });
});

/* Ícone inventado não falha alto: vira quadrado vazio na tela. Foi assim que
   um 'ti-cloud-moon' inexistente passou despercebido no VISIBILIDADE_ICONE. */
describe('os nomes têm a cara de um ícone Tabler', () => {
  /* Lido do window aqui dentro, e não pelo beforeAll: o corpo do describe roda
     na coleta, antes de qualquer hook. */
  it('nenhum nome foge do formato ti-alguma-coisa', () => {
    const todos = [
      ...Object.entries(window.ICONE_PROFISSAO),
      ...Object.entries(window.ICONE_TIPO_CRIATURA),
    ];
    expect(todos.length).toBe(16);
    for (const [chave, ic] of todos) {
      expect(ic, chave + ' tem nome de ícone malformado').toMatch(/^ti-[a-z0-9-]+$/);
    }
  });
});
