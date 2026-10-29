/* ============================================================
   atividade-seletor.test.jsx — o círculo de atividade da ficha
   ============================================================
   "Adicione um botão na ficha para o jogador escolher entre as condições:
    Dormindo, Meditando, Orando, Estudando, Treinando." (usuário, 24/09/2026)

   Mestre e dono escolhem; quem só olha vê a atividade ligada e não mexe.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/clima-desgaste.jsx';
import '../01-core/game-data.jsx';
/* O shell entra por causa do ModalShell (27/10/2026): desde que escolher
   abre um passo de confirmação, o rodapé com Cancelar e o verbo é DELE.
   Sem o shell carregado o seletor cai no caminho de reserva, sem janela e
   sem rodapé — e o teste mediria uma tela que ninguém vê. */
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';
import './ficha.jsx';

let Seletor;
beforeAll(() => { Seletor = window.FichaAtividadeSeletor; expect(Seletor).toBeDefined(); });
afterEach(cleanup);

const botao = () => document.querySelector('.fp-atividade-wrap .fp-status-seletor');
/* A lista sai por PORTAL para a raiz do app (ou, sem ela, o body), e por
   isso não se procura mais dentro do `.fp-atividade-wrap`: o botão fica
   no trilho e a janela nasce no meio da tela. */
const opcoes = () => Array.from(document.querySelectorAll('.fp-status-opcao'));

describe('FichaAtividadeSeletor', () => {
  /* ── OS NOMES VIRARAM VERBOS, E ESCOLHER PASSOU A PERGUNTAR (27/10/2026) ──
     "Em 'atividades' vamos mudar o nome para: Dormir, Meditar, Orar,
     Estudar, Treinar, Praticar. Remover Nenhuma. Ao clicar, adicione um
     modal explicando o que aquela atividade faz e os botões de 'Dormir,
     Meditar, etc' e 'Cancelar'." (usuário)

     Três mudanças de contrato num pedido só, e os testes abaixo guardam as
     três. As CHAVES não mudaram (`dormindo`, `meditando`…): elas estão
     gravadas em toda ficha que já existe. */
  it('abre as seis atividades, agora no infinitivo', () => {
    render(<Seletor atividade={null} podeEditar lang="pt" onEscolher={() => {}} />);
    act(() => { botao().click(); });
    expect(opcoes().map((li) => li.textContent)).toEqual(['Dormir', 'Meditar', 'Orar', 'Estudar', 'Treinar', 'Praticar']);
  });

  /* Clicar não aplica mais: abre a explicação, e quem aplica é o rodapé. */
  it('clicar explica antes; só o rodapé escolhe', () => {
    const escolhas = [];
    render(<Seletor atividade={null} podeEditar lang="pt" atributos={{ carisma: 3, fisico: 2, aura: 1 }}
      onEscolher={(t) => escolhas.push(t)} />);
    act(() => { botao().click(); });
    act(() => { opcoes()[0].click(); });
    expect(escolhas, 'o clique na linha não podia aplicar nada').toEqual([]);
    const expl = document.querySelector('.mn-janela-corpo');
    expect(expl, 'a explicação não abriu').toBeTruthy();
    // O porquê e o efeito, com o número DESTE personagem (10 + 3 de carisma).
    expect(expl.textContent).toMatch(/oito horas/);
    expect(expl.textContent).toMatch(/\+13/);
    const confirmar = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Dormir');
    expect(confirmar, 'faltou o botão com o verbo no rodapé').toBeTruthy();
    act(() => { confirmar.click(); });
    expect(escolhas).toEqual(['dormindo']);
  });

  it('"Nenhuma" saiu da lista; parar é a própria atividade ligada', () => {
    const escolhas = [];
    render(<Seletor atividade={{ tipo: 'meditando' }} podeEditar lang="pt" onEscolher={(t) => escolhas.push(t)} />);
    expect(document.querySelector('.fp-atividade-nome')).toBeNull();
    expect(botao().getAttribute('aria-label')).toBe('Meditar');
    expect(botao().classList.contains('is-ativo')).toBe(true);
    act(() => { botao().click(); });
    expect(opcoes().map((li) => li.textContent)).not.toContain('Nenhuma');
    const meditar = opcoes().find((li) => li.textContent === 'Meditar');
    act(() => { meditar.click(); });
    /* Já está nela: o rodapé oferece Parar, e Parar grava null. Quem diz
       "é o que ele faz agora" é o próprio botão — a frase por extenso saiu
       em 27/10/2026, a pedido do usuário. */
    expect(document.querySelector('.mn-janela-agora')).toBeNull();
    const parar = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Parar');
    expect(parar, 'faltou o botão Parar').toBeTruthy();
    act(() => { parar.click(); });
    expect(escolhas).toEqual([null]);
  });

  /* "VOLTAR", não "Cancelar" (27/10/2026, usuário) — e o botão é mais
     honesto assim: nada foi gravado, logo não há o que cancelar; ele volta à
     lista. A seta que fazia isso no título saiu no mesmo pedido. */
  it('Voltar devolve à lista sem gravar nada', () => {
    const escolhas = [];
    render(<Seletor atividade={null} podeEditar lang="pt" onEscolher={(t) => escolhas.push(t)} />);
    act(() => { botao().click(); });
    act(() => { opcoes()[1].click(); });
    const voltar = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Voltar');
    expect(voltar, 'faltou o botão Voltar no rodapé').toBeTruthy();
    act(() => { voltar.click(); });
    expect(escolhas).toEqual([]);
    expect(document.querySelector('.mn-janela-corpo')).toBeNull();
    expect(opcoes()).toHaveLength(6);
  });

  it('quem não pode editar vê a atividade e não abre a lista', () => {
    render(<Seletor atividade={{ tipo: 'orando' }} podeEditar={false} lang="pt" onEscolher={() => {}} />);
    expect(botao().getAttribute('data-atividade')).toBe('orando');
    act(() => { botao().click(); });
    expect(opcoes()).toHaveLength(0);
  });

  it('quem não pode editar e não tem atividade não vê nada', () => {
    render(<Seletor atividade={null} podeEditar={false} lang="pt" onEscolher={() => {}} />);
    expect(botao()).toBeNull();
  });
});

