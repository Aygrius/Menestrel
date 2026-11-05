-- ============================================================================
-- AS RECEITAS QUE A REFORMA DEIXOU DE FORA (31/10/2026)
-- ============================================================================
-- Pedido do usuário: "A caneleira de verrogar não tem receita?" → "Os
-- conjuntos não precisam de receita. Apenas os itens que ficaram faltando."
--
-- A reforma das armaduras e vestimentas (30–31/10/2026) criou peças DEPOIS da
-- geração de receitas (fabricacao-2026-10-06.sql). Ficaram sem receita:
--   • Armaduras: Caneleira, Perneira e Perneira Pesada das 15 culturas;
--   • Vestimentas: Calça, Bombacha, Capuz, Chapéu, Cachecol, Lenço, Dragona,
--     Luva, Sandália, Sapato, Sobretudo e Túnica, por tecido e por profissão.
-- Os Conjuntos de Armadura ficam SEM receita (decisão do usuário): o
-- conjunto é a soma das peças. Peças antigas sem receita (únicas, mágicas,
-- ataques naturais) não são desta reforma e não entram.
--
-- A RÉGUA é a do gerador, com uma diferença: o material sai da CLASSE
-- (armadura) e da BASE (vestimenta), não do nome. O nome erra duas vezes —
-- "Calça de Bardo" não diz o tecido, e o gerador testa '%ouro%' antes de
-- '%couro%', de modo que tudo que é de couro casa como OURO.
--   Armadura Leve   → 20 Couro (couro_animal — o `couro_curtido` que o
--                     gerador pede NÃO existe no catálogo), Artesanato
--   Média / Pesada  → Aço pela régua de `ocupa` (20/40/60/80) + Couro
--                     (metade do ocupa, mín. 1), Metalurgia
--   Vestimenta      → o tecido da base (couro = couro_animal; a Luva tem
--                     base luva-pano-<tecido>), 20, Artesanato
--   dias            → a raiz do valor, como no gerador (a coluna é obrigatória;
--                     o prazo de verdade são as horas do grupo).
-- Cada receita nova ganha a sua "Receita de …" (passo 2, o mesmo de
-- receitas-viram-itens-2026-10-31.sql).
-- ============================================================================

-- ── 1. As receitas ──────────────────────────────────────────────────────────
with alvo as (
  select i.slug, i.grupo, i.tipo_armadura, coalesce(i.ocupa, 1) as ocupa, coalesce(i.valor_latao, 0) as valor,
         replace(substr(i.base, length(split_part(i.base, '-', 1)) + 2), 'pano-', '') as mat_base
    from public.itens i
   where i.grupo in ('Armaduras', 'Vestimentas')
     and i.created_at::date between '2026-10-30' and '2026-10-31'
     and coalesce(i.magico, false) = false
     and i.nome not like 'Conjunto %'
     and i.base is not null
     and not exists (select 1 from public.receitas r where r.resultado_slug = i.slug)
), regra as (
  select a.slug, a.valor,
         case
           when a.grupo = 'Armaduras' and a.tipo_armadura = 'L' then 'couro_animal'
           when a.grupo = 'Armaduras' then 'aco'
           when a.mat_base = 'couro' then 'couro_animal'
           else a.mat_base
         end as princ,
         case when a.ocupa <= 3 then 20 when a.ocupa <= 5 then 40 when a.ocupa <= 8 then 60 else 80 end as qtd,
         a.grupo = 'Armaduras' and coalesce(a.tipo_armadura, '') in ('M', 'P') as metal,
         a.ocupa
    from alvo a
)
insert into public.receitas (resultado_slug, habilidade_key, dificuldade, dias, materiais)
select g.slug,
       case when g.metal then 'metalurgia' else 'artesanato' end,
       'D',
       greatest(5, least(25, round(sqrt(g.valor) / 6.0)::int + 4)),
       jsonb_build_array(jsonb_build_object('slug', g.princ, 'qtd', g.qtd))
         || case when g.metal
                 then jsonb_build_array(jsonb_build_object('slug', 'couro_animal', 'qtd', greatest(1, round(g.ocupa / 2)::int)))
                 else '[]'::jsonb end
  from regra g
  join public.itens m on m.slug = g.princ          -- material que existe no catálogo
on conflict (resultado_slug) do nothing;

-- ── 2. A "Receita de …" de cada uma (idempotente) ───────────────────────────
insert into public.itens (slug, nome, grupo, base, tipo, ocupa, origem, icone, valor_latao, descricao, magico)
select 'receita_' || r.resultado_slug, 'Receita de ' || i.nome, 'Itens', 'pergaminho', 'S', 0.1, 'Comum',
       'ti-file-text', greatest(1, round(coalesce(i.valor_latao, 0) * 0.1)::int),
       'Instruções para fabricar ' || i.nome || ': os materiais, as medidas e a ordem do trabalho. '
         || 'Quem a aprende guarda o saber; o pergaminho se perde no estudo.',
       false
  from public.receitas r
  join public.itens i on i.slug = r.resultado_slug
on conflict (slug) do nothing;
