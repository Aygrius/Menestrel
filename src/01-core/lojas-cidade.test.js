/* ============================================================
   lojas-cidade.test.js — o que cada cidade vende
   ============================================================
   "Para cada cidade do sistema, haverá uma loja aberta com itens à venda de
   forma fixa, os personagens só podem ver a loja quando estiverem na cidade."
   (usuário, 28/10/2026) · definida a lista "pela economia da cidade".

   `cidades.economia` é PROSA. Os textos abaixo são recortes LITERAIS do
   banco de produção — é contra eles que a leitura por palavra-chave tem de
   funcionar, não contra frases inventadas para o teste passar.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './lojas-cidade.jsx';

let temas, itens, loja, BASE, temLoja;
beforeAll(() => {
  temas = window.temasDaEconomia;
  itens = window.itensDaLojaDaCidade;
  loja = window.lojaDaCidade;
  temLoja = window.cidadeTemLoja;
  BASE = window.LOJA_CIDADE_BASE;
  expect(temas).toBeTypeOf('function');
});

// Um catálogo pequeno, com um representante de cada grupo que os temas usam.
const CAT = [
  ...['racao', 'agua', 'corda_material', 'pederneira', 'oleo', 'cantil', 'mochila', 'saco']
    .map((slug) => ({ slug, nome: slug, grupo: 'Consumíveis', valor_latao: 10 })),
  { slug: 'estalagem_popular', nome: 'Diária', grupo: 'Serviços', valor_latao: 50 },
  { slug: 'carvao', nome: 'Carvão', grupo: 'Minerais', valor_latao: 20 },
  { slug: 'ferro', nome: 'Ferro', grupo: 'Minerais', valor_latao: 300 },
  { slug: 'bronze', nome: 'Bronze', grupo: 'Minerais', valor_latao: 800 },
  { slug: 'diamante_vermelho', nome: 'Diamante Vermelho', grupo: 'Minerais', valor_latao: 900000 },
  { slug: 'pedra', nome: 'Pedra', grupo: 'Minerais', valor_latao: 5 },
  { slug: 'madeira', nome: 'Madeira', grupo: 'Consumíveis', valor_latao: 8 },
  { slug: 'flecha', nome: 'Flecha', grupo: 'Consumíveis', valor_latao: 2 },
  { slug: 'dardo', nome: 'Dardo', grupo: 'Consumíveis', valor_latao: 2 },
  { slug: 'adaga', nome: 'Adaga', grupo: 'Armas', valor_latao: 3000 },
  { slug: 'espada_lendaria', nome: 'Espada Lendária', grupo: 'Armas', valor_latao: 500000 },
  { slug: 'botas_de_couro', nome: 'Botas', grupo: 'Armaduras', valor_latao: 100 },
  { slug: 'canoa_10', nome: 'Canoa', grupo: 'Transportes', valor_latao: 1000 },
  { slug: 'nau', nome: 'Nau', grupo: 'Transportes', valor_latao: 900000 },
  { slug: 'carne', nome: 'Carne', grupo: 'Consumíveis', valor_latao: 5 },
  { slug: 'cerveja', nome: 'Cerveja', grupo: 'Consumíveis', valor_latao: 5 },
  { slug: 'licor', nome: 'Licor', grupo: 'Consumíveis', valor_latao: 30 },
  { slug: 'erva_amalil', nome: 'Erva Amalil', grupo: 'Consumíveis', valor_latao: 40 },
  { slug: 'linho', nome: 'Linho', grupo: 'Consumíveis', valor_latao: 12 },
  { slug: 'tunica', nome: 'Túnica', grupo: 'Vestimentas', valor_latao: 400 },
  { slug: 'manto_real', nome: 'Manto Real', grupo: 'Vestimentas', valor_latao: 300000 },
  { slug: 'mula', nome: 'Mula', grupo: 'Animais', valor_latao: 550 },
  { slug: 'mamute', nome: 'Mamute', grupo: 'Animais', valor_latao: 18000 },
];

// Recortes LITERAIS do banco (28/10/2026).
const CRASSIA = 'A prosperidade de Crássia depende quase inteiramente da extração e do processamento do bronze, considerado um dos melhores de Verrogar. Sua produção abastece as grandes forjas da capital.';
const ABERDIM = 'O comércio de guerra é a principal atividade econômica de Aberdim. Armas, armaduras, alimentos, animais de carga, medicamentos, roupas, ferramentas e equipamentos de campanha são negociados em grandes quantidades para atender às necessidades das tropas.';
const BASSANI = 'Sua maior riqueza está na construção e manutenção de embarcações. Os estaleiros produzem desde navios mercantes até embarcações rápidas.';
const CAROM = 'Carom é um grande centro pesqueiro, abastecendo o reino com grande variedade de peixes de água doce. Além disso, a cidade é famosa por suas iguarias exclusivas, especialmente ervas raras.';
const TORIA = 'A economia de Tória gira quase inteiramente em torno do cultivo e da exportação de grãos. Arroz, feijão e milho são enviados em grandes caravanas.';
const SULA = 'A riqueza de Sula provém do cultivo e do comércio de fumo. A produção de licor, a hospedagem de viajantes e o comércio nas tavernas complementam a economia local.';

const temasDe = (txt) => temas(txt).map((t) => t.id);

describe('a economia em prosa vira temas', () => {
  it('Crássia (bronze, forjas) é metalurgia', () => {
    expect(temasDe(CRASSIA)).toContain('metal');
  });
  it('Aberdim (comércio de guerra) é guerra — e também carga e ervas, que o texto cita', () => {
    const t = temasDe(ABERDIM);
    expect(t).toContain('guerra');
    expect(t).toContain('bestas');   // "animais de carga"
  });
  it('Bassani (estaleiros, navios) é navegação', () => {
    expect(temasDe(BASSANI)).toContain('naval');
  });
  it('Carom (pesqueiro, ervas) é pesca e ervas', () => {
    expect(temasDe(CAROM)).toEqual(expect.arrayContaining(['pesca', 'ervas']));
  });
  it('Tória (grãos, cultivo) é lavoura', () => {
    expect(temasDe(TORIA)).toContain('lavoura');
  });
  it('Sula (fumo, licor, tavernas) é bebida e pouso', () => {
    expect(temasDe(SULA)).toContain('bebida');
  });

  /* Quatro cidades do banco não têm economia escrita (Saravossa, Tronum,
     Ilha dos Corvos, Torres Guardiãs). Elas ficam só com a base — e isso é
     uma decisão, não um esquecimento: uma loja com pão, água e cama é
     melhor do que nenhuma. */
  it.each([null, '', '   ', undefined])('economia vazia (%s) não dispara tema nenhum', (v) => {
    expect(temas(v)).toEqual([]);
  });

  it('a ordem dos temas é a da tabela, não a do texto', () => {
    const ordem = window.LOJA_CIDADE_TEMAS.map((t) => t.id);
    const achados = temasDe(ABERDIM);
    expect(achados).toEqual(ordem.filter((id) => achados.includes(id)));
  });
});

