/* ============================================================
   grupos.test.jsx — os colégios de magia na Ambientação (13/11/2026)
   ============================================================
   Usuário: "Crie um novo grupo chamado 'Grupos' e faça a construção dos
   colégios de magia." Os seis colégios do colegios.pdf, na página irmã de
   Entidades: cartões, busca e a ficha com um tópico por capítulo do livro.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/entidades.jsx';
import '../01-core/grupos.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../09-bestiario/ataques-criatura.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../09-bestiario/bestiario.jsx';
import './diario.jsx';
import './entidades.jsx';
import './grupos.jsx';

beforeAll(() => {
  window.UI = { ...window.UI, Input: (props) => <input {...props} /> };
});
afterEach(cleanup);

/* O TEXTO MORA NO BANCO desde 15/11/2026 (catalogo_mundo): um exemplo pequeno. */
const g = (slug, nome) => ({
  slug, nome, tipo: 'colegio', titulo: 'Transformação',
  epigrafe: { texto: 'Nada é imutável.', autor: 'Astar' },
  historia: 'Antigo.', admissao: 'Por exame.', organizacao: 'Um conselho.',
  locais: [{ nome: 'A torre', onde: 'Dantsen' }],
  reliquias: [{ nome: 'O cálice', texto: 'Transmuta.' }],
  rumores: [{ nome: 'O corvo', texto: 'Fala.' }],
});
const GRUPOS = [g('alquimico', 'Colégio Alquímico'), g('necromantico', 'Colégio Necromântico')];

describe('o vocabulário', () => {
  it('o tipo do grupo tem nome', () => {
    // 15/11/2026: o tipo e a profissão que ele reúne ("Colégio (Magos)").
    expect(window.tipoDoGrupo(GRUPOS[0], 'pt')).toBe('Colégio · Magos');
    expect(window.tipoDoGrupo(GRUPOS[0], 'en')).toBe('College · Mages');
    expect(Object.keys(window.GRUPO_TIPOS)).toEqual(['colegio', 'ordem', 'guilda', 'confraria', 'academia', 'trilha']);
    expect(window.tipoDoGrupo({ tipo: 'trilha' }, 'pt')).toBe('Trilha · Rastreadores');
  });
});

describe('a página', () => {
  it('mostra um cartão por grupo e abre a ficha com os tópicos', () => {
    const { container, getByText } = render(
      <div className="menestrel-ui"><window.GruposView lang="pt" grupos={GRUPOS} /></div>,
    );
    expect(container.querySelectorAll('.pj-card')).toHaveLength(2);
    fireEvent.click(getByText('Colégio Alquímico'));
    const titulos = [...document.querySelectorAll('.best-secao-titulo')].map((h) => h.textContent);
    // Os sete tópicos de 15/11/2026, nesta ordem.
    expect(titulos).toEqual(['Epígrafe', 'História', 'Localização', 'Admissão', 'Organização', 'Relíquias', 'Rumores']);
  });

  it('a busca filtra pelo nome', () => {
    const { container } = render(<div className="menestrel-ui"><window.GruposView lang="pt" grupos={GRUPOS} /></div>);
    fireEvent.change(container.querySelector('input'), { target: { value: 'necro' } });
    const nomes = [...container.querySelectorAll('.diario-cartao-nome')].map((n) => n.textContent);
    expect(nomes).toEqual(['Colégio Necromântico']);
  });
});

/* SÓ O QUE O PERSONAGEM CONHECE (17/11/2026): o grupo desconhecido mostra só o
   nome, apagado, e não abre. */
describe('conhece', () => {
  it('o desconhecido não abre e não mostra o tipo', () => {
    render(<div className="menestrel-ui"><window.GruposView lang="pt" grupos={GRUPOS} conhece={() => false} /></div>);
    const cartao = document.querySelector('.diario-cartao');
    expect(cartao.classList.contains('is-desconhecido')).toBe(true);
    expect(cartao.getAttribute('aria-disabled')).toBe('true');
    expect(cartao.textContent).toMatch(/Seu personagem não conhece/);
    fireEvent.click(cartao);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
