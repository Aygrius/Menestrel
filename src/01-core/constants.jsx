/* ============================================================
   CONSTANTS — Constantes globais usadas por toda a aplicação
   ============================================================
   - FANTASY_MONTHS / FANTASY_WEEKDAYS — calendário fantasy
   - AUTH_COPY — strings do fluxo de login Google
   - ADMIN_COPY — strings do console administrativo
   - ADMIN_SECTIONS — seções do sidebar por perfil (master/player)

   TWEAKS_DEFAULTS NÃO foi movido porque o bloco EDITMODE-BEGIN/END
   é reescrito pelo host em disco — mover risca quebrar essa integração.
   ============================================================ */

const FANTASY_MONTHS = [
  { n:  1, nome: 'Mês do Conflito',  dias: 30 },
  { n:  2, nome: 'Mês da Água',      dias: 30 },
  { n:  3, nome: 'Mês da Paz',       dias: 30 },
  { n:  4, nome: 'Mês da Semente',   dias: 30 },
  { n:  5, nome: 'Mês do Ouro',      dias: 30 },
  { n:  6, nome: 'Mês do Talento',   dias: 30 },
  { n:  7, nome: 'Mês da Paixão',    dias: 30 },
  { n:  8, nome: 'Mês do Sangue',    dias: 30 },
  { n:  9, nome: 'Mês da Sabedoria', dias: 30 },
  { n: 10, nome: 'Mês da Rosa',      dias: 30 },
  { n: 11, nome: 'Mês da Vida',      dias: 30 },
  { n: 12, nome: 'Mês da Justiça',   dias: 30 },
  { n: 13, nome: 'Dia de Cruine',    dias: 1 },
];

const FANTASY_WEEKDAYS = [
  'Anaesi', 'Basvo', 'Calcato', 'Moldio',
  'Saegaeti', 'Saverieto', 'Sivonte',
];

// Strings de copy só pro fluxo de auth
const AUTH_COPY = {
  pt: {
    signout:     'Sair',
    google_btn:  'Continuar com Google',
    redirecting: 'Forjando seu acesso...',
    eyebrow:     'Mesa de RPG para Mestres & Jogadores',
    title:       'Bem-vindo, menestrel',
    sub:         'Entre com a sua conta Google para abrir o seu grimório.',
    aguarde:     'Aguarde um momento.',
    erro:        'Não foi possível iniciar o login. Tente novamente.',
    consent:     'Ao entrar, você concorda com a Política de Privacidade e com o tratamento dos seus dados conforme a LGPD.',
  },
  en: {
    signout:     'Sign out',
    google_btn:  'Continue with Google',
    redirecting: 'Forging your access...',
    eyebrow:     'RPG tabletop for Game Masters & Players',
    title:       'Welcome, minstrel',
    sub:         'Sign in with your Google account to open your grimoire.',
    aguarde:     'Just a moment.',
    erro:        'Could not start the sign-in. Please try again.',
    consent:     'By signing in you agree to the Privacy Policy and to the processing of your personal data.',
  },
};
/* ============================== [07] ADMIN CONSOLE — aparece quando o usuário está logado ============================== */

