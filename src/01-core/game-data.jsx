/* ============================================================
   GAME_DATA — Dados estáticos do sistema (Tagmar)
   ============================================================
   Inclui GAME_DATA + constantes derivadas (ATRIBUTOS_KEYS,
   ATRIBUTOS_LABEL, GRUPOS_HABILIDADES_ORDEM, MAGIAS_BASE_POR_PROFISSAO) e TODOS
   os helpers de cálculo intimamente acoplados (calcEstagio,
   calcularFicha, pontosHabilidadesTotal, etc — blocos [09]-[13]).
   ============================================================ */

/* ============================== [08] PERSONAGENS DO JOGADOR — dados estáticos do sistema (Tagmar) ============================== */

const GAME_DATA = {
  racas: {
    // mods aplicados sobre os atributos base; altura em metros
    'Humano':         { mods: { intelecto: 0, aura: 0, carisma: 0, forca: 0, fisico: 0, agilidade: 0, percepcao: 0 }, altura: 1.77 },
    'Meio-Elfo':      { mods: { intelecto: 0, aura: 0, carisma: 1, forca: 0, fisico: -1, agilidade: 1, percepcao: 0 }, altura: 1.68 },
    'Meio-Orc':       { mods: { intelecto: -2, aura: 0, carisma: -2, forca: 2, fisico: 2, agilidade: 0, percepcao: 0 }, altura: 1.89 },
    'Elfo-Florestal': { mods: { intelecto: 0, aura: 0, carisma: 0, forca: -1, fisico: -1, agilidade: 1, percepcao: 2 }, altura: 1.71 },
    'Elfo-Dourado':   { mods: { intelecto: 1, aura: 2, carisma: 0, forca: -2, fisico: -1, agilidade: 0, percepcao: 1 }, altura: 1.63 },
    'Elfo-Sombrio':   { mods: { intelecto: 0, aura: 1, carisma: -1, forca: 0, fisico: -1, agilidade: 1, percepcao: 1 }, altura: 1.65 },
    'Anão':           { mods: { intelecto: 0, aura: -1, carisma: -1, forca: 2, fisico: 2, agilidade: -2, percepcao: 0 }, altura: 1.39 },
    'Pequenino':      { mods: { intelecto: 0, aura: -2, carisma: 1, forca: -2, fisico: 0, agilidade: 2, percepcao: 1 }, altura: 1.14 },
  },

  // SUB-RAÇAS (22/10/2026) — transformações que SUBSTITUEM os ajustes da raça
  // enquanto valem; os pontos comprados ficam. Vampiro é permanente, por
  // vontade do Mestre (coluna personagens.subraca); Lobisomem vem da magia
  // Licantropia Lupina (temporário) ou do Mestre. Ver subracaEfetiva.
  // Ficam FORA de `racas` de propósito: não aparecem no wizard nem entram no
  // teto da equalização racial (bonusPontosRaca).
  subracas: {
    'Vampiro':   { mods: { intelecto: 0, aura: -1, carisma: 1, forca: -1, fisico: -2, agilidade: 2, percepcao: 1 }, altura: 1.77 },
    'Lobisomem': { mods: { intelecto: -2, aura: -2, carisma: -2, forca: 2, fisico: 2, agilidade: 0, percepcao: 2 }, altura: 1.92 },
  },

  reinos: [
    'Abadom', 'Acordo', 'Âmien', 'Azanti', 'Calco', 'Cidades-Estado', 'Conti', 'Dantsen', 'Eredra', 'Filanti', 'Levânia', 'Ludgrim', 'Luna', 'Marana', 'Plana', 'Portis', 'Porto Livre', 'Verrogar',
  ],

  deuses: [
    'Blator', 'Cambu', 'Crezir', 'Crizagom', 'Cruine', 'Ganis', 'Lena', 'Maira', 'Palier', 'Parom', 'Plandis', 'Selimon', 'Sevides',
  ],

  demonios: [
    'Ricutatis', 'Mocna', 'Antredom', 'Diatrimis', 'Ekisis', 'Heldrom', 'Seinoniz', 'Vouxiz', 'Udoviom', 'Anasmadis', 'Branaxis', 'Fulvina',
  ],  

  generos: [
    'Masculino', 'Feminino', 'Neutro'
  ],

  // ----------------------------------------------------------
  // CARACTERIZAÇÃO — traços opcionais de física/social/pessoal, comprados
  // com um pool de "Pontos de Caracterização" (ver pontosCaracterizacaoTotal/
  // gastoCaracterizacao no bloco [15]). Cada categoria tem 2 opções:
  // escolher `opcaoConcede` DEVOLVE pontos ao pool (é a "desvantagem");
  // escolher `opcaoCusta` GASTA pontos do pool (é a "vantagem"). Custo/ganho
  // é fixo em 2 pra toda categoria — não varia linha a linha (regra do
  // sistema, ver PONTOS_CARACTERIZACAO_BASE/CUSTO_CARACTERIZACAO/
  // GANHO_CARACTERIZACAO no bloco [15]). Nenhuma categoria é obrigatória —
  // ficar de fora do objeto `caracterizacao` salvo é sempre válido.
  // ----------------------------------------------------------
  caracterizacoes: {
    fisica: [
      { key: 'estatura',    nome: 'Estatura',    opcaoConcede: { key: 'baixinho',      nome: 'Baixinho'      }, opcaoCusta: { key: 'gigante',      nome: 'Gigante'      } },
      { key: 'beleza',      nome: 'Beleza',      opcaoConcede: { key: 'feio',       nome: 'Feio'       }, opcaoCusta: { key: 'bonito',      nome: 'Bonito'      } },
      { key: 'deficiencia', nome: 'Deficiência', opcaoConcede: { key: 'deficiente', nome: 'Deficiente' }, opcaoCusta: { key: 'perfeito',    nome: 'Perfeito'    } },
      { key: 'dependencia', nome: 'Dependência', opcaoConcede: { key: 'dependente', nome: 'Dependente' }, opcaoCusta: { key: 'sobrio',      nome: 'Sóbrio'      } },
      { key: 'porte', nome: 'Porte', opcaoConcede: { key: 'fragil',   nome: 'Frágil'   }, opcaoCusta: { key: 'forte',  nome: 'Forte'  } },
      { key: 'saude',       nome: 'Saúde',       opcaoConcede: { key: 'alergico',   nome: 'Alérgico'   }, opcaoCusta: { key: 'superhumano', nome: 'Superhumano' } },
    ],
    social: [
      { key: 'alianca',  nome: 'Aliança',  opcaoConcede: { key: 'inimigo',    nome: 'Inimigo'    }, opcaoCusta: { key: 'aliado', nome: 'Aliado' } },
      { key: 'classe',   nome: 'Classe',   opcaoConcede: { key: 'pobre',     nome: 'Pobre'     }, opcaoCusta: { key: 'rico',    nome: 'Rico'    } },
      { key: 'financas', nome: 'Finanças', opcaoConcede: { key: 'divida',    nome: 'Dívida'    }, opcaoCusta: { key: 'heranca', nome: 'Herança' } },
      { key: 'fama',     nome: 'Fama',     opcaoConcede: { key: 'procurado', nome: 'Procurado' }, opcaoCusta: { key: 'afamado', nome: 'Afamado' } },
      { key: 'religiao', nome: 'Religião', opcaoConcede: { key: 'ateu',    nome: 'Ateu'    }, opcaoCusta: { key: 'devoto',    nome: 'Devoto'    } },
      { key: 'mestre',   nome: 'Mestre',   opcaoConcede: { key: 'odiado',    nome: 'Odiado'    }, opcaoCusta: { key: 'adorado', nome: 'Adorado' } },
    ],
    pessoal: [
      { key: 'atencao',      nome: 'Atenção',      opcaoConcede: { key: 'distraido',  nome: 'Distraído'  }, opcaoCusta: { key: 'vigilante',   nome: 'Vigilante'   } },
      { key: 'coragem',      nome: 'Coragem',      opcaoConcede: { key: 'covarde',    nome: 'Covarde'    }, opcaoCusta: { key: 'corajoso',    nome: 'Corajoso'    } },
      { key: 'mentalidade',  nome: 'Mentalidade',  opcaoConcede: { key: 'compulsivo', nome: 'Compulsivo' }, opcaoCusta: { key: 'contido',     nome: 'Contido'     } },
      { key: 'conduta',      nome: 'Conduta',      opcaoConcede: { key: 'desonrado',  nome: 'Desonrado'  }, opcaoCusta: { key: 'honrado',     nome: 'Honrado'     } },
      { key: 'humor',        nome: 'Humor',        opcaoConcede: { key: 'ranzinza',   nome: 'Ranzinza'   }, opcaoCusta: { key: 'contagiante', nome: 'Contagiante' } },
      { key: 'temperamento', nome: 'Temperamento', opcaoConcede: { key: 'esquentado', nome: 'Esquentado' }, opcaoCusta: { key: 'bonzinho',    nome: 'Bonzinho'    } },
    ],
  },

  // Caracterização Histórica — 1 escolha SEM custo em pontos, entre 3 opções
  // ligadas ao `reino` do personagem (chaves batem com GAME_DATA.reinos
  // acima). O wizard só mostra a entrada do reino já escolhido pelo jogador.
  caracterizacaoHistorica: {
    'Abadom':         ['Dragonista', 'Escambista', 'Sobrevivente'],
    'Acordo':         ['Carrancudo', 'Minerador', 'Comerciante'],
    'Âmien':          ['Prestigiado', 'Abençoado', 'Sábio'],
    'Azanti':         ['Inconformado', 'Armamentista', 'Preconceituoso'],
    'Calco':          ['Letrado', 'Multicultural', 'Teórico'],
    'Cidades-Estado': ['Carpinteiro', 'Abastado', 'Revoltado'],
    'Conti':          ['Malandro', 'Mesquinho', 'Mateiro'],
    'Dantsen':        ['Cavalariço', 'Desapropriado', 'Adestrador'],
    'Eredra':         ['Rebelde', 'Supersticioso', 'Religioso'],
    'Filanti':        ['Formal', 'Desconfiado', 'Mitomaníaco'],
    'Levânia':        ['Artesão', 'Justo', 'Demonista'],
    'Ludgrim':        ['Bilíngue', 'Tolerante', 'Alerta'],
    'Luna':           ['Artista', 'Medroso', 'Doente'],
    'Marana':         ['Retórico', 'Cozinheiro', 'Refinado'],
    'Plana':          ['Negociador', 'Trapaceiro', 'Pacifista'],
    'Portis':         ['Magista', 'Historiador', 'Xenófobo'],
    'Porto Livre':    ['Boêmio', 'Procurado', 'Praiano'],
    'Verrogar':       ['Belicoso', 'Treinado', 'Soldado'],
  },

  // ----------------------------------------------------------
  // APRIMORAMENTOS (DATABASE_TAGMAR — LISTA_HABILIDADE)
  // Idiomas/Religiões/Artes/Sabedorias que o personagem pode
  // escolher conforme o total de pontos em cada habilidade.
  // ----------------------------------------------------------
  idiomaPorRaca: {
    'Anão':           'Khuzdul',
    'Elfo-Dourado':   'Élfico',
    'Elfo-Florestal': 'Élfico',
    'Elfo-Sombrio':   'Élfico',
    'Meio-Elfo':      'Élfico',
    'Meio-Orc':       'Kurng',
    'Pequenino':      'Lanta',
    'Humano':         null,
  },
  idiomaPorReino: {
    'Abadom':          'Abadrim',
    'Cidades-Estado':  'Estadunidense',
    'Eredra':          'Eredri',
    'Dantsen':         'Dantseniano',
    'Levânia':         'Leva',
    'Ludgrim':         'Lud',
    'Luna':            'Lunês',
    'Marana':          'Maranês',
    'Plana':           'Planense',
    'Portis':          'Runa',
    'Verrogar':        'Verrogari',
    // demais reinos do CSV mantidos por completude (alguns nomes não estão na lista atual de reinos)
    'Estepes Vítreas': 'Bárbaro',
    'Geleiras':        'Lazúli',
    'Grande Deserto':  'Shakobsa',
    'Império Aktar':   'Aktar',
    'Mangues':         'Manganês',
    'Planalto Vermelho': 'Birso',
    'Terras Selvagens': 'Rúbeo',
    'Tessaldariano':   'Tessaldar',
  },
  // a cada 10 pts de Idioma
  idiomasDisponiveis: [
    'Khuzdul', 'Élfico', 'Kurng', 'Lanta', 'Abadrim', 'Estadunidense', 'Díctio',
    'Dantseniano', 'Eredri', 'Bárbaro', 'Lazúli', 'Shakobsa', 'Aktar', 'Leva',
    'Lud', 'Lunês', 'Manganês', 'Maranês', 'Planense', 'Birso', 'Runa',
    'Rúbeo', 'Tessaldar', 'Verrogari', 'Malês',
  ],
  // a cada 5 pts de Religião
  religioesDisponiveis: [
    'Maira', 'Ganis', 'Palier', 'Blator', 'Crezir', 'Crizagom', 'Lena',
    'Selimon', 'Parom', 'Cruine', 'Plandis', 'Cambu', 'Sevides', 'Luz',
    'Treva', 'Fogo', 'Étere', 'Gênese', 'Terra', 'Crônos', 'Crio',
    'Ânimus', 'Maná', 'Entropia', 'Água', 'Ar', 'Morrigalti', 'Antredom',
    'Ekisis', 'Mocna', 'Ricutatis', 'Diatrimis', 'Heldrom', 'Seinoniz',
    'Vouxiz', 'Udoviom', 'Anasmadis', 'Branaxis', 'Fulvina',
  ],
  // a cada 7 pts de Arte
  artesDisponiveis: ['Música', 'Pintura', 'Escultura', 'Literatura', 'Desenho', 'Teatro'],
  // a cada 7 pts de Sabedoria
  sabedoriasDisponiveis: [
    'Molda (Calco, Conti, Plana, Azanti, Filanti e Acordo)',
    'Runa (Portis, Cidades-Estado, Luna e Marana)',
    'Marítima (Porto Livre, Mares, Piratas e Ilhas Independentes)',
    'Verrogari (Verrogar, Dantsen, Eredra e Terras Selvagens)',
    'Leva (Levânia, Abadom, Ludgrim e Bankdis)',
    'Élfica (Âmien, Lar, Dartel, etc)',
    'Anã (Blur, etc)',
  ],

  // Habilidades cujo total destrava aprimoramentos (chave → divisor de pontos)
  aprimoramentoPorHab: { idioma: 10, religiao: 5, arte: 7, sabedoria: 7 },

  profissoes: {
    'Guerreiro':  { ehBase: 14, habilidadesPontos: 14 },
    'Ladino':     { ehBase: 10, habilidadesPontos: 20 },
    'Sacerdote':  { ehBase: 12, habilidadesPontos: 10 },
    'Mago':       { ehBase: 6, habilidadesPontos: 10 },
    'Rastreador': { ehBase: 10, habilidadesPontos: 16 },
    'Bardo':      { ehBase: 8, habilidadesPontos: 14 },
  },

  // Especialização → Título conferido. Só liberada no estágio 5+ (não usada no MVP).
  especializacoes: {
    'Guerreiro': [
      { esp: 'Academia de Soldados',     titulo: 'Soldado' },
      { esp: 'Academia de Arqueiros',    titulo: 'Arqueiro' },
      { esp: 'Academia de Cavaleiros',   titulo: 'Cavaleiro' },
      { esp: 'Academia de Gladiadores',  titulo: 'Gladiador' },
    ],
    'Ladino': [
      { esp: 'Guilda de Assassinos',     titulo: 'Assassino' },
      { esp: 'Guilda de Ladrões',        titulo: 'Ladrão' },
      { esp: 'Guilda de Piratas',        titulo: 'Pirata' },
    ],
    'Rastreador': [
      { esp: 'Trilha de Caçadores',      titulo: 'Caçador' },
      { esp: 'Trilha de Exploradores',   titulo: 'Explorador' },
      { esp: 'Trilha de Guardiões',      titulo: 'Guardião' },
    ],
    'Mago': [
      { esp: 'Colégio Alquímico',        titulo: 'Alquimista' },
      { esp: 'Colégio Ilusionista',      titulo: 'Ilusionista' },
      { esp: 'Colégio Filosófico',       titulo: 'Filósofo' },
      { esp: 'Colégio Elemental',        titulo: 'Elementalista' },
      { esp: 'Colégio Naturalista',      titulo: 'Xamã' },
      { esp: 'Colégio Necromântico',     titulo: 'Necromante' },
    ],
    'Bardo': [
      { esp: 'Confraria de Arautos',     titulo: 'Arauto' },
      { esp: 'Confraria de Artistas',    titulo: 'Artista' },
      { esp: 'Confraria de Eruditos',    titulo: 'Erudito' },
    ],
    'Sacerdote': [
      { esp: 'Ordem de Blator',          titulo: 'Senhor da Guerra' },
      { esp: 'Ordem de Cambu',           titulo: 'Diplomata Dourado' },
      { esp: 'Ordem de Crezir',          titulo: 'Dragão Vermelho' },
      { esp: 'Ordem de Crizagom',        titulo: 'Justiceiro' },
      { esp: 'Ordem de Cruine',          titulo: 'Vingador Negro' },
      { esp: 'Ordem de Ganis',           titulo: 'Filho do Mar' },
      { esp: 'Ordem de Lena',            titulo: 'Vigário Rosa' },
      { esp: 'Ordem de Maira',           titulo: 'Runcaim' },
      { esp: 'Ordem de Palier',          titulo: 'Sábio' },
      { esp: 'Ordem de Parom',           titulo: 'Mestre da Forja' },
      { esp: 'Ordem de Plandis',         titulo: 'Oráculo' },
      { esp: 'Ordem de Selimon',         titulo: 'Pacificador' },
      { esp: 'Ordem de Sevides',         titulo: 'Filho da Terra' },
    ],
  },

  // Custo em pontos pra comprar cada valor de atributo
  // Valores NEGATIVOS devolvem pontos (custo < 0 = ganho). -1 devolve 0.5; -2 devolve 1.
  custoAtributo: { '-2': -1, '-1': -0.5, '0': 0, '1': 1, '2': 3, '3': 6, '4': 10, '5': 15, '6': 21 },

  // Faixas de XP → estágio
  estagios: [
    { min:    0, max:   10, n:  1 }, { min:   11, max:   20, n:  2 }, { min:   21, max:   30, n:  3 },
    { min:   31, max:   45, n:  4 }, { min:   46, max:   60, n:  5 }, { min:   61, max:   75, n:  6 },
    { min:   76, max:   95, n:  7 }, { min:   96, max:  115, n:  8 }, { min:  116, max:  135, n:  9 },
    { min:  136, max:  165, n: 10 }, { min:  166, max:  195, n: 11 }, { min:  196, max:  225, n: 12 },
    { min:  226, max:  265, n: 13 }, { min:  266, max:  305, n: 14 }, { min:  306, max:  345, n: 15 },
    { min:  346, max:  385, n: 16 }, { min:  386, max:  435, n: 17 }, { min:  436, max:  485, n: 18 },
    { min:  486, max:  535, n: 19 }, { min:  536, max:  585, n: 20 }, { min:  586, max:  645, n: 21 },
    { min:  646, max:  705, n: 22 }, { min:  706, max:  765, n: 23 }, { min:  766, max:  825, n: 24 },
    { min:  826, max:  895, n: 25 }, { min:  896, max:  965, n: 26 }, { min:  966, max: 1035, n: 27 },
    { min: 1036, max: 1105, n: 28 }, { min: 1106, max: 1185, n: 29 }, { min: 1186, max: 1265, n: 30 },
    { min: 1266, max: 1345, n: 31 }, { min: 1346, max: 1425, n: 32 }, { min: 1426, max: 1515, n: 33 },
    { min: 1516, max: 1605, n: 34 }, { min: 1606, max: 1695, n: 35 }, { min: 1696, max: 1785, n: 36 },
    { min: 1786, max: 1885, n: 37 }, { min: 1886, max: 1985, n: 38 }, { min: 1986, max: 2085, n: 39 },
    { min: 2086, max: 2185, n: 40 },
  ],

  // ----------------------------------------------------------
  // HABILIDADES — agora vivem na tabela `habilidades` do Supabase (migration
  // 008). O front carrega via `personagens.jsx` (useEffect) e propaga como
  // prop `habilidadesDb` pros componentes do wizard. Os helpers desta seção
  // recebem o `habilidadesByKey` (map key→row) como parâmetro.
};

