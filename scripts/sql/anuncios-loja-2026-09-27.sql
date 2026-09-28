-- anuncios-loja-2026-09-27.sql
--
-- "O sistema de venda funcionará da seguinte maneira, o jogador irá
--  'publicar' os itens na loja pelo preço que ele quiser, outros jogadores ou
--  o mestre podem comprar dele. A ação não precisa acontecer na mesma hora, o
--  item ficará na loja da aventura." (usuário)
--
-- Decisões do usuário (26/09/2026):
--   • Publicar TIRA o item do inventário: fica reservado no anúncio. O dono
--     pode retirar o anúncio e o item volta.
--   • O MESTRE compra: o vendedor recebe as moedas e o item SAI DO JOGO.
--   • Substitui a negociação com o Mestre (vendas_item): o ícone Vender passa
--     a publicar. A tabela e as funções antigas ficam no banco, sem uso (não
--     havia negociação aberta).
--
-- Moedas: o jogo não dá troco — a compra de jogador precisa fechar exato com
-- as moedas do comprador (mesma regra de comprar_item). O depósito no vendedor
-- usa inv_depositar_moeda (precisa de bolsa com espaço, senão a venda não
-- fecha e nada muda).
--
-- REVERTER:
--   drop function public.comprar_item_anunciado(bigint, bigint);
--   drop function public.retirar_item_loja(bigint);
--   drop function public.publicar_item_loja(bigint, text, bigint, bigint);
--   drop function public._menestrel_inv_creditar_latao(jsonb, bigint);
--   drop function public._menestrel_inv_debitar_latao(jsonb, bigint);
--   alter publication supabase_realtime drop table public.anuncios_loja;
--   drop table public.anuncios_loja;   (devolva antes os itens dos anúncios abertos)

