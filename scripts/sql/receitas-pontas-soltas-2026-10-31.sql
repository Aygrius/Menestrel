-- ============================================================================
-- AS PONTAS SOLTAS DA REVISÃO (31/10/2026)
-- ============================================================================
-- Rodar DEPOIS de materiais-refinados-2026-10-31.sql (usa o Couro refinado e
-- os preços novos). Respostas do usuário à revisão:
--   3 - "Gere a receita usando a regra das demais."
--   4 - Arco Élfico, Espada Élfica, Lança Élfica e Machado de Blur "Não são
--       fabricáveis" — nada a fazer: continuam sem receita.
--   5 - "Corda vai em arco, instrumentos, roupa. Vidro vai em frasco. Bronze
--       vai em armaduras."
--   7 - "Pode colocar preço em tudo, de acordo com sua importância. Pode
--       colocar preço nos pergaminhos."
--
-- A REGRA DAS DEMAIS (materiais-refinados, passo 5): o material principal
-- paga metade do valor da peça (1 a 30 unidades); cada secundário 10% (1 a 10).
-- ============================================================================

-- ── 1. As 17 peças comuns que ficaram sem receita (16 roupas + Estojo) ──────
-- Roupa de tecido: o tecido da BASE (couro = Couro refinado) + Corda.
-- Estojo: Couro + Corda.
insert into public.receitas (resultado_slug, habilidade_key, dificuldade, dias, materiais)
select i.slug, 'artesanato', 'D', 5,
       jsonb_build_array(
         jsonb_build_object('slug', p.slug, 'qtd',
           greatest(1, least(30, round(coalesce(i.valor_latao, 0) * 0.5 / greatest(1, coalesce(p.valor_latao, 1)))::int))),
         jsonb_build_object('slug', 'corda_material', 'qtd',
           greatest(1, least(10, round(coalesce(i.valor_latao, 0) * 0.1 / greatest(1, coalesce(c.valor_latao, 1)))::int))))
  from public.itens i
  cross join lateral (select case
           when i.slug = 'estojo' then 'couro_curtido'
           else case replace(substr(i.base, length(split_part(i.base, '-', 1)) + 2), 'pano-', '')
                  when 'couro' then 'couro_curtido'
                  else replace(substr(i.base, length(split_part(i.base, '-', 1)) + 2), 'pano-', '') end
         end as material) m
  join public.itens p on p.slug = m.material
  join public.itens c on c.slug = 'corda_material'
 where i.slug in ('bombacha_algodao', 'bombacha_couro', 'cachecol_algodao', 'cachecol_linho', 'cachecol_seda',
                  'calca_algodao', 'calca_linho', 'calca_seda', 'capuz_algodao', 'capuz_couro', 'capuz_seda',
                  'lenco_algodao', 'lenco_linho', 'lenco_seda', 'luva_algodao', 'luva_seda', 'estojo')
on conflict (resultado_slug) do nothing;

-- ── 2. Corda, Vidro e Bronze nas receitas ───────────────────────────────────
-- Acrescenta um secundário (10% do valor, 1 a 10) onde ainda não estiver.
create temporary table _sec as
select r.resultado_slug, s.material
  from public.receitas r
  join public.itens i on i.slug = r.resultado_slug
  cross join lateral (values
    -- Corda: arcos, instrumentos e roupa de tecido.
    (case when (i.grupo = 'Armas' and i.nome ilike 'arco%')
            or i.grupo = 'Instrumentos'
            or (i.grupo = 'Vestimentas'
                and replace(substr(i.base, length(split_part(i.base, '-', 1)) + 2), 'pano-', '')
                    in ('couro', 'algodao', 'linho', 'seda'))
          then 'corda_material' end),
    -- Bronze: as armaduras (as 24 peças e as de montaria).
    (case when i.grupo = 'Armaduras' then 'bronze' end)
  ) as s(material)
 where s.material is not null
   and not (r.materiais @> jsonb_build_array(jsonb_build_object('slug', s.material)));

update public.receitas r
   set materiais = r.materiais || (
         select jsonb_agg(jsonb_build_object('slug', s.material, 'qtd',
                  greatest(1, least(10, round(coalesce(i.valor_latao, 0) * 0.1 / greatest(1, coalesce(m.valor_latao, 1)))::int))))
           from _sec s join public.itens m on m.slug = s.material
          where s.resultado_slug = r.resultado_slug),
       atualizado_em = now()
  from public.itens i
 where i.slug = r.resultado_slug
   and exists (select 1 from _sec s where s.resultado_slug = r.resultado_slug);
