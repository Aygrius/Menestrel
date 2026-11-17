-- ============================================================================
-- AMIGOS: VER A FICHA E COMPARTILHAR O DIÁRIO (17/11/2026)
--
-- Usuário: "Vamos adicionar 'ver ficha' e 'compartilhar diário' apenas com
-- amigos." Escolhas: ver só a página Ficha do amigo; compartilhar cada
-- memória, uma a uma. Amigo = pacto de amizade SELADO (pacto-amizade-2026-09-28).
--
-- 1. pj_amigos(a, b): os dois personagens têm pacto selado.
-- 2. personagens: o dono de um PJ lê a linha do PJ amigo (só SELECT).
-- 3. diario_entradas.compartilhado + compartilhar_memoria(): a memória vai
--    para os amigos de quem a escreveu.
-- 4. listar_diario_disponivel: as memórias = as minhas + as que meus amigos
--    compartilharam (com autor_id/autor_nome).
-- 5. listar_diario_lore: o reino/cidade/local/pessoa que outro jogador criou e
--    compartilhou só aparece se ele for amigo (antes: a mesa inteira).
-- ============================================================================

-- 1 ───────────────────────────────────────────────────────────────────────────
create or replace function public.pj_amigos(p_a bigint, p_b bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pactos_amizade pa
                  where pa.pj_a = least(p_a, p_b) and pa.pj_b = greatest(p_a, p_b) and pa.selado);
$$;
-- Algum PJ do usuário logado é amigo de p_pj? (para a policy; security definer
-- para não recursar na policy de personagens)
create or replace function public.pj_amigo_de_algum_meu(p_pj bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pactos_amizade pa
                   join public.personagens meu on meu.user_id = auth.uid() and meu.id in (pa.pj_a, pa.pj_b)
                  where pa.selado and p_pj in (pa.pj_a, pa.pj_b) and p_pj <> meu.id);
$$;
revoke all on function public.pj_amigos(bigint, bigint), public.pj_amigo_de_algum_meu(bigint) from public, anon;
grant execute on function public.pj_amigos(bigint, bigint), public.pj_amigo_de_algum_meu(bigint) to authenticated;

-- 2 ───────────────────────────────────────────────────────────────────────────
drop policy if exists personagens_select_amigo on public.personagens;
create policy personagens_select_amigo on public.personagens
  for select to authenticated using (public.pj_amigo_de_algum_meu(id));

-- 3 ───────────────────────────────────────────────────────────────────────────
alter table public.diario_entradas add column if not exists compartilhado boolean not null default false;

create or replace function public.compartilhar_memoria(p_id bigint, p_ligar boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_linhas int;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado'); end if;
  update public.diario_entradas d set compartilhado = p_ligar
   where d.id = p_id and d.tipo = 'memoria'
     and exists (select 1 from public.personagens p where p.id = d.personagem_id and p.user_id = auth.uid());
  get diagnostics v_linhas = row_count;
  if v_linhas = 0 then return jsonb_build_object('ok', false, 'motivo', 'entrada_nao_encontrada_ou_sem_permissao'); end if;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.compartilhar_memoria(bigint, boolean) from public, anon;
grant execute on function public.compartilhar_memoria(bigint, boolean) to authenticated;

-- 4 e 5: enxerto no texto das funções atuais (idempotente) ─────────────────────
do $do$
declare d text;
begin
  d := pg_get_functiondef('public.listar_diario_disponivel(bigint)'::regprocedure);
  if position('autor_nome' in d) = 0 then
    d := replace(d,
      E'  SELECT COALESCE(jsonb_agg(to_jsonb(m)), ''[]''::jsonb) INTO memorias\n  FROM public.diario_entradas m WHERE m.personagem_id = p_personagem_id AND m.tipo = ''memoria'';',
      E'  -- Amigos (17/11/2026): as minhas memórias e as que meus amigos compartilharam.\n' ||
      E'  SELECT COALESCE(jsonb_agg(to_jsonb(m) || jsonb_build_object(''autor_id'', m.personagem_id, ''autor_nome'', pa.nome)), ''[]''::jsonb) INTO memorias\n' ||
      E'  FROM public.diario_entradas m JOIN public.personagens pa ON pa.id = m.personagem_id\n' ||
      E'  WHERE m.tipo = ''memoria''\n' ||
      E'    AND (m.personagem_id = p_personagem_id\n' ||
      E'         OR (m.compartilhado AND public.pj_amigos(p_personagem_id, m.personagem_id)));');
    if position('autor_nome' in d) = 0 then raise exception 'listar_diario_disponivel: ponto de enxerto não encontrado'; end if;
    execute d;
  end if;

  d := pg_get_functiondef('public.listar_diario_lore(bigint)'::regprocedure);
  if position('pj_amigos' in d) = 0 then
    d := replace(d, 'OR n.compartilhado = true)', 'OR (n.compartilhado = true AND public.pj_amigos(p_personagem_id, n.criado_por_personagem_id)))');
    d := replace(d, 'OR r.compartilhado = true)', 'OR (r.compartilhado = true AND public.pj_amigos(p_personagem_id, r.criado_por_personagem_id)))');
    d := replace(d, 'OR c.compartilhado = true)', 'OR (c.compartilhado = true AND public.pj_amigos(p_personagem_id, c.criado_por_personagem_id)))');
    d := replace(d, 'OR l.compartilhado = true)', 'OR (l.compartilhado = true AND public.pj_amigos(p_personagem_id, l.criado_por_personagem_id)))');
    if (length(d) - length(replace(d, 'pj_amigos', ''))) / length('pj_amigos') <> 4 then
      raise exception 'listar_diario_lore: pontos de enxerto não encontrados';
    end if;
    execute d;
  end if;
end
$do$;
