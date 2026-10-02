# Inventário com mescla e trava de versão — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Duas mudanças no inventário do mesmo PJ, feitas perto uma da outra, valem as duas — sem aviso e sem item sumindo ou voltando.

**Architecture:** Coluna `personagens.inventario_versao` mantida por gatilho. Toda gravação de inventário feita pelo cliente vira compare-and-swap (`.eq('inventario_versao', v)`); em conflito, relê e refaz — por mescla de três vias (telas que seguram cópia) ou reaplicando a mudança (batalha). A tela de Inventário grava por um "gravador" por PJ, que serializa as gravações da aba e rebaseia o que mudou durante cada uma.

**Tech Stack:** React 19 (arquivos de fase `.jsx` com globais no `window`), supabase-js v2, Postgres 17 (Supabase), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-02-inventario-concorrencia-design.md`

## Global Constraints

- Arquivos de fase expõem funções com `Object.assign(window, { ... })` no fim do arquivo e se usam como globais — siga esse padrão.
- Consultas do supabase-js só vão ao servidor com `await` ou `.then()`. Nunca deixe um `update(...)` solto.
- Comentários em português, datados quando explicam uma decisão (`(02/10/2026)`), na densidade do arquivo ao redor.
- Commits direto na `main` (preferência do usuário), terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `git add` só dos arquivos da task — a árvore tem outras mudanças do usuário.
- Testes: `npx vitest run <arquivo>`; suíte: `npx vitest run`; lint: `npx eslint .`; tipos: `npx tsc -b`.
- RPCs existentes e políticas RLS **não** mudam.
- Ordem de entrega: migração no banco (Task 1) antes de qualquer código que use `inventario_versao`.

## Review Focus

1. **Duas gravações da mesma aba em voo** (autosave + flush ao trocar de PJ): a quantidade não pode ser contada duas vezes — teste na Task 5 (`gravador`).
2. **PJ carregado sem `inventario_versao`** (linha antiga em cache, teste sem a coluna): vale 0, e um conflito resolve por mescla — teste na Task 3 (versão ausente).
3. **Mudança local que só reordena itens** sem conflito: a ordem local é gravada (só a mescla usa a ordem de R) — teste na Task 3 (primeira tentativa grava L como está).
4. **`fn` da batalha que não muda nada** (sem animal morto daquele dono): não grava e não incrementa versão — teste na Task 3.
5. **Rebase não pode entrar em laço de autosave**: depois de gravar sem mudança de fora, a tela não recebe `setInv` novo — teste na Task 6 (contagem de gravações).

---

### Task 1: Migração — coluna e gatilho de versão

**Files:**
- Create: `scripts/sql/inventario-versao-2026-10-02.sql`

**Interfaces:**
- Produces: coluna `public.personagens.inventario_versao bigint not null default 0`, incrementada pelo gatilho `personagens_inventario_versao` sempre que `inventario` muda; nunca alterável pelo cliente.

- [ ] **Step 1: Escrever o script**

```sql
-- inventario-versao-2026-10-02.sql
-- Trava de versão do inventário (02/10/2026).
-- Spec: docs/superpowers/specs/2026-10-02-inventario-concorrencia-design.md
--
-- O cliente grava com .eq('inventario_versao', v): se outra tela gravou no
-- meio, zero linhas voltam e ele relê e mescla. O gatilho roda em TODO update
-- (não só OF inventario), senão um update só da versão a falsificaria.
-- Roda depois de personagens_inventario_sem_orfaos (ordem alfabética dos
-- gatilhos BEFORE), então compara o inventário já limpo.
--
-- REVERTER:
--   drop trigger if exists personagens_inventario_versao on public.personagens;
--   drop function if exists public._menestrel_inventario_versao();
--   alter table public.personagens drop column if exists inventario_versao;

alter table public.personagens
  add column if not exists inventario_versao bigint not null default 0;

create or replace function public._menestrel_inventario_versao()
returns trigger language plpgsql set search_path to 'public', 'pg_catalog' as $$
begin
  if new.inventario is distinct from old.inventario then
    new.inventario_versao := old.inventario_versao + 1;
  else
    new.inventario_versao := old.inventario_versao;
  end if;
  return new;
end $$;

drop trigger if exists personagens_inventario_versao on public.personagens;
create trigger personagens_inventario_versao
  before update on public.personagens
  for each row execute function public._menestrel_inventario_versao();
```

- [ ] **Step 2: Testar em produção dentro de uma transação desfeita**

Pelo MCP `mcp__supabase-write__execute_sql`, numa única chamada: `begin;` + o script inteiro + o bloco abaixo + `rollback;`. O bloco usa `assert`, então qualquer falha aborta com erro.

```sql
do $$
declare v_id bigint; v bigint;
begin
  select id into v_id from public.personagens order by id limit 1;
  update public.personagens set inventario = inventario where id = v_id returning inventario_versao into v;
  assert v = 0, 'inventario igual não deve incrementar: ' || v;
  update public.personagens set inventario = coalesce(inventario, '{}'::jsonb) || '{"_t":1}'::jsonb where id = v_id returning inventario_versao into v;
  assert v = 1, 'inventario mudado deve ir a 1: ' || v;
  update public.personagens set inventario_versao = 99 where id = v_id returning inventario_versao into v;
  assert v = 1, 'cliente não pode mexer na versão: ' || v;
  update public.personagens set estado_atual = estado_atual where id = v_id returning inventario_versao into v;
  assert v = 1, 'update de outra coluna mantém a versão: ' || v;
