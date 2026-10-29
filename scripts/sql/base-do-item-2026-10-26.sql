-- ============================================================
-- base-do-item-2026-10-26.sql — a BASE do item, separada do exemplar
-- ============================================================
-- Pedido do usuário em 26/10/2026:
--
--   "Existe a base do item, por exemplo 'Máscara de Ouro', e existe o exemplar
--    do item, 'Máscara Decorativa', 'Máscara Verrogari', etc — ou seja, as duas
--    podem ser uma 'Máscara de Ouro'. Isso vale para todos os itens."
--
-- Até aqui a pintura era escolhida por regex no NOME DO EXEMPLAR, e nome de
-- exemplar não diz material nenhum. A coluna `base` guarda o slug do tipo
-- (vocabulário em src/01-core/bases-item.jsx) e passa a mandar na arte, no
-- editor e na ficha do item.
--
-- A semeadura abaixo é a MESMA inferência que o código fazia até agora — ela
-- não acerta tudo (não tem como: o nome não diz), mas deixa o catálogo
-- classificado para o Mestre corrigir no editor, item a item.
--
-- Reversível: `update itens set base = null;` e `alter table itens drop column base;`
-- ============================================================

-- (sem unaccent: a base usa translate, para não exigir extensão no projeto)

-- ── 1. A coluna ────────────────────────────────────────────────────────────
alter table itens add column if not exists base text;
comment on column itens.base is
  'Slug da BASE do item (o tipo: mascara-ferro, livro-milagres, escudo-pesado). '
  'O vocabulário vive em src/01-core/bases-item.jsx. O nome do item é o '
  'EXEMPLAR ("Máscara Verrogari"); a base é o que ele é.';
create index if not exists itens_base_idx on itens (base);

-- ── 2. Semeadura: armadura pela classe de peso ─────────────────────────────
-- tipo_armadura L/M/P → leve/medio/pesado; sem tipo, médio (mesma regra de
-- versaoDaArte em 11-ficha/ficha.jsx).
with peso as (
  select id,
         case upper(coalesce(nullif(trim(tipo_armadura), ''), 'M'))
           when 'L' then 'leve' when 'P' then 'pesado' else 'medio' end as v,
         translate(lower(nome), 'áàâãäéêëíïóôõöúüçñ', 'aaaaaeeeiiooooouucn') as n
  from itens
  where categoria_equip = 'armadura'
)
update itens i set base = (
  case
    when i.slot_equip = 'cabeca' then 'elmo-' || p.v
    when i.slot_equip = 'ombro'  then 'ombreiras-' || p.v
    when i.slot_equip = 'dorso'  then 'peitoral-' || p.v
    when i.slot_equip = 'braco' and p.n like '%manopla%' then 'luvas-' || p.v
    when i.slot_equip = 'braco'  then 'bracos-' || p.v
    when i.slot_equip = 'mao'    then 'luvas-' || p.v
    when i.slot_equip = 'perna'  then 'pernas-' || p.v
    when i.slot_equip = 'canela' then 'caneleiras-' || p.v
    when i.slot_equip = 'pe'     then 'botas-' || p.v
  end)
from peso p
where p.id = i.id and i.base is null;

-- ── 3. Semeadura: escudo e arma pelo TIPO ──────────────────────────────────
-- "Escudo Pesado é uma imagem só"; a arma vai pelo nome (arco, lança, maça…),
-- como ARMA_POR_NOME. Sem tipo reconhecido, fica a classe de peso.
with arma as (
  select id, translate(lower(nome), 'áàâãäéêëíïóôõöúüçñ', 'aaaaaeeeiiooooouucn') as n,
         case upper(coalesce(nullif(trim(tipo_armadura), ''), 'M'))
           when 'L' then 'leve' when 'P' then 'pesado' else 'medio' end as v
  from itens where categoria_equip = 'arma'
)
update itens i set base = (
  case
    when a.n ~ 'escudo'                                   then 'escudo-' || a.v
    when a.n ~ '\m(besta|arlabesta)'                      then 'arma-besta'
    when a.n ~ '\m(arco|galadhrim|impetusion)'            then 'arma-arco'
    when a.n ~ '\mtridente'                               then 'arma-tridente'
    when a.n ~ '\m(lanca|pique|alabarda|arpao)'           then 'arma-lanca'
    when a.n ~ '\m(machado|machadinha|labris)'            then 'machado'
    when a.n ~ '\m(foice|reshanta)'                       then 'arma-foice'
    when a.n ~ '\m(chicote)'                              then 'arma-chicote'
    when a.n ~ '\mmangual'                                then 'arma-mangual'
    when a.n ~ '\m(martelo|marreta|malho)'                then 'arma-martelo'
    when a.n ~ '\m(maca|clava|porrete)'                   then 'arma-maca'
    when a.n ~ '\mcetro'                                  then 'arma-cetro'
    when a.n ~ '\m(cajado|bordao)'                        then 'arma-cajado'
    when a.n ~ '\m(adaga|punhal|faca)'                    then 'adaga'
    when a.n ~ '\m(espada|montante|cimitarra|sabre|rapieira)' then 'espada'
    else 'arma-' || a.v
  end)
