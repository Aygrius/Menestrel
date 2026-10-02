-- ============================================================================
-- CARNE DO ABATE VAI PARA A LOJA (28/09/2026)
--
-- "Quando um animal é abatido, seja em combate, seja no inventário, ele
--  automaticamente vai virar a carne do seu tipo, celestial, místico, etc.
--  Não precisa de um dropdown para isso, a conversão é automática e ela deve
--  ser metade do peso total do animal. O item porém não irá para o
--  inventário, ele irá para a loja." (usuário)
--
-- Decisões do mesmo dia:
--   • a loja é a vitrine da aventura (anuncios_loja): a carne entra como
--     ANÚNCIO de quem abateu, pelo preço de tabela — quem comprar paga a ele;
--   • o tipo sem carne própria (Civilizado, Elemental, Morto) rende Carne
--     comum; criatura SEM Energia Física não vira carne;
--   • em combate, a carne sai quando o Mestre encerra a batalha (dentro de
--     encerrar_batalha — atômico, e a batalha é apagada no mesmo passo);
--   • "Carne Demoníaca" passa a se chamar "Carne Infernal" (o slug fica).
--
-- itens.consumiveis / consumiveis_peso deixam de ser lidos: a carne e a
-- quantidade saem da CRIATURA (tipo e peso). As colunas ficam no banco.
-- ============================================================================

update public.itens set nome = 'Carne Infernal',
  descricao = replace(coalesce(descricao, ''), 'Demoníaca', 'Infernal')
 where slug = 'carne_demoniaca';

-- ── A carne de uma criatura: slug e quantidade (metade do peso) ─────────────
create or replace function public._menestrel_carne_da_criatura(p_criatura_id bigint)
returns table (slug text, quantidade bigint)
language sql stable security definer set search_path = public as $$
  select case c.tipo
           when 'Místico'   then 'carne_mistica'
           when 'Celestial' then 'carne_celestial'
           when 'Infernal'  then 'carne_demoniaca'
           when 'Dragão'    then 'carne_draconica'
           else 'carne'
         end,
         greatest(1, floor(c.peso / 2.0))::bigint
    from public.criaturas c
   where c.id = p_criatura_id
     and coalesce(c.energia_fisica, 0) > 0     -- sem EF, não vira carne
     and coalesce(c.peso, 0) > 0;
$$;

-- ── Põe a carne à venda na vitrine da aventura ──────────────────────────────
-- p_pj_id nulo = ninguém abateu (a carne entra sem vendedor; o pagamento não
-- vai para ninguém). Devolve o id do anúncio, ou null se não há carne.
create or replace function public._menestrel_anunciar_carne(
  p_historia_id bigint, p_pj_id bigint, p_slug text, p_qtd bigint, p_origem text)
returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_cat public.itens%rowtype; v_pj public.personagens%rowtype;
  v_nome text; v_id bigint; v_autor text;
begin
  if p_qtd is null or p_qtd < 1 then return null; end if;
  select * into v_cat from public.itens where slug = p_slug;
  if not found then return null; end if;
  if p_pj_id is not null then
    select * into v_pj from public.personagens where id = p_pj_id;
    v_nome := nullif(trim(coalesce(v_pj.nome, '') || ' ' || coalesce(v_pj.sobrenome, '')), '');
  end if;
  insert into public.anuncios_loja (historia_id, vendedor_pj_id, vendedor_user_id, vendedor_nome,
                                    item, slug, item_nome, quantidade, preco_latao)
  values (p_historia_id, p_pj_id, v_pj.user_id, v_nome,
          jsonb_build_object('instanceId', (extract(epoch from clock_timestamp()) * 1000)::bigint::text
                               || '-' || substr(md5(random()::text), 1, 6),
                             'slug', v_cat.slug, 'quantidade', p_qtd, 'equipado', false,
                             'slot', null, 'containerId', null, 'vestido', false),
          v_cat.slug, v_cat.nome, p_qtd, coalesce(v_cat.valor_latao, 0))
  returning id into v_id;

  select coalesce(full_name, email, 'Mestre') into v_autor from public.profiles where id = auth.uid();
  insert into public.mesa_log (historia_id, autor_id, autor_nome, tipo, texto, meta)
  values (p_historia_id, auth.uid(), coalesce(v_autor, 'Mestre'), 'item',
    'A carne de ' || coalesce(p_origem, 'um animal') || ' (' || p_qtd || '× ' || v_cat.nome || ') foi para a loja'
      || case when v_nome is not null then ', à venda por ' || split_part(v_nome, ' ', 1) else '' end || '.',
    jsonb_build_object('anuncio_id', v_id, 'anuncio_acao', 'carne'));
  return v_id;
end $$;

