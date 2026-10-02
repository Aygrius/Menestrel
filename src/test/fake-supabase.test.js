// src/test/fake-supabase.test.js
import { describe, it, expect } from 'vitest';
import { fakeSupabase } from './fake-supabase.js';

describe('fakeSupabase — update com trava de versão', () => {
  it('update com .eq encadeado e .select devolve as linhas afetadas', async () => {
    const t = { personagens: [{ id: 1, inventario: { itens: [] } }] };
    const sb = fakeSupabase(t);
    const r = await sb.from('personagens').update({ inventario: { itens: [{ instanceId: 'a' }] } })
      .eq('id', 1).eq('inventario_versao', 0).select('inventario, inventario_versao');
    expect(r.data).toHaveLength(1);
    expect(r.data[0].inventario_versao).toBe(1);
    expect(t.personagens[0].inventario_versao).toBe(1);
  });

  it('versão diferente não grava nada', async () => {
    const t = { personagens: [{ id: 1, inventario: { itens: [] }, inventario_versao: 3 }] };
    const sb = fakeSupabase(t);
    const r = await sb.from('personagens').update({ inventario: { itens: [{ instanceId: 'a' }] } })
      .eq('id', 1).eq('inventario_versao', 2).select('inventario, inventario_versao');
    expect(r.data).toEqual([]);
    expect(t.personagens[0].inventario.itens).toEqual([]);
  });

  it('cliente não consegue mexer na versão; inventário igual não incrementa', async () => {
    const t = { personagens: [{ id: 1, inventario: { itens: [] }, inventario_versao: 5 }] };
    const sb = fakeSupabase(t);
    await sb.from('personagens').update({ inventario_versao: 99 }).eq('id', 1);
    expect(t.personagens[0].inventario_versao).toBe(5);
    await sb.from('personagens').update({ inventario: { itens: [] } }).eq('id', 1);
    expect(t.personagens[0].inventario_versao).toBe(5);
  });

  it('update solto, sem await nem then, não grava (como o supabase-js)', () => {
    const t = { personagens: [{ id: 1, inventario: { itens: [] } }] };
    fakeSupabase(t).from('personagens').update({ inventario: { itens: [{ instanceId: 'a' }] } }).eq('id', 1);
    expect(t.personagens[0].inventario.itens).toEqual([]);
  });
});
