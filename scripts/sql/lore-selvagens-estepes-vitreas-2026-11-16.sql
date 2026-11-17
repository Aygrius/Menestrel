-- 16/11/2026 — Terras Selvagens, capítulo 3: Estepes Vítreas.
--
-- Usuário: "Depois comece a migrar os dados de 'selvagens'." Fonte:
-- tagmar/selvagens.pdf (págs. 20–44), escrito com a skill cronista-de-tagmar.
-- Cada região das Terras Selvagens entra como um reino (a aba agrupa por
-- reino), com suas cidades, locais e pessoas. As cidades do Império Central
-- são descritas como eram: o livro avisa que, tirando as Torres do Leste e do
-- Norte, ninguém confirmou o que resta delas. Os prédios famosos de cada
-- cidade vão na descrição dela; só o Palácio de Edrom e a Tumba dos Reis,
-- alvos das expedições, viram locais próprios.
-- Aplicar: node scripts/mundo/aplicar-sql-lore.mjs <este arquivo>
-- Idempotente: ON CONFLICT (slug) DO NOTHING.

BEGIN;

INSERT INTO public.reinos (slug, nome, resumo, descricao, governo, cultura, historia_recente, rumores, capital, compartilhado) VALUES
($t$estepes-vitreas$t$, $t$Estepes Vítreas$t$,
$t$A antiga planície do Império Central, transformada em cristal e vidro por uma magia que saiu do controle na noite do Cataclismo.$t$,
$t$Onde hoje se estendem as Estepes Vítreas ficavam as Estepes Centrais, a grande planície no meio do continente, ao sul do Grande Muro. Ali uma aldeia de agricultores, às margens do rio Cristalida, cresceu até se tornar Tindael, "a Joia Central", capital do Império Central. Sob o rei Edrom, justo e sábio, o povo conheceu uma paz e uma fartura que nunca mais teria.
Mais de um século depois, o império caiu. Os reinos do Oeste tomaram Tindael e, por quarenta anos, os conquistadores se revezaram no trono. Desesperados, alguns nobres levaram magos à tumba de Edrom e o trouxeram de volta num ritual de sangue. O que voltou já não era o rei justo: era uma criatura que se alimentava de sangue e fez de sua guarda de elite servos da noite. Libertou as estepes dos invasores e reinou trezentos anos com suas rainhas, entre elas Audrina, Ercí, Marregal, Rebalú e Cedrás, até esvaziar Tindael numa única noite de vinte mil mortes.
Um conselho de reis feiticeiros mandou dois mil homens a Tindael; chegaram trezentos. No salão onde Edrom renascera, o rei feiticeiro lançou a magia dos cristais. A luz transformou em cristal tudo o que tocava, pedra, grama, madeira e carne, e as criaturas da noite morreram sob o sol multiplicado mil vezes. Mas a magia fugiu ao controle e engoliu a planície inteira, até que uma luz vinda do céu a deteve. Foi a mesma noite do Cataclismo.
Hoje nada vive nas estepes. Cada grão de areia é um cristal solto, ora transparente, ora fosco, ora espelho; o que se leva para fora se desfaz em pó e volta a crescer no lugar de onde saiu. As cidades do império continuam lá, paradas no tempo, mas ninguém sabe ao certo onde. Ao norte ergue-se o Muro, a leste a Cadeia Ergoniana e a Floresta Petrificada, ao sul o Mar de Suz, a oeste o Deserto Gélido.$t$,
$t$Não há governo nas estepes. Na faixa de terra intacta junto às montanhas, a vila da Torre do Leste é dirigida pelo prefeito Minalis, que também guarda a biblioteca da torre. Entre os herdeiros de Tindael o líder é sempre o mais sábio, em geral o mais velho; Minalis é a exceção, um homem jovem.$t$,
$t$Os Herdeiros de Tindael são menos de cento e cinquenta humanos, espalhados entre a vila da Torre do Leste e as encostas das montanhas, descendentes dos que viviam nos cantos mais remotos do império. São de porte mediano e pele queimada, vestem roupas leves e curtas de lã de carneiro, e as tranças marcam a entrada na vida adulta; as crianças andam de cabeça raspada até a puberdade. Até os mais pobres usam braceletes e colares, quando não de ouro, de cerâmica pintada.
As mulheres cuidam dos rebanhos, da casa e do fio; os homens aprendem a lutar na juventude e, adultos, plantam, comerciam, fazem cerâmica e vidro. Criam cabras, ovelhas e avestruzes, que lhes servem de comida e de montaria, e as corridas de avestruz são a festa preferida. Lutam de preferência desarmados. Como a madeira sempre faltou, constroem com tijolo de barro e palha, comem quase tudo cru ou fermentado, e o forno da casa é também latrina: queima esterco. Nos fornos grandes da comunidade assam pão de ervas, fazem vidro e tomam chá juntos.
Falam em casa a rina, língua de raízes misturadas, e com os de fora o malês do sul, a língua dos anões e a dos elfos. Música e dança, só nos ritos. Ainda veneram o rei Edrom, embora Cambu, Palier, Blator, Parom e Sevides tenham chegado do norte e do leste, e olham a magia arcana com desconfiança. Os mortos são embalsamados e descem às catacumbas com seus pertences, como se o rei pudesse um dia chamá-los de volta.$t$,
$t$As estepes atraem caçadores de fortuna de todo o Mundo Conhecido, mas nenhuma rota atravessa o cristal, e ninguém conhece o caminho das Torres Cardeais até Tindael. Chega-se à borda por três rotas: de Anfis, em Lar, guardada pelos elfos e a mais segura; da Torre do Leste a Blur, pelas montanhas, onde o ar rarefeito derruba viajantes nos desfiladeiros; e de Uno, nos Mangues, pela Floresta Petrificada, a mais nova e a menos usada.
Lá dentro, o calor do dia passa dos quarenta graus e a noite desce a quase zero. O vento ergue os cristais em tempestades que cortam como navalhas; os reflexos fazem das estepes um labirinto, cegam quem insiste em olhar e enchem o horizonte de lagos e castelos que não existem. Nos sopés, os adoradores de Edrom mantêm um santuário em cada aldeia e não gostam de forasteiros.$t$,
$t$À noite, os espíritos dos que morreram pelas criaturas de Edrom andam pelas estepes como se ainda vivessem; há cavaleiros do Oeste que continuam procurando o inimigo. Quem fita um cristal pode ver uma alma se aproximar no reflexo: ela quer puxar o viajante para dentro e ficar com o corpo. Dizem que só se recupera a vítima levando o corpo de volta às estepes para uma esconjuração, antes que se passe um ano.
O vento nos cristais soa como vozes pedindo socorro numa língua esquecida, e há quem enlouqueça só de ouvir. A magia ali é instável: necromancia e ilusão ganham força, ninguém consegue se teletransportar, e luz conjurada cega na hora.
Estudiosos de Lar acharam nas ruínas de Aarom um pergaminho do Segundo Ciclo que falaria de outros castelos de Edrom, espalhados pelo antigo reino, alguns talvez intactos. Uma lenda anã diz que Edrom achou um portal para os planos inferiores, trancado por um encanto antigo, e que o fim de Tindael salvou Tagmar; os necromantes adoram recitá-la.
Viajantes viram magos tentando arrancar grandes pedaços de cristal para fora das estepes. Os elfos de Lar temem que espalhem a maldição; os anões acusam as próprias vigílias élficas de serem fachada para isso, e um choque armado parece próximo. Figuras encapuzadas rondam a borda à noite, e há quem diga que querem trazer Edrom de volta.
Corre que o Oeste junta tropas que se estendem por léguas, à espera de uma rota. Nas ruínas, sempre há um "guia" vendendo o caminho para o Palácio de Edrom; ninguém voltou para dizer se era verdade. Piratas de Porto Livre falam de uma esquadra de mortos-vivos nas brumas do Suz, e os anões de Blur ficam nervosos quando se fala da Torre de Ébano.$t$,
NULL, false)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.cidades (slug, nome, reino, capital, populacao, governante, religiao, economia, descricao, rumores, compartilhado) VALUES
($t$torre-do-leste$t$, $t$Torre do Leste$t$, $t$estepes-vitreas$t$, true, NULL, $t$Minalis, o prefeito, guardião da biblioteca da torre$t$, $t$O culto ao rei Edrom; também Cambu, Palier, Blator, Parom e Sevides$t$,
$t$Abastece quem parte para as ruínas, para as estepes ou para o Mar de Suz. Restauradores vendem objetos antigos aos nobres de Lar, aos mestres de Blur e aos ricos dos Mangues; artesãos vendem elmos de vidro contra os cristais, que raramente aguentam mais de uma tempestade.$t$,
$t$A Grande Cardeal, a mais próspera das quatro torres que Edrom ergueu nas fronteiras do império. Chegou a ter mais de dez mil moradores ao redor e rivalizava com a própria Tindael. A magia dos cristais não a tocou, mas o Cataclismo e o fim do império a arruinaram, e entre as ruínas e a torre floresceu uma pequena vila. Os vitrais e o mármore colorido ainda mostram a riqueza de outrora.
A torre guarda uma das coleções de textos antigos mais valiosas de Tagmar, e parte dela vem sendo copiada e levada para Runa e Saravossa, num acordo que Minalis fez com os sábios de Calco e Portis. É ele quem decide o que sai. Das oficinas de restauração, a mais procurada é a do elfo Carmasam. Em certos meses do ano, o anão Capitão Gorgul aparece pelas casas de comércio recrutando loucos para procurar a Ilha de Larcor.$t$,
$t$Muitos vasculham o acervo reservado da biblioteca atrás de um mapa para Tindael. Se ele existe, Minalis o guarda a sete chaves. Há também registros da passagem de sacerdotes suspeitos da Seita e de bestiais que desceram das montanhas do norte, e fragmentos que falam de túneis ligando as cidades do império a fortalezas e catacumbas, talvez intactos.$t$, false),

