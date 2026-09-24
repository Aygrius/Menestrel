/* ============================================================
   magia-aprovacao-mestre.test.js — degrau 2
   ============================================================
   "Magias que aplicam efeitos em outros jogadores precisam de aprovação do
   Mestre." — decisão do usuário, 12/09/2026.

   Isso NÃO contorna a regra do banco: torna-a desnecessária de contornar. A
   política personagens_update_own_or_vinculado já autoriza o Mestre a
   escrever em todo protagonista da história dele, então a escrita acontece na
   sessão de alguém que já podia. A alternativa seria uma RPC SECURITY DEFINER
   reimplementando quem pode conjurar em quem — uma segunda cópia de uma regra
   que o banco já enuncia, e essa cópia divergiria.

   Este arquivo trava a FORMA DO PEDIDO e a leitura da fila. As duas pontas
   vivem em telas diferentes — a ficha produz, o painel do Mestre consome —, e
   é por isso que a forma mora no núcleo e não em nenhuma das duas.

   Ver docs/fora-de-combate.md.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './copy.jsx';
import './constants.jsx';
import './helpers.jsx';
import './inventario-helpers.jsx';
import './magias-efeito.jsx';

beforeAll(() => {
  expect(window.metaDeEvocacao).toBeTypeOf('function');
  expect(window.pedidoDeMagiaPendente).toBeTypeOf('function');
  expect(window.pedidosDeMagiaAbertos).toBeTypeOf('function');
});

const CURAS = { key: 'curas_espirituais', nome: 'Curas Espirituais',
                duracao: 'Instantânea', nivel_1: 'Restaura 20 de energia heroica.' };
const COLEGA = { id: 42, nome: 'Beltrano' };

describe('a forma do pedido', () => {
  it('evocação em TERCEIRO nasce pendente', () => {
    const meta = window.metaDeEvocacao({
      magia: CURAS, nivel: 3, alvo: COLEGA, aplicou: false,
      motivo: 'aprovacao_mestre', karma: 3, conjurador: 'Fulano',
    });
    expect(meta).toMatchObject({
      magia_key: 'curas_espirituais', nivel: 3, alvo_id: 42,
      pendente: true, aplicado: false, karma_gasto: 3,
    });
  });

  it('evocação em SI MESMO não é pendente — já aplicou', () => {
    const meta = window.metaDeEvocacao({
      magia: CURAS, nivel: 1, alvo: null, aplicou: true, karma: 1,
    });
    expect(meta.pendente).toBe(false);
    expect(meta.aplicado).toBe(true);
  });

  it('magia de RODADA num colega NÃO fica pendente — não há o que aprovar', () => {
    /* É magia de combate: ninguém está esperando o Mestre, e prometer uma
       aprovação que nunca virá é pior do que não prometer nada. */
    const meta = window.metaDeEvocacao({
      magia: { key: 'bencao', nome: 'Bênção' }, nivel: 1, alvo: COLEGA,
      aplicou: false, motivo: 'rodadas', karma: 0,
    });
    expect(meta.pendente).toBe(false);
    expect(meta.motivo).toBe('rodadas');
  });

  it('o karma gasto viaja no meta — o conjurador já pagou', () => {
    const meta = window.metaDeEvocacao({
      magia: CURAS, nivel: 5, alvo: COLEGA, aplicou: false,
      motivo: 'aprovacao_mestre', karma: 5,
    });
    expect(meta.karma_gasto).toBe(5);
  });
});

describe('ler um pedido', () => {
  const metaPendente = () => window.metaDeEvocacao({
    magia: CURAS, nivel: 3, alvo: COLEGA, aplicou: false,
    motivo: 'aprovacao_mestre', karma: 3, conjurador: 'Fulano',
  });

  it('devolve o que o Mestre precisa para aplicar', () => {
    expect(window.pedidoDeMagiaPendente(metaPendente())).toMatchObject({
      magia_key: 'curas_espirituais', nivel: 3, alvo_id: 42,
      alvo_nome: 'Beltrano', conjurador: 'Fulano',
    });
  });

  it('meta que não é pedido devolve null', () => {
    expect(window.pedidoDeMagiaPendente(null)).toBeNull();
    expect(window.pedidoDeMagiaPendente({})).toBeNull();
    expect(window.pedidoDeMagiaPendente({ pendente: true })).toBeNull();  // sem alvo
  });

  it('evento de teste de habilidade não vira pedido', () => {
    expect(window.pedidoDeMagiaPendente({ habilidade: 'Sentidos', sucesso: true })).toBeNull();
  });

  /* Bug de 15/09/2026: a janela de magia mandava alvo_id 'self' quando o
     jogador escolhia a si mesmo, o pedido caía nesta fila, e aplicar dava
     "invalid input syntax for type bigint: self". O alvo agora é o id do PJ;
     pedido com alvo que não é id NÃO entra na fila. */
  it('alvo que não é id de personagem não vira pedido', () => {
    const meta = { ...metaPendente(), alvo_id: 'self' };
    expect(window.pedidoDeMagiaPendente(meta)).toBeNull();
    expect(window.pedidoDeMagiaPendente({ ...metaPendente(), alvo_id: 'abc' })).toBeNull();
    // Id em texto continua valendo — é o que a tela manda.
    expect(window.pedidoDeMagiaPendente({ ...metaPendente(), alvo_id: '42' })).toMatchObject({ alvo_id: '42' });
  });

  it('a fila do Mestre ignora os pedidos com alvo self que ficaram no log', () => {
    const linhas = [
      { id: 1, created_at: 'a', meta: { ...metaPendente(), alvo_id: 'self' } },
      { id: 2, created_at: 'b', meta: metaPendente() },
    ];
    expect(window.pedidosDeMagiaAbertos(linhas).map((p) => p.id)).toEqual([2]);
  });
});

