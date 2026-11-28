/* ============================================================
   bases-item.test.jsx — a BASE manda, não o nome do exemplar
   ============================================================
   Pedido do usuário em 26/10/2026:

     "Existe a base do item, por exemplo 'Máscara de Ouro', e existe o exemplar
      do item, 'Máscara Decorativa', 'Máscara Verrogari', etc — ou seja, as duas
      podem ser uma 'Máscara de Ouro'. Isso vale para todos os itens."

   O erro que isto impede de voltar: escolher a pintura por REGEX NO NOME DO
   EXEMPLAR. "Verrogari" não diz se a máscara é de ouro ou de couro, e dois
   exemplares de nomes diferentes podem ser a mesma base. Com `itens.base`
   preenchida, é ela que manda — e o palpite pelo nome só vale para quem ainda
   não tem base.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

beforeAll(async () => {
  await import('./copy.jsx');
  await import('./constants.jsx');
  await import('./helpers.jsx');
  await import('./inventario-helpers.jsx');
  await import('./bases-item.jsx');
  await import('./select-pill.jsx');
  await import('./clima-desgaste.jsx');
  await import('./game-data.jsx');
  await import('./forma-raca.jsx');
  await import('./tecnicas-efeito.jsx');
  await import('./magias-efeito.jsx');
  await import('./status-efeito.jsx');
  await import('./efeito-temporario.jsx');
  await import('./fabricacao.jsx');
  await import('../09-bestiario/criatura-formulas.jsx');
  await import('../12-batalha/batalha.jsx');
  await import('../10-shell/shell.jsx');
  await import('../07-inventario/inventario.jsx');
  await import('../11-ficha/atalhos-ficha.jsx');
  await import('../11-ficha/ficha.jsx');
});

describe('o vocabulário é consistente', () => {
  it('nenhum slug repetido', () => {
    const vistos = new Set();
    const repetidos = [];
    window.BASES_ITEM.forEach((b) => {
      if (vistos.has(b.slug)) repetidos.push(b.slug);
      vistos.add(b.slug);
    });
    expect(repetidos).toEqual([]);
  });
  it('nenhum nome repetido — o Mestre escolhe pelo nome', () => {
    const vistos = new Set();
    const repetidos = [];
    window.BASES_ITEM.forEach((b) => {
      if (vistos.has(b.nome)) repetidos.push(b.nome);
      vistos.add(b.nome);
    });
    expect(repetidos).toEqual([]);
  });
  it('toda base tem nome, família e um lugar (região ou grupo)', () => {
    const quebradas = window.BASES_ITEM.filter(
      (b) => !b.nome || !b.familia || (!(b.slots || []).length && !(b.grupos || []).length),
    );
    expect(quebradas.map((b) => b.slug)).toEqual([]);
  });
  it('a pintura que uma base declara existe no disco', () => {
    const faltando = window.BASES_ITEM
      .map((b) => ({ b, src: window.arteDaBase(b.slug) }))
      .filter(({ src }) => src)
      .filter(({ src }) => !existsSync(resolve(raiz, 'public' + src)));
    expect(faltando.map(({ b }) => b.slug)).toEqual([]);
  });
});

describe('a pintura vem da BASE, não do nome do exemplar', () => {
  it('"Máscara Verrogari" não diz material nenhum — quem diz é a base', () => {
    const verrogari = { nome: 'Máscara Verrogari', slot_equip: 'rosto', tipo_equip: 'vestimenta' };
    /* Sem base, o palpite pelo nome CHUTA: "Verrogari" não casa com nenhum
       material, e a regra antiga devolve sempre a mesma versão — que pode
       estar certa por acaso e errada em qualquer outro exemplar. É esse chute
       que a base elimina. */
    const semBase = window.arteDoItem(verrogari);
    expect(semBase).toBe(window.arteDoItem({ ...verrogari, nome: 'Máscara Padmarashka' }));
    // Com base: a pintura é a da base, qualquer que seja o nome.
    expect(window.arteDoItem({ ...verrogari, base: 'mascara-latao' })).toBe('/equip/mascara-ferro.webp');
    expect(window.arteDoItem({ ...verrogari, base: 'mascara-marfim' })).toBe('/equip/mascara-porcelana.webp');
    // E a base ganha do nome: "Decorativa" iria para o ferro pelo palpite.
    expect(window.arteDoItem({ nome: 'Máscara Decorativa', slot_equip: 'rosto', base: 'mascara-marfim' }))
      .toBe('/equip/mascara-porcelana.webp');
  });

  it('dois exemplares de nomes diferentes, a mesma base, a mesma pintura', () => {
    const a = window.arteDoItem({ nome: 'Coroa Abad\'Dorim', slot_equip: 'cabeca', base: 'coroa-ouro' });
    const b = window.arteDoItem({ nome: 'Coroa de Latão', slot_equip: 'cabeca', base: 'coroa-ouro' });
    expect(a).toBe(b);
    expect(a).toBe('/equip/coroa-ouro.webp');
  });

  it('o livro de um deus é um Livro de Milagres, e usa a pintura de livro', () => {
    expect(window.arteDoItem({ nome: 'Livro de Maira', slot_equip: null, base: 'livro-milagres' }))
      .toBe('/itens/livro.webp');
    expect(window.nomeDaBase('livro-milagres')).toBe('Livro de Milagres');
  });

  it('base conhecida mas ainda sem pintura fica no glifo, sem chutar pelo nome', () => {
    // Base sem pintura: a base já disse o que a peça é, e o palpite antigo
    // (rosto → máscara) seria pior que o glifo. Desde 27/11/2026 toda base
    // tem pintura, então o teste tira a do Tapa-olho de Ouro por um instante.
    window.ARTE_PINTADA.delete('tapa-olho-ouro');
    try {
      expect(window.arteDaBase('tapa-olho-ouro')).toBe(null);
      expect(window.arteDoItem({ nome: 'Tapa-olho de Ouro', slot_equip: 'rosto', base: 'tapa-olho-ouro' }))
        .toBe(null);
    } finally {
      window.ARTE_PINTADA.add('tapa-olho-ouro');
    }
  });

  it('sem base, o palpite pelo nome continua valendo como rede', () => {
    expect(window.arteDoItem({ nome: 'Coroa de Ouro', slot_equip: 'cabeca', tipo_equip: 'adorno' }))
      .toBe('/equip/coroa-ouro.webp');
    expect(window.arteDoItem({ nome: 'Livro de Maira', slot_equip: null }))
      .toBe('/itens/livro.webp');
  });

  it('base desconhecida não derruba nada — cai na rede do nome', () => {
    expect(window.arteDoItem({ nome: 'Coroa de Ouro', slot_equip: 'cabeca', base: 'base-que-nao-existe' }))
      .toBe('/equip/coroa-ouro.webp');
  });
});

