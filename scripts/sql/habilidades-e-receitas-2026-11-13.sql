-- ============================================================
-- 13/11/2026 — 3 habilidades novas por grupo, receitas que a habilidade
-- ensina e o teto de 10 caracterizações.
--
-- Pedidos do usuário:
--   "Os personagens só podem comprar um máximo de 10 caracterização, caso
--    tenha algum personagem com mais, remova 1 (ou 2) de cada tipo."
--   "Vamos adicionar mais 3 habilidades por grupo." (lista abaixo)
--   "Ao comprar a habilidade 'Carpintaria', o personagem aprende as seguintes
--    receitas: …" (e Alfaiataria, Artesanato, Alquimia, Sobrevivência,
--    Gastronomia, Metalurgia)
--
-- Decisões:
--   • "é preciso comprar para usar" = restricao 'N' (restricaoDaHabilidade).
--   • Custo das habilidades novas: 1 ou 2, pelo par mais parecido do grupo.
--   • Geral veio com quatro nomes ("Escutar, Observar (Percepção)"); entrou
--     Observar, o que tem atributo, para fechar as 3.
--   • receitas.aprende_com: a habilidade que ENSINA a receita (o primeiro
--     nível basta; fabricacao.jsx/receitaAprendida). receitas.minutos: o
--     prazo da receita, que vence o do grupo do item.
--   • Equipamento e pederneira são FERRAMENTA (gastam 1 uso de 10); a
--     fogueira é consumida. "1x tecido" e "1x óleo" aceitam qualquer um.
--   • Veneno = Pandaemonium (secrecao_theonia), o terceiro do trio com
--     Toxina e Peçonha. As flechas envenenadas que já existiam são as do
--     pedido e só trocam de nome: Toxina → Sedativa, Peçonha → Paralisante,
--     Pandemônio → Envenenada.
-- ============================================================

-- ── Backups ────────────────────────────────────────────────
create table if not exists public.backup_caracterizacao_2026_11_13 as
  select id, nome, caracterizacao from public.personagens
  where id in (54, 57);
create table if not exists public.backup_receitas_2026_11_13 as
  select * from public.receitas where resultado_slug in ('lenha', 'cajado', 'porrete');
create table if not exists public.backup_flechas_2026_11_13 as
  select * from public.itens where slug like 'flecha_envenenada_%';
alter table public.backup_caracterizacao_2026_11_13 enable row level security;
alter table public.backup_receitas_2026_11_13 enable row level security;
alter table public.backup_flechas_2026_11_13 enable row level security;

-- ── 1. Teto de 10 caracterizações ──────────────────────────
-- Aldren (12 → 9): sai 1 de cada tipo. Galadar (16 → 10): saem 2.
-- Sai primeiro o valor antigo que não casa mais com o catálogo ('grande',
-- 'baixo'), depois vantagens: devolver ponto nunca deixa o saldo negativo
-- (o Galadar já estava gastando 18 de 16).
update public.personagens
   set caracterizacao = jsonb_set(jsonb_set(jsonb_set(caracterizacao,
         '{fisica}',  (caracterizacao->'fisica')  - 'estatura'),
         '{social}',  (caracterizacao->'social')  - 'mestre'),
         '{pessoal}', (caracterizacao->'pessoal') - 'temperamento')
 where id = 54;
update public.personagens
   set caracterizacao = jsonb_set(jsonb_set(jsonb_set(caracterizacao,
         '{fisica}',  (caracterizacao->'fisica')  - 'estatura' - 'dependencia'),
         '{social}',  (caracterizacao->'social')  - 'mestre' - 'religiao'),
         '{pessoal}', (caracterizacao->'pessoal') - 'atencao' - 'conduta')
 where id = 57;

