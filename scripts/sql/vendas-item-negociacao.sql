-- scripts/sql/vendas-item-negociacao.sql
-- ============================================================
-- VENDER ITEM DO INVENTÁRIO, NEGOCIANDO COM O MESTRE.
--
-- Pedido do usuário (13/09/2026): "Adicione um botão de vender o item do
-- inventário, abrindo um modal para negociar e registrar o preço de venda. O
-- mestre poderá aceitar, recusar a proposta ou negociar."
--
-- O FLUXO. O dono do personagem propõe (quantidade + preço em latão). A vez
-- passa ao Mestre, que aceita, recusa ou contrapropõe; uma contraproposta
-- devolve a vez ao jogador, que tem as mesmas três opções — e assim por
-- diante até alguém aceitar ou recusar. O jogador pode desistir a qualquer
-- momento (cancelar).
--
-- POR QUE UMA TABELA. mesa_log é append-only e não guarda "de quem é a vez"
-- nem "qual o preço na mesa"; uma negociação de várias rodadas precisa de
-- estado. A tabela é só leitura para o cliente (RLS de SELECT, nenhuma de
-- escrita): toda mudança passa pelas RPCs, que conferem quem pode o quê. Cada
-- passo TAMBÉM grava em mesa_log, que é o que notifica a mesa (Realtime +
-- sino da Central de Mensagens).
--
-- ACEITAR É ATÔMICO (_menestrel_venda_executar): trava a linha do
-- personagem, confere que o item ainda está lá, solto (nem equipado, nem
-- vestido, nem recipiente com coisas dentro) e na quantidade negociada, tira
-- o item e deposita as moedas (inv_depositar_moeda, o mesmo depósito da
-- transferência). Sem espaço na bolsa, nada acontece e a negociação continua
-- aberta — o jogador arruma e aceita de novo.
--
-- ENQUANTO ABERTA, o item não fica preso: pode ser usado, transferido etc.
-- Quem aceita depois de o item sumir recebe `item_indisponivel`.
--
-- PERMISSÕES: EXECUTE só para authenticated (e service_role); o executor
-- interno não é exposto.
-- REVERSÍVEL: DROP das duas RPCs, do executor, do helper e da tabela.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.vendas_item (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  historia_id   bigint NOT NULL REFERENCES public.historias(id) ON DELETE CASCADE,
  pj_id         bigint NOT NULL REFERENCES public.personagens(id) ON DELETE CASCADE,
  pj_nome       text,
  instance_id   text   NOT NULL,
  slug          text   NOT NULL,
  item_nome     text,
  quantidade    bigint NOT NULL CHECK (quantidade > 0),
  valor_tabela_latao bigint,                         -- referência: itens.valor_latao × quantidade na proposta
  preco_latao   bigint NOT NULL CHECK (preco_latao > 0),   -- a oferta que está na mesa
  vez           text   NOT NULL CHECK (vez IN ('mestre', 'jogador')),
  status        text   NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'aceita', 'recusada', 'cancelada')),
  rodadas       jsonb  NOT NULL DEFAULT '[]'::jsonb, -- [{autor, acao, preco_latao, mensagem, em}]
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  concluida_em  timestamptz
);
COMMENT ON TABLE public.vendas_item IS
  'Negociação de venda de item do inventário entre o dono do PJ e o Mestre. Escrita só pelas RPCs propor_venda_item/responder_venda_item.';

-- Uma negociação aberta por instância.
CREATE UNIQUE INDEX IF NOT EXISTS vendas_item_uma_aberta
  ON public.vendas_item (pj_id, instance_id) WHERE status = 'aberta';
CREATE INDEX IF NOT EXISTS vendas_item_historia_status
  ON public.vendas_item (historia_id, status);

