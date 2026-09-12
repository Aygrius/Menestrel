/* ============================================================
   tecnicas-auditoria-painel.test.jsx — a verificação das técnicas
   ============================================================
   O painel das magias existia desde 11/09/2026; o das técnicas não. A falta
   custou caro: quando o usuário pediu a verificação dos itens, a varredura
   encontrou 8 técnicas fora do motor que ninguém tinha como enxergar — nem
   ele, nem eu, sem comparar catálogo e registro na mão.

   O que este arquivo trava é o que só a tela mostra. A lógica está em
   01-core/tecnicas-efeito.jsx (auditarTecnicas).

   A regra verificada aqui é O OPOSTO da das magias, e o painel precisa dizer
   isso: no texto da magia o número VALE; no da técnica, o número é decorativo
   — quem manda é o código.
   ============================================================ */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import './bestiario.jsx';

let Painel;
beforeAll(() => {
  Painel = window.TecnicasAuditoriaPainel;
  expect(Painel, 'TecnicasAuditoriaPainel não foi exposto no window').toBeDefined();
});
afterEach(cleanup);

const montar = (tecnicas, extra = {}) => render(
  <div className="menestrel-ui"><Painel tecnicas={tecnicas} lang="pt" {...extra} /></div>
);
const cabecalho = () => screen.getAllByRole('button')[0];

// Cópias literais do banco.
const MIRA_OK = { key: 'mira', nome: 'Mira',
  efeito: 'Seu total de Mira é adicionado à sua coluna de ataque por 1 rodada.' };
const MIRA_DIVERGENTE = { key: 'mira', nome: 'Mira',
  efeito: 'Seu total de Mira é adicionado à sua coluna de ataque por 5 rodadas.' };
const SANGRAMENTO_OK = { key: 'sangramento', nome: 'Sangramento',
  efeito: 'Um teste de Sangramento (Difícil) causa 1 de dano na energia física em 1 alvo por 5 rodadas.' };
const SANGRAMENTO_DIF = { key: 'sangramento', nome: 'Sangramento',
  efeito: 'Um teste de Sangramento (Fácil) causa 1 de dano na energia física em 1 alvo por 5 rodadas.' };
const PROVOCAR = { key: 'provocar', nome: 'Provocar',
  efeito: 'Um teste de Provocar (Difícil) atrai a atenção de 1 alvo por 5 rodadas.' };
const CONDUZIR = { key: 'conduzir_oponente', nome: 'Conduzir Oponente',
  efeito: 'Um teste de Conduzir Oponente (Médio) move 1 alvo por 5 metros por 2 rodadas.' };
const DESCONHECIDA = { key: 'tecnica_nova_qualquer', nome: 'Técnica Nova',
  efeito: 'Seu total é adicionado a algo por 2 rodadas.' };

describe('fica quieto quando texto e motor concordam', () => {
  it('não acende a borda de alerta', () => {
    const { container } = montar([MIRA_OK, SANGRAMENTO_OK]);
    expect(container.querySelector('.best-auditoria.com-problema')).toBeNull();
  });

  it('o resumo fechado diz quantas estão em acordo', () => {
    montar([MIRA_OK]);
    expect(screen.getByText(/1 em acordo com o motor/)).toBeTruthy();
  });
});

describe('acende quando o texto foi editado e o motor não', () => {
  /* É o caso que o painel existe para pegar. Nas magias, editar o número
     muda o efeito; nas técnicas, muda só a promessa da tela. */
  it('marca com-problema', () => {
    const { container } = montar([MIRA_DIVERGENTE]);
    expect(container.querySelector('.best-auditoria.com-problema')).toBeTruthy();
  });

  it('diz os DOIS números — o do texto e o do motor', () => {
    montar([MIRA_DIVERGENTE]);
    fireEvent.click(cabecalho());
    expect(screen.getByText(/o texto diz rodadas 5, o motor usa 1/)).toBeTruthy();
  });

  it('pega divergência de DIFICULDADE também, não só de rodadas', () => {
    montar([SANGRAMENTO_DIF]);
    fireEvent.click(cabecalho());
    expect(screen.getByText(/dificuldade facil.*motor usa dificil/)).toBeTruthy();
  });

  it('Explorar Fraqueza não declara duração no texto e NÃO é divergência', () => {
    // Texto sem "por N rodadas" não tem com o que discordar.
    const ef = { key: 'explorar_fraqueza', nome: 'Explorar Fraqueza',
      efeito: 'Seu total de Explorar Fraqueza é adicionado à sua coluna de ataque e ignora a armadura do adversário.' };
    const { container } = montar([ef]);
    expect(container.querySelector('.best-auditoria.com-problema')).toBeNull();
  });
});

