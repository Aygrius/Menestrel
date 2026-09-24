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
/* Chave no banco ('agilidade'), nome na tela ('Agilidade') — 14/09/2026: "No
   input 'ajuste', deve mostrar o atributo com a primeira letra maiúscula."
   O nome vem de ATRIBUTOS_LABEL (game-data.jsx), com acento: Força, Físico,
   Percepção. */
const OPCOES_ATRIBUTO = (typeof ATRIBUTOS_KEYS !== 'undefined')
  ? ATRIBUTOS_KEYS.map((k) => ({
      value: k,
      label: (typeof ATRIBUTOS_LABEL !== 'undefined' && ATRIBUTOS_LABEL[k]) || (k.charAt(0).toUpperCase() + k.slice(1)),
    }))
  : [];

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
      /* nivel_inicial saiu do formulário em 14/09/2026 (pedido do usuário). A
         coluna fica no banco com default 0 — é o valor das 42 habilidades — e o
         criador de personagem continua lendo (h.nivel_inicial ?? 0). */
      { col: 'vantagem',    tipo: 'area', rotuloKey: 'campoVantagem',    linhas: 2 },
      { col: 'desvantagem', tipo: 'area', rotuloKey: 'campoDesvantagem', linhas: 2 },
      // restricao também saiu do formulário (14/09/2026, pedido do usuário); a
      // coluna fica no banco, e campo fora do descritor nunca vai no payload.
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
    /* Ordem de 14/09/2026: "'estágio' fica inline com 'nome', 'tipo', etc."
       A grade tem 4 colunas; a descrição (largura cheia) partia a primeira
       linha em Nome · Tipo · Subtipo, e o Estágio caía lá embaixo. Agora a
       primeira linha é Nome · Tipo · Subtipo · Estágio, e o texto livre vem
       depois dos atributos. */
    campos: [
      { col: 'nome',     tipo: 'texto', rotuloKey: 'campoNome', obrigatorio: true },
      /* Tipo, Subtipo e Plano viraram listas fechadas em 14/09/2026 (pedido
         do usuário). Valor gravado que não está na lista (ex.: tipo "Demônio",
         subtipo "Lobo", plano "Astral") continua aparecendo, marcado como fora
         da lista, e só muda se alguém escolher outro — ver CatalogoCampo. */
      { col: 'tipo',     tipo: 'opcoes', rotuloKey: 'campoTipo',
        opcoes: ['Animal', 'Construído', 'Celestial', 'Infernal', 'Místico', 'Dragão',
                 'Elemental', 'Monstro', 'Morto', 'Gigante', 'Civilizado'] },
      /* ⚠️ SUBTIPO É ESPÉCIE, não elemento (levantado em 18/09/2026). A lista
         fechada aqui declarava elementos e os dados nunca a obedeceram: das
         ~218 criaturas, ~147 guardavam espécie (Cavalo, Goblin, Esqueleto,
         Gárgula…) e só 15 um elemento. O elemento ganhou COLUNA PRÓPRIA
         (`elemento`, logo abaixo) e aqueles 15 valores mudaram de lugar —
         ver scripts/sql/criaturas-elemento-2026-09-18.sql.
         Sem `opcoes`: espécie é texto livre, e uma lista fechada aqui foi
         justamente o que produziu a confusão. */
      { col: 'subtipo',  tipo: 'texto', rotuloKey: 'campoSubtipo' },
      { col: 'estagio', tipo: 'numero', rotuloKey: 'campoEstagio', min: 1, max: 60 },
      { col: 'plano',    tipo: 'opcoes', rotuloKey: 'campoPlano',
        opcoes: ['Material', 'Infernal', 'Celestial', 'Elemental'] },
      /* Elemento (18/09/2026). Fica DEPOIS de plano, e não junto de subtipo,
         por causa da grade de 4 colunas do editor: a primeira linha é
         Nome · Tipo · Subtipo · Estágio desde 14/09/2026 ("'estágio' fica
         inline com 'nome', 'tipo', etc."), e enfiar um campo no meio empurrava
         o Estágio para a linha de baixo. Aqui ele fica ao lado de plano, que é
         a outra classificação cosmológica da criatura.

         São os quatro que a ficha do bestiário desenha com ícone (ti-flame,
         ti-tornado, ti-droplet, ti-frustum). Valor fora da lista continua
         aparecendo e cai na palavra, como em qualquer campo de opções. */
      { col: 'elemento', tipo: 'opcoes', rotuloKey: 'campoElemento',
        opcoes: ['Fogo', 'Ar', 'Água', 'Terra'] },
      { col: 'coletivo', tipo: 'opcoes', rotuloKey: 'campoColetivo',
        opcoes: ['Grupo Grande', 'Grupo Médio', 'Grupo Pequeno', 'Solitário'] },
      /* Montaria (14/09/2026): "uma nova característica das criaturas". É
         boolean no banco; `booleano` faz o editor mostrar Sim/Não e gravar
         true/false (linhaParaForm e salvar, catalogo-editor.jsx). A batalha
         (ehMontaria) e o inventário (botão Montar no animal) leem daqui. */
      { col: 'montaria', tipo: 'opcoes', rotuloKey: 'campoMontaria',
        opcoes: ['Sim', 'Não'], booleano: true },
      { col: 'peso',    tipo: 'numero', rotuloKey: 'campoPeso',    min: 0 },
      /* Altura (17/09/2026): a ficha do bestiário passou a listá-la em
         Características, e a coluna não existia — ver
         scripts/sql/criaturas-altura-2026-09-17.sql. Em METROS, com casas
         decimais (0,80 da Águia), por isso `passo`: um campo de inteiros
         arredondaria toda criatura pequena para 0 ou 1. Nasce vazia nas ~200
         criaturas do catálogo e a ficha mostra "—" até alguém preencher. */
      { col: 'altura',  tipo: 'numero', rotuloKey: 'campoAltura',  min: 0, passo: 0.01 },
      // intelecto é TEXT no banco, diferente dos outros seis atributos.
      { col: 'intelecto', tipo: 'texto', rotuloKey: 'campoIntelecto' },
      { col: 'aura',       tipo: 'numero', rotuloKey: 'campoAura',       min: -2, max: 10 },
      { col: 'carisma',    tipo: 'numero', rotuloKey: 'campoCarisma',    min: -2, max: 10 },
      { col: 'forca',      tipo: 'numero', rotuloKey: 'campoForca',      min: -2, max: 10 },
      { col: 'fisico',     tipo: 'numero', rotuloKey: 'campoFisico',     min: -2, max: 10 },
      { col: 'agilidade',  tipo: 'numero', rotuloKey: 'campoAgilidade',  min: -2, max: 10 },
      { col: 'percepcao',  tipo: 'numero', rotuloKey: 'campoPercepcao',  min: -2, max: 10 },
      { col: 'descricao', tipo: 'area', rotuloKey: 'campoDescricao', linhas: 3 },
      /* Armas e armaduras do catálogo de itens (14/09/2026). É delas que saem
         Ataque, L/M/P, Dano 100%, Absorção, Defesa e Tipo de Armadura — ver
         derivadosDoEquipamento em criatura-formulas.jsx. As armas naturais
         (Presas, Garras…) são itens do catálogo como as outras. */
      { col: 'equipamento', tipo: 'equipamento', rotuloKey: 'campoEquipamento' },
      /* Escolhidas na lista do catálogo (13/09/2026): "Quero poder escolher
         quais técnicas, habilidades e magias a criatura possui, escolhendo na
         lista que temos disponíveis." Grava o MESMO texto separado por
         vírgula de antes — batalha (resolverNomesDeMagia) e Diário leem assim.
         `fonte` é a tabela de onde saem os nomes. */
      /* Sem campo de nível (13/09/2026): "O nível das habilidades, técnicas e
         magias é com base no nível e atributos da criatura." Magia conjura no
         estágio (nivelMagiaDeCriatura); `magia_n` fica no banco, sem uso. */
      { col: 'magia',   tipo: 'lista',  rotuloKey: 'campoMagia', fonte: 'magias' },
      { col: 'tecnicas_especiais', tipo: 'lista', rotuloKey: 'campoTecnicasEspeciais', fonte: 'tecnicas' },
      { col: 'habilidades',        tipo: 'lista', rotuloKey: 'campoHabilidades',        fonte: 'habilidades' },
      /* CALCULADOS (14/09/2026) — só leitura, sempre da conta. Antes eram
         sugestões sobrescrevíveis; agora "são calculados automaticamente com
         base nas informações inseridas". `texto`: o valor é texto (o nome da
         arma, a sigla da armadura). `semColuna`: não existe no banco — RF e RM
         a batalha deriva na hora (resistenciasBase); o editor só mostra. */
      { col: 'ataque', tipo: 'derivado', rotuloKey: 'campoAtaque', derivado: true, texto: true },
      { col: 'energia_fisica',  tipo: 'derivado', rotuloKey: 'campoEnergiaFisica',  derivado: true },
      { col: 'energia_heroica', tipo: 'derivado', rotuloKey: 'campoEnergiaHeroica', derivado: true },
      { col: 'resistencia_fisica', tipo: 'derivado', rotuloKey: 'campoResistenciaFisica', derivado: true, semColuna: true },
      { col: 'resistencia_magica', tipo: 'derivado', rotuloKey: 'campoResistenciaMagica', derivado: true, semColuna: true },
      /* Tipo de armadura: a sigla que a batalha lê (siglaArmadura). Sai do
         peitoral equipado; `tipo_armadura` (a coluna irmã, vazia) segue fora. */
      { col: 'armadura', tipo: 'derivado', rotuloKey: 'campoTipoArmadura', derivado: true, texto: true,
        rotulos: { L: 'Leve', M: 'Médio', P: 'Pesado' } },
      { col: 'absorcao', tipo: 'derivado', rotuloKey: 'campoAbsorcao', derivado: true },
      { col: 'defesa',   tipo: 'derivado', rotuloKey: 'campoDefesa',   derivado: true },
      { col: 'velocidade', tipo: 'derivado', rotuloKey: 'campoVelocidade', derivado: true },
      { col: 'dano_l', tipo: 'derivado', rotuloKey: 'campoDanoL', derivado: true },
      { col: 'dano_m', tipo: 'derivado', rotuloKey: 'campoDanoM', derivado: true },
      { col: 'dano_p', tipo: 'derivado', rotuloKey: 'campoDanoP', derivado: true },
      { col: 'dano_100', tipo: 'derivado', rotuloKey: 'campoDano100', derivado: true },
      /* 25/50/75% não aparecem (13/09/2026): "não precisa mostrar dano 75,50,25
         do dano, só 100, é óbvio." Continuam gravados — a batalha os lê. */
      { col: 'dano_25', tipo: 'derivado', rotuloKey: 'campoDano25', derivado: true, oculto: true },
      { col: 'dano_50', tipo: 'derivado', rotuloKey: 'campoDano50', derivado: true, oculto: true },
      { col: 'dano_75', tipo: 'derivado', rotuloKey: 'campoDano75', derivado: true, oculto: true },
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
      /* O banco só aceita "ti-nome" (itens_icone_formato_chk: ^ti-[a-z0-9-]+$).
         Texto livre fazia o insert falhar com o erro do Postgres (14/09/2026).
         formato: 'icone' → o editor aceita "ti-paw", "ti ti-paw", o <i> colado
         do site do Tabler ou só "paw", grava "ti-paw" e mostra a prévia. */
      { col: 'icone',     tipo: 'texto', rotuloKey: 'campoIcone', formato: 'icone' },
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
      /* Vínculo com a criatura (14/09/2026). O animal à venda É a criatura do
         bestiário: as características (montaria inclusive) ficam SÓ nela e o
         item herda por aqui. scripts/sql/itens-criatura-vinculo-2026-09-14.sql */
      { col: 'criatura_id', tipo: 'referencia', rotuloKey: 'campoCriatura', fonte: 'criaturas' },
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
      // Mesmo AJUSTE_KEY de 01-core/inventario-helpers.jsx (FIS desde 14/09/2026,
      // com as armas naturais). Sigla no banco, nome na tela.
      { col: 'ajuste_atributo', tipo: 'opcoes', rotuloKey: 'campoAjusteAtributo',
        opcoes: [{ value: 'AGI', label: 'Agilidade' }, { value: 'AUR', label: 'Aura' },
                 { value: 'FIS', label: 'Físico' }, { value: 'FOR', label: 'Força' },
                 { value: 'PER', label: 'Percepção' }] },
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
      /* Listas fechadas iguais às CHECK do banco (itens_categoria_equip_chk e
         itens_slot_equip_chk) — eram texto livre e qualquer outro valor
         derrubava o salvar. Sigla no banco, palavra na tela. */
      { col: 'categoria_equip',    tipo: 'opcoes', rotuloKey: 'campoCategoriaEquip',
        opcoes: [{ value: 'arma', label: 'Arma' }, { value: 'escudo', label: 'Escudo' },
                 { value: 'armadura', label: 'Armadura' }] },
      { col: 'slot_equip',         tipo: 'opcoes', rotuloKey: 'campoSlotEquip',
        opcoes: [{ value: 'maos', label: 'Mãos' }, { value: 'cabeca', label: 'Cabeça' },
                 { value: 'peito', label: 'Peito' }, { value: 'pernas', label: 'Pernas' },
                 { value: 'pes', label: 'Pés' }, { value: 'ombros', label: 'Ombros' },
                 { value: 'bracos', label: 'Braços' }, { value: 'corpo', label: 'Corpo' },
                 { value: 'costas', label: 'Costas' }, { value: 'cintura', label: 'Cintura' },
                 { value: 'pescoco', label: 'Pescoço' }, { value: 'orelhas', label: 'Orelhas' },
                 { value: 'dedos', label: 'Dedos' }] },
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

/* ── Ícone no formato que o banco aceita (14/09/2026) ──────────────
   itens_icone_formato_chk exige ^ti-[a-z0-9-]+$. Aceita o que o admin
   costuma colar e devolve { valor, valido }:
     ""                          → { valor: null, valido: true }  (sem ícone)
     "ti-paw" / "ti ti-paw"      → "ti-paw"
     '<i class="ti ti-paw"></i>' → "ti-paw"
     "paw" / "Paw Print"         → "ti-paw" / "ti-paw-print"
     "garras!"                   → { valido: false } */
const RE_ICONE = /^ti-[a-z0-9-]+$/;
function normalizarIcone(texto) {
  const bruto = String(texto == null ? '' : texto).trim();
  if (!bruto) return { valor: null, valido: true };
  const achado = bruto.toLowerCase().match(/ti-[a-z0-9-]+/g);
  const escolhido = achado
    ? achado[achado.length - 1]
    : 'ti-' + bruto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, '-');
  const valor = escolhido.replace(/-+$/, '');
  return RE_ICONE.test(valor) ? { valor, valido: true } : { valor: null, valido: false };
}

Object.assign(window, { CATALOGO_DESCRITORES, descritorDe, opcoesNormalizadas, normalizarIcone });
