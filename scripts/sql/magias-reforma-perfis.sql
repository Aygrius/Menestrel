-- scripts/sql/magias-reforma-perfis.sql
-- ============================================================
-- Reforma do catálogo de magias pelo perfil de cada profissão (12/09/2026).
--
-- Aplica as decisões do usuário sobre docs/sugestoes-magias.md e
-- docs/estudo-magias.md:
--
--   SUGESTÕES
--     2.1  seis ataques novos para os colégios com menos ataque
--          (Alquímico 2, Filosófico 2, Ilusionista 1, Naturalista 1)
--     2.2  Cadência Veloz (as outras do Bardo foram descartadas)
--     2.4  treze curas de ordem para o Sacerdote, custo 1 ou 2
--     2.5  Égide Celestial (Colégio Necromântico) e Selo Abismal
--     3.1  seis ataques ganham elemento (Toque Gélido vira INFERNAL)
--     3.2  Hidroproteção vira Básica; Hidro e Aeroproteção vão ao Elemental
--     3.3  Covardia fica só no Ilusionista (Curas Naturais e Curas Heroicas
--          ficam como estão)
--     3.4  Apontar Sufocante com duração e perda por rodada no nível
--     3.5  Recupereção Física vira Recuperação Física; Linguagem,
--          Conhecimento Linguístico e Escrita fundem (em Dom das Línguas)
--     2.3  (Rastreador) NÃO aplicada — ficou fora das decisões
--
--   ESTUDO
--     2.1  dificuldade de habilidade: 22 magias viram 6
--     2.2  Ruído absorve Ruído Extenuante; Degeneração Física vira ataque
--          infernal; Distração absorve Região Inviolável
--     2.6  Respiração Arcana, Visão Animal, Detecção de Magia, Comunhão
--          Natural, Caçada Marcada e Mutação absorvem a vizinha;
--          Teriantropia é só excluída
--
-- Resultado: 238 → 235 magias (+25 novas, −28 fundidas, −1 excluída).
--
-- O QUE REFERENCIA MAGIA, e o que este script faz com cada um:
--   personagens.magias  (jsonb key→passos) chave antiga vira a final; se o PJ
--                       já tinha as duas, fica o MAIOR passo. 5 PJs afetados.
--   criaturas.magia     (texto, por NOME) Gnomo, Duende, Verme do Deserto
--   itens.magia         (texto, por NOME) 10 itens
--   itens_historia      conferido: nenhum usa magia
--   historias.magia_ids conferido: só "Abrigo", que não muda
--
-- CUSTO: nenhuma fusão aumenta o gasto de pontos de quem já conhecia a magia
-- (gastoMagias = nível efetivo × custo). Por isso Amizade, Conhecimento
-- Natural, Sombra e Graça Felina ficam com custo 1.
--
-- BACKUP tirado antes de rodar, fora do schema exposto pela API:
--   backup.magias_20260912, backup.personagens_magias_20260912,
--   backup.criaturas_magia_20260912, backup.itens_magia_20260912
-- ============================================================

BEGIN;

-- ── Guarda: nenhuma chave nova pode existir ──────────────────────────
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.magias WHERE key IN (
    'frasco_incendiario','nevoa_caustica','verdade_ofuscante','paradoxo','terror_fantasma',
    'enxame_de_espinhos','cadencia_veloz','balsamo_de_lena','seiva_de_maira',
    'mare_restauradora','paz_coletiva','sangue_de_batalha','descanso_de_cruine',
    'justa_reparacao','bencao_da_terra','chama_vital','mente_serena','tempera_da_carne',
    'alivio_dourado','pressagio_curativo','egide_celestial','selo_abismal',
    'dom_das_linguas','sombra','graca_felina','recuperacao_fisica');
  IF n > 0 THEN RAISE EXCEPTION 'Colisão: % chave(s) nova(s) já existem', n; END IF;
END $$;

-- ============================================================
-- 1) MAGIAS NOVAS
-- ============================================================
INSERT INTO public.magias
  (key, nome, evocacao, alcance, duracao, custo, tipo, permissao, descricao,
   nivel_1, nivel_3, nivel_5, nivel_7, nivel_9)
VALUES
/* ── 2.1 Mago: ataque por colégio ─────────────────────────────── */
('frasco_incendiario', 'Frasco Incendiário', '1 rodada', '15 metros', 'Instantânea', 2, 'Básica',
 'Colégio Alquímico',
 $t$Com esta magia, você transmuta os reagentes de um frasco em um composto instável e o arremessa contra um alvo escolhido. Ao se partir, o frasco explode em chamas e pode atingir quem estiver próximo (à critério do Mestre do Jogo). O frasco precisa estar em sua mão no momento da evocação e é consumido pela magia.$t$,
 'Causa 10 de dano elemental de fogo.', 'Causa 15 de dano elemental de fogo.',
 'Causa 20 de dano elemental de fogo.', 'Causa 25 de dano elemental de fogo.',
 'Causa 30 de dano elemental de fogo.'),

('nevoa_caustica', 'Névoa Cáustica', '1 rodada', '20 metros', 'Instantânea', 1, 'Básica',
 'Colégio Alquímico',
 $t$Você libera no ar uma nuvem de vapores corrosivos que envolve o alvo escolhido e queima seus olhos, sua pele e seus pulmões, caso falhe em um teste de resistência mágica. A névoa se dissipa ao fim da rodada, e um vento forte pode dispersá-la antes que faça efeito (à critério do Mestre do Jogo). Criaturas que não respiram são imunes.$t$,
 'Causa 6 de dano elemental de ar.', 'Causa 10 de dano elemental de ar.',
 'Causa 14 de dano elemental de ar.', 'Causa 18 de dano elemental de ar.',
 'Causa 22 de dano elemental de ar.'),

