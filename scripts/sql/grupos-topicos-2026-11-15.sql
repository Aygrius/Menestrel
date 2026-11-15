-- scripts/sql/grupos-topicos-2026-11-15.sql
-- ============================================================
-- OS TÓPICOS NOVOS DOS GRUPOS (15/11/2026)
-- ============================================================
-- Usuário: "Dentro de 'Ambientação', e 'Grupos', vamos mudar os tópicos para:
-- Epígrafe, História, Localização, Admissão, Organização, Relíquias, Rumores."
-- E, sobre o texto que já existia ("Pode ser assim"):
--
--   Epígrafe     ← a epígrafe
--   História     ← o prólogo (com a fonte), a descrição e a história
--   Localização  ← os locais (a lista, que mantém a chave `locais`)
--   Admissão     ← a admissão
--   Organização  ← a organização, as lideranças, os símbolos, os objetivos e a ética
--   Relíquias    ← nova (lista `reliquias`), vazia
--   Rumores      ← os rumores
--
-- Cada "\n" é um parágrafo (a regra das Entidades e dos Grupos). As
-- lideranças viram um parágrafo cada: "Nome, cargo — texto".
--
-- CÓPIA ANTES: backup.catalogo_mundo_grupos_20261115 (esquema fora da API).
-- REVERTER:
--   update public.catalogo_mundo c set dados = b.dados
--     from backup.catalogo_mundo_grupos_20261115 b
--    where c.tipo = b.tipo and c.slug = b.slug;
-- ============================================================

BEGIN;

UPDATE public.catalogo_mundo c
   SET dados = (c.dados - 'prefacio' - 'descricao' - 'simbolos' - 'objetivos' - 'etica' - 'liderancas')
             || jsonb_strip_nulls(jsonb_build_object(
                  'historia', NULLIF(array_to_string(array_remove(ARRAY[
                     NULLIF(btrim(c.dados #>> '{prefacio,texto}'), ''),
                     CASE WHEN NULLIF(btrim(c.dados #>> '{prefacio,fonte}'), '') IS NOT NULL
                          THEN '— ' || btrim(c.dados #>> '{prefacio,fonte}') END,
                     NULLIF(btrim(c.dados ->> 'descricao'), ''),
                     NULLIF(btrim(c.dados ->> 'historia'), '')
                   ], NULL), E'\n'), ''),
                  'organizacao', NULLIF(array_to_string(array_remove(ARRAY[
                     NULLIF(btrim(c.dados ->> 'organizacao'), ''),
                     (SELECT string_agg(
                               btrim(coalesce(l ->> 'nome', ''))
                               || coalesce(', ' || NULLIF(btrim(l ->> 'cargo'), ''), '')
                               || coalesce(' — ' || NULLIF(btrim(l ->> 'texto'), ''), ''),
                               E'\n')
                        FROM jsonb_array_elements(coalesce(c.dados -> 'liderancas', '[]'::jsonb)) AS l),
                     NULLIF(btrim(c.dados ->> 'simbolos'), ''),
                     NULLIF(btrim(c.dados ->> 'objetivos'), ''),
                     NULLIF(btrim(c.dados ->> 'etica'), '')
                   ], NULL), E'\n'), '')
                )),
       updated_at = now()
 WHERE c.tipo = 'grupo';

COMMIT;

-- ── CONFERÊNCIA ─────────────────────────────────────────────
SELECT slug, (SELECT string_agg(k, ',' ORDER BY k) FROM jsonb_object_keys(dados) k) AS campos,
       length(dados ->> 'historia') AS historia, length(dados ->> 'organizacao') AS organizacao
  FROM public.catalogo_mundo WHERE tipo = 'grupo' ORDER BY slug;
