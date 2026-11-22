-- A MONTANHA SHARAR (22/11/2026)
-- Usuário: "adicione a montanha sharar" — "Do lado oeste à floresta de laudis,
-- ao sul de sika e ao norte de donatar." O relevo foi desenhado no mapa.cdr
-- (camada Relevo, formas "… montanhas-2026-11-22") e exportado para
-- public/mapa/tagmar.svg; aqui entra o nome: a ficha na aba Locais e o local
-- do mundo com o estilo de texto de serra, no meio da montanha.

create table if not exists public.backup_sharar_mundo_20261122 as select * from public.catalogo_mundo where tipo = 'mapa' and slug = 'mundo';
alter table public.backup_sharar_mundo_20261122 enable row level security;

insert into public.locais (slug, nome) values ('montanha-sharar', 'Montanha Sharar')
on conflict (slug) do nothing;

update public.catalogo_mundo
   set dados = jsonb_set(dados, '{lugares}', coalesce(dados->'lugares', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
         'id', 'mwsharar20261122', 'tipo', 'local', 'nome', 'Montanha Sharar', 'ficha', 'montanha-sharar',
         'x', 4224, 'y', 2462, 'estilo', jsonb_build_object('geo', 'serra', 'imp', 2)))),
       updated_at = now()
 where tipo = 'mapa' and slug = 'mundo'
   and not exists (select 1 from jsonb_array_elements(dados->'lugares') l where l->>'id' = 'mwsharar20261122');

-- Para desfazer:
--   update public.catalogo_mundo c set dados = b.dados from public.backup_sharar_mundo_20261122 b where c.tipo = b.tipo and c.slug = b.slug;
--   delete from public.locais where slug = 'montanha-sharar';
