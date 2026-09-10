# Editor de catálogo (admin master) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O administrador cria e edita as cinco tabelas de catálogo global (`magias`, `itens`, `criaturas`, `habilidades`, `tecnicas`) pela própria aplicação, sem script SQL.

**Architecture:** A trava é RLS gated em `eh_admin()` — a interface é conveniência. Um editor genérico monta o formulário a partir de um descritor declarativo por tabela (dado, não código), renderizado dentro das cinco listas que o Bestiário já tem. As fórmulas derivadas de criatura migram do `NovaCriaturaModal` para um módulo puro e testável, e aquele modal é aposentado.

**Tech Stack:** React 19 sem bundler de módulo (arquivos `.jsx` carregados por `main.tsx`, símbolos por `Object.assign(window, {...})`), Vitest, Supabase/PostgREST com RLS.

**Spec:** `docs/superpowers/specs/2026-09-10-editor-catalogo-admin-design.md`

## Global Constraints

- **Padrão de módulo:** nada de `export`. Arquivo novo `.jsx` termina em `Object.assign(window, { ... })` e precisa de `import` em `src/main.tsx`, com dependências antes.
- **Padrão de teste:** `import './arquivo.jsx'` pelo efeito colateral, ler `window.X` em `beforeAll`. Rodar com `npx vitest run <caminho>`; suíte inteira `npm test`.
- **Idioma:** código e comentários em português. Comentário explica POR QUÊ, não O QUÊ.
- **i18n:** textos de interface passam pelo objeto de tradução (`ac`/`tb`, de `01-core/copy.jsx`), NUNCA por ternária `isEn ? 'a' : 'b'` embutida no JSX. Essa regra foi violada na feature anterior e teve que ser corrigida depois.
- **Commits:** `git add` com caminhos EXPLÍCITOS. NUNCA `git add -A`, `git add .`, `git commit -a` — a árvore carrega trabalho de outras frentes. Mensagem em português, formato `feat(admin):` / `fix(admin):` / `test(admin):`.
- **SEM DELETE.** Nenhuma política de DELETE, nenhum botão de excluir, em lugar nenhum.
- **O Bestiário JÁ tem as cinco abas** (`CriaturasList`, `MagiasList`, `HabilidadesList`, `TecnicasList`, `ItensList`). Não criar aba nova; não reescrever listagem, filtro, ordenação ou paginação.
- **Colunas `id` e `created_at` nunca entram em descritor** — são do banco.
- BASELINE: `npm test` = 669 testes em 35 arquivos.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `scripts/sql/admin-catalogo-rls.sql` **(criar)** | Políticas de INSERT/UPDATE gated em `eh_admin()` nas 5 tabelas, `revoke` dos GRANTs de `anon`, coluna `atualizado_em` |
| `src/09-bestiario/criatura-formulas.jsx` **(criar)** | As 8 fórmulas derivadas de criatura, puras |
| `src/09-bestiario/criatura-formulas.test.js` **(criar)** | Fórmulas contra os 8 dragões reais do banco |
| `src/09-bestiario/catalogo-descritores.jsx` **(criar)** | Os 5 descritores |
| `src/09-bestiario/catalogo-descritores.test.js` **(criar)** | Descritor contra o schema |
| `src/09-bestiario/catalogo-editor.jsx` **(criar)** | O editor genérico (componente) |
| `src/09-bestiario/catalogo-editor.test.jsx` **(criar)** | Editor renderizado |
| `src/09-bestiario/bestiario.jsx` **(modificar)** | Gate `eh_admin()` + controles nas 5 listas |
| `src/13-diario/diario.jsx` **(modificar)** | Remoção do `NovaCriaturaModal` |
| `src/main.tsx` **(modificar)** | 3 imports novos |

---

## Task 1: Permissão no banco

Vai primeiro: sem ela, tudo o que vier depois grava contra uma porta trancada — que é exatamente o defeito que originou esta feature.

**Files:**
- Create: `scripts/sql/admin-catalogo-rls.sql`

**Interfaces:**
- Consumes: `public.eh_admin()`, já existente
- Produces: políticas `<tabela>_admin_insert` e `<tabela>_admin_update` nas 5 tabelas; coluna `atualizado_em timestamptz` nas 5

- [ ] **Step 1: Escrever o script**

```sql
-- ============================================================
-- Editor de catálogo do admin — permissão de escrita
-- ============================================================
-- As 5 tabelas de catálogo global tinham RLS LIGADA e SÓ política de
-- SELECT. RLS ligada sem política para um comando NEGA o comando — então
-- nenhum usuário da aplicação escrevia nelas, nem o administrador.
--
-- Efeito colateral que isso explica: o "Nova Criatura" do Diário
-- (13-diario/diario.jsx) faz .from('criaturas').insert() direto e falhava
-- em produção desde sempre. Ele é aposentado na Task 7 deste plano.
--
-- SEM POLÍTICA DE DELETE, de propósito: magias e técnicas são referenciadas
-- por `key` dentro do JSON dos personagens, sem foreign key protegendo.
-- Apagar uma deixa fichas apontando pro vazio. Ausência de política é a
-- forma mais forte de "não" no Postgres.
--
-- REVERTER:
--   drop policy criaturas_admin_insert on public.criaturas;  (e as outras 9)
--   alter table public.criaturas drop column atualizado_em;   (e as outras 4)
-- ============================================================

begin;

-- 1. Coluna de auditoria mínima. Sem histórico de QUEM editou (fora de
--    escopo, ver spec §8), só QUANDO — barato e suficiente pra auditar depois.
alter table public.criaturas    add column if not exists atualizado_em timestamptz;
alter table public.magias       add column if not exists atualizado_em timestamptz;
alter table public.tecnicas     add column if not exists atualizado_em timestamptz;
alter table public.habilidades  add column if not exists atualizado_em timestamptz;
alter table public.itens        add column if not exists atualizado_em timestamptz;

-- 2. Políticas. `using` E `with check` no UPDATE: sem o with_check, o admin
--    poderia mover uma linha pra um estado que ele não teria direito de criar.
--    Aqui as duas expressões são iguais, mas a assimetria é a armadilha
--    clássica de RLS e fica explícita.
create policy criaturas_admin_insert on public.criaturas
  for insert to authenticated with check (public.eh_admin());
create policy criaturas_admin_update on public.criaturas
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());

create policy magias_admin_insert on public.magias
  for insert to authenticated with check (public.eh_admin());
create policy magias_admin_update on public.magias
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());

create policy tecnicas_admin_insert on public.tecnicas
  for insert to authenticated with check (public.eh_admin());
create policy tecnicas_admin_update on public.tecnicas
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());

create policy habilidades_admin_insert on public.habilidades
  for insert to authenticated with check (public.eh_admin());
create policy habilidades_admin_update on public.habilidades
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());

create policy itens_admin_insert on public.itens
  for insert to authenticated with check (public.eh_admin());
create policy itens_admin_update on public.itens
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- 3. Dívida de GRANT. `anon` tinha INSERT/UPDATE/DELETE em 4 das 5. Inofensivo
--    enquanto a RLS nega, mas é a única linha de defesa se alguém desligar RLS
--    numa dessas tabelas um dia. `authenticated` mantém os GRANTs — quem decide
--    é a RLS, e queremos ela como porta única.
revoke insert, update, delete on public.criaturas   from anon;
revoke insert, update, delete on public.magias      from anon;
revoke insert, update, delete on public.tecnicas    from anon;
revoke insert, update, delete on public.habilidades from anon;
revoke insert, update, delete on public.itens       from anon;

-- ── Verificação. Confira as três saídas antes do commit. ──

-- (a) Esperado: 10 linhas, 5 INSERT e 5 UPDATE, todas com eh_admin().
select tablename, policyname, cmd
  from pg_policies
 where schemaname='public'
   and tablename in ('criaturas','magias','tecnicas','habilidades','itens')
   and policyname like '%_admin_%'
 order by tablename, cmd;

-- (b) Esperado: 0 linhas. Nenhuma política de DELETE em nenhuma das 5.
select tablename, policyname
  from pg_policies
 where schemaname='public'
   and tablename in ('criaturas','magias','tecnicas','habilidades','itens')
   and cmd = 'DELETE';

-- (c) Esperado: 5 linhas, todas com os três `false`.
select c.relname,
       has_table_privilege('anon', c.oid, 'INSERT') as anon_insert,
       has_table_privilege('anon', c.oid, 'UPDATE') as anon_update,
       has_table_privilege('anon', c.oid, 'DELETE') as anon_delete
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public'
   and c.relname in ('criaturas','magias','tecnicas','habilidades','itens')
 order by c.relname;

commit;   -- troque por  rollback;  se qualquer verificação não fechar
```

