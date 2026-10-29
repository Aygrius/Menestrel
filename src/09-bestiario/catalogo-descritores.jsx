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
// Sigla no banco, palavra na tela (26/09/2026: "'L' vira 'Armaduras leves'").
const OPCOES_GRUPO_ARMADURAS = ['Livre', { value: 'L', label: 'Armaduras leves' },
  { value: 'M', label: 'Armaduras médias' }, { value: 'P', label: 'Armaduras pesadas' }];
/* Listas fechadas do editor de magias (26/09/2026, pedido do usuário). */
const OPCOES_TIPO_MAGIA = ['Básica', 'Perdida', 'Ancestral'];
const RODADAS_MAGIA = ['1 rodada', '2 rodadas', '3 rodadas', '4 rodadas', '5 rodadas',
  '10 rodadas', '15 rodadas', '30 rodadas'];
const OPCOES_EVOCACAO = ['Instantânea', ...RODADAS_MAGIA, 'Ritual'];
const OPCOES_ALCANCE = ['Pessoal', 'Toque', '2 metros', '5 metros', '10 metros', '15 metros',
  '20 metros', '50 metros', '100 metros', '1 quilômetro'];
const OPCOES_DURACAO = ['Variável', 'Instantânea', ...RODADAS_MAGIA];

/* Raças e reinos do GAME_DATA — vantagem/desvantagem das habilidades.
   SEM AS FORMAS (26/10/2026): Vampiro e Lobisomem estão em GAME_DATA.racas
   para a ficha saber calculá-los, mas uma habilidade com vantagem "para
   Vampiro" não é vantagem de raça — é de estado. `racasJogaveis` é o mesmo
   filtro que o wizard de personagem usa; o recuo vale para quem monte este
   módulo sem a fase 01-core/forma-raca carregada. */
const OPCOES_RACA_REINO = (typeof GAME_DATA !== 'undefined')
  ? [...((typeof window !== 'undefined' && window.racasJogaveis)
      ? window.racasJogaveis() : Object.keys(GAME_DATA.racas || {})),
    ...(GAME_DATA.reinos || [])] : [];

