-- PERSONAGENS DOS REINOS (16/11/2026)
-- Usuário: "Pode adicionar os personagens." São os "Personagens mais
-- Conhecidos" do livro de Reinos (tagmar/reinos.pdf) que ainda não tinham
-- ficha: Dantsem, Marana, Luna, Portis, Âmien, Acordo, Plana, Filanti, Conti,
-- Azanti e as Cidades-Estado. Texto reescrito pela skill cronista-de-tagmar;
-- os boatos do livro vão para `rumores`. Catálogo global (historia_id nulo).
-- ON CONFLICT DO NOTHING: rodar de novo não pisa em ficha já editada na tela.

insert into public.npcs (slug, nome, raca, profissao, deus, cidade, reino, familia, rumores, descricao) values

-- ── DANTSEM (capital Léon) ──
('azuma_olives_i', 'Rei Azuma Olives I', null, 'Rei de Dantsem', null, 'leon', 'novo-reino-h24-18b6a932', null,
$t$Dizem que o rei lamenta, a sós, nunca ter firmado aliança com um reino de tradição guerreira, e que hoje põe toda a esperança em Âmien e num milagre.$t$,
$t$Chamam-no o Rei da Esperança. Criado entre a cultura dos elfos e a dos homens, Azuma é sensato, generoso e de diplomacia afiada, e vinha conduzindo Dantsem a uma era de paz até que a guerra com Verrogar caiu sobre o reino como uma tempestade.
Não tem a veia guerreira de seu inimigo, e o reino resiste à custa de muito sangue dantseniano. Ainda assim o povo não perdeu a fé nele: justo e honrado, ele é o último fio que mantém Dantsen de pé.$t$),

('kolich_dejanim', 'Kolich Dejanim', 'Humano', 'General dos exércitos de Dantsem', null, 'leon', 'novo-reino-h24-18b6a932', 'Irmão de Katrius Dejanim; de uma longa linhagem de guerreiros dantsenianos.', null,
$t$Chamam-no o Bravo. Era capitão nas fileiras quando, da noite para o dia, se tornou o general máximo das tropas de Dantsen, e muitos veem nisso o primeiro dos milagres que o rei tanto pede aos deuses. É o mais jovem do conselho real e, por causa da guerra, já o mais importante: sua morte ou captura seria a ruína do reino.
Talvez seja o único homem em Dantsen que não teme os verrogaris, ou ao menos não o mostra. Seus brados devolvem o ânimo às tropas, e seu plano é simples: resistir até que Verrogar julgue a conquista cara demais em mortos e em ouro.$t$),

('frido_alester', 'Frido Alester', 'Humano', 'Capitão da marinha real de Dantsem', null, 'leon', 'novo-reino-h24-18b6a932', null,
$t$Há marujos que juram que Frido é um dos escolhidos de Ganis, tamanha a sua sorte nas águas da deusa.$t$,
$t$Chamam-no o Tritão. É talvez o homem mais experiente ao lado de Dantsen nesta guerra: passou a vida inteira, primeiro como marujo e depois como capitão, rechaçando piratas das praias dantsenianas, a maioria vinda de Porto Livre. Lutou incontáveis batalhas navais e nunca saiu vencido.
Seus homens têm por honra impagável navegar ao lado de uma lenda viva, e a lealdade deles é completa.$t$),

('katrius_dejanim', 'Katrius Dejanim', 'Humano', 'Sacerdote de Blator, líder da Sacra Escola de Guerra', 'Blator', 'leon', 'novo-reino-h24-18b6a932', 'Irmão de Kolich Dejanim.', null,
$t$Chamam-no o Senhor da Guerra. Forjado no mesmo fogo que o irmão Kolich, é grande guerreiro e líder excepcional, e tem a mais a bênção de Blator: frente a frente, é adversário mais terrível que o próprio general.
À frente da Sacra Escola de Guerra, a pedido do irmão e do rei, prepara às pressas os guerreiros de que Dantsen precisa, e apela sem descanso a seu deus. Verrogar já tem sacerdotes de Blator e de Crezir demais em suas fileiras; Dantsen tem Katrius.$t$),

('eldem_eldinir', 'Eldem Eldinir', null, 'Conselheiro real de Dantsem, Sumo Sacerdote de Maira', 'Maira', 'leon', 'novo-reino-h24-18b6a932', null, null,
$t$Chamam-no o Ponderado. Sumo Sacerdote de Maira, experiente e capaz, tenta com todas as forças levar calma aos ouvidos do rei, para que decisões precipitadas não agravem a guerra. A cada dia a tarefa fica mais difícil: é quase impossível manter a serenidade nos salões reais enquanto o povo sofre lá fora.
Mantém contato estreito com o sacerdote de Sevides Lidjinir Alpini, e os dois parecem ver da mesma forma os males que se abatem sobre o reino.$t$),

('lidjinir_alpini', 'Lidjinir Alpini', 'Elfo', 'Sacerdote de Sevides', 'Sevides', null, 'novo-reino-h24-18b6a932', null,
$t$Dizem pelo reino que seus cultos são bálsamo para as chagas do espírito, e que é ele quem mantém viva a fé do povo nos deuses, no rei e nos líderes de Dantsen.$t$,
$t$Chamam-no o Sábio. Com duzentos anos de vida élfica, é um ícone de resignação à tarefa sacerdotal e de fé, e o povo o tem em grande afeto.
Prefere estar onde estão "os mais necessitados", nas suas palavras. O rei insiste em chamá-lo aos salões para ouvir seus conselhos, e o velho sacerdote de Sevides continua a recusar.$t$),

