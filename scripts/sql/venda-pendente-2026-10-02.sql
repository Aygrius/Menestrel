-- venda-pendente-2026-10-02.sql
-- Item à venda fica no inventário; venda vira moedas a resgatar (02/10/2026).
-- Spec: docs/superpowers/specs/2026-10-02-venda-pendente-design.md
--
-- "Quando o item for vendido, o dinheiro fica pendente de ser resgatado pelo
--  jogador que o vendeu. O item à venda, continua ocupando espaço no
--  inventário." (usuário)
--
-- • personagens.vendas_a_resgatar (latão): o que o vendedor tem a receber.
-- • A instância à venda ganha `anuncio_id` no inventário e fica travada.
-- • publicar não tira o item; comprar tira do vendedor e soma ao pendente;
--   retirar destrava; resgatar_vendas deposita o pendente na bolsa.
-- • transfer_item / vender_item recusam item à venda; transfer_item e
--   comprar_item não empilham sobre pilha à venda.
--
-- REVERTER (as três funções de anúncio voltam pelas versões de 27/09/2026 em
-- scripts/sql/anuncios-loja-2026-09-27.sql e anuncios-loja-parcial-…):
--   drop function if exists public.resgatar_vendas(bigint);
--   alter table public.personagens drop column if exists vendas_a_resgatar;
--   -- e reaplicar transfer_item / vender_item / comprar_item sem o remendo.

alter table public.personagens
  add column if not exists vendas_a_resgatar bigint not null default 0;

-- ── publicar: o item fica no inventário, travado ────────────────────────────
create or replace function public.publicar_item_loja(p_pj_id bigint, p_instance_id text, p_quantidade bigint, p_preco_latao bigint)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  v_uid uuid := auth.uid();
  v_pj public.personagens%rowtype;
  v_hist bigint; v_inst jsonb; v_cat public.itens%rowtype;
  v_itens jsonb; v_idx int := -1; v_i int; v_qtd bigint; v_q bigint;
  v_item jsonb; v_id bigint; v_nome text; v_autor text; v_trav_id text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado'); end if;
  select * into v_pj from public.personagens where id = p_pj_id for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'pj_nao_encontrado'); end if;
  if v_pj.user_id is distinct from v_uid then return jsonb_build_object('ok', false, 'motivo', 'nao_e_dono'); end if;
  select id into v_hist from public.historias where p_pj_id = any (protagonista_ids) order by created_at desc limit 1;
  if v_hist is null then return jsonb_build_object('ok', false, 'motivo', 'sem_historia'); end if;
  if p_preco_latao is null or p_preco_latao < 0 then return jsonb_build_object('ok', false, 'motivo', 'preco_invalido'); end if;

  v_itens := coalesce(v_pj.inventario->'itens', '[]'::jsonb);
  for v_i in 0 .. jsonb_array_length(v_itens) - 1 loop
    if v_itens->v_i->>'instanceId' = p_instance_id then v_idx := v_i; v_inst := v_itens->v_i; exit; end if;
  end loop;
  if v_idx < 0 then return jsonb_build_object('ok', false, 'motivo', 'item_indisponivel'); end if;
  if (v_inst->>'anuncio_id') is not null then return jsonb_build_object('ok', false, 'motivo', 'item_ja_a_venda'); end if;
  select * into v_cat from public.itens where slug = v_inst->>'slug';
  if not found then return jsonb_build_object('ok', false, 'motivo', 'item_nao_existe'); end if;
  if v_cat.grupo = 'Moedas' then return jsonb_build_object('ok', false, 'motivo', 'moeda_nao_vende'); end if;
  if p_preco_latao = 0 and coalesce(v_cat.valor_latao, 0) > 0 then return jsonb_build_object('ok', false, 'motivo', 'preco_invalido'); end if;
  if coalesce((v_inst->>'equipado')::boolean, false) or coalesce((v_inst->>'vestido')::boolean, false)
     or coalesce((v_inst->>'montado')::boolean, false) then
    return jsonb_build_object('ok', false, 'motivo', 'item_em_uso');
  end if;
  if exists (select 1 from jsonb_array_elements(v_itens) e where e->>'containerId' = p_instance_id) then
    return jsonb_build_object('ok', false, 'motivo', 'recipiente_com_itens');
  end if;
  v_qtd := coalesce((v_inst->>'quantidade')::bigint, 1);
  v_q := case when v_cat.categoria_equip is not null then v_qtd else coalesce(p_quantidade, v_qtd) end;
  if v_q < 1 or v_q > v_qtd then return jsonb_build_object('ok', false, 'motivo', 'quantidade_invalida'); end if;

  -- A instância que fica travada: a própria (pilha inteira) ou uma nova com
  -- a parte anunciada (sem casa — o app dá a próxima livre).
  v_trav_id := case when v_q = v_qtd then v_inst->>'instanceId'
    else (extract(epoch from clock_timestamp())*1000)::bigint::text || '-' || substr(md5(random()::text), 1, 6) end;
  v_item := v_inst || jsonb_build_object('instanceId', v_trav_id, 'quantidade', v_q);
  v_nome := nullif(trim(coalesce(v_pj.nome, '') || ' ' || coalesce(v_pj.sobrenome, '')), '');
  insert into public.anuncios_loja (historia_id, vendedor_pj_id, vendedor_user_id, vendedor_nome, item, slug, item_nome, quantidade, preco_latao)
  values (v_hist, p_pj_id, v_uid, v_nome, v_item, v_cat.slug, v_cat.nome, v_q, p_preco_latao)
  returning id into v_id;

  if v_q = v_qtd then
    v_itens := jsonb_set(v_itens, array[v_idx::text], v_inst || jsonb_build_object('anuncio_id', v_id));
  else
    v_itens := jsonb_set(v_itens, array[v_idx::text, 'quantidade'], to_jsonb(v_qtd - v_q));
    v_itens := v_itens || jsonb_build_array((v_item - 'casa') || jsonb_build_object('anuncio_id', v_id));
  end if;
  update public.personagens set inventario = jsonb_set(coalesce(inventario, '{}'::jsonb), '{itens}', v_itens) where id = p_pj_id;

  select coalesce(full_name, email, 'Jogador') into v_autor from public.profiles where id = v_uid;
  insert into public.mesa_log (historia_id, autor_id, autor_nome, tipo, texto, meta)
  values (v_hist, v_uid, v_autor, 'item',
    coalesce(nullif(split_part(v_nome, ' ', 1), ''), 'Um personagem') || ' colocou à venda na loja '
      || case when v_q > 1 then v_q || '× ' else '' end || v_cat.nome
      || ' por ' || public._menestrel_moedas_texto(p_preco_latao) || case when v_q > 1 then ' cada' else '' end || '.',
    jsonb_build_object('anuncio_id', v_id, 'anuncio_acao', 'publicar'));
  return jsonb_build_object('ok', true, 'anuncio_id', v_id);
