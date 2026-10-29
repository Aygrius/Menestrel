-- scripts/sql/precos-magicos-e-dardo-2026-10-04.sql
-- ============================================================================
-- PREÇO DOS PERGAMINHOS E DOS ITENS MÁGICOS, E O DARDO DA ZARABATANA
-- (04/10/2026)
--
-- APLICADO NO BANCO EM 05/10/2026 (projeto kaxbdpdutentlrobuqyu). Conferido
-- depois: nenhum pergaminho nem item mágico sem valor, os 4 dardos no
-- catálogo, 1.043 itens e 48 ainda sem preço (os que o terceiro script fecha).
--
-- Pedido do usuário, sobre as sugestões 4.1, 4.2 e 4.5 de docs/sugestoes-itens.md:
--   "1 - Adicione o valor dos pergaminho, são itens de alto valor.
--    2 - Adicione o valor do itens mágicos, são itens de alto valor.
--    4 - Adicione o dardo."
-- (A sugestão 4.3 — livros, estátuas e animais — ficou de fora: não foi pedida.)
--
-- POR QUE. Item sem `valor_latao` se vende por 0 e sai DE GRAÇA na loja do
-- Mestre (venda-item-sem-valor-2026-09-28.sql). Eram 367 itens assim; este
-- script resolve 319 deles: 286 pergaminhos de magia e 33 itens mágicos.
--
-- A ESCALA DO CATÁLOGO, que define "alto valor" (1 moeda de ouro = 1.000 latão):
--   Ur (lança) 24.000 · Impetusion (arco) 13.000 · Besta 5.300 · Viela 5.900
--   Harpa 5.200 · Alaúde 3.200 · Tambor 800 · Caravela 400.000 · Mansão 430.000
--
-- RÉGUA DOS PERGAMINHOS — por nível da magia (cada nível de magia Perdida ou
-- Ancestral exige o pergaminho do nível anterior, então a conta acumula):
--   nível 1 → 1.000 · 3 → 3.000 · 5 → 7.500 · 7 → 15.000 · 9 → 30.000
--   (do 1 ao 9: 56.500 latão — pouco mais que duas lanças Ur, por uma magia
--    que fica para sempre)
--
-- RÉGUA DOS ITENS MÁGICOS — prêmio da magia por nível, SOMADO ao preço do
-- equivalente comum quando existe (senão o alaúde mágico sairia mais barato
-- que o alaúde):
--   nível 1 → 2.000 · 3 → 6.000 · 5 → 15.000 · 7 → 30.000 · 9 → 60.000
--   Sem magia no motor (adorno mágico, instrumento mágico): 1.000 a 2.000 em
--   cima do comum — o item é mágico, mas não faz nada em jogo.
--   Duas exceções declaradas abaixo: Pérola Fantasma (caravela) e os três
--   instrumentos mágicos levam o preço do comum na base.
--
-- FICAM DE FORA, de propósito:
--   • as 9 armas naturais (Bico, Cauda, Chifre, Garra, Hálito, Mordida…) —
--     são da criatura, não se vendem;
--   • livros, estátuas, portão, quadro e os 13 animais — sugestão 4.3, que o
--     usuário não pediu;
--   • Água, Água Suja, Lenha, Terra, Planta Subella — recurso de cenário;
--   • a Moeda de Ouro de Alfiates recebe 1.000, o valor de face de uma moeda
--     de ouro: no grupo Moedas, `valor_latao` É o dinheiro que a moeda vale
--     (ouro 1.000, prata 100, cobre 10, latão 1), e inflar isso inflaria a
--     bolsa de quem a carrega. Que ela é mágica, a mesa negocia.
--
-- IDEMPOTENTE: todo preço só entra onde ainda está nulo (não atropela ajuste
-- feito à mão depois), e os inserts têm `on conflict (slug) do nothing`.
-- ============================================================================

BEGIN;

