-- scripts/sql/arreamento-e-atrelado-2026-10-05.sql
-- ============================================================================
-- ARREAMENTO E ATRELADO (05/10/2026)
--
-- Pedidos do usuário:
--   "Vamos criar itens para vestir os animais, roupas específicas para cada
--    tipo de animal. Do tipo cavalo, grifo, dragão, avestruz, pônei, elefante,
--    camelo, podemos ter Selas e Arreios, Peitorais, Cabeçadas e Rédeas,
--    Caneleiras, Mantas, Alforje de Sela, Bardas, Chanfron, Crinum, Gualdrapa,
--    Sela de Jorna[da], de Torne[i]o ou de Guerra."
--   "Os itens carroça, carro de boi, carruagem, carruagem composta, charrete
--    podem ser equipados aos cavalos, bois, vacas, touros, búfalos e camelos.
--    Trenó pode ser equipado em cães, lobos, raposas, javalis."
--
-- APLICADO NO BANCO EM 05/10/2026 (projeto kaxbdpdutentlrobuqyu), pelas
-- migrations `arreamento_colunas`, `arreamento_itens` e `arreamento_atrelado`.
--
-- DUAS COLUNAS NOVAS em public.itens:
--
--   slot_arreio      A casa do MAPA DO ANIMAL em que a peça entra. É um
--                    vocabulário próprio do bicho (sela, cabecada, chanfron…),
--                    não o slot_equip do personagem — e é de propósito: peça de
--                    arreamento não se veste no corpo de ninguém, então
--                    slot_equip fica NULL e o inventário nem oferece Equipar
--                    ou Vestir (ver ehVestimenta/equipavel em
--                    src/07-inventario/inventario.jsx). O desenho das casas
--                    mora em ANIMAL_CASAS (src/11-ficha/ficha.jsx).
--
--   animal_subtipos  CSV de criaturas.subtipo que ACEITA a peça. NULL = serve
--                    em qualquer animal (é o que todo item solto continua
--                    sendo: um saco de farinha vai no lombo de qualquer bicho).
--                    criaturas.subtipo já era exatamente o "tipo de animal" do
--                    pedido — Cavalo, Grifo, Dragão, Avestruz, Pônei, Elefante,
--                    Camelo, Cão, Lobo, Raposa, Javali, Vaca, Touro, Búfalo —
--                    então não houve classificação nova a inventar.
--
-- A trava de verdade é do front (equiparNoAnimal, 07-inventario): equipar no
-- animal mexe no jsonb do inventário, não passa por RPC. Diferente da compra
-- (comprar_item), aqui não existe porta de serviço a guardar — quem adultera o
-- próprio jsonb já podia pôr qualquer item em qualquer casa antes disto.
--
-- GRUPO NOVO: 'Arreios'. Entra no menu de Comércio entre Animais e
-- Transportes (src/01-core/constants.jsx) e no editor do catálogo
-- (src/09-bestiario/catalogo-descritores.jsx).
-- ============================================================================

-- ── 1. AS COLUNAS ───────────────────────────────────────────────────────────
alter table public.itens add column if not exists slot_arreio     text;
alter table public.itens add column if not exists animal_subtipos text;

comment on column public.itens.slot_arreio is
  'Casa do mapa do animal em que a peça entra (vocabulário do bicho, não o slot_equip do personagem). Ver ANIMAL_CASAS em src/11-ficha/ficha.jsx.';
comment on column public.itens.animal_subtipos is
  'CSV de criaturas.subtipo que aceita a peça. NULL = serve em qualquer animal.';

-- As 13 casas do arreamento. 'maos' fica fora: ela não vem daqui, é escolhida
-- por slotParaPeca para arma/escudo (src/09-bestiario/criatura-formulas.jsx).
do $do$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.itens'::regclass
                    and conname = 'itens_slot_arreio_chk') then
    alter table public.itens add constraint itens_slot_arreio_chk
      check (slot_arreio is null or slot_arreio = any (array[
        'cabecada', 'chanfron', 'crinum', 'arreio', 'sela', 'manta',
        'gualdrapa', 'peitoral', 'barda', 'caneleiras', 'alforje', 'atrelado'
      ]));
  end if;
end
$do$;