end $$;
```

Expected: a chamada termina sem erro. Depois confira que nada ficou: `select count(*) from information_schema.columns where table_name='personagens' and column_name='inventario_versao';` → `0`.

- [ ] **Step 3: Aplicar de verdade**

`mcp__supabase-write__apply_migration` com `name: "inventario_versao"` e o conteúdo do script (sem o bloco de teste). Conferir:
`select column_name, column_default from information_schema.columns where table_name='personagens' and column_name='inventario_versao';` → `0`.
`select tgname from pg_trigger where tgrelid='public.personagens'::regclass and tgname='personagens_inventario_versao';` → 1 linha.
Rodar `mcp__supabase-write__get_advisors` (security) e confirmar que `_menestrel_inventario_versao` **não** aparece em `function_search_path_mutable`.

- [ ] **Step 4: Commit**

```bash
git add scripts/sql/inventario-versao-2026-10-02.sql
git commit -m "feat(db): inventario_versao com gatilho para gravação com trava

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `fakeSupabase` simula a versão e o update com retorno

**Files:**
- Modify: `src/test/fake-supabase.js` (o `update` dentro de `from:`; o cabeçalho de documentação)
- Test: `src/test/fake-supabase.test.js` (novo)

**Interfaces:**
- Produces: `from(t).update(campos).eq(c, v)[.eq(...)][.select(cols)]` awaitable → `{ data: linhasAfetadas | null, error: null, count }`. Em `personagens`, imita o gatilho da Task 1; filtro por `inventario_versao` trata ausência como 0.

- [ ] **Step 1: Teste que falha**

```js
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/fake-supabase.test.js`
Expected: FAIL — `.eq(...).eq is not a function` / `.select is not a function`.

- [ ] **Step 3: Implementar**

Em `src/test/fake-supabase.js`, troque o bloco `update: (campos) => ({ eq: (col, val) => ({ then: ... }) }),` por:

```js
      // update(campos).eq(...)[.eq(...)][.select(cols)] — grava NA TABELA em
      // memória quando consumido (await/.then), como o supabase-js. Em
      // `personagens` imita o gatilho personagens_inventario_versao
      // (scripts/sql/inventario-versao-2026-10-02.sql): a versão sobe quando o
      // inventário muda e o cliente nunca a escolhe. Coluna ausente vale 0,
      // como o default do banco.
      update: (campos) => {
        const filtros = [];
        let comRetorno = false;
        const valorDe = (linha, col) => (nome === 'personagens' && col === 'inventario_versao'
          ? (Number(linha[col]) || 0) : linha[col]);
        const b = {
          eq(col, val) { filtros.push([col, val]); return b; },
          select() { comRetorno = true; return b; },
          then: (res, rej) => {
            const linhas = linhasDe(nome);
            const afetadas = [];
            for (let i = 0; i < linhas.length; i++) {
              if (!filtros.every(([c, v]) => valorDe(linhas[i], c) === v)) continue;
              const antes = linhas[i];
              const depois = { ...antes, ...campos };
              if (nome === 'personagens') {
                const v = Number(antes.inventario_versao) || 0;
                depois.inventario_versao = JSON.stringify(depois.inventario) !== JSON.stringify(antes.inventario) ? v + 1 : v;
              }
              linhas[i] = depois;
              afetadas.push(depois);
            }
            return Promise.resolve({ data: comRetorno ? afetadas : null, error: null, count: afetadas.length }).then(res, rej);
          },
        };
        return b;
      },
```

No cabeçalho do arquivo, depois da linha do `.range`, acrescente:

```
     from(t).update(campos).eq(..)[.eq(..)][.select()]
                                            → grava ao ser consumido; em
                                              personagens imita o gatilho
                                              de inventario_versao
```

- [ ] **Step 4: Rodar o teste e a suíte**

Run: `npx vitest run src/test/fake-supabase.test.js` → PASS (4).
Run: `npx vitest run` → tudo passa. Se algum teste comparar uma linha inteira de `personagens` com `toEqual` e falhar só por causa de `inventario_versao`, ajuste a expectativa daquele teste para incluir `inventario_versao` (é o comportamento novo do banco), sem mexer no código de produção.

- [ ] **Step 5: Commit**

