/* ============================================================
   DESCRITORES DE CATÁLOGO — o que o editor de admin sabe sobre cada tabela
   ============================================================
   DADO, não código: cada tabela declara seus campos, e o editor genérico
   (catalogo-editor.jsx) monta a tela a partir daqui. Escrever cinco
   formulários à mão pra 115 colunas seria muito mais código, e cada coluna
   nova no banco exigiria mexer em JSX.

   O tipo `opcoes` é o que dá valor real: ele fecha a porta pela qual entrou
   o `tecnicas.grupo_armas = 'Intermitente'` que achamos em 09/09/2026 —
   aquele valor pertence à lista de `uso`, e um campo de lista fechada nunca
   o teria oferecido.

   `rotuloKey` aponta pra uma chave do objeto de tradução (01-core/constants.jsx,
   ADMIN_COPY — é lá que o bloco vive de fato, não em copy.jsx), NUNCA pro
   texto direto: o app é bilíngue e a feature anterior já teve que corrigir
   strings embutidas no JSX.

   `id` e `created_at` não entram: são do banco. `atualizado_em` também não:
   quem preenche é o editor no salvar, não o admin.
   ============================================================ */

// GRUPOS_ARMAS é um ARRAY de objetos { sigla, nome, ... } (game-data.jsx),
// não um objeto com siglas por chave — Object.keys() nele devolveria índices
// numéricos ('0', '1', ...) em vez das siglas reais (CD, CL, CM...).
// .map() preserva a ordem canônica do catálogo sem depender de um derivado.
const GRUPOS_ARMAS_SIGLAS = Array.isArray(GRUPOS_ARMAS)
  ? GRUPOS_ARMAS.map((g) => g.sigla) : [];
const OPCOES_GRUPO_ARMAS = ['Livre', ...GRUPOS_ARMAS_SIGLAS];
const OPCOES_GRUPO_ARMADURAS = ['Livre', 'L', 'M', 'P'];
const OPCOES_ATRIBUTO = (typeof ATRIBUTOS_KEYS !== 'undefined') ? [...ATRIBUTOS_KEYS] : [];