// Tipo da técnica (22/10/2026), no lugar da permissão — ver categoriaTecnica.
const OPCOES_TIPO_TECNICA = ['Básica', 'Especializada'];
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
      { col: 'tipo',  tipo: 'opcoes', rotuloKey: 'campoTipo',  opcoes: OPCOES_TIPO_TECNICA },
      { col: 'uso',   tipo: 'opcoes', rotuloKey: 'campoUso',   opcoes: ['Único', 'Intermitente', 'Livre'] },
      { col: 'ajuste',          tipo: 'opcoes', rotuloKey: 'campoAjuste',    opcoes: OPCOES_ATRIBUTO },
      /* VÁRIOS grupos (26/09/2026: "no modal de editar técnicas, deve ser
         possível selecionar mais de um grupo de arma"). O banco já guardava
         "PL, PM, PP" — o dropdown de escolha única mostrava um e, ao salvar,
         apagava os outros. "Livre" (serve com qualquer arma) é exclusivo. */
      /* Armas e armaduras NA MESMA LINHA (26/09/2026) — `largura: 'meia'`. */
      { col: 'grupo_armas',     tipo: 'multiopcoes', rotuloKey: 'campoArmas', opcoes: OPCOES_GRUPO_ARMAS, exclusiva: 'Livre', largura: 'meia' },
      { col: 'grupo_armaduras', tipo: 'opcoes', rotuloKey: 'campoArmaduras', opcoes: OPCOES_GRUPO_ARMADURAS, largura: 'meia' },
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
      /* Vantagem e Desvantagem: seletor de Raça e Reino (26/09/2026, pedido do
         usuário). Grava a mesma CSV de antes ("Anão, Portis"), que é o que
         calcBonusHabilidadesRacaReino lê. Valor antigo fora da lista (há
         profissões gravadas, que nunca deram bônus) aparece marcado. */
      { col: 'vantagem',    tipo: 'multiopcoes', rotuloKey: 'campoVantagem',    opcoes: OPCOES_RACA_REINO, largura: 'meia' },
      { col: 'desvantagem', tipo: 'multiopcoes', rotuloKey: 'campoDesvantagem', opcoes: OPCOES_RACA_REINO, largura: 'meia' },
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
      /* Tipo, Evocação, Alcance, Duração e Custo viraram DROPDOWN (26/09/2026),
         com as listas do usuário. Valor já gravado fora da lista ("Pessoal",
         "Ritual", "1 hora"…) não se perde: o editor o mostra como primeira
         opção, marcado "fora da lista" (ver CatalogoCampo, tipo 'opcoes'). */
      { col: 'tipo',     tipo: 'opcoes', rotuloKey: 'campoTipo', opcoes: OPCOES_TIPO_MAGIA },
      // Classe (22/10/2026): Feitiço (arcana), Milagre (divina), Encanto (artística), Transmutação (espiritual).
      { col: 'classe',   tipo: 'opcoes', rotuloKey: 'campoClasse', obrigatorio: true, opcoes: ['Feitiço', 'Milagre', 'Encanto', 'Transmutação'] },
      { col: 'evocacao', tipo: 'opcoes', rotuloKey: 'campoEvocacao', opcoes: OPCOES_EVOCACAO },
      { col: 'alcance',  tipo: 'opcoes', rotuloKey: 'campoAlcance', opcoes: OPCOES_ALCANCE },
      { col: 'duracao',  tipo: 'opcoes', rotuloKey: 'campoDuracao', opcoes: OPCOES_DURACAO },
      // custo é texto no banco; as opções são as strings '1'…'4'.
      { col: 'custo',     tipo: 'opcoes', rotuloKey: 'campoCusto', opcoes: ['1', '2', '3', '4'] },
      /* Dano saiu do editor em 29/09/2026 ("Eu quero que você remova este
         campo"): o dano vem do texto de cada nível (efeitosNoNivel). A coluna
         segue no banco e o motor ainda a lê como reserva — danoMagiaNoNivel. */
      /* Permissão saiu das magias em 22/10/2026: qualquer profissão aprende
         pelo item (livro ou pergaminho). Técnicas continuam com a delas. */
      /* Itens do ritual (26/09/2026): "fica em um input próprio, com dropdown
         para selecionar quais itens do catálogo". Era a última frase da
         descrição — ver scripts/sql/magias-itens-necessarios-2026-09-26.sql.
         Grava "Vela (7), Hidromel (1)"; `quantidade` põe o (n) em cada um.
         Logo abaixo de Permissão desde 26/09/2026. */
      // Só em Ritual (22/10/2026): "O campo 'itens necessários' da magia só aparece quando ela é do tipo ritual."
      { col: 'itens_necessarios', tipo: 'lista', rotuloKey: 'campoItensNecessarios', fonte: 'itens', quantidade: true,
        quando: { col: 'evocacao', valor: 'Ritual' } },
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
      /* ⚠️ SUBTIPO É ESPÉCIE, não elemento (levantado em 18/09/2026). A lista
         fechada aqui declarava elementos e os dados nunca a obedeceram: das
         ~218 criaturas, ~147 guardavam espécie (Cavalo, Goblin, Esqueleto,
         Gárgula…) e só 15 um elemento. O elemento ganhou COLUNA PRÓPRIA
         (`elemento`, logo abaixo) e aqueles 15 valores mudaram de lugar —
         ver scripts/sql/criaturas-elemento-2026-09-18.sql.
         Sem `opcoes`: espécie é texto livre, e uma lista fechada aqui foi
         justamente o que produziu a confusão. */
      { col: 'subtipo',  tipo: 'texto', rotuloKey: 'campoSubtipo' },
      /* UMA LINHA SÓ (25/09/2026): "Nome, Subtipo, Estágio, Montaria, Peso e
         Altura devem ficar inline, sendo Estágio, Montaria, Peso e Altura,
         inputs menores." `largura: 'curta'` = meia coluna da grade do editor
         (.catalogo-campo-curto, catalogo-editor.jsx). */
      { col: 'estagio', tipo: 'numero', rotuloKey: 'campoEstagio', min: 1, max: 60, largura: 'curta' },
      /* Montaria (14/09/2026): "uma nova característica das criaturas". É
         boolean no banco; `booleano` faz o editor mostrar Sim/Não e gravar
         true/false (linhaParaForm e salvar, catalogo-editor.jsx). A batalha
         (ehMontaria) e o inventário (botão Montar no animal) leem daqui. */
      { col: 'montaria', tipo: 'opcoes', rotuloKey: 'campoMontaria',
        opcoes: ['Sim', 'Não'], booleano: true, largura: 'curta' },
      { col: 'peso',    tipo: 'numero', rotuloKey: 'campoPeso',    min: 0, largura: 'curta' },
      /* Altura (17/09/2026): a ficha do bestiário passou a listá-la em
         Características, e a coluna não existia — ver
         scripts/sql/criaturas-altura-2026-09-17.sql. Em METROS, com casas
         decimais (0,80 da Águia), por isso `passo`: um campo de inteiros
         arredondaria toda criatura pequena para 0 ou 1. Nasce vazia nas ~200
         criaturas do catálogo e a ficha mostra "—" até alguém preencher. */
      { col: 'altura',  tipo: 'numero', rotuloKey: 'campoAltura',  min: 0, passo: 0.01, largura: 'curta' },
      /* NOME · SUBTIPO · ESTÁGIO NA MESMA LINHA (25/09/2026): desde que o Tipo
         virou fileira de botões (largura cheia) ele partia a primeira linha;
         agora vem logo depois dela.

         `botoes` (25/09/2026): "transforme o plano, tipo, grupo e atributos
         como você fez com elemento. As opções viram botões seletores." Uma
         escolha só, como antes — muda a forma, não a regra.

         MENOS TIPOS (25/09/2026): "Gigante vai virar Civilizado. Construído e
         Monstro vão virar Místico." As criaturas foram migradas no banco —
         ver scripts/sql/criaturas-tipos-intelecto-2026-09-25.sql. */
      /* DROPDOWN DE MÚLTIPLA ESCOLHA (26/09/2026): "use dropdown menu, dando
         opção de selecionar mais de um campo nas criaturas" — Classe, Plano e
         Grupo, decididos pelo usuário no mesmo dia. Grava "Místico, Dragão"
         na mesma coluna de texto; valor antigo de um só segue válido. Quem lê
         a classe (submenu, ícone do token, item Animal) separa pela vírgula. */
      /* Classe, Plano, Elemento e Grupo NA MESMA LINHA (26/09/2026) — `largura:
         'quarto'`, um quarto da linha cada. */
      { col: 'tipo',     tipo: 'multiopcoes', rotuloKey: 'campoTipo', largura: 'quarto',
        opcoes: ['Animal', 'Celestial', 'Infernal', 'Místico', 'Dragão',
                 'Elemental', 'Morto', 'Civilizado'] },
      { col: 'plano',    tipo: 'multiopcoes', rotuloKey: 'campoPlano', largura: 'quarto',
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
      /* Luz e Escuridão entraram em 25/09/2026 (pedido do usuário), e no
         mesmo dia o campo virou MÚLTIPLA escolha: "permita selecionar mais de
         uma opção". Grava na mesma coluna de texto, separado por vírgula
         ("Fogo, Luz") — valor antigo de um elemento só segue válido. */
      { col: 'elemento', tipo: 'multiopcoes', rotuloKey: 'campoElemento', largura: 'quarto',
        opcoes: ['Fogo', 'Ar', 'Água', 'Terra', 'Luz', 'Escuridão'] },
      { col: 'coletivo', tipo: 'multiopcoes', rotuloKey: 'campoColetivo', largura: 'quarto',
        opcoes: ['Grupo Grande', 'Grupo Médio', 'Grupo Pequeno', 'Solitário'] },
      /* ATRIBUTOS (25/09/2026): "os atributos podem variar entre -2 e 8 (no
         caso das criaturas)". `escala` = [mín, máx]: desde 26/09/2026 o
         editor desenha um DROPDOWN com os valores (eram botões redondos). intelecto é TEXT no banco, diferente dos outros
         seis — o editor grava texto nele, número nos demais. */
      { col: 'intelecto', tipo: 'texto',  rotuloKey: 'campoIntelecto', escala: [-2, 8] },
      { col: 'aura',       tipo: 'numero', rotuloKey: 'campoAura',       min: -2, max: 8, escala: [-2, 8] },
      { col: 'carisma',    tipo: 'numero', rotuloKey: 'campoCarisma',    min: -2, max: 8, escala: [-2, 8] },
      { col: 'forca',      tipo: 'numero', rotuloKey: 'campoForca',      min: -2, max: 8, escala: [-2, 8] },
      { col: 'fisico',     tipo: 'numero', rotuloKey: 'campoFisico',     min: -2, max: 8, escala: [-2, 8] },
      { col: 'agilidade',  tipo: 'numero', rotuloKey: 'campoAgilidade',  min: -2, max: 8, escala: [-2, 8] },
      { col: 'percepcao',  tipo: 'numero', rotuloKey: 'campoPercepcao',  min: -2, max: 8, escala: [-2, 8] },
      { col: 'descricao', tipo: 'area', rotuloKey: 'campoDescricao', linhas: 3 },
      /* Armas e armaduras do catálogo de itens (14/09/2026). É delas que saem
         Ataque, L/M/P, Dano 100%, Absorção, Defesa e Tipo de Armadura — ver
         derivadosDoEquipamento em criatura-formulas.jsx. As armas naturais
         (Presas, Garras…) são itens do catálogo como as outras. */
      /* Dois campos na MESMA coluna desde 25/09/2026: "Adicione um novo campo
         abaixo de equipamento, que vai se chamar Ataque, para englobar as
         armas de ataque. E em Equipamento ficará apenas os demais itens."
         `parte` diz o que cada um mostra e aceita — ver partesDoEquipamento e
         slotParaPeca em criatura-formulas.jsx. */
      { col: 'equipamento', tipo: 'equipamento', parte: 'itens',  rotuloKey: 'campoEquipamento' },
      { col: 'equipamento', tipo: 'equipamento', parte: 'ataque', rotuloKey: 'campoArmasAtaque' },
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
    /* CAMPOS POR GRUPO (26/09/2026): "cada tipo de item possui seus campos
       próprios. Ou seja, um item tipo 'consumíveis' não precisa mostrar no
       modal de editar campos tipo 'dano'." Campo com `grupos` só aparece
       para esses grupos; sem `grupos`, em todos. O mapa saiu do próprio
       catálogo (quais colunas cada grupo preenche, conferido no banco no mesmo
       dia). Valor já gravado aparece mesmo fora do grupo — nada some da tela
       sem alguém ver (ver campoDoGrupo em catalogo-editor.jsx).

       ORDEM (23/10/2026, "reajuste a ordem dos campos"): quem o item é (nome,
       grupo, origem, ícone) → valor e espaço → arma → armadura → como se
       equipa → magia → efeitos → vínculos → a descrição, por último (decisão
       anterior do usuário, guardada em catalogo-descritores.test.js). */
    campos: [
      { col: 'slug', tipo: 'texto', rotuloKey: 'campoSlug', obrigatorio: true, somenteNovo: true, autoDeNome: true },
      { col: 'nome', tipo: 'texto', rotuloKey: 'campoNome', obrigatorio: true },
      { col: 'grupo', tipo: 'opcoes', rotuloKey: 'campoGrupo',
        opcoes: ['Animais', 'Armaduras', 'Armas', 'Consumíveis', 'Diario', 'Instrumentos', 'Itens',
          'Minerais', 'Moedas', 'Propriedades', 'Recipientes', 'Serviços', 'Transportes', 'Vestimentas'] },
      // Os três valores vêm de um SELECT DISTINCT em 11/09/2026: Comum 489,
      // Raro 105, Mágico 78. Os 75 vazios foram preenchidos com Comum pelo
      // script scripts/sql/itens-origem-tipo-armadura-fix.sql. "Alquímico" entrou
      // em 28/09/2026, com os frascos (scripts/sql/frascos-amuletos-venenos-2026-09-28.sql).
      { col: 'origem',    tipo: 'opcoes', rotuloKey: 'campoOrigem',
        opcoes: ['Comum', 'Raro', 'Mágico', 'Alquímico'] },
      /* A BASE do item (26/10/2026, pedido do usuário): "existe a base do
         item, por exemplo 'Máscara de Ouro', e existe o exemplar do item,
         'Máscara Decorativa', 'Máscara Verrogari' — ou seja, as duas podem
         ser uma 'Máscara de Ouro'. Isso vale para todos os itens."

         O NOME é o exemplar; a base é o que ele é. É ela que escolhe a
         pintura e que a ficha do item mostra em uma frase. As opções saem de
         opcoesDeBase (01-core/bases-item.jsx), filtradas pela região do item
         quando ele é vestível e pelo grupo do catálogo quando não é — por
         isso `opcoesDe`, e não uma lista fixa.

         ARMA é o caso em que a lista tem UMA opção: "o arco também é uma arma,
         então a base é a mesma, a diferença é o grupo de armas" (usuário,
         26/10/2026). A base dela é a classe de peso tirada da sigla do grupo
         (baseDaArma), então não há o que escolher — mudar o Grupo de Armas
         muda a base. */
      { col: 'base', tipo: 'opcoes', rotuloKey: 'campoBase',
        opcoesDe: (linha) => (typeof window !== 'undefined' && window.opcoesDeBase
          ? window.opcoesDeBase(linha) : []) },
      /* O banco só aceita "ti-nome" (itens_icone_formato_chk: ^ti-[a-z0-9-]+$).
         Texto livre fazia o insert falhar com o erro do Postgres (14/09/2026).
         formato: 'icone' → o editor aceita "ti-paw", "ti ti-paw", o <i> colado
         do site do Tabler ou só "paw", grava "ti-paw" e mostra a prévia. */
      { col: 'icone',     tipo: 'texto', rotuloKey: 'campoIcone', formato: 'icone' },
      { col: 'valor_latao', tipo: 'numero', rotuloKey: 'campoValorLatao', min: 0 },
      { col: 'ocupa', grupos: ['Armas', 'Armaduras', 'Vestimentas', 'Consumíveis', 'Instrumentos', 'Itens', 'Minerais', 'Moedas', 'Recipientes', 'Diario'],       tipo: 'numero', rotuloKey: 'campoOcupa',      min: 0 },
      // O banco guarda a SIGLA (S/L); a tela mostra a palavra. Ver
      // opcoesNormalizadas no fim do arquivo.
      { col: 'tipo',      tipo: 'opcoes', rotuloKey: 'campoTipo',
        opcoes: [{ value: 'S', label: 'Sólido' }, { value: 'L', label: 'Líquido' }] },
      { col: 'armazena', grupos: ['Vestimentas', 'Itens', 'Propriedades', 'Recipientes', 'Transportes'],    tipo: 'numero', rotuloKey: 'campoArmazena',   min: 0 },
      /* O PORTE do recipiente (29/10/2026, usuário: "vamos definir 4 tipos de
         quantidades de slots para os itens: pequenos 3, médios 6, grandes 9,
         muito grandes 15"). Ele diz quantas CASAS o recipiente mostra; o
         `armazena` acima continua sendo o PESO, e o que estourar primeiro
         trava. Vazio, o porte sai da escada de peso (porteDoRecipiente,
         01-core) — então nenhum recipiente antigo fica sem casas. */
      { col: 'porte', grupos: ['Vestimentas', 'Itens', 'Propriedades', 'Recipientes', 'Transportes'],
        tipo: 'opcoes', rotuloKey: 'campoPorte', largura: 'meia',
        opcoes: [
          { value: 'pequeno',      label: 'Pequeno — 3 casas' },
          { value: 'medio',        label: 'Médio — 6 casas' },
          { value: 'grande',       label: 'Grande — 9 casas' },
          { value: 'muito_grande', label: 'Muito grande — 15 casas' },
          { value: 'colossal',     label: 'Colossal — 30 casas' },
        ] },
      /* O que o recipiente (ou a vestimenta com bolso) ACEITA guardar — virou
         LISTA em 27/09/2026 ("'tipo de item' deve permitir selecionar
         consumíveis"). Era texto livre: tinha que se digitar "Consumíveis"
         exatamente, com acento, para a regra de recipientePodeGuardar casar.
         As opções são os grupos do catálogo; vazio = aceita qualquer um.
         MAIS DE UM desde 27/09/2026 ("deve permitir selecionar até mais de um
         tipo de item"): "Consumíveis, Moedas", pela vírgula, como os outros
         campos multiopcoes. A regra lê a lista (tiposAceitos, 01-core). */
      { col: 'tipo_item', grupos: ['Recipientes', 'Vestimentas'], tipo: 'multiopcoes', rotuloKey: 'campoTipoItem',
        opcoes: ['Animais', 'Armaduras', 'Armas', 'Consumíveis', 'Diario', 'Instrumentos', 'Itens',
          'Minerais', 'Moedas', 'Propriedades', 'Recipientes', 'Serviços', 'Transportes', 'Vestimentas'] },
      { col: 'dano', grupos: ['Armas'],        tipo: 'numero', rotuloKey: 'campoDano',       min: 0 },
      { col: 'alcance', grupos: ['Armas'],     tipo: 'numero', rotuloKey: 'campoAlcance',    min: 0 },
      // Mesmo AJUSTE_KEY de 01-core/inventario-helpers.jsx (FIS desde 14/09/2026,
      // com as armas naturais). Sigla no banco, nome na tela.
      { col: 'ajuste_atributo', grupos: ['Armas'], tipo: 'opcoes', rotuloKey: 'campoAjusteAtributo',
        opcoes: [{ value: 'AGI', label: 'Agilidade' }, { value: 'AUR', label: 'Aura' },
                 { value: 'FIS', label: 'Físico' }, { value: 'FOR', label: 'Força' },
                 { value: 'PER', label: 'Percepção' }] },
      { col: 'grupo_armas', grupos: ['Armas'],   tipo: 'opcoes', rotuloKey: 'campoArmas',        opcoes: OPCOES_GRUPO_ARMAS },
      { col: 'dano_l', grupos: ['Armas'], tipo: 'numero', rotuloKey: 'campoDanoL', min: 0 },
      { col: 'dano_m', grupos: ['Armas'], tipo: 'numero', rotuloKey: 'campoDanoM', min: 0 },
      { col: 'dano_p', grupos: ['Armas'], tipo: 'numero', rotuloKey: 'campoDanoP', min: 0 },
      { col: 'forca_req', grupos: ['Armas', 'Armaduras'],   tipo: 'numero', rotuloKey: 'campoForcaReq',   min: 0 },
      { col: 'defesa', grupos: ['Armaduras'],      tipo: 'numero', rotuloKey: 'campoDefesa',     min: 0 },
      { col: 'absorcao', grupos: ['Armaduras'],    tipo: 'numero', rotuloKey: 'campoAbsorcao',   min: 0 },
      /* Sigla no banco, palavra na tela — mesmo tratamento de `tipo`.
         NÃO usa OPCOES_GRUPO_ARMADURAS (que tem 'Livre'): 'Livre' faz sentido
         em tecnicas.grupo_armaduras, onde significa "serve com qualquer
         armadura", e nenhum sentido aqui, onde a coluna diz QUE armadura a
         peça É. */
      { col: 'tipo_armadura', grupos: ['Armas', 'Armaduras'], tipo: 'opcoes', rotuloKey: 'campoTipoArmadura',
        opcoes: [{ value: 'L', label: 'Leve' },
                 { value: 'M', label: 'Médio' },
                 { value: 'P', label: 'Pesado' }] },
      /* Listas fechadas iguais às CHECK do banco (itens_categoria_equip_chk e
         itens_slot_equip_chk) — eram texto livre e qualquer outro valor
         derrubava o salvar. Sigla no banco, palavra na tela. */
      { col: 'categoria_equip', grupos: ['Armas', 'Armaduras'],    tipo: 'opcoes', rotuloKey: 'campoCategoriaEquip',
        opcoes: [{ value: 'arma', label: 'Arma' }, { value: 'escudo', label: 'Escudo' },
                 { value: 'armadura', label: 'Armadura' }] },
      /* AS 17 REGIÕES, E NÃO O VOCABULÁRIO ANTIGO (29/10/2026) ──────────────
         A migração de 26/10 (scripts/sql/slots-e-status-2026-10-26.sql) trocou
         os nomes no catálogo: `maos`→`mao`, `peito`→`dorso`, `corpo`→`peito`,
         `bracos`→`braco`, e entraram `rosto`, `pulso`, `canela` e `alforje`.
         Medido no banco em 29/10: dos 216 itens com slot, 204 estão numa
         região que esta lista não oferecia — apareciam como "(fora da lista)"
         e o Mestre não tinha como escolher nenhuma delas. Pior, as únicas
         escolhas possíveis eram os nomes que a migração acabou de remover: um
         item editado voltava ao vocabulário velho.

         A `itens_slot_equip_chk` ainda ACEITA os oito nomes antigos — é a
         transição que deixa as instâncias já gravadas validarem —, mas a lista
         da tela é só o lado canônico: a CHECK diz o que o banco tolera, o
         dropdown diz o que se deve escrever. Ordem da cabeça aos pés, a mesma
         de REGIOES_EQUIP (01-core/inventario-helpers.jsx); os rótulos são os
         de SLOT_LABELS, para o editor e a ficha chamarem a casa pelo mesmo
         nome. */
      { col: 'slot_equip', grupos: ['Armas', 'Armaduras', 'Vestimentas', 'Instrumentos'],         tipo: 'opcoes', rotuloKey: 'campoSlotEquip',
        opcoes: [{ value: 'cabeca', label: 'Cabeça' }, { value: 'orelha', label: 'Orelha' },
                 { value: 'rosto', label: 'Rosto' }, { value: 'pescoco', label: 'Pescoço' },
                 { value: 'ombro', label: 'Ombro' }, { value: 'costas', label: 'Costas' },
                 { value: 'dorso', label: 'Dorso' }, { value: 'peito', label: 'Peito' },
                 { value: 'braco', label: 'Braço' }, { value: 'dedo', label: 'Dedo' },
                 { value: 'pulso', label: 'Pulso' }, { value: 'mao', label: 'Mão' },
                 { value: 'perna', label: 'Perna' }, { value: 'cintura', label: 'Cintura' },
                 { value: 'canela', label: 'Canela' }, { value: 'pe', label: 'Pé' },
                 { value: 'alforje', label: 'Alforje' }] },
      { col: 'resistencia', grupos: ['Armas', 'Armaduras', 'Vestimentas'], tipo: 'numero', rotuloKey: 'campoResistencia', min: 0 },
      { col: 'maos_pequenino', grupos: ['Armas', 'Armaduras', 'Instrumentos'], tipo: 'numero', rotuloKey: 'campoMaosPequenino', min: 0, max: 2 },
      { col: 'maos_anao', grupos: ['Armas', 'Armaduras', 'Instrumentos'],      tipo: 'numero', rotuloKey: 'campoMaosAnao',      min: 0, max: 2 },
      { col: 'maos_outras', grupos: ['Armas', 'Armaduras', 'Instrumentos'],    tipo: 'numero', rotuloKey: 'campoMaosOutras',    min: 0, max: 2 },
      /* DROPDOWN com as magias do sistema (28/09/2026: "no campo magia, mostrar
         um dropdown com as magias do sistema"). O banco guarda o NOME da magia
         (magiaDoItem casa pelo nome); a lista vem da tabela `fonte` quando o
         editor abre e entra depois do "nenhuma" daqui. */
      { col: 'magia',  tipo: 'opcoes', rotuloKey: 'campoMagia', fonte: 'magias', comNivel: 'nivel_magia',
        opcoes: [{ value: '', label: '—' }] },
      /* Fora da tela desde 23/10/2026: o nível vem junto com a magia escolhida
         (campo magia, comNivel). Continua no payload — é o que se grava. */
      { col: 'nivel_magia', tipo: 'numero', rotuloKey: 'campoNivelMagia', min: 0, oculto: true },
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
      /* Técnica que o pergaminho ensina (22/10/2026): mesmo molde do campo
         Magia — o banco guarda o NOME; só os Consumíveis (pergaminhos). */
      { col: 'tecnica', tipo: 'opcoes', rotuloKey: 'campoTecnica', fonte: 'tecnicas',
        grupos: ['Consumíveis'], opcoes: [{ value: '', label: '—' }] },
      /* Livro → pergaminhos (22/10/2026): "Dentro desses livros, estarão
         vinculadas os itens para aprendizado das magias". Não é coluna de
         itens: vive em livro_pergaminhos, e o editor grava depois de salvar. */
      { col: 'pergaminhos_do_livro', tipo: 'vinculo', rotuloKey: 'campoPergaminhosLivro', semColuna: true,
        grupos: ['Itens'],
        vinculo: { tabela: 'livro_pergaminhos', dono: 'livro_slug', alvo: 'pergaminho_slug', prefixo: 'pergaminho_' } },
      /* 'efeito' SAIU dos itens em 25/09/2026: vazio nos 1003 itens, e nenhuma
         regra o lia — o que o jogo aplica é efeito_positivo/efeito_negativo.
         A coluna segue no banco, vazia. */
      /* A GRADE DE EFEITOS (26/10/2026, pedido do usuário: "quando for
         consumível, adicione um campo para cada campo que aquele item
         consumível pode alterar [...] um valor positivo ou negativo").
         `semColuna`: ela não é coluna nenhuma — escreve nas duas prosas
         abaixo, que continuam sendo o armazenamento. Ver efeitosEmNumeros /
         efeitosParaTexto (01-core/inventario-helpers.jsx). */
      { col: '__efeitos', grupos: ['Consumíveis'], tipo: 'efeitos', semColuna: true, rotuloKey: 'campoEfeitos' },
      { col: 'efeito_positivo', grupos: ['Consumíveis', 'Serviços', 'Vestimentas', 'Itens'], tipo: 'area', rotuloKey: 'campoEfeitoPositivo',  linhas: 2 },
      { col: 'efeito_negativo', grupos: ['Consumíveis', 'Serviços', 'Vestimentas', 'Itens'], tipo: 'area', rotuloKey: 'campoEfeitoNegativo',  linhas: 2 },
      /* 'consumiveis' e 'consumiveis_peso' SAÍRAM em 28/09/2026: a carne do
         abate sai do tipo e do peso da CRIATURA ligada (RPC abater_animal) —
         "não precisa de um dropdown para isso, a conversão é automática". As
         colunas seguem no banco, sem uso. */
      /* Vínculo com a criatura (14/09/2026). O animal à venda É a criatura do
         bestiário: as características (montaria inclusive) ficam SÓ nela e o
         item herda por aqui. scripts/sql/itens-criatura-vinculo-2026-09-14.sql */
      { col: 'criatura_id', grupos: ['Animais'], tipo: 'referencia', rotuloKey: 'campoCriatura', fonte: 'criaturas' },
      { col: 'doc_url', grupos: ['Itens', 'Diario'],   tipo: 'texto', rotuloKey: 'campoDocUrl' },
      // A descrição fica POR ÚLTIMO no editor de itens (26/09/2026).
      { col: 'descricao', tipo: 'area', rotuloKey: 'campoDescricao', linhas: 3 },
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
    // `recuo`: especialização abaixo da profissão, na lista de permissão (26/09/2026).
    (o && typeof o === 'object') ? { value: o.value, label: o.label, ...(o.recuo ? { recuo: true } : {}) } : { value: o, label: o }
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
