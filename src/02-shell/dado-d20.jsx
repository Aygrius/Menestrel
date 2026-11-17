/**
 * ============================================================================
 * Fase 02 (shell/primitivos visuais) — Dado d20 "Gema Facetada"
 * ----------------------------------------------------------------------------
 * Dado de 20 faces translúcido (icosaedro facetado em SVG) para o sistema
 * Tagmar. NÃO reage a clique — a rolagem é disparada só via ref (a janela
 * rola ao abrir), com animação e sorteio de 1..20.
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

  /* O DADO 3D (17/11/2026, 02-shell/dado-3d.jsx): quando dá, quem rola é o
     d20 3D, por cima da tela; este dado 2D deixa o lugar vazio (o 3D para no
     centro da tela, mais ou menos onde ele estava) e só entrega o valor
     quando o 3D para. Sem 3D (sem WebGL, "reduzir movimento", testes, a mesa
     jogando sozinha), tudo segue como antes. */
  // Já nasce escondido quando o 3D vai rolar: senão o dado 2D aparecia por
  // um instante antes do 3D entrar (17/11/2026, usuário).
  var usando3DState = useState(function () { return !!(window.Dado3D && window.Dado3D.disponivel()); });
  var usando3D = usando3DState[0];
  var setUsando3D = usando3DState[1];
  var vivoRef = useRef(true);
  var usou3DRef = useRef(false);
  useEffect(function () {
    // Já vai baixando a física enquanto a janela abre.
    if (window.Dado3D && window.Dado3D.disponivel()) window.Dado3D.preparar();
  }, []);

  // limpa timers ao desmontar (e tira o dado 3D da tela)
  useEffect(function () {
    return function () {
      vivoRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (usou3DRef.current && window.Dado3D) window.Dado3D.limpar();
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

    var D3 = window.Dado3D;
    if (D3 && D3.disponivel()) {
      var valor3D =
        typeof forcado === "number"
          ? Math.max(1, Math.min(20, Math.round(forcado)))
          : 1 + Math.floor(Math.random() * 20);
      usou3DRef.current = true;
      setUsando3D(true);
      D3.rolar({ valor: valor3D }).then(function (r) {
        if (!vivoRef.current) return;
        if (r == null) {
          // O 3D não veio (falhou ao carregar): rola o 2D com o mesmo valor.
          setUsando3D(false);
          rollingRef.current = false;
          api.current.roll2D(valor3D);
          return;
        }
        setValue(valor3D);
        setRolling(false);
        rollingRef.current = false;
        if (onRollRef.current) onRollRef.current(valor3D);
      });
      return;
    }
    api.current.roll2D(forcado, true);
  };
  api.current.roll2D = function (forcado, jaMarcado) {
    if (!jaMarcado) {
      if (rollingRef.current) return;
      rollingRef.current = true;
      setRolling(true);
    }
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
      className={"menestrel-ui ms-d20 " + className + (usando3D ? " is-3d" : "")}
      style={{ display: "inline-block", width: dim, height: dim, lineHeight: 0, visibility: usando3D ? "hidden" : undefined }}
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
                                 Sucesso/Falha — só o dado + "Concluir".
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

  // No crítico o Esc não fecha: rolar de novo é obrigatório (ver os botões).
  var criticoPendenteRef = useRef(false);

  // Esc fecha + trava o scroll do fundo (mesmo padrão dos modais da ficha).
  useEffect(function () {
    var onKey = function (e) { if (e.key === "Escape" && onClose && !criticoPendenteRef.current) onClose(); };
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
      entregar(rLivre);
      return;
    }
    var res = (typeof resolverAcao === "function")
      ? resolverAcao(total, d20)
      : { q: 0, pt: "—", en: "—", cor: "var(--gold)", d20: d20, coluna: total };
    var reqQ = D20_QUALIDADE_MINIMA[dificuldade];
    var sucesso = (typeof reqQ === "number") ? res.q >= reqQ : null;
    var r = Object.assign({}, res, { sucesso: sucesso });
    setResultado(r);
    entregar(r);
  }

  /* UMA AÇÃO SÓ (17/11/2026, usuário: "Quando rolar dois dados assim, ele é
     considerado uma ação só, ou seja, na barra de notificação vai mostrar
     apenas uma notificação mostrando que o primeiro dado foi crítico"). O
     crítico obriga a rolar de novo, então quem ouve (onResultado: a
     notificação da mesa, a bancada) só recebe o dado FINAL, com o que veio
     antes: criticoAntes ("sucesso" | "falha", o do primeiro dado), emSerie
     (os dois primeiros do mesmo tipo: Épico/Catástrofe) e dadosAntes. */
  var cadeiaRef = useRef([]);   // [{ tipo, d20 }] dos críticos que mandaram rolar de novo
  function entregar(r) {
    if (ehCritico(r)) return;
    var cadeia = cadeiaRef.current;
    cadeiaRef.current = [];
    var final = cadeia.length
      ? Object.assign({}, r, {
          criticoAntes: cadeia[0].tipo,
          emSerie: cadeia.length > 1 && cadeia[1].tipo === cadeia[0].tipo,
          dadosAntes: cadeia.map(function (c) { return c.d20; }),
        })
      : r;
    if (props.onResultado) props.onResultado(final);
  }

  // O crítico dá direito a rolar de novo (ver o botão no fim).
  function ehCritico(r) {
    if (!r) return false;
    if (livre) return r.d20 === 1 || r.d20 === 20;
    return r.codigo === "FC" || !!r.critico;
  }
  // A falha crítica: a FC da tabela (o 1 sempre é); no modo livre, o 1.
  function falhaCritica(r) {
    if (!r) return false;
    return livre ? r.d20 === 1 : r.codigo === "FC";
  }
  /* EM SÉRIE (17/11/2026, usuário: "duas falhas críticas seguidas vira uma
     catástrofe, dois críticos seguidos vira épico. É apenas texto para
     mostrar, os critérios de cálculo já foram definidos"). Guarda o tipo do
     crítico que mandou rolar de novo; se o novo for do mesmo tipo, o nome
     muda. Só o texto: a regra (rolar de novo) continua a mesma. */
  var anteriorState = useState(null);   // "falha" | "sucesso" | null
  var anterior = anteriorState[0];
  var setAnterior = anteriorState[1];
  function tipoCritico(r) {
    if (!ehCritico(r)) return null;
    return falhaCritica(r) ? "falha" : "sucesso";
  }
  var emSerie = !!resultado && !!anterior && tipoCritico(resultado) === anterior;
  function rolarDeNovo() {
    if (resultado) cadeiaRef.current = cadeiaRef.current.concat([{ tipo: tipoCritico(resultado), d20: resultado.d20 }]);
    setAnterior(tipoCritico(resultado));
    setResultado(null);
    if (dadoRef.current) dadoRef.current.roll();
  }

  criticoPendenteRef.current = ehCritico(resultado);

  // Os textos só aparecem quando o dado para (17/11/2026, usuário): enquanto
  // ele rola, a janela é só o dado; o lugar deles continua reservado.
  var estiloTexto = resultado
    ? { opacity: 1, visibility: "visible", transition: "opacity .35s ease" }
    : { opacity: 0, visibility: "hidden" };

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
        <div style={estiloTexto}>
          {nome && (
            <div style={{ fontFamily: "var(--font-title)", fontWeight: 700, fontSize: "clamp(24px, 4.5vw, 38px)", color: "var(--foreground)", letterSpacing: ".01em" }}>
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
              {/* No crítico, o nome dele: "Crítico" no sucesso e "Falha Crítica" na
                  falha (17/11/2026, usuário). Fora dele, Sucesso ou Falha. */}
              {ehCritico(resultado) ? (
                <div style={{ fontFamily: "var(--font-title)", fontWeight: 700, fontSize: "clamp(24px, 4.5vw, 38px)", color: falhaCritica(resultado) ? "var(--ember-bright, #B8472F)" : "var(--gold)", letterSpacing: ".01em" }}>
                  {falhaCritica(resultado)
                    ? (emSerie ? (en ? "Catastrophe" : "Catástrofe") : (en ? "Critical Failure" : "Falha Crítica"))
                    : (emSerie ? (en ? "Epic" : "Épico") : (en ? "Critical" : "Crítico"))}
                </div>
              ) : resultado.sucesso != null && (
                <div style={{ fontFamily: "var(--font-title)", fontWeight: 700, fontSize: "clamp(24px, 4.5vw, 38px)", color: resultado.sucesso ? "var(--gold)" : "var(--ember-bright, #B8472F)", letterSpacing: ".01em" }}>
                  {resultado.sucesso ? (en ? "Success" : "Sucesso") : (en ? "Failure" : "Falha")}
                  <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}></span>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={Object.assign({ display: "flex", gap: "clamp(8px, 2vw, 12px)", flexWrap: "wrap", justifyContent: "center", marginTop: 10 }, estiloTexto)}>
          {/* "Rolar de novo" SÓ NO CRÍTICO (26/09/2026): primeiro o botão saiu
              ("remova os botões rolar de novo"), depois voltou com regra —
              "falhas críticas e sucessos críticos dão direito a rolar o dado
              novamente". Crítico = Falha Crítica (FC; o 1 no dado sempre é) ou
              Absurdo (o 20 sempre é). No modo livre, sem tabela, o 1 e o 20. */}
          {/* NÃO É ESCOLHA (17/11/2026, usuário: "Rolar novamente, quando o
              resultado é crítico, não é uma escolha. É consequência. Mas o
              jogador deve clicar para rolar"). No crítico o único botão é o de
              rolar — sem Concluir, e o Esc não fecha —, e o dado só rola no
              clique. */}
          {ehCritico(resultado) ? (
            <button type="button" className="btn-primary" data-rolar-de-novo="1" onClick={rolarDeNovo}>
              <i className="ti ti-refresh" aria-hidden="true" style={{ marginRight: 6, verticalAlign: "-2px" }} />
              {en ? "Roll again" : "Rolar novamente"}
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={onClose}>
              {en ? "Done" : "Concluir"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// D20_QUALIDADE_MINIMA sai aqui porque batalha.jsx (Task 8 de técnicas) precisa
// decidir se um teste 'passou' sem duplicar a tabela de qualidade mínima.
Object.assign(window, { DadoD20, RolagemD20Overlay, D20_DIF_LABEL, D20_QUALIDADE_MINIMA });
