-- scripts/sql/tipos-de-conta-e-forum-2026-11-15.sql
-- ============================================================
-- OS QUATRO TIPOS DE CONTA E O FÓRUM (15/11/2026)
-- ============================================================
-- Pedido do usuário:
--   • Imperador  — a conta do dono; a única que cria e edita dados globais
--                  (isso continua sendo eh_admin(), pelo e-mail — um lugar só).
--   • Plebeu     — gratuita; nunca vira Mestre; 1 personagem (excluiu, pode
--                  criar outro). Todas as contas atuais, menos a do Imperador.
--   • Conselheiro— pagamento vitalício; cria mesas e personagens sem limite;
--                  nunca altera dados globais. Benefícios: depois.
--   • Nobre      — mensal; até 1 história e 4 personagens; nunca altera dados
--                  globais. Sem pagamento no sistema por enquanto: o Imperador
--                  promove à mão e dá uma VALIDADE; vencida, a conta vale
--                  Plebeu (conta_efetiva), sem cron — a regra olha a data.
--   Fórum: salas temáticas (só o Imperador cria/renomeia/fecha). Tópicos e
--   respostas: só quem paga (Conselheiro, Nobre, Imperador); o autor edita e
--   apaga o seu; o Imperador apaga qualquer um. Plebeu só lê e curte.
--
-- O QUE NÃO MUDA
--   eh_admin() continua decidindo os dados globais. O que ele protegia segue
--   protegido; ninguém além do Imperador ganha escrita nova em catálogo.
--
-- REVERTER
--   drop table if exists public.forum_curtidas, public.forum_respostas,
--     public.forum_topicos, public.forum_salas cascade;
--   drop function if exists public.forum_salas_resumo(), public.forum_topicos_da_sala(bigint),
--     public.forum_topico(bigint), public.pode_escrever_forum(), public._forum_toque(),
--     public._forum_editado(), public.admin_definir_conta(uuid, text, timestamptz),
--     public.admin_listar_contas(), public._menestrel_limite_personagens();
--   drop trigger if exists trg_limite_personagens on public.personagens;
--   -- e restaurar mestre_somente_admin pela versão do e-mail (git log).
--   alter table public.profiles drop column tipo_conta, drop column conta_valida_ate;
--   drop function if exists public.conta_efetiva(uuid);
-- ============================================================

BEGIN;

-- ── 1. As colunas ──────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tipo_conta text NOT NULL DEFAULT 'plebeu',
  ADD COLUMN IF NOT EXISTS conta_valida_ate timestamptz;
DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_tipo_conta_valido
    CHECK (tipo_conta IN ('imperador', 'conselheiro', 'nobre', 'plebeu'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. A migração: o Imperador e todo o resto Plebeu ──────────────────────
UPDATE public.profiles p
   SET tipo_conta = CASE WHEN lower(u.email) = 'richardnanet@gmail.com' THEN 'imperador' ELSE 'plebeu' END,
       conta_valida_ate = NULL
  FROM auth.users u
 WHERE u.id = p.id;

-- ── 3. A conta que VALE agora (Nobre vencido vale Plebeu) ─────────────────
-- O Imperador é o e-mail de eh_admin(), qualquer que seja a coluna: a coluna
-- descreve, o e-mail decide (mesma regra de sempre).
CREATE OR REPLACE FUNCTION public.conta_efetiva(p_user uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_user AND lower(u.email) = 'richardnanet@gmail.com') THEN 'imperador'
    WHEN pr.tipo_conta = 'imperador' THEN 'plebeu'   -- só o e-mail é Imperador
    WHEN pr.tipo_conta = 'nobre' AND pr.conta_valida_ate IS NOT NULL AND pr.conta_valida_ate < now() THEN 'plebeu'
    ELSE COALESCE(pr.tipo_conta, 'plebeu')
  END
  FROM (SELECT 1) AS um
  LEFT JOIN public.profiles pr ON pr.id = p_user;
$$;
REVOKE ALL ON FUNCTION public.conta_efetiva(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.conta_efetiva(uuid) TO authenticated;

-- ── 4. As regras de Mestre, de mesa e da própria conta ────────────────────
-- Substitui a versão de 23/10/2026 ("só o administrador é Mestre"). Mesmo
-- gatilho, mesmas tabelas; agora a pergunta é o tipo da conta.
CREATE OR REPLACE FUNCTION public.mestre_somente_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_tipo text;
  v_qtd integer;
BEGIN
  IF tg_table_name = 'profiles' THEN
    -- Tipo e validade da conta: só o Imperador (ou SQL direto, sem usuário).
    IF auth.uid() IS NOT NULL AND NOT public.eh_admin() THEN
      IF tg_op = 'INSERT' THEN
        NEW.tipo_conta := 'plebeu';
        NEW.conta_valida_ate := NULL;
      ELSE
        NEW.tipo_conta := OLD.tipo_conta;
        NEW.conta_valida_ate := OLD.conta_valida_ate;
      END IF;
    END IF;
    -- Plebeu nunca é Mestre (vale também para o Nobre vencido).
    IF NEW.perfil_tipo = 'master' THEN
      IF tg_op = 'INSERT' THEN
        v_tipo := CASE WHEN EXISTS (SELECT 1 FROM auth.users u WHERE u.id = NEW.id AND lower(u.email) = 'richardnanet@gmail.com')
                       THEN 'imperador' ELSE 'plebeu' END;
      ELSE
        v_tipo := CASE
          WHEN EXISTS (SELECT 1 FROM auth.users u WHERE u.id = NEW.id AND lower(u.email) = 'richardnanet@gmail.com') THEN 'imperador'
          WHEN NEW.tipo_conta = 'nobre' AND NEW.conta_valida_ate IS NOT NULL AND NEW.conta_valida_ate < now() THEN 'plebeu'
          WHEN NEW.tipo_conta = 'imperador' THEN 'plebeu'
          ELSE NEW.tipo_conta END;
      END IF;
      IF v_tipo = 'plebeu' THEN
        NEW.perfil_tipo := 'player';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- historias: abrir mesa (ou trocar o dono dela) pede conta de Mestre.
  IF tg_op = 'UPDATE' AND NEW.mestre_id IS NOT DISTINCT FROM OLD.mestre_id THEN
    RETURN NEW;
  END IF;
  v_tipo := public.conta_efetiva(NEW.mestre_id);
  IF v_tipo = 'plebeu' THEN
    RAISE EXCEPTION 'Contas Plebeu não abrem mesas. Para ser Mestre, a conta precisa ser Nobre ou Conselheiro.'
      USING errcode = 'P0001', detail = 'conta_sem_mesa';
  END IF;
  IF v_tipo = 'nobre' THEN
    SELECT count(*) INTO v_qtd FROM public.historias h WHERE h.mestre_id = NEW.mestre_id;
    IF v_qtd >= 1 THEN
      RAISE EXCEPTION 'A conta Nobre permite 1 história. Exclua a atual para abrir outra.'
        USING errcode = 'P0001', detail = 'limite_historias';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS trg_mestre_somente_admin ON public.profiles;
CREATE TRIGGER trg_mestre_somente_admin
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.mestre_somente_admin();
DROP TRIGGER IF EXISTS trg_mestre_somente_admin_hist ON public.historias;
CREATE TRIGGER trg_mestre_somente_admin_hist
  BEFORE INSERT OR UPDATE ON public.historias
  FOR EACH ROW EXECUTE FUNCTION public.mestre_somente_admin();

-- ── 5. Quantos personagens cada conta tem ─────────────────────────────────
-- Plebeu 1 e Nobre 4, contando os que EXISTEM: excluiu, abre a vaga. Quem já
-- passa do limite (uma conta tem 2 hoje) fica com o que tem; só não cria.
CREATE OR REPLACE FUNCTION public._menestrel_limite_personagens()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_tipo text := public.conta_efetiva(NEW.user_id);
  v_limite integer := CASE v_tipo WHEN 'plebeu' THEN 1 WHEN 'nobre' THEN 4 ELSE NULL END;
  v_qtd integer;
BEGIN
  IF v_limite IS NULL THEN RETURN NEW; END IF;
  SELECT count(*) INTO v_qtd FROM public.personagens p WHERE p.user_id = NEW.user_id;
  IF v_qtd >= v_limite THEN
    IF v_tipo = 'plebeu' THEN
      RAISE EXCEPTION 'A conta Plebeu permite 1 personagem. Exclua o atual para criar outro.'
        USING errcode = 'P0001', detail = 'limite_personagens';
    ELSE
      RAISE EXCEPTION 'A conta Nobre permite 4 personagens. Exclua um para criar outro.'
        USING errcode = 'P0001', detail = 'limite_personagens';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;
DROP TRIGGER IF EXISTS trg_limite_personagens ON public.personagens;
CREATE TRIGGER trg_limite_personagens
  BEFORE INSERT ON public.personagens
  FOR EACH ROW EXECUTE FUNCTION public._menestrel_limite_personagens();

-- ── 6. As portas do Imperador ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_listar_contas()
RETURNS TABLE (id uuid, email text, nome text, tipo_conta text, conta_valida_ate timestamptz,
               conta_efetiva text, personagens integer, historias integer, criado_em timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.eh_admin() THEN
    RAISE EXCEPTION 'sem_permissao' USING errcode = '42501';
  END IF;
  RETURN QUERY
    SELECT pr.id, u.email::text, pr.full_name, pr.tipo_conta, pr.conta_valida_ate,
           public.conta_efetiva(pr.id),
           (SELECT count(*)::int FROM public.personagens p WHERE p.user_id = pr.id),
           (SELECT count(*)::int FROM public.historias h WHERE h.mestre_id = pr.id),
           pr.created_at
      FROM public.profiles pr
      JOIN auth.users u ON u.id = pr.id
     ORDER BY lower(coalesce(pr.full_name, u.email));
END
$$;
REVOKE ALL ON FUNCTION public.admin_listar_contas() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_listar_contas() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_definir_conta(p_user_id uuid, p_tipo text, p_valida_ate timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_linhas integer;
BEGIN
  IF NOT public.eh_admin() THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;
  IF p_tipo NOT IN ('conselheiro', 'nobre', 'plebeu') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'tipo_invalido');
  END IF;
  IF p_tipo = 'nobre' AND (p_valida_ate IS NULL OR p_valida_ate <= now()) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'validade_obrigatoria');
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_user_id AND lower(u.email) = 'richardnanet@gmail.com') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'conta_do_imperador');
  END IF;

  UPDATE public.profiles
     SET tipo_conta = p_tipo,
         conta_valida_ate = CASE WHEN p_tipo = 'nobre' THEN p_valida_ate ELSE NULL END,
         -- `plano` é a coluna antiga (free/paid): segue o tipo, para quem a lê.
         plano = CASE WHEN p_tipo = 'plebeu' THEN 'free' ELSE 'paid' END,
         plano_escolhido_em = COALESCE(plano_escolhido_em, now()),
         -- Rebaixado a Plebeu deixa de ser Mestre já.
         perfil_tipo = CASE WHEN p_tipo = 'plebeu' THEN 'player' ELSE perfil_tipo END
   WHERE id = p_user_id;
  GET DIAGNOSTICS v_linhas = ROW_COUNT;
  IF v_linhas = 0 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'usuario_nao_encontrado');
  END IF;
  RETURN jsonb_build_object('ok', true, 'tipo_conta', p_tipo);