```bash
git add src/test/fake-supabase.js src/test/fake-supabase.test.js
git commit -m "test: fakeSupabase com update encadeado e versão do inventário

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `mesclarInventario`, `gravarInventario`, `alterarInventario`

**Files:**
- Create: `src/01-core/inventario-concorrencia.jsx`
- Modify: `src/01-core/inventario-helpers.jsx` (primeira linha de código: import do arquivo novo)
- Test: `src/01-core/inventario-concorrencia.test.js` (novo)

**Interfaces:**
- Consumes: `supabaseClient` (global), fake da Task 2.
- Produces (no `window`):
  - `mesmoValor(a, b) → boolean` — igualdade profunda; `null` e `undefined` iguais; ignora ordem de chaves.
  - `mesclarInventario(base, local, remoto) → inventario` — regras da spec, seção 1.
  - `gravarInventario(pjId, { base, local, versao }) → Promise<{ ok: true, inventario, versao, gravou } | { ok: false, error }>`
  - `alterarInventario(pjId, fn) → Promise<mesmo formato>`; `fn(inventario) → novoInventario | mesmo objeto | null`.

- [ ] **Step 1: Testes que falham**

```js
// src/01-core/inventario-concorrencia.test.js
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/01-core/inventario-concorrencia.test.js`
Expected: FAIL — `window.mesclarInventario is not a function`.

- [ ] **Step 3: Implementar**

Criar `src/01-core/inventario-concorrencia.jsx`:

```js
/* ============================================================
   inventario-concorrencia.jsx — várias telas, o mesmo inventário (02/10/2026)
   ============================================================
   personagens.inventario é um JSONB gravado inteiro pela tela de Inventário,
   pela Ficha e pela batalha. Quem segurava cópia antiga gravava por cima do
   que mudou por fora (a flecha gasta "voltava").

   Agora toda gravação do cliente é compare-and-swap em inventario_versao
   (gatilho em scripts/sql/inventario-versao-2026-10-02.sql). Em conflito:
     • gravarInventario (quem segura cópia): relê e grava a MESCLA de três
       vias — o que esta tela mudou desde a base, por cima do banco atual;
     • alterarInventario (mudança pontual, a batalha): relê e reaplica a fn.

   Spec: docs/superpowers/specs/2026-10-02-inventario-concorrencia-design.md
   ============================================================ */

const TENTATIVAS_INVENTARIO = 3;
const COLS_INVENTARIO = 'inventario, inventario_versao';

// Igualdade profunda: null e undefined iguais, ordem das chaves não importa.
function mesmoValor(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => mesmoValor(x, b[i]));
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!mesmoValor(a[k], b[k])) return false;
  }
  return true;
}

/* Um item que os dois lados têm: parte de R e recebe só os campos que L
   mudou desde B. Quantidade mexida dos dois lados soma as diferenças; outro
   campo mexido dos dois lados fica com L (a intenção mais recente da tela). */
function mesclarItem(b, l, r) {
  const out = { ...r };
  for (const k of new Set([...Object.keys(b), ...Object.keys(l)])) {
    if (mesmoValor(b[k], l[k])) continue;
    if (k === 'quantidade' && !mesmoValor(b[k], r[k])) {
      out[k] = (Number(r[k]) || 0) + (Number(l[k]) || 0) - (Number(b[k]) || 0);
    } else if (l[k] === undefined) {
      delete out[k];
    } else {
      out[k] = l[k];
    }
  }
  return out;
}

/* Mescla de três vias: B = base (o banco quando L foi derivado), L = local,
   R = remoto (o banco agora). Remoção remota vence; item com quantidade ≤ 0
   sai; ordem de R, com os novos de L no fim.
   LIMITE CONHECIDO: se L junta duas pilhas e R gasta da pilha que L removeu,
   essa unidade volta (spec, seção 1). */
function mesclarInventario(base, local, remoto) {
  const B = base || {};
  const L = local || {};
  const R = remoto || {};
  const lista = (x) => (Array.isArray(x.itens) ? x.itens : []).filter(Boolean);
  const mB = new Map(lista(B).map((it) => [it.instanceId, it]));
  const mL = new Map(lista(L).map((it) => [it.instanceId, it]));
  const vivo = (it) => !(it.quantidade != null && Number(it.quantidade) <= 0);
  const itens = [];
  const vistos = new Set();
  lista(R).forEach((r) => {
    vistos.add(r.instanceId);
    const b = mB.get(r.instanceId);
    const l = mL.get(r.instanceId);
    if (b && !l) return;                       // L removeu
    const item = b ? mesclarItem(b, l, r) : (l || r);
    if (vivo(item)) itens.push(item);
  });
  lista(L).forEach((l) => {
    if (vistos.has(l.instanceId) || mB.has(l.instanceId)) return;   // já tratado, ou R removeu
    if (vivo(l)) itens.push(l);
  });
  const out = { ...R, itens };
  if (B.moedas || L.moedas || R.moedas) {
    const mb = B.moedas || {};
    const ml = L.moedas || {};
    const moedas = { ...(R.moedas || {}) };
    for (const k of new Set([...Object.keys(mb), ...Object.keys(ml)])) {
      const delta = (Number(ml[k]) || 0) - (Number(mb[k]) || 0);
      if (delta !== 0) moedas[k] = Math.max(0, (Number(moedas[k]) || 0) + delta);
    }
    out.moedas = moedas;
  }
  return out;
}

async function lerInventarioComVersao(pjId) {
  const { data, error } = await supabaseClient
    .from('personagens').select(COLS_INVENTARIO).eq('id', pjId).maybeSingle();
  if (error) return { error };
  if (!data) return { error: new Error('Personagem não encontrado.') };
  return { inventario: data.inventario || {}, versao: Number(data.inventario_versao) || 0 };
}

// Grava só se o banco ainda está na `versao`. Zero linhas = alguém gravou no meio.
async function gravarSeVersao(pjId, inventario, versao) {
  const { data, error } = await supabaseClient
    .from('personagens').update({ inventario })
    .eq('id', pjId).eq('inventario_versao', Number(versao) || 0)
    .select(COLS_INVENTARIO);
  if (error) return { error };
  const linha = Array.isArray(data) ? data[0] : data;
  if (!linha) return { conflito: true };
  return { ok: true, inventario: linha.inventario || inventario, versao: Number(linha.inventario_versao) || 0 };
}

const erroDe = (e) => (e instanceof Error ? e : new Error((e && e.message) || String(e)));

/* Para quem segura cópia (Inventário, Ficha). `local` foi derivado de `base`,
   que o banco tinha na `versao`. Sem diferença, não grava. */
