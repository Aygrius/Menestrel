-- ============================================================
-- anon-sem-rpc-e-policies-initplan-2026-11-14.sql — auditoria 13/11/2026, item 47
-- ============================================================
-- Duas limpezas de segurança e desempenho, autorizadas pelo usuário em 14/11:
--
-- 1. As funções SECURITY DEFINER do schema public eram executáveis por `anon`
--    (quem não fez login): 48 em 14/11. Nenhuma tela antes do login chama RPC
--    (conferido: 04-auth não chama nenhuma; aceitar convite exige um PJ), e os
--    ajudantes de policy (_participa_historia, eh_admin, mestre_somente_admin,
--    pode_editar_aventura) só entram em policies de escrita, que o visitante
--    não usa. Tira o EXECUTE de PUBLIC e de anon e devolve a authenticated e
--    a service_role. Mesmo padrão dos scripts dos itens 1–4.
--
-- 2. 25 policies chamavam auth.uid() cru — o Postgres o reavalia LINHA A LINHA
--    (aviso auth_rls_initplan do Supabase). Embrulhado em (select auth.uid()),
--    vira InitPlan: uma vez por consulta. A expressão não muda de sentido.
--
-- Idempotente: as duas partes agem só sobre o que ainda está como antes.
--
-- Como estavam as 25 policies (para voltar atrás, se preciso):
-- profiles / Usuários podem ver o próprio perfil (SELECT)            USING (auth.uid() = id)
-- profiles / Usuários podem atualizar o próprio perfil (UPDATE)      USING (auth.uid() = id)
-- profiles / Usuários podem inserir o próprio perfil (INSERT)        CHECK (auth.uid() = id)
-- profiles / profiles_select_own (SELECT)                            USING (auth.uid() = id)
-- profiles / profiles_insert_own (INSERT)                            CHECK (auth.uid() = id)
-- profiles / profiles_update_own (UPDATE)                            USING/CHECK (auth.uid() = id)
-- personagens / personagens_own_insert (INSERT)                      CHECK (auth.uid() = user_id)
-- personagens / personagens_own_delete (DELETE)                      USING (auth.uid() = user_id)
-- personagens / personagens_select_own_or_vinculado (SELECT)         USING ((auth.uid() = user_id) OR EXISTS (… h.mestre_id = auth.uid() …))
-- personagens / personagens_update_own_or_vinculado (UPDATE)         USING/CHECK iguais ao select
-- historias / historias_insert_own (INSERT)                          CHECK (auth.uid() = mestre_id)
-- historias / historias_update_own (UPDATE)                          USING (auth.uid() = mestre_id)
-- historias / historias_delete_own (DELETE)                          USING (auth.uid() = mestre_id)
-- convites_historia / convites_select_mestre (SELECT)                USING (auth.uid() = mestre_id)
-- batalhas / batalhas_mestre_all (ALL)                               USING/CHECK (mestre_id = auth.uid())
-- batalhas / jogador_le_batalha_do_seu_pj (SELECT)                   … JOIN personagens pc ON (pc.user_id = auth.uid()) …
-- lore_entradas / lore_entradas_select_mestre (SELECT)               EXISTS (… h.mestre_id = auth.uid())
-- diario_entradas / diario_entradas_select_dono (SELECT)             EXISTS (… p.user_id = auth.uid())
-- mesa_log / mesa_log_select (SELECT)                                EXISTS (… h.mestre_id = auth.uid() OR … p.user_id = auth.uid() …)
-- itens_historia / itens_historia_select_dono (SELECT)               historia_id IN (… h.mestre_id = auth.uid())
-- vendas_item / vendas_item_select (SELECT)                          EXISTS (… p.user_id = auth.uid()) OR EXISTS (… h.mestre_id = auth.uid())
-- anuncios_loja / anuncios_loja_ler (SELECT)                         EXISTS (… h.mestre_id = auth.uid() OR … p.user_id = auth.uid())
-- anotacoes_capitulo / cada um escreve a sua (INSERT)                CHECK (user_id = auth.uid() AND _participa_historia(…) AND …)
-- anotacoes_capitulo / cada um edita a sua (UPDATE)                  USING (user_id = auth.uid()) CHECK (…)
-- anotacoes_capitulo / cada um apaga a sua (DELETE)                  USING (user_id = auth.uid())
-- ============================================================

-- 1) anon não executa SECURITY DEFINER
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS assinatura
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prosecdef AND p.prokind = 'f'
       AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f.assinatura);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.assinatura);
  END LOOP;
END $$;

-- 2) auth.uid()/auth.role()/auth.jwt() cru → (select …) nas policies
DO $$
DECLARE
  pol record;
  novo_qual text;
  novo_check text;
  sql text;
  re constant text := '(?<!SELECT )auth\.(uid|role|jwt)\(\)';
BEGIN
  FOR pol IN
    SELECT tablename, policyname, cmd, qual, with_check
      FROM pg_policies
     WHERE schemaname = 'public'
       AND (coalesce(qual, '') ~ re OR coalesce(with_check, '') ~ re)
  LOOP
    novo_qual  := CASE WHEN pol.qual IS NULL THEN NULL
                       ELSE regexp_replace(pol.qual, re, '(select auth.\1())', 'g') END;
    novo_check := CASE WHEN pol.with_check IS NULL THEN NULL
                       ELSE regexp_replace(pol.with_check, re, '(select auth.\1())', 'g') END;
    sql := format('ALTER POLICY %I ON public.%I', pol.policyname, pol.tablename);
    IF novo_qual IS NOT NULL THEN sql := sql || format(' USING (%s)', novo_qual); END IF;
    IF novo_check IS NOT NULL THEN sql := sql || format(' WITH CHECK (%s)', novo_check); END IF;
    EXECUTE sql;
  END LOOP;
END $$;
