// src/main.tsx — entry do Vite (Fase 1: + React Query)
// ─────────────────────────────────────────────────────────────────────────────
// Mudanças da Fase 1 em relação à Fase 0:
//   - importa a hook-ponte (src/data/bridge.ts), que expõe useHistoriasData /
//     usePersonagensData / useInvalidar no window;
//   - envolve o <App/> com <QueryClientProvider>, pra que esses hooks funcionem
//     quando chamados pelas telas antigas (que renderizam dentro do App).
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './data/queryClient'

import './bootstrap-globals'      // 1º: popula os globais antes das fases
import './index.css'              // Tailwind v4 + tokens + re-skins "Grimório" (ESSENCIAL)
import './components/ui-bridge'   // expõe o kit shadcn no window.UI (depois do bootstrap)

// ── 12 fases + app.jsx, NA ORDEM EXATA do index.html antigo ──
import './01-core/copy.jsx'
import './01-core/constants.jsx'
import './01-core/helpers.jsx'
import './01-core/inventario-helpers.jsx'
import './01-core/supabase.jsx'
import './01-core/game-data.jsx'
import './02-shell/shaders.jsx'
import './02-shell/dado-d20.jsx'
import './02-shell/dado-d10.jsx'
import './02-shell/tweaks-panel.jsx'
import './03-landing/landing.jsx'
import './04-auth/auth.jsx'
import './05-convites/convites.jsx'
import './06-historias/historias.jsx'
import './07-inventario/inventario.jsx'
import './07-inventario/loja.jsx'        
import './08-personagens/personagens.jsx'
import './08-personagens/guia_personagem.jsx'
import './09-bestiario/bestiario.jsx'
import './09-bestiario/itens-campanha.jsx'
import './10-shell/shell.jsx'
import './11-ficha/ficha.jsx'
import '../app.jsx'
import './12-batalha/batalha.jsx'
import './13-diario/diario.jsx'

// ── data layer (Fase 1): expõe os hooks-ponte no window ──
import './data/bridge'

// ── mount: roda DEPOIS de todas as fases (inclui batalha) estarem no window ──
const App = (window as unknown as { App: React.ComponentType }).App
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
)
