/* ============================================================
   status-painel.test.jsx — o Mestre mexe no status fora do combate
   ============================================================
   "...mas o mestre pode remover e adicionar fora da batalha também."
    (usuário, 17/09/2026)

   "Ao invés do botão '+' [...] crie um botão como em 'temperatura' no topo,
    onde o mestre poderá selecionar o status, após selecionar, um modal para
    informar quantos dias permanecerá assim. Um mesmo personagem pode acumular
    mais de um status ao mesmo tempo, sem restrição. Mas nunca acumular o mesmo
    mais de uma vez." (usuário, mesma data)

   São DOIS PASSOS, e é essa a forma: o seletor abre a lista inteira (molde do
   pill do clima em 10-shell), e o modal pergunta o prazo. O "+" anterior abria
   um formulário onde ainda era preciso escolher — um clique a mais para chegar
   à mesma escolha.

   O que este arquivo trava, além dos dois passos:

   • o que a ficha aplica é O MESMO objeto que o menu de estado do combate
     aplica (statusAplicadoPeloMestre) — senão um "Ferido" posto aqui entraria
     no combate seguinte sem o mod_coluna, e seria um selo decorativo;
   • fora do combate a unidade é o DIA, não a rodada: é o grão que o calendário
     da mesa tem (ver 01-core/status-efeito.jsx);
   • o Jogador vê e não mexe — mesma regra das barras de vitalidade.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, screen, act } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/status-efeito.jsx';
import '../01-core/game-data.jsx';
import './ficha.jsx';
import '../10-shell/shell.jsx';        // publica ModalShell
import '../12-batalha/batalha.jsx';   // publica statusAplicadoPeloMestre

let FichaStatusPainel, FichaStatusSeletor;
beforeAll(() => {
  FichaStatusPainel = window.FichaStatusPainel;
  FichaStatusSeletor = window.FichaStatusSeletor;
  expect(FichaStatusPainel, 'o painel precisa estar no window').toBeTypeOf('function');
  expect(FichaStatusSeletor, 'o seletor precisa estar no window').toBeTypeOf('function');
});
afterEach(cleanup);

const HOJE = { dia: 11, mes: 11, ano: 1500 };
const VENENO = { id: 'veneno:a', nome: 'Envenenado', icone: '☠', rodadas_rest: 2,
  efeito: { tipo: 'dano_por_rodada', valor: 2 }, vence_em: { dia: 14, mes: 11, ano: 1500 } };

/* Duas peças desde 17/09/2026: o SELETOR (o círculo, na fileira das abas) e o
   PAINEL (os chips do que está valendo, abaixo da vitalidade). Aplicar é ação
   do Mestre sobre a ficha, como as abas; o painel mostra o resultado. */
function montar({ lista = [], podeEditar = true, dataJogo = HOJE } = {}) {
  const adicionados = []; const removidos = [];
  render(
    <>
      {podeEditar && (
        <FichaStatusSeletor
          lista={lista}
          dataJogo={dataJogo}
          lang="pt"
          onAdicionar={(st, dias) => adicionados.push({ st, dias })}
        />
      )}
      <FichaStatusPainel
        lista={lista}
        dataJogo={dataJogo}
        podeEditar={podeEditar}
        lang="pt"
        onRemover={(id) => removidos.push(id)}
      />
    </>
  );
  return { adicionados, removidos };
}

const chips = () => Array.from(document.querySelectorAll('.fp-status-chip'));
const seletor = () => document.querySelector('.fp-status-seletor');
const opcoes = () => Array.from(document.querySelectorAll('.fp-status-opcao'));
const abrirLista = () => act(() => { seletor().click(); });
const escolher = (tipo) => act(() => {
  opcoes().find((li) => li.getAttribute('data-status') === tipo).click();
});
const aplicar = () => act(() => { screen.getByRole('button', { name: 'Aplicar' }).click(); });
const rotulosDoModal = () => Array.from(document.querySelectorAll('.fp-status-campo > span')).map((s) => s.textContent);

