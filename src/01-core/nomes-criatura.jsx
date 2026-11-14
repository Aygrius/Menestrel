/* ============================================================
   nomes-criatura.jsx — o nome próprio de quem entra na batalha
   ============================================================
   Pedido do usuário (14/11/2026): "Ao adicionar criaturas novas na batalha,
   adicione um nome para elas de acordo com sua natureza. Um orc não se chama
   orc, ele se chama Mudush (por exemplo), e sua raça é orc. [...] Apenas as
   criaturas irracionais (intelecto negativo) não possuem nome na batalha.
   Criaturas pertencente aos personagens que foram batizadas continuam
   carregando seus nomes."

   Decisão do mesmo dia, porque Orc (−1), Ogros e Gigantes (−2) têm intelecto
   negativo no bestiário: A LISTA MANDA. Toda criatura de uma raça com lista
   ganha nome, qualquer que seja o intelecto; sem lista, fica o nome da
   espécie. Animal nunca tem nome (e o companheiro do PJ não passa por aqui).

   Puro, sem React. Quem chama: a janela de criar/reforçar e a invocação
   (12-batalha/batalha.jsx). O nome da espécie segue no participante como
   `especie`, e o card mostra os dois.
   ============================================================ */

const NOMES_POR_RACA = {
  orc: {
    m: ['Azrog', 'Carzog', 'Cognor', 'Golg', 'Kragar', 'Mudush', 'Vrakul', 'Zornak', 'Zuggul', 'Skargor'],
    f: ['Agral', 'Bula', 'Drashka', 'Engong', 'Gorma', 'Lokara', 'Neega', 'Vorka'],
  },
  anao: {
    m: ['Balin', 'Brokkr', 'Durin', 'Gimli', 'Kazador', 'Moradin', 'Thrain', 'Ulfgar'],
    f: ['Amber', 'Brigid', 'Dagnal', 'Falkrunn', 'Helga', 'Kathra', 'Riswynn', 'Torgga'],
    sobrenomes: ['Barba-de-Ferro', 'Forja-Fogo', 'Martelo-de-Pedra', 'Punho-de-Granito', 'Escudo-de-Carvalho', 'Veio-de-Ouro'],
  },
  elfo: {
    m: ['Aelar', 'Aramil', 'Caelum', 'Elenar', 'Faelar', 'Galadorn', 'Ivellios', 'Laucian', 'Peren', 'Silvyr', 'Thamior', 'Varis'],
    f: ['Adrie', 'Althaea', 'Caelynn', 'Elenwe', 'Faelyn', 'Keyleth', 'Leshanna', 'Meriele', 'Naivara', 'Sariel', 'Thia', 'Valanthe'],
    sobrenomes: ['Amakiir', 'Galanodel', 'Holimion', 'Ilphelkiir', 'Liadon', 'Meliamne', 'Naïlo', 'Siannodel', 'Xiloscient'],
  },
  humano: {
    m: ['Aldric', 'Balthazar', 'Cedric', 'Dorian', 'Edric', 'Garrick', 'Hadrian', 'Julian', 'Kaelen', 'Lucian', 'Marcus', 'Roland', 'Tristan', 'Vance'],
    f: ['Adelaide', 'Beatrice', 'Cassandra', 'Eleanor', 'Freya', 'Genevieve', 'Helena', 'Isolde', 'Lyra', 'Morgana', 'Rowena', 'Seraphina', 'Valeria', 'Yennefer'],
    sobrenomes: ['Blackwood', 'Crownguard', 'Falkenrath', 'Hawthorne', 'Montfort', 'Beaufort', 'Pendragon', 'Silverhand', 'Stormwind', 'Thorne', 'Vance', 'Vane', 'Winterbourne'],
  },
  pequenino: {
    m: ['Adelard', 'Bilbo', 'Bungo', 'Drogo', 'Falco', 'Fosco', 'Milo', 'Odo', 'Pippin', 'Polo', 'Samwise', 'Toby'],
    f: ['Belladonna', 'Daisy', 'Esmeralda', 'Estella', 'Lily', 'Lobelia', 'Marigold', 'May', 'Pearl', 'Poppy', 'Primula', 'Rosie'],
    sobrenomes: ['Bolseiro', 'Brandebuque', 'Carrapicho', 'Chifres-de-Prata', 'Covas-Fundas', 'Gamgee', 'Pé-Soberbo', 'Pés-Peludos', 'Sacola', 'Tûk'],
  },
  demonio: {
    nomes: ['Gothmog', 'Lungorthin', 'Tarlang', 'Rogrog', 'Vulgor', 'Kargath', 'Zharak', 'Maugoth', 'Thauron', 'Ignarok', 'Azaghal', 'Malkor'],
    titulos: ['A Perdição de Durin', 'O Flagelo de Fogo', 'O Senhor das Chamas Negras', 'A Sombra Ardente', 'O Devorador de Luz', 'O Terror das Profundezas', 'O Arauto das Cinzas', 'O Rei das Forjas Sombrias'],
  },
  enviado: {
    nomes: ['Abaddon', 'Abdiel', 'Azrael', 'Camael', 'Cassiel', 'Gabriel', 'Haniel', 'Jophiel', 'Metatron', 'Miguel', 'Rafael', 'Raziel', 'Sandalphon', 'Uriel', 'Zadkiel',
      'Anael', 'Ariel', 'Auriel', 'Celestine', 'Duma', 'Erelah', 'Lailah', 'Muriel', 'Oriel', 'Remiel', 'Sariel', 'Seraphiel', 'Tabris', 'Zaphkiel'],
    titulos: ['O Portador da Luz', 'A Espada Flamejante', 'O Arauto do Amanhecer', 'O Guardião dos Portões', 'A Voz do Firmamento', 'O Escudo Divino', 'A Chama Eterna', 'O Observador Silencioso'],
  },
  ogro: {
    m: ['Blarg', 'Boog', 'Brugg', 'Crag', 'Durg', 'Grog', 'Grunk', 'Korg', 'Lurg', 'Mok', 'Mung', 'Ogg', 'Thud', 'Ugg'],
    f: ['Barga', 'Bluga', 'Dorga', 'Graga', 'Gula', 'Helga', 'Korga', 'Maga', 'Morga', 'Ogga', 'Ugga', 'Zorga'],
    titulos: ['Barriga-de-Pedra', 'Quebra-Ossos', 'Olho-Torto', 'Come-Tudo', 'Mão-Pesada', 'Dente-Podre', 'Esmaga-Crânios', 'O Grande'],
  },
  tritao: {
    nomes: ['Aegir', 'Corvus', 'Delphin', 'Kaelen', 'Lir', 'Marin', 'Nereus', 'Pelagios', 'Pontus', 'Thalor', 'Triton', 'Zale'],
  },
  sereia: {
    nomes: ['Aquata', 'Calypso', 'Coralie', 'Lorelei', 'Marina', 'Melusine', 'Naida', 'Nerissa', 'Ondine', 'Sirena', 'Thalassa', 'Undine'],
  },
  gigante: {
    m: ['Bergelmir', 'Brokk', 'Encélado', 'Fenrir', 'Garm', 'Hrungnir', 'Hyperion', 'Jotun', 'Kronos', 'Mimir', 'Surtur', 'Thrym', 'Utgard', 'Ymir'],
    f: ['Angrboda', 'Bestla', 'Gerd', 'Grid', 'Gunnlod', 'Jarnsaxa', 'Laufey', 'Modgud', 'Rind', 'Skadi', 'Thokk', 'Urdr'],
  },
  elemental_fogo: { nomes: ['Azar', 'Cinder', 'Fulgor', 'Ignis', 'Kaelith', 'Pyros', 'Scorch', 'Vulkan', 'Zhar'] },
  elemental_agua: { nomes: ['Aquor', 'Fluvius', 'Hydros', 'Maelstrom', 'Maris', 'Nereid', 'Ripple', 'Torrent', 'Unda'] },
  elemental_terra: { nomes: ['Bouldor', 'Crag', 'Geon', 'Granit', 'Korgath', 'Monolith', 'Quartz', 'Terran', 'Tremor'] },
  elemental_ar: { nomes: ['Aether', 'Boreas', 'Caelus', 'Gale', 'Mistral', 'Sylph', 'Tempest', 'Ventus', 'Zephyr'] },
  humano_selvagem: {
    m: ['Arvid', 'Bjorn', 'Bran', 'Conan', 'Draven', 'Erik', 'Fenris', 'Gunnar', 'Kael', 'Korin', 'Ragnar', 'Torin', 'Ulf', 'Varg'],
    f: ['Astrid', 'Brenna', 'Freya', 'Hilda', 'Kara', 'Maeve', 'Niamh', 'Runa', 'Sif', 'Sigrid', 'Talia', 'Thyra', 'Ursa', 'Ygritte'],
    titulos: ['Caça-Lobos', 'Coração-de-Urso', 'Espírito-da-Floresta', 'Filho-da-Montanha', 'Lança-Quebrada', 'Olho-de-Águia', 'Passo-Silencioso', 'Pele-de-Pedra', 'Sangue-Frio', 'Uivo-do-Norte'],
  },
};

