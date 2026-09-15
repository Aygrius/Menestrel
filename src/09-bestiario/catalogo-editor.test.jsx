/* ============================================================
   catalogo-editor.test.jsx — o editor genérico renderizado
   ============================================================
   Cobre o contrato do editor: monta os campos do descritor, respeita
   obrigatório e somenteNovo, e calcula os derivados da criatura (só leitura
   desde 14/09/2026, com o equipamento entrando na conta).
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
import '../01-core/inventario-helpers.jsx';
import '../10-shell/shell.jsx';
import './criatura-formulas.jsx';
import './catalogo-descritores.jsx';

let CatalogoEditor;
let ultimoInsert = null, ultimoUpdate = null, erroSimulado = null;
// DELETE (14/09/2026): o que foi pedido e quantas linhas o banco "apagou".
let ultimoDelete = null, linhasApagadas = 1;
// Fixture do catálogo `itens` (Armas e Armaduras) devolvida pelo
// `.select()` de leitura: o editor de criaturas busca as peças que dá para
// equipar (fetchTabelaPaginada, filtrando por grupo). Vazio por padrão.
let itensArmasFixture = [];
// Nomes de técnicas/habilidades/magias para os seletores de lista da
// criatura (13/09/2026). Vazios por padrão, como a de armas.
let listasFixture = { tecnicas: [], habilidades: [], magias: [] };
// Chaves que o .like() de pré-checagem de colisão devolve. Vazio por
// padrão: sem colisão, a chave derivada do nome passa direto.
let chavesExistentesFixture = [];

beforeAll(async () => {
  // Dublê do supabaseClient ANTES de carregar o editor.
  window.supabaseClient = {
    from: (tabela) => ({
      insert: (payload) => { ultimoInsert = { tabela, payload }; return {
        select: () => ({ single: async () => ({ data: { ...payload, id: 1 }, error: erroSimulado }) }) }; },
      // Registra tabela/payload E a coluna/valor usados no .eq() — sem isso
      // o caminho de EDIÇÃO inteiro ficava sem cobertura nenhuma.
      update: (payload) => { ultimoUpdate = { tabela, payload }; return { eq: (col, val) => {
        ultimoUpdate.eqCol = col; ultimoUpdate.eqVal = val; return {
          select: () => ({ single: async () => ({ data: payload, error: erroSimulado }) }) }; } }; },
      // Leitura genérica (fetchTabelaPaginada): builder encadeável
      // eq/order que termina em .range() — mesmo contrato do PostgREST
      // real, só que devolvendo a fixture inteira numa página só.
      delete: () => ({ eq: (col, val) => ({ select: async () => {
        ultimoDelete = { tabela, col, val };
        return { data: linhasApagadas ? [{ [col]: val }] : [], error: erroSimulado };
      } }) }),
      select: () => {
        const filtros = {};
        const builder = {
          eq: (col, val) => { filtros[col] = val; return builder; },
          order: () => builder,
          range: async () => ({
            data: tabela === 'itens'
              ? itensArmasFixture.filter((it) => !filtros.grupo || it.grupo === filtros.grupo)
              : (listasFixture[tabela] || []),
            error: null,
          }),
          // Pré-checagem de colisão da chave automática: o editor pergunta
          // quais chaves já começam com a base antes de inserir.
          like: async () => ({ data: chavesExistentesFixture, error: null }),
        };
        return builder;
      },
    }),
  };
  await import('./catalogo-editor.jsx');
  CatalogoEditor = window.CatalogoEditor;
  expect(CatalogoEditor).toBeDefined();
});

afterEach(() => {
  cleanup(); ultimoInsert = null; ultimoUpdate = null; erroSimulado = null;
  ultimoDelete = null; linhasApagadas = 1;
  itensArmasFixture = []; chavesExistentesFixture = [];
  listasFixture = { tecnicas: [], habilidades: [], magias: [] };
});

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
    // Cada campo aparece: input, textarea ou SelectPill — MENOS o de chave,
    // que desde 11/09/2026 é derivado do nome e não é mais renderizado.
    const visiveis = d.campos.filter((c) => !c.autoDeNome);
    expect(visiveis.length, 'o descritor precisa ter 1 campo automático').toBe(d.campos.length - 1);
    const controles = document.querySelectorAll('input, textarea, .select-pill-btn');
    expect(controles.length).toBeGreaterThanOrEqual(visiveis.length);
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

/* Era o bloco 'somenteNovo', que verificava que o input de chave nascia
   editável ao criar e travado ao editar. O usuário pediu (11/09/2026) que o
   input sumisse e a chave saísse do nome, então o comportamento antigo não
   existe mais — mas a exigência por trás dele continua, e é ela que estes
   testes guardam: a chave NUNCA muda depois de criada. */
