/* ============================================================
   tooltip-padrao.test.js — nenhum tooltip nativo do navegador
   ============================================================
   Padronização de 08/09/2026: todo tooltip do sistema usa o componente do
   projeto (Tooltip/.mn-tip, ou os equivalentes locais PortalTooltip e
   NavTooltip, que têm a mesma pele). O atributo `title` do HTML foi banido
   porque o navegador o desenha com a própria cara — fonte do sistema, fundo
   claro, atraso fixo — e nenhum CSS nosso o alcança.

   O caminho é `{...propsTip(abrirTip, fecharTip, texto)}` (01-core/helpers.jsx),
   que também dá tooltip a quem navega por teclado, coisa que o `title` nunca fez.

   Este teste varre o código-fonte, não o DOM: um `title` que volte a um botão
   passaria por qualquer teste de render, porque o DOM fica correto — o que
   quebra é só a aparência. Foi assim que as 60 ocorrências se acumularam.

   EXCEÇÕES LEGÍTIMAS, e por quê:
     • `title` passado a COMPONENTE (<ModalShell title=…>) é o título do
       painel, não tooltip;
     • <iframe title="…"> é exigência de acessibilidade, não tooltip;
     • title="" é o truque para SUPRIMIR o tooltip nativo em quem já usa o
       nosso (ChipIcon do bestiário e das histórias);
     • comentários e testes.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function arquivosJsx(dir, acc = []) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) arquivosJsx(caminho, acc);
    else if (nome.endsWith('.jsx') && !nome.endsWith('.test.jsx')) acc.push(caminho);
  }
  return acc;
}

// Nome da tag imediatamente antes do índice dado. Componente = maiúscula.
function tagAntes(texto, idx) {
  const trecho = texto.slice(Math.max(0, idx - 3000), idx);
  const m = [...trecho.matchAll(/<([A-Za-z][\w.]*)/g)].pop();
  return m ? m[1] : null;
}

function tooltipsNativos(caminho) {
  const src = readFileSync(caminho, 'utf8');
  const linhas = src.split('\n');
  const achados = [];
  const re = /\stitle=(\{|"|')/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const linhaN = src.slice(0, m.index).split('\n').length;
    const linha = linhas[linhaN - 1];
    if (/^\s*(\/\/|\*|\/\*)/.test(linha)) continue;        // comentário
    if (/\stitle=""/.test(m[0] + src.slice(m.index + m[0].length, m.index + m[0].length + 1))) continue;
    const tag = tagAntes(src, m.index);
    if (!tag) continue;
    if (/^[A-Z]/.test(tag)) continue;                      // prop de componente
    if (tag === 'iframe') continue;                        // acessibilidade
    // title="" — supressor de quem já tem tooltip próprio
    const depois = src.slice(m.index, m.index + 30);
    if (/\stitle=""/.test(depois)) continue;
    achados.push(`${caminho}:${linhaN}  <${tag}>  ${linha.trim().slice(0, 70)}`);
  }
  return achados;
}

describe('tooltip padronizado — sem `title` nativo em elemento HTML', () => {
  const arquivos = arquivosJsx('src');

  it('varreu um número plausível de arquivos de fase', () => {
    expect(arquivos.length).toBeGreaterThan(10);
  });

  it('nenhum elemento HTML usa o tooltip do navegador', () => {
    const todos = arquivos.flatMap(tooltipsNativos);
    expect(todos, `use {...propsTip(abrirTip, fecharTip, texto)}:\n${todos.join('\n')}`).toEqual([]);
  });

  it('propsTip existe e ignora conteúdo vazio', async () => {
    await import('./helpers.jsx');
    const { propsTip } = window;
    expect(propsTip, 'propsTip precisa estar no window').toBeDefined();
    // Vazio não abre balão — protege o caso `title={bloqueio || ''}`.
    expect(propsTip(() => {}, () => {}, '')).toEqual({});
    expect(propsTip(() => {}, () => {}, null)).toEqual({});
    expect(propsTip(() => {}, () => {}, undefined)).toEqual({});
    expect(propsTip(() => {}, () => {}, { title: '', desc: '' })).toEqual({});
    // Com conteúdo, entrega mouse E teclado.
    const p = propsTip(() => {}, () => {}, 'Pontos insuficientes');
    expect(Object.keys(p).sort()).toEqual(['onBlur', 'onFocus', 'onMouseEnter', 'onMouseLeave']);
  });
});
