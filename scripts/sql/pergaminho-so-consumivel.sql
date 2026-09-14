-- scripts/sql/pergaminho-so-consumivel.sql
-- ============================================================
-- usar_pergaminho_magia só aceita CONSUMÍVEL.
--
-- POR QUE. "O Livro das Revelações não deveria ter botão de aprender, apenas
-- ler. Ele possui uma magia, mas é para usar, não aprender." (usuário,
-- 13/09/2026)
--
-- O BUG. A RPC (e a tela) tratavam como pergaminho qualquer item com
-- itens.magia + itens.nivel_magia preenchidos. Mas ~50 itens mágicos guardam
-- assim a magia que CARREGAM — Livro das Revelações, anéis (Narya, Vilya…),
-- armas, o Alaúde do Sonho de Helena, a Caravela Pérola Negra — e "aprender"
-- com eles gravaria a magia no PJ e CONSUMIRIA o item.
--
-- A REGRA. No catálogo, os 286 pergaminhos são exatamente os itens do grupo
-- 'Consumíveis' com magia; nenhum outro grupo tem pergaminho. A busca do item
-- passa a exigir o grupo; qualquer outro devolve `item_nao_eh_pergaminho`.
--
-- COMO. Troca cirúrgica no corpo atual da função (uma ocorrência, conferida),
-- para não reescrever as ~150 linhas dela. Idempotente: se já tem a trava,
-- não faz nada. Permissões da função ficam como estão (CREATE OR REPLACE).
-- REVERSÍVEL: trocar de volta a linha marcada por `where i.slug = v_slug;`.
-- ============================================================

DO $$
DECLARE
  v_def  text := pg_get_functiondef('public.usar_pergaminho_magia'::regproc);
  v_alvo text := 'where i.slug = v_slug;';
  v_novo text := 'where i.slug = v_slug and i.grupo = ''Consumíveis'';  -- só consumível é pergaminho (13/09/2026)';
  v_n    int;
BEGIN
  IF position('i.grupo = ''Consumíveis''' in v_def) > 0 THEN
    RAISE NOTICE 'já aplicado';
    RETURN;
  END IF;
  v_n := (length(v_def) - length(replace(v_def, v_alvo, ''))) / length(v_alvo);
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'esperava 1 ocorrência de "%", achei %', v_alvo, v_n;
  END IF;
  EXECUTE replace(v_def, v_alvo, v_novo);
END $$;