- [ ] **Step 2: NÃO execute o script**

Quem executa é o coordenador — escrita em banco de produção não se delega. Deixe o arquivo versionado e diga no relatório que está pronto para rodar.

- [ ] **Step 3: Commit**

```bash
git add scripts/sql/admin-catalogo-rls.sql
git commit -m "feat(admin): politicas de escrita das 5 tabelas de catalogo"
```

---

## Task 2: Fórmulas derivadas de criatura

Extraídas do `NovaCriaturaModal` antes de ele ser aposentado (Task 7). Módulo puro: nenhuma dependência de React, banco ou catálogo.

**Files:**
- Create: `src/09-bestiario/criatura-formulas.jsx`
- Create: `src/09-bestiario/criatura-formulas.test.js`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: nada
- Produces, todas em `window.CriaturaFormulas`:
  - `energiaFisica({ peso, fisico }) -> number`
  - `energiaHeroica({ coletivo, aura, estagio }) -> number`
  - `absorcao({ fisico }) -> number`
  - `defesa({ fisico, agilidade }) -> number`
  - `velocidade({ agilidade, estagio, percepcao }) -> number`
  - `danoLMP({ armaDanoL, armaDanoM, armaDanoP, agilidade }) -> { l, m, p }`
  - `dano100({ armaDano, peso }) -> number`
  - `tiersDeDano(dano100) -> { d25, d50, d75 }`
  - `EH_BASE_POR_COLETIVO` — objeto

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/09-bestiario/criatura-formulas.test.js`:

```js
/* ============================================================
   criatura-formulas.test.js — as fórmulas derivadas de criatura
   ============================================================
   Fixture: os 8 dragões REAIS do banco (leitura de 09/09/2026). Eles são
   a melhor prova disponível porque EF e EH batem pela fórmula em todos os
   8, e absorção e velocidade NÃO batem em nenhum — a classe Dragão fixa
   esses dois valores. Isso trava as duas coisas de uma vez: que a fórmula
   está certa, e que campo derivado PRECISA ser sobrescrevível (spec §6).
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './criatura-formulas.jsx';

let F;
beforeAll(() => { F = window.CriaturaFormulas; expect(F).toBeDefined(); });

// nome, estagio, peso, fisico, aura, agilidade, percepcao, forca,
// energia_fisica e energia_heroica REAIS do banco.
const DRAGOES = [
  { nome: 'Dradenar',        estagio: 15, peso:   6000, fisico: 4, aura: 3, agilidade: 6, percepcao: 5, forca: 4, ef: 159, eh: 345, absorcao: 30, velocidade: 45 },
  { nome: 'Hydra',           estagio: 21, peso:   7000, fisico: 5, aura: 3, agilidade: 3, percepcao: 2, forca: 7, ef: 173, eh: 483, absorcao: 30, velocidade: 44 },
  { nome: 'Draquae',         estagio: 18, peso:   7200, fisico: 5, aura: 3, agilidade: 6, percepcao: 2, forca: 7, ef: 175, eh: 414, absorcao: 30, velocidade: 48 },
  { nome: 'Wyvern',          estagio: 22, peso:   8500, fisico: 5, aura: 3, agilidade: 6, percepcao: 2, forca: 7, ef: 190, eh: 506, absorcao: 30, velocidade: 52 },
  { nome: 'Drake',           estagio: 19, peso:   9000, fisico: 4, aura: 4, agilidade: 6, percepcao: 6, forca: 5, ef: 194, eh: 456, absorcao: 30, velocidade: 49 },
  { nome: 'Dragão',          estagio: 25, peso:  42000, fisico: 5, aura: 3, agilidade: 6, percepcao: 2, forca: 7, ef: 415, eh: 575, absorcao: 30, velocidade: 55 },
  { nome: 'Dragão Imperial', estagio: 30, peso:  64000, fisico: 5, aura: 5, agilidade: 6, percepcao: 5, forca: 8, ef: 511, eh: 750, absorcao: 30, velocidade: 60 },
  { nome: 'Leviatã',         estagio: 50, peso: 100000, fisico: 5, aura: 3, agilidade: 6, percepcao: 2, forca: 7, ef: 638, eh: 1150, absorcao: 30, velocidade: 80 },
];

describe('energiaFisica', () => {
  it('bate com os 8 dragões do banco', () => {
    for (const d of DRAGOES) {
      expect(F.energiaFisica({ peso: d.peso, fisico: d.fisico }), d.nome).toBe(d.ef);
    }
  });

  it('arredonda pra cima', () => {
    // 2·√100 = 20 exato; 2·√101 = 20.09… → 21
    expect(F.energiaFisica({ peso: 100, fisico: 0 })).toBe(20);
    expect(F.energiaFisica({ peso: 101, fisico: 0 })).toBe(21);
  });

  it('peso zero ou ausente não quebra', () => {
    expect(F.energiaFisica({ peso: 0, fisico: 3 })).toBe(3);
    expect(F.energiaFisica({})).toBe(0);
  });
});

describe('energiaHeroica', () => {
  // Os dragões usam base 20, que NÃO está em EH_BASE_POR_COLETIVO
  // (10/13/17/21). Descoberto ao conferir os 8: eh/estagio − aura = 20 em
  // todos. O formulário original só oferecia os quatro coletivos nomeados.
  it('bate com os 8 dragões usando base 20', () => {
    for (const d of DRAGOES) {
      expect(F.energiaHeroica({ base: 20, aura: d.aura, estagio: d.estagio }), d.nome).toBe(d.eh);
    }
  });

  it('aceita o coletivo nomeado em vez da base crua', () => {
    // Solitário = 21 → (21 + 2) × 3 = 69
    expect(F.energiaHeroica({ coletivo: 'Solitário', aura: 2, estagio: 3 })).toBe(69);
  });

  it('coletivo desconhecido vira base 0', () => {
    expect(F.energiaHeroica({ coletivo: 'Inexistente', aura: 2, estagio: 3 })).toBe(6);
  });
});

describe('absorcao e defesa', () => {
  it('absorção é físico × 5, e 0 quando físico não é positivo', () => {
    expect(F.absorcao({ fisico: 4 })).toBe(20);
    expect(F.absorcao({ fisico: 0 })).toBe(0);
    expect(F.absorcao({ fisico: -2 })).toBe(0);
  });

  it('defesa soma 8 só quando há absorção', () => {
    expect(F.defesa({ fisico: 4, agilidade: 6 })).toBe(14);
    expect(F.defesa({ fisico: 0, agilidade: 6 })).toBe(6);
  });

  // A PROVA de que derivado precisa ser sobrescrevível: a classe Dragão fixa
  // absorção em 30, e a fórmula devolve 20 ou 25. Se o campo fosse travado,
  // editar um dragão corromperia o valor dele.
  it('NÃO bate com os dragões — a classe fixa absorção em 30', () => {
    for (const d of DRAGOES) {
      expect(F.absorcao({ fisico: d.fisico }), d.nome).not.toBe(d.absorcao);
    }
  });
});

describe('velocidade', () => {
  it('é (agilidade + estágio) × percepção', () => {
    expect(F.velocidade({ agilidade: 6, estagio: 15, percepcao: 5 })).toBe(105);
  });

  // Mesma prova de sobrescrita, no outro campo.
  it('NÃO bate com os dragões — a classe fixa velocidade', () => {
    const d = DRAGOES[0];   // Dradenar: (6+15)×5 = 105, banco diz 45
    expect(F.velocidade({ agilidade: d.agilidade, estagio: d.estagio, percepcao: d.percepcao }))
      .not.toBe(d.velocidade);
  });
});

describe('dano', () => {
  it('L/M/P somam a agilidade ao dano da arma', () => {
    expect(F.danoLMP({ armaDanoL: 10, armaDanoM: 12, armaDanoP: 15, agilidade: 3 }))
      .toEqual({ l: 13, m: 15, p: 18 });
  });

  it('dano100 é o dano da arma + √peso, arredondado pra cima', () => {
    expect(F.dano100({ armaDano: 10, peso: 100 })).toBe(20);
    expect(F.dano100({ armaDano: 10, peso: 101 })).toBe(21);
  });

  it('os tiers são ceil de 25/50/75%', () => {
    expect(F.tiersDeDano(63)).toEqual({ d25: 16, d50: 32, d75: 48 });
    expect(F.tiersDeDano(0)).toEqual({ d25: 0, d50: 0, d75: 0 });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/09-bestiario/criatura-formulas.test.js`
Expected: FAIL — `Failed to resolve import "./criatura-formulas.jsx"`.

- [ ] **Step 3: Implementar**

Crie `src/09-bestiario/criatura-formulas.jsx`. Antes de escrever, LEIA
`src/13-diario/diario.jsx` (busque `energiaFisicaCalc`) — é de lá que estas
fórmulas vêm, e o comentário original explica as decisões.

```jsx
/* ============================================================
   FÓRMULAS DERIVADAS DE CRIATURA
   ============================================================
   Extraídas do NovaCriaturaModal (13-diario/diario.jsx), que é aposentado
   junto desta migração. Ficam puras — sem React, banco ou catálogo — pra
   serem testáveis sem renderizar nada, e pra que o editor de catálogo e
   qualquer outro consumidor futuro usem a MESMA conta.

   Fórmulas fornecidas pelo usuário no formato de planilha; conferidas
   contra os 8 dragões do banco em criatura-formulas.test.js.

   ⚠️ Estes valores são DERIVADOS, não IMPOSTOS. Várias criaturas fogem da
   fórmula de propósito — a classe Dragão fixa absorção em 30 e velocidade
   por linhagem, e nenhuma das duas bate com a conta. Por isso o editor
   preenche o campo mas DEIXA sobrescrever (spec §6).
   ============================================================ */

