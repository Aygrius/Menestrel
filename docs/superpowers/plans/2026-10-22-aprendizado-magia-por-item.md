# Aprendizado de magia por item — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toda magia passa a ser aprendida usando um item (pergaminho, ou livro que vincula pergaminhos), sem restrição de profissão, com orçamento de pontos novo para as seis profissões.

**Architecture:** O banco ganha um pergaminho único por magia e a tabela `livro_pergaminhos`; a RPC `aprender_magia` valida e grava um nível por vez sem consumir o item. No front, a regra (pontos e bloqueios) mora em `01-core/game-data.jsx` como funções puras espelhadas no SQL; o inventário ganha o modal *Estudar*; o stepper de magias sai do criador; a ficha lista só as magias aprendidas e mostra os pontos; o admin de itens edita o vínculo livro→pergaminhos.

**Tech Stack:** React 19 + Vite (arquivos `.jsx` globais via `window`), Vitest + Testing Library, Supabase Postgres (PL/pgSQL, RLS), MCP `supabase-write` para aplicar SQL.

**Spec:** `docs/superpowers/specs/2026-10-22-aprendizado-magia-por-item-design.md`

## Global Constraints

- Pontos por estágio = `(aura < 0 ? 0 : base) + max(0, intelecto) + max(0, aura)`; total = por estágio × estágio.
- Base: Mago 8 · Bardo 8 · Rastreador 5 · Sacerdote 5 · Guerreiro 1 · Ladino 1.
- Intelecto/aura = `intelecto_base` / `aura_base` gravados (ver Task 1, emenda da spec).
- Gasto = `custo × nível efetivo` (1/3/5/7/9), como hoje (`gastoMagias`).
- Custos: Básica 1–2 · Perdida 2–3 · Ancestral 3–4.
- Um pergaminho por magia: slug `pergaminho_<key>`, nome `Pergaminho <Magia>`, `nivel_magia NULL`. Usar **não consome**.
- Sobe **um** nível por uso; teto nível efetivo ≤ estágio; nível sem texto não se aprende.
- Nenhuma checagem de profissão/especialização no aprendizado.
- Toda UI nova passa pela skill `impeccable` (CLAUDE.md); confirmação de modal no `.ms-footer`; ícones Tabler com versão filled quando existir.
- Commits direto na `main` (memória do usuário), mensagem em português, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Commitar só os arquivos da task (`git commit -- <arquivos>`): o working tree tem alterações pendentes de outro trabalho que NÃO entram.
- Testes: `npx vitest run <arquivo>`; suíte inteira `npm test`; build `npm run build`.

## Review Focus

1. **Item à venda** (instância com `anuncio_id`): não pode ensinar — a RPC recusa `item_a_venda` e o modal mostra o motivo (teste na Task 2 e Task 4).
2. **Salvar a edição do personagem depois de aprender magia**: o wizard não pode regravar `magias` antigo por cima do que a RPC gravou — o payload de edição omite `magias` (teste na Task 6).
3. **PJ com gasto acima do orçamento novo** (PJs preservados): a ficha mostra gasto > total sem quebrar, e todo "Aprender" fica bloqueado com `pontos_insuficientes` (teste na Task 3).
4. **Livro sem vínculo / pergaminho de magia apagada**: livro sem pergaminhos não ganha "Estudar"; pergaminho cuja magia não está no catálogo mostra `magia_nao_encontrada` (teste na Task 4).
5. **Mesma magia em dois livros do PJ / pergaminho e livro juntos**: o modal lista a magia uma vez por item e aprender por um reflete no outro após recarregar (teste de dedupe na Task 4).

---

### Task 1: Script SQL de catálogo e migração (escrito e ensaiado, não aplicado)

**Files:**
- Create: `scripts/sql/aprendizado-magia-por-item-2026-10-22.sql`
- Modify: `docs/superpowers/specs/2026-10-22-aprendizado-magia-por-item-design.md` (duas emendas)

**Interfaces:**
- Produces: tabela `public.livro_pergaminhos(livro_slug, pergaminho_slug)`; itens `pergaminho_<key>` para toda magia; livros `livro_do_mago`, `livro_do_bardo`, `livro_do_rastreador`, `livro_do_cacador`, `livro_do_explorador`, `livro_do_guardiao`.

- [ ] **Step 1: Emendar a spec**

Em `## 2. Regra de aprendizado → Fórmula de pontos`, troque o parágrafo "Intelecto e aura **permanentes** …" por:

```markdown
Intelecto e aura = `intelecto_base` / `aura_base` como gravados (raça
incluída). A sub-raça fica de fora: os ajustes de raça/sub-raça vivem só em
`GAME_DATA` (JS), e o espelho SQL não os conhece — usar o valor gravado é o
que mantém JS e RPC idênticos. (Emenda de 22/10/2026, no plano.)
```

Em `## 3. Telas`, troque o parágrafo "Saem do código: …" por:

```markdown
Saem do código as regras de **aprendizado** por permissão:
`podeAcessarMagia`, `magiaEhTravada`, `profissaoUsaMagia` e o filtro por
`permissao` na ficha, no criador e no inventário. Ficam, só como
**informação**, as leituras de `permissao` no bestiário (filtro por
profissão, "Exclusividade"), no painel de auditoria (`magias-efeito.jsx`) e
na divisão Básicas/Avançadas da ficha (`magiaEhAvancada`) — elas somem
junto com a coluna, na limpeza posterior. (Emenda de 22/10/2026, no plano.)
```

- [ ] **Step 2: Escrever o script**

Create `scripts/sql/aprendizado-magia-por-item-2026-10-22.sql`:

```sql
-- scripts/sql/aprendizado-magia-por-item-2026-10-22.sql
-- ============================================================
-- Aprendizado de magia por item (spec 2026-10-22-aprendizado-magia-por-item).
--
-- Pedido do usuário (22/10/2026): "todas as magias precisam ser aprendidas
-- através do uso do item [...] qualquer profissão pode aprender qualquer
-- magia." Um pergaminho por magia (todos os níveis), que NÃO se consome; os
-- de Básica ficam vinculados a livros (livro_pergaminhos).
--
-- IDEMPOTENTE. Guardas no fim derrubam a transação se algo ficar torto.
-- REVERTER: restaurar de backup_pergaminhos_2026_10_22,
-- backup_inventario_pergaminhos_2026_10_22 e backup_magias_custo_2026_10_22.
-- ============================================================

BEGIN;

-- 0. Backups (sem policy: invisíveis para a API) ------------------------
CREATE TABLE IF NOT EXISTS public.backup_pergaminhos_2026_10_22 AS
  SELECT * FROM public.itens WHERE grupo = 'Consumíveis' AND slug LIKE 'pergaminho\_%';
CREATE TABLE IF NOT EXISTS public.backup_inventario_pergaminhos_2026_10_22 AS
  SELECT id, inventario FROM public.personagens WHERE inventario::text LIKE '%"pergaminho\_%';
CREATE TABLE IF NOT EXISTS public.backup_magias_custo_2026_10_22 AS
  SELECT key, custo FROM public.magias;
ALTER TABLE public.backup_pergaminhos_2026_10_22            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_inventario_pergaminhos_2026_10_22 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_magias_custo_2026_10_22           ENABLE ROW LEVEL SECURITY;

-- 1. Custos por tipo ----------------------------------------------------
-- Básica 1→1, ≥2→2 · Perdida ≤2→2, ≥3→3 · Ancestral ≤3→3, 4→4.
UPDATE public.magias SET custo = CASE tipo
    WHEN 'Básica'    THEN LEAST(GREATEST(custo, 1), 2)
    WHEN 'Perdida'   THEN LEAST(GREATEST(custo, 2), 3)
    WHEN 'Ancestral' THEN LEAST(GREATEST(custo, 3), 4)
  END
WHERE tipo IN ('Básica', 'Perdida', 'Ancestral');

-- 2. Pergaminho único por magia -----------------------------------------
-- 2a. Quem já tem o slug novo (Milagre Análogo, Energia Primordial) vira o molde.
UPDATE public.itens i SET
  nome = 'Pergaminho ' || m.nome,
  magia = m.nome,
  nivel_magia = NULL,
  origem = CASE WHEN m.tipo = 'Básica' THEN 'Comum' ELSE 'Raro' END,
  descricao = 'Pergaminho com instruções para o aprendizado da magia ' || m.nome || '.',
  atualizado_em = now()
FROM public.magias m
WHERE i.slug = 'pergaminho_' || m.key;

-- 2b. Cria o que falta.
INSERT INTO public.itens
  (slug, nome, grupo, ocupa, tipo, origem, icone, magia, nivel_magia, descricao, dano_l, dano_m, dano_p)
SELECT
  'pergaminho_' || m.key, 'Pergaminho ' || m.nome, 'Consumíveis', 0.1, 'S',
  CASE WHEN m.tipo = 'Básica' THEN 'Comum' ELSE 'Raro' END,
  'ti-file-star', m.nome, NULL,
  'Pergaminho com instruções para o aprendizado da magia ' || m.nome || '.',
  0, 0, 0
FROM public.magias m
WHERE NOT EXISTS (SELECT 1 FROM public.itens i WHERE i.slug = 'pergaminho_' || m.key);

-- 3. Mapa pergaminho por nível → pergaminho único -----------------------
CREATE TEMP TABLE _mapa_perg ON COMMIT DROP AS
SELECT i.slug AS antigo, 'pergaminho_' || m.key AS novo
  FROM public.itens i
  JOIN public.magias m
    ON btrim(lower(m.nome)) = btrim(lower(i.magia))
    OR btrim(lower(m.key))  = btrim(lower(i.magia))
 WHERE i.grupo = 'Consumíveis'
   AND i.slug LIKE 'pergaminho\_%'
   AND i.nivel_magia IS NOT NULL
   AND i.slug <> 'pergaminho_' || m.key;

-- 4. Instâncias nos inventários: troca o slug e deixa UMA por magia ------
-- (o item não se consome; cópias não têm uso). O trigger
-- personagens_inventario_versao sobe inventario_versao sozinho.
WITH alvo AS (
  SELECT p.id, p.inventario
    FROM public.personagens p
   WHERE EXISTS (
     SELECT 1 FROM jsonb_array_elements(coalesce(p.inventario->'itens', '[]'::jsonb)) e
       JOIN _mapa_perg mp ON mp.antigo = e->>'slug')
), trocado AS (
  SELECT a.id, e.ord,
         CASE WHEN mp.novo IS NOT NULL
              THEN jsonb_set(jsonb_set(e.val, '{slug}', to_jsonb(mp.novo)), '{quantidade}', '1'::jsonb)
              ELSE e.val END AS val
    FROM alvo a
    CROSS JOIN LATERAL jsonb_array_elements(a.inventario->'itens') WITH ORDINALITY AS e(val, ord)
    LEFT JOIN _mapa_perg mp ON mp.antigo = e.val->>'slug'
), numerado AS (
  SELECT id, ord, val,
         row_number() OVER (PARTITION BY id, val->>'slug' ORDER BY ord) AS rn,
         (val->>'slug') LIKE 'pergaminho\_%' AS eh_perg
    FROM trocado
), novo AS (
  SELECT id, jsonb_agg(val ORDER BY ord) AS itens
    FROM numerado
   WHERE NOT (eh_perg AND rn > 1)
   GROUP BY id
)
UPDATE public.personagens p
   SET inventario = jsonb_set(p.inventario, '{itens}', novo.itens)
  FROM novo
 WHERE p.id = novo.id;

-- 5. Apaga os pergaminhos por nível -------------------------------------
DELETE FROM public.itens i USING _mapa_perg mp WHERE i.slug = mp.antigo;

-- 6. Livros novos -------------------------------------------------------
INSERT INTO public.itens (slug, nome, grupo, ocupa, tipo, origem, icone, descricao, dano_l, dano_m, dano_p)
SELECT v.slug, v.nome, 'Itens', l.ocupa, l.tipo, l.origem, l.icone, v.descricao, 0, 0, 0
  FROM (VALUES
    ('livro_do_mago',       'Livro do Mago',                       'Livro com as magias difundidas entre os magos.'),
    ('livro_do_bardo',      'Livro do Bardo',                      'Livro com as magias difundidas entre os bardos.'),
    ('livro_do_rastreador', 'Livro do Rastreador',                 'Livro com as magias difundidas entre os rastreadores.'),
    ('livro_do_cacador',    'Livro da Trilha dos Caçadores',       'Livro da trilha dos caçadores.'),
    ('livro_do_explorador', 'Livro da Trilha dos Exploradores',    'Livro da trilha dos exploradores.'),
    ('livro_do_guardiao',   'Livro da Trilha dos Guardiões',       'Livro da trilha dos guardiões.')
  ) AS v(slug, nome, descricao)
  -- Molde físico: o livro de Ordem que já existe.
  CROSS JOIN (SELECT ocupa, tipo, origem, icone FROM public.itens WHERE slug = 'livro_do_justiceiro') l
 WHERE NOT EXISTS (SELECT 1 FROM public.itens i WHERE i.slug = v.slug);

-- 7. Tabela de vínculo --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.livro_pergaminhos (
  livro_slug      text NOT NULL REFERENCES public.itens(slug) ON UPDATE CASCADE ON DELETE CASCADE,
  pergaminho_slug text NOT NULL REFERENCES public.itens(slug) ON UPDATE CASCADE ON DELETE CASCADE,
  PRIMARY KEY (livro_slug, pergaminho_slug)
);
CREATE INDEX IF NOT EXISTS livro_pergaminhos_pergaminho_idx ON public.livro_pergaminhos (pergaminho_slug);
ALTER TABLE public.livro_pergaminhos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS livro_pergaminhos_leitura ON public.livro_pergaminhos;
DROP POLICY IF EXISTS livro_pergaminhos_admin_insert ON public.livro_pergaminhos;
DROP POLICY IF EXISTS livro_pergaminhos_admin_delete ON public.livro_pergaminhos;
CREATE POLICY livro_pergaminhos_leitura      ON public.livro_pergaminhos FOR SELECT USING (true);
CREATE POLICY livro_pergaminhos_admin_insert ON public.livro_pergaminhos FOR INSERT WITH CHECK (eh_admin());
CREATE POLICY livro_pergaminhos_admin_delete ON public.livro_pergaminhos FOR DELETE USING (eh_admin());

-- 8. Carga inicial: Básicas, a partir de `permissao` --------------------
CREATE TEMP TABLE _perm_livro (perm text, livro_slug text) ON COMMIT DROP;
INSERT INTO _perm_livro VALUES
  ('Mago', 'livro_do_mago'), ('Bardo', 'livro_do_bardo'), ('Rastreador', 'livro_do_rastreador'),
  ('Sacerdote', 'livro_do_deus_blator'),   ('Sacerdote', 'livro_do_deus_cambu'),
  ('Sacerdote', 'livro_da_deusa_crezir'),  ('Sacerdote', 'livro_do_deus_crizagom'),
  ('Sacerdote', 'livro_do_deus_cruine'),   ('Sacerdote', 'livro_da_deusa_ganis'),
  ('Sacerdote', 'livro_da_deusa_lena'),    ('Sacerdote', 'livro_da_deusa_maira'),
  ('Sacerdote', 'livro_do_deus_palier'),   ('Sacerdote', 'livro_do_deus_parom'),
  ('Sacerdote', 'livro_do_deus_plandis'),  ('Sacerdote', 'livro_do_deus_selimon'),
  ('Sacerdote', 'livro_do_deus_sevides'),
  ('Ordem de Blator', 'livro_do_senhor_da_guerra'), ('Ordem de Cambu', 'livro_do_diplomata_dourado'),
  ('Ordem de Crezir', 'livro_do_dragao_vermelho'),  ('Ordem de Crizagom', 'livro_do_justiceiro'),
  ('Ordem de Cruine', 'livro_do_vingador_negro'),   ('Ordem de Ganis', 'livro_do_filho_do_mar'),
  ('Ordem de Lena', 'livro_do_vigario_rosa'),       ('Ordem de Maira', 'livro_do_runcaim'),
  ('Ordem de Palier', 'livro_do_sabio'),            ('Ordem de Parom', 'livro_do_mestre_da_forja'),
  ('Ordem de Plandis', 'livro_do_oraculo'),         ('Ordem de Selimon', 'livro_do_pacificador'),
  ('Ordem de Sevides', 'livro_do_filho_da_terra'),
  ('Colégio Alquímico', 'livro_do_alquimista'),     ('Colégio Elemental', 'livro_do_elementalista'),
  ('Colégio Filosófico', 'livro_do_filosofo'),      ('Colégio Ilusionista', 'livro_do_ilusionista'),
  ('Colégio Naturalista', 'livro_do_xama'),         ('Colégio Necromântico', 'livro_do_necromante'),
  ('Confraria de Arautos', 'livro_do_arauto'),      ('Confraria de Artistas', 'livro_do_artista'),
  ('Confraria de Eruditos', 'livro_do_erudito'),
  ('Trilha de Caçadores', 'livro_do_cacador'),      ('Trilha de Exploradores', 'livro_do_explorador'),
  ('Trilha de Guardiões', 'livro_do_guardiao');

INSERT INTO public.livro_pergaminhos (livro_slug, pergaminho_slug)
SELECT DISTINCT pl.livro_slug, 'pergaminho_' || m.key
  FROM public.magias m
  CROSS JOIN LATERAL unnest(string_to_array(m.permissao, ',')) AS p(x)
  JOIN _perm_livro pl ON pl.perm = btrim(p.x)
 WHERE m.tipo = 'Básica'
ON CONFLICT DO NOTHING;

-- 9. Guardas ------------------------------------------------------------
DO $$
DECLARE n int;
BEGIN
  -- todo livro do de-para existe
  SELECT count(*) INTO n FROM _perm_livro pl
   WHERE NOT EXISTS (SELECT 1 FROM public.itens i WHERE i.slug = pl.livro_slug);
  IF n > 0 THEN RAISE EXCEPTION '% livro(s) do de-para não existem em itens', n; END IF;

  -- toda magia tem o seu pergaminho único
  SELECT count(*) INTO n FROM public.magias m
   WHERE NOT EXISTS (SELECT 1 FROM public.itens i
                      WHERE i.slug = 'pergaminho_' || m.key AND i.nivel_magia IS NULL);
  IF n > 0 THEN RAISE EXCEPTION '% magia(s) sem pergaminho único', n; END IF;

  -- todo pergaminho de Básica está em ao menos um livro
  SELECT count(*) INTO n FROM public.magias m
   WHERE m.tipo = 'Básica'
     AND NOT EXISTS (SELECT 1 FROM public.livro_pergaminhos lp WHERE lp.pergaminho_slug = 'pergaminho_' || m.key);
  IF n > 0 THEN RAISE EXCEPTION '% básica(s) fora de qualquer livro', n; END IF;

  -- nenhum pergaminho por nível sobrou no catálogo
  SELECT count(*) INTO n FROM public.itens
   WHERE grupo = 'Consumíveis' AND slug LIKE 'pergaminho\_%' AND nivel_magia IS NOT NULL;
  IF n > 0 THEN RAISE EXCEPTION '% pergaminho(s) por nível sobraram no catálogo', n; END IF;

  -- nenhuma instância aponta para slug que não existe mais
  SELECT count(*) INTO n FROM public.personagens p
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(p.inventario->'itens', '[]'::jsonb)) e
   WHERE (e->>'slug') LIKE 'pergaminho\_%'
     AND NOT EXISTS (SELECT 1 FROM public.itens i WHERE i.slug = e->>'slug');
  IF n > 0 THEN RAISE EXCEPTION '% instância(s) de pergaminho órfã(s)', n; END IF;

  -- custos dentro da faixa
  SELECT count(*) INTO n FROM public.magias
   WHERE (tipo = 'Básica'    AND custo NOT BETWEEN 1 AND 2)
      OR (tipo = 'Perdida'   AND custo NOT BETWEEN 2 AND 3)
      OR (tipo = 'Ancestral' AND custo NOT BETWEEN 3 AND 4);
  IF n > 0 THEN RAISE EXCEPTION '% magia(s) com custo fora da faixa', n; END IF;
END $$;

COMMIT;
```