('verdade_ofuscante', 'Verdade Ofuscante', '1 rodada', '20 metros', 'Instantânea', 1, 'Básica',
 'Colégio Filosófico',
 $t$Com esta magia, você enuncia uma verdade inegável, que se materializa em um feixe de luz celestial contra o alvo escolhido. Quanto mais o alvo vive na mentira, mais a luz o fere: demônios e mortos-vivos sentem a verdade como brasa. Se você mentir durante a evocação, a magia falha e o karma é perdido.$t$,
 'Causa 6 de dano elemental celestial.', 'Causa 11 de dano elemental celestial.',
 'Causa 16 de dano elemental celestial.', 'Causa 21 de dano elemental celestial.',
 'Causa 26 de dano elemental celestial.'),

('paradoxo', 'Paradoxo', '2 rodadas', '20 metros', '3 rodadas', 2, 'Básica',
 'Colégio Filosófico',
 $t$Você apresenta ao alvo um paradoxo que a mente dele não consegue abandonar. Enquanto tenta resolvê-lo, o alvo que falhar em um teste de resistência mágica sofre uma exaustão mental que drena seu ímpeto e atrapalha seus golpes. Seres irracionais e criaturas sem mente não são afetados por esta magia.$t$,
 'Causa 4 de dano na energia heroica e reduza 1 coluna de ataque.',
 'Causa 8 de dano na energia heroica e reduza 2 colunas de ataque.',
 'Causa 12 de dano na energia heroica e reduza 3 colunas de ataque.',
 'Causa 16 de dano na energia heroica e reduza 4 colunas de ataque.',
 'Causa 20 de dano na energia heroica e reduza 5 colunas de ataque.'),

('terror_fantasma', 'Terror Fantasma', 'Instantânea', '20 metros', 'Instantânea', 1, 'Básica',
 'Colégio Ilusionista',
 $t$Com esta magia, você projeta na mente do alvo a imagem daquilo que ele mais teme, visível apenas para ele. O alvo que falhar em um teste de resistência mágica vê sua coragem se esvair diante da visão. Seres irracionais e criaturas sem mente não são afetados. Caso não tenha mais energia heroica, o alvo fica paralisado de medo até o fim da próxima rodada.$t$,
 'Causa 6 de dano na energia heroica.', 'Causa 10 de dano na energia heroica.',
 'Causa 14 de dano na energia heroica.', 'Causa 18 de dano na energia heroica.',
 'Causa 22 de dano na energia heroica.'),

('enxame_de_espinhos', 'Enxame de Espinhos', '1 rodada', '20 metros', 'Instantânea', 1, 'Básica',
 'Colégio Naturalista',
 $t$Você clama à terra sob o alvo, e raízes cobertas de espinhos irrompem do solo para perfurá-lo. Esta magia só pode ser evocada sobre solo natural (terra, areia ou pedra), e não surte efeito em alvos que estejam voando ou sobre construções.$t$,
 'Causa 6 de dano elemental de terra.', 'Causa 11 de dano elemental de terra.',
 'Causa 16 de dano elemental de terra.', 'Causa 21 de dano elemental de terra.',
 'Causa 26 de dano elemental de terra.'),

/* ── 2.2 Bardo ────────────────────────────────────────────────── */
('cadencia_veloz', 'Cadência Veloz', 'Instantânea', '10 metros', '3 rodadas', 2, 'Básica',
 'Confraria de Artistas',
 $t$Com esta magia, você marca um ritmo acelerado com palmas, tambor ou os próprios pés, e todos os aliados que o ouvirem passam a se mover no compasso da música sem perceber. Se você for silenciado, o efeito se desfaz imediatamente. Seres irracionais não podem ser afetados por esse encanto.$t$,
 'Aumenta 3 de velocidade.', 'Aumenta 4 de velocidade.', 'Aumenta 6 de velocidade.',
 'Aumenta 7 de velocidade.', 'Aumenta 9 de velocidade.'),

/* ── 2.4 Sacerdote: uma cura com a cara de cada ordem ─────────── */
('balsamo_de_lena', 'Bálsamo de Lena', '3 rodadas', 'Toque', 'Instantânea', 1, 'Básica',
 'Ordem de Lena',
 $t$Através de uma prece a Lena, você unge o alvo com um bálsamo perfumado que alivia dores, febres e mal-estares, devolvendo-lhe a disposição. O bálsamo não fecha ferimentos: restaura o bem-estar do corpo. A evocação exige que o alvo permaneça imóvel.$t$,
 'Aumenta 5 de Saúde.', 'Aumenta 10 de Saúde.', 'Aumenta 15 de Saúde.',
 'Aumenta 20 de Saúde.', 'Aumenta 25 de Saúde.'),

('seiva_de_maira', 'Seiva de Maira', '2 rodadas', 'Toque', 'Instantânea', 2, 'Básica',
 'Ordem de Maira',
 $t$Você pede a Maira que a seiva das plantas ao redor corra pelas veias do alvo, fechando cortes e restaurando o vigor do corpo. Esta magia só pode ser evocada em ambientes naturais, e a vegetação tocada murcha por alguns dias.$t$,
 'Restaura 6 de energia física.', 'Restaura 12 de energia física.',
 'Restaura 18 de energia física.', 'Restaura 24 de energia física.',
 'Restaura 30 de energia física.'),

