-- anuncios-loja-parcial-2026-09-27.sql
--
-- Comprar PARTE de um anúncio (27/09/2026): "O seletor de quantidade deve ser
-- igual em 'comprar item'" — quem compra de outro aventureiro escolhe quantos
-- leva, como na loja do Mestre.
--
-- Com isso o preço do anúncio passa a ser POR UNIDADE (anuncios_loja.
-- preco_latao). Não havia anúncio gravado quando a regra mudou.
--   • publicar_item_loja: p_preco_latao é o preço de cada unidade;
--   • comprar_item_anunciado ganha p_quantidade (NULL = tudo). Comprar menos
--     que o anunciado deixa o resto à venda; comprar tudo encerra o anúncio.
--
-- REVERTER: reaplicar anuncios-loja-2026-09-27.sql (a versão de 2 parâmetros
-- de comprar_item_anunciado) depois de
--   drop function public.comprar_item_anunciado(bigint, bigint, bigint);

comment on column public.anuncios_loja.preco_latao is 'Preço de CADA unidade, em latão (27/09/2026).';

-- publicar: só a mensagem muda ("por X cada").
do $$
declare v_src text;
begin
  select pg_get_functiondef('public.publicar_item_loja(bigint, text, bigint, bigint)'::regprocedure) into v_src;
  if position($q$|| ' por ' || public._menestrel_moedas_texto(p_preco_latao) || '.',$q$ in v_src) = 0 then
    raise exception 'publicar_item_loja: trecho da mensagem não encontrado';
  end if;
  v_src := replace(v_src,
    $q$|| ' por ' || public._menestrel_moedas_texto(p_preco_latao) || '.',$q$,
    $q$|| ' por ' || public._menestrel_moedas_texto(p_preco_latao) || case when v_q > 1 then ' cada' else '' end || '.',$q$);
  execute v_src;
end $$;

drop function if exists public.comprar_item_anunciado(bigint, bigint);

create or replace function public.comprar_item_anunciado(p_anuncio_id bigint, p_pj_id bigint default null, p_quantidade bigint default null)
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_catalog' as $$
declare
  v_uid uuid := auth.uid();
  v_a public.anuncios_loja%rowtype; v_h public.historias%rowtype;
  v_comprador public.personagens%rowtype; v_inv_c jsonb; v_inv_v jsonb; v_deb jsonb;
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
    v_item := v_a.item || jsonb_build_object('quantidade', v_q, 'instanceId',
      (extract(epoch from clock_timestamp())*1000)::bigint::text || '-' || substr(md5(random()::text), 1, 6));
    v_inv_c := jsonb_set(v_inv_c, '{itens}', coalesce(v_inv_c->'itens', '[]'::jsonb) || jsonb_build_array(v_item));
    v_nome_c := nullif(trim(coalesce(v_comprador.nome, '') || ' ' || coalesce(v_comprador.sobrenome, '')), '');
  end if;

  if v_a.vendedor_pj_id is not null then
    select coalesce(inventario, '{"itens":[]}'::jsonb) into v_inv_v from public.personagens where id = v_a.vendedor_pj_id for update;
    v_inv_v := public._menestrel_inv_creditar_latao(v_inv_v, v_custo);
    if v_inv_v is null then return jsonb_build_object('ok', false, 'motivo', 'vendedor_sem_espaco_moedas'); end if;
    update public.personagens set inventario = v_inv_v where id = v_a.vendedor_pj_id;
  end if;
  if p_pj_id is not null then
    update public.personagens set inventario = v_inv_c where id = p_pj_id;
  end if;

  if v_resto > 0 then
    -- sobrou: o anúncio continua aberto com o resto
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
    coalesce(v_nome_c, 'Alguém') || ' comprou '
      || case when v_q > 1 then v_q || '× ' else '' end || coalesce(v_a.item_nome, v_a.slug)
      || ' de ' || coalesce(v_a.vendedor_nome, 'um personagem')
      || ' por ' || public._menestrel_moedas_texto(v_custo) || '.',
    jsonb_build_object('anuncio_id', v_a.id, 'anuncio_acao', 'comprar', 'quantidade', v_q));
  return jsonb_build_object('ok', true, 'quantidade', v_q, 'resto', v_resto);
end $$;

grant execute on function public.comprar_item_anunciado(bigint, bigint, bigint) to authenticated;
revoke execute on function public.comprar_item_anunciado(bigint, bigint, bigint) from public, anon;
