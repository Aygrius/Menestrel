/* ============================================================
   mesa-e-sino.test.js — o sino clicável e a mesa que não troca sozinha
   ============================================================
   "Quando eu clico na aba 'personagens', não consigo clicar no ícone de log da
    mesa." e "Às vezes, o sistema muda de mesa sem minha autorização."
   (usuário, 15/09/2026)

   1. O SINO. A aba Personagens dá `z-index: 60` ao .mc-main (exceção antiga,
      para o card ganhar do pill da mesa). O .mc-main é contexto de
      empilhamento e cobre a área toda, então TODA camada flutuante abaixo de
      60 — sino, dado livre, atalhos da ficha — ficava por baixo e o clique
      morria nele. As três subiram para 70+. (A quarta camada era o player de
      música, removido do sistema em 16/09/2026.)

   2. A MESA. Falha ao listar as histórias virava lista VAZIA, lista vazia
      zerava a mesa ativa, e o carregamento seguinte caía na primeira história
      — trocando a mesa sozinho. Erro agora preserva o que já estava.

   São dois acordos de CSS e de fluxo que nenhum teste de render pega: o
   primeiro é ordem de camada (jsdom não calcula), o segundo é um caminho de
   erro. Por isso a verificação é sobre o arquivo-fonte, como em
   tooltip-padrao.test.js.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
/* As fases são carregadas de verdade (e não só lidas como texto) desde
   20/09/2026: a regra da mesa ativa virou função pura e passou a ser
   executável no teste. O resto do arquivo segue conferindo o FONTE, que é o
   único jeito de verificar ordem de camada e caminho de erro. */
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './shell.jsx';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(resolve(raiz, 'index.css'), 'utf8');
const shell = readFileSync(resolve(raiz, '10-shell/shell.jsx'), 'utf8');

const zDe = (seletor) => {
  const re = new RegExp(seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^}]*z-index:\\s*(\\d+)');
  const m = css.match(re);
  expect(m, 'não achei ' + seletor).toBeTruthy();
  return Number(m[1]);
};

describe('as camadas flutuantes ficam acima da área de conteúdo', () => {
  const zMcMainPjs = zDe('.mc-main:has(.pjs)');

  it.each([
    ['sino da mesa', '.menestrel-ui.cm-root'],
    ['dado livre', '.menestrel-ui.rl-root'],
    ['atalhos da ficha', '.menestrel-ui.at-root'],
  ])('%s fica acima do .mc-main da aba Personagens', (_, seletor) => {
    expect(zDe(seletor)).toBeGreaterThan(zMcMainPjs);
  });

  it('e todas continuam ABAIXO dos modais', () => {
    const zModal = zDe('.menestrel-ui .modal-backdrop');
    for (const s of ['.menestrel-ui.cm-root', '.menestrel-ui.rl-root', '.menestrel-ui.at-root']) {
      expect(zDe(s)).toBeLessThan(zModal);
    }
  });

  /* O pill da mesa continua ABAIXO do card de personagens: é o que a exceção
     do .mc-main existia para garantir. Só a barra com uma LISTA ABERTA sobe.

     A lista de mesas (.cdj-mesa-lista) era o exemplo original desta regra e
     saiu em 20/09/2026, junto com o dropdown de histórias — entrar numa mesa
     virou clicar no card. O acordo não mudou de forma nenhuma; mudou só quem
     o exercita, que hoje são as listas do clima e das horas. */
  it('o pill da mesa não sobe junto — a exceção do card continua valendo', () => {
    expect(zDe('.menestrel-ui.cdj-root')).toBeLessThan(zMcMainPjs);
    expect(zDe('.menestrel-ui.cdj-root:has(.cdj-hora-lista)')).toBeGreaterThan(zDe('.menestrel-ui.cm-root'));
  });
});

