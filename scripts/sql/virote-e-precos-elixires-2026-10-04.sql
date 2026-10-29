-- scripts/sql/virote-e-precos-elixires-2026-10-04.sql
-- ============================================================================
-- PREÇO DOS ELIXIRES E O VIROTE DA BESTA (04/10/2026)
--
-- APLICADO NO BANCO EM 05/10/2026 (projeto kaxbdpdutentlrobuqyu). Conferido
-- depois: nenhum elixir sem valor, os 4 virotes no catálogo, 1.039 itens.
--
-- Pedido do usuário, sobre docs/sugestoes-itens.md:
--   "2.1 - Preço nos itens que estão de graça pode executar."
--   "2.2 - Pode criar o virote."
--
-- POR QUE. Item sem `valor_latao` se vende por 0 e sai DE GRAÇA na loja do
-- Mestre (venda-item-sem-valor-2026-09-28.sql). Os 16 elixires estavam
-- assim. E a Besta e a Arlabesta atiravam sem gastar nada, porque o virote
-- que elas disparam não existia no catálogo — o arco já gasta a flecha a
-- cada ataque (frascos-amuletos-venenos-2026-09-28.sql).
--
-- RÉGUA DOS ELIXIRES (da própria revisão): 25 de energia ≈ 120 latão,
-- 100 de energia ≈ 1.500 latão.
--
-- RÉGUA DO VIROTE: flecha = 1; virote = 2 (haste curta, ponta de aço).
-- Munição envenenada = munição + dose do veneno, igual às flechas
-- (26 = 1 + 25 Blueta): virote envenenado = 2 + 25/75/225.
--
-- IDEMPOTENTE: o preço só entra onde ainda está nulo (não atropela ajuste
-- feito à mão depois), e os inserts têm `on conflict (slug) do nothing`.
-- ============================================================================

BEGIN;

-- ── 2.1 Preço dos 16 elixires ───────────────────────────────────────────────
UPDATE public.itens i
   SET valor_latao = v.valor
  FROM (VALUES
    ('elixir_de_diatrimis',   25),   -- 5 Energia Física
    ('elixir_de_selimon',     40),   -- 5 Absorção, −5 Sono, −10 Desonra
    ('elixir_de_fada',        60),   -- 5 Karma, −5 Sono
    ('elixir_de_ganis',       60),   -- −100 Sede, −10 Sono, −10 Frio
    ('elixir_de_udoviom',     60),   -- −15 Sono, −100 Fome
    ('elixir_de_seinoniz',    70),   -- 15 Energia Física
    ('elixir_de_maira',       95),   -- 20 Energia Física
    ('elixir_de_cruine',     110),   -- 20 Energia Física, −4 Doença
    ('elixir_de_blator',     120),   -- 25 Energia Heroica
    ('elixir_de_cambu',      120),   -- 25 Absorção
    ('elixir_de_vouxiz',     150),   -- 30 Absorção
    ('elixir_de_dragao',     150),   -- 10 Karma, −5 Sono
    ('elixir_de_antredom',   400),   -- 50 Energia Heroica
    ('elixir_de_unicornio',  500),   -- −100 Doença
    ('elixir_de_morrigalti',1500),   -- 100 Energia Física
    ('elixir_de_palier',    1500)    -- 100 Karma, −100 Vício
  ) AS v(slug, valor)
 WHERE i.slug = v.slug
   AND i.valor_latao IS NULL;

-- ── 2.2 O virote, munição da Besta e da Arlabesta ───────────────────────────
-- Molde da flecha (slug `flecha`): Consumíveis, tipo S, ocupa 0.1, dano 0.
-- O motor reconhece a munição pelo NOME ("Virote…"), como já fazia com a
-- flecha, e a arma pelo slug (besta, arlabesta) — ver municaoDaArma em
-- src/01-core/inventario-helpers.jsx.
INSERT INTO public.itens
  (slug, nome, grupo, tipo, origem, ocupa, valor_latao, icone, dano_l, dano_m, dano_p, descricao)
VALUES
  ('virote', 'Virote', 'Consumíveis', 'S', 'Comum', 0.1, 2, 'ti-archery-arrow', 0, 0, 0,
   'O Virote é a seta curta e pesada que a besta e a arlabesta disparam: haste de madeira dura, empenagem baixa e ponta de aço maciço, feita para furar armadura de perto.')
ON CONFLICT (slug) DO NOTHING;

-- Virote envenenado: o mesmo caminho da flecha envenenada (1 dose = 1 virote).
-- O efeito na batalha é o `efeito_negativo` — a Energia Física que o veneno
-- tira quando o golpe chega à EF.
INSERT INTO public.itens
  (slug, nome, grupo, tipo, origem, ocupa, valor_latao, icone, dano_l, dano_m, dano_p, efeito_negativo, descricao)
VALUES
  ('virote_envenenado_blueta', 'Virote Envenenado (Blueta)', 'Consumíveis', 'S', 'Comum', 0.1, 27, 'ti-archery-arrow', 0, 0, 0,
   'Diminui 5 de Energia Física.',
   'Virote com a ponta untada de Blueta. Se o golpe chegar à energia física do alvo, o veneno age. Serve uma vez só.'),
  ('virote_envenenado_leopis', 'Virote Envenenado (Leopis)', 'Consumíveis', 'S', 'Comum', 0.1, 77, 'ti-archery-arrow', 0, 0, 0,
   'Diminui 10 de Energia Física.',
   'Virote com a ponta untada de Leopis. Se o golpe chegar à energia física do alvo, o veneno age. Serve uma vez só.'),
  ('virote_envenenado_theonia', 'Virote Envenenado (Theonia)', 'Consumíveis', 'S', 'Comum', 0.1, 227, 'ti-archery-arrow', 0, 0, 0,
   'Diminui 15 de Energia Física.',
   'Virote com a ponta untada de Theonia. Se o golpe chegar à energia física do alvo, o veneno age. Serve uma vez só.')
ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- ── Conferência ─────────────────────────────────────────────────────────────
-- Nenhum elixir de graça (espera 0 linhas):
--   SELECT slug, nome FROM public.itens
--    WHERE slug LIKE 'elixir_%' AND valor_latao IS NULL;
-- Os quatro virotes (espera 4 linhas):
--   SELECT slug, nome, valor_latao, efeito_negativo FROM public.itens
--    WHERE slug LIKE 'virote%' ORDER BY valor_latao;