revoke all on function public._menestrel_carne_da_criatura(bigint) from public, anon, authenticated;
revoke all on function public._menestrel_anunciar_carne(bigint, bigint, text, bigint, text) from public, anon, authenticated;

-- ── Abater um animal do inventário ──────────────────────────────────────────
create or replace function public.abater_animal(p_pj_id bigint, p_instance_id text)
returns jsonb
language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  v_uid uuid := auth.uid();
  v_pj public.personagens%rowtype; v_hist bigint;
  v_itens jsonb; v_inst jsonb; v_idx int := -1; v_i int; v_qtd bigint;
  v_cat public.itens%rowtype; v_carne record; v_anuncio bigint;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado'); end if;
  select * into v_pj from public.personagens where id = p_pj_id for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'pj_nao_encontrado'); end if;
  if v_pj.user_id is distinct from v_uid then return jsonb_build_object('ok', false, 'motivo', 'nao_e_dono'); end if;
  select id into v_hist from public.historias where p_pj_id = any (protagonista_ids) order by created_at desc limit 1;
  if v_hist is null then return jsonb_build_object('ok', false, 'motivo', 'sem_historia'); end if;

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

  -- Um animal por vez: a pilha perde um.
  v_qtd := coalesce((v_inst->>'quantidade')::bigint, 1);
  if v_qtd > 1 then v_itens := jsonb_set(v_itens, array[v_idx::text, 'quantidade'], to_jsonb(v_qtd - 1));
  else v_itens := v_itens - v_idx; end if;
  update public.personagens set inventario = jsonb_set(coalesce(inventario, '{}'::jsonb), '{itens}', v_itens)
   where id = p_pj_id;

  v_anuncio := public._menestrel_anunciar_carne(v_hist, p_pj_id, v_carne.slug, v_carne.quantidade, v_cat.nome);
  return jsonb_build_object('ok', true, 'slug', v_carne.slug, 'quantidade', v_carne.quantidade, 'anuncio_id', v_anuncio);
end $$;
revoke all on function public.abater_animal(bigint, text) from public, anon;
grant execute on function public.abater_animal(bigint, text) to authenticated;

-- ── A carne das criaturas mortas numa batalha ───────────────────────────────
-- Quem abateu = o último PJ que atingiu a criatura, lido do log (alvo_nome ou
-- alvos_extras_nomes). Sem PJ no log, a carne entra sem vendedor.
create or replace function public._menestrel_carne_da_batalha(p_historia_id bigint, p_participantes jsonb, p_log jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_p jsonb; v_carne record; v_pj bigint; v_e jsonb; v_i int; v_n int;
  v_criatura_nome text;
begin
  for v_p in select * from jsonb_array_elements(coalesce(p_participantes, '[]'::jsonb)) loop
    continue when v_p->>'tipo' <> 'criatura' or v_p->>'status' <> 'morto';
    select * into v_carne from public._menestrel_carne_da_criatura((v_p->>'ref_id')::bigint);
    continue when v_carne.slug is null;
    v_pj := null;
    v_n := jsonb_array_length(coalesce(p_log, '[]'::jsonb));
    for v_i in reverse (v_n - 1) .. 0 loop
      v_e := p_log->v_i;
      if v_e->>'autor_tipo' = 'pj'
         and (v_e->>'alvo_nome' = v_p->>'nome'
              or coalesce(v_e->'alvos_extras_nomes', '[]'::jsonb) ? (v_p->>'nome')) then
        v_pj := (v_e->>'autor_ref_id')::bigint; exit;
      end if;
    end loop;
    select nome into v_criatura_nome from public.criaturas where id = (v_p->>'ref_id')::bigint;
    perform public._menestrel_anunciar_carne(p_historia_id, v_pj, v_carne.slug, v_carne.quantidade,
      coalesce(v_p->>'nome', v_criatura_nome));
  end loop;
end $$;
revoke all on function public._menestrel_carne_da_batalha(bigint, jsonb, jsonb) from public, anon, authenticated;

-- encerrar_batalha passa a gerar a carne antes de arquivar e apagar.
do $do$
declare d text;
begin
  d := pg_get_functiondef('public.encerrar_batalha'::regproc);
  if position('_menestrel_carne_da_batalha' in d) = 0 then
    d := replace(d,
      '  -- APPEND no array batalhas_arquivadas da história.',
      '  -- Carne das criaturas mortas vai para a loja (28/09/2026).' || E'\n' ||
      '  PERFORM public._menestrel_carne_da_batalha(b.historia_id, b.participantes, b.log);' || E'\n\n' ||
      '  -- APPEND no array batalhas_arquivadas da história.');
    if position('_menestrel_carne_da_batalha' in d) = 0 then
      raise exception 'encerrar_batalha: ponto de enxerto não encontrado';
    end if;
    execute d;
  end if;
end
$do$;
