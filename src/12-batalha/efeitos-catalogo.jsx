/* ============================================================
   efeitos-catalogo.jsx — o desenho de cada efeito da revelação (17/11/2026)
   ============================================================
   Usuário: "Faça uma sugestão de efeito para cada tipo de ataque, magia,
   efeito que podem acontecer em batalha [...] golpe desviado, golpe
   esquivado, etc." O protótipo aprovado ("Todos ficaram bons") está em
   https://claude.ai/artifact/VC2mJGFbCMhTJoFUTVRXkC; este arquivo é ele,
   portado. Duas decisões vieram junto:
     • o projétil (arco, besta, funda) usa o efeito da perfuração;
     • todo texto do efeito tem a mesma fonte, tamanho e peso (a fonte do
       sistema); só o tom muda.

   QUEM DECIDE O QUÊ: efeitos-da-vez.jsx lê o log e monta a lista `f`
   (efeitosDaRevelacao, puro); aqui só se DESENHA um `f` sobre a tela, com
   Web Animations em pedaços pequenos e isolados que se apagam ao terminar.
   O token do alvo é achado por `data-fx-chave`; o movimento nele usa as
   propriedades soltas (translate/rotate/scale), nunca `transform`, que é
   de quem posiciona o token no tabuleiro.

   Movimento reduzido: o brilho na cor do efeito, parado, e o número.
   ============================================================ */

const FXC_E = { suave: 'cubic-bezier(.16,1,.3,1)', seco: 'cubic-bezier(.2,.9,.2,1)', queda: 'cubic-bezier(.3,.6,.5,1)' };
const FXC_SANGUE = '#c0182a';
const fxR = (a, b) => a + Math.random() * (b - a);
const fxT = (x = 0, y = 0, r = 0, sx = 1, sy = sx) => `translate(${x}px,${y}px) rotate(${r}deg) scale(${sx},${sy})`;

function fxAnimar(el, kf, opts) {
  if (!el || typeof el.animate !== 'function') return null;
  try { return el.animate(kf, opts); } catch (e) { return null; }
}

/* ── Peças de montar ───────────────────────────────────────────── */
function fxP(st, o) {
  const d = document.createElement('i');
  d.className = 'fx-p' + (o.cls ? ' ' + o.cls : '');
  const w = o.w, h = o.h == null ? o.w : o.h;
  d.style.left = (o.x - w / 2) + 'px'; d.style.top = (o.y - h / 2) + 'px';
  d.style.width = w + 'px'; d.style.height = h + 'px';
  if (o.txt) d.textContent = o.txt;
  if (o.css) Object.assign(d.style, o.css);
  st.layer.appendChild(d);
  const a = fxAnimar(d, o.kf, { duration: o.dur || 900, delay: o.delay || 0, easing: o.ease || FXC_E.suave, fill: 'both' });
  if (a) a.onfinish = () => d.remove();
  return d;
}
function fxBrilho(st, x, y, tam, cor, o = {}) {
  fxP(st, { x, y, w: tam, dur: o.dur || 1000, delay: o.delay || 0,
    css: { borderRadius: '50%', background: `radial-gradient(circle, ${cor} 0%, transparent 62%)`, mixBlendMode: 'screen' },
    kf: [{ opacity: 0, transform: fxT(0, 0, 0, .3) }, { opacity: o.pico || .95, transform: fxT(0, 0, 0, 1), offset: .2 }, { opacity: 0, transform: fxT(0, 0, 0, 1.25) }] });
}
function fxEstouro(st, x, y, o) {
  const n = o.n || 8, dist = o.dist || 50, a0 = o.a0 == null ? 0 : o.a0, a1 = o.a1 == null ? 360 : o.a1;
  for (let i = 0; i < n; i++) {
    const ang = (a0 + (a1 - a0) * ((i + fxR(.2, .8)) / n)) * Math.PI / 180;
    const d = dist * fxR(.6, 1.15), dx = Math.cos(ang) * d, dy = Math.sin(ang) * d;
    const forma = o.forma || 'ponto';
    let w = o.tam || 5, h = w, r = 0, r2 = 0;
    const css = { background: o.cor, borderRadius: '50%', boxShadow: o.luz ? `0 0 6px 2px ${o.luz}` : 'none' };
    if (forma === 'linha') { w = o.comp || 16; h = o.esp || 2; css.borderRadius = '2px'; css.background = `linear-gradient(90deg, transparent, ${o.cor})`; r = r2 = ang * 180 / Math.PI; }
    if (forma === 'lasca') { w = o.tam || 9; h = w * .8; css.borderRadius = '0'; css.clipPath = 'polygon(20% 0,85% 12%,100% 60%,62% 100%,8% 82%,0 30%)'; r2 = fxR(-260, 260); }
    if (forma === 'gota') { w = o.tam || 6; h = w * 1.5; css.borderRadius = '50% 50% 50% 50% / 62% 62% 38% 38%'; }
    const g = o.grav || 0;
    const kf = g ? [
      { opacity: 0, transform: fxT(0, 0, r, .7) },
      { opacity: 1, offset: .12 },
      { transform: fxT(dx, dy, (r + r2) / 2, 1), offset: .5 },
      { opacity: 0, transform: fxT(dx * 1.25, dy * .3 + g, r2, 1) },
    ] : [
      { opacity: 0, transform: fxT(0, 0, r, .6) },
      { opacity: 1, offset: .15 },
      { opacity: 0, transform: fxT(dx, dy, r2, o.fim == null ? .4 : o.fim) },
    ];
    fxP(st, { x, y, w, h, css, kf, dur: (o.dur || 900) * fxR(.85, 1.1), delay: (o.delay || 0) + i * (o.passo || 0), ease: g ? FXC_E.queda : FXC_E.suave });
  }
}
function fxAnel(st, x, y, o) {
  fxP(st, { x, y, w: o.w, h: o.h || o.w, dur: o.dur || 1000, delay: o.delay || 0, ease: o.ease,
    css: { borderRadius: '50%', border: `${o.esp || 2}px ${o.estilo || 'solid'} ${o.cor}`, background: o.fundo || 'none',
      boxShadow: o.luz ? `0 0 12px ${o.luz}, inset 0 0 8px ${o.luz}` : 'none' },
    kf: [{ opacity: 0, transform: fxT(0, 0, o.r0 || 0, o.de == null ? .3 : o.de) }, { opacity: 1, offset: o.pico || .25 },
      ...(o.segura ? [{ opacity: 1, offset: o.segura }] : []),
      { opacity: 0, transform: fxT(0, 0, o.r1 || 0, o.ate == null ? 1.4 : o.ate) }] });
}
function fxTalho(st, x, y, o = {}) {
  const s = o.tam || 96;
  fxP(st, { x, y, w: s, dur: o.dur || 520, delay: o.delay || 0, ease: FXC_E.seco,
    css: { borderRadius: '50%', borderTop: `${o.esp || 5}px solid ${o.cor || '#fff8ea'}`, borderRight: `2px solid ${o.cor2 || 'rgba(255,240,220,.5)'}`,
      filter: `drop-shadow(0 0 8px ${o.luz || 'rgba(255,220,180,.95)'})` },
    kf: [{ opacity: 0, transform: fxT(0, 0, o.r0 == null ? -150 : o.r0, .9) }, { opacity: o.op || 1, offset: .25 }, { opacity: 0, transform: fxT(0, 0, o.r1 == null ? 20 : o.r1, 1) }] });
}
function fxRisco(st, x, y, o) {
  fxP(st, { x, y, w: o.comp, h: o.esp || 3, dur: o.dur || 900, delay: o.delay || 0,
    css: { background: o.cor, borderRadius: '3px', boxShadow: o.luz ? `0 0 6px ${o.luz}` : 'none', clipPath: o.clip || 'none' },
    kf: [{ opacity: 0, transform: fxT(0, 0, o.ang || 0, 0, 1) }, { opacity: 1, transform: fxT(0, 0, o.ang || 0, 1, 1), offset: o.cresce || .2 },
      { opacity: 1, offset: o.segura || .6 }, { opacity: 0, transform: fxT(0, 0, o.ang || 0, 1, 1) }] });
}
function fxEstrela(st, x, y, o = {}) {
  const s = o.tam || 70;
  fxP(st, { x, y, w: s, dur: o.dur || 520, delay: o.delay || 0,
    css: { background: o.cor || 'radial-gradient(circle, #ffffff 0%, #ffe2b8 18%, rgba(255,140,70,.55) 40%, transparent 64%)',
      clipPath: 'polygon(50% 0,60% 35%,98% 22%,68% 52%,100% 78%,58% 66%,50% 100%,40% 66%,2% 80%,32% 52%,0 20%,40% 35%)' },
    kf: [{ opacity: 0, transform: fxT(0, 0, 0, .2) }, { opacity: 1, transform: fxT(0, 0, 8, 1), offset: .3 }, { opacity: 0, transform: fxT(0, 0, 14, 1.25) }] });
}
function fxMissil(st, a, b, o) {
  const dur = o.dur || 380, ini = o.delay || 0, arco = o.arco == null ? -26 : o.arco;
  const dx = b.x - a.x, dy = b.y - a.y, s = o.tam || 16;
  fxP(st, { x: a.x, y: a.y, w: s, dur, delay: ini, ease: 'linear',
    css: { borderRadius: '50%', background: o.nucleo, boxShadow: `0 0 10px 4px ${o.luz}` },
    kf: [{ opacity: 0, transform: fxT(0, 0, 0, .4) }, { opacity: 1, transform: fxT(dx * .1, dy * .1 + arco * .36, 0, 1), offset: .1 },
      { transform: fxT(dx * .5, dy * .5 + arco, 0, 1), offset: .5 }, { opacity: 1, transform: fxT(dx, dy, 0, 1.1), offset: .96 }, { opacity: 0, transform: fxT(dx, dy, 0, 1.4) }] });
  if (o.rastro) for (let i = 1; i <= 7; i++) {
    const t = i / 8, px = a.x + dx * t, py = a.y + dy * t + arco * 4 * t * (1 - t);
    fxP(st, { x: px, y: py, w: s * .6, dur: 520, delay: ini + dur * t, css: { borderRadius: '50%', background: o.rastro, filter: 'blur(1px)' },
      kf: [{ opacity: 0, transform: fxT(0, 0, 0, 1) }, { opacity: .85, offset: .08 }, { opacity: 0, transform: fxT(fxR(-4, 4), fxR(-12, -3), 0, .3) }] });
  }
  return ini + dur;
}
/* O texto do efeito: um só para tudo (fonte, tamanho e peso), só o tom muda. */
function fxNumero(st, x, y, txt, o = {}) {
  const d = document.createElement('b');
  d.className = 'fx-valor';
  d.style.left = x + 'px'; d.style.top = (y - (o.alto == null ? 64 : o.alto)) + 'px';
  d.style.color = o.cor || 'var(--fx-dano)';
  d.appendChild(document.createTextNode(txt));
  if (o.sub) { const s = document.createElement('small'); s.textContent = o.sub; d.appendChild(s); }
  st.layer.appendChild(d);
  const a = fxAnimar(d, [{ opacity: 0, transform: 'translate(-50%,10px) scale(.8)' }, { opacity: 1, transform: 'translate(-50%,0) scale(1.08)', offset: .18 },
    { transform: 'translate(-50%,0) scale(1)', offset: .3 }, { opacity: 1, offset: .82 }, { opacity: 0, transform: 'translate(-50%,-16px) scale(1)' }],
    { duration: o.dur || 1500, delay: o.delay || 0, easing: FXC_E.suave, fill: 'both' });
  if (a) a.onfinish = () => d.remove();
}
/* Movimento no token: propriedades soltas, para não brigar com o transform
   que posiciona o token. */