end $$;

-- ── comprar: tira do vendedor, entrega ao comprador, soma ao pendente ──────
create or replace function public.comprar_item_anunciado(p_anuncio_id bigint, p_pj_id bigint default null, p_quantidade bigint default null)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  v_uid uuid := auth.uid();
  v_a public.anuncios_loja%rowtype; v_h public.historias%rowtype;
  v_comprador public.personagens%rowtype; v_inv_c jsonb; v_inv_v jsonb; v_deb jsonb;
  v_itens_v jsonb; v_vidx int := -1; v_i int; v_qtd_v bigint; v_origem jsonb;
  v_item jsonb; v_nome_c text; v_autor text; v_q bigint; v_custo bigint; v_resto bigint;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado'); end if;
  select * into v_a from public.anuncios_loja where id = p_anuncio_id for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'anuncio_nao_encontrado'); end if;
  if v_a.status <> 'aberto' then return jsonb_build_object('ok', false, 'motivo', 'anuncio_encerrado'); end if;
  v_q := coalesce(p_quantidade, v_a.quantidade);
  if v_q < 1 then return jsonb_build_object('ok', false, 'motivo', 'quantidade_invalida'); end if;
  if v_q > v_a.quantidade then return jsonb_build_object('ok', false, 'motivo', 'estoque_insuficiente'); end if;
  v_custo := v_a.preco_latao * v_q;
  v_resto := v_a.quantidade - v_q;
  select * into v_h from public.historias where id = v_a.historia_id;

  if p_pj_id is null then
    if v_h.mestre_id is distinct from v_uid then return jsonb_build_object('ok', false, 'motivo', 'sem_permissao'); end if;
    v_nome_c := 'Mestre';
  else
    select * into v_comprador from public.personagens where id = p_pj_id for update;
    if not found then return jsonb_build_object('ok', false, 'motivo', 'pj_nao_encontrado'); end if;
    if v_comprador.user_id is distinct from v_uid then return jsonb_build_object('ok', false, 'motivo', 'nao_e_dono'); end if;
    if not (p_pj_id = any (v_h.protagonista_ids)) then return jsonb_build_object('ok', false, 'motivo', 'aventura_diferente'); end if;
    if p_pj_id = v_a.vendedor_pj_id then return jsonb_build_object('ok', false, 'motivo', 'proprio_anuncio'); end if;
    v_deb := public._menestrel_inv_debitar_latao(coalesce(v_comprador.inventario, '{"itens":[]}'::jsonb), v_custo);
    if not (v_deb->>'ok')::boolean then return jsonb_build_object('ok', false, 'motivo', v_deb->>'motivo'); end if;
    v_inv_c := v_deb->'inv';
    v_nome_c := nullif(trim(coalesce(v_comprador.nome, '') || ' ' || coalesce(v_comprador.sobrenome, '')), '');
  end if;

  -- O item mora no inventário do vendedor, travado com anuncio_id.
  v_origem := v_a.item;
  if v_a.vendedor_pj_id is not null then
    select coalesce(inventario, '{"itens":[]}'::jsonb) into v_inv_v from public.personagens where id = v_a.vendedor_pj_id for update;
    v_itens_v := coalesce(v_inv_v->'itens', '[]'::jsonb);
    for v_i in 0 .. jsonb_array_length(v_itens_v) - 1 loop
      if (v_itens_v->v_i->>'anuncio_id') = v_a.id::text then v_vidx := v_i; exit; end if;
    end loop;
    if v_vidx < 0 then
      -- Sumiu do inventário por fora: o anúncio não tem mais o que vender.
      update public.anuncios_loja set status = 'retirado', updated_at = now() where id = p_anuncio_id;
      return jsonb_build_object('ok', false, 'motivo', 'item_indisponivel');
    end if;
    v_origem := v_itens_v->v_vidx;
    v_qtd_v := coalesce((v_origem->>'quantidade')::bigint, 1);
    if v_q > v_qtd_v then return jsonb_build_object('ok', false, 'motivo', 'estoque_insuficiente'); end if;
    if v_q = v_qtd_v then v_itens_v := v_itens_v - v_vidx;
    else v_itens_v := jsonb_set(v_itens_v, array[v_vidx::text, 'quantidade'], to_jsonb(v_qtd_v - v_q)); end if;
    update public.personagens
       set inventario = jsonb_set(v_inv_v, '{itens}', v_itens_v),
           vendas_a_resgatar = vendas_a_resgatar + v_custo
     where id = v_a.vendedor_pj_id;
  end if;

  if p_pj_id is not null then
    v_item := (v_origem - 'anuncio_id' - 'casa') || jsonb_build_object(
      'quantidade', v_q, 'containerId', null, 'equipado', false, 'slot', null, 'vestido', false, 'vesteSlot', null,
      'instanceId', (extract(epoch from clock_timestamp())*1000)::bigint::text || '-' || substr(md5(random()::text), 1, 6));
    v_inv_c := jsonb_set(v_inv_c, '{itens}', coalesce(v_inv_c->'itens', '[]'::jsonb) || jsonb_build_array(v_item));
    update public.personagens set inventario = v_inv_c where id = p_pj_id;
  end if;

  if v_resto > 0 then
    update public.anuncios_loja
       set quantidade = v_resto, item = jsonb_set(item, '{quantidade}', to_jsonb(v_resto)), updated_at = now()
     where id = p_anuncio_id;
  else
    update public.anuncios_loja set status = 'vendido', comprador_pj_id = p_pj_id, comprador_nome = v_nome_c, updated_at = now()
     where id = p_anuncio_id;
  end if;

  select coalesce(full_name, email, 'Jogador') into v_autor from public.profiles where id = v_uid;
  insert into public.mesa_log (historia_id, autor_id, autor_nome, tipo, texto, meta)
  values (v_a.historia_id, v_uid, v_autor, 'item',
    coalesce(nullif(split_part(v_nome_c, ' ', 1), ''), 'Alguém') || ' comprou '
      || case when v_q > 1 then v_q || '× ' else '' end || coalesce(v_a.item_nome, v_a.slug)
      || ' de ' || coalesce(nullif(split_part(v_a.vendedor_nome, ' ', 1), ''), 'um personagem')
      || ' por ' || public._menestrel_moedas_texto(v_custo) || '.',
    jsonb_build_object('anuncio_id', v_a.id, 'anuncio_acao', 'comprar', 'quantidade', v_q));
  return jsonb_build_object('ok', true, 'quantidade', v_q, 'resto', v_resto);
