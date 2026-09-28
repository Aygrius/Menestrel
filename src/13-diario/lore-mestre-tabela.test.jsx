/* ============================================================
   lore-mestre-tabela.test.jsx — NPCs e Lugares do Mestre viram tabela
   ============================================================
   "A página e tabela de NPCs e lugares será igual a de criaturas, itens, etc.
    Isso quer dizer que será uma tabela com colunas, botão de buscar e '+'.
    Isso quer dizer que as informações dentro de NPCs e lugares vão ser
    mostradas quando expandir a entrada." (usuário, 17/09/2026)

   Era uma .diario-vinculo-list: uma linha solta por entrada, com checkbox de
   disponibilizar, nome e os botões de ver/editar/excluir. A tela do JOGADOR
   já havia virado tabela em 12/09/2026; esta é a do Mestre chegando no mesmo
   padrão, com as MESMAS peças que o bestiário exporta — não uma tabela
   parecida escrita de novo aqui.

   Três coisas mudaram de dono nessa migração, e é isso que o teste guarda:

   1. A COLUNA DE CHECKBOX SAIU. Ela ligava historias.<tipo>_ids, metade da
      resposta a "quem vê isto"; a outra metade morava dentro da ficha, no
      bloco "Liberar para". As duas foram para o modal do olho, e a tabela
      ganhou uma coluna Visibilidade que só MOSTRA o resultado.

   2. O OLHO DEIXOU DE ABRIR A FICHA. A ficha abre ao clicar na linha, e o
      olho é permissão (PermissaoEntradaModal). Até 26/09/2026 a ficha era a
      expansão da linha; desde então abre numa janela ("ao clicar no item da
      tabela, vai abrir um modal ao invés de expandir").

   3. GLOBAL NÃO GANHA LIXEIRA — mas ganha LÁPIS. A lista antiga não dava
      nenhum dos dois, e isso deixava o catálogo do mundo sem forma de editar:
      foi a pergunta do usuário ("como o mestre vai editar os reinos e
      cidades, e npcs se não tem o botão de edição?"). O lápis entrou em
      17/09/2026 e forka pelo p_id; a lixeira continua fora porque
      excluir_lore_entrada recusa apagar global.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../09-bestiario/ataques-criatura.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../09-bestiario/bestiario.jsx';
import './diario.jsx';

let GerenciarLoreView;
beforeAll(() => {
  GerenciarLoreView = window.GerenciarLoreView;
  expect(GerenciarLoreView, 'GerenciarLoreView precisa estar no window').toBeTypeOf('function');
  // window.UI vem de components/ui-bridge.ts (kit shadcn) em produção.
  window.UI = {
    ...window.UI,
    Table: 'table', TableHeader: 'thead', TableBody: 'tbody',
    TableRow: 'tr', TableHead: 'th', TableCell: 'td',
    Input: (props) => <input {...props} />,
  };
});

const stubOriginal = globalThis.supabaseClient;
afterEach(() => { cleanup(); globalThis.supabaseClient = stubOriginal; });

const PROTAGONISTAS = [{ id: 42, nome: 'Thalia' }, { id: 87, nome: 'Yuldrous' }];

const HISTORIA = {
  id: 13, titulo: 'As Marcas do Passado',
  protagonista_ids: [42, 87],
  npc_ids: ['arissia-h13'],               // Arissia: todos veem
  reino_ids: [], cidade_ids: [], criatura_ids: [],
  lore_acesso_pj: { 'npc:arissia-h13': [42] },  // ...não: só a Thalia
};

const NPCS = [
  { id: 'arissia-h13', tipo: 'npc', nome: 'Arissia', descricao: 'A alquimista.', atributos: { raca: 'Humano', cidade: 'brann-h13', reino: 'verrogar-h13' } },
  { id: 'gorm-h13',    tipo: 'npc', nome: 'Gorm',    descricao: '', atributos: { raca: 'Anão' } },
];
const LUGARES = [
  { id: 'verrogar-h13', tipo: 'reino',  nome: 'Verrogar', descricao: '', atributos: {} },
  { id: 'brann-h13',    tipo: 'cidade', nome: 'Brann',    descricao: '', atributos: { reino: 'verrogar-h13' } },
];
const NPC_GLOBAL = { id: 'mundo-npc', nome: 'Andarilho', descricao: '', atributos: {} };

let chamadasRpc;
function stubBanco({ historia = HISTORIA, entradas = [...NPCS, ...LUGARES], globais = {}, admin = false } = {}) {
  chamadasRpc = [];
  globalThis.supabaseClient = {
    rpc: async (nome, args) => {
      chamadasRpc.push({ nome, args });
      if (nome === 'listar_lore_historia') return { data: { ok: true, entradas }, error: null };
      if (nome === 'eh_admin') return { data: admin, error: null };
      if (nome === 'listar_catalogo_global') {
        return { data: { ok: true, entradas: globais[args?.p_tipo] || [] }, error: null };
      }
      return { data: { ok: true }, error: null };
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: historia, error: null }) }),
        in: () => ({ order: async () => ({ data: PROTAGONISTAS, error: null }) }),
        order: async () => ({ data: [], error: null }),
      }),
      update: () => ({ eq: () => ({ select: async () => ({ data: [historia], error: null }) }) }),
    }),
  };
}

/* ⚠️ A `historia` chega por PROP, não pelo stub do banco: é o LoreDaMesa que
   busca a linha inteira e a repassa (ver a nota dele em diario.jsx). Quem
   quiser testar outro estado de visibilidade tem que passar `historia` aqui,
   não só em stubBanco. */
