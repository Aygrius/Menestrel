/* ============================================================
   arte-por-tipo.test.jsx — a pintura sai do TIPO da peça
   ============================================================
   Pedido do usuário em 25/10/2026: "Lembrando que os itens agora possuem seu
   tipo, por exemplo: Escudo Pesado é uma imagem só, independente se é um
   escudo pesado verrogari, ou escudo pesado padmaraska."

   E em 26/10/2026, sobre as famílias novas: "os nomes de alguns itens está
   errado. Brinco Nobre não existe mais, agora é Brinco de Ouro."

   As 21 pinturas de 26/10/2026 (coroa, tiara, broche, medalha, pingente em
   ouro·prata·cobre; capuz em seda·couro·algodão; máscara em
   porcelana·couro·ferro) são escolhidas pelo NOME do tipo, não pela região
   nem pelo preço — o preço só decide quando a peça não diz o material
   (Coroa Abad'Dorim, Amuleto da Brasa).

   Os nomes aqui são os do catálogo de verdade, conferidos no banco.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

beforeAll(async () => {
  await import('../01-core/copy.jsx');
  await import('../01-core/constants.jsx');
  await import('../01-core/helpers.jsx');
  await import('../01-core/inventario-helpers.jsx');
  await import('../01-core/select-pill.jsx');
  await import('../01-core/clima-desgaste.jsx');
  await import('../01-core/game-data.jsx');
  await import('../01-core/forma-raca.jsx');
  await import('../01-core/tecnicas-efeito.jsx');
  await import('../01-core/magias-efeito.jsx');
  await import('../01-core/status-efeito.jsx');
  await import('../01-core/efeito-temporario.jsx');
  await import('../01-core/fabricacao.jsx');
  await import('../09-bestiario/criatura-formulas.jsx');
  await import('../12-batalha/batalha.jsx');
  await import('../10-shell/shell.jsx');
  await import('../07-inventario/inventario.jsx');
  await import('./atalhos-ficha.jsx');
  await import('./ficha.jsx');
});

const arte = (nome, extra = {}) => window.arteDoItem({ nome, ...extra });

describe('a joia é pintada pelo metal do nome', () => {
  it.each([
    ['Coroa de Ouro', '/equip/coroa-ouro.webp'],
    ['Coroa de Prata', '/equip/coroa-prata.webp'],
    ['Coroa de Cobre', '/equip/coroa-cobre.webp'],
    ['Coroa de Latão', '/equip/coroa-cobre.webp'],
    ['Coroa de Marfim', '/equip/coroa-cobre.webp'],
    ['Tiara Dourada', '/equip/tiara-ouro.webp'],
    ['Tiara Prateada', '/equip/tiara-prata.webp'],
    ['Tiara Acobreada', '/equip/tiara-cobre.webp'],
    ['Tiara Ornamental', '/equip/tiara-cobre.webp'],
    ['Tiara Rústica', '/equip/tiara-cobre.webp'],
    ['Broche Dourado', '/equip/broche-ouro.webp'],
    ['Broche Prateado', '/equip/broche-prata.webp'],
    ['Broche Acobreado', '/equip/broche-cobre.webp'],
    ['Broche Ornamental', '/equip/broche-cobre.webp'],
    ['Broche Rústico', '/equip/broche-cobre.webp'],
    ['Medalha de Ouro', '/equip/medalha-ouro.webp'],
    ['Medalha de Prata', '/equip/medalha-prata.webp'],
    ['Medalha de Cobre', '/equip/medalha-cobre.webp'],
    ['Pingente de Ouro', '/equip/pingente-ouro.webp'],
    ['Pingente de Prata', '/equip/pingente-prata.webp'],
    ['Pingente de Cobre', '/equip/pingente-cobre.webp'],
  ])('%s → %s', (nome, caminho) => {
    expect(arte(nome, { slot_equip: 'cabeca', tipo_equip: 'adorno' })).toBe(caminho);
  });

  it('a mesma peça não muda de pintura ao trocar de região', () => {
    // O tipo manda: broche no peito ou na capa é o mesmo broche.
    expect(arte('Broche Dourado', { slot_equip: 'peito' }))
      .toBe(arte('Broche Dourado', { slot_equip: 'costas' }));
  });
});

describe('a veste é pintada pelo tecido, e a máscara pelo material', () => {
  it.each([
    ['Capuz de Seda', '/equip/capuz-seda.webp'],
    ['Capuz de Couro', '/equip/capuz-couro.webp'],
    ['Capuz de Algodão', '/equip/capuz-algodao.webp'],
    ['Máscara Nobre', '/equip/mascara-porcelana.webp'],
    ['Máscara Selvagem', '/equip/mascara-couro.webp'],
    ['Máscara Decorativa', '/equip/mascara-ferro.webp'],
    ['Olhar da Infâmia', '/equip/mascara-ferro.webp'],
  ])('%s → %s', (nome, caminho) => {
    expect(arte(nome, { slot_equip: 'rosto', tipo_equip: 'vestimenta' })).toBe(caminho);
  });
});

describe('a peça que não diz o material cai no preço', () => {
  it('o amuleto barato usa o pingente de cobre', () => {
    expect(arte('Amuleto da Brasa', { slot_equip: 'pescoco', valor_latao: 40 }))
      .toBe('/equip/pingente-cobre.webp');
  });
  it('a coroa de nome próprio e caríssima usa a de ouro', () => {
    expect(arte("Coroa Abad'Dorim", { slot_equip: 'cabeca', valor_latao: 90000 }))
      .toBe('/equip/coroa-ouro.webp');
  });
  it('a família sem metal cai na versão mais rica, nunca num arquivo que não existe', () => {
    const caminho = arte('Capuz do Viajante', { slot_equip: 'rosto', valor_latao: 50 });
    expect(caminho).toBe('/equip/capuz-seda.webp');
  });
});

describe('as 21 pinturas novas estão no disco', () => {
  it.each([
    'coroa-ouro', 'coroa-prata', 'coroa-cobre',
    'tiara-ouro', 'tiara-prata', 'tiara-cobre',
    'broche-ouro', 'broche-prata', 'broche-cobre',
    'medalha-ouro', 'medalha-prata', 'medalha-cobre',
    'pingente-ouro', 'pingente-prata', 'pingente-cobre',
    'capuz-seda', 'capuz-couro', 'capuz-algodao',
    'mascara-porcelana', 'mascara-couro', 'mascara-ferro',
  ])('public/equip/%s.webp', (nome) => {
    expect(existsSync(resolve(raiz, 'public/equip', nome + '.webp'))).toBe(true);
  });
});

describe('a variante usa a pintura do parente', () => {
  it.each([
    ['alforge_duplo', 'Alforge Duplo', '/itens/alforge.webp'],
    ['algibeira_planense', 'Algibeira Planense', '/itens/algibeira.webp'],
    ['bainha_5', 'Bainha Longa', '/itens/bainha.webp'],
  ])('%s → %s', (slug, nome, caminho) => {
    expect(arte(nome, { slug, slot_equip: 'alforje', tipo_equip: 'vestimenta' })).toBe(caminho);
  });
  it('o estojo segue sem pintura — ninguém é parente dele', () => {
    expect(arte('Estojo', { slug: 'estojo', slot_equip: 'alforje', tipo_equip: 'vestimenta' })).toBe(null);
  });
});

describe('quem não tem família própria continua no mapa por região', () => {
  it('o elmo segue pela classe de peso', () => {
    expect(arte('Elmo Verrogari', { slot_equip: 'cabeca', categoria_equip: 'armadura', tipo_armadura: 'P' }))
      .toBe('/equip/elmo-pesado.webp');
  });
  it('o nome sem família conhecida não inventa pintura', () => {
    expect(arte('Faixa de Pano', { slot_equip: 'canela' })).toBe(null);
  });
});

/* ── A CASA VAZIA VESTE A PROFISSÃO (26/10/2026) ───────────────────────────
   "Quando não houver nenhum item equipado, os itens esmaecidos serão conforme
   profissão: Magos, Bardos e Ladinos: equipamentos leves; Rastreadores e
   Sacerdotes: equipamentos médios; Guerreiros: equipamentos pesados. Os
   equipamentos de vestimenta devem ser sempre os mais simples." (usuário)

   A pintura esmaecida é uma SUGESTÃO do que vai ali — então ela mostra o que
   aquele personagem de fato usaria. Antes era sempre a versão média (e a
   ornada nas vestes), que não dizia nada sobre ninguém. */
