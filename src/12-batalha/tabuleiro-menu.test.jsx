/* ============================================================
   tabuleiro-menu.test.jsx — menu do participante no token
   ============================================================
   Cobre o que substituiu os cards do roster (30/08/2026): clicar no
   avatar abre o menu daquele participante. É teste de RENDER, não da
   camada pura — a geometria continua em tabuleiro.test.js.

   O que está travado aqui:
     • sem `menuDe`, nada abre (o tabuleiro segue servindo só pra mover);
     • com `menuDe`, o clique no avatar abre o menu DAQUELE token;
     • clicar de novo fecha, e clicar em outro token troca o dono;
     • token de quem NÃO pode ser movido também abre — sem os cards,
       o avatar virou o único caminho até as pools dos outros.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let Tabuleiro;
beforeAll(() => {
  Tabuleiro = window.TabuleiroBatalha;
  expect(Tabuleiro).toBeDefined();
});
afterEach(cleanup);

const pj = (nome, extra) => ({
  tipo: 'pj', ref_id: nome, inst_id: nome, nome,
  pos: { x: 10, y: 10 }, status: 'ativo',
  ef: 10, ef_max: 10, eh: 8, eh_max: 8, ar: 0, ar_max: 0,
  vb: 20, pa_rest: 3, pa_max: 3,
  ...extra,
});

// Dois participantes em células distintas, senão os tokens se sobrepõem.
const ENTRADAS = [
  { p: pj('Yuldrous'), i: 0 },
  { p: pj('Lobisomem', { tipo: 'criatura', pos: { x: 30, y: 12 } }), i: 1 },
];

// O avatar é o filho clicável do token; o clique no token é quem abre.
const tokenDe = (nome) => {
  const alvo = screen.getAllByRole('button')
    .find((el) => el.className.includes('batalha-token') && el.textContent.includes(nome));
  if (!alvo) throw new Error('token nao encontrado: ' + nome);
  return alvo;
};

const montar = (props) => render(
  React.createElement(Tabuleiro, {
    entradas: ENTRADAS,
    meta: {},
    podeSelecionar: () => true,
    alcanceDe: () => null,
    onMover: () => false,
    salvando: false,
    isEn: false,
    tb: {},
    abrirTip: null,
    fecharTip: null,
    ...props,
  })
);

describe('menu do participante', () => {
  it('sem menuDe, clicar no token não abre menu nenhum', () => {
    const { container } = montar({});
    fireEvent.click(tokenDe('Yuldrous'));
    expect(container.ownerDocument.querySelector('.batalha-token-menu')).toBeNull();
  });

  it('clicar no avatar abre o menu daquele participante', () => {
    montar({ menuDe: (p) => React.createElement('div', null, 'menu de ' + p.nome) });
    fireEvent.click(tokenDe('Yuldrous'));
    expect(screen.getByText('menu de Yuldrous')).toBeTruthy();
  });

  it('clicar no mesmo token de novo fecha', () => {
    montar({ menuDe: (p) => React.createElement('div', null, 'menu de ' + p.nome) });
    fireEvent.click(tokenDe('Yuldrous'));
    expect(screen.queryByText('menu de Yuldrous')).toBeTruthy();
    fireEvent.click(tokenDe('Yuldrous'));
    expect(screen.queryByText('menu de Yuldrous')).toBeNull();
  });

  it('clicar em outro token troca o dono do menu', () => {
    montar({ menuDe: (p) => React.createElement('div', null, 'menu de ' + p.nome) });
    fireEvent.click(tokenDe('Yuldrous'));
    fireEvent.click(tokenDe('Lobisomem'));
    expect(screen.queryByText('menu de Yuldrous')).toBeNull();
    expect(screen.queryByText('menu de Lobisomem')).toBeTruthy();
  });

  it('abre também para quem ninguém pode mover — sem os cards, o avatar é o único caminho', () => {
    montar({
      podeSelecionar: () => false,
      menuDe: (p) => React.createElement('div', null, 'menu de ' + p.nome),
    });
    fireEvent.click(tokenDe('Lobisomem'));
    expect(screen.getByText('menu de Lobisomem')).toBeTruthy();
  });

  it('o menu recebe o índice do participante, não a posição na lista filtrada', () => {
    montar({ menuDe: (p, i) => React.createElement('div', null, 'indice ' + i) });
    fireEvent.click(tokenDe('Lobisomem'));
    expect(screen.getByText('indice 1')).toBeTruthy();
  });
});

describe('menu x movimento — o menu cobre o tabuleiro, então são gestos separados', () => {
  // A grade é o filho direto do container de scroll; é nela que o clique
  // de destino cai.
  const grade = (container) => {
    const g = container.querySelector('.batalha-tabuleiro-scroll > div');
    if (!g) throw new Error('grade nao encontrada');
    return g;
  };
  // O "Mover" é desenhado pelo CHAMADOR (fica na mesma fileira de Ação e
  // Passar, que são dele); o tabuleiro só entrega a função que arma, no 4º
  // argumento — null quando o participante não pode mover.
  const menuSimples = (p, i, fechar, mover) => React.createElement('div', null,
    'menu de ' + p.nome,
    mover && React.createElement('button', { type: 'button', onClick: mover }, 'Mover'));

  it('abrir o menu NÃO arma o movimento: clicar na grade não move', () => {
    const onMover = vi.fn(() => true);
    const { container } = montar({ menuDe: menuSimples, onMover });
    fireEvent.click(tokenDe('Yuldrous'));
    fireEvent.click(grade(container), { clientX: 400, clientY: 300 });
    expect(onMover).not.toHaveBeenCalled();
  });

  it('clicar em "Mover" fecha o menu e libera a grade', () => {
    const onMover = vi.fn(() => true);
    const { container } = montar({ menuDe: menuSimples, onMover });
    fireEvent.click(tokenDe('Yuldrous'));
    fireEvent.click(screen.getByText('Mover'));
    expect(screen.queryByText('menu de Yuldrous')).toBeNull();
    fireEvent.click(grade(container), { clientX: 400, clientY: 300 });
    expect(onMover).toHaveBeenCalledTimes(1);
  });

  it('"Mover" não aparece para quem não pode ser movido', () => {
    montar({ menuDe: menuSimples, podeSelecionar: () => false });
    fireEvent.click(tokenDe('Lobisomem'));
    expect(screen.queryByText('Mover')).toBeNull();
  });

  it('sem menuDe (posicionamento do setup) o clique no token arma o movimento direto', () => {
    const onMover = vi.fn(() => true);
    const { container } = montar({ onMover });
    fireEvent.click(tokenDe('Yuldrous'));
    fireEvent.click(grade(container), { clientX: 400, clientY: 300 });
    expect(onMover).toHaveBeenCalledTimes(1);
  });

  it('clicar na grade dispensa o menu aberto', () => {
    const { container } = montar({ menuDe: menuSimples, onMover: () => false });
    fireEvent.click(tokenDe('Yuldrous'));
    fireEvent.click(grade(container), { clientX: 400, clientY: 300 });
    expect(screen.queryByText('menu de Yuldrous')).toBeNull();
  });
});

describe('"Mover" segue podeSelecionar por PARTICIPANTE', () => {
  // O bug de 30/08/2026: o Mestre passava `() => estado === 'ativa'`, que é
  // true pra todos, enquanto moverNoTabuleiro recusa quem não é `p.atual`.
  // Resultado: "Mover" aparecia em todo mundo, o menu fechava, nenhum halo
  // era desenhado e o clique na grade era recusado com a mensagem fora da
  // tela. Aqui o predicado é por participante, como em batalha.jsx.
  // O "Mover" é desenhado pelo CHAMADOR (fica na mesma fileira de Ação e
  // Passar, que são dele); o tabuleiro só entrega a função que arma, no 4º
  // argumento — null quando o participante não pode mover.
  const menuSimples = (p, i, fechar, mover) => React.createElement('div', null,
    'menu de ' + p.nome,
    mover && React.createElement('button', { type: 'button', onClick: mover }, 'Mover'));
  const soODaVez = (p) => p.nome === 'Yuldrous';

  it('oferece Mover só a quem o predicado aceita', () => {
    montar({ menuDe: menuSimples, podeSelecionar: soODaVez });
    fireEvent.click(tokenDe('Lobisomem'));
    expect(screen.getByText('menu de Lobisomem')).toBeTruthy();  // menu abre
    expect(screen.queryByText('Mover')).toBeNull();              // mas sem Mover
  });

  it('o da vez continua com Mover', () => {
    montar({ menuDe: menuSimples, podeSelecionar: soODaVez });
    fireEvent.click(tokenDe('Yuldrous'));
    expect(screen.getByText('Mover')).toBeTruthy();
  });

  it('grade não move quem o predicado recusa, mesmo com o token clicado', () => {
    const onMover = vi.fn(() => true);
    const { container } = montar({ menuDe: menuSimples, podeSelecionar: soODaVez, onMover });
    fireEvent.click(tokenDe('Lobisomem'));
    const g = container.querySelector('.batalha-tabuleiro-scroll > div');
    fireEvent.click(g, { clientX: 400, clientY: 300 });
    expect(onMover).not.toHaveBeenCalled();
  });
});

describe('clique em UI que o menu abre por PORTAL não fecha o menu', () => {
  // Bug de 30/08/2026: confirmar a rolagem do dado fechava o menu. O overlay
  // sai por portal (precisa: um ancestral com transform aprisiona position:
  // fixed), então nasce FORA do .batalha-token-menu e o listener de "clique
  // fora" o tratava como fora. O menu fechava, o AcaoPanel desmontava e o d20
  // ia junto — o Mestre tinha que rolar de novo para a mesma ação.
  const menuSimples = (p) => React.createElement('div', null, 'menu de ' + p.nome);

  // Reproduz o portal: elemento irmão do menu, no body, com a classe real.
  const abrirPortal = (classe) => {
    const el = document.createElement('div');
    el.className = classe;
    el.innerHTML = '<button type="button">Confirmar</button>';
    document.body.appendChild(el);
    return el;
  };

  const casos = [
    ['.dado-overlay-backdrop', 'dado-overlay-backdrop'],
    ['.batalha-estado-drop-portal', 'batalha-estado-drop-portal'],
    ['.mn-tip', 'mn-tip'],
    // 02/09/2026: a lista do SelectPill passou a sair por portal (antes era
    // absolute e ficava presa dentro do menu, recortada na borda). Escolher
    // uma Habilidade fechava o CARD INTEIRO — o clique na opção nascia fora
    // do .batalha-token-menu e caía no "clique fora". Mesmo bug do dado, um
    // portal depois.
    ['.select-pill-drop-portal', 'select-pill-drop-portal'],
  ];

  for (const [rotulo, classe] of casos) {
    it(rotulo + ' mantém o menu aberto', () => {
      montar({ menuDe: menuSimples });
      fireEvent.click(tokenDe('Yuldrous'));
      expect(screen.queryByText('menu de Yuldrous')).toBeTruthy();
      const portal = abrirPortal(classe);
      fireEvent.pointerDown(portal.querySelector('button'));
      expect(screen.queryByText('menu de Yuldrous')).toBeTruthy();
      portal.remove();
    });
  }

  it('clique em elemento realmente de fora continua fechando', () => {
    montar({ menuDe: menuSimples });
    fireEvent.click(tokenDe('Yuldrous'));
    const solto = abrirPortal('algo-qualquer');
    fireEvent.pointerDown(solto.querySelector('button'));
    expect(screen.queryByText('menu de Yuldrous')).toBeNull();
    solto.remove();
  });
});

describe('menuTravado — rolagem pendente sela o modal', () => {
  // Regra "rolou, não rola de novo" (já existia no AcaoPanel: trava abas e
  // troca o Cancelar por um aviso). Com o painel dentro do modal, FECHAR o
  // modal virou uma brecha nova: desmontava o painel, o d20 sumia com o
  // estado dele e dava pra escapar da ação sem gastar PA. Aqui ficam
  // trancadas as cinco saídas.
  const menuSimples = (p) => React.createElement('div', null, 'menu de ' + p.nome);
  const aberto = () => !!screen.queryByText('menu de Yuldrous');

  // Sequência REAL: o menu abre destravado (é assim que o painel aparece), o
  // Mestre rola, e SÓ ENTÃO a rolagem pendente trava. Testar com menuTravado
  // já ligado desde a montagem inventaria um estado que o app não produz.
  const abrirEtravar = (props) => {
    const r = montar({ menuDe: menuSimples, ...props });
    fireEvent.click(tokenDe('Yuldrous'));
    r.rerender(React.createElement(Tabuleiro, {
      entradas: ENTRADAS, meta: {}, podeSelecionar: () => true, alcanceDe: () => null,
      onMover: () => false, salvando: false, isEn: false, tb: {},
      abrirTip: null, fecharTip: null, menuDe: menuSimples, menuTravado: true, ...props,
    }));
    return r;
  };

  it('o X some enquanto está travado', () => {
    const { container } = abrirEtravar();
    expect(aberto()).toBe(true);
    expect(container.ownerDocument.querySelector('.batalha-token-menu-fechar')).toBeNull();
  });

  it('o X existe quando não está travado', () => {
    const { container } = montar({ menuDe: menuSimples });
    fireEvent.click(tokenDe('Yuldrous'));
    expect(container.ownerDocument.querySelector('.batalha-token-menu-fechar')).toBeTruthy();
  });

  it('Escape não fecha', () => {
    abrirEtravar();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(aberto()).toBe(true);
  });

  it('clique fora não fecha', () => {
    abrirEtravar();
    const solto = document.createElement('div');
    solto.innerHTML = '<button type="button">fora</button>';
    document.body.appendChild(solto);
    fireEvent.pointerDown(solto.querySelector('button'));
    expect(aberto()).toBe(true);
    solto.remove();
  });

  it('clique na grade não fecha nem move', () => {
    const onMover = vi.fn(() => true);
    const { container } = abrirEtravar({ onMover });
    fireEvent.click(container.querySelector('.batalha-tabuleiro-scroll > div'), { clientX: 400, clientY: 300 });
    expect(aberto()).toBe(true);
    expect(onMover).not.toHaveBeenCalled();
  });

  it('clicar em outro token não troca o dono do menu', () => {
    abrirEtravar();
    fireEvent.click(tokenDe('Lobisomem'));
    expect(aberto()).toBe(true);
    expect(screen.queryByText('menu de Lobisomem')).toBeNull();
  });

  it('clicar no MESMO token também não fecha', () => {
    abrirEtravar();
    fireEvent.click(tokenDe('Yuldrous'));
    expect(aberto()).toBe(true);
  });

  it('destravado, as saídas voltam a funcionar', () => {
    montar({ menuDe: menuSimples });
    fireEvent.click(tokenDe('Yuldrous'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(aberto()).toBe(false);
  });
});


/* ── O X volta um nível quando há para onde voltar (03/09/2026) ────
   Pedido do usuário: "no card de ações, ao clicar no x, volte para as ações
   iniciais". O painel de Ação toma o card inteiro, e antes o X fechava tudo —
   pra rever as ações iniciais era preciso reabrir o token.

   `menuVoltar` é por PARTICIPANTE, não global, e esse é o ponto que estes
   testes trancam: com um valor global, abrir o painel de quem está na vez e
   depois clicar noutro token deixaria o X daquele outro card "voltando" pra
   um painel que nem está na tela — e aquele card ficaria sem saída nenhuma.
   No primeiro nível menuVoltar devolve null e o X fecha, como sempre fez, o
   que garante que sempre existe caminho pra sair. */
