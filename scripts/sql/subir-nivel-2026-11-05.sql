-- scripts/sql/subir-nivel-2026-11-05.sql
-- ============================================================
-- SUBIR DE NÍVEL SEM ITEM (05/11/2026).
--
-- A regra de 28/10/2026 (usuário): "Magia, Técnica, Habilidade só precisa de
-- aprendizado quando o personagem não tem nenhum nível, representa uma compra
-- nova; depois de aprender o nível 1, ao comprar ativa instantaneamente."
-- Ela só existia no texto da atividade: aprender_magia e aprender_tecnica
-- exigiam o item e mandavam TODO nível para a fila, e a habilidade não tinha
-- aprendizado nenhum (a edição do personagem gravava os pontos direto).
--
-- Decisões do usuário (05/11/2026):
--   • o próximo nível se compra na FICHA ("Subir nível"), sem item;
--   • habilidade nova custa 12 horas na atividade TREINAR;
--   • a etapa de habilidades sai da edição do personagem.
--
-- O que este script faz:
--   1. _menestrel_pontos_habilidade_por_estagio — espelho de
--      GAME_DATA.profissoes[x].habilidadesPontos (01-core/game-data.jsx).
--   2. subir_nivel(pj, tipo, key) — magia/técnica: só quem já tem o nível 1,
--      vale na hora. Habilidade: com nível, vale na hora; sem nível, entra na
--      fila (12 h, 'treinando'). Mesmas recusas de aprender_* e na mesma ordem
--      de bloqueioSubirNivel (01-core/game-data.jsx).
--   3. aprender_magia / aprender_tecnica — com o nível 1 já na ficha, o item
--      também ativa na hora (não há mais fila por nível). Técnica nova cai de
--      72 para 36 horas (HORAS_TREINO.tecnica).
--   4. avancar_treinos — conclui habilidade na coluna habilidades.
--
-- REVERTER: reaplicar aprender-magia-rpc-2026-10-22.sql,
-- aprender-tecnica-rpc-2026-10-22.sql e avancar-treinos-rpc-2026-10-22.sql, e
-- DROP FUNCTION public.subir_nivel(bigint, text, text).
-- ============================================================
BEGIN;

-- 1. Pontos de habilidade por estágio. ESPELHO de GAME_DATA.profissoes.
CREATE OR REPLACE FUNCTION public._menestrel_pontos_habilidade_por_estagio(p_profissao text)
RETURNS int LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE p_profissao
           WHEN 'Guerreiro' THEN 14 WHEN 'Ladino' THEN 20
           WHEN 'Sacerdote' THEN 10 WHEN 'Mago' THEN 10
           WHEN 'Rastreador' THEN 16 WHEN 'Bardo' THEN 14
           ELSE 0 END;
$$;

