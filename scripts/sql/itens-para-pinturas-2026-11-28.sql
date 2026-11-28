-- ITENS E RECEITAS PARA AS PINTURAS QUE SOBRAVAM (28/11/2026).
-- Usuário: "Se não tiver, vamos criar o item (e sua receita) para usar sua imagem."
-- Já existiam (nada a fazer): Mochila, Odre, piercings e pingentes, Rabeca,
-- Triângulo, Viela, Sapatos, Tiaras, pelos e penas (com outros nomes: Pêlo
-- Sagrado, Pena Titânica…), e as quatro moedas.
--
-- Itens novos: Máscara de Couro, de Ferro e de Porcelana; Tapa-olho de Prata.
-- Receitas novas (linha em `receitas` + item "Receita de …" a 10% do valor,
-- como as de capuz e luva): as três máscaras e os tapa-olhos de prata, couro,
-- algodão e ouro (este já tinha a linha, faltava o item). Moeda de Latão
-- ganha a linha da metalurgia, igual à de prata (moedas não têm item-receita).
-- Porcelana não existe como material: a máscara usa Vidro.
begin;

-- Os itens, no molde da Máscara de Latão e do Tapa-olho de Ouro.
insert into itens (slug, nome, grupo, ocupa, tipo, valor_latao, descricao, magico, slot_equip,
                   dano_l, dano_m, dano_p, origem, icone, efeito_transborda, tipo_equip, mod_vel, mod_kar, base)
select v.slug, v.nome, m.grupo, m.ocupa, m.tipo, v.valor, v.descricao, false, m.slot_equip,
       0, 0, 0, v.origem, m.icone, false, m.tipo_equip, 0, 0, v.base
from (values
  ('mascara_couro',     'Máscara de Couro',     400, 'Máscara de couro costurado que cobre o rosto.',              'Comum', 'mascara-couro',     'mascara_latao'),
  ('mascara_ferro',     'Máscara de Ferro',     300, 'Máscara de ferro rebitado que protege o rosto.',             'Comum', 'mascara-ferro',     'mascara_latao'),
  ('mascara_porcelana', 'Máscara de Porcelana', 800, 'Máscara nobre de porcelana pintada.',                        'Raro',  'mascara-porcelana', 'mascara_latao'),
  ('tapa_olho_prata',   'Tapa-olho de Prata',  1000, 'Tapa-olho feito de prata.',                                  'Raro',  'tapa-olho-prata',   'tapa_olho_ouro')
) as v(slug, nome, valor, descricao, origem, base, molde)
join itens m on m.slug = v.molde
where not exists (select 1 from itens x where x.slug = v.slug);

-- As receitas de fabricação.
insert into receitas (resultado_slug, habilidade_key, dificuldade, dias, materiais, rende, aprende_com, minutos)
select v.slug, v.hab, 'D', v.dias, v.materiais::jsonb, v.rende, v.aprende, v.minutos
from (values
  ('mascara_couro',     'artesanato', 5,  '[{"qtd":8,"slug":"couro_curtido"},{"qtd":3,"slug":"corda_material"}]', 1, null, null),
  ('mascara_ferro',     'artesanato', 5,  '[{"qtd":2,"slug":"ferro"}]', 1, null, null),
  ('mascara_porcelana', 'artesanato', 8,  '[{"qtd":3,"slug":"vidro"}]', 1, null, null),
  ('tapa_olho_prata',   'artesanato', 8,  '[{"qtd":1,"slug":"prata"}]', 1, null, null),
  ('tapa_olho_couro',   'artesanato', 3,  '[{"qtd":4,"slug":"couro_curtido"},{"qtd":2,"slug":"corda_material"}]', 1, null, null),
  ('tapa_olho_algodao', 'artesanato', 3,  '[{"qtd":4,"slug":"algodao"},{"qtd":2,"slug":"corda_material"}]', 1, null, null),
  ('moeda_latao',       'metalurgia', 1,  '[{"qtd":10,"slug":"latao"},{"qtd":1,"slug":"equipamento_de_ferreiro","ferramenta":true}]', 30, 'metalurgia', 720)
) as v(slug, hab, dias, materiais, rende, aprende, minutos)
where not exists (select 1 from receitas r where r.resultado_slug = v.slug);

-- Os itens "Receita de …", no molde da Receita de Piercing de Prata.
insert into itens (slug, nome, grupo, ocupa, tipo, valor_latao, descricao, magico,
                   dano_l, dano_m, dano_p, origem, icone, efeito_transborda, mod_vel, mod_kar, base)
select 'receita_' || i.slug, 'Receita de ' || i.nome, m.grupo, m.ocupa, m.tipo,
       greatest(1, round(i.valor_latao * 0.1)),
       'Instruções para fabricar ' || i.nome || ': os materiais, as medidas e a ordem do trabalho. Quem a tem na mochila pode tentar na bancada; a receita não se gasta.',
       false, 0, 0, 0, m.origem, m.icone, false, 0, 0, m.base
from itens i
join itens m on m.slug = 'receita_piercing_prata'
where i.slug in ('mascara_couro', 'mascara_ferro', 'mascara_porcelana',
                 'tapa_olho_prata', 'tapa_olho_couro', 'tapa_olho_algodao', 'tapa_olho_ouro')
  and not exists (select 1 from itens x where x.slug = 'receita_' || i.slug);

commit;
