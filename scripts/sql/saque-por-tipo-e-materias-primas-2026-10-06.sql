-- scripts/sql/saque-por-tipo-e-materias-primas-2026-10-06.sql
-- ============================================================================
-- O SAQUE DA CRIATURA, POR TIPO E ELEMENTO — E A MATÉRIA-PRIMA (06/10/2026)
--
-- Pedido do usuário:
--   "Criaturas possuem os itens abaixo como equipamento (quantidade randômica)
--    e é este equipamento que pode ser saqueado após a sua morte. Do tipo
--    Animais: Carne entre 10% e 25% do peso. Sangue entre 3% e 8% do peso.
--    Couro entre 2% e 10% do peso. Marfim entre 1% e 5% do peso (se elemento
--    água). Pêlo entre 1% e 4% do peso (se elemento terra). Pena entre 2% e 5%
--    do peso (se elemento ar). Óleo entre 1% e 3% do peso (se elemento fogo).
--    […] Do tipo Elementais: Fogo Vivo entre 0% e 25% do peso (se elemento
--    fogo). Karma Líquido […] Alguma pedra preciosa […] Energia Cinética […]"
--   "Sangue Mágico virou Sangue Arcano, Sangue Negro virou Sangue Profano, etc."
--   "Vamos criar novos itens: Ferro, Ouro, Bronze, Prata, Madeira, Algodão,
--    Carvão […] Aço […] Linho, Seda, Corda […]"
--
-- APLICADO NO BANCO EM 06/10/2026 (projeto kaxbdpdutentlrobuqyu), pelas
-- migrations `saque_vocabulario_por_tipo`, `saque_faltantes_sagrado_e_podre`,
-- `saque_elemental_trio`, `materias_primas` e `saque_da_criatura_por_tipo`.
--
-- NENHUMA MECÂNICA NOVA FOI PRECISO PARA O SAQUE: o material entra como
-- mochila em `criaturas.equipamento`, que é exatamente de onde o saque já lê
-- (saqueDisponivel, src/09-bestiario/criatura-formulas.jsx; SaqueModal,
-- src/12-batalha/batalha.jsx). Matar e saquear já funcionavam — faltava a
-- criatura ter o que largar.
--
-- O VOCABULÁRIO segue criaturas.tipo:
--   Animal · Civilizado → sem adjetivo (Carne, Sangue, Couro…)
--   Celestial           → Sagrado / Sagrada
--   Dragão              → Titânico / Titânica
--   Infernal            → Profano / Profana
--   Místico             → Arcano / Arcana
--   Morto               → Podre
--   Elemental           → Fogo Vivo · Karma Líquido · Energia Cinética · gema
--
-- SÓ O NOME MUDOU, NUNCA O SLUG. O slug é chave e já está gravado em
-- inventários de jogador e em criaturas.equipamento; renomear slug apagaria o
-- que as mesas têm. O mapeamento antigo→novo saiu do próprio banco: as
-- criaturas de tipo Dragão já carregavam `*_draconico`, e as de Animal
-- `*_animal`, o que fixou os pares sem adivinhação. Os três `pelo_*` sem par
-- óbvio (abençoado, de fogo, maldito, dourado) foram lidos pelo nome:
-- abençoado→Sagrado, de fogo→Titânico, maldito→Profano, dourado→Arcano.
-- ============================================================================

-- ── 1. O VOCABULÁRIO ────────────────────────────────────────────────────────
-- Celestial → Sagrado
update public.itens set nome = 'Sangue Sagrado' where slug = 'sangue_celestial';
update public.itens set nome = 'Couro Sagrado'  where slug = 'couro_celestial';
update public.itens set nome = 'Marfim Sagrado' where slug = 'marfim_celestial';
update public.itens set nome = 'Pena Sagrada'   where slug = 'pena_celestial';
update public.itens set nome = 'Óleo Sagrado'   where slug = 'oleo_celestial';
update public.itens set nome = 'Pêlo Sagrado'   where slug = 'pelo_abencoado';

