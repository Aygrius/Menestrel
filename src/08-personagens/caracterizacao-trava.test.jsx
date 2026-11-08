/* ============================================================
   caracterizacao-trava.test.jsx — 08/11/2026
   ============================================================
   "Ao selecionar uma característica negativa primeiro, os pontos ficam 0 e
   não é possível comprar mais nada. A ideia é travar só depois que salvar."
   Na edição, a escolha travava assim que feita (a trava olhava o formulário,
   não o salvo); e, com saldo 0, a categoria vazia apagava inteira — até a
   desvantagem, que devolve pontos.
   ============================================================ */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './personagens.jsx';

// Supabase falso mínimo: lê vazio e guarda o que for gravado em personagens.
let gravados;
beforeEach(() => {
  gravados = [];
  const box = (tabela) => {
    const b = {
      select: () => b, eq: () => b, in: () => b, order: () => b, limit: () => b, single: () => b,
      range: () => Promise.resolve({ data: [], error: null }),
      update: (p) => { gravados.push({ tabela, op: 'update', payload: p }); return b; },
      insert: (p) => { gravados.push({ tabela, op: 'insert', payload: p }); return b; },
      then: (ok, f) => Promise.resolve({ data: [], error: null }).then(ok, f),
    };
    return b;
  };
  window.supabaseClient = {
    from: box,
    rpc: async () => ({ data: [], error: null }),
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u' } } } }) },
  };
});
afterEach(cleanup);

const PJ = {
  id: 'p1', user_id: 'u', nome: 'Thalia', sobrenome: '', raca: 'Humano', genero: 'Feminino',
  reino: 'Verrogar', profissao: 'Mago', experiencia: 0, data_nasc: { dia: 3, mes: 2, ano: 1180 },
  intelecto_base: 0, aura_base: 0, carisma_base: 0, forca_base: 0, fisico_base: 0, agilidade_base: 0, percepcao_base: 0,
  habilidades: {}, magias: { luz: 1 }, tecnicas: {}, grupos_armas: {}, aprimoramentos: {}, caracterizacao: {},
};

async function montar(props) {
  render(<div className="menestrel-ui"><window.NovoPersonagemModal lang="pt" onClose={() => {}} onSaved={() => {}} {...props} /></div>);
  await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
}
// As fases do topo e o passo atual (23/10/2026: os tracinhos viraram fases com nome).

const pills = () => [...document.querySelectorAll('.wiz-ident-caract .select-pill-btn')];
const opcoes = () => [...document.querySelectorAll('[role="option"]')];
async function irParaFisica() {
  for (let i = 0; i < 4 && !document.querySelector('.wiz-ident-caract'); i++) {
    const prox = [...document.querySelectorAll('.ms-footer button')].find((b) => /Próximo|Avançar|Continuar/.test(b.textContent));
    if (!prox) break;
    await act(async () => { fireEvent.click(prox); });
  }
}
async function escolher(pill, re) {
  await act(async () => { fireEvent.click(pill); });
  const op = opcoes().find((o) => re.test(o.textContent));
  await act(async () => { fireEvent.click(op); });
}

describe('caracterização na edição — trava só o salvo', () => {
  it('a escolha nova fica aberta e pode ser removida até salvar', async () => {
    await montar({ personagemExistente: PJ });
    await irParaFisica();
    await escolher(pills()[0], /\+2/);
    expect(document.querySelector('.wiz-saldo-texto').textContent).toMatch(/Restam 6 de 6/);
    expect(pills()[0].disabled).toBe(false);
    await act(async () => { fireEvent.click(pills()[0]); });
    expect(opcoes().map((o) => o.textContent)).toContain('— remover —');
  });

  it('a escolha que veio salva continua travada', async () => {
    await montar({ personagemExistente: { ...PJ, caracterizacao: { fisica: { estatura: 'gigante' } } } });
    await irParaFisica();
    expect(pills()[0].disabled).toBe(true);
  });

  it('sem saldo, a desvantagem continua disponível (ela devolve pontos)', async () => {
    const G = window.GAME_DATA.caracterizacoes.fisica;
    const fisica = { [G[0].key]: G[0].opcaoCusta.key, [G[1].key]: G[1].opcaoCusta.key };
    await montar({ personagemExistente: { ...PJ, caracterizacao: { fisica } } });
    await irParaFisica();
    expect(document.querySelector('.wiz-saldo-texto').textContent).toMatch(/Restam 0/);
    const vazio = pills()[2];
    expect(vazio.disabled).toBe(false);
    await act(async () => { fireEvent.click(vazio); });
    const [concede, custa] = opcoes();
    expect(concede.getAttribute('aria-disabled')).not.toBe('true');
    expect(custa.getAttribute('aria-disabled') === 'true' || custa.className.includes('disabled')).toBe(true);
  });
});
