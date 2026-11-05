-- ============================================================================
-- AS JOIAS QUE FALTAVAM: COBRE, LATÃO, PORCELANA E AS RECEITAS (31/10/2026)
-- ============================================================================
-- Pedido do usuário, logo depois de joias-pedem-o-metal-2026-10-31.sql:
--   "Porcelana é feito com 1 unidade de quartzo. Crie as receitas que
--    faltam. Adicione cobre e latão."
--
-- 1. COBRE E LATÃO nas famílias que não tinham: Anel e Piercing (cobre);
--    Coroa, Pingente e Gargantilha (cobre e latão). As bases moram em
--    src/01-core/bases-item.jsx. O molde é o do catálogo para esses metais
--    (Pulseira, Colar, Tiara de Cobre/Latão): cobre 20 latões, latão 2,
--    +1 de karma e "Aumenta 1 de Desonra"; ocupa e slot vêm da peça de ouro
--    da mesma família.
-- 2. PORCELANA = 1 QUARTZO por peça, qualquer que seja a peça.
--    → Trocado no mesmo dia por receitas-viram-itens-2026-10-31.sql: a
--      Porcelana virou material (1 Quartzo rende 5) e a peça pede Porcelana.
-- 3. RECEITA para toda joia que não tinha, com a mesma régua do script
--    anterior: metal = metade do preço da peça (1 a 30 unidades). Habilidade
--    Artesanato, dificuldade D, `dias` pela régua do gerador (sem uso desde
--    a bancada em horas, mas a coluna é obrigatória).
-- ============================================================================

-- ── 1. As peças novas ────────────────────────────────────────────────────────
insert into public.itens (slug, nome, grupo, base, tipo, ocupa, slot_equip, tipo_equip, origem, icone,
                          valor_latao, mod_kar, efeito_negativo, descricao, magico)
select f.prefixo || '_' || m.mat, f.nome || ' de ' || m.nome, 'Vestimentas', f.base || '-' || m.mat, 'S',
       o.ocupa, o.slot_equip, 'adorno', 'Comum', 'ti-diamond',
       m.valor, 1, 'Aumenta 1 de Desonra.',
       f.descr || ' de ' || lower(m.nome) || '.', false
  from (values ('anel', 'anel', 'Anel', 'anel_ouro', 'Joia simples'),
               ('piercing', 'piercing', 'Piercing', 'piercing_ouro', 'Piercing feito'),
               ('coroa', 'coroa', 'Coroa', 'coroa_ouro', 'Coroa simples, batida à mão'),
               ('pingente', 'pingente', 'Pingente', 'pingente_ouro', 'Pingente simples'),
               ('gargantilha', 'gargantilha', 'Gargantilha', 'gargantilha_ouro', 'Gargantilha de aro estreito, feita'))
       as f(prefixo, base, nome, irma, descr)
  join (values ('cobre', 'Cobre', 20), ('latao', 'Latão', 2)) as m(mat, nome, valor) on true
  join public.itens o on o.slug = f.irma
 where not (f.base in ('anel', 'piercing') and m.mat = 'latao')   -- já existiam
on conflict (slug) do nothing;

-- ── 2. Porcelana pede quartzo (a Máscara já tinha receita, de algodão) ──────
update public.receitas r
   set materiais = '[{"slug": "quartzo", "qtd": 1}]'::jsonb, atualizado_em = now()
  from public.itens i
 where i.slug = r.resultado_slug and i.base like '%-porcelana';

-- ── 3. As receitas que faltavam ──────────────────────────────────────────────
with joia as (
  select i.slug,
         coalesce(i.valor_latao, 0) as valor,
         replace(substr(i.base, length(split_part(i.base, '-', 1)) + 2), 'olho-', '') as mat
    from public.itens i
   where split_part(i.base, '-', 1) in
         ('anel', 'bracelete', 'pulseira', 'brincos', 'piercing', 'colar', 'pingente',
          'gargantilha', 'coroa', 'tiara', 'broche', 'medalha', 'mascara', 'tapa')
     and not exists (select 1 from public.receitas r where r.resultado_slug = i.slug)
)
insert into public.receitas (resultado_slug, habilidade_key, dificuldade, dias, materiais)
select j.slug, 'artesanato', 'D',
       greatest(5, least(25, round(sqrt(j.valor) / 6.0)::int + 4)),
       jsonb_build_array(jsonb_build_object(
         'slug', m.slug,
         'qtd', case when v.mat = 'porcelana' then 1
                     else greatest(1, least(30, round((j.valor * 0.5) / coalesce(m.valor_latao, 1))::int)) end))
  from joia j
  join (values ('ouro', 'ouro_bruto'), ('prata', 'prata'), ('cobre', 'cobre'), ('latao', 'latao'),
               ('marfim', 'marfim_animal'), ('porcelana', 'quartzo')) as v(mat, material) on v.mat = j.mat
  join public.itens m on m.slug = v.material
on conflict (resultado_slug) do nothing;
