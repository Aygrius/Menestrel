-- scripts/sql/aprender-tecnica-rpc-2026-10-22.sql
-- ============================================================
-- RPC aprender_tecnica (spec 2026-10-22-tecnicas-por-item-e-treino).
-- Espelho da aprender_magia: o item da instância é o pergaminho da técnica
-- (pergaminho_tecnica_<key>) ou um livro que o vincula. Não consome o item,
-- não confere permissão (qualquer profissão aprende). O nível NÃO vai direto
-- para personagens.tecnicas: entra na fila de treino (personagens.treinos),
-- 72 h de Treinando — o relógio da mesa conclui (avancarTreinos, JS).
-- ============================================================
BEGIN;

-- Pontos por estágio. ESPELHO de pontosTecnicasPorEstagio (01-core/game-data.jsx).
CREATE OR REPLACE FUNCTION public._menestrel_pontos_tecnica_por_estagio(p_profissao text, p_fisico int, p_agilidade int)
RETURNS int LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT (CASE p_profissao WHEN 'Guerreiro' THEN 4 WHEN 'Ladino' THEN 2 WHEN 'Rastreador' THEN 3
                           WHEN 'Sacerdote' THEN 3 WHEN 'Bardo' THEN 2 WHEN 'Mago' THEN 1 ELSE 0 END)
       + greatest(0, coalesce(p_fisico, 0)) + greatest(0, coalesce(p_agilidade, 0));
$$;

CREATE OR REPLACE FUNCTION public.aprender_tecnica(p_pj_id bigint, p_instance_id text, p_tecnica_key text)
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
  v_tec     record;
  v_perg    text;
  v_sabido  int;
  v_fila    int;
  v_alvo    int;
  v_estagio int;
  v_total   int;
  v_gasto   int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado'); end if;

  select id, tecnicas, treinos, inventario, profissao, experiencia, fisico_base, agilidade_base
    into v_pj from public.personagens where id = p_pj_id and user_id = v_uid
     for update;  -- trava: duas compras ou o relógio não se atropelam (22/10/2026)
  if not found then return jsonb_build_object('ok', false, 'motivo', 'pj_nao_encontrado'); end if;

  select elem into v_inst
    from jsonb_array_elements(coalesce(v_pj.inventario->'itens', '[]'::jsonb)) as elem
   where elem->>'instanceId' = p_instance_id limit 1;
  if v_inst is null then return jsonb_build_object('ok', false, 'motivo', 'item_nao_encontrado'); end if;
  if v_inst ? 'anuncio_id' and v_inst->>'anuncio_id' is not null then
    return jsonb_build_object('ok', false, 'motivo', 'item_a_venda');
  end if;
  v_slug := v_inst->>'slug';

  select key, nome, custo into v_tec from public.tecnicas where key = p_tecnica_key;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'tecnica_nao_encontrada'); end if;
  v_perg := 'pergaminho_tecnica_' || v_tec.key;

  if not (v_slug = v_perg or exists (select 1 from public.livro_pergaminhos lp
                                      where lp.livro_slug = v_slug and lp.pergaminho_slug = v_perg)) then
    return jsonb_build_object('ok', false, 'motivo', 'item_nao_ensina');
  end if;

  v_sabido := coalesce((v_pj.tecnicas->>v_tec.key)::int, 0);
  select coalesce(max((t->>'nivel')::int), 0) into v_fila
    from jsonb_array_elements(coalesce(v_pj.treinos, '[]'::jsonb)) t
   where t->>'tipo' = 'tecnica' and t->>'key' = v_tec.key;
  v_alvo := greatest(v_sabido, v_fila) + 1;

  v_estagio := public._menestrel_estagio(v_pj.experiencia);
  if v_alvo > v_estagio then return jsonb_build_object('ok', false, 'motivo', 'acima_do_estagio'); end if;

  v_total := public._menestrel_pontos_tecnica_por_estagio(v_pj.profissao, v_pj.fisico_base, v_pj.agilidade_base) * v_estagio;

  -- Gasto: por técnica, o MAIOR entre sabido e fila; a desta, o alvo.
  with niveis as (
    select e.key, (e.value)::int n from jsonb_each_text(coalesce(v_pj.tecnicas, '{}'::jsonb)) e
    union all
    select t->>'key', (t->>'nivel')::int from jsonb_array_elements(coalesce(v_pj.treinos, '[]'::jsonb)) t
     where t->>'tipo' = 'tecnica'
    union all
    select v_tec.key, v_alvo
  ), maior as (select key, max(n) n from niveis group by key)
  select coalesce(sum(m.n * coalesce(tc.custo, 0)), 0) into v_gasto
    from maior m join public.tecnicas tc on tc.key = m.key;
  if v_gasto > v_total then return jsonb_build_object('ok', false, 'motivo', 'pontos_insuficientes'); end if;

  update public.personagens
     set treinos = coalesce(treinos, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
           'id', gen_random_uuid()::text, 'tipo', 'tecnica', 'key', v_tec.key, 'nivel', v_alvo,
           'atividade', 'treinando', 'horas_restantes', 72, 'comprado_em', now()))
   where id = p_pj_id and user_id = v_uid;

  return jsonb_build_object('ok', true, 'tecnica', v_tec.key, 'tecnica_nome', v_tec.nome,
                            'nivel', v_alvo, 'horas', 72, 'atividade', 'treinando');
end;
$function$;

REVOKE ALL ON FUNCTION public.aprender_tecnica(bigint, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aprender_tecnica(bigint, text, text) TO authenticated;
COMMIT;
