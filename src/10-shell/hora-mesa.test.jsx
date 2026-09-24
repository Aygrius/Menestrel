/* ============================================================
   hora-mesa.test.jsx — o relógio da mesa, na barra do topo
   ============================================================
   "Além do controle de dia e noite, precisamos de um controle de horário, mas
    ele será um controle apenas da hora, não precisa de minutos e segundos."
   (usuário, 20/09/2026)

   Este arquivo era `periodo-dia-noite.test.jsx`, e cobria um botão que
   ALTERNAVA dia↔noite. O botão continua no mesmo lugar e com o mesmo sol e a
   mesma lua, mas agora é o relógio: a hora (0–23) é o que o Mestre escolhe, e
   o período virou consequência dela (6h–17h dia, 18h–5h noite, ver
   luz-do-horario.test.js). Quem lê o sol/lua continua lendo a mesma coisa —
   só não é mais ele quem decide.

   Mesmo arranjo do clima (ver tempo-mesa.test.jsx): a hora mora no MESMO jsonb
   da data (historias.data_jogo_atual.hora), e é isso que a faz chegar a todo
   mundo pelo realtime que o card já assinava. O preço continua o mesmo — todo
   update reescreve o jsonb inteiro — e por isso este arquivo também cobre o
   que uma edição de local e uma mexida no clima fazem com a hora, que é
   exatamente o jeito de perdê-la.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, waitFor, act } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/clima-desgaste.jsx';
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
  /* O stub cresceu em 20/09/2026, junto com o que a barra faz ao mexer no
     relógio: além de gravar o jsonb, ela agora lê os protagonistas da
     história, lê e grava os PJs (o desgaste por hora) e chama a RPC do log da
     aventura. `in` devolve lista vazia — quem quiser provar o desgaste em si
     usa 01-core/clima-desgaste.test.js, onde ele é puro; aqui o que importa é
     que a barra não quebre por causa dessas idas ao banco. */
  globalThis.supabaseClient = {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { data_jogo_atual: inicial, protagonista_ids: [], estoque_loja: [] }, error: null }) }),
        in: async () => ({ data: [], error: null }),
      }),
      update: (patch) => {
        if (patch.data_jogo_atual) updates.push(patch.data_jogo_atual);
        return { eq: async () => ({ error: null }) };
      },
    }),
    rpc: async () => ({ data: { ok: true }, error: null }),
    channel: () => { const ch = { on: () => ch, subscribe: () => ch }; return ch; },
    removeChannel: () => {},
  };
  const r = render(
    <Card lang="pt" historiaId={13} podeEditar={podeEditar} profile={podeEditar ? 'master' : 'player'} />
  );
  return { ...r, updates };
}

const botao = () => document.querySelector('.cdj-hora');
const periodo = () => botao()?.getAttribute('data-periodo');
/* A HORA SAIU DO PILL e vive no rótulo acessível (20/09/2026): "no botão de
   horário, não precisa do texto '12h', deixe apenas o ícone. E o texto vem no
   tooltip." O `aria-label` é a mesma string que alimenta o balão (ver
   propsTip no componente), então lê-lo aqui verifica as duas coisas de uma
   vez — e continua sendo o que um leitor de tela anuncia. */
const rotulo = () => {
  const label = document.querySelector('.cdj-hora')?.getAttribute('aria-label') || '';
  return label.match(/\d+h/)?.[0];
};
const abrir = () => act(() => { botao().click(); });
const opcoes = () => Array.from(document.querySelectorAll('.cdj-hora-opcao'));
const escolher = (h) => act(() => {
  opcoes().find((o) => o.getAttribute('data-hora') === String(h)).click();
});

describe('o relógio aparece na mesma fileira de data, local e mesa', () => {
  it('mora dentro do card da mesa', async () => {
    montar();
    await waitFor(() => expect(botao()).toBeTruthy());
    expect(document.querySelector('.cdj-root .cdj-hora')).toBeTruthy();
  });

  it('mesa sem hora nenhuma é meio-dia', async () => {
    montar();
    await waitFor(() => expect(rotulo()).toBe('12h'));
    expect(periodo()).toBe('dia');
  });

  it('e a hora gravada é a que aparece', async () => {
    montar({ inicial: { ...BASE, hora: 20 } });
    await waitFor(() => expect(rotulo()).toBe('20h'));
    expect(periodo()).toBe('noite');
  });

  /* Mesa que já estava em curso quando este recurso subiu não tem `hora`, só
     o `periodo` do botão antigo. Ela não pode amanhecer à meia-noite. */
  it('mesa antiga sem hora respeita o período que já tinha', async () => {
    montar({ inicial: { ...BASE, periodo: 'noite' } });
    await waitFor(() => expect(rotulo()).toBe('0h'));
    expect(periodo()).toBe('noite');
  });

  /* Mesmo cuidado do clima: ícone inventado vira quadrado vazio na tela. */
  it('o ícone existe no conjunto Tabler carregado', async () => {
    montar();
    await waitFor(() => expect(botao()).toBeTruthy());
    expect(botao().querySelector('i').className).toMatch(/^ti ti-[a-z-]+$/);
  });

  it('o botão diz em palavras que horas são', async () => {
    montar({ inicial: { ...BASE, hora: 20 } });
    await waitFor(() => expect(botao()).toBeTruthy());
    expect(botao().getAttribute('aria-label')).toBe('Hora do jogo · 20h · Noite');
  });
});

