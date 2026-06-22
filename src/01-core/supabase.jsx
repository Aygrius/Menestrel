/* ============================================================
   SUPABASE — Cliente único do projeto
   ============================================================
   Vite: lê VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY via import.meta.env
   (definidas no .env.local em dev, e nas Environment Variables do Vercel em prod).
   Também expõe em window.supabaseClient pra debug no console.
   ============================================================ */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[auth] VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidas no .env.local (dev) ou nas Environment Variables do Vercel (prod).');
}

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabaseClient;

export { supabaseClient };