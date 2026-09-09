/* ============================================================
   apoio-tab.test.jsx — a aba Apoio do painel de Ação
   ============================================================
   Cobre o contrato da aba: só aparece pra quem tem magia de apoio, mostra o
   efeito no nível efetivo, e só oferece rolagem quando a magia exige teste de
   resistência ("Aumente 2 de velocidade" não rola; "Reduza 4 pontos de
   velocidade" da Distração rola, porque a descrição pede teste).

   Ver docs/superpowers/specs/2026-09-01-efeitos-batalha-velocidade-design.md §4.5
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let AcaoPanel;
beforeAll(() => { AcaoPanel = window.AcaoPanel; expect(AcaoPanel).toBeDefined(); });
afterEach(cleanup);

const CATALOGO = { machado_pesado: {
  slug: 'machado_pesado', nome: 'Machado Pesado', dano: 20,
  dano_l: -3, dano_m: -1, dano_p: 2, ajuste_atributo: 'FOR',
  grupo_armas: 'CM', alcance: 0 } };

const pjBase = {
  id: 64, nome: 'Yuldrous', raca: 'Anão', reino: 'Verrogar',
  profissao: 'Sacerdote', especializacao: 'Ordem de Crezir', deus: 'Crezir',
  intelecto_base: 2, aura_base: 2, carisma_base: 0,
  forca_base: 2, fisico_base: 2, agilidade_base: 2, percepcao_base: 1,
  experiencia: 42, habilidades: {}, habilidades_bonus: {}, tecnicas: {},
  aprimoramentos: {}, caracterizacao: {}, grupos_armas: { CM: 1 },
  estado_atual: { bonusArmas: {}, condicoes: {} },
  inventario: { itens: [{ slug: 'machado_pesado', slot: 'mao_d', equipado: true }] },
};

// Textos copiados do banco de produção.
const MAGIAS = {
  velocidade: { key: 'velocidade', nome: 'Velocidade', duracao: '30 minutos',
    descricao: 'Uma descarga cinética envolve seu corpo. Se sua velocidade ultrapassar 30, você terá uma segunda ação na mesma rodada.',
    nivel_1: 'Aumente 2 de velocidade.' },
  distracao: { key: 'distracao', nome: 'Distração', duracao: '2 rodadas',
    descricao: 'Você emite um som capaz de chamar a atenção de todos que não passarem em um teste de resistência mágica.',
    nivel_1: 'Reduza 4 pontos de velocidade.' },
  cancao: { key: 'cancao', nome: 'Canção do Ânimo', duracao: 'Variável',
    descricao: 'Notas musicais que dão disposição aos ouvintes.',
    nivel_1: 'Aumente 1 de velocidade e 5 de energia heroica.' },
};

const ATOR = {
  tipo: 'pj', ref_id: 64, inst_id: 'pj:64', nome: 'Yuldrous', ordem: 1,
  status: 'ativo', atual: true, vb: 20, pa_max: 2, pa_rest: 2,
  mov_rest: 5, moveu_na_rodada: false,
  ef: 10, ef_max: 10, eh: 5, eh_max: 5, ar: 0, ar_max: 0,
  karma: 9, karma_max: 9, status_temp: [], condicoes: {},
};

const INIMIGO = {
  tipo: 'criatura', ref_id: 'lobo', inst_id: 'criatura:lobo', nome: 'Lobisomem',
  ordem: 2, status: 'ativo', atual: false, vb: 18, pa_max: 2, pa_rest: 2,
  mov_rest: 5, moveu_na_rodada: false,
  ef: 30, ef_max: 30, eh: 12, eh_max: 12, ar: 0, ar_max: 0,
  karma: 0, karma_max: 0, rf: 10, rm: 8, status_temp: [],
};

function montar(magiasDoPj, onAplicarApoio) {
  const pj = { ...pjBase, magias: magiasDoPj };
  return render(
    <div className="menestrel-ui">
      <AcaoPanel
        ator={ATOR}
        participantes={[ATOR, INIMIGO]}
        catalogos={{ pjById: { 64: pj }, catalogoBySlug: CATALOGO, magiasByKey: MAGIAS }}
        lang="pt"
        onAplicar={() => {}} onAplicarTeste={() => {}} onAplicarItem={() => {}}
        onAplicarApoio={onAplicarApoio || (() => {})} onCancel={() => {}}
        onRolagemPendenteChange={() => {}}
        rolagemSalva={null} onRolagemSalvaChange={() => {}}
      />
    </div>
  );
}

// Casa por TEXTO ou por aria-label: desde 02/09/2026 o botão de rolar o d20 e
// o de confirmar a ação são só-ícone, e o rótulo passou a viver no aria-label.
const btn = (re) => screen.getAllByRole('button').find(
  (b) => re.test(b.textContent) || re.test(b.getAttribute('aria-label') || '')
);
const abaApoio = () => btn(/^Apoio$/);

describe('aba Apoio — quando aparece', () => {
  it('não aparece pra quem não tem magia nenhuma', () => {
    montar({});
    expect(abaApoio()).toBeFalsy();
  });

  it('aparece quando o PJ tem magia que mexe em velocidade', () => {
    montar({ velocidade: 1 });
    expect(abaApoio()).toBeTruthy();
  });

  it('não aparece se a magia conhecida não existe no catálogo', () => {
    montar({ inexistente: 1 });
    expect(abaApoio()).toBeFalsy();
  });
});

describe('aba Apoio — conteúdo', () => {
  it('mostra o efeito e a duração da magia escolhida', () => {
    montar({ velocidade: 1 });
    fireEvent.click(abaApoio());
    expect(screen.getByText(/\+2/)).toBeTruthy();
    expect(screen.getByText(/até o fim da batalha/i)).toBeTruthy();
  });

  it('magia de duração fixa mostra as rodadas', () => {
    montar({ distracao: 1 });
    fireEvent.click(abaApoio());
    expect(screen.getByText(/por 2 rodadas/i)).toBeTruthy();
  });

  it('magia de concentração avisa o que quebra', () => {
    montar({ cancao: 1 });
    fireEvent.click(abaApoio());
    expect(screen.getByText(/quebra a concentração/i)).toBeTruthy();
  });
});

describe('aba Apoio — rolagem só quando a magia exige', () => {
  it('magia SEM teste não oferece rolagem de dado', () => {
    montar({ velocidade: 1 });
    fireEvent.click(abaApoio());
    expect(btn(/Rolar d20/i)).toBeFalsy();
  });

  it('magia COM teste de resistência oferece a rolagem', () => {
    montar({ distracao: 1 });
    fireEvent.click(abaApoio());
    expect(btn(/Rolar d20/i)).toBeTruthy();
  });

  it('magia sem teste já pode ser confirmada, sem rolar nada', () => {
    montar({ velocidade: 1 });
    fireEvent.click(abaApoio());
    const usar = btn(/Usar \(1 PA/i);
    expect(usar).toBeTruthy();
    expect(usar.disabled).toBe(false);
  });

  it('magia com teste fica travada até o dado sair', () => {
    montar({ distracao: 1 });
    fireEvent.click(abaApoio());
    const usar = btn(/Usar \(1 PA/i);
    expect(usar).toBeTruthy();
    expect(usar.disabled).toBe(true);
  });
});

/* ── Alvo: o conjurador precisa poder mirar em si mesmo ───────────
   A spec pedia "a lista de alvos MAIS o próprio ator", e a implementação
   saiu só com os outros. Isso não é uma opção a menos: a magia Velocidade
   tem alcance "Pessoal", ou seja, SÓ pode ser lançada em si mesmo — então a
   única magia de velocidade que os PJs conhecem hoje era impossível de usar
   corretamente. */