- [ ] **Step 3: Ensaiar sem gravar**

Rode pelo MCP `mcp__supabase-write__execute_sql` o conteúdo do script com o `COMMIT;` final trocado por `ROLLBACK;`, e antes do `ROLLBACK` acrescente:

```sql
SELECT
  (SELECT count(*) FROM public.livro_pergaminhos)                                        AS vinculos,
  (SELECT count(*) FROM public.itens WHERE slug LIKE 'pergaminho\_%' AND nivel_magia IS NULL AND grupo = 'Consumíveis') AS pergaminhos,
  (SELECT count(DISTINCT livro_slug) FROM public.livro_pergaminhos)                       AS livros_com_vinculo;
```

Expected: nenhuma exceção das guardas; `pergaminhos` = número de magias (239 hoje); `livros_com_vinculo` = 41 (3 profissões + 13 deuses + 13 ordens + 6 colégios + 3 confrarias + 3 trilhas); `vinculos` na casa de 450–500. Se uma guarda disparar, corrija o script e ensaie de novo. **Não aplique de verdade nesta task** (a Task 9 aplica, depois do front pronto).

- [ ] **Step 4: Commit**

```bash
git add scripts/sql/aprendizado-magia-por-item-2026-10-22.sql docs/superpowers/specs/2026-10-22-aprendizado-magia-por-item-design.md
git commit -m "feat(magias): script de pergaminho único, livros e livro_pergaminhos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- scripts/sql/aprendizado-magia-por-item-2026-10-22.sql docs/superpowers/specs/2026-10-22-aprendizado-magia-por-item-design.md
```

---

### Task 2: RPC `aprender_magia` (escrita e ensaiada)

**Files:**
- Create: `scripts/sql/aprender-magia-rpc-2026-10-22.sql`
- Create: `scripts/sql/aprender-magia-rpc-2026-10-22.teste.sql`

**Interfaces:**
- Consumes: `livro_pergaminhos`, itens `pergaminho_<key>` (Task 1); `public._menestrel_estagio(int)` (já existe).
- Produces: `public.aprender_magia(p_pj_id bigint, p_instance_id text, p_magia_key text) RETURNS jsonb` → `{ok:true, magia, magia_nome, nivel, passos}` ou `{ok:false, motivo}` com motivo ∈ `nao_autenticado, pj_nao_encontrado, item_nao_encontrado, item_a_venda, magia_nao_encontrada, item_nao_ensina, ja_no_maximo, nivel_sem_texto, acima_do_estagio, pontos_insuficientes`. `public._menestrel_pontos_magia_por_estagio(text, int, int) RETURNS int`.

- [ ] **Step 1: Escrever o teste SQL (falha: função não existe)**

Create `scripts/sql/aprender-magia-rpc-2026-10-22.teste.sql`:

```sql
-- Ensaios da RPC aprender_magia. Roda TUDO numa transação e desfaz.
-- Usa um PJ real como cobaia (alterado só dentro da transação).
BEGIN;
DO $$
DECLARE
  v_pj   record;
  v_r    jsonb;
  v_livro text := 'livro_do_mago';
  v_mag  record;  -- uma Básica do Livro do Mago
BEGIN
  SELECT id, user_id INTO v_pj FROM public.personagens ORDER BY id LIMIT 1;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_pj.user_id::text)::text, true);

  SELECT m.key, m.custo INTO v_mag
    FROM public.livro_pergaminhos lp JOIN public.magias m ON 'pergaminho_' || m.key = lp.pergaminho_slug
   WHERE lp.livro_slug = v_livro AND m.nivel_1 IS NOT NULL AND m.nivel_3 IS NOT NULL ORDER BY m.key LIMIT 1;

  -- Mago, estágio 1 (xp 0), Int 2, Aura 1 → 11 pontos; inventário só com o livro.
  UPDATE public.personagens SET profissao = 'Mago', experiencia = 0, intelecto_base = 2, aura_base = 1,
         magias = '{}'::jsonb,
         inventario = jsonb_build_object('moedas', '{}'::jsonb, 'itens',
           jsonb_build_array(jsonb_build_object('instanceId', 'L1', 'slug', v_livro, 'quantidade', 1)))
   WHERE id = v_pj.id;

  -- 1) aprende o nível 1 pelo livro, e o livro continua lá
  v_r := public.aprender_magia(v_pj.id, 'L1', v_mag.key);
  ASSERT (v_r->>'ok')::boolean, 'ok pelo livro: ' || v_r::text;
  ASSERT (v_r->>'passos')::int = 1, 'passos 1: ' || v_r::text;
  ASSERT (SELECT jsonb_array_length(inventario->'itens') FROM public.personagens WHERE id = v_pj.id) = 1, 'livro não se consome';

  -- 2) nível 3 acima do estágio 1
  v_r := public.aprender_magia(v_pj.id, 'L1', v_mag.key);
  ASSERT v_r->>'motivo' = 'acima_do_estagio', 'acima_do_estagio: ' || v_r::text;

  -- 3) magia que o livro não ensina
  v_r := public.aprender_magia(v_pj.id, 'L1', (SELECT key FROM public.magias WHERE tipo = 'Ancestral' ORDER BY key LIMIT 1));
  ASSERT v_r->>'motivo' = 'item_nao_ensina', 'item_nao_ensina: ' || v_r::text;

  -- 4) pontos: Guerreiro Int 0 Aura 0, estágio 1 = 1 ponto; magia de custo 2 não cabe
  UPDATE public.personagens SET profissao = 'Guerreiro', intelecto_base = 0, aura_base = 0, magias = '{}'::jsonb WHERE id = v_pj.id;
  v_r := public.aprender_magia(v_pj.id, 'L1',
    (SELECT m.key FROM public.livro_pergaminhos lp JOIN public.magias m ON 'pergaminho_' || m.key = lp.pergaminho_slug
      WHERE lp.livro_slug = v_livro AND m.custo = 2 AND m.nivel_1 IS NOT NULL ORDER BY m.key LIMIT 1));
  ASSERT v_r->>'motivo' = 'pontos_insuficientes', 'pontos_insuficientes: ' || v_r::text;

  -- 5) Aura negativa zera a base: Mago Int 0 Aura -1 = 0 pontos
  UPDATE public.personagens SET profissao = 'Mago', aura_base = -1 WHERE id = v_pj.id;
  v_r := public.aprender_magia(v_pj.id, 'L1', v_mag.key);
  ASSERT v_r->>'motivo' = 'pontos_insuficientes', 'aura negativa: ' || v_r::text;

  -- 6) pergaminho avulso de Ancestral ensina a qualquer profissão
  UPDATE public.personagens SET profissao = 'Ladino', intelecto_base = 5, aura_base = 5, experiencia = 0, magias = '{}'::jsonb,
         inventario = jsonb_build_object('moedas', '{}'::jsonb, 'itens', jsonb_build_array(
           jsonb_build_object('instanceId', 'P1', 'quantidade', 1, 'slug',
             (SELECT 'pergaminho_' || key FROM public.magias WHERE tipo = 'Ancestral' AND nivel_1 IS NOT NULL ORDER BY key LIMIT 1)))))
   WHERE id = v_pj.id;
  v_r := public.aprender_magia(v_pj.id, 'P1', (SELECT key FROM public.magias WHERE tipo = 'Ancestral' AND nivel_1 IS NOT NULL ORDER BY key LIMIT 1));
  ASSERT (v_r->>'ok')::boolean, 'Ladino aprende Ancestral: ' || v_r::text;

  -- 7) item à venda não ensina
  UPDATE public.personagens SET magias = '{}'::jsonb,
         inventario = jsonb_set(inventario, '{itens,0,anuncio_id}', '1'::jsonb) WHERE id = v_pj.id;
  v_r := public.aprender_magia(v_pj.id, 'P1', (SELECT key FROM public.magias WHERE tipo = 'Ancestral' AND nivel_1 IS NOT NULL ORDER BY key LIMIT 1));
  ASSERT v_r->>'motivo' = 'item_a_venda', 'item_a_venda: ' || v_r::text;

  -- 8) instância inexistente
  v_r := public.aprender_magia(v_pj.id, 'NAO_EXISTE', v_mag.key);
  ASSERT v_r->>'motivo' = 'item_nao_encontrado', 'item_nao_encontrado: ' || v_r::text;

  -- 9) a fórmula, direto
  ASSERT public._menestrel_pontos_magia_por_estagio('Mago', 2, 1) = 11, 'Mago 2/1';
  ASSERT public._menestrel_pontos_magia_por_estagio('Rastreador', -1, 2) = 7, 'Rastreador -1/2';
  ASSERT public._menestrel_pontos_magia_por_estagio('Sacerdote', 3, -1) = 3, 'Sacerdote aura negativa';
  ASSERT public._menestrel_pontos_magia_por_estagio('Ladino', 0, 0) = 1, 'Ladino 0/0';
  RAISE NOTICE 'aprender_magia: todos os ensaios passaram';
END $$;
ROLLBACK;
```