/* A curva vai em CADA passo, não na animação inteira: com a curva no todo, o
   token que salta, segura e volta (esquiva, queda) mal saía do lugar. */
function fxMover(el, kf, dur, delay = 0, ease = 'ease-out') {
  fxAnimar(el, kf.map((k) => ({ easing: ease, ...k })), { duration: dur, delay, easing: 'linear' });
}
function fxTremer(el, amp = 4, delay = 0) {
  fxMover(el, [{ translate: '0 0' }, { translate: `${-amp}px 1px` }, { translate: `${amp}px -1px` },
    { translate: `${-amp * .7}px 0` }, { translate: `${amp * .5}px 0` }, { translate: '0 0' }], 420, delay, 'linear');
}
function fxTingir(el, filtro, dur = 900, delay = 0) {
  fxMover(el, [{ filter: 'none' }, { filter: filtro, offset: .15 }, { filter: filtro, offset: .6 }, { filter: 'none' }], dur, delay);
}
function fxTela(st, fundo, o = {}) {
  fxP(st, { x: st.w / 2, y: st.h / 2, w: st.w, h: st.h, dur: o.dur || 600, delay: o.delay || 0, css: { background: fundo },
    kf: o.kf || [{ opacity: 0 }, { opacity: 1, offset: .12 }, { opacity: 0 }] });
}
function fxChamas(st, x, y, o = {}) {
  const t = 56, dxs = [-.38, .36, -.12, .16, 0], atr = [40, 90, 0, 140, 200];
  dxs.forEach((dx, i) => {
    const h = t * (i === 4 ? 1.3 : 1.1);
    fxP(st, { x: x + dx * t, y: y - h / 2 + 10, w: t * .5, h, dur: 1000, delay: (o.delay || 0) + atr[i], ease: 'cubic-bezier(.3,.7,.4,1)',
      css: { borderRadius: '50% 50% 45% 45% / 62% 62% 38% 38%', transformOrigin: '50% 100%', filter: 'blur(.6px)', mixBlendMode: 'screen',
        background: o.grad || 'radial-gradient(ellipse at 50% 78%, #fff6c8 0%, #ffd25a 22%, #ff8a1f 48%, #c8300e 74%, transparent 78%)' },
      kf: [{ opacity: 0, transform: fxT(0, 0, 0, .4, .1) }, { opacity: 1, transform: fxT(0, 0, -4, 1, 1.05), offset: .25 },
        { opacity: .95, transform: fxT(0, 0, 5, .85, 1.2), offset: .55 }, { opacity: 0, transform: fxT(0, -26, 0, .3, .9) }] });
  });
}
function fxFumo(st, x, y, cor, o = {}) {
  [-.4, .4, 0].forEach((fx, i) => fxP(st, { x, y, w: 50, dur: 1400, delay: (o.delay || 0) + i * 120,
    css: { borderRadius: '50%', background: `radial-gradient(circle, ${cor} 0%, transparent 70%)`, filter: 'blur(4px)' },
    kf: [{ opacity: 0, transform: fxT(0, 16, 0, .5) }, { opacity: 1, offset: .3 }, { opacity: 0, transform: fxT(fx * 56, -60, 0, 1.6) }] }));
}
function fxMotas(st, x, y, cor, luz, o = {}) {
  for (let i = 0; i < (o.n || 7); i++) {
    const lx = fxR(-.6, .6) * 56;
    fxP(st, { x: x + lx * .4, y: y + 22, w: o.tam || 4, dur: 1300, delay: (o.delay || 0) + i * 70,
      css: { borderRadius: '50%', background: cor, boxShadow: `0 0 6px 2px ${luz}` },
      kf: [{ opacity: 0, transform: fxT(0, 0) }, { opacity: 1, offset: .25 }, { opacity: 0, transform: fxT(lx * .8, -86) }] });
  }
}
function fxBolhas(st, x, y, cor, o = {}) {
  for (let i = 0; i < (o.n || 8); i++) {
    const s = fxR(6, 12), dx = fxR(-24, 24);
    fxP(st, { x: x + dx, y: y + 18, w: s, dur: 1100, delay: (o.delay || 0) + i * 90, ease: 'ease-out',
      css: { borderRadius: '50%', border: `1.5px solid ${cor}`, background: o.fundo || 'transparent' },
      kf: [{ opacity: 0, transform: fxT(0, 0, 0, .5) }, { opacity: 1, offset: .15 }, { transform: fxT(fxR(-8, 8), -30, 0, 1), offset: .55 },
        { opacity: 1, transform: fxT(fxR(-8, 8), -54, 0, 1), offset: .85 }, { opacity: 0, transform: fxT(0, -58, 0, 1.8) }] });
  }
}
/* O raio desce do alto da tela até o alvo. `caminho` é o d do SVG. */
function fxRaioSvg(st, caminho) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', st.w); svg.setAttribute('height', st.h);
  svg.setAttribute('class', 'fx-raio');
  [['fx-raio-halo'], ['fx-raio-nucleo']].forEach(([cls]) => {
    const p = document.createElementNS(NS, 'path'); p.setAttribute('d', caminho); p.setAttribute('class', cls); svg.appendChild(p);
  });
  st.layer.appendChild(svg);
  const a = fxAnimar(svg, [{ opacity: 0 }, { opacity: 1, offset: .06 }, { opacity: .2, offset: .18 }, { opacity: 1, offset: .28 }, { opacity: 0 }], { duration: 650, fill: 'both' });
  if (a) a.onfinish = () => svg.remove();
}

