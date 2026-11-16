-- 16/11/2026 — O Fórum: o que as listas de salas e tópicos precisam mostrar.
--
-- Usuário: "Melhore a lista de tópicos e salas na página [...] me dê sugestões"
-- e, das cinco, "Pode fazer os 5 itens": ícone de cada sala, números em
-- colunas, o retrato de quem postou por último, o destaque do que é novo e o
-- cabeçalho das colunas. O banco passa a dar:
--   • forum_salas.icone — o ícone da sala (classe Tabler; NULL = o padrão);
--   • forum_salas_resumo: icone, ultimo_topico_avatar e novas (há tópico com
--     novidade para quem lê, na sala ou nas de dentro);
--   • forum_topicos_da_sala: ultima_resposta_avatar.
-- O tipo de retorno muda, então as funções caem e voltam; as permissões são
-- as de antes (só authenticated e service_role executam).

BEGIN;

ALTER TABLE public.forum_salas ADD COLUMN IF NOT EXISTS icone text;
ALTER TABLE public.forum_salas DROP CONSTRAINT IF EXISTS forum_salas_icone_check;
ALTER TABLE public.forum_salas ADD CONSTRAINT forum_salas_icone_check CHECK (icone IS NULL OR icone ~ '^ti-[a-z0-9-]{1,40}$');

DROP FUNCTION IF EXISTS public.forum_salas_resumo();
CREATE FUNCTION public.forum_salas_resumo()
 RETURNS TABLE(id bigint, pai_id bigint, nome text, descricao text, ordem integer, fechada boolean, icone text,
               topicos integer, salas integer, ultima_atividade timestamp with time zone,
               ultimo_topico_id bigint, ultimo_topico_titulo text, ultimo_topico_autor text, ultimo_topico_avatar text,
               ultimo_topico_em timestamp with time zone, novas boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH RECURSIVE arvore AS (
    SELECT s.id AS raiz, s.id AS sala FROM public.forum_salas s
    UNION
    SELECT a.raiz, f.id FROM arvore a JOIN public.forum_salas f ON f.pai_id = a.sala
  )
  SELECT s.id, s.pai_id, s.nome, s.descricao, s.ordem, s.fechada, s.icone,
         (SELECT count(*)::int FROM public.forum_topicos t WHERE t.sala_id = s.id),
         (SELECT count(*)::int FROM public.forum_salas f WHERE f.pai_id = s.id),
         (SELECT max(t.ultima_atividade) FROM public.forum_topicos t JOIN arvore a ON a.sala = t.sala_id WHERE a.raiz = s.id),
         u.id, u.titulo, u.autor, u.avatar, u.criado_em,
         EXISTS (
           SELECT 1 FROM public.forum_topicos t
             JOIN arvore a ON a.sala = t.sala_id AND a.raiz = s.id
             LEFT JOIN public.forum_leituras l ON l.topico_id = t.id AND l.user_id = auth.uid()
            WHERE NOT t.fechado AND (
                  (t.autor_id IS DISTINCT FROM auth.uid() AND l.lido_em IS NULL)
               OR EXISTS (SELECT 1 FROM public.forum_respostas r
                           WHERE r.topico_id = t.id AND r.autor_id IS DISTINCT FROM auth.uid()
                             AND r.criado_em > coalesce(l.lido_em, '-infinity'::timestamptz)))
         )
    FROM public.forum_salas s
    LEFT JOIN LATERAL (
      SELECT t.id, t.titulo, pr.full_name AS autor, pr.avatar_url AS avatar, t.criado_em
        FROM public.forum_topicos t
        JOIN arvore a ON a.sala = t.sala_id AND a.raiz = s.id
        LEFT JOIN public.profiles pr ON pr.id = t.autor_id
       ORDER BY t.criado_em DESC
       LIMIT 1
    ) u ON true
   WHERE auth.uid() IS NOT NULL
   ORDER BY s.ordem, s.nome;
$function$;

DROP FUNCTION IF EXISTS public.forum_topicos_da_sala(bigint);
CREATE FUNCTION public.forum_topicos_da_sala(p_sala bigint)
 RETURNS TABLE(id bigint, titulo text, autor_id uuid, autor_nome text, autor_avatar text, autor_conta text,
               criado_em timestamp with time zone, ultima_atividade timestamp with time zone, respostas integer,
               curtidas integer, eu_curti boolean, visualizacoes integer, ultima_resposta_trecho text,
               ultima_resposta_autor text, ultima_resposta_avatar text, ultima_resposta_em timestamp with time zone,
               fechado boolean, novas boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT t.id, t.titulo, t.autor_id, pr.full_name, pr.avatar_url, public.conta_efetiva(t.autor_id),
         t.criado_em, t.ultima_atividade,
         (SELECT count(*)::int FROM public.forum_respostas r WHERE r.topico_id = t.id),
         (SELECT count(*)::int FROM public.forum_curtidas c WHERE c.topico_id = t.id),
         EXISTS (SELECT 1 FROM public.forum_curtidas c WHERE c.topico_id = t.id AND c.user_id = auth.uid()),
         t.visualizacoes,
         ur.trecho, ur.autor, ur.avatar, ur.criado_em,
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
      SELECT left(regexp_replace(btrim(r.corpo), '\s+', ' ', 'g'), 120) AS trecho, rp.full_name AS autor,
             rp.avatar_url AS avatar, r.criado_em
        FROM public.forum_respostas r
        LEFT JOIN public.profiles rp ON rp.id = r.autor_id
       WHERE r.topico_id = t.id
       ORDER BY r.criado_em DESC
       LIMIT 1
    ) ur ON true
   WHERE t.sala_id = p_sala AND auth.uid() IS NOT NULL
   ORDER BY t.ultima_atividade DESC;
$function$;

REVOKE ALL ON FUNCTION public.forum_salas_resumo() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.forum_topicos_da_sala(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.forum_salas_resumo() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.forum_topicos_da_sala(bigint) TO authenticated, service_role;

COMMIT;
