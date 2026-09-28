/* ============================================================
   catalogo-descritores.test.js — o descritor contra o schema real
   ============================================================
   Este arquivo existe pra impedir o descritor de apodrecer. Coluna nova no
   banco, coluna renomeada, coluna que vira NOT NULL — qualquer uma dessas
   quebra um teste daqui, em vez de virar campo faltando na tela do admin.

   As listas de coluna abaixo são cópias do schema em 10/09/2026.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/game-data.jsx';
import './catalogo-descritores.jsx';

let MAP, descritorDe;
beforeAll(() => {
  MAP = window.CATALOGO_DESCRITORES;
  descritorDe = window.descritorDe;
  expect(MAP).toBeDefined();
});

// Cópia do schema. `id` e `created_at` NÃO entram em descritor (são do banco).
const COLUNAS = {
  criaturas: ['nome','tipo','estagio','energia_fisica','energia_heroica','absorcao','armadura','defesa','velocidade','peso','ataque','dano_l','dano_m','dano_p','dano_25','dano_50','dano_75','dano_100','intelecto','aura','carisma','forca','fisico','agilidade','percepcao','tipo_armadura','descricao','subtipo','plano','coletivo','magia','magia_n','tecnicas_especiais','habilidades','equipamento','montaria','altura','elemento'],
  magias: ['key','nome','evocacao','alcance','duracao','custo','tipo','permissao','descricao','nivel_1','nivel_3','nivel_5','nivel_7','nivel_9','dano',
    // Itens do ritual, coluna própria desde 26/09/2026.
    'itens_necessarios'],
  tecnicas: ['key','nome','custo','permissao','uso','grupo_armas','grupo_armaduras','descricao','efeito','ajuste'],
  habilidades: ['key','nome','grupo','ajuste','custo','nivel_inicial','vantagem','desvantagem','restricao','descricao'],
  itens: ['slug','nome','grupo','ocupa','armazena','tipo','valor_latao','efeito','efeito_positivo','efeito_negativo','tipo_item','magia','nivel_magia','descricao','magico','categoria_equip','slot_equip','grupo_equipamento','maos_pequenino','maos_anao','maos_outras','forca_req','dano','alcance','ajuste_atributo','defesa','absorcao','tipo_armadura','dano_l','dano_m','dano_p','grupo_armas','origem','resistencia','icone','consumiveis','consumiveis_peso','doc_url','criatura_id'],
};

// NOT NULL sem default — o descritor tem que marcar obrigatorio.
const OBRIGATORIAS = {
  criaturas: ['nome'],
  magias: ['key','nome'],
  tecnicas: ['key','nome','custo'],
  habilidades: ['key','nome','grupo','ajuste','custo'],
  itens: ['slug','nome'],
};

// A coluna que identifica a linha e não pode ser renomeada depois de criada.
// `criaturas` não tem: ela é identificada pelo id do banco, e `nome` é editável.
const CHAVE = { criaturas: null, magias: 'key', tecnicas: 'key', habilidades: 'key', itens: 'slug' };

// `lista` (13/09/2026): nomes escolhidos do catálogo, gravados com vírgula.
// `equipamento` (14/09/2026): armas e armaduras da criatura.
// `referencia` (14/09/2026): uma linha de outra tabela, pelo id (itens.criatura_id).
// 'multiopcoes' (25/09/2026): várias escolhas de uma lista fechada — o elemento da criatura.
const TIPOS = ['texto', 'area', 'numero', 'opcoes', 'multiopcoes', 'derivado', 'lista', 'equipamento', 'referencia'];
// 'itens': os itens do ritual da magia escolhem do catálogo de itens (26/09/2026).
const FONTES_LISTA = ['tecnicas', 'habilidades', 'magias', 'itens'];

describe('CATALOGO_DESCRITORES', () => {
  it('cobre exatamente as 5 tabelas', () => {
    expect(Object.keys(MAP).sort()).toEqual(['criaturas','habilidades','itens','magias','tecnicas']);
  });

  it('toda coluna declarada existe na tabela', () => {
    for (const [tab, d] of Object.entries(MAP)) {
      for (const c of d.campos) {
        // semColuna: só mostrado (RF/RM da criatura), nunca gravado.
        if (c.semColuna) continue;
        expect(COLUNAS[tab], `${tab}.${c.col} não existe no schema`).toContain(c.col);
      }
    }
  });

  it('nenhum descritor declara `id` ou `created_at`', () => {
    for (const [tab, d] of Object.entries(MAP)) {
      const cols = d.campos.map((c) => c.col);
      expect(cols, tab).not.toContain('id');
      expect(cols, tab).not.toContain('created_at');
    }
  });

  it('toda coluna NOT NULL sem default tem campo obrigatório', () => {
    for (const [tab, obrig] of Object.entries(OBRIGATORIAS)) {
      for (const col of obrig) {
        const campo = MAP[tab].campos.find((c) => c.col === col);
        expect(campo, `${tab}.${col} sem campo no descritor`).toBeDefined();
        expect(campo.obrigatorio, `${tab}.${col} devia ser obrigatório`).toBe(true);
      }
    }
  });

  it('todo campo tem tipo válido e rótulo', () => {
    for (const [tab, d] of Object.entries(MAP)) {
      for (const c of d.campos) {
        expect(TIPOS, `${tab}.${c.col}`).toContain(c.tipo);
        if (c.tipo === 'lista') expect(FONTES_LISTA, `${tab}.${c.col} sem fonte válida`).toContain(c.fonte);
        expect(typeof c.rotuloKey === 'string' && c.rotuloKey.length > 0, `${tab}.${c.col}`).toBe(true);
      }
    }
  });

  it('campo de opções tem lista não vazia', () => {
    for (const [tab, d] of Object.entries(MAP)) {
      for (const c of d.campos.filter((x) => x.tipo === 'opcoes' || x.tipo === 'multiopcoes')) {
        expect(Array.isArray(c.opcoes) && c.opcoes.length > 0, `${tab}.${c.col}`).toBe(true);
      }
    }
  });

  it('a coluna-chave é somenteNovo, e criaturas não tem chave', () => {
    for (const [tab, chave] of Object.entries(CHAVE)) {
      expect(MAP[tab].chave, tab).toBe(chave);
      if (chave === null) {
        expect(MAP[tab].campos.some((c) => c.somenteNovo), tab).toBe(false);
      } else {
        const campo = MAP[tab].campos.find((c) => c.col === chave);
        expect(campo.somenteNovo, `${tab}.${chave}`).toBe(true);
      }
    }
  });

  // Os valores fechados vieram de um SELECT DISTINCT no banco em 10/09/2026.
  it('as listas de opções batem com os valores reais do banco', () => {
    const uso = MAP.tecnicas.campos.find((c) => c.col === 'uso');
    expect(uso.opcoes.sort()).toEqual(['Intermitente','Livre','Único'].sort());

    const grupoHab = MAP.habilidades.campos.find((c) => c.col === 'grupo');
    expect(grupoHab.opcoes.sort())
      .toEqual(['Conhecimento','Geral','Influência','Manobra','Profissional','Subterfúgio'].sort());

    const grupoItem = MAP.itens.campos.find((c) => c.col === 'grupo');
    expect(grupoItem.opcoes).toContain('Armas');
    expect(grupoItem.opcoes).toContain('Armaduras');
    expect(grupoItem.opcoes.length).toBe(14);
  });

  it('ajuste usa os 7 atributos do sistema', () => {
    for (const tab of ['tecnicas', 'habilidades']) {
      const campo = MAP[tab].campos.find((c) => c.col === 'ajuste');
      expect(window.opcoesNormalizadas(campo).map((o) => o.value).sort(), tab)
        .toEqual([...window.ATRIBUTOS_KEYS].sort());
    }
  });

  // "No input 'ajuste', deve mostrar o atributo com a primeira letra maiúscula." (14/09/2026)
  it('ajuste grava a chave e mostra o nome com maiúscula e acento', () => {
    for (const tab of ['tecnicas', 'habilidades']) {
      const campo = MAP[tab].campos.find((c) => c.col === 'ajuste');
      expect(window.opcoesNormalizadas(campo), tab).toEqual([
        { value: 'intelecto', label: 'Intelecto' }, { value: 'aura', label: 'Aura' },
        { value: 'carisma', label: 'Carisma' }, { value: 'forca', label: 'Força' },
        { value: 'fisico', label: 'Físico' }, { value: 'agilidade', label: 'Agilidade' },
        { value: 'percepcao', label: 'Percepção' },
      ]);
    }
  });

  it('criaturas tem os campos derivados, e eles NÃO são obrigatórios', () => {
    const derivados = MAP.criaturas.campos.filter((c) => c.tipo === 'derivado').map((c) => c.col);
    expect(derivados.sort()).toEqual(
      // 14/09/2026: ataque e armadura passam a ser calculados; RF e RM entram só para mostrar.
      ['absorcao','armadura','ataque','dano_100','dano_25','dano_50','dano_75','dano_l','dano_m','dano_p','defesa','energia_fisica','energia_heroica','resistencia_fisica','resistencia_magica','velocidade'].sort()
    );
    for (const c of MAP.criaturas.campos.filter((x) => x.tipo === 'derivado')) {
      expect(c.obrigatorio, c.col).not.toBe(true);
    }
  });

  // Este teste existe porque a versão original deste descritor fazia
  // Object.keys(GRUPOS_ARMAS) — e GRUPOS_ARMAS é um ARRAY de objetos, então
  // as opções teriam saído como '0','1','2'… em vez das siglas. O teste antigo
  // ("lista não vazia") passava do mesmo jeito.
  it('grupo_armas oferece as siglas reais do catálogo, não índices', () => {
    for (const [tab, col] of [['tecnicas', 'grupo_armas'], ['itens', 'grupo_armas']]) {
      const campo = MAP[tab].campos.find((c) => c.col === col);
      expect(campo, `${tab}.${col}`).toBeDefined();
      expect(campo.opcoes, `${tab}.${col}`).toContain('Livre');
      expect(campo.opcoes, `${tab}.${col}`).toContain('CM');
      expect(campo.opcoes, `${tab}.${col}`).toContain('PL');
      // Nenhuma opção pode ser um índice numérico em forma de string.
      for (const o of campo.opcoes) {
        expect(/^\d+$/.test(String(o)), `${tab}.${col} tem opção "${o}"`).toBe(false);
      }
    }
  });

  /* Sigla no banco, palavra na tela desde 26/09/2026 ("'L' vira 'Armaduras
     leves'"). */
  it('grupo_armaduras oferece Livre, L, M e P — com as palavras na tela', () => {
    const campo = MAP.tecnicas.campos.find((c) => c.col === 'grupo_armaduras');
    expect(opcoesNormalizadas(campo)).toEqual([
      { value: 'Livre', label: 'Livre' },
      { value: 'L', label: 'Armaduras leves' },
      { value: 'M', label: 'Armaduras médias' },
      { value: 'P', label: 'Armaduras pesadas' },
    ]);
  });

  it('na técnica, grupo de armas e de armaduras dividem a linha', () => {
    const larg = (col) => MAP.tecnicas.campos.find((c) => c.col === col).largura;
    expect([larg('grupo_armas'), larg('grupo_armaduras')]).toEqual(['meia', 'meia']);
  });

  it('no item, a descrição é o último campo', () => {
    expect(MAP.itens.campos.at(-1).col).toBe('descricao');
  });
});

