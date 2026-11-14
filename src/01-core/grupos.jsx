/* ============================================================
   GRUPOS — colégios de magia (e o que vier depois) de Tagmar (13/11/2026)
   ============================================================
   Usuário: "Crie um novo grupo chamado 'Grupos' e faça a construção dos
   colégios de magia." É a página irmã de Entidades na Ambientação: o mesmo
   catálogo do mundo, no código e não no banco, igual para Mestre e Jogador.
   O texto sai de tagmar/colegios.pdf, reescrito pela skill
   cronista-de-tagmar (.claude/skills/).

   `tipo` diz que grupo é (colégio de magia agora; uma ordem sacerdotal,
   uma guilda depois). Os tópicos seguem os capítulos do livro: Epígrafe,
   Prólogo (prefacio), Descrição, História, Locais, Símbolos, Objetivos,
   Admissão, Ética, Organização, Lideranças e Rumores. Tópico que o livro
   não traz fica fora do objeto — a janela só desenha o que existe.

   Texto: cada "\n" é um parágrafo (a mesma regra das Entidades; sem
   Markdown). `fonte` é a assinatura em itálico no fim do prólogo.
   ============================================================ */

const GRUPO_TIPOS = {
  colegio: { pt: 'Colégio de Magia', en: 'College of Magic' },
};