/* "Ao clicar em treinando, não adicione o texto na barra de menus."
   (usuário, 22/10/2026) — e depois para todas: "Remova a palavra
   'Estudando', etc do menu atividade da ficha". O círculo mostra o ícone. */
describe('nenhuma atividade escreve o nome ao lado', () => {
  it.each(['dormindo', 'meditando', 'orando', 'estudando', 'treinando', 'praticando'])('%s ligado, não escreve o nome na barra', (tipo) => {
    render(<Seletor atividade={{ tipo }} podeEditar lang="pt" onEscolher={() => {}} />);
    expect(document.querySelector('.fp-atividade-nome')).toBeNull();
    expect(botao().getAttribute('data-atividade')).toBe(tipo);
  });
});

/* "a técnica vai aparecer no menu treinando" (usuário, 22/10/2026): cada
   atividade lista a sua fila de treino, com o tempo que falta. */
describe('fila de treino no menu', () => {
  it('Treinando mostra a técnica em treino e o tempo que falta', () => {
    const treinos = [
      { id: 't', tipo: 'tecnica', key: 'golpe', nivel: 1, atividade: 'treinando', horas_restantes: 36 },
      { id: 'm', tipo: 'magia', key: 'cura', nivel: 1, atividade: 'orando', horas_restantes: 24 },
    ];
    const nomeDe = (t) => (t.key === 'golpe' ? 'Golpe Duplo' : 'Curas Físicas');
    render(<Seletor atividade={null} podeEditar lang="pt" onEscolher={() => {}} treinos={treinos} nomeDoTreino={nomeDe} />);
    act(() => { botao().click(); });
    const treinando = opcoes().find((li) => li.getAttribute('data-atividade') === 'treinando');
    expect(treinando.querySelector('.fp-treino-fila').textContent).toMatch(/Golpe Duplo.*1.*1 d 12 h/);
    const orando = opcoes().find((li) => li.getAttribute('data-atividade') === 'orando');
    expect(orando.querySelector('.fp-treino-fila').textContent).toMatch(/Curas Físicas.*1 d/);
    const dormindo = opcoes().find((li) => li.getAttribute('data-atividade') === 'dormindo');
    expect(dormindo.querySelector('.fp-treino-fila')).toBeNull();
  });
});
