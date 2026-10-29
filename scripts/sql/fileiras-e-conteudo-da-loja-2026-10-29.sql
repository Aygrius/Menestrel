-- ============================================================
-- FILEIRAS DE DEZ E ITENS COM RECHEIO (29/10/2026)
-- ============================================================
-- Dois pedidos do usuário, um por função:
--
-- 1) "A cada 10 slots de uma loja, eu tenho como abrir ou fechar a loja. Por
--    exemplo, do item 1 ao item 10 eu posso abrir para os personagens comprar,
--    e fechar do item 11 ao 60. Cada divisão dessa deve ter uma etiqueta
--    informando se está aberta ou fechada para compra."
--
--    O comércio ganha `fileiras`: um booleano por fileira de 10 itens, na
--    ordem de `itens`. Ausente ou true = ABERTA — é por isso que nenhuma loja
--    existente muda de comportamento com este script. Só `false` fecha.
--
--    A trava vive em estoque_loja_flat, e não em get_loja_pj, porque o
--    comprar_item procura a entrada NO ACHATADO: fechar a fileira some do
--    balcão E recusa a compra de quem tiver o entryId na mão (seria o furo
--    óbvio — o item desaparece da tela mas a RPC continua vendendo).
--
--    E a fileira de um item sai da CASA dele, não da posição no array: "preciso
--    ter permissão para mudar o item de casa na loja, para dizer em qual linha
--    ele está" (usuário, no mesmo dia). O item ganhou `casa`, a grade do Mestre
--    virou esparsa e mover TROCA com quem estiver lá — assim nenhuma outra peça
--    muda de fileira de carona. Item sem `casa` é dado antigo e vale a posição,
--    nos dois lados.
--
-- 2) "Torne possível vender itens na loja que tenham itens armazenados dentro
--    deles, por exemplo uma algibeira sempre de moedas."
--
--    A entrada ganha `conteudo: [{ slug, quantidade }]`. Na compra, o
--    recipiente entra no inventário e cada item do recheio entra junto, com
--    `containerId` apontando para a instância recém-criada — exatamente a
--    forma que o inventário já usa para "estar dentro de".
--
--    O PREÇO SOMA O RECHEIO quando o Mestre não escreveu um override. Sem
--    isso, uma algibeira com 100 moedas de ouro sairia pelo preço da
--    algibeira, e o jogador nem precisaria trapacear para imprimir dinheiro.
--    Espelha precoDaEntrada (src/01-core/inventario-helpers.jsx) — as duas
--    contas têm de dar o mesmo número, senão a vitrine mostra um preço e o
--    servidor cobra outro.
--
--    Com recheio, cada unidade é uma INSTÂNCIA (nunca empilha): duas
--    algibeiras cheias são dois pacotes, cada um com o seu conteúdo dentro.
--
-- NÃO aplicado em produção ainda — aguardando o OK do usuário.
-- ============================================================

