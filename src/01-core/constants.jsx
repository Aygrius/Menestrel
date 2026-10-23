/* ============================================================
   CONSTANTS — Constantes globais usadas por toda a aplicação
   ============================================================
   - FANTASY_MONTHS / FANTASY_WEEKDAYS — calendário fantasy
   - AUTH_COPY — strings do fluxo de login Google
   - ADMIN_COPY — strings do console administrativo
   - ADMIN_SECTIONS — seções (destinos) por perfil (master/player)
   - ADMIN_MENU — a árvore do menu lateral por cima delas (grupos e filtros)

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

/* Os FERIADOS do calendário não moram aqui: são os 44 de FERIADOS_FANTASY, em
   10-shell/shell.jsx, junto do CalendarioFantasyModal que os desenha. Cheguei
   a criar uma segunda tabela neste arquivo em 20/09/2026, sem ter achado a
   primeira — duas fontes de verdade para a mesma lore, desfeito no mesmo dia.
   Quem precisar consultar usa `feriadosDoDia(dia, mes)`, que devolve ARRAY:
   há datas com mais de um feriado. */

// Strings de copy só pro fluxo de auth
const AUTH_COPY = {
  pt: {
    signout:     'Sair',
    google_btn:  'Continuar com Google',
    redirecting: 'Forjando seu acesso...',
    lema:        'A regra é do sistema; a mesa fica com a história.',
    feito:       'Feito para Tagmar · Mestres e Jogadores',
    title:       'Entrar',
    sub:         'Entre com a sua conta Google para abrir o seu grimório.',
    aguarde:     'Aguarde um momento.',
    erro:        'Não foi possível iniciar o login. Tente novamente.',
    consent:     'Ao entrar, você concorda com a Política de Privacidade e com o tratamento dos seus dados conforme a LGPD.',
  },
  en: {
    signout:     'Sign out',
    google_btn:  'Continue with Google',
    redirecting: 'Forging your access...',
    lema:        'The rules belong to the system; the table keeps the story.',
    feito:       'Made for Tagmar · Game Masters and Players',
    title:       'Sign in',
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
    campoElemento: 'Elemento',
    campoPlano: 'Plano',
    campoForaDaLista: 'fora da lista',
    campoColetivo: 'Coletivo',
    campoMontaria: 'Montaria',
    campoCriatura: 'Criatura',
    campoSemVinculo: '— nenhuma —',
    campoEstagio: 'Estágio',
    campoPeso: 'Peso',
    campoAltura: 'Altura (m)',
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
    campoTecnica: 'Técnica',
    campoMagiaN: 'Nível das Magias',
    // Seletor de lista do editor (técnicas/habilidades/magias da criatura).
    listaBuscar: 'Buscar',
    listaRemover: 'Remover',
    listaForaCatalogo: 'Não está no catálogo',
    // Só "Técnicas" desde 14/09/2026 (pedido do usuário). A coluna segue tecnicas_especiais.
    campoTecnicasEspeciais: 'Técnicas',
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
    campoEquipamento: 'Equipamento',
    campoResistenciaFisica: 'Resistência Física',
    campoResistenciaMagica: 'Resistência Mágica',
    equipRemover: 'Tirar',
    equipVazio: 'Nada equipado.',
    equipJaEquipada: 'Esta arma já está equipada.',
    equipSlotOcupado: 'Já há uma peça nesse lugar.',
    equipSemSlot: 'Este item não tem onde ser equipado.',
    // Ataque × Equipamento (25/09/2026)
    campoArmasAtaque: 'Ataque',
    equipNaoEArma: 'Só armas entram em Ataque.',
    equipNaMochila: 'na mochila',
    equipMenos: 'Um a menos',
    equipMais: 'Um a mais',
    campoDano25: 'Dano 25%',
    campoDano50: 'Dano 50%',
    campoDano75: 'Dano 75%',
    campoSlug: 'Slug',
    campoTipoItem: 'Tipo de Item',
    campoOrigem: 'Origem',
    campoIcone: 'Ícone',
    campoIconeInvalido: 'Ícone inválido: use o nome do Tabler, ex.: ti-paw.',
    campoDocUrl: 'Link do conteúdo',
    campoEfeitoPositivo: 'Efeito Positivo',
    campoEfeitoNegativo: 'Efeito Negativo',
    campoValorLatao: 'Valor',
    campoItensNecessarios: 'Itens necessários',
    campoPergaminhosLivro: 'Pergaminhos deste livro',
    campoClasse: 'Classe',
    vinculoNaoCarregou: 'Os pergaminhos deste livro não carregaram; salvar não vai mexer neles.',
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
    editorExcluir: 'Excluir',
    editorExcluirConfirmar: 'Confirmar exclusão',
    editorExcluindo: 'Excluindo…',
    editorAnimalFalhou: 'Criatura salva, mas o item Animal não foi atualizado:',
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
      /* Reinos e Conhecidos (26/09/2026): eram Lugares e NPCs. O id da
         seção não mudou — só o nome que a tela mostra. */
      lugares:       { label: 'Reinos',       desc: 'Os reinos que seu personagem conhece' },
      /* Pessoas (22/10/2026): eram Conhecidos — "Mude o menu 'conhecidos'
         para 'pessoas'". O id continua npcs. */
      npcs:          { label: 'Pessoas',      desc: 'As pessoas que seu personagem conheceu' },
      cidades:       { label: 'Cidades',      desc: 'As cidades do mundo e de quem elas são' },
      // Locais (22/10/2026): como Cidades, sem governante, religião e economia.
      locais:        { label: 'Locais',       desc: 'Os lugares do mundo que não são cidades' },
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
    campoElemento: 'Element',
    campoPlano: 'Plane',
    campoForaDaLista: 'not in list',
    campoColetivo: 'Group Size',
    campoMontaria: 'Mount',
    campoCriatura: 'Creature',
    campoSemVinculo: '— none —',
    campoEstagio: 'Stage',
    campoPeso: 'Weight',
    campoAltura: 'Height (m)',
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
    campoTecnica: 'Technique',
    campoMagiaN: 'Spell Level',
    listaBuscar: 'Search',
    listaRemover: 'Remove',
    listaForaCatalogo: 'Not in the catalog',
    campoTecnicasEspeciais: 'Techniques',
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
    campoEquipamento: 'Equipment',
    campoResistenciaFisica: 'Physical Resistance',
    campoResistenciaMagica: 'Magic Resistance',
    equipRemover: 'Remove',
    equipVazio: 'Nothing equipped.',
    equipJaEquipada: 'This weapon is already equipped.',
    equipSlotOcupado: 'There is already a piece in that spot.',
    equipSemSlot: 'This item has nowhere to be equipped.',
    campoArmasAtaque: 'Attack',
    equipNaoEArma: 'Only weapons go in Attack.',
    equipNaMochila: 'in the pack',
    equipMenos: 'One less',
    equipMais: 'One more',
    campoDano25: 'Damage 25%',
    campoDano50: 'Damage 50%',
    campoDano75: 'Damage 75%',
    campoSlug: 'Slug',
    campoTipoItem: 'Item Type',
    campoOrigem: 'Origin',
    campoIcone: 'Icon',
    campoIconeInvalido: 'Invalid icon: use the Tabler name, e.g. ti-paw.',
    campoDocUrl: 'Content link',
    campoEfeitoPositivo: 'Positive Effect',
    campoEfeitoNegativo: 'Negative Effect',
    campoValorLatao: 'Value',
    campoItensNecessarios: 'Required items',
    campoPergaminhosLivro: 'Scrolls in this book',
    campoClasse: 'Class',
    vinculoNaoCarregou: 'This book’s scrolls did not load; saving will leave them untouched.',
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
    editorExcluir: 'Delete',
    editorExcluirConfirmar: 'Confirm delete',
    editorExcluindo: 'Deleting…',
    editorAnimalFalhou: 'Creature saved, but its Animal item was not updated:',
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
      lugares:       { label: 'Kingdoms',    desc: 'The kingdoms and cities your character knows' },
      npcs:          { label: 'People',      desc: 'The people your character has met' },
      cidades:       { label: 'Cities',      desc: 'The cities of the world and who holds them' },
      locais:        { label: 'Places',      desc: 'The places of the world that are not cities' },
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
// PLANO_FREE_LIMITES saiu em 23/10/2026: não há mais plano gratuito nem Premium.

/* ── A BARRA LATERAL, reorganizada em 12/09/2026 ───────────────────
   Três mudanças pedidas pelo usuário, e cada uma tem uma razão de lugar:

   (`historias` chegou a sair do Mestre nesta reorganização, alcançada por um
   botão dentro de Personagens. Não era para sair — o usuário corrigiu no mesmo
   dia, e ela voltou a ser a primeira seção da barra.)

   `convites` SAIU do Jogador — foi para o menu de baixo, junto de perfil e
   idioma. Convite não é um lugar do mundo do jogo (como criaturas, itens,
   magias); é administração da conta, e é lá que ela mora.

   `lugar`, `personagem` e `memoria` ENTRARAM no Jogador — vieram do Diário,
   que era uma aba dentro da ficha. Deixaram de ser um canto de uma tela para
   virar três destinos próprios, que é o peso que têm na mesa. */
const ADMIN_SECTIONS = {
  master: [
    { id: 'historias',     icon: 'Scroll' },
    { id: 'personagens_m', icon: 'Skull' },
    /* Lugares e NPCs no menu do MESTRE (17/09/2026): "Não está aparecendo para
       o mestre o menu NPCs e lugares, vinculados à história selecionada."
       Eram só do Jogador; o Mestre tinha o mesmo conteúdo escondido atrás de
       Histórias → card da mesa → "Lore". São o GerenciarLoreView travado num
       tipo, lendo a mesa ativa (ver LoreDaMesa, 13-diario/diario.jsx).
       Memórias não entra: memória é do personagem, não da mesa. */
    { id: 'lugares',       icon: 'MapPin' },
    // Cidades (26/09/2026): página própria no Diário, separada de Reinos.
    { id: 'cidades',       icon: 'Cidade' },
    // Locais (22/10/2026): florestas, ruínas, masmorras — o que não é cidade.
    { id: 'locais',        icon: 'Local' },
    { id: 'npcs',          icon: 'Users' },
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
    // Cidades (26/09/2026): página própria no Diário, separada de Reinos.
    { id: 'cidades',       icon: 'Cidade' },
    { id: 'locais',        icon: 'Local' },
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

/* ============================================================
   ADMIN_MENU — a árvore do menu lateral (26/09/2026)
   ============================================================
   "Magias, Técnicas e Habilidades vão virar um submenu de Treinamento.
    Magias Básicas, Ancestrais e Perdidas serão submenus de Magias. Técnicas
    Básicas e Especializadas, de Técnicas. Habilidades de Profissão, de
    Influência, etc, de Habilidades. Lugares e NPCs vão ser um submenu de
    Diário [Reinos e Conhecidos]. Itens vira submenu de Comércio; Armas,
    Minerais, Consumíveis, etc serão submenus de Comércio." (usuário)

   ADMIN_SECTIONS continua sendo a lista de DESTINOS (o que existe, por
   perfil); esta árvore só diz como se chega neles. Cada folha aponta para uma
   seção e, opcionalmente, um `filtro` que a lista aplica:
     magias      → magias.tipo       ('Básica' | 'Ancestral' | 'Perdida')
     tecnicas    → categoriaTecnica  ('basica' | 'especializada', pelo tecnicas.tipo)
     habilidades → habilidades.grupo ('Profissional', 'Influência', …)
     itens       → itens.grupo       ('Armas', 'Minerais', …)
   Sem folha "Todas" (26/09/2026: "você criou um Todas que eu não pedi"):
   cada subgrupo lista só as divisões que o usuário ditou.

   Nó: { secao }                        — folha no topo (ícone de ADMIN_SECTIONS)
       { id, icon, rotulo, filhos }     — grupo (abre o painel ao lado da barra)
       { secao, rotulo, filhos }        — subgrupo (segunda coluna do painel)
       { secao, filtro?, rotulo, titulo? } — folha dentro do painel
   `rotulo` é o texto do painel; `titulo`, quando existe, é o título da página
   ("Básicas" no painel de Magias, "Magias Básicas" no topo da tabela). */
const R = (pt, en) => ({ pt, en });

/* CLICÁVEL E COM FILHOS (29/09/2026): "quero que seja possível clicar em
   magias e ver todas as magias, ou passar o mouse e abrir para básicas e
   clicar pra ver só as básicas, e depois das básicas, ter as profissões, e
   clicar para ver só as profissões. Isso para técnicas, habilidades, etc."
   (usuário). `navega: true` faz o nó com filhos ser destino também: clicar
   navega, passar o mouse abre a coluna seguinte. Decisões do usuário no
   mesmo dia: as profissões numa TERCEIRA coluna, e a profissão conta as
   especializações dela (Mago + os Colégios).

   O filtro de profissão viaja no mesmo texto: "Básica|Mago" — tipo, barra,
   profissão. As listas separam (separarFiltroMenu, 09-bestiario).
   A coluna das profissões saiu em 22/10/2026, com a permissão: magias e
   técnicas se aprendem pelo item, de qualquer profissão. */
/* Magias por CLASSE (22/10/2026): a permissão saiu das magias — qualquer
   profissão aprende pelo item —, e o menu passou a dividir pela classe
   (Feitiço, Milagre, Encanto, Transmutação) e, dentro dela, pelo tipo.
   O filtro viaja como "tipo|classe": "|Feitiço" é a classe inteira,
   "Básica|Feitiço" só os feitiços básicos (separarFiltroMenu, 09-bestiario).
   Os rótulos concordam em gênero: Feitiços Básicos, Transmutações Básicas. */
const CLASSES_MAGIA_MENU = [
  { classe: 'Feitiço',      pl: R('Feitiços', 'Sorceries'),          fem: false },
  { classe: 'Milagre',      pl: R('Milagres', 'Miracles'),           fem: false },
  { classe: 'Encanto',      pl: R('Encantos', 'Enchantments'),       fem: false },
  { classe: 'Transmutação', pl: R('Transmutações', 'Transmutations'), fem: true },
];
const TIPOS_MAGIA_MENU = [
  { tipo: 'Básica',    m: 'Básicos',    f: 'Básicas',    en: 'Basic' },
  { tipo: 'Ancestral', m: 'Ancestrais', f: 'Ancestrais', en: 'Ancestral' },
  { tipo: 'Perdida',   m: 'Perdidos',   f: 'Perdidas',   en: 'Lost' },
];
const MENU_MAGIAS = {
  secao: 'magias', rotulo: R('Magias', 'Spells'), navega: true,
  filhos: CLASSES_MAGIA_MENU.map((c) => ({
    secao: 'magias', filtro: '|' + c.classe, rotulo: c.pl, titulo: c.pl, navega: true,
    filhos: TIPOS_MAGIA_MENU.map((t) => {
      const adj = c.fem ? t.f : t.m;
      return {
        secao: 'magias', filtro: t.tipo + '|' + c.classe, rotulo: R(adj, t.en),
        titulo: R(c.pl.pt + ' ' + adj, t.en + ' ' + c.pl.en),
      };
    }),
  })),
};
/* Técnicas pelo TIPO (22/10/2026): a permissão saiu — qualquer profissão
   aprende qualquer técnica pelo item —, e com ela a coluna das profissões,
   como nas magias. Ficam as duas divisões que o usuário ditou. */
const MENU_TECNICAS = {
  secao: 'tecnicas', rotulo: R('Técnicas', 'Techniques'), navega: true, filhos: [
    { secao: 'tecnicas', filtro: 'basica', rotulo: R('Básicas', 'Basic'), titulo: R('Técnicas Básicas', 'Basic Techniques') },
    { secao: 'tecnicas', filtro: 'especializada', rotulo: R('Especializadas', 'Specialized'), titulo: R('Técnicas Especializadas', 'Specialized Techniques') },
  ],
};
// Habilidade não tem profissão no banco: clicar abre todas; os grupos, como antes.
const MENU_HABILIDADES = {
  secao: 'habilidades', rotulo: R('Habilidades', 'Skills'), navega: true, filhos: [
    ...[
      ['Profissional', 'Profissão', 'Profession', 'de Profissão'],
      ['Influência', 'Influência', 'Influence', 'de Influência'],
      ['Conhecimento', 'Conhecimento', 'Knowledge', 'de Conhecimento'],
      ['Manobra', 'Manobra', 'Maneuver', 'de Manobra'],
      ['Subterfúgio', 'Subterfúgio', 'Subterfuge', 'de Subterfúgio'],
      ['Geral', 'Gerais', 'General', 'Gerais'],
    ].map(([filtro, pt, en, dePt]) => ({
      secao: 'habilidades', filtro, rotulo: R(pt, en), titulo: R('Habilidades ' + dePt, en + ' Skills'),
    })),
  ],
};
const TREINAMENTO = {
  id: 'treinamento', icon: 'Treino', rotulo: R('Treinamento', 'Training'),
  filhos: [MENU_MAGIAS, MENU_TECNICAS, MENU_HABILIDADES],
};
/* A ordem é de uso, não alfabética: o que se compra para a aventura primeiro,
   o que é raro ou administrativo (Moedas, Diário) por último. */
const COMERCIO = {
  id: 'comercio', icon: 'Comercio', rotulo: R('Comércio', 'Trade'),
  filhos: [
    ...[
      ['Armas', 'Armas', 'Weapons'], ['Armaduras', 'Armaduras', 'Armor'],
      ['Vestimentas', 'Vestimentas', 'Clothing'], ['Consumíveis', 'Consumíveis', 'Consumables'],
      ['Itens', 'Itens', 'Items'], ['Recipientes', 'Recipientes', 'Containers'],
      ['Instrumentos', 'Instrumentos', 'Instruments'], ['Minerais', 'Minerais', 'Minerals'],
      ['Animais', 'Animais', 'Animals'], ['Transportes', 'Transportes', 'Transport'],
      ['Propriedades', 'Propriedades', 'Properties'], ['Serviços', 'Serviços', 'Services'],
      // "Diário" saiu do Comércio em 26/09/2026 ("remova o submenu Diário").
      ['Moedas', 'Moedas', 'Coins'],
    ].map(([filtro, pt, en]) => ({ secao: 'itens', filtro, rotulo: R(pt, en) })),
  ],
};
/* Criaturas por CLASSE (26/09/2026): "Na tabela criaturas, criar um submenu
   com a classe." As nove classes que o catálogo usa (criaturas.tipo),
   em ordem alfabética; o rótulo no plural, como os grupos de Comércio. */
const CRIATURAS = {
  id: 'bestiario', icon: 'Tower', rotulo: R('Criaturas', 'Creatures'),
  filhos: [
    ['Animal', 'Animais', 'Animals'], ['Celestial', 'Celestiais', 'Celestials'],
    // Demônio saiu em 28/09/2026: "Criaturas 'Infernais' e 'Demônios' são a mesma
    // classe, o certo é 'Infernais'."
    ['Civilizado', 'Civilizados', 'Civilized'],
    ['Dragão', 'Dragões', 'Dragons'], ['Elemental', 'Elementais', 'Elementals'],
    ['Infernal', 'Infernais', 'Infernals'], ['Místico', 'Místicos', 'Mystics'],
    ['Morto', 'Mortos', 'Undead'],
  ].map(([filtro, pt, en]) => ({ secao: 'criaturas', filtro, rotulo: R(pt, en) })),
};
const diario = (comMemorias) => ({
  id: 'diario', icon: 'Diario', rotulo: R('Diário', 'Journal'),
  filhos: [
    { secao: 'lugares', rotulo: R('Reinos', 'Kingdoms') },
    { secao: 'cidades', rotulo: R('Cidades', 'Cities') },
    { secao: 'locais', rotulo: R('Locais', 'Places') },
    { secao: 'npcs', rotulo: R('Pessoas', 'People') },
    // Memórias é do personagem, não da mesa — só o Jogador tem.
    ...(comMemorias ? [{ secao: 'memorias', rotulo: R('Memórias', 'Memories') }] : []),
  ],
});

const ADMIN_MENU = {
  master: [
    { secao: 'historias' },
    { secao: 'personagens_m' },
    diario(false),
    CRIATURAS,
    COMERCIO,
    TREINAMENTO,
  ],
  player: [
    { secao: 'personagens_j' },
    CRIATURAS,
    { secao: 'aventuras' },
    diario(true),
    COMERCIO,
    TREINAMENTO,
  ],
};

/* ============================================================
   NAV_MESA — a navegação "Mesa em Sessão" (22/10/2026)
   ============================================================
   Crítica de 22/10/2026 (19/40): o menu misturava a mesa, o livro de regras
   e a conta, com 54 destinos sem grupos, e enterrava a sessão ao vivo dentro
   do card da história. Decisão do usuário, no mesmo dia: o MESTRE navega pela
   mesa ativa (Cena, Batalha, Personagens, Diário, Loja, Jogadores); o JOGADOR,
   pelo personagem ativo (Ficha, Inventário, Loja, Diário, Mesa). Abaixo de uma
   régua, o Livro de Regras; a conta mora no avatar.

   ADMIN_MENU continua sendo a árvore dos FILTROS (classes de magia, grupos de
   itens…) — os nós do Livro de Regras são os mesmos objetos, e o painel ao
   lado (NavMenuPainel) segue abrindo os filtros que o usuário ditou.

   Destinos novos (não estão em ADMIN_SECTIONS; o console os soma):
     cena, batalha, loja_mesa, jogadores — telas da história ativa (Mestre);
     ficha, inventario, loja            — abas da ficha do personagem ativo. */
const SECOES_DA_MESA = {
  master: [
    { id: 'cena',      icone: 'ti-building-castle',         rotulo: R('Cena', 'Scene') },
    { id: 'batalha',   icone: 'ti-swords',         rotulo: R('Batalha', 'Battle') },
    { id: 'loja_mesa', icone: 'ti-building-store', rotulo: R('Loja', 'Shop') },
    { id: 'jogadores', icone: 'ti-mail',           rotulo: R('Jogadores', 'Players') },
  ],
  player: [
    { id: 'ficha',      icone: 'ti-id',             rotulo: R('Ficha', 'Sheet') },
    { id: 'inventario', icone: 'ti-briefcase-2',    rotulo: R('Inventário', 'Inventory') },
    { id: 'loja',       icone: 'ti-building-store', rotulo: R('Loja', 'Shop') },
  ],
};
const ROTULO_LIVRO = R('Livro de Regras', 'Rulebook');
const NAV_MESA = {
  master: {
    mesa: [
      { secao: 'cena' }, { secao: 'batalha' }, { secao: 'personagens_m' },
      diario(false),
      /* A Loja do Mestre é o Estoque, sem gaveta (23/10/2026): lojas por cidade e
         propostas de venda. "Itens da Campanha" saiu do menu (não chegava a
         lugar nenhum); a página continua no código. */
      { secao: 'loja_mesa', rotulo: R('Loja', 'Shop') },
      { secao: 'jogadores' },
    ],
    regras: [
      CRIATURAS, { ...COMERCIO, rotulo: R('Itens', 'Items') },
      MENU_MAGIAS, MENU_TECNICAS, MENU_HABILIDADES,
    ],
  },
  player: {
    mesa: [
      /* A FICHA NO MENU (23/10/2026): "precisa repetir os menus na ficha, já
         que estão na barra lateral?" (usuário). As partes da ficha viraram
         a gaveta da Ficha; a fileira de abas no cartão saiu para o Jogador.
         O filtro é a aba (FichaPersonagem: ficha/info/conhecimento/animais);
         Animais só aparece quando o personagem tem algum (10-shell). */
      /* SEM A GAVETA (23/10/2026): "resumo vira ficha, ele e os outros viram
         menus fora do antigo ficha. O menu personagem vira 'Identificação'"
         e Animais vira "Companheiros" (animais, enviados, demônios,
         elementais — os seres sob controle do personagem). */
      { id: 'ficha_ficha', secao: 'ficha', filtro: 'ficha', rotulo: R('Ficha', 'Sheet'), titulo: R('Ficha', 'Sheet') },
      { id: 'ficha_ident', secao: 'ficha', filtro: 'info', rotulo: R('Identificação', 'Identity'), titulo: R('Identificação', 'Identity') },
      { id: 'ficha_conhec', secao: 'ficha', filtro: 'conhecimento', rotulo: R('Conhecimento', 'Knowledge'), titulo: R('Conhecimento', 'Knowledge') },
      { id: 'ficha_comp', secao: 'ficha', filtro: 'animais', rotulo: R('Companheiros', 'Companions'), titulo: R('Companheiros', 'Companions') },
      { secao: 'inventario' }, { secao: 'loja' },
      diario(true), { secao: 'aventuras' },
    ],
    regras: [
      CRIATURAS, { ...COMERCIO, rotulo: R('Itens', 'Items') },
      MENU_MAGIAS, MENU_TECNICAS, MENU_HABILIDADES,
    ],
  },
};

/* As folhas da árvore, achatadas — quem precisa saber "este destino está no
   menu?" ou "qual o título desta página?" pergunta aqui. */
function folhasDoMenu(nos) {
  const out = [];
  // Nó `navega` é destino E abre filhos: entra antes deles, então é ele o
  // destino "sem filtro" da seção (clicar em Magias = todas).
  const visitar = (n) => {
    if (n.filhos) { if (n.navega && n.secao) out.push(n); n.filhos.forEach(visitar); }
    else if (n.secao) out.push(n);
  };
  (nos || []).forEach(visitar);
  return out;
}

Object.assign(window, { FANTASY_MONTHS, FANTASY_WEEKDAYS, AUTH_COPY, ADMIN_COPY, ADMIN_SECTIONS, ADMIN_MENU, folhasDoMenu, SECOES_DA_MESA, NAV_MESA, ROTULO_LIVRO });