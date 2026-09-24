/* ============================================================
   magia-detalhes-tooltip.test.jsx — os atributos da magia viram tooltip
   ============================================================
   "No caso das magias, o texto vira tooltip igual nos itens." (usuário,
   12/09/2026)

   Evocação, Alcance, Duração e Alvo eram ícone + texto ao lado. Agora são só o
   ícone, e o texto sai no tooltip com o nome do campo de título — o mesmo trato
   dos efeitos na janela de item (det-sec-chip--efeito).
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
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

const montar = (abrirTip = vi.fn()) => render(
  <div className="menestrel-ui">
    <Modal magia={MAGIA} passos={1} nivelMagiaEfetivoFn={() => 1} eu={{ id: 1, nome: 'Eco' }}
      colegas={[]} lang="pt" onClose={() => {}} onEvocar={() => {}} abrirTip={abrirTip} fecharTip={() => {}} />
  </div>
).container.ownerDocument.body;

/* Bug de 15/09/2026: "Usar magia em outros personagens da mesma mesa está
   dando erro, e na hora do mestre aprovar aparece: Erro: invalid input syntax
   for type bigint: 'self'." (usuário)

   A opção "(Você)" tinha id 'self'. A ficha comparava com pj.id, dava
   diferente, e tratava a evocação em si mesmo como evocação em terceiro: o
   efeito não pousava, o pedido ia para a fila do Mestre e aplicar estourava
   no banco. */
describe('alvo da evocação', () => {
  const evocar = (alvoNome, colegas = []) => {
    const onEvocar = vi.fn();
    const b = render(
      <div className="menestrel-ui">
        <Modal magia={MAGIA} passos={1} nivelMagiaEfetivoFn={() => 1}
          eu={{ id: 7, nome: 'Yuldrous', sobrenome: "Alma D'Machado" }} colegas={colegas}
          lang="pt" onClose={() => {}} onEvocar={onEvocar} abrirTip={() => {}} fecharTip={() => {}} />
      </div>
    ).container.ownerDocument.body;
    const alvo = [...b.querySelectorAll('.det-opt-card')].find((c) => c.textContent.includes(alvoNome));
    expect(alvo, alvoNome).toBeTruthy();
    fireEvent.click(alvo);
    fireEvent.click([...b.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Evocar'));
    return onEvocar;
  };

  it('escolher a si mesmo manda o ID do personagem, não "self"', () => {
    const onEvocar = evocar('(Você)');
    expect(onEvocar).toHaveBeenCalledTimes(1);
    expect(onEvocar.mock.calls[0][0].alvo.id).toBe('7');
  });

  it('os colegas da mesa aparecem como alvo, com o id deles', () => {
    const onEvocar = evocar('Eco', [{ id: 42, nome: 'Eco', sobrenome: 'Vedrenne' }]);
    expect(onEvocar.mock.calls[0][0].alvo.id).toBe('42');
  });

  /* A outra metade do mesmo bug: a lista de colegas vinha de um SELECT em
     `personagens`, que a RLS devolve VAZIO para o jogador (só o dono e o
     Mestre leem). Resultado: a janela só oferecia "(Você)". Quem enxerga os
     outros PJs da mesa é a RPC get_pjs_historia (SECURITY DEFINER), a mesma
     que o inventário usa para transferir item. Teste de FONTE porque montar a
     FichaPersonagem inteira exigiria o banco. */
  it('os colegas vêm da RPC, não de um select direto em personagens', () => {
    const fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'ficha.jsx'), 'utf8');
    const ini = fonte.indexOf('const outrosIds =');
    const trecho = fonte.slice(ini, fonte.indexOf('setPjsDaHistoria([]);', ini));
    expect(trecho).toContain("rpc('get_pjs_historia'");
    expect(trecho).not.toMatch(/from\('personagens'\)/);
  });
});

