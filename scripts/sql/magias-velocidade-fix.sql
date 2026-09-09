-- scripts/sql/magias-velocidade-fix.sql
-- ============================================================
-- Corrige dois textos que impedem a leitura automática do modificador de
-- velocidade. Ver docs/superpowers/specs/2026-09-01-efeitos-batalha-velocidade-design.md §3.2
--
-- 1) Tensão — "Aumente N de defesa, velocidade e coluna(s) de ataque."
--    Um número servindo a três coisas, e nenhum número junto de "velocidade".
--    O leitor exige `número + "de velocidade"`, então hoje Tensão daria 0.
--    Vira "Aumente N de defesa, N de velocidade e N coluna(s) de ataque.",
--    caindo no mesmo padrão das outras sete magias.
--
-- 2) Ruído Extenuante — níveis 5 e 9 têm "Reduza5"/"Reduza9", sem espaço
--    depois do verbo. A parte da velocidade ainda lê, mas é erro de digitação.
--
-- Rodar o SELECT de conferência antes e depois (ver plano, Task 1).
-- ============================================================

BEGIN;

UPDATE public.magias SET
  nivel_1 = 'Aumente 1 de defesa, 1 de velocidade e 1 coluna de ataque.',
  nivel_3 = 'Aumente 2 de defesa, 2 de velocidade e 2 colunas de ataque.',
  nivel_5 = 'Aumente 3 de defesa, 3 de velocidade e 3 colunas de ataque.',
  nivel_7 = 'Aumente 4 de defesa, 4 de velocidade e 4 colunas de ataque.',
  nivel_9 = 'Aumente 5 de defesa, 5 de velocidade e 5 colunas de ataque.'
WHERE nome = 'Tensão';

UPDATE public.magias SET
  nivel_1 = regexp_replace(nivel_1, '(Aumente|Reduza)(\d)', '\1 \2', 'g'),
  nivel_3 = regexp_replace(nivel_3, '(Aumente|Reduza)(\d)', '\1 \2', 'g'),
  nivel_5 = regexp_replace(nivel_5, '(Aumente|Reduza)(\d)', '\1 \2', 'g'),
  nivel_7 = regexp_replace(nivel_7, '(Aumente|Reduza)(\d)', '\1 \2', 'g'),
  nivel_9 = regexp_replace(nivel_9, '(Aumente|Reduza)(\d)', '\1 \2', 'g')
WHERE nome = 'Ruído Extenuante';

COMMIT;
