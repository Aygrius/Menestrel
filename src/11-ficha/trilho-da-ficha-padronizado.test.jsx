/* ============================================================
   trilho-da-ficha-padronizado.test.jsx — o trilho da ficha, arrumado
   ============================================================
   Três pedidos do usuário em 27/10/2026, no mesmo trilho:

     "O menu 'amigos' que está no trilho vai para o menu da esquerda."
     "No trilho da ficha do personagem, arrume o modal que abre quando
      clica, padronize ele."
     "Arrume a barra de rolagem para o padrão do sistema."

   Status era o último do trilho que abria uma FOLHA ancorada no botão — e
   ela nascia atrás da ficha, porque o .fp-card tem `zoom` e cria contexto de
   empilhamento. Agora ele abre o mesmo ModalShell de Atividades, Habilidades,
   Magias e Itens, com a mesma lista e a mesma barra de rolagem.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/status-efeito.jsx';
// window.ATIVIDADES mora aqui — sem ele a lista de Atividades nasce vazia.
import '../01-core/clima-desgaste.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/bases-item.jsx';
import '../10-shell/shell.jsx';

let Seletor;
beforeAll(async () => {
  window.supabaseClient = window.supabaseClient || { from: () => ({}), rpc: () => Promise.resolve({ data: [], error: null }) };
  await import('./ficha.jsx');
  Seletor = window.FichaStatusSeletor;
  expect(Seletor).toBeTypeOf('function');
  // O portal do modal mira a raiz do app — o CSS é escopado em #root.
  if (!document.querySelector('#root .menestrel-ui')) {
    const root = document.createElement('div');
    root.id = 'root';
    root.innerHTML = '<div class="menestrel-ui"></div>';
    document.body.appendChild(root);
  }
});

afterEach(cleanup);

const abrirStatus = () => {
  render(<div className="menestrel-ui">
    <Seletor lista={[]} dataJogo={{ dia: 1, mes: 1, ano: 1000 }} lang="pt" onAdicionar={() => {}} />
  </div>);
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar status' }));
};

describe('o Status abre no mesmo modal dos vizinhos', () => {
  it('é um ModalShell, não uma folha ancorada no botão', () => {
    abrirStatus();
    expect(document.querySelector('.ms-modal.modal-atalho')).not.toBeNull();
    expect(document.querySelector('.fp-status-opcoes')).toBeNull();
  });

  it('a lista é a .at-lista do sistema, com a rolagem do sistema', () => {
    abrirStatus();
    const lista = document.querySelector('.modal-atalho .at-lista');
    expect(lista).not.toBeNull();
    expect(lista.className).toContain('mn-rolagem');
    expect(lista.querySelectorAll('.at-linha').length).toBeGreaterThan(0);
  });

  it('escolher um status fecha a lista e pede o prazo', () => {
    abrirStatus();
    const primeiro = document.querySelector('.modal-atalho .at-linha');
    fireEvent.click(primeiro);
    expect(document.querySelector('.modal-atalho .at-lista')).toBeNull();
    expect(document.querySelector('.fp-status-modal')).not.toBeNull();
  });
});

describe('Atividades abre igual aos vizinhos', () => {
  const abrirAtividades = () => {
    const Ativ = window.FichaAtividadeSeletor;
    expect(Ativ).toBeTypeOf('function');
    render(<div className="menestrel-ui">
      <Ativ atividade={{ tipo: 'meditando' }} podeEditar lang="pt" onEscolher={() => {}}
        treinos={[{ id: 't1', atividade: 'treinando', key: 'esquiva', tipo: 'tecnica', nivel: 2, horas_restantes: 30 }]}
        nomeDoTreino={() => 'Esquiva'} />
    </div>);
    fireEvent.click(document.querySelector('.fp-atividade-wrap .fp-status-seletor'));
  };

  it('a lista é a .at-lista do sistema, não a folha ancorada', () => {
    abrirAtividades();
    expect(document.querySelector('.ms-modal.modal-atalho .at-lista')).not.toBeNull();
    expect(document.querySelector('.fp-status-opcoes')).toBeNull();
  });

  it('a atividade ligada acende, e a fila de treino continua embaixo do nome', () => {
    abrirAtividades();
    const ligada = document.querySelector('.modal-atalho .at-linha.is-atual');
    expect(ligada).not.toBeNull();
    expect(ligada.textContent).toContain('Meditar');
    const fila = document.querySelector('.modal-atalho .fp-treino-fila');
    expect(fila).not.toBeNull();
    expect(fila.textContent).toContain('Esquiva');
    // A fila mora DENTRO da linha da atividade que treina.
    expect(fila.closest('.at-linha').getAttribute('data-atividade')).toBe('treinando');
  });
});

describe('a barra de rolagem do sistema é uma classe só', () => {
  const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');
  it('.mn-rolagem existe e veste a régua', () => {
    expect(css).toMatch(/\.mn-rolagem \{ scrollbar-width: thin; scrollbar-color: var\(--regua-forte\) transparent; \}/);
    expect(css).toMatch(/\.mn-rolagem::-webkit-scrollbar \{ width: 8px; height: 8px; \}/);
  });
  it('as listas dos modais do trilho não ficam com a barra crua', () => {
    expect(css).toMatch(/\.modal-atalho \.at-lista,[\s\S]{0,200}scrollbar-width: thin/);
  });
  it('a lista de amigos ganhou a pele dos vizinhos fora do .amg-root', () => {
    expect(css).toMatch(/#root \.menestrel-ui \.modal-atalho \.amg-linha \{/);
  });
});