// Do nome da espécie no bestiário para a lista. A ordem importa: "Humano
// Selvagem" antes de "Humano"; "Paraelemental" não é elemental de lista.
const _semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const RACA_PELO_NOME = [
  [/^orc\b/, 'orc'],
  [/^ogro\b/, 'ogro'],
  [/^gigante\b/, 'gigante'],
  [/^demonio\b/, 'demonio'],
  [/^enviado\b/, 'enviado'],
  [/^elemental do fogo\b/, 'elemental_fogo'],
  [/^elemental da agua\b/, 'elemental_agua'],
  [/^elemental da terra\b/, 'elemental_terra'],
  [/^elemental do ar\b/, 'elemental_ar'],
  [/^sereia\b/, 'sereia'],
  [/^tritao\b/, 'tritao'],
  [/^anao\b/, 'anao'],
  [/^elfo\b/, 'elfo'],
  [/^pequenino\b/, 'pequenino'],
  [/^humano selvagem\b|^barbaro\b/, 'humano_selvagem'],
  [/^humano\b/, 'humano'],
];

/* A lista de nomes da criatura, ou null. `c` é a linha do bestiário (nome,
   tipo). Animal nunca: o bicho do bestiário não se batiza. */
function racaDeNomes(c) {
  if (!c || _semAcento(c.tipo) === 'animal') return null;
  const n = _semAcento(c.nome);
  const par = RACA_PELO_NOME.find(([re]) => re.test(n));
  return par ? par[1] : null;
}