const ADMIN_COPY = {
  pt: {
    profile_label: 'Perfil',
    master: 'Mestre',
    player: 'Jogador',
    signout: 'Sair',
    empty_title: 'Sua biblioteca está vazia',
    empty_sub: 'Comece criando seu primeiro registro abaixo',
    create: 'Criar novo',
    coming_soon: 'Em breve',
    // Rótulos usados pelo editor de catálogo (catalogo-descritores.jsx) —
    // tabTabela para o nome da aba, campoColuna para o rótulo de cada campo.
    // Vive aqui (não em copy.jsx) porque é aqui que ADMIN_COPY já mora.
    tabTecnicas: 'Técnicas',
    tabHabilidades: 'Habilidades',
    tabMagias: 'Magias',
    tabCriaturas: 'Criaturas',
    tabItens: 'Itens',
    campoChave: 'Chave',
    campoNome: 'Nome',
    campoCusto: 'Custo',
    campoUso: 'Uso',
    campoAjuste: 'Ajuste',
    campoArmas: 'Grupo de Armas',
    campoArmaduras: 'Grupo de Armaduras',
    campoPermissao: 'Permissão',
    campoDescricao: 'Descrição',
    campoEfeito: 'Efeito',
    campoGrupo: 'Grupo',
    campoNivelInicial: 'Nível Inicial',
    campoVantagem: 'Vantagem',
    campoDesvantagem: 'Desvantagem',
    campoRestricao: 'Restrição',
    campoTipo: 'Tipo',
    campoEvocacao: 'Evocação',
    campoAlcance: 'Alcance',
    campoDuracao: 'Duração',
    campoDano: 'Dano',
    campoNivel1: 'Nível 1',
    campoNivel3: 'Nível 3',
    campoNivel5: 'Nível 5',
    campoNivel7: 'Nível 7',
    campoNivel9: 'Nível 9',
    campoSubtipo: 'Subtipo',
    campoPlano: 'Plano',
    campoColetivo: 'Coletivo',
    campoEstagio: 'Estágio',
    campoPeso: 'Peso',
    campoIntelecto: 'Intelecto',
    campoAura: 'Aura',
    campoCarisma: 'Carisma',
    campoForca: 'Força',
    campoFisico: 'Físico',
    campoAgilidade: 'Agilidade',
    campoPercepcao: 'Percepção',
    campoArmadura: 'Armadura',
    campoTipoArmadura: 'Tipo de Armadura',
    campoAtaque: 'Ataque',
    campoMagia: 'Magia',
    campoMagiaN: 'Quantidade de Magias',
    campoTecnicasEspeciais: 'Técnicas Especiais',
    campoHabilidades: 'Habilidades',
    campoEnergiaFisica: 'Energia Física',
    campoEnergiaHeroica: 'Energia Heroica',
    campoAbsorcao: 'Absorção',
    campoDefesa: 'Defesa',
    campoVelocidade: 'Velocidade',
    // O campo se chama só L, M e P — as tabelas de dano do livro têm esse
    // cabeçalho, não "Dano L". Corrigido em 11/09/2026.
    campoDanoL: 'L',
    campoDanoM: 'M',
    campoDanoP: 'P',
    campoDano100: 'Dano 100%',
    campoDano25: 'Dano 25%',
    campoDano50: 'Dano 50%',
    campoDano75: 'Dano 75%',
    campoSlug: 'Slug',
    campoTipoItem: 'Tipo de Item',
    campoOrigem: 'Origem',
    campoIcone: 'Ícone',
    campoDocUrl: 'Link do conteúdo',
    campoEfeitoPositivo: 'Efeito Positivo',
    campoEfeitoNegativo: 'Efeito Negativo',
    campoValorLatao: 'Valor em Latão',
    campoOcupa: 'Ocupa',
    campoArmazena: 'Armazena',
    campoForcaReq: 'Força Requerida',
    campoResistencia: 'Resistência',
    campoNivelMagia: 'Nível de Magia',
    campoConsumiveis: 'Consumíveis',
    campoConsumiveisPeso: 'Peso de Consumíveis',
    campoMagico: 'Mágico',
    campoAjusteAtributo: 'Atributo de Ajuste',
    campoCategoriaEquip: 'Categoria de Equipamento',
    campoSlotEquip: 'Slot de Equipamento',
    campoGrupoEquipamento: 'Grupo de Equipamento',
    campoMaosPequenino: 'Mãos (Pequenino)',
    campoMaosAnao: 'Mãos (Anão)',
    campoMaosOutras: 'Mãos (Outras Raças)',
    // Chrome do editor genérico (catalogo-editor.jsx, Task 4) — título do
    // modal e rótulo do botão durante o salvamento. Não são "campoX"/"tabX"
    // porque não descrevem uma coluna/tabela, são texto fixo do editor.
    editorNovo: 'Novo',
    editorEditar: 'Editar',
    editorSalvando: 'Salvando…',
    editorChaveVazia: 'O nome não gera uma chave válida — use ao menos uma letra ou número.',
    sections: {
      historias:     { label: 'Histórias',    desc: 'Suas campanhas, arcos e sessões' },
      personagens_m: { label: 'Personagens',  desc: 'Aliados, antagonistas e figurantes' },
      criaturas:     { label: 'Criaturas',    desc: 'Bestiário e ameaças do mundo' },
      itens:         { label: 'Itens',        desc: 'Objetos mundanos, mágicos e relíquias' },
      itens_campanha:{ label: 'Itens da Campanha', desc: 'Itens que só existem na sua aventura' },
      magias:        { label: 'Magias',       desc: 'Feitiços, encantamentos e rituais' },
      tecnicas:      { label: 'Técnicas',     desc: 'Manobras, golpes especiais e talentos' },
      habilidades:   { label: 'Habilidades',  desc: 'Atributos, perícias e capacidades' },
      /* "Meus Personagens" desde 12/09/2026: a seção nova de NPCs se chama
         "Personagens" (nome do usuário), e com a barra só de ícones o tooltip
         é o único rótulo — dois iguais seriam dois destinos indistinguíveis. */
      personagens_j: { label: 'Meus Personagens', desc: 'Suas fichas de aventureiros' },
      inventario:    { label: 'Inventário',   desc: 'Itens que seus personagens carregam' },
      loja:          { label: 'Loja',         desc: 'Equipamentos e itens disponíveis pra compra' },
      convites:      { label: 'Convites',     desc: 'Aceite convites e veja suas mesas ativas' },
      aventuras:     { label: 'Histórias',    desc: 'As aventuras vividas pelos seus personagens' },
      /* Vieram do Diário em 12/09/2026 — antes eram abas dentro da ficha. */
      lugares:       { label: 'Lugares',      desc: 'Os reinos e cidades que seu personagem conhece' },
      npcs:          { label: 'NPCs',         desc: 'As pessoas que seu personagem conheceu' },
      memorias:      { label: 'Memórias',     desc: 'O que seu personagem escreveu sobre o que viveu' },
    }
  },
  en: {
    profile_label: 'Profile',
    master: 'Game Master',
    player: 'Player',
    signout: 'Sign out',
    empty_title: 'Your library is empty',
    empty_sub: 'Start by creating your first entry below',
    create: 'Create new',
    coming_soon: 'Coming soon',
    tabTecnicas: 'Techniques',
    tabHabilidades: 'Abilities',
    tabMagias: 'Spells',
    tabCriaturas: 'Creatures',
    tabItens: 'Items',
    campoChave: 'Key',
    campoNome: 'Name',
    campoCusto: 'Cost',
    campoUso: 'Use',
    campoAjuste: 'Adjustment',
    campoArmas: 'Weapon Group',
    campoArmaduras: 'Armor Group',
    campoPermissao: 'Permission',
    campoDescricao: 'Description',
    campoEfeito: 'Effect',
    campoGrupo: 'Group',
    campoNivelInicial: 'Starting Level',
    campoVantagem: 'Advantage',
    campoDesvantagem: 'Disadvantage',
    campoRestricao: 'Restriction',
    campoTipo: 'Type',
    campoEvocacao: 'Evocation',
    campoAlcance: 'Range',
    campoDuracao: 'Duration',
    campoDano: 'Damage',
    campoNivel1: 'Level 1',
    campoNivel3: 'Level 3',
    campoNivel5: 'Level 5',
    campoNivel7: 'Level 7',
    campoNivel9: 'Level 9',
    campoSubtipo: 'Subtype',
    campoPlano: 'Plane',
    campoColetivo: 'Group Size',
    campoEstagio: 'Stage',
    campoPeso: 'Weight',
    campoIntelecto: 'Intellect',
    campoAura: 'Aura',
    campoCarisma: 'Charisma',
    campoForca: 'Strength',
    campoFisico: 'Physique',
    campoAgilidade: 'Agility',
    campoPercepcao: 'Perception',
    campoArmadura: 'Armor',
    campoTipoArmadura: 'Armor Type',
    campoAtaque: 'Attack',
    campoMagia: 'Magic',
    campoMagiaN: 'Spell Count',
    campoTecnicasEspeciais: 'Special Techniques',
    campoHabilidades: 'Abilities',
    campoEnergiaFisica: 'Physical Energy',
    campoEnergiaHeroica: 'Heroic Energy',
    campoAbsorcao: 'Absorb',
    campoDefesa: 'Defense',
    campoVelocidade: 'Speed',
    campoDanoL: 'L',
    campoDanoM: 'M',
    campoDanoP: 'P',
    campoDano100: 'Damage 100%',
    campoDano25: 'Damage 25%',
    campoDano50: 'Damage 50%',
    campoDano75: 'Damage 75%',
    campoSlug: 'Slug',
    campoTipoItem: 'Item Type',
    campoOrigem: 'Origin',
    campoIcone: 'Icon',
    campoDocUrl: 'Content link',
    campoEfeitoPositivo: 'Positive Effect',
    campoEfeitoNegativo: 'Negative Effect',
    campoValorLatao: 'Brass Value',
    campoOcupa: 'Occupies',
    campoArmazena: 'Stores',
    campoForcaReq: 'Required Strength',
    campoResistencia: 'Resistance',
    campoNivelMagia: 'Spell Level',
    campoConsumiveis: 'Consumables',
    campoConsumiveisPeso: 'Consumables Weight',
    campoMagico: 'Magical',
    campoAjusteAtributo: 'Adjustment Attribute',
    campoCategoriaEquip: 'Equip Category',
    campoSlotEquip: 'Equip Slot',
    campoGrupoEquipamento: 'Equipment Group',
    campoMaosPequenino: 'Hands (Halfling)',
    campoMaosAnao: 'Hands (Dwarf)',
    campoMaosOutras: 'Hands (Other Races)',
    editorNovo: 'New',
    editorEditar: 'Edit',
    editorSalvando: 'Saving…',
    editorChaveVazia: 'This name does not yield a valid key — use at least one letter or digit.',
    sections: {
      historias:     { label: 'Stories',     desc: 'Your campaigns, arcs and sessions' },
      personagens_m: { label: 'Characters',  desc: 'Allied NPCs, antagonists and extras' },
      criaturas:     { label: 'Creatures',   desc: 'Bestiary and threats of the world' },
      itens:         { label: 'Items',       desc: 'Mundane objects, magical and relics' },
      itens_campanha:{ label: 'Campaign Items', desc: 'Items that exist only in your adventure' },
      magias:        { label: 'Spells',      desc: 'Magic, enchantments and rituals' },
      tecnicas:      { label: 'Techniques',  desc: 'Maneuvers, special moves and feats' },
      habilidades:   { label: 'Abilities',   desc: 'Attributes, skills and capacities' },
      personagens_j: { label: 'My Characters', desc: 'Your adventurer sheets' },
      inventario:    { label: 'Inventory',   desc: 'Items your characters carry' },
      loja:          { label: 'Shop',        desc: 'Gear and items available for purchase' },
      convites:      { label: 'Invites',     desc: 'Accept invites and see your active tables' },
      aventuras:     { label: 'Stories',     desc: 'Adventures lived by your characters' },
      /* Vieram do Diário em 12/09/2026 — antes eram abas dentro da ficha. */
      lugares:       { label: 'Places',      desc: 'The kingdoms and cities your character knows' },
      npcs:          { label: 'NPCs',        desc: 'The people your character has met' },
      memorias:      { label: 'Memories',    desc: 'What your character wrote about what they lived' },
    }
  }
};

