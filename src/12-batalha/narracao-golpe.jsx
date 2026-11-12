/* ============================================================
   narracao-golpe.jsx — a narração do golpe para o Mestre (11/11/2026)
   ============================================================
   Usuário: "Adicione para a notificação do mestre, a narração personalizada
   da ação do combatente. Crie pelo menos três frases para cada tipo de
   arma/magia VS cada tipo de defesa." E, na segunda rodada: "Melhore a
   descrição dos golpes, deixe a narração mais fluida, mais humanizada e mais
   emocionante."

   A narração tem duas partes, que se leem como uma cena só:
     1. o ENCONTRO — o tipo do ataque contra a armadura do alvo. Quatro tipos
        de golpe (corte, perfuração, esmagamento, desarmado/natural) e sete de
        magia (fogo, água, ar, terra, luz, trevas e a magia sem elemento),
        contra armadura leve (couro), média (malha) e pesada (placas): 11 × 3
        combinações, três frases cada. O encontro mostra o gesto e o corpo de
        quem ataca, e para no instante antes do impacto — não diz se acertou;
     2. o DESFECHO — errou, falha crítica, a armadura segurou, a energia
        heroica segurou, feriu o corpo, crítico. Ferido e crítico têm frases
        próprias para cada tipo de golpe e para a magia; os outros valem para
        todos. Três frases cada, no mínimo.
   A voz (skill cronista-de-tagmar): registro medieval com sintaxe de hoje,
   um detalhe que se vê, se ouve ou se cheira, frases de tamanhos variados,
   sem exclamação e sem palavra moderna.
   {a} é quem age, {b} o alvo (primeiros nomes). A frase é sorteada na hora
   do golpe e GRAVADA no meta do evento (meta.narracao): o Mestre lê a mesma
   no card e no histórico, sem sortear de novo.

   Exposto via: window.narrarGolpe, window.NARRACAO_GOLPE
   Consumido por: 12-batalha/batalha.jsx (meta do registrar_evento_mesa) e
   10-shell/shell.jsx (o card do Mestre mostra meta.narracao).
   ============================================================ */

