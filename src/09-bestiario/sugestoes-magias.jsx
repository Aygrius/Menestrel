/* ============================================================
   SUGESTÕES — os documentos, nas páginas de Magias, Técnicas e Itens
   ============================================================
   "Documento de sugestões na página junto com conferência." (usuário,
   12/09/2026) — e, no mesmo dia, "sugestões de técnicas e itens para uso em
   batalha". O nome do arquivo ficou o da primeira; os três painéis moram aqui.

   Cada documento mora em docs/sugestoes-*.md e é LIDO de lá, não copiado
   para cá: editar o arquivo muda a página no próximo build. Duas cópias do
   mesmo texto divergiriam no primeiro ajuste — foi a lição mais repetida
   deste projeto.

   O projeto não tem biblioteca de markdown, e o documento usa pouco: títulos,
   parágrafos, listas (com tabela dentro de item), tabelas, citações, bloco de
   código, régua, negrito, itálico e código inline. MarkdownSimples cobre
   exatamente isso e monta ELEMENTOS React — nada de HTML cru injetado.

   Só para admin, ao lado da Verificação do catálogo (MagiasList).
   ============================================================ */
import textoMagias from '../../docs/sugestoes-magias.md?raw';
/* Técnicas e itens entraram no mesmo dia: "Faça sugestões de técnicas e itens
   para uso em batalha." Um painel só para os três documentos — cada página
   passa o seu. */
import textoTecnicas from '../../docs/sugestoes-tecnicas.md?raw';
import textoItens from '../../docs/sugestoes-itens.md?raw';
// "Análise para diminuir as magias pouco interessantes e fundir as parecidas" (12/09/2026).
import textoEstudoMagias from '../../docs/estudo-magias.md?raw';

// ── Inline: `código`, **negrito**, *itálico* ────────────────────────────────
function mdInline(texto, chave) {
  const partes = String(texto).split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g);
  return partes.filter((p) => p !== '').map((p, i) => {
    const k = `${chave}-${i}`;
    if (p.startsWith('`') && p.endsWith('`')) return <code key={k}>{p.slice(1, -1)}</code>;
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={k}>{mdInline(p.slice(2, -2), k)}</strong>;
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <em key={k}>{mdInline(p.slice(1, -1), k)}</em>;
    return p;
  });
}

const RE_ITEM_UL = /^[-*]\s+/;
const RE_ITEM_OL = /^\d+\.\s+/;
const celulas = (linha) => linha.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const ehSeparadorTabela = (linha) => /^\|?\s*:?-{3,}/.test(linha.trim());