const montar = (tipoFixo, extra = {}) => render(
  <GerenciarLoreView historia={HISTORIA} lang="pt" tipoFixo={tipoFixo} {...extra} />
);

const pronta = () => waitFor(() => expect(document.querySelector('.best-table-wrap')).toBeTruthy());
/* Sem as setas de ordenação que o SortHead injeta, e sem a coluna de ações,
   que não tem rótulo — mesmo helper de diario-tabela-render.test.jsx. */
const cabecalho = () => [...document.querySelectorAll('thead th')]
  .map((th) => (th.textContent || '').replace(/[▲▼]/g, '').trim()).filter(Boolean);
const linhas = () => [...document.querySelectorAll('tbody tr:not(.best-detail)')];
const celulas = (tr) => [...tr.querySelectorAll('td')].map((t) => t.textContent.trim());
const linhaDe = (nome) => linhas().find((tr) => celulas(tr)[0] === nome);
const acao = (tr, classe) => tr.querySelector(`.diario-td-acoes .${classe}`);
/* Olho e lápis moram no CABEÇALHO DA FICHA desde 26/09/2026 ("o ícone de lápis
   e olho fica junto com o x"): abre a ficha pela linha e clica no ícone. */
const acaoNaFicha = (classe) => document.querySelector(`.ms-backdrop .ms-acao .${classe}`);
const abrirAcao = (nome, classe) => {
  fireEvent.click(linhaDe(nome));
  fireEvent.click(acaoNaFicha(classe).closest('button'));
};

describe('é a tabela padrão, com as peças das outras páginas', () => {
  it('tem a moldura, o cabeçalho e a busca do catálogo', async () => {
    stubBanco(); montar('npc');
    await pronta();
    expect(document.querySelector('.best-table-wrap')).toBeTruthy();
    // A busca e o + no cabeçalho do card, não numa barra própria abaixo.
    expect(document.querySelector('.fp-card-top .best-search')).toBeTruthy();
    expect(document.querySelector('.fp-card-top [aria-label="Novo"]')).toBeTruthy();
  });

  it('a lista solta com checkbox não existe mais', async () => {
    stubBanco(); montar('npc');
    await pronta();
    expect(document.querySelector('.diario-vinculo-list')).toBeNull();
    // Nenhum checkbox na tabela: disponibilizar virou assunto do olho.
    expect(document.querySelectorAll('tbody input[type="checkbox"]')).toHaveLength(0);
  });

  /* 26/09/2026: "na tabela de conhecidos, remova a coluna fonte e
     localização, e adicione a coluna reino". */
  /* Visibilidade virou ícone ao lado do nome em 26/09/2026. */
  /* Raça e Reino saíram em 26/09/2026 ("da página de conhecidos, remover as
     colunas Raça e Reino"); sem coluna de ações — tudo foi para a ficha. */
  it('Conhecidos: só o Nome', async () => {
    stubBanco(); montar('npc');
    await pronta();
    expect(cabecalho()).toEqual(['Nome']);
    expect(celulas(linhaDe('Arissia'))).toEqual(['Arissia']);
  });

  /* Reinos e Cidades viraram páginas próprias em 26/09/2026: sem coluna Tipo
     e sem Visibilidade (que foi para o lado do nome). */
  it('Reinos: só reinos, só o Nome', async () => {
    stubBanco(); montar('reino');
    await pronta();
    expect(cabecalho()).toEqual(['Nome']);
    expect(linhaDe('Verrogar')).toBeTruthy();
    expect(linhaDe('Brann')).toBeFalsy();
  });

  it('Cidades: só cidades', async () => {
    stubBanco(); montar('cidade');
    await pronta();
    expect(linhaDe('Brann')).toBeTruthy();
    expect(linhaDe('Verrogar')).toBeFalsy();
  });


});

