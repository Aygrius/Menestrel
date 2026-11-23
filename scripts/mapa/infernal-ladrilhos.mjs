/* O CHÃO INFERNAL EM LADRILHOS (23/11/2026)
 *
 *   node scripts/mapa/infernal-ladrilhos.mjs      (depois de infernal-app.mjs)
 *
 * Usuário: "o mapa do plano infernal está muito lento". O public/mapa/infernal.svg tem 6,4 MB
 * em poucos caminhos que cruzam a tela inteira: a cada zoom o navegador rasteriza cada pedaço
 * da tela percorrendo TODOS os traços. Aqui ele vira uma grade de COLS × LINHAS SVGs
 * (public/mapa/infernal/l{linha}c{coluna}.svg), cada um só com os subcaminhos cuja caixa toca o
 * ladrilho — o navegador só desenha os ladrilhos à vista, e cada um é leve.
 * Subcaminho que cruza a divisa vai para os dois lados (o viewBox corta o que sobra), e o furo
 * (evenodd) vai junto do contorno, porque a caixa do contorno contém a do furo. Cada ladrilho
 * transborda SOBRA unidades para cada lado, para não sobrar fresta entre eles com o zoom.
 * Tudo num <g opacity=".999">: o navegador repinta o SVG traço a traço, e na borda da imagem cada
 * camada translúcida levaria o seu meio-pixel — a borda sairia mais clara. O grupo achata antes.
 * A grade vai para MAPA_LADRILHOS.infernal em src/13-diario/mapa.jsx.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const aqui = dirname(fileURLToPath(import.meta.url));
const COLS = 10, LINHAS = 8, SOBRA = 2, CORTE = SOBRA + 1;   // o recorte passa 1 unidade da borda do ladrilho: a beira da imagem fica cheia
const fonte = readFileSync(join(aqui, '../../public/mapa/infernal.svg'), 'utf8');
const [, L, A] = fonte.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number);
const TW = L / COLS, TH = A / LINHAS;
const defs = (fonte.match(/<defs>[\s\S]*?<\/defs>/) || [''])[0];

// Os subcaminhos de um d (M absoluto, l/L/h/v relativos ou absolutos, z), cada um com a caixa.
function subcaminhos(d) {
  const out = []; let atual = null, x = 0, y = 0, x0 = 0, y0 = 0;
  const caixa = () => ({ x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity });
  const pega = (b) => { if (x < b.x1) b.x1 = x; if (y < b.y1) b.y1 = y; if (x > b.x2) b.x2 = x; if (y > b.y2) b.y2 = y; };
  const re = /([MmLlHhVvZz])([^MmLlHhVvZz]*)/g; let m;
  while ((m = re.exec(d))) {
    const c = m[1], n = (m[2].match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []).map(Number);
    if (c === 'M' || c === 'm') {
      if (atual) out.push(atual);
      x = c === 'M' ? n[0] : x + n[0]; y = c === 'M' ? n[1] : y + n[1]; x0 = x; y0 = y;
      atual = { d: m[0], b: caixa() }; pega(atual.b);
      for (let i = 2; i + 1 < n.length; i += 2) { x = c === 'M' ? n[i] : x + n[i]; y = c === 'M' ? n[i + 1] : y + n[i + 1]; pega(atual.b); }
      continue;
    }
    atual.d += m[0];
    if (c === 'Z' || c === 'z') { x = x0; y = y0; continue; }
    if (c === 'l') for (let i = 0; i + 1 < n.length; i += 2) { x += n[i]; y += n[i + 1]; pega(atual.b); }
    else if (c === 'L') for (let i = 0; i + 1 < n.length; i += 2) { x = n[i]; y = n[i + 1]; pega(atual.b); }
    else if (c === 'h') for (const v of n) { x += v; pega(atual.b); }
    else if (c === 'H') for (const v of n) { x = v; pega(atual.b); }
    else if (c === 'v') for (const v of n) { y += v; pega(atual.b); }
    else if (c === 'V') for (const v of n) { y = v; pega(atual.b); }
  }
  if (atual) out.push(atual);
  return out;
}

/* Lê o SVG como uma árvore rasa: <g transform> aninhados, <rect> e <path>. Cada path guarda
   a transformação acumulada (translate + scale, as únicas usadas) e os subcaminhos. */
