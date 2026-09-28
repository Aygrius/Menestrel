-- log-primeiro-nome-2026-09-27.sql
--
-- "No nome, identifique sempre com o primeiro nome, mesmo para criaturas."
-- (usuário, 27/09/2026). As frases que o BANCO escreve na mesa_log (anúncios
-- da loja) passam a usar o primeiro nome. O vendedor_nome/comprador_nome
-- gravados no anúncio continuam completos — é o que a janela do anúncio mostra.
--
-- REVERTER: trocar split_part(x, ' ', 1) de volta por x nas duas funções.

do $$
declare v_src text;
begin
  select pg_get_functiondef('public.publicar_item_loja(bigint, text, bigint, bigint)'::regprocedure) into v_src;
  if position($q$coalesce(v_nome, 'Um personagem') || ' colocou à venda$q$ in v_src) = 0 then
    raise exception 'publicar_item_loja: trecho não encontrado';
  end if;
  v_src := replace(v_src, $q$coalesce(v_nome, 'Um personagem') || ' colocou à venda$q$,
                          $q$coalesce(nullif(split_part(v_nome, ' ', 1), ''), 'Um personagem') || ' colocou à venda$q$);
  execute v_src;

  select pg_get_functiondef('public.comprar_item_anunciado(bigint, bigint, bigint)'::regprocedure) into v_src;
  if position($q$coalesce(v_nome_c, 'Alguém') || ' comprou '$q$ in v_src) = 0
     or position($q$coalesce(v_a.vendedor_nome, 'um personagem')$q$ in v_src) = 0 then
    raise exception 'comprar_item_anunciado: trecho não encontrado';
  end if;
  v_src := replace(v_src, $q$coalesce(v_nome_c, 'Alguém') || ' comprou '$q$,
                          $q$coalesce(nullif(split_part(v_nome_c, ' ', 1), ''), 'Alguém') || ' comprou '$q$);
  v_src := replace(v_src, $q$coalesce(v_a.vendedor_nome, 'um personagem')$q$,
                          $q$coalesce(nullif(split_part(v_a.vendedor_nome, ' ', 1), ''), 'um personagem')$q$);
  execute v_src;
end $$;
