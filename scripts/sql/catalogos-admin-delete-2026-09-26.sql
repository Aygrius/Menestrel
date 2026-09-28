-- catalogos-admin-delete-2026-09-26.sql
--
-- "No modal de editar itens, magias, etc, o botão de excluir é um ícone ao
-- lado do botão de x do modal." (usuário) — e, perguntado, "liberar as três":
-- magias, técnicas e habilidades passam a ser excluíveis pelo ADMIN, igual a
-- criaturas e itens (criaturas-admin-delete.sql, itens-admin-delete.sql).
--
-- Conferido antes (26/09/2026):
--   • nenhuma FK aponta para magias, tecnicas ou habilidades (pg_constraint);
--   • o papel `authenticated` JÁ tem o privilégio DELETE nas três — falta só
--     a política; sem ela o DELETE volta com zero linhas, sem erro.
--
-- O que some com a exclusão: as referências por chave dentro de
-- personagens.magias/tecnicas/habilidades (JSON) e por nome em
-- criaturas.magia/tecnica/habilidade. Não são FK; as telas pulam chave sem
-- catálogo em vez de quebrar — a entrada SOME da ficha de quem a tinha.
--
-- REVERTER:
--   drop policy magias_admin_delete on public.magias;
--   drop policy tecnicas_admin_delete on public.tecnicas;
--   drop policy habilidades_admin_delete on public.habilidades;

create policy magias_admin_delete on public.magias
  for delete to authenticated using (public.eh_admin());

create policy tecnicas_admin_delete on public.tecnicas
  for delete to authenticated using (public.eh_admin());

create policy habilidades_admin_delete on public.habilidades
  for delete to authenticated using (public.eh_admin());
