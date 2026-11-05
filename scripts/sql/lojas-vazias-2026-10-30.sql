-- As lojas começam do zero (30/10/2026)
-- "Limpe todos os itens em loja atualmente, vou criar do zero o comércio de
-- cada cidade." (usuário)
--
-- Esvazia `itens` de todo comércio de toda história. As lojas ficam (nome,
-- lugar, aberta/fechada, fileiras); só o estoque sai. Os anúncios dos
-- jogadores (anuncios_loja) NÃO são tocados — são itens deles.
--
-- APLICADO EM PRODUÇÃO em 30/10/2026. Antes, a cópia inteira de
-- historias.estoque_loja foi guardada em backup.estoque_loja_2026_10_30
-- (schema `backup`, fora da API). Para desfazer:
--
--   update public.historias h set estoque_loja = b.estoque_loja
--     from backup.estoque_loja_2026_10_30 b where b.id = h.id;

create schema if not exists backup;
revoke all on schema backup from anon, authenticated;
create table backup.estoque_loja_2026_10_30 as
  select id, titulo, estoque_loja, now() as copiado_em from public.historias;

update public.historias h
set estoque_loja = jsonb_set(h.estoque_loja, '{comercios}',
  (select coalesce(jsonb_agg(jsonb_set(c, '{itens}', '[]'::jsonb) order by ord), '[]'::jsonb)
     from jsonb_array_elements(h.estoque_loja->'comercios') with ordinality as t(c, ord)))
where jsonb_typeof(h.estoque_loja->'comercios') = 'array';
