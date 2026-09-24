/* ============================================================
   tempo-mesa.test.jsx — a condição do tempo na barra do topo
   ============================================================
   "Adicione no topo, ao lado de data e local, a condição do tempo, com três
    botões para o mestre navegar: Água: Desértico → Árido → Fresco → Chuva Fina
    → Tempestade. Vento: Sem Vento → Ventos Leves → Ventania → Vendaval →
    Tornado. Temperatura: Frio Extremo → Frio Leve → Agradável → Calor Leve →
    Calor Extremo." (usuário, 16/09/2026)
   "nos botões de clima, ao clicar em um botão, abre as opções para escolher."
    (usuário, 16/09/2026 — o botão ciclava antes)

   O tempo mora no MESMO jsonb da data (historias.data_jogo_atual.tempo), e é
   isso que garante que ele chegue a todo mundo pelo realtime que o card já
   assinava — sem coluna nova. O preço desse arranjo é que todo update reescreve
   o jsonb inteiro: por isso o teste também cobre o que uma edição de local faz
   com o tempo, que foi exatamente o jeito de perdê-lo.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, waitFor, act } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/clima-desgaste.jsx';   // o shell cobra o clima (aguaPorHoraDeChuva, tiqueDeClima)
import '../01-core/game-data.jsx';
import './shell.jsx';

let Card;
beforeAll(() => {
  Card = window.CardDataJogoAtual;
  expect(Card, 'CardDataJogoAtual precisa estar no window').toBeTypeOf('function');
});
const stubOriginal = globalThis.supabaseClient;
afterEach(() => { cleanup(); globalThis.supabaseClient = stubOriginal; });

const BASE = { dia: 11, mes: 11, ano: 1500, local: 'Farzelo' };

function montar({ podeEditar = true, inicial = BASE } = {}) {
  const updates = [];
  globalThis.supabaseClient = {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { data_jogo_atual: inicial }, error: null }) }) }),
      update: (patch) => { updates.push(patch.data_jogo_atual); return { eq: async () => ({ error: null }) }; },
    }),
    channel: () => { const ch = { on: () => ch, subscribe: () => ch }; return ch; },
    removeChannel: () => {},
    rpc: async () => ({ data: { ok: true }, error: null }),   // o log da mesa
  };
  const r = render(
    <Card lang="pt" historiaId={13} podeEditar={podeEditar} profile={podeEditar ? 'master' : 'player'} />
  );
  return { ...r, updates };
}

const pills = () => Array.from(document.querySelectorAll('.cdj-tempo'));
const degraus = () => pills().map((b) => b.getAttribute('data-tempo'));
const listas = () => document.querySelectorAll('.cdj-tempo-lista');
const opcoes = () => Array.from(document.querySelectorAll('.cdj-tempo-opcao'));
const idsAbertos = () => opcoes().map((li) => li.getAttribute('data-tempo'));
const abrir = (i) => act(() => { pills()[i].click(); });
// Abre a lista da trilha `i` e escolhe nela o degrau de id `alvo`.
const escolher = (i, alvo) => {
  abrir(i);
  const li = opcoes().find((o) => o.getAttribute('data-tempo') === alvo);
  if (!li) throw new Error('sem a opção ' + alvo + ' na lista ' + i);
  act(() => { li.click(); });
};

describe('as três trilhas aparecem ao lado de data e local', () => {
  it('são três pills, um por trilha, dentro do card da mesa', async () => {
    montar();
    await waitFor(() => expect(pills()).toHaveLength(3));
    expect(document.querySelector('.cdj-root .cdj-tempo-grupo')).toBeTruthy();
  });

  it('mesa sem tempo gravado cai no degrau padrão de cada trilha', async () => {
    montar();
    await waitFor(() => expect(degraus()).toEqual(['fresco', 'sem_vento', 'agradavel']));
  });

  it('cada pill traz um ícone que existe no conjunto Tabler carregado', async () => {
    montar();
    await waitFor(() => expect(pills()).toHaveLength(3));
    for (const b of pills()) {
      expect(b.querySelector('i').className).toMatch(/^ti ti-[a-z-]+$/);
    }
  });
});

/* O botão ciclava até 16/09/2026, e ciclar obrigava a atravessar Tempestade
   para voltar de Chuva fina a Fresco. Agora o clique abre a escada inteira. */
