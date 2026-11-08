-- batalha-treinamento-2026-11-07.sql
--
-- Pedido do usuário em 07/11/2026: "Crie na página de batalhas, um 'modo
-- treinamento' para o mesmo simular e convidar jogadores. Esse modo não vai
-- salvar os efeitos do combate na ficha."
--
-- batalhas.treinamento marca o treino. O cliente deixa de gravar na ficha
-- (vitalidade, condições, status, desgaste da armadura, item gasto, flecha,
-- veneno, saque, animal morto). Aqui, no encerramento: o treino não arquiva
-- o log na história e a carne das criaturas não vai para a loja — a linha só
-- é apagada.

BEGIN;

alter table public.batalhas add column if not exists treinamento boolean not null default false;

CREATE OR REPLACE FUNCTION public.encerrar_batalha(p_batalha_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  b record;
  registro jsonb;
BEGIN
  -- Lê a batalha (com lock pra evitar race entre encerrar + outro update concorrente).
  SELECT id, historia_id, mestre_id, rodada, participantes, log, created_at, treinamento
    INTO b
    FROM public.batalhas
   WHERE id = p_batalha_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_encontrada');
  END IF;

  -- Só o Mestre dono pode encerrar.
  IF b.mestre_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autorizado');
  END IF;

  -- Treino (07/11/2026): nada sai da luta — sem arquivo, sem carne na loja.
  IF b.treinamento THEN
    DELETE FROM public.batalhas WHERE id = b.id;
    RETURN jsonb_build_object('ok', true, 'treinamento', true);
  END IF;

  -- Monta o registro arquivado. Mantém o id pra rastreabilidade.
  registro := jsonb_build_object(
    'id',             b.id,
    'encerrada_em',   to_jsonb(now()),
    'criada_em',      to_jsonb(b.created_at),
    'rodadas',        COALESCE(b.rodada, 0),
    'participantes',  COALESCE(b.participantes, '[]'::jsonb),
    'log',            COALESCE(b.log, '[]'::jsonb)
  );

  -- Carne das criaturas mortas vai para a loja (28/09/2026).
  PERFORM public._menestrel_carne_da_batalha(b.historia_id, b.participantes, b.log);

  -- APPEND no array batalhas_arquivadas da história.
  UPDATE public.historias
     SET batalhas_arquivadas = COALESCE(batalhas_arquivadas, '[]'::jsonb) || jsonb_build_array(registro)
   WHERE id = b.historia_id;

  -- DELETE da batalha.
  DELETE FROM public.batalhas WHERE id = b.id;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

COMMIT;
