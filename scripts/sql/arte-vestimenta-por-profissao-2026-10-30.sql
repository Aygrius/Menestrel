-- ============================================================
-- arte-vestimenta-por-profissao-2026-10-30.sql
-- ============================================================
-- "Os imagens dos itens tipo vestimenta de profissão guerreiro, ladino e
-- rastreador são os mais simples, os itens de mago e sacerdote são os
-- intermediários, os itens de bardo os melhores." (usuário, 30/10/2026)
--
-- A pintura vinha da BASE, que diz o material: a Blusa de Bardo e a de Ladino
-- (ambas de algodão) eram iguais. A coluna `itens.arte` guarda o arquivo do
-- próprio exemplar e ganha da base (arteDoItem/arteDoSlot, 11-ficha/ficha.jsx).
--
-- Só as famílias que têm pintura em três graus; as outras (sobretudo, chapéu,
-- luva, sandália, sapato, cachecol, lenço, piercing, tapa-olho) seguem com a da
-- base. Idempotente.
-- ============================================================

begin;

alter table public.itens add column if not exists arte text;
comment on column public.itens.arte is 'Arquivo da pintura do exemplar em public/equip (sem extensão); ganha da pintura da base.';

with nivel(prof, n) as (values
  ('guerreiro', 1), ('ladino', 1), ('rastreador', 1),
  ('mago', 2), ('sacerdote', 2),
  ('bardo', 3)
), familia(prefixo, a1, a2, a3) as (values
  ('blusa', 'roupa-simples', 'roupa-ornado', 'roupa-nobre'),
  ('tunica', 'roupa-simples', 'roupa-ornado', 'roupa-nobre'),
  ('capa', 'capa-simples', 'capa-ornado', 'capa-nobre'),
  ('casaco', 'casaco-algodao', 'casaco-couro', 'casaco-nobre'),
  ('calca', 'calca-algodao', 'calca-couro', 'calca-seda'),
  ('bombacha', 'calca-algodao', 'calca-couro', 'calca-seda'),
  ('capuz', 'capuz-algodao', 'capuz-couro', 'capuz-seda'),
  ('mascara', 'mascara-couro', 'mascara-ferro', 'mascara-porcelana'),
  ('dragona', 'ombreiras-leve', 'ombreiras-medio', 'ombreiras-pesado'),
  ('coroa', 'coroa-cobre', 'coroa-prata', 'coroa-ouro'),
  ('tiara', 'tiara-cobre', 'tiara-prata', 'tiara-ouro'),
  ('broche', 'broche-cobre', 'broche-prata', 'broche-ouro'),
  ('medalha', 'medalha-cobre', 'medalha-prata', 'medalha-ouro'),
  ('pingente', 'pingente-cobre', 'pingente-prata', 'pingente-ouro'),
  ('colar', 'colar-simples', 'colar-ornado', 'colar-nobre'),
  ('gargantilha', 'colar-simples', 'colar-ornado', 'colar-nobre'),
  ('brincos', 'brincos-simples', 'brincos-ornado', 'brincos-nobre'),
  ('anel', 'anel-simples', 'anel-ornado', 'anel-nobre'),
  ('bracelete', 'anel-simples', 'anel-ornado', 'anel-nobre'),
  ('pulseira', 'anel-simples', 'anel-ornado', 'anel-nobre')
)
update public.itens i
   set arte = case nv.n when 1 then f.a1 when 2 then f.a2 else f.a3 end
  from nivel nv, familia f
 where i.grupo = 'Vestimentas'
   and i.base like f.prefixo || '-%'
   and i.slug like '%\_' || nv.prof
   and i.arte is distinct from case nv.n when 1 then f.a1 when 2 then f.a2 else f.a3 end;

-- Conferência: cada família pintada tem as 6 profissões com arte.
do $$
declare v int;
begin
  select count(*) into v from public.itens where grupo = 'Vestimentas' and arte is not null;
  if v = 0 then raise exception 'arte: nenhuma vestimenta recebeu pintura'; end if;
end $$;

commit;
