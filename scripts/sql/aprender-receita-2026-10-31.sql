-- ============================================================================
-- APRENDER UMA RECEITA GASTA O ITEM; SEM COROA DE COBRE E DE LATÃO (31/10/2026)
-- ============================================================================
-- Pedido do usuário:
--   "Quando o personagem aprende uma receita, o item da receita some e o
--    personagem fica com a receita salva para fabricar quantos itens quiser.
--    Remova as coroas de cobre e latão."
--
-- 1. personagens.receitas_aprendidas text[] — os resultado_slug que o
--    personagem sabe fabricar. A bancada lê esta lista (podeFabricar, em
--    src/01-core/fabricacao.jsx); o item "Receita de …" na mochila, sozinho,
--    não fabrica.
-- 2. aprender_receita(p_pj_id, p_instance_id) — o dono aprende: tira UMA
--    unidade do item do inventário e grava a receita, na mesma transação.
--    Receita já sabida não gasta o item ('ja_sabe'). O trigger
--    personagens_inventario_versao sobe a versão, e o gravador do cliente
--    (alterarInventario) vê a mudança.
-- 3. Coroa de Cobre e Coroa de Latão saem do catálogo, com receita e
--    "Receita de …" (nenhum inventário, loja ou anúncio as tinha). As bases
--    voltaram à lista ouro/prata/porcelana/marfim em bases-item.jsx.
-- ============================================================================

-- ── 1. A lista do personagem ────────────────────────────────────────────────
alter table public.personagens
  add column if not exists receitas_aprendidas text[] not null default '{}';
comment on column public.personagens.receitas_aprendidas is
  'Receitas que o personagem aprendeu (resultado_slug de public.receitas). Grava-se por aprender_receita.';

-- ── 2. Aprender ─────────────────────────────────────────────────────────────
create or replace function public.aprender_receita(p_pj_id bigint, p_instance_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid  uuid := auth.uid();
  v_pj   record;
  v_inst jsonb;
  v_slug text;
  v_res  text;
  v_qtd  int;
  v_nome text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado'); end if;

  select id, inventario, receitas_aprendidas into v_pj
    from public.personagens where id = p_pj_id and user_id = v_uid for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'pj_nao_encontrado'); end if;

  select elem into v_inst
    from jsonb_array_elements(coalesce(v_pj.inventario->'itens', '[]'::jsonb)) as elem
   where elem->>'instanceId' = p_instance_id limit 1;
  if v_inst is null then return jsonb_build_object('ok', false, 'motivo', 'item_nao_encontrado'); end if;
  if v_inst->>'anuncio_id' is not null then return jsonb_build_object('ok', false, 'motivo', 'item_a_venda'); end if;

  v_slug := v_inst->>'slug';
  if v_slug is null or left(v_slug, 8) <> 'receita_' then
    return jsonb_build_object('ok', false, 'motivo', 'item_nao_ensina');
  end if;
  v_res := substr(v_slug, 9);
  if not exists (select 1 from public.receitas where resultado_slug = v_res) then
    return jsonb_build_object('ok', false, 'motivo', 'receita_nao_encontrada');
  end if;
  if v_res = any (coalesce(v_pj.receitas_aprendidas, '{}')) then
    return jsonb_build_object('ok', false, 'motivo', 'ja_sabe');
  end if;

  v_qtd := greatest(1, coalesce((v_inst->>'quantidade')::int, 1));

  update public.personagens
     set inventario = jsonb_set(inventario, '{itens}', coalesce((
           select jsonb_agg(case when e->>'instanceId' = p_instance_id
                                 then jsonb_set(e, '{quantidade}', to_jsonb(v_qtd - 1))
                                 else e end order by o)
             from jsonb_array_elements(inventario->'itens') with ordinality as t(e, o)
            where not (e->>'instanceId' = p_instance_id and v_qtd <= 1)
         ), '[]'::jsonb)),
         receitas_aprendidas = array_append(coalesce(receitas_aprendidas, '{}'), v_res)
   where id = p_pj_id and user_id = v_uid;

  select nome into v_nome from public.itens where slug = v_res;
  return jsonb_build_object('ok', true, 'receita', v_res, 'nome', v_nome);
end;
$$;

revoke all on function public.aprender_receita(bigint, text) from public, anon;
grant execute on function public.aprender_receita(bigint, text) to authenticated;

-- ── 3. Sem Coroa de Cobre e de Latão ────────────────────────────────────────
delete from public.receitas where resultado_slug in ('coroa_cobre', 'coroa_latao');
delete from public.itens
 where slug in ('coroa_cobre', 'coroa_latao', 'receita_coroa_cobre', 'receita_coroa_latao');