describe('a fila: o que ainda espera o Mestre', () => {
  /* mesa_log é APPEND-ONLY para o cliente — conferido no banco: só há política
     de SELECT. Então um pedido não é marcado como resolvido; o que existe é um
     SEGUNDO evento apontando para o primeiro. O histórico fica intacto. */
  const pedido = (id, alvo) => ({
    id, created_at: '2026-09-12T10:0' + id + ':00Z',
    meta: window.metaDeEvocacao({
      magia: CURAS, nivel: 1, alvo: alvo || COLEGA, aplicou: false,
      motivo: 'aprovacao_mestre', karma: 1, conjurador: 'Fulano',
    }),
  });
  const resposta = (id, respondeId) => ({
    id, created_at: '2026-09-12T11:00:00Z',
    meta: { responde_pedido: respondeId, aplicado: true },
  });

  it('pedido sem resposta fica na fila', () => {
    expect(window.pedidosDeMagiaAbertos([pedido(1)]).map((p) => p.id)).toEqual([1]);
  });

  it('pedido respondido SAI da fila', () => {
    expect(window.pedidosDeMagiaAbertos([pedido(1), resposta(2, 1)])).toEqual([]);
  });

  it('dispensar também tira da fila — responder é responder', () => {
    const recusa = { id: 2, created_at: 'x', meta: { responde_pedido: 1, aplicado: false } };
    expect(window.pedidosDeMagiaAbertos([pedido(1), recusa])).toEqual([]);
  });

  it('só o pedido respondido sai; os outros ficam', () => {
    const fila = window.pedidosDeMagiaAbertos([pedido(1), pedido(2), resposta(3, 1)]);
    expect(fila.map((p) => p.id)).toEqual([2]);
  });

  it('o mais NOVO vem primeiro — é o que acabou de chegar', () => {
    const fila = window.pedidosDeMagiaAbertos([pedido(1), pedido(2), pedido(3)]);
    expect(fila.map((p) => p.id)).toEqual([3, 2, 1]);
  });

  it('eventos que não são pedido são ignorados', () => {
    const outro = { id: 9, created_at: 'x', meta: { habilidade: 'Sentidos' } };
    const semMeta = { id: 8, created_at: 'x', meta: null };
    expect(window.pedidosDeMagiaAbertos([outro, semMeta, pedido(1)]).map((p) => p.id)).toEqual([1]);
  });

  it('log vazio devolve fila vazia, sem lançar', () => {
    expect(window.pedidosDeMagiaAbertos([])).toEqual([]);
    expect(window.pedidosDeMagiaAbertos(null)).toEqual([]);
  });

  it('a resposta pode chegar ANTES na lista e ainda assim resolve', () => {
    // A ordem do array não é garantia de nada — o vínculo é por id.
    expect(window.pedidosDeMagiaAbertos([resposta(2, 1), pedido(1)])).toEqual([]);
  });
});

describe('o efeito que o Mestre vai aplicar é o mesmo de sempre', () => {
  it('sai de efeitosDeMagiaNaFicha, como na evocação em si mesmo', () => {
    /* O Mestre não aplica por um caminho próprio: usa a mesma função que o
       jogador usa em si mesmo, com a mesma porta de escrita. Dois caminhos
       divergiriam — e curar a si mesmo daria um número, curar o colega daria
       outro. */
    expect(window.efeitosDeMagiaNaFicha(CURAS, 1))
      .toEqual([{ scope: 'vitalidade', key: 'eh', delta: 20 }]);
  });

  it('e respeita o teto do ALVO, não o de quem evocou', () => {
    const alvoFraco = { vitalidade: { eh: 5 }, condicoes: {} };
    const r = window.aplicarEfeitosNaFicha(alvoFraco,
      window.efeitosDeMagiaNaFicha(CURAS, 1), { eh: 12 });
    expect(r.vitalidade.eh).toBe(12);
  });
});
