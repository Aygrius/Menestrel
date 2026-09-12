/* ============================================================
   magias-auditoria-painel.test.jsx — a tela da verificação
   ============================================================
   A lógica está coberta em 01-core/magias-efeito.test.js. Aqui fica o que só
   a tela mostra: que o painel acende quando há problema, fica quieto quando
   não há, e que a lista de quebradas diz QUAL unidade sumiu — que é a
   informação de que o Mestre precisa para desfazer a edição.
   ============================================================ */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
// game-data: a estatística por profissão lê GAME_DATA (profissões e especializações).
import '../01-core/game-data.jsx';
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

/* UMA PENDÊNCIA FICTÍCIA, injetada no registro só para estes testes.

   As fixtures de "falta uma decisão sua" já quebraram TRÊS vezes por usarem
   magia de verdade: Hidroproteção, depois Garras, depois Forçar Disputa —
   cada uma entrou no motor no dia seguinte, e o teste caiu junto. Em
   12/09/2026 o grupo esvaziou de vez: as três últimas decisões foram
   respondidas pelo usuário e não sobrou nenhuma magia real na classe.

   O que estes testes afirmam é sobre o MECANISMO — pendência com predicado
   muda de grupo quando o texto é corrigido —, não sobre qual magia está
   pendente. Então a fixture passa a ser inventada, e o esvaziamento do grupo
   (que é o estado saudável) deixa de derrubar a suíte. */
