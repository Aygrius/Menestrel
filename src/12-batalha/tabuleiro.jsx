/* ============================================================
   tabuleiro.jsx — Tabuleiro de combate (grid + tokens + movimento)
   ============================================================
   PROCEDÊNCIA: este arquivo foi RECONSTRUÍDO a partir do bundle de
   produção (menestrel-rpg.vercel.app, /assets/index-VZ9wJORB.js), que
   continha o tabuleiro mas nunca foi commitado no repositório. O build
   publicado saiu de `main` + este código; o fonte original não está no
   GitHub nem em nenhuma máquina que eu tenha conseguido inspecionar.

   O que é FIEL ao original (extraído do bundle, valor por valor):
     • as constantes de geometria (grid, token, movimento, zoom);
     • toda a camada pura — posValida, distâncias, alcance, validação e
       aplicação de movimento — inclusive os códigos de motivo e os
       textos PT/EN de recusa;
     • o CSS (recuperado literal do index-CpOejKIs.css de produção,
       ver index.css, bloco "TABULEIRO DE BATALHA");
     • a árvore de render dos dois componentes.
   O que NÃO é fiel: os nomes internos. O bundle está minificado e sem
   sourcemap, então identificadores e comentários do autor se perderam —
   os nomes aqui são meus, escolhidos para casar com o resto da fase.

   Depende dos globais de 01-core e de 12-batalha/batalha.jsx
   (mesmoParticipante, statusTemEfeito), carregados antes por main.tsx.
   ============================================================ */

/* ── Geometria do tabuleiro ─────────────────────────────────────────────
   Grid de 55×35 células. Cada participante ocupa um bloco de 2×2 — por
   isso todo clamp de posição é contra (COLS - TOKEN) e (ROWS - TOKEN), e
   as distâncias de borda descontam (TOKEN - 1).

   14/09/2026 (usuário): "O avatar dos participantes devem ter 2x2 [...] O
   tabuleiro deve ter 55x35." Os valores do bundle recuperado eram 70×35 e
   token 3×3 — o avatar já era DESENHADO com 2 células (TAB_TOKEN_ESCALA),
   mas ocupava 3×3, e sobrava uma célula fantasma em volta de cada um. */
const TAB_COLS   = 55;      // largura do tabuleiro, em células
const TAB_ROWS   = 35;      // altura do tabuleiro, em células
const TAB_TOKEN  = 2;       // lado do token, em células (2×2)
const TAB_CELULA = 40;      // px por célula no zoom 1×
const TAB_ZOOMS  = [0.15, 0.25, 0.35, 0.5, 0.75, 1, 1.5];
const TAB_ZOOM_PADRAO = 3;  // índice em TAB_ZOOMS → 0.5
const TAB_TOKEN_ESCALA = 2; // token renderiza com 2 células de diâmetro

/* Movimento da rodada: VB convertido em células, com piso.
   mov = max(5, floor(VB × 5/20)). Um VB 20 anda 5 células; VB 35 anda 8. */
const MOV_MIN   = 5;
const MOV_FATOR = 5 / 20;

function movimentoBase(vb) {
  const v = Number(vb) || 0;
  return Math.max(MOV_MIN, Math.floor(v * MOV_FATOR));
}

/* Posição válida: inteira, dentro do tabuleiro, e com o token 3×3 inteiro
   dentro dele (por isso o `+ TAB_TOKEN <=`, não `<`). */
function posValida(pos) {
  return !!pos
    && Number.isInteger(pos.x) && Number.isInteger(pos.y)
    && pos.x >= 0 && pos.x + TAB_TOKEN <= TAB_COLS
    && pos.y >= 0 && pos.y + TAB_TOKEN <= TAB_ROWS;
}

/* Distância Chebyshev entre duas células (diagonal custa igual a ortogonal).
   Foi a do MOVIMENTO até 13/09/2026 — ver distanciaMovimento logo abaixo.
   Segue servindo onde "quantas casas de um lado" é a pergunta certa. */
function distanciaCelulas(a, b) {
  if (!a || !b) return Infinity;
  return Math.max(Math.abs((a.x || 0) - (b.x || 0)), Math.abs((a.y || 0) - (b.y || 0)));
}

/* ── Distância de MOVIMENTO: em linha reta (13/09/2026) ─────────────
   "A área de mover o personagem deve ser redonda, se movendo igualmente em
   todas as direções." Com Chebyshev a área era um QUADRADO: andar 5 na
   diagonal levava o token 7 casas longe, mais que os 5 da reta. Agora é a
   distância euclidiana, e o alcance forma um círculo.

   O custo em movimento é essa distância ARREDONDADA PRA CIMA (regra do
   sistema): a diagonal (3, 3) mede 4,24 e custa 5. O 1e-9 protege a reta
   exata de virar uma casa a mais por erro de ponto flutuante. */
function distanciaMovimento(a, b) {
  if (!a || !b) return Infinity;
  return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
}
function custoMovimento(a, b) {
  const d = distanciaMovimento(a, b);
  return Number.isFinite(d) ? Math.ceil(d - 1e-9) : Infinity;
}

/* Distância de ALCANCE entre dois tokens — mesma Chebyshev, mas de BORDA
   a borda: desconta (TAB_TOKEN - 1) em cada eixo, porque os tokens têm
   2×2. Dois tokens que dividem células dão 0; lado a lado, sem célula no
   meio, dão 1 (o alcance corpo a corpo). */
function distanciaBordas(a, b) {
  if (!a || !b) return Infinity;
  const dx = Math.max(0, Math.abs((a.x || 0) - (b.x || 0)) - (TAB_TOKEN - 1));
  const dy = Math.max(0, Math.abs((a.y || 0) - (b.y || 0)) - (TAB_TOKEN - 1));
  return Math.max(dx, dy);
}

/* Alcance do catálogo → células. Aceita número, "5m", "25 m" e os textos
   de corpo-a-corpo. Nulo/vazio → null (o chamador decide o default). */
function parseAlcance(valor) {
  if (valor == null) return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? Math.max(1, Math.floor(valor)) : null;
  const s = String(valor).trim().toLowerCase();
  if (!s) return null;
  /* Pessoal = SÓ em si mesmo (alcance 0); Toque e corpo a corpo = adjacente.
     Os dois devolviam 1 até 11/09/2026, e por isso as 62 magias de alcance
     Pessoal aceitavam alvo adjacente no tabuleiro. A aba Apoio já tratava
     `pessoal` à parte (batalha.jsx), mas o tabuleiro não. Spec §7.3. */
  if (/pessoal/.test(s)) return 0;
  if (/toque|corpo/.test(s)) return 1;
  const m = s.match(/(\d+)/);
  return m ? Math.max(1, parseInt(m[1], 10)) : null;
}

function dentroDoAlcance(posA, posB, alcance) {
  // Piso 0, não 1: alcance 0 (magia Pessoal) casa só a própria célula.
  const a = Math.max(0, Math.floor(Number(alcance) || 0));
  return distanciaBordas(posA, posB) <= a;
}

/* Alcance efetivo de uma ação. Magia usa o alcance dela; arma usa o da
   TÉCNICA quando há uma (a técnica pode estender), senão o da arma. */
function alcanceDaAcao({ arma, magia, tecnica } = {}) {
  // `!= null` e não `||`: alcance 0 (Pessoal) é válido e não pode virar 1.
  if (magia) { const a = parseAlcance(magia.alcance); return a != null ? a : 1; }
  if (!arma) return 1;
  return ((tecnica ? parseAlcance(tecnica.alcance) : null) || parseAlcance(arma.alcance)) || 1;
}

/* ── Sobreposição de tokens (14/09/2026) ────────────────────────────
   "Dois combatentes não podem estar exatamente no mesmo lugar do tabuleiro,
   mas eles podem ocupar até duas células iguais (isso garante se aproximar
   do adversário)." (usuário)

   Quantas células dois tokens 2×2 dividem: 4 no mesmo lugar, 2 deslocados de
   uma casa num eixo, 1 na diagonal, 0 afastados. Até
   MAX_CELULAS_COMPARTILHADAS é aproximação legítima; acima disso é empilhar.
   Até esta data qualquer célula em comum bloqueava. */
const MAX_CELULAS_COMPARTILHADAS = 2;

function celulasEmComum(a, b) {
  if (!a || !b) return 0;
  const lx = Math.max(0, TAB_TOKEN - Math.abs((a.x || 0) - (b.x || 0)));
  const ly = Math.max(0, TAB_TOKEN - Math.abs((a.y || 0) - (b.y || 0)));
  return lx * ly;
}

/* Célula ocupada por qualquer participante VIVO e posicionado (exceto o
   que está se movendo). Morto/desistiu não bloqueia. "Ocupada" = o token
   posto ali dividiria MAIS de MAX_CELULAS_COMPARTILHADAS com alguém. */
function celulaOcupada(pos, participantes, ignorar) {
  if (!posValida(pos)) return false;
  // mesmoParticipante mora em batalha.jsx e chega via MotorBatalha (main.tsx
  // carrega batalha.jsx antes deste arquivo). Resolvido em CHAMADA, não na
  // carga do módulo, pra não depender da ordem de import nos testes.
  const mesmo = (window.MotorBatalha && window.MotorBatalha.mesmoParticipante)
    || ((a, b) => !!a && !!b && a.tipo === b.tipo && a.ref_id === b.ref_id);
  return (participantes || []).some((p) => {
    if (!p || (ignorar && mesmo(p, ignorar)) || p.ausente) return false;
    const st = p.status || 'ativo';
    if (st === 'morto' || st === 'desistiu') return false;
    return posValida(p.pos) && celulasEmComum(pos, p.pos) > MAX_CELULAS_COMPARTILHADAS;
  });
}

