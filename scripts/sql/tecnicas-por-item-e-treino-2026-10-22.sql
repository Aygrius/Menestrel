-- scripts/sql/tecnicas-por-item-e-treino-2026-10-22.sql
-- ============================================================
-- Técnicas por item e fila de treino (spec 2026-10-22-tecnicas-por-item-e-treino).
-- Pedido do usuário (22/10/2026): "todo mundo poderá aprender todas as
-- técnicas. Toda técnica terá um pergaminho para aprender igual a magia" —
-- livros separados dos de magia (Manuais) e um Livro Geral para as técnicas
-- sem permissão. A coluna personagens.treinos guarda a fila de treino
-- (técnicas: 3 dias de Treinando por nível; magias: 1 dia da atividade da
-- classe). IDEMPOTENTE.
-- ============================================================
BEGIN;
ALTER TABLE public.personagens ADD COLUMN IF NOT EXISTS treinos jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.itens ADD COLUMN IF NOT EXISTS tecnica text;

INSERT INTO public.itens (slug, nome, grupo, ocupa, tipo, origem, icone, tecnica, descricao, dano_l, dano_m, dano_p)
SELECT 'pergaminho_tecnica_' || t.key, 'Pergaminho ' || t.nome, 'Consumíveis', 0.1, 'S', 'Comum', 'ti-file-star', t.nome,
       'Pergaminho com instruções para o treino da técnica ' || t.nome || '.', 0, 0, 0
  FROM public.tecnicas t
 WHERE NOT EXISTS (SELECT 1 FROM public.itens i WHERE i.slug = 'pergaminho_tecnica_' || t.key);

INSERT INTO public.itens (slug, nome, grupo, ocupa, tipo, origem, icone, descricao, dano_l, dano_m, dano_p)
SELECT v.slug, v.nome, 'Itens', l.ocupa, l.tipo, l.origem, l.icone, v.descricao, 0, 0, 0
  FROM (VALUES
    ('manual_do_guerreiro',  'Manual do Guerreiro',  'Manual com as técnicas difundidas entre os guerreiros.'),
    ('manual_do_ladino',     'Manual do Ladino',     'Manual com as técnicas difundidas entre os ladinos.'),
    ('manual_do_rastreador', 'Manual do Rastreador', 'Manual com as técnicas difundidas entre os rastreadores.'),
    ('manual_do_bardo',      'Manual do Bardo',      'Manual com as técnicas difundidas entre os bardos.'),
    ('manual_do_sacerdote',  'Manual do Sacerdote',  'Manual com as técnicas difundidas entre os sacerdotes.'),
    ('manual_do_mago',       'Manual do Mago',       'Manual com as técnicas difundidas entre os magos.'),
    ('manual_academia_soldados',    'Manual da Academia de Soldados',    'Manual da academia de soldados.'),
    ('manual_academia_arqueiros',   'Manual da Academia de Arqueiros',   'Manual da academia de arqueiros.'),
    ('manual_academia_cavaleiros',  'Manual da Academia de Cavaleiros',  'Manual da academia de cavaleiros.'),
    ('manual_academia_gladiadores', 'Manual da Academia de Gladiadores', 'Manual da academia de gladiadores.'),
    ('manual_guilda_assassinos', 'Manual da Guilda de Assassinos', 'Manual da guilda de assassinos.'),
    ('manual_guilda_ladroes',    'Manual da Guilda de Ladrões',    'Manual da guilda de ladrões.'),
    ('manual_guilda_piratas',    'Manual da Guilda de Piratas',    'Manual da guilda de piratas.'),
    ('livro_geral_tecnicas_combate', 'Livro Geral de Técnicas de Combate', 'Técnicas de combate ao alcance de qualquer um.')
  ) AS v(slug, nome, descricao)
  CROSS JOIN (SELECT ocupa, tipo, origem, icone FROM public.itens WHERE slug = 'livro_do_justiceiro') l
 WHERE NOT EXISTS (SELECT 1 FROM public.itens i WHERE i.slug = v.slug);

CREATE TEMP TABLE _perm_manual (perm text, livro_slug text) ON COMMIT DROP;
INSERT INTO _perm_manual VALUES
  ('Guerreiro','manual_do_guerreiro'),('Ladino','manual_do_ladino'),('Rastreador','manual_do_rastreador'),
  ('Bardo','manual_do_bardo'),('Sacerdote','manual_do_sacerdote'),('Mago','manual_do_mago'),
  ('Academia de Soldados','manual_academia_soldados'),('Academia de Arqueiros','manual_academia_arqueiros'),
  ('Academia de Cavaleiros','manual_academia_cavaleiros'),('Academia de Gladiadores','manual_academia_gladiadores'),
  ('Guilda de Assassinos','manual_guilda_assassinos'),('Guilda de Ladrões','manual_guilda_ladroes'),
  ('Guilda de Piratas','manual_guilda_piratas');

INSERT INTO public.livro_pergaminhos (livro_slug, pergaminho_slug)
SELECT DISTINCT pm.livro_slug, 'pergaminho_tecnica_' || t.key
  FROM public.tecnicas t
  CROSS JOIN LATERAL unnest(string_to_array(coalesce(t.permissao, ''), ',')) AS p(x)
  JOIN _perm_manual pm ON pm.perm = btrim(p.x)
ON CONFLICT DO NOTHING;
INSERT INTO public.livro_pergaminhos (livro_slug, pergaminho_slug)
SELECT 'livro_geral_tecnicas_combate', 'pergaminho_tecnica_' || t.key
  FROM public.tecnicas t WHERE nullif(btrim(t.permissao), '') IS NULL
ON CONFLICT DO NOTHING;

DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM public.tecnicas t
   WHERE NOT EXISTS (SELECT 1 FROM public.itens i WHERE i.slug = 'pergaminho_tecnica_' || t.key);
  IF n > 0 THEN RAISE EXCEPTION '% técnica(s) sem pergaminho', n; END IF;
  SELECT count(*) INTO n FROM public.tecnicas t
   WHERE NOT EXISTS (SELECT 1 FROM public.livro_pergaminhos lp WHERE lp.pergaminho_slug = 'pergaminho_tecnica_' || t.key);
  IF n > 0 THEN RAISE EXCEPTION '% técnica(s) fora de qualquer livro', n; END IF;
END $$;
COMMIT;
