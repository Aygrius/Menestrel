/* ============================================================
   ENTIDADES — deuses, titãs e príncipes de Tagmar (08/11/2026)
   ============================================================
   Usuário: "Em ambientação, junto com Reinos, Cidades, etc, crie um novo menu
   chamado Entidades, onde vamos colocar os deuses, titãs e príncipes." Os
   tópicos de cada uma são os dele: Nome, Prefácio, Descrição, Relações,
   Locais, Feriados e Itens.

   É CATÁLOGO DO MUNDO, no código e não no banco: o que um deus é não muda de
   mesa para mesa, e ninguém edita pela tela. O texto sai dos livros em
   tagmar/ (deuses.pdf, principes.pdf), reescrito pela skill
   cronista-de-tagmar (.claude/skills/).

   FERIADOS: a entidade é a FONTE dos seus feriados. O calendário
   (FERIADOS_FANTASY, 10-shell/shell.jsx) junta os daqui à lista fixa dele —
   uma fonte só por feriado, como pede o comentário de FANTASY_MONTHS.

   Texto: cada "\n" é um parágrafo (a mesma regra da ficha de lore; sem
   Markdown). `fonte` é a assinatura em itálico no fim do prefácio.
   ============================================================ */

const ENTIDADE_CLASSES = {
  deus:     { pt: 'Deus',     en: 'God' },
  deusa:    { pt: 'Deusa',    en: 'Goddess' },
  tita:     { pt: 'Titã',     en: 'Titan' },
  principe: { pt: 'Príncipe', en: 'Prince' },
  princesa: { pt: 'Princesa', en: 'Princess' },
};

