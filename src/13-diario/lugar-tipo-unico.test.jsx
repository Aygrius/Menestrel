/* ============================================================
   lugar-tipo-unico.test.jsx — "Novo reino" e "Nova cidade" viram um só
   ============================================================
   "Novo reino e nova cidade serão a mesma coisa, então pode usar uma única
    tabela." (usuário, 17/09/2026)

   Decisão combinada: única tabela NA TELA. Reino e cidade continuam em
   tabelas próprias no banco (slug como PK, catálogo global + cópias por
   história — ver a nota MODELO DE DADOS no topo de diario.jsx), e
   salvar_lore_entrada segue recebendo p_tipo. O que deixou de existir é a
   BIFURCAÇÃO NA INTERFACE: dois botões "Novo Reino"/"Nova Cidade" no Mestre,
   e um "+" que abria um modalzinho de escolha antes do formulário no Jogador.

   Agora é um "+" só, que abre o formulário de Lugar com o tipo como PRIMEIRO
   CAMPO dele. O seletor mora no LoreEntradaForm, que as duas telas já
   compartilhavam — foi o que evitou resolver isto duas vezes e de dois jeitos.

   Um caso tem que continuar fora: EDITAR. Trocar o tipo de um lugar que já
   existe não é mudar um campo, é mover a linha de uma tabela para outra
   (slugs, FKs de cidade.reino e npc.cidade apontando pra ela). O seletor só
   aparece na criação, e este teste trava isso.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './diario.jsx';

let LoreEntradaForm;
beforeAll(() => {
  LoreEntradaForm = window.LoreEntradaForm;
  expect(LoreEntradaForm, 'LoreEntradaForm precisa estar no window').toBeTypeOf('function');
});
afterEach(cleanup);

const REINOS = [{ id: 'verrogar', nome: 'Verrogar', tipo: 'reino' }];
const CIDADES = [{ id: 'brann', nome: 'Brann', tipo: 'cidade' }];

const montar = (props = {}) => {
  const estado = { entrada: props.entrada || {}, tipo: props.tipo || 'reino' };
  const r = render(
    <div className="menestrel-ui">
      <LoreEntradaForm
        tipo={estado.tipo}
        entrada={estado.entrada}
        onChange={props.onChange || (() => {})}
        onTipoChange={props.onTipoChange}
        reinosDaHistoria={REINOS}
        cidadesDaHistoria={CIDADES}
        t={window.COPY.pt}
        {...props}
      />
    </div>
  );
  return r;
};

const seletorTipo = () => document.querySelector('.diario-lugar-tipo');
const opcaoTipo = (valor) => document.querySelector(`.diario-lugar-tipo input[value="${valor}"]`);

describe('o tipo do lugar é o primeiro campo, na criação', () => {
  it('reino novo oferece a escolha', () => {
    montar({ tipo: 'reino', onTipoChange: () => {} });
    expect(seletorTipo()).toBeTruthy();
    expect(opcaoTipo('reino')).toBeTruthy();
    expect(opcaoTipo('cidade')).toBeTruthy();
  });

  it('cidade nova também, já marcada em cidade', () => {
    montar({ tipo: 'cidade', onTipoChange: () => {} });
    expect(opcaoTipo('cidade').checked).toBe(true);
    expect(opcaoTipo('reino').checked).toBe(false);
  });

  it('escolher cidade avisa quem abriu o formulário', () => {
    const vistos = [];
    montar({ tipo: 'reino', onTipoChange: (t) => vistos.push(t) });
    opcaoTipo('cidade').click();
    expect(vistos).toEqual(['cidade']);
  });

  /* Editar não oferece: trocar o tipo de um lugar existente é mover a linha
     entre tabelas, não editar um campo. */
  it('editando um lugar que já existe, o seletor NÃO aparece', () => {
    montar({ tipo: 'cidade', entrada: { id: 'brann', nome: 'Brann', atributos: {} }, onTipoChange: () => {} });
    expect(seletorTipo()).toBeNull();
  });

  /* Sem o callback o seletor não teria a quem falar — e mostraria um controle
     que não faz nada. */
  it('sem onTipoChange o seletor não aparece', () => {
    montar({ tipo: 'reino' });
    expect(seletorTipo()).toBeNull();
  });

  it('NPC não é lugar: nada de seletor de tipo', () => {
    montar({ tipo: 'npc', onTipoChange: () => {} });
    expect(seletorTipo()).toBeNull();
  });
});

describe('os campos seguem o tipo escolhido', () => {
  it('reino mostra Governo e Cultura, não População', () => {
    montar({ tipo: 'reino', onTipoChange: () => {} });
    expect(screen.queryByText('Governo')).toBeTruthy();
    expect(screen.queryByText('Cultura')).toBeTruthy();
    expect(screen.queryByText('População')).toBeNull();
  });

  it('cidade mostra Reino e População, não Governo', () => {
    montar({ tipo: 'cidade', onTipoChange: () => {} });
    expect(screen.queryByText('População')).toBeTruthy();
    expect(screen.queryByText('Governo')).toBeNull();
  });

  it('Nome e Descrição valem pros dois', () => {
    montar({ tipo: 'reino', onTipoChange: () => {} });
    expect(screen.queryByText('Nome')).toBeTruthy();
    expect(screen.queryByText('Descrição')).toBeTruthy();
  });
});

describe('as duas telas perderam a bifurcação', () => {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  const fonte = readFileSync(resolve(__dirname, 'diario.jsx'), 'utf8');

  it('não há mais botões separados de Novo Reino / Nova Cidade', () => {
    expect(fonte).not.toMatch(/'Novo Reino'/);
    expect(fonte).not.toMatch(/'Nova Cidade'/);
    expect(fonte).not.toMatch(/New Kingdom/);
    expect(fonte).not.toMatch(/New City/);
  });

  it('nem o modal de escolha que vinha antes do formulário', () => {
    expect(fonte).not.toMatch(/escolhendoLugar/);
    expect(fonte).not.toMatch(/diario-escolha-lugar/);
  });

  /* O + de Lugares abre o formulário direto, nas duas telas — uma
     `abrirNovoLugar` em cada, e nenhuma delas recebendo o tipo por argumento
     (era `abrirNovoLugar('reino')` / `('cidade')`, os dois caminhos do modal
     de escolha). 'reino' é o padrão só porque alguma opção tem que vir
     marcada; o seletor do formulário troca. */
  it('o + de Lugares abre o formulário já num tipo, nas duas telas', () => {
    expect(fonte.match(/const abrirNovoLugar = \(\) =>/g)).toHaveLength(2);
    expect(fonte).not.toMatch(/abrirNovoLugar\('(reino|cidade)'\)/);
  });
});
