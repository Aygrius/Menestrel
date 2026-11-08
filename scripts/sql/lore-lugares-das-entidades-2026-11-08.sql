-- 08/11/2026 — Os lugares citados pelas Entidades que faltavam no catálogo do mundo.
--
-- Usuário: "Crie as cidades que são citadas." Cada lugar entra no tipo que
-- os livros (tagmar/deuses.pdf, tagmar/principes.pdf) lhe dão:
--   • Lar — REINO: "o berço dos elfos e a morada na terra de Palier".
--   • Levânia — REINO, criado para Sadom ter a que pertencer (cidade exige reino).
--   • Sadom — CIDADE da Levânia ("as antigas arenas da cidade de Sadom").
--   • Rapso, Terras Selvagens, Cidades-Estado — LOCAIS: o livro não diz a que
--     reino pertencem (Rapso) ou são regiões, não cidades.
-- Texto só com o que os livros afirmam (skill cronista-de-tagmar). Idempotente:
-- ON CONFLICT (slug) DO NOTHING — não sobrescreve quem já editou.

BEGIN;

INSERT INTO public.reinos (slug, nome, resumo, descricao, rumores, compartilhado) VALUES
('lar', 'Lar',
 'O berço dos elfos e a morada de Palier na terra, coberto de florestas milenares.',
 'Lar é tido como o berço dos elfos e a morada de Palier na terra. Para a ordem do deus da magia, é o primeiro dos três lugares sagrados, à frente da Ponte de Palier, em Âmiem.' || E'\n' ||
 'Suas florestas milenares, como as de Âmiem, são contadas entre as obras-primas de Maira, e por isso a ordem da deusa também as tem por sagradas.' || E'\n' ||
 'Os laços com os elfos de Âmiem são antigos. Pela trilha real, as comitivas de Lar levam mensagens e presentes para reafirmar uma amizade que o tempo foi deixando de lado.',
 NULL, false),
('levania', 'Levânia',
 'Reino belicoso de desertos e arenas, devoto de Blator, que viveu sob a dominação da Seita.',
 'A Levânia é conhecida pela devoção a Blator, e está entre os reinos de espírito guerreiro onde a fé de Crezir mais cresce. O comércio também lhe é caro: ali, como em Plana, a adoração a Cambu é das mais evidentes.' || E'\n' ||
 'Seu deserto é terra de cultos cruéis, e nas fronteiras com Abadom estão os maiores cultos a Plandis.' || E'\n' ||
 'O reino viveu sob a dominação da Seita. Quando ela terminou, as arenas de Sadom, palco de combates nos tempos da magia Bankdi, foram arrasadas ou soterradas sob construções novas.',
 'Dizem que nem todas as arenas de Sadom foram destruídas: algumas seguem debaixo da terra, esquecidas pelos mais novos e frequentadas pelos devotos de Mocna.',
 false)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.cidades (slug, nome, reino, capital, descricao, rumores, compartilhado) VALUES
('sadom', 'Sadom', 'levania', false,
 'Cidade da Levânia, conhecida pelas antigas arenas. Nos tempos da dominação Bankdi, a população assistia ali a combates selvagens, presa à magia dos dominadores; a maior de todas era a Arena de Haalbam.' || E'\n' ||
 'Com o fim da dominação da Seita na Levânia, a maior parte das arenas foi destruída. Outras ficaram sob construções erguidas depois, e muitas hoje são lugares subterrâneos, escondidos do povo.',
 'Os devotos de Mocna têm as arenas de Sadom por lugares sagrados e ainda se reúnem nas que restaram debaixo da terra.',
 false)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.locais (slug, nome, reino, descricao, rumores, compartilhado) VALUES
('rapso', 'Rapso', NULL,
 'Rapso celebra o Festival de Renascimento de Maira como as grandes cidades que vivem da madeira das florestas próximas: três dias plantando mudas na mata desmatada e, a cada anoitecer, festa com música, frutas, vinho e cerveja doados pelos nobres.',
 'Conta-se que, numa das noites do festival, um sátiro, espírito da natureza criado por Maira, apareceu para celebrar junto com os fiéis, que tomaram a visita como sinal de que a deusa aprovava a festa.',
 false),
('terras-selvagens', 'Terras Selvagens', NULL,
 'Região distante e indomada, para além da qual os bandos orcos se espalham. Nela ficam Os Mangues, alagados de ruínas antigas, muitas submersas, e de mortos que não descansam.' || E'\n' ||
 'Nas terras vizinhas é proibido dizer em voz alta o nome de Mocna, e o povo jura que as criaturas da região foram soltas do Inferno pelo próprio príncipe. Nos Mangues fica o templo de Vouxiz que muitos têm pelo mais sagrado: dezoito estrelas erguidas, cada uma mais alta que três homens, em volta de uma mesa de pedra com uma pequena caixa ao centro.',
 'Os sacerdotes de Cruine em Telas rezam pelos zumbis d''Os Mangues, que crescem a cada ano.',
 false),
('cidades-estado', 'Cidades-Estado', NULL,
 'Terras de cidades que governam a si mesmas, rachadas pelo calor do sol. Ali, como em Verrogar, há muitos escravos.' || E'\n' ||
 'É também um dos lugares onde os cultos demoníacos se mostram mais cruéis, e onde os templos de Heldrom mais se concentram.',
 'Muitos escravos das Cidades-Estado fazem pacto com Seinoniz na esperança de liberdade. O que conseguem é trocar o senhor mortal por um muito pior.',
 false)
ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- Conferência:
-- select 'reino', slug, nome from reinos where slug in ('lar','levania')
-- union all select 'cidade', slug, nome from cidades where slug = 'sadom'
-- union all select 'local', slug, nome from locais where slug in ('rapso','terras-selvagens','cidades-estado');