ALTER TABLE public.vendas_item ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vendas_item_select ON public.vendas_item;
CREATE POLICY vendas_item_select ON public.vendas_item FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.personagens p WHERE p.id = vendas_item.pj_id AND p.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.historias h WHERE h.id = vendas_item.historia_id AND h.mestre_id = auth.uid())
  );
REVOKE ALL ON public.vendas_item FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.vendas_item FROM authenticated;
GRANT SELECT ON public.vendas_item TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                  WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'vendas_item') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vendas_item;
  END IF;
END $$;

-- ── Texto das moedas: 1234 → "1 moeda de ouro, 2 de prata, 3 de cobre e 4 de latão"
CREATE OR REPLACE FUNCTION public._menestrel_moedas_texto(p_latao bigint)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_t      bigint := GREATEST(COALESCE(p_latao, 0), 0);
  v_vals   bigint[];
  v_nomes  text[] := ARRAY['ouro', 'prata', 'cobre', 'latão'];
  v_partes text[] := '{}';
  v_i      int;
  v_n      int;
BEGIN
  v_vals := ARRAY[v_t / 1000, (v_t % 1000) / 100, (v_t % 100) / 10, v_t % 10];
  FOR v_i IN 1 .. 4 LOOP
    IF v_vals[v_i] > 0 THEN
      IF array_length(v_partes, 1) IS NULL THEN
        v_partes := v_partes || (v_vals[v_i] || ' moeda' || CASE WHEN v_vals[v_i] > 1 THEN 's' ELSE '' END || ' de ' || v_nomes[v_i]);
      ELSE
        v_partes := v_partes || (v_vals[v_i] || ' de ' || v_nomes[v_i]);
      END IF;
    END IF;
  END LOOP;
  v_n := COALESCE(array_length(v_partes, 1), 0);
  IF v_n = 0 THEN RETURN 'nenhuma moeda'; END IF;
  IF v_n = 1 THEN RETURN v_partes[1]; END IF;
  RETURN array_to_string(v_partes[1:v_n - 1], ', ') || ' e ' || v_partes[v_n];
END;
$function$;

-- ── Executor da venda aceita (interno) ────────────────────────────────────
CREATE OR REPLACE FUNCTION public._menestrel_venda_executar(p_venda public.vendas_item)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_inv   jsonb;
  v_itens jsonb;
  v_inst  jsonb;
  v_idx   int := -1;
  v_i     int;
  v_qtd   bigint;
  v_dep   jsonb;
  v_p     bigint := p_venda.preco_latao;
  v_den   bigint[];
  v_slugs text[] := ARRAY['moeda_ouro', 'moeda_prata', 'moeda_cobre', 'moeda_latao'];
BEGIN
  SELECT COALESCE(inventario, '{"itens":[]}'::jsonb) INTO v_inv
    FROM public.personagens WHERE id = p_venda.pj_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'pj_nao_encontrado');
  END IF;

  v_itens := COALESCE(v_inv->'itens', '[]'::jsonb);
  FOR v_i IN 0 .. jsonb_array_length(v_itens) - 1 LOOP
    IF v_itens->v_i->>'instanceId' = p_venda.instance_id THEN
      v_idx := v_i; v_inst := v_itens->v_i; EXIT;
    END IF;
  END LOOP;

  IF v_idx < 0 OR (v_inst->>'slug') IS DISTINCT FROM p_venda.slug THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'item_indisponivel');
  END IF;
  IF COALESCE((v_inst->>'equipado')::boolean, false) OR COALESCE((v_inst->>'vestido')::boolean, false) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'item_em_uso');
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_itens) e WHERE e->>'containerId' = p_venda.instance_id) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'recipiente_com_itens');
  END IF;

  v_qtd := COALESCE((v_inst->>'quantidade')::bigint, 1);
  IF v_qtd < p_venda.quantidade THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'quantidade_indisponivel', 'disponivel', v_qtd);
  END IF;

  IF v_qtd = p_venda.quantidade THEN
    v_itens := v_itens - v_idx;
  ELSE
    v_itens := jsonb_set(v_itens, ARRAY[v_idx::text, 'quantidade'], to_jsonb(v_qtd - p_venda.quantidade));
  END IF;
  v_inv := jsonb_set(v_inv, '{itens}', v_itens);

  v_den := ARRAY[v_p / 1000, (v_p % 1000) / 100, (v_p % 100) / 10, v_p % 10];
  FOR v_i IN 1 .. 4 LOOP
    IF v_den[v_i] > 0 THEN
      v_dep := public.inv_depositar_moeda(v_inv, v_slugs[v_i], v_den[v_i]);
      IF v_dep IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'motivo', 'sem_espaco_moedas');
      END IF;
      v_inv := v_dep;
    END IF;
  END LOOP;

  UPDATE public.personagens SET inventario = v_inv WHERE id = p_venda.pj_id;
  RETURN jsonb_build_object('ok', true);
