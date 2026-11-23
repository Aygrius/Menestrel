// Mapa do Plano Infernal — CONTINENTE COM MURALHAS (bloco 10, 23/11/2026).
// A terra é um continente orgânico escavado na rocha (litoral = curva de nível de um campo fractal);
// os 13 reinos são regiões dentro dele, em sequência ao longo de uma espinha. Onde dois reinos NÃO
// consecutivos se tocam, a fronteira vira muralha de montanhas: o caminho continua único (1 → 13).
// Saída: tagmar/infernal-continente.json (mm, origem embaixo à esquerda) e prévia tagmar/infernal-continente.svg.
import fs from 'node:fs';
import { relevoInfernal } from './infernal-relevo.mjs';
import { relevoDoMaterial } from './infernal-relevo-material.mjs';
const W = 750, H = 596.3, G = 1.25; // grade de 1,25 mm
// nome, x, y, meia-largura da terra (mm)
const R = [ // espiral que desce: volta de fora pelas bordas, Fulvina entra, Morrigalti no centro (o fundo)
  ['Ricutatis', 88, 512, 42], ['Mocna', 228, 515, 62], ['Antredom', 372, 525, 46], ['Diatrimis', 512, 510, 44],
  ['Ekisis', 650, 470, 76], ['Heldrom', 668, 315, 38], ['Seinoniz', 632, 132, 56], ['Vouxiz', 478, 90, 62],
  ['Udoviom', 318, 84, 34], ['Anasmadis', 162, 100, 50], ['Branaxis', 90, 285, 48], ['Fulvina', 225, 375, 56], ['Morrigalti', 455, 285, 112],
];
const hash = (i, j) => { let h = (i * 374761393 + j * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const sm = t => t * t * (3 - 2 * t);
const vnoise = (x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = sm(x - i), fy = sm(y - j);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
  return (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy) * 2 - 1; };
const fbm = (x, y, s, oct = 4) => { let v = 0, amp = 1, f = 1, n = 0; for (let o = 0; o < oct; o++) { v += amp * vnoise(x * f + s, y * f - s); n += amp; amp *= 0.5; f *= 2.1; } return v / n; };

// espinha: Catmull-Rom pelos centros
const P = R.map(r => [r[1], r[2]]), S = 30;
const cr = (p0, p1, p2, p3, t) => [0, 1].map(k => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t));
const ext = [[2 * P[0][0] - P[1][0], 2 * P[0][1] - P[1][1]], ...P, [2 * P[12][0] - P[11][0], 2 * P[12][1] - P[11][1]]];
const C0 = []; for (let i = 1; i < ext.length - 2; i++) for (let s = 0; s < S; s++) C0.push(cr(ext[i - 1], ext[i], ext[i + 1], ext[i + 2], s / S)); C0.push(P[12]);
const SERPENTE = [16, 12, 20, 22, 0, 26, 14, 12, 24, 18, 22, 20, 0];
const C = C0.map((p, k) => { const a = C0[Math.max(0, k - 1)], b = C0[Math.min(C0.length - 1, k + 1)], dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy);
  const ki = Math.round(k / S), loc = k / S - ki, env = Math.cos(Math.PI * Math.min(0.5, Math.abs(loc))) ** 2;
  const o = SERPENTE[Math.min(12, ki)] * env * Math.sin(2 * Math.PI * (k - ki * S) / (S * 0.75)); return [p[0] - dy / n * o, p[1] + dx / n * o]; });
const reinoDe = k => Math.max(0, Math.min(12, Math.round(k / S)));
const GARGALO = [0.45, 0.3, 0.7, 0.35, 0.55, 0.6, 0.3, 0.55, 0.7, 0.35, 0.5, 0.75];
const hwBase = k => { const f = k / S, i = Math.floor(f), t = sm(Math.max(0, Math.min(1, (f - i - 0.25) / 0.5)));
  return R[Math.min(12, i)][3] + (R[Math.min(12, i + 1)][3] - R[Math.min(12, i)][3]) * t; };
const hwDe = k => { let h = hwBase(k); for (let i = 0; i < 12; i++) { const d = (k - (i * S + S / 2)) / 3.5; h *= 1 - GARGALO[i] * Math.exp(-d * d); } return Math.max(14, h); };

