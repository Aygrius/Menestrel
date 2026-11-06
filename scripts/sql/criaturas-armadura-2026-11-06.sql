-- criaturas-armadura-2026-11-06.sql
--
-- Pedido do usuário em 06/11/2026, depois do estudo de batalha:
--   "Dê armadura para as criaturas, um orc capitão tem mais armadura que um
--    orc comum, e também não precisa de ser todas as partes de armadura,
--    acrescente de forma orgânica. Criaturas tipo dragão, cobra, não usam
--    armadura."
--
-- Quem veste: os humanoides que lutam com arma feita, mais o Gigante da Neve
-- (peles) e o Gigante da Colina. Bichos, dragões, cobras, elementais,
-- espíritos, demônios e o Trol, o Ciclope e o Duende ficam sem nada.
--
-- As peças são as genéricas do catálogo (peca_*), por peso:
--   Leve  (couro, peles)  defesa alta, absorção baixa  — goblins, orcs, ogros,
--                                                        gigantes, centauro,
--                                                        minotauro, vampiros
--   Média (malha)          — dragonianos (o cadastro antigo já pedia cota de
--                            malha, com itens que saíram do catálogo)
--   Pesada (placas)        defesa baixa, absorção alta — o Vingador
-- O posto sobe, as peças aumentam: Orc 1 peça, Capitão 5, Rei 7.
--
-- Mesma conta do personagem (criatura-formulas.jsx, derivadosDoEquipamento):
--   defesa   = soma da defesa das peças + Agilidade
--   absorção = soma da absorção das peças
--   tipo     = o da peça do dorso; sem ela, Leve
-- As peças antigas que não existem mais no catálogo saem do equipamento.
--
-- Cópia antes: public.backup_criaturas_armadura_2026_11_06.

BEGIN;

create table if not exists public.backup_criaturas_armadura_2026_11_06 as
  select * from public.criaturas;
alter table public.backup_criaturas_armadura_2026_11_06 enable row level security;

with veste(id, pecas) as (values
  -- Goblins
  (62,  array['peca_calca']),
  (65,  array['peca_calca','peca_colete']),
  (68,  array['peca_calca','peca_colete','peca_galea','peca_escudo_broquel']),
  -- Orcs
  (84,  array['peca_colete']),
  (79,  array['peca_colete','peca_calca','peca_galea','peca_ombreira','peca_coturno']),
  (99,  array['peca_colete','peca_calca','peca_galea','peca_ombreira','peca_coturno','peca_bracadeira','peca_caneleira']),
  -- Ogros
  (121, array['peca_calca']),
  (125, array['peca_calca','peca_colete','peca_ombreira']),
  (136, array['peca_calca','peca_colete','peca_ombreira','peca_galea','peca_bracadeira']),
  -- Dragonianos (malha)
  (245, array['peca_cota_parcial','peca_greva','peca_bota']),
  (240, array['peca_galea','peca_caneleira','peca_ombreira']),
  (246, array['peca_cota_parcial','peca_greva','peca_bota','peca_espaldar','peca_avambraco']),
  (247, array['peca_cota_parcial','peca_greva','peca_bota','peca_espaldar','peca_avambraco','peca_elmo_aberto','peca_perneira']),
  -- Gigantes
  (185, array['peca_colete','peca_coturno']),
  (196, array['peca_colete','peca_calca','peca_coturno','peca_bracadeira']),
  -- Místicos
  (159, array['peca_colete','peca_bracadeira']),
  (117, array['peca_ombreira','peca_bracadeira']),
  -- Mortos
  (72,  array['peca_galea']),
  (172, array['peca_cota_completa','peca_greva_fechada','peca_bota_pesada','peca_espaldar_pesado','peca_manopla','peca_elmo_fechado','peca_perneira_pesada']),
  (119, array['peca_colete']),
  (127, array['peca_colete','peca_ombreira','peca_bracadeira'])
),
novo as (
  select c.id,
         -- fica: armas, mochila e o que existe no catálogo e não é armadura
         coalesce((select jsonb_agg(e) from jsonb_array_elements(coalesce(c.equipamento,'[]'::jsonb)) e
                    where e->>'slot' = 'mochila'
                       or exists (select 1 from public.itens i where i.slug = e->>'slug' and i.grupo <> 'Armaduras')), '[]'::jsonb)
         || (select jsonb_agg(jsonb_build_object('slug', i.slug,
                                                 'slot', case i.slot_equip when 'mao' then 'mao_e' else i.slot_equip end))
               from unnest(v.pecas) p join public.itens i on i.slug = p) as equipamento
    from public.criaturas c join veste v on v.id = c.id
)
update public.criaturas c set equipamento = n.equipamento
  from novo n where n.id = c.id;

-- Defesa, absorção e tipo das 21, pela conta do personagem.
with conta as (
  select c.id,
         coalesce(sum(i.defesa), 0) as def, coalesce(sum(i.absorcao), 0) as abs,
         max(case when e->>'slot' in ('dorso','peito') then i.tipo_armadura end) as tipo
    from public.criaturas c
    cross join lateral jsonb_array_elements(coalesce(c.equipamento,'[]'::jsonb)) e
    join public.itens i on i.slug = e->>'slug'
   where c.id in (62,65,68,84,79,99,121,125,136,245,240,246,247,185,196,159,117,72,172,119,127)
     and e->>'slot' <> 'mochila' and i.grupo <> 'Armas'
   group by c.id
)
update public.criaturas c
   set defesa = k.def + coalesce(c.agilidade, 0),
       absorcao = k.abs,
       armadura = coalesce(k.tipo, 'L'),
       atualizado_em = now()
  from conta k where k.id = c.id;

COMMIT;
