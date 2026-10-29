/* ============================================================
   ficha-hooks-antes-dos-returns.test.js — a ficha não pode deixar
   de abrir por causa de um hook no lugar errado
   ============================================================
   Bug de 06/10/2026, relatado pelo usuário: "a ficha do personagem não está
   abrindo."

   A CAUSA. `FichaPersonagem` tem returns de carregamento no meio do corpo —
   `if (!pj || catalogo === null …) return <Carregando/>`. Um hook declarado
   DEPOIS deles só é chamado quando os dados já chegaram: na primeira passada o
   componente chama N hooks, na segunda chama N+1, e o React recusa a mudança
   de contagem com "Rendered more hooks than during the previous render". A
   ficha inteira morre, não só o pedaço novo.

   Foi um `useEffect` de vencimento de forma (vampiro/lobisomem) acrescentado
   700 linhas abaixo dos returns. O arquivo já avisava — o hook de
   `criaturasDosAnimais` tem o comentário "Hook antes dos returns de loading" —,
   mas um comentário a 300 linhas de distância não segura ninguém.

   POR QUE UM TESTE DE FONTE, e não de montagem. Montar FichaPersonagem exige
   dublar o Supabase inteiro (personagens, histórias, catálogo, magias,
   técnicas, habilidades, realtime) para 5.900 linhas de componente — e mesmo
   assim só pegaria o caminho que o dublê reproduzisse. A regra, por outro
   lado, é estrutural e vale para QUALQUER hook que alguém acrescente amanhã:
   nenhum depois do primeiro return. É isso que esta varredura trava.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const FONTE = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'ficha.jsx'), 'utf8');

/* O corpo de FichaPersonagem: do `function` dele até o começo do próximo
   componente no escopo do módulo (uma linha que abre com `function ` ou
   `const X = (`, sem indentação). */
function corpoDe(nome) {
  const i = FONTE.indexOf(`function ${nome}(`);
  expect(i, `não achei function ${nome}`).toBeGreaterThan(-1);
  const resto = FONTE.slice(i + 1);
  const fim = resto.search(/\n(?:function |const [A-Z]\w* = |window\.\w+ =)/);
  return resto.slice(0, fim === -1 ? undefined : fim);
}

/* Os returns de NÍVEL 1 do componente — os que encerram o render. Pegos pela
   indentação: `    return` com quatro espaços, dentro de um `  if (` de dois.
   Callbacks e helpers internos moram mais fundo e não contam. */
const HOOK = /^\s{2}(?:const\s+[^=]+=\s*)?(?:React\.)?use(?:Effect|Memo|State|Ref|Callback|Context|LayoutEffect|Reducer)\s*\(/m;

describe('FichaPersonagem — todo hook antes do primeiro return', () => {
  const corpo = corpoDe('FichaPersonagem');

  it('o marco dos returns de carregamento existe', () => {
    // Se este comentário sair, o teste perde a âncora e tem de ser refeito —
    // falhar aqui é mais honesto do que varrer o arquivo inteiro à toa.
    expect(corpo).toContain('// Loading / error.');
  });

  it('nenhum hook depois do primeiro return de carregamento', () => {
    const corte = corpo.indexOf('// Loading / error.');
    expect(corte).toBeGreaterThan(-1);
    const depois = corpo.slice(corte);
    const achado = HOOK.exec(depois);
    const trecho = achado
      ? depois.slice(Math.max(0, achado.index - 120), achado.index + achado[0].length)
      : '';
    expect(achado,
      'Hook declarado DEPOIS dos returns de carregamento — a ficha não abre '
      + '("Rendered more hooks than during the previous render"). '
      + 'Mova-o para cima do comentário "// Loading / error.".\n'
      + 'Trecho:\n' + trecho,
    ).toBeNull();
  });

  it('e o corpo examinado é o da ficha mesmo, não um pedaço solto', () => {
    // Guarda contra o recorte quebrar e o teste passar olhando o nada.
    expect(corpo.length).toBeGreaterThan(50000);
    expect(corpo).toContain('const [pj, setPj] = useState(null)');
    expect(HOOK.test(corpo)).toBe(true);     // há hooks ANTES do corte
  });
});

/* As outras telas grandes com returns de carregamento no meio. Mesma armadilha,
   e é barato cobri-las aqui em vez de esperar cada uma quebrar. */
describe('as outras views com returns de carregamento', () => {
  it('FichaAnimaisView devolve null antes de qualquer hook próprio', () => {
    const corpo = corpoDe('FichaAnimaisView');
    // `if (!atual) return null;` vem antes de tudo; os hooks das barras moram
    // em AnimalVitBars, componente próprio — é o arranjo certo.
    const corte = corpo.indexOf('if (!atual) return null;');
    expect(corte).toBeGreaterThan(-1);
    expect(HOOK.test(corpo.slice(0, corte))).toBe(false);
  });
});
