-- AUDITORIA 13/11/2026, item 4 (docs/auditoria-batalha-inventario-2026-11-13.md).
-- atualizar_batalha_jogador só conferia que o usuário tem PJ na batalha:
-- gravava fora da vez, com a cortina aguardando o Mestre, e base nula
-- (p_base_participantes / p_base_log) SUBSTITUÍA a lista inteira e o log.
--
-- Decisão do usuário (13/11/2026): travar a ESCRITA do jogador.
--   • VEZ: o participante `atual` no banco tem de ser um PJ do usuário ou o
--     animal de um PJ dele (dono_pj) — a mesma regra de ehMinhaVez /
--     vezDoMeuAnimal (12-batalha/batalha.jsx). Toda gravação da tela do
--     jogador nasce no painel de ação, no mover ou no saque, que só abrem na vez.
--   • CORTINA: se cortina.vez não é a vez atual ("rodada:chave"), o Mestre
--     ainda não revelou — ninguém age (MotorCortina.cortinaAguardando,
--     12-batalha/efeitos-da-vez.jsx).
--   • BASE: participantes sem base, ou log sem base, é recusado — a mescla
--     de três vias é obrigatória.
--   • RODADA: só fica ou vira uma (a virada de quem passa a vez por último).
-- Que participantes ele muda segue livre: o motor do combate roda na tela
-- do jogador e grava o dano no alvo e a vez de todos. A leitura com a
-- cortina no servidor é o item 5, adiado.
-- Idempotente.

CREATE OR REPLACE FUNCTION public.atualizar_batalha_jogador(
  p_batalha_id bigint, p_participantes jsonb, p_log jsonb DEFAULT NULL::jsonb,
  p_rodada integer DEFAULT NULL::integer, p_base_participantes jsonb DEFAULT NULL::jsonb,
  p_base_log jsonb DEFAULT NULL::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_uid        uuid := auth.uid();
  v_bat        public.batalhas%rowtype;
  v_participa  boolean;
  v_hist_id    bigint;
  v_pools_now  jsonb;
  v_pools_new  jsonb;
  v_pj         jsonb;
  v_ref_id     text;
  v_parts      jsonb;
  v_atual      jsonb;
  v_meus       text[];
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  end if;

  select * into v_bat from public.batalhas where id = p_batalha_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'batalha_nao_encontrada');
  end if;
  if v_bat.estado <> 'ativa' then
    return jsonb_build_object('ok', false, 'motivo', 'batalha_nao_ativa');
  end if;

  select exists (
    select 1
    from jsonb_array_elements(coalesce(v_bat.participantes, '[]'::jsonb)) as part
    join public.personagens pc on pc.user_id = v_uid
    where part->>'tipo' = 'pj'
      and part->>'ref_id' = pc.id::text
  ) into v_participa;
  if not v_participa then
    return jsonb_build_object('ok', false, 'motivo', 'nao_participante');
  end if;

  -- Base obrigatória: sem ela, a mescla vira substituição.
  if (p_participantes is not null and p_base_participantes is null)
     or (p_log is not null and p_base_log is null) then
    return jsonb_build_object('ok', false, 'motivo', 'sem_base');
  end if;

  -- A vez: o `atual` do banco é meu PJ ou o animal de um PJ meu.
  select array_agg(pc.id::text) into v_meus from public.personagens pc where pc.user_id = v_uid;
  select value into v_atual
    from jsonb_array_elements(coalesce(v_bat.participantes, '[]'::jsonb))
   where public._menestrel_js_verdade(value->'atual')
   limit 1;
  -- coalesce: sem dono_pj, a comparação dá NULL, e NOT NULL deixaria passar.
  if v_atual is null
     or not coalesce((v_atual->>'tipo' = 'pj' and v_atual->>'ref_id' = any (v_meus))
                     or (v_atual->>'tipo' = 'criatura' and v_atual->>'dono_pj' = any (v_meus)), false) then
    return jsonb_build_object('ok', false, 'motivo', 'nao_e_sua_vez');
  end if;

  -- A cortina: vez trocada e ainda não revelada pelo Mestre.
  if nullif(v_bat.cortina->>'vez', '') is not null
     and v_bat.cortina->>'vez' <> (coalesce(v_bat.rodada, 0)::text || ':' || public._batalha_chave_participante(v_atual)) then
    return jsonb_build_object('ok', false, 'motivo', 'cortina_aguardando');
  end if;

  if p_rodada is not null and p_rodada not in (coalesce(v_bat.rodada, 0), coalesce(v_bat.rodada, 0) + 1) then
    return jsonb_build_object('ok', false, 'motivo', 'rodada_invalida');
  end if;

  v_parts := public.batalha_mesclar_participantes(v_bat.participantes, p_base_participantes, p_participantes);
  update public.batalhas
     set participantes = v_parts,
         log    = public.batalha_mesclar_log(log, p_base_log, coalesce(p_log, log)),
         rodada = coalesce(p_rodada, rodada)
   where id = p_batalha_id;

  v_hist_id := v_bat.historia_id;
  if v_hist_id is not null then
    select coalesce(personagens_pools, '{}'::jsonb)
      into v_pools_now
      from public.historias
     where id = v_hist_id;

    v_pools_new := v_pools_now;

    for v_pj in
      select value from jsonb_array_elements(v_parts)
      where value->>'tipo' = 'pj'
    loop
      v_ref_id := v_pj->>'ref_id';
      if (v_pj->>'status') = 'morto' then
        v_pools_new := jsonb_set(v_pools_new, array[v_ref_id],
          jsonb_build_object(
            'ef', 0, 'eh', 0,
            'ar',    coalesce((v_pj->>'ar')::numeric,    0),
            'karma', coalesce((v_pj->>'karma')::numeric, 0)
          ), true);
      else
        v_pools_new := jsonb_set(v_pools_new, array[v_ref_id],
          jsonb_build_object(
            'ef',    coalesce((v_pj->>'ef')::numeric,    null),
            'eh',    coalesce((v_pj->>'eh')::numeric,    null),
            'ar',    coalesce((v_pj->>'ar')::numeric,    null),
            'karma', coalesce((v_pj->>'karma')::numeric, null)
          ), true);
      end if;
    end loop;

    update public.historias
       set personagens_pools = v_pools_new
     where id = v_hist_id;
  end if;

  return jsonb_build_object('ok', true);
end;
$function$;

-- Só quem está logado (era executável por anon; a função já recusava sem uid).
REVOKE EXECUTE ON FUNCTION public.atualizar_batalha_jogador(bigint, jsonb, jsonb, integer, jsonb, jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.atualizar_batalha_jogador(bigint, jsonb, jsonb, integer, jsonb, jsonb) TO authenticated;
