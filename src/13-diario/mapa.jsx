/* ============================================================
   MAPA — a página do mapa de Tagmar (15/11/2026)
   ============================================================
   Usuário: "transformá-lo em […] navegável e animado, mostrando onde os
   personagens estão […] os jogadores vão acompanhar onde seu personagem está,
   onde devem ir, sabendo distâncias, marcar interesses no mapa" e, depois,
   "deixar o mestre criar os pontos, os caminhos, as rotas, as cidades".

   TRÊS DECISÕES QUE EXPLICAM O ARQUIVO

   1. O chão é a pintura original, sem compressão ("Você pode usar a imagem
      original sem compressão?"). Ela tem 10050 × 16750 pixels: vai em
      ladrilhos PNG de 512, em 4 níveis (0 = pixels do arquivo; cada nível
      acima, a metade), no bucket `mapas` do Storage. Só entram os ladrilhos
      que a janela vê. Cada ladrilho traz 2 px reais do vizinho em cada lado:
      sem essa sobra, as bordas de dois níveis caem no mesmo lugar e aparece
      uma linha escura de 1 px na emenda.

   2. Tudo é medido em UNIDADES DO MAPA (1200 × 2000), não em pixels. "Vou
      alterar a imagem, com exatamente o mesmo tamanho" (usuário): trocar a
      pintura é reenviar os ladrilhos (scripts/mapa/) — nada do que o Mestre
      desenhou se move. A régua da própria pintura mede 152,5 unidades para
      400 km; daí KM.

   3. O MOTOR é imperativo (criarMotorMapa): arrastar e aproximar repintam
      a cada quadro, e passar isso pelo React custaria um render por pixel.
      O React monta a moldura, carrega e grava; o motor desenha dentro dela.

   O QUE VAI PARA O BANCO (scripts/sql/mapa-da-mesa-2026-11-15.sql)
     mapas_mesa.dados = { lugares, linhas, rota, gente }   — só o Mestre grava
       lugares: [{ id, tipo: 'cidade'|'ponto', nome, x, y, p?, ficha? }]
                (p = já pintada; ficha = id da cidade na aba Cidades)
       linhas:  [{ id, tipo: 'caminho'|'rota', nome, pts: [{x,y}] }]
       rota:    id da rota da mesa (a que o Jogador vê, com destino e progresso)
       gente:   { [personagem_id]: { x, y } }   — onde cada personagem está
     mapa_marcas.marcas = [{ id, nome, x, y, lugar? }]      — do personagem
   ============================================================ */

const MAPA_L = 1200, MAPA_A = 2000;
const MAPA_ZOOM_NOMES = 1;   // escala da câmera a partir da qual as etiquetas aparecem
const MAPA_KM = 400 / 152.5;
/* Suposição da tela, não regra do Tagmar: um dia de marcha a pé. */
const MAPA_KM_DIA_A_PE = 30;
const MAPA_LADO = 512, MAPA_SOBRA = 2;

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

