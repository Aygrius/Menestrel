/* ============================================================
   lore-mestre-menu.test.jsx — Lugares e NPCs no menu do Mestre
   ============================================================
   "Não está aparecendo para o mestre o menu NPCs e lugares, vinculados à
    história selecionada." (usuário, 17/09/2026)

   O conteúdo existia: o Mestre administra este mesmo lore desde sempre, só que
   escondido atrás de Histórias → card da mesa → botão "Lore". O que faltava era
   o destino no menu lateral, que só o Jogador tinha (e no caso dele são outra
   coisa — o diário DO PERSONAGEM, por PJ ativo).

   Então há dois caminhos com o mesmo nome, e é isso que este arquivo separa:
     • Mestre  → LoreDaMesa → GerenciarLoreView travado no tipo, lendo a MESA
                 ativa (sem mesa, tela vazia — ele não tem PJ);
     • Jogador → DiarioView travado no tipo, lendo o PJ ativo.

   Memórias fica de fora do Mestre de propósito: memória é do personagem.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../09-bestiario/bestiario.jsx';
import './diario.jsx';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');

let GerenciarLoreView, LoreDaMesa;
beforeAll(() => {
  GerenciarLoreView = window.GerenciarLoreView;
  LoreDaMesa = window.LoreDaMesa;
  expect(GerenciarLoreView, 'GerenciarLoreView precisa estar no window').toBeTypeOf('function');
  expect(LoreDaMesa, 'LoreDaMesa precisa estar no window').toBeTypeOf('function');
});
const stubOriginal = globalThis.supabaseClient;
afterEach(() => { cleanup(); globalThis.supabaseClient = stubOriginal; });

const HISTORIA = {
  id: 13, titulo: 'As Marcas do Passado',
  protagonista_ids: [], npc_ids: [], reino_ids: [], cidade_ids: [], criatura_ids: [],
  lore_acesso_pj: {},
};

const ENTRADAS = [
  { id: 'npc:arissia-h13', tipo: 'npc',   nome: 'Arissia', descricao: '', atributos: {} },
  { id: 'reino:verrogar-h13', tipo: 'reino', nome: 'Verrogar', descricao: '', atributos: {} },
];

function stubBanco({ historia = HISTORIA, entradas = ENTRADAS } = {}) {
  globalThis.supabaseClient = {
    rpc: async (nome) => {
      if (nome === 'listar_lore_historia') return { data: { ok: true, entradas }, error: null };
      if (nome === 'listar_catalogo_global') return { data: { ok: true, entradas: [] }, error: null };
      return { data: null, error: null };
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: historia, error: null }) }),
        in: () => ({ order: async () => ({ data: [], error: null }) }),
        order: async () => ({ data: [], error: null }),
      }),
    }),
  };
}

describe('o menu do Mestre ganhou os dois destinos', () => {
  const ids = (perfil) => (window.ADMIN_SECTIONS[perfil] || []).map((s) => s.id);

  it('Lugares e NPCs aparecem para o Mestre', () => {
    expect(ids('master')).toEqual(expect.arrayContaining(['lugares', 'npcs']));
  });

  it('memórias continua só do Jogador — memória é do personagem', () => {
    expect(ids('master')).not.toContain('memorias');
    expect(ids('player')).toContain('memorias');
  });

  it('e o Jogador não perdeu os dele', () => {
    expect(ids('player')).toEqual(expect.arrayContaining(['lugares', 'npcs', 'memorias']));
  });
});

/* O AdminConsole inteiro só monta com sessão; o que dá para afirmar aqui é o
   contrato no fonte — mesmo caminho de log-eventos.test.jsx. */
describe('o shell manda cada perfil para a tela certa', () => {
  const shell = readFileSync(resolve(raiz, '10-shell/shell.jsx'), 'utf8');
  const i = shell.indexOf("(current.id === 'lugares' || current.id === 'npcs' || current.id === 'memorias')");
  const trecho = shell.slice(i, i + 2200);

  it('Mestre em Lugares/NPCs cai no lore da MESA ativa', () => {
    expect(i, 'não achei o ramo das seções do diário').toBeGreaterThan(-1);
    expect(trecho).toMatch(/profile === 'master' && current\.id !== 'memorias'/);
    expect(trecho).toMatch(/<LoreDaMesa/);
    expect(trecho).toMatch(/historiaId=\{mesaAtivaId\}/);
  });

  it('e o Jogador segue no diário do PJ ativo', () => {
    expect(trecho).toMatch(/<DiarioView/);
    expect(trecho).toMatch(/pj=\{pjAtivo\}/);
  });
});

