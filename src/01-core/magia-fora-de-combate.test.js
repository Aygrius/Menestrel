/* ============================================================
   magia-fora-de-combate.test.js — degrau 1
   ============================================================
   Até 12/09/2026 o botão *Evocar* da ficha escolhia nível e alvo, escrevia na
   Central de Mensagens da Mesa — e parava aí. A magia era anunciada e não
   acontecia; o próprio comentário no código dizia isso desde que foi escrito.

   Duas decisões do usuário desenharam a fronteira do que passa a acontecer:

     1. "Fora de batalha, as rodadas não contam."
     2. "Magia em outro jogador precisa de aprovação do Mestre."

   A primeira não é limitação: é uma classificação que o catálogo já tinha
   feito. E há um encaixe que vale registrar — as primitivas INSTANTÂNEAS do
   motor são exatamente as que cabem numa ficha, e as duradouras são exatamente
   as que precisam de rodada. As duas regras chegam à mesma fronteira por
   caminhos diferentes, o que é bom sinal de que a fronteira é real.

   Ver docs/fora-de-combate.md.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './copy.jsx';
import './constants.jsx';
import './helpers.jsx';
import './inventario-helpers.jsx';
import './magias-efeito.jsx';

beforeAll(() => {
  expect(window.classeDeDuracao).toBeTypeOf('function');
  expect(window.efeitosDeMagiaNaFicha).toBeTypeOf('function');
  expect(window.aplicarEfeitosNaFicha).toBeTypeOf('function');
});

// Textos literais do banco.
const CURAS = { key: 'curas_espirituais', nome: 'Curas Espirituais',
                duracao: 'Instantânea', nivel_1: 'Restaura 20 de energia heroica.' };
const CURAS_FIS = { key: 'curas_fisicas', nome: 'Curas Físicas',
                    duracao: 'Instantânea', nivel_1: 'Restaura 4 de energia física.' };
const BENCAO = { key: 'bencao', nome: 'Bênção', duracao: '10 rodadas',
                 nivel_1: 'Aumenta 1 coluna de ataque e 5 de energia heroica.' };
const PIRO = { key: 'piromanipulacao', nome: 'Piromanipulação', duracao: 'Instantânea',
               nivel_1: 'Causa 4 de dano elemental de fogo.' };
const DOENCAS = { key: 'doencas', nome: 'Doenças', duracao: 'Instantânea',
                  nivel_1: 'Cause conjuntivite: Reduz 25 de Saúde e o tempo de cura é de 3 dias.' };
const NECRO = { key: 'necropotencia', nome: 'Necropotência', duracao: '30 dias',
                nivel_1: 'Restaura 20 de energia heroica.' };
const ESCURIDAO = { key: 'escuridao', nome: 'Escuridão', duracao: 'Variável',
                    nivel_1: 'A magia tem duração de 1 rodada.',
                    nivel_5: 'A magia tem duração de 10 minutos.' };

describe('em qual balde a evocação cai', () => {
  it.each([
    [CURAS, 1, 'instantanea'],
    [BENCAO, 1, 'rodadas'],
    [NECRO, 1, 'calendario'],
    [{ duracao: 'Permanente' }, 1, 'permanente'],
  ])('%# → %s', (magia, nivel, esperado) => {
    expect(window.classeDeDuracao(magia, nivel)).toBe(esperado);
  });

  it('o TEXTO DO NÍVEL manda sobre a coluna duracao', () => {
    /* 53 magias têm duracao 'Variável' — a mesma magia pode ser de rodada num
       nível e de calendário em outro. A classificação é por EVOCAÇÃO. */
    expect(window.classeDeDuracao(ESCURIDAO, 1)).toBe('rodadas');
    expect(window.classeDeDuracao(ESCURIDAO, 5)).toBe('calendario');
  });

  it('sem nada legível, trata como instantânea', () => {
    // Erra para o lado de não deixar efeito pendurado na ficha.
    expect(window.classeDeDuracao({ duracao: 'Livre' }, 1)).toBe('instantanea');
  });

  it('vale fora de combate: instantânea e permanente sim, rodada não', () => {
    expect(window.valeForaDeCombate(CURAS, 1)).toBe(true);
    expect(window.valeForaDeCombate({ duracao: 'Permanente' }, 1)).toBe(true);
    expect(window.valeForaDeCombate(BENCAO, 1)).toBe(false);
  });
});