('mare_restauradora', 'Maré Restauradora', '2 rodadas', 'Toque', 'Instantânea', 2, 'Básica',
 'Ordem de Ganis',
 $t$Com esta magia, uma água clara brota de suas mãos e envolve o alvo como uma onda calma, restaurando o corpo e o ânimo ao mesmo tempo. A evocação exige que o alvo permaneça imóvel, e a água desaparece assim que a magia termina.$t$,
 'Restaura 4 de energia heroica e 4 de energia física.',
 'Restaura 8 de energia heroica e 8 de energia física.',
 'Restaura 12 de energia heroica e 12 de energia física.',
 'Restaura 16 de energia heroica e 16 de energia física.',
 'Restaura 20 de energia heroica e 20 de energia física.'),

('paz_coletiva', 'Paz Coletiva', '3 rodadas', '10 metros', 'Instantânea', 2, 'Básica',
 'Ordem de Selimon',
 $t$Você entoa uma oração de paz, e todos os aliados dentro da área sentem a serenidade de Selimon aliviar o cansaço e o medo. Se qualquer um dos alvos atacar ou evocar magia durante a evocação, o efeito se desfaz para todos.$t$,
 'Restaura 4 de energia heroica.', 'Restaura 7 de energia heroica.',
 'Restaura 10 de energia heroica.', 'Restaura 13 de energia heroica.',
 'Restaura 16 de energia heroica.'),

('sangue_de_batalha', 'Sangue de Batalha', 'Instantânea', 'Pessoal', '5 rodadas', 2, 'Básica',
 'Ordem de Blator',
 $t$Com um brado a Blator, você transforma a dor dos próprios ferimentos em fúria: o sangue que escorre volta a pulsar com força, e seus golpes ficam mais certeiros enquanto durar o efeito. Esta magia só pode ser evocada se você já tiver sofrido dano na energia física neste combate.$t$,
 'Restaura 8 de energia física e aumenta 1 coluna de ataque.',
 'Restaura 12 de energia física e aumenta 1 coluna de ataque.',
 'Restaura 16 de energia física e aumenta 2 colunas de ataque.',
 'Restaura 20 de energia física e aumenta 2 colunas de ataque.',
 'Restaura 24 de energia física e aumenta 3 colunas de ataque.'),

('descanso_de_cruine', 'Descanso de Cruine', '1 rodada', 'Toque', 'Instantânea', 1, 'Básica',
 'Ordem de Cruine',
 $t$Você concede ao alvo um instante do descanso que Cruine reserva aos mortos, e seu espírito retorna revigorado. Esta magia possui o efeito inverso em mortos-vivos, ferindo a energia que os mantém de pé.$t$,
 'Restaura 8 de energia heroica.', 'Restaura 14 de energia heroica.',
 'Restaura 20 de energia heroica.', 'Restaura 26 de energia heroica.',
 'Restaura 32 de energia heroica.'),

('justa_reparacao', 'Justa Reparação', '2 rodadas', 'Toque', '5 rodadas', 2, 'Básica',
 'Ordem de Crizagom',
 $t$Através desta magia, você repara os ferimentos de quem foi atingido injustamente e fortalece sua guarda contra o próximo golpe. Se o alvo tiver começado a luta por um motivo injusto, a magia falha e você será punido por Crizagom.$t$,
 'Restaura 4 de energia física e aumenta 2 de defesa.',
 'Restaura 8 de energia física e aumenta 3 de defesa.',
 'Restaura 12 de energia física e aumenta 4 de defesa.',
 'Restaura 16 de energia física e aumenta 5 de defesa.',
 'Restaura 20 de energia física e aumenta 6 de defesa.'),

('bencao_da_terra', 'Bênção da Terra', '2 rodadas', 'Toque', '3 rodadas', 2, 'Básica',
 'Ordem de Sevides',
 $t$Você pede a Sevides que o solo sustente o alvo: seus ferimentos se fecham e sua pele ganha a firmeza da rocha contra ataques de terra. O alvo precisa estar com os pés em contato com o chão durante a evocação.$t$,
 'Restaura 6 de energia física e reduz 4 de dano elemental de terra.',
 'Restaura 10 de energia física e reduz 7 de dano elemental de terra.',
 'Restaura 14 de energia física e reduz 10 de dano elemental de terra.',
 'Restaura 18 de energia física e reduz 13 de dano elemental de terra.',
 'Restaura 22 de energia física e reduz 16 de dano elemental de terra.'),

('chama_vital', 'Chama Vital', '2 rodadas', 'Toque', '3 rodadas', 2, 'Básica',
 'Ordem de Crezir',
 $t$Você acende no peito do alvo uma chama que cauteriza as feridas e o torna resistente ao fogo, como os dragões vermelhos de Crezir. A cauterização é dolorosa e deixa marcas de queimadura leves, que desaparecem em alguns dias.$t$,
 'Restaura 6 de energia física e reduz 4 de dano elemental de fogo.',
 'Restaura 10 de energia física e reduz 7 de dano elemental de fogo.',
 'Restaura 14 de energia física e reduz 10 de dano elemental de fogo.',
 'Restaura 18 de energia física e reduz 13 de dano elemental de fogo.',
 'Restaura 22 de energia física e reduz 16 de dano elemental de fogo.'),

('mente_serena', 'Mente Serena', '1 rodada', 'Toque', 'Instantânea', 1, 'Básica',
 'Ordem de Palier',
 $t$Com um toque na fronte do alvo, você afasta a confusão e o medo de sua mente, e a clareza de Palier lhe devolve a vontade de seguir em frente. Seres irracionais não podem ser afetados por esse encanto.$t$,
 'Restaura 6 de energia heroica.', 'Restaura 10 de energia heroica.',
 'Restaura 15 de energia heroica.', 'Restaura 19 de energia heroica.',
 'Restaura 24 de energia heroica.'),