/* Em Conhecidos a coluna é só ÍCONE desde 26/09/2026: olho = todos, olho
   riscado = ninguém, olho com exclamação = alguns. O texto de antes continua
   no aria-label (e no tooltip). */
describe('a coluna Visibilidade lê o estado real das duas colunas do banco', () => {
  const vis = (nome) => linhaDe(nome).querySelector('.diario-vis-ic');

  it('liberada só pra um PJ: olho com exclamação, e a proporção no rótulo', async () => {
    stubBanco(); montar('npc');
    await pronta();
    // npc_ids tem Arissia E lore_acesso_pj lista só a Thalia → 1 de 2.
    expect(vis('Arissia').querySelector('i').className).toBe('ti ti-eye-exclamation');
    expect(vis('Arissia').getAttribute('aria-label')).toBe('1/2');
    expect(vis('Arissia').textContent.trim(), 'só o ícone, sem texto').toBe('');
  });

  it('não disponibilizada: olho riscado, "Ninguém" no rótulo', async () => {
    stubBanco(); montar('npc');
    await pronta();
    expect(vis('Gorm').querySelector('i').className).toBe('ti ti-eye-off');
    expect(vis('Gorm').getAttribute('aria-label')).toBe('Ninguém');
  });

  it('disponibilizada sem lista: olho, "Todos os protagonistas" no rótulo', async () => {
    const semLista = { ...HISTORIA, lore_acesso_pj: {} };
    stubBanco({ historia: semLista });
    montar('npc', { historia: semLista });
    await pronta();
    expect(vis('Arissia').querySelector('i').className).toBe('ti ti-eye');
    expect(vis('Arissia').getAttribute('aria-label')).toBe('Todos os protagonistas');
  });

  it('Reinos também: o ícone ao lado do nome', async () => {
    stubBanco(); montar('reino');
    await pronta();
    expect(linhaDe('Verrogar').querySelector('.diario-vis-chip')).toBeNull();
    expect(linhaDe('Verrogar').querySelector('.best-name .diario-vis-ic i.ti')).toBeTruthy();
  });
});

/* Janela desde 26/09/2026: "ao clicar no item da tabela, vai abrir um modal
   ao invés de expandir" (usuário). Até ali a ficha era a expansão da linha. */
const ficha = () => document.querySelector('.ms-backdrop [role="dialog"]');

describe('a ficha abre numa janela', () => {
  it('nada nasce aberto', async () => {
    stubBanco(); montar('npc');
    await pronta();
    expect(ficha()).toBeNull();
  });

  it('clicar na linha abre a ficha numa janela, fora da tabela', async () => {
    stubBanco(); montar('npc');
    await pronta();
    fireEvent.click(linhaDe('Arissia'));
    const janela = ficha();
    expect(janela).toBeTruthy();
    expect(janela.closest('table'), 'a janela não pode morar dentro da tabela').toBeNull();
    expect(document.querySelector('.diario-det-inline')).toBeNull();
    expect(janela.textContent).toMatch(/A alquimista/);
  });

  it('clicar dentro da janela não a fecha', async () => {
    stubBanco(); montar('npc');
    await pronta();
    fireEvent.click(linhaDe('Arissia'));
    /* Evento de React atravessa o portal: sem o stopPropagation da moldura o
       clique chegava ao onClick da linha, que fechava a janela. */
    fireEvent.click(ficha().querySelector('.ms-body'));
    expect(ficha()).toBeTruthy();
  });

  it('o X fecha a janela', async () => {
    stubBanco(); montar('npc');
    await pronta();
    fireEvent.click(linhaDe('Arissia'));
    fireEvent.click(ficha().querySelector('.ms-close[aria-label="Fechar"]'));
    expect(ficha()).toBeNull();
  });
});

