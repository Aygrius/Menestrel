// Mapa do Plano Infernal (tagmar/mapa.cdr, página 2) — gerador dos blocos 2, 2b e 3.
// Terra = faixa ao longo de uma linha central pelos 13 centros, com largura e serpenteio por reino,
// gargalos nas fronteiras de portão e becos sem saída. Também gera lava (mar e rios), lago e lodo.
// Saída (mm, origem embaixo à esquerda): tagmar/infernal-bloco2.json e prévia tagmar/infernal-bloco2.svg.
import fs from 'node:fs';
const W = 750, H = 596.3;
// nome, x, y, cor, meia-largura, serpenteio (amplitude mm), gargalo na fronteira com o próximo (0–1), becos
const R = [
  ['Ricutatis', 95, 490, [92, 74, 96], 46, 0, 0.3, 0],
  ['Mocna', 235, 455, [150, 108, 62], 62, 0, 0.25, 0],     // planalto descampado
  ['Antredom', 370, 505, [120, 64, 44], 50, 0, 0.7, 0],     // muralha de Diatrimis adiante
  ['Diatrimis', 515, 460, [128, 58, 40], 44, 0, 0.3, 0],
  ['Ekisis', 662, 478, [176, 132, 76], 64, 0, 0.35, 0],     // deserto imenso
  ['Heldrom', 640, 320, [150, 72, 34], 34, 9, 0.3, 0],
  ['Seinoniz', 490, 292, [78, 70, 66], 48, 0, 0.55, 0],     // cratera
  ['Vouxiz', 340, 330, [46, 62, 70], 54, 0, 0.45, 0],       // lago e floresta de brumas
  ['Udoviom', 170, 285, [70, 80, 46], 20, 24, 0.75, 0],     // vale estreito sem saída
  ['Anasmadis', 120, 140, [150, 84, 82], 42, 0, 0.3, 0],    // portão único na entrada
  ['Branaxis', 285, 112, [150, 142, 126], 22, 30, 0.3, 3],  // escadas tortas
  ['Fulvina', 450, 150, [92, 30, 38], 50, 0, 0.7, 0],       // entradas fortificadas de Morrigalti
  ['Morrigalti', 640, 118, [60, 22, 18], 66, 0, 0, 0],      // cercado de montanhas
];
const N = 40; // amostras por segmento
const hash = (i, j) => { let h = (i * 374761393 + j * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const sm = t => t * t * (3 - 2 * t);
const vnoise = (x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = sm(x - i), fy = sm(y - j);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
  return (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy) * 2 - 1; };
const fbm = (x, y, s) => { let v = 0, amp = 1, f = 1, n = 0; for (let o = 0; o < 4; o++) { v += amp * vnoise(x * f + s, y * f - s); n += amp; amp *= 0.5; f *= 2.1; } return v / n; };
const warp = ([x, y]) => [x + 9 * fbm(x / 60, y / 60, 11), y + 9 * fbm(x / 60, y / 60, 47)];

// perfil ao longo do índice k: valor de cada reino com transição suave nas fronteiras
const perfil = (k, col) => { const f = k / N, i = Math.floor(f), t = f - i;
  const a = R[Math.max(0, Math.min(12, i))][col], b = R[Math.max(0, Math.min(12, i + 1))][col];
  const u = sm(Math.max(0, Math.min(1, (t - 0.3) / 0.4)));
  return a + (b - a) * u; };

// linha central: Catmull-Rom pelos 13 centros, depois serpenteio pela normal
const P = R.map(r => [r[1], r[2]]);
const cr = (p0, p1, p2, p3, t) => [0, 1].map(k => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t));
const ext = [[2 * P[0][0] - P[1][0], 2 * P[0][1] - P[1][1]], ...P, [2 * P[12][0] - P[11][0], 2 * P[12][1] - P[11][1]]];
const C0 = [];
for (let i = 1; i < ext.length - 2; i++) for (let s = 0; s < N; s++) C0.push(cr(ext[i - 1], ext[i], ext[i + 1], ext[i + 2], s / N));
C0.push(P[12]);
const normal = (A, i) => { const a = A[Math.max(0, i - 1)], b = A[Math.min(A.length - 1, i + 1)];
  let dx = b[0] - a[0], dy = b[1] - a[1]; const n = Math.hypot(dx, dy) || 1; return [-dy / n, dx / n]; };
const C = C0.map((p, k) => { const amp = R[Math.min(12, Math.round(k / N))][5]; // serpenteio só dentro do reino, some nas fronteiras
  const loc = k / N - Math.round(k / N); const env = Math.cos(Math.PI * Math.min(0.5, Math.abs(loc))) ** 2; // 1 no centro, 0 na fronteira
  const o = amp * env * Math.sin(2 * Math.PI * (k - Math.round(k / N) * N) / 20); const n = normal(C0, k); return [p[0] + n[0] * o, p[1] + n[1] * o]; });

const subdiv = (poly, step, closed = true) => { const out = []; const m = closed ? poly.length : poly.length - 1;
  for (let i = 0; i < m; i++) { const a = poly[i], b = poly[(i + 1) % poly.length];
  const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
  if (!closed) out.push(poly.at(-1)); return out; };
const q = p => [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000];
// meia-largura: perfil do reino × gargalo gaussiano na fronteira × ruído
const half = (k, lado, extra) => { let h = perfil(k, 4);
  for (let i = 0; i < 12; i++) { const d = (k - (i * N + N / 2)) / 4.5; h *= 1 - R[i][6] * Math.exp(-d * d); }
  return Math.max(6, h * (1 + 0.16 * fbm(k / 25, lado, 3))) + extra; };
const off0 = (i, extra) => { const n = normal(C, i);
  const hl = half(i, 0.5, extra), hr = half(i, 7.3, extra);
  return [[C[i][0] + n[0] * hl, C[i][1] + n[1] * hl], [C[i][0] - n[0] * hr, C[i][1] - n[1] * hr]]; };
const xseg = (a, b, c, d) => { const r = [b[0]-a[0], b[1]-a[1]], t = [d[0]-c[0], d[1]-c[1]], den = r[0]*t[1] - r[1]*t[0]; if (!den) return null;
  const u = ((c[0]-a[0])*t[1] - (c[1]-a[1])*t[0]) / den, v = ((c[0]-a[0])*r[1] - (c[1]-a[1])*r[0]) / den;
  return u > 0 && u < 1 && v > 0 && v < 1 ? [a[0] + r[0]*u, a[1] + r[1]*u] : null; };
const deslaca = A => { for (let i = 0; i < A.length - 3; i++) for (let j = Math.min(A.length - 2, i + 120); j > i + 1; j--) { const x = xseg(A[i], A[i+1], A[j], A[j+1]); if (x) { for (let k = i + 1; k <= j; k++) A[k] = x; break; } } return A; };
const cache = {};
const off = (i, extra) => { if (!cache[extra]) { const Ls = [], Rs = []; for (let k = 0; k < C.length; k++) { const [l, r] = off0(k, extra); Ls.push(l); Rs.push(r); } deslaca(Ls); deslaca(Rs); cache[extra] = [Ls, Rs]; }
  return [cache[extra][0][i], cache[extra][1][i]]; };
const cap = (i, dir, extra) => { const [l, r] = off(i, extra), c = C[i]; const a0 = Math.atan2(l[1]-c[1], l[0]-c[0]);
  const rad = (Math.hypot(l[0]-c[0], l[1]-c[1]) + Math.hypot(r[0]-c[0], r[1]-c[1])) / 2; const pts = [];
  for (let k = 1; k < 14; k++) { const a = a0 + dir * Math.PI * k / 14; pts.push([c[0] + rad * Math.cos(a), c[1] + rad * Math.sin(a)]); } return pts; };
const faixa = (i0, i1, extra) => { const L = [], Rr = []; for (let i = i0; i <= i1; i++) { const [l, r] = off(i, extra); L.push(l); Rr.push(r); }
  const fim = i1 === C.length - 1 ? cap(i1, -1, extra) : [], ini = i0 === 0 ? cap(0, 1, extra).reverse() : [];
  return [...L, ...fim, ...Rr.reverse(), ...ini]; };
const reinos = R.map((r, i) => ({ nome: r[0], cor: r[3],
  pts: subdiv(faixa(Math.max(0, N * i - N / 2), Math.min(C.length - 1, N * i + N / 2), 0).map(q), 2.5).map(q).map(warp) }));
// fronteiras: só as linhas de corte entre reinos consecutivos (como a camada Fronteiras da página 1)
const fronteiras = []; for (let i = 0; i < 12; i++) { const k = N * i + N / 2; const [l, r] = off(k, 0);
  fronteiras.push(subdiv([q(l), q(r)], 2.5, false).map(q).map(warp)); }
const terra = subdiv(faixa(0, C.length - 1, 0), 2.5).map(warp);
const borda = subdiv(faixa(0, C.length - 1, 7), 2.5).map(warp);

// becos sem saída: dedos de terra que saem da margem e não levam a lugar nenhum
const dedo = (k, lado, comp, larg, extra) => { const [l, r] = off(k, 0); const base = lado > 0 ? l : r; const n = normal(C, k).map(v => v * lado);
  const t = [n[1], -n[0]]; const pts = []; const curva = 1.4 * (hash(k, 3) - 0.5) * 2;
  const eixo = []; for (let s = -8; s <= comp + extra; s += 2) { const b = s / comp; eixo.push([base[0] + n[0] * s + t[0] * curva * s * b * 0.8, base[1] + n[1] * s + t[1] * curva * s * b * 0.8]); }
  const L = [], Rr = []; eixo.forEach((p, i) => { const a = eixo[Math.max(0, i - 1)], b = eixo[Math.min(eixo.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const m = Math.hypot(dx, dy); const w = (larg + extra) * (1 - 0.7 * Math.max(0, i / eixo.length));
    L.push([p[0] - dy / m * w, p[1] + dx / m * w]); Rr.push([p[0] + dy / m * w, p[1] - dx / m * w]); });
  return [...L, ...Rr.reverse()].map(warp); };
const becos = [];
R.forEach((r, i) => { for (let j = 0; j < r[7]; j++) { const k = N * i - 14 + Math.round(28 * (j + 0.5) / r[7]); const lado = j % 2 ? 1 : -1;
  const comp = 20 + 9 * hash(i, j); becos.push({ reino: i, terra: dedo(k, lado, comp, 3.5, 0), borda: dedo(k, lado, comp, 3.5, 5) }); } });

// bolha orgânica
const bolha = (cx, cy, rx, ry, seed, amp = 0.25) => { const pts = []; for (let a = 0; a < 360; a += 4) { const t = a * Math.PI / 180;
  const k = 1 + amp * fbm(Math.cos(t) * 1.6 + seed, Math.sin(t) * 1.6 - seed, seed); pts.push([cx + rx * k * Math.cos(t), cy + ry * k * Math.sin(t)]); } return pts; };
// lava: mares nos vãos (o Corel recorta pela borda) e rios saindo dos vulcões de Morrigalti
const maresAntigos = [
  { nome: 'Mar de Brasas', pts: bolha(400, 214, 270, 38, 3, 0.3) },
  { nome: 'Mar de Lava do Sul', pts: bolha(640, 18, 230, 55, 8, 0.2) },
];
// relevo e vulcões (bloco 4) — tudo dentro do contorno de cada reino
const dentro = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j];
  if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c; } return c; };
const raio = (c, ang, poly) => { let r = 0; while (r < 200 && dentro([c[0] + Math.cos(ang) * (r + 1), c[1] + Math.sin(ang) * (r + 1)], poly)) r += 1; return r; };
const corta = (pts, poly) => { const out = []; for (const p of pts) { if (!dentro(p, poly)) { if (out.length) break; else continue; } out.push(p); } return out; };
const montanhas = []; // { base, topo, sombra, luz }
const monte = (cx, cy, r, seed) => ({ base: bolha(cx, cy, r, r * 0.8, seed, 0.3), topo: bolha(cx - r * 0.12, cy + r * 0.1, r * 0.55, r * 0.42, seed + 1, 0.35),
  sombra: bolha(cx + r * 0.25, cy - r * 0.22, r * 0.85, r * 0.62, seed + 2, 0.3), luz: bolha(cx - r * 0.3, cy + r * 0.28, r * 0.35, r * 0.25, seed + 3, 0.3) });
const cordilheira = (ki, frac, de, ate, rMin, rMax, passo, pular) => { const poly = reinos[ki].pts, c = [R[ki][1], R[ki][2]];
  for (let g = de; g <= ate; g += passo) { if (pular && pular(g)) continue; const ang = g * Math.PI / 180; const d = raio(c, ang, poly) * frac;
    const r = rMin + (rMax - rMin) * hash(ki * 100 + g, 5); const p = [c[0] + Math.cos(ang) * d, c[1] + Math.sin(ang) * d];
    if (dentro(p, poly)) montanhas.push(monte(p[0], p[1], r, ki * 50 + g)); } };
// Morrigalti cercado de montanhas, com a passagem da estrada a oeste (vinda de Fulvina)
const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
const entradaM = ang(P[12], P[11]);
cordilheira(12, 0.74, -180, 175, 10, 15, 12, g => Math.abs(((g - entradaM + 540) % 360) - 180) < 28);
// Antredom: a montanha da cidadela no centro, cercada pelo vale
montanhas.push(monte(R[2][1] - 10, R[2][2] - 4, 18, 78), monte(R[2][1] + 8, R[2][2] + 6, 26, 77));
// Udoviom: rochedos nas margens do vale estreito
for (let k = N * 8 - 18; k <= N * 8 + 18; k += 6) { const [l, r] = off(k, 0); const pr = (k / 6) % 2 ? l : r; const cc = C[k];
  const p = [cc[0] + (pr[0] - cc[0]) * 0.7, cc[1] + (pr[1] - cc[1]) * 0.7]; if (dentro(p, reinos[8].pts)) montanhas.push(monte(p[0], p[1], 7 + 3 * hash(k, 8), k)); }
// Heldrom e Diatrimis: morros áridos espalhados nas margens

// vulcões ativos de Morrigalti: três cones no anel, de onde nascem os rios de lava
const cM = [R[12][1], R[12][2]];
const vulcoes = [-30, 60, 140].map((g, i) => { const a = g * Math.PI / 180, d = raio(cM, a, reinos[12].pts) * 0.7;
  const p = [cM[0] + Math.cos(a) * d, cM[1] + Math.sin(a) * d];
  return { p, cone: bolha(p[0], p[1], 15, 12, 200 + i, 0.18), sombra: bolha(p[0] + 4, p[1] - 4, 14, 10, 210 + i, 0.2), boca: bolha(p[0], p[1] + 1, 4.5, 3.4, 220 + i, 0.2) }; });
// cratera de Seinoniz (o palácio enterrado no fundo)
const cS = [R[6][1], R[6][2]];
const cratera = { borda: bolha(cS[0], cS[1], 30, 22, 300, 0.15), fundo: bolha(cS[0] + 2, cS[1] - 2, 22, 15, 301, 0.15), sombra: bolha(cS[0] - 4, cS[1] + 3, 20, 12, 302, 0.15) };
// planalto de Mocna: mesa elevada com escarpa
const cMo = [R[1][1], R[1][2]];
const planalto = { topo: bolha(cMo[0] - 4, cMo[1] + 6, 44, 30, 400, 0.22), escarpa: bolha(cMo[0] - 1, cMo[1] + 2, 46, 32, 400, 0.22) };
const rio = (pts, seed) => subdiv(pts, 2, false).map(([x, y], i) => [x + 3 * fbm(i / 9, seed, seed), y + 3 * fbm(i / 9, seed + 2, seed)]);
// rios: de cada vulcão até o centro (Simaricane), sem sair do reino
const nomesRios = ['Rio de Lava Sangrento', 'Rio de Lava das Treze Portas', 'Braço de Simaricane'];
const rios = vulcoes.map((v, i) => { const m = [(v.p[0] + cM[0]) / 2 + 8 * (hash(i, 9) - 0.5), (v.p[1] + cM[1]) / 2 + 8 * (hash(i, 10) - 0.5)];
  return { nome: nomesRios[i], pts: corta(rio([v.p, m, [cM[0], cM[1] - 3]], 2 + i * 3), reinos[12].pts) }; });
// rios.push({ nome: 'Fosso de Simaricane', pts: corta(rio(bolha(cM[0], cM[1] - 3, 9, 6, 500, 0.1).concat([bolha(cM[0], cM[1] - 3, 9, 6, 500, 0.1)[0]]), 11), reinos[12].pts) });

const mares = []; // 22/11: fora do caminho só há rocha
// fendas na rocha: linhas quebradas espalhadas fora da borda
const fendas = []; const bordaAll = [borda, ...becos.map(b => b.borda)];
const foraDaBorda = p => !bordaAll.some(pl => dentro(p, pl));
for (let gx = 4; gx < W; gx += 13) for (let gy = 4; gy < H; gy += 13) { const h1 = hash(gx, gy), h2 = hash(gy, gx + 7);
  let p = [gx + 10 * h1, gy + 10 * h2]; if (!foraDaBorda(p) || h1 < 0.25) continue; let a = h2 * Math.PI * 2; const pts = [p];
  for (let k = 0; k < 3 + Math.floor(h1 * 4); k++) { a += (hash(gx + k, gy - k) - 0.5) * 1.6; p = [p[0] + Math.cos(a) * 3.2, p[1] + Math.sin(a) * 3.2];
    if (!foraDaBorda(p) || p[0] < 0 || p[1] < 0 || p[0] > W || p[1] > H) break; pts.push(p); }
  if (pts.length > 2) fendas.push(pts); }
// bloco 5 — biomas, no estilo da página 1 (manchas em tons, sem contorno), sempre presos ao reino
const prende = (pts, ki, margem = 4) => { const poly = reinos[ki].pts, c = [R[ki][1], R[ki][2]];
  return pts.map(p => dentro(p, poly) ? p : (() => { const a = Math.atan2(p[1] - c[1], p[0] - c[0]); const d = Math.max(2, raio(c, a, poly) - margem); return [c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d]; })()); };
const cE = [R[4][1], R[4][2]];
const deserto = { borda: prende(bolha(cE[0], cE[1] - 6, 80, 85, 600, 0.2), 4, 3), meio: prende(bolha(cE[0] + 2, cE[1] - 2, 48, 44, 601, 0.25), 4, 10),
  centro: prende(bolha(cE[0] + 4, cE[1], 26, 22, 602, 0.3), 4, 16) };
const florestas = []; // Vouxiz (brumas ao redor do lago) e Fulvina (florestas sombrias)
[[7, 0, 0, 70, 46, 0.25], [7, -36, 18, 18, 12, 0.3], [11, -10, 4, 80, 48, 0.22], [11, 40, -14, 22, 16, 0.3]].forEach(([ki, dx, dy, rx, ry, a], j) =>
  florestas.push(prende(bolha(R[ki][1] + dx, R[ki][2] + dy, rx, ry, 700 + j, a), ki, 5)));
const florestasDensas = [[7, 22, -10, 26, 14], [7, -30, 8, 20, 12], [11, -30, 10, 34, 18], [11, 22, -6, 26, 16]].map(([ki, dx, dy, rx, ry], j) =>
  prende(bolha(R[ki][1] + dx, R[ki][2] + dy, rx, ry, 720 + j, 0.35), ki, 8));
// solo rachado no planalto árido de Mocna
const rachas = []; { const ki = 1, poly = reinos[ki].pts;
  for (let gx = R[ki][1] - 70; gx < R[ki][1] + 70; gx += 7) for (let gy = R[ki][2] - 60; gy < R[ki][2] + 60; gy += 7) {
    let p = [gx + 5 * hash(gx, gy), gy + 5 * hash(gy, gx)]; if (!dentro(p, poly) || hash(gx + 1, gy) < 0.3) continue; let a = hash(gx, gy + 3) * 6.28; const pts = [p];
    for (let k = 0; k < 3; k++) { a += (hash(gx + k, gy) - 0.5) * 1.8; p = [p[0] + Math.cos(a) * 2.4, p[1] + Math.sin(a) * 2.4]; if (!dentro(p, poly)) break; pts.push(p); }
    if (pts.length > 2) rachas.push(pts); } }
// vapores que saem do chão: fiapos em grupos (fumarolas), mais densos perto de lava, cratera e lodo
const vapores = []; const fumarola = (x, y, n, seed) => { for (let j = 0; j < n; j++) { const h = hash(seed, j);
  // fiapo: gota alongada que sobe e entorta com o vento, afinando para cima
    const bx = x + (h - 0.5) * 9, by = y + (hash(j, seed) - 0.5) * 6, alt = 9 + 7 * h, inc = 0.35 + 0.3 * hash(seed, j + 9), pts = [];
    for (let t = 0; t <= 1.0001; t += 0.05) { const cy = by + alt * t, cx = bx + inc * alt * t * t, w = 1.6 * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - 0.5 * t) + 0.25;
      pts.push([cx - w, cy]); }
    for (let t = 1; t >= -0.0001; t -= 0.05) { const cy = by + alt * t, cx = bx + inc * alt * t * t, w = 1.6 * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - 0.5 * t) + 0.25;
      pts.push([cx + w, cy]); }
    vapores.push(pts); } };