const ENTIDADES = [
  {
    slug: 'cruine',
    nome: 'Cruine',
    classe: 'deus',
    // O domínio, sem repetir a classe: o cartão já diz "Deus" na linha de cima.
    titulo: 'Morte e Vida',
    imagem: null,
    // Fonte: deuses.pdf, págs. 40–43 (3.5 Cruine); Maira, pág. 64; principes.pdf, Ricutatis, pág. 81.

    prefacio: {
      texto:
        'Crassius despertou numa caverna de rocha nua, banhada por uma penumbra que não vinha de tocha nenhuma. Ao redor, uma multidão de rostos tão perdidos quanto o seu. Levou a mão à cintura em busca da espada e não a encontrou.\n' +
        'Então viu o irmão. O mesmo que vendera ao inimigo a trilha secreta para a retaguarda, em troca de ouro e de um cargo; o mesmo que Crassius derrubara do alto de um penhasco com a última flecha, já com a morte cravada no próprio peito. O irmão também o viu, e o pavor nos olhos dele devolveu a Crassius tudo o que a memória ainda lhe negava.\n' +
        'Um trovão rolou pela caverna. Adiante, num trono de pedra, estava sentado um homem vestido de negro, de coroa negra e cabeça baixa; os longos cabelos lhe escondiam o rosto. Não era preciso vê-lo. Aquele era Cruine, o deus da Morte e da Vida, e aquele era o seu reino.',
      fonte: 'Extratos do Livro de Maudi — Biblioteca de Saravossa.',
    },

    descricao:
      'Há muitas eras coube a Cruine guardar o que vem depois da morte. Toda alma que cruza o limiar do mundo dos mortos é levada diante do seu trono, onde ele a julga, pune ou recompensa, e reconduz à vida as que devem renascer. Os povos de Tagmar lhe confiam essa tarefa por uma razão só: Cruine não pende para lado nenhum.\n' +
      'Engana-se quem o chama de deus da morte. Ele é o senhor do pós-morte, e também da ressurreição e da renovação, a prova de que um broto novo sempre se ergue onde outro tombou. Por isso é hospitaleiro à sua maneira: em seus domínios há sempre lugar para mais uma alma.\n' +
      'Sua imparcialidade cede num único ponto. Cruine tem ódio e repulsa aos mortos-vivos e aos demônios, que torcem o ciclo natural da vida, e exige o mesmo de quem o serve.\n' +
      'Passa séculos imóvel no trono, cabisbaixo, os cabelos sobre o rosto, e quase nunca se ocupa dos assuntos do mundo de cima. O povo o tem por impiedoso: como a morte, não distingue rico de pobre nem velho de criança, e não se comove com o pranto de mães, esposas e filhos.\n' +
      'É pintado como um juiz de capuz negro sobre os olhos, com uma balança à frente; em outras terras, como o homem do trono, de cabelos negros caídos sobre o rosto. Seu símbolo mais comum é o eclipse: um círculo negro que cobre quase todo um círculo branco, a luz do dia vencida pela noite. Mais raro é o círculo partido ao meio, metade negro e metade branco, o dia e a noite que se alternam como a vida e a morte. Sua cor é o preto.\n' +
      'O culto está em toda parte e em parte nenhuma se concentra. Juízes e magistrados o invocam antes de cada sentença; as grávidas, antes do parto. Cresce depressa nas fronteiras de Verrogar, onde todos aguardam a guerra; em Luna, é escudo contra a peste; em Telas e nas cercanias d\'Os Mangues, contra os zumbis. Mesmo quem reza a outro deus guarda um jeito seu de honrar Cruine.\n' +
      'Seus sacerdotes ensinam o ciclo aos fiéis e ajudam as almas a aceitar a própria morte, na esperança de renascer. Cuidam dos ritos fúnebres de reis e de aldeões, e todo templo de Cruine tem um cemitério nos fundos; no porão, os corpos são lavados e embalsamados para o velório. As sacerdotisas são parteiras de mão firme, pois o nascimento também é parte do ciclo. Vestem mantos negros e espessos, de capuz largo que deixa o rosto em sombra, e os templos seguem o estilo gótico: sóbrios, mal iluminados, com poucas imagens, quase sempre do próprio deus.\n' +
      'As doutrinas são quatro: não tolerar o que deturpe o ciclo da vida, caçando mortos-vivos e demônios; respeitar a vida que a mãe carrega no ventre; honrar os mortos e rezar pelo seu descanso; e enterrar todo morto, mesmo o indigente. Com o avanço das seitas demonistas, as ordens de Cruine pressionam os reinos e cobram de seus governantes uma resposta.',

    relacoes: [
      { nome: 'O Panteão',
        texto: 'Cruine trata os outros deuses com cortesia e poucas palavras, e ninguém sabe ao certo o que sente por eles. Ainda assim é muito respeitado: o Panteão tem por essencial o equilíbrio que ele guarda.' },
      { nome: 'Blator',
        texto: 'Ensinou aos filhos que a guerra sem a morte não seria a mesma, e que o senhor do pós-morte merece respeito. Durante a guerra contra a Seita, reuniu-se com Cruine muitas vezes; o que diziam, ninguém sabe.' },
      { nome: 'Crizagom',
        texto: 'Toma parte nos julgamentos de Cruine: intercede pelas almas que agiram com justiça e cobra penas duras das que agiram com malícia.' },
      { nome: 'Crezir',
        texto: 'Dizem que é a preferida dele. Depois de longos anos imóvel, Cruine ergueu a cabeça só para vê-la entrar, quando ela veio pedir que um de seus sacerdotes voltasse ao mundo dos vivos para cumprir sua vingança. Nem a própria deusa ousou tirar o boato a limpo.' },
      { nome: 'Maira',
        texto: 'Com Cruine, forma o começo e o fim da jornada: um acordo de muitos milênios do qual nasceu o ciclo da vida.' },
      { nome: 'Palier',
        texto: 'Costuma dizer que decifrar os sentimentos de Cruine é tarefa impossível até para ele.' },
      { nome: 'Ricutatis',
        texto: 'O príncipe infernal que recebe as almas no plano dos demônios inveja Cruine de morte: acredita que ele lhe usurpou o cargo e a função.' },
      { nome: 'Descendentes',
        texto: 'Não há descendentes conhecidos.' },
    ],

    locais: [
      { nome: 'Santuário da Cordilheira da Navalha', onde: 'Luna',
        texto: 'O principal lugar sagrado de Cruine em Tagmar: um grande santuário escavado nas cavernas da cordilheira. É a sede da Ordem da Noite Eterna, fundada por Galana, uma morta-viva arrependida do próprio destino. Conta a lenda que o próprio Cruine a instruiu e que, fundada a ordem, a acolheu em seu reino.' },
      { nome: 'Grande Templo de Saravossa', onde: 'Saravossa',
        texto: 'O maior templo do deus, ao lado do maior cemitério de Tagmar, onde repousam grandes reis. No dia de Cruine, peregrinos de muitas terras vêm rezar entre os túmulos.' },
      { nome: 'Templo de Dameste', onde: 'Dameste',
        texto: 'Erguido perto da fronteira com o Campo Branco. Ali os sacerdotes rezam pelo descanso dos fantasmas que vagam pelo campo.' },
      { nome: 'Templo de Telas', onde: 'Telas',
        texto: 'Onde se reza pelo descanso dos zumbis d\'Os Mangues.' },
    ],

    feriados: [
      { dia: 1, mes: 13, nome: 'Festa do Ciclo Natural da Vida',
        texto: 'O último dia do ano é o único consagrado a Cruine: o fim de um ciclo e o começo do seguinte. Pela manhã, grávidas e mães de recém-nascidos vão aos templos receber a bênção. À tarde, as famílias visitam os cemitérios e rezam pelos mortos. À noite, reúnem-se para a ceia, e um lugar fica vazio à mesa: o de Cruine, que tem assento em toda casa. Em algumas terras, o dia é feriado.' },
    ],

    itens: [
      { nome: 'Grilhões de Cruine',
        texto: 'Lanças abençoadas que imobilizam mortos-vivos ao toque. As ordens de Cruine guardam muitas armas assim, pois caçar os que não descansam é parte do seu ofício.' },
      { nome: 'Vingadoras Sagradas',
        texto: 'Espadas dos membros da Ordem da Noite Eterna.' },
      { nome: 'Anel do Juiz Perfeito',
        texto: 'Revela a quem o porta se o acusado é culpado ou inocente do crime de que o acusam.' },
      { nome: 'Espelho de Cruine',
        texto: 'Um grande espelho que seria a porta para o reino dos mortos. Ninguém sabe se existe. Dizem que no alto da moldura está escrito: «Deixai para trás toda esperança, vós que entrais no Reino de Cruine.»' },
      { nome: 'Joia de Cruine',
        texto: 'Uma pedra negra e ovalada. Diz-se que por ela se fala com o próprio deus, em seu reino.' },
    ],
  },
  {
    slug: 'maira',
    nome: 'Maira',
    classe: 'deusa',
    titulo: 'Natureza',
    imagem: null,
    // Fonte: deuses.pdf, págs. 64–68 (3.9 Maira); Crezir, Crizagom, Ganis, Palier, Parom, Plandis, Quiris, Selimom e Cambu;
    // principes.pdf, Mocna (pág. 75), Morrigalti (pág. 76) e Udoviom.

    prefacio: {
      texto:
        'Vencida a guerra contra os titãs, coube a Maira, a rainha imponente e sábia, comandar os elementos arrancados dos vencidos. Ela soprou sobre o ar e a água e estendeu um manto de névoa pelo universo; ainda não havia alto nem baixo, norte nem sul. Depois misturou o fogo e a terra numa palma e bateu sobre ela com o punho, e do choque nasceram vulcões, vales e cordilheiras que vagavam pela bruma.\n' +
        'Para encher o vazio entre as terras, chamou Ganis, que fez uma concha com as mãos e deixou a água escorrer entre os dedos até formar os rios, os lagos e os oceanos. Então Maira apertou o fogo que restava até caber numa cabeça de alfinete e o soltou no céu: ele se partiu em faíscas sem conta, e a maior delas virou o sol.\n' +
        'Mesmo assim o céu da noite lhe pareceu vazio. Tirou da própria luz três grandes luas, que movem as marés e o coração dos que vieram depois. Por fim, com o irmão Sevides e os sobrinhos Liris e Quiris, encheu as terras e as águas de bichos e plantas. O mundo estava pronto para receber os Filhos.',
      fonte: 'Extratos do Livro de Maudi, capítulo «A Criação» — Biblioteca de Saravossa.',
    },

    descricao:
      'Muitos povos a chamam de Grande Mãe. Maira é a senhora dos animais, das plantas e das pedras, e reina sobre as florestas e tudo o que vive nelas; diz-se que as matas são o seu reino, as montanhas os seus castelos e os bichos os seus súditos. Ela vive em toda a sua criação ao mesmo tempo, da semente que germina à árvore que frutifica, da cria que nasce ao animal que envelhece, da pedra que se forma à rocha que se gasta. Poucos deuses são tão cultuados, e o Panteão inteiro a respeita.\n' +
      'Os sábios a dividem em três faces: Maira Nil, que tudo sabe do reino animal; Maira Vet, senhora do verde; e Maira Mon, que comunga com as pedras. É uma deusa só, e ela não se opõe à divisão. Sem a sua bênção nada cresce, nenhuma flor se abre e nada se reproduz. Por isso a invocam mineiros, lavradores, rastreadores e todo ofício que vive do que a terra dá.\n' +
      'Seu temperamento é calmo e benévolo, e suas criaturas herdam esse equilíbrio. Vive em paz nas terras ermas, mas, quando algo ameaça as florestas ou os animais, arde em fúria e aniquila quem lhes fez o menor dano. Na guerra, mostra-se grande estrategista.\n' +
      'É pintada como uma mulher de estatura mediana, de longos cabelos castanhos e ondulados e olhos verdes que puxam para o cinza, andando pelas matas e montanhas com os animais que encontra pelo caminho. Também a lembram os animais que falam, as pedras de brilho raro e as árvores milenares. Seu símbolo é a tríade: dois círculos entrelaçados, em que o crescente da esquerda são as garras de Nil, a elipse do meio é a semente de Vet e o minguante da direita é a solidez de Mon. Sua cor é o verde, forte e vivo.\n' +
      'Tem fiéis em todo o mundo, dos povos selvagens e dos elfos de Âmiem aos gnomos de Gironde. Mon é venerada pelos mineiros da Cordilheira de Sotopor, em Dantsem, e em Blur; Vet, em Âmiem e nas aldeias à beira das matas; Nil, entre pastores e caçadores. O povo a chama de Rainha e Mãe, mas a sua influência vem caindo há alguns anos, sobretudo nas nações dadas à guerra e nas que querem crescer a qualquer custo.\n' +
      'A religião prega o amor aos animais, o respeito às florestas e o uso comedido das pedras e dos metais, sem esgotar o que a terra guarda. Esse comedimento põe os sacerdotes muitas vezes contra os grandes senhores de terras. Mesmo assim, têm muita voz nos reinos, sobretudo nos mais pobres em recursos, que dependem deles para achar madeira, ervas e minério.\n' +
      'Os templos são simples e belos: dois prédios de dois andares, com dormitórios, biblioteca e salas de estudo, separados por um jardim que toma quase todo o terreno, mesmo nas cidades mais cheias. O jardim é cercado de muros cobertos de trepadeiras, e todas as janelas dão para ele, nenhuma para fora. No centro ficam três altares: uma pedra, um animal esculpido em madeira e uma pequena muda. Ninguém entra calçado; as botas ficam numa sala à entrada, aos cuidados de um sacerdote.\n' +
      'Os sacerdotes vestem algodão tingido de verde, com uma faixa cruzada no peito que traz o símbolo da deusa. Os noviços cobrem toda a cabeça com o capuz até alcançarem a sua «visão», a bênção de Maira, e só então andam de cabeça descoberta. Fora do templo usam chinelos; dentro, andam descalços. As doutrinas são quatro: paz aos Filhos dos deuses, amor aos animais e às plantas, busca do equilíbrio da vida e da natureza, e combate sem trégua às forças malignas e demoníacas que desarmonizam o mundo.',

    relacoes: [
      { nome: 'O Panteão',
        texto: 'Todos os deuses respeitam Maira, e o peso dela no Panteão é imenso.' },
      { nome: 'Palier',
        texto: 'O rei do Panteão e pai de seu filho. Ela lhe tem grande afeto, e ele, mestre em ensinar, também sabe ouvi-la. Foi depois de uma conversa acalorada com Maira e Parom que Palier deu aos elfos o dom de se mesclar à natureza e de trabalhar os seus elementos.' },
      { nome: 'Parom',
        texto: 'O filho, a quem trata com mimos como se ainda fosse criança. Para Parom, ela é a mãe afetuosa que a tudo atende.' },
      { nome: 'Selimom',
        texto: 'Irmão e principal conselheiro. É junto dele que Maira encontra paz nos tempos difíceis.' },
      { nome: 'Sevides, Liris e Quiris',
        texto: 'O irmão e os dois sobrinhos que a ajudaram a povoar o mundo, e seus amigos mais prezados na tarefa de manter o equilíbrio da vida. Quiris é, entre os deuses, quem passa mais tempo com ela, conversando ou observando o que ela faz pela natureza e pelos animais.' },
      { nome: 'Ganis',
        texto: 'Atendeu ao chamado de Maira e encheu de água o vazio entre as terras. Respeita a deusa em muitos assuntos dos mortais, mas guarda opinião e interesses próprios.' },
      { nome: 'Blator, Crezir e Crizagom',
        texto: 'Relação difícil, ainda que respeitosa. Maira não entende a destruição que Crezir impõe ao mundo, e as duas discordam por isso. Crizagom quase não a procura: não tem por dignas de atenção as criaturas dela, que em sua maioria não sabem julgar.' },
      { nome: 'Cruine',
        texto: 'Com ele, forma o começo e o fim da jornada: um acordo de muitos milênios do qual nasceu o ciclo da vida.' },
      { nome: 'Lena e Plandis',
        texto: 'Para Maira, são crianças brincalhonas, muitas vezes pegas em travessuras com os Filhos dos deuses. Foi Plandis quem lhe trouxe o maior pedaço do espelho de Cronus. Dizem as más línguas que Maira copiou o corpo de Lena ao criar as ninfas.' },
      { nome: 'Cambu',
        texto: 'Seu mensageiro. Quando Maira o convoca para levar aos mortais a vontade dos deuses, ele vai de bom grado, sobretudo se a notícia é boa.' },
      { nome: 'Udoviom',
        texto: 'O Senhor da Pestilência odeia Maira e tudo o que ela criou. Sua cidade infernal, Crinato, é uma afronta à deusa: campos comidos por insetos e um palácio no tronco de uma árvore morta. O guardião, Alcrinontes, foi em vida um médico devoto de Maira, que a renegou quando ela não salvou a sua esposa.' },
      { nome: 'Mocna',
        texto: 'O Horror Noturno guarda o seu ódio maior para Maira e Crezir.' },
      { nome: 'Morrigalti',
        texto: 'No dia em que se adora Maira Nil, os cultistas do Genocida celebram a Prisão Dourada: atacam povoados élficos e enterram vivos os prisioneiros.' },
      { nome: 'Descendentes',
        texto: 'Com Palier, teve um único filho: Parom, o deus dos artífices.' },
    ],

    locais: [
      { nome: 'Florestas milenares de Âmiem', onde: 'Âmiem',
        texto: 'Toda floresta é sagrada para a ordem, e estas mais que as outras: são tidas como obras-primas de Maira. Os elfos de Âmiem cultuam sobretudo a face de Vet.' },
      { nome: 'Florestas milenares de Lar', onde: 'Reino dos elfos',
        texto: 'A outra obra-prima da deusa, igualmente sagrada para a ordem.' },
      { nome: 'Templo de Mon', onde: 'Blur',
        texto: 'No ponto mais fundo da montanha dos anões. Ali repousam as estátuas da Adoração a Maira Mon, uma por ano, cada uma de uma pedra diferente. Só os nobres da cidade entram, e guerreiros mestres de armas vigiam a porta, pelo valor das estátuas e pelo que elas representam.' },
      { nome: 'Cordilheira de Sotopor', onde: 'Dantsem',
        texto: 'Terra de comunidades mineiras devotas de Maira Mon.' },
      { nome: 'Rapso', onde: 'Rapso',
        texto: 'Conta-se que, numa das noites do Festival de Renascimento, um sátiro criado por Maira apareceu para festejar com os fiéis, e que todos o tomaram como sinal de que a deusa aprovava a festa.' },
    ],

    feriados: [
      { dia: 17, mes: 1, nome: 'Adoração a Maira Mon',
        texto: 'Festa criada pelos anões de Blur em agradecimento pelo minério de cada ano e pelas montanhas onde escavam as suas cidades. Os melhores escultores talham uma nova estátua da deusa, sempre numa pedra que ainda não foi usada. Pronta, ela percorre a cidade anã escoltada por guerreiros mestres de armas e termina no Templo de Mon, ao lado das outras.' },
      { dia: 2, mes: 4, nome: 'Adoração a Maira Vet',
        texto: 'Criada pelos humanos, e depois adotada por outras raças, para que Mon não fosse a única face com dia próprio. Varia de terra para terra e é festejada em todos os templos de Maira. Os sacerdotes reúnem os fiéis junto às árvores mais antigas da região para sermões e orações, seguidos de um banquete quase todo de vegetais.' },
      { dia: 20, mes: 9, nome: 'Adoração a Maira Nil',
        texto: 'Nascida do mesmo desejo de honrar por igual as três faces, e a menos festejada delas. Nesse dia oferece-se alimento aos animais selvagens da região, em agradecimento pelas dádivas da deusa. É também o dia da Prisão Dourada, em que os cultistas de Morrigalti atacam povoados élficos.' },
      { dia: 3, mes: 10, nome: 'Festival de Renascimento de Maira',
        texto: 'Festejado sobretudo nas grandes cidades que vivem da madeira das matas vizinhas, no começo da primavera: dizem os fiéis que a deusa renasce a cada ano quando as flores se abrem, mais forte que antes. Durante três dias, plantam mudas onde a mata foi derrubada, para devolver à deusa o que lhe tiraram. Toda noite há festa com música e artistas, e os nobres costumam doar ao povo as frutas, os grãos, as sementes, o vinho e a cerveja.' },
      { dia: 13, mes: 11, nome: 'Culto à Tríade',
        texto: 'A festa mais popular da deusa, celebrada por quase todos os povos que honram as três faces. Uma grande estátua de mulher é posta sobre um altar imenso, e os fiéis deixam à sua base plantas raras, pedras brutas e comida para os animais. Cada família deve mandar ao menos um dos seus com uma oferenda, em gratidão por viver do que Maira criou.' },
    ],

    itens: [
      { nome: 'Colar de Sementes',
        texto: 'Feito de pequenas sementes de todas as árvores de Tagmar, de fruto ou não. Com as orações ensinadas nos templos, permite falar diretamente com Maira.' },
      { nome: 'Pedra de Mon',
        texto: 'Uma pedra de calcário de pouco mais de um palmo, marcada com o símbolo de Mon. Revela a quem a porta os tesouros minerais escondidos na terra.' },
      { nome: 'Espelho de Cronus',
        texto: 'O maior dos sete pedaços do espelho do titã do tempo, que Plandis trouxe à deusa. Maira o pôs em sua fonte e por ele vê o futuro dos mortais, mas só em parte, pois o espelho partido não mostra tudo.' },
    ],
  },
  {
    slug: 'palier',
    nome: 'Palier',
    classe: 'deus',
    titulo: 'Magia, Conhecimento e Alquimia',
    imagem: null,
    // Fonte: deuses.pdf, págs. 70–73 (3.10 Palier); Cambu, Crezir, Crizagom, Cruine, Maira,
    // Parom, Plandis, Selimom e Sevides; principes.pdf, Morrigalti (Morrigaltrina, Ponte de Morrigalti, Prisão Dourada).

    prefacio: {
      texto:
        'No princípio, Tagmar era só rocha e água, e cada deus buscou dentro de si a forma dos filhos que haveria de pôr no mundo. Palier estudou e refletiu por muito tempo, até decidir criar seres tão perfeitos quanto ele: parecidos com os animais que Maira fizera antes, porém mais espertos; graciosos, mas não fracos.\n' +
        'No dia do nascimento, bradou aos céus que criatura nenhuma chegaria aos pés deles. Faltava-lhes um nome, e ele procurou um que mostrasse todo o poder divino. «Vou chamá-los de elfos», gritou.\n' +
        'Levou a notícia ao salão real, a Maira e ao filho Parom. Disse que os elfos seriam seres de luz e de saber; Parom quis saber o que fariam no mundo, e pai e filho discutiram longamente o conhecimento e a prática. Dessa conversa acalorada Palier tirou os últimos dons: o de se mesclar à natureza e o de trabalhar seus elementos com perfeição, em armas, armaduras e moradas que se harmonizam com a mata ao redor. Assim, da união de três deuses, nasceram os elfos.',
      fonte: 'Extratos do Livro de Maudi, do capítulo «A Criação» — Biblioteca de Saravossa.',
    },

    descricao:
      'Palier é o deus da magia, do conhecimento e da alquimia, e o conselheiro dos deuses. Seus devotos o chamam de «O Grande Saber» e de «O Mago Divino», e o Panteão o tem entre os seus mais poderosos. Tanto saber o faz parecer frio e arrogante a quem fala com ele, mas a impressão engana: Palier é paciente e tolerante com os filhos, porque sabe que são seres limitados.\n' +
      'Pode ser a melhor companhia que alguém deseje e, quando quer, a mais insuportável. Seus argumentos são precisos e quase sempre lhe dão razão, e isso basta para atiçar brigas no Panteão.\n' +
      'É pintado como um elfo belíssimo, alto e magro, de porte nobre, em roupas finas e adornado de joias, culto nas maneiras e no falar. Seu símbolo é o livro aberto, um retângulo partido ao meio no sentido do comprimento, e por ele seus fiéis se reconhecem em toda Tagmar. Sua cor é o laranja.\n' +
      'Os elfos, sua maior criação, o veneram com fervor e o julgam incomparável aos outros deuses. Palier escolhe a dedo os seus seguidores entre os que têm fome de saber, e muitos deles disputam entre si quem é o mais digno de sua atenção. O culto pende para a aristocracia e para as grandes cidades onde o saber se guarda; o povo o tem por deus de gente fina e rica, mas o procura quando busca iluminação para o que o aflige. Nos Colégios Arcanos, os estudantes fazem uma oferenda grande antes de cada prova, para que o nervo se acalme e as ideias venham claras, e quem a esquece vira alvo de zombaria.\n' +
      'É venerado em quase toda Tagmar, com maior força em Calco, Filanti, Âmiem e Portis. Sábios, magos e estudiosos buscam nele resposta para questões de estado e da vida privada, e seus sacerdotes, mais que homens de fé, são sábios renomados em tudo, da administração à poesia.\n' +
      'A religião une louvor e prática mística. Ensina que a magia está em todas as coisas, vivas ou não, e as liga e molda num grande todo; por isso os sacerdotes pregam a paz e a harmonia entre elas. Nos cultos há manifestações místicas e grande concentração de Mana.\n' +
      'Os templos têm dois andares. O de baixo é dos fiéis que vêm louvar; o de cima guarda uma vasta biblioteca, onde se catalogam livros que são copiados e enviados a outros templos. Qualquer um pode subir, desde que cumpra os ritos de purificação da entrada e ande sempre ao lado de um sacerdote. Estes vestem trajes simples e minuciosos, laranja, amarelos ou brancos, com o livro aberto bordado no peito, e um chapéu pequeno e redondo com manta de linho que cobre a cabeça e deixa só o rosto à mostra. Nunca andam sem um pequeno livro de orações, onde leem os desígnios do deus.\n' +
      'As doutrinas são quatro: amor a todos os seres vivos; o conhecimento profundo da natureza física e mística; a iluminação contra a ignorância; e a busca da verdade.',

    relacoes: [
      { nome: 'O Panteão',
        texto: 'Todos o respeitam como o conselheiro perfeito, e com a maioria mantém uma relação cordial de auxílio mútuo. Ainda assim, às vezes o evitam: quem sempre tem razão também cansa.' },
      { nome: 'Maira',
        texto: 'A rainha e esposa do rei Palier. Com ela, ele sabe ouvir tanto quanto falar, e ela tem por ele grande afeto, sempre pronta a conversar e a atender seus chamados.' },
      { nome: 'Parom',
        texto: 'O filho de longas conversas, acaloradas a ponto de beirar a discussão, em que Parom muitas vezes discorda do pai com veemência. Nunca falta respeito entre os dois.' },
      { nome: 'Lena',
        texto: 'Diz ter gosto pelo amor entre ela e Parom, mas os olhos desmentem a boca: guardam receio do futuro desse romance.' },
      { nome: 'Selimom',
        texto: 'Companhia agradável nas longas caminhadas pelo bosque e nos estudos na biblioteca de Palier.' },
      { nome: 'Crezir',
        texto: 'Tem Palier por seu maior desafeto e o chama de arrogante. A deusa da guerra não admite magia em batalha, que tira o prazer do choque das espadas.' },
      { nome: 'Cambu',
        texto: 'Palier se impacienta com a agitação constante do deus do comércio e com sua falta de atenção.' },
      { nome: 'Crizagom',
        texto: 'Palier nunca demonstrou se importar muito com ele.' },
      { nome: 'Cruine',
        texto: 'Palier costuma dizer que decifrar os sentimentos de Cruine é tarefa impossível até para ele.' },
      { nome: 'Plandis',
        texto: 'Quando nem Blator vencia o titã Cronus, Palier e Maira convocaram Plandis e o armaram com um simples punhal feito por Parom.' },
      { nome: 'Sevides',
        texto: 'Tem por Palier grande afeição.' },
      { nome: 'Morrigalti',
        texto: 'O mais antigo dos Príncipes Infernais convenceu Palier de que era preciso guerrear os titãs e selou com ele um pacto de sangue, querendo os titãs fora do caminho para trazer ele mesmo o fim de tudo. Palier só fingiu entrar no jogo: vencida a guerra, criou o limbo e nele isolou os Príncipes e suas hostes. Morrigalti o odeia mais que a qualquer outro deus, pois cada um é o mais poderoso entre os seus, Palier dos que criam e Morrigalti dos que destroem. Seus cultistas juram ódio aos elfos e aos adoradores de Palier.' },
      { nome: 'Descendentes',
        texto: 'Com Maira, teve Parom, o deus dos artífices. Do pacto de sangue com Morrigalti nasceu a titã-segunda Morrigaltrina, a filha de dois pais, que ajudou Palier a derrotar Étere e depois tomou o partido do pai infernal.' },
    ],

    locais: [
      { nome: 'Lar', onde: 'Reino dos elfos',
        texto: 'O berço dos elfos e a morada de Palier na terra.' },
      { nome: 'Ponte de Palier', onde: 'Floresta de Âmiem',
        texto: 'Tida como a entrada para os reinos celestiais e para a grande casa de Palier. No ponto místico oposto a ela, os demonistas abriram a Ponte de Morrigalti, caminho dos demônios para o mundo material.' },
      { nome: 'Fonte das Sagradas Escrituras', onde: 'Lugar secreto',
        texto: 'Ninguém sabe onde fica. Muitos especulam que esteja em Saravossa, no subsolo de um dos templos.' },
    ],

    feriados: [
      { dia: 19, mes: 2, nome: 'Culto à Elevação',
        texto: 'Criado pelos elfos. Neste dia saem de casa entoando cânticos para elevar aos céus a adoração ao pai; unindo a voz à dele, alcançam a pureza de espírito da raça. Em certos lugares, sacerdotes e magos de Palier que não são elfos também o celebram.' },
      { dia: 9, mes: 8, nome: 'Festa da Iluminação',
        texto: 'Exclusiva dos elfos. Com cânticos e músicas da raça, renovam velhos traços de sua cultura e exaltam as próprias conquistas. É uma festa vaidosa por natureza, e mesmo assim muito apreciada pelo povo.' },
      { dia: 6, mes: 9, nome: 'Dia da Magia',
        texto: 'A principal festa dos humanos em honra de Palier, nascida, contam as lendas, nas terras de Saravossa; cai no mês da Sabedoria, o mês de Palier. Nas cidades grandes há um concurso de magia só para místicos; em Runa e Saravossa, ele se faz em praça pública. Ao fim do dia, todos seguem para o templo, onde os sacerdotes entoam com os fiéis os cânticos sagrados.' },
    ],

    itens: [
      { nome: 'Fonte das Sagradas Escrituras',
        texto: 'O item mais sagrado da ordem, acima de todos os livros raros guardados nas bibliotecas do mundo. Dizem que quem bebe de sua água recebe a luz do conhecimento e a resposta às suas perguntas mais profundas.' },
      { nome: 'Livro de Palier',
        texto: 'Também chamado Livro das Sagradas Escrituras: um tomo enorme com toda a história do mundo desde o Primeiro Ciclo, deixado por Palier aos elfos para que o guardassem. Quando os mortais se afastaram dos deuses e os deuses vieram a Tagmar trazendo o Cataclismo, o livro se perdeu. Só alguns pergaminhos de sacerdotes do Segundo Ciclo ainda o citam como a maior relíquia que um servo poderia guardar.' },
    ],
  },
  {
    slug: 'plandis',
    nome: 'Plandis',
    classe: 'deus',
    // O domínio, sem repetir a classe: o cartão já diz "Deus" na linha de cima.
    titulo: 'Loucura e Paixão Cega',
    imagem: null,
    // Fonte: deuses.pdf, págs. 80–84 (3.12 Plandis; a página-título 79 grafa "Pladis"); capítulos de Blator, Cambu,
    // Crezir, Crizagom, Lena, Maira, Selimom e Sevides; principes.pdf, 3.3 Branaxis.

    prefacio: {
      texto:
        'Quando os deuses ainda eram jovens e só dois mundos existiam, o titã Cronus, senhor do tempo, vencia todos os que o enfrentavam. Tinha seis braços e um espelho místico onde lia o golpe do inimigo antes que fosse dado. Nem Blator, o mais forte dos deuses guerreiros, conseguiu derrubá-lo.\n' +
        'Palier e Maira chamaram então Plandis e lhe deram um punhal simples, forjado por Parom. Maira mandou que vencesse o titã e lhe trouxesse o espelho, sem nunca olhar dentro dele. Blator riu: se ele não vencera Cronus, que faria um fedelho distraído? Plandis pegou o punhal e partiu sem responder, aéreo como em qualquer outro dia.\n' +
        'Cronus o viu chegar e buscou no espelho o que o oponente faria. Desta vez as imagens não paravam: mil realidades, milhares de caminhos, um atrás do outro. Hipnotizado, o titã não se moveu enquanto Plandis caminhava devagar até ele e lhe abria o pescoço. Morreu vendo possibilidades sem fim, até que deixou de vê-las.\n' +
        'Plandis, tomado pela curiosidade, olhou o espelho. Ele se partiu em sete pedaços, e dos seis menores nasceram as Planindeas. O sétimo e maior, Plandis levou a Maira, que o pôs em sua fonte; por ele a deusa vê o futuro dos mortais, mas só em parte.',
      fonte: 'Extratos do Livro de Maudi — Biblioteca de Saravossa.',
    },

    descricao:
      'Filho de Crezir e Selimom, a Fúria e a Paz, Plandis é o deus dos loucos e dos inconsequentes, da Loucura e da Paixão Cega. Onde os outros deuses obedecem a uma ordem, ele é o caos que cria e a liberdade que vai aonde nenhum deles alcança.\n' +
      'Parece andar sem rumo e fitar o nada. Mas sua mente enxerga padrões no acaso e, no emaranhado dos destinos, vê não um futuro e sim milhares deles. É esse dom que o arrasta para um mundo só seu, de delírios e fantasias, entre a realidade e a insanidade. Nos palácios celestes, cada passo seu abre um caminho novo.\n' +
      'Seu humor vai da tristeza à alegria num piscar de olhos. Conversa de bom grado com os outros deuses e depois some, a vagar sozinho pelos céus. Tem fama de fanfarrão, mas segue desígnios que os demais não alcançam. Inspira os artistas e também os guerreiros: quem se lança sozinho contra um exército para salvar a própria cidade é corajoso ou louco, conforme quem olha. Não admira que proteja aventureiros "corajosos".\n' +
      'É pintado como um rapaz de veste preta e branca, pintor, escultor ou outro artista, de passo despreocupado e olhar distante. Seu símbolo é a espiral preta e branca, o caminho para dentro de si. Suas cores são o preto e o branco em contraponto, quase sempre em xadrez, sem que uma ocupe mais espaço que a outra.\n' +
      'Grande parte do povo o reza para não ser tocado por suas "graças": contam de um rapaz que orava todo dia no templo, e que, perguntado por quê, respondeu que era para o deus não o escolher. Ainda assim, nestes tempos de medo e opressão, sua devoção cresce em muitos reinos. Os maiores cultos ficam nas fronteiras entre Levânia e Abadom, e nobres e reis consultam seus sacerdotes pelas visões, que nem sempre são claras nem confiáveis.\n' +
      'A religião não tem regra além da bondade e da presteza ao próximo. Os sacerdotes vagam em grupos de três ou quatro, ao acaso, dormindo onde a noite os pega, mesmo ao relento. Vestem mantos pretos e brancos com a espiral e levam uma bolsinha de pólen colhido na Floresta de Laudis. Quanto mais avançam no dom de predizer, mais sofrem a influência das Planindeas. Entre os bardos, seus devotos são quase tantos quanto os de Lena.\n' +
      'Os templos são redondos, de pedra ou madeira, com teto em abóbada; por dentro, cada um tem seu tema pintado, de céus estrelados a bichos. Não há altar nem bancos: reza-se sentado no chão, em silêncio. Junto à porta fica uma caixinha dourada com um pó fino de ouro preparado pelos sacerdotes, que o visitante pode aspirar para se aproximar do deus.\n' +
      'As doutrinas são seis: viver a liberdade, pois limites são prisões de mentes medrosas; libertar as pessoas da loucura de agir como todo mundo; seguir os impulsos atrás de um caminho novo; crer que o caos pode criar uma nova ordem; punir o mal; e viver a liberdade, repetida de propósito.',

    relacoes: [
      { nome: 'O Panteão',
        texto: 'Com os deuses, Plandis é instável: muitas vezes os ajuda, outras os atrapalha de caso pensado.' },
      { nome: 'Crezir',
        texto: 'A mãe não tem paciência com o filho, que acha relapso, mas é atenciosa e protetora. Seria louco quem tentasse ferir filho tão bem guardado.' },
      { nome: 'Selimom',
        texto: 'Pai e filho têm amizade verdadeira e passam horas conversando sobre tudo; no fim, nem Selimom sabe dizer do que falaram. Aos olhos dele, porém, Plandis e Lena são irresponsáveis e travessos.' },
      { nome: 'Lena',
        texto: 'A irmã é sua companheira nas peças que pregam nos mortais, e riem juntos depois de cada uma. Plandis sente ciúme quando ela dá atenção a Parom.' },
      { nome: 'Blator',
        texto: 'O avô o tem por inútil para quase tudo, embora Plandis já tenha provado seu valor muitas vezes.' },
      { nome: 'Crizagom',
        texto: 'Plandis simplesmente ignora a existência do tio.' },
      { nome: 'Cambu',
        texto: 'Prefere a companhia dos alegres, e Plandis está entre eles: passam horas a conversar.' },
      { nome: 'Sevides',
        texto: 'Tem por Plandis grande afeição.' },
      { nome: 'Maira',
        texto: 'Mandou-o buscar o espelho de Cronus e proibiu que olhasse nele; Plandis desobedeceu, mas lhe entregou o maior fragmento. Ela vê Plandis e Lena como crianças brincalhonas.' },
      { nome: 'Branaxis',
        texto: 'O titã-segundo do Medo aterrorizou a família de Plandis e invadiu seu reino. Na torre espiralada, Plandis o fez cair num sono eterno, arrancou-lhe a consciência e a selou numa urna escondida; o corpo jaz no fundo do inferno. Seus seguidores caçam sacerdotes de Plandis e guardam o Dia do Silêncio na mesma data da festa do deus, para afrontá-lo.' },
      { nome: 'Descendentes',
        texto: 'As seis Planindeas, nascidas do espelho de Cronus, são fragmentos da sua personalidade, filhas e servas que levam suas vontades ao mundo: Isífone, a da repetição sem controle; Egera, a do medo; Lecta, a das muitas personalidades; Enesis, a do humor súbito; Aquésia, a da tristeza e da apatia; e Eunenia, a da fúria inesperada. Dizem que concedem a visão do futuro aos mais fervorosos, ao preço de um mal da mente, passageiro ou para sempre.' },
    ],

    locais: [
      { nome: 'Templo dos Delírios', onde: 'Cordilheira de Sotopor, ao sul de Abadom',
        texto: 'O principal lugar sagrado de Plandis, em algum ponto da cordilheira que ninguém de fora sabe apontar. Conta-se que o culto de Branaxis nasceu em Abadom à procura dessa sede secreta.' },
      { nome: 'Floresta de Laudis', onde: 'Âmiem',
        texto: 'Destino das peregrinações dos sacerdotes e recanto muito buscado pelos noviços. É de lá que vem o pólen que cada sacerdote leva na bolsa.' },
    ],

    feriados: [
      { dia: 9, mes: 5, nome: 'Dia das Ilusões',
        texto: 'Festa que reúne os devotos. Na maior parte das terras onde se celebra, magos e sacerdotes de Plandis disputam um grande concurso de ilusões. Quem não é devoto costuma achar tudo maluquice e se afasta; para os fiéis, é data aguardada o ano inteiro.' },
      { dia: 19, mes: 7, nome: 'Representação de Plandis',
        texto: 'Um festival nas grandes praças das maiores cidades e capitais, de dias de festa e "loucuras", em que grandes artistas mostram suas obras e a criação corre solta. Toda festa começa com um momento solene de graças, em que todos saúdam o deus e lhe desejam felicidades. É também o dia que os seguidores de Branaxis escolheram para o seu Dia do Silêncio.' },
      { dia: 9, mes: 8, nome: 'Festa da Iluminação',
        texto: 'Data marcada para a peregrinação dos sacerdotes à Floresta de Laudis, em busca de entendimento e iluminação. Sendo o deus quem é, poucos a cumprem nesse dia: cada um escolhe quando e quantas vezes vai.' },
    ],

    itens: [
      { nome: 'Capa de Plandis',
        texto: 'Ninguém conhece todos os seus poderes; quem a veste sofre alucinações e ilusões de toda sorte. Descobriu-se que causa delírios insuportáveis a espíritos malignos e demônios, e por isso a ordem a usa para livrar as pessoas deles.' },
      { nome: 'Anel das Habilidades',
        texto: 'Um anel de ouro que dá ao portador grande capacidade em um dos seus atributos do corpo ou da mente.' },
    ],
  },
  {
    slug: 'ricutatis',
    nome: 'Ricutatis',
    classe: 'principe',
    // O domínio, sem repetir a classe; os epítetos do livro vão na descrição.
    titulo: 'Morte da Alma',
    imagem: null,
    // Fonte: principes.pdf, págs. 81–86 (3.10 Ricutatis); Morrigalti, págs. 76–77; Udoviom, pág. 93; Prólogo (Farzelo).

    prefacio: {
      texto:
        'Por dois anos Laurana viveu só para os mestres da casa de Ricutatis. Naquele dia seria consagrada Comunus Bankdi, honra dada a poucos, e o corredor de pedra que percorrera centenas de vezes parecia não ter fim.\n' +
        'Na câmara onde tantos hereges haviam morrido nos ritos de purificação, a casa inteira a esperava em transe, presa aos próprios cânticos. Despida, Laurana mostrou as cicatrizes discretas de ritos antigos. O Dux Bankdi a deitou na Dama de Cobre, e a tampa desceu devagar, com as pontas de ferro, até apagar o último fio de luz. Ela recitou as palavras sagradas para fazer da dor poder, até que a dor sumiu e restou a escuridão.\n' +
        'Uma voz perguntou se a serva de Ricutatis estava pronta para a mudança. Ela disse que sim, de todo o coração. Algo voou ao seu encontro: era Vinega, a filha do príncipe, que a examinou com cuidado e disse ao seu senhor que aquele corpo lhe agradava. A alma de Laurana foi tragada para Farzelo; quando a Dama de Cobre tornou a se abrir, quem saiu dela, saudada pelos demonistas, foi Vinega.',
      fonte: 'Extratos do Livro de Maudi, capítulo «O Nascimento» — Biblioteca de Saravossa.',
    },

    descricao:
      'Chamam-no A Pena da Vida Morta e O Anfitrião dos Vazios. Ricutatis é o senhor da morte da alma: não mata o corpo, esvazia o que um dia o habitou, e deixa no lugar apenas tristeza e abandono. Representa a dor, a agonia, o tormento, a decepção e a tortura; sorri para os tiranos e aplaude toda opressão. Dos mortos-vivos, o vampiro é o seu orgulho, pois tem, como ele, uma existência vazia pela eternidade.\n' +
      'Cabe a ele receber as almas que chegam ao plano infernal e decidir a tortura de cada uma. A recepção é uma festa: íncubos gentis guiam os convidados pelo castelo, corcéis demoníacos enfeitam jardins de margaridas-vinho que brotam mesmo pisoteadas, e até os demônios menores têm modos de nobre. O encanto se desfaz aos poucos, a partir do primeiro aperto de mão do anfitrião, do primeiro gole de vinho, da primeira dança com Vinega. A conversa se repete, e o convidado quer parar e não consegue. O chão parece esquentar sob os pés; é o próprio corpo que esfria. Quando a vontade se vai por inteiro, o olho do anfitrião brilha: mais uma fagulha de vida se apagou.\n' +
      'Seus modos são sempre educados, a fala culta e macia, e nunca ergue a voz. Por trás da delicadeza há uma crueldade sem limite, sobretudo com os servos e com quem cai sob o seu poder.\n' +
      'Gosta de se mostrar como um homem de pele muito branca e cabelos longos e bem cuidados, vestido como um aristocrata: tecidos finos, capa bordada a ouro, sapatos de couro de dragão. Na mão esquerda leva sempre um lenço de puro linho branco, que agita no ar espalhando um perfume leve. Tem um sorriso cativante, que não o abandona, e um sotaque que não é de terra nenhuma de Tagmar. Seu símbolo é uma alma em forma de silhueta humana, de braços e pernas presos. Sua cor é o roxo.\n' +
      'É venerado em segredo por carcereiros, torturadores e carrascos, e por todo aquele que sente prazer no sofrimento alheio. Nas cerimônias, uma vítima inocente é trazida amarrada e torturada até a morte. Os templos são belos e luxuosos como um salão real, e só aos poucos o visitante percebe que, sob o ouro, o lugar é consagrado à dor. Os demonistas vestem mantos roxos que só deixam à mostra mãos, pés e rosto; por baixo, usam cintos com ganchos de ferro que lhes marcam e cortam a pele. Cada cicatriz é um presente a Ricutatis.\n' +
      'As doutrinas são três: oprimir, tiranizar e levar o sofrimento aos demais. Onde o culto cresce, cresce também a crueldade contra os fracos, contra os presos de guerra que se renderam e contra os prisioneiros comuns; as almas se turvam, e o povo passa a se divertir com a dor dos outros. Seus seguidores têm crescido muito em Verrogar e Filanti.',

    relacoes: [
      { nome: 'Morrigalti',
        texto: 'É seu pai. Ricutatis é um dos seis príncipes infernais nascidos dele, com Anasmadis, Antredom, Ekisis, Fulvina e Mocna. Morrigalti trata todos os filhos como peças do seu jogo.' },
      { nome: 'Morrigaltrina',
        texto: 'Vive em tensão com os seis filhos de Morrigalti, Ricutatis entre eles: acredita que todos querem tomar o seu lugar.' },
      { nome: 'Os Príncipes Infernais',
        texto: 'Com seus modos de cavalheiro, esconde de todos a selvageria e o ódio que tem pelos outros príncipes.' },
      { nome: 'Ekisis',
        texto: 'Gosta da companhia da princesa pelos elogios que ela lhe faz, e não dá importância aos planos dela.' },
      { nome: 'Mocna',
        texto: 'Ricutatis o inveja pela liberdade de destruição que tem.' },
      { nome: 'Udoviom',
        texto: 'Prefere, como Ricutatis, os métodos lentos e sofridos, mas o despreza: tem-no por um pomposo cheio de frescuras, que não merece a fama que tem.' },
      { nome: 'Cruine',
        texto: 'Ricutatis tem pelo deus uma inveja mortal: acredita que Cruine lhe usurpou o cargo e a função.' },
      { nome: 'Simonio',
        texto: 'O guardião de Farzelo foi mestre de cerimônias dos nobres e mandou matar o próprio superior para lhe tomar o posto. Apaixonado por Anibele, filha do governador da cidade, pediu aos deuses que ela fosse sua e não foi ouvido; recorreu então aos príncipes infernais. Ricutatis lhe deu um líquido para pôr na sopa do casamento dela, e todos à mesa morreram, Anibele também. Simonio se lançou do alto de uma torre e acordou em Farzelo, onde hoje prepara as festas de recepção das almas.' },
      { nome: 'Descendentes',
        texto: 'Vinega, súcubo de asas de águia, é a mais bela e a mais mortal de suas filhas, e a segunda criatura mais poderosa do reino. É sempre ela quem concede a primeira dança às almas recém-chegadas. Sua beleza só é superada pela crueldade.' },
    ],

    locais: [
      { nome: 'Farzelo', onde: 'Primeiro reino infernal',
        texto: 'A cidade de Ricutatis, morada dos perversos e o pior destino que uma alma pode ter. Muralhas de rocha escondem o interior, e um portão de pedra guardado por soldados enormes a protege das feras de fora. Dentro, ruas limpas e prédios novos; mas as ruas são labirinto, e a cidade é prisão. Simonio, o guardião, recebe os recém-chegados com graça, mostra-lhes a cidade e cobra pedágio dos comboios de escravos que passam pela estrada.' },
      { nome: 'Palacete de Ricutatis', onde: 'Farzelo',
        texto: 'Para onde Simonio leva toda alma recém-chegada, e onde o príncipe oferece sempre uma grande festa de boas-vindas. A máscara não tarda a cair. Os calabouços do palacete são tais que não há palavras para o que neles se passa.' },
      { nome: 'Locais Profanos', onde: 'Por toda Tagmar',
        texto: 'Calabouços, salas de tortura, arenas e todo lugar onde houve ou há grande tortura e sofrimento.' },
    ],

    feriados: [
      { datas: [
          { dia: 30, mes: 1 }, { dia: 30, mes: 2 }, { dia: 30, mes: 3 }, { dia: 30, mes: 4 },
          { dia: 30, mes: 5 }, { dia: 30, mes: 6 }, { dia: 30, mes: 7 }, { dia: 30, mes: 8 },
          { dia: 30, mes: 9 }, { dia: 30, mes: 10 }, { dia: 30, mes: 11 }, { dia: 30, mes: 12 },
        ],
        quando: 'A noite de cada passagem de mês, mas nunca a noite de Cruine',
        nome: 'Noite dos Perversos',
        texto: 'A cada passagem de mês, os seguidores de Ricutatis agradecem os favores do príncipe: riqueza, poder, vida longa. Pagam com sacrifício humano, quase sempre de moças virgens, entregues ao sangue e à tortura. Nenhum seguidor ousa faltar, pois quem não cumpre o rito à risca é punido sem piedade pelo próprio Ricutatis. A única passagem que a festa não toca é a noite de Cruine.' },
    ],

    itens: [
      { nome: 'Dama de Cobre',
        texto: 'Um sarcófago de ferro com o rosto de uma bela mulher esculpido em cobre, com vinte e nove pontas por dentro, dispostas para nunca ferir um órgão nem entrar fundo, embora às vezes entrem. Só os Dux Bankdi a usam, e é nela que se consagram os Comunus Bankdi.' },
      { nome: 'Máscara da Infâmia',
        texto: 'Uma máscara de ferro que lembra uma gaiola, feita para castigar olhos, nariz, orelhas e língua, juntos ou um a um. Foi criada para escravizar: quem a usa fica sob o domínio do demonista e da casa de Ricutatis.' },
      { nome: 'Cinto de Ganchos',
        texto: 'Usado pelos demonistas sob o manto roxo, com ganchos de ferro que marcam e cortam a carne de quem o veste. Dizem nos templos que cada cicatriz é uma oferenda.' },
    ],
  },
  {
    slug: 'mocna',
    nome: 'Mocna',
    classe: 'principe',
    // O epíteto, sem repetir a classe: o cartão já diz "Príncipe" na linha de cima.
    titulo: 'O Horror Noturno',
    imagem: null,
    // Fonte: principes.pdf, págs. 67–72 (3.8 Mocna); Diatrimis, Fulvina, Morrigalti, Ricutatis e Udoviom (Relação com os demais Príncipes); deuses.pdf, Blator (prefácio e Itens Sagrados).

    prefacio: {
      texto:
        'Fazia duas noites que Turak dormia mal. A esposa culpava a ceia pesada, e ele foi deitar cedo e de estômago vazio. Mesmo assim acordou de sobressalto, com o sonho ainda vivo: corria como lobo entre as árvores da floresta, livre como nunca fora, com fome de caçar.\n' +
        'Os braços doíam. Ao esfregar as mãos, sentiu-as molhadas, e à luz da vela viu que era sangue. Nos cantos do quarto, alguma coisa espreitava como fera pronta para o bote. Tateou em busca da esposa e encontrou a pele fria, a garganta aberta. Correu ao quarto das gêmeas, as filhas de cinco anos, com a fera nos calcanhares, e as achou frias como a mãe.\n' +
        'Os olhos da fera brilharam no escuro. Turak lançou a vela contra eles, e ela caiu no chão, ainda acesa, ao lado de um espelhinho da filha. Era nele que os olhos brilhavam. Olhou as próprias mãos e viu garras; o corpo, coberto de pelos. Ergueu o espelho até o rosto e encontrou uma fera suja de sangue. O uivo que soltou encheu a noite.',
      fonte: 'O Livro de Maudi, capítulo «A Natureza Bestial de Mocna» — Biblioteca de Saravossa.',
    },

    descricao:
      'Mocna é dos príncipes infernais o mais perturbador. Por trás dos modos de fera há um adversário astuto, de grande inteligência, que pretende dominar todos os Filhos dos deuses. Aprendeu que o caminho para tirá-los da razão é dar-lhes o dom da fúria selvagem: a seus adoradores concede força e agressividade para vencer qualquer inimigo, e assim os torna animais banhados em ira, voltados uns contra os outros.\n' +
      'Seu temperamento é conhecido entre os demais príncipes. Desafiado ou frustrado, explode em fúria, e quem estiver por perto pode pagar por ela; vários Haalins já foram destruídos pelo próprio mestre num desses acessos. Para ele, a bestialidade é fonte de poder: toma conta dos escravos, infecta-lhes a alma de força e determinação e os conduz aos seus domínios. Quem o invoca não deve questioná-lo nem contrariá-lo, pois Mocna nunca contém a brutalidade diante de seres inferiores.\n' +
      'Costuma aparecer como uma besta lupina musculosa, de pelo tão negro quanto a treva titânica. Da testa brotam dois chifres retorcidos de carneiro, e no maxilar, no lugar dos dentes, crescem dedos com garras. Seu símbolo é um par de chifres de carneiro unidos, de onde pendem três dedos com garras. Sua cor é o grená.\n' +
      'Seus devotos são, em geral, gente rude e irascível, e a seita se espalha mais fácil entre bárbaros, nômades e povos guerreiros. No campo, onde a superstição pesa mais que o saber, Mocna é confundido com o lado sombrio de Crezir; os sacerdotes da deusa trabalham para desfazer o engano, com pouco fruto. Onde o culto cresce, cresce também a agressividade das gentes e o número de lobos, onças, raposas e outras feras carnívoras, sensíveis à aura que emana dos seus altares.\n' +
      'Os templos são clareiras a céu aberto com um grande altar de pedra ou madeira, onde as oferendas de sangue são sacrificadas e os corações lançados ao fogo profano. Ali se curtem e se penduram, como enfeite, as peles dos sacrificados, animais ou Filhos dos deuses, e o chão é coberto de uma areia trabalhada que o torna solo profano para os servos do príncipe. Nas cerimônias, os sacerdotes vestem mantos grená e cobrem a cabeça com crânios de lobos e outras feras; muitos levam consigo pedaços de pele ou troféus de oferendas antigas, e gostam de colares de presas. É por esses troféus que se costuma reconhecê-los.\n' +
      'As doutrinas são três: a ira sem freio, o desprezo pelos mais fracos e a agressividade sem razão. O culto anda espalhado e escondido, e ninguém sabe ao certo onde é mais forte. Sabe-se que perto das Terras Selvagens é proibido dizer seu nome em voz alta.\n' +
      'Seu reino é Haafel, o segundo do Inferno, morada dos condenados marcados pela ira. No planalto árido e rachado que o cerca, arbustos de espinhos erguidos como lanças agarram quem se aproxima e o chicoteiam por horas, bebendo o ódio que ele derrama. No centro fica a cidade, cercada de muralha de pedra e de um fosso que só se cruza quando a ponte levadiça desce. Dentro, centenas de ruínas onde bandos de condenados se caçam sem fim; de pé, só a Torre de Mocna, negra, ornada de gárgulas e estátuas de feras. No salão de colunas altíssimas, cabeças de condenados pendem como troféus de caça, e peles de Filhos dos deuses forram as cadeiras e o próprio trono. Quem quiser chegar lá precisa enfrentar os irados do planalto ou seguir o comboio de Nenrode, que o atravessa a cada treze luas.',

    relacoes: [
      { nome: 'Morrigalti',
        texto: 'É o pai de Mocna, que é um dos seis príncipes nascidos dele. Morrigalti trata todos os príncipes como joguetes; Morrigaltrina vive com medo de que os filhos dele queiram tomar o seu lugar.' },
      { nome: 'Os Príncipes Demoníacos',
        texto: 'Mocna odeia todos e, se a ocasião for boa, não poupa esforço para destruí-los: só o mais forte deve sobreviver, e o fraco deve ser dilacerado. Seus irmãos de sangue são Anasmadis, Antredom, Ekisis, Fulvina e Ricutatis.' },
      { nome: 'Diatrimis',
        texto: 'A Senhora da Guerra viu em Mocna um companheiro de batalha, mas a fúria dele impede que os dois ajam juntos. Conta o canto da Batalha de Blator que foi ela quem abriu um portal e o salvou da morte certa.' },
      { nome: 'Fulvina',
        texto: 'Suas ilusões não o alcançam. Ela o tem por inimigo poderoso demais para enfrentar às claras.' },
      { nome: 'Ricutatis',
        texto: 'Por trás dos modos de cavalheiro, inveja Mocna pela liberdade com que ele destrói.' },
      { nome: 'Udoviom',
        texto: 'O Senhor da Pestilência odeia Mocna, cuja devastação mata depressa demais para o seu gosto, que é o das mortes lentas.' },
      { nome: 'Blator',
        texto: 'Nos tempos em que deuses e demônios disputavam o mundo, Mocna veio à batalha nos campos eternos à frente dos Haalins, e Blator os ceifou a todos. Os dois se bateram até que uma nuvem de poeira os encobriu; o machado do deus saiu dali despedaçado, e seus fragmentos, dizem os sacerdotes, ainda são guardados pela ordem.' },
      { nome: 'Maira e Crezir',
        texto: 'São as deusas que ele mais odeia. Os sacerdotes de Crezir lutam para que o povo do campo deixe de confundir a deusa com o príncipe.' },
      { nome: 'Descendentes',
        texto: 'Os Haalins, "Espíritos Selvagens" na língua tessaldariana, feitos das almas aprisionadas de Tessaldarianos e condenados à ira eterna. No Inferno são grandes sombras vivas de licantropos; no mundo físico, só se manifestam pela possessão. Vivem na Torre de Mocna, onde guardam os escravos, servem-lhe as "refeições" e ajudam nos planos de trazer novos condenados. O mais forte é Nenrode, herói dos Tessaldarianos do extremo sul, que a guerra deixou sem paz: partiu para as Planícies Vermelhas atrás de luta, encontrou Mocna à sua espera num lugar preparado para o rito e prometeu-lhe a alma se fosse vencido. Ali, numa luta renhida, encontrou o seu destino.' },
    ],

    locais: [
      { nome: 'Haafel', onde: 'Inferno',
        texto: 'O segundo reino infernal, com a cidade e a Torre de Mocna no centro do planalto dos irados.' },
      { nome: 'Arena de Haalbam', onde: 'Sadom, Levânia',
        texto: 'A mais importante das antigas arenas de Sadom, todas tidas por locais profanos pelo culto. Sob o domínio da magia Bankdi, foi palco de combates selvagens para divertir a população. Com o fim da dominação da Seita na Levânia, muitas arenas foram destruídas e outras ficaram sob construções novas; várias são hoje subterrâneas, escondidas e esquecidas pelos mais jovens.' },
      { nome: 'Montes Solomor', onde: 'Eredra',
        texto: 'A região de Eredra próxima aos montes guarda um número considerável de seguidores de Mocna.' },
      { nome: 'Terras Selvagens', onde: 'Região indomada',
        texto: 'As criaturas dessas terras foram soltas do Inferno pelo próprio Mocna. Nas regiões vizinhas, ninguém diz o nome dele em voz alta.' },
    ],

    feriados: [
      { dia: 2, mes: 8, nome: 'Festa do Ódio',
        texto: 'Invocam-se Haalins para possuir os escravos oferecidos, e eles permanecem no mundo físico enquanto esses corpos vão sendo destruídos. Acendem-se grandes fogueiras, fazem-se ritos de selvageria e oferendas de sangue.' },
    ],

    itens: [
      { nome: 'Dente de Mocna',
        texto: 'Colar de tiras de pele humana com um amuleto de cinco a sete dentes humanos, dado a cada membro no dia em que se torna demonista. Por ele, o portador fala em pensamento com os membros que conhece e lança um chamado aos que estejam a menos de uma légua; quem o recebe sente se é pedido de socorro ou convocação solene, e atende se quiser.' },
      { nome: 'Areia Profana',
        texto: 'Só os altos sacerdotes Bankdis de Mocna a portam. Despejada em círculo sobre a terra, torna o interior solo profano, onde os demonistas recuperam os poderes com mais facilidade, e permite invocar de uma vez até quatro Haalins por dia.' },
    ],
  },
  {
    slug: 'heldrom',
    nome: 'Heldrom',
    classe: 'principe',
    titulo: 'Corrupção',   // os epítetos (O Caído, A Mancha da Corrupção) estão no prefácio
    imagem: null,
    // Fonte: principes.pdf, págs. 60–65 (3.7 Heldrom, com O Guardião Egeom); Branaxis (3.3) e Seinoniz (3.11).

    prefacio: {
      texto:
        'No início, Gênese, a titã da Origem, profetizou que Heldrom administraria o seu legado, o Princípio da Criação de Todas as Coisas. Um dia ela lhe passaria o poder, e ele governaria os deuses e a criação. Mas o dia ficava longe, e Heldrom não quis esperar.\n' +
        'Tentou convencer os irmãos a tomar logo o poder de Gênese e o que emanava dos titãs vencidos. Quase conseguiu; Crizagom lembrou que aquilo não era justo. Irritado, Heldrom convocou os demônios contra a própria família e lhes ensinou o subproduto da criação, a Corrupção. Foram derrotados e banidos, e Crizagom, escolhido como juiz, mandou que os deuses o apagassem da memória e o chamassem de A Mancha da Corrupção. Doeu mais o nome que os demônios lhe deram: O Caído.\n' +
        'Atrás dos portões de aço divino forjados por Parom, caiu por séculos no limbo, entre a dor e o ódio, até tocar o fundo da escuridão. Ali os demônios o esperavam para a vingança. Ele venceu a todos, ergueu-se de um mar de sangue, levantou um castelo com os corpos dos derrotados e se chamou Senhor da Corrupção.',
      fonte: 'Extraído de O Livro de Maudi, do capítulo "O Fim do Início: A Guerra entre deuses e Demônios" — Biblioteca de Saravossa.',
    },

    descricao:
      'A Família dos deuses conta hoje um irmão a menos. Heldrom é o único dos Príncipes Infernais que nasceu deus, e passa o tempo tramando ataques à criação dos irmãos e o próprio retorno. Crê que, quando tudo estiver corrompido, voltará triunfante. Os que fracassaram em seus sonhos e ambições se reconhecem nele, no ódio e no sofrimento.\n' +
      'É frio e calculista; nenhuma emoção o cega. Pesa os fatos com calma, reage depressa e tece planos de centenas de camadas e reviravoltas. Só deixa o sentimento escapar quando lhe lembram a derrota ou os irmãos celestes. Finge não ter mão nos assuntos do mundo, mas sua influência se infiltra devagar até que um conflito estoure entre os seus adversários.\n' +
      'Diante de outros, mostra a antiga forma divina: um guerreiro meio-elfo de pele morena, olhos brancos e negros, cabelos cinzentos, armadura dourada com capa laranja, escudo redondo e lança. A armadura agora é toda rachaduras e manchas de sangue, a capa virou farrapo, e o rosto cansado traz a cicatriz de um golpe de Crizagom.\n' +
      'Seu símbolo é a lança sob o escudo, desenhada como um círculo com uma seta apontando para baixo: o círculo é o das intrigas da Corrupção; a seta, o Caído, ou, como preferem os súditos, aquele que veio de cima. Sua cor é o laranja escuro.\n' +
      'O culto é estranho entre os dos Príncipes. Ensina a meditar sobre os erros cometidos e a abandonar honra, orgulho, moral e dignidade, e a corromper pessoas e instituições em favor dos "irmãos", em número e em riqueza. Por isso seus sacerdotes praticam boas obras para ganhar seguidores, e até enviados poderosos, em missão, acabam acolhendo essas ideias e caindo como o antigo deus. O Livro de Heldrom conta a criação do jeito da seita: Heldrom é o herdeiro legítimo, traído e usurpado pelos irmãos. Termina numa profecia: «Quando todos os governantes se corromperem e todos os adoradores de Crizagom sucumbirem, Heldrom se libertará.» Então, diz o livro, ele dominará os treze infernos, vencerá os falsos deuses, renovará tudo e dará o mundo aos fiéis.\n' +
      'Os seguidores se infiltram onde há poder e justiça, para corromper governantes e juízes. Agem nos altos cargos políticos e de comércio, muitas vezes ocupados por gente que o próprio culto escolheu e ajudou a subir. São mais numerosos em Azanti, onde a ordem de Crizagom tem força, e nas Cidades-Estado, pelo peso que ali têm os juízes. Raramente erguem templo novo: preferem corromper o de outro deus, de Crizagom de preferência, e redecorá-lo por dentro; se não podem, derrubam as fundações e constroem por cima. Ruínas antigas servem de ponto de encontro.\n' +
      'Não usam vestes próprias, sinal do orgulho que abandonaram. Reconhecem-se pela adaga negra em bainha alaranjada, levada como arma ou enfeite; os sacerdotes trazem um pingente laranja da adaga em corrente negra.\n' +
      'As doutrinas mandam: ter Heldrom por único deus, herdeiro legítimo dos titãs; escolher com cuidado os próximos irmãos e fazer-lhes o bem, a qualquer custo, até que estejam prontos para a revelação; melhorar a vida dos irmãos mesmo que seja preciso burlar leis; honrar Heldrom após cada conquista, hoje em segredo e um dia diante do mundo; corromper os justos, a criação e a adoração aos falsos deuses, sobretudo a Crizagom; tomar posse do governo do mundo, que é herança deles. Os fins justificam todos os meios.',

    relacoes: [
      { nome: 'Os deuses',
        texto: 'Odeia a todos, como todo príncipe demoníaco; o que mais odeia é Crizagom.' },
      { nome: 'Crizagom',
        texto: 'O que ele mais odeia: foi Crizagom quem o deteve, o julgou e o condenou à queda, e quem lhe deixou a cicatriz no rosto. Os templos e os devotos do deus da Justiça são o alvo preferido do culto.' },
      { nome: 'Gênese',
        texto: 'A titã da Origem o escolheu para administrar a criação. Diz-se que lhe deu o Cetro da Criação.' },
      { nome: 'Parom',
        texto: 'Forjou os portões de aço divino que selaram Heldrom e os demônios originais na Agonia.' },
      { nome: 'Os Príncipes Infernais',
        texto: 'Quase todos o odeiam, e é dos mais temidos entre eles, rivalizando em poder com Morrigalti. Ser o único deus entre eles o isola na política infernal, e ele trama para corromper os planos dos outros Príncipes até que o sirvam sem saber.' },
      { nome: 'Fulvina',
        texto: 'Teve com ela algumas alianças no passado; de uma delas nasceu Branaxis.' },
      { nome: 'Branaxis',
        texto: 'Rejeitado pela mãe por sua aparência medonha, foi criado e treinado pelo pai até conquistar um reino seu. É por esse filho que o isolamento de Heldrom não é completo. Branaxis teria com ele boa relação, não estivesse preso nos próprios pesadelos.' },
      { nome: 'Seinoniz',
        texto: 'O único Príncipe que se dá bem com ele, pois toma parte em muitos dos seus planos. Há demonologistas que acreditam que a própria ascensão de Seinoniz a Príncipe foi obra de Heldrom.' },
      { nome: 'Vouxiz e Diatrimis',
        texto: 'Com eles e com Seinoniz, Príncipes de origem não demoníaca, Heldrom negocia planos em comum, com o apoio de Branaxis. Vouxiz é titã-segunda; Diatrimis, ex-consorte de Blator.' },
      { nome: 'Descendentes',
        texto: 'Um filho, o titã-segundo Branaxis, que se tornou um dos treze Príncipes Infernais.' },
    ],

    locais: [
      { nome: 'Ribalicor', onde: 'O sexto reino infernal',
        texto: 'Capital do reino onde moram os condenados pela corrupção, patrulhado por enviados decaídos em corcéis demoníacos. O castelo foi erguido com os corpos dos demônios que Heldrom venceu; nas paredes e sob o chão, como atrás de vidro, há rostos em agonia. As colunas são espinhas de demônios gigantescos, e o trono é feito de espadas de luz e espadas infernais derretidas e entrelaçadas. Ali tudo se obtém por troca de favores, e de tempos em tempos os emissários do Príncipe levam metade do que cada alma juntou.' },
      { nome: 'O Portal de Egeom', onde: 'Entre o reino de Heldrom e o mundo dos vivos',
        texto: 'A única entrada e saída do reino. Guarda-o Egeom, antigo fiscal honesto da Moldânia e devoto de Crizagom, que trocou a alma pela cura da filha e terminou a vida como grão-vizir sem escrúpulos. Hoje é uma casca vazia de asas laranjas de energia infernal, armada de um chicote de três pontas. Quem quiser passar sem lutar terá de renunciar ao que tem de mais precioso.' },
      { nome: 'Ruína dos arredores de Azanti', onde: 'Azanti',
        texto: 'Uma ruína antiga, em lugar secreto, que abriga o maior templo de Heldrom em Tagmar.' },
    ],

    feriados: [
      { dia: 29, mes: 12, nome: 'Grande Queda',
        texto: 'Os demonistas creem que neste dia Heldrom foi condenado por Crizagom e lançado na Agonia. É dia de contemplar os erros e planejar o futuro. Fazem-se sacrifícios para aliviar a dor da lembrança, de preferência de juízes, cavaleiros e devotos de Crizagom.' },
      { dia: 10, mes: 9, nome: 'Renascimento',
        texto: 'Lembra o dia em que Heldrom se ergueu da montanha de cadáveres dos demônios inimigos e se coroou Príncipe. Ergue-se e queima-se uma pira de corpos; quanto maior, maior a bênção aos seguidores. Nesta data se apontam os escolhidos para a próxima Grande Queda, e o demonista passa o ano tramando a corrupção deles.' },
    ],

    itens: [
      { nome: 'Cetro da Criação',
        texto: 'Item divino lendário que molda os elementos, cria objetos do nada, dá vida ao inanimado e restaura feridos e até mortos. Diz a lenda que Gênese o deu a Heldrom e que caiu de suas mãos quando ele foi amaldiçoado e vagou pelo vazio antes do mundo.' },
      { nome: 'Anel da Corrupção',
        texto: 'Traz ao portador uma sorte cotidiana que o liga a pessoas, por casamento ou amizade, até que o façam herdeiro: um casebre, uma fazenda, um condado, um reino. Também dobra a vontade dos que o cercam. Usado por tempo demais, corrompe alma e corpo e faz do portador um monstro.' },
      { nome: 'Tiara Real',
        texto: 'Dá a quem a usa o domínio sobre a mente dos semelhantes, ao preço de enlouquecer aos poucos.' },
      { nome: 'Capa da Corrupção',
        texto: 'Uma capa laranja e esfarrapada que molda a imagem do dono e de si mesma, dando-lhe ar nobre e imponente, e torna irresistível o suborno que ele oferece. Enquanto dura a ilusão, o corpo verdadeiro vai se deformando.' },
    ],
  },
];

