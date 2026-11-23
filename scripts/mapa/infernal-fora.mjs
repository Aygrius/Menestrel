/* AS MONTANHAS EM VOLTA DO PLANO INFERNAL NO APP (23/11/2026)
 *
 *   node scripts/mapa/infernal-fora.mjs      (depois: node scripts/mapa/infernal-app.mjs)
 *
 * Usuário: "Quero que o resto seja preenchido com montanhas." O desenho do plano (750 × 596,3 mm)
 * fica no meio de uma tela de 1500 × 1192,6 mm (a régua do mapa material); este gerador enche o
 * resto com o MESMO tipo de montanha das montanhas externas do desenho (infernal-relevo.mjs, modo
 * montanhasFora): picos de tipos sorteados — cone, crista, maciço, mesa —, contrafortes, sombreado
 * com luz do noroeste, quatro sombras, luz e três cumes. Grade de 1,25 mm (o dobro da do desenho):
 * é a área vista de longe, e o arquivo do app não pode ficar enorme.
 * Saída: tagmar/infernal-fora.svg — os caminhos em mm, y para baixo, na tela inteira. O miolo
 * (onde está o desenho) fica de fora, com 40 mm de sobra para dentro, que o app esmaece por baixo
 * da borda do desenho.
 */
import fs from 'node:fs';