/* ── MEDIDO CONTRA AS 24 CIDADES DO BANCO (28/10/2026) ───────────────────
   Rodar a regra contra os dados de verdade achou dois erros que nenhum teste
   inventado acharia: Deiamon, cidade em ruínas, abria uma mineradora; e dez
   das 24 cidades viravam "de luxo" porque a prosa cita nobres em quase todo
   lugar. Os dois casos ficam presos aqui. */
describe('o que só os dados de verdade mostram', () => {
  const DEIAMON = 'Sem habitantes ou atividades comerciais regulares, Deiamom não possui uma economia propriamente dita. Sua riqueza permanece enterrada sob os escombros, na forma de depósitos minerais, artefatos mágicos, metais preciosos e antigos registros de conhecimento.';
  const TREVA = 'A economia de Treva é sustentada principalmente pelas despesas da Coroa. Ferrarias, oficinas de couro, armeiros, fornecedores de alimentos e fabricantes de equipamentos atendem à demanda constante de soldados. A Casa Real também financia artistas, estudiosos e obras monumentais, mantendo uma rede de profissionais dedicados à cultura e ao prestígio da corte.';

  it('cidade em ruínas (população 0) não tem loja', () => {
    expect(temLoja({ nome: 'Deiamon', populacao: 0, economia: DEIAMON })).toBe(false);
  });
  it('população NÃO preenchida não é população zero', () => {
    expect(temLoja({ nome: 'Tronum', populacao: null })).toBe(true);
    expect(temLoja({ nome: 'Saravossa', populacao: 100000 })).toBe(true);
  });
  it('a corte de Treva não vira cidade de luxo só por citar nobres e arte', () => {
    expect(temasDe(TREVA)).not.toContain('luxo');
  });
});

