# design-sync notes — Menestrel

Project: **Menestrel Design System** — https://claude.ai/design/p/4528c7c7-b984-4aef-b094-797f3e9eeb17

## What this DS is

Menestrel is a **Vite app, not a published component library.** The "design system"
is the shadcn/base-ui kit under `src/components/ui/` (Button, Badge, Avatar, Input,
Table). There is no library `dist` entry, so the converter runs in **synth-entry mode**
(it synthesizes an entry from `srcDir`).

## Build setup (must hold for every sync)

- **`node_modules/menestrel` junction → repo root** is REQUIRED. The converter resolves
  `PKG_DIR = node_modules/<pkg>`; in the app's own repo that doesn't exist. Recreate on a
  fresh clone (gitignored, junction not tracked):
  `New-Item -ItemType Junction -Path node_modules\menestrel -Target .` (PowerShell).
  Without it: `ENOENT … node_modules/menestrel/package.json`.
- **`srcDir` is scoped to `src/components/ui`** on purpose. At repo root, synth-entry would
  scan the 13 `NN-*` phase dirs and pull in hundreds of app exports. Keep it scoped. New UI
  primitives added under `src/components/ui/` will auto-appear on the next sync; add
  `componentSrcMap: {<SubPart>: null}` entries for any new compound sub-parts you don't want
  as separate cards.
- `componentSrcMap` nulls the 12 Avatar/Table compound sub-parts so the pane shows 5 clean
  cards. They stay importable from `window.MenestrelUI.*`.
- Build deps live in `.ds-sync/` (esbuild, ts-morph, @types/react, **playwright + chromium**
  already installed there). `tsconfig.app.json` supplies the `@/*` path alias.

## CSS / fonts

- **`cssEntry` points at the hashed app build:** `dist/assets/index-Bgnrk8NM.css`. This is the
  real Tailwind-v4-compiled stylesheet (tokens + every utility the app uses). Raw `src/index.css`
  would NOT work — Tailwind utilities are JIT-generated only at app build time.
- Tokens are scoped under **`.menestrel-ui`** (not `:root`). Previews/designs must render inside
  that class → handled by the exported `MenestrelProvider` (`.design-sync/menestrel-provider.tsx`),
  set as `cfg.provider`. It also gives the dark canvas + `100vh` fill + Plus Jakarta font.
- Brand fonts (Plus Jakarta Sans, Cinzel, Lora, Pirata One, UnifrakturCook) ship via a remote
  Google-Fonts `@import` in `.design-sync/menestrel-fonts.css` (wired through
  `tokensPkg: "menestrel"` + `tokensGlob`). Validate reports **`[FONT_REMOTE]`** — expected, NOT a
  problem.

## Known render warns (re-sync should treat as clean)

- `[FONT_REMOTE]` for the 5 brand families — intentional (runtime Google Fonts).

## Re-sync risks (watch list)

- **`cssEntry` hash is build-specific.** `dist/` is gitignored, so a fresh clone has no compiled
  CSS. Before re-syncing: run `yarn build`, then update `cfg.cssEntry` to the NEW
  `dist/assets/index-*.css` filename (the hash changes every build). If the file is missing the
  build fails `[CSS_*]`/no styles.
- The junction (above) must be recreated per clone.
- Conventions header (`conventions.md`) enumerates utility classes/tokens validated against the
  compiled CSS. There is **no Tailwind JIT at design time** — only utilities already compiled into
  `_ds_bundle.css` resolve. If the app's CSS surface changes, re-validate the header's class list.
- Component previews import realistic Portuguese TTRPG content; purely static (no network except
  fonts). The Avatar `WithImage` cell uses an inline data-URI crest (offline-safe).
