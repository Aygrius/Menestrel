/* ============================================================
   atalhos-ficha.test.jsx — Habilidade, Magia e Item flutuantes
   ============================================================
   "Assim como hoje existe um ícone flutuante de dado, tenha ícones de
   habilidade, magia, item. Quase como um atalho." (usuário, 12/09/2026)

   Antes disto as janelas de usar habilidade e evocar magia existiam na ficha
   e nada as abria. Os testes cobrem o componente de verdade (abrir, buscar,
   escolher) e a FIAÇÃO na ficha, lida do texto-fonte: se alguém desligar o
   atalho da janela, o jogador volta a não ter onde clicar — e isso não pode
   passar calado de novo.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
/* O shell traz o ModalShell, que é onde a lista passou a morar desde
   26/10/2026 ("quando eu clico em habilidades, magias, etc, deve abrir
   modal"). Sem ele, AtalhosFicha não teria onde desenhar a lista. */
import '../10-shell/shell.jsx';
import './atalhos-ficha.jsx';

let Atalhos, usavel;
beforeAll(() => {
  Atalhos = window.AtalhosFicha;
  usavel = window.itemUsavelNoAtalho;
  expect(Atalhos).toBeTypeOf('function');
  expect(window.ModalShell, 'o modal da lista vem do shell').toBeTypeOf('function');
});
afterEach(cleanup);

const HABS = [
  { key: 'furtividade', nome: 'Furtividade', grupo: 'Subterfúgio', total: 7 },
  { key: 'alfabetizacao', nome: 'Alfabetização', grupo: 'Conhecimento', total: 3 },
];
/* A magia leva a ficha dela desde 28/10/2026: a janela mostra alcance,
   duração e os níveis APRENDIDOS, e evoca dali. */
const MAGS = [{
  key: 'faro', nome: 'Faro', nivel: 3, descricao: 'Aguça o olfato.',
  alcance: 'Pessoal', duracao: '1 hora',
  niveis: [{ n: 1, titulo: 'Rastro', valor: '1 hora' }, { n: 3, titulo: 'Rastro antigo', valor: '3 horas' }],
}, {
  key: 'cura', nome: 'Curas Físicas', nivel: 5, descricao: 'Fecha feridas.',
  alcance: 'Toque', duracao: 'Instantânea',
  niveis: [{ n: 1, titulo: 'Leve', valor: '3 PV' }, { n: 5, titulo: 'Grave', valor: '15 PV' }],
}];
/* O PASSO vem da ficha (magiaPassoDoAtalho): aqui um dublê com a mesma
   forma, para medir a JANELA sem arrastar a ficha inteira. */
const passoFalso = (key, nivel) => (key === 'faro'
  ? { karma: nivel, nota: null, alvos: [{ id: '7', nome: 'Alvira' }], ritual: null,
      bloqueio: null, euId: '7', semAlvo: true }
  : { karma: nivel, nota: null, euId: '7', ritual: null, bloqueio: null, semAlvo: false,
      alvos: [{ id: '7', nome: 'Alvira' }, { id: '9', nome: 'Brom' }] });
const ITENS = [{ id: 'i1', nome: 'Poção Menor de Vigor', quantidade: 2, icone: 'ti-flask' }];

const montar = (props = {}) => render(
  <Atalhos lang="pt" habilidades={HABS} magias={MAGS} itens={ITENS} magiaPasso={passoFalso} {...props} />
).container;

const fab = (c, tipo) => c.querySelector(`.at-fab[data-atalho="${tipo}"]`);
/* A lista vai por portal para a raiz do app (no teste, o body): procurar no
   container do render não a acha mais. `modal()` é a janela inteira. */
const modal = () => document.querySelector('.modal-atalho');
const no = (sel) => document.querySelector('.modal-atalho ' + sel);
const todos = (sel) => [...document.querySelectorAll('.modal-atalho ' + sel)];
/* O rodapé é de todos os três passos desde 28/10/2026 — era um helper por
   describe, e a magia precisava do terceiro. */
const rodape = (txt) => todos('button').find((b) => b.textContent.trim() === txt);

