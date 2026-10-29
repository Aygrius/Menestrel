-- scripts/sql/limite-tres-animais-2026-10-05.sql
-- ============================================================================
-- TRÊS ANIMAIS POR PERSONAGEM (05/10/2026)
--
-- Pedido do usuário:
--   "Com um limite de 3 animais por personagem, cada ganha uma ficha própria
--    (ou seja, não teremos mais as abas de animais)."
--
-- APLICADO NO BANCO EM 05/10/2026 (projeto kaxbdpdutentlrobuqyu), pelas
-- migrations `limite_tres_animais` e `limite_tres_animais_no_anuncio`.
--
-- A ficha abre UMA aba por bicho (src/11-ficha/ficha.jsx, animaisDaFicha =
-- animaisPj.slice(0, 3)) e o componente desenha um animal só. A trava de
-- verdade mora aqui: o front não pode ser o guarda, porque quem compra fala
-- direto com a RPC.
--
-- DUAS PORTAS DE ENTRADA, duas travas iguais:
--   comprar_item            — a loja do Mestre (catálogo da aventura)
--   comprar_item_anunciado  — o anúncio de outro jogador (sem isto, seria a
--                             porta dos fundos do mesmo limite)
--
-- A conta é por INSTÂNCIA e só no grupo Animais: dois cavalos são dois
-- animais. Em comprar_item o bloco entra DEPOIS de `v_inventario` estar
-- carregado — mais acima a soma daria zero sempre (foi o erro da 1ª tentativa).
-- Em comprar_item_anunciado entra depois de `v_inv_c := v_deb->'inv'`, que é o
-- inventário já debitado: o débito só mexe em moedas, a conta continua valendo.
--
-- O jogador vê o motivo em português: `animais_demais` →
-- "Três animais é o limite por personagem" (src/07-inventario/loja.jsx).
--
-- As duas migrations remendam a função existente (pg_get_functiondef +
-- replace + EXECUTE), a técnica da casa, e são idempotentes: se o corpo já tem
-- 'animais_demais', não fazem nada.
-- ============================================================================

-- ── 1. A LOJA DO MESTRE ─────────────────────────────────────────────────────
DO $do$
DECLARE
  v_def text;
  v_anc text := E'  v_moedas := v_inventario->\'moedas\';';
  v_bloco text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'comprar_item';

  IF position('animais_demais' in v_def) > 0 THEN
    RAISE NOTICE 'comprar_item: ja tem a trava'; RETURN;
  END IF;
  IF (length(v_def) - length(replace(v_def, v_anc, ''))) / length(v_anc) <> 1 THEN
    RAISE EXCEPTION 'comprar_item: a ancora apareceu % vez(es)',
      (length(v_def) - length(replace(v_def, v_anc, ''))) / length(v_anc);
  END IF;

  v_bloco :=
    E'  /* TRÊS ANIMAIS POR PERSONAGEM (05/10/2026, regra do usuário): "com um\n' ||
    E'     limite de 3 animais por personagem, cada ganha uma ficha própria". Conta\n' ||
    E'     por INSTÂNCIA (dois cavalos são dois animais) e só no grupo Animais. Aqui\n' ||
    E'     embaixo de propósito: é a primeira linha depois de v_inventario estar\n' ||
    E'     carregado — mais acima a conta daria zero sempre. */\n' ||
    E'  IF v_cat.grupo = ''Animais'' THEN\n' ||
    E'    DECLARE v_animais int;\n' ||
    E'    BEGIN\n' ||
    E'      SELECT coalesce(sum(greatest(1, coalesce((it->>''quantidade'')::int, 1))), 0) INTO v_animais\n' ||
    E'        FROM jsonb_array_elements(coalesce(v_inventario->''itens'', ''[]''::jsonb)) it\n' ||
    E'        JOIN public.itens i2 ON i2.slug = it->>''slug''\n' ||
    E'       WHERE i2.grupo = ''Animais'';\n' ||
    E'      IF v_animais + p_quantidade > 3 THEN\n' ||
    E'        RETURN jsonb_build_object(''ok'', false, ''motivo'', ''animais_demais'',\n' ||
    E'          ''animais'', v_animais, ''limite'', 3);\n' ||
    E'      END IF;\n' ||
    E'    END;\n' ||
    E'  END IF;\n\n';

  EXECUTE replace(v_def, v_anc, v_bloco || v_anc);
  RAISE NOTICE 'comprar_item: trava de 3 animais aplicada';
END
$do$;

-- ── 2. O ANÚNCIO DE OUTRO JOGADOR ───────────────────────────────────────────
DO $do$
DECLARE
  v_def text;
  v_anc text := E'    v_inv_c := v_deb->\'inv\';\n';
  v_bloco text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'comprar_item_anunciado';

  IF position('animais_demais' in v_def) > 0 THEN
    RAISE NOTICE 'comprar_item_anunciado: ja tem a trava'; RETURN;
  END IF;
  IF (length(v_def) - length(replace(v_def, v_anc, ''))) / length(v_anc) <> 1 THEN
    RAISE EXCEPTION 'comprar_item_anunciado: a ancora apareceu % vez(es)',
      (length(v_def) - length(replace(v_def, v_anc, ''))) / length(v_anc);
  END IF;

  v_bloco :=
    E'    /* TRES ANIMAIS POR PERSONAGEM (05/10/2026, regra do usuario): a mesma\n' ||
    E'       trava da loja do Mestre (comprar_item), para o anuncio de jogador nao\n' ||
    E'       ser a porta dos fundos. v_inv_c ja esta debitado aqui; o debito so\n' ||
    E'       mexe em moedas, a conta de animais continua valendo. */\n' ||
    E'    if exists (select 1 from public.itens where slug = v_a.slug and grupo = ''Animais'') then\n' ||
    E'      declare v_animais int;\n' ||
    E'      begin\n' ||
    E'        select coalesce(sum(greatest(1, coalesce((it->>''quantidade'')::int, 1))), 0) into v_animais\n' ||
    E'          from jsonb_array_elements(coalesce(v_inv_c->''itens'', ''[]''::jsonb)) it\n' ||
    E'          join public.itens i2 on i2.slug = it->>''slug''\n' ||
    E'         where i2.grupo = ''Animais'';\n' ||
    E'        if v_animais + v_q > 3 then\n' ||
    E'          return jsonb_build_object(''ok'', false, ''motivo'', ''animais_demais'',\n' ||
    E'            ''animais'', v_animais, ''limite'', 3);\n' ||
    E'        end if;\n' ||
    E'      end;\n' ||
    E'    end if;\n';

  EXECUTE replace(v_def, v_anc, v_anc || v_bloco);
  RAISE NOTICE 'comprar_item_anunciado: trava de 3 animais aplicada';
END
$do$;

-- ── CONFERÊNCIA ─────────────────────────────────────────────────────────────
-- As duas funções com exatamente UMA trava cada:
--   select p.proname,
--          (length(pg_get_functiondef(p.oid))
--           - length(replace(pg_get_functiondef(p.oid), 'animais_demais', '')))
--          / length('animais_demais') as travas
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public'
--      and p.proname in ('comprar_item', 'comprar_item_anunciado')
--    order by 1;
