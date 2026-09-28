/* ============================================================
   efeitos-item.test.js — escala das condições ao usar um item
   ============================================================
   Bug que motivou o arquivo (auditoria 01/09/2026):
   aplicarEfeitosItem ficou na escala ANTIGA (0–100, default 100 =
   "cheio") depois que as 8 condições migraram pra escala bidirecional
   -COND_LIMITE..+COND_LIMITE com 0 = neutro (01-core/helpers.jsx).

   Sintomas medidos antes da correção:
     • beber água ("35 Hidratação") gravava 100 — a Ficha satura no teto
       +50 e a barra nasce cheia com um gole;
     • efeito negativo nunca descia abaixo de 0 (piso da escala velha),
       então condição negativa era INALCANÇÁVEL por item;
     • a Batalha, com o MESMO item, dava outro número — ela já usava
       -50..+50 numa cópia paralela (aplicarEfeitoItemSnapshot).

   Os testes de acordo entre as duas telas ficam em
   12-batalha/efeito-item-escala.test.js.
   ============================================================ */
import { describe, it, expect } from 'vitest';
// Ordem de src/main.tsx: helpers.jsx define COND_LIMITE, consumido aqui.
import './helpers.jsx';
import './inventario-helpers.jsx';

const G = globalThis;
const LIM = G.COND_LIMITE;

/* ESCALA NOVA (27/09/2026): as barras dizem o MAL e vão de 0 (ideal) a 100
   (pior). O catálogo foi reescrito: "Reduz 35 de Sede e 1 de Vício",
   "Aumenta 5 de Vício e 1 de Sono", "Protege 25 de Frio". O SINAL vem do
   VERBO, que vale para as partes seguintes até aparecer outro; sem verbo,
   vale o campo. Os rótulos ANTIGOS (Hidratação, Saúde…) ainda são lidos, com
   o sentido invertido — texto que ninguém reescreveu continua certo. */
const AGUA    = { efeito_positivo: 'Reduz 35 de Sede e 5 de Calor.' };
const CERVEJA = { efeito_positivo: 'Aumenta 5 de Energia Heroica.',
                  efeito_negativo: 'Aumenta 5 de Vício e 1 de Sono.' };

describe('parseEfeito — prosa, com o verbo dando o sinal', () => {
  const chave = (s) => G.parseEfeito(s).map((e) => [e.key, e.valor]);

  it('"Reduz N de X e M de Y" devolve os DOIS pares', () => {
    expect(chave('Reduz 35 de Sede e 5 de Calor.')).toEqual([['hidratacao', 35], ['calor', 5]]);
  });

  it('lista com vírgulas e "e" no fim, com os nomes novos', () => {
    expect(chave('Aumenta 50 de Loucura, 25 de Vício e 5 de Desonra.'))
      .toEqual([['sanidade', 50], ['euforia', 25], ['reputacao', 5]]);
  });

  it('vitalidade e condição no mesmo texto', () => {
    expect(chave('Aumenta 3 de Energia Física, 40 de Energia Heroica e 40 de Karma; reduz 10 de Doença.'))
      .toEqual([['ef', 3], ['eh', 40], ['ka', 40], ['vitalidade', 10]]);
  });

  it('aguenta os erros de digitação do banco', () => {
    expect(chave('Dimiuni 20 de Energia Heroica e 25 de Desonra.')).toEqual([['eh', 20], ['reputacao', 25]]);
  });

  it('texto sem número ou com rótulo desconhecido não vira efeito', () => {
    expect(G.parseEfeito('Aumenta a coragem do portador.')).toEqual([]);
    expect(G.parseEfeito('Aumenta 5 de Coragem.')).toEqual([]);
    expect(G.parseEfeito(null)).toEqual([]);
  });

  it('o verbo dá o sinal e vale para as partes seguintes', () => {
    const item = { efeito_positivo: 'Aumenta 5 de Energia Heroica; reduz 10 de Sono e 5 de Loucura.' };
    expect(G.efeitosDoItem(item, 1)).toEqual([
      { scope: 'vitalidade', key: 'eh', delta: 5 },
      { scope: 'condicoes', key: 'animo', delta: -10 },
      { scope: 'condicoes', key: 'sanidade', delta: -5 },
    ]);
  });

  it('sem verbo, vale o campo (positivo soma, negativo subtrai)', () => {
    expect(G.efeitosDoItem({ efeito_negativo: '5 Energia Física' }, 1))
      .toEqual([{ scope: 'vitalidade', key: 'ef', delta: -5 }]);
  });

  it('rótulo ANTIGO é lido ao contrário: "Aumenta 35 de Hidratação" mata a sede', () => {
    expect(G.efeitosDoItem({ efeito_positivo: 'Aumenta 35 de Hidratação.' }, 1))
      .toEqual([{ scope: 'condicoes', key: 'hidratacao', delta: -35 }]);
    expect(G.efeitosDoItem({ efeito_negativo: 'Diminui 20 de Sanidade.' }, 1))
      .toEqual([{ scope: 'condicoes', key: 'sanidade', delta: 20 }]);
  });

  it('"Protege" não é efeito de usar — é a proteção da vestimenta', () => {
    const capa = { efeito_positivo: 'Protege 25 de Frio e 4 de Desonra.' };
    expect(G.efeitosDoItem(capa, 1)).toEqual([]);
    expect(G.protecoesDoItem(capa)).toEqual({ frio: 25, reputacao: 4 });
  });
});