-- ── 1) O ACHATADO RESPEITA A FILEIRA FECHADA ────────────────────────────────
CREATE OR REPLACE FUNCTION public.estoque_loja_flat(raw jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN jsonb_typeof(raw) = 'object' AND raw ? 'comercios'
    THEN (
      SELECT jsonb_agg(it.item ORDER BY cm.ord, it.ord)
      FROM jsonb_array_elements(raw -> 'comercios') WITH ORDINALITY AS cm(c, ord)
      CROSS JOIN jsonb_array_elements(cm.c -> 'itens') WITH ORDINALITY AS it(item, ord)
      WHERE (cm.c ->> 'ativo')::boolean IS NOT FALSE
        -- `->>` devolve texto ('true'/'false') ou NULL quando a loja não tem
        -- `fileiras` ou a fileira nunca foi tocada: só a palavra 'false' fecha.
        --
        -- A FILEIRA SAI DA CASA DO ITEM (`casa`), e não da posição dele no
        -- array: desde 29/10/2026 o Mestre muda o item de casa ("preciso ter
        -- permissão para mudar o item de casa na loja, para dizer em qual
        -- linha ele está"), e a grade dele é esparsa. Item sem `casa` é dado
        -- antigo e vale a posição, que é o que o cliente também assume
        -- (estCasaDoItem, 06-historias/estoque-mestre.jsx); o cliente carimba
        -- a casa de todos no primeiro salvamento, então o par nunca se mistura.
        AND (cm.c -> 'fileiras' ->> (COALESCE(NULLIF(it.item ->> 'casa', '')::int, (it.ord - 1)::int) / 10)) IS DISTINCT FROM 'false'
    )
    WHEN jsonb_typeof(raw) = 'array' THEN raw
    ELSE '[]'::jsonb
  END
$function$;

-- ── 2) A COMPRA ENTREGA O RECHEIO E COBRA POR ELE ───────────────────────────
CREATE OR REPLACE FUNCTION public.comprar_item(p_pj_id bigint, p_entry_id text, p_quantidade integer, p_container_id text DEFAULT NULL::text, p_negociacao text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_historia_id      bigint;
  v_estoque_raw      jsonb;
  v_estoque_flat     jsonb;
  v_entrada          jsonb;
  v_idx              int := -1;
  v_i                int;
  v_slug             text;
  v_cat              public.itens%ROWTYPE;
  v_preco_unit       bigint;
  v_custo_total      bigint;
  v_inventario       jsonb;
  v_moedas           jsonb;
  v_itens            jsonb;
  v_total_latao      bigint;
  v_capacidade       numeric := 0;
  v_usado            numeric := 0;
  v_it               jsonb;
  v_fc_ocupa         numeric;
  v_fc_armazena      numeric;
  v_ocupa_compra     numeric;
  v_eh_container     boolean;
  v_equipavel        boolean;
  v_inst             jsonb;
  v_novo_inventario  jsonb;
  v_novo_estoque_raw jsonb;
  v_estoque_atual    int;
  v_stack_idx        int;
  v_exige_recip      boolean;
  v_item_tipo        text;
  v_target_container text;
  v_cont_slug        text;
  v_cont_armazena    numeric;
  v_cont_tipo        text;
  v_cont_usado       numeric := 0;
  v_grupo            text;
  v_val              bigint;
  v_w_1000           bigint := 0;
  v_w_100            bigint := 0;
  v_w_10             bigint := 0;
  v_w_1              bigint := 0;
  v_take_1000        bigint := 0;
  v_take_100         bigint := 0;
  v_take_10          bigint := 0;
  v_take_1           bigint := 0;
  v_need             bigint;
  v_rem_1000         bigint;
  v_rem_100          bigint;
  v_rem_10           bigint;
  v_rem_1            bigint;
  v_itens_novo       jsonb := '[]'::jsonb;
  v_qtd              bigint;
  v_take             bigint;
  -- Para atualizar o estoque no formato novo (comercios)
  v_formato_novo     boolean := false;
  v_com_idx          int;
  v_it_idx           int;
  v_comercio         jsonb;
  v_com_itens        jsonb;
  -- O recheio do pacote (29/10/2026)
  v_conteudo         jsonb := '[]'::jsonb;
  v_tem_conteudo     boolean := false;
  v_conteudo_valor   bigint := 0;
  v_conteudo_ocupa   numeric := 0;
  v_inst_id          text;
  v_c                int;
BEGIN
  -- Fase 4.1 (migration 020): negociação opcional (teste de Negociar,
  -- dificuldade média, rolado no CLIENTE e registrado na mesa_log).
  IF p_negociacao IS NOT NULL AND p_negociacao NOT IN ('sucesso', 'falha') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'negociacao_invalida');
  END IF;

  IF p_quantidade IS NULL OR p_quantidade < 1 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'quantidade_invalida');
  END IF;
  IF p_entry_id IS NULL OR p_entry_id = '' THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'entry_id_invalido');
  END IF;

  -- Trava a história
  SELECT id, COALESCE(estoque_loja, '[]'::jsonb)
    INTO v_historia_id, v_estoque_raw
    FROM public.historias
    WHERE p_pj_id = ANY(protagonista_ids)
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;
  IF v_historia_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_historia');
  END IF;

  -- Detecta formato
  v_formato_novo := jsonb_typeof(v_estoque_raw) = 'object'
                    AND v_estoque_raw ? 'comercios';

  /* Achata para busca e validação — e é AQUI que a fileira fechada trava a
     compra: estoque_loja_flat não devolve o item da fileira fechada, então ele
     cai no 'item_nao_listado' logo abaixo, mesmo que o jogador tenha o entryId
     guardado de quando a fileira estava aberta (29/10/2026). */
  v_estoque_flat := public.estoque_loja_flat(v_estoque_raw);
  IF v_estoque_flat IS NULL THEN
    v_estoque_flat := '[]'::jsonb;
  END IF;

  -- Acha a entrada no array flat
  FOR v_i IN 0 .. (jsonb_array_length(v_estoque_flat) - 1) LOOP
    IF v_estoque_flat->v_i->>'entryId' = p_entry_id THEN
      v_idx := v_i; v_entrada := v_estoque_flat->v_i; EXIT;
    END IF;
  END LOOP;
  IF v_idx < 0 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'item_nao_listado');
  END IF;

  v_slug := v_entrada->>'slug';

  SELECT * INTO v_cat FROM public.itens WHERE slug = v_slug;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'item_nao_existe');
  END IF;

  v_eh_container := v_cat.armazena IS NOT NULL AND v_cat.armazena > 0;
  v_equipavel    := v_cat.categoria_equip IS NOT NULL;
  v_item_tipo    := COALESCE(v_cat.tipo, 'S');
  v_exige_recip  := (v_cat.grupo = 'Consumíveis') OR (v_cat.grupo = 'Moedas');

  /* ── O RECHEIO (29/10/2026) ───────────────────────────────────────────────
     Só recipiente carrega recheio: `conteudo` em item que não armazena nada é
     ignorado de propósito, para o preço e a entrega contarem a mesma história.
     O peso do recheio tem de caber no `armazena` do recipiente — o painel do
     Mestre já não deixa passar, e aqui é a trava que vale. */
  IF v_eh_container AND jsonb_typeof(v_entrada->'conteudo') = 'array' THEN
    v_conteudo := v_entrada->'conteudo';
  END IF;
  v_tem_conteudo := jsonb_array_length(v_conteudo) > 0;

  IF v_tem_conteudo THEN
    SELECT COALESCE(sum(COALESCE(i2.valor_latao, 0) * GREATEST(1, COALESCE((c->>'quantidade')::bigint, 1))), 0),
           COALESCE(sum(COALESCE(i2.ocupa, 0)       * GREATEST(1, COALESCE((c->>'quantidade')::numeric, 1))), 0)
      INTO v_conteudo_valor, v_conteudo_ocupa
      FROM jsonb_array_elements(v_conteudo) c
      LEFT JOIN public.itens i2 ON i2.slug = c->>'slug';

    IF v_conteudo_ocupa > COALESCE(v_cat.armazena, 0) + 0.0001 THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'conteudo_nao_cabe',
        'ocupa', v_conteudo_ocupa, 'armazena', COALESCE(v_cat.armazena, 0));
    END IF;
  END IF;

  IF p_container_id IS NOT NULL AND p_container_id <> ''
     AND NOT v_equipavel AND NOT v_eh_container THEN
    v_target_container := p_container_id;
  ELSE
    v_target_container := NULL;
  END IF;

  IF v_exige_recip AND v_target_container IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'recipiente_obrigatorio');
  END IF;

  IF v_entrada->>'estoque' IS NOT NULL THEN
    v_estoque_atual := (v_entrada->>'estoque')::int;
    IF v_estoque_atual < p_quantidade THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'estoque_insuficiente');
    END IF;
  END IF;

  /* O preço sugerido soma o recheio; o override do Mestre vence tudo, inclusive
     para dar o pacote de graça. Espelho de precoDaEntrada no cliente. */
  v_preco_unit := COALESCE(NULLIF(v_entrada->>'preco_latao_override', '')::bigint,
                           COALESCE(v_cat.valor_latao, 0) + v_conteudo_valor);
  IF v_preco_unit IS NULL THEN v_preco_unit := 0; END IF;
  -- Negociação POR UNIDADE, floor (jogador vence) — espelho EXATO de
  -- precoCompraNegociada (inventario-helpers.jsx): sucesso 75%, falha 125%.
  -- Item GRATUITO não negocia (exceção do usuário).
  IF p_negociacao IS NOT NULL AND v_preco_unit > 0 THEN
    IF p_negociacao = 'sucesso' THEN v_preco_unit := floor(v_preco_unit * 0.75)::bigint;
    ELSE                             v_preco_unit := floor(v_preco_unit * 1.25)::bigint;
    END IF;
  END IF;
  v_custo_total := v_preco_unit * p_quantidade;

  SELECT COALESCE(inventario, '{"itens":[]}'::jsonb)
    INTO v_inventario
    FROM public.personagens
    WHERE id = p_pj_id
    FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'pj_nao_encontrado');
  END IF;

  /* TRÊS ANIMAIS POR PERSONAGEM (05/10/2026, regra do usuário): "com um
     limite de 3 animais por personagem, cada ganha uma ficha própria". Conta
     por INSTÂNCIA (dois cavalos são dois animais) e só no grupo Animais. Aqui
     embaixo de propósito: é a primeira linha depois de v_inventario estar
     carregado — mais acima a conta daria zero sempre. */
  IF v_cat.grupo = 'Animais' THEN
    DECLARE v_animais int;
    BEGIN
      SELECT coalesce(sum(greatest(1, coalesce((it->>'quantidade')::int, 1))), 0) INTO v_animais
        FROM jsonb_array_elements(coalesce(v_inventario->'itens', '[]'::jsonb)) it
        JOIN public.itens i2 ON i2.slug = it->>'slug'
       WHERE i2.grupo = 'Animais';
      IF v_animais + p_quantidade > 3 THEN
        RETURN jsonb_build_object('ok', false, 'motivo', 'animais_demais',
          'animais', v_animais, 'limite', 3);
      END IF;
    END;
  END IF;

  v_moedas := v_inventario->'moedas';
  v_itens  := COALESCE(v_inventario->'itens', '[]'::jsonb);

  IF jsonb_array_length(v_itens) > 0 THEN
    FOR v_i IN 0 .. (jsonb_array_length(v_itens) - 1) LOOP
      v_it := v_itens->v_i;
      SELECT grupo, valor_latao INTO v_grupo, v_val
        FROM public.itens WHERE slug = v_it->>'slug';
      IF v_grupo = 'Moedas' THEN
        v_qtd := COALESCE((v_it->>'quantidade')::bigint, 0);
        IF    v_val = 1000 THEN v_w_1000 := v_w_1000 + v_qtd;
        ELSIF v_val = 100  THEN v_w_100  := v_w_100  + v_qtd;
        ELSIF v_val = 10   THEN v_w_10   := v_w_10   + v_qtd;
        ELSIF v_val = 1    THEN v_w_1    := v_w_1    + v_qtd;
        END IF;
      END IF;
    END LOOP;
  END IF;

  v_total_latao := v_w_1000*1000 + v_w_100*100 + v_w_10*10 + v_w_1*1;

  IF v_custo_total > 0 AND v_total_latao < v_custo_total THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'moedas_insuficientes',
      'custo_latao', v_custo_total, 'total_latao', v_total_latao);
  END IF;

  IF v_custo_total > 0 THEN
    v_need := v_custo_total;
    v_take_1000 := LEAST(v_need / 1000, v_w_1000); v_need := v_need - v_take_1000*1000;
    v_take_100  := LEAST(v_need / 100,  v_w_100);  v_need := v_need - v_take_100*100;
    v_take_10   := LEAST(v_need / 10,   v_w_10);   v_need := v_need - v_take_10*10;
    v_take_1    := LEAST(v_need / 1,    v_w_1);    v_need := v_need - v_take_1*1;
    IF v_need <> 0 THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'moedas_nao_fecham',
        'custo_latao', v_custo_total, 'total_latao', v_total_latao);
    END IF;
  END IF;

  IF jsonb_array_length(v_itens) > 0 THEN
    FOR v_i IN 0 .. (jsonb_array_length(v_itens) - 1) LOOP
      v_it := v_itens->v_i;
      SELECT ocupa, armazena INTO v_fc_ocupa, v_fc_armazena
        FROM public.itens WHERE slug = v_it->>'slug';
      IF v_fc_armazena IS NOT NULL AND v_fc_armazena > 0 THEN
        v_capacidade := v_capacidade + v_fc_armazena * COALESCE((v_it->>'quantidade')::numeric, 1);
      ELSIF (v_it->>'containerId') IS NULL THEN
        IF v_fc_ocupa IS NOT NULL THEN
          v_usado := v_usado + v_fc_ocupa * COALESCE((v_it->>'quantidade')::numeric, 1);
        END IF;
      END IF;
    END LOOP;
  END IF;

  v_ocupa_compra := COALESCE(v_cat.ocupa, 0) * p_quantidade;

  IF v_target_container IS NOT NULL THEN
    v_cont_slug  := NULL; v_cont_usado := 0;
    IF jsonb_array_length(v_itens) > 0 THEN
      FOR v_i IN 0 .. (jsonb_array_length(v_itens) - 1) LOOP
        v_it := v_itens->v_i;
        IF v_it->>'instanceId' = v_target_container THEN
          v_cont_slug := v_it->>'slug';
        END IF;
        IF (v_it->>'containerId') = v_target_container THEN
          SELECT ocupa INTO v_fc_ocupa FROM public.itens WHERE slug = v_it->>'slug';
          IF v_fc_ocupa IS NOT NULL THEN
            v_cont_usado := v_cont_usado + v_fc_ocupa * COALESCE((v_it->>'quantidade')::numeric, 1);
          END IF;
        END IF;
      END LOOP;
    END IF;

    IF v_cont_slug IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'recipiente_invalido');
    END IF;

    SELECT armazena, tipo INTO v_cont_armazena, v_cont_tipo
      FROM public.itens WHERE slug = v_cont_slug;
    IF v_cont_armazena IS NULL OR v_cont_armazena <= 0 THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'recipiente_invalido');
    END IF;
    IF COALESCE(v_cont_tipo, 'S') <> v_item_tipo THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'tipo_incompativel');
    END IF;
    IF v_ocupa_compra > GREATEST(0, v_cont_armazena - v_cont_usado) THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'espaco_insuficiente',
        'ocupa', v_ocupa_compra, 'livre', GREATEST(0, v_cont_armazena - v_cont_usado));
    END IF;

  ELSIF NOT v_eh_container THEN
    IF v_ocupa_compra > GREATEST(0, v_capacidade - v_usado) THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'espaco_insuficiente',
        'ocupa', v_ocupa_compra, 'livre', GREATEST(0, v_capacidade - v_usado));
    END IF;
  END IF;

  -- Débito das moedas
  v_rem_1000 := v_take_1000; v_rem_100 := v_take_100;
  v_rem_10   := v_take_10;   v_rem_1   := v_take_1;

  IF jsonb_array_length(v_itens) > 0 THEN
    FOR v_i IN 0 .. (jsonb_array_length(v_itens) - 1) LOOP
      v_it := v_itens->v_i;
      SELECT grupo, valor_latao INTO v_grupo, v_val
        FROM public.itens WHERE slug = v_it->>'slug';

      IF v_grupo = 'Moedas' THEN
        v_qtd  := COALESCE((v_it->>'quantidade')::bigint, 0);
        v_take := 0;
        IF    v_val = 1000 AND v_rem_1000 > 0 THEN v_take := LEAST(v_qtd, v_rem_1000); v_rem_1000 := v_rem_1000 - v_take;
        ELSIF v_val = 100  AND v_rem_100  > 0 THEN v_take := LEAST(v_qtd, v_rem_100);  v_rem_100  := v_rem_100  - v_take;
        ELSIF v_val = 10   AND v_rem_10   > 0 THEN v_take := LEAST(v_qtd, v_rem_10);   v_rem_10   := v_rem_10   - v_take;
        ELSIF v_val = 1    AND v_rem_1    > 0 THEN v_take := LEAST(v_qtd, v_rem_1);    v_rem_1    := v_rem_1    - v_take;
        END IF;

        IF v_take > 0 THEN
          IF v_qtd - v_take > 0 THEN
            v_itens_novo := v_itens_novo || jsonb_build_array(
              jsonb_set(v_it, '{quantidade}', to_jsonb(v_qtd - v_take)));
          END IF;
          CONTINUE;
        END IF;
      END IF;

      v_itens_novo := v_itens_novo || jsonb_build_array(v_it);
    END LOOP;
  END IF;

  v_itens := v_itens_novo;

  /* ── Adiciona o item comprado ──────────────────────────────────────────────
     Equipável sempre foi uma instância por unidade. O pacote com recheio entra
     na mesma trilha mesmo quando o item empilharia: duas algibeiras cheias são
     dois pacotes, e o recheio de cada uma aponta para o instanceId dela. */
  IF v_equipavel OR v_tem_conteudo THEN
    FOR v_i IN 1 .. p_quantidade LOOP
      v_inst_id := (extract(epoch from clock_timestamp())*1000)::bigint::text
                     || '-' || substr(md5(random()::text || v_i::text), 1, 6);
      v_itens := v_itens || jsonb_build_array(jsonb_build_object(
        'instanceId', v_inst_id,
        'slug', v_slug, 'quantidade', 1, 'equipado', false,
        'slot', null, 'containerId', v_target_container, 'observacao', null));

      IF v_tem_conteudo THEN
        FOR v_c IN 0 .. (jsonb_array_length(v_conteudo) - 1) LOOP
          IF (v_conteudo->v_c->>'slug') IS NOT NULL THEN
            v_itens := v_itens || jsonb_build_array(jsonb_build_object(
              'instanceId', (extract(epoch from clock_timestamp())*1000)::bigint::text
                              || '-' || substr(md5(random()::text || v_i::text || v_c::text), 1, 6),
              'slug', v_conteudo->v_c->>'slug',
              'quantidade', GREATEST(1, COALESCE((v_conteudo->v_c->>'quantidade')::int, 1)),
              'equipado', false, 'slot', null,
              'containerId', v_inst_id, 'observacao', null));
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  ELSE
    v_stack_idx := -1;
    IF jsonb_array_length(v_itens) > 0 THEN
      FOR v_i IN 0 .. (jsonb_array_length(v_itens) - 1) LOOP
        v_it := v_itens->v_i;
        IF v_it->>'slug' = v_slug
           AND COALESCE((v_it->>'equipado')::boolean, false) = false
           AND ((v_it->>'containerId') IS NOT DISTINCT FROM v_target_container) AND (v_it->>'anuncio_id') IS NULL
        THEN v_stack_idx := v_i; EXIT; END IF;
      END LOOP;
    END IF;

    IF v_stack_idx >= 0 THEN
      v_itens := jsonb_set(v_itens, ARRAY[v_stack_idx::text, 'quantidade'],
        to_jsonb(COALESCE((v_itens->v_stack_idx->>'quantidade')::int, 0) + p_quantidade));
    ELSE
      v_inst := jsonb_build_object(
        'instanceId', (extract(epoch from clock_timestamp())*1000)::bigint::text
                       || '-' || substr(md5(random()::text), 1, 6),
        'slug', v_slug, 'quantidade', p_quantidade, 'equipado', false,
        'slot', null, 'containerId', v_target_container, 'observacao', null);
      v_itens := v_itens || jsonb_build_array(v_inst);
    END IF;
  END IF;

  IF v_moedas IS NOT NULL THEN
    v_novo_inventario := jsonb_build_object('moedas', v_moedas, 'itens', v_itens);
  ELSE
    v_novo_inventario := jsonb_build_object('itens', v_itens);
  END IF;

  -- ── Decrementa estoque no lugar certo (formato novo ou legado) ──────────
  IF v_entrada->>'estoque' IS NOT NULL THEN
    IF v_formato_novo THEN
      -- Percorre os comércios para achar e decrementar o entryId correto
      v_novo_estoque_raw := v_estoque_raw;
      FOR v_com_idx IN 0 .. (jsonb_array_length(v_novo_estoque_raw->'comercios') - 1) LOOP
        v_comercio  := v_novo_estoque_raw->'comercios'->v_com_idx;
        v_com_itens := v_comercio->'itens';
        FOR v_it_idx IN 0 .. (jsonb_array_length(v_com_itens) - 1) LOOP
          IF v_com_itens->v_it_idx->>'entryId' = p_entry_id THEN
            v_novo_estoque_raw := jsonb_set(
              v_novo_estoque_raw,
              ARRAY['comercios', v_com_idx::text, 'itens', v_it_idx::text, 'estoque'],
              to_jsonb((v_com_itens->v_it_idx->>'estoque')::int - p_quantidade)
            );
            EXIT;
          END IF;
        END LOOP;
      END LOOP;
    ELSE
      -- Formato legado: array flat — mesmo comportamento original
      v_novo_estoque_raw := jsonb_set(v_estoque_raw, ARRAY[v_idx::text, 'estoque'],
        to_jsonb((v_entrada->>'estoque')::int - p_quantidade));
    END IF;
  ELSE
    v_novo_estoque_raw := v_estoque_raw;
  END IF;

  UPDATE public.personagens SET inventario   = v_novo_inventario  WHERE id = p_pj_id;
  UPDATE public.historias   SET estoque_loja = v_novo_estoque_raw WHERE id = v_historia_id;

  -- Log da mesa (05/10/2026): a compra na loja do Mestre vira linha em
  -- mesa_log, no mesmo molde de comprar_item_anunciado.
  INSERT INTO public.mesa_log (historia_id, autor_id, autor_nome, tipo, texto, meta)
  SELECT v_historia_id,
         auth.uid(),
         COALESCE((SELECT COALESCE(pr.full_name, pr.email, 'Jogador')
                     FROM public.profiles pr WHERE pr.id = auth.uid()), 'Jogador'),
         'item',
         COALESCE(NULLIF(split_part(pe.nome, ' ', 1), ''), 'Alguém') || ' comprou '
           || CASE WHEN p_quantidade > 1 THEN p_quantidade || '× ' ELSE '' END
           || COALESCE(v_cat.nome, v_slug)
           || CASE WHEN v_tem_conteudo THEN ' (com o que vinha dentro)' ELSE '' END
           || ' na loja'
           || CASE WHEN v_custo_total > 0
                   THEN ' por ' || public._menestrel_moedas_texto(v_custo_total)
                   ELSE ', de graça' END
           || '.',
         jsonb_build_object('acao', 'comprar', 'loja', true,
                            'item', COALESCE(v_cat.nome, v_slug), 'slug', v_slug,
                            'quantidade', p_quantidade, 'custo_latao', v_custo_total,
                            'conteudo', v_conteudo)
    FROM public.personagens pe
   WHERE pe.id = p_pj_id;

  RETURN jsonb_build_object('ok', true, 'preco_unit_final', v_preco_unit, 'custo_total', v_custo_total, 'negociacao', p_negociacao);
END;
$function$;