end $$;

-- ── retirar: destrava ───────────────────────────────────────────────────────
create or replace function public.retirar_item_loja(p_anuncio_id bigint)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  v_uid uuid := auth.uid();
  v_a public.anuncios_loja%rowtype; v_mestre uuid; v_inv jsonb; v_itens jsonb; v_i int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado'); end if;
  select * into v_a from public.anuncios_loja where id = p_anuncio_id for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'anuncio_nao_encontrado'); end if;
  if v_a.status <> 'aberto' then return jsonb_build_object('ok', false, 'motivo', 'anuncio_encerrado'); end if;
  select mestre_id into v_mestre from public.historias where id = v_a.historia_id;
  if v_a.vendedor_user_id is distinct from v_uid and v_mestre is distinct from v_uid then
    return jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  end if;
  if v_a.vendedor_pj_id is not null then
    select coalesce(inventario, '{"itens":[]}'::jsonb) into v_inv from public.personagens where id = v_a.vendedor_pj_id for update;
    v_itens := coalesce(v_inv->'itens', '[]'::jsonb);
    for v_i in 0 .. jsonb_array_length(v_itens) - 1 loop
      if (v_itens->v_i->>'anuncio_id') = v_a.id::text then
        v_itens := jsonb_set(v_itens, array[v_i::text], (v_itens->v_i) - 'anuncio_id');
        update public.personagens set inventario = jsonb_set(v_inv, '{itens}', v_itens) where id = v_a.vendedor_pj_id;
        exit;
      end if;
    end loop;
  end if;
  update public.anuncios_loja set status = 'retirado', updated_at = now() where id = p_anuncio_id;
  return jsonb_build_object('ok', true);