-- ── 2. OS 13 ITENS DE ARREAMENTO ────────────────────────────────────────────
-- Família de montaria do pedido, igual para as treze peças. Grifo e Dragão
-- ainda não têm linha no grupo Animais (só em criaturas), mas entram na lista:
-- no dia em que o Mestre puser o item à venda, o arreamento já serve.
--
-- Preço no mercado da casa: um Cavalo Selvagem custa 1.500 e um Ardennes
-- 8.000 (grupo Animais); uma Carroça, 5.000. A sela de jornada sai por menos
-- de uma montaria barata, e a Barda — armadura inteira de bicho — custa mais
-- que o cavalo que ela veste.
insert into public.itens
  (slug, nome, grupo, tipo, origem, ocupa, armazena, valor_latao,
   slot_arreio, animal_subtipos, absorcao, defesa, icone, descricao)
values
  ('cabecada_e_redeas', 'Cabeçada e Rédeas', 'Arreios', 'S', 'Comum', 1.5, null, 900,
   'cabecada', 'Cavalo, Grifo, Dragão, Avestruz, Pônei, Elefante, Camelo', null, null, 'ti-lasso',
   'Correame de couro que abraça a cabeça do animal e termina nas mãos de quem monta. Sem ela o bicho vai para onde quer: é a primeira peça que se compra e a última que se tira.'),

  ('arreio', 'Arreio', 'Arreios', 'S', 'Comum', 2.5, null, 1600,
   'arreio', 'Cavalo, Grifo, Dragão, Avestruz, Pônei, Elefante, Camelo', null, null, 'ti-link',
   'O conjunto de tiras, fivelas e anéis que distribui a tração pelo peito e pelo cernelha do animal. É o arreio que transforma força de bicho em viagem — e o que um veículo precisa encontrar no lugar para ser atrelado.'),

  ('manta_de_sela', 'Manta de Sela', 'Arreios', 'S', 'Comum', 1, null, 300,
   'manta', 'Cavalo, Grifo, Dragão, Avestruz, Pônei, Elefante, Camelo', null, null, 'ti-bed',
   'Pano grosso de lã que vai entre o lombo e a sela. Barata, e a diferença entre um dia de estrada e um lombo em carne viva.'),

  ('sela_de_jornada', 'Sela de Jornada', 'Arreios', 'S', 'Comum', 5, null, 2800,
   'sela', 'Cavalo, Grifo, Dragão, Avestruz, Pônei, Elefante, Camelo', null, null, 'ti-armchair',
   'Sela de abas largas e assento fundo, feita para horas seguidas de caminho. Pesa menos que as outras duas e é a que o viajante escolhe quando a viagem é o trabalho.'),

  ('sela_de_torneio', 'Sela de Torneio', 'Arreios', 'S', 'Comum', 5, null, 5500,
   'sela', 'Cavalo, Grifo, Dragão, Avestruz, Pônei, Elefante, Camelo', null, null, 'ti-armchair',
   'Sela alta de arção dianteiro reforçado, pensada para o choque da lança sem derrubar o cavaleiro. Couro trabalhado e ferragens à vista: ela é feita para ser olhada de perto.'),

  ('sela_de_guerra', 'Sela de Guerra', 'Arreios', 'S', 'Comum', 6.5, null, 8500,
   'sela', 'Cavalo, Grifo, Dragão, Avestruz, Pônei, Elefante, Camelo', null, null, 'ti-armchair',
   'Arção dianteiro e traseiro altos, prendendo o cavaleiro no assento como uma cadeira de combate. Pesada e desconfortável na estrada; é a única que se segura quando a montaria gira em pleno golpe.'),

  ('alforje_de_sela', 'Alforje de Sela', 'Arreios', 'S', 'Comum', 1.5, 12, 1400,
   'alforje', 'Cavalo, Grifo, Dragão, Avestruz, Pônei, Elefante, Camelo', null, null, 'ti-luggage',
   'Par de bolsas de couro que se pendura atrás da sela, uma de cada lado. Guarda o que não cabe na mochila de quem monta — e viaja no lombo do bicho, não nas costas do dono.'),

  ('gualdrapa', 'Gualdrapa', 'Arreios', 'S', 'Comum', 2, null, 1800,
   'gualdrapa', 'Cavalo, Grifo, Dragão, Avestruz, Pônei, Elefante, Camelo', null, null, 'ti-shirt',
   'Capa de tecido que cobre o animal dos ombros à garupa, bordada com as cores de quem o monta. Não protege de nada: diz de quem é a montaria antes de alguém perguntar.'),

  ('caneleiras_de_montaria', 'Caneleiras de Montaria', 'Arreios', 'S', 'Comum', 2.5, null, 2400,
   'caneleiras', 'Cavalo, Grifo, Dragão, Avestruz, Pônei, Elefante, Camelo', 2, 1, 'ti-shoe',
   'Lâminas de couro cozido fivelas nas canelas do animal. Guardam as pernas — que é por onde a infantaria tenta derrubar uma montaria.'),

  ('peitoral_de_montaria', 'Peitoral de Montaria', 'Arreios', 'S', 'Comum', 4, null, 4200,
   'peitoral', 'Cavalo, Grifo, Dragão, Avestruz, Pônei, Elefante, Camelo', 4, 1, 'ti-shield-half',
   'Placa curva de aço sobre o peito do animal, pendurada do arreio. Recebe o que vem de frente: a carga é a hora em que a montaria toma o golpe antes do cavaleiro.'),

  ('crinum', 'Crinum', 'Arreios', 'S', 'Comum', 3, null, 4800,
   'crinum', 'Cavalo, Grifo, Dragão, Avestruz, Pônei, Elefante, Camelo', 3, 1, 'ti-shield-chevron',
   'Fileira de escamas de aço articuladas que acompanha o pescoço da crina à cernelha. Protege a única parte do bicho que fica alta, exposta e ao alcance de uma espada.'),

  ('chanfron', 'Chanfron', 'Arreios', 'S', 'Comum', 2.5, null, 4500,
   'chanfron', 'Cavalo, Grifo, Dragão, Avestruz, Pônei, Elefante, Camelo', 3, 2, 'ti-helmet',
   'Máscara de aço moldada no osso da cara do animal, com copos sobre os olhos e um chifre curto no meio da testa. Fecha o alvo mais fácil de uma montaria em carga.'),

  ('barda', 'Barda', 'Arreios', 'S', 'Raro', 12, null, 26000,
   'barda', 'Cavalo, Grifo, Dragão, Avestruz, Pônei, Elefante, Camelo', 8, 3, 'ti-shield-checkered',
   'A armadura completa do bicho: flancos, garupa e ancas em placas rebitadas sobre loriga. Custa mais que a montaria que veste, pesa como um homem armado e é o que separa um cavalo de guerra de um cavalo morto.')
