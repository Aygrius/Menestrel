-- criaturas-arma-natural-estagio-2026-11-06.sql
--
-- Duas decisões do usuário em 06/11/2026, depois da simulação de batalha:
--
-- 1. "O mesmo cálculo dos personagens": o L/M/P da criatura soma o nível no
--    grupo de armas, e o nível da criatura é o ESTÁGIO. Mesma conta de
--    src/09-bestiario/criatura-formulas.jsx (derivadosDoEquipamento):
--      L/M/P     = dano_l/m/p da arma + atributo de ajuste + estágio
--      Dano 100% = dano da arma + Força; 25/50/75% arredondados pra cima.
--
-- 2. "Equipe a peça natural de cada uma": as 110 criaturas que o recálculo de
--    14/09 deixou sem ataque (ataque natural apagado "até as armas naturais
--    entrarem no catálogo") recebem a arma natural do catálogo no slot 'arma'.
--    O nome do ataque original se perdeu naquele recálculo, então a arma foi
--    escolhida pelo tipo da criatura (lista abaixo).
--
-- Cópia antes da mudança: public.backup_criaturas_2026_11_06.

create table if not exists public.backup_criaturas_2026_11_06 as
  select * from public.criaturas;
-- Sem RLS a cópia ficaria legível pela API pública, como as outras backup_*.
alter table public.backup_criaturas_2026_11_06 enable row level security;

with natural_(id, slug) as (values
  -- Animais
  (115,'coice'),(208,'mordida'),(218,'cauda'),(181,'chifre'),(177,'chifre'),(148,'coice'),
  (157,'coice'),(168,'coice'),(175,'coice'),(112,'mordida'),(179,'mordida'),(206,'chifre'),
  (49,'garra'),(138,'patada'),(134,'patada'),(132,'garra'),(73,'garra'),(143,'chifre'),
  (139,'garra'),(80,'garra'),(74,'mordida'),(214,'chifre'),(36,'bico'),(122,'garra'),
  (51,'mordida'),(205,'chifre'),(141,'garra'),(156,'mordida'),(170,'chifre'),(180,'mordida'),
  (203,'mordida'),(142,'garra'),(163,'garra'),(153,'chifre'),(201,'mordida'),(166,'garra'),
  -- Celestiais
  (193,'garra'),(155,'toque'),(4,'toque'),(11,'toque'),(12,'toque'),(13,'toque'),(9,'toque'),
  (14,'toque'),(82,'toque'),
  -- Civilizado
  (184,'patada'),
  -- Dragões
  (234,'halito'),(226,'halito'),(213,'halito'),(229,'halito'),(225,'halito'),
  -- Elementais e paraelementais
  (133,'halito'),(151,'halito'),(183,'halito'),(114,'halito'),(171,'halito'),(190,'halito'),
  (207,'halito'),(140,'halito'),(55,'halito'),(60,'halito'),(67,'halito'),(45,'halito'),
  (56,'halito'),(61,'halito'),(69,'halito'),(44,'halito'),(10,'halito'),(7,'halito'),
  (192,'halito'),(200,'halito'),
  -- Infernais
  (118,'garra'),(123,'garra'),(178,'garra'),(194,'garra'),(70,'garra'),(219,'garra'),
  (241,'garra'),(52,'toque'),(244,'garra'),(243,'garra'),(54,'toque'),(57,'toque'),(59,'toque'),
  -- Místicos
  (210,'patada'),(195,'garra'),(173,'patada'),(15,'toque'),(64,'bico'),(108,'garra'),
  (6,'halito'),(63,'halito'),(53,'toque'),(164,'garra'),(111,'garra'),(128,'mordida'),
  (120,'mordida'),(162,'coice'),(199,'mordida'),(96,'toque'),(167,'chifre'),
  -- Mortos
  (144,'patada'),(1,'toque'),(3,'toque'),(5,'toque'),(98,'patada'),(129,'toque'),(8,'toque'),
  (85,'mordida'),(83,'mordida')
)
update public.criaturas c
   set equipamento = coalesce(c.equipamento, '[]'::jsonb)
                     || jsonb_build_array(jsonb_build_object('slug', n.slug, 'slot', 'arma'))
  from natural_ n
 where n.id = c.id
   and coalesce(c.dano_100, 0) = 0
   and not exists (select 1 from jsonb_array_elements(coalesce(c.equipamento, '[]'::jsonb)) e
                    where e->>'slug' = n.slug);

-- Recalcula o ataque das 163 pela primeira arma equipada (mão direita, mão
-- esquerda, depois 'arma' na ordem), como armasEquipadas.
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
  select p.id, (p.a).nome as ataque,
         coalesce((p.a).dano_l, 0) as l, coalesce((p.a).dano_m, 0) as m, coalesce((p.a).dano_p, 0) as p_,
         case upper(coalesce((p.a).ajuste_atributo, ''))
           when 'FOR' then coalesce(c.forca, 0)
           when 'AGI' then coalesce(c.agilidade, 0)
           when 'PER' then coalesce(c.percepcao, 0)
           when 'AUR' then coalesce(c.aura, 0)
           when 'FIS' then coalesce(c.fisico, 0)
           when 'CAR' then coalesce(c.carisma, 0)
           else 0 end + coalesce(c.estagio, 0) as bonus,
         greatest(0, coalesce((p.a).dano, 0) + coalesce(c.forca, 0)) as d100
    from primeira p join public.criaturas c on c.id = p.id
   where (p.a).slug is not null
)
update public.criaturas c
   set ataque   = k.ataque,
       dano_l   = k.l + k.bonus,
       dano_m   = k.m + k.bonus,
       dano_p   = k.p_ + k.bonus,
       dano_100 = k.d100,
       dano_25  = ceil(k.d100 / 4.0),
       dano_50  = ceil(k.d100 / 2.0),
       dano_75  = ceil(3 * k.d100 / 4.0),
       atualizado_em = now()
  from conta k
 where k.id = c.id;
