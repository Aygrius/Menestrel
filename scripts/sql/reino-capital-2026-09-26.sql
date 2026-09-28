-- reino-capital-2026-09-26.sql
--
-- "No modal de editar/criar reino, adicione um dropdown do lado de nome,
--  inline, para selecionar a capital, do catálogo de cidades." (usuário)
--
-- reinos.capital = slug da cidade (FK para cidades.slug; excluir a cidade
-- limpa a capital). No JSON das listagens o campo sai como 'capital_cidade',
-- e não 'capital': 'capital' já é o booleano da CIDADE ("esta cidade é
-- capital"), e o front trata essa chave como sim/não em qualquer entrada.
--
-- Mexe em: coluna nova; salvar_lore_entrada (grava capital_cidade no bloco
-- de campos extras do reino); listar_catalogo_global e listar_lore_historia
-- (devolvem capital_cidade).
--
-- REVERTER: alter table public.reinos drop column capital;  e reaplicar as
-- três funções sem os trechos "capital".

alter table public.reinos add column if not exists capital text
  references public.cidades(slug) on delete set null;

DO $$
DECLARE def text; novo text; f text;
BEGIN
  -- salvar: o bloco de campos extras do reino ganha a capital
  SELECT pg_get_functiondef('public.salvar_lore_entrada'::regproc) INTO def;
  IF position(E'        resumo = CASE WHEN p_atributos ? ''resumo'' THEN NULLIF(p_atributos->>''resumo'', '''') ELSE resumo END\n      WHERE slug = alvo_slug;' IN def) = 0 THEN
    RAISE EXCEPTION 'bloco do resumo nao encontrado';
  END IF;
  novo := replace(def,
    E'        resumo = CASE WHEN p_atributos ? ''resumo'' THEN NULLIF(p_atributos->>''resumo'', '''') ELSE resumo END\n      WHERE slug = alvo_slug;',
    E'        resumo = CASE WHEN p_atributos ? ''resumo'' THEN NULLIF(p_atributos->>''resumo'', '''') ELSE resumo END,\n        -- 26/09/2026: a capital do reino (slug da cidade)\n        capital = CASE WHEN p_atributos ? ''capital_cidade'' THEN NULLIF(p_atributos->>''capital_cidade'', '''') ELSE capital END\n      WHERE slug = alvo_slug;');
  EXECUTE novo;

  -- listagens: devolvem capital_cidade junto do resumo
  FOREACH f IN ARRAY ARRAY['listar_catalogo_global', 'listar_lore_historia'] LOOP
    SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace AND p.proname = f;
    IF position('''resumo'', resumo, ''historia_recente''' IN def) = 0 THEN
      RAISE EXCEPTION 'resumo nao encontrado em %', f;
    END IF;
    novo := replace(def, '''resumo'', resumo, ''historia_recente''',
      '''resumo'', resumo, ''capital_cidade'', capital, ''historia_recente''');
    EXECUTE novo;
  END LOOP;
END $$;

-- (aplicado em seguida, 26/09/2026) O teste desta migration achou: criar
-- cidade sem o campo Capital (Sim/Não) deixava cidades.capital NULL, que é
-- NOT NULL — a cidade não era criada. Padrão agora é false.
DO $$
DECLARE def text; novo text;
BEGIN
  SELECT pg_get_functiondef('public.criar_copia_cidade'::regproc) INTO def;
  IF position('COALESCE(p_capital, orig.capital)' IN def) = 0 THEN RAISE EXCEPTION 'capital nao encontrado'; END IF;
  novo := replace(def, 'COALESCE(p_capital, orig.capital)', 'COALESCE(p_capital, orig.capital, false)');
  EXECUTE novo;
END $$;
