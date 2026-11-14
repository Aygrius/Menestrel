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
        texto: 'Crezir acredita ter algo em comum com ela no fundo.' },
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
    slug: 'crizagom',
    nome: 'Crizagom',
    classe: 'deus',
    titulo: 'Honra e Justiça',
    imagem: null,
    // Fonte: deuses.pdf, págs. 34–38 (3.4 Crizagom); Blator, Crezir, Cruine, Selimom (relações);
    // principes.pdf, Heldrom (o julgamento do Caído); reinos.pdf, Azanti (Zanta, Magnus Supramati, Mil Mártires).

    prefacio: {
      texto:
        'Depois de mais um dia no castelo prateado, o senhor da honra e da justiça recolheu-se para dormir, e outra vez o sono lhe trouxe as lembranças antigas. Viu-se de novo entre corpos amontoados aos milhares, com a garganta seca e o cheiro de sangue em tudo. A espada pesava na mão, e o instinto a fazia descer uma, duas, dez, trinta vezes, até que os atacantes jazessem com os outros. Exausto e coberto de sangue, avistou os irmãos e as irmãs celebrando, cada um a seu modo, a vitória sobre os titãs.\n' +
        'O sonho terminava sempre do mesmo jeito: cada deus tomava o seu lugar sobre o mapa do mundo, como peças num tabuleiro, e os reinos ganhavam as cores dos seus guardiões. Daquela vez, porém, uma sombra brotou e correu sobre Tagmar, apagando as cores. Quando Crizagom viu que ela avançava justamente sobre a parte que lhe cabia, sentiu nas costas um golpe de punhal envenenado, e uma gargalhada falsa ecoou enquanto a escuridão escorria para as outras cores.\n' +
        'Acordou banhado em suor. Saltou do leito e saiu a caminhar com uma determinação de ferro, certo de que algo muito errado acontecia em seus domínios.',
      fonte: 'Extraído do livro «A Origem dos Deuses» — Acervo da Biblioteca de Portis.',
    },

    descricao:
      'Crizagom é a honra e a justiça em pessoa, o regente da balança. Vive no coração dos que cultivam os sentimentos mais nobres e fazem da defesa deles a sua batalha. Por isso muitos o chamam deus da nobreza, mas não da nobreza do sangue azul: é o deus de quem traz dentro de si sentimentos puros e justos e os mostra nos atos. Seus cavaleiros, sacerdotes e paladinos estão entre os que guardam os princípios mais altos do mundo conhecido.\n' +
      'Age nos tribunais, nas casas de comércio e em todo lugar onde a lei é invocada no dia a dia. No campo de batalha está sempre presente, e divide esse chão com o pai, Blator, e a irmã, Crezir. Mas o seu campo maior é o modo de vida que os seus preceitos exigem, pois todo ato de bravura e de honra é, de algum modo, ligado a ele.\n' +
      'É determinado e forte, de vontade férrea na defesa do que é justo, e implacável contra o mal e a injustiça. Para quem se esforça por viver à altura dos seus preceitos, a graça dele não tem fim; para quem escolhe o caminho mais fácil, resta só a justiça. Ser justo e imparcial como Crizagom é o mais perto que se chega da perfeição.\n' +
      'Todos os que juram tê-lo visto falam do mesmo guerreiro altivo, de armadura prateada impecável e capa azul ao vento, com um escudo triangular reluzente no braço esquerdo e um martelo de guerra cravejado de gemas. Às vezes aparece montado num alazão enorme. Entre os povos, o seu símbolo é a balança, o equilíbrio que permite viver em paz; entre os guerreiros, é uma espada com a ponta apoiada no chão, o equilíbrio entre bravura, nobreza de espírito, honra e justiça. Sua cor é a prata, a pureza do espírito.\n' +
      'É muito popular entre os que já pisaram um campo de batalha, ainda que divida a fama com Blator e Crezir, e mais ainda onde os seus devotos servem como magistrados e regentes. No campo, onde a guerra é sempre vista como desgraça, é pouco querido. Os elfos, que têm um senso próprio de justiça, não o veem com bons olhos, e os navegantes preferem crer na justiça de Ganis. A religião atua sobretudo em Azanti e Filanti, mas há congregações em todo o mundo conhecido.\n' +
      'A Ordem Sagrada dos Bravos Cavaleiros da Justiça tem hoje pouca influência política, até em Azanti, a sua terra natal. Os seus membros, porém, são bem recebidos em qualquer corte, e pesam mais nos tribunais e nas armas que nos conselhos.\n' +
      'O culto exige o compromisso com a verdade, a honra e a justiça: quem nunca mente e jamais comete ato desonroso dificilmente trai os ideais do deus. Os paladinos são a imagem mais alta de Crizagom e o exemplo para os demais fiéis.\n' +
      'Os templos se resumem numa palavra: força. Têm paredes grossas de pedra, com reforços de metal nos suportes, e janelas bastantes para que a nave central fique clara e arejada de dia e mais grave à noite. Os Grandes Templos se confundem com fortes de guerra e, em tempo de guerra, servem de fortaleza aos cavaleiros e paladinos e de abrigo aos camponeses e a quem não pode lutar.\n' +
      'Em tempo de paz, os sacerdotes vestem túnica azul-escura com detalhes em prata. Quando partem em missão, levam uma armadura prateada chamada Honra, um grande escudo triangular chamado Bravura e uma arma chamada Justiça, quase sempre um martelo de guerra.\n' +
      'As doutrinas são quatro: defender a verdade a qualquer custo, viver os preceitos de honra e justiça, levar a mensagem de Crizagom a todos os lugares e ser exemplo de honestidade e coragem em cada atitude.',

    relacoes: [
      { nome: 'Blator',
        texto: 'O pai, de cujo indicador direito nasceu. Blator vê com orgulho, elevadas no filho, algumas das suas melhores virtudes. Com Crezir, os três formam a tríade dos deuses da guerra.' },
      { nome: 'Crezir',
        texto: 'A irmã, que não demonstra respeito a ninguém além dele. Procura-o quando precisa de conselho para o que a força não resolve, ou de um pouco de descanso, e a relação entre os dois é razoavelmente boa, embora cada um tenha escolhido o seu caminho.' },
      { nome: 'Selimom e Sevides',
        texto: 'Os dois amigos de Crizagom no Panteão, que têm grande respeito pelo jovem deus. Com Selimom a amizade é de irmãos, ainda que divirjam sobre os mortais e o modo de lidar com eles.' },
      { nome: 'Cruine',
        texto: 'Uma relação incomum com o juiz das almas: Crizagom intercede pelos mortais no Tribunal dos Mortos e é o primeiro rosto que eles veem ao chegar para o Julgamento Final. Pede clemência pelos que agiram com justiça e penas duras para os que agiram com malícia.' },
      { nome: 'Cambu e Lena',
        texto: 'Evitam-no o quanto podem: a natureza intransigente do jovem deus torna os encontros desagradáveis.' },
      { nome: 'Maira e Ganis',
        texto: 'Raramente se relacionam com ele, porque Crizagom não tem por dignas de atenção as criaturas delas, que em sua maioria não sabem julgar.' },
      { nome: 'Palier',
        texto: 'Nunca demonstrou se importar muito com ele.' },
      { nome: 'Parom',
        texto: 'Mantém com ele, ao que parece, uma relação sem hostilidade.' },
      { nome: 'Plandis',
        texto: 'O sobrinho simplesmente ignora a existência do tio.' },
      { nome: 'O Panteão',
        texto: 'Dá-se bem com todos os deuses e nunca julga nenhum dos seus pares pela natureza divina de cada um.' },
      { nome: 'Heldrom',
        texto: 'Quando o irmão quis tomar à força o poder de Gênese, foi Crizagom quem lembrou que aquilo não era justo. Escolhido juiz pelos deuses depois da derrota do traidor, mandou que o apagassem da memória e o chamassem de A Mancha da Corrupção. Deixou-lhe uma cicatriz no rosto, e Heldrom o odeia mais que a qualquer outro; seus templos e devotos são o alvo preferido da seita.' },
      { nome: 'Descendentes',
        texto: 'Não há sinal de que Crizagom tenha descendentes.' },
    ],

    locais: [
      { nome: 'Castelo prateado', onde: 'Morada dos deuses',
        texto: 'O castelo de Crizagom, onde ele recebe os outros deuses e pede que a paz seja mantida em seus corredores.' },
      { nome: 'Catedral de Crizagom', onde: 'Zanta, Azanti',
        texto: 'A grande catedral, para os fiéis o lugar mais sagrado do culto. Ali o sumo sacerdote conduz em pessoa a Vitória da Justiça.' },
      { nome: 'Muro dos Campeões', onde: 'Zanta, Azanti',
        texto: 'Diz-se que há em Zanta um muro de mármore branco com os nomes de todos os campeões da justiça. Cada nome, contam, é gravado por um enviado que desce do céu quando um campeão parte para o Tribunal de Cruine.' },
      { nome: 'Monumento aos Mil Mártires', onde: 'Sede da Ordem Sagrada dos Bravos Cavaleiros da Justiça',
        texto: 'Para o clero, um dos lugares mais importantes da fé. Honra os paladinos que deram a vida para derrotar um Príncipe do Inferno na defesa de Zanta.' },
      { nome: 'Grandes Templos', onde: 'Por toda Tagmar',
        texto: 'Tão sagrados quanto a catedral. Erguidos como fortes de guerra, abrigam os cavaleiros e o povo quando a guerra chega.' },
      { nome: 'Criptas e monumentos dos guerreiros de Crizagom', onde: 'Por toda Tagmar',
        texto: 'Toda cripta ou monumento erguido a um guerreiro do deus é lugar sagrado, e os devotos o respeitam e o protegem.' },
    ],

    feriados: [
      { dia: 9, mes: 3, nome: 'Vitória da Justiça',
        texto: 'Celebra a derrota da Seita e a sua expulsão de Tagmar, na grande catedral de Zanta, com o sumo sacerdote presente. Primeiro vêm jejum, vigília e oração, lembrando a chegada da Seita e o seu alastrar pelo mundo; depois, cânticos e louvores dos que ficam na catedral. Ao fim da vigília, os voluntários marcham a pé e a cavalo por Zanta, de norte a sul e de leste a oeste, e voltam à catedral, como os exércitos da resistência que investiram contra a Seita. Por último, a festa: mesas enormes ao redor da catedral, um grande banquete, a pregação depois da refeição e, noite adentro, fogueiras, vinho e disputas de contos animadas por bardos da terra e de passagem.' },
      { dia: 4, mes: 9, nome: 'Memorial dos Ancestrais',
        texto: 'Honra todos os que deram a vida pela causa, tombando em batalha ou dedicando a ela a existência, e lembra os nomes dos campeões da justiça, pequenos e grandes. O nome mais celebrado é o de Magnus Supramati, o primeiro paladino e fundador da Ordem Sagrada dos Bravos Cavaleiros da Justiça.' },
      { dia: 29, mes: 12, nome: 'Noite dos Justos',
        texto: 'Mais rito que festa, dois dias antes do Dia de Cruine. Já foi guardada por todos os devotos; hoje, só pelo clero. Antes dela vêm sete dias de jejum de carne, de bebida e dos prazeres da carne, em que os fiéis apenas meditam e rezam, para reforçar os laços com a honra e a bravura e enfrentar o mal sem esmorecer.' },
      { quando: 'No dia em que a cidade foi salva, a cada ano',
        nome: 'Lembrança dos Mártires da Cidade',
        texto: 'As cidades protegidas pela intervenção dos guerreiros sagrados de Crizagom lembram o feito no fim do dia correspondente, com pequenas celebrações e orações de gratidão. A bebida é proibida, em respeito ao sacrifício dos mártires, mas os bardos que recontam os feitos se encarregam de alegrar a todos.' },
    ],

    itens: [
      { nome: 'Alma dos Mártires',
        texto: 'Uma espada de mão e meia que o deus cedeu a um dos seus paladinos durante a guerra contra a Seita.' },
      { nome: 'Chifre de unicórnio',
        texto: 'Fala-se, sem muita certeza, de um chifre de unicórnio guardado pela Ordem dos Cavaleiros da Justiça. Ninguém conhece os seus poderes, mas dizem que são muitos.' },
      { nome: 'Armadura, Escudo e Martelo do Sumo Sacerdote',
        texto: 'A maior relíquia da ordem, forjada num dos Templos de Todos os Deuses durante a guerra contra a Seita e vestida pelo sumo sacerdote. Perdeu-se quando os demonistas tomaram Zanta, e ninguém sabe onde está. Dizem que os seus poderes eram enormes, mas ninguém sabe ao certo quais.' },
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
    slug: 'ganis',
    nome: 'Ganis',
    classe: 'deusa',
    titulo: 'Águas',
    imagem: null,
    // Fonte: deuses.pdf, págs. 45–49 (3.6 Ganis); Crezir, Liris, Maira, Quiris e Sevides (relações);
    // principes.pdf, Vouxiz (Concepção e Relação com os deuses) e Antredom.

    prefacio: {
      texto:
        'O barco tinha resistido inteiro àquela tempestade. Raios por todos os lados, um deles na vela menor; chuva quase de granizo; ondas enormes que arrastaram para o mar vários dos meus homens. Depois de horas de desespero, as águas se acalmaram e o céu se abriu. Contei a tripulação: três tinham descido às profundezas, e dois deles eram os que mais tinham lutado para salvar o navio. Não morreram sem honra, mas todos estavam abatidos.\n' +
        'Deixei os marujos consertando o que se partira e fiquei pensando. Por que a impiedosa Ganis faria aquilo comigo? Por que ela, tão pacífica, pedia vidas em troca de vidas? Ao longe, golfinhos saltavam, felizes e do mar, como eu. Então uma cabeça humana despontou das águas, e eu vi os cabelos lindos de uma mulher, com tristeza e pena estampadas no rosto. Ela cantou. Perdi o fôlego, fechei os olhos e só ouvi, até não ouvir mais nada.\n' +
        'Acordei na minha cabine; os homens disseram que eu tinha caído de exaustão no convés. Entendi então o que me afligia. Ganis, a caprichosa deusa dos mares, não é má: faz o que é preciso para manter o equilíbrio, ainda que deixe vítimas. Ajoelhei-me e rezei a ela, pedindo perdão pelas tolices que pensara. Naquele instante, um arco-íris raiou.',
      fonte: 'Extraído do livro «Minhas Andanças», de autor desconhecido, capítulo 3 — O Mar.',
    },

    descricao:
      'Ganis é a bela deusa das águas, senhora absoluta dos rios e dos oceanos, que leva as suas águas cheias de vida a todos os cantos do mundo conhecido. O seu reino rivaliza em esplendor e extensão com a própria Tagmar. Governa o leito dos rios, o vaivém das marés, o refluir das ondas e a temida fúria do oceano. Quem vive das águas, e sobretudo quem arrisca a vida todo dia sobre as ondas, tem por ela um temor e uma veneração fanáticos, e nunca deixa de lhe agradecer.\n' +
      'Ensina que a água é o mais importante dos elementos, mas que o mundo só fica de pé se houver equilíbrio entre todos eles. Ensina também a respeitar o mar, os rios e os lagos: não desviá-los sem motivo nem sujá-los por ganância.\n' +
      'É instável e caprichosa. Mãe zelosa e benevolente com os seus filhos queridos, é também severa com eles, revolta-se à menor desobediência e mostra o desgosto numa fúria que os homens do mar conhecem bem; os poucos que sobreviveram a ela contam histórias fantásticas. Ainda assim, cuida bem dos seus, e quem é dela navega a salvo.\n' +
      'Velhos lobos do mar juram que, depois das grandes tempestades, quando os primeiros raios de sol anunciam o fim da tormenta, já viram caminhar sobre as águas uma mulher de beleza esplêndida: cabelos longos e loiros, pele branca, olhos de um verde tão fundo que pareciam esmeraldas, vestido branco translúcido e, na cabeça, uma coroa de ouro cravejada de pérolas e pedras preciosas. O seu símbolo é a água, e tudo o que a lembra pode representá-la, de uma fonte a uma criatura marinha; o mais popular é o náutilo, o caracol do mar. Sua cor é o azul, qualquer azul, e hoje sobretudo o azul-marinho, o dos mares e dos rios.\n' +
      'Como todos sabem quanto a vida depende dos frutos da água, quase todo habitante de Tagmar a respeita. Os navegantes que querem seguir no ofício lhe fazem oferendas para que ela não mande uma tempestade no seu turno no mar, e a veneram quase todos os que vivem em portos, na costa ou à beira de rios e lagos importantes. Os devotos mais fervorosos estão em Conti e em Porto Livre; neste último, o culto tem ganhado um traço mais guerreiro.\n' +
      'A influência dela chega até os reinos do interior, sem saída para o mar. Secas longas e a falta de rios subterrâneos para irrigar são tidas como desagrado da deusa, e por isso os seus sacerdotes são respeitados em todo o continente.\n' +
      'A Ordem de Ganis existe para levar a palavra da deusa e espalhar a sua fé por Tagmar, e ela tem grande orgulho desses filhos, que creem com fervor em cada palavra sua. A sede fica em Conti, a cidade de mais devotos. O culto se volta ao respeito ao mar e à preservação dos seres marinhos: a água é o princípio da vida, e para os fiéis Ganis é a mãe de tudo o que vive, até dos que se dizem filhos de outros deuses. Preservar a vida é doutrina fundamental.\n' +
      'Os templos ficam em geral perto da costa e usam muito vidro, para que a vista do mar seja de todos. Em alguns há piscinas ou espelhos d\'água no centro, e o sacerdote preside o culto com os pés dentro da água.\n' +
      'As sacerdotisas vestem togas amplas que cobrem o corpo todo, de azul mais escuro para as mais experientes e mais claro para as novas. Usam joias azuladas, violeta ou brancas, colares e pulseiras de conchas, pérolas e pequenas estrelas-do-mar. Dentro do templo andam sempre descalças, depois de lavar os pés à entrada.\n' +
      'As doutrinas são quatro: proteção nos mares, respeito aos rios, lagoas e oceanos, busca da pureza da alma e bondade para com os viajantes.',

    relacoes: [
      { nome: 'Sevides',
        texto: 'O irmão e companheiro, a quem ama muito. Quando ele, por razões que ninguém conhece, ficou estéril como as areias do deserto de Blirga, foi a Ganis que pediu ajuda, e ela se uniu a ele para que voltasse a ser fértil como as suas águas. Ela se enfurece com o pouco caso dele diante de assuntos maiores que a colheita, e grandes brigas agitam o céu quando ela lhe cobra uma postura mais ativa no Panteão.' },
      { nome: 'Liris',
        texto: 'A filha, com quem tem uma relação conturbada. Dizem que Liris herdou da mãe as mudanças bruscas de humor.' },
      { nome: 'Quiris',
        texto: 'O filho, a quem ama muito pela obediência. Ele, porém, sente pela mãe uma tensão que não sente pelo pai, pelo modo ríspido como ela trata Sevides e pelos humores com que trata os seres de Tagmar.' },
      { nome: 'Maira',
        texto: 'Foi a seu chamado que Ganis encheu de água o vazio entre as terras e formou os rios, os lagos e os oceanos. Respeita-a em muitos assuntos dos mortais, mas guarda opinião e interesses próprios.' },
      { nome: 'Crezir e Blator',
        texto: 'Agrada-lhes o lado irado da deusa. Crezir acredita ter, no fundo, algo em comum com ela.' },
      { nome: 'Selimom e Crizagom',
        texto: 'Preferem a face bondosa e serena de Ganis. Crizagom, porém, raramente a procura: não tem por dignas de atenção as criaturas dela, que em sua maioria não sabem julgar.' },
      { nome: 'O Panteão',
        texto: 'Com os demais deuses, a relação é estável e diplomática.' },
      { nome: 'Vouxiz',
        texto: 'A filha involuntária. Na guerra contra os titãs, Antredom engoliu às escondidas respingos do sangue de Ganis, e deles nasceu, no estômago do príncipe, a titã-segunda que herdou da deusa o poder sobre névoas e brumas. Vouxiz passou a devorar as ninfas e as enviadas de Ganis para tomar o seu poder; a deusa, com a ajuda de outros deuses, a amaldiçoou e a baniu para o Inferno. A rivalidade dura séculos.' },
      { nome: 'Descendentes',
        texto: 'Da união com Sevides nasceram Quiris e Liris, de beleza e doçura incomuns. No primeiro aniversário deles, Ganis criou as ninfas dos fios dourados dos próprios cabelos e as deu aos filhos como companhia.' },
    ],

    locais: [
      { nome: 'Templo Costeiro', onde: 'Conti',
        texto: 'O mais belo templo da deusa, erguido a pouca distância de uma praia rochosa e ligado ao oceano por um canal largo, por onde o mar entra todo dia. No primeiro andar, canais e pontes ligam ilhas de jardins tranquilos à entrada; no segundo, onde se fazem as liturgias, os fiéis deixam moedinhas nas fontes, e uma estátua de bronze da deusa, de várias vezes a altura de um homem, ergue-se de cada lado do salão. Uma cabeça de peixe de pedra verte sem parar uma cortina de água, passagem dos sacerdotes para o terceiro andar, cercado de muros e vedado a quem não é do templo. Ali, numa câmara de pedra dentro de um lago, as sacerdotisas fazem os ritos mais secretos nas noites de lua cheia.' },
      { nome: 'Conti', onde: 'Conti',
        texto: 'A cidade de mais devotos da deusa e sede da Ordem de Ganis. É ali a maior festa do Dia do Mar.' },
      { nome: 'Porto Livre', onde: 'Porto Livre',
        texto: 'O outro grande centro do culto, onde a fé em Ganis tem ganhado um traço mais guerreiro.' },
      { nome: 'Dartel', onde: 'Dartel',
        texto: 'Comuns antes do Cataclismo, as ninfas criadas dos cabelos da deusa hoje só se encontram ali.' },
    ],

    feriados: [
      { dia: 1, mes: 2, nome: 'Dia do Mar',
        texto: 'Os navegantes se reúnem no cais mais próximo e fazem oferendas a Ganis, pedindo perdão ou agradecendo tudo o que ela faz por eles. Diz-se que o dia vem sempre depois da primeira tempestade do solstício. Em Conti há grande celebração, com danças e bebida à farta.' },
      { dia: 15, mes: 3, nome: 'Festa da Prosperidade',
        texto: 'Em honra de Sevides e de Ganis, muito querida no litoral e nas terras à beira de grandes águas. No meio da manhã, os sacerdotes dos dois deuses levam o povo ao mar ou ao rio, entoando cânticos e preces ao casal celeste da fertilidade. Leva-se à água o que dão as lavouras e as criações, e leva-se água às plantações e aos pastos, sinal da união eterna de Sevides e Ganis.' },
      { dia: 26, mes: 11, nome: 'Dia da Sobra',
        texto: 'O dia em que os peixes do mar quase dobram, e os pescadores passam o dia inteiro pescando. Não era tão festejado antigamente; foram os sacerdotes de Ganis que incentivaram a festa. Há torneios de quem pega o maior peixe, o comércio também dobra, e o melhor vem no fim, quando as famílias dos pescadores se reúnem para a grande refeição.' },
    ],

    itens: [
      { nome: 'Bastão das Tempestades',
        texto: 'Um bastão de ouro com uma joia azul em cada ponta, que dá a quem o empunha poder sobre tempestades, furacões, mares e rios, e sobre a água em todas as suas formas.' },
    ],
  },
{
    slug: 'lena',
    nome: 'Lena',
    classe: 'deusa',
    titulo: 'Prazer e Perfeição',
    imagem: null,
    // Fonte: deuses.pdf, págs. 51–57 (3.7 Lena); Blator, Crezir, Crizagom, Maira, Palier, Parom, Plandis e Selimom (relações);
    // principes.pdf, Anasmadis e Fulvina.

    prefacio: {
      texto:
        'Quase todas as noites, uma voz corria pelo sono dos Filhos de Lena: «Venham a mim, meus Filhos; liberem a vontade de seus corpos e viajem com a noite pelo doce mundo do prazer que lhes proporciono.» Só o fundo da alma a entendia. Do alto, a deusa olhava a intimidade dos casais, e os seus olhos cor de violeta brilhavam a cada prazer novo que encontrava.\n' +
        'Crezir chegou por trás. Disse que aquilo era perda de tempo, que o que os mortais querem de verdade é o sangue dos semelhantes no chão de Tagmar, e que a filha só fazia aquilo para afrontá-la. Lena não tirou os olhos do oráculo. Respondeu que nem o guerreiro mais sanguinário aguenta lutar sem parar, nem vive sem festejar, e que quando ele dorme é ela quem está nos seus sonhos. Duvidava que algum fiel dela sonhasse com a mãe.\n' +
        'Crezir ensaiou a réplica, mas Selimom chegou chamando a esposa para recebê-la com honras, e ela saiu queixando-se ao marido da filha impossível que os dois tinham feito. Lena os viu partir juntos, a fúria pelo braço da paz, e sorriu: ali estava a resposta à dúvida que a mãe lhe plantara. Voltou a olhar os seus Filhos, que celebravam mais uma noite em seu nome.',
      fonte: 'Extraído de «O Livro dos Céus», de Pero Maltus — Biblioteca de Saravossa.',
    },

    descricao:
      'Lena é a deusa do perfeccionismo, do prazer erótico e do prazer no trabalho. Quer a felicidade dos seres pela busca da perfeição, e a perfeição, para ela, é o belo: a beleza máxima é perfeita, e a perfeição máxima é bela. Só se chega a ela numa atividade que dê prazer aos dois lados. Por isso abençoa o trabalho bem feito e o amor feito com carinho e paixão, e abomina a guerra, que dá prazer a uns e dor a outros.\n' +
      'Isso não a faz mansa. Buscar o belo obriga a enfrentar o que é corrupto, de armas na mão se preciso, e Lena é inimiga mortal dos demônios. Não conhece justo e injusto, valores que lhe parecem passageiros e mudam com o tempo e o lugar; pergunta só se o seu povo está feliz ou infeliz. Os fiéis a têm, por isso mesmo, pela mais justa dos deuses, e ela está entre os que mais andam perto dos seus, protegendo-os e mantendo-os na trilha.\n' +
      'É paciente, de atitude e iniciativa, mas herdou da mãe um gênio que passa da calma à fúria quando algo a indigna. Defende o que pensa diante dos outros deuses, às vezes com dureza, sem perder a simpatia. Com os adoradores é vigilante e de um amor zeloso.\n' +
      'Não distingue classe, riqueza, sexo ou raça: todos têm o direito de dar e receber prazer. Onde houver povo há Lena, seja qual for o deus da terra, e os mestiços são sempre bem recebidos entre os seus. Dos ofícios, os bardos são os que mais se reconhecem nela. Ainda assim, há quem a compare aos demônios, como tentadora dos puros: os que veem no trabalho penoso a sina dos pobres, os senhores de escravos, os que usam o sexo como arma e os que o têm por pecado ou só por meio de gerar filhos.\n' +
      'Quem a viu a descreve de jeitos diferentes, mesmo quando muitos a viam juntos, mas sempre de uma beleza além da medida dos mortais. Nas aparições veste um manto vermelho, delicado e quase transparente; os olhos são sempre violeta, e um perfume sedutor fica no ar. Os fiéis evitam esculpi-la ou pintá-la, por vergonha de figurar a perfeição com coisa imperfeita, e criticam duramente quem tenta. Preferem um abraço, um beijo e uma rosa posta em algum canto da obra, que quer dizer «Lena está presente». Já os artistas de fora a esculpem com frequência, sensual e rica em detalhes, a mão direita erguida segurando uma rosa.\n' +
      'Seu símbolo é uma rosa dentro de um círculo. A rosa, flor de espinhos, é ao mesmo tempo a beleza e a defesa do que é perfeito, belo e bom; o círculo é a perfeição. Sua cor é o rosa, do feminino e da alegria das festas.\n' +
      'É razoavelmente popular, e cada vez mais: até os fiéis de outros deuses, em algum momento da vida, se consolam na sua doutrina. Nos reinos que cultivam o prazer e a amizade, dentro e fora das fronteiras, os seus sacerdotes são aliados poderosos; para os belicosos e escravagistas, são uma pedra no sapato.\n' +
      'Os caminhos da fé são vários: há vertentes que põem à frente o prazer no trabalho, outras o prazer erótico, outras o equilíbrio dos dois, e os ritos mudam conforme o sacerdote. Uns percorrem o mundo como missionários; outros protegem o povo para lhe garantir o direito sagrado de gozar a vida. Os fiéis vão com fervor às reuniões de toda semana e louvam a deusa com canto, dança, música, poesia, escultura e pintura. Costuma-se chamar ao sacerdócio as beldades e os artistas de talento da comunidade.\n' +
      'Há bardos seus que, na busca do belo, pecam pelo virtuosismo e cobram dos colegas o mesmo apuro. Encantam todo mundo, mas os outros bardos os acham arrogantes, e eles se julgam vítimas de inveja.\n' +
      'Os templos imitam em pequeno o Jardim das Rosas, o grande templo de Porto Livre. Não há veste da ordem: cada fiel se veste segundo a sua classe, a sua terra e o seu modo de vida, mas sempre em busca do belo.\n' +
      'As doutrinas do culto são estas: amar; trazer a felicidade pela perfeição e pelo belo, numa atividade de prazer mútuo; entender e evitar os opostos — a insensibilidade, a escravidão e a corrupção; louvar o belo, pois acima de toda beleza está a de Lena; ser perfeccionista em tudo; buscar um trabalho guiado pelo prazer e não pelo poder; escolher as melhores companhias; e ter compaixão de quem não conhece a alegria dessas dádivas.',

    relacoes: [
      { nome: 'Crezir',
        texto: 'A mãe, de quem herdou o gênio forte. Lena queria a sua aprovação, mas Crezir, que a ama muito, discorda do caminho da filha e a critica, muitas vezes com desdém; as discussões entre as duas não têm fim. Às vezes, raramente, fazem as pazes.' },
      { nome: 'Selimom',
        texto: 'O pai, deus da paz e do amor, a quem recorre pela sua sabedoria e luz e a quem respeita muito, embora o ache brando demais. Selimom a tem por filha querida, mas irresponsável e travessa.' },
      { nome: 'Plandis',
        texto: 'O irmão e o grande companheiro no Panteão. Os dois agem juntos no mundo dos mortais muitas vezes, e riem depois das próprias travessuras. Plandis sente ciúme quando ela dá atenção a Parom.' },
      { nome: 'Parom',
        texto: 'Parom a ama, e todos sabem. Lena diz vê-lo como um grande amigo, quase um irmão, que partilha alguns dos seus ideais; mas os sacerdotes de Parom falam de um amor de milênios, e foi ele quem fez, a pedido dela, o manto que a deixa andar sem ser vista por deus nenhum — para surpreendê-lo, diz ela. Palier, o pai dele, afirma gostar do romance, mas os olhos dizem outra coisa. Foi Parom quem lhe deu o Cálice de Lena.' },
      { nome: 'Blator',
        texto: 'O avô. Segundo a seção do próprio Blator, há entre os dois um amor que os outros deuses desconhecem, de encontros escondidos no salão de Goldonor; daí, dizem, a antipatia entre ele e Parom.' },
      { nome: 'Cambu',
        texto: 'Cambu é apaixonado por ela, mas Lena desaprova o rumo de muitos seguidores dele: mercadores que esgotam os empregados até lhes tirar o gosto pelo trabalho, e até os escravizam. O que mais a enoja são os que fazem do prazer moeda de troca, no comércio ou na diplomacia. Ela não condena quem vive dos prazeres; condena o prazer que serve ao dinheiro e não ao gozo dos dois lados. Mesmo assim, faz questão de ser boa companhia, o que lhe abre portas para interceder pelos seus.' },
      { nome: 'Crizagom',
        texto: 'O tio, por quem sente uma admiração que às vezes beira a paixão escondida. A seção de Crizagom conta outra coisa: que os dois evitam se encontrar, pela intransigência dele.' },
      { nome: 'Sevides, Liris e Quiris',
        texto: 'Vê sabedoria nos conselhos de Sevides e tem estima especial pelos filhos dele, Liris e Quiris, com quem ela e Plandis passam o tempo. Liris a procura para aprender a fundo a arte da sedução.' },
      { nome: 'Maira',
        texto: 'Vê Lena e Plandis como crianças brincalhonas, flagradas muitas vezes em travessuras com os Filhos dos deuses. Dizem as más línguas que Maira copiou o corpo de Lena ao criar as ninfas.' },
      { nome: 'O Panteão',
        texto: 'Com quase todos os deuses é simpática e amiga; as exceções são a mãe e Cambu.' },
      { nome: 'Anasmadis',
        texto: 'A Donzela das Delícias, sua arqui-inimiga entre os demônios: usa o vício, a culpa e o arrependimento onde Lena dá prazer sem culpa. Consome almas para se manter mais sedutora que a deusa, e corromper um sacerdote de Lena é a sua maior satisfação. Seu símbolo é uma rosa negra num triângulo de lados desiguais, a imperfeição.' },
      { nome: 'Fulvina',
        texto: 'A demônia tentou seduzir Parom e foi recusada, porque ele amava Lena. Escolheu de propósito o dia da Noite dos Prazeres para o seu próprio culto, em afronta à deusa.' },
      { nome: 'Descendentes',
        texto: 'Não tem descendentes conhecidos.' },
    ],

    locais: [
      { nome: 'Jardim das Rosas', onde: 'Porto Livre',
        texto: 'O templo principal e o lugar mais sagrado da ordem, tido por uma das maravilhas do mundo pela grandeza, pela arquitetura, pela decoração e pelos jardins. Fundou-o Alina, a seguidora que a própria deusa escolheu para continuar a sua obra quando deixou o mundo físico; o desenho é do mestre de obras Alkaism, sábio em geometria.' },
      { nome: 'Labirinto de Roseiras', onde: 'Cordilheira da Navalha',
        texto: 'Chega-se a ele pela Trilha das Pétalas, que rasga a cordilheira. Dentro estaria a única imagem verdadeira de Lena, feita de roseiras nascidas de uma lágrima que a deusa derramou por pena de uma serva. Dizem que quem achar a estátua pode pedir o prazer que quiser.' },
      { nome: 'Montes dos Seios Divinos', onde: 'Perto de Fontenova',
        texto: 'Dois montes idênticos em forma de seios. Acredita-se que ganharam essa forma quando a deusa pisou o chão de Tagmar pela primeira vez.' },
      { nome: 'Ludgrim', onde: 'Ludgrim',
        texto: 'Uma das terras onde a religião mais atua.' },
      { nome: 'Calco', onde: 'Abrasil',
        texto: 'Outro dos lugares de culto mais forte. Abrasil é também a terra da Festa da Carne.' },
      { nome: 'Verrogar', onde: 'Verrogar',
        texto: 'Sacerdotes de Crezir e de Lena disputam ali o coração do povo; junto à nobreza verrogari, raramente se vê um ou outro.' },
    ],

    feriados: [
      { dia: 11, mes: 2, nome: 'Festa da Carne',
        texto: 'Celebra o prazer da união da carne e, por isso, a família, sobretudo em Abrasil. Todas as gerações de uma casa se reúnem para assar o boi mais viril e bonito que puderem comprar; entre os pequeninos, amigos de um bom banquete, a festa ganha ares de grandeza. O símbolo são dois bois de ouro frente a frente, em pose de combate, com uma flor dourada entre eles: força e fertilidade. Dizem que o cheiro da carne sobe aos céus e alimenta também a deusa.' },
      { dia: 1, mes: 7, nome: 'Noite dos Prazeres',
        texto: 'Marca o começo do inverno e vai de um nascer do sol ao outro, numa quermesse sob uma grande lona armada em campo aberto, com a estátua de um guerreiro ajoelhado diante de uma rosa ao centro. Até o anoitecer faz-se a troca de prazeres: cada um ensina e presenteia o que sabe e gosta, e o sacerdote ensina um remédio ao guerreiro, que lhe ensina a afiar a espada. As barracas de comida e bebida são famosas em toda Tagmar. No fim da tarde, os sacerdotes julgam as melhores refeições, doces e salgadas. À noite todos recebem máscaras, para que ninguém seja mais que ninguém diante de Lena: há dança, malabarismo, canto e teatro em volta da rosa, e quem quiser se recolhe às tendas vermelhas. Ninguém pode ser forçado a nada; dizem os Filhos de Lena que «o sim é sim, e o não é não». Nas cidades sem praça, a festa vai para a casa do fiel que comportar mais gente, e cada um leva um prato, bebida e flores.' },
      { dia: 12, mes: 10, nome: 'Festa dos Amantes',
        texto: 'Encerra o mês da Rosa, e só os fiéis adultos tomam parte. Diante da estátua de dois amantes que seguram a mesma rosa armam-se tendas brancas e rosadas, e ali se juntam os sacerdotes da cidade e os tonéis de água. O sacerdote mais graduado fala das vontades da deusa; vem então a purificação, em que todos bebem dos tonéis enquanto o clero canta o amor de Lena, e os casais seguem para as tendas brancas. Os que ficaram sós vão, mascarados, para as tendas rosadas, e ninguém fica sozinho: quem sobra é levado pelos próprios sacerdotes. Muitos casais saem dali. A festa dura até o sol nascer. Onde a ordem é pequena, os homens enfeitam a porta com véu rosa, se solteiros, ou branco, se casados, e as solteiras, de máscara, visitam uma casa de véu rosa.' },
    ],

    itens: [
      { nome: 'Tiara Rósea',
        texto: 'Cravejada de diamantes vermelhos, foi usada por Lena e deixada à sua ordem. Quem a põe muda à vontade o próprio feitio: rosto, cor da pele e dos olhos, beleza.' },
      { nome: 'Cálice de Lena',
        texto: 'Um cálice dourado, entalhado de rosas e cravejado de rubis, presente de Parom que Lena usou na sua forma mortal. Quem bebe dele trabalha ou faz qualquer esforço por seis horas sem se cansar.' },
    ],
  },
  {
    slug: 'liris',
    nome: 'Liris',
    classe: 'deusa',
    titulo: 'Colheita',
    imagem: null,
    // Fonte: deuses.pdf, págs. 59–62 (3.8 Liris); Ganis, Maira, Quiris e Sevides (relações e concepção);
    // principes.pdf, Antredom.

    prefacio: {
      texto:
        'No segundo ciclo, Magis era famosa pelo grande teatro, pelas festas de todo ano e pelos vinhedos que davam os melhores vinhos da região. No centro da cidade, onde as festas aconteciam, ficavam a estátua de pedra de Liris e o templo onde o povo a venerava.\n' +
        'O governador Henris viu nas festas um jeito fácil de encher os cofres, e demonistas de Morrigalti o seduziram sem esforço. A estátua da deusa foi levada para uma praça distante e esquecida, e no lugar dela ergueram a de Morrigalti. Os sacerdotes de Liris protestaram e foram postos para fora da casa do governador.\n' +
        'Tempos depois, muitos viram uma névoa fantasmagórica atravessar a cidade de noite, vagar pelos campos e sumir ao raiar do dia. Na manhã seguinte, tudo o que Henris tocava no seu desjejum apodrecia na mão. Um oráculo lhe disse quem o amaldiçoara: a própria Liris, coberta de ira. Ele mandou devolver a estátua ao seu lugar e suplicou o perdão, mas nada melhorou. Com toda a comida que lhe podiam servir e todo o ouro para comprá-la, morreu de fome na semana seguinte. Ninguém voltou a irritar a deusa.',
      fonte: 'Extraído de «A Formação do Mundo», Livro de Maudi — Biblioteca de Saravossa.',
    },

    descricao:
      'Quando o mundo já estava partido em água, terra e céu, mas ainda sem vida e em silêncio, três figuras surgiram. Ao tocarem a água, ela borbulhou e a vida começou pequena; ao tocarem a terra, veio um tremor e uma onda de calor e fertilidade, e brotaram as plantas. Por séculos encheram o mundo de bichos de toda forma, até que os demais deuses desceram e criaram os seus Filhos. Entre as três figuras havia uma bela mulher feita de fogo e luz, com uma foice dourada como o sol, que tornava próspero tudo o que tocava. Quando os Filhos dos deuses se aproximaram, ela os olhou com cuidado e disse o seu nome: Liris.\n' +
      'Liris é a deusa da colheita das plantas e dos frutos, a que traz a fartura à mesa. Ensina a colher cada coisa na sua estação e desperta nos seguidores o amor pela lavoura e a sabedoria da natureza que gira em ciclos: tudo amadurece na hora certa, e é preciso esperar.\n' +
      'É o avesso do irmão Quiris: onde ele é calado, ela é efusiva e alegre, mas tem mudanças bruscas de humor, que parece ter herdado da mãe, Ganis. Como o irmão e o pai, quer acima de tudo a paz e a natureza. E a sua cólera é a mais perigosa do Panteão, porque traz morte e devastação a tudo o que vive; pobre de quem a despreza ou a esquece.\n' +
      'É pintada como uma moça bela e jovem, presente em toda colheita; a sua força está em quem carrega os fardos de sementes e as sacas de frutos, e nas camponesas que cuidam da roça e veem os frutos nascer. Representa o alimento, o ciclo das safras e a guarda do que se colheu. Seu símbolo mais conhecido é a foice que corta os cereais; menos comum, uma foice estilizada. Sua cor é o lilás.\n' +
      'A sua fé, como a do pai e do irmão, chega a todos os reinos, sobretudo às terras de lavoura, e todo aquele que cria ou planta tem a bênção dela. É mais querida entre os pobres, os lavradores e os pastores. Nos reinos de vocação agrária os seus sacerdotes pesam muito, pois a presença deles pode trazer fartura a todos, ou miséria aos infiéis.\n' +
      'Os sacerdotes abençoam as colheitas e a guarda dos grãos e legumes, e também as refeições dos dias de festa. O templo fica sempre à esquerda do de Sevides, como a filha fica ao lado do pai, e é feito do mesmo: pedra, tijolo cozido ou madeira. Na entrada arde uma pequena chama, onde se lançam grãos para alimentar os deuses. Diante do altar ficam grandes jarros com as sementes do lugar, ofertas dos lavradores; no plantio seguinte vão para o templo de Quiris, que as reparte entre os agricultores para abençoar as lavouras.\n' +
      'Os sacerdotes vestem algodão cru, com uma faixa no ombro esquerdo presa por um cordão de linho lilás; a faixa é estampada de frutos e pequenas flores. O grau se conta pelos nós do cordão de linho da cintura, no máximo cinco. Calçam chinelos de couro curtido e levam um cesto para as colheitas, um incensório e uma lâmina que, nas cerimônias, figura o gesto de colher.\n' +
      'As doutrinas do culto são quatro: zelar pela colheita, buscar a abundância, contribuir para a paz dos povos e guardar o equilíbrio da vida.',

    relacoes: [
      { nome: 'Quiris',
        texto: 'O irmão, deus do plantio, que anda sempre um pouco atrás dela, seguindo-a com os olhos. Nele Liris acha paz e sossego, e só ele a acalma quando se zanga. Dizem que o amor entre os dois é maior que o de irmãos; a seção de Quiris confirma um amor de homem, correspondido e escondido dos deuses.' },
      { nome: 'Sevides',
        texto: 'O pai. Liris o respeita, mas acha que ele age sempre devagar demais. Sevides tem pelos filhos um afeto que vai além do comum: os três são partes de um mesmo ciclo. Ela ocupa o lado esquerdo do pai; Quiris, o direito.' },
      { nome: 'Ganis',
        texto: 'A mãe, de quem herdou as mudanças de humor. A relação é instável, de discussões sem fim, e cada encontro vira campo de batalha. Conta-se que, no primeiro aniversário dos gêmeos, Ganis criou as ninfas dos fios dourados do próprio cabelo e as deu de presente aos filhos.' },
      { nome: 'Cambu',
        texto: 'Há alguns séculos tentou seduzi-la, sem sucesso, e se meteu em grandes problemas. Desde então há mal-entendidos entre os dois, e Quiris lhe guarda indisposição.' },
      { nome: 'Lena',
        texto: 'Uma amiga, com quem Liris busca aprender a fundo a arte da sedução. Lena e Plandis passam o tempo com ela e Quiris.' },
      { nome: 'Maira',
        texto: 'Com Sevides, Liris e Quiris, ajudou Maira a povoar as terras e as águas de bichos e plantas antes da chegada dos Filhos. Maira os tem pelos amigos mais prezados na tarefa de guardar o equilíbrio da vida.' },
      { nome: 'O Panteão',
        texto: 'É cordial com todos. Aparece quase sempre ao lado do pai e do irmão.' },
      { nome: 'Antredom',
        texto: 'O príncipe da fome, da miséria e da avareza odeia a tríade da agricultura. Manda pragas e enxames de insetos famintos devastar as lavouras antes da colheita.' },
      { nome: 'Morrigalti',
        texto: 'Foi a estátua de Morrigalti que tomou o lugar da de Liris em Magis, e o governador que a ergueu morreu de fome.' },
      { nome: 'Descendentes',
        texto: 'Não tem descendentes.' },
    ],

    locais: [
      { nome: 'Nascente do Rio Sevides', onde: 'Aos pés de uma grande árvore que se divide em três',
        texto: 'Acredita-se que as águas do Rio Sevides dão às terras da bacia a sua fertilidade, e camponeses de toda Tagmar creem que um pouco delas, regado na seca ou na praga, faz a terra voltar a dar safra. A trezentos passos da nascente, na margem esquerda, um grande platô de pedra traz incrustado no chão, em meia-lua, o símbolo de Liris: um dos lugares mais sagrados da ordem, onde os altos sacerdotes celebram as grandes cerimônias.' },
      { nome: 'Magis', onde: 'Cidade do segundo ciclo',
        texto: 'Cidade de teatro, festas e vinhedos, onde a estátua da deusa ficava no centro, junto ao templo. Ali o governador Henris a trocou pela de Morrigalti e morreu de fome amaldiçoado.' },
      { nome: 'Dartel', onde: 'Dartel',
        texto: 'O único lugar onde ainda se acham ninfas, o presente de Ganis aos gêmeos; antes do Cataclismo eram comuns.' },
    ],

    feriados: [
      { dia: 30, mes: 6, nome: 'Festa da Colheita',
        texto: 'O dia é simbólico, porque cada planta tem a sua hora de ser colhida, e a festa se repete a cada colheita feita. Nesse dia as plantações são abençoadas com fartura. Nas fazendas há danças e, à noite, derrama-se uma mistura de leite com vinho de qualquer fruta diante da porteira e em parte do campo cultivado. Nos armazéns, penduram-se atrás das portas pequenos objetos de madeira com o símbolo da deusa.' },
    ],

    itens: [
      { nome: 'Aksas',
        texto: 'O amuleto sagrado dos altos sacerdotes, capaz de duplicar a produção: sacas de cereal se multiplicam, e uns poucos campos matam a fome de milhares; mal usado, destrói a colheita ou mata os animais. Está enterrado num templo de Liris, guardado em segredo pelos membros mais altos da ordem. Muitos dizem que, unido a Hudrar, o amuleto de Quiris, abriria os portões celestiais e expulsaria de Tagmar todos os demônios, mas talvez à custa de uma nova era que apagaria todas as espécies vivas.' },
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
    slug: 'parom',
    nome: 'Parom',
    classe: 'deus',
    titulo: 'Artífices',
    imagem: null,
    // Fonte: deuses.pdf, págs. 75–78 (3.11 Parom); Blator, Cambu, Crezir, Crizagom, Lena, Maira, Palier, Plandis e Selimom;
    // principes.pdf, Fulvina (3.6), Heldrom (3.7) e Seinoniz (3.11).

    prefacio: {
      texto:
        'O vento entrava pela grande janela da oficina, e o frio era bom nas costas suadas de quem trabalhava desde cedo. A cada vez que o braço subia, o sol batia no martelo dourado; a cada vez que descia sobre o ferro em brasa, saltavam fagulhas e o som do golpe corria longe. O dia já se punha quando o trabalho chegou ao fim. Do ferro e da magia nascera um martelo de guerra digno dos deuses, belo, resistente e à altura de quem o portaria.\n' +
        'A porta se abriu em meio à fumaça da forja, e entrou Blator, seguido do filho Crizagom. O deus da guerra tomou o martelo, examinou-o com cuidado, golpeou o ar contra um inimigo imaginário e sorriu, segurando-o com as duas mãos. Crizagom, que olhava de longe, disse: «Seu pai tem razão em ter orgulho de ti. Tão bela arma somente poderia ter sido feita por um deus.» Parom ergueu da tina o rosto e os cabelos molhados e respondeu que era bom saber que o trabalho agradara.\n' +
        'Blator voltou os olhos para aquele que bem poderia ter sido um grande guerreiro. Não disse nada. Virou as costas e saiu com o martelo; Crizagom despediu-se com um aperto de mão. A oficina voltou ao silêncio, e Parom foi até a janela, de onde se vê todo o reino celestial. O vento o tocou de novo, o fogo da forja tremeu, e ele se voltou para o trabalho seguinte.',
      fonte: 'Extratos do Livro de Maudi — Biblioteca de Saravossa.',
    },

    descricao:
      'Parom é filho das duas divindades mais poderosas do Panteão, a rainha Maira, deusa da natureza, e o rei Palier, deus da magia. Seu dom une as duas heranças: transforma a matéria bruta do reino da mãe em objetos de fino trato e grande valor, e lhes dá a força mística que vem do pai. Seu peso entre os deuses não vem só do sangue, mas dos trabalhos que fez a serviço de todos. Saíram da sua forja as sandálias dos ventos de Cambu, o punhal com que Plandis matou o titã Cronus, as correntes que prendem Seinoniz e os portões de aço divino que selaram as entradas da Agonia.\n' +
      'Nos tempos antigos ensinou aos Filhos dos deuses a nobre arte de moldar a matéria e fazer objetos. Os alunos mais aplicados foram os anões, que seguiram e aprimoraram as suas técnicas até se tornarem grandes artífices.\n' +
      'É trabalhador e perfeccionista em tudo. Antes de começar uma obra, passa horas observando o material, com a paciência de quem quer captar a alma do objeto antes de lhe dar a forma que deseja. Sabe o peso da linhagem que carrega e procura estar a par dos assuntos do reino celeste; muitas vezes senta-se sozinho na oficina e pensa nessas responsabilidades. Nas horas vagas é visto com os pais ou com Lena nos grandes jardins do palácio, e nas festas dos deuses a sua presença é certa: passa horas conversando com os companheiros.\n' +
      'É pintado como um homem jovem de dorso nu, cabelos compridos e barba rente, em roupas de forja ou de oficina, sempre sujo do trabalho. A aparência é rude, mas os modos são educados e atenciosos. Seu símbolo é a bigorna, desenhada como um trapézio com a face menor por base; nas versões mais rebuscadas, uma mão suja de barro aparece à frente dela, e às vezes basta uma mão tecendo ou moldando. Sua cor é o cinza.\n' +
      'Não há vila, aldeia ou cidade de Tagmar sem um santuário particular ou um templo público de Parom. É amado em todo o continente, pelo sangue e pelo apelo prático: mesmo os mais humildes buscam nele inspiração para o trabalho duro. Entre os que vivem do suor e nos reinos que vivem do comércio e do ofício, é dos deuses mais adorados, pois se diz que, sem o cuidado e a bênção de Parom, os produtos saem malfeitos e perdem valor no mercado.\n' +
      'A religião prega a paciência, o respeito, o perfeccionismo e o amor a todas as coisas. Num mundo em que tudo passa depressa, os sacerdotes levam palavras de carinho e de transformação: a carne é só morada provisória, e todos, apesar das diferenças, foram moldados pelo mesmo amor dos deuses. A forma verdadeira de cada um se faz no amor aos pais celestes e aos irmãos em vida, na busca da felicidade e na mudança interior em favor do bem.\n' +
      'Os templos são de grande beleza. As paredes são pintadas e trazem em alto-relevo objetos do dia a dia e ferramentas de artesão, e o laranja forte das fachadas os destaca das construções vizinhas. Do alto da abóbada sobe uma torre central com um sino de prata, que chama os fiéis à oração da tarde. O altar fica de costas para o norte, e à frente dele há sempre uma urna de madeira para pequenas oferendas ou objetos que lembrem a graça alcançada. Nas casas e oficinas de artífices há sempre um pequeno santuário, com oferendas que vão de montinhos de argila a flores; nos grandes centros de comércio, um santuário no alto das vias principais pede prosperidade para quem ali trabalha.\n' +
      'Os sacerdotes vestem linho branco com detalhes em prata, e uma fita cinza na cintura marca o grau de cada um na ordem. Usam sandálias ou botas de couro e levam uma pequena lanterna, a luz de Parom que leva conhecimento aos ignorantes.\n' +
      'As doutrinas são cinco: a paciência com o próximo, o cuidado e o perfeccionismo no trabalho, a atenção à beleza do mundo, a paz entre os povos irmãos e a transformação em favor do bem.',

    relacoes: [
      { nome: 'Palier',
        texto: 'O pai, a quem tem grande amor e respeito. Os dois têm conversas longas e às vezes exaustivas sobre os assuntos mais diversos, e Parom muitas vezes discorda dele com veemência. Foi de uma dessas conversas, com Maira presente, que Palier tirou para os elfos o dom de trabalhar com perfeição os elementos da natureza.' },
      { nome: 'Maira',
        texto: 'A mãe afetuosa que a tudo o atende e o trata com mimos, como se ele ainda fosse criança.' },
      { nome: 'Lena',
        texto: 'Um amor que já dura milênios. A pedido dela, Parom fez um manto mágico que a deixa andar sem ser vista por nenhum deus; diz ela que é para surpreendê-lo sempre que se aproxima. Foi dele também o cálice dourado que ela usou na forma mortal.' },
      { nome: 'Blator',
        texto: 'Há grande tensão entre os dois, e o motivo principal é o amor de Parom por Lena. Parom suspeita que haja nisso também despeito pela sua posição de filho de quem é, ou inveja do respeito que conquistou entre os anões, os filhos de Blator. Ainda assim, foi da sua forja que saiu um martelo de guerra que o deus da guerra levou nas mãos.' },
      { nome: 'Crizagom',
        texto: 'Uma amizade singular. Para quem olha do lado de Crizagom, a relação parece apenas não ser hostil.' },
      { nome: 'Cambu',
        texto: 'Cambu tem com ele a amizade de um irmão que nunca teve. Foram de Parom as sandálias dos ventos que levam o mensageiro a qualquer lugar, e as correntes místicas com que ele prendeu Seinoniz.' },
      { nome: 'Plandis',
        texto: 'Sente ciúme quando a irmã, Lena, dá atenção especial a Parom. Foi com um simples punhal feito por Parom que Plandis matou o titã Cronus.' },
      { nome: 'Selimom',
        texto: 'Amigo de longas conversas, como de Palier e de Cambu.' },
      { nome: 'Crezir',
        texto: 'Acha Parom calado demais.' },
      { nome: 'O Panteão',
        texto: 'Com os demais deuses mantém uma relação cordial e amiga: respeita a todos e é respeitado.' },
      { nome: 'Fulvina',
        texto: 'A princesa da vaidade tentou seduzi-lo e foi rejeitada, porque ele amava Lena. Odeia todos os deuses, e Parom acima de qualquer outro, pela perfeição técnica, pelo trabalho árduo e pela capacidade de criar; há quem veja nesse ódio uma velha paixão obsessiva. Os seguidores de Parom estão entre os que ela mais cobiça: enche-os de soberba e presunção e os vê cair pela própria vaidade.' },
      { nome: 'Seinoniz',
        texto: 'Preso pelas correntes místicas que Parom forjou, o Senhor das Correntes lhe guarda ódio mortal, como a Cambu.' },
      { nome: 'Heldrom',
        texto: 'Quando o Caído foi lançado nas entranhas da Agonia com os demônios originais, foram portões de aço divino forjados por Parom que selaram as entradas.' },
      { nome: 'Descendentes',
        texto: 'Não tem descendentes, apesar do longo amor com Lena.' },
    ],

    locais: [
      { nome: 'A oficina de Parom', onde: 'Morada dos deuses',
        texto: 'A forja do deus, com uma grande janela de onde se vê todo o reino celestial. Ali nasceu o martelo de guerra que Blator levou consigo.' },
      { nome: 'Blur', onde: 'Blur',
        texto: 'O reino dos anões é tido por sagrado pela ordem. Dizem que Parom o visita sempre na forma de um anão, para ver a beleza das suas cidades e o cuidado com que esse povo faz os seus objetos.' },
      { nome: 'Abadom', onde: 'Abadom',
        texto: 'Um dos três reinos em que a ordem tem mais influência; os sacerdotes gozam de grande prestígio junto ao povo e às elites.' },
      { nome: 'Acordo', onde: 'Acordo',
        texto: 'Outro dos reinos de maior influência da ordem, onde os sacerdotes são muito respeitados pelos poderosos.' },
      { nome: 'Plana', onde: 'Plana',
        texto: 'O terceiro dos reinos de maior influência da ordem, onde o comércio e o ofício caminham juntos.' },
    ],

    feriados: [
      { dia: 13, mes: 4, nome: 'Festival da Purificação de Parom',
        texto: 'Nas grandes praças de todas as cidades e vilas, os moradores armam pequenas barracas e expõem os objetos que fizeram com as próprias mãos. Escolhem-se os mais belos, que são doados à ordem; os demais são vendidos, e de metade a quatro quintos do apurado vai para os sacerdotes. Todos os produtos recebem a bênção, e os sacerdotes visitam as oficinas para abençoá-las mais uma vez.' },
      { dia: 24, mes: 6, nome: 'Festa dos Artífices',
        texto: 'Dia muito festejado no comércio. Os sacerdotes fazem uma grande peregrinação de oficina em oficina e de loja em loja, levando a bênção e a prosperidade de Parom aos mercadores. O dia inteiro ofertam-se ao deus jarrinhos de argila e colares, queimados em grandes jarros de ferro diante de um altar.' },
    ],

    itens: [
      { nome: 'Relíquias de ferro',
        texto: 'Ferramentas de ferro muito antigas, sem valor pelo material e sem poder mágico algum. A ordem as guarda como sagradas porque se crê que Parom as usou quando andou pela terra.' },
      { nome: 'Manto de Lena',
        texto: 'Um manto mágico que deixa a deusa andar sem ser vista por nenhum deus. Ela diz que o pediu para sempre surpreender Parom quando se aproxima dele.' },
      { nome: 'Sandálias dos ventos',
        texto: 'Levam Cambu a qualquer lugar tão depressa quanto o pensamento. Foi com elas que o mensageiro desceu ao mundo para cumprir a sentença do Cataclismo.' },
      { nome: 'Correntes místicas',
        texto: 'A obra-prima com que Cambu prendeu Seinoniz depois de feri-lo na coxa. O Senhor das Correntes nunca perdoou nenhum dos dois.' },
      { nome: 'Punhal de Plandis',
        texto: 'Um punhal simples que Palier e Maira entregaram a Plandis para enfrentar o titã Cronus. Com ele o deus louco abriu o pescoço do senhor do tempo.' },
      { nome: 'Cálice de Lena',
        texto: 'Um cálice dourado, entalhado de rosas e cravejado de rubis, presente de Parom que Lena usou durante a sua forma mortal.' },
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
    slug: 'quiris',
    nome: 'Quiris',
    classe: 'deus',
    titulo: 'Plantio e Fertilidade',
    imagem: null,
    // Fonte: deuses.pdf, págs. 86–89 (3.13 Quiris); Cambu, Ganis, Lena, Liris (Aksas), Maira e Sevides;
    // principes.pdf, Antredom (3.2).

    prefacio: {
      texto:
        'Era manhã de sol nos campos a leste de Franis. A estação do plantio se aproximava, e de toda parte chegavam sacos de grãos para a bênção; os sacerdotes de Quiris começavam a cerimônia com cantos e oferendas de sementes. Fazia anos que Franis e Gamilda se enfrentavam em saques a caravanas pelo domínio das rotas dos tecidos do norte. Os generais de Gamilda escolheram o mês que antecede a colheita, quando os celeiros da cidade estão baixos, e mandaram os cavaleiros à frente das tropas e das máquinas de cerco.\n' +
        'Tomados de fúria, os cavaleiros não pouparam camponeses nem sacerdotes. O templo foi saqueado, todos foram mortos, os grãos roubados e o resto queimado. Então Quiris lançou a sua maldição sobre Gamilda: enquanto a cidade e o seu povo existissem, nada cresceria nas suas terras. As sementes não germinaram mais, os animais deixaram de dar cria, e os moradores viram nascer a última criança.\n' +
        'O cerco de Franis durou só quatro meses: a fome em Gamilda levantou o povo contra o governador, e as tropas voltaram para contê-lo. Franis semeou de novo os campos, enterrou os mortos, reergueu o templo e festejou a libertação junto com a colheita. Gamilda gastou o tesouro em grãos que não brotavam, esvaziou-se e virou deserto. Morto o último habitante, a terra ficou anos sem ninguém, até que, à sombra das ruínas, uma pequena planta começou a crescer.\n' +
        'Estava decretado o fim da maldição de Quiris.',
      fonte: 'Extraído de «A Formação do Mundo», Livro de Maudi — Biblioteca de Saravossa.',
    },

    descricao:
      'Quiris é o deus do começo da vida, do momento em que a existência dá os primeiros traços. Quando o mundo já estava dividido em água, terra e céu, e nele não havia bicho nem planta, três figuras surgiram do silêncio. Ao tocarem a água, ela borbulhou e deu formas pequenas de vida, depois maiores; ao tocarem a terra, correu uma onda de calor e fertilidade, e brotaram as primeiras plantas. Uma dessas figuras, feita de luz e de fogo, enfiava a mão numa pequena sacola, e dos seus dedos saíam raios que davam vida a tudo o que tocavam. Diante do pai, apresentou-se aos Filhos dos deuses: era Quiris, um dos mais velhos.\n' +
      'É calmo, paciente e um tanto perfeccionista, e tem grande prazer em ver a vida florescer por inteiro. Introspectivo e retraído, observa de longe, mas acompanha com atenção tudo o que acontece. Fica sempre à direita do pai, Sevides, alguns passos atrás, enquanto a irmã, Liris, ocupa a esquerda. Onde a terra não dá fruto, a vida renasce se ele a guarda.\n' +
      'É pintado como um homem que semeia: do cesto, ou às vezes de um saquinho, lança raios de vida sobre as sementes ainda não germinadas e garante o crescimento da lavoura. Seu símbolo, aparentado aos de Sevides e de Liris, é um círculo dividido em quatro por linhas sinuosas, com uma das partes cheia: o cesto da semeadura. Menos comum é a imagem de um arado estilizado. Sua cor é o bege.\n' +
      'É honrado em todos os reinos, e a fé irradia sobretudo das terras agrícolas, como Eredra e o sul de Calco; todo lugar que cria ou planta o reverencia. É muito popular entre os pobres, em especial lavradores e pastores. A influência dos sacerdotes não é pequena: diz-se que a presença deles traz fartura e prosperidade, e miséria aos infiéis.\n' +
      'A religião prega a vida. Os sacerdotes buscam a paz e o equilíbrio entre os seres vivos, e cabe a eles, pelas suas bênçãos, garantir a fertilidade das plantações.\n' +
      'O templo fica sempre à direita do de Sevides, como o filho fica ao lado do pai, e é feito do mesmo material: pedra, tijolo cozido ou madeira. Na entrada há sempre um jardim de pequenas plantas, de onde se tiram mudas para os lavradores da região. No grande altar, os fiéis depositam sementes em urnas de barro; delas nascem plantas novas, o tributo ao deus. Para os festivais de plantio, os sacerdotes cultivam com dias de antecedência as mudas que serão plantadas, a partir das sementes ofertadas pelos lavradores. Os grãos que o templo de Liris recolhe ao longo do ano vêm para o de Quiris na época do plantio e são repartidos entre os agricultores.\n' +
      'Os sacerdotes vestem algodão cru. Sobre o ombro direito levam uma faixa presa por um cordão de linho bege, com dizeres sobre a ordem e o grau de quem a usa: quanto mais orações a Quiris, mais alto o posto, até o máximo de sete. Na cintura, outro cordão bege, com um único nó simples. Calçam chinelos de couro curtido e levam uma pequena sacola para recolher sementes e levá-las aos campos.\n' +
      'As doutrinas são quatro: a liberdade da vida, o amor entre as pessoas, a busca da felicidade e a paz entre os povos.',

    relacoes: [
      { nome: 'Sevides',
        texto: 'O pai, a quem é inteiramente devotado e amoroso: vê nele a dedicação e o amor à vida, um exemplo a seguir. Pai e filhos são partes de um mesmo ciclo, inseparáveis.' },
      { nome: 'Ganis',
        texto: 'A mãe. O sentimento é o oposto do que tem pelo pai: há tensão entre os dois, pelo modo ríspido com que ela trata Sevides e pelas suas mudanças de humor com os seres de Tagmar. Ela, por sua vez, tem extremo amor pela obediência do filho.' },
      { nome: 'Liris',
        texto: 'A irmã, a quem ama mais que com afeto de irmão, com amor de homem; é correspondido e segredo para os outros deuses. Ela é efusiva onde ele é retraído, e só ele consegue acalmá-la quando se zanga. Na corte celeste, ele anda atrás dela e a acompanha com os olhos.' },
      { nome: 'Maira',
        texto: 'Entre os deuses de fora da família, é com ela que mais conversa, ou a observa cuidar da natureza e dos animais. Com o irmão dela, Sevides, e com Liris, ajudou a tia a povoar as terras e as águas.' },
      { nome: 'Cambu',
        texto: 'Guarda dele uma indisposição desde que, há alguns séculos, Cambu tentou cortejar Liris, sem grande sucesso.' },
      { nome: 'Lena',
        texto: 'Lena tem especial estima por ele e por Liris, e ela e Plandis passam tempo com os dois em atividades conjuntas.' },
      { nome: 'O Panteão',
        texto: 'Com os demais deuses é retraído e distante; passa a maior parte do tempo com a família.' },
      { nome: 'Antredom',
        texto: 'O Príncipe da Fome tem ódio extremo a Sevides e aos filhos, porque a tríade da agricultura é a fartura e ele é a fome e a avareza. Sente prazer em arruinar as terras deles com pragas e enxames famintos antes da colheita.' },
      { nome: 'Descendentes',
        texto: 'Não tem descendentes.' },
    ],

    locais: [
      { nome: 'Platô de Quiris', onde: 'Nascente do Rio Sevides',
        texto: 'Um grande platô de pedra na margem direita do rio, a trezentos passos da nascente, com o símbolo de Quiris incrustado no chão em meia-lua. É um dos lugares mais sagrados da ordem, onde os altos sacerdotes conduzem as grandes cerimônias.' },
      { nome: 'Rio Sevides', onde: 'Nasce aos pés de uma grande árvore que se divide em três',
        texto: 'Crê-se que as suas águas dão às terras da bacia a fertilidade que elas têm. Camponeses de toda Tagmar acreditam que, em tempo de seca ou de praga, um pouco dessa água regada nos campos traz de volta as boas safras.' },
      { nome: 'Eredra', onde: 'Eredra',
        texto: 'Terra agrícola de onde a fé em Quiris irradia com mais força. Dizem que é perto dali a gruta onde está escondido o amuleto Hudrar.' },
      { nome: 'Sul de Calco', onde: 'Calco',
        texto: 'Outra região de lavoura que é polo da fé em Quiris.' },
      { nome: 'Franis', onde: 'Cidade de Franis',
        texto: 'A cidade cujo templo de Quiris foi saqueado e queimado pelos cavaleiros de Gamilda, e depois reerguido. Ali se festejou a libertação junto com a colheita.' },
      { nome: 'Ruínas de Gamilda', onde: 'Antiga cidade de Gamilda',
        texto: 'A cidade amaldiçoada por Quiris, que virou deserto e ficou vazia até que uma pequena planta brotou à sombra das ruínas, sinal do fim da maldição.' },
    ],

    feriados: [
      { dia: 1, mes: 10, nome: 'Festa do Plantio',
        texto: 'Grande festa de todos os que buscam fertilidade nos campos e nas criações. Os sacerdotes fazem a semeadura dos primeiros grãos, numa parte das terras dos lavradores do lugar, e juntam os primeiros animais para a cria; o gado bebe da água que eles abençoaram. Muitas das mudas plantadas nesse dia foram cultivadas no templo dias antes, das sementes que os próprios lavradores ofertaram.' },
    ],

    itens: [
      { nome: 'Hudrar',
        texto: 'Um amuleto de poderes além da compreensão: basta manipulá-lo para gerar vida, e mal usado pode tirar a vida do mundo. Foi lacrado num baú de ferro e guardado numa gruta, que dizem ficar perto de Eredra, entre centenas de outras suposições. Muitos afirmam que, unido a Aksas, o amuleto de Liris, abriria os portões celestiais e expulsaria de Tagmar todos os demônios; mas o preço seria, talvez, uma nova era de renascimento que destruiria junto todas as espécies vivas.' },
      { nome: 'Sacola de sementes',
        texto: 'A pequena sacola em que Quiris enfiava a mão, no tempo da criação, para tirar dos dedos a luz e o calor que davam vida à terra. Nas imagens do deus, é dela, ou do cesto, que saem os raios sobre as sementes.' },
    ],
  },
{
    slug: 'selimom',
    nome: 'Selimom',
    classe: 'deus',
    titulo: 'Paz e Amor',
    imagem: null,
    // Fonte: deuses.pdf, págs. 91–95 (3.14 Selimom); Blator, Cambu, Crezir, Crizagom, Lena, Maira, Palier e Plandis (relações);
    // principes.pdf, Ekisis e Branaxis.

    prefacio: {
      texto:
        'Lena corria pelos corredores do palácio de mármore atrás do pai, envolta numa manta branca tão fina que quase não a cobria. No saguão central, que não tem paredes nem portas e se sustenta só pela energia daquele lugar, Selimom olhava em silêncio o oráculo: um tanque de mármore branco cheio de água clara, onde o deus vê os seus Filhos.\n' +
        '«Pai, eles vão atacar Terisco! Blator não vai fazer nada!» A vila era pequena e pacífica, berço da Jornada de Paz, e erguera um templo à própria Lena. Os anões de Blur queriam arrasá-la só porque ali crescia um centro de estudos élficos junto à fronteira deles. Selimom, sereno no seu pesado manto branco, coberto de inscrições numa língua que nenhum mortal conhece, respondeu que Blator estava decidido e que era preciso deixar os Filhos seguirem o seu rumo. A filha insistiu que ele pedisse ajuda a Palier. «Eu vou, minha filha, eu vou... Agora me deixe só.»\n' +
        'Lena saiu aflita. No pátio encontrou Plandis, que moldava o barro mágico sem tirar os olhos dele, como quem já sabe o que vai fazer. «Não fique aflita, irmã. Tudo ficará bem.»',
      fonte: 'Extratos do Livro de Maudi, capítulo «A Justiça» — Biblioteca de Saravossa.',
    },

    descricao:
      'Num mundo onde a guerra é soberana e os deuses da guerra são venerados em toda parte, Selimom é o senhor dos que sonham com uma vida longe das armas. É o deus do amor, da paz e da firmeza de espírito, e prega um mundo em que todos são iguais e vivem em harmonia. Parece um sonho distante, mas é o sonho de boa parte do mundo conhecido, sobretudo da gente simples do campo, que vive da terra e do amor da família. Para esses, Selimom devia ser o rei do mundo, e Sevides o seu corregente.\n' +
      'Busca a paz entre os povos e a solução das suas desavenças. Procuram-no os que têm horror às carnificinas, os que não querem lutar e os que buscam paz de espírito, harmonia e vida interior. A doutrina aceita o combate só como último recurso; nos tempos de hoje, porém, até para manter a paz às vezes é preciso pegar em armas.\n' +
      'É calmo e compreensivo. Dos erros dos fiéis tira lições e as ensina, onde os irmãos mais irritadiços apenas puniriam ou abandonariam o culpado. Mostra aos Filhos como suportar as adversidades sem se revoltar contra os deuses, e derrama bênçãos sem cessar sobre as almas que protege. Para Blator e os seus filhos a guerra é caminho para a justiça; para Selimom não leva a nada, e violência só gera violência. Por isso pede aos fiéis que resistam com palavras e ensinamentos, até o sacrifício. A única exceção é a defesa dos fracos: quando inocentes correm perigo e a razão já não governa, ele aconselha os sacerdotes a se fazerem heróis e a pôr a vida dos outros à frente da própria.\n' +
      'Os que o viram em êxtase, no seu reino encantado, descrevem um humano comum de meia-idade, de rosto sereno e sorriso luminoso, num manto alvo e leve, que conversa e aconselha com palavras mansas todos os que vivem ali. Seu símbolo é um escudo com auréola, desenhado como um pentagrama vertical com um círculo dentro; nas obras de arte, um escudo branco ricamente ornado de ouro. Qualquer imagem de pureza de alma, de paz ou de amor também o representa. Sua cor é o branco.\n' +
      'As ordens de Selimom têm mais força em Marana, Ludgrim e Calco, e nas cidades do interior de Calco, às margens do lago Denégrio, os fiéis são muitos. Mesmo os reinos mais belicosos precisam de paz dentro das próprias fronteiras para conquistar fora delas, e não há reino que não reze pela tranquilidade das suas terras. Quanto mais o caos se espalha, mais crescem as orações para que cesse, e cada dia mais gente humilde procura o deus.\n' +
      'Selimom é intransigente com a moral dos seus. Não permite que o seu nome sirva a negócios duvidosos nem a nada que fuja da doutrina, e os sacerdotes, mesmo nestes tempos difíceis, ainda tratam a todos como irmãos.\n' +
      'O templo tem a forma de um pentágono em torno de um pátio, como o escudo do deus. Nos mais completos há um salão em cada vértice, contados no sentido do sol a partir do que aponta para o oeste: adoração e sermões, com altar e estátua; enfermaria; biblioteca em nichos, para estudo, oração e meditação; sala de treino de armas; e as celas onde dormem os sacerdotes e algum necessitado. Por uma rampa no pátio desce-se a um andar sob a terra, com despensa e cozinha, relicário, arsenal, uma pequena prisão com sala de interrogatório e a cripta com os ossos dos fiéis. Vitrais, tapeçarias, estátuas e quadros contam os atos do deus. A maioria dos templos tem só as salas de que a região precisa, mas o salão de culto e a enfermaria nunca faltam, e às vezes são o templo inteiro.\n' +
      'Os sacerdotes vestem roupas simples de algodão branco, que deixam o corpo livre, com adornos dourados de pano ou de outro material. Uma cordinha branca ou dourada pode prender o manto, e botas baixas protegem os pés. As doutrinas são três: a paz entre os povos, a busca da liberdade e o amor devotado a toda espécie de vida.',

    relacoes: [
      { nome: 'Crezir',
        texto: 'A esposa e o seu oposto. Conquistou-a sendo tolerante, solícito e amável mesmo nas horas mais adversas. A loucura dela contamina todos na guerra, e até o coração do deus da paz, que perde o juízo nos braços dela.' },
      { nome: 'Lena e Plandis',
        texto: 'Os filhos queridos, que ele acha irresponsáveis e travessos. Lena conta com a sabedoria do pai, embora o queira mais enérgico. Com Plandis tem amizade verdadeira e conversas tão longas que, no fim, nem Selimom sabe dizer do que falaram.' },
      { nome: 'Maira',
        texto: 'É irmão dela e o seu principal conselheiro, a qualquer hora. Com ele a deusa encontra paz nos momentos difíceis.' },
      { nome: 'Blator',
        texto: 'O sogro, e a grande diferença. Muitas vezes buscam o mesmo fim, mas os métodos são opostos, e as discussões, inevitáveis. Em Terisco, Blator deixou os anões agirem, e Selimom teve de ir pedir socorro a Palier.' },
      { nome: 'Sevides e Crizagom',
        texto: 'Uma grande amizade, de irmãos, ainda que divirjam sobre os mortais e o modo de lidar com eles. Crizagom tem pelo deus da paz um grande respeito.' },
      { nome: 'Palier, Parom e Cambu',
        texto: 'Amigos de longas conversas. É a Palier que ele recorre quando a paz de um povo inteiro está em risco.' },
      { nome: 'O Panteão',
        texto: 'A sua influência entre os deuses é incontestável: a paz que traz acalma a todos, e ele é ouvinte e conselheiro até nas horas mais difíceis.' },
      { nome: 'Ekisis',
        texto: 'O príncipe o odeia acima de todos os deuses, porque Selimom vive desfazendo as suas tramas e semeando a concórdia. Os seguidores de Ekisis, que plantam a discórdia que leva às guerras, dão muito trabalho aos sacerdotes da paz.' },
      { nome: 'Branaxis',
        texto: 'Na noite seguinte ao Dia do Amor e da Paz, os seguidores do príncipe invocam Pesadelos para espalhar medo entre os fiéis dos deuses.' },
      { nome: 'Descendentes',
        texto: 'Com Crezir teve Lena, deusa dos prazeres, e Plandis, deus da loucura e da paixão cega.' },
    ],

    locais: [
      { nome: 'Palácio de mármore', onde: 'Morada dos deuses',
        texto: 'A casa de Selimom, de arquitetura majestosa, cujo saguão central não tem paredes nem portas. Ali fica o oráculo, um tanque de mármore branco com água cristalina onde o deus observa os seus Filhos.' },
      { nome: 'Terisco', onde: 'Sul do mundo',
        texto: 'Pequena vila pacífica de devotos de Selimom, onde nasceu a Jornada de Paz. Ergueu também um templo a Lena, e os anões de Blur quiseram arrasá-la por abrigar um centro de estudos élficos junto à fronteira deles.' },
      { nome: 'Monastérios de Marana e de Ludgrim', onde: 'Marana e Ludgrim',
        texto: 'Locais sagrados da ordem, cada um com uma grande biblioteca e obras de arte dedicadas ao deus.' },
      { nome: 'Mosteiro de Solarnes', onde: 'Calco',
        texto: 'Um lugar de grande paz, para onde os sacerdotes mais velhos vão passar os últimos dias em meditação, ensinando os mais novos.' },
      { nome: 'Sede da Ordem do Sol Nascente', onde: 'Floresta de Siltam',
        texto: 'Local sagrado de paradeiro secreto, escondido em algum ponto da floresta.' },
      { nome: 'Lago Denégrio', onde: 'Interior de Calco',
        texto: 'As cidades das suas margens reúnem um grande número de seguidores do deus.' },
    ],

    feriados: [
      { dia: 20, mes: 3, nome: 'Dia do Amor e da Paz',
        texto: 'Festejado em quase todas as cidades que veneram Selimom, sobretudo no interior de Marana e de Verrogar, para chamar a atenção do deus para a região. Os sacerdotes convocam os fiéis a acender velas à porta de casa, para afastar o ódio e os maus sentimentos de quem entrar. Cada vela se acende ao som de uma cantiga antiga, «Dia do amor e paz», ensinada nos cultos; os ricos acendem velas grandes, enfeitadas de cores claras, e os pobres, as suas velinhas. Dizem que a cantiga foi ensinada pelo próprio deus, e que ele se encanta ao ouvi-la.' },
      { dia: 20, mes: 6, nome: 'Jornada de Paz',
        texto: 'Começa neste dia a maior peregrinação de Tagmar em honra de um deus. Nascida em Terisco, hoje é feita também em Marana e Ludgrim e reúne acólitos, sacerdotes e ao menos um fiel de cada família da região. A caravana cruza no mínimo quatro reinos levando mensagens de paz e de amor e ensinando os males da guerra. Os peregrinos vestem roupas claras e cobrem carroças e cavalos com panos claros bordados a ouro, com palavras de paz em todas as línguas do mundo, e pelo caminho ganham adeptos e doações. A maior Jornada de que se tem notícia atravessou todos os reinos, juntou mais de cem mil pessoas e trouxe seitas de deuses inexistentes para o culto de Selimom.' },
      { dia: 16, mes: 12, nome: 'Festa dos Povos',
        texto: 'Tida como vital para a união dos povos, ao lado das festas de Cambu. Gente de outros reinos e raças é convidada a passar uma semana como parte da comunidade, trocando conhecimentos e conhecendo os seus problemas e soluções. Os «embaixadores» de cada povo trocam presentes, e no fim todos dançam.' },
    ],

    itens: [
      { nome: 'Faixa de Selimom',
        texto: 'Uma faixa mística que traz paz interior a quem a usa e expulsa toda dor e todo medo.' },
      { nome: 'Pedra da Luz',
        texto: 'Uma pedra misteriosa que emana grande luz e calor. Os fiéis dizem que ela também faz milagres de toda sorte.' },
    ],
  },
  {
    slug: 'sevides',
    nome: 'Sevides',
    classe: 'deus',
    titulo: 'Agricultura',
    imagem: null,
    // Fonte: deuses.pdf, págs. 97–100 (3.15 Sevides); Cambu, Crizagom, Ganis, Lena, Liris, Maira, Quiris e Selimom (relações e locais);
    // principes.pdf, Antredom.

    prefacio: {
      texto:
        'Amadeu era um lavrador humilde e devoto de Sevides, que sempre dava aos sacerdotes um pouco mais do que podia. O irmão, Janil, trocou o campo pela cidade, perdeu no jogo uma fortuna e caiu nas mãos de agiotas. Fugiu para a casa de Amadeu, e uma semana depois seis homens armados bateram à porta. Para salvar o irmão e a família, Amadeu ofereceu a colheita. Faltavam seis meses; os homens aceitaram, certos de que no fim ficariam também com as terras.\n' +
        'Naquela noite, Amadeu rezou a Sevides por força e por uma colheita melhor. Na manhã seguinte bateram palmas à porta: um homem de uns trinta e quatro anos pedia comida em troca de trabalho. Amadeu, que tinha pouco, deu sem cobrar, mas o estranho quis ajudar assim mesmo, e durante meses os três lavraram a terra juntos.\n' +
        'No dia da colheita, Amadeu rezou por horas antes de ir ao campo. Nunca tinham colhido tantas sacas de grãos, e a dívida foi paga. Convidou o estranho a ficar, mas ele disse que tinha outros campos para cuidar e partiu sem mais palavra. Amadeu e os seus descendentes veneraram Sevides por muitos anos, sem nunca saber que fora o próprio deus quem os ajudara.',
      fonte: 'Extraído de «A Formação do Mundo», Livro de Maudi — Biblioteca de Saravossa.',
    },

    descricao:
      'Quando o mundo ainda era fogo e água e os titãs governavam o caos, nada vivia nele. Do silêncio surgiram três figuras. Tocaram a água, e ela borbulhou de pequenas vidas que logo cresceram; tocaram a terra, e um tremor e uma onda de calor e fertilidade fizeram brotar as plantas. Por séculos encheram o mundo de bichos de todo tamanho e forma, até que os outros deuses desceram e criaram os seus Filhos para quebrar o silêncio que restava. Uma das três figuras, dos deuses mais velhos, era um ser de luz e fogo com um cajado de madeira e folhas, vivo e sempre crescendo, que faz pulsar a vida em volta a cada toque no chão. Quando os Filhos souberam dele, apresentou-se: chamava-se Sevides.\n' +
      'É o deus da agricultura. Amadurece os frutos, faz crescer as plantas e dá fertilidade às espécies, e engana-se quem pensa que o seu cuidado para nas lavouras: os animais domésticos e os rebanhos também são dele.\n' +
      'É pacífico e vive ocupado com as suas tarefas. Parece distante dos acontecimentos imediatos das raças de Tagmar, mas, como um pai zeloso, nunca deixa de lhes dar o pão de cada dia.\n' +
      'É pintado como um velho de mãos e pés calejados, com um cajado coberto de ramos, ou como um pastor ou lavrador, conforme o lugar e a raça que o cultua. Seu símbolo é o sol: um círculo dividido em quatro partes iguais por linhas sinuosas, uma para cada estação do ano. Sua cor é o marrom.\n' +
      'Não pertence a um reino só. Onde há lavoura ou criação, há templo e sacerdote de Sevides; o culto é forte no campo e fraco nas cidades, e mais querido entre os pobres, os lavradores e os pastores. Nem por isso lhe falta peso entre os poderosos: não há conquista nem defesa com um reino faminto, e todo ano os senhores chamam os sacerdotes para pedir graças e conselho sobre como garantir a fartura das mesas.\n' +
      'A religião se volta para a natureza e para o equilíbrio delicado entre as raças, as plantas e os animais. Há centenas de templos e santuários pelo mundo, muitos nos caminhos dos campos e nas terras de pasto, e poucos nas cidades e nas vilas de comércio. Nas aldeias cabe aos sacerdotes celebrar os casamentos, porque a bênção deles aumenta as chances de o casal ter filhos.\n' +
      'Os templos são simples e amplos, de pedra, tijolo cozido ou madeira, sempre à beira das estradas que levam às plantações e às criações. Todos são retângulos de pouca altura, com desenhos de bichos e plantas por dentro; os maiores têm pequenas estátuas de animais e do próprio deus cuidando da lavoura ou do rebanho. Por fora há sempre trepadeiras nas paredes, jardins floridos e muitas árvores de fruto da região. Junto aos campos e estábulos erguem-se pequenos santuários, onde os trabalhadores rezam antes da lida.\n' +
      'Os sacerdotes vestem algodão cru e mantos grossos, cingidos por um cordão cinzento de linho trançado. Os nós na ponta do cordão contam as graças alcançadas na ordem e o grau de quem o usa. Calçam chinelos de couro curtido, levam um cajado de madeira e uma bolsinha de sementes presa ao cordão; o cajado pesa tanto quanto o cordão, porque tratam a todos como o seu «rebanho». As doutrinas são quatro: zelar por toda criatura viva, buscar o equilíbrio dos seres com a natureza, proteger os indefesos e as suas propriedades, e agradecer a boa sorte.',

    relacoes: [
      { nome: 'Ganis',
        texto: 'Tem por ela grande amor e respeito, e é carinhoso e atento. Mas brigas enormes sacodem os cantos do céu quando ela, impulsiva, lhe cobra um papel mais ativo no Panteão; Ganis se irrita com o pouco caso dele por tudo o que não seja a colheita. Num tempo em que Sevides ficou estéril como as areias do deserto de Blirga, foi a ela que pediu ajuda, e da união nasceram os filhos. Os dois dividem a Festa da Prosperidade, no dia 15 do mês da Paz, quando os sacerdotes de ambos levam os fiéis ao mar ou ao rio: o fruto das lavouras vai para a água, e a água vem para a terra, em sinal da união eterna do casal celeste da fertilidade.' },
      { nome: 'Liris e Quiris',
        texto: 'Os filhos, com quem tem um laço mais que afetuoso: são partes de um mesmo ciclo, inseparáveis. Quiris vê no pai um exemplo de dedicação e amor à vida, e fica sempre à direita dele, alguns passos atrás; Liris, à esquerda. Os templos dos filhos são erguidos assim, um de cada lado do templo do pai.' },
      { nome: 'Palier e Plandis',
        texto: 'Por eles tem grande afeição.' },
      { nome: 'Cambu',
        texto: 'Procura-o atrás das notícias mais recentes. Os dois dividem a Festa da Fartura, no último dia do mês da Semente e no primeiro do mês do Ouro, de propósito entre os meses que os homenageiam: dois dias de cerimônias nos templos de ambos e uma grande feira, onde o campo encontra a cidade.' },
      { nome: 'Selimom e Crizagom',
        texto: 'Uma amizade de irmãos, com divergências sobre os mortais. Os dois respeitam muito o jovem deus da honra.' },
      { nome: 'Maira',
        texto: 'Com Liris e Quiris, está entre os amigos mais caros da deusa na tarefa de manter o equilíbrio da vida no mundo. Ajudou-a a povoar terras e águas de bichos e plantas antes da chegada dos Filhos.' },
      { nome: 'Lena',
        texto: 'Vê sabedoria nos conselhos dele e passa o tempo com Liris e Quiris, junto com Plandis.' },
      { nome: 'Antredom',
        texto: 'O príncipe da fome odeia Sevides e os filhos, a tríade da agricultura. Manda pragas e enxames famintos às lavouras antes da colheita, e os seus cultistas tramam roubar e profanar o Arado de Ouro.' },
      { nome: 'Descendentes',
        texto: 'Com Ganis teve Liris, deusa da colheita, e Quiris, deus do plantio.' },
    ],

    locais: [
      { nome: 'Rio Sevides', onde: 'Perto da cidade de Itéria',
        texto: 'Nasce aos pés de uma grande árvore e se divide em três. Acredita-se que as suas águas dão a fertilidade das terras da bacia, e camponeses de toda Tagmar levam um pouco delas para regar a terra em tempo de seca ou de praga. A trezentos passos da nascente, um platô de pedra de cada margem traz o símbolo de Liris e o de Quiris, onde os altos membros da ordem fazem as grandes cerimônias.' },
      { nome: 'Templo de Tória', onde: 'Tória, Calco',
        texto: 'Guarda o Arado de Ouro, e por causa dele a região é tida como a terra mais fértil de Tagmar, acima até das de Eredra.' },
      { nome: 'Eredra', onde: 'Eredra',
        texto: 'Reino onde a agricultura e o culto a Sevides pesam tanto que ali se juntam os demonistas de Antredom.' },
    ],

    feriados: [
      { dia: 7, mes: 4, nome: 'Festa da Fertilidade',
        texto: 'A festa de gratidão pelo amadurecimento dos frutos e pelo crescimento das plantas e dos animais. A cerimônia começa antes do nascer do sol e vai até a tarde. Sacrificam-se pequenos animais e, com parte da colheita, faz-se um grande banquete em que os lavradores trocam alimentos. Nos campos, depois de uma oração a Sevides, quebram-se sete ovos numa jarra de leite, que o sacerdote espalha sobre a terra, e tudo termina com cânticos de prosperidade.' },
    ],

    itens: [
      { nome: 'Arado de Ouro',
        texto: 'O arado mágico guardado no templo de Tória, de grande poder divino, a quem se credita a fertilidade daquelas terras. Contam as lendas que sobre ele pesa uma grande maldição.' },
      { nome: 'Caixinha de madeira dos altos sacerdotes',
        texto: 'Ninguém sabe ao certo o seu poder. Os mais sábios da ordem creem que seja um amuleto capaz de secar o crescimento de bichos e plantas, ou, bem usado, de garanti-lo e até de apressá-lo, encurtando o tempo da colheita e do nascimento.' },
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
    slug: 'diatrimis',
    nome: 'Diatrimis',
    classe: 'princesa',
    // O epíteto, sem repetir a classe: o cartão já diz "Princesa" na linha de cima.
    titulo: 'Senhora da Guerra',
    imagem: null,
    // Fonte: principes.pdf, págs. 43–47 (3.4 Diatrimis, com Briareu, O Guardião); Heldrom (3.7) e Mocna (3.8);
    // deuses.pdf, Blator (prefácio).

    prefacio: {
      texto:
        'Em tempo de guerra, os ferreiros mandam nas forjas, e nenhum mandava como Albir, o Ferreiro das Mil Maravilhas. Diziam que forjava melhor que os elfos: suas espadas não envelheciam nem perdiam o fio, e ele se tornara o forjador real de um reino antigo. Ensinou o ofício ao filho, Halam, mas as espadas do rapaz nunca chegaram às do pai, e Halam ficou ajudante, à sombra do nome dele.\n' +
        'A guerra contra os invasores se arrastou até quase arruinar o reino, e o rei desafiou o rei inimigo para um duelo de morte: quem vencesse levaria as riquezas do outro por uma geração. Pediu a Albir a espada perfeita. Por dez dias e dez noites o ferreiro dosou os minerais e vigiou o calor da forja, e a lâmina saiu tão bela que o rei mal podia esperar o dia.\n' +
        'Na arena, entre centenas de soldados em círculo, o rei mostrou a grande espada; o adversário, um punhal de bronze, pequeno e simples. Quando as armas se tocaram para abrir o combate, a espada se desfez em pó, e o punhal achou o coração do rei antes que ele chegasse ao chão.\n' +
        'O reino inteiro chorou o seu rei. Menos Halam, que contava as moedas de prata recebidas na véspera de um sacerdote Bankdi da casa de Diatrimis, pelo trabalho de desfazer a obra do pai.',
      fonte: 'Extraído de O Livro de Maudi, do capítulo «A Espada» — Biblioteca de Saravossa.',
    },

    descricao:
      'Diatrimis é a antiga consorte de Blator, uma princesa infernal anã de grande poder, que se deixou tomar pela inveja da criação do companheiro e foi buscar a vingança. Nasceu pouco depois da rebelião dos deuses contra os Titãs. Blator queria uma esposa, e o seu desejo tirou de Ânimus, então mergulhado nas energias que formariam o mundo, o que lhe faltava: delas fez surgir o fim da sua solidão. Assim se ergueu Diatrimis, nem deusa nem titã, apenas a consorte de Blator.\n' +
      'Ela quis mais. Não lhe bastava ser a madrasta de Crezir e Crizagom: queria ser a mãe deles e a senhora da guerra. Achava Blator condescendente demais; para ela, guerra começada se vence a qualquer custo, e traição, extorsão, ameaça e o sangue de inocentes, adultos ou crianças, não pesam nada. O seu prazer era a guerra, e o seu orgulho, a vitória. Revoltou-se contra o consorte, e Blator, vendo que a fome dela por guerra arrasaria tudo, abriu-lhe o crânio com um golpe do machado, tão forte que lascas de metal divino se cravaram na sua fronte.\n' +
      'Diatrimis fugiu com a vergonha da derrota e o medo da destruição total, e foi se esconder no último lugar onde alguém procuraria uma ex-consorte divina: a morada de devastação e pesadelo reservada aos derrotados. O Inferno ganhou mais uma prisioneira, e os seus condenados, mais uma governante.\n' +
      'É agressiva e vulgar, sem educação nem sutileza nenhuma, e diz o que quer e o que manda sem rodeio. Quem a desagrada tem sempre o mesmo fim: a destruição.\n' +
      'Mostra-se como uma anã de músculos poderosos, de barba enorme trançada com estiletes, cacos de vidro e lascas de crânio, caída sobre um tórax de bíceps fortes no lugar dos seios. Presas de javali não lhe saem da boca: furam-lhe os lados do rosto. Os olhos são de ouro, com um ponto negro na órbita. O que mais assombra é a grande rachadura que lhe corta a cabeça em diagonal, do nariz até o meio do crânio, a ferida que Blator abriu e que nunca fecha, salpicada de farpas de aço que brilham como vidro moído.\n' +
      'Seu símbolo é uma caveira com um fragmento de lâmina de machado cravado, a mesma cicatriz que Blator lhe deixou; o pedaço de lâmina lembra o machado que se despedaçou na batalha com o deus. Sua cor é o dourado, escolhido para afrontar Blator, mas num tom mais escuro.\n' +
      'O culto é o da guerra, da matança, da destruição e da morte de inocentes, e de tudo o que leva a elas: traição, extorsão, ameaça. Suas energias despertam nas pessoas uma inveja sem medida, que se mostra em traição e sabotagem miúda: o artesão que estraga a obra do outro, o comandante que desobedece ao general, o ajudante que deixa o mestre sem ajuda. Tudo o que leve ao conflito, e até à guerra sem causa nenhuma.\n' +
      'Na guerra contra a Seita, os seguidores de Diatrimis eram a maior parte do exército Bankdi e estavam também entre os espiões e os mensageiros. Com a derrota, o seu número caiu até quase sumirem. Mas as últimas campanhas de Verrogar fizeram crescer a suspeita de que voltaram, e ali o culto tem crescido bastante.\n' +
      'O templo é retangular, de paredes cobertas de crânios de vítimas das traições dos demonistas da casa. A base do altar é feita de crânios também, sobretudo de anões, que a princesa aprecia acima de todos. Os fiéis vestem mantos simples de algodão cru, parecidos com os panos de guardar grão; os Bankdis mais importantes podem usar tecido mais trabalhado, com detalhes em dourado, e só o sumo sacerdote veste pano fino bordado com fios de ouro.\n' +
      'As doutrinas são quatro: trair os mais fracos, ser cruel com os incapazes, pôr medo no coração dos inimigos e atiçar e alimentar a guerra.\n' +
      'Seu reino é o quarto do Inferno, morada dos condenados pela traição, fechado por uma grande muralha de pedra e madeira. Um portão de bronze dá para a cidade de Calganazo, que mais parece um enorme acampamento militar: tendas por toda parte, soldados marchando sem parar de um lado para o outro. Do portão já se veem muitos castelos, e o maior é o da princesa, com uma arena por dentro onde se dão grandes combates; o sangue e a ira alimentam os demônios e os condenados que ganharam o privilégio da arquibancada. A cidade é rústica, de grandes áreas planas e arenas sem conta. Os moradores vivem em luta e em fúria, sempre em pequenos confrontos, quase todos só para humilhar o mais fraco, sem destruí-lo.\n' +
      'Guarda a cidade Briareu, um gigante de músculos com um grande martelo, que esmaga quem encontra no caminho, seguido por sete pequenos demônios que o chicoteiam sem descanso. O rosto é todo deformado pelo fogo e pelas feridas de luta, e o corpo, coberto de cicatrizes. Em vida foi um homem do sul que tropas conquistadoras levaram como escravo e fizeram gladiador. Liberto, comprou escravos para treiná-los na arena e pegou gosto pela violência, mutilando muitos deles. Falido, virou guarda-costas de um rico contrabandista, para quem tramava traições contra os inimigos e depois matava, sempre com crueldade, até que o mestre o entregou à guarda real para salvar a própria pele. Morreu preso nas torres, e o seu espírito vagou pelas casas de jogo e pelas ruas violentas, bebendo cada ato de violência e empurrando os fortes à covardia e à traição. Quando foi esconjurado, desceu direto aos reinos de baixo, para servir a uma nova senhora.',

    relacoes: [
      { nome: 'Blator',
        texto: 'O antigo consorte, que a fez surgir das energias de Ânimus para pôr fim à própria solidão e depois lhe abriu o crânio com o machado quando ela se revoltou. Dentre os deuses, é dele que ela quer se vingar.' },
      { nome: 'Crezir e Crizagom',
        texto: 'Os filhos de Blator. Diatrimis não quis ser só a madrasta deles: quis ser a mãe.' },
      { nome: 'Os deuses',
        texto: 'Como todo príncipe demoníaco, é inimiga de todos.' },
      { nome: 'Os Príncipes Demoníacos',
        texto: 'Veem nela uma grande ameaça, porque a sua origem a liga a Blator, um dos deuses mais temidos. A fome sem fim de guerra e matança também a leva a bater-se com eles, até que o mais forte vença.' },
      { nome: 'Mocna',
        texto: 'Viu no Horror Noturno um companheiro de batalha, mas a fúria dele impede que os dois ajam juntos. Conta o canto da Batalha de Blator que foi ela quem surgiu num portal e o salvou da morte certa nos campos eternos.' },
      { nome: 'Heldrom',
        texto: 'Por ser de origem não demoníaca, como Vouxiz e Seinoniz, está entre os poucos Príncipes com quem Heldrom negocia planos em comum, com o apoio de Branaxis.' },
      { nome: 'Descendentes',
        texto: 'Não tem descendentes.' },
    ],

    locais: [
      { nome: 'Calganazo', onde: 'Inferno, quarto reino',
        texto: 'A cidade de Diatrimis, atrás de um portão de bronze guardado por Briareu: um acampamento militar sem fim, de tendas, castelos e arenas, com o castelo da princesa e a sua grande arena no centro.' },
      { nome: 'A cidade fantasma', onde: 'Verrogar, em lugar incerto',
        texto: 'Dizem que, na guerra contra a Seita, os Bankdis mataram ali toda a gente de uma pequena cidade, adultos, jovens, crianças e velhos. Ficou com fama de cidade fantasma, e todos a evitam; na verdade, é onde os devotos de Diatrimis se reúnem.' },
    ],

    feriados: [
      { dia: 22, mes: 1, nome: 'Festival da Destruição e da Guerra',
        texto: 'Os adoradores comemoram e relembram os horrores das guerras: genocídios, infanticídios, estupros e massacres. Celebram também o que as fez começar, as traições, as cobiças e as fronteiras invadidas.' },
    ],

    itens: [
      { nome: 'Pulseira da Traição',
        texto: 'Com ela, o demonista amaldiçoa quem conseguir tocar, e a vítima acaba traindo a pessoa que mais ama ou a que mais confia nela. Cumprida a traição, a maldição se desfaz e a vítima volta ao normal.' },
      { nome: 'Medalhão do Medo',
        texto: 'Um medalhão de ferro com o símbolo da casa de um lado e a expressão do medo do outro. Ativado, brilha forte e lança luz para onde está virada a face do medo; quem olhar essa luz de frente é tomado por um medo que enlouquece e foge desesperado.' },
    ],
  },
  {
    slug: 'ekisis',
    nome: 'Ekisis',
    classe: 'princesa',
    titulo: 'A Mentirosa Coroada',   // o outro epíteto (A Dama da Discórdia) está na descrição
    imagem: null,
    // Fonte: principes.pdf, págs. 49–52 (3.5 Ekisis, com O Guardião Anteu); Fulvina (3.6), Morrigalti (3.9),
    // Ricutatis (3.10) e Seinoniz (3.11).

    prefacio: {
      texto:
        'Há muito tempo, no sul de Tagmar, ergueu-se o pequeno reino de Malzaria, destinado à grandeza entre tantos reinos de pouca dura. O seu rei, velho e sábio, governou trinta e oito anos sem que inimigo vencesse as suas tropas nem desastre assustasse o seu povo. Mas a vida dele chegou ao fim, e os três filhos, educados por anos para o trono, eram tão aptos que nem os conselheiros mais próximos sabiam apontar o melhor.\n' +
        'Nos dias depois do funeral, uma senhora muito bela procurou cada um dos irmãos com as condolências e uma palavra amiga. A Ilunis disse: «Jovem Ilunis, és belo e inteligente, e nenhum dos teus irmãos é tão hábil com o arco. Por que não és o sucessor de teu pai?» A Lucanis: «Senhor Lucanis, és o mais forte dos irmãos e o de coração mais justo. Por que não és o sucessor de teu pai?» E a Marcinos: «Nobre Marcinos, herdeiro por direito, governarás com sabedoria e justiça. Por que teus irmãos ameaçam o teu trono?»\n' +
        'O veneno daquelas palavras desfez a paz de tantos anos. A guerra civil destroçou Malzaria, e os inimigos, encontrando-a fraca, repartiram-na entre si até que nada restasse dela.',
      fonte: 'Extraído de O Livro de Maudi, do capítulo «Mentiras Infernais» — Biblioteca de Saravossa.',
    },

    descricao:
      'Ekisis, a Dama da Discórdia, é a princesa infernal que leva o desentendimento a todos os que escutam a sua voz. Entorta qualquer argumento com o encanto das palavras e dos gestos tímidos, e traz o veneno na língua. A beleza dela e dos seus enviados é conhecida, e nem os deuses a negam; é essa beleza que prende os olhos e os ouvidos de quem a cerca e os deixa prontos para as palavras amaldiçoadas.\n' +
      'É observadora e comedida, e nunca mostra todo o seu poder. Fala com calma e clareza, e usa o elogio para chegar ao coração da vítima; os gestos, delicados e afetuosos, servem para aproximá-la e deixá-la aberta às mentiras que ela mistura às observações e aos agrados. Nunca entra num confronto direto. Prefere que os adversários lutem entre si.\n' +
      'Pode tomar a forma de belos animais ou de uma bela mulher para se chegar às vítimas, sobretudo à gente simples. Veste sempre roupa comum e não ostenta riqueza nenhuma além da própria beleza. Seu símbolo é a face oculta, o mal escondido atrás das aparências. Sua cor é o verde-azulado.\n' +
      'O culto é o da mentira e da discórdia. Os seguidores são bajuladores hábeis e semeadores de intriga, e também grandes covardes, que preferem a fuga ao combate. Agem mais nas camadas altas do poder, levando a discórdia entre cidades e nações e acendendo disputas de poder e de herança. Na vida religiosa de Tagmar, dão muito trabalho aos sacerdotes de Selimom, porque a divisão que plantam leva, com frequência, à guerra.\n' +
      'A influência da princesa se sente nos reinos em guerra, como Verrogar e Dantsem, e nos que vivem em agitação por dentro, como Filanti, Azanti, Marana e Eredra. Onde a sua energia alcança, a paz não reina: há sempre perseguição e luta, entre o povo e dentro das famílias. O culto, porém, está espalhado por toda Tagmar, e não é fácil dizer onde é mais forte.\n' +
      'Os templos não têm feição própria, e não há dois iguais: todos copiam os templos dos deuses, para se fazer passar por eles. Sempre há neles uma câmara secreta onde se fazem os rituais da casa, e pequenos símbolos de Ekisis marcam a origem profana e o desprezo pelos outros cultos. Os demonistas vestem, quase sempre, a mesma roupa do templo que imitam; a diferença está no símbolo secreto costurado por dentro e num medalhão ou pulseira com o símbolo da princesa.\n' +
      'As doutrinas são três: semear a discórdia, esconder a verdade e promover o conflito.\n' +
      'Seu reino é o quinto do Inferno, morada dos condenados pela discórdia e pela mentira, conhecido como a terra dos tolos: um deserto imenso, com a cidade de Barciano, a cidade das mentiras, no centro. O guardião conduz as almas por um caminho que atravessa as areias, e no trajeto elas são tentadas a fugir para o deserto. É a primeira mentira. As que fogem têm a alma consumida pela solidão, e são as primeiras que Ekisis saboreia. As que chegam encontram uma cidadela feita de um labirinto imenso, com um castelo imponente no meio, e ouvem do guardião que, para se salvar, precisam chegar até a princesa e suplicar o seu perdão. Lá dentro descobrem a mentira mais sinistra: o labirinto nunca leva até Ekisis. A senhora do reino se diverte e se alimenta do sofrimento das almas perdidas ali.\n' +
      'O guardião é Anteu. Em vida foi um menino esperto e brincalhão que inventava demais, e o costume virou mentira compulsiva. Gostava de desesperar a vila gritando que vinham bandidos, e depois de horas de pânico o achavam gargalhando na praça. Um dia, do alto da colina, viu uma tropa de orcos marchando para a vila; gritou e acenou aos vigias, que não lhe deram ouvidos, e quando chegou correndo para fechar ele mesmo os portões já era tarde. Foi o único sobrevivente. Aonde quer que fosse, era conhecido como «o mentiroso» e expulso, e vagou sozinho, seguido pelos espíritos dos moradores da vila, até morrer sobre as ruínas da terra natal. Nesse dia a sua alma foi direto para o reino de Ekisis.',

    relacoes: [
      { nome: 'Selimom',
        texto: 'O deus que ela mais odeia, porque vive desfazendo as suas tramas e semeando a concórdia e a paz.' },
      { nome: 'Os deuses',
        texto: 'Como todo príncipe demoníaco, é inimiga de todos.' },
      { nome: 'Morrigalti',
        texto: 'É o seu pai, e ela o odeia acima de todos os príncipes. Ele nunca lhe dá ouvidos e prefere destroçá-la sem piedade nenhuma. Ekisis é uma dos seis príncipes nascidos dele, com Anasmadis, Antredom, Fulvina, Mocna e Ricutatis.' },
      { nome: 'Morrigaltrina',
        texto: 'Vive em tensão com os seis filhos de Morrigalti, Ekisis entre eles, por crer que todos querem tomar o seu lugar.' },
      { nome: 'Os Príncipes Demoníacos',
        texto: 'Com eles, coopera sempre que pode. Evita o confronto direto: prefere lançá-los uns contra os outros e, no fim, ficar com o que sobrar.' },
      { nome: 'Fulvina',
        texto: 'A Dama das Ilusões odeia todos os príncipes, e Ekisis em especial, por ser tão esperta quanto ela.' },
      { nome: 'Ricutatis',
        texto: 'Gosta da companhia da princesa pelos elogios que ela lhe faz, e não dá importância aos planos dela.' },
      { nome: 'Seinoniz',
        texto: 'Ekisis teme a imprevisibilidade dos seus poderes e trabalha para lançar os outros príncipes contra ele, lembrando-lhes o seu passado mortal e o seu costume de negociar almas de mortais. É a maior ameaça ao plano dele de tomar o reino de Morrigalti.' },
      { nome: 'Descendentes',
        texto: 'Não tem descendentes.' },
    ],

    locais: [
      { nome: 'Barciano', onde: 'Inferno, quinto reino',
        texto: 'A cidade das mentiras, no meio do deserto da terra dos tolos: uma cidadela-labirinto em volta do castelo da princesa, aonde as almas nunca chegam. Anteu conduz os condenados até ela.' },
      { nome: 'Templos roubados ou abandonados', onde: 'Por toda Tagmar',
        texto: 'Todo templo dos deuses que tenha sido saqueado ou deixado ao abandono é local profano de Ekisis.' },
    ],

    feriados: [
      { dia: 10, mes: 3, nome: 'Noite das Máscaras',
        texto: 'Os demonistas da casa põem máscaras e dançam sem parar ao som de músicas profanas, em volta de uma grande fogueira. Cada um lança nela uma oferenda à princesa e, nesse instante, diz uma mentira, quase sempre o nome de outra coisa: atira-se uma galinha ao fogo e grita-se «vaca».' },
    ],

    itens: [
      { nome: 'Anel de Ekisis',
        texto: 'Com ele, o demonista enfeitiça todos os que ouvem as suas palavras, e eles as tomam por verdade acima de qualquer dúvida.' },
      { nome: 'A Mordaça',
        texto: 'Sob o seu efeito, o demonista vê a aura de todos os que não são demonistas ou que se fazem passar por um. Diz-se no culto que só um mentiroso reconhece outro.' },
    ],
  },
{
    slug: 'fulvina',
    nome: 'Fulvina',
    classe: 'princesa',
    titulo: 'A Dama das Ilusões',   // os outros epítetos (A Princesa dos Cegos, O Olhar Profano) estão na descrição
    imagem: null,
    // Fonte: principes.pdf, págs. 54–58 (3.6 Fulvina, com O Guardião Alsifame); Branaxis (3.3), Heldrom (3.7),
    // Mocna (3.8) e Morrigalti (3.9); deuses.pdf, Lena (Noite dos Prazeres).

    prefacio: {
      texto:
        'A princesa Martina cresceu entre luxos e criados, e nunca um desejo seu ficou sem resposta. Quando chegou a idade de casar, nenhum pretendente veio: a família dela era a menos poderosa entre as casas reais. Enquanto isso, Imidora, sua dama de companhia, uma plebeia bonita, casou-se aos dezessete anos com o filho de um rico padeiro. Martina soube duas semanas depois, e a raiva não foi pelo silêncio. Foi por uma plebeia ter conseguido o que ela tanto queria.\n' +
        'Desde então passou a se achar a menos bela das mulheres e chamou herbários, bruxos e alquimistas para lhe guardar a juventude. Entre eles chegou de Levânia Guildor, sacerdote de uma seita que ninguém conhecia. Já rainha, Martina exigiu dele um remédio definitivo, e Guildor lhe fez um espelho místico que a manteria jovem ao preço de vidas. Ela recusou de pronto; depois olhou no espelho, viu a moça que fora, e o mal tomou conta dela. Imidora e toda a família foram as primeiras vítimas.\n' +
        'Guildor morreu velho e deu lugar a Alexei, jovem demonista da casa de Fulvina, encarregado de manter o reino aliado dos Bankdis por mais uma geração. Aos cento e cinquenta e oito anos, Martina governava pelo medo, ressecada como uma múmia. No espelho, continuava a ver uma jovem.',
      fonte: 'Extraído de O Livro de Maudi, do capítulo «A Princesa Esqueleto» — Biblioteca de Saravossa.',
    },

    descricao:
      'Fulvina é a princesa infernal da vaidade e da soberba, chamada A Princesa dos Cegos, A Dama das Ilusões e O Olhar Profano. Nasceu de um dos olhos de Morrigalti e do desprezo que ela tem pelo poder de criar dos deuses. Sua influência não para na vaidade: traz também a inveja, o individualismo e a preguiça. Faz dos mais talentosos tolos presunçosos, que amam a si mesmos e ao que sabem acima de tudo e largam o próprio ofício; e, nos que não têm talento, desperta o desejo de destruir quem o tem. Cego pelo próprio ego, o tocado por ela vive numa doce ilusão enquanto cava a própria cova.\n' +
      'É vaidosa e arrogante, e quer sempre mais almas para o seu reino. Passa horas diante dos espelhos místicos, vigiando e dobrando os condenados que estão sob o seu feitiço. Exige que os súditos a cubram de elogios e não tolera desrespeito.\n' +
      'Aparece como uma mulher magra e muito alta, de cabelos brancos que puxam para a prata e olhos inteiramente brancos. Os dedos, mais longos que os de qualquer mortal, vestem dedeiras de prata. O vestido é de pele, coberto de pequenos cristais que cintilam. Quando ela estica o dedo e toca um condenado, ele vira cristal de gelo e se parte ao menor toque; os cacos são recolhidos com cuidado e costurados no vestido, para enfeitar a princesa.\n' +
      'Seu símbolo é o Olho Aprisionado: a vítima dela só vê o que quer ver, a própria vaidade, o próprio eu. Sua cor é o violeta.\n' +
      'Procura os poderosos, governantes e grandes comerciantes inchados de poder. Gente simples e contente com o que tem lhe dá asco, mas diverte-a corromper os trabalhadores com preguiça e presunção. Os tocados por ela gostam de ostentação e de bajulação, exageram as próprias qualidades e tomam para si méritos alheios. Nas terras onde o culto cresce, aumentam a soberba e o desprezo pelos outros, e vêm com eles os crimes contra os estrangeiros e os de outra raça.\n' +
      'O culto a Fulvina é o culto ao próprio eu. Nos templos, cada devoto proclama em voz alta as suas virtudes, e inventa algumas quando faltam. As brigas entre devotos são frequentes, pois cada um quer ser mais que o outro, e nenhum aceita crítica. Pregam aos ricos e aos influentes, reis, príncipes e burgueses, prometendo vida longa e beleza eterna; e aos mestres de ofício, magos, bardos e artífices, enchendo-os de soberba até que se tornem negligentes. Os seguidores de Parom são os mais cobiçados.\n' +
      'Os templos são belos e amplos, cheios de espelhos e de estátuas dela. Quem encara os espelhos por muito tempo vê demônios tomando parte nas cerimônias ou o reflexo dos próprios desejos. As portas ficam escondidas: entra-se por um espelho de acesso, pronunciando as palavras mágicas que abrem a passagem, e os poucos lugares que guardam esses espelhos são vigiados por simpatizantes do culto. Oferecem-se a ela estátuas de vidro em miniatura, de pessoas e de objetos, com oferendas profanas.\n' +
      'Só os Bankdis mais importantes usam o manto da casa, coberto de um pó cristalino que brilha em violeta à luz das tochas. Os demais vão ao templo com as suas melhores e mais elegantes roupas. As doutrinas são sete: a vaidade do corpo e da mente; o individualismo; a manipulação do ego; o obscurecimento da mente; o desejo e a destruição da virtude alheia; a soberba; e a preguiça.\n' +
      'Seu reino é o duodécimo do Inferno, morada dos condenados pela vaidade, de florestas sombrias e sangrentas em torno da cidade de Escarmegelo. A vegetação é viva: alimenta os vícios e as vaidades de cada condenado para depois arrancá-los, e se nutre da dor que causa. O guardião é Alsifame, que em vida foi um herbário famoso, de memória prodigiosa, consultado pelos nobres. A fama o tornou descuidado. Uma menina camponesa morreu de uma planta venenosa que ele receitou, e a culpa foi posta no «Desejo de Cruine»; quando o descuido matou um príncipe, ele foi à forca. Hoje prepara, com os condenados, os cremes da sua princesa.',

    relacoes: [
      { nome: 'Morrigalti',
        texto: 'O pai: foi criada de um dos olhos dele, e é um dos seis príncipes nascidos dele, com Anasmadis, Antredom, Ekisis, Mocna e Ricutatis. Suas ilusões não o alcançam, e ela o tem por inimigo poderoso demais para enfrentar às claras.' },
      { nome: 'Os Príncipes Demoníacos',
        texto: 'Odeia a todos.' },
      { nome: 'Ekisis',
        texto: 'A que ela mais odeia entre os príncipes, por ser tão esperta quanto ela.' },
      { nome: 'Mocna',
        texto: 'Como o pai, está fora do alcance da sua influência, e ela o evita como inimigo poderoso demais.' },
      { nome: 'Morrigaltrina',
        texto: 'A titã-segunda que governa o reino de Morrigalti teme que os seis filhos dele, Fulvina entre eles, queiram tomar o seu lugar.' },
      { nome: 'Heldrom',
        texto: 'Fez com ele algumas alianças no passado; de uma delas nasceu Branaxis.' },
      { nome: 'Branaxis',
        texto: 'O filho que teve com Heldrom, e que ela rejeitou pela aparência medonha. É quem ele mais odeia e, no íntimo, quem mais deseja que o aceite.' },
      { nome: 'Os deuses',
        texto: 'Odeia a todos, como todo príncipe demoníaco.' },
      { nome: 'Parom',
        texto: 'O deus que ela mais odeia, pela perfeição técnica, pelo trabalho árduo e pelo poder de criar. Há quem veja nesse ódio uma velha paixão: tentou seduzi-lo e foi recusada, porque ele amava Lena. Ferida no orgulho, odeia desde então a ele e a todos os que o seguem.' },
      { nome: 'Lena',
        texto: 'Fulvina marcou o Dia dos Espelhos no mesmo dia da Noite dos Prazeres, em afronta clara à deusa que Parom preferiu.' },
      { nome: 'Descendentes',
        texto: 'O livro dela diz que não tem descendentes conhecidos, embora a ela e a Heldrom se atribua Branaxis. Alguns afirmam que os transmorfos têm alguma ligação com a princesa.' },
    ],

    locais: [
      { nome: 'Escarmegelo', onde: 'Inferno, duodécimo reino',
        texto: 'A cidade de Fulvina, cercada de florestas vivas que se alimentam das emoções dos condenados e guardada por Alsifame. No grande castelo, perto da entrada, ficam as estátuas de cristal dos antigos desafetos e os troféus que a princesa juntou ao longo da existência.' },
      { nome: 'Casa das Vaidades', onde: 'Eredra, longe dos povoados e das cidades',
        texto: 'O lugar sagrado da seita: um castelo de grande beleza e riqueza. Ali os membros mais promissores recebem os frascos de cristal que os mantêm belos e jovens à custa das almas das vítimas, e os desejos se cumprem por algum tempo, para que os beneficiados se entreguem a Fulvina.' },
      { nome: 'Templos atrás dos espelhos', onde: 'Por toda Tagmar',
        texto: 'Só se chega a eles por um espelho de acesso e por palavras mágicas, e cada espelho é guardado por simpatizantes do culto.' },
      { nome: 'Levânia, Verrogar e Marana', onde: 'Levânia; Verrogar; Marana',
        texto: 'Dizem que Levânia guarda bom número de seguidores, e de lá veio Guildor. Em Verrogar o culto cresce depressa, alimentado pelo senso de superioridade dos verrogaris. A situação atual de Marana também atraiu o olhar da princesa.' },
    ],

    feriados: [
      { dia: 1, mes: 7, nome: 'Dia dos Espelhos',
        texto: 'Cai de propósito no dia da Noite dos Prazeres, de Lena, para afrontar a deusa. Os seguidores sacrificam objetos de valor ou vítimas para ganhar alguns anos a mais de vida. Há cerimônias o dia inteiro, mas os sacrifícios mais importantes se fazem no auge da noite, diante de espelhos que se partem sozinhos ao fim do rito. Quem sacrifica alguém a quem inveja ou despreza recebe graças maiores.' },
    ],

    itens: [
      { nome: 'Espelho de Fulvina',
        texto: 'Espelho amaldiçoado que mostra a quem o usa só aquilo que ele crê ser a verdade. Com o tempo vicia o portador, tira-lhe todo juízo e o deixa dependente das próprias ilusões; o culto o põe nas mãos de quem quer manipular.' },
      { nome: 'O Elixir',
        texto: 'Perfume feito pelos demonistas à base de virgens. Quem o usa encanta, e até apaixona, todos os que sentem o seu cheiro, mas só enquanto o sentem: passado o odor, a pessoa volta a si.' },
      { nome: 'Colar da Beleza Eterna',
        texto: 'Precisa ser dado de presente e recebido de bom grado. Posto no pescoço, brilha em verde e já não sai por meio nenhum; parte por parte, transforma o corpo da vítima num vidro muito resistente, até fazer dela uma estátua de vidro de beleza congelada para sempre.' },
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
  {
    slug: 'morrigalti',
    nome: 'Morrigalti',
    classe: 'principe',
    titulo: 'O Genocida, o Destruidor da Criação',
    imagem: null,
    // Fonte: principes.pdf, págs. 74–79 (3.9 Morrigalti, com Catemeca, o Guardião); Prólogo (Ponte de Morrigalti, os treze
    // domínios); Ekisis (3.5), Heldrom (3.7), Udoviom (3.12) e Vouxiz (3.13); deuses.pdf, Maira (Adoração a Maira Nil).

    prefacio: {
      texto:
        'A comitiva de Lar seguia pela trilha real levando aos elfos de Âmiem uma mensagem e presentes que renovavam laços antigos. Corsam, o líder, guardava um colar de prata e diamantes, sinal de afeição eterna entre as nações. Já tinha cavalgado em muitos campos de batalha, e nenhum o deixara tão inquieto quanto aquela floresta. Os elfos diziam que ela fora maculada pelo mal décadas antes e que, mesmo recuperada, jamais voltara a ser a mesma.\n' +
        'As flechas vieram primeiro, depois orcos e mercenários humanos. Os cavaleiros cerraram os escudos e caíram vencidos pelo número. Então saiu da mata um homem de manto, seguido de nove soldados, e os sobreviventes se ajoelharam. Na mão marcada de queimaduras trazia um anel de ouro com uma pedra de enxofre, talhada com o símbolo de Morrigalti. Era Alzer, um dos Comus Bankdis mais temidos da casa do Genocida.\n' +
        '«Tragam os Majiras», ordenou. As criaturas comeram os mortos, tomaram-lhes a forma e o lugar na comitiva. Alzer tocou de leve o colar: a pedra central escureceu e logo voltou ao normal. «Corsam» seguiu viagem para Âmiem. A guarda de Alzer matou os orcos e os mercenários antes que o último suspiro se apagasse, e o Comus partiu com um só pensamento: logo o mestre estará livre, e o mundo sentirá outra vez o seu poder.',
      fonte: 'Extraído de O Livro de Maudi, do capítulo «O Retorno da Seita» — Biblioteca de Saravossa.',
    },

    descricao:
      'Quando ainda não havia tempo nem luz, das trevas nasceram os titãs, e das trevas nasceu também Morrigalti. Foi o primeiro e o mais poderoso dos demônios, e todos vieram dele; entre os Príncipes Infernais, sua liderança não se discute. Antes mesmo dos deuses já tramava destruir a criação dos titãs. Os deuses guardam a lenda de outras gerações divinas antes deles, desfeitas uma a uma por esse demônio, até que surgiram Palier e os seus irmãos, e a astúcia do deus dos elfos quebrou o ciclo.\n' +
      'Enquanto os outros Príncipes disputam migalhas e querem corromper ou tomar a criação, ele quer desfazê-la: devolver tudo ao seu estado de origem, as trevas absolutas. Toda força que um demônio conquista paga a ele uma parte, e é o único Príncipe que se alimenta do medo dos outros demônios. Trata os Príncipes com desdém, mesmo sendo pai de vários deles, como peças do seu jogo pelo controle da existência. Vê toda criatura como um erro feito por crianças tolas que estragaram a perfeição que havia antes. Esse orgulho o cegou para a traição dentro das próprias fileiras.\n' +
      'Pois foi traído. Durante a expansão da seita Bankdi, atravessou o portal para o mundo material com a filha, Morrigaltrina, uma das suas maiores generais. Ela conhecia os planos do pai e não queria o fim de tudo, muito menos o seu. Em sonho, Palier, o outro pai, mostrou-lhe o que viria se Morrigalti vencesse; no dia seguinte ela revelou aos elfos onde e como seria o próximo ataque, e a Rainha Enora fez o resto com o seu cajado divino. O avatar do Genocida está preso num bloco de cristal, escondido no interior de Âmiem. Os elfos sabem que não podem prendê-lo para sempre e que matá-lo é impossível; enquanto isso, as juras de vingança correm pelo reino élfico, e a existência profana dele corrompe a terra.\n' +
      'Em seu domínio nunca teve forma definida: parece uma tempestade gigantesca de tentáculos, com milhares de bocas e olhos. Da última vez que se mostrou no mundo material, foi uma criatura negra e descomunal, de cabeça com treze olhos e boca de centenas de dentes venenosos, corpo escamoso de serpente, um par de braços com garras, imensas asas de escamas e cauda partida em dois ferrões. Dizem as lendas que as asas abertas medem três vezes o corpo, da cabeça à cauda. É esse corpo que hoje jaz no cristal.\n' +
      'Seu símbolo tem três formas. A simples é o número um sobre o número três, ou um M inclinado para a direita: o primeiro dos treze. A complexa é uma estrela de treze pontas com um olho no centro, o contraponto aos treze titãs. A rebuscada põe no centro da estrela um olho de serpente, de onde saem tentáculos para cada vértice. Sua cor é o vermelho.\n' +
      'A religião prega a união de tudo ao seu senhor: todos devem voltar à origem e se tornar um só com o universo. Nos cultos se fazem sacrifícios de sangue para reforçar a servidão; escravos são mortos, e cada cultista dá ao altar uma porção do próprio sangue. É o culto que atrai os fanáticos mais violentos da Seita, autores de massacres e genocídios rituais, e os líderes manipulam os simples, ou ameaçam os parentes das vítimas, para provocar suicídios coletivos nas cerimônias. Entre os adoradores estão povos inimigos dos elfos, como anões e orcos, mas qualquer genocida se sente em casa nos seus templos.\n' +
      'Os templos são esféricos, de cúpula central pintada com afrescos de Morrigalti e do seu reino, e de pilares envoltos em tecidos finos vermelho-sangue. Treze altares correm junto à parede. No centro há um trono vazio, com uma espada cravada no chão à direita e uma mesa de sacrifício à esquerda. As vestes são grandes mantos vermelhos de cinto negro, com uma adaga dourada embainhada do lado direito; os Comus Bankdis e o Dux Bankdi usam nas cerimônias o medalhão com o olho.\n' +
      'As doutrinas mandam: o retorno ao Mestre, pois tudo o que vive deve morrer e ser absorvido por ele; a queda dos falsos deuses; genocídios e massacres em sua honra; provocar suicídios coletivos; buscar no suicídio o perdão de uma falha; odiar os elfos e os adoradores de Palier; e peregrinar uma vez na vida à prisão de cristal em Âmiem, buscando libertá-lo. Quem conseguir terá vida eterna de glória na corte divina. O culto age sobretudo em Verrogar, perto da fronteira com Âmiem, e generais verrogaris convertidos buscam a guerra com as outras nações.\n' +
      'Seu reino, morada dos condenados por genocídio e massacre, é o maior dos infernos, cercado de montanhas e vulcões de onde descem rios de lava. Ali os demônios torturam os condenados fazendo-os crer que os seus entes queridos estão em poder deles, e se alimentam da dor. O guardião é Catemeca, «Feito de Mil Partes», o mais terrível dos guardiões infernais, que o próprio Morrigalti moldou do sacrifício de mil demônios. É de rocha e carne profana, com um coração alimentado pelas trevas da cidade, e no lugar da cabeça tem uma névoa negra que forma um rosto disforme. Milhares de condenados e adversários foram tragados para dentro dele ao longo dos séculos, e cada um o tornou mais forte. Nunca foi vencido, ao menos até a vinda de Maudi.',

    relacoes: [
      { nome: 'Palier',
        texto: 'O deus que ele mais odeia. Convenceu-o de que era preciso guerrear os titãs antes que eles destruíssem tudo para refazer, e selou com ele um pacto de sangue para gerar um ser poderoso para essa guerra; queria, no fundo, os titãs fora do caminho para trazer ele mesmo o fim de tudo. Palier só fingiu entrar no jogo: vencida a guerra, criou o limbo e nele isolou os Príncipes e suas hostes. Talvez o ódio venha de serem contrapesos um do outro, Palier o mais poderoso dos que criam e Morrigalti o mais poderoso dos que destroem.' },
      { nome: 'Os deuses',
        texto: 'Odeia a todos. Os deuses contam que gerações divinas anteriores a eles caíram por obra dele.' },
      { nome: 'Morrigaltrina',
        texto: 'A filha de dois pais, titã-segunda nascida do pacto de sangue com Palier, que levou o nome do ser mais antigo. Na guerra ajudou Palier a vencer Étere, e do poder arrancado à titã ganhou o dom de se dividir em três: uma harpia demoníaca, uma meio-elfa divina e um ser espectral. Depois do limbo tomou o partido do pai infernal, mas o traiu em Âmiem. Hoje governa o reino dele do Palácio dos Mil Tormentos e vive com medo de que os outros Príncipes queiram tomar o seu lugar.' },
      { nome: 'Os Príncipes Demoníacos',
        texto: 'Menospreza-os como inferiores, bons para escravos ou joguetes. Nunca se alia a eles como igual: em todo pacto fica com o controle e o maior ganho.' },
      { nome: 'Seus filhos',
        texto: 'Seis dos Príncipes atuais nasceram dele: Anasmadis, Antredom, Ekisis, Fulvina, Mocna e Ricutatis. Fulvina foi criada de um dos seus olhos. Morrigaltrina teme os seis mais que a todos.' },
      { nome: 'Ekisis',
        texto: 'É sua filha, e o odeia acima de todos os Príncipes. Ele nunca lhe dá ouvidos e prefere esmagá-la sem piedade.' },
      { nome: 'Heldrom',
        texto: 'O deus caído é dos poucos Príncipes que rivalizam com ele em poder.' },
      { nome: 'Udoviom',
        texto: 'O Senhor da Pestilência o odeia, como a Mocna: a devastação dos dois mata cedo demais para o gosto de quem prefere as mortes lentas.' },
      { nome: 'Vouxiz',
        texto: 'Vê na prisão dele em Âmiem uma chance de alargar os seus domínios, e prepara um exército de criaturas para invadir o reino de Morrigalti.' },
      { nome: 'Os elfos de Âmiem',
        texto: 'Guardam o seu avatar preso em cristal desde que a Rainha Enora o deteve com o cajado divino. O culto jurou ódio aos elfos, e o destino deles, dizem os cultistas, já está selado.' },
      { nome: 'Maira',
        texto: 'Os cultistas escolheram o dia em que se adora Maira Nil, no mês de Palier, para a Prisão Dourada.' },
      { nome: 'Descendentes',
        texto: 'Falar dos descendentes de Morrigalti é falar do próprio Inferno: todo demônio que lá existe, existiu ou existirá é parte dele e do seu poder. Entre as últimas crias estão as Gárgulas Demoníacas, nascidas do sangue que ele derramou no solo profano, generais de campo de força e ferocidade imensas e leais só a ele; e as harpias demoníacas, feitas das suas escamas.' },
    ],

    locais: [
      { nome: 'Simaricane', onde: 'Inferno, décimo terceiro reino',
        texto: 'A maior das cidades infernais, cortada por rios de lava que separam os bairros, unidos só por pontes, e cercada por uma muralha com treze fortalezas, uma em cada entrada. Há mercados e casas de magia sob a vigia de bruxos demonistas e emissários demônios, e os mais importantes moram em grandes torres. Para chegar ao portal de saída é preciso cruzar uma das entradas com uma chave especial; crê-se que cada um dos treze generais do reino guarda uma. Catemeca a vigia.' },
      { nome: 'Palácio dos Mil Tormentos', onde: 'Centro de Simaricane',
        texto: 'A morada de Morrigalti, em estilo gótico, de tijolos e pedras escurecidos que brilham à luz das labaredas dos rios de fogo. É dali que Morrigaltrina governa.' },
      { nome: 'A prisão de cristal', onde: 'Interior de Âmiem',
        texto: 'O lugar mais procurado pelos cultistas e destino da peregrinação que cada um deve fazer uma vez na vida. Há rumores de que a presença do Príncipe perturba as plantas e os animais em volta.' },
      { nome: 'Abadom', onde: 'Abadom',
        texto: 'Um dos lugares que os sacerdotes mais buscam para os cultos: afirma-se que foi pelo poder de Morrigalti que ali se cometeram grandes massacres e destruição.' },
      { nome: 'Ponte de Morrigalti', onde: 'No ponto místico oposto à Ponte de Palier',
        texto: 'O caminho que demônios e demonistas abrem para trazer os demônios ao mundo material. A magia é mais forte no ponto oposto à Ponte de Palier, pois tudo se completa no seu contrário.' },
    ],

    feriados: [
      { dia: 1, mes: 13, nome: 'Retorno à Escuridão',
        texto: 'Cai no Dia de Cruine e prega a união de toda a existência com Morrigalti. Centenas de escravos e animais são sacrificados para lhe aumentar a força, e o sangue é a oferta que mais agrada à sua fome de destruição. Se os cultistas não apresentarem um verdadeiro genocídio, devem se matar em suicídio coletivo para satisfazê-lo.' },
      { dia: 20, mes: 9, nome: 'Prisão Dourada',
        texto: 'No dia em que se adora Maira, no mês de Palier, os cultistas atacam povoados élficos em vingança por Morrigalti e enterram vivos os prisioneiros em buracos e poços. Com cada um vai só um cesto com o símbolo do Príncipe, que o cultista diz conter água e comida e que só se abre quando o preso diz «Eu me entrego a Morrigalti». Dentro há uma serpente venenosa possuída por um demônio. Mesmo quem a mata morre de fome e sede no buraco, e a alma de quem se entregou vai alimentar o Príncipe na prisão.' },
    ],

    itens: [
      { nome: 'O Olho Profano',
        texto: 'Medalhão com um olho dentro de uma estrela de treze pontas. Ativado pelo demonista, suga a magia lançada contra o portador ou parte do dano das magias em volta, e a magia guardada pode ser relançada depois, até contra quem a lançou.' },
      { nome: 'Adaga da Vingança',
        texto: 'Adaga mística que, segundo se crê, enfraquece os poderes mágicos de quem fere.' },
      { nome: 'Anel do Fogo',
        texto: 'Invoca o fogo infernal ao redor do demonista, numa muralha de chamas que o protege e ataca quem tenta se aproximar.' },
      { nome: 'Asas de Demônio',
        texto: 'Um manto carmesim. Ao som de um cântico profano, dá lugar a asas demoníacas que levam o cultista pelo ar por até sete horas seguidas.' },
    ],
  },
{
    slug: 'seinoniz',
    nome: 'Seinoniz',
    classe: 'principe',
    titulo: 'O Senhor das Correntes',   // o outro epíteto (Aquele que Arrasta), que ele proíbe aos servos, está na descrição
    imagem: null,
    // Fonte: principes.pdf, págs. 87–91 (3.11 Seinoniz, com O Guardião Encélado); Heldrom (3.7) e Morrigalti (3.9);
    // deuses.pdf, Cambu e Parom (a flecha de luz e as correntes místicas).

    prefacio: {
      texto:
        'A fogueira brilhava forte na noite sem lua. Eram quatro jovens guerreiros, na primeira noite longe da vila onde tinham vivido a vida inteira, e tinham prometido a todos que seriam reconhecidos e temidos. Na floresta desconhecida, o medo chegou antes do sono. Leonir, o mais destemido, o que convencera os amigos de infância a partir, falou-lhes de amizade, glória e riqueza, e depois de um poder antigo que podia dar-lhes tudo isso. Com palavras bonitas, fez os três jurarem lealdade ao seu mestre.\n' +
        'Então mostrou no braço uma marca, um S cortado, e a estendeu sobre o fogo. «Aceite minha oferenda, ó senhor dos pactos», disse numa língua que ninguém conhecia, e pediu a cada um uma gota de sangue para selar o acordo. Ronero, o precavido, hesitou e começou a falar do sacerdote; Leonir o cortou: o sacerdote seria só mais um, sem importância nenhuma no mundo. Os três obedeceram. Conheciam Leonir desde pequenos.\n' +
        'Um vento baixou as chamas, e o fogo explodiu. Dele saiu uma criatura rastejante. «Verme, são estas as tuas oferendas?» «Sim, como prometido. Estas almas se oferecem de bom grado ao mestre.» «Terás o que desejas, mas fica certo de que nos encontraremos de novo.» Mais rápido do que os olhos acompanham, o demônio agarrou o pé de cada um, algemou-os e se arrastou de volta para o fogo, levando-os aos gritos.\n' +
        'Leonir correu o mundo oferecendo almas em troca de poder e riqueza. No fim da vida, deitado sozinho na bela cama da sua casa grande, viu a lareira tremer, e do fogo saíram todos os que ele havia entregado. «Chegou a tua hora», disse Ronero. Das mãos das vítimas saltaram correntes que lhe prenderam braços e pernas e o puxaram para as chamas, cortando-lhe a carne, até que o fogo o engoliu.',
      fonte: 'Extraído de O Livro de Maudi, do capítulo «A Queda do Homem» — Biblioteca de Saravossa.',
    },

    descricao:
      'Seinoniz é o único dos Príncipes Infernais que já foi mortal, e é a tirania e a servidão. Em vida chamava-se Sarnodis e pertencia ao alto escalão da Sociedade Secreta de Magos Arcondi. Quando os nove reis feiticeiros se ergueram e massacraram a sociedade, percebeu a tempo a intenção dos antigos mestres e foi dos poucos que fugiram, levando muitas das pesquisas da ordem. Seguiu para o leste e se fixou em Kerniz, um reino escravista, onde o saber místico o fez poderoso e conhecido pela impaciência e pelo mando.\n' +
      'Passou anos tentando refazer o ritual da ascensão a partir de textos em pedaços, sem sucesso, até descobrir o Karma Infernal. Os Arcondi tinham por impuro todo poder que não fosse arcano, mas Sarnodis, vendo crescer o poder dos reis feiticeiros, seguiu os conselhos de uma voz na própria mente e passou a invocar e dominar demônios. A energia infernal lhe alongava a vida e, ao mesmo tempo, lhe gastava o corpo e a alma. A mesma voz lhe revelou de onde vinha a força dos reis feiticeiros: das almas. Numa só noite sacrificou mais de quinhentos escravos e saiu do ritual revigorado, capaz de mandar em demônios menores só com o pensamento. Com eles tomou Kerniz.\n' +
      'Sabendo que as almas devotas e voluntárias rendem mais a quem as consome, declarou-se divindade e passou a oferecer pactos: riqueza e vida longa a quem lhe jurasse fidelidade e servidão. Décadas viraram séculos. Achava tolos os reis feiticeiros, que guardavam a alma em recipientes; ele faria da própria alma o seu recipiente. O povo de Kerniz, rico e próspero, não passava de rebanho seu, e trabalhou por meses no plano do mestre sem desconfiar. Numa noite sem lua, a cidade inteira foi tragada pelo seu poder. O corpo mortal não resistiu, mas a alma ficou e se fez carne infernal, e diante dela até os demônios mais poderosos se curvaram.\n' +
      'Mal tinha se erguido príncipe, uma grande flecha de pura luz o atingiu na coxa. Era Cambu, que pairava no ar de arco em punho e trazia ao mundo a fúria dos deuses contra a maior abominação em que um filho dos deuses poderia se tornar. Para não travar um combate que arrasaria muito mais do que já estava perdido, o mensageiro só quis prendê-lo, e o fez com as correntes místicas forjadas por Parom. Sarnodis foi arrastado para os infernos gritando juras de vingança, e lá está trancado até hoje.\n' +
      'É agressivo e autoritário, e busca nos pactos o domínio das almas. Para ele os mortais são um rebanho a criar e engordar: os fracos para servi-lo, os fortes para serem devorados. Não mostra essa face aos vivos. Alguns seguidores o pintam como mártir, um mortal que buscou poder e liberdade e foi amaldiçoado injustamente pelos deuses, e chamam os seus pactos de graças concedidas a um preço justo.\n' +
      'É representado como um mago em vestes reais, enrolado em incontáveis correntes. São as mesmas com que Cambu o prendeu, e ele lhes virou o sentido: hoje são o sinal do seu poder sobre os pactos. A flecha deixou-o coxo da perna esquerda, obrigado a arrastar as correntes, e daí vem a alcunha de Aquele que Arrasta. Ele a odeia e a proíbe aos servos; quem a usa são os seus inimigos. Para quem preza a liberdade, poucas criaturas são tão temidas.\n' +
      'Seu símbolo é a Marca de Posse, um S cortado na vertical, que em vida ele mandava gravar nos escravos. Hoje é o sinal do pacto: aparece por magia em alguma parte do corpo de quem o firma, e diz que aquela alma será levada ao plano infernal, para servi-lo ou para alimentá-lo. Também se usa uma serpente em forma de S, presa pela cabeça e pela cauda. Sua cor é o cinza azulado.\n' +
      'O culto é simples: pede-se um favor e paga-se com a própria alma. O prazo da cobrança é incerto, e os membros mais poderosos espalham a fé para alongar os seus contratos. Arrependidos não são raros, e os servos mais leais tratam de apagá-los depressa e em segredo. Uns poucos buscam refúgio nos deuses, mas a alma marcada dificilmente se redime; só um arrependimento muito sincero talvez os livre. Quem se rebela perde tudo o que ganhou, passa a ser caçado por demônios e cultistas e não dorme sem pesadelos horríveis.\n' +
      'O templo é o mais amplo de todos os príncipes. As colunas de pedra trazem rostos em agonia, as vítimas colhidas pelos pactos, e no altar, onde fica o demonista que preside, guarda-se a chama que acende as lanternas do culto. Os devotos vestem cinza azulado, com correntes por cinto e presas às pulseiras, sinal do laço de fidelidade; as sandálias, de cordas negras trançadas até o joelho, são feitas do cabelo dos que pereceram por pactos antigos.\n' +
      'A fé está espalhada por toda Tagmar, entre nobres, burgueses e escravos que sonham com a liberdade, porque o pacto parece o caminho mais curto para a fama e a fortuna. Dizem que em Abadom estão muitos dos seus seguidores; nas Cidades-Estado e em Verrogar, escravos fazem pacto na esperança de se libertar, e só trocam o senhor mortal por um muito pior. Onde tiranos e autoridades sentem prazer em extorquir e ferir os mais fracos, a mão dele se faz sentir. As doutrinas são três: a escravidão dos mais fracos, o domínio da vontade e o comércio de almas.\n' +
      'Seu reino é o sétimo do Inferno, morada dos condenados pela preguiça. A cidade, Draganazo, fica numa cratera, e o palácio do príncipe está enterrado no ponto mais fundo dela. As casas são simples e parecem sempre inacabadas ou à espera de reforma; as ruas calçadas se enchem de lixo e entulho. Os condenados vivem acorrentados a rochas pesadas, que arrastam ou levam às costas, sempre curvados, e o ruído das correntes enferrujadas no chão e nas pedras não para nunca. O guardião é Encélado, nobre de família de cavaleiros que nunca lutou por nada: mandava outros à guerra sob o seu estandarte, pagava campeões para defender a sua honra e menestréis para cantar vitórias que jamais teve, e andava de liteira nas costas de escravos, até morrer jovem envenenado por uma escrava que havia violado. Hoje espera, paciente, preso a uma estaca, e vê passar todos os condenados; contra quem o mestre não quer deixar passar, correntes brotam do chão como cobras e o prendem junto a Encélado, que o devora devagar.',

    relacoes: [
      { nome: 'Cambu',
        texto: 'Foi ele quem o atingiu na coxa com uma flecha de pura luz, no dia em que Sarnodis tragou Kerniz, e quem o prendeu com as correntes de Parom. Seinoniz lhe guarda ódio mortal. A Noite dos Esquecidos cai no mesmo dia em que os devotos do mensageiro pedem prosperidade.' },
      { nome: 'Parom',
        texto: 'Forjou as correntes místicas que o levaram ao Inferno, e por isso divide com Cambu o seu ódio mortal.' },
      { nome: 'Morrigaltrina',
        texto: 'Odeia a filha de Morrigalti e o controle que ela exerce sobre os outros demônios, e trama tomar para si o reino do pai dela.' },
      { nome: 'Ekisis',
        texto: 'A maior ameaça ao seu plano de tomar o reino de Morrigalti. A Mentirosa Coroada teme a imprevisibilidade dos poderes dele e tenta lançar os outros príncipes contra ele, lembrando o seu passado mortal e o seu hábito de negociar almas de mortais.' },
      { nome: 'Heldrom',
        texto: 'O único príncipe com quem se dá bem, pois toma parte em muitos dos seus planos e artimanhas. Há demonologistas que creem que a ascensão de Seinoniz, ou a sua queda, foi mais uma obra de Heldrom.' },
      { nome: 'Os Príncipes Infernais',
        texto: 'Não se importa com nenhum deles, nem com o Plano Infernal. Se pudesse, faria todos beijarem os seus pés.' },
      { nome: 'Descendentes',
        texto: 'Não tem descendentes conhecidos. Corre o boato de que uma linhagem antiga, dos tempos em que ele era mortal, segue viva e espalhando o culto.' },
    ],

    locais: [
      { nome: 'Draganazo', onde: 'Inferno, sétimo reino',
        texto: 'A cidade dos condenados pela preguiça, numa cratera, de casas sempre inacabadas e ruas cheias de entulho, com o palácio do príncipe enterrado no fundo. Os condenados arrastam rochas presas a correntes. Guarda-a Encélado, preso a uma estaca, que devora quem o mestre não deixa passar.' },
      { nome: 'Kerniz', onde: 'Lugar desconhecido; talvez além das Estepes Vítrias, no Império',
        texto: 'O antigo reino escravista onde, dizem os seguidores, Seinoniz ascendeu, e o lugar mais procurado pelos seus servos. Uns dizem que os deuses a destruíram; outros, que fica além das Estepes Vítrias. Ali estariam guardados itens e magias poderosíssimos do Segundo Ciclo, e os que querem recuperar a alma esperam achar nela a sua salvação.' },
      { nome: 'Abadom, Cidades-Estado e Verrogar', onde: 'Tagmar',
        texto: 'Onde o culto mais pesa. Em Abadom, dizem, estão muitos dos seus seguidores; nas Cidades-Estado e em Verrogar, escravos firmam pactos em busca da liberdade e trocam o senhor mortal por um pior.' },
    ],

    feriados: [
      { dia: 21, mes: 5, nome: 'Noite dos Esquecidos',
        texto: 'Enquanto os devotos de Cambu pedem prosperidade, os esquecidos, os que se creem longe da graça dos deuses, buscam poder e glória em pactos com o Senhor das Correntes. Muitos firmam contrato nessa noite ou prorrogam o seu, e trazem outros para firmar os deles. Seinoniz não se agrada de sacrifícios, pois a alma de quem não é devoto vale menos que a de um contratante; o que o agrada é o pacto voluntário.' },
    ],

    itens: [
      { nome: 'Correntes da Maldição',
        texto: 'Uma algema de mão ou de pé com uma corrente curta de poucas argolas, que dá ao demonista o domínio da vítima. Quando desperta, as argolas ganham um brilho fantasmagórico, e uma corrente fantasma se estende até se perder no horizonte, ligando o escravo a quem o escravizou.' },
      { nome: 'Chama Infernal',
        texto: 'O fogo das lanternas do culto, guardado no altar dos templos. Deixa o demonista ver os espíritos dos homens e mulheres que um dia fizeram pacto com Seinoniz e conjurá-los como servos por seis dias, quantas vezes quiser.' },
    ],
  },
  {
    slug: 'udoviom',
    nome: 'Udoviom',
    classe: 'principe',
    titulo: 'Senhor da Pestilência',   // os outros epítetos (Mestre das Pragas, Degradador da Vida) estão na descrição
    imagem: null,
    // Fonte: principes.pdf, págs. 93–97 (3.12 Udoviom, com O Guardião Alcrinontes); Antredom (3.2) e Vouxiz (3.13).

    prefacio: {
      texto:
        'Sentado na sua sala, com os filhos aos pés, Virnus pensava em como era bela a cidade de Franges no seu tempo de menino, com o orgulho que o povo tinha dos antepassados, ainda cantado nas músicas e nos discursos. A peste chegou sem aviso e levou centenas num só dia. Outras centenas fugiram de noite e encontraram a morte nas estradas, até que a guarda real veio cercar a cidade, e quem tentava sair morria sob as flechas dos sitiadores.\n' +
        'No primeiro mês do cerco, Virnus perdeu a irmã pequena. Em dois meses os armazéns estavam vazios; no seguinte, os sobreviventes comeram os animais, e nem ratos se viam mais. Esquelético, ele revirava as ruínas atrás do que levar para casa; o couro velho de um dia parecia saboroso depois da terra que comera na véspera. Muitos passaram a comer carne podre e as larvas das próprias feridas, e os vermes que vomitavam. Viraram cacófagos, e eram violentos. O menino aprendeu a se esconder ao menor som de passos, e isso o salvou mais de uma vez.\n' +
        'Uma noite, pouco depois de um bando deles passar, um grito ecoou. Arrastando-se entre as pedras, Virnus viu diante do grupo uma sombra viva, feita de centenas de insetos e bichos peçonhentos, que gesticulava e ria. Os cacófagos se contorciam no chão; abriam-se feridas, saíam larvas, até que os corpos explodiam e soltavam outras centenas de criaturas, que se juntavam à sombra. Virnus fugiu e nunca mais voltou ali. Quando o cerco se abriu, foi com os sobreviventes viver na nova cidade de Ambernita.',
      fonte: 'Extraído de O Livro de Maudi, do capítulo «A Epidemia da Cidade de Franges» — Biblioteca de Saravossa.',
    },

    descricao:
      'Senhor da Pestilência, Mestre das Pragas, Degradador da Vida: para o povo de Tagmar, Udoviom é um dos príncipes mais terríveis, não pelo número de adoradores, mas pela frequência com que age. Nos campos fartos traz as pragas e a podridão. Nas cidades, nem os sacerdotes bastam, e do plebeu ao duque, e até ao rei no conforto do castelo, ninguém está a salvo quando ele vem visitar.\n' +
      'Não é só a doença: é também a poluição e a ruína da natureza, o oposto dos sacerdotes de Maira, que ensinam aos homens a pureza das coisas. A menor presença dele deixa a vegetação comida, a terra e os rios envenenados, bichos e gente tomados pelas piores doenças, os corpos transbordando de vermes, para matar qualquer esperança de que os devotos de Maira curem a humanidade da sua ambição de crescer sempre.\n' +
      'Nasceu no estômago de Antredom. Ao longo das eras, as miríades de demônios e almas que o Príncipe da Fome devorou ganharam ali uma consciência; o pai percebeu e nunca a libertou, mas ela tomou nome próprio, esperou a hora e escapou.\n' +
      'É paciente e cuidadoso, e busca a destruição lenta dos filhos dos deuses por meio das pestes. Mede as palavras e nunca revela o que pretende antes que seja tarde demais para desfazer.\n' +
      'Antes dele chega um fedor tão forte que derruba desmaiados os de faro mais fino. Depois surge uma turba de insetos e bichos fedorentos amontoados, que fala, entre zumbidos e outros ruídos, palavras que todos entendem com perfeição. Dizem que a sua fraqueza é a água pura e virgem. Seu símbolo são seis linhas entrelaçadas, cada par quase fechando um círculo: a praga, a podridão e a destruição da criação dos deuses. Sua cor é o verde-oliva, um verde escurecido, como o de algo que está perdendo a vida.\n' +
      'Toda doença mortal que vira epidemia é festa para os seus seguidores, que tratam de levá-la a terras novas, nem que eles mesmos tenham de carregá-la. Onde ele se manifesta, estouram surtos que adoecem gente, bichos e plantas, e muitos dos tocados têm acessos de loucura e fúria. O culto cresce nas estradas desertas de Luna e nas cidades abandonadas, onde o seu nome é sussurrado longe das patrulhas. As doutrinas são três: a destruição da carne, a disseminação das pragas e a dor aos hereges.\n' +
      'Os templos são retangulares, com a entrada num dos lados menores e o grande altar no outro, e colunas cravejadas de crânios. Ali vivem multidões de insetos, ratazanas e outros bichos pestilentos, venerados como a presença do Senhor. Entre o portão e o altar ficam os demonistas, os chacais e pilhas de cadáveres apodrecendo; nas paredes, afrescos do símbolo e as palavras «Peste de Franges». No centro do altar arde uma pira de chamas profanas, alimentada com as sobras dos sacrificados. Em volta dela, crianças e mulheres de gravidez adiantada pendem de ganchos e correntes, untadas de um creme que os demonistas preparam para atrair as pragas, e as moscas as devoram ainda vivas. A preferência por gestantes e crianças é a aversão de Udoviom pela vida.\n' +
      'Os devotos vestem túnicas verde-oliva de capuz e mangas longas, com o símbolo bordado em linha branca nas costas, e levam nos ombros insetos, ratos e outros bichos pestilentos.\n' +
      'Seu reino é o nono do Inferno, morada dos condenados pela contaminação da carne e do espírito e destino dos Chacais e de quem espalha doença de propósito. É um vale de pedra sem saída, coberto de lodo, onde chove sem parar. Um portão de madeira podre leva a Crinato, que lembra as vilas do campo, com casebres, moinhos e estábulos, cercada de lavouras comidas por insetos e de gente febril, coberta de escaras, agonizando pelas ruas. O palácio é o tronco colossal de uma árvore morta, com crianças, mulheres e fetos expostos nas paredes como troféus. A cidade é a afronta perfeita a Maira, e ali a única coisa proibida de morrer é o juízo dos condenados, que devem provar todo o terror dos seus pecados.\n' +
      'O guardião é Alcrinontes, o Contaminador: alto, magro e nu, exibe com orgulho as bolhas inflamadas, tem um lado do rosto roído por bicheira do queixo ao pescoço, mãos de garras longas e dois pares de asas de mosca rompendo as costas, e leva no ventre aberto um feto que carrega todas as pestes. Em vida foi médico e devoto de Maira, e curava de vila em vila sem cobrar um cobre. Quando a esposa grávida morreu de uma febre que ele não soube vencer, e a deusa não respondeu às suas preces, abriu o corpo dela, tirou o filho ainda pulsando e cortou o próprio ventre para guardá-lo ali. Morria quando uma voz como zumbido de enxame mandou que se levantasse. Viveu mais algum tempo, deixando a peste por onde passava, e no fim Udoviom o chamou e fez da sua obra-prima o seu braço direito.',

    relacoes: [
      { nome: 'Maira',
        texto: 'Tem ódio profundo por ela e por tudo o que ela criou, e ao mesmo tempo se deleita em trazer-lhes o pavor das suas pestes. Crinato é uma afronta à deusa, e o seu guardião foi um devoto dela.' },
      { nome: 'Antredom',
        texto: 'O pai, em cujo estômago nasceu da consciência das almas e demônios devorados. Antredom nunca o quis livre, e Udoviom evita a sua presença maldita.' },
      { nome: 'Vouxiz',
        texto: 'A meia-irmã, também nascida do estômago de Antredom, tem com ele uma relação doentia: vê-o como rival e atiça sempre a rixa entre ele e o pai.' },
      { nome: 'Mocna e Morrigalti',
        texto: 'Odeia os dois pela devastação que causam, que mata depressa demais. Ele prefere a morte lenta.' },
      { nome: 'Ricutatis',
        texto: 'Prefere, como ele, os métodos lentos e sofridos, mas sem tantas frescuras: tem-no por um pomposo que não merece a fama que tem.' },
      { nome: 'Descendentes',
        texto: 'Os Chacais de Franges, humanos que a peste transformou no corpo e na mente, e que sobreviveram ao cerco vomitando os vermes do estômago para comê-los, com as larvas das próprias chagas. São crias suas e arautos da Peste de Franges: com uma mordida ou um arranhão passam-na adiante, e a vítima vira Chacal ou morre em menos de três dias.' },
    ],

    locais: [
      { nome: 'Crinato', onde: 'Inferno, nono reino',
        texto: 'A cidade da contaminação, num vale de pedra sem saída, coberto de lodo e de chuva, atrás de um portão de madeira podre. Parece uma vila do campo de lavouras comidas, com o palácio no tronco de uma árvore morta. Guarda-a Alcrinontes, o Contaminador.' },
      { nome: 'Galerias do castelo real de Franges', onde: 'Franges',
        texto: 'O principal templo de Udoviom, sob o castelo de uma cidade hoje quase abandonada. Só um em cada dez dos antigos moradores ainda vive dentro dos seus limites, e a maioria enlouqueceu com a peste.' },
      { nome: 'Estradas desertas de Luna', onde: 'Reino de Luna',
        texto: 'A região onde o culto mais age. Nas estradas vazias e nas cidades abandonadas, longe das patrulhas, o nome dele é sussurrado e a fé cresce.' },
    ],

    feriados: [
      { dia: 15, mes: 11, nome: 'Dia da Contaminação',
        texto: 'O dia em que começou a peste de Franges. Os sobreviventes que ainda vivem na cidade, quase todos enlouquecidos pela doença, reúnem-se para saudar o demônio, certos de serem os escolhidos que não perecerão na terra da peste. Pelo resto de Tagmar, os fiéis marcam encontro em lugares abandonados para ritos macabros.' },
    ],

    itens: [
      { nome: 'Manto de Udoviom',
        texto: 'Manto profano que deixa o demonista mandar nos insetos, que se juntam sobre ele numa armadura espessa contra golpes de qualquer arma, mas frágil diante do fogo. A mesma massa de insetos pode atacar o adversário e lhe atrapalhar a defesa.' },
      { nome: 'Amuleto dos Sentidos Profanos',
        texto: 'O amuleto da casa de Udoviom liga a mente do demonista a insetos e outros bichos pestilentos da região, e ele vê e ouve tudo o que se diz ali. Não os comanda nem os manda a lugar algum, mas ganha centenas de olhos e ouvidos.' },
    ],
  },
{
    slug: 'vouxiz',
    nome: 'Vouxiz',
    classe: 'princesa',
    titulo: 'A Névoa Gananciosa',
    imagem: null,
    // Fonte: principes.pdf, págs. 99–104 (3.13 Vouxiz, com O Guardião Berzeu); Antredom (3.2) e Heldrom (3.7).

    prefacio: {
      texto:
        'Uma ave noturna levanta voo, assustada, quando os irmãos Belis, Jagal e Frismar passam correndo pelo mangue. Sete noites antes, Frismar, gatuno de cidade, roubara de um grupo de pretensos heróis um mapa e uma pedra encantada que apontavam o Colar de Vou. Bastava entregá-los a quem o contratara. A cobiça falou mais alto, e ele convenceu os irmãos a buscar o colar.\n' +
        'Agora Jagal corre e jura para si mesmo que tesouro nenhum vale aquilo. Uma névoa viva os persegue. Escaparam uma vez porque ela não pôde cruzar o alagado e teve de dar uma volta enorme, mas já se ouvem de novo os gritos que saem de dentro dela. Frismar, o mais velho, leva nos braços o baú com o colar. Entre as árvores surgem os muros de Uno, e atrás deles a névoa avança contra o vento.\n' +
        'Jagal e Belis alcançam os portões, e um sacerdote de Ganis lança um pequeno frasco na soleira. Belis estende a mão ao irmão; atrás dele, a névoa ganha forma de mãos espectrais. Frismar salta. A névoa o agarra antes do portal e o arrasta para longe, e o grito dele enche a noite até sumir. Os dois que ficaram choram sentados na entrada.',
      fonte: 'Extraído de O Livro de Maudi, do capítulo «A Névoa» — Biblioteca de Saravossa.',
    },

    descricao:
      'Vouxiz é uma titã-segunda, mas não nasceu como as outras, da união de deuses e demônios. É a filha que Antredom gerou no próprio estômago, com uma parte da essência do titã Ar e um pouco do sangue de Ganis, roubado quando a deusa sangrou em luta contra os titãs. Do titã herdou o domínio dos ventos e o gênio impetuoso; da deusa, o poder de criar e moldar névoas e brumas; do pai, a fome e o dom de transformar em poder tudo o que come. A fome virou ganância, e a ganância se voltou para os reinos dos deuses: ela quis ficar mais forte que eles absorvendo-os.\n' +
      'Mirou primeiro em Ganis. Se de uns respingos de sangue tirara o poder das brumas, pensou, de mais que isso despertaria muitos outros. Passou a devorar as ninfas e as enviadas da deusa, e a cada uma ficava mais bela e mais forte, a ponto de levantar tempestades. Ganis deu pela falta das filhas e, com a ajuda de outros deuses, amaldiçoou Vouxiz e a baniu para o Inferno. Entre os demônios do seu reino se sussurra que a nova ambição dela é ser rainha dos treze reinos infernais.\n' +
      'Muda como o vento: ora esquiva e melindrosa, ora colérica e impetuosa. Persegue sem trégua quem a ofendeu ou a enfrentou. Quando quer algo, às vezes age por compulsão, agressiva e descuidada; outras vezes arquiteta tramas com frieza e manipula os outros com provocações e melindres. Numa disputa, com demônios ou com deuses, gosta de virar as palavras do adversário contra ele, torcendo o que ele quis dizer.\n' +
      'Sua forma também é inconstante. A mais conhecida é a de uma névoa densa e gelada que toma um contorno vagamente humano, cheio de dentes, garras e olhos de escuridão, paródia malfeita de um paraelemental da névoa. Furiosa, revolve-se num furacão demoníaco. Dizem que, antes da prisão, parecia uma ninfa alada, bela e pálida, de pele de escamas azuis e asas de plumas brancas, e que ainda assume essa forma quando quer seduzir alguém.\n' +
      'Tem três símbolos: um olho sobre um V; três espirais dentro de um triângulo, a sua luta contra a prisão; e um olho dentro de uma espiral de três voltas, a cobiça, a ambição e a ganância. Sua cor é o azul-escuro.\n' +
      'Age em descampados e ermos, de preferência em florestas distantes e sombrias, e só à noite. É cultuada também em picos de montanha, e povos primitivos a tomam por uma deusa dos ventos. Seus devotos crescem nas regiões costeiras, dizendo que é a graça dela que traz de volta para casa, a salvo, quem viaja além-mar. Ela se alegra com a destruição: vórtices de vento na costa de Porto Livre, tempestades de areia na Levânia, gelo arrancado pelas tormentas no pico de Prussel. Onde passa, os ventos e as névoas deixam desastres, desaparecimentos e mortes.\n' +
      'O templo é sempre amplo, às vezes a céu aberto e em lugar isolado: um grande altar de pedra cercado de dezoito estrelas, cada uma mais alta que um homem e dividida em três partes entalhadas de símbolos profanos. Ali se fazem os sacrifícios, e alguns dos «filhos» da princesa aparecem em forma de humanoides de vento. Os cultistas vestem mantos azuis de camurça com capuz e levam incensários onde queimam ervas profanas para atrair e dar corpo a esses filhos. Podem exibir adornos de ouro, prova da prosperidade que a ganância lhes trouxe.\n' +
      'As doutrinas são cinco: cobiçar o próximo, ambicionar o impossível e agir com ganância, pois assim vem a prosperidade; lembrar que quem não cobiça é cobiçado, quem não ambiciona não anda e quem não é ganancioso não vence; guardar todo ano a Noite da Cobiça e os Ritos das Brumas; matar sufocados os traidores do culto; corromper pela ganância os servos de Ganis e afogá-los.\n' +
      'Seu reino é o oitavo do Inferno, morada dos condenados pela ganância, onde as almas são sufocadas de todos os modos e os ventos sopram ora muito quentes, ora muito frios. O portal fica no alto do céu, sobre um lago imenso e fundo. A queda livre, que dura de horas a dias conforme o pecado, é o primeiro tormento; no lago, as almas se afogam, puxadas umas pelas outras e pelos demônios. Quem escapa chega a uma floresta que a bruma toma de repente, e ali os demônios caçam os perdidos e os enforcam em cipós, pendurados como isca para os companheiros.\n' +
      'Depois vem Garfiniane, uma torre de topo invisível cercada de ruínas e de um muro baixo. Nas vielas, os demônios obrigam as almas a erguer casas de pedra e madeira tão às pressas que desabam sobre quem está dentro, e outras se erguem por cima dos soterrados. A última provação é a escada em espiral da torre, que parece não ter fim e sufoca de cansaço e de altura; por janelões entram criaturas que derrubam os que ainda têm forças, para que recomecem. Vouxiz e os seus demônios se alimentam desse sofrimento. Quando nada mais resta a tirar, a alma chega ao Salão das Brumas, no topo, onde a princesa a devora num banquete e com o que sobra gera demônios, elementais e paraelementais para o seu exército.\n' +
      'Há ermos onde os fugitivos se perdem em nevoeiros cheios de armadilhas, sob o riso dos demônios, e ilhas voadoras com os covis dos servos: as dos mais importantes giram em volta da torre, e quanto mais fraco o servo, mais baixa a ilha. Habitam o reino demônios como sereias de grandes barbatanas nas costas à guisa de asas, demônios alados, elementais do ar, crias do vento, paraelementais da névoa e cruzamentos bizarros de harpias e feratus. O guardião da cidade é Berzeu, um cavaleiro esquelético num cavalo horrendo, de calça de malha de aço sob uma saia longa e negra, dorso nu tatuado, colar de ossos, espada prateada imensa e buracos no lugar dos olhos. Em vida foi líder militar das Tribos do Sul; saqueava as vilas vencidas e sacrificava crianças a deuses desconhecidos em troca da vitória seguinte, e diziam que via o futuro. Matou-o a guerreira Ismiria, devota da deusa das águas, que acabara de dar à luz: quase vencida, arrancou-lhe os olhos com os dedos e o acabou com uma adaga de prata.',

    relacoes: [
      { nome: 'Ganis',
        texto: 'A mãe involuntária, de cujo sangue Vouxiz tirou o poder das brumas. Foi Ganis quem a amaldiçoou e a baniu, depois que ela devorou as suas ninfas e enviadas. A rixa pesa mais que a nova ambição: Vouxiz se alia a qualquer príncipe contra os deuses, desde que a ajude a derrotar a deusa. Seus sacrifícios são por afogamento, em escárnio a ela.' },
      { nome: 'Os deuses',
        texto: 'Quis absorver os reinos deles para se tornar mais poderosa que todos. Com a ajuda de vários, Ganis a baniu para o Inferno.' },
      { nome: 'Ar',
        texto: 'O titã de cuja essência ela nasceu em parte. Dele herdou o domínio dos ventos e a personalidade impetuosa.' },
      { nome: 'Antredom',
        texto: 'O pai, que a gerou no próprio estômago. A relação é fria. Às vezes ela o convida para banquetes no seu reino, coisa que ele, avaro, nunca ofereceria no dele; talvez para manter o vínculo e reforçar o direito de herança, de olho em somar um dia o reino do pai aos seus.' },
      { nome: 'Udoviom',
        texto: 'O meio-irmão, nascido também no estômago de Antredom. A relação é doentia: ela o vê como rival e atiça sempre a rixa entre ele e o pai.' },
      { nome: 'Os Príncipes Infernais',
        texto: 'Já não quer o mundo dos Filhos dos deuses, mas o próprio Inferno. Só faz alianças por conveniência e por pouco tempo, e só para derrubar outro príncipe e crescer com a queda dele.' },
      { nome: 'Morrigalti',
        texto: 'Vê na prisão dele em Âmiem a chance de alargar os seus domínios, e prepara um exército de criaturas para invadir o reino dele. Para formá-lo sem gastar a própria energia, consome as almas dos condenados que já não rendem tormento.' },
      { nome: 'Heldrom',
        texto: 'Com ele, Seinoniz e Diatrimis, Príncipes de origem não demoníaca, Vouxiz negocia planos em comum.' },
      { nome: 'Descendentes',
        texto: 'As Crias dos Ventos, névoas amaldiçoadas que vagam por pântanos e bosques e tomam o corpo de quem morreu afogado, de preferência crianças e mulheres, por escárnio a Ganis. Perto da água, gritam por socorro, afogam quem vem ajudar, consomem a alma e trocam de corpo. Das almas dos condenados ela gera ainda demônios alados, elementais do ar e paraelementais da névoa; aos demônios de posto mais alto deu, como prêmio, o poder de virar névoa ou ciclone.' },
    ],

    locais: [
      { nome: 'Garfiniane', onde: 'Inferno, oitavo reino',
        texto: 'A cidade-torre de Vouxiz, de topo que não se vê, cercada de ruínas e de barracos que desabam sobre os condenados. No alto fica o Salão das Brumas, onde a princesa devora as almas; à volta flutuam as ilhas dos seus servos. Guarda-a Berzeu.' },
      { nome: 'Templo das Dezoito Estrelas', onde: 'Região dos Mangues, Terras Selvagens',
        texto: 'Tido por muitos como o lugar mais sagrado do culto. Entre ruínas, dezoito estrelas de pedra, mais altas que três homens, cercam uma mesa de pedra com uma pequena caixa no centro.' },
      { nome: 'Costa e rios do Denégrio', onde: 'Lago Denégrio, interior de Calco',
        texto: 'Onde o culto é mais ativo. Os cultistas levantam nevoeiros densos para que os seguidores de Ganis se percam.' },
      { nome: 'Porto Livre', onde: 'Porto Livre',
        texto: 'Na costa, Vouxiz levanta vórtices de vento. Corre o rumor de que alguns navios piratas da cidade são tripulados por seguidores dela.' },
    ],

    feriados: [
      { dia: 3, mes: 2, nome: 'Ritos das Brumas',
        texto: 'Uma festa de prosperidade que é, no fundo, louvor à ganância. Cada um faz em segredo um desejo de ambição e conta quais das do ano anterior alcançou; depois escrevem as novas e as lançam num caldeirão, e dele evocam brumas que cobrem a caça às vítimas. No fim da noite, elas são afogadas em escárnio a Ganis. Só os que trazem mais sacrifícios ganham a bênção da prosperidade por um ano, e são revelados ao amanhecer, quando as brumas se recolhem em volta deles.' },
      { dia: 8, mes: 5, nome: 'Noite da Cobiça',
        texto: 'Os seguidores dizem o nome dos seus rivais e o que cobiçam deles, e fazem pactos com servos de Vouxiz para prosperar à custa dos marcados. Os servos cobram algo em troca, conforme o tamanho do pedido.' },
    ],

    itens: [
      { nome: 'Colar de Vou',
        texto: 'Um colar de pérolas negras com um dos símbolos de Vouxiz gravado no centro, achado nas guerras contra a Seita. Contam que os servos da princesa que o usavam levantavam ventos fortíssimos, muitas vezes ciclones.' },
      { nome: 'Laço do Enforcado',
        texto: 'Usado há gerações pelos maiores cultistas para sacrificar as vítimas dos ritos. A uma ordem, dá um bote como cobra e se enrola no pescoço de alguém. Dizem que com os séculos ganhou vontade própria, ou que um servo da princesa o possui.' },
      { nome: 'Incenso da Névoa',
        texto: 'Um incensário que, com ervas profanas e balançado ao som de cânticos, solta um nevoeiro que vai para onde quer quem o balança. As lendas dizem que piratas devotos de Vouxiz o usaram para chegar perto das presas sem ser vistos e para despistar perseguidores.' },
      { nome: 'Caldeirão das Brumas',
        texto: 'Um caldeirão de prata que a própria Vouxiz abençoou para um grande cultista Bankdi. Evoca brumas em qualquer noite do ano, e não só no rito anual; com o sacrifício adequado, chama um paraelemental da névoa ou um elemental do ar que serve ao cultista por um dia inteiro.' },
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