describe('a casa vazia veste a profissão', () => {
  const vazia = (regiao, profissao) => window.arteDoSlot(regiao, null, profissao);

  it.each([
    ['Mago', 'leve'], ['Bardo', 'leve'], ['Ladino', 'leve'],
    ['Rastreador', 'medio'], ['Sacerdote', 'medio'],
    ['Guerreiro', 'pesado'],
  ])('%s vê o elmo %s', (profissao, peso) => {
    expect(vazia('cabeca', profissao)).toBe('/equip/elmo-' + peso + '.webp');
  });

  it('vale para toda peça de armadura, não só o elmo', () => {
    expect(vazia('dorso', 'Guerreiro')).toBe('/equip/peitoral-pesado.webp');
    expect(vazia('perna', 'Mago')).toBe('/equip/pernas-leve.webp');
    expect(vazia('pes', 'Sacerdote')).toBe('/equip/botas-medio.webp');
  });

  it('a veste e a joia são sempre as mais simples, qualquer que seja a profissão', () => {
    ['Guerreiro', 'Mago', 'Sacerdote'].forEach((p) => {
      expect(vazia('pescoco', p)).toBe('/equip/colar-simples.webp');
      expect(vazia('dedo', p)).toBe('/equip/anel-simples.webp');
      expect(vazia('capa', p)).toBe('/equip/capa-simples.webp');
      expect(vazia('cinto', p)).toBe('/equip/cinto-simples.webp');
    });
  });

  it('profissão desconhecida (ou sem personagem) continua na média', () => {
    expect(vazia('cabeca', null)).toBe('/equip/elmo-medio.webp');
    expect(vazia('cabeca', 'Alquimista')).toBe('/equip/elmo-medio.webp');
  });

  it('a casa OCUPADA continua mandando pelo item, não pela profissão', () => {
    const elmoLeve = { nome: 'Elmo de Couro', categoria_equip: 'armadura', tipo_armadura: 'L' };
    expect(window.arteDoSlot('cabeca', elmoLeve, 'Guerreiro')).toBe('/equip/elmo-leve.webp');
  });
});

