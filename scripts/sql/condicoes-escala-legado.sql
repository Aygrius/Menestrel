-- scripts/sql/condicoes-escala-legado.sql
-- ============================================================
-- Normaliza personagens.estado_atual->'condicoes' para a escala bidirecional
-- -50..+50 (COND_LIMITE, src/01-core/helpers.jsx), 0 = neutro.
--
-- POR QUÊ
-- ============================================================
-- Até 01/09/2026, aplicarEfeitosItem (01-core/inventario-helpers.jsx) ficou na
-- escala ANTIGA 0–100 depois que o resto do sistema migrou: default 100
-- ("cheio") e clamp 0..100. Consumir um item pela aba Inventário ou pela Ficha
-- gravava nessa escala. Sintomas:
--
--   • um gole d'água ("35 Hidratação") num PJ sem condição salva gravava 100;
--   • a Ficha e a Batalha, que já liam -50..+50, exibiam a barra saturada no
--     teto +50 — a condição nascia cheia e parecia não responder;
--   • pior que o visual: um valor 95 guardado precisa de 45 pontos de efeito
--     NEGATIVO antes da barra sair do teto. Na prática a condição travava.
--
-- O código foi corrigido (efeitosDoItem + aplicarDeltaCondicao, cobertos por
-- src/01-core/efeitos-item.test.js e src/12-batalha/efeito-item-escala.test.js).
-- Falta a faxina nas linhas gravadas antes disso — é o que este script faz.
--
-- POR QUE **NÃO** É UM REMAPEAMENTO LINEAR
-- ============================================================
-- A coluna está MISTURADA, não toda na escala velha. Três gravadores convivem:
--
--   escala NOVA  → edição manual do Mestre (ficha.jsx aplicarEstado, com
--                  bounds ±COND_LIMITE) e o write-through da batalha
--                  (batalha.jsx aplicarItem/handleItem);
--   escala VELHA → só o aplicarEfeitosItem antigo.
--
-- Como as duas escalas se sobrepõem em 0..50, NÃO existe forma de olhar um
-- valor 30 e saber de qual gravador ele veio. Um `valor - 50` linear
-- transformaria um 0 legitimamente neutro em -50 (condição péssima) em todo PJ
-- que o Mestre tenha ajustado à mão. Seria corromper dado bom para consertar
-- dado ruim.
--
-- A única inferência SEGURA é a dos valores impossíveis: qualquer coisa fora de
-- [-50, +50] só pode ter vindo da escala velha. Este script portanto só faz o
-- CLAMP, e deixa a faixa válida intocada.
--
-- Efeito prático: um 95 legado vira 50. Visualmente nada muda (a Ficha já o
-- exibia como 50), mas o valor deixa de ser inalcançável — o próximo -5 leva a
-- 45 e a barra finalmente se mexe.
--
-- O QUE NÃO É COBERTO
-- ============================================================
-- Um PJ que estava em 100 "cheio" na escala velha e cuja intenção era "pleno"
-- termina em +50, o extremo da escala nova — o que é a leitura mais fiel
-- possível. Já um PJ que tenha ficado em, digamos, 20 na escala velha (bem
-- ruim: 20 de 100) fica em +20 na nova (levemente BOM). Esse caso é
-- indistinguível de um +20 legítimo e sai como está. Se preferir zerar todas as
-- condições e deixar a mesa recomeçar do neutro, use a ALTERNATIVA no fim.
--
-- COMO RODAR
-- ============================================================
-- 1. Rode o bloco CONFERÊNCIA ANTES e guarde o resultado.
-- 2. Rode o bloco de correção (BEGIN/COMMIT).
-- 3. Rode a CONFERÊNCIA DEPOIS: `fora_da_faixa` tem que ser 0.
-- ============================================================


-- ── CONFERÊNCIA ANTES ───────────────────────────────────────
-- Quantos PJs têm alguma condição fora de [-50, 50], e quais valores.
SELECT
  p.id,
  p.nome,
  c.key   AS condicao,
  c.value AS valor
FROM public.personagens p
CROSS JOIN LATERAL jsonb_each_text(COALESCE(p.estado_atual->'condicoes', '{}'::jsonb)) AS c(key, value)
WHERE c.value ~ '^-?[0-9]+(\.[0-9]+)?$'
  AND (c.value::numeric > 50 OR c.value::numeric < -50)
ORDER BY p.nome, c.key;


-- ── CORREÇÃO ────────────────────────────────────────────────
BEGIN;

UPDATE public.personagens p
SET estado_atual = jsonb_set(
      p.estado_atual,
      '{condicoes}',
      (
        SELECT jsonb_object_agg(
                 c.key,
                 CASE
                   -- Não numérico (lixo, ou JSON null): preserva como está —
                   -- não é problema de escala e não cabe a este script decidir.
                   --
                   -- O `IS NULL` explícito NÃO é redundante: jsonb_each_text
                   -- devolve NULL pra um JSON null, e `NULL !~ regex` é NULL,
                   -- que não é TRUE e portanto cairia no ELSE. Lá, GREATEST e
                   -- LEAST IGNORAM NULL no Postgres — LEAST(50, NULL) é 50 —,
                   -- então a condição virava +50, o teto da escala, em vez de
                   -- ser preservada.
                   WHEN c.value IS NULL
                     OR c.value !~ '^-?[0-9]+(\.[0-9]+)?$'
                     THEN p.estado_atual->'condicoes'->c.key
                   ELSE to_jsonb(GREATEST(-50, LEAST(50, c.value::numeric)))
                 END
               )
        FROM jsonb_each_text(p.estado_atual->'condicoes') AS c(key, value)
      )
    )
WHERE p.estado_atual ? 'condicoes'
  AND jsonb_typeof(p.estado_atual->'condicoes') = 'object'
  AND p.estado_atual->'condicoes' <> '{}'::jsonb
  -- Só toca em quem realmente tem valor fora da faixa — mantém o número de
  -- linhas escritas no mínimo e deixa o UPDATE idempotente.
  AND EXISTS (
        SELECT 1
        FROM jsonb_each_text(p.estado_atual->'condicoes') AS c(key, value)
        WHERE c.value ~ '^-?[0-9]+(\.[0-9]+)?$'
          AND (c.value::numeric > 50 OR c.value::numeric < -50)
      );

COMMIT;


-- ── CONFERÊNCIA DEPOIS ──────────────────────────────────────
-- Tem que devolver fora_da_faixa = 0.
SELECT COUNT(*) AS fora_da_faixa
FROM public.personagens p
CROSS JOIN LATERAL jsonb_each_text(COALESCE(p.estado_atual->'condicoes', '{}'::jsonb)) AS c(key, value)
WHERE c.value ~ '^-?[0-9]+(\.[0-9]+)?$'
  AND (c.value::numeric > 50 OR c.value::numeric < -50);


-- ── ALTERNATIVA (mais agressiva, NÃO rodar junto com a de cima) ──
-- Zera TODAS as condições de todos os PJs e deixa a mesa recomeçar do neutro.
-- Use se preferir não conviver com valores legados ambíguos dentro da faixa
-- (ver "O QUE NÃO É COBERTO"). Descomente por sua conta:
--
-- BEGIN;
-- UPDATE public.personagens
-- SET estado_atual = estado_atual - 'condicoes'
-- WHERE estado_atual ? 'condicoes';
-- COMMIT;
--
-- Condição ausente é lida como 0 (neutro) em todo o app — Ficha, Inventário e
-- o snapshot de batalha —, então remover a chave é equivalente a zerar.
