/* ============================================================
   wizard-layout.test.jsx — listas em duas colunas + modal de explicação
   ============================================================
   Mudança de 08/09/2026: os passos do wizard (Atributos, Grupos de Armas,
   Habilidades, Magias, Técnicas e o painel de Aprimoramentos) trocaram o
   acordeão inline por um modal, e a lista passou a ser de dois itens por
   linha.

   O que se exige aqui:
     • clicar no nome abre o modal com o conteúdo que o acordeão mostrava —
       e NÃO deixa o texto inline na lista, que era o que desalinhava os
       steppers da grade;
     • Escape fecha só o modal de explicação. Este é o ponto crítico: os dois
       modais registravam o Escape em window, então um toque fechava o wizard
       junto e o personagem em construção ia embora. Ver MODAL_STACK em
       10-shell/shell.jsx;
     • item sem nada a explicar não vira botão.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './personagens.jsx';

let StepAtributos, StepTecnicas;
beforeAll(() => {
  ({ StepAtributos, StepTecnicas } = window);
  expect(StepAtributos, 'StepAtributos precisa estar no window').toBeDefined();
  expect(StepTecnicas, 'StepTecnicas precisa estar no window').toBeDefined();
});

afterEach(() => cleanup());

const form = {
  raca: 'Humano', profissao: 'Guerreiro', experiencia: 0,
  intelecto_base: 0, aura_base: 0, carisma_base: 0, forca_base: 0,
  fisico_base: 0, agilidade_base: 0, percepcao_base: 0,
  habilidades: {}, magias: {}, tecnicas: {}, aprimoramentos: {},
};

const montarAtributos = () => render(
  <StepAtributos
    form={form} update={() => {}} lang="pt"
    gastos={0} totalPontos={15} restantes={15}
    isEdit={false} isMaster={false} originais={null}
  />
);

describe('StepAtributos — nome abre o modal de explicação', () => {
  it('a descrição não fica inline na lista antes do clique', () => {
    montarAtributos();
    expect(screen.queryByText(/capacidade de raciocínio/i)).toBeNull();
  });

  it('clicar no atributo abre o modal com a descrição dele', () => {
    montarAtributos();
    fireEvent.click(screen.getByRole('button', { name: /Intelecto/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toMatch(/capacidade de raciocínio/i);
  });

  it('cada atributo abre a SUA descrição, não a do vizinho', () => {
    montarAtributos();
    fireEvent.click(screen.getByRole('button', { name: /Aura/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toMatch(/energia espiritual/i);
    expect(dialog.textContent).not.toMatch(/capacidade de raciocínio/i);
  });

  it('o "x" fecha o modal e mantém a lista', () => {
    const { container } = montarAtributos();
    fireEvent.click(screen.getByRole('button', { name: /Percepção/i }));
    expect(screen.queryByRole('dialog')).toBeTruthy();
    fireEvent.click(document.querySelector('.ms-close'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: /Percepção/i })).toBeTruthy();
  });

  it('não tem rodapé — é só leitura, o "x" é a única saída além do Escape', () => {
    const { container } = montarAtributos();
    fireEvent.click(screen.getByRole('button', { name: /Força/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('.ms-footer')).toBeNull();
    expect(document.querySelector('.ms-close')).toBeTruthy();
  });

  it('o nome não carrega ícone de informação', () => {
    const { container } = montarAtributos();
    expect(container.querySelector('.wiz-item-info')).toBeNull();
    expect(container.querySelector('.ti-info-circle')).toBeNull();
  });

  it('a lista usa a grade de duas colunas', () => {
    const { container } = montarAtributos();
    expect(container.querySelector('.wiz-lista-dupla')).toBeTruthy();
    expect(container.querySelectorAll('.wiz-lista-dupla > .wiz-item').length).toBe(7);
  });

  // Regressão real (08/09/2026): ao trocar o grid por multicoluna eu removi a
  // declaração de `display`, e as classes que acompanham .wiz-lista-dupla
  // (.wiz-attrs, .wiz-habs-list) impõem `display: flex`. Flex desliga
  // multicoluna, então as listas voltaram a UMA coluna sem nenhum teste cair.
  // jsdom não calcula layout, mas lê a folha de estilo: dá pra exigir que a
  // regra continue declarando o que faz as duas colunas existirem.
  it('a regra de duas colunas declara display block e columns', () => {
    // Lido do arquivo: o jsdom dos testes não carrega o index.css, e o que
    // precisa ser garantido é justamente o conteúdo da regra.
    // Caminho relativo à raiz do projeto: import.meta.url aqui não é file://.
    const css = readFileSync('src/index.css', 'utf8');
    const regra = css.match(/\.wiz-lista-dupla\s*\{[^}]*\}/);
    expect(regra, 'regra .wiz-lista-dupla não encontrada').toBeTruthy();
    expect(regra[0], 'multicoluna morre sem display block').toMatch(/display:\s*block/);
    expect(regra[0], 'sem columns não há duas colunas').toMatch(/columns:\s*2/);
  });

  it('não sobrou chevron de acordeão', () => {
    const { container } = montarAtributos();
    expect(container.querySelector('.wiz-mag-chevron')).toBeNull();
    expect(container.querySelector('.wiz-mag-detail')).toBeNull();
  });
});

describe('Centralização — o detalhe não é backdrop aninhado', () => {
  // Aninhado dentro do backdrop do wizard, o modal saía torto: .ms-backdrop
  // tem backdrop-filter, que vira bloco de contenção pro `position: fixed` de
  // dentro, e aí a compensação do menu lateral (--sidebar-w) era aplicada
  // duas vezes. Como irmão, ele cai na mesma regra de todo modal do app.
  it('o backdrop do detalhe não fica dentro de outro backdrop', () => {
    montarAtributos();
    fireEvent.click(screen.getByRole('button', { name: /Intelecto/i }));
    const backdrops = [...document.querySelectorAll('.ms-backdrop')];
    expect(backdrops.length).toBeGreaterThan(0);
    backdrops.forEach((b) => {
      expect(b.parentElement.closest('.ms-backdrop'), 'backdrop aninhado').toBeNull();
    });
  });

  it('o detalhe sai da subárvore do passo que o abriu', () => {
    const { container } = montarAtributos();
    fireEvent.click(screen.getByRole('button', { name: /Intelecto/i }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(container.querySelector('.modal-detalhe'), 'devia ter ido por portal').toBeNull();
  });
});

describe('Escape com dois modais abertos', () => {
  // O wizard inteiro é caro de montar (rede, catálogos). O que precisa ser
  // provado é a regra do ModalShell, então dois ModalShell aninhados bastam:
  // é exatamente a situação "wizard + explicação".
  it('fecha só o modal de cima, não o de baixo', () => {
    const fechados = [];
    const { ModalShell } = window;
    render(
      <ModalShell title="Wizard" lang="pt" onClose={() => fechados.push('wizard')}>
        <span>corpo do wizard</span>
        <ModalShell title="Intelecto" lang="pt" onClose={() => fechados.push('detalhe')}>
          <span>explicação</span>
        </ModalShell>
      </ModalShell>
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(fechados).toEqual(['detalhe']);
  });

  it('sozinho, o modal continua respondendo ao Escape', () => {
    const fechados = [];
    const { ModalShell } = window;
    render(
      <ModalShell title="Wizard" lang="pt" onClose={() => fechados.push('wizard')}>
        <span>corpo do wizard</span>
      </ModalShell>
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(fechados).toEqual(['wizard']);
  });
});

describe('StepTecnicas — item sem detalhe e lista vazia', () => {
  const tecnica = (over) => ({
    key: 't1', nome: 'Golpe Duplo', custo: 1, permissao: 'Guerreiro',
    uso: 'Ataque', descricao: 'Dois golpes numa ação.', ...over,
  });

  const montar = (tecnicasDb) => render(
    <StepTecnicas
      form={form} update={() => {}} lang="pt"
      tecnicasDb={tecnicasDb} tecnicasError={null}
      tecTotalPontos={10} tecGasto={0} tecRestantes={10} tecQtd={0}
      isEdit={false} personagemExistente={null} atributosFinais={{}}
    />
  );

  it('a técnica abre o modal com uso, custo e descrição', () => {
    montar([tecnica()]);
    fireEvent.click(screen.getByRole('button', { name: /Golpe Duplo/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toMatch(/Dois golpes numa ação/i);
    expect(dialog.textContent).toMatch(/Uso/i);
    expect(dialog.textContent).toMatch(/Custo/i);
  });

  it('campo vazio do banco não vira linha em branco no modal', () => {
    montar([tecnica({ grupo_armas: '', grupo_armaduras: null, efeito: undefined })]);
    fireEvent.click(screen.getByRole('button', { name: /Golpe Duplo/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).not.toMatch(/Armas:/);
    expect(dialog.textContent).not.toMatch(/Armaduras:/);
    expect(dialog.textContent).not.toMatch(/Efeito:/);
  });
});
