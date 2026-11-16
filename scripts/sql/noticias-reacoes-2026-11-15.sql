-- scripts/sql/noticias-reacoes-2026-11-15.sql
-- ============================================================
-- GOSTEI / NÃO GOSTEI NAS NOVIDADES (15/11/2026)
-- ============================================================
-- Usuário: "Adicione um coração de ícone para o usuário do sistema clicar,
-- para dizer se gostou da novidade ou um dedo para baixo, para dizer que não
-- gostou."
--
-- Uma reação por pessoa por notícia. A notícia mora no código
-- (06-historias/inicio.jsx, NOTICIAS_DO_SISTEMA); a chave é o `id` dela.
-- Cada um lê e mexe só na sua; o Imperador vê o total por
-- noticias_reacoes_resumo().
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.noticias_reacoes (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  noticia text NOT NULL CHECK (length(noticia) BETWEEN 1 AND 80),
  reacao text NOT NULL CHECK (reacao IN ('gostei', 'nao_gostei')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, noticia)
);
ALTER TABLE public.noticias_reacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS noticias_reacoes_minhas ON public.noticias_reacoes;
CREATE POLICY noticias_reacoes_minhas ON public.noticias_reacoes FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
REVOKE ALL ON public.noticias_reacoes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.noticias_reacoes TO authenticated;

CREATE OR REPLACE FUNCTION public.noticias_reacoes_resumo()
RETURNS TABLE (noticia text, gostei integer, nao_gostei integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.noticia,
         count(*) FILTER (WHERE r.reacao = 'gostei')::int,
         count(*) FILTER (WHERE r.reacao = 'nao_gostei')::int
    FROM public.noticias_reacoes r
   WHERE public.eh_admin()
   GROUP BY r.noticia;
$$;
REVOKE ALL ON FUNCTION public.noticias_reacoes_resumo() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.noticias_reacoes_resumo() TO authenticated;

COMMIT;