-- 2. Subir de nível pela ficha.
CREATE OR REPLACE FUNCTION public.subir_nivel(p_pj_id bigint, p_tipo text, p_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_uid     uuid := auth.uid();
  v_pj      record;
  v_mag     record;
  v_tec     record;
  v_hab     record;
  v_atual   int;
  v_alvo    int;
  v_estagio int;
  v_total   int;
  v_gasto   int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado'); end if;
  if p_tipo is null or p_tipo not in ('magia', 'tecnica', 'habilidade') then
    return jsonb_build_object('ok', false, 'motivo', 'tipo_invalido');
  end if;

  select id, magias, tecnicas, habilidades, treinos, profissao, experiencia,
         intelecto_base, aura_base, fisico_base, agilidade_base, deus, subraca
    into v_pj
    from public.personagens
   where id = p_pj_id and user_id = v_uid
     for update;  -- trava: duas compras ou o relógio não se atropelam
  if not found then return jsonb_build_object('ok', false, 'motivo', 'pj_nao_encontrado'); end if;

  -- Na fila: espera terminar o aprendizado antes de subir.
  if exists (select 1 from jsonb_array_elements(coalesce(v_pj.treinos, '[]'::jsonb)) t
              where t->>'tipo' = p_tipo and t->>'key' = p_key) then
    return jsonb_build_object('ok', false, 'motivo', 'em_treino');
  end if;

  v_estagio := public._menestrel_estagio(v_pj.experiencia);

  -- ── MAGIA ──────────────────────────────────────────────────────────────
  if p_tipo = 'magia' then
    select key, nome, custo, classe, nivel_1, nivel_3, nivel_5, nivel_7, nivel_9
      into v_mag from public.magias where key = p_key;
    if not found then return jsonb_build_object('ok', false, 'motivo', 'magia_nao_encontrada'); end if;

    v_atual := coalesce((v_pj.magias->>p_key)::int, 0);
    if v_atual <= 0 then return jsonb_build_object('ok', false, 'motivo', 'nao_aprendida'); end if;
    if v_atual >= 5 then return jsonb_build_object('ok', false, 'motivo', 'ja_no_maximo'); end if;

    if v_mag.classe = 'Milagre' then
      if v_pj.subraca = 'Vampiro' then return jsonb_build_object('ok', false, 'motivo', 'milagre_vampiro');
      elsif v_pj.subraca = 'Lobisomem' then return jsonb_build_object('ok', false, 'motivo', 'milagre_lobisomem');
      elsif v_pj.deus is null or btrim(v_pj.deus) = '' then return jsonb_build_object('ok', false, 'motivo', 'milagre_sem_religiao');
      elsif v_pj.profissao = 'Mago' then return jsonb_build_object('ok', false, 'motivo', 'milagre_escuridao');
      end if;
    end if;

    v_alvo := v_atual + 1;
    if not (nullif(btrim(v_mag.nivel_1), '') is not null
        and (v_alvo < 2 or nullif(btrim(v_mag.nivel_3), '') is not null)
        and (v_alvo < 3 or nullif(btrim(v_mag.nivel_5), '') is not null)
        and (v_alvo < 4 or nullif(btrim(v_mag.nivel_7), '') is not null)
        and (v_alvo < 5 or nullif(btrim(v_mag.nivel_9), '') is not null)) then
      return jsonb_build_object('ok', false, 'motivo', 'nivel_sem_texto');
    end if;
    if v_alvo * 2 - 1 > v_estagio then return jsonb_build_object('ok', false, 'motivo', 'acima_do_estagio'); end if;

    v_total := public._menestrel_pontos_magia_por_estagio(v_pj.profissao, v_pj.intelecto_base, v_pj.aura_base) * v_estagio;
    with passos as (
      select e.key, e.value::int p from jsonb_each_text(coalesce(v_pj.magias, '{}'::jsonb)) e
      union all
      select t->>'key', (t->>'nivel')::int from jsonb_array_elements(coalesce(v_pj.treinos, '[]'::jsonb)) t
       where t->>'tipo' = 'magia'
      union all
      select p_key, v_alvo
    ), maior as (select key, max(p) p from passos group by key)
    select coalesce(sum((case when mx.p > 0 then mx.p * 2 - 1 else 0 end) * coalesce(m.custo, 0)), 0)
      into v_gasto
      from maior mx join public.magias m on m.key = mx.key;
    if v_gasto > v_total then return jsonb_build_object('ok', false, 'motivo', 'pontos_insuficientes'); end if;

    update public.personagens
       set magias = coalesce(magias, '{}'::jsonb) || jsonb_build_object(p_key, v_alvo)
     where id = p_pj_id and user_id = v_uid;
    return jsonb_build_object('ok', true, 'tipo', 'magia', 'key', p_key, 'nome', v_mag.nome,
                              'nivel', v_alvo * 2 - 1, 'passos', v_alvo, 'imediato', true);
  end if;

  -- ── TÉCNICA ────────────────────────────────────────────────────────────
  if p_tipo = 'tecnica' then
    select key, nome, custo into v_tec from public.tecnicas where key = p_key;
    if not found then return jsonb_build_object('ok', false, 'motivo', 'tecnica_nao_encontrada'); end if;

    v_atual := coalesce((v_pj.tecnicas->>p_key)::int, 0);
    if v_atual <= 0 then return jsonb_build_object('ok', false, 'motivo', 'nao_aprendida'); end if;
    v_alvo := v_atual + 1;
    if v_alvo > v_estagio then return jsonb_build_object('ok', false, 'motivo', 'acima_do_estagio'); end if;

    v_total := public._menestrel_pontos_tecnica_por_estagio(v_pj.profissao, v_pj.fisico_base, v_pj.agilidade_base) * v_estagio;
    with niveis as (
      select e.key, (e.value)::int n from jsonb_each_text(coalesce(v_pj.tecnicas, '{}'::jsonb)) e
      union all
      select t->>'key', (t->>'nivel')::int from jsonb_array_elements(coalesce(v_pj.treinos, '[]'::jsonb)) t
       where t->>'tipo' = 'tecnica'
      union all
      select p_key, v_alvo
    ), maior as (select key, max(n) n from niveis group by key)
    select coalesce(sum(m.n * coalesce(tc.custo, 0)), 0) into v_gasto
      from maior m join public.tecnicas tc on tc.key = m.key;
    if v_gasto > v_total then return jsonb_build_object('ok', false, 'motivo', 'pontos_insuficientes'); end if;

    update public.personagens
       set tecnicas = coalesce(tecnicas, '{}'::jsonb) || jsonb_build_object(p_key, v_alvo)
     where id = p_pj_id and user_id = v_uid;
    return jsonb_build_object('ok', true, 'tipo', 'tecnica', 'key', p_key, 'nome', v_tec.nome,
                              'nivel', v_alvo, 'imediato', true);
  end if;

  -- ── HABILIDADE ─────────────────────────────────────────────────────────
  select key, nome, custo, nivel_inicial into v_hab from public.habilidades where key = p_key;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'habilidade_nao_encontrada'); end if;

  v_atual := coalesce((v_pj.habilidades->>p_key)::int, 0);
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
    select p_key, v_alvo
  ), maior as (select key, max(n) n from niveis group by key)
  select coalesce(sum(m.n * coalesce(h.custo, 0)), 0) into v_gasto
    from maior m join public.habilidades h on h.key = m.key;
  if v_gasto > v_total then return jsonb_build_object('ok', false, 'motivo', 'pontos_insuficientes'); end if;

  if v_atual + coalesce(v_hab.nivel_inicial, 0) <= 0 then
    -- Compra nova: 12 horas treinando (HORAS_TREINO.habilidade).
    update public.personagens
       set treinos = coalesce(treinos, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
             'id', gen_random_uuid()::text, 'tipo', 'habilidade', 'key', p_key, 'nivel', v_alvo,
             'atividade', 'treinando', 'horas_restantes', 12, 'comprado_em', now()))
     where id = p_pj_id and user_id = v_uid;
    return jsonb_build_object('ok', true, 'tipo', 'habilidade', 'key', p_key, 'nome', v_hab.nome,
                              'nivel', v_alvo, 'imediato', false, 'horas', 12, 'atividade', 'treinando');
  end if;

  update public.personagens
     set habilidades = coalesce(habilidades, '{}'::jsonb) || jsonb_build_object(p_key, v_alvo)
   where id = p_pj_id and user_id = v_uid;
  return jsonb_build_object('ok', true, 'tipo', 'habilidade', 'key', p_key, 'nome', v_hab.nome,
                            'nivel', v_alvo, 'imediato', true);
