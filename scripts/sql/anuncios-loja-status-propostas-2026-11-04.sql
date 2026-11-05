-- ============================================================
-- anuncios-loja-status-propostas-2026-11-04.sql
-- ============================================================
-- Sintoma (usuário, 04/11/2026): "Ao tentar vender o item está aparecendo a
-- mensagem 'Não foi possível pôr o item à venda.'"
--
-- Causa, lida nos logs do Postgres (05/11/2026 02:18 UTC, duas tentativas):
--   new row for relation "anuncios_loja" violates check constraint
--   "anuncios_loja_status_check"
--   context: propor_venda_loja, line 7 —
--   update public.anuncios_loja set status = 'proposta' ...
--
-- A regra da tabela nasceu em anuncios-loja-2026-09-27.sql com três estados
-- ('aberto', 'vendido', 'retirado'). A venda ao MESTRE (propostas, com
-- contraproposta e recusa) foi criada depois direto no banco e grava outros
-- três — 'proposta' (propor_venda_loja), 'contraproposta' e 'recusado'
-- (responder_proposta_venda) — que a regra recusava. A transação inteira
-- voltava atrás, e a tela caía na mensagem genérica.
--
-- Os seis valores abaixo são TODOS os que as funções do banco gravam em
-- anuncios_loja.status (varridos em pg_proc em 04/11/2026). Só alarga a
-- regra: nenhuma linha existente deixa de valer.
--
-- APLICADO EM PRODUÇÃO em 04/11/2026 (migração anuncios_loja_status_propostas,
-- com o aval do usuário), e conferido em pg_constraint logo depois.
-- ============================================================

alter table public.anuncios_loja drop constraint if exists anuncios_loja_status_check;
alter table public.anuncios_loja add constraint anuncios_loja_status_check
  check (status in ('aberto', 'vendido', 'retirado', 'proposta', 'contraproposta', 'recusado'));
