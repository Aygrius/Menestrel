-- O SAQUE QUE NINGUÉM PEGOU VAI PARA A LOJA (08/11/2026).
-- Usuário: "Quando os inimigos morrem, os itens de saque devem ir para a loja,
-- sendo vendida por quem o matou." (antes: "Eu não consigo ver os itens
-- disponíveis após a batalha" — ao encerrar, a batalha era apagada e o
-- equipamento não saqueado sumia junto.)
--
-- Mesmo molde da carne (_menestrel_carne_da_batalha, 28/09/2026): ao encerrar,
-- cada criatura MORTA (sem dono — animal de personagem não entra) anuncia na
-- loja da mesa o que carregava e não foi saqueado, à venda pelo PERSONAGEM que
-- a matou, pelo preço do catálogo (valor_latao), na cidade onde a mesa está.
--
-- O que ela carregava: criaturas.equipamento — armas e peças contam 1 cada; a
-- mochila ({slot:'mochila', qtd}) conta qtd. Menos o que já saiu na batalha
-- (participante.saqueado = { slug: quantidade }, a mesma conta de
-- saqueDisponivel em 09-bestiario/criatura-formulas.jsx).
--
-- Quem matou: o último PERSONAGEM que a atacou no log. Desde 08/11/2026 o log
-- grava alvo_inst_id, e dois "Haalin" deixaram de se confundir; nas entradas
-- antigas vale o nome (como a carne sempre fez). A carne passa a usar a mesma
-- conta. Sem personagem (morta por outra criatura), o saque NÃO vai para a
-- loja (a carne segue como sempre).
--
-- Para desfazer: restaurar encerrar_batalha e _menestrel_carne_da_batalha das
-- definições anteriores (git: scripts/sql) e
--   drop function public._menestrel_saque_da_batalha(bigint, jsonb, jsonb);
--   drop function public._menestrel_matador_da_criatura(jsonb, jsonb);

create or replace function public._menestrel_matador_da_criatura(p_part jsonb, p_log jsonb)
returns bigint
language plpgsql stable security definer set search_path to 'public'
as $$
declare
  v_n int; v_i int; v_e jsonb;
begin
  v_n := jsonb_array_length(coalesce(p_log, '[]'::jsonb));
  for v_i in reverse (v_n - 1) .. 0 loop
    v_e := p_log->v_i;
    continue when coalesce(v_e->>'autor_tipo', '') <> 'pj';
    if v_e->>'alvo_inst_id' is not null then
      if v_e->>'alvo_inst_id' = p_part->>'inst_id' then
        return (v_e->>'autor_ref_id')::bigint;
      end if;
    elsif v_e->>'alvo_nome' = p_part->>'nome'
       or coalesce(v_e->'alvos_extras_nomes', '[]'::jsonb) ? (p_part->>'nome') then
      return (v_e->>'autor_ref_id')::bigint;
    end if;
  end loop;
  return null;
end $$;

create or replace function public._menestrel_saque_da_batalha(p_historia_id bigint, p_participantes jsonb, p_log jsonb)
returns void
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_p jsonb; v_pj bigint; v_pjrow public.personagens%rowtype; v_vendedor text; v_lugar text; v_autor text;
  v_item record; v_cat public.itens%rowtype; v_resta bigint; v_nomes text[]; v_criatura text;
