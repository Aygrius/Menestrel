-- Tapa-olho de Couro e Tapa-olho de Algodão (28/11/2026).
-- Usuário: "Vamos criar o item e imagem do tapa olho de couro, e o tapa olho de algodão."
-- Mesmo molde dos tapa-olhos de metal (rosto, vestimenta, 0.2); preço e
-- origem na faixa das luvas de couro/algodão. Bases novas em
-- src/01-core/bases-item.jsx; pinturas em public/equip/tapa-olho-{couro,algodao}.webp.
insert into itens (slug, nome, grupo, ocupa, tipo, valor_latao, descricao, magico,
                   slot_equip, dano_l, dano_m, dano_p, origem, icone,
                   efeito_transborda, tipo_equip, mod_vel, mod_kar, base)
select v.slug, v.nome, 'Vestimentas', 0.2, 'S', v.valor, v.descricao, false,
       'rosto', 0, 0, 0, 'Comum', 'ti-masks-theater',
       false, 'vestimenta', 0, 0, v.base
from (values
  ('tapa_olho_couro',   'Tapa-olho de Couro',   300, 'Tapa-olho feito de couro curtido, preso por uma tira.',   'tapa-olho-couro'),
  ('tapa_olho_algodao', 'Tapa-olho de Algodão', 150, 'Tapa-olho de algodão acolchoado, preso por um cordão.', 'tapa-olho-algodao')
) as v(slug, nome, valor, descricao, base)
where not exists (select 1 from itens i where i.slug = v.slug);