describe('o estoque da cidade', () => {
  it('toda cidade vende a base, mesmo sem economia escrita', () => {
    expect(itens({ nome: 'Saravossa', economia: null }, CAT)).toEqual(BASE);
  });

  it('a mineradora soma minério até o teto, e não a joia de rei', () => {
    const out = itens({ nome: 'Crássia', economia: CRASSIA }, CAT);
    expect(out).toEqual(expect.arrayContaining(['ferro', 'bronze', 'carvao', 'pedra']));
    expect(out, 'diamante vermelho passa do teto').not.toContain('diamante_vermelho');
  });

  it('a cidade de guerra vende arma e armadura até o teto', () => {
    const out = itens({ nome: 'Aberdim', economia: ABERDIM }, CAT);
    expect(out).toEqual(expect.arrayContaining(['adaga', 'botas_de_couro', 'flecha']));
    expect(out).not.toContain('espada_lendaria');
  });

  it('o porto vende barco pequeno, não a nau', () => {
    const out = itens({ nome: 'Bassani', economia: BASSANI }, CAT);
    expect(out).toContain('canoa_10');
    expect(out).not.toContain('nau');
  });

  /* O que o mundo não tem, a loja não vende: um slug do tema que não está no
     catálogo é descartado em silêncio. Sem isto, a vitrine mostraria casa
     vazia — e a compra quebraria no servidor. */
  it('slug fora do catálogo não entra', () => {
    const catMagro = [{ slug: 'racao', grupo: 'Consumíveis', valor_latao: 10 }];
    expect(itens({ economia: CRASSIA }, catMagro)).toEqual(['racao']);
  });

  it('não repete item que dois temas trazem', () => {
    const out = itens({ economia: CAROM + ' ' + TORIA }, CAT);
    expect(new Set(out).size).toBe(out.length);
  });

  it('aceita o catálogo como mapa por slug, não só como lista', () => {
    const mapa = Object.fromEntries(CAT.map((c) => [c.slug, c]));
    expect(itens({ economia: null }, mapa)).toEqual(BASE);
  });
});

/* ── O TETO DE 60 E O RODÍZIO (28/10/2026) ────────────────────────────────
   "As lojas das cidades devem ter no máximo 60 itens à venda." (usuário)

   O teto sozinho não bastava: lendo um tema de cada vez, uma cidade de muitas
   vocações encheria a vitrine com o primeiro deles — o grupo de um tema só já
   passa de 60 — e os outros não apareceriam. Por isso o rodízio. */
describe('o teto de 60 itens', () => {
  // Um catálogo grande o bastante para estourar o teto em qualquer tema.
  const GRANDE = [
    ...CAT,
    ...Array.from({ length: 80 }, (_, i) => (
      { slug: 'min' + i, nome: 'Minério ' + i, grupo: 'Minerais', valor_latao: 100 + i })),
    ...Array.from({ length: 80 }, (_, i) => (
      { slug: 'arma' + i, nome: 'Arma ' + i, grupo: 'Armas', valor_latao: 100 + i })),
    ...Array.from({ length: 80 }, (_, i) => (
      { slug: 'veste' + i, nome: 'Veste ' + i, grupo: 'Vestimentas', valor_latao: 100 + i })),
  ];
  const TRES_TEMAS = CRASSIA + ' ' + ABERDIM + ' Oficinas de tecelagem e curtume.';

  it('nunca passa de 60, por mais rica que a cidade seja', () => {
    expect(itens({ economia: TRES_TEMAS }, GRANDE).length).toBe(window.LOJA_CIDADE_MAX);
    expect(window.LOJA_CIDADE_MAX).toBe(60);
  });

  it('a base entra inteira e primeiro — ela nunca é cortada', () => {
    const out = itens({ economia: TRES_TEMAS }, GRANDE);
    expect(out.slice(0, BASE.length)).toEqual(BASE);
  });

  /* O ponto do rodízio: com o teto estourado, TODO tema da cidade continua
     representado. Lendo em sequência, só o primeiro apareceria. */
  it('todo tema aparece na vitrine, mesmo com o teto estourado', () => {
    const out = itens({ economia: TRES_TEMAS }, GRANDE);
    expect(out.some((s) => s.startsWith('min')), 'metalurgia').toBe(true);
    expect(out.some((s) => s.startsWith('arma')), 'guerra').toBe(true);
    expect(out.some((s) => s.startsWith('veste')), 'tecidos').toBe(true);
  });

  it('cidade de poucos temas não é preenchida à força até 60', () => {
    expect(itens({ economia: null }, GRANDE)).toEqual(BASE);
  });

  it('a loja pronta também respeita o teto', () => {
    expect(loja({ nome: 'Rica', economia: TRES_TEMAS }, GRANDE).itens.length).toBe(60);
  });
});

describe('a loja pronta para o estoque da história', () => {
  // Dentro do `it`: `loja` só existe depois do beforeAll.
  const l = () => loja({ nome: 'Crássia', economia: CRASSIA }, CAT);

  it('nasce aberta, com a cidade no `lugar` — é o que get_loja_pj casa', () => {
    const x = l();
    expect(x.ativo).toBe(true);
    expect(x.lugar).toBe('Crássia');
    expect(x.nome).toBe('Crássia');
  });

  /* "De forma fixa": estoque ilimitado. A vitrine já lê `estoque == null`
     como ∞ (07-inventario/loja.jsx), então a cidade não fica sem sal porque
     um grupo passou por lá. */
  it('todo item é ilimitado e sem preço forçado', () => {
    const x = l();
    expect(x.itens.every((e) => e.estoque === null)).toBe(true);
    expect(x.itens.every((e) => e.preco_latao_override === null)).toBe(true);
  });

  it('cada entrada tem entryId próprio', () => {
    const x = l();
    expect(new Set(x.itens.map((e) => e.entryId)).size).toBe(x.itens.length);
  });
});
