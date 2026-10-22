-- 22/10/2026 — Locais (novo tipo de lore) e o fim de "defesas".
--
-- Pedido do usuário: 'Mude o menu "conhecidos" para "pessoas", e adicione um
-- novo chamado "locais", parecido com cidades. Mas em locais não há
-- governante, religião, economia, defesas. Aliás, pode remover "defesas" de
-- todas as cidades e reinos.'
--
-- • locais: a tabela de cidades sem governante/religião/economia/defesas/
--   capital. Reino é opcional (uma floresta pode não ter dono).
-- • historias.local_ids: a visibilidade por mesa, como cidade_ids.
-- • cidades.defesas: some (nenhuma cidade tinha o campo preenchido). Reinos
--   nunca tiveram a coluna.
-- • As listagens de reino do Jogador passam a devolver capital_cidade (a
--   coluna Capital da página de Reinos).

BEGIN;

-- ── Tabela ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.locais (
  slug                     text PRIMARY KEY,
  nome                     text NOT NULL,
  imagem                   text,
  populacao                integer,
  descricao                text,
  reino                    text REFERENCES public.reinos(slug) ON DELETE SET NULL,
  rumores                  text,
  historia_id              bigint REFERENCES public.historias(id) ON DELETE CASCADE,
  criado_por               uuid REFERENCES auth.users(id),
  criado_por_personagem_id bigint REFERENCES public.personagens(id) ON DELETE SET NULL,
  compartilhado            boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_locais_reino ON public.locais (reino);
CREATE INDEX IF NOT EXISTS idx_locais_historia ON public.locais (historia_id);

ALTER TABLE public.locais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS locais_select_all ON public.locais;
CREATE POLICY locais_select_all ON public.locais FOR SELECT USING (true);
-- Só RPC escreve (SECURITY DEFINER), como em reinos/cidades/npcs.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.locais FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_locais_updated_at ON public.locais;
CREATE TRIGGER trg_locais_updated_at BEFORE UPDATE ON public.locais
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.historias ADD COLUMN IF NOT EXISTS local_ids text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.diario_entradas DROP CONSTRAINT IF EXISTS diario_entradas_tipo_check;
ALTER TABLE public.diario_entradas ADD CONSTRAINT diario_entradas_tipo_check
  CHECK (tipo = ANY (ARRAY['criatura','npc','reino','cidade','local','memoria']));
ALTER TABLE public.lore_entradas DROP CONSTRAINT IF EXISTS lore_entradas_tipo_check;
ALTER TABLE public.lore_entradas ADD CONSTRAINT lore_entradas_tipo_check
  CHECK (tipo = ANY (ARRAY['npc','reino','cidade','local']));

-- ── Cópias por mesa ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.criar_copia_local(p_historia_id bigint, p_slug_origem text,
  p_nome text DEFAULT NULL, p_imagem text DEFAULT NULL, p_populacao integer DEFAULT NULL,
  p_descricao text DEFAULT NULL, p_reino text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  orig public.locais%ROWTYPE;
  novo_slug text;
  resultado public.locais%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.historias WHERE id = p_historia_id AND mestre_id = auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao_historia');
  END IF;

  SELECT * INTO orig FROM public.locais WHERE slug = p_slug_origem;
  IF NOT FOUND AND p_slug_origem <> 'novo-local' THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'origem_nao_encontrada');
  END IF;

  IF p_slug_origem = 'novo-local' THEN
    novo_slug := 'novo-local-h' || p_historia_id::text || '-' || substr(md5(gen_random_uuid()::text), 1, 8);
  ELSE
    novo_slug := p_slug_origem || '-h' || p_historia_id::text;
    IF EXISTS (SELECT 1 FROM public.locais WHERE slug = novo_slug) THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'copia_ja_existe');
    END IF;
  END IF;

  INSERT INTO public.locais (slug, nome, imagem, populacao, descricao, reino, rumores, historia_id, criado_por)
  VALUES (novo_slug, COALESCE(p_nome, orig.nome), COALESCE(p_imagem, orig.imagem),
    COALESCE(p_populacao, orig.populacao), COALESCE(p_descricao, orig.descricao),
    COALESCE(NULLIF(p_reino, ''), orig.reino), orig.rumores, p_historia_id, auth.uid())
  RETURNING * INTO resultado;

  RETURN jsonb_build_object('ok', true, 'entrada', to_jsonb(resultado));
END;
$function$;

CREATE OR REPLACE FUNCTION public.editar_copia_local(p_slug text, p_nome text DEFAULT NULL,
  p_imagem text DEFAULT NULL, p_populacao integer DEFAULT NULL, p_descricao text DEFAULT NULL,
  p_reino text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  resultado public.locais%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;
  -- Reino e população aceitam ser APAGADOS (diferente da cidade, onde o
  -- reino é obrigatório): o valor vem como está.
  UPDATE public.locais SET
    nome = COALESCE(p_nome, nome),
    imagem = COALESCE(p_imagem, imagem),
    populacao = p_populacao,
    descricao = COALESCE(p_descricao, descricao),
    reino = NULLIF(p_reino, '')
  WHERE slug = p_slug
    AND historia_id IS NOT NULL
    AND historia_id IN (SELECT id FROM public.historias WHERE mestre_id = auth.uid())
  RETURNING * INTO resultado;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'entrada_nao_encontrada');
  END IF;
  RETURN jsonb_build_object('ok', true, 'entrada', to_jsonb(resultado));
END;
$function$;

