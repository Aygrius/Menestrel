-- lore-criar-sem-modelo-2026-09-26.sql
--
-- "Ao tentar criar um reino, apareceu a mensagem 'origem_nao_encontrada'"
-- (usuário, 26/09/2026).
--
-- Causa: criar_copia_reino / criar_copia_cidade / criar_copia_npc sempre
-- leem a linha de ORIGEM — e uma entrada nova parte de uma linha-modelo
-- ('novo-reino', 'nova-cidade', 'novo-npc'). No banco só existe 'novo-npc';
-- os modelos de reino e cidade não estão lá, então criar um reino ou uma
-- cidade numa aventura sempre falhava.
--
-- Correção: para o slug-modelo, a origem é OPCIONAL — sem ela os campos vêm
-- só dos parâmetros (o COALESCE com um registro vazio dá NULL). Cópia de uma
-- entrada existente continua exigindo a origem. Em cidades, `reino` é NOT
-- NULL: cai em '' quando não vier.
--
-- REVERTER: trocar de volta
--   "IF NOT FOUND AND p_slug_origem <> '<modelo>' THEN" por "IF NOT FOUND THEN"
--   e "COALESCE(p_reino, orig.reino, '')" por "COALESCE(p_reino, orig.reino)".

DO $$
DECLARE
  f record;
  def text;
  novo text;
BEGIN
  FOR f IN SELECT * FROM (VALUES
    ('criar_copia_reino', 'novo-reino'),
    ('criar_copia_cidade', 'nova-cidade'),
    ('criar_copia_npc', 'novo-npc')) AS t(nome, modelo)
  LOOP
    SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace AND p.proname = f.nome;
    IF position('  IF NOT FOUND THEN
    RETURN jsonb_build_object(''ok'', false, ''motivo'', ''origem_nao_encontrada'');' IN def) = 0 THEN
      RAISE EXCEPTION 'trecho nao encontrado em %', f.nome;
    END IF;
    novo := replace(def, '  IF NOT FOUND THEN
    RETURN jsonb_build_object(''ok'', false, ''motivo'', ''origem_nao_encontrada'');',
      format('  -- 26/09/2026: o modelo (%s) é opcional; a cópia de entrada existente não.
  IF NOT FOUND AND p_slug_origem <> %L THEN
    RETURN jsonb_build_object(''ok'', false, ''motivo'', ''origem_nao_encontrada'');', f.modelo, f.modelo));
    IF f.nome = 'criar_copia_cidade' THEN
      IF position('COALESCE(p_reino, orig.reino)' IN novo) = 0 THEN
        RAISE EXCEPTION 'reino da cidade nao encontrado';
      END IF;
      novo := replace(novo, 'COALESCE(p_reino, orig.reino)', 'COALESCE(p_reino, orig.reino, '''')');
    END IF;
    EXECUTE novo;
  END LOOP;
END $$;
