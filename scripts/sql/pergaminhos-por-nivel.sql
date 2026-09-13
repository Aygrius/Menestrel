-- scripts/sql/pergaminhos-por-nivel.sql
-- ============================================================
-- Um pergaminho para CADA NÍVEL de magia Perdida e Ancestral.
--
-- POR QUE. Correção do usuário (12/09/2026) sobre pergaminhos-magias-travadas.sql,
-- que criou só o nível 1: "diferente das magias que a cada level você pode ou
-- não escolher aumentar o nível, nas magias perdidas e ancestrais, cada nível
-- exige um pergaminho diferente."
--
-- A RPC usar_pergaminho_magia JÁ foi escrita para isso e não muda:
--   nivel_magia 3 → grava 2 passos, e exige ter o nível 1;
--   nivel_magia 5 → 3 passos, exige o 3; e assim até o 9.
-- Ela também confere permissão, teto de estágio e pontos de magia.
--
-- Só cria o nível que a magia TEM texto (nivel_N não nulo): Soneto da Morte,
-- por exemplo, só tem o nível 1.
--
-- MOLDE idêntico ao do nível 1, trocando o número:
--   slug  pergaminho_<key>_<N>     nome  "Pergaminho <Magia> <N>"
--   grupo Consumíveis · ocupa 0.1 · tipo S · origem Raro · icone ti-file-star
--   magia <Nome> · nivel_magia N · dano_l/m/p 0 · `magico` é coluna gerada
--
-- IDEMPOTENTE: pula nível que já tem pergaminho ou slug já existente.
-- ============================================================

BEGIN;

INSERT INTO public.itens
  (slug, nome, grupo, ocupa, tipo, origem, icone, magia, nivel_magia, descricao,
   dano_l, dano_m, dano_p)
SELECT
  'pergaminho_' || m.key || '_' || v.n,
  'Pergaminho ' || m.nome || ' ' || v.n,
  'Consumíveis', 0.1, 'S', 'Raro', 'ti-file-star',
  m.nome, v.n,
  'Pergaminho com instruções para o aprendizado da magia '
    || CASE m.tipo WHEN 'Ancestral' THEN 'ancestral' ELSE 'perdida' END
    || ' ' || m.nome || ' ' || v.n || '.',
  0, 0, 0
FROM public.magias m
CROSS JOIN LATERAL (VALUES (1, m.nivel_1), (3, m.nivel_3), (5, m.nivel_5), (7, m.nivel_7), (9, m.nivel_9)) AS v(n, texto)
WHERE m.tipo IN ('Perdida', 'Ancestral')
  AND v.texto IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.itens i
     WHERE i.nome ILIKE 'Pergaminho%' AND i.magia = m.nome AND i.nivel_magia = v.n
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.itens i WHERE i.slug = 'pergaminho_' || m.key || '_' || v.n
  );

-- Guarda: todo nível com texto de magia travada tem o seu pergaminho.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
    FROM public.magias m
    CROSS JOIN LATERAL (VALUES (1, m.nivel_1), (3, m.nivel_3), (5, m.nivel_5), (7, m.nivel_7), (9, m.nivel_9)) AS v(n, texto)
   WHERE m.tipo IN ('Perdida', 'Ancestral') AND v.texto IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.itens i
                      WHERE i.nome ILIKE 'Pergaminho%' AND i.magia = m.nome AND i.nivel_magia = v.n);
  IF n > 0 THEN RAISE EXCEPTION '% nível(is) travado(s) ainda sem pergaminho', n; END IF;
END $$;

COMMIT;