-- ── 2. Habilidades novas (3 por grupo) ─────────────────────
insert into public.habilidades (key, nome, grupo, ajuste, custo, nivel_inicial, restricao, descricao) values
  ('alquimia', 'Alquimia', 'Profissional', 'intelecto', 2, 0, 'N',
   'Esta habilidade permite preparar antídotos, elixires e munições untadas a partir de toxinas, peçonhas e venenos. Exige equipamento de alquimista, frascos e os reagentes certos. Falha: os reagentes se perdem. Falha crítica: o preparo se volta contra quem o faz.'),
  ('alfaiataria', 'Alfaiataria', 'Profissional', 'intelecto', 1, 0, 'N',
   'Esta habilidade permite fiar, tecer e cortar algodão, couro, seda e linho em tecidos prontos para a costura, e costurar e reparar roupas. Exige equipamento de artesão. Falha: o tecido sai irregular e se perde.'),
  ('gastronomia', 'Gastronomia', 'Profissional', 'intelecto', 1, 0, null,
   'Esta habilidade representa o preparo de alimentos, de rações de viagem a banquetes. Um cozinheiro hábil tira mais sustento do mesmo ingrediente e sabe conservar a comida. Exige fogo.'),
  ('falsificar', 'Falsificar', 'Subterfúgio', 'agilidade', 2, 0, 'N',
   'Esta habilidade permite imitar documentos, selos, assinaturas e objetos, e reconhecer uma falsificação. Para falsificar um texto é preciso conhecer o idioma; para um objeto, saber produzi-lo. O teste é resistido contra quem examina a peça.'),
  ('destrancar', 'Destrancar', 'Subterfúgio', 'agilidade', 2, 0, 'N',
   'Esta habilidade permite abrir fechaduras, trancas e cadeados sem a chave, com gazuas e paciência, sem deixar sinal. Cada tentativa leva algumas rodadas. Mecanismos destruídos ou selados por magia não se abrem.'),
  ('libras', 'Libras', 'Subterfúgio', 'intelecto', 2, 0, 'N',
   'Esta habilidade é a linguagem de sinais das guildas e dos bandos: mãos, olhares e gestos que passam ordens e avisos em silêncio. Só entende quem também a conhece. Mensagens longas ou complexas aumentam a dificuldade.'),
  ('pular', 'Pular', 'Manobra', 'fisico', 1, 0, null,
   'Esta habilidade representa saltar em distância e em altura, transpor fossos e muros baixos e cair sem se ferir. Armaduras e carga aumentam a dificuldade. Falha: o salto fica curto.'),
  ('mergulhar', 'Mergulhar', 'Manobra', 'fisico', 1, 0, null,
   'Esta habilidade permite prender o fôlego, descer e mover-se debaixo d''água e recuperar objetos do fundo. Sem ela, o fôlego dura poucas rodadas. Armaduras pesadas impedem o uso.'),
  ('conduzir', 'Conduzir', 'Manobra', 'forca', 1, 0, null,
   'Esta habilidade permite guiar carroças, carruagens e trenós, manter a parelha sob controle em terreno ruim e em perseguições. A dificuldade cresce com a carga, o terreno e o número de animais.'),
  ('precificar', 'Precificar', 'Influência', 'carisma', 1, 0, null,
   'Esta habilidade permite estimar o valor justo de um item, perceber quando um preço foi inflado e convencer o outro lado de que o seu preço é o certo. Itens raros ou mágicos aumentam a dificuldade.'),
  ('seduzir', 'Seduzir', 'Influência', 'carisma', 2, 0, null,
   'Esta habilidade representa despertar desejo, afeição e confiança para obter favores, informações ou atenção. O teste é resistido pela vontade do alvo, e raça, cultura e situação mudam a dificuldade.'),
  ('torturar', 'Torturar', 'Influência', 'carisma', 2, 0, null,
   'Esta habilidade permite arrancar informações pela dor e pelo medo, mantendo a vítima viva e consciente. É rápida, mas perigosa: a falha crítica mata ou enlouquece o alvo, e a informação obtida nem sempre é verdadeira.'),
  ('observar', 'Observar', 'Geral', 'percepcao', 2, 0, null,
   'Esta habilidade representa a atenção treinada a detalhes: notar o que mudou num ambiente, quem está fora do lugar, uma marca ou uma porta escondida. Exige tempo e atenção; quem observa às pressas vê menos.'),
  ('cacar', 'Caçar', 'Geral', 'percepcao', 1, 0, null,
   'Esta habilidade permite encontrar, perseguir e abater animais para alimento, couro e outros materiais. O terreno, o clima e a presa definem a dificuldade. Falha: a caça se assusta e foge.'),
  ('distrair', 'Distrair', 'Geral', 'agilidade', 1, 0, null,
   'Esta habilidade permite desviar a atenção de alguém com um gesto, um barulho ou uma cena, abrindo espaço para um aliado agir. O teste é resistido pela atenção do alvo.'),
  ('herbalismo', 'Herbalismo', 'Conhecimento', 'intelecto', 1, 0, 'N',
   'Esta habilidade é o conhecimento das plantas: identificar ervas, raízes e fungos, saber onde crescem, como colhê-las e para que servem como remédio, tempero ou veneno.'),
  ('memorizacao', 'Memorização', 'Conhecimento', 'aura', 2, 0, null,
   'Esta habilidade permite guardar com precisão textos, rostos, caminhos e conversas, e recordá-los depois. Quanto maior e mais antigo o que se quer lembrar, maior a dificuldade.'),
  ('heraldica', 'Heráldica', 'Conhecimento', 'intelecto', 1, 0, null,
   'Esta habilidade é o conhecimento de brasões, estandartes, linhagens e títulos nobres. Permite reconhecer uma casa pelo escudo, saber a quem ela deve lealdade e como tratar seus membros.')