// Ordem canônica dos 6 grupos de habilidade pra exibição na UI.
// A tabela `habilidades` não armazena ordem — quem renderiza agrupa por
// `grupo` usando este array como referência.
const GRUPOS_HABILIDADES_ORDEM = [
  'Profissional', 'Subterfúgio', 'Manobra', 'Influência', 'Conhecimento', 'Geral',
];

const ATRIBUTOS_KEYS = ['intelecto', 'aura', 'carisma', 'forca', 'fisico', 'agilidade', 'percepcao'];
const ATRIBUTOS_LABEL = {
  intelecto: 'Intelecto', aura: 'Aura', carisma: 'Carisma',
  forca: 'Força', fisico: 'Físico', agilidade: 'Agilidade', percepcao: 'Percepção',
};

/* ============================== [09] Helpers de cálculo ============================== */
function calcEstagio(xp) {
  const x = Number(xp) || 0;
  const f = GAME_DATA.estagios.find((e) => x >= e.min && x <= e.max);
  return f ? f.n : (x > 2185 ? 40 : 1);
}
function pontosDisponiveis(estagio) {
  return 15 + Math.floor((estagio - 1) / 2);
}

// ── Equalização racial ────────────────────────────────────────────────────
// Desde que o modificador racial virou nível inicial gratuito (08/09/2026),
// cada raça passou a valer um tanto diferente em pontos: somando o custo dos
// níveis que ela dá de graça, o Anão e o Meio-Orc valem 4 e o Humano vale 0,
// porque não tem modificador nenhum. Como nada no resto do sistema compensa
// isso (os bônus de habilidade por raça dão líquido 0 pro Humano, igual ao
// Anão), a raça acabava decidindo QUANTO o personagem vale, não só ONDE ele
// é forte.
//
// O bônus fecha esse vão: cada raça recebe em pontos livres o que falta pra
// ela alcançar a raça mais valiosa. A raça segue definindo o perfil; o total
// inicial fica igual pra todas.
//
// O teto é DERIVADO do catálogo, não fixado: mexer no mod de uma raça
// reequilibra as outras sozinho — foi o que aconteceu quando a Agilidade do
// Anão e o Intelecto do Meio-Orc caíram pra −2 e o teto foi de 4,5 pra 4.
function valorNiveisIniciais(mods) {
  return ATRIBUTOS_KEYS.reduce((s, k) => s + custoAtributo(mods?.[k] ?? 0), 0);
}

function bonusPontosRaca(raca) {
  const mods = GAME_DATA.racas[raca]?.mods;
  if (!mods) return 0;   // raça ausente ou fora do catálogo: sem bônus
  /* O teto sai só das raças JOGÁVEIS (06/10/2026). O Lobisomem vale 6 contra
     o teto de 4 do Anão: se ele entrasse na conta, todo personagem já criado
     ganharia +2 pontos de atributo sem ninguém pedir. As formas entram em
     GAME_DATA.racas marcadas com `forma: true` (registrarFormasNasRacas, em
     01-core/forma-raca.jsx) justamente para poderem ser filtradas aqui. */
  const teto = Math.max(...Object.values(GAME_DATA.racas)
    .filter((r) => !(r && r.forma))
    .map((r) => valorNiveisIniciais(r.mods)));
  return teto - valorNiveisIniciais(mods);
}

// Pool de pontos de atributo do wizard: a do estágio mais o bônus da raça.
// Sem raça → pool do estágio pura (comportamento de pontosDisponiveis).
function pontosAtributosTotal(estagio, raca) {
  return pontosDisponiveis(estagio) + bonusPontosRaca(raca);
}
/* Todos os pontos do estágio já foram distribuídos?
   Recebe o SALDO (restantes) de cada pool do wizard.

   Serve pra decidir quando gravar `personagens.nivel_visto`, que é o que
   apaga o badge "Pronto pra evoluir!" (temLevelUpPendente). Antes o
   nivel_visto era gravado em QUALQUER edição do jogador: abrir o wizard e
   salvar sem distribuir nada já sumia com o lembrete e os pontos ficavam
   esquecidos. Regra do usuário (01/09/2026): só some quando forem gastos. */
function todosOsPontosGastos(saldos) {
  const s = saldos || {};
  // Magia saiu daqui em 22/10/2026: aprende-se pelo item, não no wizard —
  // sobra de ponto de magia não é pendência do estágio.
  const pools = [s.atributos, s.habilidades, s.tecnicas, s.gruposArmas];
  return pools.every((r) => (Number(r) || 0) <= 0);
}

function custoAtributo(v) {
  return GAME_DATA.custoAtributo[String(v)] ?? 0;
}
// Pontos gastos em atributos, medidos A PARTIR DA LINHA DE BASE DA RAÇA.
// O modificador racial é o nível INICIAL gratuito do atributo (decisão de
// 08/09/2026): o Anão tem Físico +2, então já começa em 2 sem pagar nada, e
// subir pra 3 custa só o degrau (6 − 3 = 3). Vender o ponto racial é escolha
// do jogador e devolve pontos — o gasto fica negativo, e a pool cresce.
//
// Sem o custo relativo, semear o `_base` com o mod puniria as raças de mod
// positivo: o Anão nasceria com 4,5 pontos da própria pool já consumidos.
//
// `raca` omitida (ou fora do catálogo) → linha de base 0, ou seja, a fórmula
// absoluta de antes. Mantido pras chamadas que não têm a raça em mãos.
function pontosGastos(baseVals, raca) {
  const mods = GAME_DATA.racas[raca]?.mods;
  return ATRIBUTOS_KEYS.reduce((sum, k) => (
    sum + custoAtributo(baseVals[k] ?? 0) - custoAtributo(mods?.[k] ?? 0)
  ), 0);
}
// Modificador de gênero sobre física (altura/peso).
// `genero` é string: 'Masculino' | 'Feminino' | 'Neutro' | undefined.
// Masculino → +10% (×1.1); Feminino → −10% (×0.9); Neutro → sem modificador (×1).
function _multGeneroFisico(genero) {
  if (genero === 'Masculino') return 1.1;
  if (genero === 'Feminino')  return 0.9;
  return 1; // Neutro ou indefinido
}

// `subraca` (opcional) troca a altura-base da raça pela da sub-raça; o gênero
// continua valendo por cima, como em qualquer raça.
function altura(raca, genero, subraca) {
  const base = GAME_DATA.subracas[subraca]?.altura ?? GAME_DATA.racas[raca]?.altura ?? 1.77;
  return +(base * _multGeneroFisico(genero)).toFixed(2);
}
function peso(raca, genero, subraca) {
  const sub = GAME_DATA.subracas[subraca] ? subraca : null;
  const h = altura(raca, genero, sub);
  /* O FATOR É O DA RAÇA, mesmo transformado (06/10/2026): "a sub-raça declara
     altura, não compleição — todo o restante permanece o mesmo". Um anão
     vampiro é um anão de 1,77m e pesa como tal (1,77² × 40), não como um
     humano da mesma altura. Antes o fator trocava para 28 com qualquer
     sub-raça, o que fazia o anão emagrecer 38 quilos ao virar vampiro. */
  const fator = raca === 'Anão' ? 40 : 28;
  return Math.floor(h * h * fator);
}

// ── Sub-raça em vigor (22/10/2026) ──────────────────────────────────────
// Uma magia de transformação ativa (Licantropia → Lobisomem) vence a
// sub-raça permanente que o Mestre definiu (coluna `subraca`, que um trigger
// no banco deixa só o Mestre da história mudar): o vampiro
// que evoca Licantropia vira lobisomem por um dia e volta a vampiro depois.
//
// `dataJogo` é a data da mesa: a magia vence por comparação na leitura
// (magiasAtivasVigentes). Sem data, ela é tratada como vigente — o mesmo
// critério de toda magia ativa; o avanço do relógio pelo Mestre limpa as
// vencidas (limparTransformacoesVencidas), então quem lê sem data não fica
// com lobo eterno.
function subracaEfetiva(p, dataJogo) {
  const est = (p && p.estado_atual) || {};
  const ativas = Array.isArray(est.magias_ativas) ? est.magias_ativas : [];
  if (ativas.length && typeof subracaDaMagia === 'function') {
    const vig = typeof magiasAtivasVigentes === 'function' ? magiasAtivasVigentes(ativas, dataJogo) : ativas;
    for (let i = vig.length - 1; i >= 0; i--) {
      const s = vig[i] && subracaDaMagia(vig[i].key);
      if (s && GAME_DATA.subracas[s]) return s;
    }
  }
  /* A FORMA do estado (06/10/2026): vampiro e lobisomem entram por
     `estado_atual.forma = { raca }` — a porta que 01-core/forma-raca.jsx usa
     — e valem como sub-raça para tudo o que deriva daqui: altura, peso, VB,
     poços. Vem DEPOIS da magia de transformação e ANTES da sub-raça fixa do
     Mestre: uma Licantropia evocada vence a forma gravada, e a forma gravada
     vence a coluna. */
  const daForma = p && p.estado_atual && p.estado_atual.forma && p.estado_atual.forma.raca;
  if (daForma && GAME_DATA.subracas[daForma]) return daForma;
  const fixa = p && p.subraca;
  return GAME_DATA.subracas[fixa] ? fixa : null;
}