describe('a magia vira efeito no formato que a ficha já sabe aplicar', () => {
  it('cura de EH vira delta positivo na vitalidade', () => {
    expect(window.efeitosDeMagiaNaFicha(CURAS, 1))
      .toEqual([{ scope: 'vitalidade', key: 'eh', delta: 20 }]);
  });

  it('cura de EF idem', () => {
    expect(window.efeitosDeMagiaNaFicha(CURAS_FIS, 1))
      .toEqual([{ scope: 'vitalidade', key: 'ef', delta: 4 }]);
  });

  it('dano vira delta NEGATIVO na energia física', () => {
    // Fora de combate não há armadura nem cascata: vai direto na EF.
    expect(window.efeitosDeMagiaNaFicha(PIRO, 1))
      .toEqual([{ scope: 'vitalidade', key: 'ef', delta: -4 }]);
  });

  it('condição de ficha vira delta na condição', () => {
    expect(window.efeitosDeMagiaNaFicha(DOENCAS, 1))
      .toContainEqual({ scope: 'condicoes', key: 'vitalidade', delta: -25 });
  });

  it('EFEITO DURADOURO não vira nada — precisa de rodada, que não existe aqui', () => {
    // Bênção dá coluna de ataque (duradoura) e EH temporária (duradoura).
    // Nenhuma das duas cabe numa ficha.
    expect(window.efeitosDeMagiaNaFicha(BENCAO, 1)).toEqual([]);
  });

  it('magia fora do registro não vira nada', () => {
    expect(window.efeitosDeMagiaNaFicha({ key: 'inexistente', nivel_1: 'Causa 9 de dano.' }, 1))
      .toEqual([]);
  });
});

describe('quando NÃO aplica, diz por quê', () => {
  /* "Evoquei e não aconteceu nada" foi o que esta tela fez por meses. O log
     precisa dizer o motivo, senão vira suporte. */
  /* Aura Divina dura "1 hora" e ESTÁ no registro — é a fixture certa para o
     balde calendário. Necropotência também dura calendário, mas é órfã
     (ritual), então para ela a resposta certa é 'narrativa', e a ordem das
     checagens importa: sem registro, nem se olha a duração. */
  const AURA = { key: 'aura_divina', nome: 'Aura Divina', duracao: '1 hora',
                 nivel_1: 'A área reduz 1 coluna de ataque.' };

  it.each([
    [CURAS, 1, null],              // aplica
    [BENCAO, 1, 'rodadas'],        // magia de combate
    // Calendário DEIXOU de ser recusa em 12/09/2026, com o degrau 3: passa a
    // virar magia ativa na ficha, com data de vencimento.
    [AURA, 1, null],
    [NECRO, 1, 'narrativa'],       // órfã: sem registro, a duração nem pesa
    [{ key: 'inexistente' }, 1, 'narrativa'],
  ])('%# → %s', (magia, nivel, esperado) => {
    expect(window.motivoNaoAplicaNaFicha(magia, nivel)).toBe(esperado);
  });

  it('magia instantânea cujo efeito é só duradouro diz "duradoura"', () => {
    // Existe no registro, é instantânea, mas nada dela cabe numa ficha.
    const so_buff = { key: 'velocidade', nome: 'Velocidade', duracao: 'Instantânea',
                      nivel_1: 'Aumenta 2 de velocidade.' };
    expect(window.motivoNaoAplicaNaFicha(so_buff, 1)).toBe('duradoura');
  });
});

