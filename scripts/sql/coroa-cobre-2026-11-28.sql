-- Coroa de Cobre (28/11/2026). Usuário: "Adicione o item coroa de cobre e use
-- a imagem, que eu acho que já existe." A pintura existe (public/equip/coroa-cobre.webp);
-- a base coroa-cobre voltou ao vocabulário. Mesmo molde da Coroa de Prata;
-- preço entre a de marfim (500) e a de prata (5000).
insert into itens (slug, nome, grupo, ocupa, tipo, valor_latao, descricao, magico, slot_equip,
                   dano_l, dano_m, dano_p, origem, icone, efeito_transborda, tipo_equip, mod_vel, mod_kar, base)
select 'coroa_cobre', 'Coroa de Cobre', grupo, ocupa, tipo, 1000,
       'Jóia circular para a cabeça, fabricada em cobre.', false, slot_equip,
       0, 0, 0, 'Comum', icone, false, tipo_equip, mod_vel, mod_kar, 'coroa-cobre'
from itens where slug = 'coroa_prata'
  and not exists (select 1 from itens where slug = 'coroa_cobre');
