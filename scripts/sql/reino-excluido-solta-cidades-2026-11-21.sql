-- EXCLUIR UM REINO SOLTA AS CIDADES DELE (21/11/2026)
--
-- Usuário, ao excluir um reino: "update or delete on table "reinos" violates
-- foreign key constraint "cidades_reino_fkey" on table "cidades"". Todo reino
-- do mundo tem cidades (Blur 13, Estepes Vítreas 10, Calco 8…), e a regra
-- cidades.reino → reinos.slug era ON DELETE RESTRICT: nenhum reino podia sair.
-- Escolha do usuário: "Ficam, sem reino" — o reino é apagado e as cidades
-- continuam (abas e mapa), só sem reino, como já acontece com os locais
-- (locais_reino_fkey é ON DELETE SET NULL). Trocar o slug do reino leva as
-- cidades junto (ON UPDATE CASCADE).
--
-- Antes de rodar (21/11/2026): cidades.reino era NOT NULL; 160 cidades, todas
-- com reino. As telas já leem o reino da cidade com folga (reino ausente = '').

alter table public.cidades alter column reino drop not null;

alter table public.cidades drop constraint cidades_reino_fkey;
alter table public.cidades add constraint cidades_reino_fkey
  foreign key (reino) references public.reinos(slug)
  on update cascade on delete set null;

-- Para desfazer (só se nenhuma cidade tiver ficado sem reino):
--   alter table public.cidades drop constraint cidades_reino_fkey;
--   alter table public.cidades add constraint cidades_reino_fkey
--     foreign key (reino) references public.reinos(slug) on delete restrict;
--   alter table public.cidades alter column reino set not null;
