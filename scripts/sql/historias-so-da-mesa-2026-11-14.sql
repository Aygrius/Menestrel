-- AUDITORIA 13/11/2026, item 5, parte 1 (docs/auditoria-batalha-inventario-2026-11-13.md).
-- `historias` tinha SELECT `true` para todo logado: qualquer conta lia a loja,
-- as notas do calendário, os capítulos, o acesso à lore e as pools de toda
-- mesa do sistema. Agora lê quem é o Mestre dela ou dono de um protagonista —
-- os mesmos dois caminhos que o app usa (eq mestre_id / contains
-- protagonista_ids) e que as policies de mesa_log e anuncios_loja já exigem.
--
-- A lista dos meus PJs sai de uma função SECURITY DEFINER: a policy de
-- personagens consulta historias, e uma policy de historias consultando
-- personagens direto daria recursão infinita.
-- Idempotente.

CREATE OR REPLACE FUNCTION public._menestrel_meus_pjs()
RETURNS bigint[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT coalesce(array_agg(p.id), '{}'::bigint[])
    FROM public.personagens p
   WHERE p.user_id = auth.uid()
$function$;

REVOKE EXECUTE ON FUNCTION public._menestrel_meus_pjs() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public._menestrel_meus_pjs() TO authenticated, service_role;

DROP POLICY IF EXISTS historias_select_authenticated ON public.historias;
DROP POLICY IF EXISTS historias_select_da_mesa ON public.historias;
CREATE POLICY historias_select_da_mesa ON public.historias
  FOR SELECT TO authenticated
  USING (
    mestre_id = (SELECT auth.uid())
    OR protagonista_ids && (SELECT public._menestrel_meus_pjs())
  );