-- ── MARANA (capital Sensera) ──
('augustu_zeneri_vi', 'Rei Augustu Zeneri VI', 'Humano', 'Rei de Marana', null, 'sensera', 'novo-reino-h24-315d0308', 'Primogênito de Elberto, o Justo; irmão de Orsini Zeneri.',
$t$Comenta-se em voz baixa que a rainha-mãe, ao descobrir a verdadeira natureza do filho, caiu doente de desgosto e vive entre a vida e a morte. E que a doença súbita que levou Elberto antes do tempo não foi obra dos deuses.$t$,
$t$O povo lhe deu a alcunha de Tirano. Jovem mimado e problemático desde a infância, não respeita nada além do poder e só se curva a quem reconhece como mais forte do que ele.
Ciumento da coroa, teme a boa índole do irmão Orsini e trama sem descanso a sua perda. Era apenas um homem de alma ruim até que Karr surgiu, adivinhando seus medos mais secretos e trazendo promessas de poder.$t$),

('karr', 'Karr', 'Humano', 'General dos exércitos de Marana', null, 'sensera', 'novo-reino-h24-315d0308', null, null,
$t$Chamam-no o Terrível. Colosso desde menino, cresceu atormentando as crianças da vila, e aos treze anos matou um adulto numa discussão de taberna. Expulso, entrou na milícia de uma cidade distante, onde achou treino e liberdade para o seu instinto assassino.
A insubordinação terminou quando um superior o humilhou diante da tropa: o homem saiu vivo por sorte, e Karr foi expulso do reino. Voltou há pouco, e foi servir a Augustu.$t$),

('orsini_zeneri', 'Orsini Zeneri', 'Humano', 'Arquiduque de Marana', 'Selimom', 'sensera', 'novo-reino-h24-315d0308', 'Filho caçula de Elberto, o Justo; irmão do rei Augustu Zeneri VI.', null,
$t$Chamam-no o Bem-Amado. Não fosse a semelhança física e a palavra da mãe, ninguém diria que é irmão de Augustu. Era o preferido do pai, Elberto, que planejava fazê-lo rei; Augustu descobriu o plano, e Elberto morreu de uma doença rara antes do tempo.
Teve por preceptor e amigo Echoriom Anoriel, e cresceu nos preceitos de Selimom. O povo o ama com a mesma força com que odeia o irmão, e isso o põe em perigo: desde que recebeu o título de Arquiduque já sofreu ao menos três atentados, e anda guardado por quatro Pacificadores de Echoriom. Recusou-se a buscar abrigo em Ludgrim e partiu em missão de paz a Filanti.$t$),

('echoriom_anoriel', 'Echoriom Anoriel', 'Elfo dourado', 'Alto Sacerdote de Selimom', 'Selimom', 'sensera', 'novo-reino-h24-315d0308', null,
$t$Muitos se perguntam por que o sacerdote ainda está vivo. A resposta mais repetida: o poder de Selimom não deve ser subestimado.$t$,
$t$Chamam-no o Bom. Elfo, e dourado, duas coisas que a corte de Augustu detesta abertamente; e por ser amigo e preceptor de Orsini, é hoje o inimigo número um do rei. Muito antigo, já viu outras vezes forças malignas rondando os salões reais para corromper reis, e sabe de tudo o que se passa em Marana.
Seu poder guarda a própria vida e a catedral de Selimom. Teme pela vida de Orsini em Filanti: a morte do príncipe em solo filantiano seria o pretexto que Augustu procura para uma guerra.$t$),

('alirel_dalirom', 'Alirel Dalirom', 'Elfo', 'Alto Sacerdote de Palier', 'Palier', 'sensera', 'novo-reino-h24-315d0308', null,
$t$Em segredo, Alirel quer apenas passar por Âmien para contar aos irmãos o que se passa em Marana, e depois seguir para o Lar.$t$,
$t$Chamam-no o Sábio. Com quinhentos anos, é um dos elfos mais sábios do Mundo Conhecido a viver fora de Âmien, e, como Echoriom, já viu antes homens surgirem com falsas promessas.
Ao contrário do irmão de raça, anunciou que está terminando os preparativos para deixar o reino. Para Augustu a notícia foi um alívio: ele e Karr temem enfrentar o velho elfo.$t$),

-- ── LUNA (capital Franges) ──
('stefam_maliarco', 'Stefam Maliarco', 'Humano', 'Guerreiro', null, null, 'novo-reino-h24-5a7b6194', null,
$t$Dizem que carrega um machado encantado de grande poder. Os bardos cantam que já o viram derrubar um ogro a socos. Seu sumiço gerou incontáveis boatos, nenhum confirmado.$t$,
$t$Um dos guerreiros mais poderosos que se conhecem, sinônimo de bravura e honra, respeitado até por outras raças. É homem encorpado, de músculos possantes.
Com ou sem armas mágicas, continua sendo um grande guerreiro. Há tempos desapareceu das terras conhecidas.$t$),

