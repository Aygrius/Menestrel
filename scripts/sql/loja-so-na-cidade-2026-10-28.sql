-- ============================================================
-- A LOJA SÓ APARECE NA CIDADE (28/10/2026)
-- ============================================================
-- Pedido do usuário: "Para cada cidade do sistema, haverá uma loja aberta com
-- itens à venda de forma fixa, os personagens só podem ver a loja quando
-- estiverem na cidade." Perguntado o que fazer com a loja antiga sem cidade,
-- a resposta foi: "Deixar de aparecer."
--
-- O QUE MUDA: até 23/10/2026 o filtro era "loja sem cidade OU loja da cidade
-- onde a mesa está". A primeira metade era a brecha da migração — a loja
-- legada "Estoque", sem `lugar`, aparecia em qualquer lugar do mundo. Agora
-- vale só a cidade: sem `lugar`, ninguém vê; sem `local` na mesa, nenhuma
-- loja aparece (o grupo não está em cidade nenhuma).
--
-- QUEM PERDE: a mesa que ainda usa a loja legada sem cidade. O conserto é de
-- um clique — dar uma cidade à loja no campo "Cidade" do painel, ou usar o
-- botão "Lojas das cidades", que abre a loja de cada cidade da aventura com o
-- estoque lido da economia dela (01-core/lojas-cidade.jsx).
--
-- Aplicado em produção via execute_sql em 28/10/2026.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_loja_pj(p_pj_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_estoque_raw     jsonb;
  v_estoque_flat    jsonb;
  v_historia_id     bigint;
  v_historia_titulo text;
  v_local           text;
BEGIN
  SELECT id, titulo, COALESCE(estoque_loja, '[]'::jsonb)
    INTO v_historia_id, v_historia_titulo, v_estoque_raw
    FROM public.historias
    WHERE p_pj_id = ANY(protagonista_ids)
    ORDER BY created_at DESC
    LIMIT 1;

  IF v_historia_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_historia');
  END IF;

  IF jsonb_typeof(v_estoque_raw) = 'object' AND jsonb_typeof(v_estoque_raw->'comercios') = 'array' THEN
    SELECT lower(btrim(COALESCE(data_jogo_atual->>'local', ''))) INTO v_local
      FROM public.historias WHERE id = v_historia_id;
    v_estoque_raw := jsonb_set(v_estoque_raw, '{comercios}', COALESCE((
      SELECT jsonb_agg(c) FROM jsonb_array_elements(v_estoque_raw->'comercios') c
      WHERE v_local <> ''
        AND lower(btrim(COALESCE(c->>'lugar', ''))) = v_local
    ), '[]'::jsonb));
  END IF;
  v_estoque_flat := public.estoque_loja_flat(v_estoque_raw);

  RETURN jsonb_build_object(
    'ok', true,
    'historia_id', v_historia_id,
    'historia_titulo', v_historia_titulo,
    'estoque', COALESCE(v_estoque_flat, '[]'::jsonb)
  );
END;
$function$;