on conflict (key) do nothing;

-- ── 3. Itens novos ─────────────────────────────────────────
insert into public.itens (slug, nome, grupo, tipo, base, icone, ocupa, origem, magico, valor_latao, descricao, efeito_positivo, efeito_negativo) values
  ('equipamento_de_lenhador', 'Equipamento de Lenhador', 'Itens', 'S', 'equipamento', 'ti-axe', 5, 'Comum', false, 300,
   'Carpintaria: machado, cunhas e serra de corte.', null, null),
  ('equipamento_de_artesao', 'Equipamento de Artesão', 'Itens', 'S', 'equipamento', 'ti-tools', 5, 'Comum', false, 500,
   'Artesanato, Carpintaria e Alfaiataria: facas, sovelas, agulhas e formões.', null, null),
  ('equipamento_de_alquimista', 'Equipamento de Alquimista', 'Itens', 'S', 'equipamento', 'ti-flask', 3, 'Comum', false, 1400,
   'Alquimia: alambique, almofariz, balanças e filtros.', null, null),
  ('tecido_de_algodao', 'Tecido de Algodão', 'Consumíveis', 'S', null, 'ti-stack', 0.2, 'Comum', false, 12,
   'Peça de algodão fiado e tecido, pronta para a costura.', null, null),
  ('tecido_de_couro', 'Tecido de Couro', 'Consumíveis', 'S', null, 'ti-stack', 0.2, 'Comum', false, 60,
   'Couro curtido cortado em peças finas e uniformes, pronto para a costura.', null, null),
  ('tecido_de_seda', 'Tecido de Seda', 'Consumíveis', 'S', null, 'ti-needle-thread', 0.2, 'Comum', false, 96,
   'Seda tecida, leve e brilhante, pronta para a costura.', null, null),
  ('tecido_de_linho', 'Tecido de Linho', 'Consumíveis', 'S', null, 'ti-stack', 0.2, 'Comum', false, 24,
   'Linho tecido, firme e fresco, pronto para a costura.', null, null),
  ('antidoto_de_toxina', 'Antídoto de Toxina', 'Consumíveis', 'L', 'elixir', 'ti-flask-2', 0.1, 'Comum', false, 100,
   'Frasco que neutraliza toxinas no corpo de quem o bebe.', 'Reduz 75 de Doença.', null),
  ('antidoto_de_peconha', 'Antídoto de Peçonha', 'Consumíveis', 'L', 'elixir', 'ti-flask-2', 0.1, 'Comum', false, 50,
   'Frasco que neutraliza peçonhas no corpo de quem o bebe.', 'Reduz 50 de Doença.', null),
  ('antidoto_de_veneno', 'Antídoto de Veneno', 'Consumíveis', 'L', 'elixir', 'ti-flask-2', 0.1, 'Raro', false, 250,
   'Frasco que neutraliza venenos alquímicos no corpo de quem o bebe.', 'Reduz 100 de Doença.', null),
  ('elixir_toxico', 'Elixir Tóxico', 'Consumíveis', 'L', 'elixir', 'ti-flask-2', 0.1, 'Comum', false, 100,
   'Toxina diluída em frasco, pronta para ser servida ou atirada.', null, 'Diminui 2 de Energia Física por rodada, durante 5 rodadas; aumenta 75 de Doença.'),
  ('elixir_peconhento', 'Elixir Peçonhento', 'Consumíveis', 'L', 'elixir', 'ti-flask-2', 0.1, 'Comum', false, 50,
   'Peçonha diluída em frasco, pronta para ser servida ou atirada.', null, 'Diminui 1 de Energia Física por rodada, durante 5 rodadas; aumenta 50 de Doença.'),
  ('elixir_venenoso', 'Elixir Venenoso', 'Consumíveis', 'L', 'elixir', 'ti-flask-2', 0.1, 'Raro', false, 250,
   'Veneno alquímico diluído em frasco, pronto para ser servido ou atirado.', null, 'Diminui 2 de Energia Física por rodada, durante 10 rodadas; aumenta 100 de Doença.'),
  ('fogueira', 'Fogueira', 'Consumíveis', 'S', null, 'ti-campfire', 1, 'Comum', false, 60,
   'Lenha arrumada e acesa, boa para aquecer, cozinhar e espantar bichos.', null, null),
  ('condimento', 'Condimento', 'Consumíveis', 'S', null, 'ti-leaf', 0.1, 'Comum', false, 5,
   'Sal, ervas secas e especiarias para dar gosto à comida.', null, null),
  ('lingote_de_ouro', 'Lingote de Ouro', 'Minerais', 'S', 'minerio', 'ti-brick', 0.5, 'Raro', false, 15000,
   'Ouro fundido e moldado em barra.', null, null),
  ('lingote_de_prata', 'Lingote de Prata', 'Minerais', 'S', 'minerio', 'ti-brick', 0.5, 'Comum', false, 1500,
   'Prata fundida e moldada em barra.', null, null),
  ('lingote_de_cobre', 'Lingote de Cobre', 'Minerais', 'S', 'minerio', 'ti-brick', 0.5, 'Comum', false, 150,
   'Cobre fundido e moldado em barra.', null, null),
  ('lingote_de_ferro', 'Lingote de Ferro', 'Minerais', 'S', 'minerio', 'ti-brick', 0.5, 'Comum', false, 12,
   'Ferro fundido e moldado em barra.', null, null),
  ('moeda_ferro', 'Moeda de Ferro', 'Moedas', 'S', null, 'ti-coins', 0.1, 'Comum', false, 1,
   'Moeda de ferro cunhada à mão, de pouco valor e muito uso.', null, null)