on conflict (slug) do update set
  nome = excluded.nome, grupo = excluded.grupo, tipo = excluded.tipo,
  origem = excluded.origem, ocupa = excluded.ocupa, armazena = excluded.armazena,
  valor_latao = excluded.valor_latao, slot_arreio = excluded.slot_arreio,
  animal_subtipos = excluded.animal_subtipos, absorcao = excluded.absorcao,
  defesa = excluded.defesa, icone = excluded.icone, descricao = excluded.descricao;

-- ── 3. OS VEÍCULOS QUE SE ATRELAM ───────────────────────────────────────────
-- Os seis já existiam no grupo Transportes, com armazena e preço. O que entra
-- é a casa ('atrelado') e QUEM puxa. As duas listas são as do pedido, ao pé da
-- letra. 'Boi' não é subtipo de nenhuma criatura hoje (o catálogo tem Vaca e
-- Touro), mas fica na lista: o dia em que existir, puxa.
update public.itens set
  slot_arreio = 'atrelado',
  animal_subtipos = 'Cavalo, Boi, Vaca, Touro, Búfalo, Camelo'
where slug in ('carroca', 'carro_de_boi', 'carruagem', 'carruagem_composta', 'charrete');

update public.itens set
  slot_arreio = 'atrelado',
  animal_subtipos = 'Cão, Lobo, Raposa, Javali'
where slug = 'treno';

-- ── CONFERÊNCIA ─────────────────────────────────────────────────────────────
-- As treze peças e os seis veículos, com a casa e quem aceita:
--   select grupo, nome, slot_arreio, animal_subtipos, ocupa, valor_latao
--     from public.itens
--    where slot_arreio is not null
--    order by grupo, slot_arreio, valor_latao;
--
-- Nenhuma peça de arreamento vestível no personagem (slot_equip/categoria_equip
-- têm de ser NULL nas treze):
--   select count(*) from public.itens
--    where grupo = 'Arreios'
--      and (slot_equip is not null or categoria_equip is not null);
--
-- Nenhum item de graça entrou (§4 de docs/sugestoes-itens.md: só água, água
-- suja, feno, lenha e terra ficam sem valor):
--   select slug from public.itens where valor_latao is null;
