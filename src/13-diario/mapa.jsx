/* ============================================================
   MAPA — a página do mapa de Tagmar (15/11/2026)
   ============================================================
   Usuário: "transformá-lo em […] navegável e animado, mostrando onde os
   personagens estão […] os jogadores vão acompanhar onde seu personagem está,
   onde devem ir, sabendo distâncias, marcar interesses no mapa" e, depois,
   "deixar o mestre criar os pontos, os caminhos, as rotas, as cidades".

   TRÊS DECISÕES QUE EXPLICAM O ARQUIVO

   1. O chão é o MAPA VETORIAL de Tagmar inteiro (21/11/2026, usuário: "Podemos
      transformar nosso mapa em um tipo de arquivo [...] para ficar leve no
      nosso site e não perder resolução?" e "Na tela de mapa"): um SVG em
      public/mapa/tagmar.svg (~0,6 MB comprimido), nítido em qualquer zoom.
      Até então eram ladrilhos PNG da pintura oriental (só os Reinos).
      Por cima dele, os textos do mapa (mares, serras, rios, florestas…), que
      são locais do mundo com jeito de texto (21/11/2026, ver "O chão").

   2. Tudo é medido em UNIDADES DO MAPA (o viewBox do SVG, 5905,5 × 4695,1),
      não em pixels. O que estava gravado nas unidades da pintura antiga
      (1200 × 2000) foi convertido por scripts/mapa/migrar-vetorial.mjs. A
      régua: 365 unidades para 400 km (a dos Reinos dá 352 e a do Império 378
      no mapa novo; a média); daí KM.

   3. O MOTOR é imperativo (criarMotorMapa): arrastar e aproximar repintam
      a cada quadro, e passar isso pelo React custaria um render por pixel.
      O React monta a moldura, carrega e grava; o motor desenha dentro dela.

   O QUE VAI PARA O BANCO (scripts/sql/mapa-da-mesa-2026-11-15.sql)
     mapas_mesa.dados = { lugares, gente }   — só o Mestre grava
       lugares: [{ id, tipo: 'cidade'|'ponto', nome, x, y, p?, ficha? }]
                (p = já pintada; ficha = id da cidade na aba Cidades)
       gente:   { [personagem_id]: { x, y } }   — onde cada personagem está
     catalogo_mundo 'mapa'/'mundo'.dados = { slug, lugares, linhas } — só o Imperador
       linhas:  [{ id, tipo: 'caminho', nome, pts: [{x,y}] }]   — os caminhos (estradas), do mundo
     mapa_marcas.marcas = [{ id, nome, x, y, lugar? }]      — do personagem
   ============================================================ */

const MAPA_L = 5905.5, MAPA_A = 4695.1;
const MAPA_KM = 400 / 365;
/* "Perto" em unidades do mapa (~10 km): o lugar onde alguém está, o toque que
   acha um lugar. Era 4 na pintura antiga, onde 4 unidades davam 10 km. */
const MAPA_PERTO = 9;
/* O chão do plano material e os nomes da geografia (21/11/2026). */
const MAPA_PINTURA = '/mapa/tagmar.svg';
/* O chão de cada plano (23/11/2026). O infernal está em escala real — a mesma
   régua de km do material, com 1/4 da área — no meio da tela, cercado de rocha
   (scripts/mapa/infernal-app.mjs). O recorte [x0, y0, x1, y1] é onde o desenho
   está: a tela abre nele, e "mapa inteiro" volta para ele, não para a rocha. */
const MAPA_CHAO_PLANO = { infernal: '/mapa/infernal.svg' };
const MAPA_RECORTE = { infernal: [1476.38, 1173.73, 4429.13, 3521.36] };
/* O CHÃO EM LADRILHOS (23/11/2026, usuário: "o mapa do plano infernal está muito lento"). O
   infernal.svg inteiro (6,4 MB em poucos caminhos que cruzam a tela) fazia o navegador percorrer
   todos os traços a cada pedaço redesenhado no zoom. Ele vai em cols × linhas SVGs, cada um só com
   o que passa por ele (scripts/mapa/infernal-ladrilhos.mjs), e o navegador desenha só os à vista.
   Por baixo, o mapa inteiro em 2048 px (fundo): aparece na hora e cobre a fresta entre ladrilhos. */
const MAPA_LADRILHOS = { infernal: { pasta: '/mapa/infernal/', cols: 10, linhas: 8, sobra: 2, fundo: '/mapa/infernal-fundo.webp' } };
/* Suposição da tela, não regra do Tagmar: um dia de marcha a pé. */
const MAPA_KM_DIA_A_PE = 30;
/* A cavalo (22/11/2026, usuário: "mostre a distância à pé, à cavalo e voando
   (linha reta)"). Também suposição: os livros na pasta tagmar/ não trazem a
   marcha montada; o dobro da a pé, o comum em RPG. */
const MAPA_KM_DIA_A_CAVALO = 60;
/* Voando (22/11/2026, usuário: "Voando 1005km x dias"). Suposição também: o
   dobro do cavalo. */
const MAPA_KM_DIA_VOANDO = 120;
/* Navegando (22/11/2026, usuário: "Adicione também Navegando x km x dias").
   Suposição: um veleiro, ~100 km por dia. A água vem de public/mapa/agua.json
   (scripts/mapa/agua.mjs). */
const MAPA_KM_DIA_NAVEGANDO = 100;
const MAPA_AGUA = '/mapa/agua.json';
/* A NÉVOA (17/11/2026, usuário: "o jogador só vai conseguir ver um raio de
   100 km ao redor de seu personagem"). */
const MAPA_NEVOA_KM = 100;

/* As cidades que a pintura já traz escritas: o Mestre parte delas. */
const MAPA_PINTADAS = {
  'Saravossa':[486.7,417.3],'Malocai':[526.7,413.3],'Muli':[568.3,405],'Bassani':[456.7,438.3],'Omarge':[435,450.7],
  'Balistro':[418.3,459.3],'Porto Velho':[392.7,477.7],'Aradelis':[375.7,486],'Caleonir':[351.7,506.7],'Cipa':[436.7,515],
  'Torojai':[477.3,458.3],'Tória':[493.3,533.3],'Pórtis':[471.7,548.3],'Abrasil':[518.3,516.7],'Ambernita':[561.7,562.3],
  'Pontalina':[596.7,587.3],'Minas Mon':[390,556.7],'Porto Áureo':[306,589.3],'Palom':[335,578.3],'Alimar':[409.3,606.7],
  'Fleuter':[489.3,734.3],'Rokor':[311.7,739.3],'Virena':[591.7,466.7],'Torbel':[828.3,363.3],'Quizes':[695,402.7],
  'Ender':[706,449.3],'Zanta':[722.7,494],'Grabo':[769.3,505],'Mirval':[738.3,514.3],'Agrapia':[691.7,535],
  'Chats':[685,601.7],'Povarina':[725,595],'Pechara':[787.7,599.3],'Tanus':[861,493.3],'Estepe':[918.3,463.3],
  'Runa':[911.7,538.3],'Quessedir':[1000,561.7],'Estenorial':[836,616.7],'Maginor':[890,631.7],'Calisto':[851,648.3],
  'Rapso':[817.7,658.3],'Mutina':[702.3,654],'Capela':[655,671.7],'Litória':[795,718.3],'Franges':[940,695],
  'Varteli':[951.7,726.7],'Dariati':[906.7,727.3],'Lagia':[860,734],'Magiara':[796.7,745],'Porto Coral':[933.3,768.3],
  'Lubliama':[755,771.7],'Donatar':[463.3,1113.3],'Balinor':[493.3,1154.3],'Forte Galatel':[557.3,1165],'Beruni':[371.7,1034.3],
  'Sika':[435,985],'Altarape':[371.7,964.3],'Grima':[311.7,1116],'Marna':[520.7,1011.7],'Serfa':[588.3,1065],
  'Timor':[513.3,1254.3],'Eldair':[376.7,1222.3],'Crassia':[611.7,848.3],'Dameste':[390,830],'Ingru':[235,850],
};

/* O mapa de uma mesa que o Mestre ainda não tocou: VAZIO (21/11/2026, usuário:
   "Pare de criar cidades automáticas"). Até então nascia com as 65 cidades da
   pintura antiga (MAPA_PINTADAS, marcadas p: 1) — que não batem com a pintura
   nova e não eram da aba Cidades. Agora só entra no mapa o que alguém pôs. */
function mapaSemente() {
  return { lugares: [], linhas: [], rota: null, gente: {} };
}
// A cidade que a semente antiga criou sozinha: p: 1 e sem ficha ligada.
const mapaAutomatica = (l) => !!l && l.p === 1 && !l.ficha;
/* O que veio do banco, com as quatro chaves no lugar. Linha vazia = semente
   (vazia); as cidades automáticas que ficaram gravadas não voltam. */
function mapaNormalizar(dados, plano = 'material') {
  if (!dados || !Array.isArray(dados.lugares)) return mapaSemente();
  return {
    lugares: dados.lugares.filter((l) => !mapaAutomatica(l)),
    linhas: Array.isArray(dados.linhas) ? dados.linhas : [],
    rota: dados.rota || null,
    gente: (dados.gente && typeof dados.gente === 'object') ? dados.gente : {},
  };
}

/* ── Contas puras (testadas em mapa.test.js) ── */
const mapaDist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mapaKm = (u) => Math.round(u * MAPA_KM / 5) * 5;
const mapaComprimento = (pts) => pts.slice(1).reduce((t, p, i) => t + mapaDist(pts[i], p), 0);
/* O ponto da linha mais perto de p: { d, i (trecho), q (o ponto) }. */
function mapaProjeta(p, pts) {
  let m = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dy = b.y - a.y, c = dx * dx + dy * dy;
    const t = c ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / c)) : 0;
    const q = { x: a.x + dx * t, y: a.y + dy * t }, d = mapaDist(p, q);
    if (!m || d < m.d) m = { d, i, q };
  }
  return m;
}
/* OS CAMINHOS SÃO DO MUNDO (21/11/2026). Primeiro o usuário pediu "Eu quero
   que exista apenas rota, e ela é global" (só o Imperador traça; saiu a rota
   da mesa com destino e km andados) e depois explicou: "Existe a estrada
   fixa, e existe a rota. A rota só é definida quando eu escolho origem e
   destino [...] Mas o caminho, antes de definir a rota, precisa existir."
   Então o que se traça é o CAMINHO — a estrada — e mora na camada do mundo
   (dados.linhas), em toda mesa e fora delas. A rota de origem a destino,
   que andaria por eles, fica para depois.
   COMO A ESTRADA DO GOOGLE MAPS ("quando der zoom, ela diminui até
   desaparecer"; "Eu quero a rota mais fina"): miolo branco, borda cinza;
   ao afastar, afina, perde o miolo, vira um fio cinza e some
   (mapaCaminhoNaTela, mapa.css).
   OS CAMINHOS SE LIGAM ("Criei duas rotas, mas elas não se conectam"): o
   ponto tocado perto de outro caminho gruda nele — num ponto dele ou no meio
   de um trecho, que ganha o ponto —, e o ponto que dois caminhos dividem anda
   junto nos dois. É a malha por onde a rota vai passar. */
function mapaCaminhoNaTela(kmPorPx) {
  const z = -Math.log2(kmPorPx);                       // ~-2 com o mapa inteiro, ~4,6 no zoom máximo
  // de perto 5px (com miolo), de longe 1,2px (só o fio), e some
  const largura = Math.max(1.2, Math.min(5, 2 + z * 0.7));
  const opacidade = Math.max(0, Math.min(1, (z + 1.4) / 0.7));
  return { largura: Math.round(largura * 10) / 10, opacidade: Math.round(opacidade * 100) / 100 };
}

/* A ROTA DE ORIGEM A DESTINO PELOS CAMINHOS (21/11/2026, usuário: "Vamos
   criar uma forma de encontrar a rota para determinada origem e destino").
   Os caminhos viram uma malha: cada ponto é um nó, cada trecho uma aresta, e
   o ponto que dois caminhos dividem (mesma coordenada, ao décimo) liga os
   dois. A EMENDA (mesmo dia, usuário: "Parece que as rotas não estão
   conectadas"): no desenho, dois caminhos que se CRUZAM sem um ponto em comum
   e a PONTA de um caminho que para a menos de `emenda` (~2 km) de outro
   pareciam ligados e não estavam — agora a malha os liga: o cruzamento vira
   nó dos dois, e a ponta ganha uma ponte até o ponto mais perto do outro.
   Vale também DENTRO do mesmo caminho (o Caminho 4 do usuário dá a volta e
   termina colado nele mesmo, perto de Torojai): só os trechos vizinhos da
   própria ponta ficam de fora.
   A CIDADE É ENTRONCAMENTO (mesmo dia, usuário: "Entre Saravossa e Saupami,
   porque você está me dando um caminho mais longe?" — Saravossa fica na ponta
   de um caminho e a ~5 km de outro, e só entrava pelo mais perto). A origem,
   o destino e cada uma das `cidades` ligam-se ao ponto mais perto de CADA
   caminho que passa a até `perto` deles; o trecho até lá conta como fora da
   estrada. Sem `perto` (Infinity), a origem e o destino entram só pelo
   caminho mais perto, e as cidades não entram. O menor trajeto sai do Dijkstra.
   SEM CAMINHO, UMA ROTA SUGERIDA (22/11/2026, usuário: "Eu quero ver todas
   as opções, mesmo que não há caminho disponível, indique um caminho
   qualquer"): quando nada liga as pontas pela estrada — ou uma delas fica a
   mais de `perto` de qualquer caminho (longe: 'a'|'b') —, cada pedaço solto
   da malha ganha uma travessia fora da estrada até o ponto mais perto de cada
   outro pedaço (as pontas inclusive), e o trajeto usa os caminhos que existem
   e completa o resto por fora. Fora da estrada pesa MAPA_FORA (1,5×) na
   escolha, para a rota preferir a estrada; os km devolvidos são os reais.
   Sem nenhum caminho, a sugestão é a linha reta.
   { pts: o trajeto inteiro, partes: [{ fora, pts }] para desenhar, estrada:
     os pontos entre as pontas, naEstrada e foraDaEstrada (unidades do mapa),
     sugerida?: true e longe? quando não houve caminho contínuo } */
/* ESTRADA PRIMEIRO (22/11/2026, usuário: "Sempre que houver uma estrada
   próxima, use-a para traçar a rota, mesmo que ela não leve necessariamente
   ao destino, pois viajar pela estrada é mais seguro"): fora da estrada pesa
   3× (era 1,5×). Só se corta por fora quando a estrada dá uma volta 3 vezes
   maior.
   ESTRADA E BARCO, E MAIS DE UMA SUGESTÃO (mesmo dia: "Saindo de Saravossa até
   a Cidade Dourada não teria vantagens indo pelo Lago Denégrio, como parte do
   caminho? Dê pelo menos duas sugestões de rota"). mapaSugestoesDeRota monta a
   malha uma vez e devolve: a rota pela estrada; a de estrada e barco (embarca
   numa cidade a até 3 células da água, MAPA_EMBARQUE de espera, e a água anda
   na razão da velocidade: 30 a pé ÷ 100 navegando); e uma alternativa por
   terra que evita os trechos da primeira. As duas últimas só entram quando
   dão um trajeto diferente. O custo é em "dias a pé"; os km são os reais. */
const MAPA_EMENDA = 2;
const MAPA_FORA = 3;
const MAPA_EMBARQUE = 15 / MAPA_KM;   // meio dia a pé, em unidades do mapa
const MAPA_AGUA_PESO = MAPA_KM_DIA_A_PE / MAPA_KM_DIA_NAVEGANDO;
/* O menor caminho numa malha qualquer (heap binário). vizinhos(k, cb(v, custo));
   h(k): uma estimativa que nunca passa do custo que falta (A*), ou 0. */
function mapaMenorCaminho(inicio, fim, vizinhos, h = () => 0) {
  const dist = new Map([[inicio, 0]]), de = new Map(), fechado = new Set(), heap = [[h(inicio), inicio]];
  const sobe = (x) => { while (x) { const p = (x - 1) >> 1; if (heap[p][0] <= heap[x][0]) break; [heap[p], heap[x]] = [heap[x], heap[p]]; x = p; } };
  const desce = (x) => { for (;;) { const l = 2 * x + 1, r = l + 1; let m = x;
    if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
    if (m === x) break; [heap[m], heap[x]] = [heap[x], heap[m]]; x = m; } };
  while (heap.length) {
    const [, k] = heap[0], u = heap.pop(); if (heap.length) { heap[0] = u; desce(0); }
    if (fechado.has(k)) continue; fechado.add(k);
    if (k === fim) break;
    const dk = dist.get(k);
    vizinhos(k, (v, c) => { if (fechado.has(v)) return; const nd = dk + c;
      if (nd < (dist.has(v) ? dist.get(v) : Infinity)) { dist.set(v, nd); de.set(v, k); heap.push([nd + h(v), v]); sobe(heap.length - 1); } });
  }
  if (!fechado.has(fim)) return null;
  const passos = []; for (let k = fim; k !== undefined; k = de.get(k)) passos.unshift(k);
  return passos;
}

