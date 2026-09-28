/* ============================================================
   animal-consulta.test.jsx — a ficha do animal abre a explicação
   ============================================================
   "Na ficha de identidade do animal, assim como é do personagem, ao clicar
    nas habilidades, técnicas e magias, será possível abrir um modal com a
    explicação." (usuário, 27/09/2026)
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/select-pill.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import '../10-shell/shell.jsx';
import '../09-bestiario/ataques-criatura.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../09-bestiario/conhecido-jogador.jsx';
import '../09-bestiario/catalogo-descritores.jsx';
import '../09-bestiario/catalogo-editor.jsx';
import '../09-bestiario/bestiario.jsx';
import '../12-batalha/batalha.jsx';
import './ficha.jsx';

let W;
beforeAll(() => { W = window; });
afterEach(cleanup);

const LOBO = {
  id: 9, nome: 'Lobo Alfa', tipo: 'Animal', estagio: 5, montaria: false, percepcao: 3,
  habilidades: 'Rastrear', tecnicas_especiais: '', magia: '',
};
const HABS = { rastrear: { key: 'rastrear', nome: 'Rastrear', grupo: 'Geral', ajuste: 'PER', descricao: 'Seguir pegadas e rastros.' } };

describe('Capacidades do animal', () => {
  it('clicar na habilidade abre a janela com a explicação e o total do animal', () => {
    render(<W.FichaAnimaisView
      animais={[{ instancia: { instanceId: 'l1', slug: 'lobo', quantidade: 1 }, cat: { nome: 'Lobo Alfa' }, criatura: LOBO }]}
      en={false} podeEditar onMontar={() => {}} onDesmontar={() => {}}
      catalogoBySlug={{}} habsByKey={HABS} tecnicasByKey={{}} magiasByKey={{}} />);
    const linha = [...document.querySelectorAll('.fp-row--abre')].find((r) => r.textContent.includes('Rastrear'));
    expect(linha).toBeTruthy();
    expect(linha.getAttribute('role')).toBe('button');
    fireEvent.click(linha);
    const janela = document.querySelector('.modal-best-detalhe');
    expect(janela).toBeTruthy();
    expect(janela.querySelector('.ms-title').textContent).toContain('Rastrear');
    expect(janela.textContent).toMatch(/Seguir pegadas/);
    // Fecha pelo X.
    fireEvent.click(janela.querySelector('[aria-label="Fechar"]'));
    expect(document.querySelector('.modal-best-detalhe')).toBeNull();
  });
});
