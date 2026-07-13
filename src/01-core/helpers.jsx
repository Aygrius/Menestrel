/* ============================================================
   HELPERS — Funções e hooks utilitários globais
   ============================================================
   - Desestrutura React: useState/useEffect/useMemo/useRef expostos
                         no escopo global, consumidos por todos os
                         arquivos extraídos. DECLARAÇÃO ÚNICA — não
                         redeclarar em outros arquivos, ou Babel
                         standalone joga "Identifier already declared".
   - calcDiaSemanaFantasy: nome do dia da semana no calendário fantasy
   - useTweaks: hook que persiste valores via host (editmode)

   Depende de: FANTASY_MONTHS e FANTASY_WEEKDAYS (constants.jsx).
   Carregar após constants.jsx no HTML.
   ============================================================ */

// Atalho global pros hooks do React. Babel standalone executa cada
// <script> no escopo global compartilhado — portanto esta const
// pode aparecer UMA ÚNICA VEZ em toda a árvore de scripts.
const { useState, useEffect, useMemo, useRef } = React;

// Ano 0, Mês 1, Dia 1 = Moldio (índice 3).
// Cada ano tem 361 dias: 12 meses de 30 dias + 1 Dia de Cruine (mês 13).
// Âncora: (ano*361 + diasAcumuladosAtéMes + dia-1 + 3) % 7
function calcDiaSemanaFantasy(ano, mes, dia) {
  let total = ano * 361;
  for (let m = 1; m < mes; m++) total += FANTASY_MONTHS[m - 1].dias;
  total += (dia - 1);
  return FANTASY_WEEKDAYS[(total + 3) % 7];
}

// ── useTweaks ───────────────────────────────────────────────────────────────
// Fonte única de verdade pros valores do tweak. setTweak persiste via host
// (__edit_mode_set_keys → host reescreve o bloco EDITMODE em disco).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Aceita tanto setTweak('chave', valor) quanto setTweak({ chave: valor, ... }) pra
  // que uma chamada estilo useState não escreva uma chave "[object Object]" no JSON
  // persistido.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null
      ? keyOrEdits : { [keyOrEdits]: val };
    setValues((prev) => ({ ...prev, ...edits }));
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*');
    // Sinal na mesma janela pra que listeners in-page (thumbnails de rail do deck-stage)
    // possam reagir — a mensagem do parent só chega no host, não nos peers.
    window.dispatchEvent(new CustomEvent('tweakchange', { detail: edits }));
  }, []);
  return [values, setTweak];
}

// ── useTooltip ───────────────────────────────────────────────────────────────
// Hook que gerencia o estado de um tooltip: posição (x, y) + conteúdo livre.
// Retorna [tip, abrirTip, fecharTip] onde:
//   tip       — { x, y, content } | null
//   abrirTip  — (e, content) => void  (e = MouseEvent ou elemento com getBoundingClientRect)
//   fecharTip — () => void  (com delay curto pra não fechar ao ir pro próprio tip)
function useTooltip(delay = 80) {
  const [tip, setTip] = useState(null);
  const timer = useRef(null);
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const abrirTip = (e, content) => {
    clear();
    const r = (e?.currentTarget || e?.target || e)?.getBoundingClientRect?.() ?? e;
    const x = r ? (r.left + r.width / 2) : (e?.clientX ?? 0);
    const y = r ? r.top : (e?.clientY ?? 0);
    setTip({ x, y, content });
  };
  const fecharTip = () => { clear(); timer.current = setTimeout(() => setTip(null), delay); };
  const manterTip = () => clear();
  useEffect(() => () => clear(), []);
  return [tip, abrirTip, fecharTip, manterTip];
}

// ── Tooltip — componente visual (renderizado via portal no body) ─────────────
// Props:
//   tip      — objeto { x, y, content } vindo do useTooltip
//   onEnter  — manterTip (evita fechar ao passar o mouse no próprio tip)
//   onLeave  — fecharTip
//
// `content` pode ser:
//   • string simples → vira <span> no título
//   • { title, desc, stats, hint } → layout rico (igual ao fp-item-tip original)
//     stats = [{ label, value }]
// ── Tooltip — componente visual sem portal ───────────────────────────────────
// Renderiza inline (position:fixed) — mesmo comportamento do fp-item-tip
// original, sem depender de ReactDOM.createPortal.
// `content` pode ser:
//   • string simples → só título
//   • { title, desc, stats, hint } → layout rico
//     stats = [{ label, value }]
function Tooltip({ tip, onEnter, onLeave }) {
  if (!tip) return null;
  const { x, y, content } = tip;
  const rich = content && typeof content === 'object' && !React.isValidElement(content);
  return (
    <div
      className="mn-tip"
      style={{ position: 'fixed', left: x, top: y }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {rich ? (
        <>
          {content.title && <div className="mn-tip-title">{content.title}</div>}
          {content.desc  && <p   className="mn-tip-desc">{content.desc}</p>}
          {content.stats && content.stats.length > 0 && (
            <div className="mn-tip-stats">
              {content.stats.map((s, i) => (
                <span key={i} className="mn-tip-stat">{s.label} <b>{s.value}</b></span>
              ))}
            </div>
          )}
          {content.hint && <div className="mn-tip-hint">{content.hint}</div>}
        </>
      ) : React.isValidElement(content) ? content : (
        <div className="mn-tip-title">{content}</div>
      )}
    </div>
  );
}

Object.assign(window, { calcDiaSemanaFantasy, useTweaks, useTooltip, Tooltip });

// ── interpolate ──────────────────────────────────────────────────────────────
// Substitui placeholders {chave} numa string de copy (t.algumaCoisa.texto)
// pelos valores de `vars`. Usado pelas fases que migraram pra t.* mas ainda
// precisam de strings com variável (ex.: t.convites.mng.falhouComMotivo =
// 'Falhou: {motivo}' -> interpolate(str, { motivo: 'expirado' })).
// Chave sem valor correspondente em vars é substituída por string vazia
// (silencioso, não lança erro) — evita "[object Object]" ou {undefined}
// vazando pra UI se algum caller esquecer uma variável.
function interpolate(str, vars) {
  if (!str) return str;
  return str.replace(/\{(\w+)\}/g, (_, key) => (vars && vars[key] !== undefined ? vars[key] : ''));
}

Object.assign(window, { interpolate });

// ── corCondicao / COND_LIMITE ─────────────────────────────────────────────
// Sistema de condições (Saúde, Sono, Hidratação, Alimentação, Temperatura,
// Sobriedade, Sanidade, Reputação) migrou de escala 0–100 (100 = pleno) pra
// escala bidirecional -COND_LIMITE..+COND_LIMITE com 0 = neutro. Cor é só
// pelo SINAL do valor — não por nível/percentual: negativo vermelho,
// positivo verde, zero neutro (tom aço já usado em FICHA_VIT_COLORS.ar,
// pra combinar com a paleta "Pedra & Bronze"). Compartilhado entre
// 11-ficha/ficha.jsx e 12-batalha/batalha.jsx pra nunca divergir a cor de
// uma condição entre as duas telas.
const COND_LIMITE = 50;
function corCondicao(val) {
  const v = Number(val) || 0;
  if (v > 0) return '#00850f';
  if (v < 0) return '#870000';
  return '#8c8d8e';
}

Object.assign(window, { corCondicao, COND_LIMITE });