/* ── O bando anda com o líder (13/09/2026) ─────────────────────────
   Ver o bloco BANDOS em batalha.jsx. Depois que o líder anda (ou é
   posicionado na montagem), cada minion de pé vai para uma casa livre ENCOSTADA
   nele — o anel de 8 casas a um token de distância, e o seguinte se o
   primeiro estiver cheio. Entre as livres, a mais perto de onde o minion
   estava: quem ia à esquerda continua à esquerda, e a formação não embaralha a
   cada passo.

   Minion já encostado fica onde está. Desmaiado não é arrastado, morto e
   fugido também não. Não gasta movimento nem PA do minion: o passo foi do
   líder. Sem nada a mudar, devolve o MESMO array. */
function casasAoRedor(pos, anel) {
  const out = [];
  const passo = TAB_TOKEN;
  for (let dy = -anel; dy <= anel; dy++) {
    for (let dx = -anel; dx <= anel; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== anel) continue;
      const c = { x: pos.x + dx * passo, y: pos.y + dy * passo };
      if (posValida(c)) out.push(c);
    }
  }
  return out;
}

function bandoSegueLider(participantes, liderInstId) {
  if (!Array.isArray(participantes) || !liderInstId) return participantes;
  const lider = participantes.find((p) => p && p.inst_id === liderInstId);
  if (!lider || !lider.bando || lider.bando.papel !== 'lider' || !posValida(lider.pos)) return participantes;
  const seguidores = participantes.filter((p) => p && p.bando && p.bando.papel === 'minion'
    && p.bando.lider === liderInstId && (p.status || 'ativo') === 'ativo' && !p.ausente && !p.fugiu);
  if (!seguidores.length) return participantes;
  let out = participantes;
  seguidores.forEach((m) => {
    const atual = out.find((p) => p.inst_id === m.inst_id) || m;
    if (posValida(atual.pos) && distanciaBordas(atual.pos, lider.pos) <= 1
        && !celulaOcupada(atual.pos, out, atual)) return;
    const origem = posValida(atual.pos) ? atual.pos : lider.pos;
    let destino = null;
    for (let anel = 1; anel <= 2 && !destino; anel++) {
      const livres = casasAoRedor(lider.pos, anel).filter((c) => !celulaOcupada(c, out, atual));
      livres.sort((a, b) => distanciaCelulas(a, origem) - distanciaCelulas(b, origem));
      destino = livres[0] || null;
    }
    if (!destino) return;
    out = out.map((p) => (p.inst_id === m.inst_id ? { ...p, pos: { x: destino.x, y: destino.y } } : p));
  });
  return out;
}

/* Códigos de recusa de movimento + texto PT/EN (recuperados do bundle). */
const MOV_MOTIVOS = {
  nao_ativo:          ['O participante não está ativo.',              'Participant is not active.'],
  sem_acoes:          ['Sem ações nesta rodada (status).',            'No actions this round (status).'],
  sem_posicao:        ['Participante ainda sem posição.',             'Participant has no position yet.'],
  fora_do_tabuleiro:  ['Destino fora do tabuleiro.',                  'Destination outside the board.'],
  mesmo_lugar:        ['Já está nessa célula.',                       'Already on that cell.'],
  sem_movimento:      ['Além do movimento restante da rodada.',       'Beyond the remaining movement this round.'],
  ja_moveu:           ['Já se moveu duas vezes nesta rodada.',        'Already moved twice this round.'],
  sem_pa:             ['Sem pontos de ação para o 2º movimento.',     'No action points left for a 2nd move.'],
  celula_ocupada:     ['Célula ocupada.',                             'Cell occupied.'],
  nao_e_a_vez:        ['Só quem está na vez pode se mover.',          'Only the active fighter can move.'],
  segue_lider:        ['Minion anda com o líder do bando.',           'Minions move with their band leader.'],
  sem_conducao:       ['Não dá para conduzir este adversário agora.', 'You cannot lead this opponent right now.'],
};

/* Minion com o líder de pé não anda sozinho (13/09/2026, ver bandoSegueLider).
   Líder desmaiado, morto ou fora da lista solta o minion. */
function minionPresoAoLider(p, participantes) {
  if (!p || !p.bando || p.bando.papel !== 'minion' || !p.bando.lider) return false;
  const lider = (participantes || []).find((q) => q && q.inst_id === p.bando.lider);
  return !!(lider && (lider.status || 'ativo') === 'ativo' && !lider.ausente);
}

function motivoMovimento(codigo, isEn) {
  const m = MOV_MOTIVOS[codigo];
  return m ? (isEn ? m[1] : m[0]) : String(codigo || '');
}

/* ── Quantos movimentos na rodada, e quanto o próximo pode andar ─────
   Regra do usuário (13/09/2026): "mover-se pelo campo de batalha uma vez não
   gasta ação, 2 vezes gasta" — e o 2º movimento dá um PASSO COMPLETO, no
   máximo dois por rodada.
     1º movimento  grátis, até mov_rest (o passo da rodada)
     2º movimento  1 PA (só do pa_rest), passo completo de novo
   `movimentos_na_rodada` conta; snapshot antigo só tem moveu_na_rodada, que
   vale 1. */
const MOVIMENTOS_POR_RODADA = 2;
function movimentosFeitos(p) {
  const n = Number(p && p.movimentos_na_rodada);
  if (Number.isFinite(n) && n > 0) return n;
  return (p && p.moveu_na_rodada) ? 1 : 0;
}
function passoCompleto(p) {
  const vb = (typeof vbParaMovimento === 'function') ? vbParaMovimento(p) : (p && p.vb);
  return movimentoBase(vb);
}
// Células que o PRÓXIMO movimento pode andar; 0 quando não há movimento.
function movimentoDisponivel(p) {
  if (!p) return 0;
  const n = movimentosFeitos(p);
  if (n >= MOVIMENTOS_POR_RODADA) return 0;
  if (n === 0) return Number.isFinite(p.mov_rest) ? p.mov_rest : movimentoBase(p.vb);
  return (p.pa_rest || 0) > 0 ? passoCompleto(p) : 0;
}

/* Validação pura do movimento. Devolve { ok, motivo } ou { ok, dist }.
   A ordem das guardas importa: é a mesma do original, então a mensagem
   mostrada ao Mestre não muda. */
function validarMovimento(p, destino, participantes) {
  if (!p) return { ok: false, motivo: 'sem_participante' };
  if ((p.status || 'ativo') !== 'ativo') return { ok: false, motivo: 'nao_ativo' };
  if (typeof statusTemEfeito === 'function' && statusTemEfeito(p, 'sem_acoes')) {
    return { ok: false, motivo: 'sem_acoes' };
  }
  if (minionPresoAoLider(p, participantes)) return { ok: false, motivo: 'segue_lider' };
  // Até DOIS movimentos por rodada (13/09/2026; era um desde 30/08/2026). A
  // contagem impede fatiar o deslocamento em vários cliques.
  const feitos = movimentosFeitos(p);
  if (feitos >= MOVIMENTOS_POR_RODADA) return { ok: false, motivo: 'ja_moveu' };
  // O 2º custa 1 PA, só do pa_rest — o ponto exclusivo de técnica e o ataque
  // extra não servem para andar.
  if (feitos >= 1 && (p.pa_rest || 0) <= 0) return { ok: false, motivo: 'sem_pa' };
  if (!posValida(p.pos))     return { ok: false, motivo: 'sem_posicao' };
  if (!posValida(destino))   return { ok: false, motivo: 'fora_do_tabuleiro' };

  // Em linha reta desde 13/09/2026 (distanciaMovimento): o alcance é redondo.
  const dist = custoMovimento(p.pos, destino);
  if (dist === 0) return { ok: false, motivo: 'mesmo_lugar' };
  const mov = movimentoDisponivel(p);
  if (dist > mov) return { ok: false, motivo: 'sem_movimento' };
  if (celulaOcupada(destino, participantes, p)) return { ok: false, motivo: 'celula_ocupada' };
  return { ok: true, dist };
}

/* Aplica o movimento (regra de 13/09/2026, ver movimentoDisponivel):
     1º  desconta as células do mov_rest; NÃO gasta PA
     2º  gasta 1 PA (só do pa_rest) e anda de um passo completo novo
   Histórico: até 30/08/2026 cobrava PA e movimento; depois nenhum PA; em
   13/09/2026 de manhã, 1 PA sempre; à tarde o usuário fixou "uma vez não
   gasta ação, 2 vezes gasta".

   Não muta o participante recebido. */
function moverParticipante(p, destino, participantes) {
  const v = validarMovimento(p, destino, participantes);
  if (!v.ok) return { ok: false, motivo: v.motivo, participante: p };
  const feitos = movimentosFeitos(p);
  const mov = movimentoDisponivel(p);
  return {
    ok: true,
    dist: v.dist,
    participante: {
      ...p,
      pos: { x: destino.x, y: destino.y },
      mov_rest: Math.max(0, mov - v.dist),
      moveu_na_rodada: true,
      movimentos_na_rodada: feitos + 1,
      ...(feitos >= 1 ? { pa_rest: Math.max(0, (p.pa_rest || 0) - 1) } : {}),
    },
  };
}