// Tira do estado as magias de transformação já vencidas na data `dataJogo`.
// Devolve o MESMO objeto quando não há nada a tirar (quem chama compara
// referência para decidir se grava).
function limparTransformacoesVencidas(estado, dataJogo) {
  const ativas = estado && Array.isArray(estado.magias_ativas) ? estado.magias_ativas : null;
  if (!ativas || typeof magiasAtivasVigentes !== 'function' || typeof subracaDaMagia !== 'function') return estado;
  const vig = new Set(magiasAtivasVigentes(ativas, dataJogo));
  const depois = ativas.filter((a) => vig.has(a) || !subracaDaMagia(a && a.key));
  return depois.length === ativas.length ? estado : { ...estado, magias_ativas: depois };
}

// Atributos com a sub-raça aplicada: tira o ajuste da raça (que já mora
// embutido no X_base desde a criação, ver pontosGastos) e põe o da sub-raça.
// Sem sub-raça, devolve os valores como vieram.
function atributosComSubraca(baseVals, raca, subraca) {
  const sub = GAME_DATA.subracas[subraca];
  if (!sub) return { ...baseVals };
  const modsRaca = GAME_DATA.racas[raca]?.mods || {};
  const out = {};
  ATRIBUTOS_KEYS.forEach((k) => {
    out[k] = (baseVals[k] ?? 0) - (modsRaca[k] ?? 0) + (sub.mods[k] ?? 0);
  });
  return out;
}

// Os 7 atributos do PJ como valem agora (sub-raça aplicada). Para quem não
// passa por calcularFicha — a carga do inventário e da loja, por exemplo.
function atributosEfetivosPJ(p, dataJogo) {
  const brutos = {};
  ATRIBUTOS_KEYS.forEach((k) => { brutos[k] = (p && p[`${k}_base`]) ?? 0; });
  return atributosComSubraca(brutos, p && p.raca, subracaEfetiva(p, dataJogo));
}

// RF/RM base — RF = estágio + físico, RM = estágio + aura, piso 0.
// COMPARTILHADA entre PJ (calcularFicha, abaixo) e criatura
// (12-batalha/montarSnapshots): a tabela `criaturas` não tem colunas de
// resistência, então o snapshot de combate deriva com esta mesma conta a
// partir de estagio/fisico/aura, que toda criatura tem preenchidos.
// Recebe os atributos JÁ ajustados (negativos contam como 0 no PJ).
function resistenciasBase(estagio, fisico, aura) {
  return {
    rf: Math.max(0, (estagio || 0) + (fisico || 0)),
    rm: Math.max(0, (estagio || 0) + (aura   || 0)),
  };
}

// Calcula a ficha completa a partir dos campos editáveis.
// Para os derivados, atributos negativos contam como 0 (não altera `atributos`).
// condicoesAtuais (opcional): pj.estado_atual?.condicoes. Quando informado,
// aplica os malefícios de CONDICOES_MALEFICIO nos poços e em RF/RM (ver [14.5]).
// Os ATRIBUTOS nunca são afetados por condição. O efeito das condições de
// GRUPO (Sanidade/Reputação/Temperatura) não mora aqui — é aplicado no total
// da habilidade, por totalHabilidadeComCondicoes.
// subraca (opcional, 22/10/2026): a sub-raça em vigor (ver subracaEfetiva).
// Omitida → lida do próprio PJ sem a data da mesa; quem tem a data em mãos
// passa subracaEfetiva(p, dataJogo), e a batalha passa a do snapshot.
/* `dataJogo` (06/10/2026) é a data da mesa, e serve só para saber quais
   bônus com prazo ainda valem. Sem ela, os que existem contam como vigentes —
   a mesma convenção das magias ativas; quem avança o relógio é o Mestre. */
// Profissões que não sofrem a penalidade de karma (mod_kar < 0) das peças.
// Só o Sacerdote desde 11/11/2026 (usuário: "Remova a exceção de limitação de
// karma do rastreador, será apenas do sacerdote").
const SEM_RESTRICAO_KARMA = new Set(['Sacerdote']);
function calcularFicha(p, catalogoBySlug, condicoesAtuais, ventoDegrau, subraca, dataJogo) {
  const racaData = GAME_DATA.racas[p.raca] || GAME_DATA.racas['Humano'];
  const profData = GAME_DATA.profissoes[p.profissao] || GAME_DATA.profissoes['Guerreiro'];
  const estagio = calcEstagio(p.experiencia ?? 0);

  // Atributos finais — valor real, exibido ao jogador. O modificador
  // racial NÃO é somado aqui: ele é o NÍVEL INICIAL do atributo, já
  // embutido em `p[${k}_base]` desde a criação (wizard preenche X_base =
  // mod racial quando a raça é escolhida; o jogador gasta pontos a partir
  // dali, mesma tabela custoAtributo — sem ajuste — pra qualquer raça).
  // CORRIGIDO (decisão confirmada com o usuário): a fórmula antiga somava
  // o mod racial de novo em cima de um X_base que já podia representar o
  // valor final, contando a raça duas vezes (ex.: Elfo-Dourado com
  // fisico_base = -2 exibia -3 na ficha, quando -2 já era o valor certo).
  // racaData.mods segue existindo em GAME_DATA e é usado pelo wizard
  // (08-personagens/personagens.jsx) pra preencher X_base ao trocar de
  // raça — não é lixo morto, só não entra mais nesta soma.
  const _brutos = {};
  ATRIBUTOS_KEYS.forEach((k) => {
    _brutos[k] = p[`${k}_base`] ?? 0;
  });
  // Sub-raça (Vampiro/Lobisomem): troca o ajuste da raça pelo dela, e os
  // pontos comprados ficam. Tudo daqui pra baixo — carga, poços, VB — usa o
  // atributo já transformado.
  const sub = subraca === undefined ? subracaEfetiva(p) : (GAME_DATA.subracas[subraca] ? subraca : null);
  const atributosBase = atributosComSubraca(_brutos, p.raca, sub);
  // Condição não mexe em atributo desde 08/09/2026 (ver [14.5]) — o atributo
  // exibido é sempre o base. `atributos` continua existindo separado de
  // `atributosBase` porque metade do app lê um e metade lê o outro.
  const atributos = atributosBase;

  /* Deltas de condição aplicados nos POÇOS, não nos atributos. Com o
     catálogo em mãos, entram a carga (barra Pesado, % da capacidade) e a
     proteção das vestimentas (27/09/2026). */
  const _itens = (p && p.inventario && Array.isArray(p.inventario.itens)) ? p.inventario.itens : null;
  const _cargaFn = (typeof window !== 'undefined' && window.calcCarga) || null;
  const _protFn = (typeof protecoesVestidas === 'function' && protecoesVestidas)
    || (typeof window !== 'undefined' && window.protecoesVestidas) || null;
  let pesadoPct = 0;
  if (catalogoBySlug && _itens && _cargaFn) {
    try { pesadoPct = Math.max(0, Number(_cargaFn(_itens, catalogoBySlug, atributosBase.forca, atributosBase.fisico).pct) || 0); }
    catch (_) { pesadoPct = 0; }
  }
  /* A FAIXA DE CARGA (07/11/2026) decide o que o peso tira — ver
     FAIXAS_DE_CARGA. A barra Pesado continua 0..100 (barrasDeCondicao trava);
     a faixa lê o percentual cru, que pode passar de 100 em dado antigo. */
  const faixaCarga = faixaDeCarga(pesadoPct);
  const protecoes = (catalogoBySlug && _itens && _protFn) ? _protFn(_itens, catalogoBySlug) : {};
  /* Os bônus com prazo que ainda valem na data da mesa. Sem a fase carregada
     (ou sem estado), é tudo zero e nada muda. */
  const _bonusTemp = (typeof window !== 'undefined' && window.bonusTemporarios) || null;
  const _temp = _bonusTemp
    ? _bonusTemp((p && p.estado_atual && p.estado_atual.efeitos_temporarios) || [], dataJogo)
    : { ef: 0, eh: 0, ka: 0, ar: 0, vb: 0 };
  const condicoesComCarga = { ...(condicoesAtuais || {}), pesado: pesadoPct };
  /* "REMOVER ESSAS BARRAS E SEUS EFEITOS" (06/10/2026, sobre o vampiro): não
     basta esconder a barra — a condição de que a forma é imune não pode
     descontar poço nem resistência. Apagar a chave aqui é o que faz isso
     valer para EF, EH, RF e RM de uma vez, sem que deltasPocosPorCondicoes
     precise saber o que é um vampiro. A lista mora em 01-core/forma-raca.jsx
     e chega pelo window: esta fase carrega antes daquela. */
  const _imunFn = (typeof window !== 'undefined' && window.imunidadesDaForma) || null;
  if (_imunFn && sub) {
    (_imunFn(sub) || []).forEach((chave) => { delete condicoesComCarga[chave]; });
  }
  const dPoco = deltasPocosPorCondicoes(condicoesComCarga, protecoes);
  const condicoesEfetivas = barrasDeCondicao(condicoesComCarga, protecoes);

  // Versões usadas nas fórmulas derivadas (EF/EH/RF/RM/Karma/Velocidade):
  // atributo negativo conta como 0, nunca como penalidade extra.
  const clamp0 = (n) => Math.max(0, n);
  const fisicoC    = clamp0(atributosBase.fisico);
  const auraC      = clamp0(atributosBase.aura);
  const percepcaoC = clamp0(atributosBase.percepcao);
  const agilC      = clamp0(atributosBase.agilidade);

  // Modificador de gênero:
  //   Masculino  → +10% de altura e peso; −10% no ehBase da profissão (arredondado pra baixo)
  //   Feminino   → −10% de altura e peso; +10% no ehBase da profissão (arredondado pra baixo)
  //   Neutro     → sem modificador em altura/peso nem no ehBase
  const genero = p.genero;
  const h = altura(p.raca, genero, sub);
  const pesoVal = peso(p.raca, genero, sub);

  // Os derivados abaixo ganham Math.max(0, ...) porque o delta de condição
  // pode empurrar o poço abaixo de 0 de propósito, e o resto do app (cascata
  // de dano em batalha, barras de vitalidade) assume >= 0.
  // EF — 20% do peso + atributo físico (+ Saúde)
  const ef = Math.max(0, Math.floor(pesoVal / 5) + fisicoC + dPoco.ef);
  // EH — percepção + (EH-base da profissão × estágio). Confere com o guia
  // (08-personagens/guia_personagem.jsx) e com o teste congelado; o comentário
  // antigo dizia "(percepção + aura) × estágio + base", que nunca foi o código.
  // Masculino recebe −10% no ehBase; Feminino recebe +10%; Neutro usa o valor base.
  const ehBaseMod = genero === 'Masculino'
    ? Math.floor((profData.ehBase || 0) * 0.9)
    : genero === 'Feminino'
      ? Math.floor((profData.ehBase || 0) * 1.1)
      : (profData.ehBase || 0);
  const eh = Math.max(0, (percepcaoC) + ehBaseMod * estagio + dPoco.eh);
  // RF/RM — ver resistenciasBase (mesma fórmula usada pelas criaturas em
  // 12-batalha/montarSnapshots; não duplicar a conta aqui). Nenhuma condição
  // mexe em RF/RM: são derivados puros de estágio + atributo.
  const _res = resistenciasBase(estagio, fisicoC, auraC);
  // Fome tira RF; Sede tira RM (27/09/2026). A base continua a mesma fórmula.
  const resFisica = Math.max(0, _res.rf + dPoco.rf);
  const resMagica = Math.max(0, _res.rm + dPoco.rm);
  // KA — (RM + 1) × (aura + 1), + Hidratação/Sobriedade. Sem karma se aura < 1:
  // aí o poço não EXISTE, e o bônus de condição não o ressuscita (senão "sem
  // Karma" viraria condicional e o tooltip da ficha, mentira).
  const karma = atributosBase.aura < 1 ? 0 : Math.max(0, (resMagica + 1) * (auraC + 1) + dPoco.ka);
  /* VB — (11 × altura) + agilidade (+ Sono) − VENTO.
     O vento é o único fator aqui que NÃO vem do personagem: ele é do clima da
     mesa (historias.data_jogo_atual.tempo.vento), entra como parâmetro e sai
     sozinho quando o vento para. Nada é gravado no PJ, e por isso não há o que
     desfazer — ver 01-core/clima-desgaste.jsx.
     Quem chama sem o parâmetro (os nove pontos anteriores a 20/09/2026)
     continua com a conta de sempre: degrau ausente vale zero. */
  const _ventoFn = (typeof penalidadeVentoVB === 'function' && penalidadeVentoVB)
    || (typeof window !== 'undefined' && window.penalidadeVentoVB) || null;
  const ventoVB = _ventoFn ? _ventoFn(ventoDegrau) : 0;
  const veloc = Math.max(0, Math.floor(h * 11) + agilC + dPoco.vb - ventoVB);

  // AR     = soma das absorções dos equipamentos de defesa equipados.
  // Defesa = tipo do peitoral (slot 'peito') concatenado com AR. Ex: "L10".
  //          Sem peitoral, fica só o número. Sem catálogo, "—".
  let absorcaoTotal = 0;   // ABS — soma das absorções (vai pra barra)
  let defesaTotal  = 0;    // soma das defesas (compõe a string e o DEF)
  let modVelTotal  = 0;    // VEL das peças (mod_vel do catálogo, 26/10/2026)
  let modKarTotal  = 0;    // KAR das peças (mod_kar do catálogo, 26/10/2026)
  let tipoPeitoral = '';
  if (catalogoBySlug && p?.inventario?.itens) {
    p.inventario.itens.forEach((it) => {
      // Critério único de "está no corpo" (01-core/inventario-helpers.jsx):
      // cobre armadura equipada E vestimenta vestida. Antes era `it.slot`,
      // que só enxerga equipamento — um dos três critérios divergentes que a
      // auditoria de 01/09/2026 encontrou pra mesma soma. A peça no SAQUE
      // RÁPIDO (slot saque_e/saque_d, equipado:false) fica de fora de tudo.
      if (!pecaNoCorpo(it)) return;
      const c = catalogoBySlug[it.slug];
      if (!c) return;
      // + Sagração da peça (armadura e escudo, 15/09/2026). Peça QUEBRADA
      // não absorve nem defende (30/10/2026), mas segue pesando e atrasando.
      if (!it.quebrada) {
        absorcaoTotal += absorcaoDaPeca(it, c);
        defesaTotal   += (typeof defesaDaPeca === 'function' ? defesaDaPeca(it, c) : Number(c.defesa || 0));
      }
      modVelTotal   += Number(c.mod_vel  || 0);
      // O Sacerdote usa qualquer armadura e arma sem restrição de karma
      // (29/10/2026; o Rastreador saiu da exceção em 11/11/2026): a
      // penalidade da peça não vale para ele; o bônus (joia de metal arcano)
      // continua valendo.
      const _kar = Number(c.mod_kar || 0);
      if (!(_kar < 0 && SEM_RESTRICAO_KARMA.has(p.profissao))) modKarTotal += _kar;
      // 'peito' é o slot antigo do peitoral; desde 26/10/2026 a região é 'dorso'.
      if ((it.slot === 'peito' || it.slot === 'dorso') && c.tipo_armadura) {
        tipoPeitoral = c.tipo_armadura;
      }
    });
    /* Conjunto completo, todas as peças idênticas e inteiras (30/10/2026):
       leve Abs 2 / Def 2, média 3/1, pesada 4/0 (defesa desde 07/11/2026). Ver bonusDeConjunto. */
    const _bonusConj = (typeof bonusDeConjunto === 'function' ? bonusDeConjunto : window.bonusDeConjunto);
    const conj = _bonusConj ? _bonusConj(p.inventario.itens, catalogoBySlug) : null;
    if (conj) { absorcaoTotal += conj.abs; defesaTotal += conj.def; }
  }
  // Os ajustes passivos das peças (proposta de 26/10/2026): botas aceleram,
  // armadura pesada atrasa e abafa o karma; joia de metal arcano abre karma.
  const velocFinal = Math.max(0, veloc + modVelTotal);
  const karmaFinal = atributosBase.aura < 1 ? 0 : Math.max(0, karma + modKarTotal);
  /* Sem aura não há POÇO, e o bônus com prazo não o ressuscita — a mesma regra
     que o bônus de condição já respeita (ver `karma`, acima). Somá-lo sem a
     guarda fazia um Karma Líquido dar 10 de karma a quem não tem poço nenhum,
     e o "sem Karma" da ficha virava mentira (29/10/2026). A peça que ZERA o
     poço (armadura pesada, mod_kar) é outro caso: ali a aura existe, e o
     bônus com prazo vale. */
  const karmaComPrazo = atributosBase.aura < 1 ? 0 : karmaFinal + _temp.ka;
  // A Absorção é SÓ a soma dos equipamentos: a Alimentação deixou de somar
  // nela em 14/09/2026 ("Alimentação não deve alterar a absorção").

  // Defesa: sigla do peitoral (L por padrão se não houver peitoral)
  //         + (soma das defesas dos equipamentos + agilidade).
  // Ex: agilidade 2, sem armadura → "L2".
  //     agilidade 2, peitoral couro (L, defesa 3) + calça couro (defesa 2) → "L7".
  const siglaDefesa = tipoPeitoral || 'L';
  // A carga tira defesa a partir de 51% (FAIXAS_DE_CARGA, 07/11/2026).
  const valorDefesa = Math.max(0, defesaTotal + agilC - faixaCarga.defesa);
  const defesaStr   = `${siglaDefesa}${valorDefesa}`;

  return {
    estagio,
    subraca: sub,
    altura: h,
    peso: pesoVal,
    atributos,
    atributosBase,
    // As barras como a ficha as mostra (0..100, Frio/Calor, proteção descontada).
    condicoesEfetivas,
    protecoes,
    derivadas: {
      /* O BÔNUS COM PRAZO ENTRA NA LEITURA (06/10/2026): o item de duração
         (Fogo Vivo, Energia Cinética) não prende valor na barra — ele vira
         linha em estado_atual.efeitos_temporarios, e o bônus aparece AQUI,
         somado ao máximo, enquanto a data da mesa não passar do vencimento.
         É o que deixa a EH chegar a 35 com máximo 30 e voltar sozinha ao
         fim do prazo. A conta mora em 01-core/efeito-temporario.jsx e chega
         pelo window: esta fase carrega antes daquela. */
      energiaFisica: ef + _temp.ef,
      energiaHeroica: eh + _temp.eh,
      resistenciaFisica: resFisica,
      resistenciaMagica: resMagica,
      absorcao: absorcaoTotal + _temp.ar,
      defesa: defesaStr,
      // DEF numérico da proposta de 26/10/2026 (defesas das peças + agilidade).
      defesaNum: valorDefesa,
      /* O BÔNUS COM PRAZO TAMBÉM AQUI (29/10/2026). `armadura` é a MESMA
         absorção de `absorcao` — e é esta que a ficha lê para a barra AR
         (11-ficha/ficha.jsx). Somar o prazo só em `absorcao` deixava o item de
         duração ("Aumenta 1 de Absorção") invisível na única tela que o mostra. */
      armadura: catalogoBySlug ? absorcaoTotal + _temp.ar : '—',
      karma: karmaComPrazo,
      karmamax: karmaComPrazo,
      /* A carga corta a Velocidade em PORCENTAGEM (07/11/2026): −25% / −50% /
         −75% conforme a faixa. Arredonda para baixo — o peso não dá de volta. */
      velocidade: velocidadeComCarga(velocFinal + _temp.vb, faixaCarga),
      // Regra nova (26/10/2026): VEL 30 dobra os pontos de ação da rodada.
      // No limite da carga (91%+), sem ação extra (07/11/2026).
      pontosAcaoDobrados: velocidadeComCarga(velocFinal + _temp.vb, faixaCarga) >= 30 && !faixaCarga.semAcaoExtra,
      // A carga e a faixa dela, para quem mostra e para a batalha.
      carga: { pct: pesadoPct, faixa: faixaCarga.id, semAcaoExtra: !!faixaCarga.semAcaoExtra },
    },
  };
}

