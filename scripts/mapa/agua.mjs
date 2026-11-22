/* A GRADE DE ÁGUA DO MAPA (22/11/2026)
 *
 *   node scripts/mapa/agua.mjs
 *
 * Usuário: "Adicione também Navegando x km x dias". Para medir a viagem de
 * barco, o mapa precisa saber onde há água. Este script lê o desenho
 * (public/mapa/tagmar.svg) e grava public/mapa/agua.json: uma grade de
 * CEL unidades por célula, 1 = água. Terra é toda forma preenchida dos grupos
 * "base" (os continentes, de várias cores, com os lagos como buracos) e
 * "ilhas"; água é o resto, mais o que o grupo "rios" pinta de #83D6EA por
 * cima (lagos e rios largos). Rios finos (só traço) não contam.
 *
 * Rodar de novo sempre que o mapa for exportado do Corel.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const CEL = 10;   // unidades do mapa por célula (~11 km)
const svg = readFileSync('public/mapa/tagmar.svg', 'utf8');
const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
const L = +vb[1], A = +vb[2];
const NX = Math.ceil(L / CEL), NY = Math.ceil(A / CEL);

const grupo = (id) => { const i = svg.indexOf(`<g id="${id}">`); return i < 0 ? '' : svg.slice(i, svg.indexOf('</g>', i)); };
const caminhos = (g, fill) => [...g.matchAll(/<path ([^>]*?)d="([^"]+)"/g)].filter((m) => (m[1].match(/fill="([^"]*)"/) || [])[1] === fill).map((m) => m[2]);

// O "d" que o exportador escreve (scripts do Corel): m, l, c e z relativos.
function poligonos(d, minPontos = 3) {
  const tk = d.match(/[mlcz]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/gi);
  const subs = []; let cur = null, x = 0, y = 0, x0 = 0, y0 = 0, cmd = '', i = 0;
  const num = () => +tk[i++];
  while (i < tk.length) {
    if (/[mlcz]/i.test(tk[i])) { cmd = tk[i++]; if (cmd === 'z' || cmd === 'Z') { x = x0; y = y0; cur = null; continue; } }
    if (cmd === 'm') { x += num(); y += num(); x0 = x; y0 = y; cur = [[x, y]]; subs.push(cur); cmd = 'l'; }
    else if (cmd === 'l') { x += num(); y += num(); cur.push([x, y]); }
    else if (cmd === 'c') {
      const c1 = [x + num(), y + num()], c2 = [x + num(), y + num()], p = [x + num(), y + num()];
      for (const t of [0.25, 0.5, 0.75]) { const u = 1 - t;
        cur.push([u * u * u * x + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p[0], u * u * u * y + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p[1]]); }
      x = p[0]; y = p[1]; cur.push([x, y]);
    } else i++;
  }
  return subs.filter((s) => s.length >= minPontos);
}
// Os subcaminhos de um traço (abertos): a mesma leitura, aceitando os de 2 pontos.
const poligonosAbertos = (d) => poligonos(d, 2);

/* OS CANAIS FINOS (22/11/2026): o canal que liga o mar ao Lago Denégrio, perto de
   Saravossa, é mais estreito que a célula, e o centro dela caía em terra. Cada
   célula é olhada em SUB×SUB pontos; basta um ser água para ela ser água. */
const SUB = 4, FX = NX * SUB, FY = NY * SUB, FC = CEL / SUB;
// Pinta (par-ímpar) os pontos da grade fina cobertos pelos polígonos de um "d".
function pinta(d, grade, valor) {
  const arestas = [];
  for (const s of poligonos(d)) for (let k = 0; k < s.length; k++) arestas.push([s[k], s[(k + 1) % s.length]]);
  for (let j = 0; j < FY; j++) {
    const cy = (j + 0.5) * FC, xs = [];
    for (const [[x1, y1], [x2, y2]] of arestas) if ((y1 > cy) !== (y2 > cy)) xs.push(x1 + (cy - y1) * (x2 - x1) / (y2 - y1));
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil(xs[k] / FC - 0.5)), i1 = Math.min(FX - 1, Math.floor(xs[k + 1] / FC - 0.5));
      for (let i = i0; i <= i1; i++) grade[j * FX + i] = valor;
    }
  }
}

const fina = new Uint8Array(FX * FY).fill(1);
const todos = (g) => [...g.matchAll(/<path ([^>]*?)d="([^"]+)"/g)].filter((m) => !/fill="(none|#83D6EA)"/.test(m[1])).map((m) => m[2]);
for (const d of [...todos(grupo('base')), ...todos(grupo('ilhas'))]) {
  const terra = new Uint8Array(FX * FY); pinta(d, terra, 1);
  for (let k = 0; k < terra.length; k++) if (terra[k]) fina[k] = 0;
}
for (const d of caminhos(grupo('rios'), '#83D6EA')) pinta(d, fina, 1);
const agua = new Uint8Array(NX * NY);
for (let j = 0; j < FY; j++) for (let i = 0; i < FX; i++) if (fina[j * FX + i]) agua[Math.floor(j / SUB) * NX + Math.floor(i / SUB)] = 1;

/* OS RIOS NAVEGÁVEIS (22/11/2026, usuário: "O Lago Denégrio não é fechado, dá pra
   ir de Saravossa até o rio Belrra"). Os rios são só traço no desenho; o traço
   com espessura a partir de RIO_MIN vira água célula a célula, e assim os lagos
   se ligam ao mar pelos rios. */
const RIO_MIN = +(process.env.RIO_MIN || 0.9);
for (const m of grupo('rios').matchAll(/<path ([^>]*?)d="([^"]+)"/g)) {
  const w = +((m[1].match(/stroke-width="([^"]*)"/) || [])[1] || 0);
  if (!/fill="none"/.test(m[1]) || w < RIO_MIN) continue;
  for (const s of poligonosAbertos(m[2])) for (let k = 1; k < s.length; k++) {
    const [x1, y1] = s[k - 1], [x2, y2] = s[k], n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / (CEL / 4)));
    for (let q = 0; q <= n; q++) { const i = Math.floor((x1 + (x2 - x1) * q / n) / CEL), jj = Math.floor((y1 + (y2 - y1) * q / n) / CEL); if (i >= 0 && jj >= 0 && i < NX && jj < NY) agua[jj * NX + i] = 1; }
  }
}

// 1 bit por célula, em base64
const bytes = new Uint8Array(Math.ceil(NX * NY / 8));
for (let k = 0; k < agua.length; k++) if (agua[k]) bytes[k >> 3] |= 1 << (k & 7);
writeFileSync('public/mapa/agua.json', JSON.stringify({ cel: CEL, nx: NX, ny: NY, bits: Buffer.from(bytes).toString('base64') }));
const n = agua.reduce((s, v) => s + v, 0);
console.log(`grade ${NX}×${NY}, água ${(100 * n / agua.length).toFixed(1)}%, ${Math.round(Buffer.from(bytes).toString('base64').length / 1024)} KB`);
