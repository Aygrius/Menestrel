-- O usuário excluiu a Máscara de Cobre (28/11/2026: "Os itens que eu excluí é
-- para saírem"). O único exemplar que ainda usava a base mascara-cobre — o
-- Olhar da Infâmia, máscara mágica — passa para a base vizinha, mascara-latao,
-- que tem a mesma pintura (máscara de ferro rebitado).
update itens set base = 'mascara-latao'
where slug = 'mascara_olhar_da_infamia' and base = 'mascara-cobre';
