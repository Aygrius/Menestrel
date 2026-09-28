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
// Item Animal (15/09/2026): o catálogo de animais que a sincronização lê, TODAS
// as escritas em ordem (a da criatura e a do item), e erro só nas de `itens`.
let itensAnimaisFixture = [];
let escritas = [];
let erroItens = null;
// Excluir item (26/09/2026): quantos personagens o carregam, e o que foi perguntado.
let usoFixture = 0;
let ultimoContains = null;

beforeAll(async () => {
  // Dublê do supabaseClient ANTES de carregar o editor.
  window.supabaseClient = {
    from: (tabela) => ({
      insert: (payload) => {
        ultimoInsert = { tabela, payload };
        escritas.push({ op: 'insert', tabela, payload });
        const resposta = { data: { ...payload, id: 1 }, error: tabela === 'itens' ? erroItens : erroSimulado };
        // Insert de item é aguardado direto; o da criatura, via .select().single().
        return { select: () => ({ single: async () => resposta }), then: (ok, falha) => Promise.resolve(resposta).then(ok, falha) };
      },
      // Registra tabela/payload E a coluna/valor usados no .eq() — sem isso
      // o caminho de EDIÇÃO inteiro ficava sem cobertura nenhuma.
      update: (payload) => {
        const reg = { op: 'update', tabela, payload };
        ultimoUpdate = reg;
        escritas.push(reg);
        return { eq: (col, val) => {
          reg.eqCol = col; reg.eqVal = val;
          const resposta = { data: { ...payload, [col]: val }, error: tabela === 'itens' ? erroItens : erroSimulado };
          return { select: () => ({ single: async () => resposta }), then: (ok, falha) => Promise.resolve(resposta).then(ok, falha) };
        } };
      },
      // Leitura genérica (fetchTabelaPaginada): builder encadeável
      // eq/order que termina em .range() — mesmo contrato do PostgREST
      // real, só que devolvendo a fixture inteira numa página só.
      delete: () => ({ eq: (col, val) => ({ select: async () => {
        ultimoDelete = { tabela, col, val };
        return { data: linhasApagadas ? [{ [col]: val }] : [], error: erroSimulado };
      } }) }),
      select: () => {
        const filtros = {};
        const linhas = () => (tabela === 'itens'
          ? [...itensArmasFixture, ...itensAnimaisFixture].filter((it) => Object.entries(filtros)
              .every(([c, v]) => (v === null ? it[c] == null : it[c] === v)))
          : (listasFixture[tabela] || []));
        const builder = {
          eq: (col, val) => { filtros[col] = val; return builder; },
          is: (col, val) => { filtros[col] = val; return builder; },
          order: () => builder,
          range: async () => ({ data: linhas(), error: null }),
          // Leitura aguardada sem .range() (a sincronização do item Animal).
          then: (ok, falha) => Promise.resolve({ data: linhas(), error: null }).then(ok, falha),
          // Pré-checagem de colisão da chave automática: o editor pergunta
          // quais chaves já começam com a base antes de inserir.
          like: async () => ({ data: chavesExistentesFixture, error: null }),
          // Contagem de uso do item antes de excluir: `inventario @> {itens:[{slug}]}`.
          contains: (col, val) => {
            ultimoContains = { tabela, col, val };
            return { then: (ok, falha) => Promise.resolve({ count: usoFixture, error: null }).then(ok, falha) };
          },
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
  itensAnimaisFixture = []; escritas = []; erroItens = null;
  usoFixture = 0; ultimoContains = null;
  listasFixture = { tecnicas: [], habilidades: [], magias: [] };
});

const montar = (props = {}) => render(
  <div className="menestrel-ui">
    <CatalogoEditor tabela="tecnicas" linha={null} lang="pt"
      onSalvo={() => {}} onCancel={() => {}} {...props} />
  </div>
);
/* Campo de múltipla escolha = SelectPillMulti (26/09/2026, "mantenha o
   dropdown menu para selecionar mais de uma opção"). Abre a lista pelo botão
   e lê/clica as opções, que moram em portal. */
const abrirMulti = (col) => {
  const btn = document.querySelector('[data-multi="' + col + '"] .select-pill-btn');
  if (btn.getAttribute('data-open') !== 'true') fireEvent.click(btn);
};
const opcoesMulti = (col) => { abrirMulti(col); return [...document.querySelectorAll('.select-pill-drop li')]; };
const nomesMulti = (col) => opcoesMulti(col).map((li) => li.textContent.trim());
const marcadosMulti = (col) => opcoesMulti(col).filter((li) => li.getAttribute('aria-selected') === 'true').map((li) => li.textContent.trim());
const clicarMulti = (col, nome) => fireEvent.click(opcoesMulti(col).find((li) => li.textContent.trim() === nome));
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
    // .catalogo-multi: grupo de botões (grupos de armas, 26/09/2026) — um controle.
    const controles = document.querySelectorAll('input, textarea, .select-pill-btn, .catalogo-multi');
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

/* DROPDOWNS desde 26/09/2026 (eram botões): atributos são dropdown de uma
   escolha (data-escala); Classe, Plano e Grupo, dropdown de várias
   (data-multi). "Digitar" num deles é escolher a opção na lista. */
const escolherNaLista = (bloco, v, col) => {
  const btn = bloco.querySelector('.select-pill-btn');
  if (btn.getAttribute('data-open') !== 'true') fireEvent.click(btn);
  const li = Array.from(document.querySelectorAll('.select-pill-drop li')).find((x) => x.textContent.trim() === String(v));
  if (!li) throw new Error(`sem opção "${v}" em ${col}`);
  fireEvent.click(li);
};
const digitar = (col, v) => {
  const escala = document.querySelector(`[data-escala="${col}"]`);
  if (escala) { escolherNaLista(escala, v, col); return; }
  const multi = document.querySelector(`[data-multi="${col}"]`);
  if (multi) {
    // Só marca se ainda não estiver marcado — "digitar" é deixar o valor lá.
    const btn = multi.querySelector('.select-pill-btn');
    if (btn.getAttribute('data-open') !== 'true') fireEvent.click(btn);
    const li = Array.from(document.querySelectorAll('.select-pill-drop li')).find((x) => x.textContent.trim() === String(v));
    if (!li) throw new Error(`sem opção "${v}" em ${col}`);
    if (li.getAttribute('aria-selected') !== 'true') fireEvent.click(li);
    fireEvent.click(btn);
    return;
  }
  fireEvent.change(document.querySelector(`input[name="${col}"]`), { target: { value: v } });
};
/* Dois campos desde 25/09/2026: "Ataque" (armas) e "Equipamento" (peças e
   mochila), na mesma coluna. O padrão é o bloco de Ataque; buscarEquip escolhe
   pelo grupo do item na fixture. */
const blocoEquip = (parte = 'ataque') => document.querySelector(`[data-lista="equipamento-${parte}"]`);
const parteDoItem = (nome) => {
  const it = (itensArmasFixture || []).find((x) => x.nome === nome);
  return it && it.grupo === 'Armas' ? 'ataque' : 'itens';
};
const buscarEquip = async (nome) => {
  fireEvent.change(blocoEquip(parteDoItem(nome)).querySelector('input'), { target: { value: nome } });
  return vi.waitFor(() => {
    const achou = Array.from(document.querySelectorAll('.catalogo-lista-drop li'))
      .find((x) => x.firstChild && x.firstChild.textContent === nome);
    expect(achou, nome).toBeTruthy();
    return achou;
  });
};
const equipar = async (nome) => fireEvent.click(await buscarEquip(nome));
const salvar = () => fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
// A criatura gravada — insert ao criar, update ao editar.
const payloadDaCriatura = async () => {
  salvar();
  await vi.waitFor(() => expect(ultimoInsert || ultimoUpdate).not.toBeNull());
  return (ultimoInsert || ultimoUpdate).payload;
};
const COLS_CALCULADAS = ['ataque', 'energia_fisica', 'energia_heroica', 'resistencia_fisica', 'resistencia_magica',
  'armadura', 'absorcao', 'defesa', 'velocidade', 'dano_l', 'dano_m', 'dano_p', 'dano_100'];

/* "Os campos Ataque, Energia Física, Energia Heroica, Tipo de Armadura,
   Absorção, Defesa, Velocidade, L, M, P e Dano 100% são calculados
   automaticamente com base nas informações inseridas." (usuário, 14/09/2026)

   E desde 15/09/2026 ficam FORA do modal: "não precisa mostrar os campos
   preenchidos automaticamente, mas mostre ao expandir a criatura na tabela."
   A conta continua indo para o banco — é pelo payload que se verifica. */
describe('campos calculados (criaturas)', () => {
  it('não aparecem no modal', () => {
    montar({ tabela: 'criaturas', linha: null });
    COLS_CALCULADAS.forEach((col) => expect(document.querySelector(`input[name="${col}"]`), col).toBeNull());
    expect(document.querySelector('[data-dano-arma]')).toBeNull();
    expect(document.querySelector('.campo-calculado')).toBeNull();
  });

  it('EF, EH e VB saem dos atributos e vão no payload; RF e RM não têm coluna', async () => {
    montar({ tabela: 'criaturas', linha: null });
    digitar('nome', 'Dradenar');
    digitar('peso', '6000'); digitar('fisico', '4'); digitar('aura', '3');
    digitar('agilidade', '6'); digitar('estagio', '15');
    const p = await payloadDaCriatura();
    expect(p).toMatchObject({ energia_fisica: 159, energia_heroica: 225, velocidade: 150 });   // (12+3)×15 · (4+6)×15
    expect('resistencia_fisica' in p).toBe(false);
    expect('resistencia_magica' in p).toBe(false);
  });

  it('sem nada equipado: sem ataque, Absorção 0, Defesa = Agilidade, Leve', async () => {
    montar({ tabela: 'criaturas', linha: null });
    digitar('nome', 'Lobo'); digitar('agilidade', '3');
    expect(await payloadDaCriatura()).toMatchObject({
      ataque: null, dano_l: null, dano_100: null, absorcao: 0, defesa: 3, armadura: 'L',
    });
  });

  it('"Técnicas Especiais" agora se chama "Técnicas"', () => {
    montar({ tabela: 'criaturas', linha: null });
    const rotulo = document.querySelector('[data-lista="tecnicas_especiais"] label').textContent;
    expect(rotulo).toBe('Técnicas');
  });
});

describe('equipamento (criaturas)', () => {
  it('equipar arma grava Ataque, L/M/P e Dano 100%, com a conta do personagem', async () => {
    itensArmasFixture = PECAS;
    montar({ tabela: 'criaturas', linha: null });
    digitar('nome', 'Orc'); digitar('forca', '4');
    await equipar('Espada Longa');
    expect(await payloadDaCriatura()).toMatchObject({
      ataque: 'Espada Longa', dano_l: 0, dano_m: 4, dano_p: 8, dano_100: 32,   // FOR 4 · 28 + 4
    });
  });

  /* "remova o identificador 'mão', etc do modal de editar criaturas"
     (usuário, 15/09/2026) — nem na etiqueta, nem na busca. */
  it('sem rótulo de lugar: a etiqueta é só o nome, e a busca não diz onde entra', async () => {
    itensArmasFixture = PECAS;
    montar({ tabela: 'criaturas', linha: null });
    await equipar('Espada Longa');
    await equipar('Peitoral de Aço');
    // Equipamento vem antes de Ataque na tela (o Ataque fica "abaixo de equipamento").
    const chips = [...document.querySelectorAll('[data-lista^="equipamento-"] .catalogo-lista-chip')];
    expect(chips.map((c) => c.textContent)).toEqual(['Peitoral de Aço', 'Espada Longa']);
    expect(blocoEquip().querySelector('.catalogo-equip-slot')).toBeNull();
    const li = await buscarEquip('Arco');
    expect(li.textContent).toBe('Arco');
  });

  /* "Para as criaturas, não haverá limitação de equipamentos de ataque."
     (usuário, 15/09/2026) — o arco de duas mãos entra ao lado da espada. */
  it('armas sem limite: espada, arco de duas mãos e mordida entram juntos', async () => {
    const MORDIDA = { slug: 'mordida', nome: 'Mordida', grupo: 'Armas', slot_equip: 'maos', dano: 4, dano_l: 1, dano_m: 0, dano_p: -1, ajuste_atributo: 'FOR', maos_outras: 1 };
    itensArmasFixture = [...PECAS, MORDIDA];
    montar({ tabela: 'criaturas', linha: null });
    digitar('nome', 'Hydra'); digitar('forca', '4');
    await equipar('Espada Longa');
    await equipar('Arco');
    await equipar('Mordida');
    expect(blocoEquip().querySelectorAll('.catalogo-lista-chip')).toHaveLength(3);
    const p = await payloadDaCriatura();
    expect(p.equipamento.map((e) => e.slug)).toEqual(['espada_longa', 'arco', 'mordida']);
    expect(p.dano_100).toBe(32);   // a coluna continua sendo a da primeira
  });

  it('a mesma arma aparece bloqueada e não entra de novo', async () => {
    itensArmasFixture = PECAS;
    montar({ tabela: 'criaturas', linha: null });
    await equipar('Espada Longa');
    const li = await buscarEquip('Espada Longa');
    expect(li.getAttribute('aria-disabled')).toBe('true');
    expect(li.textContent).toMatch(/Esta arma já está equipada/);
    fireEvent.click(li);
    expect(blocoEquip().querySelectorAll('.catalogo-lista-chip')).toHaveLength(1);
  });

  it('armaduras somam absorção e defesa; o tipo é o do peitoral', async () => {
    itensArmasFixture = PECAS;
    montar({ tabela: 'criaturas', linha: null });
    digitar('nome', 'Cavaleiro'); digitar('agilidade', '2');
    await equipar('Calça de Couro');
    await equipar('Peitoral de Aço');
    expect(await payloadDaCriatura()).toMatchObject({ absorcao: 10, defesa: 6, armadura: 'P' });   // 3 + 1 + agilidade 2
  });

  it('tirar a peça recalcula', async () => {
    itensArmasFixture = PECAS;
    montar({ tabela: 'criaturas', linha: null });
    digitar('nome', 'Orc');
    await equipar('Espada Longa');
    fireEvent.click(blocoEquip().querySelector('.catalogo-lista-chip-x'));
    expect(await payloadDaCriatura()).toMatchObject({ ataque: null, equipamento: [] });
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

  it('abre com o que está gravado — inclusive peça antiga em mão', async () => {
    itensArmasFixture = PECAS;
    montar({ tabela: 'criaturas', linha: { id: 7, nome: 'Orc', forca: 2,
      equipamento: [{ slug: 'espada_longa', slot: 'mao_d' }] } });
    await vi.waitFor(() => expect(blocoEquip().querySelector('.catalogo-lista-chip-nome').textContent).toBe('Espada Longa'));
    expect(await payloadDaCriatura()).toMatchObject({ ataque: 'Espada Longa', dano_100: 30 });
  });
});

/* "Os itens do tipo animal, e as criaturas, são em tese a mesma entrada no
   banco" (usuário, 15/09/2026) — decisão: unificar de verdade. Salvar a
   criatura cuida do item Animal. */
describe('criatura e item Animal — a mesma entrada', () => {
  // Tipo em botões desde 25/09/2026.
  const escolherTipo = (tipo) => digitar('tipo', tipo);
  const deItens = (op) => escritas.filter((e) => e.tabela === 'itens' && e.op === op);

  it('criar um Animal cria o item, ligado pela criatura_id', async () => {
    const onSalvo = vi.fn();
    montar({ tabela: 'criaturas', linha: null, onSalvo });
    digitar('nome', 'Cavalo de Guerra'); escolherTipo('Animal');
    salvar();
    await vi.waitFor(() => expect(onSalvo).toHaveBeenCalled());
    expect(deItens('insert')).toHaveLength(1);
    expect(deItens('insert')[0].payload).toMatchObject({
      slug: 'cavalo_de_guerra', nome: 'Cavalo de Guerra', grupo: 'Animais', tipo: 'S', criatura_id: 1,
    });
  });

  it('item Animal antigo, sem vínculo e com o mesmo nome, ganha o vínculo em vez de duplicar', async () => {
    itensAnimaisFixture = [{ slug: 'cavalo', nome: 'Cavalo', grupo: 'Animais', criatura_id: null }];
    const onSalvo = vi.fn();
    montar({ tabela: 'criaturas', linha: null, onSalvo });
    digitar('nome', 'cavalo'); escolherTipo('Animal');
    salvar();
    await vi.waitFor(() => expect(onSalvo).toHaveBeenCalled());
    expect(deItens('insert')).toHaveLength(0);
    expect(deItens('update')).toEqual([expect.objectContaining({ eqCol: 'slug', eqVal: 'cavalo',
      payload: expect.objectContaining({ criatura_id: 1 }) })]);
  });

  it('renomear a criatura renomeia o item ligado — sem mexer no slug', async () => {
    itensAnimaisFixture = [{ slug: 'pônei', nome: 'Pônei', grupo: 'Animais', criatura_id: 9 }];
    const onSalvo = vi.fn();
    montar({ tabela: 'criaturas', linha: { id: 9, nome: 'Pônei', tipo: 'Animal' }, onSalvo });
    digitar('nome', 'Pônei das Montanhas');
    salvar();
    await vi.waitFor(() => expect(onSalvo).toHaveBeenCalled());
    const up = deItens('update');
    expect(up).toHaveLength(1);
    expect(up[0]).toMatchObject({ eqCol: 'slug', eqVal: 'pônei' });
    expect(up[0].payload.nome).toBe('Pônei das Montanhas');
    expect('slug' in up[0].payload).toBe(false);
  });

  it('criatura que não é Animal e não tem item não gera item', async () => {
    const onSalvo = vi.fn();
    montar({ tabela: 'criaturas', linha: null, onSalvo });
    digitar('nome', 'Dragão'); escolherTipo('Dragão');
    salvar();
    await vi.waitFor(() => expect(onSalvo).toHaveBeenCalled());
    expect(escritas.filter((e) => e.tabela === 'itens')).toHaveLength(0);
  });

  it('item que falha: a criatura já está salva, o erro aparece, e salvar de novo ATUALIZA', async () => {
    erroItens = { message: 'violates check constraint' };
    const onSalvo = vi.fn();
    montar({ tabela: 'criaturas', linha: null, onSalvo });
    digitar('nome', 'Mula'); escolherTipo('Animal');
    salvar();
    await vi.waitFor(() => expect(screen.getByText(/Criatura salva, mas o item Animal não foi atualizado: violates/)).toBeTruthy());
    expect(onSalvo).not.toHaveBeenCalled();
    erroItens = null;
    salvar();
    await vi.waitFor(() => expect(onSalvo).toHaveBeenCalled());
    const daCriatura = escritas.filter((e) => e.tabela === 'criaturas');
    expect(daCriatura.map((e) => e.op)).toEqual(['insert', 'update']);
    expect(daCriatura[1]).toMatchObject({ eqCol: 'id', eqVal: 1 });
  });
});

/* "No rodapé adicionar um botão para excluir." (usuário, 14/09/2026) */
describe('excluir (criaturas)', () => {
  const botaoExcluir = () => screen.queryAllByRole('button').find((b) => /Excluir|Confirmar exclusão/.test(b.getAttribute('aria-label') || ''));

  it('só aparece editando uma criatura, no rodapé', () => {
    montar({ tabela: 'criaturas', linha: null, onExcluido: () => {} });
    expect(botaoExcluir()).toBeUndefined();
    cleanup();
    // Sem onExcluido quem chama não sabe o que fazer depois: não há lixeira.
    montar({ tabela: 'criaturas', linha: { id: 3, nome: 'Lobo' } });
    expect(botaoExcluir()).toBeUndefined();
    cleanup();
    // Técnicas, magias e habilidades também excluem desde 26/09/2026.
    montar({ tabela: 'tecnicas', linha: { key: 'mira', nome: 'Mira', custo: 1 }, onExcluido: () => {} });
    expect(botaoExcluir().closest('.ms-header')).toBeTruthy();
    cleanup();
    montar({ tabela: 'criaturas', linha: { id: 3, nome: 'Lobo' }, onExcluido: () => {} });
    // Ícone ao lado do X desde 26/09/2026, não mais no rodapé.
    expect(botaoExcluir().closest('.ms-header')).toBeTruthy();
    expect(botaoExcluir().closest('.ms-footer')).toBeNull();
  });

  it('dois cliques: o primeiro arma, o segundo apaga e avisa', async () => {
    const onExcluido = vi.fn();
    montar({ tabela: 'criaturas', linha: { id: 3, nome: 'Lobo' }, onExcluido });
    fireEvent.click(botaoExcluir());
    expect(ultimoDelete).toBeNull();
    expect(botaoExcluir().getAttribute('aria-label')).toMatch(/Confirmar exclusão/);
    expect(botaoExcluir().classList.contains('is-armado')).toBe(true);
    expect(document.querySelector('.catalogo-aviso-uso').textContent).toMatch(/Clique de novo na lixeira/);
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

/* "Adicione um botão de excluir itens, igual em criaturas." (usuário, 26/09/2026) */
/* "No modal de editar técnicas, deve ser possível selecionar mais de um grupo
   de arma." (usuário, 26/09/2026). O banco já guardava "PL, PM, PP"; o
   dropdown de escolha única mostrava um e apagava os outros ao salvar. */
describe('técnica: vários grupos de armas', () => {
  const marcado = (sigla) => marcadosMulti('grupo_armas').includes(sigla);
  const salvarEPegar = async () => {
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    return ultimoUpdate.payload.grupo_armas;
  };

  it('abre com os grupos gravados marcados, e salvar não perde nenhum', async () => {
    montar({ linha: { key: 'aparar', nome: 'Aparar', custo: 2, grupo_armas: 'CM, CP, EM, EP' } });
    expect(marcadosMulti('grupo_armas')).toEqual(['CM', 'CP', 'EM', 'EP']);
    expect(await salvarEPegar()).toBe('CM, CP, EM, EP');
  });

  it('marcar mais um soma, na ordem da lista', async () => {
    montar({ linha: { key: 'aparar', nome: 'Aparar', custo: 2, grupo_armas: 'CM' } });
    clicarMulti('grupo_armas', 'CL');
    expect(await salvarEPegar()).toBe('CL, CM');
  });

  it('"Livre" é exclusivo: marcá-lo limpa as siglas, e marcar uma sigla o tira', async () => {
    montar({ linha: { key: 'aparar', nome: 'Aparar', custo: 2, grupo_armas: 'CM, CL' } });
    clicarMulti('grupo_armas', 'Livre');
    expect(marcado('CM')).toBe(false);
    clicarMulti('grupo_armas', 'PL');
    expect(marcado('Livre')).toBe(false);
    expect(await salvarEPegar()).toBe('PL');
  });
});

/* "No input 'permissão', cada classe é uma opção." (usuário, 26/09/2026) */
describe('permissão em opções: profissões e especializações', () => {
  it('técnica: a lista traz cada profissão seguida das suas especializações', () => {
    montar({ linha: { key: 'carga', nome: 'Carga', custo: 2, permissao: 'Academia de Cavaleiros' } });
    const nomes = nomesMulti('permissao');
    expect(nomes.slice(0, 5)).toEqual(['Guerreiro', 'Academia de Soldados', 'Academia de Arqueiros', 'Academia de Cavaleiros', 'Academia de Gladiadores']);
    expect(nomes).toEqual(expect.arrayContaining(['Mago', 'Colégio Necromântico', 'Sacerdote', 'Ordem de Lena']));
    expect(marcadosMulti('permissao')).toEqual(['Academia de Cavaleiros']);
  });

  it('marcar mais uma grava separado por vírgula', async () => {
    montar({ linha: { key: 'carga', nome: 'Carga', custo: 2, permissao: 'Academia de Cavaleiros' } });
    clicarMulti('permissao', 'Guerreiro');
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload.permissao).toBe('Guerreiro, Academia de Cavaleiros');
  });

  it('magia também', () => {
    montar({ tabela: 'magias', linha: { key: 'bola', nome: 'Bola de Fogo', permissao: 'Mago, Colégio Elemental' } });
    expect(marcadosMulti('permissao')).toEqual(['Mago', 'Colégio Elemental']);
  });
});

describe('excluir (itens)', () => {
  const botaoExcluir = () => screen.queryAllByRole('button').find((b) => /Excluir|Confirmar exclusão/.test(b.getAttribute('aria-label') || ''));
  const ADAGA = { slug: 'adaga', nome: 'Adaga', grupo: 'Armas' };

  it('aparece editando um item, no rodapé — igual à criatura', () => {
    montar({ tabela: 'itens', linha: null, onExcluido: () => {} });
    expect(botaoExcluir()).toBeUndefined();
    cleanup();
    montar({ tabela: 'itens', linha: ADAGA, onExcluido: () => {} });
    // Ícone ao lado do X desde 26/09/2026, não mais no rodapé.
    expect(botaoExcluir().closest('.ms-header')).toBeTruthy();
    expect(botaoExcluir().closest('.ms-footer')).toBeNull();
  });

  it('o primeiro clique conta quem carrega o item e avisa; o segundo apaga pelo slug', async () => {
    usoFixture = 3;
    const onExcluido = vi.fn();
    montar({ tabela: 'itens', linha: ADAGA, onExcluido });
    fireEvent.click(botaoExcluir());
    expect(ultimoDelete).toBeNull();
    await vi.waitFor(() => expect(document.querySelector('.catalogo-aviso-uso').textContent).toMatch(/personagens/));
    expect(ultimoContains).toEqual({ tabela: 'personagens', col: 'inventario', val: { itens: [{ slug: 'adaga' }] } });
    expect(document.querySelector('.catalogo-aviso-uso').textContent).toMatch(/3 personagens carregam este item/);
    fireEvent.click(botaoExcluir());
    await vi.waitFor(() => expect(onExcluido).toHaveBeenCalledTimes(1));
    expect(ultimoDelete).toEqual({ tabela: 'itens', col: 'slug', val: 'adaga' });
  });

  it('item que ninguém carrega só pede o segundo clique, sem falar de personagens', async () => {
    usoFixture = 0;
    montar({ tabela: 'itens', linha: ADAGA, onExcluido: () => {} });
    fireEvent.click(botaoExcluir());
    await vi.waitFor(() => expect(ultimoContains).toBeTruthy());
    expect(document.querySelector('.catalogo-aviso-uso').textContent).not.toMatch(/personage/);
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
  it('"Tipo de Armadura" é calculado (Leve/Médio/Pesado vêm do peitoral) e não aparece no modal', () => {
    montar({ tabela: 'criaturas', linha: null });
    const rotulos = Array.from(document.querySelectorAll('label, .motor-field > span'))
      .map((el) => el.textContent.trim());
    expect(rotulos, 'calculado fica fora do modal desde 15/09/2026').not.toContain('Tipo de Armadura');
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
  it('nenhum dano é renderizado no modal (nem o 100%, desde 15/09/2026)', () => {
    montar({ tabela: 'criaturas', linha: null });
    ['dano_25', 'dano_50', 'dano_75', 'dano_100'].forEach((col) => expect(document.querySelector(`input[name="${col}"]`), col).toBeNull());
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
  // "Nome, Subtipo, Estágio, Montaria, Peso e Altura devem ficar inline, sendo
  // Estágio, Montaria, Peso e Altura, inputs menores." (25/09/2026)
  it('Nome, Subtipo, Estágio, Montaria, Peso e Altura abrem a grade; os quatro últimos são curtos', () => {
    montar({ tabela: 'criaturas', linha: null });
    const filhos = Array.from(document.querySelectorAll('.catalogo-form-grid > *')).slice(0, 7);
    const rotulos = filhos.map((el) => (el.querySelector('label, .motor-field > span') || {}).textContent);
    expect(rotulos).toEqual(['Nome', 'Subtipo', 'Estágio', 'Montaria', 'Peso', 'Altura (m)', 'Tipo']);
    expect(filhos.map((el) => el.classList.contains('catalogo-campo-curto')))
      .toEqual([false, false, true, true, true, true, false]);
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
/* Tipo, Plano e Grupo viraram BOTÕES de escolha única em 25/09/2026 ("as
   opções viram botões seletores"). A regra é a mesma do dropdown de antes. */
describe('criatura — Tipo, Subtipo e Plano em lista', () => {
  /* Classe, Plano e Grupo: DROPDOWN DE VÁRIAS desde 26/09/2026 ("use dropdown
     menu, dando opção de selecionar mais de um campo nas criaturas"). */
  const COL = { Tipo: 'tipo', Plano: 'plano', Grupo: 'coletivo', Subtipo: 'subtipo' };
  const pill = (rotulo) => document.querySelector(`[data-multi="${COL[rotulo]}"]`);
  const abrir = (rotulo) => { expect(pill(rotulo), rotulo).toBeTruthy(); return nomesMulti(COL[rotulo]); };
  const marcado = (rotulo) => marcadosMulti(COL[rotulo]);

  /* ⚠️ SUBTIPO SAIU DESTA LISTA em 18/09/2026, e virou texto livre. Ele
     declarava elementos (Fogo/Ar/Água/Terra/Celestial/Infernal) e os dados
     nunca obedeceram: das ~218 criaturas, ~147 guardavam ESPÉCIE — Cavalo,
     Goblin, Esqueleto, Gárgula — e só 15 um elemento. A lista fechada que
     ninguém respeitava foi justamente o que fez a ficha do bestiário mostrar
     "Elemento: Cavalo".

     O elemento ganhou coluna própria, e é ELA que tem a lista fechada agora
     (ver scripts/sql/criaturas-elemento-2026-09-18.sql). */
  it.each([
    // Gigante → Civilizado; Construído e Monstro → Místico (25/09/2026).
    ['Tipo', ['Animal', 'Celestial', 'Infernal', 'Místico', 'Dragão', 'Elemental', 'Morto', 'Civilizado']],
    ['Plano', ['Material', 'Infernal', 'Celestial', 'Elemental']],
  ])('%s oferece exatamente a lista', (rotulo, lista) => {
    montar({ tabela: 'criaturas', linha: null });
    expect(abrir(rotulo)).toEqual(lista);
  });

  it('Subtipo é texto livre: guarda espécie, não elemento', () => {
    montar({ tabela: 'criaturas', linha: null });
    // Sem pill de opções — é um <input> comum.
    expect(pill('Subtipo')).toBeFalsy();
    expect(document.querySelector('input[name="subtipo"]')).toBeTruthy();
  });

  it('valor gravado fora da lista aparece marcado e continua salvando igual', async () => {
    montar({ tabela: 'criaturas', linha: { id: 5, nome: 'Balor', tipo: 'Demônio', plano: 'Infernal' } });
    // Fora da lista: aparece no fim da lista, marcado, e continua salvando igual.
    expect(marcado('Tipo')).toEqual(['Demônio']);
    expect(abrir('Tipo').at(-1)).toBe('Demônio');
    salvar();
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload).toMatchObject({ tipo: 'Demônio', plano: 'Infernal' });
  });

  it('marcar mais uma classe soma, na ordem da lista; o valor antigo fica no fim', async () => {
    montar({ tabela: 'criaturas', linha: { id: 5, nome: 'Balor', tipo: 'Demônio' } });
    clicarMulti('tipo', 'Infernal');
    salvar();
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload.tipo).toBe('Infernal, Demônio');
  });

  it('Plano e Grupo também aceitam vários', async () => {
    montar({ tabela: 'criaturas', linha: { id: 5, nome: 'Fênix', plano: 'Material', coletivo: 'Solitário' } });
    clicarMulti('plano', 'Elemental');
    clicarMulti('coletivo', 'Grupo Pequeno');
    salvar();
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload.plano).toBe('Material, Elemental');
    expect(ultimoUpdate.payload.coletivo).toBe('Grupo Pequeno, Solitário');
  });
});

/* "No input de elemento das criaturas, permita selecionar mais de uma opção."
   (usuário, 25/09/2026). Luz e Escuridão entraram no mesmo dia. Grava na
   mesma coluna de texto, separado por vírgula: um valor antigo ("Terra")
   continua sendo lido como uma escolha só. */
describe('criatura — Elemento de múltipla escolha', () => {
  const marcados = () => marcadosMulti('elemento');
  const clicar = (nome) => clicarMulti('elemento', nome);

  it('oferece os seis elementos', () => {
    montar({ tabela: 'criaturas', linha: null });
    expect(nomesMulti('elemento')).toEqual(['Fogo', 'Ar', 'Água', 'Terra', 'Luz', 'Escuridão']);
  });

  it('abre com o que está gravado — inclusive valor antigo de um só', () => {
    montar({ tabela: 'criaturas', linha: { id: 5, nome: 'Golem', elemento: 'Terra' } });
    expect(marcados()).toEqual(['Terra']);
  });

  it('marca mais de um e grava separado por vírgula, na ordem da lista', async () => {
    montar({ tabela: 'criaturas', linha: { id: 5, nome: 'Fênix', elemento: 'Luz' } });
    clicar('Fogo');
    expect(marcados()).toEqual(['Fogo', 'Luz']);
    salvar();
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload.elemento).toBe('Fogo, Luz');
  });

  it('desmarcar tudo grava vazio (null)', async () => {
    montar({ tabela: 'criaturas', linha: { id: 5, nome: 'Golem', elemento: 'Terra' } });
    clicar('Terra');
    expect(marcados()).toEqual([]);
    salvar();
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload.elemento).toBeNull();
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

/* Atributos em botões de −2 a 8 (25/09/2026): "os atributos podem variar
   entre -2 e 8 (no caso das criaturas)". Intelecto é texto no banco. */
/* Dropdown desde 26/09/2026 (eram botões redondos). */
describe('criatura — atributos em dropdown', () => {
  const bloco = (col) => document.querySelector(`[data-escala="${col}"]`);
  const valores = (col) => {
    fireEvent.click(bloco(col).querySelector('.select-pill-btn'));
    const v = Array.from(document.querySelectorAll('.select-pill-drop li')).map((li) => li.textContent.trim());
    fireEvent.click(bloco(col).querySelector('.select-pill-btn'));
    return v;
  };

  it('cada atributo oferece −2 a 8', () => {
    montar({ tabela: 'criaturas', linha: null });
    ['intelecto', 'aura', 'carisma', 'forca', 'fisico', 'agilidade', 'percepcao'].forEach((col) => {
      expect(valores(col), col).toEqual(['—', '-2', '-1', '0', '1', '2', '3', '4', '5', '6', '7', '8']);
    });
  });

  it('grava número nos seis e texto no intelecto', async () => {
    montar({ tabela: 'criaturas', linha: { id: 5, nome: 'Golem', forca: 1, intelecto: '1' } });
    digitar('forca', '7');
    digitar('intelecto', '3');
    salvar();
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload.forca).toBe(7);
    expect(ultimoUpdate.payload.intelecto).toBe('3');
  });

  it('valor antigo fora da faixa aparece marcado', () => {
    montar({ tabela: 'criaturas', linha: { id: 5, nome: 'Titã', forca: 10 } });
    expect(bloco('forca').querySelector('.select-pill-btn-label').textContent).toBe('10 (fora da lista)');
  });
});

/* Ataque × Equipamento (25/09/2026): a mochila aceita qualquer item do
   catálogo, com quantidade; peça cujo lugar no corpo está ocupado vai para a
   mochila em vez de ser recusada. */
describe('criatura — mochila do Equipamento', () => {
  const CORDA = { slug: 'corda', nome: 'Corda', grupo: 'Itens' };
  const PEITORAL2 = { slug: 'peitoral_velho', nome: 'Peitoral Velho', grupo: 'Armaduras', slot_equip: 'peito', absorcao: 4, defesa: 1, tipo_armadura: 'M' };

  it('item comum entra com quantidade, e + / − mudam a conta', async () => {
    itensArmasFixture = [...PECAS, CORDA];
    montar({ tabela: 'criaturas', linha: null });
    digitar('nome', 'Bandido');
    await equipar('Corda');
    const chip = () => blocoEquip('itens').querySelector('[data-slug="corda"]');
    expect(chip().querySelector('.catalogo-lista-chip-nome').textContent).toBe('1× Corda');
    fireEvent.click(chip().querySelector('[aria-label^="Um a mais"]'));
    fireEvent.click(chip().querySelector('[aria-label^="Um a mais"]'));
    expect(chip().querySelector('.catalogo-lista-chip-nome').textContent).toBe('3× Corda');
    fireEvent.click(chip().querySelector('[aria-label^="Um a menos"]'));
    const p = await payloadDaCriatura();
    expect(p.equipamento).toEqual([{ slug: 'corda', slot: 'mochila', qtd: 2 }]);
  });

  it('o Ataque só oferece armas', async () => {
    itensArmasFixture = [...PECAS, CORDA];
    montar({ tabela: 'criaturas', linha: null });
    fireEvent.change(blocoEquip('ataque').querySelector('input'), { target: { value: 'Corda' } });
    expect(document.querySelectorAll('.catalogo-lista-drop li')).toHaveLength(0);
  });

  it('peça com o lugar ocupado vai para a mochila e não soma absorção', async () => {
    itensArmasFixture = [...PECAS, PEITORAL2];
    montar({ tabela: 'criaturas', linha: null });
    digitar('nome', 'Cavaleiro');
    await equipar('Peitoral de Aço');
    await equipar('Peitoral Velho');
    const p = await payloadDaCriatura();
    expect(p.equipamento).toEqual([
      { slug: 'peitoral_de_aco', slot: 'peito' },
      { slug: 'peitoral_velho', slot: 'mochila', qtd: 1 },
    ]);
    expect(p.absorcao).toBe(8);
  });
});

/* 25/09/2026: "No modal de editar criaturas, nome, subtipo e estágio ficam
   inline" e "remova o V do card elemento selecionado". */
describe('criatura — primeira linha e elemento sem ✓', () => {
  it('Nome, Subtipo e Estágio são os três primeiros campos, antes do Tipo', () => {
    montar({ tabela: 'criaturas', linha: null });
    const nomes = Array.from(document.querySelectorAll('input[name], [data-escolha], [data-multi], [data-escala]'))
      .map((el) => el.getAttribute('name') || el.getAttribute('data-escolha') || el.getAttribute('data-multi') || el.getAttribute('data-escala'));
    // Montaria é dropdown (sem name); Peso e Altura entram na mesma linha.
    expect(nomes.slice(0, 6)).toEqual(['nome', 'subtipo', 'estagio', 'peso', 'altura', 'tipo']);
  });

  /* 26/09/2026: nenhum campo da criatura é mais fileira de botões — tudo é
     dropdown ("use dropdown menu … nas criaturas"). */
  it('não sobra fileira de botões: atributos, classe, plano e grupo são dropdown', () => {
    montar({ tabela: 'criaturas', linha: null });
    expect(document.querySelectorAll('[data-escolha]')).toHaveLength(0);
    for (const col of ['forca', 'intelecto']) expect(document.querySelector(`[data-escala="${col}"] .select-pill-btn`), col).toBeTruthy();
    for (const col of ['tipo', 'plano', 'coletivo', 'elemento']) expect(document.querySelector(`[data-multi="${col}"] .select-pill-btn`), col).toBeTruthy();
  });

  it('elemento marcado não leva ✓', () => {
    montar({ tabela: 'criaturas', linha: { id: 5, nome: 'Fênix', elemento: 'Fogo' } });
    const fogo = opcoesMulti('elemento').find((li) => li.textContent.trim() === 'Fogo');
    expect(fogo.getAttribute('aria-selected')).toBe('true');
    expect(fogo.querySelector('.ti-check')).toBeNull();
  });
});

/* "Cada tipo de item possui seus campos próprios. Ou seja, um item tipo
   'consumíveis' não precisa mostrar no modal de editar campos tipo 'dano'."
   (usuário, 26/09/2026) */
describe('itens: cada grupo com os seus campos', () => {
  const tem = (col) => !!document.querySelector(`input[name="${col}"]`);

  it('Consumível não mostra dano, defesa nem grupo de armas', () => {
    montar({ tabela: 'itens', linha: { slug: 'pocao', nome: 'Poção', grupo: 'Consumíveis' } });
    for (const col of ['dano', 'alcance', 'defesa', 'absorcao', 'forca_req']) expect(tem(col), col).toBe(false);
    expect(tem('ocupa')).toBe(true);
    expect(document.querySelector('.catalogo-form-grid').textContent).not.toMatch(/Grupo de Armas|Ajuste/i);
  });

  it('Arma mostra dano e alcance; Armadura, defesa e absorção', () => {
    montar({ tabela: 'itens', linha: { slug: 'espada', nome: 'Espada', grupo: 'Armas' } });
    expect(tem('dano')).toBe(true);
    expect(tem('alcance')).toBe(true);
    expect(tem('defesa')).toBe(false);
    cleanup();
    montar({ tabela: 'itens', linha: { slug: 'cota', nome: 'Cota', grupo: 'Armaduras' } });
    expect(tem('defesa')).toBe(true);
    expect(tem('absorcao')).toBe(true);
    expect(tem('dano')).toBe(false);
  });

  it('valor já gravado fora do grupo continua aparecendo — nada some sem alguém ver', () => {
    montar({ tabela: 'itens', linha: { slug: 'bomba', nome: 'Bomba', grupo: 'Consumíveis', dano: 12 } });
    expect(tem('dano')).toBe(true);
  });

  it('item novo sem grupo mostra só os campos comuns', () => {
    montar({ tabela: 'itens', linha: null });
    expect(tem('nome')).toBe(true);
    expect(tem('valor_latao')).toBe(true);
    expect(tem('dano')).toBe(false);
  });

  it('o preço é "Valor", sem "latão"', () => {
    montar({ tabela: 'itens', linha: { slug: 'pocao', nome: 'Poção', grupo: 'Consumíveis' } });
    const rot = document.querySelector('input[name="valor_latao"]').closest('.motor-field, div').textContent;
    expect(rot).not.toMatch(/lat[ãa]o/i);
  });
});

/* "Os itens necessários para realizar o ritual fica em um input próprio, com
   dropdown para selecionar quais itens do catálogo." (usuário, 26/09/2026) */
describe('magia: itens do ritual com quantidade', () => {
  const bloco = () => document.querySelector('[data-lista="itens_necessarios"]');
  const chips = () => [...bloco().querySelectorAll('.catalogo-lista-chip')].map((c) => [
    c.querySelector('.catalogo-lista-chip-nome').textContent,
    (c.querySelector('.catalogo-lista-qtd-n') || { textContent: null }).textContent,
  ]);

  it('abre com o que está gravado: nome e quantidade separados', () => {
    montar({ tabela: 'magias', linha: { key: 'aprisionar', nome: 'Aprisionar', itens_necessarios: 'Vela (7), Hidromel (1)' } });
    expect(chips()).toEqual([['Vela', '7'], ['Hidromel', '1']]);
  });

  it('+ e − mudam a quantidade, e grava no mesmo formato', async () => {
    montar({ tabela: 'magias', linha: { key: 'aprisionar', nome: 'Aprisionar', itens_necessarios: 'Vela (7), Hidromel (1)' } });
    fireEvent.click(bloco().querySelector('[aria-label="Um a mais: Vela"]'));
    expect(bloco().querySelector('[aria-label="Um a menos: Hidromel"]').disabled).toBe(true);
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload.itens_necessarios).toBe('Vela (8), Hidromel (1)');
  });

  it('quantidade que não é número passa como veio, sem botões', () => {
    montar({ tabela: 'magias', linha: { key: 'x', nome: 'X', itens_necessarios: 'Carcaça (Variável)' } });
    expect(chips()).toEqual([['Carcaça (Variável)', null]]);
  });
});
