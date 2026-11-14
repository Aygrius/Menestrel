-- Lore com uma versão só — 14/11/2026
--
-- Pedido do usuário: "Percebi que as cidades, pessoas, e deuses não está
-- aparecendo para todas as histórias. Há uma versão para cada mesa? Isso não
-- pode acontecer."
--
-- O que acontecia: o "Novo" do Lore, aberto dentro de uma mesa, caía no ramo
-- de CÓPIA da salvar_lore_entrada (p_historia_id setado) — a entrada nascia
-- com historia_id da mesa e não existia para as outras. A mesa 13 tinha 24
-- cidades, 7 reinos e 4 pessoas só dela; a 24 recriou Acordo, Âmien, Conti e
-- Tronum por cima.
--
-- O que este script faz:
--   1. Funde as quatro duplicatas 13 × 24 — fica o slug da que tem texto, a
--      outra empresta o que faltar (coalesce) e some; as referências mudam.
--   2. Promove todas as cópias a globais (historia_id NULL). O slug fica como
--      está: trocar de slug obrigaria a reescrever todas as referências.
--   3. salvar_lore_entrada: o admin cria no mundo mesmo de dentro de uma mesa.
--      Mestre que não é admin continua com cópia (não mexe no mundo dos
--      outros). Entrada criada por personagem (p_criado_por_personagem_id)
--      também continua cópia da mesa.

BEGIN;

-- ── 1. Duplicatas ──────────────────────────────────────────────────────────
CREATE TEMP TABLE _troca (tipo text, velho text, novo text) ON COMMIT DROP;
INSERT INTO _troca VALUES
  ('reino',  'novo-reino-h13-3099ab02',  'novo-reino-h24-a3565606'),   -- Conti: texto na 24
  ('reino',  'novo-reino-h13-756ce369',  'novo-reino-h24-f00c2479'),   -- Acordo: texto na 24
  ('reino',  'novo-reino-h24-3dff0a5c',  'novo-reino-h13-f117a8ed'),   -- Âmien: texto na 13
  ('cidade', 'nova-cidade-h24-f39b412d', 'nova-cidade-h13-6b440441');  -- Tronum: texto na 13

-- O que fica herda o que só o outro tinha.
UPDATE public.reinos k SET
  descricao = COALESCE(NULLIF(k.descricao, ''), v.descricao),
  icone = COALESCE(k.icone, v.icone),
  governo = COALESCE(NULLIF(k.governo, ''), v.governo),
  cultura = COALESCE(NULLIF(k.cultura, ''), v.cultura),
  historia_recente = COALESCE(NULLIF(k.historia_recente, ''), v.historia_recente),
  rumores = COALESCE(NULLIF(k.rumores, ''), v.rumores),
  resumo = COALESCE(NULLIF(k.resumo, ''), v.resumo),
  capital = COALESCE(NULLIF(k.capital, ''), v.capital)
FROM _troca t JOIN public.reinos v ON v.slug = t.velho
WHERE t.tipo = 'reino' AND k.slug = t.novo;

UPDATE public.cidades k SET
  descricao = COALESCE(NULLIF(k.descricao, ''), v.descricao),
  imagem = COALESCE(k.imagem, v.imagem),
  populacao = COALESCE(k.populacao, v.populacao),
  governante = COALESCE(NULLIF(k.governante, ''), v.governante),
  economia = COALESCE(NULLIF(k.economia, ''), v.economia),
  religiao = COALESCE(NULLIF(k.religiao, ''), v.religiao),
  rumores = COALESCE(NULLIF(k.rumores, ''), v.rumores)
FROM _troca t JOIN public.cidades v ON v.slug = t.velho
WHERE t.tipo = 'cidade' AND k.slug = t.novo;

-- Referências dentro do próprio lore.
UPDATE public.cidades c SET reino = t.novo FROM _troca t WHERE t.tipo = 'reino' AND c.reino = t.velho;
UPDATE public.locais  l SET reino = t.novo FROM _troca t WHERE t.tipo = 'reino' AND l.reino = t.velho;
UPDATE public.npcs    n SET reino = t.novo FROM _troca t WHERE t.tipo = 'reino' AND n.reino = t.velho;
UPDATE public.npcs    n SET cidade = t.novo FROM _troca t WHERE t.tipo = 'cidade' AND n.cidade = t.velho;
UPDATE public.npcs    n SET origem = t.novo FROM _troca t WHERE n.origem = t.velho;
UPDATE public.reinos  r SET capital = t.novo FROM _troca t WHERE t.tipo = 'cidade' AND r.capital = t.velho;
UPDATE public.aventuras a SET cidade_slug = t.novo FROM _troca t WHERE t.tipo = 'cidade' AND a.cidade_slug = t.velho;

