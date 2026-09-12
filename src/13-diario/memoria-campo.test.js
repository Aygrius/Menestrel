/* ============================================================
   memoria-campo.test.js — o corpo da memória mora em `comentario`
   ============================================================
   `diario_entradas` guarda o texto da memória na coluna `comentario`. Não
   existe coluna `conteudo` — `p_conteudo` é só o nome do PARÂMETRO da RPC
   salvar_memoria_diario, que grava em `comentario`.

   A tela lia `memoria.conteudo` em três lugares, e como ler campo que não
   existe não dá erro em JavaScript, o estrago era silencioso:
     • abrir uma memória salva mostrava o texto em branco;
     • salvar por cima apagava o que estava escrito;
     • a busca por trecho nunca encontrava nada.

   Descoberto em 12/09/2026, quando a tabela nova precisou do trecho e ele
   veio vazio. Este teste é de fonte porque o campo errado não quebra nada
   em tempo de execução — só some com o texto do jogador.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const fonte = readFileSync(join(aqui, 'diario.jsx'), 'utf8');

describe('campo da memória', () => {
  it('nenhuma leitura solta de `.conteudo` sobrou na lista', () => {
    /* `p_conteudo:` (parâmetro da RPC) e a variável local `conteudo` do
       formulário são legítimos, e a única leitura de `memoria?.conteudo`
       que resta é o fallback documentado do useState (coberto abaixo). O
       que não pode é a LISTA ler `.conteudo` das entradas do banco. */
    const leituras = fonte
      .split('\n')
      .map((linha, i) => [i + 1, linha])
      .filter(([, linha]) => /\b[me]\.conteudo\b|\bentrada\.conteudo\b/.test(linha));
    expect(leituras.map(([n, l]) => `${n}: ${l.trim()}`)).toEqual([]);
  });

  it('o formulário abre com o texto salvo', () => {
    expect(fonte).toMatch(/useState\(memoria\?\.comentario \?\? memoria\?\.conteudo \?\? ''\)/);
  });

  it('a busca e o trecho da tabela leem `comentario`', () => {
    expect(fonte).toMatch(/String\(m\.comentario \|\| ''\)\.toLowerCase\(\)\.includes\(q\)/);
    expect(fonte).toMatch(/resumoDeTexto\(m\.comentario\)/);
  });
});
