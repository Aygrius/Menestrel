-- scripts/sql/base-da-arma-2026-10-26.sql
-- ============================================================================
-- A BASE DA ARMA É A CLASSE DE PESO, TIRADA DO GRUPO DE ARMAS (26/10/2026)
-- ============================================================================
-- Pedido do usuário:
--   "O arco também é uma arma, então a base é a mesma, a diferença é o grupo
--    de armas. PL armas de perfuração leve, PM armas de perfuração média, PP
--    armas de perfuração pesada."
--
-- O QUE SAIU: base por TIPO de arma. O seed de base-do-item-2026-10-26.sql
-- gravou 'adaga', 'espada', 'machado', 'arma-arco', 'arma-besta',
-- 'arma-lanca', 'arma-tridente', 'arma-maca', 'arma-martelo', 'arma-mangual',
-- 'arma-cajado', 'arma-cetro', 'arma-chicote' e 'arma-foice' — e isso estava
-- errado na raiz pelo mesmo motivo que o nome do exemplar estava: tipo de arma
-- é o DESENHO de uma arma, não a classificação dela. Quem separa duas armas no
-- sistema é o grupo de armas, que já está em `itens.grupo_armas`.
--
-- O QUE ENTRA: três bases, e nenhuma delas se escolhe à mão. A última letra da
-- sigla é a classe de peso:
--     CL, PL, EL   →  arma-leve     (Arma Leve)
--     CM, PM, EM   →  arma-medio    (Arma Média)
--     CP, PP, EP   →  arma-pesado   (Arma Pesada)
-- CD (Combate Desarmado: punhos, soqueiras) e CI (Combate de Imobilização:
-- redes, boleadeiras) não têm letra de peso e entram como LEVES — é o que são
-- na mão. O vocabulário de código é 01-core/bases-item.jsx (baseDaArma).
--
-- 'Livre' FICA COMO ESTÁ: são as 9 linhas de ataque natural e improvisado, sem
-- grupo de verdade, e a ficha já não pinta arma de grupo Livre
-- (arteDoItem, 11-ficha). Inventar peso para elas seria inventar regra.
--
-- A PINTURA NÃO MUDA COM ISTO. "Quando a arma equipada for um arco, mostre nas
-- duas mãos um arco" (23/10/2026) continua valendo: a mão escolhe a pintura
-- pelo TIPO lido do nome (arteDoSlot), e cai no peso quando não reconhece.
-- Base é classificação; pintura é desenho, e o desenho pode saber mais.
--
-- Escudo fica fora: ele também vem como categoria_equip = 'arma' no catálogo,
-- mas tem base própria por peso (escudo-leve/medio/pesado).
--
-- IDEMPOTENTE: é um UPDATE de valor derivado. Rodar de novo não muda nada.
-- ============================================================================
BEGIN;

UPDATE public.itens
   SET base = CASE upper(btrim(grupo_armas))
                WHEN 'CL' THEN 'arma-leve'
                WHEN 'PL' THEN 'arma-leve'
                WHEN 'EL' THEN 'arma-leve'
                WHEN 'CD' THEN 'arma-leve'
                WHEN 'CI' THEN 'arma-leve'
                WHEN 'CM' THEN 'arma-medio'
                WHEN 'PM' THEN 'arma-medio'
                WHEN 'EM' THEN 'arma-medio'
                WHEN 'CP' THEN 'arma-pesado'
                WHEN 'PP' THEN 'arma-pesado'
                WHEN 'EP' THEN 'arma-pesado'
              END
 WHERE categoria_equip = 'arma'
   AND nome NOT ILIKE '%escudo%'
   AND upper(btrim(coalesce(grupo_armas, ''))) IN
       ('CL','PL','EL','CD','CI','CM','PM','EM','CP','PP','EP')
   AND base IS DISTINCT FROM CASE upper(btrim(grupo_armas))
                WHEN 'CL' THEN 'arma-leve'
                WHEN 'PL' THEN 'arma-leve'
                WHEN 'EL' THEN 'arma-leve'
                WHEN 'CD' THEN 'arma-leve'
                WHEN 'CI' THEN 'arma-leve'
                WHEN 'CM' THEN 'arma-medio'
                WHEN 'PM' THEN 'arma-medio'
                WHEN 'EM' THEN 'arma-medio'
                WHEN 'CP' THEN 'arma-pesado'
                WHEN 'PP' THEN 'arma-pesado'
                WHEN 'EP' THEN 'arma-pesado'
              END;

COMMIT;

-- ── Conferência ─────────────────────────────────────────────────────────────
-- Espera SÓ arma-leve, arma-medio, arma-pesado (e arma-medio nas 9 de Livre):
--   SELECT coalesce(grupo_armas,'(nulo)') AS grupo, base, count(*)
--     FROM public.itens
--    WHERE categoria_equip = 'arma' AND nome NOT ILIKE '%escudo%'
--    GROUP BY 1, 2 ORDER BY 1, 2;
--
-- Nenhuma arma deve ter ficado com base de TIPO (espera 0 linhas):
--   SELECT slug, nome, grupo_armas, base FROM public.itens
--    WHERE categoria_equip = 'arma' AND nome NOT ILIKE '%escudo%'
--      AND base IN ('adaga','espada','machado','arma-arco','arma-besta',
--                   'arma-lanca','arma-tridente','arma-maca','arma-martelo',
--                   'arma-mangual','arma-cajado','arma-cetro','arma-chicote',
--                   'arma-foice');