describe('chave automática', () => {
  it('o input de chave não existe mais, nem ao criar', () => {
    montar({ linha: null });
    expect(document.querySelector('input[name="key"]')).toBeNull();
  });

  it('nem ao editar', () => {
    montar({ linha: { key: 'mira', nome: 'Mira', custo: 2 } });
    expect(document.querySelector('input[name="key"]')).toBeNull();
  });

  it('criar deriva a chave do nome', async () => {
    montar({ linha: null });
    fireEvent.change(document.querySelector('input[name="nome"]'), { target: { value: 'Golpe da Sombra' } });
    fireEvent.change(document.querySelector('input[name="custo"]'), { target: { value: '2' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoInsert).not.toBeNull());
    expect(ultimoInsert.payload.key).toBe('golpe_da_sombra');
  });

  it('chave já usada ganha sufixo em vez de estourar unicidade no banco', async () => {
    chavesExistentesFixture = [{ key: 'mira' }];
    montar({ linha: null });
    fireEvent.change(document.querySelector('input[name="nome"]'), { target: { value: 'Mira' } });
    fireEvent.change(document.querySelector('input[name="custo"]'), { target: { value: '2' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoInsert).not.toBeNull());
    expect(ultimoInsert.payload.key).toBe('mira_2');
  });

  // A regra que mais importa: renomear NÃO pode mexer na chave. Ela é a
  // identidade da linha, e item é referenciado por slug em inventário, ficha
  // e batalha — derivar de novo aqui quebraria tudo isso em silêncio.
  it('EDITAR e renomear não manda a chave no payload', async () => {
    montar({ linha: { key: 'mira', nome: 'Mira', custo: 2 } });
    fireEvent.change(document.querySelector('input[name="nome"]'), { target: { value: 'Mira Apurada' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload.nome).toBe('Mira Apurada');
    expect('key' in ultimoUpdate.payload, 'a chave não pode viajar no update').toBe(false);
    expect(ultimoUpdate.eqCol).toBe('key');
    expect(ultimoUpdate.eqVal, 'o .eq() continua mirando a chave ORIGINAL').toBe('mira');
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
    // Sem o input de chave: se ele ainda contasse como obrigatório, o botão
    // ficaria travado pra sempre, porque não há como preenchê-lo.
    fireEvent.change(document.querySelector('input[name="nome"]'), { target: { value: 'Nova' } });
    fireEvent.change(document.querySelector('input[name="custo"]'), { target: { value: '2' } });
    const salvar = screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent));
    expect(salvar.disabled).toBe(false);
  });
});

/* Linhas reais de `itens` (14/09/2026), só com as colunas que a conta lê. */
const ESPADA_LONGA = { slug: 'espada_longa', nome: 'Espada Longa', grupo: 'Armas', slot_equip: 'maos', dano: 28, dano_l: -4, dano_m: 0, dano_p: 4, ajuste_atributo: 'FOR', maos_outras: 1 };
const ARCO = { slug: 'arco', nome: 'Arco', grupo: 'Armas', slot_equip: 'maos', dano: 18, dano_l: -2, dano_m: 0, dano_p: -2, ajuste_atributo: 'PER', maos_outras: 2 };
const PEITORAL = { slug: 'peitoral_de_aco', nome: 'Peitoral de Aço', grupo: 'Armaduras', slot_equip: 'peito', absorcao: 8, defesa: 3, tipo_armadura: 'P' };
const CALCA = { slug: 'calca_de_couro', nome: 'Calça de Couro', grupo: 'Armaduras', slot_equip: 'pernas', absorcao: 2, defesa: 1, tipo_armadura: 'L' };
const PECAS = [ESPADA_LONGA, ARCO, PEITORAL, CALCA];

const valor = (col) => document.querySelector(`input[name="${col}"]`).value;
const digitar = (col, v) => fireEvent.change(document.querySelector(`input[name="${col}"]`), { target: { value: v } });
const blocoEquip = () => document.querySelector('[data-lista="equipamento"]');
const equipar = async (nome) => {
  fireEvent.change(blocoEquip().querySelector('input'), { target: { value: nome } });
  const li = await vi.waitFor(() => {
    const achou = Array.from(document.querySelectorAll('.catalogo-lista-drop li'))
      .find((x) => x.firstChild && x.firstChild.textContent === nome);
    expect(achou, nome).toBeTruthy();
    return achou;
  });
  fireEvent.click(li);
};
const salvar = () => fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));

/* "Os campos Ataque, Energia Física, Energia Heroica, Tipo de Armadura,
   Absorção, Defesa, Velocidade, L, M, P e Dano 100% são calculados
   automaticamente com base nas informações inseridas." (usuário, 14/09/2026) */
describe('campos calculados (criaturas)', () => {
  it('EF, EH, RF, RM e VB saem dos atributos', () => {
    montar({ tabela: 'criaturas', linha: null });
    digitar('peso', '6000'); digitar('fisico', '4'); digitar('aura', '3');
    digitar('agilidade', '6'); digitar('estagio', '15');
    expect(valor('energia_fisica')).toBe('159');
    expect(valor('energia_heroica')).toBe('225');     // (12 + 3) × 15
    expect(valor('resistencia_fisica')).toBe('19');   // 15 + 4
    expect(valor('resistencia_magica')).toBe('18');   // 15 + 3
    expect(valor('velocidade')).toBe('150');          // (4 + 6) × 15
  });

  it('todos são só leitura', () => {
    montar({ tabela: 'criaturas', linha: null });
    ['ataque', 'energia_fisica', 'energia_heroica', 'resistencia_fisica', 'resistencia_magica', 'armadura',
      'absorcao', 'defesa', 'velocidade', 'dano_l', 'dano_m', 'dano_p', 'dano_100'].forEach((col) => {
      const input = document.querySelector(`input[name="${col}"]`);
      expect(input, col).toBeTruthy();
      expect(input.readOnly && input.disabled, col).toBe(true);
    });
  });

  it('sem nada equipado: sem ataque, Absorção 0, Defesa = Agilidade, Leve', () => {
    montar({ tabela: 'criaturas', linha: null });
    digitar('agilidade', '3');
    expect(valor('ataque')).toBe('—');
    expect(valor('dano_l')).toBe('—');
    expect(valor('dano_100')).toBe('—');
    expect(valor('absorcao')).toBe('0');
    expect(valor('defesa')).toBe('3');
    expect(valor('armadura')).toBe('Leve');
  });

  it('"Técnicas Especiais" agora se chama "Técnicas"', () => {
    montar({ tabela: 'criaturas', linha: null });
    const rotulo = document.querySelector('[data-lista="tecnicas_especiais"] label').textContent;
    expect(rotulo).toBe('Técnicas');
  });
});

