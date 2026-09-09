-- scripts/sql/limite-plano-free.sql
-- ============================================================
-- Faz o limite do plano gratuito valer NO BANCO, não só na tela.
--
-- POR QUÊ
-- ============================================================
-- Hoje o limite é só gate de UI: historias.jsx, personagens.jsx e shell.jsx
-- desabilitam o botão de criar. Qualquer cliente que fale direto com o
-- PostgREST — ou a própria tela com o estado errado — insere à vontade.
--
-- LIMITES
-- ============================================================
-- 1 história e 1 personagem por usuário no plano 'free'. Bate com o que o
-- PlanoEscolhaModal (src/04-auth/auth.jsx) anuncia no onboarding, que é a
-- fonte da verdade (decisão do usuário, 01/09/2026).
--
-- ⚠️ Os mesmos números vivem em PLANO_FREE_LIMITES (src/01-core/constants.jsx).
-- São DOIS lugares de propósito: o cliente precisa do número pra desabilitar
-- o botão e escrever o tooltip sem ida ao banco; o banco precisa dele pra
-- barrar de verdade. Mudou um, muda o outro.
--
-- O QUE NÃO FAZ
-- ============================================================
-- • Não mexe em quem já está acima do teto. O gatilho é BEFORE INSERT: quem
--   tem 2 personagens continua com 2, só não cria o terceiro. Na base atual
--   há um usuário free nessa situação (2 personagens).
-- • Não apaga nada, não altera linha existente.
--
-- COMO REVERTER
-- ============================================================
--   drop trigger if exists trg_limite_free_personagens on public.personagens;
--   drop trigger if exists trg_limite_free_historias   on public.historias;
--   drop function if exists public.checar_limite_plano_free();
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.checar_limite_plano_free()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dono   uuid;
  v_plano  text;
  v_qtd    integer;
  v_limite integer;
BEGIN
  IF TG_TABLE_NAME = 'personagens' THEN
    v_dono   := NEW.user_id;
    v_limite := 1;
    SELECT count(*) INTO v_qtd FROM public.personagens WHERE user_id = v_dono;
  ELSIF TG_TABLE_NAME = 'historias' THEN
    v_dono   := NEW.mestre_id;
    v_limite := 1;
    SELECT count(*) INTO v_qtd FROM public.historias WHERE mestre_id = v_dono;
  ELSE
    RETURN NEW;
  END IF;

  -- Sem dono identificável não há o que contar (não inventa bloqueio).
  IF v_dono IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT plano INTO v_plano FROM public.profiles WHERE id = v_dono;

  -- Só o plano gratuito tem teto. Linha de profile ausente conta como free —
  -- é o default de quem acabou de entrar (ver carregarProfile em shell.jsx).
  IF coalesce(v_plano, 'free') <> 'free' THEN
    RETURN NEW;
  END IF;

  IF v_qtd >= v_limite THEN
    RAISE EXCEPTION
      'Limite do plano gratuito atingido (% de %).', v_qtd, v_limite
      USING ERRCODE = 'check_violation',
            HINT    = 'limite_plano_free';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_limite_free_personagens ON public.personagens;
CREATE TRIGGER trg_limite_free_personagens
  BEFORE INSERT ON public.personagens
  FOR EACH ROW EXECUTE FUNCTION public.checar_limite_plano_free();

DROP TRIGGER IF EXISTS trg_limite_free_historias ON public.historias;
CREATE TRIGGER trg_limite_free_historias
  BEFORE INSERT ON public.historias
  FOR EACH ROW EXECUTE FUNCTION public.checar_limite_plano_free();

COMMIT;


-- ── CONFERÊNCIA — quem seria barrado a partir de agora ──────
-- Não bloqueia ninguém retroativamente; só mostra quem já não poderia criar
-- mais. Rode antes e depois.
SELECT pr.plano,
       pr.id,
       (SELECT count(*) FROM public.historias   h WHERE h.mestre_id = pr.id) AS historias,
       (SELECT count(*) FROM public.personagens p WHERE p.user_id   = pr.id) AS personagens
FROM public.profiles pr
WHERE coalesce(pr.plano, 'free') = 'free'
ORDER BY personagens DESC, historias DESC;