-- Dragão → Titânico
update public.itens set nome = 'Carne Titânica'  where slug = 'carne_draconica';
update public.itens set nome = 'Sangue Titânico' where slug = 'sangue_draconico';
update public.itens set nome = 'Couro Titânico'  where slug = 'couro_draconico';
update public.itens set nome = 'Marfim Titânico' where slug = 'marfim_draconica';
update public.itens set nome = 'Pena Titânica'   where slug = 'pena_draconica';
update public.itens set nome = 'Óleo Titânico'   where slug = 'oleo_draconico';
update public.itens set nome = 'Pêlo Titânico'   where slug = 'pelo_de_fogo';

-- Infernal → Profano. 'Carne Podre' era o nome de carne_demoniaca; este update
-- vem ANTES do insert dos Mortos, que é quem fica com o nome.
update public.itens set nome = 'Carne Profana'  where slug = 'carne_demoniaca';
update public.itens set nome = 'Sangue Profano' where slug = 'sangue_demoniaco';
update public.itens set nome = 'Couro Profano'  where slug = 'couro_demoniaco';
update public.itens set nome = 'Marfim Profano' where slug = 'marfim_demoniaca';
update public.itens set nome = 'Pena Profana'   where slug = 'pena_demoniaca';
update public.itens set nome = 'Óleo Profano'   where slug = 'oleo_demoniaco';
update public.itens set nome = 'Pêlo Profano'   where slug = 'pelo_maldito';

-- Místico → Arcano
update public.itens set nome = 'Carne Arcana'  where slug = 'carne_mistica';
update public.itens set nome = 'Sangue Arcano' where slug = 'sangue_mistico';
update public.itens set nome = 'Couro Arcano'  where slug = 'couro_mistico';
update public.itens set nome = 'Marfim Arcano' where slug = 'marfim_mistica';
update public.itens set nome = 'Pena Arcana'   where slug = 'pena_mistica';
update public.itens set nome = 'Óleo Arcano'   where slug = 'oleo_mistico';
update public.itens set nome = 'Pêlo Arcano'   where slug = 'pelo_dourado';

-- ── 2. OS BURACOS DA MATRIZ ─────────────────────────────────────────────────
-- Faltava a carne dos Celestiais — RECEITAS_CARNE (01-core/inventario-helpers)
-- já apontava para `carne_celestial`, que não existia: a receita sagrada
-- estava morta desde que foi escrita. E faltava a família inteira dos Mortos.
-- Preço espelhando o irmão de cada tier; nenhum preço existente foi mexido.
insert into public.itens (slug, nome, grupo, tipo, origem, ocupa, valor_latao, icone, descricao)
values
  ('carne_celestial', 'Carne Sagrada', 'Consumíveis', 'S', 'Raro', 1, 500, 'ti-meat',
   'Carne de criatura celestial: firme, morna e com um brilho que não vem da gordura. Alimenta e assusta em medidas iguais.'),
  ('carne_podre', 'Carne Podre', 'Consumíveis', 'S', 'Comum', 1, 50, 'ti-meat',
   'Carne arrancada de um morto que já andava. Não se come: serve de isca, de reagente e de prova de que a coisa existiu.'),
  ('sangue_podre', 'Sangue Podre', 'Consumíveis', 'L', 'Comum', 0.1, 20, 'ti-droplet',
   'Sangue coagulado e escuro, que escorre devagar como piche. Reagente de necromante e veneno de quem não sabe o que carrega.'),
  ('couro_podre', 'Couro Podre', 'Consumíveis', 'S', 'Comum', 1, 50, 'ti-paw',
   'Pele curtida pela própria morte, rígida em placas e macia nas emendas. Veste quem não tem escolha e cheira a quem tem.'),
  ('marfim_podre', 'Marfim Podre', 'Consumíveis', 'S', 'Comum', 1, 20, 'ti-bone',
   'Osso e dente de morto-vivo, cinzentos e porosos. Quebram mais fácil que marfim bom, e valem pelo que se faz com eles.'),
  ('pelo_podre', 'Pêlo Podre', 'Consumíveis', 'S', 'Comum', 0.1, 10, 'ti-feather',
   'Tufos que se soltam ao toque, presos a pedaços de couro seco. Ninguém tece com isto; alguns queimam.'),
  ('pena_podre', 'Pena Podre', 'Consumíveis', 'S', 'Comum', 0.1, 10, 'ti-feather',
   'Penas sem brilho, com as hastes rachadas. Escrevem mal e manchado — e por isso há quem as prefira.'),
  ('oleo_podre', 'Óleo Podre', 'Consumíveis', 'L', 'Comum', 0.1, 20, 'ti-flask-2',
   'Gordura rançosa derretida de um corpo que não devia ter gordura. Queima bem, com fumaça preta e cheiro que gruda.')
