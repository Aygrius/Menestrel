-- scripts/sql/aprendizado-magia-remove-antigo-2026-10-22.sql
-- ============================================================
-- Depois do front novo (22/10/2026): a RPC antiga consumia o pergaminho e
-- conferia profissão — regras que saíram. O front novo chama aprender_magia
-- (scripts/sql/aprender-magia-rpc-2026-10-22.sql).
--
-- ORDEM: 1) aprendizado-magia-por-item-2026-10-22.sql
--        2) aprender-magia-rpc-2026-10-22.sql (+ o .teste.sql, que desfaz)
--        3) este arquivo.
-- Antes de rodar, conferir que nada mais chama as funções antigas:
--   SELECT proname FROM pg_proc
--    WHERE prosrc ILIKE '%usar_pergaminho_magia%' OR prosrc ILIKE '%_menestrel_pontos_magia_estagio%';
--   (deve listar só usar_pergaminho_magia)
-- ============================================================
BEGIN;
DROP FUNCTION IF EXISTS public.usar_pergaminho_magia(bigint, text);
DROP FUNCTION IF EXISTS public._menestrel_pontos_magia_estagio(text);
COMMIT;