// Resolve o título conferido pela especialização (se houver)
function tituloDoPersonagem(p) {
  if (!p.especializacao || !p.profissao) return null;
  const list = GAME_DATA.especializacoes[p.profissao] || [];
  const found = list.find((x) => x.esp === p.especializacao);
  return found ? found.titulo : null;
}

/* ============================== [10] Helpers de HABILIDADES ============================== */

// Os 4 helpers abaixo recebem `habilidadesByKey` (map { [key]: row }) como
// último parâmetro — antes essa info vinha do constante `HABILIDADES_BY_KEY`,
// que sumiu na migration 008 (habilidades vivem no banco agora). Quem chama
// monta o mapa via useMemo a partir do `habilidadesDb` carregado do Supabase.

// Total de pontos de habilidade acumulado: o orçamento por estágio (definido
// na profissão) é concedido novamente a cada estágio alcançado.
function pontosHabilidadesTotal(profissao, estagio) {
  const base = GAME_DATA.profissoes[profissao]?.habilidadesPontos ?? 0;
  return base * estagio;
}

// Custo gasto: soma de (níveis comprados × custo da habilidade)
function gastoHabilidades(habilidadesObj, habilidadesByKey) {
  if (!habilidadesObj || !habilidadesByKey) return 0;
  return Object.entries(habilidadesObj).reduce((sum, [key, niveis]) => {
    const h = habilidadesByKey[key];
    if (!h) return sum;
    return sum + (niveis || 0) * h.custo;
  }, 0);
}

// Quantas habilidades distintas foram compradas (com pelo menos 1 nível acima do inicial)
function qtdHabilidades(habilidadesObj) {
  if (!habilidadesObj) return 0;
  return Object.values(habilidadesObj).filter((n) => (n || 0) > 0).length;
}

// Limite de QUANTIDADE de habilidades distintas: total de pontos + floor(estagio/2)
function limiteQtdHabilidades(profissao, estagio) {
  return pontosHabilidadesTotal(profissao, estagio) + Math.floor(estagio / 2);
}

// Nível ATUAL de uma habilidade = nivel_inicial + níveis comprados
function nivelHabilidade(habKey, habilidadesObj, habilidadesByKey) {
  const h = habilidadesByKey?.[habKey];
  if (!h) return 0;
  const comprado = habilidadesObj?.[habKey] || 0;
  return (h.nivel_inicial ?? h.nivelInicial ?? 0) + comprado;
}

// Total da habilidade: -7 + bonus + atributo_de_ajuste + nivel_atual
function totalHabilidade(habKey, habilidadesObj, atributos, bonusObj, habilidadesByKey) {
  const h = habilidadesByKey?.[habKey];
  if (!h) return 0;
  const comprado = habilidadesObj?.[habKey] || 0;
  const bonus = bonusObj?.[habKey] || 0;
  const atr = atributos[h.ajuste] || 0;
  if (comprado === 0) return -7 + bonus + atr;
  return comprado + bonus + atr;
}

// ── Bônus de habilidade por raça e reino ──────────────────────────────────
// As colunas `vantagem` e `desvantagem` da tabela `habilidades` (vindas do
// CSV oficial) listam raças OU reinos separados por vírgula. Para cada
// habilidade, se a raça do PJ ou seu reino estiver em `vantagem`, soma +2
// no total; se estiver em `desvantagem`, soma -2. Se cair em ambos (caso
// raro), líquido = 0.
//
// O match é tolerante a acentos, hífens e espaços ("Porto-Livre" casa com
// "Porto Livre") — defensa contra futuras grafias inconsistentes. A
// uniformização semântica (Dantsem→Dantsen, Porto-Livre→Porto Livre) foi
// aplicada via migration 009.
function _normalizaTokenBonus(s) {
  if (!s) return '';
  return s.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s\-]+/g, '').toLowerCase();
}

function _tokenCasa(needleNorm, list) {
  if (!needleNorm) return false;
  for (const item of list) {
    if (_normalizaTokenBonus(item) === needleNorm) return true;
  }
  return false;
}

// Retorna { [habKey]: ±2 } pras habilidades em que o PJ tem vantagem ou
// desvantagem. Habilidades neutras ficam de fora do objeto (não ocupam slot).
function calcBonusHabilidadesRacaReino(raca, reino, habilidadesDb) {
  if (!habilidadesDb || (!raca && !reino)) return {};
  const racaN  = _normalizaTokenBonus(raca);
  const reinoN = _normalizaTokenBonus(reino);
  const bonus = {};
  for (const h of habilidadesDb) {
    let b = 0;
    if (h.vantagem) {
      const list = h.vantagem.split(',').map((s) => s.trim()).filter(Boolean);
      if (_tokenCasa(racaN, list) || _tokenCasa(reinoN, list)) b += 2;
    }
    if (h.desvantagem) {
      const list = h.desvantagem.split(',').map((s) => s.trim()).filter(Boolean);
      if (_tokenCasa(racaN, list) || _tokenCasa(reinoN, list)) b -= 2;
    }
    if (b !== 0) bonus[h.key] = b;
  }
  return bonus;
}

/* ============================== [11] Helpers de MAGIAS ============================== */

/* Pontos-base de magia por estágio (reforma de 22/10/2026). Pedido do
   usuário: "qualquer profissão pode aprender qualquer magia" — pelo item que
   a ensina (pergaminho ou livro, RPC aprender_magia). Faixas: alta (Mago,
   Bardo), média (Rastreador, Sacerdote), baixa (Guerreiro, Ladino). */
const MAGIAS_BASE_POR_PROFISSAO = {
  'Mago': 8, 'Bardo': 8,
  'Rastreador': 5, 'Sacerdote': 5,
  'Guerreiro': 1, 'Ladino': 1,
};

/* Era: por estágio = base + intelecto + aura (até 06/11/2026, ver abaixo), atributo negativo contando 0, e
   "Personagem com Aura negativa tem base 0" (usuário, 22/10/2026).
   Atributos = intelecto_base/aura_base GRAVADOS: o espelho SQL
   (_menestrel_pontos_magia_por_estagio) não conhece os ajustes de sub-raça,
   e as duas contas precisam bater. */
/* SÓ O INTELECTO SOMA (06/11/2026, usuário: "A quantidade de pontos de
   magia deve ser por estágio + pontos de intelecto"): por estágio = base +
   Intelecto. A Aura não soma mais — mas a regra da Aura negativa continua
   zerando a base (escolha do usuário no mesmo dia). */
function pontosMagiasPorEstagio(profissao, intelecto, aura) {
  const a = Number(aura) || 0;
  const i = Number(intelecto) || 0;
  const base = a < 0 ? 0 : (MAGIAS_BASE_POR_PROFISSAO[profissao] || 0);
  return base + Math.max(0, i);
}

function pontosMagiasTotal(profissao, estagio, intelecto, aura) {
  return pontosMagiasPorEstagio(profissao, intelecto, aura) * (Number(estagio) || 0);
}

function gastoMagias(magiasObj, magiasDb) {
  if (!magiasObj || !magiasDb) return 0;
  return Object.entries(magiasObj).reduce((sum, [key, passos]) => {
    const m = magiasDb.find((x) => x.key === key);
    if (!m) return sum;
    return sum + nivelMagiaEfetivo(passos || 0) * (m.custo || 0);
  }, 0);
}

/* Magia básica x avançada pela permissão (03/09/2026) saiu em 22/10/2026:
   a permissão deixou de existir nas magias, e a ficha divide pelo TIPO
   (Básicas; Perdidas e Ancestrais). */

// Converte passos comprados (1..5) → nível efetivo (1, 3, 5, 7, 9).
function nivelMagiaEfetivo(passos) {
  const p = passos || 0;
  return p > 0 ? p * 2 - 1 : 0;
}

// Os cinco níveis de uma magia, na ordem em que se compram.
const NIVEIS_MAGIA = [1, 3, 5, 7, 9];

/* Até onde esta magia PODE ser comprada, pelo texto que ela tem.

   Cada nível vive numa coluna própria (nivel_1 … nivel_9). O admin pode
   apagar o texto de um nível (pedido do usuário em 11/09/2026: "ao editar
   uma magia, permitir excluir um nível, impedindo que o jogador compre
   ele"), e nível sem texto não existe: não há o que comprar.

   A contagem para no PRIMEIRO buraco, em vez de contar os preenchidos.
   Apagar o nível 5 e deixar o 7 não deve permitir pular do 3 pro 7 — os
   passos são sequenciais, então o buraco é o teto. Se alguém apagar o
   nível 1, a magia inteira fica sem passos, que é a leitura certa de uma
   magia cujo primeiro nível não existe mais. */
function passosDisponiveisMagia(magia) {
  if (!magia) return 0;
  let passos = 0;
  for (const nivel of NIVEIS_MAGIA) {
    const texto = magia['nivel_' + nivel];
    if (texto == null || String(texto).trim() === '') break;
    passos += 1;
  }
  return passos;
}

