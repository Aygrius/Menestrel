-- REMOVE AS VERSÕES DE PROFISSÃO (28/11/2026).
-- Usuário: "Remova todas as versões de itens e receitas de profissão (mago,
-- guerreiro, etc)." Para quem já carregava uma dessas peças: "Trocar pelo item
-- comum" (escolha do usuário) — Blusa de Ladino vira Blusa de Algodão etc.
--
-- Sai do catálogo: toda peça "X de Mago/Guerreiro/Ladino/Rastreador/Sacerdote/
-- Bardo" e toda "Receita de X de <Profissão>", com as linhas de `receitas` que
-- as fabricam. Ficam os Livros e Manuais de profissão.
--
-- O item comum é o slug sem o sufixo da profissão (brinco_prata_mago →
-- brinco_prata). Três comuns não existiam e nascem aqui, copiados da versão de
-- profissão: sandalia_algodao, sandalia_linho e sapato_algodao. O chapéu de
-- linho já tinha virado algodão (chapeu-linho-vira-algodao-2026-11-28.sql).
--
-- Backups: backup_itens_profissao_2026_11_28, backup_receitas_profissao_2026_11_28,
-- backup_inventario_profissao_2026_11_28 (id, inventario, inventario_versao).
begin;

create temp table alvo on commit drop as
select slug, nome from itens
where nome ~ ' de (Mago|Guerreiro|Ladino|Rastreador|Sacerdote|Bardo)$'
  and nome !~ '^(Livro|Manual)';

create temp table troca on commit drop as
select slug as de,
       case when slug ~ '^chapeu_linho_' then 'chapeu_algodao'
            else regexp_replace(slug, '_(mago|guerreiro|ladino|rastreador|sacerdote|bardo)$', '') end as para
from alvo where nome !~ '^Receita';

create table if not exists backup_itens_profissao_2026_11_28 as
  select * from itens where slug in (select slug from alvo);
create table if not exists backup_receitas_profissao_2026_11_28 as
  select * from receitas where resultado_slug in (select slug from alvo);
create table if not exists backup_inventario_profissao_2026_11_28 as
  select id, inventario, inventario_versao from personagens p
  where exists (select 1 from troca t where p.inventario::text like '%"' || t.de || '"%');

-- Os três comuns que faltavam.
insert into itens (slug, nome, grupo, ocupa, tipo, valor_latao, descricao, magico, slot_equip,
                   dano_l, dano_m, dano_p, origem, icone, efeito_transborda, tipo_equip, mod_vel, mod_kar, base)
select v.slug, v.nome, i.grupo, i.ocupa, i.tipo, i.valor_latao, v.descricao, false, i.slot_equip,
       0, 0, 0, i.origem, i.icone, false, i.tipo_equip, i.mod_vel, i.mod_kar, i.base
from (values
  ('sandalia_algodao', 'Sandália de Algodão', 'Sandália feita de algodão.', 'sandalia_algodao_guerreiro'),
  ('sandalia_linho',   'Sandália de Linho',   'Sandália feita de linho.',   'sandalia_linho_mago'),
  ('sapato_algodao',   'Sapato de Algodão',   'Sapato feito de algodão.',   'sapato_algodao_guerreiro')
) as v(slug, nome, descricao, modelo)
join itens i on i.slug = v.modelo
where not exists (select 1 from itens x where x.slug = v.slug);

-- Toda troca tem destino no catálogo; senão, para tudo.
do $$ begin
  if exists (select 1 from troca t where not exists (select 1 from itens i where i.slug = t.para)) then
    raise exception 'troca sem item comum de destino';
  end if;
end $$;

-- Os inventários: troca o slug exato (entre aspas) e sobe a versão do CAS.
do $$
declare r record;
begin
  for r in select de, para from troca loop
    update personagens
    set inventario = replace(inventario::text, '"' || r.de || '"', '"' || r.para || '"')::jsonb,
        inventario_versao = coalesce(inventario_versao, 0) + 1
    where inventario::text like '%"' || r.de || '"%';
  end loop;
end $$;

delete from receitas where resultado_slug in (select slug from alvo);
delete from itens where slug in (select slug from alvo);

commit;
