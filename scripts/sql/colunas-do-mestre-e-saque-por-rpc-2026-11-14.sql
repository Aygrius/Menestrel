-- AUDITORIA 13/11/2026, item 3 (docs/auditoria-batalha-inventario-2026-11-13.md).
-- A policy personagens_update_own_or_vinculado libera as 40 colunas ao dono:
-- XP, atributos, receitas, vendas_a_resgatar e moedas mudavam por PATCH direto.
--
-- Decisão do usuário (13/11/2026): gatilho de guarda. Quem NÃO é Mestre da
-- história do PJ, gravando DIRETO (PostgREST, current_user = authenticated):
--   • não muda experiencia, receitas_aprendidas nem vendas_a_resgatar;
--   • atributos *_base só SOBEM, ficam entre −2 e 6 e cabem nos pontos do
--     estágio (é o que o assistente de evolução faz — 08-personagens);
--   • não AUMENTA o valor total das moedas do inventário (itens do grupo
--     Moedas, dentro ou fora de recipiente, e a carteira legada inventario.moedas).
-- RPC SECURITY DEFINER roda como o dono da função (postgres) e passa — por
-- isso o gatilho é SECURITY INVOKER: é o current_user dele que separa as duas.
--
-- O saque da batalha pela tela do JOGADOR era a única entrada de moeda por
-- gravação direta; vira a RPC saquear_criatura (abaixo), que também grava o
-- item e a anotação `saqueado` numa transação só (item 41, lado do jogador).
-- Idempotente.

-- ── A regra dos pontos, espelho de 01-core/game-data.jsx ─────────────────
-- Saldo do assistente = pontosDisponiveis(estágio) + bonusPontosRaca(raça)
--                       − pontosGastos(base, raça)
-- e o modificador da raça se cancela: = 15 + ⌊(estágio−1)/2⌋ + TETO − Σ custo(base).
-- TETO = o valor da raça jogável mais cara (hoje 4). Os três números abaixo
-- têm teste que os compara com o game-data (colunas-do-mestre.test.js).

CREATE OR REPLACE FUNCTION public._menestrel_custo_atributo(v integer)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path TO 'public', 'pg_catalog' AS $$
  SELECT CASE v WHEN -2 THEN -1 WHEN -1 THEN -0.5 WHEN 0 THEN 0 WHEN 1 THEN 1 WHEN 2 THEN 3
                WHEN 3 THEN 6 WHEN 4 THEN 10 WHEN 5 THEN 15 WHEN 6 THEN 21 ELSE 0 END::numeric
$$;

-- _menestrel_estagio(p_xp) já existe no banco (mesma tabela de 01-core/game-data.jsx) e é reaproveitada.

CREATE OR REPLACE FUNCTION public._menestrel_pontos_atributo_total(xp integer)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path TO 'public', 'pg_catalog' AS $$
  SELECT (15 + (public._menestrel_estagio(xp) - 1) / 2 + 4 /* TETO racial */)::numeric
$$;

-- Valor das moedas em latão: itens do grupo Moedas (em qualquer lugar do
-- inventário) + a carteira legada { ouro, prata, cobre, latao }.
CREATE OR REPLACE FUNCTION public._menestrel_valor_moedas(inv jsonb)
RETURNS numeric LANGUAGE sql STABLE SET search_path TO 'public', 'pg_catalog' AS $$
  SELECT COALESCE((
    SELECT sum(COALESCE(i.valor_latao, 0)
               * CASE WHEN jsonb_typeof(it->'quantidade') = 'number' THEN (it->>'quantidade')::numeric ELSE 1 END)
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(inv->'itens') = 'array' THEN inv->'itens' ELSE '[]'::jsonb END) it
      JOIN public.itens i ON i.slug = it->>'slug' AND i.grupo = 'Moedas'
  ), 0)
  + CASE WHEN jsonb_typeof(inv->'moedas') = 'object' THEN
      COALESCE(CASE WHEN jsonb_typeof(inv->'moedas'->'ouro')  = 'number' THEN (inv->'moedas'->>'ouro')::numeric  END, 0) * 1000
    + COALESCE(CASE WHEN jsonb_typeof(inv->'moedas'->'prata') = 'number' THEN (inv->'moedas'->>'prata')::numeric END, 0) * 100
    + COALESCE(CASE WHEN jsonb_typeof(inv->'moedas'->'cobre') = 'number' THEN (inv->'moedas'->>'cobre')::numeric END, 0) * 10
    + COALESCE(CASE WHEN jsonb_typeof(inv->'moedas'->'latao') = 'number' THEN (inv->'moedas'->>'latao')::numeric END, 0)
    ELSE 0 END
$$;

