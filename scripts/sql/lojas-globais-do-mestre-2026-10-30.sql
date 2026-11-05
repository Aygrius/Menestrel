-- ============================================================
-- lojas-globais-do-mestre-2026-10-30.sql
-- ============================================================
-- "A loja fixa das cidades e reinos são globais, ou seja, um item que sai na
-- mesa X, sai também da mesa Y." / "A loja é global apenas na conta do
-- mestre [...] O estoque global será aquele inserido por mim inicialmente.
-- Lojas novas são apenas da mesa." (usuário, 30/10/2026)
--
-- O estoque continua morando em historias.estoque_loja (compra, venda,
-- propostas e o painel do Mestre não mudam). A loja fixa ganha `global: true`
-- e este gatilho a mantém igual em todas as mesas do MESMO Mestre:
--   • PUXA: loja global que chega numa mesa (mesa nova, ou a loja criada ao
--     abrir o Estoque) nasce com os itens e fileiras das irmãs;
--   • EMPURRA: mudou os itens ou as fileiras de uma loja global, a mudança vai
--     para a loja do mesmo lugar nas outras mesas do Mestre.
-- `ativo` (aberta/fechada) segue sendo de cada mesa.
-- A propagação marca `menestrel.sync_loja` para não disparar de novo.
-- Duas compras ao mesmo tempo em mesas diferentes podem colidir; aí o Postgres
-- aborta uma delas (impasse detectado) e o jogador tenta de novo.
-- ============================================================

begin;

create or replace function public._menestrel_chave_loja(c jsonb)
returns text language sql immutable as $$
  select lower(btrim(coalesce(nullif(c->>'lugar', ''), c->>'nome', '')))
$$;

create or replace function public._menestrel_lojas_globais()
returns trigger language plpgsql security definer set search_path to 'public', 'pg_catalog' as $$
declare
  v_novo jsonb;
  v_ord int;
  c jsonb;
  c_old jsonb;
  v_irma jsonb;
  v_chave text;
begin
  if coalesce(current_setting('menestrel.sync_loja', true), '') = 'on' then return new; end if;
  if new.mestre_id is null or jsonb_typeof(new.estoque_loja->'comercios') is distinct from 'array' then return new; end if;

  -- 1) PUXA: a loja global que não existia antes nesta mesa.
  v_novo := new.estoque_loja;
  for v_ord in 0 .. jsonb_array_length(v_novo->'comercios') - 1 loop
    c := v_novo->'comercios'->v_ord;
    continue when not coalesce((c->>'global')::boolean, false);
    continue when tg_op = 'UPDATE' and exists (
      select 1 from jsonb_array_elements(coalesce(old.estoque_loja->'comercios', '[]'::jsonb)) o
       where o->>'id' = c->>'id');
    v_chave := public._menestrel_chave_loja(c);
    v_irma := null;
    select x into v_irma
      from public.historias h, jsonb_array_elements(h.estoque_loja->'comercios') x
     where h.mestre_id = new.mestre_id and h.id <> new.id
       and jsonb_typeof(h.estoque_loja->'comercios') = 'array'
       and coalesce((x->>'global')::boolean, false)
       and public._menestrel_chave_loja(x) = v_chave
     order by h.updated_at desc nulls last
     limit 1;
    if v_irma is not null then
      v_novo := jsonb_set(v_novo, array['comercios', v_ord::text],
        c || jsonb_build_object('itens', coalesce(v_irma->'itens', '[]'::jsonb),
                                'fileiras', coalesce(v_irma->'fileiras', '[]'::jsonb)));
    end if;
  end loop;
  new.estoque_loja := v_novo;

  -- 2) EMPURRA: a loja global que mudou nesta gravação.
  if tg_op = 'UPDATE' then
    perform set_config('menestrel.sync_loja', 'on', true);
    for c in select x from jsonb_array_elements(new.estoque_loja->'comercios') x
              where coalesce((x->>'global')::boolean, false) loop
      c_old := null;
      select o into c_old from jsonb_array_elements(coalesce(old.estoque_loja->'comercios', '[]'::jsonb)) o
       where o->>'id' = c->>'id';
      continue when c_old is null;   -- recém-chegada: já puxou
      continue when c_old->'itens' is not distinct from c->'itens'
                and c_old->'fileiras' is not distinct from c->'fileiras';
      v_chave := public._menestrel_chave_loja(c);
      update public.historias h
         set estoque_loja = jsonb_set(h.estoque_loja, '{comercios}', (
           select jsonb_agg(case when coalesce((x->>'global')::boolean, false)
                                      and public._menestrel_chave_loja(x) = v_chave
                                 then x || jsonb_build_object('itens', coalesce(c->'itens', '[]'::jsonb),
                                                              'fileiras', coalesce(c->'fileiras', '[]'::jsonb))
                                 else x end order by t.ord)
             from jsonb_array_elements(h.estoque_loja->'comercios') with ordinality as t(x, ord)))
       where h.mestre_id = new.mestre_id and h.id <> new.id
         and jsonb_typeof(h.estoque_loja->'comercios') = 'array'
         and exists (select 1 from jsonb_array_elements(h.estoque_loja->'comercios') x
                      where coalesce((x->>'global')::boolean, false)
                        and public._menestrel_chave_loja(x) = v_chave);
    end loop;
    perform set_config('menestrel.sync_loja', 'off', true);
  end if;
  return new;