begin
  select nullif(btrim(coalesce(data_jogo_atual->>'local', '')), '') into v_lugar
    from public.historias where id = p_historia_id;
  select coalesce(full_name, email, 'Mestre') into v_autor from public.profiles where id = auth.uid();

  for v_p in select * from jsonb_array_elements(coalesce(p_participantes, '[]'::jsonb)) loop
    continue when v_p->>'tipo' <> 'criatura' or v_p->>'status' <> 'morto' or v_p->>'dono_pj' is not null;
    v_pj := public._menestrel_matador_da_criatura(v_p, p_log);
    -- Só o saque de quem um PERSONAGEM matou (08/11/2026, usuário: "Apenas os
    -- itens de personagens que vão para a loja após o saque"). Morta por outra
    -- criatura, nada vai para a loja.
    continue when v_pj is null;
    v_vendedor := null; v_pjrow := null;
    if v_pj is not null then
      select * into v_pjrow from public.personagens where id = v_pj;
      v_vendedor := nullif(trim(coalesce(v_pjrow.nome, '') || ' ' || coalesce(v_pjrow.sobrenome, '')), '');
    end if;
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
      -- Arma NATURAL (grupo Livre: Garra, Mordida, Chifre, Cauda, Hálito…) é
      -- parte do corpo, não se vende.
      continue when coalesce(v_cat.grupo_armas, '') = 'Livre';
      insert into public.anuncios_loja (historia_id, vendedor_pj_id, vendedor_user_id, vendedor_nome,
                                        item, slug, item_nome, quantidade, preco_latao, lugar)
      values (p_historia_id, v_pj, v_pjrow.user_id, v_vendedor,
              jsonb_build_object('instanceId', (extract(epoch from clock_timestamp()) * 1000)::bigint::text
                                   || '-' || substr(md5(random()::text), 1, 6),
                                 'slug', v_cat.slug, 'quantidade', v_resta, 'equipado', false,
                                 'slot', null, 'containerId', null, 'vestido', false),
              v_cat.slug, v_cat.nome, v_resta, coalesce(v_cat.valor_latao, 0), v_lugar);
      v_nomes := v_nomes || (v_resta || '× ' || v_cat.nome);
    end loop;

    if array_length(v_nomes, 1) > 0 then
      insert into public.mesa_log (historia_id, autor_id, autor_nome, tipo, texto, meta)
      values (p_historia_id, auth.uid(), coalesce(v_autor, 'Mestre'), 'item',
        'O saque de ' || coalesce(v_p->>'nome', v_criatura, 'uma criatura') || ' (' || array_to_string(v_nomes, ', ') || ') foi para a loja'
          || case when v_lugar is not null then ' de ' || v_lugar else '' end
          || case when v_vendedor is not null then ', à venda por ' || split_part(v_vendedor, ' ', 1) else '' end || '.',
        jsonb_build_object('anuncio_acao', 'saque', 'lugar', v_lugar, 'criatura', v_p->>'nome'));
    end if;
  end loop;
end $$;

-- A carne passa a usar o mesmo matador (instância quando houver).
create or replace function public._menestrel_carne_da_batalha(p_historia_id bigint, p_participantes jsonb, p_log jsonb)
returns void
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_p jsonb; v_carne record; v_criatura_nome text;
begin
  for v_p in select * from jsonb_array_elements(coalesce(p_participantes, '[]'::jsonb)) loop
    continue when v_p->>'tipo' <> 'criatura' or v_p->>'status' <> 'morto';
    select * into v_carne from public._menestrel_carne_da_criatura((v_p->>'ref_id')::bigint);
    continue when v_carne.slug is null;
    select nome into v_criatura_nome from public.criaturas where id = (v_p->>'ref_id')::bigint;
    perform public._menestrel_anunciar_carne(p_historia_id, public._menestrel_matador_da_criatura(v_p, p_log),
      v_carne.slug, v_carne.quantidade, coalesce(v_p->>'nome', v_criatura_nome));
  end loop;
end $$;

create or replace function public.encerrar_batalha(p_batalha_id bigint)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare
  b record;
  registro jsonb;
begin
  select id, historia_id, mestre_id, rodada, participantes, log, created_at, treinamento
    into b
    from public.batalhas
   where id = p_batalha_id
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'nao_encontrada');
  end if;

  if b.mestre_id is distinct from auth.uid() then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autorizado');
  end if;

  -- Treino (07/11/2026): nada sai da luta — sem arquivo, sem carne nem saque na loja.
  if b.treinamento then
    delete from public.batalhas where id = b.id;
    return jsonb_build_object('ok', true, 'treinamento', true);
  end if;

  registro := jsonb_build_object(
    'id',             b.id,
    'encerrada_em',   to_jsonb(now()),
    'criada_em',      to_jsonb(b.created_at),
    'rodadas',        coalesce(b.rodada, 0),
    'participantes',  coalesce(b.participantes, '[]'::jsonb),
    'log',            coalesce(b.log, '[]'::jsonb)
  );

  -- Carne das criaturas mortas vai para a loja (28/09/2026).
  perform public._menestrel_carne_da_batalha(b.historia_id, b.participantes, b.log);
  -- E o que elas carregavam e ninguém saqueou (08/11/2026).
  perform public._menestrel_saque_da_batalha(b.historia_id, b.participantes, b.log);

  update public.historias
     set batalhas_arquivadas = coalesce(batalhas_arquivadas, '[]'::jsonb) || jsonb_build_array(registro)
   where id = b.historia_id;

  delete from public.batalhas where id = b.id;

  return jsonb_build_object('ok', true);
end $$;