describe('o olho é permissão, não ficha', () => {
  it('abre o modal de quem pode ver', async () => {
    stubBanco(); montar('npc');
    await pronta();
    abrirAcao('Arissia', 'ti-eye');
    const modal = document.querySelector('.diario-permissao-modal');
    expect(modal).toBeTruthy();
    /* Escopado ao modal: a página também tem um .ms-title (o nome da seção,
       "NPCs"), e um querySelector solto pega o da página. */
    expect(modal.querySelector('.ms-title').textContent).toMatch(/Arissia/);
    expect(modal.querySelectorAll('input[type="radio"]').length).toBeGreaterThan(0);
  });

  it('e abre no estado que a linha mostrava', async () => {
    stubBanco(); montar('npc');
    await pronta();
    abrirAcao('Arissia', 'ti-eye');
    const marcado = [...document.querySelectorAll('.diario-permissao-modal input[type="radio"]')]
      .find((r) => r.checked);
    expect(marcado.value).toBe('alguns');
  });

  /* Clicar no olho não deve abrir a linha junto: os dois gestos vivem na
     mesma <tr>, e sem stopPropagation o modal subiria com a ficha aberta
     atrás dele. */
  it('o olho da ficha abre a permissão por cima dela', async () => {
    stubBanco(); montar('npc');
    await pronta();
    abrirAcao('Gorm', 'ti-eye');
    expect(document.querySelector('.diario-permissao-modal')).toBeTruthy();
    /* "Quando clico no olho dentro do modal, a tela não está abrindo"
       (26/09/2026): a ficha ficava aberta e, montada por último na mesma
       camada, cobria a permissão. Agora a ficha fecha: só sobra uma janela. */
    expect(document.querySelectorAll('.ms-backdrop')).toHaveLength(1);
  });
});

