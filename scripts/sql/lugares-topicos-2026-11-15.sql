-- scripts/sql/lugares-topicos-2026-11-15.sql
-- ============================================================
-- OS TÓPICOS DE REINOS, CIDADES E LOCAIS (15/11/2026)
-- ============================================================
-- Usuário:
--   Reinos:  Fundação · História · Cultura · Governo · Rumores
--   Cidades: Fundação · História · Cultura · Pessoas · Rumores
--   Locais:  Fundação · História · Pessoas · Rumores
-- e, sobre o que já estava escrito: "só não exclua nenhuma informação".
-- "Pessoas" é "um misto dos dois": o texto (coluna `pessoas`) e, embaixo, as
-- Pessoas da Ambientação ligadas ao lugar (montado na tela). "Fundação" é
-- texto.
--
--   • Colunas novas: reinos.fundacao; cidades.fundacao, .cultura, .pessoas;
--     locais.fundacao, .pessoas.
--   • História = a coluna `descricao` (a tela só troca o rótulo). No reino, a
--     `historia_recente` é ACRESCENTADA à descrição — e a coluna fica como
--     está, intacta.
--   • Cultura da cidade nasce com o texto da `economia`, que também fica.
--   • As quatro listagens e salvar_lore_entrada passam a ler e gravar os
--     campos novos (substituição no corpo de cada função, conferida).
--
-- CÓPIAS ANTES: backup.reinos_20261115, backup.cidades_20261115,
-- backup.locais_20261115 (esquema fora da API).
-- ============================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS backup;
CREATE TABLE IF NOT EXISTS backup.reinos_20261115  AS SELECT * FROM public.reinos;
CREATE TABLE IF NOT EXISTS backup.cidades_20261115 AS SELECT * FROM public.cidades;
CREATE TABLE IF NOT EXISTS backup.locais_20261115  AS SELECT * FROM public.locais;

ALTER TABLE public.reinos  ADD COLUMN IF NOT EXISTS fundacao text;
ALTER TABLE public.cidades ADD COLUMN IF NOT EXISTS fundacao text,
                           ADD COLUMN IF NOT EXISTS cultura  text,
                           ADD COLUMN IF NOT EXISTS pessoas  text;
ALTER TABLE public.locais  ADD COLUMN IF NOT EXISTS fundacao text,
                           ADD COLUMN IF NOT EXISTS pessoas  text;

-- História do reino = descrição + história recente (a coluna antiga fica).
UPDATE public.reinos
   SET descricao = CASE WHEN NULLIF(btrim(descricao), '') IS NULL THEN btrim(historia_recente)
                        ELSE btrim(descricao) || E'\n' || btrim(historia_recente) END
 WHERE NULLIF(btrim(historia_recente), '') IS NOT NULL
   AND position(btrim(historia_recente) IN coalesce(descricao, '')) = 0;

-- Cultura da cidade nasce da economia (a coluna antiga fica).
UPDATE public.cidades SET cultura = economia
 WHERE cultura IS NULL AND NULLIF(btrim(economia), '') IS NOT NULL;

-- As listagens: os campos novos no `atributos` de cada lugar.
DO $$
DECLARE
  f text;
  d text;
  n text;
BEGIN
  FOREACH f IN ARRAY ARRAY['public.listar_lore_historia(bigint)', 'public.listar_catalogo_global(text)',
                           'public.listar_diario_disponivel(bigint)', 'public.listar_diario_lore(bigint)'] LOOP
    d := pg_get_functiondef(f::regprocedure);
    IF d LIKE '%''fundacao''%' THEN CONTINUE; END IF;   -- já feito
    n := regexp_replace(d, '''historia_recente'', ([a-z]+\.)?historia_recente',
                           '''historia_recente'', \1historia_recente, ''fundacao'', \1fundacao', 'g');
    n := regexp_replace(n, '''economia'', ([a-z]+\.)?economia',
                           '''economia'', \1economia, ''cultura'', \1cultura, ''pessoas'', \1pessoas, ''fundacao'', \1fundacao', 'g');
    n := regexp_replace(n, '''populacao'', ([a-z]+\.)?populacao, ''rumores'', ([a-z]+\.)?rumores\)',
                           '''populacao'', \1populacao, ''rumores'', \2rumores, ''pessoas'', \1pessoas, ''fundacao'', \1fundacao)', 'g');
    IF n = d OR (length(n) - length(replace(n, '''fundacao''', ''))) / length('''fundacao''') < 3 THEN
      RAISE EXCEPTION 'listagem % não casou os três lugares', f;
    END IF;
    EXECUTE n;
  END LOOP;
END $$;

-- A gravação: o bloco final, campo a campo, ganha os novos.
DO $$
DECLARE
  d text := pg_get_functiondef('public.salvar_lore_entrada(text,bigint,text,text,text,text,jsonb,text,bigint)'::regprocedure);
  n text;
BEGIN
  IF d LIKE '%''fundacao''%' THEN RETURN; END IF;
  n := replace(d,
    'capital = CASE WHEN p_atributos ? ''capital_cidade'' THEN NULLIF(p_atributos->>''capital_cidade'', '''') ELSE capital END
      WHERE slug = alvo_slug;',
    'capital = CASE WHEN p_atributos ? ''capital_cidade'' THEN NULLIF(p_atributos->>''capital_cidade'', '''') ELSE capital END,
        fundacao = CASE WHEN p_atributos ? ''fundacao'' THEN NULLIF(p_atributos->>''fundacao'', '''') ELSE fundacao END
      WHERE slug = alvo_slug;');
  n := replace(n,
    'religiao = CASE WHEN p_atributos ? ''religiao'' THEN NULLIF(p_atributos->>''religiao'', '''') ELSE religiao END,',
    'religiao = CASE WHEN p_atributos ? ''religiao'' THEN NULLIF(p_atributos->>''religiao'', '''') ELSE religiao END,
        fundacao = CASE WHEN p_atributos ? ''fundacao'' THEN NULLIF(p_atributos->>''fundacao'', '''') ELSE fundacao END,
        cultura = CASE WHEN p_atributos ? ''cultura'' THEN NULLIF(p_atributos->>''cultura'', '''') ELSE cultura END,
        pessoas = CASE WHEN p_atributos ? ''pessoas'' THEN NULLIF(p_atributos->>''pessoas'', '''') ELSE pessoas END,');
  n := replace(n,
    'UPDATE public.locais SET
        rumores = CASE WHEN p_atributos ? ''rumores'' THEN NULLIF(p_atributos->>''rumores'', '''') ELSE rumores END
      WHERE slug = alvo_slug;',
    'UPDATE public.locais SET
        rumores = CASE WHEN p_atributos ? ''rumores'' THEN NULLIF(p_atributos->>''rumores'', '''') ELSE rumores END,
        fundacao = CASE WHEN p_atributos ? ''fundacao'' THEN NULLIF(p_atributos->>''fundacao'', '''') ELSE fundacao END,
        pessoas = CASE WHEN p_atributos ? ''pessoas'' THEN NULLIF(p_atributos->>''pessoas'', '''') ELSE pessoas END
      WHERE slug = alvo_slug;');
  IF (length(n) - length(replace(n, 'p_atributos ? ''fundacao''', ''))) / length('p_atributos ? ''fundacao''') <> 3 THEN
    RAISE EXCEPTION 'salvar_lore_entrada: os três blocos não casaram';
  END IF;
  EXECUTE n;
END $$;

COMMIT;