describe('opcoesNormalizadas — sigla no banco, palavra na tela', () => {
  /* O descritor sempre gravou O PRÓPRIO RÓTULO no banco, porque `opcoes` era
     uma lista de strings e o editor mapeava `{ value: o, label: o }`. Isso
     impede mostrar "Sólido" e gravar "S".

     A lista passa a aceitar as duas formas: string (valor = rótulo, como
     sempre) e { value, label }. Normalizar num lugar só evita que cada
     consumidor tenha que saber disso. */
  let opcoesNormalizadas;
  beforeAll(() => {
    opcoesNormalizadas = window.opcoesNormalizadas;
    expect(opcoesNormalizadas).toBeTypeOf('function');
  });

  it('string vira value e label iguais — a forma antiga não muda', () => {
    expect(opcoesNormalizadas({ opcoes: ['Sim', 'Não'] }))
      .toEqual([{ value: 'Sim', label: 'Sim' }, { value: 'Não', label: 'Não' }]);
  });

  it('objeto passa direto', () => {
    expect(opcoesNormalizadas({ opcoes: [{ value: 'S', label: 'Sólido' }] }))
      .toEqual([{ value: 'S', label: 'Sólido' }]);
  });

  it('lista mista funciona', () => {
    expect(opcoesNormalizadas({ opcoes: ['Livre', { value: 'L', label: 'Leve' }] }))
      .toEqual([{ value: 'Livre', label: 'Livre' }, { value: 'L', label: 'Leve' }]);
  });

  it('campo sem opções devolve lista vazia, sem lançar', () => {
    expect(opcoesNormalizadas({})).toEqual([]);
    expect(opcoesNormalizadas(null)).toEqual([]);
  });
});

