-- UMA ILHA DOS CORVOS SÓ (22/11/2026)
-- Usuário: "Existem duas 'Ilha dos Corvos', dê merge, é um local."
-- O texto do mapa "Ilha dos Corvos" estava ligado à ficha "A Ilha" (o nome que
-- veio do mapa antigo), e a ficha "Ilha dos Corvos" ficava fora do mapa. As
-- duas vazias e sem uso em histórias ou personagens: o texto passa para a
-- ficha "Ilha dos Corvos" e "A Ilha" sai.

create table if not exists public.backup_ilha_corvos_locais_20261122 as select * from public.locais where slug in ('a-ilha', 'ilha-dos-corvos');
create table if not exists public.backup_ilha_corvos_mundo_20261122 as select * from public.catalogo_mundo where tipo = 'mapa' and slug = 'mundo';
alter table public.backup_ilha_corvos_locais_20261122 enable row level security;
alter table public.backup_ilha_corvos_mundo_20261122 enable row level security;

update public.catalogo_mundo c set dados = jsonb_set(c.dados, '{lugares}', (
  select jsonb_agg(case when l->>'ficha' = 'a-ilha'
                        then l || jsonb_build_object('ficha', 'ilha-dos-corvos', 'nome', 'Ilha dos Corvos', 'estilo', (l->'estilo') - 'texto')
                        else l end order by o)
  from jsonb_array_elements(c.dados->'lugares') with ordinality x(l, o))), updated_at = now()
where c.tipo = 'mapa' and c.slug = 'mundo';

delete from public.locais where slug = 'a-ilha'
  and not exists (select 1 from public.catalogo_mundo c, jsonb_array_elements(c.dados->'lugares') l where c.tipo = 'mapa' and l->>'ficha' = 'a-ilha');