function mapaSugestoesDeRota(linhas, a, b, op = {}) {
  const perto = op.perto != null ? op.perto : Infinity, emenda = op.emenda != null ? op.emenda : MAPA_EMENDA;
  const cidades = op.cidades || [], agua = op.agua || null, lagos = op.lagos || [];
  const chave = (p) => Math.round(p.x * 10) + ',' + Math.round(p.y * 10);
  const nos = new Map();
  const no = (p) => { const k = chave(p); if (!nos.has(k)) nos.set(k, { p: { x: p.x, y: p.y }, viz: new Map() }); return k; };
  const liga = (k1, k2) => { if (k1 === k2) return; const n1 = nos.get(k1), n2 = nos.get(k2), d = mapaDist(n1.p, n2.p);
    if (!n1.viz.has(k2) || n1.viz.get(k2) > d) { n1.viz.set(k2, d); n2.viz.set(k1, d); } };
  // Os trechos de cada caminho, com os pontos onde outro caminho os corta ou encosta.
  const segs = [];
  (linhas || []).forEach((ln, c) => { const pts = ln.pts || [];
    for (let i = 0; i < pts.length - 1; i++) if (mapaDist(pts[i], pts[i + 1]) > 0) segs.push({ c, i, p: pts[i], q: pts[i + 1], cortes: [] }); });
  const pontes = [];
  const cruza = (s, u) => {
    const rx = s.q.x - s.p.x, ry = s.q.y - s.p.y, sx = u.q.x - u.p.x, sy = u.q.y - u.p.y, den = rx * sy - ry * sx;
    if (!den) return null;
    const qx = u.p.x - s.p.x, qy = u.p.y - s.p.y, t1 = (qx * sy - qy * sx) / den, t2 = (qx * ry - qy * rx) / den;
    return t1 > 0 && t1 < 1 && t2 > 0 && t2 < 1 ? { t1, t2, x: s.p.x + rx * t1, y: s.p.y + ry * t1 } : null;
  };
  const tDe = (s, x) => { const dx = s.q.x - s.p.x, dy = s.q.y - s.p.y; return ((x.x - s.p.x) * dx + (x.y - s.p.y) * dy) / (dx * dx + dy * dy); };
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    if (segs[i].c === segs[j].c && Math.abs(segs[i].i - segs[j].i) <= 1) continue;   // trechos vizinhos sempre se tocam
    const x = cruza(segs[i], segs[j]);
    if (x) { const p = { x: x.x, y: x.y }; segs[i].cortes.push({ t: x.t1, p }); segs[j].cortes.push({ t: x.t2, p }); }
  }
  // A ponta solta perto de outro caminho: ponte até o ponto mais perto dele.
  (linhas || []).forEach((ln, c) => { const pts = ln.pts || []; if (pts.length < 2) return;
    // no próprio caminho, longe da ponta: a volta que termina nele mesmo
    const longeDaPonta = (s, fim) => s.c !== c || (fim ? mapaComprimento(pts.slice(s.i + 1)) : mapaComprimento(pts.slice(0, s.i + 1))) > 3 * emenda;
    [pts[0], pts[pts.length - 1]].forEach((v, fim) => {
      const melhor = new Map();   // por caminho: o trecho mais perto
      segs.forEach((s) => { if (!longeDaPonta(s, fim)) return; const pr = mapaProjeta(v, [s.p, s.q]);
        if (pr.d <= emenda && (!melhor.has(s.c) || pr.d < melhor.get(s.c).d)) melhor.set(s.c, { s, d: pr.d, q: pr.q }); });
      melhor.forEach(({ s, q }) => { const t = tDe(s, q); if (t > 0 && t < 1) s.cortes.push({ t, p: q }); pontes.push([v, (t <= 0 ? s.p : t >= 1 ? s.q : q)]); });
    }); });
  // Os entroncamentos: a origem (A), o destino (B) e as cidades (C…).
  const raio = Number.isFinite(perto) ? perto : 0;
  const centros = [{ k: 'A', p: a }, { k: 'B', p: b }, ...(raio ? (cidades || []).map((c, i) => ({ k: 'C' + i, p: c })) : [])];
  const acessos = [];
  let longe = null;
  for (const h of centros) {
    const porCaminho = new Map();   // por caminho: o trecho mais perto
    segs.forEach((s) => { const pr = mapaProjeta(h.p, [s.p, s.q]); if (!porCaminho.has(s.c) || pr.d < porCaminho.get(s.c).d) porCaminho.set(s.c, { s, d: pr.d, q: pr.q }); });
    const todos = [...porCaminho.values()].sort((x, y) => x.d - y.d);
    if (h.k.length === 1 && (!todos.length || todos[0].d > perto)) { longe = longe || (h.k === 'A' ? 'a' : 'b'); continue; }   // fica de fora; a sugestão o liga
    const usa = todos.filter((x, i) => x.d <= raio || (i === 0 && h.k.length === 1 && !raio));
    usa.forEach(({ s, q }) => { const t = tDe(s, q); if (t > 0 && t < 1) s.cortes.push({ t, p: q }); acessos.push([h, t <= 0 ? s.p : t >= 1 ? s.q : q]); });
  }
  // A malha: cada trecho partido nos cortes, e as pontes.
  segs.forEach((s) => {
    const seq = [s.p, ...s.cortes.sort((x, y) => x.t - y.t).map((x) => x.p), s.q];
    for (let i = 0; i < seq.length - 1; i++) { const k1 = no(seq[i]), k2 = no(seq[i + 1]); if (k1 !== k2) liga(k1, k2); }
  });
  pontes.forEach(([v, w]) => liga(no(v), no(w)));
  centros.forEach((h) => nos.set(h.k, { p: { x: h.p.x, y: h.p.y }, viz: new Map() }));
  acessos.forEach(([h, q]) => liga(h.k, no(q)));
  const ehCentro = (k) => /^[ABC]/.test(k);
  // Os pedaços soltos da malha ganham travessias fora da estrada entre si (as cidades isoladas não contam).
  const travessias = new Set();
  {
    const pedaco = new Map(); let n = 0;
    for (const k0 of nos.keys()) {
      if (pedaco.has(k0) || (/^C/.test(k0) && !nos.get(k0).viz.size)) continue;
      const fila = [k0]; pedaco.set(k0, n);
      while (fila.length) { const k = fila.pop(); nos.get(k).viz.forEach((_, v) => { if (!pedaco.has(v)) { pedaco.set(v, n); fila.push(v); } }); }
      n++;
    }
    const grupos = Array.from({ length: n }, () => []);
    pedaco.forEach((g, k) => grupos[g].push(k));
    for (let g1 = 0; g1 < n; g1++) for (let g2 = g1 + 1; g2 < n; g2++) {
      let m = null, md = Infinity;
      for (const k1 of grupos[g1]) { const p1 = nos.get(k1).p;
        for (const k2 of grupos[g2]) { const p2 = nos.get(k2).p, d = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2; if (d < md) { md = d; m = [k1, k2]; } } }
      if (!m) continue;
      const d = Math.sqrt(md), n1 = nos.get(m[0]), n2 = nos.get(m[1]);
      if (!n1.viz.has(m[1]) || n1.viz.get(m[1]) > d) { n1.viz.set(m[1], d); n2.viz.set(m[0], d); }
      travessias.add(m[0] + '|' + m[1]); travessias.add(m[1] + '|' + m[0]);
    }
  }
  const ehFora = (k1, k2) => ehCentro(k1) || ehCentro(k2) || travessias.has(k1 + '|' + k2);
  // A água: as pontas e as cidades com porto embarcam na célula de água mais perto.
  const portoDe = new Map(), noPorto = new Map();
  if (agua) {
    const { cel, nx, ny, celulas } = agua;
    centros.forEach((h) => {
      const ci = Math.floor(h.p.x / cel), cj = Math.floor(h.p.y / cel); let m = null, md = Infinity;
      for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) { const i = ci + di, jj = cj + dj;
        if (i < 0 || jj < 0 || i >= nx || jj >= ny || celulas[jj * nx + i] !== 1) continue;
        const d = Math.hypot((i + 0.5) * cel - h.p.x, (jj + 0.5) * cel - h.p.y); if (d < md) { md = d; m = jj * nx + i; } }
      if (m !== null) { portoDe.set(h.k, { w: 'W' + m, d: md, corpo: mapaCorposDeAgua(agua)[m], p: h.p }); if (!noPorto.has('W' + m)) noPorto.set('W' + m, []); noPorto.get('W' + m).push({ k: h.k, d: md }); }
    });
  }
  const posDe = (k) => { if (k[0] !== 'W') return nos.get(k).p; const c = +k.slice(1); return { x: (c % agua.nx + 0.5) * agua.cel, y: (Math.floor(c / agua.nx) + 0.5) * agua.cel }; };
  // penal: os pontos de uma rota anterior, que custam `fator` vezes mais (para achar outra)
  // regiao(c): só as células de água que ela aceita (a volta da rota pelo lago fica no lago)
  const busca = (comAgua, penal, corpo, fator = 1, de = 'A', ate = 'B', regiao = null) => mapaMenorCaminho(de, ate, (k0, cb0) => {
    const k = k0, cb = penal ? (v, c) => cb0(v, penal.has(v) ? c * fator : c) : cb0;
    if (k[0] === 'W') {
      const { cel, nx, ny, celulas } = agua, c = +k.slice(1), i = c % nx, jj = Math.floor(c / nx);
      const ok = (x, y) => x >= 0 && y >= 0 && x < nx && y < ny && celulas[y * nx + x] === 1;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        if (!ok(i + di, jj + dj) || (di && dj && (!ok(i + di, jj) || !ok(i, jj + dj)))) continue;
        if (regiao && !regiao((jj + dj) * nx + i + di)) continue;
        cb('W' + ((jj + dj) * nx + i + di), (di && dj ? Math.SQRT2 : 1) * cel * MAPA_AGUA_PESO);
      }
      (noPorto.get(k) || []).forEach(({ k: hk, d }) => cb(hk, d + MAPA_EMBARQUE));
      return;
    }
    nos.get(k).viz.forEach((d, v) => cb(v, d * (ehFora(k, v) ? MAPA_FORA : 1)));
    if (comAgua && portoDe.has(k)) { const pt = portoDe.get(k); if ((corpo == null || pt.corpo === corpo) && (!regiao || regiao(+pt.w.slice(1)))) cb(pt.w, pt.d + MAPA_EMBARQUE); }
  }, (k) => mapaDist(posDe(k), posDe(ate)) * (comAgua ? MAPA_AGUA_PESO : 1));
  // Uma sugestão a partir dos passos: partes por modo (estrada, fora, agua) e os km de cada.
  const montar = (passos, tipo) => {
    if (!passos) return null;
    const partes = []; let terra = 0, fora = 0, naAgua = 0, cruzou = false;
    for (let i = 1; i < passos.length; i++) {
      const k1 = passos[i - 1], k2 = passos[i], p1 = posDe(k1), p2 = posDe(k2), d = mapaDist(p1, p2);
      const modo = k1[0] === 'W' && k2[0] === 'W' ? 'agua' : (k1[0] === 'W' || k2[0] === 'W' || ehFora(k1, k2)) ? 'fora' : 'estrada';
      if (travessias.has(k1 + '|' + k2)) cruzou = true;
      if (modo === 'agua') naAgua += d; else if (modo === 'fora') fora += d; else terra += d;
      const ult = partes[partes.length - 1];
      if (ult && ult.modo === modo) ult.pts.push({ ...p2 }); else partes.push({ modo, pts: [{ ...p1 }, { ...p2 }] });
    }
    const pts = [{ ...posDe(passos[0]) }]; partes.forEach((p) => pts.push(...p.pts.slice(1)));
    const s = { tipo, passos, partes, pts, naEstrada: terra, foraDaEstrada: fora, naAgua, estrada: passos.slice(1, -1).map((k) => ({ ...posDe(k) })) };
    if (cruzou || longe) { s.sugerida = true; if (longe) s.longe = longe; }
    return s;
  };
  const kmDe = (s) => s.naEstrada + s.foraDaEstrada + s.naAgua;
  function igual(s1, s2) { const u = new Set(s1.passos); const comum = s2.passos.filter((k) => u.has(k)).length; return comum / Math.max(s1.passos.length, s2.passos.length) > 0.85; }
  const primeira = montar(busca(false), 'estrada');
  const lista = [primeira];
  /* De barco: uma sugestão por água que fica no caminho (o mar, o Lago Denégrio…), a mais rápida
     primeiro. "No caminho" = com algum porto a até metade da distância da reta entre as pontas. */
  if (agua) {
    const reta = mapaDist(a, b), corpos = new Set();
    portoDe.forEach((pt) => { if (mapaProjeta(pt.p, [a, b]).d <= Math.max(reta * 0.5, 100)) corpos.add(pt.corpo); });
    const barcos = [];
    for (const corpo of corpos) {
      const s = montar(busca(true, null, corpo), 'barco');
      if (s && s.naAgua > 0 && !barcos.some((x) => igual(x, s))) { s.corpo = corpo; barcos.push(s); }
    }
    /* PELOS LAGOS DO CAMINHO (usuário: "não teria vantagens indo pelo Lago
       Denégrio?"): cada lago escrito perto da reta entre as pontas vira uma
       sugestão que passa por ele — de A até a água do lago, e dela até B. */
    const celulaDe = (p) => { const { cel, nx, ny, celulas } = agua, ci = Math.floor(p.x / cel), cj = Math.floor(p.y / cel); let m = null, md = Infinity;
      for (let dj = -6; dj <= 6; dj++) for (let di = -6; di <= 6; di++) { const i = ci + di, jj = cj + dj;
        if (i < 0 || jj < 0 || i >= nx || jj >= ny || celulas[jj * nx + i] !== 1) continue;
        const d = Math.hypot(di, dj); if (d < md) { md = d; m = jj * nx + i; } }
      return m === null ? null : 'W' + m; };
    lagos.filter((l) => mapaProjeta(l, [a, b]).d <= Math.max(reta * 0.5, 100))
      .sort((x, y) => mapaProjeta(x, [a, b]).d - mapaProjeta(y, [a, b]).d).slice(0, 2).forEach((l) => {
        const w = celulaDe(l); if (!w) return;
        // vai de barco até o lago; a volta só navega no próprio lago (até 300 unidades do nome dele), desembarca numa margem e segue por terra
        const noLago = (c) => Math.hypot((c % agua.nx + 0.5) * agua.cel - l.x, (Math.floor(c / agua.nx) + 0.5) * agua.cel - l.y) <= 300;
        const ida = busca(true, null, null, 1, 'A', w), volta = ida && busca(true, null, null, 1, w, 'B', noLago);
        const s = ida && volta && montar([...ida, ...volta.slice(1)], 'barco');
        if (s && s.naAgua > 0) { s.via = l.nome; if (!barcos.some((x) => igual(x, s))) barcos.push(s); else { const x = barcos.find((y) => igual(y, s)); x.via = x.via || l.nome; } }
      });
    const tempo = (s) => (s.naEstrada + s.foraDaEstrada) + s.naAgua * MAPA_AGUA_PESO;
    /* O LAGO SÓ QUANDO COMPENSA (22/11/2026, usuário mostrou Citira → Saravossa: a
       sugestão "pelo Lago Denégrio" subia a costa, entrava no lago só para passar
       por ele e voltava a pé por Filanti e Azanti — 88 dias contra 29). A sugestão
       forçada por um lago entra só se ficar até 30% mais lenta que a melhor rota. */
    const melhor = Math.min(tempo(primeira), ...barcos.filter((s) => !s.via).map(tempo));
    barcos.filter((s) => !s.via || tempo(s) <= melhor * 1.3)
      .sort((x, y) => tempo(x) - tempo(y)).slice(0, 3).forEach((s) => lista.push(s));
  }
  // a alternativa por terra: os trechos da primeira ficam mais caros
  for (const fator of op.rapida ? [] : [2, 4]) {
    if (lista.length >= 4) break;
    const alt = montar(busca(false, new Set(primeira.passos.slice(2, -2)), null, fator), 'alternativa');
    if (alt && !igual(primeira, alt) && Math.abs(kmDe(alt) - kmDe(primeira)) > 0.01 * kmDe(primeira)) { lista.push(alt); break; }
  }
  return lista;
}

/* O ITINERÁRIO COM PARADAS (22/11/2026, usuário: "dá pra ir de Saravossa até a
   Cidade Dourada passando pelo rio Frefo, pegando o lago Denégrio, depois rio
   Belrra, depois indo a pé passando pela floresta de Melram e Brindel").
   `pontos` = [origem, ...paradas, destino]; cada trecho sai de
   mapaSugestoesDeRota (modo rápido). Devolve duas sugestões: cada trecho pelo
   jeito mais rápido (estrada, barco ou a pé) e só por terra. */
function mapaItinerario(linhas, pontos, op = {}) {
  const tempo = (s) => (s.naEstrada + s.foraDaEstrada) + s.naAgua * MAPA_AGUA_PESO;
  const juntar = (trechos, tipo) => {
    const s = { tipo, partes: [], pts: [], passos: [], naEstrada: 0, foraDaEstrada: 0, naAgua: 0, estrada: [] };
    trechos.forEach((t, i) => {
      s.partes.push(...t.partes); s.pts.push(...(i ? t.pts.slice(1) : t.pts)); s.passos.push(...t.passos.map((k) => i + ':' + k));
      s.naEstrada += t.naEstrada; s.foraDaEstrada += t.foraDaEstrada; s.naAgua += t.naAgua; s.estrada.push(...t.estrada);
      if (t.sugerida) s.sugerida = true;
    });
    return s;
  };
  const rapido = [], terra = [];
  for (let i = 1; i < pontos.length; i++) {
    const lista = mapaSugestoesDeRota(linhas, pontos[i - 1], pontos[i], { ...op, lagos: [], rapida: true });
    terra.push(lista[0]);
    rapido.push(lista.slice().sort((x, y) => tempo(x) - tempo(y))[0]);
  }
  const r = juntar(rapido, 'paradas'), t = juntar(terra, 'paradas-terra');
  return r.naAgua > 0 ? [r, t] : [r];
}

/* A rota pela estrada, no formato de antes (partes com `fora`): a primeira sugestão. */
function mapaRotaPelosCaminhos(linhas, a, b, perto = Infinity, emenda = MAPA_EMENDA, cidades = []) {
  const s = mapaSugestoesDeRota(linhas, a, b, { perto, emenda, cidades })[0];
  return { ...s, partes: s.partes.map((p) => ({ fora: p.modo !== 'estrada', pts: p.pts })) };
}

/* A VIAGEM POR ÁGUA (22/11/2026). `agua`: { cel, nx, ny, celulas: Uint8Array
   (1 = água) }. Cada ponta embarca na água mais perto, até `porto` células
   dela (a cidade da costa); a travessia é o menor caminho pela grade (8
   vizinhos, A*), sem passar por terra. Devolve { pts, comprimento } em
   unidades do mapa, ou null quando uma ponta não tem água perto ou as duas
   águas não se ligam (um lago fechado e o mar, por exemplo). */
function mapaNavegacao(agua, a, b, porto = 3) {
  if (!agua) return null;
  const { cel, nx, ny, celulas } = agua;
  const ehAgua = (i, j) => i >= 0 && j >= 0 && i < nx && j < ny && celulas[j * nx + i] === 1;
  const embarque = (p) => {
    const ci = Math.floor(p.x / cel), cj = Math.floor(p.y / cel);
    let m = null, md = Infinity;
    for (let dj = -porto; dj <= porto; dj++) for (let di = -porto; di <= porto; di++) {
      const i = ci + di, j = cj + dj; if (!ehAgua(i, j)) continue;
      const d = Math.hypot((i + 0.5) * cel - p.x, (j + 0.5) * cel - p.y);
      if (d < md) { md = d; m = j * nx + i; }
    }
    return m === null ? null : { k: m, d: md };
  };
  const ea = embarque(a), eb = embarque(b);
  if (!ea || !eb) return null;
  const N = nx * ny, g = new Float64Array(N).fill(Infinity), de = new Int32Array(N).fill(-1), fechado = new Uint8Array(N);
  const bi = eb.k % nx, bj = Math.floor(eb.k / nx);
  const h = (k) => { const dx = Math.abs(k % nx - bi), dy = Math.abs(Math.floor(k / nx) - bj); return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy); };
  // fila de prioridade (heap binário) por f = g + h
  const heap = [], f = new Float64Array(N);
  const sobe = (x) => { while (x) { const p = (x - 1) >> 1; if (f[heap[p]] <= f[heap[x]]) break; [heap[p], heap[x]] = [heap[x], heap[p]]; x = p; } };
  const desce = (x) => { for (;;) { const l = 2 * x + 1, r = l + 1; let m = x;
    if (l < heap.length && f[heap[l]] < f[heap[m]]) m = l; if (r < heap.length && f[heap[r]] < f[heap[m]]) m = r;
    if (m === x) break; [heap[m], heap[x]] = [heap[x], heap[m]]; x = m; } };
  const poe = (k) => { heap.push(k); sobe(heap.length - 1); };
  const tira = () => { const t = heap[0], u = heap.pop(); if (heap.length) { heap[0] = u; desce(0); } return t; };
  g[ea.k] = 0; f[ea.k] = h(ea.k); poe(ea.k);
  const VIZ = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
  while (heap.length) {
    const k = tira(); if (fechado[k]) continue; fechado[k] = 1;
    if (k === eb.k) break;
    const i = k % nx, jj = Math.floor(k / nx);
    for (const [di, dj, c] of VIZ) {
      const i2 = i + di, j2 = jj + dj; if (!ehAgua(i2, j2)) continue;
      if (di && dj && (!ehAgua(i + di, jj) || !ehAgua(i, jj + dj))) continue;   // não corta quina de terra
      const k2 = j2 * nx + i2, ng = g[k] + c;
      if (ng < g[k2]) { g[k2] = ng; de[k2] = k; f[k2] = ng + h(k2); poe(k2); }
    }
  }
  if (!fechado[eb.k]) return null;
  const pts = []; for (let k = eb.k; k !== -1; k = de[k]) pts.unshift({ x: (k % nx + 0.5) * cel, y: (Math.floor(k / nx) + 0.5) * cel });
  return { pts: [{ x: a.x, y: a.y }, ...pts, { x: b.x, y: b.y }], comprimento: g[eb.k] * cel + ea.d + eb.d };
}
/* Cada água separada (o mar, cada lago fechado) ganha um número: corpos[k]. */
function mapaCorposDeAgua(agua) {
  if (agua.corpos) return agua.corpos;
  const { nx, ny, celulas } = agua, corpos = new Int32Array(nx * ny).fill(-1); let n = 0;
  for (let k0 = 0; k0 < nx * ny; k0++) {
    if (celulas[k0] !== 1 || corpos[k0] >= 0) continue;
    const pilha = [k0]; corpos[k0] = n;
    while (pilha.length) { const k = pilha.pop(), i = k % nx, jj = (k - i) / nx;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const i2 = i + di, j2 = jj + dj, k2 = j2 * nx + i2;
        if (i2 >= 0 && j2 >= 0 && i2 < nx && j2 < ny && celulas[k2] === 1 && corpos[k2] < 0) { corpos[k2] = n; pilha.push(k2); } } }
    n++;
  }
  agua.corpos = corpos; return corpos;
}
// O agua.json (bits em base64) para a grade que mapaNavegacao lê.
function mapaAguaDe(j) {
  const s = atob(j.bits), celulas = new Uint8Array(j.nx * j.ny);
  for (let k = 0; k < celulas.length; k++) celulas[k] = (s.charCodeAt(k >> 3) >> (k & 7)) & 1;
  return { cel: j.cel, nx: j.nx, ny: j.ny, celulas };
}

/* ── OS PLANOS (17/11/2026) ────────────────────────────────────────────────
   Usuário: "O mapa atual é do plano material, teremos um mapa para o plano
   celestial, plano infernal. O jogador só vê o mapa do plano em que ele está."
   Escolhas: fundo liso por enquanto (sem pintura), o Mestre põe cada
   personagem num plano, e os lugares são do mundo e da mesa, como no material.

   No banco, mapas_mesa.dados continua sendo o plano material (lugares,
   linhas, rota, gente), e os outros moram em dados.planos[plano], com as
   mesmas quatro chaves. A camada do mundo de cada plano é uma linha de
   catalogo_mundo (tipo 'mapa'): 'mundo', 'mundo-celestial', 'mundo-infernal'.
   Cada personagem está num plano só: pô-lo num plano o tira dos outros. */
const MAPA_PLANOS = [
  { id: 'material', pt: 'Material', en: 'Material', ic: 'ti-world' },
  { id: 'celestial', pt: 'Celestial', en: 'Celestial', ic: 'ti-sun' },
  { id: 'infernal', pt: 'Infernal', en: 'Infernal', ic: 'ti-flame' },
];
const mapaSlugMundo = (plano) => (!plano || plano === 'material' ? 'mundo' : 'mundo-' + plano);
/* O pedaço de um plano dentro de dados (null = a mesa ainda não tem mapa). */
function mapaDoPlano(dados, plano) {
  if (!plano || plano === 'material') {
    if (!dados) return null;
    const { planos: _p, ...raiz } = dados;
    return raiz;
  }
  const p = dados && dados.planos && dados.planos[plano];
  return p || { lugares: [], linhas: [], rota: null, gente: {} };
}
/* Dados inteiros com o plano trocado; quem está neste plano sai dos outros. */
function mapaComPlano(dados, plano, sub) {
  const base = dados && typeof dados === 'object' ? dados : {};
  const planos = { ...(base.planos || {}) };
  let raiz = { ...base }; delete raiz.planos;
  const material = !plano || plano === 'material';
  if (material) raiz = { ...raiz, ...sub }; else planos[plano] = sub;
  const aqui = Object.keys((sub && sub.gente) || {});
  if (aqui.length) {
    const tirar = (g) => { if (!g || typeof g !== 'object') return g; const n = { ...g }; aqui.forEach((id) => { delete n[id]; }); return n; };
    if (!material && raiz.gente) raiz.gente = tirar(raiz.gente);
    Object.keys(planos).forEach((k) => { if (k !== plano && planos[k]) planos[k] = { ...planos[k], gente: tirar(planos[k].gente) || {} }; });
  }
  return Object.keys(planos).length ? { ...raiz, planos } : raiz;
}
/* Em que plano o personagem está: onde ele tem posição; sem posição, o material. */
function mapaPlanoDe(dados, pjId) {
  if (!dados || pjId == null) return 'material';
  const k = String(pjId);
  if (dados.gente && dados.gente[k]) return 'material';
  const ps = dados.planos || {};
  for (const p of Object.keys(ps)) if (ps[p] && ps[p].gente && ps[p].gente[k]) return p;
  return 'material';
}

/* ============================================================
   O MOTOR — desenha e escuta dentro da moldura que o React montou
   ============================================================
   cfg: { papel: 'mestre'|'jogador', en, base (URL do SVG do chão),
          mesa, marcas, gente: [{ id, nome, foto, eu }],
          aoMudarMesa(dados), aoMudarMarcas(marcas) }
   devolve { receber(dados), buscar(texto), falhou(), destruir() } */
