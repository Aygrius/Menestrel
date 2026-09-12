/* ============================================================
   magias-auditoria-painel.test.jsx — a tela da verificação
   ============================================================
   A lógica está coberta em 01-core/magias-efeito.test.js. Aqui fica o que só
   a tela mostra: que o painel acende quando há problema, fica quieto quando
   não há, e que a lista de quebradas diz QUAL unidade sumiu — que é a
   informação de que o Mestre precisa para desfazer a edição.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/magias-efeito.jsx';
import './bestiario.jsx';

let Painel;
beforeAll(() => {
  Painel = window.MagiasAuditoriaPainel;
  expect(Painel, 'MagiasAuditoriaPainel não foi exposto no window').toBeDefined();
});
afterEach(cleanup);

const montar = (magias) => render(
  <div className="menestrel-ui"><Painel magias={magias} lang="pt" /></div>
);
const cabecalho = () => screen.getAllByRole('button')[0];

const BENCAO_OK = { key: 'bencao', nome: 'Bênção',
  nivel_1: 'Aumenta 1 coluna de ataque e 5 de energia heroica.' };
const BENCAO_QUEBRADA = { key: 'bencao', nome: 'Bênção',
  nivel_1: 'Aumenta 1 de defesa e 5 de energia heroica.' };

describe('o painel fica quieto quando está tudo certo', () => {
  it('não acende a borda de alerta', () => {
    const { container } = montar([BENCAO_OK]);
    expect(container.querySelector('.best-auditoria.com-problema')).toBeNull();
  });

  it('o resumo fechado diz quantas foram lidas', () => {
    montar([BENCAO_OK]);
    expect(screen.getByText(/1 lidas corretamente/)).toBeTruthy();
  });
});

describe('o painel acende quando a edição quebrou uma magia', () => {
  it('marca com-problema', () => {
    const { container } = montar([BENCAO_QUEBRADA]);
    expect(container.querySelector('.best-auditoria.com-problema')).toBeTruthy();
  });

  it('o resumo fechado já conta a quebrada, sem precisar abrir', () => {
    montar([BENCAO_QUEBRADA]);
    expect(screen.getByText(/1 quebrada\(s\)/)).toBeTruthy();
  });

  it('aberto, diz QUAL unidade sumiu', () => {
    // É a informação que permite desfazer a edição: o texto perdeu "coluna".
    montar([BENCAO_QUEBRADA]);
    fireEvent.click(cabecalho());
    expect(screen.getByText(/falta/)).toBeTruthy();
    expect(screen.getByText(/coluna/)).toBeTruthy();
  });
});

describe('o painel começa fechado', () => {
  it('a lista só aparece depois do clique', () => {
    const { container } = montar([BENCAO_QUEBRADA]);
    expect(container.querySelector('.best-aud-corpo')).toBeNull();
    fireEvent.click(cabecalho());
    expect(container.querySelector('.best-aud-corpo')).toBeTruthy();
  });
});

describe('órfãs aparecem como oportunidade, não como erro', () => {
  /* A fixture era Hidroproteção, que ENTROU no registro na varredura de
     12/09/2026 — órfã de exemplo precisa ser uma que siga de fora. Melodia Zen
     ficou por motivo registrado: exige meia hora de música ininterrupta, não
     é ação de combate. */
  const ORFA = { key: 'melodia_zen', nome: 'Melodia Zen',
    nivel_1: 'Durante meia hora de música, recuperando 8 de energia heroica.' };

  it('não acendem a borda de alerta', () => {
    const { container } = montar([ORFA]);
    expect(container.querySelector('.best-auditoria.com-problema')).toBeNull();
  });

  it('mas são contadas no resumo fechado', () => {
    montar([ORFA]);
    expect(screen.getByText(/1 sem registro/)).toBeTruthy();
  });

  it('e listadas com a unidade que o motor saberia ler', () => {
    montar([ORFA]);
    fireEvent.click(cabecalho());
    expect(screen.getByText('Melodia Zen')).toBeTruthy();
    expect(screen.getByText(/cura_eh/)).toBeTruthy();
  });
});

describe('a ajuda explica a regra de manutenção', () => {
  it('diz que número pode editar e forma não', () => {
    montar([BENCAO_OK]);
    fireEvent.click(cabecalho());
    expect(screen.getByText(/pode editar à vontade/)).toBeTruthy();
    expect(screen.getByText(/exige mudança no código/)).toBeTruthy();
  });
});

describe('não quebra com entrada vazia', () => {
  it('lista vazia renderiza sem lançar', () => {
    const { container } = montar([]);
    expect(container.querySelector('.best-auditoria')).toBeTruthy();
  });
});
