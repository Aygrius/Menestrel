-- O perfil do modo automático (18/11/2026): o padrão da criatura no bestiário.
-- Texto livre com quatro valores do editor; nulo = Padrão. A batalha copia
-- para o combatente (perfil_auto) e o Mestre troca no card durante a luta.
alter table public.criaturas add column if not exists perfil_auto text;
alter table public.criaturas drop constraint if exists criaturas_perfil_auto_valido;
alter table public.criaturas add constraint criaturas_perfil_auto_valido
  check (perfil_auto is null or perfil_auto in ('Padrão', 'Agressivo', 'Cauteloso', 'Protetor'));
