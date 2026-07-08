/**
 * ============================================================================
 * Fase 02 (shell/primitivos visuais) — Dado d20 "Gema Facetada"
 * ----------------------------------------------------------------------------
 * Dado de 20 faces translúcido (icosaedro facetado em SVG) para o sistema
 * Tagmar. NÃO reage a clique — a rolagem é disparada só via ref (ex.: botão
 * "Rolar de novo"), com animação e sorteio de 1..20.
 * Segue a convenção visual do projeto: 1 acende em brasa (Falha Crítica) e 20
 * brilha em ouro (Absurdo) — combinando com resolverAcao/resolverResistencia
 * (1 = Falha Crítica, 20 = crítico) de src/01-core/game-data.jsx.
 *
 * EXPORTS (via window):
 *   - DadoD20            (React.forwardRef) — o dado em si (Gema Facetada)
 *   - RolagemD20Overlay  overlay full-screen: dado no centro + resolução da ação
 *   - D20_DIF_LABEL       mapa dificuldade -> { pt, en } (reaproveitado por quem
 *                         monta texto de notificação a partir do resultado, ex.:
 *                         ficha.jsx em onResultado do RolagemD20Overlay)
 *
 * PROPS:
 *   - size?: number            largura/altura em px (default: clamp responsivo)
 *   - disabled?: boolean        desativa a rolagem
 *   - onRoll?: (valor) => void  chamado quando a rolagem assenta no resultado
 *   - initialValue?: number     número exibido antes da 1ª rolagem (default 20)
 *   - className?: string        classes extras no wrapper
 *
 * REF (imperativo, p/ disparar de fora — ex.: botão "Rolar" na batalha):
 *   - ref.current.roll(forcado?)  rola; se `forcado` (1..20) for passado,
 *                                 assenta nesse valor em vez de sortear
 *   - ref.current.isRolling()     true enquanto a animação roda
 *
 * DEPENDÊNCIAS:
 *   - React global (window.React) — bootstrap-globals.ts
 *   - hooks globais (useState/useEffect/useRef) — src/01-core/helpers.jsx
 *   - React.forwardRef / React.useImperativeHandle (não estão na desestruturação
 *     de helpers.jsx, então acessados via React.*)
 *   - tokens de marca escopados em .menestrel-ui — src/index.css
 *     (--foreground, --gold, --ember; tints de faceta são rgba explícitos)
 *   - resolverAcao + RESULTADOS_ACAO (regras Tagmar) — src/01-core/game-data.jsx
 *     (usados pelo RolagemD20Overlay; já globais quando 02-shell carrega)
 *
 * CONSUMIDO EM:
 *   - src/11-ficha/ficha.jsx (HabilidadeDetalhesModal -> "Usar" abre o overlay)
 *   - (futuro) magias ("Evocar") e técnicas de combate em src/12-batalha/batalha.jsx
 *
 * CARREGAMENTO:
 *   - import './02-shell/dado-d20.jsx' em src/main.tsx, no bloco 02-shell
 *     (precisa carregar antes de qualquer fase que o renderize).
 * ============================================================================
 */

/* ============================== [02] Dado d20 ============================== */

// Keyframes da animação (motion não cabe inline). Injetado UMA vez no <head>,
// no mesmo espírito do DiarioStyleTag da Fase 13. Tudo escopado em .ms-d20-svg.
var MS_D20_KEYFRAMES =
  ".ms-d20-svg{animation:msD20Float 5.5s ease-in-out infinite;transform-origin:center;will-change:transform}" +
  ".ms-d20-svg.is-rolling{animation:msD20Tumble .76s cubic-bezier(.34,.16,.2,1)}" +
  "@keyframes msD20Float{0%{transform:translateY(0) rotate(-1.5deg)}50%{transform:translateY(-5px) rotate(1.5deg)}100%{transform:translateY(0) rotate(-1.5deg)}}" +
  "@keyframes msD20Tumble{0%{transform:rotate(0) scale(1)}30%{transform:rotate(220deg) scale(1.08)}70%{transform:rotate(560deg) scale(.95)}100%{transform:rotate(720deg) scale(1)}}" +
  ".ms-d20-hit:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(201,164,78,0.6);border-radius:6px}" +
  "@media (prefers-reduced-motion:reduce){.ms-d20-svg,.ms-d20-svg.is-rolling{animation:none!important}}";

