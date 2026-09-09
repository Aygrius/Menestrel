-- ============================================================
-- Corrige o dano das 22 criaturas de ataque "Garras"
-- ============================================================
-- Contexto: essas 22 vieram do import de 14/05/2026 com dano_100 = 0
-- (e portanto todos os tiers zerados). Nenhum outro tipo de ataque
-- foi afetado. Elas causavam 0 de dano em qualquer resultado.
--
-- Regra aplicada (confirmada contra o bestiário existente):
--     dano_100 = estágio + força + dano da faixa de peso
-- Os tiers 25/50/75% são ceil(dano_100 × n/4) — a mesma regra do
-- Arsenal da Ficha. O COMBATE não depende dessas 3 colunas (derivam
-- do dano_100 desde o fix de 30/08), mas a ficha da criatura no
-- Diário lê elas, então ficam gravadas.
--
-- ⚠️ AS 4 CRIATURAS DE PESO ≤ 20 (Coruja, Coruja Treinada, Gato,
-- Raposa) ficam de fora: nessa faixa a regra erra por +2/+3 nos
-- análogos já existentes (Morcego, Canário, Cão). Decida o ajuste
-- antes de incluí-las — ver o bloco comentado no fim.
-- ============================================================

begin;

with faixa(de, ate, dano) as (values
  (1,5,2),(6,20,4),(21,50,8),(51,100,12),(101,200,16),(201,350,20),(351,500,24),
  (501,1000,28),(1001,3000,32),(3001,4500,36),(4501,6500,40),(6501,9000,44),(9001,50000,48)
),
calc as (
  select c.id, (c.estagio + c.forca + f.dano) as d100
  from criaturas c
  join faixa f on c.peso between f.de and f.ate
  where c.ataque = 'Garras'
    and coalesce(c.dano_100, 0) = 0
    and c.peso > 20              -- as leves ficam de fora, ver aviso acima
)
update criaturas c
   set dano_100 = calc.d100,
       dano_25  = ceil(calc.d100 / 4.0),
       dano_50  = ceil(calc.d100 / 2.0),
       dano_75  = ceil(calc.d100 * 3 / 4.0)
  from calc
 where c.id = calc.id;

-- Confira antes de confirmar. Esperado: 18 linhas, Lobisomem com 21
-- (ou 33, se o peso dele já tiver ido para 400).
select nome, estagio, forca, peso, dano_25, dano_50, dano_75, dano_100
  from criaturas
 where ataque = 'Garras' and peso > 20
 order by estagio, nome;

commit;   -- troque por  rollback;  se os números não fecharem

-- ============================================================
-- Peso do Lobisomem (pedido em 30/08). Com 400 ele sobe para a faixa
-- 351–500 (dano 24) e o dano_100 vira 33 — alinhado com Leão 32 e
-- Tigre 33, ambos de estágio 7. Rode ANTES do UPDATE acima para que
-- o cálculo já use o peso novo.
-- ============================================================
-- update criaturas set peso = 400 where id = 86;

-- ============================================================
-- As 4 leves, se você decidir aplicar a correção observada
-- (+3 para peso ≤ 5, +2 para 6–20):
-- ============================================================
-- update criaturas set dano_100 = estagio + forca + 5,
--        dano_25 = ceil((estagio+forca+5)/4.0),
--        dano_50 = ceil((estagio+forca+5)/2.0),
--        dano_75 = ceil((estagio+forca+5)*3/4.0)
--  where ataque = 'Garras' and peso <= 5;
