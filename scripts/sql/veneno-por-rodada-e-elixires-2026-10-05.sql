-- scripts/sql/veneno-por-rodada-e-elixires-2026-10-05.sql
-- ============================================================================
-- O VENENO POR RODADA, O PREÇO DOS ELIXIRES E A COMIDA DE BICHO (05/10/2026)
--
-- Pedido do usuário:
--   "Equilibre mais o preço dos elixires, todos entre 1000 a 1500."
--   "O dano do veneno é por rodada, o mais fraco 1 de EF por rodada, total de
--    5 rodadas, o segundo 2 de EF por rodada, total de 5 rodadas, o mais
--    forte 2 de EF por rodada, total de 10 rodadas."
--   "Adicione ao feno e a ração animal, a condição de alimentar os animais do
--    personagem [...]"
--
-- APLICADO NO BANCO EM 05/10/2026 (projeto kaxbdpdutentlrobuqyu).
--
-- ── 1. ELIXIRES: todos entre 1.000 e 1.500 ──────────────────────────────────
-- A régua de 04/10 ia de 25 a 1.500 e espalhava demais: o elixir mais fraco
-- custava o preço de um par de botas. A ordem de força continua a mesma, só
-- que comprimida na faixa pedida — o degrau entre um elixir e o seguinte é de
-- 50 latões, e quem empatava em efeito continua empatando em preço.
--
-- ── 2. VENENO POR RODADA ────────────────────────────────────────────────────
-- O veneno deixou de ser mordida única. A força passa a ser "N de Energia
-- Física POR RODADA, durante R rodadas", e é isso que o texto do catálogo
-- diz — é de lá que o motor lê (venenoDoItem, 01-core/inventario-helpers.jsx):
--   Blueta   1 de EF × 5 rodadas   (5 no total, era 5 de uma vez)
--   Leopis   2 de EF × 5 rodadas   (10 no total, era 10)
--   Theonia  2 de EF × 10 rodadas  (20 no total, era 15)
-- Na batalha, o golpe que chega à EF pousa o status Envenenado, que morde a
-- cada virada de rodada e atravessa o fim do combate — o mesmo caminho do
-- veneno que o Mestre aplica à mão.
--
-- ── 3. FENO ─────────────────────────────────────────────────────────────────
-- Ganhou a condição que a ração animal já tinha, mais fraca: feno é forragem
-- de inverno, se junta no campo e não custa nada (continua sem preço). Quem
-- alimenta o animal é a ação Alimentar, na janela do item.
--
-- IDEMPOTENTE: são UPDATEs de valor fixo por slug — rodar de novo não muda
-- nada.
-- ============================================================================

BEGIN;

-- ── 1. Os 16 elixires, de 1.000 a 1.500 ─────────────────────────────────────
UPDATE public.itens i
   SET valor_latao = v.valor
  FROM (VALUES
    ('elixir_de_diatrimis',  1000),   -- 5 Energia Física
    ('elixir_de_selimon',    1050),   -- 5 Absorção, −5 Sono, −10 Desonra
    ('elixir_de_fada',       1100),   -- 5 Karma, −5 Sono
    ('elixir_de_ganis',      1100),   -- −100 Sede, −10 Sono, −10 Frio
    ('elixir_de_udoviom',    1100),   -- −15 Sono, −100 Fome
    ('elixir_de_seinoniz',   1150),   -- 15 Energia Física
    ('elixir_de_maira',      1200),   -- 20 Energia Física
    ('elixir_de_cruine',     1250),   -- 20 Energia Física, −4 Doença
    ('elixir_de_blator',     1300),   -- 25 Energia Heroica
    ('elixir_de_cambu',      1300),   -- 25 Absorção
    ('elixir_de_vouxiz',     1350),   -- 30 Absorção
    ('elixir_de_dragao',     1350),   -- 10 Karma, −5 Sono
    ('elixir_de_antredom',   1400),   -- 50 Energia Heroica
    ('elixir_de_unicornio',  1450),   -- −100 Doença
    ('elixir_de_morrigalti', 1500),   -- 100 Energia Física
    ('elixir_de_palier',     1500)    -- 100 Karma, −100 Vício
  ) AS v(slug, valor)
 WHERE i.slug = v.slug;

-- ── 2. A força dos venenos, por rodada ──────────────────────────────────────
-- O frasco (secreção) guarda também a Doença que ele causa; a munição
-- envenenada carrega só a mordida.
UPDATE public.itens i
   SET efeito_negativo = v.txt
  FROM (VALUES
    ('secrecao_blueta',           'Diminui 1 de Energia Física por rodada, durante 5 rodadas; aumenta 50 de Doença.'),
    ('secrecao_leopis',           'Diminui 2 de Energia Física por rodada, durante 5 rodadas; aumenta 75 de Doença.'),
    ('secrecao_theonia',          'Diminui 2 de Energia Física por rodada, durante 10 rodadas; aumenta 100 de Doença.'),
    ('flecha_envenenada_blueta',  'Diminui 1 de Energia Física por rodada, durante 5 rodadas.'),
    ('flecha_envenenada_leopis',  'Diminui 2 de Energia Física por rodada, durante 5 rodadas.'),
    ('flecha_envenenada_theonia', 'Diminui 2 de Energia Física por rodada, durante 10 rodadas.'),
    ('virote_envenenado_blueta',  'Diminui 1 de Energia Física por rodada, durante 5 rodadas.'),
    ('virote_envenenado_leopis',  'Diminui 2 de Energia Física por rodada, durante 5 rodadas.'),
    ('virote_envenenado_theonia', 'Diminui 2 de Energia Física por rodada, durante 10 rodadas.'),
    ('dardo_envenenado_blueta',   'Diminui 1 de Energia Física por rodada, durante 5 rodadas.'),
    ('dardo_envenenado_leopis',   'Diminui 2 de Energia Física por rodada, durante 5 rodadas.'),
    ('dardo_envenenado_theonia',  'Diminui 2 de Energia Física por rodada, durante 10 rodadas.')
  ) AS v(slug, txt)
 WHERE i.slug = v.slug;

-- ── 3. O feno alimenta ──────────────────────────────────────────────────────
UPDATE public.itens
   SET efeito_positivo = 'Reduz 5 de Fome.',
       descricao = 'O Feno é capim ceifado e seco ao sol, atado em molho. Serve de cama no estábulo e de forragem para os animais: mata pouca fome, mas se junta no campo e não custa nada.'
 WHERE slug = 'feno';

COMMIT;

-- ── Conferência ─────────────────────────────────────────────────────────────
-- Elixires dentro da faixa (espera 16 linhas, todas entre 1000 e 1500):
--   SELECT nome, valor_latao FROM public.itens
--    WHERE slug LIKE 'elixir%' ORDER BY valor_latao, nome;
-- Veneno por rodada (espera 12 linhas, todas com "por rodada"):
--   SELECT slug, efeito_negativo FROM public.itens
--    WHERE slug LIKE 'secrecao%' OR slug LIKE '%envenenad%' ORDER BY slug;
-- A comida de bicho (espera feno 5 e ração animal 10):
--   SELECT slug, valor_latao, efeito_positivo FROM public.itens
--    WHERE slug IN ('feno', 'racao_animal') ORDER BY slug;