drop table _sec;

-- Vidro: o Frasco passa a ser de vidro (material principal).
update public.receitas r
   set materiais = jsonb_build_array(jsonb_build_object('slug', 'vidro', 'qtd',
         greatest(1, least(30, round(coalesce(i.valor_latao, 0) * 0.5 / greatest(1, coalesce(v.valor_latao, 1)))::int)))),
       habilidade_key = 'artesanato', atualizado_em = now()
  from public.itens i, public.itens v
 where i.slug = r.resultado_slug and v.slug = 'vidro' and i.base = 'frasco';

-- ── 3. Preço em tudo ─────────────────────────────────────────────────────────
-- Pergaminho de MAGIA: 500 latões por ponto de custo da magia (1 a 4 → 500 a
-- 2.000). Pergaminho de TÉCNICA: 400 por ponto (1 a 2 → 400 e 800). O custo é
-- o que a magia/técnica pesa na ficha — a régua de importância que o jogo já tem.
update public.itens i set valor_latao = 500 * greatest(1, coalesce(m.custo, 1)), atualizado_em = now()
  from public.magias m
 -- O casamento é pelo SLUG: a coluna itens.magia guarda o NOME ("Bola de Fogo").
 where i.slug = 'pergaminho_' || m.key and coalesce(i.valor_latao, 0) = 0;
update public.itens i set valor_latao = 400 * greatest(1, coalesce(t.custo, 1)), atualizado_em = now()
  from public.tecnicas t
 where i.slug = 'pergaminho_tecnica_' || t.key and coalesce(i.valor_latao, 0) = 0;

-- Livros e Manuais: 80% da soma dos pergaminhos que ensinam (o volume sai
-- mais barato que as folhas soltas), no mínimo 1.000.
update public.itens l
   set valor_latao = greatest(1000, round(0.8 * x.soma)::int), atualizado_em = now()
  from (select lp.livro_slug, sum(coalesce(p.valor_latao, 0)) as soma
          from public.livro_pergaminhos lp join public.itens p on p.slug = lp.pergaminho_slug
         group by lp.livro_slug) x
 where l.slug = x.livro_slug and l.grupo = 'Itens' and (l.nome like 'Livro %' or l.nome like 'Manual %');
-- Livro sem pergaminho vinculado: o piso.
update public.itens set valor_latao = 1000, atualizado_em = now()
 where grupo = 'Itens' and (nome like 'Livro %' or nome like 'Manual %') and coalesce(valor_latao, 0) = 0;

-- Os miúdos: água e feno são o que há de mais barato no mercado.
update public.itens set valor_latao = v.valor, atualizado_em = now()
  from (values ('agua', 1), ('agua_suja', 1), ('feno', 1), ('lenha', 10)) as v(slug, valor)
 where itens.slug = v.slug and coalesce(itens.valor_latao, 0) = 0;

-- ── 4. A "Receita de …" das receitas novas, e o preço delas ─────────────────
insert into public.itens (slug, nome, grupo, base, tipo, ocupa, origem, icone, valor_latao, descricao, magico)
select 'receita_' || r.resultado_slug, 'Receita de ' || i.nome, 'Itens', 'pergaminho', 'S', 0.1, 'Comum',
       'ti-file-text', greatest(1, round(coalesce(i.valor_latao, 0) * 0.1)::int),
       'Instruções para fabricar ' || i.nome || ': os materiais, as medidas e a ordem do trabalho. '
         || 'Quem a aprende guarda o saber; o pergaminho se perde no estudo.',
       false
  from public.receitas r join public.itens i on i.slug = r.resultado_slug
on conflict (slug) do nothing;
-- O preço da receita acompanha o do item (os refinados mudaram de valor).
update public.itens ri set valor_latao = greatest(1, round(coalesce(i.valor_latao, 0) * 0.1)::int), atualizado_em = now()
  from public.receitas r join public.itens i on i.slug = r.resultado_slug
 where ri.slug = 'receita_' || r.resultado_slug;

-- ── 5. Conferência (deve voltar vazia) ──────────────────────────────────────
select 'sem preço' as problema, slug from public.itens where coalesce(valor_latao, 0) = 0
union all
select 'material inexistente', r.resultado_slug from public.receitas r, jsonb_array_elements(r.materiais) m
 where m ? 'slug' and not exists (select 1 from public.itens i where i.slug = m->>'slug');