/* ── CLASSE DA MAGIA E A REGRA DOS MILAGRES (22/10/2026) ──────────────
   "Feitiço = arcana (magos), Milagre = divina (sacerdotes), Encanto =
   artística (bardos), Transmutação = espiritual (rastreadores). Um
   personagem vampiro, lobisomem ou sem religião não pode usar ou ser alvo
   de milagres. Uma criatura de elemento 'escuridão' não pode usar milagres."
   Decisões do usuário: Escuridão vale para todo ator (Mago incluído);
   criatura não tem religião e não é barrada por isso; quem não pode usar
   por motivo PERMANENTE também não aprende; a Licantropia temporária só
   barra o uso. Espelho SQL (só os permanentes): aprender_magia. */
const CLASSES_MAGIA = ['Feitiço', 'Milagre', 'Encanto', 'Transmutação'];

function _subracaDoPj(pj, dataJogo) {
  if (typeof subracaEfetiva === 'function') return subracaEfetiva(pj, dataJogo);
  return (pj && pj.subraca) || null;
}

function atorMilagreDePj(pj, dataJogo) {
  return {
    tipo: 'pj',
    deus: (pj && pj.deus) || null,
    subraca: _subracaDoPj(pj, dataJogo),
    subraca_fixa: (pj && pj.subraca) || null,
    subtipo: null,
    elementos: chavesDeElemento(elementoDaProfissao(pj && pj.profissao)),
  };
}

function atorMilagreDeCriatura(cri) {
  return {
    tipo: 'criatura', deus: null, subraca: null, subraca_fixa: null,
    subtipo: (cri && cri.subtipo) || null,
    elementos: chavesDeElemento(cri && cri.elemento),
  };
}

function _forma(ator, permanente) {
  if (!ator) return null;
  if (ator.tipo === 'criatura') return ator.subtipo || null;
  return permanente ? ator.subraca_fixa : ator.subraca;
}

function bloqueioMilagre(ator, opcoes) {
  if (!ator) return null;
  const forma = _forma(ator, !!(opcoes && opcoes.permanente));
  if (forma === 'Vampiro') return { motivo: 'milagre_vampiro' };
  if (forma === 'Lobisomem') return { motivo: 'milagre_lobisomem' };
  if (ator.tipo === 'pj' && !String(ator.deus || '').trim()) return { motivo: 'milagre_sem_religiao' };
  if ((ator.elementos || []).includes('escuridao')) return { motivo: 'milagre_escuridao' };
  return null;
}

function alvoDeMilagreBloqueado(ator) {
  if (!ator) return null;
  const forma = _forma(ator, false);
  if (forma === 'Vampiro') return { motivo: 'alvo_milagre_vampiro' };
  if (forma === 'Lobisomem') return { motivo: 'alvo_milagre_lobisomem' };
  if (ator.tipo === 'pj' && !String(ator.deus || '').trim()) return { motivo: 'alvo_milagre_sem_religiao' };
  return null;
}

function motivoMilagreLabel(motivo, en) {
  const t = {
    milagre_vampiro:           ['Vampiros não usam milagres.', 'Vampires cannot use miracles.'],
    milagre_lobisomem:         ['Lobisomens não usam milagres.', 'Werewolves cannot use miracles.'],
    milagre_sem_religiao:      ['Sem religião, não há milagre.', 'Without a faith, there is no miracle.'],
    milagre_escuridao:         ['A Escuridão não conjura milagres.', 'Darkness cannot cast miracles.'],
    alvo_milagre_vampiro:      ['Vampiros não recebem milagres.', 'Vampires cannot receive miracles.'],
    alvo_milagre_lobisomem:    ['Lobisomens não recebem milagres.', 'Werewolves cannot receive miracles.'],
    alvo_milagre_sem_religiao: ['Sem religião, não recebe milagres.', 'Without a faith, cannot receive miracles.'],
  }[motivo];
  return t ? t[en ? 1 : 0] : null;
}

/* Por que este PJ não pode aprender o PRÓXIMO nível desta magia agora?
   Mesmos motivos e mesma ordem da RPC aprender_magia — a tela antecipa a
   recusa para o botão já nascer desativado com o porquê. null = pode. */
/* ── FILA DE TREINO (22/10/2026) ───────────────────────────────────────
   O que se compra no Estudar entra em personagens.treinos e só vira usável
   depois do tempo de jogo na atividade certa (avancarTreinos, clima-
   desgaste.jsx). Já está PAGO: o gasto e o próximo nível contam a fila. */
const ATIVIDADE_DA_CLASSE = { 'Feitiço': 'estudando', 'Milagre': 'orando', 'Transmutação': 'meditando', 'Encanto': 'praticando' };
/* QUANTO CUSTA APRENDER, EM HORAS DE ATIVIDADE (28/10/2026, usuário: "uma
   habilidade demora 12 horas, uma magia 24 horas, uma técnica 36 horas").

   Técnica caiu de 72 para 36 — era o dobro de agora desde o começo. E
   HABILIDADE entrou, que não existia aqui.

   O tempo é o preço da PRIMEIRA aquisição, não de cada nível: "só precisa de
   aprendizado quando o personagem não tem nenhum nível, representa uma compra
   nova; depois de aprender o nível 1, ao comprar ativa instantaneamente"
   (mesmo dia). Quem lê isto na tela é explicacaoDaAtividade, em
   01-core/clima-desgaste.jsx. */
const HORAS_TREINO = { tecnica: 36, magia: 24, habilidade: 12 };

// Maior nível desta técnica/magia na fila (0 se não houver).
function nivelNaFila(treinos, tipo, key) {
  return (Array.isArray(treinos) ? treinos : [])
    .filter((t) => t && t.tipo === tipo && t.key === key)
    .reduce((m, t) => Math.max(m, Number(t.nivel) || 0), 0);
}

// O objeto de níveis com a fila somada: cada key fica com o maior.
function comFila(obj, treinos, tipo) {
  const out = { ...(obj || {}) };
  (Array.isArray(treinos) ? treinos : []).forEach((t) => {
    if (!t || t.tipo !== tipo) return;
    out[t.key] = Math.max(Number(out[t.key]) || 0, Number(t.nivel) || 0);
  });
  return out;
}

/* Por que este PJ não pode comprar o PRÓXIMO nível desta técnica? Mesmos
   motivos e ordem da RPC aprender_tecnica. null = pode. */
function bloqueioAprenderTecnica(tecnica, pj, tecnicasDb) {
  if (!tecnica) return { motivo: 'tecnica_nao_encontrada' };
  const niveis = comFila(pj && pj.tecnicas, pj && pj.treinos, 'tecnica');
  const alvo = (Number(niveis[tecnica.key]) || 0) + 1;
  const estagio = calcEstagio((pj && pj.experiencia) || 0);
  if (alvo > estagio) return { motivo: 'acima_do_estagio' };
  const lista = Array.isArray(tecnicasDb) && tecnicasDb.some((t) => t.key === tecnica.key)
    ? tecnicasDb : [...(tecnicasDb || []), tecnica];
  const total = pontosTecnicasTotal(pj && pj.profissao, estagio, pj && pj.intelecto_base);
  const gasto = gastoTecnicas(niveis, lista);
  const gastoNovo = gastoTecnicas({ ...niveis, [tecnica.key]: alvo }, lista);
  if (gastoNovo > total) return { motivo: 'pontos_insuficientes', faltam: gastoNovo - total, gasto, total };
  return null;
}

function bloqueioAprenderMagia(magia, pj, magiasDb) {
  if (!magia) return { motivo: 'magia_nao_encontrada' };
  // A fila conta como aprendido (já foi pago), para o próximo passo e o gasto.
  const magias = comFila(pj && pj.magias, pj && pj.treinos, 'magia');
  const passos = Number(magias[magia.key]) || 0;
  if (passos >= 5) return { motivo: 'ja_no_maximo' };
  // Milagre (22/10/2026): bloqueio PERMANENTE impede aprender.
  if (magia.classe === 'Milagre') {
    const bm = bloqueioMilagre(atorMilagreDePj(pj), { permanente: true });
    if (bm) return bm;
  }
  const alvo = passos + 1;
  if (alvo > passosDisponiveisMagia(magia)) return { motivo: 'nivel_sem_texto' };
  const estagio = calcEstagio((pj && pj.experiencia) || 0);
  if (nivelMagiaEfetivo(alvo) > estagio) return { motivo: 'acima_do_estagio' };
  const lista = Array.isArray(magiasDb) && magiasDb.some((m) => m.key === magia.key)
    ? magiasDb : [...(magiasDb || []), magia];
  const total = pontosMagiasTotal(pj && pj.profissao, estagio, pj && pj.intelecto_base, pj && pj.aura_base);
  const gasto = gastoMagias(magias, lista);
  const gastoNovo = gastoMagias({ ...magias, [magia.key]: alvo }, lista);
  if (gastoNovo > total) return { motivo: 'pontos_insuficientes', faltam: gastoNovo - total, gasto, total };
  return null;
}

/* ── SUBIR DE NÍVEL PELA FICHA (05/11/2026) ────────────────────────────
   Regra de 28/10/2026: "só precisa de aprendizado quando o personagem não
   tem nenhum nível, representa uma compra nova; depois de aprender o nível
   1, ao comprar ativa instantaneamente." E em 05/11: o próximo nível se
   compra na ficha, sem item; habilidade nova leva 12 horas em Treinar.

   Mesmas recusas e mesma ordem da RPC subir_nivel
   (scripts/sql/subir-nivel-2026-11-05.sql) — a tela antecipa a recusa para
   a ação já nascer apagada com o porquê. null = pode.
   tipo: 'magia' | 'tecnica' | 'habilidade'. `item` é a linha do catálogo;
   `catalogo` é a lista (magias/técnicas) ou o mapa por key (habilidades). */
function bloqueioSubirNivel(tipo, item, pj, catalogo) {
  if (!item) return { motivo: tipo + '_nao_encontrada' };
  const fila = Array.isArray(pj && pj.treinos) ? pj.treinos : [];
  if (fila.some((t) => t && t.tipo === tipo && t.key === item.key)) return { motivo: 'em_treino' };
  if (tipo === 'magia') {
    if (!(Number((pj && pj.magias || {})[item.key]) > 0)) return { motivo: 'nao_aprendida' };
    return bloqueioAprenderMagia(item, pj, catalogo);
  }
  if (tipo === 'tecnica') {
    if (!(Number((pj && pj.tecnicas || {})[item.key]) > 0)) return { motivo: 'nao_aprendida' };
    return bloqueioAprenderTecnica(item, pj, catalogo);
  }
  // Habilidade: sem nível também se compra — vai para a fila (12 h).
  const porKey = catalogo || {};
  const niveis = comFila(pj && pj.habilidades, fila, 'habilidade');
  const alvo = (Number(niveis[item.key]) || 0) + 1;
  const estagio = calcEstagio((pj && pj.experiencia) || 0);
  if ((Number(item.nivel_inicial) || 0) + alvo > estagio) return { motivo: 'acima_do_estagio' };
  const mapa = porKey[item.key] ? porKey : { ...porKey, [item.key]: item };
  const total = pontosHabilidadesTotal(pj && pj.profissao, estagio);
  const gastoNovo = gastoHabilidades({ ...niveis, [item.key]: alvo }, mapa);
  if (gastoNovo > total) return { motivo: 'pontos_insuficientes', faltam: gastoNovo - total };
  return null;
}

/* Quantos pontos o PRÓXIMO nível custa. Magia sobe de dois em dois níveis
   efetivos (1 → 3 → 5), então custa o dobro depois do primeiro. */
function custoSubirNivel(tipo, item, pj) {
  if (!item) return 0;
  const custo = Number(item.custo) || 0;
  if (tipo !== 'magia') return custo;
  const passos = Number((pj && pj.magias || {})[item.key]) || 0;
  return (nivelMagiaEfetivo(passos + 1) - nivelMagiaEfetivo(passos)) * custo;
}

/* É compra nova (vai para a fila) ou sobe na hora? Só habilidade sem nível
   chega aqui como compra nova — magia e técnica novas vêm pelo item. */
function subirNivelEhAprendizado(tipo, item, pj) {
  if (tipo !== 'habilidade' || !item) return false;
  return !(Number((pj && pj.habilidades || {})[item.key]) > 0) && !(Number(item.nivel_inicial) > 0);
}

function motivoSubirNivelLabel(motivo, tipo, en) {
  const pontos = {
    magia: ['Pontos de magia insuficientes.', 'Not enough magic points.'],
    tecnica: ['Pontos de técnica insuficientes.', 'Not enough technique points.'],
    habilidade: ['Pontos de habilidade insuficientes.', 'Not enough skill points.'],
  }[tipo] || ['Pontos insuficientes.', 'Not enough points.'];
  const t = {
    em_treino:            ['Ainda em aprendizado — termine o treino antes de subir.', 'Still being learned — finish training first.'],
    nao_aprendida:        ['O primeiro nível se aprende pelo pergaminho ou livro.', 'The first level is learned from a scroll or book.'],
    ja_no_maximo:         ['Já está no nível máximo.', 'Already at the highest level.'],
    nivel_sem_texto:      ['O próximo nível não existe no catálogo — peça ao Mestre.', 'The next level is not in the catalog — ask the GM.'],
    acima_do_estagio:     ['O próximo nível passa do seu estágio.', "The next level exceeds your character's stage."],
    pontos_insuficientes: pontos,
  }[motivo];
  if (t) return t[en ? 1 : 0];
  const milagre = motivoMilagreLabel(motivo, en);
  if (milagre) return milagre;
  return en ? 'Could not raise the level.' : 'Não foi possível subir o nível.';
}

/* ============================== [12] Helpers de TÉCNICAS DE COMBATE ============================== */
/* Pontos de técnica (reforma de 22/10/2026): base por profissão + Físico +
   Agilidade, por estágio — atributo negativo conta 0, sem regra de base
   zero. Bases mais baixas que a tabela antiga (7/5/6/2/6/4) porque agora os
   atributos somam: com elas o orçamento fica perto do de antes e premia quem
   investiu no corpo (decisão do usuário). Espelho SQL:
   _menestrel_pontos_tecnica_por_estagio. Técnica se aprende pelo item
   (aprender_tecnica) e entra na fila de treino. */
/* BASE NOVA E INTELECTO (06/11/2026, usuário: "A quantidade de pontos de
   técnica deve ser por estágio + pontos de intelecto. […] o Ladino terá 8, o
   Mago terá 1, o Guerreiro terá 10, o Sacerdote e o Bardo terão 3, o
   Rastreador terá 6"). Por estágio = base + Intelecto (negativo conta 0);
   Físico e Agilidade saíram da conta. Espelho SQL atualizado no mesmo dia
   (scripts/sql/pontos-intelecto-2026-11-06.sql). */
const TECNICAS_BASE_POR_PROFISSAO = {
  'Guerreiro': 10, 'Ladino': 8, 'Rastreador': 6, 'Sacerdote': 3, 'Bardo': 3, 'Mago': 1,
};