END;
$function$;
REVOKE ALL ON FUNCTION public._menestrel_venda_executar(public.vendas_item) FROM PUBLIC, anon, authenticated;

-- ── Propor (dono do PJ) ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.propor_venda_item(
  p_pj_id bigint, p_instance_id text, p_quantidade bigint, p_preco_latao bigint, p_mensagem text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_uid     uuid := auth.uid();
  v_pj      public.personagens%ROWTYPE;
  v_hist_id bigint;
  v_inst    jsonb;
  v_cat     public.itens%ROWTYPE;
  v_qtd     bigint;
  v_q       bigint;
  v_id      bigint;
  v_aberta  bigint;
  v_pj_nome text;
  v_autor   text;
  v_msg     text := left(NULLIF(trim(COALESCE(p_mensagem, '')), ''), 500);
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  SELECT * INTO v_pj FROM public.personagens WHERE id = p_pj_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'pj_nao_encontrado');
  END IF;
  IF v_pj.user_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_e_dono');
  END IF;

  SELECT id INTO v_hist_id FROM public.historias
   WHERE p_pj_id = ANY (protagonista_ids) ORDER BY created_at DESC LIMIT 1;
  IF v_hist_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_historia');
  END IF;

  IF p_preco_latao IS NULL OR p_preco_latao <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'preco_invalido');
  END IF;

  SELECT elem INTO v_inst
    FROM jsonb_array_elements(COALESCE(v_pj.inventario->'itens', '[]'::jsonb)) elem
   WHERE elem->>'instanceId' = p_instance_id
   LIMIT 1;
  IF v_inst IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'item_indisponivel');
  END IF;

  SELECT * INTO v_cat FROM public.itens WHERE slug = v_inst->>'slug';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'item_nao_existe');
  END IF;
  IF v_cat.grupo = 'Moedas' THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'moeda_nao_vende');
  END IF;
  IF COALESCE((v_inst->>'equipado')::boolean, false) OR COALESCE((v_inst->>'vestido')::boolean, false) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'item_em_uso');
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(v_pj.inventario->'itens', '[]'::jsonb)) e
              WHERE e->>'containerId' = p_instance_id) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'recipiente_com_itens');
  END IF;

  v_qtd := COALESCE((v_inst->>'quantidade')::bigint, 1);
  -- Equipável é indivisível: vende a instância inteira.
  v_q := CASE WHEN v_cat.categoria_equip IS NOT NULL THEN v_qtd ELSE COALESCE(p_quantidade, v_qtd) END;
  IF v_q < 1 OR v_q > v_qtd THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'quantidade_invalida');
  END IF;

  SELECT id INTO v_aberta FROM public.vendas_item
   WHERE pj_id = p_pj_id AND instance_id = p_instance_id AND status = 'aberta';
  IF v_aberta IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'ja_em_negociacao', 'venda_id', v_aberta);
  END IF;

  v_pj_nome := NULLIF(trim(COALESCE(v_pj.nome, '') || ' ' || COALESCE(v_pj.sobrenome, '')), '');

  BEGIN
    INSERT INTO public.vendas_item
      (historia_id, pj_id, pj_nome, instance_id, slug, item_nome, quantidade,
       valor_tabela_latao, preco_latao, vez, rodadas)
    VALUES
      (v_hist_id, p_pj_id, v_pj_nome, p_instance_id, v_cat.slug, v_cat.nome, v_q,
       COALESCE(v_cat.valor_latao, 0) * v_q, p_preco_latao, 'mestre',
       jsonb_build_array(jsonb_build_object('autor', 'jogador', 'acao', 'propor',
         'preco_latao', p_preco_latao, 'mensagem', v_msg, 'em', now())))
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'ja_em_negociacao');
  END;

  SELECT COALESCE(full_name, email, 'Jogador') INTO v_autor FROM public.profiles WHERE id = v_uid;
  INSERT INTO public.mesa_log (historia_id, autor_id, autor_nome, tipo, texto, meta)
  VALUES (v_hist_id, v_uid, v_autor, 'item',
    COALESCE(v_pj_nome, 'Um personagem') || ' quer vender '
      || CASE WHEN v_q > 1 THEN v_q || '× ' ELSE '' END || v_cat.nome
      || ' por ' || public._menestrel_moedas_texto(p_preco_latao) || '.',
    jsonb_build_object('venda_id', v_id, 'venda_acao', 'propor'));

  RETURN jsonb_build_object('ok', true, 'venda_id', v_id);
