-- condicoes-escala-0-100-2026-09-27.sql
--
-- "Hoje as barras vão de -50 a +50 [...] Agora as barras vão de 0 a 100. 0 é o
--  mundo ideal e 100 é o pior cenário." (usuário, 27/09/2026)
--
-- Decisões do usuário no mesmo dia:
--   • os valores atuais dos personagens são ZERADOS;
--   • os itens são convertidos direto (sem revisão prévia);
--   • roupas e acessórios viram PROTEÇÃO enquanto vestidos.
--
-- O que este script fez (aplicado como migração condicoes_escala_0_100):
--   1. backup dos textos de efeito de 141 itens em backup_itens_efeitos_2026_09_27;
--   2. reescreveu os textos com os nomes novos, o sinal no VERBO:
--        "Aumenta 35 de Hidratação"  → "Reduz 35 de Sede"
--        "Diminui 20 de Sanidade"    → "Aumenta 20 de Loucura"
--        Temperatura: aquecer → "Reduz N de Frio"; esfriar → "Reduz N de Calor"
--        Vestimentas: o que melhorava → "Protege N de X" (vale enquanto vestida)
--        Energia Física/Heroica, Karma, Absorção: ficam como estavam;
--   3. backup das condições dos personagens em backup_condicoes_2026_09_27 e
--      estado_atual.condicoes = {} para todos.
--
-- REVERTER (textos): update itens i set efeito_positivo = b.efeito_positivo,
--   efeito_negativo = b.efeito_negativo from backup_itens_efeitos_2026_09_27 b
--   where i.slug = b.slug;
-- REVERTER (condições): update personagens p set estado_atual =
--   jsonb_set(p.estado_atual, '{condicoes}', b.condicoes)
--   from backup_condicoes_2026_09_27 b where p.id = b.personagem_id;
--   (o código da escala nova lê valores 0..100; reverter os dados sem reverter
--   o código deixaria as barras antigas com o sentido invertido)

create table if not exists public.backup_itens_efeitos_2026_09_27 (slug text primary key, efeito_positivo text, efeito_negativo text, copiado_em timestamptz default now());
alter table public.backup_itens_efeitos_2026_09_27 enable row level security;
create table if not exists public.backup_condicoes_2026_09_27 (personagem_id bigint primary key, condicoes jsonb, copiado_em timestamptz default now());
alter table public.backup_condicoes_2026_09_27 enable row level security;

create or replace function pg_temp.lista(a text[]) returns text language sql as $$
  select case when cardinality(a) = 1 then a[1]
              else array_to_string(a[1:cardinality(a)-1], ', ') || ' e ' || a[cardinality(a)] end
$$;
create or replace function pg_temp.frase(t text) returns text language sql as $$
  select case when t is null then null else upper(left(t,1)) || substr(t,2) || '.' end
$$;
create or replace function pg_temp.conv_efeitos(p_pos text, p_neg text, p_grupo text) returns text[] language plpgsql as $$
declare
  campo record; parte text; verbo text; sinal int; n text; rotulo text; novo text;
  pools_pos text[] := '{}'; pools_neg text[] := '{}';
  reduz text[] := '{}'; aumenta text[] := '{}'; protege text[] := '{}';
  vest boolean := p_grupo = 'Vestimentas';
  m text[];
  mapa jsonb := '{"saude":"Doença","hidratacao":"Sede","alimentacao":"Fome","sobriedade":"Vício","sanidade":"Loucura","reputacao":"Desonra","sono":"Sono"}';
begin
  for campo in select * from (values (p_pos, 1), (p_neg, -1)) v(txt, s) loop
    if campo.txt is null or btrim(campo.txt) = '' then continue; end if;
    verbo := null;
    for parte in select btrim(x) from regexp_split_to_table(campo.txt, '\s*(,|;|\se\s)\s*') x loop
      parte := regexp_replace(parte, '[.!]+\s*$', '');
      if parte = '' then continue; end if;
      m := regexp_match(parte, '^(aumenta|diminui|dimiuni|reduz|restaura|recupera)\s+(.*)$', 'i');
      if m is not null then verbo := lower(m[1]); parte := m[2]; end if;
      m := regexp_match(parte, '^(\d+(?:[.,]\d+)?)\s*(?:de\s*)?(.+)$', 'i');
      if m is null then continue; end if;
      n := m[1]; rotulo := btrim(m[2]);
      sinal := campo.s;
      if lower(translate(rotulo,'áéíóúâêôãõç','aeiouaeoaoc')) = 'temperatura' then
        if coalesce(verbo,'') in ('diminui','dimiuni','reduz') then
          if vest then protege := protege || (n || ' de Calor'); else reduz := reduz || (n || ' de Calor'); end if;
        else
          if vest then protege := protege || (n || ' de Frio'); else reduz := reduz || (n || ' de Frio'); end if;
        end if;
        continue;
      end if;
      novo := mapa->>lower(translate(rotulo,'áéíóúâêôãõç','aeiouaeoaoc'));
      if novo is null then
        if sinal > 0 then pools_pos := pools_pos || (n || ' de ' || rotulo); else pools_neg := pools_neg || (n || ' de ' || rotulo); end if;
      elsif sinal > 0 then
        if vest then protege := protege || (n || ' de ' || novo); else reduz := reduz || (n || ' de ' || novo); end if;
      else
        aumenta := aumenta || (n || ' de ' || novo);
      end if;
    end loop;
  end loop;
  return array[
    nullif(concat_ws('; ',
      case when cardinality(pools_pos) > 0 then 'Aumenta ' || pg_temp.lista(pools_pos) end,
      case when cardinality(reduz) > 0 then 'reduz ' || pg_temp.lista(reduz) end,
      case when cardinality(protege) > 0 then 'protege ' || pg_temp.lista(protege) end), ''),
    nullif(concat_ws('; ',
      case when cardinality(pools_neg) > 0 then 'Diminui ' || pg_temp.lista(pools_neg) end,
      case when cardinality(aumenta) > 0 then 'aumenta ' || pg_temp.lista(aumenta) end), '')
  ];
end $$;

insert into public.backup_itens_efeitos_2026_09_27 (slug, efeito_positivo, efeito_negativo)
select slug, efeito_positivo, efeito_negativo from public.itens
 where coalesce(efeito_positivo,'') ~* '(saúde|sono|hidrata|aliment|temperat|sobried|sanidade|reputa)'
    or coalesce(efeito_negativo,'') ~* '(saúde|sono|hidrata|aliment|temperat|sobried|sanidade|reputa)'
on conflict (slug) do nothing;

update public.itens i
   set efeito_positivo = pg_temp.frase(c.v[1]), efeito_negativo = pg_temp.frase(c.v[2])
  from (select slug, pg_temp.conv_efeitos(efeito_positivo, efeito_negativo, grupo) v
          from public.itens
         where slug in (select slug from public.backup_itens_efeitos_2026_09_27)) c
 where i.slug = c.slug;

insert into public.backup_condicoes_2026_09_27 (personagem_id, condicoes)
select id, estado_atual->'condicoes' from public.personagens where estado_atual ? 'condicoes'
on conflict (personagem_id) do nothing;

update public.personagens set estado_atual = jsonb_set(estado_atual, '{condicoes}', '{}'::jsonb)
 where estado_atual ? 'condicoes';