[[12, -20, 10], [12, 20, -20], [12, 0, 30], [6, -30, 14], [6, 30, -8], [8, 0, 0], [8, -10, 30], [5, 10, 20], [2, -40, -10], [9, 20, 10], [3, 30, -20], [0, -20, 10], [10, -40, 0]]
  .forEach(([ki, dx, dy], j) => { const p = [R[ki][1] + dx, R[ki][2] + dy]; if (dentro(p, reinos[ki].pts)) fumarola(p[0], p[1], 2 + (j % 3), 900 + j); });
const vk = N * 7; // Vouxiz
const lagos = [{ nome: 'Lago de Vouxiz', pts: bolha(C[vk][0] + 4, C[vk][1] - 2, 30, 20, 4, 0.22) }];
const lodo = []; for (let k = N * 8 - 16; k <= N * 8 + 16; k += 4) { const n = normal(C, k), s = (k / 4) % 2 ? 1 : -1;
  lodo.push(bolha(C[k][0] + n[0] * s * 7, C[k][1] + n[1] * s * 7, 4 + 3 * hash(k, 1), 3 + 2 * hash(k, 2), k, 0.3)); }
const estrada = subdiv(C.filter((_, i) => i % 2 === 0), 3, false).map(warp);

const r2 = a => a.map(p => [+p[0].toFixed(2), +p[1].toFixed(2)]);
fs.writeFileSync(new URL('../../tagmar/infernal-bloco2.json', import.meta.url), JSON.stringify({
  terra: r2(terra), borda: r2(borda), reinos: reinos.map(k => ({ ...k, pts: r2(k.pts) })),
  becos: becos.map(b => ({ reino: b.reino, terra: r2(b.terra), borda: r2(b.borda) })),
  mares: mares.map(m => ({ nome: m.nome, pts: r2(m.pts) })), rios: rios.map(m => ({ nome: m.nome, pts: r2(m.pts) })),
  lagos: lagos.map(m => ({ nome: m.nome, pts: r2(m.pts) })), lodo: lodo.map(r2), estrada: r2(estrada), fendas: fendas.map(r2), fronteiras: fronteiras.map(r2), deserto: { borda: r2(deserto.borda), meio: r2(deserto.meio), centro: r2(deserto.centro) },
  florestas: florestas.map(r2), florestasDensas: florestasDensas.map(r2), rachas: rachas.map(r2), vapores: vapores.map(r2),
  montanhas: montanhas.map(m => ({ base: r2(m.base), topo: r2(m.topo), sombra: r2(m.sombra), luz: r2(m.luz) })),
  vulcoes: vulcoes.map(v => ({ cone: r2(v.cone), sombra: r2(v.sombra), boca: r2(v.boca) })),
  cratera: { borda: r2(cratera.borda), fundo: r2(cratera.fundo), sombra: r2(cratera.sombra) },
  planalto: { topo: r2(planalto.topo), escarpa: r2(planalto.escarpa) } }));
