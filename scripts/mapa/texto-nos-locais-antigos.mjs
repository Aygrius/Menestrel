/* OS LOCAIS QUE JÁ EXISTIAM FICAM COM O TEXTO DO MAPA (21/11/2026)
 *
 *   node scripts/mapa/texto-nos-locais-antigos.mjs          (só mostra)
 *   node scripts/mapa/texto-nos-locais-antigos.mjs --gravar
 *
 * Usuário: "Tem vários locais que já existem como 'texto' no mapa, eu quero
 * manter o local com o texto que já está no mapa. Vulcão Krokanon, alguns
 * rios..." textos-em-locais.mjs só reconheceu a ficha de nome igual; quando a
 * grafia do mapa diferia (Krokanom × Krokanon, Lires × Liris) nasceu uma ficha
 * nova e a antiga, com reino e descrição, ficou fora do mapa. Aqui:
 *   - o texto passa a apontar para a ficha antiga, e o que está escrito no mapa
 *     continua igual (estilo.texto);
 *   - a ficha nova, vazia, sai da tabela locais;
 *   - o pino solto que repete a ficha de um texto sai do mapa (o texto é o local).
 *
 * Cópia de segurança: backup_texto_locais_antigos_*_20261121 (feita antes, em SQL).
 * Precisa de SUPABASE_SERVICE_ROLE_KEY no .env.local.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ler = async (q) => { const { data, error } = await q; if (error) throw new Error(error.message); return data; };

// [ficha nova criada pelo texto, ficha antiga da aba Locais]
const PARES = [
  ['vulcao-krokanom', 'vulcao-krokanon'],
  ['rio-lires', 'rio-liris'],
  ['galpas', 'arquipelago-de-galpas'],
];

const mundo = await ler(sb.from('catalogo_mundo').select('dados').eq('tipo', 'mapa').eq('slug', 'mundo').single());
const locais = await ler(sb.from('locais').select('slug, nome'));
const fichas = new Map(locais.map((l) => [l.slug, l]));
let lugares = mundo.dados.lugares.map((l) => ({ ...l }));
const log = [], apagar = [];

for (const [nova, antiga] of PARES) {
  const fa = fichas.get(antiga);
  if (!fa) { log.push(`sem a ficha ${antiga}`); continue; }
  for (const l of lugares.filter((x) => x.ficha === nova && x.estilo)) {
    const escrito = l.estilo.texto || l.nome;
    l.ficha = antiga; l.nome = fa.nome;
    l.estilo = { ...l.estilo };
    if (escrito !== fa.nome) l.estilo.texto = escrito; else delete l.estilo.texto;
    log.push(`texto "${escrito}" -> ficha ${fa.nome}`);
  }
  if (!lugares.some((x) => x.ficha === nova) && fichas.has(nova)) apagar.push(nova);
}

const fichasDeTexto = new Set(lugares.filter((l) => l.estilo).map((l) => l.ficha));
lugares = lugares.filter((l) => {
  if (l.estilo || l.tipo !== 'local' || !fichasDeTexto.has(l.ficha)) return true;
  log.push(`pino repetido sai: ${l.nome} (${l.x}, ${l.y})`);
  return false;
});

log.forEach((f) => console.log('  ' + f));
console.log(`fichas novas a apagar: ${apagar.join(', ') || 'nenhuma'}`);
if (process.argv.includes('--gravar')) {
  const { error } = await sb.from('catalogo_mundo').update({ dados: { ...mundo.dados, lugares }, updated_at: new Date().toISOString() }).eq('tipo', 'mapa').eq('slug', 'mundo');
  if (error) throw new Error(error.message);
  if (apagar.length) { const { error: e2 } = await sb.from('locais').delete().in('slug', apagar); if (e2) throw new Error(e2.message); }
  console.log('gravado');
}