describe('itens — os campos que mudaram em 11/09/2026', () => {
  const campoDe = (col) => MAP.itens.campos.find((c) => c.col === col);

  it('magico é somenteLeitura — é coluna GERADA no Postgres', () => {
    /* itens.magico é GENERATED ALWAYS AS (magia IS NOT NULL AND magia <> '').
       O banco recusa qualquer UPDATE que a mencione com
       "column magico can only be updated to DEFAULT" — e o editor a mandava
       no payload de TODA edição de item, então nenhum item salvava. */
    expect(campoDe('magico').somenteLeitura).toBe(true);
  });

  it('tipo mostra Sólido/Líquido e grava S/L', () => {
    const campo = campoDe('tipo');
    expect(campo.tipo).toBe('opcoes');
    expect(window.opcoesNormalizadas(campo))
      .toEqual([{ value: 'S', label: 'Sólido' }, { value: 'L', label: 'Líquido' }]);
  });

  it('tipo_armadura mostra Leve/Médio/Pesado e grava L/M/P', () => {
    const campo = campoDe('tipo_armadura');
    expect(campo.tipo).toBe('opcoes');
    expect(window.opcoesNormalizadas(campo).map((o) => o.value)).toEqual(['L', 'M', 'P']);
    expect(window.opcoesNormalizadas(campo).map((o) => o.label))
      .toEqual(['Leve', 'Médio', 'Pesado']);
  });

  it('origem é dropdown com os três valores reais do banco', () => {
    const campo = campoDe('origem');
    expect(campo.tipo).toBe('opcoes');
    expect(window.opcoesNormalizadas(campo).map((o) => o.value))
      .toEqual(['Comum', 'Raro', 'Mágico']);
  });
});

