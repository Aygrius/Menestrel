-- itens-excluidos-somem-2026-09-27.sql
--
-- "Os itens que são excluídos do catálogo, automaticamente são excluídos do
--  inventário dos personagens." (usuário, 27/09/2026)
--
-- Gatilho AFTER DELETE em public.itens:
--   • personagens.inventario: sai toda instância daquele slug. Se ela era um
--     RECIPIENTE, o que estava dentro não some — vai para a raiz
--     (containerId = null);
--   • historias.estoque_loja: a entrada sai da loja do Mestre (formato
--     { comercios: [{ itens: [...] }] } e o antigo, uma lista);
--   • anuncios_loja: anúncio aberto daquele item é encerrado ('retirado') —
--     não há mais item para devolver.
--
-- E a limpeza do que JÁ estava órfão (itens apagados antes deste gatilho),
-- com cópia em public.backup_itens_orfaos_2026_09_27 (personagem, instância).
--
-- REVERTER:
--   drop trigger itens_apos_excluir on public.itens;
--   drop function public._menestrel_itens_apos_excluir();
--   drop function public._menestrel_inv_sem_slugs(jsonb, text[]);
--   (os órfãos limpos estão na tabela de backup)

-- Tira as instâncias dos slugs dados; o conteúdo de um recipiente removido vai à raiz.
create or replace function public._menestrel_inv_sem_slugs(p_inv jsonb, p_slugs text[])
returns jsonb language sql immutable set search_path to 'public', 'pg_catalog' as $$
  with itens as (
    select e, ord from jsonb_array_elements(coalesce(p_inv->'itens', '[]'::jsonb)) with ordinality as t(e, ord)
  ), removidos as (
    select e->>'instanceId' as id from itens where e->>'slug' = any (p_slugs)
  )
  select case when p_inv is null then null else jsonb_set(p_inv, '{itens}', coalesce((
    select jsonb_agg(
             case when (e->>'containerId') in (select id from removidos)
                  then jsonb_set(e, '{containerId}', 'null'::jsonb) else e end
             order by ord)
      from itens where not (e->>'slug' = any (p_slugs))
  ), '[]'::jsonb)) end
$$;

create or replace function public._menestrel_itens_apos_excluir()
returns trigger language plpgsql security definer set search_path to 'public', 'pg_catalog' as $$
begin
  update public.personagens
     set inventario = public._menestrel_inv_sem_slugs(inventario, array[old.slug])
   where inventario->'itens' @> jsonb_build_array(jsonb_build_object('slug', old.slug));

  -- Loja do Mestre: formato novo (comercios) e antigo (lista).
  update public.historias h
     set estoque_loja = case
       when jsonb_typeof(h.estoque_loja) = 'array' then coalesce((
         select jsonb_agg(x) from jsonb_array_elements(h.estoque_loja) x where x->>'slug' is distinct from old.slug), '[]'::jsonb)
       else jsonb_set(h.estoque_loja, '{comercios}', coalesce((
         select jsonb_agg(jsonb_set(c, '{itens}', coalesce((
                  select jsonb_agg(i) from jsonb_array_elements(coalesce(c->'itens', '[]'::jsonb)) i
                   where i->>'slug' is distinct from old.slug), '[]'::jsonb)))
           from jsonb_array_elements(coalesce(h.estoque_loja->'comercios', '[]'::jsonb)) c), '[]'::jsonb))
     end
   where h.estoque_loja::text like '%"' || old.slug || '"%';

  update public.anuncios_loja set status = 'retirado', updated_at = now()
   where slug = old.slug and status = 'aberto';
  return old;
end $$;

drop trigger if exists itens_apos_excluir on public.itens;
create trigger itens_apos_excluir after delete on public.itens
  for each row execute function public._menestrel_itens_apos_excluir();

-- ── Os órfãos que já existiam ──
create table if not exists public.backup_itens_orfaos_2026_09_27 (
  personagem_id bigint, instancia jsonb, removido_em timestamptz default now()
);
alter table public.backup_itens_orfaos_2026_09_27 enable row level security;   -- sem política: só o banco lê

insert into public.backup_itens_orfaos_2026_09_27 (personagem_id, instancia)
select p.id, e from public.personagens p, jsonb_array_elements(coalesce(p.inventario->'itens', '[]'::jsonb)) e
 where not exists (select 1 from public.itens i where i.slug = e->>'slug');

update public.personagens p
   set inventario = public._menestrel_inv_sem_slugs(p.inventario, (
     select array_agg(distinct e->>'slug') from jsonb_array_elements(p.inventario->'itens') e
      where not exists (select 1 from public.itens i where i.slug = e->>'slug')))
 where exists (select 1 from jsonb_array_elements(coalesce(p.inventario->'itens', '[]'::jsonb)) e
                where not exists (select 1 from public.itens i where i.slug = e->>'slug'));

-- ── Nenhum inventário grava item que não existe mais ──
-- Uma ficha aberta antes da exclusão regravaria o inventário antigo pelo
-- autosave e "ressuscitaria" o item. Toda gravação de inventário passa por
-- aqui e descarta os slugs que não estão no catálogo (mesma regra: o conteúdo
-- de um recipiente descartado vai à raiz).
-- REVERTER: drop trigger personagens_inventario_sem_orfaos on public.personagens;
--           drop function public._menestrel_inventario_sem_orfaos();
create or replace function public._menestrel_inventario_sem_orfaos()
returns trigger language plpgsql set search_path to 'public', 'pg_catalog' as $$
declare v_orfaos text[];
begin
  if new.inventario is null or jsonb_typeof(new.inventario->'itens') <> 'array' then return new; end if;
  select array_agg(distinct e->>'slug') into v_orfaos
    from jsonb_array_elements(new.inventario->'itens') e
   where e->>'slug' is not null and not exists (select 1 from public.itens i where i.slug = e->>'slug');
  if v_orfaos is not null then
    new.inventario := public._menestrel_inv_sem_slugs(new.inventario, v_orfaos);
  end if;
  return new;
end $$;

drop trigger if exists personagens_inventario_sem_orfaos on public.personagens;
create trigger personagens_inventario_sem_orfaos
  before insert or update of inventario on public.personagens
  for each row execute function public._menestrel_inventario_sem_orfaos();