/* ── A MÃO VAZIA TAMBÉM VESTE A PROFISSÃO (26/10/2026) ─────────────────────
   "Guerreiro: machado pesado em duas mãos. Sacerdote: espada média em uma mão
   e escudo médio na outra. Ladino: espada leve nas duas mãos. Rastreador:
   espada média nas duas mãos. Bardo: arco médio nas duas mãos. Mago: cajado
   leve nas duas mãos." (usuário)

   Vale também nas duas casas de saque rápido: são casas de arma, e a
   silhueta diz a mesma coisa. */
describe('a mão vazia veste a profissão', () => {
  const par = (profissao) => ({
    d: window.arteDoSlot('mao_d', null, profissao),
    e: window.arteDoSlot('mao_e', null, profissao),
  });

  it('Guerreiro: machado pesado nas duas mãos', () => {
    expect(par('Guerreiro')).toEqual({ d: '/equip/arma-pesado.webp', e: '/equip/arma-pesado.webp' });
  });
  it('Sacerdote: espada média numa mão, escudo médio na outra', () => {
    expect(par('Sacerdote')).toEqual({ d: '/equip/arma-medio.webp', e: '/equip/escudo-medio.webp' });
  });
  it.each([
    ['Ladino', 'arma-leve'],
    ['Rastreador', 'arma-medio'],
    ['Bardo', 'arma-arco'],
    ['Mago', 'arma-cajado'],
  ])('%s usa a mesma arma nas duas mãos: %s', (profissao, arquivo) => {
    expect(par(profissao)).toEqual({ d: '/equip/' + arquivo + '.webp', e: '/equip/' + arquivo + '.webp' });
  });

  it('o saque rápido mostra o mesmo par', () => {
    expect(window.arteDoSlot('saque_d', null, 'Bardo')).toBe('/equip/arma-arco.webp');
    expect(window.arteDoSlot('saque_e', null, 'Sacerdote')).toBe('/equip/escudo-medio.webp');
  });

  it('sem profissão conhecida, espada e escudo médios — como era antes da regra', () => {
    expect(par(null)).toEqual({ d: '/equip/arma-medio.webp', e: '/equip/escudo-medio.webp' });
  });

  it('a mão OCUPADA continua mandando pelo item', () => {
    const arco = { nome: 'Arco Curto', categoria_equip: 'arma', grupo_armas: 'PL' };
    expect(window.arteDoSlot('mao_d', arco, 'Guerreiro')).toBe('/equip/arma-arco.webp');
  });
});

