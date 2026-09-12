/* ============================================================
   conhecido-jogador.test.js — o que o jogador conhece, derivado dos PJs dele
   ============================================================
   Spec: docs/superpowers/specs/2026-09-11-catalogos-visao-jogador-design.md §2
   Cobre só a função pura `conhecidoDoJogador`. O hook (useConhecidoDoJogador)
   é testado indiretamente pelas listas (bestiario.jsx) — ver
   .superpowers/sdd/2026-09-11-catalogos-jogador/fase-a-report.md.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';

let conhecidoDoJogador, criaturasLiberadas;
beforeAll(async () => {
  await import('./conhecido-jogador.jsx');
  conhecidoDoJogador = window.conhecidoDoJogador;
  criaturasLiberadas = window.criaturasLiberadas;
});

describe('conhecidoDoJogador', () => {
  it('lista vazia devolve conjuntos vazios', () => {
    const r = conhecidoDoJogador([]);
    expect(r.magias.size).toBe(0);
    expect(r.tecnicas.size).toBe(0);
    expect(r.habilidades.size).toBe(0);
    expect(r.itens.size).toBe(0);
  });

  it('null/undefined não quebram — tratados como lista vazia', () => {
    expect(conhecidoDoJogador(null).magias.size).toBe(0);
    expect(conhecidoDoJogador(undefined).itens.size).toBe(0);
  });

  it('PJ com colunas jsonb nulas/ausentes não quebra', () => {
    const r = conhecidoDoJogador([{ id: 1, magias: null, tecnicas: undefined, habilidades: null, inventario: null }, null]);
    expect(r.magias.size).toBe(0);
    expect(r.tecnicas.size).toBe(0);
    expect(r.habilidades.size).toBe(0);
    expect(r.itens.size).toBe(0);
  });

  /* ATENÇÃO AO NÍVEL: esta função une o que recebe, e continua certa assim.
     O que mudou em 12/09/2026 foi QUEM a chama — useConhecidoDoJogador passava
     TODOS os PJs do jogador e passou a passar só o ATIVO, porque o ponto de
     vista é de um personagem, não a soma de três (decisão do usuário).

     Então este teste descreve a função, não o produto: na tela, a lista tem um
     elemento só. Ver o describe do ponto de vista no fim do arquivo. */
  it('une magias, técnicas, habilidades e itens de 2 PJs', () => {
    const pjs = [
      {
        id: 1,
        magias: { 'bola-de-fogo': 2 },
        tecnicas: { 'golpe-duplo': 1 },
        habilidades: { 'faro-apurado': 1 },
        inventario: { moedas: { ouro: 10 }, itens: [{ instanceId: 'a', slug: 'espada-curta', quantidade: 1 }] },
      },
      {
        id: 2,
        magias: { 'cura-leve': 1 },
        tecnicas: { 'aparar': 1 },
        habilidades: { 'coragem': 1 },
        inventario: { moedas: { ouro: 0 }, itens: [{ instanceId: 'b', slug: 'pocao-cura', quantidade: 3 }] },
      },
    ];
    const r = conhecidoDoJogador(pjs);
    expect([...r.magias.keys()].sort()).toEqual(['bola-de-fogo', 'cura-leve']);
    expect(r.tecnicas.has('golpe-duplo')).toBe(true);
    expect(r.tecnicas.has('aparar')).toBe(true);
    expect(r.habilidades.has('faro-apurado')).toBe(true);
    expect(r.habilidades.has('coragem')).toBe(true);
    expect(r.itens.has('espada-curta')).toBe(true);
    expect(r.itens.has('pocao-cura')).toBe(true);
  });

  it('magia repetida entre PJs: vence o MAIOR número de passos', () => {
    const pjs = [
      { id: 1, magias: { 'bola-de-fogo': 2 } },
      { id: 2, magias: { 'bola-de-fogo': 4 } },
    ];
    const r = conhecidoDoJogador(pjs);
    expect(r.magias.get('bola-de-fogo')).toBe(4);
  });

  it('magia repetida — ordem inversa também vence o maior', () => {
    const pjs = [
      { id: 1, magias: { 'bola-de-fogo': 4 } },
      { id: 2, magias: { 'bola-de-fogo': 2 } },
    ];
    const r = conhecidoDoJogador(pjs);
    expect(r.magias.get('bola-de-fogo')).toBe(4);
  });

  it('passos: 0 não conta como conhecida', () => {
    const r = conhecidoDoJogador([{ id: 1, magias: { 'bola-de-fogo': 0 } }]);
    expect(r.magias.has('bola-de-fogo')).toBe(false);
  });

  it('itens sem slug são ignorados, sem quebrar', () => {
    const r = conhecidoDoJogador([
      { id: 1, inventario: { itens: [{ instanceId: 'x' }, { instanceId: 'y', slug: 'tocha' }] } },
    ]);
    expect(r.itens.has('tocha')).toBe(true);
    expect(r.itens.size).toBe(1);
  });

  it('inventário como array puro (formato errado) é tratado como vazio, não lançado erro', () => {
    // personagens.inventario é sempre { moedas, itens }; nunca um array cru.
    const r = conhecidoDoJogador([{ id: 1, inventario: [{ slug: 'nao-deveria-contar' }] }]);
    expect(r.itens.size).toBe(0);
  });
});