describe('equipamento (criaturas)', () => {
  it('equipar arma calcula Ataque, L/M/P e Dano 100%, com a conta do personagem', async () => {
    itensArmasFixture = PECAS;
    montar({ tabela: 'criaturas', linha: null });
    digitar('forca', '4');
    await equipar('Espada Longa');
    expect(valor('ataque')).toBe('Espada Longa');
    expect([valor('dano_l'), valor('dano_m'), valor('dano_p')]).toEqual(['0', '4', '8']);   // FOR 4
    expect(valor('dano_100')).toBe('32');                                                   // 28 + 4
    expect(blocoEquip().querySelector('[data-slot="mao_d"] .catalogo-lista-chip-nome').textContent).toBe('Espada Longa');
  });

  // "o 'dano 100%' deve aparecer para todos os tipos de equipamentos de ataque
  // que a criatura tiver" (usuário, 14/09/2026)
  it('uma caixa de Dano 100% por arma, com o nome dela', async () => {
    const MORDIDA = { slug: 'mordida', nome: 'Mordida', grupo: 'Armas', slot_equip: 'maos', dano: 4, dano_l: 1, dano_m: 0, dano_p: -1, ajuste_atributo: 'FOR', maos_outras: 1 };
    itensArmasFixture = [...PECAS, MORDIDA];
    montar({ tabela: 'criaturas', linha: null });
    digitar('forca', '4');
    await equipar('Espada Longa');
    await equipar('Mordida');
    const caixas = [...document.querySelectorAll('[data-dano-arma]')];
    expect(caixas.map((c) => c.querySelector('label').textContent)).toEqual(['Dano 100% · Espada Longa', 'Dano 100% · Mordida']);
    expect(caixas.map((c) => c.querySelector('input').value)).toEqual(['32', '8']);
    expect(valor('dano_100')).toBe('32');   // a coluna continua sendo a da primeira
  });

  it('armaduras somam absorção e defesa; o tipo é o do peitoral', async () => {
    itensArmasFixture = PECAS;
    montar({ tabela: 'criaturas', linha: null });
    digitar('agilidade', '2');
    await equipar('Calça de Couro');
    expect(valor('armadura')).toBe('Leve');
    await equipar('Peitoral de Aço');
    expect(valor('absorcao')).toBe('10');
    expect(valor('defesa')).toBe('6');   // 3 + 1 + agilidade 2
    expect(valor('armadura')).toBe('Pesado');
  });

  it('arma de duas mãos com a mão ocupada aparece bloqueada e não entra', async () => {
    itensArmasFixture = PECAS;
    montar({ tabela: 'criaturas', linha: null });
    await equipar('Espada Longa');
    fireEvent.change(blocoEquip().querySelector('input'), { target: { value: 'Arco' } });
    const li = await vi.waitFor(() => {
      const x = document.querySelector('.catalogo-lista-drop li[data-slug="arco"]');
      expect(x).toBeTruthy();
      return x;
    });
    expect(li.getAttribute('aria-disabled')).toBe('true');
    expect(li.textContent).toMatch(/As duas mãos estão ocupadas/);
    fireEvent.click(li);
    expect(blocoEquip().querySelectorAll('.catalogo-lista-chip')).toHaveLength(1);
  });

  it('tirar a peça recalcula', async () => {
    itensArmasFixture = PECAS;
    montar({ tabela: 'criaturas', linha: null });
    await equipar('Espada Longa');
    fireEvent.click(blocoEquip().querySelector('.catalogo-lista-chip-x'));
    expect(valor('ataque')).toBe('—');
  });

  it('grava o equipamento e todos os calculados — inclusive null quando não há arma', async () => {
    itensArmasFixture = PECAS;
    montar({ tabela: 'criaturas', linha: { id: 7, nome: 'Orc', estagio: 2, forca: 1, agilidade: 1,
      ataque: 'Garras', dano_l: 5, dano_100: 30, armadura: 'M', equipamento: [] } });
    await equipar('Peitoral de Aço');
    salvar();
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload).toMatchObject({
      equipamento: [{ slug: 'peitoral_de_aco', slot: 'peito' }],
      armadura: 'P', absorcao: 8, defesa: 4,
      ataque: null, dano_l: null, dano_m: null, dano_p: null,
      dano_100: null, dano_25: null, dano_50: null, dano_75: null,
    });
    // RF e RM não existem no banco; tipo_armadura segue fora.
    expect('resistencia_fisica' in ultimoUpdate.payload).toBe(false);
    expect('resistencia_magica' in ultimoUpdate.payload).toBe(false);
    expect('tipo_armadura' in ultimoUpdate.payload).toBe(false);
  });

  it('abre com o que está gravado', async () => {
    itensArmasFixture = PECAS;
    montar({ tabela: 'criaturas', linha: { id: 7, nome: 'Orc', forca: 2,
      equipamento: [{ slug: 'espada_longa', slot: 'mao_d' }] } });
    await vi.waitFor(() => expect(valor('ataque')).toBe('Espada Longa'));
    expect(valor('dano_100')).toBe('30');
  });
});

