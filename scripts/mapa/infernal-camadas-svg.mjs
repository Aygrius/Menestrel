// O PLANO INFERNAL EM CAMADAS PARA O COREL (23/11/2026). O usuário vai desenhar as montanhas à mão no
// tagmar/mapa-infernal.cdr ("Eu vou fazer o desenho"); o resto entra pronto, uma camada por arquivo SVG
// em tagmar/infernal-camadas/, importado por scripts/mapa/infernal-camadas-corel.ps1 (criar milhares de
// pontos um a um pelo COM levaria horas). Cada SVG tem o tamanho da página (750 × 596,3 mm) e um quadro
// invisível "quadro" para o Corel posicionar a importação exatamente sobre a página.
import fs from 'node:fs';
const W = 750, H = 596.3;
const J = JSON.parse(fs.readFileSync(new URL('../../tagmar/infernal-continente.json', import.meta.url), 'utf8'));
const dir = new URL('../../tagmar/infernal-camadas/', import.meta.url); fs.mkdirSync(dir, { recursive: true });
const d = (pts, z = 'Z') => 'M' + pts.map(p => `${p[0].toFixed(2)},${(H - p[1]).toFixed(2)}`).join('L') + z;
const caminho = (lista, attrs, z = 'Z', id = '') => lista && lista.length ? `<path${id ? ` id="${id}"` : ''} d="${lista.map(p => d(p, z)).join('')}" fill-rule="evenodd" ${attrs}/>` : '';
const grava = (nome, corpo) => fs.writeFileSync(new URL(nome + '.svg', dir),
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}"><rect id="quadro" width="${W}" height="${H}" fill="none" stroke="none"/>${corpo}</svg>`);
const ARIDO = '#E6CF9C', OPA = ['.38', '.50', '.65'], FLOR = ['#BEF1D4', '#B6EFCD', '#99E4C1'], LODO = ['#D3E6D2', '#C2DCC6', '#AED0B6'];
const niveis = (lst, cor) => lst.map((l, n) => caminho(l, Array.isArray(cor) ? `fill="${cor[n]}"` : `fill="${cor}" fill-opacity="${OPA[n]}"`, 'Z', `nivel-${n + 1}`)).join('');

grava('01-reinos', caminho(J.litoral, 'fill="#F2E6C6"', 'Z', 'continente'));
grava('02-desertos', niveis([[J.deserto.borda], [J.deserto.meio], [J.deserto.centro]], ARIDO) + niveis(J.biomas.mocna, ARIDO));
grava('03-florestas', niveis(J.biomas.fulvina, FLOR) + niveis(J.biomas.vouxiz, FLOR) + niveis(J.florestaSeca, FLOR));
grava('04-pantanos', niveis(J.biomas.udoviom, LODO));
grava('05-terreno-queimado', caminho(J.queimado.cinza, 'fill="#B9A68E" fill-opacity=".35"', 'Z', 'cinza') + caminho(J.queimado.basalto, 'fill="#6F625A" fill-opacity=".30"', 'Z', 'basalto') + caminho(J.queimado.crestado, 'fill="#8A6A55" fill-opacity=".35"', 'Z', 'crestado'));
grava('06-textura', caminho(J.textura.escura, 'fill="#52645B" fill-opacity=".08"', 'Z', 'textura-escura') + caminho(J.textura.clara, 'fill="#EBE0BF" fill-opacity=".35"', 'Z', 'textura-clara'));
const R = J.relevo;
grava('07-relevo', caminho(R.sombra1, 'fill="#52645B" fill-opacity=".12"', 'Z', 'sombra-1') + caminho(R.sombra2, 'fill="#52645B" fill-opacity=".16"', 'Z', 'sombra-2') + caminho(R.sombra3, 'fill="#3F4F47" fill-opacity=".20"', 'Z', 'sombra-3') +
  caminho(R.luz, 'fill="#FFFFFF" fill-opacity=".40"', 'Z', 'luz') + caminho(R.cume1, 'fill="#DCE4D4" fill-opacity=".65"', 'Z', 'cume-1') + caminho(R.cume2, 'fill="#E9EAE2" fill-opacity=".75"', 'Z', 'cume-2') + caminho(R.cume3, 'fill="#FFFFFF" fill-opacity=".90"', 'Z', 'cume-3'));
grava('08-rios', caminho(J.lagoVouxiz[0], 'fill="#83D6EA"', 'Z', 'lago-de-vouxiz'));
grava('09-lava', J.lava.map((l, c) => caminho(l, `fill="none" stroke="#F7B79A" stroke-opacity=".45" stroke-width="${(J.larguras[c] * 3 + 0.9).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"`, '', `vale-${c + 1}`)).join('') +
  J.lava.map((l, c) => caminho(l, `fill="none" stroke="#F0663A" stroke-width="${J.larguras[c]}" stroke-linecap="round" stroke-linejoin="round"`, '', `lava-${c + 1}`)).join('') +
  caminho(J.lagoLava, 'fill="#F0663A"', 'Z', 'lago-de-simaricane') + caminho(J.bocas, 'fill="#F0663A"', 'Z', 'bocas'));
grava('10-fronteiras', caminho(J.fronteiras, 'fill="none" stroke="#8C9196" stroke-width="0.28" stroke-dasharray="1.12 0.84"', '', 'fronteiras'));
for (const f of fs.readdirSync(dir)) console.log(f, (fs.statSync(new URL(f, dir)).size / 1024).toFixed(0) + ' KB');
