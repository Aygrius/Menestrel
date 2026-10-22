# Classes de magia e regra dos milagres — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toda magia ganha uma classe (Feitiço, Milagre, Encanto, Transmutação), e milagres ficam proibidos de usar/aprender/receber conforme vampirismo, licantropia, falta de religião e Escuridão.

**Architecture:** Coluna `magias.classe` carregada por SQL. As regras moram em funções puras de `01-core/game-data.jsx` (`atorMilagreDePj`, `atorMilagreDeCriatura`, `bloqueioMilagre`, `alvoDeMilagreBloqueado`) e são consumidas por: `bloqueioAprenderMagia` (aprender), a lista de magias e `alvoPermitidoParaMagia` da batalha, e o Evocar da ficha. A RPC `aprender_magia` espelha só os bloqueios permanentes.

**Tech Stack:** React 19 + Vite (`.jsx` globais via `window`), Vitest, Supabase Postgres (MCP `supabase-write`), Vercel CLI.

**Spec:** `docs/superpowers/specs/2026-10-22-classes-de-magia-milagres-design.md`

## Global Constraints

- Classes exatas: `Feitiço`, `Milagre`, `Encanto`, `Transmutação`.
- Motivos e textos (pt / en):
  - `milagre_vampiro` — "Vampiros não usam milagres." / "Vampires cannot use miracles."
  - `milagre_lobisomem` — "Lobisomens não usam milagres." / "Werewolves cannot use miracles."
  - `milagre_sem_religiao` — "Sem religião, não há milagre." / "Without a faith, there is no miracle."
  - `milagre_escuridao` — "A Escuridão não conjura milagres." / "Darkness cannot cast miracles."
  - alvo: `alvo_milagre_vampiro` / `alvo_milagre_lobisomem` / `alvo_milagre_sem_religiao` — "Vampiros não recebem milagres." / "Lobisomens não recebem milagres." / "Sem religião, não recebe milagres."
- Ordem dos motivos: vampiro → lobisomem → sem religião → escuridão.
- Sub-raça efetiva via `subracaEfetiva` **só se existir** (`typeof subracaEfetiva === 'function'`); senão, cai em `pj.subraca` fixa. Motivo: o código de sub-raça está em alterações não commitadas de outro trabalho.
- Elemento do PJ = `elementoDaProfissao(pj.profissao)`; da criatura = `cri.elemento` (CSV). Escuridão via `chavesDeElemento(...)` contendo `'escuridao'`.
- UI nova passa pela skill `impeccable`; confirmação no `.ms-footer`.
- Commits na `main`, mensagem em português, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Arquivos com alterações pendentes alheias (`game-data.jsx`, `batalha.jsx`, `ficha.jsx`, `inventario.jsx`, `index.css`, `magias-efeito.jsx`, `personagens.jsx`, `loja.jsx`, `shell.jsx`): fotografar antes de editar e commitar só o próprio diff (`diff` contra a cópia + `git apply --cached`; se o hunk conflitar com o alheio, montar o arquivo a partir do HEAD).
- Testes: `npx vitest run <arquivo>`; suíte `npm test`; build `npm run build`.

## Review Focus

1. Mago com milagre aprendido antes da regra: o milagre aparece na ficha e na batalha, desativado com `milagre_escuridao` — nada some sem explicação (teste na Task 3).
2. Magia de área/aura de milagre (ex.: cura em área) com um vampiro no raio: o vampiro é pulado, os demais recebem (teste na Task 3).
3. Lobisomem temporário (Licantropia) estuda milagre: pode aprender; não pode usar enquanto transformado (teste na Task 2, condicionado a `subracaEfetiva` existir).
4. Criatura "Fogo, Escuridão" com milagre no catálogo (`criaturas.magia`): o milagre aparece desativado na lista dela (teste na Task 3).
5. Colega sem deus na lista de alvos do Evocar de um milagre: não aparece (teste na Task 4).

---

### Task 1: Banco — coluna `classe`, RPC e colegas (escrito e ensaiado)

**Files:**
- Create: `scripts/sql/classes-de-magia-2026-10-22.sql`
- Modify: `scripts/sql/aprender-magia-rpc-2026-10-22.sql` (espelho do milagre)
- Create: `scripts/sql/pjs-historia-deus-subraca-2026-10-22.sql`

**Interfaces:**
- Produces: `magias.classe` NOT NULL com CHECK; `aprender_magia` recusa milagre com `milagre_vampiro|milagre_lobisomem|milagre_sem_religiao|milagre_escuridao`; `get_pjs_historia` devolve também `deus text, subraca text`.

- [ ] **Step 1: Script da classe**