('tempera_da_carne', 'Têmpera da Carne', '3 rodadas', 'Toque', '10 rodadas', 2, 'Básica',
 'Ordem de Parom',
 $t$Assim como o ferreiro tempera o aço, você martela os ferimentos do alvo com golpes de karma, fechando-os e endurecendo a carne. A evocação exige que o alvo permaneça imóvel.$t$,
 'Restaura 6 de energia física e aumenta 1 de defesa.',
 'Restaura 10 de energia física e aumenta 1 de defesa.',
 'Restaura 14 de energia física e aumenta 2 de defesa.',
 'Restaura 18 de energia física e aumenta 2 de defesa.',
 'Restaura 22 de energia física e aumenta 3 de defesa.'),

('alivio_dourado', 'Alívio Dourado', '2 rodadas', '10 metros', 'Instantânea', 2, 'Básica',
 'Ordem de Cambu',
 $t$Você espalha no ar uma poeira dourada que acalma os ânimos de todos os aliados dentro da área, aliviando o cansaço de quem negocia, viaja ou luta. A poeira pode ser vista por qualquer um, e costuma interromper discussões.$t$,
 'Restaura 3 de energia heroica.', 'Restaura 5 de energia heroica.',
 'Restaura 7 de energia heroica.', 'Restaura 10 de energia heroica.',
 'Restaura 12 de energia heroica.'),

('pressagio_curativo', 'Presságio Curativo', 'Instantânea', 'Toque', 'Instantânea', 1, 'Básica',
 'Ordem de Plandis',
 $t$Plandis mostra a você o golpe antes que ele aconteça, e a cura já está a caminho quando a ferida se abre. É a cura mais rápida entre as ordens, e também a mais modesta: serve para manter o alvo de pé, não para salvá-lo.$t$,
 'Restaura 4 de energia física.', 'Restaura 8 de energia física.',
 'Restaura 12 de energia física.', 'Restaura 16 de energia física.',
 'Restaura 20 de energia física.'),

/* ── 2.5 Elementos: as proteções que faltavam ────────────────── */
('egide_celestial', 'Égide Celestial', 'Instantânea', 'Toque', '3 rodadas', 1, 'Básica',
 'Colégio Necromântico',
 $t$Com esta magia, você envolve o alvo em um véu de sombra profana que desvia a luz dos seres celestiais. A proteção só será desfeita através da magia Quebra de Encantos ou se o dano recebido for maior do que a proteção, em um único golpe.$t$,
 'Reduz 8 de dano elemental celestial.', 'Reduz 12 de dano elemental celestial.',
 'Reduz 16 de dano elemental celestial.', 'Reduz 20 de dano elemental celestial.',
 'Reduz 24 de dano elemental celestial.'),

('selo_abismal', 'Selo Abismal', 'Instantânea', 'Toque', '3 rodadas', 1, 'Básica',
 'Ordem de Cruine',
 $t$Você desenha com cinzas um selo sagrado sobre o alvo, e o fogo do Abismo não o atravessa. O selo brilha na presença de demônios e se apaga quando a duração termina. A proteção só será desfeita através da magia Quebra de Encantos ou se o dano recebido for maior do que a proteção, em um único golpe.$t$,
 'Reduz 8 de dano infernal.', 'Reduz 12 de dano infernal.', 'Reduz 16 de dano infernal.',
 'Reduz 20 de dano infernal.', 'Reduz 24 de dano infernal.'),

/* ── Estudo 2.1: as finais que não existiam ───────────────────── */
('dom_das_linguas', 'Dom das Línguas', '1 rodada', 'Pessoal', '1 hora', 2, 'Básica',
 'Bardo, Ordem de Cambu, Trilha de Exploradores',
 $t$Com esta magia, você compreende e se expressa em idiomas e escritas que não conhece, em níveis muito superiores a qualquer habilidade natural, e apenas com a ponta dos dedos é capaz de ler o conteúdo de uma carta ou livro. A magia não ensina o idioma: ao término do efeito, todo o conhecimento desaparece.$t$,
 'Reduza 1 nível de dificuldade da habilidade Idioma e Alfabetização.',
 'Reduza 2 níveis de dificuldade da habilidade Idioma e Alfabetização.',
 'Reduza 3 níveis de dificuldade da habilidade Idioma e Alfabetização.', NULL, NULL),

('sombra', 'Sombra', 'Instantânea', 'Pessoal', '1 hora', 1, 'Básica',
 'Rastreador, Confraria de Arautos',
 $t$Com esta magia, você se confunde com o ambiente e com a multidão: nas matas, sua silhueta se mistura às folhas; nas cidades, você se torna tão comum que ninguém o nota. Para funcionar entre pessoas, você deve estar dentro dos padrões de normalidade do lugar — roupas suntuosas ou uma arma à mostra chamam a atenção de qualquer forma. O efeito vale para as habilidades do grupo Subterfúgio (Furtividade, Escapar, etc.).$t$,
 'Reduza 1 nível de dificuldade de habilidades do grupo Subterfúgio.',
 'Reduza 2 níveis de dificuldade de habilidades do grupo Subterfúgio.',
 'Reduza 3 níveis de dificuldade de habilidades do grupo Subterfúgio.', NULL, NULL),

('graca_felina', 'Graça Felina', 'Instantânea', 'Pessoal', 'Instantânea', 1, 'Básica',
 'Rastreador, Confraria de Artistas',
 $t$Com esta magia, seus movimentos ganham a leveza e a precisão de um gato: você se equilibra em cordas, escala paredes, nada contra a correnteza e faz malabarismos com facilidade. O efeito vale para um único teste de habilidade do grupo Manobra (Equilibrar, Nadar, Escalar, Prestidigitação, etc.), e a magia e a habilidade devem ser usadas juntas. Esta magia não se aplica a deslocamento montado.$t$,
 'Reduza 1 nível de dificuldade de habilidades do grupo Manobra.',
 'Reduza 2 níveis de dificuldade de habilidades do grupo Manobra.',
 'Reduza 3 níveis de dificuldade de habilidades do grupo Manobra.', NULL, NULL);

