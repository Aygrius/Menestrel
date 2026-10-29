-- scripts/sql/animais-sem-ficha-e-log-da-loja-2026-10-05.sql
-- ============================================================================
-- A FICHA DO ANIMAL COMPRADO, E O LOG DA COMPRA NA LOJA (05/10/2026)
--
-- Pedido do usuário:
--   "O log da loja não está seguindo nosso padrão.
--    Eu comprei um cavalo, mas a ficha dele não está aparecendo."
--
-- APLICADO NO BANCO EM 05/10/2026 (projeto kaxbdpdutentlrobuqyu).
--
-- ── 1. O CAVALO SEM FICHA ───────────────────────────────────────────────────
-- O animal do inventário mostra ficha quando `itens.criatura_id` aponta para
-- uma criatura do bestiário (animaisDoPersonagem, src/07-inventario). 28 itens
-- do grupo Animais estavam com o vínculo nulo — entre eles TODOS os "de
-- Guerra", que é justamente o que o jogador compra. O caso relatado: o
-- "Andaluz de Guerra" de Lirael.
--
-- A regra do vínculo: a variante usa a criatura da BASE — é o mesmo bicho,
-- treinado para a guerra, para a caça ou para o correio ("as características
-- do Cavalo em criaturas e Cavalo em itens devem ser o mesmo", 14/09/2026). A
-- base sai do slug, não do nome: `cavalo_quarter_de_guerra` é a linha de
-- `cavalo_quarter` ("Cavalo do Rei"), e `cavalo_arabe_de_guerra`, a de
-- `cavalo_arabe` ("Cavalo Selvagem").
--
-- FICAM SEM VÍNCULO (8), porque o bestiário não tem a criatura e inventar
-- ficha de criatura é do Mestre, não deste script:
--   Cavalo Ludgrimiano e o de Guerra      — só existe o Puro-Sangue Élfico
--   Cavalo Puro-sangue Eredri e o de Guerra
--   Coelho · Pato · Porco · Raia-gigante
-- Até o Mestre criá-las no bestiário, a janela do item avisa que falta a
-- ficha, em vez de não mostrar nada (src/07-inventario/inventario.jsx).
--
-- ── 2. O LOG DA LOJA ────────────────────────────────────────────────────────
-- `comprar_item_anunciado` (comprar de outro aventureiro) escreve em mesa_log
-- no padrão da casa — "Victor comprou 2× Flecha de João por 3 moedas de
-- prata." —, mas `comprar_item` (a loja do Mestre) não escrevia NADA: a mesa
-- não via a compra. Agora escreve, com o mesmo molde e a mesma função de
-- moedas por extenso (_menestrel_moedas_texto).
--
-- IDEMPOTENTE: o vínculo só entra onde está nulo, e o enxerto no
-- comprar_item confere se o INSERT já está lá antes de reescrever a função.
-- O marcador do guard é `INSERT INTO public.mesa_log`, não só "mesa_log": a
-- função já citava mesa_log num comentário, e procurar o nome solto fazia o
-- enxerto se dar por feito sem ter acontecido.
-- ============================================================================

BEGIN;

-- ── 1. Vínculo dos 20 animais que têm criatura no bestiário ─────────────────
UPDATE public.itens i
   SET criatura_id = v.criatura_id
  FROM (VALUES
    -- Cavalos de guerra → a criatura da montaria base
    ('cavalo_andaluz_de_guerra',            160),   -- Cavalo Andaluz
    ('cavalo_ardennes_de_guerra',           187),   -- Cavalo Ardennes
    ('cavalo_quarter_de_guerra',            157),   -- Cavalo do Rei
    ('cavalo_arabe_de_guerra',              175),   -- Cavalo Selvagem (linha cavalo_arabe)
    ('cavalo_puro_sangue_elfico_de_guerra', 168),   -- Cavalo Puro-Sangue Élfico
    -- Outras montarias de guerra
    ('camelo_de_guerra',                    148),   -- Camelo Bactriano
    ('avestruz_de_guerra',                  115),   -- Avestruz Pardo
    ('elefante_de_guerra',                  206),   -- Elefante Leva
    -- Aves treinadas → a ave base
    ('falcao_treinado',                      46),   -- Falcão Peregrino
    ('falcao_de_caca',                       46),
    ('gaviao_treinado',                      49),   -- Gavião-peneira
    ('gaviao_de_caca',                       49),
    ('coruja_treinada',                      37),   -- Coruja Alba
    ('corvo_correio',                        16),   -- Corvo de Dantsem
    ('pombo_correio',                        36),   -- Pombo-das-rochas
    -- Bichos de companhia e de matilha
    ('cao_de_raca',                          66),   -- Cão Labrador
    ('raposa_treinada',                      51),   -- Raposa-vermelha
    ('lobo_alfa',                            74),   -- Lobo-cinzento
    ('lobo_beta',                            74),
    ('urso_branco',                         166)    -- Urso Polar
  ) AS v(slug, criatura_id)
 WHERE i.slug = v.slug
   AND i.criatura_id IS NULL;

-- ── 2. comprar_item passa a escrever no log da mesa ─────────────────────────
-- Enxerto antes do RETURN de sucesso, pelo mesmo caminho que
-- frascos-amuletos-venenos-2026-09-28.sql usou para a RPC do pergaminho:
-- lê a definição corrente, troca o ponto de enxerto e reexecuta.
DO $do$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.comprar_item(bigint, text, integer, text, text)'::regprocedure);
  IF position('INSERT INTO public.mesa_log' in d) = 0 THEN
    d := replace(d,
      '  RETURN jsonb_build_object(''ok'', true, ''preco_unit_final'', v_preco_unit, ''custo_total'', v_custo_total, ''negociacao'', p_negociacao);',
$novo$  -- Log da mesa (05/10/2026): a compra na loja do Mestre vira linha em
  -- mesa_log, no mesmo molde de comprar_item_anunciado. Falhar aqui não
  -- desfaz a compra: o insert é a última coisa da transação.
  INSERT INTO public.mesa_log (historia_id, autor_id, autor_nome, tipo, texto, meta)
  SELECT v_historia_id,
         auth.uid(),
         COALESCE((SELECT COALESCE(pr.full_name, pr.email, 'Jogador')
                     FROM public.profiles pr WHERE pr.id = auth.uid()), 'Jogador'),
         'item',
         COALESCE(NULLIF(split_part(pe.nome, ' ', 1), ''), 'Alguém') || ' comprou '
           || CASE WHEN p_quantidade > 1 THEN p_quantidade || '× ' ELSE '' END
           || COALESCE(v_cat.nome, v_slug)
           || ' na loja'
           || CASE WHEN v_custo_total > 0
                   THEN ' por ' || public._menestrel_moedas_texto(v_custo_total)
                   ELSE ', de graça' END
           || '.',
         jsonb_build_object('acao', 'comprar', 'loja', true,
                            'item', COALESCE(v_cat.nome, v_slug), 'slug', v_slug,
                            'quantidade', p_quantidade, 'custo_latao', v_custo_total)
    FROM public.personagens pe
   WHERE pe.id = p_pj_id;

  RETURN jsonb_build_object('ok', true, 'preco_unit_final', v_preco_unit, 'custo_total', v_custo_total, 'negociacao', p_negociacao);$novo$);
    IF position('INSERT INTO public.mesa_log' in d) = 0 THEN
      RAISE EXCEPTION 'comprar_item: ponto de enxerto do log não encontrado';
    END IF;
    EXECUTE d;
  END IF;
END
$do$;

COMMIT;

-- ── Conferência ─────────────────────────────────────────────────────────────
-- Animais ainda sem ficha (espera 8, os do cabeçalho):
--   SELECT slug, nome FROM public.itens
--    WHERE grupo = 'Animais' AND criatura_id IS NULL ORDER BY nome;
-- O log entrou na função (espera true):
--   SELECT position('INSERT INTO public.mesa_log' in pg_get_functiondef('public.comprar_item(bigint, text, integer, text, text)'::regprocedure)) > 0;