```sql
-- scripts/sql/classes-de-magia-2026-10-22.sql
-- Classe da magia (spec 2026-10-22-classes-de-magia-milagres). Pedido do
-- usuário: Feitiço (arcana, magos), Milagre (divina, sacerdotes), Encanto
-- (artística, bardos), Transmutação (espiritual, rastreadores). Uma classe
-- por magia; as 41 citadas por várias origens foram decididas pelo usuário.
BEGIN;
ALTER TABLE public.magias ADD COLUMN IF NOT EXISTS classe text;

-- Origem única, pela permissão.
WITH o AS (
  SELECT m.key,
    bool_or(btrim(p) = 'Mago' OR btrim(p) LIKE 'Colégio%')         AS arc,
    bool_or(btrim(p) = 'Sacerdote' OR btrim(p) LIKE 'Ordem%')      AS div,
    bool_or(btrim(p) = 'Bardo' OR btrim(p) LIKE 'Confraria%')      AS art,
    bool_or(btrim(p) = 'Rastreador' OR btrim(p) LIKE 'Trilha%')    AS esp
  FROM public.magias m
  CROSS JOIN LATERAL unnest(string_to_array(coalesce(m.permissao, ''), ',')) AS p
  GROUP BY m.key
)
UPDATE public.magias m SET classe = CASE
    WHEN o.arc THEN 'Feitiço' WHEN o.div THEN 'Milagre'
    WHEN o.art THEN 'Encanto' ELSE 'Transmutação' END
  FROM o
 WHERE m.key = o.key AND (o.arc::int + o.div::int + o.art::int + o.esp::int) = 1;

-- As 41 de várias origens (decisão do usuário, 22/10/2026).
UPDATE public.magias SET classe = v.classe
  FROM (VALUES
    ('Aeromanipulação','Feitiço'), ('Aeroproteção','Feitiço'), ('Amizade','Encanto'),
    ('Caçada Marcada','Transmutação'), ('Comunhão Natural','Transmutação'), ('Conhecimento','Encanto'),
    ('Conhecimento Natural','Transmutação'), ('Controle Climático','Transmutação'),
    ('Criptograma Místico','Feitiço'), ('Curas Heroicas','Milagre'), ('Degeneração Física','Feitiço'),
    ('Detecção de Magia','Feitiço'), ('Dom das Línguas','Encanto'), ('Elo Animal','Transmutação'),
    ('Esconjuração','Milagre'), ('Fotoataque','Feitiço'), ('Geoataque','Feitiço'), ('Geomanipulação','Feitiço'),
    ('Graça Felina','Transmutação'), ('Hidroataque','Feitiço'), ('Hidroproteção','Feitiço'),
    ('Hidromanipulação','Feitiço'), ('Intuição','Encanto'), ('Leitura','Encanto'), ('Lendas','Encanto'),
    ('Maldições','Milagre'), ('Memorização','Encanto'), ('Modificar Espírito','Encanto'), ('Mutação','Feitiço'),
    ('Necroconhecimento','Feitiço'), ('Ossos de Aço','Transmutação'), ('Piroataque','Feitiço'),
    ('Piromanipulação','Feitiço'), ('Piroproteção','Feitiço'), ('Quebra de Encantos','Feitiço'),
    ('Respiração Arcana','Feitiço'), ('Runas','Encanto'), ('Sombra','Encanto'),
    ('Super Resistência','Transmutação'), ('Transformação Metálica','Feitiço'), ('Ventriloquismo','Encanto')
  ) AS v(nome, classe)
 WHERE public.magias.nome = v.nome;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.magias WHERE classe IS NULL;
  IF n > 0 THEN RAISE EXCEPTION '% magia(s) sem classe', n; END IF;
END $$;

ALTER TABLE public.magias ALTER COLUMN classe SET NOT NULL;
ALTER TABLE public.magias DROP CONSTRAINT IF EXISTS magias_classe_chk;
ALTER TABLE public.magias ADD CONSTRAINT magias_classe_chk
  CHECK (classe IN ('Feitiço', 'Milagre', 'Encanto', 'Transmutação'));
COMMIT;
```

- [ ] **Step 2: Espelho na RPC**

Em `scripts/sql/aprender-magia-rpc-2026-10-22.sql`:
- na declaração, acrescente `v_classe text;`;
- no `select … into v_pj`, acrescente `deus, subraca` às colunas;
- troque `select key, nome, custo, nivel_1, …` por `select key, nome, custo, classe, nivel_1, nivel_3, nivel_5, nivel_7, nivel_9`;
- logo depois de `if not v_ensina then … end if;`, acrescente:

```sql
  -- Milagre (22/10/2026): bloqueios PERMANENTES impedem aprender. A
  -- Licantropia temporária só impede usar — fica com a tela (JS).
  if v_magia.classe = 'Milagre' then
    if v_pj.subraca = 'Vampiro' then
      return jsonb_build_object('ok', false, 'motivo', 'milagre_vampiro');
    elsif v_pj.subraca = 'Lobisomem' then
      return jsonb_build_object('ok', false, 'motivo', 'milagre_lobisomem');
    elsif v_pj.deus is null or btrim(v_pj.deus) = '' then
      return jsonb_build_object('ok', false, 'motivo', 'milagre_sem_religiao');
    elsif v_pj.profissao = 'Mago' then
      -- Elemento da profissão (ELEMENTO_PROFISSAO, game-data.jsx): só o Mago é Escuridão.
      return jsonb_build_object('ok', false, 'motivo', 'milagre_escuridao');
    end if;
  end if;
```

- [ ] **Step 3: Colegas com deus e sub-raça**