-- ============================================================
-- 2) MAGIAS QUE FICAM, COM TEXTO OU PERMISSÃO NOVOS
-- ============================================================

/* ── Sugestões 3.1: o elemento que o nome já dizia ───────────── */
UPDATE public.magias SET
  nivel_1 = 'Causa 28 de dano elemental de ar.', nivel_3 = 'Causa 32 de dano elemental de ar.',
  nivel_5 = 'Causa 36 de dano elemental de ar.', nivel_7 = 'Causa 40 de dano elemental de ar.',
  nivel_9 = 'Causa 44 de dano elemental de ar.'
WHERE key = 'relampago';

UPDATE public.magias SET
  nivel_1 = 'Cada raio causa 12 de dano elemental de ar.', nivel_3 = 'Cada raio causa 16 de dano elemental de ar.',
  nivel_5 = 'Cada raio causa 20 de dano elemental de ar.', nivel_7 = 'Cada raio causa 24 de dano elemental de ar.',
  nivel_9 = 'Cada raio causa 28 de dano elemental de ar.'
WHERE key = 'raio_eletrico';

UPDATE public.magias SET
  nivel_1 = 'Causa 12 de dano infernal.', nivel_3 = 'Causa 16 de dano infernal.',
  nivel_5 = 'Causa 20 de dano infernal.', nivel_7 = 'Causa 24 de dano infernal.',
  nivel_9 = 'Causa 28 de dano infernal.'
WHERE key IN ('toque_gelido', 'putrefacao');

UPDATE public.magias SET
  nivel_1 = 'Causa 28 de dano elemental celestial.', nivel_3 = 'Causa 32 de dano elemental celestial.',
  nivel_5 = 'Causa 36 de dano elemental celestial.', nivel_7 = 'Causa 40 de dano elemental celestial.',
  nivel_9 = 'Causa 44 de dano elemental celestial.'
WHERE key = 'fogo_divino';

UPDATE public.magias SET
  nivel_1 = 'Causa 32 de dano elemental de fogo.', nivel_3 = 'Causa 36 de dano elemental de fogo.',
  nivel_5 = 'Causa 40 de dano elemental de fogo.', nivel_7 = 'Causa 44 de dano elemental de fogo.',
  nivel_9 = 'Causa 48 de dano elemental de fogo.'
WHERE key = 'feixes_incandescentes';

/* ── Sugestões 3.2 e 3.3: proteções e permissões ──────────────── */
UPDATE public.magias SET tipo = 'Básica', permissao = 'Sacerdote, Colégio Elemental'
WHERE key = 'hidroprotecao';
UPDATE public.magias SET permissao = 'Rastreador, Colégio Elemental' WHERE key = 'aeroprotecao';
UPDATE public.magias SET permissao = 'Colégio Ilusionista' WHERE key = 'covardia';

/* ── Sugestões 3.4: Apontar Sufocante legível para o motor ────── */
UPDATE public.magias SET
  nivel_1 = 'A magia tem duração de 1 rodada. Reduza 1 de energia física por rodada.',
  nivel_3 = 'A magia tem duração de 3 rodadas. Reduza 1 de energia física por rodada.',
  nivel_5 = 'A magia tem duração de 5 rodadas. Reduza 1 de energia física por rodada.',
  nivel_7 = 'A magia tem duração de 7 rodadas. Reduza 1 de energia física por rodada.',
  nivel_9 = 'A magia tem duração de 9 rodadas. Reduza 1 de energia física por rodada.'
WHERE key = 'apontar_sufocante';

/* ── Sugestões 3.5: a chave com erro de grafia ────────────────── */
UPDATE public.magias SET key = 'recuperacao_fisica', nome = 'Recuperação Física', tipo = 'Básica'
WHERE key = 'recuperecao_fisica';
UPDATE public.magias SET descricao = replace(replace(descricao,
  'Cures Físicas, Recupereção Física', 'Curas Físicas, Recuperação Física'),
  'Recupereção Física', 'Recuperação Física')
WHERE descricao LIKE '%Recupereção Física%';

/* ── Estudo 2.1: as finais que já existiam ────────────────────── */
UPDATE public.magias SET
  evocacao = 'Instantânea', alcance = 'Pessoal', duracao = 'Instantânea', custo = 1,
  permissao = 'Bardo, Mago, Ordem de Blator, Ordem de Cambu, Ordem de Crezir, Ordem de Crizagom, Ordem de Lena, Ordem de Parom, Ordem de Plandis',
  descricao = $t$Com esta magia, você se torna mais convincente, simpático e perspicaz aos olhos de quem estiver lidando com você: lê as intenções do interlocutor, avalia o valor do que se negocia, inspira os seus e desperta afeto. O efeito vale para um único teste de habilidade do grupo Influência (Empatia, Negociar, Liderar, Persuadir, etc.), e a magia e a habilidade devem ser usadas juntas. O alvo da influência nunca agirá contra seu padrão de conduta e, ao fim da conversa, poderá suspeitar de algo com um teste de Empatia, cuja dificuldade é definida pelo Mestre do Jogo conforme o quanto seu comportamento foi incomum.$t$,
  nivel_1 = 'Reduza 1 nível de dificuldade de habilidades do grupo Influência.',
  nivel_3 = 'Reduza 2 níveis de dificuldade de habilidades do grupo Influência.',
  nivel_5 = 'Reduza 3 níveis de dificuldade de habilidades do grupo Influência.',
  nivel_7 = NULL, nivel_9 = NULL
