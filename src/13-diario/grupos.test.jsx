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

describe('o catálogo', () => {
  it('os seis colégios de magia, com os tópicos do livro', () => {
    const slugs = window.GRUPOS.map((g) => g.slug).sort();
    expect(slugs).toEqual(['alquimico', 'conhecimento', 'elemental', 'ilusoes', 'naturalista', 'necromantico']);
    for (const g of window.GRUPOS) {
      expect(g.tipo, g.slug).toBe('colegio');
      expect(window.tipoDoGrupo(g, 'pt'), g.slug).toBe('Colégio de Magia');
      expect(g.epigrafe && g.epigrafe.texto, g.slug).toBeTruthy();
      expect(g.prefacio.texto.length, g.slug).toBeGreaterThan(200);
      expect(String(g.descricao).length, g.slug).toBeGreaterThan(100);
      expect(g.historia, g.slug).toBeTruthy();
      expect(g.simbolos, g.slug).toBeTruthy();
    }
  });
});

describe('a página', () => {
  it('mostra um cartão por colégio e abre a ficha com os tópicos', () => {
    const { container, getByText } = render(
      <div className="menestrel-ui"><window.GruposView lang="pt" /></div>,
    );
    expect(container.querySelectorAll('.pj-card')).toHaveLength(6);
    fireEvent.click(getByText('Colégio Alquímico'));
    const titulos = [...document.querySelectorAll('.best-secao-titulo')].map((h) => h.textContent);
    for (const t of ['Epígrafe', 'Prólogo', 'Descrição', 'História', 'Símbolos']) expect(titulos).toContain(t);
  });

  it('a busca filtra pelo nome', () => {
    const { container } = render(<div className="menestrel-ui"><window.GruposView lang="pt" /></div>);
    const input = container.querySelector('input');
    fireEvent.change(input, { target: { value: 'necro' } });
    const nomes = [...container.querySelectorAll('.diario-cartao-nome')].map((n) => n.textContent);
    expect(nomes).toEqual(['Colégio Necromântico']);
  });
});
