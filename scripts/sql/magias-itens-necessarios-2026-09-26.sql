-- magias-itens-necessarios-2026-09-26.sql
--
-- "Os itens necessários para realizar o ritual fica em um input próprio, com
--  dropdown para selecionar quais itens do catálogo." (usuário, 26/09/2026)
-- Decidido no mesmo dia: a frase sai da descrição.
--
-- Até aqui a lista era a ÚLTIMA frase da descrição de 42 magias ("Itens
-- necessários: Vela (7), Hidromel (1).", às vezes "… para:" / "… para o
-- ritual:"). Ela vira a coluna itens_necessarios, no mesmo formato
-- ("Vela (7), Hidromel (1)", sem o ponto), e sai da descrição.
--
-- Conferido antes de aplicar (SELECT de prévia): 42 extrações não vazias,
-- nenhuma descrição ficou com a frase, nenhuma ficou vazia.
--
-- BACKUP: as 42 descrições originais ficam em
-- magias_descricao_bkp_20260926 (RLS ligada, sem política — invisível pela API).
-- REVERTER:
--   update public.magias m set descricao = b.descricao
--     from public.magias_descricao_bkp_20260926 b where b.key = m.key;
--   alter table public.magias drop column itens_necessarios;

create table if not exists public.magias_descricao_bkp_20260926 as
  select key, descricao from public.magias where descricao ~* 'itens necess';
alter table public.magias_descricao_bkp_20260926 enable row level security;

alter table public.magias add column if not exists itens_necessarios text;

update public.magias set
  itens_necessarios = regexp_replace(
    substring(descricao from '(?i)itens necess[áa]rios[^:]*:\s*(.*\S)\s*$'), '\.$', ''),
  descricao = regexp_replace(descricao, '(?i)\s*itens necess[áa]rios[^:]*:.*$', '')
where descricao ~* 'itens necess';
