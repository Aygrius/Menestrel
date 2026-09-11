/* ============================================================
   SUPABASE — Cliente único do projeto
   ============================================================
   Vite: lê VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY via import.meta.env
   (definidas no .env.local em dev, e nas Environment Variables do Vercel em prod).
   Também expõe em window.supabaseClient pra debug no console.
   ============================================================ */

import { createClient } from '@supabase/supabase-js';
import { criarFetchComRenovacao } from './sessao-retry.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[auth] VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidas no .env.local (dev) ou nas Environment Variables do Vercel (prod).');
}

/* Token vencido deixa de virar erro na tela: o fetch abaixo renova a sessão
   e repete o request UMA vez (ver 01-core/sessao-retry.js). Motivado pelo
   "JWT expired" ao salvar, relatado em 11/09/2026.

   `autoRefreshToken` continua ligado (padrão) — isto não substitui a
   renovação programada, é a rede de segurança para quando ela não chega a
   tempo (aba em segundo plano, máquina que dormiu). */
let supabaseClient;
const fetchComRenovacao = criarFetchComRenovacao(() => supabaseClient);
supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { fetch: fetchComRenovacao },
});
window.supabaseClient = supabaseClient;

export { supabaseClient };