-- ============================================================
-- carne-do-abate-no-inventario-2026-10-31.sql
-- ============================================================
-- "Porque o animal abatido vai para a loja e não para o inventário do
-- personagem?" → "1, vai para o inventário do personagem." (usuário,
-- 31/10/2026)
--
-- Em 28/09/2026 a carne do abate ia para a loja, à venda pelo dono
-- (carne-do-abate-2026-09-28.sql). Desde as lojas por cidade (28/10), o
-- anúncio — criado SEM cidade — não aparecia em loja nenhuma, e a carne
-- ficava presa ali. Agora ela vai para o inventário de quem abateu: soma na
-- pilha solta da mesma carne, ou entra solta.
--
-- A carne de criatura morta em BATALHA (_menestrel_carne_da_batalha) não muda
-- aqui: segue para a loja.
--
-- E devolve a Carne ×3 da Lirael (anúncio 14, do abate de hoje): a carne do
-- abate não fica no inventário (só no anúncio), e retirar o anúncio a faria
-- sumir.
-- ============================================================

begin;

create or replace function public.abater_animal(p_pj_id bigint, p_instance_id text)
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_catalog' as $function$
declare
  v_uid uuid := auth.uid();
  v_pj public.personagens%rowtype; v_hist bigint;
  v_itens jsonb; v_inst jsonb; v_idx int := -1; v_i int; v_qtd bigint;
  v_cat public.itens%rowtype; v_carne record; v_carne_cat public.itens%rowtype;
  v_pilha int := -1; v_autor text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado'); end if;
  select * into v_pj from public.personagens where id = p_pj_id for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'pj_nao_encontrado'); end if;
  if v_pj.user_id is distinct from v_uid then return jsonb_build_object('ok', false, 'motivo', 'nao_e_dono'); end if;
  select id into v_hist from public.historias where p_pj_id = any (protagonista_ids) order by created_at desc limit 1;

  v_itens := coalesce(v_pj.inventario->'itens', '[]'::jsonb);
  for v_i in 0 .. jsonb_array_length(v_itens) - 1 loop
    if v_itens->v_i->>'instanceId' = p_instance_id then v_idx := v_i; v_inst := v_itens->v_i; exit; end if;
  end loop;
  if v_idx < 0 then return jsonb_build_object('ok', false, 'motivo', 'item_indisponivel'); end if;
  if coalesce((v_inst->>'montado')::boolean, false) then
    return jsonb_build_object('ok', false, 'motivo', 'item_em_uso');
  end if;
  select * into v_cat from public.itens where slug = v_inst->>'slug';
  if not found or v_cat.grupo <> 'Animais' or v_cat.criatura_id is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_e_animal');
  end if;
  select * into v_carne from public._menestrel_carne_da_criatura(v_cat.criatura_id);
  if v_carne.slug is null then return jsonb_build_object('ok', false, 'motivo', 'sem_carne'); end if;
  select * into v_carne_cat from public.itens where slug = v_carne.slug;

  -- O animal sai (uma unidade).
  v_qtd := coalesce((v_inst->>'quantidade')::bigint, 1);
  if v_qtd > 1 then v_itens := jsonb_set(v_itens, array[v_idx::text, 'quantidade'], to_jsonb(v_qtd - 1));
  else v_itens := v_itens - v_idx; end if;

  -- A carne entra: na pilha solta da mesma carne, ou solta.
  for v_i in 0 .. jsonb_array_length(v_itens) - 1 loop
    if v_itens->v_i->>'slug' = v_carne.slug
       and (v_itens->v_i->>'containerId') is null
       and (v_itens->v_i->>'anuncio_id') is null
       and not coalesce((v_itens->v_i->>'equipado')::boolean, false) then
      v_pilha := v_i; exit;
    end if;
  end loop;
  if v_pilha >= 0 then
    v_itens := jsonb_set(v_itens, array[v_pilha::text, 'quantidade'],
      to_jsonb(coalesce((v_itens->v_pilha->>'quantidade')::bigint, 1) + v_carne.quantidade));
  else
    v_itens := v_itens || jsonb_build_array(jsonb_build_object(
      'instanceId', (extract(epoch from clock_timestamp()) * 1000)::bigint::text || '-' || substr(md5(random()::text), 1, 6),
      'slug', v_carne.slug, 'quantidade', v_carne.quantidade, 'equipado', false,
      'slot', null, 'containerId', null, 'vestido', false));
  end if;

  update public.personagens set inventario = jsonb_set(coalesce(inventario, '{}'::jsonb), '{itens}', v_itens)
   where id = p_pj_id;

  if v_hist is not null then
    select coalesce(full_name, email, 'Jogador') into v_autor from public.profiles where id = v_uid;
    insert into public.mesa_log (historia_id, autor_id, autor_nome, tipo, texto, meta)
    values (v_hist, v_uid, coalesce(v_autor, 'Jogador'), 'item',
      coalesce(nullif(split_part(v_pj.nome, ' ', 1), ''), 'Alguém') || ' abateu ' || v_cat.nome || ': '
        || v_carne.quantidade || '× ' || coalesce(v_carne_cat.nome, v_carne.slug) || ' foi para o inventário.',
      jsonb_build_object('acao', 'abater', 'slug', v_carne.slug, 'quantidade', v_carne.quantidade));
  end if;

  return jsonb_build_object('ok', true, 'slug', v_carne.slug, 'quantidade', v_carne.quantidade);
end $function$;

-- A Carne ×3 da Lirael volta para o inventário dela.
do $$
declare v_a public.anuncios_loja%rowtype; v_itens jsonb; v_i int; v_pilha int := -1;
begin
  select * into v_a from public.anuncios_loja where id = 14 and status = 'aberto' and slug = 'carne' for update;
  if not found then return; end if;
  select coalesce(inventario->'itens', '[]'::jsonb) into v_itens from public.personagens where id = v_a.vendedor_pj_id for update;
  for v_i in 0 .. jsonb_array_length(v_itens) - 1 loop
    if v_itens->v_i->>'slug' = 'carne' and (v_itens->v_i->>'containerId') is null
       and (v_itens->v_i->>'anuncio_id') is null then v_pilha := v_i; exit; end if;
  end loop;
  if v_pilha >= 0 then
    v_itens := jsonb_set(v_itens, array[v_pilha::text, 'quantidade'],
      to_jsonb(coalesce((v_itens->v_pilha->>'quantidade')::bigint, 1) + v_a.quantidade));
  else
    v_itens := v_itens || jsonb_build_array(v_a.item || jsonb_build_object('quantidade', v_a.quantidade));
  end if;
  update public.personagens set inventario = jsonb_set(inventario, '{itens}', v_itens) where id = v_a.vendedor_pj_id;
  update public.anuncios_loja set status = 'retirado', updated_at = now() where id = v_a.id;
end $$;

commit;
