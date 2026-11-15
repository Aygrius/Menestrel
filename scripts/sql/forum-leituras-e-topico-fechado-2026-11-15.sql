-- scripts/sql/forum-leituras-e-topico-fechado-2026-11-15.sql
-- ============================================================
-- MENSAGENS NOVAS E TÓPICO FECHADO (15/11/2026)
-- ============================================================
-- Usuário: "Crie um sistema de ícones para (tópicos com novas mensagens,
-- tópicos sem mensagens novas, tópico fechado)."
--
--   • forum_leituras — quando cada pessoa abriu cada tópico pela última vez
--     (forum_ver_topico grava, junto da visualização). "Novas" = há post de
--     OUTRA pessoa depois disso (o que eu mesmo escrevi não é novidade para
--     mim); tópico de outra pessoa que eu nunca abri também é novo.
--   • forum_topicos.fechado — fecha o tópico para respostas. Fecham o autor e
--     o Imperador (a mesma regra do apagar), por forum_fechar_topico. A
--     policy de criar resposta passa a recusar tópico fechado.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.forum_leituras (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  topico_id bigint NOT NULL REFERENCES public.forum_topicos (id) ON DELETE CASCADE,
  lido_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, topico_id)
);
CREATE INDEX IF NOT EXISTS forum_leituras_topico_idx ON public.forum_leituras (topico_id);
ALTER TABLE public.forum_leituras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS forum_leituras_minhas ON public.forum_leituras;
CREATE POLICY forum_leituras_minhas ON public.forum_leituras FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
REVOKE ALL ON public.forum_leituras FROM anon;
GRANT SELECT ON public.forum_leituras TO authenticated;

ALTER TABLE public.forum_topicos ADD COLUMN IF NOT EXISTS fechado boolean NOT NULL DEFAULT false;

-- Abrir o tópico: +1 visualização e "li agora".
CREATE OR REPLACE FUNCTION public.forum_ver_topico(p_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.forum_topicos SET visualizacoes = visualizacoes + 1 WHERE id = p_id;
  INSERT INTO public.forum_leituras (user_id, topico_id, lido_em) VALUES (auth.uid(), p_id, now())
  ON CONFLICT (user_id, topico_id) DO UPDATE SET lido_em = excluded.lido_em;
END
$$;
REVOKE ALL ON FUNCTION public.forum_ver_topico(bigint) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.forum_ver_topico(bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.forum_fechar_topico(p_id bigint, p_fechado boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_autor uuid;
BEGIN
  SELECT autor_id INTO v_autor FROM public.forum_topicos WHERE id = p_id;
  IF v_autor IS NULL THEN RETURN jsonb_build_object('ok', false, 'motivo', 'nao_encontrado'); END IF;
  IF v_autor IS DISTINCT FROM auth.uid() AND NOT public.eh_admin() THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;
  UPDATE public.forum_topicos SET fechado = coalesce(p_fechado, false) WHERE id = p_id;
  RETURN jsonb_build_object('ok', true, 'fechado', coalesce(p_fechado, false));
END
$$;
REVOKE ALL ON FUNCTION public.forum_fechar_topico(bigint, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.forum_fechar_topico(bigint, boolean) TO authenticated;

-- Responder: o tópico aberto, numa sala aberta.
DROP POLICY IF EXISTS forum_respostas_criar ON public.forum_respostas;
CREATE POLICY forum_respostas_criar ON public.forum_respostas FOR INSERT TO authenticated
  WITH CHECK (autor_id = (SELECT auth.uid()) AND (SELECT public.pode_escrever_forum())
    AND EXISTS (SELECT 1 FROM public.forum_topicos t JOIN public.forum_salas s ON s.id = t.sala_id
                 WHERE t.id = topico_id AND NOT t.fechado AND NOT s.fechada));

DROP FUNCTION IF EXISTS public.forum_topicos_da_sala(bigint);
CREATE FUNCTION public.forum_topicos_da_sala(p_sala bigint)
RETURNS TABLE (id bigint, titulo text, autor_id uuid, autor_nome text, autor_avatar text, autor_conta text,
               criado_em timestamptz, ultima_atividade timestamptz, respostas integer,
               curtidas integer, eu_curti boolean, visualizacoes integer,
               ultima_resposta_trecho text, ultima_resposta_autor text, ultima_resposta_em timestamptz,
               fechado boolean, novas boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.titulo, t.autor_id, pr.full_name, pr.avatar_url, public.conta_efetiva(t.autor_id),
         t.criado_em, t.ultima_atividade,
         (SELECT count(*)::int FROM public.forum_respostas r WHERE r.topico_id = t.id),
         (SELECT count(*)::int FROM public.forum_curtidas c WHERE c.topico_id = t.id),
         EXISTS (SELECT 1 FROM public.forum_curtidas c WHERE c.topico_id = t.id AND c.user_id = auth.uid()),
         t.visualizacoes,
         ur.trecho, ur.autor, ur.criado_em,
         t.fechado,
         (
           (t.autor_id IS DISTINCT FROM auth.uid() AND l.lido_em IS NULL)
           OR EXISTS (SELECT 1 FROM public.forum_respostas r
                       WHERE r.topico_id = t.id AND r.autor_id IS DISTINCT FROM auth.uid()
                         AND r.criado_em > coalesce(l.lido_em, '-infinity'::timestamptz))
         )
    FROM public.forum_topicos t
    LEFT JOIN public.profiles pr ON pr.id = t.autor_id
    LEFT JOIN public.forum_leituras l ON l.topico_id = t.id AND l.user_id = auth.uid()
    LEFT JOIN LATERAL (
      SELECT left(regexp_replace(btrim(r.corpo), '\s+', ' ', 'g'), 120) AS trecho, rp.full_name AS autor, r.criado_em
        FROM public.forum_respostas r
        LEFT JOIN public.profiles rp ON rp.id = r.autor_id
       WHERE r.topico_id = t.id
       ORDER BY r.criado_em DESC
       LIMIT 1
    ) ur ON true
   WHERE t.sala_id = p_sala AND auth.uid() IS NOT NULL
   ORDER BY t.ultima_atividade DESC;
$$;
REVOKE ALL ON FUNCTION public.forum_topicos_da_sala(bigint) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.forum_topicos_da_sala(bigint) TO authenticated;

-- O tópico aberto também diz se está fechado.
CREATE OR REPLACE FUNCTION public.forum_topico(p_id bigint)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN NULL ELSE (
    SELECT jsonb_build_object(
      'id', t.id, 'sala_id', t.sala_id, 'titulo', t.titulo, 'corpo', t.corpo, 'fechado', t.fechado,
      'autor_id', t.autor_id, 'autor_nome', pr.full_name, 'autor_avatar', pr.avatar_url,
      'autor_conta', public.conta_efetiva(t.autor_id),
      'criado_em', t.criado_em, 'editado_em', t.editado_em, 'visualizacoes', t.visualizacoes,
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

COMMIT;