describe('o nome da base, para a frase da ficha do item', () => {
  it.each([
    ['mascara-latao', 'Máscara de Latão'],
    ['brincos-ouro', 'Brinco de Ouro'],
    // As peças de armadura têm nome por classe desde 30/10/2026.
    ['escudo-pesado', 'Escudo Pipa'],
    ['bracos-medio', 'Avambraço'],
    ['livro-milagres', 'Livro de Milagres'],
  ])('%s → %s', (slug, nome) => {
    expect(window.nomeDaBase(slug)).toBe(nome);
  });
  it('slug desconhecido não inventa nome', () => {
    expect(window.nomeDaBase('xpto')).toBe(null);
    expect(window.nomeDaBase(null)).toBe(null);
  });
});

describe('as opções do editor saem do lugar do item', () => {
  it('um item de rosto só oferece as bases de rosto', () => {
    const opcoes = window.opcoesDeBase({ slot_equip: 'rosto' });
    const slugs = opcoes.map((o) => o.value);
    expect(slugs).toContain('mascara-latao');
    expect(slugs).toContain('tapa-olho-ouro');
    // O capuz subiu para a cabeça em 30/10/2026.
    expect(slugs).not.toContain('capuz-seda');
    expect(slugs).not.toContain('elmo-leve');
    expect(slugs).not.toContain('livro-milagres');
  });
  it('um item sem região oferece as bases do grupo dele', () => {
    const slugs = window.opcoesDeBase({ slot_equip: null, grupo: 'Minerais' }).map((o) => o.value);
    expect(slugs).toContain('gema');
    expect(slugs).toContain('minerio');
    expect(slugs).not.toContain('elmo-leve');
  });
  it('sem região nem grupo conhecidos, oferece tudo em vez de nada', () => {
    expect(window.opcoesDeBase({}).length).toBe(window.BASES_ITEM.length);
  });
  it('a opção mostra a família na frente, para agrupar a lista', () => {
    const o = window.opcoesDeBase({ slot_equip: 'rosto' }).find((x) => x.value === 'mascara-latao');
    expect(o.label).toBe('Máscara · Máscara de Latão');
  });
});

