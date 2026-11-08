-- criaturas-ajuste-x2-2026-11-07.sql
--
-- Pedido do usuário em 07/11/2026: "Faça o atributo x2 para a criatura também."
-- O personagem soma o atributo de ajuste da arma × 2 nas colunas L/M/P
-- (COLUNAS_POR_PONTO_DE_AJUSTE, 01-core); a criatura somava × 1.
--
-- Mesma conta de criatura-formulas.jsx (derivadosDoEquipamento):
--   L/M/P = dano_l/m/p da primeira arma + atributo de ajuste × 2 + estágio
-- Antes de aplicar, as 163 criaturas com arma batiam com a regra antiga
-- (× 1); só as colunas L/M/P mudam.
--
-- Cópia antes: public.backup_criaturas_ajuste_2026_11_07.

BEGIN;

create table if not exists public.backup_criaturas_ajuste_2026_11_07 as
  select * from public.criaturas;
alter table public.backup_criaturas_ajuste_2026_11_07 enable row level security;

with primeira as (
  select c.id,
         (select i from jsonb_array_elements(coalesce(c.equipamento, '[]'::jsonb)) with ordinality x(e, o)
            join public.itens i on i.slug = e->>'slug'
           where e->>'slot' in ('mao_d', 'mao_e', 'arma') and i.dano is not null
           order by case e->>'slot' when 'mao_d' then 0 when 'mao_e' then 1 else 2 end, o
           limit 1) as a
    from public.criaturas c
),
conta as (
  select p.id,
         coalesce((p.a).dano_l, 0) as l, coalesce((p.a).dano_m, 0) as m, coalesce((p.a).dano_p, 0) as p_,
         2 * case upper(coalesce((p.a).ajuste_atributo, ''))
           when 'FOR' then coalesce(c.forca, 0)
           when 'AGI' then coalesce(c.agilidade, 0)
           when 'PER' then coalesce(c.percepcao, 0)
           when 'AUR' then coalesce(c.aura, 0)
           when 'FIS' then coalesce(c.fisico, 0)
           when 'CAR' then coalesce(c.carisma, 0)
           else 0 end + coalesce(c.estagio, 0) as bonus
    from primeira p join public.criaturas c on c.id = p.id
   where (p.a).slug is not null
)
update public.criaturas c
   set dano_l = k.l + k.bonus,
       dano_m = k.m + k.bonus,
       dano_p = k.p_ + k.bonus,
       atualizado_em = now()
  from conta k
 where k.id = c.id;

COMMIT;
