-- scripts/sql/avancar-treinos-rpc-2026-10-22.sql
-- ============================================================
-- RPC avancar_treinos (22/10/2026). O relógio da mesa avançava a fila de
-- treino no navegador do Mestre e regravava a coluna inteira: uma compra
-- (aprender_tecnica / aprender_magia) feita entre a leitura e a escrita
-- sumia. Agora a fila anda AQUI, com a linha travada (FOR UPDATE) — e as
-- duas RPCs de compra também travam, então nenhuma escrita perde a outra.
--
-- SECURITY INVOKER: quem pode avançar é quem a RLS de personagens deixa
-- atualizar (o dono ou o Mestre da mesa). Nada de privilégio novo.
--
-- ESPELHO de avancarTreinos/aplicarTreinoNoPj (01-core/clima-desgaste.jsx):
-- FIFO só entre os itens da atividade; o nível concluído vai para
-- tecnicas/magias sem nunca rebaixar.
-- ============================================================
BEGIN;

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
  v_item    jsonb;
  v_falta   numeric;
  v_usa     numeric;
  v_mudou   boolean := false;
  v_nivel   int;
begin
  if p_atividade is null or v_resto <= 0 then return null; end if;

  select id, treinos, tecnicas, magias into v_pj
    from public.personagens where id = p_pj_id
     for update;
  if not found then return null; end if;
  if jsonb_typeof(v_pj.treinos) is distinct from 'array' or jsonb_array_length(v_pj.treinos) = 0 then
    return null;
  end if;

  v_tec := coalesce(v_pj.tecnicas, '{}'::jsonb);
  v_mag := coalesce(v_pj.magias, '{}'::jsonb);

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
     set treinos = v_nova, tecnicas = v_tec, magias = v_mag
   where id = p_pj_id;

  return jsonb_build_object('treinos', v_nova, 'tecnicas', v_tec, 'magias', v_mag);
end;
$function$;

REVOKE ALL ON FUNCTION public.avancar_treinos(bigint, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.avancar_treinos(bigint, text, numeric) TO authenticated;

COMMIT;