/* ── A BASE DA ARMA VEM DO GRUPO DE ARMAS (26/10/2026) ─────────────────────
   "O arco também é uma arma, então a base é a mesma, a diferença é o grupo de
    armas. PL armas de perfuração leve, PM armas de perfuração média, PP armas
    de perfuração pesada." (usuário)

   Antes havia uma base por TIPO — Arco, Besta, Lança, Maça, Cetro… —, e era o
   mesmo erro do nome do exemplar virado ao contrário: tipo de arma é o DESENHO
   de uma arma, não a classificação dela. Sobram três bases, e nenhuma se
   escolhe: a última letra da sigla do grupo decide. */
describe('a base da arma é a classe de peso do grupo', () => {
  it.each([
    ['CL', 'arma-leve'], ['PL', 'arma-leve'], ['EL', 'arma-leve'],
    ['CM', 'arma-medio'], ['PM', 'arma-medio'], ['EM', 'arma-medio'],
    ['CP', 'arma-pesado'], ['PP', 'arma-pesado'], ['EP', 'arma-pesado'],
  ])('%s → %s', (sigla, base) => {
    expect(window.baseDaArma(sigla)).toBe(base);
  });

  it('CD e CI não têm letra de peso e entram como leves — é o que são na mão', () => {
    expect(window.baseDaArma('CD')).toBe('arma-leve');
    expect(window.baseDaArma('CI')).toBe('arma-leve');
  });

  it('caixa e espaço não contam; grupo sem peso não ganha base adivinhada', () => {
    expect(window.baseDaArma(' pm ')).toBe('arma-medio');
    expect(window.baseDaArma('Livre')).toBe(null);
    expect(window.baseDaArma('')).toBe(null);
    expect(window.baseDaArma(null)).toBe(null);
  });

  it('o arco (PM) tem a MESMA base de uma espada (CM) — o pedido, ao pé da letra', () => {
    const arco = { nome: 'Arco Longo', categoria_equip: 'arma', grupo_armas: 'PM', slot_equip: 'mao' };
    const espada = { nome: 'Espada Longa', categoria_equip: 'arma', grupo_armas: 'CM', slot_equip: 'mao' };
    expect(window.opcoesDeBase(arco).map((o) => o.value))
      .toEqual(window.opcoesDeBase(espada).map((o) => o.value));
    expect(window.nomeDaBase(window.baseDaArma('PM'))).toBe('Arma Média');
  });

  it('o editor não deixa escolher: uma opção só, a derivada', () => {
    const punhal = { nome: 'Punhal', categoria_equip: 'arma', grupo_armas: 'PL', slot_equip: 'mao' };
    expect(window.opcoesDeBase(punhal)).toEqual([{ value: 'arma-leve', label: 'Arma · Arma Leve' }]);
  });

  it('sem grupo gravado, as três voltam à mesa e o Mestre decide', () => {
    const solta = { nome: 'Arma Estranha', categoria_equip: 'arma', grupo_armas: 'Livre', slot_equip: 'mao' };
    expect(window.opcoesDeBase(solta).map((o) => o.value))
      .toEqual(expect.arrayContaining(['arma-leve', 'arma-medio', 'arma-pesado']));
  });

  it('as bases por TIPO saíram do vocabulário', () => {
    ['espada', 'adaga', 'machado', 'arma-arco', 'arma-besta', 'arma-lanca',
      'arma-tridente', 'arma-maca', 'arma-martelo', 'arma-mangual', 'arma-cajado',
      'arma-cetro', 'arma-chicote', 'arma-foice'].forEach((slug) => {
      expect(window.baseDoItem(slug), slug + ' ainda é base').toBe(null);
    });
  });

  it('o ESCUDO fica de fora: vem como arma no catálogo, mas tem base própria', () => {
    const escudo = { nome: 'Escudo Pesado', categoria_equip: 'arma', grupo_armas: 'CM', slot_equip: 'mao' };
    expect(window.ehArmaDeMao(escudo)).toBe(false);
    expect(window.opcoesDeBase(escudo).map((o) => o.value)).toContain('escudo-pesado');
  });

  /* A PINTURA SABE MAIS QUE A BASE. "Quando a arma equipada for um arco,
     mostre nas duas mãos um arco" (23/10/2026) continua valendo, e desde
     26/10/2026 ela sabe ainda mais: o tipo lido do nome E a classe de peso do
     grupo escolhem juntos ("crie imagens para espada leve, espada média…").
     A base continua sendo só o peso. */
  it('a base é o peso, e a mão desenha o arco DAQUELE peso', () => {
    expect(window.arteDoItem({
      nome: 'Arco Longo', slug: 'arco_longo', categoria_equip: 'arma',
      grupo_armas: 'PM', slot_equip: 'mao', base: 'arma-medio',
    })).toBe('/equip/arma-arco-medio.webp');
    expect(window.arteDoItem({
      nome: 'Besta Pesada', slug: 'besta_pesada', categoria_equip: 'arma',
      grupo_armas: 'PP', slot_equip: 'mao', base: 'arma-pesado',
    })).toBe('/equip/arma-besta.webp');   // besta ainda não tem versão por peso
  });
});