const EH_BASE_POR_COLETIVO = {
  'Grupo Grande': 10, 'Grupo Médio': 13, 'Grupo Pequeno': 17, 'Solitário': 21,
};

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const teto = (v) => Math.ceil(v - 1e-9);   // margem contra ruído de ponto flutuante

// EF = ROUNDUP(2·√peso + Físico)
function energiaFisica({ peso, fisico } = {}) {
  return teto(2 * Math.sqrt(Math.max(0, num(peso))) + num(fisico));
}

// EH = (base_do_coletivo + Aura) × Estágio.
// `base` crua tem precedência sobre `coletivo`: os dragões usam base 20, que
// não é nenhum dos quatro coletivos nomeados.
function energiaHeroica({ base, coletivo, aura, estagio } = {}) {
  const b = base != null ? num(base) : (EH_BASE_POR_COLETIVO[coletivo] || 0);
  return teto((b + num(aura)) * num(estagio));
}

// Absorção = Físico > 0 ? Físico × 5 : 0
function absorcao({ fisico } = {}) {
  const f = num(fisico);
  return f > 0 ? f * 5 : 0;
}

// Defesa = Absorção > 0 ? Agilidade + 8 : Agilidade
function defesa({ fisico, agilidade } = {}) {
  return absorcao({ fisico }) > 0 ? num(agilidade) + 8 : num(agilidade);
}

// Velocidade = (Agilidade + Estágio) × Percepção
function velocidade({ agilidade, estagio, percepcao } = {}) {
  return (num(agilidade) + num(estagio)) * num(percepcao);
}

// L/M/P = dano_l/m/p da arma + Agilidade
function danoLMP({ armaDanoL, armaDanoM, armaDanoP, agilidade } = {}) {
  const a = num(agilidade);
  return { l: num(armaDanoL) + a, m: num(armaDanoM) + a, p: num(armaDanoP) + a };
}

// Dano = ROUNDUP(dano da arma + √peso)
function dano100({ armaDano, peso } = {}) {
  return teto(num(armaDano) + Math.sqrt(Math.max(0, num(peso))));
}

// Tiers 25/50/75% — mesma regra de arredondamento pra cima do Arsenal da Ficha.
function tiersDeDano(d100) {
  const d = Math.max(0, num(d100));
  return { d25: Math.ceil(d / 4), d50: Math.ceil(d / 2), d75: Math.ceil((3 * d) / 4) };
}

Object.assign(window, {
  CriaturaFormulas: {
    EH_BASE_POR_COLETIVO,
    energiaFisica, energiaHeroica, absorcao, defesa, velocidade,
    danoLMP, dano100, tiersDeDano,
  },
});
```

- [ ] **Step 4: Registrar no bundle**

Em `src/main.tsx`, acrescente depois dos imports de `01-core`:

```ts
import './09-bestiario/criatura-formulas.jsx'
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/09-bestiario/criatura-formulas.test.js`
Expected: PASS — 12 testes.

- [ ] **Step 6: Commit**

```bash
git add src/09-bestiario/criatura-formulas.jsx src/09-bestiario/criatura-formulas.test.js src/main.tsx
git commit -m "feat(admin): extrai as formulas derivadas de criatura pra modulo puro"
```

---

## Task 3: Os descritores

**Files:**
- Create: `src/09-bestiario/catalogo-descritores.jsx`
- Create: `src/09-bestiario/catalogo-descritores.test.js`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `ATRIBUTOS_KEYS`, `GRUPOS_ARMAS` (de `01-core/game-data.jsx`)
- Produces:
  - `CATALOGO_DESCRITORES` — `{ [tabela]: Descritor }`
  - `Descritor = { tabela, rotuloKey, chave: string|null, campos: Campo[] }`
  - `Campo = { col, tipo, rotuloKey, obrigatorio?, somenteNovo?, min?, max?, linhas?, opcoes?, derivado? }`
  - `tipo ∈ 'texto' | 'area' | 'numero' | 'opcoes' | 'derivado'`
  - `descritorDe(tabela) -> Descritor | null`

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/09-bestiario/catalogo-descritores.test.js`:

```js
/* ============================================================
   catalogo-descritores.test.js — o descritor contra o schema real
   ============================================================
   Este arquivo existe pra impedir o descritor de apodrecer. Coluna nova no
   banco, coluna renomeada, coluna que vira NOT NULL — qualquer uma dessas
   quebra um teste daqui, em vez de virar campo faltando na tela do admin.

   As listas de coluna abaixo são cópias do schema em 10/09/2026.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/game-data.jsx';
import './catalogo-descritores.jsx';

let MAP, descritorDe;
beforeAll(() => {
  MAP = window.CATALOGO_DESCRITORES;
  descritorDe = window.descritorDe;
  expect(MAP).toBeDefined();
});

// Cópia do schema. `id` e `created_at` NÃO entram em descritor (são do banco).
const COLUNAS = {
  criaturas: ['nome','tipo','estagio','energia_fisica','energia_heroica','absorcao','armadura','defesa','velocidade','peso','ataque','dano_l','dano_m','dano_p','dano_25','dano_50','dano_75','dano_100','intelecto','aura','carisma','forca','fisico','agilidade','percepcao','tipo_armadura','descricao','subtipo','plano','coletivo','magia','magia_n','tecnicas_especiais','habilidades'],
  magias: ['key','nome','evocacao','alcance','duracao','custo','tipo','permissao','descricao','nivel_1','nivel_3','nivel_5','nivel_7','nivel_9','dano'],
  tecnicas: ['key','nome','custo','permissao','uso','grupo_armas','grupo_armaduras','descricao','efeito','ajuste'],
  habilidades: ['key','nome','grupo','ajuste','custo','nivel_inicial','vantagem','desvantagem','restricao','descricao'],
  itens: ['slug','nome','grupo','ocupa','armazena','tipo','valor_latao','efeito','efeito_positivo','efeito_negativo','tipo_item','magia','nivel_magia','descricao','magico','categoria_equip','slot_equip','grupo_equipamento','maos_pequenino','maos_anao','maos_outras','forca_req','dano','alcance','ajuste_atributo','defesa','absorcao','tipo_armadura','dano_l','dano_m','dano_p','grupo_armas','origem','resistencia','icone','consumiveis','consumiveis_peso','doc_url'],
};

// NOT NULL sem default — o descritor tem que marcar obrigatorio.
const OBRIGATORIAS = {
  criaturas: ['nome'],
  magias: ['key','nome'],
  tecnicas: ['key','nome','custo'],
  habilidades: ['key','nome','grupo','ajuste','custo'],
  itens: ['slug','nome'],
};

// A coluna que identifica a linha e não pode ser renomeada depois de criada.
// `criaturas` não tem: ela é identificada pelo id do banco, e `nome` é editável.
const CHAVE = { criaturas: null, magias: 'key', tecnicas: 'key', habilidades: 'key', itens: 'slug' };

const TIPOS = ['texto', 'area', 'numero', 'opcoes', 'derivado'];

describe('CATALOGO_DESCRITORES', () => {
  it('cobre exatamente as 5 tabelas', () => {
    expect(Object.keys(MAP).sort()).toEqual(['criaturas','habilidades','itens','magias','tecnicas']);
  });

  it('toda coluna declarada existe na tabela', () => {
    for (const [tab, d] of Object.entries(MAP)) {
      for (const c of d.campos) {
        expect(COLUNAS[tab], `${tab}.${c.col} não existe no schema`).toContain(c.col);
      }
    }
  });

  it('nenhum descritor declara `id` ou `created_at`', () => {
    for (const [tab, d] of Object.entries(MAP)) {
      const cols = d.campos.map((c) => c.col);
      expect(cols, tab).not.toContain('id');
      expect(cols, tab).not.toContain('created_at');
    }
  });

  it('toda coluna NOT NULL sem default tem campo obrigatório', () => {
    for (const [tab, obrig] of Object.entries(OBRIGATORIAS)) {
      for (const col of obrig) {
        const campo = MAP[tab].campos.find((c) => c.col === col);
        expect(campo, `${tab}.${col} sem campo no descritor`).toBeDefined();
        expect(campo.obrigatorio, `${tab}.${col} devia ser obrigatório`).toBe(true);
      }
    }
  });

  it('todo campo tem tipo válido e rótulo', () => {
    for (const [tab, d] of Object.entries(MAP)) {
      for (const c of d.campos) {
        expect(TIPOS, `${tab}.${c.col}`).toContain(c.tipo);
        expect(typeof c.rotuloKey === 'string' && c.rotuloKey.length > 0, `${tab}.${c.col}`).toBe(true);
      }
    }
  });

  it('campo de opções tem lista não vazia', () => {
    for (const [tab, d] of Object.entries(MAP)) {
      for (const c of d.campos.filter((x) => x.tipo === 'opcoes')) {
        expect(Array.isArray(c.opcoes) && c.opcoes.length > 0, `${tab}.${c.col}`).toBe(true);
      }
    }
  });

  it('a coluna-chave é somenteNovo, e criaturas não tem chave', () => {
    for (const [tab, chave] of Object.entries(CHAVE)) {
      expect(MAP[tab].chave, tab).toBe(chave);
      if (chave === null) {
        expect(MAP[tab].campos.some((c) => c.somenteNovo), tab).toBe(false);
      } else {
        const campo = MAP[tab].campos.find((c) => c.col === chave);
        expect(campo.somenteNovo, `${tab}.${chave}`).toBe(true);
      }
    }
  });

  // Os valores fechados vieram de um SELECT DISTINCT no banco em 10/09/2026.
  it('as listas de opções batem com os valores reais do banco', () => {
    const uso = MAP.tecnicas.campos.find((c) => c.col === 'uso');
    expect(uso.opcoes.sort()).toEqual(['Intermitente','Livre','Único'].sort());

    const grupoHab = MAP.habilidades.campos.find((c) => c.col === 'grupo');
    expect(grupoHab.opcoes.sort())
      .toEqual(['Conhecimento','Geral','Influência','Manobra','Profissional','Subterfúgio'].sort());

    const grupoItem = MAP.itens.campos.find((c) => c.col === 'grupo');
    expect(grupoItem.opcoes).toContain('Armas');
    expect(grupoItem.opcoes).toContain('Armaduras');
    expect(grupoItem.opcoes.length).toBe(14);
  });

  it('ajuste usa os 7 atributos do sistema', () => {
    for (const tab of ['tecnicas', 'habilidades']) {
      const campo = MAP[tab].campos.find((c) => c.col === 'ajuste');
      expect(campo.opcoes.sort(), tab).toEqual([...window.ATRIBUTOS_KEYS].sort());
    }
  });

  it('criaturas tem os campos derivados, e eles NÃO são obrigatórios', () => {
    const derivados = MAP.criaturas.campos.filter((c) => c.tipo === 'derivado').map((c) => c.col);
    expect(derivados.sort()).toEqual(
      ['absorcao','dano_100','dano_25','dano_50','dano_75','dano_l','dano_m','dano_p','defesa','energia_fisica','energia_heroica','velocidade'].sort()
    );
    for (const c of MAP.criaturas.campos.filter((x) => x.tipo === 'derivado')) {
      expect(c.obrigatorio, c.col).not.toBe(true);
    }
  });
});

describe('descritorDe', () => {
  it('devolve o descritor da tabela', () => {
    expect(descritorDe('tecnicas').tabela).toBe('tecnicas');
  });

  it('devolve null pra tabela desconhecida, sem lançar', () => {
    expect(descritorDe('inexistente')).toBeNull();
    expect(descritorDe(null)).toBeNull();
    expect(descritorDe(undefined)).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/09-bestiario/catalogo-descritores.test.js`
