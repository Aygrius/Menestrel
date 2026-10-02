import { describe, it, expect, afterEach } from 'vitest';
import './helpers.jsx';
import './inventario-helpers.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

const stubOriginal = globalThis.supabaseClient;
afterEach(() => { globalThis.supabaseClient = stubOriginal; });

const it_ = (instanceId, extra) => ({ instanceId, slug: instanceId, quantidade: 1, containerId: null, ...extra });
const inv = (itens, moedas) => ({ moedas: moedas || { ouro: 0, prata: 0, cobre: 0, latao: 0 }, itens });
const M = (...a) => window.mesclarInventario(...a);

describe('mesclarInventario — itens', () => {
  it('item novo em L entra (no fim)', () => {
    const B = inv([it_('a')]); const L = inv([it_('a'), it_('n')]); const R = inv([it_('a'), it_('r')]);
    expect(M(B, L, R).itens.map((x) => x.instanceId)).toEqual(['a', 'r', 'n']);
  });
  it('item removido em L sai', () => {
    expect(M(inv([it_('a'), it_('b')]), inv([it_('a')]), inv([it_('a'), it_('b')])).itens.map((x) => x.instanceId)).toEqual(['a']);
  });
  it('removido em R e L não mexeu: continua fora', () => {
    expect(M(inv([it_('a')]), inv([it_('a')]), inv([])).itens).toEqual([]);
  });
  it('removido em R e L mexeu: remoção remota vence', () => {
    expect(M(inv([it_('a')]), inv([it_('a', { containerId: 'x' })]), inv([])).itens).toEqual([]);
  });
  it('campo mudado só em L vale L; só em R vale R', () => {
    const B = inv([it_('a', { containerId: null, observacao: null })]);
    const L = inv([it_('a', { containerId: 'alforge', observacao: null })]);
    const R = inv([it_('a', { containerId: null, observacao: 'rachada' })]);
    expect(M(B, L, R).itens[0]).toMatchObject({ containerId: 'alforge', observacao: 'rachada' });
  });
  it('quantidade mudada nos dois lados soma as diferenças', () => {
    // L moveu as flechas para a aljava e usou 2; R (batalha) gastou 1.
    const B = inv([it_('f', { quantidade: 10 })]);
    const L = inv([it_('f', { quantidade: 8, containerId: 'aljava' })]);
    const R = inv([it_('f', { quantidade: 9 })]);
    expect(M(B, L, R).itens[0]).toMatchObject({ quantidade: 7, containerId: 'aljava' });
  });
  it('outro campo mudado nos dois lados: vale L', () => {
    const B = inv([it_('a', { observacao: null })]);
    expect(M(B, inv([it_('a', { observacao: 'L' })]), inv([it_('a', { observacao: 'R' })])).itens[0].observacao).toBe('L');
  });
  it('objeto aninhado mudado só em R (ação do veneno) vale R', () => {
    const B = inv([it_('e', { veneno: { slug: 'v', ef: 5, acoes: 15 } })]);
    const L = inv([it_('e', { veneno: { slug: 'v', ef: 5, acoes: 15 }, containerId: 'x' })]);
    const R = inv([it_('e', { veneno: { slug: 'v', ef: 5, acoes: 14 } })]);
    expect(M(B, L, R).itens[0]).toMatchObject({ veneno: { acoes: 14 }, containerId: 'x' });
  });
  it('campo apagado em L (veneno acabou) some do resultado', () => {
    const B = inv([it_('e', { veneno: { acoes: 1 } })]);
    const L = inv([it_('e')]);
    const R = inv([it_('e', { veneno: { acoes: 1 }, observacao: 'R' })]);
    const out = M(B, L, R).itens[0];
    expect(out).not.toHaveProperty('veneno');
    expect(out.observacao).toBe('R');
  });
  it('quantidade final ≤ 0 tira o item', () => {
    const B = inv([it_('p', { quantidade: 2 })]);
    expect(M(B, inv([it_('p', { quantidade: 1 })]), inv([it_('p', { quantidade: 1 })])).itens).toEqual([]);
  });
  it('mesmo item novo dos dois lados (já gravado): vale L, sem duplicar', () => {
    const out = M(inv([]), inv([it_('n', { quantidade: 3 })]), inv([it_('n', { quantidade: 3 })]));
    expect(out.itens).toEqual([it_('n', { quantidade: 3 })]);
  });
  it('LIMITE CONHECIDO: L junta pilhas e R gasta da pilha removida — a unidade volta', () => {
    // Documentado na spec (seção 1). Se este teste mudar, a spec muda junto.
    const B = inv([it_('a', { quantidade: 3 }), it_('b', { quantidade: 2 })]);
    const L = inv([it_('a', { quantidade: 5 })]);
    const R = inv([it_('a', { quantidade: 3 }), it_('b', { quantidade: 1 })]);
    expect(M(B, L, R).itens).toEqual([it_('a', { quantidade: 5 })]);
  });
});

