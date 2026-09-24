-- Altura da criatura (17/09/2026).
--
-- "O restante das informações eu quero descritas, use cards depois de cada
-- subtítulo" — e a lista de Características que o usuário ditou inclui
-- "Altura: 0,80", que não existia em `criaturas`. Peso existia (integer),
-- altura não.
--
-- numeric, não integer: a unidade é METRO, e as alturas do jogo são frações
-- (0,80 da Águia; 1,71 do Elfo-Florestal em GAME_DATA.racas). Um integer
-- arredondaria toda criatura pequena para 0 ou 1.
--
-- Sem NOT NULL e sem default: nasce NULL nas ~200 criaturas existentes, e a
-- tela mostra "—" até o Mestre preencher no editor de catálogo. Um default 0
-- seria pior — 0 metro é um dado errado se passando por dado preenchido, e
-- não haveria como distinguir "ainda não medi" de "mede zero".

alter table public.criaturas
  add column if not exists altura numeric;

comment on column public.criaturas.altura is
  'Altura em metros. NULL = não preenchida (a ficha mostra "—").';
