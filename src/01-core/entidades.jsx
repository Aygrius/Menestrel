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
    slug: 'blator',
    nome: 'Blator',
    classe: 'deus',
    // O domínio, sem repetir a classe: o cartão já diz "Deus" na linha de cima.
    titulo: 'Guerra',
    imagem: null,
    // Fonte: deuses.pdf, págs. 16–20 (3.1 Blator); Cambu, Crezir, Crizagom, Cruine, Maira, Parom e Plandis;
    // principes.pdf, Diatrimis (págs. 43–44) e Mocna.

    prefacio: {
      texto:
        'Fazia dois dias que o banquete durava no grande salão de Goldonor, o castelo de Blator. No centro, uma mesa oval de ônix negro, côncava como um escudo emborcado, guardava a caneca de cerveja e o prato de carne assada do deus. Ao redor, os heróis de batalha bebiam com o seu senhor.\n' +
        'O menestrel cantou a batalha dos campos eternos, nos tempos em que deuses e demônios disputavam o mundo. Mocna viera à frente dos Haalins, e Blator os ceifou a centenas a cada golpe de machado, até que os corpos se empilharam como montanhas e um rio de sangue tingiu o firmamento. Então o deus desceu a montanha de mortos, calado, com o passo de mil homens em marcha, e os dois se lançaram um contra o outro. «Golpes eram trocados entre ambos, e uma nuvem de poeira se ergueu para somente um vitorioso surgir.»\n' +
        'Os guerreiros gritaram e ergueram as canecas. Blator sorriu de leve, ergueu a sua e ficou olhando adiante. Lembrava o instante em que Diatrimis, a antiga amada, surgira de um portal e salvara Mocna da morte certa.',
      fonte: 'Extraído do livro «A Batalha de Blator» — Biblioteca de Saravossa.',
    },

    descricao:
      'Blator é o senhor e o criador dos anões, e diante dele, num campo de batalha, todos se inclinam. Há guerras desde o tempo dos titãs, e são elas que decidem o destino das raças: o velho perece para o novo florescer. A guerra comanda o destino dos seres, e Blator comanda a guerra.\n' +
      'Sua doutrina não mudou desde o começo do mundo: a paz se conquista pela guerra e se mantém pela força, e só os fortes sobrevivem e ganham respeito. Não é um deus de conquista pela conquista; sabe ser justo e piedoso na hora certa. Ignora as rixas pequenas e está sempre metido nas grandes questões, e cada conflito do mundo lhe dá mais voz no Panteão. Dos seus feitos, o maior são os anões, um povo forte e bélico, feito para suportar no corpo e no espírito as marcas da guerra, que o chama de Grande Pai.\n' +
      'Quem não o conhece pensa que ele só cuida da guerra. Mas também o buscam os que perseguem um objetivo tido por impossível, e nos jogos e disputas de força é ele quem dá a vitória aos seus preferidos.\n' +
      'É aguerrido, mas justo e bom. Exige muito dos que o seguem e quer deles a força para vencer qualquer obstáculo. Passa muito tempo sozinho, imerso em planos de conquista e de defesa dos seus domínios; a alegria, ele a encontra no campo de batalha e nas festas da vitória.\n' +
      'É pintado como um anão de cabelo e barba bem trançados, em armadura avermelhada com símbolos dourados, enfeitada de peles de bichos exóticos que lhe dão um ar bárbaro. Luta com fúria e afinco, armado de machado ou de um grande martelo dourado. Seu símbolo são dois machados de guerra cruzados. Sua cor é o dourado.\n' +
      'É adorado com fervor em Blur, o reino dos anões; entre os humanos, os reinos mais devotos são Verrogar e Dantsem. Mesmo nos reinos de pouca vocação para a guerra é respeitado: seus sacerdotes têm assento em conselhos e são ouvidos nos assuntos de armas, e há reinos que os contratam para formar generais e altos oficiais. Num mundo cercado de disputas, cada dia mais gente o procura em busca de segurança, paz e prosperidade. A devoção dos fiéis se estende, quase do mesmo modo, aos seus filhos Crizagom e Crezir.\n' +
      'A religião prega a força e a abnegação para transpor os obstáculos da vida, sejam homens ou a própria natureza, e a vitória sobre o medo que cada um traz por dentro. Os sacerdotes devolvem o ânimo ao povo e despertam o guerreiro adormecido em cada um contra as injustiças da vida.\n' +
      'Os templos parecem fortalezas ou quartéis: um retângulo com uma torre em cada canto, onde os sacerdotes tocam sinos a cada hora, chamando às orações do dia e da noite. Dentro há três grandes salões. No das orações, o sacerdote anda entre os bancos de madeira com uma vara, que usa contra quem não entoa os cânticos. No segundo dão-se aulas de estratégia, caras, para filhos de grandes comerciantes e de famílias reais e ricas. No terceiro ensina-se a arte das armas como caminho de serenidade e concentração até Blator; também ela é paga, salvo para os que o próprio deus escolhe.\n' +
      'Os sacerdotes vestem saiotes longos de pano resistente, com o estampado da ordem em dourado e o símbolo do deus, e, por cima, armadura de couro avermelhado sob uma túnica fina de linho bordada a ouro. Usam botas até os joelhos, luvas só nos treinos, e levam bastões de madeira no feitio das armas com que treinam todo dia.\n' +
      'As doutrinas são quatro: força interior, dedicação à causa, busca interior e luta pela liberdade.',

    relacoes: [
      { nome: 'Crizagom e Crezir',
        texto: 'Seus filhos, a quem tem o amor mais forte e a admiração mais funda. Acha pequenos os ideais deles, mas ver o poder dos dois crescer a cada novo fiel o deixa satisfeito. Em Crizagom vê com orgulho as suas melhores virtudes elevadas. Os três formam a tríade dos deuses da guerra, e os demônios temem Crezir mais que ao pai ou ao irmão.' },
      { nome: 'Selimom',
        texto: 'O deus da paz quase sempre comunga do mesmo ideal; só os métodos diferem. É o marido de Crezir e pai dos netos de Blator.' },
      { nome: 'Lena',
        texto: 'Sua neta. Entre os dois há um amor que os outros deuses desconhecem, de encontros escondidos no salão de Goldonor.' },
      { nome: 'Plandis',
        texto: 'O neto, que ele tem por inútil para quase tudo, embora Plandis tenha provado o seu valor muitas vezes. Quando Maira e Palier o mandaram contra o titã Cronus, a quem nem Blator conseguira vencer, o avô riu do «fedelho distraído».' },
      { nome: 'Parom',
        texto: 'Antipatia de rivais que disputam a mesma amante, Lena. Parom suspeita que haja nisso também inveja do respeito que conquistou entre os anões, os filhos de Blator.' },
      { nome: 'Cambu',
        texto: 'Blator o tem em grande respeito pela velocidade no campo de batalha e pela mira, que escurece o céu com a chuva de flechas do seu arco.' },
      { nome: 'Cruine',
        texto: 'Ensinou os filhos a respeitar o senhor do pós-morte, pois a guerra sem a morte não seria a mesma. Durante a guerra contra a Seita, reuniu-se com Cruine muitas vezes; o que diziam, ninguém sabe.' },
      { nome: 'Maira',
        texto: 'Relação difícil, ainda que respeitosa, como a dela com Crizagom e Crezir.' },
      { nome: 'O Panteão',
        texto: 'Com os demais deuses mostra certa paciência, embora ache muitos deles fracos ou preguiçosos para os rigores da batalha.' },
      { nome: 'Diatrimis',
        texto: 'A antiga consorte. Pouco depois da guerra contra os titãs, Blator a fez surgir das energias de Ânimus, do desejo de pôr fim à própria solidão. Ela quis ser mais que madrasta dos filhos dele e senhora da guerra, e se revoltou; Blator lhe abriu o crânio com um golpe de machado, e ela fugiu para o Inferno. Hoje sonha com a vingança contra ele.' },
      { nome: 'Mocna',
        texto: 'Nos campos eternos, Blator ceifou os Haalins do príncipe e se bateu com ele até que Diatrimis o salvasse por um portal. O machado do deus saiu dali despedaçado.' },
      { nome: 'Descendentes',
        texto: 'Crizagom e Crezir, nascidos da sua carne: Crizagom do indicador direito, Crezir do esquerdo. Da união de Crezir com Selimom vieram os netos, Plandis e Lena. Os anões são criação sua.' },
    ],

    locais: [
      { nome: 'Goldonor', onde: 'Morada dos deuses',
        texto: 'O castelo de Blator, cujo grande salão recebe os heróis de batalha em banquetes de dias, ao redor da mesa de ônix em forma de escudo.' },
      { nome: 'Campos Eternos', onde: 'Tempos da guerra contra os demônios',
        texto: 'Onde Blator ceifou os Haalins e enfrentou Mocna, e onde o seu machado se despedaçou.' },
      { nome: 'Blur', onde: 'Blur',
        texto: 'O reino dos anões, onde Blator é adorado com mais fervor.' },
      { nome: 'Verrogar', onde: 'Verrogar',
        texto: 'Dos reinos humanos, o mais devoto, palco do Festival da Bênção Militar. Nas últimas décadas a fé em Crezir cresce ali e preocupa o clero de Blator.' },
      { nome: 'Dantsem', onde: 'Dantsem',
        texto: 'O outro reino humano de maior devoção a Blator.' },
      { nome: 'Levânia', onde: 'Levânia',
        texto: 'Conhecida pela adoração a Blator, e hoje campo fértil para a fé em Crezir.' },
      { nome: 'Arenas antigas e campos de grandes batalhas', onde: 'Por toda Tagmar',
        texto: 'Os locais sagrados do deus, por estranho que pareça: os lugares onde ele se fez presente com a sua bênção. Muitos sacerdotes peregrinam até eles ao começar a vida na ordem.' },
    ],

    feriados: [
      { dia: 2, mes: 1, nome: 'Festival da Bênção Militar',
        texto: 'Celebrado sobretudo em Verrogar. Todo o exército se reúne, em geral num enorme anfiteatro, para exaltar o deus e receber a sua bênção, diante dos grandes nobres e do próprio soberano. Lidos trechos do livro de mandamentos de Blator, seguem-se embates entre os melhores cavaleiros e um cortejo ao redor do anfiteatro com presos de guerra e feras de circo.' },
      { dia: 5, mes: 2, nome: 'Jejum de Piedade',
        texto: 'Entre os anões e em algumas nações bélicas, depois de uma derrota, pequena ou grande, os chefes da igreja chamam os fiéis a jejuar, para entender e acatar a vontade do deus e abrir caminho às vitórias futuras. Quando o jejum é declarado, algumas tabernas e estalagens fecham as portas.' },
      { dia: 5, mes: 3, nome: 'Condecoração Póstuma',
        texto: 'Uma comissão de religiosos e grandes guerreiros vai aos campos de batalha honrar as almas que, acredita-se, ficaram presas ali ao morrer, e libertá-las para seguirem o destino de Cruine. Começou em reinos bélicos e hoje é respeitada por todas as nações.' },
      { dia: 27, mes: 10, nome: 'Festival da Vitória',
        texto: 'Festa do povo pela vitória numa batalha ou numa grande guerra, tão grande quanto o feito; as maiores são pagas pela nobreza. Nas ruas da capital armam-se palcos para dezenas de artistas, correm centenas de litros de cerveja e barris de rum, e a cada amanhecer servem-se panelas de sopa sem conta. Só termina quando acabam a comida, a bebida e as atrações, e sobram bêbados pelas ruas e um deus satisfeito.' },
    ],

    itens: [
      { nome: 'Fragmentos do Machado de Blator',
        texto: 'Dizem que a ordem guarda os pedaços do machado que se despedaçou na luta contra Mocna. Muitos afirmam que com eles se forjou uma espada, guardada para «o momento» em que um grande herói se revelar.' },
    ],
  },
  {
    slug: 'cambu',
    nome: 'Cambu',
    classe: 'deus',
    titulo: 'Comércio e Diplomacia',
    imagem: null,
    // Fonte: deuses.pdf, págs. 22–25 (3.2 Cambu); Crezir, Crizagom, Lena, Liris, Quiris, Selimom e Sevides (relações e festas);
    // principes.pdf, Seinoniz (Concepção e Relação com os deuses).

    prefacio: {
      texto:
        'Eram dias sombrios. Os Filhos, criados com carinho, tinham virado as costas aos pais, esquecido os cultos e o amor, e se mostravam arrogantes na casa que fora erguida para eles. Os deuses sentiram primeiro tristeza, depois ira. Cambu observava de longe, e o que mais lhe pesava era saber que os bons pagariam junto com os maus.\n' +
        'Maira o chamou, e o frio do medo lhe correu o corpo como corre o de um mortal diante da morte. Diante de todos os deuses, a sentença foi dada: «Que aqueles que não nos respeitam pelo amor façam-no pelo medo. Vá e leve a nossa ira justa.» Ele calçou as sandálias dos ventos, feitas por Parom, que o levam a qualquer lugar tão depressa quanto o pensamento.\n' +
        'Pairou um instante sobre o mundo, admirando a beleza que tinha aos pés. Depois cumpriu a ordem. Raios e trovões cortaram o céu, a terra se rasgou em tremores, e antes do nascer do sol homens e mulheres, velhos e crianças foram ceifados; naquele dia, o grande salão de Cruine pareceu pequeno. De volta à morada dos deuses, Cambu sentou-se no leito e chorou pelos inocentes.',
      fonte: 'Extratos do Livro de Maudi, capítulo «O Cataclismo» — Biblioteca de Saravossa.',
    },

    descricao:
      'Cambu é o deus do comércio, da diplomacia e das relações entre as raças. Busca o diálogo e a troca, e por isso muitos o veem como uma porta para a riqueza; os que vivem de comprar e vender o fizeram deus dos mercadores. Mais do que ouro, porém, ele quer o entendimento entre os Filhos dos deuses. É também o mensageiro do Panteão, por quem passam as bênçãos e as maldições do alto. Na guerra contra os titãs foi um arqueiro formidável, e muitos inimigos caíram sob as suas flechas.\n' +
      'É alegre e falante, e anda à vontade entre os companheiros celestes. Inquieto, vaga pelas terras do céu admirando-lhes a beleza e conversa com qualquer deus sobre qualquer assunto, de preferência os mais alegres. Quando Maira o convoca para levar aos mortais a vontade dos deuses, vai com gosto se a notícia é boa.\n' +
      'Prefere a forma de um jovem atlético, sempre de arco e flechas, e é tido por mensageiro enigmático, traga ele notícia boa ou má. Seu símbolo é um círculo sobre setas que apontam para todos os lados: o círculo é a moeda; as setas, os pontos cardeais, sinal de que o deus está em toda direção. Sua cor é o amarelo.\n' +
      'Onde houver moeda ou troca, ali está o seu poder, mas o culto é mais forte na Levânia e em Plana. Sempre foi querido dos pobres e dos mercadores, dos pequenos aos grandes. Antes de uma longa viagem ou de fechar um negócio, reza-se a Cambu, e os sacerdotes abençoam o mercador e a mercadoria. O seu campo são as cidades, e hoje pesa mais nos negócios que na diplomacia.\n' +
      'A ordem vive uma divisão. Com o peso crescente dos sacerdotes de Plana, os seus fins se prendem cada vez mais ao comércio, e a geração nova troca as cerimônias antigas e lentas por ritos ágeis; os sacerdotes velhos e os das terras remotas guardam as tradições. Todos, porém, juram uma vida inteira de serviço aos povos e ao entendimento entre eles.\n' +
      'Os templos de Cambu são os mais esplêndidos de Tagmar: pedra e granito, murais pintados, altares folheados a ouro. Nas cidades remotas são humildes, de tijolo cozido ao sol e teto de palha trançada, mas guardam sempre por dentro objetos de valor ofertados pelos plebeus. Em todos há, junto ao altar, uma caixinha de doações e uma grande jarra de água onde o dinheiro é purificado.\n' +
      'Os sacerdotes vestem trajes de tecido fino, amarelos com desenhos em prata, e sandálias de couro. Ao peito levam o grande medalhão da ordem, de latão, cobre, prata ou ouro conforme o grau. As doutrinas são cinco: a multiplicação das riquezas, a prosperidade, o entendimento dos povos, o crescimento do comércio e a busca da justiça de valores.',

    relacoes: [
      { nome: 'O Panteão',
        texto: 'Tem a relação mais cordial de todo o Panteão. Faz questão de ser boa companhia mesmo para quem diverge dele.' },
      { nome: 'Plandis, Selimom e Lena',
        texto: 'Os companheiros preferidos de conversa, horas a fio, apesar das grandes divergências. Selimom o tem por amigo de longas conversas.' },
      { nome: 'Lena',
        texto: 'Cambu é apaixonado por ela, mas Lena não aprova o caminho de muitos seguidores dele: há mercadores que forçam os empregados a ponto de lhes tirar o gosto pelo trabalho, o que corrompe a doutrina dela.' },
      { nome: 'Liris e Quiris',
        texto: 'Há alguns séculos, Cambu tentou seduzir Liris e se meteu em grandes problemas. Ela ficou com mal-entendidos; o irmão Quiris, que a ama mais que a uma irmã, guarda dele uma indisposição.' },
      { nome: 'Blator',
        texto: 'Respeita-o muito, pela velocidade no campo de batalha e pela mira que escurecia o céu com chuvas de flechas.' },
      { nome: 'Parom',
        texto: 'Tem com ele a amizade de um irmão que nunca teve. Foi Parom quem fez as sandálias dos ventos e as correntes que prenderam Seinoniz.' },
      { nome: 'Palier',
        texto: 'Impacienta-se com a agitação constante de Cambu e com a sua falta de rumo.' },
      { nome: 'Maira',
        texto: 'É ela quem o convoca para levar aos mortais a vontade dos deuses; foi ela quem lhe deu a sentença do Cataclismo.' },
      { nome: 'Sevides',
        texto: 'Procura Cambu atrás das notícias mais recentes. Os dois dividem a Festa da Fartura, posta de propósito entre os meses que os homenageiam.' },
      { nome: 'Crezir',
        texto: 'Acha Cambu falante demais.' },
      { nome: 'Crizagom',
        texto: 'Os dois evitam se encontrar: a natureza intransigente do jovem deus torna os encontros desagradáveis.' },
      { nome: 'Seinoniz',
        texto: 'Quando Sarnodis tragou Kerniz e se ergueu príncipe, Cambu o atingiu na coxa com uma flecha de pura luz e, para não travar um combate que arrasaria o mundo, prendeu-o com as correntes místicas de Parom. O Senhor das Correntes ficou coxo e lhe guarda ódio mortal.' },
      { nome: 'Descendentes',
        texto: 'Não tem descendentes.' },
    ],

    locais: [
      { nome: 'Cidade Dourada', onde: 'Cordilheira de Sotopor',
        texto: 'Um dos lugares mais sagrados da ordem. Na velhice, os sacerdotes passam as funções aos aprendizes e partem na última viagem da vida: vão para a Cidade Dourada, onde conduzem os cultos e vivem os seus dias finais em sossego.' },
    ],

    feriados: [
      { datas: [{ dia: 30, mes: 4 }, { dia: 1, mes: 5 }],
        quando: 'O último dia do mês da Semente e o primeiro do mês do Ouro',
        nome: 'Festa da Fartura',
        texto: 'Dois dias em honra de Cambu e de Sevides, sobretudo nas vilas e cidades pequenas. Os mercadores depositam moedinhas nas urnas dos templos em agradecimento pela fartura do ano; lavradores e criadores ofertam um pouco do que produziram, pedindo bons negócios. Os templos se enchem de gente em busca de ajuda para o seu comércio.' },
      { dia: 21, mes: 5, nome: 'Dia da Multiplicação',
        texto: 'O dia de quem vai mal nos negócios. Levam-se saquinhos de couro com moedas ao templo para a bênção; dali em diante são amuleto de prosperidade e não se gastam mais. O mercador os pendura ao pescoço ou os guarda sob o balcão.' },
      { dia: 27, mes: 12, nome: 'Noite do Entendimento entre os Povos',
        texto: 'A noite dos que buscam o entendimento pela palavra. Há celebrações nos templos e ceias nos palácios e nas casas de nobres e grandes mercadores, que reúnem gente de raças diferentes ou cidadãos em desavença. Em alguns reinos, os vizinhos trocam alimentos.' },
    ],

    itens: [
      { nome: 'Caixa das Mil Pragas',
        texto: 'Uma caixinha de madeira achada aos pés de Cambu depois do Cataclismo, que guarda a ira dos deuses que ele não lançou, por medo de destruir o mundo. Diz-se que ele a abriu só uma fresta, e bastou para o Cataclismo; um sacerdote que passava a tomou aos seus cuidados, e hoje ninguém sabe onde está.' },
      { nome: 'Moeda de Ilkaliin Silkan',
        texto: 'Uma moeda de ouro puro que daria ao portador riqueza além dos sonhos. Uns dizem que se perdeu, outros que está escondida num templo de Plana, outros que é só lenda.' },
      { nome: 'Sandálias dos Viajantes',
        texto: 'Eram de Arcerlam, sacerdote e diplomata que andou o mundo a pé evitando guerras e servindo aos pobres, e nunca se gastaram. A ordem as guarda como relíquia, e muitos afirmam que foram presente do próprio Cambu.' },
    ],
  },
  {
    slug: 'crezir',
    nome: 'Crezir',
    classe: 'deusa',
    // O domínio, sem repetir a classe: o cartão já diz "Deusa" na linha de cima.
    titulo: 'Fúria',
    imagem: null,
    // Fonte: deuses.pdf, págs. 27–32 (3.3 Crezir); Blator, Crizagom, Cruine, Lena e Plandis;
    // principes.pdf, Branaxis (prefácio), Diatrimis e Mocna.

    prefacio: {
      texto:
        'Os passos de Crezir ecoavam pesados nos corredores do castelo de Crizagom, e o sangue da batalha que acabara de travar ainda não tinha esfriado nela. Da penumbra, uma voz serena e aveludada lhe deu as boas-vindas: «Seja bem-vinda ao castelo do deus da Justiça, jovem deusa da Fúria.»\n' +
        'A palavra «jovem» fez o sangue ferver. Crezir reconheceu a voz do deus da Paz e devolveu a ironia: se soubesse que o irmão recebia visitas tão veneráveis, não teria vindo.\n' +
        'Crizagom, que ouvira tudo, entrou com toda a autoridade da sua voz e pediu que a paz fosse mantida em seus corredores. Selimom sorriu e propôs trégua, pois nem a fúria pode subjugar a paz. O anfitrião julgou ter evitado o pior. Não imaginava que a conversa continuaria mais tarde, nos aposentos emprestados a Selimom, de forma não menos agressiva, mas nem tão mortal.',
      fonte: 'Extraído do livro «A Paz e a Guerra» — Biblioteca de Saravossa.',
    },

    descricao:
      'Crezir é a deusa da destruição, da fúria e do prazer na luta, o terceiro elo da tríade da guerra, ao lado do pai, Blator, e do irmão, Crizagom. Para ela, a guerra é o meio de destruir tudo o que é imperfeito e caótico, para que a ordem um dia se estabeleça. Não basta expulsar o caos: é preciso usá-lo contra ele mesmo, como o fogo que se ateia às ervas daninhas e só se apaga depois de queimar as sementes que ficaram. Daí vem a sua fúria, a de quem abomina o caos e precisa mergulhar nele para destruí-lo.\n' +
      'Na guerra contra os titãs, derrotou Fogo de mãos nuas e chegou a lhe arrancar um membro. Não há demônio que não tema enfrentá-la a sós, mais do que temeria Blator ou Crizagom; mesmo em bando, o que deixam no campo são pilhas de carcaças. Na batalha não há tristeza nem arrependimento: a vitória dos filhos de Crezir é motivo de festa, inclusive para os que tombaram na tormenta.\n' +
      'Nos tempos atuais revelou-se nela uma face mais oculta: a do impulso pela vida. Crezir é a força e o instinto de sobreviver diante da morte e do perigo, o empuxo sem razão que quebra barreiras e vence o que parecia invencível. Não se mede nem se explica; só se aponta para um fim.\n' +
      'Seu temperamento é instável, e o menor acontecimento basta para lhe despertar a ira. Ainda assim não é cruel com os seus: é uma mãe rígida e zelosa, que protege os fiéis como um companheiro de campanha protege o irmão de armas. A fúria não a torna tola; quando quer, Crezir é audaz com as palavras.\n' +
      'Os que dizem tê-la visto falam de uma mulher belíssima e de porte avantajado, pele branca, longos cabelos cor de fogo e olhos tão azuis que parecem guardar o céu. Veste armadura completa de cobre, de detalhes negros tão reluzentes que quase cegam quem a encara, e traz nas mãos um enorme montante. As pinturas a mostram lançando-se sobre os inimigos. Seu símbolo é o relâmpago, luz que destrói o que está na mira seguida do rugido. Sua cor é o cobre, a dos seus cabelos e do metal em brasa.\n' +
      'O culto nasceu nas grandes arenas de gladiadores, onde os lutadores lhe ofereciam as vitórias, e cresce sempre que estoura uma guerra, muitas vezes com fiéis vindos de Blator e de Crizagom. Em Verrogar, povo antes quase todo de Blator, a devoção à deusa aumenta a cada dia, e isso preocupa o clero do deus da guerra; o mesmo começa a acontecer em Dantsem e na Levânia. Fora das terras em conflito, sua popularidade é baixa. Crezir pouco se importa com os reinos dos mortais, e em tempos de paz seus sacerdotes têm pouco peso; na guerra, todo governante teme atrair a ira deles.\n' +
      'A religião prega a fúria e a valentia, pois é na batalha que se decidem os rumos do mundo; a diplomacia é aceita, mas pouco vale nas grandes questões. Não há rendição: é vitória ou morte. Por isso o fiel pesa bem a luta antes de entrar nela. O recuo é tolerado, a fuga é vergonha, e o traidor e o covarde são perseguidos. Diz-se que um seguidor de Crizagom poupa a aldeia que se rende, que um de Blator faz o que a estratégia manda, e que um de Crezir pode não deixar pedra sobre pedra.\n' +
      'O maior prazer dos fiéis é vencer alguém de força igual ou maior, e reconhecer outro como tal é ao mesmo tempo honrá-lo e desafiá-lo. Quando um inimigo, lutando pela vida, mostra em batalha a face de Crezir, passam a respeitá-lo. Há entre eles quem goste da crueldade e não da luta, que pisoteia os caídos e prefere a tortura ao combate; são covardes, quando não corrompidos pelos demônios, e para eles não há piedade quando a máscara cai. Na paz, dedicam-se aos duelos e à caça, mas a morte em duelo não agrada à deusa, pois não destrói caos nenhum.\n' +
      'Os templos são simples, de pedra escura, com pequenas torres e saliências pontiagudas, um raio esculpido por fora e detalhes em cobre. Têm uma entrada só e poucas janelas, altas e estreitas, cujos feixes de luz convergem para o altar dos sacrifícios; no mais, a luz vem de archotes enfeitados com fitas pretas e acobreadas. Os sacerdotes andam sempre em trajes de guerra, couraça ou cota de malha com armas de corte, cobertos por uma túnica preta com um raio cor de cobre.\n' +
      'As doutrinas mandam: destruir o caos pelos meios necessários, pois só depois nascerá a ordem; combater o mal e o caos com o próprio caos; batalhar com fúria cega até a vitória; lembrar que o prazer no sofrimento alheio leva ao caos, e a piedade no campo de batalha, à fraqueza; honrar a coragem e a força, mesmo no adversário; e respeitar fielmente a hierarquia da deusa.',

    relacoes: [
      { nome: 'O Panteão',
        texto: 'Arredia, mantém distância da maior parte dos deuses. Fora da família, eles lhe reconhecem o valor, mas não fazem questão da sua companhia. Ela não demonstra respeito a ninguém, exceto a Crizagom.' },
      { nome: 'Blator',
        texto: 'O pai, de cujo indicador esquerdo ela nasceu. Por ele sente um misto de indignação e admiração: entende a sua força, mas não aceita a sua aparente apatia diante da guerra. Blator acha pequenos os ideais dos filhos, e ainda assim se alegra ao ver o poder deles crescer.' },
      { nome: 'Crizagom',
        texto: 'O irmão, o único a quem ela ouve, embora saiba que escolheram caminhos diferentes. É a ele que recorre quando precisa de conselho para o que a força não resolve, ou de descanso.' },
      { nome: 'Selimom',
        texto: 'O deus da Paz conquistou a deusa da Fúria sendo tolerante, solícito e amável nas horas mais difíceis. É o seu esposo.' },
      { nome: 'Palier',
        texto: 'Seu maior desafeto, a quem chama de arrogante. Crezir não admite magia em batalha: tira o prazer da luta e o choque das espadas.' },
      { nome: 'Parom e Cambu',
        texto: 'Parom lhe parece calado demais; Cambu, falante demais.' },
      { nome: 'Maira',
        texto: 'Relação difícil, ainda que respeitosa. Maira não entende a destruição que Crezir impõe, e as duas discordam por isso.' },
      { nome: 'Ganis',
        texto: 'Crezir acredita ter algo em comum com ele no fundo.' },
      { nome: 'Cruine',
        texto: 'Para Crezir, é o elo que fecha o ciclo da destruição, ainda que ele ache que ela exagera. Dizem que é a preferida dele: depois de longos anos imóvel, Cruine ergueu a cabeça só para vê-la entrar, quando ela veio pedir que um sacerdote seu voltasse ao mundo para cumprir sua vingança.' },
      { nome: 'Diatrimis',
        texto: 'A antiga consorte de Blator não quis ser só a madrasta de Crezir e Crizagom: quis ser a mãe deles e a senhora da guerra.' },
      { nome: 'Mocna',
        texto: 'O Horror Noturno guarda para Crezir e Maira o seu ódio maior. No campo, o povo o confunde com o lado sombrio da deusa, e os sacerdotes dela lutam para desfazer o engano.' },
      { nome: 'Branaxis',
        texto: 'Na guerra entre deuses e demônios, o Pesadelo Medonho prendeu a família de Plandis nos próprios medos. Crezir foi forte como o pai, mas não resistiu ao seu.' },
      { nome: 'Descendentes',
        texto: 'Da união inusitada com Selimom nasceram Lena, deusa dos Prazeres Eróticos, e Plandis, deus da Loucura e da Paixão Cega. Crezir não tem paciência com o filho, que acha relapso, mas o protege com zelo; com Lena briga muito, e só às vezes faz as pazes.' },
    ],

    locais: [
      { nome: 'Ninho dos Dragões', onde: 'Cordilheira do Dragão (Montes Crassius), a noroeste de Treva, Verrogar',
        texto: 'A fortaleza dos Dragões Vermelhos, a ordem guerreira da deusa, quase na divisa com Dartel e o grande deserto. É praticamente inacessível a quem não é da ordem. Reza a lenda que guarda uma força capaz, se a deusa a incitar, de devastar qualquer exército do mundo conhecido.' },
      { nome: 'Altares dos templos', onde: 'Todo templo de Crezir',
        texto: 'Onde se oferecem os sacrifícios. São solo sagrado: só sacerdotes e gente ligada ao culto podem pisá-los, e quem comete o sacrilégio pode sofrer graves consequências.' },
      { nome: 'Arenas de gladiadores', onde: 'Por todo o continente',
        texto: 'Berço do culto. Os gladiadores, que viviam a luta pela sobrevivência, cultuavam a deusa e lhe ofereciam as vitórias.' },
    ],

    feriados: [
      { dia: 12, mes: 1, nome: 'Amor da Deusa',
        texto: 'Nascido nas tribos do extremo sul. Os campeões e as campeãs da deusa, em regiões separadas, passam por provas de corpo e mente decididas pelo conselho do sumo sacerdote, até restarem dois guerreiros e duas guerreiras, que duelam até um subjugar o outro; os sacerdotes evitam que se chegue à morte. Depois de dois dias de repouso, os dois vencedores se enfrentam diante só do sumo sacerdote, que não revela quem venceu. O vencedor escolhe se une ou não ao vencido, pois quem dá uma luta prazerosa dará um amor da mesma intensidade. O casal ganha uma semana a sós numa tenda farta, e a deusa costuma abençoar a união com uma nova vida.' },
      { dia: 13, mes: 7, nome: 'Batismo de Fogo',
        texto: 'Os devotos, que se creem feitos de liga superior, como o aço mais fino nas mãos de um ferreiro divino, purificam-se pelo fogo: dançam em volta de fogueiras, saltam as chamas, andam sobre brasas, seguram pedras em brasa, mergulham em água quase fervente. O rito também se repete a cada passagem de estação, sob a lua cheia. Comum nas terras selvagens do sul, ganha força em Verrogar. As feridas costumam deixar marcas pequenas demais para o que foram; quem fica com cicatriz evidente é olhado com desconfiança, como se o batismo não tivesse sido bem feito.' },
      { dia: 23, mes: 8, nome: 'Oferenda de Sangue',
        texto: 'Celebração dos templos para manter o vigor e a virilidade dos devotos. À noite, o sacerdote sacrifica o touro mais viril do rebanho da deusa e recolhe o sangue numa vasilha especial, em geral de ouro e pedras preciosas. Parte fica no altar; o resto é dividido entre os presentes, que bebem da fonte da vida.' },
    ],

    itens: [
      { nome: 'Armadura de Escamas de Dragão',
        texto: 'Feita para o líder da ordem com as escamas de um dragão vencido pelos Dragões Vermelhos. Dizem as lendas que repousa nas profundezas do Ninho dos Dragões, junto ao tesouro de um ou mais dragões.' },
      { nome: 'Armas consagradas',
        texto: 'Armas que os sacerdotes da deusa consagraram pela magia. São tidas por capazes de decidir o rumo de uma batalha.' },
      { nome: 'Vasilha da Oferenda',
        texto: 'O vaso de ouro ornado de pedras em que se recolhe o sangue do touro na Oferenda de Sangue.' },
    ],
  },
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
    slug: 'anasmadis',
    nome: 'Anasmadis',
    classe: 'princesa',
    // O epíteto, sem repetir a classe: o cartão já diz "Princesa" na linha de cima.
    titulo: 'A Donzela das Delícias',
    imagem: null,
    // Fonte: principes.pdf, págs. 21–26 (3.1 Anasmadis, com O Guardião Tirnésio); Antredom (3.2) e Morrigalti (3.9);
    // deuses.pdf, Lena (Festa dos Amantes, Jardim das Rosas).

    prefacio: {
      texto:
        'As chuvas não vinham, e a aldeia dormia cedo com medo de perder a colheita do ano. Helber não dormia. Casado havia três anos com a jovem Sofia, seguia com os amigos, quase toda noite, para um pequeno bordel na estrada principal. Naquela noite ia calado, remoendo a última briga: Sofia descobrira as escapadas e falava em voltar para a casa dos pais.\n' +
        'Um barulho na mata o fez levar a mão à faca. Dela saiu uma donzela como ele nunca vira. Muda, chegou-se a ele, tocou-o, beijou-o, e o corpo dela exalava desejo. Helber a derrubou no chão, mas, quando ia cair sobre ela, lembrou-se da esposa chorando. Afastou-se e a deixou deitada entre as árvores. A volta para casa foi longa.\n' +
        'No dia seguinte, a estrada trouxe a notícia: uma doença misteriosa matara todos os que estavam no bordel, cobertos de chagas, depois de uma grande orgia. Helber tocou o próprio rosto e lembrou-se da jovem da floresta. «Anasmadis...», sussurrou. E, tomado de terror, ajoelhou-se e começou uma prece a Lena.',
      fonte: 'Extraído de O Livro de Maudi, do capítulo «A Dama da Luxúria» — Biblioteca de Saravossa.',
    },

    descricao:
      'Anasmadis é a princesa infernal do exagero, do vício nos prazeres e do impulso sem freio. Entre os seus adoradores estão os piores bêbados, glutões, adúlteros e devassos. Quem diz o seu nome ao vento não sabe o mal que chama para a própria vida; os mais instruídos evitam pronunciá-lo e a chamam apenas de a Donzela das Delícias. Os menos cautelosos a chamam de a Vadia.\n' +
      'Está presa no plano dos demônios, mas não é inofensiva. Seus seguidores dizem que só em certas conjunções dos astros ela pode ser invocada e solta por algum tempo no mundo, para semear o mal; contam as lendas antigas que a sua passagem já derrubou reinos, arruinou famílias e desfez congregações. Por isso, em Tagmar, nos reinos de baixo e nos de cima, todos tomam cuidado com ela.\n' +
      'Enquanto não vem, manda os seus enviados colher almas de mortais. Ela as consome para se manter jovem e sedutora, e é essa a única coisa que a sustenta: quer igualar a beleza de Lena, sua arqui-inimiga, e ser mais desejada que ela. Lena dá o prazer sem culpa e o amor; Anasmadis dá o vício, a culpa, a fraqueza diante da tentação e o arrependimento fundo. Aos olhos leigos a diferença não é simples, e muitos se perdem crendo cumprir a vontade de uma deusa. Quando descobrem, é tarde.\n' +
      'Sem almas, a beleza se desfaz. O corpo se gasta, a pele resseca, os cabelos caem, as costelas saltam, e os ossos da face se tornam pontudos, até que volte a sua forma verdadeira, bizarra e terrível. Assim não seduziria os outros príncipes, e seduzi-los é o seu modo de manipulá-los. Mas as orgias com eles também lhe gastam a beleza que as almas restauram, e ela vive presa a esse ciclo. Nada a satisfaz tanto quanto corromper um sacerdote de Lena.\n' +
      'Poucos mortais resistem ao que ela promete. Quem resiste não volta a ser perturbado, desde que não ceda de novo ao exagero: a rejeição é a única arma que funciona contra ela. Rejeitada, enfurece-se e some, envergonhada.\n' +
      'Na forma real, é o avesso do amor que Lena guarda para os seus. Fala pragas e obscenidades sem motivo e não tem recato nenhum. Contam que nos primeiros tempos, quando andava no mundo, entregava-se a quem a desejasse, homem, mulher, animal ou criatura; e que esses, com o tempo, perderam a alma e viraram seres pálidos e sem vida, tomados por pragas mortais.\n' +
      'Costuma surgir como uma donzela deslumbrante, de rosto que mal se pode encarar, num longo vestido vermelho-sangue de decote ousado e rendas trabalhadas. À primeira vista passaria por uma princesa dos deuses. Gasta a beleza, revela-se uma criatura demoníaca descomunal e horrenda. Seu símbolo, feito em oposição à beleza de Lena, é uma rosa negra dentro de um triângulo de lados desiguais, a imperfeição. Sua cor é o magenta.\n' +
      'Tem muitos seguidores em bordéis e prostíbulos e entre beberrões e glutões, e o seu culto é dos mais espalhados de Tagmar, sempre em segredo. Nas altas rodas, o excesso é moeda de corrupção e barganha, e os devotos dela andam perto dos poderosos, explorando-lhes as fraquezas. No povo, os excessos acabam em lares desfeitos.\n' +
      'Os cultos são de três tipos. No primeiro, os novos seguidores são marcados a ferro em brasa atrás da orelha esquerda, com um pequeno anel de metal que traz o símbolo da princesa. No segundo, celebra-se Anasmadis com orgias, bebedeiras e glutonarias; como poucas mulheres a cultuam, os devotos capturam outras, e as que recusam são forçadas e mortas no fim, e todos bebem do seu sangue. O terceiro busca libertar do plano dos demônios a regente suprema ou os seus filhos. Não há templos: qualquer lugar escondido serve, a casa de um seguidor ou o meio de uma mata fechada.\n' +
      'A marca é a única veste do culto. Por ela os devotos se reconhecem, apertando ao mesmo tempo a orelha esquerda um do outro, nunca em público, só antes das reuniões, para descobrir intrusos. Mais que isso, ela os marca como gado: só quem a traz tem a alma poupada por Anasmadis e pelos seus enviados, por maiores que sejam os seus excessos.\n' +
      'As doutrinas são cinco: o exagero sem medida, sobretudo o da carne; a libertinagem; a corrupção do amor; a destruição da família; e a libertação da regente suprema.\n' +
      'Seu reino é o décimo do Inferno, morada dos condenados pela luxúria, cercado de muralhas de pedra que transpiram sebo como pele suada. Um grande portão de ferro é a única entrada da cidade de Malacoda; dele parte uma avenida imensa até o castelo da princesa. A cidade toda é feita de prostíbulos, onde os condenados servem aos desejos mais sujos e cruéis dos demônios. O guardião é Tirnésio, um Daairnos de homem bem-vestido, que mostra as presas ao falar, de mãos ossudas e unhas longas e negras, e anota num livrinho tudo o que entra e sai. Em vida foi rufião: cresceu num bordel, matou a dona e tomou o negócio, e enriqueceu raptando moças nas cidades vizinhas, até a noite em que tentou seduzir uma mulher de beleza sem igual. Foi o seu último beijo.',

    relacoes: [
      { nome: 'Lena',
        texto: 'A arqui-inimiga, a deusa que ela mais desafia e prejudica. Anasmadis quer ser mais bela e mais desejada que ela. Seus adoradores se infiltram entre os devotos de Lena e desvirtuam o culto, e dão muito trabalho aos sacerdotes dela.' },
      { nome: 'Os deuses',
        texto: 'Como todo príncipe demoníaco, é inimiga de todos.' },
      { nome: 'Os Príncipes Demoníacos',
        texto: 'Repudiam-na porque ela não leva um plano adiante sem se desviar para orgias e excessos, mas desfrutam dos seus prazeres. É por essa porta que ela tenta manipulá-los. Só com eles chega ao ápice do prazer, e cada encontro lhe custa beleza.' },
      { nome: 'Morrigalti',
        texto: 'É o pai de Anasmadis, uma dos seis príncipes nascidos dele, com Antredom, Ekisis, Fulvina, Mocna e Ricutatis. Morrigaltrina teme que os filhos dele queiram tomar o seu lugar.' },
      { nome: 'Antredom',
        texto: 'O Príncipe da Fome tem uma rixa com ela: os glutões que a adoram são as almas que ele quer para o seu reino, onde os faria assistir eternamente, famintos, enquanto ele come.' },
      { nome: 'Descendentes',
        texto: 'Os Íncubos e Súcubos, não menos belos que a mãe, mas de língua de serpente e cauda vermelha pontuda como seta, escondida sob a roupa; os mais poderosos têm corpo demoníaco robusto, asas e chifres. Colhem almas de mortais para manter a beleza dela, atiçando os excessos de carne, bebida, comida, jogo, festa, posses, poder e fama. Anasmadis os envia aos demonistas que a conjuram, quando o pedido lhe convém.' },
    ],

    locais: [
      { nome: 'Malacoda', onde: 'Inferno, décimo reino',
        texto: 'A cidade de Anasmadis, de muralhas que suam sebo e um portão de ferro guardado por Tirnésio. Uma avenida imensa leva ao castelo da princesa entre prostíbulos de condenados.' },
      { nome: 'Jardim das Rosas', onde: 'Porto Livre',
        texto: 'O templo principal de Lena e o lugar mais sagrado da deusa. Corre o rumor de que, no Dia dos Tolos, os demonistas tentariam trazer o reino de Anasmadis ao mundo justamente ali.' },
      { nome: 'Ludgrim e Calco', onde: 'Ludgrim; Calco, em Abrasil',
        texto: 'Terras de grande devoção a Lena, também apontadas pelo rumor do ritual do Dia dos Tolos.' },
      { nome: 'Templos de Lena desvirtuados', onde: 'Por toda Tagmar',
        texto: 'Todo lugar de culto a Lena que os homens transformam em lugar de excesso vira local profano de Anasmadis, e cada um conta como uma vitória sobre a deusa.' },
    ],

    feriados: [
      { dia: 11, mes: 10, nome: 'Dia dos Tolos',
        texto: 'Dizem os adoradores que nesse dia um ritual dos demonistas traria o reino de Anasmadis de volta ao mundo, na materialização da luxúria e da tentação. A data engana os desavisados, pois cai no mês da Rosa, o de Lena, na véspera da Festa dos Amantes. Não se sabe ao certo se o ritual fracassou; se fracassou, crê-se que os demonistas se dedicariam a libertar Íncubos e Súcubos para levar adiante os planos da sua regente.' },
    ],

    itens: [
      { nome: 'Anel Damistadis',
        texto: 'Algumas dezenas foram entregues por Íncubos e Súcubos a magos demonistas para marcar os súditos de Anasmadis. Dizem que é com ele, em brasa, que se faz a marca atrás da orelha.' },
      { nome: 'Pulseira de Hossum',
        texto: 'Chamada sugadora de almas: uma pulseira de platina cravejada de pedras preciosas, de grande requinte e valor, que dá a quem a usa o vício dos prazeres.' },
      { nome: 'Colar Dodengi',
        texto: 'Impõe obediência, como a magia de amizade, para certas condutas: trazer mais gente ao covil ou facilitar os cultos.' },
    ],
  },
  {
    slug: 'antredom',
    nome: 'Antredom',
    classe: 'principe',
    titulo: 'O Sorriso dos Miseráveis',   // os outros epítetos (O Príncipe da Fome, O Pouco) estão na descrição
    imagem: null,
    // Fonte: principes.pdf, págs. 28–34 (3.2 Antredom, com O Guardião Efialtes); Morrigalti (3.9) e Vouxiz (3.13);
    // reinos.pdf, Eredra (o rio Itéria) e Calco (Tória).

    prefacio: {
      texto:
        'Fazia vinte e oito anos que Galnis repetia os mesmos gestos, como o pai, o avô e o tataravô antes dele. Naquela tarde de primavera rezou no pequeno altar de Sevides, à entrada da casa, pegou as ferramentas e saiu com os dois filhos mais velhos. Da varanda, viu o trigo dourado balançar na brisa, e os olhos se encheram de lágrimas.\n' +
        'No horizonte, uma nuvem escura vinha contra o vento. Não era chuva: era um enxame de gafanhotos. Por mais que agitassem tochas, antes do fim do dia dezenas de campos estavam roídos até o chão, e Galnis não sabia como honraria as dívidas.\n' +
        'À noite, bateram à porta. Era o vizinho novo, um dos poucos que nada perdera, e se oferecia para comprar a dívida até a colheita seguinte. Galnis assinou aliviado e agradeceu a Sevides. No ano seguinte, a nuvem voltou. Sem ter como pagar, entregou a fazenda e partiu para a cidade, como tantos outros que perderam as terras no reino de Portis.',
      fonte: 'Extraído de O Livro de Maudi, capítulo «O Enxame Faminto» — Biblioteca de Saravossa.',
    },

    descricao:
      'Antredom é o demônio da fome, da miséria e da avareza: de tudo o que nunca avança na vida e da prosperidade erguida sobre a ruína alheia. Chamam-no O Príncipe da Fome e O Pouco. Por sua natureza de parasita, é patrono dos salteadores de estrada, dos mendigos, de quem se presta à vida miserável e de quem quer enriquecer com a perda covarde e sem volta dos outros. O povo evita dizer o seu nome, dá esmola depressa e pede a Sevides que as plantas cresçam. Os mendigos, quando não recebem, assustam com uma cantiga: «Se passeias com Antredom, irás de barriga vazia, de joelhos rasgados e de morte esquecida.»\n' +
      'É mesquinho até com os aliados: finge não ter como ajudar, guarda as forças e junta recursos, e nunca devolve nada. Os seguidores imitam o mestre. Um deles se faz passar por coitado e bate à porta de quem prospera, quase sempre um lavrador que subiu pelo próprio trabalho; quando a vítima abre a casa, perde tudo, e dela restam só as migalhas. Acima de tudo, Antredom tem uma fome sem fim e está sempre engolindo uma alma, ou um dos seus demônios, se estiver irritado.\n' +
      'Mostra-se como um homem gordo de pele branco-amarelada, calvo, de peito e costas peludos sempre à mostra e roupas em farrapos, com um sorriso zombeteiro e a voz mole e lamurienta de um necessitado. A boca, porém, abre-se a um tamanho sem medida e engole a vítima inteira. Para quem perdeu tudo, ele é o enxame de insetos que desce sobre a lavoura. Seu símbolo é uma mão esquerda de palma para cima, com dois arcos que formam uma boca aberta; ao se saudarem, um servo estende a mão aberta, o pedido e a fome, e o outro a cobre com a mão fechada, a avareza. Sua cor é o sépia.\n' +
      'Os devotos são sobretudo avarentos que escondem o que têm para que ninguém lhes peça favores, vivendo como miseráveis sobre fortunas ocultas, ou que se banqueteiam a portas fechadas enquanto os vizinhos passam fome. Há também os desesperados pela miséria. O culto anda pelo campo, às vezes pelas guildas de mercadores e de ladrões e entre os nobres mais sovinas, sempre tramando a ruína de quem prospera. Pratica o canibalismo e se gaba de receitas macabras com esse ingrediente; em todo culto há banquete, e a oferenda de comida é sempre maior que o que se vai comer.\n' +
      'O templo é redondo, com um grande altar de pedra no centro e, ao fundo, a lareira com lugar para um caldeirão grande, ao lado de um forno. No altar as vítimas são sacrificadas e depois comidas cruas ou cozidas; ele serve também de mesa para o banquete que fecha cada culto. Sob ele costuma haver um calabouço de entrada escondida, onde a vítima passa fome por dias antes do sacrifício. Os cultistas vestem mantos de pano de saco velho, de capuz pequeno que deixa ver a máscara: cabeças de inseto de bocas enormes e abertas, por onde se come.\n' +
      'A presença do Pouco se sente no que se perde: o grão que apodrece no armazém antes da hora, a criança que não nasce, o rebanho e a colheita que não vingam. Eredra tem hoje o maior número de demonistas da casa, pelo peso que ali têm a lavoura e o culto a Sevides; seguem-se Dantsem, Azanti e Calco. Nas Cidades-Estado, de terras rachadas pelo sol, e no deserto da Levânia, os cultistas são mais cruéis.\n' +
      'As doutrinas são cinco: jamais ajudar sem esperar coisa melhor em troca; deixar que os vizinhos pensem ter mais do que você, para que não o importunem; acumular sempre mais, só para si; espalhar a fome e a miséria, sobretudo entre os adoradores de Sevides; e praticar o canibalismo em honra de Antredom.',

    relacoes: [
      { nome: 'Morrigalti',
        texto: 'É o pai de Antredom, que é um dos seis príncipes nascidos dele. Morrigaltrina vive com medo de que esses filhos queiram tomar o seu lugar.' },
      { nome: 'Os Príncipes Demoníacos',
        texto: 'Sempre insatisfeito, é o rei dos acordos injustos: tira vantagem de tudo sem abrir mão de nada. Por isso é o menos procurado pelos pares, que sabem que ele não ajuda, ou ajuda pouco, mesmo quando o interesse é comum.' },
      { nome: 'Udoviom',
        texto: 'O filho nascido do seu estômago evita a sua presença maldita.' },
      { nome: 'Vouxiz',
        texto: 'Com a filha a relação é cordial, mas fria: ela o convida para banquetes no seu reino, coisa que ele, avaro, nunca ofereceria no dele. Talvez o faça para reforçar o direito de herança e um dia somar o reino do pai aos seus. Ela também atiça a rixa entre ele e Udoviom.' },
      { nome: 'Anasmadis',
        texto: 'Tem com ela uma rixa particular: a Princesa da Luxúria conta os glutões entre os seus adoradores, e ele os quer no seu reino, eternamente famintos, assistindo-o comer.' },
      { nome: 'Sevides, Liris e Quiris',
        texto: 'Odeia a tríade da agricultura, que é a fartura do alimento como ele é a fome. Seu maior prazer é arruinar as terras deles, mandando pragas e enxames de insetos sobre as plantações às vésperas da colheita.' },
      { nome: 'Descendentes',
        texto: 'Contam-se duas histórias. Na guerra contra os titãs, ele engoliu às escondidas respingos do sangue de Ganis e da essência do titã Ar; não deu conta de tanto poder, que se misturou ao seu e gerou no estômago uma filha, Vouxiz, titã-segunda que conquistou um reino e se fez Princesa Infernal. E, ao longo das eras, as miríades de demônios e almas que devorou ganharam consciência no seu estômago; ele percebeu e nunca a libertou, mas ela tomou nome próprio, Udoviom, esperou a hora de escapar e hoje é o príncipe da Peste.' },
    ],

    locais: [
      { nome: 'Alhino', onde: 'Terceiro reino do Inferno',
        texto: 'A cidadela de Antredom, no alto de uma grande montanha cercada por um vale, sem muralha. Os campos que parecem lavouras maduras são condenados pela avareza e pelo canibalismo presos ao chão por raízes, roídos por demônios-insetos e colhidos por demônios lavradores, vigiados por espantalhos de boca costurada. No castelo, Antredom e os generais se fartam de pães e tortas de órgãos diante dos condenados famintos; enviados de Sevides, sem dedos, asas nem olhos, mendigam migalhas aos pés da mesa. O guardião é Efialtes, nobre avarento que em vida negou o resgate do próprio filho, de chicote de fogo e boca presa por mordaça cravada; a cozinha fica com os guardiões antigos, como a bruxa Baiabá, que atraía crianças com doces.' },
      { nome: 'Templo da fazenda de Itéria', onde: 'Itéria, Eredra',
        texto: 'Um dos templos mais poderosos do culto, numa fazenda perto da cidade, comprada há muito por um simpatizante em busca de poder na região. Ali chamam o rio Sevides pelo nome antigo, Itéria, e tramam a ruína dos lavradores.' },
      { nome: 'Labirinto de Tória', onde: 'Tória, Calco',
        texto: 'Um labirinto subterrâneo onde os demonistas soltam donzelas raptadas em outras cidades, para que demônios as cacem e devorem em honra de Antredom. Dizem que os cultistas dali esperam a ocasião de roubar e profanar o Arado de Ouro, relíquia dos adoradores de Sevides.' },
    ],

    feriados: [
      { datas: [{ dia: 30, mes: 4 }, { dia: 30, mes: 6 }],
        quando: 'As noites de 30 do mês da Semente e de 30 do mês do Talento',
        nome: 'Banquete dos Famintos',
        texto: 'Cai nas mesmas noites da Festa da Fartura e da Festa da Colheita: é afronta a Sevides e disfarce, pois o banquete passa por festa ao deus. Por dias ou semanas a vítima, já arruinada, é deixada com fome; no dia, enganam-na a prometer qualquer coisa por comida, e ela promete a própria alma sem saber. Quando se sacia, o acordo se sela: é sacrificada, o corpo vira prato dos cultistas e a alma vai para Antredom.' },
    ],

    itens: [
      { nome: 'Medalhão da Fome',
        texto: 'Disco de ouro com uma mão e uma boca gravadas no centro, usado só pelo Dux Bankdi da casa. Ao tocar alguém, rouba-lhe a energia heroica, e a vítima fica faminta e cansada. Na borda se lê: «Minha força é a fome e a fraqueza do meu inimigo.»' },
      { nome: 'Moeda de Efialtes',
        texto: 'Moedas comuns amaldiçoadas, passadas às escondidas em pagamentos: quem recebe uma vê apodrecer de um dia para o outro toda comida que junta. Ninguém sabe quantas são; só os demonistas, ou quem vê magia, enxergam o símbolo de Antredom num dos lados.' },
    ],
  },
  {
    slug: 'branaxis',
    nome: 'Branaxis',
    classe: 'principe',
    // O epíteto, sem repetir a classe: o cartão já diz "Príncipe" na linha de cima.
    titulo: 'O Pesadelo Medonho',
    imagem: null,
    // Fonte: principes.pdf, págs. 35–41 (3.3 Branaxis, com Estela, a Alma Fria); Heldrom (3.7).

    prefacio: {
      texto:
        'Tinha sido fácil, e até divertido, brincar com os deuses. Ainda ecoavam em seus ouvidos os gritos de Maira, de Ganis e de Lena, afogadas no próprio desespero. Crezir fora forte como o pai, Blator, e mesmo assim cedera ao medo; o rosto sereno de Selimom virara uma máscara de agonia. Faltava Plandis. Do que teria medo o deus louco? Não importava.\n' +
        'Invadiu o reino de Plandis matando generais com um olhar e chegou a uma torre espiralada, de piso xadrez e paredes de espelho. Subia as escadas e às vezes sentia que descia, cada vez mais fundo, enquanto o próprio rosto distorcido o encarava de mil espelhos. Não sabia que, ao pisar na torre, seu corpo tombara num sono eterno, amaldiçoado pelo deus. A busca sem fim era um sonho.\n' +
        'Plandis se aproximou do corpo caído, arrancou com as mãos a consciência do sonhador e a prendeu numa urna. O sonho virou pesadelo, e o próprio Medo se afogou no desespero. Junto à urna, a voz do deus ecoou: «Aprisionaste minha família em seus medos e me desafiaste. Pagarás para sempre pelo que fez, criatura abominável. Jamais me encontrarás.» O corpo foi banido ao seu reino infernal; a urna, escondida em lugar que só Plandis conhece.',
      fonte: 'Extraído de O Livro de Maudi, do capítulo "Pesadelo Medonho" — Biblioteca de Saravossa.',
    },

    descricao:
      'Filho do deus caído Heldrom e da princesa Fulvina, o titã-segundo Branaxis nasceu medonho. Suas partes divina e demoníaca se rejeitaram, e a pele ficou tão fina que parece queimada, descascando ao menor toque e deixando ver os órgãos. Metade do rosto guarda uma expressão de dor congelada, com um olho mais alto que o outro; na outra metade, a pele se abre em buracos que mostram o interior da face. A dor daquele olho desperta pesadelos em quem o vê.\n' +
      'A Princesa da Vaidade se afastou do filho, e foi o pai quem o criou e treinou até que conquistasse um reino infernal. Amargurado, Branaxis aprendeu cedo a usar a própria aparência como vingança contra a mãe, depois a manipular os outros e a canalizar o poder do medo. É tido como a encarnação do Medo. Desde a luta com Plandis está preso, a mente numa urna escondida e o corpo no fundo do inferno, mas o seu poder continua grande, e da energia do corpo adormecido nascem demônios.\n' +
      'Manipulador e vingativo como os pais, gosta de prender as vítimas em jogos de terror planejados com cuidado. Conhece tudo o que aflige cada uma e não pretende matá-la: quer que enlouqueça ou se submeta a ele, e adora ouvir os gritos. Quanto mais forte o medo, mais forte ele fica, mas usa com perfeição até o medo mais banal. Sonha aprisionar os deuses e governar a criação deles, e se vingar da mãe que o abandonou.\n' +
      'Aparece na forma que mais assusta a vítima. Em geral, é um homem alto, de cabelos pretos e curtos, olhos todo negros num rosto desfigurado e pele muito pálida, numa longa veste cor de grafite que lhe cobre o corpo e solta fumaça negra; dessa fumaça nascem os Pesadelos. Não tem símbolo próprio, mas na capa do Livro do Medo há um que os fiéis tatuam nos braços: a chama negra ao centro é a força de Branaxis; o pentagrama, as cinco formas do medo, que são susto, fobia, terror, pesadelo e pânico; os dois círculos em volta, a prisão eterna que Plandis lhe impôs. Sua cor é o grafite.\n' +
      'Age à noite contra os inimigos do culto, os marcados pelos cultistas e os que lhe chamam a atenção em sonhos, muitas vezes gente marcada pela loucura ou pela dor. Tem prazer especial em atormentar mulheres que rejeitaram ou abandonaram os filhos. Também age por meio das guildas de assassinos, mandando aos seus líderes pesadelos que lhes apontam novos alvos. Quem foge dos sonhos que ele manda costuma enlouquecer ou vender a alma, e essas almas são usadas no Inferno para tentar libertá-lo.\n' +
      'Os fiéis têm três graus. Os Iniciantes já trazem a marca tatuada, a pele começa a empalidecer e o poder dos demônios invocados não os atinge. Os Regentes do Culto alcançam o grau tomando parte num assassinato escolhido pelos líderes, cujo sangue serve ao Livro do Medo; podem ler o Livro e invocar demônios em grupos de quatro. Os Olhos Negros, poucos, passam por uma provação dos demônios: a marca, toda negra, vai para as costas, e ganham os Olhos Negros. Esses invocam sozinhos.\n' +
      'Dois ritos importam. Na Invocação do Livro do Medo, uma vez por mês, um sacerdote, de Plandis se possível, é morto e seu sangue derramado sobre o símbolo da capa, sob um cântico macabro; quando o Livro fica todo vermelho, o regente e três corregentes leem as inscrições, e os demônios, com uma sombra do próprio príncipe, descem sobre a casa ou o castelo escolhido. O lugar fica maldito: quem entra enfrenta todos os seus medos num sono profundo que parece real, e pode perder a alma ou o juízo, mas não a vida. No Rito do Medo, o seguidor derrama o próprio sangue no Livro e clama pela ascensão; quando o símbolo escurece, lê, e um Enviado Silencioso vem pô-lo diante dos seus medos. Quem os vence se torna Olho Negro; quem falha morre, e a alma é arrastada ao Inferno.\n' +
      'O templo é um velho casarão de três andares, réplica da Casa do Medo, onde se aceitam os fiéis e se tramam os planos de libertação; suspeita-se que fique perto de Dartel. Os seguidores não usam veste comum, para não serem perseguidos; reconhecem-se só pela tatuagem. As doutrinas: trair o culto é morte certa; ajudar Pesadelos e Enviados a juntar o máximo de almas; espalhar o medo e o terror; assassinar quem estiver no caminho; perseguir os sacerdotes de Plandis; e achar a Urna de Branaxis para libertá-lo.\n' +
      'Talvez o culto tenha nascido em Abadom, à procura da sede secreta da ordem de Plandis, e de lá se espalhou pelas fronteiras de Dartel, atraído pelo mistério da região. Em Azanti, entre as intrigas da dominação por Filanti, atrai quem reza pela morte dos inimigos e encomenda aos Enviados o assassinato deles. Os líderes de Verrogar e de Dantsem temem que os rumores do culto pesem na decisão da guerra entre os dois reinos. Em Luna, o rei Navarro se inquieta: os seguidores não pegam a peste, e onde mais se espalham, mais focos dela aparecem. Em Abadom e na Levânia, o culto age em silêncio, matando sacerdotes e quem estorve o seu crescimento.',

    relacoes: [
      { nome: 'Fulvina',
        texto: 'A mãe que o rejeitou pela feiura. É quem ele mais odeia e, no íntimo, quem mais deseja que o aceite.' },
      { nome: 'Heldrom',
        texto: 'O pai, que o criou e treinou até que conquistasse um reino seu. Teriam boa relação, não estivesse Branaxis preso nos próprios pesadelos; é por esse filho que o isolamento de Heldrom não é completo.' },
      { nome: 'Plandis',
        texto: 'O deus que o venceu, o fez dormir para sempre e lhe selou a mente numa urna. O culto persegue os seus sacerdotes, prefere o sangue deles nos ritos e guarda o Dia do Silêncio na data da festa do deus, para afrontá-lo.' },
      { nome: 'Os deuses',
        texto: 'Antes da prisão, quis manipulá-los todos com imagens terríveis, alimentar-se do medo deles e usar o poder assim tirado para matá-los, e então governar o plano material e aterrorizar a criação. Prendeu Maira, Ganis, Lena, Crezir e Selimom nos próprios medos; só Plandis lhe escapou, e os libertou da maldição.' },
      { nome: 'Descendentes',
        texto: 'Os Pesadelos e os Enviados Silenciosos, demônios nascidos da energia do seu corpo adormecido, que só obedecem a quem tem o Livro do Medo. Os Pesadelos são cavalos negros alados, decrépitos como zumbis, que atacam dentro dos sonhos; quem morre no sonho pode morrer de fato. Os Enviados são humanoides sem pupila e sem boca, com buracos no lugar do nariz e das orelhas, mantos grafite e grandes garras; flutuam sobre o chão e atacam os acordados, paralisando-os e roubando-lhes a voz antes de matá-los de pavor. Os que sobrevivem ficam loucos e mudos.' },
      { nome: 'Estela, a Alma Fria',
        texto: 'A Guardiã, criada da primeira vítima da Casa do Medo. Presa ali com a irmã Evem por dias sem conta, morrendo e acordando de novo, Estela sentia uma fome que a irmã não sentia; quando um cão monstruoso abriu o ventre de Evem, foi ela quem a devorou, e virou A Devoradora. Hoje vaga por Rubiniate, onde arranca pele e músculo dos condenados e os deixa a vagar em ossos, e às vezes aparece na Casa do Medo com a beleza de quando era humana, para seduzir e devorar. Em Rubiniate é alta, de pele amarelada e dentes pontudos, com a cabeça cheia de pregos e o peito sem coração. As mulheres desconfiam dela, por isso as mata primeiro.' },
    ],

    locais: [
      { nome: 'Rubiniate', onde: 'Inferno, décimo primeiro reino',
        texto: 'A morada dos condenados por assassinato, uma necrópole num mundo de pesadelo, de tumbas suspensas no ar. Cada condenado arranca pedra da pedreira e ergue uma escada espiralada e uma tumba suspensa, maiores quanto maiores os pecados, enquanto demônios lhe dão forma aos medos e Pesadelos cavalgam o ar. Terminada a obra, os demônios o adormecem, guardam-lhe a consciência numa urna e o sepultam com ela, num pesadelo sem fim. Há rumores de que essa energia abre brechas para Branaxis falar com seus filhos; quem se entrega renasce Enviado Silencioso ou Pesadelo.' },
      { nome: 'Casa do Medo', onde: 'Trilhas montanhosas de Tagmar, em lugar incerto',
        texto: 'Surge ao menos uma vez a cada dez anos, ou onde se junta muita energia maligna, às vezes na Noite do Pesadelo. Por fora é uma velha casa de três andares abandonada; dentro, quem entra vive os piores pesadelos, e entrar é quase certeza de não sair. Dela se espalha uma neblina por quase mil passos em volta; quem entra na neblina só escapa entrando na casa e vencendo os próprios medos, ou pela mão de Plandis.' },
      { nome: 'Casarão do culto', onde: 'Desconhecido; suspeita-se que perto de Dartel',
        texto: 'O templo: uma réplica de três andares da Casa do Medo, onde se aceitam fiéis, se fazem os cultos e se tramam os planos de libertação.' },
      { nome: 'Torre espiralada', onde: 'Reino de Plandis',
        texto: 'A torre de piso xadrez e paredes de espelho onde Branaxis caiu no sono eterno e Plandis lhe arrancou a consciência.' },
    ],

    feriados: [
      { dia: 21, mes: 3, nome: 'Noite do Pesadelo',
        texto: 'A preferida dos seguidores, e talvez de alguns de outros príncipes, um dia depois do Dia do Amor e da Paz de Selimom. Invocam-se muitos Pesadelos para espalhar medo e caos entre os habitantes de Tagmar e os fiéis dos deuses; muitos enlouquecem, outros se convertem e perdem a alma. Às vezes a Casa do Medo aparece nessa noite e atrai viajantes incautos.' },
      { dia: 19, mes: 7, nome: 'Dia do Silêncio',
        texto: 'Os seguidores se reúnem em silêncio pela derrota de Branaxis, no mesmo dia em que se homenageia Plandis, para afrontá-lo. Quando conseguem, sacrificam um sacerdote de Plandis, e os Enviados Silenciosos surgem para aterrorizar os inimigos até a morte.' },
    ],

    itens: [
      { nome: 'Livro do Medo',
        texto: 'De capa negra com o símbolo do príncipe em vermelho, parece em branco fora dos ritos. Sangue na capa, um chamado a Branaxis e a leitura das inscrições que aparecem bastam para invocar Pesadelos ou Enviados Silenciosos. Muitos exemplares arderam na guerra contra a seita Bankdi, mas outros surgiram; especula-se que a pele dos Olhos Negros, marcada com o mesmo símbolo, vire livro depois que morrem.' },
      { nome: 'Olhos Negros',
        texto: 'Olhos iguais aos dos Pesadelos, dados a todo seguidor de terceiro grau e impossíveis de tirar. Revelam todos os medos e aflições de uma pessoa e deixam entrar no seu sonho e moldá-lo. Com o tempo, destroem a alma de quem os usa, e o corpo que sobra vira um Pesadelo sob o domínio de Branaxis.' },
      { nome: 'Urna de Branaxis',
        texto: 'A urna divina em que Plandis selou a mente do príncipe, escondida noutro reino ou noutro plano. O culto a procura sem descanso para romper a maldição.' },
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
