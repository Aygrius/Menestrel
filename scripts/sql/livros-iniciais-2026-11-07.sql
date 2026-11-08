-- scripts/sql/livros-iniciais-2026-11-07.sql
-- ============================================================
-- LIVRO INICIAL DA PROFISSÃO (07/11/2026).
--
-- Pedido do usuário: "quero um livro com 10 magias, 10 técnicas e 10
-- habilidades" por profissão. Decisões do mesmo dia:
--   • um livro por profissão; o Sacerdote ganha UM POR DEUS (13 livros);
--   • o livro entra no inventário quando o personagem nasce;
--   • aprender por ele gasta pontos como o "Estudar" de sempre;
--   • o livro inicial ensina também HABILIDADE ("as 10 mais características
--     da profissão, por exemplo Religião para Sacerdote, Arte para Bardo,
--     Rastrear para Rastreador").
--
-- O que este script faz:
--   1. livro_habilidades (livro_slug, habilidade_key) — o vínculo que faltava:
--      magia e técnica já se ligam ao livro por livro_pergaminhos.
--   2. 18 itens livro_inicial_<profissão|deus>.
--   3. Os vínculos: 10 magias e 10 técnicas em livro_pergaminhos (pelo
--      pergaminho de cada uma) e 10 habilidades em livro_habilidades.
--   4. aprender_habilidade(pj, instance, key) — mesmas recusas e mesma ordem
--      da parte de habilidade de subir_nivel (subir-nivel-2026-11-05.sql),
--      mais as do item (não está no inventário, à venda, não ensina).
--      Sem nível: fila de 12 h em 'treinando'. Com nível: sobe na hora.
--   5. Gatilho personagens_livro_inicial — no INSERT, põe o livro da
--      profissão (Sacerdote: o do deus) no inventário.
--
-- REVERTER:
--   DROP TRIGGER personagens_livro_inicial ON public.personagens;
--   DROP FUNCTION public._menestrel_livro_inicial();
--   DROP FUNCTION public.aprender_habilidade(bigint, text, text);
--   DELETE FROM public.itens WHERE slug LIKE 'livro_inicial_%';  -- cascata nos vínculos
--   DROP TABLE public.livro_habilidades;
-- ============================================================
BEGIN;

-- 1. Livro → habilidade.
CREATE TABLE IF NOT EXISTS public.livro_habilidades (
  livro_slug     text NOT NULL REFERENCES public.itens(slug) ON UPDATE CASCADE ON DELETE CASCADE,
  habilidade_key text NOT NULL REFERENCES public.habilidades(key) ON UPDATE CASCADE ON DELETE CASCADE,
  PRIMARY KEY (livro_slug, habilidade_key)
);
ALTER TABLE public.livro_habilidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS livro_habilidades_leitura ON public.livro_habilidades;
CREATE POLICY livro_habilidades_leitura ON public.livro_habilidades FOR SELECT USING (true);
DROP POLICY IF EXISTS livro_habilidades_admin_insert ON public.livro_habilidades;
CREATE POLICY livro_habilidades_admin_insert ON public.livro_habilidades FOR INSERT WITH CHECK (eh_admin());
DROP POLICY IF EXISTS livro_habilidades_admin_delete ON public.livro_habilidades;
CREATE POLICY livro_habilidades_admin_delete ON public.livro_habilidades FOR DELETE USING (eh_admin());

-- 2 e 3. Os livros e o que cada um ensina.
CREATE TEMP TABLE _li_escolhas (prof text, tipo text, nome text) ON COMMIT DROP;
INSERT INTO _li_escolhas
SELECT p, tipo, unnest(nomes) FROM (VALUES
 ('Guerreiro','m', array['Armadura Elemental','Geoproteção','Piroproteção','Respiração Arcana','Detecção de Magia','Graça Felina','Garras','Olhar de Predador','Vigília','Sobrevivente']),
 ('Guerreiro','t', array['Ataque Oportuno','Carga','Concentração','Esquiva','Luta às Cegas','Segundo Fôlego','Escolta','Aparar','Desviar','Dano Agravado']),
 ('Guerreiro','h', array['Militarismo','Esforçar','Correr','Escalar','Montar','Nadar','Liderar','Sobrevivência','Metalurgia','Sentidos']),
 ('Ladino','m', array['Sombra','Distração','Ventriloquismo','Despistamento','Escuridão','Graça Felina','Ilusões','Leitura','Memorização','Amizade']),
 ('Ladino','t', array['Ataque Oportuno','Concentração','Esquiva','Combate Não Letal','Luta às Cegas','Remover Debilitação','Golpe Duplo','Desviar','Disparo Rápido','Imprevisibilidade']),
 ('Ladino','h', array['Furtividade','Arrombar','Furtar','Enganar','Escapar','Prestidigitação','Armadilhagem','Jogar','Equilibrar','Sentidos']),
 ('Mago','m', array['Detecção de Magia','Quebra de Encantos','Contatos Mentais','Escuridão','Levitação','Medo','Sono','Telecinese','Respiração Arcana','Bola de Fogo']),
 ('Mago','t', array['Ataque Oportuno','Combate Não Letal','Concentração','Esquiva','Luta às Cegas','Ambidestria','Ímpeto Heroico','Imprevisibilidade','Resistência Extrema','Desviar']),
 ('Mago','h', array['Alfabetização','Misticismo','Idioma','Sabedoria','Codificar','Sensitividade','Medicina','Engenharia','Etiqueta','Venefício']),
 ('Bardo','m', array['Amizade','Curas Heroicas','Distração','Leitura','Lendas','Memorização','Ventriloquismo','Canção do Ânimo','Dom das Línguas','Modificar Espírito']),
 ('Bardo','t', array['Ataque Oportuno','Combate Não Letal','Concentração','Esquiva','Luta às Cegas','Voz de Comando','Aparar','Animosidade','Intimidar','Provocar']),
 ('Bardo','h', array['Arte','Persuadir','Etiqueta','Empatia','Enganar','Negociar','Liderar','Alfabetização','Idioma','Prestidigitação']),
 ('Rastreador','m', array['Adestramento','Conhecimento Natural','Despistamento','Graça Felina','Sobrevivente','Sombra','Elo Animal','Visão Animal','Habilidade Animal','Super Resistência']),
 ('Rastreador','t', array['Ataque Oportuno','Concentração','Escolta','Esquiva','Luta às Cegas','Remover Debilitação','Atirar em Movimento','Mira','Desviar','Combate Não Letal']),
 ('Rastreador','h', array['Rastrear','Sobrevivência','Sentidos','Adestrar','Furtividade','Escalar','Nadar','Armadilhagem','Medicina','Correr']),
 ('Sacerdote','m', array['Curas Heroicas','Curas Físicas','Curas Espirituais','Recuperação Física','Bênção','Esconjuração','Maldições','Ordens','Quebra de Encantos','Detecção de Magia']),
 ('Sacerdote','t', array['Ataque Oportuno','Combate Não Letal','Concentração','Esquiva','Luta às Cegas','Carga','Aparar','Desviar','Resistência à Dor','Resistência Extrema']),
 ('Sacerdote','h', array['Religião','Alfabetização','Medicina','Empatia','Liderar','Persuadir','Etiqueta','Sabedoria','Misticismo','Sensitividade'])
) v(p, tipo, nomes);

-- Livro → profissão do conteúdo. Os 13 deuses levam o conteúdo do Sacerdote.
CREATE TEMP TABLE _li_livros (slug text, nome text, prof text, base text, descricao text) ON COMMIT DROP;
INSERT INTO _li_livros VALUES
 ('livro_inicial_guerreiro',  'Livro Inicial do Guerreiro',  'Guerreiro',  'livro-tecnicas', 'Livro que todo guerreiro recebe ao começar: as primeiras magias, técnicas e habilidades da profissão.'),
 ('livro_inicial_ladino',     'Livro Inicial do Ladino',     'Ladino',     'livro-tecnicas', 'Livro que todo ladino recebe ao começar: as primeiras magias, técnicas e habilidades da profissão.'),
 ('livro_inicial_mago',       'Livro Inicial do Mago',       'Mago',       'livro-magias',   'Livro que todo mago recebe ao começar: as primeiras magias, técnicas e habilidades da profissão.'),
 ('livro_inicial_bardo',      'Livro Inicial do Bardo',      'Bardo',      'livro-magias',   'Livro que todo bardo recebe ao começar: as primeiras magias, técnicas e habilidades da profissão.'),
 ('livro_inicial_rastreador', 'Livro Inicial do Rastreador', 'Rastreador', 'livro-magias',   'Livro que todo rastreador recebe ao começar: as primeiras magias, técnicas e habilidades da profissão.');
INSERT INTO _li_livros
SELECT 'livro_inicial_' || lower(d), 'Livro Inicial de ' || d, 'Sacerdote', 'livro-milagres',
       'Livro que todo sacerdote de ' || d || ' recebe ao ser ordenado: as primeiras magias, técnicas e habilidades da profissão.'
  FROM unnest(array['Blator','Cambu','Crezir','Crizagom','Cruine','Ganis','Lena','Maira','Palier','Parom','Plandis','Selimon','Sevides']) d;

-- Valor 0: o livro é dado na criação; vendê-lo não pode virar renda.
INSERT INTO public.itens (slug, nome, base, tipo, grupo, icone, ocupa, origem, magico, valor_latao, descricao)
SELECT slug, nome, base, 'S', 'Itens', 'ti-book-2', 0.5, 'Comum', false, 0, descricao FROM _li_livros
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, base = EXCLUDED.base, descricao = EXCLUDED.descricao;

-- Magias e técnicas pelo pergaminho de cada uma (é o que aprender_magia e
-- aprender_tecnica conferem).
INSERT INTO public.livro_pergaminhos (livro_slug, pergaminho_slug)
SELECT l.slug, 'pergaminho_' || m.key
  FROM _li_livros l JOIN _li_escolhas e ON e.prof = l.prof AND e.tipo = 'm'
  JOIN public.magias m ON m.nome = e.nome
UNION
SELECT l.slug, 'pergaminho_tecnica_' || t.key
  FROM _li_livros l JOIN _li_escolhas e ON e.prof = l.prof AND e.tipo = 't'
  JOIN public.tecnicas t ON t.nome = e.nome
ON CONFLICT DO NOTHING;

INSERT INTO public.livro_habilidades (livro_slug, habilidade_key)
SELECT l.slug, h.key
  FROM _li_livros l JOIN _li_escolhas e ON e.prof = l.prof AND e.tipo = 'h'
  JOIN public.habilidades h ON h.nome = e.nome
ON CONFLICT DO NOTHING;

-- Trava: 18 livros × 10 de cada.
DO $$
declare v_ruins int;
begin
  select count(*) into v_ruins from _li_livros l
   where (select count(*) from public.livro_pergaminhos lp where lp.livro_slug = l.slug and lp.pergaminho_slug not like 'pergaminho_tecnica_%') <> 10
      or (select count(*) from public.livro_pergaminhos lp where lp.livro_slug = l.slug and lp.pergaminho_slug like 'pergaminho_tecnica_%') <> 10
      or (select count(*) from public.livro_habilidades lh where lh.livro_slug = l.slug) <> 10;
  if v_ruins > 0 or (select count(*) from _li_livros) <> 18 then
    raise exception 'livros iniciais incompletos: % livro(s) sem 10/10/10', v_ruins;
  end if;
end $$;

-- 4. Aprender habilidade pelo livro.
CREATE OR REPLACE FUNCTION public.aprender_habilidade(p_pj_id bigint, p_instance_id text, p_habilidade_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_uid     uuid := auth.uid();
  v_pj      record;
  v_inst    jsonb;
  v_slug    text;
  v_hab     record;
  v_atual   int;
  v_alvo    int;
  v_estagio int;
  v_total   int;
  v_gasto   int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado'); end if;

  select id, habilidades, treinos, inventario, profissao, experiencia
    into v_pj from public.personagens where id = p_pj_id and user_id = v_uid for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'pj_nao_encontrado'); end if;

  select elem into v_inst
    from jsonb_array_elements(coalesce(v_pj.inventario->'itens', '[]'::jsonb)) as elem
   where elem->>'instanceId' = p_instance_id limit 1;
  if v_inst is null then return jsonb_build_object('ok', false, 'motivo', 'item_nao_encontrado'); end if;
  if v_inst ? 'anuncio_id' and v_inst->>'anuncio_id' is not null then
    return jsonb_build_object('ok', false, 'motivo', 'item_a_venda');
  end if;
  v_slug := v_inst->>'slug';

  select key, nome, custo, nivel_inicial into v_hab from public.habilidades where key = p_habilidade_key;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'habilidade_nao_encontrada'); end if;

  if not exists (select 1 from public.livro_habilidades lh
                  where lh.livro_slug = v_slug and lh.habilidade_key = v_hab.key) then
    return jsonb_build_object('ok', false, 'motivo', 'item_nao_ensina');
  end if;

  -- Daqui para baixo: a habilidade de subir_nivel, na mesma ordem.
  if exists (select 1 from jsonb_array_elements(coalesce(v_pj.treinos, '[]'::jsonb)) t
              where t->>'tipo' = 'habilidade' and t->>'key' = v_hab.key) then
    return jsonb_build_object('ok', false, 'motivo', 'em_treino');
  end if;

  v_estagio := public._menestrel_estagio(v_pj.experiencia);
  v_atual := coalesce((v_pj.habilidades->>v_hab.key)::int, 0);
  v_alvo := v_atual + 1;
  if coalesce(v_hab.nivel_inicial, 0) + v_alvo > v_estagio then
    return jsonb_build_object('ok', false, 'motivo', 'acima_do_estagio');
  end if;

  v_total := public._menestrel_pontos_habilidade_por_estagio(v_pj.profissao) * v_estagio;
  with niveis as (
    select e.key, (e.value)::int n from jsonb_each_text(coalesce(v_pj.habilidades, '{}'::jsonb)) e
    union all
    select t->>'key', (t->>'nivel')::int from jsonb_array_elements(coalesce(v_pj.treinos, '[]'::jsonb)) t
     where t->>'tipo' = 'habilidade'
    union all
    select v_hab.key, v_alvo
  ), maior as (select key, max(n) n from niveis group by key)
  select coalesce(sum(m.n * coalesce(h.custo, 0)), 0) into v_gasto
    from maior m join public.habilidades h on h.key = m.key;
  if v_gasto > v_total then return jsonb_build_object('ok', false, 'motivo', 'pontos_insuficientes'); end if;

  if v_atual + coalesce(v_hab.nivel_inicial, 0) <= 0 then
    -- Compra nova: 12 horas treinando (HORAS_TREINO.habilidade).
    update public.personagens
       set treinos = coalesce(treinos, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
             'id', gen_random_uuid()::text, 'tipo', 'habilidade', 'key', v_hab.key, 'nivel', v_alvo,
             'atividade', 'treinando', 'horas_restantes', 12, 'comprado_em', now()))
     where id = p_pj_id and user_id = v_uid;
    return jsonb_build_object('ok', true, 'habilidade', v_hab.key, 'habilidade_nome', v_hab.nome,
                              'nivel', v_alvo, 'horas', 12, 'atividade', 'treinando');
  end if;

  update public.personagens
     set habilidades = coalesce(habilidades, '{}'::jsonb) || jsonb_build_object(v_hab.key, v_alvo)
   where id = p_pj_id and user_id = v_uid;
  return jsonb_build_object('ok', true, 'habilidade', v_hab.key, 'habilidade_nome', v_hab.nome,
                            'nivel', v_alvo, 'horas', 0, 'imediato', true);
