-- SÓ ROTA, E ELA É DO MUNDO (21/11/2026)
-- Usuário: "Eu quero que exista apenas rota, e ela é global." Escolhas dele:
-- só o Imperador traça; sai a rota da mesa; o caminho que havia vira rota.
-- As linhas de todas as mesas (plano material) vão para catalogo_mundo
-- 'mapa'/'mundo'.dados.linhas como tipo 'rota' ("Caminho N" vira "Rota N"),
-- e a mesa fica sem linhas e sem rota da mesa.

create table if not exists public.backup_rotas_mundo_mesas_20261121 as select * from public.mapas_mesa;
create table if not exists public.backup_rotas_mundo_mundo_20261121 as select * from public.catalogo_mundo where tipo = 'mapa';
alter table public.backup_rotas_mundo_mesas_20261121 enable row level security;
alter table public.backup_rotas_mundo_mundo_20261121 enable row level security;

update public.catalogo_mundo c
   set dados = jsonb_set(c.dados, '{linhas}', coalesce(c.dados->'linhas', '[]'::jsonb) || coalesce((
         select jsonb_agg(jsonb_build_object(
                  'id', l->>'id', 'tipo', 'rota',
                  'nome', regexp_replace(l->>'nome', '^Caminho ', 'Rota '),
                  'pts', l->'pts'))
           from public.mapas_mesa m, jsonb_array_elements(coalesce(m.dados->'linhas', '[]'::jsonb)) l
          where jsonb_array_length(coalesce(l->'pts', '[]'::jsonb)) > 1), '[]'::jsonb)),
       updated_at = now()
 where c.tipo = 'mapa' and c.slug = 'mundo';

update public.mapas_mesa
   set dados = (dados - 'rota') || jsonb_build_object('linhas', '[]'::jsonb), updated_at = now()
 where jsonb_array_length(coalesce(dados->'linhas', '[]'::jsonb)) > 0 or dados ? 'rota';

-- Para desfazer:
--   update public.mapas_mesa m set dados = b.dados from public.backup_rotas_mundo_mesas_20261121 b where m.historia_id = b.historia_id;
--   update public.catalogo_mundo c set dados = b.dados from public.backup_rotas_mundo_mundo_20261121 b where c.tipo = b.tipo and c.slug = b.slug;

-- DEPOIS, NO MESMO DIA: o que se traça é o CAMINHO (a estrada); a rota, de
-- origem a destino, virá depois (usuário: "Existe a estrada fixa, e existe a
-- rota"). As linhas do mundo viram tipo 'caminho' e "Rota N" vira "Caminho N".
create table if not exists public.backup_caminhos_mundo_20261121 as select * from public.catalogo_mundo where tipo = 'mapa' and slug = 'mundo';
alter table public.backup_caminhos_mundo_20261121 enable row level security;
update public.catalogo_mundo c set dados = jsonb_set(c.dados, '{linhas}', (
  select coalesce(jsonb_agg(l || jsonb_build_object('tipo', 'caminho', 'nome', regexp_replace(l->>'nome', '^Rota (\d+)$', 'Caminho \1')) order by o), '[]'::jsonb)
  from jsonb_array_elements(c.dados->'linhas') with ordinality as x(l, o))), updated_at = now()
where c.tipo = 'mapa' and c.slug = 'mundo';
