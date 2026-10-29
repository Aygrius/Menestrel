/* ============================================================
   bases-item.jsx — a BASE do item, separada do exemplar
   ============================================================
   Pedido do usuário em 26/10/2026, corrigindo um erro de modelagem meu:

     "Existe a base do item, por exemplo 'Máscara de Ouro', e existe o exemplar
      do item, 'Máscara Decorativa', 'Máscara Verrogari', etc — ou seja, as duas
      podem ser uma 'Máscara de Ouro'. Isso vale para todos os itens. No caso
      dos livros, todo livro com as magias dos deuses são 'Livro de Milagres'.
      Isso precisa estar presente na criação/edição do item, e também na hora
      de visualizar o item."

   O que eu tinha feito estava errado na raiz: a pintura era escolhida por
   REGEX NO NOME DO EXEMPLAR ("Decorativa" → ferro). Nome de exemplar não diz
   material nenhum — "Máscara Verrogari" não revela se é de ouro ou de couro,
   e dois exemplares de nomes completamente diferentes podem ser a mesma base.

   Daí esta tabela. Ela é o VOCABULÁRIO das bases: cada entrada é um tipo de
   item de verdade, com o nome que o Mestre vê, a(s) região(ões) onde cabe e,
   quando existe, a pintura. O item ganhou a coluna `base` (o slug daqui), e é
   ela que manda — na arte, no editor e na ficha do item.

   Uma base PODE não ter pintura: aí o item mostra o glifo da região, como
   sempre, e a base continua servindo para classificar e descrever. E várias
   bases podem dividir a mesma pintura (todos os livros usam `livro` até
   alguém pintar um por tipo) — por isso `arte` é opcional e só aparece quando
   difere do slug.

   Campos de cada base:
     slug    — a chave, e o nome do arquivo da pintura quando `arte` é omitido
     nome    — o que o Mestre lê e escolhe ("Máscara de Porcelana")
     familia — agrupa no dropdown e na página Imagens ("Máscara", "Livro")
     slots   — regiões em que a base pode ser usada (vazio = item sem região)
     grupos  — grupos do catálogo, para o item sem região (Itens, Consumíveis…)
     arte    — o arquivo, quando não é o próprio slug
   ============================================================ */

/* ── As pinturas que existem hoje vivem em public/equip (equipáveis) e
   public/itens (o resto). Quem decide onde procurar é esta marca. */
const BASE_EQUIP = 'equip';
const BASE_ITEM = 'itens';

/* Atalho para as três versões de uma família. `versoes` é
   [sufixo do slug, resto do nome]. */
const trio = (slug, familia, slots, versoes, onde = BASE_EQUIP) =>
  versoes.map(([suf, rotulo]) => ({
    slug: slug + '-' + suf, nome: familia + ' ' + rotulo, familia, slots, onde,
  }));

const METAL = [['ouro', 'de Ouro'], ['prata', 'de Prata'], ['cobre', 'de Cobre']];
const PESO_M = [['leve', 'Leve'], ['medio', 'Médio'], ['pesado', 'Pesado']];
const PESO_F = [['leve', 'Leves'], ['medio', 'Médias'], ['pesado', 'Pesadas']];
const TECIDO = [['seda', 'de Seda'], ['couro', 'de Couro'], ['algodao', 'de Algodão']];

