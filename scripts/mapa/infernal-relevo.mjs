// RELEVO E LAVA DO PLANO INFERNAL (23/11/2026)
// Usuário: "As montanhas não parecem montanhas, os rios de lavas não parecem rios. Eu não vou
// aceitar menos detalhes do que fizemos no plano material."
// O método é o do mapa material: um CAMPO DE ALTURA (cordilheiras com cristas e contrafortes,
// planalto, cratera, cones, dunas, paredes do cânion), sombreado com luz do noroeste e recortado
// em faixas — três sombras, luz e cumes —, cada faixa uma curva de muitos subcaminhos. A lava é
// uma REDE DE DRENAGEM: cada nascente desce pelo terreno até o lago de lava, os caminhos se juntam
// e a largura cresce com o que corre por eles (oito classes, como os rios do material).

export function relevoInfernal(ctx) {
  const { W, H, fbm, hash, centro, raio } = ctx;
  // grade fina (metade da do continente): as cristas têm 2–4 mm e precisam de várias células
  const G = ctx.G / 2, nx = (ctx.nx - 1) * 2 + 1, ny = (ctx.ny - 1) * 2 + 1;
  const V = new Float32Array(nx * ny), L = new Int8Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const i0 = i >> 1, j0 = j >> 1, i1 = Math.min(ctx.nx - 1, i0 + (i & 1)), j1 = Math.min(ctx.ny - 1, j0 + (j & 1));
    V[j * nx + i] = (ctx.V[j0 * ctx.nx + i0] + ctx.V[j0 * ctx.nx + i1] + ctx.V[j1 * ctx.nx + i0] + ctx.V[j1 * ctx.nx + i1]) / 4;
    L[j * nx + i] = ctx.L[j0 * ctx.nx + i0]; }
  const N = nx * ny, Alt = new Float32Array(N), terra = new Uint8Array(N);
  for (let o = 0; o < N; o++) terra[o] = V[o] > 0 ? 1 : 0;
  const ridged = (x, y, s) => 1 - Math.abs(2 * fbm(x, y, s, 4) - 1);
  /* Ridged multifractal (Musgrave): cada oitava é 1 − |ruído|, ao quadrado, pesada pela anterior —
     cristas finas que se ramificam. O domínio é torcido por outro ruído para as cristas não seguirem
     a grade. Coordenadas do MUNDO (não da serra), para não sair listra reta. */
  const rmf = (x, y, seed) => { const wx = x + 1.4 * (fbm(x * 0.5, y * 0.5, seed + 11, 3) - 0.5) * 2, wy = y + 1.4 * (fbm(x * 0.5, y * 0.5, seed + 23, 3) - 0.5) * 2;
    let f = 1, a = 1, peso = 1, soma = 0, norma = 0;
    for (let k = 0; k < 5; k++) { let n = 1 - Math.abs(2 * fbm(wx * f, wy * f, seed + k * 7, 1) - 1); n *= n; n *= peso; peso = Math.min(1, n * 2.2);
      soma += n * a; norma += a; f *= 2.05; a *= 0.55; }
    return soma / norma; };
  /* CRISTA COMO NO MAPA MATERIAL (23/11/2026, usuário: "o efeito das montanhas ainda não ficou como
     no mapa do plano material"). Lá as cristas são manchas alongadas, quase paralelas, cuja direção
     muda devagar de região para região, quebradas em pedaços. O ruído é esticado na direção local
     (ângulo que varia em ~120 mm), afiado (ridged) e recortado por um ruído de quebra. */
  const DIRS = [0.5, 1.55, 2.6].map(t => [Math.cos(t), Math.sin(t)]);
  const ridgeDir = (x, y, seed, k) => { const [c, s2] = DIRS[k], u = x * c + y * s2, v = -x * s2 + y * c;
    const a = Math.pow(1 - Math.min(1, Math.abs(fbm(u / 22, v / 7, seed + k * 31, 3)) * 1.5), 2.2);
    const b = Math.pow(1 - Math.min(1, Math.abs(fbm(u / 9, v / 3.4, seed + 9 + k * 31, 2)) * 1.5), 2);
    return 0.8 * a + 0.25 * b * Math.sqrt(a); };
  // três direções fixas (sem giro de coordenadas, que espirala); o peso de cada uma muda devagar
  const crista = (x, y, seed) => { let soma = 0, pesos = 0;
    for (let k = 0; k < 3; k++) { const w = Math.pow(Math.max(0.001, 0.5 + 0.5 * fbm(x / 90, y / 90, seed + 60 + k * 13, 2)), 4); soma += w * ridgeDir(x, y, seed, k); pesos += w; }
    const quebra = 0.5 + 0.5 * fbm(x / 16, y / 16, seed + 17, 2);
    return Math.min(1, soma / pesos * (0.55 + 0.75 * quebra)); };
  const sm = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

  // ── cordilheiras: polilinhas com meia-largura e altura ──
  const cords = [];
  const cordilheira = (pts, w, h, seed) => cords.push({ pts, w, h, seed });
  // Morrigalti: anel de picos com a passagem para Fulvina (a entrada do fundo do inferno)
  { const ki = 12, c = centro[ki], ent = Math.atan2(centro[11][1] - c[1], centro[11][0] - c[0]);
    let arco = [];
    for (let g = 0; g <= 360; g += 4) { const a = ent + (g * Math.PI) / 180;
      if (g < 24 || g > 336) { if (arco.length > 2) cordilheira(arco, 17, 1.2, 31); arco = []; continue; }
      const d = raio(c, a, ki) * (0.74 + 0.08 * fbm(g / 40, 1, 5)); arco.push([c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d]); }
    if (arco.length > 2) cordilheira(arco, 17, 1.2, 31); }
  const perto = (ki, dx, dy) => [centro[ki][0] + dx, centro[ki][1] + dy];
  // Antredom: o maciço da cidadela, com um braço para o norte
  cordilheira([perto(2, -20, -10), perto(2, -10, -4), perto(2, 14, 6), perto(2, 30, 20)], 22, 1.15, 41);
  cordilheira([perto(2, -8, -2), perto(2, -14, 18)], 12, 0.75, 42);
  // Ricutatis: serra baixa ao norte da cidade
  cordilheira([perto(0, -40, 10), perto(0, -14, 22), perto(0, 16, 20)], 13, 0.6, 43);
  // Diatrimis: planície; só a crista que fecha o leste
  cordilheira([perto(3, 34, -30), perto(3, 44, 4), perto(3, 36, 30)], 11, 0.55, 44);
  // Heldrom: espinhaço ao longo do corredor, terras patrulhadas entre cristas
  cordilheira([perto(5, 16, 70), perto(5, 22, 30), perto(5, 14, -10), perto(5, 20, -60)], 11, 0.8, 45);
  // Seinoniz: a cratera é um anel (abaixo); serras ao redor
  cordilheira([perto(6, -46, 30), perto(6, -40, -16)], 12, 0.7, 46);
  // Vouxiz: colinas da floresta de brumas
  cordilheira([perto(7, -46, -20), perto(7, -20, -30), perto(7, 10, -34)], 12, 0.55, 47);
  // Udoviom: as margens rochosas do vale de lodo (duas cristas, o vale no meio)
  cordilheira([perto(8, -60, 16), perto(8, -20, 22), perto(8, 30, 24), perto(8, 60, 14)], 9, 0.7, 48);
  cordilheira([perto(8, -60, -18), perto(8, -20, -22), perto(8, 30, -20), perto(8, 60, -14)], 9, 0.65, 49);
  // Branaxis: pedreiras e escarpas, de norte a sul
  cordilheira([perto(10, -10, 80), perto(10, -18, 30), perto(10, -8, -20), perto(10, -16, -70)], 16, 0.95, 50);
  // Anasmadis: colinas
  cordilheira([perto(9, -30, -30), perto(9, 10, -36), perto(9, 40, -24)], 12, 0.55, 51);
  // Fulvina: florestas em colinas
  cordilheira([perto(11, -50, 20), perto(11, -10, 34), perto(11, 40, 26)], 12, 0.55, 52);

  // vulcões no anel de Morrigalti: cones com a boca afundada
  const cM = centro[12];
  const vulcoes = [-40, 50, 150].map((g, i) => { const a = (g * Math.PI) / 180, d = raio(cM, a, 12) * 0.6;
    return { p: [cM[0] + Math.cos(a) * d, cM[1] + Math.sin(a) * d], r: 24 + 3 * i, h: 1.7 }; });
  // planalto de Mocna (mesa) e cratera de Seinoniz
  const mesa = { c: perto(1, 6, 4), rx: 50, ry: 26, h: 0.75 }, crat = { c: centro[6], r: 22, h: 0.55 };
  // dunas de Ekisis
  const dunas = { c: centro[4], r: 95 };

  // segmento mais próximo de uma polilinha: distância, coordenada ao longo e de través
  const maisPerto = (x, y, pts) => { let best = 1e9, u = 0, v = 0, acc = 0;
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      let t = ((x - a[0]) * dx + (y - a[1]) * dy) / (l * l); t = Math.max(0, Math.min(1, t));
      const px = a[0] + dx * t, py = a[1] + dy * t, d = Math.hypot(x - px, y - py);
      if (d < best) { best = d; u = acc + t * l; v = ((x - a[0]) * -dy + (y - a[1]) * dx) / l; } acc += l; }
    return [best, u, v]; };

  // distância (mm) até fora de Mocna — rocha ou outro reino —, para o vale subir também nas fronteiras
  const bordaMocna = new Float32Array(N).fill(1e9);
  for (let o = 0; o < N; o++) if (!(terra[o] && L[o] === 1)) bordaMocna[o] = 0;
  for (let j = 1; j < ny; j++) for (let i = 1; i < nx - 1; i++) { const o = j * nx + i;
    bordaMocna[o] = Math.min(bordaMocna[o], bordaMocna[o - 1] + G, bordaMocna[o - nx] + G, bordaMocna[o - nx - 1] + G * 1.414, bordaMocna[o - nx + 1] + G * 1.414); }
  for (let j = ny - 2; j >= 0; j--) for (let i = nx - 2; i > 0; i--) { const o = j * nx + i;
    bordaMocna[o] = Math.min(bordaMocna[o], bordaMocna[o + 1] + G, bordaMocna[o + nx] + G, bordaMocna[o + nx + 1] + G * 1.414, bordaMocna[o + nx - 1] + G * 1.414); }
  let maxB = 0; for (let o = 0; o < N; o++) if (bordaMocna[o] < 1e8 && bordaMocna[o] > maxB) maxB = bordaMocna[o];
  const maxV = new Float32Array(13); for (let o = 0; o < N; o++) if (terra[o] && V[o] > maxV[L[o]]) maxV[L[o]] = V[o];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const o = j * nx + i; if (!terra[o]) continue;
    const x = i * G, y = j * G;
    // chão: ondulação leve em todo o continente (no material, até a planície tem sombra)
    let h = 0.05 * fbm(x / 26, y / 26, 61) + 0.004 * fbm(x / 6, y / 6, 62, 3);
    // paredes do cânion: o chão sobe perto da rocha
    
    for (const k of cords) { const [d, u, v] = maisPerto(x, y, k.pts); if (d > k.w * 2.6) continue;
      const w = k.w * (0.75 + 0.5 * fbm(u / 30, k.seed, k.seed)), p = Math.exp(-((d / w) ** 2));
      h += k.h * p * (0.15 + 0.85 * crista(x, y, k.seed)) * (0.75 + 0.4 * fbm(u / 24, 2, k.seed)); }
    for (const vc of vulcoes) { const r = Math.hypot(x - vc.p[0], y - vc.p[1]); if (r > vc.r * 1.6) continue;
      const ang = Math.atan2(y - vc.p[1], x - vc.p[0]);
      const sulcos = 0.82 + 0.18 * ridged(ang * 3.2, r / 6, 77);
      h += vc.h * Math.pow(Math.max(0, 1 - r / vc.r), 1.4) * sulcos - 1.1 * Math.exp(-((r / 4.2) ** 2)); }
    /* MOCNA É UM VALE PROFUNDO (usuário, 23/11/2026: "é um vale profundo, não uma colina"). O chão
       afunda da borda do reino para o miolo, então o vale tem a forma do reino; as paredes ganham
       ravinas pelo mesmo ruído de crista das montanhas. */
    if (L[o] === 1) { const m = bordaMocna[o] / maxB, t = sm((m - 0.18) / 0.4), parede = 4 * t * (1 - t);
      h -= mesa.h * t - 0.35 * mesa.h * parede * rmf(x / 9, y / 9, 77); }
    { const r = Math.hypot(x - crat.c[0], (y - crat.c[1]) * 1.25), a = Math.atan2(y - crat.c[1], x - crat.c[0]);
      const rr = r * (1 + 0.08 * fbm(Math.cos(a) * 2, Math.sin(a) * 2, 73));
      h += crat.h * Math.exp(-(((rr - crat.r) / 5.5) ** 2)) * (0.8 + 0.2 * ridged(a * 4, rr / 4, 74)) - 0.35 * sm((crat.r - rr) / 6); }
    { const r = Math.hypot(x - dunas.c[0], y - dunas.c[1]); if (r < dunas.r && L[o] === 4) {
      const u = x * 0.8 + y * 0.6 + 6 * fbm(x / 30, y / 30, 81), w = -x * 0.6 + y * 0.8;
      const crista = Math.pow(1 - Math.abs(2 * (((u / 7 + 0.3 * fbm(w / 14, u / 30, 82)) % 1 + 1) % 1) - 1), 2.2);
      h += 0.13 * crista * (0.5 + 0.5 * fbm(w / 20, u / 20, 83)) * sm((dunas.r - r) / 25); } }
    Alt[o] = h; }

  /* MODELO "MONTANHAS EM VOLTA" (23/11/2026, usuário: "Faça um modelo onde o campo marrom
     representado por paredes fosse montanhas"). Com ctx.montanhasFora, a rocha de fora vira um
     maciço: sobe a partir do litoral (distância à terra) e ganha as mesmas cristas das serras. */
  const fora = !!ctx.montanhasFora; let neveFora = null;
  if (fora) {
    const dT = new Float32Array(N).fill(1e9);
    const LT = new Int8Array(N).fill(-1);   // reino da terra mais próxima (para achar os canais entre reinos)
    for (let o = 0; o < N; o++) if (terra[o]) { dT[o] = 0; LT[o] = L[o]; }
    for (let j = 1; j < ny; j++) for (let i = 1; i < nx - 1; i++) { const o = j * nx + i;
      for (const [q, c] of [[o - 1, G], [o - nx, G], [o - nx - 1, G * 1.414], [o - nx + 1, G * 1.414]]) if (dT[q] + c < dT[o]) { dT[o] = dT[q] + c; LT[o] = LT[q]; } }
    for (let j = ny - 2; j >= 0; j--) for (let i = nx - 2; i > 0; i--) { const o = j * nx + i;
      for (const [q, c] of [[o + 1, G], [o + nx, G], [o + nx + 1, G * 1.414], [o + nx - 1, G * 1.414]]) if (dT[q] + c < dT[o]) { dT[o] = dT[q] + c; LT[o] = LT[q]; } }
    /* MURALHA ENTRE REINOS (usuário, 23/11/2026: "nas partes onde há montanhas externas (entre os reinos)
       faça-as maiores para impedir os jogadores de tentar atravessá-las"). O eixo do canal é onde a terra
       mais próxima muda de reino; perto dele (até 60 mm de terra) os picos ficam maiores e mais altos e o
       relevo sobe mais depressa a partir do litoral. `ent` vai de 1 no eixo a 0 a ~22 mm dele. */
    const eixo = new Uint8Array(N);
    for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) { const o = j * nx + i;
      if (!terra[o] && dT[o] < 60 && LT[o] >= 0 && ((LT[o + 1] >= 0 && LT[o + 1] !== LT[o]) || (LT[o + nx] >= 0 && LT[o + nx] !== LT[o]))) eixo[o] = 1; }
    const dE = new Float32Array(N).fill(1e9); for (let o = 0; o < N; o++) if (eixo[o]) dE[o] = 0;
    for (let j = 1; j < ny; j++) for (let i = 1; i < nx - 1; i++) { const o = j * nx + i;
      dE[o] = Math.min(dE[o], dE[o - 1] + G, dE[o - nx] + G, dE[o - nx - 1] + G * 1.414, dE[o - nx + 1] + G * 1.414); }
    for (let j = ny - 2; j >= 0; j--) for (let i = nx - 2; i > 0; i--) { const o = j * nx + i;
      dE[o] = Math.min(dE[o], dE[o + 1] + G, dE[o + nx] + G, dE[o + nx + 1] + G * 1.414, dE[o + nx - 1] + G * 1.414); }
    const ent = new Float32Array(N); for (let o = 0; o < N; o++) if (!terra[o]) ent[o] = 1 - sm(dE[o] / 22);
    /* CRISTA CONTÍNUA ENTRE REINOS NÃO CONSECUTIVOS (usuário, 23/11/2026: "os reinos 8 e 9 parecem conseguir
       ir para o reino 13"). Ali o canal de rocha tem só 26–42 mm: a rampa do litoral não deixava o relevo
       crescer e sobrava um corredor baixo. Agora o eixo desses canais (e só deles — entre consecutivos fica a
       passagem) leva uma serra sem selas baixas: piso de altura que sobe junto da beira. */
    const eixoN = new Uint8Array(N);
    for (let o = 0; o < N; o++) if (eixo[o]) { const q = LT[o + 1] >= 0 && LT[o + 1] !== LT[o] ? o + 1 : o + nx;
      if (Math.abs(LT[q] - LT[o]) !== 1) eixoN[o] = 1; }
    const dN = new Float32Array(N).fill(1e9); for (let o = 0; o < N; o++) if (eixoN[o]) dN[o] = 0;
    for (let j = 1; j < ny; j++) for (let i = 1; i < nx - 1; i++) { const o = j * nx + i;
      dN[o] = Math.min(dN[o], dN[o - 1] + G, dN[o - nx] + G, dN[o - nx - 1] + G * 1.414, dN[o - nx + 1] + G * 1.414); }
    for (let j = ny - 2; j >= 0; j--) for (let i = nx - 2; i > 0; i--) { const o = j * nx + i;
      dN[o] = Math.min(dN[o], dN[o + 1] + G, dN[o + nx] + G, dN[o + nx + 1] + G * 1.414, dN[o + nx - 1] + G * 1.414); }
    /* CADA MONTANHA DIFERENTE (usuário, 23/11/2026: "a área branca sob as montanhas precisa ter padrões
       diferentes entre si, está tudo muito parecido"). Antes todo pico era um cone radial — os cumes
       saíam como a mesma estrela. Agora cada pico sorteia um tipo: cone, crista alongada (espinhaço
       com o cume comprido), maciço de vários cumes ou mesa (topo largo e plano); e também o
       alongamento, o rumo, quantos contrafortes, o perfil da encosta e quanto de neve leva. */
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
    for (let gy = 0; gy < H; gy += 24) for (let gx = 0; gx < W; gx += 24) {
      const x = gx + 24 * hash(gx | 0, gy | 0 + 900), y = gy + 24 * hash(gy | 0, gx | 0 + 901);
      const i = Math.round(x / G), j = Math.round(y / G); if (i < 0 || j < 0 || i >= nx || j >= ny) continue; const o = j * nx + i;
      if (terra[o]) continue;
      const fundo = Math.max(sm(dT[o] / 40), ent[o]);
      novoPico(x, y, 12 + 12 * hash(i, j + 902) + 14 * fundo + 8 * ent[o], (0.55 + 0.5 * hash(i + 3, j + 903)) * (0.6 + 0.6 * fundo) * (1 + 0.2 * ent[o]), i * 7 + j * 131);
    }
    // a muralha: picos grandes enfileirados sobre o eixo de cada canal, a cada ~20 mm
    for (let gy = 0; gy < H; gy += 20) for (let gx = 0; gx < W; gx += 20) {
      const x = gx + 20 * hash(gx | 0, gy | 0 + 930), y = gy + 20 * hash(gy | 0, gx | 0 + 931);
      const i = Math.round(x / G), j = Math.round(y / G); if (i < 0 || j < 0 || i >= nx || j >= ny) continue; const o = j * nx + i;
      if (terra[o] || dE[o] > 9 || dT[o] < (dN[o] < 9 ? 3 : 6)) continue;
      novoPico(x, y, 20 + 10 * hash(i, j + 932) + Math.min(10, dT[o] * 0.3), 0.75 + 0.25 * hash(i, j + 933), i * 17 + j * 193 + 9000);
    }
    const Hf = new Float32Array(N), Nf = new Float32Array(N);
    const carimba = (p) => { const R = p.r * 1.5 * Math.sqrt(p.ax), i0 = Math.max(0, Math.floor((p.x - R) / G)), i1 = Math.min(nx - 1, Math.ceil((p.x + R) / G)),
        j0 = Math.max(0, Math.floor((p.y - R) / G)), j1 = Math.min(ny - 1, Math.ceil((p.y + R) / G)), ca = Math.cos(p.rot), sa = Math.sin(p.rot), sq = Math.sqrt(p.ax);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const o = j * nx + i; if (terra[o]) continue;
        const dx = i * G - p.x, dy = j * G - p.y, u = (dx * ca + dy * sa) / sq, w = (-dx * sa + dy * ca) * sq, ang = Math.atan2(w, u);
        const rr = Math.hypot(u, w) * (1 + 0.25 * fbm(Math.cos(ang) * 1.5 + p.seed, Math.sin(ang) * 1.5, p.seed, 2));
        const t = Math.max(0, 1 - rr / p.r); if (!t) continue;
        // contrafortes: cristas afiadas que descem do cume, em número e fundura próprios de cada pico
        const crist = 1 - Math.min(1, Math.abs(fbm(ang * p.freq + p.seed, rr / 9, p.seed + 1, 3)) * 2.6), sulcos = 1 - Math.sqrt(1 - t) * p.prof * (1 - crist * crist);
        const perfil = p.mesa ? Math.min(1, t / p.mesa) ** 0.6 : Math.pow(t, p.expo) * 0.75 + 0.25 * t * t;
        const v = p.h * perfil * sulcos;
        if (v > Hf[o]) { Hf[o] = Math.max(v, Hf[o] + 0.25 * (v - Hf[o])); Nf[o] = p.neve; } else Hf[o] += 0.1 * v; } };
    picos.forEach(carimba);
    // vãos sem pico (a grade caiu em terra): picos menores onde a rocha ficou lisa
    for (let gy = 0; gy < H; gy += 8) for (let gx = 0; gx < W; gx += 8) {
      const i = Math.round(gx / G), j = Math.round(gy / G); if (i >= nx || j >= ny) continue; const o = j * nx + i;
      if (terra[o] || Hf[o] > 0.12) continue;
      const n0 = picos.length; novoPico(gx, gy, 10 + 6 * hash(i, j + 906), 0.45 + 0.3 * hash(i, j + 907), i * 13 + j * 71 + 5000);
      picos.slice(n0).forEach(carimba); }
    neveFora = Nf;
    for (let o = 0; o < N; o++) if (!terra[o]) { const i = o % nx, j = (o / nx) | 0;
      // SEM LIMITE NA BEIRA (usuário, 23/11/2026: "as montanhas externas possuem um limite muito claro onde
      // elas começam, ao invés de mostrar como o relevo cresce e diminui"): o relevo nasce em colinas e
      // cresce ao longo de ~30 mm, como as serras de dentro.
      const d = dT[o] + 6 * fbm(i * G / 14, j * G / 14, 94, 3), cresce = 0.12 + 0.88 * sm(d / (30 - 16 * ent[o]));
      Alt[o] = cresce * Hf[o] * sm(d / 3 + 0.4);
      if (dN[o] < 26) { const x = i * G, y = j * G, rid = 1 - Math.abs(fbm(x / 11, y / 11, 951, 3)) * 1.4;
        const piso = (0.62 + 0.22 * rid) * (1 - sm(dN[o] / 26)) * sm(dT[o] / 5);
        if (piso > Alt[o]) Alt[o] = piso; } }

  }

  // ── lago de lava de Simaricane: o fundo de Morrigalti (antes do sombreado, para ficar plano) ──
  const cLago = [cM[0] + 4, cM[1] - 18];
  const lagoV = new Float32Array(N);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const o = j * nx + i, x = i * G, y = j * G;
    const a = Math.atan2(y - cLago[1], x - cLago[0]);
    const rr = Math.hypot((x - cLago[0]) / 21, (y - cLago[1]) / 12) * (1 + 0.28 * fbm(Math.cos(a) * 1.8, Math.sin(a) * 1.8, 91) + 0.06 * fbm(x / 4, y / 4, 92, 2));
    lagoV[o] = terra[o] && L[o] === 12 ? 1 - rr : -1;
    if (lagoV[o] > -0.3 && terra[o]) Alt[o] = Math.min(Alt[o], Math.max(0, -lagoV[o]) * 0.25); }

  // ── sombreado ──
  const blur = (A, n) => { let a = A; for (let k = 0; k < n; k++) { const b = new Float32Array(N);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { let s = 0, c = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue; s += a[jj * nx + ii]; c++; }
      b[j * nx + i] = s / c; } a = b; } return a; };
  const Hs = blur(Alt, 1);
  const anelEm = (x, y) => { const a = Math.atan2(y - cM[1], x - cM[0]); return Math.hypot(x - cM[0], y - cM[1]) < raio(cM, a, 12) * 0.6; };
  const LX = -1, LY = 1, LZ = 1.1, LN = Math.hypot(LX, LY, LZ), s0 = LZ / LN, Z = 14;
  const luz = new Float32Array(N);
  for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) { const o = j * nx + i;
    const gx = (Hs[o + 1] - Hs[o - 1]) / (2 * G) * Z, gy = (Hs[o + nx] - Hs[o - nx]) / (2 * G) * Z;
    const n = Math.hypot(gx, gy, 1); luz[o] = ((-gx * LX - gy * LY + LZ) / (n * LN)) - s0; }
  /* luz suavizada (~2 mm): faixas largas e manchadas como no material. Sem isto a luz muda de golpe
     em cada encosta e as faixas viram contornos finos — a "borda no terreno" (usuário, 23/11/2026). */
  const luzS = blur(luz, 4);
  const manchaCume = new Float32Array(N); for (let o = 0; o < N; o++) manchaCume[o] = 0.12 * (fbm((o % nx) * G / 6, ((o / nx) | 0) * G / 6, 611, 3) - 0.5); if (neveFora) for (let o = 0; o < N; o++) if (!terra[o]) manchaCume[o] += neveFora[o];

  // marching squares sobre um campo qualquer (>0 dentro); mascara a terra
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
      // só curva fechada: a aberta, fechada à força pelo Z, vira um traço reto atravessando o mapa
      if (key(cur) === key(a)) polys.push(poly); }
    return polys; };
  const area = p => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; };
  const chaikin = (p) => { const o = []; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length];
    o.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]); } return o; };
  const enxuga = (p, d) => { const out = [p[0]]; for (const q of p) { const l = out.at(-1); if (Math.hypot(q[0] - l[0], q[1] - l[1]) >= d) out.push(q); } return out; };
  const faixa = (f, minA = 0.8) => curvas(f).filter(p => Math.abs(area(p)) > minA).map(p => enxuga(chaikin(p), 0.4));
  const campoRelevo = (fn) => { const F = new Float32Array(N); for (let o = 0; o < N; o++) F[o] = fora || (terra[o] && V[o] > 0.6) ? fn(o) : -1;
    if (fora) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (!i || !j || i === nx - 1 || j === ny - 1) F[j * nx + i] = -1; return F; };
  const campo = (fn) => { const F = new Float32Array(N); for (let o = 0; o < N; o++) F[o] = terra[o] && V[o] > 0.6 ? fn(o) : -1; return F; };

  const relevo = {
    sombra1: faixa(campoRelevo(o => -luzS[o] - 0.04)),
    sombra2: faixa(campoRelevo(o => -luzS[o] - 0.16)),
    sombra3: faixa(campoRelevo(o => -luzS[o] - 0.32)),
    // a sombra mais funda: contraste nas encostas viradas para o sudeste (usuário, 23/11: "uma cor mais escura dando contraste nas montanhas")
    sombra4: faixa(campoRelevo(o => -luzS[o] - 0.5)),
    luz: faixa(campoRelevo(o => luzS[o] - 0.1)),
    // cumes em placas (como a neve do material): altura + ruído, a terceira só na face iluminada
    cume1: faixa(campoRelevo(o => Hs[o] + manchaCume[o] - 0.38), 1.5),
    cume2: faixa(campoRelevo(o => Hs[o] + manchaCume[o] - 0.47), 1),
    cume3: faixa(campoRelevo(o => Math.min(Hs[o] + manchaCume[o] - 0.53, luzS[o] + 0.04)), 0.8),
  };

  /* ── BIOMAS EM FAIXAS (23/11/2026, usuário: "quero algo próximo do que você fez em Ekisis") ──
     Cada bioma é um campo suave (elipse torcida por ruído em duas escalas) recortado em três
     níveis — borda clara, meio, miolo —, preso ao reino e longe da rocha. O relevo passa por
     cima, como as dunas sobre o deserto. */
  const bioma = (ki, forma, niveis, seed) => niveis.map((nv, n) => faixa(campo(o => {
    if (L[o] !== ki) return -1; const i = o % nx, j = (o / nx) | 0, x = i * G, y = j * G;
    const v = forma(x, y, o) + 0.32 * (fbm(x / 34, y / 34, seed, 4) - 0.5) + 0.1 * (fbm(x / 9, y / 9, seed + 5, 3) - 0.5);
    return Math.min(v - nv, (V[o] - 3) / 6); }), 3));
  // o "miolo" do reino: 0 junto à rocha, 1 no ponto mais longe dela — a faixa abraça a forma do reino
  const miolo = (x, y, o) => Math.min(1, V[o] / maxV[L[o]]);
  const elipse = (c, rx, ry, rot = 0) => (x, y) => { const dx = x - c[0], dy = y - c[1], ca = Math.cos(rot), sa = Math.sin(rot);
    return 1 - Math.hypot((dx * ca + dy * sa) / rx, (-dx * sa + dy * ca) / ry); };
  const foraDaMesa = (x, y) => { const dx = (x - mesa.c[0]) / mesa.rx, dy = (y - mesa.c[1]) / mesa.ry; return Math.hypot(dx, dy) - 1.08; };
  const biomas = {
    // Mocna: planalto árido, solo rachado — ocres avermelhados
    mocna: bioma(1, (x, y, o) => Math.min(bordaMocna[o] / maxB - 0.04, 0.42 - bordaMocna[o] / maxB), [0, 0.2, 0.38], 501),
    // Fulvina: florestas sombrias e sangrentas
    fulvina: bioma(11, (x, y, o) => 0.6 * miolo(x, y, o) + 0.4 * elipse(perto(11, 0, 4), 78, 50, 0.1)(x, y) - 0.1, [0, 0.2, 0.38], 502),
    // Vouxiz: a floresta de brumas em volta do lago
    vouxiz: bioma(7, (x, y, o) => 0.55 * miolo(x, y, o) + 0.45 * elipse(perto(7, 4, -2), 80, 54)(x, y) - 0.08, [0, 0.2, 0.38], 503),
    // Udoviom: o lodo corre pelo fundo do vale, entre as duas cristas
    udoviom: bioma(8, (x, y, o) => miolo(x, y, o) - 0.2, [0, 0.18, 0.36], 504),
  };
  // o lago de Vouxiz, com a margem rasa: mesmo método (dois níveis)
  const lagoVx = bioma(7, elipse(perto(7, 8, -2), 30, 20, -0.15), [0.05, 0.4], 505);

  // ── lava: rede de drenagem até o lago ──
  const lago = faixa((() => { const F = new Float32Array(N); for (let o = 0; o < N; o++) F[o] = lagoV[o]; return F; })(), 20);
  const dentroM = o => terra[o] && L[o] === 12 && V[o] > 2.5;
  const dist = new Float64Array(N).fill(Infinity), de = new Int32Array(N).fill(-1);
  const heap = []; const push = (d, o) => { heap.push([d, o]); let k = heap.length - 1; while (k) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0;
    for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  for (let o = 0; o < N; o++) if (lagoV[o] > 0.05) { dist[o] = 0; push(0, o); }
  const ruido = new Float32Array(N); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) ruido[j * nx + i] = fbm(i * G / 9, j * G / 9, 95, 3);
  const vz = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (heap.length) { const [d, o] = pop(); if (d > dist[o]) continue; const i = o % nx, j = (o / nx) | 0;
    for (const [di, dj] of vz) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue; const q = jj * nx + ii; if (!dentroM(q)) continue;
      // subir é caro: a lava corre pelo fundo dos vales entre as cristas
      const subida = Math.max(0, Alt[q] - Alt[o]);
      const c = Math.hypot(di, dj) * Math.max(0.3, 1 + 1.6 * ruido[q] + 7 * Alt[q]) + 60 * subida, nd = d + c;
      if (nd < dist[q]) { dist[q] = nd; de[q] = o; push(nd, q); } } }
  // nascentes: as bocas dos vulcões e as encostas do anel
  const nasc = [];
  for (const vc of vulcoes) { const a0 = hash(vc.p[0] | 0, 3) * 6.28; for (let k = 0; k < 3; k++) { const a = a0 + k * 2.1;
    nasc.push({ x: vc.p[0] + Math.cos(a) * 2.4, y: vc.p[1] + Math.sin(a) * 2.4, peso: 8 }); } }
  for (let k = 0; k < 20000 && nasc.length < 60; k++) { const i = (hash(k, 101) * nx) | 0, j = (hash(k, 102) * ny) | 0, o = j * nx + i;
    if (!dentroM(o) || !isFinite(dist[o]) || Alt[o] < 0.1 || Alt[o] > 0.7 || !anelEm(i * G, j * G)) continue; nasc.push({ x: i * G, y: j * G, peso: 1 }); }
  const fluxo = new Float32Array(N), caminhos = [];
  for (const n of nasc) { let o = Math.round(n.y / G) * nx + Math.round(n.x / G); if (!isFinite(dist[o])) continue; const cam = [];
    while (o >= 0 && lagoV[o] <= 0.05 && cam.length < 5000) { cam.push(o); fluxo[o] += n.peso; o = de[o]; } if (o >= 0) cam.push(o); caminhos.push(cam); }
  // cada caminho até onde encontra um já desenhado; a largura vem do fluxo
  const feito = new Uint8Array(N), LIM = [0, 1.5, 2.2, 3.2, 4.5, 6.5, 9, 13, 18, 26, 38, 55];
  const classe = f => { let c = 0; while (c < LIM.length - 1 && f >= LIM[c + 1]) c++; return c; };
  const trechos = LIM.map(() => []);
  caminhos.sort((a, b) => b.length - a.length);
  for (const cam of caminhos) { let atual = null, cl = -1;
    for (let k = 0; k < cam.length; k++) { const o = cam[k], p = [(o % nx) * G, ((o / nx) | 0) * G], c = classe(fluxo[o]);
      if (c !== cl) { if (atual && atual.length > 1) trechos[cl].push(atual); atual = atual ? [atual.at(-1), p] : [p]; cl = c; } else atual.push(p);
      if (feito[o] && k > 0) break; feito[o] = 1; }
    if (atual && atual.length > 1) trechos[cl].push(atual); }
  /* suaviza e faz MEANDRAR (23/11/2026, "melhore os rios de lavas"): o desvio de través cresce com a
     largura (rio grande, curva larga), com o comprimento de onda também; as pontas do trecho ficam
     presas, para os trechos continuarem emendados nas junções. */
  const suave = (p, seed, c) => { let q = p; for (let n = 0; n < 3; n++) { const o = [q[0]]; for (let i = 0; i < q.length - 1; i++) { const a = q[i], b = q[i + 1];
      o.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]); } o.push(q.at(-1)); q = o; }
    q = enxuga(q, 0.3); if (q.length < 3) return q;
    const amp = 0.35 + 0.22 * c, onda = 3.5 + 1.6 * c; let acc = 0; const sAcc = [0];
    for (let i = 1; i < q.length; i++) { acc += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]); sAcc.push(acc); }
    const out = q.map(([x, y], i) => { if (i === 0 || i === q.length - 1) return [x, y];
      const a = q[i - 1], b = q[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], nn = Math.hypot(dx, dy) || 1;
      const t = sAcc[i], env = Math.min(1, t / 2.5, (acc - t) / 2.5);
      const fase = 6.28 * (t / onda + 0.8 * fbm(t / 14, seed, seed, 2));
      const d = env * amp * (0.55 + 0.6 * fbm(t / 9, seed + 3, seed, 2)) * Math.sin(fase);
      return [x - dy / nn * d, y + dx / nn * d]; });
    // segunda passada de suavização: tira o serrilhado sem apagar o meandro
    const o2 = [out[0]]; for (let i = 1; i < out.length - 1; i++) o2.push([(out[i - 1][0] + 2 * out[i][0] + out[i + 1][0]) / 4, (out[i - 1][1] + 2 * out[i][1] + out[i + 1][1]) / 4]); o2.push(out.at(-1));
    return o2; };
  const lava = trechos.map((lst, c) => lst.map((p, k) => suave(p, 200 + c * 31 + k, c)));
  // a crosta do lago: placas escuras que boiam na lava
  const crosta = faixa((() => { const F = new Float32Array(N); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const o = j * nx + i;
    F[o] = lagoV[o] > 0.08 ? (fbm(i * G / 7, j * G / 7, 97, 3) - 0.5) : -1; } return F; })(), 0.5);
  // o miolo quente do lago
  const lagoQuente = faixa((() => { const F = new Float32Array(N); for (let o = 0; o < N; o++) F[o] = lagoV[o] - 0.45 + 0.2 * (ruido[o] - 0.5); return F; })(), 2);

  /* A FLORESTA SECA DE MOCNA (23/11/2026, usuário: "Adicione uma floresta de árvores secas no
     segundo reino"), nas terras baixas em volta do planalto. Sem árvores desenhadas: "a floresta
     não é representada com pequenas árvores" — é a mancha, como no mapa material. */
  const formaSeca = (x, y, o) => bordaMocna[o] / maxB - 0.58;
  const florestaSeca = bioma(1, formaSeca, [0, 0.12, 0.24], 506);
  // a textura da planície (o grupo "planicies" do material): manchinhas claras e escuras
  const textura = {
    escura: faixa(campo(o => fbm((o % nx) * G / 3.4, ((o / nx) | 0) * G / 3.4, 601, 3) - 0.67), 0.3),
    clara: faixa(campo(o => fbm((o % nx) * G / 4.2, ((o / nx) | 0) * G / 4.2, 602, 3) - 0.65), 0.3),
  };
  /* O TERRENO EM VOLTA DA LAVA (23/11/2026, usuário: "Adicione os efeitos no terreno ao redor do rio
     e lago de lava"). Distância a toda célula de lava (rios + lago); três faixas com borda
     manchada: chão crestado rente à lava, halo de cinza e, perto das bocas, campos de basalto. */
  const dLava = new Float32Array(N).fill(1e9);
  for (let o = 0; o < N; o++) if (fluxo[o] > 0 || lagoV[o] > 0) dLava[o] = 0;
  for (let j = 1; j < ny; j++) for (let i = 1; i < nx - 1; i++) { const o = j * nx + i;
    dLava[o] = Math.min(dLava[o], dLava[o - 1] + G, dLava[o - nx] + G, dLava[o - nx - 1] + G * 1.414, dLava[o - nx + 1] + G * 1.414); }
  for (let j = ny - 2; j >= 0; j--) for (let i = nx - 2; i > 0; i--) { const o = j * nx + i;
    dLava[o] = Math.min(dLava[o], dLava[o + 1] + G, dLava[o + nx] + G, dLava[o + nx + 1] + G * 1.414, dLava[o + nx - 1] + G * 1.414); }
  const rLava = o => { const i = o % nx, j = (o / nx) | 0; return 2.2 * (fbm(i * G / 5, j * G / 5, 621, 3) - 0.5); };
  const pesoLava = o => 0.6 + 0.4 * Math.min(1, fluxo[o] / 8);
  const queimado = {
    cinza: faixa(campo(o => (5.5 + 3 * rLava(o)) - dLava[o]), 1),
    crestado: faixa(campo(o => (2.4 + 1.6 * rLava(o)) - dLava[o]), 0.6),
    basalto: faixa(campo(o => { const i = o % nx, j = (o / nx) | 0, x = i * G, y = j * G;
      let d = 1e9; for (const vc of vulcoes) d = Math.min(d, Math.hypot(x - vc.p[0], y - vc.p[1]));
      return Math.min(14 + 6 * rLava(o) - d, 3.2 + 1.5 * rLava(o) - dLava[o] + 3); }), 0.8),
  };
  /* RIOS SECOS (23/11/2026, usuário: "rotas de rios secos no terreno"). Leitos de enxurrada: a água
     que um dia correu desce das serras pelo próprio campo de altura. Inundação por prioridade a partir
     da beira da página e da lava (o que chega à lava some nela); cada célula recebe o vizinho por onde
     escoa e acumula a área que drena. Onde a área passa do limiar nasce um leito, que engrossa com ela.
     Um ruído leve no chão faz o leito serpentear nas planícies em vez de correr reto. */
  const riosSecos = (() => {
    const E = new Float32Array(N); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const o = j * nx + i;
      E[o] = Hs[o] + 0.035 * fbm(i * G / 16, j * G / 16, 641, 3) + 0.012 * fbm(i * G / 4, j * G / 4, 642, 2); }
    const formaVx = elipse(perto(7, 8, -2), 30, 20, -0.15), lagoVxV = o => terra[o] && L[o] === 7 && formaVx((o % nx) * G, ((o / nx) | 0) * G) > 0;
    const saida = o => fluxo[o] > 0 || lagoV[o] > 0 || dentroM(o) || lagoVxV(o);
    const rec = new Int32Array(N).fill(-1), visto = new Uint8Array(N), ordem = new Int32Array(N); let no = 0;
    // heap binário em arrays tipados (1,1 milhão de células)
    const hp = new Float64Array(N), ho = new Int32Array(N); let hn = 0;
    const hpush = (p, o) => { let k = hn++; while (k) { const q = (k - 1) >> 1; if (hp[q] <= p) break; hp[k] = hp[q]; ho[k] = ho[q]; k = q; } hp[k] = p; ho[k] = o; };
    const hpop = () => { const o = ho[0], lp = hp[--hn], lo = ho[hn]; let k = 0;
      for (;;) { const l = 2 * k + 1; if (l >= hn) break; const m = l + 1 < hn && hp[l + 1] < hp[l] ? l + 1 : l; if (hp[m] >= lp) break; hp[k] = hp[m]; ho[k] = ho[m]; k = m; }
      hp[k] = lp; ho[k] = lo; return o; };
    const Ef = new Float32Array(N);
    for (let o = 0; o < N; o++) { const i = o % nx, j = (o / nx) | 0;
      if (!i || !j || i === nx - 1 || j === ny - 1 || saida(o)) { visto[o] = 1; Ef[o] = E[o]; hpush(E[o], o); } }
    while (hn) { const o = hpop(); ordem[no++] = o; const i = o % nx, j = (o / nx) | 0;
      for (const [di, dj] of vz) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue; const q = jj * nx + ii; if (visto[q]) continue;
        visto[q] = 1; rec[q] = o; Ef[q] = Math.max(E[q], Ef[o] + 1e-5); hpush(Ef[q], q); } }
    const acc = new Float32Array(N).fill(G * G);
    for (let k = no - 1; k >= 0; k--) { const o = ordem[k]; if (rec[o] >= 0) acc[rec[o]] += acc[o]; }
    const A0 = 1500, LIMS = [A0, 3000, 6000, 12000, 25000, 50000], cls = a => { let c = 0; while (c < LIMS.length - 1 && a >= LIMS[c + 1]) c++; return c; };
    const leito = o => acc[o] >= A0 && !saida(o), temAcima = new Uint8Array(N);
    for (let o = 0; o < N; o++) if (leito(o) && rec[o] >= 0) temAcima[rec[o]] = 1;
    const feito = new Uint8Array(N), out = LIMS.map(() => []);
    for (let k = no - 1; k >= 0; k--) { const o0 = ordem[k]; if (!leito(o0) || temAcima[o0] || feito[o0]) continue;
      let o = o0, atual = null, cl = -1;
      while (o >= 0) { const p = [(o % nx) * G, ((o / nx) | 0) * G], c = cls(acc[o]);
        if (c !== cl) { if (atual && atual.length > 1) out[cl].push(atual); atual = atual ? [atual.at(-1), p] : [p]; cl = c; } else atual.push(p);
        if (feito[o] || saida(o)) break; feito[o] = 1; o = rec[o]; }
      if (atual && atual.length > 1) out[cl].push(atual); }
    return out.map((lst, c) => lst.filter(p => p.length > 2).map((p, k) => suave(p, 700 + c * 37 + k, Math.max(0, c - 1)))); })();
  const LARG = LIM.map((_, c) => +(0.1 * Math.pow(1.17, c)).toFixed(3));

  return { relevo, riosSecos, lava, larguras: LARG, lago, queimado, florestaSeca, textura, biomas, lagoVx, vulcoes: vulcoes.map(v => ({ p: v.p, r: v.r })),
    conferencia: `relevo: ${Object.entries(relevo).map(([k, v]) => `${k}=${v.length}`).join(' ')}; rios secos: ${riosSecos.map(l => l.length).join("/")}; lava: ${lava.map(l => l.length).join('/')} trechos de ${nasc.length} nascentes` };
}
