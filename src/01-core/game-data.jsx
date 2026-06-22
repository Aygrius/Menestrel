/* ============================================================
   GAME_DATA — Dados estáticos do sistema (Tagmar)
   ============================================================
   Inclui GAME_DATA + constantes derivadas (ATRIBUTOS_KEYS,
   ATRIBUTOS_LABEL, GRUPOS_HABILIDADES_ORDEM, MAGIAS_POR_PROFISSAO) e TODOS
   os helpers de cálculo intimamente acoplados (calcEstagio,
   calcularFicha, pontosHabilidadesTotal, etc — blocos [09]-[13]).
   ============================================================ */

/* ============================== [08] PERSONAGENS DO JOGADOR — dados estáticos do sistema (Tagmar) ============================== */

const GAME_DATA = {
  racas: {
    // mods aplicados sobre os atributos base; altura em metros
    'Humano':         { mods: { intelecto: 0, aura: 0, carisma: 0, forca: 0, fisico: 0, agilidade: 0, percepcao: 0 }, altura: 1.77 },
    'Meio-Elfo':      { mods: { intelecto: 0, aura: 0, carisma: 1, forca: 0, fisico: -1, agilidade: 1, percepcao: 0 }, altura: 1.68 },
    'Meio-Orc':       { mods: { intelecto: -1, aura: 0, carisma: -2, forca: 2, fisico: 2, agilidade: 0, percepcao: 0 }, altura: 1.89 },
    'Elfo-Florestal': { mods: { intelecto: 0, aura: 0, carisma: 0, forca: -1, fisico: -1, agilidade: 1, percepcao: 2 }, altura: 1.71 },
    'Elfo-Dourado':   { mods: { intelecto: 1, aura: 2, carisma: 0, forca: -2, fisico: -1, agilidade: 0, percepcao: 1 }, altura: 1.63 },
    'Elfo-Sombrio':   { mods: { intelecto: 0, aura: 1, carisma: -1, forca: 0, fisico: -1, agilidade: 1, percepcao: 1 }, altura: 1.65 },
    'Anão':           { mods: { intelecto: 0, aura: -1, carisma: -1, forca: 2, fisico: 2, agilidade: -1, percepcao: 0 }, altura: 1.39 },
    'Pequenino':      { mods: { intelecto: 0, aura: -2, carisma: 1, forca: -2, fisico: 1, agilidade: 2, percepcao: 1 }, altura: 1.14 },
  },

  reinos: [
    'Abadom', 'Acordo', 'Âmien', 'Azanti', 'Calco', 'Cidades-Estado', 'Conti',
    'Dantsen', 'Eredra', 'Filanti', 'Levânia', 'Ludgrim', 'Luna', 'Marana',
    'Plana', 'Portis', 'Porto Livre', 'Verrogar',
  ],

  deuses: [
    'Blator', 'Cambu', 'Crezir', 'Crizagom', 'Cruine', 'Ganis', 'Lena',
    'Maira', 'Palier', 'Parom', 'Plandis', 'Selimon', 'Sevides',
  ],

  generos: [
    'Masculino', 'Feminino', 'Neutro'
  ],

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
function custoAtributo(v) {
  return GAME_DATA.custoAtributo[String(v)] ?? 0;
}
function pontosGastos(baseVals) {
  return ATRIBUTOS_KEYS.reduce((sum, k) => sum + custoAtributo(baseVals[k] ?? 0), 0);
}
function altura(raca) { return GAME_DATA.racas[raca]?.altura ?? 1.77; }
function peso(raca) {
  const h = altura(raca);
  const fator = raca === 'Anão' ? 40 : 28;
  return Math.floor(h * h * fator);
}

// Calcula a ficha completa a partir dos campos editáveis.
// Para os derivados, atributos negativos contam como 0 (não altera `atributos`).
function calcularFicha(p, catalogoBySlug) {
  const racaData = GAME_DATA.racas[p.raca] || GAME_DATA.racas['Humano'];
  const profData = GAME_DATA.profissoes[p.profissao] || GAME_DATA.profissoes['Guerreiro'];
  const estagio = calcEstagio(p.experiencia ?? 0);

  // Atributos finais (base + mod racial) — valor real, exibido ao jogador.
  const atributos = {};
  ATRIBUTOS_KEYS.forEach((k) => {
    atributos[k] = (p[`${k}_base`] ?? 0) + (racaData.mods[k] ?? 0);
  });

  // Versões clamped a 0 só para uso interno nas fórmulas derivadas.
  const clamp0 = (n) => Math.max(0, n);
  const fisicoC    = clamp0(atributos.fisico);
  const auraC      = clamp0(atributos.aura);
  const percepcaoC = clamp0(atributos.percepcao);
  const agilC      = clamp0(atributos.agilidade);

  const h = racaData.altura;
  const pesoVal = peso(p.raca);

  // EF — 20% do peso + atributo físico
  const ef = Math.floor(pesoVal / 5) + fisicoC;
  // EH — ((percepção + aura) × estágio) + EH-base da profissão
  const eh = (percepcaoC) + (profData.ehBase || 0) * estagio;
  // RF — estágio + atributo físico
  const resFisica = estagio + fisicoC;
  // RM — estágio + atributo aura
  const resMagica = estagio + auraC;
  // KA — (RM + 1) × (aura + 1). Sem karma se aura < 1.
  const karma = atributos.aura < 1 ? 0 : (resMagica + 1) * (auraC + 1);
  // VB — (11 × altura) + agilidade
  const veloc = Math.floor(h * 11) + agilC;

  // AR     = soma das absorções dos equipamentos de defesa equipados.
  // Defesa = tipo do peitoral (slot 'peito') concatenado com AR. Ex: "L10".
  //          Sem peitoral, fica só o número. Sem catálogo, "—".
  let absorcaoTotal = 0;   // AR — soma das absorções (vai pra barra)
  let defesaTotal  = 0;    // soma das defesas (compõe a string)
  let tipoPeitoral = '';
  if (catalogoBySlug && p?.inventario?.itens) {
    p.inventario.itens.forEach((it) => {
      if (!it.slot) return; // só itens equipados
      const c = catalogoBySlug[it.slug];
      if (!c) return;
      absorcaoTotal += Number(c.absorcao || 0);
      defesaTotal   += Number(c.defesa   || 0);
      if (it.slot === 'peito' && c.tipo_armadura) {
        tipoPeitoral = c.tipo_armadura;
      }
    });
  }

  // Defesa: sigla do peitoral (L por padrão se não houver peitoral)
  //         + (soma das defesas dos equipamentos + agilidade).
  // Ex: agilidade 2, sem armadura → "L2".
  //     agilidade 2, peitoral couro (L, defesa 3) + calça couro (defesa 2) → "L7".
  const siglaDefesa = tipoPeitoral || 'L';
  const valorDefesa = defesaTotal + agilC;
  const defesaStr   = `${siglaDefesa}${valorDefesa}`;

  return {
    estagio,
    altura: h,
    peso: pesoVal,
    atributos,
    derivadas: {
      energiaFisica: ef,
      energiaHeroica: eh,
      resistenciaFisica: resFisica,
      resistenciaMagica: resMagica,
      absorcao: absorcaoTotal,
      defesa: defesaStr,
      armadura: catalogoBySlug ? absorcaoTotal : '—',
      karma,
      karmamax: karma,
      velocidade: veloc,
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

// Profissões que podem usar magia, com o atributo regente e pontos por estágio.
// Guerreiro e Ladino NÃO usam magia (omitidos de propósito).
const MAGIAS_POR_PROFISSAO = {
  'Bardo':      { atributo: 'carisma',   pontosPorEstagio:  8 },
  'Mago':       { atributo: 'intelecto', pontosPorEstagio: 14 },
  'Rastreador': { atributo: 'percepcao', pontosPorEstagio:  8 },
  'Sacerdote':  { atributo: 'aura',      pontosPorEstagio: 10 },
};

function profissaoUsaMagia(profissao) {
  return !!MAGIAS_POR_PROFISSAO[profissao];
}

function pontosMagiasTotal(profissao, estagio) {
  const cfg = MAGIAS_POR_PROFISSAO[profissao];
  if (!cfg) return 0;
  return cfg.pontosPorEstagio * estagio;
}

function gastoMagias(magiasObj, magiasDb) {
  if (!magiasObj || !magiasDb) return 0;
  return Object.entries(magiasObj).reduce((sum, [key, passos]) => {
    const m = magiasDb.find((x) => x.key === key);
    if (!m) return sum;
    return sum + nivelMagiaEfetivo(passos || 0) * (m.custo || 0);
  }, 0);
}

// "Permissão" é um campo CSV no banco (ex.: "Bardo, Mago, Confraria de Arautos").
// Esta função diz se um personagem pode comprar a magia dado:
//   - sua profissão atual
//   - sua especialização (ou null, se ainda no estágio < 5)
function podeAcessarMagia(magia, profissao, especializacao) {
  if (!magia.permissao) return false;
  const lista = magia.permissao.split(',').map((s) => s.trim()).filter(Boolean);
  return lista.includes(profissao) || (!!especializacao && lista.includes(especializacao));
}

// Converte passos comprados (1..5) → nível efetivo (1, 3, 5, 7, 9).
function nivelMagiaEfetivo(passos) {
  const p = passos || 0;
  return p > 0 ? p * 2 - 1 : 0;
}

/* ============================== [12] Helpers de TÉCNICAS DE COMBATE ============================== */
// Diferente de magias, TODAS as profissões podem comprar técnicas.
const TECNICAS_POR_PROFISSAO = {
  'Guerreiro':  { pontosPorEstagio: 7 },
  'Ladino':     {  pontosPorEstagio: 5 },
  'Sacerdote':  {  pontosPorEstagio: 6 },
  'Mago':       {  pontosPorEstagio: 2 },
  'Rastreador': {  pontosPorEstagio: 6 },
  'Bardo':      {  pontosPorEstagio: 4 },
};

function pontosTecnicasTotal(profissao, estagio) {
  const cfg = TECNICAS_POR_PROFISSAO[profissao];
  if (!cfg) return 0;
  return cfg.pontosPorEstagio * estagio;
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

// Permissão CSV: profissão básica OU especialização (estágio 5+).
// Mesma regra de `podeAcessarMagia`.
function podeAcessarTecnica(tecnica, profissao, especializacao) {
  if (!tecnica.permissao) return false;
  const lista = tecnica.permissao.split(',').map((s) => s.trim()).filter(Boolean);
  return lista.includes(profissao) || (!!especializacao && lista.includes(especializacao));
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

Object.assign(window, {
  GAME_DATA, GRUPOS_HABILIDADES_ORDEM, ATRIBUTOS_KEYS, ATRIBUTOS_LABEL,
  calcEstagio, pontosDisponiveis, custoAtributo, pontosGastos, altura, peso,
  calcularFicha, tituloDoPersonagem, pontosHabilidadesTotal, gastoHabilidades,
  qtdHabilidades, limiteQtdHabilidades, nivelHabilidade, totalHabilidade,
  calcBonusHabilidadesRacaReino,
  MAGIAS_POR_PROFISSAO, profissaoUsaMagia, pontosMagiasTotal, gastoMagias,
  podeAcessarMagia, nivelMagiaEfetivo,
  TECNICAS_POR_PROFISSAO, pontosTecnicasTotal, gastoTecnicas, qtdTecnicas,
  totalTecnica, podeAcessarTecnica,
  GRUPOS_ARMAS, GRUPOS_ARMAS_BY_SIGLA, GRUPOS_ARMAS_POR_PROFISSAO,
  pontosGruposArmasTotal, gastoGruposArmas, qtdGruposArmas, bonusGrupoArma,
  idiomasIniciais, slotsAprimoramento, opcoesAprimoramento,
  RESULTADOS_ACAO, RESOLUCAO_ROWS, ACAO_COL_MIN, ACAO_COL_MAX,
  resolverAcao, resolverResistencia,
});