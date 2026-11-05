-- ============================================================================
-- RECEITA POR PEÇA, TESTE POR CLASSE (31/10/2026)
-- ============================================================================
-- Pedido do usuário:
--   "Ao invés de termos um item de receita 'Receita de Avambraço de Verrogar'
--    e um de 'Receita de Avambraço de Calco', teremos o item 'Receita de
--    Avambraço'. Se o item for criado pelo personagem Aldren, o item criado
--    será chamado de 'Avambraço de Aldren'. [...] Apenas o nome irá mudar, a
--    descrição carregará as informações do item criado."
--   "Para criar itens de armadura/arma pesada é necessário um teste Difícil de
--    Metalurgia e um teste Difícil de Artesanato. [...] média [...] Metalurgia.
--    [...] leve [...] Artesanato."
--   "Pode apagar as receitas antigas."
--
-- 1. receitas.testes text[] — as habilidades, uma rolagem cada. Receita COM
--    testes é receita de peça com GRAU (o resultado do dado ajusta a peça —
--    AJUSTE_POR_GRAU em src/01-core/inventario-helpers.jsx).
-- 2. AS 24 PEÇAS SEM CULTURA (`peca_<nome>`): as 15 culturas têm números
--    idênticos em cada peça (conferido no banco), então a peça da bancada é
--    uma cópia da primeira cultura com o nome da peça e SEM `conjunto` — não
--    conta para o bônus de conjunto de cultura nenhuma.
-- 3. Uma receita por peça (material da receita da cultura) e a sua
--    "Receita de <Peça>".
-- 4. As armas ganham os testes pela classe da base (arma-leve/medio/pesado).
--    Continuam uma receita por arma: arma não tem cultura.
-- 5. As "Receita de … de Cultura" nas lojas viram a receita da peça; depois
--    as receitas e os itens de receita por cultura são apagados (nenhum
--    personagem tinha aprendido nem carregava nenhuma).
-- ============================================================================

-- ── 1. A coluna ──────────────────────────────────────────────────────────────
alter table public.receitas add column if not exists testes text[];
comment on column public.receitas.testes is
  'Habilidades testadas em sequência (Difícil). Com testes, o pior resultado vira o grau da peça.';

-- ── 2. As peças sem cultura ──────────────────────────────────────────────────
create temporary table _peca as
select distinct on (i.base)
       i.base,
       regexp_replace(i.nome, ' de [^ ]+$', '') as peca,
       i.slug as modelo,
       'peca_' || replace(lower(translate(regexp_replace(i.nome, ' de [^ ]+$', ''),
         'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç', 'AAAAEEIOOOUCaaaaeeiooouc')), ' ', '_') as slug,
       case right(i.base, 4) when 'leve' then 'leve' when 'edio' then 'média' else 'pesada' end as classe
  from public.itens i
 where i.grupo = 'Armaduras' and i.base ~ '-(leve|medio|pesado)$' and i.nome not like 'Conjunto %'
 order by i.base, i.slug;

do $$
declare
  v_cols text;
  p record;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into v_cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'itens'
     and is_generated = 'NEVER' and coalesce(column_default, '') not like 'nextval%'
     and column_name not in ('id', 'slug', 'nome', 'descricao', 'conjunto', 'created_at', 'atualizado_em');
  for p in select * from _peca loop
    execute format(
      'insert into public.itens (slug, nome, descricao, %s) select $1, $2, $3, %s from public.itens where slug = $4 on conflict (slug) do nothing',
      v_cols, v_cols)
    using p.slug, p.peca,
          p.peca || ' de armadura ' || p.classe || ', sem marca de cultura: a peça que sai da bancada de quem aprendeu a receita.',
          p.modelo;
  end loop;
end $$;

-- ── 3. A receita de cada peça ────────────────────────────────────────────────
insert into public.receitas (resultado_slug, habilidade_key, dificuldade, dias, materiais, testes)
select p.slug,
       case p.classe when 'leve' then 'artesanato' else 'metalurgia' end,
       'D', r.dias, r.materiais,
       case p.classe when 'leve' then array['artesanato']
                     when 'média' then array['metalurgia']
                     else array['metalurgia', 'artesanato'] end
  from _peca p
  join public.receitas r on r.resultado_slug = p.modelo
on conflict (resultado_slug) do update
  set testes = excluded.testes, habilidade_key = excluded.habilidade_key,
      materiais = excluded.materiais, atualizado_em = now();

insert into public.itens (slug, nome, grupo, base, tipo, ocupa, origem, icone, valor_latao, descricao, magico)
select 'receita_' || p.slug, 'Receita de ' || p.peca, 'Itens', 'pergaminho', 'S', 0.1, 'Comum', 'ti-file-text',
       greatest(1, round(coalesce(i.valor_latao, 0) * 0.1)::int),
       'Instruções para fabricar ' || lower(left(p.peca, 1)) || substr(p.peca, 2) || ' de qualquer cultura. '
         || 'Quem a aprende guarda o saber; o pergaminho se perde no estudo.',
       false
  from _peca p join public.itens i on i.slug = p.slug
on conflict (slug) do nothing;

-- ── 4. As armas: o teste pela classe ─────────────────────────────────────────
update public.receitas r
   set testes = case right(i.base, 4) when 'leve' then array['artesanato']
                                      when 'edio' then array['metalurgia']
                                      else array['metalurgia', 'artesanato'] end,
       habilidade_key = case right(i.base, 4) when 'leve' then 'artesanato' else 'metalurgia' end,
       dificuldade = 'D', atualizado_em = now()
  from public.itens i
 where i.slug = r.resultado_slug and i.grupo = 'Armas' and i.base ~ '^arma-(leve|medio|pesado)$';

-- ── 5. As lojas trocam de receita; as antigas saem ──────────────────────────
create temporary table _troca as
select 'receita_' || i.slug as velho, 'receita_' || p.slug as novo
  from public.itens i join _peca p on p.base = i.base
 where i.grupo = 'Armaduras' and i.nome not like 'Conjunto %' and i.slug <> p.slug;

-- O trigger das lojas globais não precisa espelhar: a troca vale em todas.
select set_config('menestrel.sync_loja', 'on', true);
update public.historias h
   set estoque_loja = jsonb_set(h.estoque_loja, '{comercios}', (
         select jsonb_agg(c || jsonb_build_object('itens', coalesce((
                  select jsonb_agg(case when t.novo is not null
                                        then it || jsonb_build_object('slug', t.novo) else it end order by o)
                    from jsonb_array_elements(coalesce(c->'itens', '[]'::jsonb)) with ordinality as x(it, o)
                    left join _troca t on t.velho = it->>'slug'), '[]'::jsonb)) order by co)
           from jsonb_array_elements(h.estoque_loja->'comercios') with ordinality as y(c, co)))
 where jsonb_typeof(h.estoque_loja->'comercios') = 'array'
   and exists (select 1 from jsonb_array_elements(h.estoque_loja->'comercios') c,
                             jsonb_array_elements(coalesce(c->'itens', '[]'::jsonb)) it
                join _troca t on t.velho = it->>'slug');

delete from public.receitas r
 using public.itens i
 where i.slug = r.resultado_slug and i.grupo = 'Armaduras'
   and i.base ~ '-(leve|medio|pesado)$' and i.slug not like 'peca\_%';
delete from public.itens where slug in (select velho from _troca);

drop table if exists _troca;
drop table if exists _peca;
