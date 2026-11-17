-- ============================================================
-- 17/11/2026 — Cidade onde a mesa está vira conhecida; memória com vínculo.
-- Usuário: "Estar em uma cidade, automaticamente ela se torna conhecida. [...]
-- ao criar a memória, o jogador seleciona qual é o tipo de memória. E ele
-- poderá vincular a algo que ele conhece."
-- ============================================================

-- 1) A CIDADE (OU O LOCAL) ONDE A MESA ESTÁ PASSA A SER CONHECIDA.
--    O lugar atual mora em historias.data_jogo_atual->>'local' (um nome).
--    Ao mudar, o slug da cidade/local com esse nome entra em cidade_ids /
--    local_ids (o que a mesa conhece, listar_diario_disponivel). Se o Mestre
--    tinha restringido aquele lugar a alguns personagens (lore_acesso_pj), os
--    protagonistas da mesa entram na lista: todos estão lá.
create or replace function public._menestrel_lugar_atual_conhecido()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_nome text := lower(btrim(coalesce(new.data_jogo_atual->>'local', '')));
  v_slug text;
  v_tipo text;
  v_chave text;
  v_lista jsonb;
begin
  if v_nome = '' then return new; end if;
  select slug, 'cidade' into v_slug, v_tipo from public.cidades where lower(btrim(nome)) = v_nome limit 1;
  if v_slug is null then
    select slug, 'local' into v_slug, v_tipo from public.locais where lower(btrim(nome)) = v_nome limit 1;
  end if;
  if v_slug is null then return new; end if;

  if v_tipo = 'cidade' then
    if not (coalesce(new.cidade_ids, '{}') @> array[v_slug]) then
      new.cidade_ids := coalesce(new.cidade_ids, '{}') || v_slug;
    end if;
  else
    if not (coalesce(new.local_ids, '{}') @> array[v_slug]) then
      new.local_ids := coalesce(new.local_ids, '{}') || v_slug;
    end if;
  end if;

  v_chave := v_tipo || ':' || v_slug;
  if coalesce(new.lore_acesso_pj, '{}'::jsonb) ? v_chave then
    select coalesce(jsonb_agg(distinct x), '[]'::jsonb) into v_lista
      from (select jsonb_array_elements(new.lore_acesso_pj -> v_chave) x
            union select to_jsonb(p) from unnest(coalesce(new.protagonista_ids, '{}')) p) s;
    new.lore_acesso_pj := jsonb_set(new.lore_acesso_pj, array[v_chave], v_lista);
  end if;
  return new;
end $$;

drop trigger if exists historias_lugar_atual_conhecido on public.historias;
create trigger historias_lugar_atual_conhecido
  before insert or update of data_jogo_atual on public.historias
  for each row execute function public._menestrel_lugar_atual_conhecido();

-- As mesas que já estão numa cidade.
update public.historias set data_jogo_atual = data_jogo_atual where data_jogo_atual ? 'local';

-- 2) O VÍNCULO DA MEMÓRIA: o tipo (reino, cidade, local, pessoa, criatura) e
--    a entrada. O nome é guardado junto, resolvido aqui, para o cartão e para
--    o amigo que lê a memória compartilhada.
alter table public.diario_entradas
  add column if not exists vinculo_tipo text,
  add column if not exists vinculo_id   text,
  add column if not exists vinculo_nome text;
alter table public.diario_entradas drop constraint if exists diario_entradas_vinculo_tipo_check;
alter table public.diario_entradas add constraint diario_entradas_vinculo_tipo_check
  check (vinculo_tipo is null or vinculo_tipo in ('reino', 'cidade', 'local', 'npc', 'criatura'));

drop function if exists public.salvar_memoria_diario(bigint, bigint, text, text);
create or replace function public.salvar_memoria_diario(
  p_id bigint default null, p_personagem_id bigint default null,
  p_titulo text default null, p_conteudo text default null,
  p_vinculo_tipo text default null, p_vinculo_id text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  resultado public.diario_entradas%rowtype;
  v_tipo text := nullif(btrim(coalesce(p_vinculo_tipo, '')), '');
  v_id   text := nullif(btrim(coalesce(p_vinculo_id, '')), '');
  v_nome text;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado'); end if;
  if p_titulo is null or btrim(p_titulo) = '' then return jsonb_build_object('ok', false, 'motivo', 'titulo_obrigatorio'); end if;
  if not exists (select 1 from public.personagens where id = p_personagem_id and user_id = auth.uid()) then
    return jsonb_build_object('ok', false, 'motivo', 'pj_nao_encontrado');
  end if;

  if v_tipo is null or v_id is null then
    v_tipo := null; v_id := null;
  else
    if v_tipo = 'reino' then select nome into v_nome from public.reinos where slug = v_id;
    elsif v_tipo = 'cidade' then select nome into v_nome from public.cidades where slug = v_id;
    elsif v_tipo = 'local' then select nome into v_nome from public.locais where slug = v_id;
    elsif v_tipo = 'npc' then select nome into v_nome from public.npcs where slug = v_id;
    elsif v_tipo = 'criatura' and v_id ~ '^\d+$' then select nome into v_nome from public.criaturas where id = v_id::bigint;
    else return jsonb_build_object('ok', false, 'motivo', 'vinculo_invalido');
    end if;
    if v_nome is null then return jsonb_build_object('ok', false, 'motivo', 'vinculo_invalido'); end if;
  end if;

  if p_id is null then
    insert into public.diario_entradas (personagem_id, tipo, ref_id, titulo, comentario, vinculo_tipo, vinculo_id, vinculo_nome)
    values (p_personagem_id, 'memoria', null, p_titulo, p_conteudo, v_tipo, v_id, v_nome)
    returning * into resultado;
  else
    update public.diario_entradas
       set titulo = p_titulo, comentario = p_conteudo, vinculo_tipo = v_tipo, vinculo_id = v_id, vinculo_nome = v_nome, updated_at = now()
     where id = p_id and tipo = 'memoria' and personagem_id = p_personagem_id
    returning * into resultado;
    if not found then return jsonb_build_object('ok', false, 'motivo', 'entrada_nao_encontrada'); end if;
  end if;
  return jsonb_build_object('ok', true, 'entrada', to_jsonb(resultado));
end $function$;
grant execute on function public.salvar_memoria_diario(bigint, bigint, text, text, text, text) to authenticated;