/* ── Limites do plano gratuito ────────────────────────────────────────────
   Fonte ÚNICA. O número vivia repetido em três arquivos (historias.jsx,
   personagens.jsx e shell.jsx, este último duas vezes só pra montar o
   tooltip) e tinha divergido do que o onboarding promete: o
   PlanoEscolhaModal anuncia "1 história / 1 personagem" e o código aplicava
   2 e 3. O onboarding é a fonte da verdade (decisão do usuário, 01/09/2026).

   ⚠️ Isto é gate de UI. Um cliente que fale direto com o PostgREST não é
   barrado por aqui — a checagem no banco é assunto separado. */
const PLANO_FREE_LIMITES = { historias: 1, personagens: 1 };

/* ── A BARRA LATERAL, reorganizada em 12/09/2026 ───────────────────
   Três mudanças pedidas pelo usuário, e cada uma tem uma razão de lugar:

   `historias` SAIU do Mestre — o conteúdo passou a ser alcançado de dentro de
   Personagens, porque personagem pertence a história: procurar um pela outra é
   o caminho natural, e duas portas para a mesma coisa dividiam a atenção.

   `convites` SAIU do Jogador — foi para o menu de baixo, junto de perfil e
   idioma. Convite não é um lugar do mundo do jogo (como criaturas, itens,
   magias); é administração da conta, e é lá que ela mora.

   `lugar`, `personagem` e `memoria` ENTRARAM no Jogador — vieram do Diário,
   que era uma aba dentro da ficha. Deixaram de ser um canto de uma tela para
   virar três destinos próprios, que é o peso que têm na mesa. */