/* ── CONDUZIR OPONENTE (14/09/2026) ─────────────────────────────────
   "Se o jogador for bem sucedido no teste, ele poderá mover o adversário
   escolhido por 2 rodadas." O texto do banco completa: "move 1 alvo por 5
   metros" — e uma célula é um metro (parseAlcance lê "5 metros" como 5).

   O status `conduzido` mora no adversário e aponta para quem conduz
   (fonte_inst_id). A regra:
     • só quem conduz move, e só na VEZ dele (quem chama confere a vez);
     • uma condução por rodada, de até `casas` células em linha reta;
     • não gasta o movimento nem o PA de ninguém — o custo foi o teste;
     • quem conduz precisa estar de pé; o conduzido não pode estar morto
       nem fora de cena. Desmaiado se arrasta.
   "Já conduziu nesta rodada" fica anotado NO STATUS (conduzido_em =
   rodadas_rest do momento): a contagem desce a cada virada, então a marca
   deixa de bater sozinha na rodada seguinte, sem precisar do número da
   rodada da batalha. */
const CONDUCAO_CASAS_PADRAO = 5;

function statusDeConducao(alvo, condutor) {
  if (!alvo || !condutor || !condutor.inst_id || !Array.isArray(alvo.status_temp)) return null;
  return alvo.status_temp.find((s) => s && s.efeito && s.efeito.tipo === 'conduzido'
    && s.efeito.fonte_inst_id === condutor.inst_id) || null;
}

// Células que `condutor` pode levar `alvo` agora; 0 quando não pode.
function conducaoDisponivel(alvo, condutor) {
  const st = statusDeConducao(alvo, condutor);
  if (!st) return 0;
  if ((condutor.status || 'ativo') !== 'ativo' || condutor.ausente || condutor.fugiu) return 0;
  const stAlvo = alvo.status || 'ativo';
  if (stAlvo === 'morto' || stAlvo === 'desistiu' || alvo.ausente || alvo.fugiu) return 0;
  if (!posValida(alvo.pos)) return 0;
  if (st.efeito.conduzido_em != null && st.efeito.conduzido_em === st.rodadas_rest) return 0;
  const casas = Number(st.efeito.casas);
  return Number.isFinite(casas) && casas > 0 ? casas : CONDUCAO_CASAS_PADRAO;
}

/* Move o conduzido. Devolve { ok, motivo, participante } no molde de
   moverParticipante, com os mesmos códigos de recusa. Não muta nada. */
function conduzirParticipante(alvo, condutor, destino, participantes) {
  const casas = conducaoDisponivel(alvo, condutor);
  if (!casas) return { ok: false, motivo: 'sem_conducao', participante: alvo };
  if (!posValida(destino)) return { ok: false, motivo: 'fora_do_tabuleiro', participante: alvo };
  const dist = custoMovimento(alvo.pos, destino);
  if (dist === 0) return { ok: false, motivo: 'mesmo_lugar', participante: alvo };
  if (dist > casas) return { ok: false, motivo: 'sem_movimento', participante: alvo };
  if (celulaOcupada(destino, participantes, alvo)) return { ok: false, motivo: 'celula_ocupada', participante: alvo };
  const st = statusDeConducao(alvo, condutor);
  return {
    ok: true,
    dist,
    participante: {
      ...alvo,
      pos: { x: destino.x, y: destino.y },
      status_temp: alvo.status_temp.map((s) => (s === st
        ? { ...s, efeito: { ...s.efeito, conduzido_em: s.rodadas_rest } }
        : s)),
    },
  };
}

/* Melhor destino ALCANÇÁVEL na direção do clique.
   ────────────────────────────────────────────────────────────────
   O clique no tabuleiro não precisa mais cair exatamente numa célula
   legal: se o jogador mira longe demais, o token vai até onde o
   movimento restante alcança naquela direção; se a célula mirada está
   ocupada, recua pela mesma reta até a primeira livre.

   Fica na UI, NÃO em validarMovimento: a regra do jogo continua a
   mesma (nada de andar mais que mov_rest, nada de sobrepor token) —
   o que muda é só a mira. validarMovimento segue recusando um destino
   fora de alcance que chegue por outro caminho.

   Devolve null quando não há nenhuma célula boa na direção.

   `passoMax` (14/09/2026, Conduzir Oponente): quando o token é levado por
   outro, o passo não é o movimento dele, e sim o que a condução permite.
   Ausente, vale o movimento do próprio token, como sempre. */
function destinoAlcancavel(p, desejado, participantes, passoMax) {
  if (!p || !posValida(p.pos) || !posValida(desejado)) return null;
  // Distância em linha reta, a mesma de validarMovimento (13/09/2026).
  const dist = distanciaMovimento(p.pos, desejado);
  if (dist === 0) return null;                       // já está lá
  // O passo do PRÓXIMO movimento: o que sobrou no 1º, cheio no 2º (13/09/2026).
  const mov = Number.isFinite(passoMax) ? passoMax : movimentoDisponivel(p);
  // Do mais longe permitido para o mais perto: o primeiro que serve ganha,
  // então um clique legal devolve exatamente a célula clicada.
  for (let d = Math.min(dist, mov); d >= 1; d--) {
    const t = d / dist;
    const c = {
      x: p.pos.x + Math.round((desejado.x - p.pos.x) * t),
      y: p.pos.y + Math.round((desejado.y - p.pos.y) * t),
    };
    // O arredondamento pode estourar o passo; nesse caso pula.
    if (!posValida(c) || custoMovimento(p.pos, c) > mov) continue;
    if (custoMovimento(p.pos, c) === 0) continue;
    if (!celulaOcupada(c, participantes, p)) return c;
  }
  return null;
}

/* Preserva as posições ao REMONTAR snapshots (ex.: reabrir a batalha).
   Casa por índice + tipo + ref_id: se o participante daquele índice é o
   mesmo, herda a posição antiga; senão fica sem posição (vai pra bancada). */
function preservarPosicoes(novos, antigos) {
  const ant = antigos || [];
  return (novos || []).map((p, i) => {
    const a = ant[i];
    return (a && a.tipo === p.tipo && a.ref_id === p.ref_id && posValida(a.pos))
      ? { ...p, pos: { x: a.pos.x, y: a.pos.y } }
      : p;
  });
}

/* Distância entre dois PARTICIPANTES (null se algum não está no tabuleiro). */
function distanciaEntre(a, b) {
  if (!a || !b || !posValida(a.pos) || !posValida(b.pos)) return null;
  return distanciaBordas(a.pos, b.pos);
}

/* Alvo alcançável? Participante fora do tabuleiro NÃO bloqueia a ação
   (devolve true) — o tabuleiro é opcional, quem não posicionou joga
   como antes, sem restrição de alcance. */
function alvoNoAlcance(ator, alvo, alcance) {
  const d = distanciaEntre(ator, alvo);
  if (d == null) return true;
  return d <= Math.max(1, Math.floor(Number(alcance) || 0) || 1);
}

/* ── Régua numerada do tabuleiro (13/09/2026) ─────────────────────────
   Uma faixa fora da área que rola, deslocada pela rolagem. O passo entre
   números acompanha o tamanho da célula para não embolar: célula grande
   numera todas; média, de 5 em 5; pequena, de 10 em 10 (sempre com o 1). */
function passoDaRegua(cel) {
  if (cel >= 22) return 1;
  if (cel >= 10) return 5;
  return 10;
}
function ReguaTabuleiro({ eixo, total, cel, deslocamento }) {
  const passo = passoDaRegua(cel);
  const horizontal = eixo === 'col';
  const numeros = [];
  for (let i = 0; i < total; i += 1) {
    const n = i + 1;
    if (n !== 1 && n % passo !== 0) continue;
    numeros.push(React.createElement('span', {
      key: n, className: 'batalha-tabuleiro-regua-num',
      style: horizontal
        ? { left: i * cel, width: cel }
        : { top: i * cel, height: cel, lineHeight: cel + 'px' },
    }, n));
  }
  return React.createElement('div', {
    className: 'batalha-tabuleiro-regua batalha-tabuleiro-regua--' + eixo, 'aria-hidden': 'true',
  }, React.createElement('div', {
    className: 'batalha-tabuleiro-regua-trilho',
    style: horizontal
      ? { width: total * cel, transform: `translateX(${-deslocamento}px)` }
      : { height: total * cel, transform: `translateY(${-deslocamento}px)` },
  }, numeros));
}

/* ── Token: avatar redondo + status + nome + barras EF/EH/AR ───────── */
/* ── Selos de estado temporário no token (puro) ────────────────────
   O tabuleiro é a única coisa que todo mundo vê igual. Veneno e sangramento
   são o mesmo mecanismo (dano_por_rodada); o prefixo do id separa os dois
   (statusAplicadoPeloMestre em batalha.jsx). Caído é `sem_acoes`. Evocando é
   o estado da canalização, não um status_temp. */
