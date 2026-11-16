-- scripts/sql/mapa-do-mundo-2026-11-15.sql
-- ============================================================
-- O MAPA DO MUNDO (15/11/2026)
-- ============================================================
-- Usuário: "Mas porque eu preciso entrar em uma mesa, se o ambientação é
-- global?" As cidades e os locais que o Imperador põe no mapa passam a ser do
-- MUNDO: uma linha só em catalogo_mundo (tipo 'mapa', slug 'mundo'), com
-- `dados.lugares` = [{ id, tipo: 'cidade'|'local', nome, ficha, x, y }].
-- Todos leem; só o Imperador grava (as policies de catalogo_mundo já pedem
-- eh_admin() para escrever). Rotas, caminhos, pontos e onde estão os
-- personagens continuam por mesa, em mapas_mesa.
-- ============================================================

ALTER TABLE public.catalogo_mundo DROP CONSTRAINT IF EXISTS catalogo_mundo_tipo_check;
ALTER TABLE public.catalogo_mundo ADD CONSTRAINT catalogo_mundo_tipo_check
  CHECK (tipo = ANY (ARRAY['entidade'::text, 'grupo'::text, 'mapa'::text]));