const corpo = fonte.slice(fonte.indexOf('</defs>') + 7, fonte.lastIndexOf('</svg>'));
const raiz = { tag: 'raiz', filhos: [], t: { tx: 0, ty: 0, s: 1 } };
{
  const pilha = [raiz]; const re = /<(\/?)(g|rect|path)\b([^>]*?)(\/?)>/g; let m;
  while ((m = re.exec(corpo))) {
    const [, fecha, tag, attrs, so] = m, pai = pilha[pilha.length - 1];
    if (fecha) { pilha.pop(); continue; }
    if (tag === 'g') {
      const tr = (attrs.match(/transform="([^"]*)"/) || [, ''])[1];
      const t = { ...pai.t };
      const tl = tr.match(/translate\(([-\d.]+)[ ,]+([-\d.]+)\)/), sc = tr.match(/scale\(([-\d.]+)\)/);
      if (tl) { t.tx += +tl[1] * t.s; t.ty += +tl[2] * t.s; }
      if (sc) t.s *= +sc[1];
      const g = { tag, attrs, t, filhos: [] }; pai.filhos.push(g); if (!so) pilha.push(g);
    } else if (tag === 'rect') pai.filhos.push({ tag, attrs, t: pai.t });
    else {
      const d = (attrs.match(/ d="([^"]*)"/) || [, ''])[1];
      // opacity num path só = fill-opacity, sem a camada à parte que a opacity pede
      const resto = attrs.replace(/ d="[^"]*"/, '').replace(/ opacity="/, ' fill-opacity="');
      pai.filhos.push({ tag, resto, t: pai.t, subs: subcaminhos(d) });
    }
  }
}

const toca = (b, t, x1, y1, x2, y2) => b.x2 * t.s + t.tx >= x1 && b.x1 * t.s + t.tx <= x2 && b.y2 * t.s + t.ty >= y1 && b.y1 * t.s + t.ty <= y2;

/* O anel fechado recortado no retângulo (Sutherland–Hodgman): o retângulo é convexo, então
   recortar cada anel à parte guarda a paridade do evenodd dentro dele. */
function pontos(d) {
  const p = []; let x = 0, y = 0;
  for (const [, c, a, b] of d.matchAll(/([MLl])\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/g)) {
    if (c === 'l') { x += +a; y += +b; } else { x = +a; y = +b; }
    p.push([x, y]);
  }
  return p;
}
function recortar(p, x1, y1, x2, y2) {
  const lado = (pts, dentro, corta) => { const out = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], da = dentro(a), db = dentro(b);
      if (da) out.push(a); if (da !== db) out.push(corta(a, b)); }
    return out; };
  const emX = (x) => (a, b) => [x, a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0])];
  const emY = (y) => (a, b) => [a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]), y];
  let q = lado(p, (a) => a[0] >= x1, emX(x1));
  q = lado(q, (a) => a[0] <= x2, emX(x2));
  q = lado(q, (a) => a[1] >= y1, emY(y1));
  return lado(q, (a) => a[1] <= y2, emY(y2));
}
const anel = (p) => { let s = '', px = 0, py = 0;
  p.forEach(([x, y], i) => { const rx = Math.round(x * 10) / 10, ry = Math.round(y * 10) / 10;
    s += i ? `l${+(rx - px).toFixed(1)} ${+(ry - py).toFixed(1)}` : `M${rx} ${ry}`; px = rx; py = ry; });
  return s + 'z'; };

