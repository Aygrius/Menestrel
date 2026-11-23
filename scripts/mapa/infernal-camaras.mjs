// Mapa do Plano Infernal — geometria de CÂMARAS LIGADAS (bloco 9, 23/11/2026).
// Cada reino é uma câmara de forma própria (contorno fractal), ligada só ao anterior e ao próximo
// por uma passagem estreita e torta. Fora do caminho, só rocha. Mesmo JSON que infernal-fronteiras.mjs
// (mais `bordas` e `pecas`), aplicado por infernal-fronteiras-corel.ps1.
import fs from 'node:fs';
const W = 750, H = 596.3;
// nome, x, y, rx, ry, rotação°, largura da passagem para o próximo (mm)
const R = [
  ['Ricutatis', 72, 505, 44, 38, 10, 8],
  ['Mocna', 190, 440, 70, 54, -12, 12],      // planalto descampado
  ['Antredom', 318, 515, 52, 44, 15, 5],     // a muralha de Diatrimis adiante: portão estreito
  ['Diatrimis', 430, 440, 48, 40, -5, 10],
  ['Ekisis', 600, 470, 96, 78, 8, 9],        // deserto imenso
  ['Heldrom', 690, 318, 38, 56, 5, 8],
  ['Seinoniz', 578, 270, 48, 42, 0, 11],     // cratera
  ['Vouxiz', 428, 298, 70, 54, -8, 7],       // lago e floresta de brumas
  ['Udoviom', 250, 300, 72, 17, -12, 5],     // vale estreito sem saída; portão único de Anasmadis
  ['Anasmadis', 100, 225, 46, 44, 0, 9],
  ['Branaxis', 190, 98, 62, 40, 12, 10],     // necrópole, pedreira
  ['Fulvina', 352, 128, 66, 54, -10, 6],     // entradas fortificadas de Morrigalti
  ['Morrigalti', 590, 118, 96, 70, 4, 0],   // cercado de montanhas e vulcões
];
const hash = (i, j) => { let h = (i * 374761393 + j * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const sm = t => t * t * (3 - 2 * t);
const vnoise = (x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = sm(x - i), fy = sm(y - j);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
  return (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy) * 2 - 1; };
const fbm = (x, y, s, oct = 4) => { let v = 0, amp = 1, f = 1, n = 0; for (let o = 0; o < oct; o++) { v += amp * vnoise(x * f + s, y * f - s); n += amp; amp *= 0.5; f *= 2.1; } return v / n; };
const warp = ([x, y]) => [x + 5 * fbm(x / 40, y / 40, 11), y + 5 * fbm(x / 40, y / 40, 47)];
const dentro = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j];
  if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c; } return c; };

// câmara: raio fractal em três escalas (enseadas, cabos e recortes miúdos)
const camara = (i, extra) => i === 8 ? forma(R[8][1], R[8][2], 20, 14, 0, 950, extra) : forma(R[i][1], R[i][2], R[i][3], R[i][4], R[i][5], i, extra);
const forma = (cx, cy, rx, ry, rot, i, extra) => { const a0 = rot * Math.PI / 180, pts = [];
  for (let g = 0; g < 360; g += 1.5) { const t = g * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
    const k = 1 + 0.30 * fbm(c * 1.2 + i * 7, s * 1.2, i, 2) + 0.12 * fbm(c * 3.5, s * 3.5 + i, i + 40, 2) + 0.05 * fbm(c * 11, s * 11, i + 80, 2);
    const x = (rx * k + extra) * c, y = (ry * k + extra) * s; pts.push(warp([cx + x * Math.cos(a0) - y * Math.sin(a0), cy + x * Math.sin(a0) + y * Math.cos(a0)])); }
  return pts; };