on conflict (slug) do nothing;

-- As flechas envenenadas que já existiam são as do pedido.
update public.itens set nome = 'Flecha Sedativa',    descricao = 'Flecha com a ponta untada de toxina. Se o golpe chegar à energia física do alvo, o veneno age. Serve uma vez só.' where slug = 'flecha_envenenada_leopis';
update public.itens set nome = 'Flecha Paralisante', descricao = 'Flecha com a ponta untada de peçonha. Se o golpe chegar à energia física do alvo, o veneno age. Serve uma vez só.' where slug = 'flecha_envenenada_blueta';
update public.itens set nome = 'Flecha Envenenada',  descricao = 'Flecha com a ponta untada de veneno. Se o golpe chegar à energia física do alvo, o veneno age. Serve uma vez só.' where slug = 'flecha_envenenada_theonia';

-- ── 4. Receitas que a habilidade ensina ────────────────────
alter table public.receitas add column if not exists aprende_com text references public.habilidades(key);
alter table public.receitas add column if not exists minutos integer;
comment on column public.receitas.aprende_com is 'Habilidade que ensina a receita: o primeiro nível basta (fabricacao.jsx/receitaAprendida).';
comment on column public.receitas.minutos is 'Prazo da receita em minutos de Fabricar; vence o do grupo do item (horasDeFabricacao).';