end $$;

-- ── resgatar: o pendente vai para a bolsa; o que não couber fica ───────────
create or replace function public.resgatar_vendas(p_pj_id bigint)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  v_uid uuid := auth.uid();
  v_pend bigint; v_inv jsonb; v_teste jsonb; v_rest bigint; v_resgatado bigint := 0;
  v_val bigint[] := array[1000, 100, 10, 1];
  v_slugs text[] := array['moeda_ouro', 'moeda_prata', 'moeda_cobre', 'moeda_latao'];
  v_i int; v_n bigint; v_lo bigint; v_hi bigint; v_mid bigint;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado'); end if;
  select vendas_a_resgatar, coalesce(inventario, '{"itens":[]}'::jsonb) into v_pend, v_inv
    from public.personagens where id = p_pj_id and user_id = v_uid for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'pj_nao_encontrado'); end if;
  if coalesce(v_pend, 0) <= 0 then return jsonb_build_object('ok', true, 'resgatado', 0, 'restante', 0); end if;
  v_rest := v_pend;
  -- Da maior moeda para a menor; se a bolsa não leva todas daquela moeda,
  -- acha (busca binária) quantas cabem — o resto desce para a moeda menor.
  for v_i in 1 .. 4 loop
    v_n := v_rest / v_val[v_i];
    if v_n > 0 then
      v_teste := public.inv_depositar_moeda(v_inv, v_slugs[v_i], v_n);
      if v_teste is null then
        v_lo := 0; v_hi := v_n - 1;
        while v_lo < v_hi loop
          v_mid := (v_lo + v_hi + 1) / 2;
          if public.inv_depositar_moeda(v_inv, v_slugs[v_i], v_mid) is not null then v_lo := v_mid; else v_hi := v_mid - 1; end if;
        end loop;
        v_n := v_lo;
        v_teste := case when v_n > 0 then public.inv_depositar_moeda(v_inv, v_slugs[v_i], v_n) else null end;
      end if;
      if v_n > 0 and v_teste is not null then
        v_inv := v_teste;
        v_rest := v_rest - v_n * v_val[v_i];
        v_resgatado := v_resgatado + v_n * v_val[v_i];
      end if;
    end if;
  end loop;
  if v_resgatado = 0 then return jsonb_build_object('ok', false, 'motivo', 'sem_espaco_moedas'); end if;
  update public.personagens set inventario = v_inv, vendas_a_resgatar = v_rest where id = p_pj_id;
  return jsonb_build_object('ok', true, 'resgatado', v_resgatado, 'restante', v_rest);