END
$$;
REVOKE ALL ON FUNCTION public.admin_definir_conta(uuid, text, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_definir_conta(uuid, text, timestamptz) TO authenticated;

-- ── 7. O fórum ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_salas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome text NOT NULL CHECK (length(btrim(nome)) BETWEEN 1 AND 80),
  descricao text CHECK (descricao IS NULL OR length(descricao) <= 400),
  ordem integer NOT NULL DEFAULT 0,
  fechada boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.forum_topicos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sala_id bigint NOT NULL REFERENCES public.forum_salas (id) ON DELETE CASCADE,
  autor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  titulo text NOT NULL CHECK (length(btrim(titulo)) BETWEEN 1 AND 160),
  corpo text NOT NULL CHECK (length(btrim(corpo)) BETWEEN 1 AND 20000),
  criado_em timestamptz NOT NULL DEFAULT now(),
  editado_em timestamptz,
  ultima_atividade timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.forum_respostas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  topico_id bigint NOT NULL REFERENCES public.forum_topicos (id) ON DELETE CASCADE,
  autor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  corpo text NOT NULL CHECK (length(btrim(corpo)) BETWEEN 1 AND 20000),
  criado_em timestamptz NOT NULL DEFAULT now(),
  editado_em timestamptz
);
CREATE TABLE IF NOT EXISTS public.forum_curtidas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  topico_id bigint REFERENCES public.forum_topicos (id) ON DELETE CASCADE,
  resposta_id bigint REFERENCES public.forum_respostas (id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CHECK ((topico_id IS NULL) <> (resposta_id IS NULL))
);
CREATE INDEX IF NOT EXISTS forum_topicos_sala_idx ON public.forum_topicos (sala_id, ultima_atividade DESC);
CREATE INDEX IF NOT EXISTS forum_topicos_autor_idx ON public.forum_topicos (autor_id);
CREATE INDEX IF NOT EXISTS forum_respostas_topico_idx ON public.forum_respostas (topico_id, criado_em);
CREATE INDEX IF NOT EXISTS forum_respostas_autor_idx ON public.forum_respostas (autor_id);
CREATE UNIQUE INDEX IF NOT EXISTS forum_curtidas_topico_uq ON public.forum_curtidas (user_id, topico_id) WHERE topico_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS forum_curtidas_resposta_uq ON public.forum_curtidas (user_id, resposta_id) WHERE resposta_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS forum_curtidas_topico_idx ON public.forum_curtidas (topico_id);
CREATE INDEX IF NOT EXISTS forum_curtidas_resposta_idx ON public.forum_curtidas (resposta_id);

