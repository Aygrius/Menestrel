-- ============================================================
-- itens.magico deixa de ser calculado — 30/10/2026
-- ============================================================
-- "a escolha do item ser mágico deve ser de quem o criou" (usuário).
--
-- Antes: magico boolean GENERATED ALWAYS AS (magia IS NOT NULL AND
-- magia <> '') — o banco recusava qualquer gravação nele, e o editor o
-- mostrava travado.
--
-- DROP EXPRESSION vira a coluna comum MANTENDO o valor que cada item já
-- tem: nenhum item muda de mágico para não-mágico com isto. Daqui em
-- diante, escolher uma Magia no editor não marca mais o item sozinho.
--
-- A PEÇA com bônus de Sagração (+1, +3...) é mágica de qualquer jeito —
-- isso é regra do cliente (itemEhMagico, 01-core/inventario-helpers.jsx),
-- não do catálogo.
--
-- ORDEM: este script ANTES do deploy do cliente que grava `magico`. O
-- cliente antigo nunca manda a coluna, então rodar isto primeiro é seguro;
-- o contrário faria toda edição de item falhar ("column magico can only be
-- updated to DEFAULT").
--
-- Desfazer (volta a ser calculada; os valores escolhidos à mão se perdem):
--   alter table public.itens drop column magico;
--   alter table public.itens add column magico boolean
--     generated always as (magia is not null and magia <> '') stored;

alter table public.itens alter column magico drop expression;
alter table public.itens alter column magico set default false;
update public.itens set magico = false where magico is null;
