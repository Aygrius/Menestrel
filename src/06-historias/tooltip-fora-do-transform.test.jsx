/* ============================================================
   tooltip-fora-do-transform.test.jsx — o balão não pode morar dentro do card
   ============================================================
   "O card de história ao passar o mouse por cima perde a borda colorida
    superior." (usuário, 20/09/2026 — reportado QUATRO vezes)

   O sintoma mentia. O filete de 2px do topo não sumia: ele ficava COBERTO.

   O .hist-card-wrap ganhou `transform: translateY(-3px)` no hover, para
   padronizar o movimento com o card de personagem. `transform` cria BLOCO DE
   CONTENÇÃO para descendentes `position: fixed` — e o .mn-tip é fixed,
   posicionado com coordenadas de VIEWPORT vindas de getBoundingClientRect.
   Dentro do wrapper transformado, essas coordenadas passaram a ser medidas a
   partir do canto do card, e o balão aterrissava sobre o próprio card,
   justamente na faixa do topo.

   Três correções erraram o alvo antes desta, todas mexendo no filete (mover o
   transform, mover o backdrop-filter, trocar o ::before por camada de
   background). Nenhuma podia funcionar: o filete nunca foi o problema.

   O projeto já conhecia a armadilha — .pj-card-wrap a documenta desde
   17/09/2026, e tem o seu próprio teste guardando que o card de personagem
   não monta balão nenhum. Este é o guarda equivalente para o card de história,
   que PRECISA dos balões (são os rótulos dos botões de ação) e por isso os
   mantém FORA do elemento que transforma.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './historias.jsx';

let HistoriaCard;
beforeAll(() => {
  HistoriaCard = window.HistoriaCard;
  expect(HistoriaCard, 'HistoriaCard precisa estar no window').toBeTypeOf('function');
});
afterEach(cleanup);

const HISTORIA = {
  id: 13, titulo: 'As Marcas do Passado',
  protagonista_ids: [], estoque_loja: [], criatura_ids: [],
  npc_ids: [], reino_ids: [], cidade_ids: [], lore_acesso_pj: {},
};

const montar = (props = {}) => render(
  <div className="menestrel-ui">
    <HistoriaCard
      h={HISTORIA}
      personagens={[]}
      t={window.COPY.pt}
      lang="pt"
      onEdit={() => {}}
      onDelete={() => {}}
      onManageLoja={() => {}}
      onManageConvites={() => {}}
      onBatalhas={() => {}}
      {...props}
    />
  </div>
);

/* fireEvent, e não um MouseEvent cru: o onMouseEnter do React é sintético e
   não escuta o evento nativo disparado à mão. Com o disparo errado o balão
   nunca abria, e as duas asserções seguintes passavam à toa — null não é
   descendente de coisa nenhuma. */
const abrirBalao = () => {
  const botao = document.querySelector('.hist-card-actions button');
  expect(botao, 'o card precisa ter ao menos um botão de ação').toBeTruthy();
  fireEvent.mouseEnter(botao);
};

describe('o balão vive fora do elemento que transforma', () => {
  it('o balão abre', () => {
    montar();
    abrirBalao();
    expect(document.querySelector('.mn-tip')).toBeTruthy();
  });

  /* O CORAÇÃO DESTE ARQUIVO. Se o balão voltar para dentro do wrapper, ele
     volta a ser medido a partir do card e a cobrir o filete do topo. */
  it('e NÃO é descendente do .hist-card-wrap', () => {
    montar();
    abrirBalao();
    expect(document.querySelector('.hist-card-wrap .mn-tip')).toBeNull();
  });

  it('nem do .hist-card', () => {
    montar();
    abrirBalao();
    expect(document.querySelector('.hist-card .mn-tip')).toBeNull();
  });

  /* A SEGUNDA METADE DA MESMA HISTÓRIA. Tirar o balão do elemento transformado
     corrigiu a POSIÇÃO dele, mas não o que ele cobria: os botões de ação moram
     no alto do card, e um balão que sobe (translate -100%) aterrissa sobre a
     borda superior de qualquer jeito. Daí o `abaixo`. */
  it('e abre PARA BAIXO, para não cobrir a borda do topo', () => {
    montar();
    abrirBalao();
    expect(document.querySelector('.mn-tip').dataset.tipFlip).toBe('below');
  });
});

describe('o filete do topo não depende de pseudo-elemento', () => {
  /* Trocar o ::before por camada de `background` não foi o que consertou o
     bug, mas ficou: uma faixa de 2px presa à borda de uma caixa com
     overflow:hidden, canto arredondado e desfoque é frágil, e background é
     pintura do próprio elemento — não há o que recortar nem o que perder. */
  it('o card desenha o gradiente no próprio background', () => {
    montar();
    const card = document.querySelector('.hist-card');
    expect(card).toBeTruthy();
    // jsdom não resolve a folha de estilo; o que se afirma aqui é que nenhum
    // filete voltou a ser um elemento dentro do card.
    expect(card.querySelector('.hist-card-filete')).toBeNull();
  });
});