('navarro_iii', 'Rei Navarro III', 'Humano', 'Rei de Luna, guerreiro', null, 'franges', 'novo-reino-h24-5a7b6194', 'Único descendente da linhagem real de Luna.', null,
$t$Último da linhagem real, tomou o governo há poucos anos e conquistou o povo. Seus feitos correm Tagmar: expulsou as tropas de Filanti no ataque a Calisto e derrubou os senhores da Liga do Governo Lunense, hoje extinta.
Seu poder nasceu nas cidades do norte e se espalhou até Lagia; de vila em vila foi ganhando o povo, e tomou o poder ao chegar a Obrem.$t$),

('asvante_nordolerim', 'Asvante Nordolerim', 'Elfo dourado', 'Mago, um dos líderes do colégio de magia de Franges', null, 'franges', 'novo-reino-h24-5a7b6194', null,
$t$Dizem que seu poder mágico é lendário e que ele estaria ligado ao Mais Sábio. Ninguém sabe quantos magos ainda restam no colégio, nem se a peste atingiu os magos humanos e meio-elfos de lá.$t$,
$t$Elfo antigo, de grande saber arcano e místico. Foi graças à estima e à influência dele que os magos do colégio de Franges permaneceram na cidade mesmo depois da chegada da peste.$t$),

('marconde_travescar', 'Marconde Travescar', 'Humano', 'Alto Sacerdote de Parom', 'Parom', 'dariati', 'novo-reino-h24-5a7b6194', null,
$t$Não se sabe se ainda está em Dariati. Dizem que, se a peste teve origem divina, este homem pode estar no centro dela.$t$,
$t$Antes da peste, era o líder da igreja de Parom em Luna, com templo em Dariati: homem de meia-idade, calmo, de ar misterioso, com grande poder místico e político.
Com a peste e o desmoronamento de Dariati e da capital, seu poder parece ter escoado junto com o povo que fugiu para outras terras.$t$),

-- ── PORTIS (capital Runa) ──
('ienim_calaudra', 'Iênim Calaudra', 'Elfo dourado', 'Senador-Primas de Portis', null, 'runa', 'novo-reino-h24-38047d95', null, null,
$t$Este elfo dourado centenário foi um dos principais líderes da criação da Magocracia de Portis. Hoje é o Senador-Primas, o primeiro conselheiro do governo, e como seu antecessor dá atenção especial às pesquisas mágicas.
Dizem que sua magia é insuperável. Seu mau humor também é conhecido.$t$),

('melvim', 'Melvim', null, 'Senador de Portis, mago elementarista e construtor do reino', null, 'runa', 'novo-reino-h24-38047d95', null, null,
$t$Elementarista com mais de cinquenta anos, é senador, mas pouco participa da vida política. Seu interesse é a arquitetura e as magias elementais que servem a ela.
É o construtor oficial do reino: a ele se credita a criação da ilha artificial no centro de Runa e das torres onde vivem os outros senadores.$t$),

('apolom_de_maginor', 'Conde Apolom de Maginor', 'Humano', 'Conde de Maginor (autoproclamado)', null, null, 'novo-reino-h24-38047d95', 'Sobrinho do antigo Duque de Maginor, morto nas revoltas que levaram os magos ao poder.', null,
$t$Conde por título que ele mesmo se deu, é sobrinho do antigo Duque de Maginor. Vive viajando entre Pechara, Calisto e, em segredo, Estenorial, tentando montar uma resistência armada contra os magos de Runa.
Sonha com a volta da monarquia, e consigo no trono. Tem financiado expedições ao interior de Luna na esperança de que a peste seja a arma de que precisa para derrubar a magocracia.$t$),

('fanzeres_ipom', 'Fanzeres Ipom', null, 'Mago, Governador de Tanus', null, 'tanus', 'novo-reino-h24-38047d95', null, null,
$t$Mago jovem, governa Tanus e a região ao redor. Entra em choque com o Senado pela pouca ajuda que recebe contra as incursões de Azanti.
É impaciente e costuma agir por conta própria, o que pode virar problema para o governo de Runa. É também ambicioso, e tem muito para crescer em poder.$t$),

('balharte', 'Balharte', null, 'Senador de Portis, comandante das forças do reino, governante de Maginor', null, 'maginor', 'novo-reino-h24-38047d95', null, null,
$t$Um dos senadores mais antigos e peça vital na tomada do poder pelos magos. Entende de guerra e comanda as parcas forças armadas do reino.
Está hoje em Maginor, onde acumula o governo da cidade, mas seu propósito principal é organizar expedições de estudo e busca a Luna.$t$),

('estepem_taciturno', 'Capitão Estepem Taciturno', null, 'Comandante da Guarda Arcana de Portis', null, 'runa', 'novo-reino-h24-38047d95', null,
$t$Alguns dizem que é filho de um orco.$t$,
$t$Homem forte, de aparência horrível, comanda a Guarda Arcana e é o braço direito de Balharte. Fiel ao mago, não gosta da política amigável do governo para com os anões.
Com Balharte longe de Runa, sente-se mais livre para agir contra eles. Ninguém sabe o que planeja, mas deve ser jogar os anões contra a magocracia, abrindo caminho para destruí-los.$t$),

