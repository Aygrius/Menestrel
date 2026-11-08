-- armaduras-defesa-2026-11-07.sql
--
-- Pedido do usuário em 07/11/2026: "Armadura leve ter defesa maior, armadura
-- média ter resistência maior e armadura pesada absorção maior. 25 pontos de
-- defesa leve são muito, pois um personagem de estágio 1 seria impossível de
-- ser atacado por uma criatura de estágio 1." Absorção e resistência ficam
-- como estão ("Não altere a absorção").
--
-- Defesa por peça (Leve / Média / Pesada):
--   cabeça 1/1/0 · dorso 1/1/0 · ombro 0/0/0 · braço 1/0/0 · perna 1/0/0
--   canela 0/0/0 · pé 0/0/0 · escudo 2/1/1
-- Bônus do conjunto completo (código, BONUS_CONJUNTO): +2 / +1 / +0.
-- Conjunto completo: Leve 23 → 8, Média 14 → 4, Pesada 5 → 1.
--
-- Vale para as peças de conjunto (15 nomes × 3 classes) e as genéricas
-- peca_* das criaturas. Depois, a defesa das criaturas vestidas é refeita
-- pela conta do personagem: soma da defesa das peças + Agilidade.
--
-- Cópias antes: backup_itens_defesa_2026_11_07, backup_criaturas_defesa_2026_11_07.

BEGIN;

create table if not exists public.backup_itens_defesa_2026_11_07 as
  select * from public.itens where grupo = 'Armaduras';
alter table public.backup_itens_defesa_2026_11_07 enable row level security;
create table if not exists public.backup_criaturas_defesa_2026_11_07 as
  select * from public.criaturas;
alter table public.backup_criaturas_defesa_2026_11_07 enable row level security;

with nova(tipo, slot, def) as (values
  ('L','cabeca',1),('L','dorso',1),('L','ombro',0),('L','braco',1),('L','perna',1),('L','canela',0),('L','pe',0),('L','mao',2),
  ('M','cabeca',1),('M','dorso',1),('M','ombro',0),('M','braco',0),('M','perna',0),('M','canela',0),('M','pe',0),('M','mao',1),
  ('P','cabeca',0),('P','dorso',0),('P','ombro',0),('P','braco',0),('P','perna',0),('P','canela',0),('P','pe',0),('P','mao',1)
)
update public.itens i
   set defesa = n.def, atualizado_em = now()
  from nova n
 where i.grupo = 'Armaduras'
   and i.tipo_armadura = n.tipo and i.slot_equip = n.slot
   and (i.conjunto is not null or i.slug like 'peca\_%');

-- Defesa das criaturas vestidas, pela conta do personagem.
with conta as (
  select c.id, coalesce(sum(i.defesa), 0) as def
    from public.criaturas c
    cross join lateral jsonb_array_elements(coalesce(c.equipamento,'[]'::jsonb)) e
    join public.itens i on i.slug = e->>'slug'
   where e->>'slot' <> 'mochila' and i.grupo = 'Armaduras'
   group by c.id
)
update public.criaturas c
   set defesa = k.def + coalesce(c.agilidade, 0), atualizado_em = now()
  from conta k where k.id = c.id;

COMMIT;
