/* ============================================================
   animal-experiencia.test.js — um quinto da experiência do dono
   ============================================================
   Regra do usuário (06/10/2026):
     "Os animais do personagem devem ganhar sempre 1/5 da experiência do
      personagem enquanto estiverem com ele, e evoluir quando alcançar a xp
      certa."

   Três coisas podem desfazer essa regra sem ninguém ver, e são essas que este
   arquivo trava:

   1. O ARREDONDAMENTO. "Sempre 1/5" morre no primeiro `Math.round`: cinco
      concessões de 1 de XP têm de valer 1 para o bicho, não 0 nem 5.
   2. O PISO DO ESTÁGIO. Sem ele o animal conta do zero e o estágio do catálogo
      vira uma dívida de centenas de XP.
   3. QUEM CONTA COMO "COM ELE". Animal à venda e animal pendurado em outro
      bicho não são companhia.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './copy.jsx';
import './constants.jsx';
import './helpers.jsx';
import './inventario-helpers.jsx';
import './game-data.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import './animal-experiencia.jsx';

let xpDoQuinto, xpMinimoDoEstagio, xpDoAnimal, estagioDoAnimal;
let criaturaDoAnimal, ehAnimalDoPersonagem, distribuirXpNosAnimais;
beforeAll(() => {
  ({ xpDoQuinto, xpMinimoDoEstagio, xpDoAnimal, estagioDoAnimal,
     criaturaDoAnimal, ehAnimalDoPersonagem, distribuirXpNosAnimais } = window);
  expect(distribuirXpNosAnimais).toBeTypeOf('function');
});

/* O cavalo do pedido: Estágio 4 no catálogo, que na tabela de estágios é a
   faixa 31–45. Aura 0 e Físico/Agilidade 3/2, para as colunas derivadas
   mudarem de valor quando ele evoluir. */
const CAVALO = {
  id: 157, nome: 'Cavalo Quarter', estagio: 4, peso: 400,
  forca: 3, agilidade: 2, fisico: 3, aura: 0,
  energia_fisica: 43, energia_heroica: 48, velocidade: 20,
};
const CATALOGO = {
  cavalo_quarter: { slug: 'cavalo_quarter', nome: 'Cavalo Quarter', grupo: 'Animais', criatura_id: 157 },
  adaga: { slug: 'adaga', nome: 'Adaga', grupo: 'Armas', ocupa: 3 },
};
const CRIATURAS = { 157: CAVALO };
const animal = (extra) => ({ instanceId: 'c1', slug: 'cavalo_quarter', quantidade: 1, ...extra });

describe('o quinto', () => {
  it('é 1/5 exato, sem arredondar a concessão', () => {
    expect(xpDoQuinto(10)).toBe(2);
    expect(xpDoQuinto(1)).toBeCloseTo(0.2, 10);
    expect(xpDoQuinto(7)).toBeCloseTo(1.4, 10);
  });

  it('cinco concessões de 1 de XP somam 1 para o bicho', () => {
    // A armadilha: arredondar cada passo daria 0 (floor/round) ou 5 (ceil).
    let itens = [animal()];
    for (let i = 0; i < 5; i++) {
      itens = distribuirXpNosAnimais(itens, 1, CATALOGO, CRIATURAS).itens;
    }
    expect(itens[0].xp).toBeCloseTo(1, 10);
  });

  it('XP para baixo não tira nada do animal', () => {
    // "ganhar" 1/5: o Mestre corrigindo um número não desaprende o bicho.
    const itens = [animal({ xp: 3 })];
    const r = distribuirXpNosAnimais(itens, -50, CATALOGO, CRIATURAS);
    expect(r.mudou).toBe(false);
    expect(r.itens).toBe(itens);           // a MESMA lista: nada a gravar
  });
});

