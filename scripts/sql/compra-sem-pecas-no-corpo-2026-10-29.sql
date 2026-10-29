-- ============================================================
-- A PEÇA NO CORPO NÃO OCUPA A MOCHILA NA COMPRA (29/10/2026)
-- ============================================================
-- Relato do usuário: "Por que o Yuldrous não consegue comprar o capacete se
-- ele tem espaço no inventário?"
--
-- A loja do cliente (07-inventario/loja.jsx, `espacoUsado`) só conta o que
-- está SOLTO: fora de recipiente, nem equipado nem vestido. A `comprar_item`
-- contava também o que estava no corpo. Com armadura de malha completa,
-- marreta, escudo, capa e anel (18,8 de ocupação) contra 15,5 de capacidade
-- dos recipientes, a tela dizia "cabe" e o banco respondia
-- `espaco_insuficiente`.
--
-- A troca é só a condição do `usado`: as duas contas passam a ser a mesma.
-- O DO reescreve a definição em vigor trocando um trecho — se o trecho não
-- existir mais, falha em vez de recriar a função com uma cópia velha.
--
-- Aplicado em produção via execute_sql em 29/10/2026.
-- ============================================================
DO $$
DECLARE d text; n text;
BEGIN
  d := pg_get_functiondef('public.comprar_item(bigint,text,integer,text,text)'::regprocedure);
  n := replace(d, $x$      ELSIF (v_it->>'containerId') IS NULL THEN
        IF v_fc_ocupa IS NOT NULL THEN
          v_usado := v_usado + v_fc_ocupa * COALESCE((v_it->>'quantidade')::numeric, 1);$x$,
  $x$      -- Peca no corpo (equipada ou vestida) nao ocupa a mochila (29/10/2026),
      -- igual a conta da loja no cliente (07-inventario/loja.jsx).
      ELSIF (v_it->>'containerId') IS NULL
            AND NOT COALESCE((v_it->>'equipado')::boolean, false)
            AND NOT COALESCE((v_it->>'vestido')::boolean, false) THEN
        IF v_fc_ocupa IS NOT NULL THEN
          v_usado := v_usado + v_fc_ocupa * COALESCE((v_it->>'quantidade')::numeric, 1);$x$);
  IF n = d THEN
    IF d LIKE '%Peca no corpo%' THEN RETURN; END IF;   -- já aplicado
    RAISE EXCEPTION 'trecho de comprar_item nao encontrado';
  END IF;
  EXECUTE n;
END $$;