-- ── 1. Os 286 pergaminhos de magia Perdida e Ancestral ──────────────────────
-- O pergaminho em branco (slug `pergaminho`, 10 latão) não entra: não tem
-- nível e já tem preço.
UPDATE public.itens
   SET valor_latao = CASE nivel_magia
                       WHEN 1 THEN  1000
                       WHEN 3 THEN  3000
                       WHEN 5 THEN  7500
                       WHEN 7 THEN 15000
                       WHEN 9 THEN 30000
                     END
 WHERE slug LIKE 'pergaminho\_%'
   AND valor_latao IS NULL
   AND nivel_magia IN (1, 3, 5, 7, 9);

-- ── 2. Os 33 itens mágicos ──────────────────────────────────────────────────
-- Nome a nome, para a mesa poder auditar o que cada um passou a valer.
UPDATE public.itens i
   SET valor_latao = v.valor
  FROM (VALUES
    -- Nível 1 (prêmio 2.000)
    ('anel_camburiano',                        2000),   -- Amizade 1
    ('anel_coringa',                           2000),   -- Distração 1
    ('chapeu_bencao_de_sevides',               2000),   -- Controle Climático 1
    ('brinco_desejo_de_lena',                  2000),   -- Manjar de Lena 1
    ('capa_sombra_de_maira',                   2000),   -- Mimetismo Animal 1
    ('alaude_sonho_de_helena',                 5200),   -- Área de Paz 1 + alaúde 3.200
    -- Nível 3 (prêmio 6.000)
    ('amuleto_da_brasa',                       6000),   -- Piroproteção 3
    ('amuleto_da_rocha',                       6000),   -- Geoproteção 3
    ('amuleto_da_mare',                        6000),   -- Hidroproteção 3
    ('amuleto_do_vento',                       6000),   -- Aeroproteção 3
    ('anel_bankdi',                            6000),   -- Apontar Sufocante 3
    ('anel_lagrima_de_ganis',                  6000),   -- Respiração Arcana 3
    ('bracelete_maldicao_de_menard',           6000),   -- Caçada Marcada 3
    ('anel_outras_memorias',                   6000),   -- Clarividência 3
    -- Nível 5 (prêmio 15.000)
    ('mascara_olhar_da_infamia',              15000),   -- Conhecimento Natural 5
    -- Nível 9 (prêmio 60.000)
    ('anel_narya',                            60000),   -- Piromanipulação 9
    ('anel_nenya',                            60000),   -- Hidromanipulação 9
    ('anel_vilya',                            60000),   -- Aeromanipulação 9
    ('anel_khazad',                           60000),   -- Geomanipulação 9
    ('anel_juizo_perfeito',                   60000),   -- Amizade 9
    ('coroa_abaddorim',                       60000),   -- Convivência 9
    ('tiara_conhecimento_de_palier',          60000),   -- Milagre Análogo 9
    ('traje_selimonio',                       60000),   -- Modificar Espírito 9
    ('perola_pedra_vidente',                  60000),   -- Visão de Cena 9
    ('chicote_de_armas_assassina_de_vampiros',60000),   -- Bola de Fogo 9
    ('tambor_tormund',                        60800),   -- Medo 9 + tambor 800
    ('caravela_perola_negra',                460000),   -- Invisibilidade 9 + caravela 400.000
    -- Mágicos sem magia no motor
    ('harpa_zeena',                            7200),   -- harpa 5.200 + 2.000
    ('colar_de_amira',                         2000),   -- protege 2 de Desonra
    ('colar_haalinageno',                      1000),   -- aumenta 5 de Desonra
    ('colar_medalhao_da_fome',                 1000),   -- aumenta 5 de Desonra
    ('colar_mon',                              1000),   -- aumenta 5 de Desonra
    -- Moeda mágica: valor de face de uma moeda de ouro (ver cabeçalho)
    ('moeda_ouro_de_alfiates',                 1000)
  ) AS v(slug, valor)
 WHERE i.slug = v.slug
   AND i.valor_latao IS NULL;

