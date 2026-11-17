/* ============================================================
   dado-3d.jsx — o d20 e o d10 em 3D que rolam por cima da tela (17/11/2026)
   ============================================================
   Usuário: "quero melhorar o estilo e efeito do dado virtual, quero algo
   profissional, digno de um jogo profissional de verdade, como se o dado
   rolasse na tela com um efeito 3d, com uma série de movimentos diferentes."
   Aprovado no artifact "Bandeja de Dados", depois: "não quero fundo. O fundo
   será a tela que o jogador está vendo. Aumente um pouco o tamanho do número",
   "Ao clicar em rolar, agora vai aparecer o dado novo na tela" e "Pode aplicar
   a animação do dado de 10 faces também."

   COMO FUNCIONA
   • Uma camada fixa, transparente e sem clique (z-index acima das janelas de
     rolagem) com o three.js (window.THREE, do bootstrap-globals) e a física do
     cannon-es, que só é baixada na primeira rolagem (import dinâmico).
   • Dois dados: o d20 (icosaedro) e o d10 (trapezoedro pentagonal, dez faces
     em pipa). Nos dois as faces opostas são paralelas — sempre há uma face
     para cima — e somam N+1.
   • A física roda o lançamento INTEIRO antes de mostrar (estilos rasteiro,
     alto, com giro e quicado; a borda de entrada e a força sorteadas), e as
     bordas da tela são as paredes.
   • O NÚMERO É DA MESA: quem chama passa o valor (o sorteio do motor ou o que
     o jogador informou no dado real), e o dado gira a numeração por uma das
     rotações de simetria do sólido para a face desse valor ser a que ficou
     para cima. Nada na regra muda — só o jeito de mostrar.
   • A cor é a da paleta; a luz é de três pontos; o 1 e o máximo rolam o fim em
     câmera lenta; ao parar, a câmera dá zoom no resultado e espera o clique.

   QUANDO NÃO APARECE (e o DadoD20/DadoD10 cai no dado 2D de sempre): sem
   WebGL, com "reduzir movimento" no sistema, nos testes (jsdom) e com a mesa
   jogando sozinha (html[data-mesa-auto], quando as janelas nem aparecem).

   window.Dado3D = { disponivel(), preparar(), rolar({ valor, faces }) → Promise, limpar() }
   Quem chama: o DadoD20 (dado-d20.jsx) e o DadoD10 (dado-d10.jsx).
   ============================================================ */

const DADO3D_ESTILOS = [
  { nome: 'rasteiro', h: [1.3, 2.0], vy: [0, 1.5], vel: [14, 18], giro: [10, 18] },
  { nome: 'alto', h: [5, 7], vy: [3, 6], vel: [7, 10], giro: [8, 14] },
  { nome: 'com giro', h: [2.5, 4], vy: [1, 3], vel: [9, 13], giro: [26, 36] },
  { nome: 'quicado', h: [3, 4.5], vy: [-5, -2.5], vel: [10, 13], giro: [12, 20] },
];

function dado3dDisponivel() {
  if (typeof window === 'undefined' || !window.THREE) return false;
  if (/jsdom/i.test((navigator && navigator.userAgent) || '')) return false;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (document.documentElement.hasAttribute('data-mesa-auto')) return false;
  if (dado3dDisponivel._webgl == null) {
    try {
      const c = document.createElement('canvas');
      dado3dDisponivel._webgl = !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) { dado3dDisponivel._webgl = false; }
  }
  return dado3dDisponivel._webgl && !dado3dDisponivel._falhou;
}

let _dado3dCena = null;          // a cena, montada uma vez
let _dado3dCarga = null;         // a promessa da carga (cannon-es + ambiente)

function dado3dPreparar() {
  if (!dado3dDisponivel()) return Promise.resolve(null);
  if (_dado3dCarga) return _dado3dCarga;
  _dado3dCarga = Promise.all([
    import('cannon-es'),
    import('three/addons/environments/RoomEnvironment.js'),
    document.fonts ? Promise.race([document.fonts.load('700 160px "Cinzel"'), new Promise((r) => setTimeout(r, 2500))]).catch(() => null) : null,
  ]).then(([CANNON, amb]) => {
    _dado3dCena = dado3dMontar(window.THREE, CANNON, amb.RoomEnvironment);
    return _dado3dCena;
  }).catch((e) => {
    console.warn('[dado-3d] sem o dado 3D, fica o 2D:', e && e.message);
    dado3dDisponivel._falhou = true;
    return null;
  });
  return _dado3dCarga;
}

/* ── Os sólidos: vértices e faces (polígonos em sentido anti-horário visto de
   fora). Em toda face, o vértice 0 e o 2 dão o eixo em que o número se apoia. */
