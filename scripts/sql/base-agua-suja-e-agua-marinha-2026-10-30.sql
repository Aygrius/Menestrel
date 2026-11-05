-- A gota turva e a gema (30/10/2026)
-- Água Suja tinha base 'agua' e pegava a pintura da gota limpa; ganhou base
-- própria (agua_suja, em 01-core/bases-item.jsx). Água Marinha é pedra
-- preciosa e também estava em 'agua'; vai para 'gema'.
-- APLICADO EM PRODUÇÃO em 30/10/2026.
update itens set base = 'agua_suja' where slug = 'agua_suja';
update itens set base = 'gema' where slug = 'agua_marinha';
