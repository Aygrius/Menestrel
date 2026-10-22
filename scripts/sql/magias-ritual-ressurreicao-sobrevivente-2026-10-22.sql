-- scripts/sql/magias-ritual-ressurreicao-sobrevivente-2026-10-22.sql
-- Pedido do usuário (22/10/2026): "Ressurreição e Sobrevivente são rituais."
-- Eram as duas únicas magias com itens necessários fora da Evocação Ritual —
-- e o campo de itens agora só aparece em Ritual.
BEGIN;
UPDATE public.magias SET evocacao = 'Ritual', atualizado_em = now()
 WHERE nome IN ('Ressurreição', 'Sobrevivente');
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.magias
   WHERE evocacao IS DISTINCT FROM 'Ritual' AND nullif(btrim(itens_necessarios), '') IS NOT NULL;
  IF n > 0 THEN RAISE EXCEPTION '% magia(s) com itens fora de Ritual', n; END IF;
END $$;
COMMIT;
