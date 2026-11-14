-- Pertences e equipamento das criaturas humanoides — 14/11/2026
--
-- Pedido do usuário: "Quero preencher os itens equipados (usados em batalha)
-- e os pertences (que podem ser saqueados) das criaturas. Em relação aos
-- pertences, vamos adicionar uma quantidade de itens básicos também como
-- água, licor, cânhamo, etc."
--
-- Decisão do mesmo dia: só os humanoides. Animais mantêm carne/couro;
-- elementais, demônios e enviados mantêm o que já têm.
--
-- criaturas.equipamento é um array { slug, slot, qtd? }: slot 'arma' é ataque,
-- slot de corpo é peça vestida, 'mochila' é pertence (o saque lê os três).
-- A peça só entra se o slot estiver livre; o pertence só entra se a criatura
-- ainda não tiver aquele slug na mochila — rodar duas vezes não duplica.

BEGIN;

CREATE TEMP TABLE _add (criatura text, slug text, slot text, qtd int) ON COMMIT DROP;
INSERT INTO _add VALUES
  -- ── Peças que faltavam ──
  ('Orc', 'peca_calca', 'perna', NULL),
  ('Goblin', 'peca_colete', 'dorso', NULL),
  ('Dragoniano', 'peca_cota_parcial', 'dorso', NULL),
  ('Gigante do Deserto', 'porrete', 'arma', NULL),
  ('Gigante do Deserto', 'peca_colete', 'dorso', NULL),
  -- ── Pertences ──
  ('Goblin', 'agua', 'mochila', 1), ('Goblin', 'racao', 'mochila', 1), ('Goblin', 'canhamo', 'mochila', 2), ('Goblin', 'moeda_ferro', 'mochila', 5),
  ('Goblin Líder', 'agua', 'mochila', 1), ('Goblin Líder', 'racao', 'mochila', 1), ('Goblin Líder', 'canhamo', 'mochila', 3), ('Goblin Líder', 'tocha', 'mochila', 1), ('Goblin Líder', 'moeda_cobre', 'mochila', 3),
  ('Goblin Rei', 'agua', 'mochila', 2), ('Goblin Rei', 'licor', 'mochila', 1), ('Goblin Rei', 'racao', 'mochila', 2), ('Goblin Rei', 'canhamo', 'mochila', 4), ('Goblin Rei', 'moeda_prata', 'mochila', 2),

  ('Orc', 'agua', 'mochila', 2), ('Orc', 'cerveja', 'mochila', 1), ('Orc', 'racao', 'mochila', 2), ('Orc', 'canhamo', 'mochila', 3), ('Orc', 'tocha', 'mochila', 1), ('Orc', 'pederneira', 'mochila', 1), ('Orc', 'moeda_cobre', 'mochila', 3),
  ('Orc Capitão', 'agua', 'mochila', 2), ('Orc Capitão', 'licor', 'mochila', 1), ('Orc Capitão', 'racao', 'mochila', 2), ('Orc Capitão', 'canhamo', 'mochila', 4), ('Orc Capitão', 'tocha', 'mochila', 1), ('Orc Capitão', 'pederneira', 'mochila', 1), ('Orc Capitão', 'moeda_prata', 'mochila', 1),
  ('Orc Rei', 'agua', 'mochila', 2), ('Orc Rei', 'licor', 'mochila', 2), ('Orc Rei', 'vinho', 'mochila', 1), ('Orc Rei', 'racao', 'mochila', 3), ('Orc Rei', 'canhamo', 'mochila', 5), ('Orc Rei', 'moeda_prata', 'mochila', 5), ('Orc Rei', 'moeda_ouro', 'mochila', 1),

  ('Ogro', 'agua', 'mochila', 2), ('Ogro', 'cerveja', 'mochila', 2), ('Ogro', 'racao', 'mochila', 3), ('Ogro', 'moeda_cobre', 'mochila', 2),
  ('Ogro Líder', 'agua', 'mochila', 2), ('Ogro Líder', 'hidromel', 'mochila', 2), ('Ogro Líder', 'racao', 'mochila', 4), ('Ogro Líder', 'corda_material', 'mochila', 1), ('Ogro Líder', 'moeda_cobre', 'mochila', 6),
  ('Ogro Rei', 'agua', 'mochila', 3), ('Ogro Rei', 'hidromel', 'mochila', 3), ('Ogro Rei', 'licor', 'mochila', 2), ('Ogro Rei', 'racao', 'mochila', 5), ('Ogro Rei', 'moeda_prata', 'mochila', 3),

  ('Gigante da Colina', 'agua', 'mochila', 4), ('Gigante da Colina', 'hidromel', 'mochila', 3), ('Gigante da Colina', 'racao', 'mochila', 6), ('Gigante da Colina', 'corda_material', 'mochila', 2), ('Gigante da Colina', 'moeda_prata', 'mochila', 1),
  ('Gigante da Neve', 'agua', 'mochila', 3), ('Gigante da Neve', 'hidromel', 'mochila', 4), ('Gigante da Neve', 'racao', 'mochila', 6), ('Gigante da Neve', 'pederneira', 'mochila', 1), ('Gigante da Neve', 'moeda_prata', 'mochila', 2),
  ('Gigante do Deserto', 'agua', 'mochila', 6), ('Gigante do Deserto', 'racao', 'mochila', 5), ('Gigante do Deserto', 'corda_material', 'mochila', 2), ('Gigante do Deserto', 'moeda_prata', 'mochila', 2),

  ('Dragoniano', 'agua', 'mochila', 2), ('Dragoniano', 'racao', 'mochila', 2), ('Dragoniano', 'tocha', 'mochila', 1), ('Dragoniano', 'pederneira', 'mochila', 1), ('Dragoniano', 'moeda_cobre', 'mochila', 5),
  ('Dragoniano Jovem', 'agua', 'mochila', 2), ('Dragoniano Jovem', 'racao', 'mochila', 2), ('Dragoniano Jovem', 'pederneira', 'mochila', 1), ('Dragoniano Jovem', 'moeda_cobre', 'mochila', 3),
  ('Dragoniano Guerreiro', 'agua', 'mochila', 2), ('Dragoniano Guerreiro', 'cerveja', 'mochila', 1), ('Dragoniano Guerreiro', 'racao', 'mochila', 3), ('Dragoniano Guerreiro', 'tocha', 'mochila', 1), ('Dragoniano Guerreiro', 'moeda_prata', 'mochila', 1),
  ('Dragoniano Líder', 'agua', 'mochila', 2), ('Dragoniano Líder', 'vinho', 'mochila', 1), ('Dragoniano Líder', 'racao', 'mochila', 3), ('Dragoniano Líder', 'tocha', 'mochila', 1), ('Dragoniano Líder', 'moeda_prata', 'mochila', 4), ('Dragoniano Líder', 'moeda_ouro', 'mochila', 1),

  ('Centauro', 'flecha', 'mochila', 20), ('Centauro', 'agua', 'mochila', 2), ('Centauro', 'racao', 'mochila', 2), ('Centauro', 'erva_amalil', 'mochila', 1), ('Centauro', 'moeda_cobre', 'mochila', 4),
  ('Minotauro', 'agua', 'mochila', 2), ('Minotauro', 'cerveja', 'mochila', 1), ('Minotauro', 'racao', 'mochila', 3), ('Minotauro', 'moeda_cobre', 'mochila', 4),
  ('Trol', 'agua_suja', 'mochila', 2), ('Trol', 'carne_podre', 'mochila', 2),
  ('Ciclope', 'agua', 'mochila', 3), ('Ciclope', 'hidromel', 'mochila', 2), ('Ciclope', 'racao', 'mochila', 4),
  ('Duende', 'licor', 'mochila', 1), ('Duende', 'canhamo', 'mochila', 2), ('Duende', 'vela', 'mochila', 1), ('Duende', 'moeda_cobre', 'mochila', 4),

  ('Esqueleto', 'moeda_cobre2', 'mochila', 2),
  ('Vampiro', 'vinho', 'mochila', 2), ('Vampiro', 'vela', 'mochila', 2), ('Vampiro', 'moeda_ouro', 'mochila', 1),
  ('Vingador', 'moeda_prata2', 'mochila', 3),
  ('Vladimir', 'vinho_de_conti', 'mochila', 1), ('Vladimir', 'vela', 'mochila', 3), ('Vladimir', 'moeda_ouro', 'mochila', 3),
  ('Nenrode', 'agua', 'mochila', 2), ('Nenrode', 'racao', 'mochila', 2), ('Nenrode', 'licor_negro', 'mochila', 1), ('Nenrode', 'moeda_prata', 'mochila', 4);