/* ── Golpes de arma: devolvem o instante do impacto (ms) ───────── */
const FX_GOLPES = {
  corte(st) { const { x, y } = st.B; fxTalho(st, x, y, { tam: 100 });
    fxRisco(st, x, y, { comp: 54, esp: 3, ang: -38, delay: 200, dur: 1100, luz: 'rgba(255,60,40,.6)', cor: `linear-gradient(90deg,transparent,${FXC_SANGUE} 18%,#ff6a52 50%,${FXC_SANGUE} 82%,transparent)` });
    fxEstouro(st, x, y, { n: 5, forma: 'linha', cor: '#fff4dc', comp: 18, dist: 44, delay: 200, dur: 500 });
    fxTremer(st.tB, 3, 200); return 200; },
  perfuracao(st) { const { x, y } = st.B;
    fxP(st, { x: x - 40, y, w: 110, h: 3, dur: 420, ease: FXC_E.seco, css: { background: 'linear-gradient(90deg,rgba(255,255,255,0),#fffaf0)', borderRadius: '2px' },
      kf: [{ opacity: 0, transform: fxT(-50, 0, 0, .3, 1) }, { opacity: 1, transform: fxT(0, 0, 0, 1, 1), offset: .4 }, { opacity: 0, transform: fxT(70, 0, 0, .5, 1) }] });
    fxBrilho(st, x, y, 40, 'rgba(255,250,235,.95)', { dur: 500, delay: 150 });
    fxEstouro(st, x + 24, y, { n: 6, a0: -25, a1: 25, forma: 'linha', cor: '#ffe8c8', comp: 20, dist: 46, delay: 200, dur: 450 });
    fxEstouro(st, x + 24, y, { n: 5, a0: -30, a1: 30, forma: 'gota', cor: FXC_SANGUE, tam: 5, dist: 34, grav: 22, delay: 220, dur: 700 });
    fxMover(st.tB, [{ translate: '0 0' }, { translate: '5px 0', offset: .3 }, { translate: '0 0' }], 380, 180); return 200; },
  esmagamento(st) { const { x, y } = st.B;
    fxBrilho(st, x, y, 110, 'rgba(255,170,90,.7)', { delay: 40 }); fxEstrela(st, x, y, { tam: 96, delay: 40 });
    fxAnel(st, x, y + 26, { w: 120, h: 30, esp: 3, cor: 'rgba(255,215,160,.8)', delay: 60, dur: 700, ate: 1.6 });
    fxAnel(st, x, y + 26, { w: 120, h: 30, esp: 2, cor: 'rgba(255,215,160,.5)', delay: 200, dur: 800, ate: 1.9 });
    for (let i = 0; i < 5; i++) { const a = -30 + i * 60 + fxR(-10, 10); fxRisco(st, x + Math.cos(a * Math.PI / 180) * 34, y + 26 + Math.sin(a * Math.PI / 180) * 6, { comp: 18, esp: 2, ang: a * .25, cor: '#000', delay: 120, dur: 1000 }); }
    fxEstouro(st, x, y + 20, { n: 6, a0: 200, a1: 340, cor: 'rgba(196,164,120,.9)', tam: 5, dist: 40, grav: 26, delay: 80, dur: 800 });
    fxMover(st.tB, [{ translate: '0 0', scale: '1' }, { translate: '0 5px', scale: '1.14 .82', offset: .25 }, { scale: '.96 1.05', offset: .55 }, { translate: '0 0', scale: '1' }], 480, 60);
    return 120; },
  desarmado(st) { const { x, y } = st.B;
    [[-10, -14], [10, 4], [-2, -4]].forEach(([ox, oy], i) => { fxEstrela(st, x + ox - 8, y + oy, { tam: 40, delay: i * 140, dur: 360 });
      fxMover(st.tB, [{ translate: '0 0' }, { translate: '6px 0', offset: .3 }, { translate: '0 0' }], 260, i * 140 + 40); });
    return 300; },
  garra(st) { const { x, y } = st.B, ang = 58, px = Math.cos((ang + 90) * Math.PI / 180), py = Math.sin((ang + 90) * Math.PI / 180);
    [-1, 0, 1].forEach((k, i) => fxRisco(st, x + px * 12 * k, y + py * 12 * k, { comp: 62, esp: 4, ang, delay: i * 70, dur: 900, cresce: .15, segura: .5,
      luz: 'rgba(255,80,60,.6)', cor: `linear-gradient(90deg,transparent,#fff1e6 25%,${FXC_SANGUE} 70%,transparent)` }));
    fxTremer(st.tB, 3, 100); return 160; },
};

/* ── O que o alvo fez com o golpe: substitui o desenho do golpe ── */
const FX_DEFESAS = {
  desviar(st) { const { x, y } = st.B; fxTalho(st, x, y, { r0: -150, r1: -70, dur: 300 });
    fxP(st, { x: x - 6, y: y - 16, w: 60, h: 3, dur: 420, delay: 230, css: { background: 'linear-gradient(90deg,transparent,#fff8ea)', borderRadius: '2px', boxShadow: '0 0 6px rgba(255,220,180,.9)' },
      kf: [{ opacity: 0, transform: fxT(0, 0, -42, .3, 1) }, { opacity: 1, offset: .2 }, { opacity: 0, transform: fxT(46, -42, -42, 1, 1) }] });
    fxEstouro(st, x - 12, y - 12, { n: 6, forma: 'linha', cor: '#fff4dc', comp: 14, dist: 40, a0: -110, a1: -20, delay: 230, dur: 450 });
    return 250; },
  aparar(st) { const { x, y } = st.B, px = x - 28, py = y - 8, aco = 'linear-gradient(90deg,#8b939c,#f4f6f8 60%,#bfc6cd)';
    fxP(st, { x: px, y: py, w: 76, h: 4, dur: 900, css: { background: aco, borderRadius: '2px' }, kf: [{ opacity: 0, transform: fxT(-20, -14, -80) }, { opacity: 1, transform: fxT(0, 0, -40), offset: .26 }, { opacity: 1, transform: fxT(0, 0, -44), offset: .6 }, { opacity: 0, transform: fxT(-6, -4, -50) }] });
    fxP(st, { x: px, y: py, w: 76, h: 4, dur: 900, css: { background: aco, borderRadius: '2px' }, kf: [{ opacity: 0, transform: fxT(10, 8, 80) }, { opacity: 1, transform: fxT(0, 0, 42), offset: .26 }, { opacity: 1, transform: fxT(0, 0, 44), offset: .6 }, { opacity: 0, transform: fxT(4, 2, 46) }] });
    fxEstrela(st, px, py, { tam: 70, delay: 220, cor: 'radial-gradient(circle,#ffffff 0%,#fff3d6 25%,rgba(255,220,150,.5) 45%,transparent 64%)' });
    fxAnel(st, px, py, { w: 50, cor: 'rgba(230,236,242,.9)', esp: 1.5, delay: 230, dur: 600, ate: 2 });
    fxEstouro(st, px, py, { n: 9, forma: 'linha', cor: '#ffffff', comp: 16, dist: 54, a0: 150, a1: 330, delay: 230, dur: 480 });
    return 260; },
  escudo(st) { const { x, y } = st.B, sx = x - 36;
    fxP(st, { x: sx, y, w: 34, h: 44, dur: 1150, css: { clipPath: 'polygon(0 0,100% 0,100% 55%,50% 100%,0 55%)', background: 'linear-gradient(160deg,#e3c27a,#9a7234 45%,#5a3d18)' },
      kf: [{ opacity: 0, transform: fxT(12, 0, 0, .7) }, { opacity: 1, transform: fxT(0, 0, 0, 1), offset: .2 }, { transform: fxT(0, 0, 0, 1), offset: .32 }, { transform: fxT(-7, 0, -8, 1), offset: .42 }, { opacity: 1, transform: fxT(0, 0, 0, 1), offset: .7 }, { opacity: 0, transform: fxT(0, 0, 0, 1) }] });
    fxTalho(st, sx, y, { tam: 70, delay: 200 });
    fxBrilho(st, sx, y, 70, 'rgba(255,230,160,.9)', { delay: 360, dur: 600 });
    fxAnel(st, sx, y, { w: 56, h: 64, cor: 'rgba(230,201,122,.8)', delay: 370, dur: 600, ate: 1.6 });
    fxEstouro(st, sx - 10, y, { n: 6, forma: 'linha', cor: '#fff4dc', comp: 14, dist: 40, a0: 130, a1: 230, delay: 370, dur: 450 });
    return 390; },
  armadura(st, golpe) { const { x, y } = st.B; if (golpe) fxTalho(st, x, y, { tam: 90 });
    fxBrilho(st, x - 6, y, 60, 'rgba(225,232,240,.9)', { delay: 180, dur: 500 });
    fxEstouro(st, x - 6, y, { n: 11, forma: 'linha', cor: '#eef2f6', comp: 14, dist: 44, delay: 180, dur: 420 });
    fxAnel(st, x - 6, y, { w: 40, cor: 'rgba(200,208,216,.8)', estilo: 'dashed', delay: 180, dur: 500, ate: 1.8 });
    return 200; },
};

