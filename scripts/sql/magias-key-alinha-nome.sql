-- scripts/sql/magias-key-alinha-nome.sql
-- ============================================================
-- Alinha `magias.key` ao `magias.nome` em SEIS linhas onde os dois divergiam.
--
-- POR QUE. A key é a identidade da magia para `personagens.magias` (jsonb
-- key→passos) e para o registro de efeito em código. Quando ela não deriva do
-- nome, procurar pela magia não a encontra:
--
--     nome "Hidroproteção"  →  key `protecao_elemental`
--     nome "Aeroproteção"   →  key `protecao_animal`
--
-- Aconteceu de verdade em 12/09/2026: procurei `hidroprotecao` no banco, não
-- achei, e quase concluí que a magia não existia. As quatro chaves iniciadas
-- por `protecao_` são ainda piores, porque soam genéricas e ocupam um espaço
-- de nomes que outra magia poderia querer.
--
-- O QUE REFERENCIA A KEY, e o que este script faz com cada um:
--
--   magias.key            → renomeado aqui
--   personagens.magias    → renomeado aqui (jsonb: remove a antiga, põe a nova
--                           com o mesmo valor de passos). 2 PJs afetados.
--   itens.magia           → conferido: ZERO linhas usam estas chaves
--   criaturas.magia       → NÃO afetado: referencia por NOME, não por key
--   MAGIA_EFEITO_MAP      → atualizado no código, no mesmo commit
--
-- Conferido antes de rodar: nenhuma das chaves novas já existe (sem colisão).
--
-- REVERSÍVEL: basta trocar antiga↔nova na lista.
-- ============================================================

-- CONFERÊNCIA (antes) — deve devolver as 6:
--   SELECT key, nome FROM public.magias WHERE key IN
--     ('protecao_animal','circulo_de_protecao','manipulacao_de_luz',
--      'protecao_elemental','protecao_divina','protecao_celestial');

BEGIN;

-- A lista das seis, em um lugar só: os dois UPDATEs abaixo a consomem.
CREATE TEMP TABLE _ren(antiga text PRIMARY KEY, nova text NOT NULL) ON COMMIT DROP;
INSERT INTO _ren VALUES
  ('protecao_animal',     'aeroprotecao'),        -- Aeroproteção
  ('circulo_de_protecao', 'circulo_profano'),     -- Círculo Profano
  ('manipulacao_de_luz',  'fotomanipulacao'),     -- Fotomanipulação
  ('protecao_elemental',  'hidroprotecao'),       -- Hidroproteção
  ('protecao_divina',     'intercessao_divina'),  -- Intercessão Divina
  ('protecao_celestial',  'ultima_oracao');       -- Última Oração

-- Guarda: aborta se alguma chave nova já existir.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.magias m JOIN _ren r ON m.key = r.nova;
  IF n > 0 THEN RAISE EXCEPTION 'Colisão: % chave(s) nova(s) já existem', n; END IF;
END $$;

-- 1) personagens.magias — ANTES de magias.key, para a leitura da antiga ainda
--    fazer sentido se alguém inspecionar no meio.
UPDATE public.personagens p
   SET magias = (
     SELECT jsonb_object_agg(coalesce(r.nova, k.key), k.value)
     FROM jsonb_each(p.magias) AS k(key, value)
     LEFT JOIN _ren r ON r.antiga = k.key
   )
 WHERE EXISTS (
   SELECT 1 FROM jsonb_each_text(p.magias) AS k(key, v)
   JOIN _ren r ON r.antiga = k.key
 );

-- 2) magias.key
UPDATE public.magias m SET key = r.nova FROM _ren r WHERE m.key = r.antiga;

COMMIT;

-- CONFERÊNCIA (depois):
--   -- zero linhas onde a key diverge do nome:
--   SELECT key, nome FROM public.magias
--    WHERE key <> lower(regexp_replace(translate(nome,
--            'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
--            'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'),'[^a-zA-Z0-9]+','_','g'));
--   -- zero PJs apontando para chave inexistente:
--   SELECT p.id, k.key FROM public.personagens p
--     CROSS JOIN LATERAL jsonb_each_text(p.magias) k(key,v)
--     LEFT JOIN public.magias m ON m.key = k.key
--    WHERE m.key IS NULL;
