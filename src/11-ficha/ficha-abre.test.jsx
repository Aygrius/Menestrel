/* ============================================================
   ficha-abre.test.jsx — a ficha do personagem ABRE
   ============================================================
   Bug de 06/10/2026, relatado pelo usuário: "a ficha do personagem não está
   abrindo."

   Um `useEffect` novo havia sido declarado DEPOIS dos returns de carregamento
   de FichaPersonagem. Na primeira passada (pj ainda null) o componente chamava
   N hooks; na segunda, N+1. O React recusa a mudança de contagem — "Rendered
   more hooks than during the previous render" — e a ficha inteira morria.

   O que faltava não era um teste da regra (isso é
   ficha-hooks-antes-dos-returns.test.js, que varre a fonte): faltava ALGUÉM
   MONTAR a ficha. Nenhum teste do projeto montava FichaPersonagem, e por isso
   um erro que derruba a tela toda passou batido.

   Este arquivo monta de verdade, ATRAVESSANDO A TRANSIÇÃO que quebrava: a
   primeira pintura com `pj` null (tela de Carregando), as promessas do banco
   resolvendo, e a segunda pintura com a ficha montada. É nessa fronteira que a
   contagem de hooks muda, e é por isso que o dublê resolve em duas etapas em
   vez de entregar tudo pronto.

   O dublê é deliberadamente MAGRO: devolve o mínimo que cada consulta precisa
   e nada mais. Ele não prova que a ficha está certa — prova que ela ABRE, que
   é a regressão que doeu.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/select-pill.jsx';
import '../01-core/clima-desgaste.jsx';
import '../01-core/game-data.jsx';
import '../01-core/forma-raca.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import '../01-core/status-efeito.jsx';
import '../01-core/efeito-temporario.jsx';
import '../01-core/fabricacao.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../12-batalha/batalha.jsx';
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';
import './atalhos-ficha.jsx';
import './ficha.jsx';

const PJ = {
  id: 64, user_id: 'u1', nome: 'Yuldrous', sobrenome: 'Ferro',
  raca: 'Anão', genero: 'Masculino', profissao: 'Guerreiro', experiencia: 40,
  intelecto_base: 0, aura_base: -1, carisma_base: -1,
  forca_base: 2, fisico_base: 2, percepcao_base: 0, agilidade_base: -2,
  habilidades: {}, magias: {}, tecnicas: {}, grupos_armas: {},
  inventario: { itens: [] }, estado_atual: {}, localizacao: 'Haafel',
  data_nasc: { dia: 1, mes: 1, ano: 1480 }, caracterizacao: {},
};
const HISTORIA = {
  id: 24, protagonista_ids: [64], pausada: false,
  data_jogo_atual: { dia: 11, mes: 11, ano: 1500, hora: 10 },
};

/* O dublê. `select('*')` de cada catálogo devolve [], que é o bastante: a
   ficha precisa que eles NÃO sejam null (é esse o gate do Carregando), não que
   tenham conteúdo. */
function stub() {
  const tabela = (nome) => {
    const b = {
      select: () => b,
      eq: () => b,
      order: () => b,
      limit: () => b,
      contains: () => b,
      range: async () => ({ data: [], error: null }),
      maybeSingle: async () => ({
        data: nome === 'personagens' ? PJ : (nome === 'historias' ? HISTORIA : null),
        error: null,
      }),
      update: () => ({ eq: async () => ({ error: null }) }),
      then: (ok, falha) => Promise.resolve({ data: [], error: null }).then(ok, falha),
    };
    return b;
  };
  globalThis.supabaseClient = {
    from: tabela,
    rpc: async () => ({ data: [], error: null }),
    channel: () => { const ch = { on: () => ch, subscribe: () => ch }; return ch; },
    removeChannel: () => {},
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
  };
}

let FichaPersonagem;
beforeAll(() => {
  FichaPersonagem = window.FichaPersonagem;
  expect(FichaPersonagem, 'FichaPersonagem precisa estar no window').toBeTypeOf('function');
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const montar = (props) => render(
  <div className="menestrel-ui">
    <FichaPersonagem lang="pt" currentUserId="u1" pjAtivoId={64}
      onVoltar={() => {}} {...(props || {})} />
  </div>
);

describe('a ficha do personagem abre', () => {
  it('atravessa o Carregando e monta, sem erro de hooks', async () => {
    stub();
    /* O erro de contagem de hooks chega como console.error ANTES de a árvore
       morrer — então ele é vigiado, e não só o resultado na tela. Sem isto um
       React futuro que degradasse o erro para aviso passaria batido. */
    const erros = [];
    vi.spyOn(console, 'error').mockImplementation((...a) => { erros.push(a.join(' ')); });

    montar();
    /* O cabeçalho com o nome é o sinal de que a ficha montou. Ancorado no
       SELETOR e não em getByText: o nome vem partido em nós dentro do <h2>, e
       getByText não casa texto quebrado. */
    await waitFor(() => {
      const t = document.querySelector('.ms-title');
      expect(t, 'a ficha não montou').toBeTruthy();
      expect(t.textContent).toMatch(/Yuldrous/);
    });

    const hooks = erros.filter((e) => /Rendered more hooks|Rendered fewer hooks|order of Hooks/i.test(e));
    expect(hooks, 'React reclamou da contagem/ordem de hooks:\n' + hooks.join('\n')).toEqual([]);
  });

  it('as barras de condição aparecem — o corpo da ficha renderizou', async () => {
    stub();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    montar();
    await waitFor(() => expect(document.querySelector('.ms-title')).toBeTruthy());
    // As barras são o corpo da ficha: se elas vieram, o render foi até o fim.
    await waitFor(() => expect(document.querySelector('.fp-bar-row')).toBeTruthy());
  });

  it('e abre também para o Mestre, que não espera a história', async () => {
    // O Jogador espera `historiaResolvida`; o Mestre entra reto. São dois
    // caminhos diferentes pelos returns de carregamento — os dois têm de abrir.
    stub();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    montar({ isMestre: true });
    await waitFor(() => expect(document.querySelector('.ms-title')).toBeTruthy());
  });

  it('em forma de vampiro, abre e esconde as barras de que ele é imune', async () => {
    /* A forma mexe em sete atributos e tira cinco barras no meio do render —
       se ela derrubasse a ficha, seria aqui. */
    const vampiro = { ...PJ, estado_atual: { forma: { raca: 'Vampiro' } } };
    globalThis.supabaseClient = null;
    stub();
    const orig = globalThis.supabaseClient.from;
    globalThis.supabaseClient.from = (nome) => {
      const b = orig(nome);
      if (nome === 'personagens') b.maybeSingle = async () => ({ data: vampiro, error: null });
      return b;
    };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    montar();
    await waitFor(() => expect(document.querySelector('.fp-bar-row')).toBeTruthy());
    const rotulos = [...document.querySelectorAll('.fp-bar-row')]
      .map((el) => el.textContent || '').join('|');
    expect(rotulos).not.toMatch(/Doença|Sede|Sono|Frio|Calor/);
  });
});