($t$tindael$t$, $t$Tindael$t$, $t$estepes-vitreas$t$, false, NULL, $t$Ninguém; no passado, o rei Edrom$t$, $t$No passado, o culto a Edrom e suas rainhas$t$, NULL,
$t$Em rina, "a cidade dos sinos", pelo som dos sinos dos rebanhos que os viajantes ouviam de longe; pela riqueza, "a Joia Central", e mais tarde "a Cidade dos Palácios". Nasceu às margens do rio Cristalida e foi a capital do Império Central. O castelo mais antigo, dos antepassados de Edrom, passou a servir de campo de treino quando o palácio novo ficou pronto.
Dividia-se em plebe e corte. A plebe, de casas, estábulos, mercados e roças, foi abandonada pelo povo que temia as criaturas da noite. A corte, no centro, tinha palácios de nobres e mercadores, torres onde se guardavam os impostos, casas de comércio mais suntuosas que os palácios, tabernas que eram verdadeiros salões de luxo e um parque de árvores e bichos exóticos. Na praça central ficava o templo de Edrom e suas esposas, de cujo balcão o rei falava ao povo.
Hoje está toda em cristal, perdida em algum ponto das estepes que ninguém sabe apontar.$t$,
$t$Quem encontra a cidade pode usá-la de abrigo contra as tempestades. Mas há outros perigos ali, e não são naturais.$t$, false),