const path = (pts, z = 'Z') => 'M' + pts.map(p => `${p[0].toFixed(1)},${(H - p[1]).toFixed(1)}`).join('L') + z;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="1500" height="1193"><rect width="${W}" height="${H}" fill="#3e342e"/>${fendas.map(p => `<path d="${path(p, "")}" fill="none" stroke="#2a221e" stroke-width="0.5"/>`).join("")}
${mares.map(m => `<path d="${path(m.pts)}" fill="#c8461a" stroke="#ff9632" stroke-width="0.6"/>`).join('')}
<path d="${path(borda)}" fill="#1e1512"/>${becos.map(b => `<path d="${path(b.borda)}" fill="#1e1512"/>`).join('')}
${reinos.map((k, i) => `<path d="${path(k.pts)}" fill="#9c6a55"/>` + becos.filter(b => b.reino === i).map(b => `<path d="${path(b.terra)}" fill="#9c6a55"/>`).join('')).join('')}
<path d="${path(deserto.borda)}" fill="#b08a62"/><path d="${path(deserto.meio)}" fill="#c49e70"/><path d="${path(deserto.centro)}" fill="#d4b080"/>
${florestas.map(p => `<path d="${path(p)}" fill="#6e5440"/>`).join('')}${florestasDensas.map(p => `<path d="${path(p)}" fill="#4e3a2e"/>`).join('')}
${rachas.map(p => `<path d="${path(p, '')}" fill="none" stroke="#6e4a3c" stroke-width="0.4"/>`).join('')}
${lagos.map(m => `<path d="${path(m.pts)}" fill="#22343c" stroke="#5a7a86" stroke-width="0.5"/>`).join('')}
${lodo.map(m => `<path d="${path(m)}" fill="#343c20"/>`).join('')}
${rios.map(m => `<path d="${path(m.pts, '')}" fill="none" stroke="#f06e1e" stroke-width="1.6"/>`).join('')}
<path d="${path(planalto.escarpa)}" fill="#3c2418" opacity="0.7"/><path d="${path(planalto.topo)}" fill="#b4885a"/>
<path d="${path(cratera.borda)}" fill="#6e625a"/><path d="${path(cratera.fundo)}" fill="#2a2220"/><path d="${path(cratera.sombra)}" fill="#120c0b" opacity="0.5"/>
${montanhas.map(m => `<path d="${path(m.sombra)}" fill="#1a0e0b" opacity="0.55"/>`).join('')}${montanhas.map(m => `<path d="${path(m.base)}" fill="#60423a"/>`).join('')}
${montanhas.map(m => `<path d="${path(m.topo)}" fill="#8c644e"/><path d="${path(m.luz)}" fill="#d2a078" opacity="0.5"/>`).join('')}
${vulcoes.map(v => `<path d="${path(v.sombra)}" fill="#120a08" opacity="0.6"/><path d="${path(v.cone)}" fill="#3a2620"/><path d="${path(v.boca)}" fill="#ff7a1e"/>`).join('')}
${vapores.map(p => `<path d="${path(p)}" fill="#d8ccc0" opacity="0.4"/>`).join('')}<path d="${path(estrada, '')}" opacity="0" fill="none" stroke="#d6964a" stroke-width="1.1" stroke-dasharray="3 2"/>
${fronteiras.map(p => `<path d="${path(p, '')}" fill="none" stroke="#3a2a24" stroke-width="0.45" stroke-dasharray="1.8 1.3"/>`).join('')}<!--${R.map(r => `<text x="${r[1]}" y="${H - r[2]}" font-size="13" fill="#e8c88c" text-anchor="middle">${r[0]}</text>`).join('')}--></svg>`;
fs.writeFileSync(new URL('../../tagmar/infernal-bloco2.svg', import.meta.url), svg);
console.log('terra', terra.length, 'becos', becos.length, 'lodo', lodo.length);
