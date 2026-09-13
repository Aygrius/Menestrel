-- scripts/sql/pergaminhos-pendencias.sql
-- ============================================================
-- As três pendências deixadas pela criação dos pergaminhos (12/09/2026).
--
-- 1) "Pergaminho Transformação Animal 1" SAI.
--    Transformação Animal foi fundida em Mutação (magias-reforma-perfis.sql),
--    e Mutação é Básica — comprada com pontos, sem pergaminho. O item ficou
--    ensinando uma magia que não pede pergaminho. Conferido antes de apagar:
--    NENHUM personagem, história, batalha ou item de história o referencia.
--
-- 2) "Pergaminho Energia Primordial 1" dizia "magia perdida"; Energia
--    Primordial é ANCESTRAL. Só o texto muda.
--
-- 3) get_pjs_historia deixa de ser executável por quem NÃO está logado.
--    É SECURITY DEFINER e devolve nome, raça, profissão e (desde
--    get-pjs-historia-foto.sql) a foto dos colegas de história de qualquer
--    p_pj_id. O único chamador (inventario.jsx) roda com sessão. Ficam
--    authenticated e service_role.
-- ============================================================

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.personagens
   WHERE inventario::text LIKE '%pergaminho_transformacao_animal_1%';
  IF n > 0 THEN RAISE EXCEPTION '% personagem(ns) ainda carregam o pergaminho', n; END IF;
END $$;

DELETE FROM public.itens WHERE slug = 'pergaminho_transformacao_animal_1';

UPDATE public.itens
   SET descricao = 'Pergaminho com instruções para o aprendizado da magia ancestral Energia Primordial 1.'
 WHERE slug = 'pergaminho_energia_primordial';

REVOKE EXECUTE ON FUNCTION public.get_pjs_historia(bigint) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_pjs_historia(bigint) TO authenticated, service_role;

COMMIT;
