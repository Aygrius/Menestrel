-- lore-reino-resumo-npc-campos-2026-09-26.sql
--
-- Pedidos do usuário (26/09/2026):
--   "No modal de editar reino, vamos mudar a forma como a entrada é feita.
--    Não faremos mais uma cópia, vamos editar realmente a entrada."
--     → decidido no mesmo dia: SÓ O ADMIN edita a entrada do mundo direto;
--       um mestre comum que edita uma entrada do mundo continua ganhando uma
--       cópia da mesa dele (o catálogo do mundo é de todas as mesas).
--   "No modal de editar reino, adicione um campo para resumo."
--   "No modal conhecidos, adicione um campo para vincular o personagem a um reino."
--
-- E um conserto achado no caminho: o formulário de Conhecido tinha Idade,
-- Família, Relação, Status e Rumores, mas `npcs` não tinha essas colunas —
-- salvar_lore_entrada as recebia em p_atributos e jogava fora. Agora têm
-- coluna, são gravadas e voltam nas quatro leituras.
--
-- As quatro funções de LEITURA montam os atributos campo a campo; em vez de
-- reescrevê-las inteiras, o bloco DO abaixo acrescenta os campos novos na
-- definição atual de cada uma (regexp_replace) e confere que a troca pegou —
-- se o texto de alguma tiver mudado, a migração para com erro em vez de
-- aplicar pela metade.
--
-- REVERTER: recriar as cinco funções a partir do backup em pg_proc (ou do
-- histórico deste repositório) e
--   alter table public.reinos drop column resumo;
--   alter table public.npcs drop column reino, drop column idade,
--     drop column familia, drop column relacao, drop column status,
--     drop column rumores;

alter table public.reinos add column if not exists resumo text;
alter table public.npcs
  add column if not exists reino   text,
  add column if not exists idade   text,
  add column if not exists familia text,
  add column if not exists relacao text,
  add column if not exists status  text,
  add column if not exists rumores text;

-- ── Leituras: os campos novos entram em `atributos` ──────────────────────
do $$
declare
  f text;
  def text;
  novo text;
