/* ============================================================
   jornal-pele.test.js — o Jornal não pode voltar a sair sem pele
   ============================================================
   O Jornal de Aventuras (06/10/2026) nasceu FUNCIONANDO e SEM CSS: as vinte
   classes `.jornal-*` do componente não tinham uma única regra em
   `src/index.css`. A tela abria, salvava, excluía — e aparecia como texto
   solto na ficha da cidade. Ninguém percebeu porque nada quebra: classe sem
   regra não é erro em lugar nenhum da pilha.

   É por isso que este teste lê a FONTE. Um teste de DOM montaria o componente
   e passaria igual: os elementos estão lá, com as classes certas. O que
   faltava era do outro lado do arquivo.

   A regra que ele trava é simples e vale para qualquer tela nova: toda classe
   `jornal-*` que o JSX escreve tem de ter dono no CSS. Classe nova sem regra
   quebra aqui, no commit, e não meses depois quando alguém abrir a cidade.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fonte = readFileSync(resolve(raiz, '13-diario/jornal-aventuras.jsx'), 'utf8');
const css = readFileSync(resolve(raiz, 'index.css'), 'utf8');

/* As classes `jornal-*` escritas no componente. `className="a b c"` e
   `className={'a' + (x ? ' b' : '')}` — por isso a varredura é por token no
   texto inteiro dos atributos de classe, e não por igualdade de string. */
const classesNoJsx = [...new Set(
  (fonte.match(/className=\{?['"][^'"]*['"]/g) || [])
    .flatMap((m) => m.match(/jornal-[a-z-]+/g) || []),
)].sort();

/* `'jornal-campo jornal-campo--' + c.tipo` monta o modificador em tempo de
   render, e a varredura acima pega só o prefixo. Das três variantes de
   AVENTURA_CAMPOS, só `--area` carrega decisão: a prosa ocupa a faixa toda do
   formulário, porque campo de texto longo em meia largura mente sobre o quanto
   se espera que seja escrito ali. `--texto` e `--numero` saem no DOM de
   propósito, sem regra: o desenho trata os dois igual, e uma regra vazia só
   para o teste passar seria CSS morto. */
const VARIANTES = ['jornal-campo--area'];

describe('o Jornal de Aventuras tem pele', () => {
  it('a varredura achou as classes do componente (guarda do próprio teste)', () => {
    expect(classesNoJsx.length).toBeGreaterThan(15);
    expect(classesNoJsx).toContain('jornal-anuncio');
    expect(classesNoJsx).toContain('jornal-manchete');
    expect(classesNoJsx).toContain('jornal-fim-texto');
  });

  it.each([...classesNoJsx, ...VARIANTES])('.%s tem regra no index.css', (classe) => {
    expect(css, `a classe .${classe} é escrita no JSX e não tem regra nenhuma`)
      .toMatch(new RegExp('\\.' + classe + '\\b'));
  });

  /* Três decisões de direção que o CSS carrega e que um "tem regra" não
     garante — elas são o contrato do Quadro de Iniciativa nesta tela. */
  it('o nome da aventura é o único Cinzel, e de 18px para cima', () => {
    const i = css.indexOf('.jornal-nome {');
    const regra = css.slice(i, css.indexOf('}', i));
    expect(regra).toMatch(/font-family: var\(--font-title\)/);
    expect(regra).toMatch(/font-size: var\(--fs-titulo\)/);
    // E nenhuma outra classe do jornal chama a fonte de título.
    const outras = (css.match(/\.jornal-(?!nome)[a-z-]+[^{]*\{[^}]*--font-title[^}]*\}/g) || []);
    expect(outras, 'Cinzel fora do nome da aventura').toEqual([]);
  });

  it('o Fim guardado não usa ouro nem brasa — ele não é vivo nem alerta', () => {
    const i = css.indexOf('.jornal-fim-texto {');
    const regra = css.slice(i, css.indexOf('}', i));
    expect(regra).not.toMatch(/--vivo|--alerta/);
  });

  it('a prosa do chamado tem medida de leitura', () => {
    const i = css.indexOf('.jornal-inicio {');
    expect(css.slice(i, css.indexOf('}', i))).toMatch(/max-width:\s*\d+ch/);
  });
});
