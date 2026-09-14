-- scripts/sql/moedas-so-em-bolsa-solida.sql
-- ============================================================
-- Moeda só entra em recipiente SÓLIDO que aceite moedas.
--
-- POR QUE. Pedido do usuário (13/09/2026): "Moedas não podem ser inseridas em
-- cantil, pois é sólido."
--
-- A tela já barra (podeMoverParaContainer: tipo S/L e tipo_item). No banco
-- havia dois furos:
--
--   inv_depositar_moeda   usada por transferência, venda negociada e ajuste
--                         do Mestre. Já pulava recipiente líquido, mas
--                         ignorava `tipo_item`: podia pôr moeda numa Aljava
--                         (só Consumíveis). Agora pula recipiente cujo
--                         tipo_item exista e não seja 'Moedas'.
--
--   vender_item           venda direta à loja (RPC antiga, a tela não chama
--                         mais, mas continua executável). Sem moeda no
--                         inventário, criava as moedas no "primeiro recipiente
--                         do inventário", fosse qual fosse — o Cantil do
--                         Aldren, por exemplo. Agora o primeiro recipiente
--                         SÓLIDO que aceite moedas.
--
-- REVERSÍVEL: recriar as duas funções a partir de pg_get_functiondef anterior
-- (o trecho trocado está citado abaixo).
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.inv_depositar_moeda(p_inv jsonb, p_slug text, p_qtd bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_itens     jsonb := COALESCE(p_inv->'itens', '[]'::jsonb);
  v_ocupa     numeric;
  v_need      bigint := p_qtd;
  v_i         int;
  v_j         int;
  v_it        jsonb;
  v_child     jsonb;
  v_c_arm     numeric;
  v_c_tipo    text;
  v_c_aceita  text;
  v_co        numeric;
  v_used      numeric;
  v_free      numeric;
  v_cap       bigint;
  v_place     bigint;
  v_stack_idx int;
  v_inst      jsonb;
BEGIN
  IF p_qtd IS NULL OR p_qtd <= 0 THEN RETURN p_inv; END IF;

  SELECT ocupa INTO v_ocupa FROM public.itens WHERE slug = p_slug;
  v_ocupa := COALESCE(v_ocupa, 0);

  IF jsonb_array_length(v_itens) > 0 THEN
    FOR v_i IN 0 .. jsonb_array_length(v_itens) - 1 LOOP
      v_it := v_itens->v_i;

      SELECT armazena, COALESCE(tipo, 'S'), NULLIF(tipo_item, '')
        INTO v_c_arm, v_c_tipo, v_c_aceita
        FROM public.itens WHERE slug = v_it->>'slug';
      IF v_c_arm IS NULL OR v_c_arm <= 0 OR v_c_tipo <> 'S' THEN
        CONTINUE;  -- só bolsa sólida
      END IF;
      -- 13/09/2026: recipiente que restringe o grupo e não aceita moedas.
      IF v_c_aceita IS NOT NULL AND v_c_aceita <> 'Moedas' THEN
        CONTINUE;
      END IF;

      -- espaço usado pelos filhos dessa bolsa
      v_used := 0;
      FOR v_j IN 0 .. jsonb_array_length(v_itens) - 1 LOOP
        v_child := v_itens->v_j;
        IF (v_child->>'containerId') = (v_it->>'instanceId') THEN
          SELECT ocupa INTO v_co FROM public.itens WHERE slug = v_child->>'slug';
          IF v_co IS NOT NULL THEN
            v_used := v_used + v_co * COALESCE((v_child->>'quantidade')::numeric, 1);
          END IF;
        END IF;
      END LOOP;

      v_free := v_c_arm * COALESCE((v_it->>'quantidade')::numeric, 1) - v_used;
      IF v_ocupa > 0 THEN
        v_cap := floor(v_free / v_ocupa);
      ELSE
        v_cap := v_need;  -- moeda sem ocupa não consome espaço
      END IF;
      IF v_cap <= 0 THEN CONTINUE; END IF;

      v_place := LEAST(v_need, v_cap);

      -- stack do mesmo slug já dentro dessa bolsa?
      v_stack_idx := -1;
      FOR v_j IN 0 .. jsonb_array_length(v_itens) - 1 LOOP
        v_child := v_itens->v_j;
        IF v_child->>'slug' = p_slug
           AND (v_child->>'containerId') = (v_it->>'instanceId')
           AND COALESCE((v_child->>'equipado')::boolean, false) = false
        THEN v_stack_idx := v_j; EXIT; END IF;
      END LOOP;

      IF v_stack_idx >= 0 THEN
        v_itens := jsonb_set(v_itens, ARRAY[v_stack_idx::text, 'quantidade'],
          to_jsonb(COALESCE((v_itens->v_stack_idx->>'quantidade')::bigint, 0) + v_place));
      ELSE
        v_inst := jsonb_build_object(
          'instanceId', (extract(epoch from clock_timestamp())*1000)::bigint::text
                         || '-' || substr(md5(random()::text || v_i::text), 1, 6),
          'slug', p_slug, 'quantidade', v_place, 'equipado', false,
          'slot', null, 'containerId', v_it->>'instanceId', 'observacao', null);
        v_itens := v_itens || jsonb_build_array(v_inst);
      END IF;

      v_need := v_need - v_place;
      EXIT WHEN v_need <= 0;
    END LOOP;
  END IF;

  IF v_need > 0 THEN
    RETURN NULL;  -- não coube em nenhuma bolsa
  END IF;

  RETURN jsonb_set(COALESCE(p_inv, '{"itens":[]}'::jsonb), '{itens}', v_itens);
END;
$function$;

-- vender_item: troca só o critério do recipiente de reserva, sem reescrever
-- a função inteira (o resto dela fica exatamente como está no banco).
DO $do$
DECLARE
  v_def text;
  v_old text := $old$PERFORM 1 FROM public.itens
            WHERE slug = v_it->>'slug' AND armazena IS NOT NULL AND armazena > 0;$old$;
  v_new text := $new$PERFORM 1 FROM public.itens
            WHERE slug = v_it->>'slug' AND armazena IS NOT NULL AND armazena > 0
              AND COALESCE(tipo, 'S') = 'S'
              AND (NULLIF(tipo_item, '') IS NULL OR tipo_item = 'Moedas');$new$;
BEGIN
  SELECT pg_get_functiondef('public.vender_item(bigint, text, integer, text)'::regprocedure) INTO v_def;
  v_def := replace(v_def, E'\r\n', E'\n');
  IF position(v_old IN v_def) = 0 THEN
    IF position(v_new IN v_def) > 0 THEN RETURN; END IF;  -- já aplicado
    RAISE EXCEPTION 'vender_item: trecho esperado não encontrado — revise antes de aplicar';
  END IF;
  EXECUTE replace(v_def, v_old, v_new);
END
$do$;

COMMIT;