async function gravarInventario(pjId, { base, local, versao } = {}) {
  if (!pjId) return { ok: false, error: new Error('Sem personagem.') };
  if (mesmoValor(base, local)) return { ok: true, inventario: local, versao: Number(versao) || 0, gravou: false };
  try {
    let alvo = local;
    let v = versao;
    for (let i = 0; i < TENTATIVAS_INVENTARIO; i++) {
      const r = await gravarSeVersao(pjId, alvo, v);
      if (r.error) return { ok: false, error: erroDe(r.error) };
      if (r.ok) return { ...r, gravou: true };
      const atual = await lerInventarioComVersao(pjId);
      if (atual.error) return { ok: false, error: erroDe(atual.error) };
      alvo = mesclarInventario(base, local, atual.inventario);
      v = atual.versao;
    }
    return { ok: false, error: new Error('O inventário mudou várias vezes seguidas; tente de novo.') };
  } catch (e) {
    return { ok: false, error: erroDe(e) };
  }
}

/* Para mudança pontual (a batalha): lê, aplica `fn`, grava com a trava; em
   conflito, reaplica sobre o dado novo. `fn` que devolve o mesmo objeto (ou
   null) = nada a gravar. */
async function alterarInventario(pjId, fn) {
  if (!pjId) return { ok: false, error: new Error('Sem personagem.') };
  try {
    for (let i = 0; i < TENTATIVAS_INVENTARIO; i++) {
      const atual = await lerInventarioComVersao(pjId);
      if (atual.error) return { ok: false, error: erroDe(atual.error) };
      const novo = fn(atual.inventario);
      if (!novo || novo === atual.inventario) {
        return { ok: true, inventario: atual.inventario, versao: atual.versao, gravou: false };
      }
      const r = await gravarSeVersao(pjId, novo, atual.versao);
      if (r.error) return { ok: false, error: erroDe(r.error) };
      if (r.ok) return { ...r, gravou: true };
    }
    return { ok: false, error: new Error('O inventário mudou várias vezes seguidas; tente de novo.') };
  } catch (e) {
    return { ok: false, error: erroDe(e) };
  }
}

Object.assign(window, { mesmoValor, mesclarInventario, gravarInventario, alterarInventario });
```

Em `src/01-core/inventario-helpers.jsx`, logo depois do bloco de comentário do topo (antes da primeira declaração), acrescentar:

```js
// Mescla e trava de versão do inventário (02/10/2026). Importado daqui para
// chegar a todo mundo que já importa os helpers (app e testes).
import './inventario-concorrencia.jsx';
```

- [ ] **Step 4: Rodar**

Run: `npx vitest run src/01-core/inventario-concorrencia.test.js` → PASS.
Run: `npx vitest run` → tudo passa.

- [ ] **Step 5: Commit**

```bash
git add src/01-core/inventario-concorrencia.jsx src/01-core/inventario-concorrencia.test.js src/01-core/inventario-helpers.jsx
git commit -m "feat(inventario): mescla de três vias e gravação com trava de versão

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Batalha grava pelo `alterarInventario`

**Files:**
- Modify: `src/12-batalha/batalha.jsx` — `consumirItemDoPJ` (~linha 1950-1975), ramo do veneno em `gastarMunicaoEVeneno` (~2039-2048), `gravarSaqueNoPj` (~6335), remoção de animais mortos no encerramento (~7851-7862)
- Test: `src/12-batalha/consumo-item.test.js`

**Interfaces:**
- Consumes: `alterarInventario(pjId, fn)` (Task 3).
- Produces: assinaturas inalteradas — `consumirItemDoPJ(pjId, slug, qtd) → { ok, inventario } | { ok:false, error }`; `gravarSaqueNoPj(pjId, slug, qtd) → { error }`.

- [ ] **Step 1: Testes que falham**

Acrescentar em `src/12-batalha/consumo-item.test.js`, dentro do `describe('consumirItemDoPJ', ...)`:

```js
  it('grava com a trava de versão: outra escrita no meio é reaplicada, não perdida', async () => {
    const tabelas = { personagens: [{ ...pjCom([poc('a', 5)]), inventario_versao: 0 }] };
    const fake = fakeSupabase(tabelas);
    // Entre a leitura e a escrita desta baixa, outra tela gasta 2 (versão vai a 1).
    const fromOriginal = fake.from;
    let interferiu = false;
    fake.from = (nome) => {
      const t = fromOriginal(nome);
      const upd = t.update;
      t.update = (campos) => {
        if (!interferiu) {
          interferiu = true;
          tabelas.personagens[0] = { ...pjCom([poc('a', 3)]), inventario_versao: 1 };
        }
        return upd(campos);
      };
      return t;
    };
    globalThis.supabaseClient = fake;
    const r = await M().consumirItemDoPJ(1, 'pocao', 1);
    expect(r.ok).toBe(true);
    expect(tabelas.personagens[0].inventario.itens).toEqual([poc('a', 2)]);
  });
```

E no `describe('os dois lados usam a função', ...)`, acrescentar:

```js
  it('ninguém na batalha grava o inventário sem a trava', () => {
    expect(fonte).not.toMatch(/\.update\(\{\s*inventario:/);
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/12-batalha/consumo-item.test.js`
Expected: FAIL — o teste da trava termina com `poc('a', 4)` (sobrescreveu a escrita do meio) e o da fonte acha `.update({ inventario:`.

