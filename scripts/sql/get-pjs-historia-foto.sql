-- scripts/sql/get-pjs-historia-foto.sql
-- ============================================================
-- get_pjs_historia passa a devolver `foto_url`.
--
-- POR QUE. A transferência de item (DetalhesItemModal, inventario.jsx) deixou
-- de ser um <select> e virou mini cards com foto e nome — o mesmo seletor do
-- alvo de magia (pedido do usuário, 12/09/2026). A RPC só devolvia nome,
-- sobrenome, raça e profissão, e sem a foto o card mostraria só a inicial.
--
-- Mudar o TIPO DE RETORNO exige DROP + CREATE (CREATE OR REPLACE não altera
-- as colunas de RETURNS TABLE). As permissões são recriadas exatamente como
-- estavam: EXECUTE para PUBLIC, anon, authenticated e service_role.
--
-- Único chamador: inventario.jsx (supabaseClient.rpc('get_pjs_historia')).
-- Coluna a mais no retorno não quebra ninguém.
--
-- REVERSÍVEL: recriar sem `foto_url` (a definição antiga é esta mesma, sem
-- a coluna no RETURNS TABLE e no SELECT).
-- ============================================================

BEGIN;

DROP FUNCTION IF EXISTS public.get_pjs_historia(bigint);

CREATE FUNCTION public.get_pjs_historia(p_pj_id bigint)
 RETURNS TABLE(id bigint, nome text, sobrenome text, raca text, profissao text, foto_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT p.id, p.nome, p.sobrenome, p.raca, p.profissao, p.foto_url
  FROM personagens p
  WHERE p.id <> p_pj_id
    AND p.id = ANY (
      SELECT unnest(h.protagonista_ids)
      FROM historias h
      WHERE p_pj_id = ANY (h.protagonista_ids)
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_pjs_historia(bigint) TO PUBLIC, anon, authenticated, service_role;

COMMIT;