CREATE OR REPLACE FUNCTION public.excluir_copia_local(p_slug text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;
  DELETE FROM public.locais
  WHERE slug = p_slug
    AND historia_id IS NOT NULL
    AND historia_id IN (SELECT id FROM public.historias WHERE mestre_id = auth.uid());
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'entrada_nao_encontrada');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- ── Funções existentes que conhecem os tipos de lore ───────────────────
CREATE OR REPLACE FUNCTION public.compartilhar_lore_entrada(p_tipo text, p_slug text, p_personagem_id bigint, p_ligar boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_linhas int;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.personagens WHERE id = p_personagem_id AND user_id = auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;

  IF p_tipo = 'npc' THEN
    UPDATE public.npcs SET compartilhado = p_ligar WHERE slug = p_slug AND criado_por_personagem_id = p_personagem_id;
  ELSIF p_tipo = 'reino' THEN
    UPDATE public.reinos SET compartilhado = p_ligar WHERE slug = p_slug AND criado_por_personagem_id = p_personagem_id;
  ELSIF p_tipo = 'cidade' THEN
    UPDATE public.cidades SET compartilhado = p_ligar WHERE slug = p_slug AND criado_por_personagem_id = p_personagem_id;
  ELSIF p_tipo = 'local' THEN
    UPDATE public.locais SET compartilhado = p_ligar WHERE slug = p_slug AND criado_por_personagem_id = p_personagem_id;
  ELSE
    RETURN jsonb_build_object('ok', false, 'motivo', 'tipo_invalido');
  END IF;

  GET DIAGNOSTICS v_linhas = ROW_COUNT;
  IF v_linhas = 0 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'entrada_nao_encontrada_ou_sem_permissao');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.definir_arte_lore(p_tipo text, p_id text, p_imagem_url text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  url text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;
  IF p_tipo NOT IN ('criatura', 'npc', 'reino', 'cidade', 'local') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'tipo_invalido');
  END IF;

  url := NULLIF(btrim(p_imagem_url), '');

  IF p_tipo = 'criatura' THEN
    UPDATE public.criaturas SET imagem_url = url WHERE id = p_id::bigint;
  ELSIF p_tipo = 'reino' THEN
    UPDATE public.reinos SET icone = url
    WHERE slug = p_id AND historia_id IS NOT NULL
      AND historia_id IN (SELECT id FROM public.historias WHERE mestre_id = auth.uid());
  ELSIF p_tipo = 'cidade' THEN
    UPDATE public.cidades SET imagem = url
    WHERE slug = p_id AND historia_id IS NOT NULL
      AND historia_id IN (SELECT id FROM public.historias WHERE mestre_id = auth.uid());
  ELSIF p_tipo = 'local' THEN
    UPDATE public.locais SET imagem = url
    WHERE slug = p_id AND historia_id IS NOT NULL
      AND historia_id IN (SELECT id FROM public.historias WHERE mestre_id = auth.uid());
  ELSE
    UPDATE public.npcs SET imagem = url
    WHERE slug = p_id AND historia_id IS NOT NULL
      AND historia_id IN (SELECT id FROM public.historias WHERE mestre_id = auth.uid());
  END IF;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'entrada_nao_encontrada');
  END IF;

  RETURN jsonb_build_object('ok', true, 'imagem_url', url);
END;
$function$;

CREATE OR REPLACE FUNCTION public.excluir_lore_entrada(p_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;
  IF EXISTS (SELECT 1 FROM public.reinos WHERE slug = p_id) THEN
    RETURN excluir_copia_reino(p_id);
  ELSIF EXISTS (SELECT 1 FROM public.cidades WHERE slug = p_id) THEN
    RETURN excluir_copia_cidade(p_id);
  ELSIF EXISTS (SELECT 1 FROM public.locais WHERE slug = p_id) THEN
    RETURN excluir_copia_local(p_id);
  ELSIF EXISTS (SELECT 1 FROM public.npcs WHERE slug = p_id) THEN
    RETURN excluir_copia_npc(p_id);
  ELSE
    RETURN jsonb_build_object('ok', false, 'motivo', 'entrada_nao_encontrada');
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.importar_diario(p_personagem_id bigint, p_tipo text, p_ref_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_historia_id bigint;
  v_criatura_ids bigint[];
  v_reino_ids text[];
  v_cidade_ids text[];
  v_local_ids text[];
  v_npc_ids text[];
  liberado boolean := false;
  resultado public.diario_entradas%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;
  IF p_tipo NOT IN ('criatura', 'npc', 'reino', 'cidade', 'local') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'tipo_invalido');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.personagens WHERE id = p_personagem_id AND user_id = auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'pj_nao_encontrado');
  END IF;

  SELECT id, criatura_ids, reino_ids, cidade_ids, local_ids, npc_ids
  INTO v_historia_id, v_criatura_ids, v_reino_ids, v_cidade_ids, v_local_ids, v_npc_ids
  FROM public.historias
  WHERE protagonista_ids @> ARRAY[p_personagem_id];
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_historia');
  END IF;

  IF p_tipo = 'criatura' THEN
    liberado := (p_ref_id::bigint = ANY (COALESCE(v_criatura_ids, '{}'::bigint[])));
  ELSIF p_tipo = 'reino' THEN
    liberado := (p_ref_id = ANY (COALESCE(v_reino_ids, '{}'::text[])));
  ELSIF p_tipo = 'cidade' THEN
    liberado := (p_ref_id = ANY (COALESCE(v_cidade_ids, '{}'::text[])));
  ELSIF p_tipo = 'local' THEN
    liberado := (p_ref_id = ANY (COALESCE(v_local_ids, '{}'::text[])));
  ELSE
    liberado := (p_ref_id = ANY (COALESCE(v_npc_ids, '{}'::text[])));
  END IF;
  IF NOT liberado THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'entrada_nao_disponivel');
  END IF;

  INSERT INTO public.diario_entradas (personagem_id, tipo, ref_id)
  VALUES (p_personagem_id, p_tipo, p_ref_id)
  ON CONFLICT (personagem_id, tipo, ref_id) WHERE ref_id IS NOT NULL DO NOTHING
  RETURNING * INTO resultado;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true);
  END IF;
  RETURN jsonb_build_object('ok', true, 'entrada', to_jsonb(resultado));
