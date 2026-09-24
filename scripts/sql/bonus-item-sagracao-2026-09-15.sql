-- Bônus de SAGRAÇÃO passa a morar no ITEM (15/09/2026).
--
-- "A magia Sagração concede bônus a equipamentos de defesa e equipamentos de
-- ataque, esse bônus é permanente. [...] preciso de uma forma do mestre
-- alterar o bônus manualmente." Decisão: o bônus fica na instância do
-- inventário (`inventario.itens[].bonus`, valores 0/1/3/5/7/9) — arma soma no
-- dano, armadura e escudo na absorção — e o Mestre ajusta no modal do item.
--
-- Até aqui o único bônus era estado_atual.bonusArmas[slug]: por slug e só de
-- arma, lido pela batalha e sem editor desde 11/09/2026. Em 15/09/2026 havia
-- 6 valores vivos, cada um com UMA instância do slug no inventário:
--   Galadar  maca 3, clava 3 · Eco cajado 5 · Nihil punhal 5, arco_composto 5
--   Yuldrous marreta_de_guerra 5   (e zeros: Adrian, Nihil lança, Aldren)
--
-- ADITIVO de propósito: grava `bonus` nos itens e NÃO apaga bonusArmas. O
-- código anterior continua lendo bonusArmas; o novo lê o item. Pode rodar
-- antes ou depois do deploy, e rodar de novo não muda nada.

update public.personagens p
   set inventario = jsonb_set(
         p.inventario, '{itens}',
         (select jsonb_agg(
                   case
                     when (p.estado_atual->'bonusArmas'->>(it->>'slug'))::int in (1, 3, 5, 7, 9)
                      and coalesce((it->>'bonus')::int, 0) = 0
                     then it || jsonb_build_object('bonus', (p.estado_atual->'bonusArmas'->>(it->>'slug'))::int)
                     else it
                   end order by ord)
            from jsonb_array_elements(p.inventario->'itens') with ordinality as t(it, ord)))
 where p.estado_atual ? 'bonusArmas'
   and jsonb_typeof(p.inventario->'itens') = 'array'
   and jsonb_array_length(p.inventario->'itens') > 0
   and exists (
     select 1 from jsonb_each_text(p.estado_atual->'bonusArmas') b
      where b.value::int in (1, 3, 5, 7, 9));

-- Conferência: cada linha é um item consagrado.
-- select p.nome, it->>'slug' slug, it->>'bonus' bonus
--   from personagens p, jsonb_array_elements(p.inventario->'itens') it
--  where it ? 'bonus';