const NARRACAO_ENCONTRO = {
  CORTE: {
    L: [
      '{a} gira o corpo inteiro no golpe, e a lâmina desce num arco largo, buscando as costuras do gibão de {b}.',
      'Um passo à frente, uma finta curta, e o fio de {a} vem de revés, rente ao couro de {b}.',
      '{a} solta um grito rouco e corta na diagonal, do ombro ao quadril, onde o couro de {b} já está gasto.',
    ],
    M: [
      '{a} ergue a lâmina acima da cabeça e a deixa cair com todo o peso sobre os elos da malha de {b}.',
      'O aço de {a} risca o ar em dois tempos, e no segundo procura a fresta da cota sob o braço de {b}.',
      '{a} avança de lado, curto e rápido, e o fio corre contra a malha de {b} arrancando faíscas dos anéis.',
    ],
    P: [
      '{a} estuda as placas de {b} por um instante e corta onde o aço não cobre, na dobra do joelho.',
      'A lâmina de {a} sobe num arco paciente, mirando a fresta entre o elmo e a gola de {b}.',
      '{a} respira fundo e desfere um golpe de cima, que encontra o ombreiro de {b} com um estalo de sino.',
    ],
  },
  PERFURACAO: {
    L: [
      '{a} encolhe o corpo e estoca de baixo para cima, a ponta direto no couro sobre o peito de {b}.',
      'A corda vibra junto ao rosto de {a}, e a flecha atravessa o campo em linha reta até {b}.',
      '{a} recua meio passo, engana com o ombro e dá o bote, buscando varar o gibão de {b}.',
    ],
    M: [
      '{a} firma os pés e estoca com o peso do corpo, forçando a ponta entre os elos da malha de {b}.',
      '{a} solta o disparo num sopro, e o projétil corre baixo, rente ao chão, contra a cota de {b}.',
      'A ponta de {a} procura o único lugar onde a malha de {b} se abre: debaixo do braço erguido.',
    ],
    P: [
      '{a} espera, paciente como um caçador, e estoca no instante em que {b} levanta a viseira para respirar.',
      'O virote de {a} parte com um estalo seco e voa direto contra as placas de {b}.',
      '{a} gira em volta de {b}, sem pressa, e crava a ponta na junta do cotovelo, a única fresta à vista.',
    ],
  },
  ESMAGAMENTO: {
    L: [
      '{a} gira a arma pesada duas vezes no ar e a deixa cair sobre as costelas de {b}.',
      'Com as duas mãos no cabo, {a} desce a pancada de cima, sem pressa e sem piedade, contra {b}.',
      '{a} acerta de lado, um golpe largo e baixo que mira o quadril de {b}, onde o couro não segura nada.',
    ],
    M: [
      '{a} carrega o golpe desde as costas e o solta contra a malha de {b}, que pouco pode contra tanto peso.',
      'A arma de {a} desce como um martelo na bigorna, e a cota de {b} tilinta sob o impacto.',
      '{a} bate de baixo para cima, querendo dobrar {b} dentro da própria malha.',
    ],
    P: [
      '{a} descarrega a arma no elmo de {b}, e o som ecoa pelo campo como o de um sino rachado.',
      'O golpe de {a} encontra as placas de {b} de frente, e o aço range ao se curvar.',
      '{a} mira o ombro de {b} com toda a força, tentando derrubar o guerreiro dentro da própria armadura.',
    ],
  },
  DESARMADO: {
    L: [
      '{a} avança de mãos nuas, sem cerimônia, e se lança contra {b} com tudo o que tem.',
      'Num bote de bicho acuado, {a} salta sobre {b}, as garras abertas em direção ao pescoço.',
      '{a} fecha a distância num piscar de olhos e ataca o couro de {b} com punhos, dentes ou unhas.',
    ],
    M: [
      '{a} agarra a malha de {b} com as duas mãos, procurando carne por baixo dos elos.',
      'O ataque de {a} vem bruto e sem técnica, uma força de fera que bate contra a cota de {b}.',
      '{a} investe com o corpo inteiro, ombro à frente, para derrubar {b} e sua malha no chão.',
    ],
    P: [
      '{a} arranha e morde as placas de {b}, furioso, à procura de qualquer brecha no aço.',
      'Sem arma nenhuma, {a} se atira contra {b}, decidido a derrubar o peso das placas.',
      '{a} acerta o aço de {b} com tanta raiva que o choque sobe pelo próprio braço.',
    ],
  },
  fogo: {
    L: [
      '{a} abre as mãos e o fogo nasce entre os dedos, saltando como um animal faminto sobre o couro de {b}.',
      'Um clarão alaranjado ilumina o rosto de {a}, e a labareda corre o campo até {b}, deixando no ar o cheiro de couro chamuscado.',
      '{a} sopra sobre a palma, e uma língua de chamas se desenrola na direção de {b}.',
    ],
    M: [
      'As chamas de {a} se enroscam na malha de {b}, e os elos começam a avermelhar.',
      '{a} ergue o braço e a labareda desce em arco, envolvendo a cota de {b} num abraço quente.',
      'O fogo de {a} ruge baixo, como uma forja aberta, e corre em busca da malha de {b}.',
    ],
    P: [
      '{a} conjura um turbilhão de fogo que se fecha sobre {b}, transformando as placas num forno.',
      'As chamas de {a} cobrem o aço de {b}, e o metal brilha rubro sob o calor.',
      '{a} grita a palavra de poder, e o fogo desaba sobre {b} como se o céu tivesse se incendiado.',
    ],
  },
  agua: {
    L: [
      '{a} ergue a mão, e uma onda se forma do nada e desaba sobre {b}, encharcando o couro.',
      'A água conjurada por {a} estala contra {b} como um chicote gelado, rápida demais para se ver.',
      '{a} abre os braços, e uma torrente nasce entre suas mãos com a força de um rio na cheia, direto contra {b}.',
    ],
    M: [
      'A água de {a} escorre entre os elos da malha de {b}, fria como o fundo de um lago no inverno.',
      '{a} lança uma rajada d\'água que bate na cota de {b} e a deixa pesada como chumbo.',
      'Uma correnteza nasce aos pés de {a} e avança, arrastando {b} pela malha encharcada.',
    ],
    P: [
      'A água de {a} invade cada fresta das placas de {b}, gelada e implacável.',
      '{a} conjura uma vaga que bate nas placas de {b} como o mar contra o rochedo.',
      'Uma muralha d\'água se ergue diante de {a} e desaba sobre {b}, e o aço não oferece abrigo.',
    ],
  },
  ar: {
    L: [
      'O vento obedece a {a} e se fecha sobre {b} como uma mão invisível, arrancando-lhe o fôlego.',
      '{a} estala os dedos, e um raio corta o céu num risco branco até o peito de {b}.',
      'Um vendaval nasce das mãos de {a} e chicoteia {b}, que mal consegue se manter de pé.',
    ],
    M: [
      'O relâmpago de {a} desce sobre {b} e corre pelos elos da malha como fogo azul.',
      '{a} chama a tempestade, e o trovão estoura tão perto que o chão treme sob {b}.',
      'Uma rajada de {a} empurra {b} para trás, e a cota tilinta como guizos ao vento.',
    ],
    P: [
      'O raio de {a} encontra as placas de {b}, e por um instante o aço inteiro brilha.',
      '{a} solta o trovão, e a armadura de {b} chama o relâmpago para si.',
      'O vento de {a} uiva contra {b}, que finca os pés no chão sob o peso das placas.',
    ],
  },
  terra: {
    L: [
      'O chão se parte aos pés de {b} ao comando de {a}, e lascas de pedra saltam como facas.',
      '{a} arranca um bloco de rocha da terra com um gesto e o arremessa contra {b}.',
      'Espinhos de pedra brotam do solo sob {b}, chamados pela voz grave de {a}.',
    ],
    M: [
      'A terra treme ao chamado de {a}, e uma chuva de pedras martela a malha de {b}.',
      '{a} fecha o punho, e o solo agarra as pernas de {b} como mãos de lama.',
      'Um punho de rocha se ergue diante de {a} e avança contra a cota de {b}.',
    ],
    P: [
      '{a} ergue um pilar de rocha sob {b}, e o peso das placas não ajuda em nada.',
      '{a} bate o pé no chão, e a terra se abre sob {b}, que afunda com todo o seu aço.',
      'A pedra conjurada por {a} bate nas placas de {b} como um aríete contra o portão.',
    ],
  },
  luz: {
    L: [
      '{a} ergue a voz numa prece curta, e uma lança de luz atravessa o campo até {b}.',
      'Um clarão sagrado parte das mãos de {a}, quente como o sol do meio-dia sobre {b}.',
      'A luz de {a} rasga a sombra em volta de {b}, e não há onde se esconder dela.',
    ],
    M: [
      'O brilho de {a} se reflete em cada elo da malha de {b}, até que a cota inteira arde em branco.',
      '{a} invoca a luz, e ela atravessa a malha de {b} como se o ferro não existisse.',
      'Uma coluna de luz desce do alto sobre {b}, chamada pela fé de {a}.',
    ],
    P: [
      'A luz de {a} faz as placas de {b} brilharem tanto que quem olha precisa desviar os olhos.',
      '{a} invoca o céu, e nem todo o aço de {b} esconde ninguém daquela claridade.',
      'Um raio sagrado parte de {a}, encontra a armadura de {b} e a envolve em fulgor.',
    ],
  },
  trevas: {
    L: [
      'As sombras de {a} se esgueiram pelo chão e sobem pelas pernas de {b}, frias como mãos de defunto.',
      '{a} murmura palavras que ninguém deveria ouvir, e uma névoa negra se fecha sobre {b}.',
      'Uma garra feita de escuridão nasce das costas de {a} e rasga o ar até {b}.',
    ],
    M: [
      'As trevas de {a} escorrem entre os elos da malha de {b} como piche quente.',
      '{a} chama a escuridão, e ela abraça {b} com um frio que nenhuma cota detém.',
      'Uma sombra viva desprende-se de {a} e atravessa a malha de {b} sem tocar o ferro.',
    ],
    P: [
      'A escuridão de {a} se infiltra pelas frestas das placas de {b}, procurando o que há dentro.',
      '{a} chama o vazio, e o aço de {b} escurece como se a noite o tocasse.',
      'Um sopro de trevas sai da boca de {a} e envolve {b}, e nem as placas o fazem recuar.',
    ],
  },
  arcano: {
    L: [
      '{a} traça runas no ar com dois dedos, e a energia dispara num risco pálido contra {b}.',
      'O ar estremece em volta de {a}, e um feixe de pura magia parte em direção a {b}.',
      '{a} pronuncia a última sílaba, e uma força invisível atravessa o campo até {b}.',
    ],
    M: [
      'A magia de {a} faz a malha de {b} vibrar como uma corda tensa.',
      '{a} solta a energia que vinha guardando, e ela procura {b} por entre os elos.',
      'Um lampejo parte das mãos de {a} e se crava na cota de {b}.',
    ],
    P: [
      'A força de {a} bate nas placas de {b} sem precisar de fresta nenhuma.',
      '{a} conjura, e o próprio ar em volta de {b} se dobra contra o aço.',
      'A magia de {a} ignora o peso das placas e busca {b} por dentro.',
    ],
  },
};

