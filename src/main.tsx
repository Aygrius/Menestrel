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
import './tabler-filled.css'      // ícones Tabler PREENCHIDOS onde houver (27/09/2026)
import './components/ui-bridge'   // expõe o kit shadcn no window.UI (depois do bootstrap)

// ── fases + app.jsx, NA ORDEM EXATA do index.html antigo ──
import './01-core/copy.jsx'
import './01-core/constants.jsx'
import './01-core/helpers.jsx'
import './01-core/inventario-helpers.jsx'
import './01-core/bases-item.jsx'      // a BASE do item, separada do exemplar (26/10/2026)
// A BANCADA (06/10/2026, ligada ao app em 26/10/2026): receita, teste de
// habilidade, consumo de material e dias de construção. As 226 receitas
// moram no banco (scripts/sql/fabricacao-2026-10-06.sql).
import './01-core/fabricacao.jsx'
/* Os cinco módulos que faltavam chegar ao app (26/10/2026). Os quatro
   primeiros só registram funções no window — nada corre no carregamento.
   `forma-raca` é o diferente: ele REGISTRA Vampiro e Lobisomem em
   GAME_DATA.racas ao carregar, e por isso só pôde entrar depois de duas
   travas: o teto de bonusPontosRaca passou a ignorar formas (game-data.jsx) e
   o wizard passou a listar só racasJogaveis() (08-personagens). */
import './01-core/forca-minima.jsx'
import './01-core/efeito-temporario.jsx'
import './01-core/grupo-afetado.jsx'
import './01-core/animal-condicao.jsx'
import './01-core/animal-experiencia.jsx'
import './01-core/forma-raca.jsx'
import './01-core/select-pill.jsx'       // o dropdown único do sistema (25/09/2026)
import './01-core/supabase.jsx'
import './01-core/clima-desgaste.jsx'   // o relógio da mesa desgasta o PJ (20/09/2026)
import './01-core/lojas-cidade.jsx'    // o que cada cidade vende, lido da economia dela (28/10/2026)
import './01-core/game-data.jsx'
import './01-core/tecnicas-efeito.jsx'
import './01-core/magias-efeito.jsx'
import './01-core/status-efeito.jsx'   // status que sobrevive à batalha (17/09/2026)
import './09-bestiario/ataques-criatura.jsx'
import './09-bestiario/criatura-formulas.jsx'
import './09-bestiario/catalogo-descritores.jsx'
import './09-bestiario/catalogo-editor.jsx'
import './02-shell/shaders.jsx'
import './02-shell/dado-d20.jsx'
import './02-shell/dado-d10.jsx'
import './02-shell/tweaks-panel.jsx'
import './04-auth/auth.jsx'
import './05-convites/convites.jsx'
import './06-historias/historias.jsx'
import './07-inventario/inventario.jsx'
import './07-inventario/loja.jsx'
import './07-inventario/fabricar.jsx'          // a aba Fabricar, vitrine da bancada
import './06-historias/estoque-mestre.jsx'        
import './08-personagens/personagens.jsx'
import './08-personagens/guia_personagem.jsx'
import './09-bestiario/conhecido-jogador.jsx'
import './09-bestiario/painel-modal.jsx'
import './09-bestiario/bestiario.jsx'
// Sugestões de magias: lê docs/sugestoes-magias.md (?raw) e mostra na página de Magias.
import './09-bestiario/sugestoes-magias.jsx'
import './09-bestiario/itens-campanha.jsx'
import './10-shell/shell.jsx'
// A galeria das pinturas ("Imagens", menu do usuário) — usa o ModalShell do shell.
import './10-shell/galeria-imagens.jsx'
// Atalhos flutuantes (Habilidade/Magia/Item) ANTES da ficha, que os monta.
import './11-ficha/atalhos-ficha.jsx'
import './11-ficha/amigos-fab.jsx'
import './11-ficha/ficha.jsx'
import '../app.jsx'
import './12-batalha/batalha.jsx'
// Tabuleiro DEPOIS de batalha.jsx: usa mesmoParticipante/statusTemEfeito dele.
import './12-batalha/tabuleiro.jsx'
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
