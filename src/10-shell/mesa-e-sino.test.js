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
/* 16/11/2026, usuário: "No trilho inferior do rodapé, mostre o texto junto com
   o ícone em localização, temperatura, etc." — o texto volta à pílula (local,
   hora, clima), e o balão passa a dizer O QUE é o botão, como o do
   Calendário. O sino continua só ícone. */
describe('o trilho da cena mostra ícone e texto, e o balão diz o que é', () => {
  it('local, hora e clima têm o texto na pílula, com largura automática', () => {
    expect(shell).toMatch(/<span className="cdj-rotulo">\{dataAtual\.local\}<\/span>/);
    expect(shell).toMatch(/<span className="cdj-rotulo">\{horaPorExtenso\(luz\.hora, en\)\}<\/span>/);
    expect(shell).toMatch(/<span className="cdj-rotulo">\{en \? degrau\.en : degrau\.pt\}<\/span>/);
    expect(css).toMatch(/\.cdj-trilho \.cdj-bar:has\(> \.cdj-rotulo\) \{ width: auto;/);
    // O sino segue redondo.
    expect(css).toMatch(/\.cdj-bar\.cdj-sino \{\s*width: 32px;/);
  });
  it('o balão do clima diz a categoria (o degrau já está escrito)', () => {
    // 17/11/2026: só no pé da ficha (soIcones) o balão leva também o degrau.
    expect(shell).toMatch(/propsTip\(abrirTip, fecharTip, \(trilha\.chave === 'agua' \? \(en \? 'Humidity' : 'Umidade'\) : nomeTrilha\) \+ \(soIcones \? ' · ' \+ \(en \? degrau\.en : degrau\.pt\) : ''\)\)/);
    expect(shell).not.toMatch(/propsTip\(abrirTip, fecharTip, texto\)/);
  });
  it('o balão do local diz "Localização" (o lugar já está escrito)', () => {
    expect(shell).toMatch(/propsTip\(abrirTip, fecharTip, soIcones && dataAtual && dataAtual\.local \? [^\n]* : \(en \? 'Location' : 'Localização'\)\)/);
  });
  it('a hora por extenso na pílula: 12h é "Meio-Dia"', () => {
    expect(shell).toMatch(/propsTip\(abrirTip, fecharTip, soIcones \? [^\n]* : \(en \? 'Time' : 'Horário'\)\)/);
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

/* SÓ ÍCONES NO PÉ DA FICHA (17/11/2026, usuário: "quando houver outros trilhos
   tipo peso e experiência não cabe o nome e os ícones [...] use só ícones"). */
describe('no pé da ficha, só os ícones', () => {
  it('o CSS esconde os textos da faixa ao lado de Experiência e Peso', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');
    expect(css).toMatch(/\.fp3-rodape-tres \.fp3-rodape-dados :is\(\.cdj-data, \.cdj-rotulo, \.cdj-vazio\) \{ display: none; \}/);
  });
  it('o trilho sabe quando está lá', () => {
    expect(shell).toMatch(/const soIcones = !!\(alvoRodape && alvoRodape\.classList && alvoRodape\.classList\.contains\('fp3-rodape-dados'\)\);/);
  });
});