-- ── ÂMIEN (capital Cidade Dourada) ──
('galtilo_ii', 'Príncipe Gáltilo II', 'Elfo dourado', 'Príncipe de Âmien, responsável pela organização militar', null, 'nova-cidade-h13-10d68e1c', 'novo-reino-h13-f117a8ed', 'Filho da rainha Enora e do rei Gáltilo I.', null,
$t$Bravo guerreiro, tenta seguir os passos do pai, mas com menos habilidade e carisma. A mãe o fez responsável pela organização militar do reino.
É muito reservado. Quem traz de outros povos uma técnica de combate melhor do que as da guarda é bem recebido e ganha prestígio, até diante da rainha.$t$),

('marcos_calisto', 'Marcos Calisto', null, 'Mago, diretor do Colégio Alquímico de Âmien, membro do Alto Conselho Élfico', null, 'nova-cidade-h13-10d68e1c', 'novo-reino-h13-f117a8ed', null, null,
$t$Ninguém sabe ao certo a sua idade, mas é sem dúvida um ancião. Chegou a Âmien pouco depois das primeiras levas de viajantes, atraído pelos relatos sobre aquela terra rica, e hoje dirige o Colégio Alquímico.
Suas opiniões, sempre simples e diretas, já mostraram à rainha o caminho certo diante de grandes desafios. Depois de Enora, é o membro mais respeitado do Alto Conselho.$t$),

('alberto_daros', 'Alberto Daros', 'Elfo dourado', 'Sumo Sacerdote de Palier, coordenador do Grande Centro de Saber', 'Palier', 'nova-cidade-h13-10d68e1c', 'novo-reino-h13-f117a8ed', null,
$t$Dizem alguns que Alberto tem em Saravossa outros interesses além do saber e do prestígio.$t$,
$t$Elfo dourado de cultura vastíssima, é a figura mais culta de Âmien e conhece muitas das línguas e escritas de Tagmar. Os lugares para ouvir seus discursos são disputados, e por um bom preço ele ajuda historiadores em muitas cidades.
Visita Saravossa com frequência, e lá é sempre esperado.$t$),

('mulinarte', 'Mulinarte', 'Elfo florestal', 'Rastreador, membro vitalício do Alto Conselho Élfico', null, 'nova-cidade-h13-10d68e1c', 'novo-reino-h13-f117a8ed', null,
$t$Há quem diga que, por trás da reverência de Mulinarte pela rainha, há algo além de admiração e respeito.$t$,
$t$Único elfo florestal e único rastreador do Alto Conselho, onde os dourados são maioria. Ganhou a cadeira vitalícia por salvar Enora duas vezes: a primeira de assassinos, antes de ela ser rainha, cujo mandante nunca se descobriu; a segunda contra as hordas de demonistas, na noite terrível que antecedeu a derrota de Morrigalti, quando foi o único a arriscar a vida por ela.
Os elfos florestais de Âmien o procuram para reclamar de desigualdades em relação aos dourados, e é chamado sempre que há queimadas nas florestas próximas.$t$),

('gildram_maite', 'Gildram Maite', null, 'Mago elementarista, diretor do Colégio Elemental, membro do Alto Conselho Élfico', null, 'nova-cidade-h13-10d68e1c', 'novo-reino-h13-f117a8ed', null, null,
$t$Dirige o Colégio Elemental, e Enora o fez coordenador de todos os magos do reino, de qualquer colégio, para criar e manter as magias lendárias que guardam as florestas de Âmien. Sobre magos de outros colégios, sua autoridade vale só para isso.
O trabalho é tanto que é difícil encontrá-lo, e por isso a rainha o dispensa dos ofícios da alta nobreza.$t$),

('boldam_navaste', 'Boldam Navaste', null, 'Sacerdote de Parom, membro do Alto Conselho Élfico', 'Parom', 'nova-cidade-h13-10d68e1c', 'novo-reino-h13-f117a8ed', null, null,
$t$A aparência jovem esconde muita experiência. Sabendo que um grande exército se faz de guerreiros, magos e sacerdotes, alguém precisava valorizar a arte de forjar espadas e aperfeiçoar escudos e flechas, e esse alguém é Boldam.
Muitos elfos dourados julgam a magia tão superior às armas que estas não mereceriam atenção. A rainha pensa o contrário, e dá a Boldam todo o apoio contra o desgosto do povo.$t$),

-- ── ACORDO (capital Porto Áureo) ──
('andreus_varengar', 'Rei Andreus Varengar', 'Humano', 'Rei humano de Acordo', null, 'nova-cidade-h24-5e36ad06', 'novo-reino-h24-f00c2479', 'Filho do antigo rei.', null,
$t$Homem de meia-idade, porte nobre e físico de guerreiro, mas no fundo um burguês: herdou o trono do pai sem esforço algum. O povo o respeita.
Os nobres e os grandes comerciantes, não. Sem força política, ele acaba aceitando o que o Conselho Real Misto decide.$t$),

('tonadius_aldebrenas', 'Rei Tonadius Aldebrenas', 'Anão', 'Rei anão de Acordo', null, 'nova-cidade-h24-5e36ad06', 'novo-reino-h24-f00c2479', 'Descendente da casa real; sua família é a mais antiga do reino.', null,
$t$Nobre anão, muito mais velho que o rei humano, e como ele herdeiro do trono por direito. Sua família, antiquíssima, guarda saberes que outros, sobretudo os humanos, já esqueceram, e usa isso para levar vantagem na concessão de terras de exploração.
Ainda assim, também ele obedece ao Conselho Real Misto.$t$),

