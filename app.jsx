// ============================================================
// app.jsx — TWEAKS_DEFAULTS (marcadores EDITMODE)
// ============================================================
// Bootstrap movido para src/main.tsx, que monta o <App /> DEPOIS de todas as
// fases (incl. batalha) carregarem. Aqui só fica a config de tweaks.

const TWEAKS_DEFAULTS = /*EDITMODE-BEGIN*/{
  "mode": "grimoire",
  "lang": "pt",
  "shader": true,
  "shaderKind": "mesh",
  "theme": "dark"
} /*EDITMODE-END*/;

// Expõe no escopo global para o useTweaks (src/01-core/helpers.jsx) encontrar,
// como acontecia quando isto era um <script> clássico.
window.TWEAKS_DEFAULTS = TWEAKS_DEFAULTS;
