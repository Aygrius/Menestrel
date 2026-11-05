-- ============================================================================
-- AS JOIAS PEDEM O METAL DA PEÇA (31/10/2026)
-- ============================================================================
-- Pedido do usuário, depois de procurar o Anel de Cobre na bancada:
--   "Faça o 1 e 2" —
--   1. criar os metais que faltavam como matéria-prima;
--   2. refazer as receitas das joias para pedirem o metal da peça.
--
-- O QUE ESTAVA ERRADO. A geração de receitas (fabricacao-2026-10-06.sql)
-- escolhe o material pelo NOME do item. Isso quebra em dois lugares:
--   • "Anel de Bardo", "Anel de Mago"… não dizem o metal no nome — e caíam no
--     padrão de Vestimentas, que é ALGODÃO. Um anel de ouro pedia 20 de algodão.
--   • Cobre e Latão não estavam na lista do gerador (nem existiam como
--     matéria-prima), e as peças de cobre caíram em AÇO.
--
-- A CORREÇÃO lê a BASE do item (`anel-ouro`, `colar-cobre`…), que é onde o
-- material mora desde a reforma das vestimentas (30/10/2026). Só as receitas
-- que JÁ EXISTEM mudam; joia sem receita continua sem.
--
-- A QUANTIDADE SEGUE O PREÇO. As 20 unidades fixas do gerador não fazem
-- sentido em metal precioso: 20 de Ouro valem 20.000 latões, e o Anel de Ouro
-- vale 2.000. A regra aqui: o material custa METADE do preço da peça, no
-- mínimo 1 e no máximo 30 unidades.
--   Anel de Ouro (2.000) → 1 Ouro     Coroa de Ouro (50.000) → 25 Ouro
--   Anel de Prata  (200) → 1 Prata    Coroa de Prata (5.000) → 25 Prata
--   Colar de Cobre  (20) → 2 Cobre    Coroa de Marfim  (500) → 30 Marfim
--
-- FICA DE FORA: Porcelana não é metal nem tem matéria-prima. A Máscara de
-- Porcelana segue com a receita antiga (algodão) até haver o material.
-- → Resolvido no mesmo dia em joias-receitas-que-faltam-2026-10-31.sql
--   (porcelana = 1 Quartzo), que roda DEPOIS deste.
-- ============================================================================

-- ── 1. Os metais que faltavam ───────────────────────────────────────────────
-- Mesmo molde do Bronze e da Prata (Minerais, base `minerio` — a pintura do
-- minério serve aos dois, ver ARTE_ITEM_TIPO). O Ouro já existia (`ouro_bruto`).
insert into public.itens (slug, nome, grupo, base, tipo, ocupa, origem, icone, valor_latao, descricao)
values
  ('cobre', 'Cobre', 'Minerais', 'minerio', 'S', 0.2, 'Comum', 'ti-cube', 6,
   'Barra avermelhada que esverdeia com o tempo. Macia ao martelo, é o metal das joias de quem não pode pagar prata.'),
  ('latao', 'Latão', 'Minerais', 'minerio', 'S', 0.2, 'Comum', 'ti-cube', 8,
   'Cobre fundido com calamina, amarelo como um ouro pobre. Brilha enquanto é novo; é o metal das fivelas, dos dedais e das moedas miúdas.')
on conflict (slug) do nothing;

-- ── 2. As receitas das joias ────────────────────────────────────────────────
with joia as (
  select i.slug,
         coalesce(i.valor_latao, 0) as valor,
         substr(i.base, length(split_part(i.base, '-', 1)) + 2) as mat,
         split_part(i.base, '-', 1) as familia
    from public.itens i
   where split_part(i.base, '-', 1) in
         ('anel', 'bracelete', 'pulseira', 'brincos', 'piercing', 'colar', 'pingente',
          'gargantilha', 'coroa', 'tiara', 'broche', 'medalha', 'mascara', 'tapa')
), metal as (
  select j.slug, j.valor, m.slug as material, coalesce(m.valor_latao, 1) as preco
    from joia j
    join (values ('ouro', 'ouro_bruto'), ('prata', 'prata'), ('cobre', 'cobre'),
                 ('latao', 'latao'), ('marfim', 'marfim_animal')) as v(mat, material)
      on v.mat = (case when j.familia = 'tapa' then replace(j.mat, 'olho-', '') else j.mat end)
    join public.itens m on m.slug = v.material
)
update public.receitas r
   set materiais = jsonb_build_array(jsonb_build_object(
         'slug', x.material,
         'qtd', greatest(1, least(30, round((x.valor * 0.5) / x.preco)::int)))),
       atualizado_em = now()
  from metal x
 where r.resultado_slug = x.slug;