describe('o que o painel mostra', () => {
  /* "Na ficha, remova o texto 'Nenhum status'" (usuário, 17/09/2026). Saiu
     primeiro do Jogador e depois do Mestre também: ele tem o círculo de status
     na fileira das abas e não precisa de legenda para saber onde aplicar. */
  it('sem status, nenhum texto — nem para o Mestre', () => {
    montar();
    expect(document.querySelector('.fp-status-vazio')).toBeNull();
    expect(document.querySelector('.fp-status').textContent).toBe('');
  });

  it('nem para o Jogador', () => {
    montar({ podeEditar: false });
    expect(document.querySelector('.fp-status-vazio')).toBeNull();
    expect(document.querySelector('.fp-status').textContent).toBe('');
  });

  it('cada status é um chip com nome e ícone', () => {
    montar({ lista: [VENENO] });
    expect(chips()).toHaveLength(1);
    expect(chips()[0].textContent).toMatch(/Envenenado/);
    expect(chips()[0].querySelector('.fp-status-emoji').textContent).toBe('☠');
  });

  it('e o chip diz até quando vale', () => {
    montar({ lista: [VENENO] });
    expect(chips()[0].querySelector('.fp-status-prazo')).toBeTruthy();
  });

  /* Vencimento preguiçoso: quem já venceu não aparece, mesmo continuando
     gravado — quem apaga de fato é a próxima gravação do estado. */
  it('o vencido não aparece', () => {
    montar({ lista: [VENENO], dataJogo: { dia: 20, mes: 11, ano: 1500 } });
    expect(chips()).toHaveLength(0);
  });
});

describe('passo 1 — o seletor, um círculo no molde do clima', () => {
  /* "Deve ser um círculo, como é 'temperatura' no topo da página, e pode ficar
     ao lado do menu 'ficha'." Só ícone: na fileira das abas ele é a única
     coisa redonda, e isso já o distingue. */
  it('é só ícone, sem rótulo escrito', () => {
    montar();
    expect(seletor().textContent).toBe('');
    expect(seletor().querySelector('i')).toBeTruthy();
    expect(seletor().getAttribute('aria-label')).toBe('Aplicar status');
  });

  it('é um botão só; a lista abre no clique', () => {
    montar();
    expect(opcoes()).toHaveLength(0);
    abrirLista();
    expect(opcoes().map((li) => li.textContent)).toEqual(
      ['Envenenado', 'Sangrando', 'Ferido', 'Caído', 'Desmaiado', 'Morto']
    );
  });

  it('e fecha no clique de novo', () => {
    montar();
    abrirLista();
    abrirLista();
    expect(opcoes()).toHaveLength(0);
  });

  /* "Nunca acumular o mesmo mais de uma vez": o que o personagem já tem sai
     da lista, em vez de ser oferecido e substituir em silêncio. */
  it('o status que o personagem já tem não é oferecido', () => {
    montar({ lista: [VENENO] });
    abrirLista();
    expect(opcoes().map((li) => li.getAttribute('data-status')))
      .toEqual(['sangramento', 'ferido', 'caido', 'desmaiado', 'morto']);
  });

  it('e com todos aplicados o círculo some', () => {
    montar({ lista: [
      VENENO,
      { id: 'sangramento:b', nome: 'Sangrando' },
      { id: 'ferido:c', nome: 'Ferido' },
      { id: 'caido:d', nome: 'Caído' },
      { id: 'desmaiado:e', nome: 'Desmaiado' },
      { id: 'morto:f', nome: 'Morto' },
    ] });
    expect(seletor()).toBeNull();
  });

  /* Mas status DIFERENTES convivem — "sem restrição". */
  it('status diferentes convivem', () => {
    montar({ lista: [VENENO, { id: 'ferido:c', nome: 'Ferido' }] });
    expect(chips()).toHaveLength(2);
  });
});

