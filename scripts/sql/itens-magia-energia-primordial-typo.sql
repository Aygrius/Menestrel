-- ============================================================
-- itens-magia-energia-primordial-typo.sql — 12/09/2026
-- ============================================================
-- Achado ao ligar os itens mágicos em batalha: dos 55 itens que carregam
-- `magia`, 54 casavam com o catálogo e um não. "Energia Primodial" — falta o
-- **r** — não existe em `magias`, então o Pergaminho Energia Primordial 1
-- nunca conjuraria nada, em silêncio.
--
-- É a mesma armadilha de `criaturas.magia` documentada em §3 do guia: o
-- vínculo é por NOME, e nome errado quebra sem avisar.
--
-- JÁ APLICADO em produção. Fica registrado para o histórico.
-- ============================================================
BEGIN;

-- Deve devolver 1 linha ANTES, e zero DEPOIS.
SELECT slug, nome, magia FROM itens WHERE magia = 'Energia Primodial';

UPDATE itens SET magia = 'Energia Primordial' WHERE magia = 'Energia Primodial';

-- Confere que todo item com magia aponta para uma magia que existe.
SELECT i.slug, i.nome, i.magia
  FROM itens i
 WHERE coalesce(i.magia,'') <> ''
   AND NOT EXISTS (SELECT 1 FROM magias m WHERE m.nome = i.magia);

COMMIT;
