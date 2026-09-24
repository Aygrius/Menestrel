/* ============================================================
   token-avatar-preto.test.jsx — fundo preto, ícone branco
   ============================================================
   "O avatar dos combatentes deve ser fundo preto e ícone branco, (com
    exceção daqueles que possuem foto)." (usuário, 17/09/2026)

   Era um gradiente bronze com o glifo escuro por cima — o ícone de tipo de
   criatura (17/09/2026, token-icone-criatura.test.jsx) nasceu dentro dele e
   ficou com pouco contraste justamente nos tipos de traço fino.

   A exceção da foto não é um caso especial no código: a foto preenche o
   rosto inteiro (objectFit cover), então o fundo fica atrás dela e não
   aparece. O teste guarda isso mesmo assim, porque "com exceção daqueles que
   possuem foto" foi dito em voz alta e alguém pode querer um fundo por trás
   de uma foto transparente.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let TabuleiroToken;
beforeAll(() => {
  TabuleiroToken = window.TabuleiroToken;
  expect(TabuleiroToken, 'TabuleiroToken precisa estar no window').toBeTypeOf('function');
});
afterEach(cleanup);

const base = { nome: 'Balor', ef: 10, ef_max: 10, status: 'ativo', pos: { x: 0, y: 0 } };
const montar = (p) => render(
  <TabuleiroToken p={p} meta={null} size={34} onSelect={() => {}} />
);
const rosto = () => document.querySelector('.batalha-token-rosto');
const icone = () => document.querySelector('.batalha-token-rosto i');
const letra = () => document.querySelector('.batalha-token-rosto span:not([class])');

/* O jsdom normaliza cor para rgb(). Aceita as duas escritas para o teste não
   depender de qual hex exato o estilo usa — o que importa é ser preto. */
const PRETO = /^(rgb\(0,\s*0,\s*0\)|#000000|#000)$/i;

describe('o rosto do token é preto', () => {
  it('criatura com ícone', () => {
    montar({ ...base, tipo: 'criatura', ref_id: 1, raca: 'Dragão' });
    expect(rosto().style.background).toMatch(PRETO);
  });

  it('e também quem cai na inicial', () => {
    montar({ ...base, tipo: 'pj', ref_id: 1 });
    expect(rosto().style.background).toMatch(PRETO);
  });

  it('sem sobra do gradiente bronze de antes', () => {
    montar({ ...base, tipo: 'criatura', ref_id: 1, raca: 'Dragão' });
    expect(rosto().style.background).not.toMatch(/gradient/i);
  });
});

describe('o que vai por cima é branco', () => {
  /* Claro, não branco puro: o resto da paleta Pedra & Bronze usa #E8DDC6 para
     texto sobre escuro, e um #FFF aqui brigaria com ela. O teste exige
     luminosidade alta, não um hex específico — assim a paleta pode andar sem
     quebrar o teste, mas um glifo escuro volta a falhar. */
  const claro = (cor) => {
    const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(cor)
      || /#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(cor);
    expect(m, `cor ilegível: ${cor}`).toBeTruthy();
    const base16 = cor.startsWith('#') ? 16 : 10;
    return [1, 2, 3].map((i) => parseInt(m[i], base16));
  };

  it('o ícone do tipo de criatura', () => {
    montar({ ...base, tipo: 'criatura', ref_id: 1, raca: 'Dragão' });
    const [r, g, b] = claro(icone().style.color);
    expect(Math.min(r, g, b), icone().style.color).toBeGreaterThan(190);
  });

  it('a inicial de quem não tem ícone', () => {
    montar({ ...base, tipo: 'pj', ref_id: 1 });
    const [r, g, b] = claro(letra().style.color);
    expect(Math.min(r, g, b), letra().style.color).toBeGreaterThan(190);
  });
});

describe('a exceção da foto', () => {
  it('com foto não há ícone nem letra para colorir', () => {
    montar({ ...base, tipo: 'criatura', ref_id: 1, raca: 'Dragão', foto_url: 'http://x/y.png' });
    expect(document.querySelector('.batalha-token-rosto img')).toBeTruthy();
    expect(icone()).toBeNull();
    expect(letra()).toBeNull();
  });
});
