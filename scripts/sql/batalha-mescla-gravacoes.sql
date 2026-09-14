-- scripts/sql/batalha-mescla-gravacoes.sql
-- ============================================================
-- Gravações da batalha MESCLAM em vez de sobrescrever.
--
-- POR QUE. "O status envenenado não está mostrando. Não persiste." (usuário,
-- 13/09/2026). Mestre e jogadores gravavam a LISTA INTEIRA de participantes
-- (e o log inteiro) a partir do que cada tela tinha — vence a última
-- gravação. Se o Mestre aplicava Envenenado e, antes de a tela de um jogador
-- receber a mudança, esse jogador agia, a gravação do jogador apagava o
-- veneno. Idem dano, estados e efeitos, nos dois sentidos. Na batalha 96 um
-- Haalin ficou com DOIS Envenenado: o primeiro sumiu da tela, o Mestre aplicou
-- de novo, e o primeiro voltou.
--
-- COMO. A tela manda a lista que TINHA (base) e a lista NOVA. O banco, com a
-- linha travada (FOR UPDATE), aplica só o que aquela tela mudou:
--   participantes  por participante (inst_id) e por campo: campo que a tela
--                  mudou (novo ≠ base) vai; campo que ela não mexeu fica como
--                  está no banco. Participante que a tela removeu sai; o que
--                  outro acrescentou fica.
--   log            entra só o que a tela acrescentou (entradas de `novo` que
--                  não estão na `base`), no fim do log atual, sem duplicar.
-- Sem base (cliente antigo), vale o comportamento anterior: sobrescreve.
--
-- RPCs:
--   atualizar_batalha_jogador  ganha p_base_participantes e p_base_log
--                              (opcionais). A assinatura antiga sai: com as
--                              duas convivendo, a chamada com 4 argumentos
--                              ficaria ambígua.
--   atualizar_batalha_mestre   nova — o Mestre gravava direto na tabela.
--
-- REVERSÍVEL: recriar atualizar_batalha_jogador com 4 parâmetros (definição
-- anterior em pg_get_functiondef do backup) e dropar as funções novas.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public._batalha_chave_participante(p jsonb)
 RETURNS text LANGUAGE sql IMMUTABLE
 SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT coalesce(nullif(p->>'inst_id', ''), (p->>'tipo') || ':' || (p->>'ref_id'))
$$;

CREATE OR REPLACE FUNCTION public.batalha_mesclar_participantes(p_atual jsonb, p_base jsonb, p_novo jsonb)
 RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
 SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_out    jsonb := '[]'::jsonb;
  v_novo   jsonb;
  v_base   jsonb;
  v_atual  jsonb;
  v_chave  text;
  v_k      text;
  v_merged jsonb;
  v_vistos text[] := '{}';
BEGIN
  IF p_novo IS NULL THEN RETURN p_atual; END IF;
  IF p_base IS NULL OR p_atual IS NULL THEN RETURN p_novo; END IF;

  FOR v_novo IN SELECT value FROM jsonb_array_elements(p_novo) LOOP
    v_chave := _batalha_chave_participante(v_novo);
    v_vistos := v_vistos || v_chave;
    SELECT value INTO v_base  FROM jsonb_array_elements(p_base)  WHERE _batalha_chave_participante(value) = v_chave LIMIT 1;
    SELECT value INTO v_atual FROM jsonb_array_elements(p_atual) WHERE _batalha_chave_participante(value) = v_chave LIMIT 1;

    IF v_base IS NULL THEN
      v_out := v_out || jsonb_build_array(v_novo);          -- a tela acrescentou
    ELSIF v_atual IS NULL THEN
      CONTINUE;                                             -- outro removeu
    ELSE
      v_merged := v_atual;
      FOR v_k IN SELECT jsonb_object_keys(v_novo) UNION SELECT jsonb_object_keys(v_base) LOOP
        IF (v_novo -> v_k) IS DISTINCT FROM (v_base -> v_k) THEN
          IF v_novo ? v_k THEN v_merged := jsonb_set(v_merged, ARRAY[v_k], v_novo -> v_k, true);
          ELSE v_merged := v_merged - v_k; END IF;
        END IF;
      END LOOP;
      v_out := v_out || jsonb_build_array(v_merged);
    END IF;
  END LOOP;

  -- Quem está no banco e a tela não mandou: se estava na base, a tela removeu;
  -- se não estava, outro acrescentou — fica.
  FOR v_atual IN SELECT value FROM jsonb_array_elements(p_atual) LOOP
    v_chave := _batalha_chave_participante(v_atual);
    IF v_chave = ANY (v_vistos) THEN CONTINUE; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_base) b WHERE _batalha_chave_participante(b.value) = v_chave) THEN
      CONTINUE;
    END IF;
    v_out := v_out || jsonb_build_array(v_atual);
  END LOOP;

  RETURN v_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.batalha_mesclar_log(p_atual jsonb, p_base jsonb, p_novo jsonb)
 RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
 SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_out jsonb;
  v_e   jsonb;
