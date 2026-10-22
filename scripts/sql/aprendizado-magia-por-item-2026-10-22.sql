-- scripts/sql/aprendizado-magia-por-item-2026-10-22.sql
-- ============================================================
-- Aprendizado de magia por item (spec 2026-10-22-aprendizado-magia-por-item).
--
-- Pedido do usuário (22/10/2026): "todas as magias precisam ser aprendidas
-- através do uso do item [...] qualquer profissão pode aprender qualquer
-- magia." Um pergaminho por magia (todos os níveis), que NÃO se consome; os
-- de Básica ficam vinculados a livros (livro_pergaminhos).
--
-- IDEMPOTENTE. Guardas no fim derrubam a transação se algo ficar torto.
-- REVERTER: restaurar de backup_pergaminhos_2026_10_22,
-- backup_inventario_pergaminhos_2026_10_22 e backup_magias_custo_2026_10_22.
-- ============================================================

BEGIN;

-- 0. Backups (sem policy: invisíveis para a API) ------------------------
CREATE TABLE IF NOT EXISTS public.backup_pergaminhos_2026_10_22 AS
  SELECT * FROM public.itens WHERE grupo = 'Consumíveis' AND slug LIKE 'pergaminho\_%';
CREATE TABLE IF NOT EXISTS public.backup_inventario_pergaminhos_2026_10_22 AS
  SELECT id, inventario FROM public.personagens WHERE inventario::text LIKE '%"pergaminho\_%';
CREATE TABLE IF NOT EXISTS public.backup_magias_custo_2026_10_22 AS
  SELECT key, custo FROM public.magias;
ALTER TABLE public.backup_pergaminhos_2026_10_22            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_inventario_pergaminhos_2026_10_22 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_magias_custo_2026_10_22           ENABLE ROW LEVEL SECURITY;

-- 1. Custos por tipo ----------------------------------------------------
-- Básica 1→1, ≥2→2 · Perdida ≤2→2, ≥3→3 · Ancestral ≤3→3, 4→4.
UPDATE public.magias SET custo = CASE tipo
    WHEN 'Básica'    THEN LEAST(GREATEST(custo, 1), 2)
    WHEN 'Perdida'   THEN LEAST(GREATEST(custo, 2), 3)
    WHEN 'Ancestral' THEN LEAST(GREATEST(custo, 3), 4)
  END
WHERE tipo IN ('Básica', 'Perdida', 'Ancestral');

-- 2. Pergaminho único por magia -----------------------------------------
-- 2a. Quem já tem o slug novo (Milagre Análogo, Energia Primordial) vira o molde.
UPDATE public.itens i SET
  nome = 'Pergaminho ' || m.nome,
  magia = m.nome,
  nivel_magia = NULL,
  origem = CASE WHEN m.tipo = 'Básica' THEN 'Comum' ELSE 'Raro' END,
  descricao = 'Pergaminho com instruções para o aprendizado da magia ' || m.nome || '.',
  atualizado_em = now()
FROM public.magias m
WHERE i.slug = 'pergaminho_' || m.key;

-- 2b. Cria o que falta.
INSERT INTO public.itens
  (slug, nome, grupo, ocupa, tipo, origem, icone, magia, nivel_magia, descricao, dano_l, dano_m, dano_p)
SELECT
  'pergaminho_' || m.key, 'Pergaminho ' || m.nome, 'Consumíveis', 0.1, 'S',
  CASE WHEN m.tipo = 'Básica' THEN 'Comum' ELSE 'Raro' END,
  'ti-file-star', m.nome, NULL,
  'Pergaminho com instruções para o aprendizado da magia ' || m.nome || '.',
  0, 0, 0
FROM public.magias m
WHERE NOT EXISTS (SELECT 1 FROM public.itens i WHERE i.slug = 'pergaminho_' || m.key);