END;
$function$;

-- ── Responder (Mestre ou dono, conforme a vez) ────────────────────────────
--   aceitar       aceita a oferta que está na mesa → executa a venda
--   recusar       encerra sem venda
--   contrapropor  novo preço; a vez passa ao outro lado
--   cancelar      só o dono, a qualquer momento
CREATE OR REPLACE FUNCTION public.responder_venda_item(
  p_venda_id bigint, p_acao text, p_preco_latao bigint DEFAULT NULL, p_mensagem text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_uid       uuid := auth.uid();
  v_v         public.vendas_item%ROWTYPE;
  v_eh_mestre boolean;
  v_eh_dono   boolean;
  v_papel     text;
  v_res       jsonb;
  v_texto     text;
  v_autor     text;
  v_rodada    jsonb;
  v_quem      text;
  v_item      text;
  v_msg       text := left(NULLIF(trim(COALESCE(p_mensagem, '')), ''), 500);
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;
  IF p_acao IS NULL OR p_acao NOT IN ('aceitar', 'recusar', 'contrapropor', 'cancelar') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'acao_invalida');
  END IF;

  SELECT * INTO v_v FROM public.vendas_item WHERE id = p_venda_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'venda_nao_encontrada');
  END IF;
  IF v_v.status <> 'aberta' THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'venda_encerrada', 'status', v_v.status);
  END IF;

  v_eh_mestre := EXISTS (SELECT 1 FROM public.historias WHERE id = v_v.historia_id AND mestre_id = v_uid);
  v_eh_dono   := EXISTS (SELECT 1 FROM public.personagens WHERE id = v_v.pj_id AND user_id = v_uid);

  IF p_acao = 'cancelar' THEN
    IF NOT v_eh_dono THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
    END IF;
    v_papel := 'jogador';
  ELSIF v_v.vez = 'mestre' AND v_eh_mestre THEN
    v_papel := 'mestre';
  ELSIF v_v.vez = 'jogador' AND v_eh_dono THEN
    v_papel := 'jogador';
  ELSIF v_eh_mestre OR v_eh_dono THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_e_sua_vez');
  ELSE
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;

  v_quem := COALESCE(v_v.pj_nome, 'O personagem');
  v_item := CASE WHEN v_v.quantidade > 1 THEN v_v.quantidade || '× ' ELSE '' END || COALESCE(v_v.item_nome, v_v.slug);

  IF p_acao = 'contrapropor' THEN
    IF p_preco_latao IS NULL OR p_preco_latao <= 0 THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'preco_invalido');
    END IF;
    IF p_preco_latao = v_v.preco_latao THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'mesmo_preco');
    END IF;
    v_rodada := jsonb_build_object('autor', v_papel, 'acao', 'contrapropor',
      'preco_latao', p_preco_latao, 'mensagem', v_msg, 'em', now());
    UPDATE public.vendas_item
       SET preco_latao = p_preco_latao,
           vez = CASE WHEN v_papel = 'mestre' THEN 'jogador' ELSE 'mestre' END,
           rodadas = rodadas || jsonb_build_array(v_rodada),
           updated_at = now()
     WHERE id = v_v.id;
    v_texto := CASE WHEN v_papel = 'mestre'
      THEN 'O Mestre ofereceu ' || public._menestrel_moedas_texto(p_preco_latao) || ' por ' || v_item || ' de ' || v_quem || '.'
      ELSE v_quem || ' pediu ' || public._menestrel_moedas_texto(p_preco_latao) || ' por ' || v_item || '.' END;

  ELSIF p_acao = 'aceitar' THEN
    v_res := public._menestrel_venda_executar(v_v);
    IF NOT COALESCE((v_res->>'ok')::boolean, false) THEN
      RETURN v_res;   -- negociação continua aberta
    END IF;
    v_rodada := jsonb_build_object('autor', v_papel, 'acao', 'aceitar',
      'preco_latao', v_v.preco_latao, 'mensagem', v_msg, 'em', now());
    UPDATE public.vendas_item
       SET status = 'aceita', concluida_em = now(), updated_at = now(),
           rodadas = rodadas || jsonb_build_array(v_rodada)
     WHERE id = v_v.id;
    v_texto := v_quem || ' vendeu ' || v_item || ' por ' || public._menestrel_moedas_texto(v_v.preco_latao) || '.';

  ELSE  -- recusar | cancelar
    v_rodada := jsonb_build_object('autor', v_papel, 'acao', p_acao,
      'preco_latao', v_v.preco_latao, 'mensagem', v_msg, 'em', now());
    UPDATE public.vendas_item
       SET status = CASE WHEN p_acao = 'recusar' THEN 'recusada' ELSE 'cancelada' END,
           concluida_em = now(), updated_at = now(),
           rodadas = rodadas || jsonb_build_array(v_rodada)
     WHERE id = v_v.id;
    v_texto := CASE
      WHEN p_acao = 'cancelar' THEN v_quem || ' desistiu de vender ' || v_item || '.'
      WHEN v_papel = 'mestre'  THEN 'O Mestre recusou a venda de ' || v_item || ' de ' || v_quem || '.'
      ELSE v_quem || ' recusou a oferta do Mestre por ' || v_item || '.' END;
  END IF;

  SELECT COALESCE(full_name, email, 'Jogador') INTO v_autor FROM public.profiles WHERE id = v_uid;
  INSERT INTO public.mesa_log (historia_id, autor_id, autor_nome, tipo, texto, meta)
  VALUES (v_v.historia_id, v_uid, v_autor, 'item', v_texto,
    jsonb_build_object('venda_id', v_v.id, 'venda_acao', p_acao));

  SELECT * INTO v_v FROM public.vendas_item WHERE id = v_v.id;
  RETURN jsonb_build_object('ok', true, 'status', v_v.status, 'vez', v_v.vez, 'preco_latao', v_v.preco_latao);
END;
$function$;

REVOKE ALL ON FUNCTION public.propor_venda_item(bigint, text, bigint, bigint, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.responder_venda_item(bigint, text, bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.propor_venda_item(bigint, text, bigint, bigint, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.responder_venda_item(bigint, text, bigint, text) TO authenticated, service_role;

COMMIT;