function emitir(no, x1, y1, x2, y2) {
  if (no.tag === 'rect') return `<rect${no.attrs}/>`;
  if (no.tag === 'path') {
    const subs = no.subs.filter((s) => toca(s.b, no.t, x1, y1, x2, y2));
    // contorno (rio seco, lava, fronteira tracejada): inteiro, para o traço e o tracejado não mudarem
    if (/stroke=/.test(no.resto)) { const d = subs.map((s) => s.d).join(''); return d ? `<path d="${d}"${no.resto}/>` : ''; }
    // área: cada anel recortado no ladrilho (em unidades do grupo)
    const t = no.t, e = CORTE - SOBRA, lx1 = (x1 - e - t.tx) / t.s, ly1 = (y1 - e - t.ty) / t.s, lx2 = (x2 + e - t.tx) / t.s, ly2 = (y2 + e - t.ty) / t.s;
    const d = subs.map((s) => { const b = s.b;
      if (b.x1 >= lx1 && b.x2 <= lx2 && b.y1 >= ly1 && b.y2 <= ly2) return s.d;   // inteiro dentro
      const q = recortar(pontos(s.d), lx1, ly1, lx2, ly2); return q.length > 2 ? anel(q) : ''; }).join('');
    return d ? `<path d="${d}"${no.resto}/>` : '';
  }
  const dentro = no.filhos.map((f) => emitir(f, x1, y1, x2, y2)).join('');
  return no.tag === 'raiz' ? dentro : (dentro ? `<g${no.attrs}>${dentro}</g>` : '');
}

const pasta = join(aqui, '../../public/mapa/infernal');
rmSync(pasta, { recursive: true, force: true }); mkdirSync(pasta, { recursive: true });
let total = 0, maior = 0;
for (let r = 0; r < LINHAS; r++) for (let c = 0; c < COLS; c++) {
  const x1 = c * TW - SOBRA, y1 = r * TH - SOBRA, x2 = (c + 1) * TW + SOBRA, y2 = (r + 1) * TH + SOBRA;
  const r2 = (v) => +v.toFixed(2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r2(x1)} ${r2(y1)} ${r2(x2 - x1)} ${r2(y2 - y1)}" preserveAspectRatio="none">${defs}<g opacity=".999">${emitir(raiz, x1, y1, x2, y2)}</g></svg>`;
  writeFileSync(join(pasta, `l${r}c${c}.svg`), svg);
  total += svg.length; maior = Math.max(maior, svg.length);
}
/* O FUNDO: o mapa inteiro em 2048 px (WebP), por baixo dos ladrilhos. Aparece na hora,
   enquanto eles chegam, e é o que se vê pela fresta de meio pixel entre dois deles. Desenhado
   pelo Chrome sem janela (o SVG num canvas, devolvido no DOM). */
{
  const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
  const tmp = join(tmpdir(), 'infernal-fundo.html'), svgUrl = pathToFileURL(join(aqui, '../../public/mapa/infernal.svg')).href;
  writeFileSync(tmp, `<html><body><pre id="o"></pre><script>const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=2048;c.height=Math.round(2048*${A}/${L});`
    + `c.getContext('2d').drawImage(i,0,0,c.width,c.height);document.getElementById('o').textContent=c.toDataURL('image/webp',0.86)};i.src=${JSON.stringify(svgUrl)};</script></body></html>`);
  const r = chrome && spawnSync(chrome, ['--headless=new', '--allow-file-access-from-files', '--virtual-time-budget=60000', '--dump-dom', pathToFileURL(tmp).href], { encoding: 'utf8', maxBuffer: 64 << 20 });
  const m = r && r.stdout && r.stdout.match(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/);
  if (m) { const b = Buffer.from(m[1], 'base64'); writeFileSync(join(aqui, '../../public/mapa/infernal-fundo.webp'), b); console.log(`public/mapa/infernal-fundo.webp: ${(b.length / 1024).toFixed(0)} KB`); }
  else console.warn('Sem Chrome ou Edge: public/mapa/infernal-fundo.webp NÃO foi refeito.');
}
console.log(`${COLS}×${LINHAS} ladrilhos em public/mapa/infernal/: ${(total / 1048576).toFixed(1)} MB no todo, o maior ${(maior / 1024).toFixed(0)} KB (o SVG inteiro: ${(fonte.length / 1048576).toFixed(1)} MB)`);