function pontosTecnicasPorEstagio(profissao, intelecto) {
  return (TECNICAS_BASE_POR_PROFISSAO[profissao] || 0) + Math.max(0, Number(intelecto) || 0);
}

function pontosTecnicasTotal(profissao, estagio, intelecto) {
  return pontosTecnicasPorEstagio(profissao, intelecto) * (Number(estagio) || 0);
}

/* COMO SE CHEGOU AO NÚMERO (06/11/2026, usuário: "Junto com a informação
   dos pontos, insira um texto explicando como ele chegou naquele número").
   A frase refaz, com os números do personagem, as MESMAS contas de
   pontosHabilidadesTotal / pontosTecnicasPorEstagio / pontosMagiasPorEstagio
   — mudou a regra lá, a frase muda junto, porque lê as mesmas tabelas.
   tipo: 'habilidade' | 'tecnica' | 'magia'; pj: profissao e os atributos de
   base gravados; gasto: o que já saiu (com a fila de treino). */
function explicacaoDosPontos(tipo, pj, estagio, gasto, en) {
  const p = pj || {};
  const prof = p.profissao || (en ? 'no profession' : 'sem profissão');
  const e = Number(estagio) || 0;
  const n = (v) => Number(v) || 0;
  const pos = (v) => Math.max(0, n(v));
  let porEstagio, conta;
  if (tipo === 'habilidade') {
    porEstagio = GAME_DATA.profissoes[p.profissao]?.habilidadesPontos ?? 0;
    conta = en ? `${prof} earns ${porEstagio} skill points per stage.`
               : `${prof} ganha ${porEstagio} pontos de habilidade por estágio.`;
  } else if (tipo === 'tecnica') {
    const base = TECNICAS_BASE_POR_PROFISSAO[p.profissao] || 0;
    porEstagio = pontosTecnicasPorEstagio(p.profissao, p.intelecto_base);
    conta = en
      ? `Per stage: ${base} from ${prof} + ${pos(p.intelecto_base)} Intellect = ${porEstagio}.`
      : `Por estágio: ${base} de ${prof} + ${pos(p.intelecto_base)} de Intelecto = ${porEstagio}.`;
    if (n(p.intelecto_base) < 0) {
      conta += en ? ' A negative Intellect counts as 0.' : ' Intelecto negativo conta 0.';
    }
  } else {
    const auraNeg = n(p.aura_base) < 0;
    const base = auraNeg ? 0 : (MAGIAS_BASE_POR_PROFISSAO[p.profissao] || 0);
    porEstagio = pontosMagiasPorEstagio(p.profissao, p.intelecto_base, p.aura_base);
    conta = en
      ? `Per stage: ${base} from ${prof} + ${pos(p.intelecto_base)} Intellect = ${porEstagio}.`
      : `Por estágio: ${base} de ${prof} + ${pos(p.intelecto_base)} de Intelecto = ${porEstagio}.`;
    if (auraNeg) conta += en ? ' Negative Aura zeroes the profession base.' : ' Aura negativa zera a base da profissão.';
    if (n(p.intelecto_base) < 0) conta += en ? ' A negative Intellect counts as 0.' : ' Intelecto negativo conta 0.';
  }
  const total = porEstagio * e;
  const g = n(gasto);
  const nome = { habilidade: en ? 'skill' : 'habilidade', tecnica: en ? 'technique' : 'técnica', magia: en ? 'spell' : 'magia' }[tipo];
  const custo = tipo === 'magia'
    ? (en ? 'level × cost of each spell' : 'nível × custo de cada magia')
    : (en ? `level × cost of each ${nome}` : `nível × custo de cada ${nome}`);
  return [
    conta,
    en ? `Stage ${e}: ${porEstagio} × ${e} = ${total}.` : `Estágio ${e}: ${porEstagio} × ${e} = ${total}.`,
    en ? `Spent: ${g} (${custo}, counting what is in training). Left: ${total - g}.`
       : `Gastos: ${g} (${custo}, contando o que está em treino). Sobram ${total - g}.`,
  ].join(' ');
}

function gastoTecnicas(tecnicasObj, tecnicasDb) {
  if (!tecnicasObj || !tecnicasDb) return 0;
  return Object.entries(tecnicasObj).reduce((sum, [key, nivel]) => {
    if (!nivel) return sum;
    const t = tecnicasDb.find((x) => x.key === key);
    return sum + (nivel * (t?.custo || 0));
  }, 0);
}

function qtdTecnicas(tecnicasObj) {
  if (!tecnicasObj) return 0;
  return Object.values(tecnicasObj).filter((v) => !!v).length;
}

function totalTecnica(tecnica, tecnicasObj, atributos) {
  const comprado = tecnicasObj?.[tecnica.key] || 0;
  const atr = atributos[tecnica.ajuste] || 0;
  if (comprado === 0) return -7 + atr;
  return comprado + atr;
}


/* ============================== [12.5] Helpers de GRUPOS DE ARMAS ============================== */
// Catálogo fixo dos 11 grupos. A sigla é o key (igual aos CSVs de origem do Tagmar).
// Diferente de magias/técnicas, NÃO há query no banco — o catálogo vive aqui.
const GRUPOS_ARMAS = [
  { sigla: 'CD', nome: 'Combate Desarmado',       nomeEn: 'Unarmed Combat',     custo: 2, exemplos: 'Incluem punhos, soqueiras e armas de pequeno porte voltadas para golpes rápidos e combate corpo a corpo ágil.' },
  { sigla: 'CI', nome: 'Combate de Imobilização', nomeEn: 'Grappling',          custo: 2, exemplos: 'Redes, boleadeiras e equipamentos semelhantes, usados para restringir movimentos, derrubar ou imobilizar adversários.' },
  { sigla: 'CL', nome: 'Corte Leve',              nomeEn: 'Light Slashing',     custo: 2, exemplos: 'Facas, machadinhas e armas compactas que combinam praticidade, velocidade e versatilidade em combate.' },
  { sigla: 'CM', nome: 'Corte Médio',             nomeEn: 'Medium Slashing',    custo: 3, exemplos: 'Espadas comuns, foices e lâminas de médio porte projetadas para golpes precisos e eficientes.' },
  { sigla: 'CP', nome: 'Corte Pesado',            nomeEn: 'Heavy Slashing',     custo: 4, exemplos: 'Espadas montantes, grandes machados e armas similares que sacrificam velocidade em troca de alcance e poder destrutivo.' },
  { sigla: 'PL', nome: 'Perfuração Leve',         nomeEn: 'Light Piercing',     custo: 2, exemplos: 'Zarabatanas, adagas e outras armas facilmente ocultáveis, ideais para furtividade e ataques rápidos.' },
  { sigla: 'PM', nome: 'Perfuração Média',        nomeEn: 'Medium Piercing',    custo: 3, exemplos: 'Lanças, arcos e armamentos que permitem manter distância do inimigo ou atacá-lo à distância.' },
  { sigla: 'PP', nome: 'Perfuração Pesada',       nomeEn: 'Heavy Piercing',     custo: 4, exemplos: 'Arpões, bestas e equipamentos especializados em disparos potentes contra armaduras pesadas.' },
  { sigla: 'EL', nome: 'Esmagamento Leve',        nomeEn: 'Light Bludgeoning',  custo: 2, exemplos: 'Porretes, cajados e instrumentos improvisados que dependem mais da técnica do que da complexidade.' },
  { sigla: 'EM', nome: 'Esmagamento Médio',       nomeEn: 'Medium Bludgeoning', custo: 3, exemplos: 'Clavas, maças e armamentos focados em esmagar armaduras e causar danos contundentes.' },
  { sigla: 'EP', nome: 'Esmagamento Pesado',      nomeEn: 'Heavy Bludgeoning',  custo: 4, exemplos: 'Martelos, marretas e armas extremamente pesadas, capazes de desferir golpes devastadores contra armaduras pesadas e estruturas.' },
];

// Lookup sigla → grupo (consultas O(1))
const GRUPOS_ARMAS_BY_SIGLA = GRUPOS_ARMAS.reduce((acc, g) => { acc[g.sigla] = g; return acc; }, {});

// Pontos por estágio por profissão (CSV "DATABASE_TAGMAR_-_LISTA_GRUPO_ARMAS_PONTOS").
// Profissão fora desta tabela = 0 pontos (step ainda aparece mas com mensagem de vazio).
const GRUPOS_ARMAS_POR_PROFISSAO = {
  'Guerreiro':  { pontosPorEstagio: 12 },
  'Ladino':     { pontosPorEstagio: 10 },
  'Sacerdote':  { pontosPorEstagio:  8 },
  'Mago':       { pontosPorEstagio:  4 },
  'Rastreador': { pontosPorEstagio: 10 },
  'Bardo':      { pontosPorEstagio:  6 },
};

function pontosGruposArmasTotal(profissao, estagio) {
  const cfg = GRUPOS_ARMAS_POR_PROFISSAO[profissao];
  if (!cfg) return 0;
  return cfg.pontosPorEstagio * estagio;
}

// Custo gasto = soma de (nível × custo) por grupo. Mesma fórmula de habilidades/técnicas.
function gastoGruposArmas(gruposObj) {
  if (!gruposObj) return 0;
  return Object.entries(gruposObj).reduce((sum, [sigla, nivel]) => {
    const g = GRUPOS_ARMAS_BY_SIGLA[sigla];
    if (!g) return sum;
    return sum + (nivel || 0) * g.custo;
  }, 0);
}

// Quantos grupos distintos têm nível > 0.
function qtdGruposArmas(gruposObj) {
  if (!gruposObj) return 0;
  return Object.values(gruposObj).filter((v) => (v || 0) > 0).length;
}

// Bônus em L/M/P aplicado quando o PJ usa uma arma do grupo informado.
// Soma direta: nível 2 em PM → L+2, M+2, P+2. Retorna 0 se o grupo não foi treinado.
// Usado pela ficha do PJ ao calcular L/M/P efetivos da arma equipada.
function bonusGrupoArma(sigla, gruposObj) {
  if (!sigla) return 0;
  return gruposObj?.[sigla] || 0;
}

/* ============================== [13] Helpers de APRIMORAMENTOS (idioma, religião, arte, sabedoria) ============================== */

// Idiomas que o personagem JÁ sabe por padrão (não contam como aprimoramento):
//   - Malês: comum a todos os reinos
//   - idioma racial (se houver)
//   - idioma do reino natal (se houver)
function idiomasIniciais(raca, reino) {
  const arr = ['Malês'];
  const iRaca = GAME_DATA.idiomaPorRaca[raca];
  if (iRaca && !arr.includes(iRaca)) arr.push(iRaca);
  const iReino = GAME_DATA.idiomaPorReino[reino];
  if (iReino && !arr.includes(iReino)) arr.push(iReino);
  return arr;
}

// Quantos slots de aprimoramento o personagem já liberou para uma habilidade,
// dado o TOTAL dessa habilidade na ficha.
// Regras (do CSV): idioma a cada 10, religião a cada 5, arte/sabedoria a cada 7.
function slotsAprimoramento(habKey, totalDaHab) {
  const div = GAME_DATA.aprimoramentoPorHab[habKey];
  if (!div) return 0;
  return Math.max(0, Math.floor((totalDaHab || 0) / div));
}

// Opções escolhíveis para cada habilidade aprimorável.
// Para 'idioma' descontamos os já nativos para não aparecerem como escolha.
function opcoesAprimoramento(habKey, raca, reino) {
  if (habKey === 'idioma') {
    const nativos = idiomasIniciais(raca, reino);
    return GAME_DATA.idiomasDisponiveis.filter((x) => !nativos.includes(x));
  }
  if (habKey === 'religiao')  return GAME_DATA.religioesDisponiveis;
  if (habKey === 'arte')      return GAME_DATA.artesDisponiveis;
  if (habKey === 'sabedoria') return GAME_DATA.sabedoriasDisponiveis;
  return [];
}

/* ============================== [14] TABELAS DE COMBATE — Resolução de Ação + Resistência ============================== */
/*
   Fundação do Sistema de Batalha. Regras estáticas (iguais p/ todos), então
   ficam como constantes/funções aqui no módulo de regras — sem tabela no
   Supabase, sem round-trip, lookup instantâneo.

   • Tabela de Resolução de Ação (20×58): linha = d20 (1..20), coluna = Total
     da ação (Coluna de Ação, -7..50, com clamp). Cada célula guarda um índice
     de qualidade 0..7 -> RESULTADOS_ACAO. d20=1 é sempre Falha Crítica;
     d20=20 é sempre Absurdo (crítico). "Impossível" NÃO está na matriz: é
     condição externa (ação que nem pode ser testada) tratada pela UI.

   • Tabela de Resistência (20×20): fórmula fechada (sem dados). Cruza Força de
     Ataque (1..20) com Força de Defesa / Resistência (1..20) e devolve o
     número-alvo no d20 p/ RESISTIR. Empate (dado == alvo) => rolar de novo.
*/

// Índice de qualidade -> metadados. dano = multiplicador aplicado ao dano-base.
const RESULTADOS_ACAO = [
  { q: 0, codigo: 'FC', pt: 'Falha Crítica', en: 'Critical Failure', cor: '#10b020', dano: 0,    erra: true,  autodano: true,  critico: false },
  { q: 1, codigo: 'R',  pt: 'Rotineiro',     en: 'Routine',          cor: '#f3f3f3', dano: 0,    erra: true,  autodano: false, critico: false },
  { q: 2, codigo: 'F',  pt: 'Fácil',         en: 'Easy',             cor: '#ffe600', dano: 0.25, erra: false, autodano: false, critico: false },
  { q: 3, codigo: 'M',  pt: 'Médio',         en: 'Medium',           cor: '#ff9600', dano: 0.50, erra: false, autodano: false, critico: false },
  { q: 4, codigo: 'D',  pt: 'Difícil',       en: 'Hard',             cor: '#e10000', dano: 0.75, erra: false, autodano: false, critico: false },
  { q: 5, codigo: 'MD', pt: 'Muito Difícil', en: 'Very Hard',        cor: '#4080f0', dano: 1.00, erra: false, autodano: false, critico: false },
  { q: 6, codigo: 'E',  pt: 'Espetacular',   en: 'Spectacular',      cor: '#0000cd', dano: 1.25, erra: false, autodano: false, critico: false },
  { q: 7, codigo: 'A',  pt: 'Absurdo',       en: 'Absurd',           cor: '#808080', dano: 1.50, erra: false, autodano: false, critico: true  },
];