-- 3. Mapa pergaminho por nível → pergaminho único -----------------------
CREATE TEMP TABLE _mapa_perg ON COMMIT DROP AS
SELECT DISTINCT ON (i.slug) i.slug AS antigo, 'pergaminho_' || m.key AS novo
  FROM public.itens i
  JOIN public.magias m
    ON btrim(lower(m.nome)) = btrim(lower(i.magia))
    OR btrim(lower(m.key))  = btrim(lower(i.magia))
    -- Magia renomeada depois do pergaminho (Ataque Infernal → Nictoataque,
    -- key ataque_infernal): casa pelo slug pergaminho_<key>_<n>.
    OR i.slug ~ ('^pergaminho_' || m.key || '_[13579]$')
 WHERE i.grupo = 'Consumíveis'
   AND i.slug LIKE 'pergaminho\_%'
   AND i.nivel_magia IS NOT NULL
   AND i.slug <> 'pergaminho_' || m.key
 ORDER BY i.slug, (i.slug LIKE 'pergaminho\_' || m.key || '\_%') DESC;

-- 3b. Trava: anúncio aberto ou estoque de loja com pergaminho antigo ------
-- O DELETE do passo 5 dispara itens_apos_excluir, que RETIRA o anúncio e
-- APAGA a entrada do estoque_loja — o item à venda ficaria travado e o
-- Mestre perderia o estoque sem conversão. Em 22/10/2026 havia zero casos;
-- se aparecer algum, a transação para aqui e o caso é resolvido à mão.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.anuncios_loja a
   WHERE a.status NOT IN ('vendido', 'retirado')
     AND (a.slug IN (SELECT antigo FROM _mapa_perg) OR a.item->>'slug' IN (SELECT antigo FROM _mapa_perg));
  IF n > 0 THEN RAISE EXCEPTION '% anúncio(s) aberto(s) com pergaminho antigo — retirar antes', n; END IF;
  SELECT count(*) INTO n FROM public.historias h, _mapa_perg mp
   WHERE h.estoque_loja::text LIKE '%"' || mp.antigo || '"%';
  IF n > 0 THEN RAISE EXCEPTION '% estoque(s) de loja com pergaminho antigo — trocar antes', n; END IF;
END $$;

-- 4. Instâncias nos inventários: troca o slug e deixa UMA por magia ------
-- (o item não se consome; cópias não têm uso). Só pergaminho de magia entra
-- na deduplicação, e instância à venda (anuncio_id) nunca é descartada. O
-- trigger personagens_inventario_versao sobe inventario_versao sozinho.
WITH alvo AS (
  SELECT p.id, p.inventario
    FROM public.personagens p
   WHERE EXISTS (
     SELECT 1 FROM jsonb_array_elements(coalesce(p.inventario->'itens', '[]'::jsonb)) e
       JOIN _mapa_perg mp ON mp.antigo = e->>'slug')
), trocado AS (
  SELECT a.id, e.ord,
         CASE WHEN mp.novo IS NOT NULL
              THEN jsonb_set(jsonb_set(e.val, '{slug}', to_jsonb(mp.novo)), '{quantidade}', '1'::jsonb)
              ELSE e.val END AS val
    FROM alvo a
    CROSS JOIN LATERAL jsonb_array_elements(a.inventario->'itens') WITH ORDINALITY AS e(val, ord)
    LEFT JOIN _mapa_perg mp ON mp.antigo = e.val->>'slug'
), numerado AS (
  SELECT id, ord, val,
         -- A livre (sem anuncio_id) vem primeiro: é ela que fica.
         row_number() OVER (PARTITION BY id, val->>'slug' ORDER BY (val ? 'anuncio_id'), ord) AS rn,
         (val->>'slug') IN (SELECT novo FROM _mapa_perg) AND NOT (val ? 'anuncio_id') AS eh_perg
    FROM trocado
), novo AS (
  SELECT id, jsonb_agg(val ORDER BY ord) AS itens
    FROM numerado
   WHERE NOT (eh_perg AND rn > 1)
   GROUP BY id
)
UPDATE public.personagens p
   SET inventario = jsonb_set(p.inventario, '{itens}', novo.itens)
  FROM novo
 WHERE p.id = novo.id;

-- 5. Apaga os pergaminhos por nível -------------------------------------
DELETE FROM public.itens i USING _mapa_perg mp WHERE i.slug = mp.antigo;