const W = 1500, H = 1192.6, IW = 750, IH = 596.3, X0 = (W - IW) / 2, Y0 = (H - IH) / 2, SOBRA = 40;
const G = 1.25, nx = Math.ceil(W / G) + 1, ny = Math.ceil(H / G) + 1, N = nx * ny;
const hash = (i, j) => { let h = (i * 374761393 + j * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const sm0 = t => t * t * (3 - 2 * t);
const vnoise = (x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = sm0(x - i), fy = sm0(y - j);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
  return (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy) * 2 - 1; };
const fbm = (x, y, s, oct = 4) => { let v = 0, amp = 1, f = 1, n = 0; for (let o = 0; o < oct; o++) { v += amp * vnoise(x * f + s, y * f - s); n += amp; amp *= 0.5; f *= 2.1; } return v / n; };

// miolo: o retângulo do desenho menos a sobra; ali não se desenha nada
const miolo = (x, y) => x > X0 + SOBRA && x < X0 + IW - SOBRA && y > Y0 + SOBRA && y < Y0 + IH - SOBRA;

// ── picos (mesma receita de novoPico/carimba em infernal-relevo.mjs, longe da terra: fundo = 1) ──
const picos = [];
const novoPico = (x, y, r, h, k) => { const t = hash(k, 910), rot = hash(k, 911) * Math.PI;
  const tipo = t < 0.3 ? 'cone' : t < 0.68 ? 'crista' : t < 0.88 ? 'macico' : 'mesa';
  const base = { r, h, rot, seed: k % 997, freq: 2.5 + 5 * hash(k, 912), prof: 0.45 + 0.45 * hash(k, 913),
    expo: 0.7 + 0.9 * hash(k, 914), neve: (hash(k, 915) - 0.5) * 0.22, ax: 1, mesa: 0 };
  if (tipo === 'cone') picos.push({ ...base, ax: 1 + 0.4 * hash(k, 916) });
  else if (tipo === 'crista') picos.push({ ...base, ax: 2 + 2.2 * hash(k, 916), r: r * 1.15, freq: base.freq * 1.4 });
  else if (tipo === 'mesa') picos.push({ ...base, h: h * 0.8, mesa: 0.35 + 0.25 * hash(k, 917), prof: base.prof * 0.6, ax: 1 + 0.8 * hash(k, 916) });
  else { const n = 2 + ((hash(k, 918) * 3) | 0), ca = Math.cos(rot), sa = Math.sin(rot);
    for (let m = 0; m < n; m++) { const d = (m - (n - 1) / 2) * r * 0.55 + (hash(k + m, 919) - 0.5) * r * 0.3, lado = (hash(k + m, 920) - 0.5) * r * 0.4;
      picos.push({ ...base, r: r * (0.55 + 0.25 * hash(k + m, 921)), h: h * (0.75 + 0.3 * hash(k + m, 922)), ax: 1 + 0.6 * hash(k + m, 923),
        rot: rot + (hash(k + m, 924) - 0.5), seed: (k * 5 + m) % 997, x: x + d * ca - lado * sa, y: y + d * sa + lado * ca }); } return; }
  picos.at(-1).x = x; picos.at(-1).y = y; };
// massa: serras e terras mais baixas numa escala de ~160 mm (sem ela, a tela inteira vira um tapete igual)
const massa = (x, y) => Math.min(1, Math.max(0, (fbm(x / 160, y / 160, 77, 3) + 0.35) / 0.7));
for (let gy = -34; gy < H + 34; gy += 34) for (let gx = -34; gx < W + 34; gx += 34) {
  const x = gx + 34 * hash(gx | 0, (gy | 0) + 900), y = gy + 34 * hash(gy | 0, (gx | 0) + 901);
  if (miolo(x, y) && x > X0 + 60 && x < X0 + IW - 60 && y > Y0 + 60 && y < Y0 + IH - 60) continue;
  const i = Math.round(x / G), j = Math.round(y / G);
  const m = massa(x, y);
  novoPico(x, y, 30 + 20 * hash(i, j + 902) + 10 * m, (0.5 + 0.45 * hash(i + 3, j + 903)) * (0.5 + 0.7 * m), i * 7 + j * 131 + 20000);
}
const Hf = new Float32Array(N), Nf = new Float32Array(N);
const carimba = (p) => { const R = p.r * 1.5 * Math.sqrt(p.ax), i0 = Math.max(0, Math.floor((p.x - R) / G)), i1 = Math.min(nx - 1, Math.ceil((p.x + R) / G)),
    j0 = Math.max(0, Math.floor((p.y - R) / G)), j1 = Math.min(ny - 1, Math.ceil((p.y + R) / G)), ca = Math.cos(p.rot), sa = Math.sin(p.rot), sq = Math.sqrt(p.ax);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const o = j * nx + i;
    const dx = i * G - p.x, dy = j * G - p.y, u = (dx * ca + dy * sa) / sq, w = (-dx * sa + dy * ca) * sq, ang = Math.atan2(w, u);
    const rr = Math.hypot(u, w) * (1 + 0.25 * fbm(Math.cos(ang) * 1.5 + p.seed, Math.sin(ang) * 1.5, p.seed, 2));
    const t = Math.max(0, 1 - rr / p.r); if (!t) continue;
    const crist = 1 - Math.min(1, Math.abs(fbm(ang * p.freq + p.seed, rr / 9, p.seed + 1, 3)) * 2.6), sulcos = 1 - Math.sqrt(1 - t) * p.prof * (1 - crist * crist);
    const perfil = p.mesa ? Math.min(1, t / p.mesa) ** 0.6 : Math.pow(t, p.expo) * 0.75 + 0.25 * t * t;
    const v = p.h * perfil * sulcos;
    if (v > Hf[o]) { Hf[o] = Math.max(v, Hf[o] + 0.25 * (v - Hf[o])); Nf[o] = p.neve; } else Hf[o] += 0.1 * v; } };
picos.forEach(carimba);
// vãos: picos menores onde ficou liso
for (let gy = 0; gy < H; gy += 8) for (let gx = 0; gx < W; gx += 8) {
  const i = Math.round(gx / G), j = Math.round(gy / G); if (i >= nx || j >= ny) continue; const o = j * nx + i;
  if (miolo(gx, gy) || Hf[o] > 0.12) continue;
  const n0 = picos.length; novoPico(gx, gy, 12 + 8 * hash(i, j + 906), (0.35 + 0.25 * hash(i, j + 907)) * (0.6 + 0.5 * massa(gx, gy)), i * 13 + j * 71 + 25000);
  picos.slice(n0).forEach(carimba); }

// ── sombreado (luz do noroeste; o y daqui já é o do SVG, para baixo) ──
const blur = (A, n) => { let a = A; for (let k = 0; k < n; k++) { const b = new Float32Array(N);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { let s = 0, c = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue; s += a[jj * nx + ii]; c++; }
    b[j * nx + i] = s / c; } a = b; } return a; };
const Hs = blur(Hf, 1);
const LX = -1, LY = -1, LZ = 1.1, LN = Math.hypot(LX, LY, LZ), s0 = LZ / LN, Z = 14;
const luz = new Float32Array(N);
for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) { const o = j * nx + i;
  const gx = (Hs[o + 1] - Hs[o - 1]) / (2 * G) * Z, gy = (Hs[o + nx] - Hs[o - nx]) / (2 * G) * Z;
  const n = Math.hypot(gx, gy, 1); luz[o] = ((-gx * LX - gy * LY + LZ) / (n * LN)) - s0; }
const luzS = blur(luz, 2);   // 2 células de 1,25 mm ≈ as 4 de 0,625 do desenho
const manchaCume = new Float32Array(N); for (let o = 0; o < N; o++) manchaCume[o] = 0.12 * (fbm((o % nx) * G / 6, ((o / nx) | 0) * G / 6, 611, 3) - 0.5) + Nf[o];

