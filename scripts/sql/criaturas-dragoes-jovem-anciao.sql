-- ============================================================
-- Variantes Jovem / Ancião para a classe Dragão  (pedido 09/09/2026)
-- ============================================================
-- Para cada criatura de tipo = 'Dragão' cria duas cópias:
--   Jovem  → fator 0.50  (-50%)
--   Ancião → fator 1.25  (+25%)
-- aplicados, com arredondamento PARA CIMA (ceil), sobre:
--   Atributos (intelecto, aura, carisma, força, físico, agilidade,
--              percepção), Estágio, Absorção, Velocidade e Peso.
--
-- Tudo o mais que o bestiário guarda é DERIVADO desses campos — as
-- fórmulas abaixo foram conferidas contra os 8 dragões adultos e
-- batem em 100% deles, então as cópias são recalculadas em vez de
-- herdarem os números do adulto:
--   energia_fisica  = ceil(2*sqrt(peso) + físico)
--   energia_heroica = (20 + aura) * estágio      -- base 20 do Coletivo dos dragões
--   defesa          = agilidade + 8              -- absorção > 0
--   dano_l/m/p      = estágio + agilidade + 1
--   dano_100        = estágio + força + faixa(peso) + 4   -- +4 = "Hálito Encantado"
--   dano_25/50/75   = ceil(dano_100 * n/4)       -- mesma regra do Arsenal da Ficha
--
-- Faixa de peso: mesma tabela do criaturas-garras-dano.sql, com a
-- última faixa (48) estendida — Dragão Imperial (64t) e Leviatã (100t)
-- já passam de 50.000 hoje e conferem com 48.
-- ============================================================

begin;

with faixa(de, ate, dano) as (values
  (1,5,2),(6,20,4),(21,50,8),(51,100,12),(101,200,16),(201,350,20),(351,500,24),
  (501,1000,28),(1001,3000,32),(3001,4500,36),(4501,6500,40),(6501,9000,44),
  (9001,2000000000,48)
),
variante(sufixo, fator) as (values ('Jovem', 0.50), ('Ancião', 1.25)),
esc as (
  select
    c.nome || ' ' || v.sufixo as nome,
    c.tipo, c.subtipo, c.descricao, c.armadura, c.tipo_armadura, c.ataque,
    c.plano, c.coletivo, c.magia, c.magia_n, c.tecnicas_especiais, c.habilidades,
    ceil(c.estagio    * v.fator)::int as estagio,
    ceil(c.absorcao   * v.fator)::int as absorcao,
    ceil(c.velocidade * v.fator)::int as velocidade,
    ceil(c.peso       * v.fator)::int as peso,
    ceil(c.aura       * v.fator)::int as aura,
    ceil(c.carisma    * v.fator)::int as carisma,
    ceil(c.forca      * v.fator)::int as forca,
    ceil(c.fisico     * v.fator)::int as fisico,
    ceil(c.agilidade  * v.fator)::int as agilidade,
    ceil(c.percepcao  * v.fator)::int as percepcao,
    ceil(c.intelecto::numeric * v.fator)::int as intelecto
  from criaturas c
  cross join variante v
  where c.tipo = 'Dragão'
),
novo as (
  select e.*,
    ceil(2 * sqrt(e.peso) + e.fisico)::int                                    as energia_fisica,
    ((20 + e.aura) * e.estagio)                                               as energia_heroica,
    (case when e.absorcao > 0 then e.agilidade + 8 else e.agilidade end)      as defesa,
    (e.estagio + e.agilidade + 1)                                             as dano_lmp,
    (e.estagio + e.forca + f.dano + 4)                                        as dano_100
  from esc e
  join faixa f on e.peso between f.de and f.ate
)
insert into criaturas (
  nome, tipo, subtipo, descricao, armadura, tipo_armadura, ataque,
  plano, coletivo, magia, magia_n, tecnicas_especiais, habilidades,
  estagio, absorcao, velocidade, peso,
  aura, carisma, forca, fisico, agilidade, percepcao, intelecto,
  energia_fisica, energia_heroica, defesa,
  dano_l, dano_m, dano_p, dano_25, dano_50, dano_75, dano_100
)
select
  n.nome, n.tipo, n.subtipo, n.descricao, n.armadura, n.tipo_armadura, n.ataque,
  n.plano, n.coletivo, n.magia, n.magia_n, n.tecnicas_especiais, n.habilidades,
  n.estagio, n.absorcao, n.velocidade, n.peso,
  n.aura, n.carisma, n.forca, n.fisico, n.agilidade, n.percepcao, n.intelecto::text,
  n.energia_fisica, n.energia_heroica, n.defesa,
  n.dano_lmp, n.dano_lmp, n.dano_lmp,
  ceil(n.dano_100 / 4.0)::int, ceil(n.dano_100 / 2.0)::int, ceil(n.dano_100 * 3 / 4.0)::int,
  n.dano_100
from novo n
where not exists (select 1 from criaturas x where x.nome = n.nome);

-- Confira antes de confirmar: esperado 16 linhas novas (8 dragões × 2).
select nome, estagio, intelecto, aura, carisma, forca, fisico, agilidade, percepcao,
       absorcao, velocidade, peso, energia_fisica, energia_heroica, defesa,
       dano_l, dano_25, dano_50, dano_75, dano_100
  from criaturas
 where tipo = 'Dragão'
 order by nome;

commit;   -- troque por  rollback;  se os números não fecharem