/* ── Magias: o desenho de cada escola (`visual`) ───────────────── */
const fxMissilDe = (st, nucleo, luz, rastro, o = {}) => fxMissil(st, st.A, st.B, { nucleo, luz, rastro, tam: o.tam || 16, arco: o.arco });
const FX_MAGIAS = {
  fogo(st) { const { x, y } = st.B, t = fxMissilDe(st, 'radial-gradient(circle,#fff6c8,#ffb43a 55%,#e0501a)', 'rgba(255,130,30,.85)', 'rgba(255,150,50,.7)', { tam: 18 });
    fxBrilho(st, x, y, 120, 'rgba(255,150,40,.85)', { delay: t }); fxChamas(st, x, y, { delay: t });
    fxEstouro(st, x, y, { n: 7, cor: '#ffe39a', luz: 'rgba(255,140,30,.8)', dist: 70, a0: 200, a1: 340, delay: t + 100, dur: 1200 });
    fxTingir(st.tB, 'sepia(1) saturate(3) hue-rotate(-25deg) brightness(1.15)', 1000, t); fxTremer(st.tB, 3, t); return t + 80; },
  agua(st) { const { x, y } = st.B, t = fxMissilDe(st, 'radial-gradient(circle,#ffffff,#9fd8ff 50%,#2f8fd8)', 'rgba(80,180,255,.8)', 'rgba(140,210,255,.6)', { arco: -14 });
    fxBrilho(st, x, y, 110, 'rgba(90,190,255,.75)', { delay: t });
    [0, 150, 300].forEach((d) => fxAnel(st, x, y + 18, { w: 90, h: 38, esp: 3, cor: 'rgba(170,225,255,.95)', luz: 'rgba(80,180,255,.6)', delay: t + d, dur: 1100, de: .2, ate: 1.5 }));
    fxEstouro(st, x, y, { n: 9, forma: 'gota', cor: 'linear-gradient(180deg,#e9f8ff,#4aa9e8)', tam: 7, dist: 60, grav: 40, a0: 190, a1: 350, delay: t, dur: 1100 });
    fxTingir(st.tB, 'saturate(.6) hue-rotate(170deg) brightness(1.1)', 900, t); return t + 60; },
  gelo(st) { const { x, y } = st.B, t = fxMissilDe(st, 'radial-gradient(circle,#ffffff,#c9f0ff 55%,#6cc2ee)', 'rgba(160,225,255,.9)', 'rgba(210,240,255,.7)', { tam: 14 });
    fxBrilho(st, x, y, 110, 'rgba(170,230,255,.8)', { delay: t });
    for (let i = 0; i < 8; i++) { const ang = i * 45 + fxR(-10, 10), h = fxR(34, 50);
      fxP(st, { x, y: y - h / 2, w: 11, h, dur: 1100, delay: t + i * 25, css: { clipPath: 'polygon(50% 0,100% 50%,50% 100%,0 50%)', background: 'linear-gradient(180deg,#ffffff,#a8e6ff 50%,#4aa3d8)', transformOrigin: '50% 100%' },
        kf: [{ opacity: 0, transform: fxT(0, 0, ang, 1, 0) }, { opacity: .95, transform: fxT(0, 0, ang, 1, 1), offset: .25 }, { opacity: .95, transform: fxT(0, 0, ang, 1, 1), offset: .68 }, { opacity: 0, transform: fxT(0, 0, ang, 1.4, 1.15) }] }); }
    fxEstouro(st, x, y, { n: 12, forma: 'lasca', cor: '#f2fbff', tam: 6, dist: 64, delay: t + 720, dur: 700 });
    fxTingir(st.tB, 'saturate(.35) hue-rotate(170deg) brightness(1.3)', 1400, t); return t + 80; },
  vento(st) { const { x, y } = st.B;
    for (let i = 0; i < 6; i++) fxP(st, { x: x - 92, y: y + fxR(-26, 22), w: fxR(60, 84), h: fxR(18, 28), dur: 620, delay: i * 70, ease: 'cubic-bezier(.3,.6,.4,1)',
      css: { borderRadius: '50%', borderTop: '2px solid rgba(225,240,235,.85)' }, kf: [{ opacity: 0, transform: fxT(0, 0, -6, .6) }, { opacity: 1, offset: .2 }, { opacity: 0, transform: fxT(184, -8, 4, 1.1) }] });
    for (let i = 0; i < 6; i++) fxP(st, { x: x - 80, y: y + fxR(-20, 24), w: 9, h: 5, dur: 800, delay: 60 + i * 60, css: { borderRadius: '50% 0', background: i % 2 ? '#9bb36a' : '#c9a65a' },
      kf: [{ opacity: 0, transform: fxT(0, 0, 0) }, { opacity: 1, offset: .15 }, { transform: fxT(90, fxR(-14, 14), 360), offset: .6 }, { opacity: 0, transform: fxT(170, fxR(-24, 6), 720) }] });
    fxMover(st.tB, [{ translate: '0 0', rotate: '0deg' }, { translate: '12px 0', rotate: '7deg', offset: .4 }, { translate: '0 0', rotate: '0deg' }], 720, 140);
    return 200; },
  raio(st, f) { const { x, y } = st.B;
    const caminho = (typeof window !== 'undefined' && window.MotorCortina && window.MotorCortina.caminhoDoRaio)
      ? window.MotorCortina.caminhoDoRaio(x, y, Math.floor(fxR(1, 9999))) : null;
    if (caminho) fxRaioSvg(st, caminho);
    fxTela(st, 'radial-gradient(circle at 50% 40%, rgba(235,245,255,.7), rgba(170,210,255,.35))', { dur: 600, kf: [{ opacity: 0 }, { opacity: 1, offset: .08 }, { opacity: .1, offset: .2 }, { opacity: .8, offset: .3 }, { opacity: 0 }] });
    fxBrilho(st, x, y, 110, 'rgba(200,230,255,.95)');
    fxEstouro(st, x, y, { n: 6, forma: 'linha', cor: '#ffffff', comp: 26, dist: 30, delay: 80, dur: 600 });
    fxTingir(st.tB, 'brightness(2) saturate(.2)', 500, 40); return 120; },
  terra(st) { const { x, y } = st.B;
    fxP(st, { x, y: y + 18, w: 112, h: 50, dur: 1300, delay: 120, css: { borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(196,164,120,.75), rgba(140,110,75,0) 70%)', filter: 'blur(3px)' },
      kf: [{ opacity: 0, transform: fxT(0, 0, 0, .3, .2) }, { opacity: 1, offset: .3 }, { opacity: 0, transform: fxT(0, -8, 0, 1.4, 1.1) }] });
    fxRisco(st, x, y + 26, { comp: 84, esp: 5, cor: 'linear-gradient(90deg,transparent,#2a1c10 20%,#120b05 50%,#2a1c10 80%,transparent)', dur: 1300, clip: 'polygon(0 50%,15% 0,30% 80%,48% 10%,64% 90%,80% 20%,100% 50%,80% 70%,64% 100%,48% 40%,30% 100%,15% 40%)' });
    fxEstouro(st, x, y + 16, { n: 7, forma: 'lasca', cor: 'linear-gradient(135deg,#b89468,#6b4e30 70%,#3e2c1a)', tam: 12, dist: 70, grav: 40, a0: 200, a1: 340, dur: 1100, passo: 30 });
    fxTremer(st.tB, 5, 60); return 140; },
  luz(st) { const { x, y } = st.B;
    fxTela(st, 'radial-gradient(circle at ' + x + 'px ' + y + 'px, rgba(255,252,235,.6), rgba(255,240,200,.1) 40%, transparent 70%)', { dur: 500 });
    for (let i = 0; i < 12; i++) { const a = i * 30 + 8, c = i % 2 ? 60 : 92;
      fxP(st, { x: x + c / 2, y, w: c, h: 2, dur: 800, delay: 40, css: { background: 'linear-gradient(90deg,#ffffff,rgba(255,240,190,0))', left: x + 'px', top: (y - 1) + 'px', transformOrigin: '0 50%' },
        kf: [{ opacity: 0, transform: fxT(0, 0, a, 0, 1) }, { opacity: 1, transform: fxT(0, 0, a + 6, 1, 1), offset: .3 }, { opacity: 0, transform: fxT(0, 0, a + 12, 1.1, 1) }] }); }
    fxP(st, { x, y, w: 40, dur: 800, css: { background: '#fffdf2', clipPath: 'polygon(50% 0,58% 42%,100% 50%,58% 58%,50% 100%,42% 58%,0 50%,42% 42%)', filter: 'drop-shadow(0 0 8px #fff3c4)' },
      kf: [{ opacity: 0, transform: fxT(0, 0, 0, .2) }, { opacity: 1, transform: fxT(0, 0, 45, 1.2), offset: .3 }, { opacity: 0, transform: fxT(0, 0, 90, .4) }] });
    fxTingir(st.tB, 'brightness(1.9) saturate(.4)', 700, 40); return 140; },
  trevas(st) { const { x, y } = st.B, t = fxMissilDe(st, 'radial-gradient(circle,#2a1438,#0c0612 70%)', 'rgba(150,80,210,.75)', 'rgba(60,20,90,.8)', { tam: 18 });
    fxP(st, { x, y, w: 170, dur: 1300, delay: t - 60, css: { borderRadius: '50%', background: 'radial-gradient(circle, rgba(8,2,14,.92) 0%, rgba(8,2,14,.6) 40%, transparent 70%)' },
      kf: [{ opacity: 0, transform: fxT(0, 0, 0, 1.6) }, { opacity: 1, transform: fxT(0, 0, 0, 1), offset: .3 }, { opacity: 1, offset: .6 }, { opacity: 0, transform: fxT(0, 0, 0, .7) }] });
    for (let i = 0; i < 6; i++) { const a = i * 60 + fxR(-12, 12), r = 70, rad = a * Math.PI / 180;
      fxP(st, { x: x + Math.cos(rad) * r, y: y + Math.sin(rad) * r, w: 30, dur: 800, delay: t + i * 40, css: { borderRadius: '50%', borderLeft: '3px solid rgba(150,80,210,.85)', filter: 'drop-shadow(0 0 4px rgba(120,40,200,.8))' },
        kf: [{ opacity: 0, transform: fxT(0, 0, a, 1) }, { opacity: 1, offset: .25 }, { opacity: 0, transform: fxT(-Math.cos(rad) * r, -Math.sin(rad) * r, a + 180, .3) }] }); }
    fxAnel(st, x, y, { w: 90, cor: 'rgba(160,90,220,.8)', luz: 'rgba(90,20,140,.8)', de: 1.6, ate: .4, delay: t, dur: 1100 });
    fxTingir(st.tB, 'brightness(.35) saturate(.5)', 1200, t); return t + 200; },
  celestial(st) { const { x, y } = st.B, h = y + 20;
    fxP(st, { x, y: h / 2, w: 60, h, dur: 1300, css: { background: 'linear-gradient(180deg, rgba(255,245,210,0) 0%, rgba(255,238,180,.55) 70%, rgba(255,250,230,.95) 100%)', filter: 'blur(2px)', mixBlendMode: 'screen', transformOrigin: '50% 100%' },
      kf: [{ opacity: 0, transform: fxT(0, 0, 0, .05, 1) }, { opacity: 1, transform: fxT(0, 0, 0, 1, 1), offset: .2 }, { opacity: .9, transform: fxT(0, 0, 0, .75, 1), offset: .7 }, { opacity: 0, transform: fxT(0, 0, 0, .1, 1) }] });
    fxBrilho(st, x, y, 110, 'rgba(255,230,150,.8)');
    fxAnel(st, x, y, { w: 84, cor: 'rgba(255,228,140,.95)', luz: 'rgba(255,210,100,.8)', delay: 150, dur: 1200, de: .4, ate: 1.35 });
    fxMotas(st, x, y, '#fffbe8', 'rgba(255,220,120,.9)', { n: 8, delay: 150 }); return 200; },
  infernal(st) { const { x, y } = st.B; fxBrilho(st, x, y, 110, 'rgba(200,30,60,.7)'); fxFumo(st, x, y, 'rgba(40,12,34,.9)');
    fxChamas(st, x, y, { delay: 60, grad: 'radial-gradient(ellipse at 50% 80%, #ffb0a0 0%, #e8233a 30%, #7a0f3a 62%, transparent 76%)' });
    fxEstouro(st, x, y, { n: 6, cor: '#ff9aa8', luz: 'rgba(200,20,70,.85)', dist: 70, a0: 200, a1: 340, delay: 160, dur: 1200 });
    return 160; },
  arcano(st) { const { x, y } = st.B, t = fxMissilDe(st, 'radial-gradient(circle,#f3ecff,#b48cff 60%)', 'rgba(150,100,255,.8)', 'rgba(180,140,255,.6)', { tam: 12 });
    fxBrilho(st, x, y, 110, 'rgba(170,120,255,.75)', { delay: t });
    fxAnel(st, x, y, { w: 96, cor: 'rgba(200,170,255,.95)', estilo: 'dashed', luz: 'rgba(150,100,255,.7)', r0: -90, r1: 90, de: .4, ate: 1.3, pico: .3, segura: .75, delay: t, dur: 1300 });
    fxAnel(st, x, y, { w: 64, esp: 3, cor: 'rgba(200,170,255,.95)', estilo: 'dotted', r0: 90, r1: -90, de: .4, ate: 1.3, pico: .3, segura: .75, delay: t, dur: 1300 });
    fxEstouro(st, x, y, { n: 6, forma: 'linha', cor: '#f1e6ff', comp: 22, dist: 64, delay: t + 380, dur: 800 });
    return t + 100; },
  veneno(st) { const { x, y } = st.B, t = fxMissilDe(st, 'radial-gradient(circle,#efffd0,#9bd84a 55%,#4d8a1c)', 'rgba(140,220,70,.8)', 'rgba(150,220,90,.6)', { tam: 14 });
    fxBrilho(st, x, y, 100, 'rgba(150,220,90,.6)', { delay: t });
    fxBolhas(st, x, y, 'rgba(180,240,110,.95)', { delay: t, fundo: 'rgba(150,220,90,.25)' });
    fxEstouro(st, x, y + 10, { n: 6, forma: 'gota', cor: 'linear-gradient(180deg,#d9ff9c,#4d8a1c)', tam: 6, dist: 18, grav: 40, a0: 60, a1: 120, delay: t + 100, dur: 1000 });
    fxTingir(st.tB, 'sepia(1) hue-rotate(50deg) saturate(3)', 1100, t); return t + 80; },
  mente(st) { const { x, y } = st.B;
    [0, 180, 360].forEach((d) => fxAnel(st, x, y - 20, { w: 60, h: 30, esp: 2, cor: 'rgba(240,160,240,.9)', luz: 'rgba(200,100,220,.6)', delay: d, dur: 1000, de: .3, ate: 1.9 }));
    fxAnel(st, x, y - 24, { w: 40, h: 20, esp: 2, estilo: 'dashed', cor: 'rgba(255,200,250,.9)', r0: 0, r1: 360, de: .8, ate: 1.2, segura: .7, dur: 1300 });
    fxMover(st.tB, [{ rotate: '0deg' }, { rotate: '-8deg', offset: .2 }, { rotate: '7deg', offset: .45 }, { rotate: '-5deg', offset: .7 }, { rotate: '0deg' }], 1300, 100, 'ease-in-out');
    return 200; },
  natureza(st) { const { x, y } = st.B;
    [[-22, 1], [-8, -1], [10, 1], [24, -1]].forEach(([ox, lado], i) => fxP(st, { x: x + ox, y: y + 2, w: 18, h: 56, dur: 1500, delay: i * 90,
      css: { borderRadius: lado > 0 ? '0 100% 0 0' : '100% 0 0 0', [lado > 0 ? 'borderRight' : 'borderLeft']: '4px solid #6d8a38', borderTop: '3px solid #55702a', transformOrigin: '50% 100%', filter: 'drop-shadow(0 0 2px rgba(0,0,0,.6))' },
      kf: [{ opacity: 0, transform: fxT(0, 0, 0, 1, 0) }, { opacity: 1, transform: fxT(0, 0, 0, 1, 1), offset: .3 }, { opacity: 1, offset: .7 }, { opacity: 0, transform: fxT(0, 6, lado * 10, 1, .8) }] }));
    fxEstouro(st, x, y + 20, { n: 6, cor: '#8fb350', tam: 6, dist: 40, a0: 200, a1: 340, delay: 200, dur: 900 });
    fxMover(st.tB, [{ translate: '0 0' }, { translate: '-2px 0', offset: .4 }, { translate: '2px 0', offset: .5 }, { translate: '-2px 0', offset: .6 }, { translate: '0 0' }], 1300, 200);
    return 250; },
  dreno(st) { const { x, y } = st.B; fxBrilho(st, x, y, 80, 'rgba(200,40,40,.6)');
    let fim = 0; for (let i = 0; i < 9; i++) fim = fxMissil(st, { x: x + fxR(-10, 10), y: y + fxR(-10, 10) }, st.A, { delay: 120 + i * 55, dur: 520, arco: fxR(-40, 10), tam: 6, nucleo: i % 2 ? '#ff8a7a' : '#ffd38a', luz: 'rgba(220,60,40,.8)' });
    fxBrilho(st, st.A.x, st.A.y, 90, 'rgba(230,201,122,.8)', { delay: fim - 200 });
    return 0; },
};

