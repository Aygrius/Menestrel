/* SOBE ENTIDADES E GRUPOS PARA O BANCO (15/11/2026)
 *
 *   node scripts/mundo/subir-catalogo.mjs <arquivo.js>
 *
 * Usuário: "O texto original não precisa ser guardado, minha conta é de admin
 * master, eu que estou criando a história. Usamos o PDF apenas como pontapé
 * inicial. E iremos subir mais coisas da ambientação."
 *
 * O banco (catalogo_mundo) é a única fonte de Entidades e Grupos. Este script
 * é o caminho para subir um lote escrito fora da tela (pela skill
 * cronista-de-tagmar, por exemplo): o arquivo exporta
 *     export default { entidades: [...], grupos: [...] }
 * no formato da ficha (slug, nome, classe/tipo, prefacio, descricao, ...).
 * Cada entrada é gravada inteira; o que já existir com o mesmo slug é
 * substituído.
 *
 * CHAVE: SUPABASE_SERVICE_ROLE_KEY no .env.local (Supabase → Project
 * Settings → API Keys). Ela fica só na sua máquina.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltam VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.'); process.exit(1);
}
const arq = process.argv[2];
if (!arq) { console.error('Uso: node scripts/mundo/subir-catalogo.mjs <arquivo.js>'); process.exit(1); }
const lote = (await import(pathToFileURL(resolve(arq)).href)).default || {};

const linhas = [
  ...(lote.entidades || []).map((d) => ({ tipo: 'entidade', slug: d.slug, dados: d })),
  ...(lote.grupos || []).map((d) => ({ tipo: 'grupo', slug: d.slug, dados: d })),
];
const ruins = linhas.filter((l) => !l.slug || !/^[a-z0-9_-]+$/.test(l.slug) || !l.dados.nome);
if (ruins.length) { console.error('Entradas sem slug válido ou sem nome:', ruins.map((l) => l.slug || '(sem slug)').join(', ')); process.exit(1); }

const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const agora = new Date().toISOString();
const { error } = await sb.from('catalogo_mundo').upsert(linhas.map((l) => ({ ...l, updated_at: agora })));
if (error) { console.error('Falhou:', error.message); process.exit(1); }
const { count } = await sb.from('catalogo_mundo').select('slug', { count: 'exact', head: true });
console.log(`${linhas.length} entradas gravadas. O catálogo tem ${count} no total.`);
