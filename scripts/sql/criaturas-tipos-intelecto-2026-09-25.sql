-- Tipos e intelecto das criaturas (25/09/2026)
-- Pedido do usuário: "No intelecto das criaturas, remova o 'i' e troque por
-- -2. No tipo de criatura, vamos reduzir a quantidade: Gigante vai virar
-- Civilizado. Construído e Monstro vão virar Místico."
-- Levantamento antes de rodar: 10 'Construído', 0 'Gigante', 0 'Monstro',
-- 80 intelecto 'i'. Idempotente.

update public.criaturas set tipo = 'Civilizado' where tipo = 'Gigante';
update public.criaturas set tipo = 'Místico'    where tipo in ('Construído', 'Monstro');
update public.criaturas set intelecto = '-2'    where intelecto = 'i';
