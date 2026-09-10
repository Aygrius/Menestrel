/* ============================================================
   card-jogador.test.jsx — o card do Jogador segue o do Mestre
   ============================================================
   A limpeza do card de combate (01/09/2026) foi pedida olhando a tela do
   MESTRE, mas as duas telas mostram o mesmo card e não podem divergir. Como
   não dá pra entrar como jogador no navegador (exige a sessão dele), a
   verificação do lado do Jogador é esta: renderiza a view de verdade e olha
   o DOM.

   O que se exige aqui:
     • as ações do turno são círculos SÓ COM ÍCONE — o rótulo vive no
       aria-label/tooltip, não escrito no botão;
     • o estado dos OUTROS combatentes é um círculo com ícone no fim da linha
       de stats, na mesma posição que o seletor ocupa no card do Mestre. Era
       um pill com o nome escrito ("Desmaiado"), que destoava.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
// higiene 8 (revisão final): AcaoPanel chama tecnicaEfeitoDe por nome nu
// assim que alguma fixture tiver técnica selecionada — sem este import a
// primeira que tivesse derrubava o teste com ReferenceError.
import '../01-core/tecnicas-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

let BatalhaJogadorView;
beforeAll(() => {
  BatalhaJogadorView = window.BatalhaJogadorView;
  expect(BatalhaJogadorView, 'BatalhaJogadorView precisa estar no window').toBeDefined();
});

const stubOriginal = globalThis.supabaseClient;
afterEach(() => { cleanup(); globalThis.supabaseClient = stubOriginal; });

const EU = 64;

const lutador = (over) => ({
  tipo: 'pj', ref_id: EU, inst_id: 'eu', nome: 'Yuldrous', ordem: 1,
  status: 'ativo', atual: true, vb: 20, pa_max: 2, pa_rest: 2,
  mov_rest: 5, moveu_na_rodada: false, pos: { x: 10, y: 10 },
  ef: 10, ef_max: 10, eh: 5, eh_max: 5, ar: 0, ar_max: 0, karma: 0, karma_max: 0,
  status_temp: [], ...over,
});

const batalha = (parts) => ({
  id: 1, estado: 'ativa', rodada: 3, historia_id: 9,
  participantes: parts, log: [], rolagem_pendente: null,
});

function montar(parts) {
  globalThis.supabaseClient = fakeSupabase({
    personagens: [], itens: [], magias: [], tecnicas: [], habilidades: [], criaturas: [],
  });
  return render(
    <BatalhaJogadorView batalha={batalha(parts)} pjAtivoId={EU} lang="pt" onVoltar={() => {}} />
  );
}

// O card só existe dentro do menu do token, que abre no clique. Aqui basta
// olhar o markup renderizado: o menuDe é chamado pelo tabuleiro.
const abrirCardDe = async (container, nome) => {
  // A view mostra "Carregando batalha…" até os catálogos chegarem (efeito
  // assíncrono); o tabuleiro — e portanto o token — só existe depois disso.
  await waitFor(() => expect(container.querySelector('[class*="token"]')).toBeTruthy());
  const tokens = [...container.querySelectorAll('.batalha-token')];
  const alvo = tokens.find((t) => (t.textContent || '').includes(nome)) || tokens[0];
  expect(alvo, `token de ${nome} não encontrado`).toBeTruthy();
  alvo.click();
  // O menu nasce por PORTAL e só depois do React processar o clique — daí o
  // segundo waitFor. Consultar o DOM logo após .click() devolve null.
  await waitFor(() => expect(document.querySelector('.batalha-token-menu')).toBeTruthy());
  return document.querySelector('.batalha-token-menu');
};

describe('ações do turno — círculos só com ícone', () => {
  it('os botões não têm texto escrito, só aria-label', async () => {
    const { container } = montar([lutador()]);
    const menu = await abrirCardDe(container, 'Yuldrous');
    expect(menu, 'o menu do token precisa abrir').toBeTruthy();
    const botoes = [...menu.querySelectorAll('.batalha-menu-acoes .batalha-menu-acao-ic')];
    expect(botoes.length).toBeGreaterThanOrEqual(3);
    for (const b of botoes) {
      expect(b.textContent.trim(), 'botão de ação não pode ter texto').toBe('');
      expect(b.getAttribute('aria-label'), 'sem aria-label o ícone fica mudo').toBeTruthy();
    }
  });

  it('Desistir está entre eles — é a ação que só o Jogador tem', async () => {
    const { container } = montar([lutador()]);
    const menu = await abrirCardDe(container, 'Yuldrous');
    const rotulos = [...menu.querySelectorAll('.batalha-menu-acoes .batalha-menu-acao-ic')]
      .map((b) => b.getAttribute('aria-label'));
    expect(rotulos.length).toBe(4);   // Mover, Ação, Passar, Desistir
  });
});

describe('estado dos outros — círculo com ícone, não texto', () => {
  const outro = lutador({
    ref_id: 99, inst_id: 'outro', nome: 'Aliado', ordem: 2,
    atual: false, status: 'desmaiado',
  });

  it('o estado alheio aparece como ícone no fim da linha de stats', async () => {
    const { container } = montar([lutador(), outro]);
    const menu = await abrirCardDe(container, 'Aliado');
    const pill = menu.querySelector('.batalha-fighter-stats .batalha-stat-estado');
    expect(pill, 'o estado do outro combatente precisa estar na linha de stats').toBeTruthy();
    expect(pill.querySelector('i')).toBeTruthy();
    expect(pill.textContent.trim(), 'o nome do estado foi pro tooltip').toBe('');
    expect(pill.getAttribute('aria-label')).toBeTruthy();
  });

  it('o ícone é o do estado — desmaiado usa o mesmo do mapa único', async () => {
    const { container } = montar([lutador(), outro]);
    const menu = await abrirCardDe(container, 'Aliado');
    const ic = menu.querySelector('.batalha-fighter-stats .batalha-stat-estado i');
    expect(ic.className).toContain('ti-zzz');
  });

  it('no PRÓPRIO card não há pill de estado — o card inteiro já é do jogador', async () => {
    const { container } = montar([lutador()]);
    const menu = await abrirCardDe(container, 'Yuldrous');
    expect(menu.querySelector('.batalha-fighter-stats .batalha-stat-estado')).toBeNull();
  });
});