- [ ] **Step 3: Implementar**

`consumirItemDoPJ` inteiro passa a ser (e o comentário acima dele perde o parágrafo "⚠️ Ainda é read-then-write..."; no lugar, uma linha: `Grava com a trava de versão (alterarInventario, 02/10/2026): escrita simultânea é reaplicada, não perdida.`):

```js
async function consumirItemDoPJ(pjId, slug, qtd) {
  const r = await alterarInventario(pjId, (inv) => ({ ...inv, itens: consumirDoInventario(inv.itens || [], slug, qtd) }));
  return r.ok ? { ok: true, inventario: r.inventario } : { ok: false, error: r.error };
}
```

Ramo do veneno em `gastarMunicaoEVeneno` (substitui do `const { data, error } = await supabaseClient` até `atualizarCache(novoInv);`):

```js
  if (arma.veneno && arma.instanceId && typeof gastarAcaoDoVeneno === 'function') {
    const r = await alterarInventario(ator.ref_id, (inv) => ({ ...inv, itens: gastarAcaoDoVeneno(inv.itens || [], arma.instanceId) }));
    if (!r.ok) { console.error('[batalha] gasto do veneno falhou:', r.error); return; }
    atualizarCache(r.inventario);
  }
```

E no comentário acima de `gastarMunicaoEVeneno`, trocar "Mesma escrita relida de consumirItemDoPJ" por "Mesma escrita com trava de consumirItemDoPJ".

`gravarSaqueNoPj` (e seu comentário: "lê a linha agora (não a cópia da tela), soma e grava" → "soma no inventário do banco e grava com a trava de versão"):

```js
async function gravarSaqueNoPj(pjId, slug, qtd) {
  const r = await alterarInventario(pjId, (inv) => adicionarAoInventario(inv, slug, qtd));
  return { error: r.ok ? null : r.error };
}
```

Animais mortos no encerramento — o `Promise.all` passa a ser:

```js
      const resultadosAni = await Promise.all(donos.map(async (donoId) => {
        const r = await alterarInventario(donoId, (inv) => inventarioSemAnimaisMortos(inv, mortosPorDono[donoId]));
        return r.ok ? { ok: true } : { ok: false, error: r.error };
      }));
```

- [ ] **Step 4: Rodar**

Run: `npx vitest run src/12-batalha/consumo-item.test.js` → PASS.
Run: `npx vitest run src/12-batalha` → tudo passa.

- [ ] **Step 5: Commit**

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/consumo-item.test.js
git commit -m "fix(batalha): baixa, veneno, saque e animais mortos gravam com trava de versão

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Gravador por PJ (fila e rebase da tela que segura cópia)

**Files:**
- Modify: `src/01-core/inventario-concorrencia.jsx` (função nova + export)
- Test: `src/01-core/inventario-concorrencia.test.js`

**Interfaces:**
- Consumes: `gravarInventario`, `mesclarInventario`, `mesmoValor` (Task 3).
- Produces: `criarGravadorInventario() → g` com:
  - `g.carregar(pjId, inventario, versao)` — o banco tem isto; zera o local.
  - `g.tem(pjId) → boolean`
  - `g.alterar(pjId, local)` — a tela mudou o inventário deste PJ.
  - `g.atual(pjId) → inventario | null` — o local (ou o que a tela deve mostrar).
  - `g.sujo(pjId) → boolean` — local difere da base.
  - `g.salvar(pjId) → Promise<{ ok: true, gravou, enviado, inventario, versao } | { ok:false, error }>` — enfileirada; `inventario` é o resultado do banco; o local do registro já sai rebaseado.

- [ ] **Step 1: Testes que falham**

Acrescentar ao fim de `src/01-core/inventario-concorrencia.test.js`:

```js
describe('criarGravadorInventario', () => {
  it('duas gravações do mesmo PJ em voo não contam a quantidade duas vezes', async () => {
    const t = { personagens: [pj([it_('f', { quantidade: 10 })], 0)] };
    globalThis.supabaseClient = fakeSupabase(t);
    const g = window.criarGravadorInventario();
    g.carregar(1, t.personagens[0].inventario, 0);
    g.alterar(1, inv([it_('f', { quantidade: 8 })]));     // usou 2
    const p1 = g.salvar(1);                                 // autosave em voo
    g.alterar(1, inv([it_('f', { quantidade: 7 })]));     // usou mais 1 enquanto gravava
    const p2 = g.salvar(1);                                 // flush ao sair
    await Promise.all([p1, p2]);
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/01-core/inventario-concorrencia.test.js`
Expected: FAIL — `window.criarGravadorInventario is not a function`.

- [ ] **Step 3: Implementar**

Em `src/01-core/inventario-concorrencia.jsx`, antes do `Object.assign`:

