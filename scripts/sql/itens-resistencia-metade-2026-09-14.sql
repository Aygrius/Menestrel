-- ============================================================
-- Resistência de todos os equipamentos pela metade (14/09/2026)
-- ============================================================
-- "Diminua a resistência de todos os equipamentos pela metade no banco."
-- (usuário, 14/09/2026)
--
-- Arredondamento PARA CIMA, a regra do sistema ("sempre pra cima"): as 37
-- resistências ímpares são todas de armas (Arco Élfico 11 → 6). Armaduras
-- tinham resistencia = absorcao × 2 sem exceção e passam a ter
-- resistencia = absorcao — por isso FATOR_RESISTENCIA_CRIATURA
-- (01-core/inventario-helpers.jsx) foi de 2 para 1 no mesmo dia.
--
-- Estado no momento: nenhuma batalha ativa e nenhuma instância de item com
-- desgaste gravado (`res`) nos inventários — nada a ajustar fora de `itens`.
-- Aplicado uma única vez; rodar de novo divide outra vez.
update itens
set resistencia = ceil(resistencia / 2.0)::smallint
where resistencia is not null;