from arma a
where a.id = i.id and i.base is null;

-- ── 4. Semeadura: joia, veste e adorno pelo NOME DA FAMÍLIA + material ─────
-- O material sai da palavra no nome; quem não diz o material cai no preço,
-- como versaoDaArte fazia (barato = cobre, caro = ouro).
with v as (
  select id, translate(lower(nome), 'áàâãäéêëíïóôõöúüçñ', 'aaaaaeeeiiooooouucn') as n, coalesce(valor_latao, 0) as preco, slot_equip
  from itens
  where tipo_equip in ('adorno', 'vestimenta')
), m as (
  select id, n, slot_equip,
         case when n ~ '(ouro|dourad)' then 'ouro'
              when n ~ '(prata|pratead)' then 'prata'
              when n ~ '(cobre|acobread|latao|marfim|rustic|ornament|bronze)' then 'cobre'
              when preco > 60000 then 'ouro'
              when preco > 6000 then 'prata'
              else 'cobre' end as metal,
         case when n ~ '\mseda' then 'seda'
              when n ~ '\mcouro' then 'couro'
              when n ~ '\mlinho' then 'linho'
              when n ~ '(algodao|\mla\M|palha)' then 'algodao'
              when preco > 6000 then 'seda'
              else 'algodao' end as tecido
  from v
)
update itens i set base = (
  case
    when m.n ~ '\mcoroa'       then 'coroa-' || m.metal
    when m.n ~ '\mtiara'       then 'tiara-' || m.metal
    when m.n ~ '\mchapeu'      then 'chapeu-' || (case when m.n ~ 'veludo' then 'veludo' when m.n ~ 'couro' then 'couro' else 'palha' end)
    when m.n ~ '\mbroche'      then 'broche-' || m.metal
    when m.n ~ '\mmedalha'     then 'medalha-' || m.metal
    when m.n ~ '\m(pingente|amuleto)' then 'pingente-' || m.metal
    when m.n ~ '\mbrinco'      then 'brincos-' || m.metal
    when m.n ~ '\mpiercing'    then 'piercing-' || m.metal
    when m.n ~ '\mcolar'       then 'colar-' || m.metal
    when m.n ~ '\mgargantilha' then 'gargantilha-' || m.metal
    when m.n ~ '\mcachecol'    then 'cachecol-' || (case when m.tecido = 'couro' then 'algodao' else m.tecido end)
    when m.n ~ '\mlenco'       then 'lenco-' || (case when m.tecido = 'couro' then 'algodao' else m.tecido end)
    when m.n ~ '\manel'        then 'anel-' || m.metal
    when m.n ~ '\m(bracelete|pulseira)' then 'bracelete-' || m.metal
    when m.n ~ '\mluva'        then 'luva-pano-' || (case when m.tecido = 'linho' then 'algodao' else m.tecido end)
    when m.n ~ '\mdragona'     then 'dragona-' || m.metal
    when m.n ~ '\mcapuz'       then 'capuz-' || (case when m.tecido = 'linho' then 'algodao' else m.tecido end)
    when m.n ~ '\mmascara'     then 'mascara-' || (case when m.n ~ '(nobre|porcelana|marfim)' then 'porcelana'
                                                        when m.n ~ '(selvagem|couro|rustic)' then 'couro' else 'ferro' end)
    when m.n ~ 'olhar da infamia' then 'mascara-ferro'
    when m.n ~ '\mcapa'        then 'capa-' || (case when m.n ~ '(nobre|luxuos|veludo)' then 'nobre'
                                                     when m.n ~ '(decorad|militar|complet|protec)' then 'ornado' else 'simples' end)
    when m.n ~ '\msobretudo'   then 'sobretudo-' || (case when m.n ~ 'luxuos' then 'luxuoso' when m.n ~ 'complet' then 'completo' else 'simples' end)
    when m.n ~ '\m(traje|tunica)' then 'roupa-' || (case when m.tecido = 'couro' then 'algodao' else m.tecido end)
    when m.n ~ '\mcasaco'      then 'casaco-' || (case when m.n ~ 'nobre' then 'nobre' when m.n ~ 'couro' then 'couro' else 'algodao' end)
    when m.n ~ '\m(cinto|cinturao)' then 'cinto-' || (case when m.n ~ '(nobre|luxuos|placas|elfico)' then 'nobre'
                                                           when m.n ~ '(complet|militar|suporte|acessorios)' then 'ornado' else 'simples' end)
    when m.n ~ '\mcalca'       then 'calca-' || (case when m.tecido = 'linho' then 'algodao' else m.tecido end)
    when m.n ~ '\m(sandalia|aleteias)' then 'sandalia'
    when m.n ~ '\mbota'        then 'botas-medio'
    when m.slot_equip = 'alforje' and m.n ~ '\malforge'   then 'alforge'
    when m.slot_equip = 'alforje' and m.n ~ '\malgibeira' then 'algibeira'
    when m.slot_equip = 'alforje' and m.n ~ '\maljava'    then 'aljava'
    when m.slot_equip = 'alforje' and m.n ~ '\mbainha'    then 'bainha'
    when m.slot_equip = 'alforje' and m.n ~ '\mestojo'    then 'estojo'
  end)
