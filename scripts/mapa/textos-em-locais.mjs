/* OS TEXTOS DO MAPA VIRAM LOCAIS (21/11/2026)
 *
 *   node scripts/mapa/textos-em-locais.mjs
 *
 * Usuário: "Eu quero que os textos atuais virem locais e não existe mais
 * textos." Cada nome da geografia (public/mapa/tagmar-rotulos.json, com as
 * correções da ferramenta Nomes em catalogo_mundo 'mapa'/'geografia') vira:
 *   - uma ficha na tabela locais (aba Locais), se ainda não houver uma com o
 *     mesmo nome; e
 *   - um lugar do tipo 'local' na camada do mundo (catalogo_mundo 'mapa'/'mundo'),
 *     no ponto do texto.
 * Fica de fora o texto excluído na ferramenta Nomes e o que repete uma cidade,
 * reino ou local que já está no mapa ali perto.
 * Escreve o SQL em scripts/sql/textos-em-locais-2026-11-21.sql, com cópias de
 * segurança e o comando para desfazer.
 *
 * Precisa de SUPABASE_SERVICE_ROLE_KEY no .env.local.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const url = env.VITE_SUPABASE_URL, chave = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) { console.error('Faltam VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.'); process.exit(1); }
const sb = createClient(url, chave, { auth: { persistSession: false } });
const ler = async (q) => { const { data, error } = await q; if (error) throw new Error(error.message); return data; };

const mundo = await ler(sb.from('catalogo_mundo').select('dados').eq('tipo', 'mapa').eq('slug', 'mundo').single());
const geografia = await ler(sb.from('catalogo_mundo').select('dados').eq('tipo', 'mapa').eq('slug', 'geografia').maybeSingle());
const locais = await ler(sb.from('locais').select('slug, nome'));
const { rotulos } = JSON.parse(readFileSync('public/mapa/tagmar-rotulos.json', 'utf8'));
const mods = (geografia && geografia.dados && geografia.dados.rotulos) || {};

// O mesmo "mesmo nome" do mapa (mapa.jsx, nomeGeo): sem acento, sem preposição, sem plural.
const semAcento = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nomeGeo = (t) => semAcento(t).replace(/\b(de|do|da|dos|das)\b/g, '').replace(/[^a-z]/g, '').replace(/s/g, '');
const slugDe = (t) => semAcento(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const PERTO = 600;
const r1 = (n) => Math.round(n * 10) / 10;
const novoId = (i) => 'tx' + Date.now().toString(36) + i.toString(36);

const lugares = mundo.dados.lugares || [];
/* O local guarda o jeito de texto do mapa (estilo): o tipo da geografia (cor e
   letra, mapa.css), a importância (a faixa de zoom em que fala) e o que a
   ferramenta Nomes mudou (cor, negrito, itálico, maiúsculas, contorno, tamanho). */
const ESTILO = ['cor', 'negrito', 'italico', 'caixa', 'contorno', 'tam'];
const estiloDe = (r0, m) => ({ geo: r0.tipo, imp: r0.importancia, ...Object.fromEntries(ESTILO.filter((k) => m[k] != null).map((k) => [k, m[k]])) });
const fichaPorNome = new Map(locais.map((l) => [nomeGeo(l.nome), l]));
const slugs = new Set(locais.map((l) => l.slug));
const novasFichas = [], novosLugares = [], pulados = [];

const GEO_TIPOS = ['mar', 'lago', 'rio', 'serra', 'floresta', 'deserto', 'ilha', 'regiao', 'planicie', 'vulcao'];   // os textos que o mapa mostrava (mapa.jsx)
rotulos.filter((r) => GEO_TIPOS.includes(r.tipo)).forEach((r0, i) => {
  const m = mods[r0.id] || {};
  if (m.oculto) { pulados.push([r0.nome, 'excluído na ferramenta Nomes']); return; }
  const r = { ...r0, ...m, nome: String(m.nome || r0.nome).trim() };
  const k = nomeGeo(r.nome);
  const ja = lugares.find((l) => nomeGeo(l.nome) === k && dist(l, r) < PERTO);
  if (ja) { pulados.push([r.nome, `já no mapa como ${ja.tipo}`]); return; }
  let ficha = fichaPorNome.get(k);
  if (!ficha) {
    let slug = slugDe(r.nome) || 'local', n = 2;
    while (slugs.has(slug)) slug = `${slugDe(r.nome)}-${n++}`;
    slugs.add(slug);
    ficha = { slug, nome: r.nome };
    fichaPorNome.set(k, ficha); novasFichas.push(ficha);
  }
  novosLugares.push({ id: novoId(i), tipo: 'local', nome: ficha.nome, ficha: ficha.slug, x: r1(r.x), y: r1(r.y), estilo: estiloDe(r0, m) });
});

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const json = (o) => q(JSON.stringify(o));
const sql = `-- OS TEXTOS DO MAPA VIRAM LOCAIS (21/11/2026)
-- Gerado por scripts/mapa/textos-em-locais.mjs. Usuário: "Eu quero que os
-- textos atuais virem locais e não existe mais textos."
-- ${novasFichas.length} fichas novas em locais; ${novosLugares.length} locais novos no mapa do mundo;
-- ${pulados.length} textos ficaram de fora (excluídos ou repetidos de um lugar já no mapa).

create table if not exists public.backup_textos_locais_locais_20261121 as select * from public.locais;
create table if not exists public.backup_textos_locais_mundo_20261121 as select * from public.catalogo_mundo where tipo = 'mapa';

insert into public.locais (slug, nome) values
${novasFichas.map((f) => `  (${q(f.slug)}, ${q(f.nome)})`).join(',\n')}
on conflict (slug) do nothing;

update public.catalogo_mundo
   set dados = jsonb_set(dados, '{lugares}', coalesce(dados->'lugares', '[]'::jsonb) || ${json(novosLugares)}::jsonb), updated_at = now()
 where tipo = 'mapa' and slug = 'mundo';

-- Para desfazer:
--   update public.catalogo_mundo c set dados = b.dados from public.backup_textos_locais_mundo_20261121 b
--    where c.tipo = b.tipo and c.slug = b.slug;
--   delete from public.locais where slug not in (select slug from public.backup_textos_locais_locais_20261121);
`;
writeFileSync('scripts/sql/textos-em-locais-2026-11-21.sql', sql);
console.log(`fichas novas: ${novasFichas.length}; lugares novos: ${novosLugares.length}; de fora: ${pulados.length}`);
pulados.forEach(([n, p]) => console.log(`  - ${n}: ${p}`));
