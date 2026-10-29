-- ============================================================
-- A DESCRIÇÃO DIZ O QUE SE APRENDE / O QUE SE GANHA (28/10/2026)
-- ============================================================
-- Pedido do usuário: "Faça uma revisão da descrição de todos os itens, aplique
-- a melhoria da descrição que estamos fazendo, quando possível, informa o que
-- se pode aprender usando um livro ou um pergaminho, ou usando um consumível."
--
-- ── O QUE FICOU DE FORA, E POR QUÊ ───────────────────────────────────────
-- `efeito_positivo` e `efeito_negativo` NÃO entraram no texto. A janela do
-- item (BestItemFicha, 09-bestiario) já os mostra em duas linhas próprias —
-- "Efeito positivo" e "Efeito negativo" —, e repetir na descrição seria dizer
-- duas vezes. O que a janela NÃO mostra, e por isso entrou aqui, é `magia`,
-- `nivel_magia`, `tecnica` e `doc_url`: a informação existia na coluna e não
-- chegava a lugar nenhum.
--
-- ── O QUE ENTROU ─────────────────────────────────────────────────────────
-- 1. 239 pergaminhos de MAGIA. Diziam só "Pergaminho com instruções para o
--    aprendizado da magia X". Agora dizem a classe, o alcance, a duração e o
--    PREÇO EM HORAS — 24 de Estudar, Orar, Meditar ou Praticar conforme a
--    classe (ATIVIDADE_DA_CLASSE, 01-core/game-data.jsx).
-- 2. 65 pergaminhos de TÉCNICA. O efeito da técnica, palavra por palavra do
--    catálogo, mais as 36 horas de Treinar.
-- 3. 65 itens que CARREGAM magia (armas lendárias, jóias, frascos). Nenhum
--    dizia qual nem em que nível — uma arma com Bola de Fogo no nível 9 e a
--    ficha calada. Consumível diz "Usar evoca…"; equipamento, "Carrega…".
-- 4. 12 livros com `doc_url`: que o texto abre na janela de leitura.
-- 5. 35 livros religiosos que dividiam UMA frase; agora cada um nomeia o seu
--    deus, demônio ou titã, lido do próprio nome do item.
-- 6. 19 livros de ensino (7 idiomas, 5 religiões, 7 sabedorias) mais Venefício
--    e Teatro: dizem qual habilidade se aprende e as 12 horas de Estudar.
-- 7. As três Ervas que curam dividiam a mesma frase e têm potências
--    diferentes (5/10/15 de energia, 50/75/100 de doença): o texto agora
--    ordena as três.
--
-- ── DUAS COISAS A SABER ──────────────────────────────────────────────────
-- • AS HORAS ESTÃO ESCRITAS NO TEXTO. 24, 36 e 12 vêm de HORAS_TREINO
--   (01-core/game-data.jsx). Se a tabela mudar, estas descrições envelhecem —
--   e o conserto é rodar este script de novo, que é por isso que ele é
--   idempotente: cada update reconstrói o texto inteiro a partir do catálogo,
--   nunca concatena em cima do que já está lá (os que concatenam têm a trava
--   `descricao not ilike '%…%'`).
-- • "LIVRO DE TEATRO" é inferência minha: Teatro não é habilidade do
--   catálogo, e o padrão dos irmãos ("Sabedoria Anã" = Sabedoria + Anã) leva
--   a Arte (grupo Influência). Se for outra, é só trocar aqui.
--
-- Aplicado em produção via execute_sql em 28/10/2026.
-- ============================================================

-- ── 1. Pergaminhos de magia ─────────────────────────────────────────────
update public.itens i set descricao =
  'Pergaminho com instruções para o aprendizado da magia ' || m.nome || ', '
  || case m.classe when 'Feitiço' then 'um feitiço' when 'Milagre' then 'um milagre'
       when 'Transmutação' then 'uma transmutação' when 'Encanto' then 'um encanto' end
  || ' de alcance ' || btrim(m.alcance) || ' e duração ' || btrim(m.duracao) || '. '
  || 'Aprendê-la custa 24 horas de '
  || case m.classe when 'Feitiço' then 'Estudar' when 'Milagre' then 'Orar'
       when 'Transmutação' then 'Meditar' when 'Encanto' then 'Praticar' end
  || ', e só na primeira vez: com o nível 1 na ficha, os níveis seguintes valem assim que você compra.'
