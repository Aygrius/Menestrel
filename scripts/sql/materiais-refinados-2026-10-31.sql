-- ============================================================================
-- MATERIAIS REFINADOS E A NOVA CONTA DAS RECEITAS (31/10/2026)
-- ============================================================================
-- Pedido do usuário (lista de conversões "5x A > 1x B"), com as respostas:
--   Aço = 5 Ferro + 1 Carvão · Latão = 5 Moedas de Latão · Lenha entra no
--   lugar da Madeira (instrumentos, arcos, o que usa madeira) · Carvão serve
--   ao Aço · ferramenta dura 10 usos · habilidades: Metalurgia (metais),
--   Artesanato (couro, fibras, óleo, marfim), Carpintaria (lenha, carvão),
--   Medicina (elixires) · material nobre vale o mesmo que o comum ("o
--   roleplay que conta") · "Refaça a conta das receitas" · sem Pedra, sem
--   Terra e sem nada de Porcelana; Quartzo fica só como gema · "Itens
--   mágicos não possuem receita, não são fabricáveis".
--   RITUAIS: a Terra vira Osso Animal ("Troca por outro ingrediente, osso
--   animal"). O Óleo refinado não entra em ritual nenhum: "No ritual o item
--   precisa ser específico".
--   ELIXIR DA EUFORIA por HORAS ("6 horas, 12 horas, 36 horas"): coluna nova
--   itens.efeito_duracao_horas (src/01-core/efeito-temporario.jsx).
--   "Inina, Nex e Subella são plantas e não ervas."
--
-- O formato novo de material (src/01-core/fabricacao.jsx):
--   { slugs: [...], qtd, nome }  qualquer mistura dos slugs
--   { slug, qtd, ferramenta }    gasta 1 uso, não a peça
-- ============================================================================

-- ── 0. O prazo em horas ──────────────────────────────────────────────────────
alter table public.itens add column if not exists efeito_duracao_horas smallint;
comment on column public.itens.efeito_duracao_horas is
  'Efeito com prazo em HORAS do relógio da mesa (vence no instante). Vale no lugar de efeito_duracao_dias.';

-- ── 1. Matéria-prima e refinados que faltavam ───────────────────────────────
insert into public.itens (slug, nome, grupo, tipo, ocupa, origem, icone, valor_latao, descricao, magico) values
  ('algodoeiro', 'Algodoeiro', 'Consumíveis', 'S', 0.2, 'Comum', 'ti-plant', 1,
   'Capulhos colhidos do algodoeiro, ainda com a semente. Cinco deles, cardados e fiados, dão uma meada de algodão.', false),
  ('bicho_de_seda', 'Bicho de Seda', 'Consumíveis', 'S', 0.1, 'Comum', 'ti-bug', 8,
   'Casulos de bicho-da-seda, inteiros. Fervidos e desenrolados com paciência, cinco deles dão uma meada de seda.', false),
  ('planta_inina', 'Planta Inina', 'Consumíveis', 'S', 0.2, 'Comum', 'ti-plant', 25,
   'Planta de folhas miúdas e amargas, de cheiro forte. Macerada, é a base do Elixir da Coragem I.', false),
  ('planta_nex', 'Planta Nex', 'Consumíveis', 'S', 0.2, 'Comum', 'ti-plant', 75,
   'Planta de talo roxo que cresce à sombra das pedras. Base do Elixir da Coragem II.', false),
  ('planta_subella', 'Planta Subella', 'Consumíveis', 'S', 0.2, 'Comum', 'ti-plant', 225,
   'Planta rara, de flor branca que só abre à noite. Base do Elixir da Coragem III.', false),
  ('couro_curtido', 'Couro', 'Consumíveis', 'S', 1, 'Comum', 'ti-rectangle-vertical', 25,
   'Couro curtido e pronto para o corte: o que a bancada usa em armaduras leves, bainhas, selas e correias.', false),
  ('oleo_refinado', 'Óleo', 'Consumíveis', 'L', 0.1, 'Comum', 'ti-droplet-bolt', 5,
   'Óleo decantado e limpo, sem o cheiro da gordura de onde veio.', false),
  -- O Marfim saiu do catálogo antes deste script (a revisão de 31/10/2026 o
  -- achou faltando, com 26 joias pedindo por ele) e volta como refinado.
  ('marfim_animal', 'Marfim', 'Consumíveis', 'S', 0.2, 'Comum', 'ti-bone', 5,
   'Marfim limpo e polido, cortado de ossos escolhidos. É o que a bancada usa nas joias de marfim.', false)
on conflict (slug) do nothing;

-- Os 12 elixires: o molde é o dos elixires do catálogo (base `elixir`, líquido).
insert into public.itens (slug, nome, grupo, base, tipo, ocupa, origem, icone, valor_latao,
                          efeito_positivo, descricao, magico, efeito_duracao_horas)
select e.slug, e.nome, 'Consumíveis', 'elixir', 'L', 0.5, 'Comum', 'ti-flask-2', e.valor,
       e.efeito, e.descr, false, e.horas
  from (values
    ('elixir_cura_1', 'Elixir da Cura I', 125, 'Aumenta 5 de Energia Física.', 'Destilado de cinco Ervas Amalil. Cura 5 de energia física.', null::smallint),
    ('elixir_cura_2', 'Elixir da Cura II', 375, 'Aumenta 10 de Energia Física.', 'Destilado de cinco Ervas Azpha. Cura 10 de energia física.', null),
    ('elixir_cura_3', 'Elixir da Cura III', 1125, 'Aumenta 15 de Energia Física.', 'Destilado de cinco Ervas Rubashi. Cura 15 de energia física.', null),
    ('elixir_coragem_1', 'Elixir da Coragem I', 125, 'Aumenta 10 de Energia Heroica.', 'Destilado de cinco Plantas Inina. Restaura 10 de energia heroica.', null),
    ('elixir_coragem_2', 'Elixir da Coragem II', 375, 'Aumenta 20 de Energia Heroica.', 'Destilado de cinco Plantas Nex. Restaura 20 de energia heroica.', null),
    ('elixir_coragem_3', 'Elixir da Coragem III', 1125, 'Aumenta 30 de Energia Heroica.', 'Destilado de cinco Plantas Subella. Restaura 30 de energia heroica.', null),
    ('elixir_espirito_1', 'Elixir do Espírito I', 125, 'Aumenta 10 de Karma.', 'Destilado de cinco Cogumelos Aria. Restaura 10 de karma.', null),
    ('elixir_espirito_2', 'Elixir do Espírito II', 375, 'Aumenta 20 de Karma.', 'Destilado de cinco Cogumelos Lumenia. Restaura 20 de karma.', null),
    ('elixir_espirito_3', 'Elixir do Espírito III', 1125, 'Aumenta 30 de Karma.', 'Destilado de cinco Cogumelos Rubus. Restaura 30 de karma.', null),
    ('elixir_euforia_1', 'Elixir da Euforia I', 125, 'Aumenta 5 de Velocidade.', 'Destilado de cinco Flores Griffonia. Concede +5 de velocidade por 6 horas.', 6),
    ('elixir_euforia_2', 'Elixir da Euforia II', 375, 'Aumenta 10 de Velocidade.', 'Destilado de cinco Flores Targena. Concede +10 de velocidade por 12 horas.', 12),
    ('elixir_euforia_3', 'Elixir da Euforia III', 1125, 'Aumenta 15 de Velocidade.', 'Destilado de cinco Flores Vinna. Concede +15 de velocidade por 36 horas.', 36)
  ) as e(slug, nome, valor, efeito, descr, horas)
on conflict (slug) do nothing;

-- ── 2. O preço dos refinados: cinco vezes o que consomem ────────────────────
update public.itens set valor_latao = v.valor, atualizado_em = now()
  from (values ('ouro_bruto', 5000), ('prata', 500), ('cobre', 50), ('latao', 5), ('aco', 70),
               ('lenha', 10), ('carvao', 50), ('marfim_animal', 5), ('linho', 10), ('algodao', 5),
               ('seda', 40)) as v(slug, valor)
 where itens.slug = v.slug;

-- ── 3. As receitas de refino ────────────────────────────────────────────────
insert into public.receitas (resultado_slug, habilidade_key, dificuldade, dias, materiais)
select r.resultado, r.hab, 'D', 5, r.mats::jsonb
  from (values
    ('ouro_bruto', 'metalurgia', '[{"slugs": ["moeda_ouro", "moeda_ouro2"], "qtd": 5, "nome": "Moedas de Ouro"}]'),
    ('prata', 'metalurgia', '[{"slugs": ["moeda_prata", "moeda_prata2"], "qtd": 5, "nome": "Moedas de Prata"}]'),
    ('cobre', 'metalurgia', '[{"slugs": ["moeda_cobre", "moeda_cobre2"], "qtd": 5, "nome": "Moedas de Cobre"}]'),
    ('latao', 'metalurgia', '[{"slugs": ["moeda_latao", "moeda_latao2"], "qtd": 5, "nome": "Moedas de Latão"}]'),
    ('aco', 'metalurgia', '[{"slug": "ferro", "qtd": 5}, {"slug": "carvao", "qtd": 1}]'),
    ('marfim_animal', 'artesanato', '[{"slugs": ["osso_animal", "osso_mistico", "osso_podre", "osso_demoniaco", "osso_celestial", "osso_draconico"], "qtd": 5, "nome": "Ossos"}]'),
    ('couro_curtido', 'artesanato', '[{"slugs": ["couro_animal", "couro_mistico", "couro_podre", "couro_demoniaco", "couro_celestial", "couro_draconico"], "qtd": 5, "nome": "Couros"}]'),
    ('oleo_refinado', 'artesanato', '[{"slugs": ["oleo", "oleo_mistico", "oleo_podre", "oleo_demoniaco", "oleo_celestial", "oleo_draconico"], "qtd": 5, "nome": "Óleos"}]'),
    ('linho', 'artesanato', '[{"slug": "canhamo", "qtd": 5}]'),
    ('seda', 'artesanato', '[{"slug": "bicho_de_seda", "qtd": 5}]'),
    ('algodao', 'artesanato', '[{"slug": "algodoeiro", "qtd": 5}]'),
    ('lenha', 'carpintaria', '[{"slug": "madeira", "qtd": 5}]'),
    ('carvao', 'carpintaria', '[{"slug": "lenha", "qtd": 5}]'),
    ('elixir_cura_1', 'medicina', '[{"slug": "erva_amalil", "qtd": 5}]'),
    ('elixir_cura_2', 'medicina', '[{"slug": "erva_azpha", "qtd": 5}]'),
    ('elixir_cura_3', 'medicina', '[{"slug": "erva_rubashi", "qtd": 5}]'),
    ('elixir_coragem_1', 'medicina', '[{"slug": "planta_inina", "qtd": 5}]'),
    ('elixir_coragem_2', 'medicina', '[{"slug": "planta_nex", "qtd": 5}]'),
    ('elixir_coragem_3', 'medicina', '[{"slug": "planta_subella", "qtd": 5}]'),
    ('elixir_espirito_1', 'medicina', '[{"slug": "cogumelo_aria", "qtd": 5}]'),
    ('elixir_espirito_2', 'medicina', '[{"slug": "cogumelo_lumenia", "qtd": 5}]'),
    ('elixir_espirito_3', 'medicina', '[{"slug": "cogumelo_orichalcum", "qtd": 5}]'),
    ('elixir_euforia_1', 'medicina', '[{"slug": "flolha_griffonia", "qtd": 5}]'),
    ('elixir_euforia_2', 'medicina', '[{"slug": "flolha_rubus", "qtd": 5}]'),
    ('elixir_euforia_3', 'medicina', '[{"slug": "flolha_vinna", "qtd": 5}]')
  ) as r(resultado, hab, mats)
on conflict (resultado_slug) do update
  set habilidade_key = excluded.habilidade_key, materiais = excluded.materiais, rende = 1,
      testes = null, atualizado_em = now();

-- ── 4. Sai: Porcelana, Pedra, Terra e as receitas de itens mágicos ──────────
-- Antes, os rituais que pediam Terra passam a pedir Osso Animal.
update public.magias
   set itens_necessarios = replace(itens_necessarios, 'Terra (', 'Osso Animal (')
 where itens_necessarios like '%Terra (%';

create temporary table _sai as
select slug from public.itens
 where slug in ('porcelana', 'pedra', 'terra') or base like '%-porcelana';
insert into _sai
select 'receita_' || r.resultado_slug from public.receitas r join public.itens i on i.slug = r.resultado_slug
 where i.slug in (select slug from _sai) or coalesce(i.magico, false) or i.origem = 'Mágico';

delete from public.receitas r using public.itens i
 where i.slug = r.resultado_slug
   and (i.slug in (select slug from _sai) or coalesce(i.magico, false) or i.origem = 'Mágico');

-- Das lojas também (o trigger das lojas globais não precisa espelhar: vale em todas).
select set_config('menestrel.sync_loja', 'on', true);
update public.historias h
   set estoque_loja = jsonb_set(h.estoque_loja, '{comercios}', (
         select jsonb_agg(c || jsonb_build_object('itens', coalesce((
                  select jsonb_agg(it order by o)
                    from jsonb_array_elements(coalesce(c->'itens', '[]'::jsonb)) with ordinality as x(it, o)
                   where it->>'slug' not in (select slug from _sai)), '[]'::jsonb)) order by co)
           from jsonb_array_elements(h.estoque_loja->'comercios') with ordinality as y(c, co)))
 where jsonb_typeof(h.estoque_loja->'comercios') = 'array';

delete from public.itens where slug in (select slug from _sai);
drop table _sai;

-- ── 5. A nova conta das receitas de itens ───────────────────────────────────
-- Material trocado pelo refinado; a ferramenta vira ferramenta; e a
-- quantidade sai do preço: o principal paga METADE do valor da peça (1 a 30),
-- cada secundário 10% (1 a 10). Receitas de refino (passo 3) não entram.
update public.receitas r
   set materiais = (
         select jsonb_agg(
                  case when m.slug = 'equipamento_de_carpinteiro'
                       then jsonb_build_object('slug', m.slug, 'qtd', 1, 'ferramenta', true)
                       else jsonb_build_object('slug', m.slug, 'qtd',
                              case when m.o = 1
                                   then greatest(1, least(30, round(coalesce(i.valor_latao, 0) * 0.5 / greatest(1, coalesce(mi.valor_latao, 1)))::int))
                                   else greatest(1, least(10, round(coalesce(i.valor_latao, 0) * 0.1 / greatest(1, coalesce(mi.valor_latao, 1)))::int))
                              end)
                  end order by m.o)
           from (select case x.e->>'slug' when 'couro_animal' then 'couro_curtido'
                                          when 'madeira' then 'lenha' else x.e->>'slug' end as slug, x.o
                   from jsonb_array_elements(r.materiais) with ordinality as x(e, o)) m
           left join public.itens mi on mi.slug = m.slug),
       atualizado_em = now()
  from public.itens i
 where i.slug = r.resultado_slug
   and r.resultado_slug not in ('ouro_bruto', 'prata', 'cobre', 'latao', 'aco', 'marfim_animal', 'couro_curtido',
                                'oleo_refinado', 'linho', 'seda', 'algodao', 'lenha', 'carvao')
   and r.resultado_slug not like 'elixir\_%'
   and not exists (select 1 from jsonb_array_elements(r.materiais) e where e ? 'slugs');

-- ── 6. A "Receita de …" das receitas novas (idempotente) ────────────────────
insert into public.itens (slug, nome, grupo, base, tipo, ocupa, origem, icone, valor_latao, descricao, magico)
select 'receita_' || r.resultado_slug, 'Receita de ' || i.nome, 'Itens', 'pergaminho', 'S', 0.1, 'Comum',
       'ti-file-text', greatest(1, round(coalesce(i.valor_latao, 0) * 0.1)::int),
       'Instruções para fabricar ' || i.nome || ': os materiais, as medidas e a ordem do trabalho. '
         || 'Quem a aprende guarda o saber; o pergaminho se perde no estudo.',
       false
  from public.receitas r join public.itens i on i.slug = r.resultado_slug
on conflict (slug) do nothing;
