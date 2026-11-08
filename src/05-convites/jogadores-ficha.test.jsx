/* ============================================================
   jogadores-ficha.test.jsx — editar e excluir a ficha pelo card
   ============================================================
   Usuário (08/11/2026): "Para editar ou excluir uma ficha, será necessário
   clicar no card em 'jogadores'." O card de quem entrou com um personagem
   abre o leque com Editar ficha e Excluir ficha; o convite ainda sem
   ninguém segue copiando o código.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';
import '../05-convites/convites.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

const stubOriginal = globalThis.supabaseClient;
afterEach(() => { cleanup(); globalThis.supabaseClient = stubOriginal; });

const CONVITES = [
  { id: 1, codigo: 'ABC123', status: 'usado', status_real: 'usado', usado_por: 'u-ana', usado_por_nome: 'Ana',
    personagem_id: 7, personagem_nome: 'Lirael', usado_em: '2026-11-01', expira_em: '2026-11-08' },
  { id: 2, codigo: 'XYZ789', status: 'ativo', status_real: 'ativo', usado_por: null, personagem_id: null,
    expira_em: '2026-11-15' },
];

let View;
beforeAll(() => { View = window.ConvitesHistoriaView; expect(View).toBeTypeOf('function'); });

function montar() {
  globalThis.supabaseClient = fakeSupabase({
    personagens: [{ id: 7, nome: 'Lirael', foto_url: null, user_id: 'u-ana' }],
    __rpc: { listar_convites_da_historia: CONVITES },
  });
  return render(<div className="menestrel-ui"><View historia={{ id: 9 }} t={window.COPY ? window.COPY.pt : { convites: { mng: {}, status: {} } }}
    lang="pt" onClose={() => {}} onChanged={() => {}} /></div>);
}

describe('Jogadores: a ficha pelo card', () => {
  it('o card com personagem abre o leque com Editar ficha e Excluir ficha', async () => {
    const { container } = montar();
    await waitFor(() => expect(container.querySelector('[data-pj="7"]')).toBeTruthy());
    fireEvent.click(container.querySelector('[data-pj="7"]'));
    await waitFor(() => expect(document.querySelector('[data-acao-leque="editar"]')).toBeTruthy());
    expect([...document.querySelectorAll('[data-acao-leque]')].map((b) => b.dataset.acaoLeque)).toEqual(['editar', 'excluir']);
    expect(document.querySelector('[data-acao-leque="excluir"]').getAttribute('aria-label')).toBe('Excluir ficha');
  });

  it('o convite sem personagem não abre leque', async () => {
    const { container } = montar();
    await waitFor(() => expect(container.querySelectorAll('.convite-cartao').length).toBe(2));
    const semPj = [...container.querySelectorAll('.convite-cartao')].find((a) => !a.dataset.pj);
    fireEvent.click(semPj);
    expect(document.querySelector('[data-acao-leque]')).toBeNull();
  });
});

/* 08/11/2026: "Essa mensagem está aparecendo em Jogadores: 'Convite usado não
   se exclui — ele some junto com o personagem.' eu quero excluir o
   personagem." A lixeira do card com personagem exclui a FICHA. */
describe('Jogadores: a lixeira do card com personagem', () => {
  it('abre a confirmação de excluir a ficha, sem tentar apagar o convite', async () => {
    const original = window.ConfirmarExclusaoModal;
    window.ConfirmarExclusaoModal = ({ personagem }) => <div data-confirma={personagem.id}>confirmar {personagem.nome}</div>;
    try {
      const { container } = montar();
      await waitFor(() => expect(container.querySelector('[data-pj="7"]')).toBeTruthy());
      const lixeira = container.querySelector('[data-pj="7"] .convite-cartao-botao.is-perigo');
      expect(lixeira.getAttribute('aria-label')).toBe('Excluir ficha');
      fireEvent.click(lixeira);
      await waitFor(() => expect(document.querySelector('[data-confirma="7"]')).toBeTruthy());
      expect(document.body.textContent).not.toMatch(/Convite usado não se exclui/);
    } finally { window.ConfirmarExclusaoModal = original; }
  });
});