function criarMotorMapa(raiz, cfg) {
  const L = MAPA_L, A = MAPA_A, dist = mapaDist, km = mapaKm, caminho = mapaComprimento, projeta = mapaProjeta;
  const en = !!cfg.en, mestre = cfg.papel === 'mestre';
  const tr = (pt, ing) => (en ? ing : pt);
  const $ = (n) => raiz.querySelector('[data-el="' + n + '"]');
  const elMapa = $('mapa'), elMundo = $('mundo'), elMk = $('marcadores');
  const limpezas = [];
  const ouvir = (alvo, tipo, fn, op) => { alvo.addEventListener(tipo, fn, op); limpezas.push(() => alvo.removeEventListener(tipo, fn, op)); };

  const plano = cfg.plano || 'material';
  elMapa.setAttribute('data-plano', plano);
  let mesa = mapaNormalizar(cfg.mesa, plano);
  let marcas = Array.isArray(cfg.marcas) ? cfg.marcas : [];
  const gente = cfg.gente || [];
  /* A CAMADA DO MUNDO (15/11/2026, usuário: "Mas porque eu preciso entrar em
     uma mesa, se o ambientação é global?"). As cidades e os locais que o
     Imperador põe no mapa são do mundo (catalogo_mundo, tipo 'mapa') e
     aparecem em toda mesa. Ao abrir, entram em mesa.lugares marcados `mundo`;
     ao gravar, saem de novo — a mesa guarda só o que é dela (pontos, rotas,
     caminhos, onde está cada um). Um lugar da mesa ligado à mesma ficha de um
     do mundo dá lugar ao do mundo. */
  const imperador = !!cfg.imperador;
  let mundo = Array.isArray(cfg.mundo) ? cfg.mundo : [];
  let rotas = Array.isArray(cfg.rotas) ? cfg.rotas : [];
  let ultimoMundo = JSON.stringify({ lugares: mundo, linhas: rotas });
  const juntarMundo = () => {
    const doMundo = mundo.map((l) => ({ ...l, mundo: true }));
    const jaNoMundo = new Set(doMundo.filter((l) => l.ficha).map((l) => l.tipo + ':' + l.ficha));
    mesa.lugares = [...mesa.lugares.filter((l) => !l.mundo && !(l.ficha && jaNoMundo.has(l.tipo + ':' + l.ficha))), ...doMundo];
    mesa.linhas = rotas.map((l) => ({ ...l, tipo: 'caminho', pts: (l.pts || []).map((p) => ({ ...p })) }));
  };
  juntarMundo();

  const fmtKm = (n) => n.toLocaleString(en ? 'en-US' : 'pt-BR');
  const dias = (k, porDia = MAPA_KM_DIA_A_PE) => { const d = k / porDia, r = Math.round(d);
    return d < 1 ? tr('menos de 1 dia', 'under 1 day') : r + (r === 1 ? tr(' dia', ' day') : tr(' dias', ' days')); };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const semAcento = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const r1 = (v) => Math.round(v * 10) / 10;
  const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  const lugarId = (id) => mesa.lugares.find((l) => l.id === id);
  const linhaId = (id) => mesa.linhas.find((l) => l.id === id);
  /* SÓ AS CIDADES QUE O PERSONAGEM CONHECE (17/11/2026, usuário: "O personagem
     só verá informações das cidades que ele conhece no mapa" — escolha: "Não
     aparece marcador ou nome"). Para o Jogador, o catálogo do mapa já é o que
     ele conhece (o diário dele e o que o Mestre liberou, banco.catalogo):
     cidade sem ficha ali não tem marcador, nome, toque nem busca. Enquanto o
     catálogo não chega, nenhuma aparece — o mapa não revela antes da hora. */
  /* Locais também (17/11/2026, usuário: "Locais também devem sair se o
     personagem não conhece"). A cidade onde a mesa está já chega conhecida: o
     banco a põe na mesa ao mudar o lugar (historias_lugar_atual_conhecido). */
  /* Onde o personagem está também vale (17/11/2026, usuário: "Aygrius está na
     cidade de Igara, mas no mapa diz que ele está na estrada"): o banco passa a
     conhecer o lugar quando o Mestre o põe ali (mapas_mesa_lugar_conhecido),
     e aqui ele aparece na hora, antes de o catálogo ser lido de novo. */
  /* A névoa: o Jogador numa mesa só enxerga até MAPA_NEVOA_KM do personagem
     dele; sem posição no mapa, não enxerga nada. O Mestre e o mapa fora de
     mesa ficam sem névoa. */
  const comNevoa = !mestre && !cfg.semMesa;
  const recorte = MAPA_RECORTE[cfg.plano] || null;
  const ptsRecorte = recorte ? [{ x: recorte[0], y: recorte[1] }, { x: recorte[2], y: recorte[3] }] : null;
  const mapaInteiro = (ms) => (ptsRecorte ? enquadrar(ptsRecorte, ms) : voar(L / 2, A / 2, sMin, ms));
  const raioNevoa = MAPA_NEVOA_KM / MAPA_KM;
  const meuPosto = () => { const g = gente.find((x) => x.eu); return (g && mesa.gente[g.id]) || null; };
  const naNevoa = (p) => { if (!comNevoa) return false; const eu = meuPosto(); return !eu || dist(eu, p) > raioNevoa; };
  const ondeEstou = (l) => gente.some((g) => g.eu && mesa.gente[g.id] && dist(mesa.gente[g.id], l) < MAPA_PERTO);
  const oculto = (l) => naNevoa(l) || (!mestre && CADASTRADOS.includes(l.tipo) && !ondeEstou(l)
    && (cadDoTipo(l.tipo) === null || !fichaDe(l)));
  const perto = (p, raio = MAPA_PERTO) => { let m = null, md = raio;
    for (const l of mesa.lugares) { if (oculto(l)) continue; const d = dist(l, p); if (d < md) { md = d; m = l; } } return m; };
  const onde = (p) => { const l = perto(p); return l ? l.nome : tr('Na estrada', 'On the road'); };
  /* Quem está no mapa, já com a posição. */
  const postos = () => gente.filter((g) => mesa.gente[g.id]).map((g) => ({ ...g, x: mesa.gente[g.id].x, y: mesa.gente[g.id].y }));
  /* De onde se medem as distâncias: o personagem do Jogador; para o Mestre
     (ou Jogador ainda fora do mapa), o primeiro que estiver no mapa. */
  const referencia = () => { const p = postos(); return p.find((g) => g.eu) || p[0] || null; };
  let EU = referencia();

  /* ── A cidade do mapa É a cidade da aba Cidades (15/11/2026) ──
     Usuário: "No mapa, ao apontar uma cidade, deverá conectar à cidade
     cadastrada na aba 'cidades'." A ligação é pelo NOME (sem acento nem
     caixa): a pintura não sabe de slug, e assim uma cidade que o Mestre cria
     no mapa com o nome de uma cadastrada já nasce ligada. */
  let fichas = new Map(), fichasId = new Map(), cadastradas = null, nomesLore = {};
  /* OS LOCAIS NO MAPA (15/11/2026, usuário: "Quero uma opção de inserir locais
     no mapa, além de cidades"). O mesmo trato das cidades: só os cadastrados
     na aba Locais, ligados pelo id da ficha. */
  let locaisCad = null, fichasLocalId = new Map(), capitais = new Set();
  /* OS REINOS NO MAPA (21/11/2026, usuário: "Quero adicionar um botão para
     adicionar reinos no mapa"). O mesmo trato de cidades e locais: só os
     cadastrados na aba Reinos, ligados pelo id da ficha. */
  let reinosCad = null, fichasReinoId = new Map();
  const CADASTRADOS = ['cidade', 'local', 'reino'];
  const cadDoTipo = (tipo) => (tipo === 'local' ? locaisCad : tipo === 'reino' ? reinosCad : cadastradas);
  const chave = (nome) => semAcento(nome).trim();
  const porFichas = (c) => {
    cadastradas = c ? (c.cidades || []) : null;       // null = o catálogo ainda não chegou
    fichas = new Map((cadastradas || []).map((e) => [chave(e.nome), e]));
    fichasId = new Map((cadastradas || []).map((e) => [String(e.id), e]));
    locaisCad = c ? (c.locais || []) : null;
    fichasLocalId = new Map((locaisCad || []).map((e) => [String(e.id), e]));
    reinosCad = c ? (c.reinos || []) : null;
    fichasReinoId = new Map((reinosCad || []).map((e) => [String(e.id), e]));
    nomesLore = (c && c.nomes) || {};
    capitais = new Set(((c && c.capitais) || []).map(String));
  };
  porFichas(cfg.catalogo);
  const fichaDe = (p) => { const l = p && (CADASTRADOS.includes(p.tipo) ? p : perto(p));
    if (l && l.tipo === 'local') return (l.ficha && fichasLocalId.get(String(l.ficha))) || null;
    if (l && l.tipo === 'reino') return (l.ficha && fichasReinoId.get(String(l.ficha))) || null;
    return (l && l.tipo === 'cidade' && ((l.ficha && fichasId.get(String(l.ficha))) || fichas.get(chave(l.nome)))) || null; };
  /* ONDE ESTOU: O REINO E A CIDADE MAIS PRÓXIMA (22/11/2026, usuário: "No texto
     'Você está em' eu quero que mostre o nome do reino e cidade mais próxima").
     A cidade é a mais perto entre as que o personagem enxerga (fora da névoa e
     conhecida), sem contar aquela em que ele já está. O reino é o da ficha da
     cidade conhecida mais perto (até 150 km); sem ela, o do marcador de reino
     mais perto no mapa. */
  const cidadeMaisProxima = (p) => mesa.lugares.filter((l) => l.tipo === 'cidade' && !oculto(l) && dist(l, p) >= MAPA_PERTO)
    .sort((x, y) => dist(x, p) - dist(y, p))[0] || null;
  const reinoDe = (p) => {
    const perto150 = mesa.lugares.filter((l) => l.tipo === 'cidade' && !oculto(l) && km(dist(l, p)) <= 150).sort((x, y) => dist(x, p) - dist(y, p));
    for (const c of perto150) { const fc = fichaDe(c), r = fc && fc.atributos && fc.atributos.reino; if (r) return nomesLore[r] || r; }
    const rs = mesa.lugares.filter((l) => l.tipo === 'reino').sort((x, y) => dist(x, p) - dist(y, p));
    return rs.length ? rs[0].nome : null;
  };
  // O sinal de cada lugar no mapa e nas listas.
  /* UM SINAL POR TIPO DE LUGAR (21/11/2026, usuário: "Todos os ícones de local
     será ti-map-pin. Todos os ícones de cidade será ti-pennant [ti-map-pin desde
     a tarde de 21/11: "O ícone da cidade é ti-map-pin"]. Todos os ícones
     de capital será ti-flag"). Substitui o de 17/11 (torre, castelo, e o local
     pelo nome: floresta, farol, água, montanha). Capital é a cidade que algum
     reino tem como capital (reinos.capital, o slug = id da ficha); a cidade sem
     ficha conhecida vale cidade. */
  const ICONE_LUGAR = { cidade: 'ti-map-pin', capital: 'ti-flag', local: 'ti-map-pin', ponto: 'ti-star', reino: 'ti-crown' };
  const ehCapital = (l) => { const f = l && l.tipo === 'cidade' && fichaDe(l); return !!f && capitais.has(String(f.id)); };
  const iconeLugar = (l) => {
    if (!l) return 'ti-star';
    if (l.tipo === 'cidade') return ehCapital(l) ? ICONE_LUGAR.capital : ICONE_LUGAR.cidade;
    return ICONE_LUGAR[l.tipo] || 'ti-star';
  };
  /* A ORDEM EM QUE OS NOMES SAEM COM O ZOOM (21/11/2026, usuário: "Conforme o
     zoom diminui, quero que o nome dos locais suma, depois das cidades, depois
     das capitais, e por fim dos reinos"). Ponto e marca valem como local. */
  /* OS MARES CADASTRADOS (21/11/2026, usuário: "Você não adicionou os mares do
     norte, etc."): o local que é mar, baía, estreito ou recife (pelo nome, como
     o Mar do Norte que banha Saravossa) fala como os mares do mapa — em
     qualquer zoom, em itálico azul e sem ícone (mapa.css, data-nivel="mar").
     Continua um local: o toque abre a ficha, e o Jogador só o vê se conhece. */
  const AGUA_ABERTA = /^(mar|oceano|ba[ií]a|golfo|estreito|recifes?)\b/i;
  const nivelDoNome = (l) => (l.tipo === 'reino' ? 'reino'
    : l.tipo === 'cidade' ? (ehCapital(l) ? 'capital' : 'cidade')
    : l.tipo === 'local' && AGUA_ABERTA.test(String(l.nome || '').trim()) ? 'mar' : 'local');
  /* CIDADE NOVA NÃO NASCE NO MAPA (15/11/2026). Usuário: "não será criado uma
     'nova cidade' clicando no mapa, a cidade será criada na aba cidades da
     ambientação." A ferramenta Cidade só POSICIONA: o Mestre escolhe uma
     cadastrada que ainda não está no mapa e toca onde ela fica. O lugar guarda
     o id da ficha, e o nome passa a ser o dela (acertarNomes). */
  /* UM LUGAR, UM PLANO SÓ (23/11/2026, usuário: "As cidades, locais, reinos são
     compartilhadas entre plano material, celestial e infernal, ou seja,
     cadastrada em um plano, é definitivo."). A ficha posta num plano não volta
     à lista dos outros: cfg.alhures() dá os lugares dos outros planos (a camada
     do mundo de cada um e o mapa da mesa neles), { tipo, ficha, nome, plano }. */
  const alhures = () => { try { return (typeof cfg.alhures === 'function' && cfg.alhures()) || []; } catch (e) { return []; } };
  // Em que plano a ficha já está posta (null = em nenhum).
  const planoDaFicha = (tipo, ficha, nome) => {
    const casa = (l) => l.tipo === tipo && ((ficha != null && l.ficha != null && String(l.ficha) === String(ficha)) || (nome && chave(l.nome) === chave(nome)));
    if (mesa.lugares.some(casa)) return plano;
    const fora = alhures().find(casa);
    return fora ? (fora.plano || 'material') : null;
  };
  const nomePlano = (p) => { const x = MAPA_PLANOS.find((q) => q.id === p); return x ? (en ? x.en : x.pt) : p; };
  // As cadastradas (cidades, locais ou reinos) que ainda não estão em plano nenhum.
  const foraDoMapa = (tipo = 'cidade') => {
    const ids = new Set(), nomes = new Set();
    [...mesa.lugares, ...alhures()].forEach((l) => { if (l.tipo !== tipo) return; if (l.ficha) ids.add(String(l.ficha)); nomes.add(chave(l.nome)); });
    return (cadDoTipo(tipo) || []).filter((e) => !ids.has(String(e.id)) && !nomes.has(chave(e.nome)))
      .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  };
  const fichaPeloId = (tipo, id) => (tipo === 'local' ? fichasLocalId : tipo === 'reino' ? fichasReinoId : fichasId).get(String(id));
  const acertarNomes = () => { let mudou = false;
    mesa.lugares.forEach((l) => { const e = l.ficha && fichaPeloId(l.tipo, l.ficha); if (e && e.nome && e.nome !== l.nome) { l.nome = e.nome; mudou = true; } });
    return mudou; };

  /* ── Gravação: o motor avisa, o React leva ao banco (com folga) ── */
  // A mesa leva o que é dela; o mundo (só o Imperador grava), o que é do mundo.
  const guardarMesa = () => {
    // A mesa não guarda caminho (é do mundo): linhas vazias e sem a rota da mesa antiga.
    if (cfg.aoMudarMesa) cfg.aoMudarMesa(JSON.parse(JSON.stringify({ ...mesa, lugares: mesa.lugares.filter((l) => !l.mundo), linhas: [], rota: null })));
    if (imperador && cfg.aoMudarMundo) {
      const novos = mesa.lugares.filter((l) => l.mundo).map(({ mundo: _m, ...l }) => l);
      const j = JSON.stringify({ lugares: novos, linhas: mesa.linhas });
      if (j !== ultimoMundo) { ultimoMundo = j; const m = JSON.parse(j); mundo = m.lugares; rotas = m.linhas; cfg.aoMudarMundo(JSON.parse(j)); }
    }
  };
  const guardar = () => cfg.aoMudarMarcas && cfg.aoMudarMarcas(JSON.parse(JSON.stringify(marcas)));

  /* ── Câmera ── */
  const cam = { x: 0, y: 0, s: 1 };
  let vw = 0, vh = 0, sMin = .1; const S_MAX = 28;
  let rotaTela = { largura: 1, opacidade: 0 };
  const calmo = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function prender() {
    cam.s = Math.min(S_MAX, Math.max(sMin, cam.s));
    const w = L * cam.s, h = A * cam.s;
    cam.x = w <= vw ? (vw - w) / 2 : Math.min(0, Math.max(vw - w, cam.x));
    cam.y = h <= vh ? (vh - h) / 2 : Math.min(0, Math.max(vh - h, cam.y));
  }
  function pintar() {
    prender();
    elMundo.style.transform = `translate(${cam.x}px,${cam.y}px) scale(${cam.s})`;
    elMundo.style.setProperty('--s', cam.s);
    rotaTela = mapaCaminhoNaTela(MAPA_KM / cam.s);
    elMundo.style.setProperty('--rota-w', rotaTela.largura + 'px');
    elMundo.style.setProperty('--rota-o', rotaTela.opacidade);
    /* OS NOMES SAEM EM FAIXAS, PELA RÉGUA (21/11/2026, usuário: "Conforme o
       zoom diminui, quero que o nome dos locais suma, depois das cidades,
       depois das capitais, e por fim dos reinos" e "O nome dos locais aparece
       com 50km, o nome das cidades com 100km, das capitais com 200km, dos
       reinos com 400km"). O km é o da régua de escala no canto (passoDaRegua):
       data-nomes = quantas faixas ainda falam, 4 todas, 0 nenhuma (mapa.css). */
    const passo = passoDaRegua();
    elMapa.dataset.nomes = passo <= 50 ? 4 : passo <= 100 ? 3 : passo <= 200 ? 2 : passo <= 400 ? 1 : 0;
    escala();
  }
  let voo = 0;
  function voar(x, y, s, ms = 900) {
    cancelAnimationFrame(voo);
    const de = { ...cam }, para = { s: Math.min(S_MAX, Math.max(sMin, s)) };
    para.x = vw / 2 - x * para.s; para.y = vh / 2 - y * para.s;
    if (calmo || ms === 0) { Object.assign(cam, para); pintar(); return; }
    const t0 = performance.now();
    const passo = (agora) => {
      const t = Math.min(1, (agora - t0) / ms), e = 1 - Math.pow(2, -10 * t) * (1 - t);
      // zoom em log e alvo fixo: o mapa não "nada" no caminho
      cam.s = de.s * Math.pow(para.s / de.s, e);
      const cx = (vw / 2 - de.x) / de.s + (x - (vw / 2 - de.x) / de.s) * e;
      const cy = (vh / 2 - de.y) / de.s + (y - (vh / 2 - de.y) / de.s) * e;
      cam.x = vw / 2 - cx * cam.s; cam.y = vh / 2 - cy * cam.s;
      pintar();
      if (t < 1) voo = requestAnimationFrame(passo);
    };
    voo = requestAnimationFrame(passo);
  }
  function enquadrar(pts, ms) {
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const s = Math.min((vw - Math.min(160, vw * .3)) / Math.max(90, x1 - x0), (vh - Math.min(220, vh * .45)) / Math.max(90, y1 - y0), 9.6);
    voar((x0 + x1) / 2, (y0 + y1) / 2, s, ms);
  }
  function zoomEm(px, py, fator) {
    cancelAnimationFrame(voo);
    const s = Math.min(S_MAX, Math.max(sMin, cam.s * fator));
    cam.x = px - (px - cam.x) * (s / cam.s); cam.y = py - (py - cam.y) * (s / cam.s); cam.s = s;
    pintar();
  }
  const noMundo = (px, py) => ({ x: (px - cam.x) / cam.s, y: (py - cam.y) / cam.s });
  // O km da régua de escala: o menor degrau que ocupa ao menos 70px na tela.
  function passoDaRegua() {
    const kmPx = MAPA_KM / cam.s;
    return [5, 10, 25, 50, 100, 200, 400, 800, 1600].find((k) => k / kmPx >= 70) || 1600;
  }
  function escala() {
    const kmPx = MAPA_KM / cam.s;
    const passo = passoDaRegua();
    $('escala-txt').textContent = fmtKm(passo) + ' km';
    $('escala-barra').style.width = (passo / kmPx) + 'px';
  }

  /* ── O chão: o mapa vetorial e os textos do mapa (21/11/2026) ──
     O SVG entra como imagem do tamanho do mapa: o navegador o redesenha nítido
     a cada zoom. Por cima, numa camada própria (embaixo da névoa e dos
     marcadores), os TEXTOS DO MAPA no jeito do Google Maps.
     OS TEXTOS SÃO LOCAIS (21/11/2026, usuário: "Eu quero que os textos atuais
     virem locais" e depois "era pra manter o estilo de texto e a edição de
     texto"). Mares, serras, rios, florestas… são locais do mundo
     (scripts/mapa/textos-em-locais.mjs) com `estilo`: { geo: o tipo da
     geografia (cor e letra, mapa.css), imp: a faixa de zoom em que fala, e o
     que a ferramenta Nomes mudou — texto?, cor?, negrito?, italico?, caixa?,
     contorno?, tam? }. O local com estilo não tem pino nem etiqueta: o texto
     é ele — tocar abre o local; o escolhido engrossa. */
  const aVistaNaFaixa = (l, faixa) => { const n = nivelDoNome(l); return n === 'mar' || ['local', 'cidade', 'capital', 'reino'].indexOf(n) >= 4 - faixa; };
  let vivo = true, semPintura = false, geo = [], geoAssinatura = '';
  /* A FERRAMENTA NOMES (21/11/2026, usuário: "Eu quero poder arrumar todos os
     textos" e "No botão 'Nomes' do mapa, eu não consigo excluir o texto, mudar
     a cor e estilo"). O Imperador arrasta o texto, troca o que está escrito
     (só no mapa: a ficha guarda o nome dela), muda cor e estilo, ou exclui —
     que tira o local do mapa, com Desfazer. Grava no próprio local (camada do
     mundo). O padrão de cada texto vem do tipo; o estilo só guarda a diferença. */
  let geoSel = null;
  const podeNomes = imperador && !!cfg.base && !!cfg.aoMudarMundo;
  /* SEM A FERRAMENTA NOMES (22/11/2026, usuário: "O botão 'Nomes' não vai existir
     mais, eu quero que ao clicar em Local, Cidade, Reino, eu já tenha a opção de
     criar ali uma entrada com o texto personalizado"). Mover e editar os textos
     do mapa passa para a ferramenta Local; criar fica em cada uma das três. */
  const ehTextos = () => modo === 'local' && podeNomes;
  const ehTexto = (l) => !!(l && l.estilo && l.estilo.geo);
  const geoDe = (l) => ({ ...l.estilo, id: String(l.id), nome: l.estilo.texto || l.nome, tipo: l.estilo.geo, importancia: l.estilo.imp || 2, x: l.x, y: l.y });
  const geoEf = (r) => r;
  const lugarDoGeo = (id) => mesa.lugares.find((l) => String(l.id) === String(id));
  const GEO_CORES = [
    ['#516072', tr('Ardósia', 'Slate')], ['#1F5F78', tr('Água', 'Water')], ['#2D6A45', tr('Floresta', 'Forest')],
    ['#6B5843', tr('Terra', 'Earth')], ['#86663A', tr('Ocre', 'Ochre')], ['#8E2F2A', tr('Vermelho', 'Red')], ['#2A2622', tr('Preto', 'Black')],
  ];
  const GEO_TAMS = [0.75, 1, 1.25, 1.5, 2];
  // O que o tipo já dá, para o botão mostrar o estado certo e a correção guardar só a diferença.
  const geoPadrao = (r) => ({ negrito: false, italico: !['deserto', 'regiao'].includes(r.tipo), caixa: ['deserto', 'regiao'].includes(r.tipo), contorno: true, tam: 1 });
  const geoEstilo = (e) => [
    e.cor ? `color:${e.cor}` : '', e.negrito != null ? `font-weight:${e.negrito ? 800 : 600}` : '',
    e.italico != null ? `font-style:${e.italico ? 'italic' : 'normal'}` : '',
    e.caixa != null ? `text-transform:${e.caixa ? 'uppercase' : 'none'};letter-spacing:${e.caixa ? '.1em' : 'normal'}` : '',
    e.contorno === false ? 'text-shadow:none' : '',
    e.tam ? `--geo-tam:${e.tam}` : '',
  ].filter(Boolean).map((s) => ';' + s).join('');
  // Redesenha a camada só quando algo dela mudou (desenhar() chama a cada passo).
  function geoDesenhar(forcar) {
    const el = $('geo'); if (!el) return;
    const focoId = foco.tipo === 'lugar' ? String(foco.id) : '';
    geo = mesa.lugares.filter((l) => ehTexto(l) && !oculto(l)).map(geoDe);
    const ass = (geoSel || '') + '|' + focoId + '|' + JSON.stringify(geo);
    if (!forcar && ass === geoAssinatura) return; geoAssinatura = ass;
    el.innerHTML = geo.map((e) => `<span class="mp-geo-nome${geoSel === e.id ? ' sel' : ''}${focoId === e.id ? ' foco' : ''}" data-geo="${esc(e.id)}" data-lugar="${esc(e.id)}" data-tipo="${esc(e.tipo)}" data-imp="${esc(e.importancia)}" style="left:${e.x}px;top:${e.y}px${geoEstilo(e)}">${esc(e.nome)}</span>`).join('');
  }
  const guardarGeo = () => guardarMesa();
  /* O TEXTO NOVO (22/11/2026, usuário: "Como eu faço para criar o texto novo de
     um rio? [...] Quero, pode fazer assim" e "todos os atuais textos virem
     locais. Serão uma coisa só"). Na ferramenta Nomes, "Novo texto": o tipo e o
     nome, e o toque no mapa põe o texto. O texto é um local do mundo — liga-se
     à ficha da aba Locais com o mesmo nome ou cria uma (cfg.aoCriarEntrada). */
  const GEO_TIPOS_NOVO = [['rio', tr('Rio', 'River')], ['lago', tr('Lago', 'Lake')], ['mar', tr('Mar', 'Sea')], ['serra', tr('Serra', 'Range')],
    ['floresta', tr('Floresta', 'Forest')], ['deserto', tr('Deserto', 'Desert')], ['ilha', tr('Ilha', 'Island')], ['regiao', tr('Região', 'Region')],
    ['planicie', tr('Planície', 'Plain')], ['vulcao', tr('Vulcão', 'Volcano')]];
  // A entrada nova enquanto a ferramenta espera o toque: { tipo: 'local'|'cidade'|'reino', nome, geo ('pino' ou o tipo do texto), reino }
  let novaEntrada = null;
  async function criarEntrada(p) {
    const { tipo, geo, ficha: daLista } = novaEntrada, escrito = (novaEntrada.nome || '').trim();
    if (!escrito) { recado = { txt: daLista ? tr('Escreva o texto que aparece no mapa.', 'Type the text shown on the map.') : tr('Escreva o nome antes de tocar no mapa.', 'Type the name before tapping the map.') }; aviso(); return; }
    // da lista: a ficha manda no nome; o que foi escrito é o texto do mapa
    const nome = daLista ? daLista.nome : escrito, texto = escrito !== nome ? escrito : null;
    if (!daLista && tipo === 'cidade' && !novaEntrada.reino) { recado = { txt: tr('Escolha o reino da cidade antes de tocar no mapa.', 'Pick the city\'s kingdom before tapping the map.') }; aviso(); return; }
    // o mesmo nome já cadastrado: usa a ficha que existe
    const ficha = daLista || (cadDoTipo(tipo) || []).find((e) => semAcento(e.nome) === semAcento(nome));
    let slug = ficha && ficha.id;
    // já posta num plano (este ou outro): não entra de novo
    const ja = ficha && planoDaFicha(tipo, ficha.id, ficha.nome);
    if (ja) { recado = { txt: ja === plano ? tr(`${ficha.nome} já está no mapa.`, `${ficha.nome} is already on the map.`)
      : tr(`${ficha.nome} já está no plano ${nomePlano(ja)}.`, `${ficha.nome} is already on the ${nomePlano(ja)} plane.`) }; aviso(); return; }
    if (!slug) {
      recado = { txt: tr('Criando…', 'Creating…') }; aviso();
      try { slug = cfg.aoCriarEntrada ? await cfg.aoCriarEntrada(tipo, nome, tipo === 'cidade' ? { reino: novaEntrada.reino } : {}) : null; } catch (e) { slug = null; }
      if (!vivo) return;
      if (!slug) { recado = { txt: tr('Não foi possível criar. Confira a conexão e tente de novo.', 'Could not create it. Check your connection and try again.') }; aviso(); return; }
    }
    const comoTexto = tipo === 'local' && geo !== 'pino';
    const l = { id: novoId(), tipo, nome, ficha: slug, x: p.x, y: p.y, mundo: true,
      ...(comoTexto ? { estilo: { geo, imp: 2, ...(texto ? { texto } : {}) } } : texto ? { rotulo: texto } : {}) };
    mesa.lugares.push(l); guardarMesa();
    novaEntrada = null; recado = null;
    if (cfg.aoEscolherAchado) cfg.aoEscolherAchado();
    if (comoTexto) { geoSel = l.id; geoDesenhar(true); aviso(); } else { aviso(); focar({ tipo: 'lugar', id: l.id }, false); }
  }
  const geoPorId = (id) => geo.find((r) => r.id === String(id));
  // Grava um campo do estilo no local; igual ao padrão do tipo, sai do estilo.
  function geoMudar(campo, valor) {
    const l = lugarDoGeo(geoSel); if (!l) return;
    const e = { ...l.estilo };
    if (valor == null || valor === geoPadrao(geoDe(l))[campo]) delete e[campo]; else e[campo] = valor;
    l.estilo = e; guardarGeo(); geoDesenhar(); aviso();
  }
  elMundo.style.width = L + 'px'; elMundo.style.height = A + 'px';
  const lad = cfg.ladrilhos;
  if (lad) {
    // o fundo inteiro em baixa e, por cima, cada ladrilho transbordando `sobra` para os vizinhos
    const tw = L / lad.cols, th = A / lad.linhas, s = lad.sobra, ims = [], r2 = (v) => +v.toFixed(2);   // r2: o mesmo arredondamento do viewBox de cada ladrilho
    for (let r = 0; r < lad.linhas; r++) for (let c = 0; c < lad.cols; c++)
      ims.push(`<img class="mp-ladrilho" alt="" draggable="false" decoding="async" src="${esc(lad.pasta)}l${r}c${c}.svg" style="left:${r2(c * tw - s)}px;top:${r2(r * th - s)}px;width:${r2(tw + 2 * s)}px;height:${r2(th + 2 * s)}px">`);
    $('arte').innerHTML = `<img class="mp-chao" alt="" draggable="false" decoding="async" src="${esc(lad.fundo)}" style="width:${L}px;height:${A}px">${ims.join('')}<div class="mp-geo" data-el="geo"></div>`;
    $('arte').querySelector('img').onerror = () => { if (vivo) { semPintura = true; aviso(); } };
  } else if (cfg.base) {
    $('arte').innerHTML = `<img class="mp-chao" alt="" draggable="false" decoding="async" src="${esc(cfg.base)}" style="width:${L}px;height:${A}px"><div class="mp-geo" data-el="geo"></div>`;
    $('arte').querySelector('img').onerror = () => {
      /* Sem pintura o mapa segue usável, mas a área vazia parece quebrada
         (15/11/2026, usuário: "o mapa não carrega"). A tela diz o que falta. */
      if (vivo) { semPintura = true; aviso(); }
    };
  }
  const comTexto = (l) => ehTexto(l);
  const faceDoToque = (alvoEl) => { const f = alvoEl && alvoEl.closest && alvoEl.closest('.mp-geo-nome[data-lugar]');
    return f ? lugarDoGeo(f.dataset.lugar) || null : null; };

  /* ── Estado ── */
  // foco: { tipo: 'aqui' | 'lugar' | 'linha' | 'marca' | 'gente' | 'nada', id? }
  const focoPadrao = () => ((!mestre && EU && EU.eu) ? { tipo: 'aqui' } : { tipo: 'nada' });
  let foco = { tipo: 'nada' };
  let modo = null;                 // null | 'medir' | 'marcar' | 'cidade' | 'ponto' | 'caminho' | 'por' | 'mover'
  let medida = [], traco = [], continua = null, pondo = null, pondoCidade = null;   // pondoCidade: a ficha escolhida na ferramenta Cidade
  let movendo = null;              // id do lugar que o próximo toque no mapa leva para outro ponto (modo 'mover')
  /* A rota da ferramenta Rota (21/11/2026, usuário: "Para descobrir a rota até
     um lugar, eu quero um botão de pesquisa, ao selecionar um local de destino,
     devo selecionar um local de origem"): { destino, origem?, r? } — destino e
     origem são lugares do mapa { x, y, nome }; r, o que mapaRotaPelosCaminhos
     achou. O lugar entra no caminho se estiver a até MAPA_PERTO (~10 km) dele.
     Não vai para o banco. */
  let rotaAtual = null;
  // A água para "Navegando": undefined enquanto carrega, null se não houver.
  let agua = plano === 'material' && typeof fetch === 'function' ? undefined : null;
  /* no-cache: o navegador confere se a grade mudou (22/11/2026: com a grade antiga guardada, o
     Lago Denégrio parecia fechado e a rota ia por terra até Azanti para embarcar). */
  if (agua === undefined) fetch(MAPA_AGUA, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((j) => { agua = j ? mapaAguaDe(j) : null; })
    .catch(() => { agua = null; }).then(() => { if (vivo && rotaAtual && rotaAtual.origem) { calcularRota(); desenhar(); } });
  const calcularRota = () => {
    if (!rotaAtual || !rotaAtual.origem) return;
    rotaAtual.mar = agua === undefined ? undefined : mapaNavegacao(agua, rotaAtual.origem, rotaAtual.destino);
    const op = { perto: MAPA_PERTO, emenda: MAPA_EMENDA, cidades: mesa.lugares.filter((l) => l.tipo === 'cidade'), agua: agua || null,
      lagos: mesa.lugares.filter((l) => l.estilo && l.estilo.geo === 'lago').map((l) => ({ nome: l.estilo.texto || l.nome, x: l.x, y: l.y })) };
    const paradas = rotaAtual.paradas || [];
    rotaAtual.sugestoes = paradas.length ? mapaItinerario(mesa.linhas, [rotaAtual.origem, ...paradas, rotaAtual.destino], op)
      : mapaSugestoesDeRota(mesa.linhas, rotaAtual.origem, rotaAtual.destino, op);
    rotaAtual.escolha = Math.min(rotaAtual.escolha || 0, rotaAtual.sugestoes.length - 1);
    rotaAtual.r = rotaAtual.sugestoes[rotaAtual.escolha];
  };
  /* O nome das águas por onde o barco passa: os lagos, mares e rios escritos a
     até 60 unidades da travessia, na ordem em que ela os encontra (até dois). */
  const nomeDaAgua = (s) => { const pa = s.partes.filter((p) => p.modo === 'agua').flatMap((p) => p.pts); if (!pa.length) return null;
    const aguas = mesa.lugares.filter((l) => l.estilo && ['lago', 'mar', 'rio'].includes(l.estilo.geo)), vistos = [];
    for (let i = 0; i < pa.length; i += 3) { let m = null, md = 60;
      for (const l of aguas) { const d = dist(l, pa[i]); if (d < md) { md = d; m = l; } }
      if (m && !vistos.includes(m)) vistos.push(m); }
    const lagos = vistos.filter((l) => l.estilo.geo !== 'mar'), escolhidos = (lagos.length ? lagos : vistos).slice(0, 2);
    return escolhidos.length ? escolhidos.map((l) => l.estilo.texto || l.nome).join(' e ') : null; };
  // Os lugares que podem ser destino ou origem: cidades, locais e reinos à vista.
  const lugaresDaRota = () => mesa.lugares.filter((l) => !oculto(l) && ['cidade', 'local', 'reino', 'ponto'].includes(l.tipo));
  function escolherNaRota(l) {
    const ponto = { x: l.x, y: l.y, nome: l.nome };
    if (cfg.aoEscolherAchado) cfg.aoEscolherAchado();   // limpa a busca para a próxima escolha
    busca = '';
    if (!rotaAtual) { rotaAtual = { destino: ponto }; aviso(); desenhar(); return; }
    // a parada entra no fim da lista, antes do destino: na ordem em que a viagem passa
    if (rotaAtual.adicionando) { rotaAtual.adicionando = false; rotaAtual.paradas = [...(rotaAtual.paradas || []), ponto]; rotaAtual.escolha = 0; calcularRota(); modo = null; aviso(); focar({ tipo: 'rota' }); return; }
    rotaAtual.origem = ponto; calcularRota();
    modo = null; aviso(); focar({ tipo: 'rota' });
  }
  let vsel = null, passa = null, recado = null, busca = '';

  const marcaEm = (l) => marcas.find((m) => m.lugar === l.id);
  const marcaSolta = (m) => !m.lugar || !lugarId(m.lugar);
  function alvo() {
    const f = foco;
    if (f.tipo === 'lugar') return lugarId(f.id);
    if (f.tipo === 'linha') return linhaId(f.id);
    if (f.tipo === 'marca') return marcas.find((m) => m.id === f.id);
    if (f.tipo === 'gente') return postos().find((g) => String(g.id) === String(f.id));
    if (f.tipo === 'aqui') return EU && { x: EU.x, y: EU.y, nome: onde(EU) };
    if (f.tipo === 'rota') return rotaAtual && rotaAtual.r ? { ...rotaAtual.r, pts: rotaAtual.r.pts || [rotaAtual.origem, rotaAtual.destino], nome: rotaAtual.origem.nome + ' → ' + rotaAtual.destino.nome } : null;
    return null;
  }
  function focar(f, voa = true) {
    foco = f; vsel = null; desenhar();
    const a = alvo(); if (!voa || !a) return;
    if (f.tipo === 'linha' || f.tipo === 'rota') enquadrar(a.pts, 800); else voar(a.x, a.y, Math.max(cam.s, 5.5));
  }
  const focoDoLugar = (l) =>
    mestre ? { tipo: 'lugar', id: l.id } :
    EU && EU.eu && dist(EU, l) < MAPA_PERTO ? { tipo: 'aqui' } :
    marcaEm(l) ? { tipo: 'marca', id: marcaEm(l).id } : { tipo: 'lugar', id: l.id };
  // O caminho que o zoom apagou não responde ao toque; o escolhido, sim.
  const visivel = (l) => rotaTela.opacidade > 0.05 || (foco.tipo === 'linha' && foco.id === l.id);

  /* ── Desenho ── */
  const pts = (a) => a.map((p) => `${p.x},${p.y}`).join(' ');
  const linha = (cls, a) => (a.length > 1 ? `<polyline class="${cls}" points="${pts(a)}"/>` : '');
  const disco = (g) => `<span class="mp-disco${g.eu ? ' eu' : ''}"${g.foto ? ` style="background-image:url(&quot;${esc(encodeURI(g.foto))}&quot;)"` : ''}>${g.foto ? '' : esc(String(g.nome || '?')[0])}</span>`;
  function desenhar() {
    EU = referencia();
    if (foco.tipo !== 'nada' && !alvo()) foco = focoPadrao();
    const a = alvo();
    geoDesenhar();

    let s = '';
    // Primeiro todas as bordas, depois todos os miolos: no cruzamento, as estradas se emendam.
    const vistas = mesa.linhas.filter((l) => l.id !== continua);
    const cls = (l) => (foco.tipo === 'linha' && foco.id === l.id ? ' sel' : '');
    vistas.forEach((l) => { s += linha('mp-cam-borda' + cls(l), l.pts); });
    vistas.forEach((l) => { s += linha('mp-cam' + cls(l), l.pts); });
    // A rota: azul nos caminhos; pontilhada fora deles (da origem ao caminho e do caminho ao destino).
    const R = rotaAtual && rotaAtual.r;
    if (R && R.partes) R.partes.forEach((pt) => { s += pt.modo === 'fora' ? linha('mp-rota-ape', pt.pts) : pt.modo === 'agua' ? linha('mp-rota-barco', pt.pts) : linha('mp-rota-borda', pt.pts) + linha('mp-rota', pt.pts); });
    s += linha('mp-traco-base', traco) + linha('mp-traco', traco) + linha('mp-medida-base', medida) + linha('mp-medida', medida);
    $('linhas').innerHTML = s;
    /* A névoa por cima da pintura e das linhas, embaixo dos marcadores. A
       máscara é branca (véu) com o círculo do personagem em degradê até o
       preto (buraco): a borda esfuma. */
    const elNevoa = $('nevoa');
    if (elNevoa) {
      const eu = comNevoa ? meuPosto() : null;
      const caixa = `x="${-L}" y="${-A}" width="${3 * L}" height="${3 * A}"`;
      elNevoa.innerHTML = !comNevoa ? '' :
        '<defs><radialGradient id="mp-nevoa-g"><stop offset="0.8" stop-color="#000"/><stop offset="1" stop-color="#fff"/></radialGradient>' +
        '<mask id="mp-nevoa-m" maskUnits="userSpaceOnUse" ' + caixa + '><rect ' + caixa + ' fill="#fff"/>' +
        (eu ? '<circle cx="' + eu.x + '" cy="' + eu.y + '" r="' + raioNevoa + '" fill="url(#mp-nevoa-g)"/>' : '') +
        '</mask></defs><rect class="mp-nevoa-veu" ' + caixa + ' mask="url(#mp-nevoa-m)"/>';
    }

    const mk = (p, html, extra = '', nivel = '') => `<div class="mp-mk${extra}"${nivel ? ` data-nivel="${nivel}"` : ''} style="left:${p.x}px;top:${p.y}px">${html}</div>`;
    let h = '';
    /* SEM O ANEL NO APONTAR (21/11/2026, usuário: "Ao passar o mouse em cima,
       não quero o círculo"): o próprio marcador acende (.passa, mapa.css) e o
       nome dele aparece, mesmo na faixa de zoom que o esconderia. */
    const apontado = passa && modo !== 'marcar' ? passa : null;
    /* SELECIONADO = DISCO PRETO, ÍCONE BRANCO (21/11/2026, usuário: "Ao selecionar,
       eu quero o fundo preto com círculo e o ícone branco"). O anel fica só para
       o que não tem marcador próprio (onde estou). */
    const naMarca = ['lugar', 'marca'].includes(foco.tipo);
    const sel = (tipo, id) => (foco.tipo === tipo && (id == null || String(foco.id) === String(id)) ? ' sel' : '');
    if (a && !naMarca && foco.tipo !== 'linha' && foco.tipo !== 'gente') h += mk(a, `<div class="mp-mira"></div>`);
    /* TODA CIDADE COM O MESMO SINAL (15/11/2026, usuário: "Deixe as cidades
       com o ícone de casinha, como está Saupami"). As 65 da pintura também
       ganham o marcador, em cima do desenho delas.
       TODA CIDADE COM O NOME (15/11/2026, usuário: "Algumas cidades mostram o
       nome, outras não. Arrume isso"): as da pintura também ganham a
       etiqueta — de perto, todas falam igual; de longe, saem em faixas (data-nomes). */
    mesa.lugares.forEach((l) => {
      if (oculto(l)) return;
      const texto = comTexto(l);
      if (texto) return;   // o texto é o local: sem pino nem etiqueta; o escolhido engrossa (.foco)
      h += mk(l, `<button type="button" class="mp-marca${l.tipo === 'cidade' ? ' vila' : l.tipo === 'local' ? ' local' : l.tipo === 'reino' ? ' reino' : ''}${sel('lugar', l.id)}" data-alvo="lugar" data-id="${esc(l.id)}" aria-label="${esc(l.nome)}"><i class="ti ${iconeLugar(l)}" aria-hidden="true"></i></button>` +
        (texto ? '' : `<span class="mp-etiqueta">${esc(l.rotulo || l.nome)}</span>`), l === apontado ? ' passa' : '', nivelDoNome(l));
    });
    if (!mestre) marcas.forEach((m) => {
      h += mk(m, `<button type="button" class="mp-marca${sel('marca', m.id)}" data-alvo="marca" data-id="${esc(m.id)}" aria-label="${tr('Marca', 'Mark')}: ${esc(m.nome)}"><i class="ti ti-map-pin" aria-hidden="true"></i></button>` +
                 (marcaSolta(m) ? `<span class="mp-etiqueta" data-nivel="local">${esc(m.nome)}</span>` : ''));
    });
    medida.forEach((p) => { h += mk(p, `<div class="mp-ponto"></div>`); });
    if (rotaAtual) {
      if (rotaAtual.origem) h += mk(rotaAtual.origem, `<div class="mp-rota-origem" aria-label="${tr('Origem', 'Origin')}: ${esc(rotaAtual.origem.nome)}"></div>`);
      (rotaAtual.paradas || []).forEach((p, i) => { h += mk(p, `<div class="mp-rota-parada" aria-label="${tr('Parada', 'Stop')} ${i + 1}: ${esc(p.nome)}">${i + 1}</div>`); });
      h += mk(rotaAtual.destino, `<div class="mp-rota-destino" aria-label="${tr('Destino', 'Destination')}: ${esc(rotaAtual.destino.nome)}"><i class="ti ti-map-pin" aria-hidden="true"></i></div>`);
    }
    traco.forEach((p) => { h += mk(p, `<div class="mp-ponto"></div>`); });
    // os personagens, agrupados por onde estão
    const grupos = new Map();
    postos().filter((g) => g.eu || !naNevoa(g)).forEach((g) => { const k = g.x + ',' + g.y; grupos.set(k, [...(grupos.get(k) || []), g]); });
    grupos.forEach((turma) => {
      const meu = turma.some((g) => g.eu), sel = foco.tipo === 'gente' && turma.some((g) => String(g.id) === String(foco.id));
      h += mk(turma[0], (meu ? `<div class="mp-onda"></div><div class="mp-pe"></div>` : '') +
        `<button type="button" class="mp-pino${meu ? ' eu' : ''}${sel ? ' sel' : ''}" data-alvo="gente" data-id="${esc(turma[0].id)}" aria-label="${esc(turma.map((g) => g.nome).join(', '))}: ${esc(onde(turma[0]))}">` +
        turma.map(disco).join('') + `</button>`);
    });
    // alças do caminho em foco: o Imperador arrasta os pontos; as menores criam um ponto novo
    if (imperador && !modo && foco.tipo === 'linha' && a) {
      a.pts.forEach((p, i) => { if (i) h += mk({ x: (p.x + a.pts[i - 1].x) / 2, y: (p.y + a.pts[i - 1].y) / 2 }, `<div class="mp-alca meio"></div>`); });
      a.pts.forEach((p, i) => { h += mk(p, `<div class="mp-alca${vsel === i ? ' sel' : ''}"></div>`); });
    }
    elMk.innerHTML = h;
    passe(); listas();
  }

  function passe() {
    const f = foco, a = alvo(), el = $('passe'), pe = $('passe-pe');
    let id = '', nums = '', nums2 = '', modos = '', acoes = '', nota = '';
    const cel = (rot, val) => `<div class="mp-celula"><span class="mp-rotulo">${rot}</span><span class="mp-valor assenta">${val}</span></div>`;
    const campo = (rot) => `<label class="mp-rotulo" for="mp-nome-foco">${rot}</label><input class="mp-passe-nome" id="mp-nome-foco" data-el="nome-foco" value="${esc(a.nome)}" maxlength="40" autocomplete="off">`;
    const fixo = (rot, vivoCls) => `<span class="mp-rotulo">${rot}</span><span class="mp-valor nome assenta${vivoCls ? ' vivo' : ''}">${esc(a.nome)}</span>`;
    /* SÓ O ÍCONE (15/11/2026, usuário: "Nos itens do mapa 'abrir a ficha, medir
       daqui, etc' deixe apenas o ícone"). O nome vai no aria-label e no balão
       do hover (data-dica, desenhado no CSS como o .mn-tip). */
    const bt = (acao, ico, txt, perigo) => `<button type="button" class="mp-acao so-ico${perigo ? ' perigo' : ''}" data-acao="${acao}" aria-label="${esc(txt)}" data-dica="${esc(txt)}"><i class="ti ${ico}" aria-hidden="true"></i></button>`;
    const doisNums = (rot, k) => cel(rot, `${fmtKm(k)} <small>km</small>`) + cel(tr('A pé', 'On foot'), dias(k));

    /* SEM NADA ESCOLHIDO, SÓ O MAPA (15/11/2026, usuário: "Quando não tiver
       nenhuma cidade ou local selecionado, o mapa ocupa a tela toda. Ou seja,
       remova o texto 'Toque numa cidade...'"). O painel some (ver painelVazio). */
    if (f.tipo === 'nada') { el.hidden = true; pe.innerHTML = ''; return; }
    el.hidden = false;
    if (f.tipo === 'rota') {
      id = `<span class="mp-rotulo">${tr('Rota', 'Route')}</span><span class="mp-valor nome assenta">${esc(rotaAtual.origem.nome)} <i class="ti ti-arrow-right" aria-hidden="true"></i> ${esc(rotaAtual.destino.nome)}</span>`;
      if ((rotaAtual.paradas || []).length) id += `<span class="mp-rotulo mp-paradas-rot">${tr('Passando por', 'Passing through')}</span><ol class="mp-paradas">` + rotaAtual.paradas.map((p, i) =>
        `<li><span>${esc(p.nome)}</span><button type="button" class="mp-parada-tira" data-acao="rota-tira-parada" data-i="${i}" aria-label="${tr('Tirar', 'Remove')} ${esc(p.nome)}"><i class="ti ti-x" aria-hidden="true"></i></button></li>`).join('') + '</ol>';
      const R = rotaAtual.r;
      /* AS SUGESTÕES (22/11/2026): uma linha por rota possível; tocar escolhe a
         que o mapa desenha e os números abaixo contam. Os dias da linha são a pé
         (o barco conta na velocidade dele). */
      const terraDe = (s) => km(s.naEstrada + s.foraDaEstrada), aguaDe = (s) => km(s.naAgua || 0);
      const diasDe = (s, porDia) => terraDe(s) / porDia + aguaDe(s) / MAPA_KM_DIA_NAVEGANDO;
      const diasTxt = (d) => (d < 1 ? tr('< 1 dia', '< 1 day') : Math.round(d) + (Math.round(d) === 1 ? tr(' dia', ' day') : tr(' dias', ' days')));
      const nomeSug = (s) => s.tipo === 'barco' ? (tr('Estrada e barco', 'Road and boat') + ((s.via || nomeDaAgua(s)) ? ' · ' + esc(s.via || nomeDaAgua(s)) : ''))
        : s.tipo === 'paradas' ? tr('Pelas paradas', 'Through the stops') : s.tipo === 'paradas-terra' ? tr('Pelas paradas, só por terra', 'Through the stops, by land only')
        : s.tipo === 'alternativa' ? tr('Alternativa por terra', 'Alternative by land') : s.sugerida ? tr('Rota sugerida', 'Suggested route') : tr('Pela estrada', 'By road');
      modos = `<div class="mp-sugestoes" role="radiogroup" aria-label="${tr('Sugestões de rota', 'Route suggestions')}">` + rotaAtual.sugestoes.map((s, i) =>
        `<button type="button" class="mp-sugestao" role="radio" aria-checked="${i === rotaAtual.escolha}" data-acao="rota-escolha" data-i="${i}">
          <span class="mp-sugestao-nome">${nomeSug(s)}</span><span class="mp-modo-km">${fmtKm(terraDe(s) + aguaDe(s))} <small>km</small></span><span class="mp-modo-dias">${diasTxt(diasDe(s, MAPA_KM_DIA_A_PE))}</span></button>`).join('') + '</div>';
      const k = terraDe(R) + aguaDe(R), fora = km(R.foraDaEstrada);
      /* UMA LINHA POR JEITO DE VIAJAR (22/11/2026, usuário: "Caminhando 2495km
         83 dias / Cavalgando 2495km 42 dias / Voando 1005km x dias"). Caminhando
         e cavalgando pela rota; voando, em linha reta. */
      const voo = km(dist(rotaAtual.origem, rotaAtual.destino));
      const modo = (rot, kk, d) => `<div class="mp-modo"><span class="mp-rotulo">${rot}</span><span class="mp-modo-km">${fmtKm(kk)} <small>km</small></span><span class="mp-modo-dias">${diasTxt(d)}</span></div>`;
      // caminhando e cavalgando pela rota escolhida (com barco, o trecho de água vai na velocidade do barco)
      modos += `<div class="mp-modos-lista">` + modo(tr('Caminhando', 'Walking'), k, diasDe(R, MAPA_KM_DIA_A_PE)) + modo(tr('Cavalgando', 'Riding'), k, diasDe(R, MAPA_KM_DIA_A_CAVALO)) + modo(tr('Voando', 'Flying'), voo, voo / MAPA_KM_DIA_VOANDO);
      // Navegando: pela água, de porto a porto (22/11/2026, "Adicione também Navegando x km x dias").
      const mar = rotaAtual.mar;
      modos += (mar ? modo(tr('Navegando', 'Sailing'), km(mar.comprimento), km(mar.comprimento) / MAPA_KM_DIA_NAVEGANDO)
        : `<div class="mp-modo"><span class="mp-rotulo">${tr('Navegando', 'Sailing')}</span><span class="mp-modo-sem">${mar === undefined ? tr('calculando…', 'working…') : tr('sem caminho por água', 'no way by water')}</span></div>`) + '</div>';
      if (R.sugerida) {
        const solto = R.longe === 'a' ? rotaAtual.origem.nome : R.longe === 'b' ? rotaAtual.destino.nome : null;
        nota = (solto
          ? tr(`Não há caminho: ${esc(solto)} não fica em nenhum caminho do mapa.`, `No road: ${esc(solto)} is not on any road on the map.`)
          : tr('Não há caminho ligando a origem ao destino.', 'No road connects the origin to the destination.'))
          + ' ' + tr(`A rota sugerida usa os caminhos que existem e faz ${fmtKm(fora)} km fora da estrada (pontilhado).`, `The suggested route uses the existing roads and goes ${fmtKm(fora)} km off-road (dotted).`);
      } else if (fora) nota = tr(`Inclui ${fmtKm(fora)} km fora da estrada, até o caminho e do caminho.`, `Includes ${fmtKm(fora)} km off-road, to and from the road.`);
      const pelaAgua = R.via || nomeDaAgua(R);
      if (aguaDe(R)) nota = (nota ? nota + ' ' : '') + tr(`De barco: ${fmtKm(aguaDe(R))} km${pelaAgua ? ' pelo ' + esc(pelaAgua) : ''} (tracejado).`, `By boat: ${fmtKm(aguaDe(R))} km${pelaAgua ? ' across ' + esc(pelaAgua) : ''} (dashed).`);
      acoes = bt('rota-parada', 'ti-map-pin-plus', tr('Passar por um lugar', 'Pass through a place')) + bt('rota-inverter', 'ti-arrows-exchange', tr('Inverter origem e destino', 'Swap origin and destination')) + bt('rota-limpar', 'ti-x', tr('Limpar a rota', 'Clear the route'));
    } else if (f.tipo === 'aqui') {
      const com = postos().filter((g) => !g.eu && dist(g, EU) < MAPA_PERTO).map((g) => g.nome);
      id = fixo(tr('Você está em', 'You are in'));
      const reino = reinoDe(EU), cid = cidadeMaisProxima(EU);
      nums = cel(tr('Reino', 'Kingdom'), reino ? esc(reino) : '—')
        + cel(tr('Cidade', 'City'), cid ? `${esc(cid.nome)} <small>${fmtKm(km(dist(cid, EU)))} km</small>` : `— <small>${tr('nenhuma à vista', 'none in sight')}</small>`);
      nota = com.length ? tr(`Com você: ${esc(com.join(', '))}.`, `With you: ${esc(com.join(', '))}.`) : '';   // sem o 'Você está sozinho aqui.' (17/11/2026)
    } else if (f.tipo === 'gente') {
      const juntos = postos().filter((g) => String(g.id) !== String(a.id) && dist(g, a) < .06).map((g) => g.nome);
      id = fixo(tr('Personagem', 'Character'));
      nums = cel(tr('Onde está', 'Where'), esc(onde(a)));
      if (mestre) {
        acoes = bt('repor', 'ti-map-pin', tr('Pôr em outro lugar', 'Place elsewhere')) + bt('tirar-gente', 'ti-trash', tr('Tirar do mapa', 'Remove from map'), true);
        nota = juntos.length
          ? tr(`Arraste no mapa para mover; ${esc(juntos.join(', '))} ${juntos.length > 1 ? 'vão' : 'vai'} junto.`, `Drag on the map to move; ${esc(juntos.join(', '))} will follow.`)
          : tr('Arraste no mapa para mover.', 'Drag on the map to move.');
      }
    } else if (f.tipo === 'linha') {
      const k = km(caminho(a.pts)), rot = tr('Caminho', 'Road');
      id = imperador ? campo(rot) : fixo(rot);
      nums = doisNums(tr('Comprimento', 'Length'), k);
      if (imperador) {
        acoes = bt('continuar', 'ti-pencil-plus', tr('Continuar traçado', 'Keep drawing'));
        if (vsel != null && a.pts.length > 2) acoes += bt('tirar-ponto', 'ti-point-off', tr('Tirar o ponto', 'Remove point'));
        acoes += bt('remover', 'ti-trash', tr('Remover', 'Remove'), true);
        nota = tr('Arraste os pontos no mapa para ajustar. Os menores criam um ponto novo.', 'Drag the points on the map to adjust. The smaller ones create a new point.');
      }
    } else {
      const quem = postos().filter((g) => dist(g, a) < MAPA_PERTO).map((g) => g.nome);
      if (EU) nums = doisNums(EU.eu ? tr('Em linha reta', 'Straight line') : tr('De ' + esc(EU.nome), 'From ' + esc(EU.nome)), km(dist(EU, a)));
      if (f.tipo === 'lugar') {
        const rot = a.tipo === 'cidade' ? tr('Cidade', 'City') : a.tipo === 'local' ? tr('Local', 'Place') : a.tipo === 'reino' ? tr('Reino', 'Kingdom') : tr('Ponto de interesse', 'Point of interest');
        /* CIDADE E LOCAL NÃO SE RENOMEIAM NO MAPA (15/11/2026, usuário: "Ao clicar
           em algumas cidades, como Quizes, a forma como mostra o nome está
           diferente, como se pudesse editar no mapa. A edição é apenas na página
           de cidade, etc."). Só o ponto de interesse, que é do mapa, tem campo. */
        id = mestre && a.tipo === 'ponto' ? campo(rot) : fixo(rot);
        if (!mestre) acoes = bt('marcar', 'ti-map-pin', tr('Marcar interesse', 'Mark interest'));
      } else {
        id = marcaSolta(a) ? campo(tr('Sua marca', 'Your mark')) : fixo(tr('Lugar marcado', 'Marked place'));
        acoes = bt('desmarcar', 'ti-trash', tr('Remover marca', 'Remove mark'), true);
      }
      if (mestre) {
        if (gente.length) acoes += bt('trazer', 'ti-users', tr('Trazer a comitiva', 'Bring the party'));
        // O lugar do mundo só o Imperador move ou tira; o Mestre usa como está.
        const doMundo = f.tipo === 'lugar' && a.mundo;
        // O "Arraste no mapa para mudar de lugar" saiu (15/11/2026, a pedido do usuário).
        /* MOVER POR BOTÃO (17/11/2026, usuário: "Adicione um botão para mover a
           cidade/reino/local no mapa"). Arrastar continua valendo; o botão é o
           caminho que se vê: liga o modo 'mover' e o próximo toque leva o lugar. */
        if (f.tipo === 'lugar' && (!doMundo || imperador)) acoes += bt('mover', 'ti-arrows-move', tr('Mover no mapa', 'Move on the map'));
        if (!doMundo || imperador) acoes += bt('remover', 'ti-trash', tr('Remover', 'Remove'), true);
      } else if (quem.length) nota = tr(`${esc(quem.join(', '))} ${quem.length > 1 ? 'estão' : 'está'} aqui.`, `${esc(quem.join(', '))} ${quem.length > 1 ? 'are' : 'is'} here.`);
    }
    /* O que a aba Cidades sabe deste lugar: reino e população no passe, e a
       ficha inteira a um toque. */
    const lugarDaFicha = f.tipo === 'marca' ? (marcaSolta(a) ? null : lugarId(a.lugar)) : (f.tipo === 'lugar' || f.tipo === 'aqui') ? a : null;
    const ficha = fichaDe(lugarDaFicha);
    let daFicha = '';
    if (ficha) {
      const at = ficha.atributos || {}, reino = at.reino ? (nomesLore[at.reino] || at.reino) : '', pop = Number(at.populacao) || 0;
      if (reino && f.tipo !== 'aqui') daFicha += cel(tr('Reino', 'Kingdom'), esc(reino));
      if (pop) daFicha += cel(tr('População', 'Population'), fmtKm(pop));
      acoes = bt('ficha', 'ti-building', tr('Abrir a ficha', 'Open the entry')) + acoes;
    }
    /* A LOJA MORA NA CIDADE DO MAPA (15/11/2026, usuário: "O botão 'loja' ...
       agora ele só deve aparecer no mapa ao clicar na cidade"). Só o Mestre,
       dentro de uma mesa: leva ao Estoque já na loja desta cidade. */
    if (cfg.aoAbrirLoja && f.tipo === 'lugar' && a.tipo === 'cidade') acoes += bt('loja', 'ti-building-store', tr('Loja', 'Shop'));
    const editando = document.activeElement && document.activeElement.id === 'mp-nome-foco';
    if (!editando) el.innerHTML = `<div class="mp-passe-id">${id}</div>` + (modos ? `<div class="mp-modos">${modos}</div>` : '') + (nums ? `<div class="mp-passe-nums">${nums}</div>` : '') + (nums2 ? `<div class="mp-passe-nums">${nums2}</div>` : '') + (daFicha ? `<div class="mp-passe-nums">${daFicha}</div>` : '');   // não rouba o cursor de quem digita
    pe.innerHTML = (acoes ? `<div class="mp-acoes">${acoes}</div>` : '') + (nota ? `<p class="mp-nota">${nota}</p>` : '');
  }

  function listas() {
    const a = alvo();
    const quadro = (titulo, n, col, linhas, vazio) => `<section class="mp-secao"><div class="mp-quadro-cab"><span class="mp-rotulo">${titulo}</span><span class="mp-conta">${n}</span><span class="mp-rotulo col">${col}</span></div>
      <ul class="mp-quadro">${linhas || (vazio ? `<li><p class="mp-vazio">${vazio}</p></li>` : '')}</ul></section>`;
    const item = (ico, nome, tipo, num, attrs, atual) => `<li><button type="button" class="mp-linha" ${attrs} aria-current="${!!atual}">
      <span class="mp-ln-ico"><i class="ti ${ico}" aria-hidden="true"></i></span>
      <span class="mp-ln-txt"><span class="mp-ln-nome">${esc(nome)}</span>${tipo ? `<span class="mp-ln-tipo">${tipo}</span>` : ''}</span>
      <span class="mp-ln-num">${num}</span></button></li>`;
    const emFoco = (tipo, id) => foco.tipo === tipo && String(foco.id) === String(id);
    const longe = (p) => (EU ? fmtKm(km(dist(EU, p))) + ' km' : '');
    const daLinha = () => mesa.linhas.map((l) =>
      item('ti-route', l.nome, '', fmtKm(km(caminho(l.pts))) + ' km', `data-alvo="linha" data-id="${esc(l.id)}"`, emFoco('linha', l.id))).join('');

    let h = '';
    if (mestre) {
      const pontos = mesa.lugares.filter((l) => l.tipo === 'ponto'), novas = mesa.lugares.filter((l) => l.tipo === 'cidade' && !l.p);
      const doLugar = (l) => item(iconeLugar(l), l.nome, '', longe(l), `data-alvo="lugar" data-id="${esc(l.id)}"`, emFoco('lugar', l.id));
      const colLonge = EU ? tr('De ' + esc(EU.nome), 'From ' + esc(EU.nome)) : '';
      /* CADA QUADRO COM A SUA FERRAMENTA (15/11/2026, usuário: "As informações
         de 'rotas', 'caminhos', 'pontos' e 'cidades novas' só aparecem no menu
         lateral quando o botão estiver ativo"). Sem ferramenta ligada, o painel
         fica com o passe e a comitiva. */
      if (modo === 'caminho') h += quadro(tr('Caminhos', 'Roads'), mesa.linhas.length, tr('Comprimento', 'Length'), daLinha(),
        tr('Nenhum caminho ainda. Toque, um a um, nos pontos da estrada.', 'No road yet. Tap, one by one, the points of the road.'));
      if (modo === 'ponto') h += quadro(tr('Pontos', 'Points'), pontos.length, colLonge, pontos.map(doLugar).join(''), tr('Nenhum ponto ainda. Toque no mapa onde fica o ponto.', 'No point yet. Tap the map where the point is.'));
      const locaisNoMapa = mesa.lugares.filter((l) => l.tipo === 'local');
      if (modo === 'cidade') h += quadro(tr('Cidades novas', 'New cities'), novas.length, colLonge, novas.map(doLugar).join(''),
        tr(`As ${mesa.lugares.length - novas.length - pontos.length - locaisNoMapa.length} cidades da pintura já respondem ao toque.`, `The ${mesa.lugares.length - novas.length - pontos.length - locaisNoMapa.length} painted cities already respond to taps.`));
      if (modo === 'local') h += quadro(tr('Locais no mapa', 'Places on the map'), locaisNoMapa.length, colLonge, locaisNoMapa.map(doLugar).join(''),
        tr('Nenhum local no mapa ainda. Escolha um cadastrado na lista acima e toque onde ele fica.', 'No place on the map yet. Pick a registered one in the list above and tap where it is.'));
    }
    // A comitiva é só do Mestre (22/11/2026, usuário: "O personagem não terá informações de onde os outros personagens estão").
    if (!cfg.semMesa && mestre) h += quadro(tr('Comitiva', 'Party'), gente.length, tr('Onde está', 'Where'), gente.map((g) => {
      const p = mesa.gente[g.id];
      return `<li><button type="button" class="mp-linha" data-alvo="gente" data-id="${esc(g.id)}" aria-current="${emFoco('gente', g.id) || (!!p && !!a && (foco.tipo === 'aqui' || foco.tipo === 'lugar') && dist(a, p) < MAPA_PERTO)}">
        ${disco(g)}
        <span class="mp-ln-txt"><span class="mp-ln-nome">${esc(g.nome)}</span></span>
        <span class="mp-ln-num${p ? '' : ' fora'}">${p ? esc(onde(p)) : (mestre ? `<i class="ti ti-map-pin" aria-hidden="true"></i><span class="sr-only">${tr('Pôr no mapa', 'Place on map')}</span>` : tr('Fora do mapa', 'Off the map'))}</span></button></li>`;
    }).join(''), mestre ? tr('Esta mesa ainda não tem personagens.', 'This table has no characters yet.') : tr('Ninguém na mesa ainda.', 'Nobody at the table yet.'));
    // Sem marca, sem o quadro (22/11/2026, usuário: "Quando não houver marcas, não precisa mostrar o texto 'marcas 0 de você'").
    if (!mestre && cfg.aoMudarMarcas && marcas.length) {
      h += quadro(tr('Marcas', 'Marks'), marcas.length, tr('De você', 'From you'),
        marcas.map((m) => item('ti-map-pin', m.nome, marcaSolta(m) ? tr('Sua marca', 'Your mark') : tr('Lugar marcado', 'Marked place'), longe(m), `data-alvo="marca" data-id="${esc(m.id)}"`, emFoco('marca', m.id))).join('') +
        '');   // sem o texto de 'Nenhuma marca sua ainda…' (17/11/2026)
    }
    $('listas').innerHTML = h;
    achados();
    /* O painel só existe quando tem o que mostrar: algo escolhido, uma
       ferramenta que pede lista, uma busca, ou (Mestre) alguém da comitiva
       ainda fora do mapa — sem o painel não haveria como pô-lo. */
    const painelVazio = foco.tipo === 'nada' && !['cidade', 'local', 'reino', 'ponto', 'caminho', 'rota'].includes(modo) && !busca.trim()
      && !(mestre && gente.some((g) => !mesa.gente[g.id]));
    elMapa.parentElement.classList.toggle('so-mapa', painelVazio);
  }

  function achados() {
    const q = semAcento(busca.trim()), el = $('achados');
    if (CADASTRADOS.includes(modo)) {   // a ferramenta Cidade, Local ou Reino: os cadastrados que ainda não estão no mapa
      const ehLocal = modo === 'local', ehReino = modo === 'reino';
      const livres = foraDoMapa(modo), mostra = livres.filter((e) => !q || semAcento(e.nome).includes(q));
      const chegou = cadDoTipo(modo);
      const vazio = !chegou
        ? (ehReino ? tr('Os reinos cadastrados ainda não chegaram. Tente de novo em instantes.', 'The registered kingdoms have not loaded yet. Try again in a moment.')
          : ehLocal ? tr('Os locais cadastrados ainda não chegaram. Tente de novo em instantes.', 'The registered places have not loaded yet. Try again in a moment.')
                   : tr('As cidades cadastradas ainda não chegaram. Tente de novo em instantes.', 'The registered cities have not loaded yet. Try again in a moment.'))
        : q && livres.length
          ? (ehReino ? tr('Nenhum reino cadastrado com esse nome fora do mapa.', 'No registered kingdom with that name off the map.')
            : ehLocal ? tr('Nenhum local cadastrado com esse nome fora do mapa.', 'No registered place with that name off the map.')
                     : tr('Nenhuma cidade cadastrada com esse nome fora do mapa.', 'No registered city with that name off the map.'))
          : (ehReino ? tr('Todos os reinos cadastrados já estão no mapa. Para pôr outro, use Novo reino.', 'Every registered kingdom is already on the map. To place another, use New kingdom.')
            : ehLocal ? tr('Todos os locais cadastrados já estão no mapa. Para pôr outro, use Novo local.', 'Every registered place is already on the map. To place another, use New place.')
                     : tr('Todas as cidades cadastradas já estão no mapa. Para pôr outra, use Nova cidade.', 'Every registered city is already on the map. To place another, use New city.'));
      const titulo = ehReino ? tr('Reinos cadastrados', 'Registered kingdoms') : ehLocal ? tr('Locais cadastrados', 'Registered places') : tr('Cidades cadastradas', 'Registered cities');
      // O reino não tem reino: a coluna da direita some na lista dele.
      el.innerHTML = `<li class="mp-quadro-cab"><span class="mp-rotulo">${titulo}</span><span class="mp-conta">${livres.length}</span>${ehReino ? '' : `<span class="mp-rotulo col">${tr('Reino', 'Kingdom')}</span>`}</li>` +
        (mostra.map((e) => { const reino = !ehReino && e.atributos && e.atributos.reino;
          return `<li><button type="button" class="mp-linha" data-ficha="${esc(e.id)}" aria-current="${!!(novaEntrada && novaEntrada.ficha) && String(novaEntrada.ficha.id) === String(e.id)}">
            <span class="mp-ln-ico"><i class="ti ${ICONE_LUGAR[modo]}" aria-hidden="true"></i></span>
            <span class="mp-ln-txt"><span class="mp-ln-nome">${esc(e.nome)}</span></span><span class="mp-ln-num">${reino ? esc(nomesLore[reino] || reino) : ''}</span></button></li>`; }).join('')
          || `<li><p class="mp-vazio">${vazio}</p></li>`);
      return;
    }
    if (modo === 'rota') {   // a busca da Rota: escolher o destino, depois a origem
      const ja = rotaAtual && rotaAtual.destino;
      const todos = lugaresDaRota().filter((l) => !ja || l.x !== ja.x || l.y !== ja.y).sort((x, y) => semAcento(x.nome).localeCompare(semAcento(y.nome)));
      const mostra = q ? [...todos.filter((l) => semAcento(l.nome).startsWith(q)), ...todos.filter((l) => !semAcento(l.nome).startsWith(q) && semAcento(l.nome).includes(q))] : todos;
      el.innerHTML = `<li class="mp-quadro-cab"><span class="mp-rotulo">${rotaAtual && rotaAtual.adicionando ? tr('Passar por onde?', 'Pass through where?') : ja ? tr('De onde?', 'From where?') : tr('Para onde?', 'Where to?')}</span><span class="mp-conta">${mostra.length}</span></li>` +
        (mostra.map((l) => `<li><button type="button" class="mp-linha" data-acao="rota-lugar" data-id="${esc(l.id)}">
          <span class="mp-ln-ico"><i class="ti ${iconeLugar(l)}" aria-hidden="true"></i></span>
          <span class="mp-ln-txt"><span class="mp-ln-nome">${esc(l.nome)}</span></span></button></li>`).join('')
          || `<li><p class="mp-vazio">${tr('Nenhum lugar com esse nome no mapa.', 'No place with that name on the map.')}</p></li>`);
      return;
    }
    if (!q) { el.innerHTML = ''; return; }
    const nomes = mesa.lugares.filter((l) => !oculto(l)).map((l) => [semAcento(l.nome), l]).sort((x, y) => x[0].localeCompare(y[0]));
    const achou = [...nomes.filter((n) => n[0].startsWith(q)), ...nomes.filter((n) => !n[0].startsWith(q) && n[0].includes(q))].slice(0, 6).map((n) => n[1]);
    el.innerHTML = achou.map((l) => `<li><button type="button" class="mp-linha" data-alvo="lugar" data-id="${esc(l.id)}">
      <span class="mp-ln-txt"><span class="mp-ln-nome">${esc(l.nome)}</span></span><span class="mp-ln-num">${EU ? fmtKm(km(dist(EU, l))) + ' km' : ''}</span></button></li>`).join('')
      || `<li><p class="mp-vazio">${tr('Nenhum lugar com esse nome neste mapa.', 'No place with that name on this map.')}</p></li>`;
  }

  const FERR = {
    rota: ['ti-route', tr('Rota', 'Route')], marcar: ['ti-map-pin-plus', tr('Marcar', 'Mark')],
    reino: ['ti-crown', tr('Reino', 'Kingdom')],
    cidade: ['ti-map-pin', tr('Cidade', 'City')], local: ['ti-map-pin', tr('Local', 'Place')],
    caminho: ['ti-road', tr('Caminho', 'Road')],
    nomes: ['ti-typography', tr('Nomes', 'Names')],
  };
  function aviso() {
    const el = $('aviso');
    /* Reino, Cidade, Local e Caminho são do mundo: só o Imperador, dentro ou fora de mesa.
       Fora de mesa não há ponto — esse é da história de cada mesa. */
    const doMundo = imperador ? ['reino', 'cidade', 'local', ...(cfg.aoMudarMundo ? ['caminho'] : [])] : [];
    // A Rota é de todos: acha o trajeto pelos caminhos entre dois lugares.
    // Sem Medir e sem Ponto (21/11/2026, usuário: "Eu não quero mais o botão 'medir' e o botão 'ponto'").
    const quais = mestre ? ['rota', ...doMundo] : (cfg.aoMudarMarcas ? ['rota', 'marcar'] : ['rota']);
    $('ferramentas').innerHTML = quais.map((k) =>
      // As peças do trilho do topo (.livro-trilho .mc-acao), não uma cópia delas (15/11/2026).
      `<button type="button" class="mc-acao mp-ferr${modo === k ? ' is-ativo' : ''}" data-modo="${k}" aria-pressed="${modo === k}" aria-label="${FERR[k][1]}"><i class="ti ${FERR[k][0]}" aria-hidden="true"></i><span class="mc-acao-rotulo">${FERR[k][1]}</span></button>`).join('');
    $('barra').classList.toggle('cheia', mestre);
    elMapa.classList.toggle('ferramenta', !!modo);
    elMapa.classList.toggle('editando-nomes', ehTextos());
    const ROT_NOVO = { local: tr('Novo local', 'New place'), cidade: tr('Nova cidade', 'New city'), reino: tr('Novo reino', 'New kingdom') };
    const botoes = (...b) => `<span class="mp-aviso-acoes">${b.map(([acao, txt]) => `<button type="button" class="mp-acao" data-acao="${acao}">${txt}</button>`).join('')}</span>`;
    let h = '';
    if (modo === 'marcar') h = tr('Toque no mapa onde quer deixar a marca.', 'Tap the map where you want to leave the mark.');
    else if (CADASTRADOS.includes(modo) && novaEntrada) {
      /* NOVO LOCAL / NOVA CIDADE / NOVO REINO (22/11/2026, usuário: "Melhore o card de
         inserir novo local, espaçamento, etc."). Um cartão de formulário: o
         título com Cancelar, e cada grupo "rótulo e campo" com respiro entre eles.
         No local, primeiro Pino ou Texto; só o texto pede o tipo, numa grade de
         5×2 com a cor de cada tipo num ponto (a cor do mapa, feita para o chão
         claro, não teria contraste como letra no cartão escuro). */
      const ne = novaEntrada, ex = { local: 'Rio Belrra', cidade: 'Saupami', reino: 'Calco' }[ne.tipo];
      const COR_TIPO = { rio: '#4FA3C7', lago: '#4FA3C7', mar: '#4FA3C7', serra: '#A88C6C', vulcao: '#A88C6C', floresta: '#5BA37A', deserto: '#C9A46A', planicie: '#C9A46A', ilha: '#7FC4A0', regiao: '#B8AE9C' };
      const grupo = (rot, corpo, para) => `<div class="mp-form-grupo">${para ? `<label class="mp-rotulo" for="${para}">${rot}</label>` : `<span class="mp-rotulo">${rot}</span>`}${corpo}</div>`;
      const opcao = (acao, valor, ativo, conteudo, extraCls = '') => `<button type="button" class="mp-form-opcao${extraCls}" role="radio" data-acao="${acao}" data-geo="${valor}" aria-checked="${ativo}">${conteudo}</button>`;
      let corpo = grupo(ne.ficha ? tr('Texto no mapa', 'Text on the map') : tr('Nome', 'Name'), `<input id="mp-entrada-nome" class="mp-form-campo" type="text" value="${esc(ne.nome || '')}" placeholder="${ne.ficha ? esc(ne.ficha.nome) : tr('ex.: ' + ex, 'e.g. ' + ex)}" autocomplete="off">`
        + (ne.ficha ? `<span class="mp-form-nota">${tr('A ficha continua com o nome dela; este texto vale só no mapa.', 'The entry keeps its own name; this text is only for the map.')}</span>` : ''), 'mp-entrada-nome');
      if (ne.tipo === 'local') {
        const ehTexto = ne.geo !== 'pino';
        corpo += grupo(tr('Aparece no mapa como', 'Shows on the map as'), `<div class="mp-form-dupla" role="radiogroup" aria-label="${tr('Aparece no mapa como', 'Shows on the map as')}">`
          + opcao('entrada-tipo', 'pino', !ehTexto, `<i class="ti ti-map-pin" aria-hidden="true"></i>${tr('Pino', 'Pin')}`)
          + opcao('entrada-tipo', ehTexto ? ne.geo : (ne.ultimoGeo || 'rio'), ehTexto, `<i class="ti ti-typography" aria-hidden="true"></i>${tr('Texto', 'Label')}`) + '</div>');
        if (ehTexto) corpo += grupo(tr('Tipo do texto', 'Label type'), `<div class="mp-form-tipos" role="radiogroup" aria-label="${tr('Tipo do texto', 'Label type')}">`
          + GEO_TIPOS_NOVO.map(([g, n]) => opcao('entrada-tipo', g, ne.geo === g, `<span class="mp-form-ponto" style="--cor:${COR_TIPO[g]}" aria-hidden="true"></span>${n}`, ' mp-form-tipo')).join('') + '</div>');
      }
      if (ne.tipo === 'cidade' && !ne.ficha) corpo += grupo(tr('Reino', 'Kingdom'), `<select id="mp-entrada-reino" class="mp-form-campo"><option value="">${tr('Escolha o reino', 'Pick the kingdom')}</option>`
        + (cadDoTipo('reino') || []).slice().sort((x, y) => semAcento(x.nome).localeCompare(semAcento(y.nome))).map((r) => `<option value="${esc(r.id)}"${String(ne.reino) === String(r.id) ? ' selected' : ''}>${esc(r.nome)}</option>`).join('') + '</select>', 'mp-entrada-reino');
      const ultimo = { local: tr('Depois, toque no mapa onde ele fica.', 'Then tap the map where it is.'), cidade: tr('Depois, toque no mapa onde ela fica.', 'Then tap the map where it is.'), reino: tr('Depois, toque no mapa onde ele fica.', 'Then tap the map where it is.') }[ne.tipo];
      h = `<div class="mp-nome-ed mp-form">
        <div class="mp-form-topo"><span class="mp-form-titulo">${ne.ficha ? esc(ne.ficha.nome) : ROT_NOVO[ne.tipo]}</span><button type="button" class="mp-acao" data-acao="entrada-cancelar">${tr('Cancelar', 'Cancel')}</button></div>
        <div class="mp-form-corpo">${corpo}</div>
        <p class="mp-form-pe${recado ? ' alerta' : ''}" role="status"><i class="ti ${recado ? 'ti-alert-circle' : 'ti-hand-click'}" aria-hidden="true"></i>${recado ? esc(recado.txt) : ultimo}</p></div>`;
    }
    else if (ehTextos() && geoSel && geoPorId(geoSel)) {
      // O TEXTO ESCOLHIDO: o que está escrito, a cor e o estilo
      const r = geoPorId(geoSel), e = geoEf(r), p = geoPadrao(r), val = (k) => (e[k] != null ? e[k] : p[k]);
      const liga = (acao, ico, rotulo, on) => `<button type="button" class="mp-estilo" data-acao="${acao}" aria-pressed="${!!on}" aria-label="${rotulo}" data-dica="${rotulo}"><i class="ti ${ico}" aria-hidden="true"></i></button>`;
      const tam = val('tam'), i = GEO_TAMS.indexOf(tam);
      const cores = `<button type="button" class="mp-cor padrao" data-acao="geo-cor" data-cor="" aria-pressed="${!e.cor}" aria-label="${tr('Cor padrão do tipo', 'Default type color')}" data-dica="${tr('Cor padrão do tipo', 'Default type color')}"></button>`
        + GEO_CORES.map(([c, n]) => `<button type="button" class="mp-cor" data-acao="geo-cor" data-cor="${c}" style="--cor:${c}" aria-pressed="${e.cor === c}" aria-label="${n}" data-dica="${n}"></button>`).join('');
      h = `<div class="mp-nome-ed">
        <div class="mp-nome-ed-linha"><span class="mp-nome-ed-titulo">${tr('Texto no mapa', 'Map label')}</span><span class="mp-aviso-acoes">`
        + `<button type="button" class="mp-acao perigo" data-acao="geo-excluir" data-dica="${tr('Tira do mapa; o local continua na aba Locais', 'Removes it from the map; the place stays in the Places tab')}"><i class="ti ti-map-pin-off" aria-hidden="true"></i>${tr('Tirar do mapa', 'Remove from map')}</button>`
        + `<button type="button" class="mp-acao" data-acao="geo-restaurar" data-dica="${tr('Volta ao nome da ficha e ao jeito do tipo', 'Back to the entry name and the type style')}">${tr('Voltar ao padrão', 'Reset')}</button><button type="button" class="mp-acao" data-acao="geo-pronto">${tr('Pronto', 'Done')}</button></span></div>
        <label class="mp-rotulo mp-nome-ed-rot" for="mp-geo-texto">${tr('O que aparece escrito', 'What it says')}</label>
        <input id="mp-geo-texto" class="mp-aviso-campo" type="text" value="${esc(e.nome)}" placeholder="${esc(lugarDoGeo(geoSel) ? lugarDoGeo(geoSel).nome : '')}" autocomplete="off">
        <div class="mp-nome-ed-linha mp-nome-estilo"><span class="mp-cores" role="group" aria-label="${tr('Cor', 'Color')}">${cores}</span>
          <span class="mp-estilos" role="group" aria-label="${tr('Estilo', 'Style')}">`
          + liga('geo-negrito', 'ti-bold', tr('Negrito', 'Bold'), val('negrito'))
          + liga('geo-italico', 'ti-italic', tr('Itálico', 'Italic'), val('italico'))
          + liga('geo-caixa', 'ti-letter-case-upper', tr('Maiúsculas', 'Uppercase'), val('caixa'))
          + liga('geo-contorno', 'ti-shadow', tr('Contorno claro', 'Light outline'), val('contorno'))
          + `<span class="mp-tam" role="group" aria-label="${tr('Tamanho', 'Size')}"><button type="button" class="mp-estilo" data-acao="geo-menor" aria-label="${tr('Diminuir', 'Smaller')}" data-dica="${tr('Diminuir', 'Smaller')}" ${i <= 0 ? 'disabled' : ''}><i class="ti ti-minus" aria-hidden="true"></i></button><b>${Math.round(tam * 100)}%</b><button type="button" class="mp-estilo" data-acao="geo-maior" aria-label="${tr('Aumentar', 'Larger')}" data-dica="${tr('Aumentar', 'Larger')}" ${i >= GEO_TAMS.length - 1 ? 'disabled' : ''}><i class="ti ti-plus" aria-hidden="true"></i></button></span>`
          + `</span></div></div>`;
    }
    else if (CADASTRADOS.includes(modo)) {
      // escolher um cadastrado, ou criar um novo
      const dica = {
        local: tr('Escolha na lista um local, ou crie um novo.', 'Pick a place from the list, or create a new one.'),
        cidade: tr('Escolha na lista uma cidade para pôr no mapa, ou crie uma nova.', 'Pick a city from the list to put on the map, or create a new one.'),
        reino: tr('Escolha na lista um reino para pôr no mapa, ou crie um novo.', 'Pick a kingdom from the list to put on the map, or create a new one.'),
      }[modo];
      h = pondoCidade ? tr(`Toque no mapa onde fica ${esc(pondoCidade.nome)}.`, `Tap the map where ${esc(pondoCidade.nome)} is.`)
        : recado ? `<span>${esc(recado.txt)}</span>` + botoes(...(recado.antes ? [['desfazer', tr('Desfazer', 'Undo')]] : []), ['entrada-nova', ROT_NOVO[modo]])
        : `<span>${dica}</span>` + botoes(['entrada-nova', ROT_NOVO[modo]]);
    }
    else if (modo === 'ponto') h = tr('Toque no mapa onde fica o ponto.', 'Tap the map where the point is.');
    else if (modo === 'por') { const g = gente.find((x) => String(x.id) === String(pondo));
      h = pondo === 'todos' ? tr('Toque no mapa onde a comitiva está.', 'Tap the map where the party is.')
        : tr(`Toque no mapa onde ${esc(g ? g.nome : '')} está.`, `Tap the map where ${esc(g ? g.nome : '')} is.`); }
    else if (modo === 'mover') { const l = lugarId(movendo);
      h = `<span>${tr(`Toque no mapa no novo lugar de ${esc(l ? l.nome : '')}.`, `Tap the map at the new spot for ${esc(l ? l.nome : '')}.`)}</span>` + botoes(['cancelar-mover', tr('Cancelar', 'Cancel')]); }
    else if (modo === 'rota') h = rotaAtual && rotaAtual.adicionando
      ? `<span>${tr('Por onde a rota deve passar? Escolha na lista ou busque pelo nome.', 'Where should the route pass? Pick from the list or search by name.')}</span>` + botoes(['sair-rota', tr('Cancelar', 'Cancel')])
      : !rotaAtual
      ? tr('Para onde? Escolha o destino na lista ou busque pelo nome.', 'Where to? Pick the destination from the list or search by name.')
      : `<span>${tr(`Até ${esc(rotaAtual.destino.nome)}. Agora escolha a origem.`, `To ${esc(rotaAtual.destino.nome)}. Now pick the origin.`)}</span>` + botoes(['sair-rota', tr('Cancelar', 'Cancel')]);
    else if (modo === 'medir') {
      const k = km(caminho(medida));
      h = medida.length < 2 ? (medida.length ? tr('Toque no próximo ponto.', 'Tap the next point.') : tr('Toque nos pontos do caminho que quer medir.', 'Tap the points of the path you want to measure.'))
        : `<span><b>${fmtKm(k)} km</b> · ${dias(k)} ${tr('a pé', 'on foot')}</span>` + botoes(['limpar-medida', tr('Limpar', 'Clear')]);
    } else if (modo) {
      const k = km(caminho(traco));
      h = traco.length < 2 ? (traco.length ? tr('Toque no próximo ponto.', 'Tap the next point.') : tr('Toque, um a um, nos pontos do caminho.', 'Tap the road points one by one.'))
        : `<span><b>${fmtKm(k)} km</b> · ${dias(k)} ${tr('a pé', 'on foot')}</span>` + botoes(['volta-ponto', tr('Voltar um', 'Undo point')], ['concluir', tr('Concluir', 'Finish')]);
    } else if (recado) h = `<span>${esc(recado.txt)}</span>` + (recado.antes ? botoes(['desfazer', tr('Desfazer', 'Undo')]) : '');
    else if (semPintura) h = tr('A pintura do mapa não carregou. O resto funciona, mas sem o desenho por baixo.', 'The map painting did not load. Everything else works, but without the drawing underneath.');
    el.hidden = !h; el.innerHTML = h;
  }
  function trocarModo(m) {
    modo = modo === m ? null : m;
    if (modo === 'rota') { rotaAtual = null; if (foco.tipo === 'rota') foco = focoPadrao(); }   // a ferramenta começa uma rota nova
    if (modo !== 'medir') medida = [];
    traco = []; continua = null; pondo = null; pondoCidade = null; movendo = null; recado = null; passa = null; vsel = null;
    if (geoSel) { geoSel = null; geoDesenhar(); }
    novaEntrada = null;
    aviso(); desenhar();
  }
  /* Leva o lugar a p; os traçados e os personagens que estavam nele vão junto,
     como no arrasto. Fica o Desfazer. */
  function moverLugar(l, p) {
    const antes = JSON.stringify(mesa);
    if (imperador) mesa.linhas.forEach((ln) => ln.pts.forEach((v) => { if (dist(v, l) < .06) { v.x = p.x; v.y = p.y; } }));
    Object.values(mesa.gente).forEach((v) => { if (dist(v, l) < .06) { v.x = p.x; v.y = p.y; } });
    l.x = p.x; l.y = p.y;
    guardarMesa(); recado = { txt: tr(`${l.nome}: movido.`, `${l.nome}: moved.`), antes };
    EU = referencia();
  }
  const escreverNome = () => { const c = $('nome-foco'); if (c) { c.focus(); c.select(); } };
  function concluir() {
    if (traco.length < 2) { trocarModo(modo); return; }
    let l = continua && linhaId(continua); const nova = !l;
    if (l) l.pts = traco;
    else {
      l = { id: novoId(), tipo: 'caminho', nome: tr('Caminho ', 'Road ') + (mesa.linhas.length + 1), pts: traco };
      mesa.linhas.push(l);
    }
    guardarMesa(); modo = null; traco = []; continua = null; aviso(); focar({ tipo: 'linha', id: l.id }, false);
    if (nova) escreverNome();
  }
  function remover() {
    const a = alvo(), antes = JSON.stringify(mesa);
    if (foco.tipo === 'lugar') mesa.lugares = mesa.lugares.filter((l) => l.id !== a.id);
    else if (foco.tipo === 'gente') delete mesa.gente[a.id];
    else mesa.linhas = mesa.linhas.filter((l) => l.id !== a.id);
    guardarMesa(); recado = { txt: tr(`${a.nome}: removido.`, `${a.nome}: removed.`), antes };
    EU = referencia(); foco = focoPadrao(); vsel = null;
    aviso(); desenhar();
  }
  function porGente(quem, p) {
    const ids = quem === 'todos' ? gente.map((g) => g.id) : [quem];
    ids.forEach((id) => { mesa.gente[id] = { x: p.x, y: p.y }; });
    guardarMesa();
  }

  /* ── Gestos ── */
  const dedos = new Map(); let arrasto = null, pinca = null;
  /* O toque e o apontar só acham o que está à vista: o lugar que a faixa de
     zoom escondeu (data-nomes) não responde (21/11/2026). */
  const ORDEM_NIVEL = ['local', 'cidade', 'capital', 'reino'];
  const aVista = (l) => aVistaNaFaixa(l, Number(elMapa.dataset.nomes || 4));
  const maisPerto = (p, raioTela = 16) => { let m = null, md = raioTela / cam.s;
    for (const l of mesa.lugares) { if (oculto(l) || !aVista(l) || comTexto(l)) continue; const d = dist(l, p); if (d < md) { md = d; m = l; } } return m; };
  /* O ponto de outro caminho onde o toque gruda. `menos`: o caminho que está sendo
     traçada; `ignorar`: pontos que andam junto (lnId:i), para não grudar em si. */
  const verticeDeCaminho = (p, menos, ignorar = new Set(), raioTela = 14) => { let m = null, md = raioTela / cam.s;
    for (const ln of mesa.linhas) { if (ln.id === menos) continue;
      ln.pts.forEach((v, i) => { if (ignorar.has(ln.id + ':' + i)) return; const d = dist(v, p); if (d < md) { md = d; m = { x: v.x, y: v.y }; } }); }
    return m; };
  // No meio de um trecho: o outro caminho ganha um ponto ali, e os dois passam a dividi-lo.
  const trechoDeCaminho = (p, menos, raioTela = 12) => { let m = null, md = raioTela / cam.s;
    for (const ln of mesa.linhas) { if (ln.id === menos || ln.pts.length < 2) continue;
      const pr = projeta(p, ln.pts); if (pr.d < md) { md = pr.d; m = { ln, i: pr.i, q: { x: r1(pr.q.x), y: r1(pr.q.y) } }; } }
    if (!m) return null;
    m.ln.pts.splice(m.i + 1, 0, m.q);
    return { ...m.q }; };
  // Onde cai o ponto do caminho: ponto de outro caminho, senão o lugar, senão o meio de outro caminho, senão o toque.
  const pontoDoCaminho = (p, l, menos) => verticeDeCaminho(p, menos) || (l ? { x: l.x, y: l.y } : null) || trechoDeCaminho(p, menos) || p;
  const ligadosA = (a, i) => { const v = a.pts[i], r = [];
    mesa.linhas.forEach((ln) => { if (ln.id !== a.id) ln.pts.forEach((w, j) => { if (dist(w, v) < .06) r.push({ ln, i: j }); }); });
    return r; };
  const linhaPerto = (p) => { let m = null, md = 9 / cam.s;
    for (const l of mesa.linhas) { if (!visivel(l) || l.pts.length < 2) continue; const d = projeta(p, l.pts).d; if (d < md) { md = d; m = l; } }
    return m; };
  const local = (e) => { const r = elMapa.getBoundingClientRect(); return { px: e.clientX - r.left, py: e.clientY - r.top }; };
  /* O que o Mestre agarra da coisa em foco: um ponto da linha, o meio de um
     trecho, o lugar ou o personagem (e quem estiver junto dele). */
  function pegar(p) {
    const a = alvo(), r = 14 / cam.s; if (!a) return null;
    if (foco.tipo === 'lugar') return (a.mundo && !imperador) ? null : dist(a, p) < r ? { tipo: 'lugar' } : null;
    if (foco.tipo === 'gente') return dist(a, p) < 26 / cam.s ? { tipo: 'gente', ids: postos().filter((g) => dist(g, a) < .06).map((g) => g.id) } : null;
    if (foco.tipo !== 'linha' || !imperador) return null;
    let m = null, md = r;
    a.pts.forEach((v, i) => { const d = dist(v, p); if (d < md) { md = d; m = { tipo: 'v', i }; } });
    if (m) return { ...m, ligados: ligadosA(a, m.i) };
    md = r * .8;
    a.pts.forEach((v, i) => { if (!i) return; const d = dist({ x: (v.x + a.pts[i - 1].x) / 2, y: (v.y + a.pts[i - 1].y) / 2 }, p); if (d < md) { md = d; m = { tipo: 'meio', i }; } });
    return m;
  }

  ouvir(elMapa, 'pointerdown', (e) => {
    /* O CARTÃO NÃO É MAPA (22/11/2026, usuário: "eu clico no campo 'nome' e ele
       desmarca sozinho"): o clique no aviso ou num campo virava toque no mapa,
       que redesenhava o cartão e tirava o cursor do campo. */
    if (e.target.closest && e.target.closest('.mp-aviso, input, select, textarea, label')) return;
    const { px, py } = local(e);
    // Com a ferramenta Nomes, o nome tocado vai junto com o dedo.
    const nomeGeoEl = ehTextos() && !novaEntrada && !pondoCidade && e.target.closest && e.target.closest('.mp-geo-nome');
    const pegaGeo = nomeGeoEl ? (() => { const l = lugarDoGeo(nomeGeoEl.dataset.geo), w = noMundo(px, py);
      return l ? { tipo: 'geo', id: String(l.id), dx: w.x - l.x, dy: w.y - l.y, el: nomeGeoEl } : null; })() : null;
    const pega = pegaGeo || (mestre && !modo && !e.target.closest('.mp-barra, .mp-aviso') ? pegar(noMundo(px, py)) : null);
    /* COM FERRAMENTA, O MARCADOR É MAPA (15/11/2026, usuário: "No mapa, não
       estou conseguindo colocar os personagens dentro das cidades"). Toda
       cidade virou um botão (o sinal da casinha), e o toque que começava nele
       era ignorado — Pôr no mapa, Medir, Rota e Caminho não pegavam a cidade.
       Com uma ferramenta ligada, tocar no marcador é tocar no lugar dele. */
    const noMarcador = !!modo && !!e.target.closest('.mp-marca, .mp-pino');
    if (!pega && !noMarcador && e.target.closest('button')) return;
    try { elMapa.setPointerCapture(e.pointerId); } catch (err) { /* ponteiro sintético */ }
    dedos.set(e.pointerId, { px, py });
    cancelAnimationFrame(voo);
    if (dedos.size === 1) arrasto = { px, py, cx: cam.x, cy: cam.y, andou: false, pega, face: ehTextos() ? null : faceDoToque(e.target) };
    if (dedos.size === 2) { const [a, b] = [...dedos.values()]; pinca = { d: Math.hypot(a.px - b.px, a.py - b.py), s: cam.s }; arrasto = null; }
  });
  ouvir(elMapa, 'pointermove', (e) => {
    const { px, py } = local(e);
    if (dedos.has(e.pointerId)) dedos.set(e.pointerId, { px, py });
    if (pinca && dedos.size === 2) {
      const [a, b] = [...dedos.values()];
      zoomEm((a.px + b.px) / 2, (a.py + b.py) / 2, pinca.s * Math.hypot(a.px - b.px, a.py - b.py) / pinca.d / cam.s);
      return;
    }
    if (arrasto) {
      if (!arrasto.andou && Math.hypot(px - arrasto.px, py - arrasto.py) > 5) { arrasto.andou = true; elMapa.classList.add('arrastando'); }
      if (!arrasto.andou) return;
      const g = arrasto.pega;
      if (!g) { cam.x = arrasto.cx + px - arrasto.px; cam.y = arrasto.cy + py - arrasto.py; pintar(); return; }
      if (g.tipo === 'geo') {
        const w = noMundo(px, py), x = r1(w.x - g.dx), y = r1(w.y - g.dy);
        const l = lugarDoGeo(g.id); if (l) { l.x = x; l.y = y; }
        g.el.style.left = x + 'px'; g.el.style.top = y + 'px';
        return;
      }
      const a = alvo(), w = noMundo(px, py), p = { x: r1(Math.max(0, Math.min(L, w.x))), y: r1(Math.max(0, Math.min(A, w.y))) };
      if (g.tipo === 'lugar') {
        // as rotas (do Imperador) e os personagens que estão neste lugar andam junto com ele
        if (imperador) mesa.linhas.forEach((l) => l.pts.forEach((v) => { if (dist(v, a) < .06) { v.x = p.x; v.y = p.y; } }));
        Object.values(mesa.gente).forEach((v) => { if (dist(v, a) < .06) { v.x = p.x; v.y = p.y; } });
        a.x = p.x; a.y = p.y;
      } else if (g.tipo === 'gente') {
        const l = maisPerto(p, 12), q = l ? { x: l.x, y: l.y } : p;
        g.ids.forEach((id) => { mesa.gente[id] = { x: q.x, y: q.y }; });
      } else {
        if (g.tipo === 'meio') { a.pts.splice(g.i, 0, p); g.tipo = 'v'; g.ligados = []; }
        // o ponto gruda em outro caminho ou num lugar; quem divide o ponto anda junto
        const ign = new Set((g.ligados || []).map(({ ln, i }) => ln.id + ':' + i));
        const l = maisPerto(p, 10), q = verticeDeCaminho(p, a.id, ign) || (l ? { x: l.x, y: l.y } : p);
        a.pts[g.i] = q; (g.ligados || []).forEach(({ ln, i }) => { ln.pts[i] = { x: q.x, y: q.y }; }); vsel = g.i;
      }
      desenhar();
      return;
    }
    if (e.pointerType === 'mouse' && !e.target.closest('button')) {
      const l = modo === 'marcar' || CADASTRADOS.includes(modo) || modo === 'ponto' || modo === 'mover' ? null : (faceDoToque(e.target) || maisPerto(noMundo(px, py)));
      if (l !== passa) { passa = l; elMapa.classList.toggle('aponta', !!l && !modo); desenhar(); }
    }
  });
  const soltar = (e) => {
    const era = arrasto; dedos.delete(e.pointerId);
    if (dedos.size < 2) pinca = null;
    if (dedos.size === 0) { arrasto = null; elMapa.classList.remove('arrastando'); }
    if (!era) return;
    if (era.pega && era.pega.tipo === 'geo') {
      if (era.andou) guardarGeo();
      geoSel = era.pega.id; recado = null; geoDesenhar(); aviso();
      if (!era.andou) { const c = $('geo-texto'); if (c) { c.focus(); c.select(); } }
      return;
    }
    if (era.pega) {
      if (era.andou) {
        // solto sobre o meio de outro caminho: os dois passam a dividir o ponto
        const a = alvo(), g = era.pega;
        if (a && g.tipo === 'v' && !(g.ligados || []).length && !ligadosA(a, g.i).length) { const q = trechoDeCaminho(a.pts[g.i], a.id); if (q) a.pts[g.i] = q; }
        guardarMesa();
      } else if (era.pega.tipo === 'v') vsel = vsel === era.pega.i ? null : era.pega.i;
      desenhar(); return;
    }
    if (era.andou || e.type !== 'pointerup') return;
    const { px, py } = local(e), w = noMundo(px, py), p = { x: r1(w.x), y: r1(w.y) };
    if (p.x < 0 || p.y < 0 || p.x > L || p.y > A) return;
    if (novaEntrada && CADASTRADOS.includes(modo)) { criarEntrada(p); return; }
    if (ehTextos() && geoSel && !pondoCidade) { geoSel = null; geoDesenhar(); aviso(); return; }   // tocar fora de um texto solta o escolhido
    if (modo === 'mover') {          // o ponto exato do toque, sem grudar em outro lugar
      const lg = lugarId(movendo); modo = null; movendo = null;
      if (lg) { moverLugar(lg, p); aviso(); focar({ tipo: 'lugar', id: lg.id }, false); } else { aviso(); desenhar(); }
      return;
    }
    const l = era.face || maisPerto(p), aqui = l ? { x: l.x, y: l.y } : p;
    if (modo === 'medir') { medida.push(aqui); aviso(); desenhar(); return; }
    if (modo === 'rota') { if (l && lugaresDaRota().includes(l)) escolherNaRota(l); return; }   // tocar num lugar do mapa também escolhe
    if (modo === 'caminho') { traco.push(pontoDoCaminho(p, era.face ? null : l, continua)); aviso(); desenhar(); return; }
    if (modo === 'por') {
      const quem = pondo; porGente(quem, aqui);
      modo = null; pondo = null; aviso();
      focar(quem === 'todos' ? (l ? { tipo: 'lugar', id: l.id } : { tipo: 'gente', id: gente[0].id }) : { tipo: 'gente', id: quem }, false);
      return;
    }
    if (modo === 'marcar') {
      const m = l ? (marcaEm(l) || { id: novoId(), nome: l.nome, lugar: l.id, x: l.x, y: l.y })
                  : { id: novoId(), nome: tr('Marca ', 'Mark ') + (marcas.filter(marcaSolta).length + 1), ...p };
      if (!marcas.includes(m)) { marcas.push(m); guardar(); }
      modo = null; aviso(); focar({ tipo: 'marca', id: m.id }, false);
      if (!l) escreverNome();
      return;
    }
    if (CADASTRADOS.includes(modo)) {   // só posiciona um cadastrado: sem ficha escolhida, o toque não cria nada
      if (!pondoCidade) return;
      const novo = { id: novoId(), tipo: modo, nome: pondoCidade.nome, ficha: pondoCidade.id, ...p, ...(imperador ? { mundo: true } : {}) };
      mesa.lugares.push(novo); guardarMesa();
      modo = null; pondoCidade = null; recado = null; aviso(); focar({ tipo: 'lugar', id: novo.id }, false);
      if (cfg.aoEscolherAchado) cfg.aoEscolherAchado();
      return;
    }
    if (modo === 'ponto') {
      const novo = { id: novoId(), tipo: 'ponto', nome: tr('Ponto novo', 'New point'), ...p };
      mesa.lugares.push(novo); guardarMesa();
      modo = null; recado = null; aviso(); focar({ tipo: 'lugar', id: novo.id }, false); escreverNome();
      return;
    }
    if (l) { focar(focoDoLugar(l), false); return; }
    // tocar na rota volta a ela
    if (rotaAtual && rotaAtual.r && rotaAtual.r.pts && projeta(p, rotaAtual.r.pts).d < 10 / cam.s) { focar({ tipo: 'rota' }, false); return; }
    const ln = linhaPerto(p);
    if (ln) focar({ tipo: 'linha', id: ln.id }, false);
  };
  ouvir(elMapa, 'pointerup', soltar);
  ouvir(elMapa, 'pointercancel', soltar);
  ouvir(elMapa, 'pointerleave', () => { if (passa) { passa = null; elMapa.classList.remove('aponta'); desenhar(); } });
  ouvir(elMapa, 'wheel', (e) => {
    e.preventDefault();
    const { px, py } = local(e);
    zoomEm(px, py, Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0016)));
  }, { passive: false });
  ouvir(elMapa, 'dblclick', (e) => { if (e.target.closest('button') || modo || mestre) return; const { px, py } = local(e); const p = noMundo(px, py); voar(p.x, p.y, cam.s * 1.8, 500); });
  ouvir(elMapa, 'keydown', (e) => {
    if (e.target !== elMapa) return;
    const passo = 90, t = { ArrowLeft: [passo, 0], ArrowRight: [-passo, 0], ArrowUp: [0, passo], ArrowDown: [0, -passo] }[e.key];
    if (t) { cam.x += t[0]; cam.y += t[1]; pintar(); e.preventDefault(); }
    else if (e.key === '+' || e.key === '=') zoomEm(vw / 2, vh / 2, 1.3);
    else if (e.key === '-') zoomEm(vw / 2, vh / 2, 1 / 1.3);
  });
  ouvir(raiz, 'input', (e) => { if (e.target && e.target.id === 'mp-entrada-nome' && novaEntrada) novaEntrada.nome = e.target.value; });
  ouvir(raiz, 'change', (e) => { if (e.target && e.target.id === 'mp-entrada-reino' && novaEntrada) { novaEntrada.reino = e.target.value; recado = null; } });
  ouvir(document, 'keydown', (e) => {
    if (!raiz.isConnected) return;
    const campo = !!e.target.matches && e.target.matches('input, textarea, select');
    if (campo && e.key === 'Enter' && (e.target.id === 'mp-nome-foco' || e.target.id === 'mp-geo-texto' || e.target.id === 'mp-entrada-nome')) { e.target.blur(); return; }
    if (e.key === 'Escape' && modo) { trocarModo(modo); e.preventDefault(); }   // o Esc fica com a ferramenta: não sai da tela cheia
    else if (e.key === 'Enter' && !campo && modo === 'caminho') { e.preventDefault(); concluir(); }
  });

  /* ── Cliques ── */
  ouvir(raiz, 'click', (e) => {
    const b = e.target.closest('[data-alvo],[data-acao],[data-modo],[data-zoom],[data-ficha]'); if (!b || !raiz.contains(b)) return;
    // Com ferramenta ligada, o toque no marcador já foi tratado como toque no mapa (soltar).
    if (modo && b.closest('.mp-marca, .mp-pino') && !$('listas').contains(b)) return;
    const { alvo: qual, acao, id } = b.dataset, a = alvo();
    if (b.dataset.ficha) {
      /* O CADASTRADO COM O TEXTO DO MAPA (22/11/2026, usuário: "Ao adicionar uma
         cidade, local, reino que já existe, dê permissão para editar o texto
         também"): a ficha escolhida abre o cartão com o texto já preenchido. */
      const fc = CADASTRADOS.includes(modo) && fichaPeloId(modo, b.dataset.ficha);
      pondoCidade = null; geoSel = null; recado = null;
      novaEntrada = fc ? { tipo: modo, ficha: { id: fc.id, nome: fc.nome }, nome: fc.nome, geo: 'pino', reino: '' } : null;
      geoDesenhar(); aviso(); achados(); const c = $('entrada-nome'); if (c) c.focus();
      return;
    }
    /* Escolher na lista da ferramenta (uma rota, um ponto) sai da ferramenta e
       abre o escolhido; senão o próximo toque no mapa viraria um ponto novo. */
    if (modo && (qual === 'linha' || qual === 'lugar') && $('listas').contains(b)) {
      modo = null; traco = []; continua = null; pondoCidade = null; recado = null; aviso();
    }
    if (b.dataset.modo) trocarModo(b.dataset.modo);
    else if (b.dataset.zoom) { const c = noMundo(vw / 2, vh / 2);
      if (b.dataset.zoom === 'tudo') mapaInteiro(700); else voar(c.x, c.y, cam.s * (b.dataset.zoom === 'mais' ? 1.6 : 1 / 1.6), 350); }
    else if (qual === 'lugar') { const l = lugarId(id); if (l) focar(focoDoLugar(l)); }
    else if (qual === 'linha') focar({ tipo: 'linha', id });
    else if (qual === 'marca') focar({ tipo: 'marca', id });
    else if (qual === 'gente') {
      const g = gente.find((x) => String(x.id) === String(id)), p = g && mesa.gente[g.id];
      if (!g) return;
      if (!p) { if (mestre) { modo = 'por'; pondo = g.id; medida = []; traco = []; continua = null; recado = null; aviso(); desenhar(); } }
      else if (mestre) focar({ tipo: 'gente', id: g.id });
      else { const l = perto(p); focar(g.eu ? { tipo: 'aqui' } : l ? focoDoLugar(l) : { tipo: 'gente', id: g.id }); }
    }
    else if (acao === 'marcar') { const m = { id: novoId(), nome: a.nome, lugar: a.id, x: a.x, y: a.y }; marcas.push(m); guardar(); focar({ tipo: 'marca', id: m.id }, false); }
    else if (acao === 'desmarcar') {
      marcas = marcas.filter((m) => m.id !== a.id); guardar();
      const l = a.lugar && lugarId(a.lugar);
      focar(l ? { tipo: 'lugar', id: l.id } : focoPadrao(), false);
    }
    else if (acao === 'loja') { if (cfg.aoAbrirLoja) cfg.aoAbrirLoja(a.nome); }
    else if (acao === 'ficha') { const fc = fichaDe(foco.tipo === 'marca' ? lugarId(a.lugar) : a); if (fc && cfg.aoAbrirCidade) cfg.aoAbrirCidade(fc); }
    else if (acao === 'limpar-medida') { medida = []; aviso(); desenhar(); }
    else if (acao === 'sair-rota') { if (rotaAtual && rotaAtual.adicionando) { rotaAtual.adicionando = false; modo = null; aviso(); focar({ tipo: 'rota' }, false); } else { rotaAtual = null; trocarModo('rota'); } }
    else if (acao === 'rota-parada' && rotaAtual) { rotaAtual.adicionando = true; modo = 'rota'; busca = ''; if (cfg.aoEscolherAchado) cfg.aoEscolherAchado(); aviso(); desenhar(); }
    else if (acao === 'rota-tira-parada' && rotaAtual) { rotaAtual.paradas = rotaAtual.paradas.filter((_, i) => i !== +b.dataset.i); rotaAtual.escolha = 0; calcularRota(); focar({ tipo: 'rota' }); }
    else if (acao === 'rota-escolha' && rotaAtual && rotaAtual.sugestoes) { rotaAtual.escolha = +b.dataset.i; rotaAtual.r = rotaAtual.sugestoes[rotaAtual.escolha]; focar({ tipo: 'rota' }); }
    else if (acao === 'rota-lugar') { const l = lugarId(id); if (l) escolherNaRota(l); }
    else if (acao === 'rota-limpar') { rotaAtual = null; foco = focoPadrao(); aviso(); desenhar(); }
    else if (acao === 'rota-inverter' && rotaAtual) { const o = rotaAtual.origem; rotaAtual.origem = rotaAtual.destino; rotaAtual.destino = o; rotaAtual.paradas = (rotaAtual.paradas || []).slice().reverse(); calcularRota(); desenhar(); }
    else if (acao === 'volta-ponto') { traco.pop(); aviso(); desenhar(); }
    else if (acao === 'concluir') concluir();
    else if (acao === 'continuar') { modo = a.tipo; continua = a.id; traco = a.pts.map((p) => ({ ...p })); medida = []; recado = null; vsel = null; aviso(); desenhar(); }
    else if (acao === 'tirar-ponto') { a.pts.splice(vsel, 1); vsel = null; guardarMesa(); desenhar(); }
    else if (acao === 'trazer') { porGente('todos', a); desenhar(); }
    else if (acao === 'mover') { if (modo === 'mover') trocarModo('mover'); else { modo = 'mover'; movendo = a.id; medida = []; traco = []; continua = null; pondo = null; recado = null; vsel = null; aviso(); desenhar(); } }
    else if (acao === 'cancelar-mover') trocarModo('mover');
    else if (acao === 'geo-pronto') { geoSel = null; recado = null; geoDesenhar(); aviso(); }
    else if (acao === 'entrada-nova' && CADASTRADOS.includes(modo)) { novaEntrada = { tipo: modo, nome: (busca || '').trim(), geo: 'pino', reino: '' }; pondoCidade = null; geoSel = null; recado = null; geoDesenhar(); aviso(); achados(); const c = $('entrada-nome'); if (c) c.focus(); }
    else if (acao === 'entrada-tipo' && novaEntrada) { novaEntrada.geo = b.dataset.geo; if (b.dataset.geo !== 'pino') novaEntrada.ultimoGeo = b.dataset.geo; recado = null; aviso(); }
    else if (acao === 'entrada-cancelar') { novaEntrada = null; recado = null; aviso(); }
    else if (acao === 'geo-excluir' && geoSel) {   // tira o local do mapa (a ficha fica na aba Locais)
      const l = lugarDoGeo(geoSel), antes = JSON.stringify(mesa);
      if (l) { mesa.lugares = mesa.lugares.filter((x) => x !== l); guardarMesa(); recado = { txt: tr(`${l.nome}: removido do mapa.`, `${l.nome}: removed from the map.`), antes }; }
      geoSel = null; aviso(); desenhar();
    }
    else if (acao === 'geo-restaurar' && geoSel) {   // volta ao jeito do tipo e ao nome da ficha
      const l = lugarDoGeo(geoSel); if (l) { l.estilo = { geo: l.estilo.geo, ...(l.estilo.imp != null ? { imp: l.estilo.imp } : {}) }; guardarGeo(); }
      geoDesenhar(); aviso();
    }
    else if (acao === 'geo-cor' && geoSel) geoMudar('cor', b.dataset.cor || null);
    else if ((acao === 'geo-negrito' || acao === 'geo-italico' || acao === 'geo-caixa' || acao === 'geo-contorno') && geoSel) {
      const r = geoPorId(geoSel), k = acao.slice(4), e = geoEf(r), atual = e[k] != null ? e[k] : geoPadrao(r)[k];
      geoMudar(k, !atual);
    }
    else if ((acao === 'geo-menor' || acao === 'geo-maior') && geoSel) {
      const e = geoEf(geoPorId(geoSel)), i = Math.max(0, GEO_TAMS.indexOf(e.tam || 1));
      geoMudar('tam', GEO_TAMS[Math.min(GEO_TAMS.length - 1, Math.max(0, i + (acao === 'geo-maior' ? 1 : -1)))]);
    }
    else if (acao === 'repor') { modo = 'por'; pondo = a.id; medida = []; traco = []; continua = null; recado = null; aviso(); desenhar(); }
    else if (acao === 'tirar-gente' || acao === 'remover') remover();
    else if (acao === 'desfazer') { mesa = mapaNormalizar(JSON.parse(recado.antes), plano); guardarMesa(); recado = null; aviso(); desenhar(); }
    if ($('achados').contains(b) && cfg.aoEscolherAchado) cfg.aoEscolherAchado();
  });
  ouvir(raiz, 'input', (e) => {
    if (e.target.id === 'mp-geo-texto' && geoSel) {
      const l = lugarDoGeo(geoSel), v = e.target.value.trim(); if (!l) return;
      const es = { ...l.estilo };
      if (v && v !== l.nome) es.texto = v; else delete es.texto;   // vazio volta ao nome da ficha
      l.estilo = es;
      const s = $('geo').querySelector(`[data-geo="${geoSel}"]`); if (s) s.textContent = v || l.nome;
      guardarGeo();
      return;
    }
    if (e.target.id !== 'mp-nome-foco') return;
    const a = alvo(); if (!a) return;
    a.nome = e.target.value.trim() || (foco.tipo === 'marca' ? tr('Marca', 'Mark') : tr('Sem nome', 'Unnamed'));
    if (foco.tipo === 'marca') guardar(); else guardarMesa();
    desenhar();
  });

  /* ── OS BALÕES (15/11/2026, usuário: "Os tooltips estão sendo escondidos no
     mapa") ── O balão era um ::after do botão, e o painel, que rola, cortava o
     que passava da borda dele (o do primeiro botão, metade para fora). Agora é
     o balão do sistema (.mn-tip), posto na TELA (position: fixed) a partir do
     botão — nada o recorta. Mora num invólucro .menestrel-ui pendurado no
     #root, fora da árvore do React, e sai junto com o motor. */
  const casaBalao = document.createElement('div');
  casaBalao.className = 'menestrel-ui mp-balao-casa';
  const balao = document.createElement('div');
  balao.className = 'mn-tip'; balao.setAttribute('role', 'tooltip'); balao.style.display = 'none';
  casaBalao.appendChild(balao);
  (document.getElementById('root') || document.body).appendChild(casaBalao);
  limpezas.push(() => casaBalao.remove());
  const esconderBalao = () => { balao.style.display = 'none'; };
  const mostrarBalao = (el) => {
    const r = el.getBoundingClientRect();
    balao.textContent = el.getAttribute('data-dica');
    balao.style.left = (r.left + r.width / 2) + 'px';
    balao.style.top = r.top + 'px';
    balao.style.display = '';
  };
  const dicaDe = (alvo) => { const el = alvo && alvo.closest ? alvo.closest('[data-dica]') : null; return el && raiz.contains(el) ? el : null; };
  ouvir(raiz, 'pointerover', (e) => { const el = dicaDe(e.target); if (el) mostrarBalao(el); else esconderBalao(); });
  ouvir(raiz, 'pointerleave', esconderBalao);
  ouvir(raiz, 'focusin', (e) => { const el = dicaDe(e.target); let teclado = false; try { teclado = !!el && el.matches(':focus-visible'); } catch (_) {} if (teclado) mostrarBalao(el); });
  ouvir(raiz, 'focusout', esconderBalao);
  ouvir(raiz, 'pointerdown', esconderBalao);
  ouvir(window, 'scroll', esconderBalao, true);

  /* ── Partida ── */
  let pronto = false;
  const olho = new ResizeObserver(() => {
    const r = elMapa.getBoundingClientRect(); vw = r.width; vh = r.height;
    if (!vw || !vh) return;
    /* O chão que é só montanha até a beira (o infernal) cobre a janela no zoom mais longe, em
       vez de sobrar a faixa de brasa ao lado (23/11/2026, usuário: "No zoom máximo, ainda fica
       uma parte sem montanhas"). O material segue inteiro na tela, com o mar em volta. */
    sMin = lad ? Math.max(vw / L, vh / A) : Math.min(vw / L, vh / A);
    if (!pronto) {
      pronto = true;
      cam.s = sMin; pintar(); EU = referencia(); foco = focoPadrao(); aviso(); desenhar();
      // abre no mapa inteiro e desce até quem está no mapa
      // Com névoa, desce até o círculo do personagem (17/11/2026).
      const eu = comNevoa ? meuPosto() : null;
      const alvoInicial = eu ? [{ x: eu.x - raioNevoa, y: eu.y - raioNevoa }, { x: eu.x + raioNevoa, y: eu.y + raioNevoa }] : postos();
      if (alvoInicial.length) setTimeout(() => vivo && enquadrar(alvoInicial, 1500), 450);
      else if (ptsRecorte) setTimeout(() => vivo && enquadrar(ptsRecorte, 900), 120);
    } else pintar();
  });
  olho.observe(elMapa);

  return {
    /* O banco avisou que o mapa mudou (o Mestre mexeu, em outro aparelho ou neste). */
    receber(dados) {
      if (arrasto && arrasto.pega) return;            // não puxa o tapete de quem está arrastando
      if (modo === 'caminho') return;
      mesa = mapaNormalizar(dados, plano); juntarMundo(); acertarNomes(); desenhar();
    },
    /* A camada do mundo chegou (ou mudou): entra no lugar da que havia. */
    receberMundo(lugares, linhas) {
      if ((arrasto && arrasto.pega) || modo === 'caminho') return;
      mundo = Array.isArray(lugares) ? lugares : []; rotas = Array.isArray(linhas) ? linhas : [];
      ultimoMundo = JSON.stringify({ lugares: mundo, linhas: rotas });
      juntarMundo(); acertarNomes(); if (pronto) desenhar();
    },
    buscar(texto) { busca = texto || ''; listas(); },
    /* O mapa inteiro na tela (a tela cheia chama depois de a moldura crescer). */
    inteiro(ms = 700) { if (vw && vh) mapaInteiro(ms); },   // listas() chama achados() e decide se o painel aparece
    /* As cidades cadastradas chegaram (ou mudaram): religa e redesenha o passe. */
    catalogar(c) { porFichas(c); if (acertarNomes() && mestre) guardarMesa(); if (pronto) desenhar(); },
    falhou() { recado = { txt: tr('O mapa não foi salvo. Confira a conexão e mexa de novo.', 'The map was not saved. Check your connection and try again.') }; aviso(); },
    destruir() {
      vivo = false; cancelAnimationFrame(voo); olho.disconnect();
      limpezas.forEach((f) => f());
      ['arte', 'linhas', 'marcadores', 'passe', 'passe-pe', 'listas', 'achados', 'ferramentas', 'aviso'].forEach((n) => { const el = $(n); if (el) el.innerHTML = ''; });
    },
  };
}