/* O desfecho comum a todos os golpes. */
const NARRACAO_DESFECHO = {
  errou: [
    'Mas {b} lê o golpe no último instante, gira o corpo, e o ataque morde só o vento.',
    '{b} recua meio passo, e o ataque passa a um palmo do rosto.',
    'Por um fio de cabelo, nada: {b} desvia e já se prepara para responder.',
  ],
  falha: [
    'Mas o pé de {a} escorrega, o golpe sai torto, e é o próprio {a} quem paga pelo descuido.',
    'O ataque foge ao controle de {a} e se volta contra quem o lançou, num gesto que a mesa inteira vai lembrar.',
    'Tudo dá errado de uma vez: {a} perde o equilíbrio, tropeça e se fere.',
  ],
  armadura: [
    'A armadura de {b} faz o seu trabalho e segura o golpe inteiro; {b} nem pisca.',
    'O impacto morre na proteção de {b}, que apenas ajeita a postura e encara {a}.',
    'Um baque surdo, e nada mais: a armadura de {b} engole o golpe.',
  ],
  heroica: [
    '{b} gira junto com o golpe e o recebe de raspão, gastando fôlego, mas sem sangrar.',
    'O ataque cansa {b}, que perde o ar por um instante e ainda assim se mantém inteiro.',
    'Por reflexo e um pouco de sorte, {b} apara o pior; o golpe custa fôlego, não sangue.',
  ],
  ferido: [
    'O golpe atravessa a defesa de {b} e encontra a carne.',
    '{b} cambaleia, e um fio vermelho começa a escorrer.',
    'Desta vez passa: {b} solta um gemido e aperta o ferimento.',
  ],
  critico: [
    'É um golpe perfeito, daqueles que os bardos cantam depois, e {b} sente cada pedaço dele.',
    'O tempo parece parar: o ataque encontra {b} em cheio, no pior lugar possível.',
    'Nada poderia ter sido melhor. O golpe chega a {b} com toda a força, e por um instante o campo inteiro silencia.',
  ],
};