// penínsulas (para fora) e baías (para dentro): gaussianas alongadas na direção normal da espinha
const normalEm = k => { const a = C[Math.max(0, k - 2)], b = C[Math.min(C.length - 1, k + 2)]; const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy); return [-dy / n, dx / n]; };
const acidentes = [];
for (let n = 0; n < 22; n++) { const k = Math.floor(hash(n, 501) * (C.length - 1)), lado = hash(n, 502) < 0.5 ? -1 : 1, nn = normalEm(k).map(v => v * lado);
  const peninsula = hash(n, 503) < 0.55, comp = peninsula ? 60 + 50 * hash(n, 504) : 30 + 30 * hash(n, 504), dist = hwDe(k) * 0.86 * (peninsula ? 0.95 : 0.7);
  const torce = (hash(n, 505) - 0.5) * 0.9, dir = [nn[0] * Math.cos(torce) - nn[1] * Math.sin(torce), nn[0] * Math.sin(torce) + nn[1] * Math.cos(torce)];
  if (reinoDe(k) === 8) continue;
  acidentes.push({ c: [C[k][0] + nn[0] * dist + dir[0] * comp * 0.4, C[k][1] + nn[1] * dist + dir[1] * comp * 0.4], dir, comp, larg: peninsula ? 9 + 7 * hash(n, 506) : 14 + 10 * hash(n, 506), amp: peninsula ? 60 : -50 }); }
const acidente = (x, y) => { let v = 0; for (const a of acidentes) { const dx = x - a.c[0], dy = y - a.c[1], u = dx * a.dir[0] + dy * a.dir[1], w = -dx * a.dir[1] + dy * a.dir[0];
  v += a.amp * Math.exp(-((u / (a.comp / 2)) ** 2) - ((w / a.larg) ** 2)); } return v; };
// campo na grade: valor da terra (>0 terra) e rótulo do reino
const nx = Math.ceil(W / G) + 1, ny = Math.ceil(H / G) + 1;
const V = new Float32Array(nx * ny), L = new Int8Array(nx * ny);
for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const x = i * G, y = j * G;
  let best = 1e9, bk = 0; for (let k = 0; k < C.length; k += 1) { const d = (x - C[k][0]) ** 2 + (y - C[k][1]) ** 2; if (d < best) { best = d; bk = k; } }
  const d = Math.sqrt(best), kr = reinoDe(bk);
  let best2 = 1e9; for (let k = 0; k < C.length; k += 1) { if (Math.abs(reinoDe(k) - kr) < 2) continue; const dd = (x - C[k][0]) ** 2 + (y - C[k][1]) ** 2; if (dd < best2) best2 = dd; }
  const folga = Math.sqrt(best2) - d; // perto de zero = no meio entre faixas de reinos não vizinhos
  let v = hwDe(bk) * 0.8 * (1 + 0.6 * fbm(x / 160, y / 160, 3)) + 30 * fbm(x / 45, y / 45, 7) + 8 * fbm(x / 12, y / 12, 9, 3) + acidente(x, y) - d;
  const margem = 34 + 22 * fbm(x / 90, y / 90, 13), borda = Math.min(x, y, W - x, H - y); if (borda < margem) v -= (margem - borda) * 2.4;
  if (borda < 16) v = Math.min(v, (borda - 16) * 3);   // sempre sobra rocha (ou maciço) entre a terra e a borda da página
  v = Math.max(v, 9 + 3 * fbm(x / 20, y / 20, 17) - d); // corredor mínimo: o caminho nunca se rompe
  if (folga < 60) v = Math.min(v, (folga - 28 + 14 * fbm(x / 30, y / 30, 19) + 5 * fbm(x / 9, y / 9, 23)) * 2.5);
  V[j * nx + i] = v;
  // rótulo: espinha mais próxima de um ponto distorcido (fronteiras orgânicas)
  const wx = x + 22 * fbm(x / 70, y / 70, 21), wy = y + 22 * fbm(x / 70, y / 70, 33);
  let b2 = 1e9, k2 = 0; for (let k = 0; k < C.length; k += 2) { const dd = (wx - C[k][0]) ** 2 + (wy - C[k][1]) ** 2; if (dd < b2) { b2 = dd; k2 = k; } }
  L[j * nx + i] = reinoDe(k2); }
const terraEm = (x, y) => { const i = Math.round(x / G), j = Math.round(y / G); return i >= 0 && j >= 0 && i < nx && j < ny && V[j * nx + i] > 0; };
const reinoEm = (x, y) => { const i = Math.round(x / G), j = Math.round(y / G); return i >= 0 && j >= 0 && i < nx && j < ny && V[j * nx + i] > 0 ? L[j * nx + i] : -1; };