from m
where m.id = i.id and i.base is null;

-- ── 5. Semeadura: item SEM região, pelo tipo do nome ───────────────────────
-- A mesma tabela de ARTE_ITEM_TIPO (11-ficha/ficha.jsx), na mesma ordem: a
-- Pérola Fantasma é um navio, não uma pérola.
with s as (select id, translate(lower(nome), 'áàâãäéêëíïóôõöúüçñ', 'aaaaaeeeiiooooouucn') as n from itens where slot_equip is null)
update itens i set base = (
  case
    when s.n ~ '^(livro|manual)\M'                     then 'livro'
    when s.n ~ '^equipamentos?\M'                      then 'equipamento'
    when s.n ~ '^mapa\M'                               then 'mapa'
    when s.n ~ '^quadro\M'                             then 'quadro'
    when s.n ~ '^(estatua|busto)\M'                    then 'estatua'
    when s.n ~ '^pergaminho\M'                         then 'pergaminho'
    when s.n ~ '^elixir\M'                             then 'elixir'
    when s.n ~ '^frasco\M'                             then 'frasco'
    when s.n ~ '^(pandemonio|peconha|toxina)\M'        then 'veneno'
    when s.n ~ '^flecha\M'                             then 'flecha'
    when s.n ~ '^virote\M'                             then 'virote'
    when s.n ~ '^dardo\M'                              then 'dardo'
    when s.n ~ '^(racao|refeicao|banquete|lembas)\M'   then 'racao'
    when s.n ~ '^(vinho|licor|cerveja|hidromel|suco)\M' then 'hidromel'
    when s.n ~ '^agua\M'                               then 'agua'
    when s.n ~ '^tocha\M'                              then 'tocha'
    when s.n ~ '^lamparina\M'                          then 'lamparina'
    when s.n ~ '^pederneira\M'                         then 'pederneira'
    when s.n ~ '^(lenha|madeira)\M'                    then 'lenha'
    when s.n ~ '^cachimbo\M'                           then 'cachimbo'
    when s.n ~ '^(arca|bau|caixa)\M'                   then 'bau'
    when s.n ~ '^(barril|tonel)\M'                     then 'barril'
    when s.n ~ '^(jarra|urna)\M'                       then 'jarra'
    when s.n ~ '^mochila\M'                            then 'mochila'
    when s.n ~ '^saco\M'                               then 'saco'
    when s.n ~ '^bolsa\M'                              then 'bolsa'
    when s.n ~ '^(cantil|cabaca|caramanhola)\M'        then 'cantil'
    when s.n ~ '^odre\M'                               then 'odre'
    when s.n ~ '^(barco|barcaca|canoa|caravela|nau|veleiro)\M' or s.n ~ 'perola fantasma' then 'barco'
    when s.n ~ '^(carroca|carruagem|charrete|carro de boi|treno)\M' then 'carroca'
    when s.n ~ '^alforje\M'                            then 'alforge'
    when s.n ~ '^sela\M'                               then 'sela'
    when s.n ~ '^(arreio|cabecada|gualdrapa|manta de sela)\M' then 'arreio'
    when s.n ~ '^(cavalo|ponei|andaluz|ardennes)\M' or s.n ~ 'puro-sangue' then 'cavalo'
    when s.n ~ '^moeda antiga de cobre'                then 'moeda_cobre'
    when s.n ~ '^moeda antiga de latao'                then 'moeda_latao'
    when s.n ~ '^moeda antiga de prata'                then 'moeda_prata'
    when s.n ~ '^moeda (antiga )?de ouro'              then 'moeda_ouro'
    when s.n ~ '^moeda de prata'                       then 'moeda_prata'
    when s.n ~ '^moeda de latao'                       then 'moeda_latao'
    when s.n ~ '^moeda de cobre'                       then 'moeda_cobre'
    when s.n ~ '^(aco|aerilium|arcanitro|bronze|carvao|cinetezio|ferro|gravornita|ignivar|inferium|luminar|nautilium|ouro|prata)\M' then 'minerio'
    when s.n ~ '^(agua marinha|ambar|ametista|diamante|esmeralda|jade|obsidiana|opala|perola|quartzo|rubi|safira|topazio|turmalina|pedra vidente)\M' then 'gema'
    when s.n ~ '^pedra\M'                              then 'minerio'
    when s.n ~ '^(casa|casarao|casebre|castelo|choupana|mansao|palacio|taverna|hospedaria|forte|fortaleza|torreao|igreja|moinho|padaria|rancho|fazenda|estabulo|farol|forjaria|carpintaria|guilda|escritorio)\M' then 'casa'
  end)
