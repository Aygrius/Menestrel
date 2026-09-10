/* ============================================================
   catalogo-editor.test.jsx — o editor genérico renderizado
   ============================================================
   Cobre o contrato do editor: monta os campos do descritor, respeita
   obrigatório e somenteNovo, e recalcula derivado SEM travá-lo.
   O supabaseClient é substituído por um dublê — nenhum teste toca o banco.

   CORREÇÃO ao brief original: os rótulos (ADMIN_COPY) vivem em
   01-core/constants.jsx, não em copy.jsx — copy.jsx não tem ADMIN_COPY
   nenhum (confirmado na Task 3). E como o editor renderiza dentro de
   ModalShell (10-shell/shell.jsx), que só existe como window global se
   alguém o carregar, o teste importa esse arquivo também — mesmo padrão
   de src/08-personagens/wizard-layout.test.jsx.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './criatura-formulas.jsx';
import './catalogo-descritores.jsx';

let CatalogoEditor;
let ultimoInsert = null, ultimoUpdate = null, erroSimulado = null;

beforeAll(async () => {
  // Dublê do supabaseClient ANTES de carregar o editor.
  window.supabaseClient = {
    from: (tabela) => ({
      insert: (payload) => { ultimoInsert = { tabela, payload }; return {
        select: () => ({ single: async () => ({ data: { ...payload, id: 1 }, error: erroSimulado }) }) }; },
      update: (payload) => ({ eq: () => ({
        select: () => ({ single: async () => ({ data: payload, error: erroSimulado }) }) }) }),
    }),
  };
  await import('./catalogo-editor.jsx');
  CatalogoEditor = window.CatalogoEditor;
  expect(CatalogoEditor).toBeDefined();
});

afterEach(() => { cleanup(); ultimoInsert = null; ultimoUpdate = null; erroSimulado = null; });

const montar = (props = {}) => render(
  <div className="menestrel-ui">
    <CatalogoEditor tabela="tecnicas" linha={null} lang="pt"
      onSalvo={() => {}} onCancel={() => {}} {...props} />
  </div>
);
const campoPorRotulo = (re) => Array.from(document.querySelectorAll('label, .motor-field'))
  .find((el) => re.test(el.textContent || ''));

describe('montagem a partir do descritor', () => {
  it('renderiza um campo por entrada do descritor', () => {
    montar();
    const d = window.descritorDe('tecnicas');
    // Cada campo aparece: input, textarea ou SelectPill.
    const controles = document.querySelectorAll('input, textarea, .select-pill-btn');
    expect(controles.length).toBeGreaterThanOrEqual(d.campos.length);
  });

  it('campo de opções oferece só os valores da lista', () => {
    montar();
    const pills = Array.from(document.querySelectorAll('.select-pill-btn'));
    // Abre cada pill até achar a de `uso`.
    let achou = false;
    for (const p of pills) {
      fireEvent.click(p);
      const itens = Array.from(document.querySelectorAll('.select-pill-drop li'))
        .map((li) => (li.textContent || '').trim());
      if (itens.includes('Único')) {
        expect(itens.sort()).toEqual(['Intermitente', 'Livre', 'Único'].sort());
        achou = true; break;
      }
      fireEvent.click(p);
    }
    expect(achou, 'não achei o campo `uso`').toBe(true);
  });
});

describe('somenteNovo', () => {
  it('a coluna-chave é editável ao CRIAR', () => {
    montar({ linha: null });
    const chave = document.querySelector('input[name="key"]');
    expect(chave).toBeTruthy();
    expect(chave.disabled).toBe(false);
  });

  it('a coluna-chave fica travada ao EDITAR', () => {
    montar({ linha: { key: 'mira', nome: 'Mira', custo: 2 } });
    const chave = document.querySelector('input[name="key"]');
    expect(chave.disabled).toBe(true);
  });
});

describe('obrigatório', () => {
  it('salvar fica bloqueado com obrigatório vazio', () => {
    montar({ linha: null });
    const salvar = screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent));
    expect(salvar.disabled).toBe(true);
  });

  it('salvar libera quando os obrigatórios estão preenchidos', () => {
    montar({ linha: null });
    fireEvent.change(document.querySelector('input[name="key"]'), { target: { value: 'nova' } });
    fireEvent.change(document.querySelector('input[name="nome"]'), { target: { value: 'Nova' } });
    fireEvent.change(document.querySelector('input[name="custo"]'), { target: { value: '2' } });
    const salvar = screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent));
    expect(salvar.disabled).toBe(false);
  });
});

describe('campo derivado (criaturas)', () => {
  it('calcula ao mudar a entrada', () => {
    montar({ tabela: 'criaturas', linha: null });
    fireEvent.change(document.querySelector('input[name="peso"]'), { target: { value: '6000' } });
    fireEvent.change(document.querySelector('input[name="fisico"]'), { target: { value: '4' } });
    expect(document.querySelector('input[name="energia_fisica"]').value).toBe('159');
  });

  // A regra que vem da spec §6: dragão tem absorção 30 fixa, e a fórmula dá 20.
  // Se o campo fosse travado, editar um dragão corromperia o valor dele.
  it('aceita sobrescrita manual e marca que foi sobrescrito', () => {
    montar({ tabela: 'criaturas', linha: null });
    fireEvent.change(document.querySelector('input[name="fisico"]'), { target: { value: '4' } });
    const abs = document.querySelector('input[name="absorcao"]');
    expect(abs.value).toBe('20');
    expect(abs.disabled).toBe(false);
    fireEvent.change(abs, { target: { value: '30' } });
    expect(abs.value).toBe('30');
    // Mexer noutra entrada NÃO pode reverter a sobrescrita.
    fireEvent.change(document.querySelector('input[name="agilidade"]'), { target: { value: '6' } });
    expect(abs.value).toBe('30');
  });
});

describe('gravação', () => {
  it('criar chama insert na tabela do descritor', async () => {
    montar({ linha: null });
    fireEvent.change(document.querySelector('input[name="key"]'), { target: { value: 'nova' } });
    fireEvent.change(document.querySelector('input[name="nome"]'), { target: { value: 'Nova' } });
    fireEvent.change(document.querySelector('input[name="custo"]'), { target: { value: '2' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoInsert).not.toBeNull());
    expect(ultimoInsert.tabela).toBe('tecnicas');
    expect(ultimoInsert.payload.key).toBe('nova');
  });

  it('erro do banco aparece na tela, com o texto do Postgres', async () => {
    erroSimulado = { message: 'duplicate key value violates unique constraint' };
    montar({ linha: null });
    fireEvent.change(document.querySelector('input[name="key"]'), { target: { value: 'mira' } });
    fireEvent.change(document.querySelector('input[name="nome"]'), { target: { value: 'Mira' } });
    fireEvent.change(document.querySelector('input[name="custo"]'), { target: { value: '2' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => {
      expect(document.body.textContent).toMatch(/duplicate key value/);
    });
  });
});