var DadoD20 = React.forwardRef(function DadoD20(props, ref) {
  var size = props.size;
  var disabled = !!props.disabled;
  var className = props.className || "";
  var initialValue = typeof props.initialValue === "number" ? props.initialValue : 20;

  var valueState = useState(initialValue);
  var value = valueState[0];
  var setValue = valueState[1];

  var rollingState = useState(false);
  var rolling = rollingState[0];
  var setRolling = rollingState[1];

  // refs de controle (guards + timers) — evitam closures velhas no roll()
  var rollingRef = useRef(false);
  var intervalRef = useRef(null);
  var timeoutRef = useRef(null);
  var onRollRef = useRef(props.onRoll);
  onRollRef.current = props.onRoll;

  // injeta os keyframes uma única vez
  useEffect(function () {
    if (document.getElementById("ms-d20-style")) return;
    var el = document.createElement("style");
    el.id = "ms-d20-style";
    el.textContent = MS_D20_KEYFRAMES;
    document.head.appendChild(el);
  }, []);

  // limpa timers ao desmontar
  useEffect(function () {
    return function () {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // lógica de rolagem guardada num ref (reescrita a cada render p/ não ficar
  // stale) e exposta tanto pro clique quanto pelo ref imperativo.
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
          ? Math.max(1, Math.min(20, Math.round(forcado)))
          : 1 + Math.floor(Math.random() * 20);
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
      setValue(1 + Math.floor(Math.random() * 20));
    }, 55);
    timeoutRef.current = setTimeout(assentar, 760); // casa com a duração do msD20Tumble
  };

  React.useImperativeHandle(
    ref,
    function () {
      return {
        roll: function (forcado) {
          api.current.roll(forcado);
        },
        isRolling: function () {
          return rollingRef.current;
        },
      };
    },
    []
  );

  // ---- estado visual derivado do valor (crítico) ----
  var crit = value === 1 ? "fail" : value === 20 ? "hit" : null;
  var numFill = crit === "fail" ? "#F0997B" : crit === "hit" ? "#FBE9B8" : "var(--foreground)";
  var glow =
    crit === "hit"
      ? "drop-shadow(0 10px 18px rgba(233,210,150,0.40))"
      : crit === "fail"
      ? "drop-shadow(0 10px 18px rgba(184,71,47,0.38))"
      : "drop-shadow(0 10px 18px rgba(201,164,78,0.22))";
  var haloBg =
    crit === "hit"
      ? "radial-gradient(circle, rgba(233,210,150,0.45), rgba(201,164,78,0) 70%)"
      : crit === "fail"
      ? "radial-gradient(circle, rgba(184,71,47,0.40), rgba(184,71,47,0) 70%)"
      : "radial-gradient(circle, rgba(201,164,78,0.28), rgba(201,164,78,0) 68%)";

  var dim = typeof size === "number" ? size + "px" : (size || "clamp(96px, 18vw, 150px)");

  return (
    <span
      className={"menestrel-ui ms-d20 " + className}
      style={{ display: "inline-block", width: dim, height: dim, lineHeight: 0 }}
    >
      <span
        className="ms-d20-hit"
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
          className={"ms-d20-svg" + (rolling ? " is-rolling" : "")}
          viewBox="0 0 200 200"
          width="100%"
          height="100%"
          role="img"
          aria-hidden="true"
          style={{ position: "relative", zIndex: 1, filter: glow, transition: "filter .25s" }}
        >
          <polygon points="100,18 29,59 100,62" fill="rgba(233,210,150,0.40)" />
          <polygon points="100,18 171,59 100,62" fill="rgba(201,164,78,0.32)" />
          <polygon points="29,59 29,141 62,130 100,62" fill="rgba(184,134,46,0.30)" />
          <polygon points="171,59 171,141 138,130 100,62" fill="rgba(184,112,46,0.26)" />
          <polygon points="29,141 100,182 62,130" fill="rgba(122,94,42,0.32)" />
          <polygon points="171,141 100,182 138,130" fill="rgba(60,44,18,0.36)" />
          <polygon points="100,182 62,130 138,130" fill="rgba(184,112,46,0.22)" />
          <polygon points="100,62 62,130 138,130" fill="rgba(40,30,14,0.34)" />
          <polygon points="100,18 60,42 92,44" fill="rgba(255,248,230,0.22)" />
          <g
            fill="none"
            stroke="rgba(233,214,160,0.45)"
            strokeWidth="0.8"
            strokeLinejoin="round"
          >
            <polygon points="100,18 171,59 171,141 100,182 29,141 29,59" />
            <path d="M100,18 L100,62 M29,59 L100,62 L171,59 M62,130 L138,130 M100,62 L62,130 M100,62 L138,130 M29,141 L62,130 M171,141 L138,130 M100,182 L62,130 M100,182 L138,130" />
          </g>
          <foreignObject x="18" y="62" width="164" height="76">
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

/* ================== [02] RolagemD20Overlay (dado no centro da tela) ================== */
/* Overlay full-screen que centraliza o DadoD20, rola SOZINHO ao abrir e resolve a
   ação na Tabela de Resolução (resolverAcao + RESULTADOS_ACAO de game-data.jsx).
   A dificuldade escolhida (facil/medio/dificil/muito_dificil/absurdo) é tratada
   como a QUALIDADE MÍNIMA exigida; a qualidade obtida no dado decide Sucesso/Falha
   (regra Tagmar: obtida >= exigida — confirmar com a sua tabela se divergir).
   Reutilizável por habilidades (já ligado) e, no futuro, magias e técnicas.

   PROPS:
     - nome: string             rótulo do teste (nome da habilidade/magia/técnica) —
                                 em modo livre, é o título mostrado (ex.: "Rolamento Livre")
     - total: number            coluna da ação (o _totHab já pronto da ficha) — ignorado se livre
     - dificuldade: string      id: facil | medio | dificil | muito_dificil | absurdo — ignorado se livre
     - livre?: boolean          modo "Rolamento Livre" (a pedido do usuário): não chama
                                 resolverAcao, não mostra rótulo de dificuldade nem
                                 Sucesso/Falha — só o dado + "Rolar de novo"/"Concluir".
                                 total/dificuldade ficam sem uso nesse modo.
     - lang: 'pt' | 'en'
     - onClose: () => void
     - onResultado?: (res) => void   recebe { ...RESULTADOS_ACAO[q], d20, coluna, sucesso }
                                      (modo livre: só { d20 }) */

// dificuldade -> índice de qualidade mínima (q) em RESULTADOS_ACAO.
var D20_QUALIDADE_MINIMA = { facil: 2, medio: 3, dificil: 4, muito_dificil: 5, absurdo: 7 };
var D20_DIF_LABEL = {
  facil:         { pt: "Fácil",         en: "Easy" },
  medio:         { pt: "Médio",         en: "Medium" },
  dificil:       { pt: "Difícil",       en: "Hard" },
  muito_dificil: { pt: "Muito difícil", en: "Very hard" },
  absurdo:       { pt: "Absurdo",       en: "Absurd" },
};

function RolagemD20Overlay(props) {
  var nome = props.nome;
  var total = props.total;
  var dificuldade = props.dificuldade;
  var livre = !!props.livre;
  var onClose = props.onClose;
  var en = props.lang === "en";

  var resultadoState = useState(null);
  var resultado = resultadoState[0];
  var setResultado = resultadoState[1];

  var dadoRef = useRef(null);
  var jaRolou = useRef(false);

  // Esc fecha + trava o scroll do fundo (mesmo padrão dos modais da ficha).
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

  // Rola sozinho assim que aparece (com um respiro pra entrada).
  useEffect(function () {
    var t = setTimeout(function () {
      if (dadoRef.current && !jaRolou.current) { jaRolou.current = true; dadoRef.current.roll(); }
    }, 260);
    return function () { clearTimeout(t); };
  }, []);

  function aoRolar(d20) {
    // Modo livre: sem coluna/dificuldade, não faz sentido chamar resolverAcao
    // (que espera `total` numérico) — só guarda o d20 puro. `resultado` ainda
    // precisa virar truthy pra habilitar "Rolar de novo" (mesmo contrato do
    // modo normal); sem `.sucesso`, o bloco de Sucesso/Falha abaixo
    // (`resultado.sucesso != null`) já fica escondido sozinho, sem precisar
    // de mais um if separado.
    if (livre) {
      var rLivre = { d20: d20 };
      setResultado(rLivre);
      if (props.onResultado) props.onResultado(rLivre);
      return;
    }
    var res = (typeof resolverAcao === "function")
      ? resolverAcao(total, d20)
      : { q: 0, pt: "—", en: "—", cor: "var(--gold)", d20: d20, coluna: total };
    var reqQ = D20_QUALIDADE_MINIMA[dificuldade];
    var sucesso = (typeof reqQ === "number") ? res.q >= reqQ : null;
    var r = Object.assign({}, res, { sucesso: sucesso });
    setResultado(r);
    if (props.onResultado) props.onResultado(r);
  }

  function rolarDeNovo() {
    setResultado(null);
    if (dadoRef.current) dadoRef.current.roll();
  }

  // Sem rótulo de dificuldade no modo livre (não há dificuldade nenhuma).
  var difLbl = livre ? null : (D20_DIF_LABEL[dificuldade]
    ? (en ? D20_DIF_LABEL[dificuldade].en : D20_DIF_LABEL[dificuldade].pt)
    : dificuldade);

  return (
    <div
      className="menestrel-ui"
      role="dialog"
      aria-modal="true"
      aria-label={(en ? "Roll: " : "Rolagem: ") + (nome || "d20")}
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
        <div>
          {nome && (
            <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: "clamp(24px, 4.5vw, 38px)", color: "var(--foreground)", letterSpacing: ".01em" }}>
              {nome}
            </div>
          )}
          {difLbl && (
            <div style={{ marginTop: 4, fontSize: "clamp(12px, 3vw, 14px)", color: "var(--muted-foreground)" }}>
              {difLbl}
            </div>
          )}
        </div>

        <DadoD20
          ref={dadoRef}
          size="clamp(150px, 42vw, 208px)"
          onRoll={aoRolar}
        />

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
            <div
              style={{
                display: "inline-block", minWidth: "min(82vw, 280px)",
              }}
            >
              {resultado.sucesso != null && (
                <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: "clamp(24px, 4.5vw, 38px)", color: resultado.sucesso ? "var(--gold)" : "var(--ember-bright, #B8472F)", letterSpacing: ".01em" }}>
                  {resultado.sucesso ? (en ? "Success" : "Sucesso") : (en ? "Failure" : "Falha")}
                  <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}></span>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "clamp(8px, 2vw, 12px)", flexWrap: "wrap", justifyContent: "center", marginTop: 10 }}>
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

Object.assign(window, { DadoD20, RolagemD20Overlay, D20_DIF_LABEL });
