-- Vínculo ITEM → CRIATURA (14/09/2026).
--
-- "Essa alteração de montarias deve ser nos itens do tipo animais, porque são
-- criaturas que podem ser adquiridas ou compradas [...] as características do
-- Cavalo em criaturas e Cavalo em itens devem ser o mesmo." — decisão: o item
-- aponta para a criatura, e as características (montaria inclusive) ficam SÓ
-- na criatura. Substitui a ligação por nome que o inventário usava.
--
-- ON DELETE SET NULL: apagar a criatura não apaga o item à venda nem o que
-- está nos inventários; o item só perde o vínculo e o Mestre religa.

alter table public.itens
  add column if not exists criatura_id bigint
  references public.criaturas(id) on delete set null;

create index if not exists itens_criatura_id_idx on public.itens (criatura_id);

-- Carga inicial: animais cujo nome casa com uma criatura (sem caixa/acento).
-- Os que não casam ficam null, para o Mestre ligar no editor de itens.
update public.itens i
   set criatura_id = c.id
  from public.criaturas c
 where i.grupo = 'Animais'
   and i.criatura_id is null
   and translate(lower(trim(i.nome)), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')
     = translate(lower(trim(c.nome)), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc');
