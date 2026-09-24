-- Refeições especiais (24/09/2026)
-- Pedido do usuário: as carnes especiais viram Ração, Refeição e Banquete
-- próprios. Refeição = +20 Alimentação e +10 no atributo da carne; Banquete o
-- dobro; Ração a metade. Peso igual à versão comum; preço = carne × carnes gastas.
-- Idempotente: só insere o slug que ainda não existe.

insert into itens (slug, nome, tipo, grupo, icone, ocupa, origem, valor_latao, efeito_positivo, descricao)
select v.slug, v.nome, 'S', 'Consumíveis', 'ti-meat', v.ocupa, 'Comum', v.valor, v.efeito, v.descricao
from (values
  ('racao_sagrada',       'Ração Sagrada',       1.0,  500, 'Aumenta 10 de Alimentação e 5 de Sanidade.',    'Ração preparada com carne celestial, ressecada para a viagem.'),
  ('refeicao_sagrada',    'Refeição Sagrada',    0.5, 1000, 'Aumenta 20 de Alimentação e 10 de Sanidade.',   'Refeição preparada com carne celestial.'),
  ('banquete_sagrado',    'Banquete Sagrado',    0.5, 1500, 'Aumenta 40 de Alimentação e 20 de Sanidade.',   'Banquete preparado com carne celestial.'),
  ('racao_profana',       'Ração Profana',       1.0,  500, 'Aumenta 10 de Alimentação e 5 de Reputação.',   'Ração preparada com carne demoníaca, ressecada para a viagem.'),
  ('refeicao_profana',    'Refeição Profana',    0.5, 1000, 'Aumenta 20 de Alimentação e 10 de Reputação.',  'Refeição preparada com carne demoníaca.'),
  ('banquete_profano',    'Banquete Profano',    0.5, 1500, 'Aumenta 40 de Alimentação e 20 de Reputação.',  'Banquete preparado com carne demoníaca.'),
  ('racao_elemental',     'Ração Elemental',     1.0,  500, 'Aumenta 10 de Alimentação e 5 de Temperatura.', 'Ração preparada com carne dracônica, ressecada para a viagem.'),
  ('refeicao_elemental',  'Refeição Elemental',  0.5, 1000, 'Aumenta 20 de Alimentação e 10 de Temperatura.','Refeição preparada com carne dracônica.'),
  ('banquete_elemental',  'Banquete Elemental',  0.5, 1500, 'Aumenta 40 de Alimentação e 20 de Temperatura.','Banquete preparado com carne dracônica.'),
  ('racao_magica',        'Ração Mágica',        1.0,   50, 'Aumenta 10 de Alimentação e 5 de Saúde.',       'Ração preparada com carne mística, ressecada para a viagem.'),
  ('refeicao_magica',     'Refeição Mágica',     0.5,  100, 'Aumenta 20 de Alimentação e 10 de Saúde.',      'Refeição preparada com carne mística.'),
  ('banquete_magico',     'Banquete Mágico',     0.5,  150, 'Aumenta 40 de Alimentação e 20 de Saúde.',      'Banquete preparado com carne mística.')
) as v(slug, nome, ocupa, valor, efeito, descricao)
where not exists (select 1 from itens i where i.slug = v.slug);