-- Listas da mesa: troca e tira repetido.
UPDATE public.historias h SET reino_ids = (
  SELECT array_agg(DISTINCT COALESCE(t.novo, x)) FROM unnest(h.reino_ids) x
  LEFT JOIN _troca t ON t.tipo = 'reino' AND t.velho = x)
WHERE h.reino_ids && (SELECT array_agg(velho) FROM _troca WHERE tipo = 'reino');
UPDATE public.historias h SET cidade_ids = (
  SELECT array_agg(DISTINCT COALESCE(t.novo, x)) FROM unnest(h.cidade_ids) x
  LEFT JOIN _troca t ON t.tipo = 'cidade' AND t.velho = x)
WHERE h.cidade_ids && (SELECT array_agg(velho) FROM _troca WHERE tipo = 'cidade');

-- Chaves "tipo:slug" do lore_acesso_pj.
UPDATE public.historias h SET lore_acesso_pj = (
  SELECT COALESCE(jsonb_object_agg(
    COALESCE(split_part(e.key, ':', 1) || ':' || t.novo, e.key), e.value), '{}'::jsonb)
  FROM jsonb_each(h.lore_acesso_pj) e
  LEFT JOIN _troca t ON t.velho = split_part(e.key, ':', 2))
WHERE h.lore_acesso_pj::text ~ (SELECT string_agg(velho, '|') FROM _troca);

DELETE FROM public.reinos  r USING _troca t WHERE t.tipo = 'reino'  AND r.slug = t.velho;
DELETE FROM public.cidades c USING _troca t WHERE t.tipo = 'cidade' AND c.slug = t.velho;

-- ── 2. Cópias viram mundo ──────────────────────────────────────────────────
-- Só as que o admin criou como Mestre (sem personagem autor).
-- reinos e npcs têm o CHECK *_copia_consistente: global não tem baseado_em.
UPDATE public.reinos  SET historia_id = NULL, baseado_em = NULL WHERE historia_id IS NOT NULL AND criado_por_personagem_id IS NULL;
UPDATE public.cidades SET historia_id = NULL WHERE historia_id IS NOT NULL AND criado_por_personagem_id IS NULL;
UPDATE public.locais  SET historia_id = NULL WHERE historia_id IS NOT NULL AND criado_por_personagem_id IS NULL;
UPDATE public.npcs    SET historia_id = NULL, baseado_em = NULL WHERE historia_id IS NOT NULL AND criado_por_personagem_id IS NULL;

-- ── 3. O admin cria no mundo ───────────────────────────────────────────────
-- Troca só a condição do ramo "criar no mundo"; o resto da função fica igual.
DO $$
DECLARE def text; novo text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'salvar_lore_entrada';
  novo := replace(def,
    'ELSIF p_id IS NULL AND p_historia_id IS NULL THEN',
    'ELSIF p_id IS NULL AND (p_historia_id IS NULL OR (public.eh_admin() AND p_criado_por_personagem_id IS NULL)) THEN');
  IF novo = def THEN RAISE EXCEPTION 'salvar_lore_entrada: condição não encontrada'; END IF;
  EXECUTE novo;
END $$;

COMMIT;

-- ── Conferência ─────────────────────────────────────────────────────────────
-- Nenhuma cópia de mesa (espera 0 em todas):
--   SELECT 'reinos', count(*) FROM reinos WHERE historia_id IS NOT NULL
--   UNION ALL SELECT 'cidades', count(*) FROM cidades WHERE historia_id IS NOT NULL
--   UNION ALL SELECT 'npcs', count(*) FROM npcs WHERE historia_id IS NOT NULL;
-- Nenhum nome repetido no mundo (espera 0 linhas):
--   SELECT nome, count(*) FROM cidades WHERE historia_id IS NULL GROUP BY nome HAVING count(*) > 1;
--   SELECT nome, count(*) FROM reinos  WHERE historia_id IS NULL GROUP BY nome HAVING count(*) > 1;
