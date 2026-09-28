-- lore-criar-baseado-em-2026-09-26.sql
--
-- 'insert or update on table "reinos" violates foreign key constraint
--  "reinos_baseado_em_fkey"' (usuário, 26/09/2026) — logo depois de
-- lore-criar-sem-modelo-2026-09-26.sql.
--
-- 1. baseado_em é FK para o próprio catálogo (reinos.slug, npcs.slug). A
--    entrada NOVA gravava ali o slug-modelo ('novo-reino'), que não existe no
--    banco. Agora: sem linha de origem, baseado_em fica NULL.
-- 2. cidades.reino é FK para reinos.slug e NOT NULL. A correção anterior
--    trocava reino ausente por '' — que também violaria a FK. Uma cidade
--    precisa de um reino de verdade: salvar_lore_entrada recusa com
--    'reino_obrigatorio' ANTES de tentar gravar, e as duas funções voltam a
--    usar o reino recebido sem inventar valor.
--
-- REVERTER: trocar "CASE WHEN orig.slug IS NULL THEN NULL ELSE p_slug_origem END"
-- por "p_slug_origem"; tirar a checagem 'reino_obrigatorio'.

DO $$
DECLARE
  f text;
  def text;
  novo text;
BEGIN
  -- 1. baseado_em nulo quando não há origem (as três funções de cópia)
  FOREACH f IN ARRAY ARRAY['criar_copia_reino', 'criar_copia_cidade', 'criar_copia_npc'] LOOP
    SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace AND p.proname = f;
    IF position(E'    p_slug_origem,\n    auth.uid()' IN def) = 0 THEN
      RAISE EXCEPTION 'baseado_em nao encontrado em %', f;
    END IF;
    novo := replace(def, E'    p_slug_origem,\n    auth.uid()',
      E'    CASE WHEN orig.slug IS NULL THEN NULL ELSE p_slug_origem END,  -- 26/09/2026: sem origem, sem FK\n    auth.uid()');
    IF f = 'criar_copia_cidade' THEN
      IF position('COALESCE(p_reino, orig.reino, '''')' IN novo) = 0 THEN
        RAISE EXCEPTION 'reino da cidade nao encontrado';
      END IF;
      novo := replace(novo, 'COALESCE(p_reino, orig.reino, '''')', 'COALESCE(p_reino, orig.reino)');
    END IF;
    EXECUTE novo;
  END LOOP;

  -- 2. salvar_lore_entrada: cidade nova sem reino é recusada com motivo claro;
  --    o ramo do admin (criar no mundo) deixa de inventar ''.
  SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'salvar_lore_entrada';
  IF position(E'  IF p_nome IS NULL OR btrim(p_nome) = '''' THEN\n    RETURN jsonb_build_object(''ok'', false, ''motivo'', ''nome_obrigatorio'');\n  END IF;' IN def) = 0 THEN
    RAISE EXCEPTION 'checagem do nome nao encontrada';
  END IF;
  IF position('COALESCE(p_atributos->>''reino'', '''')' IN def) = 0 THEN
    RAISE EXCEPTION 'reino do ramo admin nao encontrado';
  END IF;
  novo := replace(def,
    E'  IF p_nome IS NULL OR btrim(p_nome) = '''' THEN\n    RETURN jsonb_build_object(''ok'', false, ''motivo'', ''nome_obrigatorio'');\n  END IF;',
    E'  IF p_nome IS NULL OR btrim(p_nome) = '''' THEN\n    RETURN jsonb_build_object(''ok'', false, ''motivo'', ''nome_obrigatorio'');\n  END IF;\n\n  -- 26/09/2026: cidade nova precisa de um reino (cidades.reino é FK e NOT NULL).\n  IF p_tipo = ''cidade'' AND p_id IS NULL AND NULLIF(btrim(p_atributos->>''reino''), '''') IS NULL THEN\n    RETURN jsonb_build_object(''ok'', false, ''motivo'', ''reino_obrigatorio'');\n  END IF;');
  novo := replace(novo, 'COALESCE(p_atributos->>''reino'', '''')', 'p_atributos->>''reino''');
  EXECUTE novo;
END $$;

-- 3. (aplicado em seguida, 26/09/2026) O teste real mostrou uma terceira
--    regra: reinos_copia_consistente (e npcs_copia_consistente) exige que
--    TODA cópia de aventura tenha baseado_em — o desenho pressupõe as
--    linhas-modelo. 'novo-npc' existe; 'novo-reino' tinha sumido. Recriado no
--    mesmo formato do de NPC (sem aventura, sem dono). listar_catalogo_global
--    já o esconde (slug <> 'novo-reino'). Cidades não têm essa regra, então
--    'nova-cidade' segue ausente e a cidade nova grava baseado_em NULL.
--
-- REVERTER: delete from public.reinos where slug = 'novo-reino';
insert into public.reinos (slug, nome, historia_id, baseado_em)
values ('novo-reino', 'Novo reino', null, null)
on conflict (slug) do nothing;

-- 4. (aplicado em seguida, 26/09/2026) O mesmo teste mostrou que
--    criar_copia_cidade inseria em cidades.baseado_em — coluna que NÃO
--    EXISTE. Criar cidade numa aventura falhava sempre, desde antes de hoje.
--    A coluna sai do INSERT.
DO $$
DECLARE def text; novo text;
BEGIN
  SELECT pg_get_functiondef('public.criar_copia_cidade'::regproc) INTO def;
  novo := replace(def, 'reino, historia_id, baseado_em, criado_por', 'reino, historia_id, criado_por');
  novo := replace(novo, E'    CASE WHEN orig.slug IS NULL THEN NULL ELSE p_slug_origem END,  -- 26/09/2026: sem origem, sem FK\n', '');
  IF novo = def OR position('baseado_em' IN novo) > 0 THEN RAISE EXCEPTION 'patch da cidade falhou'; END IF;
  EXECUTE novo;
END $$;