Expected: FAIL — import não resolve.

- [ ] **Step 3: Escrever os descritores**

Crie `src/09-bestiario/catalogo-descritores.jsx`. O cabeçalho e dois descritores
completos vão abaixo; os outros três seguem a tabela de mapeamento do Step 4.

```jsx
/* ============================================================
   DESCRITORES DE CATÁLOGO — o que o editor de admin sabe sobre cada tabela
   ============================================================
   DADO, não código: cada tabela declara seus campos, e o editor genérico
   (catalogo-editor.jsx) monta a tela a partir daqui. Escrever cinco
   formulários à mão pra 115 colunas seria muito mais código, e cada coluna
   nova no banco exigiria mexer em JSX.

   O tipo `opcoes` é o que dá valor real: ele fecha a porta pela qual entrou
   o `tecnicas.grupo_armas = 'Intermitente'` que achamos em 09/09/2026 —
   aquele valor pertence à lista de `uso`, e um campo de lista fechada nunca
   o teria oferecido.

   `rotuloKey` aponta pra uma chave do objeto de tradução (01-core/copy.jsx),
   NUNCA pro texto direto: o app é bilíngue e a feature anterior já teve que
   corrigir strings embutidas no JSX.

   `id` e `created_at` não entram: são do banco.
   ============================================================ */

const GRUPOS_ARMAS_SIGLAS = (typeof GRUPOS_ARMAS === 'object' && GRUPOS_ARMAS)
  ? Object.keys(GRUPOS_ARMAS) : [];
const OPCOES_GRUPO_ARMAS = ['Livre', ...GRUPOS_ARMAS_SIGLAS];
const OPCOES_GRUPO_ARMADURAS = ['Livre', 'L', 'M', 'P'];
const OPCOES_ATRIBUTO = (typeof ATRIBUTOS_KEYS !== 'undefined') ? [...ATRIBUTOS_KEYS] : [];

const CATALOGO_DESCRITORES = {
  tecnicas: {
    tabela: 'tecnicas',
    rotuloKey: 'tabTecnicas',
    chave: 'key',
    campos: [
      { col: 'key',   tipo: 'texto',  rotuloKey: 'campoChave', obrigatorio: true, somenteNovo: true },
      { col: 'nome',  tipo: 'texto',  rotuloKey: 'campoNome',  obrigatorio: true },
      { col: 'custo', tipo: 'numero', rotuloKey: 'campoCusto', obrigatorio: true, min: 1, max: 2 },
      { col: 'uso',   tipo: 'opcoes', rotuloKey: 'campoUso',   opcoes: ['Único', 'Intermitente', 'Livre'] },
      { col: 'ajuste',          tipo: 'opcoes', rotuloKey: 'campoAjuste',    opcoes: OPCOES_ATRIBUTO },
      { col: 'grupo_armas',     tipo: 'opcoes', rotuloKey: 'campoArmas',     opcoes: OPCOES_GRUPO_ARMAS },
      { col: 'grupo_armaduras', tipo: 'opcoes', rotuloKey: 'campoArmaduras', opcoes: OPCOES_GRUPO_ARMADURAS },
      { col: 'permissao', tipo: 'texto', rotuloKey: 'campoPermissao' },
      { col: 'descricao', tipo: 'area',  rotuloKey: 'campoDescricao', linhas: 3 },
      { col: 'efeito',    tipo: 'area',  rotuloKey: 'campoEfeito',    linhas: 3 },
    ],
  },

  habilidades: {
    tabela: 'habilidades',
    rotuloKey: 'tabHabilidades',
    chave: 'key',
    campos: [
      { col: 'key',   tipo: 'texto',  rotuloKey: 'campoChave', obrigatorio: true, somenteNovo: true },
      { col: 'nome',  tipo: 'texto',  rotuloKey: 'campoNome',  obrigatorio: true },
      { col: 'grupo', tipo: 'opcoes', rotuloKey: 'campoGrupo', obrigatorio: true,
        opcoes: ['Conhecimento', 'Geral', 'Influência', 'Manobra', 'Profissional', 'Subterfúgio'] },
      { col: 'ajuste', tipo: 'opcoes', rotuloKey: 'campoAjuste', obrigatorio: true, opcoes: OPCOES_ATRIBUTO },
      { col: 'custo',  tipo: 'numero', rotuloKey: 'campoCusto', obrigatorio: true, min: 1, max: 9 },
      { col: 'nivel_inicial', tipo: 'numero', rotuloKey: 'campoNivelInicial', min: 0, max: 9 },
      { col: 'vantagem',    tipo: 'area', rotuloKey: 'campoVantagem',    linhas: 2 },
      { col: 'desvantagem', tipo: 'area', rotuloKey: 'campoDesvantagem', linhas: 2 },
      { col: 'restricao',   tipo: 'area', rotuloKey: 'campoRestricao',   linhas: 2 },
      { col: 'descricao',   tipo: 'area', rotuloKey: 'campoDescricao',   linhas: 3 },
    ],
  },

  // magias, criaturas e itens: ver a tabela de mapeamento no Step 4.
};

// Lookup tolerante: tabela sem descritor devolve null e o chamador esconde o
// controle de edição, em vez de quebrar.
function descritorDe(tabela) {
  if (!tabela || typeof tabela !== 'string') return null;
  return CATALOGO_DESCRITORES[tabela] || null;
}

Object.assign(window, { CATALOGO_DESCRITORES, descritorDe });
```

- [ ] **Step 4: Completar os três descritores restantes**

Monte `magias`, `criaturas` e `itens` no MESMO formato dos dois acima, seguindo
esta tabela coluna a coluna. Ela é o contrato: nada fora dela, nada faltando.

**`magias`** — `chave: 'key'`, `rotuloKey: 'tabMagias'`

| col | tipo | obrigatorio | notas |
|---|---|---|---|
| key | texto | sim | `somenteNovo: true` |
| nome | texto | sim | |
| tipo | texto | | |
| evocacao | texto | | |
| alcance | texto | | |
| duracao | texto | | |
| custo | texto | | é texto no banco, não número |
| permissao | texto | | |
| dano | numero | | min 0 |
| descricao | area | | linhas 3 |
| nivel_1, nivel_3, nivel_5, nivel_7, nivel_9 | area | | linhas 2 cada |