/* "No rodapé adicionar um botão para excluir." (usuário, 14/09/2026) */
describe('excluir (criaturas)', () => {
  const botaoExcluir = () => screen.queryAllByRole('button').find((b) => /Excluir|Confirmar exclusão/.test(b.textContent));

  it('só aparece editando uma criatura, no rodapé', () => {
    montar({ tabela: 'criaturas', linha: null, onExcluido: () => {} });
    expect(botaoExcluir()).toBeUndefined();
    cleanup();
    montar({ tabela: 'tecnicas', linha: { key: 'mira', nome: 'Mira', custo: 1 }, onExcluido: () => {} });
    expect(botaoExcluir()).toBeUndefined();
    cleanup();
    montar({ tabela: 'criaturas', linha: { id: 3, nome: 'Lobo' }, onExcluido: () => {} });
    expect(botaoExcluir().closest('.ms-footer')).toBeTruthy();
  });

  it('dois cliques: o primeiro arma, o segundo apaga e avisa', async () => {
    const onExcluido = vi.fn();
    montar({ tabela: 'criaturas', linha: { id: 3, nome: 'Lobo' }, onExcluido });
    fireEvent.click(botaoExcluir());
    expect(ultimoDelete).toBeNull();
    expect(botaoExcluir().textContent).toMatch(/Confirmar exclusão/);
    fireEvent.click(botaoExcluir());
    await vi.waitFor(() => expect(onExcluido).toHaveBeenCalledTimes(1));
    expect(ultimoDelete).toEqual({ tabela: 'criaturas', col: 'id', val: 3 });
  });

  it('banco que não apaga nada (RLS) mostra erro e não fecha', async () => {
    linhasApagadas = 0;
    const onExcluido = vi.fn();
    montar({ tabela: 'criaturas', linha: { id: 3, nome: 'Lobo' }, onExcluido });
    fireEvent.click(botaoExcluir());
    fireEvent.click(botaoExcluir());
    await vi.waitFor(() => expect(document.querySelector('.err-msg')).toBeTruthy());
    expect(onExcluido).not.toHaveBeenCalled();
  });
});