/* Ajustes de 28/11/2026 pedidos pelo usuário ao rever a página Imagens. */
describe('os ajustes de 28/11/2026', () => {
  it('as armas de esmagamento têm pintura por peso: porrete, maça, estrela da manhã', () => {
    const arma = (nome, grupo_armas) => window.arteDoItem({ nome, slug: nome, categoria_equip: 'arma', grupo_armas, slot_equip: 'mao' });
    expect(arma('Porrete', 'EL')).toBe('/equip/arma-maca-leve.webp');
    expect(arma('Maça', 'EM')).toBe('/equip/arma-maca-medio.webp');
    expect(arma('Clava', 'EM')).toBe('/equip/arma-maca-medio.webp');
    expect(arma('Estrela da Manhã', 'EP')).toBe('/equip/arma-maca-pesado.webp');
    for (const peso of ['leve', 'medio', 'pesado']) {
      expect(window.artesDaBase('arma-' + peso).map((t) => t.variante)).toContain('Maça');
    }
  });

  it('"o marfim são ossos": a coroa de marfim tem a sua pintura, não a de prata', () => {
    expect(window.arteDaBase('coroa-marfim')).toBe('/equip/coroa-marfim.webp');
  });

  it('a tiara ficou com ouro, prata e cobre — latão e marfim saíram do catálogo', () => {
    const tiaras = window.BASES_ITEM.filter((b) => b.familia === 'Tiara').map((b) => b.slug);
    expect(tiaras).toEqual(['tiara-ouro', 'tiara-prata', 'tiara-cobre']);
  });
});

describe('o tapa-olho de couro e o de algodão (28/11/2026)', () => {
  it('são bases de rosto com pintura própria', () => {
    for (const m of ['couro', 'algodao']) {
      const b = window.BASES_ITEM.find((x) => x.slug === 'tapa-olho-' + m);
      expect(b && b.slots).toEqual(['rosto']);
      expect(window.arteDaBase('tapa-olho-' + m)).toBe('/equip/tapa-olho-' + m + '.webp');
    }
  });
});

describe('o chapéu sem linho (28/11/2026)', () => {
  it('o vocabulário do chapéu é couro, algodão e seda', () => {
    expect(window.BASES_ITEM.filter((b) => b.familia === 'Chapéu').map((b) => b.slug))
      .toEqual(['chapeu-couro', 'chapeu-algodao', 'chapeu-seda']);
  });
});

describe('joias de marfim são de osso (28/11/2026)', () => {
  it('brinco, piercing, colar e pingente de marfim têm pintura própria', () => {
    for (const p of ['brincos', 'piercing', 'colar', 'pingente']) {
      expect(window.arteDaBase(p + '-marfim')).toBe('/equip/' + p + '-marfim.webp');
    }
  });
});

