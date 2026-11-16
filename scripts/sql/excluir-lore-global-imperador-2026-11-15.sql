-- scripts/sql/excluir-lore-global-imperador-2026-11-15.sql
-- ============================================================
-- O IMPERADOR APAGA ENTRADA DO MUNDO (15/11/2026)
-- ============================================================
-- Usuário: "Cliquei em editar uma cidade e não vejo o botão de excluir no
-- modal, do lado esquerdo do rodapé." A cidade era do mundo (historia_id
-- nulo), e excluir_lore_entrada só apaga CÓPIAS de mesa — por isso a tela
-- escondia o botão. Quem administra o mundo é o Imperador: para ele, a
-- entrada do mundo agora se apaga direto. Para os outros, nada muda.
-- ============================================================

CREATE OR REPLACE FUNCTION public.excluir_lore_entrada(p_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_linhas integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  -- Entrada do MUNDO: só o Imperador, e direto na tabela.
  IF public.eh_admin() THEN
    DELETE FROM public.reinos  WHERE slug = p_id AND historia_id IS NULL;
    GET DIAGNOSTICS v_linhas = ROW_COUNT;
    IF v_linhas = 0 THEN DELETE FROM public.cidades WHERE slug = p_id AND historia_id IS NULL; GET DIAGNOSTICS v_linhas = ROW_COUNT; END IF;
    IF v_linhas = 0 THEN DELETE FROM public.locais  WHERE slug = p_id AND historia_id IS NULL; GET DIAGNOSTICS v_linhas = ROW_COUNT; END IF;
    IF v_linhas = 0 THEN DELETE FROM public.npcs    WHERE slug = p_id AND historia_id IS NULL; GET DIAGNOSTICS v_linhas = ROW_COUNT; END IF;
    IF v_linhas > 0 THEN
      RETURN jsonb_build_object('ok', true, 'apagou_mundo', true);
    END IF;
  END IF;

  -- Cópia de mesa: o caminho de sempre.
  IF EXISTS (SELECT 1 FROM public.reinos WHERE slug = p_id) THEN
    RETURN excluir_copia_reino(p_id);
  ELSIF EXISTS (SELECT 1 FROM public.cidades WHERE slug = p_id) THEN
    RETURN excluir_copia_cidade(p_id);
  ELSIF EXISTS (SELECT 1 FROM public.locais WHERE slug = p_id) THEN
    RETURN excluir_copia_local(p_id);
  ELSIF EXISTS (SELECT 1 FROM public.npcs WHERE slug = p_id) THEN
    RETURN excluir_copia_npc(p_id);
  ELSE
    RETURN jsonb_build_object('ok', false, 'motivo', 'entrada_nao_encontrada');
  END IF;
END;
$function$;