```js
/* Gravador por PJ para a tela que segura cópia (InventarioList). O autosave,
   o flush ao sair e o flush ao trocar de PJ podem se sobrepor na mesma aba;
   cada um calculando a diferença a partir de uma base velha contaria a mesma
   mudança duas vezes. Aqui: uma gravação por vez, cada uma partindo da última
   base que o banco confirmou, e o que a tela mudou DURANTE a gravação é
   rebaseado por cima do resultado. */
function criarGravadorInventario() {
  const regs = {};
  let fila = Promise.resolve();
  return {
    carregar(pjId, inventario, versao) { regs[pjId] = { base: inventario, versao: Number(versao) || 0, local: inventario }; },
    tem(pjId) { return !!regs[pjId]; },
    alterar(pjId, local) { if (regs[pjId]) regs[pjId].local = local; },
    atual(pjId) { return regs[pjId] ? regs[pjId].local : null; },
    sujo(pjId) { const r = regs[pjId]; return !!r && !mesmoValor(r.base, r.local); },
    salvar(pjId) {
      const tarefa = fila.then(async () => {
        const r = regs[pjId];
        if (!r) return { ok: true, gravou: false, enviado: null, inventario: null, versao: 0 };
        const enviado = r.local;
        const res = await gravarInventario(pjId, { base: r.base, local: enviado, versao: r.versao });
        if (!res.ok) return res;
        r.base = res.inventario;
        r.versao = res.versao;
        r.local = r.local === enviado ? res.inventario : mesclarInventario(enviado, r.local, res.inventario);
        return { ok: true, gravou: res.gravou, enviado, inventario: res.inventario, versao: res.versao };
      });
      fila = tarefa.catch(() => {});
      return tarefa;
    },
  };
}
```

E no `Object.assign(window, { ... })` acrescentar `criarGravadorInventario`.

- [ ] **Step 4: Rodar**

Run: `npx vitest run src/01-core/inventario-concorrencia.test.js` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/01-core/inventario-concorrencia.jsx src/01-core/inventario-concorrencia.test.js
git commit -m "feat(inventario): gravador por PJ com fila e rebase

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Tela de Inventário grava pelo gravador

**Files:**
- Modify: `src/07-inventario/inventario.jsx` — `PJ_COLS` (~470); carga do PJ (~593-611); autosave e flush (~625-670); recargas depois de RPC (transferir ~1233-1245, `recarregarInventario` ~1250-1262, `aprenderMagiaPergaminho` ~1293-1302)
- Test: `src/07-inventario/flush-inventario.test.jsx`

**Interfaces:**
- Consumes: `criarGravadorInventario` (Task 5), `mesclarInventario`, `mesmoValor` (Task 3).
- Produces: nada novo para fora; `onInventarioChange(inv)` continua sendo chamado a cada mudança, inclusive quando o que mudou por fora aparece.

- [ ] **Step 1: Testes que falham**

Acrescentar em `src/07-inventario/flush-inventario.test.jsx`, no fim do arquivo:

```js
describe('mescla com o que mudou por fora', () => {
  const CAT_FLECHA = [...CATALOGO, { slug: 'flecha', nome: 'Flecha', grupo: 'Consumíveis', tipo: 'S', ocupa: 0.1 }];
  // Dentro do alforge: item solto é desmembrado pela normalização de pilhas;
  // consumível em armazenamento fica empilhado. Busca pelo slug, não pelo id.
  const flecha = (q) => ({ instanceId: 'fle-1', slug: 'flecha', quantidade: q, vestido: false, equipado: false, slot: null, containerId: 'alf-1' });
  const qtdFlecha = (itens) => itens.filter((x) => x.slug === 'flecha').reduce((s, x) => s + (Number(x.quantidade) || 0), 0);

  it('guardar a corda enquanto a batalha gasta uma flecha: as duas valem', async () => {
    const pj = { ...novoPj(1, 'Aldren', [...itensIniciais(), flecha(10)]), inventario_versao: 0 };
    const tabelas = {
      personagens: [pj], itens: CAT_FLECHA, historias: [{ id: 9, protagonista_ids: [1] }],
      __authUserId: USER, __rpc: { get_pjs_historia: [], get_loja_pj: { ok: true, historia_titulo: 'Mesa' } },
    };
    globalThis.supabaseClient = fakeSupabase(tabelas);
    const vistos = [];
    const { container } = render(<InventarioList ac={{}} lang="pt" currentUserId={USER} pjIdFixo={1}
      onInventarioChange={(i) => vistos.push(i)} maximos={{ ef: 20, eh: 14, ka: 0, ar: 0 }} />);
    await waitFor(() => expect(container.querySelector('.inv-grid-wrap .inv-card')).toBeTruthy());

    // A batalha gasta uma flecha direto no banco (versão sobe).
    const atual = tabelas.personagens[0].inventario;
    const pilha = atual.itens.find((x) => x.slug === 'flecha');
    const daBatalha = { ...atual, itens: atual.itens.map((x) => (x === pilha ? { ...x, quantidade: x.quantidade - 1 } : x)) };
    await globalThis.supabaseClient.from('personagens').update({ inventario: daBatalha }).eq('id', 1);

    await guardarCorda(container);
    await waitFor(() => expect(cordaGravada(tabelas, 1).containerId).toBe('alf-1'));
    expect(qtdFlecha(tabelas.personagens[0].inventario.itens)).toBe(9);
    // E a tela passou a mostrar a flecha gasta (chega ao pai pelo onInventarioChange).
    await waitFor(() => expect(qtdFlecha(vistos[vistos.length - 1].itens)).toBe(9));
  });

  it('gravar sem mudança de fora não dispara uma segunda gravação', async () => {
    const pj = { ...novoPj(1, 'Aldren', itensIniciais()), inventario_versao: 0 };
    const { container, tabelas } = montar([pj], { pjIdFixo: 1 });
    await waitFor(() => expect(screen.getByText('2 de 2')).toBeTruthy());
    await guardarCorda(container);
    await waitFor(() => expect(cordaGravada(tabelas, 1).containerId).toBe('alf-1'));
    await new Promise((r) => { setTimeout(r, 1200); });
    expect(tabelas.personagens[0].inventario_versao).toBe(1);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/07-inventario/flush-inventario.test.jsx`
