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
    sections: {
      historias:     { label: 'Histórias',    desc: 'Suas campanhas, arcos e sessões' },
      personagens_m: { label: 'Personagens',  desc: 'Aliados, antagonistas e figurantes' },
      criaturas:     { label: 'Criaturas',    desc: 'Bestiário e ameaças do mundo' },
      itens:         { label: 'Itens',        desc: 'Objetos mundanos, mágicos e relíquias' },
      itens_campanha:{ label: 'Itens da Campanha', desc: 'Itens que só existem na sua aventura' },
      magias:        { label: 'Magias',       desc: 'Feitiços, encantamentos e rituais' },
      tecnicas:      { label: 'Técnicas',     desc: 'Manobras, golpes especiais e talentos' },
      habilidades:   { label: 'Habilidades',  desc: 'Atributos, perícias e capacidades' },
      personagens_j: { label: 'Personagens',  desc: 'Suas fichas de aventureiros' },
      inventario:    { label: 'Inventário',   desc: 'Itens que seus personagens carregam' },
      loja:          { label: 'Loja',         desc: 'Equipamentos e itens disponíveis pra compra' },
      convites:      { label: 'Convites',     desc: 'Aceite convites e veja suas mesas ativas' },
      aventuras:     { label: 'Histórias',    desc: 'As aventuras vividas pelos seus personagens' },
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
    sections: {
      historias:     { label: 'Stories',     desc: 'Your campaigns, arcs and sessions' },
      personagens_m: { label: 'Characters',  desc: 'Allied NPCs, antagonists and extras' },
      criaturas:     { label: 'Creatures',   desc: 'Bestiary and threats of the world' },
      itens:         { label: 'Items',       desc: 'Mundane objects, magical and relics' },
      itens_campanha:{ label: 'Campaign Items', desc: 'Items that exist only in your adventure' },
      magias:        { label: 'Spells',      desc: 'Magic, enchantments and rituals' },
      tecnicas:      { label: 'Techniques',  desc: 'Maneuvers, special moves and feats' },
      habilidades:   { label: 'Abilities',   desc: 'Attributes, skills and capacities' },
      personagens_j: { label: 'Characters',  desc: 'Your adventurer sheets' },
      inventario:    { label: 'Inventory',   desc: 'Items your characters carry' },
      loja:          { label: 'Shop',        desc: 'Gear and items available for purchase' },
      convites:      { label: 'Invites',     desc: 'Accept invites and see your active tables' },
      aventuras:     { label: 'Stories',     desc: 'Adventures lived by your characters' },
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

const ADMIN_SECTIONS = {
  master: [
    { id: 'historias',     icon: 'Scroll' },
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
    { id: 'inventario',    icon: 'Scroll' },
    { id: 'loja',          icon: 'Sheet' },
    { id: 'aventuras',     icon: 'BookOpen' },
    { id: 'convites',      icon: 'Crown' },
  ],
};

Object.assign(window, { FANTASY_MONTHS, FANTASY_WEEKDAYS, AUTH_COPY, ADMIN_COPY, ADMIN_SECTIONS, PLANO_FREE_LIMITES });