-- Quem chama é Mestre de uma história em que o PJ joga?
CREATE OR REPLACE FUNCTION public._menestrel_eh_mestre_do_pj(p_pj_id bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_catalog' AS $$
  SELECT EXISTS (SELECT 1 FROM public.historias h
                  WHERE h.mestre_id = auth.uid() AND p_pj_id = ANY (h.protagonista_ids))
$$;
REVOKE EXECUTE ON FUNCTION public._menestrel_eh_mestre_do_pj(bigint) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public._menestrel_eh_mestre_do_pj(bigint) TO authenticated;

-- ── O gatilho ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._menestrel_personagem_colunas_do_mestre()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public', 'pg_catalog' AS $$
DECLARE
  v_antes  integer[];
  v_depois integer[];
  v_i      integer;
  v_gasto  numeric := 0;
BEGIN
  -- Só a gravação direta do app. RPC (definer), service_role e SQL passam.
  IF current_user NOT IN ('authenticated', 'anon') THEN RETURN NEW; END IF;
  IF public._menestrel_eh_mestre_do_pj(NEW.id) THEN RETURN NEW; END IF;

  IF NEW.experiencia IS DISTINCT FROM OLD.experiencia
     OR NEW.receitas_aprendidas IS DISTINCT FROM OLD.receitas_aprendidas
     OR NEW.vendas_a_resgatar IS DISTINCT FROM OLD.vendas_a_resgatar THEN
    RAISE EXCEPTION 'coluna_so_mestre' USING errcode = 'P0001',
      hint = 'Experiência, receitas e vendas a resgatar só mudam pelo Mestre ou pelo jogo.';
  END IF;

  v_antes  := ARRAY[OLD.intelecto_base, OLD.aura_base, OLD.carisma_base, OLD.forca_base,
                    OLD.fisico_base, OLD.agilidade_base, OLD.percepcao_base];
  v_depois := ARRAY[NEW.intelecto_base, NEW.aura_base, NEW.carisma_base, NEW.forca_base,
                    NEW.fisico_base, NEW.agilidade_base, NEW.percepcao_base];
  IF v_antes IS DISTINCT FROM v_depois THEN
    FOR v_i IN 1 .. 7 LOOP
      IF COALESCE(v_depois[v_i], 0) < COALESCE(v_antes[v_i], 0)
         OR COALESCE(v_depois[v_i], 0) NOT BETWEEN -2 AND 6 THEN
        RAISE EXCEPTION 'atributo_invalido' USING errcode = 'P0001',
          hint = 'Na evolução, atributo só sobe, e vai de −2 a 6.';
      END IF;
      v_gasto := v_gasto + public._menestrel_custo_atributo(COALESCE(v_depois[v_i], 0));
    END LOOP;
    IF v_gasto > public._menestrel_pontos_atributo_total(NEW.experiencia) THEN
      RAISE EXCEPTION 'atributos_sem_pontos' USING errcode = 'P0001',
        hint = 'Os atributos passam dos pontos do estágio.';
    END IF;
  END IF;

  IF NEW.inventario IS DISTINCT FROM OLD.inventario
     AND public._menestrel_valor_moedas(NEW.inventario) > public._menestrel_valor_moedas(OLD.inventario) THEN
    RAISE EXCEPTION 'moedas_so_mestre' USING errcode = 'P0001',
      hint = 'Moeda só entra pelo Mestre ou pelo jogo (loja, venda, saque).';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS personagens_colunas_do_mestre ON public.personagens;
CREATE TRIGGER personagens_colunas_do_mestre
  BEFORE UPDATE ON public.personagens
  FOR EACH ROW EXECUTE FUNCTION public._menestrel_personagem_colunas_do_mestre();

-- ── O saque pela RPC ─────────────────────────────────────────────────────
-- "Verdadeiro" de JS para um valor do participante (true, 1, 'x', objeto…).
CREATE OR REPLACE FUNCTION public._menestrel_js_verdade(v jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public', 'pg_catalog' AS $$
  SELECT CASE
    WHEN v IS NULL OR jsonb_typeof(v) = 'null' THEN false
    WHEN jsonb_typeof(v) = 'boolean' THEN v::text = 'true'
    WHEN jsonb_typeof(v) = 'number'  THEN (v::text)::numeric <> 0
    WHEN jsonb_typeof(v) = 'string'  THEN v #>> '{}' <> ''
    ELSE true END
$$;

-- posValida + distanciaBordas de 12-batalha/tabuleiro.jsx (tabuleiro 60×44,
-- token 2×2). NULL quando algum dos dois está fora do tabuleiro.
CREATE OR REPLACE FUNCTION public._menestrel_distancia_tabuleiro(a jsonb, b jsonb)
RETURNS integer LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public', 'pg_catalog' AS $$
DECLARE ax numeric; ay numeric; bx numeric; by_ numeric;
BEGIN
  IF jsonb_typeof(a->'pos'->'x') IS DISTINCT FROM 'number' OR jsonb_typeof(a->'pos'->'y') IS DISTINCT FROM 'number'
     OR jsonb_typeof(b->'pos'->'x') IS DISTINCT FROM 'number' OR jsonb_typeof(b->'pos'->'y') IS DISTINCT FROM 'number' THEN
    RETURN NULL;
  END IF;
  ax := (a->'pos'->>'x')::numeric; ay := (a->'pos'->>'y')::numeric;
  bx := (b->'pos'->>'x')::numeric; by_ := (b->'pos'->>'y')::numeric;
  IF ax <> trunc(ax) OR ay <> trunc(ay) OR bx <> trunc(bx) OR by_ <> trunc(by_)
     OR ax < 0 OR ax + 2 > 60 OR ay < 0 OR ay + 2 > 44
     OR bx < 0 OR bx + 2 > 60 OR by_ < 0 OR by_ + 2 > 44 THEN
    RETURN NULL;
  END IF;
  RETURN GREATEST(GREATEST(0, abs(ax - bx) - 1), GREATEST(0, abs(ay - by_) - 1))::integer;
END $$;

CREATE OR REPLACE FUNCTION public.saquear_criatura(
  p_batalha_id bigint, p_pj_id bigint, p_alvo_inst_id text, p_slug text, p_qtd integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_catalog' AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_bat     public.batalhas%ROWTYPE;
  v_parts   jsonb;
  v_sq      jsonb;
  v_alvo    jsonb;
  v_alvo_ix integer;
  v_dono    uuid;
  v_mestre  uuid;
  v_cat     public.itens%ROWTYPE;
  v_total   numeric;
  v_tirado  numeric;
  v_dist    integer;
  v_inv     jsonb;
  v_itens   jsonb;
  v_ix      integer := -1;
  v_it      jsonb;
  v_i       integer;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao'); END IF;
  IF p_qtd IS NULL OR p_qtd < 1 THEN RETURN jsonb_build_object('ok', false, 'motivo', 'quantidade_invalida'); END IF;

  SELECT * INTO v_bat FROM public.batalhas WHERE id = p_batalha_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'motivo', 'batalha_nao_encontrada'); END IF;
  IF v_bat.estado <> 'ativa' THEN RETURN jsonb_build_object('ok', false, 'motivo', 'batalha_nao_ativa'); END IF;
  -- No treino nada vai ao banco: a tela resolve o saque no cache dela.
  IF COALESCE(v_bat.treinamento, false) THEN RETURN jsonb_build_object('ok', false, 'motivo', 'treino'); END IF;

  SELECT user_id INTO v_dono FROM public.personagens WHERE id = p_pj_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'motivo', 'pj_nao_encontrado'); END IF;
  SELECT mestre_id INTO v_mestre FROM public.historias WHERE id = v_bat.historia_id;
  IF v_dono IS DISTINCT FROM v_uid AND v_mestre IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;

  v_parts := COALESCE(v_bat.participantes, '[]'::jsonb);
  SELECT value INTO v_sq FROM jsonb_array_elements(v_parts)
   WHERE value->>'tipo' = 'pj' AND value->>'ref_id' = p_pj_id::text LIMIT 1;
  SELECT value, (ord - 1)::int INTO v_alvo, v_alvo_ix
    FROM jsonb_array_elements(v_parts) WITH ORDINALITY AS x(value, ord)
   WHERE value->>'inst_id' = p_alvo_inst_id LIMIT 1;

  -- podeSaquear (12-batalha/batalha.jsx).
  IF v_sq IS NULL OR v_alvo IS NULL OR v_alvo->>'tipo' IS DISTINCT FROM 'criatura'
     OR public._menestrel_js_verdade(v_alvo->'ficha_invocada')
     OR COALESCE(NULLIF(v_sq->>'status', ''), 'ativo') <> 'ativo'
     OR public._menestrel_js_verdade(v_sq->'ausente') OR public._menestrel_js_verdade(v_sq->'fugiu')
     OR NOT public._menestrel_js_verdade(v_sq->'atual')
     OR COALESCE(NULLIF(v_alvo->>'status', ''), 'ativo') NOT IN ('morto', 'desmaiado')
     OR public._menestrel_js_verdade(v_alvo->'ausente') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_pode_saquear');
  END IF;
  v_dist := public._menestrel_distancia_tabuleiro(v_sq, v_alvo);
  IF v_dist IS NOT NULL AND v_dist > 1 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_pode_saquear');
  END IF;

  SELECT * INTO v_cat FROM public.itens WHERE slug = p_slug;
  IF NOT FOUND OR COALESCE(v_cat.grupo_armas, '') = 'Livre' THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'item_nao_saqueavel');
  END IF;

  -- saqueDisponivel (09-bestiario/criatura-formulas.jsx): a mochila conta a
  -- quantidade; o resto conta um.
  SELECT COALESCE(sum(CASE WHEN e->>'slot' = 'mochila'
                           THEN GREATEST(1, COALESCE(trunc(CASE WHEN jsonb_typeof(e->'qtd') = 'number'
                                                                THEN (e->>'qtd')::numeric END), 1))
                           ELSE 1 END), 0)
    INTO v_total
    FROM public.criaturas c,
         jsonb_array_elements(CASE WHEN jsonb_typeof(c.equipamento) = 'array' THEN c.equipamento ELSE '[]'::jsonb END) e
   WHERE c.id = (v_alvo->>'ref_id')::bigint AND e->>'slug' = p_slug;
  v_tirado := COALESCE(CASE WHEN jsonb_typeof(v_alvo->'saqueado'->p_slug) = 'number'
                            THEN (v_alvo->'saqueado'->>p_slug)::numeric END, 0);
  IF v_total - v_tirado < p_qtd THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'saque_esgotado', 'resta', GREATEST(0, v_total - v_tirado));
  END IF;

  -- adicionarAoInventario (01-core/inventario-helpers.jsx): soma na pilha
  -- solta igual — fora de recipiente, slot, corpo, loja e animal — ou cria.
  SELECT COALESCE(inventario, '{"itens":[]}'::jsonb) INTO v_inv
    FROM public.personagens WHERE id = p_pj_id FOR UPDATE;
  v_itens := CASE WHEN jsonb_typeof(v_inv->'itens') = 'array' THEN v_inv->'itens' ELSE '[]'::jsonb END;
  FOR v_i IN 0 .. jsonb_array_length(v_itens) - 1 LOOP
    v_it := v_itens->v_i;
    IF v_it->>'slug' = p_slug
       AND NOT public._menestrel_js_verdade(v_it->'containerId')
       AND NOT public._menestrel_js_verdade(v_it->'slot')
       AND NOT public._menestrel_js_verdade(v_it->'equipado')
       AND NOT public._menestrel_js_verdade(v_it->'vestido')
       AND NOT public._menestrel_js_verdade(v_it->'anuncio_id')
       AND NOT public._menestrel_js_verdade(v_it->'animal_id') THEN
      v_ix := v_i; EXIT;
    END IF;
  END LOOP;
  IF v_ix >= 0 THEN
    v_itens := jsonb_set(v_itens, ARRAY[v_ix::text, 'quantidade'],
      to_jsonb(COALESCE(CASE WHEN jsonb_typeof(v_itens->v_ix->'quantidade') = 'number'
                             THEN (v_itens->v_ix->>'quantidade')::numeric END, 0) + p_qtd));
  ELSE
    v_itens := v_itens || jsonb_build_array(jsonb_build_object(
      'instanceId', (extract(epoch FROM clock_timestamp()) * 1000)::bigint::text
                    || '-' || substr(md5(random()::text), 1, 6),
      'slug', p_slug, 'quantidade', p_qtd, 'equipado', false,
      'slot', NULL, 'containerId', NULL, 'observacao', NULL));
  END IF;
  UPDATE public.personagens SET inventario = jsonb_set(v_inv, '{itens}', v_itens) WHERE id = p_pj_id;

  -- anotarSaque: o que saiu fica NA INSTÂNCIA, na mesma transação.
  v_parts := jsonb_set(v_parts, ARRAY[v_alvo_ix::text, 'saqueado'],
    COALESCE(CASE WHEN jsonb_typeof(v_alvo->'saqueado') = 'object' THEN v_alvo->'saqueado' END, '{}'::jsonb)
      || jsonb_build_object(p_slug, v_tirado + p_qtd), true);
  UPDATE public.batalhas SET participantes = v_parts WHERE id = p_batalha_id;

  RETURN jsonb_build_object('ok', true, 'saqueado', v_parts->v_alvo_ix->'saqueado');
END $$;

REVOKE EXECUTE ON FUNCTION public.saquear_criatura(bigint, bigint, text, text, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.saquear_criatura(bigint, bigint, text, text, integer) TO authenticated;
-- As auxiliares do gatilho ficam com o EXECUTE padrão: o gatilho é INVOKER e
-- roda como `authenticated`. Revogar quebraria toda gravação de inventário.
