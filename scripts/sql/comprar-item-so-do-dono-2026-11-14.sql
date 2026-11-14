-- AUDITORIA 13/11/2026, item 1 (docs/auditoria-batalha-inventario-2026-11-13.md).
-- `comprar_item` era SECURITY DEFINER, executável por anon, e:
--   1. não conferia que p_pj_id é de quem chama (dava para gastar as moedas de
--      outro personagem);
--   2. aceitava p_negociacao = 'sucesso' do cliente (25% de desconto à vontade);
--   3. não aplicava o filtro de cidade de get_loja_pj (comprava na loja de
--      outra cidade, ou na loja sem `lugar`, pelo entryId).
-- Correção: o corpo antigo vira `_menestrel_comprar_item_nucleo` (sem EXECUTE
-- para anon/authenticated) e `comprar_item` passa a ser uma casca com a mesma
-- assinatura que faz as três conferências e chama o núcleo.
-- O app não manda p_negociacao (07-inventario/loja.jsx); só o Mestre pode.
-- Idempotente.

DO $$
BEGIN
  IF to_regprocedure('public._menestrel_comprar_item_nucleo(bigint,text,integer,text,text)') IS NULL THEN
    ALTER FUNCTION public.comprar_item(bigint, text, integer, text, text)
      RENAME TO _menestrel_comprar_item_nucleo;
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public._menestrel_comprar_item_nucleo(bigint, text, integer, text, text)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.comprar_item(
  p_pj_id bigint,
  p_entry_id text,
  p_quantidade integer,
  p_container_id text DEFAULT NULL::text,
  p_negociacao text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_uid         uuid := auth.uid();
  v_dono        uuid;
  v_historia_id bigint;
  v_mestre_id   uuid;
  v_estoque_raw jsonb;
  v_local       text;
  v_eh_mestre   boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;

  SELECT user_id INTO v_dono FROM public.personagens WHERE id = p_pj_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'pj_nao_encontrado');
  END IF;

  -- A mesma história que o núcleo escolhe (a mais nova com o PJ).
  SELECT id, mestre_id, COALESCE(estoque_loja, '[]'::jsonb),
         lower(btrim(COALESCE(data_jogo_atual->>'local', '')))
    INTO v_historia_id, v_mestre_id, v_estoque_raw, v_local
    FROM public.historias
   WHERE p_pj_id = ANY(protagonista_ids)
   ORDER BY created_at DESC
   LIMIT 1;
  IF v_historia_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_historia');
  END IF;

  v_eh_mestre := v_mestre_id IS NOT DISTINCT FROM v_uid;

  -- 1. Só o dono do personagem ou o Mestre da história compram por ele.
  IF v_dono IS DISTINCT FROM v_uid AND NOT v_eh_mestre THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;

  -- 2. O resultado da negociação é do Mestre, não do cliente.
  IF p_negociacao IS NOT NULL AND NOT v_eh_mestre THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'negociacao_so_mestre');
  END IF;

  -- 3. O filtro de cidade de get_loja_pj: a entrada tem de estar num comércio
  --    cujo `lugar` é o local atual da mesa. O formato legado (array solto)
  --    não tem cidade e get_loja_pj também não o filtra.
  IF jsonb_typeof(v_estoque_raw) = 'object' AND jsonb_typeof(v_estoque_raw->'comercios') = 'array' THEN
    IF NOT EXISTS (
      SELECT 1
        FROM jsonb_array_elements(v_estoque_raw->'comercios') c,
             jsonb_array_elements(COALESCE(c->'itens', '[]'::jsonb)) it
       WHERE v_local <> ''
         AND lower(btrim(COALESCE(c->>'lugar', ''))) = v_local
         AND it->>'entryId' = p_entry_id
    ) THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'item_nao_listado');
    END IF;
  END IF;

  RETURN public._menestrel_comprar_item_nucleo(
    p_pj_id, p_entry_id, p_quantidade, p_container_id, p_negociacao);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.comprar_item(bigint, text, integer, text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.comprar_item(bigint, text, integer, text, text) TO authenticated;

-- Conferência:
-- SELECT p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') anon,
--        has_function_privilege('authenticated', p.oid, 'EXECUTE') auth
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--  WHERE n.nspname = 'public' AND p.proname IN ('comprar_item', '_menestrel_comprar_item_nucleo');
-- Esperado: comprar_item false/true; _menestrel_comprar_item_nucleo false/false.