END;
$function$;

CREATE OR REPLACE FUNCTION public.listar_catalogo_global(p_tipo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  entradas jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;
  IF p_tipo NOT IN ('reino', 'cidade', 'local', 'npc') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'tipo_invalido');
  END IF;

  IF p_tipo = 'reino' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', slug, 'tipo', 'reino', 'nome', nome, 'descricao', descricao, 'imagem_url', icone,
      'atributos', jsonb_build_object(
        'governo', governo, 'cultura', cultura,
        'resumo', resumo, 'capital_cidade', capital, 'historia_recente', historia_recente,
        'rumores', rumores
      )
    ) ORDER BY nome), '[]'::jsonb) INTO entradas
    FROM public.reinos WHERE historia_id IS NULL AND slug <> 'novo-reino';

  ELSIF p_tipo = 'cidade' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', slug, 'tipo', 'cidade', 'nome', nome, 'descricao', descricao, 'imagem_url', imagem,
      'atributos', jsonb_build_object(
        'reino', reino, 'populacao', populacao, 'capital', capital, 'governante', governante,
        'economia', economia, 'religiao', religiao, 'rumores', rumores
      )
    ) ORDER BY nome), '[]'::jsonb) INTO entradas
    FROM public.cidades WHERE historia_id IS NULL AND slug <> 'nova-cidade';

  ELSIF p_tipo = 'local' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', slug, 'tipo', 'local', 'nome', nome, 'descricao', descricao, 'imagem_url', imagem,
      'atributos', jsonb_build_object('reino', reino, 'populacao', populacao, 'rumores', rumores)
    ) ORDER BY nome), '[]'::jsonb) INTO entradas
    FROM public.locais WHERE historia_id IS NULL AND slug <> 'novo-local';

  ELSE
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', slug, 'tipo', 'npc', 'nome', nome, 'descricao', descricao, 'imagem_url', imagem,
      'atributos', jsonb_build_object(
        'raca', raca, 'profissao', profissao, 'deus', deus, 'origem', origem, 'cidade', cidade,
        'reino', reino, 'idade', idade, 'familia', familia, 'relacao', relacao, 'status', status,
        'rumores', rumores
      )
    ) ORDER BY nome), '[]'::jsonb) INTO entradas
    FROM public.npcs WHERE historia_id IS NULL AND slug <> 'novo-npc';
  END IF;

  RETURN jsonb_build_object('ok', true, 'entradas', entradas);
END;
$function$;