describe('LoreDaMesa', () => {
  it('sem mesa selecionada, mostra o vazio que o console passou', () => {
    const { container } = render(
      <LoreDaMesa historiaId={null} lang="pt" tipoFixo="npc" vazio={<p className="nada">sem mesa</p>} />
    );
    expect(container.querySelector('.nada')).toBeTruthy();
  });

  it('com mesa, busca a linha inteira da história e abre o lore dela', async () => {
    stubBanco();
    render(<LoreDaMesa historiaId={13} lang="pt" tipoFixo="npc" />);
    await waitFor(() => expect(document.querySelector('.lore-mng-page')).toBeTruthy());
    expect(document.querySelector('.lore-mng-page-eyebrow').textContent).toMatch(/As Marcas do Passado/);
  });
});

describe('travado num tipo, a tela do Mestre deixa de oferecer a escolha', () => {
  const montar = (tipoFixo, extra = {}) => render(
    <GerenciarLoreView historia={HISTORIA} lang="pt" tipoFixo={tipoFixo} {...extra} />
  );

  /* A espera era pela .lore-mng-toolbar, que até 17/09/2026 existia sempre —
     ela carregava a busca. A busca subiu pro cabeçalho (BestBuscaENovo, o
     padrão das outras páginas) e a faixa ficou sendo só as sub-abas: com
     tipoFixo ela não é renderizada, então esperar por ela era esperar para
     sempre. O corpo da página serve de âncora, e é o que o teste quer dizer
     mesmo — "a tela carregou, e não há sub-abas nela". */
  it('sem as abas npc/lugar/criatura', async () => {
    stubBanco();
    montar('npc');
    await waitFor(() => expect(document.querySelector('.lore-mng-page-body')).toBeTruthy());
    expect(document.querySelector('.diario-subtabs')).toBeNull();
    expect(document.querySelector('.lore-mng-toolbar')).toBeNull();
  });

  /* Quem chegou pelo menu lateral não veio de lugar nenhum — por isso o botão
     depende de `onClose`, e não de uma flag própria. */
  it('e sem o "voltar às histórias"', async () => {
    stubBanco();
    montar('npc');
    await waitFor(() => expect(document.querySelector('.lore-mng-page-header')).toBeTruthy());
    expect(document.querySelector('[aria-label="Voltar às histórias"]')).toBeNull();
  });

  it('mas com ele quando vem de Histórias → Lore', async () => {
    stubBanco();
    render(<GerenciarLoreView historia={HISTORIA} lang="pt" onClose={() => {}} />);
    await waitFor(() => expect(document.querySelector('.lore-mng-page-header')).toBeTruthy());
    expect(document.querySelector('[aria-label="Voltar às histórias"]')).toBeTruthy();
    expect(document.querySelector('.diario-subtabs')).toBeTruthy();
  });

  it('o título é o nome da seção, as mesmas palavras do menu', async () => {
    stubBanco();
    montar('lugar');
    await waitFor(() => expect(document.querySelector('.lore-mng-page-h2')).toBeTruthy());
    expect(document.querySelector('.lore-mng-page-h2').textContent).toBe('Lugares');
  });

  it('e em NPCs o título acompanha', async () => {
    stubBanco();
    montar('npc');
    await waitFor(() => expect(document.querySelector('.lore-mng-page-h2')).toBeTruthy());
    expect(document.querySelector('.lore-mng-page-h2').textContent).toBe('NPCs');
  });

  it('vindo de Histórias, o título continua sendo "Lore"', async () => {
    stubBanco();
    render(<GerenciarLoreView historia={HISTORIA} lang="pt" onClose={() => {}} />);
    await waitFor(() => expect(document.querySelector('.lore-mng-page-h2')).toBeTruthy());
    expect(document.querySelector('.lore-mng-page-h2').textContent).toBe('Lore');
  });
});
