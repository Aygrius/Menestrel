-- ============================================================================
-- O COURO CERTO NAS RECEITAS ANTIGAS (31/10/2026)
-- ============================================================================
-- Pedido do usuário ("Pode corrigir os dois"), sobre dois defeitos achados ao
-- gerar receitas-da-reforma-2026-10-31.sql. Os dois vêm do gerador de
-- fabricacao-2026-10-06.sql:
--
-- 1. COURO QUE NÃO EXISTE. O gerador pede `couro_curtido`, que nunca esteve
--    no catálogo. O couro é `couro_animal` ("Couro"). 377 receitas pediam um
--    material impossível de ter — nenhuma delas se fabricava.
-- 2. COURO QUE VIROU OURO. O gerador testa '%ouro%' antes de '%couro%' no
--    nome, e "couro" contém "ouro". As 90 armaduras leves das culturas
--    (Braçadeira, Calça, Colete, Coturno, Ombreira) e duas roupas de couro
--    (Chapéu, Blusa) pediam 20 Ouro — 20.000 latões por peças de 100 a 1.500.
--    Passam a pedir 20 Couro, com Artesanato, como a régua do gerador manda
--    para couro (sem o Couro extra, que é das armaduras de metal).
--
-- O gerador foi corrigido junto (couro antes de ouro, e `couro_animal`), para
-- uma re-geração não trazer os dois de volta.
-- ============================================================================

-- ── 2. Couro que virou ouro (antes do 1, que não toca nestas) ───────────────
update public.receitas r
   set materiais = '[{"slug": "couro_animal", "qtd": 20}]'::jsonb,
       habilidade_key = 'artesanato', atualizado_em = now()
  from public.itens i
 where i.slug = r.resultado_slug
   and r.materiais->0->>'slug' = 'ouro_bruto'
   and ((i.grupo = 'Armaduras' and i.tipo_armadura = 'L') or i.base like '%-couro');

-- ── 1. couro_curtido → couro_animal ─────────────────────────────────────────
update public.receitas r
   set materiais = (
         select jsonb_agg(case when m->>'slug' = 'couro_curtido'
                               then jsonb_set(m, '{slug}', '"couro_animal"') else m end order by o)
           from jsonb_array_elements(r.materiais) with ordinality as t(m, o)),
       atualizado_em = now()
 where r.materiais @> '[{"slug": "couro_curtido"}]';

-- ── 3. A roupa pede o tecido da BASE ────────────────────────────────────────
-- Mesmo dia, usuário: "Pode corrigir esses também". "casaco" contém "aco" (os
-- 10 Casacos pediam Aço) e Capas e Sandálias caíam no algodão padrão. A base
-- (`capa-linho`, `luva-pano-seda`…) diz o tecido; couro = couro_animal.
update public.receitas r
   set materiais = jsonb_build_array(jsonb_build_object('slug', v.pede, 'qtd', coalesce((r.materiais->0->>'qtd')::int, 20))),
       habilidade_key = 'artesanato', atualizado_em = now()
  from (
    select i.slug, case m.mat when 'couro' then 'couro_animal' else m.mat end as pede
      from public.itens i
      cross join lateral (select replace(substr(i.base, length(split_part(i.base,'-',1))+2),'pano-','') as mat) m
     where i.grupo = 'Vestimentas' and m.mat in ('couro','algodao','linho','seda')
  ) v
 where v.slug = r.resultado_slug
   and r.materiais->0->>'slug' <> v.pede;
