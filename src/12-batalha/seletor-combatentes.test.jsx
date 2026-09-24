/* ============================================================
   seletor-combatentes.test.jsx — a montagem da batalha
   ============================================================
   "No seletor combatentes, pré-batalha, eu quero 4 colunas ao invés de 5.
    Por padrão, todas as criaturas ficam desmarcadas. O botão de seleção de
    criaturas e de personagens está diferente, padronize." (usuário, 17/09/2026)

   Os três pedidos são de uma mesma tela (NovaBatalhaView → ParticipantSection)
   e dois deles são fáceis de desfazer sem perceber:

   - A quantidade das criaturas nasce num Map. O valor inicial era 1, o que
     marcava tudo; agora é 0. Quem mexer no Map pra outra coisa tende a
     "restaurar" o 1.
   - O modo PJ usava <input type="checkbox"> nativo e o modo criatura uma caixa
     desenhada (.part-check-visual). Eram dois desenhos pro mesmo gesto na
     mesma tela. Agora é um só, e o teste exige que NÃO haja checkbox nativo
     em nenhum dos dois modos.

   As 4 colunas são CSS (.part-section-grid, index.css) e estão cobertas em
   index.css por comentário — jsdom não aplica folha externa, então aqui o
   teste checa o que o componente controla, não a largura da coluna.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/copy.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

/* window.UI vem de components/ui-bridge.ts (kit shadcn) em produção; aqui só o
   Input importa, que é a busca de cada seção. Mesma convenção dos testes de
   bestiário/inventário. O `type="search"` do stub não colide com as asserções
   de `input[type="checkbox"]` abaixo — o ponto delas é justamente que a caixa
   de seleção deixou de ser um input. */
window.UI = { ...window.UI, Input: (props) => <input {...props} /> };

let ParticipantSection;
beforeAll(() => {
  ParticipantSection = window.ParticipantSection;
  expect(ParticipantSection, 'ParticipantSection precisa estar no window').toBeTypeOf('function');
});
afterEach(cleanup);

const itens = (n, pre) => Array.from({ length: n }, (_, i) => ({
  key: `${pre}:${i}`, nome: `${pre === 'pj' ? 'Thalia' : 'Lobisomem'} ${i}`, meta: 'meta',
}));

const montarPj = (sel = new Set()) => render(
  <ParticipantSection
    label="Jogadores" items={itens(3, 'pj')} sel={sel}
    onToggle={() => {}} onSelectAll={() => {}} onDeselectAll={() => {}} isEn={false}
  />
);

const montarCriaturas = (qtdMap) => render(
  <ParticipantSection
    label="Criaturas" items={itens(3, 'cri')} sel={new Set()}
    onToggle={() => {}} onSelectAll={null} onDeselectAll={null} isEn={false}
    qtdMap={qtdMap} onQtd={() => {}}
  />
);

describe('um só desenho de caixa de seleção', () => {
  it('o modo PJ usa a caixa desenhada, não o checkbox nativo', () => {
    const { container } = montarPj();
    expect(container.querySelectorAll('.part-check-visual')).toHaveLength(3);
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
  });

  it('o modo criatura usa a mesma caixa', () => {
    const { container } = montarCriaturas(new Map(itens(3, 'cri').map((i) => [i.key, 0])));
    expect(container.querySelectorAll('.part-check-visual')).toHaveLength(3);
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
  });

  it('marcado desenha o check; desmarcado não', () => {
    const { container } = montarPj(new Set(['pj:0']));
    const caixas = [...container.querySelectorAll('.part-check-visual')];
    expect(caixas[0].querySelector('i')).toBeTruthy();
    expect(caixas[1].querySelector('i')).toBeNull();
  });

  it('a classe `on` marca a linha nos dois modos', () => {
    const pj = montarPj(new Set(['pj:0'])).container;
    expect(pj.querySelectorAll('.hist-protag-item.on')).toHaveLength(1);
    cleanup();
    const cri = montarCriaturas(new Map([['cri:0', 2], ['cri:1', 0], ['cri:2', 0]])).container;
    expect(cri.querySelectorAll('.hist-protag-item.on')).toHaveLength(1);
  });
});

describe('criatura desmarcada não mostra o stepper', () => {
  it('qtd 0 esconde o seletor de quantidade', () => {
    const { container } = montarCriaturas(new Map(itens(3, 'cri').map((i) => [i.key, 0])));
    expect(container.querySelectorAll('.part-qty-stepper')).toHaveLength(0);
  });

  it('e qtd ≥ 1 o mostra', () => {
    const { container } = montarCriaturas(new Map([['cri:0', 3], ['cri:1', 0], ['cri:2', 0]]));
    expect(container.querySelectorAll('.part-qty-stepper')).toHaveLength(1);
  });
});

describe('o bulk de criaturas continua acessível', () => {
  it('"zerar todas" fica desabilitado quando já está tudo em zero', () => {
    montarCriaturas(new Map(itens(3, 'cri').map((i) => [i.key, 0])));
    // O único bulk que depende de haver seleção — os outros dois (uma de cada,
    // mais uma de cada) valem sempre.
    const zerar = [...document.querySelectorAll('.part-section-bulk button')]
      .find((b) => b.querySelector('.ti-ban'));
    expect(zerar).toBeTruthy();
    expect(zerar.disabled).toBe(true);
  });
});

/* ── O padrão inicial, que é onde o pedido "todas desmarcadas" mora ──────── */
describe('NovaBatalhaView: criaturas nascem desmarcadas', () => {
  let NovaBatalhaView;
  beforeAll(() => {
    NovaBatalhaView = window.NovaBatalhaView;
    expect(NovaBatalhaView, 'NovaBatalhaView precisa estar no window').toBeTypeOf('function');
  });

  const pjs = [{ id: 1, nome: 'Thalia', sobrenome: 'Vent', raca: 'Humano', profissao: 'Bardo' }];
  const cris = [
    { id: 10, nome: 'Lobisomem', tipo: 'Animal', estagio: 2 },
    { id: 11, nome: 'Balor', tipo: 'Demônio', estagio: 5 },
  ];

  /* NovaBatalhaView lê o banco para descobrir os ANIMAIS dos PJs (inventário +
     itens com criatura_id). Não é o assunto deste teste, mas o efeito roda no
     mount e o stub de setup-fases explode de propósito — então aqui vale o
     fake, com as três tabelas vazias: sem animais, sobram PJs e criaturas,
     que é o que se quer medir. */
  const montar = (onState) => {
    globalThis.supabaseClient = fakeSupabase({ personagens: [], itens: [], criaturas: [] });
    return render(
      <NovaBatalhaView
        isEn={false} pjsVinc={pjs} criaturasVinc={cris}
        onCriar={async () => {}} criarRef={{ current: null }}
        onStateChange={onState || (() => {})}
      />
    );
  };

  it('nenhuma criatura marcada, nenhum stepper na tela', () => {
    const { container } = montar();
    expect(container.querySelectorAll('.part-qty-stepper')).toHaveLength(0);
    // Os PJs continuam pré-marcados: o pedido era só sobre criaturas.
    const marcadas = [...container.querySelectorAll('.hist-protag-item.on')];
    expect(marcadas).toHaveLength(pjs.length);
    expect(marcadas[0].textContent).toContain('Thalia');
  });

  it('o total inicial conta só os PJs, e o Criar segue habilitado', () => {
    let estado = null;
    montar((s) => { estado = s; });
    expect(estado).toMatchObject({ total: pjs.length, canConfirm: true });
  });
});