describe('cópia e global não têm as mesmas ações', () => {
  /* Olho, lápis e lixeira no cabeçalho da ficha, ao lado do X (26/09/2026:
     "o ícone de excluir deve ficar ao lado do botão x"). */
  it('cópia da história tem olho, lápis e lixeira — na ficha, não na linha', async () => {
    stubBanco(); montar('npc');
    await pronta();
    const tr = linhaDe('Arissia');
    expect(tr.querySelector('button')).toBeNull();
    fireEvent.click(tr);
    expect(acaoNaFicha('ti-eye')).toBeTruthy();
    expect(acaoNaFicha('ti-pencil')).toBeTruthy();
    expect(acaoNaFicha('ti-trash')).toBeTruthy();
  });

  it('a lixeira pede dois cliques: o primeiro arma, o segundo apaga', async () => {
    stubBanco(); montar('npc');
    await pronta();
    fireEvent.click(linhaDe('Arissia'));
    fireEvent.click(acaoNaFicha('ti-trash').closest('button'));
    expect(chamadasRpc.some((c) => c.nome === 'excluir_lore_entrada')).toBe(false);
    expect(acaoNaFicha('ti-trash-x')).toBeTruthy();
    fireEvent.click(acaoNaFicha('ti-trash-x').closest('button'));
    await waitFor(() => expect(chamadasRpc.some((c) => c.nome === 'excluir_lore_entrada')).toBe(true));
  });

  /* O global GANHA lápis (17/09/2026). Sem ele o Mestre não tinha como editar
     um reino, cidade ou NPC do catálogo do mundo — e era a pergunta do
     usuário: "como o mestre vai editar os reinos e cidades, e npcs se não tem
     o botão de edição?".

     Não havia caminho nenhum: o lápis só existia nas cópias, e o
     SelecionarBaseModal (a tela de "escolher a base do fork") está no arquivo
     mas nunca foi renderizado por ninguém. O desenho sempre previu isto — o
     cabeçalho do arquivo diz que "editar um global dispara fork automático
     por baixo" — e só a metade da UI faltava.

     LIXEIRA continua fora, e não é esquecimento: excluir_lore_entrada recusa
     apagar global, então o botão abriria para dar erro. */
  it('global ganha olho e lápis, mas não lixeira', async () => {
    stubBanco({ globais: { npc: [NPC_GLOBAL] } });
    montar('npc');
    await pronta();
    const tr = linhaDe('Andarilho');
    fireEvent.click(tr);
    expect(acaoNaFicha('ti-trash'), 'excluir_lore_entrada recusa global').toBeNull();
    expect(acaoNaFicha('ti-eye')).toBeTruthy();
    expect(acaoNaFicha('ti-pencil'), 'o global tem que ser editável').toBeTruthy();
  });

  it('o lápis do global abre o formulário com os dados dele', async () => {
    stubBanco({ globais: { npc: [{ ...NPC_GLOBAL, nome: 'Andarilho', descricao: 'Vem de longe.' }] } });
    montar('npc');
    await pronta();
    abrirAcao('Andarilho', 'ti-pencil');
    const form = document.querySelector('.ms-backdrop');
    expect(form).toBeTruthy();
    expect(form.querySelector('.diario-input').value).toBe('Andarilho');
  });

  /* Salvar um global cria uma CÓPIA da mesa — é o que a RPC faz quando recebe
     o slug de um global (slug_base := p_id → criar_copia_*). A lista passa a
     ter duas linhas com o mesmo nome, uma "Mundo" e uma "Mesa", e o Mestre
     precisa saber disso ANTES de salvar, senão parece bug. */
  it('e avisa que salvar vai criar uma cópia da mesa', async () => {
    stubBanco({ globais: { npc: [NPC_GLOBAL] } });
    montar('npc');
    await pronta();
    abrirAcao('Andarilho', 'ti-pencil');
    const aviso = document.querySelector('.diario-fork-aviso');
    expect(aviso, 'o aviso do fork não apareceu').toBeTruthy();
    expect(aviso.textContent).toMatch(/c[óo]pia/i);
  });

  it('editar uma cópia da mesa não mostra aviso nenhum', async () => {
    stubBanco(); montar('npc');
    await pronta();
    abrirAcao('Arissia', 'ti-pencil');
    expect(document.querySelector('.diario-fork-aviso')).toBeNull();
  });

  it('mas a ficha do global abre igual', async () => {
    stubBanco({ globais: { npc: [NPC_GLOBAL] } });
    montar('npc');
    await pronta();
    fireEvent.click(linhaDe('Andarilho'));
    expect(ficha()).toBeTruthy();
  });
});

/* ── Campos derivados não são dados da entrada ────────────────────────────
   A tabela cria campos com prefixo `_` para o SortHead poder ordenar por
   eles (_fonte, _tipoLabel, _raca, _cidade, _visibilidade) — o useSort
   ordena pelo valor da chave da coluna, não por uma função de comparação.

   Esses campos viajam no mesmo objeto que vai para a ficha da linha
   expandida, e a ficha monta a grade de atributos varrendo Object.entries da
   entrada. Sem filtro, "Fonte: Mesa" e "Visibilidade: 1/2" apareceriam como
   ATRIBUTOS do NPC, ao lado de Raça e Idade — dados da tela vazando como
   dados do mundo. O `_global` já era assim desde a migration 016 e já tinha
   uma exceção nominal; agora a regra é o prefixo. */
