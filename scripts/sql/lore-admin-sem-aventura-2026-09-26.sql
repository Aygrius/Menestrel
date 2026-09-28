-- lore-admin-sem-aventura-2026-09-26.sql
--
-- "Eu quero o botão de editar, ao lado do x, e adicionar, mesmo fora da
--  aventura, para o admin." (usuário)
--
-- Sem aventura selecionada, Reinos/Cidades/Conhecidos mostram o catálogo do
-- MUNDO (historia_id NULL). salvar_lore_entrada exigia uma história em que o
-- chamador fosse Mestre — até para o admin, que já editava o mundo direto
-- desde a manhã deste dia, mas só de dentro de uma aventura.
--
-- Duas mudanças, só para eh_admin():
--   1. p_historia_id NULL passa na checagem de permissão. O ramo "ADMIN edita
--      a entrada do MUNDO" (já existente) cuida da edição.
--   2. Ramo novo: p_id NULL + p_historia_id NULL = CRIAR entrada do mundo
--      (historia_id NULL), com slug derivado do nome + sufixo aleatório.
--      Os campos extras (resumo, governante, rumores…) seguem pelo bloco
--      final de sempre, que atualiza pelo alvo_slug.
-- Não-admin sem história continua recusado ("sem_permissao_historia").
--
-- Aplicado por patch do texto da função (replace com asserção), mesmo
-- padrão das migrations anteriores desta função.
--
-- REVERTER: reaplicar a definição anterior (sem os dois trechos marcados
-- "26/09/2026 — admin sem aventura").

DO $$
DECLARE
  def text;
  novo text;
  antes_perm text := $a$  IF NOT EXISTS (
    SELECT 1 FROM public.historias
    WHERE id = p_historia_id AND mestre_id = auth.uid()
  ) AND NOT ($a$;
  depois_perm text := $a$  -- 26/09/2026 — admin sem aventura: o mundo (historia_id NULL).
  IF NOT (p_historia_id IS NULL AND public.eh_admin()) AND NOT EXISTS (
    SELECT 1 FROM public.historias
    WHERE id = p_historia_id AND mestre_id = auth.uid()
  ) AND NOT ($a$;
  antes_criar text := $a$  ELSE
    IF p_id IS NOT NULL THEN
      slug_base := p_id;$a$;
  depois_criar text := $a$  -- 26/09/2026 — admin sem aventura: CRIA a entrada do mundo.
  ELSIF p_id IS NULL AND p_historia_id IS NULL THEN
    alvo_slug := trim(both '-' from regexp_replace(
      lower(translate(p_nome, 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
                              'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN')),
      '[^a-z0-9]+', '-', 'g'));
    IF alvo_slug = '' THEN alvo_slug := p_tipo; END IF;
    alvo_slug := alvo_slug || '-' || substr(md5(gen_random_uuid()::text), 1, 6);
    IF p_tipo = 'reino' THEN
      INSERT INTO public.reinos (slug, nome, icone, descricao, governo, cultura, historia_recente, historia_id, criado_por)
      VALUES (alvo_slug, p_nome, p_imagem_url, p_descricao,
        p_atributos->>'governo', p_atributos->>'cultura', p_atributos->>'historia_recente', NULL, auth.uid());
    ELSIF p_tipo = 'cidade' THEN
      INSERT INTO public.cidades (slug, nome, imagem, populacao, descricao, capital, reino, historia_id, criado_por)
      VALUES (alvo_slug, p_nome, p_imagem_url, NULLIF(p_atributos->>'populacao', '')::integer, p_descricao,
        COALESCE((p_atributos->>'capital')::boolean, false), COALESCE(p_atributos->>'reino', ''), NULL, auth.uid());
    ELSE
      INSERT INTO public.npcs (slug, nome, imagem, raca, profissao, deus, descricao, origem, cidade, historia_id, criado_por)
      VALUES (alvo_slug, p_nome, p_imagem_url, p_atributos->>'raca', p_atributos->>'profissao', p_atributos->>'deus',
        p_descricao, p_atributos->>'origem', p_atributos->>'cidade', NULL, auth.uid());
    END IF;
    resultado := jsonb_build_object('ok', true, 'entrada', jsonb_build_object('slug', alvo_slug), 'criou_mundo', true);

  ELSE
    IF p_id IS NOT NULL THEN
      slug_base := p_id;$a$;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO def
  FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'salvar_lore_entrada';

  IF position(antes_perm IN def) = 0 THEN RAISE EXCEPTION 'trecho da permissao nao encontrado'; END IF;
  IF position(antes_criar IN def) = 0 THEN RAISE EXCEPTION 'trecho do ELSE de criacao nao encontrado'; END IF;

  novo := replace(def, antes_perm, depois_perm);
  novo := replace(novo, antes_criar, depois_criar);
  IF novo = def THEN RAISE EXCEPTION 'nada mudou'; END IF;
  EXECUTE novo;
END $$;