describe('o Mestre escolhe a hora numa lista', () => {
  it('o clique abre as 24 horas', async () => {
    montar();
    await waitFor(() => expect(botao()).toBeTruthy());
    abrir();
    expect(opcoes()).toHaveLength(24);
    expect(opcoes()[0].getAttribute('data-hora')).toBe('0');
    expect(opcoes()[23].getAttribute('data-hora')).toBe('23');
  });

  it('escolher a hora repinta a barra antes do banco responder', async () => {
    const { updates } = montar();
    await waitFor(() => expect(rotulo()).toBe('12h'));
    abrir();
    escolher(21);
    expect(rotulo()).toBe('21h');
    expect(periodo()).toBe('noite');
    await waitFor(() => expect(updates).toHaveLength(1));
    expect(updates[0].hora).toBe(21);
  });

  /* O período continua no jsonb porque é o que uma mesa antiga lê; agora ele
     é gravado DERIVADO, nunca escolhido. */
  it('e grava o período que a hora implica', async () => {
    const { updates } = montar();
    await waitFor(() => expect(botao()).toBeTruthy());
    abrir();
    escolher(7);
    await waitFor(() => expect(updates).toHaveLength(1));
    expect(updates[0]).toMatchObject({ hora: 7, periodo: 'dia' });
  });

  it('a lista fecha depois da escolha', async () => {
    montar();
    await waitFor(() => expect(botao()).toBeTruthy());
    abrir();
    escolher(3);
    expect(opcoes()).toHaveLength(0);
  });

  it('a data, o local e o clima seguem no payload — o jsonb é reescrito inteiro', async () => {
    const { updates } = montar({ inicial: { ...BASE, tempo: { agua: 'tempestade' } } });
    await waitFor(() => expect(botao()).toBeTruthy());
    abrir();
    escolher(9);
    await waitFor(() => expect(updates).toHaveLength(1));
    expect(updates[0]).toMatchObject({ dia: 11, mes: 11, ano: 1500, local: 'Farzelo' });
    expect(updates[0].tempo).toEqual({ agua: 'tempestade' });
  });

  /* Mesma armadilha que o clima teve: remontar o jsonb campo a campo faria
     uma mesa sem data passar a exibir um 1/1/0 que ninguém definiu. */
  it('mesa sem data segue sem data depois de acertar o relógio', async () => {
    const { updates } = montar({ inicial: null });
    await waitFor(() => expect(botao()).toBeTruthy());
    abrir();
    escolher(22);
    await waitFor(() => expect(updates).toHaveLength(1));
    expect(updates[0]).toEqual({ hora: 22, periodo: 'noite' });
    expect(document.querySelector('.cdj-data')).toBeNull();
  });
});

describe('quem não é Mestre só olha', () => {
  it('o jogador vê que horas são na mesa', async () => {
    montar({ podeEditar: false, inicial: { ...BASE, hora: 20 } });
    await waitFor(() => expect(rotulo()).toBe('20h'));
    expect(periodo()).toBe('noite');
  });

  it('mas o clique dele não abre a lista nem grava', async () => {
    const { updates } = montar({ podeEditar: false });
    await waitFor(() => expect(rotulo()).toBe('12h'));
    abrir();
    expect(opcoes()).toHaveLength(0);
    expect(updates).toHaveLength(0);
  });

  /* Botão desabilitado não dispara mouseenter — mesma decisão dos pills do
     clima: o Jogador precisa do tooltip justamente porque não pode clicar. */
  it('e o botão dele não é `disabled`', async () => {
    montar({ podeEditar: false });
    await waitFor(() => expect(botao()).toBeTruthy());
    expect(botao().disabled).toBe(false);
  });
});

describe('a hora sobrevive às outras edições da barra', () => {
  it('salvar o local preserva a hora', async () => {
    const { updates } = montar({ inicial: { ...BASE, hora: 20 } });
    await waitFor(() => expect(botao()).toBeTruthy());
    act(() => { document.querySelector('.cdj-local').closest('button').click(); });
    await waitFor(() => expect(document.querySelector('.cdj-pill-btn-salvar')).toBeTruthy());
    act(() => { document.querySelector('.cdj-pill-btn-salvar').click(); });
    await waitFor(() => expect(updates).toHaveLength(1));
    expect(updates[0].hora).toBe(20);
  });

  it('mexer no clima preserva a hora', async () => {
    const { updates } = montar({ inicial: { ...BASE, hora: 20 } });
    await waitFor(() => expect(botao()).toBeTruthy());
    act(() => { document.querySelectorAll('.cdj-tempo')[0].click(); });
    const li = Array.from(document.querySelectorAll('.cdj-tempo-opcao'))
      .find((o) => o.getAttribute('data-tempo') === 'tempestade');
    act(() => { li.click(); });
    await waitFor(() => expect(updates).toHaveLength(1));
    expect(updates[0].hora).toBe(20);
  });
});

describe('o fundo do console recebe a luz da hora', () => {
  /* O fundo mora no AdminConsole, que é pai deste card — e é o card que
     carrega e assina o jsonb. Sem este aviso, o Mestre avançaria o relógio e
     a iluminação só mudaria no F5 seguinte. */
  it('avisa o pai sempre que a hora da mesa muda', async () => {
    const vistos = [];
    globalThis.supabaseClient = {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { data_jogo_atual: { ...BASE, hora: 20 } }, error: null }) }) }),
        update: () => ({ eq: async () => ({ error: null }) }),
      }),
      channel: () => { const ch = { on: () => ch, subscribe: () => ch }; return ch; },
      removeChannel: () => {},
      rpc: async () => ({ data: { ok: true }, error: null }),   // o log da mesa
    };
    render(<Card lang="pt" historiaId={13} podeEditar profile="master" onDataAtual={(d) => vistos.push(d)} />);
    await waitFor(() => expect(vistos.some((d) => d && d.hora === 20)).toBe(true));
    abrir();
    escolher(4);
    expect(vistos[vistos.length - 1].hora).toBe(4);
  });
});
