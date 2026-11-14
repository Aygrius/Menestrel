-- ============================================================
-- saque-so-na-pilha-comum-2026-11-14.sql — revisão da auditoria 13/11/2026
-- ============================================================
-- O saque pela RPC saquear_criatura somava na primeira pilha solta do mesmo
-- slug, mesmo quando ela tinha estado próprio: a espada quebrada, a gasta
-- (`res`), a untada (`veneno`), a consagrada (`bonus`), a fabricada, a com
-- nome (`apelido`), a ferramenta com `usos` contados ou a montaria (`montado`).
-- A peça saqueada herdava esse estado. É a mesma regra de adicionarAoInventario
-- (01-core/inventario-helpers.jsx, item 33): só soma na pilha COMUM da mochila.
-- Só o laço que escolhe a pilha muda; o resto é a função de
-- colunas-do-mestre-e-saque-por-rpc-2026-11-14.sql. Idempotente.
-- ============================================================

CREATE OR REPLACE FUNCTION public.saquear_criatura(
  p_batalha_id bigint, p_pj_id bigint, p_alvo_inst_id text, p_slug text, p_qtd integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_catalog' AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_bat     public.batalhas%ROWTYPE;
  v_parts   jsonb;
  v_sq      jsonb;
  v_alvo    jsonb;
  v_alvo_ix integer;
  v_dono    uuid;
  v_mestre  uuid;
  v_cat     public.itens%ROWTYPE;
  v_total   numeric;
  v_tirado  numeric;
  v_dist    integer;
  v_inv     jsonb;
  v_itens   jsonb;
  v_ix      integer := -1;
  v_it      jsonb;
  v_i       integer;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao'); END IF;
  IF p_qtd IS NULL OR p_qtd < 1 THEN RETURN jsonb_build_object('ok', false, 'motivo', 'quantidade_invalida'); END IF;

  SELECT * INTO v_bat FROM public.batalhas WHERE id = p_batalha_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'motivo', 'batalha_nao_encontrada'); END IF;
  IF v_bat.estado <> 'ativa' THEN RETURN jsonb_build_object('ok', false, 'motivo', 'batalha_nao_ativa'); END IF;
  -- No treino nada vai ao banco: a tela resolve o saque no cache dela.
  IF COALESCE(v_bat.treinamento, false) THEN RETURN jsonb_build_object('ok', false, 'motivo', 'treino'); END IF;

  SELECT user_id INTO v_dono FROM public.personagens WHERE id = p_pj_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'motivo', 'pj_nao_encontrado'); END IF;
  SELECT mestre_id INTO v_mestre FROM public.historias WHERE id = v_bat.historia_id;
  IF v_dono IS DISTINCT FROM v_uid AND v_mestre IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;

  v_parts := COALESCE(v_bat.participantes, '[]'::jsonb);
  SELECT value INTO v_sq FROM jsonb_array_elements(v_parts)
   WHERE value->>'tipo' = 'pj' AND value->>'ref_id' = p_pj_id::text LIMIT 1;
  SELECT value, (ord - 1)::int INTO v_alvo, v_alvo_ix
    FROM jsonb_array_elements(v_parts) WITH ORDINALITY AS x(value, ord)
   WHERE value->>'inst_id' = p_alvo_inst_id LIMIT 1;

  -- podeSaquear (12-batalha/batalha.jsx).
  IF v_sq IS NULL OR v_alvo IS NULL OR v_alvo->>'tipo' IS DISTINCT FROM 'criatura'
     OR public._menestrel_js_verdade(v_alvo->'ficha_invocada')
     OR COALESCE(NULLIF(v_sq->>'status', ''), 'ativo') <> 'ativo'
     OR public._menestrel_js_verdade(v_sq->'ausente') OR public._menestrel_js_verdade(v_sq->'fugiu')
     OR NOT public._menestrel_js_verdade(v_sq->'atual')
     OR COALESCE(NULLIF(v_alvo->>'status', ''), 'ativo') NOT IN ('morto', 'desmaiado')
     OR public._menestrel_js_verdade(v_alvo->'ausente') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_pode_saquear');
  END IF;
  v_dist := public._menestrel_distancia_tabuleiro(v_sq, v_alvo);
  IF v_dist IS NOT NULL AND v_dist > 1 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_pode_saquear');
  END IF;

  SELECT * INTO v_cat FROM public.itens WHERE slug = p_slug;
  IF NOT FOUND OR COALESCE(v_cat.grupo_armas, '') = 'Livre' THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'item_nao_saqueavel');
  END IF;

  -- saqueDisponivel (09-bestiario/criatura-formulas.jsx): a mochila conta a
  -- quantidade; o resto conta um.
  SELECT COALESCE(sum(CASE WHEN e->>'slot' = 'mochila'
                           THEN GREATEST(1, COALESCE(trunc(CASE WHEN jsonb_typeof(e->'qtd') = 'number'
                                                                THEN (e->>'qtd')::numeric END), 1))
                           ELSE 1 END), 0)
    INTO v_total
    FROM public.criaturas c,
         jsonb_array_elements(CASE WHEN jsonb_typeof(c.equipamento) = 'array' THEN c.equipamento ELSE '[]'::jsonb END) e
   WHERE c.id = (v_alvo->>'ref_id')::bigint AND e->>'slug' = p_slug;
  v_tirado := COALESCE(CASE WHEN jsonb_typeof(v_alvo->'saqueado'->p_slug) = 'number'
                            THEN (v_alvo->'saqueado'->>p_slug)::numeric END, 0);
  IF v_total - v_tirado < p_qtd THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'saque_esgotado', 'resta', GREATEST(0, v_total - v_tirado));
  END IF;

  -- adicionarAoInventario (01-core/inventario-helpers.jsx): soma na pilha
  -- solta igual — fora de recipiente, slot, corpo, loja e animal — ou cria.
  SELECT COALESCE(inventario, '{"itens":[]}'::jsonb) INTO v_inv
    FROM public.personagens WHERE id = p_pj_id FOR UPDATE;
  v_itens := CASE WHEN jsonb_typeof(v_inv->'itens') = 'array' THEN v_inv->'itens' ELSE '[]'::jsonb END;
  FOR v_i IN 0 .. jsonb_array_length(v_itens) - 1 LOOP
    v_it := v_itens->v_i;
    IF v_it->>'slug' = p_slug
       AND NOT public._menestrel_js_verdade(v_it->'containerId')
       AND NOT public._menestrel_js_verdade(v_it->'slot')
       AND NOT public._menestrel_js_verdade(v_it->'equipado')
       AND NOT public._menestrel_js_verdade(v_it->'vestido')
       AND NOT public._menestrel_js_verdade(v_it->'anuncio_id')
       AND NOT public._menestrel_js_verdade(v_it->'animal_id')
       -- Sem estado próprio (revisão de 14/11/2026): o saque não herda quebra, desgaste, veneno…
       AND NOT public._menestrel_js_verdade(v_it->'montado')
       AND NOT public._menestrel_js_verdade(v_it->'apelido')
       AND NOT public._menestrel_js_verdade(v_it->'fabricado')
       AND NOT public._menestrel_js_verdade(v_it->'quebrada')
       AND NOT public._menestrel_js_verdade(v_it->'veneno')
       AND NOT public._menestrel_js_verdade(v_it->'bonus')
       AND COALESCE(jsonb_typeof(v_it->'usos'), 'null') = 'null'
       AND COALESCE(jsonb_typeof(v_it->'res'), 'null') = 'null' THEN
      v_ix := v_i; EXIT;
    END IF;
  END LOOP;
  IF v_ix >= 0 THEN
    v_itens := jsonb_set(v_itens, ARRAY[v_ix::text, 'quantidade'],
      to_jsonb(COALESCE(CASE WHEN jsonb_typeof(v_itens->v_ix->'quantidade') = 'number'
                             THEN (v_itens->v_ix->>'quantidade')::numeric END, 0) + p_qtd));
  ELSE
    v_itens := v_itens || jsonb_build_array(jsonb_build_object(
      'instanceId', (extract(epoch FROM clock_timestamp()) * 1000)::bigint::text
                    || '-' || substr(md5(random()::text), 1, 6),
      'slug', p_slug, 'quantidade', p_qtd, 'equipado', false,
      'slot', NULL, 'containerId', NULL, 'observacao', NULL));
  END IF;
  UPDATE public.personagens SET inventario = jsonb_set(v_inv, '{itens}', v_itens) WHERE id = p_pj_id;

  -- anotarSaque: o que saiu fica NA INSTÂNCIA, na mesma transação.
  v_parts := jsonb_set(v_parts, ARRAY[v_alvo_ix::text, 'saqueado'],
    COALESCE(CASE WHEN jsonb_typeof(v_alvo->'saqueado') = 'object' THEN v_alvo->'saqueado' END, '{}'::jsonb)
      || jsonb_build_object(p_slug, v_tirado + p_qtd), true);
  UPDATE public.batalhas SET participantes = v_parts WHERE id = p_batalha_id;

  RETURN jsonb_build_object('ok', true, 'saqueado', v_parts->v_alvo_ix->'saqueado');
END $$;

REVOKE EXECUTE ON FUNCTION public.saquear_criatura(bigint, bigint, text, text, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.saquear_criatura(bigint, bigint, text, text, integer) TO authenticated, service_role;