describe('protecoesVestidas — só o que está no corpo', () => {
  const cat = { capa: { efeito_positivo: 'Protege 25 de Frio.' }, anel: { efeito_positivo: 'Protege 2 de Desonra.' } };
  it('soma as peças vestidas; a guardada não conta', () => {
    const itens = [
      { slug: 'capa', vestido: true }, { slug: 'anel', vestido: true }, { slug: 'capa' },
    ];
    expect(G.protecoesVestidas(itens, cat)).toEqual({ frio: 25, reputacao: 2 });
  });
});

describe('aplicarEfeitosItem — condições na escala 0..100', () => {
  it('parte de 0 e só sobe o que o item manda', () => {
    const novo = G.aplicarEfeitosItem({}, CERVEJA, 1, {});
    expect(novo.condicoes.euforia).toBe(5);
    expect(novo.condicoes.animo).toBe(1);
  });

  it('reduzir não passa de 0 (o ideal)', () => {
    expect(G.aplicarEfeitosItem({ condicoes: { hidratacao: 20 } }, AGUA, 1, {}).condicoes.hidratacao).toBe(0);
  });

  it('satura em 100 (o pior)', () => {
    const veneno = { efeito_negativo: 'Aumenta 40 de Doença.' };
    expect(G.aplicarEfeitosItem({ condicoes: { vitalidade: 80 } }, veneno, 1, {}).condicoes.vitalidade).toBe(LIM);
  });

  it('quantidade multiplica o delta (3 cervejas = 15 de Vício)', () => {
    expect(G.aplicarEfeitosItem({}, CERVEJA, 3, {}).condicoes.euforia).toBe(15);
  });

  it('Frio e Calor mexem na Temperatura: reduzir para no zero, não passa ao outro lado', () => {
    const calor = { condicoes: { termorregulacao: 3 } };
    expect(G.aplicarEfeitosItem(calor, AGUA, 1, {}).condicoes.termorregulacao).toBe(0);
    const sopa = { efeito_positivo: 'Reduz 20 de Frio.' };
    expect(G.aplicarEfeitosItem({ condicoes: { termorregulacao: -30 } }, sopa, 1, {}).condicoes.termorregulacao).toBe(-10);
    expect(G.aplicarEfeitosItem({ condicoes: { termorregulacao: 10 } }, sopa, 1, {}).condicoes.termorregulacao).toBe(10);
    const gelo = { efeito_negativo: 'Aumenta 15 de Frio.' };
    expect(G.aplicarEfeitosItem({ condicoes: { termorregulacao: 5 } }, gelo, 1, {}).condicoes.termorregulacao).toBe(-10);
  });

  it('vestir e despir a MESMA peça volta ao ponto de partida (o despir nega os deltas)', () => {
    const colar = { efeito_negativo: 'Aumenta 5 de Desonra.' };
    const vestido = G.aplicarEfeitosItem({ condicoes: { reputacao: 4 } }, colar, 1, {});
    expect(vestido.condicoes.reputacao).toBe(9);
    expect(G.desfazerEfeitosItem(vestido, colar, 1, {}).condicoes.reputacao).toBe(4);
  });

  it('não muta o estado_atual recebido', () => {
    const est = { condicoes: { hidratacao: 50 } };
    G.aplicarEfeitosItem(est, AGUA, 1, {});
    expect(est.condicoes.hidratacao).toBe(50);
  });

  it('item sem efeito devolve o MESMO objeto (chamadores dependem disso)', () => {
    const est = { condicoes: { hidratacao: 5 } };
    expect(G.aplicarEfeitosItem(est, { nome: 'Corda' }, 1, {})).toBe(est);
  });
});