- [ ] **Step 2: Ensaiar o teste antes da função**

O teste depende da Task 1, que ainda não está aplicada. Rode pelo MCP, numa só chamada: o script da Task 1 sem o `COMMIT;` final (só o `BEGIN;` e o corpo), seguido do conteúdo do teste **sem** o seu `BEGIN;` inicial.
Expected: erro `function public.aprender_magia(bigint, unknown, text) does not exist`.

- [ ] **Step 3: Escrever a RPC**

Create `scripts/sql/aprender-magia-rpc-2026-10-22.sql`:

```sql
-- scripts/sql/aprender-magia-rpc-2026-10-22.sql
-- ============================================================
-- RPC aprender_magia — substitui usar_pergaminho_magia (spec 2026-10-22).
-- Ensina UM nível da magia com o item da instância: o pergaminho dela, ou
-- um livro que a vincula em livro_pergaminhos. Não consome o item e não
-- confere profissão. Confere teto de estágio, texto do nível e pontos.
-- A remoção de usar_pergaminho_magia fica na Task 9 (depois do deploy).
-- ============================================================
BEGIN;

-- Pontos por estágio. ESPELHO de pontosMagiasPorEstagio (01-core/game-data.jsx):
-- mudar um sem o outro quebra o "Aprender" (a tela libera, a RPC recusa).
CREATE OR REPLACE FUNCTION public._menestrel_pontos_magia_por_estagio(p_profissao text, p_intelecto int, p_aura int)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT (CASE WHEN coalesce(p_aura, 0) < 0 THEN 0 ELSE
            CASE p_profissao
              WHEN 'Mago' THEN 8 WHEN 'Bardo' THEN 8
              WHEN 'Rastreador' THEN 5 WHEN 'Sacerdote' THEN 5
              WHEN 'Guerreiro' THEN 1 WHEN 'Ladino' THEN 1
              ELSE 0 END
          END)
       + greatest(0, coalesce(p_intelecto, 0))
       + greatest(0, coalesce(p_aura, 0));
$$;

CREATE OR REPLACE FUNCTION public.aprender_magia(p_pj_id bigint, p_instance_id text, p_magia_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_uid        uuid := auth.uid();
  v_pj         record;
  v_inst       jsonb;
  v_slug       text;
  v_magia      record;
  v_perg_slug  text;
  v_ensina     boolean;
  v_atual      int;
  v_alvo       int;
  v_nivel      int;
  v_estagio    int;
  v_total      int;
  v_gasto      int;
  v_gasto_novo int;
  v_texto_ok   boolean;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  end if;

  select id, magias, inventario, profissao, experiencia, intelecto_base, aura_base
    into v_pj
    from public.personagens
   where id = p_pj_id and user_id = v_uid;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'pj_nao_encontrado');
  end if;

  select elem into v_inst
    from jsonb_array_elements(coalesce(v_pj.inventario->'itens', '[]'::jsonb)) as elem
   where elem->>'instanceId' = p_instance_id
   limit 1;
  if v_inst is null then
    return jsonb_build_object('ok', false, 'motivo', 'item_nao_encontrado');
  end if;
  -- À venda (02/10/2026): travado até retirar o anúncio.
  if v_inst ? 'anuncio_id' and v_inst->>'anuncio_id' is not null then
    return jsonb_build_object('ok', false, 'motivo', 'item_a_venda');
  end if;
  v_slug := v_inst->>'slug';

  select key, nome, custo, nivel_1, nivel_3, nivel_5, nivel_7, nivel_9
    into v_magia
    from public.magias
   where key = p_magia_key;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'magia_nao_encontrada');
  end if;
  v_perg_slug := 'pergaminho_' || v_magia.key;

  v_ensina := (v_slug = v_perg_slug)
           or exists (select 1 from public.livro_pergaminhos lp
                       where lp.livro_slug = v_slug and lp.pergaminho_slug = v_perg_slug);
  if not v_ensina then
    return jsonb_build_object('ok', false, 'motivo', 'item_nao_ensina');
  end if;

  v_atual := coalesce((v_pj.magias->>v_magia.key)::int, 0);
  if v_atual >= 5 then
    return jsonb_build_object('ok', false, 'motivo', 'ja_no_maximo');
  end if;
  v_alvo  := v_atual + 1;
  v_nivel := v_alvo * 2 - 1;

  -- "Para no primeiro buraco" (passosDisponiveisMagia): todos os níveis até o alvo com texto.
  v_texto_ok := v_magia.nivel_1 is not null
    and (v_alvo < 2 or v_magia.nivel_3 is not null)
    and (v_alvo < 3 or v_magia.nivel_5 is not null)
    and (v_alvo < 4 or v_magia.nivel_7 is not null)
    and (v_alvo < 5 or v_magia.nivel_9 is not null);
  if not v_texto_ok then
    return jsonb_build_object('ok', false, 'motivo', 'nivel_sem_texto');
  end if;

  v_estagio := public._menestrel_estagio(v_pj.experiencia);
  if v_nivel > v_estagio then
    return jsonb_build_object('ok', false, 'motivo', 'acima_do_estagio');
  end if;

  v_total := public._menestrel_pontos_magia_por_estagio(v_pj.profissao, v_pj.intelecto_base, v_pj.aura_base) * v_estagio;

  select coalesce(sum((case when e.value::int > 0 then e.value::int * 2 - 1 else 0 end) * coalesce(m.custo, 0)), 0)
    into v_gasto
    from jsonb_each_text(coalesce(v_pj.magias, '{}'::jsonb)) as e(key, value)
    join public.magias m on m.key = e.key;

  v_gasto_novo := v_gasto
    - (case when v_atual > 0 then v_atual * 2 - 1 else 0 end) * coalesce(v_magia.custo, 0)
    + v_nivel * coalesce(v_magia.custo, 0);
  if v_gasto_novo > v_total then
    return jsonb_build_object('ok', false, 'motivo', 'pontos_insuficientes');
  end if;

  update public.personagens
     set magias = coalesce(magias, '{}'::jsonb) || jsonb_build_object(v_magia.key, v_alvo)
   where id = p_pj_id and user_id = v_uid;

  return jsonb_build_object('ok', true, 'magia', v_magia.key, 'magia_nome', v_magia.nome,
                            'nivel', v_nivel, 'passos', v_alvo);
end;
$function$;

REVOKE ALL ON FUNCTION public.aprender_magia(bigint, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aprender_magia(bigint, text, text) TO authenticated;

COMMIT;
```

- [ ] **Step 4: Ensaiar o teste com a função**

Rode pelo MCP, numa só chamada: o script da Task 1 sem `COMMIT;`, depois o corpo da RPC (sem o `BEGIN;`/`COMMIT;` dela) e depois o teste sem o `BEGIN;` inicial (ele termina com `ROLLBACK;`).
Expected: `NOTICE: aprender_magia: todos os ensaios passaram`, sem nenhum `ASSERT` falhando. Nada fica gravado.

- [ ] **Step 5: Commit**

```bash
git add scripts/sql/aprender-magia-rpc-2026-10-22.sql scripts/sql/aprender-magia-rpc-2026-10-22.teste.sql
git commit -m "feat(magias): RPC aprender_magia (livro ou pergaminho, sem consumir)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- scripts/sql/aprender-magia-rpc-2026-10-22.sql scripts/sql/aprender-magia-rpc-2026-10-22.teste.sql
```

---

### Task 3: Regra de pontos e bloqueios no JS (`game-data.jsx`)

**Files:**
- Modify: `src/01-core/game-data.jsx:737-812` (bloco `[11] Helpers de MAGIAS`), `:326-339` (`todosOsPontosGastos`), `:1359-1360` (exports)
- Modify: `src/01-core/constants.jsx:497` (comentário)
- Create: `src/01-core/pontos-magia.test.js`
- Modify: `src/01-core/game-data.test.js:436-465`, `src/01-core/magia-basica-avancada.test.js`

**Interfaces:**
- Produces (em `window`):
  - `MAGIAS_BASE_POR_PROFISSAO: { [profissao]: number }`
  - `pontosMagiasPorEstagio(profissao: string, intelecto: number, aura: number): number`
  - `pontosMagiasTotal(profissao: string, estagio: number, intelecto: number, aura: number): number`
  - `bloqueioAprenderMagia(magia: object|null, pj: {profissao, experiencia, intelecto_base, aura_base, magias}, magiasDb: object[]): null | { motivo: string, faltam?, gasto?, total? }` — motivos: `magia_nao_encontrada`, `ja_no_maximo`, `nivel_sem_texto`, `acima_do_estagio`, `pontos_insuficientes`.
  - `todosOsPontosGastos(saldos)` ignora `magias`/`usaMagia`.
- Removidos de `window`: `MAGIAS_POR_PROFISSAO`, `profissaoUsaMagia`, `podeAcessarMagia`, `magiaEhTravada`. Fica `magiaEhAvancada` (só exibição).

- [ ] **Step 1: Escrever o teste que falha**

Create `src/01-core/pontos-magia.test.js`:

```js
/* ============================================================
   pontos-magia.test.js — orçamento de magia e o porquê do "Aprender"
   ============================================================
   Pedido do usuário (22/10/2026): "Magos e Bardos possuem pontos-base alto
   por nível, escalado por intelecto e aura. Rastreadores e Sacerdotes
   pontos-base medianos [...] Guerreiros e Ladinos pontos-base baixo".
   Base 8 / 5 / 1; "Personagem com Aura negativa tem base 0."
   Espelho SQL: _menestrel_pontos_magia_por_estagio (Task 2 do plano).
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './inventario-helpers.jsx';
import './game-data.jsx';

let G;
beforeAll(() => { G = window; });

describe('pontosMagiasPorEstagio', () => {
  it.each([
    ['Mago', 2, 1, 11], ['Bardo', 0, 0, 8],
    ['Rastreador', 2, 1, 8], ['Sacerdote', 0, 3, 8],
    ['Guerreiro', 0, 0, 1], ['Ladino', 1, 1, 3],
  ])('%s Int %i Aura %i → %i', (prof, int, aura, esperado) => {
    expect(G.pontosMagiasPorEstagio(prof, int, aura)).toBe(esperado);
  });
  it('Aura negativa zera a base e conta 0', () => {
    expect(G.pontosMagiasPorEstagio('Mago', 3, -1)).toBe(3);
  });
  it('Intelecto negativo conta 0', () => {
    expect(G.pontosMagiasPorEstagio('Sacerdote', -2, 1)).toBe(6);
  });
  it('profissão desconhecida tem base 0', () => {
    expect(G.pontosMagiasPorEstagio('Nada', 1, 1)).toBe(2);
  });
});

describe('pontosMagiasTotal', () => {
  it('multiplica pelo estágio', () => {
    expect(G.pontosMagiasTotal('Mago', 5, 2, 1)).toBe(55);
    expect(G.pontosMagiasTotal('Guerreiro', 5, 0, 0)).toBe(5);
  });
});

const BOLA = { key: 'bola_de_fogo', nome: 'Bola de Fogo', custo: 2, tipo: 'Básica',
  nivel_1: 'a', nivel_3: 'b', nivel_5: 'c', nivel_7: 'd', nivel_9: 'e' };
const SONETO = { key: 'soneto', nome: 'Soneto', custo: 3, tipo: 'Perdida', nivel_1: 'só o 1' };
const DB = [BOLA, SONETO];
// experiencia alta = estágio alto, salvo onde o teste diz.
const pj = (extra) => ({ profissao: 'Mago', experiencia: 100000, intelecto_base: 3, aura_base: 2, magias: {}, ...extra });

describe('bloqueioAprenderMagia — um motivo por vez', () => {
  it('pode aprender: null', () => {
    expect(G.bloqueioAprenderMagia(BOLA, pj(), DB)).toBeNull();
  });
  it('qualquer profissão aprende (não há permissão)', () => {
    expect(G.bloqueioAprenderMagia(BOLA, pj({ profissao: 'Guerreiro' }), DB)).toBeNull();
  });
  it('magia ausente → magia_nao_encontrada', () => {
    expect(G.bloqueioAprenderMagia(null, pj(), DB).motivo).toBe('magia_nao_encontrada');
  });
  it('cinco passos → ja_no_maximo', () => {
    expect(G.bloqueioAprenderMagia(BOLA, pj({ magias: { bola_de_fogo: 5 } }), DB).motivo).toBe('ja_no_maximo');
  });
  it('próximo nível sem texto → nivel_sem_texto', () => {
    expect(G.bloqueioAprenderMagia(SONETO, pj({ magias: { soneto: 1 } }), DB).motivo).toBe('nivel_sem_texto');
  });
  it('nível 3 no estágio 1 → acima_do_estagio', () => {
    expect(G.bloqueioAprenderMagia(BOLA, pj({ experiencia: 0, magias: { bola_de_fogo: 1 } }), DB).motivo).toBe('acima_do_estagio');
  });
  it('pontos: Guerreiro Int 0 Aura 0 no estágio 1 tem 1 ponto; Bola custa 2', () => {
    const r = G.bloqueioAprenderMagia(BOLA, pj({ profissao: 'Guerreiro', experiencia: 0, intelecto_base: 0, aura_base: 0 }), DB);
    expect(r).toEqual({ motivo: 'pontos_insuficientes', faltam: 1, gasto: 0, total: 1 });
  });
  // Mago Int 0 Aura 0 no estágio 1 = 8 pontos; Bola no nível 7 (preservada
  // da regra antiga) já gasta 14. Soneto nível 1 cabe no estágio, não nos pontos.
  it('PJ preservado acima do orçamento: tudo bloqueia por pontos', () => {
    const r = G.bloqueioAprenderMagia(SONETO, pj({ experiencia: 0, intelecto_base: 0, aura_base: 0, magias: { bola_de_fogo: 4 } }), DB);
    expect(r).toEqual({ motivo: 'pontos_insuficientes', faltam: 9, gasto: 14, total: 8 });
  });
});

describe('regras antigas saíram', () => {
  it('sem permissão por profissão nem trava por raridade', () => {
    expect(G.podeAcessarMagia).toBeUndefined();
    expect(G.magiaEhTravada).toBeUndefined();
    expect(G.profissaoUsaMagia).toBeUndefined();
    expect(G.MAGIAS_POR_PROFISSAO).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/01-core/pontos-magia.test.js`
