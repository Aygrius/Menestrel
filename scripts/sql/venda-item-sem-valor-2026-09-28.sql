-- ============================================================================
-- ITEM SEM VALOR SE VENDE POR 0 (28/09/2026)
--
-- "Itens que não tem valor são vendidos e negociados com valor 0." (usuário)
--
-- publicar_item_loja recusava preço <= 0, e o item sem valor de tabela
-- (itens.valor_latao nulo ou 0) começava a venda em 0 — não havia como
-- vendê-lo. Agora o preço 0 vale para ESSE item; o que tem valor de tabela
-- continua exigindo preço maior que zero. A compra (comprar_item_anunciado)
-- já aceitava custo 0: _menestrel_inv_debitar_latao e _creditar_latao não
-- mexem em moeda nenhuma. A loja do Mestre (comprar_item) já tratava valor
-- nulo como 0 ("Gratuito").
-- ============================================================================

alter table public.anuncios_loja drop constraint if exists anuncios_loja_preco_latao_check;
alter table public.anuncios_loja add constraint anuncios_loja_preco_latao_check check (preco_latao >= 0);

do $do$
declare d text;
begin
  d := pg_get_functiondef('public.publicar_item_loja(bigint,text,bigint,bigint)'::regprocedure);
  if position('preco_zero_so_sem_valor' in d) = 0 then
    -- 1) o teste do começo passa a recusar só o negativo;
    d := replace(d,
      'if p_preco_latao is null or p_preco_latao <= 0 then return jsonb_build_object(''ok'', false, ''motivo'', ''preco_invalido''); end if;',
      'if p_preco_latao is null or p_preco_latao < 0 then return jsonb_build_object(''ok'', false, ''motivo'', ''preco_invalido''); end if;');
    -- 2) com o catálogo em mãos: preço 0 só para item sem valor de tabela.
    d := replace(d,
      'if v_cat.grupo = ''Moedas'' then return jsonb_build_object(''ok'', false, ''motivo'', ''moeda_nao_vende''); end if;',
      'if v_cat.grupo = ''Moedas'' then return jsonb_build_object(''ok'', false, ''motivo'', ''moeda_nao_vende''); end if;' || E'\n' ||
      '  -- preco_zero_so_sem_valor (28/09/2026): 0 só para item sem valor de tabela.' || E'\n' ||
      '  if p_preco_latao = 0 and coalesce(v_cat.valor_latao, 0) > 0 then return jsonb_build_object(''ok'', false, ''motivo'', ''preco_invalido''); end if;');
    if position('preco_zero_so_sem_valor' in d) = 0 or position('p_preco_latao < 0' in d) = 0 then
      raise exception 'publicar_item_loja: ponto de enxerto não encontrado';
    end if;
    execute d;
  end if;
end
$do$;
