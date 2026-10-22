-- scripts/sql/magias-remove-permissao-2026-10-22.sql
-- ============================================================
-- Pergunta do usuário (22/10/2026): "Porque as magias ainda tem o campo de
-- 'permissão' sendo que não usamos isso mais?" — e "Pode fazer assim".
--
-- Desde a reforma de 22/10/2026 qualquer profissão aprende qualquer magia
-- pelo item (livro ou pergaminho). A permissão serviu de fonte para os
-- vínculos livro→pergaminho e para as classes, e o front deixou de lê-la
-- (ficha da magia mostra os livros; menu e estatística por classe; ficha do
-- personagem por tipo). Conferido antes: nenhuma função, view ou consulta
-- explícita do app usa a coluna.
--
-- As TÉCNICAS continuam com a permissão delas (tecnicas.permissao).
-- REVERTER: ALTER TABLE magias ADD COLUMN permissao text; e restaurar de
-- backup_magias_permissao_2026_10_22.
-- ============================================================
BEGIN;
CREATE TABLE IF NOT EXISTS public.backup_magias_permissao_2026_10_22 AS
  SELECT key, nome, permissao FROM public.magias;
ALTER TABLE public.backup_magias_permissao_2026_10_22 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magias DROP COLUMN IF EXISTS permissao;
COMMIT;