/* ── Sobre o golpe que acertou: a película da EH, o sangue, o crítico ── */
function fxPeliculaEh(st, t) { const { x, y } = st.B;
  fxAnel(st, x, y, { w: 92, cor: 'rgba(242,217,138,.95)', luz: 'rgba(230,201,122,.6)', fundo: 'radial-gradient(circle,transparent 58%,rgba(230,201,122,.25) 72%)', de: .92, ate: 1.06, pico: .2, segura: .55, delay: Math.max(0, t - 80), dur: 1000 });
  fxAnel(st, x - 40, y - 10, { w: 30, cor: 'rgba(255,236,170,.95)', delay: t, dur: 600, ate: 2 });
  fxBrilho(st, x - 40, y - 10, 40, 'rgba(255,236,170,.9)', { delay: t, dur: 500 });
}
function fxPeliculaPartida(st, t, sangra) { const { x, y } = st.B;
  fxAnel(st, x, y, { w: 92, cor: 'rgba(242,217,138,.9)', de: .95, ate: 1, delay: Math.max(0, t - 200), dur: 380 });
  fxEstouro(st, x, y, { n: 9, forma: 'lasca', cor: '#e6c97a', tam: 8, dist: 60, delay: t, dur: 700 });
  if (sangra) fxEstouro(st, x, y, { n: 7, forma: 'gota', cor: FXC_SANGUE, tam: 6, dist: 40, grav: 30, delay: t + 30, dur: 800, a0: 180, a1: 360 });
  fxTremer(st.tB, 4, t);
}
function fxCritico(st, t, golpe) { const { x, y } = st.B;
  if (golpe) { fxTalho(st, x, y, { tam: 110, esp: 6, r0: 30, r1: 200, delay: Math.max(0, t - 60) }); }
  fxTela(st, 'radial-gradient(ellipse at center, transparent 45%, rgba(120,10,0,.6) 100%)', { delay: t, dur: 700 });
  fxBrilho(st, x, y, 120, 'rgba(255,150,90,.8)', { delay: t });
  fxEstouro(st, x, y, { n: 8, forma: 'linha', cor: '#fff4dc', comp: 22, dist: 60, delay: t + 20, dur: 520 });
  fxTremer(st.tB, 7, t);
}