Expected: FAIL — `G.pontosMagiasPorEstagio is not a function`.

- [ ] **Step 3: Implementar**

Em `src/01-core/game-data.jsx`, substitua o trecho de `// Profissões que podem usar magia…` até o fim de `function podeAcessarMagia(...) {...}` (linhas ~737-773) por:

```js
/* Pontos-base de magia por estágio (reforma de 22/10/2026). Pedido do
   usuário: "qualquer profissão pode aprender qualquer magia" — pelo item que
   a ensina (pergaminho ou livro, RPC aprender_magia). Faixas: alta (Mago,
   Bardo), média (Rastreador, Sacerdote), baixa (Guerreiro, Ladino). */
const MAGIAS_BASE_POR_PROFISSAO = {
  'Mago': 8, 'Bardo': 8,
  'Rastreador': 5, 'Sacerdote': 5,
  'Guerreiro': 1, 'Ladino': 1,
};

/* Por estágio = base + intelecto + aura, atributo negativo contando 0, e
   "Personagem com Aura negativa tem base 0" (usuário, 22/10/2026).
   Atributos = intelecto_base/aura_base GRAVADOS: o espelho SQL
   (_menestrel_pontos_magia_por_estagio) não conhece os ajustes de sub-raça,
   e as duas contas precisam bater. */
function pontosMagiasPorEstagio(profissao, intelecto, aura) {
  const a = Number(aura) || 0;
  const i = Number(intelecto) || 0;
  const base = a < 0 ? 0 : (MAGIAS_BASE_POR_PROFISSAO[profissao] || 0);
  return base + Math.max(0, i) + Math.max(0, a);
}

function pontosMagiasTotal(profissao, estagio, intelecto, aura) {
  return pontosMagiasPorEstagio(profissao, intelecto, aura) * (Number(estagio) || 0);
}

function gastoMagias(magiasObj, magiasDb) {
  if (!magiasObj || !magiasDb) return 0;
  return Object.entries(magiasObj).reduce((sum, [key, passos]) => {
    const m = magiasDb.find((x) => x.key === key);
    if (!m) return sum;
    return sum + nivelMagiaEfetivo(passos || 0) * (m.custo || 0);
  }, 0);
}
```

Apague `magiaEhTravada` (o comentário "Raridade, eixo independente…" e a função, linhas ~803-811). Mantenha `magiaEhAvancada` e seu comentário, trocando a frase "Perdida e Ancestral seguem travadas à espera do item especial…" por "Desde 22/10/2026 isto é só exibição (as páginas Básicas/Avançadas da ficha): ninguém mais é impedido de aprender por `permissao`."

Logo depois de `passosDisponiveisMagia` (procure `function passosDisponiveisMagia`), acrescente:

```js
/* Por que este PJ não pode aprender o PRÓXIMO nível desta magia agora?
   Mesmos motivos e mesma ordem da RPC aprender_magia — a tela antecipa a
   recusa para o botão já nascer desativado com o porquê. null = pode. */
function bloqueioAprenderMagia(magia, pj, magiasDb) {
  if (!magia) return { motivo: 'magia_nao_encontrada' };
  const magias = (pj && pj.magias) || {};
  const passos = Number(magias[magia.key]) || 0;
  if (passos >= 5) return { motivo: 'ja_no_maximo' };
  const alvo = passos + 1;
  if (alvo > passosDisponiveisMagia(magia)) return { motivo: 'nivel_sem_texto' };
  const estagio = calcEstagio((pj && pj.experiencia) || 0);
  if (nivelMagiaEfetivo(alvo) > estagio) return { motivo: 'acima_do_estagio' };
  const lista = Array.isArray(magiasDb) && magiasDb.some((m) => m.key === magia.key)
    ? magiasDb : [...(magiasDb || []), magia];
  const total = pontosMagiasTotal(pj && pj.profissao, estagio, pj && pj.intelecto_base, pj && pj.aura_base);
  const gasto = gastoMagias(magias, lista);
  const gastoNovo = gastoMagias({ ...magias, [magia.key]: alvo }, lista);
  if (gastoNovo > total) return { motivo: 'pontos_insuficientes', faltam: gastoNovo - total, gasto, total };
  return null;
}
```

Em `todosOsPontosGastos` (linha ~334), troque o corpo por:

```js
function todosOsPontosGastos(saldos) {
  const s = saldos || {};
  // Magia saiu daqui em 22/10/2026: aprende-se pelo item, não no wizard —
  // sobra de ponto de magia não é pendência do estágio.
  const pools = [s.atributos, s.habilidades, s.tecnicas, s.gruposArmas];
  return pools.every((r) => (Number(r) || 0) <= 0);
}
```

e ajuste o comentário logo acima dela, apagando a frase sobre "a pool de magia — profissão sem magia…".

No `Object.assign(window, {...})` (linha ~1359), troque as duas linhas de magia por:

```js
  MAGIAS_BASE_POR_PROFISSAO, pontosMagiasPorEstagio, pontosMagiasTotal, gastoMagias,
  nivelMagiaEfetivo, magiaEhAvancada, bloqueioAprenderMagia,
```

e no cabeçalho do arquivo (linha 5) troque `MAGIAS_POR_PROFISSAO` por `MAGIAS_BASE_POR_PROFISSAO`.

Em `src/01-core/constants.jsx:497`, troque o comentário por:
`// Profissões que DIFUNDEM magia (livros de profissão) — o menu do bestiário divide por elas; desde 22/10/2026 qualquer profissão aprende.`

- [ ] **Step 4: Ajustar os testes antigos**

Em `src/01-core/game-data.test.js`, no `describe('todosOsPontosGastos …')`: remova `magias: 0` e `usaMagia: true` de `cheio`, troque o array do teste "sobra em QUALQUER pool" por `['atributos', 'habilidades', 'tecnicas', 'gruposArmas']`, e substitua o teste "pool de magia é ignorada…" por:

```js
  it('sobra de magia não segura o badge (aprende-se pelo item, 22/10/2026)', () => {
    expect(G.todosOsPontosGastos({ ...cheio, magias: 5, usaMagia: true })).toBe(true);
  });
```

Em `src/01-core/magia-basica-avancada.test.js`: apague os `describe` de `magiaEhTravada` e todas as asserções com `podeAcessar`, as variáveis `ehTravada`/`podeAcessar` e os `expect(...).toBeDefined()` delas no `beforeAll`. Fica só `magiaEhAvancada`. Acrescente ao cabeçalho do arquivo: "Desde 22/10/2026 só exibição — ver pontos-magia.test.js."

- [ ] **Step 5: Rodar**

Run: `npx vitest run src/01-core/pontos-magia.test.js src/01-core/game-data.test.js src/01-core/magia-basica-avancada.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(magias): pontos por profissão com intelecto e aura; bloqueio de aprender sem permissão

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/01-core/game-data.jsx src/01-core/constants.jsx src/01-core/pontos-magia.test.js src/01-core/game-data.test.js src/01-core/magia-basica-avancada.test.js
```

(`src/01-core/game-data.jsx` tem alterações pendentes de outro trabalho no working tree. Antes de commitar, rode `git diff src/01-core/game-data.jsx` e, se houver trechos que não são desta task, use `git add -p src/01-core/game-data.jsx` para escolher só os seus e commite com `git commit` sem `--` de caminhos. Faça o mesmo em qualquer arquivo listado no `git status` inicial: `game-data.jsx`, `inventario.jsx`, `loja.jsx`, `personagens.jsx`, `shell.jsx`, `ficha.jsx`, `batalha.jsx`, `index.css`.)

---

### Task 4: Inventário — o que o item ensina, vínculos e chamada da RPC

**Files:**
- Modify: `src/07-inventario/inventario.jsx` (PJ_COLS ~509; `magiasDb` loader ~567-573; `aprenderMagiaPergaminho` ~1407-1430; bloco de pergaminho ~2466-2712; `DetalhesItemModal` ~2780-3090; export ~3772)
- Modify: `src/11-ficha/atalhos-ficha.jsx:38`
- Rewrite: `src/07-inventario/pergaminho-bloqueio.test.js`
- Modify: `src/07-inventario/pergaminho-descricao-capa.test.jsx:50-90`, `src/07-inventario/refetch-pjs.test.js`

**Interfaces:**
- Consumes: `bloqueioAprenderMagia`, `pontosMagiasTotal`, `gastoMagias`, `nivelMagiaEfetivo`, `calcEstagio` (Task 3); RPC `aprender_magia` (Task 2); tabela `livro_pergaminhos` (Task 1).
- Produces (em `window`):
  - `ehPergaminhoDeMagia(cat): boolean` — Consumível, `magia` preenchida, slug `pergaminho_*` (não exige mais `nivel_magia`).
  - `magiasQueOItemEnsina(cat, vinculos, catalogoBySlug, magiasDb): magia[]` — ordenada por nome, sem repetição.
  - `bloqueioAprenderNoInventario(magia, pj, opcoes: { noInventario, podeAprender, aVenda, magiasDb }): null | { motivo, ... }`
  - `vinculosDeLivros(linhas: {livro_slug, pergaminho_slug}[]): { [livroSlug]: string[] }`
  - `motivoAprenderLabel(motivo, en, dados)` — com os motivos novos.
  - `DetalhesItemModal` aceita a prop `vinculos` e chama `onAprenderMagia(instanceId, magiaKey)`.
  - Removido: `bloqueioPergaminho`.

- [ ] **Step 1: Reescrever o teste (falha)**

Replace `src/07-inventario/pergaminho-bloqueio.test.js` with:

```js
/* ============================================================
   pergaminho-bloqueio.test.js — o que o item ensina e por que não dá
   ============================================================
   Reforma de 22/10/2026 (spec 2026-10-22-aprendizado-magia-por-item):
   toda magia se aprende pelo item — o pergaminho dela (um só, todos os
   níveis, NÃO se consome) ou um livro que vincula o pergaminho
   (livro_pergaminhos). Sem permissão por profissão.

   Antes (13/09/2026): "Independente da situação, o botão deve aparecer. No
   tooltip você informa porque não é possível aprender." — continua valendo.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';

let W;
beforeAll(() => { W = window; });

const BOLA = { key: 'bola_de_fogo', nome: 'Bola de Fogo', custo: 2, tipo: 'Básica',
  nivel_1: 'a', nivel_3: 'b', nivel_5: 'c', nivel_7: 'd', nivel_9: 'e' };
const VOO = { key: 'voo', nome: 'Vôo', custo: 2, tipo: 'Perdida', nivel_1: 'a', nivel_3: 'b' };
const LUZ = { key: 'luz', nome: 'Luz', custo: 1, tipo: 'Básica', nivel_1: 'a' };
const MAGIAS = [BOLA, VOO, LUZ];

const PERG_BOLA = { slug: 'pergaminho_bola_de_fogo', grupo: 'Consumíveis', magia: 'Bola de Fogo', nivel_magia: null };
const PERG_VOO = { slug: 'pergaminho_voo', grupo: 'Consumíveis', magia: 'Vôo', nivel_magia: null };
const PERG_LUZ = { slug: 'pergaminho_luz', grupo: 'Consumíveis', magia: 'Luz', nivel_magia: null };
const LIVRO_MAGO = { slug: 'livro_do_mago', grupo: 'Itens', nome: 'Livro do Mago' };
const LIVRO_VAZIO = { slug: 'livro_de_medicina', grupo: 'Itens', nome: 'Livro de Medicina' };
const FRASCO = { slug: 'frasco_incendiario', grupo: 'Consumíveis', magia: 'Frasco Incendiário', nivel_magia: 3 };
const ANEL = { slug: 'anel_narya', grupo: 'Vestimentas', magia: 'Piromanipulação', nivel_magia: 9 };
const CAT = { [PERG_BOLA.slug]: PERG_BOLA, [PERG_VOO.slug]: PERG_VOO, [PERG_LUZ.slug]: PERG_LUZ };

const VINC = W => W.vinculosDeLivros([
  { livro_slug: 'livro_do_mago', pergaminho_slug: 'pergaminho_luz' },
  { livro_slug: 'livro_do_mago', pergaminho_slug: 'pergaminho_bola_de_fogo' },
  { livro_slug: 'livro_do_mago', pergaminho_slug: 'pergaminho_bola_de_fogo' }, // repetido
  { livro_slug: 'livro_do_mago', pergaminho_slug: 'pergaminho_sumiu' },        // pergaminho apagado
]);

describe('ehPergaminhoDeMagia — pergaminho único, sem nível', () => {
  it('pergaminho com nivel_magia nulo é pergaminho', () => {
    expect(W.ehPergaminhoDeMagia(PERG_BOLA)).toBe(true);
  });
  it('frasco, anel e livro não são', () => {
    expect(W.ehPergaminhoDeMagia(FRASCO)).toBe(false);
    expect(W.ehPergaminhoDeMagia(ANEL)).toBe(false);
    expect(W.ehPergaminhoDeMagia(LIVRO_MAGO)).toBe(false);
  });
  it('frasco continua item de batalha', () => {
    expect(W.ehItemDeMagiaEmBatalha(FRASCO)).toBe(true);
    expect(W.ehItemDeMagiaEmBatalha(PERG_BOLA)).toBe(false);
  });
});

describe('magiasQueOItemEnsina', () => {
  it('pergaminho ensina a sua magia', () => {
    expect(W.magiasQueOItemEnsina(PERG_VOO, {}, CAT, MAGIAS).map((m) => m.key)).toEqual(['voo']);
  });
  it('livro ensina as vinculadas, por nome, sem repetir nem quebrar no pergaminho apagado', () => {
    expect(W.magiasQueOItemEnsina(LIVRO_MAGO, VINC(W), CAT, MAGIAS).map((m) => m.key)).toEqual(['bola_de_fogo', 'luz']);
  });
  it('livro sem vínculo não ensina nada', () => {
    expect(W.magiasQueOItemEnsina(LIVRO_VAZIO, VINC(W), CAT, MAGIAS)).toEqual([]);
  });
  it('item mágico que só carrega a magia não ensina', () => {
    expect(W.magiasQueOItemEnsina(ANEL, VINC(W), CAT, MAGIAS)).toEqual([]);
  });
});

const pj = (extra) => ({ id: 1, profissao: 'Guerreiro', experiencia: 100000, intelecto_base: 3, aura_base: 2, magias: {}, ...extra });
const OP = { magiasDb: MAGIAS, noInventario: true, podeAprender: true, aVenda: false };

describe('bloqueioAprenderNoInventario — a ordem dos motivos', () => {
  it('pode: null (Guerreiro aprende Vôo)', () => {
    expect(W.bloqueioAprenderNoInventario(VOO, pj(), OP)).toBeNull();
  });
  it('na ficha → aprender_no_inventario', () => {
    expect(W.bloqueioAprenderNoInventario(VOO, pj(), { ...OP, noInventario: false }).motivo).toBe('aprender_no_inventario');
  });
  it('não é o dono → nao_e_dono', () => {
    expect(W.bloqueioAprenderNoInventario(VOO, pj(), { ...OP, podeAprender: false }).motivo).toBe('nao_e_dono');
  });
  it('à venda → item_a_venda', () => {
    expect(W.bloqueioAprenderNoInventario(VOO, pj(), { ...OP, aVenda: true }).motivo).toBe('item_a_venda');
  });
  it('magia que sumiu do catálogo → magia_nao_encontrada', () => {
    expect(W.bloqueioAprenderNoInventario(null, pj(), OP).motivo).toBe('magia_nao_encontrada');
  });
  it('depois, as regras de game-data (estágio, pontos…)', () => {
    expect(W.bloqueioAprenderNoInventario(VOO, pj({ experiencia: 0, magias: { voo: 1 } }), OP).motivo).toBe('acima_do_estagio');
  });
});

describe('motivoAprenderLabel', () => {
  it.each([
    ['item_a_venda', /À venda/],
    ['item_nao_ensina', /não ensina/],
    ['ja_no_maximo', /nível máximo/],
    ['nivel_sem_texto', /não tem o próximo nível/],
    ['acima_do_estagio', /estágio/],
    ['nao_e_dono', /Só o dono/],
  ])('%s', (motivo, texto) => {
    expect(W.motivoAprenderLabel(motivo, false)).toMatch(texto);
  });
  it('pontos com os números', () => {
    expect(W.motivoAprenderLabel('pontos_insuficientes', false, { faltam: 4, gasto: 84, total: 84 }))
      .toBe('Pontos de magia insuficientes: faltam 4 (usa 84 de 84).');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/07-inventario/pergaminho-bloqueio.test.js`
