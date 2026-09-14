-- scripts/sql/transfer-item-com-conteudo.sql
-- ============================================================
-- Transferir um RECIPIENTE leva junto o que está dentro dele.
--
-- POR QUE. Pedido do usuário (13/09/2026): "Ao transferir um item que tenha
-- itens dentro, os itens dentro também são transferidos."
--
-- Antes só a instância do recipiente mudava de personagem. Os itens de dentro
-- ficavam na origem com `containerId` apontando para um recipiente que não
-- existia mais — sumiam da tela (a lista principal esconde item guardado) e
-- continuavam pesando na carga.
--
-- O QUE MUDA (só o ramo de recipiente — itens.armazena > 0):
--   • o recipiente é indivisível, como o equipável: vai inteiro, com novo
--     instanceId, nunca empilha no destino (empilhar juntaria o conteúdo de
--     dois recipientes num só) e sai solto (sem equipado/slot/vestido);
--   • cada item com containerId = recipiente sai da origem e entra no
--     destino com novo instanceId e containerId = o novo id do recipiente.
-- O resto (travas de aventura/permissão, moedas, empilhar, parcial) é o de
-- scripts/sql/transfer-item-mesma-aventura.sql, sem mudança.
--
-- PERMISSÕES: iguais — EXECUTE só para authenticated e service_role.
-- REVERSÍVEL: reaplicar scripts/sql/transfer-item-mesma-aventura.sql.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.transfer_item(p_from_pj_id bigint, p_to_pj_id bigint, p_instance_id text, p_moedas jsonb DEFAULT NULL::jsonb, p_quantidade bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_uid        uuid := auth.uid();
  v_from_inv   jsonb;
  v_to_inv     jsonb;
  v_instance   jsonb;
  v_itens_from jsonb;
  v_itens_to   jsonb;
  v_new_id     text;
  v_grupo      text;
  v_equipavel  boolean;
  v_recipiente boolean;
  v_qtd_total  bigint;
  v_qtd_transf bigint;
  v_parcial    boolean;
  v_stack_idx  int;
  v_i          int;
  v_it         jsonb;
  v_to_dep     jsonb;
  v_sufixo     text := '-t' || floor(extract(epoch FROM now()))::text;
  v_filhos     jsonb;
BEGIN
  -- ── Travas (12/09/2026) ────────────────────────────────────────────────
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;
  IF p_from_pj_id = p_to_pj_id THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'mesmo_personagem');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.historias h
     WHERE p_from_pj_id = ANY (h.protagonista_ids)
       AND p_to_pj_id   = ANY (h.protagonista_ids)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'aventura_diferente');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.personagens WHERE id = p_from_pj_id AND user_id = v_uid)
     AND NOT EXISTS (
       SELECT 1 FROM public.historias h
        WHERE h.mestre_id = v_uid
          AND p_from_pj_id = ANY (h.protagonista_ids)
          AND p_to_pj_id   = ANY (h.protagonista_ids)
     ) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;

  SELECT inventario INTO v_from_inv FROM public.personagens WHERE id = p_from_pj_id FOR UPDATE;
  SELECT inventario INTO v_to_inv   FROM public.personagens WHERE id = p_to_pj_id   FOR UPDATE;

  IF v_from_inv IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'remetente_sem_inventario');
  END IF;
  IF v_to_inv IS NULL THEN
    v_to_inv := '{"itens":[]}'::jsonb;
  END IF;

  SELECT elem INTO v_instance
  FROM jsonb_array_elements(v_from_inv -> 'itens') AS elem
  WHERE elem ->> 'instanceId' = p_instance_id;

  IF v_instance IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'instancia_nao_encontrada');
  END IF;

  SELECT grupo, (categoria_equip IS NOT NULL), (COALESCE(armazena, 0) > 0)
    INTO v_grupo, v_equipavel, v_recipiente
    FROM public.itens WHERE slug = v_instance->>'slug';
  v_equipavel  := COALESCE(v_equipavel, false);
  v_recipiente := COALESCE(v_recipiente, false);

  -- Quanto sai: NULL = tudo. Nunca mais que o disponível, nunca menos que 1.
  -- Equipável e recipiente ignoram o pedido — a instância é indivisível.
  v_qtd_total  := COALESCE((v_instance->>'quantidade')::bigint, 1);
  IF v_equipavel OR v_recipiente THEN
    v_qtd_transf := v_qtd_total;
  ELSE
    v_qtd_transf := LEAST(COALESCE(p_quantidade, v_qtd_total), v_qtd_total);
  END IF;
  IF v_qtd_transf < 1 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'quantidade_invalida');
  END IF;
  v_parcial := (v_qtd_transf < v_qtd_total);

  -- Conteúdo do recipiente (13/09/2026): sai junto com ele.
  v_filhos := '[]'::jsonb;
  IF v_recipiente THEN
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_filhos
      FROM jsonb_array_elements(v_from_inv -> 'itens') AS elem
     WHERE elem ->> 'containerId' = p_instance_id;
  END IF;

  -- Origem: some com a instância (e o conteúdo), ou fica com o resto da pilha.
  IF v_parcial THEN
    SELECT jsonb_agg(
             CASE WHEN elem ->> 'instanceId' = p_instance_id
                  THEN jsonb_set(elem, '{quantidade}', to_jsonb(v_qtd_total - v_qtd_transf))
                  ELSE elem END)
      INTO v_itens_from
      FROM jsonb_array_elements(v_from_inv -> 'itens') AS elem;
  ELSE
    SELECT jsonb_agg(elem) INTO v_itens_from
    FROM jsonb_array_elements(v_from_inv -> 'itens') AS elem
    WHERE elem ->> 'instanceId' <> p_instance_id
      AND (NOT v_recipiente OR (elem ->> 'containerId') IS DISTINCT FROM p_instance_id);
  END IF;
  v_from_inv := jsonb_set(v_from_inv, '{itens}', COALESCE(v_itens_from, '[]'::jsonb));

  -- ── MOEDA: deposita em bolsa do destino (barra se não couber) ─────────────
  IF v_grupo = 'Moedas' THEN
    v_to_dep := public.inv_depositar_moeda(v_to_inv, v_instance->>'slug', v_qtd_transf);
    IF v_to_dep IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'sem_bolsa_destino');
    END IF;
    v_to_inv := v_to_dep;

    UPDATE public.personagens SET inventario = v_from_inv WHERE id = p_from_pj_id;
    UPDATE public.personagens SET inventario = v_to_inv   WHERE id = p_to_pj_id;
    RETURN jsonb_build_object('ok', true, 'quantidade', v_qtd_transf);
  END IF;

  v_itens_to := COALESCE(v_to_inv -> 'itens', '[]'::jsonb);

  IF v_equipavel OR v_recipiente THEN
    v_new_id   := p_instance_id || v_sufixo;
    v_instance := jsonb_set(v_instance, '{instanceId}',  to_jsonb(v_new_id));
    v_instance := jsonb_set(v_instance, '{equipado}',    'false'::jsonb);
    v_instance := jsonb_set(v_instance, '{slot}',        'null'::jsonb);
    v_instance := jsonb_set(v_instance, '{containerId}', 'null'::jsonb);
    v_instance := jsonb_set(v_instance, '{vestido}',     'false'::jsonb);
    v_instance := jsonb_set(v_instance, '{vesteSlot}',   'null'::jsonb);
    v_itens_to := v_itens_to || jsonb_build_array(v_instance);

    -- Conteúdo: novo id para cada item, apontando para o novo recipiente.
    IF jsonb_array_length(v_filhos) > 0 THEN
      SELECT v_itens_to || COALESCE(jsonb_agg(
               jsonb_set(jsonb_set(elem, '{instanceId}', to_jsonb((elem ->> 'instanceId') || v_sufixo)),
                         '{containerId}', to_jsonb(v_new_id))), '[]'::jsonb)
        INTO v_itens_to
        FROM jsonb_array_elements(v_filhos) AS elem;
    END IF;
  ELSE
    v_stack_idx := -1;
    IF jsonb_array_length(v_itens_to) > 0 THEN
      FOR v_i IN 0 .. (jsonb_array_length(v_itens_to) - 1) LOOP
        v_it := v_itens_to->v_i;
        IF v_it->>'slug' = v_instance->>'slug'
           AND (v_it->>'containerId') IS NULL
           AND COALESCE((v_it->>'equipado')::boolean, false) = false
        THEN v_stack_idx := v_i; EXIT; END IF;
      END LOOP;
    END IF;

    IF v_stack_idx >= 0 THEN
      v_new_id := v_itens_to->v_stack_idx->>'instanceId';
      v_itens_to := jsonb_set(v_itens_to, ARRAY[v_stack_idx::text, 'quantidade'],
        to_jsonb(COALESCE((v_itens_to->v_stack_idx->>'quantidade')::bigint, 0) + v_qtd_transf));
    ELSE
      v_new_id   := p_instance_id || v_sufixo;
      v_instance := jsonb_set(v_instance, '{instanceId}',  to_jsonb(v_new_id));
      v_instance := jsonb_set(v_instance, '{quantidade}',  to_jsonb(v_qtd_transf));
      v_instance := jsonb_set(v_instance, '{equipado}',    'false'::jsonb);
      v_instance := jsonb_set(v_instance, '{slot}',        'null'::jsonb);
      v_instance := jsonb_set(v_instance, '{containerId}', 'null'::jsonb);
      v_itens_to := v_itens_to || jsonb_build_array(v_instance);
    END IF;
  END IF;

  v_to_inv := jsonb_set(v_to_inv, '{itens}', v_itens_to);

  UPDATE public.personagens SET inventario = v_from_inv WHERE id = p_from_pj_id;
  UPDATE public.personagens SET inventario = v_to_inv   WHERE id = p_to_pj_id;

  RETURN jsonb_build_object('ok', true, 'new_instance_id', v_new_id, 'quantidade', v_qtd_transf,
                            'itens_dentro', jsonb_array_length(v_filhos));
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.transfer_item(bigint, bigint, text, jsonb, bigint) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.transfer_item(bigint, bigint, text, jsonb, bigint) TO authenticated, service_role;

COMMIT;