describe('a ficha não mostra os campos da tabela', () => {
  /* ⚠️ A grade de atributos vive na aba FICHA, e a ficha abre na aba
     Descrição. Sem clicar em Ficha não existe um único .diario-det-attr-k na
     tela, e a asserção passa por vazio — foi exatamente o que aconteceu na
     primeira versão deste teste, que deu verde com o vazamento no lugar. */
  const rotulosDaFicha = async () => {
    stubBanco(); montar('npc');
    await pronta();
    fireEvent.click(linhaDe('Arissia'));
    const detalhe = ficha();
    // Desde 26/09/2026 a grade é a aba Características (a mesma lista dos
    // outros modais) — .best-stat-lbl dentro de .best-secao--lista.
    const rotulos = [...detalhe.querySelectorAll('.best-secao--lista .best-stat-lbl')]
      .map((k) => k.textContent);
    // Se a grade vier vazia, o teste abaixo não está medindo nada.
    expect(rotulos.length, 'a grade de atributos veio vazia').toBeGreaterThan(0);
    return rotulos;
  };

  it('nada com prefixo _ entra na grade de atributos', async () => {
    const rotulos = await rotulosDaFicha();
    /* Sem trim() de propósito: rotulo() troca `_` por espaço, então o
       vazamento chegava como " fonte" e " visModo" — com o espaço na frente.
       Um trim() aqui apagaria justamente a pista. */
    const vazados = rotulos.filter((r) => /^\s/.test(r) || /^_/.test(r));
    expect(vazados, `campos de tela na ficha: ${vazados.join(', ')}`).toEqual([]);
    expect(rotulos.map((r) => r.trim())).not.toEqual(
      expect.arrayContaining(['fonte', 'tipoLabel', 'visibilidade', 'visModo'])
    );
  });

  it('e os atributos de verdade continuam lá', async () => {
    const rotulos = await rotulosDaFicha();
    // A grade fixa do NPC tem Raça e Deus; é ela que prova que o filtro não
    // comeu tudo. (Status saiu do formulário em 26/09/2026 e só aparece na
    // ficha se tiver valor gravado.)
    expect(rotulos.map((r) => r.trim())).toEqual(expect.arrayContaining(['Raça', 'Deus']));
  });
});

/* ── O QUE CHEGA NO BANCO AO SALVAR ────────────────────────────────────────
   Este bloco existe porque o caminho de salvar não tinha teste NENHUM: a
   suíte inteira passava sem nunca chamar salvar_lore_entrada. Duas mudanças
   de 17/09/2026 mexeram justamente no payload dela e teriam passado em
   branco:

     • `p_slug_origem` saiu da chamada, junto da SelecionarBaseModal que era
       quem escolhia a base do fork. A RPC tem default NULL, então omitir
       funciona — mas isso é uma afirmação sobre o PostgREST, e afirmação sem
       teste é palpite.

     • o lápis passou a valer nas linhas "Mundo", e o fork depende de o slug
       do GLOBAL chegar em `p_id`: é por ele que a RPC decide entre
       editar_copia_* e criar_copia_*. Se o cliente mandasse null ali, o
       Mestre criaria uma entrada em branco em vez de uma cópia do global, e
       a tela pareceria certa. */
describe('o payload de salvar_lore_entrada', () => {
  const salvarRpc = () => chamadasRpc.filter((c) => c.nome === 'salvar_lore_entrada');
  const clicarSalvar = () => {
    const rodape = [...document.querySelectorAll('.ms-footer button')];
    fireEvent.click(rodape.find((b) => /Salvar/i.test(b.textContent)));
  };
  const digitarNome = (v) => {
    const campo = document.querySelector('.diario-input');
    fireEvent.change(campo, { target: { value: v } });
  };

  it('criar do zero: sem p_id, e sem p_slug_origem na chamada', async () => {
    stubBanco(); montar('npc');
    await pronta();
    fireEvent.click(document.querySelector('.fp-card-top [aria-label="Novo"]'));
    digitarNome('Novo NPC');
    clicarSalvar();
    await waitFor(() => expect(salvarRpc()).toHaveLength(1));
    const { args } = salvarRpc()[0];
    expect(args.p_id).toBeNull();
    expect(args.p_tipo).toBe('npc');
    expect(args.p_nome).toBe('Novo NPC');
    expect(args.p_historia_id).toBe(HISTORIA.id);
    // A chave nem é enviada: a RPC usa o default NULL dela.
    expect(Object.keys(args)).not.toContain('p_slug_origem');
  });

  it('editar uma cópia da mesa: p_id é o slug da cópia', async () => {
    stubBanco(); montar('npc');
    await pronta();
    abrirAcao('Arissia', 'ti-pencil');
    digitarNome('Arissia, a Alquimista');
    clicarSalvar();
    await waitFor(() => expect(salvarRpc()).toHaveLength(1));
    expect(salvarRpc()[0].args.p_id).toBe('arissia-h13');
  });

  /* O teste que segura o fork: é o slug do GLOBAL em p_id que faz a RPC cair
     em `slug_base := p_id → criar_copia_*`. */
  it('editar um global: p_id é o slug do global, e é isso que forka', async () => {
    stubBanco({ globais: { npc: [NPC_GLOBAL] } });
    montar('npc');
    await pronta();
    abrirAcao('Andarilho', 'ti-pencil');
    digitarNome('Andarilho da Mesa');
    clicarSalvar();
    await waitFor(() => expect(salvarRpc()).toHaveLength(1));
    const { args } = salvarRpc()[0];
    expect(args.p_id, 'sem o slug do global a RPC cria entrada em branco').toBe('mundo-npc');
    expect(args.p_nome).toBe('Andarilho da Mesa');
    expect(args.p_historia_id).toBe(HISTORIA.id);
  });

  it('e o tipo do lugar vai como reino ou cidade, nunca "lugar"', async () => {
    stubBanco(); montar('lugar');
    await pronta();
    fireEvent.click(document.querySelector('.fp-card-top [aria-label="Novo"]'));
    // O formulário abre em reino; o seletor troca para cidade.
    fireEvent.click(document.querySelector('.diario-lugar-tipo input[value="cidade"]'));
    digitarNome('Porto Novo');
    clicarSalvar();
    await waitFor(() => expect(salvarRpc()).toHaveLength(1));
    // 'lugar' é uma ABA que mistura os dois; a RPC recusa tipo_invalido.
    expect(salvarRpc()[0].args.p_tipo).toBe('cidade');
  });
});

