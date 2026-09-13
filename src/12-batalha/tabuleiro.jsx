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

/* ── Geometria do tabuleiro (valores exatos do bundle) ─────────────────
   Grid de 70×35 células. Cada participante ocupa um bloco de 3×3 — por
   isso todo clamp de posição é contra (COLS - TOKEN) e (ROWS - TOKEN), e
   as distâncias de borda descontam (TOKEN - 1).                        */
const TAB_COLS   = 70;      // largura do tabuleiro, em células
const TAB_ROWS   = 35;      // altura do tabuleiro, em células
const TAB_TOKEN  = 3;       // lado do token, em células (3×3)
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

/* Distância de MOVIMENTO entre duas células — Chebyshev (diagonal custa
   igual a ortogonal). É a que o gasto de movimento consome. */
function distanciaCelulas(a, b) {
  if (!a || !b) return Infinity;
  return Math.max(Math.abs((a.x || 0) - (b.x || 0)), Math.abs((a.y || 0) - (b.y || 0)));
}

/* Distância de ALCANCE entre dois tokens — mesma Chebyshev, mas de BORDA
   a borda: desconta (TAB_TOKEN - 1) em cada eixo, porque os tokens têm
   3×3. Dois tokens encostados dão 0. */
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

/* Célula ocupada por qualquer participante VIVO e posicionado (exceto o
   que está se movendo). Morto/desistiu não bloqueia. */
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
    return posValida(p.pos) && distanciaBordas(pos, p.pos) === 0;
  });
}

/* Códigos de recusa de movimento + texto PT/EN (recuperados do bundle). */
const MOV_MOTIVOS = {
  nao_ativo:          ['O participante não está ativo.',              'Participant is not active.'],
  sem_acoes:          ['Sem ações nesta rodada (status).',            'No actions this round (status).'],
  sem_posicao:        ['Participante ainda sem posição.',             'Participant has no position yet.'],
  fora_do_tabuleiro:  ['Destino fora do tabuleiro.',                  'Destination outside the board.'],
  mesmo_lugar:        ['Já está nessa célula.',                       'Already on that cell.'],
  sem_movimento:      ['Além do movimento restante da rodada.',       'Beyond the remaining movement this round.'],
  ja_moveu:           ['Já se moveu nesta rodada.',                   'Already moved this round.'],
  celula_ocupada:     ['Célula ocupada.',                             'Cell occupied.'],
  nao_e_a_vez:        ['Só quem está na vez pode se mover.',          'Only the active fighter can move.'],
};

function motivoMovimento(codigo, isEn) {
  const m = MOV_MOTIVOS[codigo];
  return m ? (isEn ? m[1] : m[0]) : String(codigo || '');
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
  // Um movimento por rodada (30/08/2026). `mov_rest` continua limitando a
  // DISTÂNCIA desse único movimento; esta flag limita a QUANTIDADE. Sem ela
  // dava pra fatiar o deslocamento em vários cliques, o que na prática era
  // movimento ilimitado dentro do alcance.
  if (p.moveu_na_rodada)     return { ok: false, motivo: 'ja_moveu' };
  if (!posValida(p.pos))     return { ok: false, motivo: 'sem_posicao' };
  if (!posValida(destino))   return { ok: false, motivo: 'fora_do_tabuleiro' };

  const dist = distanciaCelulas(p.pos, destino);
  if (dist === 0) return { ok: false, motivo: 'mesmo_lugar' };
  const mov = Number.isFinite(p.mov_rest) ? p.mov_rest : movimentoBase(p.vb);
  if (dist > mov) return { ok: false, motivo: 'sem_movimento' };
  if (celulaOcupada(destino, participantes, p)) return { ok: false, motivo: 'celula_ocupada' };
  return { ok: true, dist };
}

