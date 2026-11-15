/* ENVIA OS LADRILHOS DO MAPA PARA O STORAGE (15/11/2026)
 *
 *   node scripts/mapa/subir.mjs [versao]
 *
 * Lê preview/mapa/ladrilhos (feito por scripts/mapa/cortar.ps1) e envia para o
 * bucket público `mapas`:
 *     oriental/<versao>/<nivel>/<x>_<y>.png   — cache de um ano (nunca mudam)
 *     oriental/mapa.json                      — { versao, niveis }, cache curto
 * O app lê o mapa.json e monta o endereço dos ladrilhos com a versão dele
 * (13-diario/mapa.jsx). Pintura nova = versão nova: ninguém fica com ladrilho
 * velho no cache do navegador, e a troca só vale quando o mapa.json é gravado,
 * no fim — quem está com o mapa aberto não vê metade de cada pintura.
 *
 * CHAVE. O app não envia nada para este bucket, então não existe policy de
 * escrita. Para enviar, ponha no .env.local a chave de serviço do projeto:
 *     SUPABASE_SERVICE_ROLE_KEY=...
 * (Supabase → Project Settings → API). Ela fica só na sua máquina: o
 * .env.local não sobe para o git nem para a Vercel.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const url = env.VITE_SUPABASE_URL, chave = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
if (!url || !chave) { console.error('Faltam VITE_SUPABASE_URL e a chave no .env.local.'); process.exit(1); }
if (!env.SUPABASE_SERVICE_ROLE_KEY) console.warn('Sem SUPABASE_SERVICE_ROLE_KEY: tentando com a chave pública (só passa se houver uma policy de envio aberta).');

const origem = 'preview/mapa/ladrilhos';
if (!existsSync(join(origem, 'mapa.json'))) { console.error('Rode antes: powershell -ExecutionPolicy Bypass -File scripts/mapa/cortar.ps1'); process.exit(1); }
const { niveis } = JSON.parse(readFileSync(join(origem, 'mapa.json'), 'utf8'));
const agora = new Date(), dois = (n) => String(n).padStart(2, '0');
const versao = process.argv[2] || `${agora.getFullYear()}${dois(agora.getMonth() + 1)}${dois(agora.getDate())}-${dois(agora.getHours())}${dois(agora.getMinutes())}`;

const sb = createClient(url, chave, { auth: { persistSession: false } });
const balde = sb.storage.from('mapas');
const fila = [];
for (const n of niveis) for (const arq of readdirSync(join(origem, String(n.z)))) fila.push(`${n.z}/${arq}`);
console.log(`${fila.length} ladrilhos → mapas/oriental/${versao}/`);

let feitos = 0; const falhas = [];
async function enviar(rel, tentativa = 1) {
  const { error } = await balde.upload(`oriental/${versao}/${rel}`, readFileSync(join(origem, rel)), { contentType: 'image/png', cacheControl: '31536000', upsert: true });
  if (error && tentativa < 4) { await new Promise((r) => setTimeout(r, 800 * tentativa)); return enviar(rel, tentativa + 1); }
  if (error) falhas.push(`${rel}: ${error.message}`);
  if (++feitos % 50 === 0 || feitos === fila.length) console.log(`  ${feitos}/${fila.length}`);
}
const operarios = Array.from({ length: 6 }, async () => { while (fila.length) await enviar(fila.shift()); });
await Promise.all(operarios);
if (falhas.length) { console.error(`${falhas.length} falharam; o mapa.json NÃO foi trocado.\n` + falhas.slice(0, 10).join('\n')); process.exit(1); }

const { error } = await balde.upload('oriental/mapa.json', Buffer.from(JSON.stringify({ versao, niveis })), { contentType: 'application/json', cacheControl: '60', upsert: true });
if (error) { console.error('Ladrilhos enviados, mas o mapa.json falhou: ' + error.message); process.exit(1); }
console.log(`Pronto. O mapa agora usa a versão ${versao}.`);