/* "Por que na hora de editar conhecido ainda aparece 'Esta entrada é do
   catálogo do mundo…' e o input de reino não mostra as opções?" (usuário,
   26/09/2026) */
describe('editar conhecido: as opções e o aviso', () => {
  const REINO_MUNDO = { id: 'abadom', tipo: 'reino', nome: 'Abadom', descricao: '', atributos: {} };
  const CIDADE_MUNDO = { id: 'porto-livre', tipo: 'cidade', nome: 'Porto Livre', descricao: '', atributos: {} };
  const abrirEdicao = async (nome) => {
    abrirAcao(nome, 'ti-pencil');
    await vi.waitFor(() => expect(document.querySelector('.ms-backdrop .diario-input')).toBeTruthy());
  };
  const opcoesDe = (rotulo) => {
    const campo = [...document.querySelectorAll('.ms-backdrop .diario-field-label')]
      .find((l) => l.textContent.trim() === rotulo).parentElement;
    fireEvent.click(campo.querySelector('.select-pill-btn'));
    const nomes = [...document.querySelectorAll('.select-pill-drop li')].map((li) => li.textContent.trim());
    fireEvent.click(campo.querySelector('.select-pill-btn'));
    return nomes;
  };

  it('Reino oferece os da mesa E os do mundo, sem repetir nome', async () => {
    stubBanco({ globais: { reino: [REINO_MUNDO, { ...REINO_MUNDO, id: 'verrogar', nome: 'Verrogar' }] } });
    montar('npc');
    await pronta();
    await abrirEdicao('Arissia');
    // Verrogar existe na mesa e no mundo: uma opção só.
    expect(opcoesDe('Reino')).toEqual(['—', 'Abadom', 'Verrogar']);
  });

  it('Cidade Natal também traz as cidades do mundo', async () => {
    stubBanco({ globais: { cidade: [CIDADE_MUNDO] } });
    montar('npc');
    await pronta();
    await abrirEdicao('Arissia');
    expect(opcoesDe('Cidade Natal')).toEqual(['—', 'Brann', 'Porto Livre']);
  });

  it('admin editando uma entrada do mundo: sem aviso nenhum', async () => {
    stubBanco({ globais: { npc: [NPC_GLOBAL] }, admin: true });
    montar('npc');
    await pronta();
    // O eh_admin responde depois da montagem; dá tempo de ele chegar.
    await vi.waitFor(() => expect(chamadasRpc.some((c) => c.nome === 'eh_admin')).toBe(true));
    await new Promise((ok) => setTimeout(ok, 0));
    abrirAcao('Andarilho', 'ti-pencil');
    expect(document.querySelector('.diario-fork-aviso')).toBeNull();
  });
});