CREATE OR REPLACE FUNCTION public.listar_lore_historia(p_historia_id bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  entradas jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.historias WHERE id = p_historia_id AND mestre_id = auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao_historia');
  END IF;

  SELECT jsonb_agg(x ORDER BY x->>'nome') INTO entradas FROM (
    SELECT jsonb_build_object(
      'id', slug, 'tipo', 'reino', 'nome', nome, 'descricao', descricao, 'imagem_url', icone,
      'atributos', jsonb_build_object(
        'governo', governo, 'cultura', cultura,
        'resumo', resumo, 'capital_cidade', capital, 'historia_recente', historia_recente,
        'rumores', rumores
      )
    ) AS x
    FROM public.reinos WHERE historia_id = p_historia_id
    UNION ALL
    SELECT jsonb_build_object(
      'id', slug, 'tipo', 'cidade', 'nome', nome, 'descricao', descricao, 'imagem_url', imagem,
      'atributos', jsonb_build_object(
        'reino', reino, 'populacao', populacao, 'capital', capital, 'governante', governante,
        'economia', economia, 'religiao', religiao, 'rumores', rumores
      )
    ) AS x
    FROM public.cidades WHERE historia_id = p_historia_id
    UNION ALL
    SELECT jsonb_build_object(
      'id', slug, 'tipo', 'local', 'nome', nome, 'descricao', descricao, 'imagem_url', imagem,
      'atributos', jsonb_build_object('reino', reino, 'populacao', populacao, 'rumores', rumores)
    ) AS x
    FROM public.locais WHERE historia_id = p_historia_id
    UNION ALL
    SELECT jsonb_build_object(
      'id', slug, 'tipo', 'npc', 'nome', nome, 'descricao', descricao, 'imagem_url', imagem,
      'atributos', jsonb_build_object(
        'raca', raca, 'profissao', profissao, 'deus', deus, 'origem', origem, 'cidade', cidade,
        'reino', reino, 'idade', idade, 'familia', familia, 'relacao', relacao, 'status', status,
        'rumores', rumores
      )
    ) AS x
    FROM public.npcs WHERE historia_id = p_historia_id
  ) sub;

  RETURN jsonb_build_object('ok', true, 'entradas', COALESCE(entradas, '[]'::jsonb));
END;
$function$;

CREATE OR REPLACE FUNCTION public.listar_diario_lore(p_personagem_id bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_historia_id   bigint;
  v_historia_nome text;
  entradas        jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  SELECT id, titulo INTO v_historia_id, v_historia_nome
  FROM public.historias WHERE protagonista_ids @> ARRAY[p_personagem_id];
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_historia');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.personagens WHERE id = p_personagem_id AND user_id = auth.uid())
     AND NOT EXISTS (SELECT 1 FROM public.historias WHERE id = v_historia_id AND mestre_id = auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'personagem_nao_encontrado');
  END IF;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'nome'), '[]'::jsonb) INTO entradas FROM (
    SELECT jsonb_build_object(
      'id', n.slug, 'slug', n.slug, 'tipo', 'npc',
      'nome', n.nome, 'descricao', n.descricao, 'imagem_url', n.imagem,
      'atributos', jsonb_build_object(
        'raca', n.raca, 'profissao', n.profissao, 'deus', n.deus, 'origem', n.origem,
        'cidade', n.cidade, 'reino', n.reino, 'idade', n.idade, 'familia', n.familia,
        'relacao', n.relacao, 'status', n.status, 'rumores', n.rumores
      ),
      'criado_por_personagem_id', n.criado_por_personagem_id,
      'criado_por_nome', pj.nome,
      'compartilhado', n.compartilhado
    ) AS x
    FROM public.npcs n
    LEFT JOIN public.personagens pj ON pj.id = n.criado_por_personagem_id
    WHERE n.historia_id = v_historia_id
      AND (n.criado_por_personagem_id IS NULL OR n.criado_por_personagem_id = p_personagem_id OR n.compartilhado = true)

    UNION ALL

    SELECT jsonb_build_object(
      'id', r.slug, 'slug', r.slug, 'tipo', 'reino',
      'nome', r.nome, 'descricao', r.descricao, 'imagem_url', r.icone,
      'atributos', jsonb_build_object(
        'governo', r.governo, 'cultura', r.cultura, 'resumo', r.resumo,
        'capital_cidade', r.capital, 'historia_recente', r.historia_recente, 'rumores', r.rumores
      ),
      'criado_por_personagem_id', r.criado_por_personagem_id,
      'criado_por_nome', pj.nome,
      'compartilhado', r.compartilhado
    ) AS x
    FROM public.reinos r
    LEFT JOIN public.personagens pj ON pj.id = r.criado_por_personagem_id
    WHERE r.historia_id = v_historia_id
      AND (r.criado_por_personagem_id IS NULL OR r.criado_por_personagem_id = p_personagem_id OR r.compartilhado = true)

    UNION ALL

    SELECT jsonb_build_object(
      'id', c.slug, 'slug', c.slug, 'tipo', 'cidade',
      'nome', c.nome, 'descricao', c.descricao, 'imagem_url', c.imagem,
      'atributos', jsonb_build_object(
        'reino', c.reino, 'populacao', c.populacao, 'capital', c.capital, 'governante', c.governante,
        'economia', c.economia, 'religiao', c.religiao, 'rumores', c.rumores
      ),
      'criado_por_personagem_id', c.criado_por_personagem_id,
      'criado_por_nome', pj.nome,
      'compartilhado', c.compartilhado
    ) AS x
    FROM public.cidades c
    LEFT JOIN public.personagens pj ON pj.id = c.criado_por_personagem_id
    WHERE c.historia_id = v_historia_id
      AND (c.criado_por_personagem_id IS NULL OR c.criado_por_personagem_id = p_personagem_id OR c.compartilhado = true)

    UNION ALL

    SELECT jsonb_build_object(
      'id', l.slug, 'slug', l.slug, 'tipo', 'local',
      'nome', l.nome, 'descricao', l.descricao, 'imagem_url', l.imagem,
      'atributos', jsonb_build_object('reino', l.reino, 'populacao', l.populacao, 'rumores', l.rumores),
      'criado_por_personagem_id', l.criado_por_personagem_id,
      'criado_por_nome', pj.nome,
      'compartilhado', l.compartilhado
    ) AS x
    FROM public.locais l
    LEFT JOIN public.personagens pj ON pj.id = l.criado_por_personagem_id
    WHERE l.historia_id = v_historia_id
      AND (l.criado_por_personagem_id IS NULL OR l.criado_por_personagem_id = p_personagem_id OR l.compartilhado = true)
  ) sub;

  RETURN jsonb_build_object('ok', true, 'historia_id', v_historia_id,
    'historia_nome', v_historia_nome, 'entradas', entradas);
END;
$function$;