const CATALOGO_DESCRITORES = {
  tecnicas: {
    tabela: 'tecnicas',
    rotuloKey: 'tabTecnicas',
    chave: 'key',
    campos: [
      { col: 'key',   tipo: 'texto',  rotuloKey: 'campoChave', obrigatorio: true, somenteNovo: true, autoDeNome: true },
      { col: 'nome',  tipo: 'texto',  rotuloKey: 'campoNome',  obrigatorio: true },
      { col: 'custo', tipo: 'numero', rotuloKey: 'campoCusto', obrigatorio: true, min: 1, max: 2 },
      { col: 'uso',   tipo: 'opcoes', rotuloKey: 'campoUso',   opcoes: ['Único', 'Intermitente', 'Livre'] },
      { col: 'ajuste',          tipo: 'opcoes', rotuloKey: 'campoAjuste',    opcoes: OPCOES_ATRIBUTO },
      { col: 'grupo_armas',     tipo: 'opcoes', rotuloKey: 'campoArmas',     opcoes: OPCOES_GRUPO_ARMAS },
      { col: 'grupo_armaduras', tipo: 'opcoes', rotuloKey: 'campoArmaduras', opcoes: OPCOES_GRUPO_ARMADURAS },
      { col: 'permissao', tipo: 'texto', rotuloKey: 'campoPermissao' },
      { col: 'descricao', tipo: 'area',  rotuloKey: 'campoDescricao', linhas: 3 },
      { col: 'efeito',    tipo: 'area',  rotuloKey: 'campoEfeito',    linhas: 3 },
    ],
  },

  habilidades: {
    tabela: 'habilidades',
    rotuloKey: 'tabHabilidades',
    chave: 'key',
    campos: [
      { col: 'key',   tipo: 'texto',  rotuloKey: 'campoChave', obrigatorio: true, somenteNovo: true, autoDeNome: true },
      { col: 'nome',  tipo: 'texto',  rotuloKey: 'campoNome',  obrigatorio: true },
      { col: 'grupo', tipo: 'opcoes', rotuloKey: 'campoGrupo', obrigatorio: true,
        opcoes: ['Conhecimento', 'Geral', 'Influência', 'Manobra', 'Profissional', 'Subterfúgio'] },
      { col: 'ajuste', tipo: 'opcoes', rotuloKey: 'campoAjuste', obrigatorio: true, opcoes: OPCOES_ATRIBUTO },
      { col: 'custo',  tipo: 'numero', rotuloKey: 'campoCusto', obrigatorio: true, min: 1, max: 9 },
      { col: 'nivel_inicial', tipo: 'numero', rotuloKey: 'campoNivelInicial', min: 0, max: 9 },
      { col: 'vantagem',    tipo: 'area', rotuloKey: 'campoVantagem',    linhas: 2 },
      { col: 'desvantagem', tipo: 'area', rotuloKey: 'campoDesvantagem', linhas: 2 },
      { col: 'restricao',   tipo: 'area', rotuloKey: 'campoRestricao',   linhas: 2 },
      { col: 'descricao',   tipo: 'area', rotuloKey: 'campoDescricao',   linhas: 3 },
    ],
  },

  magias: {
    tabela: 'magias',
    rotuloKey: 'tabMagias',
    chave: 'key',
    campos: [
      { col: 'key',      tipo: 'texto', rotuloKey: 'campoChave', obrigatorio: true, somenteNovo: true, autoDeNome: true },
      { col: 'nome',     tipo: 'texto', rotuloKey: 'campoNome',  obrigatorio: true },
      { col: 'tipo',     tipo: 'texto', rotuloKey: 'campoTipo' },
      { col: 'evocacao', tipo: 'texto', rotuloKey: 'campoEvocacao' },
      { col: 'alcance',  tipo: 'texto', rotuloKey: 'campoAlcance' },
      { col: 'duracao',  tipo: 'texto', rotuloKey: 'campoDuracao' },
      // custo é texto no banco (ex.: "1/turno"), não número.
      { col: 'custo',     tipo: 'texto',  rotuloKey: 'campoCusto' },
      { col: 'permissao', tipo: 'texto',  rotuloKey: 'campoPermissao' },
      { col: 'dano',      tipo: 'numero', rotuloKey: 'campoDano', min: 0 },
      { col: 'descricao', tipo: 'area',   rotuloKey: 'campoDescricao', linhas: 3 },
      { col: 'nivel_1', tipo: 'area', rotuloKey: 'campoNivel1', linhas: 2 },
      { col: 'nivel_3', tipo: 'area', rotuloKey: 'campoNivel3', linhas: 2 },
      { col: 'nivel_5', tipo: 'area', rotuloKey: 'campoNivel5', linhas: 2 },
      { col: 'nivel_7', tipo: 'area', rotuloKey: 'campoNivel7', linhas: 2 },
      { col: 'nivel_9', tipo: 'area', rotuloKey: 'campoNivel9', linhas: 2 },
    ],
  },

  criaturas: {
    tabela: 'criaturas',
    rotuloKey: 'tabCriaturas',
    // Sem chave própria: a criatura é identificada pelo id do banco, e
    // `nome` continua editável depois de criada.
    chave: null,
    campos: [
      { col: 'nome',     tipo: 'texto', rotuloKey: 'campoNome', obrigatorio: true },
      { col: 'tipo',     tipo: 'texto', rotuloKey: 'campoTipo' },
      { col: 'subtipo',  tipo: 'texto', rotuloKey: 'campoSubtipo' },
      { col: 'descricao', tipo: 'area', rotuloKey: 'campoDescricao', linhas: 3 },
      { col: 'plano',    tipo: 'texto', rotuloKey: 'campoPlano' },
      { col: 'coletivo', tipo: 'opcoes', rotuloKey: 'campoColetivo',
        opcoes: ['Grupo Grande', 'Grupo Médio', 'Grupo Pequeno', 'Solitário'] },
      { col: 'estagio', tipo: 'numero', rotuloKey: 'campoEstagio', min: 1, max: 60 },
      { col: 'peso',    tipo: 'numero', rotuloKey: 'campoPeso',    min: 0 },
      // intelecto é TEXT no banco, diferente dos outros seis atributos.
      { col: 'intelecto', tipo: 'texto', rotuloKey: 'campoIntelecto' },
      { col: 'aura',       tipo: 'numero', rotuloKey: 'campoAura',       min: -2, max: 10 },
      { col: 'carisma',    tipo: 'numero', rotuloKey: 'campoCarisma',    min: -2, max: 10 },
      { col: 'forca',      tipo: 'numero', rotuloKey: 'campoForca',      min: -2, max: 10 },
      { col: 'fisico',     tipo: 'numero', rotuloKey: 'campoFisico',     min: -2, max: 10 },
      { col: 'agilidade',  tipo: 'numero', rotuloKey: 'campoAgilidade',  min: -2, max: 10 },
      { col: 'percepcao',  tipo: 'numero', rotuloKey: 'campoPercepcao',  min: -2, max: 10 },
      { col: 'armadura',      tipo: 'texto', rotuloKey: 'campoArmadura' },
      { col: 'tipo_armadura', tipo: 'texto', rotuloKey: 'campoTipoArmadura' },
      // Os 30 nomes fechados de ataques-criatura.jsx (dano_l/m/p derivam
      // deles — ver criatura-formulas.jsx). catalogo-editor.jsx acrescenta,
      // em tempo de execução, as armas do catálogo `itens` que faltarem
      // aqui. "Toque" fica de fora de propósito (offset não constante no
      // banco, ver comentário em ataques-criatura.jsx).
      { col: 'ataque', tipo: 'opcoes', rotuloKey: 'campoAtaque',
        opcoes: AtaquesCriatura.NOMES_ATAQUE_CRIATURA },
      { col: 'magia',   tipo: 'texto',  rotuloKey: 'campoMagia' },
      { col: 'magia_n', tipo: 'numero', rotuloKey: 'campoMagiaN', min: 1, max: 9 },
      { col: 'tecnicas_especiais', tipo: 'area', rotuloKey: 'campoTecnicasEspeciais', linhas: 2 },
      { col: 'habilidades',        tipo: 'area', rotuloKey: 'campoHabilidades',        linhas: 2 },
      // Derivados: calculados pelas fórmulas de criatura-formulas.jsx, não
      // editados diretamente pelo admin — por isso nunca são obrigatórios.
      { col: 'energia_fisica',  tipo: 'derivado', rotuloKey: 'campoEnergiaFisica',  derivado: true, formula: 'energiaFisica' },
      { col: 'energia_heroica', tipo: 'derivado', rotuloKey: 'campoEnergiaHeroica', derivado: true, formula: 'energiaHeroica' },
      { col: 'absorcao', tipo: 'derivado', rotuloKey: 'campoAbsorcao', derivado: true, formula: 'absorcao' },
      { col: 'defesa',   tipo: 'derivado', rotuloKey: 'campoDefesa',   derivado: true, formula: 'defesa' },
      { col: 'velocidade', tipo: 'derivado', rotuloKey: 'campoVelocidade', derivado: true, formula: 'velocidade' },
      { col: 'dano_l', tipo: 'derivado', rotuloKey: 'campoDanoL', derivado: true, formula: 'danoLMP' },
      { col: 'dano_m', tipo: 'derivado', rotuloKey: 'campoDanoM', derivado: true, formula: 'danoLMP' },
      { col: 'dano_p', tipo: 'derivado', rotuloKey: 'campoDanoP', derivado: true, formula: 'danoLMP' },
      { col: 'dano_100', tipo: 'derivado', rotuloKey: 'campoDano100', derivado: true, formula: 'dano100' },
      { col: 'dano_25', tipo: 'derivado', rotuloKey: 'campoDano25', derivado: true, formula: 'tiersDeDano' },
      { col: 'dano_50', tipo: 'derivado', rotuloKey: 'campoDano50', derivado: true, formula: 'tiersDeDano' },
      { col: 'dano_75', tipo: 'derivado', rotuloKey: 'campoDano75', derivado: true, formula: 'tiersDeDano' },
    ],
  },

  itens: {
    tabela: 'itens',
    rotuloKey: 'tabItens',
    chave: 'slug',
    campos: [
      { col: 'slug', tipo: 'texto', rotuloKey: 'campoSlug', obrigatorio: true, somenteNovo: true, autoDeNome: true },
      { col: 'nome', tipo: 'texto', rotuloKey: 'campoNome', obrigatorio: true },
      { col: 'grupo', tipo: 'opcoes', rotuloKey: 'campoGrupo',
        opcoes: ['Animais', 'Armaduras', 'Armas', 'Consumíveis', 'Diario', 'Instrumentos', 'Itens',
          'Minerais', 'Moedas', 'Propriedades', 'Recipientes', 'Serviços', 'Transportes', 'Vestimentas'] },
      // O banco guarda a SIGLA (S/L); a tela mostra a palavra. Ver
      // opcoesNormalizadas no fim do arquivo.
      { col: 'tipo',      tipo: 'opcoes', rotuloKey: 'campoTipo',
        opcoes: [{ value: 'S', label: 'Sólido' }, { value: 'L', label: 'Líquido' }] },
      { col: 'tipo_item', tipo: 'texto', rotuloKey: 'campoTipoItem' },
      // Os três valores vêm de um SELECT DISTINCT em 11/09/2026: Comum 489,
      // Raro 105, Mágico 78. Os 75 vazios foram preenchidos com Comum pelo
      // script scripts/sql/itens-origem-tipo-armadura-fix.sql.
      { col: 'origem',    tipo: 'opcoes', rotuloKey: 'campoOrigem',
        opcoes: ['Comum', 'Raro', 'Mágico'] },
      { col: 'icone',     tipo: 'texto', rotuloKey: 'campoIcone' },
      { col: 'doc_url',   tipo: 'texto', rotuloKey: 'campoDocUrl' },
      { col: 'descricao', tipo: 'area', rotuloKey: 'campoDescricao', linhas: 3 },
      { col: 'efeito',          tipo: 'area', rotuloKey: 'campoEfeito',          linhas: 2 },
      { col: 'efeito_positivo', tipo: 'area', rotuloKey: 'campoEfeitoPositivo',  linhas: 2 },
      { col: 'efeito_negativo', tipo: 'area', rotuloKey: 'campoEfeitoNegativo',  linhas: 2 },
      { col: 'valor_latao', tipo: 'numero', rotuloKey: 'campoValorLatao', min: 0 },
      { col: 'ocupa',       tipo: 'numero', rotuloKey: 'campoOcupa',      min: 0 },
      { col: 'armazena',    tipo: 'numero', rotuloKey: 'campoArmazena',   min: 0 },
      { col: 'forca_req',   tipo: 'numero', rotuloKey: 'campoForcaReq',   min: 0 },
      { col: 'dano',        tipo: 'numero', rotuloKey: 'campoDano',       min: 0 },
      { col: 'alcance',     tipo: 'numero', rotuloKey: 'campoAlcance',    min: 0 },
      { col: 'defesa',      tipo: 'numero', rotuloKey: 'campoDefesa',     min: 0 },
      { col: 'absorcao',    tipo: 'numero', rotuloKey: 'campoAbsorcao',   min: 0 },
      { col: 'resistencia', tipo: 'numero', rotuloKey: 'campoResistencia', min: 0 },
      { col: 'dano_l', tipo: 'numero', rotuloKey: 'campoDanoL', min: 0 },
      { col: 'dano_m', tipo: 'numero', rotuloKey: 'campoDanoM', min: 0 },
      { col: 'dano_p', tipo: 'numero', rotuloKey: 'campoDanoP', min: 0 },
      { col: 'nivel_magia', tipo: 'numero', rotuloKey: 'campoNivelMagia', min: 0 },
      { col: 'consumiveis',       tipo: 'numero', rotuloKey: 'campoConsumiveis',      min: 0 },
      { col: 'consumiveis_peso',  tipo: 'numero', rotuloKey: 'campoConsumiveisPeso',  min: 0 },
      /* SOMENTE LEITURA, e não é preferência — é o banco.
         itens.magico é coluna GERADA:
           magico boolean GENERATED ALWAYS AS (magia IS NOT NULL AND magia <> '')
         O Postgres recusa qualquer UPDATE que a mencione, com
         "column magico can only be updated to DEFAULT". O editor a mandava no
         payload de TODA edição de item, então NENHUM item salvava — o erro
         que o usuário reportou em 11/09/2026.
         O valor se resolve sozinho a partir de `magia`: preencheu, é mágico. */
      { col: 'magico', tipo: 'opcoes', rotuloKey: 'campoMagico',
        opcoes: ['Sim', 'Não'], somenteLeitura: true },
      { col: 'magia',  tipo: 'texto',  rotuloKey: 'campoMagia' },
      // Mesmo AJUSTE_KEY de 01-core/inventario-helpers.jsx.
      { col: 'ajuste_atributo', tipo: 'opcoes', rotuloKey: 'campoAjusteAtributo', opcoes: ['AGI', 'AUR', 'FOR', 'PER'] },
      { col: 'grupo_armas',   tipo: 'opcoes', rotuloKey: 'campoArmas',        opcoes: OPCOES_GRUPO_ARMAS },
      /* Sigla no banco, palavra na tela — mesmo tratamento de `tipo`.
         NÃO usa OPCOES_GRUPO_ARMADURAS (que tem 'Livre'): 'Livre' faz sentido
         em tecnicas.grupo_armaduras, onde significa "serve com qualquer
         armadura", e nenhum sentido aqui, onde a coluna diz QUE armadura a
         peça É. */
      { col: 'tipo_armadura', tipo: 'opcoes', rotuloKey: 'campoTipoArmadura',
        opcoes: [{ value: 'L', label: 'Leve' },
                 { value: 'M', label: 'Médio' },
                 { value: 'P', label: 'Pesado' }] },
      { col: 'categoria_equip',    tipo: 'texto', rotuloKey: 'campoCategoriaEquip' },
      { col: 'slot_equip',         tipo: 'texto', rotuloKey: 'campoSlotEquip' },
      { col: 'grupo_equipamento',  tipo: 'texto', rotuloKey: 'campoGrupoEquipamento' },
      { col: 'maos_pequenino', tipo: 'numero', rotuloKey: 'campoMaosPequenino', min: 0, max: 2 },
      { col: 'maos_anao',      tipo: 'numero', rotuloKey: 'campoMaosAnao',      min: 0, max: 2 },
      { col: 'maos_outras',    tipo: 'numero', rotuloKey: 'campoMaosOutras',    min: 0, max: 2 },
    ],
  },
};

// Lookup tolerante: tabela sem descritor devolve null e o chamador esconde o
// controle de edição, em vez de quebrar.
function descritorDe(tabela) {
  if (!tabela || typeof tabela !== 'string') return null;
  return CATALOGO_DESCRITORES[tabela] || null;
}

/* ── As opções de um campo, sempre como { value, label } ───────────
   Até 11/09/2026 `opcoes` era só uma lista de strings, e o editor mapeava
   `{ value: o, label: o }` — o rótulo IA PARA O BANCO. Isso impede mostrar
   "Sólido" e gravar "S", que é o que itens.tipo e itens.tipo_armadura pedem
   (as colunas guardam sigla de um caractere).

   A lista passa a aceitar as duas formas, e normalizar num lugar só evita que
   cada consumidor precise saber disso. String continua valendo exatamente
   como antes — valor igual ao rótulo —, então os descritores que não mudaram
   não mudam de comportamento. */
function opcoesNormalizadas(campo) {
  const lista = (campo && campo.opcoes) || [];
  return lista.map((o) => (
    (o && typeof o === 'object') ? { value: o.value, label: o.label } : { value: o, label: o }
  ));
}

Object.assign(window, { CATALOGO_DESCRITORES, descritorDe, opcoesNormalizadas });