// passagem de i para i+1: curva torta com largura irregular; metade de cada reino
const eixos = [];
for (let i = 0; i < 12; i++) { const a = [R[i][1], R[i][2]], b = [R[i + 1][1], R[i + 1][2]]; const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
  const n = [-dy / d, dx / d], curva = (hash(i, 31) - 0.5) * 0.5 * d; const pts = [];
  for (let t = 0.2; t <= 0.8001; t += 0.01) { const b2 = 4 * t * (1 - t) * curva, w = 6 * fbm(t * 6, i, i + 5);
    pts.push([a[0] + dx * t + n[0] * (b2 + w), a[1] + dy * t + n[1] * (b2 + w)]); }
  eixos.push(pts); }
const tira = (eixo, i, t0, t1, extra) => { const L = [], Rr = [], m = eixo.length - 1;
  for (let k = Math.round(t0 * m); k <= Math.round(t1 * m); k++) { const a = eixo[Math.max(0, k - 1)], b = eixo[Math.min(m, k + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const n = Math.hypot(dx, dy); dx /= n; dy /= n;
    const w = R[i][6] * (1 + 0.45 * fbm(k / 9, i, i + 60)) / 2 + extra; const p = eixo[k];
    L.push([p[0] - dy * w, p[1] + dx * w]); Rr.push([p[0] + dy * w, p[1] - dx * w]); }
  return [...L, ...Rr.reverse()]; };
const lobulos = (i, extra) => { const [, cx, cy, rx, ry] = R[i]; const out = [];
  if (i === 8) { // vale sinuoso de lodo: uma faixa contínua que serpenteia de leste a oeste
    const [, cx, cy, rx] = R[8], L = [], Rr = [];
    for (let t = -1.15; t <= 1.1501; t += 0.02) { const x = cx + rx * t, y = cy + 9 * Math.sin(t * 3) - 8 * t;
      const x2 = cx + rx * (t + 0.02), y2 = cy + 9 * Math.sin((t + 0.02) * 3) - 8 * (t + 0.02); let dx = x2 - x, dy = y2 - y; const n = Math.hypot(dx, dy); dx /= n; dy /= n;
      const w = 9 + 4 * fbm(t * 5, 8, 61) + 2 * fbm(t * 19, 8, 62) + extra; L.push([x - dy * w, y + dx * w]); Rr.push([x + dy * w, y - dx * w]); }
    out.push([...L, ...Rr.reverse()].map(warp)); return out; }
  const n = 2 + Math.floor(hash(i, 3) * 2); for (let k = 0; k < n; k++) { const a = (hash(i, 10 + k) + k / n) * Math.PI * 2, d = 0.55 + 0.2 * hash(i, 20 + k);
    const sx = 0.45 + 0.25 * hash(i, 30 + k); out.push(forma(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, rx * sx, ry * sx, hash(i, 40 + k) * 90, 100 * i + k, extra)); }
  return out; };
const reinos = R.map((r, i) => { const pecas = [camara(i, 0), ...lobulos(i, 0)];
  if (i > 0) pecas.push(tira(eixos[i - 1], i - 1, 0.5, 1, 0)); if (i < 12) pecas.push(tira(eixos[i], i, 0, 0.5, 0));
  return { nome: r[0], pts: pecas[0], pecas }; });
const bordas = [...R.flatMap((_, i) => [camara(i, 6), ...lobulos(i, 6)]), ...eixos.map((e, i) => tira(e, i, 0, 1, 5))];
const fronteiras = eixos.map((e, i) => { const m = Math.round((e.length - 1) / 2), a = e[m - 1], b = e[m + 1];
  let dx = b[0] - a[0], dy = b[1] - a[1]; const n = Math.hypot(dx, dy); dx /= n; dy /= n; const w = R[i][6] * (1 + 0.45 * fbm(m / 9, i, i + 60)) / 2 + 0.5;
  return [[e[m][0] - dy * w, e[m][1] + dx * w], [e[m][0] + dy * w, e[m][1] - dx * w]]; });

// conferência: reinos não consecutivos não podem se aproximar (um caminho só)
const formaDe = i => [camara(i, 6), ...lobulos(i, 6), ...(i > 0 ? [tira(eixos[i - 1], i - 1, 0.5, 1, 5)] : []), ...(i < 12 ? [tira(eixos[i], i, 0, 0.5, 5)] : [])];
let menor = 1e9, par = '';
for (let i = 0; i < 13; i++) for (let j = i + 2; j < 13; j++) for (const A of formaDe(i)) for (const B of formaDe(j)) for (let a = 0; a < A.length; a += 3) for (let b = 0; b < B.length; b += 3) {
  const d = Math.hypot(A[a][0] - B[b][0], A[a][1] - B[b][1]); if (d < menor) { menor = d; par = `${R[i][0]}–${R[j][0]}`; } }
let fora = 0; for (const B of bordas) for (const p of B) if (p[0] < 2 || p[1] < 2 || p[0] > W - 2 || p[1] > H - 2) fora++;

// relevo, lava, água e biomas (mesma lógica do gerador anterior, presa a cada câmara)
const bolha = (cx, cy, rx, ry, seed, amp = 0.25) => { const pts = []; for (let a = 0; a < 360; a += 4) { const t = a * Math.PI / 180;
  const k = 1 + amp * fbm(Math.cos(t) * 1.6 + seed, Math.sin(t) * 1.6 - seed, seed); pts.push([cx + rx * k * Math.cos(t), cy + ry * k * Math.sin(t)]); } return pts; };
const raio = (c, ang, poly) => { let r = 0; while (r < 250 && dentro([c[0] + Math.cos(ang) * (r + 1), c[1] + Math.sin(ang) * (r + 1)], poly)) r += 1; return r; };
const cam = i => reinos[i].pts, cen = i => [R[i][1], R[i][2]];
const prende = (pts, ki, margem = 4) => { const poly = cam(ki), c = cen(ki);
  return pts.map(p => dentro(p, poly) ? p : (() => { const a = Math.atan2(p[1] - c[1], p[0] - c[0]); const d = Math.max(2, raio(c, a, poly) - margem); return [c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d]; })()); };
const montanhas = [];
const monte = (cx, cy, r, seed) => ({ base: bolha(cx, cy, r, r * 0.8, seed, 0.3), topo: bolha(cx - r * 0.12, cy + r * 0.1, r * 0.55, r * 0.42, seed + 1, 0.35),
  sombra: bolha(cx + r * 0.25, cy - r * 0.22, r * 0.85, r * 0.62, seed + 2, 0.3), luz: bolha(cx - r * 0.3, cy + r * 0.28, r * 0.35, r * 0.25, seed + 3, 0.3) });
const anguloPara = (i, j) => Math.atan2(R[j][2] - R[i][2], R[j][1] - R[i][1]) * 180 / Math.PI;
// Morrigalti: anel de montanhas com a passagem vinda de Fulvina
{ const ent = anguloPara(12, 11); for (let g = -180; g < 180; g += 9) { if (Math.abs(((g - ent + 540) % 360) - 180) < 24) continue;
  const a = g * Math.PI / 180, d = raio(cen(12), a, cam(12)) * 0.78, p = [R[12][1] + Math.cos(a) * d, R[12][2] + Math.sin(a) * d];
  if (dentro(p, cam(12))) montanhas.push(monte(p[0], p[1], 10 + 5 * hash(g, 5), 600 + g)); } }
montanhas.push(monte(R[2][1] - 10, R[2][2] - 4, 16, 78), monte(R[2][1] + 8, R[2][2] + 6, 22, 77)); // cidadela de Antredom
// Udoviom: rochedos nas margens do vale
{ const [, cx, cy, rx, , rot] = R[8], a0 = rot * Math.PI / 180;
  for (let s = -0.8; s <= 0.81; s += 0.2) { const lado = Math.round(s * 5) % 2 ? 1 : -1; const x = rx * s, y = 11 * lado;
    const p = [cx + x * Math.cos(a0) - y * Math.sin(a0), cy + x * Math.sin(a0) + y * Math.cos(a0)]; if (dentro(p, cam(8))) montanhas.push(monte(p[0], p[1], 6 + 2 * hash(s * 10, 8), 700 + s * 10)); } }
const cM = cen(12);
const vulcoes = [-40, 50, 150].map((g, i) => { const a = g * Math.PI / 180, d = raio(cM, a, cam(12)) * 0.7, p = [cM[0] + Math.cos(a) * d, cM[1] + Math.sin(a) * d];
  return { p, cone: bolha(p[0], p[1], 15, 12, 200 + i, 0.18), sombra: bolha(p[0] + 4, p[1] - 4, 14, 10, 210 + i, 0.2), boca: bolha(p[0], p[1] + 1, 4.5, 3.4, 220 + i, 0.2) }; });
const cS = cen(6);
const cratera = { borda: bolha(cS[0], cS[1], 28, 22, 300, 0.15), fundo: bolha(cS[0] + 2, cS[1] - 2, 20, 15, 301, 0.15), sombra: bolha(cS[0] - 4, cS[1] + 3, 18, 12, 302, 0.15) };
const cMo = cen(1);
const planalto = { topo: prende(bolha(cMo[0] - 4, cMo[1] + 6, 40, 26, 400, 0.25), 1, 10), escarpa: prende(bolha(cMo[0] - 1, cMo[1] + 2, 42, 28, 400, 0.25), 1, 8) };
const subdiv = (poly, step) => { const out = []; for (let i = 0; i < poly.length - 1; i++) { const a = poly[i], b = poly[i + 1];
  const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } out.push(poly.at(-1)); return out; };
const rio = (pts, seed) => subdiv(pts, 2).map(([x, y], i) => [x + 3 * fbm(i / 9, seed, seed), y + 3 * fbm(i / 9, seed + 2, seed)]);
const rios = vulcoes.map((v, i) => ({ nome: ['Rio de Lava Sangrento', 'Rio de Lava das Treze Portas', 'Braço de Simaricane'][i],
  pts: rio([v.p, [(v.p[0] + cM[0]) / 2 + 8 * (hash(i, 9) - 0.5), (v.p[1] + cM[1]) / 2 + 8 * (hash(i, 10) - 0.5)], [cM[0], cM[1] - 3]], 2 + i * 3).filter(p => dentro(p, cam(12))) }));
const lagos = [{ nome: 'Lago de Vouxiz', pts: bolha(R[7][1] + 4, R[7][2] - 2, 30, 20, 4, 0.25) }];
const lodo = []; { const [, cx, cy, rx, , rot] = R[8], a0 = rot * Math.PI / 180;
  for (let s = -0.85; s <= 0.86; s += 0.17) { const y = ((Math.round(s * 100) / 17) % 2 ? 1 : -1) * 4, x = rx * s;
    lodo.push(bolha(cx + x * Math.cos(a0) - y * Math.sin(a0), cy + x * Math.sin(a0) + y * Math.cos(a0), 4 + 3 * hash(s * 9, 1), 2.5 + 1.5 * hash(s * 9, 2), 800 + s * 10, 0.3)); } }
const cE = cen(4);
const deserto = { borda: prende(bolha(cE[0], cE[1] - 4, 96, 76, 600, 0.22), 4, 4), meio: prende(bolha(cE[0] + 4, cE[1], 58, 44, 601, 0.25), 4, 12),
  centro: prende(bolha(cE[0] + 6, cE[1] + 2, 30, 22, 602, 0.3), 4, 18) };
const florestas = [[7, 0, 0, 62, 44, 0.28], [11, -6, 2, 60, 46, 0.25]].map(([ki, dx, dy, rx, ry, a], j) => prende(bolha(R[ki][1] + dx, R[ki][2] + dy, rx, ry, 700 + j, a), ki, 5));
const florestasDensas = [[7, 24, -12, 24, 13], [7, -32, 10, 18, 12], [11, -26, 8, 30, 18], [11, 24, -8, 24, 15]].map(([ki, dx, dy, rx, ry], j) =>
  prende(bolha(R[ki][1] + dx, R[ki][2] + dy, rx, ry, 720 + j, 0.35), ki, 8));
const rachas = []; { const poly = cam(1); for (let gx = R[1][1] - 80; gx < R[1][1] + 80; gx += 7) for (let gy = R[1][2] - 60; gy < R[1][2] + 60; gy += 7) {
  let p = [gx + 5 * hash(gx, gy), gy + 5 * hash(gy, gx)]; if (!dentro(p, poly) || hash(gx + 1, gy) < 0.3) continue; let a = hash(gx, gy + 3) * 6.28; const pts = [p];
  for (let k = 0; k < 3; k++) { a += (hash(gx + k, gy) - 0.5) * 1.8; p = [p[0] + Math.cos(a) * 2.4, p[1] + Math.sin(a) * 2.4]; if (!dentro(p, poly)) break; pts.push(p); }
  if (pts.length > 2) rachas.push(pts); } }
const vapores = []; const fumarola = (x, y, n, seed) => { for (let j = 0; j < n; j++) { const h = hash(seed, j);
  const bx = x + (h - 0.5) * 9, by = y + (hash(j, seed) - 0.5) * 6, alt = 9 + 7 * h, inc = 0.35 + 0.3 * hash(seed, j + 9), L = [], Rr = [];
  for (let t = 0; t <= 1.0001; t += 0.05) { const cy = by + alt * t, cx = bx + inc * alt * t * t, w = 1.6 * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - 0.5 * t) + 0.25; L.push([cx - w, cy]); Rr.push([cx + w, cy]); }
  vapores.push([...L, ...Rr.reverse()]); } };
[[12, -30, 0], [12, 20, -25], [12, 10, 30], [6, -28, 12], [6, 26, -10], [8, 30, 0], [8, -40, 6], [4, 30, 30], [1, -40, -12], [9, 10, 10], [3, 20, -14], [0, -10, 8], [10, -30, 0], [5, 0, -20]]
  .forEach(([ki, dx, dy], j) => { const p = [R[ki][1] + dx, R[ki][2] + dy]; if (dentro(p, cam(ki))) fumarola(p[0], p[1], 2 + (j % 3), 900 + j); });
const fendas = []; const foraDaBorda = p => !bordas.some(pl => dentro(p, pl));
for (let gx = 4; gx < W; gx += 13) for (let gy = 4; gy < H; gy += 13) { const h1 = hash(gx, gy), h2 = hash(gy, gx + 7);
  let p = [gx + 10 * h1, gy + 10 * h2]; if (!foraDaBorda(p) || h1 < 0.25) continue; let a = h2 * Math.PI * 2; const pts = [p];
  for (let k = 0; k < 3 + Math.floor(h1 * 4); k++) { a += (hash(gx + k, gy - k) - 0.5) * 1.6; p = [p[0] + Math.cos(a) * 3.2, p[1] + Math.sin(a) * 3.2];
    if (!foraDaBorda(p) || p[0] < 0 || p[1] < 0 || p[0] > W || p[1] > H) break; pts.push(p); }
  if (pts.length > 2) fendas.push(pts); }
const estrada = eixos.flat(); // não vai ao .cdr (caminhos moram no app)

const r2 = a => a.map(p => [+p[0].toFixed(2), +p[1].toFixed(2)]);
fs.writeFileSync(new URL('../../tagmar/infernal-bloco2.json', import.meta.url), JSON.stringify({
  bordas: bordas.map(r2), reinos: reinos.map(k => ({ nome: k.nome, pts: r2(k.pts), pecas: k.pecas.map(r2) })), becos: [], mares: [],
  rios: rios.map(m => ({ nome: m.nome, pts: r2(m.pts) })), lagos: lagos.map(m => ({ nome: m.nome, pts: r2(m.pts) })), lodo: lodo.map(r2), estrada: r2(estrada),
  fendas: fendas.map(r2), fronteiras: fronteiras.map(r2), deserto: { borda: r2(deserto.borda), meio: r2(deserto.meio), centro: r2(deserto.centro) },
  florestas: florestas.map(r2), florestasDensas: florestasDensas.map(r2), rachas: rachas.map(r2), vapores: vapores.map(r2),
  montanhas: montanhas.map(m => ({ base: r2(m.base), topo: r2(m.topo), sombra: r2(m.sombra), luz: r2(m.luz) })),
  vulcoes: vulcoes.map(v => ({ cone: r2(v.cone), sombra: r2(v.sombra), boca: r2(v.boca) })),
  cratera: { borda: r2(cratera.borda), fundo: r2(cratera.fundo), sombra: r2(cratera.sombra) }, planalto: { topo: r2(planalto.topo), escarpa: r2(planalto.escarpa) } }));
const path = (pts, z = 'Z') => 'M' + pts.map(p => `${p[0].toFixed(1)},${(H - p[1]).toFixed(1)}`).join('L') + z;
const P = (list, attrs, z) => list.map(p => `<path d="${path(p, z)}" ${attrs}/>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="1500" height="1193"><rect width="${W}" height="${H}" fill="#3e342e"/>
${P(fendas, 'fill="none" stroke="#2a221e" stroke-width="0.5"', '')}${P(bordas, 'fill="#1e1512"')}${P(reinos.flatMap(k => k.pecas), 'fill="#9c6a55"')}
${P([deserto.borda], 'fill="#b08a62"')}${P([deserto.meio], 'fill="#c49e70"')}${P([deserto.centro], 'fill="#d4b080"')}
${P(florestas, 'fill="#6e5440"')}${P(florestasDensas, 'fill="#4e3a2e"')}${P(rachas, 'fill="none" stroke="#6e4a3c" stroke-width="0.4"', '')}
${P(lagos.map(l => l.pts), 'fill="#22343c" stroke="#5a7a86" stroke-width="0.5"')}${P(lodo, 'fill="#343c20"')}
${P([planalto.escarpa], 'fill="#3c2418" opacity="0.7"')}${P([planalto.topo], 'fill="#b4885a"')}
${P([cratera.borda], 'fill="#6e625a"')}${P([cratera.fundo], 'fill="#2a2220"')}${P([cratera.sombra], 'fill="#120c0b" opacity="0.5"')}
${P(montanhas.map(m => m.sombra), 'fill="#1a0e0b" opacity="0.55"')}${P(montanhas.map(m => m.base), 'fill="#60423a"')}${P(montanhas.map(m => m.topo), 'fill="#8c644e"')}${P(montanhas.map(m => m.luz), 'fill="#d2a078" opacity="0.5"')}
${P(vulcoes.map(v => v.sombra), 'fill="#120a08" opacity="0.6"')}${P(vulcoes.map(v => v.cone), 'fill="#3a2620"')}${P(vulcoes.map(v => v.boca), 'fill="#ff7a1e"')}
${P(rios.map(r => r.pts), 'fill="none" stroke="#f06e1e" stroke-width="1.4"', '')}${P(vapores, 'fill="#d8ccc0" opacity="0.4"')}
${P(fronteiras, 'fill="none" stroke="#3a2a24" stroke-width="0.45" stroke-dasharray="1.8 1.3"', '')}</svg>`;
fs.writeFileSync(new URL('../../tagmar/infernal-bloco2.svg', import.meta.url), svg);
console.log(`menor distância entre reinos não consecutivos: ${menor.toFixed(1)} mm (${par}); pontos de borda fora da página: ${fora}`);
