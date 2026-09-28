-- lore-cidade-campos-2026-09-26.sql
--
-- "Adicione um menu novo no diário chamado 'cidades', com campos
--  interessantes para preencher, e um campo para selecionar qual reino."
-- (usuário, 26/09/2026). Campos escolhidos no mesmo dia: Governante, Economia,
-- Defesas e Religião. Reino, População e Capital já existiam.
--
-- E um conserto achado no caminho: cidades.rumores existia mas nenhuma função
-- a gravava nem a devolvia. Agora grava e volta nas quatro leituras.
--
-- Mesmo método de lore-reino-resumo-npc-campos-2026-09-26.sql: as leituras
-- ganham os campos por regexp_replace sobre a definição atual, e a migração
-- para com erro se algum padrão não for encontrado.
--
-- REVERTER: alter table public.cidades drop column governante, drop column
--   economia, drop column defesas, drop column religiao; e recriar as cinco
--   funções a partir do histórico.

alter table public.cidades
  add column if not exists governante text,
  add column if not exists economia   text,
  add column if not exists defesas    text,
  add column if not exists religiao   text;

do $$
declare
  f text;
  def text;
  novo text;
begin
  -- Leituras: os campos da cidade depois de 'capital' (com ou sem o alias c.)
  foreach f in array array[
    'public.listar_lore_historia(bigint)',
    'public.listar_catalogo_global(text)',
    'public.listar_diario_disponivel(bigint)',
    'public.listar_diario_lore(bigint)'
  ] loop
    def := pg_get_functiondef(f::regprocedure);
    novo := regexp_replace(def,
      '''capital'',(\s*)(c\.)?capital',
      '''capital'',\1\2capital, ''governante'', \2governante, ''economia'', \2economia, ''defesas'', \2defesas, ''religiao'', \2religiao, ''rumores'', \2rumores', 'g');
    if novo = def then raise exception 'cidade: padrão não encontrado em %', f; end if;
    execute novo;
  end loop;

  -- Gravação: a cidade ganha o seu bloco de campos extras, antes do do NPC
  def := pg_get_functiondef('public.salvar_lore_entrada(text,bigint,text,text,text,text,jsonb,text,bigint)'::regprocedure);
  novo := regexp_replace(def,
    '(\s*)ELSIF p_tipo = ''npc'' THEN(\s*)UPDATE public\.npcs SET(\s*)reino',
    '\1ELSIF p_tipo = ''cidade'' THEN\2UPDATE public.cidades SET\3governante = CASE WHEN p_atributos ? ''governante'' THEN NULLIF(p_atributos->>''governante'', '''') ELSE governante END,\3economia = CASE WHEN p_atributos ? ''economia'' THEN NULLIF(p_atributos->>''economia'', '''') ELSE economia END,\3defesas = CASE WHEN p_atributos ? ''defesas'' THEN NULLIF(p_atributos->>''defesas'', '''') ELSE defesas END,\3religiao = CASE WHEN p_atributos ? ''religiao'' THEN NULLIF(p_atributos->>''religiao'', '''') ELSE religiao END,\3rumores = CASE WHEN p_atributos ? ''rumores'' THEN NULLIF(p_atributos->>''rumores'', '''') ELSE rumores END\2WHERE slug = alvo_slug;\1ELSIF p_tipo = ''npc'' THEN\2UPDATE public.npcs SET\3reino');
  if novo = def then raise exception 'salvar_lore_entrada: padrão não encontrado'; end if;
  execute novo;
end $$;
