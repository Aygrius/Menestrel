-- ============================================================================
-- PACTO DE AMIZADE entre personagens (28/09/2026)
--
-- "vamos adicionar botões com o avatar dos outros personagens de jogadores à
--  esquerda, mas só vai aparecer dos personagens que fizeram um pacto de
--  amizade [...] para transferir um item para um amigo, só precisa arrastar o
--  item do inventário para o card do amigo" (usuário)
--
-- Um pacto é um PAR de personagens (pj_a < pj_b, uma linha por par). Um lado
-- propõe (proposto_por); o pacto só vale quando o outro aceita (selado).
-- A tabela não tem policy: tudo passa pelas RPCs SECURITY DEFINER abaixo, que
-- conferem o dono do personagem.
--
-- transfer_item passa a exigir o pacto selado quando quem transfere é o DONO
-- do personagem. O Mestre da história continua podendo transferir.
-- ============================================================================

create table if not exists public.pactos_amizade (
  pj_a         bigint not null references public.personagens(id) on delete cascade,
  pj_b         bigint not null references public.personagens(id) on delete cascade,
  proposto_por bigint not null references public.personagens(id) on delete cascade,
  selado       boolean not null default false,
  created_at   timestamptz not null default now(),
  selado_em    timestamptz,
  primary key (pj_a, pj_b),
  constraint pactos_amizade_ordem_chk check (pj_a < pj_b),
  constraint pactos_amizade_proponente_chk check (proposto_por in (pj_a, pj_b))
);
-- A PK cobre buscas por pj_a; esta cobre as por pj_b.
create index if not exists pactos_amizade_pj_b_idx on public.pactos_amizade (pj_b);

alter table public.pactos_amizade enable row level security;
revoke all on public.pactos_amizade from anon, authenticated;

-- Dono do personagem?
create or replace function public.pacto_eh_dono(p_pj_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.personagens where id = p_pj_id and user_id = auth.uid());
$$;

-- Os dois estão na mesma história?
create or replace function public.pacto_mesma_historia(p_x bigint, p_y bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.historias h
                  where p_x = any (h.protagonista_ids) and p_y = any (h.protagonista_ids));
$$;

-- ── listar_amizades: os outros PJs da história e o estado do pacto ──────────
-- estado: 'nenhum' | 'enviado' (eu propus) | 'recebido' (o outro propôs) | 'selado'
create or replace function public.listar_amizades(p_pj_id bigint)
returns table (id bigint, nome text, sobrenome text, foto_url text, estado text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pacto_eh_dono(p_pj_id) then return; end if;
  return query
  select p.id, p.nome, p.sobrenome, p.foto_url,
         case
           when pa.pj_a is null then 'nenhum'
           when pa.selado then 'selado'
           when pa.proposto_por = p_pj_id then 'enviado'
           else 'recebido'
         end
    from public.personagens p
    left join public.pactos_amizade pa
      on pa.pj_a = least(p.id, p_pj_id) and pa.pj_b = greatest(p.id, p_pj_id)
   where p.id <> p_pj_id
     and p.id in (select unnest(h.protagonista_ids) from public.historias h
                   where p_pj_id = any (h.protagonista_ids))
   order by p.nome;
end;
$$;

-- ── propor_pacto: propõe; se o outro já tinha proposto, sela ────────────────
create or replace function public.propor_pacto(p_pj_id bigint, p_outro_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_a bigint := least(p_pj_id, p_outro_id);
  v_b bigint := greatest(p_pj_id, p_outro_id);
  v_row public.pactos_amizade;
begin
  if not public.pacto_eh_dono(p_pj_id) then
    return jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  end if;
  if p_pj_id = p_outro_id then
    return jsonb_build_object('ok', false, 'motivo', 'mesmo_personagem');
  end if;
  if not public.pacto_mesma_historia(p_pj_id, p_outro_id) then
    return jsonb_build_object('ok', false, 'motivo', 'aventura_diferente');
  end if;

  select * into v_row from public.pactos_amizade where pj_a = v_a and pj_b = v_b for update;
  if not found then
    insert into public.pactos_amizade (pj_a, pj_b, proposto_por) values (v_a, v_b, p_pj_id);
    return jsonb_build_object('ok', true, 'estado', 'enviado');
  end if;
  if v_row.selado then
    return jsonb_build_object('ok', true, 'estado', 'selado');
  end if;
  if v_row.proposto_por = p_pj_id then
    return jsonb_build_object('ok', true, 'estado', 'enviado');
  end if;
  update public.pactos_amizade set selado = true, selado_em = now()
   where pj_a = v_a and pj_b = v_b;
  return jsonb_build_object('ok', true, 'estado', 'selado');
end;
$$;

-- ── desfazer_pacto: recusa, cancela a proposta ou rompe o pacto ─────────────
create or replace function public.desfazer_pacto(p_pj_id bigint, p_outro_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.pacto_eh_dono(p_pj_id) then
    return jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  end if;
  delete from public.pactos_amizade
   where pj_a = least(p_pj_id, p_outro_id) and pj_b = greatest(p_pj_id, p_outro_id);
  return jsonb_build_object('ok', true, 'estado', 'nenhum');
end;
$$;

revoke all on function public.pacto_eh_dono(bigint), public.pacto_mesma_historia(bigint, bigint) from public, anon, authenticated;
revoke all on function public.listar_amizades(bigint), public.propor_pacto(bigint, bigint), public.desfazer_pacto(bigint, bigint) from public, anon;
grant execute on function public.listar_amizades(bigint), public.propor_pacto(bigint, bigint), public.desfazer_pacto(bigint, bigint) to authenticated;

-- ── transfer_item: o dono só entrega a quem tem pacto selado ────────────────
-- Enxerta a checagem logo antes de travar os inventários, sem reescrever o
-- resto da função (a versão atual vem de transfer-item-com-conteudo.sql).
-- O Mestre da história segue livre. Idempotente: só aplica uma vez.
do $do$
declare d text;
begin
  d := pg_get_functiondef('public.transfer_item(bigint,bigint,text,jsonb,bigint)'::regprocedure);
  if position('sem_pacto' in d) = 0 then
    d := replace(d,
      E'  SELECT inventario INTO v_from_inv FROM public.personagens WHERE id = p_from_pj_id FOR UPDATE;',
      E'  -- Pacto de amizade (28/09/2026): o dono só entrega a um amigo.\n' ||
      E'  IF NOT EXISTS (\n' ||
      E'       SELECT 1 FROM public.historias h\n' ||
      E'        WHERE h.mestre_id = v_uid\n' ||
      E'          AND p_from_pj_id = ANY (h.protagonista_ids)\n' ||
      E'          AND p_to_pj_id   = ANY (h.protagonista_ids))\n' ||
      E'     AND NOT EXISTS (\n' ||
      E'       SELECT 1 FROM public.pactos_amizade pa\n' ||
      E'        WHERE pa.pj_a = LEAST(p_from_pj_id, p_to_pj_id)\n' ||
      E'          AND pa.pj_b = GREATEST(p_from_pj_id, p_to_pj_id)\n' ||
      E'          AND pa.selado) THEN\n' ||
      E'    RETURN jsonb_build_object(''ok'', false, ''motivo'', ''sem_pacto'');\n' ||
      E'  END IF;\n\n' ||
      E'  SELECT inventario INTO v_from_inv FROM public.personagens WHERE id = p_from_pj_id FOR UPDATE;');
    if position('sem_pacto' in d) = 0 then
      raise exception 'transfer_item: ponto de enxerto não encontrado';
    end if;
    execute d;
  end if;
end
$do$;
