/* ============================================================
   LOJAS DE CIDADE — o que cada cidade vende, lido da economia dela
   ============================================================
   Pedido do usuário (28/10/2026): "Para cada cidade do sistema, haverá uma
   loja aberta com itens à venda de forma fixa, os personagens só podem ver a
   loja quando estiverem na cidade." Perguntado o que define a lista, a
   resposta foi: "Pela economia da cidade."

   O PROBLEMA: `cidades.economia` é PROSA, não um campo com opções. São
   parágrafos escritos à mão — "A prosperidade de Crássia depende quase
   inteiramente da extração e do processamento do bronze" — e não há nenhuma
   coluna que diga "esta cidade é mineradora".

   A SOLUÇÃO: ler a prosa por palavra-chave e casar com TEMAS. Cada tema diz
   o que uma cidade daquele tipo vende, e o que ela vende é dito por REGRA —
   grupo do catálogo mais um teto de preço — e não por uma lista de slugs
   escolhida a dedo. Duas razões:

     • o catálogo cresce. Uma lista fixa envelhece no dia em que entra um
       machado novo; "Armas até 40 000 de latão" não envelhece.
     • a regra se lê e se discute. "Cidade de guerra vende arma e armadura
       até o preço X" é uma frase que o Mestre confere; trinta slugs não.

   O que sai daqui é uma SUGESTÃO para o Mestre aplicar, não um estoque que
   se impõe: depois de criada, a loja é dele, e cada item se edita como
   sempre. "De forma fixa" vira `estoque: null` — ilimitado, não se esgota.

   Cidade sem economia escrita (há quatro no banco) fica só com a base.

   Depende de: nada. Puro — sem React, sem supabase.
   Exporta (window): LOJA_CIDADE_BASE, LOJA_CIDADE_MAX, LOJA_CIDADE_TEMAS,
                     temasDaEconomia, cidadeTemLoja, itensDaLojaDaCidade,
                     lojaDaCidade
   ============================================================ */

