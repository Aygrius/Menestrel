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

/* Pintura EMPRESTADA por versão (30/10/2026, pedido do usuário:
   "reaproveite algumas imagens para usar em itens. Se precisar, depois
   criamos imagens específicas"). `mapa` é { sufixo: arquivo }; versão fora
   do mapa segue sem pintura. É o mesmo campo `arte` do Papiro → Pergaminho:
   o dia em que a pintura própria chegar, basta tirar o empréstimo. */
const comArte = (bases, mapa) => bases.map((b) => {
  const arte = mapa[b.slug.slice(b.slug.lastIndexOf('-') + 1)];
  return arte ? { ...b, arte } : b;
});

/* OS MATERIAIS DA VESTIMENTA (30/10/2026): o sufixo do slug e o nome que o
   Mestre lê. `material` fica na base para a descrição do exemplar dizer de
   que a peça é feita ("uma blusa feita de algodão"). */
const MATERIAIS = {
  ouro: 'Ouro', prata: 'Prata', cobre: 'Cobre', latao: 'Latão',
  marfim: 'Marfim', couro: 'Couro', algodao: 'Algodão', linho: 'Linho', seda: 'Seda',
};
// Sem Porcelana desde 31/10/2026 (usuário: "Remova tudo de porcelana").
const METAL = ['ouro', 'prata', 'cobre', 'latao', 'marfim'];
const TECIDO = ['couro', 'algodao', 'linho', 'seda'];

const veste = (prefixo, familia, slots, mats, onde = BASE_EQUIP) => mats.map((m) => ({
  slug: prefixo + '-' + m, nome: familia + ' de ' + MATERIAIS[m], familia, slots, onde, material: m,
}));

/* A peça de armadura nas três classes: [leve, média, pesada]. A família é a
   classe, para o dropdown ler "Armadura Leve · Gálea". */
const CLASSES = [['leve', 'Armadura Leve'], ['medio', 'Armadura Média'], ['pesado', 'Armadura Pesada']];
const armadura = (prefixo, slots, nomes) => CLASSES.map(([suf, familia], i) => ({
  slug: prefixo + '-' + suf, nome: nomes[i], familia, slots, onde: BASE_EQUIP,
}));

/* Os empréstimos de pintura das joias. PRÓPRIO: a família tem arquivo por
   metal (coroa-ouro…); ANTIGO: ainda se chama simples/ornado/nobre. */
const METAL_PROPRIO = (p) => ({
  ouro: p + '-ouro', prata: p + '-prata', cobre: p + '-cobre',
  latao: p + '-cobre', marfim: p + '-prata',
});
const METAL_ANTIGO = (p) => ({
  ouro: p + '-nobre', prata: p + '-ornado', cobre: p + '-simples',
  latao: p + '-simples', marfim: p + '-ornado',
});