WHERE key = 'amizade';

UPDATE public.magias SET
  permissao = 'Rastreador, Ordem de Cambu, Ordem de Cruine, Ordem de Palier, Ordem de Sevides',
  descricao = $t$Com essa magia, você expande temporariamente seus sentidos e seu conhecimento do mundo através do karma concentrado em seu corpo: fareja como um lobo, lê rastros apagados, orienta-se pelas estrelas, pressente o perigo e acalma animais. O efeito vale para as habilidades do grupo Geral (Rastrear, Sentidos, Navegar, Sensitividade, Adestrar, Sobrevivência, etc.).$t$
WHERE key = 'conhecimento_natural';

UPDATE public.magias SET
  permissao = 'Confraria de Eruditos, Ordem de Parom',
  descricao = $t$Com essa magia, você é capaz de expandir temporariamente seu conhecimento profissional através do karma concentrado em seu corpo. O efeito vale para as habilidades do grupo Profissional, inclusive a forja: criação, conserto e montagem de equipamentos metálicos (Metalurgia).$t$
WHERE key = 'conhecimento';

/* ── Estudo 2.2: controle e debuff ────────────────────────────── */
UPDATE public.magias SET
  permissao = 'Bardo',
  descricao = $t$Com esta magia, você consegue produzir um som intenso que tira a concentração daquele que o ouve, recebendo penalidades em qualquer ação que tome. Todas as pessoas que estiverem na área de efeito deverão passar em um teste de resistência física contra o nível usado, ou receberão as penalidades descritas e não poderão usar magias que não sejam de evocação instantânea. Nos níveis mais altos, a frequência é tão aguda que desnorteia também os passos de quem a ouve. Você deverá continuar produzindo o ruído durante toda a evocação, e não poderá fazer qualquer outra ação enquanto estiver usando a magia, podendo, no máximo, andar. Criaturas com audição super apurada recebem penalidades dobradas.$t$,
  nivel_1 = 'Reduz 1 coluna de ataque.', nivel_3 = 'Reduz 3 colunas de ataque.',
  nivel_5 = 'Reduz 5 colunas de ataque.',
  nivel_7 = 'Reduz 7 colunas de ataque e 8 de velocidade.',
  nivel_9 = 'Reduz 9 colunas de ataque e 12 de velocidade.'
WHERE key = 'ruido';

UPDATE public.magias SET
  descricao = $t$Esta magia é usada normalmente para punições exemplares. Você canaliza energia infernal para dentro do corpo do alvo, que apodrece a carne por dentro e faz com que suas ações se tornem intermitentes (a cada 2 ações, 1 é neutralizada), caso ele falhe em um teste de resistência mágica.$t$,
  nivel_1 = 'Causa 6 de dano infernal e reduza 1 coluna de ataque.',
  nivel_3 = 'Causa 10 de dano infernal e reduza 1 coluna de ataque.',
  nivel_5 = 'Causa 14 de dano infernal e reduza 2 colunas de ataque.',
  nivel_7 = 'Causa 18 de dano infernal e reduza 2 colunas de ataque.',
  nivel_9 = 'Causa 22 de dano infernal e reduza 3 colunas de ataque.'
WHERE key = 'degeneracao_fisica';

UPDATE public.magias SET
  permissao = 'Bardo, Trilha de Guardiões',
  descricao = $t$Você emite um som ou provoca um movimento no ambiente que chama rapidamente a atenção de todos que não passarem em um teste de resistência mágica, fazendo-os hesitar. Nos níveis mais altos, o próprio terreno se volta contra os alvos: trepadeiras e galhos nas matas, areia movediça nos desertos e lama nas cavernas prendem os pés de todos na área.$t$,
  nivel_1 = 'Reduza 4 de velocidade.', nivel_3 = 'Reduza 8 de velocidade.',
  nivel_5 = 'Reduza 12 de velocidade.',
  nivel_7 = 'Reduza 20 de velocidade de todos na área.',
  nivel_9 = 'Reduza 28 de velocidade de todos na área.'
WHERE key = 'distracao';

/* ── Estudo 2.6: utilidade ────────────────────────────────────── */
UPDATE public.magias SET
  tipo = 'Básica', custo = 1, evocacao = 'Instantânea', alcance = 'Toque', duracao = 'Variável',
  permissao = 'Mago, Ordem de Ganis',
  descricao = $t$Esta magia modifica as vias nasais e os pulmões do alvo. Nos níveis mais baixos, ele consegue respirar debaixo d'água; nos mais altos, respira em qualquer ambiente, inclusive fumaça, gás venenoso ou ar rarefeito. O alvo pode fazer um teste de resistência mágica, se quiser.$t$,
  nivel_1 = $t$Respira debaixo d'água. A magia tem duração de 30 minutos.$t$,
  nivel_3 = $t$Respira debaixo d'água. A magia tem duração de 6 horas.$t$,
  nivel_5 = $t$Respira debaixo d'água. A magia tem duração de 1 dia.$t$,
  nivel_7 = 'Respira em qualquer ambiente. A magia tem duração de 6 horas.',
  nivel_9 = 'Respira em qualquer ambiente. A magia tem duração de 1 semana.'
WHERE key = 'respiracao_arcana';

UPDATE public.magias SET
  descricao = $t$Você adquire a capacidade de adaptar a sua visão para enxergar melhor no escuro ou mais longe, desde que a magia seja evocada em um ambiente natural. Na visão noturna, você passa a ver em escalas de cinza. Nos níveis mais altos, você também enxerga o calor que os seres emitem, em diferentes tonalidades, e com isso vê até os seres invisíveis.