const BASES_ITEM = [
  /* ── ARMADURA: a base é a peça + a classe de peso ───────────────────────
     "Escudo Pesado é uma imagem só, independente se é um escudo pesado
     verrogari ou padmaraska" (usuário, 25/10/2026). */
  ...trio('elmo', 'Elmo', ['cabeca'], PESO_M),
  ...trio('ombreiras', 'Ombreiras', ['ombro'], PESO_F),
  ...trio('peitoral', 'Peitoral', ['dorso'], PESO_M),
  ...trio('bracos', 'Braçadeiras', ['braco'], PESO_F),
  ...trio('luvas', 'Manoplas', ['mao', 'braco'], PESO_F),
  ...trio('pernas', 'Grevas', ['perna'], PESO_F),
  ...trio('botas', 'Botas', ['pe'], PESO_F),
  ...trio('escudo', 'Escudo', ['mao'], PESO_M),

  /* ── ARMA: a base é a CLASSE DE PESO, e quem a decide é o grupo de armas ──
     "O arco também é uma arma, então a base é a mesma, a diferença é o grupo
      de armas. PL armas de perfuração leve, PM armas de perfuração média, PP
      armas de perfuração pesada." (usuário, 26/10/2026)

     Antes havia uma base por TIPO — Arco, Besta, Lança, Maça, Cetro… —, e era
     uma correção do pedido anterior virada ao contrário: tipo de arma não é
     base nenhuma, é o desenho de uma arma. O que separa duas armas no sistema
     é o GRUPO DE ARMAS (GRUPOS_ARMAS, 01-core/game-data.jsx), que o catálogo
     já grava em `itens.grupo_armas` — e a última letra da sigla é a classe de
     peso: PL/CL/EL leve, PM/CM/EM média, PP/CP/EP pesada.

     Por isso a base da arma NÃO se escolhe: ela sai do grupo (baseDaArma), e
     o dropdown do editor mostra uma opção só — a derivada. Um arco (PM) tem a
     mesma base que uma espada (CM): "Arma Média".

     A PINTURA da mão continua podendo ser mais específica que a base: "quando
     a arma equipada for um arco, mostre nas duas mãos um arco" (23/10/2026)
     segue valendo em arteDoSlot, pelo tipo lido do nome. Base é
     classificação; pintura é desenho, e o desenho pode saber mais. ── */
  { slug: 'arma-leve', nome: 'Arma Leve', familia: 'Arma', slots: ['mao'], onde: BASE_EQUIP },
  { slug: 'arma-medio', nome: 'Arma Média', familia: 'Arma', slots: ['mao'], onde: BASE_EQUIP },
  { slug: 'arma-pesado', nome: 'Arma Pesada', familia: 'Arma', slots: ['mao'], onde: BASE_EQUIP },

  /* ── JOIA: a base é a peça + o METAL ────────────────────────────────────
     "Brinco Nobre não existe mais, agora é Brinco de Ouro" (usuário). Os
     arquivos antigos ainda se chamam simples/ornado/nobre; o nome que o
     Mestre lê é o do metal. */
  { slug: 'brincos-ouro', nome: 'Brinco de Ouro', familia: 'Brinco', slots: ['orelha'], onde: BASE_EQUIP, arte: 'brincos-nobre' },
  { slug: 'brincos-prata', nome: 'Brinco de Prata', familia: 'Brinco', slots: ['orelha'], onde: BASE_EQUIP, arte: 'brincos-ornado' },
  { slug: 'brincos-cobre', nome: 'Brinco de Cobre', familia: 'Brinco', slots: ['orelha'], onde: BASE_EQUIP, arte: 'brincos-simples' },
  { slug: 'colar-ouro', nome: 'Colar de Ouro', familia: 'Colar', slots: ['pescoco'], onde: BASE_EQUIP, arte: 'colar-nobre' },
  { slug: 'colar-prata', nome: 'Colar de Prata', familia: 'Colar', slots: ['pescoco'], onde: BASE_EQUIP, arte: 'colar-ornado' },
  { slug: 'colar-cobre', nome: 'Colar de Cobre', familia: 'Colar', slots: ['pescoco'], onde: BASE_EQUIP, arte: 'colar-simples' },
  { slug: 'anel-ouro', nome: 'Anel de Ouro', familia: 'Anel', slots: ['dedo'], onde: BASE_EQUIP, arte: 'anel-nobre' },
  { slug: 'anel-prata', nome: 'Anel de Prata', familia: 'Anel', slots: ['dedo'], onde: BASE_EQUIP, arte: 'anel-ornado' },
  { slug: 'anel-cobre', nome: 'Anel de Cobre', familia: 'Anel', slots: ['dedo'], onde: BASE_EQUIP, arte: 'anel-simples' },
  ...trio('coroa', 'Coroa', ['cabeca'], METAL),
  ...trio('tiara', 'Tiara', ['cabeca'], METAL),
  ...trio('broche', 'Broche', ['peito'], METAL),
  ...trio('medalha', 'Medalha', ['peito'], METAL),
  ...trio('pingente', 'Pingente', ['peito', 'pescoco'], METAL),

  /* ── VESTE: a base é a peça + o TECIDO ──────────────────────────────── */
  { slug: 'capa-nobre', nome: 'Capa Nobre', familia: 'Capa', slots: ['costas'], onde: BASE_EQUIP },
  { slug: 'capa-ornado', nome: 'Capa Decorada', familia: 'Capa', slots: ['costas'], onde: BASE_EQUIP },
  { slug: 'capa-simples', nome: 'Capa Simples', familia: 'Capa', slots: ['costas'], onde: BASE_EQUIP },
  { slug: 'roupa-seda', nome: 'Traje de Seda', familia: 'Traje', slots: ['peito'], onde: BASE_EQUIP, arte: 'roupa-nobre' },
  { slug: 'roupa-linho', nome: 'Traje de Linho', familia: 'Traje', slots: ['peito'], onde: BASE_EQUIP, arte: 'roupa-ornado' },
  { slug: 'roupa-algodao', nome: 'Traje de Algodão', familia: 'Traje', slots: ['peito'], onde: BASE_EQUIP, arte: 'roupa-simples' },
  /* A CALÇA É PEÇA DE PERNA (28/10/2026, usuário: "nós criamos as vestimentas
     para usar na perna? Acho que não, só criamos as vestimentas que vão no
     peito"). Ela existia — e com descrição —, mas estava em `cintura`, a
     região do cinto: por isso a perna parecia não ter vestimenta nenhuma e a
     cintura ficava com duas peças disputando a mesma casa. O cinto segura a
     calça; quem a veste é a perna.

     As três pinturas foram feitas no Figma no mesmo dia e por isso a família
     subiu do bloco "ainda sem pintura" para cá. `pernas-*` continua sendo a
     armadura de perna; estas são roupa. */
  ...trio('calca', 'Calça', ['perna'], TECIDO),
  { slug: 'cinto-nobre', nome: 'Cinto Nobre', familia: 'Cinto', slots: ['cintura'], onde: BASE_EQUIP },
  { slug: 'cinto-ornado', nome: 'Cinto Ornado', familia: 'Cinto', slots: ['cintura'], onde: BASE_EQUIP },
  { slug: 'cinto-simples', nome: 'Cinto Simples', familia: 'Cinto', slots: ['cintura'], onde: BASE_EQUIP },
  ...trio('capuz', 'Capuz', ['rosto'], TECIDO),
  { slug: 'mascara-porcelana', nome: 'Máscara de Porcelana', familia: 'Máscara', slots: ['rosto'], onde: BASE_EQUIP },
  { slug: 'mascara-couro', nome: 'Máscara de Couro', familia: 'Máscara', slots: ['rosto'], onde: BASE_EQUIP },
  { slug: 'mascara-ferro', nome: 'Máscara de Ferro', familia: 'Máscara', slots: ['rosto'], onde: BASE_EQUIP },

  /* ── AINDA SEM PINTURA ──────────────────────────────────────────────────
     A base existe e classifica o item desde já; a casa mostra o glifo da
     região até alguém pintar. É esta lista que vira a próxima encomenda no
     Figma (ver .impeccable/arte-equipamentos.md). */
  ...trio('chapeu', 'Chapéu', ['cabeca'], [['veludo', 'de Veludo'], ['couro', 'de Couro'], ['palha', 'de Palha']]),
  ...trio('piercing', 'Piercing', ['orelha'], METAL),
  ...trio('gargantilha', 'Gargantilha', ['pescoco'], METAL),
  ...trio('cachecol', 'Cachecol', ['pescoco'], [['seda', 'de Seda'], ['linho', 'de Linho'], ['algodao', 'de Algodão']]),
  ...trio('lenco', 'Lenço', ['pescoco'], [['seda', 'de Seda'], ['linho', 'de Linho'], ['algodao', 'de Algodão']]),
  ...trio('dragona', 'Dragona', ['ombro'], METAL),
  ...trio('sobretudo', 'Sobretudo', ['costas'], [['luxuoso', 'Luxuoso'], ['completo', 'Completo'], ['simples', 'Simples']]),
  ...trio('casaco', 'Casaco', ['peito'], [['nobre', 'Nobre'], ['couro', 'de Couro'], ['algodao', 'de Algodão']]),
  ...trio('bracelete', 'Bracelete', ['pulso'], METAL),
  ...trio('luva-pano', 'Luva', ['pulso'], TECIDO),

  ...trio('caneleiras', 'Caneleiras', ['canela'], PESO_F),
  { slug: 'sandalia', nome: 'Sandália', familia: 'Sandália', slots: ['pe'], onde: BASE_ITEM, arte: 'sandalias' },

  /* ── ALFORJE: o que pendura na cintura ─────────────────────────────── */
  { slug: 'alforge', nome: 'Alforje', familia: 'Alforje', slots: ['alforje'], onde: BASE_ITEM },
  { slug: 'algibeira', nome: 'Algibeira', familia: 'Alforje', slots: ['alforje'], onde: BASE_ITEM },
  { slug: 'aljava', nome: 'Aljava', familia: 'Alforje', slots: ['alforje'], onde: BASE_ITEM },
  { slug: 'bainha', nome: 'Bainha', familia: 'Alforje', slots: ['alforje'], onde: BASE_ITEM },
  { slug: 'estojo', nome: 'Estojo', familia: 'Alforje', slots: ['alforje'], onde: BASE_ITEM },

  /* ── ITEM SEM REGIÃO: a base é o tipo do objeto ─────────────────────────
     "Uma imagem apenas para livro" (usuário, 26/10/2026): uma pintura serve a
     família inteira. As bases de livro são VÁRIAS e dividem a mesma pintura —
     "todo livro com as magias dos deuses são 'Livro de Milagres'". */
  { slug: 'livro-milagres', nome: 'Livro de Milagres', familia: 'Livro', grupos: ['Itens'], onde: BASE_ITEM, arte: 'livro' },
  { slug: 'livro-magias', nome: 'Livro de Magias', familia: 'Livro', grupos: ['Itens'], onde: BASE_ITEM, arte: 'livro' },
  { slug: 'livro-tecnicas', nome: 'Livro de Técnicas', familia: 'Livro', grupos: ['Itens'], onde: BASE_ITEM, arte: 'livro' },
  { slug: 'livro-idiomas', nome: 'Livro de Idiomas', familia: 'Livro', grupos: ['Itens'], onde: BASE_ITEM, arte: 'livro' },
  { slug: 'livro-sabedoria', nome: 'Livro de Sabedoria', familia: 'Livro', grupos: ['Itens'], onde: BASE_ITEM, arte: 'livro' },
  { slug: 'livro-religiao', nome: 'Livro de Religião', familia: 'Livro', grupos: ['Itens'], onde: BASE_ITEM, arte: 'livro' },
  { slug: 'livro-habilidade', nome: 'Livro de Habilidade', familia: 'Livro', grupos: ['Itens'], onde: BASE_ITEM, arte: 'livro' },
  { slug: 'livro-historia', nome: 'Livro de História', familia: 'Livro', grupos: ['Itens', 'Diario'], onde: BASE_ITEM, arte: 'livro' },
  { slug: 'livro', nome: 'Livro', familia: 'Livro', grupos: ['Itens', 'Diario'], onde: BASE_ITEM },

  { slug: 'pergaminho', nome: 'Pergaminho', familia: 'Pergaminho', grupos: ['Consumíveis', 'Itens'], onde: BASE_ITEM },
  { slug: 'equipamento', nome: 'Equipamento de Profissão', familia: 'Equipamento', grupos: ['Itens'], onde: BASE_ITEM },
  { slug: 'mapa', nome: 'Mapa', familia: 'Mapa', grupos: ['Itens'], onde: BASE_ITEM, arte: 'pergaminho' },
  /* "Papiro usa a mesma imagem de pergaminho." (usuário, 26/10/2026) — base
     própria, porque um papiro NÃO é um pergaminho (um é junco, o outro é
     pele), e pintura emprestada, porque na casa de 78px os dois são a mesma
     folha enrolada. É para isso que `arte` é separada do slug. */
  { slug: 'papiro', nome: 'Papiro', familia: 'Pergaminho', grupos: ['Itens', 'Consumíveis'], onde: BASE_ITEM, arte: 'pergaminho' },
  { slug: 'quadro', nome: 'Quadro', familia: 'Quadro', grupos: ['Itens'], onde: BASE_ITEM },
  { slug: 'estatua', nome: 'Estátua', familia: 'Estátua', grupos: ['Itens'], onde: BASE_ITEM },

  { slug: 'elixir', nome: 'Elixir', familia: 'Elixir', grupos: ['Consumíveis'], onde: BASE_ITEM },
  { slug: 'frasco', nome: 'Frasco', familia: 'Frasco', grupos: ['Consumíveis'], onde: BASE_ITEM },
  { slug: 'veneno', nome: 'Veneno', familia: 'Frasco', grupos: ['Consumíveis'], onde: BASE_ITEM, arte: 'frasco' },
  { slug: 'racao', nome: 'Ração', familia: 'Alimento', grupos: ['Consumíveis'], onde: BASE_ITEM },
  { slug: 'hidromel', nome: 'Bebida', familia: 'Alimento', grupos: ['Consumíveis'], onde: BASE_ITEM },
  { slug: 'flecha', nome: 'Flecha', familia: 'Munição', grupos: ['Consumíveis'], onde: BASE_ITEM },
  { slug: 'virote', nome: 'Virote', familia: 'Munição', grupos: ['Consumíveis'], onde: BASE_ITEM },
  { slug: 'dardo', nome: 'Dardo', familia: 'Munição', grupos: ['Consumíveis'], onde: BASE_ITEM },
  { slug: 'tocha', nome: 'Tocha', familia: 'Viagem', grupos: ['Consumíveis', 'Itens'], onde: BASE_ITEM },
  { slug: 'lamparina', nome: 'Lamparina', familia: 'Viagem', grupos: ['Itens'], onde: BASE_ITEM },
  { slug: 'pederneira', nome: 'Pederneira', familia: 'Viagem', grupos: ['Consumíveis', 'Itens'], onde: BASE_ITEM },
  { slug: 'lenha', nome: 'Lenha', familia: 'Matéria-prima', grupos: ['Consumíveis'], onde: BASE_ITEM },
  { slug: 'agua', nome: 'Água', familia: 'Alimento', grupos: ['Consumíveis'], onde: BASE_ITEM },
  { slug: 'cachimbo', nome: 'Cachimbo', familia: 'Viagem', grupos: ['Itens'], onde: BASE_ITEM },

  { slug: 'gema', nome: 'Gema', familia: 'Mineral', grupos: ['Minerais'], onde: BASE_ITEM },
  { slug: 'minerio', nome: 'Minério', familia: 'Mineral', grupos: ['Minerais'], onde: BASE_ITEM },

  { slug: 'bau', nome: 'Baú', familia: 'Recipiente', grupos: ['Recipientes'], onde: BASE_ITEM },
  { slug: 'barril', nome: 'Barril', familia: 'Recipiente', grupos: ['Recipientes'], onde: BASE_ITEM },
  { slug: 'jarra', nome: 'Jarra', familia: 'Recipiente', grupos: ['Recipientes'], onde: BASE_ITEM },
  { slug: 'mochila', nome: 'Mochila', familia: 'Recipiente', grupos: ['Recipientes'], onde: BASE_ITEM },
  { slug: 'saco', nome: 'Saco', familia: 'Recipiente', grupos: ['Recipientes'], onde: BASE_ITEM },
  { slug: 'bolsa', nome: 'Bolsa', familia: 'Recipiente', grupos: ['Recipientes'], onde: BASE_ITEM },
  { slug: 'cantil', nome: 'Cantil', familia: 'Recipiente', grupos: ['Recipientes'], onde: BASE_ITEM },
  { slug: 'odre', nome: 'Odre', familia: 'Recipiente', grupos: ['Recipientes'], onde: BASE_ITEM },

  { slug: 'casa', nome: 'Casa', familia: 'Propriedade', grupos: ['Propriedades'], onde: BASE_ITEM },
  { slug: 'barco', nome: 'Barco', familia: 'Transporte', grupos: ['Transportes'], onde: BASE_ITEM },
  { slug: 'carroca', nome: 'Carroça', familia: 'Transporte', grupos: ['Transportes'], onde: BASE_ITEM },
  { slug: 'cavalo', nome: 'Cavalo', familia: 'Montaria', grupos: ['Animais'], onde: BASE_ITEM },

  /* ── ARREAMENTO: as doze casas do bicho ────────────────────────────────
     As treze peças existem desde 05/10/2026 (arreamento-e-atrelado), mas só
     quatro casas tinham pintura — Gualdrapa e Manta tomavam emprestada a do
     Arreio, e seis peças ficavam no glifo. Pintadas em 27/10/2026, a pedido
     do usuário ("Crie os itens no sistema e no figma para a montaria").

     Os sufixos `-montaria` existem porque Peitoral e Caneleiras já são peça
     de GENTE (trio('peitoral', …) e trio('caneleiras', …), lá em cima): a
     barda do cavalo e a couraça do cavaleiro não são a mesma base.

     O grupo é o do catálogo: couro e pano em Vestimentas, aço em Armaduras. */
  { slug: 'sela', nome: 'Sela', familia: 'Montaria', grupos: ['Vestimentas'], onde: BASE_ITEM },
  { slug: 'arreio', nome: 'Arreio', familia: 'Montaria', grupos: ['Vestimentas'], onde: BASE_ITEM },
  { slug: 'cabecada', nome: 'Cabeçada e Rédeas', familia: 'Montaria', grupos: ['Vestimentas'], onde: BASE_ITEM },
  { slug: 'manta', nome: 'Manta de Sela', familia: 'Montaria', grupos: ['Vestimentas'], onde: BASE_ITEM },
  { slug: 'gualdrapa', nome: 'Gualdrapa', familia: 'Montaria', grupos: ['Vestimentas'], onde: BASE_ITEM },
  { slug: 'peitoral-montaria', nome: 'Peitoral de Montaria', familia: 'Montaria', grupos: ['Armaduras'], onde: BASE_ITEM },
  { slug: 'crinum', nome: 'Crinum', familia: 'Montaria', grupos: ['Armaduras'], onde: BASE_ITEM },
  { slug: 'chanfron', nome: 'Chanfron', familia: 'Montaria', grupos: ['Armaduras'], onde: BASE_ITEM },
  { slug: 'caneleiras-montaria', nome: 'Caneleiras de Montaria', familia: 'Montaria', grupos: ['Armaduras'], onde: BASE_ITEM },
  { slug: 'barda', nome: 'Barda', familia: 'Montaria', grupos: ['Armaduras'], onde: BASE_ITEM },

  { slug: 'moeda_ouro', nome: 'Moeda de Ouro', familia: 'Moeda', grupos: ['Moedas'], onde: BASE_ITEM },
  { slug: 'moeda_prata', nome: 'Moeda de Prata', familia: 'Moeda', grupos: ['Moedas'], onde: BASE_ITEM },
  { slug: 'moeda_latao', nome: 'Moeda de Latão', familia: 'Moeda', grupos: ['Moedas'], onde: BASE_ITEM },
  { slug: 'moeda_cobre', nome: 'Moeda de Cobre', familia: 'Moeda', grupos: ['Moedas'], onde: BASE_ITEM },
];