const ADMIN_SECTIONS = {
  master: [
    { id: 'personagens_m', icon: 'Skull' },
    { id: 'criaturas',     icon: 'Tower' },
    { id: 'itens',         icon: 'Sheet' },
    { id: 'itens_campanha', icon: 'Chest' },
    { id: 'magias',        icon: 'Flame' },
    { id: 'tecnicas',      icon: 'Sword' },
    { id: 'habilidades',   icon: 'Shield' },
  ],
  player: [
    { id: 'personagens_j', icon: 'Skull' },
    { id: 'criaturas',     icon: 'Tower' },
    { id: 'inventario',    icon: 'Scroll' },
    { id: 'loja',          icon: 'Store' },
    { id: 'aventuras',     icon: 'BookOpen' },
    // Vieram do Diário (era aba dentro da ficha) em 12/09/2026.
    { id: 'lugares',       icon: 'MapPin' },
    { id: 'npcs',          icon: 'Users' },
    { id: 'memorias',      icon: 'Feather' },
    // Catálogos filtrados pelo que o jogador conhece/possui (spec
    // docs/superpowers/specs/2026-09-11-catalogos-visao-jogador-design.md §4).
    // Mesmos ícones da lista master, propositalmente. `criaturas` FICA DE FORA
    // até a Fase B (tabela de liberação) existir — ver §5 da spec.
    { id: 'itens',         icon: 'Sheet' },
    { id: 'magias',        icon: 'Flame' },
    { id: 'tecnicas',      icon: 'Sword' },
    { id: 'habilidades',   icon: 'Shield' },
  ],
};

Object.assign(window, { FANTASY_MONTHS, FANTASY_WEEKDAYS, AUTH_COPY, ADMIN_COPY, ADMIN_SECTIONS, PLANO_FREE_LIMITES });