describe('mesclarInventario — moedas', () => {
  it('soma as diferenças por moeda, nunca abaixo de 0', () => {
    const B = inv([], { ouro: 5, prata: 1, cobre: 0, latao: 0 });
    const L = inv([], { ouro: 3, prata: 1, cobre: 0, latao: 0 });
    const R = inv([], { ouro: 4, prata: 0, cobre: 2, latao: 0 });
    expect(M(B, L, R).moedas).toEqual({ ouro: 2, prata: 0, cobre: 2, latao: 0 });
    const L2 = inv([], { ouro: 0, prata: 1, cobre: 0, latao: 0 });
    expect(M(B, L2, inv([], { ouro: 1, prata: 0, cobre: 0, latao: 0 })).moedas.ouro).toBe(0);
  });
});

const pj = (itens, versao) => ({ id: 1, inventario: inv(itens), ...(versao == null ? {} : { inventario_versao: versao }) });

describe('gravarInventario', () => {
  it('sem conflito grava L como está (inclusive a ordem) e devolve a versão nova', async () => {
    const t = { personagens: [pj([it_('a'), it_('b')], 4)] };
    globalThis.supabaseClient = fakeSupabase(t);
    const B = t.personagens[0].inventario;
    const L = inv([it_('b'), it_('a')]);
    const r = await window.gravarInventario(1, { base: B, local: L, versao: 4 });
    expect(r).toMatchObject({ ok: true, gravou: true, versao: 5 });
    expect(t.personagens[0].inventario.itens.map((x) => x.instanceId)).toEqual(['b', 'a']);
  });
  it('sem diferença local não grava', async () => {
    const t = { personagens: [pj([it_('a')], 2)] };
    globalThis.supabaseClient = fakeSupabase(t);
    const B = t.personagens[0].inventario;
    const r = await window.gravarInventario(1, { base: B, local: inv([it_('a')]), versao: 2 });
    expect(r).toMatchObject({ ok: true, gravou: false, versao: 2 });
    expect(t.personagens[0].inventario_versao).toBe(2);
  });
  it('conflito: relê, mescla e grava as duas mudanças', async () => {
    const t = { personagens: [pj([it_('corda'), it_('flecha', { quantidade: 10 })], 0)] };
    globalThis.supabaseClient = fakeSupabase(t);
    const B = t.personagens[0].inventario;
    // A batalha gastou uma flecha por fora (versão vai a 1).
    await globalThis.supabaseClient.from('personagens')
      .update({ inventario: inv([it_('corda'), it_('flecha', { quantidade: 9 })]) }).eq('id', 1);
    const L = inv([it_('corda', { containerId: 'alforge' }), it_('flecha', { quantidade: 10 })]);
    const r = await window.gravarInventario(1, { base: B, local: L, versao: 0 });
    expect(r.ok).toBe(true);
    expect(t.personagens[0].inventario.itens).toEqual([
      it_('corda', { containerId: 'alforge' }), it_('flecha', { quantidade: 9 }),
    ]);
    expect(r.inventario).toEqual(t.personagens[0].inventario);
    expect(r.versao).toBe(2);
  });
  it('PJ sem a coluna de versão (vale 0) também grava', async () => {
    const t = { personagens: [pj([it_('a')])] };
    globalThis.supabaseClient = fakeSupabase(t);
    const r = await window.gravarInventario(1, { base: t.personagens[0].inventario, local: inv([]), versao: undefined });
    expect(r).toMatchObject({ ok: true, gravou: true, versao: 1 });
  });
  it('erro do banco vira { ok:false }, sem lançar', async () => {
    globalThis.supabaseClient = { from: () => { throw new Error('rede fora'); } };
    const r = await window.gravarInventario(1, { base: inv([]), local: inv([it_('a')]), versao: 0 });
    expect(r.ok).toBe(false);
    expect(r.error.message).toBe('rede fora');
  });
  it('reenvio depois de resposta perdida não conta a quantidade duas vezes', async () => {
    const t = { personagens: [pj([it_('f', { quantidade: 10 })], 0)] };
    globalThis.supabaseClient = fakeSupabase(t);
    const B = t.personagens[0].inventario;
    const L = inv([it_('f', { quantidade: 8 })]);
    // A primeira gravação chegou ao banco, mas a resposta se perdeu.
    await globalThis.supabaseClient.from('personagens').update({ inventario: L }).eq('id', 1);
    const r = await window.gravarInventario(1, { base: B, local: L, versao: 0 });
    expect(r.ok).toBe(true);
    expect(t.personagens[0].inventario.itens[0].quantidade).toBe(8);
  });
});