function selosDoToken(p) {
  const st = Array.isArray(p && p.status_temp) ? p.status_temp.filter(Boolean) : [];
  const idTxt = (s) => (typeof s.id === 'string' ? s.id : '');
  const porRodada = st.filter((s) => s.efeito && s.efeito.tipo === 'dano_por_rodada');
  const sangra = porRodada.some((s) => idTxt(s).startsWith('sangramento:'));
  const veneno = porRodada.some((s) => !idTxt(s).startsWith('sangramento:'));
  const caido = st.some((s) => s.efeito && s.efeito.tipo === 'sem_acoes');
  const selos = [];
  if (veneno) selos.push({ classe: 'batalha-token-selo-veneno', nome: 'Envenenado', icone: 'ti-flask-2', cor: '#7fd66b' });
  if (sangra) selos.push({ classe: 'batalha-token-selo-sangrando', nome: 'Sangrando', icone: 'ti-droplet', cor: '#e05a4f' });
  if (caido) selos.push({ classe: 'batalha-token-selo-caido', nome: 'Caído', icone: 'ti-arrow-down-circle', cor: '#e8c26b' });
  if (p && p.evocando) selos.push({ classe: 'batalha-token-selo-evocando', nome: 'Evocando', icone: 'ti-sparkles', cor: '#9fb8ff' });
  return selos;
}

// Os quatro estados de VISIBILIDADE_ORDEM (batalha.jsx). Lista local para o
// tabuleiro não depender da ordem de carga; valor desconhecido vira 'clara'.
const ESCURIDAO_NIVEIS = ['clara', 'parcial', 'total', 'magica'];

/* ── Animação de DANO no token (13/09/2026) ─────────────────────────
   "Adicione um efeito animação quando um personagem sofre dano, efeito
   vermelho na EF, efeito verde na EH, e efeito branco na armadura."

   O token é o lugar que Mestre e jogadores veem igual, e o dano chega nele por
   todos os caminhos (golpe, magia, veneno na virada, barra editada, gravação
   de outra tela pelo realtime) — por isso a detecção é por DIFERENÇA de pool
   entre um render e o seguinte, e não um aviso de cada handler.

   Armadura = a RESISTÊNCIA caiu: é o que o golpe acima do limiar gasta. O
   golpe contido inteiro pelo limiar não muda número nenhum e não tem como
   piscar daqui.

   Pool que cai junto com o próprio máximo não é dano: é empréstimo de EH/EF
   devolvido quando a técnica ou a magia expira (expirarEhTemp). */
const FLASH_DANO_MS = 950;

function danoNasPools(antes, depois) {
  const nada = { ef: false, eh: false, armadura: false };
  if (!antes || !depois) return nada;
  const num = (v) => (v == null || v === '' ? null : (Number.isFinite(Number(v)) ? Number(v) : null));
  const caiu = (k) => {
    const a = num(antes[k]); const d = num(depois[k]);
    if (a == null || d == null || d >= a) return false;
    const maxA = num(antes[k + '_max']); const maxD = num(depois[k + '_max']);
    return !(maxA != null && maxD != null && maxD < maxA);
  };
  return { ef: caiu('ef'), eh: caiu('eh'), armadura: caiu('res') };
}

// Devolve { ef, eh, armadura, n } enquanto a animação dura; null fora dela.
// `n` troca a cada golpe, e é a key que reinicia a animação no golpe seguido.
function useFlashDeDano(p) {
  const anterior = useRef(null);
  const timer = useRef(null);
  const [flash, setFlash] = useState(null);
  const chave = p ? [p.inst_id, p.ef, p.eh, p.res, p.ef_max, p.eh_max].join('|') : '';
  useEffect(() => {
    const atual = p ? { inst_id: p.inst_id, ef: p.ef, eh: p.eh, res: p.res, ef_max: p.ef_max, eh_max: p.eh_max } : null;
    const antes = anterior.current;
    anterior.current = atual;
    // Primeiro render e troca de participante não são dano.
    if (!antes || !atual || antes.inst_id !== atual.inst_id) return;
    const d = danoNasPools(antes, atual);
    if (!d.ef && !d.eh && !d.armadura) return;
    setFlash((f) => ({ ...d, n: ((f && f.n) || 0) + 1 }));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash(null), FLASH_DANO_MS);
    // eslint-disable-next-line
  }, [chave]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return flash;
}

/* Fração da EF para o anel do avatar: 0..1, EF negativa (caído-vivo) é vazio.
   null quando não há EF para medir — participante cru da montagem. */
function fracaoEfDoToken(p) {
  const max = Number(p && p.ef_max) || 0;
  if (max <= 0) return null;
  return Math.max(0, Math.min(1, (Number(p.ef) || 0) / max));
}

/* `atravessavel` (14/09/2026): com o Mover armado, o token deixa o clique passar
   para a grade — ver o comentário no mapa de tokens do TabuleiroBatalha. */