/* ============================================================
   O BANCO — carregar, gravar e escutar
   ============================================================ */
function mapaApiSupabase() {
  const sb = () => (typeof supabaseClient !== 'undefined' ? supabaseClient : window.supabaseClient);
  return {
    async carregar({ historiaId, pj, mestre }) {
      const [h, m] = await Promise.all([
        sb().from('historias').select('id, protagonista_ids').eq('id', historiaId).maybeSingle(),
        sb().from('mapas_mesa').select('dados').eq('historia_id', historiaId).maybeSingle(),
      ]);
      if (h.error || !h.data) throw (h.error || new Error('historia'));
      if (m.error) throw m.error;
      const ids = (h.data.protagonista_ids || []).map(Number);
      let pjs = [];
      if (mestre) {
        const r = ids.length ? await sb().from('personagens').select('id, nome, sobrenome, foto_url').in('id', ids) : { data: [] };
        pjs = r.data || [];
      } else if (pj) {
        /* O Jogador não lê a ficha dos outros: a RPC devolve só nome e foto
           dos companheiros de mesa (de todas as mesas dele — daí o filtro). */
        const r = await sb().rpc('get_pjs_historia', { p_pj_id: pj.id });
        pjs = [pj, ...((r.data || []).filter((p) => ids.includes(Number(p.id))))];
      }
      let marcas = [];
      if (!mestre && pj) {
        const r = await sb().from('mapa_marcas').select('marcas').eq('personagem_id', pj.id).maybeSingle();
        marcas = (r.data && r.data.marcas) || [];
      }
      return {
        mesa: m.data ? m.data.dados : null, marcas,
        gente: pjs.map((p) => ({ id: p.id, nome: p.nome || '?', foto: p.foto_url || null, eu: !mestre && pj && Number(p.id) === Number(pj.id) }))
          .sort((a, b) => (b.eu ? 1 : 0) - (a.eu ? 1 : 0) || String(a.nome).localeCompare(String(b.nome), 'pt-BR')),
      };
    },
    /* As cidades CADASTRADAS, para ligar às do mapa. O Mestre lê o catálogo do
       mundo; o Jogador, só o que já está no diário dele ou que o Mestre
       liberou — o mapa não pode revelar a ficha de uma cidade antes da mesa. */
    async catalogo({ mestre, pj }) {
      let entradas = [];
      const nomesReino = {};
      const capitais = new Set();
      if (mestre) {
        // Os locais também (15/11/2026): a ferramenta Local põe os cadastrados no mapa.
        const [c, rn, lc] = await Promise.all([sb().rpc('listar_catalogo_global', { p_tipo: 'cidade' }), sb().rpc('listar_catalogo_global', { p_tipo: 'reino' }),
          sb().rpc('listar_catalogo_global', { p_tipo: 'local' })]);
        entradas = [...((c.data && c.data.entradas) || []).map((e) => ({ ...e, tipo: 'cidade' })), ...((rn.data && rn.data.entradas) || []).map((e) => ({ ...e, tipo: 'reino' })),
          ...((lc.data && lc.data.entradas) || []).map((e) => ({ ...e, tipo: 'local' }))];
      } else if (pj) {
        const [d, l, rs] = await Promise.all([sb().rpc('listar_diario_disponivel', { p_personagem_id: pj.id }), sb().rpc('listar_diario_lore', { p_personagem_id: pj.id }),
          sb().from('reinos').select('slug, nome, capital')]);
        entradas = [...((l.data && l.data.entradas) || []), ...((d.data && d.data.lore) || [])];
        /* O NOME DO REINO (17/11/2026, usuário: "o reino está todo com letra
           minúscula"): o passe da cidade mostrava o slug do reino que o
           personagem ainda não tem no diário. Os nomes vêm da tabela, aberta a todos. */
        ((rs && rs.data) || []).forEach((r) => { if (r && r.slug && r.nome) nomesReino[r.slug] = r.nome; if (r && r.capital) capitais.add(r.capital); });
      }
      const nomes = { ...nomesReino }; entradas.forEach((e) => { if (e && e.id) nomes[e.id] = e.nome; });
      // A capital de cada reino (slug da cidade), para o sinal da cidade no mapa.
      entradas.forEach((e) => { const cap = e && e.tipo === 'reino' && (e.capital_cidade || (e.atributos && e.atributos.capital_cidade)); if (cap) capitais.add(cap); });
      return { capitais: [...capitais], cidades: entradas.filter((e) => e && e.tipo === 'cidade' && e.nome), locais: entradas.filter((e) => e && e.tipo === 'local' && e.nome),
        reinos: entradas.filter((e) => e && e.tipo === 'reino' && e.nome), nomes, lore: entradas };
    },
    async salvarMesa(historiaId, dados) {
      const { error } = await sb().from('mapas_mesa').upsert({ historia_id: historiaId, dados, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    async salvarMarcas(pjId, marcas) {
      const { error } = await sb().from('mapa_marcas').upsert({ personagem_id: pjId, marcas, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    assinar(historiaId, aoMudar) {
      const canal = sb().channel('mapa_mesa_' + historiaId + '_' + Math.random().toString(36).slice(2, 8))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mapas_mesa', filter: 'historia_id=eq.' + historiaId },
          (ev) => { if (ev.new && ev.new.dados) aoMudar(ev.new.dados); })
        .subscribe();
      return () => { try { sb().removeChannel(canal); } catch (e) { /* já saiu */ } };
    },
  };
}
/* ============================================================
   A PÁGINA
   ============================================================
   profile 'master': a mesa ativa, com as ferramentas de criação.
   profile 'player': a mesa do personagem ativo; mede e marca interesses.
   `api` e `base` existem para a prévia e os testes trocarem o banco. */
function MapaView({ lang, profile, historiaId, pj = null, trilhoPaginas = null, api = null, base = null, onLoja = null }) {
  const en = lang === 'en', mestre = profile === 'master';
  const raiz = React.useRef(null), motor = React.useRef(null);
  const [estado, setEstado] = React.useState('carregando');   // 'carregando' | 'pronto' | 'erro'
  const [query, setQuery] = React.useState('');
  const [catalogo, setCatalogo] = React.useState(null);     // { cidades, nomes, lore }
  const [versaoCatalogo, setVersaoCatalogo] = React.useState(0);
  const [fichaAberta, setFichaAberta] = React.useState(null);
  const banco = React.useMemo(() => api || mapaApiSupabase(), [api]);
  // Novo local, cidade ou reino pelo mapa: cria a ficha no mundo (só o Imperador) e devolve o slug.
  const criarEntrada = React.useCallback(async (tipo, nome, atributos = {}) => {
    const r = banco.criarEntrada ? await banco.criarEntrada(tipo, nome, atributos)
      : await window.supabaseClient.rpc('salvar_lore_entrada', { p_id: null, p_historia_id: null, p_tipo: tipo, p_nome: nome, p_descricao: null, p_imagem_url: null, p_atributos: atributos }).then(({ data, error }) => (error || !data || data.ok === false ? null : data.entrada.slug));
    if (r) setVersaoCatalogo((v) => v + 1);
    return r;
  }, [banco]);
  /* A TELA CHEIA (21/11/2026, usuário: "O botão 'ver o mapa inteiro' vai fazer
     com que o mapa fique full-screen, ou seja, igual o campo de batalha, veremos
     apenas o mapa"). Como a batalha: a página vira a janela inteira, o menu
     lateral e o trilho de abas somem (mapa.css, .mp-cheia); ferramentas, zoom e
     régua ficam sobre o mapa, e o painel flutua num cartão quando tem o que
     mostrar. Ao entrar, o mapa inteiro na tela; o mesmo botão (ou o Esc) sai. */
  const [cheia, setCheia] = React.useState(false);
  React.useEffect(() => {
    if (!cheia) return undefined;
    // depois de a moldura crescer (o motor remede no ResizeObserver)
    const t = setTimeout(() => motor.current && motor.current.inteiro(), 90);
    const sair = (e) => { if (e.key === 'Escape' && !e.defaultPrevented) setCheia(false); };
    document.addEventListener('keydown', sair);
    return () => { clearTimeout(t); document.removeEventListener('keydown', sair); };
  }, [cheia]);
  const pjId = pj ? pj.id : null;
  /* FORA DAS MESAS (15/11/2026, usuário: "O mapa não está aparecendo"): o mapa
     é do mundo antes de ser da mesa. Sem mesa (ou Jogador sem personagem), ele
     abre só para olhar e medir — a pintura e as cidades dela —, sem banco. */
  const semMesa = !historiaId || (!mestre && !pj);
  /* O IMPERADOR PÕE CIDADES E LOCAIS FORA DE MESA (15/11/2026): a camada do
     mundo (catalogo_mundo, tipo 'mapa') é dele; gravar passa pelo catálogo do
     mundo, cujas policies pedem eh_admin(). */
  const ehImperador = (typeof window !== 'undefined' && typeof window.useEhAdmin === 'function') ? window.useEhAdmin() : false;
  /* O PLANO (17/11/2026): o Mestre (e o Imperador fora de mesa) escolhe qual
     ver; o Jogador vê só o plano onde o personagem dele está — o efeito da
     mesa descobre qual é e acerta aqui. */
  const [plano, setPlano] = React.useState('material');
  const podeTrocarPlano = mestre || (semMesa && ehImperador);
  /* Um chão só no plano material: o mapa vetorial (21/11/2026, usuário: "Não
     precisamos mais dos botões 'mapa antigo' e 'mapa novo'"). */
  const baseDoPlano = plano === 'material' ? (base || MAPA_PINTURA) : (MAPA_CHAO_PLANO[plano] || null);
  // A camada do mundo É do plano: { plano, lugares, linhas }, para não juntar a de um plano no outro.
  const [mundo, setMundo] = React.useState(null);   // null = ainda não chegou
  const mundoDoPlano = mundo && mundo.plano === plano ? mundo.lugares : null;
  const rotasDoPlano = mundo && mundo.plano === plano ? mundo.linhas : null;
  const relogioMundo = React.useRef(0);
  const aoMudarMundo = React.useCallback((m) => {
    clearTimeout(relogioMundo.current);
    relogioMundo.current = setTimeout(() => {
      const salvar = banco.salvarMundo || ((d, p) => window.salvarNoMundo('mapa', { slug: mapaSlugMundo(p), lugares: d.lugares, linhas: d.linhas }));
      Promise.resolve(salvar(m, plano)).catch(() => motor.current && motor.current.falhou());
    }, 500);
  }, [banco, plano]);
  /* Os lugares postos nos OUTROS planos (23/11/2026): a ficha posta num plano
     não se põe em outro. A camada do mundo deles e o mapa da mesa neles. */
  const outrosMundo = React.useRef([]), outrosMesa = React.useRef([]);
  const alhures = React.useCallback(() => [...outrosMundo.current, ...outrosMesa.current], []);
  React.useEffect(() => {
    let vivo = true;
    const ler = banco.carregarMundo || ((p) => (window.carregarCatalogoMundo ? window.carregarCatalogoMundo() : Promise.resolve(null))
      .then(() => { const m = (window.mundoVigente ? window.mundoVigente('mapa') : []).find((e) => e.slug === mapaSlugMundo(p)); return m || {}; }));
    // A prévia devolve só a lista de lugares; o banco, a entrada inteira.
    const lugaresDe = (m) => { const l = Array.isArray(m) ? m : (m && m.lugares); return Array.isArray(l) ? l : []; };
    Promise.resolve(ler(plano)).then((m) => { if (!vivo) return;
      const r = !Array.isArray(m) && m && m.linhas;
      setMundo({ plano, lugares: lugaresDe(m), linhas: Array.isArray(r) ? r : [] }); })
      .catch(() => { if (vivo) setMundo({ plano, lugares: [], linhas: [] }); });
    outrosMundo.current = [];
    MAPA_PLANOS.filter((p) => p.id !== plano).forEach((p) => {
      Promise.resolve(ler(p.id)).then((m) => { if (!vivo) return;
        outrosMundo.current = [...outrosMundo.current, ...lugaresDe(m).map((l) => ({ tipo: l.tipo, ficha: l.ficha, nome: l.nome, plano: p.id }))]; })
        .catch(() => {});
    });
    return () => { vivo = false; };
  }, [banco, plano]);
  React.useEffect(() => { if (motor.current && mundoDoPlano) motor.current.receberMundo(mundoDoPlano, rotasDoPlano); }, [mundoDoPlano, rotasDoPlano, estado]);
  React.useEffect(() => {
    if (!semMesa || !raiz.current) return undefined;
    motor.current = criarMotorMapa(raiz.current, { papel: ehImperador ? 'mestre' : 'jogador', semMesa: true, en, base: baseDoPlano, plano, ladrilhos: MAPA_LADRILHOS[plano] || null,
      imperador: ehImperador, mundo: mundoDoPlano || [], rotas: rotasDoPlano || [], aoMudarMundo: ehImperador ? aoMudarMundo : null,
      mesa: null, marcas: [], gente: [], alhures, aoEscolherAchado: () => setQuery(''), aoAbrirCidade: setFichaAberta, aoCriarEntrada: ehImperador ? criarEntrada : null });
    setEstado('pronto');
    return () => { if (motor.current) { motor.current.destruir(); motor.current = null; } };
  }, [semMesa, en, base, ehImperador, plano]);

  React.useEffect(() => {
    if (semMesa) return undefined;
    let vivo = true, desligar = null, relogio = 0, relogioMarcas = 0, ultimo = '';
    setEstado('carregando');
    let dadosTodos = null;   // mapas_mesa.dados inteiro, com todos os planos
    // Os lugares da mesa nos outros planos (a ficha posta num plano não vai a outro).
    const mesaNosOutros = () => { outrosMesa.current = MAPA_PLANOS.filter((p) => p.id !== plano).flatMap((p) => {
      const sub = mapaDoPlano(dadosTodos, p.id);
      return (sub && Array.isArray(sub.lugares) ? sub.lugares : []).map((l) => ({ tipo: l.tipo, ficha: l.ficha, nome: l.nome, plano: p.id })); }); };
    outrosMesa.current = [];
    banco.carregar({ historiaId, pj, mestre }).then((d) => {
      if (!vivo || !raiz.current) return;
      dadosTodos = d.mesa || null;
      mesaNosOutros();
      // O Jogador vê o plano do personagem dele: se não é o que está na tela, troca e volta aqui.
      if (!mestre) { const p = mapaPlanoDe(dadosTodos, pjId); if (p !== plano) { setPlano(p); return; } }
      motor.current = criarMotorMapa(raiz.current, {
        papel: mestre ? 'mestre' : 'jogador', en, base: baseDoPlano, plano, ladrilhos: MAPA_LADRILHOS[plano] || null,
        /* As marcas do Jogador são de um plano (17/11/2026): sem `plano`, do
           material. O motor vê só as deste; ao gravar, as dos outros voltam junto. */
        mesa: mapaDoPlano(dadosTodos, plano), marcas: (d.marcas || []).filter((m) => (m.plano || 'material') === plano), gente: d.gente, alhures,
        aoAbrirLoja: mestre && onLoja ? (nome) => { window.__mnLojaPedida = nome; onLoja(); } : null,
        imperador: ehImperador && mestre, mundo: mundoDoPlano || [], rotas: rotasDoPlano || [], aoMudarMundo: (ehImperador && mestre) ? aoMudarMundo : null,
        /* Grava com folga: arrastar um ponto dispara dezenas de mudanças. O
           motor entrega só o plano dele; grava-se o mapa inteiro, com os outros. */
        aoMudarMesa: mestre ? (doPlano) => {
          dadosTodos = mapaComPlano(dadosTodos, plano, doPlano);
          const dados = dadosTodos;
          ultimo = JSON.stringify(dados);
          clearTimeout(relogio);
          relogio = setTimeout(() => banco.salvarMesa(historiaId, dados).catch(() => motor.current && motor.current.falhou()), 500);
        } : null,
        aoMudarMarcas: (!mestre && pjId) ? (doPlano) => {
          const outras = (d.marcas || []).filter((m) => (m.plano || 'material') !== plano);
          const marcas = [...outras, ...doPlano.map((m) => (plano === 'material' ? m : { ...m, plano }))];
          d.marcas = marcas;
          clearTimeout(relogioMarcas);
          relogioMarcas = setTimeout(() => banco.salvarMarcas(pjId, marcas).catch(() => motor.current && motor.current.falhou()), 500);
        } : null,
        aoEscolherAchado: () => setQuery(''), aoAbrirCidade: setFichaAberta, aoCriarEntrada: (ehImperador && mestre) ? criarEntrada : null,
      });
      setEstado('pronto');
      /* O eco da própria gravação volta pelo tempo real: igual ao que saiu, ignora. */
      desligar = banco.assinar(historiaId, (dados) => {
        if (JSON.stringify(dados) === ultimo) return;
        dadosTodos = dados; mesaNosOutros();
        // O Mestre levou o personagem para outro plano: o Jogador vai junto.
        if (!mestre) { const p = mapaPlanoDe(dados, pjId); if (p !== plano) { setPlano(p); return; } }
        if (motor.current) motor.current.receber(mapaDoPlano(dados, plano));
      });
    }).catch(() => { if (vivo) setEstado('erro'); });
    return () => {
      vivo = false; clearTimeout(relogio); clearTimeout(relogioMarcas);
      if (desligar) desligar();
      if (motor.current) { motor.current.destruir(); motor.current = null; }
    };
  }, [historiaId, pjId, mestre, en, banco, base, semMesa, ehImperador, plano]);

  React.useEffect(() => { if (motor.current) motor.current.buscar(query); }, [query, estado]);

  /* As cidades cadastradas vêm à parte: o mapa não espera por elas, e uma
     falha aqui só deixa o passe sem a ficha. */
  React.useEffect(() => {
    let vivo = true;
    if (!banco.catalogo) return undefined;
    banco.catalogo({ mestre: mestre || ehImperador, pj }).then((c) => { if (vivo) setCatalogo(c); }).catch(() => {});
    return () => { vivo = false; };
  }, [banco, mestre, pjId, ehImperador, versaoCatalogo]);
  React.useEffect(() => { if (motor.current && catalogo) motor.current.catalogar(catalogo); }, [catalogo, estado]);

  /* A tela ocupa o que sobra da janela abaixo do trilho: mapa não rola junto
     com a página, senão a roda do mouse disputa entre aproximar e rolar. */
  React.useEffect(() => {
    const medir = () => { const el = raiz.current; if (!el) return;
      const celular = window.innerWidth <= 768;
      el.style.setProperty('--mp-altura', Math.max(celular ? 560 : 460, window.innerHeight - el.getBoundingClientRect().top - window.scrollY - 48) + 'px'); };
    medir(); window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [semMesa]);

  const Busca = (typeof BestBuscaENovo !== 'undefined' && BestBuscaENovo) || window.BestBuscaENovo;
  const ac = (typeof ADMIN_COPY !== 'undefined' && (ADMIN_COPY[lang] || ADMIN_COPY.pt)) || {};
  const Ficha = (typeof DetalheEntradaModal !== 'undefined' && DetalheEntradaModal) || window.DetalheEntradaModal;
  const zoom = (qual, ico, rot) => (
    <button type="button" className="mc-acao mp-ferr so-ico" data-zoom={qual} aria-label={rot} data-dica={rot}><i className={'ti ' + ico} aria-hidden="true" /></button>
  );
  return (
    <div className={'pjs diario-pagina mp-pagina' + (cheia ? ' mp-cheia' : '')}>
      <div className={'diario-pagina-barra cartoes-barra' + (trilhoPaginas ? ' livro-trilho trilho-unido' : '')}>
        {Busca && (
          <Busca ac={ac} placeholder={en ? 'Search place' : 'Buscar lugar'} query={query} setQuery={setQuery}
            podeCriar={false} antes={trilhoPaginas} />
        )}
      </div>
      {(
        <div className="mp-tela" ref={raiz}>
          <aside className="mp-painel mn-rolagem" aria-label={en ? 'Map panel' : 'Painel do mapa'}>
            <ul className="mp-achados mp-quadro" data-el="achados" />
            <section className="mp-secao" aria-live="polite">
              <div className="mp-passe" data-el="passe" />
              <div data-el="passe-pe" />
            </section>
            <div data-el="listas" />
          </aside>
          <div className="mp-mapa" data-el="mapa" tabIndex={0}
            aria-label={en ? 'Map of Tagmar. Drag to move, scroll to zoom; arrow keys and plus/minus also work.'
                           : 'Mapa de Tagmar. Arraste para mover, role para aproximar; setas e as teclas mais e menos também funcionam.'}>
            <div className="mp-mundo" data-el="mundo">
              <div className="mp-arte" data-el="arte" />
              <svg className="mp-linhas" data-el="linhas" viewBox={`0 0 ${MAPA_L} ${MAPA_A}`} aria-hidden="true" />
              <svg className="mp-nevoa" data-el="nevoa" viewBox={`0 0 ${MAPA_L} ${MAPA_A}`} aria-hidden="true" />
              <div data-el="marcadores" />
            </div>
            <div className="mp-barra livro-trilho" data-el="barra">
              {podeTrocarPlano && (
                <div className="mp-grupo mp-planos" role="group" aria-label={en ? 'Plane' : 'Plano'}>
                  {MAPA_PLANOS.map((p) => (
                    <button key={p.id} type="button" className={'mc-acao mp-ferr' + (p.id === plano ? ' is-ativo' : '')}
                      aria-pressed={p.id === plano} onClick={() => { if (p.id !== plano) { setQuery(''); setPlano(p.id); } }}>
                      <i className={'ti ' + p.ic} aria-hidden="true" /><span>{en ? p.en : p.pt}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="mp-grupo" data-el="ferramentas" />
              {/* O aviso da ferramenta mora no trilho (21/11/2026, usuário: "A mensagem
                  'Escolha na lista...' está acima do trilho e está fora do padrão"):
                  uma linha só dele, logo abaixo dos botões, com a pele do trilho. */}
              <div className="mp-aviso-linha"><div className="mp-aviso" data-el="aviso" /></div>
            </div>
            {/* O zoom fica no canto inferior direito (17/11/2026, usuário). */}
            <div className="mp-barra mp-barra-zoom livro-trilho">
              <div className="mp-grupo">
                {zoom('menos', 'ti-minus', en ? 'Zoom out' : 'Afastar')}
                {zoom('mais', 'ti-plus', en ? 'Zoom in' : 'Aproximar')}
                {(() => { const rot = cheia ? (en ? 'Exit full screen' : 'Sair da tela cheia') : (en ? 'See the whole map' : 'Ver o mapa inteiro');
                  return (
                    <button type="button" className={'mc-acao mp-ferr so-ico' + (cheia ? ' is-ativo' : '')} aria-pressed={cheia}
                      onClick={() => setCheia((c) => !c)} aria-label={rot} data-dica={rot}>
                      <i className={'ti ' + (cheia ? 'ti-arrows-minimize' : 'ti-arrows-maximize')} aria-hidden="true" />
                    </button>); })()}
              </div>
            </div>
            <div className="mp-escala" aria-hidden="true"><span data-el="escala-txt" /><i data-el="escala-barra" /></div>
            {estado !== 'pronto' && (
              <div className="mp-estado" role="status">
                {estado === 'erro' ? (en ? 'The map could not be loaded. Reload the page to try again.' : 'Não foi possível carregar o mapa. Recarregue a página para tentar de novo.')
                                   : (en ? 'Loading the map…' : 'Carregando o mapa…')}
              </div>
            )}
          </div>
        </div>
      )}
      {fichaAberta && Ficha && (
        <Ficha entrada={fichaAberta} lang={lang} lore={(catalogo && catalogo.lore) || []} onClose={() => setFichaAberta(null)} />
      )}
    </div>
  );
}

Object.assign(window, {
  MapaView, criarMotorMapa, mapaApiSupabase, mapaSemente, mapaNormalizar,
  mapaDist, mapaKm, mapaComprimento, mapaProjeta, mapaCaminhoNaTela, mapaRotaPelosCaminhos,
  MAPA_PINTADAS, MAPA_KM, MAPA_KM_DIA_A_PE, MAPA_KM_DIA_A_CAVALO, MAPA_KM_DIA_VOANDO, MAPA_KM_DIA_NAVEGANDO, MAPA_FORA, mapaNavegacao, mapaAguaDe, mapaSugestoesDeRota, mapaMenorCaminho, mapaCorposDeAgua, mapaItinerario,
  MAPA_PLANOS, mapaDoPlano, mapaComPlano, mapaPlanoDe, mapaSlugMundo,
  MAPA_L, MAPA_A, MAPA_PERTO, MAPA_PINTURA, MAPA_CHAO_PLANO, MAPA_RECORTE, MAPA_LADRILHOS,
});
