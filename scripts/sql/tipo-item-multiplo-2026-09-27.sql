-- tipo-item-multiplo-2026-09-27.sql
--
-- "Em editar/criar itens, 'tipo de item' deve permitir selecionar até mais de
--  um tipo de item." (usuário, 27/09/2026)
--
-- itens.tipo_item continua TEXTO, agora com um ou mais grupos separados por
-- vírgula ("Consumíveis, Moedas"). Vazio = aceita qualquer grupo. As funções
-- que comparavam com igualdade ('= Moedas') passam a procurar na lista.
--
-- REVERTER: trocar de volta
--   'Moedas' = ANY (regexp_split_to_array(v_c_aceita, '\s*,\s*'))  →  v_c_aceita = 'Moedas'
--   'Moedas' = ANY (regexp_split_to_array(tipo_item, '\s*,\s*'))   →  tipo_item = 'Moedas'

do $$
declare v_src text;
begin
  select pg_get_functiondef('public.inv_depositar_moeda(jsonb, text, bigint)'::regprocedure) into v_src;
  if position($q$IF v_c_aceita IS NOT NULL AND v_c_aceita <> 'Moedas' THEN$q$ in v_src) = 0 then
    raise exception 'inv_depositar_moeda: trecho não encontrado';
  end if;
  v_src := replace(v_src, $q$IF v_c_aceita IS NOT NULL AND v_c_aceita <> 'Moedas' THEN$q$,
    $q$IF v_c_aceita IS NOT NULL AND NOT ('Moedas' = ANY (regexp_split_to_array(btrim(v_c_aceita), '\s*,\s*'))) THEN$q$);
  execute v_src;

  select pg_get_functiondef(p.oid) into v_src from pg_proc p where p.proname = 'vender_item' and p.pronamespace = 'public'::regnamespace;
  if position($q$AND (NULLIF(tipo_item, '') IS NULL OR tipo_item = 'Moedas');$q$ in v_src) = 0 then
    raise exception 'vender_item: trecho não encontrado';
  end if;
  v_src := replace(v_src, $q$AND (NULLIF(tipo_item, '') IS NULL OR tipo_item = 'Moedas');$q$,
    $q$AND (NULLIF(tipo_item, '') IS NULL OR 'Moedas' = ANY (regexp_split_to_array(btrim(tipo_item), '\s*,\s*')));$q$);
  execute v_src;
end $$;

-- Correção de dado (27/09/2026, "porque eu não consigo guardar as flechas na
-- aljava?"): a Aljava Dupla estava com tipo_item = 'Moedas' — só aceitava
-- moedas. A Aljava comum já era 'Consumíveis' (a flecha é Consumível).
-- REVERTER: update itens set tipo_item = 'Moedas' where slug = 'aljava_reforcada';
update public.itens set tipo_item = 'Consumíveis' where slug = 'aljava_reforcada' and tipo_item = 'Moedas';