Expected: FAIL — `W.vinculosDeLivros is not a function`.

- [ ] **Step 3: Implementar as funções puras**

Em `src/07-inventario/inventario.jsx`:

(a) Substitua `ehPergaminhoDeMagia` e o comentário acima dele (até a linha que fecha a função) por:

```js
/* Pergaminho de magia = CONSUMÍVEL com magia e slug pergaminho_ (13/09 e
   28/09/2026: anéis, armas e frascos também têm magia, mas não ensinam).
   Desde 22/10/2026 há UM pergaminho por magia, para todos os níveis — o
   nivel_magia é nulo, e por isso não entra mais na conta. */
function ehPergaminhoDeMagia(cat) {
  return !!(cat && cat.magia && cat.grupo === 'Consumíveis'
    && String(cat.slug || '').startsWith('pergaminho_'));
}
```

(b) Substitua todo o bloco de `bloqueioPergaminho` (de `function bloqueioPergaminho(cat, pj, opcoes) {` até o `}` que a fecha) e o comentário longo que começa em `/* ── O pergaminho ainda ensina algo a ESTE personagem? (13/09/2026) ──` (mantendo `chaveDaMagiaPorNome`, que fica logo abaixo dele) por — o comentário novo vai no lugar do antigo, as três funções no lugar de `bloqueioPergaminho`:

```js
/* ── O QUE O ITEM ENSINA (22/10/2026) ─────────────────────────────────
   "todas as magias precisam ser aprendidas através do uso do item" — o
   pergaminho da magia, ou um livro que vincula pergaminhos
   (livro_pergaminhos: Livro do Mago, dos deuses, das Ordens…). Quem decide
   de verdade é a RPC aprender_magia; a tela antecipa as recusas com os
   MESMOS motivos para o botão nascer desativado com o porquê (pedido de
   13/09/2026). Ordem: as da tela primeiro (onde, quem, à venda), depois as
   da regra (bloqueioAprenderMagia, 01-core/game-data.jsx). */

// Linhas de livro_pergaminhos → { livro_slug: [pergaminho_slug, …] }.
function vinculosDeLivros(linhas) {
  const out = {};
  (Array.isArray(linhas) ? linhas : []).forEach((l) => {
    if (!l || !l.livro_slug || !l.pergaminho_slug) return;
    const lista = out[l.livro_slug] || (out[l.livro_slug] = []);
    if (!lista.includes(l.pergaminho_slug)) lista.push(l.pergaminho_slug);
  });
  return out;
}

function magiasQueOItemEnsina(cat, vinculos, catalogoBySlug, magiasDb) {
  if (!cat) return [];
  const pergaminhos = ehPergaminhoDeMagia(cat)
    ? [cat]
    : ((vinculos && vinculos[cat.slug]) || []).map((s) => catalogoBySlug && catalogoBySlug[s]).filter(Boolean);
  const vistas = new Set();
  const out = [];
  pergaminhos.forEach((p) => {
    const m = magiaDoItem(p, magiasDb);
    if (m && !vistas.has(m.key)) { vistas.add(m.key); out.push(m); }
  });
  return out.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt'));
}

function bloqueioAprenderNoInventario(magia, pj, opcoes) {
  const op = opcoes || {};
  if (op.noInventario === false) return { motivo: 'aprender_no_inventario' };
  if (op.podeAprender === false) return { motivo: 'nao_e_dono' };
  if (op.aVenda) return { motivo: 'item_a_venda' };
  if (!magia) return { motivo: 'magia_nao_encontrada' };
  if (!pj) return null;
  const _regra = (typeof window !== 'undefined' && window.bloqueioAprenderMagia) || null;
  return _regra ? _regra(magia, pj, op.magiasDb || []) : null;
}
```

(c) Em `motivoAprenderLabel`, troque o objeto `map` por:

```js
  const map = {
    nao_e_dono:             en ? 'Only the character’s owner can learn from this item.' : 'Só o dono do personagem pode aprender com este item.',
    aprender_no_inventario: en ? 'Learn it from the Inventory.'                       : 'Aprenda pelo Inventário.',
    item_a_venda:           en ? 'For sale in the shop — withdraw the listing first.' : 'À venda na loja — retire o anúncio para estudar.',
    item_nao_ensina:        en ? 'This item does not teach this spell.'               : 'Este item não ensina essa magia.',
    ja_no_maximo:           en ? 'You already know this spell at the highest level.'  : 'Você já tem essa magia no nível máximo.',
    nivel_sem_texto:        en ? 'This spell has no next level.'                      : 'Essa magia não tem o próximo nível.',
    pontos_insuficientes:   en ? 'Not enough magic points.'                           : 'Pontos de magia insuficientes.',
    acima_do_estagio:       en ? "The next level exceeds your character's stage."     : 'O próximo nível passa do seu estágio.',
    magia_nao_encontrada:   en ? 'Spell not found in the catalog.'                    : 'Magia não encontrada no catálogo.',
    item_nao_encontrado:    en ? 'Item not found in your inventory.'                  : 'Item não encontrado no inventário.',
    pj_nao_encontrado:      en ? 'Character not found.'                               : 'Personagem não encontrado.',
    nao_autenticado:        en ? 'You are not signed in.'                             : 'Você não está autenticado.',
  };
```

(d) No export (linha ~3772), troque `bloqueioPergaminho,` por `vinculosDeLivros, magiasQueOItemEnsina, bloqueioAprenderNoInventario,`.

- [ ] **Step 4: Rodar o teste das funções**

Run: `npx vitest run src/07-inventario/pergaminho-bloqueio.test.js`
Expected: PASS.

- [ ] **Step 5: Carregar vínculos, colunas do PJ e trocar a RPC**

(a) `PJ_COLS` (linha ~509) — acrescente `intelecto_base,aura_base`:

```js
const PJ_COLS = 'id,nome,sobrenome,foto_url,raca,subraca,profissao,forca_base,fisico_base,intelecto_base,aura_base,inventario,estado_atual,magias,experiencia,especializacao,inventario_versao';
```

e acrescente ao comentário acima: `// intelecto_base + aura_base (22/10/2026): orçamento de magia (pontosMagiasTotal).`
Atualize `src/07-inventario/refetch-pjs.test.js`: onde a lista esperada de colunas aparece, inclua `intelecto_base` e `aura_base` na mesma posição. Rode `npx vitest run src/07-inventario/refetch-pjs.test.js` e ajuste até passar.

(b) Logo depois do `useEffect` que carrega `magiasDb` (linha ~573), troque `permissao,` por nada na lista de colunas do `select` (fica `'key,nome,custo,tipo,descricao,itens_necessarios,nivel_1,nivel_3,nivel_5,nivel_7,nivel_9'`), atualize o comentário ("custo (pontos) e permissão" → "custo (pontos) e textos dos níveis") e acrescente:

```js
  /* Livro → pergaminhos (livro_pergaminhos, 22/10/2026): é o que dá ao livro
     a ação "Estudar". Falhar aqui só esconde o Estudar dos livros. */
  const [vinculos, setVinculos] = useState({});
  useEffect(() => {
    let vivo = true;
    Promise.resolve(fetchTabelaPaginada('livro_pergaminhos', { colunas: 'livro_slug,pergaminho_slug', ordem: ['livro_slug'] }))
      .then((res) => { if (vivo && res && !res.error) setVinculos(vinculosDeLivros(res.data)); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);
```

(c) Troque `aprenderMagiaPergaminho` (linhas ~1407-1416, só o cabeçalho e a chamada) por:

```js
  // Aprender magia com um item (22/10/2026): pergaminho ou livro, um nível
  // por vez, sem consumir (RPC aprender_magia). Recarrega o PJ porque as
  // magias vivem fora do inventário.
  const aprenderMagiaComItem = async (instanceId, magiaKey) => {
    const { data, error } = await supabaseClient.rpc('aprender_magia', {
      p_pj_id: selectedId,
      p_instance_id: instanceId,
      p_magia_key: magiaKey,
    });
```

Mantenha o resto do corpo (refetch etc.) e troque a referência em `onAprenderMagia={authUserIsOwner ? aprenderMagiaPergaminho : undefined}` (linha ~1526) por `aprenderMagiaComItem`. Na mesma chamada de `<DetalhesItemModal …>`, acrescente a prop `vinculos={vinculos}`. Atualize o comentário de `authUserIsOwner` (linha ~588): `usar_pergaminho_magia` → `aprender_magia`.

- [ ] **Step 6: Ação "Estudar"/"Aprender" no DetalhesItemModal**

Em `DetalhesItemModal`:
- Acrescente `vinculos` à lista de props (junto de `magiasDb`).
- Troque o bloco de `const bloqueioAprender = ehPergaminhoMagia ? bloqueioPergaminho(...) : null;` por:

```js
  // O que este item ensina (pergaminho: a sua magia; livro: as vinculadas).
  const ensina = magiasQueOItemEnsina(cat, vinculos, catalogoBySlug, magiasDb);
  const [estudando, setEstudando] = useState(false);
```

  (Coloque o `useState` junto dos outros `useState` do topo do componente, não no meio do JSX: hooks antes de qualquer `return`.)
- Troque a entrada `ehPergaminhoMagia && { chave: 'aprender', … }` de `acoesTopo` por:

```js
    ensina.length > 0 && {
      chave: ehPergaminhoMagia ? 'aprender' : 'estudar',
      icone: 'ti-school',
      rotulo: ehPergaminhoMagia ? (en ? 'Learn' : 'Aprender') : (en ? 'Study' : 'Estudar'),
      onClick: () => setEstudando(true),
    },
```

- Apague os estados `aprendendo`/`aprenderErro` e o trecho de JSX que mostra `aprenderErro`, se só a ação antiga os usava (procure por `aprenderErro`).
- O filtro de "À venda" (`acoesDaJanela`) continua: com o item à venda, o botão fica desativado com a dica de venda — o modal nunca abre.
- Antes do `return` final do componente, deixe pronto o ponto onde a Task 5 abre o modal:

```jsx
      {estudando && (
        <EstudarMagiaModal
          titulo={cat.nome}
          magias={ensina}
          pj={pjAprendiz}
          magiasDb={magiasDb}
          opcoes={{ noInventario: acoesPesadas, podeAprender: !!onAprenderMagia, aVenda: estaAVenda(instance) }}
          lang={lang}
          onAprender={(key) => onAprenderMagia(instance.instanceId, key)}
          onClose={() => setEstudando(false)}
        />
      )}
```

  (coloque-o como irmão do `LeituraDocModal` que o componente já renderiza quando `lendo` é true).

- [ ] **Step 7: Atalhos da ficha não oferecem pergaminho**

Em `src/11-ficha/atalhos-ficha.jsx:38`, troque `if (cat.magia && cat.nivel_magia != null) return false;` por:

```js
  // Pergaminho (nivel_magia nulo desde 22/10/2026) e item que carrega magia: ações próprias.
  if (cat.magia) return false;
```

- [ ] **Step 8: Ajustar o teste da janela do pergaminho**

Em `src/07-inventario/pergaminho-descricao-capa.test.jsx`, no `describe('pergaminho mostra a descrição da magia')`: troque `PERG` por `{ slug: 'pergaminho_voo', nome: 'Pergaminho Vôo', grupo: 'Consumíveis', magia: 'Vôo', nivel_magia: null }` e reescreva os dois primeiros casos:

```js
  it('descrição geral, sem nível fixo (o pergaminho ensina todos)', () => {
    abrir(PERG, inst, { magiasDb: MAGIAS });
    const bloco = document.querySelector('.best-magia');
    expect(bloco.getAttribute('data-aba')).toBe('Magia');
    expect(bloco.textContent).toMatch(/Vôo/);
    expect(bloco.textContent).not.toMatch(/Nível/);
    expect(bloco.textContent).toMatch(/Você flutua pelo ar\./);
    expect(bloco.querySelector('.best-efeito')).toBeNull();
  });

  it('o pergaminho tem a ação Aprender', () => {
    abrir(PERG, inst, { magiasDb: MAGIAS, vinculos: {}, onAprenderMagia: async () => ({ ok: true }) });
    expect(document.querySelector('[data-acao="aprender"]')).toBeTruthy();
  });
```

e acrescente, no mesmo `describe`:

```js
  it('livro com vínculo tem Estudar; livro sem vínculo não', () => {
    const livro = { slug: 'livro_do_mago', nome: 'Livro do Mago', grupo: 'Itens' };
    const catalogo = { [livro.slug]: livro, [PERG.slug]: PERG };
    render(<Modal instance={{ instanceId: 'l1', slug: livro.slug, quantidade: 1 }} catalogoBySlug={catalogo}
      raca="Humano" slotsState={{}} todosItens={[]} containersDisponiveis={[]} pjsHistoria={[]} lang="pt"
      onClose={noop} magiasDb={MAGIAS} vinculos={{ livro_do_mago: ['pergaminho_voo'] }} />);
    expect(document.querySelector('[data-acao="estudar"]')).toBeTruthy();
    cleanup();
    render(<Modal instance={{ instanceId: 'l1', slug: livro.slug, quantidade: 1 }} catalogoBySlug={catalogo}
      raca="Humano" slotsState={{}} todosItens={[]} containersDisponiveis={[]} pjsHistoria={[]} lang="pt"
      onClose={noop} magiasDb={MAGIAS} vinculos={{}} />);
    expect(document.querySelector('[data-acao="estudar"]')).toBeNull();
  });
```

Se `data-acao` não existir no botão de ação, procure em `DetalhesItemModal` como `acoesTopo` vira botões e use o atributo que ele já põe com a `chave` (o teste antigo usava `[data-acao="aprender"]`, então ele existe).

- [ ] **Step 9: Rodar**

Run: `npx vitest run src/07-inventario src/11-ficha/atalhos-ficha`
Expected: os testes do Step 1 e Step 8 passam. O caso "livro com vínculo tem Estudar" ainda pode falhar com `EstudarMagiaModal is not defined` **apenas ao clicar** — este teste não clica, então deve passar. Se algum teste do inventário quebrar por `bloqueioPergaminho`, `aprendendo` ou `aprenderErro`, remova a referência restante.

- [ ] **Step 10: Commit**

(Arquivo com alterações alheias: use `git add -p src/07-inventario/inventario.jsx`.)

```bash
git add -p src/07-inventario/inventario.jsx
git add src/11-ficha/atalhos-ficha.jsx src/07-inventario/pergaminho-bloqueio.test.js src/07-inventario/pergaminho-descricao-capa.test.jsx src/07-inventario/refetch-pjs.test.js
git commit -m "feat(inventario): livro e pergaminho ensinam magia pela RPC aprender_magia

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Modal *Estudar*

**Files:**
- Modify: `src/07-inventario/inventario.jsx` (novo componente ao lado de `LeituraDocModal`, ~3601; export)
- Modify: `src/index.css` (estilos `.estudar-*` dentro do escopo `.menestrel-ui`)
- Create: `src/07-inventario/estudar-magia.test.jsx`

**Interfaces:**
- Consumes: `bloqueioAprenderNoInventario`, `motivoAprenderLabel` (Task 4); `pontosMagiasTotal`, `gastoMagias`, `nivelMagiaEfetivo`, `calcEstagio` (Task 3); `ModalShell` (`10-shell/shell.jsx`).
- Produces: `EstudarMagiaModal({ titulo, magias, pj, magiasDb, opcoes, lang, onAprender(key) => Promise<{ok, motivo?}>, onClose })` em `window`.

- [ ] **Step 1: Carregar a skill de interface**

Invoque a skill `impeccable` (exigência do CLAUDE.md) antes de escrever o JSX/CSS. Use os tokens de `.menestrel-ui` em `src/index.css` (Cinzel em títulos, Merriweather no corpo, `--fs-*` para tamanhos). A estrutura e os nomes de classe abaixo são o contrato do teste; o visual é seu.

- [ ] **Step 2: Escrever o teste (falha)**

Create `src/07-inventario/estudar-magia.test.jsx`:

```jsx
/* ============================================================
   estudar-magia.test.jsx — a janela de estudar um livro/pergaminho
   ============================================================
   Reforma de 22/10/2026: o livro abre a lista das magias que ensina; o
   jogador escolhe uma e confirma no rodapé (.ms-footer, padrão dos modais)
   o PRÓXIMO nível. Linha bloqueada mostra o porquê. Pontos gastos/total à
   vista. Pergaminho = a mesma janela com uma linha, já escolhida.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';

let Modal;
beforeAll(() => { Modal = window.EstudarMagiaModal; expect(Modal).toBeTypeOf('function'); });
afterEach(cleanup);

const BOLA = { key: 'bola_de_fogo', nome: 'Bola de Fogo', custo: 2, tipo: 'Básica',
  nivel_1: 'a', nivel_3: 'b', nivel_5: 'c', nivel_7: 'd', nivel_9: 'e' };
const LUZ = { key: 'luz', nome: 'Luz', custo: 1, tipo: 'Básica', nivel_1: 'a' };
const DB = [BOLA, LUZ];
// Mago Int 2 Aura 1, estágio 1 → 11 pontos. Já sabe Luz 1 (gasto 1).
const PJ = { profissao: 'Mago', experiencia: 0, intelecto_base: 2, aura_base: 1, magias: { luz: 1 } };
const OP = { noInventario: true, podeAprender: true, aVenda: false };

const abrir = (extra) => render(
  <Modal titulo="Livro do Mago" magias={[BOLA, LUZ]} pj={PJ} magiasDb={DB} opcoes={OP}
    lang="pt" onAprender={async () => ({ ok: true })} onClose={() => {}} {...extra} />,
);
const linhas = () => [...document.querySelectorAll('.estudar-linha')];
const confirmar = () => document.querySelector('.ms-footer button.ms-confirm, .ms-footer [data-confirm]')
  || [...document.querySelectorAll('.ms-footer button')].pop();

describe('EstudarMagiaModal', () => {
  it('mostra pontos gastos/total', () => {
    abrir();
    expect(document.querySelector('.estudar-pontos').textContent).toMatch(/1\s*\/\s*11/);
  });

  it('uma linha por magia com nível atual → próximo e custo do passo', () => {
    abrir();
    expect(linhas().map((l) => l.querySelector('.estudar-nome').textContent)).toEqual(['Bola de Fogo', 'Luz']);
    const bola = linhas()[0];
    expect(bola.querySelector('.estudar-nivel').textContent).toMatch(/—\s*→\s*1/);
    expect(bola.querySelector('.estudar-custo').textContent).toMatch(/2/);
  });

  it('sem escolha, o confirmar fica desativado', () => {
    abrir();
    expect(confirmar().disabled).toBe(true);
  });

  it('linha bloqueada mostra o motivo e não deixa confirmar', () => {
    abrir();
    fireEvent.click(linhas()[1]); // Luz: nível 3 passa do estágio 1
    expect(document.querySelector('.estudar-motivo').textContent).toMatch(/estágio/);
    expect(confirmar().disabled).toBe(true);
  });

  it('escolher e confirmar chama onAprender com a key e fecha no ok', async () => {
    const onAprender = vi.fn(async () => ({ ok: true }));
    const onClose = vi.fn();
    abrir({ onAprender, onClose });
    fireEvent.click(linhas()[0]);
    expect(confirmar().disabled).toBe(false);
    expect(confirmar().textContent).toMatch(/Bola de Fogo 1/);
    fireEvent.click(confirmar());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onAprender).toHaveBeenCalledWith('bola_de_fogo');
  });

  it('recusa da RPC aparece e a janela fica aberta', async () => {
    const onClose = vi.fn();
    abrir({ onAprender: async () => ({ ok: false, motivo: 'pontos_insuficientes' }), onClose });
    fireEvent.click(linhas()[0]);
    fireEvent.click(confirmar());
    await waitFor(() => expect(document.querySelector('.estudar-motivo').textContent).toMatch(/Pontos de magia/));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('pergaminho (uma magia) já vem escolhido', () => {
    abrir({ magias: [BOLA], titulo: 'Pergaminho Bola de Fogo' });
    expect(confirmar().disabled).toBe(false);
  });

  it('item à venda: tudo bloqueado com o motivo', () => {
    abrir({ magias: [BOLA], opcoes: { ...OP, aVenda: true } });
    expect(document.querySelector('.estudar-motivo').textContent).toMatch(/À venda/);
    expect(confirmar().disabled).toBe(true);
  });
});
```

Antes de rodar, abra `ModalShell` em `src/10-shell/shell.jsx:382` e confira a classe real do botão de confirmar dentro de `.ms-footer`; ajuste o helper `confirmar()` para o seletor exato (e apague as alternativas).

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run src/07-inventario/estudar-magia.test.jsx`
Expected: FAIL — `expected undefined to be type of 'function'`.

- [ ] **Step 4: Implementar o componente**

Em `src/07-inventario/inventario.jsx`, logo depois de `LeituraDocModal`:

```jsx
/* ── ESTUDAR (22/10/2026) ────────────────────────────────────────────
   "o personagem poderá aprender a magia usando o item que a ensina" — o
   livro abre a lista das magias vinculadas; o pergaminho, a sua. Escolhe-se
   uma linha e confirma-se no rodapé (padrão dos modais: confirmação no
   .ms-footer). Um nível por vez; o item não se gasta. Portal em #root pelo
   mesmo motivo do LeituraDocModal: abre de dentro da janela do item. */