const BASES_ITEM = [
  /* ── ARMADURA: a base é a peça + a classe de peso ───────────────────────
     "Escudo Pesado é uma imagem só, independente se é um escudo pesado
     verrogari ou padmaraska" (usuário, 25/10/2026).

     As PEÇAS ganharam nome próprio por classe em 30/10/2026 (usuário): a
     leve é Gálea, Colete, Ombreira, Braçadeira, Calça, Caneleira, Coturno e
     Escudo Broquel; a média, Elmo Aberto, Cota Parcial, Espaldar, Avambraço,
     Greva, Perneira, Bota e Escudo Aquecedor; a pesada, Elmo Fechado, Cota
     Completa, Espaldar Pesado, Manopla, Greva Fechada, Perneira Pesada, Bota
     Pesada e Escudo Pipa. "Luva (leve) vira Braçadeira, e Braçadeira (médio)
     vira Avambraço e vão no braço. Calça, Greva vão na perna e Caneleira,
     Perneira vão na canela." O slug da base continua o da pintura. ── */
  ...armadura('elmo', ['cabeca'], ['Gálea', 'Elmo Aberto', 'Elmo Fechado']),
  ...armadura('peitoral', ['dorso'], ['Colete', 'Cota Parcial', 'Cota Completa']),
  ...armadura('ombreiras', ['ombro'], ['Ombreira', 'Espaldar', 'Espaldar Pesado']),
  ...armadura('bracos', ['braco'], ['Braçadeira', 'Avambraço', 'Manopla']),
  ...armadura('pernas', ['perna'], ['Calça', 'Greva', 'Greva Fechada']),
  ...armadura('caneleiras', ['canela'], ['Caneleira', 'Perneira', 'Perneira Pesada']),
  ...armadura('botas', ['pe'], ['Coturno', 'Bota', 'Bota Pesada']),
  ...armadura('escudo', ['mao'], ['Escudo Broquel', 'Escudo Aquecedor', 'Escudo Pipa']),

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

  /* ── VESTIMENTA: a base é a peça + o MATERIAL (30/10/2026) ──────────────
     Pedido do usuário: cada peça tem a sua lista de materiais — Ouro, Prata,
     Porcelana, Cobre, Latão, Marfim, Couro, Algodão, Linho e Seda —, e o
     exemplar se chama pelo material ("Colar de Ouro") ou pela profissão
     ("Blusa de Ladino", que na descrição diz que é de algodão). O Traje virou
     Blusa e fica no Peito; o Capuz subiu para a Cabeça; a Medalha foi para o
     Ombro e o Pingente para o Pescoço; a Dragona passou de metal a tecido.

     Pintura EMPRESTADA onde a peça vizinha é o mesmo objeto (comArte): o latão
     usa a do cobre, o marfim a da prata, o linho a do algodão.
     Os arquivos antigos de joia ainda se chamam simples/ornado/nobre.

     Cobre e Latão entraram em Anel, Piercing, Pingente e Gargantilha
     em 31/10/2026 (usuário: "Adicione cobre e latão"), junto com a matéria-
     -prima dos dois. A Coroa ficou sem os dois (usuário, no mesmo dia:
     "Remova as coroas de cobre e latão"). */
  ...comArte(veste('chapeu', 'Chapéu', ['cabeca'], TECIDO), { linho: 'chapeu-algodao' }),
  ...comArte(veste('coroa', 'Coroa', ['cabeca'], ['ouro', 'prata', 'marfim']), METAL_PROPRIO('coroa')),
  ...comArte(veste('tiara', 'Tiara', ['cabeca'], METAL), METAL_PROPRIO('tiara')),
  ...comArte(veste('capuz', 'Capuz', ['cabeca'], TECIDO), { linho: 'capuz-algodao' }),
  ...comArte(veste('mascara', 'Máscara', ['rosto'], METAL),
    { ouro: 'mascara-ferro', prata: 'mascara-ferro', cobre: 'mascara-ferro', latao: 'mascara-ferro', marfim: 'mascara-porcelana' }),
  ...veste('tapa-olho', 'Tapa-olho', ['rosto'], ['ouro', 'prata', 'cobre', 'latao', 'marfim']),
  ...comArte(veste('brincos', 'Brinco', ['orelha'], METAL), METAL_ANTIGO('brincos')),
  ...veste('piercing', 'Piercing', ['orelha'], ['ouro', 'prata', 'cobre', 'latao', 'marfim']),
  ...comArte(veste('colar', 'Colar', ['pescoco'], METAL), METAL_ANTIGO('colar')),
  ...comArte(veste('pingente', 'Pingente', ['pescoco'], METAL), METAL_PROPRIO('pingente')),
  ...comArte(veste('gargantilha', 'Gargantilha', ['pescoco'], METAL), METAL_ANTIGO('colar')),
  ...veste('cachecol', 'Cachecol', ['pescoco'], ['seda', 'linho', 'algodao']),
  ...veste('lenco', 'Lenço', ['pescoco'], ['seda', 'linho', 'algodao']),
  ...comArte(veste('dragona', 'Dragona', ['ombro'], TECIDO),
    { couro: 'ombreiras-leve', algodao: 'ombreiras-leve', linho: 'ombreiras-leve', seda: 'ombreiras-leve' }),
  ...comArte(veste('medalha', 'Medalha', ['ombro'], METAL), METAL_PROPRIO('medalha')),
  ...comArte(veste('broche', 'Broche', ['peito'], METAL), METAL_PROPRIO('broche')),
  ...comArte(veste('tunica', 'Túnica', ['peito'], TECIDO),
    { seda: 'roupa-nobre', linho: 'roupa-ornado', algodao: 'roupa-simples', couro: 'roupa-simples' }),
  ...comArte(veste('blusa', 'Blusa', ['peito'], TECIDO),
    { seda: 'roupa-nobre', linho: 'roupa-ornado', algodao: 'roupa-simples', couro: 'roupa-simples' }),
  ...comArte(veste('casaco', 'Casaco', ['peito'], TECIDO),
    { seda: 'casaco-nobre', linho: 'casaco-algodao', algodao: 'casaco-algodao', couro: 'casaco-couro' }),
  ...comArte(veste('capa', 'Capa', ['costas'], TECIDO),
    { seda: 'capa-nobre', linho: 'capa-ornado', algodao: 'capa-simples', couro: 'capa-simples' }),
  ...veste('sobretudo', 'Sobretudo', ['costas'], TECIDO),
  ...comArte(veste('calca', 'Calça', ['perna'], TECIDO), { linho: 'calca-algodao' }),
  ...comArte(veste('bombacha', 'Bombacha', ['perna'], TECIDO),
    { seda: 'calca-seda', linho: 'calca-algodao', algodao: 'calca-algodao', couro: 'calca-couro' }),
  ...comArte(veste('anel', 'Anel', ['dedo'], ['ouro', 'prata', 'cobre', 'latao', 'marfim']), METAL_ANTIGO('anel')),
  ...comArte(veste('bracelete', 'Bracelete', ['pulso'], METAL), METAL_ANTIGO('anel')),
  ...comArte(veste('pulseira', 'Pulseira', ['pulso'], METAL), METAL_ANTIGO('anel')),
  ...comArte(veste('luva-pano', 'Luva', ['pulso'], ['seda', 'couro', 'algodao']),
    { seda: 'luvas-leve', couro: 'luvas-leve', algodao: 'luvas-leve' }),
  ...veste('sandalia', 'Sandália', ['pe'], TECIDO, BASE_ITEM).map((b) => ({ ...b, arte: 'sandalias' })),
  ...veste('sapato', 'Sapato', ['pe'], TECIDO),

  /* O cinto não tem material na lista do usuário: segue com as três bases
     de sempre, e os cintos do catálogo são exemplares de nome próprio. */
  { slug: 'cinto-nobre', nome: 'Cinto Nobre', familia: 'Cinto', slots: ['cintura'], onde: BASE_EQUIP },
  { slug: 'cinto-ornado', nome: 'Cinto Ornado', familia: 'Cinto', slots: ['cintura'], onde: BASE_EQUIP },
  { slug: 'cinto-simples', nome: 'Cinto Simples', familia: 'Cinto', slots: ['cintura'], onde: BASE_EQUIP },

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
  // A gota turva (30/10/2026): com a base 'agua', a Água Suja pegava a gota limpa.
  { slug: 'agua_suja', nome: 'Água Suja', familia: 'Alimento', grupos: ['Consumíveis'], onde: BASE_ITEM },
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
     de GENTE (armadura('peitoral', …) e armadura('caneleiras', …), lá em cima): a
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
  BASES_ITEM, BASE_POR_SLUG, MATERIAIS, baseDoItem, nomeDaBase, arquivoDaBase,
  basesParaItem, opcoesDeBase,
  BASE_ARMA_POR_GRUPO, baseDaArma, ehArmaDeMao,
});