/* Ferido e crítico têm a voz de cada golpe (11/11/2026, "mais humanizada"):
   a lâmina abre, a ponta crava, o porrete quebra, a fera rasga, a magia
   queima. O que não está aqui usa o desfecho comum. */
const NARRACAO_DESFECHO_DO_GOLPE = {
  CORTE: {
    ferido: [
      'A lâmina passa, e um talho se abre no corpo de {b}, vermelho e quente.',
      '{b} sente o fio frio do aço, e logo depois o calor do sangue.',
      'O corte encontra a pele de {b}, que aperta os dentes para não gritar.',
    ],
    critico: [
      'O fio entra fundo, e {b} cai de joelhos com um grito que ecoa pelo campo.',
      'Um corte limpo e terrível: {b} leva a mão ao ferimento e encontra só sangue.',
      'A lâmina de {a} desenha uma linha vermelha que {b} vai carregar pelo resto da vida.',
    ],
  },
  PERFURACAO: {
    ferido: [
      'A ponta crava, e {b} solta o ar de uma vez.',
      '{b} sente a perfuração como uma brasa entrando no corpo.',
      'A ponta passa a defesa e se aloja em {b}, que recua com a mão no ferimento.',
    ],
    critico: [
      'A ponta entra inteira, e {b} arregala os olhos, sem voz para gritar.',
      'O golpe atravessa {b} de lado a lado, num instante que parece durar uma eternidade.',
      'Direto no ponto fraco: {b} se curva sobre o ferimento, lutando para respirar.',
    ],
  },
  ESMAGAMENTO: {
    ferido: [
      'Ouve-se o estalo de algo quebrando, e {b} se curva de dor.',
      'A pancada tira o ar de {b}, que cambaleia, tonto.',
      'O impacto atravessa a defesa e sacode {b} até os ossos.',
    ],
    critico: [
      'O golpe acerta em cheio, e o som dos ossos de {b} se partindo silencia o campo.',
      '{b} voa para trás e bate no chão, atordoado, o mundo girando.',
      'Uma pancada que derrubaria um touro: {b} perde o chão sob os pés.',
    ],
  },
  DESARMADO: {
    ferido: [
      'As garras ou os dentes encontram carne, e {b} grita de dor.',
      'O golpe bruto de {a} arranca sangue de {b}.',
      '{b} sente o peso do ataque e um ardor que não vai passar tão cedo.',
    ],
    critico: [
      '{a} rasga {b} com uma fúria que só os bichos conhecem.',
      'O ataque acerta onde dói mais, e {b} cai, ofegante.',
      'Com força de fera, {a} derruba {b}, que fica no chão sem ar.',
    ],
  },
  magia: {
    ferido: [
      'A magia atravessa a defesa, e {b} sente o corpo queimar por dentro.',
      '{b} grita quando o poder o alcança e deixa a sua marca na pele.',
      'O encanto encontra {b}, que cambaleia, a vista turva.',
    ],
    critico: [
      'A magia explode sobre {b} com toda a fúria, e por um momento ninguém consegue olhar.',
      'O poder de {a} toma conta de {b}, que cai com o corpo tremendo.',
      'É uma conjuração perfeita, das que se contam nas tavernas, e {b} sente cada fibra dela.',
    ],
  },
};

