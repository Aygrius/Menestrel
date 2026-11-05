-- ============================================================
-- ESGOTOU, SAI DA LOJA (29/10/2026)
-- ============================================================
-- Pedido do usuário: "Quando um item chegar a 0 na loja, ele pode sair da
-- loja."
--
-- Desde 26/10/2026 o balcão do jogador já escondia a entrada com estoque 0
-- (07-inventario/loja.jsx, `temEstoque`), mas ela continuava gravada em
-- `historias.estoque_loja` e aparecia no painel do Mestre. Agora a compra que
-- zera o estoque REMOVE a entrada da loja. Estoque ilimitado (`estoque`
-- nulo, o ∞ do painel) nunca chega a zero e não é tocado.
--
-- O DO reescreve a definição em vigor de `comprar_item` trocando os dois
-- trechos que debitam o estoque (formato de comércios e o array antigo). Se
-- um trecho não existir mais, falha em vez de recriar a função com uma cópia
-- velha.
--
-- Aplicado em produção via execute_sql em 29/10/2026.
-- ============================================================
DO $$
DECLARE d text; n text;
BEGIN
  d := pg_get_functiondef('public.comprar_item(bigint,text,integer,text,text)'::regprocedure);
  IF d LIKE '%Esgotou: o item sai da loja%' THEN RETURN; END IF;   -- já aplicado

  n := replace(d, $x$          IF v_com_itens->v_it_idx->>'entryId' = p_entry_id THEN
            v_novo_estoque_raw := jsonb_set(
              v_novo_estoque_raw,
              ARRAY['comercios', v_com_idx::text, 'itens', v_it_idx::text, 'estoque'],
              to_jsonb((v_com_itens->v_it_idx->>'estoque')::int - p_quantidade)
            );
            EXIT;$x$,
  $x$          IF v_com_itens->v_it_idx->>'entryId' = p_entry_id THEN
            -- Esgotou: o item sai da loja (29/10/2026).
            IF (v_com_itens->v_it_idx->>'estoque')::int - p_quantidade <= 0 THEN
              v_novo_estoque_raw := v_novo_estoque_raw
                #- ARRAY['comercios', v_com_idx::text, 'itens', v_it_idx::text];
            ELSE
              v_novo_estoque_raw := jsonb_set(
                v_novo_estoque_raw,
                ARRAY['comercios', v_com_idx::text, 'itens', v_it_idx::text, 'estoque'],
                to_jsonb((v_com_itens->v_it_idx->>'estoque')::int - p_quantidade)
              );
            END IF;
            EXIT;$x$);
  IF n = d THEN RAISE EXCEPTION 'trecho do formato de comercios nao encontrado'; END IF;

  d := n;
  n := replace(d, $x$      v_novo_estoque_raw := jsonb_set(v_estoque_raw, ARRAY[v_idx::text, 'estoque'],
        to_jsonb((v_entrada->>'estoque')::int - p_quantidade));$x$,
  $x$      IF (v_entrada->>'estoque')::int - p_quantidade <= 0 THEN
        v_novo_estoque_raw := v_estoque_raw - v_idx;
      ELSE
        v_novo_estoque_raw := jsonb_set(v_estoque_raw, ARRAY[v_idx::text, 'estoque'],
          to_jsonb((v_entrada->>'estoque')::int - p_quantidade));
      END IF;$x$);
  IF n = d THEN RAISE EXCEPTION 'trecho do formato antigo nao encontrado'; END IF;

  EXECUTE n;
END $$;
