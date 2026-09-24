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
    const trecho = shell.slice(shell.indexOf("from('historias').select('id, titulo').eq('mestre_id'"));
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