on conflict (slug) do update set
  nome = excluded.nome, grupo = excluded.grupo, tipo = excluded.tipo,
  origem = excluded.origem, ocupa = excluded.ocupa, valor_latao = excluded.valor_latao,
  icone = excluded.icone, descricao = excluded.descricao;

-- ── 3. O QUE SAI DE UM ELEMENTAL ────────────────────────────────────────────
-- "Fogo Vivo é um líquido que aumenta 5 de EH por unidade consumida, pode ir
--  além do seu máximo, dura 2 dias." (idem Karma Líquido +10 KA e Energia
--  Cinética +1 VB.)
-- O efeito em prosa é o que o resto do catálogo usa; o TRANSBORDO (passar do
-- máximo) e os 2 DIAS moram no front — ver EFEITO_TRANSBORDA e
-- EFEITO_DURACAO_DIAS em src/01-core/inventario-helpers.jsx.
insert into public.itens (slug, nome, grupo, tipo, origem, ocupa, valor_latao,
                          efeito_positivo, icone, descricao)
values
  ('fogo_vivo', 'Fogo Vivo', 'Consumíveis', 'L', 'Alquímico', 0.1, 200,
   'Aumenta 5 de Energia Heroica.', 'ti-flame',
   'Chama líquida colhida de um elemental de fogo, que esquenta o frasco e não o queima. Bebida, arde até o osso e empurra o corpo além do que ele tinha — por dois dias.'),
  ('karma_liquido', 'Karma Líquido', 'Consumíveis', 'L', 'Alquímico', 0.1, 400,
   'Aumenta 10 de Karma.', 'ti-droplet',
   'Água pesada de elemental, densa como mel e fria como pedra de rio. Enche o poço de Karma acima da borda, e a borda volta ao lugar em dois dias.'),
  ('energia_cinetica', 'Energia Cinética', 'Consumíveis', 'S', 'Alquímico', 0.1, 300,
   'Aumenta 1 de Velocidade.', 'ti-wind',
   'Um nó de vento preso em si mesmo, que pesa menos que o ar e empurra a mão que o segura. Engolido, apressa os passos por dois dias.')
on conflict (slug) do update set
  nome = excluded.nome, grupo = excluded.grupo, tipo = excluded.tipo,
  origem = excluded.origem, ocupa = excluded.ocupa, valor_latao = excluded.valor_latao,
  efeito_positivo = excluded.efeito_positivo, icone = excluded.icone,
  descricao = excluded.descricao;

