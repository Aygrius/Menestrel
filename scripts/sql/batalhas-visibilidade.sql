-- ============================================================
-- batalhas-visibilidade.sql — 12/09/2026
-- ============================================================
-- "O Mestre poderá adicionar um efeito de visibilidade no tabuleiro da
-- batalha: escuridão parcial, escuridão total, escuridão mágica."
--
-- Estado do AMBIENTE, não do participante: escuridão é da cena e vale para
-- todos que estiverem nela. Por isso mora em `batalhas`, ao lado de `rodada`.
--
-- Os três níveis não foram inventados: estão escritos na magia VISÃO ANIMAL,
-- que os define um a um — parcial (noite sem lua), total (ambiente fechado),
-- mágica (ausência total de luz). 'clara' é o default e o valor de toda
-- batalha que já existia.
--
-- JÁ APLICADO em produção via migration `batalhas_visibilidade`.
-- ============================================================
ALTER TABLE batalhas
  ADD COLUMN IF NOT EXISTS visibilidade text NOT NULL DEFAULT 'clara';

ALTER TABLE batalhas DROP CONSTRAINT IF EXISTS batalhas_visibilidade_check;
ALTER TABLE batalhas ADD CONSTRAINT batalhas_visibilidade_check
  CHECK (visibilidade IN ('clara','parcial','total','magica'));

COMMENT ON COLUMN batalhas.visibilidade IS
  'Escuridão do tabuleiro: clara | parcial | total | magica. Quem não enxerga perde coluna de ataque; Visão Animal e Luta às Cegas vencem.';
