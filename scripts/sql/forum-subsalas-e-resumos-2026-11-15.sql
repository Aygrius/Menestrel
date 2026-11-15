-- scripts/sql/forum-subsalas-e-resumos-2026-11-15.sql
-- ============================================================
-- SALAS DENTRO DE SALAS, VISUALIZAÇÕES E O ÚLTIMO POST (15/11/2026)
-- ============================================================
-- Usuário: "No fórum, será possível o mestre criar salas dentro de salas.
-- Na sala, além da quantidade de tópicos, mostre a quantidade de salas,
-- mostre também o título do último tópico postado, e o nome do usuário.
-- Na página de tópicos, mostre a quantidade de visualizações e quantidade
-- de comentários. Mostre o título do último post, horário e nome do usuário."
--
--   • forum_salas.pai_id — a sala de cima (NULL = sala do primeiro nível).
--     Apagar a sala apaga as de dentro (cascade). Criar continua só do
--     Imperador (forum_salas_imperador).
--   • forum_topicos.visualizacoes — cada abertura do tópico soma 1, por
--     forum_ver_topico (SECURITY DEFINER: ninguém além do autor edita a linha).
--   • forum_salas_resumo() devolve TODAS as salas (a tela monta a árvore e o
--     caminho), com os tópicos e as salas DE DENTRO contados, e o último tópico
--     postado nela ou em qualquer sala abaixo dela.
--   • forum_topicos_da_sala() ganha as visualizações e a última resposta
--     (trecho, autor, hora). Resposta não tem título: o "título do último
--     post" é o começo do texto dela.
--
-- REVERTER: drop das funções novas, recriar as de tipos-de-conta-e-forum-
-- 2026-11-15.sql; alter table … drop column pai_id / visualizacoes.
-- ============================================================

BEGIN;

ALTER TABLE public.forum_salas ADD COLUMN IF NOT EXISTS pai_id bigint REFERENCES public.forum_salas (id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS forum_salas_pai_idx ON public.forum_salas (pai_id);
-- Uma sala não mora dentro de si mesma.
DO $$ BEGIN
  ALTER TABLE public.forum_salas ADD CONSTRAINT forum_salas_pai_nao_ela CHECK (pai_id IS NULL OR pai_id <> id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.forum_topicos ADD COLUMN IF NOT EXISTS visualizacoes integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.forum_ver_topico(p_id bigint)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.forum_topicos SET visualizacoes = visualizacoes + 1
   WHERE id = p_id AND auth.uid() IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.forum_ver_topico(bigint) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.forum_ver_topico(bigint) TO authenticated;

DROP FUNCTION IF EXISTS public.forum_salas_resumo();
CREATE FUNCTION public.forum_salas_resumo()
RETURNS TABLE (id bigint, pai_id bigint, nome text, descricao text, ordem integer, fechada boolean,
               topicos integer, salas integer, ultima_atividade timestamptz,
               ultimo_topico_id bigint, ultimo_topico_titulo text, ultimo_topico_autor text, ultimo_topico_em timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE arvore AS (
    -- cada sala com ela mesma e todas as de baixo
    SELECT s.id AS raiz, s.id AS sala FROM public.forum_salas s
    UNION
    SELECT a.raiz, f.id FROM arvore a JOIN public.forum_salas f ON f.pai_id = a.sala
  )
  SELECT s.id, s.pai_id, s.nome, s.descricao, s.ordem, s.fechada,
         (SELECT count(*)::int FROM public.forum_topicos t WHERE t.sala_id = s.id),
         (SELECT count(*)::int FROM public.forum_salas f WHERE f.pai_id = s.id),
         (SELECT max(t.ultima_atividade) FROM public.forum_topicos t JOIN arvore a ON a.sala = t.sala_id WHERE a.raiz = s.id),
         u.id, u.titulo, u.autor, u.criado_em
    FROM public.forum_salas s
    LEFT JOIN LATERAL (
      SELECT t.id, t.titulo, pr.full_name AS autor, t.criado_em
        FROM public.forum_topicos t
        JOIN arvore a ON a.sala = t.sala_id AND a.raiz = s.id
        LEFT JOIN public.profiles pr ON pr.id = t.autor_id
       ORDER BY t.criado_em DESC
       LIMIT 1
    ) u ON true
   WHERE auth.uid() IS NOT NULL
   ORDER BY s.ordem, s.nome;
$$;

DROP FUNCTION IF EXISTS public.forum_topicos_da_sala(bigint);
CREATE FUNCTION public.forum_topicos_da_sala(p_sala bigint)
RETURNS TABLE (id bigint, titulo text, autor_id uuid, autor_nome text, autor_avatar text, autor_conta text,
               criado_em timestamptz, ultima_atividade timestamptz, respostas integer,
               curtidas integer, eu_curti boolean, visualizacoes integer,
               ultima_resposta_trecho text, ultima_resposta_autor text, ultima_resposta_em timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.titulo, t.autor_id, pr.full_name, pr.avatar_url, public.conta_efetiva(t.autor_id),
         t.criado_em, t.ultima_atividade,
         (SELECT count(*)::int FROM public.forum_respostas r WHERE r.topico_id = t.id),
         (SELECT count(*)::int FROM public.forum_curtidas c WHERE c.topico_id = t.id),
         EXISTS (SELECT 1 FROM public.forum_curtidas c WHERE c.topico_id = t.id AND c.user_id = auth.uid()),
         t.visualizacoes,
         ur.trecho, ur.autor, ur.criado_em
    FROM public.forum_topicos t
    LEFT JOIN public.profiles pr ON pr.id = t.autor_id
    LEFT JOIN LATERAL (
      SELECT left(regexp_replace(btrim(r.corpo), '\s+', ' ', 'g'), 120) AS trecho, rp.full_name AS autor, r.criado_em
        FROM public.forum_respostas r
        LEFT JOIN public.profiles rp ON rp.id = r.autor_id
       WHERE r.topico_id = t.id
       ORDER BY r.criado_em DESC
       LIMIT 1
    ) ur ON true
   WHERE t.sala_id = p_sala AND auth.uid() IS NOT NULL
   ORDER BY t.ultima_atividade DESC;
$$;

REVOKE ALL ON FUNCTION public.forum_salas_resumo(), public.forum_topicos_da_sala(bigint) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.forum_salas_resumo(), public.forum_topicos_da_sala(bigint) TO authenticated;

COMMIT;