describe('o piso do estágio do catálogo', () => {
  it('a xp certa é a da tabela do personagem', () => {
    expect(xpMinimoDoEstagio(1)).toBe(0);
    expect(xpMinimoDoEstagio(4)).toBe(31);   // faixa 31–45
    expect(xpMinimoDoEstagio(5)).toBe(46);
  });

  it('o animal parte do piso do seu estágio, não do zero', () => {
    const x = xpDoAnimal(animal(), CAVALO);
    expect(x.base).toBe(31);
    expect(x.total).toBe(31);
    expect(x.estagio).toBe(4);
    expect(x.falta).toBe(15);               // 46 − 31, para o Estágio 5
  });

  it('o estágio nunca desce abaixo do que a espécie dá', () => {
    expect(estagioDoAnimal(animal({ xp: 0 }), CAVALO)).toBe(4);
    expect(estagioDoAnimal(animal({ xp: 0 }), { ...CAVALO, estagio: 20 })).toBe(20);
  });
});

describe('evoluir quando alcançar a xp certa', () => {
  it('75 de XP do dono levam o cavalo de Estágio 4 para 5', () => {
    // 75 ÷ 5 = 15, que é exatamente o que falta de 31 para 46.
    const r = distribuirXpNosAnimais([animal()], 75, CATALOGO, CRIATURAS);
    expect(r.itens[0].xp).toBeCloseTo(15, 10);
    expect(estagioDoAnimal(r.itens[0], CAVALO)).toBe(5);
    expect(r.evoluiram).toEqual([
      { instanceId: 'c1', nome: 'Cavalo Quarter', de: 4, para: 5 },
    ]);
  });

  it('um XP a menos ainda não evolui, e não vira notícia na mesa', () => {
    const r = distribuirXpNosAnimais([animal()], 70, CATALOGO, CRIATURAS);
    expect(estagioDoAnimal(r.itens[0], CAVALO)).toBe(4);
    expect(r.evoluiram).toEqual([]);
  });

  it('a criatura evoluída recalcula as colunas que dependem do estágio', () => {
    const evoluido = animal({ xp: 15 });
    const c = criaturaDoAnimal(evoluido, CAVALO);
    expect(c.estagio).toBe(5);
    expect(c.energia_heroica).toBe((12 + 0) * 5);          // EH = (12+Aura)×Estágio
    expect(c.velocidade).toBe((3 + 2) * 5);                // VB = (Físico+Agilidade)×Estágio
    expect(c.energia_fisica).toBe(CAVALO.energia_fisica);  // EF não depende do estágio
  });

  it('sem evolução, a criatura é a MESMA referência do catálogo', () => {
    // Objeto novo a cada render re-dispararia os useMemo de quem lê daqui.
    expect(criaturaDoAnimal(animal(), CAVALO)).toBe(CAVALO);
    expect(criaturaDoAnimal(animal({ xp: 14 }), CAVALO)).toBe(CAVALO);
  });
});

describe('"enquanto estiverem com ele"', () => {
  it('animal é instância ligada a uma criatura; item comum não é', () => {
    expect(ehAnimalDoPersonagem(animal(), CATALOGO)).toBe(true);
    expect(ehAnimalDoPersonagem({ slug: 'adaga' }, CATALOGO)).toBe(false);
  });

  it('animal à venda e animal pendurado em outro bicho ficam de fora', () => {
    const aVenda = animal({ instanceId: 'c2', anuncio_id: 9 });
    const noBicho = animal({ instanceId: 'c3', animal_id: 'c1' });
    const r = distribuirXpNosAnimais([animal(), aVenda, noBicho], 50, CATALOGO, CRIATURAS);
    expect(r.itens[0].xp).toBeCloseTo(10, 10);
    expect(r.itens[1].xp).toBeUndefined();
    expect(r.itens[2].xp).toBeUndefined();
  });

  it('sem animal nenhum, a lista volta intacta', () => {
    const itens = [{ instanceId: 'a1', slug: 'adaga', quantidade: 1 }];
    const r = distribuirXpNosAnimais(itens, 100, CATALOGO, CRIATURAS);
    expect(r.mudou).toBe(false);
    expect(r.itens).toBe(itens);
  });

  it('todos os animais ganham o mesmo quinto, cada um na sua instância', () => {
    const dois = [animal(), animal({ instanceId: 'c9', xp: 2 })];
    const r = distribuirXpNosAnimais(dois, 25, CATALOGO, CRIATURAS);
    expect(r.itens[0].xp).toBeCloseTo(5, 10);
    expect(r.itens[1].xp).toBeCloseTo(7, 10);
  });
});
