-- O CATÁLOGO DO MUNDO EDITÁVEL: ENTIDADES E GRUPOS (15/11/2026)
-- Usuário: "Eu quero editar as informações da ambientação, como grupos,
-- entidades, assim como edito de reinos e cidades." Escolhas dele: só o
-- admin edita, numa versão só para todas as mesas; o calendário segue os
-- feriados editados.
--
-- O BANCO É A ÚNICA FONTE (mesmo dia): "O texto original não precisa ser
-- guardado [...] Usamos o PDF apenas como pontapé inicial. E iremos subir mais
-- coisas da ambientação." O texto que estava em 01-core subiu para cá por
-- scripts/mundo/subir-catalogo.mjs (28 entidades, 6 grupos) e saiu do código.
--
--   dados — a entidade ou o grupo inteiro, no formato da ficha
--
-- Lê quem está logado (Mestre e Jogador veem a mesma Ambientação); grava só o
-- admin (eh_admin()). Idempotente.

CREATE TABLE IF NOT EXISTS public.catalogo_mundo (
  tipo       text NOT NULL CHECK (tipo IN ('entidade', 'grupo')),
  slug       text NOT NULL CHECK (slug ~ '^[a-z0-9_-]+$'),
  dados      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid DEFAULT auth.uid(),
  PRIMARY KEY (tipo, slug)
);
ALTER TABLE public.catalogo_mundo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalogo_mundo_select ON public.catalogo_mundo;
CREATE POLICY catalogo_mundo_select ON public.catalogo_mundo
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS catalogo_mundo_insert_admin ON public.catalogo_mundo;
CREATE POLICY catalogo_mundo_insert_admin ON public.catalogo_mundo
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.eh_admin()));

DROP POLICY IF EXISTS catalogo_mundo_update_admin ON public.catalogo_mundo;
CREATE POLICY catalogo_mundo_update_admin ON public.catalogo_mundo
  FOR UPDATE TO authenticated USING ((SELECT public.eh_admin())) WITH CHECK ((SELECT public.eh_admin()));

DROP POLICY IF EXISTS catalogo_mundo_delete_admin ON public.catalogo_mundo;
CREATE POLICY catalogo_mundo_delete_admin ON public.catalogo_mundo
  FOR DELETE TO authenticated USING ((SELECT public.eh_admin()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalogo_mundo TO authenticated;

-- Conferência
SELECT c.relname AS tabela, c.relrowsecurity AS rls,
       (SELECT count(*) FROM pg_policies p WHERE p.tablename = 'catalogo_mundo') AS policies
FROM pg_class c WHERE c.oid = 'public.catalogo_mundo'::regclass;

-- O slug aceita também "_" (o slugDeNome do editor de catálogo usa sublinhado).
ALTER TABLE public.catalogo_mundo DROP CONSTRAINT IF EXISTS catalogo_mundo_slug_check;
ALTER TABLE public.catalogo_mundo ADD CONSTRAINT catalogo_mundo_slug_check CHECK (slug ~ '^[a-z0-9_-]+$');

-- A marca "removido" (esconder uma entrada que vinha do código) perdeu o
-- sentido quando o código deixou de ter o texto.
ALTER TABLE public.catalogo_mundo DROP COLUMN IF EXISTS removido;
