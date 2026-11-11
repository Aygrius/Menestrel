-- REBALANCEIO DA RESTRIÇÃO DE KARMA (11/11/2026)
-- Usuário: "Adicione restrição de karma nas armas pesadas. Para equilibrar a
-- restrição de mana, vamos rever os valores de punição." Escolhas dele:
--   armadura, por peça (as 8 do conjunto somam): média −2, pesada −3
--     (eram −10 e −15: o conjunto zerava o karma de qualquer personagem);
--   armas: médias −2 (CM, EM, PM), pesadas −4 (CP, EP, PP) (eram −5 e −10).
-- A leve (couro) já estava sem restrição (armadura-leve-sem-karma-2026-11-11.sql).
-- Cópia antes em backup_mod_kar_rebalanceio_2026_11_11.

create table if not exists backup_mod_kar_rebalanceio_2026_11_11 as
  select id, slug, nome, mod_kar from itens where coalesce(mod_kar, 0) < 0;

update itens set mod_kar = -2, atualizado_em = now() where dano is null and tipo_armadura = 'M' and coalesce(mod_kar, 0) < 0;
update itens set mod_kar = -3, atualizado_em = now() where dano is null and tipo_armadura = 'P' and coalesce(mod_kar, 0) < 0;
update itens set mod_kar = -2, atualizado_em = now() where dano is not null and grupo_armas in ('CM', 'EM', 'PM');
update itens set mod_kar = -4, atualizado_em = now() where dano is not null and grupo_armas in ('CP', 'EP', 'PP');

-- Desfazer:
-- update itens i set mod_kar = b.mod_kar from backup_mod_kar_rebalanceio_2026_11_11 b where i.id = b.id;
