-- inventario-versao-2026-10-02.sql
-- Trava de versão do inventário (02/10/2026).
-- Spec: docs/superpowers/specs/2026-10-02-inventario-concorrencia-design.md
--
-- O cliente grava com .eq('inventario_versao', v): se outra tela gravou no
-- meio, zero linhas voltam e ele relê e mescla. O gatilho roda em TODO update
-- (não só OF inventario), senão um update só da versão a falsificaria.
-- Roda depois de personagens_inventario_sem_orfaos (ordem alfabética dos
-- gatilhos BEFORE), então compara o inventário já limpo.
--
-- REVERTER:
--   drop trigger if exists personagens_inventario_versao on public.personagens;
--   drop function if exists public._menestrel_inventario_versao();
--   alter table public.personagens drop column if exists inventario_versao;

alter table public.personagens
  add column if not exists inventario_versao bigint not null default 0;

create or replace function public._menestrel_inventario_versao()
returns trigger language plpgsql set search_path to 'public', 'pg_catalog' as $$
begin
  if new.inventario is distinct from old.inventario then
    new.inventario_versao := old.inventario_versao + 1;
  else
    new.inventario_versao := old.inventario_versao;
  end if;
  return new;
end $$;

drop trigger if exists personagens_inventario_versao on public.personagens;
create trigger personagens_inventario_versao
  before update on public.personagens
  for each row execute function public._menestrel_inventario_versao();
