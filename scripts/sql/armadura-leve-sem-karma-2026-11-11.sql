-- ARMADURA DE COURO SEM RESTRIÇÃO DE KARMA (11/11/2026)
-- Usuário: "Remova das armaduras de couro a restrição de mana."
-- As armaduras de couro são as peças da classe leve (tipo_armadura 'L', base
-- '*-leve'): colete, calça, braçadeira, caneleira, coturno, gálea, ombreira e
-- escudo broquel, em todos os conjuntos. Eram mod_kar -5. O Sabre (arma,
-- base 'arma-medio') fica como está. Cópia antes em backup_mod_kar_leve_2026_11_11.

create table if not exists backup_mod_kar_leve_2026_11_11 as
  select id, slug, nome, mod_kar from itens
  where tipo_armadura = 'L' and base like '%-leve' and coalesce(mod_kar, 0) < 0;

update itens set mod_kar = 0, atualizado_em = now()
  where tipo_armadura = 'L' and base like '%-leve' and coalesce(mod_kar, 0) < 0;

-- Desfazer:
-- update itens i set mod_kar = b.mod_kar from backup_mod_kar_leve_2026_11_11 b where i.id = b.id;