('alvilar_nostorus', 'Alvilar Nostorus', 'Humano', 'Conselheiro do Comércio, chefe do Conselho Real Misto', null, 'nova-cidade-h24-5e36ad06', 'novo-reino-h24-f00c2479', 'Família no poder há gerações, rival só da família do rei anão.',
$t$As más línguas dizem que foi um parente próximo dele o verdadeiro culpado pelas mortes atribuídas à Fera Negra. O caso foi encerrado, e quem for pego repetindo isso terá o mesmo fim da fera: a morte.$t$,
$t$Na prática, é ele quem chefia o Conselho Real Misto. Homem de poucas palavras e muita ação, de voz mansa e sedutora, senhor de muitas terras e muitas minas.$t$),

('darmas_pedra_afiada', 'Darmas Pedra Afiada', 'Anão', 'Prefeito de Porto Áureo', null, 'nova-cidade-h24-5e36ad06', 'novo-reino-h24-f00c2479', null,
$t$Dizem que muitas casas de espetáculo para adultos são dele, e que muitas "bardas" não estão lá por vontade própria.$t$,
$t$Velho anão bonachão, sempre de roupas caríssimas e joias raras. Foi ele quem legalizou o jogo em Porto Áureo, e o pensamento ágil está sempre atrás de novas formas de entreter e lucrar.
Faz tudo para agradar os donos das casas de jogo, quase todos grandes comerciantes, muitos com título de nobreza.$t$),

('tarik_olhos_de_tubarao', 'Tarik Olhos de Tubarão', null, 'Taberneiro, dono da Taberna Escama de Tubarão', null, 'nova-cidade-h24-5e36ad06', 'novo-reino-h24-f00c2479', null,
$t$Quem tentou fazer a bebida por conta própria só encontrou a morte: as escamas de tubarão são como pequenos dentes afiados e rasgam por dentro.$t$,
$t$Dono da Taberna Escama de Tubarão, grande contador de causos de marinheiros e aventureiros. Ficou famoso por uma bebida da região que diz ter melhorado com escamas de tubarão, e que tira o cansaço e o sono por um dia inteiro.
Os mineradores pagam caro por ela. A receita está guardada só na cabeça de Tarik, que some por três dias sempre que vai preparar mais.$t$),

-- ── PLANA (capital Caleonir) ──
('estide', 'Estide', null, 'Nobre, pretendente ao trono de Plana', null, null, 'novo-reino-h24-e74de213', 'Família exilada em Verrogar há séculos.', null,
$t$Diz-se descendente da família real de Plana. Sua família, exilada em Verrogar há séculos, tenta retomar o poder político e o trono planense.
Tem humor seco e sarcástico, e sempre uma resposta pronta para calar quem se levanta contra ele.$t$),

('teleonor_vilas_grandes', 'Teleonor Vilas Grandes', null, 'Dono da cervejaria Vilas Grandes', null, 'cipa', 'novo-reino-h24-e74de213', null, null,
$t$Dono da cervejaria Vilas Grandes, a maior de Cipa, é um sujeito bonachão sempre metido na política da cidade. Vive à caça de aventureiros que abram novos mercados para seus vinhos.
Quer tudo perfeito, mas sempre deixa um tanto a mais no pagamento.$t$),

('bradagar_terraforte', 'Bradagar TerraForte', 'Anão', 'Mestre de armas da academia de guerreiros de Balistro', null, 'balistro', 'novo-reino-h24-e74de213', null,
$t$Dizem que sua força militar cresce em Plana, e que, se alguém pode deter as loucuras de Estide, é Bradagar.$t$,
$t$Anão respeitado e temido, famoso por ter derrubado vinte e três orcos em combate franco. Leva ao pescoço um colar com as vinte e três presas, lembrança daquela "batalha esplendorosa", como ele diz.$t$),

('banias_melchior', 'Banias Melchior', null, 'Líder do Conselho Maior de Plana', null, 'caleonir', 'novo-reino-h24-e74de213', null,
$t$Dizem que está por trás do recente levante de piratas: eles atacam na hora certa, e essas informações só podem vir de alguém muito influente.$t$,
$t$Líder do Conselho Maior, o rosto de Plana diante dos outros reinos. Hábil comerciante e grande maquinador; dizem que sua lábia convence até um acordiano.
Fala manso, sabe parecer entendido em qualquer assunto e é capaz de conversar por horas sem dizer nada de claro.$t$),

-- ── FILANTI (capital Chats) ──
('mar_ii', 'Rei Mar II', 'Humano', 'Rei de Filanti', null, 'chats', 'novo-reino-h24-d5e5e848', 'Casado com a rainha Líliam; pai do príncipe Argus, o primogênito.', null,
$t$Homem de grande estatura, ruivo, de olhos azuis e vasta barba bem cuidada. Os súditos o têm por rei justo, mas de pouco poder.
Anda cada vez mais recluso e deixa todas as decisões, até as mais graves, nas mãos do conselheiro Ludur. Pela política feudal do reino, muitos outros nobres têm influência, conforme o título e a riqueza de cada um.$t$),