end $$;

revoke all on function public.resgatar_vendas(bigint) from public, anon;
grant execute on function public.resgatar_vendas(bigint) to authenticated;

-- ── remendos: transfer_item, vender_item, comprar_item ─────────────────────
do $remendo$
declare d text; novo text;
begin
  -- transfer_item: recusa item à venda; não empilha sobre pilha à venda.
  d := pg_get_functiondef('public.transfer_item(bigint,bigint,text,jsonb,bigint)'::regprocedure);
  novo := replace(d,
    E'RETURN jsonb_build_object(''ok'', false, ''motivo'', ''instancia_nao_encontrada'');\n  END IF;',
    E'RETURN jsonb_build_object(''ok'', false, ''motivo'', ''instancia_nao_encontrada'');\n  END IF;\n  -- À venda na loja (02/10/2026): travado até retirar o anúncio.\n  IF (v_instance->>''anuncio_id'') IS NOT NULL THEN\n    RETURN jsonb_build_object(''ok'', false, ''motivo'', ''item_a_venda'');\n  END IF;');
  if novo = d then raise exception 'transfer_item: ponto da recusa não encontrado'; end if;
  d := novo;
  novo := replace(d,
    E'AND COALESCE((v_it->>''equipado'')::boolean, false) = false\n        THEN',
    E'AND COALESCE((v_it->>''equipado'')::boolean, false) = false\n           AND (v_it->>''anuncio_id'') IS NULL\n        THEN');
  if novo = d then raise exception 'transfer_item: ponto do empilhamento não encontrado'; end if;
  execute novo;

  -- vender_item: recusa item à venda.
  d := pg_get_functiondef('public.vender_item(bigint,text,integer,text)'::regprocedure);
  novo := replace(d,
    E'RETURN jsonb_build_object(''ok'', false, ''motivo'', ''item_nao_encontrado'');\n  END IF;',
    E'RETURN jsonb_build_object(''ok'', false, ''motivo'', ''item_nao_encontrado'');\n  END IF;\n  IF (v_it->>''anuncio_id'') IS NOT NULL THEN\n    RETURN jsonb_build_object(''ok'', false, ''motivo'', ''item_a_venda'');\n  END IF;');
  if novo = d then raise exception 'vender_item: ponto da recusa não encontrado'; end if;
  execute novo;

  -- comprar_item: não empilha a compra sobre pilha à venda.
  d := pg_get_functiondef('public.comprar_item(bigint,text,integer,text,text)'::regprocedure);
  novo := regexp_replace(d,
    '(\(\(v_it->>''containerId''\) IS NOT DISTINCT FROM v_target_container\))',
    '\1 AND (v_it->>''anuncio_id'') IS NULL');
  if novo = d then raise exception 'comprar_item: ponto do empilhamento não encontrado'; end if;
  execute novo;
end $remendo$;

-- ── anúncios abertos de antes: o item volta ao inventário, travado ─────────
do $migra$
declare a record; v_inv jsonb; v_id text;
begin
  for a in select * from public.anuncios_loja where status = 'aberto' and vendedor_pj_id is not null for update loop
    select coalesce(inventario, '{"itens":[]}'::jsonb) into v_inv from public.personagens where id = a.vendedor_pj_id for update;
    if exists (select 1 from jsonb_array_elements(coalesce(v_inv->'itens', '[]'::jsonb)) e where e->>'anuncio_id' = a.id::text) then
      continue;
    end if;
    v_id := coalesce(a.item->>'instanceId', '');
    if v_id = '' or exists (select 1 from jsonb_array_elements(coalesce(v_inv->'itens', '[]'::jsonb)) e where e->>'instanceId' = v_id) then
      v_id := (extract(epoch from clock_timestamp())*1000)::bigint::text || '-' || substr(md5(random()::text || a.id::text), 1, 6);
    end if;
    v_inv := jsonb_set(v_inv, '{itens}', coalesce(v_inv->'itens', '[]'::jsonb)
      || jsonb_build_array((a.item - 'casa') || jsonb_build_object('instanceId', v_id, 'anuncio_id', a.id, 'containerId', null)));
    update public.personagens set inventario = v_inv where id = a.vendedor_pj_id;
    update public.anuncios_loja set item = item || jsonb_build_object('instanceId', v_id) where id = a.id;
  end loop;
end $migra$;