const lcSemAcento = (v) => String(v || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* O BÁSICO, que toda cidade com gente tem. Nenhum deles é de tema: é o que
   um viajante espera achar em qualquer praça — comida, água, o que carrega as
   duas, fogo e cama. Sem isto, uma cidade de temática estreita (Torojai, só
   minério) venderia minério e nada de comer. */
const LOJA_CIDADE_BASE = [
  'racao', 'agua', 'corda_material', 'pederneira', 'oleo',
  'cantil', 'mochila', 'saco', 'estalagem_popular',
];

/* O TETO DA VITRINE (28/10/2026, pedido do usuário: "as lojas das cidades
   devem ter no máximo 60 itens à venda"). A base entra inteira e nunca é
   cortada — é o que um viajante precisa achar em qualquer praça. */
const LOJA_CIDADE_MAX = 60;

/* OS TEMAS. `palavras` é lida contra a prosa SEM ACENTO e em minúsculas, por
   isso os padrões não têm acento. Cada tema soma ao estoque:
     slugs  — itens nomeados, quando o tema pede um item específico;
     grupos — { grupo, teto } : tudo daquele grupo do catálogo até o teto de
              preço, em latão.
   Os tetos cortam o extraordinário: uma cidade mineradora vende ferro e
   bronze, não diamante vermelho; uma de guerra vende espada e cota, não a
   armadura de um herói. */
const LOJA_CIDADE_TEMAS = [
  {
    id: 'metal',
    pt: 'Metalurgia', en: 'Metalwork',
    palavras: /miner|minerio|metalurgia|forja|ferreir|bronze|\bferro\b|cobre|\baco\b|jazida|subsolo|fundicao/,
    slugs: ['carvao', 'pedra', 'madeira'],
    grupos: [{ grupo: 'Minerais', teto: 2000 }],
  },
  {
    id: 'guerra',
    pt: 'Guerra', en: 'War',
    palavras: /guerra|tropa|armas|armadura|arsenal|militar|mercenari|soldado|armeiro|campanha/,
    slugs: ['flecha', 'dardo', 'bainha', 'bainha_5'],
    grupos: [{ grupo: 'Armas', teto: 40000 }, { grupo: 'Armaduras', teto: 40000 }],
  },
  {
    id: 'naval',
    pt: 'Navegação', en: 'Seafaring',
    palavras: /naval|embarca|estaleiro|navio|cordame|\bporto\b|\bcais\b|doca|frota|velas|maritim/,
    slugs: ['canhamo', 'madeira', 'linho', 'barril', 'tonel'],
    grupos: [{ grupo: 'Transportes', teto: 60000 }],
  },
  {
    id: 'pesca',
    pt: 'Pesca', en: 'Fishing',
    palavras: /pesca|peixe|pescad|pescaria/,
    slugs: ['carne', 'odre', 'barril', 'caramanhola', 'canoa_10', 'barco_a_remo'],
    grupos: [],
  },
  {
    id: 'lavoura',
    pt: 'Lavoura', en: 'Farming',
    palavras: /grao|trigo|cevada|arroz|feijao|milho|cultivo|celeiro|lavoura|plantac|cereal|agricultura|sementes/,
    slugs: ['carne', 'ovo', 'cerveja', 'barril', 'caixa', 'racao_animal'],
    grupos: [],
  },
  {
    id: 'ervas',
    pt: 'Ervas e remédios', en: 'Herbs and remedies',
    palavras: /\berva|remedio|unguento|medicin|cura\b|alquimi|ferimento|boticar/,
    slugs: ['erva_amalil', 'erva_azpha', 'erva_rubashi', 'frasco', 'jarra',
      'incenso', 'diaria_em_hospital'],
    grupos: [],
  },
  {
    id: 'tecido',
    pt: 'Tecidos e couros', en: 'Cloth and leather',
    palavras: /tecido|fibra|tecelagem|pigmento|\bcouro|roupa|tinturari|\blinho|algodao|curtume/,
    slugs: ['linho', 'algodao', 'canhamo', 'couro_animal', 'couro_curtido', 'pelo'],
    grupos: [{ grupo: 'Vestimentas', teto: 20000 }],
  },
  {
    id: 'bebida',
    pt: 'Bebida e pouso', en: 'Drink and lodging',
    palavras: /vinho|licor|cerveja|bebida|taverna|hospedari|estalagem|\bfumo\b|destilar/,
    slugs: ['cerveja', 'licor', 'hidromel', 'odre', 'cabaca',
      'estalagem_mercante', 'estalagem_nobre'],
    grupos: [],
  },
  {
    id: 'bestas',
    pt: 'Montarias e carga', en: 'Mounts and haulage',
    palavras: /animais de carga|caravana|estabulo|montaria|carroceir|bestas de|transporte de/,
    slugs: ['racao_animal', 'diaria_no_estabulo', 'carroca', 'carro_de_boi', 'charrete'],
    grupos: [{ grupo: 'Animais', teto: 4000 }],
  },
  {
    id: 'luxo',
    pt: 'Luxo e raridades', en: 'Luxury and rarities',
    /* MEDIDO CONTRA AS 24 CIDADES DO BANCO (28/10/2026): com `nobres`,
       `raras` e `refinad` na lista, dez delas viravam cidade de luxo — a
       prosa cita nobres em quase todo lugar. Ficaram só as palavras que
       falam do COMÉRCIO de luxo, não de quem o consome. */
    palavras: /luxo|joia|obras de arte|perfume|exotic|quinquilharia|iguaria/,
    slugs: ['incenso', 'po_de_diamante', 'urna', 'estalagem_nobre'],
    grupos: [{ grupo: 'Minerais', teto: 20000 }],
  },
];

/* RUÍNA NÃO TEM LOJA (28/10/2026). Deiamon está no banco com `populacao: 0`
   e a economia dela começa dizendo "Sem habitantes ou atividades comerciais
   regulares". A leitura por palavra-chave achava "depósitos minerais" e abria
   uma mineradora numa cidade morta — o tipo de erro que só aparece rodando a
   regra contra os dados de verdade.

   População NULA é diferente de população ZERO: três cidades do banco não têm
   o número preenchido, e não saber quanta gente mora ali não é o mesmo que
   saber que não mora ninguém. */
function cidadeTemLoja(cidade) {
  if (!cidade) return false;
  return !(cidade.populacao != null && Number(cidade.populacao) === 0);
}

/* Quais temas uma prosa de economia dispara. Ordem: a da tabela, para que
   duas cidades com os mesmos temas gerem a mesma lista na mesma ordem. */
function temasDaEconomia(texto) {
  const t = lcSemAcento(texto);
  if (!t.trim()) return [];
  return LOJA_CIDADE_TEMAS.filter((tema) => tema.palavras.test(t));
}

/* O estoque de uma cidade: a base mais o que os temas dela trouxerem, sem
   repetir. `catalogo` é a lista do banco (ou o mapa por slug); o que não
   existir no catálogo não entra — loja não vende o que o mundo não tem.

   Devolve só os SLUGS, em ordem estável. Quem monta a entrada da loja é
   `lojaDaCidade`, abaixo. */
function itensDaLojaDaCidade(cidade, catalogo) {
  const lista = Array.isArray(catalogo) ? catalogo
    : (catalogo && typeof catalogo === 'object' ? Object.values(catalogo) : []);
  const porSlug = new Map();
  lista.forEach((c) => { if (c && c.slug && !porSlug.has(c.slug)) porSlug.set(c.slug, c); });

  const out = [];
  const juntar = (slug) => {
    if (!slug || out.includes(slug) || !porSlug.has(slug)) return;
    out.push(slug);
  };
  LOJA_CIDADE_BASE.forEach(juntar);

  /* A fila de cada tema, na ordem dele: primeiro os itens que ele nomeia —
     os característicos —, depois o grupo inteiro do mais barato ao mais caro.
     Barato primeiro porque é o que o Mestre corta por último. */
  const filas = temasDaEconomia(cidade && cidade.economia).map((tema) => [
    ...(tema.slugs || []),
    ...(tema.grupos || []).reduce((acc, { grupo, teto }) => acc.concat(
      lista
        .filter((c) => c && c.grupo === grupo
          && c.valor_latao != null && Number(c.valor_latao) > 0
          && Number(c.valor_latao) <= teto)
        .sort((a, b) => Number(a.valor_latao) - Number(b.valor_latao)
          || String(a.slug).localeCompare(String(b.slug)))
        .map((c) => c.slug)
    ), []),
  ]);

  /* RODÍZIO, não um tema de cada vez (28/10/2026). Com teto de 60 e a leitura
     em sequência, Saupami — que tem seis temas — encheria a vitrine de grãos
     e não chegaria a vender erva nenhuma: o grupo de um tema sozinho passa de
     60. Pegando um item de cada tema por volta, toda vocação da cidade
     aparece na vitrine, e o que se perde é a cauda cara de cada uma. */
  for (let i = 0; out.length < LOJA_CIDADE_MAX && filas.some((f) => i < f.length); i += 1) {
    filas.forEach((f) => {
      if (out.length < LOJA_CIDADE_MAX && i < f.length) juntar(f[i]);
    });
  }
  return out;
}

/* A loja inteira, pronta para entrar em `estoque_loja.comercios`.
   `estoque: null` é ILIMITADO (a vitrine mostra ∞) — é o que "de forma fixa"
   quer dizer: a cidade não fica sem sal porque um grupo passou por lá. */
function lojaDaCidade(cidade, catalogo, novoId) {
  const nome = (cidade && (cidade.nome || cidade.lugar)) || '';
  const id = typeof novoId === 'function' ? novoId()
    : (novoId || ('cidade-' + lcSemAcento(nome).replace(/[^a-z0-9]+/g, '-')));
  return {
    id, nome, lugar: nome, ativo: true,
    itens: itensDaLojaDaCidade(cidade, catalogo).map((slug, i) => ({
      slug, entryId: id + ':' + i, estoque: null, preco_latao_override: null,
    })),
  };
}

Object.assign(window, {
  LOJA_CIDADE_BASE, LOJA_CIDADE_MAX, LOJA_CIDADE_TEMAS, temasDaEconomia,
  cidadeTemLoja, itensDaLojaDaCidade, lojaDaCidade,
});
