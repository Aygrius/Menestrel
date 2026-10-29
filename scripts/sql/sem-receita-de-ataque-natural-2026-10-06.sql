-- scripts/sql/sem-receita-de-ataque-natural-2026-10-06.sql
-- ============================================================================
-- ATAQUE NATURAL SAI DA BANCADA (06/10/2026)
--
-- Pedido do usuário: "Coice, Mordida, etc não podem ser fabricados."
--
-- O QUE ACONTECEU. A geração de receitas de scripts/sql/fabricacao-2026-10-06.sql
-- varreu o grupo 'Armas' inteiro, e o grupo 'Armas' guarda também as NOVE armas
-- naturais das criaturas — Bico, Cauda, Chifre, Coice, Garra, Hálito, Mordida,
-- Patada e Toque. Elas moram ali desde 14/09/2026, quando as armas naturais
-- deixaram de ser uma tabela fechada de offsets e passaram a ser itens que a
-- criatura equipa (ver src/09-bestiario/criatura-formulas.jsx). A bancada, sem
-- saber disso, passou a oferecer uma mordida por 20 de aço, 2 de madeira e 1
-- de couro.
--
-- O TESTE É `ocupa`, NÃO O NOME. Ataque natural não ocupa casa na mochila
-- porque não é objeto: é parte do corpo do bicho. Toda arma de verdade do
-- catálogo ocupa espaço. Uma lista de nomes envelheceria na primeira criatura
-- com uma presa nova; esta condição não.
--
-- TRÊS CAMADAS, porque a receita é DADO e dado volta: as linhas saem do banco
-- (§1), o gerador que as criou passa a filtrá-las (§2) e a bancada não mostra
-- receita de ataque natural mesmo que uma reapareça — `ehAtaqueNatural`
-- (src/01-core/fabricacao.jsx), aplicada em src/07-inventario/fabricar.jsx.
--
-- APLICADO NO BANCO EM 06/10/2026 (projeto kaxbdpdutentlrobuqyu), pela
-- migration `sem_receita_de_ataque_natural`.
-- ============================================================================

-- ── 1. AS RECEITAS SAEM ─────────────────────────────────────────────────────
delete from public.receitas r
 using public.itens i
 where i.slug = r.resultado_slug
   and i.grupo = 'Armas'
   and coalesce(i.ocupa, 0) = 0;

-- ── 2. E NÃO VOLTAM PELA GERAÇÃO ────────────────────────────────────────────
-- O mesmo filtro entrou no `where` do laço de geração, no §3 de
-- scripts/sql/fabricacao-2026-10-06.sql: aquele bloco é um
-- `insert ... on conflict do update`, e sem a condição lá um re-run traria as
-- nove de volta em silêncio. Aqui não cabe um CHECK — a regra olha outra
-- tabela (`itens`), e CHECK do Postgres não aceita subconsulta.
--
-- Para conferir que o gerador foi corrigido:
--   grep -n "coalesce(ocupa, 0) = 0" scripts/sql/fabricacao-2026-10-06.sql

-- ── CONFERÊNCIA ─────────────────────────────────────────────────────────────
-- As nove armas naturais, e nenhuma com receita:
--   select i.slug, i.nome,
--          exists(select 1 from receitas r where r.resultado_slug = i.slug) as tem_receita
--     from itens i
--    where i.grupo = 'Armas' and coalesce(i.ocupa, 0) = 0
--    order by i.nome;
--
-- O total de receitas depois do corte (eram 226):
--   select count(*) from receitas;