/* ── Os textos ─────────────────────────────────────────────────── */
const FX_TXT = {
  pt: { errou: 'Errou', esquivou: 'Esquivou', resistiu: 'Resistiu', falha: 'falha crítica', eh: 'energia heroica', ef: 'energia física',
    armadura: 'a armadura segurou', protecao: 'proteção', aparar: 'aparou', desviar: 'desviou', escudo: 'escudo', quebrou: 'quebrou',
    evocando: 'Evocando', perdeu: 'Perdeu a evocação', abencoado: 'Abençoado', amaldicoado: 'Amaldiçoado', caido: 'Caído',
    desmaiado: 'Desmaiado', morto: 'Morto', veneno: 'veneno', sangramento: 'sangramento', furia: 'Fúria' },
  en: { errou: 'Miss', esquivou: 'Dodged', resistiu: 'Resisted', falha: 'critical failure', eh: 'heroic energy', ef: 'physical energy',
    armadura: 'armor held', protecao: 'protection', aparar: 'parried', desviar: 'deflected', escudo: 'shield', quebrou: 'broke',
    evocando: 'Casting', perdeu: 'Casting lost', abencoado: 'Blessed', amaldicoado: 'Cursed', caido: 'Prone',
    desmaiado: 'Unconscious', morto: 'Dead', veneno: 'poison', sangramento: 'bleeding', furia: 'Fury' },
};
const FX_COR = { dano: 'var(--fx-dano)', eh: '#E6C97A', ar: '#cfd6dd', cura: '#c8f5b4', neutro: '#d8cfc2', veneno: '#c9ef8f' };

/* O número de um golpe que acertou, pelo que pagou. */
function fxNumeroDoGolpe(st, f, t, tx) {
  const { x, y } = st.B;
  if (f.pool === 'ar') return fxNumero(st, x, y, '0', { cor: FX_COR.ar, sub: tx.armadura, delay: t });
  if (f.pool === 'protecao') return fxNumero(st, x, y, '0', { cor: '#ffd9a8', sub: tx.protecao, delay: t });
  if (f.valor == null) return null;
  const v = '−' + f.valor;
  if (f.defesa) return fxNumero(st, x, y, v, { sub: tx[f.defesa], delay: t, cor: f.pool === 'eh' ? FX_COR.eh : FX_COR.dano });
  if (f.pool === 'eh') return fxNumero(st, x, y, v, { cor: FX_COR.eh, sub: tx.eh, delay: t });
  if (f.pool === 'ef') return fxNumero(st, x, y, v, { sub: tx.ef, delay: t });
  return fxNumero(st, x, y, v, { delay: t });
}

/* A cor do brilho parado (movimento reduzido). */
const FX_COR_CALMA = {
  golpe: 'rgba(255,220,180,.8)', fogo: 'rgba(255,150,40,.8)', agua: 'rgba(90,190,255,.75)', gelo: 'rgba(170,230,255,.8)',
  vento: 'rgba(220,240,235,.6)', raio: 'rgba(200,230,255,.95)', terra: 'rgba(196,164,120,.8)', luz: 'rgba(255,248,220,.95)',
  trevas: 'rgba(120,70,170,.6)', celestial: 'rgba(255,230,150,.8)', infernal: 'rgba(200,30,60,.7)', arcano: 'rgba(170,120,255,.75)',
  veneno: 'rgba(150,220,90,.6)', mente: 'rgba(240,150,230,.6)', natureza: 'rgba(130,180,80,.6)', dreno: 'rgba(230,201,122,.6)',
  cura: 'rgba(140,230,120,.6)', item: 'rgba(140,230,160,.5)', bencao: 'rgba(255,228,140,.7)', maldicao: 'rgba(110,40,160,.55)',
  resistiu: 'rgba(200,220,255,.6)', evocacao: 'rgba(140,190,255,.6)', dissipa: 'rgba(170,170,190,.4)', invocacao: 'rgba(255,220,140,.7)',
  tecnica: 'rgba(255,215,130,.6)', furia: 'rgba(230,60,40,.6)', queda: 'rgba(160,40,30,.5)', caido: 'rgba(196,164,120,.6)',
  falha_critica: 'rgba(255,140,70,.7)', esquiva: 'rgba(216,207,194,.5)', quebrou: 'rgba(200,208,216,.6)',
  veneno_tick: 'rgba(150,220,90,.5)', sangramento: 'rgba(192,24,42,.5)',
};

/* ── Tocar um efeito ───────────────────────────────────────────────
   `f` vem de efeitosDaRevelacao; `ctx` = { layer, isEn, reduzido,
   centro(chave) → {x,y,tam} | null, token(chave) → elemento | null }. */