from s
where s.id = i.id and i.base is null;

-- ── 6. Os livros, pelo que ensinam ─────────────────────────────────────────
-- "Todo livro com as magias dos deuses são 'Livro de Milagres'" (usuário). O
-- vínculo livro_pergaminhos diz quais pergaminhos o livro ensina, e a classe
-- da magia diz o resto. Milagre manda: o livro de um deus que também traz
-- feitiços continua sendo livro de milagres.
with ensino as (
  select lp.livro_slug,
         count(*) filter (where m.classe = 'Milagre') as milagres,
         count(*) filter (where m.classe = 'Feitiço') as feiticos
  from livro_pergaminhos lp
  join itens p on p.slug = lp.pergaminho_slug
  left join magias m on m.nome = p.magia
  group by lp.livro_slug
)
update itens i
set base = case when e.milagres > 0 then 'livro-milagres'
                when e.feiticos > 0 then 'livro-magias'
                else i.base end
from ensino e
where e.livro_slug = i.slug;

-- Os que o nome já classifica sozinho.
update itens set base = 'livro-idiomas'   where base = 'livro' and nome ilike 'Livro de Idiomas %';
update itens set base = 'livro-sabedoria' where base = 'livro' and nome ilike 'Livro de Sabedoria %';
update itens set base = 'livro-religiao'  where base = 'livro' and nome ilike 'Livro de Religião %';
update itens set base = 'livro-tecnicas'
  where base = 'livro' and (nome ilike 'Manual %' or nome ilike '%Técnicas de Combate%');
update itens set base = 'livro-habilidade'
  where base = 'livro' and nome ~* '^Livro de (Alfabetização|Armadilhagem|Codificar|Desenho|Destrancar|Engenharia|Escultura|Literatura|Medicina|Metalurgia|Militarismo|Misticismo|Música|Náutica|Pintura|Teatro|Venefício|Acordo)';
update itens set base = 'livro-historia'
  where base = 'livro' and nome ~* '^Livro (d[aoe]s? )?(Cidades|Revelações|Levânia|Família|Trilha|Confraria)';

-- ── 7. Conferência ─────────────────────────────────────────────────────────
-- select coalesce(base,'(sem base)') as base, count(*) from itens group by 1 order by 2 desc;