-- ── 3. O dardo, munição da zarabatana ───────────────────────────────────────
-- A Zarabatana (100 latão, dano 10, alcance 10) era a última arma de tiro que
-- atirava de graça. Molde do virote (virote-e-precos-elixires-2026-10-04.sql):
-- o motor reconhece a munição pelo NOME ("Dardo…") e a arma pelo slug.
INSERT INTO public.itens
  (slug, nome, grupo, tipo, origem, ocupa, valor_latao, icone, dano_l, dano_m, dano_p, descricao)
VALUES
  ('dardo', 'Dardo', 'Consumíveis', 'S', 'Comum', 0.1, 1, 'ti-archery-arrow', 0, 0, 0,
   'O Dardo é a agulha leve de madeira com tufo de penas na base que se sopra pela zarabatana: fura pouco, e por isso costuma viajar com a ponta untada.')
ON CONFLICT (slug) DO NOTHING;

-- Dardo envenenado: 1 dose = 1 dardo, como na flecha e no virote. O efeito na
-- batalha é o `efeito_negativo` — a Energia Física que o veneno tira quando o
-- golpe chega à EF. Preço = dardo (1) + dose do veneno (25/75/225).
INSERT INTO public.itens
  (slug, nome, grupo, tipo, origem, ocupa, valor_latao, icone, dano_l, dano_m, dano_p, efeito_negativo, descricao)
VALUES
  ('dardo_envenenado_blueta', 'Dardo Envenenado (Blueta)', 'Consumíveis', 'S', 'Comum', 0.1, 26, 'ti-archery-arrow', 0, 0, 0,
   'Diminui 5 de Energia Física.',
   'Dardo de zarabatana com a ponta untada de Blueta. Se o golpe chegar à energia física do alvo, o veneno age. Serve uma vez só.'),
  ('dardo_envenenado_leopis', 'Dardo Envenenado (Leopis)', 'Consumíveis', 'S', 'Comum', 0.1, 76, 'ti-archery-arrow', 0, 0, 0,
   'Diminui 10 de Energia Física.',
   'Dardo de zarabatana com a ponta untada de Leopis. Se o golpe chegar à energia física do alvo, o veneno age. Serve uma vez só.'),
  ('dardo_envenenado_theonia', 'Dardo Envenenado (Theonia)', 'Consumíveis', 'S', 'Comum', 0.1, 226, 'ti-archery-arrow', 0, 0, 0,
   'Diminui 15 de Energia Física.',
   'Dardo de zarabatana com a ponta untada de Theonia. Se o golpe chegar à energia física do alvo, o veneno age. Serve uma vez só.')
ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- ── Conferência ─────────────────────────────────────────────────────────────
-- Nenhum pergaminho de magia de graça (espera 0 linhas):
--   SELECT slug, nome, nivel_magia FROM public.itens
--    WHERE slug LIKE 'pergaminho\_%' AND valor_latao IS NULL;
-- Nenhum item mágico de graça fora dos grupos dispensados (espera 0 linhas):
--   SELECT slug, nome, grupo, magia, nivel_magia FROM public.itens
--    WHERE valor_latao IS NULL AND origem IN ('Mágico', 'Raro')
--      AND grupo IN ('Vestimentas', 'Armas', 'Instrumentos', 'Transportes', 'Moedas', 'Minerais')
--      AND slug <> 'halito';
-- Os quatro dardos (espera 4 linhas):
--   SELECT slug, nome, valor_latao, efeito_negativo FROM public.itens
--    WHERE slug LIKE 'dardo%' ORDER BY valor_latao;
-- Quanto sobrou sem preço no catálogo (espera 48: 9 armas naturais, 19 itens
-- de lore, 13 animais, 5 recursos de cenário e as 2 botas comuns — ver a
-- seção 4 de docs/sugestoes-itens.md):
--   SELECT grupo, count(*) FROM public.itens WHERE valor_latao IS NULL GROUP BY grupo ORDER BY 2 DESC;
