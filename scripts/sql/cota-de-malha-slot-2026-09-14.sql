-- ============================================================
-- Cota de Malha: slot errado no catálogo (14/09/2026)
-- ============================================================
-- Achado ao investigar "Porque o Yuldrous tem 21 de absorção e 32 de
-- resistência?": o Yuldrous vestia DUAS Cotas de Malha, uma no peito e outra
-- na cabeça.
--
-- Causa: `itens.cota_de_malha.slot_equip` estava 'cabeca'. As variantes
-- (Padmarashka, Verrogari) são 'peito', e a descrição da própria peça diz
-- "proteção do peito e das costas". O inventário equipa SEMPRE no slot do
-- catálogo (07-inventario/inventario.jsx, equipar) — por isso a segunda cota
-- foi parar na cabeça. As duas cotas no peito (Aldren e a primeira do
-- Yuldrous) são de quando o catálogo dizia 'peito': as linhas de `itens`
-- foram todas recriadas em 27/06/2026 (created_at) e nenhuma passou pelo
-- editor desde então (atualizado_em vazio), então o valor errado veio da
-- importação.
--
-- Era a ÚNICA peça equipada fora do slot do catálogo em todos os personagens.

-- 1. Catálogo.
update itens set slot_equip = 'peito' where slug = 'cota_de_malha';

-- 2. Yuldrous (64): a cota da cabeça volta para o inventário, desequipada.
update personagens p
set inventario = jsonb_set(p.inventario, '{itens}', (
  select jsonb_agg(
    case when it->>'instanceId' = '1781720835438-387e01'
         then it || '{"equipado": false, "slot": null}'::jsonb
         else it end
    order by ord)
  from jsonb_array_elements(p.inventario->'itens') with ordinality as t(it, ord)
))
where p.id = 64;