-- ── 4. MATÉRIA-PRIMA ────────────────────────────────────────────────────────
-- Grupo próprio ('Matérias-Primas'): não é consumível (não se come, não se
-- bebe) nem item de uso — é o que entra na bancada. A unidade é pequena de
-- propósito: as receitas pedem "20 de algodão" e "40 madeira", e um material
-- que ocupasse 1 por unidade tornaria qualquer receita impossível de carregar.
--
-- Preço ancorado no que já existia: o Traje de Algodão custa 20 e leva 20 de
-- algodão, então algodão a 1 latão fecha a conta com margem de mão de obra. O
-- Aço custa mais que Ferro + Carvão porque exige Metalurgia e um teste
-- Difícil, e metade do que entra se perde.
insert into public.itens (slug, nome, grupo, tipo, origem, ocupa, valor_latao, icone, descricao)
values
  ('ferro', 'Ferro', 'Matérias-Primas', 'S', 'Comum', 0.2, 4, 'ti-pick',
   'Barra de ferro bruto, fosca e pesada para o tamanho. É o metal de tudo o que não precisa ser bonito.'),
  ('carvao', 'Carvão', 'Matérias-Primas', 'S', 'Comum', 0.1, 2, 'ti-campfire',
   'Lenha queimada sem ar até virar brasa negra e seca. Pega fogo quente e limpo — é o que a forja pede. Sai de queimar Lenha, metade do peso.'),
  ('aco', 'Aço', 'Matérias-Primas', 'S', 'Comum', 0.2, 15, 'ti-hammer',
   'Ferro casado com carvão no calor certo, e por isso duro sem ser quebradiço. Metade do que entra sai como aço; o resto vira escória.'),
  ('bronze', 'Bronze', 'Matérias-Primas', 'S', 'Comum', 0.2, 10, 'ti-cube',
   'Liga antiga, de cor de mel escuro. Mais mole que o aço e mais dócil ao molde: é dela que saem sinos, fivelas e estátuas.'),
  ('prata', 'Prata', 'Matérias-Primas', 'S', 'Raro', 0.2, 100, 'ti-cube',
   'Barra branca que escurece ao ar e volta a brilhar ao pano. Vale pelo preço e, dizem, pelo que recusa a tocar.'),
  ('ouro_bruto', 'Ouro', 'Matérias-Primas', 'S', 'Raro', 0.2, 1000, 'ti-cube',
   'Mole o bastante para se marcar com a unha e pesado o bastante para se notar na mão. Não enferruja, não mancha, não passa.'),
  ('madeira', 'Madeira', 'Matérias-Primas', 'S', 'Comum', 0.2, 2, 'ti-wood',
   'Tábua seca e aplainada, pronta para o serrote. O material de cabo, coronha, aro e casco.'),
  ('algodao', 'Algodão', 'Matérias-Primas', 'S', 'Comum', 0.1, 1, 'ti-stack',
   'Fibra branca cardada e pronta para fiar. Barata, quente e a primeira roupa de quase todo mundo.'),
  ('linho', 'Linho', 'Matérias-Primas', 'S', 'Comum', 0.1, 3, 'ti-stack',
   'Fibra longa e fria ao toque, mais forte molhada que seca. Veste o verão e amarra o que o algodão não aguenta.'),
  ('canhamo', 'Cânhamo', 'Matérias-Primas', 'S', 'Comum', 0.1, 2, 'ti-stack',
   'Fibra grossa e áspera, que arranha a mão e não arrebenta. Vira corda, vela de barco e saco de carga.'),
  ('seda', 'Seda', 'Matérias-Primas', 'S', 'Raro', 0.1, 40, 'ti-needle-thread',
   'Fio que escorre entre os dedos e aquece sem peso. Caro por ser difícil, não por ser raro.'),
  ('corda_material', 'Corda', 'Matérias-Primas', 'S', 'Comum', 0.2, 8, 'ti-ruler',
   'Fios torcidos em cabo, e o cabo em corda. Sai de linho, seda ou cânhamo — metade do que entra —, com Artesanato e um teste Difícil.'),
  ('couro_curtido', 'Couro Curtido', 'Matérias-Primas', 'S', 'Comum', 0.2, 12, 'ti-paw',
   'Pele raspada, curtida e cortada em folhas de medida. Metade do couro cru vira isto; o resto fica no tanque.'),
  ('pedra', 'Pedra', 'Matérias-Primas', 'S', 'Comum', 0.3, 1, 'ti-mountain',
   'Bloco talhado em esquadro, pesado e indiferente. Levanta muro, mó e fundação.'),
  ('vidro', 'Vidro', 'Matérias-Primas', 'S', 'Comum', 0.1, 6, 'ti-flask-2',
   'Areia derretida e soprada, transparente e traiçoeira. Fecha frasco, vela de lanterna e janela de quem pode.')
