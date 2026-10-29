/* ============================================================
   abas-nao-lacam.test.jsx — a janela de detalhe não entra em laço
   ============================================================
   "Quando eu clico na magia adestramento, a tela quebra." (usuário,
   27/10/2026), com o console dizendo:

     Maximum update depth exceeded … at bestiario.jsx:203
     An error occurred in the <BestDetalheModal> component.

   A linha 203 era o `setTitulos` de `useAbasDoCorpo`, chamado por um
   `useLayoutEffect` SEM array de dependências — isto é, depois de TODO
   render. O `setTitulos` tinha guarda (só troca se a lista de títulos mudar),
   e é por isso que a janela funcionava em quase tudo: com os títulos
   estáveis, o laço parava no primeiro giro.

   Basta um conteúdo em que a medição não dê sempre a mesma resposta para o
   giro não parar — e aí não há guarda que salve, porque a guarda compara o
   resultado de uma medição que oscila.

   O que este arquivo trava não é a magia: é o MECANISMO. Uma janela cujo
   corpo muda a cada medição não pode derrubar a tela.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './bestiario.jsx';

const aqui = dirname(fileURLToPath(import.meta.url));
const FONTE = readFileSync(resolve(aqui, 'bestiario.jsx'), 'utf8');

let Janela;
beforeAll(() => { Janela = window.BestDetalheModal; expect(Janela).toBeTypeOf('function'); });
afterEach(cleanup);

/* A MAGIA DO PEDIDO, como ela está no banco (linha de 27/10/2026). Nada de
   especial à vista — e é justamente esse o ponto: o laço não dependia de a
   magia ser estranha, dependia de a MEDIÇÃO não estabilizar. */
const ADESTRAMENTO = {
  id: 2, key: 'adestramento', nome: 'Adestramento', tipo: 'Básica', classe: 'Transmutação',
  custo: 1, dano: null, alcance: 'Toque', duracao: 'Instantânea', evocacao: '30 rodadas',
  itens_necessarios: null,
  descricao: 'Através desta magia, você ensina uma habilidade a uma criatura irracional de forma permanente.',
  nivel_1: 'Ensina 1 truque básico a animais domésticos ou selvagens.',
  nivel_3: 'Ensina 1 truque avançado a animais domésticos ou selvagens.',
  nivel_5: 'Ensina 1 truque complexo a animais domésticos ou selvagens, ou 1 truque básico a animais predadores.',
  nivel_7: 'Ensina 1 truque avançado a animais predadores, ou 1 truque básico a animais místicos.',
  nivel_9: 'Ensina 1 truque complexo a animais predadores ou 1 truque avançado a animais místicos.',
};

describe('a janela de detalhe não entra em laço de render', () => {
  it('a janela do Adestramento abre sem estourar a pilha', () => {
    const Ficha = window.BestMagiaFicha;
    expect(Ficha).toBeTypeOf('function');
    /* Sem a correção isto lança "Maximum update depth exceeded" e o render
       nem retorna — o teste falha por exceção, não por asserção. */
    expect(() => render(
      <div className="menestrel-ui">
        <Janela title={ADESTRAMENTO.nome} lang="pt" onClose={() => {}}>
          <Ficha m={ADESTRAMENTO} lang="pt" />
        </Janela>
      </div>
    )).not.toThrow();
    expect(document.body.textContent).toMatch(/Adestramento/);
  });

  /* O FREIO, travado na fonte.

     Tentei primeiro dar dependências ao `useLayoutEffect`, que é o conserto
     de manual — e quebrou as abas da criatura (criatura-ficha-secoes): o
     corpo daquela janela chega em renders posteriores, e o efeito precisa
     rodar sempre. Então o efeito fica como está e quem ganha limite é a
     GRAVAÇÃO: contadas 20 medições seguidas sem que duas concordem, para de
     gravar e fica com a última lista.

     O teto existe porque esta medição muta o que mede — `unidadesDasAbas`
     esconde seção vazia e `aplicar` esconde/mostra por aba. Com o conteúdo
     certo, ela pode nunca repetir a resposta. */
  it('a gravação dos títulos tem teto', () => {
    const i = FONTE.indexOf('function useAbasDoCorpo');
    expect(i).toBeGreaterThan(-1);
    const bloco = FONTE.slice(i, FONTE.indexOf('\n}', i));
    expect(bloco, 'faltou o contador de giros').toMatch(/giros\.current \+= 1/);
    expect(bloco, 'faltou o teto que corta o laço').toMatch(/giros\.current > \d+\) return antes/);
    expect(bloco, 'o contador precisa zerar quando a medição repete').toMatch(/giros\.current = 0/);
  });
});