/* ============================================================
   Fase B — criaturas liberadas pelo Mestre
   ============================================================
   A spec §5 propunha uma tabela nova (`criaturas_liberadas`) com RLS e uma
   tela de liberação. Estava ERRADA: o mecanismo já existe inteiro desde a
   migration 017, no Diário —

     historias.criatura_ids    → as criaturas anexadas àquela história
     historias.lore_acesso_pj  → { "criatura:15": [pj_id, ...] }

   e o Mestre já libera por ali (toggleLiberarPj, 13-diario/diario.jsx:2749).
   Construir a segunda tabela teria criado duas fontes de verdade para a
   mesma pergunta.

   A regra é contraintuitiva e por isso está travada aqui: chave AUSENTE =
   liberada para TODOS os PJs da história; chave PRESENTE = só os listados.
   Anexar já revela; lore_acesso_pj só ESTREITA.
   ============================================================ */
describe('criaturasLiberadas', () => {
  const hist = (id, criaturaIds, acesso) => ({
    id, criatura_ids: criaturaIds, lore_acesso_pj: acesso || {},
  });

  it('criatura anexada SEM chave de acesso é visível a todos da mesa', () => {
    const r = criaturasLiberadas([hist(1, [10, 11])], [42]);
    expect([...r].sort()).toEqual([10, 11]);
  });

  it('chave com lista restringe aos PJs listados', () => {
    const h = hist(1, [10, 11], { 'criatura:11': [42] });
    expect([...criaturasLiberadas([h], [42])].sort(), 'PJ 42 está na lista').toEqual([10, 11]);
    expect([...criaturasLiberadas([h], [99])], 'PJ 99 não está').toEqual([10]);
  });

  it('lista VAZIA conta como liberada pra todos, não como bloqueada', () => {
    const h = hist(1, [10], { 'criatura:10': [] });
    expect([...criaturasLiberadas([h], [99])]).toEqual([10]);
  });

  it('criatura fora de criatura_ids não aparece nem com acesso concedido', () => {
    // Acesso a uma criatura que não está anexada à história não a revela:
    // é a lista da história que manda.
    const h = hist(1, [10], { 'criatura:77': [42] });
    expect([...criaturasLiberadas([h], [42])]).toEqual([10]);
  });

  it('une as criaturas de TODAS as histórias do jogador', () => {
    const r = criaturasLiberadas([hist(1, [10]), hist(2, [20, 10])], [42]);
    expect([...r].sort((a, b) => a - b)).toEqual([10, 20]);
  });

  it('basta UM dos PJs do jogador estar na lista', () => {
    const h = hist(1, [10], { 'criatura:10': [7] });
    expect([...criaturasLiberadas([h], [42, 7])]).toEqual([10]);
  });

  it('id como texto no jsonb ainda casa — o banco devolve número', () => {
    const h = hist(1, [10], { 'criatura:10': ['42'] });
    expect([...criaturasLiberadas([h], [42])]).toEqual([10]);
  });

  it('sem história, sem PJ, ou entrada torta: conjunto vazio, sem estourar', () => {
    expect([...criaturasLiberadas([], [42])]).toEqual([]);
    expect([...criaturasLiberadas(null, null)]).toEqual([]);
    expect([...criaturasLiberadas([null, hist(1, null)], [42])]).toEqual([]);
    expect([...criaturasLiberadas([hist(1, [10], 'lixo')], [42])]).toEqual([10]);
  });
});

describe('o ponto de vista é de UM personagem', () => {
  /* Decisão do usuário, 12/09/2026: "depois que um jogador selecionar o
     personagem, todos os demais menus serão seu ponto de vista em relação a
     magias, técnicas, animais, etc que conhece".

     Antes o hook trazia TODOS os PJs do jogador e unia o que cada um sabia. Um
     jogador com três personagens via a soma dos três — e nenhum deles sabia
     tudo aquilo. O recorte não era de ninguém.

     O hook faz I/O, então o que se trava aqui é a FONTE: que ele resolve o PJ
     ativo pelo perfil e restringe a consulta a ele. */
  let fonte;
  beforeAll(async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'conhecido-jogador.jsx'), 'utf8');
  });

  it('lê o pj_ativo_id do perfil', () => {
    expect(fonte).toMatch(/from\('profiles'\)\.select\('pj_ativo_id'\)/);
  });

  it('e restringe a consulta de personagens a ELE', () => {
    expect(fonte).toMatch(/\.eq\('id', pjAtivoId\)/);
  });

  it('sem PJ ativo, o conjunto é VAZIO — e é de propósito', () => {
    /* É o estado em que o jogador ainda não escolheu por quais olhos está
       olhando. Mostrar um recorte que não é de ninguém seria pior. */
    expect(fonte).toMatch(/if \(!pjAtivoId\) \{ setConhecido\(CONHECIDO_VAZIO\(\)\); return; \}/);
  });
});