function classeDaEntidade(ent, lang) {
  const c = ENTIDADE_CLASSES[ent && ent.classe];
  return c ? (lang === 'en' ? c.en : c.pt) : '';
}

/* Os feriados de todas as entidades, no formato do calendário
   ({ dia, mes, nome }), com a entidade de quem são. É o que
   FERIADOS_FANTASY junta à lista dele. */
/* Um feriado pode cair em várias datas (`datas: [{dia, mes}, …]`, como a
   festa que se repete a cada passagem de mês), e `quando` é a data por
   extenso que a ficha mostra no lugar da conta. Feriado sem data que o
   calendário entenda (o livro diz só "no fim do inverno") fica só na ficha. */
function datasDoFeriado(f) {
  if (Array.isArray(f.datas)) return f.datas;
  return (f.dia && f.mes) ? [{ dia: f.dia, mes: f.mes }] : [];
}
/* MESMO NOME, MESMO DIA = uma linha só no calendário. A Festa da Iluminação
   (9 do mês do Sangue) é de Palier — a festa dos elfos — e de Plandis — a
   peregrinação à Floresta de Laudis: os livros dão as duas com o mesmo nome e
   a mesma data. Cada ficha conta a sua; o calendário diz o nome uma vez. */
function feriadosDasEntidades(lista) {
  const fonte = Array.isArray(lista) ? lista : ENTIDADES;
  const out = [];
  const vistos = new Set();
  fonte.forEach((ent) => (ent.feriados || []).forEach((f) => {
    datasDoFeriado(f).forEach(({ dia, mes }) => {
      const chave = dia + '/' + mes + '/' + f.nome;
      if (vistos.has(chave)) return;
      vistos.add(chave);
      out.push({ dia, mes, nome: f.nome, entidade: ent.slug });
    });
  }));
  return out;
}

Object.assign(window, { ENTIDADES, ENTIDADE_CLASSES, classeDaEntidade, feriadosDasEntidades, datasDoFeriado });
