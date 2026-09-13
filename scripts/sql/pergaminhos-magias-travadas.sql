-- scripts/sql/pergaminhos-magias-travadas.sql
-- ============================================================
-- Um pergaminho para cada magia Perdida e Ancestral que ainda não tinha.
--
-- POR QUE. Magia Perdida e Ancestral só se aprende com pergaminho (pedido do
-- usuário, 12/09/2026: "estes itens ainda não existem no banco. Crie eles igual
-- os pergaminhos que já existem"). Das 60 travadas, só 5 tinham.
--
-- O MOLDE é o dos pergaminhos existentes (Dardos de Luz, Nutrição Natural,
-- Oferenda, Milagre Análogo, Energia Primordial), campo a campo:
--
--   slug          pergaminho_<key da magia>_1
--   nome          "Pergaminho <Nome da Magia> 1"
--   grupo         Consumíveis          tipo   S
--   ocupa         0.1                  icone  ti-file-star
--   origem        Raro                 — `magico` é coluna GERADA, não se insere
--   magia         <Nome da Magia>      — itens.magia referencia por NOME
--   nivel_magia   1
--   descricao     "Pergaminho com instruções para o aprendizado da magia
--                  perdida|ancestral <Nome> 1."
--   dano_l/m/p    0 (default dos existentes); o resto NULL
--
-- Nível 1, como todos os existentes: o pergaminho destrava a magia; os níveis
-- seguintes o personagem compra.
--
-- IDEMPOTENTE: só insere magia travada SEM pergaminho e slug inexistente.
-- REVERSÍVEL: DELETE FROM itens WHERE slug IN (...) — os slugs criados são os
-- que esta consulta lista antes de rodar.
-- ============================================================

BEGIN;

INSERT INTO public.itens
  (slug, nome, grupo, ocupa, tipo, origem, icone, magia, nivel_magia, descricao,
   dano_l, dano_m, dano_p)
SELECT
  'pergaminho_' || m.key || '_1',
  'Pergaminho ' || m.nome || ' 1',
  'Consumíveis', 0.1, 'S', 'Raro', 'ti-file-star',
  m.nome, 1,
  'Pergaminho com instruções para o aprendizado da magia '
    || CASE m.tipo WHEN 'Ancestral' THEN 'ancestral' ELSE 'perdida' END
    || ' ' || m.nome || ' 1.',
  0, 0, 0
FROM public.magias m
WHERE m.tipo IN ('Perdida', 'Ancestral')
  AND NOT EXISTS (
    SELECT 1 FROM public.itens i
     WHERE i.nome ILIKE 'Pergaminho%' AND i.magia = m.nome
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.itens i WHERE i.slug = 'pergaminho_' || m.key || '_1'
  );

-- Guarda: toda magia travada tem pergaminho.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.magias m
   WHERE m.tipo IN ('Perdida', 'Ancestral')
     AND NOT EXISTS (SELECT 1 FROM public.itens i WHERE i.nome ILIKE 'Pergaminho%' AND i.magia = m.nome);
  IF n > 0 THEN RAISE EXCEPTION '% magia(s) travada(s) ainda sem pergaminho', n; END IF;
END $$;

COMMIT;
