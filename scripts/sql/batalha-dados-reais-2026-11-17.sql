-- DADOS REAIS NA BATALHA (17/11/2026)
-- Usuário: "Adicione no tabuleiro de batalha a opção para jogar usando dados
-- reais. Apenas o mestre habilita essa função, a batalha toda funciona com
-- dado real, ou dado virtual. [...] ao clicar na rolagem, abrirá um modal
-- pedindo para inserir o valor. E o próprio jogador informa o valor."
--
-- 1. A batalha guarda o modo: false = dado virtual (o de sempre), true = dado
--    real. Quem grava é o Mestre (a RLS de batalhas já é dele).
-- 2. rolar_iniciativa_jogador ganha p_valor: com a batalha em dado real, o
--    jogador informa o d10 que rolou na mesa (1..10). Sem dado real, o valor
--    informado é ignorado e o servidor sorteia, como antes.

alter table public.batalhas add column if not exists dados_reais boolean not null default false;

drop function if exists public.rolar_iniciativa_jogador(bigint, bigint);

create or replace function public.rolar_iniciativa_jogador(p_batalha_id bigint, p_pj_id bigint, p_valor int default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); v_bat public.batalhas%rowtype; v_valor int; v_parts jsonb;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado'); end if;
  if not exists (select 1 from public.personagens where id = p_pj_id and user_id = v_uid) then
    return jsonb_build_object('ok', false, 'motivo', 'nao_e_seu'); end if;
  select * into v_bat from public.batalhas where id = p_batalha_id for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'batalha_nao_encontrada'); end if;
  if v_bat.estado <> 'setup' then return jsonb_build_object('ok', false, 'motivo', 'batalha_nao_em_montagem'); end if;
  if exists (select 1 from jsonb_array_elements(coalesce(v_bat.participantes, '[]')) e
             where e->>'tipo' = 'pj' and e->>'ref_id' = p_pj_id::text and coalesce((e->>'ini_rolada')::boolean, false)) then
    return jsonb_build_object('ok', false, 'motivo', 'ja_rolou'); end if;
  if v_bat.dados_reais then
    if p_valor is null or p_valor < 1 or p_valor > 10 then
      return jsonb_build_object('ok', false, 'motivo', 'valor_invalido'); end if;
    v_valor := p_valor;
  else
    v_valor := 1 + floor(random() * 10)::int;
  end if;
  select coalesce(jsonb_agg(case when e->>'tipo' = 'pj' and e->>'ref_id' = p_pj_id::text
           then e || jsonb_build_object('bonus_iniciativa', v_valor, 'ini_rolada', true) else e end order by ord), '[]')
    into v_parts from jsonb_array_elements(coalesce(v_bat.participantes, '[]')) with ordinality as t(e, ord);
  if v_parts = v_bat.participantes then return jsonb_build_object('ok', false, 'motivo', 'nao_participante'); end if;
  update public.batalhas set participantes = v_parts where id = p_batalha_id;
  return jsonb_build_object('ok', true, 'valor', v_valor);
end $function$;

revoke all on function public.rolar_iniciativa_jogador(bigint, bigint, int) from public, anon;
grant execute on function public.rolar_iniciativa_jogador(bigint, bigint, int) to authenticated, service_role;
