-- scripts/sql/itens-origem-tipo-armadura-fix.sql
-- ============================================================
-- Duas correções de dado na tabela `itens`, pedidas/encontradas em 11/09/2026.
--
-- 1) ORIGEM VAZIA (75 linhas)
--    Distribuição antes: Comum 489, Raro 105, Mágico 78, NULL 75.
--    O usuário pediu que os vazios virem 'Comum'. Com isso a coluna passa a
--    ter só os três valores fechados, e o descritor do editor de catálogo
--    vira dropdown (catalogo-descritores.jsx) em vez de texto livre — que era
--    justamente o que deixava valor solto entrar por digitação.
--
-- 2) TIPO_ARMADURA EM ARMAS (3 linhas)
--    Soqueira, Boleadeira e Rede têm grupo = 'Armas' e, mesmo assim,
--    tipo_armadura preenchido com 'CD', 'CI' e 'CI' — que são códigos de
--    GRUPO DE ARMAS, não de armadura. O valor de grupo_armas vazou para a
--    coluna vizinha em algum import; nas três linhas os dois campos são
--    idênticos, o que confirma a cópia.
--
--    Tipo de armadura numa arma não significa nada, e a coluna passa a ser
--    dropdown de Leve/Médio/Pesado — esses três apareceriam em branco de
--    qualquer forma. O certo é NULL.
--
--    Mesma classe de defeito de tecnicas.grupo_armas = 'Intermitente'
--    (scripts/sql/tecnicas-grupo-armas-fix.sql): coluna vizinha, valor errado.
--
-- Idempotente: os dois WHERE já excluem as linhas corrigidas.
-- Rodar os SELECTs de conferência antes e depois.
-- ============================================================

-- CONFERÊNCIA (antes):
-- SELECT count(*) FROM public.itens WHERE origem IS NULL OR btrim(origem) = '';
-- SELECT slug, nome, grupo, tipo_armadura, grupo_armas
--   FROM public.itens WHERE tipo_armadura NOT IN ('L','M','P');

BEGIN;

-- 1) Origem vazia vira Comum.
UPDATE public.itens
   SET origem = 'Comum'
 WHERE origem IS NULL OR btrim(origem) = '';

-- 2) Armas não têm tipo de armadura.
--    O filtro é por VALOR INVÁLIDO, não pelos três slugs: se o mesmo
--    vazamento tiver atingido outra linha depois deste levantamento, ela
--    também é corrigida.
UPDATE public.itens
   SET tipo_armadura = NULL
 WHERE tipo_armadura IS NOT NULL
   AND tipo_armadura NOT IN ('L', 'M', 'P');

COMMIT;

-- CONFERÊNCIA (depois): os dois SELECTs acima devem devolver 0 linhas.