const GRUPOS = [
{
    slug: 'alquimico',
    nome: 'Colégio Alquímico',
    tipo: 'colegio',
    titulo: 'Transformação',
    imagem: null,
    // Fonte: colegios.pdf, págs. 8–12 (cap. 2).
    epigrafe: {
      texto: 'Nada na vida é imutável; tudo está em transformação. O segredo é não perder o rumo: cada busca é também um encontro. O mundo que vemos é só o reflexo do espelho que retrata o mundo verdadeiro, e para entender essa ambiguidade basta mergulhar nele. Nem é preciso entendê-lo: contemple a energia que o envolve, e verá as maravilhas da criação.',
      autor: 'Astar, o Inquieto',
    },
    prefacio: {
      texto:
        'Gilius ainda era menino quando seguia o pai, sacerdote de Parom, ao laboratório de um mago de pele curtida de sol e olhos verdes muito vivos. Entre a vidraria, que deformava os vultos, havia homúnculos crescendo em esterco de cavalo, metal derretido correndo como água por tubos gelados e, sobre tudo, uma espada enorme, feita do ferro de uma pedra caída do céu. O mago a chamava Kronagar e a moldava para Arlam, o Corvo da Tempestade.\n' +
        'Muitos anos depois, o anão velho treinava guerreiros, e um deles, Victor Ibendraco, neto de Arlam, enterrou Kronagar no coração ardente de um Senhor do Caos. A lâmina partiu-se. Arlam soube curar o neto com as suas ervas, mas não a espada. Numa noite de chuva, Astar bateu à porta com o mesmo sorriso de sempre e olhou a lâmina fendida: «Vocês, povos das montanhas, não souberam cuidar com carinho da minha menina.»\n' +
        'Ele despejou poções luminosas sobre os pedaços, numa cratera aberta na rocha, e o caldo se inflamou num calor que nenhuma forja conhece. Gilius quis saber se não doía ver o fim de obra tão bela. «Tristeza não é a palavra. Eu diria saudade. Ela se quebrou porque não era forte o bastante; precisava morrer e renascer.» A espada voltou mais dura e mais bela, Arlam prendeu nela uma tempestade furiosa, e Astar proibiu o nome antigo: «Kronagar teve o seu tempo e uma morte digna. Contemplem Fende-Tormentas.»\n' +
        'Depois piscou para o anão, como fazia quando o menino lhe quebrava os frascos, e sumiu na escuridão, de volta aos seus caldeirões.',
      fonte: 'Das memórias de Gilius, mestre de armas — Biblioteca de Saravossa.',
    },
    descricao:
      'Nada fica: num mundo em movimento, força e forma se juntam e se separam, e de cada separação nasce outra forma. Os magos alquímicos reconhecem esse poder e se especializaram em governar os caminhos da mudança. Sabem prolongar a duração de uma forma, firmar o líquido em sólido, tornar o sólido tênue como névoa.\n' +
      'O domínio completo da transformação é o que o Colégio procura.',
    historia:
      'O Colégio Alquímico é uma confraria antiquíssima e discreta de magos que conhecem a Arte, o Mistério da Transformação. Contam as lendas da ordem que Parom entregou a Arte a Adamus Cadimom, um dos primeiros e mais sábios homens, para que a ensinasse aos irmãos e os protegesse dos entes da noite e dos perigos do mundo ainda jovem. O que Adamus aprendeu, a Ciência da Transubstanciação, era apenas a irmã menor da Arte que os deuses praticavam.\n' +
      'Os alquimistas guardam dezenas, talvez centenas, de lendas sobre os castigos que Parom teria sofrido por dar ao homem esse segredo. A versão mais aceita no Colégio diz que Blator, o Campeão Divino, se pôs entre Parom e o seu destino, em gratidão ao carinho que o deus tinha pelos anões, e sofreu no lugar dele as punições exigidas pelo Panteão. De cada chaga de Blator teria nascido uma letra do alfabeto rúnico que anões, sacerdotes de Blator e alquimistas ainda partilham.\n' +
      'Entre os alquimistas corre também a fábula do bondoso Parom: os elfos haviam recebido de Palier a longevidade e a sabedoria, os anões de Blator a força e a astúcia, e o homem nada tinha contra os entes da noite. Parom, que já não falava com Palier, deu-lhe a Arte Suprema. Com ela o homem fez ouro de metal vulgar, prolongou a vida e acendeu um fogo que afasta as criaturas das trevas. Mas só quem purifica o coração nos fornos do laboratório da vida pode receber, guardar e passar adiante os seus mistérios.',
    locais: [
      { nome: 'Igna', onde: 'Vulcão Forja',
        texto: 'A sede do Colégio, no ventre do vulcão: uma construção magnífica sobre rocha, suspensa por correntes grossíssimas e longuíssimas, presas às paredes de pedra do coração fumegante do Forja. Os grandes alquimestres dizem que muitas misturas só se fazem ali, naquele calor infernal. O lugar é escondido a todo custo, porque os senhores das terras dos anões têm horror fanático a qualquer magia que não venha dos deuses.' },
      { nome: 'Talco', onde: 'Âmiem',
        texto: 'A filial de maior destaque fora de Igna, que mantém laços com o Alto Conselho élfico e com a Ordem dos Runcains. Conta-se que guarda um calabouço secreto de objetos encantados.' },
      { nome: 'Saravossa', onde: 'Calco',
        texto: 'Uma das filiais mais importantes do Colégio.' },
      { nome: 'Palácio dos Mestres da Alquimia', onde: 'Telas',
        texto: 'O segundo maior centro de estudos alquímicos do mundo conhecido.' },
    ],
    simbolos:
      'O símbolo maior do Colégio é a Fênix envolta em chamas, sobre a divisa em letras góticas «Solve e Coagula». Para os alquimistas não é a mesma ave que renasce das próprias cinzas, mas um animal novo, mais resistente, belo e puro, nascido de uma transformação consciente. A divisa diz o que fazem: dissolver o velho para coagular o novo, mais puro e mais durável.',
    objetivos:
      'O alvo maior da Arte é dominar todos os mistérios da transformação para governá-la da melhor maneira. Todo alquimista sabe que a mudança é inevitável e que cedo ou tarde o velho cede lugar ao novo; o que ele faz é criar formas cada vez melhores e mais fortes. Isso vale também para o próprio corpo, e boa parte das poções que rejuvenescem, regeneram ou prolongam a vida saiu das mãos dos alquimistas.\n' +
      'Quando a morte chega, porém, é recebida como uma transformação sadia: o descarte do que já não serve e não se conserta, para que surja o novo, melhor e livre das mazelas do corpo velho.',
    admissao:
      'Como em toda escola de magia, são bem-vindos os postulantes dedicados, sagazes e de talento. Mas quem quer se dar à Alquimia precisa aceitar a mudança como coisa natural e necessária, e por isso se aprecia um certo desapego. Bens vêm e vão, amigos morrem e outros aparecem; nada disso deve atravessar o caminho de quem sabe que a única constante do mundo é a transformação.\n' +
      'Como entre os necromantes, há no Colégio um forte predomínio de humanos. Talvez por viverem tão pouco diante dos elfos, eles abracem com mais gosto os ideais de mudança; e são, sem dúvida, os que mais ganham com as descobertas que alongam a vida.',
    etica:
      'O alquimista deve seguir o vaivém incessante da vida e aprender com as suas idas e voltas, forjando e reforjando o próprio saber e a própria visão do mundo, em busca de resultados cada vez mais duráveis, no corpo, na mente ou na magia. A durabilidade é a marca do que se adapta e serve ao mundo.\n' +
      'Alguns leigos, e muitos magos ignorantes ou mal-intencionados, confundem a busca alquímica pelo prolongamento da forma e da vida com uma sede de imortalidade da carne, aquela que às vezes acaba em vampirismo ou em coisas ainda mais aberrantes, como o necroarcanismo. É um engano lamentável: para esses magos a morte é uma transformação como as outras, e nenhum deles se recusa a ela quando o corpo já não tem como se manter. «Todas as coisas se vão, e tudo retorna do eterno caldeirão universal», dizem.',
    organizacao:
      'Reconhecido como alquimista, o mago é livre para seguir os seus estudos e experiências como bem entender. Para receber o título de Alquimestre, porém, precisa voltar a Igna e enfrentar as provas dos Alquimestres que ali residem: em geral, análises alquímicas complexas e a feitura de poções de grande poder, que cobram caro por qualquer erro.\n' +
      'O novo Alquimestre recebe um anel de rubi onde se engasta, por magia, o seu nome em letras rúnicas. O nome brilha quando o dono o pronuncia, e só ele; até hoje é o meio infalível de desmascarar impostores, mesmo os disfarçados por encanto.\n' +
      'A única ordem formal do Colégio é a que governa e mantém Igna, nas mãos do Alquimestre-Mor. Ao contrário da maioria dos colégios, o cargo é eletivo: o mandato dura sete anos e a reeleição não tem limite. Só Alquimestres podem se candidatar, mas vota qualquer membro que esteja em Igna no dia da eleição. Costuma o eleito cercar-se de um séquito dos que o ajudaram a vencer, repartindo entre eles os postos de governo de Igna.',
    liderancas: [
      { nome: 'Astar, o Inquieto', cargo: 'Alquimestre-Mor',
        texto: 'Depois de muito tempo longe da política do Colégio, «vagando um pouco por este belo mundo», como gosta de dizer, voltou a Igna e foi eleito Alquimestre-Mor mais uma vez, trazendo saberes e métodos novos para a velha casa. Ao contrário do costume, não se cercou de aliados: chamou para o conselho muitos magos que votaram contra ele, todos de talento inegável, e uniu de novo rivais políticos e até desafetos pessoais. Muitos dizem que encarna o próprio espírito do Colégio.' },
      { nome: 'Crestomatus', cargo: 'Mestre de Pesquisa',
        texto: 'Apoiou o candidato derrotado, mas Astar o chamou para presidir os trabalhos de laboratório pelo seu temperamento metódico e pelo gosto do estudo erudito. Tem certa antipatia pelo jeito expansivo e às vezes imprevisível do Alquimestre-Mor, mas nunca negou que o Colégio sempre prosperou sob o comando dele.' },
      { nome: 'Alana', cargo: 'Mestra de Neófitos',
        texto: 'Meia-elfa, amiga de Astar de longa data. Sempre se deu ao ensino, mesmo antes de responder pela formação dos magos admitidos. Ao contrário do Alquimestre-Mor, é conhecida pelo temperamento calmo e contido.' },
      { nome: 'Daniel', cargo: 'Ecônomus',
        texto: 'O ecônomus administra os recursos de Igna, cargo de grande responsabilidade. Este elfo dourado vive há muitos anos sobre a lava do Forja, serviu em postos diferentes sob vários governos e nunca quis ser Alquimestre-Mor.' },
      { nome: 'Marcos Calisto, o Etéreo', cargo: 'Diretor do Colégio em Âmiem',
        texto: 'Ninguém sabe ao certo a sua idade, mas é tido como um ancião da terra. Chegou a Âmiem algum tempo depois das primeiras levas de viajantes, atraído pelos relatos da riqueza do território, e tem assento no Alto Conselho élfico.' },
    ],
    rumores: [
      { nome: 'Missões secretas',
        texto: 'Muito se murmura sobre o verdadeiro motivo da volta de Astar a Igna. Em segredo, ele convida aventureiros ao castelo sobre o Forja e os despacha para as profundezas da montanha. Ninguém sabe o que buscam, mas alquimistas da oposição já tramam infiltrar espiões nesses grupos.' },
      { nome: 'Convenção de Alquimistas',
        texto: 'Diz-se que a cada sete anos se celebra em Igna uma grande Convenção, que atrai alquimistas e magos de outros colégios de todos os Reinos, e, segundo os boatos, do Império, das Ilhas Independentes e de mais longe, até de outros mundos e planos. Na feira encontram-se os ingredientes mágicos mais diversos e coisas ainda mais raras e perigosas.' },
      { nome: 'Assassinato e roubo em Igna',
        texto: 'Um velho alquimista, recluso por muitos anos na sua torre, veio a Igna exigindo audiência com o Alquimestre-Mor e foi achado morto nos seus aposentos. O jovem pupilo, encontrado agonizando no mesmo quarto, só conseguiu dizer que o grimório do mestre fora roubado.' },
      { nome: 'Calabouço secreto',
        texto: 'Conta-se que a filial de Âmiem esconde um calabouço com a maior coleção de objetos encantados do mundo: objetos e pergaminhos de poder raro, alguns de uso desconhecido, outros talvez do Segundo Ciclo. A coleção não para de crescer, mas há quem diga que certas peças têm desaparecido.' },
      { nome: 'Exército de Animados Metálicos',
        texto: 'Um dos monarcas dos Reinos teria encomendado ao Colégio, em segredo, um exército de Animados Metálicos: há quem fale em milhares de armaduras animadas prontas para a guerra, deslocadas às escondidas em grupos de três ou quatro. Que monarca, quem dirigiu a obra e se ela de fato existe, ninguém sabe; mas o nome de Marcos Calisto já foi sussurrado mais de uma vez.' },
    ],
  },
  {
    slug: 'conhecimento',
    nome: 'Colégio do Conhecimento',
    tipo: 'colegio',
    titulo: 'A Mente',
    imagem: null,
    // Fonte: colegios.pdf, págs. 14–21 (cap. 3).
    epigrafe: {
      texto: 'Conhecimento é poder. Quem o possui está sempre muitos passos à frente. Mas onde está o verdadeiro conhecimento, e qual é a fonte da sabedoria? A resposta está em nós. Tudo o que a consciência precisa para se elevar está oculto nela mesma; basta estimulá-la a revelar o saber adormecido, que deve ser alargado e espalhado. Quem ensina aprende, e leva a si e ao irmão para mais perto do Incognoscível. Peguem as penas e a tinta, e que o conhecimento floresça.',
      autor: 'Janus Baltazar, o Sábio',
    },
    prefacio: {
      texto:
        '«O Incognoscível é mente», repetia o ancião aos aprendizes, magos de espírito afiado que só entraram depois de provas duras. «Tudo está contido nele: os deuses e os demônios, os reis e os vilões, os magos e os tolos.» No fundo da sala, o jovem Ullius Beltane pediu a palavra. Se todos, deuses e bichos, eram feitos dessa mente, e todos teriam o mesmo oblívio por destino, para que estudar a vida inteira? Os outros o olharam com reprovação. O Sábio sorriu: nada respeitava mais do que a audácia de quem procura saber.\n' +
        'Contou então a história de Atradis, último da sua linhagem, chorando sob um carvalho enquanto o castelo ardia, com a espada partida no colo e um cálice vazio nas mãos. Um infante de roupas finas, envolto num halo dourado, com uma adaga de dois gumes enfiada no cinto, perguntou por que chorava. «Nada do que perdeste era teu. Tudo o que é de fora pode ser tirado de ti; alegra-te, pois tudo o que te aconteceu só enriqueceu a única coisa que possuis.» A espada estava inteira de novo, havia hidromel no cálice, e o infante prometeu: não teria mais sede, e o bem e o mal não teriam segredos para ele, desde que nunca embainhasse a lâmina. Ao se levantar, Atradis viu que o infante era ele mesmo, e se viu também no carvalho, nas pedras do caminho, nos aldeões e nos tronos dos palácios. Por isso escreveu O Tratado.\n' +
        'Dispensados os aprendizes, o Sábio reteve Ullius e o levou ao seu escritório, coberto de livros e mapas. Sobre a mesa escura, uma folha em letra firme: um tratado para os sábios de Calco, a quem Dartel desafiava. «Você o levará até lá, e lá ficará.» O rapaz empalideceu, temendo ter ofendido o mestre. «Não é castigo. O conhecimento está em você, e o mundo pode despertá-lo. Arranjei-lhe uma cátedra: ensinará a história de antes da Seita a alguns jovens brilhantes. Dê um pouco do que tem, e o Incognoscível lhe dará mais.»',
      fonte: 'Das preleções de Janus Baltazar, o Sábio — Biblioteca de Saravossa.',
    },
    descricao:
      'O conhecimento é a chave do poder de qualquer mago. Mas há milênios uma escola de feiticeiros concluiu que ele não é meio para coisa alguma: é um fim em si, o próprio reino da onisciência e da perenidade, e deve ser alcançado a qualquer custo.\n' +
      'Essa escola atravessou as eras e é hoje o respeitado, e às vezes temido, Colégio do Conhecimento. Muitos de fora tomam os seus magos por simples filósofos e estudiosos, porque não são dados a efeitos vulgares ou espetaculares.',
    historia:
      'O Colégio funda a sua filosofia num livro antiquíssimo, que os seus estudiosos chamam O Tratado, escrito num dialeto pré-malês esquecido e obscuro. Segundo ele, um nobre chamado Atradis iniciou a Tradição do Conhecimento em tempos remotos, logo depois de uma guerra que arrasou o seu reino. Nem os maiores eruditos sabem dizer onde ficava esse reino ou de que raça era Atradis, e muitos discutem se a história é registro verdadeiro; vários magos de renome só falam do príncipe por alegorias.\n' +
      'Pacífica é apenas a doutrina. O criador de Tagmar e de todo o cosmo é uma entidade chamada Incognoscível, porque nenhuma mente mortal pode compreendê-la. Pelos Dogmas do Conhecimento, ela é eterna, sem limite e imutável, e tudo o que foi criado está contido nela. Identificam-na com a mente porque, como a mente, cria a diversidade sem perder a unidade. Os mestres ensinam que uma criatura inteligente pode se afinar com o Incognoscível acumulando saber, e então se torna uma Consciência Elevada, de poderes imensos como os dos deuses. O grande motivo dessa busca é escapar do oblívio: a anulação da pessoa que vem com a morte.\n' +
      'Os registros contam que, quando o Colégio ainda era só uma escola, alguns irmãos levantaram a questão da moral: se o conhecimento era o fim último, não deveria haver limite ético para alcançá-lo. Era grave, porque o próprio Atradis se dera ao trabalho de deixar o caminho escrito para os que viessem depois, sinal de que abandonar a moral não era exigido nem desejável. Os magos debateram por meses, até que a maioria rejeitou o abandono da moral. Os amorais deixaram a escola e passaram a ser chamados Irmãos das Sombras.\n' +
      'Não há rivalidade entre o Colégio e os Irmãos, mas uns jamais se envolvem com os outros. Os Irmãos andam com a Seita, com hereges e elfos sombrios; são criaturas pérfidas e egoístas ao extremo, que só querem preservar a própria pessoa, e todo pacto que fazem serve a esse fim. Há pouco tempo os Necromantes tiveram com eles um encontro nada amistoso, declararam-nos grigori e alvos de uma guerra de extermínio. Muitos bardos sussurram que os mais radicais do Círculo Interno querem estender o anátema ao Colégio do Conhecimento, por ter se calado tanto tempo sobre um dos grupos mais malignos de Tagmar.',
    locais: [
      { nome: 'Magna Opus', onde: 'Runa — Mirante dos Sábios',
        texto: 'O campo de estudos mais espetacular do Colégio: um castelo colossal projetado pelos próprios Mestres, no alto de um promontório que domina os arredores da cidade e que, por causa dele, se chama Mirante dos Sábios. Visto de cima tem a forma de um pentagrama voltado para o nascente. Na ponta da «cabeça» fica a Casa Capitular, com os aposentos do Grão-Reitor e dos principais Mestres que escolhem morar ali.' },
      { nome: 'Palácio dos Senhores do Conhecimento', onde: 'Telas',
        texto: 'De aspecto sóbrio, é tido como um dos lugares que guardam os conhecimentos mais secretos e poderosos.' },
      { nome: 'Saravossa', onde: 'Calco',
        texto: 'Uma das capitais onde o Colégio mantém uma instituição opulenta.' },
      { nome: 'Muli', onde: 'Muli',
        texto: 'Uma das capitais onde o Colégio mantém uma instituição opulenta.' },
      { nome: 'Senseras', onde: 'Senseras',
        texto: 'Uma das capitais onde o Colégio mantém uma instituição opulenta.' },
      { nome: 'Forte de Donatar', onde: 'Ludgrim',
        texto: 'Um antigo forte que o rei Donatar cedeu ao Colégio, desgostoso por perder Estringardi, o seu diplomata e amigo, e que virou uma das sedes da ordem.' },
    ],
    simbolos:
      'Os magos do Conhecimento são famosos pelo apego à simbologia, arte que refinaram ao longo dos milênios. Algumas chaves, porém, são fundamentais. Três cores marcam três estágios das criações do Incognoscível: o vermelho é a inércia e a cristalização, e designa as coisas do mundo físico; o azul é o movimento e a mudança, e designa as forças do espírito, sobretudo a magia; o amarelo é o equilíbrio entre os dois, a força que regula inércia e mudança, e alude à Consciência Elevada. Por isso Mestres e figuras veneradas aparecem em pinturas e afrescos com um halo amarelo, e só o Sábio veste paramentos amarelos dentro dos templos do Colégio.\n' +
      'A espada, ou qualquer lâmina de dois gumes, representa a mente que penetra o bem e o mal: os gumes são um branco e um preto, e o cabo é dourado. O emblema mais conhecido, pelo qual o mundo de fora reconhece o Colégio, são três círculos flamejantes entrelaçados, um amarelo no alto sobre um vermelho e um azul, cada um com um punhal dentro, os cabos se tocando no centro.',
    objetivos:
      'Diz O Tratado que todo ser inteligente vem da mente incognoscível e por isso pode se afinar com ela; quando isso acontece, nasce uma Consciência Elevada, pronta para a onisciência e livre da morte. Todo o saber necessário está oculto na própria consciência, mas só o trato com o mundo, também ele obra do Incognoscível, pode despertá-lo. Por isso os noviços são instigados a estudar e, sobretudo, a pôr em prática o que aprendem: cada saber se soma ao anterior, transforma-o e abre caminho a outro, que será praticado e vivido por sua vez, sem fim.\n' +
      'Os magos do Conhecimento não buscam a elevação só para si, ou não seriam muito diferentes dos Irmãos das Sombras. Passar o saber adiante é parte do caminho: «quem ensina aprende, e leva a si e ao irmão para mais perto do Incognoscível», diz O Tratado. Todo membro deve ensinar ao menos uma vez na vida, com cátedra ou sem ela. Sem espalhar o conhecimento, o Colégio perde a razão de ser.',
    admissao:
      'A busca do saber apaga qualquer outra necessidade, e o postulante deve estar pronto a deixar de lado todas as outras preocupações da vida: estudo duro, longo e dedicado é a única rotina que esses magos conhecem.\n' +
      'Como vivem para o intelecto, valoriza-se no candidato certo desapego das coisas materiais e passageiras. Tomos, bibliotecas e pergaminhos antigos não valem nada por si, só pelo que guardam nas páginas. Com os anos, o desapego e a obstinação desses magos costumam virar puro estoicismo.\n' +
      'Humanos e meio-elfos predominam. Há elfos dourados em bom número, mas nem de longe tantos quanto os seus meio-irmãos e a multidão de estudiosos humanos. Talvez pela vida reclusa em casas sombrias e emboloradas, pouquíssimos elfos florestais se juntam a esta escola.',
    etica:
      'Os mestres repetem aos discípulos: é preciso viver no mundo e para o mundo, sem jamais pertencer a ele. As tradições do Colégio querem formar mentes elevadas que tragam prosperidade a Tagmar e aos filhos dos deuses; vaidade, sede de poder ou desejo de reconhecimento não têm lugar ali. Um poderoso mago elementalista, depois de visitar uma das casas do Colégio, resumiu: «parecem todos iguais». É de propósito. A filosofia da ordem ensina que as diferenças entre os seres inteligentes nascem dos vícios, que são desarmonia, enquanto as virtudes trazem equilíbrio e levam todos aos pés do Incognoscível.\n' +
      'Acima de todas as virtudes, o mago deve cultivar a disciplina e o altruísmo. A primeira ajuda na busca da Consciência Elevada e sustenta nas horas de tormenta; o segundo o livra das armadilhas do individualismo, que o prendem ao mundo.',
    organizacao:
      'A hierarquia é rígida e formal. Cada instituição tem um Reitor, que dirige um Conselho Acadêmico encarregado de ordenar o saber a ser ensinado e de recrutar magos capazes de ensiná-lo. Todas as instituições obedecem à Magna Opus, ao Sábio e ao seu Conselho de Mestres.\n' +
      'O Sábio, Grão-Reitor da Magna Opus e de todas as casas do Colégio, é o cargo mais alto, guardião e transmissor dos ensinamentos de Atradis; com os seus Conselheiros-Mestres, traça o rumo mágico e de ensino que todos seguem. O cargo é vitalício, mas o Sábio pode se retirar quando quiser, indicando o sucessor. É costume que deixe em testamento o nome de quem o sucederá se morrer; se não o fizer, convoca-se o Capítulo, a reunião de todos os reitores, para eleger o novo Sábio.\n' +
      'As outras casas têm número variável de conselheiros; a Magna Opus tem três Conselheiros-Mestres: o Mestre Cientista, das ciências do mundo físico; o Mestre Arcano, da cátedra das conexões mágicas e das suas leis; e o Mestre Filósofo, das ciências éticas, morais e metafísicas. Abaixo deles vêm coordenadores, professores e orientadores sem conta, ordenados como convier a cada casa.',
    liderancas: [
      { nome: 'Janus Baltazar, o Sábio', cargo: 'Grão-Reitor',
        texto: 'Humano, governa o Colégio há cinquenta anos. Parece muito velho, embora ninguém saiba a sua idade, e é homem disposto e saudável. Tem humor sutil e uma rara capacidade de se pôr no lugar dos outros, e é procurado por filósofos, magos e eruditos de todo o mundo conhecido pela sabedoria e pelo imenso poder. Quase nunca sai da Magna Opus: prefere mandar emissários de confiança, escolhidos a dedo pela inteligência e pela competência. A reclusão e a idade avançada alimentam conversas sobre a sucessão, porque muitos gostariam de chegar perto dos arquivos secretos do Grão-Reitor e do poder que o cargo traz.' },
      { nome: 'Victriz', cargo: 'Mestra Arcana',
        texto: 'Meia-elfa belíssima, filha de um nobre humano de Calco e de uma elfa dourada, educada nas tradições élficas, por preceptores pagos pelo pai, nos melhores colégios do reino e na magia da família da mãe. Parece reservada e tímida, mas é vaidosa do próprio intelecto e da linhagem, e só se contém porque o Sábio reprova a ostentação. No íntimo, ressente-se de se curvar a um homem mais jovem e de origem obscura, e mais de uma vez foi chamada a conversas reservadas com ele; só não foi afastada pela competência assombrosa e pela teimosia de Janus em tirar o melhor de quem o cerca. Hoje está recolhida aos seus laboratórios, estudando o Grimorium Grigorii, tomo do Segundo Ciclo atribuído a um mago de existência não comprovada, e aposta que o que descobrir lhe garantirá a reitoria. Afinal, Janus não viverá para sempre.' },
      { nome: 'Estringardi', cargo: 'Mestre Filósofo',
        texto: 'O mais jovem dos conselheiros, de oratória sedutora e humor ferino. Foi por muitos anos diplomata de Ludgrim, e dizem que convenceria o rei de Verrogar a abraçar um sacerdote élfico de Palier. O rei Donatar lamentou perdê-lo e cedeu ao Colégio um velho forte, onde ele ficou pouco: o talento para resolver conflitos em paz o fez subir depressa na hierarquia. Passa a maior parte do tempo percorrendo o mundo em nome do Sábio e fica poucos meses na Magna Opus. Há pouco, encontrou-se em segredo com Nabu, o Encapuzado, em Abadom, para tratar da ligação do Colégio com os Irmãos das Sombras; os dois preferem evitar atrito entre as escolas, mas os menos razoáveis do Círculo Interno não serão fáceis de convencer.' },
      { nome: 'Faustus', cargo: 'Mestre Cientista',
        texto: 'O mais velho do Conselho, elfo dourado de séculos, apaixonado pelo saber: astrólogo, físico, arquiteto e conhecedor das pedras e da terra, só fica à vontade em escavações e salas de aula. Estringardi brinca que o talento dele foi pago com uma inépcia social completa: é lacônico, distraído e tímido, e a beleza e o mistério que o cercam lhe trazem atenções das mulheres que o constrangem. Foi amante de Victriz por muito tempo, até que a ambição dela pôs fim ao romance; dizem que ainda a ama, e que ela tenta, sem sucesso, usar isso nos assuntos do Colégio. Foi ele quem achou o Grimorium Grigorii numa cripta dos túneis sob Levânia e o entregou à Mestra Arcana, e até ele, distraído como é, já notou que ela anda cada vez mais reclusa e obcecada.' },
    ],
    rumores: [
      { nome: 'Roubo anunciado',
        texto: 'Os Irmãos das Sombras estariam contratando ladinos para roubar o Grimorium Grigorii a qualquer preço. A recompensa é uma fortuna, e alguns bandos já se mostram interessados, apesar dos riscos.' },
      { nome: 'Tentativas de assassinato',
        texto: 'Houve há pouco atentados contra Janus, o Sábio. A culpa recaiu sobre um antigo aluno expulso, em busca de vingança, mas especula-se muito sobre os verdadeiros mandantes: os Irmãos das Sombras, membros do Colégio de olho no cargo de Grão-Reitor e até o Colégio Necromântico.' },
      { nome: 'A blasfêmia',
        texto: 'Sacerdotes de Palier, o deus do conhecimento, começam a debater a heresia do Colégio: para os acusadores, falar de uma entidade superior a tudo, deuses e titãs inclusive, é blasfêmia perigosa e hedionda. As discussões mal começaram, e já há quem fale em apostasia, ensino de demônios, prisão, banimento e até morte para os membros que insistirem nessa filosofia.' },
      { nome: 'Objeto de poder',
        texto: 'Dizem que Janus, prevendo a própria morte, passou toda a sua mente, sabedoria e saber para uma coroa mágica, que daria a quem a usasse todo o conhecimento e as habilidades do mago. Ele a teria mandado em segredo para um rei amigo, mas a coroa foi roubada e está desaparecida.' },
      { nome: 'Infiltração no Colégio',
        texto: 'Digam o que disserem os líderes da Magna Opus, os Irmãos das Sombras já cravaram as garras fundo no coração do Colégio. Fala-se que alguns reitores são Irmãos disfarçados e que uma troca de poder está próxima. Estringardi anda absorto em juntar informações e grupos de aventureiros que achem provas.' },
      { nome: 'Contratam-se aventureiros',
        texto: 'Desde que se dedicou ao Grimorium Grigorii, Victriz contrata e despacha em segredo grupos de aventureiros a várias regiões dos Reinos e além, alguns para lá das Geleiras e, dizem, até ao Império. Ninguém sabe o porquê, mas todos concordam que tem a ver com o livro.' },
    ],
  },
{
    slug: 'elemental',
    nome: 'Colégio Elemental',
    tipo: 'colegio',
    titulo: 'Os Quatro Elementos',
    imagem: null,
    // Fonte: colegios.pdf, págs. 23–28 (cap. 4).
    epigrafe: {
      texto: 'Sinta o poder do fogo e deixe que ele purifique tuas emoções. Sê constante como a rocha e maleável como a água, para que os inimigos não te vençam nem as adversidades te detenham. Deixa a mente livre como os ventos, que vão aonde querem. Isso pede disciplina e paixão; mostra coragem, e este poder será teu, e te chamarei de irmão.',
      autor: 'Poazar, o Senhor da Chama',
    },
    prefacio: {
      texto:
        'Na sala do Concílio, nas Quatro Torres, Tétis lembrava aos irmãos que a escola nascera antes da revelação dos deuses, quando os antepassados louvavam o fogo que aquece, a água que sacia, a terra que alimenta e o ar que sopra a vida. Poazar a cortou, os olhos verdes faiscando: desde as Revelações é proibido adorar os Titãs-Elementos, e os prometeicos, aquela seita metida na escola, não passavam de idólatras. Iorgus, o Grão-Artífice, ouvia sem se alterar. «Eu odiaria você, irmão, se não apreciasse tanto a sua constância», disse-lhe o Senhor da Chama.\n' +
        'Anóriam, o Etéreo, lembrou a única guerra que o Colégio conhecera, quando os fiéis dos deuses mataram os que se apegavam ao culto dos titãs, irmão contra irmão. Desde então as diferenças se resolvem em certame aberto ou, quando não há conciliação, em magimancia, cara a cara. Os prometeicos nunca foram hostis; declará-los anátema seria abrir a mesma ferida. Iasom, o Andarilho do Vento, aconselhou distância: o Colégio é dono de si e não deve temer o juízo do clero, mas também não deve agir com arrogância.\n' +
        'O Etéreo deu-lhe razão e sentenciou. Em público, o Colégio guardaria reservas contra a crença prometeica, mas não contra os que nela creem. Poazar saiu resmungando com a discípula, Istelara, que a pureza da arte se perdia na tolerância de Anóriam. Tétis fechou a porta pesada da sua ala e disse aos dois aprendizes, um elfo e um humano, que ninguém seria punido. «Não somos hereges nem vilões», respondeu ao rapaz que perguntava se um dia seriam aceitos. «Que os nossos atos mostrem a sinceridade dos nossos ideais.»',
      fonte: 'Extratos das atas do Concílio Elemental — Biblioteca de Saravossa.',
    },
    descricao:
      'O Colégio Elemental reúne magos poderosos que dominam os elementos primordiais: o fogo, a água, o ar e a terra. É o mais antigo colégio de magos organizado de Tagmar, e no campo de batalha poucos discordam de que os seus são os mais mortíferos.\n' +
      'Hoje corre um risco grave. Voltou a crescer entre os seus uma prática do tempo do silêncio dos deuses: a adoração aos Titãs-Elementos Água, Ar, Fogo e Terra.',
    historia:
      'A história do Colégio começa nos primórdios do Tempo dos Filhos. Antes da revelação dos deuses, tribos viram nos elementos a possível origem da vida, e com os anos formaram quatro escolas de magia: os Andarilhos dos Ventos, os Regentes das Águas, os Senhores da Chama e os Artífices, magos da terra. Cada uma louvava uma personificação grandiosa do seu elemento, e assim, sem saber, a devoção ia parar nos Titãs-Elementos exilados do Plano Físico. Rivais no começo, de tanto se encontrarem viram como a sua fé se parecia, e dessa afinidade nasceu o Colégio Elemental.\n' +
      'A união era recente quando veio a Revelação dos deuses. Os que abraçaram a fé divina não toleraram mais o culto aos titãs, e irmão se voltou contra irmão num banho de sangue que extinguiu os seguidores dos Titãs-Elementos. Os elementalistas nunca se orgulharam desse cisma e choraram amargamente a perda.\n' +
      'Seguiu-se a harmonia, até o fim do século passado, quando surgiu Prometeu. O mago ensinava que todo feiticeiro com aptidão para o Colégio é, na verdade, um avatar dos Titãs-Elementos, nascido no Plano Material para redimir os seus criadores. A ideia correu entre os jovens elementalistas, e entre alguns não tão jovens, que a abraçaram às claras ou em silêncio. Os prometeicos, como os chamaram, logo atraíram a hostilidade dos sacerdotes e dos cidadãos letrados e tementes aos deuses, e o Concílio se vê diante de um dilema espinhoso: como guardar a liberdade de pensamento dentro da casa quando ela pode ser heresia e atrair a reprovação do povo.',
    locais: [
      { nome: 'As Quatro Torres', onde: 'Telas, perto do Domus de Arminus',
        texto: 'O grande castelo erguido para sede do Concílio Elemental e a casa principal do Colégio. Nele fica a Torre dos Mestres, onde cada membro do Concílio tem a sua ala. O projeto é de Melvim, o Arquiteto.' },
      { nome: 'Filial de Runa', onde: 'Runa, Portis',
        texto: 'Uma das filiais mais importantes, dirigida por Melvim, o Arquiteto. Daqui partiu a comitiva que sumiu no Vale de Vandril atrás da Pedra do Véu.' },
      { nome: 'Filial de Marna', onde: 'Marna, Âmiem',
        texto: 'Dirigida por Gildram Maite, a quem a rainha Enora confiou a coordenação dos magos que criam e mantêm os encantamentos das florestas de Âmiem.' },
      { nome: 'Filial de Saravossa', onde: 'Saravossa, Calco',
        texto: 'Dirigida há pouco tempo por Arísia Olhosclaros, guardiã do Moinho do Astrolábio, perto da Pequena Floresta de Saravossa.' },
    ],
    simbolos:
      'O símbolo maior é o escudo quadriforme, cortado por dentro por uma cruz branca, que é o éter, com um elemento em cada quadrante: no alto à direita, a flama; no alto à esquerda, os ventos; embaixo à esquerda, as ondas; embaixo à direita, a rocha.',
    objetivos:
      'Para o elementalista, dominar os elementos é o caminho para dominar o mundo material e, por fim, a si mesmo. Como os alquimistas, ele crê que o trabalho de depurar e domar os elementos limpa também o espírito dos vícios e o converte no ouro da virtude.\n' +
      'Por isso o mago se entende como um agente da ordem a serviço dos deuses, sobretudo dos mais ligados aos elementos da natureza: Tanis, Parom, Maira, Ganis e, de modo mais pleno e estrito, Palier. Entender-se de outro modo, ou buscar o que não está nos planos dos deuses, é heresia. Daí o juízo duro sobre os necromantes, e o temor de que a aptidão para os elementos seja tida como expressão dos titãs exilados.\n' +
      'Os prometeicos não se veem como hereges. Se os elementos estão no Plano Material, dizem, os deuses não detestam de todo os Titãs-Elementos, e a tese de Prometeu abre a porta a uma ideia nobre: a redenção. Por meio dos filhos dos deuses, os titãs se regenerariam diante dos rebentos que os baniram para que o mundo conhecesse lei e ordem. Trabalhando pelas raças inteligentes, os prometeicos buscam a simpatia dos vizinhos e querem mostrar que não são ameaça, mas instrumento de purificação. Para a massa de sacerdotes e fiéis, e para muitos elementalistas, o prometeísmo é heresia de adoradores de titãs, e nada mais.',
    admissao:
      'Como todo colégio, este preza o trabalho dedicado e a inteligência: o elementalismo é uma ciência mágica complexa e perigosa. Seus magos sentem-se em casa nas grandes paisagens ermas, na companhia dos elementos, mas são mais dados que os naturalistas a moldar a terra ao redor conforme a necessidade e o desejo.\n' +
      'Há uma leve maioria élfica, com elfos dourados e florestais em número parecido. Humanos e meio-elfos são quase tantos, numa presença firme e numerosa.',
    etica:
      'Ortodoxos e prometeicos buscam o mesmo: dobrar os elementos à vontade dos filhos dos deuses. O que muda é o fim. O ortodoxo crê que lapidar os elementos aperfeiçoa o próprio caráter. O prometeico crê que essa purificação aperfeiçoa e eleva os Titãs-Elementos, de quem se diz avatar, até que se redimam aos olhos dos deuses e voltem ao panteão de Tagmar, trazendo consigo uma longa idade de ouro.',
    organizacao:
      'Nascido da união de quatro escolas, o Colégio não guarda divisões internas, mas a liderança conserva os títulos antigos. Dentre os mais poderosos e sábios, cinco magos sobem ao Concílio Elemental: um Senhor da Chama, um Regente das Águas, um Andarilho do Vento, um Artífice e o Etéreo, o mais sábio de todos, árbitro das questões do Concílio e dono do voto que desempata. Os títulos valem pela história, não pela arte de quem os leva; um Senhor da Chama não precisa ser mestre do fogo. O nome de Etéreo lembra que, na criação do mundo material, Etere ocupou o vazio entre os quatro planos elementais, embora o etéreo não seja plano elemental.\n' +
      'Toda questão polêmica vai a certame: um debate aberto a mestres e alunos, em que cada parte expõe razões a árbitros sem interesse pessoal na disputa. Nas decisões do Concílio, o árbitro é sempre o Etéreo.\n' +
      'O que o certame não resolve, ou o que toca a honra, vai à magimancia: um duelo de um contra um entre magos campeões de cada lado, interrompido antes da morte do vencido. O resultado não admite recurso, e recusar a derrota é grande desonra.',
    liderancas: [
      { nome: 'Poazar', cargo: 'Senhor da Chama',
        texto: 'Parece um belo meio-elfo de olhos verdes e vasta cabeleira ruiva, famoso pelo poder, pelo saber e pelo gênio tempestuoso. Quem o conhece lhe dá uns cem anos, e erra de longe: Poazar é um dragão imperial do fogo, poderosíssimo, que se encantou com o ideal de aperfeiçoamento dos elementalistas. Lutou contra os Titãs ao lado dos deuses e é inimigo fanático dos prometeicos. A ironia é que a sua verdade lhes daria razão: antes da filosofia elementalista, ele foi um assassino voraz e sem piedade.' },
      { nome: 'Tétis', cargo: 'Regente das Águas',
        texto: 'Elfa florestal nascida e criada em Conti, tem o temperamento do seu elemento: com brandura e insistência derruba os obstáculos mais rijos, ou acha um jeito seguro de contorná-los. Sábia e compassiva, sempre foi o contrapeso da arrogância de Poazar; dizem que foram, ou ainda são, amantes, embora sempre opostos nas ideias. Desde uma suposta revelação às margens do Lago Denégrio, na terra natal, é a voz mansa que garante a sobrevivência dos prometeicos.' },
      { nome: 'Iorgus', cargo: 'Artífice',
        texto: 'Firme e constante como a terra. Humano de meia-idade, de pele negra como ébano e longas tranças até a cintura, a sua única vaidade. Nasceu em Telas, perto do Domo de Arminus, e sabe da beleza e da fragilidade da vida, e de que guardá-la pede poder, firmeza e sobretudo sabedoria. Não tomou partido quanto aos prometeicos, mas não está do lado da guerra.' },
      { nome: 'Iasom', cargo: 'Andarilho do Vento',
        texto: 'Humano de visão prática, que alguns confundem com pressa. Não é tolo: acredita que boa parte dos conflitos vem de os seres inteligentes não aceitarem que são inconstantes e inclinados à mudança. Pouco lhe importa se um elementalista é ortodoxo ou prometeico; todos são membros do Colégio e têm direito às suas opiniões.' },
      { nome: 'Anóriam', cargo: 'O Etéreo',
        texto: 'Meio-elfo de idade avançada, já viu o pior e o melhor do mundo: foi perseguido por verrogares, enfrentou a política sutil das cortes de Lar defendendo os humanos, firmou tratados com os anões e combateu o fanatismo onde o achou. Admira o ideal de redenção dos prometeicos, mas reluta em aprovar uma fé centrada nos titãs que os próprios filhos baniram por destruírem tudo. Enquanto não tiver razões para julgar com justiça, adiará quanto puder a sentença sobre os seguidores de Prometeu.' },
      { nome: 'Melvim', cargo: 'O Arquiteto, diretor da filial de Runa',
        texto: 'Humano de meia-idade, de pele negra e longas tranças, firme como a terra. Nasceu em Runa e andou um tempo pela política de Portis, que deixou ao assumir a filial da cidade. É o autor do projeto da sede do Concílio Elemental.' },
      { nome: 'Arísia Olhosclaros', cargo: 'Diretora da filial de Saravossa',
        texto: 'Dizem que foi achada por uma expedição que voltava das terras bárbaras do sul. Depois de muitas aventuras com o grupo, foi chamada à Loja de Malim, e hoje guarda o Moinho do Astrolábio, perto da Pequena Floresta de Saravossa. Assumiu há pouco a filial da cidade e é tida como forte candidata a uma cadeira no Concílio.' },
      { nome: 'Gildram Maite', cargo: 'Diretor da filial de Marna',
        texto: 'Membro do Alto Conselho de Âmiem. A rainha Enora o pôs à frente de todos os magos da região, inclusive os de outros colégios, para criar e manter os encantamentos sem fim que guardam as florestas de Âmiem. Esse comando sobre magos de fora vale só para esse fim.' },
    ],
    rumores: [
      { nome: 'O segredo dos elementos',
        texto: 'Achou-se na biblioteca do Colégio um pergaminho antigo com um segredo poderoso sobre o domínio dos elementos, saber apócrifo e proibido que tocaria nos Titãs-Elementos e nas razões verdadeiras da guerra dos deuses contra os pais. Começou a corrida para decifrá-lo, pois em algum lugar está a chave do texto.' },
      { nome: 'A discórdia observada',
        texto: 'Enquanto ortodoxos e prometeicos se estranham, os outros colégios espiam. Alguns, como o Naturalista, podem ver na rixa a chance de enfraquecer o Elemental e crescer, rumo a uma aliança ou a um conflito entre as escolas.' },
      { nome: 'A Pedra do Véu',
        texto: 'Melvim mandou uma comitiva ao Vale de Vandril, em Âmiem, e ela teria sumido depois de achar uma pista da Pedra do Véu, o artefato que acirra os ânimos entre elementalistas e ilusionistas. Tudo indica que novos grupos irão às Ruínas de Enor, no vale.' },
      { nome: 'A profecia do escolhido',
        texto: 'Prometeicos radicais juram ter achado uma profecia antiga que anuncia um elementalista de poder sem igual, destinado a desvendar os segredos dos Titãs. Quem seria, ninguém sabe, e muitos olhos e ouvidos já estão atentos.' },
      { nome: 'O diário da Regente',
        texto: 'Aventureiros teriam achado nos arquivos secretos do Concílio um diário antigo atribuído à lendária Regente das Águas, Tétis, com pistas de artefatos ligados às magias perdidas dos Titãs e detalhes da filosofia e das artes prometeicas.' },
      { nome: 'O elemental aprisionado',
        texto: 'Fala-se de um elemental poderoso selado há séculos numa prisão arcano-etérea. Elementalistas e ilusionistas pagam bem por qualquer notícia do lugar ou prova de que exista. Se existir, resta saber se é criatura maligna ou peça de um quebra-cabeça que evita mal maior.' },
      { nome: 'O oráculo das sombras',
        texto: 'Um oráculo enigmático que vive à sombra do Colégio tem visões de uma profecia sombria que poderia trazer de volta os quatro grandes Titãs-Elementos. O Concílio convoca aventureiros para acompanhá-lo e protegê-lo enquanto investiga o sentido das visões.' },
    ],
  },
  {
    slug: 'ilusoes',
    nome: 'Colégio das Ilusões',
    tipo: 'colegio',
    titulo: 'O Véu dos Sonhos',
    imagem: null,
    // Fonte: colegios.pdf, págs. 30–35 (cap. 5).
    epigrafe: {
      texto: 'Além dos teus sentidos está o mundo real, e nele estão os deuses, que te esperam com segredos inimagináveis. Liberta-te da ilusão. Deixa que o fogo de Assura dissolva o véu que te separa da verdade.',
      autor: 'Anaximander, o Belo',
    },
    prefacio: {
      texto:
        'Pela abóbada de vitrais do castelo de Anaximander eu via as luas no céu. Era a minha segunda noite ali, e a última. Eu, Aniel Caladrobam, nobre de Âmiem e acadêmico das cortes dos elfos dourados, seguia para Ludgrim, onde aconselharia o rei Darniar, e desdenhava do anfitrião, um prestidigitador que nunca parecia andar, só levitar. Na despedida, ele me deu um presente: uma versão da criação que nenhum tomo registra. Os deuses não puderam destruir os Titãs Luz e Treva, e por conselho de Palier os fizeram dormir sem memória de quem eram; do sonho deles é feito o mundo. Quando acordarem, a vida se apagará.\n' +
        'Paramos diante de um retrato de Amenorá IV, o avô humano de Darniar, ao lado do próprio Anaximander. «Não existe», disse ele, e estalou os dedos. O quadro e a parede do corredor sumiram, e ficou a noite fria lá fora. Acusei-o de truque, de ter tornado a parede invisível. «Então toque-a.» Estendi a mão com mais raiva que convicção. Não havia nada. A brisa me cortou os dedos, e eu, que estava aquecido, comecei a sentir frio.\n' +
        'O castelo inteiro, confessou, é feito de ilusões, salvo um pequeno cômodo no térreo; por isso nunca toca nos livros espalhados pela casa. Os criados creem que a mansão foi presente de Amenorá IV, e é a crença deles que segura as paredes contra a chuva e o vento. «Eu lhes contei uma mentira, e a vontade deles a tornou real.»\n' +
        'Parti à noite, num coche de veludo, com um pequenino às rédeas e dois cavaleiros de escolta. Quando o cocheiro me ofereceu um dos vinhos do lorde Anaximander, recusei. Tive medo de que a garrafa sumisse ao meu toque, e depois o coche, e a escolta, e que eu ficasse sozinho e desarmado no meio da floresta escura.',
      fonte: 'Extratos das memórias de Aniel Caladrobam — Biblioteca de Saravossa.',
    },
    descricao:
      'O povo tem os ilusionistas por charlatães e saltimbancos, paródias de magos, porque os seus feitos não duram. Nada mais longe da verdade. Por trás da fachada de engodos há uma ordem de magos nobres e capazes, com um só propósito: achar um meio de enxergar através do véu de ilusão que os demais sábios chamam de mundo real.\n' +
      'Para eles, o mundo é o sonho de dois Titãs acorrentados, Luz e Treva, que os deuses puseram para dormir. Cada coisa dura conforme a vontade que o sonho lhe emprestou: os dragões, cheios dela, duram milênios; os elfos, menos; os anões, menos ainda; e humanos e pequeninos passam quase num sopro. Quem achar em si essa vontade, a volição, escapa antes do Despertar, quando os gêmeos abrirem os olhos e a vida no mundo se desfizer.',
    historia:
      'Os relatos mais antigos viriam de narrativas orais do Tempo das Névoas, passadas à fundadora do Colégio, a elfa dourada Maia, talvez por um dragão dourado imperial, o venerável Assura. Contam as lendas que Assura teve pena das criaturas que pereceriam, sem saber, quando Luz e Treva despertassem, e ensinou à arquimaga das cortes élficas a penetrar o véu dos sonhos, manipular a sua matéria e chegar por fim à quintessência que sustenta toda vida, a volição. Só achando a própria volição, disse ele, um ser escaparia à destruição no Despertar.\n' +
      'Quando Maia aprendeu tudo, o dragão partiu deste mundo rumo a paragens mais reais, para perto dos deuses que já contemplara em tempos sem conta. Maia fundou então o Colégio, para mostrar a todos os viventes que o mundo é um sonho passageiro, a ser entendido e transposto rumo à morada final dos deuses.\n' +
      'Desde que Assura se foi, muitas guerras e tormentas varreram Tagmar, e boa parte do que ele ensinou se perdeu. A sabedoria dos ilusionistas de hoje é uma sombra do que foi, efêmera como as suas criações.',
    locais: [
      { nome: 'Matriz de Calco', onde: 'Calco',
        texto: 'A sede do Colégio, num reino de espírito liberal e cosmopolita. Todo mago recém-filiado passa por ela para o treino básico e o estudo da filosofia que Maia fundou sobre os ensinamentos de Assura. Dizem que é dos lugares mais fascinantes do mundo conhecido, até para magos.' },
      { nome: 'Palácio dos Senhores das Ilusões', onde: 'Telas',
        texto: 'A filial de Telas, de uma simplicidade rara em Tagmar: um prédio retangular cujo interior é muito mais vasto do que se imagina de fora.' },
      { nome: 'Filial de Marna', onde: 'Marna, Âmiem',
        texto: 'De grande valor estratégico: é uma das guardiãs do reino, e com as suas artes torna as florestas de Âmiem quase impenetráveis.' },
    ],
    simbolos:
      'A heráldica do Colégio mostra dois olhos fechados sobre um escudo cinzento. Os olhos são opostos, um negro e um branco, e figuram os gêmeos no sono do castigo; o escudo cinza é o mundo material, o sonho de Luz e Treva.\n' +
      'O outro símbolo famoso é o prisma. Nele a luz branca, que é a volição, se abre em sete cores, uma para cada plano da existência: Divino, Limbo, Astral, Material, Etéreo, Elemental e Infernal.',
    objetivos:
      'As magias ilusionistas tecem de novo a matéria dos sonhos de que é feito o plano material. Parecem tênues porque tentam refazer o que foi feito por Titãs adormecidos, de vontade sem medida. No fundo, cada uma é uma tentativa de chegar à essência que anima a forma: achar a volição por trás das ilusões é achar o caminho do mundo real e escapar ao Despertar de Luz e Treva.\n' +
      'Quem não entendeu este mundo fica preso nele até compreender que não é real e desprender-se dele pela iluminação. O caminho é árduo, porque nenhum vivente sabe como é o mundo real, mas a prática diligente dos preceitos de Assura pode levar à liberdade. Os preceitos são três: a crença constrói o real, e o que muitos creem com firmeza por tempo bastante passa a existir; mostrar aos irmãos a fragilidade das ilusões feitas por mãos de mago os ensina a fragilidade do mundo, pois nada que esteja sujeito a Crônus e a Entropia é real; e cultivar a atenção e a constância liberta dos laços do sonho. O primeiro axioma de Maia, dizem, serve a qualquer um, mago ou não: «isto também passará».',
    admissao:
      'Os ilusionistas aceitam quem os aceita, isto é, quem abraça de verdade a sua crença. Os que eles procuram costumam ter sagacidade aguda, raciocínio rápido e bom humor: o mundo é um sonho vívido e realista, mas um sonho, e não há por que se desesperar.',
    etica:
      'Outros magos os acusam de preguiça, de falta de ambição e de comodismo. É um triste engano: os ilusionistas são estoicos empedernidos. Se o mundo não é real, de que serve correr atrás de títulos, riquezas e honras que cedo ou tarde se desfazem como fumaça? O que cabe é estar atento a tudo o que acontece e perceber o quanto aquilo prende ao sonho dos gêmeos. Vigiando os sentimentos passageiros, o ódio, o desejo, o amor, a esperança, o mago impede que o governem e se agarra ao que há de constante em si, a volição.\n' +
      'A crença é a chave da arte. Uma bola de fogo ilusória contra a muralha de um castelo não faz nada; contra um grupo de soldados ignorantes, eles provavelmente rolarão no chão para apagar chamas que não existem. O quanto se crê numa ilusão é o quanto ela fere. Com o próprio mago dá-se o contrário: a ponte ilusória sobre o desfiladeiro salva os companheiros, mas para quem a ergueu só serve a um custo mágico muito mais alto, porque ele sabe que ela não é de verdade.\n' +
      'Entre a ilusão do mago e a dos gêmeos, a diferença é só de grau. Nada que tenha começo e fim é real, pois real é o que não muda nem acaba. Cada embuste e cada brincadeira existe para mostrar ao mundo que ele passa; só quem entende essa fragilidade dá mais um passo rumo à morada dos deuses.\n' +
      'Por isso a ilusão não é diversão para o povo. Um truque pequeno para chamar a atenção é útil, desde que mostre a fugacidade das coisas. Fazer da arte espetáculo é vulgarizar os ensinamentos de Maia e enredar-se ainda mais no sonho.',
    organizacao:
      'A ordem é acadêmica, assentada no saber e no poder de cada membro. No topo está o grão-reitor, na matriz de Calco; abaixo dele, os reitores que dirigem as filiais, ilusionistas renomados e sábios de todas as raças. Tudo o que toca o Colégio passa pela reitoria e pela coordenadoria.\n' +
      'Não é uma estrutura rígida, nem de magos agarrados aos títulos: para eles, honrarias e cargos não são nada além de instrumentos de ensino para ajudar o maior número a escapar da prisão de Luz e Treva. Talvez por ser flexível, tolerante e aberta, tantos magos busquem filiação entre os ilusionistas, apesar da fama de charlatães. Os coordenadores ficam pouco no posto, quase sempre afastados por obrigações pessoais; hoje são humanos e elfos, sobretudo dourados.',
    liderancas: [
      { nome: 'Dex Teer', cargo: 'O Inventor, grão-reitor',
        texto: 'Há perto de uma década ocupa o título. Uns o descrevem como um humano jovem, de cabelos brancos e jeito despojado; outros, como um homem austero de meia-idade e trajes sóbrios, e as duas versões vêm de testemunhas que o viram na mesma ocasião. Sempre acessível, é visto com frequência nas escadarias do Colégio discutindo filosofia e metafísica com alunos, colegas e magos de outras escolas.' },
      { nome: 'Divanom Isonar', cargo: 'Reitor',
        texto: 'Irmão de Divanor Isonar, Conselheiro da Justiça de Calco. Além de reitor, é membro da sociedade de Malim, que reúne magos de vários colégios. Eloquente, é tido como um dos principais candidatos à sucessão de Dex.' },
      { nome: 'Anaximander', cargo: 'O Belo, Guardião das Fronteiras',
        texto: 'Elfo dourado da elite de Âmiem, guarda as fronteiras de Ludgrim e de Âmiem com a Levânia, e poucos, muito poucos, sabem a razão verdadeira do enclave onde vive. Magos e conterrâneos o têm por excêntrico. Quem tenta descrever o rosto aquilino, emoldurado de cabelos loiros, lisos e reluzentes, com dois olhos de água-marinha, acaba dizendo «lindo». Mas o que sustenta essa beleza é uma simpatia desconcertante: voz sempre afável e cortesia que não se abala nem diante de quem o trata com desdém. Parecer tolo e hedonista é a sua tática para surpreender adversários, e aliados.' },
    ],
    rumores: [
      { nome: 'A Pedra do Véu',
        texto: 'Cresce a rixa entre o Colégio das Ilusões e o Elemental pela posse da Pedra do Véu, artefato antigo que ampliaria o poder das ilusões e das invocações elementais. Há espiões dos dois lados, alunos postos uns contra os outros, e líderes que tentam um acordo ou se preparam para impor a vontade por meios mais duros. Agora corre que a pedra está nas mãos de um grupo de aventureiros.' },
      { nome: 'O segredo do Livro de Palier',
        texto: 'Diz-se que os ilusionistas descobriram um trecho secreto do Livro de Palier, guardado por séculos pelos sacerdotes do deus do Conhecimento e da Magia, uma revelação capaz de abalar os alicerces da magia e da fé. Os magos o guardam com zelo, temendo o que significa, e os sacerdotes querem de volta o que tomam por herança sua. A disputa corre em silêncio, nas sombras.' },
      { nome: 'A sociedade secreta',
        texto: 'Antes de Maia, Assura teria ensinado a sua ciência a um estudioso renegado que morreu mártir, mas cujas lições germinaram entre os ilusionistas. Esse grupo, se existe, quer apressar o Despertar de Luz e Treva e paga aventureiros por qualquer texto ou objeto que dê pistas do Fim do Sono dos Irmãos.' },
      { nome: 'Conspiração contra Dex Teer',
        texto: 'Um dos coordenadores estaria tramando para minar o grão-reitor e tomar o Colégio. Dex contrata cada vez mais soldados e guarda-costas sempre que precisa sair da casa.' },
      { nome: 'A relíquia esquecida',
        texto: 'Os fundadores teriam deixado para trás um artefato poderoso, capaz de revelar a natureza verdadeira do mundo e de abrir um portal para fora do sonho em que vivemos. Um grupo de ilusionistas está disposto a tudo para achá-lo primeiro.' },
      { nome: 'A invocação proibida',
        texto: 'Um estudante teria cedido à tentação de uma invocação proibida, abrindo uma fenda para um plano obscuro e soltando criaturas chamadas Pesadelos. O que são e o que querem, ninguém sabe. Ligam-se a isso os fatos estranhos que assolam Calco e arredores, e a suspeita de que uma força maligna se infiltrou no Colégio.' },
    ],
  },
{
    slug: 'naturalista',
    nome: 'Colégio Naturalista',
    tipo: 'colegio',
    titulo: 'Natureza',
    imagem: null,
    // Fonte: colegios.pdf, págs. 37–44 (cap. 6).
    epigrafe: {
      texto: 'Teus olhos estão cansados porque procuras o mistério em todas as coisas. Não há mistérios: há o céu e a terra, e os seres que neles estão. Teus ombros vergam porque queres erguer o mundo; não o erga, mas viva nele com teus irmãos. Cace, mate, morra e retorne ao ciclo. Por trás de toda dor, todo pranto e toda fúria, o mundo está em paz. Eis o mistério, eis a força.',
      autor: 'Harlam, o Corvo da Tempestade',
    },
    prefacio: {
      texto:
        'Da orla da floresta, o mago elfo vigiava o vilarejo pobre onde a irmã escolhera viver. Fazia quase cem anos que não a via. Ela chegou sem que ele a ouvisse, como sempre, leve e ágil como a mãe; mas o sangue humano já lhe riscava finas linhas em torno dos olhos e da boca. Ele viera levá-la de volta às florestas de Lar, para longe daquela gente fugaz e supersticiosa.\n' +
        'Mirdam recusou. «Tudo é sazonal», disse. «Nada é tão fugaz que não deixe sua marca no mundo, e nada é tão perene que não encontre um fim.» Tomou as mãos do irmão e o olhou, e ele se viu mergulhado em águas cinzentas e mornas. Caiu um silêncio fundo, e dentro dele soaram os dois corações, depois muitos outros, e muitos sopros, num mosaico que ia além de todos. Por trás de toda dor e toda perda, a vida seguia numa paz sem fim. «Não tente entender o que sentiu, ou vai matar a doçura da lembrança.»\n' +
        'Ela se afastou sem despedida, cercada pelas crianças, saudada pelos velhos. A terra estava seca de dias de sol, e o rio mais próximo ficava a léguas. Mirdam juntou as mãos e falou as palavras mais com o coração que com a mente, e brotaram plantas de sementes escondidas no chão pobre. O irmão respirou fundo, deixou o Karma ferver e gritou aos ventos os nomes secretos dos elementais. As nuvens negras se juntaram, primeiro tímidas, depois pesadas, e a chuva caiu sobre todos. Foi o seu beijo de adeus.',
      fonte: 'Extratos das memórias de um mago de Lar — Biblioteca de Saravossa.',
    },
    descricao:
      'Uma força que ninguém sabe nomear move o mundo: traz as estações, faz brotar as flores, guia a migração dos pássaros, ceifa o velho e fortalece o novo. Há magos que aprendem a se afinar com ela, a sentir os seus ritmos e a decifrar os seus segredos. São os sábios do Colégio Naturalista.\n' +
      'Onde os outros colégios exaltam o intelecto, este estima a sensibilidade. A magia, para eles, não é um saber de poucos eleitos, mas uma teia de trocas entre tudo o que vive, e cada naturalista a usa como ferramenta do equilíbrio e da fartura: a sua, a dos seus aliados e a da vida ao redor. Nas aldeias, são os hierofantes que fazem crescer as lavouras e leem nas estrelas e no sussurro dos ventos a hora de semear e de colher.',
    historia:
      'O colégio é novo, com pouco mais de algumas centenas de anos, mas a filosofia em que se apoia é tão antiga quanto o culto a Maira, a deusa de três faces. Sua origem já é meio lenda, meio crônica, embora as pessoas envolvidas tenham existido de fato.\n' +
      'Contam que Mirdam, nobre arquimaga de Filanti, venceu uma falange de Bankdi nas fronteiras do reino e quase pagou com a vida. Já às portas dos reinos de Cruine, foi recolhida por uma tribo de montanheses, cujos sacerdotes de Maira lhe curaram as feridas do corpo e do espírito. Despertou depois de três luas, mudada pelo que vira além do mundo da forma: o Amplexo Vital, ou Abraço Criador, um campo de força que envolve o mundo e todas as criaturas, de carne ou sem corpo, dividido em três círculos, em que todos os seres se tocam, são tocados pela vida do próprio Tagmar e, por fim, mergulham no seu cerne.\n' +
      'Mirdam largou os estudos antigos e se recolheu às bordas de Gironde, seguida por poucos discípulos. Os aldeões diziam que ela se entregara aos demônios nas trevas da floresta. O que de lá saiu, porém, foi uma escola de magos atentos aos ritmos da vida. Logo as aldeias agrícolas de Filanti passaram a receber com alegria esses hierofantes, e, com a simpatia dos sacerdotes de Sevides e Selimom, os naturalistas ergueram centros de estudo que eram templos a céu aberto, onde se celebravam os três aspectos do Amplexo.\n' +
      'A boa acolhida trouxe também influências de toda parte, mal vistas pelos puristas e pelos fundadores, e daí nasceram várias linhas de pensamento, todas fiéis aos princípios do colégio. Há três anos Mirdam desapareceu. Uns dizem que ela alcançou o grau mais alto do Abraço Criador e foi levada de Tagmar; outros, mais maldosos ou mais céticos, que alguma aberração das orlas de Gironde a devorou. O colégio, mesmo assim, goza de grande prestígio e cresce com segurança pelo mundo conhecido.',
    locais: [
      { nome: 'Naturae Domo', onde: 'Floresta de Gironde',
        texto: 'O Lar Natural, a maior comunidade do colégio, nas terras onde Mirdam se recolheu com os primeiros discípulos. Os naturalistas não erguem escolas nem laboratórios: vivem em vilas comunais, dividem bens e saberes, e toda lição e todo rito se dão ao ar livre.' },
      { nome: 'Mirdana', onde: 'Floresta de Aberdim, Calco',
        texto: 'Grande comunidade de fundação recente, com muitos mestres e aprendizes. Tem o nome da fundadora.' },
      { nome: 'Colégio da Floresta de Melram', onde: 'Âmiem',
        texto: 'Uma das casas de destaque do colégio, em terra élfica.' },
      { nome: 'Escola Naturalista dos Montes Selvagens', onde: 'Perto de Elbrat',
        texto: 'Outra das comunidades de renome, nos montes.' },
      { nome: 'Torre dos Mestres da Natureza', onde: 'Telas',
        texto: 'Famosa pelos seus jardins suspensos.' },
      { nome: 'Verrogar', onde: 'Verrogar',
        texto: 'Quase todo reino do continente abriga comunidades naturalistas, grandes ou pequenas. Verrogar é a exceção: lá não há nenhuma.' },
    ],
    simbolos:
      'O colégio usa muitos símbolos, mas o mais famoso é a Triface, o Rosto de Todos os Rostos: um escudo redondo cuja borda é uma serpente que morde a própria cauda, e, dentro dele, três rostos unidos face a face, que são os reinos mineral, animal e vegetal. O conjunto representa as trocas da natureza, que morre e renasce, se alimenta de si mesma e se perpetua nos filhos.',
    objetivos:
      'Para os naturalistas, toda relação vital do mundo se dá em três círculos, que juntos formam o Amplexo Vital. No primeiro está o mundo da carne: a planta se nutre do corpo que apodrece no solo, o animal come a planta, outro animal come o primeiro, e a morte devolve tudo à terra para recomeçar. No segundo está o que se costuma chamar de magia, o saber das leis ocultas que regem ou desviam as relações do primeiro. Todo neófito aceito já pertence a ele, pois já é mago.\n' +
      'A meta de cada naturalista é entrar no terceiro círculo, onde se vive o Amplexo por inteiro. Essa compreensão não vem da inteligência, mas da sabedoria, que é a experiência somada ao que dela se aprende. Quem lá chega é retirado do mundo da carne e mergulha no fluxo de vida que envolve Tagmar, tornando-se emissário e auxiliar dos deuses da vida. Só Mirdam o teria alcançado. Quem o fizer será lembrado nas litanias cantadas nos ritos do colégio.',
    admissao:
      'O colégio prefere a sensibilidade ao brilho: não é raro um mestre ilustre aceitar um postulante de pouca inteligência, mas de coração aberto e atento. O intelecto ajuda o mago a entender o que vive no Abraço, mas vale pouco quando o coração está fechado aos sinais miúdos de cada dia.\n' +
      'Egoístas rasos e devotos do próprio prazer são mandados embora depressa por esta confraria grave e trabalhadora.',
    etica:
      'A missão é buscar o âmago do Amplexo Vital, e os caminhos mais óbvios até o seio da deusa são observar a natureza e usar os seus poderes para o bem geral. Mas esse bem não se limita aos povos, selvagens ou civilizados: é o equilíbrio da vida inteira. Um naturalista que derruba um trecho de mata para dar moradia à sua gente, tirando o abrigo dos bichos e quebrando o equilíbrio do lugar, está no mínimo enganado. Quanto mais sensível ele é às relações que sustentam a harmonia de uma terra, mais perto está do terceiro círculo.\n' +
      'Presa ou predador, quem come carne ou quem come erva, quem pensa ou quem não pensa: todos têm o seu papel no equilíbrio e são fortes por natureza. A fraqueza é desarranjo, fruto do afastamento da natureza de cada um, e quem ouve com sinceridade a voz de dentro reencontra a força. Nos bichos essa voz é o instinto que diz a hora de acasalar, caçar ou morrer; nos seres que pensam, é o intelecto.\n' +
      'Servir a sua comunidade no ritmo da natureza é o caminho mais comum, não o único. Há naturalistas que o buscam na brutalidade: na caça sangrenta, na tempestade, na fúria do raio e do trovão. Os colegas não os detestam, pois a destruição é parte da renovação. Mas essa selvageria nunca pode ser cega, porque tudo na natureza tende ao equilíbrio; os monstros que só procuram um escape para a sede doentia de destruir são caçados e mortos, até por quem os chamava de irmãos.',
    organizacao:
      'A ordem é simples, mas bem assentada. Os guardadores se fixam numa aldeia, vila ou tribo, vivem a rotina dela e a ajudam com os seus poderes. Os andarilhos acham que a natureza é grande demais para ser entendida de um só lugar e vagam sozinhos ou com grupos de aventureiros.\n' +
      'Os grandes mestres da arte se chamam hierofantes, mas o título é dado a magos muito diferentes: o hierofante de uma pequena aldeia de Acordo pode ser menos poderoso que um naturalista comum de Mirdana. Por isso a hierarquia se resume às leis da boa hospitalidade: quem visita uma terra respeita e ajuda os naturalistas dela, que em troca o abrigam e o socorrem.\n' +
      'Acima deles estão os grão-hierofantes, mestres das várias vertentes do colégio. As mais conhecidas são três: os Puristas, o naturalismo mais próximo do tradicional; os Citadinos, que levam a filosofia e a arte para as grandes cidades; e os Rapinantes, naturalistas brutais que se espalham entre as tribos bárbaras de humanos. As outras são pequenas ou fracas demais para chamar a atenção.',
    liderancas: [
      { nome: 'Harlam, o Corvo da Tempestade', cargo: 'Grão-hierofante dos Puristas',
        texto: 'Humano de idade avançada e olhos negros que faíscam de força indomável, visto por muitos como herdeiro legítimo de Mirdam. É muito respeitado entre tribos bárbaras e povos pastores, e dizem que poucos lhe igualam a sabedoria. Dizem também que tem parentesco de sangue com Nabu, o Encapuzado dos necromantes, e a antipatia entre os dois é notória; por isso muitos imaginam uma rixa entre os dois colégios, quando o caso é só deles. Anda sempre com Victor, o Ibendraco, ou filho do dragão, guerreiro humano famoso pela força e pela brutalidade em combate, e, por ironia, filho de Nabu.' },
      { nome: 'Urucam, o Lobo Negro', cargo: 'Grão-hierofante dos Rapinantes',
        texto: 'Chefe bárbaro das estepes verrogares, enorme e poderoso, governa com garras afiadas as falanges rapinantes. Contra o que se previa, sábios e governantes o veem como influência até certo ponto boa entre os povos selvagens: reprime a brutalidade gratuita e leva as tribos a um modo de vida mais harmônico e menos predador. Mas ninguém se engane: ele vê a si e ao seu povo como caçadores tenazes, e defende o território com fúria contra qualquer empreitada «civilizadora», humana ou élfica.' },
      { nome: 'Talesim, o Jovem Mestre', cargo: 'Grão-hierofante dos Citadinos',
        texto: 'Mago jovem e sábio, cedo percebeu que era preciso levar o naturalismo às cidades, e espalha herbários, boticas e, quando pode, bosques erguidos por magia: quer provar que cidade não é o contrário de vida natural. Tem o apoio de muitos elfos urbanos e a simpatia de nobres de Lar e de Âmiem, pois esse jeito de construir sem ferir a natureza combina com o modo de vida élfico. Carismático, tem em Saravossa a ponta de lança do seu projeto, que despertou a saudade de muitos dos cidadãos mais antigos e poderosos de Calco, reino que já foi uma potência agrária.' },
    ],
    rumores: [
      { nome: 'Terremotos e tempestades',
        texto: 'Terremotos e tempestades devastadoras começaram a castigar regiões selvagens de Tagmar. Os naturalistas desconfiam que algo, ou alguém, perturba o equilíbrio do Amplexo Vital, mas a origem é até agora um mistério.' },
      { nome: 'O encontro dos líderes',
        texto: 'Um dos grão-hierofantes convoca os líderes de todas as vertentes para uma grande assembleia, com o fim de unir o colégio sob um só comando e aumentar a sua força no mundo. As rivalidades e as diferenças de doutrina ameaçam acender uma guerra interna.' },
      { nome: 'A Folha da Eternidade',
        texto: 'Uma planta rara foi vista no fundo da Floresta de Melram. A lenda diz que a própria Mirdam a descobriu, e que ela cura males graves e pode até alongar a vida. Naturalistas, alquimistas e aventureiros ambiciosos estão à procura dela.' },
      { nome: 'A maldição naturalista',
        texto: 'Numa aldeia agrícola sob a proteção dos naturalistas, as colheitas murcham, os animais adoecem e as fontes secam. A suspeita recai sobre um grupo de naturalistas que acreditava que certos rituais trariam uma grande safra; parece que algo deu errado.' },
      { nome: 'O oráculo',
        texto: 'Um oráculo enigmático tem aparecido perto de Naturae Domo dizendo ter visões de um desastre que ameaça o continente inteiro. Os naturalistas se dividem sobre a sua palavra, mas para alguns ela soa como aviso urgente.' },
      { nome: 'Os Sussurrantes',
        texto: 'Uma facção secreta surgiu dentro do colégio. Para eles, o Amplexo Vital é só o começo, e querem descer mais fundo nos segredos ocultos da vida e da morte. Uns os têm por visionários, outros por hereges perigosos.' },
      { nome: 'O artefato roubado',
        texto: 'Roubaram de Harlam um poderoso artefato naturalista, capaz, dizem, de alterar o equilíbrio da natureza. Corre que ele foi traído por alguém próximo.' },
      { nome: 'O pergaminho de Aberdim',
        texto: 'No fundo da floresta de Aberdim achou-se um pergaminho antigo com um feitiço perdido, que deixaria o conjurador falar com a própria essência do Amplexo Vital. Naturalistas de todo o continente correm atrás dele, mas contam que a floresta está cheia de criaturas estranhas e hostis.' },
      { nome: 'A magia proibida',
        texto: 'Um bando de naturalistas renegados pratica magia proibida para chegar ao terceiro círculo sem respeitar a ética do colégio. Acham justo o poder a qualquer preço, se ele levar à verdadeira compreensão da natureza.' },
      { nome: 'Expedições às Terras Selvagens',
        texto: 'O colégio prepara expedições às regiões selvagens e inexploradas de Tagmar, atrás de novas formas de vida e de segredos esquecidos, e procura aventureiros experientes. Dizem que bestas terríveis e entidades ancestrais guardam essas terras.' },
    ],
  },
  {
    slug: 'necromantico',
    nome: 'Colégio Necromântico',
    tipo: 'colegio',
    titulo: 'Morte',
    imagem: null,
    // Fonte: colegios.pdf, págs. 45–52 (cap. 7).
    epigrafe: {
      texto: 'Atrás dos portões negros da morte estão os segredos da vida eterna. O caminho é longo, e a noite, tempestuosa. Mas a recompensa nos elevará para além das estrelas. Abandone o temor, a dúvida e a descrença. Dê-me tua mão: o caminho nos espera.',
      autor: 'Nabu, o Encapuzado',
    },
    prefacio: {
      texto:
        'A sala era escura e cheirava a mofo, couro e um fundo de algo cítrico. Meel, jovem feiticeira, se ajeitava na cadeira de espaldar duro sem conseguir esconder a ansiedade. Do outro lado da mesa pesada, entre livros e pergaminhos, o velho Nabu tomava o seu chá. «Não vou ofender sua inteligência com testes infantis», disse. «Suas tentativas de contato foram percebidas.» E falou do que o colégio oferecia: os nomes secretos dos não-nascidos, os mensageiros de Cruine enganados, os corpos sem vida postos de novo a andar, as chamas do Tártaro. Tudo tinha um preço.\n' +
        'Antes de dizer qual, contou a história: a luta antiga contra os Elfos Sombrios, Gregorius e o fogo tartáreo, a queda do primeiro entre iguais e o Cisma Flamejante. Disse o que os necromantes viram além da mortalha, rebanhos de almas conduzidas pelos deuses, servindo de alimento e de escabelo aos imortais. Bateu o punho na mesa, e os pergaminhos tremeram. «Jamais te curvarás a deus algum, porque tua natureza íntima é igual à deles.»\n' +
        'Depois ditou as regras e estendeu, na mão ossuda, um anel. Meel ficou calada um tempo, ouvindo a própria respiração. Então tomou o anel e o pôs no anular esquerdo. O velho apertou-lhe a mão, sem sinal secreto nenhum, com o calor de quem conhece aquela trilha escura de noites frias e distantes. «Sede bem-vinda, irmã. Todos os teus confrades te saúdam.»',
      fonte: 'Extratos dos relatos de Meel, aprendiz do Colégio Necromântico — Biblioteca de Saravossa.',
    },
    descricao:
      'Os necromantes são magos que evocam e canalizam a força do Tártaro, o mar de fogo e caos de onde saíram os infernos e os elementos primitivos anteriores aos deuses e aos titãs. É um poder grande, mas caótico, que tudo desgasta e, por fim, corrompe. Boa parte do que o fogo tartáreo alimenta serve à destruição, e não é raro que necromantes velhos e poderosos enlouqueçam pela própria magia; os necroarcanos e os cronoespectros são a prova.\n' +
      'Como o fogo tartáreo pouco se prestava a outra coisa, o colégio se restringiu à necromancia, à tanatologia e, em outros tempos, à demonímia. Ninguém nega que se tornaram muito bons nisso.',
    historia:
      'Rezam as lendas que o colégio nasceu em algum ponto do segundo ciclo, como força de oposição aos Elfos Sombrios e aos seus senhores infernais, que saqueavam as aldeias humanas em busca de um novo lar. Os primeiros necromantes viviam pouco, caçados pelas aberrações dos elfos decaídos tanto quanto os caçavam, e por muito tempo estiveram perto de se extinguir, passando a tocha de mestre a aprendiz.\n' +
      'Então surgiu Gregorius, um mago nato de talento sem explicação. Não se sabe se era humano, elfo ou mestiço, e muitos o tomam por lenda. Trocou saberes com muitas guildas de magos, andou com sacerdotes e exorcistas e estudou a fundo a metafísica e a origem do mundo. Percebeu que o mana livre de Tagmar, farto mas não inesgotável, levaria a magia do colégio ao nível da ilusão, e achou os elos arcanos que permitem tirar Karma do fogo do Tártaro. Muitos protestaram que era o mesmo caminho de Seret e dos seus asseclas, mas Gregorius convenceu a maioria de que o Tártaro era o berço do caos primordial, não um plano infernal. Os dissidentes saíram, por conta própria ou para junto dos ilusionistas primitivos; e há quem diga que algumas vozes tiveram de ser caladas.\n' +
      'Gregorius uniu as guildas dispersas, que o aclamaram primeiro entre iguais, e foi aí que nasceu de fato o Colégio Necromântico. Mas o poder lhe subiu à cabeça. Tomou como aprendizes os magos mais ousados e ambiciosos e com eles formou um capítulo dentro do colégio, os gregorii. Esqueceu a guerra contra os Elfos Sombrios e só quis poder: retendo parte do fogo que invocavam, ele e os seus foram consumidos pelo Tártaro no espírito, como anjos caídos, enquanto o capítulo engolia o colégio. Quando a verdade veio à tona, os necromantes se lançaram numa guerra tão sangrenta que até hoje a chamam de Cisma Flamejante. Gregorius foi destruído e os gregorii, dispersos, mas o colégio ficou sem lar e evitado pelos outros magos.\n' +
      'Desde então os necromantes são vistos como desertores da luta contra os infernos, temerários que trocam a alma pela imortalidade e barganham segredos em tumbas profanadas. As ordens religiosas os hostilizam, e os clérigos de Cruine os odeiam abertamente como hereges e simoníacos. O ateísmo da confraria só piora essa fama. Mas ninguém enxerga o escuro tão bem quanto quem anda nele: os necromantes vigiam as próprias fileiras com rigor, e quem decai recebe o nome de gregorii e é caçado até o fim.',
    locais: [
      { nome: 'Laboratórios dos mestres', onde: 'Por toda Tagmar',
        texto: 'Por viverem sob desconfiança, os necromantes não deixam registro dos seus capítulos. Cada mago tem o seu laboratório, onde recebe aprendizes e confrades, e cada casa, ou melhor, cada esconderijo, faz as vezes de capítulo.' },
      { nome: 'Terras Selvagens', onde: 'Ao sul da Muralha de Goguista',
        texto: 'Ao contrário dos outros colégios, os necromantes se concentram no sul: vivem entre os nômades como curandeiros das tribos.' },
      { nome: 'Geleiras', onde: 'Terras Selvagens',
        texto: 'Em menor número, mas cada vez mais presentes, patrulham a região e estudam as emanações de poderes malignos que vêm dela.' },
      { nome: 'Uno', onde: 'Os Mangues',
        texto: 'Alguns necromantes chegam disfarçados e se estabelecem ali, acolhidos pelo líder local, Edil.' },
      { nome: 'Torre dos Necromânticos', onde: 'Telas',
        texto: 'O único lugar público do colégio, seu quartel-general e principal trincheira na guerra das sombras contra os Elfos Sombrios e toda criatura decaída das vizinhanças do Domo de Arminus.' },
      { nome: 'Torre de Ébano', onde: 'Estepes Vítreas',
        texto: 'Erguida para guardar o que restou do saber depois do Cisma Flamejante. Os arquimagos a mantêm em segredo, e nem os próprios necromantes sabem onde fica ou como atravessar as estepes mortais para achá-la. Só se sabe que ali a magia das estepes foi anulada, e que ao redor da torre há água, terra e plantas.' },
      { nome: 'Floresta de Edelnur', onde: 'Âmiem, na divisa com a Levânia',
        texto: 'O posto mais incerto. Apesar da desconfiança mútua entre necromantes e elfos, ali vigora um pacto de proteção: a floresta abriga criaturas míticas raras, cobiçadas por magos e por coisas piores, e os necromantes ajudam a defendê-la de visitantes noturnos.' },
      { nome: 'Portís', onde: 'Entre os mercadores de Runa e as ruas sombrias de Maginor',
        texto: 'Na magocracia o colégio tem instalações, o que é óbvio, mas mal registrado.' },
      { nome: 'A casa do beco', onde: 'Saravossa, Calco',
        texto: 'Longe da área dos templos, por motivos claros, uma casa no fundo de um beco escuro e sem saída, no subúrbio, abriga todo necromante que precise de pouso na capital do grande continente.' },
    ],
    simbolos:
      'Ao contrário do que se pensa, os necromantes não usam caveiras nem sinais da mortalidade, óbvios demais e contrários à sua crença. O brasão do colégio é um tomo aberto, que é o conhecimento, encimado por uma estrela, que é a consciência livre e em expansão. Cada membro recebe um anel de opala polida com uma estrela de prata engastada por cima: a mente que vence a noite da morte.',
    objetivos:
      'Para os necromantes, a morte interrompe a livre expansão da consciência, e por isso eles buscam alongar a vida ao máximo. Os segredos que podem prolongá-la, ou levar à imortalidade, estão escondidos além da barreira dos reinos da morte, guardada pelas hostes de Cruine. O fogo tartáreo queima essa barreira e abre pequenas brechas, pelas quais os necromantes falam com os mortos e buscam os segredos da iluminação. Quase todos dizem respeito a como os reinos da vida e da morte se entrelaçam: tanatologia, animação de cadáveres, domínio dos desmortos, degraus no caminho que adia, e talvez detenha, o trabalho das parcas.\n' +
      'Cada necromante tem o dever sagrado de buscar a imortalidade e partilhar o que achar com os irmãos. Seus experimentos procuram aumentar a vida num corpo vivo; tornar-se morto-vivo é um erro lamentável, porque não se chega à imortalidade abraçando a morte primeiro. Vampiros, cronoespectros e necroarcanos podem ser destruídos e são ícones de decadência: são declarados gregorii e destruídos, ou usados como matéria de experimento, o que for mais conveniente.',
    admissao:
      'O candidato precisa de mente inquisitiva e livre de preconceitos, de dedicação, de confiança em si e de coragem para procurar a imortalidade pelos caminhos tortos da morte. Dar as costas ao amparo dos deuses não é para fracos nem para quem vive do prazer. O necromante é prático, e o seu trabalho de laboratório é visto, na melhor das hipóteses, como coisa de gente arredia; o seu caminho é o dos solitários.\n' +
      'Quase todos são humanos. Anões e pequeninos não gostam de magia que não venha dos deuses e vivem em culturas religiosas. Os elfos e os meio-elfos o colégio aceita com muita hesitação, talvez pela lembrança antiga dos Elfos Sombrios que caçavam os primeiros necromantes, talvez por uma inveja calada da longevidade élfica.\n' +
      'A entrada se sela com o anel. Quem o recusa segue o seu caminho e não torna a ver o mestre; e qualquer outro necromante que encontre só falará por si mesmo, não pela confraria.',
    etica:
      'O colégio ensina que os deuses são seres de um ciclo anterior ao de agora, cuja consciência se expandiu até a transcendência; e que, por motivos seus, prendem os mortais numa roda de morte e renascimento que os faz perder tudo o que conquistaram nas vidas passadas. Os necromantes creem nos deuses, pois só um tolo não creria, mas são ateus por convicção: ateu, para eles, é quem não tem deus nem se submete a um, porque quer sair da roda das encarnações atravessando-a, não girar nela para sempre.\n' +
      'Não são monstros egoístas. A busca da imortalidade é uma cruzada pela libertação de todos os seres que pensam e hoje estão sujeitos às parcas. O problema é que vão muito longe por ela, e quem se põe no caminho é atingido sem dó em nome do bem comum. Diante dos mortos-vivos são mais tolerantes que as outras ordens de Tagmar, mas o confrade que abraça o vampirismo, o necroarcanismo ou qualquer outra morte em vida vira inimigo mortal: não há transcendência para monstros, e a iluminação só chega às consciências vivas.\n' +
      'Nabu dá ao aprendiz cinco regras. O culto aos deuses cega para a transcendência, e submeter-se à morte é entregar-se ao ciclo do esquecimento. Conhecer a morte, no corpo e além dele, é o primeiro passo para adiá-la e por fim evitá-la, não por si, mas por todos os que vivem e pensam. Quem tiver de se curvar à morte que o faça com dignidade, pois os deuses não podem destruir uma alma da mesma natureza que a deles, e haverá nova chance; mas quem buscar a morte em vida estará morto para o colégio. Invocar os não-nascidos, os demônios, é hoje crime tão grave quanto a morte em vida: não se pergunta, não se contesta, obedece-se. E guarda-se silêncio sobre o próprio poder, até diante dos amigos mais íntimos.\n' +
      'A proibição dos demônios é recente. Em outros tempos o fogo tartáreo abria brechas na trama das dimensões e permitia invocá-los, até que algo acontecido num capítulo do colégio em Calco fez sair um édito que proíbe de vez essas práticas. Os aprendizes novos nem conhecem as magias que as tornavam possíveis, e os antigos obedecem sem questionar. Ao menos é o que parece.\n' +
      'O segredo, que toda ordem guarda, eles precisam dele em dobro. E a tristeza os alcança tão depressa quanto a qualquer criatura: a maior parte dos necromantes são figuras trágicas e solitárias, que acalentam lembranças distantes de amizade.',
    organizacao:
      'A organização é ampla, mas simples. A célula básica é um aprendiz e o seu tutor, necromante pleno e experiente que ainda não tem o título de mestre. Os mestres andaram longos anos pelo caminho das sombras e conhecem a fundo os mistérios além da barreira de Cruine. O título mais alto é o de arquinecromante, e só um deles anda pelo mundo levando a todos a vontade do conselho: o Encapuzado, a voz que guia os membros sujeitos aos arquinecromantes.',
    liderancas: [
      { nome: 'Nabu, o Encapuzado', cargo: 'Voz dos arquinecromantes',
        texto: 'Ninguém sabe se o colégio tem um só chefe ou um conselho; os membros só sabem que a voz da liderança chega por Nabu. Tutelas, títulos de mestre, reconhecimento de feitos, tudo vem dele, em pessoa ou por mensageiros que levam cartas marcadas com a sua assinatura mística, impossível de falsificar. Ele parece estar em toda parte, e muitos se perguntam se Nabu não é um nome inventado pelos arquinecromantes e vestido pelos seus mensageiros com a magia certa, ou com ilusão. O certo é que nunca se soube de um aspirante enganado por alguém que se passasse por ele, sejam quais forem os meios com que desencoraja as tentativas. Dizem que tem parentesco de sangue com Harlam, o Corvo da Tempestade, dos naturalistas, e a antipatia entre os dois é notória; Victor, o Ibendraco, que acompanha Harlam, é filho de Nabu.' },
    ],
    rumores: [
      { nome: 'Guerra santa contra os necromantes',
        texto: 'Um grupo crescente de sacerdotes de Cruine, farto da filosofia do colégio, que tem por demoníaca, pressiona os templos de Cruine, Maira e Crizagom para que declarem os necromantes hereges, e já se fala em guerra santa para expurgá-los de Tagmar. Diz-se que a Ordem da Noite Eterna paga espiões e aventureiros para descobrir quem são os membros e como reconhecê-los, e que alguns já foram caçados e mortos.' },
      { nome: 'A ruína dos Três Malditos',
        texto: 'Um grupo de aventureiros sabe onde fica a ruína dos Três Malditos, os necromantes a quem se atribui a criação da primeira Abominação. Ali estaria a primeira versão do ritual, que permitiria erguer um exército de mortos e responderia a muitas outras perguntas. O próprio Nabu estaria buscando voluntários para investigar.' },
      { nome: 'Os gregorii se espalham',
        texto: 'Cada vez mais necromantes recebem a visita de um corvo negro com uma mensagem e instruções secretas. Os escolhidos cumprem pequenas tarefas e, se se mostram dignos, ganham acesso aos mistérios da mais poderosa e terrível cabala necromante, os gregorii. Outros grupos de exploradores também vêm sendo chamados, aos poucos, para missões a serviço dela.' },
      { nome: 'Contratam-se aventureiros',
        texto: 'Necromantes pagam muito bem a quem se dispuser a ir além das Geleiras, às regiões em que hostes de mortos-vivos tomam os Mangues. Sejam quais forem os poderes por trás da Terra dos Mortos, um necromante tem muito a aprender ali. Mas cada vez menos grupos voltam.' },
      { nome: 'Aliança entre colégios',
        texto: 'Dizem que os colégios Naturalista e Necromântico forjam uma aliança histórica contra um necroarcano poderoso que assola vastas florestas dos Reinos Conhecidos, com terríveis Abominações feitas de corpos de animais. Nabu e Harlam, o Corvo da Tempestade, estariam ambos mandando grupos de heróis como batedores atrás do covil.' },
      { nome: 'A aliança sombria',
        texto: 'Há quem diga que a maior parte dos necromantes já serve aos gregorii, e que o colégio está prestes a se aliar aos Bankdi: receberia deles o segredo da vida eterna dos demônios em troca das chaves de todo o poder do Tártaro. Os que pensam assim já andam com cultistas e elfos negros, e nas sombras se começa a falar do Dia da Vingança, quando os gregorii e os seus novos aliados expurgarão os velhos mestres e os seus pupilos.' },
    ],
  },
];

function tipoDoGrupo(g, lang) {
  const t = GRUPO_TIPOS[g && g.tipo];
  return t ? (lang === 'en' ? t.en : t.pt) : '';
}

Object.assign(window, { GRUPOS, GRUPO_TIPOS, tipoDoGrupo });