Escuridão Parcial: Equivalente a uma noite sem lua.
Escuridão Total: Equivalente a um ambiente fechado.
Escuridão Mágica: Ausência total de luz.$t$,
  nivel_7 = 'Permite enxergar na escuridão mágica e ver o calor dos seres, inclusive dos invisíveis.',
  nivel_9 = 'Permite enxergar na escuridão mágica e ver o calor dos seres, inclusive dos invisíveis, mesmo através de fumaça ou névoa.'
WHERE key = 'visao_animal';

UPDATE public.magias SET
  descricao = $t$Você identifica magias em locais, objetos e criaturas, além de seus poderes e sua natureza: arcana, celestial ou infernal. Alvos com aura podem fazer um teste de resistência mágica. Um objeto pode ser analisado com calma: cada evocação revela uma propriedade mágica, começando pelas de menor nível, e, se a propriedade estiver além do nível da magia, você saberá qual nível é necessário para revelá-la.$t$
WHERE key = 'deteccao_de_magia';

UPDATE public.magias SET
  permissao = 'Ordem de Ganis, Ordem de Maira, Colégio Naturalista, Trilha de Exploradores, Trilha de Guardiões',
  descricao = $t$Com esta magia, você projeta seus sentidos através da natureza ao seu redor e percebe os eventos de uma área natural como se estivesse em cada planta. É preciso manter a concentração durante todo o efeito; se você for atingido na energia física, a magia se encerra. Os sentidos não atravessam áreas sem vegetação, obstáculos como muros e rios, ou barreiras mágicas. As informações obtidas dependem de um teste de Sentidos, com a dificuldade à critério do Mestre do Jogo. Este encanto só pode ser usado em ambientes naturais.$t$,
  nivel_1 = 'Você consegue ouvir e cheirar através da vegetação, a até 50 metros.',
  nivel_3 = 'Você consegue ouvir, cheirar e tatear através da vegetação, a até 250 metros.',
  nivel_5 = 'Você consegue ouvir e enxergar através da vegetação, a até 500 metros.',
  nivel_7 = 'Você percebe com todos os sentidos através da vegetação, a até 1 quilômetro.',
  nivel_9 = 'Você percebe com todos os sentidos através da vegetação, a até 5 quilômetros.'
WHERE key = 'comunhao_natural';

UPDATE public.magias SET
  permissao = 'Trilha de Caçadores, Ordem de Crezir',
  nivel_1 = 'Durante um dia, você será guiado até o alvo que esteja até 1 km de distância.',
  nivel_3 = 'Durante três dias, você será guiado até o alvo que esteja até 10 km de distância.',
  nivel_5 = 'Durante cinco dias, você será guiado até o alvo que esteja até 50 km de distância.',
  nivel_7 = 'Durante sete dias, você será guiado até o alvo que esteja até 250 km de distância.',
  nivel_9 = 'Durante nove dias, você será guiado até o alvo que esteja até 500 km de distância.'
WHERE key = 'cacada_marcada';

UPDATE public.magias SET
  permissao = 'Mago, Ordem de Maira',
  descricao = $t$Esta magia permite que você se transforme em diferentes criaturas. A mutação não altera sua energia heroica nem sua energia física e, dependendo da forma, impede que você evoque novas magias. Nos níveis mais baixos, ela muda apenas a sua aparência; nos mais altos, você assume a forma de animais e criaturas que já tenha visto, mantendo apenas o seu atributo intelecto. Ao assumir uma forma humanoide, você não adquire as habilidades pessoais dela, mas pode usar todos os recursos não mágicos da nova forma. Após a transformação, a forma escolhida não pode ser trocada.$t$,
  nivel_5 = 'Você toma a forma de qualquer pessoa que já tenha visto. Os itens não se transformam com você.',
  nivel_7 = 'Você toma a forma de qualquer criatura de até nível 14 que já tenha visto. Seus pertences, exceto os objetos com aura, se transformam com você.',
  nivel_9 = 'Você toma a forma de qualquer criatura de até nível 20 que já tenha visto. Seus pertences, exceto os objetos com aura, se transformam com você.'
WHERE key = 'mutacao';