describe('descritorDe', () => {
  it('devolve o descritor da tabela', () => {
    expect(descritorDe('tecnicas').tabela).toBe('tecnicas');
  });

  it('devolve null pra tabela desconhecida, sem lançar', () => {
    expect(descritorDe('inexistente')).toBeNull();
    expect(descritorDe(null)).toBeNull();
    expect(descritorDe(undefined)).toBeNull();
  });
});

/* "'estágio' fica inline com 'nome', 'tipo', etc." (usuário, 14/09/2026):
   na grade de 4 colunas, a primeira linha é Nome · Tipo · Subtipo · Estágio. */
describe('criaturas — ordem e equipamento', () => {
  // Nome · Subtipo · Estágio · Montaria · Peso · Altura na mesma linha, Tipo
  // (botões) logo depois — 25/09/2026. Os quatro últimos da linha são curtos.
  it('a primeira linha é nome, subtipo, estágio, montaria, peso e altura; depois o tipo', () => {
    expect(MAP.criaturas.campos.slice(0, 7).map((c) => c.col))
      .toEqual(['nome', 'subtipo', 'estagio', 'montaria', 'peso', 'altura', 'tipo']);
    expect(MAP.criaturas.campos.filter((c) => c.largura === 'curta').map((c) => c.col))
      .toEqual(['estagio', 'montaria', 'peso', 'altura']);
  });
  it('tem o campo de equipamento, antes dos calculados', () => {
    const cols = MAP.criaturas.campos.map((c) => c.col);
    expect(MAP.criaturas.campos.find((c) => c.col === 'equipamento').tipo).toBe('equipamento');
    expect(cols.indexOf('equipamento')).toBeLessThan(cols.indexOf('ataque'));
  });
  it('RF e RM não vão para o banco', () => {
    for (const col of ['resistencia_fisica', 'resistencia_magica']) {
      expect(MAP.criaturas.campos.find((c) => c.col === col).semColuna, col).toBe(true);
    }
  });
});

/* As CHECK de `itens` no banco (leitura de 14/09/2026). Campo que o banco
   restringe tem que ser lista com EXATAMENTE esses valores — texto livre
   deixava o admin digitar algo que o insert recusava. */