-- Quem escreve: quem paga (Conselheiro, Nobre em dia, Imperador).
CREATE OR REPLACE FUNCTION public.pode_escrever_forum()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT public.conta_efetiva(auth.uid()) <> 'plebeu' $$;
REVOKE ALL ON FUNCTION public.pode_escrever_forum() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pode_escrever_forum() TO authenticated;

ALTER TABLE public.forum_salas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_topicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_curtidas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forum_salas_ler ON public.forum_salas;
CREATE POLICY forum_salas_ler ON public.forum_salas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS forum_salas_imperador ON public.forum_salas;
CREATE POLICY forum_salas_imperador ON public.forum_salas FOR ALL TO authenticated
  USING ((SELECT public.eh_admin())) WITH CHECK ((SELECT public.eh_admin()));

DROP POLICY IF EXISTS forum_topicos_ler ON public.forum_topicos;
CREATE POLICY forum_topicos_ler ON public.forum_topicos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS forum_topicos_criar ON public.forum_topicos;
CREATE POLICY forum_topicos_criar ON public.forum_topicos FOR INSERT TO authenticated
  WITH CHECK (autor_id = (SELECT auth.uid()) AND (SELECT public.pode_escrever_forum())
    AND EXISTS (SELECT 1 FROM public.forum_salas s WHERE s.id = sala_id AND NOT s.fechada));