const BASE_POR_SLUG = Object.fromEntries(BASES_ITEM.map((b) => [b.slug, b]));
/* O nome do arquivo da pintura desta base (sem pasta). */
const arquivoDaBase = (base) => (base ? (base.arte || base.slug) : null);
/* A base de um item, pelo slug gravado em itens.base. */
const baseDoItem = (slugBase) => (slugBase ? BASE_POR_SLUG[slugBase] || null : null);
/* O nome da base, para a frase "A Máscara Verrogari é uma Máscara de Ferro". */
const nomeDaBase = (slugBase) => {
  const b = baseDoItem(slugBase);
  return b ? b.nome : null;
};

/* ── A BASE DA ARMA VEM DO GRUPO DE ARMAS (26/10/2026) ──────────────────────
   A última letra da sigla é a classe de peso. CD (Combate Desarmado: punhos,
   soqueiras) e CI (Combate de Imobilização: redes, boleadeiras) não têm letra
   de peso e entram como leves — é o que são na mão.

   'Livre' e qualquer valor fora da tabela devolvem null: arma sem grupo
   gravado não ganha base adivinhada. */
const BASE_ARMA_POR_GRUPO = {
  CL: 'arma-leve',   PL: 'arma-leve',   EL: 'arma-leve',
  CD: 'arma-leve',   CI: 'arma-leve',
  CM: 'arma-medio',  PM: 'arma-medio',  EM: 'arma-medio',
  CP: 'arma-pesado', PP: 'arma-pesado', EP: 'arma-pesado',
};
const baseDaArma = (grupoArmas) => {
  const sigla = String(grupoArmas || '').trim().toUpperCase();
  return BASE_ARMA_POR_GRUPO[sigla] || null;
};
/* O item é uma arma de mão (e não um escudo, que também vem como categoria
   'arma' no catálogo e tem base própria por peso). */
