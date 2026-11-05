-- ============================================================================
-- A RECEITA VIRA ITEM DE LOJA; PORCELANA VIRA MATERIAL (31/10/2026)
-- ============================================================================
-- Pedido do usuário:
--   "O quartzo custa 1 moeda de prata. 1 quartzo fabrica 5 porcelanas. Eu
--    estou perguntando como as receitas se chamam porque só é possível
--    fabricar com a receita, e eu quero saber como compra na loja. Mude o
--    nome para 'Receita de Anel de Cobre', por exemplo."
--
-- 1. receitas.rende — quantas unidades uma fabricação entrega (padrão 1).
-- 2. Quartzo = 1 moeda de prata = 100 latões.
-- 3. PORCELANA, o material: 1 Quartzo rende 5 (20 latões cada). As peças de
--    porcelana passam a pedir Porcelana pela régua das joias (metade do preço
--    da peça, 1 a 30): a peça de 1.000 latões pede 25 — 5 Quartzos.
--    Substitui o "1 Quartzo por peça" de joias-receitas-que-faltam.
-- 4. UMA "RECEITA DE <ITEM>" POR LINHA DE public.receitas, slug
--    receita_<resultado_slug>, no grupo Itens com a pintura do pergaminho. É
--    o que o Mestre põe na loja. → Desde aprender-receita-2026-10-31.sql o
--    personagem APRENDE a receita (o item some) e a bancada lê a lista. Preço: 10% do item que
--    ela ensina, no mínimo 1 latão (decisão de quem implementou — ajustar
--    aqui se a régua mudar).
--
-- Rodar DEPOIS de joias-receitas-que-faltam-2026-10-31.sql. Receita nova
-- criada depois precisa do passo 4 de novo (é idempotente).
-- ============================================================================

-- ── 1. O rendimento ──────────────────────────────────────────────────────────
alter table public.receitas add column if not exists rende smallint not null default 1;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'receitas_rende_chk') then
    alter table public.receitas add constraint receitas_rende_chk check (rende between 1 and 100);
  end if;
end $$;
comment on column public.receitas.rende is
  'Quantas unidades uma fabricação entrega. Porcelana: 5 por Quartzo.';

-- ── 2. O Quartzo ─────────────────────────────────────────────────────────────
update public.itens set valor_latao = 100, atualizado_em = now() where slug = 'quartzo';

-- ── 3. A Porcelana ───────────────────────────────────────────────────────────
insert into public.itens (slug, nome, grupo, tipo, ocupa, origem, icone, valor_latao, descricao, magico)
values ('porcelana', 'Porcelana', 'Minerais', 'S', 0.2, 'Comum', 'ti-cube', 20,
        'Massa branca de quartzo moído, queimada até ficar dura e fina como casca de ovo. Um quartzo rende cinco porções.',
        false)
on conflict (slug) do nothing;

insert into public.receitas (resultado_slug, habilidade_key, dificuldade, dias, materiais, rende)
values ('porcelana', 'artesanato', 'D', 5, '[{"slug": "quartzo", "qtd": 1}]'::jsonb, 5)
on conflict (resultado_slug) do update
  set materiais = excluded.materiais, rende = excluded.rende, atualizado_em = now();

update public.receitas r
   set materiais = jsonb_build_array(jsonb_build_object(
         'slug', 'porcelana',
         'qtd', greatest(1, least(30, round(coalesce(i.valor_latao, 0) * 0.5 / 20.0)::int)))),
       atualizado_em = now()
  from public.itens i
 where i.slug = r.resultado_slug and i.base like '%-porcelana';

-- ── 4. As receitas da loja ──────────────────────────────────────────────────
insert into public.itens (slug, nome, grupo, base, tipo, ocupa, origem, icone, valor_latao, descricao, magico)
select 'receita_' || r.resultado_slug, 'Receita de ' || i.nome, 'Itens', 'pergaminho', 'S', 0.1, 'Comum',
       'ti-file-text', greatest(1, round(coalesce(i.valor_latao, 0) * 0.1)::int),
       'Instruções para fabricar ' || i.nome || ': os materiais, as medidas e a ordem do trabalho. '
         || 'Quem a tem na mochila pode tentar na bancada; a receita não se gasta.',
       false
  from public.receitas r
  join public.itens i on i.slug = r.resultado_slug
on conflict (slug) do update
  set nome = excluded.nome, valor_latao = excluded.valor_latao, descricao = excluded.descricao,
      atualizado_em = now();