describe('o clique abre a lista de degraus', () => {
  it('Água mostra os cinco degraus, na ordem da escada', async () => {
    montar();
    await waitFor(() => expect(pills()).toHaveLength(3));
    abrir(0);
    expect(idsAbertos()).toEqual(['desertico', 'arido', 'fresco', 'chuva_fina', 'tempestade']);
  });

  it('Vento e Temperatura trazem cada uma a sua escada', async () => {
    montar();
    await waitFor(() => expect(pills()).toHaveLength(3));
    abrir(1);
    expect(idsAbertos()).toEqual(['sem_vento', 'leves', 'ventania', 'vendaval', 'tornado']);
    abrir(2);
    expect(idsAbertos()).toEqual(['frio_extremo', 'frio_leve', 'agradavel', 'calor_leve', 'calor_extremo']);
  });

  it('a lista nomeia cada degrau e marca o que está em vigor', async () => {
    montar();
    await waitFor(() => expect(pills()).toHaveLength(3));
    abrir(0);
    expect(opcoes().map((li) => li.textContent)).toEqual(
      expect.arrayContaining(['Desértico', 'Árido', 'Chuva fina', 'Tempestade'])
    );
    const ativa = opcoes().find((li) => li.classList.contains('is-ativa'));
    expect(ativa.getAttribute('data-tempo')).toBe('fresco');
    expect(ativa.getAttribute('aria-selected')).toBe('true');
  });

  it('só uma lista por vez — clicar noutro pill troca de lista', async () => {
    montar();
    await waitFor(() => expect(pills()).toHaveLength(3));
    abrir(0);
    expect(idsAbertos()[0]).toBe('desertico');
    abrir(1);
    expect(listas()).toHaveLength(1);
    expect(idsAbertos()[0]).toBe('sem_vento');
  });

  it('e clicar de novo no mesmo pill fecha', async () => {
    montar();
    await waitFor(() => expect(pills()).toHaveLength(3));
    abrir(0);
    abrir(0);
    expect(listas()).toHaveLength(0);
  });
});

describe('escolher um degrau grava e fecha', () => {
  it('a escolha pinta o pill e vai para o banco', async () => {
    const { updates } = montar();
    await waitFor(() => expect(degraus()[0]).toBe('fresco'));
    escolher(0, 'tempestade');
    expect(degraus()[0]).toBe('tempestade');
    expect(listas()).toHaveLength(0);
    await waitFor(() => expect(updates).toHaveLength(1));
    expect(updates[0].tempo.agua).toBe('tempestade');
  });

  it('dá para ir direto de Chuva fina a Fresco, sem passar por Tempestade', async () => {
    const { updates } = montar({ inicial: { ...BASE, tempo: { agua: 'chuva_fina' } } });
    await waitFor(() => expect(degraus()[0]).toBe('chuva_fina'));
    escolher(0, 'fresco');
    expect(degraus()[0]).toBe('fresco');
    await waitFor(() => expect(updates).toHaveLength(1));
    expect(updates.map((u) => u.tempo.agua)).toEqual(['fresco']);
  });

  it('mexer numa trilha não mexe nas outras duas', async () => {
    const { updates } = montar();
    await waitFor(() => expect(pills()).toHaveLength(3));
    escolher(0, 'chuva_fina');
    escolher(2, 'calor_leve');
    await waitFor(() => expect(updates).toHaveLength(2));
    expect(updates[1].tempo).toEqual({ agua: 'chuva_fina', temperatura: 'calor_leve' });
  });

  it('reescolher o degrau que já vale fecha a lista sem gravar', async () => {
    const { updates } = montar();
    await waitFor(() => expect(pills()).toHaveLength(3));
    escolher(0, 'fresco');
    expect(updates).toHaveLength(0);
    expect(listas()).toHaveLength(0);
  });

  it('e a data e o local seguem no payload — o jsonb é reescrito inteiro', async () => {
    const { updates } = montar();
    await waitFor(() => expect(pills()).toHaveLength(3));
    escolher(1, 'vendaval');
    await waitFor(() => expect(updates).toHaveLength(1));
    expect(updates[0]).toMatchObject({ dia: 11, mes: 11, ano: 1500, local: 'Farzelo' });
  });
});