function TabuleiroToken({ p, meta, size, selecionado, atual, podeSel, onSelect, refAvatar, atravessavel }) {
  const flash = useFlashDeDano(p);
  const m = meta || {};
  const foto = p.foto_url || m.foto_url || null;
  const inicial = ((p.nome || '?').trim()[0] || '?').toUpperCase();
  const status = p.status || 'ativo';
  const fora = status === 'morto' || status === 'desistiu';
  const grande = size >= 24;
  /* ANEL DA EF (14/09/2026): "Remova as barras debaixo do avatar [...] Mostre
     uma borda do EF ao redor do avatar, é sua EF." As quatro barrinhas (EF,
     EH, resistência, Karma) saíram; ficou a EF, desenhada como a borda do
     próprio avatar — o mesmo traço de SVG com pathLength 100 dos botões de
     pool do card, recolhendo a partir do topo conforme a EF cai. Antes a
     borda era da cor do lado (dourado PJ, vermelho criatura); agora ela é a
     vida. As outras pools seguem no card que o clique abre. */
  const fracaoEf = fracaoEfDoToken(p);
  const pctEf = fracaoEf == null ? 0 : Math.round(fracaoEf * 100);

  return React.createElement('div', {
    role: podeSel ? 'button' : undefined,
    tabIndex: podeSel ? 0 : undefined,
    // Sem tooltip com o nome (14/09/2026, pedido do usuário): o nome já está
    // embaixo do avatar. Fica só no aria-label, para leitor de tela.
    'aria-label': p.nome || undefined,
    // Atravessável: o clique segue para a grade (vira destino do movimento).
    onClick: (e) => { if (atravessavel) return; e.stopPropagation(); if (podeSel) onSelect(e); },
    onKeyDown: (e) => {
      if (podeSel && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); onSelect(e); }
    },
    className: 'batalha-token' + (atual ? ' batalha-token--atual' : '') + (flash ? ' is-dano' : '')
      + (p.tipo === 'pj' ? ' batalha-token--pj' : ' batalha-token--criatura'),
    style: {
      position: 'relative', width: size, display: 'flex', flexDirection: 'column',
      alignItems: 'center', cursor: podeSel && !atravessavel ? 'pointer' : 'default',
      pointerEvents: atravessavel ? 'none' : 'auto',
    },
  },
    // anel pulsante de "é a vez dele"
    atual && React.createElement('span', {
      'aria-hidden': 'true', className: 'batalha-token-vez-ring',
      style: { width: size + 14, height: size + 14, top: -7, left: '50%', marginLeft: -(size + 14) / 2 },
    }),
    /* Anéis de dano, um por pool atingida, na ordem da cascata (EH → armadura
       → EF): o CSS atrasa cada um um pouco, e o golpe que atravessa a EH e
       chega na EF pisca verde e depois vermelho. */
    flash && ['eh', 'armadura', 'ef'].filter((k) => flash[k]).map((k) => React.createElement('span', {
      key: k + ':' + flash.n, 'aria-hidden': 'true',
      className: 'batalha-token-dano-anel batalha-token-dano-anel--' + k,
      style: { width: size + 16, height: size + 16, top: -8, left: '50%', marginLeft: -(size + 16) / 2 },
    })),
    // O avatar e o anel da EF andam juntos: o tranco do dano e a escala da
    // seleção valem para os dois.
    React.createElement('div', {
      ref: refAvatar,
      key: flash ? 'avatar-dano-' + flash.n : 'avatar',
      className: 'batalha-token-avatar' + (flash ? ' is-dano' : ''),
      style: {
        position: 'relative', width: size, height: size, flex: 'none',
        opacity: fora ? 0.35 : (status === 'desmaiado' ? 0.55 : 1),
        transform: selecionado ? 'scale(1.12)' : 'none',
        transition: 'transform .15s ease, opacity .2s ease',
      },
    },
      React.createElement('div', {
        className: 'batalha-token-rosto',
        style: {
          position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden',
          /* Sem sombra nem contorno dourado (14/09/2026): "Remova a sombra
             dourada do avatar, deixe apenas o pulsar para indicar de quem é a
             vez." O selecionado continua maior (scale no avatar, acima). */
          boxShadow: '0 1px 4px rgba(0,0,0,.5)',
          background: 'linear-gradient(135deg, rgba(184,112,46,.95), rgba(122,94,42,.95))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        },
      }, foto
        ? React.createElement('img', {
            src: foto, alt: '', draggable: false,
            style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
          })
        : React.createElement('span', {
            style: {
              fontFamily: 'Cinzel, serif', fontWeight: 700, color: '#1C1407',
              fontSize: Math.max(10, Math.round(size * 0.48)), lineHeight: 1, userSelect: 'none',
            },
          }, inicial),
        // Véu de cor por cima do rosto: o "acerto" que se lê de longe.
        flash && ['eh', 'armadura', 'ef'].filter((k) => flash[k]).map((k) => React.createElement('span', {
          key: 'veu-' + k, 'aria-hidden': 'true',
          className: 'batalha-token-dano-veu batalha-token-dano-veu--' + k,
        }))),
      fracaoEf != null && React.createElement('svg', {
        key: flash && flash.ef ? 'ef-dano-' + flash.n : 'ef',
        className: 'batalha-token-ef' + (flash && flash.ef ? ' is-dano-ef' : '') + (pctEf === 0 ? ' vazia' : ''),
        viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false', 'data-pct': pctEf,
        style: { position: 'absolute', inset: -4, width: size + 8, height: size + 8, pointerEvents: 'none', overflow: 'visible' },
      },
        React.createElement('circle', { className: 'batalha-token-ef-trilho', cx: 50, cy: 50, r: 47, pathLength: 100 }),
        React.createElement('circle', {
          className: 'batalha-token-ef-nivel', cx: 50, cy: 50, r: 47, pathLength: 100,
          strokeDasharray: pctEf + ' 100', transform: 'rotate(-90 50 50)',
        }))),
    // selo de status (caveira / zzz / bandeira) — com nome, para leitor de
    // tela e para quem pergunta "o que é isso" (13/09/2026).
    status !== 'ativo' && size >= 18 && React.createElement('span', {
      className: 'batalha-token-selo-estado', role: 'img',
      'aria-label': status === 'morto' ? 'Morto' : status === 'desmaiado' ? 'Desmaiado' : 'Desistiu',
      style: { position: 'absolute', top: -4, right: -6, lineHeight: 1, fontSize: Math.max(10, Math.round(size * 0.32)) },
    }, React.createElement('i', {
      className: 'ti ' + (status === 'morto' ? 'ti-skull' : status === 'desmaiado' ? 'ti-zzz' : 'ti-flag'),
      'aria-hidden': 'true', style: { color: '#f2e8d5', textShadow: '0 1px 2px #000' },
    })),
    /* Selos de estado temporário (veneno, sangrando, caído, evocando), na
       coluna da esquerda, um embaixo do outro (13/09/2026). */
    fora || size < 18 ? null : selosDoToken(p).map((selo, k) => React.createElement('span', {
      key: selo.classe, className: selo.classe, role: 'img', 'aria-label': selo.nome,
      style: { position: 'absolute', top: -4 + k * Math.max(10, Math.round(size * 0.34)), left: -6,
        lineHeight: 1, fontSize: Math.max(10, Math.round(size * 0.32)) },
    }, React.createElement('i', {
      className: 'ti ' + selo.icone, 'aria-hidden': 'true', style: { color: selo.cor, textShadow: '0 1px 2px #000' },
    }))),
    // nome (só quando o zoom dá espaço). As barras que vinham embaixo saíram
    // em 14/09/2026 — a EF virou o anel do avatar.
    grande && React.createElement('div', {
      className: 'batalha-token-nome',
      style: {
        // Um pouco maior desde 14/09/2026 (era size × 0.26): ~12px no zoom padrão.
        pointerEvents: 'none', marginTop: 6, textAlign: 'center', maxWidth: size * 2.6, lineHeight: 1.12,
        fontFamily: 'Lora, serif', fontSize: Math.max(9, Math.round(size * 0.32)),
        color: 'var(--foreground, #f2e8d5)', textShadow: '0 1px 2px rgba(0,0,0,.85)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      },
    }, (p.nome || '').split(' ')[0])
  );
}

/* ── Menu do participante (popover ancorado no avatar) ─────────────────
   Substitui o card do roster. Vai pro body via portal porque o scroll do
   tabuleiro é overflow:hidden — dentro dele o menu seria cortado assim que
   o token estivesse perto de uma borda, que é justamente onde a maioria
   dos tokens começa a batalha.

   A âncora é o RECT do token, remedido a cada scroll/pan/resize: o token
   se move (movimento, virada de rodada) e o tabuleiro é panorâmico, então
   uma posição congelada no clique descolaria do avatar.                */
/* Onde abrir o menu do token (puro).
   ────────────────────────────────────────────────────────────────────
   Prefere colar no token — abaixo, senão acima. Mas quando o menu não cabe
   em NENHUM dos dois lados, ele desgruda e se prende ao viewport, inteiro,
   em vez de se espremer na fresta que sobrou.

   Era essa a fonte da barra de rolagem no painel de Ação (pedido do usuário,
   01/09/2026): o `maxH` saía do espaço entre o token e a borda, com piso de
   140px. O painel de Ação passa de 300px — abas, dois selects, prévia de
   efeito e rodapé — então todo token na metade de baixo do tabuleiro abria
   um painel cortado, com rolagem interna. Agora o teto é a JANELA, e só há
   rolagem quando o painel é maior que ela.

   Devolve { modo: 'abaixo'|'acima'|'preso', y, maxH }.
   Cobertura: 12-batalha/tabuleiro.test.js. */
function posicionarMenu(rect, alturaMenu, alturaJanela, margem = 12) {
  const maxH = Math.max(140, alturaJanela - margem * 2);
  const abaixo = alturaJanela - rect.bottom - margem;
  const acima  = rect.top - margem;
  if (alturaMenu <= abaixo) return { modo: 'abaixo', y: rect.bottom + 8, maxH };
  if (alturaMenu <= acima)  return { modo: 'acima',  y: rect.top - 8,    maxH };
  // Não cabe colado: centra na janela e garante que nenhuma ponta saia dela.
  // Se nem assim couber (painel > janela), encosta no topo e aí sim rola.
  const y = Math.max(margem, Math.min(
    Math.round((alturaJanela - alturaMenu) / 2),
    alturaJanela - alturaMenu - margem
  ));
  return { modo: 'preso', y, maxH };
}

function TabuleiroMenu({ alvoEl, onFechar, rotuloFechar, rotuloVoltar, travado, aoVoltar, children }) {
  const caixaRef = useRef(null);
  const [geo, setGeo] = useState(null);

  const medir = React.useCallback(() => {
    const el = alvoEl && alvoEl.current;
    if (!el || !el.isConnected) { setGeo(null); return; }
    const r = el.getBoundingClientRect();
    // scrollHeight, não offsetHeight: offsetHeight já vem cortado pelo maxH
    // aplicado no render anterior, e decidir a colocação com a altura cortada
    // manteria o menu preso na fresta pra sempre. O que interessa é o tamanho
    // que o conteúdo QUER ter.
    const caixa = caixaRef.current;
    const alturaMenu = caixa
      ? Math.max(caixa.offsetHeight, caixa.scrollHeight)
      : 260;
    const pos = posicionarMenu(r, alturaMenu, window.innerHeight);
    const g = {
      x: r.left + r.width / 2,
      y: pos.y,
      paraCima: pos.modo === 'acima',
      maxH: pos.maxH,
    };
    // Preserva a referência quando nada mudou: o layout effect roda a cada
    // render (children muda de identidade sempre) e um objeto novo aqui
    // realimentaria o render em loop.
    setGeo((ant) => (ant && ant.x === g.x && ant.y === g.y
      && ant.paraCima === g.paraCima && ant.maxH === g.maxH) ? ant : g);
  }, [alvoEl]);

  React.useLayoutEffect(medir, [medir, children]);

  useEffect(() => {
    const aoMexer = () => medir();
    // capture:true pega o scroll do container do tabuleiro (não borbulha).
    window.addEventListener('scroll', aoMexer, true);
    window.addEventListener('resize', aoMexer);
    const aoTeclar = (e) => { if (e.key === 'Escape' && !travado) onFechar(); };
    window.addEventListener('keydown', aoTeclar);
    // Fechar ao clicar fora é listener no documento, NÃO um véu por cima da
    // tela: um véu comeria o clique na célula de destino e o movimento —
    // função central do tabuleiro — pararia de funcionar com o menu aberto.
    // Por isso o tabuleiro inteiro é zona neutra: mover fecha o menu
    // sozinho (onMover desarma o movimento) e trocar de token só troca o
    // menu de dono.
    //
    // ⚠️ A lista abaixo precisa citar TODA UI que o menu abre por PORTAL.
    // Portal quebra a contenção do DOM: o overlay do dado, o dropdown de
    // estado e o tooltip são disparados de dentro do menu mas nascem fora
    // dele, então `closest('.batalha-token-menu')` não os alcança e o clique
    // parecia "clique fora". Foi o que aconteceu com o Confirmar da rolagem
    // (30/08/2026): fechava o menu, o AcaoPanel desmontava e o d20 sumia
    // junto com o estado dele — o Mestre tinha que rolar de novo. Quem
    // adicionar um portal novo aqui dentro tem que incluí-lo nesta lista.
    const FORA_MAS_NOSSO = [
      '.batalha-token-menu',            // o próprio menu
      '.batalha-tabuleiro-wrap',        // o grid: mover e trocar de token
      '.batalha-estado-drop-portal',    // dropdown de estado (portal)
      '.dado-overlay-backdrop',         // overlay da rolagem (portal)
      '.mn-tip',                        // tooltip (portal, pointer-events auto)
      '.select-pill-drop-portal',       // lista do SelectPill (portal)
    ];
    const aoApontar = (e) => {
      if (travado) return;
      const t = e.target;
      if (t && t.closest && FORA_MAS_NOSSO.some((sel) => t.closest(sel))) return;
      onFechar();
    };
    document.addEventListener('pointerdown', aoApontar, true);
    return () => {
      window.removeEventListener('scroll', aoMexer, true);
      window.removeEventListener('resize', aoMexer);
      window.removeEventListener('keydown', aoTeclar);
      document.removeEventListener('pointerdown', aoApontar, true);
    };
  }, [medir, onFechar, travado]);

  if (!geo) return null;

  return ReactDOM.createPortal(
    React.createElement('div', {
      ref: caixaRef,
      className: 'batalha-token-menu' + (geo.paraCima ? ' para-cima' : ''),
      role: 'dialog',
      style: { left: geo.x, top: geo.y, maxHeight: geo.maxH },
      onMouseDown: (e) => e.stopPropagation(),
      onClick: (e) => e.stopPropagation(),
    },
      // Travado: o X some. Não basta desabilitar — um X cinza convida ao
      // clique e não explica nada; o painel já diz no rodapé por que a saída
      // sumiu ("já rolou, continue em Atacar").
      // Com `aoVoltar`, o X VOLTA em vez de fechar (03/09/2026, a pedido do
      // usuário): o painel de Ação toma o card inteiro, e fechar tudo pra
      // voltar às ações iniciais obrigava a reabrir o token. Um passo atrás
      // por clique — no primeiro nível aoVoltar vem null e o X fecha, como
      // sempre fez, então continua existindo caminho pra sair.
      !travado && React.createElement('button', {
        className: 'batalha-token-menu-fechar', type: 'button',
        onClick: aoVoltar || onFechar,
        'aria-label': aoVoltar ? (rotuloVoltar || rotuloFechar) : rotuloFechar,
      }, React.createElement('i', { className: 'ti ti-x', 'aria-hidden': 'true' })),
      children
    ),
    // Portal DENTRO de .menestrel-ui, não no body: o conteúdo do menu é o
    // mesmo markup do card (.batalha-fighter, .batalha-pools, .batalha-stat)
    // e todas essas regras são escopadas em "#root .menestrel-ui". No body
    // o menu sairia sem estilo nenhum. Mesmo alvo que o PortalTooltip usa.
    document.querySelector('.menestrel-ui') || document.body
  );
}

/* ── Tabuleiro ─────────────────────────────────────────────────────────
   entradas       : [{ p: participante, i: índice }]
   meta           : { 'tipo:ref_id': { foto_url, raca } } — enriquecimento
   podeSelecionar : (p) => bool
   alcanceDe      : (p) => células a destacar (o movimento restante), ou null
   onMover        : (p, indice, destino) => bool  (true = consumiu o clique)
   aviso          : string — motivo da última recusa de movimento, exibido
                    acima do grid (substituiu a legenda de seleção).
   menuTravado    : bool — enquanto true o menu NÃO fecha por nenhuma via (X,
                    Escape, clique fora, clique na grade, clique em outro
                    token). Existe por causa da regra "rolou, não rola de
                    novo": o d20 mora no estado do painel dentro do menu, e
                    fechar o menu desmontava o painel — o resultado sumia e
                    dava pra escapar da ação sem gastar PA.
   menuVoltar     : (p, indice) => (() => void) | null — quando devolve uma
                    função, o X do menu VOLTA um nível (fecha o painel de Ação
                    e devolve as ações iniciais) em vez de fechar o menu.
                    Devolvendo null o X fecha normalmente, como sempre fez.
                    É por participante, e não global, pelo mesmo motivo que
                    menuDe é: o painel pertence a UM lutador. Com um valor
                    global, abrir o painel de quem está na vez e depois clicar
                    noutro token deixaria o X daquele outro card "voltando"
                    para um painel que nem está na tela — e o card ficaria sem
                    saída nenhuma.
                    Escape e clique fora seguem fechando o menu inteiro em
                    qualquer nível: são gestos de "sair", não de "voltar".
   menuDe         : (p, indice, fechar, armarMovimento) => ReactNode — conteúdo
                    do menu. `armarMovimento` é null quando o participante não
                    pode mover; quando existe, é o "Mover" (fecha o menu e
                    libera a grade) que o chamador põe junto das ações dele.
                    O menu em si é o SUBSTITUTO
                    dos cards do roster (removidos em 30/08/2026): tudo o que
                    ficava no card mora aqui agora.
   O clique no token faz as duas coisas de uma vez: abre o menu E arma o
   movimento (quando podeSelecionar deixa) — clicar numa célula move e fecha
   o menu. Por isso, havendo menuDe, o token é clicável para TODO
   participante, inclusive os que ninguém pode mover: sem os cards, o avatar
   virou o único caminho até as pools e as ações de quem não está na vez. */
/* movendoControlado / onMovendoChange (12/09/2026): quem está ARMADO pra
   posicionar pode vir de fora. Na montagem da batalha o Mestre escolhe pelo
   ícone ao lado do nome, na lista do topo, e não mais pela bancada — que
   `semBancada` esconde. Sem as duas props, o tabuleiro guarda a seleção
   sozinho, como sempre. */
function TabuleiroBatalha({
  entradas, meta, podeSelecionar, alcanceDe, onMover, salvando, isEn, tb,
  abrirTip, fecharTip, menuDe, aviso, menuTravado, menuVoltar,
  movendoControlado, onMovendoChange, semBancada, abrirMenu, visibilidade,
}) {
  // Duas coisas distintas, e essa distinção é o ponto: o menu é um popover
  // que cobre parte do tabuleiro, então enquanto ele está aberto o clique na
  // grade não chega no destino — ele acerta o menu. Por isso abrir o menu NÃO
  // arma mais o movimento; quem arma é o botão "Mover" de dentro dele, que
  // fecha o menu e libera a grade.
  const [menuAberto, setMenuAberto] = useState(null);   // índice com menu aberto
  const [movendoInterno, setMovendoInterno] = useState(null);   // índice armado pra mover
  const controlado = movendoControlado !== undefined && typeof onMovendoChange === 'function';
  const movendo = controlado ? movendoControlado : movendoInterno;
  // Aceita valor ou função, como o setState que ele substitui.
  const setMovendo = React.useCallback((v) => {
    if (!controlado) { setMovendoInterno(v); return; }
    onMovendoChange(typeof v === 'function' ? v(movendoControlado) : v);
  }, [controlado, onMovendoChange, movendoControlado]);
  const scrollRef = useRef(null);
  // Um ref por token (chave = índice do participante), para o menu se ancorar
  // no avatar. Guardado em Map porque a lista muda de tamanho entre rodadas.
  const tokenRefs = useRef(new Map());
  const refDoToken = React.useCallback((i) => {
    let r = tokenRefs.current.get(i);
    if (!r) { r = React.createRef(); tokenRefs.current.set(i, r); }
    return r;
  }, []);
  const fecharMenu = React.useCallback(() => setMenuAberto(null), []);
  /* Abrir o menu de um token por fora (13/09/2026): a magia canalizada que
     ficou pronta abre o painel de quem evoca na vez dele. `abrirMenu` é
     { i, chave }; a chave muda uma vez por ocasião, e só aí o menu abre. */
  const chaveAbrirMenu = abrirMenu ? abrirMenu.chave : null;
  useEffect(() => {
    if (abrirMenu && abrirMenu.i != null) { setMovendo(null); setMenuAberto(abrirMenu.i); }
    // eslint-disable-next-line
  }, [chaveAbrirMenu]);
  // "Mover": fecha o menu e deixa o token armado. O clique seguinte na grade
  // é que move.
  const armarMovimento = React.useCallback(() => {
    setMovendo(menuAberto);
    setMenuAberto(null);
  }, [menuAberto]);

  const cel = TAB_CELULA * TAB_ZOOMS[TAB_ZOOM_PADRAO];
  const largura = TAB_COLS * cel;
  const altura  = TAB_ROWS * cel;
  // Réguas acompanham o arraste (13/09/2026): a posição de rolagem move os
  // números das bordas junto do grid.
  const [rolagemXY, setRolagemXY] = useState({ x: 0, y: 0 });
  const aoRolar = React.useCallback((ev) => {
    const el = ev.currentTarget;
    setRolagemXY((a) => (a.x === el.scrollLeft && a.y === el.scrollTop ? a : { x: el.scrollLeft, y: el.scrollTop }));
  }, []);

  const entradaMenu = menuAberto == null ? null : entradas.find((e) => e.i === menuAberto);
  const entradaMov  = movendo    == null ? null : entradas.find((e) => e.i === movendo);
  const alvoMover   = entradaMov && podeSelecionar(entradaMov.p) ? entradaMov.p : null;
  // Escape desarma o Mover — com os tokens atravessáveis (MOVER SÓ MOVE, no
  // mapa de tokens abaixo), é a saída que sobra além de mover de fato.
  const movendoArmado = !!menuDe && !!alvoMover;
  useEffect(() => {
    if (!movendoArmado) return undefined;
    const aoTeclar = (ev) => { if (ev.key === 'Escape') setMovendo(null); };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [movendoArmado, setMovendo]);
  // Minion que fugiu (líder morto) saiu de cena: nem no grid, nem na bancada.
  /* Montaria em uso (14/09/2026): montado é COMBATENTE ÚNICO — o cavalo não
     tem token nem lugar na bancada; anda dentro do token do cavaleiro. */
  const _emUso = (window.MotorBatalha && window.MotorBatalha.ehMontariaEmUso) || (() => false);
  const participantesTab = entradas.map((e) => e.p);
  const visivel = (e) => !e.p.fugiu && !_emUso(e.p, participantesTab);
  const noTabuleiro = entradas.filter((e) => posValida(e.p.pos) && visivel(e));
  const naBancada   = entradas.filter((e) => !posValida(e.p.pos) && !e.p.ausente && visivel(e));
  const metaDe = (p) => (meta || {})[p.tipo + ':' + p.ref_id] || null;

  // Centraliza a rolagem no "centro de massa" dos tokens ao abrir.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let cx = TAB_COLS / 2, cy = TAB_ROWS / 2;
    if (noTabuleiro.length) {
      cx = noTabuleiro.reduce((s, e) => s + e.p.pos.x, 0) / noTabuleiro.length + TAB_TOKEN / 2;
      cy = noTabuleiro.reduce((s, e) => s + e.p.pos.y, 0) / noTabuleiro.length + TAB_TOKEN / 2;
    }
    el.scrollLeft = Math.max(0, cx * cel - el.clientWidth / 2);
    el.scrollTop  = Math.max(0, cy * cel - el.clientHeight / 2);
    // eslint-disable-next-line
  }, []);

  const aoClicarToken = React.useCallback((entrada) => {
    // Travado: com um menu ABERTO, o clique no token não fecha nem troca de
    // dono — é o painel aberto que a trava protege. Abrir a partir do nada
    // segue permitido: "travado e fechado" não existe no fluxo real (o painel
    // desmontado zera a rolagem pendente), e bloquear a abertura só deixaria
    // o usuário sem caminho de volta se acontecesse.
    if (menuTravado && menuAberto != null) return;
    // Sem menuDe (posicionamento do setup) não há menu no caminho: o clique
    // arma o movimento direto, como sempre foi.
    if (!menuDe) {
      setMovendo((atual) => (atual === entrada.i ? null : entrada.i));
      return;
    }
    setMovendo(null);
    setMenuAberto((atual) => (atual === entrada.i ? null : entrada.i));
  }, [menuDe, menuTravado, menuAberto]);

  // Pan por arrasto. `arrastou` distingue arraste de clique — sem isso,
  // soltar o mouse depois de arrastar movia o token.
  const pan = useRef({ ativo: false, arrastou: false, x0: 0, y0: 0, sl0: 0, st0: 0 });

  const aoClicarGrid = (ev) => {
    if (pan.current.arrastou) { pan.current.arrastou = false; return; }
    if (menuTravado) return;              // rolagem pendente: nada de sair pelo grid
    // Clicar na grade dispensa o menu, esteja armado o movimento ou não.
    setMenuAberto(null);
    if (movendo == null || !alvoMover || salvando) return;
    const r = ev.currentTarget.getBoundingClientRect();
    const fx = (ev.clientX - r.left) / cel;   // posição do clique, em células
    const fy = (ev.clientY - r.top) / cel;
    if (fx < 0 || fy < 0 || fx >= TAB_COLS || fy >= TAB_ROWS) return;
    /* O clique mira o CENTRO do token. Com token de lado par (2×2, desde
       14/09/2026) o centro é sempre um cruzamento de linhas da grade, nunca o
       meio de uma célula — então vale o cruzamento mais perto do clique:
       round(clique − lado/2). Com lado ímpar a mesma conta cai na célula
       clicada, como antes. */
    const mirado = {
      x: Math.max(0, Math.min(TAB_COLS - TAB_TOKEN, Math.round(fx - TAB_TOKEN / 2))),
      y: Math.max(0, Math.min(TAB_ROWS - TAB_TOKEN, Math.round(fy - TAB_TOKEN / 2))),
    };
    // Clique longe demais (ou em cima de alguém) não é mais recusado: anda
    // o quanto der naquela direção.
    // Quando a projeção não acha nada melhor (quem está na bancada não tem
    // origem; clicou na própria célula), manda o alvo cru: quem recusa é o
    // motor, e é ele que tem a mensagem certa pro Mestre. Engolir o clique
    // aqui deixaria o usuário sem explicação nenhuma.
    // O passo é o que alcanceDe diz (o halo desenhado): para quem anda é o
    // movimento dele; para quem é conduzido, o que a condução permite.
    const passo = alcanceDe ? alcanceDe(alvoMover) : null;
    const destino = destinoAlcancavel(alvoMover, mirado, entradas.map((e) => e.p),
      Number.isFinite(passo) ? passo : undefined) || mirado;
    if (onMover(alvoMover, movendo, destino)) setMovendo(null);
  };

  const panInicio = (ev) => {
    if (ev.button !== 0 || (ev.target.closest && ev.target.closest('.batalha-token'))) return;
    const el = scrollRef.current;
    if (!el) return;
    pan.current = { ativo: true, arrastou: false, x0: ev.clientX, y0: ev.clientY, sl0: el.scrollLeft, st0: el.scrollTop };
    el.classList.add('is-panning');
  };
  const panMove = (ev) => {
    const st = pan.current;
    if (!st.ativo) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = ev.clientX - st.x0, dy = ev.clientY - st.y0;
    if (!st.arrastou && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) st.arrastou = true;
    el.scrollLeft = st.sl0 - dx;
    el.scrollTop  = st.st0 - dy;
  };
  const panFim = () => {
    const el = scrollRef.current;
    if (el) el.classList.remove('is-panning');
    pan.current.ativo = false;
  };
  const toqueInicio = (ev) => {
    const t = ev.touches && ev.touches[0];
    if (!t || (t.target && t.target.closest && t.target.closest('.batalha-token'))) return;
    const el = scrollRef.current;
    if (!el) return;
    pan.current = { ativo: true, arrastou: false, x0: t.clientX, y0: t.clientY, sl0: el.scrollLeft, st0: el.scrollTop };
  };
  const toqueMove = (ev) => {
    const st = pan.current;
    if (!st.ativo) return;
    const t = ev.touches && ev.touches[0];
    const el = scrollRef.current;
    if (!t || !el) return;
    const dx = t.clientX - st.x0, dy = t.clientY - st.y0;
    if (!st.arrastou && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) st.arrastou = true;
    el.scrollLeft = st.sl0 - dx;
    el.scrollTop  = st.st0 - dy;
  };

  const alcance = alvoMover && posValida(alvoMover.pos) && alcanceDe ? alcanceDe(alvoMover) : null;

  // Sem margem inline: o ritmo vertical é do container (.batalha-conduzir usa
  // gap), senão cada filho negocia o próprio espaçamento e nada alinha.
  return React.createElement('div', { className: 'batalha-tabuleiro-wrap' },
    // Este espaço era a legenda "Clique numa célula para posicionar/mover:
    // Fulano · N m", removida a pedido. Agora ele carrega a RECUSA do último
    // movimento — que é a informação que faltava: a mensagem do motor ficava
    // longe do tabuleiro e o Mestre clicava sem entender por que nada
    // acontecia. Aparece só quando há o que dizer.
    aviso && React.createElement('div', { className: 'batalha-tabuleiro-aviso', role: 'status' },
      React.createElement('i', { className: 'ti ti-alert-triangle', 'aria-hidden': 'true' }),
      React.createElement('span', null, aviso)),

    /* RÉGUAS NUMERADAS (13/09/2026): "Numerar colunas e linhas no tabuleiro
       da batalha." Ficam FORA da área que rola — senão sumiam ao arrastar —
       e se deslocam com a rolagem (rolagemXY). Colunas 1–TAB_COLS em cima,
       linhas 1–TAB_ROWS à esquerda; a numeração conta a partir de 1 (a
       célula x=0 é a coluna 1). */
    React.createElement('div', { className: 'batalha-tabuleiro-quadro' },
      React.createElement('div', { className: 'batalha-tabuleiro-regua-canto', 'aria-hidden': 'true' }),
      React.createElement(ReguaTabuleiro, { eixo: 'col', total: TAB_COLS, cel, deslocamento: rolagemXY.x }),
      React.createElement(ReguaTabuleiro, { eixo: 'lin', total: TAB_ROWS, cel, deslocamento: rolagemXY.y }),
    React.createElement('div', {
      ref: scrollRef, className: 'batalha-tabuleiro-scroll',
      style: {
        overflow: 'hidden', borderRadius: 12, border: '1px solid rgba(201,164,78,.25)',
        background: 'rgba(10,8,4,.55)', touchAction: 'none',
      },
      onScroll: aoRolar,
      onMouseDown: panInicio, onMouseMove: panMove, onMouseUp: panFim, onMouseLeave: panFim,
      onTouchStart: toqueInicio, onTouchMove: toqueMove, onTouchEnd: panFim, onTouchCancel: panFim,
    },
      React.createElement('div', {
        onClick: aoClicarGrid,
        style: {
          position: 'relative', width: largura, height: altura,
          cursor: alvoMover ? 'crosshair' : 'default',
          // grade dupla: linha forte a cada 5 células, fraca a cada 1
          backgroundImage: [
            'linear-gradient(to right, rgba(201,164,78,.28) 1px, transparent 1px)',
            'linear-gradient(to bottom, rgba(201,164,78,.28) 1px, transparent 1px)',
            'linear-gradient(to right, rgba(201,164,78,.10) 1px, transparent 1px)',
            'linear-gradient(to bottom, rgba(201,164,78,.10) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: [
            cel * 5 + 'px ' + cel * 5 + 'px', cel * 5 + 'px ' + cel * 5 + 'px',
            cel + 'px ' + cel + 'px', cel + 'px ' + cel + 'px',
          ].join(', '),
        },
      },
        /* ESCURIDÃO (13/09/2026): "Adicione um efeito para escurecer o
           tabuleiro dependendo da iluminação." Uma camada sobre a grade e
           ABAIXO dos tokens — escurece o campo sem esconder quem está nele,
           porque o Mestre e os jogadores ainda precisam ler a mesa. A
           penalidade de verdade continua sendo a de coluna
           (penalidadeDeVisibilidade); isto é só o que se vê. Sempre montada,
           com opacidade 0 no claro, para a troca de iluminação esmaecer. */
        React.createElement('div', {
          'aria-hidden': 'true',
          'data-iluminacao': ESCURIDAO_NIVEIS.includes(visibilidade) ? visibilidade : 'clara',
          className: 'batalha-tabuleiro-escuridao batalha-tabuleiro-escuridao--'
            + (ESCURIDAO_NIVEIS.includes(visibilidade) ? visibilidade : 'clara'),
          style: { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 },
        }),
        /* Halo do movimento do selecionado — REDONDO desde 13/09/2026, o
           mesmo círculo que validarMovimento aceita (distanciaMovimento).
           O círculo é o LIMITE DO CENTRO do avatar ("A área redonda deve ser
           o limite do centro do avatar"): centro no meio do token e raio =
           passo, sem o meio token de folga que ele tinha. Com a folga, clicar
           perto da borda do halo parecia válido e o avatar parava antes, fora
           do ponto clicado. */
        alvoMover && alcance != null && Number.isFinite(alcance) && posValida(alvoMover.pos) && (() => {
          const r = Math.max(0, Math.floor(alcance));
          const raio = r * cel;
          const cx = (alvoMover.pos.x + TAB_TOKEN / 2) * cel;
          const cy = (alvoMover.pos.y + TAB_TOKEN / 2) * cel;
          return React.createElement('div', {
            className: 'batalha-tabuleiro-alcance',
            style: {
              position: 'absolute', left: cx - raio, top: cy - raio,
              width: raio * 2, height: raio * 2, borderRadius: '50%',
              background: 'rgba(201,164,78,.13)', border: '1px dashed rgba(201,164,78,.55)',
              boxSizing: 'border-box', pointerEvents: 'none',
            },
          });
        })(),
        noTabuleiro.map((e) => React.createElement('div', {
          key: e.p.inst_id || e.p.tipo + ':' + e.p.ref_id + ':' + e.i,
          style: {
            position: 'absolute',
            left: (e.p.pos.x + TAB_TOKEN / 2) * cel,
            top:  (e.p.pos.y + TAB_TOKEN / 2) * cel,
            transform: 'translate(-50%, -50%)',
            transition: 'left .15s ease, top .15s ease',
            zIndex: (e.i === menuAberto || e.i === movendo) ? 3 : (e.p.atual ? 2 : 1),
            pointerEvents: 'none',
          },
        }, React.createElement(TabuleiroToken, {
          p: e.p, meta: metaDe(e.p), refAvatar: refDoToken(e.i),
          size: Math.max(14, Math.round(TAB_TOKEN_ESCALA * cel * 0.95)),
          selecionado: e.i === menuAberto || e.i === movendo, atual: !!e.p.atual,
          // Com menu, todo token abre — inclusive o de quem não pode ser
          // movido. Quem move continua sendo decidido por alvoMover.
          podeSel: !salvando && (podeSelecionar(e.p) || !!menuDe),
          /* MOVER SÓ MOVE (14/09/2026): "quando eu clicar em mover, remova a
             opção de clicar em um adversário. Clicar em mover restringe apenas
             à movimentação." Com o movimento armado na batalha (há menuDe),
             nenhum token recebe clique: o clique em cima de um adversário vai
             para a grade e vira destino. Escape desarma. Na montagem (sem
             menuDe) clicar noutro token continua trocando quem posiciona. */
          atravessavel: movendoArmado,
          onSelect: () => aoClicarToken(e),
        })))
      )
    )),

    // bancada: quem ainda não foi posicionado. Sem o rótulo "Ainda fora do
    // tabuleiro (N)" (pedido do usuário, 12/09/2026), e escondida de vez na
    // montagem (`semBancada`), onde o posicionamento sai do ícone da lista.
    !semBancada && naBancada.length > 0 && React.createElement('div', {
      className: 'batalha-tabuleiro-bancada',
      style: {
        marginTop: 10, padding: '8px 10px', borderRadius: 10,
        border: '1px dashed rgba(201,164,78,.35)', background: 'rgba(201,164,78,.05)',
      },
    },
      React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 10 } },
        naBancada.map((e) => React.createElement('div', {
          key: e.p.inst_id || e.p.tipo + ':' + e.p.ref_id + ':' + e.i,
        }, React.createElement(TabuleiroToken, {
          p: e.p, meta: metaDe(e.p), size: 34, refAvatar: refDoToken(e.i),
          selecionado: e.i === menuAberto || e.i === movendo, atual: !!e.p.atual,
          podeSel: !salvando && (podeSelecionar(e.p) || !!menuDe),
          onSelect: () => aoClicarToken(e),
        }))))
    ),

    // menu do participante — só existe se o chamador mandou conteúdo
    menuDe && entradaMenu && React.createElement(TabuleiroMenu, {
      alvoEl: refDoToken(entradaMenu.i), onFechar: fecharMenu,
      rotuloFechar: (tb && tb.fechar) || (isEn ? 'Close' : 'Fechar'),
      rotuloVoltar: (tb && tb.voltar) || (isEn ? 'Back' : 'Voltar'),
      aoVoltar: (menuVoltar && menuVoltar(entradaMenu.p, entradaMenu.i)) || null,
      travado: !!menuTravado,
      // 4º argumento: a função que ARMA o movimento, ou null quando este
      // participante não pode mover. Vai pro chamador porque o botão "Mover"
      // mora na mesma fileira de Ação e Passar, que são dele — o tabuleiro
      // não tem como desenhá-lo lá de fora.
    }, menuDe(entradaMenu.p, entradaMenu.i, fecharMenu,
      (onMover && !salvando && podeSelecionar(entradaMenu.p)) ? armarMovimento : null))
  );
}

