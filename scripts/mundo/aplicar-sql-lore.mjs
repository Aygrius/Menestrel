/* APLICA UM SCRIPT DE LORE (16/11/2026)
 *
 *   node scripts/mundo/aplicar-sql-lore.mjs scripts/sql/<arquivo>.sql
 *
 * Os lotes de ambientação (reinos, cidades, locais, npcs) ficam salvos em
 * scripts/sql como SQL, o padrão da base, mas a máquina não tem conexão
 * direta com o Postgres. Este script lê o arquivo e aplica pela API do
 * Supabase, com a SUPABASE_SERVICE_ROLE_KEY do .env.local.
 *
 * Entende só as duas formas que esses lotes usam:
 *   INSERT INTO public.<tabela> (c1, c2, …) VALUES (…), (…) ON CONFLICT (slug) DO NOTHING;
 *   UPDATE public.<tabela> SET <col> = <valor> WHERE slug = <valor> [AND <col> IS NULL];
 * Valores: $t$…$t$, '…' (com '' para aspas), NULL, true, false e números.
 * BEGIN/COMMIT e comentários -- são ignorados. Não há transação: como os
 * lotes são idempotentes (DO NOTHING; IS NULL), rodar de novo completa.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const arq = process.argv[2];
if (!arq) { console.error('Uso: node scripts/mundo/aplicar-sql-lore.mjs <arquivo.sql>'); process.exit(1); }
const src = readFileSync(arq, 'utf8').replace(/\r\n/g, '\n');

/* Lê um valor a partir de i; devolve [valor, próximo i]. */
function valor(s, i) {
  while (/\s/.test(s[i])) i++;
  if (s.startsWith('$t$', i)) { const f = s.indexOf('$t$', i + 3); return [s.slice(i + 3, f), f + 3]; }
  if (s[i] === "'") {
    let j = i + 1, out = '';
    for (;;) { if (s[j] === "'" && s[j + 1] === "'") { out += "'"; j += 2; } else if (s[j] === "'") break; else out += s[j++]; }
    return [out, j + 1];
  }
  const m = s.slice(i).match(/^(NULL|null|true|false|-?\d+(\.\d+)?)/);
  if (!m) throw new Error('valor ilegível perto de: ' + s.slice(i, i + 60));
  const t = m[1];
  return [t.toLowerCase() === 'null' ? null : t === 'true' ? true : t === 'false' ? false : Number(t), i + t.length];
}

/* Separa as instruções por ';' fora de $t$, aspas e comentários. */
const instr = []; let atual = '';
for (let i = 0; i < src.length;) {
  if (src.startsWith('--', i)) { const f = src.indexOf('\n', i); i = f < 0 ? src.length : f; continue; }
  if (src.startsWith('$t$', i)) { const f = src.indexOf('$t$', i + 3) + 3; atual += src.slice(i, f); i = f; continue; }
  if (src[i] === "'") { let j = i + 1; while (!(src[j] === "'" && src[j + 1] !== "'")) j += src[j] === "'" ? 2 : 1; atual += src.slice(i, j + 1); i = j + 1; continue; }
  if (src[i] === ';') { if (atual.trim()) instr.push(atual.trim()); atual = ''; i++; continue; }
  atual += src[i++];
}

let gravados = 0, pulados = 0, atualizados = 0;
for (const s of instr) {
  if (/^(BEGIN|COMMIT)$/i.test(s)) continue;
  let m = s.match(/^INSERT INTO public\.(\w+)\s*\(([^)]*)\)\s*VALUES/i);
  if (m) {
    const tabela = m[1], cols = m[2].split(',').map((c) => c.trim());
    const linhas = []; let i = m[0].length;
    for (;;) {
      while (/\s|,/.test(s[i])) i++;
      if (s[i] !== '(') break;
      i++; const row = {};
      for (let k = 0; k < cols.length; k++) { const [v, j] = valor(s, i); row[cols[k]] = v; i = j; while (/\s/.test(s[i])) i++; if (s[i] === ',') i++; }
      while (/\s/.test(s[i])) i++;
      if (s[i] !== ')') throw new Error(`${tabela}: colunas a mais em ${row.slug}`);
      i++; linhas.push(row);
    }
    if (!/ON CONFLICT \(slug\) DO NOTHING\s*$/i.test(s.slice(i))) throw new Error(`${tabela}: só entendo ON CONFLICT (slug) DO NOTHING`);
    const { data: ja, error: e1 } = await sb.from(tabela).select('slug').in('slug', linhas.map((l) => l.slug));
    if (e1) throw new Error(`${tabela}: ${e1.message}`);
    const novos = linhas.filter((l) => !ja.some((x) => x.slug === l.slug));
    pulados += linhas.length - novos.length;
    if (novos.length) { const { error } = await sb.from(tabela).insert(novos); if (error) throw new Error(`${tabela}: ${error.message}`); }
    gravados += novos.length;
    continue;
  }
  m = s.match(/^UPDATE public\.(\w+)\s+SET\s+(\w+)\s*=\s*/i);
  if (m) {
    const [v, j] = valor(s, m[0].length);
    const resto = s.slice(j).match(/^\s*WHERE slug\s*=\s*/i);
    if (!resto) throw new Error('UPDATE sem WHERE slug: ' + s.slice(0, 80));
    const [slug, k] = valor(s, j + resto[0].length);
    const soVazio = /AND\s+(\w+)\s+IS NULL\s*$/i.exec(s.slice(k));
    let q = sb.from(m[1]).update({ [m[2]]: v }).eq('slug', slug);
    if (soVazio) q = q.is(soVazio[1], null);
    const { data, error } = await q.select('slug');
    if (error) throw new Error(`${m[1]}.${m[2]}: ${error.message}`);
    atualizados += data.length;
    continue;
  }
  throw new Error('instrução que não sei aplicar: ' + s.slice(0, 80));
}
console.log(`${gravados} gravados, ${pulados} já existiam, ${atualizados} campos atualizados.`);