BEGIN
  IF p_novo IS NULL THEN RETURN p_atual; END IF;
  IF p_base IS NULL OR p_atual IS NULL THEN RETURN p_novo; END IF;
  v_out := p_atual;
  FOR v_e IN SELECT value FROM jsonb_array_elements(p_novo) LOOP
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_base) b WHERE b.value = v_e)
       AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_out) a WHERE a.value = v_e) THEN
      v_out := v_out || jsonb_build_array(v_e);
    END IF;
  END LOOP;
  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION public._batalha_chave_participante(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.batalha_mesclar_participantes(jsonb, jsonb, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.batalha_mesclar_log(jsonb, jsonb, jsonb) FROM PUBLIC, anon;

DROP FUNCTION IF EXISTS public.atualizar_batalha_jogador(bigint, jsonb, jsonb, integer);

CREATE OR REPLACE FUNCTION public.atualizar_batalha_jogador(
  p_batalha_id bigint, p_participantes jsonb, p_log jsonb DEFAULT NULL::jsonb, p_rodada integer DEFAULT NULL::integer,
  p_base_participantes jsonb DEFAULT NULL::jsonb, p_base_log jsonb DEFAULT NULL::jsonb)
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
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  end if;

  -- FOR UPDATE: duas gravações ao mesmo tempo mesclam em fila (13/09/2026).
  select * into v_bat from public.batalhas where id = p_batalha_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'batalha_nao_encontrada');
  end if;
  if v_bat.estado <> 'ativa' then
    return jsonb_build_object('ok', false, 'motivo', 'batalha_nao_ativa');
  end if;

  -- Garante que quem chama tem um PJ participante
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

  -- 1) Grava snapshot na batalha — MESCLADO com o que mudou desde a base.
  v_parts := public.batalha_mesclar_participantes(v_bat.participantes, p_base_participantes, p_participantes);
  update public.batalhas
     set participantes = v_parts,
         log    = public.batalha_mesclar_log(log, p_base_log, coalesce(p_log, log)),
         rodada = coalesce(p_rodada, rodada)
   where id = p_batalha_id;

  -- 2) Espelha EF/EH/AR/KA de cada PJ em historias.personagens_pools
  --    (mesma regra do Mestre em finalizarEncerramento).
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

GRANT EXECUTE ON FUNCTION public.atualizar_batalha_jogador(bigint, jsonb, jsonb, integer, jsonb, jsonb) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.atualizar_batalha_jogador(bigint, jsonb, jsonb, integer, jsonb, jsonb) FROM PUBLIC, anon;

-- Mestre: participantes/log mesclados; os demais campos (estado, rodada,
-- rolagem_pendente, visibilidade) vão como vierem em p_extras.
CREATE OR REPLACE FUNCTION public.atualizar_batalha_mestre(
  p_batalha_id bigint, p_participantes jsonb, p_base_participantes jsonb,
  p_log jsonb DEFAULT NULL::jsonb, p_base_log jsonb DEFAULT NULL::jsonb, p_extras jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_bat public.batalhas%rowtype;
  v_ex  jsonb := coalesce(p_extras, '{}'::jsonb);
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  end if;
  select * into v_bat from public.batalhas where id = p_batalha_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'batalha_nao_encontrada');
  end if;
  if v_bat.mestre_id is distinct from v_uid then
    return jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  end if;

  update public.batalhas
     set participantes = public.batalha_mesclar_participantes(participantes, p_base_participantes, p_participantes),
         log           = public.batalha_mesclar_log(log, p_base_log, p_log),
         estado        = case when v_ex ? 'estado' then v_ex->>'estado' else estado end,
         rodada        = case when v_ex ? 'rodada' then (v_ex->>'rodada')::integer else rodada end,
         rolagem_pendente = case when v_ex ? 'rolagem_pendente'
                                 then nullif(v_ex->'rolagem_pendente', 'null'::jsonb) else rolagem_pendente end,
         visibilidade  = case when v_ex ? 'visibilidade' then v_ex->>'visibilidade' else visibilidade end
   where id = p_batalha_id;

  return jsonb_build_object('ok', true);
end;
$function$;

GRANT EXECUTE ON FUNCTION public.atualizar_batalha_mestre(bigint, jsonb, jsonb, jsonb, jsonb, jsonb) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.atualizar_batalha_mestre(bigint, jsonb, jsonb, jsonb, jsonb, jsonb) FROM PUBLIC, anon;

-- ── Refinamento (aplicado como migração batalha_mescla_listas_de_status) ──
-- Listas dentro do participante (status_temp, tecnicas_usadas) mesclam ITEM a
-- ITEM: sai o que a tela removeu, entra o que ela acrescentou, e fica o que
-- outro acrescentou no meio-tempo (o Envenenado do Mestre, mesmo que o
-- jogador tenha posto Posicionamento no mesmo alvo). Item alterado (ex.:
-- rodadas_rest que desceu) conta como removido + acrescentado.
CREATE OR REPLACE FUNCTION public._batalha_mesclar_lista(p_atual jsonb, p_base jsonb, p_novo jsonb)
 RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
 SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_out jsonb := '[]'::jsonb;
  v_e   jsonb;
BEGIN
  IF jsonb_typeof(p_novo) IS DISTINCT FROM 'array' THEN RETURN p_novo; END IF;
  IF jsonb_typeof(p_base) IS DISTINCT FROM 'array' OR jsonb_typeof(p_atual) IS DISTINCT FROM 'array' THEN RETURN p_novo; END IF;
  FOR v_e IN SELECT value FROM jsonb_array_elements(p_atual) LOOP
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_base) b WHERE b.value = v_e)
       AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_novo) n WHERE n.value = v_e) THEN
      CONTINUE;
    END IF;
    v_out := v_out || jsonb_build_array(v_e);
  END LOOP;
  FOR v_e IN SELECT value FROM jsonb_array_elements(p_novo) LOOP
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_base) b WHERE b.value = v_e)
       AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_out) o WHERE o.value = v_e) THEN
      v_out := v_out || jsonb_build_array(v_e);
    END IF;
  END LOOP;
  RETURN v_out;
END;
$$;
REVOKE ALL ON FUNCTION public._batalha_mesclar_lista(jsonb, jsonb, jsonb) FROM PUBLIC, anon;
-- (batalha_mesclar_participantes foi recriada chamando _batalha_mesclar_lista
--  para as chaves 'status_temp' e 'tecnicas_usadas' — ver pg_get_functiondef.)

COMMIT;
