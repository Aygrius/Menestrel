/* ============================================================
   narracao-golpe.jsx — a narração do golpe para o Mestre (11/11/2026)
   ============================================================
   Usuário: "Adicione para a notificação do mestre, a narração personalizada
   da ação do combatente. Crie pelo menos três frases para cada tipo de
   arma/magia VS cada tipo de defesa."

   A narração tem duas partes:
     1. o ENCONTRO — o tipo do ataque contra a armadura do alvo. Quatro tipos
        de golpe (corte, perfuração, esmagamento, desarmado/natural) e sete de
        magia (fogo, água, ar, terra, luz, trevas e a magia sem elemento),
        contra armadura leve (couro), média (malha) e pesada (placas): 11 × 3
        combinações, três frases cada. A frase não diz se acertou;
     2. o DESFECHO — errou, a energia heroica segurou, a armadura segurou,
        feriu o corpo, crítico ou falha crítica. Três frases cada.
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
      '{a} desce a lâmina num arco largo, e o fio busca as costuras do couro de {b}.',
      'O aço de {a} assobia baixo e rasga o ar rente ao gibão de couro de {b}.',
      '{a} finta à esquerda e corta de revés, mirando onde o couro de {b} é mais fino.',
    ],
    M: [
      '{a} golpeia de cima, e a lâmina procura os elos da malha de {b}.',
      'O fio de {a} raspa a cota de {b}, arrancando faíscas dos anéis de ferro.',
      '{a} corta na diagonal, tentando abrir caminho entre os elos da armadura de {b}.',
    ],
    P: [
      '{a} mira as juntas das placas de {b}, onde o aço não cobre.',
      'A lâmina de {a} encontra o peitoral de {b} com um estalo que ecoa pelo campo.',
      '{a} busca a fresta entre o elmo e a gola de placas de {b}.',
    ],
  },
  PERFURACAO: {
    L: [
      '{a} estoca firme, e a ponta procura o couro sobre o peito de {b}.',
      'Um disparo certeiro de {a} corta o ar em direção ao gibão de {b}.',
      '{a} avança num bote curto, buscando varar o couro de {b}.',
    ],
    M: [
      '{a} estoca direto, e a ponta tenta forçar caminho entre os elos da malha de {b}.',
      'O projétil de {a} voa reto contra a cota de {b}.',
      '{a} mira o espaço onde a malha de {b} se abre, sob o braço.',
    ],
    P: [
      '{a} procura a viseira de {b} com a ponta, paciente como um caçador.',
      'O disparo de {a} encontra as placas de {b} num baque seco.',
      '{a} estoca contra a junta do cotovelo de {b}, a única fresta à vista.',
    ],
  },
  ESMAGAMENTO: {
    L: [
      '{a} gira a arma pesada e a deixa cair sobre o couro de {b}.',
      'O impacto de {a} vem de lado, sem pressa, contra as costelas de {b}.',
      '{a} ergue a arma acima da cabeça e desce com todo o peso sobre {b}.',
    ],
    M: [
      '{a} martela contra a malha de {b}, que pouco faz contra o peso do golpe.',
      'A pancada de {a} faz a cota de {b} tilintar como um sino rachado.',
      '{a} acerta de baixo para cima, querendo dobrar {b} dentro da própria malha.',
    ],
    P: [
      '{a} descarrega a arma no elmo de {b}, e o metal ressoa como uma bigorna.',
      'O golpe de {a} amassa as placas de {b} com um rangido de ferro torcido.',
      '{a} bate no ombro de {b}, buscando derrubar o guerreiro dentro da armadura.',
    ],
  },
  DESARMADO: {
    L: [
      '{a} avança de mãos nuas, garras ou presas, direto contra o couro de {b}.',
      'Um bote rápido de {a} busca o pescoço de {b}, por cima do gibão.',
      '{a} se lança num ataque bruto, sem arma nem cerimônia, contra {b}.',
    ],
    M: [
      '{a} agarra a malha de {b} e tenta encontrar carne por baixo dos elos.',
      'O ataque de {a} bate contra a cota de {b} com força de besta acuada.',
      '{a} investe com o corpo inteiro, procurando derrubar {b} e sua malha.',
    ],
    P: [
      '{a} arranha e morde as placas de {b}, à procura de qualquer brecha.',
      'O golpe de {a} estala contra o aço de {b}, que mal estremece.',
      '{a} se atira contra {b}, tentando derrubar o peso das placas.',
    ],
  },
  fogo: {
    L: [
      'As chamas de {a} saltam como um animal faminto sobre o couro de {b}.',
      '{a} abre as mãos e o fogo ruge, lambendo o gibão de {b}.',
      'Um clarão alaranjado parte de {a}, e o cheiro de couro queimado envolve {b}.',
    ],
    M: [
      'O fogo de {a} se enrosca na malha de {b}, e os elos começam a avermelhar.',
      '{a} conjura uma língua de chamas que envolve a cota de {b}.',
      'As labaredas de {a} encontram a malha de {b}, e o ferro arde sobre a pele.',
    ],
    P: [
      'As chamas de {a} cobrem as placas de {b}, transformando a armadura num forno.',
      '{a} lança o fogo, e o aço de {b} brilha rubro sob o calor.',
      'Um turbilhão de fogo parte de {a} e se fecha sobre {b} e suas placas.',
    ],
  },
  agua: {
    L: [
      'Uma onda conjurada por {a} desaba sobre {b}, encharcando o couro.',
      '{a} ergue a mão e a água vem como um chicote gelado contra {b}.',
      'Uma torrente parte de {a} e golpeia {b} com a força de um rio cheio.',
    ],
    M: [
      'A água de {a} escorre entre os elos da malha de {b}, fria como o fundo de um lago.',
      '{a} lança uma rajada d\'água que faz a cota de {b} pesar como chumbo.',
      'Uma correnteza mágica de {a} arrasta {b} pela malha encharcada.',
    ],
    P: [
      'A água de {a} invade as frestas das placas de {b}, gelada e implacável.',
      '{a} conjura uma vaga que bate nas placas de {b} como mar contra o rochedo.',
      'Uma muralha d\'água de {a} desaba sobre {b}, e o aço não a detém.',
    ],
  },
  ar: {
    L: [
      'Um vendaval conjurado por {a} chicoteia {b}, arrancando-lhe o fôlego.',
      '{a} estala os dedos e um raio corta o ar até o couro de {b}.',
      'O vento de {a} uiva e se fecha sobre {b} como uma mão invisível.',
    ],
    M: [
      'O raio de {a} encontra a malha de {b}, e a corrente corre pelos elos de ferro.',
      'Uma rajada de {a} empurra {b}, fazendo a cota tilintar.',
      '{a} chama a tempestade, e o relâmpago busca o metal da malha de {b}.',
    ],
    P: [
      'O raio de {a} desce sobre as placas de {b}, e o aço inteiro brilha.',
      'O vento de {a} uiva contra {b}, que se finca no chão sob o peso das placas.',
      '{a} solta o trovão, e a armadura de {b} vira um para-raios.',
    ],
  },
  terra: {
    L: [
      'O chão se ergue sob {b} ao comando de {a}, em lascas de pedra.',
      '{a} arremessa um bloco de rocha arrancado da terra contra {b}.',
      'Espinhos de pedra brotam do solo aos pés de {b}, chamados por {a}.',
    ],
    M: [
      'A terra treme ao chamado de {a}, e pedras voam contra a malha de {b}.',
      '{a} fecha o punho e o solo agarra as pernas de {b}.',
      'Uma chuva de cascalho conjurada por {a} martela a cota de {b}.',
    ],
    P: [
      '{a} ergue um pilar de rocha sob {b}, e o peso das placas não ajuda.',
      '{a} faz a terra se abrir, e {b} afunda sob o próprio aço.',
      'A pedra conjurada por {a} bate nas placas de {b} como um aríete.',
    ],
  },
  luz: {
    L: [
      'Uma lança de luz parte de {a} e atravessa a sombra que cerca {b}.',
      '{a} ergue a voz em prece, e um clarão sagrado cai sobre {b}.',
      'A luz de {a} queima como o sol do meio-dia sobre o couro de {b}.',
    ],
    M: [
      'O brilho sagrado de {a} reflete em cada elo da malha de {b}.',
      '{a} invoca a luz, e ela atravessa a cota de {b} como se não houvesse ferro.',
      'Uma coluna de luz desce sobre {b}, chamada pela fé de {a}.',
    ],
    P: [
      'A luz de {a} faz as placas de {b} arderem em branco, cegando quem olha.',
      '{a} invoca o céu, e o aço de {b} não esconde ninguém da claridade.',
      'Um raio sagrado de {a} encontra a armadura de {b} e a envolve em fulgor.',
    ],
  },
  trevas: {
    L: [
      'As sombras de {a} se esgueiram pelo chão e sobem pelas pernas de {b}.',
      '{a} murmura palavras antigas, e uma névoa negra envolve {b}.',
      'Uma garra de trevas parte de {a} e rasga o ar até {b}.',
    ],
    M: [
      'As trevas de {a} escorrem entre os elos da malha de {b} como piche.',
      '{a} conjura a escuridão, e ela se fecha sobre {b} num abraço gelado.',
      'Uma sombra viva de {a} atravessa a cota de {b} sem tocar o ferro.',
    ],
    P: [
      'A escuridão de {a} se infiltra pelas frestas das placas de {b}.',
      '{a} chama o vazio, e o aço de {b} escurece como se a noite o tocasse.',
      'Um sopro de trevas de {a} envolve {b}, e nem as placas o detêm.',
    ],
  },
  arcano: {
    L: [
      '{a} traça runas no ar, e a energia mágica dispara contra {b}.',
      'Um feixe de pura magia parte das mãos de {a} em direção a {b}.',
      'O poder de {a} se condensa num golpe invisível contra o couro de {b}.',
    ],
    M: [
      'A magia de {a} faz a malha de {b} vibrar como uma corda tensa.',
      '{a} solta a energia arcana, e ela procura {b} por entre os elos.',
      'Um lampejo de força mágica parte de {a} e atinge a cota de {b}.',
    ],
    P: [
      'A força arcana de {a} bate nas placas de {b} sem precisar de fresta.',
      '{a} conjura, e o ar em volta de {b} se dobra contra o aço.',
      'A magia de {a} ignora o peso das placas e busca {b} por dentro.',
    ],
  },
};

const NARRACAO_DESFECHO = {
  errou: [
    'Mas {b} se esquiva no último instante.',
    'O ataque passa longe, e {b} nem precisa recuar.',
    '{b} desvia com um passo curto, e o golpe se perde no vazio.',
  ],
  falha: [
    '{a} perde o equilíbrio e acaba se ferindo no próprio ataque.',
    'O ataque sai torto, e {a} paga caro pelo descuido.',
    'Tudo dá errado: {a} tropeça e se machuca.',
  ],
  armadura: [
    'A armadura de {b} segura o golpe inteiro.',
    'O impacto morre na proteção de {b}, que nem sente.',
    '{b} aguenta firme: a armadura faz o seu trabalho.',
  ],
  heroica: [
    '{b} absorve o impacto no fôlego e na sorte, sem sangrar.',
    'O golpe cansa {b}, que ainda se mantém inteiro.',
    '{b} gira com o golpe e escapa só com o fôlego mais curto.',
  ],
  ferido: [
    'O golpe atravessa e abre uma ferida em {b}.',
    '{b} sente o ataque chegar à carne.',
    'Desta vez passa: {b} cambaleia, ferido.',
  ],
  critico: [
    'Um golpe perfeito — {b} sente com toda a força!',
    'É o golpe que os bardos vão cantar: certeiro e brutal.',
    'Nada poderia ter sido melhor: o ataque encontra {b} em cheio.',
  ],
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

/* A narração do golpe. `sortear` (0..1) é injetável para os testes. */
function narrarGolpe({ tipo, golpeTipo, elemento, defesaSigla, autorNome, alvoNome, resultado, dano, onde, critico, sortear } = {}) {
  const rnd = typeof sortear === 'function' ? sortear : Math.random;
  const pick = (lista) => lista[Math.min(lista.length - 1, Math.floor(rnd() * lista.length))];
  const fam = tipo === 'magia' ? familiaDoElemento(elemento) : (NARRACAO_ENCONTRO[golpeTipo] ? golpeTipo : 'DESARMADO');
  const def = ['L', 'M', 'P'].includes(String(defesaSigla || '').toUpperCase()) ? String(defesaSigla).toUpperCase() : 'L';
  const fim = desfechoDoGolpe({ resultado, dano, onde, critico });
  const a = primeiroNomeNarr(autorNome);
  const b = primeiroNomeNarr(alvoNome);
  const preencher = (s) => s.replace(/\{a\}/g, a).replace(/\{b\}/g, b);
  return preencher(pick(NARRACAO_ENCONTRO[fam][def])) + ' ' + preencher(pick(NARRACAO_DESFECHO[fim]));
}

Object.assign(window, {
  narrarGolpe,
  NARRACAO_GOLPE: { encontro: NARRACAO_ENCONTRO, desfecho: NARRACAO_DESFECHO, familiaDoElemento, desfechoDoGolpe },
});