describe('aplicarEfeitosItem — vitalidade e absorção (inalterado)', () => {
  it('vitalidade continua com piso 0 e teto no máximo da ficha', () => {
    const maximos = { ef: 20, eh: 12, ka: 0 };
    const poção = { efeito_positivo: '30 Energia Heroica' };
    expect(G.aplicarEfeitosItem({ vitalidade: { eh: 4 } }, poção, 1, maximos).vitalidade.eh).toBe(12);

    const dreno = { efeito_negativo: '30 Energia Física' };
    expect(G.aplicarEfeitosItem({ vitalidade: { ef: 5 } }, dreno, 1, maximos).vitalidade.ef).toBe(0);
  });

  it('vitalidade sem valor salvo parte do máximo (barra cheia)', () => {
    const dreno = { efeito_negativo: '3 Energia Heroica' };
    expect(G.aplicarEfeitosItem({}, dreno, 1, { eh: 12 }).vitalidade.eh).toBe(9);
  });

  it('absorção é buff temporário: passa do máximo, mas não fica negativa', () => {
    const elixir = { efeito_positivo: '8 Absorção' };
    expect(G.aplicarEfeitosItem({ vitalidade: { ar: 2 } }, elixir, 1, { ar: 3 }).vitalidade.ar).toBe(10);
  });
});

describe('pecaNoCorpo — critério ÚNICO de "está vestindo isso"', () => {
  // Bug latente (auditoria 01/09/2026): a soma de absorção usava três
  // critérios diferentes em três arquivos —
  //   calcArmadura (01-core)   it.equipado
  //   calcularFicha (game-data) it.slot
  //   ficha.jsx                 it.slot || it.vestido
  // Hoje os três dão o MESMO número, porque nenhuma das 92 Vestimentas tem
  // absorcao/defesa (conferido no banco). No dia em que uma tiver, a ficha
  // passaria a mostrar três valores diferentes pro mesmo personagem.
  const G = globalThis;

  it('armadura equipada conta', () => {
    expect(G.pecaNoCorpo({ equipado: true, slot: 'peito' })).toBe(true);
  });

  it('vestimenta vestida conta — é o caso que divergia', () => {
    expect(G.pecaNoCorpo({ vestido: true, vesteSlot: 'peito' })).toBe(true);
  });

  it('item solto na mochila não conta', () => {
    expect(G.pecaNoCorpo({ slug: 'corda', quantidade: 1 })).toBe(false);
    expect(G.pecaNoCorpo({ equipado: false, vestido: false })).toBe(false);
  });

  it('item dentro de container não conta', () => {
    expect(G.pecaNoCorpo({ containerId: 'mochila-1' })).toBe(false);
  });

  it('nulo/indefinido não quebra', () => {
    expect(G.pecaNoCorpo(null)).toBe(false);
    expect(G.pecaNoCorpo(undefined)).toBe(false);
  });
});

describe('calcArmadura usa o critério único', () => {
  const G = globalThis;
  const cat = { peitoral: { absorcao: 5 }, tunica: { absorcao: 2 }, corda: { absorcao: 0 } };

  it('soma armadura equipada e vestimenta vestida', () => {
    const pj = { inventario: { itens: [
      { slug: 'peitoral', equipado: true, slot: 'peito' },
      { slug: 'tunica',   vestido: true, vesteSlot: 'peito' },
      { slug: 'corda' },
    ] } };
    expect(G.calcArmadura(pj, cat)).toBe(7);
  });

  it('ignora o que está guardado', () => {
    const pj = { inventario: { itens: [{ slug: 'peitoral', containerId: 'm1' }] } };
    expect(G.calcArmadura(pj, cat)).toBe(0);
  });
});