/* O rosto não tinha silhueta nenhuma (usuário: "rosto está vazio"): ele é
   pintado pelo TIPO (capuz, máscara), e tipo só existe com item na casa. */
describe('o rosto vazio mostra o capuz mais simples', () => {
  it('capuz de algodão, qualquer que seja a profissão', () => {
    ['Guerreiro', 'Mago', null].forEach((p) => {
      expect(window.arteDoSlot('rosto', null, p)).toBe('/equip/capuz-algodao.webp');
    });
  });
  it('com uma máscara na casa, quem manda é a máscara', () => {
    expect(window.arteDoSlot('rosto', { nome: 'Máscara Nobre' }, 'Mago'))
      .toBe('/equip/mascara-porcelana.webp');
  });
});

/* A canela ficou sem silhueta até 26/10/2026 ("a canela ainda está vazia para
   o personagem"): simplesmente não existia pintura de caneleiras. As três
   foram feitas no Figma no mesmo dia e ela entrou na escada de peso, como as
   outras peças de armadura — e portanto na regra da profissão. */
describe('a canela tem silhueta', () => {
  it.each([
    ['Guerreiro', 'pesado'], ['Rastreador', 'medio'], ['Mago', 'leve'],
  ])('%s vê a caneleira %s', (profissao, peso) => {
    expect(window.arteDoSlot('canela', null, profissao)).toBe('/equip/caneleiras-' + peso + '.webp');
  });
  it('as três pinturas estão no disco', () => {
    ['leve', 'medio', 'pesado'].forEach((v) => {
      expect(existsSync(resolve(raiz, 'public/equip', 'caneleiras-' + v + '.webp'))).toBe(true);
    });
  });
});

/* "Os ícones em alforje não estão aparecendo quando não há item equipado"
   (usuário, 26/10/2026). O alforje guarda bolsas, não armadura: não há escada
   de peso nem de material para percorrer, então a silhueta é uma pintura de
   item inteira.

   É a BOLSA desde o segundo pedido do mesmo dia ("o ícone do alforge padrão
   deve ser a bolsa"): a algibeira é a bolsinha de cinto, e o que a casa quer
   dizer é "aqui cabe o que se leva". */
describe('o alforje vazio mostra a bolsa', () => {
  it('qualquer que seja a profissão', () => {
    ['Guerreiro', 'Mago', null].forEach((p) => {
      expect(window.arteDoSlot('alforje', null, p)).toBe('/itens/bolsa.webp');
    });
  });
  it('com uma peça na casa, quem manda é a peça', () => {
    expect(window.arteDoSlot('alforje', { nome: 'Aljava', slug: 'aljava' }, 'Mago'))
      .toBe('/itens/aljava.webp');
  });
});
