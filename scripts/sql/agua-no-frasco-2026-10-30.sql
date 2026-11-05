-- ============================================================
-- Água solta vai para o frasco — 30/10/2026
-- ============================================================
-- "O personagem Eco possui 2 água no inventário, mas é regra de que água
-- precisa de um recipiente, não pode ficar solto no inventário." (usuário)
--
-- CAUSA: a restauração de 29/10 (inventario-so-objeto-e-restauracao-
-- 2026-10-29.sql) remontou os inventários de Nihil, Yuldrous e Eco pelo
-- mesa_log, e o log não guarda em que recipiente cada item estava. A água
-- voltou na raiz. Os três são os ÚNICOS personagens com líquido solto
-- (consulta abaixo).
--
-- Frasco: armazena 0,5. Água: ocupa 0,1 → cinco águas por frasco.
--
-- Conferir quem tem líquido solto:
--   select p.id, p.nome, i->>'slug', i->>'quantidade'
--   from personagens p, jsonb_array_elements(p.inventario->'itens') i
--   join itens c on c.slug = i->>'slug'
--   where c.tipo = 'L' and c.grupo <> 'Recipientes'
--     and coalesce(i->>'containerId','') = '' and coalesce(i->>'slot','') = ''
--     and coalesce((i->>'equipado')::boolean, false) = false;

-- ── Eco (66): 2 águas → frasco vazio 1793318412339-s43kx9-0 ──────────────
-- A trava: só grava se a água ainda está solta e o frasco ainda vazio.
update personagens p
set inventario = jsonb_set(p.inventario, '{itens}', (
  select jsonb_agg(case when i->>'instanceId' = '1793318308144-5fa172'
    then i || '{"containerId":"1793318412339-s43kx9-0","casa":0}'::jsonb
    else i end order by n)
  from jsonb_array_elements(p.inventario->'itens') with ordinality as e(i, n)))
where p.id = 66
  and exists (select 1 from jsonb_array_elements(p.inventario->'itens') i
              where i->>'instanceId' = '1793318308144-5fa172' and i->>'containerId' is null)
  and not exists (select 1 from jsonb_array_elements(p.inventario->'itens') i
                  where i->>'containerId' = '1793318412339-s43kx9-0');

-- ── Yuldrous (64): 5 águas → frasco vazio 1793318392509-8jp28n-1 ─────────
update personagens p
set inventario = jsonb_set(p.inventario, '{itens}', (
  select jsonb_agg(case when i->>'instanceId' = '1793318308143-67eb0b'
    then i || '{"containerId":"1793318392509-8jp28n-1","casa":0}'::jsonb
    else i end order by n)
  from jsonb_array_elements(p.inventario->'itens') with ordinality as e(i, n)))
where p.id = 64
  and exists (select 1 from jsonb_array_elements(p.inventario->'itens') i
              where i->>'instanceId' = '1793318308143-67eb0b' and i->>'containerId' is null
                and (i->>'quantidade')::int = 5)
  and not exists (select 1 from jsonb_array_elements(p.inventario->'itens') i
                  where i->>'containerId' = '1793318392509-8jp28n-1');

-- ── Nihil (35): 11 águas → 5 em cada frasco vazio; a 11ª não cabe ────────
-- Usuário (30/10/2026): "Arrume de todos os personagens." Nihil não tem
-- outro recipiente de líquido, então a água que sobra sai do inventário.
update personagens p
set inventario = jsonb_set(p.inventario, '{itens}', (
  select jsonb_agg(x order by n, k) from (
    select n, 0 k, case when i->>'instanceId' = '1793318308129-459fe0'
      then i || '{"containerId":"1793318394395-w1rotv-0","casa":0,"quantidade":5}'::jsonb
      else i end x
    from jsonb_array_elements(p.inventario->'itens') with ordinality as e(i, n)
    union all
    select n, 1, i || '{"instanceId":"1793318308129-459fe0-b","containerId":"1793318394395-m73bj1-1","casa":0,"quantidade":5}'::jsonb
    from jsonb_array_elements(p.inventario->'itens') with ordinality as e(i, n)
    where i->>'instanceId' = '1793318308129-459fe0') t))
where p.id = 35
  and exists (select 1 from jsonb_array_elements(p.inventario->'itens') i
              where i->>'instanceId' = '1793318308129-459fe0' and i->>'containerId' is null
                and (i->>'quantidade')::int = 11)
  and not exists (select 1 from jsonb_array_elements(p.inventario->'itens') i
                  where i->>'containerId' in ('1793318394395-w1rotv-0', '1793318394395-m73bj1-1'));

-- Desfazer (Eco; Yuldrous igual, com o id e o instanceId dele):
-- update personagens p set inventario = jsonb_set(p.inventario, '{itens}', (
--   select jsonb_agg(case when i->>'instanceId' = '1793318308144-5fa172'
--     then i || '{"containerId":null,"casa":0}'::jsonb else i end order by n)
--   from jsonb_array_elements(p.inventario->'itens') with ordinality as e(i, n)))
-- where p.id = 66;