from public.magias m
where m.nome = i.magia and i.nome ilike 'Pergaminho%'
  and m.classe in ('Feitiço','Milagre','Transmutação','Encanto');

-- ── 2. Pergaminhos de técnica ───────────────────────────────────────────
update public.itens i set descricao =
  'Pergaminho com instruções para o treino da técnica de combate ' || t.nome || '. '
  || btrim(t.efeito) || ' '
  || 'Treiná-la custa 36 horas de Treinar, e só na primeira vez: com o nível 1 na ficha, os níveis seguintes valem assim que você compra.'
from public.tecnicas t
where t.nome = i.tecnica and i.nome ilike 'Pergaminho%';

-- ── 3. O que carrega magia ──────────────────────────────────────────────
update public.itens set descricao = btrim(descricao) || ' '
  || case when grupo = 'Consumíveis'
       then 'Usar evoca ' || magia || ' no nível ' || nivel_magia || '.'
       else 'Carrega a magia ' || magia || ', evocada no nível ' || nivel_magia || '.' end
where magia is not null and btrim(magia) <> '' and nivel_magia is not null
  and nome not ilike 'Pergaminho%'
  and descricao is not null and btrim(descricao) <> ''
  and descricao not ilike '%evoca%' and descricao not ilike '%Carrega a magia%';

-- ── 4. O que se lê ──────────────────────────────────────────────────────
update public.itens set descricao = btrim(descricao) || ' O texto completo abre na janela de leitura.'
where doc_url is not null and btrim(doc_url) <> ''
  and descricao is not null and btrim(descricao) <> ''
  and descricao not ilike '%janela de leitura%';

-- ── 5. Os 35 livros religiosos que diziam todos a mesma coisa ───────────
update public.itens set descricao =
  'Livro religioso com práticas, dogmas e histórias ' || regexp_replace(nome, '^Livro ', '') || '.'
where descricao = 'Livro religioso com práticas, dogmas e histórias.';

-- ── 6. Os livros que ensinam habilidade ─────────────────────────────────
update public.itens set descricao =
  'Livro artesanal, raro e de altíssimo valor, com páginas de pergaminho e capas de tábua revestidas de couro, para o aprendizado do idioma '
  || substring(nome from '^Livro de Idiomas (.+)$')
  || '. Aprender a habilidade Idioma custa 12 horas de Estudar, e só na primeira vez: com o nível 1 na ficha, os níveis seguintes valem assim que você compra.'
where nome like 'Livro de Idiomas %';

update public.itens set descricao =
  'Livro artesanal, com páginas de couro e capa de tábua de madeira, de cunho didático sobre a religião '
  || substring(nome from '^Livro de Religião (.+)$')
  || '. Aprender a habilidade Religião custa 12 horas de Estudar, e só na primeira vez: com o nível 1 na ficha, os níveis seguintes valem assim que você compra.'
where nome like 'Livro de Religião %';

update public.itens set descricao =
  'Livro para o aprendizado da ' || substring(nome from '^Livro de (.+)$')
  || ', especialização da habilidade Sabedoria. Aprendê-la custa 12 horas de Estudar, e só na primeira vez: com o nível 1 na ficha, os níveis seguintes valem assim que você compra.'
where nome like 'Livro de Sabedoria %';

update public.itens set descricao =
  'Livro para o aprendizado da habilidade Venefício, o saber dos venenos e de seus antídotos. Aprendê-la custa 12 horas de Estudar, e só na primeira vez: com o nível 1 na ficha, os níveis seguintes valem assim que você compra.'
where nome = 'Livro de Venefício';

update public.itens set descricao =
  'Livro para o aprendizado do Teatro, especialização da habilidade Arte. Aprendê-la custa 12 horas de Estudar, e só na primeira vez: com o nível 1 na ficha, os níveis seguintes valem assim que você compra.'
where nome = 'Livro de Teatro';

-- ── 7. As três ervas que curam, em ordem de potência ────────────────────
update public.itens set descricao = 'Erva aromática de campos e pradarias, a mais branda das três que curam: alivia a doença e repõe pouco do corpo, ao preço de algum vício.' where nome = 'Erva Amalil';
update public.itens set descricao = 'Erva aromática de campos e pradarias, de poder intermediário: cura melhor que a Amalil e vicia na mesma medida.' where nome = 'Erva Azpha';
update public.itens set descricao = 'Erva aromática de campos e pradarias, a mais potente das três: limpa a doença por inteiro e repõe o corpo, ao preço do vício mais forte.' where nome = 'Erva Rubashi';