// Quem manda no bando leva título, quando a lista tem títulos.
function _ehChefe(c) {
  const n = _semAcento(c && c.nome);
  return /\b(lider|rei|rainha|capitao|chefe)\b/.test(n) || (Number(c && c.estagio) || 0) >= 20;
}

/* Sorteia um nome para a criatura. `usados` são os nomes já em campo (para
   não repetir enquanto houver nome livre); `rng` é injetável para teste.
   Devolve null quando a espécie não tem lista — aí fica o nome da espécie. */
function nomeParaCriatura(c, usados, rng) {
  const chave = racaDeNomes(c);
  if (!chave) return null;
  const L = NOMES_POR_RACA[chave];
  const r = typeof rng === 'function' ? rng : Math.random;
  const pick = (arr) => arr[Math.floor(r() * arr.length) % arr.length];
  const ja = new Set((usados || []).map((s) => String(s || '').split(' ')[0]));
  let base = L.nomes || [];
  if (!base.length) {
    const generos = [L.m, L.f].filter((g) => Array.isArray(g) && g.length);
    base = pick(generos);
  }
  const livres = base.filter((n) => !ja.has(n));
  const nome = pick(livres.length ? livres : base);
  if (L.sobrenomes) return nome + ' ' + pick(L.sobrenomes);
  if (L.titulos && _ehChefe(c)) {
    // Título com artigo é epíteto ("Gothmog, O Flagelo de Fogo"); o resto é
    // apelido composto ("Grog Quebra-Ossos").
    const t = pick(L.titulos);
    return /^(O|A) /.test(t) ? nome + ', ' + t : nome + ' ' + t;
  }
  return nome;
}

/* Batiza uma lista de participantes crus de criatura. `criaturaDe(p)` dá a
   linha do bestiário. Quem já tem nome diferente do da espécie (o companheiro
   batizado) fica como está. Devolve um array novo. */
function batizarCriaturas(parts, criaturaDe, emCampo, rng) {
  const usados = (emCampo || []).map((p) => p && p.nome).filter(Boolean);
  return (parts || []).map((p) => {
    if (!p || p.tipo !== 'criatura' || p.dono_pj != null) return p;
    const c = typeof criaturaDe === 'function' ? criaturaDe(p) : null;
    if (!c || (p.nome && p.nome !== c.nome)) return p;
    const nome = nomeParaCriatura(c, usados, rng);
    if (!nome) return p;
    usados.push(nome);
    return { ...p, nome, especie: c.nome };
  });
}

Object.assign(window, { NOMES_POR_RACA, racaDeNomes, nomeParaCriatura, batizarCriaturas });