// marching squares: curvas de nível fechadas de V em 0
const contornos = () => { const seg = new Map(), key = p => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
  const it = (a, b, va, vb) => { const t = va / (va - vb); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
  const lista = [];
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const p = [[i * G, j * G], [(i + 1) * G, j * G], [(i + 1) * G, (j + 1) * G], [i * G, (j + 1) * G]];
    const v = [V[j * nx + i], V[j * nx + i + 1], V[(j + 1) * nx + i + 1], V[(j + 1) * nx + i]];
    const e = []; for (let k = 0; k < 4; k++) { const a = k, b = (k + 1) % 4; if ((v[a] > 0) !== (v[b] > 0)) e.push(it(p[a], p[b], v[a], v[b])); }
    if (e.length === 2) lista.push([e[0], e[1]]); else if (e.length === 4) { lista.push([e[0], e[1]]); lista.push([e[2], e[3]]); } }
  for (const [a, b] of lista) { for (const [p, q] of [[a, b], [b, a]]) { const k = key(p); if (!seg.has(k)) seg.set(k, []); seg.get(k).push(q); } }
  const usado = new Set(), polys = [];
  for (const [a, b] of lista) { const k0 = key(a) + '|' + key(b); if (usado.has(k0)) continue; const poly = [a]; let prev = a, cur = b; usado.add(k0); usado.add(key(b) + '|' + key(a));
    while (key(cur) !== key(a) && poly.length < 100000) { poly.push(cur); const nxts = seg.get(key(cur)) || []; const nxt = nxts.find(n => !usado.has(key(cur) + '|' + key(n)));
      if (!nxt) break; usado.add(key(cur) + '|' + key(nxt)); usado.add(key(nxt) + '|' + key(cur)); prev = cur; cur = nxt; }
    polys.push(poly); }
  return polys; };
const area = p => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; };
const simplifica = (p, d = 0.6) => { const out = [p[0]]; for (const q of p) { const l = out.at(-1); if (Math.hypot(q[0] - l[0], q[1] - l[1]) >= d) out.push(q); } return out; };
const litoral = contornos().filter(p => Math.abs(area(p)) > 40).map(p => simplifica(p));

// fronteiras: arestas entre células de terra com reinos diferentes, encadeadas e suavizadas
const bordas = new Map(); // par -> segmentos
const addSeg = (a, b, r1, r2) => { const k = r1 < r2 ? `${r1}-${r2}` : `${r2}-${r1}`; if (!bordas.has(k)) bordas.set(k, []); bordas.get(k).push([a, b]); };
for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const o = j * nx + i; if (V[o] <= 0) continue;
  if (V[o + 1] > 0 && L[o] !== L[o + 1]) addSeg([(i + 0.5) * G, (j - 0.5) * G], [(i + 0.5) * G, (j + 0.5) * G], L[o], L[o + 1]);
  if (V[o + nx] > 0 && L[o] !== L[o + nx]) addSeg([(i - 0.5) * G, (j + 0.5) * G], [(i + 0.5) * G, (j + 0.5) * G], L[o], L[o + nx]); }
