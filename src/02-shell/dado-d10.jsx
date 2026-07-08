/**
 * ============================================================================
 * Fase 02 (shell/primitivos visuais) — Dado d10 "Gema Facetada"
 * ----------------------------------------------------------------------------
 * Dado de 10 faces translúcido (bipirâmide pentagonal facetada em SVG) para
 * o sistema Tagmar. Irmão do DadoD20 — mesma identidade visual "Pedra &
 * Bronze", mesmos padrões de API, mesma animação e mesma lógica de cores
 * críticas (1 = brasa / falha crítica, 10 = ouro / crítico).
 *
 * NÃO reage a clique — rolagem disparada só via ref (mesmo contrato do D20).
 *
 * EXPORTS (via window):
 *   - DadoD10              (React.forwardRef) — o dado em si
 *   - RolagemD10Overlay    overlay full-screen em modo livre (sem resolverAcao)
 *
 * PROPS (idênticas ao DadoD20):
 *   - size?: number|string   largura/altura em px ou CSS (default: clamp responsivo)
 *   - disabled?: boolean     desativa a rolagem
 *   - onRoll?: (valor) => void  chamado quando a rolagem assenta
 *   - initialValue?: number  número exibido antes da 1ª rolagem (default 10)
 *   - className?: string     classes extras no wrapper
 *
 * REF (imperativo):
 *   - ref.current.roll(forcado?)  rola; se `forcado` (1..10) passado, assenta nele
 *   - ref.current.isRolling()     true enquanto a animação roda
 *
 * DEPENDÊNCIAS:
 *   - React global (window.React) — bootstrap-globals.ts
 *   - hooks globais (useState/useEffect/useRef) — src/01-core/helpers.jsx
 *   - React.forwardRef / React.useImperativeHandle
 *   - tokens de marca escopados em .menestrel-ui — src/index.css
 *
 * CONSUMIDO EM:
 *   - src/10-shell/shell.jsx (RolagemLivreFab — seletor D20 / D10)
 *
 * CARREGAMENTO:
 *   - import './02-shell/dado-d10.jsx' em src/main.tsx, APÓS dado-d20.jsx
 * ============================================================================
 */

/* ============================== [02] Dado d10 ============================== */

// Keyframes — mesmo padrão do D20: injetado UMA vez no <head>, escopado em
// .ms-d10-svg. Animação de flutuação e tumble idênticas ao irmão D20.
var MS_D10_KEYFRAMES =
  ".ms-d10-svg{animation:msD10Float 5.5s ease-in-out infinite;transform-origin:center;will-change:transform}" +
  ".ms-d10-svg.is-rolling{animation:msD10Tumble .76s cubic-bezier(.34,.16,.2,1)}" +
  "@keyframes msD10Float{0%{transform:translateY(0) rotate(1.5deg)}50%{transform:translateY(-5px) rotate(-1.5deg)}100%{transform:translateY(0) rotate(1.5deg)}}" +
  "@keyframes msD10Tumble{0%{transform:rotate(0) scale(1)}30%{transform:rotate(-220deg) scale(1.08)}70%{transform:rotate(-560deg) scale(.95)}100%{transform:rotate(-720deg) scale(1)}}" +
  ".ms-d10-hit:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(201,164,78,0.6);border-radius:6px}" +
  "@media (prefers-reduced-motion:reduce){.ms-d10-svg,.ms-d10-svg.is-rolling{animation:none!important}}";

