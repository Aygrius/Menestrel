/* ============================================================
   propriedade-cidade.test.js — a propriedade tem endereço
   ============================================================
   Pedido do usuário (05/10/2026):
     "Os itens do tipo propriedade precisam ter Cidade definida, e o acesso aos
      itens armazenados nessa propriedade só ficam visíveis para o personagem
      quando ele está na mesma localização dessa propriedade."

   A cidade mora na INSTÂNCIA (`it.cidade`), não no catálogo: public.itens é
   global e guarda TIPOS de propriedade ("Casa", "Taverna", "Fazenda") — dois
   jogadores de cidades diferentes compram a mesma linha "Casa". Quem tem
   endereço é a casa comprada. A localização do personagem é
   personagens.localizacao, o mesmo texto que a ficha já usa.

   Três regras:
     1. propriedade sem cidade não serve de depósito ("precisam ter Cidade
        definida" é trava de uso: a casa entra no inventário de quem pagou,
        mas não guarda nada até ter endereço);
     2. propriedade de outra cidade não recebe nem entrega;
     3. mochila e bolsa seguem indiferentes — elas viajam com o dono.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './inventario.jsx';

let ehPropriedade, cidadeDaPropriedade, mesmaCidade, acessoAPropriedade;
let guardarNoRecipiente, podeMoverParaContainer, calcCarga;
beforeAll(() => {
  ({ ehPropriedade, cidadeDaPropriedade, mesmaCidade, acessoAPropriedade,
     guardarNoRecipiente, podeMoverParaContainer, calcCarga } = window);
  expect(acessoAPropriedade).toBeTypeOf('function');
  expect(guardarNoRecipiente).toBeTypeOf('function');
});

// Linhas reais do catálogo, nos campos que estas regras leem.
const CAT = {
  casa:    { slug: 'casa', nome: 'Casa', grupo: 'Propriedades', tipo: 'S', armazena: 200 },
  taverna: { slug: 'taverna', nome: 'Hospedaria', grupo: 'Propriedades', tipo: 'S', armazena: 200 },
  mochila: { slug: 'mochila', nome: 'Mochila', grupo: 'Recipientes', tipo: 'S', armazena: 20, ocupa: 1 },
  corda:   { slug: 'corda', nome: 'Corda', grupo: 'Itens', tipo: 'S', ocupa: 2 },
};

const casaEm = (cidade) => ({ instanceId: 'h1', slug: 'casa', quantidade: 1, ...(cidade ? { cidade } : {}) });
const corda = (extra) => ({ instanceId: 'k1', slug: 'corda', quantidade: 1, ...extra });

describe('acessoAPropriedade — o depósito só abre na cidade dele', () => {
  it('mesma cidade: abre', () => {
    expect(acessoAPropriedade(casaEm('Tronum'), CAT.casa, 'Tronum'))
      .toMatchObject({ ok: true, cidade: 'Tronum' });
  });

  it('outra cidade: não abre, e diz onde a casa está', () => {
    const a = acessoAPropriedade(casaEm('Tronum'), CAT.casa, 'Farzelo');
    expect(a.ok).toBe(false);
    expect(a.motivo).toBe('outra_cidade');
    expect(a.cidade).toBe('Tronum');
  });

  it('sem cidade definida: não abre — é a trava do "precisam ter Cidade"', () => {
    expect(acessoAPropriedade(casaEm(null), CAT.casa, 'Tronum'))
      .toMatchObject({ ok: false, motivo: 'sem_cidade' });
    // Espaço em branco não vale endereço.
    expect(acessoAPropriedade({ ...casaEm(null), cidade: '   ' }, CAT.casa, 'Tronum').motivo)
      .toBe('sem_cidade');
  });

  it('personagem sem localização gravada: não abre', () => {
    expect(acessoAPropriedade(casaEm('Tronum'), CAT.casa, '').motivo).toBe('sem_local');
    expect(acessoAPropriedade(casaEm('Tronum'), CAT.casa, null).motivo).toBe('sem_local');
  });

  it('acento, caixa e espaço não separam ninguém da própria casa', () => {
    expect(mesmaCidade('Torres Guardiãs', 'torres  guardias')).toBe(true);
    expect(acessoAPropriedade(casaEm('Torres Guardiãs'), CAT.casa, 'torres guardias').ok).toBe(true);
    expect(mesmaCidade('', '')).toBe(false);   // vazio não casa com vazio
  });

  it('o que NÃO é propriedade passa sempre: a mochila viaja com o dono', () => {
    expect(ehPropriedade(CAT.mochila)).toBe(false);
    expect(acessoAPropriedade({ instanceId: 'm1', slug: 'mochila' }, CAT.mochila, 'Farzelo').ok).toBe(true);
    expect(acessoAPropriedade({ instanceId: 'm1', slug: 'mochila' }, CAT.mochila, '').ok).toBe(true);
  });

  it('cidadeDaPropriedade devolve o endereço limpo', () => {
    expect(cidadeDaPropriedade({ cidade: '  Deiamon ' })).toBe('Deiamon');
    expect(cidadeDaPropriedade({})).toBe('');
    expect(cidadeDaPropriedade(null)).toBe('');
  });
});

describe('guardar na propriedade', () => {
  const guardar = (itens, cidade, onde) =>
    guardarNoRecipiente(itens, 'k1', 'h1', CAT, onde);

  it('na cidade certa, guarda', () => {
    const r = guardar([casaEm('Tronum'), corda()], 'Tronum', 'Tronum');
    expect(r.ok).toBe(true);
    expect(r.itens.find((x) => x.instanceId === 'k1').containerId).toBe('h1');
  });

  it('em outra cidade, recusa — e o motivo carrega o endereço', () => {
    const r = guardar([casaEm('Tronum'), corda()], 'Tronum', 'Farzelo');
    expect(r.ok).toBe(false);
    expect(r.motivo).toBe('propriedade_longe');
    expect(r.cidade).toBe('Tronum');
    expect(r.porque).toBe('outra_cidade');
  });

  it('sem cidade, recusa com o motivo do endereço em falta', () => {
    const r = guardar([casaEm(null), corda()], null, 'Tronum');
    expect(r).toMatchObject({ ok: false, motivo: 'propriedade_longe', porque: 'sem_cidade' });
  });

  it('a mochila continua recebendo em qualquer lugar', () => {
    const itens = [{ instanceId: 'h1', slug: 'mochila', quantidade: 1 }, corda()];
    expect(guardarNoRecipiente(itens, 'k1', 'h1', CAT, 'Farzelo').ok).toBe(true);
  });

  it('podeMoverParaContainer sem a localização em mão não ganha a regra nova', () => {
    // O parâmetro é opcional de propósito: quem chama sem ele — código que não
    // tem o PJ em mão, e teste antigo — continua valendo, e só perde a checagem.
    const itens = [casaEm('Tronum'), corda()];
    expect(podeMoverParaContainer(CAT.corda, CAT.casa, itens[0], itens, CAT).ok).toBe(true);
    expect(podeMoverParaContainer(CAT.corda, CAT.casa, itens[0], itens, CAT, 'Farzelo'))
      .toMatchObject({ ok: false, motivo: 'propriedade_longe' });
  });
});

/* O PESO (05/10/2026): Casa, Taverna e Castelo são containers pelo mesmo
   critério dos outros (armazena > 0), e por isso a Casa vinha somando +200 de
   capacidade ao personagem e o que estava guardado nela vinha pesando a 75% —
   como se ele carregasse a casa. Com o endereço, isso virou contradição
   aberta: um depósito trancado em outra cidade que ainda deixava o dono
   carregar mais. */
describe('a propriedade não vai nas costas', () => {
  const carga = (itens) => calcCarga(itens, CAT, 3, 3);

  it('a casa não dá capacidade, e o que está dentro dela não pesa', () => {
    const vazio = carga([]);
    const comCasa = carga([
      casaEm('Tronum'),
      corda({ containerId: 'h1' }),
    ]);
    expect(comCasa.capacidade).toBe(vazio.capacidade);
    expect(comCasa.peso).toBe(0);
  });

  it('a mochila continua dando capacidade, e o que está nela continua pesando', () => {
    const r = carga([
      { instanceId: 'm1', slug: 'mochila', quantidade: 1 },
      corda({ containerId: 'm1' }),
    ]);
    expect(r.capacidade).toBe(carga([]).capacidade + 20);
    expect(r.peso).toBeCloseTo(1 + 2 * 0.75);   // a mochila (1) + a corda a 75%
  });

  it('vale em qualquer cidade: a casa nunca é carregada', () => {
    const naCidade = carga([casaEm('Tronum'), corda({ containerId: 'h1' })]);
    const longe = carga([casaEm('Deiamon'), corda({ containerId: 'h1' })]);
    expect(naCidade).toEqual(longe);
  });
});