($t$cantrar$t$, $t$Cantrar$t$, $t$estepes-vitreas$t$, false, NULL, NULL, NULL, NULL,
$t$"A cidade das muralhas" nasceu da Academia Militar dos Guerreiros de Bronze, fundada pelo rei Cantrar entre as Torres do Norte e do Oeste. Em volta da academia cresceram bairros, e cada um ganhou sua muralha, até serem cinco anéis: o dos oficiais, de mansões e jardins; o dos soldados, o mais povoado e humilde; o dos mercenários anões, de casas baixas cheias de subterrâneos; o estreito anel de torres dos arqueiros élficos; e por fim a muralha da cidade.
A academia ocupava terras amplas, com campos para infantaria, cavalaria e arqueiros, armazéns, estábulos, um açude e forjas; o nome vem das armas e armaduras de cobre e bronze. Ali morreu Drinve II, o último rei da linhagem, e com ele o império.$t$,
$t$Dizem que, depois da fundação do Conselho dos Magos, os grandes generais receberam armas e armaduras mágicas poderosíssimas, e que algumas ainda estariam nos armazéns da academia.$t$, false),

($t$gra-cristalida$t$, $t$Grã-Cristalida$t$, $t$estepes-vitreas$t$, false, NULL, NULL, $t$A adoração antiga, à natureza, aos titãs e aos deuses; banida por Edrom em seu segundo reinado$t$, $t$Agrícola, às margens do rio Cristalida$t$,
$t$Cidade agrícola às margens do Cristalida, foi um reino independente que se uniu a Tindael no primeiro reinado de Edrom. Seu povo era muito religioso. Edrom proibiu a adoração antiga, mas conservou o templo pelo valor místico.
O Templo da Adoração Ancestral tinha um átrio decorado que dava para salões de reunião e de festa e para o pátio central, com um altar de monólitos. Numa torre a leste, vigiada pelos monges, ficavam os textos e as relíquias do culto; a oeste, os dormitórios, e debaixo deles as criptas.$t$, NULL, false),

