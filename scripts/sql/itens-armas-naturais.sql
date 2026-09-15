-- itens-armas-naturais.sql — 14/09/2026
--
-- Armas naturais das criaturas, com os números passados pelo usuário:
--
--   Ataque,Alcance,L,M,P,100%,Origem,Ícone,Atributo Base,Grupo de Armas,Categoria
--   Mordida,0m,1,0,-1,4,Comum,ti-paw,Força,Livre,Arma
--   Garra,0m,3,0,-3,4,Comum,ti-paw,Força,Livre,Arma
--   Patada,0m,3,0,-4,4,Comum,ti-paw,Agilidade,Livre,Arma
--   Coice,0m,0,-2,-5,8,Comum,ti-paw,Força,Livre,Arma
--   Chifre,0m,1,-1,-5,8,Comum,ti-paw,Físico,Livre,Arma
--   Bico,0m,1,-1,-5,4,Comum,ti-paw,Físico,Livre,Arma
--   Cauda,5m,0,1,-2,4,Comum,ti-paw,Físico,Livre,Arma
--   Hálito,25m,1,1,1,8,Raro,ti-paw,Aura,Livre,Arma
--   Toque,0m,1,1,1,8,Comum,ti-paw,Agilidade,Livre,Arma
--
-- "100%" é a coluna `dano`; alcance em metros (= células do tabuleiro).
-- Atributo base em sigla: FOR, AGI, FIS, AUR. slot_equip 'maos', uma mão cada:
-- é onde o editor de criaturas equipa arma (criatura-formulas.jsx).
-- "Bico" já existia (criado pelo editor com slot cabeca e AGI) e é atualizado.

insert into public.itens
  (slug, nome, grupo, tipo, categoria_equip, slot_equip, maos_pequenino, maos_anao, maos_outras,
   alcance, dano_l, dano_m, dano_p, dano, origem, icone, ajuste_atributo, grupo_armas, atualizado_em)
values
  ('mordida', 'Mordida', 'Armas', 'S', 'arma', 'maos', 1, 1, 1,  0,  1,  0, -1, 4, 'Comum', 'ti-paw', 'FOR', 'Livre', now()),
  ('garra',   'Garra',   'Armas', 'S', 'arma', 'maos', 1, 1, 1,  0,  3,  0, -3, 4, 'Comum', 'ti-paw', 'FOR', 'Livre', now()),
  ('patada',  'Patada',  'Armas', 'S', 'arma', 'maos', 1, 1, 1,  0,  3,  0, -4, 4, 'Comum', 'ti-paw', 'AGI', 'Livre', now()),
  ('coice',   'Coice',   'Armas', 'S', 'arma', 'maos', 1, 1, 1,  0,  0, -2, -5, 8, 'Comum', 'ti-paw', 'FOR', 'Livre', now()),
  ('chifre',  'Chifre',  'Armas', 'S', 'arma', 'maos', 1, 1, 1,  0,  1, -1, -5, 8, 'Comum', 'ti-paw', 'FIS', 'Livre', now()),
  ('bico',    'Bico',    'Armas', 'S', 'arma', 'maos', 1, 1, 1,  0,  1, -1, -5, 4, 'Comum', 'ti-paw', 'FIS', 'Livre', now()),
  ('cauda',   'Cauda',   'Armas', 'S', 'arma', 'maos', 1, 1, 1,  5,  0,  1, -2, 4, 'Comum', 'ti-paw', 'FIS', 'Livre', now()),
  ('halito',  'Hálito',  'Armas', 'S', 'arma', 'maos', 1, 1, 1, 25,  1,  1,  1, 8, 'Raro',  'ti-paw', 'AUR', 'Livre', now()),
  ('toque',   'Toque',   'Armas', 'S', 'arma', 'maos', 1, 1, 1,  0,  1,  1,  1, 8, 'Comum', 'ti-paw', 'AGI', 'Livre', now())
on conflict (slug) do update set
  nome = excluded.nome, grupo = excluded.grupo, tipo = excluded.tipo,
  categoria_equip = excluded.categoria_equip, slot_equip = excluded.slot_equip,
  maos_pequenino = excluded.maos_pequenino, maos_anao = excluded.maos_anao, maos_outras = excluded.maos_outras,
  alcance = excluded.alcance, dano_l = excluded.dano_l, dano_m = excluded.dano_m, dano_p = excluded.dano_p,
  dano = excluded.dano, origem = excluded.origem, icone = excluded.icone,
  ajuste_atributo = excluded.ajuste_atributo, grupo_armas = excluded.grupo_armas,
  atualizado_em = excluded.atualizado_em;