// 20 linhas (d20 1..20) × 58 chars (Coluna de Ação -7..50). 1 char = índice 0..7.
const RESOLUCAO_ROWS = [
  "0000000000000000000000000000000000000000000000000000000000",
  "0000000011111111111122222222222222222222222222222222222222",
  "0000001111111111112222222222223333333333333333333333333333",
  "0001111111111111122222222233333333333333333333334444444444",
  "0011111111111112222222222333333333333333333344444444444555",
  "0111111111111122222222233333333333333444444444444455555555",
  "1111111111111222222222333333333444444444444444455555555556",
  "1111111111222222223333333334444444444444444455555555555566",
  "1111111112222222233333333444444444444444444555555555555666",
  "1111111222222223333333344444444444444444555555555555555666",
  "1111112222222333333333444444444455555555555555555555556666",
  "1111222222333333334444444444455555555555555555555556666666",
  "1122222223333333344444444444555555555555555555566666666666",
  "1222223333333334444444444455555555555555556666666666666666",
  "2222333333444444444444555555555555555666666666666666666667",
  "2233333334444444444445555555555566666666666666666666666677",
  "3333344444444444455555555555666666666666666666666666666777",
  "4444444444555555555555566666666666666666666666666666777777",
  "5555555555555555556666666666666666666666666666666677777777",
  "7777777777777777777777777777777777777777777777777777777777"
];

const ACAO_COL_MIN = -7;
const ACAO_COL_MAX = 50;

// Resolve uma ação na Tabela de Resolução.
// coluna: Total da ação (será clampado em [-7,50]). d20: valor rolado (1..20).
// Retorna o objeto de RESULTADOS_ACAO (+ a coluna efetiva já clampada).
function resolverAcao(coluna, d20) {
  const d = Math.max(1, Math.min(20, Math.round(d20)));
  const colEf = Math.max(ACAO_COL_MIN, Math.min(ACAO_COL_MAX, Math.round(coluna)));
  const idx = colEf - ACAO_COL_MIN;            // 0..57
  const q = RESOLUCAO_ROWS[d - 1].charCodeAt(idx) - 48;
  return { ...RESULTADOS_ACAO[q], coluna: colEf, d20: d };
}

// Tabela de Resistência (fórmula). ataque/defesa em [1,20].
// Retorna o número-alvo no d20 p/ resistir. Empate (dado == alvo) => rolar de novo.
function resolverResistencia(ataque, defesa) {
  const a = Math.max(1, Math.min(20, Math.round(ataque)));
  const f = Math.max(1, Math.min(20, Math.round(defesa)));
  if (a >= f + 12) return 20;
  return Math.max(1, Math.min(21 - f, 15 - f + Math.floor(a / 2)));
}

/* ============================== [14.5] Efeito de CONDIÇÕES sobre poços e habilidades ============================== */
/* ESCALA 0–100, SÓ MALEFÍCIO (27/09/2026, usuário):
     "Agora as barras vão de 0 a 100. 0 é o mundo ideal e 100 é o pior
      cenário. [...] a barra no 0 não trará benefício, mas a barra 25, 50, 75
      e 100 vão trazer malefícios."
   Os nomes passaram a dizer o MAL: Doença (vitalidade), Sono (animo), Sede
   (hidratacao), Fome (nutricao), Vício (euforia), Loucura (sanidade),
   Desonra (reputacao). As chaves no banco ficam as mesmas.
   Temperatura (termorregulacao) tem sinal: −100 frio … +100 calor, e vira DUAS
   barras — Frio e Calor. Pesado é a carga, em % da capacidade.

   Malefício por barra (decisão do usuário, mesmo dia), em DEGRAUS: 25 → 25%
   do máximo, 50 → 50%, 75 → 75%, 100 → 100%.
     Doença → Energia Física      Sono → Velocidade      Sede → Resistência Mágica
     Fome → Resistência Física    Vício → Karma          Loucura → Energia Heroica
     Frio → Velocidade            Calor → Energia Heroica  Pesado → Velocidade
     Desonra → habilidades de Influência (×0,5 no máximo)
   O máximo nos poços é 6 (o de antes); em RF/RM, 4 — as resistências são
   números pequenos, e −6 as zeraria já no começo do jogo.

   PROTEÇÃO (vestimentas): "Protege 25 de Frio" põe o TETO da barra em 75
   enquanto a peça está vestida (protecoesVestidas, 01-core/inventario-helpers).
   Era desconto até 27/09/2026 — ver barrasDeCondicao. */

const COND_DEGRAU = 25;
// 0 (< 25), 1 (25–49), 2 (50–74), 3 (75–99), 4 (100).
function degrauCondicao(valor) {
  const v = Number(valor);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.min(4, Math.floor(v / COND_DEGRAU));
}
// Compat: quem lia a "faixa" em degraus recebe o degrau novo (0..4).
function faixaCondicao(valor) { return degrauCondicao(valor); }
// Fração da barra, 0 (ideal) a 1 (pior).
function proporcaoCondicao(valor) {
  const v = Number(valor);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.min(1, v / 100);
}

const _cond100 = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0; };

/* As barras como o jogador as vê: 0..100, com Frio/Calor saídos da
   Temperatura e a proteção das vestimentas já descontada. `pesado` vem em
   condicoes.pesado quando quem chama sabe a carga (calcularFicha sabe). */
function barrasDeCondicao(condicoes, protecoes) {
  const c = condicoes || {};
  const p = protecoes || {};
  const t = Number(c.termorregulacao) || 0;
  const out = {
    vitalidade: _cond100(c.vitalidade), animo: _cond100(c.animo),
    hidratacao: _cond100(c.hidratacao), nutricao: _cond100(c.nutricao),
    euforia: _cond100(c.euforia), sanidade: _cond100(c.sanidade),
    reputacao: _cond100(c.reputacao),
    frio: _cond100(-t), calor: _cond100(t), pesado: _cond100(c.pesado),
  };
  /* A PROTEÇÃO É TETO, NÃO DESCONTO (27/09/2026): "Se um item me protege 1
     de desonra, quer dizer que o máximo que a barra chega é 99." Até então a
     peça subtraía da barra — com 0 de Desonra e proteção 1, o efetivo virava
     −1 e o tooltip mostrava o negativo. Agora a barra só não passa de
     100 − proteção, e nunca desce de 0. */
  Object.keys(out).forEach((k) => {
    const prot = Number(p[k]) || 0;
    if (prot > 0) out[k] = Math.min(out[k], Math.max(0, 100 - prot));
  });
  return out;
}

const COND_DELTA_MAX = 6;
const COND_MULT_VARIACAO_MAX = 0.5;
const CONDICOES_MALEFICIO = {
  vitalidade: { poco: 'ef' },
  animo:      { poco: 'vb' },
  hidratacao: { poco: 'rm', max: 4 },
  nutricao:   { poco: 'rf', max: 4 },
  euforia:    { poco: 'ka' },
  sanidade:   { poco: 'eh' },
  frio:       { poco: 'vb' },
  calor:      { poco: 'eh' },
  // pesado: saiu do degrau de pontos em 07/11/2026 — a carga tem faixas
  // próprias (FAIXAS_DE_CARGA), com a Velocidade em porcentagem.
  reputacao:  { grupo: 'Influência' },
};

// O que cada barra tira, no degrau em que está. Sempre o objeto inteiro.
function deltasPocosPorCondicoes(condicoes, protecoes) {
  const out = { ef: 0, eh: 0, ka: 0, vb: 0, rf: 0, rm: 0 };
  if (!condicoes) return out;
  const barras = barrasDeCondicao(condicoes, protecoes);
  Object.entries(CONDICOES_MALEFICIO).forEach(([k, r]) => {
    if (!r.poco) return;
    const d = degrauCondicao(barras[k]);
    if (!d) return;
    out[r.poco] -= Math.round((r.max ?? COND_DELTA_MAX) * d / 4);
  });
  return out;
}

/* ── O AVISO DA CONDIÇÃO RUIM (08/11/2026) ──────────────────────────────
   Usuário: "Mostre uma mensagem de aviso única na notificação da mesa quando
   a condição do personagem ficar ruim. Por exemplo 'Você está com muito
   sono! Se não descansar, sua energia heroica será afetada.'"

   "Ruim" é o primeiro degrau que cobra (degrauCondicao ≥ 1, 25 de 100) — o
   ponto em que CONDICOES_MALEFICIO começa a tirar do poço. "Única": o aviso
   sai quando a barra CRUZA para o degrau 1 ou além, vinda de 0; enquanto
   segue ruim, não repete, e só volta se ela melhorar e piorar de novo.

   O texto diz o efeito REAL de cada barra, lido de CONDICOES_MALEFICIO — o
   Sono tira Velocidade, não Energia Heroica (a do exemplo do usuário era
   ilustrativa). As barras são as do jogador: com a proteção das vestes já
   descontada, para o frio não avisar quem está agasalhado. */
const AVISO_DA_CONDICAO = {
  animo:      ['está com muito sono', 'Se não descansar'],
  nutricao:   ['está com muita fome', 'Se não comer'],
  hidratacao: ['está com muita sede', 'Se não beber'],
  vitalidade: ['está doente', 'Se não se tratar'],
  sanidade:   ['está perdendo a sanidade', 'Se não orar'],
  euforia:    ['está com o vício em alta', 'Se não se controlar'],
  frio:       ['está com muito frio', 'Se não se aquecer'],
  calor:      ['está com muito calor', 'Se não se refrescar'],
  reputacao:  ['está com a fama em baixa', 'Se não se redimir'],
};
const AVISO_DO_POCO = {
  /* Em minúsculas (08/11/2026, usuário: 'Os atributos não precisam ser
     escritos com a primeira letra maiúscula'). */
  ef: 'sua energia física será afetada', eh: 'sua energia heroica será afetada',
  ka: 'seu karma será afetado', vb: 'sua velocidade será afetada',
  rf: 'sua resistência física será afetada', rm: 'sua resistência mágica será afetada',
};
function avisosDeCondicao(condAntes, condDepois, protecoes, nome) {
  const antes = barrasDeCondicao(condAntes, protecoes);
  const depois = barrasDeCondicao(condDepois, protecoes);
  const quem = String(nome || '').trim() || 'O personagem';
  const out = [];
  Object.entries(CONDICOES_MALEFICIO).forEach(([k, r]) => {
    const frase = AVISO_DA_CONDICAO[k];
    if (!frase) return;
    if (degrauCondicao(antes[k]) > 0 || degrauCondicao(depois[k]) < 1) return;
    const efeito = r.poco ? AVISO_DO_POCO[r.poco] : `suas habilidades de ${String(r.grupo).toLowerCase()} serão afetadas`;
    out.push({ condicao: k, texto: `${quem} ${frase[0]}! ${frase[1]}, ${efeito}.` });
  });
  return out;
}

// Multiplicador no total da habilidade pelo GRUPO: Desonra → Influência.
function modificadorGrupoPorCondicoes(grupo, condicoes, protecoes) {
  if (!condicoes || !grupo) return 1;
  const entrada = Object.entries(CONDICOES_MALEFICIO).find(([, r]) => r.grupo === grupo);
  if (!entrada) return 1;
  const d = degrauCondicao(barrasDeCondicao(condicoes, protecoes)[entrada[0]]);
  return d ? 1 - COND_MULT_VARIACAO_MAX * d / 4 : 1;
}

// Wrapper de totalHabilidade que aplica o modificador de grupo por condição
// (Sanidade / Reputação / Temperatura). Os atributos NÃO são afetados por
// condição desde 08/09/2026, então `atributos` pode vir direto de
// calcularFicha sem tratamento extra.
function totalHabilidadeComCondicoes(habKey, habilidadesObj, atributos, bonusObj, habilidadesByKey, condicoes, protecoes) {
  const base = totalHabilidade(habKey, habilidadesObj, atributos, bonusObj, habilidadesByKey);
  const h = habilidadesByKey?.[habKey];
  const mult = modificadorGrupoPorCondicoes(h?.grupo, condicoes, protecoes);
  const comGrupo = mult === 1 ? base : Math.round(base * mult);
  /* A carga pesa nas habilidades de AGILIDADE (07/11/2026): −2 de coluna a
     partir de 76%. Quem chama manda o percentual em condicoes.pesado. */
  const pen = h && h.ajuste === 'agilidade' && condicoes ? faixaDeCarga(condicoes.pesado).agilidade : 0;
  return comGrupo - pen;
}

/* ── O PESO (07/11/2026) ───────────────────────────────────────────
   "Se um personagem tem 10/31, quer dizer que ele não pode passar de 31. A
   porcentagem ocupada que vai aplicar os efeitos de peso" (usuário). As
   faixas aprovadas no mesmo dia:

     0–50%    Leve       nada
     51–75%   Carregado  Velocidade −25%, Defesa −1
     76–90%   Pesado     Velocidade −50%, Defesa −2, −2 nas habilidades de
                         Agilidade, fome, sede e sono +25% mais rápido
     91–100%  No limite  Velocidade −75%, Defesa −4, −2 em Agilidade, sem
                         ação extra em combate, fome, sede e sono +50%
     > 100%   bloqueado: nada entra no inventário (cargaEstourouCom).

   A Agilidade segue em −2 no limite: as faixas acumulam, e nenhuma alivia o
   que a anterior já cobrava. */
const FAIXAS_DE_CARGA = [
  { id: 'leve',      ate: 50,       vbPct: 0,  defesa: 0, agilidade: 0, consumoPct: 0,  semAcaoExtra: false },
  { id: 'carregado', ate: 75,       vbPct: 25, defesa: 1, agilidade: 0, consumoPct: 0,  semAcaoExtra: false },
  { id: 'pesado',    ate: 90,       vbPct: 50, defesa: 2, agilidade: 2, consumoPct: 25, semAcaoExtra: false },
  { id: 'no_limite', ate: Infinity, vbPct: 75, defesa: 4, agilidade: 2, consumoPct: 50, semAcaoExtra: true },
];
function faixaDeCarga(pct) {
  const p = Number(pct);
  const v = Number.isFinite(p) ? p : 0;
  return FAIXAS_DE_CARGA.find((f) => v <= f.ate) || FAIXAS_DE_CARGA[FAIXAS_DE_CARGA.length - 1];
}
function velocidadeComCarga(velocidade, faixa) {
  const v = Number(velocidade) || 0;
  const pct = (faixa && faixa.vbPct) || 0;
  return pct ? Math.max(0, Math.floor(v * (100 - pct) / 100)) : v;
}
/* O nome e o efeito da faixa, para a barra de peso dizer o que custa. */
function textoFaixaDeCarga(faixa, en) {
  if (!faixa || faixa.id === 'leve') return null;
  const nome = { carregado: en ? 'Burdened' : 'Carregado', pesado: en ? 'Heavy' : 'Pesado',
    no_limite: en ? 'At the limit' : 'No limite' }[faixa.id];
  const partes = [
    (en ? 'Speed −' : 'Velocidade −') + faixa.vbPct + '%',
    (en ? 'Defense −' : 'Defesa −') + faixa.defesa,
    faixa.agilidade ? (en ? 'Agility skills −' : 'Habilidades de Agilidade −') + faixa.agilidade : null,
    faixa.consumoPct ? (en ? 'hunger, thirst and sleep +' : 'fome, sede e sono +') + faixa.consumoPct + '%' : null,
    faixa.semAcaoExtra ? (en ? 'no extra action in combat' : 'sem ação extra em combate') : null,
  ].filter(Boolean);
  return { nome, efeito: partes.join(' · ') };
}
/* A mudança de `antes` para `depois` FAZ ENTRAR algo (mais unidades de
   algum item)? Mexer no que já se tem (desequipar, tirar da bolsa) e largar
   nunca é barrado — só ganhar. */