end;
$function$;

REVOKE ALL ON FUNCTION public.subir_nivel(bigint, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.subir_nivel(bigint, text, text) TO authenticated;

-- 3. aprender_magia / aprender_tecnica: com o nível 1 na ficha, ativa na hora.
--    Remendo por texto, conferido (como log-primeiro-nome-2026-09-27.sql): a
--    versão no ar tem ajustes posteriores ao script de 22/10.
do $$
declare v_src text;
begin
  select pg_get_functiondef('public.aprender_magia(bigint, text, text)'::regprocedure) into v_src;
  if position($q$  v_atividade := case v_magia.classe$q$ in v_src) = 0 then
    raise exception 'aprender_magia: trecho não encontrado';
  end if;
  if position('ja_sabida_ativa' in v_src) = 0 then
    v_src := replace(v_src, $q$  v_atividade := case v_magia.classe$q$,
$q$  -- ja_sabida_ativa (05/11/2026): com o nível 1 na ficha, ativa na hora.
  if coalesce((v_pj.magias->>v_magia.key)::int, 0) > 0
     and not exists (select 1 from jsonb_array_elements(coalesce(v_pj.treinos, '[]'::jsonb)) t
                      where t->>'tipo' = 'magia' and t->>'key' = v_magia.key) then
    update public.personagens
       set magias = coalesce(magias, '{}'::jsonb) || jsonb_build_object(v_magia.key, v_alvo)
     where id = p_pj_id and user_id = v_uid;
    return jsonb_build_object('ok', true, 'magia', v_magia.key, 'magia_nome', v_magia.nome,
                              'nivel', v_nivel, 'passos', v_alvo, 'horas', 0, 'imediato', true);
  end if;

  v_atividade := case v_magia.classe$q$);
    execute v_src;
  end if;

  select pg_get_functiondef('public.aprender_tecnica(bigint, text, text)'::regprocedure) into v_src;
  if position($q$'horas_restantes', 72$q$ in v_src) = 0 and position('ja_sabida_ativa' in v_src) = 0 then
    raise exception 'aprender_tecnica: trecho não encontrado';
  end if;
  if position('ja_sabida_ativa' in v_src) = 0 then
    v_src := replace(v_src, $q$'horas_restantes', 72$q$, $q$'horas_restantes', 36$q$);
    v_src := replace(v_src, $q$'horas', 72$q$, $q$'horas', 36$q$);
    v_src := regexp_replace(v_src, '(\n  update public\.personagens\s+set treinos)',
$q$
  -- ja_sabida_ativa (05/11/2026): com o nível 1 na ficha, ativa na hora.
  if v_sabido > 0 and v_fila = 0 then
    update public.personagens
       set tecnicas = coalesce(tecnicas, '{}'::jsonb) || jsonb_build_object(v_tec.key, v_alvo)
     where id = p_pj_id and user_id = v_uid;
    return jsonb_build_object('ok', true, 'tecnica', v_tec.key, 'tecnica_nome', v_tec.nome,
                              'nivel', v_alvo, 'horas', 0, 'imediato', true);
  end if;
\1$q$);
    if position('ja_sabida_ativa' in v_src) = 0 then
      raise exception 'aprender_tecnica: o update da fila não foi encontrado';
    end if;
    execute v_src;
  end if;
end $$;

-- 4. avancar_treinos: a habilidade concluída vai para a coluna habilidades.
CREATE OR REPLACE FUNCTION public.avancar_treinos(p_pj_id bigint, p_atividade text, p_horas numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
declare
  v_pj      record;
  v_resto   numeric := greatest(0, coalesce(p_horas, 0));
  v_nova    jsonb := '[]'::jsonb;
  v_tec     jsonb;
  v_mag     jsonb;
  v_hab     jsonb;
  v_item    jsonb;
  v_falta   numeric;
  v_usa     numeric;
  v_mudou   boolean := false;
  v_nivel   int;
begin
  if p_atividade is null or v_resto <= 0 then return null; end if;

  select id, treinos, tecnicas, magias, habilidades into v_pj
    from public.personagens where id = p_pj_id
     for update;
  if not found then return null; end if;
  if jsonb_typeof(v_pj.treinos) is distinct from 'array' or jsonb_array_length(v_pj.treinos) = 0 then
    return null;
  end if;

  v_tec := coalesce(v_pj.tecnicas, '{}'::jsonb);
  v_mag := coalesce(v_pj.magias, '{}'::jsonb);
  v_hab := coalesce(v_pj.habilidades, '{}'::jsonb);

  for v_item in select e from jsonb_array_elements(v_pj.treinos) with ordinality as x(e, i) order by i loop
    if v_resto > 0 and v_item->>'atividade' = p_atividade then
      v_falta := greatest(0, coalesce((v_item->>'horas_restantes')::numeric, 0));
      v_usa := least(v_falta, v_resto);
      v_resto := v_resto - v_usa;
      if v_usa > 0 then v_mudou := true; end if;
      if v_falta - v_usa <= 0 then
        -- Concluído: sai da fila e vira nível usável (nunca rebaixa).
        v_mudou := true;
        v_nivel := coalesce((v_item->>'nivel')::int, 0);
        if v_item->>'tipo' = 'tecnica' then
          v_tec := v_tec || jsonb_build_object(v_item->>'key',
                     greatest(coalesce((v_tec->>(v_item->>'key'))::int, 0), v_nivel));
        elsif v_item->>'tipo' = 'habilidade' then
          v_hab := v_hab || jsonb_build_object(v_item->>'key',
                     greatest(coalesce((v_hab->>(v_item->>'key'))::int, 0), v_nivel));
        else
          v_mag := v_mag || jsonb_build_object(v_item->>'key',
                     greatest(coalesce((v_mag->>(v_item->>'key'))::int, 0), v_nivel));
        end if;
        continue;
      end if;
      v_item := v_item || jsonb_build_object('horas_restantes', v_falta - v_usa);
    end if;
    v_nova := v_nova || jsonb_build_array(v_item);
  end loop;

  if not v_mudou then return null; end if;

  update public.personagens
     set treinos = v_nova, tecnicas = v_tec, magias = v_mag, habilidades = v_hab
   where id = p_pj_id;

  return jsonb_build_object('treinos', v_nova, 'tecnicas', v_tec, 'magias', v_mag, 'habilidades', v_hab);
end;
$function$;

REVOKE ALL ON FUNCTION public.avancar_treinos(bigint, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.avancar_treinos(bigint, text, numeric) TO authenticated;

COMMIT;
