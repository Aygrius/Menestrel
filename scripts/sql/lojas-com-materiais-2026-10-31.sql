-- ============================================================================
-- MATERIAIS NAS LOJAS DAS CIDADES E O TETO MENOR DAS RECEITAS (31/10/2026)
-- ============================================================================
-- Pedido do usuário: "Adicione nas lojas das cidades os itens básicos de
-- fabricação, em uma quantidade relevante para sua população. Baixe o teto
-- dos itens."
--
-- 1. Cada loja de CIDADE COM POPULAÇÃO ganha a matéria-prima da bancada, numa
--    fileira nova depois do que já vende (o que ela já tem não se repete).
--    A população vem de public.cidades pelo NOME (as lojas são globais entre
--    as mesas do Mestre; as cidades moram numa só). Ruína e reino ficam de fora.
--      comum        Madeira, Ferro, Cânhamo, Algodoeiro, Couro/Osso/Óleo Animal,
--                   Corda .................................. P/200   (10 a 500)
--      menos comum  Bicho de Seda, Vidro, Bronze ........... P/500   (4 a 200)
--      ferramenta   Equipamento de Carpinteiro ............. P/10000 (1 a 10)
--      plantas I    Amalil, Inina, Aria, Griffonia ......... P/1000  (5 a 100)
--      plantas II   Azpha, Nex, Lumenia, Targena ........... P/2000  (2 a 50), P ≥ 10.000
--      plantas III  Rubashi, Subella, Rubus, Vinna ......... P/5000  (1 a 20), P ≥ 30.000
--    Preço: o do catálogo (preco_latao_override nulo).
-- 2. O TETO das quantidades das receitas cai de 30/10 para 20/5 (principal /
--    cada secundário). A ferramenta continua 1.
-- ============================================================================

-- ── 1. Os materiais nas lojas ────────────────────────────────────────────────
create temporary table _mat (slug text, tipo text, ord int);
insert into _mat values
  ('madeira', 'comum', 1), ('ferro', 'comum', 2), ('canhamo', 'comum', 3), ('algodoeiro', 'comum', 4),
  ('couro_animal', 'comum', 5), ('osso_animal', 'comum', 6), ('oleo', 'comum', 7), ('corda_material', 'comum', 8),
  ('bicho_de_seda', 'raro', 9), ('vidro', 'raro', 10), ('bronze', 'raro', 11),
  ('equipamento_de_carpinteiro', 'ferramenta', 12),
  ('erva_amalil', 'p1', 13), ('planta_inina', 'p1', 14), ('cogumelo_aria', 'p1', 15), ('flolha_griffonia', 'p1', 16),
  ('erva_azpha', 'p2', 17), ('planta_nex', 'p2', 18), ('cogumelo_lumenia', 'p2', 19), ('flolha_rubus', 'p2', 20),
  ('erva_rubashi', 'p3', 21), ('planta_subella', 'p3', 22), ('cogumelo_orichalcum', 'p3', 23), ('flolha_vinna', 'p3', 24);

create temporary table _pop as
select lower(nome) as nome, max(populacao)::numeric as pop
  from public.cidades where coalesce(populacao, 0) > 0 group by lower(nome);

select set_config('menestrel.sync_loja', 'on', true);
update public.historias h
   set estoque_loja = jsonb_set(h.estoque_loja, '{comercios}', (
     select jsonb_agg(
       case when p.pop is null then c
       else c || jsonb_build_object('itens', coalesce(c->'itens', '[]'::jsonb) || coalesce((
         select jsonb_agg(jsonb_build_object(
                  'casa', ini.casa + n.rn - 1, 'slug', n.slug,
                  'entryId', 'mat-' || n.slug || '-' || (c->>'id'),
                  'estoque', n.qtd, 'preco_latao_override', null) order by n.rn)
           from (select m.slug, q.qtd, row_number() over (order by m.ord) as rn
                   from _mat m
                   cross join lateral (select case m.tipo
                       when 'comum' then least(500, greatest(10, round(p.pop / 200)))
                       when 'raro' then least(200, greatest(4, round(p.pop / 500)))
                       when 'ferramenta' then least(10, greatest(1, round(p.pop / 10000)))
                       when 'p1' then least(100, greatest(5, round(p.pop / 1000)))
                       when 'p2' then case when p.pop >= 10000 then least(50, greatest(2, round(p.pop / 2000))) else 0 end
                       when 'p3' then case when p.pop >= 30000 then least(20, greatest(1, round(p.pop / 5000))) else 0 end
                     end::int as qtd) q
                  where q.qtd > 0
                    and exists (select 1 from public.itens i where i.slug = m.slug)
                    and not exists (select 1 from jsonb_array_elements(coalesce(c->'itens', '[]'::jsonb)) it
                                     where it->>'slug' = m.slug)) n,
                -- Começa na fileira seguinte à última casa ocupada (10 casas por fileira).
                (select (ceil((coalesce(max(coalesce(nullif(it->>'casa', '')::int, o::int - 1)), -1) + 1) / 10.0) * 10)::int as casa
                   from jsonb_array_elements(coalesce(c->'itens', '[]'::jsonb)) with ordinality as z(it, o)) ini
       ), '[]'::jsonb))
       end order by co)
       from jsonb_array_elements(h.estoque_loja->'comercios') with ordinality as y(c, co)
       left join _pop p on p.nome = lower(c->>'lugar')))
 where jsonb_typeof(h.estoque_loja->'comercios') = 'array';

drop table _pop;
drop table _mat;

-- ── 2. O teto menor ──────────────────────────────────────────────────────────
update public.receitas r
   set materiais = (
         select jsonb_agg(case when e ? 'qtd' and not coalesce((e->>'ferramenta')::boolean, false)
                               then jsonb_set(e, '{qtd}', to_jsonb(least((e->>'qtd')::int, case when o = 1 then 20 else 5 end)))
                               else e end order by o)
           from jsonb_array_elements(r.materiais) with ordinality as x(e, o)),
       atualizado_em = now()
 where exists (select 1 from jsonb_array_elements(r.materiais) with ordinality as x(e, o)
                where not coalesce((e->>'ferramenta')::boolean, false)
                  and (e->>'qtd')::int > case when o = 1 then 20 else 5 end);