describe('alterarInventario', () => {
  it('aplica fn ao inventário do banco e grava', async () => {
    const t = { personagens: [pj([it_('p', { quantidade: 3 })], 7)] };
    globalThis.supabaseClient = fakeSupabase(t);
    const r = await window.alterarInventario(1, (i) => ({ ...i, itens: i.itens.map((x) => ({ ...x, quantidade: x.quantidade - 1 })) }));
    expect(r).toMatchObject({ ok: true, gravou: true, versao: 8 });
    expect(t.personagens[0].inventario.itens[0].quantidade).toBe(2);
  });
  it('fn que não muda nada não grava', async () => {
    const t = { personagens: [pj([it_('p')], 7)] };
    globalThis.supabaseClient = fakeSupabase(t);
    const r = await window.alterarInventario(1, (i) => i);
    expect(r).toMatchObject({ ok: true, gravou: false, versao: 7 });
    expect(t.personagens[0].inventario_versao).toBe(7);
  });
  it('conflito entre a leitura e a escrita: reaplica fn sobre o dado novo', async () => {
    const t = { personagens: [pj([it_('p', { quantidade: 5 })], 0)] };
    const sb = fakeSupabase(t);
    globalThis.supabaseClient = sb;
    let primeira = true;
    const r = await window.alterarInventario(1, (i) => {
      if (primeira) {
        primeira = false;
        // Outra tela gasta 2 entre a leitura e a escrita desta.
        const linha = t.personagens[0];
        t.personagens[0] = { ...linha, inventario: inv([it_('p', { quantidade: 3 })]), inventario_versao: 1 };
      }
      return { ...i, itens: i.itens.map((x) => ({ ...x, quantidade: x.quantidade - 1 })) };
    });
    expect(r.ok).toBe(true);
    expect(t.personagens[0].inventario.itens[0].quantidade).toBe(2);
  });
  it('PJ inexistente vira erro', async () => {
    globalThis.supabaseClient = fakeSupabase({ personagens: [] });
    const r = await window.alterarInventario(1, (i) => i);
    expect(r.ok).toBe(false);
  });
});

