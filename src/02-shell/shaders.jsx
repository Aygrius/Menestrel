/* ============================================================
   SHADERS — Animações WebGL de fundo (Three.js)
   ============================================================
   - ShaderAnimation:    shader de linhas radiais (tint amber/blood/cool).
                         Usado como camada secundária do hero.
   - MeshGradientShader: mesh gradient de ruído fbm em vermelho/preto
                         + grade de pontos em órbita. Camada primária
                         do hero.

   Depende de: THREE (global, carregado via CDN no index.html ANTES
   deste script) e React (idem).

   Carregar após 01-core/ no HTML. Componentes são expostos em
   window.ShaderAnimation / window.MeshGradientShader pra que outros
   blocos do app.jsx possam consumir via global.
   ============================================================ */

/* ============================== [03] Shader: Animation ============================== */

// Shader animado — adaptado de snippet shadcn pra Babel/React puro.
// Renderiza um shader de linhas radiais como canvas full-bleed de fundo.
// Uso: <ShaderAnimation tint="amber" opacity={0.5} />
function ShaderAnimation({ tint = 'amber', opacity = 0.5, blend = 'screen' }) {
  const containerRef = React.useRef(null);
  const stateRef = React.useRef(null);

  React.useEffect(() => {
    if (!containerRef.current || typeof THREE === 'undefined') return;
    const container = containerRef.current;

    const vertexShader = `
      void main() {
        gl_Position = vec4( position, 1.0 );
      }
    `;

    const fragmentShader = `
      #define TWO_PI 6.2831853072
      #define PI 3.14159265359
      precision highp float;
      uniform vec2 resolution;
      uniform float time;

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
        float t = time * 0.05;
        float lineWidth = 0.002;

        vec3 color = vec3(0.0);
        for (int j = 0; j < 3; j++) {
          for (int i = 0; i < 5; i++) {
            color[j] += lineWidth * float(i * i)
              / abs(fract(t - 0.01 * float(j) + float(i) * 0.01) * 5.0
                    - length(uv) + mod(uv.x + uv.y, 0.2));
          }
        }
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const camera = new THREE.Camera();
    camera.position.z = 1;

    const scene = new THREE.Scene();
    const geometry = new THREE.PlaneGeometry(2, 2);

    const uniforms = {
      time: { value: 1.0 },
      resolution: { value: new THREE.Vector2() },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      uniforms.resolution.value.x = renderer.domElement.width;
      uniforms.resolution.value.y = renderer.domElement.height;
    };
    onResize();
    window.addEventListener('resize', onResize, false);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      uniforms.time.value += 0.05;
      renderer.render(scene, camera);
    };
    animate();

    stateRef.current = { renderer, geometry, material, raf };

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  // Filtro de tonalidade puxa a saída do arco-íris pra paleta gótica oxblood.
  const filter = tint === 'blood'
    ? 'hue-rotate(-60deg) saturate(1.4) sepia(0.3) brightness(0.85) contrast(1.2)'
    : tint === 'amber'
      ? 'hue-rotate(-20deg) saturate(0.9) sepia(0.35) brightness(1.05) contrast(1.1)'
      : tint === 'cool'
        ? 'hue-rotate(180deg) saturate(0.85) brightness(0.95)'
        : 'none';

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity,
        mixBlendMode: blend,
        filter,
        zIndex: 0,
      }}
    />
  );
}

window.ShaderAnimation = ShaderAnimation;



/* ============================== [04] Shader: Mesh Gradient ============================== */

// Shader de mesh gradient + dot orbit — recria o efeito paper-design em GLSL puro.
// Single-shader de dois passes: mesh gradient de ruído fbm em vermelho/preto + grade de pontos animados por cima.
function MeshGradientShader({ opacity = 1.0, dots = true, paused = false }) {
  const containerRef = React.useRef(null);
  const stateRef = React.useRef(null);

  React.useEffect(() => {
    if (!containerRef.current || typeof THREE === 'undefined') return;
    const container = containerRef.current;

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform float uDots;

      // hash + value noise
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), u.x),
          mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
          u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.55;
        mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p = rot * p * 2.05;
          a *= 0.5;
        }
        return v;
      }

      void main(void) {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        float aspect = resolution.x / resolution.y;
        vec2 p = vec2(uv.x * aspect, uv.y);

        // domain-warp na entrada do fbm pra sensação de mesh gradient fluido
        float t = time * 0.08;
        vec2 q = vec2(fbm(p * 1.2 + t), fbm(p * 1.2 + vec2(5.2, 1.3) - t));
        vec2 r = vec2(fbm(p * 1.6 + q * 1.5 + vec2(1.7, 9.2) + t * 1.1),
                      fbm(p * 1.6 + q * 1.5 + vec2(8.3, 2.8) - t * 0.9));
        float n = fbm(p * 2.0 + r * 2.0);

        // mesh gradient monocromático — bronze (Pedra & Bronze), variado por luminância
        // variada só por luminância, misturada com preto
        vec3 red = vec3(0.557, 0.420, 0.180);
        vec3 c0 = vec3(0.0);
        vec3 c1 = red * 0.12;
        vec3 c2 = red * 0.35;
        vec3 c3 = red * 0.7;
        vec3 c4 = red;

        vec3 col = mix(c0, c1, smoothstep(0.10, 0.45, n));
        col = mix(col, c2, smoothstep(0.45, 0.65, n));
        col = mix(col, c3, smoothstep(0.65, 0.82, n));
        col = mix(col, c4, smoothstep(0.85, 0.98, n) * 0.6);

        // brilho interno suave em direção ao centro
        vec2 centered = uv - 0.5;
        float glow = 1.0 - smoothstep(0.2, 0.85, length(centered));
        col += red * glow * 0.18;

        // overlay de pontos em órbita (grade de pontos pulsantes, orbitando o campo de ruído)
        if (uDots > 0.5) {
          vec2 grid = uv * resolution.xy / 28.0;
          vec2 gi = floor(grid);
          vec2 gf = fract(grid) - 0.5;
          float ang = time * 0.6 + hash(gi) * 6.2831;
          vec2 orbit = vec2(cos(ang), sin(ang)) * 0.18;
          float d = length(gf - orbit);
          float radius = 0.04 + 0.04 * hash(gi + 9.7);
          float dot = smoothstep(radius, radius - 0.012, d);
          float vis = smoothstep(0.4, 0.85, n) * (0.4 + 0.6 * hash(gi + 3.1));
          col += vec3(0.85, 0.70, 0.36) * dot * vis * 0.6;
        }

        // film grain
        float g = (hash(uv * resolution.xy + time) - 0.5) * 0.03;
        col += g;

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const camera = new THREE.Camera();
    camera.position.z = 1;

    const scene = new THREE.Scene();
    const geometry = new THREE.PlaneGeometry(2, 2);

    const uniforms = {
      time: { value: 0.0 },
      resolution: { value: new THREE.Vector2() },
      uDots: { value: dots ? 1.0 : 0.0 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      uniforms.resolution.value.x = renderer.domElement.width;
      uniforms.resolution.value.y = renderer.domElement.height;
    };
    onResize();
    window.addEventListener('resize', onResize, false);

    let raf = 0;
    let last = performance.now();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      if (!paused) uniforms.time.value += dt;
      renderer.render(scene, camera);
    };
    animate();

    stateRef.current = { renderer, geometry, material, uniforms };

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  // Update uDots without re-mounting
  React.useEffect(() => {
    if (stateRef.current?.uniforms) {
      stateRef.current.uniforms.uDots.value = dots ? 1.0 : 0.0;
    }
  }, [dots]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity,
        zIndex: 0,
      }}
    />
  );
}

window.MeshGradientShader = MeshGradientShader;
