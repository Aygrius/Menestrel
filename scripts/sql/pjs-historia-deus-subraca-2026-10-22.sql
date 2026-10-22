-- scripts/sql/pjs-historia-deus-subraca-2026-10-22.sql
-- ============================================================
-- get_pjs_historia passa a devolver deus e subraca (22/10/2026).
-- Por quê: o Evocar da ficha tira da lista de alvos de um MILAGRE o colega
-- vampiro, lobisomem ou sem religião (spec 2026-10-22-classes-de-magia-
-- milagres). O resto da função é idêntico ao que estava no banco.
-- Mudar o RETURNS TABLE exige DROP + CREATE; os grants são os mesmos de
-- antes (PUBLIC, anon, authenticated, service_role).
-- ============================================================
BEGIN;
DROP FUNCTION IF EXISTS public.get_pjs_historia(bigint);

CREATE FUNCTION public.get_pjs_historia(p_pj_id bigint)
 RETURNS TABLE(id bigint, nome text, sobrenome text, raca text, profissao text, foto_url text, localizacao text,
               deus text, subraca text)
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
         p.deus, p.subraca
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