describe('passo 2 — o modal do prazo', () => {
  it('escolher abre o modal, perguntando os dias', () => {
    montar();
    abrirLista();
    escolher('veneno');
    expect(document.querySelector('.fp-status-modal')).toBeTruthy();
    expect(document.body.textContent).toMatch(/Por quantos dias/);
    expect(rotulosDoModal()[0]).toBe('Dias');
  });

  /* É este o ponto do arranjo: o objeto que sai daqui tem que ser o mesmo que
     a batalha monta, efeito mecânico incluído. */
  it('o que sai é o objeto da batalha, com o efeito mecânico', () => {
    const { adicionados } = montar();
    abrirLista();
    escolher('veneno');
    aplicar();
    expect(adicionados).toHaveLength(1);
    expect(adicionados[0].st).toMatchObject({
      nome: 'Envenenado', efeito: { tipo: 'dano_por_rodada', valor: 1 },
    });
    expect(adicionados[0].st.id).toMatch(/^veneno:/);
  });

  it('Ferido sai com o mod_coluna negativo, como na Falha Crítica', () => {
    const { adicionados } = montar();
    abrirLista();
    escolher('ferido');
    aplicar();
    expect(adicionados[0].st).toMatchObject({
      nome: 'Ferido', efeito: { tipo: 'mod_coluna', valor: -1 },
    });
  });

  it('Caído é sem_acoes e o modal só pergunta o prazo', () => {
    const { adicionados } = montar();
    abrirLista();
    escolher('caido');
    expect(rotulosDoModal()).toEqual(['Dias']);   // sem campo de valor
    aplicar();
    expect(adicionados[0].st.efeito).toEqual({ tipo: 'sem_acoes' });
  });

  /* Fora do combate a unidade é o dia — a rodada não existe aqui. */
  it('o prazo sai em dias', () => {
    const { adicionados } = montar();
    abrirLista();
    escolher('veneno');
    aplicar();
    expect(adicionados[0].dias).toBe(1);
  });

  /* O "Sem prazo — até o Mestre remover" saiu em 17/09/2026: o prazo é sempre
     em dias. `statusComVencimento` segue entendendo null como eterno — é assim
     que um status guardado sem vencimento continua valendo —, só não há mais
     como criar um pela ficha. */
  it('não há mais "sem prazo" no modal', () => {
    montar();
    abrirLista();
    escolher('veneno');
    expect(document.querySelector('.fp-status-checkbox')).toBeNull();
    expect(document.body.textContent).not.toMatch(/Sem prazo/);
  });

  /* O prazo NÃO pode ser zero (revisão de 24/09/2026). O status vence quando
     a data chega ao dia do vencimento, e 0 dias vencia hoje: era gravado e
     sumia da ficha na mesma hora. O mínimo é 1 — até o Mestre virar o dia. */
  it('e o prazo não desce de 1', () => {
    const { adicionados } = montar();
    abrirLista();
    escolher('veneno');
    act(() => { document.querySelectorAll('.fp-step-btn')[0].click(); });
    aplicar();
    expect(adicionados[0].dias).toBe(1);
  });

  it('aplicar fecha o modal', () => {
    montar();
    abrirLista();
    escolher('veneno');
    aplicar();
    expect(document.querySelector('.fp-status-modal')).toBeNull();
  });

  it('cancelar não aplica nada', () => {
    const { adicionados } = montar();
    abrirLista();
    escolher('veneno');
    act(() => { screen.getByRole('button', { name: 'Cancelar' }).click(); });
    expect(adicionados).toHaveLength(0);
    expect(document.querySelector('.fp-status-modal')).toBeNull();
  });
});

describe('o Mestre remove', () => {
  it('o x do chip devolve o id', () => {
    const { removidos } = montar({ lista: [VENENO] });
    act(() => { document.querySelector('.fp-status-x').click(); });
    expect(removidos).toEqual(['veneno:a']);
  });
});

describe('o Jogador só olha', () => {
  it('vê os status', () => {
    montar({ lista: [VENENO], podeEditar: false });
    expect(chips()).toHaveLength(1);
  });

  /* O círculo nem é montado para ele — a ficha só o renderiza com
     podeEditarEstado, que é o Mestre. */
  it('mas não tem seletor nem x', () => {
    montar({ lista: [VENENO], podeEditar: false });
    expect(document.querySelector('.fp-status-x')).toBeNull();
    expect(seletor()).toBeNull();
  });
});
