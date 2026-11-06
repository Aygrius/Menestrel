-- pontos-intelecto-2026-11-06.sql
--
-- Pedido do usuário em 06/11/2026:
--   "A quantidade de pontos de magia deve ser por estágio + pontos de intelecto.
--    A quantidade de pontos de técnica deve ser por estágio + pontos de intelecto.
--    Vamos mudar a base de pontos de técnica das profissões, por exemplo o Ladino
--    terá 8, o Mago terá 1, o Guerreiro terá 10, o Sacerdote e o Bardo terão 3,
--    o Rastreador terá 6."
-- Respostas às perguntas no mesmo dia: o Intelecto soma A CADA estágio
-- ((base + Intelecto) × estágio), e a Aura negativa continua zerando a base de
-- magia (a Aura só deixa de somar).
--
-- ESPELHO de 01-core/game-data.jsx (pontosMagiasPorEstagio,
-- pontosTecnicasPorEstagio). As RPCs aprender_magia, aprender_tecnica e
-- subir_nivel conferem os pontos por aqui.

BEGIN;

-- Magia: mesma assinatura (as chamadas não mudam); a Aura só zera a base.
CREATE OR REPLACE FUNCTION public._menestrel_pontos_magia_por_estagio(p_profissao text, p_intelecto int, p_aura int)
RETURNS int LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT (CASE WHEN coalesce(p_aura, 0) < 0 THEN 0 ELSE
            CASE p_profissao
              WHEN 'Mago' THEN 8 WHEN 'Bardo' THEN 8
              WHEN 'Rastreador' THEN 5 WHEN 'Sacerdote' THEN 5
              WHEN 'Guerreiro' THEN 1 WHEN 'Ladino' THEN 1
              ELSE 0 END
          END)
       + greatest(0, coalesce(p_intelecto, 0));
$$;

-- Técnica: assinatura nova (profissão, intelecto) e as bases novas.
CREATE OR REPLACE FUNCTION public._menestrel_pontos_tecnica_por_estagio(p_profissao text, p_intelecto int)
RETURNS int LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT (CASE p_profissao WHEN 'Guerreiro' THEN 10 WHEN 'Ladino' THEN 8 WHEN 'Rastreador' THEN 6
                           WHEN 'Sacerdote' THEN 3 WHEN 'Bardo' THEN 3 WHEN 'Mago' THEN 1 ELSE 0 END)
       + greatest(0, coalesce(p_intelecto, 0));
$$;

-- As duas RPCs que chamavam a técnica com Físico e Agilidade passam o
-- Intelecto. Troca só a chamada, no texto da função como está no banco.
DO $do$
DECLARE
  f text;
  def text;
  velho constant text := '_menestrel_pontos_tecnica_por_estagio(v_pj.profissao, v_pj.fisico_base, v_pj.agilidade_base)';
  novo  constant text := '_menestrel_pontos_tecnica_por_estagio(v_pj.profissao, v_pj.intelecto_base)';
BEGIN
  FOREACH f IN ARRAY ARRAY['public.aprender_tecnica(bigint,text,text)', 'public.subir_nivel(bigint,text,text)'] LOOP
    def := pg_get_functiondef(f::regprocedure);
    IF position(velho in def) = 0 THEN
      RAISE EXCEPTION 'chamada antiga não encontrada em %', f;
    END IF;
    def := replace(def, velho, novo);
    -- aprender_tecnica não lia o Intelecto do personagem: passa a ler.
    IF f LIKE 'public.aprender_tecnica%' THEN
      IF position('experiencia, fisico_base, agilidade_base' in def) = 0 THEN
        RAISE EXCEPTION 'select de v_pj não encontrado em %', f;
      END IF;
      def := replace(def, 'experiencia, fisico_base, agilidade_base',
                          'experiencia, fisico_base, agilidade_base, intelecto_base');
    END IF;
    EXECUTE def;
  END LOOP;
END
$do$;

DROP FUNCTION public._menestrel_pontos_tecnica_por_estagio(text, int, int);

COMMIT;
