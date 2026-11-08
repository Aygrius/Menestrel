-- Nenrode (criaturas.id = 248): o kit de armadura média de mercenário estava
-- na MOCHILA (o editor não vestia kit) — sem defesa nem absorção.
-- 08/11/2026: veste as 8 peças e regrava as colunas derivadas, já com o
-- bônus de conjunto completo (M: +3 absorção, +1 defesa), que passou a valer
-- para criatura no mesmo dia (criatura-formulas.jsx, derivadosDoEquipamento).
--
-- Conta: absorção 16 (peças) + 3 (conjunto) = 19
--        defesa 3 (elmo, cota, escudo) + 1 (conjunto) + 2 (Agilidade) = 6
--
-- BACKUP (estado anterior), para desfazer:
--   update criaturas set
--     equipamento = '[{"slot":"arma","slug":"machado_de_guerra"},{"qtd":1,"slot":"mochila","slug":"conjunto_media_mercenario"}]'::jsonb,
--     absorcao = 0, defesa = 2, armadura = 'L'
--   where id = 248;

update criaturas set
  equipamento = '[
    {"slot":"arma","slug":"machado_de_guerra"},
    {"slot":"braco","slug":"avambraco_mercenario"},
    {"slot":"cabeca","slug":"elmo_aberto_mercenario"},
    {"slot":"canela","slug":"perneira_mercenario"},
    {"slot":"dorso","slug":"cota_parcial_mercenario"},
    {"slot":"mao","slug":"escudo_aquecedor_mercenario"},
    {"slot":"ombro","slug":"espaldar_mercenario"},
    {"slot":"pe","slug":"bota_media_mercenario"},
    {"slot":"perna","slug":"greva_mercenario"}
  ]'::jsonb,
  absorcao = 19, defesa = 6, armadura = 'M',
  atualizado_em = now()
where id = 248;
