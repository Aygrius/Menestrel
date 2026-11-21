/* AS MARCAÇÕES DO BANCO NO MAPA VETORIAL (21/11/2026)
 *
 *   node scripts/mapa/migrar-vetorial.mjs
 *
 * Lê do banco tudo o que tem coordenada no plano material — a camada do mundo
 * (catalogo_mundo, tipo 'mapa', slug 'mundo'), o mapa de cada mesa
 * (mapas_mesa.dados: lugares, linhas, gente) e as marcas dos jogadores
 * (mapa_marcas) — converte da pintura oriental (1200 × 2000) para o mapa
 * vetorial (converter-vetorial.mjs) e escreve o SQL que grava o resultado:
 *     scripts/sql/mapa-vetorial-2026-11-21.sql
 * O SQL guarda cópias antes de trocar e traz o comando para desfazer.
 * Os planos celestial e infernal não têm pintura: ficam como estão.
 *
 * Precisa de SUPABASE_SERVICE_ROLE_KEY no .env.local (ver subir.mjs).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { montarAncoras, converter } from './converter-vetorial.mjs';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const url = env.VITE_SUPABASE_URL, chave = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) { console.error('Faltam VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.'); process.exit(1); }
const sb = createClient(url, chave, { auth: { persistSession: false } });

const ler = async (q) => { const { data, error } = await q; if (error) throw new Error(error.message); return data; };
const mundo = await ler(sb.from('catalogo_mundo').select('tipo, slug, dados').eq('tipo', 'mapa').eq('slug', 'mundo').maybeSingle());
const mesas = await ler(sb.from('mapas_mesa').select('historia_id, dados'));
const marcas = await ler(sb.from('mapa_marcas').select('personagem_id, marcas'));

// Âncoras: os lugares do mundo que existem com o mesmo nome no mapa novo.
const ancoras = montarAncoras(mundo ? mundo.dados.lugares : []);
const conv = (p) => (p && typeof p.x === 'number' && typeof p.y === 'number' ? { ...p, ...converter(p, ancoras) } : p);
const convMaterial = (d) => {
  if (!d || typeof d !== 'object') return d;
  const gente = {};
  Object.entries(d.gente || {}).forEach(([k, p]) => { gente[k] = conv(p); });
  return {
    ...d,
    lugares: (d.lugares || []).map(conv),
    linhas: (d.linhas || []).map((l) => ({ ...l, pts: (l.pts || []).map(conv) })),
    gente,
    // os outros planos não têm pintura: ficam
  };
};

const lit = (o) => "'" + JSON.stringify(o).replace(/'/g, "''") + "'::jsonb";
const linhas = [];
linhas.push(`-- AS MARCAÇÕES NO MAPA VETORIAL (21/11/2026)
--
-- Usuário: "Acabei de adicionar o mapa completo [...] Tente deixar as marcações
-- existentes corretas." A tela de Mapa troca a pintura oriental (unidades
-- 1200 × 2000) pelo mapa vetorial de Tagmar inteiro (public/mapa/tagmar.svg,
-- unidades = viewBox 5905,5 × 4695,1). Este script leva para as unidades novas
-- tudo o que o plano material guarda com coordenada: a camada do mundo, o mapa
-- de cada mesa (lugares, linhas, personagens) e as marcas dos jogadores.
-- Gerado por scripts/mapa/migrar-vetorial.mjs (conversão em converter-vetorial.mjs:
-- ${ancoras.length} lugares com o mesmo nome nos dois mapas servem de âncora).
--
-- Antes de rodar (21/11/2026): mundo com ${mundo ? mundo.dados.lugares.length : 0} lugares; ${mesas.length} mesas
-- (${mesas.map((m) => `${m.historia_id}: ${Object.keys((m.dados && m.dados.gente) || {}).length} personagens, ${((m.dados && m.dados.lugares) || []).length} lugares, ${((m.dados && m.dados.linhas) || []).length} linhas`).join('; ')});
-- ${marcas.length} linhas em mapa_marcas.

create table if not exists public.backup_mapa_vetorial_mundo_20261121 as
  select * from public.catalogo_mundo where tipo = 'mapa' and slug = 'mundo';
create table if not exists public.backup_mapa_vetorial_mesas_20261121 as
  select * from public.mapas_mesa;
create table if not exists public.backup_mapa_vetorial_marcas_20261121 as
  select * from public.mapa_marcas;
alter table public.backup_mapa_vetorial_mundo_20261121 enable row level security;
alter table public.backup_mapa_vetorial_mesas_20261121 enable row level security;
alter table public.backup_mapa_vetorial_marcas_20261121 enable row level security;
`);
if (mundo) {
  const novo = { ...mundo.dados, lugares: mundo.dados.lugares.map(conv) };
  linhas.push(`update public.catalogo_mundo set dados = ${lit(novo)}\n  where tipo = 'mapa' and slug = 'mundo';`);
}
for (const m of mesas) {
  linhas.push(`update public.mapas_mesa set dados = ${lit(convMaterial(m.dados))}, updated_at = now()\n  where historia_id = ${m.historia_id};`);
}
for (const m of marcas) {
  // marca sem plano (ou plano material) muda; as dos outros planos ficam
  const novas = (m.marcas || []).map((k) => ((k.plano || 'material') === 'material' ? conv(k) : k));
  linhas.push(`update public.mapa_marcas set marcas = ${lit(novas)}\n  where personagem_id = ${m.personagem_id};`);
}
linhas.push(`
-- Para desfazer:
--   update public.catalogo_mundo c set dados = b.dados from public.backup_mapa_vetorial_mundo_20261121 b where b.tipo = c.tipo and b.slug = c.slug;
--   update public.mapas_mesa m set dados = b.dados, updated_at = now() from public.backup_mapa_vetorial_mesas_20261121 b where b.historia_id = m.historia_id;
--   update public.mapa_marcas m set marcas = b.marcas from public.backup_mapa_vetorial_marcas_20261121 b where b.personagem_id = m.personagem_id;
`);
writeFileSync('scripts/sql/mapa-vetorial-2026-11-21.sql', linhas.join('\n'));
console.log(`âncoras: ${ancoras.length}; mundo: ${mundo ? mundo.dados.lugares.length : 0} lugares; mesas: ${mesas.length}; marcas: ${marcas.length}`);
console.log('escrito: scripts/sql/mapa-vetorial-2026-11-21.sql');