begin
  foreach f in array array[
    'public.listar_lore_historia(bigint)',
    'public.listar_catalogo_global(text)',
    'public.listar_diario_disponivel(bigint)',
    'public.listar_diario_lore(bigint)'
  ] loop
    def := pg_get_functiondef(f::regprocedure);
    -- reino: 'resumo' antes de 'historia_recente' (com ou sem o alias r.)
    novo := regexp_replace(def,
      '''historia_recente'',(\s*)(r\.)?historia_recente',
      '''resumo'', \2resumo,\1''historia_recente'',\1\2historia_recente', 'g');
    if novo = def then raise exception 'reino: padrão não encontrado em %', f; end if;
    def := novo;
    -- npc: os seis campos depois de 'cidade' (com ou sem o alias n.)
    novo := regexp_replace(def,
      '''cidade'',(\s*)(n\.)?cidade(\s*)\)',
      '''cidade'',\1\2cidade, ''reino'', \2reino, ''idade'', \2idade, ''familia'', \2familia, ''relacao'', \2relacao, ''status'', \2status, ''rumores'', \2rumores\3)', 'g');
    if novo = def then raise exception 'npc: padrão não encontrado em %', f; end if;
    execute novo;
  end loop;
end $$;

-- ── Gravação ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.salvar_lore_entrada(p_id text DEFAULT NULL::text, p_historia_id bigint DEFAULT NULL::bigint, p_tipo text DEFAULT NULL::text, p_nome text DEFAULT NULL::text, p_descricao text DEFAULT NULL::text, p_imagem_url text DEFAULT NULL::text, p_atributos jsonb DEFAULT '{}'::jsonb, p_slug_origem text DEFAULT NULL::text, p_criado_por_personagem_id bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF p_tipo NOT IN ('reino', 'cidade', 'npc') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'tipo_invalido');
  END IF;

  IF p_nome IS NULL OR btrim(p_nome) = '' THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nome_obrigatorio');
  END IF;

  -- ── Permissão: mestre da história OU protagonista ──────────
  IF NOT EXISTS (
    SELECT 1 FROM public.historias
    WHERE id = p_historia_id AND mestre_id = auth.uid()
  ) AND NOT (
    p_criado_por_personagem_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.personagens pj
      JOIN public.historias h ON h.protagonista_ids @> ARRAY[pj.id]
      WHERE pj.id = p_criado_por_personagem_id
        AND pj.user_id = auth.uid()
        AND h.id = p_historia_id
    )
  ) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao_historia');
  END IF;

  -- ── Descobrir se p_id é cópia da história ou entrada do mundo ─
  IF p_id IS NOT NULL THEN
    SELECT historia_id INTO alvo_historia_id FROM (
      SELECT historia_id FROM public.reinos WHERE slug = p_id AND p_tipo = 'reino'
      UNION ALL
      SELECT historia_id FROM public.cidades WHERE slug = p_id AND p_tipo = 'cidade'
      UNION ALL
      SELECT historia_id FROM public.npcs    WHERE slug = p_id AND p_tipo = 'npc'
    ) sub LIMIT 1;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'entrada_nao_encontrada');
    END IF;
    eh_global := alvo_historia_id IS NULL;
  END IF;

  -- ── ADMIN edita a entrada do MUNDO direto, sem cópia (26/09/2026) ──
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

  -- ── Editar cópia existente ──────────────────────────────────
  ELSIF p_id IS NOT NULL AND alvo_historia_id IS NOT NULL THEN
    IF p_tipo = 'reino' THEN
      resultado := editar_copia_reino(p_id, p_nome, p_imagem_url, p_descricao,
        p_atributos->>'governo', p_atributos->>'cultura', p_atributos->>'historia_recente');
      -- rumores: editar_copia_reino não tem esse parâmetro; atualiza direto
      IF p_atributos ? 'rumores' THEN
        UPDATE public.reinos SET rumores = p_atributos->>'rumores' WHERE slug = p_id;
      END IF;
    ELSIF p_tipo = 'cidade' THEN
      resultado := editar_copia_cidade(p_id, p_nome, p_imagem_url,
        (p_atributos->>'populacao')::integer, p_descricao,
        (p_atributos->>'capital')::boolean, p_atributos->>'reino');
    ELSE
      resultado := editar_copia_npc(p_id, p_nome, p_imagem_url, p_atributos->>'raca',
        p_atributos->>'profissao', p_atributos->>'deus', p_descricao,
        p_atributos->>'origem', p_atributos->>'cidade');
    END IF;
    alvo_slug := p_id;

  -- ── Criar nova cópia (fork ou do zero) ─────────────────────
  ELSE
    IF p_id IS NOT NULL THEN
      slug_base := p_id;
    ELSIF p_slug_origem IS NOT NULL THEN
      slug_base := p_slug_origem;
    ELSE
      slug_base := CASE p_tipo
        WHEN 'reino'  THEN 'novo-reino'
        WHEN 'cidade' THEN 'nova-cidade'
        ELSE 'novo-npc'
      END;
    END IF;

    IF p_tipo = 'reino' THEN
      resultado := criar_copia_reino(p_historia_id, slug_base, p_nome, p_imagem_url,
        p_descricao, p_atributos->>'governo', p_atributos->>'cultura',
        p_atributos->>'historia_recente');
    ELSIF p_tipo = 'cidade' THEN
      resultado := criar_copia_cidade(p_historia_id, slug_base, p_nome, p_imagem_url,
        (p_atributos->>'populacao')::integer, p_descricao,
        (p_atributos->>'capital')::boolean, p_atributos->>'reino');
    ELSE
      resultado := criar_copia_npc(p_historia_id, slug_base, p_nome, p_imagem_url,
        p_atributos->>'raca', p_atributos->>'profissao', p_atributos->>'deus', p_descricao,
        p_atributos->>'origem', p_atributos->>'cidade');
    END IF;
    alvo_slug := resultado->'entrada'->>'slug';

    -- Marcar o autor jogador na linha recém-criada
    -- (usa nome + historia_id porque o slug gerado por criar_copia_* é interno)
    IF p_criado_por_personagem_id IS NOT NULL
       AND resultado IS NOT NULL
       AND (resultado->>'ok') = 'true'
    THEN
      IF p_tipo = 'reino' THEN
        UPDATE public.reinos
        SET criado_por_personagem_id = p_criado_por_personagem_id,
            rumores = COALESCE(p_atributos->>'rumores', rumores)
        WHERE historia_id = p_historia_id
          AND nome = p_nome
          AND criado_por_personagem_id IS NULL;
      ELSIF p_tipo = 'cidade' THEN
        UPDATE public.cidades
        SET criado_por_personagem_id = p_criado_por_personagem_id
        WHERE historia_id = p_historia_id
          AND nome = p_nome
          AND criado_por_personagem_id IS NULL;
      ELSE
        UPDATE public.npcs
        SET criado_por_personagem_id = p_criado_por_personagem_id
        WHERE historia_id = p_historia_id
          AND nome = p_nome
          AND criado_por_personagem_id IS NULL;
      END IF;
    END IF;
  END IF;

  -- ── Campos que as funções de cópia não conhecem (26/09/2026) ──
  -- Chave presente em p_atributos = gravar (vazio vira NULL); ausente = manter.
  IF alvo_slug IS NOT NULL AND resultado IS NOT NULL AND (resultado->>'ok') = 'true' THEN
    IF p_tipo = 'reino' THEN
      UPDATE public.reinos SET
        resumo = CASE WHEN p_atributos ? 'resumo' THEN NULLIF(p_atributos->>'resumo', '') ELSE resumo END
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