create table if not exists public.anuncios_loja (
  id               bigserial primary key,
  historia_id      bigint not null references public.historias(id) on delete cascade,
  vendedor_pj_id   bigint references public.personagens(id) on delete set null,
  vendedor_user_id uuid,
  vendedor_nome    text,
  item             jsonb  not null,          -- a instância reservada (sem containerId/slot)
  slug             text   not null,
  item_nome        text,
  quantidade       bigint not null check (quantidade > 0),
  preco_latao      bigint not null check (preco_latao > 0),   -- preço do lote inteiro
  status           text   not null default 'aberto' check (status in ('aberto', 'vendido', 'retirado')),
  comprador_pj_id  bigint,
  comprador_nome   text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists anuncios_loja_historia_status on public.anuncios_loja (historia_id, status);

alter table public.anuncios_loja enable row level security;
-- Lê quem está na aventura: o Mestre e os donos dos protagonistas. Escrita só
-- pelas funções abaixo (SECURITY DEFINER).
drop policy if exists anuncios_loja_ler on public.anuncios_loja;
create policy anuncios_loja_ler on public.anuncios_loja for select to authenticated using (
  exists (
    select 1 from public.historias h
    where h.id = anuncios_loja.historia_id
      and (h.mestre_id = auth.uid()
        or exists (select 1 from public.personagens p
                   where p.id = any (h.protagonista_ids) and p.user_id = auth.uid()))
  )
);

-- ── Débito exato em latão (sem troco) — mesma conta de comprar_item ─────────
create or replace function public._menestrel_inv_debitar_latao(p_inv jsonb, p_custo bigint)
returns jsonb language plpgsql set search_path to 'public', 'pg_catalog' as $$
declare
  v_itens jsonb := coalesce(p_inv->'itens', '[]'::jsonb);
  v_novos jsonb := '[]'::jsonb;
  v_it jsonb; v_i int; v_grupo text; v_val bigint; v_qtd bigint; v_take bigint;
  w1000 bigint := 0; w100 bigint := 0; w10 bigint := 0; w1 bigint := 0;
  t1000 bigint; t100 bigint; t10 bigint; t1 bigint; v_need bigint;
begin
  if p_custo is null or p_custo <= 0 then return jsonb_build_object('ok', true, 'inv', p_inv); end if;
  for v_i in 0 .. jsonb_array_length(v_itens) - 1 loop
    v_it := v_itens->v_i;
    select grupo, valor_latao into v_grupo, v_val from public.itens where slug = v_it->>'slug';
    if v_grupo = 'Moedas' then
      v_qtd := coalesce((v_it->>'quantidade')::bigint, 0);
      if v_val = 1000 then w1000 := w1000 + v_qtd;
      elsif v_val = 100 then w100 := w100 + v_qtd;
      elsif v_val = 10 then w10 := w10 + v_qtd;
      elsif v_val = 1 then w1 := w1 + v_qtd; end if;
    end if;
  end loop;
  if w1000*1000 + w100*100 + w10*10 + w1 < p_custo then
    return jsonb_build_object('ok', false, 'motivo', 'moedas_insuficientes');
  end if;
  v_need := p_custo;
  t1000 := least(v_need / 1000, w1000); v_need := v_need - t1000*1000;
  t100  := least(v_need / 100,  w100);  v_need := v_need - t100*100;
  t10   := least(v_need / 10,   w10);   v_need := v_need - t10*10;
  t1    := least(v_need,        w1);    v_need := v_need - t1;
  if v_need <> 0 then
    return jsonb_build_object('ok', false, 'motivo', 'moedas_nao_fecham');
  end if;
  for v_i in 0 .. jsonb_array_length(v_itens) - 1 loop
    v_it := v_itens->v_i;
    select grupo, valor_latao into v_grupo, v_val from public.itens where slug = v_it->>'slug';
    if v_grupo = 'Moedas' then
      v_qtd := coalesce((v_it->>'quantidade')::bigint, 0); v_take := 0;
      if v_val = 1000 and t1000 > 0 then v_take := least(v_qtd, t1000); t1000 := t1000 - v_take;
      elsif v_val = 100 and t100 > 0 then v_take := least(v_qtd, t100); t100 := t100 - v_take;
      elsif v_val = 10 and t10 > 0 then v_take := least(v_qtd, t10); t10 := t10 - v_take;
      elsif v_val = 1 and t1 > 0 then v_take := least(v_qtd, t1); t1 := t1 - v_take; end if;
      if v_take > 0 then
        if v_qtd - v_take > 0 then v_novos := v_novos || jsonb_build_array(jsonb_set(v_it, '{quantidade}', to_jsonb(v_qtd - v_take))); end if;
        continue;
      end if;
    end if;
    v_novos := v_novos || jsonb_build_array(v_it);
  end loop;
  return jsonb_build_object('ok', true, 'inv', jsonb_set(coalesce(p_inv, '{"itens":[]}'::jsonb), '{itens}', v_novos));
end $$;

-- ── Crédito em latão: deposita por denominação (ouro, prata, cobre, latão) ──
create or replace function public._menestrel_inv_creditar_latao(p_inv jsonb, p_latao bigint)
returns jsonb language plpgsql set search_path to 'public', 'pg_catalog' as $$
declare
  v_inv jsonb := coalesce(p_inv, '{"itens":[]}'::jsonb);
  v_den bigint[] := array[p_latao / 1000, (p_latao % 1000) / 100, (p_latao % 100) / 10, p_latao % 10];
  v_slugs text[] := array['moeda_ouro', 'moeda_prata', 'moeda_cobre', 'moeda_latao'];
  v_i int;
begin
  for v_i in 1 .. 4 loop
    if v_den[v_i] > 0 then
      v_inv := public.inv_depositar_moeda(v_inv, v_slugs[v_i], v_den[v_i]);
      if v_inv is null then return null; end if;   -- sem bolsa com espaço
    end if;
  end loop;
  return v_inv;
end $$;

-- ── PUBLICAR: o item sai do inventário e fica reservado no anúncio ─────────
create or replace function public.publicar_item_loja(p_pj_id bigint, p_instance_id text, p_quantidade bigint, p_preco_latao bigint)
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_catalog' as $$
declare
  v_uid uuid := auth.uid();
  v_pj public.personagens%rowtype;
  v_hist bigint; v_inst jsonb; v_cat public.itens%rowtype;
  v_itens jsonb; v_idx int := -1; v_i int; v_qtd bigint; v_q bigint;
  v_item jsonb; v_id bigint; v_nome text; v_autor text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado'); end if;
  select * into v_pj from public.personagens where id = p_pj_id for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'pj_nao_encontrado'); end if;
  if v_pj.user_id is distinct from v_uid then return jsonb_build_object('ok', false, 'motivo', 'nao_e_dono'); end if;
  select id into v_hist from public.historias where p_pj_id = any (protagonista_ids) order by created_at desc limit 1;
  if v_hist is null then return jsonb_build_object('ok', false, 'motivo', 'sem_historia'); end if;
  if p_preco_latao is null or p_preco_latao <= 0 then return jsonb_build_object('ok', false, 'motivo', 'preco_invalido'); end if;

  v_itens := coalesce(v_pj.inventario->'itens', '[]'::jsonb);
  for v_i in 0 .. jsonb_array_length(v_itens) - 1 loop
    if v_itens->v_i->>'instanceId' = p_instance_id then v_idx := v_i; v_inst := v_itens->v_i; exit; end if;
  end loop;
  if v_idx < 0 then return jsonb_build_object('ok', false, 'motivo', 'item_indisponivel'); end if;
  select * into v_cat from public.itens where slug = v_inst->>'slug';
  if not found then return jsonb_build_object('ok', false, 'motivo', 'item_nao_existe'); end if;
  if v_cat.grupo = 'Moedas' then return jsonb_build_object('ok', false, 'motivo', 'moeda_nao_vende'); end if;
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

  -- tira do inventário
  if v_q = v_qtd then v_itens := v_itens - v_idx;
  else v_itens := jsonb_set(v_itens, array[v_idx::text, 'quantidade'], to_jsonb(v_qtd - v_q)); end if;
  update public.personagens set inventario = jsonb_set(coalesce(inventario, '{}'::jsonb), '{itens}', v_itens) where id = p_pj_id;

  v_item := v_inst || jsonb_build_object('quantidade', v_q, 'containerId', null, 'equipado', false, 'slot', null, 'vestido', false, 'vesteSlot', null);
  v_nome := nullif(trim(coalesce(v_pj.nome, '') || ' ' || coalesce(v_pj.sobrenome, '')), '');
  insert into public.anuncios_loja (historia_id, vendedor_pj_id, vendedor_user_id, vendedor_nome, item, slug, item_nome, quantidade, preco_latao)
  values (v_hist, p_pj_id, v_uid, v_nome, v_item, v_cat.slug, v_cat.nome, v_q, p_preco_latao)
  returning id into v_id;

  select coalesce(full_name, email, 'Jogador') into v_autor from public.profiles where id = v_uid;
  insert into public.mesa_log (historia_id, autor_id, autor_nome, tipo, texto, meta)
  values (v_hist, v_uid, v_autor, 'item',
    coalesce(v_nome, 'Um personagem') || ' colocou à venda na loja '
      || case when v_q > 1 then v_q || '× ' else '' end || v_cat.nome
      || ' por ' || public._menestrel_moedas_texto(p_preco_latao) || '.',
    jsonb_build_object('anuncio_id', v_id, 'anuncio_acao', 'publicar'));
  return jsonb_build_object('ok', true, 'anuncio_id', v_id);