($t$arenta$t$, $t$Arenta$t$, $t$estepes-vitreas$t$, false, NULL, NULL, NULL, $t$Armazéns e mercados para as caravanas, casas comerciais da capital, oficinas e tecelagens$t$,
$t$Nasceu numa encruzilhada de rotas comerciais, de armazéns e mercados que abasteciam as caravanas. De dia o movimento era nos mercados; de noite, nas tabernas e estalagens.
A Guilda Comercial era também a sede do governo da cidade: gabinetes de fiscais, salas de segurança, uma pequena prisão e o escritório do prefeito, e no subsolo a sala onde se guardavam os impostos.$t$,
$t$Se Arenta ainda guarda algum prêmio, deve estar nos armazéns subterrâneos da Guilda.$t$, false),

($t$marrigal$t$, $t$Marrigal$t$, $t$estepes-vitreas$t$, false, NULL, NULL, NULL, NULL,
$t$"A Cidade dos Magos", capital do saber do Império Central e terra natal da rainha que levou seu nome. Tinha uma grande biblioteca de saber comum e outra só de conhecimento místico, e as seis avenidas principais formavam um hexagrama em volta do centro.
No centro ficava o Conselho dos Magos, criado pelo rei Drinve contra os generais magos do leste: uma torre de treze andares, os dez primeiros dedicados cada um a um ciclo de magia, o décimo primeiro e o décimo segundo às magias de acesso restrito, e o último ao Conselho Maior, os magos mais poderosos do reino, todos nobres. Alguns eram elfos recrutados entre os arqueiros; outros se tornaram bebedores de sangue a serviço de Edrom.$t$, NULL, false),

($t$gra-rocar$t$, $t$Grã-Rocar$t$, $t$estepes-vitreas$t$, false, NULL, NULL, NULL, $t$Pedreiras de granito, calcário e mármore; vidraceiros, marceneiros, mestres de obra e mineiros; uma mina de carvão e diamantes$t$,
$t$"A cidade das grandes pedreiras" reunia mais vidraceiros, arquitetos e mineiros que qualquer outra do reino. Quando os anões romperam a aliança com Tindael, alguns mestres e mercenários já instalados ali ficaram.
No auge do segundo reinado de Edrom achou-se ali uma mina de carvão e diamantes, sempre cercada de guardas e fiscais: o carvão alimentava as vidrarias, os diamantes enchiam os cofres do reino.$t$,
$t$Como a mina era subterrânea, não se sabe se o cristal a alcançou.$t$, false),

($t$criptael$t$, $t$Criptael$t$, $t$estepes-vitreas$t$, false, NULL, NULL, NULL, NULL,
$t$"A Cidade Sagrada", ou "a Cidade das Tumbas", foi erguida por Edrom II para sepultar o pai. Com o tempo os nobres das grandes cidades passaram a ser enterrados em volta da Tumba dos Reis, e o descanso de Edrom virou uma grande necrópole, sempre vigiada por guardas.$t$,
$t$Contam que necromantes têm grande interesse nas tumbas da linhagem de Edrom.$t$, false),