const curvas = (F) => { const seg = new Map(), key = p => `${p[0].toFixed(3)},${p[1].toFixed(3)}`, lista = [];
  const it = (a, b, va, vb) => { const t = va / (va - vb); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const v = [F[j * nx + i], F[j * nx + i + 1], F[(j + 1) * nx + i + 1], F[(j + 1) * nx + i]];
    if (v[0] <= 0 && v[1] <= 0 && v[2] <= 0 && v[3] <= 0) continue; if (v[0] > 0 && v[1] > 0 && v[2] > 0 && v[3] > 0) continue;
    const p = [[i * G, j * G], [(i + 1) * G, j * G], [(i + 1) * G, (j + 1) * G], [i * G, (j + 1) * G]], e = [];
    for (let k = 0; k < 4; k++) { const a = k, b = (k + 1) % 4; if ((v[a] > 0) !== (v[b] > 0)) e.push(it(p[a], p[b], v[a], v[b])); }
    if (e.length === 2) lista.push([e[0], e[1]]); else if (e.length === 4) { lista.push([e[0], e[1]]); lista.push([e[2], e[3]]); } }
  for (const [a, b] of lista) for (const [p, q] of [[a, b], [b, a]]) { const k = key(p); if (!seg.has(k)) seg.set(k, []); seg.get(k).push(q); }
  const usado = new Set(), polys = [];
  for (const [a, b] of lista) { const k0 = key(a) + '|' + key(b); if (usado.has(k0)) continue; const poly = [a]; let cur = b; usado.add(k0); usado.add(key(b) + '|' + key(a));
    while (key(cur) !== key(a) && poly.length < 100000) { poly.push(cur); const nxt = (seg.get(key(cur)) || []).find(n => !usado.has(key(cur) + '|' + key(n)));
      if (!nxt) break; usado.add(key(cur) + '|' + key(nxt)); usado.add(key(nxt) + '|' + key(cur)); cur = nxt; }
    if (key(cur) === key(a)) polys.push(poly); }
  return polys; };
const area = p => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; };
const chaikin = (p) => { const o = []; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length];
  o.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]); } return o; };
const enxuga = (p, d) => { const out = [p[0]]; for (const q of p) { const l = out.at(-1); if (Math.hypot(q[0] - l[0], q[1] - l[1]) >= d) out.push(q); } return out; };
// campo: fora do miolo e da moldura da tela (curvas fechadas)
const campo = (fn) => { const F = new Float32Array(N); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const o = j * nx + i;
  F[o] = !i || !j || i === nx - 1 || j === ny - 1 || miolo(i * G, j * G) ? -1 : fn(o); } return F; };
const faixa = (f, minA = 6) => curvas(f).filter(p => Math.abs(area(p)) > minA).map(p => enxuga(chaikin(p), 1.6));

const CAMADAS = [
  ['sombra1', o => -luzS[o] - 0.04, 'fill="#52645B" opacity=".16"'],
  ['sombra2', o => -luzS[o] - 0.16, 'fill="#4A5A51" opacity=".22"'],
  ['sombra3', o => -luzS[o] - 0.32, 'fill="#3F4F47" opacity=".28"'],
  ['sombra4', o => -luzS[o] - 0.5, 'fill="#2E3A34" opacity=".30"'],
  ['luz', o => luzS[o] - 0.1, 'fill="#FFFFFF" opacity=".40"'],
  ['cume1', o => Hs[o] + manchaCume[o] - 0.38, 'fill="#DCE4D4" opacity=".65"'],
  ['cume2', o => Hs[o] + manchaCume[o] - 0.47, 'fill="#E9EAE2" opacity=".75"'],
  ['cume3', o => Math.min(Hs[o] + manchaCume[o] - 0.53, luzS[o] + 0.04), 'fill="#FFFFFF" opacity=".90"'],
];
// relativo, em décimos de mm arredondados (o arquivo cai à metade): l dx dy acumulando o erro
const d = p => { let s = '', px = 0, py = 0; p.forEach((q, k) => { const x = Math.round(q[0] * 10) / 10, y = Math.round(q[1] * 10) / 10;
  s += k ? `l${+(x - px).toFixed(1)} ${+(y - py).toFixed(1)}` : `M${x} ${y}`; px = x; py = y; }); return s + 'z'; };
let corpo = '', conta = [];
for (const [nome, fn, attrs] of CAMADAS) { const f = faixa(campo(fn)); conta.push(`${nome}=${f.length}`);
  corpo += `<path d="${f.map(d).join('')}" fill-rule="evenodd" ${attrs}/>`; }
fs.writeFileSync(new URL('../../tagmar/infernal-fora.svg', import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#F2E6C6"/>${corpo}</svg>`);
console.log(`tagmar/infernal-fora.svg: ${(corpo.length / 1024).toFixed(0)} KB; ${picos.length} picos; ${conta.join(' ')}`);