Create `scripts/sql/pjs-historia-deus-subraca-2026-10-22.sql`: lê a definição atual de `get_pjs_historia` (MCP: `select pg_get_functiondef('public.get_pjs_historia'::regproc)`), e reescreve com `DROP FUNCTION public.get_pjs_historia(bigint); CREATE FUNCTION …` igual, acrescentando `deus text, subraca text` ao `RETURNS TABLE` e `p.deus, p.subraca` ao `select`, mais `GRANT EXECUTE … TO authenticated` (conferir os grants atuais antes com `\dp`-equivalente: `select grantee, privilege_type from information_schema.routine_privileges where routine_name='get_pjs_historia'` e repetir os mesmos).

- [ ] **Step 4: Ensaiar os três (BEGIN … ROLLBACK)**

Pelo MCP, numa chamada: corpo dos três scripts sem `COMMIT` + checagens + `ROLLBACK`:

```sql
SELECT classe, count(*) FROM public.magias GROUP BY 1;  -- 4 linhas, soma 239
```

E um ensaio da RPC, no molde do `aprender-magia-rpc-2026-10-22.teste.sql`: PJ Sacerdote com `deus = NULL` e um livro de deus no inventário tenta aprender uma básica de Sacerdote → `milagre_sem_religiao`; com `deus = 'Lena'` → ok; `profissao = 'Mago'` com deus → `milagre_escuridao`; `subraca = 'Vampiro'` → `milagre_vampiro`.
Expected: sem erro; classes somam 239; os quatro `ASSERT` passam.

- [ ] **Step 5: Commit**

```bash
git add scripts/sql/classes-de-magia-2026-10-22.sql scripts/sql/aprender-magia-rpc-2026-10-22.sql scripts/sql/pjs-historia-deus-subraca-2026-10-22.sql
git commit -m "feat(magias): classe da magia e milagre recusado no aprender_magia" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Regras puras (`game-data.jsx`) e o aprender

**Files:**
- Modify: `src/01-core/game-data.jsx` (bloco `[11] Helpers de MAGIAS`; export)
- Modify: `src/07-inventario/inventario.jsx` (`motivoAprenderLabel`)
- Create: `src/01-core/milagres.test.js`

**Interfaces:**
- Produces (em `window`):
  - `CLASSES_MAGIA = ['Feitiço','Milagre','Encanto','Transmutação']`
  - `atorMilagreDePj(pj, dataJogo?) → { tipo:'pj', deus, subraca, subraca_fixa, elementos:string[] }`
  - `atorMilagreDeCriatura(cri) → { tipo:'criatura', subraca:null, subraca_fixa:null, subtipo, elementos }`
  - `bloqueioMilagre(ator, { permanente } = {}) → null | { motivo }`
  - `alvoDeMilagreBloqueado(ator) → null | { motivo }` (motivos `alvo_milagre_*`)
  - `motivoMilagreLabel(motivo, en) → string`
  - `bloqueioAprenderMagia` passa a conferir milagre (permanente) antes do estágio.

- [ ] **Step 1: Teste (falha)**

Create `src/01-core/milagres.test.js`:

```js
/* milagres.test.js — quem não usa, não aprende, nem recebe milagre (22/10/2026)
   "Um personagem vampiro, lobisomem ou sem religião não pode usar ou ser alvo
   de milagres. Uma criatura de elemento 'escuridão' não pode usar milagres."
   Decisões: Escuridão vale para todo ator (o Mago também); criatura não tem
   religião e não é barrada por isso; Licantropia temporária só barra o uso. */
import { describe, it, expect, beforeAll } from 'vitest';
import './inventario-helpers.jsx';
import './game-data.jsx';

let G;
beforeAll(() => { G = window; });

const pj = (x) => ({ profissao: 'Sacerdote', deus: 'Lena', subraca: null, estado_atual: {}, ...x });

describe('bloqueioMilagre — personagem', () => {
  it('Sacerdote de Lena: livre', () => {
    expect(G.bloqueioMilagre(G.atorMilagreDePj(pj()))).toBeNull();
  });
  it.each([
    [{ subraca: 'Vampiro' }, 'milagre_vampiro'],
    [{ subraca: 'Lobisomem' }, 'milagre_lobisomem'],
    [{ deus: null }, 'milagre_sem_religiao'],
    [{ deus: '  ' }, 'milagre_sem_religiao'],
    [{ profissao: 'Mago' }, 'milagre_escuridao'],
  ])('%j → %s', (x, motivo) => {
    expect(G.bloqueioMilagre(G.atorMilagreDePj(pj(x))).motivo).toBe(motivo);
  });
  it('vampiro vem antes de sem religião', () => {
    expect(G.bloqueioMilagre(G.atorMilagreDePj(pj({ subraca: 'Vampiro', deus: null }))).motivo).toBe('milagre_vampiro');
  });
  it('permanente ignora a sub-raça temporária e olha só a fixa', () => {
    const ator = { tipo: 'pj', deus: 'Lena', subraca: 'Lobisomem', subraca_fixa: null, elementos: ['luz'] };
    expect(G.bloqueioMilagre(ator).motivo).toBe('milagre_lobisomem');
    expect(G.bloqueioMilagre(ator, { permanente: true })).toBeNull();
  });
});

