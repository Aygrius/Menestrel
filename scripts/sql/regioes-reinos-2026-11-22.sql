-- AS GRANDES ÁREAS SÃO OS REINOS (22/11/2026)
-- Usuário: "'Geleiras' e 'As Geleiras', 'Estepes Vítreas' e 'Estepes Vítreas', e
-- 'Terras Selvagens' e 'Terras Bárbaras' são duplicatas. Mantenha o estilo de
-- texto hoje, pois são grandes áreas."
-- O texto do mapa (local do mundo com estilo) passa a ser o reino: tipo 'reino',
-- ficha = o slug do reino, o mesmo estilo e o mesmo texto escrito. As fichas de
-- local duplicadas saem; a descrição de Terras Selvagens (a única com texto)
-- vai para o fim da do reino Terras Bárbaras.

create table if not exists public.backup_regioes_locais_20261122 as select * from public.locais where slug in ('geleiras', 'estepes-vitreas', 'terras-selvagens');
create table if not exists public.backup_regioes_reinos_20261122 as select * from public.reinos where slug in ('geleiras', 'estepes-vitreas', 'terras-barbaras');
create table if not exists public.backup_regioes_mundo_20261122 as select * from public.catalogo_mundo where tipo = 'mapa' and slug = 'mundo';
alter table public.backup_regioes_locais_20261122 enable row level security;
alter table public.backup_regioes_reinos_20261122 enable row level security;
alter table public.backup_regioes_mundo_20261122 enable row level security;

update public.reinos r set descricao = r.descricao || E'\n\n' || l.descricao, updated_at = now()
  from public.locais l
 where r.slug = 'terras-barbaras' and l.slug = 'terras-selvagens' and coalesce(l.descricao, '') <> ''
   and position(left(l.descricao, 60) in coalesce(r.descricao, '')) = 0;

update public.catalogo_mundo c set dados = jsonb_set(c.dados, '{lugares}', (
  select jsonb_agg(case
    when l->>'id' = 'txmwqypzd97'  then l || jsonb_build_object('tipo', 'reino', 'ficha', 'estepes-vitreas', 'nome', 'Estepes Vítreas')
    when l->>'id' = 'txmwqypzdg1d' then l || jsonb_build_object('tipo', 'reino', 'ficha', 'geleiras', 'nome', 'As Geleiras', 'estilo', (l->'estilo') || jsonb_build_object('texto', 'Geleiras'))
    when l->>'id' = 'txmwqypzdf1c' then l || jsonb_build_object('tipo', 'reino', 'ficha', 'terras-barbaras', 'nome', 'Terras Bárbaras', 'estilo', (l->'estilo') || jsonb_build_object('texto', 'Terras Selvagens'))
    else l end order by o)
  from jsonb_array_elements(c.dados->'lugares') with ordinality x(l, o))), updated_at = now()
where c.tipo = 'mapa' and c.slug = 'mundo';

delete from public.locais x where x.slug in ('geleiras', 'estepes-vitreas', 'terras-selvagens')
  and not exists (select 1 from public.catalogo_mundo c, jsonb_array_elements(c.dados->'lugares') l where c.tipo = 'mapa' and l->>'tipo' = 'local' and l->>'ficha' = x.slug)
  and not exists (select 1 from public.historias h where x.slug = any(h.local_ids));
