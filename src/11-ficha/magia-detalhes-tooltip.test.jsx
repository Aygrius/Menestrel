/* ============================================================
   magia-detalhes-tooltip.test.jsx — a janela de usar uma magia (ficha)
   ============================================================
   Desde 26/09/2026 é o MODELO ÚNICO de janela ("Eu não quero ter vários
   modelos de modal para magias, itens, habilidades, etc. A diferença é que no
   modal para usar [...] eu terei os botões de ação. Mas todos terão as abas
   de detalhes." — usuário): o BestDetalheModal com o corpo do Treinamento
   (BestMagiaFicha) e o ícone Evocar ao lado do X, que abre a etapa de nível e
   alvo. Os chips e o rodapé antigos saíram; os comportamentos que importavam
   continuam presos aqui.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/select-pill.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../09-bestiario/ataques-criatura.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../09-bestiario/conhecido-jogador.jsx';
import '../09-bestiario/catalogo-descritores.jsx';
import '../09-bestiario/catalogo-editor.jsx';
import '../09-bestiario/bestiario.jsx';
import './ficha.jsx';

let Modal;
beforeAll(() => {
  Modal = window.MagiaDetalhesModal;
  expect(Modal, 'MagiaDetalhesModal precisa estar no window').toBeTypeOf('function');
});
afterEach(cleanup);

const MAGIA = {
  key: 'bola_de_fogo', nome: 'Bola de Fogo', evocacao: 'Instantânea', alcance: '20 metros',
  duracao: 'Instantânea', descricao: 'Uma bola de fogo.', nivel_1: 'Causa 12 de dano elemental de fogo.',
};

const montar = (props = {}) => render(
  <div className="menestrel-ui">
    <Modal magia={MAGIA} passos={1} nivelMagiaEfetivoFn={() => 1} eu={{ id: 7, nome: 'Yuldrous', sobrenome: "Alma D'Machado" }}
      colegas={[]} lang="pt" onClose={() => {}} onEvocar={() => {}} abrirTip={() => {}} fecharTip={() => {}} {...props} />
  </div>
).container.ownerDocument.body;
// Sem ícone de Evocar desde 26/09/2026: clicar DE NOVO no alvo marcado evoca.
const alvoCard = (nome) => [...document.querySelectorAll('.det-alvos .det-opt-card')].find((c) => c.textContent.includes(nome));

describe('o modelo único de janela', () => {
  it('as abas de detalhe do Treinamento, sem ícone ao lado do X', () => {
    montar();
    expect(document.querySelector('.modal-best-detalhe')).toBeTruthy();
    expect(document.querySelector('.ms-footer')).toBeNull();
    const abas = [...document.querySelectorAll('.best-abas [role="tab"]')].map((b) => b.textContent);
    // A aba principal é a de evocar; os níveis moram na Descrição (26/09/2026).
    expect(abas).toEqual(['Evocar', 'Descrição', 'Características']);
    expect(document.querySelector('[data-acao="evocar"]')).toBeNull();
    // Sem os títulos 'Nível' e 'Alvo'.
    expect(document.querySelector('.det-uso .det-sec-head')).toBeNull();
    // Características traz o nível do personagem.
    expect(document.querySelector('.best-secao--lista').textContent).toMatch(/Seu nível\s*1/);
  });

  /* "Magias de uso 'pessoal' só podem ser usados no próprio evocador."
     (usuário, 27/09/2026) */
  it('alcance Pessoal: só o próprio evocador é alvo', () => {
    const colegas = [{ id: 9, nome: 'Ana' }];
    montar({ magia: { ...MAGIA, alcance: 'Pessoal' }, colegas });
    expect(alvoCard('Yuldrous')).toBeTruthy();
    expect(alvoCard('Ana')).toBeUndefined();
    cleanup();
    montar({ colegas });
    expect(alvoCard('Ana')).toBeTruthy();
  });

  it('magia não aprendida: sem a aba de evocar', () => {
    montar({ passos: null });
    expect(document.querySelector('.det-uso')).toBeNull();
  });

  it('o primeiro clique no alvo só marca; o segundo evoca', () => {
    const onEvocar = vi.fn();
    montar({ onEvocar });
    fireEvent.click(alvoCard('Yuldrous'));
    expect(onEvocar).not.toHaveBeenCalled();
    expect(alvoCard('Yuldrous').classList.contains('det-opt-card--sel')).toBe(true);
    // A dica aparece sozinha sobre o card marcado (26/09/2026).
    expect(document.querySelector('.mn-tip').textContent).toBe('Clique aqui novamente para evocar');
    fireEvent.click(alvoCard('Yuldrous'));
    expect(onEvocar).toHaveBeenCalledTimes(1);
  });
});

/* Bug de 15/09/2026: a opção "(Você)" tinha id 'self', e o banco recusava
   ao aprovar ("invalid input syntax for type bigint: 'self'"). */
describe('alvo da evocação', () => {
  const evocar = (alvoNome, colegas = []) => {
    const onEvocar = vi.fn();
    montar({ colegas, onEvocar });
    fireEvent.click(document.querySelector('.mag-nivel-card'));
    expect(alvoCard(alvoNome), alvoNome).toBeTruthy();
    fireEvent.click(alvoCard(alvoNome));
    fireEvent.click(alvoCard(alvoNome));
    return onEvocar;
  };

  // O card do próprio personagem traz só o nome (sem '(Você)', 26/09/2026).
  it('escolher a si mesmo manda o ID do personagem, não "self"', () => {
    const onEvocar = evocar('Yuldrous');
    expect(onEvocar).toHaveBeenCalledTimes(1);
    expect(onEvocar.mock.calls[0][0].alvo.id).toBe('7');
  });

  it('os colegas da mesa aparecem como alvo, com o id deles', () => {
    const onEvocar = evocar('Eco', [{ id: 42, nome: 'Eco', sobrenome: 'Vedrenne' }]);
    expect(onEvocar.mock.calls[0][0].alvo.id).toBe('42');
  });
});

describe('níveis', () => {
  const magia = { ...MAGIA, nivel_3: 'Causa 18 de dano elemental de fogo.', nivel_5: 'Causa 24 de dano elemental de fogo.' };

  it('só os que o personagem aprendeu — na Descrição e na aba Evocar', () => {
    montar({ magia, passos: 2, nivelMagiaEfetivoFn: () => 3 });
    const aba = document.querySelector('.best-niveis').textContent;
    expect(aba).toMatch(/18/);
    expect(aba).not.toMatch(/24/);
    // Os níveis entram na aba Descrição (sem aba própria).
    expect(document.querySelector('.best-niveis').hasAttribute('data-aba')).toBe(false);
    const niveis = [...document.querySelectorAll('.mag-nivel-card')].map((c) => c.textContent);
    expect(niveis).toHaveLength(2);
    expect(niveis.join(' ')).not.toMatch(/24/);
  });

  it('o nível é o ícone ti-number-N-small na escolha', () => {
    montar({ magia, passos: 2, nivelMagiaEfetivoFn: () => 3 });
    const icones = [...document.querySelectorAll('.mag-nivel-card .mag-nivel-titulo > i:first-child')].map((i) => i.className);
    expect(icones).toEqual(['ti ti-number-1-small', 'ti ti-number-3-small']);
  });
});