-- 6. Livros novos -------------------------------------------------------
INSERT INTO public.itens (slug, nome, grupo, ocupa, tipo, origem, icone, descricao, dano_l, dano_m, dano_p)
SELECT v.slug, v.nome, 'Itens', l.ocupa, l.tipo, l.origem, l.icone, v.descricao, 0, 0, 0
  FROM (VALUES
    ('livro_do_mago',       'Livro do Mago',                       'Livro com as magias difundidas entre os magos.'),
    ('livro_do_bardo',      'Livro do Bardo',                      'Livro com as magias difundidas entre os bardos.'),
    ('livro_do_rastreador', 'Livro do Rastreador',                 'Livro com as magias difundidas entre os rastreadores.'),
    ('livro_do_cacador',    'Livro da Trilha dos Caçadores',       'Livro da trilha dos caçadores.'),
    ('livro_do_explorador', 'Livro da Trilha dos Exploradores',    'Livro da trilha dos exploradores.'),
    ('livro_do_guardiao',   'Livro da Trilha dos Guardiões',       'Livro da trilha dos guardiões.')
  ) AS v(slug, nome, descricao)
  -- Molde físico: o livro de Ordem que já existe.
  CROSS JOIN (SELECT ocupa, tipo, origem, icone FROM public.itens WHERE slug = 'livro_do_justiceiro') l
 WHERE NOT EXISTS (SELECT 1 FROM public.itens i WHERE i.slug = v.slug);

-- 7. Tabela de vínculo --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.livro_pergaminhos (
  livro_slug      text NOT NULL REFERENCES public.itens(slug) ON UPDATE CASCADE ON DELETE CASCADE,
  pergaminho_slug text NOT NULL REFERENCES public.itens(slug) ON UPDATE CASCADE ON DELETE CASCADE,
  PRIMARY KEY (livro_slug, pergaminho_slug)
);
CREATE INDEX IF NOT EXISTS livro_pergaminhos_pergaminho_idx ON public.livro_pergaminhos (pergaminho_slug);
ALTER TABLE public.livro_pergaminhos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS livro_pergaminhos_leitura ON public.livro_pergaminhos;
DROP POLICY IF EXISTS livro_pergaminhos_admin_insert ON public.livro_pergaminhos;
DROP POLICY IF EXISTS livro_pergaminhos_admin_delete ON public.livro_pergaminhos;
CREATE POLICY livro_pergaminhos_leitura      ON public.livro_pergaminhos FOR SELECT USING (true);
CREATE POLICY livro_pergaminhos_admin_insert ON public.livro_pergaminhos FOR INSERT WITH CHECK (eh_admin());
CREATE POLICY livro_pergaminhos_admin_delete ON public.livro_pergaminhos FOR DELETE USING (eh_admin());

-- 8. Carga inicial: Básicas, a partir de `permissao` --------------------
CREATE TEMP TABLE _perm_livro (perm text, livro_slug text) ON COMMIT DROP;
INSERT INTO _perm_livro VALUES
  ('Mago', 'livro_do_mago'), ('Bardo', 'livro_do_bardo'), ('Rastreador', 'livro_do_rastreador'),
  ('Sacerdote', 'livro_do_deus_blator'),   ('Sacerdote', 'livro_do_deus_cambu'),
  ('Sacerdote', 'livro_da_deusa_crezir'),  ('Sacerdote', 'livro_do_deus_crizagom'),
  ('Sacerdote', 'livro_do_deus_cruine'),   ('Sacerdote', 'livro_da_deusa_ganis'),
  ('Sacerdote', 'livro_da_deusa_lena'),    ('Sacerdote', 'livro_da_deusa_maira'),
  ('Sacerdote', 'livro_do_deus_palier'),   ('Sacerdote', 'livro_do_deus_parom'),
  ('Sacerdote', 'livro_do_deus_plandis'),  ('Sacerdote', 'livro_do_deus_selimon'),
  ('Sacerdote', 'livro_do_deus_sevides'),
  ('Ordem de Blator', 'livro_do_senhor_da_guerra'), ('Ordem de Cambu', 'livro_do_diplomata_dourado'),
  ('Ordem de Crezir', 'livro_do_dragao_vermelho'),  ('Ordem de Crizagom', 'livro_do_justiceiro'),
  ('Ordem de Cruine', 'livro_do_vingador_negro'),   ('Ordem de Ganis', 'livro_do_filho_do_mar'),
  ('Ordem de Lena', 'livro_do_vigario_rosa'),       ('Ordem de Maira', 'livro_do_runcaim'),
  ('Ordem de Palier', 'livro_do_sabio'),            ('Ordem de Parom', 'livro_do_mestre_da_forja'),
  ('Ordem de Plandis', 'livro_do_oraculo'),         ('Ordem de Selimon', 'livro_do_pacificador'),
  ('Ordem de Sevides', 'livro_do_filho_da_terra'),
  ('Colégio Alquímico', 'livro_do_alquimista'),     ('Colégio Elemental', 'livro_do_elementalista'),
  ('Colégio Filosófico', 'livro_do_filosofo'),      ('Colégio Ilusionista', 'livro_do_ilusionista'),
  ('Colégio Naturalista', 'livro_do_xama'),         ('Colégio Necromântico', 'livro_do_necromante'),
  ('Confraria de Arautos', 'livro_do_arauto'),      ('Confraria de Artistas', 'livro_do_artista'),
  ('Confraria de Eruditos', 'livro_do_erudito'),
  ('Trilha de Caçadores', 'livro_do_cacador'),      ('Trilha de Exploradores', 'livro_do_explorador'),
  ('Trilha de Guardiões', 'livro_do_guardiao');