with r(resultado_slug, hab, rende, minutos, testes, materiais) as (values
  -- Carpintaria
  ('lenha',   'carpintaria',  5,   10, null::text[], '[{"slug":"madeira","qtd":10},{"slug":"equipamento_de_lenhador","qtd":1,"ferramenta":true}]'),
  ('tocha',   'carpintaria',  5,   15, null, '[{"slug":"lenha","qtd":5},{"slug":"oleo_refinado","slugs":["oleo_refinado","oleo"],"nome":"Óleo","qtd":1},{"slug":"tecido_de_algodao","slugs":["tecido_de_algodao","tecido_de_linho","tecido_de_couro","tecido_de_seda"],"nome":"Tecido","qtd":1},{"slug":"equipamento_de_artesao","qtd":1,"ferramenta":true}]'),
  ('cajado',  'carpintaria',  1,  180, array['carpintaria'], '[{"slug":"lenha","qtd":3},{"slug":"equipamento_de_artesao","qtd":1,"ferramenta":true}]'),
  ('porrete', 'carpintaria',  1,  180, array['carpintaria'], '[{"slug":"lenha","qtd":4},{"slug":"equipamento_de_artesao","qtd":1,"ferramenta":true}]'),
  -- Alfaiataria
  ('tecido_de_algodao', 'alfaiataria', 5, 1440, null, '[{"slug":"algodao","qtd":10},{"slug":"equipamento_de_artesao","qtd":1,"ferramenta":true}]'),
  ('tecido_de_couro',   'alfaiataria', 5, 1440, null, '[{"slug":"couro_curtido","qtd":10},{"slug":"equipamento_de_artesao","qtd":1,"ferramenta":true}]'),
  ('tecido_de_seda',    'alfaiataria', 5, 1440, null, '[{"slug":"seda","qtd":10},{"slug":"equipamento_de_artesao","qtd":1,"ferramenta":true}]'),
  ('tecido_de_linho',   'alfaiataria', 5, 1440, null, '[{"slug":"linho","qtd":10},{"slug":"equipamento_de_artesao","qtd":1,"ferramenta":true}]'),
  -- Artesanato
  ('flecha', 'artesanato', 20,  60, null, '[{"slug":"madeira","qtd":20},{"slug":"equipamento_de_artesao","qtd":1,"ferramenta":true}]'),
  ('virote', 'artesanato', 20, 180, null, '[{"slug":"flecha","qtd":20},{"slug":"ferro","qtd":10},{"slug":"equipamento_de_artesao","qtd":1,"ferramenta":true}]'),
  -- Alquimia
  ('antidoto_de_toxina',        'alquimia', 1, 10, null, '[{"slug":"agua","qtd":1},{"slug":"frasco","qtd":1},{"slug":"secrecao_leopis","qtd":1},{"slug":"equipamento_de_alquimista","qtd":1,"ferramenta":true}]'),
  ('antidoto_de_peconha',       'alquimia', 1, 10, null, '[{"slug":"agua","qtd":1},{"slug":"frasco","qtd":1},{"slug":"secrecao_blueta","qtd":1},{"slug":"equipamento_de_alquimista","qtd":1,"ferramenta":true}]'),
  ('antidoto_de_veneno',        'alquimia', 1, 10, null, '[{"slug":"agua","qtd":1},{"slug":"frasco","qtd":1},{"slug":"secrecao_theonia","qtd":1},{"slug":"equipamento_de_alquimista","qtd":1,"ferramenta":true}]'),
  ('flecha_envenenada_leopis',  'alquimia', 1,  5, null, '[{"slug":"flecha","qtd":1},{"slug":"secrecao_leopis","qtd":1},{"slug":"equipamento_de_alquimista","qtd":1,"ferramenta":true}]'),
  ('flecha_envenenada_blueta',  'alquimia', 1,  5, null, '[{"slug":"flecha","qtd":1},{"slug":"secrecao_blueta","qtd":1},{"slug":"equipamento_de_alquimista","qtd":1,"ferramenta":true}]'),
  ('flecha_envenenada_theonia', 'alquimia', 1,  5, null, '[{"slug":"flecha","qtd":1},{"slug":"secrecao_theonia","qtd":1},{"slug":"equipamento_de_alquimista","qtd":1,"ferramenta":true}]'),
  ('elixir_toxico',             'alquimia', 1,  5, null, '[{"slug":"agua","qtd":1},{"slug":"frasco","qtd":1},{"slug":"secrecao_leopis","qtd":1},{"slug":"equipamento_de_alquimista","qtd":1,"ferramenta":true}]'),
  ('elixir_peconhento',         'alquimia', 1,  5, null, '[{"slug":"agua","qtd":1},{"slug":"frasco","qtd":1},{"slug":"secrecao_blueta","qtd":1},{"slug":"equipamento_de_alquimista","qtd":1,"ferramenta":true}]'),
  ('elixir_venenoso',           'alquimia', 1,  5, null, '[{"slug":"agua","qtd":1},{"slug":"frasco","qtd":1},{"slug":"secrecao_theonia","qtd":1},{"slug":"equipamento_de_alquimista","qtd":1,"ferramenta":true}]'),
  -- Sobrevivência
  ('fogueira', 'sobrevivencia', 1, 20, null, '[{"slug":"lenha","qtd":5},{"slug":"pederneira","qtd":1,"ferramenta":true}]'),
  -- Gastronomia
  ('racao',    'gastronomia', 1, 180, null, '[{"slug":"carne","qtd":2},{"slug":"fogueira","qtd":1}]'),
  ('banquete', 'gastronomia', 1, 120, null, '[{"slug":"carne","qtd":3},{"slug":"fogueira","qtd":1},{"slug":"condimento","qtd":1}]'),
  -- Metalurgia
  ('lingote_de_ouro',  'metalurgia',  5, 720, null, '[{"slug":"ouro_bruto","qtd":15},{"slug":"equipamento_de_ferreiro","qtd":1,"ferramenta":true}]'),
  ('lingote_de_prata', 'metalurgia',  5, 720, null, '[{"slug":"prata","qtd":15},{"slug":"equipamento_de_ferreiro","qtd":1,"ferramenta":true}]'),
  ('lingote_de_cobre', 'metalurgia',  5, 720, null, '[{"slug":"cobre","qtd":15},{"slug":"equipamento_de_ferreiro","qtd":1,"ferramenta":true}]'),
  ('lingote_de_ferro', 'metalurgia',  5, 720, null, '[{"slug":"ferro","qtd":15},{"slug":"equipamento_de_ferreiro","qtd":1,"ferramenta":true}]'),
  ('moeda_ouro',       'metalurgia', 30, 720, null, '[{"slug":"ouro_bruto","qtd":10},{"slug":"equipamento_de_ferreiro","qtd":1,"ferramenta":true}]'),
  ('moeda_prata',      'metalurgia', 30, 720, null, '[{"slug":"prata","qtd":10},{"slug":"equipamento_de_ferreiro","qtd":1,"ferramenta":true}]'),
  ('moeda_cobre',      'metalurgia', 30, 720, null, '[{"slug":"cobre","qtd":10},{"slug":"equipamento_de_ferreiro","qtd":1,"ferramenta":true}]'),
  ('moeda_ferro',      'metalurgia', 30, 720, null, '[{"slug":"ferro","qtd":10},{"slug":"equipamento_de_ferreiro","qtd":1,"ferramenta":true}]')
)
insert into public.receitas (resultado_slug, habilidade_key, aprende_com, dificuldade, dias, rende, minutos, testes, materiais)
select resultado_slug, hab, hab, 'D', 1, rende, minutos, testes, materiais::jsonb from r
on conflict (resultado_slug) do update set
  habilidade_key = excluded.habilidade_key,
  aprende_com    = excluded.aprende_com,
  rende          = excluded.rende,
  minutos        = excluded.minutos,
  testes         = excluded.testes,
  materiais      = excluded.materiais,
  atualizado_em  = now();
