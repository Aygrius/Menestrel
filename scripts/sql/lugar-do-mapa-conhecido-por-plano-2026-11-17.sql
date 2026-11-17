-- ============================================================
-- 17/11/2026 — O lugar conhecido pelo mapa, plano a plano.
-- Usuário: "O mapa atual é do plano material, teremos um mapa para o plano
-- celestial, plano infernal. O jogador só vê o mapa do plano em que ele está."
--
-- mapas_mesa.dados continua sendo o plano material (lugares, gente) e os
-- outros moram em dados.planos[plano]. A camada do mundo de cada plano é a
-- linha de catalogo_mundo (tipo 'mapa') de slug 'mundo' (material) ou
-- 'mundo-<plano>'. Antes, a regra (lugar-do-mapa-conhecido-2026-11-17.sql)
-- olhava só o material e juntava a camada do mundo de qualquer slug.
-- ============================================================
create or replace function public._menestrel_lugar_do_mapa_conhecido()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  h record;
  pl record;
  g record;
  lg record;
  v_slug text;
  v_chave text;
  v_ids text[];
begin
  select id, cidade_ids, local_ids, coalesce(lore_acesso_pj, '{}'::jsonb) acesso, protagonista_ids
    into h from public.historias where id = new.historia_id;
  if not found then return new; end if;

  for pl in
    select 'material'::text plano, coalesce(new.dados->'gente', '{}'::jsonb) gente,
           coalesce(new.dados->'lugares', '[]'::jsonb) lugares, 'mundo'::text slug
    union all
    select k, coalesce(v->'gente', '{}'::jsonb), coalesce(v->'lugares', '[]'::jsonb), 'mundo-' || k
      from jsonb_each(coalesce(new.dados->'planos', '{}'::jsonb)) p(k, v)
  loop
    for g in select k::bigint pj, (v->>'x')::numeric x, (v->>'y')::numeric y
               from jsonb_each(pl.gente) e(k, v)
              where k ~ '^\d+$' and v ? 'x' and v ? 'y'
    loop
      if not (h.protagonista_ids @> array[g.pj]) then continue; end if;
      lg := null;
      select l->>'tipo' tipo, l->>'ficha' ficha, l->>'nome' nome into lg
        from (select jsonb_array_elements(pl.lugares) l
              union all
              select jsonb_array_elements(coalesce(c.dados->'lugares', '[]'::jsonb))
                from public.catalogo_mundo c where c.tipo = 'mapa' and c.slug = pl.slug) s
       where l->>'tipo' in ('cidade', 'local')
         and sqrt(power((l->>'x')::numeric - g.x, 2) + power((l->>'y')::numeric - g.y, 2)) < 4
       order by sqrt(power((l->>'x')::numeric - g.x, 2) + power((l->>'y')::numeric - g.y, 2))
       limit 1;
      if lg.tipo is null then continue; end if;

      v_slug := nullif(lg.ficha, '');
      if lg.tipo = 'cidade' then
        if v_slug is null or not exists (select 1 from public.cidades where slug = v_slug) then
          select slug into v_slug from public.cidades where lower(btrim(nome)) = lower(btrim(lg.nome)) limit 1;
        end if;
      else
        if v_slug is null or not exists (select 1 from public.locais where slug = v_slug) then
          select slug into v_slug from public.locais where lower(btrim(nome)) = lower(btrim(lg.nome)) limit 1;
        end if;
      end if;
      if v_slug is null then continue; end if;

      v_chave := lg.tipo || ':' || v_slug;
      v_ids := case when lg.tipo = 'cidade' then coalesce(h.cidade_ids, '{}') else coalesce(h.local_ids, '{}') end;
      if not (v_ids @> array[v_slug]) then
        if lg.tipo = 'cidade' then h.cidade_ids := v_ids || v_slug; else h.local_ids := v_ids || v_slug; end if;
        h.acesso := jsonb_set(h.acesso, array[v_chave], jsonb_build_array(g.pj));
      elsif h.acesso ? v_chave and not ((h.acesso -> v_chave) @> to_jsonb(g.pj)) then
        h.acesso := jsonb_set(h.acesso, array[v_chave], (h.acesso -> v_chave) || to_jsonb(g.pj));
      end if;
    end loop;
  end loop;

  update public.historias
     set cidade_ids = h.cidade_ids, local_ids = h.local_ids, lore_acesso_pj = h.acesso
   where id = h.id
     and (cidade_ids is distinct from h.cidade_ids or local_ids is distinct from h.local_ids
          or coalesce(lore_acesso_pj, '{}'::jsonb) is distinct from h.acesso);
  return new;
end $$;