/* "Você se esqueceu de alterar os ícones ao clicar em editar a visualização."
   (usuário, 26/09/2026) — o modal do olho usa os MESMOS três ícones da coluna. */
describe('o modal de visibilidade fala a língua da coluna', () => {
  it('ninguém = olho riscado, todos = olho, alguns = olho com exclamação', async () => {
    stubBanco(); montar('npc');
    await pronta();
    abrirAcao('Arissia', 'ti-eye');
    const icones = [...document.querySelectorAll('.diario-permissao-modal .diario-permissao-opcao i.ti')]
      .map((i) => i.className.replace('ti ', '').split(' ')[0]);
    expect(icones).toEqual(['ti-eye-off', 'ti-eye', 'ti-eye-exclamation']);
  });
});

/* SEM AVENTURA (26/09/2026): "quando não selecionei uma aventura, não consigo
   ver o menu diário". Sem mesa a página mostrava a tela vazia; agora mostra o
   catálogo do MUNDO, só para leitura — salvar_lore_entrada exige uma história
   e a visibilidade é por mesa. */
describe('sem mesa: o catálogo do mundo', () => {
  it('quem não é admin só lê: sem olho, lápis, lixeira nem +', async () => {
    stubBanco({ globais: { npc: [NPC_GLOBAL] }, admin: false });
    render(<GerenciarLoreView historia={null} lang="pt" tipoFixo="npc" />);
    await pronta();
    expect(celulas(linhaDe('Andarilho'))[0]).toBe('Andarilho');
    expect(chamadasRpc.some((c) => c.nome === 'listar_lore_historia')).toBe(false);
    expect(document.querySelector('.diario-vis-ic')).toBeNull();
    expect(document.querySelector('.lore-mng-page-eyebrow').textContent).toMatch(/Catálogo do mundo/);
    expect(document.querySelector('.best-botao-novo')).toBeNull();
    fireEvent.click(linhaDe('Andarilho'));
    expect(acaoNaFicha('ti-eye')).toBeNull();
    expect(acaoNaFicha('ti-pencil')).toBeNull();
    expect(acaoNaFicha('ti-trash')).toBeNull();
  });

  /* "Eu quero o botão de editar, ao lado do x, e adicionar, mesmo fora da
     aventura, para o admin." (usuário, 26/09/2026) */
  it('o admin edita e adiciona no mundo; salvar vai sem história', async () => {
    stubBanco({ globais: { npc: [NPC_GLOBAL] }, admin: true });
    render(<GerenciarLoreView historia={null} lang="pt" tipoFixo="npc" />);
    await pronta();
    await waitFor(() => expect(document.querySelector('.best-botao-novo')).toBeTruthy());
    fireEvent.click(linhaDe('Andarilho'));
    expect(acaoNaFicha('ti-pencil')).toBeTruthy();
    expect(acaoNaFicha('ti-eye')).toBeNull();     // visibilidade é por aventura
    expect(acaoNaFicha('ti-trash')).toBeNull();   // global não se exclui
    fireEvent.click(acaoNaFicha('ti-pencil').closest('button'));
    const salvar = await waitFor(() => {
      const b = [...document.querySelectorAll('.ms-backdrop button')].find((x) => /Salvar|Confirmar/.test(x.textContent));
      expect(b).toBeTruthy();
      return b;
    });
    fireEvent.click(salvar);
    await waitFor(() => expect(chamadasRpc.some((c) => c.nome === 'salvar_lore_entrada')).toBe(true));
    const chamada = chamadasRpc.find((c) => c.nome === 'salvar_lore_entrada');
    expect(chamada.args.p_historia_id).toBeNull();
    expect(chamada.args.p_id).toBe('mundo-npc');
  });

  it('LoreDaMesa sem historiaId mostra o mundo, não a tela vazia', async () => {
    stubBanco({ globais: { reino: [{ id: 'mundo-reino', nome: 'Verrogar', atributos: {} }] } });
    render(<window.LoreDaMesa historiaId={null} lang="pt" tipoFixo="reino" />);
    await pronta();
    expect(linhaDe('Verrogar')).toBeTruthy();
  });
});