on conflict (slug) do update set
  nome = excluded.nome, grupo = excluded.grupo, tipo = excluded.tipo,
  origem = excluded.origem, ocupa = excluded.ocupa, valor_latao = excluded.valor_latao,
  icone = excluded.icone, descricao = excluded.descricao;

-- ── 5. O SAQUE DE CADA CRIATURA ─────────────────────────────────────────────
-- A tabela `_regras` é o pedido ao pé da letra: material, faixa de % do peso
-- e, quando houver, o elemento exigido. `criaturas.elemento` pode trazer mais
-- de um ("Ar, Água"), por isso o ILIKE.
--
-- RE-RODAR REROLA: o bloco tira do equipamento os materiais de saque que
-- estiverem lá e sorteia de novo. Arma, armadura e peça vestida da criatura
-- não são tocadas — só os slugs da lista `v_slugs`.
do $do$
declare
  v_c record;
  v_regra record;
  v_qtd int;
  v_novo jsonb;
  v_gema text;
  v_slugs text[] := array[
    'carne','sangue_animal','couro_animal','marfim_animal','pelo','pena','oleo',
    'carne_celestial','sangue_celestial','couro_celestial','marfim_celestial','pelo_abencoado','pena_celestial','oleo_celestial',
    'carne_draconica','sangue_draconico','couro_draconico','marfim_draconica','pelo_de_fogo','pena_draconica','oleo_draconico',
    'carne_demoniaca','sangue_demoniaco','couro_demoniaco','marfim_demoniaca','pelo_maldito','pena_demoniaca','oleo_demoniaco',
    'carne_mistica','sangue_mistico','couro_mistico','marfim_mistica','pelo_dourado','pena_mistica','oleo_mistico',
    'carne_podre','sangue_podre','couro_podre','marfim_podre','pelo_podre','pena_podre','oleo_podre',
    'fogo_vivo','karma_liquido','energia_cinetica'
  ];