function dado3dSolidoD20(THREE) {
  const ico = new THREE.IcosahedronGeometry(1, 0);
  const pa = ico.attributes.position;
  const verts = [];
  const idxDe = (v) => { for (let i = 0; i < verts.length; i++) if (verts[i].distanceToSquared(v) < 1e-6) return i; verts.push(v.clone()); return verts.length - 1; };
  const faces = [];
  for (let f = 0; f < pa.count / 3; f++) {
    let ids = [0, 1, 2].map((k) => idxDe(new THREE.Vector3().fromBufferAttribute(pa, f * 3 + k)));
    const [a, b, c] = ids.map((k) => verts[k]);
    if (b.clone().sub(a).cross(c.clone().sub(a)).dot(a.clone().add(b).add(c)) < 0) ids = [ids[0], ids[2], ids[1]];
    faces.push(ids);
  }
  return { verts, faces };
}
/* O d10: trapezoedro pentagonal. Anéis de cinco vértices a ±z0, o de baixo
   girado 36°, e os dois ápices a ±h. Para a pipa ser plana, h = z0·(1+cos36°)/(1−cos36°). */
function dado3dSolidoD10(THREE) {
  const c36 = Math.cos(Math.PI / 5);
  const z0 = 0.105, h = z0 * (1 + c36) / (1 - c36), R = 1.0;
  const verts = [new THREE.Vector3(0, h, 0), new THREE.Vector3(0, -h, 0)];
  const U = [], L = [];
  for (let k = 0; k < 5; k++) {
    const a = (2 * Math.PI * k) / 5, b = a + Math.PI / 5;
    U.push(verts.push(new THREE.Vector3(R * Math.cos(a), z0, R * Math.sin(a))) - 1);
    L.push(verts.push(new THREE.Vector3(R * Math.cos(b), -z0, R * Math.sin(b))) - 1);
  }
  const faces = [];
  const orientar = (f) => {
    const [a, b, c] = f.map((k) => verts[k]);
    const cen = f.reduce((s, k) => s.add(verts[k]), new THREE.Vector3());
    // Inverte mantendo o ápice no 0 e o vértice oposto no 2.
    return b.clone().sub(a).cross(c.clone().sub(a)).dot(cen) < 0 ? [f[0], f[3], f[2], f[1]] : f;
  };
  for (let k = 0; k < 5; k++) {
    faces.push(orientar([0, U[k], L[k], U[(k + 1) % 5]]));
    faces.push(orientar([1, L[k], U[(k + 1) % 5], L[(k + 1) % 5]]));
  }
  return { verts, faces };
}

