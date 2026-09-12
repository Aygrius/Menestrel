-- ============================================================
-- magias-elemento-luz-vira-celestial.sql — 12/09/2026
-- ============================================================
-- Decisão do usuário: o jogo tem SEIS elementos, e são estes —
--
--     Celestial · Ar · Fogo · Água · Terra · Infernal
--
-- "Luz" não é um deles: era o nome antigo do Celestial, e as duas formas
-- conviviam no catálogo. Dardos de Luz já dizia "dano celestial"; Fotomanipulação
-- e Lâmina de Luz ainda diziam "dano elemental de luz". Mesma coisa, dois nomes
-- — e o motor tratava como elementos DIFERENTES, então uma proteção celestial
-- não cortaria a Lâmina.
--
-- Muda só a palavra do ELEMENTO, dentro do texto do nível. NÃO mexe em:
--   • `nome` — "Lâmina de Luz" e "Dardos de Luz" continuam se chamando assim.
--     Nome é identidade: `criaturas.magia` referencia por ele (ver §3 de
--     docs/manutencao-magias.md);
--   • `descricao` — lá "luz" é prosa ("um bastão que emite luz"), não elemento.
--
-- IDEMPOTENTE: rodar de novo não faz nada, porque o padrão já terá sumido.
-- ============================================================
BEGIN;

-- Confere ANTES: deve listar fotomanipulacao e lamina_de_luz, 5 níveis cada.
SELECT key, nome,
       (nivel_1 ~* 'elemental de luz')::int
     + (nivel_3 ~* 'elemental de luz')::int
     + (nivel_5 ~* 'elemental de luz')::int
     + (nivel_7 ~* 'elemental de luz')::int
     + (nivel_9 ~* 'elemental de luz')::int AS niveis_afetados
  FROM magias
 WHERE (coalesce(nivel_1,'')||coalesce(nivel_3,'')||coalesce(nivel_5,'')
       ||coalesce(nivel_7,'')||coalesce(nivel_9,'')) ~* 'elemental de luz'
 ORDER BY nome;

-- "dano elemental de luz" → "dano elemental celestial".
-- Celestial é ADJETIVO, como nos outros: "elemental de fogo" mas
-- "elemental celestial", nunca "elemental de celestial".
UPDATE magias SET
  nivel_1 = regexp_replace(nivel_1, 'elemental de luz', 'elemental celestial', 'gi'),
  nivel_3 = regexp_replace(nivel_3, 'elemental de luz', 'elemental celestial', 'gi'),
  nivel_5 = regexp_replace(nivel_5, 'elemental de luz', 'elemental celestial', 'gi'),
  nivel_7 = regexp_replace(nivel_7, 'elemental de luz', 'elemental celestial', 'gi'),
  nivel_9 = regexp_replace(nivel_9, 'elemental de luz', 'elemental celestial', 'gi')
 WHERE (coalesce(nivel_1,'')||coalesce(nivel_3,'')||coalesce(nivel_5,'')
       ||coalesce(nivel_7,'')||coalesce(nivel_9,'')) ~* 'elemental de luz';

-- Confere DEPOIS: tem que vir vazio.
SELECT key, nome FROM magias
 WHERE (coalesce(nivel_1,'')||coalesce(nivel_3,'')||coalesce(nivel_5,'')
       ||coalesce(nivel_7,'')||coalesce(nivel_9,'')) ~* 'elemental de luz';

COMMIT;