function entrouItem(antes, depois) {
  const conta = (itens) => {
    const m = {};
    (Array.isArray(itens) ? itens : []).forEach((it) => {
      if (it && it.slug) m[it.slug] = (m[it.slug] || 0) + (Number(it.quantidade) || 1);
    });
    return m;
  };
  const a = conta(antes); const d = conta(depois);
  return Object.keys(d).some((k) => d[k] > (a[k] || 0));
}
/* Entrou item E a carga passou de 100% E pesa mais que antes. */
function cargaEstourouCom(antes, depois, catalogoBySlug, forca, fisico) {
  const calc = (typeof window !== 'undefined' && window.calcCarga) || null;
  if (!calc || !catalogoBySlug || !entrouItem(antes, depois)) return false;
  const cd = calc(depois, catalogoBySlug, forca, fisico);
  if (!(cd.pct > 100)) return false;
  const ca = calc(antes, catalogoBySlug, forca, fisico);
  return cd.peso > ca.peso;
}
function textoCargaMaxima(en) {
  return en ? 'Maximum load: drop something first.' : 'Carga máxima: largue algo antes.';
}

/* ============================== [15] Helpers de CARACTERIZAÇÃO ============================== */
// Regra fixa do sistema (ver PDF de especificação do usuário): toda
// categoria de fisica/social/pessoal concede/custa exatamente 2 pontos,
// não varia linha a linha. Pool começa em 4 e cresce 1:1 a cada
// `opcaoConcede` escolhida — sem teto pra quantas "desvantagens"
// (opcaoConcede) o personagem pode acumular.
const PONTOS_CARACTERIZACAO_BASE = 4;
const CUSTO_CARACTERIZACAO = 2;  // pontos que a opcaoCusta ("vantagem") consome
const GANHO_CARACTERIZACAO = 2;  // pontos que a opcaoConcede ("desvantagem") devolve

// `caracterizacao` é o objeto salvo no personagem: { fisica: {chave: 'baixo'|'grande'},
// social: {...}, pessoal: {...}, historica: 'Dragonista' }. Chaves ausentes = não escolhido.
function gastoCaracterizacao(caracterizacao) {
  const c = caracterizacao || {};
  let gasto = 0;
  ['fisica', 'social', 'pessoal'].forEach((grupo) => {
    const escolhas = c[grupo] || {};
    (GAME_DATA.caracterizacoes[grupo] || []).forEach((cat) => {
      if (escolhas[cat.key] === cat.opcaoCusta.key) gasto += CUSTO_CARACTERIZACAO;
    });
  });
  return gasto;
}

function pontosCaracterizacaoTotal(caracterizacao) {
  const c = caracterizacao || {};
  let extra = 0;
  ['fisica', 'social', 'pessoal'].forEach((grupo) => {
    const escolhas = c[grupo] || {};
    (GAME_DATA.caracterizacoes[grupo] || []).forEach((cat) => {
      if (escolhas[cat.key] === cat.opcaoConcede.key) extra += GANHO_CARACTERIZACAO;
    });
  });
  return PONTOS_CARACTERIZACAO_BASE + extra;
}

/* TETO DE 10 ESCOLHAS (13/11/2026, usuário: "Os personagens só podem comprar
   um máximo de 10 caracterização"). Conta toda escolha de física, social e
   pessoal — vantagem ou desvantagem; a Histórica fica de fora, como no pool.
   Conta a chave preenchida, não só a que casa com o catálogo: um valor
   antigo ('grande', 'baixo') ainda ocupa a categoria. */
const MAX_CARACTERIZACOES = 10;
function qtdCaracterizacoes(caracterizacao) {
  const c = caracterizacao || {};
  return ['fisica', 'social', 'pessoal'].reduce((n, grupo) => {
    const escolhas = c[grupo] || {};
    return n + Object.keys(escolhas).filter((k) => !!escolhas[k]).length;
  }, 0);
}

/* ============================================================
   ÍCONES DE PROFISSÃO E DE TIPO DE CRIATURA (17/09/2026)
   ============================================================
   "Adicione o ícone da profissão dos personagens no card e na ficha" e "no
    tabuleiro de batalha, ao invés de mostrar a primeira letra do nome da
    criatura, mostre seu ícone de acordo com seu tipo." (usuário)

   Os desenhos foram escolhidos pelo usuário, um a um. Ficam AQUI, e não em
   cada tela, porque três telas os consomem — card (08), ficha (11) e tabuleiro
   (12) — e um par profissão→ícone escrito três vezes é a receita de divergir
   sem ninguém decidir (foi o que aconteceu com status→ícone dentro da própria
   batalha; ver a nota de ICONE_STATUS).

   Todos os nomes são do conjunto Tabler que o index.html carrega. Ícone
   inventado não falha: vira quadrado vazio na tela — é a lição do
   'ti-cloud-moon' que o VISIBILIDADE_ICONE tentou usar. */
const ICONE_PROFISSAO = {
  'Guerreiro':  'ti-shield',
  'Rastreador': 'ti-bow',
  'Sacerdote':  'ti-bible',
  'Ladino':     'ti-sword',
  'Bardo':      'ti-music',
  'Mago':       'ti-crystal-ball',
};

/* Os dez tipos que a tabela `criaturas` usa hoje, todos nomeados pelo usuário
   na segunda passada (17/09/2026). Ficaram de fora só Monstro e Gigante, que o
   editor oferece e nenhuma criatura usa — esses caem na inicial do nome.

   "Selvagem" saiu: era da primeira lista e não existe como tipo. Demônio virou
   Infernal em 28/09/2026 ("são a mesma classe") e ficou só o pentagrama — são a mesma gente para quem olha o
   tabuleiro. E o ti-ghost-2, que era do Místico, passou para o Elemental. */
const ICONE_TIPO_CRIATURA = {
  'Animal':     'ti-horse',
  'Celestial':  'ti-cross',
  'Infernal':   'ti-pentagram',
  'Dragão':     'ti-dragon',
  'Civilizado': 'ti-user',
  'Construído': 'ti-robot',
  'Místico':    'ti-michelin-bib-gourmand',
  'Morto':      'ti-coffin',
  'Elemental':  'ti-ghost-2',
};

/* Busca tolerante a acento e caixa: o mesmo tipo aparece como 'Dragão' na
   tabela e como 'dragao' em dado antigo, e uma das duas grafias sumiria. */
function _chaveSemAcento(v) {
  // Mesmo recorte de marcas combinantes de _normalizaTokenBonus, acima.
  return String(v == null ? '' : v)
    .normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}
function _buscaPorChave(mapa, valor) {
  if (valor == null) return null;
  if (mapa[valor]) return mapa[valor];
  const alvo = _chaveSemAcento(valor);
  if (!alvo) return null;
  const achado = Object.keys(mapa).find((k) => _chaveSemAcento(k) === alvo);
  return achado ? mapa[achado] : null;
}

function iconeProfissao(profissao) { return _buscaPorChave(ICONE_PROFISSAO, profissao); }
/* Classe pode ter várias desde 26/09/2026 ("Místico, Dragão"): o token usa
   a PRIMEIRA que tiver ícone. */
function iconeTipoCriatura(tipo) {
  const partes = String(tipo == null ? '' : tipo).split(',').map((p) => p.trim()).filter(Boolean);
  for (const p of partes) { const ic = _buscaPorChave(ICONE_TIPO_CRIATURA, p); if (ic) return ic; }
  return _buscaPorChave(ICONE_TIPO_CRIATURA, tipo);
}

/* ── ELEMENTOS (26/09/2026, regras do usuário) ──────────────────────────────
   "Sacerdotes são do elemento luz. Rastreadores são do elemento terra.
    Guerreiros são do elemento fogo. Magos são do elemento escuridão. Bardos
    são do elemento água. Ladinos são do elemento ar."

   "O elemento fogo causa 10% mais dano no elemento ar. O ar causa 10% mais
    dano na terra. A água causa 10% mais dano no fogo. A terra causa 10% mais
    dano na água. A luz causa 15% mais dano na escuridão. A escuridão causa 5%
    mais dano no fogo, ar, água e terra."

   Quem tem mais de um elemento (criatura "Fogo, Luz") usa a MELHOR vantagem
   entre os pares — não soma: Fogo+Luz contra Ar+Escuridão dá 15%, não 25%.
   Ver danoFinal (12-batalha/batalha.jsx). */
const ELEMENTO_PROFISSAO = {
  'Sacerdote': 'Luz', 'Rastreador': 'Terra', 'Guerreiro': 'Fogo',
  'Mago': 'Escuridão', 'Bardo': 'Água', 'Ladino': 'Ar',
};
const VANTAGEM_ELEMENTAL = {
  fogo: { ar: 10 },
  ar: { terra: 10 },
  agua: { fogo: 10 },
  terra: { agua: 10 },
  luz: { escuridao: 15 },
  escuridao: { fogo: 5, ar: 5, agua: 5, terra: 5 },
};
/* "Fogo, Luz" / ['Água'] / 'agua' → ['fogo','luz'] / ['agua'] — sem acento,
   minúsculo. Aceita string CSV ou lista. */
function chavesDeElemento(v) {
  const lista = Array.isArray(v) ? v : String(v == null ? '' : v).split(',');
  return lista.map((x) => String(x || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    .filter(Boolean);
}
function elementoDaProfissao(profissao) { return ELEMENTO_PROFISSAO[profissao] || null; }
/* A vantagem em % do golpe (elementos de quem bate) contra o alvo. 0 = nenhuma. */
function bonusElemental(elementosDoGolpe, elementosDoAlvo) {
  const golpe = chavesDeElemento(elementosDoGolpe);
  const alvo = chavesDeElemento(elementosDoAlvo);
  let melhor = 0;
  golpe.forEach((g) => alvo.forEach((a) => {
    const pct = (VANTAGEM_ELEMENTAL[g] || {})[a] || 0;
    if (pct > melhor) melhor = pct;
  }));
  return melhor;
}

/* A PATENTE da criatura pelo estágio (25/09/2026, pedido do usuário): um
   ícone ao lado do nome — 1–5 C, 6–10 B, 11–15 A, 16–20 S, 21–25 X, 26–30 ✱.
   Acima de 30 fica no topo da escala; sem estágio válido, sem ícone. */
const ICONE_ESTAGIO_CRIATURA = [
  [5,  'ti-hexagon-letter-c'],
  [10, 'ti-hexagon-letter-b'],
  [15, 'ti-hexagon-letter-a'],
  [20, 'ti-hexagon-letter-s'],
  [25, 'ti-hexagon-letter-x'],
  [Infinity, 'ti-hexagon-asterisk'],
];
function iconeEstagioCriatura(estagio) {
  const n = Number(estagio);
  if (!Number.isFinite(n) || n < 1) return null;
  return ICONE_ESTAGIO_CRIATURA.find(([teto]) => n <= teto)[1];
}

Object.assign(window, {
  GAME_DATA, GRUPOS_HABILIDADES_ORDEM, ATRIBUTOS_KEYS, ATRIBUTOS_LABEL,
  calcEstagio, pontosDisponiveis, custoAtributo, pontosGastos, todosOsPontosGastos, altura, peso,
  bonusPontosRaca, pontosAtributosTotal,
  subracaEfetiva, limparTransformacoesVencidas, atributosComSubraca, atributosEfetivosPJ,
  calcularFicha, tituloDoPersonagem, pontosHabilidadesTotal, gastoHabilidades,
  qtdHabilidades, limiteQtdHabilidades, nivelHabilidade, totalHabilidade,
  calcBonusHabilidadesRacaReino,
  FAIXAS_DE_CARGA, faixaDeCarga, velocidadeComCarga, textoFaixaDeCarga, entrouItem, cargaEstourouCom, textoCargaMaxima,
  faixaCondicao, proporcaoCondicao, deltasPocosPorCondicoes, degrauCondicao, barrasDeCondicao, CONDICOES_MALEFICIO,
  modificadorGrupoPorCondicoes, totalHabilidadeComCondicoes,
  MAGIAS_BASE_POR_PROFISSAO, pontosMagiasPorEstagio, pontosMagiasTotal, gastoMagias,
  nivelMagiaEfetivo, bloqueioAprenderMagia,
  CLASSES_MAGIA, atorMilagreDePj, atorMilagreDeCriatura, bloqueioMilagre, alvoDeMilagreBloqueado, motivoMilagreLabel,
  NIVEIS_MAGIA, passosDisponiveisMagia,
  TECNICAS_BASE_POR_PROFISSAO, pontosTecnicasPorEstagio, pontosTecnicasTotal, gastoTecnicas, qtdTecnicas,
  explicacaoDosPontos, avisosDeCondicao,
  ATIVIDADE_DA_CLASSE, HORAS_TREINO, nivelNaFila, comFila, bloqueioAprenderTecnica,
  bloqueioSubirNivel, custoSubirNivel, subirNivelEhAprendizado, motivoSubirNivelLabel,
  totalTecnica,
  GRUPOS_ARMAS, GRUPOS_ARMAS_BY_SIGLA, GRUPOS_ARMAS_POR_PROFISSAO,
  pontosGruposArmasTotal, gastoGruposArmas, qtdGruposArmas, bonusGrupoArma,
  idiomasIniciais, slotsAprimoramento, opcoesAprimoramento,
  RESULTADOS_ACAO, RESOLUCAO_ROWS, ACAO_COL_MIN, ACAO_COL_MAX,
  resolverAcao, resolverResistencia, resistenciasBase,
  pontosCaracterizacaoTotal, gastoCaracterizacao, MAX_CARACTERIZACOES, qtdCaracterizacoes,
  PONTOS_CARACTERIZACAO_BASE, CUSTO_CARACTERIZACAO, GANHO_CARACTERIZACAO,
  ICONE_PROFISSAO, ICONE_TIPO_CRIATURA, iconeProfissao, iconeTipoCriatura,
  ICONE_ESTAGIO_CRIATURA, iconeEstagioCriatura,
  ELEMENTO_PROFISSAO, VANTAGEM_ELEMENTAL, chavesDeElemento, elementoDaProfissao, bonusElemental,
});