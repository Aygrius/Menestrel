-- Elemento da criatura (18/09/2026).
--
-- "Quero uma coluna elemento. As criaturas que estiverem com o campo vazio eu
-- vou informar depois." (usuário)
--
-- POR QUE UMA COLUNA NOVA, e não continuar lendo `subtipo`: o editor declara
-- subtipo como lista fechada de elementos (Fogo/Ar/Água/Terra/Celestial/
-- Infernal), mas os dados nunca obedeceram. Levantamento de 18/09/2026, sobre
-- ~218 criaturas:
--
--     15   um dos quatro elementos  (Ar 9, Fogo 3, Terra 2, Água 1)
--     56   vazio
--   ~147   ESPÉCIE: Cavalo, Lobo, Esqueleto, Goblin, Orc, Gárgula, Lobisomem…
--
-- Com a ficha do bestiário passando a mostrar um card "Elemento", o rótulo
-- ficava mentindo para a maioria do catálogo — mostrava "Cavalo" sob
-- "Elemento". Não era o ícone que errava, era o campo.
--
-- O QUE ESTE SCRIPT MOVE, e o que NÃO move:
-- Move os 15 em que subtipo guarda EXATAMENTE um dos quatro elementos, e
-- limpa o subtipo deles — ali subtipo nunca foi espécie, então não há espécie
-- a preservar. É uma mudança de lugar, não uma exclusão.
--
-- NÃO move os ambíguos, de propósito (conferidos um a um antes de decidir):
--   · 'Elemental da Água/Terra/Fogo' (9) — o nome DIZ o elemento, mas o valor
--     é a espécie da criatura. Inferir Água daqui é palpite sobre as regras do
--     jogo, e o usuário disse que informa o resto depois.
--   · 'Paraelemental' (4) — espécie (Elétrico, Etéreo, Viscoso, Vulcânico).
--   · 'Infernal' (8) — repete tipo E plano nas mesmas linhas; não é elemento.
--   · 'Celestial' (3) — três Wyverns tipo Dragão; ambíguo.
--
-- Sem NOT NULL e sem default: 203 criaturas nascem com elemento NULL e a ficha
-- mostra "—", que é a verdade ("ainda não informado") em vez de um elemento
-- chutado.

alter table public.criaturas
  add column if not exists elemento text;

comment on column public.criaturas.elemento is
  'Elemento da criatura (Fogo/Ar/Água/Terra). NULL = não informado. '
  'Separado de `subtipo`, que guarda ESPÉCIE (Cavalo, Goblin, Esqueleto…).';

-- Move os 15 em que subtipo era, de fato, o elemento.
update public.criaturas
   set elemento = subtipo,
       subtipo  = null
 where subtipo in ('Fogo', 'Ar', 'Água', 'Terra');