describe('itens — campos que o banco restringe', () => {
  const valores = (col) => window.opcoesNormalizadas(MAP.itens.campos.find((c) => c.col === col)).map((o) => o.value).sort();
  it('categoria_equip = itens_categoria_equip_chk', () => {
    expect(valores('categoria_equip')).toEqual(['arma', 'armadura', 'escudo']);
  });
  it('slot_equip = itens_slot_equip_chk', () => {
    expect(valores('slot_equip')).toEqual(['bracos', 'cabeca', 'cintura', 'corpo', 'costas', 'dedos',
      'maos', 'orelhas', 'peito', 'pernas', 'pes', 'pescoco', 'ombros'].sort());
  });
  it('icone passa pelo normalizador, e todo valor válido casa a itens_icone_formato_chk', () => {
    expect(MAP.itens.campos.find((c) => c.col === 'icone').formato).toBe('icone');
    const chk = /^ti-[a-z0-9-]+$/;
    for (const t of ['ti-paw', 'ti ti-paw', '<i class="ti ti-file-star"></i>', 'Paw Print', 'Garra Ácida']) {
      const r = window.normalizarIcone(t);
      expect(r.valido, t).toBe(true);
      expect(chk.test(r.valor), t).toBe(true);
    }
    expect(window.normalizarIcone('')).toEqual({ valor: null, valido: true });
    expect(window.normalizarIcone('garras!').valido).toBe(false);
  });
});

/* "Nas habilidades, [...] remova o input de 'nível inicial'." (usuário, 14/09/2026) */
describe('habilidades — sem nível inicial no formulário', () => {
  it('o descritor não declara nivel_inicial (o banco tem default 0)', () => {
    expect(MAP.habilidades.campos.map((c) => c.col)).not.toContain('nivel_inicial');
  });

  // "Ainda há um campo escrito 'restrição' no modal de editar habilidades." (14/09/2026)
  it('nem restricao', () => {
    expect(MAP.habilidades.campos.map((c) => c.col)).not.toContain('restricao');
  });
});

/* Editor de magias (26/09/2026): Tipo, Evocação, Alcance, Duração e Custo
   viram dropdown com as listas do usuário; Dano ao lado de Custo; Itens
   necessários logo abaixo de Permissão. */
describe('magias: dropdowns e ordem do editor', () => {
  const campo = (col) => descritorDe('magias').campos.find((c) => c.col === col);
  const valores = (col) => campo(col).opcoes.map((o) => (typeof o === 'object' ? o.value : o));
  it('as cinco listas fechadas', () => {
    expect(valores('tipo')).toEqual(['Básica', 'Perdida', 'Ancestral']);
    expect(valores('evocacao')).toEqual(['Instantânea', '1 rodada', '2 rodadas', '3 rodadas', '4 rodadas', '5 rodadas', '10 rodadas', '15 rodadas', '30 rodadas']);
    expect(valores('alcance')).toEqual(['Toque', '2 metros', '5 metros', '10 metros', '15 metros', '20 metros', '50 metros', '100 metros', '1 quilômetro']);
    expect(valores('duracao')).toEqual(['Variável', 'Instantânea', '1 rodada', '2 rodadas', '3 rodadas', '4 rodadas', '5 rodadas', '10 rodadas', '15 rodadas', '30 rodadas']);
    expect(valores('custo')).toEqual(['1', '2', '3', '4']);
    ['tipo', 'evocacao', 'alcance', 'duracao', 'custo'].forEach((c) => expect(campo(c).tipo).toBe('opcoes'));
  });
  it('Dano depois de Custo; Itens necessários depois de Permissão', () => {
    const ordem = descritorDe('magias').campos.map((c) => c.col);
    expect(ordem.indexOf('dano')).toBe(ordem.indexOf('custo') + 1);
    expect(ordem.indexOf('itens_necessarios')).toBe(ordem.indexOf('permissao') + 1);
  });
});

describe('habilidades: vantagem e desvantagem por Raça e Reino', () => {
  it('multisseleção com as raças e os reinos do GAME_DATA', () => {
    ['vantagem', 'desvantagem'].forEach((col) => {
      const c = descritorDe('habilidades').campos.find((x) => x.col === col);
      expect(c.tipo).toBe('multiopcoes');
      expect(c.opcoes).toContain('Anão');
      expect(c.opcoes).toContain('Porto Livre');
      expect(c.opcoes.length).toBe(Object.keys(window.GAME_DATA.racas).length + window.GAME_DATA.reinos.length);
    });
  });
});