-- ============================================================
-- 3) FUSÕES: quem aponta para a antiga passa a apontar para a final
-- ============================================================
CREATE TEMP TABLE _fusao(
  antiga text PRIMARY KEY, nova text NOT NULL,
  nome_antigo text NOT NULL, nome_novo text NOT NULL
) ON COMMIT DROP;
INSERT INTO _fusao VALUES
  ('empatia',                  'amizade',              'Empatia',                  'Amizade'),
  ('detectar_intencao',        'amizade',              'Detectar Intenção',        'Amizade'),
  ('seducao',                  'amizade',              'Sedução',                  'Amizade'),
  ('avaliacao',                'amizade',              'Avaliação',                'Amizade'),
  ('convocacao',               'amizade',              'Convocação',               'Amizade'),
  ('faro',                     'conhecimento_natural', 'Faro',                     'Conhecimento Natural'),
  ('rastreamento',             'conhecimento_natural', 'Rastreamento',             'Conhecimento Natural'),
  ('orientacao',               'conhecimento_natural', 'Orientação',               'Conhecimento Natural'),
  ('sexto_sentido',            'conhecimento_natural', 'Sexto Sentido',            'Conhecimento Natural'),
  ('dominacao_animal',         'conhecimento_natural', 'Dominação Animal',         'Conhecimento Natural'),
  ('mestre_da_forja',          'conhecimento',         'Mestre da Forja',          'Conhecimento'),
  ('linguagem',                'dom_das_linguas',      'Linguagem',                'Dom das Línguas'),
  ('conhecimento_linguistico', 'dom_das_linguas',      'Conhecimento Linguístico', 'Dom das Línguas'),
  ('escrita',                  'dom_das_linguas',      'Escrita',                  'Dom das Línguas'),
  ('camuflagem',               'sombra',               'Camuflagem',               'Sombra'),
  ('ausencia',                 'sombra',               'Ausência',                 'Sombra'),
  ('deslocamento_natural',     'graca_felina',         'Deslocamento Natural',     'Graça Felina'),
  ('malabarismo',              'graca_felina',         'Malabarismo',              'Graça Felina'),
  ('aprimorar_habilidades',    'graca_felina',         'Aprimorar Habilidades',    'Graça Felina'),
  ('ruido_extenuante',         'ruido',                'Ruído Extenuante',         'Ruído'),
  ('regiao_inviolavel',        'distracao',            'Região Inviolável',        'Distração'),
  ('hidrotolerancia',          'respiracao_arcana',    'Hidrotolerância',          'Respiração Arcana'),
  ('visao_termica',            'visao_animal',         'Visão Térmica',            'Visão Animal'),
  ('analise',                  'deteccao_de_magia',    'Análise',                  'Detecção de Magia'),
  ('sentido_natural',          'comunhao_natural',     'Sentido Natural',          'Comunhão Natural'),
  ('marca_da_morte',           'cacada_marcada',       'Marca da Morte',           'Caçada Marcada'),
  ('transformacao_animal',     'mutacao',              'Transformação Animal',     'Mutação');

-- Guarda: toda antiga existe, toda final existe (as novas já foram inseridas).
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM _fusao f LEFT JOIN public.magias m ON m.key = f.antiga WHERE m.key IS NULL;
  IF n > 0 THEN RAISE EXCEPTION '% magia(s) a fundir não existem', n; END IF;
  SELECT count(*) INTO n FROM _fusao f LEFT JOIN public.magias m ON m.key = f.nova WHERE m.key IS NULL;
  IF n > 0 THEN RAISE EXCEPTION '% magia(s) final(is) não existem', n; END IF;
END $$;

-- personagens.magias: a antiga vira a final; se o PJ tinha as duas, fica o
-- MAIOR passo (nunca soma: passos não são pontos).
UPDATE public.personagens p
   SET magias = (
     SELECT jsonb_object_agg(k, to_jsonb(passos))
     FROM (
       SELECT coalesce(f.nova, e.key) AS k, max((e.value #>> '{}')::int) AS passos
       FROM jsonb_each(p.magias) AS e(key, value)
       LEFT JOIN _fusao f ON f.antiga = e.key
       GROUP BY 1
     ) s
   )
 WHERE EXISTS (
   SELECT 1 FROM jsonb_each(p.magias) AS e(key, value)
   JOIN _fusao f ON f.antiga = e.key
 );

-- criaturas.magia: texto com nomes separados por vírgula.
UPDATE public.criaturas c
   SET magia = (
     SELECT string_agg(nome, ', ' ORDER BY ord)
     FROM (
       SELECT DISTINCT ON (coalesce(f.nome_novo, trim(t))) coalesce(f.nome_novo, trim(t)) AS nome, ord
       FROM unnest(string_to_array(c.magia, ',')) WITH ORDINALITY AS u(t, ord)
       LEFT JOIN _fusao f ON f.nome_antigo = trim(u.t)
       ORDER BY coalesce(f.nome_novo, trim(t)), ord
     ) s
   )
 WHERE EXISTS (
   SELECT 1 FROM unnest(string_to_array(c.magia, ',')) AS u(t)
   JOIN _fusao f ON f.nome_antigo = trim(u.t)
 );

-- itens.magia e itens_historia.magia: um nome só.
UPDATE public.itens i SET magia = f.nome_novo FROM _fusao f WHERE i.magia = f.nome_antigo;
UPDATE public.itens_historia i SET magia = f.nome_novo FROM _fusao f WHERE i.magia = f.nome_antigo;

-- ============================================================
-- 4) SAEM DO CATÁLOGO
-- ============================================================
DELETE FROM public.magias m USING _fusao f WHERE m.key = f.antiga;
-- Estudo 2.6: Teriantropia é só excluída (ninguém a conhece, nada a cita).
DELETE FROM public.magias WHERE key = 'teriantropia';

-- Guarda final: 235 magias, e nenhuma referência órfã.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.magias;
  IF n <> 235 THEN RAISE EXCEPTION 'Esperava 235 magias, há %', n; END IF;
  SELECT count(*) INTO n FROM public.personagens p
    CROSS JOIN LATERAL jsonb_each(coalesce(p.magias, '{}'::jsonb)) e(key, value)
    LEFT JOIN public.magias m ON m.key = e.key WHERE m.key IS NULL;
  IF n > 0 THEN RAISE EXCEPTION '% magia(s) de personagem sem catálogo', n; END IF;
  SELECT count(*) INTO n FROM public.itens i LEFT JOIN public.magias m ON m.nome = i.magia
    WHERE coalesce(i.magia, '') <> '' AND m.key IS NULL;
  IF n > 0 THEN RAISE EXCEPTION '% item(ns) com magia sem catálogo', n; END IF;
END $$;

COMMIT;

-- CONFERÊNCIA (depois):
--   SELECT count(*) FROM public.magias;                         -- 235
--   SELECT nome, magia FROM public.criaturas
--    WHERE magia ~ '(Camuflagem|Deslocamento Natural|Ruído Extenuante)';  -- zero
--
-- REVERTER: os quatro backups em backup.*_20260912 têm o estado anterior.