describe('a porta de escrita é a MESMA do item consumido', () => {
  /* aplicarEfeitosNaFicha foi EXTRAÍDA de aplicarEfeitosItem em vez de
     copiada. É o ponto: clamp de poço, escala de condição e piso de zero num
     lugar só. Quando um deles estiver errado há um lugar para corrigir, não
     dois que já divergiram. */
  const MAX = { eh: 30, ef: 40, ka: 10, ar: 5 };
  const estado = (over = {}) => ({
    vitalidade: { eh: 10, ef: 20, ka: 5, ar: 0, ...(over.vitalidade || {}) },
    condicoes: { vitalidade: 0, ...(over.condicoes || {}) },
  });

  it('cura entra no poço', () => {
    const r = window.aplicarEfeitosNaFicha(estado(),
      window.efeitosDeMagiaNaFicha(CURAS, 1), MAX);
    expect(r.vitalidade.eh).toBe(30);   // 10 + 20
  });

  it('e respeita o TETO, como o item respeita', () => {
    const r = window.aplicarEfeitosNaFicha(estado({ vitalidade: { eh: 25 } }),
      window.efeitosDeMagiaNaFicha(CURAS, 1), MAX);
    expect(r.vitalidade.eh).toBe(30);   // 25 + 20 = 45, preso em 30
  });

  it('dano não deixa o poço negativo', () => {
    const r = window.aplicarEfeitosNaFicha(estado({ vitalidade: { ef: 2 } }),
      window.efeitosDeMagiaNaFicha(PIRO, 1), MAX);
    expect(r.vitalidade.ef).toBe(0);
  });

  it('condição respeita a escala −50..+50', () => {
    const r = window.aplicarEfeitosNaFicha(estado({ condicoes: { vitalidade: -40 } }),
      window.efeitosDeMagiaNaFicha(DOENCAS, 1), MAX);
    expect(r.condicoes.vitalidade).toBeGreaterThanOrEqual(-50);
  });

  it('karma sai do nível EVOCADO', () => {
    // Fora de combate o jogador escolhe o nível, então paga o que evocou —
    // diferente da batalha, onde se conjura sempre no máximo comprado.
    const r = window.aplicarEfeitosNaFicha(estado(),
      [{ scope: 'vitalidade', key: 'ka', delta: -3 }], MAX);
    expect(r.vitalidade.ka).toBe(2);
  });

  it('lista vazia devolve o MESMO estado — nada a salvar', () => {
    const e = estado();
    expect(window.aplicarEfeitosNaFicha(e, [], MAX)).toBe(e);
  });

  it('e aplicarEfeitosItem continua funcionando igual', () => {
    // A assinatura antiga não mudou: quem já a chamava não sabe de nada.
    const r = window.aplicarEfeitosItem(estado(),
      { efeito_positivo: '5 Energia Heroica' }, 1, MAX);
    expect(r.vitalidade.eh).toBe(15);
  });
});

describe('o caminho completo de uma evocação em si mesmo', () => {
  it('Curas Espirituais nível 1: cura 20 e cobra 1 de karma', () => {
    const MAX = { eh: 30, ef: 40, ka: 10 };
    const antes = { vitalidade: { eh: 5, ef: 20, ka: 5 }, condicoes: {} };
    const efeitos = [...window.efeitosDeMagiaNaFicha(CURAS, 1),
                     { scope: 'vitalidade', key: 'ka', delta: -1 }];
    const depois = window.aplicarEfeitosNaFicha(antes, efeitos, MAX);
    expect(depois.vitalidade).toMatchObject({ eh: 25, ka: 4 });
  });
});

/* "O personagem usou a magia fora de combate e não gastou o karma." (usuário,
   13/09/2026) — narrativa e duradoura saíam de graça. */
describe('karmaDaEvocacaoForaDeCombate — o custo é do ato', () => {
  it('aplicou na ficha (motivo null): cobra o nível evocado', () => {
    expect(window.karmaDaEvocacaoForaDeCombate(null, 5)).toBe(5);
  });
  it('narrativa e duradoura também cobram', () => {
    expect(window.karmaDaEvocacaoForaDeCombate('narrativa', 3)).toBe(3);
    expect(window.karmaDaEvocacaoForaDeCombate('duradoura', 1)).toBe(1);
  });
  it('rodada não sai fora de combate: não cobra', () => {
    expect(window.karmaDaEvocacaoForaDeCombate('rodadas', 7)).toBe(0);
  });
});