describe('gravação', () => {
  it('criar chama insert na tabela do descritor', async () => {
    montar({ linha: null });
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
    fireEvent.change(document.querySelector('input[name="nome"]'), { target: { value: 'Mira' } });
    fireEvent.change(document.querySelector('input[name="custo"]'), { target: { value: '2' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => {
      expect(document.body.textContent).toMatch(/duplicate key value/);
    });
  });
});

/* Apagar o conteúdo de um campo e salvar.

   Até 11/09/2026 o editor OMITIA do payload todo campo vazio. No insert
   isso dá NULL e está certo; no update, não — o PostgREST só toca nas
   colunas que chegam, então apagar o texto e salvar deixava o valor antigo
   no banco. Havia um comentário no código dizendo que resolver isso era
   "decisão de produto separada".

   O usuário tomou a decisão ao pedir "ao editar uma magia, permitir excluir
   um nível": agora o payload leva `null` explícito, mas SÓ para o campo que
   tinha valor na linha carregada. Campo que já nasceu vazio continua fora
   do payload — é isso que impede o editor de sobrescrever com NULL colunas
   que ele nem mostra. */
describe('apagar campo ao editar', () => {
  it('campo que TINHA valor e foi esvaziado vira null no payload', async () => {
    montar({ linha: { key: 'mira', nome: 'Mira', custo: 2, descricao: 'Texto antigo.' } });
    fireEvent.change(document.querySelector('textarea[name="descricao"]'), { target: { value: '' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect('descricao' in ultimoUpdate.payload, 'precisa viajar no payload').toBe(true);
    expect(ultimoUpdate.payload.descricao).toBeNull();
  });

  it('campo que JÁ nascia vazio continua fora do payload', async () => {
    montar({ linha: { key: 'mira', nome: 'Mira', custo: 2 } });
    fireEvent.change(document.querySelector('input[name="nome"]'), { target: { value: 'Mira Apurada' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect('descricao' in ultimoUpdate.payload, 'nunca teve valor: não sobrescreve').toBe(false);
  });

  it('campo numérico esvaziado também vira null', async () => {
    montar({ tabela: 'itens', linha: { slug: 'corda', nome: 'Corda', forca_req: 5 } });
    fireEvent.change(document.querySelector('input[name="forca_req"]'), { target: { value: '' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload.forca_req).toBeNull();
  });

  it('CRIAR não manda null — campo vazio simplesmente não vai', async () => {
    montar({ linha: null });
    fireEvent.change(document.querySelector('input[name="nome"]'), { target: { value: 'Nova' } });
    fireEvent.change(document.querySelector('input[name="custo"]'), { target: { value: '2' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoInsert).not.toBeNull());
    expect('descricao' in ultimoInsert.payload).toBe(false);
  });

  // O caso que originou o pedido: nível de magia é uma coluna de texto.
  it('nível de magia apagado chega como null', async () => {
    montar({ tabela: 'magias', linha: { key: 'bola_de_fogo', nome: 'Bola de Fogo', nivel_1: 'Um', nivel_3: 'Três' } });
    fireEvent.change(document.querySelector('textarea[name="nivel_3"]'), { target: { value: '' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload.nivel_3).toBeNull();
    expect(ultimoUpdate.payload.nivel_1, 'o nível que ficou não é tocado').toBe('Um');
  });
});

describe('itens.magico — coluna GERADA, só leitura', () => {
  /* CORREÇÃO DE 11/09/2026.

     Este describe travava a expectativa `payload.magico === true` — isto é,
     que o editor MANDASSE a coluna no UPDATE. Contra o banco real isso nunca
     funcionou: `magico` é

       GENERATED ALWAYS AS (magia IS NOT NULL AND magia <> '') STORED

     e o Postgres recusa qualquer UPDATE que a mencione, com
     "column magico can only be updated to DEFAULT". O resultado era que
     NENHUMA edição de item salvava — o erro que o usuário reportou.

     A suíte ficava verde porque o fake do Supabase (src/test/fake-supabase.js)
     aceita qualquer payload; a coluna gerada só existe no banco de verdade.
     Lição registrada aqui pra não voltar: teste de payload prova o que o
     cliente MANDA, não o que o banco ACEITA.

     O valor continua sendo EXIBIDO — o Mestre precisa ver se o item é mágico
     —, mas deriva de `magia` e não é editável nem enviado. */
  it('carrega magico=true mostrando "Sim"', () => {
    montar({ tabela: 'itens', linha: { slug: 'anel', nome: 'Anel', magico: true } });
    const pill = Array.from(document.querySelectorAll('.select-pill-btn'))
      .find((b) => /Sim|Não/.test(b.textContent));
    expect(pill, 'campo magico não achado').toBeTruthy();
    expect(pill.textContent).toMatch(/Sim/);
  });

  it('carrega magico=false mostrando "Não"', () => {
    montar({ tabela: 'itens', linha: { slug: 'corda', nome: 'Corda', magico: false } });
    const pill = Array.from(document.querySelectorAll('.select-pill-btn'))
      .find((b) => /Sim|Não/.test(b.textContent));
    expect(pill.textContent).toMatch(/Não/);
  });

  it('o controle fica desabilitado', () => {
    montar({ tabela: 'itens', linha: { slug: 'anel', nome: 'Anel', magico: true } });
    const pill = Array.from(document.querySelectorAll('.select-pill-btn'))
      .find((b) => /Sim|Não/.test(b.textContent));
    expect(pill.disabled).toBe(true);
  });

  it('NUNCA entra no payload — é o que fazia todo save de item falhar', async () => {
    montar({ tabela: 'itens', linha: { slug: 'anel', nome: 'Anel', magico: true } });
    fireEvent.change(document.querySelector('textarea[name="descricao"]'), { target: { value: 'nova' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect('magico' in ultimoUpdate.payload).toBe(false);
    expect(ultimoUpdate.payload.descricao, 'o resto do payload segue normal').toBe('nova');
  });
});

describe('opções com sigla no banco e palavra na tela', () => {
  it('itens.tipo mostra Sólido e grava S', async () => {
    montar({ tabela: 'itens', linha: { slug: 'pocao', nome: 'Poção', tipo: 'S' } });
    const pill = Array.from(document.querySelectorAll('.select-pill-btn'))
      .find((b) => /Sólido|Líquido/.test(b.textContent));
    expect(pill, 'campo tipo não achado').toBeTruthy();
    expect(pill.textContent).toMatch(/Sólido/);

    fireEvent.change(document.querySelector('textarea[name="descricao"]'), { target: { value: 'x' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload.tipo, 'a SIGLA vai pro banco, não o rótulo').toBe('S');
  });

  it('itens.tipo_armadura mostra Médio e grava M', async () => {
    montar({ tabela: 'itens', linha: { slug: 'cota', nome: 'Cota', tipo_armadura: 'M' } });
    const pill = Array.from(document.querySelectorAll('.select-pill-btn'))
      .find((b) => /Leve|Médio|Pesado/.test(b.textContent));
    expect(pill, 'campo tipo_armadura não achado').toBeTruthy();
    expect(pill.textContent).toMatch(/Médio/);

    fireEvent.change(document.querySelector('textarea[name="descricao"]'), { target: { value: 'x' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload.tipo_armadura).toBe('M');
  });
});

describe('largura dos campos — área ocupa a largura cheia, o resto fica na coluna estreita', () => {
  // 13/09/2026: o modal tinha 800px e a grade só 682px (4 colunas de 160px).
  // A classe modal-catalogo ajusta a largura à grade (index.css).
  it('o modal do editor leva a classe modal-catalogo, que o ajusta à grade', () => {
    montar({ tabela: 'criaturas', linha: null });
    expect(document.querySelector('.ms-modal').classList.contains('modal-catalogo')).toBe(true);
  });

  it('o grid do editor usa a classe própria catalogo-form-grid (NÃO a diario-form-grid compartilhada)', () => {
    montar({ tabela: 'tecnicas', linha: null });
    const grid = document.querySelector('.catalogo-form-grid');
    expect(grid).toBeTruthy();
    expect(grid.classList.contains('diario-form-grid')).toBe(false);
  });

  it('campo `area` (textarea) recebe a classe de largura cheia', () => {
    montar({ tabela: 'tecnicas', linha: null });
    const textarea = document.querySelector('textarea[name="descricao"]');
    const wrapper = textarea.closest('.catalogo-campo-full');
    expect(wrapper, 'textarea de descrição deveria estar dentro de .catalogo-campo-full').toBeTruthy();
  });

  it('campo `numero` NÃO recebe a classe de largura cheia', () => {
    montar({ tabela: 'tecnicas', linha: null });
    const input = document.querySelector('input[name="custo"]');
    expect(input.closest('.catalogo-campo-full')).toBeNull();
  });

  it('campo `opcoes` NÃO recebe a classe de largura cheia', () => {
    montar({ tabela: 'tecnicas', linha: null });
    const pill = document.querySelector('.motor-field');
    expect(pill.closest('.catalogo-campo-full')).toBeNull();
  });

  it('campo `texto` NÃO recebe a classe de largura cheia', () => {
    montar({ tabela: 'tecnicas', linha: null });
    const input = document.querySelector('input[name="nome"]');
    expect(input.closest('.catalogo-campo-full')).toBeNull();
  });

  it('campo `derivado` (criaturas) NÃO recebe a classe de largura cheia', () => {
    montar({ tabela: 'criaturas', linha: null });
    const input = document.querySelector('input[name="energia_fisica"]');
    expect(input.closest('.catalogo-campo-full')).toBeNull();
  });
});

describe('coluna do update (.eq) — chave certa por tabela', () => {
  it('tecnicas usa key', async () => {
    montar({ tabela: 'tecnicas', linha: { key: 'mira', nome: 'Mira', custo: 2 } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.eqCol).toBe('key');
    expect(ultimoUpdate.eqVal).toBe('mira');
  });

  it('itens usa slug', async () => {
    montar({ tabela: 'itens', linha: { slug: 'anel', nome: 'Anel', magico: true } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.eqCol).toBe('slug');
    expect(ultimoUpdate.eqVal).toBe('anel');
  });

  it('criaturas usa id (sem chave própria no descritor)', async () => {
    montar({ tabela: 'criaturas', linha: { id: 42, nome: 'Dragão' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.eqCol).toBe('id');
    expect(ultimoUpdate.eqVal).toBe(42);
  });
});

/* ── Criatura: armadura, absorção e listas do catálogo (13/09/2026) ──
   "Na hora de criação e edição de criaturas, onde eu informo a absorção e onde
    eu informo o tipo de armadura? Quero poder escolher quais técnicas,
    habilidades e magias a criatura possui, escolhendo na lista que temos
    disponíveis." (usuário)

   • Havia DOIS campos de armadura: "Armadura" (texto livre, a sigla L/M/P que
     a batalha lê) e "Tipo de Armadura" (`tipo_armadura`, vazio em 224 das 228
     criaturas e ignorado pela batalha). Fica um só: `armadura`, escolhido
     entre Leve/Médio/Pesado, com o rótulo "Tipo de Armadura", junto da
     Absorção e da Defesa.
   • Técnicas, habilidades e magias continuam gravando texto separado por
     vírgula (o formato que batalha e Diário leem), mas são escolhidas na lista
     do catálogo. O que já estava gravado e não existe no catálogo ("Bote",
     "Esquiva 7") continua lá — nada some ao editar. */
describe('criatura — tipo de armadura', () => {
  it('um só campo "Tipo de Armadura", calculado (Leve/Médio/Pesado vêm do peitoral)', () => {
    montar({ tabela: 'criaturas', linha: null });
    const rotulos = Array.from(document.querySelectorAll('label, .motor-field > span'))
      .map((el) => el.textContent.trim());
    expect(rotulos.filter((r) => r === 'Tipo de Armadura')).toHaveLength(1);
    expect(rotulos, 'o campo "Armadura" de texto livre sai').not.toContain('Armadura');
    expect(window.descritorDe('criaturas').campos.find((c) => c.col === 'armadura').rotulos)
      .toEqual({ L: 'Leve', M: 'Médio', P: 'Pesado' });
  });

  it('absorção vem logo depois do tipo de armadura, e tipo_armadura não está no formulário', () => {
    const cols = window.descritorDe('criaturas').campos.map((c) => c.col);
    expect(cols.indexOf('absorcao')).toBe(cols.indexOf('armadura') + 1);
    expect(cols).not.toContain('tipo_armadura');
  });

  /* 13/09/2026: "O nível das habilidades, técnicas e magias é com base no
     nível e atributos da criatura." O nível das magias é o estágio — o campo
     de nível à parte sai do formulário. */
  it('não há campo de nível das magias: o nível é o estágio da criatura', () => {
    montar({ tabela: 'criaturas', linha: null });
    expect(document.querySelector('input[name="magia_n"]')).toBeNull();
    expect(window.descritorDe('criaturas').campos.map((c) => c.col)).not.toContain('magia_n');
  });
});

/* "Na criação/edição de criaturas, não precisa mostrar dano 75, 50, 25 do
    dano, só 100, é óbvio." (usuário, 13/09/2026) — os três continuam
   gravados (a batalha os lê), sempre derivados do Dano 100% que está na tela. */
describe('criatura — só o Dano 100% aparece', () => {
  it('Dano 25/50/75 não são renderizados', () => {
    montar({ tabela: 'criaturas', linha: null });
    ['dano_25', 'dano_50', 'dano_75'].forEach((col) => expect(document.querySelector(`input[name="${col}"]`), col).toBeNull());
    expect(document.querySelector('input[name="dano_100"]')).toBeTruthy();
  });

  it('os três vão no payload calculados do Dano 100% da arma', async () => {
    itensArmasFixture = PECAS;
    montar({ tabela: 'criaturas', linha: null });
    digitar('nome', 'Urso'); digitar('forca', '2');
    await equipar('Espada Longa');
    salvar();
    await vi.waitFor(() => expect(ultimoInsert).not.toBeNull());
    expect(ultimoInsert.payload).toMatchObject({ dano_100: 30, dano_25: 8, dano_50: 15, dano_75: 23 });
  });
});

describe('criatura — a primeira linha da grade', () => {
  /* "'estágio' fica inline com 'nome', 'tipo', etc." (usuário, 14/09/2026) */
  it('Nome, Tipo, Subtipo e Estágio são os quatro primeiros campos', () => {
    montar({ tabela: 'criaturas', linha: null });
    const rotulos = Array.from(document.querySelectorAll('.catalogo-form-grid > *')).slice(0, 4)
      .map((el) => (el.querySelector('label, .motor-field > span') || {}).textContent);
    expect(rotulos).toEqual(['Nome', 'Tipo', 'Subtipo', 'Estágio']);
  });
});

/* "Na hora de criar um novo item para vincular às criaturas, apareceu: new row
   for relation "itens" violates check constraint "itens_icone_formato_chk""
   (usuário, 14/09/2026). O banco só aceita ^ti-[a-z0-9-]+$. */
describe('itens — ícone no formato do banco', () => {
  const criarItem = async (icone) => {
    montar({ tabela: 'itens', linha: null });
    digitar('nome', 'Presas');
    digitar('icone', icone);
    salvar();
  };

  it.each([
    ['ti ti-paw', 'ti-paw'],
    ['<i class="ti ti-paw"></i>', 'ti-paw'],
    ['paw', 'ti-paw'],
    ['ti-paw', 'ti-paw'],
  ])('"%s" grava "%s"', async (digitado, gravado) => {
    await criarItem(digitado);
    await vi.waitFor(() => expect(ultimoInsert).not.toBeNull());
    expect(ultimoInsert.payload.icone).toBe(gravado);
  });

  it('mostra a prévia do ícone', () => {
    montar({ tabela: 'itens', linha: null });
    digitar('icone', 'ti ti-paw');
    expect(document.querySelector('.catalogo-icone-previa i').className).toBe('ti ti-paw');
  });

  it('formato impossível avisa e não manda nada ao banco', async () => {
    await criarItem('garras!');
    expect(document.querySelector('.catalogo-icone-erro').textContent).toMatch(/Ícone inválido/);
    await vi.waitFor(() => expect(document.querySelector('.err-msg')).toBeTruthy());
    expect(ultimoInsert).toBeNull();
  });
});

/* "Plano é um dropdown: Material, Infernal, Celestial, Elemental / Tipo é um
   dropdown: Animal, Construído, Celestial, Infernal, Místico, Dragão, Elemental,
   Monstro, Morto, Gigante, Civilizado / Subtipo é um dropdown: Fogo, Ar, Água,
   Terra, Celestial, Infernal" (usuário, 14/09/2026) */
describe('criatura — Tipo, Subtipo e Plano em lista', () => {
  const pill = (rotulo) => Array.from(document.querySelectorAll('.motor-field'))
    .find((w) => (w.querySelector('span')?.textContent || '') === rotulo);
  const abrir = (rotulo) => {
    const w = pill(rotulo);
    expect(w, rotulo).toBeTruthy();
    fireEvent.click(w.querySelector('.select-pill-btn'));
    return Array.from(document.querySelectorAll('.select-pill-drop li')).map((li) => li.textContent.trim());
  };

  it.each([
    ['Tipo', ['Animal', 'Construído', 'Celestial', 'Infernal', 'Místico', 'Dragão', 'Elemental', 'Monstro', 'Morto', 'Gigante', 'Civilizado']],
    ['Subtipo', ['Fogo', 'Ar', 'Água', 'Terra', 'Celestial', 'Infernal']],
    ['Plano', ['Material', 'Infernal', 'Celestial', 'Elemental']],
  ])('%s oferece exatamente a lista', (rotulo, lista) => {
    montar({ tabela: 'criaturas', linha: null });
    expect(abrir(rotulo)).toEqual(lista);
  });

  it('valor gravado fora da lista aparece marcado e continua salvando igual', async () => {
    montar({ tabela: 'criaturas', linha: { id: 5, nome: 'Balor', tipo: 'Demônio', plano: 'Infernal' } });
    expect(pill('Tipo').querySelector('.select-pill-btn').textContent).toMatch(/Demônio \(fora da lista\)/);
    expect(abrir('Tipo')[0]).toBe('Demônio (fora da lista)');
    salvar();
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload).toMatchObject({ tipo: 'Demônio', plano: 'Infernal' });
  });

  it('escolher da lista troca o valor', async () => {
    montar({ tabela: 'criaturas', linha: { id: 5, nome: 'Balor', tipo: 'Demônio' } });
    abrir('Tipo');
    fireEvent.click(Array.from(document.querySelectorAll('.select-pill-drop li')).find((li) => li.textContent.trim() === 'Infernal'));
    salvar();
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload.tipo).toBe('Infernal');
  });
});

describe('criatura — técnicas, habilidades e magias escolhidas na lista', () => {
  const blocoDe = (col) => document.querySelector('[data-lista="' + col + '"]');
  const chips = (col) => Array.from(blocoDe(col).querySelectorAll('.catalogo-lista-chip-nome')).map((c) => c.textContent);
  const buscar = (col, txt) => fireEvent.change(blocoDe(col).querySelector('input'), { target: { value: txt } });
  const sugestoes = (col) => Array.from(blocoDe(col).querySelectorAll('.select-pill-drop li')).map((li) => li.textContent.trim());
  const salvar = () => fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));

  it('mostra o que está gravado como etiquetas, inclusive o que não está no catálogo', async () => {
    listasFixture.tecnicas = [{ nome: 'Esquiva' }, { nome: 'Fúria' }];
    montar({ tabela: 'criaturas', linha: { id: 3, nome: 'Tigre', tecnicas_especiais: 'Esquiva 7, Bote' } });
    expect(chips('tecnicas_especiais')).toEqual(['Esquiva 7', 'Bote']);
    await vi.waitFor(() => expect(blocoDe('tecnicas_especiais').querySelector('.catalogo-lista-chip--fora')).toBeTruthy());
    const fora = Array.from(blocoDe('tecnicas_especiais').querySelectorAll('.catalogo-lista-chip--fora')).map((c) => c.textContent);
    expect(fora).toHaveLength(1);
    expect(fora[0]).toMatch(/Bote/);
  });

  it('busca na lista do catálogo, sem oferecer o que já foi escolhido, e grava com vírgula', async () => {
    listasFixture.tecnicas = [{ nome: 'Esquiva' }, { nome: 'Fúria' }, { nome: 'Fúria Cega' }];
    montar({ tabela: 'criaturas', linha: { id: 3, nome: 'Tigre', tecnicas_especiais: 'Esquiva 7, Bote' } });
    buscar('tecnicas_especiais', 'fur');
    await vi.waitFor(() => expect(sugestoes('tecnicas_especiais')).toEqual(['Fúria', 'Fúria Cega']));
    buscar('tecnicas_especiais', 'esq');
    expect(sugestoes('tecnicas_especiais'), 'Esquiva já está (com nível 7)').toEqual([]);
    buscar('tecnicas_especiais', 'fur');
    fireEvent.click(Array.from(blocoDe('tecnicas_especiais').querySelectorAll('.select-pill-drop li')).find((li) => li.textContent.trim() === 'Fúria'));
    expect(chips('tecnicas_especiais')).toEqual(['Esquiva 7', 'Bote', 'Fúria']);
    salvar();
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload.tecnicas_especiais).toBe('Esquiva 7, Bote, Fúria');
  });

  it('remover a etiqueta tira do texto gravado; remover todas grava null', async () => {
    montar({ tabela: 'criaturas', linha: { id: 3, nome: 'Tigre', habilidades: 'Correr, Sentidos' } });
    fireEvent.click(blocoDe('habilidades').querySelector('button[aria-label="Remover Correr"]'));
    expect(chips('habilidades')).toEqual(['Sentidos']);
    fireEvent.click(blocoDe('habilidades').querySelector('button[aria-label="Remover Sentidos"]'));
    salvar();
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload.habilidades).toBeNull();
  });

  it('magias vêm da tabela de magias; Enter adiciona a primeira sugestão', async () => {
    listasFixture.magias = [{ nome: 'Bola de Fogo' }, { nome: 'Silêncio' }];
    montar({ tabela: 'criaturas', linha: null });
    buscar('magia', 'sil');
    await vi.waitFor(() => expect(sugestoes('magia')).toEqual(['Silêncio']));
    fireEvent.keyDown(blocoDe('magia').querySelector('input'), { key: 'Enter' });
    expect(chips('magia')).toEqual(['Silêncio']);
    expect(blocoDe('magia').querySelector('input').value).toBe('');
  });

  it('texto que não está na lista não vira etiqueta (escolha é só do catálogo)', async () => {
    listasFixture.habilidades = [{ nome: 'Correr' }];
    montar({ tabela: 'criaturas', linha: null });
    buscar('habilidades', 'Voar');
    fireEvent.keyDown(blocoDe('habilidades').querySelector('input'), { key: 'Enter' });
    expect(chips('habilidades')).toEqual([]);
  });
});
