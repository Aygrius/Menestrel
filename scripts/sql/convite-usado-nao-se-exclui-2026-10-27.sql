-- ============================================================
-- CONVITE USADO NÃO SE EXCLUI (27/10/2026)
-- ============================================================
-- Pedido do usuário:
--   "Após um convite ser usado, ele não poderá mais ser excluído da página
--    convites. Ele só vai desaparecer quando ou se o personagem for excluído
--    também."
--
-- A frase tem duas metades, e o banco estava errado nas duas:
--
--   1. A RPC `excluir_convite_historia` apagava qualquer convite do Mestre,
--      usado ou não. Esconder o botão na tela não é regra — regra que só vive
--      na interface é regra que a próxima tela esquece.
--
--   2. `personagem_id` era ON DELETE SET NULL: apagar o personagem deixava o
--      convite para trás, órfão e para sempre (já não dava para excluir por
--      ser usado). O usuário diz o contrário — o convite SOME com o
--      personagem. CASCADE é literalmente a frase dele.
--
-- O convite usado é a ficha de entrada daquele jogador na mesa: enquanto o
-- personagem existe, ele é o registro de como ele chegou ali.
-- ============================================================

-- 1. O convite usado morre com o personagem, não antes.
ALTER TABLE public.convites_historia
  DROP CONSTRAINT IF EXISTS convites_historia_personagem_id_fkey;

ALTER TABLE public.convites_historia
  ADD CONSTRAINT convites_historia_personagem_id_fkey
  FOREIGN KEY (personagem_id) REFERENCES public.personagens(id) ON DELETE CASCADE;

-- 2. E a exclusão manual recusa o que já foi usado.
CREATE OR REPLACE FUNCTION public.excluir_convite_historia(p_convite_id bigint)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_usado uuid;
BEGIN
  SELECT usado_por INTO v_usado
  FROM public.convites_historia
  WHERE id = p_convite_id AND mestre_id = auth.uid();

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;

  -- Usado é usado: só sai junto com o personagem (ON DELETE CASCADE acima).
  IF v_usado IS NOT NULL THEN
    RETURN json_build_object('ok', false, 'motivo', 'convite_usado');
  END IF;

  DELETE FROM public.convites_historia WHERE id = p_convite_id;
  RETURN json_build_object('ok', true);
END;
$function$;
