/* O ESTILO DE TEXTO DOS LOCAIS QUE ERAM TEXTOS (21/11/2026)
 *
 *   node scripts/mapa/estilo-dos-locais.mjs
 *
 * Usuário, depois de os textos virarem locais (textos-em-locais.mjs): "era pra
 * manter o estilo de texto e a edição de texto". Os 143 locais criados naquela
 * primeira passada (ids 'tx…') ganham `estilo`: o tipo da geografia, a
 * importância e o que a ferramenta Nomes tinha mudado. O par é achado pelo
 * nome e pelo ponto (o local nasceu exatamente no ponto do texto).
 * Só preenche quem ainda não tem estilo: rodar de novo não muda nada.
 *
 * Precisa de SUPABASE_SERVICE_ROLE_KEY no .env.local.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ler = async (q) => { const { data, error } = await q; if (error) throw new Error(error.message); return data; };

const mundo = await ler(sb.from('catalogo_mundo').select('dados').eq('tipo', 'mapa').eq('slug', 'mundo').single());
const geografia = await ler(sb.from('catalogo_mundo').select('dados').eq('tipo', 'mapa').eq('slug', 'geografia').maybeSingle());
const mods = (geografia && geografia.dados && geografia.dados.rotulos) || {};
const GEO_TIPOS = ['mar', 'lago', 'rio', 'serra', 'floresta', 'deserto', 'ilha', 'regiao', 'planicie', 'vulcao'];
const rotulos = JSON.parse(readFileSync('public/mapa/tagmar-rotulos.json', 'utf8')).rotulos.filter((r) => GEO_TIPOS.includes(r.tipo));
const ESTILO = ['cor', 'negrito', 'italico', 'caixa', 'contorno', 'tam'];
const r1 = (n) => Math.round(n * 10) / 10;

let feitos = 0, sem = 0;
const lugares = mundo.dados.lugares.map((l) => {
  if (!String(l.id).startsWith('tx') || l.estilo) return l;
  const r = rotulos.find((r0) => { const m = mods[r0.id] || {}; return r1(m.x != null ? m.x : r0.x) === l.x && r1(m.y != null ? m.y : r0.y) === l.y; });
  if (!r) { sem++; console.log('sem par:', l.nome); return l; }
  const m = mods[r.id] || {};
  feitos++;
  return { ...l, estilo: { geo: r.tipo, imp: r.importancia, ...Object.fromEntries(ESTILO.filter((k) => m[k] != null).map((k) => [k, m[k]])) } };
});
if (feitos) {
  const { error } = await sb.from('catalogo_mundo').update({ dados: { ...mundo.dados, lugares }, updated_at: new Date().toISOString() }).eq('tipo', 'mapa').eq('slug', 'mundo');
  if (error) throw new Error(error.message);
}
console.log(`com estilo: ${feitos}; sem par: ${sem}`);