describe('criarGravadorInventario', () => {
  it('duas gravações do mesmo PJ em voo não contam a quantidade duas vezes', async () => {
    const t = { personagens: [pj([it_('f', { quantidade: 10 })], 0)] };
    const fake = fakeSupabase(t);
    // Trava a PRIMEIRA escrita em 'personagens' logo que ela começa (quando
    // alguém dá await nela), pra garantir que a 2ª alteração e o 2º salvar
    // aconteçam com a 1ª escrita genuinamente em voo — não só enfileirados
    // antes de qualquer microtask rodar.
    let liberarPrimeiraEscrita;
    const primeiraEscritaLiberada = new Promise((r) => { liberarPrimeiraEscrita = r; });
    let sinalizarInicio;
    const primeiraEscritaComecou = new Promise((r) => { sinalizarInicio = r; });
    const enviados = [];
    let travarProxima = true;
    globalThis.supabaseClient = {
      ...fake,
      from: (nome) => {
        const tabela = fake.from(nome);
        if (nome !== 'personagens') return tabela;
        return {
          ...tabela,
          update: (campos) => {
            const b = tabela.update(campos);
            if (!travarProxima) return b;
            travarProxima = false;
            enviados.push(campos.inventario);
            const thenReal = b.then;
            b.then = (res, rej) => {
              sinalizarInicio();
              return primeiraEscritaLiberada.then(() => thenReal(res, rej));
            };
            return b;
          },
        };
      },
    };
    const g = window.criarGravadorInventario();
    g.carregar(1, t.personagens[0].inventario, 0);
    g.alterar(1, inv([it_('f', { quantidade: 8 })]));     // usou 2
    const p1 = g.salvar(1);                                 // autosave; trava na 1ª escrita
    await primeiraEscritaComecou;                           // espera a 1ª escrita realmente começar
    g.alterar(1, inv([it_('f', { quantidade: 7 })]));     // usou mais 1 enquanto a 1ª gravava
    const p2 = g.salvar(1);                                 // flush ao sair, atrás na fila
    liberarPrimeiraEscrita();                                // libera a 1ª escrita
    await Promise.all([p1, p2]);
    expect(enviados[0].itens[0].quantidade).toBe(8);        // a 1ª escrita mandou 8, não 7
    expect(t.personagens[0].inventario.itens[0].quantidade).toBe(7);
    expect(g.sujo(1)).toBe(false);
  });

  it('o que mudou por fora aparece no local depois de gravar', async () => {
    const t = { personagens: [pj([it_('corda'), it_('f', { quantidade: 10 })], 0)] };
    globalThis.supabaseClient = fakeSupabase(t);
    const g = window.criarGravadorInventario();
    g.carregar(1, t.personagens[0].inventario, 0);
    await globalThis.supabaseClient.from('personagens')
      .update({ inventario: inv([it_('corda'), it_('f', { quantidade: 9 })]) }).eq('id', 1);
    g.alterar(1, inv([it_('corda', { containerId: 'alforge' }), it_('f', { quantidade: 10 })]));
    const r = await g.salvar(1);
    expect(r.ok).toBe(true);
    expect(g.atual(1).itens).toEqual([it_('corda', { containerId: 'alforge' }), it_('f', { quantidade: 9 })]);
  });

  it('sem mudança local, salvar não grava', async () => {
    const t = { personagens: [pj([it_('a')], 3)] };
    globalThis.supabaseClient = fakeSupabase(t);
    const g = window.criarGravadorInventario();
    g.carregar(1, t.personagens[0].inventario, 3);
    const r = await g.salvar(1);
    expect(r).toMatchObject({ ok: true, gravou: false });
    expect(t.personagens[0].inventario_versao).toBe(3);
  });

  it('falha numa gravação não trava a fila', async () => {
    let falhar = true;
    const t = { personagens: [pj([it_('a')], 0)] };
    const fake = fakeSupabase(t);
    globalThis.supabaseClient = { ...fake, from: (n) => { if (falhar) { falhar = false; throw new Error('rede'); } return fake.from(n); } };
    const g = window.criarGravadorInventario();
    g.carregar(1, t.personagens[0].inventario, 0);
    g.alterar(1, inv([]));
    expect((await g.salvar(1)).ok).toBe(false);
    expect(g.sujo(1)).toBe(true);
    expect((await g.salvar(1)).ok).toBe(true);
    expect(t.personagens[0].inventario.itens).toEqual([]);
  });
});