('ludur', 'Lorde Ludur', 'Humano', 'Conselheiro da Corte de Filanti', null, 'chats', 'novo-reino-h24-d5e5e848', null,
$t$À boca miúda, o povo diz que Ludur é um demônio disfarçado.$t$,
$t$Alto, de cabelos negros como a noite, pele muito pálida e olhos castanho-escuros, nada parecido com os filantenses. A expressão é sempre enigmática.
É o segundo homem do reino, respeitado e temido pelos nobres e mais ainda pelo povo. Na prática, Filanti está nas mãos dele, ainda que o peso das grandes decisões recaia sobre Mar II.$t$),

('lorak', 'Lorak', 'Humano', 'Sumo Sacerdote de Blator em Filanti', 'Blator', 'chats', 'novo-reino-h24-d5e5e848', null, null,
$t$De porte militar e corpo enorme, parece mais guerreiro que sacerdote, e tem o senso de humor de uma porta pesada de madeira. Difícil de lidar, mas disciplinado e justo.
Com a expansão do exército de Filanti, tem ampliado muito a força bélica e a pregação de sua igreja.$t$),

('malcaom', 'Sir Malcaom', 'Humano', 'Líder dos Cavaleiros Brancos de Filanti', null, 'chats', 'novo-reino-h24-d5e5e848', null, null,
$t$Líder da cavalaria filantiana conhecida como os Cavaleiros Brancos, é homem bondoso e muito carismático: as tropas o amam e o povo o admira.
Mas nem o exército escapou dos tempos atuais, e hoje é sombra de um passado de glórias. Com a reputação abalada, Malcaom faz o que pode para manter essas glórias vivas entre seus homens.$t$),

('eldor', 'Conde Eldor', 'Humano', 'Governante do Condado de Fétor', null, 'fetor', 'novo-reino-h24-d5e5e848', null, null,
$t$Desde que assumiu Fétor, luta para repelir os orcos da cordilheira de Keiss, que atacam as vilas e aldeias do condado. Também guarda a fronteira entre Fétor e o reino de Portis.
O peso dessa guerra o fez duro, franco e impiedoso.$t$),

('delcio_de_marco', 'Marquês Délcio De Marco', 'Humano', 'Governante de Povariana', null, 'povariana', 'novo-reino-h24-d5e5e848', null, null,
$t$Estatura média, longos cabelos loiros, barba sempre feita, de uma beleza exótica; anda sempre limpo e perfumado. Veste-se de forma extravagante, com cores fortes e chapéus emplumados.
Os cidadãos o respeitam por ser justo e digno, e muitas mulheres da cidade o adoram por sua beleza.$t$),

('sobrao_larda', 'Sobrao Larda', 'Pequenino', 'Ladrão, fundador e líder da Guilda do Metro', null, 'mutina', 'novo-reino-h24-d5e5e848', null,
$t$Afirmam que tem mais de duzentos anos. Uma lenda diz que guarda, nos subterrâneos, um salão só para seus tesouros mágicos: mais de cinquenta, dizem.$t$,
$t$Metade dos pequeninos de Mutina são ladrões da Guilda do Metro, que Sobrao fundou e ainda comanda. Tem aparência de meia-idade, fala pelos cotovelos e é muito hábil; é raro pegá-lo desprevenido.
É inimigo ferrenho do sábio Alarco Manhão Sul, que abrigou um fugitivo da guilda.$t$),

('carlos_moldi', 'Carlos Moldi', 'Humano', 'Prefeito de Pechara', null, 'pechara', 'novo-reino-h24-d5e5e848', null, null,
$t$Apaixonado pelas letras e pela história, com uma biblioteca de milhares de volumes, tenta há anos fundar uma universidade em Pechara. Chegou a forjar ruínas perto da cidade para atrair estudiosos famosos; a farsa foi descoberta, e os sábios não querem nem ouvir seu nome.
Agora descobriu ruínas verdadeiras e ninguém acredita nele. Está perto da loucura, e o povo, que gosta de sua administração, já não aguenta mais a história da universidade.$t$),

('larel_courim', 'Larel Courim', 'Humano', 'Pretendente ao governo de Verda', null, 'verda', 'novo-reino-h24-d5e5e848', 'Filho do falecido Barão Courim; irmão gêmeo de Darel Courim.', null,
$t$Com a morte do Barão Courim, disputa a herança com o irmão gêmeo Darel, e Verda vive dividida: Larel ocupa o palácio do Barão, ao norte. Os conflitos entre os dois lados são comuns, políticos e armados.
É bem-apessoado, de físico avantajado, muito quieto e soturno.$t$),

('darel_courim', 'Darel Courim', 'Humano', 'Pretendente ao governo de Verda', null, 'verda', 'novo-reino-h24-d5e5e848', 'Filho do falecido Barão Courim; irmão gêmeo de Larel Courim.', null,
$t$Disputa com o irmão gêmeo Larel a herança do Barão Courim, e governa a parte sul de Verda. Os choques entre os dois lados são comuns, políticos e armados.
De porte mediano e feições comuns, é muito expansivo e falante, mas de natureza cruel e sarcástica.$t$),