($t$lavambar$t$, $t$Lavambar$t$, $t$estepes-vitreas$t$, false, NULL, $t$No passado, o Duque de Lavambar$t$, NULL, $t$Pomares de maçã, uva, manga e pêssego$t$,
$t$"A cidade dos pomares", um dos reinos do Cristalida que se juntaram ao império. Na confluência de alguns riachos com o rio, a terra fértil sustentava pomares imensos, e o povo vivia em volta das fortalezas dos nobres.
A principal era o Forte Crisalis, onde moravam o Duque de Lavambar e a família, que ao contrário da maior parte da corte nunca deixaram a cidade e eram tidos ali como grandes senhores. Dentro da muralha alta havia estábulo, poço, a casa dos servos e o casarão da família, com salão de festas e escritório.$t$,
$t$O duque nunca mostrou sinais da maldição de Edrom, ou soube escondê-los. Ele e a duquesa estudaram no Conselho dos Magos, e muitos acreditam que haja tesouros mágicos numa sala secreta atrás do escritório.$t$, false),

($t$torre-do-norte$t$, $t$Torre do Norte$t$, $t$estepes-vitreas$t$, false, NULL, NULL, NULL, NULL,
$t$Ao redor da Torre do Norte havia uma grande cidade comercial, no caminho entre as cidades do leste e as do oeste. O cristal não a tocou, mas no Cataclismo as montanhas do Muro se ergueram em volta, e cidade e torre ficaram em ruínas, espalhadas por vales e encostas.
Pela riqueza da construção, muitos templos, casas e oficinas não caíram de todo, e a torre está apenas parcialmente soterrada nos andares de baixo. Grupos de aventureiros vasculham as ruínas atrás de salas intactas; muitas já foram saqueadas, mas ninguém sabe o tamanho que a cidade tinha.$t$,
$t$A torre ainda esconderia obras de arte, tecidos e joias feitos com técnicas que já não existem. Desabamentos e armadilhas guardam os depósitos. Já houve incursões à torre, e ninguém voltou para contar.$t$, false)
ON CONFLICT (slug) DO NOTHING;
UPDATE public.reinos SET capital = $t$torre-do-leste$t$ WHERE slug = $t$estepes-vitreas$t$ AND capital IS NULL;