const ehArmaDeMao = (item) => !!item
  && String(item.categoria_equip || '').toLowerCase() === 'arma'
  && !/\bescudo\b/i.test(String(item.nome || ''));

/* As bases que cabem num item: pela REGIÃO quando ele é vestível, pelo GRUPO
   do catálogo quando não é. Sem região nem grupo conhecidos, devolve todas —
   melhor uma lista longa do que um dropdown vazio. */
function basesParaItem(item) {
  const slot = item && item.slot_equip;
  const grupo = item && item.grupo;
  /* ARMA: a base não é escolha, é consequência do grupo de armas. Uma opção
     só no dropdown — a derivada — em vez de deixar o Mestre pôr "Arma Pesada"
     num punhal PL. Sem grupo gravado, cai nas três e ele decide. */
  if (ehArmaDeMao(item)) {
    const derivada = baseDoItem(baseDaArma(item.grupo_armas));
    if (derivada) return [derivada];
  }
  if (slot) {
    const cabem = BASES_ITEM.filter((b) => (b.slots || []).includes(slot));
    if (cabem.length) return cabem;
  }
  if (grupo) {
    const cabem = BASES_ITEM.filter((b) => (b.grupos || []).includes(grupo));
    if (cabem.length) return cabem;
  }
  return BASES_ITEM;
}

/* As opções do dropdown do editor: { value: slug, label: "Família · Nome" }.
   A família na frente agrupa visualmente sem precisar de optgroup. */
function opcoesDeBase(item) {
  return basesParaItem(item)
    .slice()
    .sort((a, b) => (a.familia + a.nome).localeCompare(b.familia + b.nome, 'pt'))
    .map((b) => ({ value: b.slug, label: b.familia === b.nome ? b.nome : `${b.familia} · ${b.nome}` }));
}

Object.assign(window, {
  BASES_ITEM, BASE_POR_SLUG, baseDoItem, nomeDaBase, arquivoDaBase,
  basesParaItem, opcoesDeBase,
  BASE_ARMA_POR_GRUPO, baseDaArma, ehArmaDeMao,
});