-- ── CONTI (capital Muli) ──
('arrab_iii', 'Rei Arrab III', 'Humano', 'Rei de Conti', null, 'muli', 'novo-reino-h24-a3565606', 'Sobrinho de Arrab II. Casado com a rainha Guieni, nobre da corte filantiana; dez filhos, entre eles Eric, o primogênito, e Piotre, o caçula.',
$t$As más línguas dizem que "toda decisão importante do reino passa pelos lençóis" da rainha Guieni.$t$,
$t$Homem de meia-idade, boêmio, de aparência frágil e covarde por natureza, nunca foi preparado para o trono. Sobrinho de Arrab II, assumiu há cerca de uma década, quando o antigo rei desapareceu, e governa do Castelo Moldam, em Muli.
O herdeiro, Eric, mostra-se inapto, boêmio e imoral; o caçula, Piotre, é o mais querido do povo e o mais apto. Arrab III não tem prestígio nem entre os pobres nem entre os nobres.$t$),

('del_sardeim', 'Del Sardeim', 'Humano', 'Conselheiro do Conhecimento e da Ordem, Diretor de Honra da Academia Muliense de Magia', null, 'muli', 'novo-reino-h24-a3565606', null, null,
$t$Conselheiro e Diretor de Honra da Academia Muliense de Magia, o colégio mais respeitado depois da antiga e conservadora Academia de Moldazi. Organizou a justiça de Conti à semelhança da de Calco, e está furioso com os nobres que se julgam acima das leis do rei; com pouco poder, nada pode contra eles.
Idoso, mas de porte grandioso, fala manso e com termos eruditos até para os sábios. Homem de grande coração, honrado e de princípios.$t$),

-- ── AZANTI (capital Zanta) ──
('lenor', 'Duque Lenor', 'Humano', 'Duque de Azanti', 'Crizagom', 'zanta', 'novo-reino-h24-f4ecad3b', 'De uma casa nobre de Azanti que atravessou altos e baixos na história do ducado.', null,
$t$Chamam-no o Diplomata. Diz-se devoto de Crizagom e frequenta os cultos do deus, mas é bem mais hábil com as palavras do que com a espada; poderia passar por devoto de Cambu ou de Selimom. Quando surgiu a chance de assumir o governo de Azanti, não hesitou.
Calmo, ponderado, escolhe cada palavra com um fim claro. Defende que "só se deve recorrer às armas em última instância; as guerras deixam cicatrizes difíceis de curar". Mantém pouco contato com a Ordem Sagrada dos Cavaleiros de Crizagom. Odeia Sir Corelom, e é odiado por ele.$t$),

('corelom', 'Sir Corelom', 'Humano', 'Líder da Mesa de Prata', 'Crizagom', 'zanta', 'novo-reino-h24-f4ecad3b', null,
$t$Quem já lidou com ele se pergunta se não seria, na verdade, seguidor de Blator, ou até de Crezir.$t$,
$t$Chamam-no o Bravo. Diz-se devoto de Crizagom, mas tem temperamento radical e violento, o exato oposto de Lenor, e os dois se odeiam. Sem escrúpulos, deixa os homens da Mesa de Prata agirem como tiranos em Azanti: deveriam guardar a lei e se julgam acima dela.
Por isso é um dos maiores inimigos da Ordem dos Cavaleiros de Crizagom, que já traça planos para derrubá-lo. Corelom teme a Ordem e mantém homens à espreita de cavaleiros infiltrados no povo.$t$),

-- ── CIDADES-ESTADO ──
('ivanna_puni', 'Ivanna Puni', null, 'Oligarca de Pino', null, 'pino', 'novo-reino-h24-d82a4d49', 'Filha de Olander Mecenas, antigo regente de Pino, da oligarquia Toredo, e de Altanna M''lara, elfa florestal da oligarquia Kaliaka. Sem irmãos, solteira e sem filhos.',
$t$Dizem que um dos oligarcas de Novo Porto ligados a Pino, Auliz Mecenas, era seu amante, e que daí vem parte do ódio dela por Lorde Alstus. Outro boato diz que faz acordos com Conti: cada dia mais soldados e nobres contienses circulam por Pino.$t$,
$t$A oligarca mais poderosa das Cidades-Estado, e governa Pino com mão de ferro. Baixa, de beleza singela, voz firme, cabelos loiros como o sol e olhos violeta; de gênio forte e irascível.
É guerreira capaz e anda sempre com seu machado de metal vermelho-sangue, de onde vem o apelido "Puni Acu". Ele deve vir depois do nome dela: chamá-la só pelo apelido é, como dizem, um convite à morte.$t$),

('azedi_sadi', 'Azedi Sadi', 'Humano', 'Oligarca de Quízes', null, 'quizes', 'novo-reino-h24-d82a4d49', 'Descendente direto da oligarquia de Quízes, o vigésimo terceiro depois do fundador Aradi Isael.', null,
$t$Ditador que controla toda a política de Quízes e comanda pessoalmente o exército. Grande e poderoso guerreiro, de modos militares, voz de trovão, cabelos negros e olhos castanhos vivos como os de uma serpente.
Manipulador, sabe ser "estrategicamente doce", como planta carnívora que atrai o inseto com o perfume. Despreza Ivanna Puni, de Pino, por não achar uma mulher digna de ser guerreira. O povo o teme; o exército o aclama.$t$),

