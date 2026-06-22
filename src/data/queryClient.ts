// src/data/queryClient.ts
// ─────────────────────────────────────────────────────────────────────────────
// QueryClient único do projeto (Fase 1). Config CONSERVADORA, como decidido:
// nada de refetch agressivo, retry contido. As escritas continuam sendo
// mutações simples que invalidam a query (sem update otimista).
// ─────────────────────────────────────────────────────────────────────────────

import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dados ficam "frescos" por 30s — evita refetch ao remontar componente.
      staleTime: 30_000,
      // Não refetch automático ao focar a janela (comportamento conservador,
      // mais próximo do que o app fazia: carregava no mount e pronto).
      refetchOnWindowFocus: false,
      // 1 retry só, com backoff — rede instável não vira tempestade de requests.
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
})