describe('bloqueioMilagre — criatura', () => {
  const cri = (x) => G.atorMilagreDeCriatura({ elemento: 'Luz', subtipo: null, ...x });
  it('criatura comum: livre (sem religião não conta)', () => {
    expect(G.bloqueioMilagre(cri())).toBeNull();
  });
  it.each([
    [{ elemento: 'Escuridão' }, 'milagre_escuridao'],
    [{ elemento: 'Fogo, Escuridão' }, 'milagre_escuridao'],
    [{ subtipo: 'Vampiro' }, 'milagre_vampiro'],
    [{ subtipo: 'Lobisomem' }, 'milagre_lobisomem'],
  ])('%j → %s', (x, motivo) => {
    expect(G.bloqueioMilagre(cri(x)).motivo).toBe(motivo);
  });
});

describe('alvoDeMilagreBloqueado', () => {
  it('vampiro, lobisomem e sem religião não recebem', () => {
    expect(G.alvoDeMilagreBloqueado(G.atorMilagreDePj(pj({ subraca: 'Vampiro' }))).motivo).toBe('alvo_milagre_vampiro');
    expect(G.alvoDeMilagreBloqueado(G.atorMilagreDePj(pj({ deus: null }))).motivo).toBe('alvo_milagre_sem_religiao');
    expect(G.alvoDeMilagreBloqueado(G.atorMilagreDeCriatura({ subtipo: 'Lobisomem' })).motivo).toBe('alvo_milagre_lobisomem');
  });
  it('Escuridão recebe (só não conjura)', () => {
    expect(G.alvoDeMilagreBloqueado(G.atorMilagreDePj(pj({ profissao: 'Mago' })))).toBeNull();
    expect(G.alvoDeMilagreBloqueado(G.atorMilagreDeCriatura({ elemento: 'Escuridão' }))).toBeNull();
  });
});

describe('bloqueioAprenderMagia com milagre', () => {
  const CURA = { key: 'cura', nome: 'Cura', custo: 1, tipo: 'Básica', classe: 'Milagre', nivel_1: 'a' };
  const LUZ = { key: 'luz', nome: 'Luz', custo: 1, tipo: 'Básica', classe: 'Feitiço', nivel_1: 'a' };
  const base = { experiencia: 100000, intelecto_base: 3, aura_base: 2, magias: {}, estado_atual: {} };
  it('sem deus não aprende milagre', () => {
    expect(G.bloqueioAprenderMagia(CURA, { ...base, profissao: 'Sacerdote', deus: null }, [CURA]).motivo).toBe('milagre_sem_religiao');
  });
  it('Mago não aprende milagre, aprende feitiço', () => {
    const mago = { ...base, profissao: 'Mago', deus: 'Lena' };
    expect(G.bloqueioAprenderMagia(CURA, mago, [CURA]).motivo).toBe('milagre_escuridao');
    expect(G.bloqueioAprenderMagia(LUZ, mago, [LUZ])).toBeNull();
  });
});