function tocarEfeitoFx(f, ctx) {
  const tx = FX_TXT[ctx.isEn ? 'en' : 'pt'];
  const w = (typeof window !== 'undefined' && window.innerWidth) || 1024;
  const h = (typeof window !== 'undefined' && window.innerHeight) || 768;
  const b = ctx.centro(f.alvo) || { x: w / 2, y: h / 2 };
  const a = (f.autor && ctx.centro(f.autor)) || { x: b.x - 180, y: b.y };
  const st = { layer: ctx.layer, w, h, B: { x: b.x, y: b.y }, A: { x: a.x, y: a.y }, tB: ctx.token(f.alvo), tA: f.autor ? ctx.token(f.autor) : null };
  const visual = f.tipo === 'magia' ? f.visual : f.tipo;

  if (ctx.reduzido) {
    const onde = (f.tipo === 'falha_critica') ? st.A : st.B;
    fxP(st, { x: onde.x, y: onde.y, w: 110, dur: 1300, ease: 'ease-out',
      css: { borderRadius: '50%', background: `radial-gradient(circle, ${FX_COR_CALMA[visual] || FX_COR_CALMA.golpe} 0%, transparent 62%)` },
      kf: [{ opacity: 0 }, { opacity: 1, offset: .25 }, { opacity: 0 }] });
  }
  const so = ctx.reduzido;   // movimento reduzido: só o número, sobre o brilho

  switch (f.tipo) {
    case 'golpe':
    case 'magia': {
      if (f.erro) {
        if (!so) {
          if (f.tipo === 'golpe') {
            fxTalho(st, b.x + 36, b.y - 26, { op: .45, cor: '#cfc6b8', luz: 'rgba(200,190,170,.4)' });
            fxEstouro(st, b.x + 46, b.y - 30, { n: 7, cor: 'rgba(200,190,175,.7)', tam: 4, dist: 26, a0: -60, a1: 40, delay: 250, dur: 700 });
          } else {
            fxMissil(st, st.A, { x: b.x + 40, y: b.y - 36 }, { nucleo: '#efe8dc', luz: 'rgba(200,190,170,.5)', tam: 10 });
          }
        }
        fxNumero(st, b.x, b.y, tx.errou, { cor: FX_COR.neutro, delay: 150 });
        return;
      }
      let t = 0;
      if (!so) {
        if (f.tipo === 'golpe' && f.defesa && FX_DEFESAS[f.defesa]) t = FX_DEFESAS[f.defesa](st);
        else if (f.tipo === 'golpe' && f.pool === 'ar') t = FX_DEFESAS.armadura(st, true);
        else if (f.tipo === 'golpe') t = (FX_GOLPES[f.variante] || FX_GOLPES.corte)(st);
        else t = (FX_MAGIAS[f.visual] || FX_MAGIAS.arcano)(st, f);
        if (f.tipo === 'magia' && f.pool === 'ar') FX_DEFESAS.armadura(st, false);
        if (f.pool === 'eh' && !f.defesa) fxPeliculaEh(st, t);
        if (f.pool === 'ef' && f.furou_eh) fxPeliculaPartida(st, t, f.tipo === 'golpe');
        if (f.critico) fxCritico(st, t, f.tipo === 'golpe');
      }
      fxNumeroDoGolpe(st, f, so ? 0 : t, tx);
      return;
    }
    case 'falha_critica': {
      let t = 0;
      if (!so) {
        fxTalho(st, b.x, b.y, { tam: 70, op: .8 });
        fxEstrela(st, b.x - 14, b.y, { tam: 34, delay: 180, dur: 300 });
        t = fxMissil(st, { x: b.x - 14, y: b.y }, st.A, { delay: 260, dur: 320, arco: -30, tam: 10, nucleo: '#fff1d0', luz: 'rgba(255,140,60,.9)', rastro: 'rgba(255,170,90,.6)' });
        fxEstrela(st, st.A.x, st.A.y, { tam: 64, delay: t - 20 }); fxTremer(st.tA, 5, t);
      }
      fxNumero(st, st.A.x, st.A.y, f.valor ? '−' + f.valor : tx.falha.charAt(0).toUpperCase() + tx.falha.slice(1), { sub: f.valor ? tx.falha : null, delay: t });
      return;
    }
    case 'esquiva': {
      if (!so && st.tB) {
        const r = st.tB.getBoundingClientRect();
        const g = st.tB.cloneNode(true);
        g.removeAttribute('data-fx-chave');
        Object.assign(g.style, { position: 'absolute', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', margin: '0', transform: 'none', translate: 'none', pointerEvents: 'none' });
        st.layer.appendChild(g);
        const an = fxAnimar(g, [{ opacity: .55, filter: 'grayscale(1) blur(0)' }, { opacity: 0, filter: 'grayscale(1) blur(3px)' }], { duration: 700, delay: 120, fill: 'both' });
        if (an) an.onfinish = () => g.remove(); else g.remove();
        fxMover(st.tB, [{ translate: '0 0', rotate: '0deg' }, { translate: '-36px 8px', rotate: '-8deg', offset: .16 }, { translate: '-36px 8px', rotate: '-8deg', offset: .62 }, { translate: '0 0', rotate: '0deg' }], 1100, 0, 'cubic-bezier(.2,.8,.2,1)');
      }
      if (!so) {
        fxTalho(st, b.x, b.y, { op: .75, delay: 90 });
        fxEstouro(st, b.x + 6, b.y + 22, { n: 5, cor: 'rgba(196,164,120,.7)', tam: 4, dist: 22, a0: 160, a1: 340, delay: 40, dur: 600 });
      }
      fxNumero(st, b.x - (so ? 0 : 36), b.y, tx.esquivou, { cor: FX_COR.neutro, delay: 160 });
      return;
    }
    case 'quebrou': {
      if (!so) {
        fxBrilho(st, b.x, b.y, 60, 'rgba(210,216,224,.8)', { dur: 500 });
        fxEstouro(st, b.x, b.y - 6, { n: 8, forma: 'lasca', cor: 'linear-gradient(135deg,#e2e6ea,#7d848c 60%,#40454b)', tam: 10, dist: 36, grav: 56, a0: 190, a1: 350, delay: 20, dur: 1150 });
        fxRisco(st, b.x, b.y, { comp: 40, esp: 2, ang: 70, cor: '#0b0907', delay: 20, dur: 1000, clip: 'polygon(0 0,30% 100%,55% 0,80% 100%,100% 0,100% 100%,0 100%)' });
      }
      fxNumero(st, b.x, b.y, f.nome ? f.nome + ' ' + tx.quebrou : tx.quebrou, { cor: FX_COR.ar, delay: 100 });
      return;
    }
    case 'resistiu': {
      let t = 0;
      if (!so) {
        t = f.autor ? fxMissil(st, st.A, st.B, { nucleo: 'radial-gradient(circle,#f3ecff,#b48cff 60%)', luz: 'rgba(150,100,255,.8)', rastro: 'rgba(180,140,255,.6)', tam: 12 }) : 0;
        fxAnel(st, b.x, b.y, { w: 96, esp: 2, cor: 'rgba(210,225,255,.9)', luz: 'rgba(170,200,255,.5)', fundo: 'radial-gradient(circle,transparent 55%,rgba(200,220,255,.3) 70%)', de: .95, ate: 1.05, segura: .6, delay: Math.max(0, t - 120), dur: 1000 });
        fxBrilho(st, b.x - 46, b.y, 50, 'rgba(220,230,255,.95)', { delay: t, dur: 500 });
        fxEstouro(st, b.x - 46, b.y, { n: 8, forma: 'lasca', cor: '#c8a8ff', tam: 7, dist: 54, a0: 140, a1: 220, delay: t, dur: 700 });
      }
      fxNumero(st, b.x, b.y, tx.resistiu, { cor: '#dfe8ff', delay: t + 40 });
      return;
    }
    case 'cura':
    case 'item': {
      if (!so) {
        fxBrilho(st, b.x, b.y, 110, f.tipo === 'cura' ? 'rgba(140,230,120,.6)' : 'rgba(140,230,160,.5)');
        if (f.tipo === 'cura') {
          fxMotas(st, b.x, b.y, '#f2ffe6', 'rgba(110,210,90,.9)', { n: 7 });
          for (let i = 0; i < 4; i++) fxP(st, { x: b.x + fxR(-24, 24), y: b.y + 10, w: 14, h: 18, txt: '+', cls: 'fx-mais', dur: 1200, delay: 100 + i * 140, kf: [{ opacity: 0, transform: fxT(0, 0, 0, .6) }, { opacity: 1, offset: .25 }, { opacity: 0, transform: fxT(fxR(-6, 6), -60, 0, 1) }] });
        } else fxBolhas(st, b.x, b.y, 'rgba(190,255,220,.95)', { n: 9, fundo: 'rgba(140,230,180,.2)' });
      }
      if (f.valor) fxNumero(st, b.x, b.y, '+' + f.valor, { cor: FX_COR.cura, delay: 150 });
      return;
    }
    case 'bencao': {
      if (!so) {
        [0, 320].forEach((d) => fxAnel(st, b.x, b.y, { w: 84, cor: 'rgba(255,228,140,.95)', luz: 'rgba(255,210,100,.8)', delay: d, dur: 1200, de: .4, ate: 1.35 }));
        fxMotas(st, b.x, b.y, '#fffbe8', 'rgba(255,220,120,.9)', { n: 6 }); fxTingir(st.tB, 'brightness(1.35)', 900, 100);
      }
      fxNumero(st, b.x, b.y, tx.abencoado, { cor: FX_COR.eh, delay: 200 });
      return;
    }
    case 'maldicao': {
      if (!so) {
        fxBrilho(st, b.x, b.y, 100, 'rgba(110,40,160,.55)');
        fxAnel(st, b.x, b.y, { w: 84, cor: 'rgba(160,90,220,.9)', luz: 'rgba(90,20,140,.8)', dur: 1200, de: 1.5, ate: .45 });
        fxEstouro(st, b.x, b.y, { n: 6, forma: 'gota', cor: 'linear-gradient(180deg,#d6b8ff,#4a1a78)', tam: 7, dist: 20, grav: 40, a0: 60, a1: 120, delay: 200, dur: 1000 });
        fxTingir(st.tB, 'brightness(.6) sepia(1) hue-rotate(220deg) saturate(2)', 1100, 100);
      }
      fxNumero(st, b.x, b.y, tx.amaldicoado, { cor: '#d9b8ff', delay: 200 });
      return;
    }
    case 'evocacao': {
      if (!so) {
        fxAnel(st, b.x, b.y, { w: 92, esp: 2, estilo: 'dashed', cor: 'rgba(160,200,255,.9)', luz: 'rgba(100,160,255,.6)', r0: 0, r1: 220, de: 1.2, ate: .9, segura: .8, dur: 1600 });
        for (let i = 0; i < 5; i++) fxP(st, { x: b.x, y: b.y, w: 6, dur: 1500, delay: i * 40, css: { borderRadius: '50%', background: '#e6f0ff', boxShadow: '0 0 6px 2px rgba(120,170,255,.9)' },
          kf: [{ opacity: 0, transform: `rotate(${i * 72}deg) translateX(46px)` }, { opacity: 1, offset: .2 }, { opacity: 1, offset: .8 }, { opacity: 0, transform: `rotate(${i * 72 + 300}deg) translateX(30px)` }] });
      }
      fxNumero(st, b.x, b.y, tx.evocando, { cor: '#cfe0ff', delay: 200, alto: 70 });
      return;
    }
    case 'dissipa': {
      if (!so) {
        fxAnel(st, b.x, b.y, { w: 92, estilo: 'dashed', cor: 'rgba(160,200,255,.6)', de: 1, ate: 1.4, dur: 600 });
        fxFumo(st, b.x, b.y, 'rgba(170,170,190,.55)', { delay: 100 }); fxTingir(st.tB, 'grayscale(1) brightness(.7)', 900, 100);
      }
      fxNumero(st, b.x, b.y, tx.perdeu, { cor: FX_COR.neutro, delay: 150 });
      return;
    }
    case 'invocacao': {
      if (!so) {
        fxAnel(st, b.x, b.y + 24, { w: 100, h: 34, esp: 2, estilo: 'dashed', cor: 'rgba(255,220,140,.95)', luz: 'rgba(255,200,100,.8)', de: .2, ate: 1.1, segura: .8, dur: 1500 });
        fxP(st, { x: b.x, y: b.y - 26, w: 54, h: 100, dur: 1200, delay: 200, css: { background: 'linear-gradient(180deg, rgba(255,245,210,0), rgba(255,238,180,.6) 70%, rgba(255,250,230,.95))', filter: 'blur(2px)', mixBlendMode: 'screen', transformOrigin: '50% 100%' },
          kf: [{ opacity: 0, transform: fxT(0, 0, 0, .05, 1) }, { opacity: 1, transform: fxT(0, 0, 0, 1, 1), offset: .25 }, { opacity: 0, transform: fxT(0, 0, 0, .1, 1) }] });
        fxMotas(st, b.x, b.y, '#fffbe8', 'rgba(255,220,120,.9)', { n: 6, delay: 200 });
        fxMover(st.tB, [{ opacity: 0, scale: '.6' }, { opacity: 0, scale: '.6', offset: .3 }, { opacity: 1, scale: '1.06', offset: .7 }, { opacity: 1, scale: '1' }], 1400);
      }
      return;
    }
    case 'tecnica': {
      if (!so) [0, 200].forEach((d) => fxP(st, { x: b.x, y: b.y, w: 90, dur: 900, delay: d, css: { borderRadius: '50%', borderBottom: '3px solid rgba(255,215,130,.95)', filter: 'drop-shadow(0 0 6px rgba(255,190,80,.8))' },
        kf: [{ opacity: 0, transform: fxT(0, 0, 0, 1.3) }, { opacity: 1, offset: .25 }, { opacity: 0, transform: fxT(0, 0, 540, .6) }] }));
      if (f.nome) fxNumero(st, b.x, b.y, f.nome, { cor: FX_COR.eh, delay: 200 });
      return;
    }
    case 'furia': {
      if (!so) {
        [0, 260, 520].forEach((d) => fxP(st, { x: b.x, y: b.y, w: 100, dur: 700, delay: d, css: { borderRadius: '50%', background: 'radial-gradient(circle, transparent 35%, rgba(230,60,40,.55) 55%, transparent 70%)' },
          kf: [{ opacity: 0, transform: fxT(0, 0, 0, .6) }, { opacity: 1, offset: .3 }, { opacity: 0, transform: fxT(0, 0, 0, 1.3) }] }));
        for (let i = 0; i < 6; i++) fxP(st, { x: b.x + fxR(-22, 22), y: b.y + 10, w: 2, h: 18, dur: 700, delay: 100 + i * 110, css: { background: 'linear-gradient(180deg,transparent,#ff9a6a)' },
          kf: [{ opacity: 0, transform: fxT(0, 0) }, { opacity: 1, offset: .3 }, { opacity: 0, transform: fxT(0, -50) }] });
        fxMover(st.tB, [{ scale: '1' }, { scale: '1.08', offset: .15 }, { scale: '1', offset: .33 }, { scale: '1.08', offset: .48 }, { scale: '1', offset: .66 }, { scale: '1.08', offset: .8 }, { scale: '1' }], 1500);
        fxTingir(st.tB, 'sepia(1) hue-rotate(-40deg) saturate(4) brightness(1.1)', 1500);
      }
      fxNumero(st, b.x, b.y, f.nome || tx.furia, { cor: '#E8836A', delay: 150 });
      return;
    }
    case 'veneno_tick': {
      if (!so) { fxBolhas(st, b.x, b.y, 'rgba(180,240,110,.9)', { n: 7, fundo: 'rgba(150,220,90,.2)' }); fxTingir(st.tB, 'sepia(1) hue-rotate(50deg) saturate(3)', 1000, 50); }
      fxNumero(st, b.x, b.y, '−' + f.valor, { cor: FX_COR.veneno, sub: tx.veneno, delay: 150 });
      return;
    }
    case 'sangramento': {
      if (!so) {
        fxEstouro(st, b.x, b.y + 14, { n: 6, forma: 'gota', cor: `linear-gradient(180deg,#ff6a52,${FXC_SANGUE})`, tam: 6, dist: 14, grav: 26, a0: 70, a1: 110, dur: 900, passo: 80 });
        fxP(st, { x: b.x, y: b.y + 32, w: 46, h: 10, dur: 1500, delay: 300, css: { borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(140,10,20,.85), transparent 70%)' },
          kf: [{ opacity: 0, transform: fxT(0, 0, 0, .2) }, { opacity: 1, transform: fxT(0, 0, 0, 1), offset: .4 }, { opacity: 0, transform: fxT(0, 0, 0, 1.1) }] });
      }
      fxNumero(st, b.x, b.y, '−' + f.valor, { sub: tx.sangramento, delay: 150 });
      return;
    }
    case 'caido': {
      if (!so) {
        fxMover(st.tB, [{ translate: '0 0', rotate: '0deg' }, { translate: '8px 10px', rotate: '80deg', offset: .25 }, { translate: '8px 10px', rotate: '80deg', offset: .8 }, { translate: '0 0', rotate: '0deg' }], 1700, 0, 'cubic-bezier(.5,0,.5,1)');
        fxEstouro(st, b.x + 10, b.y + 28, { n: 8, cor: 'rgba(196,164,120,.8)', tam: 6, dist: 30, a0: 180, a1: 360, delay: 380, dur: 800 });
      }
      fxNumero(st, b.x, b.y, tx.caido, { cor: '#e9b3a8', delay: 380 });
      return;
    }
    case 'queda': {
      if (f.morto) {
        if (!so) {
          fxAnel(st, b.x, b.y, { w: 80, esp: 2, cor: 'rgba(160,40,30,.85)', fundo: 'radial-gradient(circle, rgba(40,0,0,.55), transparent 65%)', de: 1.5, ate: .45, dur: 1200 });
          fxMover(st.tB, [{ filter: 'none' }, { filter: 'grayscale(1) brightness(.45)', offset: .2 }, { filter: 'grayscale(1) brightness(.45)', offset: .85 }, { filter: 'none' }], 2000);
          fxP(st, { x: b.x, y: b.y - 6, w: 22, h: 30, dur: 1500, delay: 300, css: { borderRadius: '50% 50% 40% 40%', background: 'radial-gradient(ellipse, rgba(235,240,255,.75), transparent 70%)', filter: 'blur(2px)' },
            kf: [{ opacity: 0, transform: fxT(0, 0, 0, .6) }, { opacity: .9, offset: .25 }, { opacity: 0, transform: fxT(6, -70, 0, 1.4, 1.8) }] });
        }
        fxNumero(st, b.x, b.y, tx.morto, { cor: '#e9b3a8', delay: 300 });
      } else {
        if (!so) {
          fxMover(st.tB, [{ translate: '0 0' }, { translate: '0 5px', offset: .25 }, { translate: '0 5px', offset: .8 }, { translate: '0 0' }], 1800);
          for (let i = 0; i < 3; i++) fxP(st, { x: b.x + 18 + i * 6, y: b.y - 22, w: 14, h: 16, txt: 'z', cls: 'fx-zz', dur: 1200, delay: 200 + i * 260, kf: [{ opacity: 0, transform: fxT(0, 0, 0, .6) }, { opacity: 1, offset: .25 }, { opacity: 0, transform: fxT(14, -34, 10, 1.2) }] });
        }
        fxNumero(st, b.x, b.y, tx.desmaiado, { cor: '#cfd8ff', delay: 200, alto: 70 });
      }
      return;
    }
    default:
      if (!so) fxBrilho(st, b.x, b.y, 100, FX_COR_CALMA[f.tipo] || FX_COR_CALMA.golpe);
  }
}

Object.assign(window, {
  tocarEfeitoFx,
  CatalogoEfeitos: { FX_GOLPES, FX_DEFESAS, FX_MAGIAS, FX_TXT },
});
