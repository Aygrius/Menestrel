-- scripts/sql/magias-curas-fisicas-fix.sql
-- ============================================================
-- Curas Físicas, nível 9:
--   "Restaura 20 de energia física e e restaura 50 de saúde"
--
-- Dois problemas numa linha só:
--   1) "e e" duplicado — erro de digitação;
--   2) "saúde" é uma unidade que NÃO EXISTE em lugar nenhum do motor. Os
--      pools do sistema são EH → AR → EF (a cascata de aplicarDanoCascata).
--      Não há campo, teto nem regra de "saúde" — o parser de efeito
--      (01-core/magias-efeito.jsx) não tem como aplicar e ignora em silêncio,
--      então o texto prometia ao jogador algo que a mesa nunca entregaria.
--
-- A segunda metade some. Se "saúde" for virar regra algum dia, entra como
-- primitiva própria, com o nome de um pool que existe.
--
-- APLICADO EM PRODUÇÃO em 11/09/2026. Mantido versionado para histórico e
-- para reaplicar em outro ambiente. Idempotente: o LIKE no WHERE.
-- Ver docs/superpowers/specs/2026-09-11-magias-efeitos-combate-design.md §7.2
-- ============================================================

-- CONFERÊNCIA (antes):
-- SELECT key, nome, nivel_9 FROM public.magias WHERE key = 'curas_fisicas';

BEGIN;

UPDATE public.magias
   SET nivel_9 = 'Restaura 20 de energia física.'
 WHERE key = 'curas_fisicas'
   AND nivel_9 LIKE '%de saúde%';

COMMIT;

-- CONFERÊNCIA (depois): o SELECT acima devolve a frase sem "saúde".