INSERT INTO public.locais (slug, nome, reino, populacao, descricao, rumores, compartilhado) VALUES
($t$palacio-de-edrom$t$, $t$Palácio de Edrom$t$, $t$estepes-vitreas$t$, NULL,
$t$Nenhum lugar de Tindael é tão cobiçado, e sábios de Saravossa chegam a duvidar que exista. Quem diz tê-lo visto conta que, mesmo em cristal, continua belo e imponente, e que tudo está intacto: uma cadeira pode ser erguida e levada a outro cômodo, um livro da biblioteca real pode ser lido. Mas nada sai das estepes; fora delas vira pó e volta a se formar onde estava.
A magia não alterou o que já era cristal: vitrais e taças do palácio ficaram como eram, e alguns já foram saqueados.$t$,
$t$Haveria no palácio uma sala que a magia não tocou, os aposentos do próprio Edrom, com riquezas jamais imaginadas, e nos porões mais fundos as joias que povos distantes mandavam ao império. Que esses salões tenham escapado ao cristal faz muitos perguntarem se Edrom ainda está "vivo".$t$, false),
($t$tumba-dos-reis$t$, $t$Tumba dos Reis$t$, $t$estepes-vitreas$t$, NULL,
$t$O coração de Criptael, todo em mármore. O térreo é um salão enorme de colunas entalhadas, com túmulos de familiares, amantes e nobres, cada um com altar e gaveta de pertences, entre estátuas de guardas e monstros. Um dos túmulos esconde a escada para o subsolo: um labirinto cujos corredores sempre terminam num altar, um deles com a passagem para o segundo subterrâneo.
Lá embaixo, cada salão guarda os tesouros e o corpo embalsamado de um rei da linhagem, de Edrom a Drinve II, com os feitos entalhados nas paredes. O salão de Edrom está vazio e violado.$t$,
$t$Todas as lendas falam de gárgulas e de armadilhas terríveis à espera de quem violar os túmulos.$t$, false),
($t$floresta-petrificada$t$, $t$Floresta Petrificada$t$, $t$estepes-vitreas$t$, NULL,
$t$Marca a fronteira das Estepes Vítreas com os Mangues e é o começo da rota de Uno. A magia não a atingiu em cheio, mas algo escorreu até ela: do lado das estepes as árvores e os bichos viraram cristal, mais adiante viraram pedra, e só a face voltada para os Mangues segue viva. A petrificação avança.$t$,
$t$Fantasmas e aparições se instalaram entre as árvores de pedra.$t$, false),
($t$o-muro$t$, $t$O Muro$t$, $t$estepes-vitreas$t$, NULL,
$t$A cordilheira ao norte das estepes. Na noite do Cataclismo novas montanhas se ergueram ali e engoliram a Torre do Norte, e esse trecho passou a ser o mais alto e o mais irregular do Muro. Gelo eterno, poucas trilhas, cavernas fundas, gigantes, dragões e raças selvagens fazem dele a barreira que hoje impede os povos do Oeste de marchar sobre o Mundo Conhecido.
Nos sopés mais perto das estepes vivem famílias de pastores e plantadores de grãos; patrulhas de elfos e de anões vigiam as velhas trilhas, e mesmo ali há salteadores.$t$,
$t$Todos os que tentaram cruzar o Muro ao norte das estepes, rumo ao oeste, nunca voltaram.$t$, false),
($t$deserto-gelido$t$, $t$Deserto Gélido$t$, $t$estepes-vitreas$t$, NULL,
$t$A tundra a oeste das estepes, a parte da planície que o cristal não alcançou e o Cataclismo congelou. Ali vivem nômades entre ursos e lobos das neves, guardiões de segredos como o lugar da Torre do Oeste e testemunhas de todas as tentativas do Oeste de avançar para o leste. Guardam heranças de Tindael e costumes próprios.
O Império do Oeste quer achar uma rota para as terras do leste de suas lendas, mas teme uma nova maldição dos cristais e as criaturas da noite.$t$, NULL, false),
($t$torre-do-sul$t$, $t$Torre do Sul$t$, $t$estepes-vitreas$t$, NULL,
$t$O Cataclismo levou a Torre do Sul e sua cidadela para o fundo do Mar de Suz, e a cidade virou um recife traiçoeiro que já afundou muitos navios. Na maré baixa, a poucas léguas da costa, ainda aparecem alguns andares da torre.$t$,
$t$Um artefato sagrado poderoso estaria escondido num dos templos submersos, ou nos salões da torre. Pelos diários da Torre do Leste, os próprios navios naufragados ali já valem uma fortuna.$t$, false),
($t$torre-do-oeste$t$, $t$Torre do Oeste$t$, $t$estepes-vitreas$t$, NULL,
$t$Da Torre do Oeste quase nada se sabe; nem os arquivos da Torre do Leste dizem onde ficava. Estaria em algum ponto do Deserto Gélido, e os nômades de lá talvez saibam.$t$,
$t$Textos antigos da biblioteca da Torre do Leste falam de um caminho secreto que partiria do subterrâneo da Torre do Oeste, aberto para surpreender os reinos do Oeste. Quem achar a torre poderia cruzar as estepes até as terras do Oeste.$t$, false),
($t$torre-de-ebano$t$, $t$Torre de Ébano$t$, $t$estepes-vitreas$t$, NULL,
$t$Depois do Cisma Flamejante, necromantes com medo de perder o saber do colégio ergueram esta torre para esconder os segredos da alta necromancia, longe dos curiosos e dos grigorii, inimigos jurados do colégio. Fica em algum ponto do interior das estepes, ninguém sabe onde.
Por cem passos em volta dela a magia dos cristais se desfaz: há água e terra, um oásis no meio da desolação. Como isso se faz é um dos mistérios do lugar.$t$,
$t$Os anões de Blur ficam inquietos quando se fala da torre e de seus moradores. Dizem que temem a volta de lendas que julgavam esquecidas.$t$, false),
($t$ilha-de-larcor$t$, $t$Ilha de Larcor$t$, $t$estepes-vitreas$t$, NULL,
$t$Ilha montanhosa ao sul das estepes, no meio do Mar de Suz, onde estariam as ruínas da primeira civilização anã: Larcor, o reino das torres de ouro, velho aliado de Tindael. Seus anões feiticeiros foram consumidos pelo fogo no Cataclismo, e os terremotos derrubaram as cidades. Os deuses deixaram monstros vivendo nas ruínas.
Ninguém sabe onde fica, e nenhum marinheiro vivo confirmou que exista; procurá-la no mar amaldiçoado é coisa de loucos.$t$,
$t$Para muitos não passa de história de velhos marinheiros de Porto Livre. O Capitão Gorgul já perdeu vários navios procurando-a e continua tentando.$t$, false),
($t$estepes-das-vinte-mil-almas$t$, $t$Estepes das Vinte Mil Almas$t$, $t$estepes-vitreas$t$, NULL,
$t$Planície a leste das estepes, perto da fronteira de um antigo reino místico que cobiçava o Império Central. Ali Edrom mandou largar os corpos amaldiçoados das vinte mil pessoas mortas na noite em que esvaziou Tindael, para que ficassem num sono sem descanso e assustassem os místicos do outro lado.$t$, NULL, false),
($t$rio-cristalida$t$, $t$Rio Cristalida$t$, $t$estepes-vitreas$t$, NULL,
$t$O grande rio das Estepes Centrais, batizado pelas águas abundantes e límpidas que desciam de fontes nas montanhas do leste e do sul. Suas águas traziam minerais que adubavam a terra, e às suas margens nasceram Tindael, Grã-Cristalida e Lavambar. Hoje é cristal como tudo o mais.$t$, NULL, false)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.npcs (slug, nome, raca, profissao, deus, cidade, reino, familia, status, rumores, descricao, compartilhado) VALUES
($t$minalis$t$, $t$Minalis$t$, $t$Humano$t$, $t$Prefeito da vila da Torre do Leste, guardião da biblioteca$t$, NULL, $t$torre-do-leste$t$, $t$estepes-vitreas$t$, NULL, NULL,
$t$Ninguém sabe como um homem tão jovem ficou tão culto. Corre que tem ligação com os necromantes que há anos passam pela região, e que pode ser aprendiz de um deles. As más línguas dizem que o ouro da biblioteca não vai todo para o seu povo.$t$,
$t$Nativo da fronteira das estepes, de constituição média, pele morena e queimada, olhos sábios. O cabelo liso e comprido sai do alto da cabeça num rabo triplo, cópia dos retratos encontrados nas relíquias da torre. Carismático, diplomático e um tanto reservado, tornou-se líder da vila e do governo da Torre do Leste.
Guarda as relíquias da cidade e a biblioteca da torre, e é ele quem escolhe o que os forasteiros podem levar ou copiar, em troca de muito ouro e mercadorias para seu povo.$t$, false),
($t$xepse_minael$t$, $t$Xepsé Minael$t$, $t$Humano$t$, $t$Sacerdote nômade, líder dos adoradores de Edrom$t$, NULL, NULL, $t$estepes-vitreas$t$, NULL, NULL,
$t$Quem conhece magia arcana compara seus prodígios aos de um místico que domina muitas magias antigas. Alguns sábios dizem que ele e seu grupo são os guardiões do legado de Edrom.$t$,
$t$Homem de meia-idade, de pele queimada pelo sol das estepes, vive viajando entre as aldeias da borda e celebrando cultos ao deus-rei. Em nome de Edrom realiza prodígios que fazem muitos crerem na divindade do rei perdido.
Mais de uma vez, viajantes contaram ter sido hostilizados por ele e seus fiéis ao chegar perto de lugares que o culto tem por sagrados.$t$, false),
($t$semiranis$t$, $t$Semiránis$t$, $t$Humano$t$, $t$Sacerdotisa do culto a Edrom$t$, NULL, NULL, $t$estepes-vitreas$t$, NULL, NULL,
$t$Perto da aldeia dela somem viajantes desgarrados das caravanas. Uns culpam salteadores; as más línguas dizem que ela e suas companheiras seduzem os incautos para emboscadas e os sacrificam para trazer Edrom de volta.$t$,
$t$Chamam-na "a Noiva de Edrom", e ela se orgulha do título, sinal de suas ambições e de seu desejo pela volta do deus-rei. Jovem de pele clara para o seu povo e olhos cor de mel, é a mais bela da região e a sacerdotisa mais importante do culto. Vive numa aldeia de pastores perto da rota dos Mangues.$t$, false),
($t$carmasam$t$, $t$Carmasam$t$, $t$Elfo dourado$t$, $t$Mago e mestre restaurador$t$, NULL, $t$torre-do-leste$t$, $t$estepes-vitreas$t$, NULL, NULL,
$t$Por uma boa oferta, dizem, revela sua maior habilidade: é o único capaz de restaurar objetos mágicos danificados.$t$,
$t$Um dos primeiros forasteiros a se fixar na Torre do Leste, quando começava o comércio de antiguidades restauradas para o Mundo Conhecido. É o melhor restaurador da região, e a maioria dos outros aprendeu o ofício com ele e lhe deve lealdade; objetos de todas as ruínas passam por sua oficina antes de serem vendidos.
Ainda sofre hostilidade de alguns nativos, por ser estrangeiro, por não ser humano e por ser mago. Tornou-se um dos comerciantes mais ricos e influentes das estepes, e não deixa que ameacem o seu lugar.$t$, false),
($t$capitao_gorgul$t$, $t$Capitão Gorgul$t$, $t$Anão$t$, $t$Capitão de navio, caçador da Ilha de Larcor$t$, NULL, $t$torre-do-leste$t$, $t$estepes-vitreas$t$, NULL, NULL,
$t$Seus recursos parecem não ter fim, e logo se desconfiou de que alguém o financia: o Império do Oeste, atrás de um caminho pelo mar até o leste, ou o reino anão, querendo resgatar as relíquias de sua civilização.$t$,
$t$Anão que muitos têm por louco, já capitaneou muitos navios que afundaram procurando a Ilha de Larcor. Tem a pele bronzeada, o corpo esguio para um anão, perdido num mar de pelos e cabelos embaraçados, e um gosto pela bebida que ajuda a fama de lunático.
Sempre escapa vivo dos naufrágios e sempre consegue tripular outro barco, embora desconfie da própria tripulação. Em certos meses aparece perto da Torre do Leste juntando provisões e gente; só leva quem se mostra valoroso. O navio fica ancorado na costa sul, no ponto mais próximo que se consegue.$t$, false),
($t$edrom$t$, $t$Rei Edrom$t$, $t$Humano$t$, $t$Antigo rei de Tindael e do Império Central, o deus-rei$t$, NULL, $t$tindael$t$, $t$estepes-vitreas$t$, $t$Pai de Edrom II. Teve vinte rainhas de sangue; as cinco mais poderosas foram Audrina, Ercí, Marregal, Rebalú e Cedrás. O nome das outras quinze foi apagado dos registros.$t$, $t$Desaparecido; talvez destruído pelo cristal$t$,
$t$As mães ainda contam a história de Edrom às crianças malcriadas. Os ataques de salteadores podem esconder os dele, e como as vítimas quase nunca aparecem, a dúvida fica.$t$,
$t$Subiu ao trono aos dezesseis anos e reinou trinta: pacífico e justo, fez Tindael crescer vinte vezes, recebia bem todos os povos e respeitava suas crenças. Morreu de uma febre estranha aos quarenta e seis, e o reino o chorou por três meses.
Mais de um século e meio depois, com o império caído e Tindael nas mãos do Oeste, nobres desesperados o tiraram da tumba num ritual de sangue. Mas as vidas dadas ao ritual não foram oferecidas de bom grado, e o que voltou nasceu do ódio e do medo dos mortos. Libertou as estepes, fez de sua guarda servos que bebiam sangue e, coroado, passou a se ter por deus. O sol o queimava; para andar à luz, sacrificou vinte mil pessoas numa só noite, e ganhou o dia ao preço de envelhecer e perder nove décimos do poder sob o sol. Dali em diante caminhou pelas estepes como um velho cercado de cinco senhoras, até que a magia dos cristais caiu sobre Tindael.$t$, false)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
