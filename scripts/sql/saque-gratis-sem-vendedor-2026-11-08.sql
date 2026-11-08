-- O SAQUE QUE SOBROU VAI PARA A LOJA DE GRAÇA E SEM DONO (08/11/2026).
-- Usuário: "Os itens de saque ao derrotar um inimigo devem ir para a loja, sem
-- valor de compra, ao invés de ir para o jogador." Perguntado: o botão
-- "Saquear" da batalha continua (põe o item no PJ); só o que NÃO foi saqueado
-- vai para a loja, e "Ninguém, o item fica sem preço" — o anúncio nasce com
-- preco_latao = 0 e sem vendedor (vendedor_pj_id/user_id/nome nulos).
--
-- Sem vendedor, comprar_item_anunciado entrega o item a partir do próprio
-- anúncio (o ramo "vendedor_pj_id is null"), sem crédito para ninguém. Antes,
-- o anúncio apontava o matador como vendedor sem o item estar no inventário
-- dele, e a compra caía em "item_indisponivel".
--
-- Continua valendo: só a criatura MORTA por um personagem (o matador ainda
-- decide SE vai, só não aparece como vendedor), sem dono_pj, e arma natural
-- (grupo Livre) não entra.
--
-- Para desfazer: reaplicar _menestrel_saque_da_batalha de
-- scripts/sql/saque-para-loja-2026-11-08.sql.

create or replace function public._menestrel_saque_da_batalha(p_historia_id bigint, p_participantes jsonb, p_log jsonb)
returns void
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_p jsonb; v_lugar text; v_autor text;
  v_item record; v_cat public.itens%rowtype; v_resta bigint; v_nomes text[]; v_criatura text;
begin
  select nullif(btrim(coalesce(data_jogo_atual->>'local', '')), '') into v_lugar
    from public.historias where id = p_historia_id;
  select coalesce(full_name, email, 'Mestre') into v_autor from public.profiles where id = auth.uid();

  for v_p in select * from jsonb_array_elements(coalesce(p_participantes, '[]'::jsonb)) loop
    continue when v_p->>'tipo' <> 'criatura' or v_p->>'status' <> 'morto' or v_p->>'dono_pj' is not null;
    -- Só o saque de quem um PERSONAGEM matou; morta por outra criatura, nada vai.
    continue when public._menestrel_matador_da_criatura(v_p, p_log) is null;
    select nome into v_criatura from public.criaturas where id = (v_p->>'ref_id')::bigint;
    v_nomes := '{}';

    for v_item in
      select e->>'slug' as slug,
             sum(case when e->>'slot' = 'mochila' then greatest(1, coalesce((e->>'qtd')::bigint, 1)) else 1 end) as qtd
        from public.criaturas c, jsonb_array_elements(coalesce(c.equipamento, '[]'::jsonb)) e
       where c.id = (v_p->>'ref_id')::bigint and e->>'slug' is not null
       group by e->>'slug'
    loop
      v_resta := v_item.qtd - coalesce((v_p->'saqueado'->>v_item.slug)::bigint, 0);
      continue when v_resta < 1;
      select * into v_cat from public.itens where slug = v_item.slug;
      continue when not found;
      continue when coalesce(v_cat.grupo_armas, '') = 'Livre';
      insert into public.anuncios_loja (historia_id, vendedor_pj_id, vendedor_user_id, vendedor_nome,
                                        item, slug, item_nome, quantidade, preco_latao, lugar)
      values (p_historia_id, null, null, null,
              jsonb_build_object('instanceId', (extract(epoch from clock_timestamp()) * 1000)::bigint::text
                                   || '-' || substr(md5(random()::text), 1, 6),
                                 'slug', v_cat.slug, 'quantidade', v_resta, 'equipado', false,
                                 'slot', null, 'containerId', null, 'vestido', false),
              v_cat.slug, v_cat.nome, v_resta, 0, v_lugar);
      v_nomes := v_nomes || (v_resta || '× ' || v_cat.nome);
    end loop;

    if array_length(v_nomes, 1) > 0 then
      insert into public.mesa_log (historia_id, autor_id, autor_nome, tipo, texto, meta)
      values (p_historia_id, auth.uid(), coalesce(v_autor, 'Mestre'), 'item',
        'O saque de ' || coalesce(v_p->>'nome', v_criatura, 'uma criatura') || ' (' || array_to_string(v_nomes, ', ') || ') foi para a loja'
          || case when v_lugar is not null then ' de ' || v_lugar else '' end || ', de graça.',
        jsonb_build_object('anuncio_acao', 'saque', 'lugar', v_lugar, 'criatura', v_p->>'nome'));
    end if;
  end loop;
end $$;