Object.assign(window, {
  TabuleiroBatalha, TabuleiroToken,
  // Soltos no window porque batalha.jsx (carregado ANTES deste arquivo) os
  // referencia por NOME NU — a resolução acontece em chamada, não na carga,
  // então a ordem de import do main.tsx basta.
  //
  // ⚠️ TUDO que batalha.jsx chama sem prefixo precisa estar AQUI, não só
  // dentro de MotorTabuleiro: estes são módulos ES, e uma `function` de
  // tabuleiro.jsx não vaza pro escopo global. Faltavam celulaOcupada,
  // moverParticipante e motivoMovimento, e o efeito era exatamente este:
  // posicionarNoSetup estourava ReferenceError no celulaOcupada (não dava
  // pra colocar avatar nenhum no tabuleiro) e moverNoTabuleiro estourava no
  // moverParticipante (não dava pra mover ninguém). Como o throw acontecia
  // dentro do onClick, morria silencioso no console e a tela não reagia.
  // alcanceDaAcao/distanciaEntre/alvoNoAlcance entraram com a checagem de
  // alcance e tinham o mesmo defeito.
  posValida, movimentoBase, preservarPosicoes,
  celulaOcupada, moverParticipante, motivoMovimento,
  // dentroDoAlcance entrou com alvosDeArea (magias, Fase 1) e parseAlcance com
  // alvosDeAura (Fase 2): batalha.jsx chama as duas sem prefixo pra montar a
  // lista de alvos de uma magia de área — a aura usa o `alcance` como raio.
  alcanceDaAcao, distanciaEntre, alvoNoAlcance, dentroDoAlcance, parseAlcance,
  // 13/09/2026: 1º movimento grátis, 2º custa PA — batalha.jsx usa para saber
  // se o token pode andar e quanto destacar.
  movimentoDisponivel,
  // 13/09/2026: bandos — o líder leva os minions (moverNoTabuleiro/posicionarNoSetup).
  bandoSegueLider, minionPresoAoLider,
  // 14/09/2026: Conduzir Oponente — quem conduz leva o adversário pelo tabuleiro.
  conducaoDisponivel, conduzirParticipante,
  // Camada pura do tabuleiro — testada em tabuleiro.test.js.
  MotorTabuleiro: {
    TAB_COLS, TAB_ROWS, TAB_TOKEN, TAB_CELULA, TAB_ZOOMS, TAB_TOKEN_ESCALA,
    MOV_MIN, MOV_FATOR, MOV_MOTIVOS,
    movimentoBase, posValida, distanciaCelulas, distanciaMovimento, custoMovimento, distanciaBordas, posicionarMenu,
    parseAlcance, dentroDoAlcance, alcanceDaAcao, celulaOcupada,
    validarMovimento, moverParticipante, preservarPosicoes, destinoAlcancavel, movimentoDisponivel,
    distanciaEntre, alvoNoAlcance, motivoMovimento, selosDoToken,
    danoNasPools, FLASH_DANO_MS, ESCURIDAO_NIVEIS, fracaoEfDoToken,
    casasAoRedor, bandoSegueLider, minionPresoAoLider,
    MAX_CELULAS_COMPARTILHADAS, celulasEmComum,
    CONDUCAO_CASAS_PADRAO, conducaoDisponivel, conduzirParticipante,
  },
});
