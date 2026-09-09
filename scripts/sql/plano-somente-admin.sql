-- scripts/sql/plano-somente-admin.sql
-- ============================================================
-- Só o administrador muda o PLANO de um usuário. Toda conta nova nasce free.
--
-- O BURACO QUE ISTO FECHA
-- ============================================================
-- A policy `profiles_update_own` libera UPDATE na própria linha sem restringir
-- COLUNA. RLS no Postgres é por linha, não por campo — então qualquer usuário
-- logado podia se promover sozinho com um PATCH direto no PostgREST:
--
--   PATCH /rest/v1/profiles?id=eq.<o próprio id>   { "plano": "paid" }
--
-- Nenhuma tela oferece isso (o botão Premium do onboarding está desabilitado),
-- mas a API está aberta a quem tiver a anon key — que é pública por natureza.
-- Gate de UI não protege coluna; quem protege é o banco.
--
-- COMO FICA
-- ============================================================
--   • `plano` e `plano_escolhido_em` passam a ser IMUTÁVEIS pelo próprio dono;
--   • só `admin_definir_plano` (SECURITY DEFINER, checa o e-mail do chamador)
--     consegue mudá-los;
--   • conta nova continua nascendo 'free' — já é o DEFAULT NOT NULL da coluna.
--
-- POR QUE PRESERVAR EM SILÊNCIO, E NÃO DAR ERRO
-- ============================================================
-- O app faz upsert em `profiles` no login (carregarProfile, shell.jsx) com
-- `plano: 'free'` e `onConflict: 'id'`. Numa corrida em que a linha JÁ existe
-- e é 'paid', esse upsert vira UPDATE tentando escrever 'free'. Se o gatilho
-- levantasse exceção ali, o login do usuário PAGO quebraria. Preservando o
-- valor antigo, o login segue e a escalada continua impossível — que é o
-- objetivo. Quem tem direito de mudar usa a RPC, que dá erro claro.
--
-- TROCAR O ADMIN
-- ============================================================
-- Um lugar só: o e-mail dentro de public.eh_admin().
--
-- REVERTER
-- ============================================================
--   drop trigger if exists trg_plano_somente_admin on public.profiles;
--   drop function if exists public.plano_somente_admin();
--   drop function if exists public.admin_definir_plano(uuid, text);
--   drop function if exists public.eh_admin();
-- ============================================================

BEGIN;

-- Quem é o administrador. auth.users é a fonte (o e-mail do JWT pode estar
-- velho se a conta trocar de endereço).
CREATE OR REPLACE FUNCTION public.eh_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND lower(u.email) = 'richardnanet@gmail.com'
  );
$$;

-- Gatilho: o dono não altera o próprio plano.
CREATE OR REPLACE FUNCTION public.plano_somente_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Nada mudou nas colunas de plano: caminho normal do app (perfil_tipo,
  -- pj_ativo_id, avatar…), sai sem custo.
  IF NEW.plano IS NOT DISTINCT FROM OLD.plano
     AND NEW.plano_escolhido_em IS NOT DISTINCT FROM OLD.plano_escolhido_em THEN
    RETURN NEW;
  END IF;

  -- Sem usuário no contexto = service_role / SQL direto (MCP, painel, este
  -- próprio script). Já passou por fora da RLS; não é o caso que se protege.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.eh_admin() THEN
    RETURN NEW;
  END IF;

  -- Não é admin. O PLANO nunca muda por aqui.
  NEW.plano := OLD.plano;

  -- Já `plano_escolhido_em` pode ser preenchido UMA vez: é o que o
  -- PlanoEscolhaModal grava quando a conta nova aceita o plano gratuito
  -- (confirmarFree, 04-auth/auth.jsx). Travar isso junto com o plano deixaria
  -- o modal de onboarding SEM SAÍDA — ele só some quando este campo existe,
  -- e todo cadastro novo ficaria preso nele. Uma vez preenchido, vira
  -- imutável pro dono.
  IF OLD.plano_escolhido_em IS NOT NULL THEN
    NEW.plano_escolhido_em := OLD.plano_escolhido_em;
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_plano_somente_admin ON public.profiles;
CREATE TRIGGER trg_plano_somente_admin
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.plano_somente_admin();

-- A porta legítima: só o admin atravessa.
CREATE OR REPLACE FUNCTION public.admin_definir_plano(p_user_id uuid, p_plano text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linhas integer;
BEGIN
  IF NOT public.eh_admin() THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;

  IF p_plano NOT IN ('free', 'paid') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'plano_invalido');
  END IF;

  UPDATE public.profiles
     SET plano = p_plano,
         -- Marca a escolha ao virar pago; ao voltar pra free, preserva o que
         -- havia (o onboarding usa este campo pra saber se já foi escolhido,
         -- e zerá-lo faria o modal de plano reaparecer pro usuário).
         plano_escolhido_em = COALESCE(plano_escolhido_em, now())
   WHERE id = p_user_id;

  GET DIAGNOSTICS v_linhas = ROW_COUNT;
  IF v_linhas = 0 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'usuario_nao_encontrado');
  END IF;

  RETURN jsonb_build_object('ok', true, 'plano', p_plano);
END
$$;

REVOKE ALL ON FUNCTION public.admin_definir_plano(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_definir_plano(uuid, text) TO authenticated;

COMMIT;


-- ── CONFERÊNCIA ─────────────────────────────────────────────
SELECT pr.plano, count(*) AS usuarios
FROM public.profiles pr GROUP BY pr.plano ORDER BY pr.plano;