('dario_de_marum', 'Dario de Marum', 'Humano', 'Oligarca de Ender', null, 'ender', 'novo-reino-h24-d82a4d49', 'O mais próximo de Adessa na linha genealógica, como mandam as regras de sucessão de Ender.', null,
$t$O mais velho dos líderes de Ender e, por isso, o regente, com o consentimento das demais oligarquias; mas o conselho dos anciões dos clãs tem muito peso nas decisões.
Nobre a vida inteira, nunca precisou lutar pelo que tem. Bonachão, de longos cabelos cor de castanha, barba longa, modos rudes e roupas nobres que nunca repete. Parece relapso, mas sua habilidade política e de manipulação compensa as faltas.$t$),

('altenus_gravisdel', 'Altenus Gravisdel', 'Humano', 'Sumo Sacerdote de Cambu, líder da oligarquia Nariska', 'Cambu', 'ender', 'novo-reino-h24-d82a4d49', null, null,
$t$Organiza os cultos dos deuses em todas as cidades de Ender, e dele saem os maiores sacerdotes do reino. É hoje o Sumo Sacerdote mais poderoso das Cidades-Estado.
Acima de tudo é grande comerciante, mas devoto sincero de Cambu; suas alianças o levaram à liderança da oligarquia Nariska. De trajes refinados e joias com os símbolos do deus, tem voz convincente e prende a atenção de qualquer um.$t$),

('alstus', 'Lorde Alstus', 'Humano', 'Oligarca de Novo Porto, guerreiro', null, 'novo-porto', 'novo-reino-h24-d82a4d49', null,
$t$Dizem que o golpe final de Alstus foi misturar plantas venenosas às que a antiga oligarquia usava nos cultos a Lena.$t$,
$t$Tomou o poder depois de uma batalha violenta entre dois grupos oligárquicos de Novo Porto, e a tomada à força desagradou os outros líderes das Cidades-Estado. Tem grande poder militar; seus homens o veneram como herói e general e lhe são leais até a morte.
Altivo, sempre com planos para cada situação, é um dos oligarcas mais bem protegidos. É totalmente calvo, sem barba nem bigode, e anda fardado e de armadura sempre que pode. Como os demais, é um ditador.$t$),

('lutus_virel', 'Lutus Virel', 'Humano', 'Bibliotecário-chefe da Biblioteca Santa de Novo Porto', null, 'novo-porto', 'novo-reino-h24-d82a4d49', null, null,
$t$A Biblioteca Santa de Novo Porto, uma das maiores do Mundo Conhecido, foi criada por um só homem: Lutus dedicou a vida a recolher e catalogar pergaminhos, livros e diários de toda Tagmar.
Deve ter perto de noventa anos, e dizem que está são de corpo e mente. Frágil na aparência, mas de vigor quase sobrenatural; cabelos brancos, meio calvo, olhos de um azul profundo e voz límpida. Cativante, de uma juventude que não passa.$t$),

('calamar_orlenca', 'Calamar Orlença', 'Humano', 'Escrivão-Chefe de Torbel', null, 'torbel', 'novo-reino-h24-d82a4d49', null, null,
$t$Homem de ascendência nobre, redige as leis e os projetos de justiça e de administração da Cidade-Estado de Torbel. Um dos três líderes da cidade.
De meia-idade, cabelos grisalhos, estatura média e voz calma e clara. Controlador e dominante, combina bem com o cargo.$t$),

('samos_de_liria', 'Samos de Liria', 'Humano', 'Grande-Juiz de Torbel', null, 'torbel', 'novo-reino-h24-d82a4d49', null, null,
$t$Nobre, responsável pela justiça de Torbel, é o mais velho e o mais respeitado dos três líderes da cidade. Cabelos brancos, pele alva, voz grave e empostada, temperamento sério e atento.
Homem de grandes virtudes e sabedoria sem par, é o melhor exemplo de que a democracia pode vir a ser o melhor dos governos.$t$),

('malori_alduias', 'Malori Alduias', 'Humano', 'Executor-Chefe de Torbel', null, 'torbel', 'novo-reino-h24-d82a4d49', null, null,
$t$Grande comerciante, cuida dos bens públicos, do exército e da guarda dos vilarejos de Torbel. Não tem talento guerreiro: é a prova de como a influência põe homens no poder.
Aparência comum, cabelos curtos e olhos negros, voz quase lírica e bem acima do peso; passaria fácil por trovador. Encanta qualquer um com quem fale, e, mesmo de modos finos, sabe ser firme e até rude quando precisa.$t$),

('menelau', 'Lorde Menelau', 'Humano', 'Oligarca-Regente de Estepe', null, 'estepe', 'novo-reino-h24-d82a4d49', 'Sucedeu o pai no comando de Estepe.', null,
$t$O maior dono de terras de Estepe e, Torbel à parte, o melhor e mais justo dos Oligarcas-Regentes. Ainda assim é contra a democracia de Torbel: governa com parcimônia e justiça uma população de servos dominada por nobres e grandes comerciantes.
Polido, sempre de penteado diferente, bom político e grande conversador, calmo mesmo nas piores horas. Com olhos azuis como o mar, percebe os menores detalhes de cada situação.$t$)

on conflict (slug) do nothing;