describe('a mesa ativa não troca sozinha', () => {
  it('erro ao listar histórias não vira lista vazia', () => {
    const trecho = shell.slice(shell.indexOf("from('historias').select('id, titulo, pausada').eq('mestre_id'"));
    const ate = trecho.slice(0, trecho.indexOf('setMinhasHistorias') + 40);
    expect(ate).toMatch(/if \(error\) \{[^}]*return;/);
    expect(ate).not.toMatch(/setMinhasHistorias\(error \?/);
  });

  it('erro ao resolver a história do PJ também preserva a mesa', () => {
    const i = shell.indexOf('const [histRes, pjRes]');
    const trecho = shell.slice(i, shell.indexOf('setDataNascPjAtivo', i));
    expect(trecho).toMatch(/if \(histRes\.error\)/);
    expect(trecho).toMatch(/else setMinhasHistorias/);
  });

  /* A REGRA SAIU DO EFEITO e virou função pura (proximaMesaAtiva, 20/09/2026),
     quando o dropdown de mesas deu lugar ao botão de sair. Este teste olhava o
     TEXTO do efeito; o acordo que ele protege — lista vazia de verdade zera a
     mesa — passou a ser verificável de verdade, executando a regra em vez de
     procurar a linha que a escrevia. A cobertura completa das novas condições
     está em 10-shell/mesa-ativa.test.js. */
  it('lista vazia de verdade continua zerando a mesa', () => {
    expect(globalThis.proximaMesaAtiva([], 7)).toBeNull();
  });

  /* O outro lado do mesmo acordo, e a razão de ele não ter virado "zera
     sempre": carregando (lista null) não é vazio, e não pode apagar a mesa
     salva no localStorage a cada recarga. */
  it('e carregando continua não zerando nada', () => {
    expect(globalThis.proximaMesaAtiva(null, 7)).toBeUndefined();
  });
});

/* ── O TRILHO DA CENA: SÓ ÍCONES (26/10/2026) ─────────────────────────────
   Três pedidos do usuário, em dias e horas seguidas — e é por isso que este
   bloco existe, com as datas na ordem:

     23/10: "coloque o sino de notificações na barra, depois de 'amigos'."
     22/10: "Escrever" — a hora e o clima ganharam a palavra ao lado do ícone.
     26/10 (manhã): "o botão 'notificação' deve ter o ícone e a palavra escrita."
     26/10 (tarde): "Localização, Horário, Umidade, Vento, Temperatura,
                     Notificações vão ser somente ícones, e o tooltip será a
                     informação dele."

   O estado final é o último: só a DATA continua escrita no trilho; o resto é
   ícone, e a informação vive no balão. O que quebra fácil aqui é a pílula
   voltar a ter largura automática (sobra de quando havia texto), ou um balão
   dizer só o rótulo — "Umidade" — em vez da informação. */
describe('o trilho da cena é só de ícones, com a informação no balão', () => {
  /* SÓ o ramo do TRILHO DA CENA. Os outros (trilho da ficha, menu lateral do
     Mestre) são botões de menu e seguem com o nome escrito — o pedido era
     sobre o trilho.

     Em 28/10/2026 a ordem dos ramos mudou: o trilho da FICHA passou a vir
     primeiro, porque o da cena está em toda tela da mesa e ganhava sempre —
     e com ele o Jogador nunca via o sino junto de Status e Atividades. Então
     a âncora deixou de ser o começo do encadeamento e passou a ser o `:
     alvoCena ?`, que é onde este ramo de fato começa. */
  const sino = (() => {
    const i = shell.indexOf(': alvoCena ? ReactDOM.createPortal');
    expect(i, 'o ramo do trilho da cena').toBeGreaterThan(-1);
    const fim = shell.indexOf(': alvoLateral && ehMestre', i);
    expect(fim, 'o ramo do trilho termina antes do sino do menu lateral').toBeGreaterThan(i);
    return shell.slice(i, fim);
  })();

  it('o sino não escreve mais a palavra na pílula', () => {
    expect(sino).toMatch(/cdj-bar cdj-sino/);
    expect(sino).not.toMatch(/<span>\{en \? 'Notifications' : 'Notificações'\}<\/span>/);
  });
  it('e tem balão próprio — ele desenha por portal e não alcança o do trilho', () => {
    expect(sino).toMatch(/propsTip\(abrirDicaSino, fecharDicaSino, rotuloSino\)/);
    expect(sino).toMatch(/<NavTooltip tip=\{dicaSino\}/);
  });
  it('as pílulas de ícone voltaram à largura fixa', () => {
    const i = css.indexOf('.menestrel-ui.cdj-root .cdj-bar.cdj-tempo,');
    expect(i, 'o bloco de largura das pílulas de ícone').toBeGreaterThan(-1);
    const regra = css.slice(i, css.indexOf('}', i));
    expect(regra).toMatch(/width:\s*32px/);
    expect(regra).toMatch(/padding:\s*0/);
    // A regra de 22/10 que forçava largura automática não pode voltar.
    expect(css).not.toMatch(/cdj-hora \{ width: auto !important/);
  });
  it('o contador do sino volta ao canto, sem esticar o botão', () => {
    const i = css.indexOf('.menestrel-ui.cdj-root .cdj-sino-badge {');
    const regra = css.slice(i, css.indexOf('}', i));
    expect(regra).toMatch(/position:\s*absolute/);
    expect(regra).toMatch(/background:\s*var\(--alerta\)/);
  });
  /* O balão é SÓ O TEXTO (26/10/2026, logo depois): "ao invés de 'Localização
     Farzelo' será apenas 'Farzelo', ao invés de 'Horário 12h Dia' será
     'Meio-Dia'." O ícone já diz a categoria; o rótulo no balão era eco. */
  it('o balão do clima diz só o degrau', () => {
    expect(shell).toMatch(/propsTip\(abrirTip, fecharTip, en \? degrau\.en : degrau\.pt\)/);
    expect(shell).not.toMatch(/propsTip\(abrirTip, fecharTip, texto\)/);
  });
  it('o balão do local diz só o lugar', () => {
    expect(shell).toMatch(/propsTip\(abrirTip, fecharTip, dataAtual\.local\)/);
    expect(shell).not.toMatch(/'Localização'\) \+ ' · '/);
  });
  it('o balão da hora diz a hora por extenso: 12h é "Meio-Dia"', () => {
    expect(shell).toMatch(/propsTip\(abrirTip, fecharTip, horaPorExtenso\(luz\.hora, en\)\)/);
    expect(shell).toMatch(/if \(n === 12\) return en \? 'Noon' : 'Meio-Dia';/);
    expect(shell).toMatch(/if \(n === 0\) return en \? 'Midnight' : 'Meia-Noite';/);
    // O resto reusa o vocabulário que o log já usa ("13h da tarde").
    expect(shell).toMatch(/return `\$\{n\}h \$\{periodoDoDia\(n, en\)\}`;/);
  });
  it('o balão do sino diz só a palavra — o contador já está na brasa', () => {
    expect(shell).toMatch(/const rotuloSino = en \? 'Notifications' : 'Notificações';/);
  });
  it('a DATA continua escrita — é a única fora da lista', () => {
    expect(shell).toMatch(/cdj-data-longa|cdj-data/);
    expect(css).toMatch(/\.cdj-data-curta \{ display: none; \}/);
  });
});
