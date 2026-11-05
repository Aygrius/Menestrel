-- ============================================================
-- vestimenta-profissao-um-material-2026-10-31.sql
-- ============================================================
-- "Você alterou a imagem dos itens por profissão mas se esqueceu da descrição
-- acompanhar a imagem, por exemplo, a roupa dos bardos são as melhores e
-- possuem o material seda." (usuário, 30/10/2026) — e, sobre a proposta,
-- "Pode ficar assim."
--
-- Cada peça de profissão passa a existir num ÚNICO material, o do nível da
-- profissão (o mesmo da pintura, arte-vestimenta-por-profissao-2026-10-30):
--   Guerreiro, Ladino, Rastreador → algodão / cobre (latão, ou marfim, onde
--                                   a peça não tem cobre)
--   Mago, Sacerdote               → linho / prata (a luva, sem linho: couro)
--   Bardo                         → seda / ouro
-- As outras versões de material saem; as instâncias dos personagens vão antes
-- para a versão que fica (o gatilho de exclusão tiraria a peça do inventário).
-- Ficam 29 peças × 6 profissões = 174. Idempotente.
-- ============================================================

begin;

create temp table _nivel (prof text, n int) on commit drop;
insert into _nivel values
  ('guerreiro', 1), ('ladino', 1), ('rastreador', 1), ('mago', 2), ('sacerdote', 2), ('bardo', 3);

-- token do slug, prefixo da base, material por nível
create temp table _fam (token text, prefixo text, m1 text, m2 text, m3 text) on commit drop;
insert into _fam values
  ('chapeu', 'chapeu', 'algodao', 'linho', 'seda'),
  ('coroa', 'coroa', 'marfim', 'prata', 'ouro'),
  ('tiara', 'tiara', 'cobre', 'prata', 'ouro'),
  ('capuz', 'capuz', 'algodao', 'linho', 'seda'),
  ('mascara', 'mascara', 'cobre', 'prata', 'ouro'),
  ('tapa_olho', 'tapa-olho', 'cobre', 'prata', 'ouro'),
  ('brinco', 'brincos', 'cobre', 'prata', 'ouro'),
  ('piercing', 'piercing', 'latao', 'prata', 'ouro'),
  ('colar', 'colar', 'cobre', 'prata', 'ouro'),
  ('pingente', 'pingente', 'marfim', 'prata', 'ouro'),
  ('gargantilha', 'gargantilha', 'marfim', 'prata', 'ouro'),
  ('cachecol', 'cachecol', 'algodao', 'linho', 'seda'),
  ('lenco', 'lenco', 'algodao', 'linho', 'seda'),
  ('dragona', 'dragona', 'algodao', 'linho', 'seda'),
  ('medalha', 'medalha', 'cobre', 'prata', 'ouro'),
  ('broche', 'broche', 'cobre', 'prata', 'ouro'),
  ('tunica', 'tunica', 'algodao', 'linho', 'seda'),
  ('blusa', 'blusa', 'algodao', 'linho', 'seda'),
  ('casaco', 'casaco', 'algodao', 'linho', 'seda'),
  ('capa', 'capa', 'algodao', 'linho', 'seda'),
  ('sobretudo', 'sobretudo', 'algodao', 'linho', 'seda'),
  ('calca', 'calca', 'algodao', 'linho', 'seda'),
  ('bombacha', 'bombacha', 'algodao', 'linho', 'seda'),
  ('anel', 'anel', 'latao', 'prata', 'ouro'),
  ('bracelete', 'bracelete', 'cobre', 'prata', 'ouro'),
  ('pulseira', 'pulseira', 'cobre', 'prata', 'ouro'),
  ('luva', 'luva-pano', 'algodao', 'couro', 'seda'),
  ('sandalia', 'sandalia', 'algodao', 'linho', 'seda'),
  ('sapato', 'sapato', 'algodao', 'linho', 'seda');

-- velho → novo: toda versão de profissão que não é a do nível
create temp table _troca on commit drop as
select i.slug as velho,
       f.token || '_' || (case nv.n when 1 then f.m1 when 2 then f.m2 else f.m3 end) || '_' || nv.prof as novo
  from public.itens i
  join _fam f on i.base like f.prefixo || '-%'
  join _nivel nv on i.slug like '%\_' || nv.prof
 where i.grupo = 'Vestimentas'
   and i.slug like f.token || '\_%'
   and i.slug <> f.token || '_' || (case nv.n when 1 then f.m1 when 2 then f.m2 else f.m3 end) || '_' || nv.prof;

do $$
declare v int;
begin
  select count(*) into v from _troca t where not exists (select 1 from public.itens i where i.slug = t.novo);
  if v > 0 then raise exception 'troca: % destino(s) inexistente(s)', v; end if;
  select count(*) into v from public.historias h where h.estoque_loja::text ~ any (
    select '"' || velho || '"' from _troca);
  if v > 0 then raise exception 'troca: % loja(s) com versão que vai sair', v; end if;
end $$;

-- As instâncias vão para a versão que fica.
update public.personagens p
   set inventario = jsonb_set(p.inventario, '{itens}', (
     select jsonb_agg(case when t.novo is not null then e || jsonb_build_object('slug', t.novo) else e end order by o.ord)
       from jsonb_array_elements(p.inventario->'itens') with ordinality as o(e, ord)
       left join _troca t on t.velho = e->>'slug'))
 where jsonb_typeof(p.inventario->'itens') = 'array'
   and exists (select 1 from jsonb_array_elements(p.inventario->'itens') e
                join _troca t on t.velho = e->>'slug');

do $$
declare v int;
begin
  select count(*) into v from public.personagens p, jsonb_array_elements(p.inventario->'itens') e
   where e->>'slug' in (select velho from _troca);
  if v > 0 then raise exception 'troca: % instância(s) ainda na versão que sai', v; end if;
end $$;

delete from public.itens where slug in (select velho from _troca);

do $$
declare v int;
begin
  select count(*) into v from public.itens
   where grupo = 'Vestimentas' and slug ~ '_(guerreiro|ladino|rastreador|mago|sacerdote|bardo)$';
  if v <> 174 then raise exception 'troca: % peças de profissão (esperado 174)', v; end if;
end $$;

commit;