function dado3dMontar(THREE, CANNON, RoomEnvironment) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true });

  /* ── O desenho das faces (comum aos dois dados) ── */
  const contornoPoligono = (x, pts, encolhe) => {
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    x.beginPath();
    pts.forEach(([px, py], i) => { const qx = cx + (px - cx) * encolhe, qy = cy + (py - cy) * encolhe; i ? x.lineTo(qx, qy) : x.moveTo(qx, qy); });
    x.closePath();
  };
  // `traco` > 0: desenha só o contorno (a borda escura que separa o número do corpo).
  const desenharNumero = (x, n, lay, cor, traco = 0) => {
    x.font = `700 ${lay.tam}px "Cinzel", "Times New Roman", serif`;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    const { nx, ny } = lay;
    // Dois algarismos não podem passar das arestas: aperta só se precisar.
    const w = x.measureText(String(n)).width, max = lay.maxL;
    const ww = Math.min(w, max), sub = lay.tam * 0.4, alt = lay.tam * 0.07;
    x.save();
    if (w > max) { x.translate(nx, ny); x.scale(max / w, 1); x.translate(-nx, -ny); }
    if (traco) {
      x.strokeStyle = cor; x.lineWidth = traco; x.lineJoin = 'round'; x.strokeText(String(n), nx, ny);
      if (n === 6 || n === 9) x.strokeRect(nx - ww * 0.32, ny + sub, ww * 0.64, alt);
    } else {
      x.fillStyle = cor; x.fillText(String(n), nx, ny);
      // O traço do 6 e do 9, como nos dados de verdade.
      if (n === 6 || n === 9) x.fillRect(nx - ww * 0.32, ny + sub, ww * 0.64, alt);
    }
    x.restore();
  };
  const texturaFace = (n, cor, lay) => {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(240, 300, 20, 256, 280, 380);
    g.addColorStop(0, cor.corpo0); g.addColorStop(0.55, cor.corpo1); g.addColorStop(1, cor.corpo2);
    x.fillStyle = g; x.fillRect(0, 0, 512, 512);
    x.globalCompositeOperation = 'overlay';
    for (let i = 0; i < 9; i++) {
      x.strokeStyle = `rgba(${cor.veioRgb}, ${0.05 + Math.random() * 0.07})`;
      x.lineWidth = 6 + Math.random() * 18;
      x.beginPath(); x.moveTo(Math.random() * 512, Math.random() * 512);
      x.bezierCurveTo(Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512);
      x.stroke();
    }
    x.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(${cor.veioRgb}, ${Math.random() * 0.05})`; x.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
    contornoPoligono(x, lay.pts, 0.965); x.strokeStyle = `rgba(${cor.veioRgb}, 0.32)`; x.lineWidth = 5; x.stroke();
    contornoPoligono(x, lay.pts, 0.90); x.strokeStyle = 'rgba(30, 14, 2, 0.35)'; x.lineWidth = 3; x.stroke();
    x.save(); x.translate(3, 5); desenharNumero(x, n, lay, 'rgba(0, 0, 0, 0.6)'); x.restore();
    desenharNumero(x, n, lay, cor.contorno, Math.round(lay.tam * 0.075));
    const og = x.createLinearGradient(0, lay.ny - lay.tam * 0.5, 0, lay.ny + lay.tam * 0.6);
    og.addColorStop(0, cor.num0); og.addColorStop(0.5, cor.num1); og.addColorStop(1, cor.num2);
    desenharNumero(x, n, lay, og);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const e = document.createElement('canvas'); e.width = e.height = 512;
    const ex = e.getContext('2d'); ex.fillStyle = '#000'; ex.fillRect(0, 0, 512, 512);
    ex.shadowColor = '#fff'; ex.shadowBlur = 18; desenharNumero(ex, n, lay, '#fff');
    const te = new THREE.CanvasTexture(e); te.colorSpace = THREE.SRGBColorSpace;
    return [t, te];
  };

  /* A planificação de uma face no UV: o polígono real, deitado no plano dele,
     com o eixo vértice 0 → vértice 2 em pé, encaixado no quadrado da textura.
     Todas as faces de um dado são iguais, então uma planificação serve a todas. */
  const planificar = (verts, face, normal) => {
    const p0 = verts[face[0]];
    // Triângulo (d20): em pé, com o vértice 0 em cima e a aresta oposta embaixo.
    // Pipa (d10): do ápice (0) para o vértice oposto (2).
    const u = face.length === 3
      ? p0.clone().sub(verts[face[1]].clone().add(verts[face[2]]).multiplyScalar(0.5)).normalize()
      : verts[face[2]].clone().sub(p0).normalize();
    const e1 = u.clone().cross(normal);
    const pts2 = face.map((k) => { const d = verts[k].clone().sub(p0); return [d.dot(e1), d.dot(u)]; });
    const xs = pts2.map((p) => p[0]), ys = pts2.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const esc = 0.86 / Math.max(maxX - minX, maxY - minY);
    const ox = 0.5 - ((minX + maxX) / 2) * esc, oy = 0.5 - ((minY + maxY) / 2) * esc;
    const uvs = pts2.map(([px, py]) => [ox + px * esc, oy + py * esc]);
    return { uvs, pts: uvs.map(([a, b]) => [a * 512, (1 - b) * 512]) };
  };

  /* ── A camada: transparente, sem clique, acima das janelas de rolagem ── */
  // Uma camada só: ao recarregar o módulo (Vite), a cena velha sai da tela.
  document.querySelectorAll('.dado-3d-camada').forEach((el) => el.remove());
  const camada = document.createElement('div');
  camada.className = 'dado-3d-camada';
  camada.setAttribute('aria-hidden', 'true');
  Object.assign(camada.style, { position: 'fixed', inset: '0', zIndex: '9800', pointerEvents: 'none', display: 'none' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.78;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  Object.assign(renderer.domElement.style, { display: 'block', width: '100%', height: '100%' });
  camada.appendChild(renderer.domElement);
  // O convite para seguir, embaixo do dado ampliado (ver esperarClique).
  const aviso = document.createElement('div');
  aviso.textContent = 'Toque para continuar';
  Object.assign(aviso.style, {
    position: 'absolute', left: '0', right: '0', bottom: 'max(10vh, 56px)', textAlign: 'center',
    font: '700 15px/1.2 "Alegreya Sans", "Segoe UI", system-ui, sans-serif', letterSpacing: '.12em', textTransform: 'uppercase',
    color: 'var(--pal-tinta-2, #CDBF9F)', textShadow: '0 2px 10px rgba(0, 0, 0, .8)',
    opacity: '0', transition: 'opacity .4s ease', pointerEvents: 'none',
  });
  camada.appendChild(aviso);
  document.body.appendChild(camada);

  const cena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  cena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  /* ILUMINAÇÃO EM TRÊS PONTOS (17/11/2026, usuário: "quero uma iluminação
     melhor no dado"): a principal, baixa e da esquerda, faz a sombra; o
     preenchimento, fraco e do outro lado, abre as faces que ficavam pretas; e
     o contorno, por trás, risca as arestas com a cor viva da paleta — é ele
     que solta o dado da tela escura. As cores vêm da paleta (aplicarPaleta). */
  const hemi = new THREE.HemisphereLight('#FFE2B0', '#120D06', 0.3); cena.add(hemi);
  const sol = new THREE.DirectionalLight('#FFE6C0', 1.7);
  sol.castShadow = true; sol.shadow.mapSize.set(1024, 1024); sol.shadow.radius = 5; sol.shadow.bias = -0.0004;
  cena.add(sol); cena.add(sol.target);
  const preench = new THREE.DirectionalLight('#F1E6CF', 0.35); cena.add(preench); cena.add(preench.target);
  const contorno = new THREE.DirectionalLight('#E0BE68', 1.5); cena.add(contorno); cena.add(contorno.target);
  const clarao = new THREE.PointLight('#FFE7A8', 0, 8, 2); cena.add(clarao);
  // Só a sombra cai na tela: o chão é invisível.
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.42 }));
  chao.rotation.x = -Math.PI / 2; chao.receiveShadow = true; cena.add(chao);

  /* A COR DO DADO É A DA PALETA (17/11/2026, usuário: "Eu quero que a cor do
     dado mude conforme a paleta"). O corpo vai do --ouro-2 ao --ouro-3 (o
     âmbar no Crezir, o aço no Crizagom, o lavanda no Ganis, o cobre na Maira)
     e o número é o --pal-vivo, clareado no alto. A face do 1 acende na brasa. */
  const lerCores = () => {
    const cs = getComputedStyle(document.documentElement);
    const v = (k, d) => (cs.getPropertyValue(k) || '').trim() || d;
    const C = (h) => new THREE.Color(h);
    const mix = (a, b, t) => C(a).lerp(C(b), t);
    const ouro2 = v('--ouro-2', '#B8702E'), ouro3 = v('--ouro-3', '#7A5E2A');
    const vivo = v('--pal-vivo', '#E0BE68'), tinta = v('--pal-tinta', '#F1E6CF');
    const veio = mix(vivo, '#ffffff', 0.4);
    return {
      chave: document.documentElement.dataset.paleta || '',
      // Corpo escuro e número claro com contorno: o contraste não pode depender da luz
      // (17/11/2026, usuário: "não consigo ver a cor do número, acho que o problema é o contraste").
      corpo0: mix(ouro2, ouro3, 0.35).getStyle(), corpo1: mix(ouro3, '#000000', 0.3).getStyle(), corpo2: mix(ouro3, '#000000', 0.68).getStyle(),
      contorno: mix(ouro3, '#000000', 0.78).getStyle(),
      veioRgb: (() => { const h = veio.getHex(); return [(h >> 16) & 255, (h >> 8) & 255, h & 255].join(', '); })(),
      num0: mix(vivo, '#ffffff', 0.55).getStyle(), num1: mix(vivo, '#ffffff', 0.15).getStyle(), num2: C(vivo).getStyle(),
      vivo, tinta, alerta: v('--pal-alerta', '#E8836A'), fundo: v('--p-fundo', '#120D06'),
    };
  };
  let corAtual = lerCores();
  const mixHex = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
  const aplicarLuzes = () => {
    hemi.color.set(mixHex(corAtual.tinta, '#FFE2B0', 0.5)); hemi.groundColor.set(corAtual.fundo);
    preench.color.set(corAtual.tinta);
    contorno.color.set(corAtual.vivo);
  };
  aplicarLuzes();

  /* ── Um dado montado: malha, materiais, numeração e corpo físico ── */
  const montarDado = (solido, max, layout) => {
    const { verts, faces } = solido;
    const normais = faces.map((f) => { const [a, b, c] = f.map((k) => verts[k]); return b.clone().sub(a).cross(c.clone().sub(a)).normalize(); });
    const numeroDaFace = new Array(faces.length).fill(0);
    let prox = 1;
    for (let i = 0; i < faces.length; i++) {
      if (numeroDaFace[i]) continue;
      const j = normais.findIndex((n) => n.dot(normais[i]) < -0.99);
      numeroDaFace[i] = prox; numeroDaFace[j] = max + 1 - prox; prox++;
    }
    const plano = planificar(verts, faces[0], normais[0]);
    const lay = { pts: plano.pts, ...layout(plano.pts) };
    const geo = new THREE.BufferGeometry();
    const P = [], N = [], UV = [];
    let ini = 0;
    faces.forEach((f, i) => {
      const n = normais[i];
      // Em leque a partir do vértice 0: um triângulo no d20, dois na pipa do d10.
      for (let t = 1; t < f.length - 1; t++) {
        [0, t, t + 1].forEach((j) => { const v = verts[f[j]]; P.push(v.x, v.y, v.z); N.push(n.x, n.y, n.z); UV.push(...plano.uvs[j]); });
      }
      const qtd = (f.length - 2) * 3;
      geo.addGroup(ini, qtd, i); ini += qtd;
    });
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
    const mats = faces.map((_, i) => {
      const [t, te] = texturaFace(numeroDaFace[i], corAtual, lay);
      // Sem verniz (clearcoat): no three 0.184 ele deixava um véu claro e desbotava a cor,
      // e olhando de cima a face vencedora espelhava as luzes de teto. O brilho vem da superfície lisa.
      return new THREE.MeshPhysicalMaterial({
        map: t, emissiveMap: te, emissive: new THREE.Color(corAtual.vivo), emissiveIntensity: 0,
        roughness: 0.46, metalness: 0.05, envMapIntensity: 0.1,
      });
    });
    const malha = new THREE.Mesh(geo, mats);
    malha.castShadow = true; malha.visible = false;
    cena.add(malha);
    const forma = new CANNON.ConvexPolyhedron({ vertices: verts.map((v) => new CANNON.Vec3(v.x, v.y, v.z)), faces: faces.map((f) => [...f]) });
    return { max, verts, faces, normais, numeroDaFace, lay, malha, mats, forma,
      faceDoNumero: (n) => numeroDaFace.indexOf(n) };
  };
  const dados = {
    // d20: o número no centro do triângulo, um pouco abaixo (o centro óptico).
    20: montarDado(dado3dSolidoD20(THREE), 20, (pts) => {
      const cy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
      return { nx: 256, ny: cy + 14, tam: 160, maxL: 236 };
    }),
    // d10: o número na parte larga da pipa, entre as pontas laterais e o ápice.
    10: montarDado(dado3dSolidoD10(THREE), 10, (pts) => {
      const ladoY = (pts[1][1] + pts[3][1]) / 2, largura = Math.abs(pts[3][0] - pts[1][0]);
      const ny = ladoY + (pts[0][1] - ladoY) * 0.22;
      return { nx: (pts[0][0] + pts[2][0]) / 2, ny, tam: Math.round(largura * 0.42), maxL: largura * 0.5 };
    }),
  };
  let atual = dados[20];

  const aplicarPaleta = () => {
    const nova = lerCores();
    if (nova.chave === corAtual.chave) return;
    corAtual = nova;
    Object.values(dados).forEach((d) => d.mats.forEach((m, i) => {
      if (m.map) m.map.dispose();
      if (m.emissiveMap) m.emissiveMap.dispose();
      const [t, te] = texturaFace(d.numeroDaFace[i], corAtual, d.lay);
      m.map = t; m.emissiveMap = te; m.needsUpdate = true;
    }));
    aplicarLuzes();
  };

  /* ── A câmera e as paredes acompanham a janela ── */
  const DIR_CAM = new THREE.Vector3(0, 1, 0.3).normalize();
  const DIR_FIM = new THREE.Vector3(0, 1, 0.06).normalize();
  const camBase = { pos: new THREE.Vector3(), olhar: new THREE.Vector3() };
  const camOlhar = new THREE.Vector3();
  let distBase = 22, MEIA_L = 6, MEIA_P = 4, camAnim = null;
  const ajustar = () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    // O dado tem o mesmo tamanho na tela em qualquer janela (~1/7 da altura).
    distBase = THREE.MathUtils.clamp(h / 34, 12, 34);
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const meiaAlt = distBase * tan, meiaLarg = meiaAlt * camera.aspect;
    MEIA_L = Math.max(2.5, meiaLarg - 1.4);
    MEIA_P = Math.max(2.5, meiaAlt - 1.2);
    camBase.pos.copy(DIR_CAM).multiplyScalar(distBase).add(camBase.olhar);
    const s = Math.max(meiaLarg, meiaAlt) + 3;
    Object.assign(sol.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 80 });
    sol.shadow.camera.updateProjectionMatrix();
    // Baixa, de lado: de cima ela estourava a face do resultado (a mais alta).
    sol.position.set(-15, 9, 8);
    preench.position.set(12, 7, 10);
    contorno.position.set(3, 8, -16);
    if (!camAnim) { camera.position.copy(camBase.pos); camOlhar.copy(camBase.olhar); camera.lookAt(camOlhar); }
  };
  window.addEventListener('resize', () => { ajustar(); acordar(); });
  ajustar();
  const suave = (k) => 1 - Math.pow(1 - k, 3);
  const moverCamera = (pos, olhar, dur) => {
    camAnim = { dePos: camera.position.clone(), paraPos: pos.clone(), deOlhar: camOlhar.clone(), paraOlhar: olhar.clone(), t0: performance.now(), dur };
    acordar();
  };

  /* ── A rotação de simetria que leva a face D sobre a face L ──
     A moldura de uma face: o eixo vértice 0 → 2, a normal e o terceiro. No d20
     qualquer giro cíclico do triângulo serve; no d10 só o que leva ápice em
     ápice — a conferência (todo vértice cai sobre um vértice) escolhe. */
  const moldura = (vs, nrm) => {
    const u = vs[2].clone().sub(vs[0]).normalize();
    return new THREE.Matrix4().makeBasis(u, nrm.clone().cross(u), nrm);
  };
  const rotacaoEntre = (d, D, L) => {
    const fd = d.faces[D], fl = d.faces[L];
    const inv = moldura(fd.map((k) => d.verts[k]), d.normais[D]).transpose();
    for (let s = 0; s < fl.length; s++) {
      const gir = fl.map((_, j) => fl[(j + s) % fl.length]);
      const M = moldura(gir.map((k) => d.verts[k]), d.normais[L]).multiply(inv);
      if (d.verts.every((v) => { const w = v.clone().applyMatrix4(M); return d.verts.some((q) => q.distanceToSquared(w) < 1e-4); })) {
        return new THREE.Quaternion().setFromRotationMatrix(M);
      }
    }
    return new THREE.Quaternion();
  };

  /* ── A física: o lançamento inteiro, antes de mostrar ── */
  const sorteio = ([a, b]) => a + Math.random() * (b - a);
  const simular = (d) => {
    const mundo = new CANNON.World({ gravity: new CANNON.Vec3(0, -32, 0) });
    mundo.allowSleep = true;
    const mDado = new CANNON.Material('dado'), mMesa = new CANNON.Material('mesa'), mBorda = new CANNON.Material('borda');
    mundo.addContactMaterial(new CANNON.ContactMaterial(mDado, mMesa, { friction: 0.22, restitution: 0.42 }));
    mundo.addContactMaterial(new CANNON.ContactMaterial(mDado, mBorda, { friction: 0.05, restitution: 0.62 }));
    const plano = (mat, pos, euler) => {
      const b = new CANNON.Body({ mass: 0, material: mat, shape: new CANNON.Plane() });
      b.position.set(...pos); b.quaternion.setFromEuler(...euler); mundo.addBody(b);
    };
    plano(mMesa, [0, 0, 0], [-Math.PI / 2, 0, 0]);
    plano(mBorda, [-MEIA_L, 0, 0], [0, Math.PI / 2, 0]);
    plano(mBorda, [MEIA_L, 0, 0], [0, -Math.PI / 2, 0]);
    plano(mBorda, [0, 0, MEIA_P], [0, Math.PI, 0]);
    plano(mBorda, [0, 0, -MEIA_P], [0, 0, 0]);
    const est = DADO3D_ESTILOS[Math.floor(Math.random() * DADO3D_ESTILOS.length)];
    const corpo = new CANNON.Body({ mass: 1, material: mDado, shape: d.forma, linearDamping: 0.08, angularDamping: 0.1 });
    corpo.sleepSpeedLimit = 0.3; corpo.sleepTimeLimit = 0.25;
    const r = () => Math.random() * 2 - 1;
    const mL = MEIA_L - 1.3, mP = MEIA_P - 1.3;
    const pos = [[-mL, r() * mP], [mL, r() * mP], [r() * mL, -mP], [r() * mL, mP]][Math.floor(Math.random() * 4)];
    corpo.position.set(pos[0], sorteio(est.h), pos[1]);
    const dir = new CANNON.Vec3(r() * MEIA_L * 0.3 - pos[0], 0, r() * MEIA_P * 0.3 - pos[1]); dir.normalize();
    const v = sorteio(est.vel) * THREE.MathUtils.clamp(MEIA_L / 6, 0.8, 1.6);
    corpo.velocity.set(dir.x * v, sorteio(est.vy), dir.z * v);
    const eixo = new CANNON.Vec3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5); eixo.normalize();
    const g = sorteio(est.giro); corpo.angularVelocity.set(eixo.x * g, eixo.y * g, eixo.z * g);
    corpo.quaternion.setFromEuler(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
    mundo.addBody(corpo);
    const quadros = [], batidas = [];
    corpo.addEventListener('collide', (e) => {
      const vi = Math.abs(e.contact.getImpactVelocityAlongNormal());
      if (vi > 1.0) batidas.push({ q: quadros.length, v: vi, borda: e.body.material === mBorda });
    });
    // Passo de 1/60 s, até 7 s de rolagem: leve o bastante para não travar a tela.
    for (let i = 0; i < 60 * 7; i++) {
      mundo.step(1 / 60);
      quadros.push({ p: new THREE.Vector3(corpo.position.x, corpo.position.y, corpo.position.z),
        q: new THREE.Quaternion(corpo.quaternion.x, corpo.quaternion.y, corpo.quaternion.z, corpo.quaternion.w) });
      if (corpo.sleepState === CANNON.Body.SLEEPING) break;
    }
    const qf = quadros[quadros.length - 1].q;
    let melhor = 0, my = -2;
    d.normais.forEach((n, i) => { const y = n.clone().applyQuaternion(qf).y; if (y > my) { my = y; melhor = i; } });
    return { quadros, batidas, pousou: melhor, deFace: my };
  };

  /* ── O estalo da resina em cada batida ── */
  let audio = null;
  const estalo = (forca, borda) => {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const dur = 0.07 + Math.min(forca, 14) * 0.004;
      const buf = audio.createBuffer(1, Math.ceil(audio.sampleRate * dur), audio.sampleRate);
      const dd = buf.getChannelData(0);
      for (let i = 0; i < dd.length; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / dd.length, 4);
      const src = audio.createBufferSource(); src.buffer = buf;
      const bp = audio.createBiquadFilter(); bp.type = 'bandpass';
      bp.frequency.value = (borda ? 1700 : 2600) + Math.random() * 900; bp.Q.value = 2.2;
      const gn = audio.createGain(); gn.gain.value = Math.min(0.6, 0.06 + forca * 0.035);
      src.connect(bp).connect(gn).connect(audio.destination); src.start(audio.currentTime);
    } catch (e) { /* sem áudio, segue em silêncio */ }
  };

  /* ── O laço: só desenha enquanto algo se mexe ──
     Pelo requestAnimationFrame e, de reserva, por um temporizador: com a janela
     em segundo plano o rAF para, e a rolagem nunca terminava. */
  let rolagem = null, brilho = null, rafId = null, reservaId = null;
  const limparAgenda = () => {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (reservaId) { clearTimeout(reservaId); reservaId = null; }
  };
  function acordar() {
    if (rafId || reservaId) return;
    const vai = () => { limparAgenda(); quadro(performance.now()); };
    rafId = requestAnimationFrame(vai);
    reservaId = setTimeout(vai, 120);
  }
  const concluir = () => {
    const { sim, valor, resolver } = rolagem;
    const fim = sim.quadros[sim.quadros.length - 1];
    const m = atual.mats[atual.faceDoNumero(valor)];
    m.emissive.set(valor === 1 ? corAtual.alerta : corAtual.vivo);
    brilho = { m, t0: performance.now(), forte: valor === atual.max };
    if (valor === atual.max) clarao.position.set(fim.p.x, 2.2, fim.p.z);
    /* O ZOOM NO RESULTADO (17/11/2026, usuário: "Quando o dado parar de rolar,
       dê um zoom para mostrar o resultado e só avance depois que o jogador
       clicar"). A câmera desce sobre a face vencedora e a rolagem fica parada
       ali; o clique (ou Enter, espaço, Esc) afasta a câmera e só então entrega
       o valor — é aí que a janela mostra o resultado e os botões. */
    const perto = fim.p.clone().setY(0);
    moverCamera(perto.clone().add(DIR_FIM.clone().multiplyScalar(distBase * 0.36)), perto, 1000);
    rolagem = null;
    esperarClique(() => {
      moverCamera(perto.clone().add(DIR_FIM.clone().multiplyScalar(distBase * 0.85)), perto, 450);
      resolver(valor);
    });
  };
  let espera = null;
  const pararEspera = () => {
    if (!espera) return;
    camada.removeEventListener('pointerdown', espera.clique);
    window.removeEventListener('keydown', espera.tecla, true);
    clearTimeout(espera.avisoId);
    aviso.style.opacity = '0';
    camada.style.pointerEvents = 'none'; camada.style.cursor = '';
    espera = null;
  };
  const esperarClique = (seguir) => {
    pararEspera();
    const vai = () => { pararEspera(); seguir(); };
    const clique = (e) => { e.preventDefault(); e.stopPropagation(); vai(); };
    // Na fase de captura: a tecla não chega à janela de baixo (o Esc a fecharia).
    const tecla = (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); vai(); }
    };
    espera = { clique, tecla, avisoId: setTimeout(() => { aviso.style.opacity = '1'; }, 900) };
    // A camada passa a receber o clique só agora: enquanto o dado rola, a tela segue clicável.
    camada.style.pointerEvents = 'auto'; camada.style.cursor = 'pointer';
    camada.addEventListener('pointerdown', clique);
    window.addEventListener('keydown', tecla, true);
  };
  function quadro(agora) {
    if (rolagem) {
      const { sim, R } = rolagem;
      const n = sim.quadros.length - 1;
      /* CÂMERA LENTA NO 1 E NO MÁXIMO (17/11/2026, usuário: "Sempre que o dado
         cair 1 ou 20, ele vai rolar em câmera lenta"): o lançamento sai no ritmo
         de sempre e, no último segundo e pouco antes de parar, desacelera até
         28% — o suspense fica no momento que decide. No d10, o 1 e o 10. */
      let vel = 1;
      if (rolagem.lenta) {
        const ini = Math.max(0, n - 80);
        if (rolagem.f > ini) vel = 1 - 0.72 * Math.min(1, (rolagem.f - ini) / 20);
      }
      rolagem.f += ((agora - rolagem.ult) / 1000) * 60 * vel;
      rolagem.ult = agora;
      const f = rolagem.f;
      const malha = atual.malha;
      if (f >= n) {
        const ult = sim.quadros[n];
        malha.position.copy(ult.p); malha.quaternion.copy(ult.q.clone().multiply(R));
        concluir();
      } else {
        const i = Math.floor(f), k = f - i;
        const a = sim.quadros[i], b = sim.quadros[i + 1];
        malha.position.lerpVectors(a.p, b.p, k);
        malha.quaternion.copy(a.q.clone().slerp(b.q, k).multiply(R));
        while (rolagem.batida < sim.batidas.length && sim.batidas[rolagem.batida].q <= f) {
          const bt = sim.batidas[rolagem.batida++]; estalo(bt.v, bt.borda);
        }
      }
    }
    if (brilho) {
      const t = (agora - brilho.t0) / 1000;
      brilho.m.emissiveIntensity = t < 0.25 ? (t / 0.25) * 1.6 : 0.55 + 1.05 * Math.exp(-(t - 0.25) * 3);
      clarao.intensity = brilho.forte ? (t < 0.2 ? (t / 0.2) * 40 : 40 * Math.exp(-(t - 0.2) * 2.2)) : 0;
    }
    if (camAnim) {
      const k = suave(Math.min(1, (agora - camAnim.t0) / camAnim.dur));
      camera.position.lerpVectors(camAnim.dePos, camAnim.paraPos, k);
      camOlhar.lerpVectors(camAnim.deOlhar, camAnim.paraOlhar, k);
      camera.lookAt(camOlhar);
      if (k >= 1) camAnim = null;
    }
    renderer.render(cena, camera);
    const brilhando = brilho && (agora - brilho.t0) < 2500;
    if (rolagem || camAnim || brilhando) acordar();
  }

  return {
    rolar(valor, faces) {
      // Uma rolagem nova encerra a anterior (a promessa dela não fica pendurada).
      if (rolagem) { const r0 = rolagem.resolver; rolagem = null; r0(null); }
      pararEspera();
      aplicarPaleta();
      Object.values(dados).forEach((d) => { d.malha.visible = false; d.mats.forEach((m) => { m.emissiveIntensity = 0; }); });
      atual = dados[faces] || dados[20];
      let sim = null;
      for (let k = 0; k < 3; k++) { sim = simular(atual); if (sim.deFace > 0.97) break; }
      const R = rotacaoEntre(atual, atual.faceDoNumero(valor), sim.pousou);
      clarao.intensity = 0; brilho = null;
      camAnim = null;
      camera.position.copy(camBase.pos); camOlhar.copy(camBase.olhar); camera.lookAt(camOlhar);
      camada.style.display = 'block';
      atual.malha.visible = true;
      return new Promise((resolver) => {
        rolagem = { sim, R, valor, resolver, f: 0, ult: performance.now(), lenta: valor === 1 || valor === atual.max, batida: 0 };
        acordar();
      });
    },
    limpar() {
      pararEspera();
      if (rolagem) { const r0 = rolagem.resolver; rolagem = null; r0(null); }
      brilho = null; camAnim = null; limparAgenda();
      Object.values(dados).forEach((d) => { d.malha.visible = false; });
      clarao.intensity = 0;
      renderer.render(cena, camera);
      camada.style.display = 'none';
    },
  };
}

const Dado3D = {
  disponivel: dado3dDisponivel,
  preparar: dado3dPreparar,
  /* Rola até `valor` (1..faces; faces 20 ou 10). Resolve com o valor quando o
     jogador segue depois do zoom, ou com null quando não há 3D (quem chama cai
     no 2D) ou a rolagem foi encerrada. */
  async rolar({ valor, faces = 20 }) {
    const cena = await dado3dPreparar();
    if (!cena) return null;
    const f = faces === 10 ? 10 : 20;
    return cena.rolar(Math.max(1, Math.min(f, Math.round(valor))), f);
  },
  limpar() { if (_dado3dCena) _dado3dCena.limpar(); },
};

Object.assign(window, { Dado3D });