// ── Blocos ──────────────────────────────────────────────────────────────────
function mdBlocos(linhas, prefixo) {
  const out = [];
  let i = 0;
  const k = () => `${prefixo}-${out.length}`;

  while (i < linhas.length) {
    const linha = linhas[i];
    const t = linha.trim();

    if (!t) { i += 1; continue; }

    // Bloco de código
    if (t.startsWith('```')) {
      const corpo = [];
      i += 1;
      while (i < linhas.length && !linhas[i].trim().startsWith('```')) { corpo.push(linhas[i]); i += 1; }
      i += 1;
      out.push(<pre key={k()} className="sug-pre">{corpo.join('\n')}</pre>);
      continue;
    }

    // Régua
    if (/^-{3,}$/.test(t)) { out.push(<hr key={k()} className="sug-hr" />); i += 1; continue; }

    // Títulos
    const h = /^(#{1,4})\s+(.*)$/.exec(t);
    if (h) {
      const Tag = `h${Math.min(6, h[1].length + 2)}`;   // # vira h3: a página já tem h2
      out.push(<Tag key={k()} className={`sug-h sug-h${h[1].length}`}>{mdInline(h[2], k())}</Tag>);
      i += 1;
      continue;
    }

    // Tabela
    if (t.startsWith('|')) {
      const bloco = [];
      while (i < linhas.length && linhas[i].trim().startsWith('|')) { bloco.push(linhas[i]); i += 1; }
      const cab = celulas(bloco[0]);
      const corpo = bloco.slice(1).filter((l) => !ehSeparadorTabela(l)).map(celulas);
      const kk = k();
      out.push(
        <div key={kk} className="sug-tabela-wrap">
          <table className="sug-tabela">
            <thead><tr>{cab.map((c, j) => <th key={j}>{mdInline(c, `${kk}-h${j}`)}</th>)}</tr></thead>
            <tbody>
              {corpo.map((r, ri) => (
                <tr key={ri}>{r.map((c, j) => <td key={j}>{mdInline(c, `${kk}-${ri}-${j}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Citação
    if (t.startsWith('>')) {
      const corpo = [];
      while (i < linhas.length && linhas[i].trim().startsWith('>')) {
        corpo.push(linhas[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      out.push(<blockquote key={k()} className="sug-citacao">{mdBlocos(corpo, k())}</blockquote>);
      continue;
    }

    // Listas — o item pode ter continuação indentada, inclusive uma tabela
    if (RE_ITEM_UL.test(t) || RE_ITEM_OL.test(t)) {
      const ordenada = RE_ITEM_OL.test(t);
      const re = ordenada ? RE_ITEM_OL : RE_ITEM_UL;
      const itens = [];
      while (i < linhas.length) {
        const l = linhas[i];
        const lt = l.trim();
        if (re.test(lt) && !/^\s{2,}/.test(l)) {
          itens.push([lt.replace(re, '')]);
          i += 1;
        } else if (lt && /^\s{2,}/.test(l) && itens.length) {
          itens[itens.length - 1].push(l.replace(/^\s{2,4}/, ''));
          i += 1;
        } else if (!lt && i + 1 < linhas.length && /^\s{2,}\S/.test(linhas[i + 1]) && itens.length) {
          itens[itens.length - 1].push('');
          i += 1;
        } else if (!lt && i + 1 < linhas.length && re.test(linhas[i + 1].trim())
                   && !/^\s{2,}/.test(linhas[i + 1]) && itens.length) {
          /* Linha em branco ENTRE itens da mesma lista (o item 5 dos
             desequilíbrios termina numa tabela, e o 6 vem depois de um branco).
             Sem isto a lista quebrava em duas e a numerada recomeçava em 1. */
          i += 1;
        } else {
          break;
        }
      }
      const Tag = ordenada ? 'ol' : 'ul';
      const kk = k();
      out.push(
        <Tag key={kk} className="sug-lista">
          {itens.map((it, j) => {
            // Item de uma linha só: sem <p>, para a lista ficar compacta.
            const soTexto = it.filter((x) => x.trim()).length === 1 && !/^[|>#]/.test(it[0]);
            return <li key={j}>{soTexto ? mdInline(it[0], `${kk}-${j}`) : mdBlocos(it, `${kk}-${j}`)}</li>;
          })}
        </Tag>
      );
      continue;
    }

    // Parágrafo: junta linhas até um bloco novo ou linha vazia
    const par = [];
    while (i < linhas.length) {
      const lt = linhas[i].trim();
      if (!lt || /^(#{1,4}\s|\||>|```|-{3,}$)/.test(lt) || RE_ITEM_UL.test(lt) || RE_ITEM_OL.test(lt)) break;
      par.push(lt);
      i += 1;
    }
    out.push(<p key={k()} className="sug-p">{mdInline(par.join(' '), k())}</p>);
  }
  return out;
}

function MarkdownSimples({ texto }) {
  const linhas = String(texto || '').replace(/\r\n?/g, '\n').split('\n');
  return <div className="sug-md">{mdBlocos(linhas, 'md')}</div>;
}

/* O painel: mesma faixa recolhível da Verificação do catálogo, fechado por
   padrão — é leitura longa, não pode empurrar a tabela para baixo. */
function SugestoesPainel({ lang, texto, titulo, arquivo }) {
  const [aberto, setAberto] = React.useState(false);
  const en = lang === 'en';
  if (!texto) return null;
  return (
    <div className="best-auditoria sug-painel">
      <button type="button" className="best-aud-head" onClick={() => setAberto((v) => !v)}>
        <span className="best-aud-chevron" style={{ transform: aberto ? 'rotate(90deg)' : 'none' }}>›</span>
        <strong>{en ? titulo.en : titulo.pt}</strong>
        <span className="best-aud-resumo">
          {en ? 'new entries and adaptations — proposals, nothing applied' : 'novidades e adaptações — propostas, nada aplicado'}
        </span>
      </button>
      {aberto && (
        <div className="best-aud-corpo">
          <p className="best-aud-ajuda">
            {en
              ? `Reference document (${arquivo}). Live numbers come from the catalog itself.`
              : `Documento de referência (${arquivo}). Os números ao vivo vêm do próprio catálogo.`}
          </p>
          <MarkdownSimples texto={texto} />
        </div>
      )}
    </div>
  );
}

function MagiasSugestoesPainel({ lang, texto }) {
  return <SugestoesPainel lang={lang} texto={texto != null ? texto : textoMagias}
    titulo={{ pt: 'Sugestões de magias', en: 'Spell suggestions' }} arquivo="docs/sugestoes-magias.md" />;
}
function TecnicasSugestoesPainel({ lang, texto }) {
  return <SugestoesPainel lang={lang} texto={texto != null ? texto : textoTecnicas}
    titulo={{ pt: 'Sugestões de técnicas', en: 'Technique suggestions' }} arquivo="docs/sugestoes-tecnicas.md" />;
}
function ItensSugestoesPainel({ lang, texto }) {
  return <SugestoesPainel lang={lang} texto={texto != null ? texto : textoItens}
    titulo={{ pt: 'Sugestões de itens para batalha', en: 'Battle item suggestions' }} arquivo="docs/sugestoes-itens.md" />;
}

function EstudoMagiasPainel({ lang, texto }) {
  return <SugestoesPainel lang={lang} texto={texto != null ? texto : textoEstudoMagias}
    titulo={{ pt: 'Estudo: enxugar e melhorar as magias', en: 'Study: trimming and improving spells' }} arquivo="docs/estudo-magias.md" />;
}

Object.assign(window, {
  EstudoMagiasPainel, SugestoesPainel, MagiasSugestoesPainel, TecnicasSugestoesPainel, ItensSugestoesPainel, MarkdownSimples,
});
