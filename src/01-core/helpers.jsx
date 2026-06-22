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
// Cada ano tem 360 dias (calendário fantasy sem bissexto).
function calcDiaSemanaFantasy(ano, mes, dia) {
  let total = ano * 360;
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

Object.assign(window, { calcDiaSemanaFantasy, useTweaks });