CREATE OR REPLACE FUNCTION public.listar_diario_disponivel(p_personagem_id bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_historia_id       bigint;
  v_criatura_ids      bigint[];
  v_reino_ids         text[];
  v_cidade_ids        text[];
  v_local_ids         text[];
  v_npc_ids           text[];
  v_item_ids          text[];
  v_magia_ids         text[];
  v_habilidade_ids    text[];
  v_tecnica_ids       text[];
  v_lore_acesso_pj    jsonb;
  criaturas           jsonb;
  lore                jsonb;
  colecao             jsonb;
  memorias            jsonb;
  itens               jsonb;
  magias              jsonb;
  habilidades         jsonb;
  tecnicas            jsonb;
  v_criatura_ids_ok   bigint[];
  v_reino_ids_ok      text[];
  v_cidade_ids_ok     text[];
  v_local_ids_ok      text[];
  v_npc_ids_ok        text[];
  v_item_ids_ok       text[];
  v_magia_ids_ok      text[];
  v_habilidade_ids_ok text[];
  v_tecnica_ids_ok    text[];
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.personagens WHERE id = p_personagem_id AND user_id = auth.uid())
     AND NOT EXISTS (SELECT 1 FROM public.historias WHERE protagonista_ids @> ARRAY[p_personagem_id] AND mestre_id = auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'pj_nao_encontrado');
  END IF;

  SELECT id, criatura_ids, reino_ids, cidade_ids, local_ids, npc_ids,
         item_ids, magia_ids, habilidade_ids, tecnica_ids,
         COALESCE(lore_acesso_pj, '{}'::jsonb)
  INTO v_historia_id, v_criatura_ids, v_reino_ids, v_cidade_ids, v_local_ids, v_npc_ids,
       v_item_ids, v_magia_ids, v_habilidade_ids, v_tecnica_ids, v_lore_acesso_pj
  FROM public.historias
  WHERE protagonista_ids @> ARRAY[p_personagem_id];
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_historia');
  END IF;

  -- Chave ausente em lore_acesso_pj = todos veem; presente = só os listados.
  SELECT COALESCE(array_agg(cid), '{}'::bigint[]) INTO v_criatura_ids_ok
  FROM unnest(COALESCE(v_criatura_ids, '{}'::bigint[])) AS cid
  WHERE NOT v_lore_acesso_pj ? ('criatura:' || cid::text)
     OR (v_lore_acesso_pj -> ('criatura:' || cid::text)) @> to_jsonb(p_personagem_id);

  SELECT COALESCE(array_agg(sid), '{}'::text[]) INTO v_reino_ids_ok
  FROM unnest(COALESCE(v_reino_ids, '{}'::text[])) AS sid
  WHERE NOT v_lore_acesso_pj ? ('reino:' || sid)
     OR (v_lore_acesso_pj -> ('reino:' || sid)) @> to_jsonb(p_personagem_id);

  SELECT COALESCE(array_agg(sid), '{}'::text[]) INTO v_cidade_ids_ok
  FROM unnest(COALESCE(v_cidade_ids, '{}'::text[])) AS sid
  WHERE NOT v_lore_acesso_pj ? ('cidade:' || sid)
     OR (v_lore_acesso_pj -> ('cidade:' || sid)) @> to_jsonb(p_personagem_id);

  SELECT COALESCE(array_agg(sid), '{}'::text[]) INTO v_local_ids_ok
  FROM unnest(COALESCE(v_local_ids, '{}'::text[])) AS sid
  WHERE NOT v_lore_acesso_pj ? ('local:' || sid)
     OR (v_lore_acesso_pj -> ('local:' || sid)) @> to_jsonb(p_personagem_id);

  SELECT COALESCE(array_agg(sid), '{}'::text[]) INTO v_npc_ids_ok
  FROM unnest(COALESCE(v_npc_ids, '{}'::text[])) AS sid
  WHERE NOT v_lore_acesso_pj ? ('npc:' || sid)
     OR (v_lore_acesso_pj -> ('npc:' || sid)) @> to_jsonb(p_personagem_id);

  SELECT COALESCE(array_agg(sid), '{}'::text[]) INTO v_item_ids_ok
  FROM unnest(COALESCE(v_item_ids, '{}'::text[])) AS sid
  WHERE NOT v_lore_acesso_pj ? ('item:' || sid)
     OR (v_lore_acesso_pj -> ('item:' || sid)) @> to_jsonb(p_personagem_id);

  SELECT COALESCE(array_agg(sid), '{}'::text[]) INTO v_magia_ids_ok
  FROM unnest(COALESCE(v_magia_ids, '{}'::text[])) AS sid
  WHERE NOT v_lore_acesso_pj ? ('magia:' || sid)
     OR (v_lore_acesso_pj -> ('magia:' || sid)) @> to_jsonb(p_personagem_id);

  SELECT COALESCE(array_agg(sid), '{}'::text[]) INTO v_habilidade_ids_ok
  FROM unnest(COALESCE(v_habilidade_ids, '{}'::text[])) AS sid
  WHERE NOT v_lore_acesso_pj ? ('habilidade:' || sid)
     OR (v_lore_acesso_pj -> ('habilidade:' || sid)) @> to_jsonb(p_personagem_id);

  SELECT COALESCE(array_agg(sid), '{}'::text[]) INTO v_tecnica_ids_ok
  FROM unnest(COALESCE(v_tecnica_ids, '{}'::text[])) AS sid
  WHERE NOT v_lore_acesso_pj ? ('tecnica:' || sid)
     OR (v_lore_acesso_pj -> ('tecnica:' || sid)) @> to_jsonb(p_personagem_id);

  SELECT COALESCE(jsonb_agg(to_jsonb(c)), '[]'::jsonb) INTO criaturas
  FROM public.criaturas c WHERE c.id = ANY (v_criatura_ids_ok);

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'nome'), '[]'::jsonb) INTO lore FROM (
    SELECT jsonb_build_object(
      'id', slug, 'tipo', 'reino', 'nome', nome, 'descricao', descricao, 'imagem_url', icone,
      'atributos', jsonb_build_object(
        'governo', governo, 'cultura', cultura, 'resumo', resumo,
        'capital_cidade', capital, 'historia_recente', historia_recente, 'rumores', rumores
      )
    ) AS x
    FROM public.reinos WHERE slug = ANY (v_reino_ids_ok)
    UNION ALL
    SELECT jsonb_build_object(
      'id', slug, 'tipo', 'cidade', 'nome', nome, 'descricao', descricao, 'imagem_url', imagem,
      'atributos', jsonb_build_object(
        'reino', reino, 'populacao', populacao, 'capital', capital, 'governante', governante,
        'economia', economia, 'religiao', religiao, 'rumores', rumores
      )
    ) AS x
    FROM public.cidades WHERE slug = ANY (v_cidade_ids_ok)
    UNION ALL
    SELECT jsonb_build_object(
      'id', slug, 'tipo', 'local', 'nome', nome, 'descricao', descricao, 'imagem_url', imagem,
      'atributos', jsonb_build_object('reino', reino, 'populacao', populacao, 'rumores', rumores)
    ) AS x
    FROM public.locais WHERE slug = ANY (v_local_ids_ok)
    UNION ALL
    SELECT jsonb_build_object(
      'id', slug, 'tipo', 'npc', 'nome', nome, 'descricao', descricao, 'imagem_url', imagem,
      'atributos', jsonb_build_object(
        'raca', raca, 'profissao', profissao, 'deus', deus, 'origem', origem, 'cidade', cidade,
        'reino', reino, 'idade', idade, 'familia', familia, 'relacao', relacao, 'status', status,
        'rumores', rumores
      )
    ) AS x
    FROM public.npcs WHERE slug = ANY (v_npc_ids_ok)
  ) sub;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'nome'), '[]'::jsonb) INTO itens FROM (
    SELECT to_jsonb(ih) || jsonb_build_object('tipo', 'item', 'campanha', true) AS x
    FROM public.itens_historia ih
    WHERE ih.historia_id = v_historia_id AND ih.nome = ANY (v_item_ids_ok)
    UNION ALL
    SELECT to_jsonb(i) || jsonb_build_object('tipo', 'item') AS x
    FROM public.itens i
    WHERE i.nome = ANY (v_item_ids_ok)
      AND NOT EXISTS (SELECT 1 FROM public.itens_historia ih2 WHERE ih2.historia_id = v_historia_id AND ih2.nome = i.nome)
  ) sub;

  SELECT COALESCE(jsonb_agg(to_jsonb(m) || jsonb_build_object('tipo', 'magia') ORDER BY m.nome), '[]'::jsonb)
  INTO magias FROM public.magias m WHERE m.nome = ANY (v_magia_ids_ok);

  SELECT COALESCE(jsonb_agg(to_jsonb(h) || jsonb_build_object('tipo', 'habilidade') ORDER BY h.nome), '[]'::jsonb)
  INTO habilidades FROM public.habilidades h WHERE h.nome = ANY (v_habilidade_ids_ok);

  SELECT COALESCE(jsonb_agg(to_jsonb(t) || jsonb_build_object('tipo', 'tecnica') ORDER BY t.nome), '[]'::jsonb)
  INTO tecnicas FROM public.tecnicas t WHERE t.nome = ANY (v_tecnica_ids_ok);

  SELECT COALESCE(jsonb_agg(to_jsonb(d) || jsonb_build_object('diario_entrada_id', d.id)), '[]'::jsonb)
  INTO colecao FROM public.diario_entradas d
  WHERE d.personagem_id = p_personagem_id AND d.tipo <> 'memoria';

  SELECT COALESCE(jsonb_agg(to_jsonb(m)), '[]'::jsonb) INTO memorias
  FROM public.diario_entradas m
  WHERE m.personagem_id = p_personagem_id AND m.tipo = 'memoria';

  RETURN jsonb_build_object(
    'ok', true, 'criaturas', criaturas, 'lore', lore, 'itens', itens, 'magias', magias,
    'habilidades', habilidades, 'tecnicas', tecnicas, 'colecao', colecao, 'memorias', memorias
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.salvar_lore_entrada(p_id text DEFAULT NULL::text, p_historia_id bigint DEFAULT NULL::bigint, p_tipo text DEFAULT NULL::text, p_nome text DEFAULT NULL::text, p_descricao text DEFAULT NULL::text, p_imagem_url text DEFAULT NULL::text, p_atributos jsonb DEFAULT '{}'::jsonb, p_slug_origem text DEFAULT NULL::text, p_criado_por_personagem_id bigint DEFAULT NULL::bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  alvo_historia_id bigint;
  slug_base        text;
  resultado        jsonb;
  alvo_slug        text;
  eh_global        boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  IF p_tipo NOT IN ('reino', 'cidade', 'local', 'npc') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'tipo_invalido');
  END IF;

  IF p_nome IS NULL OR btrim(p_nome) = '' THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nome_obrigatorio');
  END IF;

  -- 26/09/2026: cidade nova precisa de um reino (cidades.reino é FK e NOT NULL).
  -- Local não: o reino é opcional (22/10/2026).
  IF p_tipo = 'cidade' AND p_id IS NULL AND NULLIF(btrim(p_atributos->>'reino'), '') IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'reino_obrigatorio');
  END IF;

  -- 26/09/2026 — admin sem aventura: o mundo (historia_id NULL).
  IF NOT (p_historia_id IS NULL AND public.eh_admin()) AND NOT EXISTS (
    SELECT 1 FROM public.historias WHERE id = p_historia_id AND mestre_id = auth.uid()
  ) AND NOT (
    p_criado_por_personagem_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.personagens pj
      JOIN public.historias h ON h.protagonista_ids @> ARRAY[pj.id]
      WHERE pj.id = p_criado_por_personagem_id AND pj.user_id = auth.uid() AND h.id = p_historia_id
    )
  ) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao_historia');
  END IF;

  IF p_id IS NOT NULL THEN
    SELECT historia_id INTO alvo_historia_id FROM (
      SELECT historia_id FROM public.reinos  WHERE slug = p_id AND p_tipo = 'reino'
      UNION ALL
      SELECT historia_id FROM public.cidades WHERE slug = p_id AND p_tipo = 'cidade'
      UNION ALL
      SELECT historia_id FROM public.locais  WHERE slug = p_id AND p_tipo = 'local'
      UNION ALL
      SELECT historia_id FROM public.npcs    WHERE slug = p_id AND p_tipo = 'npc'
    ) sub LIMIT 1;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'entrada_nao_encontrada');
    END IF;
    eh_global := alvo_historia_id IS NULL;
  END IF;

  -- ADMIN edita a entrada do MUNDO direto, sem cópia (26/09/2026)
  IF p_id IS NOT NULL AND eh_global AND public.eh_admin() THEN
    IF p_tipo = 'reino' THEN
      UPDATE public.reinos SET
        nome = p_nome,
        icone = COALESCE(p_imagem_url, icone),
        descricao = p_descricao,
        governo = p_atributos->>'governo',
        cultura = p_atributos->>'cultura',
        historia_recente = p_atributos->>'historia_recente',
        rumores = CASE WHEN p_atributos ? 'rumores' THEN p_atributos->>'rumores' ELSE rumores END,
        updated_at = now()
      WHERE slug = p_id AND historia_id IS NULL;
    ELSIF p_tipo = 'cidade' THEN
      UPDATE public.cidades SET
        nome = p_nome,
        imagem = COALESCE(p_imagem_url, imagem),
        descricao = p_descricao,
        populacao = NULLIF(p_atributos->>'populacao', '')::integer,
        capital = COALESCE((p_atributos->>'capital')::boolean, capital),
        reino = p_atributos->>'reino',
        updated_at = now()
      WHERE slug = p_id AND historia_id IS NULL;
    ELSIF p_tipo = 'local' THEN
      UPDATE public.locais SET
        nome = p_nome,
        imagem = COALESCE(p_imagem_url, imagem),
        descricao = p_descricao,
        populacao = NULLIF(p_atributos->>'populacao', '')::integer,
        reino = NULLIF(p_atributos->>'reino', ''),
        updated_at = now()
      WHERE slug = p_id AND historia_id IS NULL;
    ELSE
      UPDATE public.npcs SET
        nome = p_nome,
        imagem = COALESCE(p_imagem_url, imagem),
        raca = p_atributos->>'raca',
        profissao = p_atributos->>'profissao',
        deus = p_atributos->>'deus',
        descricao = p_descricao,
        origem = p_atributos->>'origem',
        cidade = p_atributos->>'cidade',
        updated_at = now()
      WHERE slug = p_id AND historia_id IS NULL;
    END IF;
    alvo_slug := p_id;
    resultado := jsonb_build_object('ok', true, 'entrada', jsonb_build_object('slug', p_id), 'editou_mundo', true);

  ELSIF p_id IS NOT NULL AND alvo_historia_id IS NOT NULL THEN
    IF p_tipo = 'reino' THEN
      resultado := editar_copia_reino(p_id, p_nome, p_imagem_url, p_descricao,
        p_atributos->>'governo', p_atributos->>'cultura', p_atributos->>'historia_recente');
      IF p_atributos ? 'rumores' THEN
        UPDATE public.reinos SET rumores = p_atributos->>'rumores' WHERE slug = p_id;
      END IF;
    ELSIF p_tipo = 'cidade' THEN
      resultado := editar_copia_cidade(p_id, p_nome, p_imagem_url,
        (p_atributos->>'populacao')::integer, p_descricao,
        (p_atributos->>'capital')::boolean, p_atributos->>'reino');
    ELSIF p_tipo = 'local' THEN
      resultado := editar_copia_local(p_id, p_nome, p_imagem_url,
        NULLIF(p_atributos->>'populacao', '')::integer, p_descricao, p_atributos->>'reino');
    ELSE
      resultado := editar_copia_npc(p_id, p_nome, p_imagem_url, p_atributos->>'raca',
        p_atributos->>'profissao', p_atributos->>'deus', p_descricao,
        p_atributos->>'origem', p_atributos->>'cidade');
    END IF;
    alvo_slug := p_id;

  -- 26/09/2026 — admin sem aventura: CRIA a entrada do mundo.
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
        COALESCE((p_atributos->>'capital')::boolean, false), p_atributos->>'reino', NULL, auth.uid());
    ELSIF p_tipo = 'local' THEN
      INSERT INTO public.locais (slug, nome, imagem, populacao, descricao, reino, historia_id, criado_por)
      VALUES (alvo_slug, p_nome, p_imagem_url, NULLIF(p_atributos->>'populacao', '')::integer, p_descricao,
        NULLIF(p_atributos->>'reino', ''), NULL, auth.uid());
    ELSE
      INSERT INTO public.npcs (slug, nome, imagem, raca, profissao, deus, descricao, origem, cidade, historia_id, criado_por)
      VALUES (alvo_slug, p_nome, p_imagem_url, p_atributos->>'raca', p_atributos->>'profissao', p_atributos->>'deus',
        p_descricao, p_atributos->>'origem', p_atributos->>'cidade', NULL, auth.uid());
    END IF;
    resultado := jsonb_build_object('ok', true, 'entrada', jsonb_build_object('slug', alvo_slug), 'criou_mundo', true);

  ELSE
    IF p_id IS NOT NULL THEN
      slug_base := p_id;
    ELSIF p_slug_origem IS NOT NULL THEN
      slug_base := p_slug_origem;
    ELSE
      slug_base := CASE p_tipo
        WHEN 'reino'  THEN 'novo-reino'
        WHEN 'cidade' THEN 'nova-cidade'
        WHEN 'local'  THEN 'novo-local'
        ELSE 'novo-npc'
      END;
    END IF;

    IF p_tipo = 'reino' THEN
      resultado := criar_copia_reino(p_historia_id, slug_base, p_nome, p_imagem_url,
        p_descricao, p_atributos->>'governo', p_atributos->>'cultura', p_atributos->>'historia_recente');
    ELSIF p_tipo = 'cidade' THEN
      resultado := criar_copia_cidade(p_historia_id, slug_base, p_nome, p_imagem_url,
        (p_atributos->>'populacao')::integer, p_descricao,
        (p_atributos->>'capital')::boolean, p_atributos->>'reino');
    ELSIF p_tipo = 'local' THEN
      resultado := criar_copia_local(p_historia_id, slug_base, p_nome, p_imagem_url,
        NULLIF(p_atributos->>'populacao', '')::integer, p_descricao, p_atributos->>'reino');
    ELSE
      resultado := criar_copia_npc(p_historia_id, slug_base, p_nome, p_imagem_url,
        p_atributos->>'raca', p_atributos->>'profissao', p_atributos->>'deus', p_descricao,
        p_atributos->>'origem', p_atributos->>'cidade');
    END IF;
    alvo_slug := resultado->'entrada'->>'slug';

    IF p_criado_por_personagem_id IS NOT NULL AND resultado IS NOT NULL AND (resultado->>'ok') = 'true' THEN
      IF p_tipo = 'reino' THEN
        UPDATE public.reinos
        SET criado_por_personagem_id = p_criado_por_personagem_id,
            rumores = COALESCE(p_atributos->>'rumores', rumores)
        WHERE historia_id = p_historia_id AND nome = p_nome AND criado_por_personagem_id IS NULL;
      ELSIF p_tipo = 'cidade' THEN
        UPDATE public.cidades SET criado_por_personagem_id = p_criado_por_personagem_id
        WHERE historia_id = p_historia_id AND nome = p_nome AND criado_por_personagem_id IS NULL;
      ELSIF p_tipo = 'local' THEN
        UPDATE public.locais SET criado_por_personagem_id = p_criado_por_personagem_id
        WHERE slug = alvo_slug AND criado_por_personagem_id IS NULL;
      ELSE
        UPDATE public.npcs SET criado_por_personagem_id = p_criado_por_personagem_id
        WHERE historia_id = p_historia_id AND nome = p_nome AND criado_por_personagem_id IS NULL;
      END IF;
    END IF;
  END IF;

  -- Campos que as funções de cópia não conhecem (26/09/2026)
  IF alvo_slug IS NOT NULL AND resultado IS NOT NULL AND (resultado->>'ok') = 'true' THEN
    IF p_tipo = 'reino' THEN
      UPDATE public.reinos SET
        resumo = CASE WHEN p_atributos ? 'resumo' THEN NULLIF(p_atributos->>'resumo', '') ELSE resumo END,
        capital = CASE WHEN p_atributos ? 'capital_cidade' THEN NULLIF(p_atributos->>'capital_cidade', '') ELSE capital END
      WHERE slug = alvo_slug;
    ELSIF p_tipo = 'cidade' THEN
      UPDATE public.cidades SET
        governante = CASE WHEN p_atributos ? 'governante' THEN NULLIF(p_atributos->>'governante', '') ELSE governante END,
        economia = CASE WHEN p_atributos ? 'economia' THEN NULLIF(p_atributos->>'economia', '') ELSE economia END,
        religiao = CASE WHEN p_atributos ? 'religiao' THEN NULLIF(p_atributos->>'religiao', '') ELSE religiao END,
        rumores = CASE WHEN p_atributos ? 'rumores' THEN NULLIF(p_atributos->>'rumores', '') ELSE rumores END
      WHERE slug = alvo_slug;
    ELSIF p_tipo = 'local' THEN
      UPDATE public.locais SET
        rumores = CASE WHEN p_atributos ? 'rumores' THEN NULLIF(p_atributos->>'rumores', '') ELSE rumores END
      WHERE slug = alvo_slug;
    ELSIF p_tipo = 'npc' THEN
      UPDATE public.npcs SET
        reino   = CASE WHEN p_atributos ? 'reino'   THEN NULLIF(p_atributos->>'reino', '')   ELSE reino   END,
        idade   = CASE WHEN p_atributos ? 'idade'   THEN NULLIF(p_atributos->>'idade', '')   ELSE idade   END,
        familia = CASE WHEN p_atributos ? 'familia' THEN NULLIF(p_atributos->>'familia', '') ELSE familia END,
        relacao = CASE WHEN p_atributos ? 'relacao' THEN NULLIF(p_atributos->>'relacao', '') ELSE relacao END,
        status  = CASE WHEN p_atributos ? 'status'  THEN NULLIF(p_atributos->>'status', '')  ELSE status  END,
        rumores = CASE WHEN p_atributos ? 'rumores' THEN NULLIF(p_atributos->>'rumores', '') ELSE rumores END
      WHERE slug = alvo_slug;
    END IF;
  END IF;

  RETURN resultado;
END;
$function$;

-- ── Defesas: fora (nenhuma cidade tinha o campo preenchido em 22/10/2026) ──
ALTER TABLE public.cidades DROP COLUMN IF EXISTS defesas;

-- As novas funções seguem o padrão das irmãs: só usuário autenticado chama.
REVOKE EXECUTE ON FUNCTION public.criar_copia_local(bigint, text, text, text, integer, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.editar_copia_local(text, text, text, integer, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.excluir_copia_local(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.criar_copia_local(bigint, text, text, text, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.editar_copia_local(text, text, text, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.excluir_copia_local(text) TO authenticated;

COMMIT;