const PENDENCIA_FICTICIA = 'magia_de_teste_indecisa';
beforeAll(() => {
  window.MAGIA_FORA_DO_REGISTRO[PENDENCIA_FICTICIA] = {
    classe: 'decisao',
    motivo: 'O bônus é em quem — no conjurador ou no alvo? A descrição não diz.',
    resolvido: (m) => !/pessoal/i.test(m.alcance || ''),
  };
});
afterAll(() => { delete window.MAGIA_FORA_DO_REGISTRO[PENDENCIA_FICTICIA]; });

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

  const PENDENTE = { key: PENDENCIA_FICTICIA, nome: 'Magia Indecisa',
                     alcance: 'Pessoal', nivel_1: 'Aumenta 1 de velocidade.' };
  const RITUAL = { key: 'manjar_de_lena', nome: 'Manjar de Lena',
                   nivel_1: 'Restaura 5 de energia heroica.' };
  const DESCONHECIDA = { key: 'magia_nova_qualquer', nome: 'Magia Nova',
                         nivel_1: 'Causa 9 de dano.' };

  it('separa "falta decisão sua" de "ritual, nada a fazer"', () => {
    montarOrfas([PENDENTE, RITUAL]);
    fireEvent.click(cabecalho());
    expect(screen.getByText(/Falta uma decisão sua/)).toBeTruthy();
    // "nada a fazer" aparece duas vezes na tela — no título do grupo e no
    // rodapé das narrativas. Ancorar no título inteiro desambigua.
    expect(screen.getByText(/Ritual ou fora de combate/)).toBeTruthy();
  });

  it('mostra o motivo concreto, não só o nome', () => {
    montarOrfas([PENDENTE]);
    fireEvent.click(cabecalho());
    expect(screen.getByText(/é em quem/)).toBeTruthy();
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

  // O predicado da pendência fictícia olha `alcance` (ver o topo do arquivo).
  const SEM_DONO  = { key: PENDENCIA_FICTICIA, nome: 'Magia Indecisa',
                      alcance: 'Pessoal', nivel_1: 'Aumenta 1 de velocidade.' };
  const COM_DONO  = { key: PENDENCIA_FICTICIA, nome: 'Magia Indecisa',
                      alcance: 'Toque', nivel_1: 'Aumenta 1 de velocidade.' };

  it('sem dizer de quem é o bônus: ainda falta decisão', () => {
    montarUm(SEM_DONO);
    fireEvent.click(cabecalho());
    expect(screen.getByText(/Falta uma decisão sua/)).toBeTruthy();
  });

  it('texto dizendo "no alvo": PRONTA para entrar', () => {
    montarUm(COM_DONO);
    fireEvent.click(cabecalho());
    expect(screen.getByText(/Pronta para entrar/)).toBeTruthy();
    expect(screen.queryByText(/Falta uma decisão sua/)).toBeNull();
  });

  it('o grupo "pronta" vem PRIMEIRO — é o único acionável', () => {
    const { container } = render(
      <div className="menestrel-ui"><Painel lang="pt" magias={[
        COM_DONO,
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

describe('o painel diz qual MOTOR está carregado', () => {
  /* A confusão que motivou isto: o usuário corrigiu o texto de duas magias,
     eu as liguei no motor, ele clicou em "Conferir novamente" e as duas
     continuaram na lista. Estava certo dos dois lados — o botão rebusca o
     CATÁLOGO (dados), e o motor (código) veio no JS que o navegador já tinha
     carregado. Nada na tela dizia que eram duas coisas com prazos diferentes. */
  const OK = { key: 'bencao', nome: 'Bênção',
               nivel_1: 'Aumenta 1 coluna de ataque e 5 de energia heroica.' };

  it('mostra o tamanho do registro deste bundle', () => {
    render(<div className="menestrel-ui"><Painel magias={[OK]} lang="pt" /></div>);
    fireEvent.click(cabecalho());
    const n = Object.keys(window.MAGIA_EFEITO_MAP).length;
    expect(screen.getByText(new RegExp(`${n} magias`))).toBeTruthy();
  });

  it('e explica que o botão não traz motor novo', () => {
    render(<div className="menestrel-ui"><Painel magias={[OK]} lang="pt" /></div>);
    fireEvent.click(cabecalho());
    expect(screen.getByText(/só chega recarregando a página/)).toBeTruthy();
  });
});

describe('a hora prova que o botão rodou', () => {
  /* Um clique que não muda nada na lista era indistinguível de um clique que
     não funcionou. A hora muda sempre. */
  const OK = { key: 'bencao', nome: 'Bênção',
               nivel_1: 'Aumenta 1 coluna de ataque e 5 de energia heroica.' };

  it('não aparece antes do primeiro clique', () => {
    render(<div className="menestrel-ui">
      <Painel magias={[OK]} lang="pt" onRecarregar={() => {}} />
    </div>);
    expect(screen.queryByText(/conferido às/)).toBeNull();
  });

  it('aparece depois', async () => {
    render(<div className="menestrel-ui">
      <Painel magias={[OK]} lang="pt" onRecarregar={async () => {}} />
    </div>);
    fireEvent.click(screen.getByText(/Conferir novamente/));
    expect(await screen.findByText(/conferido às/)).toBeTruthy();
  });
});

describe('estatísticas do catálogo', () => {
  /* "Na página de conferência, informa uma estatística de magias. Quantas
     magias para cada profissão, magias de suporte, de ataque, etc." */
  it('aparecem ao abrir a conferência, com a tabela por profissão', () => {
    const { container } = render(
      <div className="menestrel-ui"><Painel lang="pt" magias={[
        { key: 'bola_de_fogo', nome: 'Bola de Fogo', permissao: 'Mago', tipo: 'Básica',
          nivel_1: 'Causa 12 de dano elemental de fogo.' },
        { key: 'curas_fisicas', nome: 'Curas Físicas', permissao: 'Sacerdote', tipo: 'Básica',
          nivel_1: 'Restaura 10 de energia física.' },
      ]} /></div>
    );
    fireEvent.click(container.querySelector('.best-aud-head'));
    expect(container.querySelector('.best-est-titulo').textContent).toMatch(/Estatísticas do catálogo · 2/);
    const linhas = [...container.querySelectorAll('.best-est-profissoes tbody tr')]
      .map((tr) => tr.querySelector('td').textContent);
    expect(linhas.sort()).toEqual(['Mago', 'Sacerdote']);
    expect(container.textContent).toMatch(/Ataque 1/);
    expect(container.textContent).toMatch(/Cura 1/);
    // e a tabela por elemento: Bola de Fogo é dano de fogo
    const fogo = [...container.querySelectorAll('.best-est-elementos tbody tr')]
      .find((tr) => tr.querySelector('td').textContent === 'Fogo');
    expect(fogo.querySelectorAll('td')[1].textContent).toBe('1');
  });
});
