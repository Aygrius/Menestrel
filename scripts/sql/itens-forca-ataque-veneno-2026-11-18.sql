-- A força de ataque do veneno (18/11/2026): enfrenta a RF de quem é atingido
-- (Tabela de Resistência). Valores sugeridos pela potência; o Mestre ajusta
-- no editor do catálogo. A flecha envenenada leva a força do veneno dela.
alter table public.itens add column if not exists forca_ataque integer;
alter table public.itens drop constraint if exists itens_forca_ataque_faixa;
alter table public.itens add constraint itens_forca_ataque_faixa check (forca_ataque is null or forca_ataque between 1 and 20);
update public.itens set forca_ataque = 5  where slug in ('secrecao_blueta', 'flecha_envenenada_blueta')  and forca_ataque is null;
update public.itens set forca_ataque = 8  where slug in ('secrecao_leopis', 'flecha_envenenada_leopis')  and forca_ataque is null;
update public.itens set forca_ataque = 12 where slug in ('secrecao_theonia', 'flecha_envenenada_theonia') and forca_ataque is null;
