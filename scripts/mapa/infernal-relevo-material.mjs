// AS MONTANHAS DO PLANO MATERIAL NO PLANO INFERNAL (23/11/2026)
// Usuário: "Porque você não faz igual no arquivo corel do mapa do plano material?" — escolheu
// reaproveitar o próprio desenho do material. As sete camadas de relevo de public/mapa/tagmar.svg
// (o export do mapa.cdr; o .cdr não é tocado) são recortadas em janelas onde a serra é mais densa e
// carimbadas nas células de um Voronoi que cobre a página do inferno, cada uma girada/espelhada para
// a repetição não aparecer. A terra dos reinos é desenhada por cima, então o relevo só fica na rocha.
import fs from 'node:fs';

const UNID = 5905.5 / 1500;                 // unidades do SVG material por mm
const ESTILOS = [                            // a ordem e as cores do grupo "relevo" do material
  ['#DCE4D4', 0.65], ['#E9EAE2', 0.75], ['#FFFFFF', 0.9], ['#FFFFFF', 0.4],
  ['#52645B', 0.12], ['#52645B', 0.16], ['#3F4F47', 0.2],
];

// caminho só com m/l/z relativos (é o que o export do Corel produz) → polígonos em mm, y para baixo
function poligonos(d) {
  const out = []; let cur = [0, 0], ini = [0, 0], poly = null, cmd = '';
  const re = /([mlzMLZ])|(-?\d*\.?\d+(?:e-?\d+)?)/g; let m, num = [];
  const fecha = () => { if (poly && poly.length > 2) out.push(poly.map(([x, y]) => [x / UNID, y / UNID])); poly = null; };
  const ponto = (dx, dy) => { cur = [cur[0] + dx, cur[1] + dy];
    if (cmd === 'm') { fecha(); poly = [cur]; ini = cur; cmd = 'l'; } else poly.push(cur); };
  while ((m = re.exec(d))) {
    if (m[1]) { const c = m[1]; if (c === 'z' || c === 'Z') { fecha(); cur = ini; cmd = ''; } else cmd = c.toLowerCase(); continue; }
    num.push(+m[2]); if (num.length === 2) { ponto(num[0], num[1]); num = []; }
  }
  fecha(); return out;
}

