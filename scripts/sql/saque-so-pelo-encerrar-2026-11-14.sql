-- AUDITORIA 13/11/2026, item 2 (docs/auditoria-batalha-inventario-2026-11-13.md).
-- As funções internas do encerramento eram executáveis por anon/authenticated
-- e não checavam papel: dava para forjar saque a preço 0. Só encerrar_batalha
-- (SECURITY DEFINER, mesmo dono) as chama — o dono continua podendo.
-- Idempotente.

REVOKE EXECUTE ON FUNCTION public._menestrel_saque_da_batalha(bigint, jsonb, jsonb) FROM PUBLIC, anon, authenticated;

DO $$
DECLARE f regprocedure;
BEGIN
  FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname IN ('_menestrel_matador_da_criatura', '_menestrel_lojas_globais')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
  END LOOP;
END $$;

-- Conferência: as três devem dar false/false.
-- SELECT p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') anon,
--        has_function_privilege('authenticated', p.oid, 'EXECUTE') auth
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--  WHERE n.nspname = 'public' AND p.proname IN
--   ('_menestrel_saque_da_batalha', '_menestrel_matador_da_criatura', '_menestrel_lojas_globais');