INSERT INTO public.livro_pergaminhos (livro_slug, pergaminho_slug)
SELECT DISTINCT pl.livro_slug, 'pergaminho_' || m.key
  FROM public.magias m
  CROSS JOIN LATERAL unnest(string_to_array(m.permissao, ',')) AS p(x)
  JOIN _perm_livro pl ON pl.perm = btrim(p.x)
 WHERE m.tipo = 'Básica'
ON CONFLICT DO NOTHING;

-- 9. Guardas ------------------------------------------------------------
DO $$
DECLARE n int;
BEGIN
  -- todo livro do de-para existe
  SELECT count(*) INTO n FROM _perm_livro pl
   WHERE NOT EXISTS (SELECT 1 FROM public.itens i WHERE i.slug = pl.livro_slug);
  IF n > 0 THEN RAISE EXCEPTION '% livro(s) do de-para não existem em itens', n; END IF;

  -- toda magia tem o seu pergaminho único
  SELECT count(*) INTO n FROM public.magias m
   WHERE NOT EXISTS (SELECT 1 FROM public.itens i
                      WHERE i.slug = 'pergaminho_' || m.key AND i.nivel_magia IS NULL);
  IF n > 0 THEN RAISE EXCEPTION '% magia(s) sem pergaminho único', n; END IF;

  -- todo pergaminho de Básica está em ao menos um livro
  SELECT count(*) INTO n FROM public.magias m
   WHERE m.tipo = 'Básica'
     AND NOT EXISTS (SELECT 1 FROM public.livro_pergaminhos lp WHERE lp.pergaminho_slug = 'pergaminho_' || m.key);
  IF n > 0 THEN RAISE EXCEPTION '% básica(s) fora de qualquer livro', n; END IF;

  -- nenhum pergaminho por nível sobrou no catálogo
  SELECT count(*) INTO n FROM public.itens
   WHERE grupo = 'Consumíveis' AND slug LIKE 'pergaminho\_%' AND nivel_magia IS NOT NULL;
  IF n > 0 THEN RAISE EXCEPTION '% pergaminho(s) por nível sobraram no catálogo', n; END IF;

  -- nenhuma instância aponta para slug que não existe mais
  SELECT count(*) INTO n FROM public.personagens p
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(p.inventario->'itens', '[]'::jsonb)) e
   WHERE (e->>'slug') LIKE 'pergaminho\_%'
     AND NOT EXISTS (SELECT 1 FROM public.itens i WHERE i.slug = e->>'slug');
  IF n > 0 THEN RAISE EXCEPTION '% instância(s) de pergaminho órfã(s)', n; END IF;

  -- custos dentro da faixa
  SELECT count(*) INTO n FROM public.magias
   WHERE (tipo = 'Básica'    AND custo NOT BETWEEN 1 AND 2)
      OR (tipo = 'Perdida'   AND custo NOT BETWEEN 2 AND 3)
      OR (tipo = 'Ancestral' AND custo NOT BETWEEN 3 AND 4);
  IF n > 0 THEN RAISE EXCEPTION '% magia(s) com custo fora da faixa', n; END IF;
END $$;

COMMIT;