end;
$function$;
REVOKE ALL ON FUNCTION public.aprender_habilidade(bigint, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.aprender_habilidade(bigint, text, text) TO authenticated;

-- 5. O livro nasce com o personagem.
CREATE OR REPLACE FUNCTION public._menestrel_livro_inicial()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_slug text;
  v_inv  jsonb;
begin
  v_slug := case
    when new.profissao = 'Sacerdote' then
      case when nullif(btrim(coalesce(new.deus, '')), '') is null then null
           else 'livro_inicial_' || lower(btrim(new.deus)) end
    when new.profissao is not null then 'livro_inicial_' || lower(new.profissao)
  end;
  if v_slug is null or not exists (select 1 from public.itens where slug = v_slug) then return new; end if;

  v_inv := coalesce(new.inventario, '{"itens": [], "moedas": {"ouro": 0, "cobre": 0, "latao": 0, "prata": 0}}'::jsonb);
  if jsonb_typeof(v_inv->'itens') is distinct from 'array' then v_inv := jsonb_set(v_inv, '{itens}', '[]'::jsonb); end if;
  if exists (select 1 from jsonb_array_elements(v_inv->'itens') e where e->>'slug' = v_slug) then return new; end if;

  new.inventario := jsonb_set(v_inv, '{itens}', (v_inv->'itens') || jsonb_build_array(jsonb_build_object(
    'instanceId', 'inicial-' || gen_random_uuid()::text, 'slug', v_slug, 'quantidade', 1,
    'equipado', false, 'slot', null, 'containerId', null, 'casa', 0, 'observacao', null)));
  return new;
end;
$function$;

DROP TRIGGER IF EXISTS personagens_livro_inicial ON public.personagens;
CREATE TRIGGER personagens_livro_inicial BEFORE INSERT ON public.personagens
  FOR EACH ROW EXECUTE FUNCTION public._menestrel_livro_inicial();

COMMIT;
