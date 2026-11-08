-- QUEM NÃO AGUENTA MAIS PESO NÃO RECEBE (08/11/2026).
-- Usuário: "Quando um personagem não tiver espaço de casa ou peso disponível,
-- não será possível outro personagem enviar item para ele."
--
-- Casa: o banco já recusava o 81º item de quem recebe (inventario_cheio,
-- scripts/sql/inventario-80-casas-2026-10-30.sql). Peso: não — a regra "acima
-- de 100% da carga, nada entra" (cargaEstourouCom, 01-core/game-data.jsx)
-- vivia só na tela de quem recebe, e quem ENVIA não pode ler o inventário do
-- outro (RLS). Agora transfer_item confere no banco, com a MESMA conta de
-- calcCarga (07-inventario/inventario.jsx):
--   capacidade = 10 × (1 + 0,1 × (força + físico)) + o `armazena` de cada
--                recipiente;
--   peso = ocupa × quantidade × fator — 1 solto, 0,75 dentro de recipiente,
--          0,5 equipado ou vestido; o recipiente vestido não pesa;
--   não contam: propriedades (Casa, Taverna…), o que está guardado nelas e o
--   que está no animal (animal_id).
-- Recusa com 'carga_maxima' se, depois, quem recebe passar de 100% E ficar mais
-- pesado do que estava (a mesma condição de cargaEstourouCom). Moedas ficam de
-- fora, como na tela.
--
-- Para desfazer: reaplicar transfer_item sem o bloco "CARGA DE QUEM RECEBE" e
--   drop function public._menestrel_carga(jsonb, numeric, numeric);

create or replace function public._menestrel_carga(p_itens jsonb, p_forca numeric, p_fisico numeric)
returns table(peso numeric, capacidade numeric)
language sql stable set search_path to 'public'
as $$
  with linhas as (
    select e,
           c.grupo as c_grupo, coalesce(c.ocupa, 0)::numeric as c_ocupa, coalesce(c.armazena, 0)::numeric as c_armazena,
           (c.slug is not null) as c_existe,
           coalesce((e->>'quantidade')::numeric, 1) as q,
           coalesce((e->>'vestido')::boolean, false) as vestido,
           coalesce((e->>'equipado')::boolean, false) as equipado
      from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) e
      left join public.itens c on c.slug = e->>'slug'
  ),
  props as (select e->>'instanceId' as id from linhas where c_grupo = 'Propriedades'),
  validas as (
    select * from linhas
     where c_existe and coalesce(c_grupo, '') <> 'Propriedades'
       and (e->>'animal_id') is null
       and not coalesce((e->>'containerId') in (select id from props), false)
  )
  select
    coalesce(sum(case
      when c_armazena > 0 then case when vestido then 0 else c_ocupa * q * (case when equipado then 0.5 else 1 end) end
      when vestido then c_ocupa * q * 0.5
      when (e->>'containerId') is not null then c_ocupa * q * 0.75
      when equipado then c_ocupa * q * 0.5
      else c_ocupa * q end), 0)::numeric as peso,
    (10 * (1 + 0.1 * (coalesce(p_forca, 0) + coalesce(p_fisico, 0)))
      + coalesce(sum(case when c_armazena > 0 then c_armazena else 0 end), 0))::numeric as capacidade
  from validas;
$$;

-- Insere a conferência em transfer_item logo antes de gravar o destino, sem
-- reescrever o resto da função (troca de texto sobre a definição atual).
do $do$
declare
  d text;
  ancora text := E'  v_to_inv := jsonb_set(v_to_inv, \'{itens}\', v_itens_to);\n';
  bloco text := E'  v_to_inv := jsonb_set(v_to_inv, \'{itens}\', v_itens_to);\n'
    || E'  -- CARGA DE QUEM RECEBE (08/11/2026): acima de 100% e mais pesado, recusa.\n'
    || E'  DECLARE\n'
    || E'    v_f numeric; v_fi numeric; v_antes record; v_depois record;\n'
    || E'  BEGIN\n'
    || E'    SELECT forca_base, fisico_base INTO v_f, v_fi FROM public.personagens WHERE id = p_to_pj_id;\n'
    || E'    SELECT * INTO v_antes FROM public._menestrel_carga((SELECT inventario->\'itens\' FROM public.personagens WHERE id = p_to_pj_id), v_f, v_fi);\n'
    || E'    SELECT * INTO v_depois FROM public._menestrel_carga(v_itens_to, v_f, v_fi);\n'
    || E'    IF v_depois.capacidade > 0 AND v_depois.peso > v_depois.capacidade AND v_depois.peso > v_antes.peso THEN\n'
    || E'      RETURN jsonb_build_object(\'ok\', false, \'motivo\', \'carga_maxima\');\n'
    || E'    END IF;\n'
    || E'  END;\n';
begin
  d := pg_get_functiondef('public.transfer_item(bigint,bigint,text,jsonb,bigint)'::regprocedure);
  if position('CARGA DE QUEM RECEBE' in d) > 0 then
    raise notice 'transfer_item já confere a carga';
    return;
  end if;
  if (length(d) - length(replace(d, ancora, ''))) / length(ancora) <> 1 then
    raise exception 'âncora não encontrada (ou repetida) em transfer_item';
  end if;
  execute replace(d, ancora, bloco);
end
$do$;