**`criaturas`** — `chave: null`, `rotuloKey: 'tabCriaturas'`

| col | tipo | obrigatorio | notas |
|---|---|---|---|
| nome | texto | sim | |
| tipo | texto | | |
| subtipo | texto | | |
| descricao | area | | linhas 3 |
| plano | texto | | |
| coletivo | opcoes | | `['Grupo Grande','Grupo Médio','Grupo Pequeno','Solitário']` |
| estagio | numero | | min 1, max 60 |
| peso | numero | | min 0 |
| intelecto | texto | | é texto no banco |
| aura, carisma, forca, fisico, agilidade, percepcao | numero | | min −2, max 10 |
| armadura | texto | | |
| tipo_armadura | texto | | |
| ataque | texto | | |
| magia | texto | | |
| magia_n | numero | | min 1, max 9 |
| tecnicas_especiais | area | | linhas 2 |
| habilidades | area | | linhas 2 |
| energia_fisica | **derivado** | | `formula: 'energiaFisica'` |
| energia_heroica | **derivado** | | `formula: 'energiaHeroica'` |
| absorcao | **derivado** | | `formula: 'absorcao'` |
| defesa | **derivado** | | `formula: 'defesa'` |
| velocidade | **derivado** | | `formula: 'velocidade'` |
| dano_l, dano_m, dano_p | **derivado** | | `formula: 'danoLMP'` |
| dano_100 | **derivado** | | `formula: 'dano100'` |
| dano_25, dano_50, dano_75 | **derivado** | | `formula: 'tiersDeDano'` |

**`itens`** — `chave: 'slug'`, `rotuloKey: 'tabItens'`

| col | tipo | obrigatorio | notas |
|---|---|---|---|
| slug | texto | sim | `somenteNovo: true` |
| nome | texto | sim | |
| grupo | opcoes | | as 14: `['Animais','Armaduras','Armas','Consumíveis','Diario','Instrumentos','Itens','Minerais','Moedas','Propriedades','Recipientes','Serviços','Transportes','Vestimentas']` |
| tipo, tipo_item, origem, icone, doc_url | texto | | |
| descricao | area | | linhas 3 |
| efeito, efeito_positivo, efeito_negativo | area | | linhas 2 cada |
| valor_latao, ocupa, armazena, forca_req, dano, alcance, defesa, absorcao, resistencia, dano_l, dano_m, dano_p, nivel_magia, consumiveis, consumiveis_peso | numero | | min 0 |
| magico | opcoes | | `['Sim','Não']` — é boolean no banco; o editor converte |
| magia | texto | | |
| ajuste_atributo | opcoes | | `['AGI','AUR','FOR','PER']` (mesmo `AJUSTE_KEY` de `01-core/inventario-helpers.jsx`) |
| grupo_armas | opcoes | | `OPCOES_GRUPO_ARMAS` |
| tipo_armadura | opcoes | | `OPCOES_GRUPO_ARMADURAS` |
| categoria_equip, slot_equip, grupo_equipamento | texto | | |
| maos_pequenino, maos_anao, maos_outras | numero | | min 0, max 2 |

- [ ] **Step 5: Acrescentar as chaves de tradução**

Em `src/01-core/copy.jsx`, no objeto que o Bestiário consome (`ADMIN_COPY` /
`ac` — busque `tabCriaturas` ou o rótulo das abas para achar o bloco certo),
acrescente as chaves `campoChave`, `campoNome`, `campoCusto`, `campoUso`,
`campoAjuste`, `campoArmas`, `campoArmaduras`, `campoPermissao`,
`campoDescricao`, `campoEfeito`, `campoGrupo`, `campoNivelInicial`,
`campoVantagem`, `campoDesvantagem`, `campoRestricao` e as demais que os três
descritores do Step 4 usarem — nos DOIS idiomas.

- [ ] **Step 6: Registrar no bundle**

Em `src/main.tsx`, depois de `criatura-formulas.jsx`:

```ts
import './09-bestiario/catalogo-descritores.jsx'
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npx vitest run src/09-bestiario/catalogo-descritores.test.js`
Expected: PASS — 11 testes.

- [ ] **Step 8: Commit**

```bash
git add src/09-bestiario/catalogo-descritores.jsx src/09-bestiario/catalogo-descritores.test.js src/01-core/copy.jsx src/main.tsx
git commit -m "feat(admin): descritores declarativos das 5 tabelas de catalogo"
```

---

## Task 4: O editor genérico

