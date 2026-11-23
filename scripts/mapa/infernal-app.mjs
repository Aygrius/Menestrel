/* O CHÃO DO PLANO INFERNAL NO APP (23/11/2026)
 *
 *   MODELO=montanhas node scripts/mapa/infernal-continente.mjs
 *   node scripts/mapa/infernal-fora.mjs
 *   node scripts/mapa/infernal-app.mjs
 *
 * Leva o desenho aprovado (tagmar/infernal-modelo-montanhas.svg, em mm, 750 × 596,3 — o mesmo
 * que foi aplicado no tagmar/mapa-infernal.cdr: reinos, biomas, lava, montanhas em volta e
 * rios secos) para public/mapa/infernal.svg, nas MESMAS unidades do mapa material (viewBox
 * 5905,5 × 4695,1; 1500 mm = 5905,5). Escala real (usuário, 23/11/2026): o inferno tem 1/4 da
 * área do mundo material e fica no meio da tela. O resto da tela é montanha ("Quero que o resto
 * seja preenchido com montanhas"): tagmar/infernal-fora.svg, por baixo; a borda do desenho
 * esmaece em 32 mm sobre ela para não sobrar a linha reta da emenda.
 * O Corel de avaliação não exporta por script, por isso a fonte é o SVG do gerador.
 * Os caminhos vão relativos (o arquivo cai quase à metade).
 * O recorte (onde o desenho está) vai para MAPA_RECORTE.infernal em 13-diario/mapa.jsx.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const L = 5905.5, A = 4695.1, W = 750, H = 596.3, K = L / 1500, BORDA = 32;
const ox = +((L - W * K) / 2).toFixed(2), oy = +((A - H * K) / 2).toFixed(2);
const le = nome => readFileSync(join(aqui, '../../tagmar', nome), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const miolo = s => s.slice(s.indexOf('>') + 1, s.lastIndexOf('</svg>')).replace(/^<rect[^>]*\/>/, '');

// M x,y L x,y … Z  →  M x y l dx dy … z (só M/L/Z aparecem no desenho)
const relativo = d => { let s = '', px = 0, py = 0;
  for (const [, c, a, b] of d.matchAll(/([MLZ])\s*(?:(-?[\d.]+)[ ,](-?[\d.]+))?/g)) {
    if (c === 'Z') { s += 'z'; continue; }
    const x = Math.round(+a * 10) / 10, y = Math.round(+b * 10) / 10;
    s += c === 'M' ? `M${x} ${y}` : `l${+(x - px).toFixed(1)} ${+(y - py).toFixed(1)}`; px = x; py = y; }
  return s; };
const desenho = miolo(le('infernal-modelo-montanhas.svg')).replace(/ d="([^"]*)"/g, (_, d) => ` d="${relativo(d)}"`);
const fora = le('infernal-fora.svg');
const fundo = (fora.match(/^<svg[^>]*><rect[^>]*fill="([^"]+)"/) || [, '#F2E6C6'])[1];

// esmaecer a borda do desenho: duas máscaras de gradiente (horizontal e vertical), uma dentro da outra
const grad = (id, x2, y2, t) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${x2}" y2="${y2}">`
  + `<stop offset="0" stop-color="#000"/><stop offset="${t}" stop-color="#fff"/><stop offset="${1 - t}" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>`;
const defs = `<defs>${grad('esmaece-h', W, 0, +(BORDA / W).toFixed(4))}${grad('esmaece-v', 0, H, +(BORDA / H).toFixed(4))}`
  + `<mask id="borda-h" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#esmaece-h)"/></mask>`
  + `<mask id="borda-v" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#esmaece-v)"/></mask></defs>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${A}">${defs}`
  + `<rect width="${L}" height="${A}" fill="${fundo}"/>`
  + `<g transform="scale(${K})">${miolo(fora)}</g>`
  + `<g transform="translate(${ox} ${oy}) scale(${K})"><g mask="url(#borda-v)"><g mask="url(#borda-h)">`
  + `<rect width="${W}" height="${H}" fill="${fundo}"/>${desenho}</g></g></g></svg>`;
writeFileSync(join(aqui, '../../public/mapa/infernal.svg'), svg);
console.log(`public/mapa/infernal.svg: ${(svg.length / 1024).toFixed(0)} KB (desenho ${(desenho.length / 1024).toFixed(0)} KB); recorte [${ox}, ${oy}, ${+(ox + W * K).toFixed(2)}, ${+(oy + H * K).toFixed(2)}]`);
