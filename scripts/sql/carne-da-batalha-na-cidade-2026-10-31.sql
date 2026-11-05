-- ============================================================
-- carne-da-batalha-na-cidade-2026-10-31.sql
-- ============================================================
-- "O animal morto em batalha vai para a loja da cidade que a história está."
-- (usuário, 31/10/2026)
--
-- A carne de criatura morta em batalha (_menestrel_carne_da_batalha) vira
-- anúncio à venda por quem deu o golpe final — e o anúncio nascia SEM
-- `lugar`. Desde as lojas por cidade (28/10), anúncio sem cidade não aparece
-- em loja nenhuma. Agora ele leva o local atual da mesa
-- (historias.data_jogo_atual->>'local'), o mesmo que get_loja_pj compara.
-- Hoje só a batalha chama esta função (o abate vai para o inventário,
-- carne-do-abate-no-inventario-2026-10-31.sql).
-- ============================================================

begin;

create or replace function public._menestrel_anunciar_carne(p_historia_id bigint, p_pj_id bigint, p_slug text, p_qtd bigint, p_origem text)
returns bigint language plpgsql security definer set search_path to 'public' as $function$
declare
  v_cat public.itens%rowtype; v_pj public.personagens%rowtype;
  v_nome text; v_id bigint; v_autor text; v_lugar text;
begin
  if p_qtd is null or p_qtd < 1 then return null; end if;
  select * into v_cat from public.itens where slug = p_slug;
  if not found then return null; end if;
  if p_pj_id is not null then
    select * into v_pj from public.personagens where id = p_pj_id;
    v_nome := nullif(trim(coalesce(v_pj.nome, '') || ' ' || coalesce(v_pj.sobrenome, '')), '');
  end if;
  -- A cidade onde a mesa está: é nela que a carne aparece à venda.
  select nullif(btrim(coalesce(data_jogo_atual->>'local', '')), '') into v_lugar
    from public.historias where id = p_historia_id;

  insert into public.anuncios_loja (historia_id, vendedor_pj_id, vendedor_user_id, vendedor_nome,
                                    item, slug, item_nome, quantidade, preco_latao, lugar)
  values (p_historia_id, p_pj_id, v_pj.user_id, v_nome,
          jsonb_build_object('instanceId', (extract(epoch from clock_timestamp()) * 1000)::bigint::text
                               || '-' || substr(md5(random()::text), 1, 6),
                             'slug', v_cat.slug, 'quantidade', p_qtd, 'equipado', false,
                             'slot', null, 'containerId', null, 'vestido', false),
          v_cat.slug, v_cat.nome, p_qtd, coalesce(v_cat.valor_latao, 0), v_lugar)
  returning id into v_id;

  select coalesce(full_name, email, 'Mestre') into v_autor from public.profiles where id = auth.uid();
  insert into public.mesa_log (historia_id, autor_id, autor_nome, tipo, texto, meta)
  values (p_historia_id, auth.uid(), coalesce(v_autor, 'Mestre'), 'item',
    'A carne de ' || coalesce(p_origem, 'um animal') || ' (' || p_qtd || '× ' || v_cat.nome || ') foi para a loja'
      || case when v_lugar is not null then ' de ' || v_lugar else '' end
      || case when v_nome is not null then ', à venda por ' || split_part(v_nome, ' ', 1) else '' end || '.',
    jsonb_build_object('anuncio_id', v_id, 'anuncio_acao', 'carne', 'lugar', v_lugar));
  return v_id;
end $function$;

commit;