describe('aba Apoio — mirar em si mesmo', () => {
  it('magia Pessoal aplica no PRÓPRIO conjurador', () => {
    let payload = null;
    montar({ velocidade: 1 }, (p) => { payload = p; });
    fireEvent.click(abaApoio());
    fireEvent.click(btn(/Usar \(1 PA/i));
    expect(payload).toBeTruthy();
    expect(payload.alvo.inst_id).toBe(ATOR.inst_id);
  });

  it('magia Pessoal não oferece mais ninguém como alvo', () => {
    montar({ velocidade: 1 });
    fireEvent.click(abaApoio());
    // O SelectPill fechado mostra o rótulo do valor atual; com um alvo só,
    // o nome do inimigo não pode aparecer em lugar nenhum do painel.
    expect(screen.queryByText(/Lobisomem/)).toBeNull();
  });

  it('debuff de alcance metrado mira no OUTRO por padrão', () => {
    let payload = null;
    montar({ distracao: 1 }, (p) => { payload = p; });
    fireEvent.click(abaApoio());
    // Distração exige teste de resistência; o botão só libera depois do dado.
    // Aqui basta conferir para quem o painel está mirando por padrão.
    expect(screen.getByText(/Lobisomem/)).toBeTruthy();
    expect(payload).toBeNull();
  });

  it('buff de alcance metrado mira em SI por padrão', () => {
    let payload = null;
    montar({ cancao: 1 }, (p) => { payload = p; });
    fireEvent.click(abaApoio());
    fireEvent.click(btn(/Usar \(1 PA/i));
    expect(payload.alvo.inst_id).toBe(ATOR.inst_id);
  });
});
