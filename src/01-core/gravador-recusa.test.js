/* ============================================================
   gravador-recusa.test.js — auditoria 13/11/2026, item 14
   ============================================================
   O Mestre dava um item que estourava a carga: a tela dizia "Entregue", o
   gravador recusava (carga_maxima) e a cópia local continuava com o item.
   Como ela nunca mais batia com o banco, toda gravação seguinte levava o item
   junto e era recusada de novo — em silêncio, porque o "Falha ao salvar" está
   comentado. Agora: a recusa definitiva devolve a tela ao que o banco tem
   (gravador.descartar), a falha vira aviso, e a carga é conferida antes de
   aplicar (setInv e darItem).
   ============================================================ */
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import './helpers.jsx';
import './inventario-helpers.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

const stubOriginal = globalThis.supabaseClient;
const bauOriginal = window.bauEstourou;
afterEach(() => { globalThis.supabaseClient = stubOriginal; window.bauEstourou = bauOriginal; });

const it_ = (instanceId, extra) => ({ instanceId, slug: instanceId, quantidade: 1, containerId: null, ...extra });
const inv = (itens) => ({ moedas: { ouro: 0, prata: 0, cobre: 0, latao: 0 }, itens });

describe('recusaDefinitiva', () => {
  it('carga máxima e baú cheio são definitivas; rede não', () => {
    const e = (motivo) => Object.assign(new Error('x'), { motivo });
    expect(window.recusaDefinitiva(e('carga_maxima'))).toBe(true);
    expect(window.recusaDefinitiva(e('inventario_cheio'))).toBe(true);
    expect(window.recusaDefinitiva(new Error('rede'))).toBe(false);
    expect(window.recusaDefinitiva(null)).toBe(false);
  });
});

describe('o gravador depois de uma recusa definitiva', () => {
  it('descartar volta à base; a mudança seguinte grava normalmente', async () => {
    const t = { personagens: [{ id: 1, inventario: inv([it_('corda')]), inventario_versao: 3 }] };
    globalThis.supabaseClient = fakeSupabase(t);
    const g = window.criarGravadorInventario();
    const base = t.personagens[0].inventario;
    g.carregar(1, base, 3);

    // O Mestre "dá" a bigorna e a gravação é recusada na tela.
    window.bauEstourou = () => true;
    g.alterar(1, inv([it_('corda'), it_('bigorna')]));
    const r1 = await g.salvar(1);
    expect(r1.ok).toBe(false);
    expect(window.recusaDefinitiva(r1.error)).toBe(true);
    expect(t.personagens[0].inventario.itens.map((x) => x.instanceId)).toEqual(['corda']);

    // A tela descarta: nada mais fica sujo levando a bigorna junto.
    expect(g.descartar(1)).toBe(base);
    expect(g.sujo(1)).toBe(false);

    // A próxima mudança (sem a bigorna) grava.
    window.bauEstourou = bauOriginal;
    g.alterar(1, inv([it_('corda', { observacao: 'gasta' })]));
    const r2 = await g.salvar(1);
    expect(r2).toMatchObject({ ok: true, gravou: true });
    expect(t.personagens[0].inventario.itens[0].observacao).toBe('gasta');
  });

  it('SEM descartar, o defeito antigo: a recusa se repete em toda gravação', async () => {
    const t = { personagens: [{ id: 1, inventario: inv([it_('corda')]), inventario_versao: 3 }] };
    globalThis.supabaseClient = fakeSupabase(t);
    const g = window.criarGravadorInventario();
    g.carregar(1, t.personagens[0].inventario, 3);
    window.bauEstourou = (a, d) => (d || []).some((x) => x.instanceId === 'bigorna');
    g.alterar(1, inv([it_('corda'), it_('bigorna')]));
    await g.salvar(1);
    g.alterar(1, inv([it_('corda', { observacao: 'gasta' }), it_('bigorna')]));
    expect((await g.salvar(1)).ok).toBe(false);
  });
});

describe('a tela do inventário (fonte)', () => {
  const fonte = fs.readFileSync(path.resolve(__dirname, '../07-inventario/inventario.jsx'), 'utf8');
  const corpo = (inicio, tam) => fonte.slice(fonte.indexOf(inicio), fonte.indexOf(inicio) + tam);
  it('setInv barra a carga estourada antes de aplicar', () => {
    expect(corpo('const setInv = React.useCallback', 1200)).toMatch(/window\.cargaEstourouCom\(cur\.itens, novo\.itens/);
  });
  it('dar item confere a carga ANTES do "Entregue" e do aviso à mesa', () => {
    const c = corpo('const darItem = (slug, qtd) => {', 2400);
    const carga = c.indexOf('window.cargaEstourouCom(');
    expect(carga).toBeGreaterThan(0);
    expect(carga).toBeLessThan(c.indexOf("'Entregue: '"));
    expect(carga).toBeLessThan(c.indexOf('registrarEventoMesa('));
  });
  it('a recusa definitiva descarta a cópia e avisa; a de rede só avisa', () => {
    const c = corpo('const aplicarGravacao = (pjId, r) => {', 1800);
    expect(c).toMatch(/if \(definitiva\) \{[\s\S]*?gravadorRef\.current\.descartar\(pjId\)/);
    expect(c).toMatch(/avisoGravacaoRef\.current\(texto, 'recusa'\)/);
  });
});