describe('X do menu — volta um nível ou fecha', () => {
  const menuSimples = (p) => React.createElement('div', null, 'menu de ' + p.nome);
  const oX = () => screen.getAllByRole('button').find(
    (b) => b.classList.contains('batalha-token-menu-fechar')
  );

  it('sem menuVoltar o X fecha o menu, como sempre', () => {
    montar({ menuDe: menuSimples });
    fireEvent.click(tokenDe('Yuldrous'));
    expect(screen.queryByText('menu de Yuldrous')).toBeTruthy();
    fireEvent.click(oX());
    expect(screen.queryByText('menu de Yuldrous')).toBeNull();
  });

  it('com menuVoltar o X chama o voltar e NÃO fecha o menu', () => {
    let voltou = 0;
    montar({ menuDe: menuSimples, menuVoltar: () => () => { voltou += 1; } });
    fireEvent.click(tokenDe('Yuldrous'));
    fireEvent.click(oX());
    expect(voltou, 'o X tem que chamar o voltar').toBe(1);
    expect(screen.queryByText('menu de Yuldrous'), 'o menu tem que continuar aberto').toBeTruthy();
  });

  it('menuVoltar devolvendo null pro participante deixa o X fechar', () => {
    // É o caso do card de OUTRO combatente enquanto o painel de alguém está
    // aberto: sem isso aquele card ficaria sem nenhuma forma de sair.
    montar({ menuDe: menuSimples, menuVoltar: () => null });
    fireEvent.click(tokenDe('Yuldrous'));
    fireEvent.click(oX());
    expect(screen.queryByText('menu de Yuldrous')).toBeNull();
  });

  it('menuVoltar recebe o participante do menu aberto', () => {
    const vistos = [];
    montar({ menuDe: menuSimples, menuVoltar: (p) => { vistos.push(p.nome); return null; } });
    fireEvent.click(tokenDe('Yuldrous'));
    expect(vistos).toContain('Yuldrous');
  });
});
