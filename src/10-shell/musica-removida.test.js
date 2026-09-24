/* ============================================================
   musica-removida.test.js — o sistema de música saiu do sistema
   ============================================================
   "remova o sistema de música do sistema, pode removê-lo por completo."
   (usuário, 16/09/2026)

   Era um subsistema inteiro, e não só um botão: o FAB mini-player, a página
   PlaylistMestre (seção especial "playlist"), o hook usePlaylistState, o
   iframe do YouTube e três chaves de localStorage. Remoção por completo quer
   dizer que nenhum desses pedaços pode voltar de carona — e como o player
   ocupava um degrau da coluna direita (top:136), os atalhos da ficha, que
   vinham logo abaixo, tinham que subir para a coluna não ficar com buraco.

   Verificação sobre o FONTE, como tooltip-padrao.test.js e mesa-e-sino.test.js:
   o que se afirma aqui é ausência, e ausência não se monta em jsdom.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (rel) => readFileSync(resolve(raiz, rel), 'utf8');
const shell = ler('10-shell/shell.jsx');
const css = ler('index.css');
const atalhos = ler('11-ficha/atalhos-ficha.jsx');

describe('nenhum pedaço do player sobreviveu no shell', () => {
  it.each([
    ['o mini-player', /MusicaPlayerFab/],
    ['a página de playlist', /PlaylistMestre/],
    ['o hook de estado', /usePlaylistState/],
    ['a faixa padrão', /MUSICA_(YT_ID|FAIXA)_PADRAO/],
    ['o embed do YouTube', /youtube-nocookie\.com/],
    ['as chaves de localStorage', /menestrel\.(musica|playlist)/],
    ["a seção especial 'playlist'", /'playlist'/],
  ])('%s', (_, re) => {
    expect(shell).not.toMatch(re);
  });
});

describe('e nem no CSS', () => {
  it.each([
    ['o container do player', /\.ma-root/],
    ['os ícones filled de play/pause', /\.ma-ic/],
    ['a página de playlist', /\.plist-/],
  ])('%s', (_, re) => {
    expect(css).not.toMatch(re);
  });
});

describe('a coluna direita fecha o buraco que o player deixou', () => {
  /* 16 D20 · 76 D10 · 136 era música. Os atalhos vinham em 196 e sobem um
     degrau (60px) — senão fica um vão visível entre o D10 e o primeiro atalho. */
  it('os atalhos da ficha começam no degrau que era do player', () => {
    const i = css.indexOf('.menestrel-ui.at-root {');
    expect(i).toBeGreaterThan(-1);
    expect(css.slice(i, css.indexOf('}', i))).toMatch(/--at-topo:\s*136px/);
  });

  it('e o mesmo salto vale no celular', () => {
    // O bloco de 640px redefine só as variáveis do at-root.
    expect(css).toMatch(/\.menestrel-ui\.at-root \{ --at-topo: 124px;/);
  });

  it('o comentário da coluna não promete mais um botão de música', () => {
    expect(atalhos).not.toMatch(/música/);
  });
});