describe('atributos da magia', () => {
  it('só o ícone: nenhum texto ao lado', () => {
    const b = montar();
    const chips = [...b.querySelectorAll('.det-sec-a .det-sec-chip--efeito')];
    expect(chips).toHaveLength(3);
    chips.forEach((c) => {
      expect(c.classList.contains('det-sec-chip--efeito')).toBe(true);
      expect(c.querySelector('.det-sec-val')).toBeNull();
      expect(c.textContent).toBe('');
    });
  });

  it('mostra só os níveis que o personagem já aprendeu', () => {
    const magia = { ...MAGIA, nivel_3: 'Causa 18 de dano elemental de fogo.', nivel_5: 'Causa 24 de dano elemental de fogo.' };
    const b = render(
      <div className="menestrel-ui">
        <Modal magia={magia} passos={2} nivelMagiaEfetivoFn={() => 3} eu={{ id: 1, nome: 'Eco' }}
          colegas={[]} lang="pt" onClose={() => {}} onEvocar={() => {}} abrirTip={() => {}} fecharTip={() => {}} />
      </div>
    ).container.ownerDocument.body;
    const niveis = [...b.querySelectorAll('.mag-nivel-card')].map((c) => c.textContent);
    expect(niveis).toHaveLength(2);
    expect(niveis.join(' ')).not.toMatch(/24/);
    expect(b.querySelector('.mag-nivel-card--locked')).toBeNull();
  });

  /* "use o ícone ti-number-5-small para mostrar o nível das habilidades,
     magias, etc." (usuário, 14/09/2026) — no lugar dos hexágonos numerados. */
  it('o nível é o ícone ti-number-N-small em cada nível', () => {
    const magia = { ...MAGIA, nivel_3: 'Causa 18 de dano elemental de fogo.' };
    const b = render(
      <div className="menestrel-ui">
        <Modal magia={magia} passos={2} nivelMagiaEfetivoFn={() => 3} eu={{ id: 1, nome: 'Eco' }}
          colegas={[]} lang="pt" onClose={() => {}} onEvocar={() => {}} abrirTip={() => {}} fecharTip={() => {}} />
      </div>
    ).container.ownerDocument.body;
    expect([...b.querySelectorAll('.mag-nivel-titulo i:first-child')].map((i) => i.className))
      .toEqual(['ti ti-number-1-small', 'ti ti-number-3-small']);
    expect(b.querySelector('[class*="ti-hexagon-number"]')).toBeNull();
  });

  /* "No modal de magias, o número do nível da magia deve aparecer igual em
     habilidades, como um ícone junto com os demais." (usuário, 14/09/2026) */
  it('o nível atual é o PRIMEIRO card da fileira de ícones, igual ao total da habilidade', () => {
    const abrirTip = vi.fn();
    const b = render(
      <div className="menestrel-ui">
        <Modal magia={MAGIA} passos={2} nivelMagiaEfetivoFn={() => 3} eu={{ id: 1, nome: 'Eco' }}
          colegas={[]} lang="pt" onClose={() => {}} onEvocar={() => {}} abrirTip={abrirTip} fecharTip={() => {}} />
      </div>
    ).container.ownerDocument.body;
    const chips = [...b.querySelectorAll('.det-sec-a > .det-sec-chip')];
    expect(chips).toHaveLength(4);
    const nivel = chips[0];
    expect(nivel.classList.contains('det-hab-total')).toBe(true);
    const caixa = nivel.querySelector('.det-sec-ic-box.det-hab-total-num');
    expect(caixa.querySelector('i').className).toBe('ti ti-number-3-small');
    expect(caixa.getAttribute('aria-label')).toBe('Nível: 3');
    fireEvent.mouseEnter(nivel);
    expect(abrirTip).toHaveBeenCalledWith(expect.anything(), { desc: 'Nível' });
    // O selo ao lado do nome saiu.
    expect(b.querySelector('.ms-title .det-title-badge')).toBeNull();
  });

  it('quem não tem a magia não vê card de nível', () => {
    const b = render(
      <div className="menestrel-ui">
        <Modal magia={MAGIA} passos={null} nivelMagiaEfetivoFn={() => 0} eu={{ id: 1, nome: 'Eco' }}
          colegas={[]} lang="pt" onClose={() => {}} onEvocar={() => {}} abrirTip={() => {}} fecharTip={() => {}} />
      </div>
    ).container.ownerDocument.body;
    expect(b.querySelector('.det-mag-nivel')).toBeNull();
  });

  it('a descrição preserva os parágrafos do banco', () => {
    const magia = { ...MAGIA, descricao: 'Um ritual antigo.\nItens necessários: Vela (3).\r\n\nSó à noite.' };
    const b = render(
      <div className="menestrel-ui">
        <Modal magia={magia} passos={1} nivelMagiaEfetivoFn={() => 1} eu={{ id: 1, nome: 'Eco' }}
          colegas={[]} lang="pt" onClose={() => {}} onEvocar={() => {}} abrirTip={() => {}} fecharTip={() => {}} />
      </div>
    ).container.ownerDocument.body;
    expect([...b.querySelectorAll('.det-desc p')].map((p) => p.textContent))
      .toEqual(['Um ritual antigo.', 'Itens necessários: Vela (3).', 'Só à noite.']);
  });

  it('usa a mesma janela de detalhes de item e habilidade', () => {
    expect(montar().querySelector('.ms-modal.modal-detalhes')).toBeTruthy();
  });

  it('o texto sai no tooltip, com o nome do campo de título', () => {
    const abrirTip = vi.fn();
    const b = montar(abrirTip);
    const alcance = b.querySelector('.det-sec-chip[aria-label^="Alcance"]');
    expect(alcance.getAttribute('aria-label')).toBe('Alcance: 20 metros');
    fireEvent.mouseEnter(alcance);
    expect(abrirTip).toHaveBeenCalledWith(expect.anything(), { title: 'Alcance', desc: '20 metros' });
  });
});
