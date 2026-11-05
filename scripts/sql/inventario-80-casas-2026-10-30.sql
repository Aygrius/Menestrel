-- ============================================================
-- Inventário com 80 casas, no máximo — 30/10/2026
-- ============================================================
-- "O inventário do personagem deve ter 80 casas fixas no máximo." e, sobre
-- o 81º item: "Isso, 'Inventário cheio'" — recusar em TODO caminho
-- (usuário).
--
-- Ocupa casa todo item FORA de recipiente (containerId vazio): é o que a
-- grade de fora desenha — equipados, vestidos e as peças do animal
-- inclusive. O que está dentro de mochila/algibeira não conta: o
-- recipiente tem as casas dele.
--
-- A trava é um gatilho, e não uma checagem em cada RPC: comprar_item,
-- comprar_item_anunciado, transfer_item, retirar_item_loja, as propostas e
-- as gravações do cliente passam todas por aqui. A RPC que esbarra nela
-- aborta inteira (as moedas também voltam) com a mensagem
-- 'inventario_cheio', que o cliente traduz para "Inventário cheio".
--
-- Só recusa o que AUMENTA a conta acima de 80: um inventário que já esteja
-- acima (não há nenhum hoje — o maior tem 14 soltos) continua podendo
-- gravar o que não piora.
--
-- Desfazer:
--   drop trigger if exists personagens_inventario_80 on public.personagens;
--   drop function if exists public._menestrel_inventario_80();

create or replace function public._menestrel_casas_no_bau(inv jsonb)
returns integer
language sql immutable
set search_path = ''
as $$
  select count(*)::integer
  from jsonb_array_elements(
    case when jsonb_typeof(inv -> 'itens') = 'array' then inv -> 'itens' else '[]'::jsonb end
  ) i
  where coalesce(i ->> 'containerId', '') = '';
$$;

create or replace function public._menestrel_inventario_80()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  n_novo integer;
begin
  if new.inventario is not distinct from old.inventario then
    return new;
  end if;
  n_novo := public._menestrel_casas_no_bau(new.inventario);
  if n_novo > 80 and n_novo > public._menestrel_casas_no_bau(old.inventario) then
    raise exception 'inventario_cheio'
      using errcode = 'P0001', hint = 'O inventário tem 80 casas.';
  end if;
  return new;
end;
$$;

drop trigger if exists personagens_inventario_80 on public.personagens;
create trigger personagens_inventario_80
  before update of inventario on public.personagens
  for each row execute function public._menestrel_inventario_80();