Expected: FAIL no primeiro teste novo — a flecha gravada volta a 10 (a tela gravou a cópia velha por cima).

- [ ] **Step 3: Implementar**

3a. `PJ_COLS`: acrescentar `,inventario_versao` no fim da string.

3b. Logo depois de `const PJ_COLS = ...;`, acrescentar:

```js
// Inventário com os campos que a tela espera, sem mexer no objeto de origem.
const INV_VAZIO = () => ({ moedas: { ouro: 0, prata: 0, cobre: 0, latao: 0 }, itens: [] });
function invComPadroes(inventario) {
  const inv = inventario || INV_VAZIO();
  return {
    ...inv,
    moedas: inv.moedas || INV_VAZIO().moedas,
    itens: Array.isArray(inv.itens) ? inv.itens : [],
  };
}
```

3c. Dentro de `InventarioList`, junto dos outros `useRef` do topo do componente, criar o gravador:

```js
  // Gravações do inventário por PJ: fila, base confirmada e rebase (02/10/2026).
  const gravadorRef = useRef(null);
  if (!gravadorRef.current) gravadorRef.current = criarGravadorInventario();
```

3d. Na carga do PJ selecionado, trocar as linhas de `const inventario = pj.inventario || ...` até `setInv(inventario);` por:

```js
    // O gravador já conhece o PJ (voltando a ele): vale o que ele tem, que
    // inclui gravação ainda na fila. Senão, o que veio do banco.
    const g = gravadorRef.current;
    if (!g.tem(pj.id)) g.carregar(pj.id, invComPadroes(pj.inventario), pj.inventario_versao);
    setInv(g.atual(pj.id));
```

3e. Substituir o bloco do autosave do inventário (do `const firstRender = useRef(true);` até o fim do efeito de flush `}, [selectedId]);` do inventário) por:

```js
  /* Autosave pelo gravador (02/10/2026): debounce de 450ms; grava só o que
     esta tela mudou, mesclado com o que mudou por fora; o que a tela mudou
     durante a gravação é rebaseado, e o que veio de fora aparece na tela. */
  // PJ da última execução do autosave. Na troca de PJ o efeito roda uma vez
  // com o `inv` do PJ ANTERIOR (a carga do novo ainda não renderizou); essa
  // execução é pulada, senão o gravador do PJ novo receberia o inventário
  // do outro. Cobre também a carga inicial (o antigo firstRender).
  const autosavePjRef = useRef(null);
  const selRef = useRef(selectedId);
  useEffect(() => { selRef.current = selectedId; }, [selectedId]);
  const aplicarGravacao = (pjId, r) => {
    if (!r.ok) { setSaving('error'); return; }
    setPjs((arr) => (arr || []).map((p) => (p.id === pjId ? { ...p, inventario: r.inventario, inventario_versao: r.versao } : p)));
    if (r.gravou) { setSaving('saved'); setTimeout(() => setSaving('idle'), 1500); }
    if (selRef.current !== pjId || !r.enviado || mesmoValor(r.inventario, r.enviado)) return;
    // Veio mudança de fora: a tela passa a mostrar, por cima do que mudou nela.
    setInv((cur) => (cur === r.enviado ? r.inventario : mesclarInventario(r.enviado, cur, r.inventario)));
  };
  useEffect(() => {
    if (autosavePjRef.current !== selectedId) { autosavePjRef.current = selectedId; return; }
    if (!inv || !selectedId) return;
    if (onInventarioChange) onInventarioChange(inv);
    const g = gravadorRef.current;
    g.alterar(selectedId, inv);
    if (!g.sujo(selectedId)) return;
    setSaving('saving');
    const pjId = selectedId;
    const id = setTimeout(() => { g.salvar(pjId).then((r) => aplicarGravacao(pjId, r)); }, 450);
    return () => clearTimeout(id);
  }, [inv, selectedId]);
  /* Flush ao desmontar E ao trocar de PJ: o debounce acima foi cancelado; o
     gravador já tem o último local deste PJ e grava na fila. */
  useEffect(() => () => {
    const pjId = selRef.current;
    const g = gravadorRef.current;
    if (!pjId || !g.sujo(pjId)) return;
    g.salvar(pjId).then((r) => {
      if (!r.ok) { console.error('[inventario] flush falhou:', r.error); return; }
      setPjs((arr) => (arr || []).map((p) => (p.id === pjId ? { ...p, inventario: r.inventario, inventario_versao: r.versao } : p)));
    });
  }, [selectedId]);
```

Atenção: o efeito antigo de `invRef`/`dirtyRef` sai, e `firstRender` também (o `autosavePjRef` faz o papel dele). A carga do PJ (3d) é declarada ANTES deste efeito no componente — confira; é isso que garante que, na troca, o `setInv` da carga já está agendado quando o autosave pula a execução com o `inv` antigo. `selRef` já existia nesse trecho e é usado pelo autosave do `estado_atual` e por `recarregarInventario` — mantenha **uma** declaração dele (a deste bloco). Depois de editar, rode `grep -n "invRef\|dirtyRef" src/07-inventario/inventario.jsx`: deve voltar vazio; se `invRef` aparecer em outro uso, mantenha o `useRef` e o efeito que o atualiza.

