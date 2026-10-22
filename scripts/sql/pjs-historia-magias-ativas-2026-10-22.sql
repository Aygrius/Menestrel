-- scripts/sql/pjs-historia-magias-ativas-2026-10-22.sql
-- ============================================================
-- get_pjs_historia passa a devolver magias_ativas (22/10/2026).
-- Pedido do usuário: "Transformado em Lobisomem, realmente a magia não vai
-- funcionar nele." O Evocar da ficha tira da lista de alvos de MILAGRE o
-- colega que conjurou a própria Licantropia — e a transformação mora em
-- estado_atual.magias_ativas. Só esse pedaço do estado sai, não o resto.
-- Mudar o RETURNS TABLE exige DROP + CREATE; grants os mesmos de antes.
-- ============================================================
BEGIN;
DROP FUNCTION IF EXISTS public.get_pjs_historia(bigint);

CREATE FUNCTION public.get_pjs_historia(p_pj_id bigint)
 RETURNS TABLE(id bigint, nome text, sobrenome text, raca text, profissao text, foto_url text, localizacao text,
               deus text, subraca text, magias_ativas jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_local text;
  v_fold  text;
begin
  select coalesce(p.localizacao, '') into v_local
    from personagens p where p.id = p_pj_id;

  v_fold := lower(btrim(translate(coalesce(v_local, ''),
    'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
    'aaaaaeeeeiiiiooooouuuucaaaaaeeeeiiiiooooouuuuc')));

  -- Quem não está em cidade nenhuma não vê ninguém.
  if v_fold = '' then
    return;
  end if;

  return query
  select p.id, p.nome, p.sobrenome, p.raca, p.profissao, p.foto_url, p.localizacao,
         p.deus, p.subraca, coalesce(p.estado_atual->'magias_ativas', '[]'::jsonb)
  from personagens p
  where p.id <> p_pj_id
    and lower(btrim(translate(coalesce(p.localizacao, ''),
          'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
          'aaaaaeeeeiiiiooooouuuucaaaaaeeeeiiiiooooouuuuc'))) = v_fold
    and p.id = any (
      select unnest(h.protagonista_ids)
      from historias h
      where p_pj_id = any (h.protagonista_ids)
    );
end;
$function$;

GRANT EXECUTE ON FUNCTION public.get_pjs_historia(bigint) TO anon, authenticated, service_role;
COMMIT;