begin
  create temp table _gemas (slug text);
  insert into _gemas select slug from public.itens where grupo = 'Minerais';

  create temp table _regras (tipo text, slug text, pmin numeric, pmax numeric, elemento text);
  insert into _regras (tipo, slug, pmin, pmax, elemento) values
    -- Animais: marfim, pêlo, pena e óleo dependem do elemento
    ('Animal','carne',10,25,null), ('Animal','sangue_animal',3,8,null), ('Animal','couro_animal',2,10,null),
    ('Animal','marfim_animal',1,5,'Água'), ('Animal','pelo',1,4,'Terra'),
    ('Animal','pena',2,5,'Ar'), ('Animal','oleo',1,3,'Fogo'),
    -- Celestiais: os sete, sem condição de elemento
    ('Celestial','carne_celestial',10,25,null), ('Celestial','sangue_celestial',3,8,null),
    ('Celestial','couro_celestial',2,10,null), ('Celestial','marfim_celestial',1,5,null),
    ('Celestial','pelo_abencoado',1,4,null), ('Celestial','pena_celestial',2,5,null),
    ('Celestial','oleo_celestial',1,3,null),
    -- Civilizados: cinco materiais, e os mesmos itens dos Animais
    ('Civilizado','carne',10,15,null), ('Civilizado','sangue_animal',5,8,null),
    ('Civilizado','couro_animal',2,5,null), ('Civilizado','marfim_animal',1,2,null),
    ('Civilizado','pelo',1,2,null),
    ('Dragão','carne_draconica',5,10,null), ('Dragão','sangue_draconico',1,4,null),
    ('Dragão','couro_draconico',2,5,null), ('Dragão','marfim_draconica',1,2,null),
    ('Dragão','pelo_de_fogo',0,1,null), ('Dragão','pena_draconica',0,1,null),
    ('Dragão','oleo_draconico',1,3,null),
    ('Infernal','carne_demoniaca',10,25,null), ('Infernal','sangue_demoniaco',3,8,null),
    ('Infernal','couro_demoniaco',2,10,null), ('Infernal','marfim_demoniaca',1,5,null),
    ('Infernal','pelo_maldito',0,1,null), ('Infernal','pena_demoniaca',0,1,null),
    ('Infernal','oleo_demoniaco',1,3,null),
    ('Místico','carne_mistica',10,25,null), ('Místico','sangue_mistico',3,8,null),
    ('Místico','couro_mistico',2,10,null), ('Místico','marfim_mistica',1,5,null),
    ('Místico','pelo_dourado',1,2,null), ('Místico','pena_mistica',1,2,null),
    ('Místico','oleo_mistico',1,3,null),
    ('Morto','carne_podre',5,15,null), ('Morto','sangue_podre',3,5,null),
    ('Morto','couro_podre',1,3,null), ('Morto','marfim_podre',1,5,null),
    ('Morto','pelo_podre',0,1,null), ('Morto','pena_podre',0,1,null),
    ('Morto','oleo_podre',5,10,null),
    -- Elementais: um material por elemento. A Terra sai como pedra sorteada
    -- (slug '@gema', resolvido na hora entre os 25 Minerais).
    ('Elemental','fogo_vivo',0,25,'Fogo'), ('Elemental','karma_liquido',0,25,'Água'),
    ('Elemental','@gema',0,5,'Terra'), ('Elemental','energia_cinetica',0,75,'Ar');

  for v_c in select id, tipo, elemento, peso, equipamento from public.criaturas loop
    v_novo := coalesce((
      select jsonb_agg(e)
        from jsonb_array_elements(coalesce(v_c.equipamento, '[]'::jsonb)) e
       where not (e->>'slug' = any (v_slugs))
    ), '[]'::jsonb);

    if coalesce(v_c.peso, 0) > 0 then
      for v_regra in select * from _regras where tipo = v_c.tipo loop
        continue when v_regra.elemento is not null
                 and coalesce(v_c.elemento, '') not ilike '%' || v_regra.elemento || '%';

        v_qtd := floor(v_c.peso * (v_regra.pmin + random() * (v_regra.pmax - v_regra.pmin)) / 100.0)::int;
        -- Faixa que começa em 0% pode dar 0, e aí a criatura não larga nada
        -- daquele material — é o que "entre 0% e 1%" quer dizer.
        continue when coalesce(v_qtd, 0) <= 0;

        if v_regra.slug = '@gema' then
          select slug into v_gema from _gemas order by random() limit 1;
          continue when v_gema is null;
          v_novo := v_novo || jsonb_build_array(
            jsonb_build_object('slug', v_gema, 'slot', 'mochila', 'qtd', v_qtd));
        else
          v_novo := v_novo || jsonb_build_array(
            jsonb_build_object('slug', v_regra.slug, 'slot', 'mochila', 'qtd', v_qtd));
        end if;
      end loop;
    end if;

    update public.criaturas set equipamento = v_novo where id = v_c.id;
  end loop;

  drop table _gemas;
  drop table _regras;
end
$do$;

-- ── CONFERÊNCIA ─────────────────────────────────────────────────────────────
-- O saque de cada criatura, por tipo:
--   select c.tipo, c.nome, c.peso, c.elemento,
--          (select string_agg((e->>'slug') || ' x' || (e->>'qtd'), ', ' order by e->>'slug')
--             from jsonb_array_elements(c.equipamento) e where e->>'slot' = 'mochila') as saque
--     from criaturas c order by c.tipo, c.nome;
--
-- Nenhum slug de saque sem linha no catálogo (o saque mostraria "(? slug)"):
--   select distinct e->>'slug' from criaturas c,
--          jsonb_array_elements(coalesce(c.equipamento,'[]'::jsonb)) e
--    where not exists (select 1 from itens i where i.slug = e->>'slug');
--
-- As matérias-primas, e nenhuma de graça:
--   select slug, nome, ocupa, valor_latao from itens
--    where grupo = 'Matérias-Primas' order by valor_latao;
