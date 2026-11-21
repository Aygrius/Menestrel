/* DA PINTURA ANTIGA PARA O MAPA VETORIAL (21/11/2026)
 *
 *   node scripts/mapa/converter-vetorial.mjs <entrada.json> <saida.json>
 *
 * Usuário: "Acabei de adicionar o mapa completo [...] Tente deixar as marcações
 * existentes corretas." O mapa da tela passou da pintura oriental (unidades
 * 1200 × 2000, só os Reinos) para o mapa vetorial de Tagmar inteiro
 * (public/mapa/tagmar.svg, unidades = viewBox 5905,5 × 4695,1). Este script leva
 * qualquer coordenada antiga para a nova.
 *
 * Como: (1) a mesma transformação que pôs o desenho dos Reinos no mapa novo
 * (afim por eixo, medida nas âncoras Lago Denegrio, topo da costa, Geleiras,
 * Galpas…); (2) o ajuste fino: as cidades que existem nos dois lados (o nome do
 * lugar na pintura e o nome em tagmar-rotulos.json) caem exatamente onde o
 * mapa novo as põe, e o erro de cada uma se espalha para os vizinhos com peso
 * pelo inverso do quadrado da distância — longe de toda âncora, o ajuste some.
 *
 * Entrada: { lugares?: [{nome,tipo,x,y,...}], pontos?: [{x,y,...}] } — devolve o
 * mesmo objeto com x/y trocados (e "ancora": true nos lugares que viraram âncora).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const rotulos = JSON.parse(readFileSync(join(aqui, '../../public/mapa/tagmar-rotulos.json'), 'utf8')).rotulos;

/* 1) pintura oriental (1200 × 2000) → tela de desenho (2000 px) → polegadas do
      documento antigo → polegadas do documento ampliado → viewBox do SVG */
const K = 35.1139 / 2000, X0 = 2.46165, TOPO = -8.1119 + 27.9167;
const ESC = 59.05512 / 35.1139, DX = -9.50896 - 2.46165 * ESC, DY = -17.62893 + 8.1119 * ESC;
const SVG_X0 = -9.50896, SVG_TOPO = 29.32185;
export function afim({ x, y }) {
  const tx = 1215 + (x - 205) / 1.22, ty = 268 + (y - 330) / 1.34;          // tela de desenho
  const ix = X0 + tx * K, iy = TOPO - ty * K;                                // polegadas (antigo)
  const nx = ix * ESC + DX, ny = iy * ESC + DY;                              // polegadas (ampliado)
  return { x: (nx - SVG_X0) * 100, y: (SVG_TOPO - ny) * 100 };              // viewBox
}

/* 2) âncoras: lugares pontuais que existem nos dois mapas */
const norm = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\bfortaleza de\b/g, 'fortaleza').replace(/[^a-z]/g, '');
const APELIDOS = { leon: 'leom', batelmor: 'batelmor', kathalor: 'katalor', povariana: 'povarina', fontenova: 'fontenova' };
const PONTUAIS = new Set(['capital', 'cidade', 'fortaleza', 'ruina', 'arena', 'oasis']);
const novos = new Map();
for (const r of rotulos) if (r.mapa === 'reinos' && PONTUAIS.has(r.tipo)) novos.set(norm(r.nome), r);
const achar = (nome) => { const n = norm(nome); return novos.get(APELIDOS[n] || n) || null; };

export function montarAncoras(lugares) {
  const ancoras = [];
  for (const l of lugares || []) {
    if (l.tipo !== 'cidade' && l.tipo !== 'local') continue;
    const r = achar(l.nome); if (!r) continue;
    const a = afim(l);
    ancoras.push({ nome: l.nome, de: a, dx: r.x - a.x, dy: r.y - a.y });
  }
  return ancoras;
}

const ALCANCE = 160;   // unidades novas (~175 km): além disso, o ajuste vai sumindo
export function converter(p, ancoras) {
  const a = afim(p);
  let sw = 1 / (ALCANCE * ALCANCE), sx = 0, sy = 0;   // a "âncora nula" puxa para ajuste zero ao longe
  for (const n of ancoras) {
    const d2 = (a.x - n.de.x) ** 2 + (a.y - n.de.y) ** 2;
    if (d2 < 1e-6) return { x: +(a.x + n.dx).toFixed(1), y: +(a.y + n.dy).toFixed(1) };
    const w = 1 / d2; sw += w; sx += w * n.dx; sy += w * n.dy;
  }
  return { x: +(a.x + sx / sw).toFixed(1), y: +(a.y + sy / sw).toFixed(1) };
}

if (process.argv[2]) {
  const ent = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const ancoras = montarAncoras([...(ent.lugares || []), ...(ent.ancoras || [])]);
  const nomesAncora = new Set(ancoras.map((n) => n.nome));
  const sai = { ...ent };
  if (ent.lugares) sai.lugares = ent.lugares.map((l) => ({ ...l, ...converter(l, ancoras) }));
  if (ent.pontos) sai.pontos = ent.pontos.map((p) => ({ ...p, ...converter(p, ancoras) }));
  writeFileSync(process.argv[3], JSON.stringify(sai, null, 1));
  console.log(`âncoras: ${ancoras.length} (${[...nomesAncora].slice(0, 12).join(', ')}…)`);
  const maior = ancoras.reduce((m, n) => Math.max(m, Math.hypot(n.dx, n.dy)), 0);
  console.log(`maior ajuste numa âncora: ${maior.toFixed(1)} unidades (~${(maior * 400 / 365).toFixed(0)} km)`);
}