/* O mapa de uma mesa que o Mestre ainda não tocou. */
function mapaSemente() {
  return {
    lugares: Object.keys(MAPA_PINTADAS).map((nome, i) => ({ id: 'c' + i, tipo: 'cidade', nome, x: MAPA_PINTADAS[nome][0], y: MAPA_PINTADAS[nome][1], p: 1 })),
    linhas: [], rota: null, gente: {},
  };
}
/* O que veio do banco, com as quatro chaves no lugar. Linha vazia = semente. */
function mapaNormalizar(dados) {
  if (!dados || !Array.isArray(dados.lugares)) return mapaSemente();
  return {
    lugares: dados.lugares,
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
/* A rota da mesa partida em feito e por fazer no ponto onde a comitiva está.
   Sem ninguém no mapa, a rota inteira está por fazer. */
function mapaJornada(mesa, onde) {
  const rota = (mesa.linhas || []).find((l) => l.id === mesa.rota && l.tipo === 'rota');
  if (!rota || rota.pts.length < 2) return null;
  const fim = rota.pts[rota.pts.length - 1];
  if (!onde) return { rota, feita: [], falta: rota.pts, destino: { x: fim.x, y: fim.y } };
  const pr = mapaProjeta(onde, rota.pts);
  return { rota, feita: [...rota.pts.slice(0, pr.i + 1), pr.q], falta: [pr.q, ...rota.pts.slice(pr.i + 1)], destino: { x: fim.x, y: fim.y } };
}

/* ============================================================
   O MOTOR — desenha e escuta dentro da moldura que o React montou
   ============================================================
   cfg: { papel: 'mestre'|'jogador', en, base (URL dos ladrilhos),
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

  let mesa = mapaNormalizar(cfg.mesa);
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
  let ultimoMundo = JSON.stringify(mundo);
  const juntarMundo = () => {
    const doMundo = mundo.map((l) => ({ ...l, mundo: true }));
    const jaNoMundo = new Set(doMundo.filter((l) => l.ficha).map((l) => l.tipo + ':' + l.ficha));
    mesa.lugares = [...mesa.lugares.filter((l) => !l.mundo && !(l.ficha && jaNoMundo.has(l.tipo + ':' + l.ficha))), ...doMundo];
  };
  juntarMundo();

  const fmtKm = (n) => n.toLocaleString(en ? 'en-US' : 'pt-BR');
  const dias = (k) => { const d = k / MAPA_KM_DIA_A_PE, r = Math.round(d);
    return d < 1 ? tr('menos de 1 dia', 'under 1 day') : r + (r === 1 ? tr(' dia', ' day') : tr(' dias', ' days')); };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const semAcento = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const r1 = (v) => Math.round(v * 10) / 10;
  const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  const lugarId = (id) => mesa.lugares.find((l) => l.id === id);
  const linhaId = (id) => mesa.linhas.find((l) => l.id === id);
  const perto = (p, raio = 4) => { let m = null, md = raio;
    for (const l of mesa.lugares) { const d = dist(l, p); if (d < md) { md = d; m = l; } } return m; };
  const onde = (p) => { const l = perto(p); return l ? l.nome : tr('Na estrada', 'On the road'); };
  /* Quem está no mapa, já com a posição. */
  const postos = () => gente.filter((g) => mesa.gente[g.id]).map((g) => ({ ...g, x: mesa.gente[g.id].x, y: mesa.gente[g.id].y }));
  /* De onde se medem as distâncias: o personagem do Jogador; para o Mestre
     (ou Jogador ainda fora do mapa), o primeiro que estiver no mapa. */
  const referencia = () => { const p = postos(); return p.find((g) => g.eu) || p[0] || null; };
  let EU = referencia(), J = null;
  const jornada = () => {
    const j = mapaJornada(mesa, EU); if (!j) return null;
    const ld = perto(j.destino), ini = perto(j.rota.pts[0]);
    return { ...j, destino: { ...j.destino, nome: ld ? ld.nome : j.rota.nome }, origem: ini ? ini.nome : null };
  };

  /* ── A cidade do mapa É a cidade da aba Cidades (15/11/2026) ──
     Usuário: "No mapa, ao apontar uma cidade, deverá conectar à cidade
     cadastrada na aba 'cidades'." A ligação é pelo NOME (sem acento nem
     caixa): a pintura não sabe de slug, e assim uma cidade que o Mestre cria
     no mapa com o nome de uma cadastrada já nasce ligada. */
  let fichas = new Map(), fichasId = new Map(), cadastradas = null, nomesLore = {};
  /* OS LOCAIS NO MAPA (15/11/2026, usuário: "Quero uma opção de inserir locais
     no mapa, além de cidades"). O mesmo trato das cidades: só os cadastrados
     na aba Locais, ligados pelo id da ficha. */
  let locaisCad = null, fichasLocalId = new Map();
  const chave = (nome) => semAcento(nome).trim();
  const porFichas = (c) => {
    cadastradas = c ? (c.cidades || []) : null;       // null = o catálogo ainda não chegou
    fichas = new Map((cadastradas || []).map((e) => [chave(e.nome), e]));
    fichasId = new Map((cadastradas || []).map((e) => [String(e.id), e]));
    locaisCad = c ? (c.locais || []) : null;
    fichasLocalId = new Map((locaisCad || []).map((e) => [String(e.id), e]));
    nomesLore = (c && c.nomes) || {};
  };
  porFichas(cfg.catalogo);
  const fichaDe = (p) => { const l = p && (p.tipo === 'cidade' || p.tipo === 'local' ? p : perto(p));
    if (l && l.tipo === 'local') return (l.ficha && fichasLocalId.get(String(l.ficha))) || null;
    return (l && l.tipo === 'cidade' && ((l.ficha && fichasId.get(String(l.ficha))) || fichas.get(chave(l.nome)))) || null; };
  // O sinal de cada lugar no mapa e nas listas.
  const ICONE_LUGAR = { cidade: 'ti-building-castle', local: 'ti-mountain', ponto: 'ti-star' };
  /* CIDADE NOVA NÃO NASCE NO MAPA (15/11/2026). Usuário: "não será criado uma
     'nova cidade' clicando no mapa, a cidade será criada na aba cidades da
     ambientação." A ferramenta Cidade só POSICIONA: o Mestre escolhe uma
     cadastrada que ainda não está no mapa e toca onde ela fica. O lugar guarda
     o id da ficha, e o nome passa a ser o dela (acertarNomes). */
  // As cadastradas (cidades ou locais) que ainda não estão no mapa.
  const foraDoMapa = (tipo = 'cidade') => {
    const ids = new Set(), nomes = new Set();
    mesa.lugares.forEach((l) => { if (l.tipo !== tipo) return; if (l.ficha) ids.add(String(l.ficha)); nomes.add(chave(l.nome)); });
    return ((tipo === 'local' ? locaisCad : cadastradas) || []).filter((e) => !ids.has(String(e.id)) && !nomes.has(chave(e.nome)))
      .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  };
  const fichaPeloId = (tipo, id) => (tipo === 'local' ? fichasLocalId : fichasId).get(String(id));
  const acertarNomes = () => { let mudou = false;
    mesa.lugares.forEach((l) => { const e = l.ficha && fichaPeloId(l.tipo, l.ficha); if (e && e.nome && e.nome !== l.nome) { l.nome = e.nome; mudou = true; } });
    return mudou; };

  /* ── Gravação: o motor avisa, o React leva ao banco (com folga) ── */
  // A mesa leva o que é dela; o mundo (só o Imperador grava), o que é do mundo.
  const guardarMesa = () => {
    if (cfg.aoMudarMesa) cfg.aoMudarMesa(JSON.parse(JSON.stringify({ ...mesa, lugares: mesa.lugares.filter((l) => !l.mundo) })));
    if (imperador && cfg.aoMudarMundo) {
      const novos = mesa.lugares.filter((l) => l.mundo).map(({ mundo: _m, ...l }) => l);
      const j = JSON.stringify(novos);
      if (j !== ultimoMundo) { ultimoMundo = j; mundo = novos; cfg.aoMudarMundo(JSON.parse(j)); }
    }
  };
  const guardar = () => cfg.aoMudarMarcas && cfg.aoMudarMarcas(JSON.parse(JSON.stringify(marcas)));

  /* ── Câmera ── */
  const cam = { x: 0, y: 0, s: 1 };
  let vw = 0, vh = 0, sMin = .3; const S_MAX = 12;
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
    /* NOMES SÓ DE PERTO (15/11/2026, usuário: "Quando o zoom tiver longe, não
       mostre o nome das cidades, etc. Quando ir se aproximando, mostre todos os
       nomes"). Abaixo de 1:1 a pintura inteira cabe na tela e as etiquetas se
       amontoam; ali fica só o marcador. */
    elMapa.classList.toggle('longe', cam.s < MAPA_ZOOM_NOMES);
    escala(); pedirLadrilhos();
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
    const s = Math.min((vw - Math.min(160, vw * .3)) / Math.max(40, x1 - x0), (vh - Math.min(220, vh * .45)) / Math.max(40, y1 - y0), 4.2);
    voar((x0 + x1) / 2, (y0 + y1) / 2, s, ms);
  }
  function zoomEm(px, py, fator) {
    cancelAnimationFrame(voo);
    const s = Math.min(S_MAX, Math.max(sMin, cam.s * fator));
    cam.x = px - (px - cam.x) * (s / cam.s); cam.y = py - (py - cam.y) * (s / cam.s); cam.s = s;
    pintar();
  }
  const noMundo = (px, py) => ({ x: (px - cam.x) / cam.s, y: (py - cam.y) / cam.s });
  function escala() {
    const kmPx = MAPA_KM / cam.s;
    const passo = [5, 10, 25, 50, 100, 200, 400, 800, 1600].find((k) => k / kmPx >= 70) || 1600;
    $('escala-txt').textContent = fmtKm(passo) + ' km';
    $('escala-barra').style.width = (passo / kmPx) + 'px';
  }

  /* ── O chão: os ladrilhos da pintura ── */
  const ladrilhos = new Map();
  let NIVEIS = null, pasta = '', pedido = 0, vivo = true, semPintura = false;
  fetch(cfg.base + 'mapa.json', { cache: 'no-cache' }).then((r) => r.json()).then((m) => {
    if (!vivo) return;
    NIVEIS = m.niveis; pasta = cfg.base + (m.versao ? m.versao + '/' : '');
    $('arte').innerHTML = [...NIVEIS].reverse().map((v) => `<div data-nv="${v.z}"></div>`).join('');
    ladrilhar();
  }).catch(() => {
    /* Sem pintura o mapa segue usável, mas a área escura e vazia parece
       quebrada (15/11/2026, usuário: "o mapa não carrega"). A tela diz o que falta. */
    if (vivo) { semPintura = true; aviso(); }
  });
  function pedirLadrilhos() { if (!pedido) pedido = requestAnimationFrame(() => { pedido = 0; ladrilhar(); }); }
  function ladrilhar() {
    if (!NIVEIS || !vw || !vivo) return;
    const topo = NIVEIS.length - 1;
    const telaPorPixel = cam.s * (window.devicePixelRatio || 1) * L / NIVEIS[0].w;
    const z = Math.max(0, Math.min(topo, Math.floor(Math.log2(1 / telaPorPixel) + .3)));
    const x0 = -cam.x / cam.s, y0 = -cam.y / cam.s, x1 = x0 + vw / cam.s, y1 = y0 + vh / cam.s;
    const querer = (nz) => {
      const n = NIVEIS[nz], tw = MAPA_LADO * L / n.w, th = MAPA_LADO * A / n.h, tudo = nz === topo;
      const i0 = tudo ? 0 : Math.max(0, Math.floor(x0 / tw) - 1), i1 = tudo ? n.cols - 1 : Math.min(n.cols - 1, Math.floor(x1 / tw) + 1);
      const j0 = tudo ? 0 : Math.max(0, Math.floor(y0 / th) - 1), j1 = tudo ? n.rows - 1 : Math.min(n.rows - 1, Math.floor(y1 / th) + 1);
      const casa = $('arte').querySelector('[data-nv="' + nz + '"]');
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const k = nz + '/' + i + '_' + j, ja = ladrilhos.get(k);
        if (ja && !(ja.falhou && performance.now() - ja.falhou > 15000)) { ja.vez = performance.now(); continue; }
        const im = new Image();
        im.alt = ''; im.decoding = 'async'; im.draggable = false;
        // 2 px reais do vizinho em cada lado: as bordas se cobrem sem esticar nada
        const px0 = Math.max(0, i * MAPA_LADO - MAPA_SOBRA), px1 = Math.min(n.w, (i + 1) * MAPA_LADO + MAPA_SOBRA);
        const py0 = Math.max(0, j * MAPA_LADO - MAPA_SOBRA), py1 = Math.min(n.h, (j + 1) * MAPA_LADO + MAPA_SOBRA);
        im.style.cssText = `left:${px0 * L / n.w}px;top:${py0 * A / n.h}px;width:${(px1 - px0) * L / n.w}px;height:${(py1 - py0) * A / n.h}px`;
        im.src = `${pasta}${nz}/${i}_${j}.png`;
        im.vez = performance.now(); im.nivel = nz;
        im.onerror = () => { im.remove(); im.falhou = performance.now(); };
        casa.appendChild(im); ladrilhos.set(k, im);
      }
    };
    querer(topo); if (z !== topo) querer(z);
    if (ladrilhos.size > 150) {     // solta os que há mais tempo ninguém vê
      [...ladrilhos].filter(([, im]) => im.nivel !== topo).sort((a, b) => a[1].vez - b[1].vez).slice(0, ladrilhos.size - 110)
        .forEach(([k, im]) => { im.remove(); ladrilhos.delete(k); });
    }
  }

  /* ── Estado ── */
  // foco: { tipo: 'destino' | 'aqui' | 'lugar' | 'linha' | 'marca' | 'gente' | 'nada', id? }
  const focoPadrao = () => (mestre && J ? { tipo: 'linha', id: J.rota.id } : J ? { tipo: 'destino' }
    : (!mestre && EU && EU.eu) ? { tipo: 'aqui' } : { tipo: 'nada' });
  let foco = { tipo: 'nada' };
  let modo = null;                 // null | 'medir' | 'marcar' | 'cidade' | 'ponto' | 'caminho' | 'rota' | 'por'
  let medida = [], traco = [], continua = null, pondo = null, pondoCidade = null;   // pondoCidade: a ficha escolhida na ferramenta Cidade
  let vsel = null, passa = null, recado = null, busca = '';

  const marcaEm = (l) => marcas.find((m) => m.lugar === l.id);
  const marcaSolta = (m) => !m.lugar || !lugarId(m.lugar);
  function alvo() {
    const f = foco;
    if (f.tipo === 'lugar') return lugarId(f.id);
    if (f.tipo === 'linha') return linhaId(f.id);
    if (f.tipo === 'marca') return marcas.find((m) => m.id === f.id);
    if (f.tipo === 'destino') return J && J.destino;
    if (f.tipo === 'gente') return postos().find((g) => String(g.id) === String(f.id));
    if (f.tipo === 'aqui') return EU && { x: EU.x, y: EU.y, nome: onde(EU) };
    return null;
  }
  function focar(f, voa = true) {
    foco = f; vsel = null; desenhar();
    const a = alvo(); if (!voa || !a) return;
    if (f.tipo === 'linha') enquadrar(a.pts, 800); else voar(a.x, a.y, Math.max(cam.s, 2.4));
  }
  const focoDoLugar = (l) =>
    mestre ? { tipo: 'lugar', id: l.id } :
    J && dist(J.destino, l) < 4 ? { tipo: 'destino' } :
    EU && EU.eu && dist(EU, l) < 4 ? { tipo: 'aqui' } :
    marcaEm(l) ? { tipo: 'marca', id: marcaEm(l).id } : { tipo: 'lugar', id: l.id };
  const visivel = (l) => l.tipo === 'caminho' || mestre || l.id === mesa.rota;

  /* ── Desenho ── */
  const pts = (a) => a.map((p) => `${p.x},${p.y}`).join(' ');
  const linha = (cls, a) => (a.length > 1 ? `<polyline class="${cls}" points="${pts(a)}"/>` : '');
  const disco = (g) => `<span class="mp-disco${g.eu ? ' eu' : ''}"${g.foto ? ` style="background-image:url(&quot;${esc(encodeURI(g.foto))}&quot;)"` : ''}>${g.foto ? '' : esc(String(g.nome || '?')[0])}</span>`;
  function desenhar() {
    EU = referencia(); J = jornada();
    if (foco.tipo !== 'nada' && !alvo()) foco = focoPadrao();
    const a = alvo();

    let s = '';
    mesa.linhas.forEach((l) => {
      if (l.id === continua || !visivel(l) || (J && l.id === J.rota.id)) return;
      const sel = foco.tipo === 'linha' && foco.id === l.id ? ' sel' : '';
      s += linha('mp-cam-base', l.pts) + linha((l.tipo === 'caminho' ? 'mp-cam' : 'mp-rota-outra') + sel, l.pts);
    });
    if (J && J.rota.id !== continua) s += linha('mp-rota-base', J.rota.pts) + linha('mp-rota-feita', J.feita) + linha('mp-rota-falta', J.falta);
    s += linha('mp-medida-base', traco) + linha('mp-traco', traco) + linha('mp-medida-base', medida) + linha('mp-medida', medida);
    $('linhas').innerHTML = s;

    const mk = (p, html) => `<div class="mp-mk" style="left:${p.x}px;top:${p.y}px">${html}</div>`;
    let h = '';
    if (passa && modo !== 'marcar') h += mk(passa, `<div class="mp-mira passa"></div>`);
    if (a && foco.tipo !== 'linha' && foco.tipo !== 'gente') h += mk(a, `<div class="mp-mira"></div>`);
    /* TODA CIDADE COM O MESMO SINAL (15/11/2026, usuário: "Deixe as cidades
       com o ícone de casinha, como está Saupami"). As 65 da pintura também
       ganham o marcador, em cima do desenho delas; o nome não, porque a
       pintura já o traz escrito ao lado — repeti-lo seria um segundo sinal
       para a mesma informação. */
    mesa.lugares.forEach((l) => {
      h += mk(l, `<button type="button" class="mp-marca${l.tipo === 'cidade' ? ' vila' : l.tipo === 'local' ? ' local' : ''}" data-alvo="lugar" data-id="${esc(l.id)}" aria-label="${esc(l.nome)}"><i class="ti ${ICONE_LUGAR[l.tipo] || 'ti-star'}" aria-hidden="true"></i></button>` +
        (l.p ? '' : `<span class="mp-etiqueta">${esc(l.nome)}</span>`));
    });
    if (J) h += mk(J.destino, `<button type="button" class="mp-marca destino" data-alvo="${mestre ? 'linha' : 'destino'}" data-id="${esc(J.rota.id)}" aria-label="${tr('Destino', 'Destination')}: ${esc(J.destino.nome)}"><i class="ti ti-flag" aria-hidden="true"></i></button>`);
    if (!mestre) marcas.forEach((m) => {
      h += mk(m, `<button type="button" class="mp-marca" data-alvo="marca" data-id="${esc(m.id)}" aria-label="${tr('Marca', 'Mark')}: ${esc(m.nome)}"><i class="ti ti-map-pin" aria-hidden="true"></i></button>` +
                 (marcaSolta(m) ? `<span class="mp-etiqueta">${esc(m.nome)}</span>` : ''));
    });
    medida.forEach((p) => { h += mk(p, `<div class="mp-ponto"></div>`); });
    traco.forEach((p) => { h += mk(p, `<div class="mp-ponto"></div>`); });
    // os personagens, agrupados por onde estão
    const grupos = new Map();
    postos().forEach((g) => { const k = g.x + ',' + g.y; grupos.set(k, [...(grupos.get(k) || []), g]); });
    grupos.forEach((turma) => {
      const meu = turma.some((g) => g.eu), sel = foco.tipo === 'gente' && turma.some((g) => String(g.id) === String(foco.id));
      h += mk(turma[0], (meu ? `<div class="mp-onda"></div><div class="mp-pe"></div>` : '') +
        `<button type="button" class="mp-pino${meu ? ' eu' : ''}${sel ? ' sel' : ''}" data-alvo="gente" data-id="${esc(turma[0].id)}" aria-label="${esc(turma.map((g) => g.nome).join(', '))}: ${esc(onde(turma[0]))}">` +
        turma.map(disco).join('') + `</button>`);
    });
    // alças da linha em foco: o Mestre arrasta os pontos; as menores criam um ponto novo
    if (mestre && !modo && foco.tipo === 'linha' && a) {
      a.pts.forEach((p, i) => { if (i) h += mk({ x: (p.x + a.pts[i - 1].x) / 2, y: (p.y + a.pts[i - 1].y) / 2 }, `<div class="mp-alca meio"></div>`); });
      a.pts.forEach((p, i) => { h += mk(p, `<div class="mp-alca${vsel === i ? ' sel' : ''}"></div>`); });
    }
    elMk.innerHTML = h;
    passe(); listas();
  }

  function passe() {
    const f = foco, a = alvo(), el = $('passe'), pe = $('passe-pe');
    let id = '', nums = '', acoes = '', nota = '';
    const cel = (rot, val) => `<div class="mp-celula"><span class="mp-rotulo">${rot}</span><span class="mp-valor assenta">${val}</span></div>`;
    const campo = (rot) => `<label class="mp-rotulo" for="mp-nome-foco">${rot}</label><input class="mp-passe-nome" id="mp-nome-foco" data-el="nome-foco" value="${esc(a.nome)}" maxlength="40" autocomplete="off">`;
    const fixo = (rot, vivoCls) => `<span class="mp-rotulo">${rot}</span><span class="mp-valor nome assenta${vivoCls ? ' vivo' : ''}">${esc(a.nome)}</span>`;
    /* SÓ O ÍCONE (15/11/2026, usuário: "Nos itens do mapa 'abrir a ficha, medir
       daqui, etc' deixe apenas o ícone"). O nome vai no aria-label e no balão
       do hover (data-dica, desenhado no CSS como o .mn-tip). */
    const bt = (acao, ico, txt, perigo) => `<button type="button" class="mp-acao so-ico${perigo ? ' perigo' : ''}" data-acao="${acao}" aria-label="${esc(txt)}" data-dica="${esc(txt)}"><i class="ti ${ico}" aria-hidden="true"></i></button>`;
    const doisNums = (rot, k) => cel(rot, `${fmtKm(k)} <small>km</small>`) + cel(tr('A pé', 'On foot'), dias(k));
    const faltaPelaRota = () => km(caminho(J.falta));

    if (f.tipo === 'nada') {
      el.hidden = true;
      pe.innerHTML = `<p class="mp-nota">${mestre
        ? tr('Toque numa cidade para escolher, ou use as ferramentas do mapa para pôr cidades cadastradas e criar pontos, caminhos e rotas.', 'Tap a city to pick it, or use the map tools to place registered cities and create points, paths and routes.')
        : cfg.semMesa ? tr('Toque numa cidade para escolher, ou use Medir. A rota e os personagens aparecem dentro de uma mesa.', 'Tap a city to pick it, or use Measure. The route and the characters show up inside a table.')
        : tr('Toque numa cidade para ver a distância. O Mestre ainda não traçou a rota da mesa.', 'Tap a city to see the distance. The Game Master has not drawn the table route yet.')}</p>`;
      return;
    }
    el.hidden = false;
    if (f.tipo === 'destino') {
      id = fixo(tr('Destino da mesa', 'Table destination'), true);
      nums = doisNums(tr('Falta pela rota', 'Left on route'), faltaPelaRota());
      nota = J.feita.length > 1 && J.origem
        ? tr(`Vocês já andaram ${fmtKm(km(caminho(J.feita)))} km desde ${esc(J.origem)}.`, `You have walked ${fmtKm(km(caminho(J.feita)))} km since ${esc(J.origem)}.`)
        : '';
    } else if (f.tipo === 'aqui') {
      const com = postos().filter((g) => !g.eu && dist(g, EU) < 4).map((g) => g.nome);
      id = fixo(tr('Você está em', 'You are in'));
      if (J) nums = doisNums(tr('Até o destino', 'To destination'), faltaPelaRota());
      nota = com.length ? tr(`Com você: ${esc(com.join(', '))}.`, `With you: ${esc(com.join(', '))}.`) : tr('Você está sozinho aqui.', 'You are alone here.');
    } else if (f.tipo === 'gente') {
      const juntos = postos().filter((g) => String(g.id) !== String(a.id) && dist(g, a) < .06).map((g) => g.nome);
      id = fixo(tr('Personagem', 'Character'));
      nums = cel(tr('Onde está', 'Where'), esc(onde(a))) + (J ? cel(tr('Até o destino', 'To destination'), `${fmtKm(km(caminho(mapaJornada(mesa, a).falta)))} <small>km</small>`) : '');
      if (mestre) {
        acoes = bt('repor', 'ti-map-pin', tr('Pôr em outro lugar', 'Place elsewhere')) + bt('tirar-gente', 'ti-trash', tr('Tirar do mapa', 'Remove from map'), true);
        nota = juntos.length
          ? tr(`Arraste no mapa para mover; ${esc(juntos.join(', '))} ${juntos.length > 1 ? 'vão' : 'vai'} junto.`, `Drag on the map to move; ${esc(juntos.join(', '))} will follow.`)
          : tr('Arraste no mapa para mover.', 'Drag on the map to move.');
      }
    } else if (f.tipo === 'linha') {
      const k = km(caminho(a.pts)), daMesa = a.id === mesa.rota;
      const rot = a.tipo === 'caminho' ? tr('Caminho', 'Path') : daMesa ? tr('Rota da mesa', 'Table route') : tr('Rota', 'Route');
      id = mestre ? campo(rot) : fixo(rot);
      nums = doisNums(tr('Comprimento', 'Length'), k);
      if (mestre) {
        acoes = bt('continuar', 'ti-pencil-plus', tr('Continuar traçado', 'Keep drawing'));
        if (a.tipo === 'rota' && !daMesa) acoes += bt('ativar', 'ti-flag', tr('Tornar a rota da mesa', 'Make it the table route'));
        if (vsel != null && a.pts.length > 2) acoes += bt('tirar-ponto', 'ti-point-off', tr('Tirar o ponto', 'Remove point'));
        acoes += bt('remover', 'ti-trash', tr('Remover', 'Remove'), true);
        nota = tr('Arraste os pontos no mapa para ajustar. Os menores criam um ponto novo.', 'Drag the points on the map to adjust. The smaller ones create a new point.');
      }
    } else {
      const quem = postos().filter((g) => dist(g, a) < 4).map((g) => g.nome);
      if (EU) nums = doisNums(EU.eu ? tr('Em linha reta', 'Straight line') : tr('De ' + esc(EU.nome), 'From ' + esc(EU.nome)), km(dist(EU, a)));
      if (f.tipo === 'lugar') {
        const rot = a.tipo === 'cidade' ? tr('Cidade', 'City') : a.tipo === 'local' ? tr('Local', 'Place') : tr('Ponto de interesse', 'Point of interest');
        // cidade ligada à ficha: o nome é o da aba Cidades, e é lá que se muda
        id = mestre && !((a.tipo === 'cidade' || a.tipo === 'local') && fichaDe(a)) ? campo(rot) : fixo(rot);
        if (!mestre) acoes = bt('marcar', 'ti-map-pin', tr('Marcar interesse', 'Mark interest'));
      } else {
        id = marcaSolta(a) ? campo(tr('Sua marca', 'Your mark')) : fixo(tr('Lugar marcado', 'Marked place'));
        acoes = bt('desmarcar', 'ti-trash', tr('Remover marca', 'Remove mark'), true);
      }
      acoes += bt('medir', 'ti-ruler-2', tr('Medir daqui', 'Measure from here'));
      if (mestre) {
        if (gente.length) acoes += bt('trazer', 'ti-users', tr('Trazer a comitiva', 'Bring the party'));
        // O lugar do mundo só o Imperador move ou tira; o Mestre usa como está.
        const doMundo = f.tipo === 'lugar' && a.mundo;
        if (!doMundo || imperador) {
          acoes += bt('remover', 'ti-trash', tr('Remover', 'Remove'), true);
          nota = tr('Arraste no mapa para mudar de lugar.', 'Drag on the map to move it.');
        }
      } else if (quem.length) nota = tr(`${esc(quem.join(', '))} ${quem.length > 1 ? 'estão' : 'está'} aqui.`, `${esc(quem.join(', '))} ${quem.length > 1 ? 'are' : 'is'} here.`);
    }
    /* O que a aba Cidades sabe deste lugar: reino e população no passe, e a
       ficha inteira a um toque. */
    const lugarDaFicha = f.tipo === 'marca' ? (marcaSolta(a) ? null : lugarId(a.lugar)) : (f.tipo === 'lugar' || f.tipo === 'destino' || f.tipo === 'aqui') ? a : null;
    const ficha = fichaDe(lugarDaFicha);
    let daFicha = '';
    if (ficha) {
      const at = ficha.atributos || {}, reino = at.reino ? (nomesLore[at.reino] || at.reino) : '', pop = Number(at.populacao) || 0;
      if (reino) daFicha += cel(tr('Reino', 'Kingdom'), esc(reino));
      if (pop) daFicha += cel(tr('População', 'Population'), fmtKm(pop));
      acoes = bt('ficha', 'ti-building', tr('Abrir a ficha', 'Open the entry')) + acoes;
    }
    const editando = document.activeElement && document.activeElement.id === 'mp-nome-foco';
    if (!editando) el.innerHTML = `<div class="mp-passe-id">${id}</div>` + (nums ? `<div class="mp-passe-nums">${nums}</div>` : '') + (daFicha ? `<div class="mp-passe-nums">${daFicha}</div>` : '');   // não rouba o cursor de quem digita
    pe.innerHTML = (acoes ? `<div class="mp-acoes">${acoes}</div>` : '') + (nota ? `<p class="mp-nota">${nota}</p>` : '');
  }

  function listas() {
    const a = alvo();
    const quadro = (titulo, n, col, linhas, vazio) => `<section class="mp-secao"><div class="mp-quadro-cab"><span class="mp-rotulo">${titulo}</span><span class="mp-conta">${n}</span><span class="mp-rotulo col">${col}</span></div>
      <ul class="mp-quadro">${linhas || `<li><p class="mp-vazio">${vazio}</p></li>`}</ul></section>`;
    const item = (ico, nome, tipo, num, attrs, atual) => `<li><button type="button" class="mp-linha" ${attrs} aria-current="${!!atual}">
      <span class="mp-ln-ico"><i class="ti ${ico}" aria-hidden="true"></i></span>
      <span class="mp-ln-txt"><span class="mp-ln-nome">${esc(nome)}</span>${tipo ? `<span class="mp-ln-tipo">${tipo}</span>` : ''}</span>
      <span class="mp-ln-num">${num}</span></button></li>`;
    const emFoco = (tipo, id) => foco.tipo === tipo && String(foco.id) === String(id);
    const longe = (p) => (EU ? fmtKm(km(dist(EU, p))) + ' km' : '');
    const daLinha = (t) => mesa.linhas.filter((l) => l.tipo === t).map((l) =>
      item(t === 'rota' ? 'ti-route' : 'ti-road', l.nome, l.id === mesa.rota ? tr('Rota da mesa', 'Table route') : '', fmtKm(km(caminho(l.pts))) + ' km', `data-alvo="linha" data-id="${esc(l.id)}"`, emFoco('linha', l.id))).join('');

    let h = '';
    if (mestre) {
      const pontos = mesa.lugares.filter((l) => l.tipo === 'ponto'), novas = mesa.lugares.filter((l) => l.tipo === 'cidade' && !l.p);
      const doLugar = (l) => item(ICONE_LUGAR[l.tipo] || 'ti-star', l.nome, '', longe(l), `data-alvo="lugar" data-id="${esc(l.id)}"`, emFoco('lugar', l.id));
      const colLonge = EU ? tr('De ' + esc(EU.nome), 'From ' + esc(EU.nome)) : '';
      /* CADA QUADRO COM A SUA FERRAMENTA (15/11/2026, usuário: "As informações
         de 'rotas', 'caminhos', 'pontos' e 'cidades novas' só aparecem no menu
         lateral quando o botão estiver ativo"). Sem ferramenta ligada, o painel
         fica com o passe e a comitiva. */
      if (modo === 'rota') h += quadro(tr('Rotas', 'Routes'), mesa.linhas.filter((l) => l.tipo === 'rota').length, tr('Comprimento', 'Length'), daLinha('rota'),
        tr('Nenhuma rota ainda. Toque, um a um, nos pontos por onde a comitiva vai passar.', 'No route yet. Tap, one by one, the points the party will pass through.'));
      if (modo === 'caminho') h += quadro(tr('Caminhos', 'Paths'), mesa.linhas.filter((l) => l.tipo === 'caminho').length, tr('Comprimento', 'Length'), daLinha('caminho'),
        tr('Nenhum caminho ainda. Trace estradas, trilhas e travessias tocando no mapa.', 'No path yet. Draw roads, trails and crossings by tapping the map.'));
      if (modo === 'ponto') h += quadro(tr('Pontos', 'Points'), pontos.length, colLonge, pontos.map(doLugar).join(''), tr('Nenhum ponto ainda. Toque no mapa onde fica o ponto.', 'No point yet. Tap the map where the point is.'));
      const locaisNoMapa = mesa.lugares.filter((l) => l.tipo === 'local');
      if (modo === 'cidade') h += quadro(tr('Cidades novas', 'New cities'), novas.length, colLonge, novas.map(doLugar).join(''),
        tr(`As ${mesa.lugares.length - novas.length - pontos.length - locaisNoMapa.length} cidades da pintura já respondem ao toque.`, `The ${mesa.lugares.length - novas.length - pontos.length - locaisNoMapa.length} painted cities already respond to taps.`));
      if (modo === 'local') h += quadro(tr('Locais no mapa', 'Places on the map'), locaisNoMapa.length, colLonge, locaisNoMapa.map(doLugar).join(''),
        tr('Nenhum local no mapa ainda. Escolha um cadastrado na lista acima e toque onde ele fica.', 'No place on the map yet. Pick a registered one in the list above and tap where it is.'));
    }
    if (!cfg.semMesa) h += quadro(tr('Comitiva', 'Party'), gente.length, tr('Onde está', 'Where'), gente.map((g) => {
      const p = mesa.gente[g.id];
      return `<li><button type="button" class="mp-linha" data-alvo="gente" data-id="${esc(g.id)}" aria-current="${emFoco('gente', g.id) || (!!p && !!a && (foco.tipo === 'aqui' || foco.tipo === 'lugar' || foco.tipo === 'destino') && dist(a, p) < 4)}">
        ${disco(g)}
        <span class="mp-ln-txt"><span class="mp-ln-nome">${esc(g.nome)}</span>${g.eu ? `<span class="mp-ln-tipo">${tr('Você', 'You')}</span>` : ''}</span>
        <span class="mp-ln-num${p ? '' : ' fora'}">${p ? esc(onde(p)) : (mestre ? tr('Pôr no mapa', 'Place on map') : tr('Fora do mapa', 'Off the map'))}</span></button></li>`;
    }).join(''), mestre ? tr('Esta mesa ainda não tem personagens.', 'This table has no characters yet.') : tr('Ninguém na mesa ainda.', 'Nobody at the table yet.'));
    if (!mestre && cfg.aoMudarMarcas) {
      h += quadro(tr('Marcas', 'Marks'), marcas.length + (J ? 1 : 0), tr('De você', 'From you'),
        (J ? item('ti-flag', J.destino.nome, tr('Destino da mesa', 'Table destination'), fmtKm(km(caminho(J.falta))) + ' km', 'data-alvo="destino"', foco.tipo === 'destino') : '') +
        marcas.map((m) => item('ti-map-pin', m.nome, marcaSolta(m) ? tr('Sua marca', 'Your mark') : tr('Lugar marcado', 'Marked place'), longe(m), `data-alvo="marca" data-id="${esc(m.id)}"`, emFoco('marca', m.id))).join('') +
        (marcas.length ? '' : `<li><p class="mp-vazio">${tr('Nenhuma marca sua ainda. Use Marcar e toque no mapa, ou escolha um lugar e marque o interesse.', 'No marks yet. Use Mark and tap the map, or pick a place and mark your interest.')}</p></li>`));
    }
    $('listas').innerHTML = h;
    achados();
  }

  function achados() {
    const q = semAcento(busca.trim()), el = $('achados');
    if (modo === 'cidade' || modo === 'local') {   // a ferramenta Cidade ou Local: os cadastrados que ainda não estão no mapa
      const ehLocal = modo === 'local';
      const livres = foraDoMapa(modo), mostra = livres.filter((e) => !q || semAcento(e.nome).includes(q));
      const chegou = ehLocal ? locaisCad : cadastradas;
      const vazio = !chegou
        ? (ehLocal ? tr('Os locais cadastrados ainda não chegaram. Tente de novo em instantes.', 'The registered places have not loaded yet. Try again in a moment.')
                   : tr('As cidades cadastradas ainda não chegaram. Tente de novo em instantes.', 'The registered cities have not loaded yet. Try again in a moment.'))
        : q && livres.length
          ? (ehLocal ? tr('Nenhum local cadastrado com esse nome fora do mapa.', 'No registered place with that name off the map.')
                     : tr('Nenhuma cidade cadastrada com esse nome fora do mapa.', 'No registered city with that name off the map.'))
          : (ehLocal ? tr('Todos os locais cadastrados já estão no mapa. Para pôr outro, crie-o antes na aba Locais.', 'Every registered place is already on the map. To place another, create it first in the Places tab.')
                     : tr('Todas as cidades cadastradas já estão no mapa. Para pôr outra, crie-a antes na aba Cidades.', 'Every registered city is already on the map. To place another, create it first in the Cities tab.'));
      el.innerHTML = `<li class="mp-quadro-cab"><span class="mp-rotulo">${ehLocal ? tr('Locais cadastrados', 'Registered places') : tr('Cidades cadastradas', 'Registered cities')}</span><span class="mp-conta">${livres.length}</span><span class="mp-rotulo col">${tr('Reino', 'Kingdom')}</span></li>` +
        (mostra.map((e) => { const reino = e.atributos && e.atributos.reino;
          return `<li><button type="button" class="mp-linha" data-ficha="${esc(e.id)}" aria-current="${!!pondoCidade && String(pondoCidade.id) === String(e.id)}">
            <span class="mp-ln-ico"><i class="ti ${ICONE_LUGAR[modo]}" aria-hidden="true"></i></span>
            <span class="mp-ln-txt"><span class="mp-ln-nome">${esc(e.nome)}</span></span><span class="mp-ln-num">${reino ? esc(nomesLore[reino] || reino) : ''}</span></button></li>`; }).join('')
          || `<li><p class="mp-vazio">${vazio}</p></li>`);
      return;
    }
    if (!q) { el.innerHTML = ''; return; }
    const nomes = mesa.lugares.map((l) => [semAcento(l.nome), l]).sort((x, y) => x[0].localeCompare(y[0]));
    const achou = [...nomes.filter((n) => n[0].startsWith(q)), ...nomes.filter((n) => !n[0].startsWith(q) && n[0].includes(q))].slice(0, 6).map((n) => n[1]);
    el.innerHTML = achou.map((l) => `<li><button type="button" class="mp-linha" data-alvo="lugar" data-id="${esc(l.id)}">
      <span class="mp-ln-txt"><span class="mp-ln-nome">${esc(l.nome)}</span></span><span class="mp-ln-num">${EU ? fmtKm(km(dist(EU, l))) + ' km' : ''}</span></button></li>`).join('')
      || `<li><p class="mp-vazio">${tr('Nenhum lugar com esse nome neste mapa.', 'No place with that name on this map.')}</p></li>`;
  }

  const FERR = {
    medir: ['ti-ruler-2', tr('Medir', 'Measure')], marcar: ['ti-map-pin-plus', tr('Marcar', 'Mark')],
    cidade: ['ti-building-castle', tr('Cidade', 'City')], local: ['ti-mountain', tr('Local', 'Place')], ponto: ['ti-star', tr('Ponto', 'Point')],
    caminho: ['ti-road', tr('Caminho', 'Path')], rota: ['ti-route', tr('Rota', 'Route')],
  };
  function aviso() {
    const el = $('aviso');
    /* Cidade e Local são do mundo: só o Imperador, dentro ou fora de mesa. Fora
       de mesa não há ponto, caminho nem rota — esses são da história de cada mesa. */
    const doMundo = imperador ? ['cidade', 'local'] : [];
    const quais = mestre ? (cfg.semMesa ? ['medir', ...doMundo] : ['medir', ...doMundo, 'ponto', 'caminho', 'rota']) : (cfg.aoMudarMarcas ? ['medir', 'marcar'] : ['medir']);
    $('ferramentas').innerHTML = quais.map((k) =>
      `<button type="button" class="mp-ferr" data-modo="${k}" aria-pressed="${modo === k}" aria-label="${FERR[k][1]}"><i class="ti ${FERR[k][0]}" aria-hidden="true"></i><span>${FERR[k][1]}</span></button>`).join('');
    $('barra').classList.toggle('cheia', mestre);
    elMapa.classList.toggle('ferramenta', !!modo);
    const botoes = (...b) => `<span class="mp-aviso-acoes">${b.map(([acao, txt]) => `<button type="button" class="mp-acao" data-acao="${acao}">${txt}</button>`).join('')}</span>`;
    let h = '';
    if (modo === 'marcar') h = tr('Toque no mapa onde quer deixar a marca.', 'Tap the map where you want to leave the mark.');
    else if (modo === 'cidade') h = pondoCidade ? tr(`Toque no mapa onde fica ${esc(pondoCidade.nome)}.`, `Tap the map where ${esc(pondoCidade.nome)} is.`)
      : tr('Escolha na lista a cidade cadastrada que vai para o mapa.', 'Pick from the list the registered city to place on the map.');
    else if (modo === 'local') h = pondoCidade ? tr(`Toque no mapa onde fica ${esc(pondoCidade.nome)}.`, `Tap the map where ${esc(pondoCidade.nome)} is.`)
      : tr('Escolha na lista o local cadastrado que vai para o mapa.', 'Pick from the list the registered place to put on the map.');
    else if (modo === 'ponto') h = tr('Toque no mapa onde fica o ponto.', 'Tap the map where the point is.');
    else if (modo === 'por') { const g = gente.find((x) => String(x.id) === String(pondo));
      h = pondo === 'todos' ? tr('Toque no mapa onde a comitiva está.', 'Tap the map where the party is.')
        : tr(`Toque no mapa onde ${esc(g ? g.nome : '')} está.`, `Tap the map where ${esc(g ? g.nome : '')} is.`); }
    else if (modo === 'medir') {
      const k = km(caminho(medida));
      h = medida.length < 2 ? (medida.length ? tr('Toque no próximo ponto.', 'Tap the next point.') : tr('Toque nos pontos do caminho que quer medir.', 'Tap the points of the path you want to measure.'))
        : `<span><b>${fmtKm(k)} km</b> · ${dias(k)} ${tr('a pé', 'on foot')}</span>` + botoes(['limpar-medida', tr('Limpar', 'Clear')]);
    } else if (modo) {
      const k = km(caminho(traco));
      h = traco.length < 2 ? (traco.length ? tr('Toque no próximo ponto.', 'Tap the next point.') : (modo === 'rota' ? tr('Toque, um a um, nos pontos da rota.', 'Tap the route points one by one.') : tr('Toque, um a um, nos pontos do caminho.', 'Tap the path points one by one.')))
        : `<span><b>${fmtKm(k)} km</b> · ${dias(k)} ${tr('a pé', 'on foot')}</span>` + botoes(['volta-ponto', tr('Voltar um', 'Undo point')], ['concluir', tr('Concluir', 'Finish')]);
    } else if (recado) h = `<span>${esc(recado.txt)}</span>` + (recado.antes ? botoes(['desfazer', tr('Desfazer', 'Undo')]) : '');
    else if (semPintura) h = tr('A pintura do mapa não carregou. O resto funciona, mas sem o desenho por baixo.', 'The map painting did not load. Everything else works, but without the drawing underneath.');
    el.hidden = !h; el.innerHTML = h;
  }
  function trocarModo(m) {
    modo = modo === m ? null : m;
    if (modo !== 'medir') medida = [];
    traco = []; continua = null; pondo = null; pondoCidade = null; recado = null; passa = null; vsel = null;
    aviso(); desenhar();
  }
  const escreverNome = () => { const c = $('nome-foco'); if (c) { c.focus(); c.select(); } };
  function concluir() {
    if (traco.length < 2) { trocarModo(modo); return; }
    let l = continua && linhaId(continua); const nova = !l;
    if (l) l.pts = traco;
    else {
      const n = mesa.linhas.filter((x) => x.tipo === modo).length + 1;
      l = { id: novoId(), tipo: modo, nome: (modo === 'rota' ? tr('Rota ', 'Route ') : tr('Caminho ', 'Path ')) + n, pts: traco };
      mesa.linhas.push(l);
      if (modo === 'rota' && !J) mesa.rota = l.id;
    }
    guardarMesa(); modo = null; traco = []; continua = null; aviso(); focar({ tipo: 'linha', id: l.id }, false);
    if (nova) escreverNome();
  }
  function remover() {
    const a = alvo(), antes = JSON.stringify(mesa);
    if (foco.tipo === 'lugar') mesa.lugares = mesa.lugares.filter((l) => l.id !== a.id);
    else if (foco.tipo === 'gente') delete mesa.gente[a.id];
    else { mesa.linhas = mesa.linhas.filter((l) => l.id !== a.id); if (mesa.rota === a.id) mesa.rota = null; }
    guardarMesa(); recado = { txt: tr(`${a.nome}: removido.`, `${a.nome}: removed.`), antes };
    EU = referencia(); J = jornada(); foco = focoPadrao(); vsel = null;
    aviso(); desenhar();
  }
  function porGente(quem, p) {
    const ids = quem === 'todos' ? gente.map((g) => g.id) : [quem];
    ids.forEach((id) => { mesa.gente[id] = { x: p.x, y: p.y }; });
    guardarMesa();
  }

  /* ── Gestos ── */
  const dedos = new Map(); let arrasto = null, pinca = null;
  const maisPerto = (p, raioTela = 16) => perto(p, raioTela / cam.s);
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
    if (foco.tipo !== 'linha') return null;
    let m = null, md = r;
    a.pts.forEach((v, i) => { const d = dist(v, p); if (d < md) { md = d; m = { tipo: 'v', i }; } });
    if (m) return m;
    md = r * .8;
    a.pts.forEach((v, i) => { if (!i) return; const d = dist({ x: (v.x + a.pts[i - 1].x) / 2, y: (v.y + a.pts[i - 1].y) / 2 }, p); if (d < md) { md = d; m = { tipo: 'meio', i }; } });
    return m;
  }

  ouvir(elMapa, 'pointerdown', (e) => {
    const { px, py } = local(e);
    const pega = mestre && !modo && !e.target.closest('.mp-barra, .mp-aviso') ? pegar(noMundo(px, py)) : null;
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
    if (dedos.size === 1) arrasto = { px, py, cx: cam.x, cy: cam.y, andou: false, pega };
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
      const a = alvo(), w = noMundo(px, py), p = { x: r1(Math.max(0, Math.min(L, w.x))), y: r1(Math.max(0, Math.min(A, w.y))) };
      if (g.tipo === 'lugar') {
        // os traçados e os personagens que estão neste lugar andam junto com ele
        mesa.linhas.forEach((l) => l.pts.forEach((v) => { if (dist(v, a) < .06) { v.x = p.x; v.y = p.y; } }));
        Object.values(mesa.gente).forEach((v) => { if (dist(v, a) < .06) { v.x = p.x; v.y = p.y; } });
        a.x = p.x; a.y = p.y;
      } else if (g.tipo === 'gente') {
        const l = maisPerto(p, 12), q = l ? { x: l.x, y: l.y } : p;
        g.ids.forEach((id) => { mesa.gente[id] = { x: q.x, y: q.y }; });
      } else {
        if (g.tipo === 'meio') { a.pts.splice(g.i, 0, p); g.tipo = 'v'; }
        const l = maisPerto(p, 10);
        a.pts[g.i] = l ? { x: l.x, y: l.y } : p; vsel = g.i;
      }
      desenhar();
      return;
    }
    if (e.pointerType === 'mouse' && !e.target.closest('button')) {
      const l = modo === 'marcar' || modo === 'cidade' || modo === 'local' || modo === 'ponto' ? null : maisPerto(noMundo(px, py));
      if (l !== passa) { passa = l; elMapa.classList.toggle('aponta', !!l && !modo); desenhar(); }
    }
  });
  const soltar = (e) => {
    const era = arrasto; dedos.delete(e.pointerId);
    if (dedos.size < 2) pinca = null;
    if (dedos.size === 0) { arrasto = null; elMapa.classList.remove('arrastando'); }
    if (!era) return;
    if (era.pega) {
      if (era.andou) guardarMesa(); else if (era.pega.tipo === 'v') vsel = vsel === era.pega.i ? null : era.pega.i;
      desenhar(); return;
    }
    if (era.andou || e.type !== 'pointerup') return;
    const { px, py } = local(e), w = noMundo(px, py), p = { x: r1(w.x), y: r1(w.y) };
    if (p.x < 0 || p.y < 0 || p.x > L || p.y > A) return;
    const l = maisPerto(p), aqui = l ? { x: l.x, y: l.y } : p;
    if (modo === 'medir') { medida.push(aqui); aviso(); desenhar(); return; }
    if (modo === 'caminho' || modo === 'rota') { traco.push(aqui); aviso(); desenhar(); return; }
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
    if (modo === 'cidade' || modo === 'local') {   // só posiciona um cadastrado: sem ficha escolhida, o toque não cria nada
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
    const ln = linhaPerto(p);
    if (ln) focar(!mestre && ln.id === mesa.rota ? { tipo: 'destino' } : { tipo: 'linha', id: ln.id }, false);
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
  ouvir(document, 'keydown', (e) => {
    if (!raiz.isConnected) return;
    const campo = !!e.target.matches && e.target.matches('input, textarea, select');
    if (campo && e.key === 'Enter' && e.target.id === 'mp-nome-foco') { e.target.blur(); return; }
    if (e.key === 'Escape' && modo) trocarModo(modo);
    else if (e.key === 'Enter' && !campo && (modo === 'caminho' || modo === 'rota')) { e.preventDefault(); concluir(); }
  });

  /* ── Cliques ── */
  ouvir(raiz, 'click', (e) => {
    const b = e.target.closest('[data-alvo],[data-acao],[data-modo],[data-zoom],[data-ficha]'); if (!b || !raiz.contains(b)) return;
    // Com ferramenta ligada, o toque no marcador já foi tratado como toque no mapa (soltar).
    if (modo && b.closest('.mp-marca, .mp-pino') && !$('listas').contains(b)) return;
    const { alvo: qual, acao, id } = b.dataset, a = alvo();
    if (b.dataset.ficha) {           // a cidade cadastrada que o próximo toque no mapa vai posicionar
      pondoCidade = ((modo === 'cidade' || modo === 'local') && fichaPeloId(modo, b.dataset.ficha)) || null; aviso(); achados(); return;
    }
    /* Escolher na lista da ferramenta (uma rota, um ponto) sai da ferramenta e
       abre o escolhido; senão o próximo toque no mapa viraria um ponto novo. */
    if (modo && (qual === 'linha' || qual === 'lugar') && $('listas').contains(b)) {
      modo = null; traco = []; continua = null; pondoCidade = null; recado = null; aviso();
    }
    if (b.dataset.modo) trocarModo(b.dataset.modo);
    else if (b.dataset.zoom) { const c = noMundo(vw / 2, vh / 2);
      if (b.dataset.zoom === 'tudo') voar(L / 2, A / 2, sMin, 700); else voar(c.x, c.y, cam.s * (b.dataset.zoom === 'mais' ? 1.6 : 1 / 1.6), 350); }
    else if (qual === 'destino') focar({ tipo: 'destino' });
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
    else if (acao === 'medir') { modo = 'medir'; medida = [{ x: a.x, y: a.y }]; traco = []; continua = null; aviso(); desenhar(); }
    else if (acao === 'ficha') { const fc = fichaDe(foco.tipo === 'marca' ? lugarId(a.lugar) : a); if (fc && cfg.aoAbrirCidade) cfg.aoAbrirCidade(fc); }
    else if (acao === 'limpar-medida') { medida = []; aviso(); desenhar(); }
    else if (acao === 'volta-ponto') { traco.pop(); aviso(); desenhar(); }
    else if (acao === 'concluir') concluir();
    else if (acao === 'continuar') { modo = a.tipo; continua = a.id; traco = a.pts.map((p) => ({ ...p })); medida = []; recado = null; vsel = null; aviso(); desenhar(); }
    else if (acao === 'ativar') { mesa.rota = a.id; guardarMesa(); desenhar(); }
    else if (acao === 'tirar-ponto') { a.pts.splice(vsel, 1); vsel = null; guardarMesa(); desenhar(); }
    else if (acao === 'trazer') { porGente('todos', a); desenhar(); }
    else if (acao === 'repor') { modo = 'por'; pondo = a.id; medida = []; traco = []; continua = null; recado = null; aviso(); desenhar(); }
    else if (acao === 'tirar-gente' || acao === 'remover') remover();
    else if (acao === 'desfazer') { mesa = mapaNormalizar(JSON.parse(recado.antes)); guardarMesa(); recado = null; aviso(); desenhar(); }
    if ($('achados').contains(b) && cfg.aoEscolherAchado) cfg.aoEscolherAchado();
  });
  ouvir(raiz, 'input', (e) => {
    if (e.target.id !== 'mp-nome-foco') return;
    const a = alvo(); if (!a) return;
    a.nome = e.target.value.trim() || (foco.tipo === 'marca' ? tr('Marca', 'Mark') : tr('Sem nome', 'Unnamed'));
    if (foco.tipo === 'marca') guardar(); else guardarMesa();
    desenhar();
  });

  /* ── Partida ── */
  let pronto = false;
  const olho = new ResizeObserver(() => {
    const r = elMapa.getBoundingClientRect(); vw = r.width; vh = r.height;
    if (!vw || !vh) return;
    sMin = Math.min(vw / L, vh / A);
    if (!pronto) {
      pronto = true;
      cam.s = sMin; pintar(); EU = referencia(); J = jornada(); foco = focoPadrao(); aviso(); desenhar();
      // abre no mapa inteiro e desce até a jornada (ou até quem está no mapa)
      const alvoInicial = J ? J.rota.pts : postos();
      if (alvoInicial.length) setTimeout(() => vivo && enquadrar(alvoInicial, 1500), 450);
    } else pintar();
  });
  olho.observe(elMapa);

  return {
    /* O banco avisou que o mapa mudou (o Mestre mexeu, em outro aparelho ou neste). */
    receber(dados) {
      if (arrasto && arrasto.pega) return;            // não puxa o tapete de quem está arrastando
      if (modo === 'caminho' || modo === 'rota') return;
      mesa = mapaNormalizar(dados); juntarMundo(); acertarNomes(); desenhar();
    },
    /* A camada do mundo chegou (ou mudou): entra no lugar da que havia. */
    receberMundo(lugares) {
      if (arrasto && arrasto.pega) return;
      mundo = Array.isArray(lugares) ? lugares : []; ultimoMundo = JSON.stringify(mundo);
      juntarMundo(); acertarNomes(); if (pronto) desenhar();
    },
    buscar(texto) { busca = texto || ''; achados(); },
    /* As cidades cadastradas chegaram (ou mudaram): religa e redesenha o passe. */
    catalogar(c) { porFichas(c); if (acertarNomes() && mestre) guardarMesa(); if (pronto) desenhar(); },
    falhou() { recado = { txt: tr('O mapa não foi salvo. Confira a conexão e mexa de novo.', 'The map was not saved. Check your connection and try again.') }; aviso(); },
    destruir() {
      vivo = false; cancelAnimationFrame(voo); cancelAnimationFrame(pedido); olho.disconnect();
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
      if (mestre) {
        // Os locais também (15/11/2026): a ferramenta Local põe os cadastrados no mapa.
        const [c, rn, lc] = await Promise.all([sb().rpc('listar_catalogo_global', { p_tipo: 'cidade' }), sb().rpc('listar_catalogo_global', { p_tipo: 'reino' }),
          sb().rpc('listar_catalogo_global', { p_tipo: 'local' })]);
        entradas = [...((c.data && c.data.entradas) || []).map((e) => ({ ...e, tipo: 'cidade' })), ...((rn.data && rn.data.entradas) || []).map((e) => ({ ...e, tipo: 'reino' })),
          ...((lc.data && lc.data.entradas) || []).map((e) => ({ ...e, tipo: 'local' }))];
      } else if (pj) {
        const [d, l] = await Promise.all([sb().rpc('listar_diario_disponivel', { p_personagem_id: pj.id }), sb().rpc('listar_diario_lore', { p_personagem_id: pj.id })]);
        entradas = [...((l.data && l.data.entradas) || []), ...((d.data && d.data.lore) || [])];
      }
      const nomes = {}; entradas.forEach((e) => { if (e && e.id) nomes[e.id] = e.nome; });
      return { cidades: entradas.filter((e) => e && e.tipo === 'cidade' && e.nome), locais: entradas.filter((e) => e && e.tipo === 'local' && e.nome), nomes, lore: entradas };
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
/* Onde moram os ladrilhos: bucket público `mapas`, pasta `oriental`. */
function mapaBaseLadrilhos() {
  const url = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || '';
  return url.replace(/\/$/, '') + '/storage/v1/object/public/mapas/oriental/';
}

/* ============================================================
   A PÁGINA
   ============================================================
   profile 'master': a mesa ativa, com as ferramentas de criação.
   profile 'player': a mesa do personagem ativo; mede e marca interesses.
   `api` e `base` existem para a prévia e os testes trocarem o banco. */
function MapaView({ lang, profile, historiaId, pj = null, trilhoPaginas = null, api = null, base = null }) {
  const en = lang === 'en', mestre = profile === 'master';
  const raiz = React.useRef(null), motor = React.useRef(null);
  const [estado, setEstado] = React.useState('carregando');   // 'carregando' | 'pronto' | 'erro'
  const [query, setQuery] = React.useState('');
  const [catalogo, setCatalogo] = React.useState(null);     // { cidades, nomes, lore }
  const [fichaAberta, setFichaAberta] = React.useState(null);
  const banco = React.useMemo(() => api || mapaApiSupabase(), [api]);
  const pjId = pj ? pj.id : null;
  /* FORA DAS MESAS (15/11/2026, usuário: "O mapa não está aparecendo"): o mapa
     é do mundo antes de ser da mesa. Sem mesa (ou Jogador sem personagem), ele
     abre só para olhar e medir — a pintura e as cidades dela —, sem banco. */
  const semMesa = !historiaId || (!mestre && !pj);
  /* O IMPERADOR PÕE CIDADES E LOCAIS FORA DE MESA (15/11/2026): a camada do
     mundo (catalogo_mundo, tipo 'mapa') é dele; gravar passa pelo catálogo do
     mundo, cujas policies pedem eh_admin(). */
  const ehImperador = (typeof window !== 'undefined' && typeof window.useEhAdmin === 'function') ? window.useEhAdmin() : false;
  const [mundo, setMundo] = React.useState(null);   // null = ainda não chegou
  const relogioMundo = React.useRef(0);
  const aoMudarMundo = React.useCallback((lugares) => {
    clearTimeout(relogioMundo.current);
    relogioMundo.current = setTimeout(() => {
      const salvar = banco.salvarMundo || ((l) => window.salvarNoMundo('mapa', { slug: 'mundo', lugares: l }));
      Promise.resolve(salvar(lugares)).catch(() => motor.current && motor.current.falhou());
    }, 500);
  }, [banco]);
  React.useEffect(() => {
    let vivo = true;
    const ler = banco.carregarMundo || (() => (window.carregarCatalogoMundo ? window.carregarCatalogoMundo() : Promise.resolve(null))
      .then(() => { const m = (window.mundoVigente ? window.mundoVigente('mapa') : []).find((e) => e.slug === 'mundo'); return (m && m.lugares) || []; }));
    Promise.resolve(ler()).then((l) => { if (vivo) setMundo(Array.isArray(l) ? l : []); }).catch(() => { if (vivo) setMundo([]); });
    return () => { vivo = false; };
  }, [banco]);
  React.useEffect(() => { if (motor.current && mundo) motor.current.receberMundo(mundo); }, [mundo, estado]);

  React.useEffect(() => {
    if (!semMesa || !raiz.current) return undefined;
    motor.current = criarMotorMapa(raiz.current, { papel: ehImperador ? 'mestre' : 'jogador', semMesa: true, en, base: base || mapaBaseLadrilhos(),
      imperador: ehImperador, mundo: mundo || [], aoMudarMundo: ehImperador ? aoMudarMundo : null,
      mesa: null, marcas: [], gente: [], aoEscolherAchado: () => setQuery(''), aoAbrirCidade: setFichaAberta });
    setEstado('pronto');
    return () => { if (motor.current) { motor.current.destruir(); motor.current = null; } };
  }, [semMesa, en, base, ehImperador]);

  React.useEffect(() => {
    if (semMesa) return undefined;
    let vivo = true, desligar = null, relogio = 0, relogioMarcas = 0, ultimo = '';
    setEstado('carregando');
    banco.carregar({ historiaId, pj, mestre }).then((d) => {
      if (!vivo || !raiz.current) return;
      motor.current = criarMotorMapa(raiz.current, {
        papel: mestre ? 'mestre' : 'jogador', en, base: base || mapaBaseLadrilhos(),
        mesa: d.mesa, marcas: d.marcas, gente: d.gente,
        imperador: ehImperador && mestre, mundo: mundo || [], aoMudarMundo: (ehImperador && mestre) ? aoMudarMundo : null,
        /* Grava com folga: arrastar um ponto dispara dezenas de mudanças. */
        aoMudarMesa: mestre ? (dados) => {
          ultimo = JSON.stringify(dados);
          clearTimeout(relogio);
          relogio = setTimeout(() => banco.salvarMesa(historiaId, dados).catch(() => motor.current && motor.current.falhou()), 500);
        } : null,
        aoMudarMarcas: (!mestre && pjId) ? (marcas) => {
          clearTimeout(relogioMarcas);
          relogioMarcas = setTimeout(() => banco.salvarMarcas(pjId, marcas).catch(() => motor.current && motor.current.falhou()), 500);
        } : null,
        aoEscolherAchado: () => setQuery(''), aoAbrirCidade: setFichaAberta,
      });
      setEstado('pronto');
      /* O eco da própria gravação volta pelo tempo real: igual ao que saiu, ignora. */
      desligar = banco.assinar(historiaId, (dados) => {
        if (JSON.stringify(dados) === ultimo) return;
        if (motor.current) motor.current.receber(dados);
      });
    }).catch(() => { if (vivo) setEstado('erro'); });
    return () => {
      vivo = false; clearTimeout(relogio); clearTimeout(relogioMarcas);
      if (desligar) desligar();
      if (motor.current) { motor.current.destruir(); motor.current = null; }
    };
  }, [historiaId, pjId, mestre, en, banco, base, semMesa, ehImperador]);

  React.useEffect(() => { if (motor.current) motor.current.buscar(query); }, [query, estado]);

  /* As cidades cadastradas vêm à parte: o mapa não espera por elas, e uma
     falha aqui só deixa o passe sem a ficha. */
  React.useEffect(() => {
    let vivo = true;
    if (!banco.catalogo) return undefined;
    banco.catalogo({ mestre: mestre || ehImperador, pj }).then((c) => { if (vivo) setCatalogo(c); }).catch(() => {});
    return () => { vivo = false; };
  }, [banco, mestre, pjId, ehImperador]);
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
    <button type="button" className="mp-ferr so-ico" data-zoom={qual} aria-label={rot}><i className={'ti ' + ico} aria-hidden="true" /></button>
  );
  return (
    <div className="pjs diario-pagina mp-pagina">
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
            aria-label={en ? 'Map of eastern Tagmar. Drag to move, scroll to zoom; arrow keys and plus/minus also work.'
                           : 'Mapa de Tagmar oriental. Arraste para mover, role para aproximar; setas e as teclas mais e menos também funcionam.'}>
            <div className="mp-mundo" data-el="mundo">
              <div className="mp-arte" data-el="arte" />
              <svg className="mp-linhas" data-el="linhas" viewBox="0 0 1200 2000" aria-hidden="true" />
              <div data-el="marcadores" />
            </div>
            <div className="mp-barra" data-el="barra">
              <div className="mp-grupo" data-el="ferramentas" />
              <div className="mp-grupo">
                {zoom('menos', 'ti-minus', en ? 'Zoom out' : 'Afastar')}
                {zoom('mais', 'ti-plus', en ? 'Zoom in' : 'Aproximar')}
                {zoom('tudo', 'ti-arrows-maximize', en ? 'See the whole map' : 'Ver o mapa inteiro')}
              </div>
            </div>
            <div className="mp-aviso" data-el="aviso" />
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
  mapaDist, mapaKm, mapaComprimento, mapaProjeta, mapaJornada,
  MAPA_PINTADAS, MAPA_KM, MAPA_KM_DIA_A_PE,
});