**Files:**
- Create: `src/09-bestiario/catalogo-editor.jsx`
- Create: `src/09-bestiario/catalogo-editor.test.jsx`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `descritorDe`, `CriaturaFormulas`, `ModalShell`, `SelectPill`, `supabaseClient`
- Produces: `window.CatalogoEditor` — componente React.
  Props: `{ tabela, linha, lang, onSalvo, onCancel }`. `linha` null = criação.
  `onSalvo(linhaSalva)` é chamado depois do sucesso.

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/09-bestiario/catalogo-editor.test.jsx`:

```jsx
/* ============================================================
   catalogo-editor.test.jsx — o editor genérico renderizado
   ============================================================
   Cobre o contrato do editor: monta os campos do descritor, respeita
   obrigatório e somenteNovo, e recalcula derivado SEM travá-lo.
   O supabaseClient é substituído por um dublê — nenhum teste toca o banco.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';
import './criatura-formulas.jsx';
import './catalogo-descritores.jsx';

let CatalogoEditor;
let ultimoInsert = null, ultimoUpdate = null, erroSimulado = null;

beforeAll(async () => {
  // Dublê do supabaseClient ANTES de carregar o editor.
  window.supabaseClient = {
    from: (tabela) => ({
      insert: (payload) => { ultimoInsert = { tabela, payload }; return {
        select: () => ({ single: async () => ({ data: { ...payload, id: 1 }, error: erroSimulado }) }) }; },
      update: (payload) => ({ eq: () => ({
        select: () => ({ single: async () => ({ data: payload, error: erroSimulado }) }) }) }),
    }),
  };
  await import('./catalogo-editor.jsx');
  CatalogoEditor = window.CatalogoEditor;
  expect(CatalogoEditor).toBeDefined();
});

afterEach(() => { cleanup(); ultimoInsert = null; ultimoUpdate = null; erroSimulado = null; });

const montar = (props = {}) => render(
  <div className="menestrel-ui">
    <CatalogoEditor tabela="tecnicas" linha={null} lang="pt"
      onSalvo={() => {}} onCancel={() => {}} {...props} />
  </div>
);
const campoPorRotulo = (re) => Array.from(document.querySelectorAll('label, .motor-field'))
  .find((el) => re.test(el.textContent || ''));

describe('montagem a partir do descritor', () => {
  it('renderiza um campo por entrada do descritor', () => {
    montar();
    const d = window.descritorDe('tecnicas');
    // Cada campo aparece: input, textarea ou SelectPill.
    const controles = document.querySelectorAll('input, textarea, .select-pill-btn');
    expect(controles.length).toBeGreaterThanOrEqual(d.campos.length);
  });

  it('campo de opções oferece só os valores da lista', () => {
    montar();
    const pills = Array.from(document.querySelectorAll('.select-pill-btn'));
    // Abre cada pill até achar a de `uso`.
    let achou = false;
    for (const p of pills) {
      fireEvent.click(p);
      const itens = Array.from(document.querySelectorAll('.select-pill-drop li'))
        .map((li) => (li.textContent || '').trim());
      if (itens.includes('Único')) {
        expect(itens.sort()).toEqual(['Intermitente', 'Livre', 'Único'].sort());
        achou = true; break;
      }
      fireEvent.click(p);
    }
    expect(achou, 'não achei o campo `uso`').toBe(true);
  });
});

describe('somenteNovo', () => {
  it('a coluna-chave é editável ao CRIAR', () => {
    montar({ linha: null });
    const chave = document.querySelector('input[name="key"]');
    expect(chave).toBeTruthy();
    expect(chave.disabled).toBe(false);
  });

  it('a coluna-chave fica travada ao EDITAR', () => {
    montar({ linha: { key: 'mira', nome: 'Mira', custo: 2 } });
    const chave = document.querySelector('input[name="key"]');
    expect(chave.disabled).toBe(true);
  });
});

describe('obrigatório', () => {
  it('salvar fica bloqueado com obrigatório vazio', () => {
    montar({ linha: null });
    const salvar = screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent));
    expect(salvar.disabled).toBe(true);
  });

  it('salvar libera quando os obrigatórios estão preenchidos', () => {
    montar({ linha: null });
    fireEvent.change(document.querySelector('input[name="key"]'), { target: { value: 'nova' } });
    fireEvent.change(document.querySelector('input[name="nome"]'), { target: { value: 'Nova' } });
    fireEvent.change(document.querySelector('input[name="custo"]'), { target: { value: '2' } });
    const salvar = screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent));
    expect(salvar.disabled).toBe(false);
  });
});

describe('campo derivado (criaturas)', () => {
  it('calcula ao mudar a entrada', () => {
    montar({ tabela: 'criaturas', linha: null });
    fireEvent.change(document.querySelector('input[name="peso"]'), { target: { value: '6000' } });
    fireEvent.change(document.querySelector('input[name="fisico"]'), { target: { value: '4' } });
    expect(document.querySelector('input[name="energia_fisica"]').value).toBe('159');
  });

  // A regra que vem da spec §6: dragão tem absorção 30 fixa, e a fórmula dá 20.
  // Se o campo fosse travado, editar um dragão corromperia o valor dele.
  it('aceita sobrescrita manual e marca que foi sobrescrito', () => {
    montar({ tabela: 'criaturas', linha: null });
    fireEvent.change(document.querySelector('input[name="fisico"]'), { target: { value: '4' } });
    const abs = document.querySelector('input[name="absorcao"]');
    expect(abs.value).toBe('20');
    expect(abs.disabled).toBe(false);
    fireEvent.change(abs, { target: { value: '30' } });
    expect(abs.value).toBe('30');
    // Mexer noutra entrada NÃO pode reverter a sobrescrita.
    fireEvent.change(document.querySelector('input[name="agilidade"]'), { target: { value: '6' } });
    expect(abs.value).toBe('30');
  });
});

describe('gravação', () => {
  it('criar chama insert na tabela do descritor', async () => {
    montar({ linha: null });
    fireEvent.change(document.querySelector('input[name="key"]'), { target: { value: 'nova' } });
    fireEvent.change(document.querySelector('input[name="nome"]'), { target: { value: 'Nova' } });
    fireEvent.change(document.querySelector('input[name="custo"]'), { target: { value: '2' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoInsert).not.toBeNull());
    expect(ultimoInsert.tabela).toBe('tecnicas');
    expect(ultimoInsert.payload.key).toBe('nova');
  });

  it('erro do banco aparece na tela, com o texto do Postgres', async () => {
    erroSimulado = { message: 'duplicate key value violates unique constraint' };
    montar({ linha: null });
    fireEvent.change(document.querySelector('input[name="key"]'), { target: { value: 'mira' } });
    fireEvent.change(document.querySelector('input[name="nome"]'), { target: { value: 'Mira' } });
    fireEvent.change(document.querySelector('input[name="custo"]'), { target: { value: '2' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => {
      expect(document.body.textContent).toMatch(/duplicate key value/);
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/09-bestiario/catalogo-editor.test.jsx`
Expected: FAIL — `CatalogoEditor` indefinido.

- [ ] **Step 3: Implementar o editor**

Crie `src/09-bestiario/catalogo-editor.jsx`.

**Copie a ESTRUTURA de `NovaCriaturaModal`** (`src/13-diario/diario.jsx`, busque
`function NovaCriaturaModal`). Ele já é exatamente esta forma — `ModalShell` +
campos + valores derivados por `useMemo` + `salvar()` com `insert` e erro no
rodapé — só que hardcoded para uma tabela. Você está generalizando o que ele faz,
não inventando do zero. Leia-o inteiro antes de escrever, incluindo
`NovaCriaturaCampo`, que é o input reaproveitável dele. Ele é aposentado na
Task 6; até lá é a melhor referência viva.

Requisitos, todos cobertos pelos testes do Step 1:

- Estado local `form`, iniciado de `linha` (edição) ou vazio (criação).
- Renderiza os campos na ordem do descritor. `name` de cada controle = `col` —
  é assim que os testes o encontram, e é a convenção mais simples.
- `texto` → `<input>`; `area` → `<textarea rows={linhas}>`; `numero` →
  `<input type="number" min max>`; `opcoes` → `SelectPill`.
- `somenteNovo` → `disabled` quando `linha` não é null.
- Derivado: recalcula a partir de `CriaturaFormulas` sempre que uma entrada muda,
  **exceto** se aquele campo tiver sido editado à mão. Guarde as colunas
  sobrescritas num `Set` no estado; uma vez no Set, o campo para de recalcular.
  Marque visualmente (classe `campo-sobrescrito`).
- Salvar habilitado só quando todo `obrigatorio` tem valor não vazio.
- Salvar faz `insert` (criação) ou `update` pela chave (edição), sempre com
  `atualizado_em: new Date().toISOString()`.
- Erro do banco vai pro rodapé com `error.message` cru. Não traduzir: o admin é
  o dono do sistema e o texto do Postgres ajuda mais que uma mensagem genérica.
- Envolva em `ModalShell` (de `10-shell/shell.jsx`), como o resto do app.
- Termine com `Object.assign(window, { CatalogoEditor });`

> **Componente, não função pura:** ele NÃO entra em nenhum objeto de motor —
> vai solto em `window`, como `AcaoPanel` já faz em `12-batalha/batalha.jsx`.

- [ ] **Step 4: Registrar no bundle**

Em `src/main.tsx`, depois de `catalogo-descritores.jsx`:

```ts
import './09-bestiario/catalogo-editor.jsx'
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/09-bestiario/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/09-bestiario/catalogo-editor.jsx src/09-bestiario/catalogo-editor.test.jsx src/main.tsx
git commit -m "feat(admin): editor generico montado a partir do descritor"
```

---

## Task 5: Gate de admin e fiação no Bestiário

**Files:**
- Modify: `src/09-bestiario/bestiario.jsx`
- Modify: `src/01-core/copy.jsx`
- Test: `src/09-bestiario/bestiario-admin.test.jsx` (criar)

**Interfaces:**
- Consumes: `CatalogoEditor`, `descritorDe`, `supabaseClient`
- Produces: `window.useEhAdmin()` — hook React que devolve `boolean`, `false` até a RPC responder

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/09-bestiario/bestiario-admin.test.jsx`:

```jsx
/* ============================================================
   bestiario-admin.test.jsx — o gate de admin nas listas do catálogo
   ============================================================
   O gate é CONVENIÊNCIA, não segurança: quem trava a escrita é a RLS
   (scripts/sql/admin-catalogo-rls.sql). Este arquivo cobre só que os
   controles aparecem pra admin e somem pros demais.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';

let respostaEhAdmin = false;
beforeAll(async () => {
  window.supabaseClient = {
    rpc: async (nome) => (nome === 'eh_admin'
      ? { data: respostaEhAdmin, error: null }
      : { data: null, error: null }),
    from: () => ({ select: () => ({ order: async () => ({ data: [], error: null }) }) }),
  };
  await import('./criatura-formulas.jsx');
  await import('./catalogo-descritores.jsx');
  await import('./bestiario.jsx');
});
afterEach(() => { cleanup(); respostaEhAdmin = false; });

describe('useEhAdmin', () => {
  it('devolve false antes da RPC responder e para não-admin', async () => {
    respostaEhAdmin = false;
    const { result } = renderHook();
    await vi.waitFor(() => expect(result.current).toBe(false));
  });

  it('devolve true quando a RPC diz que é admin', async () => {
    respostaEhAdmin = true;
    const { result } = renderHook();
    await vi.waitFor(() => expect(result.current).toBe(true));
  });
});

// Helper mínimo: renderiza um componente que só chama o hook.
function renderHook() {
  const result = { current: undefined };
  function Sonda() { result.current = window.useEhAdmin(); return null; }
  render(<Sonda />);
  return { result };
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/09-bestiario/bestiario-admin.test.jsx`
Expected: FAIL — `window.useEhAdmin is not a function`.

- [ ] **Step 3: Implementar o hook**

Em `src/09-bestiario/bestiario.jsx`, perto do topo (depois dos helpers de
tooltip, antes das listas):

```jsx
/* Gate de admin da interface.
   CONVENIÊNCIA, não segurança: quem impede a escrita é a RLS, gated em
   eh_admin() no banco. Este hook decide só se o lápis aparece. Um usuário
   comum que forje a chamada leva erro do Postgres.

   Chama a RPC em vez de comparar o e-mail no cliente de propósito: a
   definição de quem é admin fica com uma dona só. Comparar aqui duplicaria
   a regra em dois lugares que podem divergir. */
