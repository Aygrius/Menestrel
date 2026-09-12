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

  it('e listadas com o MOTIVO de estarem fora', () => {
    /* Antes o painel mostrava as unidades lidas ("cura_eh"), que não dizem
       nada ao Mestre. Desde 12/09/2026 mostra o motivo: Melodia Zen exige
       meia hora de música ininterrupta. */
    montar([ORFA]);
    fireEvent.click(cabecalho());
    expect(screen.getByText('Melodia Zen')).toBeTruthy();
    expect(screen.getByText(/meia hora de música/)).toBeTruthy();
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

describe('a lista de fora-do-motor diz o MOTIVO e o que fazer', () => {
  /* O usuário perguntou "qual é a dificuldade com a magia Heroísmo?" e o
     painel não tinha como responder: listava nomes e parava aí. Uma lista sem
     motivo é inútil — nenhum item indica o que fazer com ele. */
  const montarOrfas = (magias) => render(
    <div className="menestrel-ui"><Painel magias={magias} lang="pt" /></div>
  );

  // `alcance` importa: é o que o predicado `resolvido` de Garras inspeciona.
  const GARRAS = { key: 'garras', nome: 'Garras', alcance: 'Pessoal',
                   nivel_1: 'Causa 12 de dano.' };
  const RITUAL = { key: 'manjar_de_lena', nome: 'Manjar de Lena',
                   nivel_1: 'Restaura 5 de energia heroica.' };
  const DESCONHECIDA = { key: 'magia_nova_qualquer', nome: 'Magia Nova',
                         nivel_1: 'Causa 9 de dano.' };

  it('separa "falta decisão sua" de "ritual, nada a fazer"', () => {
    montarOrfas([GARRAS, RITUAL]);
    fireEvent.click(cabecalho());
    expect(screen.getByText(/Falta uma decisão sua/)).toBeTruthy();
    // "nada a fazer" aparece duas vezes na tela — no título do grupo e no
    // rodapé das narrativas. Ancorar no título inteiro desambigua.
    expect(screen.getByText(/Ritual ou fora de combate/)).toBeTruthy();
  });

  it('mostra o motivo concreto, não só o nome', () => {
    montarOrfas([GARRAS]);
    fireEvent.click(cabecalho());
    // Garras: alcance Pessoal com dano em inimigo — trocar para Toque resolve.
    expect(screen.getByText(/alcance virar "Toque"/)).toBeTruthy();
  });

  it('magia SEM motivo registrado cai num grupo que convida a perguntar', () => {
    // É o caso que o Heroísmo era: candidata esquecida, não impossível.
    montarOrfas([DESCONHECIDA]);
    fireEvent.click(cabecalho());
    expect(screen.getByText(/vale perguntar/)).toBeTruthy();
  });

  it('Heroísmo saiu da lista — foi ligado em 12/09/2026', () => {
    const heroismo = { key: 'heroismo', nome: 'Heroísmo',
                       nivel_1: 'Restaura 8 de energia heroica.' };
    montarOrfas([heroismo]);
    expect(screen.getByText(/1 lidas corretamente/)).toBeTruthy();
  });
});

describe('a pendência SOME quando o texto é corrigido', () => {
  /* O caso que motivou isto: o usuário corrigiu Auxílio Natural — o texto
     dizia "dano máximo", que é ambíguo, e virou "dano" — e a magia continuou
     aparecendo com o motivo antigo. O painel dizia "falta uma decisão sua",
     ele decidiu, e nada percebeu.

     Agora cada pendência de decisão traz um predicado que olha o texto ATUAL.
     Resolvida, a magia muda de grupo e passa a dizer "pronta para entrar". */
  const montarUm = (m) => render(
    <div className="menestrel-ui"><Painel magias={[m]} lang="pt" /></div>
  );

  it('Garras com alcance Pessoal: ainda falta decisão', () => {
    montarUm({ key: 'garras', nome: 'Garras', alcance: 'Pessoal',
               nivel_1: 'Causa 12 de dano.' });
    fireEvent.click(cabecalho());
    expect(screen.getByText(/Falta uma decisão sua/)).toBeTruthy();
  });

  it('Garras com alcance Toque: PRONTA para entrar', () => {
    montarUm({ key: 'garras', nome: 'Garras', alcance: 'Toque',
               nivel_1: 'Causa 12 de dano.' });
    fireEvent.click(cabecalho());
    expect(screen.getByText(/Pronta para entrar/)).toBeTruthy();
    expect(screen.queryByText(/Falta uma decisão sua/)).toBeNull();
  });

  it('o grupo "pronta" vem PRIMEIRO — é o único acionável', () => {
    const { container } = render(
      <div className="menestrel-ui"><Painel lang="pt" magias={[
        { key: 'garras', nome: 'Garras', alcance: 'Toque', nivel_1: 'Causa 12 de dano.' },
        { key: 'manjar_de_lena', nome: 'Manjar', nivel_1: 'Restaura 5 de energia heroica.' },
      ]} /></div>
    );
    fireEvent.click(container.querySelector('.best-aud-head'));
    const titulos = [...container.querySelectorAll('.best-aud-titulo')].map((n) => n.textContent);
    expect(titulos[0]).toMatch(/Pronta para entrar/);
  });
});

describe('botão Conferir novamente', () => {
  /* A verificação recalcula sozinha quando a magia é salva pelo editor, mas
     não quando o catálogo muda por fora. A resposta que eu tinha dado para
     esse caso era "aperte F5" — ruim: recarrega a tela toda e perde a
     posição na lista. */
  const OK = { key: 'bencao', nome: 'Bênção',
               nivel_1: 'Aumenta 1 coluna de ataque e 5 de energia heroica.' };

  it('não aparece quando o painel não sabe recarregar', () => {
    render(<div className="menestrel-ui"><Painel magias={[OK]} lang="pt" /></div>);
    expect(screen.queryByText(/Conferir novamente/)).toBeNull();
  });

  it('aparece e chama o recarregador', async () => {
    let chamou = 0;
    render(<div className="menestrel-ui">
      <Painel magias={[OK]} lang="pt" onRecarregar={() => { chamou += 1; }} />
    </div>);
    fireEvent.click(screen.getByText(/Conferir novamente/));
    expect(chamou).toBe(1);
  });

  it('o clique NÃO abre nem fecha a faixa', () => {
    // Sem stopPropagation, o clique subiria para o <button> da faixa.
    const { container } = render(<div className="menestrel-ui">
      <Painel magias={[OK]} lang="pt" onRecarregar={() => {}} />
    </div>);
    expect(container.querySelector('.best-aud-corpo')).toBeNull();
    fireEvent.click(screen.getByText(/Conferir novamente/));
    expect(container.querySelector('.best-aud-corpo')).toBeNull();
  });
});
