-- ============================================================
-- O INVENTÁRIO É SEMPRE UM OBJETO — trava e restauração (29/10/2026)
-- ============================================================
-- O desgaste dos animais (01-core/animal-condicao.jsx, commit 534aa9c) lia o
-- inventário inteiro como lista vazia e devolvia `[]`; o compare-and-swap
-- gravava isso por cima. Avançar o relógio da mesa "A Guerra Cósmica" (24)
-- apagou Nihil (35), Yuldrous (64) e Eco (66) duas vezes: 22:58 e 23:54 UTC.
-- A segunda veio com a correção já publicada (3429c7f) — o navegador do
-- Mestre ainda rodava a versão antiga.
--
-- 1. A TRAVA: o banco recusa gravar em `personagens.inventario` qualquer
--    coisa que não seja objeto. Não depende de quem recarregou a página.
-- 2. A RESTAURAÇÃO: depois da primeira perda tudo entrou pela loja, e cada
--    compra e cada uso estão em `mesa_log`. O inventário de cada um é
--    remontado como estava às 23:54:24 — compras menos usos, menos a prata
--    paga. Volta tudo SOLTO e desequipado (o log não diz o que estava
--    vestido nem em qual recipiente). Equipável vira uma instância por
--    unidade; o resto empilha.
--
-- Aplicado em produção via execute_sql em 29/10/2026.
-- ============================================================

-- ── 1. A trava ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._menestrel_inventario_so_objeto()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
begin
  if new.inventario is not null and jsonb_typeof(new.inventario) <> 'object' then
    raise exception 'inventario precisa ser um objeto { itens, moedas }, veio %', jsonb_typeof(new.inventario)
      using errcode = 'check_violation';
  end if;
  return new;
end $function$;

DROP TRIGGER IF EXISTS personagens_inventario_so_objeto ON public.personagens;
CREATE TRIGGER personagens_inventario_so_objeto
  BEFORE INSERT OR UPDATE OF inventario ON public.personagens
  FOR EACH ROW EXECUTE FUNCTION public._menestrel_inventario_so_objeto();

-- ── 2. A restauração (só onde o inventário ainda é a lista vazia) ──
WITH pjs(id, nome) AS (VALUES (35::bigint, 'Nihil'), (64, 'Yuldrous'), (66, 'Eco')),
ev AS (
  SELECT split_part(texto, ' ', 1) AS nome, meta, texto
    FROM public.mesa_log
   WHERE historia_id = 24 AND tipo = 'item'
     AND created_at > '2026-10-29 22:58:00+00' AND created_at < '2026-10-29 23:54:24+00'
),
mov AS (
  SELECT nome, meta->>'slug' AS slug, (meta->>'quantidade')::int AS q
    FROM ev WHERE meta->>'acao' = 'comprar'
  UNION ALL
  SELECT ev.nome, i.slug, -1
    FROM ev JOIN public.itens i ON i.nome = ev.meta->>'item'
   WHERE ev.meta->>'acao' IS NULL AND ev.texto LIKE '% usou %'
  UNION ALL
  SELECT nome, 'moeda_prata', -((meta->>'custo_latao')::int / 100)
    FROM ev WHERE meta->>'acao' = 'comprar' AND (meta->>'custo_latao')::int > 0
),
saldo AS (
  SELECT p.id, m.slug, sum(m.q)::int AS qtd, (i.categoria_equip IS NOT NULL) AS equipavel
    FROM mov m JOIN pjs p ON p.nome = m.nome JOIN public.itens i ON i.slug = m.slug
   GROUP BY p.id, m.slug, i.categoria_equip
  HAVING sum(m.q) > 0
),
inst AS (
  SELECT s.id, s.slug, CASE WHEN s.equipavel THEN 1 ELSE s.qtd END AS quantidade, g.n
    FROM saldo s
    CROSS JOIN LATERAL generate_series(1, CASE WHEN s.equipavel THEN s.qtd ELSE 1 END) AS g(n)
),
novo AS (
  SELECT id, jsonb_build_object('itens', jsonb_agg(jsonb_build_object(
           'instanceId', (extract(epoch FROM clock_timestamp()) * 1000)::bigint::text || '-'
                         || substr(md5(id::text || slug || n::text), 1, 6),
           'slug', slug, 'quantidade', quantidade, 'equipado', false,
           'slot', null, 'containerId', null, 'observacao', null) ORDER BY slug, n)) AS inventario
    FROM inst GROUP BY id
)
UPDATE public.personagens p
   SET inventario = novo.inventario
  FROM novo
 WHERE p.id = novo.id
   AND jsonb_typeof(p.inventario) = 'array'
   AND jsonb_array_length(p.inventario) = 0;
