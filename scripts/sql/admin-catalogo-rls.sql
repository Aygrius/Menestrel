-- ============================================================
-- Editor de catálogo do admin — permissão de escrita
-- ============================================================
-- As 5 tabelas de catálogo global tinham RLS LIGADA e SÓ política de
-- SELECT. RLS ligada sem política para um comando NEGA o comando — então
-- nenhum usuário da aplicação escrevia nelas, nem o administrador.
--
-- Efeito colateral que isso explica: o "Nova Criatura" do Diário
-- (13-diario/diario.jsx) faz .from('criaturas').insert() direto e falhava
-- em produção desde sempre. Ele é aposentado na Task 7 deste plano.
--
-- SEM POLÍTICA DE DELETE, de propósito: magias e técnicas são referenciadas
-- por `key` dentro do JSON dos personagens, sem foreign key protegendo.
-- Apagar uma deixa fichas apontando pro vazio. Ausência de política é a
-- forma mais forte de "não" no Postgres.
--
-- REVERTER:
--   drop policy criaturas_admin_insert on public.criaturas;  (e as outras 9)
--   alter table public.criaturas drop column atualizado_em;   (e as outras 4)
-- ============================================================

begin;

-- 1. Coluna de auditoria mínima. Sem histórico de QUEM editou (fora de
--    escopo, ver spec §8), só QUANDO — barato e suficiente pra auditar depois.
alter table public.criaturas    add column if not exists atualizado_em timestamptz;
alter table public.magias       add column if not exists atualizado_em timestamptz;
alter table public.tecnicas     add column if not exists atualizado_em timestamptz;
alter table public.habilidades  add column if not exists atualizado_em timestamptz;
alter table public.itens        add column if not exists atualizado_em timestamptz;

-- 2. Políticas. `using` E `with check` no UPDATE: sem o with_check, o admin
--    poderia mover uma linha pra um estado que ele não teria direito de criar.
--    Aqui as duas expressões são iguais, mas a assimetria é a armadilha
--    clássica de RLS e fica explícita.
create policy criaturas_admin_insert on public.criaturas
  for insert to authenticated with check (public.eh_admin());
create policy criaturas_admin_update on public.criaturas
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());

create policy magias_admin_insert on public.magias
  for insert to authenticated with check (public.eh_admin());
create policy magias_admin_update on public.magias
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());

create policy tecnicas_admin_insert on public.tecnicas
  for insert to authenticated with check (public.eh_admin());
create policy tecnicas_admin_update on public.tecnicas
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());

create policy habilidades_admin_insert on public.habilidades
  for insert to authenticated with check (public.eh_admin());
create policy habilidades_admin_update on public.habilidades
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());

create policy itens_admin_insert on public.itens
  for insert to authenticated with check (public.eh_admin());
create policy itens_admin_update on public.itens
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- 3. Dívida de GRANT. `anon` tinha INSERT/UPDATE/DELETE em 4 das 5. Inofensivo
--    enquanto a RLS nega, mas é a única linha de defesa se alguém desligar RLS
--    numa dessas tabelas um dia. `authenticated` mantém os GRANTs — quem decide
--    é a RLS, e queremos ela como porta única.
revoke insert, update, delete on public.criaturas   from anon;
revoke insert, update, delete on public.magias      from anon;
revoke insert, update, delete on public.tecnicas    from anon;
revoke insert, update, delete on public.habilidades from anon;
revoke insert, update, delete on public.itens       from anon;

-- ── Verificação. Confira as três saídas antes do commit. ──

-- (a) Esperado: 10 linhas, 5 INSERT e 5 UPDATE, todas com eh_admin().
select tablename, policyname, cmd
  from pg_policies
 where schemaname='public'
   and tablename in ('criaturas','magias','tecnicas','habilidades','itens')
   and policyname like '%_admin_%'
 order by tablename, cmd;

-- (b) Esperado: 0 linhas. Nenhuma política de DELETE em nenhuma das 5.
select tablename, policyname
  from pg_policies
 where schemaname='public'
   and tablename in ('criaturas','magias','tecnicas','habilidades','itens')
   and cmd = 'DELETE';

-- (c) Esperado: 5 linhas, todas com os três `false`.
select c.relname,
       has_table_privilege('anon', c.oid, 'INSERT') as anon_insert,
       has_table_privilege('anon', c.oid, 'UPDATE') as anon_update,
       has_table_privilege('anon', c.oid, 'DELETE') as anon_delete
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public'
   and c.relname in ('criaturas','magias','tecnicas','habilidades','itens')
 order by c.relname;

commit;   -- troque por  rollback;  se qualquer verificação não fechar