describe('criarGravadorInventario — resposta perdida (02/10/2026)', () => {
  // A escrita chega ao banco, mas o cliente recebe erro de rede. A próxima
  // gravação não pode mesclar contra a base velha: contaria a mudança de novo.
  function falharRespostaDaPrimeiraEscrita(fake) {
    let falhar = true;
    return {
      ...fake,
      from: (nome) => {
        const tabela = fake.from(nome);
        if (nome !== 'personagens') return tabela;
        return {
          ...tabela,
          update: (campos) => {
            const b = tabela.update(campos);
            if (!falhar) return b;
            falhar = false;
            const thenReal = b.then;
            b.then = (res, rej) => thenReal((x) => x)
              .then(() => ({ data: null, error: new Error('rede') }))
              .then(res, rej);
            return b;
          },
        };
      },
    };
  }

  it('gravou mas a resposta se perdeu; a edição seguinte não conta a quantidade duas vezes', async () => {
    const t = { personagens: [pj([it_('f', { quantidade: 10 })], 0)] };
    globalThis.supabaseClient = falharRespostaDaPrimeiraEscrita(fakeSupabase(t));
    const g = window.criarGravadorInventario();
    g.carregar(1, t.personagens[0].inventario, 0);
    g.alterar(1, inv([it_('f', { quantidade: 8 })]));     // usou 2
    expect((await g.salvar(1)).ok).toBe(false);            // chegou ao banco, a resposta não
    expect(t.personagens[0].inventario.itens[0].quantidade).toBe(8);
    g.alterar(1, inv([it_('f', { quantidade: 7 })]));     // usou mais 1
    const r = await g.salvar(1);
    expect(r.ok).toBe(true);
    expect(t.personagens[0].inventario.itens[0].quantidade).toBe(7);
    expect(g.sujo(1)).toBe(false);
  });

  it('a escrita que falhou não chegou e o banco mudou por fora: mescla normal', async () => {
    const t = { personagens: [pj([it_('f', { quantidade: 10 })], 0)] };
    const fake = fakeSupabase(t);
    let falhar = true;
    globalThis.supabaseClient = { ...fake, from: (n) => { if (falhar) { falhar = false; throw new Error('rede'); } return fake.from(n); } };
    const g = window.criarGravadorInventario();
    g.carregar(1, t.personagens[0].inventario, 0);
    g.alterar(1, inv([it_('f', { quantidade: 8 })]));
    expect((await g.salvar(1)).ok).toBe(false);            // não chegou
    // A batalha gasta 1 por fora.
    await fake.from('personagens').update({ inventario: inv([it_('f', { quantidade: 9 })]) }).eq('id', 1);
    const r = await g.salvar(1);
    expect(r.ok).toBe(true);
    expect(t.personagens[0].inventario.itens[0].quantidade).toBe(7);
  });

  it('se a releitura falhar, não grava', async () => {
    const t = { personagens: [pj([it_('f', { quantidade: 10 })], 0)] };
    const fake = fakeSupabase(t);
    globalThis.supabaseClient = falharRespostaDaPrimeiraEscrita(fake);
    const g = window.criarGravadorInventario();
    g.carregar(1, t.personagens[0].inventario, 0);
    g.alterar(1, inv([it_('f', { quantidade: 8 })]));
    expect((await g.salvar(1)).ok).toBe(false);
    g.alterar(1, inv([it_('f', { quantidade: 7 })]));
    globalThis.supabaseClient = { ...fake, from: () => { throw new Error('fora do ar'); } };
    expect((await g.salvar(1)).ok).toBe(false);
    expect(t.personagens[0].inventario.itens[0].quantidade).toBe(8);
    // De volta: ainda reconhece a escrita perdida e não conta duas vezes.
    globalThis.supabaseClient = fake;
    expect((await g.salvar(1)).ok).toBe(true);
    expect(t.personagens[0].inventario.itens[0].quantidade).toBe(7);
  });
});