/* O elemento da magia em uma das sete famílias da narração. */
function familiaDoElemento(el) {
  const k = String(el || '').split(',')[0].trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (k === 'fogo' || k === 'agua' || k === 'ar' || k === 'terra') return k;
  if (k === 'luz' || k === 'celestial') return 'luz';
  if (k === 'escuridao' || k === 'trevas' || k === 'infernal') return 'trevas';
  return 'arcano';
}

/* Qual desfecho: errou, falha crítica, só a armadura, só a energia heroica,
   chegou ao corpo; o crítico vem por cima de um acerto. */
function desfechoDoGolpe({ resultado, dano, onde, critico }) {
  const r = resultado || {};
  if (r.codigo === 'FC') return 'falha';
  if (r.erra) return 'errou';
  if (critico) return 'critico';
  if (!(Number(dano) > 0)) return 'armadura';
  const ef = Math.max(0, Number(onde && onde.ef) || 0);
  const eh = Math.max(0, Number(onde && onde.eh) || 0);
  if (ef > 0) return 'ferido';
  if (eh > 0) return 'heroica';
  return 'armadura';
}

function primeiroNomeNarr(n) {
  return String(n || '').trim().split(/\s+/)[0] || '';
}

/* As frases do desfecho para este golpe: as dele, se tiver; senão, as comuns. */
function desfechosPara(tipo, golpeTipo, fim) {
  const voz = NARRACAO_DESFECHO_DO_GOLPE[tipo === 'magia' ? 'magia' : golpeTipo];
  return (voz && voz[fim]) || NARRACAO_DESFECHO[fim];
}

/* A narração do golpe. `sortear` (0..1) é injetável para os testes. */
function narrarGolpe({ tipo, golpeTipo, elemento, defesaSigla, autorNome, alvoNome, resultado, dano, onde, critico, sortear } = {}) {
  const rnd = typeof sortear === 'function' ? sortear : Math.random;
  const pick = (lista) => lista[Math.min(lista.length - 1, Math.floor(rnd() * lista.length))];
  const golpe = NARRACAO_ENCONTRO[golpeTipo] ? golpeTipo : 'DESARMADO';
  const fam = tipo === 'magia' ? familiaDoElemento(elemento) : golpe;
  const def = ['L', 'M', 'P'].includes(String(defesaSigla || '').toUpperCase()) ? String(defesaSigla).toUpperCase() : 'L';
  const fim = desfechoDoGolpe({ resultado, dano, onde, critico });
  const a = primeiroNomeNarr(autorNome);
  const b = primeiroNomeNarr(alvoNome);
  const preencher = (s) => s.replace(/\{a\}/g, a).replace(/\{b\}/g, b);
  return preencher(pick(NARRACAO_ENCONTRO[fam][def])) + ' ' + preencher(pick(desfechosPara(tipo, golpe, fim)));
}

Object.assign(window, {
  narrarGolpe,
  NARRACAO_GOLPE: {
    encontro: NARRACAO_ENCONTRO, desfecho: NARRACAO_DESFECHO, desfechoDoGolpe: NARRACAO_DESFECHO_DO_GOLPE,
    familiaDoElemento, qualDesfecho: desfechoDoGolpe,
  },
});