end $$;

drop trigger if exists historias_lojas_globais on public.historias;
create trigger historias_lojas_globais
  before insert or update of estoque_loja on public.historias
  for each row execute function public._menestrel_lojas_globais();

-- ── Migração: as lojas de hoje são todas fixas (o "+" de loja saiu em 30/10).
-- Cópia de segurança primeiro.
create schema if not exists backup;
create table if not exists backup.estoque_loja_globais_2026_10_30 as
  select id, titulo, mestre_id, estoque_loja, now() as copiado_em from public.historias;

select set_config('menestrel.sync_loja', 'on', true);

-- Marca as lojas com lugar como globais.
update public.historias h
   set estoque_loja = jsonb_set(h.estoque_loja, '{comercios}', (
     select jsonb_agg(case when public._menestrel_chave_loja(x) <> ''
                           then x || '{"global": true}'::jsonb else x end order by t.ord)
       from jsonb_array_elements(h.estoque_loja->'comercios') with ordinality as t(x, ord)))
 where jsonb_typeof(h.estoque_loja->'comercios') = 'array'
   and jsonb_array_length(h.estoque_loja->'comercios') > 0;

-- O estoque que vale: por Mestre e lugar, a cópia com mais itens (empate: a
-- mesa mais recente). Hoje só Saupami, em "As Marcas do Passado", tem itens.
with copias as (
  select h.mestre_id, public._menestrel_chave_loja(x) as chave, x, h.updated_at,
         row_number() over (partition by h.mestre_id, public._menestrel_chave_loja(x)
                            order by jsonb_array_length(coalesce(x->'itens', '[]'::jsonb)) desc,
                                     h.updated_at desc nulls last) as rk
    from public.historias h, jsonb_array_elements(h.estoque_loja->'comercios') x
   where jsonb_typeof(h.estoque_loja->'comercios') = 'array'
     and coalesce((x->>'global')::boolean, false)
), vencedora as (select mestre_id, chave, x as loja from copias where rk = 1)
update public.historias h
   set estoque_loja = jsonb_set(h.estoque_loja, '{comercios}', (
     select jsonb_agg(case when v.loja is not null
                           then x || jsonb_build_object('itens', coalesce(v.loja->'itens', '[]'::jsonb),
                                                        'fileiras', coalesce(v.loja->'fileiras', '[]'::jsonb))
                           else x end order by t.ord)
       from jsonb_array_elements(h.estoque_loja->'comercios') with ordinality as t(x, ord)
       left join vencedora v on v.mestre_id = h.mestre_id
                            and coalesce((x->>'global')::boolean, false)
                            and v.chave = public._menestrel_chave_loja(x)))
 where jsonb_typeof(h.estoque_loja->'comercios') = 'array'
   and jsonb_array_length(h.estoque_loja->'comercios') > 0;

select set_config('menestrel.sync_loja', 'off', true);

commit;