-- Todo slug tem de existir no catálogo.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM _add a WHERE NOT EXISTS (SELECT 1 FROM public.itens i WHERE i.slug = a.slug)) THEN
    RAISE EXCEPTION 'slug fora do catálogo: %', (SELECT string_agg(DISTINCT slug, ', ') FROM _add a WHERE NOT EXISTS (SELECT 1 FROM public.itens i WHERE i.slug = a.slug));
  END IF;
  IF EXISTS (SELECT 1 FROM _add a WHERE NOT EXISTS (SELECT 1 FROM public.criaturas c WHERE c.nome = a.criatura)) THEN
    RAISE EXCEPTION 'criatura fora do bestiário: %', (SELECT string_agg(DISTINCT criatura, ', ') FROM _add a WHERE NOT EXISTS (SELECT 1 FROM public.criaturas c WHERE c.nome = a.criatura));
  END IF;
END $$;

UPDATE public.criaturas c SET equipamento = COALESCE(c.equipamento, '[]'::jsonb) || novos.itens, atualizado_em = now()
FROM (
  SELECT a.criatura, jsonb_agg(
    CASE WHEN a.qtd IS NULL THEN jsonb_build_object('slug', a.slug, 'slot', a.slot)
         ELSE jsonb_build_object('slug', a.slug, 'slot', a.slot, 'qtd', a.qtd) END) AS itens
  FROM _add a JOIN public.criaturas cc ON cc.nome = a.criatura
  WHERE NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(cc.equipamento, '[]'::jsonb)) e
    WHERE (a.slot = 'mochila' AND e->>'slot' = 'mochila' AND e->>'slug' = a.slug)
       OR (a.slot <> 'mochila' AND a.slot <> 'arma' AND e->>'slot' = a.slot)
       OR (a.slot = 'arma' AND e->>'slug' = a.slug))
  GROUP BY a.criatura
) novos
WHERE c.nome = novos.criatura;

COMMIT;

-- ── Conferência ─────────────────────────────────────────────────────────────
-- Pertences do Orc (espera água, cerveja, ração, cânhamo, tocha, pederneira, cobre):
--   SELECT e->>'slug', e->>'qtd' FROM criaturas, jsonb_array_elements(equipamento) e
--    WHERE nome = 'Orc' AND e->>'slot' = 'mochila';