var DadoD10 = React.forwardRef(function DadoD10(props, ref) {
  var size     = props.size;
  var disabled = !!props.disabled;
  var className = props.className || "";
  var initialValue = typeof props.initialValue === "number" ? props.initialValue : 10;

  var valueState = useState(initialValue);
  var value      = valueState[0];
  var setValue   = valueState[1];

  var rollingState = useState(false);
  var rolling      = rollingState[0];
  var setRolling   = rollingState[1];

  var rollingRef  = useRef(false);
  var intervalRef = useRef(null);
  var timeoutRef  = useRef(null);
  var onRollRef   = useRef(props.onRoll);
  onRollRef.current = props.onRoll;

  // injeta keyframes uma única vez
  useEffect(function () {
    if (document.getElementById("ms-d10-style")) return;
    var el = document.createElement("style");
    el.id = "ms-d10-style";
    el.textContent = MS_D10_KEYFRAMES;
    document.head.appendChild(el);
  }, []);

  // limpa timers ao desmontar
  useEffect(function () {
    return function () {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  var api = useRef({});
  api.current.roll = function (forcado) {
    if (rollingRef.current || disabled) return;
    rollingRef.current = true;
    setRolling(true);

    var reduz =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var assentar = function () {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      var v =
        typeof forcado === "number"
          ? Math.max(1, Math.min(10, Math.round(forcado)))
          : 1 + Math.floor(Math.random() * 10);
      setValue(v);
      setRolling(false);
      rollingRef.current = false;
      if (onRollRef.current) onRollRef.current(v);
    };

    if (reduz) {
      timeoutRef.current = setTimeout(assentar, 220);
      return;
    }
    intervalRef.current = setInterval(function () {
      setValue(1 + Math.floor(Math.random() * 10));
    }, 55);
    timeoutRef.current = setTimeout(assentar, 760);
  };

  React.useImperativeHandle(
    ref,
    function () {
      return {
        roll:      function (forcado) { api.current.roll(forcado); },
        isRolling: function ()        { return rollingRef.current; },
      };
    },
    []
  );

  // ---- estado visual derivado do valor ----
  // 1 = brasa (falha crítica), 10 = ouro (crítico) — espelha a semântica do D20
  var crit    = value === 1 ? "fail" : value === 10 ? "hit" : null;
  var numFill = crit === "fail" ? "#F0997B" : crit === "hit" ? "#FBE9B8" : "var(--foreground)";
  var glow    =
    crit === "hit"
      ? "drop-shadow(0 10px 18px rgba(233,210,150,0.40))"
      : crit === "fail"
      ? "drop-shadow(0 10px 18px rgba(184,71,47,0.38))"
      : "drop-shadow(0 10px 18px rgba(201,164,78,0.22))";
  var haloBg  =
    crit === "hit"
      ? "radial-gradient(circle, rgba(233,210,150,0.45), rgba(201,164,78,0) 70%)"
      : crit === "fail"
      ? "radial-gradient(circle, rgba(184,71,47,0.40), rgba(184,71,47,0) 70%)"
      : "radial-gradient(circle, rgba(201,164,78,0.28), rgba(201,164,78,0) 68%)";

  var dim = typeof size === "number" ? size + "px" : (size || "clamp(96px, 18vw, 150px)");

  /*
   * SVG — Trapezoedro Pentagonal (10 faces kite) — o formato REAL do d10.
   * ─────────────────────────────────────────────────────────────
   * viewBox 200 × 210. Geometria derivada do sólido 3D correto: amplitude do
   * equador h = c·(1-cos36°)/(1+cos36°) (faces planas), raio R=0.92, projeção
   * ortográfica com inclinação de ~20°.
   *
   * Orientação (phi0=54°): FACE central no topo (como o "00" do d10 físico),
   * ladeada por 2 faces; ARESTA vertical central na base (como o "|" entre os
   * números embaixo). Ápices pontiagudos em (100,14) e (100,196), equador em
   * ziguezague no meio.
   *
   * As 10 faces = 5 kites superiores (ápice-topo → equador) + 5 inferiores.
   * Sombreamento por face-normal × luz (topo-frente-esquerda); faces de trás
   * ficam translúcidas — mesmo esquema bronze do D20.
   */

  return (
    <span
      className={"menestrel-ui ms-d10 " + className}
      style={{ display: "inline-block", width: dim, height: dim, lineHeight: 0 }}
    >
      <span
        className="ms-d10-hit"
        aria-hidden="true"
        style={{
          background: "none",
          border: "none",
          padding: 0,
          margin: 0,
          width: "100%",
          height: "100%",
          position: "relative",
          display: "grid",
          placeItems: "center",
          cursor: "default",
        }}
      >
        {/* Halo ambiente — igual ao D20 */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            zIndex: 0,
            width: "118%",
            height: "118%",
            borderRadius: "50%",
            background: haloBg,
            filter: "blur(2px)",
            pointerEvents: "none",
            transition: "background .4s",
          }}
        />

        <svg
          className={"ms-d10-svg" + (rolling ? " is-rolling" : "")}
          viewBox="0 0 200 210"
          width="100%"
          height="100%"
          role="img"
          aria-hidden="true"
          style={{ position: "relative", zIndex: 1, filter: glow, transition: "filter .25s" }}
        >
          {/* ── Trapezoedro pentagonal (formato real do d10, face no topo) ── */}
          <polygon points="100.0,196.0 47.6,90.0 100.0,64.9 152.4,90.0" fill="rgba(66,49,21,0.12)" />
          <polygon points="100.0,14.0 100.0,64.9 152.4,90.0 184.7,86.0" fill="rgba(66,49,21,0.12)" />
          <polygon points="100.0,14.0 15.3,86.0 47.6,90.0 100.0,64.9" fill="rgba(66,49,21,0.14)" />
          <polygon points="100.0,196.0 152.4,90.0 184.7,86.0 184.7,124.0" fill="rgba(66,49,21,0.12)" />
          <polygon points="100.0,196.0 15.3,124.0 15.3,86.0 47.6,90.0" fill="rgba(66,49,21,0.12)" />
          <polygon points="100.0,14.0 184.7,86.0 184.7,124.0 152.4,120.0" fill="rgba(174,106,43,0.32)" />
          <polygon points="100.0,14.0 47.6,120.0 15.3,124.0 15.3,86.0" fill="rgba(240,196,93,0.30)" />
          <polygon points="100.0,196.0 184.7,124.0 152.4,120.0 100.0,145.1" fill="rgba(128,78,32,0.20)" />
          <polygon points="100.0,196.0 100.0,145.1 47.6,120.0 15.3,124.0" fill="rgba(143,116,55,0.24)" />
          <polygon points="100.0,14.0 152.4,120.0 100.0,145.1 47.6,120.0" fill="rgba(255,255,189,0.38)" />

          {/* Especular sutil na face frontal mais iluminada */}
          <polygon points="100.0,14.0 152.4,120.0 100.0,145.1 47.6,120.0" fill="rgba(255,248,230,0.14)" />

          {/* ── Arestas visíveis ── */}
          <path
            d="M100.0,14.0 L152.4,120.0 M152.4,120.0 L100.0,145.1 M100.0,145.1 L47.6,120.0 M47.6,120.0 L100.0,14.0 M47.6,120.0 L15.3,124.0 M15.3,124.0 L15.3,86.0 M15.3,86.0 L100.0,14.0 M184.7,86.0 L100.0,14.0 M184.7,86.0 L184.7,124.0 M184.7,124.0 L152.4,120.0 M100.0,196.0 L100.0,145.1 M15.3,124.0 L100.0,196.0 M184.7,124.0 L100.0,196.0"
            fill="none"
            stroke="rgba(233,214,160,0.42)"
            strokeWidth="0.8"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* ── Número central (ícone Tabler ti-number-N-small) ── */}
          <foreignObject x="40" y="70" width="120" height="70">
            <div xmlns="http://www.w3.org/1999/xhtml" style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <i
                className={"ti ti-number-" + value + "-small"}
                style={{
                  fontSize: "clamp(48px, 12vw, 80px)",
                  color: numFill,
                  transition: "color .25s",
                  filter: "drop-shadow(0 1px 2px rgba(28,20,7,0.55))",
                  lineHeight: 1,
                }}
              />
            </div>
          </foreignObject>
        </svg>
      </span>
    </span>
  );
});

/* ================== [02] RolagemD10Overlay ================== */
/*
 * Overlay full-screen para o D10. Sempre abre em modo LIVRE (sem resolverAcao)
 * — mesmo comportamento que o RolagemD20Overlay usa quando `livre=true`, mas
 * sem precisar passar a prop (o D10 não tem tabela de resolução no Tagmar base).
 *
 * PROPS:
 *   - nome: string           título exibido acima do dado
 *   - lang: 'pt' | 'en'
 *   - onClose: () => void
 *   - onResultado?: ({ d10 }) => void
 */
function RolagemD10Overlay(props) {
  var nome      = props.nome;
  var onClose   = props.onClose;
  var en        = props.lang === "en";

  var resultadoState = useState(null);
  var resultado      = resultadoState[0];
  var setResultado   = resultadoState[1];

  var dadoRef  = useRef(null);
  var jaRolou  = useRef(false);

  // Esc fecha + trava scroll do fundo
  useEffect(function () {
    var onKey = function (e) { if (e.key === "Escape" && onClose) onClose(); };
    document.addEventListener("keydown", onKey);
    var prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return function () {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Rola sozinho ao abrir
  useEffect(function () {
    var t = setTimeout(function () {
      if (dadoRef.current && !jaRolou.current) {
        jaRolou.current = true;
        dadoRef.current.roll();
      }
    }, 260);
    return function () { clearTimeout(t); };
  }, []);

  function aoRolar(d10) {
    var r = { d10: d10 };
    setResultado(r);
    if (props.onResultado) props.onResultado(r);
  }

  function rolarDeNovo() {
    setResultado(null);
    if (dadoRef.current) dadoRef.current.roll();
  }

  return (
    <div
      className="menestrel-ui"
      role="dialog"
      aria-modal="true"
      aria-label={(en ? "Roll: " : "Rolagem: ") + (nome || "d10")}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "grid", placeItems: "center",
        padding: "clamp(16px, 4vw, 40px)",
        background: "rgba(8,6,2,0.66)",
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          textAlign: "center", maxWidth: "min(92vw, 460px)",
        }}
      >
        {/* Título */}
        {nome && (
          <div style={{
            fontFamily: "'Cinzel', serif", fontWeight: 700,
            fontSize: "clamp(24px, 4.5vw, 38px)",
            color: "var(--foreground)", letterSpacing: ".01em", marginBottom: 4,
          }}>
            {nome}
          </div>
        )}

        {/* Badge "D10" — diferencia visualmente do overlay D20 */}
        <div style={{
          fontSize: "clamp(11px, 2.5vw, 13px)", color: "var(--muted-foreground)",
          letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 4,
        }}>
          d10
        </div>

        <DadoD10
          ref={dadoRef}
          size="clamp(150px, 42vw, 208px)"
          onRoll={aoRolar}
        />

        {/* Resultado animado */}
        <div
          aria-live="polite"
          style={{
            minHeight: 1, width: "100%",
            opacity: resultado ? 1 : 0,
            transform: resultado ? "translateY(0)" : "translateY(6px)",
            transition: "opacity .35s ease, transform .35s ease",
            pointerEvents: resultado ? "auto" : "none",
          }}
        >
          {resultado && (
            <div style={{ display: "inline-block", minWidth: "min(82vw, 280px)" }}>
              {/* Destaque visual no crítico/falha */}
              {(resultado.d10 === 10 || resultado.d10 === 1) && (
                <div style={{
                  fontFamily: "'Cinzel', serif", fontWeight: 700,
                  fontSize: "clamp(20px, 4vw, 32px)",
                  color: resultado.d10 === 10 ? "var(--gold)" : "var(--ember-bright, #B8472F)",
                  letterSpacing: ".01em",
                }}>
                  {resultado.d10 === 10
                    ? (en ? "Critical!" : "Crítico!")
                    : (en ? "Fumble!" : "Falha Crítica!")}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botões */}
        <div style={{
          display: "flex", gap: "clamp(8px, 2vw, 12px)",
          flexWrap: "wrap", justifyContent: "center", marginTop: 10,
        }}>
          <button type="button" className="btn-ghost" onClick={rolarDeNovo} disabled={!resultado}>
            <i className="ti ti-refresh" aria-hidden="true" style={{ marginRight: 6, verticalAlign: "-2px" }} />
            {en ? "Roll again" : "Rolar de novo"}
          </button>
          <button type="button" className="btn-primary" onClick={onClose}>
            {en ? "Done" : "Concluir"}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DadoD10, RolagemD10Overlay });