describe('os botões', () => {
  it('um por tipo, na ordem Habilidade · Magia · Item', () => {
    const c = montar();
    const tipos = [...c.querySelectorAll('.at-fab')].map((b) => b.dataset.atalho);
    expect(tipos).toEqual(['habilidade', 'magia', 'item']);
  });

  it('lista vazia não ganha botão, e os de baixo sobem', () => {
    const c = montar({ magias: [] });
    expect(fab(c, 'magia')).toBeNull();
    expect(fab(c, 'item').style.getPropertyValue('--at-i')).toBe('1');
  });

  it('sem nada para usar, não monta nada', () => {
    const c = montar({ habilidades: [], magias: [], itens: [] });
    expect(c.querySelector('.at-root')).toBeNull();
  });
});

describe('a lista', () => {
  it('começa fechada; o botão abre e fecha', () => {
    const c = montar();
    expect(modal()).toBeNull();
    fireEvent.click(fab(c, 'habilidade'));
    expect(modal()).toBeTruthy();
    expect(fab(c, 'habilidade').getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(fab(c, 'habilidade'));
    expect(modal()).toBeNull();
  });

  it('ordena por nome e mostra o total da habilidade', () => {
    const c = montar();
    fireEvent.click(fab(c, 'habilidade'));
    const nomes = todos('.at-linha-nome').map((n) => n.textContent);
    expect(nomes).toEqual(['Alfabetização', 'Furtividade']);
    // Só o número desde 26/09/2026; o nome fica no aria-label.
    expect(no('.at-linha-meta-lbl')).toBeNull();
    expect(no('.at-linha-meta-val').textContent).toBe('3');
    expect(no('.at-linha-meta').getAttribute('aria-label')).toBe('Total: 3');
  });

  it('não mostra o grupo embaixo do nome (pedido do usuário, 12/09/2026)', () => {
    const c = montar();
    fireEvent.click(fab(c, 'habilidade'));
    expect(no('.at-linha-sub')).toBeNull();
    expect(no('.at-lista').textContent).not.toMatch(/Subterfúgio|Conhecimento/);
  });

  it('busca ignora acento e acha pelo grupo', () => {
    const c = montar();
    fireEvent.click(fab(c, 'habilidade'));
    const busca = no('.at-busca');
    fireEvent.change(busca, { target: { value: 'alfabetizacao' } });
    expect(todos('.at-linha')).toHaveLength(1);
    fireEvent.change(busca, { target: { value: 'subterf' } });
    expect(no('.at-linha-nome').textContent).toBe('Furtividade');
    fireEvent.change(busca, { target: { value: 'zzz' } });
    expect(no('.at-vazio').textContent).toMatch(/Nenhuma habilidade/);
  });

  /* 26/09/2026: "'QUANTIDADE 30' vira 'x30'. Em magia fica '9'. Em
     habilidade fica '-10'." E o título "Itens 2" do painel saiu. */
  it('magia mostra só o nível; item mostra xN; sem título no painel', () => {
    const c = montar();
    fireEvent.click(fab(c, 'magia'));
    /* A lista sai em ordem alfabética, então a primeira é Curas Físicas
       (nível 5) — Faro ganhou companhia na bancada em 28/10/2026, para a
       magia de alcance não-pessoal ter onde ser medida. */
    expect(no('.at-linha-meta-val').textContent).toBe('5');
    // O título voltou (agora é o do modal), mas o cabeçalho antigo não.
    expect(no('.at-panel-head')).toBeNull();
    fireEvent.click(fab(c, 'item'));
    expect(no('.at-linha-meta-val').textContent).toBe('x2');
  });

  it('Esc fecha', () => {
    const c = montar();
    fireEvent.click(fab(c, 'magia'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(modal()).toBeNull();
  });
});

/* ── A MAGIA GANHOU O PASSO (28/10/2026) ──────────────────────────────────
   "Pode fazer a magia agora." (usuário) — a última das três, e a que carrega
   regra de verdade: nível, alvo, karma, milagre bloqueado e ritual.

   NENHUM dos três tipos entrega mais no clique da linha: o clique abre o
   detalhe e quem entrega é o rodapé.

   A REGRA não mudou de lugar duas vezes: ela ficou na ficha
   (magiaPassoDoAtalho), que é quem tem o deus, os colegas, os animais e o
   inventário. A janela só desenha o que a função devolve — por isso o teste
   usa um passo dublê. */
describe('a magia: o passo da janela', () => {
  const abrir = (props = {}, nome = 'Faro') => {
    const c = montar(props);
    fireEvent.click(fab(c, 'magia'));
    fireEvent.click(todos('.at-linha').find((l) => l.textContent.includes(nome)));
    return c;
  };

  it('o clique na linha abre o detalhe e não evoca nada', () => {
    const cb = vi.fn();
    abrir({ onMagia: cb });
    expect(cb, 'o clique na linha não podia evocar').not.toHaveBeenCalled();
    expect(no('.mn-janela-corpo'), 'o passo do detalhe não abriu').toBeTruthy();
    expect(modal().textContent).toMatch(/Aguça o olfato/);
  });

  it('o quadro mostra karma, alcance e duração', () => {
    abrir();
    const linhas = todos('.mn-janela-linha').map((l) => l.textContent);
    // Karma começa no nível que a ficha tem (3), porque é dele que ele sai.
    expect(linhas).toEqual(['Karma3', 'AlcancePessoal', 'Duração1 hora']);
  });

  it('o nível é disco de um dígito, só com os aprendidos, e troca o karma', () => {
    abrir();
    const discos = todos('.mn-janela-pilula--disco');
    expect(discos.map((d) => d.textContent)).toEqual(['1', '3']);
    expect(discos[1].getAttribute('aria-pressed'), 'começa no nível da ficha').toBe('true');
    expect(modal().textContent).toMatch(/Rastro antigo — 3 horas/);
    fireEvent.click(discos[0]);
    expect(no('.mn-janela-linha').textContent, 'o karma segue o nível').toBe('Karma1');
    expect(modal().textContent).toMatch(/Rastro — 1 hora/);
  });

  /* "Magias de alcance pessoal não precisam escolher alvo." (usuário,
     28/10/2026) — a seção nem aparece, e o rodapé evoca com ele mesmo. */
  it('alcance pessoal não pergunta o alvo e evoca em quem lançou', () => {
    const cb = vi.fn();
    abrir({ onMagia: cb });
    expect(modal().textContent).not.toMatch(/Alvo/);
    expect(rodape('Evocar').disabled).toBe(false);
    fireEvent.click(rodape('Evocar'));
    expect(cb).toHaveBeenCalledWith('faro', { nivel: 3, alvo: { id: '7', nome: 'Alvira' } });
    expect(modal()).toBeNull();
  });

  it('com alvo a escolher, o rodapé só evoca depois da escolha', () => {
    const cb = vi.fn();
    abrir({ onMagia: cb }, 'Curas');
    expect(rodape('Evocar').disabled).toBe(true);
    expect(modal().textContent).toMatch(/Escolha o alvo/);
    const alvos = todos('.mn-janela-escolha:last-of-type .mn-janela-pilula');
    // "Em mim" primeiro: é o caso comum e o único que a ficha aplica na hora.
    expect(alvos.map((b) => b.textContent)).toEqual(['Em mim', 'Brom']);
    fireEvent.click(alvos[1]);
    expect(modal().textContent).toMatch(/o Mestre aplica o efeito no alvo/);
    fireEvent.click(rodape('Evocar'));
    expect(cb).toHaveBeenCalledWith('cura', { nivel: 5, alvo: { id: '9', nome: 'Brom' } });
  });

  /* As travas da janela antiga, uma por uma: milagre bloqueado, ritual sem
     itens e alvo bloqueado (o elo). Nenhuma some, e cada uma diz o porquê. */
  it.each([
    ['milagre bloqueado', { bloqueio: 'Sem religião' }, /Sem religião/],
    ['ritual sem itens', { ritual: { ok: false, faltam: [{ nome: 'Vela', precisa: 2, tem: 0 }] } }, /Faltam itens para o ritual/],
  ])('%s trava o rodapé e diz por quê', (_, extra, re) => {
    const cb = vi.fn();
    abrir({ onMagia: cb, magiaPasso: (k, n) => ({ ...passoFalso(k, n), ...extra }) });
    expect(rodape('Evocar').disabled).toBe(true);
    expect(no('.mn-janela-falta').textContent).toMatch(re);
  });

  it('o alvo bloqueado aparece desligado, com o motivo', () => {
    abrir({ magiaPasso: () => ({
      karma: 1, nota: null, euId: '7', ritual: null, bloqueio: null, semAlvo: false,
      alvos: [{ id: 'animal:1', nome: 'Lobo', bloqueio: 'Já tem elo' }],
    }) });
    const b = todos('.mn-janela-escolha:last-of-type .mn-janela-pilula')[0];
    expect(b.disabled).toBe(true);
    expect(b.textContent).toMatch(/Lobo · Já tem elo/);
  });

  /* A nota diz QUEM resolve quando não é a ficha — e é ela que substitui o
     seletor de karma extra da prévia: fora de combate uma magia de dano dura
     em rodadas, não pousa e não cobra karma, então um seletor ali não mudaria
     nada. Essa escolha é da batalha, onde a coluna de ataque é o karma gasto. */
  it('a nota do efeito que não pousa na ficha', () => {
    abrir({ magiaPasso: (k, n) => ({ ...passoFalso(k, n), karma: 0,
      nota: 'Dura em rodadas, então é magia de combate: evoque na batalha.' }) });
    expect(modal().textContent).toMatch(/evoque na batalha/);
    expect(modal().textContent).not.toMatch(/gasta .* de karma/);
  });

  /* ── O MESTRE NÃO É O DONO (28/10/2026) ─────────────────────────────────
     "Você precisa considerar a visão do mestre e a visão do jogador para as
     alterações. As vezes altera só pra um." (usuário)

     A barra de atalhos é dos dois, mas `aoEvocarMagia` só cobra karma e só
     aplica efeito quando quem clica é o DONO (podeEditarFoto). O quadro
     mostrava "Karma 5" para o Mestre e o clique não gastava nada — a janela
     prometia o que o código não faz. */
  it('quem não é o dono vê karma zero e a frase que não promete nada', () => {
    abrir({ magiaPasso: (k, n) => ({ ...passoFalso(k, n), karma: 0, dono: false }) });
    expect(no('.mn-janela-linha').textContent).toBe('Karma0');
    expect(modal().textContent).toMatch(/Só o dono da ficha gasta karma/);
    expect(modal().textContent).not.toMatch(/aplica o efeito em você/);
  });

  it('Voltar devolve à lista sem evocar nada', () => {
    const cb = vi.fn();
    abrir({ onMagia: cb });
    fireEvent.click(rodape('Voltar'));
    expect(cb).not.toHaveBeenCalled();
    expect(no('.mn-janela-corpo')).toBeNull();
    expect(todos('.at-linha')).toHaveLength(2);
  });
});

/* ── A HABILIDADE GANHOU O PASSO DE DETALHE (28/10/2026) ───────────────────
   "Eu quero refazer os modais ao clicar em magias, habilidades, técnicas e
   itens, ao clicar no trilho. Um novo layout mais próximo do modal de
   atividades." (usuário)

   Eram DUAS janelas: a lista fechava e outra abria por cima, com cartões de
   dificuldade que rolavam no SEGUNDO clique — e um balão flutuante precisava
   ensinar isso. Agora a janela troca de passo, a dificuldade é um disco de
   cor que acende no primeiro clique, e quem rola é o rodapé. */
describe('habilidade: a janela troca de passo e o rodapé rola', () => {
  const abrirDetalhe = (cb) => {
    const c = montar({ onHabilidade: cb });
    fireEvent.click(fab(c, 'habilidade'));
    fireEvent.click(todos('.at-linha').find((l) => l.textContent.includes('Furtividade')));
    return c;
  };

  it('clicar na linha não entrega nada: abre o detalhe', () => {
    const cb = vi.fn();
    abrirDetalhe(cb);
    expect(cb).not.toHaveBeenCalled();
    expect(document.querySelector('.mn-janela-corpo')).toBeTruthy();
    // O título passou a ser o nome da habilidade.
    expect(modal().textContent).toMatch(/Furtividade/);
  });

  it('são cinco discos de cor, com o nome e o modificador no aria-label', () => {
    abrirDetalhe(vi.fn());
    const discos = todos('.mn-janela-cor');
    expect(discos).toHaveLength(5);
    expect(discos.map((d) => d.getAttribute('aria-label'))).toEqual([
      'Fácil (+20)', 'Médio (0)', 'Difícil (−20)', 'Muito difícil (−40)', 'Absurdo (−60)',
    ]);
  });

  it('sem dificuldade o rodapé não rola, e diz por quê', () => {
    const cb = vi.fn();
    abrirDetalhe(cb);
    expect(rodape('Rolar').disabled).toBe(true);
    expect(modal().textContent).toMatch(/Escolha a dificuldade/);
    fireEvent.click(todos('.mn-janela-cor')[2]);
    expect(rodape('Rolar').disabled).toBe(false);
    fireEvent.click(rodape('Rolar'));
    expect(cb).toHaveBeenCalledWith('furtividade', { dificuldade: 'dificil' });
    expect(modal()).toBeNull();
  });

  it('Voltar devolve à lista sem entregar nada', () => {
    const cb = vi.fn();
    abrirDetalhe(cb);
    fireEvent.click(rodape('Voltar'));
    expect(cb).not.toHaveBeenCalled();
    expect(document.querySelector('.mn-janela-corpo')).toBeNull();
    expect(todos('.at-linha').length).toBeGreaterThan(0);
  });
});

/* ── O ITEM TAMBÉM GANHOU O PASSO (28/10/2026) ─────────────────────────────
   Mesma janela, mesmo molde: o que o item faz em NÚMEROS, e o rodapé usa. O
   item não pede escolha nenhuma — o que ele faz já está no quadro, e
   perguntar de novo seria confirmar duas vezes. */
describe('item: o detalhe mostra o efeito e o rodapé usa', () => {
  const abrir = (cb) => {
    const c = montar({ onItem: cb });
    fireEvent.click(fab(c, 'item'));
    fireEvent.click(todos('.at-linha').find((l) => l.textContent.includes('Poção Menor de Vigor')));
    return c;
  };

  it('clicar na linha abre o detalhe, com a quantidade no quadro', () => {
    const cb = vi.fn();
    abrir(cb);
    expect(cb).not.toHaveBeenCalled();
    const corpo = document.querySelector('.mn-janela-corpo');
    expect(corpo).toBeTruthy();
    expect(corpo.textContent).toMatch(/Quantidade/);
    expect(corpo.textContent).toMatch(/uma unidade/);
  });

  it('o rodapé usa, sem pedir escolha nenhuma', () => {
    const cb = vi.fn();
    abrir(cb);
    const usar = rodape('Usar');
    expect(usar, 'faltou o botão Usar').toBeTruthy();
    expect(usar.disabled, 'o item não pede escolha; o botão não pode nascer travado').toBe(false);
    fireEvent.click(usar);
    // Sem segundo argumento: o item não tem escolha a transportar.
    expect(cb).toHaveBeenCalledWith('i1');
    expect(modal()).toBeNull();
  });
});

describe('itemUsavelNoAtalho — só o que a janela deixaria Usar', () => {
  it.each([
    [{ grupo: 'Consumíveis' }, true],
    [{ grupo: 'Bebidas', tipo: 'L' }, true],
    [{ grupo: 'Armas', categoria_equip: 'mao' }, false],
    [{ grupo: 'Consumíveis', armazena: 4 }, false],
    [{ grupo: 'Consumíveis', magia: 'faro', nivel_magia: 3 }, false],
    // Pergaminho único (22/10/2026): nivel_magia nulo, continua fora do atalho.
    [{ grupo: 'Consumíveis', slug: 'pergaminho_faro', magia: 'Faro', nivel_magia: null }, false],
    [{ grupo: 'Ferramentas' }, false],
    [null, false],
  ])('%j → %s', (cat, esperado) => {
    expect(usavel(cat)).toBe(esperado);
  });
});

describe('a ficha liga os atalhos às janelas que já existiam', () => {
  const fonte = readFileSync(resolve(__dirname, 'ficha.jsx'), 'utf8');

  it('cada escolha abre a janela certa', () => {
    /* A habilidade ROLA DIRETO desde 28/10/2026: a dificuldade vem do rodapé
       da janela nova e não há segunda janela para abrir. */
    expect(fonte).toMatch(/onHabilidade=\{\(key, extra\) => \{/);
    expect(fonte, 'a conta das magias de dificuldade tem de seguir viva').toMatch(/passosDasMagiasAtivas\(magiasAtivas, alvoHab, magiasByKey\)/);
    expect(fonte).toMatch(/dificuldade_escolhida: extra\.dificuldade/);
    /* A magia EVOCA DIRETO desde 28/10/2026: nível e alvo saem do segundo
       passo da própria janela e o rodapé confirma. `setMagiaDetalheKey`
       continua vivo — é a janela da CONSULTA pelo Conhecimento. */
    expect(fonte).toMatch(/onMagia=\{\(key, extra\) => aoEvocarMagia\(\{ key,/);
    expect(fonte, 'a regra da magia tem de ficar na ficha, com os dados').toMatch(/magiaPasso=\{magiaPassoDoAtalho\}/);
    /* As regras que a janela nova herdou, uma por uma. Se alguma cair, uma
       evocação passa a valer onde não valia. */
    expect(fonte, 'o milagre bloqueado').toMatch(/window\.bloqueioMilagre/);
    expect(fonte, 'quem não pode RECEBER milagre sai da lista').toMatch(/window\.alvoDeMilagreBloqueado/);
    expect(fonte, 'o elo do animal').toMatch(/window\.bloqueioElo\(a, nivel, elosAtuais\)/);
    expect(fonte, 'o ritual').toMatch(/conferirItensDoRitual\(textoRitual/);
    expect(fonte, 'o karma de fora de combate').toMatch(/karmaDaEvocacaoForaDeCombate\(motivo, nivel\)/);
    /* O espelho da visão do Mestre: a janela só mostra karma quando quem
       clica é o dono, porque só aí aoEvocarMagia cobra. */
    expect(fonte, 'karma só para o dono').toMatch(/const dono = !!podeEditarFoto;/);
    expect(fonte).toMatch(/const karma = !dono \? 0/);
    expect(fonte, 'alcance pessoal não lista colegas').toMatch(/soEmSi \? \[\] : pjsDaHistoria/);
    /* O item USA DIRETO desde 28/10/2026: a janela nova mostra quantidade e
       efeito e confirma no rodapé, então não há por que abrir a janela cheia
       só para achar o botão Usar. Com mais de uma unidade, solicitarUsarFicha
       continua perguntando quantas. */
    expect(fonte).toMatch(/onItem=\{\(id\) => solicitarUsarFicha\(id\)\}/);
  });

  it('o dono e o Mestre, e só fora das abas que têm cópia própria do inventário', () => {
    // 'info' (Personagem) e 'conhecimento' dividiram Informações em 26/09/2026.
    // O Mestre também tem a barra desde 23/10/2026.
    expect(fonte).toMatch(/mostrarAtalhos = [^;]*\(podeEditarFoto \|\| isMestre\) && \(fpTab === 'ficha' \|\| fpTab === 'info' \|\| fpTab === 'conhecimento'\)/);
  });

  it('o main carrega os atalhos antes da ficha', () => {
    const main = readFileSync(resolve(__dirname, '../main.tsx'), 'utf8');
    expect(main.indexOf("./11-ficha/atalhos-ficha.jsx")).toBeGreaterThan(-1);
    expect(main.indexOf("./11-ficha/atalhos-ficha.jsx")).toBeLessThan(main.indexOf("./11-ficha/ficha.jsx"));
  });
});
