-- scripts/sql/aprender-magia-rpc-2026-10-22.sql
-- ============================================================
-- RPC aprender_magia — substitui usar_pergaminho_magia (spec 2026-10-22).
-- Ensina UM nível da magia com o item da instância: o pergaminho dela, ou
-- um livro que a vincula em livro_pergaminhos. Não consome o item e não
-- confere profissão. Confere teto de estágio, texto do nível e pontos.
-- A remoção de usar_pergaminho_magia fica na Task 9 (depois do deploy).
-- ============================================================
BEGIN;

-- Pontos por estágio. ESPELHO de pontosMagiasPorEstagio (01-core/game-data.jsx):
-- mudar um sem o outro quebra o "Aprender" (a tela libera, a RPC recusa).
-- search_path fixo (22/10/2026): o advisor do Supabase acusa função com
-- search_path herdado de quem chama.
CREATE OR REPLACE FUNCTION public._menestrel_pontos_magia_por_estagio(p_profissao text, p_intelecto int, p_aura int)
RETURNS int LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT (CASE WHEN coalesce(p_aura, 0) < 0 THEN 0 ELSE
            CASE p_profissao
              WHEN 'Mago' THEN 8 WHEN 'Bardo' THEN 8
              WHEN 'Rastreador' THEN 5 WHEN 'Sacerdote' THEN 5
              WHEN 'Guerreiro' THEN 1 WHEN 'Ladino' THEN 1
              ELSE 0 END
          END)
       + greatest(0, coalesce(p_intelecto, 0))
       + greatest(0, coalesce(p_aura, 0));
$$;

CREATE OR REPLACE FUNCTION public.aprender_magia(p_pj_id bigint, p_instance_id text, p_magia_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_uid        uuid := auth.uid();
  v_pj         record;
  v_inst       jsonb;
  v_slug       text;
  v_magia      record;
  v_perg_slug  text;
  v_ensina     boolean;
  v_atual      int;
  v_alvo       int;
  v_nivel      int;
  v_estagio    int;
  v_total      int;
  v_gasto      int;
  v_gasto_novo int;
  v_texto_ok   boolean;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  end if;

  select id, magias, inventario, profissao, experiencia, intelecto_base, aura_base
    into v_pj
    from public.personagens
   where id = p_pj_id and user_id = v_uid;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'pj_nao_encontrado');
  end if;

  select elem into v_inst
    from jsonb_array_elements(coalesce(v_pj.inventario->'itens', '[]'::jsonb)) as elem
   where elem->>'instanceId' = p_instance_id
   limit 1;
  if v_inst is null then
    return jsonb_build_object('ok', false, 'motivo', 'item_nao_encontrado');
  end if;
  -- À venda (02/10/2026): travado até retirar o anúncio.
  if v_inst ? 'anuncio_id' and v_inst->>'anuncio_id' is not null then
    return jsonb_build_object('ok', false, 'motivo', 'item_a_venda');
  end if;
  v_slug := v_inst->>'slug';

  select key, nome, custo, nivel_1, nivel_3, nivel_5, nivel_7, nivel_9
    into v_magia
    from public.magias
   where key = p_magia_key;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'magia_nao_encontrada');
  end if;
  v_perg_slug := 'pergaminho_' || v_magia.key;

  v_ensina := (v_slug = v_perg_slug)
           or exists (select 1 from public.livro_pergaminhos lp
                       where lp.livro_slug = v_slug and lp.pergaminho_slug = v_perg_slug);
  if not v_ensina then
    return jsonb_build_object('ok', false, 'motivo', 'item_nao_ensina');
  end if;

  v_atual := coalesce((v_pj.magias->>v_magia.key)::int, 0);
  if v_atual >= 5 then
    return jsonb_build_object('ok', false, 'motivo', 'ja_no_maximo');
  end if;
  v_alvo  := v_atual + 1;
  v_nivel := v_alvo * 2 - 1;

  -- "Para no primeiro buraco" (passosDisponiveisMagia): todos os níveis até o alvo com texto.
  -- Texto em branco conta como ausente, como em passosDisponiveisMagia (JS).
  v_texto_ok := nullif(btrim(v_magia.nivel_1), '') is not null
    and (v_alvo < 2 or nullif(btrim(v_magia.nivel_3), '') is not null)
    and (v_alvo < 3 or nullif(btrim(v_magia.nivel_5), '') is not null)
    and (v_alvo < 4 or nullif(btrim(v_magia.nivel_7), '') is not null)
    and (v_alvo < 5 or nullif(btrim(v_magia.nivel_9), '') is not null);
  if not v_texto_ok then
    return jsonb_build_object('ok', false, 'motivo', 'nivel_sem_texto');
  end if;

  v_estagio := public._menestrel_estagio(v_pj.experiencia);
  if v_nivel > v_estagio then
    return jsonb_build_object('ok', false, 'motivo', 'acima_do_estagio');
  end if;

  v_total := public._menestrel_pontos_magia_por_estagio(v_pj.profissao, v_pj.intelecto_base, v_pj.aura_base) * v_estagio;

  select coalesce(sum((case when e.value::int > 0 then e.value::int * 2 - 1 else 0 end) * coalesce(m.custo, 0)), 0)
    into v_gasto
    from jsonb_each_text(coalesce(v_pj.magias, '{}'::jsonb)) as e(key, value)
    join public.magias m on m.key = e.key;

  v_gasto_novo := v_gasto
    - (case when v_atual > 0 then v_atual * 2 - 1 else 0 end) * coalesce(v_magia.custo, 0)
    + v_nivel * coalesce(v_magia.custo, 0);
  if v_gasto_novo > v_total then
    return jsonb_build_object('ok', false, 'motivo', 'pontos_insuficientes');
  end if;

  update public.personagens
     set magias = coalesce(magias, '{}'::jsonb) || jsonb_build_object(v_magia.key, v_alvo)
   where id = p_pj_id and user_id = v_uid;

  return jsonb_build_object('ok', true, 'magia', v_magia.key, 'magia_nome', v_magia.nome,
                            'nivel', v_nivel, 'passos', v_alvo);
end;
$function$;

REVOKE ALL ON FUNCTION public.aprender_magia(bigint, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aprender_magia(bigint, text, text) TO authenticated;

COMMIT;
