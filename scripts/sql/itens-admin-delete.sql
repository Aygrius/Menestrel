-- itens-admin-delete.sql — 26/09/2026
--
-- "Adicione um botão de excluir itens, igual em criaturas." (usuário)
--
-- Mesmo caso de criaturas-admin-delete.sql: admin-catalogo-rls.sql deixou os
-- catálogos SEM política de DELETE, e com RLS ligada o DELETE volta com zero
-- linhas e sem erro — o botão responderia "Nada foi excluído (sem
-- permissão?)".
--
-- O risco que motivou aquela recusa existe aqui: o item é referenciado pelo
-- slug dentro de personagens.inventario (JSON), historias.estoque_loja e
-- criaturas.equipamento. Nenhuma dessas referências é FK (conferido em
-- pg_constraint: nada aponta para itens), e as telas pulam slug sem catálogo
-- em vez de quebrar — o item SOME de quem o tinha. Por isso o editor conta,
-- no primeiro clique, quantos personagens carregam o item e diz isso antes
-- do segundo. A política vale SÓ para o admin (eh_admin), igual ao
-- insert/update.
--
-- DUAS PEÇAS, não uma (conferido em 26/09/2026): além da política, o papel
-- `authenticated` não tinha nem o PRIVILÉGIO de DELETE em itens (em criaturas
-- tem). Sem o GRANT o banco recusa com "permission denied" antes de olhar a
-- política; sem a política, o DELETE volta com zero linhas. O GRANT abre a
-- porta para todo usuário logado; é a política (eh_admin) que decide quem passa.
--
-- REVERTER:
--   drop policy itens_admin_delete on public.itens;
--   revoke delete on public.itens from authenticated;

grant delete on public.itens to authenticated;

create policy itens_admin_delete on public.itens
  for delete to authenticated using (public.eh_admin());