/* Aplica o movimento: desconta as células andadas e fecha o movimento da
   rodada (moveu_na_rodada).
   ────────────────────────────────────────────────────────────────────
   NÃO cobra PA (mudado em 30/08/2026). Antes cobrava os dois, e com
   criatura tendo pa_max 1 o PA sempre acabava primeiro: ela andava uma
   única vez, a vez passava na hora, e ainda sobrava mov_rest na barra —
   nunca conseguia mover e agir na mesma rodada. Movimento é orçamento
   de mov_rest; PA é orçamento de AÇÃO. Cobrar nos dois era cobrança
   dobrada e deixava o mov_rest sem função.

   Não muta o participante recebido. */
function moverParticipante(p, destino, participantes) {
  const v = validarMovimento(p, destino, participantes);
  if (!v.ok) return { ok: false, motivo: v.motivo, participante: p };
  const mov = Number.isFinite(p.mov_rest) ? p.mov_rest : movimentoBase(p.vb);
  return {
    ok: true,
    dist: v.dist,
    participante: {
      ...p,
      pos: { x: destino.x, y: destino.y },
      mov_rest: mov - v.dist,
      moveu_na_rodada: true,
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

   Devolve null quando não há nenhuma célula boa na direção. */
function destinoAlcancavel(p, desejado, participantes) {
  if (!p || !posValida(p.pos) || !posValida(desejado)) return null;
  const dist = distanciaCelulas(p.pos, desejado);
  if (dist === 0) return null;                       // já está lá
  const mov = Number.isFinite(p.mov_rest) ? p.mov_rest : movimentoBase(p.vb);
  // Do mais longe permitido para o mais perto: o primeiro que serve ganha,
  // então um clique legal devolve exatamente a célula clicada.
  for (let d = Math.min(dist, mov); d >= 1; d--) {
    const t = d / dist;
    const c = {
      x: p.pos.x + Math.round((desejado.x - p.pos.x) * t),
      y: p.pos.y + Math.round((desejado.y - p.pos.y) * t),
    };
    // O arredondamento pode estourar o passo; nesse caso pula.
    if (!posValida(c) || distanciaCelulas(p.pos, c) > mov) continue;
    if (distanciaCelulas(p.pos, c) === 0) continue;
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

/* ── Token: avatar redondo + status + nome + barras EF/EH/AR ───────── */
function TabuleiroToken({ p, meta, size, selecionado, atual, podeSel, onSelect, abrirTip, fecharTip, refAvatar }) {
  const m = meta || {};
  const foto = p.foto_url || m.foto_url || null;
  const raca = p.raca || m.raca || null;
  const inicial = ((p.nome || '?').trim()[0] || '?').toUpperCase();
  const status = p.status || 'ativo';
  const fora = status === 'morto' || status === 'desistiu';
  const cor = selecionado ? 'var(--gold, #C9A44E)'
    : (p.tipo === 'pj' ? 'rgba(201,164,78,.9)' : 'rgba(184,71,47,.95)');
  const grande = size >= 24;
  // Só o nome: raça e status já aparecem no token (selo de caveira/zzz) e no
  // menu que o clique abre — repetir os três no hover só polui.
  const titulo = p.nome;
  const barra = (valor, max, grad) => React.createElement('div', {
    style: { width: '100%', height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.10)', overflow: 'hidden' },
  }, React.createElement('div', {
    style: {
      height: '100%', borderRadius: 2,
      width: (valor != null && max > 0 ? Math.max(0, Math.min(1, valor / max)) * 100 : 0) + '%',
      background: grad, transition: 'width .35s cubic-bezier(.4,.0,.2,1)',
    },
  }));

  return React.createElement('div', {
    role: podeSel ? 'button' : undefined,
    tabIndex: podeSel ? 0 : undefined,
    onClick: (e) => { e.stopPropagation(); if (podeSel) onSelect(e); },
    onKeyDown: (e) => {
      if (podeSel && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); onSelect(e); }
    },
    onMouseEnter: (e) => { if (abrirTip) abrirTip(e, titulo); },
    onMouseLeave: () => { if (fecharTip) fecharTip(); },
    title: abrirTip ? undefined : titulo,
    className: 'batalha-token' + (atual ? ' batalha-token--atual' : ''),
    style: {
      position: 'relative', width: size, display: 'flex', flexDirection: 'column',
      alignItems: 'center', cursor: podeSel ? 'pointer' : 'default', pointerEvents: 'auto',
    },
  },
    // anel pulsante de "é a vez dele"
    atual && React.createElement('span', {
      'aria-hidden': 'true', className: 'batalha-token-vez-ring',
      style: { width: size + 10, height: size + 10, top: -5, left: '50%', marginLeft: -(size + 10) / 2 },
    }),
    React.createElement('div', {
      ref: refAvatar,
      style: {
        width: size, height: size, borderRadius: '50%', overflow: 'hidden', flex: 'none',
        border: '2px solid ' + cor,
        boxShadow: atual
          ? '0 0 0 3px rgba(201,164,78,.45), 0 0 16px rgba(201,164,78,.65)'
          : '0 1px 4px rgba(0,0,0,.5)',
        background: 'linear-gradient(135deg, rgba(184,112,46,.95), rgba(122,94,42,.95))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: fora ? 0.35 : (status === 'desmaiado' ? 0.55 : 1),
        transform: selecionado ? 'scale(1.12)' : 'none',
        transition: 'transform .15s ease, opacity .2s ease',
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
        }, inicial)),
    // selo de status (caveira / zzz / bandeira)
    status !== 'ativo' && size >= 18 && React.createElement('span', {
      style: { position: 'absolute', top: -4, right: -6, lineHeight: 1, fontSize: Math.max(10, Math.round(size * 0.32)) },
    }, React.createElement('i', {
      className: 'ti ' + (status === 'morto' ? 'ti-skull' : status === 'desmaiado' ? 'ti-zzz' : 'ti-flag'),
      'aria-hidden': 'true', style: { color: '#f2e8d5', textShadow: '0 1px 2px #000' },
    })),
    // nome + barras (só quando o zoom dá espaço)
    grande && React.createElement('div', {
      style: { pointerEvents: 'none', marginTop: 2, textAlign: 'center', maxWidth: size * 2.6, lineHeight: 1.12 },
    },
      React.createElement('div', {
        style: {
          fontFamily: 'Lora, serif', fontSize: Math.max(8, Math.round(size * 0.26)),
          color: 'var(--foreground, #f2e8d5)', textShadow: '0 1px 2px rgba(0,0,0,.85)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        },
      }, (p.nome || '').split(' ')[0]),
      /* Largura FIXA, a do avatar (pedido do usuário, 12/09/2026). Com
         `width: 100%` a barra acompanhava o bloco do nome, que cresce com o
         texto — "Lysandra" ganhava barras mais largas que "Eco", e a mesma
         vida parecia outra de token para token. */
      size >= 28 && React.createElement('div', {
        className: 'batalha-token-barras',
        style: { marginTop: 3, marginLeft: 'auto', marginRight: 'auto', display: 'flex', flexDirection: 'column', gap: 2, width: size },
      },
        barra(p.ef, p.ef_max, 'linear-gradient(90deg, #a83232, #d9685a)'),
        barra(p.eh, p.eh_max, 'linear-gradient(90deg, #6b9a52, #a4cf85)'),
        // AR e KA só aparecem para quem tem: criatura sem absorção e PJ sem
        // karma ganhariam uma barra sempre vazia embaixo do avatar.
        // Armadura: a barra é a RESISTÊNCIA das peças (12/09/2026) — a
        // absorção virou limiar fixo e nunca esvaziava.
        p.res_max > 0 && barra(p.res, p.res_max, 'linear-gradient(90deg, #6b7280, #b8bec8)'),
        p.karma_max > 0 && barra(p.karma, p.karma_max, 'linear-gradient(90deg, #7a52a8, #b48bd3)')
      ))
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
  movendoControlado, onMovendoChange, semBancada,
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
  // "Mover": fecha o menu e deixa o token armado. O clique seguinte na grade
  // é que move.
  const armarMovimento = React.useCallback(() => {
    setMovendo(menuAberto);
    setMenuAberto(null);
  }, [menuAberto]);

  const cel = TAB_CELULA * TAB_ZOOMS[TAB_ZOOM_PADRAO];
  const largura = TAB_COLS * cel;
  const altura  = TAB_ROWS * cel;

  const entradaMenu = menuAberto == null ? null : entradas.find((e) => e.i === menuAberto);
  const entradaMov  = movendo    == null ? null : entradas.find((e) => e.i === movendo);
  const alvoMover   = entradaMov && podeSelecionar(entradaMov.p) ? entradaMov.p : null;
  const noTabuleiro = entradas.filter((e) => posValida(e.p.pos));
  const naBancada   = entradas.filter((e) => !posValida(e.p.pos) && !e.p.ausente);
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
    const cx = Math.floor((ev.clientX - r.left) / cel);
    const cy = Math.floor((ev.clientY - r.top) / cel);
    if (cx < 0 || cy < 0 || cx >= TAB_COLS || cy >= TAB_ROWS) return;
    // clique mira o CENTRO do token 3×3, por isso o -metade e o clamp
    const meio = Math.floor(TAB_TOKEN / 2);
    const mirado = {
      x: Math.max(0, Math.min(TAB_COLS - TAB_TOKEN, cx - meio)),
      y: Math.max(0, Math.min(TAB_ROWS - TAB_TOKEN, cy - meio)),
    };
    // Clique longe demais (ou em cima de alguém) não é mais recusado: anda
    // o quanto der naquela direção.
    // Quando a projeção não acha nada melhor (quem está na bancada não tem
    // origem; clicou na própria célula), manda o alvo cru: quem recusa é o
    // motor, e é ele que tem a mensagem certa pro Mestre. Engolir o clique
    // aqui deixaria o usuário sem explicação nenhuma.
    const destino = destinoAlcancavel(alvoMover, mirado, entradas.map((e) => e.p)) || mirado;
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

    React.createElement('div', {
      ref: scrollRef, className: 'batalha-tabuleiro-scroll',
      style: {
        overflow: 'hidden', borderRadius: 12, border: '1px solid rgba(201,164,78,.25)',
        background: 'rgba(10,8,4,.55)', touchAction: 'none',
      },
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
        // halo do alcance/movimento do selecionado
        alvoMover && alcance != null && Number.isFinite(alcance) && posValida(alvoMover.pos) && (() => {
          const r = Math.max(0, Math.floor(alcance));
          const x0 = Math.max(0, alvoMover.pos.x - r);
          const y0 = Math.max(0, alvoMover.pos.y - r);
          const x1 = Math.min(TAB_COLS - 1, alvoMover.pos.x + TAB_TOKEN - 1 + r);
          const y1 = Math.min(TAB_ROWS - 1, alvoMover.pos.y + TAB_TOKEN - 1 + r);
          return React.createElement('div', {
            style: {
              position: 'absolute', left: x0 * cel, top: y0 * cel,
              width: (x1 - x0 + 1) * cel, height: (y1 - y0 + 1) * cel,
              background: 'rgba(201,164,78,.13)', outline: '1px dashed rgba(201,164,78,.55)',
              pointerEvents: 'none',
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
          onSelect: () => aoClicarToken(e),
          abrirTip, fecharTip,
        })))
      )
    ),

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
          abrirTip, fecharTip,
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
  // Camada pura do tabuleiro — testada em tabuleiro.test.js.
  MotorTabuleiro: {
    TAB_COLS, TAB_ROWS, TAB_TOKEN, TAB_CELULA, TAB_ZOOMS, TAB_TOKEN_ESCALA,
    MOV_MIN, MOV_FATOR, MOV_MOTIVOS,
    movimentoBase, posValida, distanciaCelulas, distanciaBordas, posicionarMenu,
    parseAlcance, dentroDoAlcance, alcanceDaAcao, celulaOcupada,
    validarMovimento, moverParticipante, preservarPosicoes, destinoAlcancavel,
    distanciaEntre, alvoNoAlcance, motivoMovimento,
  },
});