export function relevoDoMaterial({ W, H, hash, fbm, terraEm }) {
  const svg = fs.readFileSync(new URL('../../public/mapa/tagmar.svg', import.meta.url), 'utf8');
  const i0 = svg.indexOf('<g id="relevo"'), i1 = svg.indexOf('</g>', i0), grupo = svg.slice(i0, i1);
  const camadas = ESTILOS.map(() => []);
  [...grupo.matchAll(/<path fill="([^"]+)" opacity="([^"]+)" d="([^"]*)"/g)].forEach(([, cor, op, d]) => {
    const k = ESTILOS.findIndex(([c, o]) => c === cor && Math.abs(o - +op) < 0.001); if (k >= 0) camadas[k].push(...poligonos(d)); });
  const caixa = p => { let a = 1e9, b = 1e9, c = -1e9, e = -1e9; for (const [x, y] of p) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); e = Math.max(e, y); } return [a, b, c, e]; };
  const caixas = camadas.map(l => l.map(caixa));

  // densidade da serra (área das sombras) numa grade de 10 mm do mapa material (1500 × 1192,6 mm)
  const GD = 10, gx = 150, gy = 120, dens = new Float32Array(gx * gy);
  [4, 5, 6].forEach(k => caixas[k].forEach(([a, b, c, e]) => { const i = Math.min(gx - 1, ((a + c) / 2 / GD) | 0), j = Math.min(gy - 1, ((b + e) / 2 / GD) | 0); dens[j * gx + i] += (c - a) * (e - b); }));
  // janelas de 300 × 240 mm onde a serra cobre mais; escolhidas sem sobrepor muito
  const JW = 200, JH = 200, jw = JW / GD, jh = JH / GD, janelas = [];
  const soma = (i, j) => { let s = 0; for (let b = j; b < j + jh; b++) for (let a = i; a < i + jw; a++) s += dens[b * gx + a]; return s; };
  const cand = []; for (let j = 0; j + jh <= gy; j += 2) for (let i = 0; i + jw <= gx; i += 2) cand.push([soma(i, j), i * GD, j * GD]);
  cand.sort((p, q) => q[0] - p[0]);
  for (const [s, x, y] of cand) { if (janelas.length >= 2) break;
    if (janelas.every(([, a, b]) => Math.abs(a - x) > JW * 0.6 || Math.abs(b - y) > JH * 0.6)) janelas.push([s, x, y]); }

  // células: Voronoi de sementes numa grade 4 × 3 com jitter, recortado na página
  const NC = 6, NR = 5, sementes = []; for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++)
    sementes.push([(c + 0.5) * W / NC + (hash(c, r + 40) - 0.5) * 40, (r + 0.5) * H / NR + (hash(r, c + 41) - 0.5) * 30]);
  const corta = (poly, p, n) => { const out = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length];
      const da = (a[0] - p[0]) * n[0] + (a[1] - p[1]) * n[1], db = (b[0] - p[0]) * n[0] + (b[1] - p[1]) * n[1];
      if (da <= 0) out.push(a); if ((da <= 0) !== (db <= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } } return out; };
  const celulas = sementes.map((s, i) => { let poly = [[0, 0], [W, 0], [W, H], [0, H]];
    sementes.forEach((q, j) => { if (i === j) return; const mid = [(s[0] + q[0]) / 2, (s[1] + q[1]) / 2], n = [q[0] - s[0], q[1] - s[1]]; poly = corta(poly, mid, n); });
    // divisa ondulada: o mesmo campo de deslocamento nos dois lados, então as células continuam encaixadas
    const out = []; for (let k = 0; k < poly.length; k++) { const a = poly[k], b = poly[(k + 1) % poly.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2));
      for (let t = 0; t < n; t++) { const p = [a[0] + (b[0] - a[0]) * t / n, a[1] + (b[1] - a[1]) * t / n];
        const borda = Math.min(p[0], p[1], W - p[0], H - p[1]) < 0.5;
        out.push(borda ? p : [p[0] + 8 * fbm(p[0] / 25, p[1] / 25, 131, 3), p[1] + 8 * fbm(p[0] / 25, p[1] / 25, 137, 3)]); } }
    return out; });

  /* AS SERRAS SEGUEM OS CANAIS. A distância à terra (grade de 2 mm) dá, pelo gradiente, a direção de cada
     canal de rocha; a serra corre perpendicular a ele (ao longo do canal). Cada janela do material tem a
     sua direção dominante (PCA dos polígonos de sombra, ângulo dobrado); o carimbo gira para casar as duas. */
  const G2 = 2, mx = Math.ceil(W / G2) + 1, my = Math.ceil(H / G2) + 1, dT = new Float32Array(mx * my).fill(1e9);
  for (let j = 0; j < my; j++) for (let i = 0; i < mx; i++) if (terraEm(i * G2, H - j * G2)) dT[j * mx + i] = 0;
  for (let j = 1; j < my; j++) for (let i = 1; i < mx - 1; i++) { const o = j * mx + i; dT[o] = Math.min(dT[o], dT[o - 1] + G2, dT[o - mx] + G2, dT[o - mx - 1] + G2 * 1.414, dT[o - mx + 1] + G2 * 1.414); }
  for (let j = my - 2; j >= 0; j--) for (let i = mx - 2; i > 0; i--) { const o = j * mx + i; dT[o] = Math.min(dT[o], dT[o + 1] + G2, dT[o + mx] + G2, dT[o + mx + 1] + G2 * 1.414, dT[o + mx - 1] + G2 * 1.414); }
  const rumoCanal = (x, y) => { let sx = 0, sy = 0; for (let dy = -10; dy <= 10; dy += 2) for (let dx = -10; dx <= 10; dx += 2) {
      const i = Math.max(1, Math.min(mx - 2, Math.round((x + dx) / G2))), j = Math.max(1, Math.min(my - 2, Math.round((y + dy) / G2))), o = j * mx + i;
      const gx2 = dT[o + 1] - dT[o - 1], gy2 = dT[o + mx] - dT[o - mx], n = Math.hypot(gx2, gy2); if (!n || dT[o] > 1e8) continue;
      const a = Math.atan2(gy2, gx2) + Math.PI / 2; sx += Math.cos(2 * a); sy += Math.sin(2 * a); }
    return Math.atan2(sy, sx) / 2; };
  const rumoJanela = janelas.map(([, jx, jy]) => { let sx = 0, sy = 0;
    camadas[4].forEach((p, n) => { const [a, b, c, e] = caixas[4][n]; if (!(c > jx && a < jx + JW && e > jy && b < jy + JH)) return;
      let mx2 = 0, my2 = 0; for (const q of p) { mx2 += q[0]; my2 += q[1]; } mx2 /= p.length; my2 /= p.length;
      let xx = 0, yy = 0, xy = 0; for (const q of p) { const u = q[0] - mx2, v = q[1] - my2; xx += u * u; yy += v * v; xy += u * v; }
      const ang = 0.5 * Math.atan2(2 * xy, xx - yy), peso = (c - a) * (e - b); sx += peso * Math.cos(2 * ang); sy += peso * Math.sin(2 * ang); });
    return Math.atan2(sy, sx) / 2; });
  const toda = poly => poly.every(([x, y]) => terraEm(x, H - y));

  // cada célula recebe uma janela, girada de 0/90/180/270 e às vezes espelhada; o centro da janela vai
  // ao centro da célula. Só os polígonos que caem dentro da janela entram no carimbo.
  const carimbos = celulas.map((cel, i) => {
    if (toda(cel)) return { celula: cel, camadas: camadas.map(() => []) };   // célula toda em terra: nada a carimbar
    const q = (hash(i, 76) * janelas.length) | 0, [, jx, jy] = janelas[q], cx = jx + JW / 2, cy = jy + JH / 2;
    const esp = hash(i, 78) > 0.5 ? -1 : 1, s = sementes[i], src = esp < 0 ? Math.PI - rumoJanela[q] : rumoJanela[q];
    const ang = rumoCanal(s[0], s[1]) - src + (hash(i, 77) > 0.5 ? Math.PI : 0) + (hash(i, 79) - 0.5) * 0.3, ca = Math.cos(ang), sa = Math.sin(ang);
    const T = ([x, y]) => { const dx = (x - cx) * esp, dy = y - cy; return [s[0] + dx * ca - dy * sa, s[1] + dx * sa + dy * ca]; };
    const dentro = ([a, b, c, e]) => c > jx && a < jx + JW && e > jy && b < jy + JH;
    return { celula: cel, camadas: camadas.map((l, k) => l.filter((_, n) => dentro(caixas[k][n])).map(p => p.map(T))) };
  });

  // SVG (mm, y para baixo): cada carimbo recortado pela sua célula
  const d = p => 'M' + p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') + 'Z';
  const defs = celulas.map((c, i) => `<clipPath id="cel${i}"><path d="${d(c)}"/></clipPath>`).join('');
  const corpo = carimbos.map((c, i) => `<g clip-path="url(#cel${i})">${c.camadas.map((l, k) => l.length
    ? `<path fill="${ESTILOS[k][0]}" opacity="${ESTILOS[k][1]}" fill-rule="evenodd" d="${l.map(d).join('')}"/>` : '').join('')}</g>`).join('');
  return { svg: `<defs>${defs}</defs>${corpo}`, celulas, carimbos, janelas,
    conferencia: `material: ${camadas.map(l => l.length).join('/')} polígonos; janelas ${janelas.map(([s, x, y]) => `${x},${y}`).join(' ')}` };
}