end $$;

-- ── RETIRAR: o dono (ou o Mestre) tira o anúncio; o item volta ao vendedor ──
create or replace function public.retirar_item_loja(p_anuncio_id bigint)
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_catalog' as $$
declare
  v_uid uuid := auth.uid();
  v_a public.anuncios_loja%rowtype; v_mestre uuid; v_inv jsonb; v_item jsonb;
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
    v_item := v_a.item || jsonb_build_object('instanceId',
      (extract(epoch from clock_timestamp())*1000)::bigint::text || '-' || substr(md5(random()::text), 1, 6));
    v_inv := jsonb_set(v_inv, '{itens}', coalesce(v_inv->'itens', '[]'::jsonb) || jsonb_build_array(v_item));
    update public.personagens set inventario = v_inv where id = v_a.vendedor_pj_id;
  end if;
  update public.anuncios_loja set status = 'retirado', updated_at = now() where id = p_anuncio_id;
  return jsonb_build_object('ok', true);
end $$;

-- ── COMPRAR: jogador paga ao vendedor e leva o item; o Mestre paga e o item
--    sai do jogo (p_pj_id NULL = compra do Mestre) ─────────────────────────
create or replace function public.comprar_item_anunciado(p_anuncio_id bigint, p_pj_id bigint default null)
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_catalog' as $$
declare
  v_uid uuid := auth.uid();
  v_a public.anuncios_loja%rowtype; v_h public.historias%rowtype;
  v_comprador public.personagens%rowtype; v_inv_c jsonb; v_inv_v jsonb; v_deb jsonb;
  v_item jsonb; v_nome_c text; v_autor text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado'); end if;
  select * into v_a from public.anuncios_loja where id = p_anuncio_id for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'anuncio_nao_encontrado'); end if;
  if v_a.status <> 'aberto' then return jsonb_build_object('ok', false, 'motivo', 'anuncio_encerrado'); end if;
  select * into v_h from public.historias where id = v_a.historia_id;

  if p_pj_id is null then
    -- Compra do MESTRE
    if v_h.mestre_id is distinct from v_uid then return jsonb_build_object('ok', false, 'motivo', 'sem_permissao'); end if;
    v_nome_c := 'Mestre';
  else
    select * into v_comprador from public.personagens where id = p_pj_id for update;
    if not found then return jsonb_build_object('ok', false, 'motivo', 'pj_nao_encontrado'); end if;
    if v_comprador.user_id is distinct from v_uid then return jsonb_build_object('ok', false, 'motivo', 'nao_e_dono'); end if;
    if not (p_pj_id = any (v_h.protagonista_ids)) then return jsonb_build_object('ok', false, 'motivo', 'aventura_diferente'); end if;
    if p_pj_id = v_a.vendedor_pj_id then return jsonb_build_object('ok', false, 'motivo', 'proprio_anuncio'); end if;
    -- paga (exato, sem troco) e recebe o item
    v_deb := public._menestrel_inv_debitar_latao(coalesce(v_comprador.inventario, '{"itens":[]}'::jsonb), v_a.preco_latao);
    if not (v_deb->>'ok')::boolean then return jsonb_build_object('ok', false, 'motivo', v_deb->>'motivo'); end if;
    v_inv_c := v_deb->'inv';
    v_item := v_a.item || jsonb_build_object('instanceId',
      (extract(epoch from clock_timestamp())*1000)::bigint::text || '-' || substr(md5(random()::text), 1, 6));
    v_inv_c := jsonb_set(v_inv_c, '{itens}', coalesce(v_inv_c->'itens', '[]'::jsonb) || jsonb_build_array(v_item));
    v_nome_c := nullif(trim(coalesce(v_comprador.nome, '') || ' ' || coalesce(v_comprador.sobrenome, '')), '');
  end if;

  -- o vendedor recebe as moedas (precisa de bolsa com espaço)
  if v_a.vendedor_pj_id is not null then
    select coalesce(inventario, '{"itens":[]}'::jsonb) into v_inv_v from public.personagens where id = v_a.vendedor_pj_id for update;
    v_inv_v := public._menestrel_inv_creditar_latao(v_inv_v, v_a.preco_latao);
    if v_inv_v is null then return jsonb_build_object('ok', false, 'motivo', 'vendedor_sem_espaco_moedas'); end if;
    update public.personagens set inventario = v_inv_v where id = v_a.vendedor_pj_id;
  end if;
  if p_pj_id is not null then
    update public.personagens set inventario = v_inv_c where id = p_pj_id;
  end if;

  update public.anuncios_loja set status = 'vendido', comprador_pj_id = p_pj_id, comprador_nome = v_nome_c, updated_at = now()
   where id = p_anuncio_id;

  select coalesce(full_name, email, 'Jogador') into v_autor from public.profiles where id = v_uid;
  insert into public.mesa_log (historia_id, autor_id, autor_nome, tipo, texto, meta)
  values (v_a.historia_id, v_uid, v_autor, 'item',
    coalesce(v_nome_c, 'Alguém') || ' comprou '
      || case when v_a.quantidade > 1 then v_a.quantidade || '× ' else '' end || coalesce(v_a.item_nome, v_a.slug)
      || ' de ' || coalesce(v_a.vendedor_nome, 'um personagem')
      || ' por ' || public._menestrel_moedas_texto(v_a.preco_latao) || '.',
    jsonb_build_object('anuncio_id', v_a.id, 'anuncio_acao', 'comprar'));
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.publicar_item_loja(bigint, text, bigint, bigint) to authenticated;
grant execute on function public.retirar_item_loja(bigint) to authenticated;
grant execute on function public.comprar_item_anunciado(bigint, bigint) to authenticated;
revoke execute on function public._menestrel_inv_debitar_latao(jsonb, bigint) from public, anon, authenticated;
revoke execute on function public._menestrel_inv_creditar_latao(jsonb, bigint) from public, anon, authenticated;
revoke execute on function public.publicar_item_loja(bigint, text, bigint, bigint) from public, anon;
revoke execute on function public.retirar_item_loja(bigint) from public, anon;
revoke execute on function public.comprar_item_anunciado(bigint, bigint) from public, anon;

-- A vitrine acompanha compra/retirada ao vivo (RLS vale no Realtime).
alter publication supabase_realtime add table public.anuncios_loja;