3f. Nas três recargas depois de RPC (transferir, `recarregarInventario`, `aprenderMagiaPergaminho`), trocar o par

```js
      setPjs(pjsAtualizados);
      const pjAtual = pjsAtualizados.find((p) => p.id === <selectedId ou selRef.current>);
      if (pjAtual) setInv(pjAtual.inventario);
```

por (mantendo o `<selectedId ou selRef.current>` que cada uma já usa):

```js
      setPjs(pjsAtualizados);
      // O banco mudou por uma RPC: quem não tem gravação pendente recarrega
      // a base; quem tem, mescla na próxima gravação (02/10/2026).
      const g = gravadorRef.current;
      pjsAtualizados.forEach((p) => { if (!g.sujo(p.id)) g.carregar(p.id, invComPadroes(p.inventario), p.inventario_versao); });
      const pjAtual = pjsAtualizados.find((p) => p.id === <selectedId ou selRef.current>);
      if (pjAtual) setInv(g.atual(pjAtual.id));
```

- [ ] **Step 4: Rodar**

Run: `npx vitest run src/07-inventario/flush-inventario.test.jsx` → PASS (4).
Run: `npx vitest run src/07-inventario src/11-ficha src/10-shell` → tudo passa.

- [ ] **Step 5: Commit**

```bash
git add src/07-inventario/inventario.jsx src/07-inventario/flush-inventario.test.jsx
git commit -m "fix(inventario): tela grava pelo gravador, com mescla e rebase

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Ficha — desequipar e despir gravam só a peça

**Files:**
- Modify: `src/11-ficha/ficha.jsx` — `salvarItensFicha` (~2710-2718)
- Test: `src/11-ficha/salvar-itens-ficha.test.js` (novo)

**Interfaces:**
- Consumes: `gravarInventario` (Task 3). `pj` vem de `select('*')`, então já traz `inventario_versao`.

- [ ] **Step 1: Teste que falha**

```js
// src/11-ficha/salvar-itens-ficha.test.js
/* Desequipar/despir pela Ficha grava só a peça (02/10/2026): a cópia da
   Ficha pode estar velha, e gravar o JSONB inteiro apagava o que mudou por
   fora. O fluxo de mescla está coberto em inventario-concorrencia.test.js;
   aqui só a porta. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'ficha.jsx'), 'utf8');
const corpo = fonte.slice(fonte.indexOf('const salvarItensFicha'), fonte.indexOf('const desequiparFicha'));

describe('salvarItensFicha', () => {
  it('grava pelo gravarInventario, com base e versão da cópia da Ficha', () => {
    expect(corpo).toMatch(/gravarInventario\(pj\.id,\s*\{\s*base,\s*local: novoInv,\s*versao: pj\.inventario_versao\s*\}\)/);
  });
  it('não grava mais a coluna inteira direto', () => {
    expect(corpo).not.toMatch(/\.update\(\{\s*inventario/);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/11-ficha/salvar-itens-ficha.test.js`
Expected: FAIL nos dois.

- [ ] **Step 3: Implementar**

```js
  const salvarItensFicha = async (novosItens) => {
    const base = pj.inventario || {};
    const novoInv = { ...base, itens: novosItens };
    const anterior = pj;
    setEqErro(null);
    setPj((prev) => ({ ...prev, inventario: novoInv }));
    // Só a peça mexida vai ao banco, mesclada com o que mudou por fora — a
    // cópia da Ficha pode estar velha (02/10/2026).
    const r = await gravarInventario(pj.id, { base, local: novoInv, versao: pj.inventario_versao });
    if (!r.ok) { setPj(anterior); setEqErro(r.error.message); return; }
    setPj((prev) => (prev.inventario === novoInv
      ? { ...prev, inventario: r.inventario, inventario_versao: r.versao }
      : { ...prev, inventario_versao: r.versao }));
  };
```

E no comentário logo acima (`// ... persiste o JSONB inteiro em personagens.inventario.`), trocar por `// ... persiste em personagens.inventario só a mudança (gravarInventario).`

- [ ] **Step 4: Rodar**

Run: `npx vitest run src/11-ficha` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/11-ficha/ficha.jsx src/11-ficha/salvar-itens-ficha.test.js
git commit -m "fix(ficha): desequipar e despir gravam só a peça, com trava de versão

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Verificação final e documentação

**Files:**
- Modify: `docs/superpowers/specs/2026-10-02-inventario-concorrencia-design.md` (linha de Status)

- [ ] **Step 1: Varreduras**

Run: `grep -rnE "update\(\{\s*inventario" src --include=*.jsx | grep -v test`
Expected: só `src/01-core/inventario-concorrencia.jsx` (o `gravarSeVersao`).

Run: `npx vitest run` → tudo passa. `npx eslint .` → os mesmos 11 erros e 1 aviso de antes (todos em `.ts`), nenhum novo. `npx tsc -b` → sem erro.

- [ ] **Step 2: Conferir o banco**

`mcp__supabase-write__execute_sql`: `select max(inventario_versao) from personagens;` — com o app em uso, deve ser ≥ 0 e crescer com gravações.

- [ ] **Step 3: Status da spec**

Trocar `Status: aprovado em conversa, aguardando revisão da spec` por `Status: implementado em 02/10/2026 (plano docs/superpowers/plans/2026-10-02-inventario-concorrencia.md)`.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-10-02-inventario-concorrencia-design.md
git commit -m "docs: spec da concorrência do inventário implementada

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
