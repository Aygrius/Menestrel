-- O MAPA SEM CIDADES AUTOMÁTICAS (21/11/2026)
--
-- Usuário: "Pare de criar cidades automáticas." Até hoje, o mapa de toda mesa
-- nascia com as 65 cidades da pintura antiga (mapaSemente, MAPA_PINTADAS em
-- src/13-diario/mapa.jsx), marcadas com "p": 1 e sem ficha ligada. O código
-- parou de criá-las e as ignora ao carregar (mapaAutomatica); este script tira
-- as que ficaram gravadas, para o banco dizer o mesmo que a tela.
--
-- Sai só o lugar com p = 1 E sem ficha. O resto do mapa (personagens em
-- `gente`, linhas, rota, planos, lugares postos pelo Mestre) fica como está.
--
-- Antes de rodar (21/11/2026): 3 mesas (13, 24, 33), só com automáticas
-- (65, 63 e 65), nenhuma linha nem rota. Cópia em backup_mapas_mesa_20261121.

create table if not exists public.backup_mapas_mesa_20261121 as
  select * from public.mapas_mesa;
alter table public.backup_mapas_mesa_20261121 enable row level security;

update public.mapas_mesa m
set dados = jsonb_set(
      m.dados, '{lugares}',
      coalesce((
        select jsonb_agg(l order by ord)
        from jsonb_array_elements(m.dados->'lugares') with ordinality as t(l, ord)
        where not ((l->>'p') = '1' and l->>'ficha' is null)
      ), '[]'::jsonb)),
    updated_at = now()
where jsonb_typeof(m.dados->'lugares') = 'array'
  and exists (select 1 from jsonb_array_elements(m.dados->'lugares') l
              where (l->>'p') = '1' and l->>'ficha' is null);

-- Para desfazer:
--   update public.mapas_mesa m set dados = b.dados, updated_at = now()
--   from public.backup_mapas_mesa_20261121 b where b.historia_id = m.historia_id;
