/* ============================================================
   ficha-pausada.test.js — aventura pausada tranca o Jogador, não o Mestre
   ============================================================
   "O jogador não deve conseguir entrar na sua ficha quando a aventura estiver
    pausada, o mestre entra normalmente." (usuário, 17/09/2026)

   O portão já existia — `if (pausado && !isMestre)` devolve a tela "História
   pausada" antes de qualquer conteúdo. O que NÃO existia era a espera: o
   portão lê `historiaPj`, que chega por uma busca assíncrona, e o guarda de
   carregamento acima dele só esperava pj/catálogo/magias/técnicas/habilidades.
   Enquanto a história não voltava, `pausada` era undefined, o portão deixava
   passar e a ficha INTEIRA renderizava por um instante — com autosave e edição
   ligados. Numa tela que agora abre sozinha ao entrar na seção Personagens,
   esse instante é o caminho normal, não um caso de borda.

   A ficha inteira só monta com banco; o que se afirma é a ordem dos portões no
   fonte — mesmo caminho de armadura-karma-ficha.test.jsx.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'ficha.jsx'), 'utf8');

describe('o portão da pausa', () => {
  it('existe e vale só para quem não é Mestre', () => {
    expect(fonte).toMatch(/const pausado = !!historiaPj\?\.pausada;/);
    expect(fonte).toMatch(/if \(pausado && !isMestre\) \{/);
  });

  it('a tela de pausa vem ANTES de qualquer conteúdo da ficha', () => {
    const iPortao = fonte.indexOf('if (pausado && !isMestre) {');
    const iConteudo = fonte.indexOf('const fpTabsEl = (');
    expect(iPortao).toBeGreaterThan(0);
    expect(iPortao, 'o portão tem que vir antes do corpo da ficha').toBeLessThan(iConteudo);
  });
});

describe('e o Jogador espera a história ser resolvida', () => {
  it('há um sinal de que a busca terminou', () => {
    expect(fonte).toMatch(/const \[historiaResolvida, setHistoriaResolvida\] = useState\(false\)/);
    expect(fonte).toMatch(/setHistoriaResolvida\(true\)/);
  });

  /* Sem esta espera, `pausada` é undefined durante o carregamento e o portão
     deixa a ficha inteira aparecer por um instante. */
  it('o Jogador segura o render até lá; o Mestre não', () => {
    const i = fonte.indexOf('if (!isMestre && !historiaResolvida) {');
    expect(i, 'falta a espera do Jogador').toBeGreaterThan(0);
    expect(fonte.slice(i, i + 120)).toMatch(/Carregando/);
  });

  it('e essa espera vem antes do portão da pausa', () => {
    const iEspera = fonte.indexOf('if (!isMestre && !historiaResolvida) {');
    const iPortao = fonte.indexOf('if (pausado && !isMestre) {');
    expect(iEspera).toBeLessThan(iPortao);
  });

  /* A marcação tem que acontecer em QUALQUER desfecho da busca — inclusive
     quando a história não vem (PJ sem mesa). Marcar só no ramo de sucesso
     deixaria o Jogador sem mesa preso no "Carregando" para sempre. */
  it('o sinal é marcado antes de decidir se a história veio', () => {
    const iMarca = fonte.indexOf('setHistoriaResolvida(true)');
    const iRamo = fonte.indexOf('if (!histRes.error && histRes.data) {');
    expect(iMarca).toBeGreaterThan(0);
    expect(iMarca, 'marcar dentro do ramo prende quem não tem mesa').toBeLessThan(iRamo);
  });
});
