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

/* Os textos do catálogo REAL (lidos do banco em 15/09/2026). O formato é
   PROSA — "Aumenta 35 de Hidratação e 1 de Sobriedade." —, e não a lista
   curta "35 Hidratação" que as fixtures antigas deste arquivo usavam. Com o
   parser velho NENHUM item do catálogo aplicava efeito: o verbo no começo
   derrubava o casamento, e o " e " juntava dois pares num só. Era por isso
   que "usar item não estava calculando" (usuário, 15/09/2026). */
const AGUA    = { efeito_positivo: 'Aumenta 35 de Hidratação e 1 de Sobriedade.',
                  efeito_negativo: 'Diminui 5 de Temperatura.' };
const CERVEJA = { efeito_positivo: 'Aumenta 5 de Energia Heroica.',
                  efeito_negativo: 'Diminui 5 de Sobriedade e 1 de Sono.' };

/* O parser contra o texto REAL do catálogo (banco, 15/09/2026). Todas as
   frases abaixo são cópias literais — inclusive os dois erros de digitação
   que existem no banco ("deTemperatura" sem espaço, "Dimiuni" no lugar de
   "Diminui"), porque é com esses textos que o jogo roda. */
describe('parseEfeito — o formato do catálogo é PROSA', () => {
  const chave = (s) => G.parseEfeito(s).map((e) => [e.key, e.valor]);

  it('"Aumenta N de X e M de Y" devolve os DOIS pares', () => {
    expect(chave('Aumenta 35 de Hidratação e 1 de Sobriedade.'))
      .toEqual([['hidratacao', 35], ['euforia', 1]]);
  });

  it('lista com vírgulas e "e" no fim', () => {
    expect(chave('Diminui 50 de Sanidade, 25 de Sobriedade e 5 de Reputação.'))
      .toEqual([['sanidade', 50], ['euforia', 25], ['reputacao', 5]]);
  });

  it('vitalidade e condição no mesmo texto', () => {
    expect(chave('Aumenta 3 de Energia Física, 40 de Energia Heroica, 40 de Karma e 10 de Saúde.'))
      .toEqual([['ef', 3], ['eh', 40], ['ka', 40], ['vitalidade', 10]]);
  });

  it('aguenta os erros de digitação do banco', () => {
    expect(chave('Aumenta 10 deTemperatura.')).toEqual([['termorregulacao', 10]]);
    expect(chave('Dimiuni 20 de Energia Heroica e 25 de Reputação.'))
      .toEqual([['eh', 20], ['reputacao', 25]]);
  });

  it('o formato curto antigo continua valendo', () => {
    expect(chave('35 Hidratação')).toEqual([['hidratacao', 35]]);
    expect(chave('5 Sobriedade, 1 Sono')).toEqual([['euforia', 5], ['animo', 1]]);
    expect(chave('Reputação 1')).toEqual([['reputacao', 1]]);
  });

  it('texto sem número ou com rótulo desconhecido não vira efeito', () => {
    expect(G.parseEfeito('Aumenta a coragem do portador.')).toEqual([]);
    expect(G.parseEfeito('Aumenta 5 de Coragem.')).toEqual([]);
    expect(G.parseEfeito(null)).toEqual([]);
  });

  /* O SINAL vem do CAMPO (efeito_positivo soma, efeito_negativo subtrai),
     não do verbo — é assim desde sempre, e o banco tem "Diminui" escrito
     dentro de efeito_negativo em todos os casos. */
  it('o verbo não inverte o sinal: quem manda é o campo', () => {
    const item = { efeito_positivo: 'Aumenta 5 de Reputação.', efeito_negativo: 'Diminui 2 de Reputação.' };
    expect(G.efeitosDoItem(item, 1)).toEqual([
      { scope: 'condicoes', key: 'reputacao', delta: 5 },
      { scope: 'condicoes', key: 'reputacao', delta: -2 },
    ]);
  });
});

describe('aplicarEfeitosItem — condições na escala bidirecional', () => {
  it('condição nunca salva parte de 0 (neutro), não de 100 ("cheio")', () => {
    const novo = G.aplicarEfeitosItem({}, AGUA, 1, {});
    expect(novo.condicoes.hidratacao).toBe(35);
  });

  it('efeito negativo desce abaixo de zero em vez de parar no piso 0', () => {
    const novo = G.aplicarEfeitosItem({}, CERVEJA, 1, {});
    expect(novo.condicoes.euforia).toBe(-5);
    expect(novo.condicoes.animo).toBe(-1);
  });

  it('acumula sobre o valor já salvo, com sinal', () => {
    const est = { condicoes: { hidratacao: -20 } };
    expect(G.aplicarEfeitosItem(est, AGUA, 1, {}).condicoes.hidratacao).toBe(15);
  });

  it('satura nos DOIS extremos da escala (-COND_LIMITE..+COND_LIMITE)', () => {
    const teto = G.aplicarEfeitosItem({ condicoes: { hidratacao: 40 } }, AGUA, 1, {});
    expect(teto.condicoes.hidratacao).toBe(LIM);

    const veneno = { efeito_negativo: '40 Saúde' };
    const piso = G.aplicarEfeitosItem({ condicoes: { vitalidade: -30 } }, veneno, 1, {});
    expect(piso.condicoes.vitalidade).toBe(-LIM);
  });

  it('quantidade multiplica o delta (3 cervejas = -15 de Sobriedade)', () => {
    expect(G.aplicarEfeitosItem({}, CERVEJA, 3, {}).condicoes.euforia).toBe(-15);
  });

  it('vestir e despir a MESMA peça volta ao ponto de partida', () => {
    const manto = { efeito_positivo: '10 Reputação' };
    const invertido = { efeito_positivo: manto.efeito_negativo, efeito_negativo: manto.efeito_positivo };
    const vestido = G.aplicarEfeitosItem({ condicoes: { reputacao: 4 } }, manto, 1, {});
    expect(vestido.condicoes.reputacao).toBe(14);
    const despido = G.aplicarEfeitosItem(vestido, invertido, 1, {});
    expect(despido.condicoes.reputacao).toBe(4);
  });

  it('não muta o estado_atual recebido', () => {
    const est = { condicoes: { hidratacao: 5 } };
    G.aplicarEfeitosItem(est, AGUA, 1, {});
    expect(est.condicoes.hidratacao).toBe(5);
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