describe('as que estão fora do motor vêm com o MOTIVO', () => {
  /* Em 12/09/2026 o usuário reclassificou Provocar e Conduzir Oponente: as
     duas são sobre o que o ADVERSÁRIO faz, e quem conduz o adversário é o
     Mestre. Saíram de "falta sistema" para "o Mestre resolve" — que não é
     pendência, é o desenho.

     E no mesmo dia o grupo "falta sistema" ESVAZIOU: Luta às Cegas era a
     última, e entrou quando o tabuleiro ganhou escuridão. Por isso a fixture
     aqui é INVENTADA — a lição que as magias já tinham dado três vezes: usar
     técnica real como exemplo de pendência quebra o teste no dia em que ela
     deixa de ser pendência, e o que se afirma é sobre o AGRUPAMENTO. */
  const FICTICIA_SISTEMA = 'tecnica_de_teste_sem_sistema';
  beforeAll(() => {
    window.TECNICA_FORA_DO_REGISTRO[FICTICIA_SISTEMA] = {
      classe: 'sistema', motivo: 'Precisa de um subsistema que o combate não tem.',
    };
  });
  afterAll(() => { delete window.TECNICA_FORA_DO_REGISTRO[FICTICIA_SISTEMA]; });
  const SEM_SISTEMA = { key: FICTICIA_SISTEMA, nome: 'Técnica Impossível',
    efeito: 'Um teste de Técnica Impossível (Difícil) faz algo por 3 rodadas.' };

  it('separa "o Mestre resolve" de "falta sistema"', () => {
    montar([PROVOCAR, SEM_SISTEMA]);
    fireEvent.click(cabecalho());
    expect(screen.getByText(/O Mestre resolve na mesa/)).toBeTruthy();
    expect(screen.getByText(/Falta um sistema/)).toBeTruthy();
  });

  it('mostra o motivo concreto, não só o nome', () => {
    montar([PROVOCAR]);
    fireEvent.click(cabecalho());
    expect(screen.getByText(/o Mestre conduz/)).toBeTruthy();
  });

  it('e diz que "o Mestre resolve" é de propósito, não pendência', () => {
    montar([CONDUZIR]);
    fireEvent.click(cabecalho());
    expect(screen.getByText(/é assim de propósito/)).toBeTruthy();
    expect(screen.getByText(/move o token do alvo/)).toBeTruthy();
  });

  it('técnica sem motivo registrado convida a perguntar', () => {
    montar([DESCONHECIDA]);
    fireEvent.click(cabecalho());
    expect(screen.getByText(/vale perguntar/)).toBeTruthy();
  });

  it('estar fora do motor NÃO acende alerta — é oportunidade, não erro', () => {
    const { container } = montar([PROVOCAR]);
    expect(container.querySelector('.best-auditoria.com-problema')).toBeNull();
  });
});

describe('a ajuda diz a regra INVERTIDA das técnicas', () => {
  /* O guia de manutenção ensina "número muda sozinho" para magias. Se o
     painel das técnicas não contradisser isso explicitamente, o Mestre edita
     "por 5 rodadas" e acha que mudou o jogo. */
  it('diz que o número mora no código', () => {
    montar([MIRA_OK]);
    fireEvent.click(cabecalho());
    expect(screen.getByText(/mora no CÓDIGO/)).toBeTruthy();
    expect(screen.getByText(/AO CONTRÁRIO das magias/)).toBeTruthy();
  });

  it('e mostra qual motor está carregado neste navegador', () => {
    montar([MIRA_OK]);
    fireEvent.click(cabecalho());
    const n = Object.keys(window.TECNICA_EFEITO_MAP).length;
    expect(screen.getByText(new RegExp(`${n} técnicas`))).toBeTruthy();
  });
});

describe('o botão Conferir novamente', () => {
  it('não aparece sem recarregador', () => {
    montar([MIRA_OK]);
    expect(screen.queryByText(/Conferir novamente/)).toBeNull();
  });

  it('chama o recarregador e carimba a hora', async () => {
    let chamou = 0;
    montar([MIRA_OK], { onRecarregar: async () => { chamou += 1; } });
    fireEvent.click(screen.getByText(/Conferir novamente/));
    expect(chamou).toBe(1);
    expect(await screen.findByText(/conferido às/)).toBeTruthy();
  });
});

describe('não quebra com entrada vazia', () => {
  it('lista vazia renderiza', () => {
    const { container } = montar([]);
    expect(container.querySelector('.best-auditoria')).toBeTruthy();
  });
});
