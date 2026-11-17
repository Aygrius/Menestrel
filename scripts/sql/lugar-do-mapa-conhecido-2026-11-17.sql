-- ============================================================
-- 17/11/2026 — A cidade (ou o local) onde o personagem está NO MAPA vira
-- conhecida por ele. Usuário: "O personagem Aygrius está na cidade de Igara,
-- mas no mapa diz que ele está na estrada [...] não consegue clicar na cidade
-- Igara." A mesa dele não tem lugar no relógio (data_jogo_atual), só a
-- posição no mapa (mapas_mesa.dados.gente), então a regra de 17/11
-- (historias_lugar_atual_conhecido) não o alcançava.
--
-- Perto = a menos de 4 unidades do mapa, o mesmo raio de `perto()` em
-- 13-diario/mapa.jsx. Os lugares são os da mesa e os do mundo (catalogo_mundo,
-- tipo 'mapa'). O slug vem de `ficha` ou, sem ela, do nome.
-- Por personagem: se o lugar ainda não era da mesa, entra só para ele
-- (lore_acesso_pj); se já era restrito, ele entra na lista; se era livre, nada.
-- ============================================================
create or replace function public._menestrel_lugar_do_mapa_conhecido()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  h record;
  g record;
  lg record;
  v_slug text;
  v_chave text;
  v_ids text[];
begin
  select id, cidade_ids, local_ids, coalesce(lore_acesso_pj, '{}'::jsonb) acesso, protagonista_ids
    into h from public.historias where id = new.historia_id;
  if not found then return new; end if;

  for g in select k::bigint pj, (v->>'x')::numeric x, (v->>'y')::numeric y
             from jsonb_each(coalesce(new.dados->'gente', '{}'::jsonb)) e(k, v)
            where k ~ '^\d+$' and v ? 'x' and v ? 'y'
  loop
    if not (h.protagonista_ids @> array[g.pj]) then continue; end if;
    select l->>'tipo' tipo, l->>'ficha' ficha, l->>'nome' nome into lg
      from (select jsonb_array_elements(coalesce(new.dados->'lugares', '[]'::jsonb)) l
            union all
            select jsonb_array_elements(coalesce(c.dados->'lugares', '[]'::jsonb))
              from public.catalogo_mundo c where c.tipo = 'mapa') s
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
      -- Novo para a mesa: só este personagem conhece.
      if lg.tipo = 'cidade' then h.cidade_ids := v_ids || v_slug; else h.local_ids := v_ids || v_slug; end if;
      h.acesso := jsonb_set(h.acesso, array[v_chave], jsonb_build_array(g.pj));
    elsif h.acesso ? v_chave and not ((h.acesso -> v_chave) @> to_jsonb(g.pj)) then
      h.acesso := jsonb_set(h.acesso, array[v_chave], (h.acesso -> v_chave) || to_jsonb(g.pj));
    end if;
  end loop;

  update public.historias
     set cidade_ids = h.cidade_ids, local_ids = h.local_ids, lore_acesso_pj = h.acesso
   where id = h.id
     and (cidade_ids is distinct from h.cidade_ids or local_ids is distinct from h.local_ids
          or coalesce(lore_acesso_pj, '{}'::jsonb) is distinct from h.acesso);
  return new;
end $$;

drop trigger if exists mapas_mesa_lugar_conhecido on public.mapas_mesa;
create trigger mapas_mesa_lugar_conhecido
  after insert or update of dados on public.mapas_mesa
  for each row execute function public._menestrel_lugar_do_mapa_conhecido();

-- Quem já está num lugar do mapa.
update public.mapas_mesa set dados = dados;