function useEhAdmin() {
  const [ehAdmin, setEhAdmin] = useState(false);
  useEffect(() => {
    let vivo = true;
    supabaseClient.rpc('eh_admin').then(({ data, error }) => {
      if (vivo && !error) setEhAdmin(data === true);
    });
    return () => { vivo = false; };
  }, []);
  return ehAdmin;
}
```

Acrescente `useEhAdmin` ao `Object.assign(window, {...})` do fim do arquivo.

- [ ] **Step 4: Ligar os controles nas cinco listas**

Em cada uma de `CriaturasList`, `MagiasList`, `HabilidadesList`, `TecnicasList`
e `ItensList`:

1. `const ehAdmin = useEhAdmin();` e `const [editando, setEditando] = useState(undefined);`
   (`undefined` = fechado, `null` = criando, objeto = editando aquela linha).
2. No cabeçalho da lista, quando `ehAdmin`: um botão "Novo" que faz `setEditando(null)`.
3. Em cada linha da tabela, quando `ehAdmin`: um botão de lápis que faz `setEditando(linha)`.
4. Ao fim do JSX da lista:

```jsx
{editando !== undefined && (
  <CatalogoEditor
    tabela="tecnicas"          /* a tabela DESTA lista */
    linha={editando}
    lang={lang}
    onSalvo={() => { setEditando(undefined); recarregar(); }}
    onCancel={() => setEditando(undefined)}
  />
)}
```

`recarregar` é a função de fetch que a lista já tem — LEIA cada lista e reuse a
que existe; não escreva outra. Se a função de fetch estiver embutida num
`useEffect` sem estar extraída, extraia-a primeiro, sem mudar o que ela faz.

Os rótulos "Novo" e "Editar" saem de `copy.jsx`, nos dois idiomas. NUNCA
`isEn ? 'New' : 'Novo'` embutido.

- [ ] **Step 5: Rodar a suíte inteira**

Run: `npm test`
Expected: PASS. As cinco listas têm testes existentes — se algum quebrar, o
controle novo entrou no lugar errado.

- [ ] **Step 6: Commit**

```bash
git add src/09-bestiario/bestiario.jsx src/09-bestiario/bestiario-admin.test.jsx src/01-core/copy.jsx
git commit -m "feat(admin): gate de eh_admin e controles de edicao nas 5 listas"
```

---

## Task 6: Aposentar o NovaCriaturaModal

Só depois da Task 2, que já salvou as fórmulas dele.

**Files:**
- Modify: `src/13-diario/diario.jsx`

**Interfaces:**
- Consumes: nada
- Produces: nada (remoção)

- [ ] **Step 1: Confirmar que as fórmulas já estão salvas**

Run: `npx vitest run src/09-bestiario/criatura-formulas.test.js`
Expected: PASS. Se falhar, PARE — a Task 2 não terminou e remover o modal agora
perde as fórmulas.

- [ ] **Step 2: Remover**

Em `src/13-diario/diario.jsx`, remova `NovaCriaturaModal`, `NovaCriaturaCampo`
(se não for usado por mais ninguém — confira com grep antes) e o botão/estado que
abre o modal. Deixe um comentário curto no lugar:

```jsx
/* O formulário "Nova Criatura" viveu aqui até 10/09/2026. Ele fazia
   .from('criaturas').insert() direto e estava QUEBRADO em produção: as 5
   tabelas de catálogo têm RLS ligada e só tinham política de SELECT, então
   a escrita nunca passava. Criar criatura agora é no Bestiário, pelo editor
   de catálogo do admin. As fórmulas derivadas dele viraram
   09-bestiario/criatura-formulas.jsx. */
```

- [ ] **Step 3: Rodar a suíte**

Run: `npm test`
Expected: PASS. Se algum teste do Diário referenciava o modal, ele muda junto —
a remoção é intencional.

- [ ] **Step 4: Commit**

```bash
git add src/13-diario/diario.jsx
git commit -m "refactor(admin): aposenta o NovaCriaturaModal do Diario"
```

---

## Verificação final

- [ ] `npm test` — suíte inteira verde
- [ ] `npm run lint` — sem erro novo
- [ ] `npm run build` — passa
- [ ] O coordenador executou `scripts/sql/admin-catalogo-rls.sql` e as três consultas de verificação fecharam
- [ ] Teste manual, logado como admin: editar uma técnica pelo Bestiário e ver a mudança persistir
- [ ] Teste manual, logado como NÃO-admin: os controles de edição não aparecem
- [ ] Teste manual: criar uma criatura nova, conferir que EF/EH calculam e que dá pra sobrescrever a absorção