const encadeia = segs => { const key = p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`, adj = new Map();
  segs.forEach(([a, b], n) => { for (const p of [a, b]) { const k = key(p); if (!adj.has(k)) adj.set(k, []); adj.get(k).push(n); } });
  const usado = new Array(segs.length).fill(false), out = [];
  for (let s0 = 0; s0 < segs.length; s0++) { if (usado[s0]) continue; usado[s0] = true; let linha = [segs[s0][0], segs[s0][1]];
    for (const dir of [1, 0]) { let ponta = dir ? linha.at(-1) : linha[0];
      while (true) { const n = (adj.get(key(ponta)) || []).find(m => !usado[m]); if (n === undefined) break; usado[n] = true;
        const [a, b] = segs[n]; const prox = key(a) === key(ponta) ? b : a; if (dir) linha.push(prox); else linha.unshift(prox); ponta = prox; } }
    out.push(linha); }
  return out; };
const chaikin = (p, n = 3) => { for (let k = 0; k < n; k++) { const o = [p[0]]; for (let i = 0; i < p.length - 1; i++) { const a = p[i], b = p[i + 1];
  o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } o.push(p.at(-1)); p = o; } return p; };
const comprimento = p => p.reduce((s, q, i) => i ? s + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0, 0);
const fronteiras = [], muralhas = [];
for (const [par, segs] of bordas) { const [a, b] = par.split('-').map(Number);
  for (const l of encadeia(segs)) { if (comprimento(l) < 4) continue; const suave = simplifica(chaikin(l), 0.8);
    fronteiras.push(suave); if (b - a > 1) muralhas.push({ par, pts: suave }); } }
// fronteira só sobre terra: o trecho que atravessa a rocha sai (aparecia no modelo de montanhas)
{ const cortadas = []; for (const p of fronteiras) { let atual = []; for (const q of p) { if (terraEm(q[0], q[1])) atual.push(q); else { if (atual.length > 1) cortadas.push(atual); atual = []; } } if (atual.length > 1) cortadas.push(atual); }
  fronteiras.length = 0; fronteiras.push(...cortadas); }
// MODELO=montanhas: o traçado continua por baixo das montanhas (usuário, 23/11/2026: "o traçado deve
// mostrar a divisão dos reinos sob as montanhas"). O rótulo L existe na página toda, então a divisa
// entre reinos é tirada de todas as células, terra ou rocha, até a beira da página.
if (process.env.MODELO === 'montanhas') { const todas = new Map();
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const o = j * nx + i;
    const add = (a, b, r1, r2) => { const k = r1 < r2 ? `${r1}-${r2}` : `${r2}-${r1}`; if (!todas.has(k)) todas.set(k, []); todas.get(k).push([a, b]); };
    if (L[o] !== L[o + 1]) add([(i + 0.5) * G, (j - 0.5) * G], [(i + 0.5) * G, (j + 0.5) * G], L[o], L[o + 1]);
    if (L[o] !== L[o + nx]) add([(i - 0.5) * G, (j + 0.5) * G], [(i + 0.5) * G, (j + 0.5) * G], L[o], L[o + nx]); }
  fronteiras.length = 0;
  for (const [, segs] of todas) for (const l of encadeia(segs)) { if (comprimento(l) < 4) continue; fronteiras.push(simplifica(chaikin(l), 0.8)); } }
// conferência: reinos consecutivos precisam se tocar
const faltam = []; for (let i = 0; i < 12; i++) if (!bordas.has(`${i}-${i + 1}`)) faltam.push(`${R[i][0]}→${R[i + 1][0]}`);

// centros reais (centroide das células) e ferramentas de "dentro do reino"
const cen = R.map(() => [0, 0, 0]); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const o = j * nx + i; if (V[o] > 0) { const c = cen[L[o]]; c[0] += i * G; c[1] += j * G; c[2]++; } }
const centro = cen.map(c => [c[0] / c[2], c[1] / c[2]]);
const dentroK = (p, ki) => reinoEm(p[0], p[1]) === ki;
const raio = (c, ang, ki) => { let r = 0; while (r < 250 && dentroK([c[0] + Math.cos(ang) * (r + 1), c[1] + Math.sin(ang) * (r + 1)], ki)) r += 1; return r; };
const prende = (pts, ki, margem = 4) => { const c = centro[ki];
  return pts.map(p => dentroK(p, ki) ? p : (() => { const a = Math.atan2(p[1] - c[1], p[0] - c[0]), d = Math.max(2, raio(c, a, ki) - margem); return [c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d]; })()); };
const bolha = (cx, cy, rx, ry, seed, amp = 0.25) => { const pts = []; for (let a = 0; a < 360; a += 4) { const t = a * Math.PI / 180;
  const k = 1 + amp * fbm(Math.cos(t) * 1.6 + seed, Math.sin(t) * 1.6 - seed, seed); pts.push([cx + rx * k * Math.cos(t), cy + ry * k * Math.sin(t)]); } return pts; };
const montanhas = [];
const monte = (cx, cy, r, seed) => ({ base: bolha(cx, cy, r, r * 0.8, seed, 0.3), topo: bolha(cx - r * 0.12, cy + r * 0.1, r * 0.55, r * 0.42, seed + 1, 0.35),
  sombra: bolha(cx + r * 0.25, cy - r * 0.22, r * 0.85, r * 0.62, seed + 2, 0.3), luz: bolha(cx - r * 0.3, cy + r * 0.28, r * 0.35, r * 0.25, seed + 3, 0.3) });
// muralhas: cordilheira contínua ao longo de cada fronteira entre reinos não consecutivos
muralhas.forEach((m, n) => { const L2 = comprimento(m.pts); let acc = 0, prox = 0;
  for (let i = 1; i < m.pts.length; i++) { acc += Math.hypot(m.pts[i][0] - m.pts[i - 1][0], m.pts[i][1] - m.pts[i - 1][1]);
    if (acc >= prox) { const p = m.pts[i], a = m.pts[Math.max(0, i - 2)], b = m.pts[Math.min(m.pts.length - 1, i + 2)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const nn = Math.hypot(dx, dy) || 1; dx /= nn; dy /= nn;
      for (const lado of [-1, 0, 1]) { const h = hash(n * 7 + lado, i); if (lado && h < 0.35) continue; const o = lado * (5 + 3 * h);
        montanhas.push(monte(p[0] - dy * o + (h - 0.5) * 3, p[1] + dx * o, (lado ? 5 : 8) + 4 * h, 1000 * n + i * 3 + lado)); }
      prox += 5; } } });
// Morrigalti: anel de montanhas com abertura para Fulvina; Antredom: a montanha da cidadela
{ const ki = 12, c = centro[ki], ent = Math.atan2(centro[11][1] - c[1], centro[11][0] - c[0]) * 180 / Math.PI;
  for (let g = -180; g < 180; g += 7) { if (Math.abs(((g - ent + 540) % 360) - 180) < 26) continue; const a = g * Math.PI / 180, d = raio(c, a, ki) * 0.8;
    const p = [c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d]; if (dentroK(p, ki)) montanhas.push(monte(p[0], p[1], 10 + 5 * hash(g, 5), 600 + g)); } }
montanhas.push(monte(centro[2][0] - 10, centro[2][1] - 4, 14, 78), monte(centro[2][0] + 6, centro[2][1] + 6, 20, 77));
const cM = centro[12];
const vulcoes = [-40, 50, 150].map((g, i) => { const a = g * Math.PI / 180, d = raio(cM, a, 12) * 0.62, p = [cM[0] + Math.cos(a) * d, cM[1] + Math.sin(a) * d];
  return { p, cone: bolha(p[0], p[1], 14, 11, 200 + i, 0.18), sombra: bolha(p[0] + 4, p[1] - 4, 13, 9, 210 + i, 0.2), boca: bolha(p[0], p[1] + 1, 4.2, 3.2, 220 + i, 0.2) }; });
const subdiv = (poly, step) => { const out = []; for (let i = 0; i < poly.length - 1; i++) { const a = poly[i], b = poly[i + 1];
  const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } out.push(poly.at(-1)); return out; };
const rio = (pts, seed) => subdiv(pts, 2).map(([x, y], i) => [x + 3 * fbm(i / 9, seed, seed), y + 3 * fbm(i / 9, seed + 2, seed)]);
const rios = vulcoes.map((v, i) => ({ nome: ['Rio de Lava Sangrento', 'Rio de Lava das Treze Portas', 'Braço de Simaricane'][i],
  pts: rio([v.p, [(v.p[0] + cM[0]) / 2 + 8 * (hash(i, 9) - 0.5), (v.p[1] + cM[1]) / 2 + 8 * (hash(i, 10) - 0.5)], [cM[0], cM[1] - 3]], 2 + i * 3).filter(p => dentroK(p, 12)) }));
const cS = centro[6], cMo = centro[1], cE = centro[4];
const cratera = { borda: bolha(cS[0], cS[1], 26, 20, 300, 0.15), fundo: bolha(cS[0] + 2, cS[1] - 2, 19, 14, 301, 0.15), sombra: bolha(cS[0] - 4, cS[1] + 3, 17, 11, 302, 0.15) };
const planalto = { topo: prende(bolha(cMo[0] - 4, cMo[1] + 6, 42, 28, 400, 0.25), 1, 10), escarpa: prende(bolha(cMo[0] - 1, cMo[1] + 2, 44, 30, 400, 0.25), 1, 8) };
// O RELEVO E A LAVA NOVOS (23/11/2026): campo de altura sombreado e rede de drenagem — infernal-relevo.mjs.
// MODELO=montanhas: a rocha de fora vira maciço (prévia à parte; não grava o JSON do Corel)
const MODELO = process.env.MODELO || '';
const RV = relevoInfernal({ W, H, G, nx, ny, V, L, fbm, hash, centro, raio, montanhasFora: MODELO === 'montanhas' });
const bocas = RV.vulcoes.map((v, i) => bolha(v.p[0], v.p[1], 2.6, 2.2, 220 + i, 0.25));
const bordasBoca = RV.vulcoes.map((v, i) => bolha(v.p[0], v.p[1], 4.6, 4, 230 + i, 0.2));
const lagos = [{ nome: 'Lago de Vouxiz', pts: bolha(centro[7][0] + 4, centro[7][1] - 2, 30, 20, 4, 0.25) }];
const lodo = []; for (let k = S * 8 - 12; k <= S * 8 + 12; k += 2) { const p = C[k], s = (k / 2) % 2 ? 1 : -1;
  const q = [p[0] + s * 6 * hash(k, 3), p[1] + s * 6 * hash(k, 4)]; if (dentroK(q, 8)) lodo.push(bolha(q[0], q[1], 3.5 + 3 * hash(k, 1), 2.5 + 1.5 * hash(k, 2), 800 + k, 0.3)); }
const deserto = { borda: prende(bolha(cE[0], cE[1], 100, 80, 600, 0.22), 4, 4), meio: prende(bolha(cE[0] + 4, cE[1] + 2, 60, 46, 601, 0.25), 4, 14),
  centro: prende(bolha(cE[0] + 6, cE[1] + 4, 32, 24, 602, 0.3), 4, 20) };
const florestas = [[7, 64, 46, 0.28], [11, 64, 48, 0.25]].map(([ki, rx, ry, a], j) => prende(bolha(centro[ki][0], centro[ki][1], rx, ry, 700 + j, a), ki, 5));
const florestasDensas = [[7, 26, -12, 24, 13], [7, -32, 10, 18, 12], [11, -26, 8, 30, 18], [11, 24, -8, 24, 15]].map(([ki, dx, dy, rx, ry], j) =>
  prende(bolha(centro[ki][0] + dx, centro[ki][1] + dy, rx, ry, 720 + j, 0.35), ki, 8));
const rachas = []; for (let gx = cMo[0] - 90; gx < cMo[0] + 90; gx += 7) for (let gy = cMo[1] - 70; gy < cMo[1] + 70; gy += 7) {
  let p = [gx + 5 * hash(gx, gy), gy + 5 * hash(gy, gx)]; if (!dentroK(p, 1) || hash(gx + 1, gy) < 0.3) continue; let a = hash(gx, gy + 3) * 6.28; const pts = [p];
  for (let k = 0; k < 3; k++) { a += (hash(gx + k, gy) - 0.5) * 1.8; p = [p[0] + Math.cos(a) * 2.4, p[1] + Math.sin(a) * 2.4]; if (!dentroK(p, 1)) break; pts.push(p); }
  if (pts.length > 2) rachas.push(pts); }
const vapores = []; const fumarola = (x, y, n, seed) => { for (let j = 0; j < n; j++) { const h = hash(seed, j);
  const bx = x + (h - 0.5) * 9, by = y + (hash(j, seed) - 0.5) * 6, alt = 9 + 7 * h, inc = 0.35 + 0.3 * hash(seed, j + 9), A = [], B = [];
  for (let t = 0; t <= 1.0001; t += 0.05) { const cy = by + alt * t, cx = bx + inc * alt * t * t, w = 1.6 * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - 0.5 * t) + 0.25; A.push([cx - w, cy]); B.push([cx + w, cy]); }
  vapores.push([...A, ...B.reverse()]); } };
[[12, -30, 0], [12, 20, -25], [12, 10, 30], [6, -28, 12], [6, 26, -10], [8, 20, 0], [8, -30, 6], [4, 30, 30], [1, -40, -12], [9, 10, 10], [3, 20, -14], [0, -10, 8], [10, -30, 0], [5, 0, -20]]
  .forEach(([ki, dx, dy], j) => { const p = [centro[ki][0] + dx, centro[ki][1] + dy]; if (dentroK(p, ki)) fumarola(p[0], p[1], 2 + (j % 3), 900 + j); });
const fendas = []; for (let gx = 4; gx < W; gx += 13) for (let gy = 4; gy < H; gy += 13) { const h1 = hash(gx, gy), h2 = hash(gy, gx + 7);
  let p = [gx + 10 * h1, gy + 10 * h2]; const fora = q => { const i = Math.round(q[0] / G), j = Math.round(q[1] / G); return i < 0 || j < 0 || i >= nx || j >= ny || V[j * nx + i] < -5; };
  if (!fora(p) || h1 < 0.25) continue; let a = h2 * Math.PI * 2; const pts = [p];
  for (let k = 0; k < 3 + Math.floor(h1 * 4); k++) { a += (hash(gx + k, gy - k) - 0.5) * 1.6; p = [p[0] + Math.cos(a) * 3.2, p[1] + Math.sin(a) * 3.2];
    if (!fora(p) || p[0] < 0 || p[1] < 0 || p[0] > W || p[1] > H) break; pts.push(p); }
  if (pts.length > 2) fendas.push(pts); }

const r2 = a => a.map(p => [+p[0].toFixed(2), +p[1].toFixed(2)]);
if (!MODELO) fs.writeFileSync(new URL('../../tagmar/infernal-continente.json', import.meta.url), JSON.stringify({
  litoral: litoral.map(r2), fronteiras: fronteiras.map(r2), centros: centro.map(c => c.map(v => +v.toFixed(1))), espinha: r2(C),
  lava: RV.lava.map(l => l.map(r2)), larguras: RV.larguras, lagoLava: RV.lago.map(r2), florestaSeca: RV.florestaSeca.map(n => n.map(r2)), textura: { escura: RV.textura.escura.map(r2), clara: RV.textura.clara.map(r2) }, queimado: Object.fromEntries(Object.entries(RV.queimado).map(([k, v]) => [k, v.map(r2)])), bocas: bocas.map(r2),
  relevo: Object.fromEntries(Object.entries(RV.relevo).map(([k, v]) => [k, v.map(r2)])), lagoVouxiz: RV.lagoVx.map(n => n.map(r2)), biomas: Object.fromEntries(Object.entries(RV.biomas).map(([k, v]) => [k, v.map(n => n.map(r2))])),
  deserto: { borda: r2(deserto.borda), meio: r2(deserto.meio), centro: r2(deserto.centro) }, }));
const path = (pts, z = 'Z') => 'M' + pts.map(p => `${p[0].toFixed(1)},${(H - p[1]).toFixed(1)}`).join('L') + z;
// Biomas em faixas (borda, meio, miolo) — o mesmo jeito do deserto de Ekisis
const PtM = (list, attrs, z = 'Z') => list.length ? `<path d="${list.map(p => path(p, z)).join('')}" fill-rule="evenodd" ${attrs}/>` : '';
const Pt = (list, attrs, z) => list.map(p => `<path d="${path(p, z)}" ${attrs}/>`).join('');
/* A PALETA DO GOOGLE MAPS (23/11/2026, usuário: "A principal característica do nosso mapa é ser parecido
   com o Google Maps"). As mesmas cores do mapa material (public/mapa/tagmar.svg): terra árida e o
   deserto do Saara (#F2E6C6, #EEDDBB em três opacidades), floresta #99E4C1, água #83D6EA, relevo
   cinza-esverdeado translúcido com cumes claros, fronteira cinza tracejada. A rocha em volta continua o marrom-escuro de antes (usuário: "não quero o cinza"). */
const COR = { rocha: '#3E342E', terra: '#F2E6C6', arido: '#E6CF9C', floresta: ['#BEF1D4', '#B6EFCD', '#99E4C1'],
  lodo: ['#D3E6D2', '#C2DCC6', '#AED0B6'], agua: ['#9EDFEF', '#83D6EA'], lava: '#F0663A', lavaVale: '#F7B79A', fronteira: '#8C9196', rioSeco: '#B39A74' };
// rios secos: leito de areia mais escura, fino como os riachos do material; engrossa com a área drenada
const LARG_SECO = [0.12, 0.16, 0.22, 0.3, 0.4, 0.52];
const BIOMAS = [['mocna', 'arido'], ['fulvina', 'floresta'], ['vouxiz', 'floresta'], ['udoviom', 'lodo']];
const camadas = (k, lst) => k === 'arido' ? lst.map((l, n) => PtM(l, `fill="${COR.arido}" opacity="${['.38', '.50', '.65'][n]}"`)).join('')
  : lst.map((l, n) => PtM(l, `fill="${COR[k][n]}"`)).join('');
// MODELO=material: as montanhas em volta são as do próprio mapa material, carimbadas (infernal-relevo-material.mjs)
const RM = MODELO === 'material' ? relevoDoMaterial({ W, H, hash, fbm, terraEm }) : null;
if (RM) { COR.rocha = '#EBE0BF'; console.log(RM.conferencia); }   // o bege árido do material, um tom abaixo da terra
if (MODELO === 'montanhas') COR.rocha = COR.terra;   // sem cinza chapado: o cinza só nos cumes, como dentro (o fundo cinza fazia o limite)
// antes: '#D6D9D2';   // usuário, 23/11/2026: "Adicione o fundo cinza nas montanhas" (a base de montanha do material)   // como no material: a montanha é relevo sobre a cor da terra, sem fundo cinza
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="1500" height="1193"><rect width="${W}" height="${H}" fill="${COR.rocha}"/>
${RM ? RM.svg : ''}<path d="${litoral.map(p => path(p)).join('')}" fill="${COR.terra}" fill-rule="evenodd"/>
${camadas('arido', [[deserto.borda], [deserto.meio], [deserto.centro]])}
${BIOMAS.map(([k, cor]) => camadas(cor, RV.biomas[k])).join('')}${camadas('floresta', RV.florestaSeca)}
${PtM(RV.queimado.cinza, 'fill="#B9A68E" opacity=".35"')}${PtM(RV.queimado.basalto, 'fill="#6F625A" opacity=".30"')}${PtM(RV.queimado.crestado, 'fill="#8A6A55" opacity=".35"')}
${PtM(RV.textura.escura, 'fill="#52645B" opacity=".08"')}${PtM(RV.textura.clara, 'fill="#EBE0BF" opacity=".35"')}
${PtM(RV.relevo.sombra1, 'fill="#52645B" opacity=".16"')}${PtM(RV.relevo.sombra2, 'fill="#4A5A51" opacity=".22"')}${PtM(RV.relevo.sombra3, 'fill="#3F4F47" opacity=".28"')}${PtM(RV.relevo.sombra4, 'fill="#2E3A34" opacity=".30"')}
${PtM(RV.relevo.luz, 'fill="#FFFFFF" opacity=".40"')}${PtM(RV.relevo.cume1, 'fill="#DCE4D4" opacity=".65"')}${PtM(RV.relevo.cume2, 'fill="#E9EAE2" opacity=".75"')}${PtM(RV.relevo.cume3, 'fill="#FFFFFF" opacity=".90"')}
${RV.riosSecos.map((l, c) => PtM(l, `fill="none" stroke="${COR.rioSeco}" stroke-opacity=".75" stroke-width="${LARG_SECO[c]}" stroke-linecap="round" stroke-linejoin="round"`, '')).join('')}
${PtM(RV.lagoVx[0], `fill="${COR.agua[1]}"`)}
${Pt(fronteiras, `fill="none" stroke="${COR.fronteira}" stroke-width="0.28" stroke-dasharray="1.12 0.84"`, '')}
${RV.lava.map((l, c) => PtM(l, `fill="none" stroke="${COR.lavaVale}" stroke-opacity=".45" stroke-width="${(RV.larguras[c] * 3 + 0.9).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"`, '')).join('')}
${RV.lava.map((l, c) => PtM(l, `fill="none" stroke="${COR.lava}" stroke-width="${RV.larguras[c]}" stroke-linecap="round" stroke-linejoin="round"`, '')).join('')}
${PtM(RV.lago, `fill="${COR.lava}"`)}${Pt(bocas, `fill="${COR.lava}"`)}
<!--${R.map((r, i) => `<text x="${centro[i][0]}" y="${H - centro[i][1]}" font-size="12" fill="#fff" text-anchor="middle">${i + 1} ${r[0]}</text>`).join('')}--></svg>`;
if (MODELO) fs.writeFileSync(new URL(`../../tagmar/infernal-modelo-${MODELO}.svg`, import.meta.url), svg);
// o relevo inteiro (dentro e fora dos reinos) para o Corel: scripts/mapa/infernal-montanhas-corel.ps1
if (MODELO === 'montanhas') fs.writeFileSync(new URL('../../tagmar/infernal-montanhas.json', import.meta.url), JSON.stringify({ fundo: COR.rocha, relevo: Object.fromEntries(Object.entries(RV.relevo).map(([k, v]) => [k, v.map(r2)])), riosSecos: RV.riosSecos.map(l => l.map(r2)), largurasSecos: LARG_SECO }));
else { fs.writeFileSync(new URL('../../tagmar/infernal-continente.svg', import.meta.url), svg);
  fs.writeFileSync(new URL('../../tagmar/infernal-continente-rotulos.svg', import.meta.url), svg.replace('<!--', '').replace('--></svg>', '</svg>')); }
console.log(RV.conferencia);
console.log(`litoral: ${litoral.length} curvas; fronteiras: ${fronteiras.length}; muralhas: ${muralhas.length} (${[...new Set(muralhas.map(m => m.par))].join(' ')}); vizinhos sem fronteira: ${faltam.join(', ') || 'nenhum'}`);
