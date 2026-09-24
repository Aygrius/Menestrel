/* ============================================================
   acao-modal.test.jsx — o painel de Ação no modal do sistema
   ============================================================
   "O modal de batalha, com as ações, padronize ele usando o padrão de modal
    que já temos no sistema." (usuário, 17/09/2026)

   O painel de Ação era `children` do TabuleiroMenu — o popover ancorado no
   avatar do token. Clicar em "Ação" TROCAVA o conteúdo do popover pelo
   painel, e a saída era o X do popover em modo "voltar" (menuVoltar). Agora é
   um ModalShell, como qualquer outro modal do projeto.

   O que este teste guarda, e por que cada coisa quase se perdeu na mudança:

   1. AcaoPanel NÃO tem botão Cancelar próprio — saiu em 02/09/2026, e a
      prop `onCancel` que ele declara nunca foi usada lá dentro. Então a
      ÚNICA saída é o X (e o Escape) do ModalShell. Se `onClose` não chegar,
      o painel fica sem saída: é o softlock que softlock-acao.test.jsx
      persegue por outro caminho.

   2. Com rolagem pendente o X tem que SUMIR, não ficar desabilitado. Era o
      papel de `menuTravado` no popover; no ModalShell é `onClose = null`.
      O rodapé do painel é que explica o desaparecimento ("já rolou,
      continue em Atacar"), e é a única mensagem que o Mestre tem ali.

   3. O título nomeia o ator. No popover não precisava: o painel nascia
      grudado no avatar de quem agia. Solto no meio da tela, sem o nome, o
      Mestre perde de quem é o PA que a ação vai gastar.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../10-shell/shell.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let AcaoModal;
beforeAll(() => {
  AcaoModal = window.AcaoModal;
  expect(AcaoModal, 'AcaoModal precisa estar no window').toBeTypeOf('function');
  expect(window.ModalShell, 'ModalShell precisa estar no window').toBeTypeOf('function');
});
afterEach(cleanup);

const CATALOGO = {
  machado_pesado: {
    slug: 'machado_pesado', nome: 'Machado Pesado',
    dano: 20, dano_l: -3, dano_m: -1, dano_p: 2,
    ajuste_atributo: 'FOR', grupo_armas: 'CM', alcance: 0,
  },
};

const PJ = {
  id: 64, nome: 'Yuldrous', raca: 'Anão', reino: 'Verrogar',
  profissao: 'Sacerdote', especializacao: 'Ordem de Crezir', deus: 'Crezir',
  intelecto_base: 2, aura_base: 2, carisma_base: 0,
  forca_base: 2, fisico_base: 2, agilidade_base: 2, percepcao_base: 1,
  experiencia: 42,
  habilidades: {}, habilidades_bonus: {}, magias: {}, tecnicas: {},
  aprimoramentos: {}, caracterizacao: {},
  grupos_armas: { CM: 1 },
  estado_atual: { bonusArmas: {}, condicoes: {} },
  inventario: { itens: [{ slug: 'machado_pesado', slot: 'mao_d', equipado: true }] },
};

const CATALOGOS = { pjById: { 64: PJ }, catalogoBySlug: CATALOGO, magiasByKey: {} };

const ATOR = {
  tipo: 'pj', ref_id: 64, inst_id: 'pj:64', nome: 'Yuldrous', ordem: 1,
  status: 'ativo', atual: true, vb: 20,
  pa_max: 2, pa_rest: 1, mov_rest: 5, moveu_na_rodada: false,
  ef: 10, ef_max: 10, eh: 5, eh_max: 5, ar: 0, ar_max: 0, karma: 0, karma_max: 0,
  status_temp: [], condicoes: {},
};

const ALVO = {
  tipo: 'criatura', ref_id: 'lobo', inst_id: 'criatura:lobo', nome: 'Lobisomem', ordem: 2,
  status: 'ativo', atual: false, vb: 18,
  pa_max: 2, pa_rest: 2, mov_rest: 5, moveu_na_rodada: false,
  ef: 30, ef_max: 30, eh: 12, eh_max: 12, ar: 0, ar_max: 0, karma: 0, karma_max: 0,
  status_temp: [],
};

const ROLAGEM_SALVA = {
  ator: { tipo: 'pj', ref_id: 64, inst_id: 'pj:64' },
  tab: 'arma', d20: 11, d20_critico: null,
};

const montar = (extra = {}) => render(
  <div className="menestrel-ui">
    <AcaoModal
      ator={ATOR}
      participantes={[ATOR, ALVO]}
      catalogos={CATALOGOS}
      lang="pt"
      onAplicar={() => {}}
      onAplicarTeste={() => {}}
      onAplicarItem={() => {}}
      onAplicarApoio={() => {}}
      onRolagemPendenteChange={() => {}}
      onRolagemSalvaChange={() => {}}
      onClose={() => {}}
      {...extra}
    />
  </div>
);

const fechar = () => document.querySelector('.ms-close');

describe('é o modal do sistema, não um popover', () => {
  it('usa a moldura do ModalShell', () => {
    montar();
    expect(document.querySelector('.ms-backdrop')).toBeTruthy();
    expect(document.querySelector('.ms-modal')).toBeTruthy();
    expect(document.querySelector('.ms-header .ms-title')).toBeTruthy();
  });

  it('o painel de Ação vive dentro do corpo do modal', () => {
    montar();
    const corpo = document.querySelector('.ms-body');
    expect(corpo).toBeTruthy();
    expect(corpo.querySelector('.atacar.acao')).toBeTruthy();
  });

  it('não sobrou nada do popover do token', () => {
    montar();
    expect(document.querySelector('.batalha-token-menu')).toBeNull();
    expect(document.querySelector('.batalha-token-menu-fechar')).toBeNull();
  });
});

describe('o título nomeia o ator', () => {
  it('mostra o nome de quem age', () => {
    montar();
    expect(document.querySelector('.ms-title').textContent).toContain('Yuldrous');
  });

  it('em inglês também, sem vazar português', () => {
    montar({ lang: 'en' });
    const titulo = document.querySelector('.ms-title').textContent;
    expect(titulo).toContain('Yuldrous');
    expect(titulo).not.toMatch(/Ação/);
  });
});

describe('a saída do painel', () => {
  /* AcaoPanel não tem Cancelar próprio: sem o X do ModalShell não há saída. */
  it('o X existe e chama onClose', () => {
    let fechou = 0;
    montar({ onClose: () => { fechou += 1; } });
    expect(fechar()).toBeTruthy();
    fechar().click();
    expect(fechou).toBe(1);
  });

  it('com rolagem pendente o X SOME', () => {
    montar({ travado: true, rolagemSalva: ROLAGEM_SALVA });
    expect(fechar()).toBeNull();
  });

  it('e o painel diz por que sumiu', () => {
    montar({ travado: true, rolagemSalva: ROLAGEM_SALVA });
    expect(document.querySelector('.acao-travado-aviso')).toBeTruthy();
  });

  it('travado não esconde o conteúdo — só a saída', () => {
    montar({ travado: true, rolagemSalva: ROLAGEM_SALVA });
    expect(document.querySelector('.ms-body .atacar.acao')).toBeTruthy();
  });
});

describe('o modal não inventa rodapé', () => {
  /* O painel tem o próprio rodapé (.atacar-footer) com dado, resultado e
     confirmar. Um footer do ModalShell por baixo dele daria dois rodapés e
     dois botões primários na mesma tela. */
  it('sem Cancelar/Salvar do ModalShell', () => {
    montar();
    expect(document.querySelector('.ms-footer')).toBeNull();
  });

  it('o rodapé que aparece é o do próprio painel', () => {
    montar({ rolagemSalva: ROLAGEM_SALVA });
    expect(document.querySelector('.ms-body .atacar-footer')).toBeTruthy();
  });
});

describe('as abas do painel continuam de pé dentro do modal', () => {
  it('a aba Arma está lá, com a arma equipada', () => {
    montar();
    expect(document.querySelector('.acao-tabs')).toBeTruthy();
    expect(screen.getByText(/Machado Pesado/)).toBeTruthy();
  });
});