describe('as bases dos itens excluídos saíram (28/11/2026)', () => {
  it('máscara de ouro, prata e cobre; tapa-olho de prata, cobre e latão; medalha de latão e marfim', () => {
    const slugs = new Set(window.BASES_ITEM.map((b) => b.slug));
    // O tapa-olho de prata voltou em 28/11/2026, com item e receita.
    for (const s of ['mascara-ouro', 'mascara-prata', 'mascara-cobre', 'tapa-olho-cobre',
      'tapa-olho-latao', 'medalha-latao', 'medalha-marfim']) {
      expect(slugs.has(s), s).toBe(false);
    }
  });
});

describe('ajustes de armas, braceletes, coroa e água (28/11/2026)', () => {
  const arma = (nome, grupo_armas) => window.arteDoItem({ nome, slug: nome, categoria_equip: 'arma', grupo_armas, slot_equip: 'mao' });
  it('boleadeira, bumerangue, fundíbulo e cimitarra têm pintura própria', () => {
    expect(arma('Boleadeira', 'CI')).toBe('/equip/arma-boleadeira.webp');
    expect(arma('Bumerangue de Caça', 'CL')).toBe('/equip/arma-bumerangue.webp');
    expect(arma('Fundíbulo', 'EL')).toBe('/equip/arma-fundibulo.webp');
    expect(arma('Cimitarra', 'CM')).toBe('/equip/arma-cimitarra.webp');
  });
  it('o cetro comum é o de madeira; o Cetro Dourado guarda o dourado', () => {
    expect(arma('Cetro', 'EL')).toBe('/equip/arma-cetro.webp');
    expect(arma('Cetro Dourado', 'EL')).toBe('/equip/arma-cetro-dourado.webp');
  });
  it('cada bracelete tem a sua pintura, e a coroa de cobre a dela', () => {
    for (const m of ['ouro', 'prata', 'latao', 'marfim']) {
      expect(window.arteDaBase('bracelete-' + m)).toBe('/equip/bracelete-' + m + '.webp');
    }
    expect(window.arteDaBase('coroa-cobre')).toBe('/equip/coroa-cobre.webp');
  });
  it('Água e Água Suja usam a pintura do Karmaquoso', () => {
    expect(window.arteDaBase('agua')).toBe('/itens/karmaquoso.webp');
    expect(window.arteDaBase('agua_suja')).toBe('/itens/karmaquoso.webp');
  });
});

describe('a pintura própria do item ganha da base (28/11/2026)', () => {
  it('Algibeira Grande, Aljava Dupla e Equipamento de Viagem mostram a sua', () => {
    expect(window.arteDoItem({ slug: 'algibeira_grande', nome: 'Algibeira Grande', base: 'algibeira' })).toBe('/itens/algibeira_grande.webp');
    expect(window.arteDoItem({ slug: 'aljava_reforcada', nome: 'Aljava Dupla', base: 'aljava' })).toBe('/itens/aljava_reforcada.webp');
    expect(window.arteDoItem({ slug: 'equipamento_de_viagem', nome: 'Equipamento de Viagem', base: 'equipamento' })).toBe('/itens/equipamento_de_viagem.webp');
  });
  it('a base que declara a pintura continua mandando: a Água usa a do Karmaquoso', () => {
    expect(window.arteDoItem({ slug: 'agua', nome: 'Água', base: 'agua' })).toBe('/itens/karmaquoso.webp');
  });
  it('a túnica usa a pintura do sobretudo', () => {
    expect(window.arteDaBase('tunica-seda')).toBe('/equip/sobretudo-seda.webp');
    expect(window.arteDaBase('tunica-linho')).toBe('/equip/sobretudo-algodao.webp');
  });
});

describe('itens criados para as pinturas que sobravam (28/11/2026)', () => {
  it('máscara de couro, ferro e porcelana e tapa-olho de prata usam a sua pintura', () => {
    expect(window.arteDaBase('mascara-couro')).toBe('/equip/mascara-couro.webp');
    expect(window.arteDaBase('mascara-ferro')).toBe('/equip/mascara-ferro.webp');
    expect(window.arteDaBase('mascara-porcelana')).toBe('/equip/mascara-porcelana.webp');
    expect(window.arteDaBase('tapa-olho-prata')).toBe('/equip/tapa-olho-prata.webp');
  });
});