describe('motivoMilagreLabel', () => {
  it('textos', () => {
    expect(G.motivoMilagreLabel('milagre_vampiro', false)).toBe('Vampiros não usam milagres.');
    expect(G.motivoMilagreLabel('milagre_escuridao', true)).toBe('Darkness cannot cast miracles.');
    expect(G.motivoMilagreLabel('alvo_milagre_sem_religiao', false)).toBe('Sem religião, não recebe milagres.');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/01-core/milagres.test.js`
Expected: FAIL — `G.atorMilagreDePj is not a function`.

- [ ] **Step 3: Implementar**

Em `src/01-core/game-data.jsx`, antes de `function bloqueioAprenderMagia`:

```js
/* ── CLASSE DA MAGIA E A REGRA DOS MILAGRES (22/10/2026) ──────────────
   "Feitiço = arcana (magos), Milagre = divina (sacerdotes), Encanto =
   artística (bardos), Transmutação = espiritual (rastreadores). Um
   personagem vampiro, lobisomem ou sem religião não pode usar ou ser alvo
   de milagres. Uma criatura de elemento 'escuridão' não pode usar milagres."
   Decisões do usuário: Escuridão vale para todo ator (Mago incluído);
   criatura não tem religião e não é barrada por isso; quem não pode usar
   por motivo PERMANENTE também não aprende; a Licantropia temporária só
   barra o uso. Espelho SQL (só os permanentes): aprender_magia. */
const CLASSES_MAGIA = ['Feitiço', 'Milagre', 'Encanto', 'Transmutação'];

function _subracaDoPj(pj, dataJogo) {
  if (typeof subracaEfetiva === 'function') return subracaEfetiva(pj, dataJogo);
  return (pj && pj.subraca) || null;
}

function atorMilagreDePj(pj, dataJogo) {
  return {
    tipo: 'pj',
    deus: (pj && pj.deus) || null,
    subraca: _subracaDoPj(pj, dataJogo),
    subraca_fixa: (pj && pj.subraca) || null,
    subtipo: null,
    elementos: chavesDeElemento(elementoDaProfissao(pj && pj.profissao)),
  };
}

function atorMilagreDeCriatura(cri) {
  return {
    tipo: 'criatura', deus: null, subraca: null, subraca_fixa: null,
    subtipo: (cri && cri.subtipo) || null,
    elementos: chavesDeElemento(cri && cri.elemento),
  };
}

function _forma(ator, permanente) {
  if (!ator) return null;
  if (ator.tipo === 'criatura') return ator.subtipo || null;
  return permanente ? ator.subraca_fixa : ator.subraca;
}

function bloqueioMilagre(ator, opcoes) {
  if (!ator) return null;
  const forma = _forma(ator, !!(opcoes && opcoes.permanente));
  if (forma === 'Vampiro') return { motivo: 'milagre_vampiro' };
  if (forma === 'Lobisomem') return { motivo: 'milagre_lobisomem' };
  if (ator.tipo === 'pj' && !String(ator.deus || '').trim()) return { motivo: 'milagre_sem_religiao' };
  if ((ator.elementos || []).includes('escuridao')) return { motivo: 'milagre_escuridao' };
  return null;
}

function alvoDeMilagreBloqueado(ator) {
  if (!ator) return null;
  const forma = _forma(ator, false);
  if (forma === 'Vampiro') return { motivo: 'alvo_milagre_vampiro' };
  if (forma === 'Lobisomem') return { motivo: 'alvo_milagre_lobisomem' };
  if (ator.tipo === 'pj' && !String(ator.deus || '').trim()) return { motivo: 'alvo_milagre_sem_religiao' };
  return null;
}

function motivoMilagreLabel(motivo, en) {
  const t = {
    milagre_vampiro:           ['Vampiros não usam milagres.', 'Vampires cannot use miracles.'],
    milagre_lobisomem:         ['Lobisomens não usam milagres.', 'Werewolves cannot use miracles.'],
    milagre_sem_religiao:      ['Sem religião, não há milagre.', 'Without a faith, there is no miracle.'],
    milagre_escuridao:         ['A Escuridão não conjura milagres.', 'Darkness cannot cast miracles.'],
    alvo_milagre_vampiro:      ['Vampiros não recebem milagres.', 'Vampires cannot receive miracles.'],
    alvo_milagre_lobisomem:    ['Lobisomens não recebem milagres.', 'Werewolves cannot receive miracles.'],
    alvo_milagre_sem_religiao: ['Sem religião, não recebe milagres.', 'Without a faith, cannot receive miracles.'],
  }[motivo];
  return t ? t[en ? 1 : 0] : null;
}
```

`chavesDeElemento` e `elementoDaProfissao` ficam mais abaixo no arquivo (bloco de elementos); são `function` declarations, então o hoisting cobre.

Em `bloqueioAprenderMagia`, logo depois de `if (passos >= 5) …`:

```js
  if (magia.classe === 'Milagre') {
    const bm = bloqueioMilagre(atorMilagreDePj(pj), { permanente: true });
    if (bm) return bm;
  }
```

Export: acrescente `CLASSES_MAGIA, atorMilagreDePj, atorMilagreDeCriatura, bloqueioMilagre, alvoDeMilagreBloqueado, motivoMilagreLabel,` ao `Object.assign(window, …)`.

Em `src/07-inventario/inventario.jsx`, `motivoAprenderLabel`: logo no começo,

```js
  const _mil = (typeof window !== 'undefined' && window.motivoMilagreLabel) || null;
  const txtMilagre = _mil && _mil(motivo, en);
  if (txtMilagre) return txtMilagre;
```

E inclua `classe` no `select` do `magiasDb` do inventário (`'key,nome,custo,tipo,classe,descricao,…'`).

- [ ] **Step 4: Rodar**

Run: `npx vitest run src/01-core/milagres.test.js src/01-core/pontos-magia.test.js src/07-inventario`
Expected: PASS.

- [ ] **Step 5: Commit** (só o próprio diff em `game-data.jsx` e `inventario.jsx`)

---

### Task 3: Batalha — milagre bloqueado na lista e alvo inválido

**Files:**
- Modify: `src/12-batalha/batalha.jsx` (`magiasConhecidasDoAtor` ~938; `magiasOfensivasDoAtor` ~1000; `magiasDeApoioDoAtor` ~1042; snapshot ~1740 e ~1810; `alvoPermitidoParaMagia` ~5608; opções da UI ~9461)
- Create: `src/12-batalha/milagres-batalha.test.js`

**Interfaces:**
- Consumes: Task 2 (`atorMilagreDePj`, `atorMilagreDeCriatura`, `bloqueioMilagre`, `alvoDeMilagreBloqueado`, `motivoMilagreLabel`).
- Produces: cada entrada das listas ofensiva/apoio ganha `bloqueio_milagre: null | { motivo }`; snapshot de PJ ganha `deus`, de criatura `subtipo`; `alvoPermitidoParaMagia` devolve `motivo: 'alvo_milagre_*'`.

- [ ] **Step 1: Teste (falha)**

Create `src/12-batalha/milagres-batalha.test.js` (imports como `magia-de-item.test.js`: copy, constants, helpers, inventario-helpers, game-data, tecnicas-efeito, magias-efeito, batalha, tabuleiro):

```js
const CURA = { key: 'curas_fisicas', nome: 'Curas Físicas', classe: 'Milagre', tipo: 'Básica',
  duracao: 'Instantânea', evocacao: 'Instantânea', alcance: 'Toque', nivel_1: 'Cura 4 pontos de Energia Física.' };
const FOGO = { key: 'bola_de_fogo', nome: 'Bola de Fogo', classe: 'Feitiço', tipo: 'Básica',
  duracao: 'Instantânea', evocacao: 'Instantânea', alcance: '20 metros', nivel_1: 'Causa 4 de dano elemental de fogo.' };
const catalogos = (pj, cri) => ({
  pjById: pj ? { 7: { id: 7, ...pj } } : {},
  criById: cri ? { 9: { id: 9, ...cri } } : {},
  magiasByKey: { curas_fisicas: CURA, bola_de_fogo: FOGO },
  catalogoBySlug: {},
});
const PJ = { tipo: 'pj', ref_id: 7 };
const CRI = { tipo: 'criatura', ref_id: 9 };

describe('milagre na lista de magias', () => {
  it('Mago com Curas Físicas aprendida: aparece, bloqueada pela Escuridão', () => {
    const lista = M.magiasDeApoioDoAtor(PJ, catalogos({ profissao: 'Mago', deus: 'Lena', magias: { curas_fisicas: 1 } }));
    const cura = lista.find((m) => m.key === 'curas_fisicas');
    expect(cura).toBeTruthy();
    expect(cura.bloqueio_milagre).toEqual({ motivo: 'milagre_escuridao' });
  });
  it('Sacerdote de Lena: livre', () => {
    const lista = M.magiasDeApoioDoAtor(PJ, catalogos({ profissao: 'Sacerdote', deus: 'Lena', magias: { curas_fisicas: 1 } }));
    expect(lista.find((m) => m.key === 'curas_fisicas').bloqueio_milagre).toBeNull();
  });
  it('feitiço não é afetado', () => {
    const lista = M.magiasOfensivasDoAtor(PJ, catalogos({ profissao: 'Sacerdote', deus: null, magias: { bola_de_fogo: 1 } }));
    expect(lista.find((m) => m.key === 'bola_de_fogo').bloqueio_milagre).toBeNull();
  });
  it('criatura "Fogo, Escuridão" com milagre no catálogo: bloqueada', () => {
    const lista = M.magiasDeApoioDoAtor(CRI, catalogos(null, { elemento: 'Fogo, Escuridão', estagio: 3, magia: 'Curas Físicas' }));
    expect(lista.find((m) => m.key === 'curas_fisicas').bloqueio_milagre).toEqual({ motivo: 'milagre_escuridao' });
  });
});

describe('alvo de milagre', () => {
  it('PJ vampiro, PJ sem deus e criatura lobisomem não são alvo; Mago é', () => {
    expect(M.alvoPermitidoParaMagia({ tipo: 'pj', deus: 'Lena', subraca: 'Vampiro', elemento: 'Luz' }, 'curas_fisicas', CURA, 1))
      .toEqual({ pode: false, motivo: 'alvo_milagre_vampiro' });
    expect(M.alvoPermitidoParaMagia({ tipo: 'pj', deus: null, elemento: 'Fogo' }, 'curas_fisicas', CURA, 1).motivo)
      .toBe('alvo_milagre_sem_religiao');
    expect(M.alvoPermitidoParaMagia({ tipo: 'criatura', subtipo: 'Lobisomem', elemento: 'Terra' }, 'curas_fisicas', CURA, 1).motivo)
      .toBe('alvo_milagre_lobisomem');
    expect(M.alvoPermitidoParaMagia({ tipo: 'pj', deus: 'Lena', elemento: 'Escuridão' }, 'curas_fisicas', CURA, 1).pode).toBe(true);
  });
  it('feitiço não liga para religião', () => {
    expect(M.alvoPermitidoParaMagia({ tipo: 'pj', deus: null }, 'bola_de_fogo', FOGO, 1).pode).toBe(true);
  });
});
```

Ajuste os nomes/chaves das magias aos do registro (`magiaEfeitoDe`) se `curas_fisicas` não tiver entrada nele (`magiasDeApoioDoAtor` exige registro): use uma magia de apoio que o `magias-efeito.jsx` registre (confira com `grep -n "curas_fisicas\|bencao" src/01-core/magias-efeito.jsx`) e copie o texto de nível do registro dela. Se `M.alvoPermitidoParaMagia` não estiver exposto em `MotorBatalha`, exponha-o (procure o objeto `MotorBatalha` no fim de `batalha.jsx`).

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/12-batalha/milagres-batalha.test.js`; Expected: FAIL (`bloqueio_milagre` undefined).

- [ ] **Step 3: Implementar**

(a) Função local em `batalha.jsx`, perto de `magiasConhecidasDoAtor`:

```js
/* Milagre (22/10/2026): quem não pode usar continua VENDO a magia, desativada
   com o motivo — Mago que aprendeu Curas antes da regra não fica sem saber
   por que ela sumiu. */
function bloqueioMilagreDoAtor(ator, catalogos, magia) {
  if (!magia || magia.classe !== 'Milagre' || typeof bloqueioMilagre !== 'function') return null;
  if (ator.tipo === 'pj') {
    const pj = catalogos.pjById && catalogos.pjById[ator.ref_id];
    return pj ? bloqueioMilagre(atorMilagreDePj(pj, catalogos.dataJogo)) : null;
  }
  if (ator.tipo === 'criatura') {
    const cri = catalogos.criById && catalogos.criById[ator.ref_id];
    return cri ? bloqueioMilagre(atorMilagreDeCriatura(cri)) : null;
  }
  return null;
}
```

(b) Em `magiasOfensivasDoAtor` e `magiasDeApoioDoAtor`, no objeto empurrado (`out.push({ … })`), acrescente `bloqueio_milagre: bloqueioMilagreDoAtor(ator, catalogos, m),`.

(c) Snapshot: no bloco do PJ (onde já há `elemento: … elementoDaProfissao(pj.profissao)`), acrescente `deus: pj.deus || null,`; no da criatura (onde há `raca: c.tipo || null`), acrescente `subtipo: c.subtipo || null,`.

(d) `alvoPermitidoParaMagia`: no começo, antes do `const reg = …`:

```js
  // Milagre (22/10/2026): vampiro, lobisomem e PJ sem religião não recebem.
  if (magia && magia.classe === 'Milagre' && typeof alvoDeMilagreBloqueado === 'function' && alvoP) {
    const ator = alvoP.tipo === 'criatura'
      ? { tipo: 'criatura', subtipo: alvoP.subtipo || null }
      : { tipo: 'pj', deus: alvoP.deus, subraca: alvoP.subraca || null };
    const b = alvoDeMilagreBloqueado(ator);
    if (b) return { pode: false, motivo: b.motivo };
  }
```

Confira as chamadas de `alvoPermitidoParaMagia` que hoje passam `magia` nulo (a de UI ~9513 e a de área ~5798): onde a magia do catálogo estiver à mão, passe-a, para que área e aura também pulem o alvo.

(e) UI (~9461): `opcaoMagia` e `disabled` consideram também o milagre:

```js
  const motivoMilagre = (m) => (m.bloqueio_milagre && typeof motivoMilagreLabel === 'function'
    ? motivoMilagreLabel(m.bloqueio_milagre.motivo, lang === 'en') : null);
  const opcaoMagia = (m) => (m.evocacao_bloqueada
    ? `${m.nome} · ${tb.magiaRitual}`
    : motivoMilagre(m) ? `${m.nome} · ${motivoMilagre(m)}`
    : `${m.nome}${m.item ? ` · ${m.item.nome}` : ''}`);
```

e `disabled: !!m.evocacao_bloqueada || !!m.bloqueio_milagre` nas duas listas. Onde a UI desabilita Lançar por `evocacao_bloqueada` (~9841), acrescente `&& !apoioSel.bloqueio_milagre`; e o mesmo no fluxo ofensivo (procure `magiaSel.evocacao_bloqueada` ou o equivalente). Na mensagem de alvo inválido, o motivo `alvo_milagre_*` usa `motivoMilagreLabel`.

- [ ] **Step 4: Rodar** — `npx vitest run src/12-batalha`; Expected: PASS.

- [ ] **Step 5: Commit** (só o próprio diff de `batalha.jsx`)

---

### Task 4: Ficha — Evocar e alvos

**Files:**
- Modify: `src/11-ficha/ficha.jsx` (`MagiaDetalhesModal` ~1106; carga dos colegas ~2487)
- Create: `src/11-ficha/milagre-evocar.test.jsx`

**Interfaces:**
- Consumes: Task 2; Task 1 (`get_pjs_historia` com `deus`, `subraca`).
- Produces: `MagiaDetalhesModal` desativa Evocar de milagre para quem `bloqueioMilagre(atorMilagreDePj(eu))` e tira da lista de alvos os colegas com `alvoDeMilagreBloqueado`.

- [ ] **Step 1: Teste (falha)** — `src/11-ficha/milagre-evocar.test.jsx`: renderiza `window.MagiaDetalhesModal` (imports como `ficha-info-nav.test.jsx` + `../09-bestiario/bestiario.jsx` e dependências que o modal usa — `BestDetalheModal`, `BestMagiaFicha`, `BestLinha`) com `magia = { key:'cura', nome:'Cura', classe:'Milagre', alcance:'Toque', nivel_1:'x' }`, `passos=1`, `onEvocar=vi.fn()`, e:
  - `eu = { id: 1, nome: 'Ana', profissao: 'Sacerdote', deus: 'Lena' }`, `colegas = [{ id: 2, nome: 'Bia', deus: null }, { id: 3, nome: 'Caio', deus: 'Lena' }]` → a lista de alvos tem Ana e Caio, não Bia;
  - `eu = { … profissao: 'Mago', deus: 'Lena' }` → o botão Evocar fica desativado e a dica/texto contém "A Escuridão não conjura milagres.".
  Copie do teste existente do Evocar (`grep -rln "MagiaDetalhesModal" src --include=*.test.*`) o jeito de achar a lista de alvos e o botão.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** em `MagiaDetalhesModal`:

```js
  // Milagre (22/10/2026): quem não pode usar não evoca; quem não pode
  // receber não aparece como alvo.
  const ehMilagre = m.classe === 'Milagre';
  const _bm = window.bloqueioMilagre, _ab = window.alvoDeMilagreBloqueado, _ap = window.atorMilagreDePj;
  const bloqueioMil = ehMilagre && _bm && _ap && eu ? _bm(_ap(eu)) : null;
  const alvoOk = (c) => !(ehMilagre && _ab && _ap && _ab(_ap(c)));
```

  Filtre `eu` e `colegas` por `alvoOk` ao montar `ALVOS` (o próprio `eu` também pode ser alvo bloqueado: PJ sem deus não cura a si mesmo com milagre), acrescente `&& !bloqueioMil` a `podeEvocar`, e mostre `window.motivoMilagreLabel(bloqueioMil.motivo, en)` onde o modal já mostra o porquê de não poder evocar (procure `ritual` no JSX, que já tem esse caminho de motivo).

  Os colegas vêm de `get_pjs_historia`: nenhuma mudança no front além de ela trazer `deus` e `subraca` (Task 1).
- [ ] **Step 4: Rodar** — `npx vitest run src/11-ficha`; Expected: PASS.
- [ ] **Step 5: Commit** (só o próprio diff de `ficha.jsx`).

---

### Task 5: A classe à vista (admin, bestiário/ficha, Estudar)

**Files:**
- Modify: `src/09-bestiario/catalogo-descritores.jsx` (magias, ~133); `src/01-core/constants.jsx` (`ADMIN_COPY` `campoClasse`)
- Modify: `src/09-bestiario/bestiario.jsx` (`BestMagiaFicha`, ~2665)
- Modify: `src/07-inventario/inventario.jsx` (`EstudarMagiaModal`: `estudar-tipo`)
- Modify: `src/09-bestiario/catalogo-descritores.test.js` (lista de colunas de magias, linha ~24)
- Test: `src/09-bestiario/catalogo-editor.test.jsx`, `src/07-inventario/estudar-magia.test.jsx`

- [ ] **Step 1: Testes (falham)**
  - `catalogo-editor.test.jsx`: `montar({ tabela: 'magias', linha: { key:'bola', nome:'Bola', classe:'Feitiço' } })` → existe o campo `classe` e as opções são exatamente as 4 classes (use `opcoesMulti`/pill helpers do arquivo, como o caso de `tipo`).
  - `estudar-magia.test.jsx`: com `BOLA.classe = 'Feitiço'`, `.estudar-tipo` da linha mostra `Básica · Feitiço`.
  - Um caso em `fichas-em-lista.test.jsx` (já renderiza `BestMagiaFicha`): a ficha da magia mostra uma linha "Classe" com o valor.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar**
  - Descritor de magias, logo depois do campo `tipo`: `{ col: 'classe', tipo: 'opcoes', rotuloKey: 'campoClasse', obrigatorio: true, opcoes: ['Feitiço', 'Milagre', 'Encanto', 'Transmutação'] },`; `ADMIN_COPY` pt `campoClasse: 'Classe'`, en `campoClasse: 'Class'`; acrescente `'classe'` na lista de colunas de magias do `catalogo-descritores.test.js`.
  - `BestMagiaFicha`: depois da linha "Tipo", `<BestLinha rotulo={lang === 'en' ? 'Class' : 'Classe'} valor={m.classe} />`.
  - `EstudarMagiaModal`: `<span className="estudar-tipo">{[m.tipo, m.classe].filter(Boolean).join(' · ')}</span>`.
- [ ] **Step 4: Rodar** — `npx vitest run src/09-bestiario src/07-inventario`; Expected: PASS.
- [ ] **Step 5: Commit.**

---

### Task 6: Aplicar o banco, verificar tudo e publicar

- [ ] **Step 1:** `npm test`, `npm run build`, `npx eslint src` (erros só os 10 pré-existentes de `ui-bridge.ts`, `badge.tsx`, `button.tsx`, `bridge.ts`, `setup-fases.ts`).
- [ ] **Step 2:** Aplicar pelo MCP, nesta ordem e com `COMMIT`: `classes-de-magia-2026-10-22.sql`, a RPC atualizada (`aprender-magia-rpc-2026-10-22.sql`), `pjs-historia-deus-subraca-2026-10-22.sql`. Conferir: `select classe, count(*) from magias group by 1` (soma 239) e o ensaio da Task 1 Step 4 (com `ROLLBACK`).
- [ ] **Step 3:** `get_advisors` (security): nada novo além do já conhecido.
- [ ] **Step 4:** Revisão final do branch (revisor dedicado), corrigir Critical/Important com teste RED→GREEN, suíte verde.
- [ ] **Step 5: Publicar.** O Vercel CLI não está instalado: `npm i -g vercel`, depois `vercel --prod` na raiz (o usuário publica "com vercel da cópia local"; o projeto já está ligado se existir `.vercel/project.json` — confira; se pedir login/link, pare e peça ao usuário rodar `! vercel login`). **Atenção:** a cópia local inclui as alterações pendentes de sub-raça; elas vão junto no deploy.
- [ ] **Step 6:** Push dos commits; relatar a URL do deploy.