function EstudarMagiaModal({ titulo, magias, pj, magiasDb, opcoes, lang, onAprender, onClose }) {
  const en = lang === 'en';
  const lista = Array.isArray(magias) ? magias : [];
  const [escolhida, setEscolhida] = useState(lista.length === 1 ? lista[0].key : null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  const estagio = pj ? calcEstagio(pj.experiencia || 0) : 0;
  const total = pj ? pontosMagiasTotal(pj.profissao, estagio, pj.intelecto_base, pj.aura_base) : 0;
  const gasto = pj ? gastoMagias(pj.magias || {}, magiasDb || []) : 0;

  const linhas = lista.map((m) => {
    const passos = Number(((pj && pj.magias) || {})[m.key]) || 0;
    const atual = passos > 0 ? nivelMagiaEfetivo(passos) : null;
    const proximo = passos < 5 ? nivelMagiaEfetivo(passos + 1) : null;
    const custoPasso = proximo != null ? (m.custo || 0) * (proximo - (atual || 0)) : null;
    const bloqueio = bloqueioAprenderNoInventario(m, pj, { ...(opcoes || {}), magiasDb });
    return { m, atual, proximo, custoPasso, bloqueio };
  });
  const sel = linhas.find((l) => l.m.key === escolhida) || null;
  const motivo = erro || (sel && sel.bloqueio
    ? motivoAprenderLabel(sel.bloqueio.motivo, en, sel.bloqueio) : null);

  const confirmar = async () => {
    if (!sel || sel.bloqueio || enviando) return;
    setEnviando(true); setErro(null);
    const r = await onAprender(sel.m.key);
    if (r && r.ok) { onClose(); return; }
    setEnviando(false);
    setErro(motivoAprenderLabel(r && r.motivo, en));
  };

  const rotuloConfirmar = sel && sel.proximo != null
    ? `${en ? 'Learn' : 'Aprender'} ${sel.m.nome} ${sel.proximo}`
    : (en ? 'Learn' : 'Aprender');

  const conteudo = (
    <div className="menestrel-ui">
      <ModalShell
        title={<><i className="ti ti-school det-title-ic" aria-hidden="true" /> {titulo}</>}
        lang={lang}
        size="md"
        extraClass="modal-estudar"
        onClose={onClose}
        onCancel={onClose}
        cancelLabel={en ? 'Close' : 'Fechar'}
        onConfirm={confirmar}
        confirmLabel={enviando ? (en ? 'Learning…' : 'Aprendendo…') : rotuloConfirmar}
        confirmDisabled={!sel || !!sel.bloqueio || enviando}
        footerCenter={motivo ? <span className="estudar-motivo" role="status">{motivo}</span> : null}
      >
        <p className="estudar-pontos">
          {en ? 'Magic points' : 'Pontos de magia'}: <strong>{gasto} / {total}</strong>
        </p>
        <ul className="estudar-lista" role="radiogroup" aria-label={en ? 'Spells' : 'Magias'}>
          {linhas.map(({ m, atual, proximo, custoPasso, bloqueio }) => (
            <li key={m.key}
              className={'estudar-linha' + (escolhida === m.key ? ' on' : '') + (bloqueio ? ' estudar-linha--bloqueada' : '')}
              role="radio" aria-checked={escolhida === m.key} tabIndex={0}
              onClick={() => { setEscolhida(m.key); setErro(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEscolhida(m.key); setErro(null); } }}>
              <span className="estudar-nome">{m.nome}</span>
              <span className="estudar-tipo">{m.tipo}</span>
              <span className="estudar-nivel">{atual != null ? atual : '—'} → {proximo != null ? proximo : (en ? 'max' : 'máx.')}</span>
              <span className="estudar-custo">{custoPasso != null ? `+${custoPasso}` : '—'}</span>
            </li>
          ))}
        </ul>
      </ModalShell>
    </div>
  );
  const alvo = (typeof document !== 'undefined') && (document.getElementById('root') || document.body);
  return (alvo && ReactDOM && ReactDOM.createPortal) ? ReactDOM.createPortal(conteudo, alvo) : conteudo;
}
```

Acrescente `EstudarMagiaModal,` ao export, ao lado de `LeituraDocModal, urlLeituraDoc,`.

Se `ModalShell` não aceitar `footerCenter` como você usou, confira a assinatura (linha 382 de `shell.jsx`: aceita `footerCenter`) e onde ele o renderiza — o motivo precisa ficar dentro de `.ms-footer`.

- [ ] **Step 5: Estilos**

Em `src/index.css`, dentro do bloco escopado em `.menestrel-ui` onde vivem os outros modais do inventário (procure `.modal-leitura-doc`), acrescente as regras `.modal-estudar .estudar-pontos`, `.estudar-lista`, `.estudar-linha` (grade de 4 colunas: nome · tipo · nível · custo), `.estudar-linha.on`, `.estudar-linha--bloqueada` (esmaecida, ainda clicável para ver o motivo), `:focus-visible` e `.estudar-motivo`. Use só tokens existentes (cores, `--fs-*`, fontes). Lista com rolagem própria se passar de ~8 linhas (os livros de deus têm 17). Siga o que a skill `impeccable` orientar.

- [ ] **Step 6: Rodar**

Run: `npx vitest run src/07-inventario/estudar-magia.test.jsx src/07-inventario/pergaminho-descricao-capa.test.jsx`
Expected: PASS.

- [ ] **Step 7: Ver no app**

Rode `npm run dev`, abra o inventário de um PJ seu, abra um pergaminho e confira: ação Aprender → modal com uma linha escolhida. (Livros só ganham Estudar depois da Task 9 aplicar o banco; até lá, confira o pergaminho.) Confira em largura de celular (sem rolagem horizontal).

- [ ] **Step 8: Commit**

```bash
git add -p src/07-inventario/inventario.jsx src/index.css
git add src/07-inventario/estudar-magia.test.jsx
git commit -m "feat(inventario): janela Estudar para aprender magia do livro ou pergaminho

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Criador de personagem sem stepper de magias

**Files:**
- Modify: `src/08-personagens/personagens.jsx` (~20, ~1146, ~1249-1253, ~1299-1302, ~1320-1326, ~1344, ~1373-1375, ~1402, ~1443, ~1457-1460, ~1508-1509, ~1597-1610, ~2542-2856 `StepMagias`, ~2885-2897 e ~3005 `StepRevisao`, ~3078 export)
- Modify: `src/08-personagens/guia_personagem.jsx:800-823`
- Create: `src/08-personagens/criador-sem-magias.test.jsx`

**Interfaces:**
- Consumes: nada novo.
- Produces: o wizard não tem passo `magias`; o payload de criação grava `magias: {}`; o de edição **não** contém a chave `magias`. `StepMagias` sai do export.

- [ ] **Step 1: Escrever o teste (falha)**

Abra `src/08-personagens/wizard-layout.test.jsx` e copie dele os imports e o helper que monta o wizard (o componente e as props que ele usa, inclusive o fake do Supabase de `src/test/fake-supabase.js`). Create `src/08-personagens/criador-sem-magias.test.jsx` com esse cabeçalho e estes casos (adapte só os nomes do helper copiado):

```jsx
/* ============================================================
   criador-sem-magias.test.jsx — reforma de 22/10/2026
   ============================================================
   "Não teremos mais o stepper de magia na criação do personagem." Magia se
   aprende pelo item (inventário → Estudar). E a edição NÃO regrava
   `magias`: a RPC aprender_magia grava por fora, e um wizard aberto antes
   apagaria o que foi aprendido depois.
   ============================================================ */
// imports e helper `montarWizard(props)` copiados de wizard-layout.test.jsx

describe('criador sem magias', () => {
  it.each(['Mago', 'Sacerdote', 'Guerreiro'])('%s: nenhum passo de magias', async (profissao) => {
    await montarWizard({ form: { profissao } });
    const rotulos = [...document.querySelectorAll('.wiz-steps [data-step], .wiz-step')].map((n) => n.textContent);
    expect(rotulos.join('|')).not.toMatch(/Magias/);
  });

  it('StepMagias saiu', () => {
    expect(window.StepMagias).toBeUndefined();
  });
});

describe('payload', () => {
  it('criação grava magias vazio', async () => {
    const { salvarEPegarPayload } = await montarWizard({ form: { profissao: 'Mago' } });
    const p = await salvarEPegarPayload();
    expect(p.magias).toEqual({});
  });
  it('edição não manda magias', async () => {
    const { salvarEPegarPayload } = await montarWizard({
      personagemExistente: { id: 7, user_id: 'u1', profissao: 'Mago', magias: { luz: 1 } },
    });
    const p = await salvarEPegarPayload();
    expect('magias' in p).toBe(false);
  });
});
```

Se `wizard-layout.test.jsx` não tiver um jeito de capturar o payload, implemente `salvarEPegarPayload` no seu helper espiando o fake do Supabase: guarde o último argumento de `.insert(...)`/`.update(...)` na tabela `personagens` e devolva-o depois de clicar em Salvar no último passo. O seletor de passos (`.wiz-steps …`) também vem do que o `wizard-layout.test.jsx` já usa — troque pelo dele.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/08-personagens/criador-sem-magias.test.jsx`
Expected: FAIL — passo "Magias Básicas" presente para Mago; `StepMagias` definido.

- [ ] **Step 3: Remover o stepper**

Em `src/08-personagens/personagens.jsx`:
- Linha ~20 (índice do cabeçalho): apague `- StepMagias — escolha de magias (carrega DB)`.
- Linhas ~1249-1253: apague o bloco `// ---- Magias … magRestantes`.
- Linhas ~1299-1302: apague o spread `...(usaMagia ? [ …magias… ] : []),`.
- Linhas ~1320-1326: apague o `useEffect` "Limpa magias do form quando a profissão deixa de usar magia".
- Linha ~1344: apague a entrada `'magias': 'Escolha as magias…'`.
- Linhas ~1373-1375: apague `erroMagias`.
- Linha ~1402: apague `currentId === 'magias' ? !erroMagias :`.
- Linha ~1443: troque `magias: usaMagia ? (form.magias || {}) : {},` por nada (remova a linha) e, logo depois do objeto `payload`, acrescente:

```js
    /* Magias (22/10/2026): aprendem-se pelo item (RPC aprender_magia), fora
       do wizard. Criação nasce sem nenhuma; edição NÃO manda a coluna — um
       wizard aberto antes de estudar um livro apagaria o que foi aprendido. */
    if (!isEdit) payload.magias = {};
```

- Linhas ~1457-1460: na chamada `todosOsPontosGastos({...})`, apague `magias: magRestantes,` e `usaMagia,`.
- Linhas ~1508-1509: apague o ramo `: currentId === 'magias' ? (<WizSaldo … magTotalPontos …/>)`.
- Linhas ~1597-1610: apague o bloco `{currentId === 'magias' && (<StepMagias … />)}`.
- Apague a função `StepMagias` inteira (de `function StepMagias(` até o `}` que a fecha, antes de `function StepRevisao`), e tire `StepMagias,` do export (~3078).
- Em `StepRevisao` (~3005): troque `{profissaoUsaMagia(form.profissao) && (` por `{magCompradas.length > 0 && (` e feche o parêntese correspondente sem mudança; apague o ramo `magCompradas.length === 0 ? (<p className="wiz-review-empty">…) :` deixando só o `<dl>` (sem magias, a seção não aparece).
- Se `magiasDb`/`magiasError` e o `fetch` de `magias` (~1146) passarem a ser usados só pelo `StepRevisao`, mantenha-os (o resumo da edição mostra os nomes). Se o lint acusar variável sem uso (`magiasError`), remova-a e o seu estado.

Rode `npx eslint src/08-personagens/personagens.jsx` e corrija os `no-unused-vars` que restarem de `usaMagia`, `magTotalPontos`, `magGasto`, `magRestantes`, `podeAcessarMagia`, `magiaEhTravada`, `MAGIAS_POR_PROFISSAO`, `passosDisponiveisMagia`.

- [ ] **Step 4: Atualizar o guia**

Em `src/08-personagens/guia_personagem.jsx`, substitua o trecho de `<SectionHead icon="ti-wand" titulo="Magias">` até o `<li><b>Raridade.</b>…</li>` (inclusive a tabela) por:

```jsx
        <SectionHead icon="ti-wand" titulo="Magias">
          Toda profissão pode aprender qualquer magia — pelo item que a ensina. Magia se aprende em passos e se paga em Karma.
        </SectionHead>
        <Essencial itens={[
          <>Cada passo abre um nível ímpar: <b>1, 3, 5, 7 e 9</b>.</>,
          <>Aprender custa <b>nível × custo da magia</b>; conjurar gasta <b>Karma igual ao nível</b>.</>,
          <>Aprende-se <b>estudando um livro</b> (Livro do Mago, do seu deus, da sua Ordem…) ou <b>um pergaminho</b>. O item não se gasta.</>,
        ]} />
        <div className="gp-table-wrap">
          <table className="gp-table">
            <thead><tr><th>Profissão</th><th>Pontos-base por estágio</th></tr></thead>
            <tbody>
              <tr><td>Mago, Bardo</td><td>8</td></tr>
              <tr><td>Rastreador, Sacerdote</td><td>5</td></tr>
              <tr><td>Guerreiro, Ladino</td><td>1</td></tr>
            </tbody>
          </table>
        </div>
        <ul className="gp-list">
          <li><b>Pontos.</b> Por estágio: pontos-base + Intelecto + Aura (atributo negativo conta 0). Com Aura negativa, a base é 0.</li>
          <li><b>Passos.</b> O 1º passo é o nível 1, o 2º é o nível 3, e assim até o 5º, nível 9. Uma magia no nível 5 com custo 2 custa 10 pontos e gasta 5 de Karma por conjuração. Um nível por vez, nunca acima do estágio.</li>
          <li><b>Custos.</b> Básicas custam 1 ou 2 por nível; Perdidas, 2 ou 3; Ancestrais, 3 ou 4.</li>
          <li><b>Livros e pergaminhos.</b> As magias Básicas estão nos livros (de profissão, de deus, de Ordem, Colégio, Confraria ou Trilha). Perdidas e Ancestrais têm pergaminho próprio — de tempos em tempos um aparece na loja da história.</li>
```

(mantendo os `<li>` seguintes — Itens necessários, Itens mágicos, Elemento, Resistência — como estão).

- [ ] **Step 5: Rodar**

Run: `npx vitest run src/08-personagens`
Expected: PASS (inclusive `wizard-layout.test.jsx`; se ele contava passos de magia, atualize a contagem esperada).

- [ ] **Step 6: Commit**

```bash
git add -p src/08-personagens/personagens.jsx
git add src/08-personagens/guia_personagem.jsx src/08-personagens/criador-sem-magias.test.jsx
git commit -m "feat(personagens): criador sem passo de magias; edição não regrava magias

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Ficha — só magias aprendidas e pontos à vista

**Files:**
- Modify: `src/11-ficha/ficha.jsx` (~2313-2314, ~2611-2618, `FichaInfoView` ~1484 e col5 ~1891-1915)
- Modify: `src/index.css` (`.fp-col-pontos`)
- Modify: `src/11-ficha/ficha-info-nav.test.jsx`

**Interfaces:**
- Consumes: `pontosMagiasTotal`, `gastoMagias` (Task 3).
- Produces: `catalogoMag` = só as magias que o PJ tem; col5 da Informações mostra `Pontos de magia: gasto / total`.

- [ ] **Step 1: Escrever o teste (falha)**

Em `src/11-ficha/ficha-info-nav.test.jsx`, perto do caso que passa `catalogoMag: [{ key: 'luz', … }]` (linha ~254), acrescente um caso que renderiza `FichaInfoView` com `parte="conhecimento"`, `pj={{ profissao: 'Guerreiro', intelecto_base: 1, aura_base: 0, magias: { luz: 1 } }}`, `estagioNum={2}`, `pjMagias={{ luz: 1 }}`, `catalogoMag={[{ key: 'luz', nome: 'Luz', custo: 1 }]}` e as demais props copiadas do caso vizinho, e espera:

```js
    expect(document.querySelector('.fp-col-pontos').textContent).toMatch(/1\s*\/\s*4/);
```

(Guerreiro: base 1 + Int 1 = 2 por estágio × 2 = 4; Luz 1 × custo 1 = 1.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/11-ficha/ficha-info-nav.test.jsx`
Expected: FAIL — `.fp-col-pontos` é null.

- [ ] **Step 3: Implementar**

(a) Linhas ~2313-2314: apague `_usaMagia_fn` e `_podeMagia_fn`.

(b) `catalogoMag` (~2611): troque por

```js
  // Só o que o PJ aprendeu (22/10/2026): sem permissão por profissão, o
  // "catálogo alcançável" virou o catálogo inteiro — 239 linhas de "—".
  const catalogoMag = useMemo(
    () => Object.values(magiasByKey)
      .filter((m) => magKeysPossuidas.has(m.key))
      .sort(_porPosseDepoisNome(magKeysPossuidas)),
    [magiasByKey, magKeysPossuidas]
  );
```

(c) Em `FichaInfoView`, logo antes de `const col5 = (`:

```js
  // Orçamento de magia (22/10/2026): aprende-se pelo item; aqui só se vê.
  const _pontosMag = (typeof pontosMagiasTotal !== 'undefined' ? pontosMagiasTotal : null) || window.pontosMagiasTotal;
  const _gastoMag  = (typeof gastoMagias !== 'undefined' ? gastoMagias : null) || window.gastoMagias;
  const magTotal = _pontosMag && pj ? _pontosMag(pj.profissao, estagioNum, pj.intelecto_base, pj.aura_base) : null;
  const magGasto = _gastoMag ? _gastoMag(pjMagias || {}, catalogoMag || []) : null;
```

e dentro de `col5`, logo depois de `<ColTitleNav … />`:

```jsx
      {magTotal != null && (
        <div className="fp-col-pontos">
          {en ? 'Magic points' : 'Pontos de magia'}: <strong>{magGasto} / {magTotal}</strong>
        </div>
      )}
```

(d) Em `src/index.css`, ao lado das regras `.fp-col-empty`, acrescente `.fp-col-pontos` no mesmo tom/tamanho do `.fp-col-empty` (texto secundário, `--fs-*` pequeno), com a skill `impeccable` carregada.

- [ ] **Step 4: Rodar**

Run: `npx vitest run src/11-ficha`
Expected: PASS. Se algum teste esperava magia "não aprendida" (`fp2-statrow--locked`) na lista de magias, troque pela expectativa nova (só as aprendidas) e cite a reforma de 22/10/2026 no comentário do teste.

- [ ] **Step 5: Commit**

```bash
git add -p src/11-ficha/ficha.jsx src/index.css
git add src/11-ficha/ficha-info-nav.test.jsx
git commit -m "feat(ficha): magias aprendidas e pontos de magia gastos/total

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Admin — "Pergaminhos deste livro"

**Files:**
- Modify: `src/09-bestiario/catalogo-descritores.jsx` (descritor `itens`, ~307+)
- Modify: `src/09-bestiario/catalogo-editor.jsx` (`CatalogoCampo` ~345; `CatalogoEditor` ~594-800)
- Modify: `src/01-core/constants.jsx` (`ADMIN_COPY` pt/en: `campoPergaminhosLivro`)
- Modify: `src/09-bestiario/catalogo-editor.test.jsx`

**Interfaces:**
- Consumes: tabela `livro_pergaminhos` (Task 1); `CatalogoLista` (já existe).
- Produces: campo `{ col: 'pergaminhos_do_livro', tipo: 'vinculo', semColuna: true, grupos: ['Itens'], vinculo: { tabela: 'livro_pergaminhos', dono: 'livro_slug', alvo: 'pergaminho_slug', prefixo: 'pergaminho_' } }`. O editor carrega e grava o vínculo depois de salvar a linha.

- [ ] **Step 1: Escrever o teste (falha)**

Em `src/09-bestiario/catalogo-editor.test.jsx`, use o `montar({ tabela, linha })` e o fake do Supabase que o arquivo já usa e acrescente:

```jsx
describe('livro: pergaminhos vinculados (22/10/2026)', () => {
  it('carrega os vínculos, mostra por nome e grava a lista nova ao salvar', async () => {
    // Fake: itens com dois pergaminhos e livro_pergaminhos com um vínculo.
    fakeTabela('itens', [
      { slug: 'livro_do_mago', nome: 'Livro do Mago', grupo: 'Itens' },
      { slug: 'pergaminho_luz', nome: 'Pergaminho Luz', grupo: 'Consumíveis' },
      { slug: 'pergaminho_bola_de_fogo', nome: 'Pergaminho Bola de Fogo', grupo: 'Consumíveis' },
    ]);
    fakeTabela('livro_pergaminhos', [{ livro_slug: 'livro_do_mago', pergaminho_slug: 'pergaminho_luz' }]);
    montar({ tabela: 'itens', linha: { slug: 'livro_do_mago', nome: 'Livro do Mago', grupo: 'Itens' } });
    const campo = await screen.findByText('Pergaminho Luz');
    expect(campo.closest('[data-lista="pergaminhos_do_livro"]')).toBeTruthy();

    adicionarNaLista('pergaminhos_do_livro', 'Pergaminho Bola de Fogo');
    await salvar();

    expect(ultimoDelete('livro_pergaminhos')).toEqual({ livro_slug: 'livro_do_mago' });
    expect(ultimoInsert('livro_pergaminhos')).toEqual([
      { livro_slug: 'livro_do_mago', pergaminho_slug: 'pergaminho_luz' },
      { livro_slug: 'livro_do_mago', pergaminho_slug: 'pergaminho_bola_de_fogo' },
    ]);
    // A coluna inventada nunca vai para a tabela itens.
    expect('pergaminhos_do_livro' in ultimoUpdate.payload).toBe(false);
  });

  it('item que não é do grupo Itens não mostra o campo', async () => {
    montar({ tabela: 'itens', linha: { slug: 'adaga', nome: 'Adaga', grupo: 'Armas' } });
    expect(document.querySelector('[data-lista="pergaminhos_do_livro"]')).toBeNull();
  });
});
```

`fakeTabela`, `adicionarNaLista`, `salvar`, `ultimoDelete`, `ultimoInsert`: use os helpers equivalentes que o arquivo já tem (há `ultimoUpdate`, `clicarMulti`, `montar`). Para os que não existirem, escreva-os no topo do arquivo sobre o mesmo fake (`src/test/fake-supabase.js`): `adicionarNaLista(col, nome)` digita `nome` no input de busca dentro de `[data-lista="<col>"]` e clica na sugestão; `ultimoDelete/ultimoInsert(tabela)` leem o registro de chamadas do fake.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/09-bestiario/catalogo-editor.test.jsx -t "pergaminhos vinculados"`
Expected: FAIL — o campo não existe.

- [ ] **Step 3: Descritor e texto**

Em `src/09-bestiario/catalogo-descritores.jsx`, no fim de `itens.campos`:

```js
      /* Livro → pergaminhos (22/10/2026): "Dentro desses livros, estarão
         vinculadas os itens para aprendizado das magias". Não é coluna de
         itens: vive em livro_pergaminhos, e o editor grava depois de salvar. */
      { col: 'pergaminhos_do_livro', tipo: 'vinculo', rotuloKey: 'campoPergaminhosLivro', semColuna: true,
        grupos: ['Itens'],
        vinculo: { tabela: 'livro_pergaminhos', dono: 'livro_slug', alvo: 'pergaminho_slug', prefixo: 'pergaminho_' } },
```

Em `src/01-core/constants.jsx`, no `ADMIN_COPY`, ao lado de `campoItensNecessarios`: pt `campoPergaminhosLivro: 'Pergaminhos deste livro'`, en `campoPergaminhosLivro: 'Scrolls in this book'`.

Se `catalogo-descritores.test.js` comparar as colunas do descritor com as da tabela, acrescente `pergaminhos_do_livro` à lista de exceções dele do mesmo jeito que outros campos `semColuna` já estão (procure `semColuna` no teste).

- [ ] **Step 4: Editor**

Em `src/09-bestiario/catalogo-editor.jsx`:

(a) Em `CatalogoEditor`, depois do `useEffect` de `refsPorFonte`:

```js
  /* Campos `vinculo` (livro_pergaminhos, 22/10/2026): a lista mora noutra
     tabela. Carrega os slugs vinculados e os candidatos (slug ↔ nome). */
  const camposVinculo = descritor ? descritor.campos.filter((c) => c.tipo === 'vinculo') : [];
  const [candidatosVinculo, setCandidatosVinculo] = React.useState({}); // col → [{slug, nome}]
  React.useEffect(() => {
    if (!camposVinculo.length) return undefined;
    let cancelado = false;
    camposVinculo.forEach((c) => {
      fetchTabelaPaginada(descritor.tabela, { colunas: 'slug, nome', ordem: ['nome'] }).then(({ data }) => {
        if (cancelado) return;
        const lista = (data || []).filter((r) => String(r.slug || '').startsWith(c.vinculo.prefixo));
        setCandidatosVinculo((m) => ({ ...m, [c.col]: lista }));
      });
      if (linha && linha[descritor.chave]) {
        supabaseClient.from(c.vinculo.tabela).select(c.vinculo.alvo).eq(c.vinculo.dono, linha[descritor.chave])
          .then(({ data }) => {
            if (cancelado) return;
            setForm((f) => ({ ...f, [c.col]: (data || []).map((r) => r[c.vinculo.alvo]) }));
          });
      }
    });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descritor, linha]);
```

(b) Em `salvar`, depois que a linha foi gravada com sucesso (logo após `if (err) { … return; }`), acrescente:

```js
    // Vínculos: troca a lista inteira do dono (delete + insert).
    for (const c of camposVinculo) {
      const dono = data && data[descritor.chave];
      const escolhidos = Array.isArray(form[c.col]) ? form[c.col] : [];
      if (!dono) continue;
      const { error: errDel } = await supabaseClient.from(c.vinculo.tabela).delete().eq(c.vinculo.dono, dono);
      if (errDel) { setSaving(false); setError(errDel.message); return; }
      if (escolhidos.length) {
        const { error: errIns } = await supabaseClient.from(c.vinculo.tabela)
          .insert(escolhidos.map((s) => ({ [c.vinculo.dono]: dono, [c.vinculo.alvo]: s })));
        if (errIns) { setSaving(false); setError(errIns.message); return; }
      }
    }
```

(O `semColuna: true` já tira o campo do payload — guarda do topo do loop de `salvar`.)

(c) Em `camposVazios`, o valor inicial de `tipo === 'vinculo'` é `[]`: troque `c.tipo === 'equipamento' ? [] : ''` por `(c.tipo === 'equipamento' || c.tipo === 'vinculo') ? [] : ''`.

(d) Em `CatalogoCampo`, antes do `if (campo.tipo === 'lista')`:

```jsx
  /* Vínculo: a mesma pílula da `lista`, por NOME na tela e SLUG no valor. */
  if (campo.tipo === 'vinculo') {
    const cands = (refs && refs.candidatos) || [];
    const porSlug = Object.fromEntries(cands.map((r) => [r.slug, r.nome]));
    const porNome = Object.fromEntries(cands.map((r) => [r.nome, r.slug]));
    const slugs = Array.isArray(valor) ? valor : [];
    return (
      <CatalogoLista campo={campo} label={label} disabled={disabled} t={t}
        nomes={cands.map((r) => r.nome)}
        valor={slugs.map((s) => porSlug[s] || s).join(', ')}
        onChange={(texto) => onChange(listaSeparar(texto).map((n) => porNome[n] || n))} />
    );
  }
```

e, onde `CatalogoEditor` renderiza `<CatalogoCampo … refs={…} />` (linha ~896), passe para campo `vinculo`:

```jsx
            refs={campo.tipo === 'referencia' ? refsPorFonte[campo.fonte]
              : campo.tipo === 'vinculo' ? { candidatos: candidatosVinculo[campo.col] || [] } : undefined}
```

Confira que `listaSeparar` está no escopo de `CatalogoCampo` (é usada por `CatalogoLista` no mesmo arquivo).

- [ ] **Step 5: Rodar**

Run: `npx vitest run src/09-bestiario`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/09-bestiario/catalogo-descritores.jsx src/09-bestiario/catalogo-editor.jsx src/09-bestiario/catalogo-editor.test.jsx src/09-bestiario/catalogo-descritores.test.js
git add -p src/01-core/constants.jsx
git commit -m "feat(admin): livro de itens edita os pergaminhos vinculados

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Aplicar o banco, remover a RPC antiga e verificar tudo

**Files:**
- Create: `scripts/sql/aprendizado-magia-remove-antigo-2026-10-22.sql`

- [ ] **Step 1: Suíte e build antes do banco**

Run: `npm test` e `npm run build`
Expected: tudo verde. Se algum teste fora das tasks quebrar por `podeAcessarMagia`, `profissaoUsaMagia`, `MAGIAS_POR_PROFISSAO`, `magiaEhTravada` ou `bloqueioPergaminho`, ajuste-o para a regra nova (com comentário citando 22/10/2026). Confira também `npx eslint src`.

- [ ] **Step 2: Aplicar o script de catálogo**

Rode pelo MCP `mcp__supabase-write__execute_sql` o conteúdo **inteiro** de `scripts/sql/aprendizado-magia-por-item-2026-10-22.sql` (com `COMMIT`).
Expected: sem erro. Confira:

```sql
SELECT (SELECT count(*) FROM public.livro_pergaminhos) vinculos,
       (SELECT count(*) FROM public.itens WHERE slug LIKE 'pergaminho\_%' AND grupo = 'Consumíveis') pergaminhos;
```

- [ ] **Step 3: Aplicar a RPC e rodar o ensaio**

Rode `scripts/sql/aprender-magia-rpc-2026-10-22.sql` (com `COMMIT`), depois `scripts/sql/aprender-magia-rpc-2026-10-22.teste.sql` (termina em `ROLLBACK`).
Expected: `NOTICE: aprender_magia: todos os ensaios passaram`.

- [ ] **Step 4: Remover o que ficou velho**

Confira que nada mais chama as funções antigas:

```sql
SELECT proname FROM pg_proc
 WHERE prosrc ILIKE '%usar_pergaminho_magia%' OR prosrc ILIKE '%_menestrel_pontos_magia_estagio%';
```

Expected: só as próprias (`usar_pergaminho_magia`). Então create `scripts/sql/aprendizado-magia-remove-antigo-2026-10-22.sql`:

```sql
-- Depois do front novo (22/10/2026): a RPC antiga consumia o pergaminho e
-- conferia profissão — regras que saíram. Ninguém mais a chama
-- (grep no src e pg_proc conferidos).
BEGIN;
DROP FUNCTION IF EXISTS public.usar_pergaminho_magia(bigint, text);
DROP FUNCTION IF EXISTS public._menestrel_pontos_magia_estagio(text);
COMMIT;
```

Rode `grep -rn "usar_pergaminho_magia" src` — Expected: nenhuma ocorrência em código (só comentários históricos, que podem ficar). Aplique o script pelo MCP.

- [ ] **Step 5: Ver no app**

`npm run dev`, entre com um PJ de teste que tenha (ou receba pelo Mestre) o Livro do Mago: Estudar → escolher magia → Aprender → a ficha mostra a magia e os pontos. Confira um Guerreiro também. Confira o admin de itens: abrir "Livro do Mago" mostra os pergaminhos vinculados.

- [ ] **Step 6: Advisors**

Rode o MCP `get_advisors` (security) e confira que `livro_pergaminhos` e as tabelas `backup_*_2026_10_22` não aparecem como "RLS desabilitado".

- [ ] **Step 7: Commit e push**

```bash
git add scripts/sql/aprendizado-magia-remove-antigo-2026-10-22.sql
git commit -m "chore(magias): remove usar_pergaminho_magia e a tabela de pontos antiga

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- scripts/sql/aprendizado-magia-remove-antigo-2026-10-22.sql
git push origin main
```

Avise o usuário: o banco já está na regra nova; o front entra no ar quando ele publicar com `vercel` (não afirmar o que está no ar). Até publicar, o site antigo mostra o stepper e o "Aprender" antigo recusa (RPC removida) — por isso publicar logo em seguida.