describe('quem não é Mestre só olha', () => {
  it('o jogador vê as três trilhas', async () => {
    montar({ podeEditar: false, inicial: { ...BASE, tempo: { agua: 'tempestade' } } });
    await waitFor(() => expect(degraus()).toEqual(['tempestade', 'sem_vento', 'agradavel']));
  });

  it('mas o clique dele não abre lista nem grava nada', async () => {
    const { updates } = montar({ podeEditar: false });
    await waitFor(() => expect(pills()).toHaveLength(3));
    abrir(0);
    expect(listas()).toHaveLength(0);
    expect(updates).toHaveLength(0);
    expect(degraus()[0]).toBe('fresco');
  });

  /* Botão desabilitado não dispara mouseenter, e o pill é só ícone: sem
     tooltip o Jogador não teria como saber o que está vendo. Por isso a
     leitura passa por `aria-label` + handlers, não por `disabled`. */
  it('o pill do jogador continua nomeando o degrau', async () => {
    montar({ podeEditar: false, inicial: { ...BASE, tempo: { vento: 'vendaval' } } });
    await waitFor(() => expect(pills()).toHaveLength(3));
    expect(pills()[1].getAttribute('aria-label')).toBe('Vento · Vendaval');
    expect(pills()[1].disabled).toBe(false);
  });
});

describe('o tempo sobrevive às outras edições da barra', () => {
  it('salvar o local preserva o tempo já gravado', async () => {
    const { updates } = montar({ inicial: { ...BASE, tempo: { agua: 'tempestade', vento: 'tornado' } } });
    await waitFor(() => expect(pills()).toHaveLength(3));
    // Abre o formulário inline do local e salva sem mudar nada.
    act(() => { document.querySelector('.cdj-local').closest('button').click(); });
    await waitFor(() => expect(document.querySelector('.cdj-pill-btn-salvar')).toBeTruthy());
    act(() => { document.querySelector('.cdj-pill-btn-salvar').click(); });
    await waitFor(() => expect(updates).toHaveLength(1));
    expect(updates[0].tempo).toEqual({ agua: 'tempestade', vento: 'tornado' });
  });
});

describe('mexer no tempo não inventa uma data', () => {
  /* Mesa recém-criada: data_jogo_atual vem null e a barra mostra "Definir data
     atual". Se gravar o tempo remontasse o jsonb campo a campo, escreveria um
     1/1/0 e a barra passaria a exibir uma data que ninguém definiu. */
  it('mesa sem data segue sem data depois de mexer no clima', async () => {
    const { updates } = montar({ inicial: null });
    await waitFor(() => expect(pills()).toHaveLength(3));
    expect(document.querySelector('.cdj-vazio')?.textContent).toMatch(/Definir data atual/);
    escolher(2, 'calor_leve');
    await waitFor(() => expect(updates).toHaveLength(1));
    expect(updates[0]).toEqual({ tempo: { temperatura: 'calor_leve' } });
    expect(document.querySelector('.cdj-data')).toBeNull();
    expect(document.querySelector('.cdj-vazio')?.textContent).toMatch(/Definir data atual/);
  });
});