DROP POLICY IF EXISTS forum_topicos_editar ON public.forum_topicos;
CREATE POLICY forum_topicos_editar ON public.forum_topicos FOR UPDATE TO authenticated
  USING (autor_id = (SELECT auth.uid()) AND (SELECT public.pode_escrever_forum()))
  WITH CHECK (autor_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS forum_topicos_apagar ON public.forum_topicos;
CREATE POLICY forum_topicos_apagar ON public.forum_topicos FOR DELETE TO authenticated
  USING (autor_id = (SELECT auth.uid()) OR (SELECT public.eh_admin()));

DROP POLICY IF EXISTS forum_respostas_ler ON public.forum_respostas;
CREATE POLICY forum_respostas_ler ON public.forum_respostas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS forum_respostas_criar ON public.forum_respostas;
CREATE POLICY forum_respostas_criar ON public.forum_respostas FOR INSERT TO authenticated
  WITH CHECK (autor_id = (SELECT auth.uid()) AND (SELECT public.pode_escrever_forum())
    AND EXISTS (SELECT 1 FROM public.forum_topicos t JOIN public.forum_salas s ON s.id = t.sala_id
                 WHERE t.id = topico_id AND NOT s.fechada));
DROP POLICY IF EXISTS forum_respostas_editar ON public.forum_respostas;
CREATE POLICY forum_respostas_editar ON public.forum_respostas FOR UPDATE TO authenticated
  USING (autor_id = (SELECT auth.uid()) AND (SELECT public.pode_escrever_forum()))
  WITH CHECK (autor_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS forum_respostas_apagar ON public.forum_respostas;
CREATE POLICY forum_respostas_apagar ON public.forum_respostas FOR DELETE TO authenticated
  USING (autor_id = (SELECT auth.uid()) OR (SELECT public.eh_admin()));

-- Curtir é de todo mundo logado, Plebeu incluído; cada um mexe só na sua.
DROP POLICY IF EXISTS forum_curtidas_ler ON public.forum_curtidas;
CREATE POLICY forum_curtidas_ler ON public.forum_curtidas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS forum_curtidas_curtir ON public.forum_curtidas;
CREATE POLICY forum_curtidas_curtir ON public.forum_curtidas FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS forum_curtidas_descurtir ON public.forum_curtidas;
CREATE POLICY forum_curtidas_descurtir ON public.forum_curtidas FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON public.forum_salas, public.forum_topicos, public.forum_respostas, public.forum_curtidas FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_salas, public.forum_topicos, public.forum_respostas, public.forum_curtidas TO authenticated;

-- Editar marca a hora e não move o texto de sala/tópico nem troca o autor.
CREATE OR REPLACE FUNCTION public._forum_editado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.autor_id := OLD.autor_id;
  NEW.criado_em := OLD.criado_em;
  IF tg_table_name = 'forum_topicos' THEN
    NEW.sala_id := OLD.sala_id;
    NEW.ultima_atividade := GREATEST(OLD.ultima_atividade, NEW.ultima_atividade);
    IF NEW.titulo IS DISTINCT FROM OLD.titulo OR NEW.corpo IS DISTINCT FROM OLD.corpo THEN
      NEW.editado_em := now();
    END IF;
  ELSE
    NEW.topico_id := OLD.topico_id;
    IF NEW.corpo IS DISTINCT FROM OLD.corpo THEN NEW.editado_em := now(); END IF;
  END IF;
  RETURN NEW;
END
$$;
DROP TRIGGER IF EXISTS trg_forum_topico_editado ON public.forum_topicos;
CREATE TRIGGER trg_forum_topico_editado BEFORE UPDATE ON public.forum_topicos
  FOR EACH ROW EXECUTE FUNCTION public._forum_editado();
DROP TRIGGER IF EXISTS trg_forum_resposta_editada ON public.forum_respostas;
CREATE TRIGGER trg_forum_resposta_editada BEFORE UPDATE ON public.forum_respostas
  FOR EACH ROW EXECUTE FUNCTION public._forum_editado();

-- Resposta nova sobe o tópico na sala.
CREATE OR REPLACE FUNCTION public._forum_toque()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.forum_topicos SET ultima_atividade = now() WHERE id = NEW.topico_id;
  RETURN NEW;
END
$$;
DROP TRIGGER IF EXISTS trg_forum_resposta_toque ON public.forum_respostas;
CREATE TRIGGER trg_forum_resposta_toque AFTER INSERT ON public.forum_respostas
  FOR EACH ROW EXECUTE FUNCTION public._forum_toque();

-- ── 8. A leitura do fórum, com o nome de quem escreveu ────────────────────
-- profiles só se lê a própria linha; o nome do autor vem por aqui (nome e
-- retrato, nada além).
CREATE OR REPLACE FUNCTION public.forum_salas_resumo()
RETURNS TABLE (id bigint, nome text, descricao text, ordem integer, fechada boolean,
               topicos integer, ultima_atividade timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.nome, s.descricao, s.ordem, s.fechada,
         (SELECT count(*)::int FROM public.forum_topicos t WHERE t.sala_id = s.id),
         (SELECT max(t.ultima_atividade) FROM public.forum_topicos t WHERE t.sala_id = s.id)
    FROM public.forum_salas s
   WHERE auth.uid() IS NOT NULL
   ORDER BY s.ordem, s.nome;
$$;

CREATE OR REPLACE FUNCTION public.forum_topicos_da_sala(p_sala bigint)
RETURNS TABLE (id bigint, titulo text, autor_id uuid, autor_nome text, autor_avatar text, autor_conta text,
               criado_em timestamptz, ultima_atividade timestamptz, respostas integer,
               curtidas integer, eu_curti boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.titulo, t.autor_id, pr.full_name, pr.avatar_url, public.conta_efetiva(t.autor_id),
         t.criado_em, t.ultima_atividade,
         (SELECT count(*)::int FROM public.forum_respostas r WHERE r.topico_id = t.id),
         (SELECT count(*)::int FROM public.forum_curtidas c WHERE c.topico_id = t.id),
         EXISTS (SELECT 1 FROM public.forum_curtidas c WHERE c.topico_id = t.id AND c.user_id = auth.uid())
    FROM public.forum_topicos t
    LEFT JOIN public.profiles pr ON pr.id = t.autor_id
   WHERE t.sala_id = p_sala AND auth.uid() IS NOT NULL
   ORDER BY t.ultima_atividade DESC;
$$;

CREATE OR REPLACE FUNCTION public.forum_topico(p_id bigint)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN NULL ELSE (
    SELECT jsonb_build_object(
      'id', t.id, 'sala_id', t.sala_id, 'titulo', t.titulo, 'corpo', t.corpo,
      'autor_id', t.autor_id, 'autor_nome', pr.full_name, 'autor_avatar', pr.avatar_url,
      'autor_conta', public.conta_efetiva(t.autor_id),
      'criado_em', t.criado_em, 'editado_em', t.editado_em,
      'curtidas', (SELECT count(*) FROM public.forum_curtidas c WHERE c.topico_id = t.id),
      'eu_curti', EXISTS (SELECT 1 FROM public.forum_curtidas c WHERE c.topico_id = t.id AND c.user_id = auth.uid()),
      'respostas', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
                 'id', r.id, 'corpo', r.corpo, 'autor_id', r.autor_id,
                 'autor_nome', rp.full_name, 'autor_avatar', rp.avatar_url,
                 'autor_conta', public.conta_efetiva(r.autor_id),
                 'criado_em', r.criado_em, 'editado_em', r.editado_em,
                 'curtidas', (SELECT count(*) FROM public.forum_curtidas c WHERE c.resposta_id = r.id),
                 'eu_curti', EXISTS (SELECT 1 FROM public.forum_curtidas c WHERE c.resposta_id = r.id AND c.user_id = auth.uid()))
               ORDER BY r.criado_em)
          FROM public.forum_respostas r
          LEFT JOIN public.profiles rp ON rp.id = r.autor_id
         WHERE r.topico_id = t.id), '[]'::jsonb))
      FROM public.forum_topicos t
      LEFT JOIN public.profiles pr ON pr.id = t.autor_id
     WHERE t.id = p_id)
  END;
$$;
REVOKE ALL ON FUNCTION public.forum_salas_resumo(), public.forum_topicos_da_sala(bigint), public.forum_topico(bigint) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.forum_salas_resumo(), public.forum_topicos_da_sala(bigint), public.forum_topico(bigint) TO authenticated;

COMMIT;

-- ── CONFERÊNCIA ─────────────────────────────────────────────
SELECT tipo_conta, perfil_tipo, count(*) FROM public.profiles GROUP BY 1, 2 ORDER BY 1, 2;
