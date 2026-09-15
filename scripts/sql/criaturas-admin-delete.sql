-- criaturas-admin-delete.sql — 14/09/2026
--
-- O botão Excluir do editor de criaturas (pedido do usuário) respondia
-- "Nada foi excluído (sem permissão?)": admin-catalogo-rls.sql deixou as
-- tabelas de catálogo SEM política de DELETE de propósito, e RLS ligada sem
-- política nega o comando — o DELETE voltava com zero linhas e sem erro.
--
-- A razão daquela recusa era magias e técnicas, referenciadas por `key`
-- dentro do JSON das fichas. Criatura não tem esse risco no mesmo grau: as
-- referências são historias.criatura_ids (array) e o snapshot das batalhas,
-- e as duas já toleram id que não existe mais (a lista filtra; a batalha
-- marca o participante como ausente). Por isso a política vale SÓ para
-- criaturas, e SÓ para o admin (eh_admin), igual ao insert/update.
--
-- REVERTER:
--   drop policy criaturas_admin_delete on public.criaturas;

create policy criaturas_admin_delete on public.criaturas
  for delete to authenticated using (public.eh_admin());
