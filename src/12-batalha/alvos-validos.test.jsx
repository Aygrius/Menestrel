/* ============================================================
   alvos-validos.test.jsx — quem pode ser atacado
   ============================================================
   Regra confirmada em 01/09/2026: "Apenas os combatentes mortos não podem
   ser atacados novamente. Em todos os demais casos, os combatentes podem
   ser atacados."

   Antes disso a lista de alvos exigia `status === 'ativo'`, o que deixava
   desmaiado e desistiu intocáveis — não dava para dar o golpe de misericórdia
   em quem caiu, nem perseguir quem largou a luta.

   Consequência da mesma regra, decidida junto: se dá para atacar, tem que dar
   para matar. `desistiu` passa a ser promovido a `morto` no piso de EF, igual
   a ativo e desmaiado — senão vira saco de pancada imortal. A promoção vive em
   DOIS lugares que a doc do código manda manter idênticos (aplicarDanoCascata
   e aplicarDanoDiretoEF, "as mesmas transições de status da cascata"), e os
   dois estão travados aqui.

   O que NÃO muda, e está travado como regressão:
     • morto continua fora da lista de alvos;
     • quem AGE segue exigindo 'ativo' (proximoAtivo) — atacável e apto a agir
       são coisas diferentes.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
// higiene 8 (revisão final): AcaoPanel chama tecnicaEfeitoDe por nome nu
// assim que alguma fixture tiver técnica selecionada — sem este import a
// primeira que tivesse derrubava o teste com ReferenceError.
import '../01-core/tecnicas-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M, AcaoPanel;
beforeAll(() => {
  M = window.MotorBatalha;
  AcaoPanel = window.AcaoPanel;
  expect(M).toBeDefined();
  expect(AcaoPanel).toBeDefined();
});
afterEach(cleanup);

const lutador = (nome, extra) => ({
  tipo: 'criatura', ref_id: nome, inst_id: 'criatura:' + nome, nome, ordem: 2,
  status: 'ativo', atual: false, vb: 18,
  pa_max: 2, pa_rest: 2, mov_rest: 5, moveu_na_rodada: false,
  ef: 10, ef_max: 30, eh: 5, eh_max: 12, ar: 0, ar_max: 0, karma: 0, karma_max: 0,
  status_temp: [], ...extra,
});

describe('podeSerAtacado — só o morto sai da lista', () => {
  it('ativo pode ser atacado', () => {
    expect(M.podeSerAtacado(lutador('A'))).toBe(true);
  });

  it('desmaiado pode ser atacado (golpe de misericórdia)', () => {
    expect(M.podeSerAtacado(lutador('A', { status: 'desmaiado' }))).toBe(true);
  });

  it('desistiu pode ser atacado', () => {
    expect(M.podeSerAtacado(lutador('A', { status: 'desistiu' }))).toBe(true);
  });

  it('morto NÃO pode ser atacado', () => {
    expect(M.podeSerAtacado(lutador('A', { status: 'morto' }))).toBe(false);
  });

  it('participante ausente não quebra o filtro', () => {
    expect(M.podeSerAtacado(null)).toBe(false);
    expect(M.podeSerAtacado(undefined)).toBe(false);
  });
});

describe('quem apanha pode morrer — aplicarDanoCascata', () => {
  // EF_MORTE = -15: dano que leva a EF ao piso mata.
  const letal = 40;

  it('desistiu vira morto ao furar o piso de EF', () => {
    const p = lutador('A', { status: 'desistiu', eh: 0, ar: 0, ef: 10 });
    expect(M.aplicarDanoCascata(letal, p, false).status).toBe('morto');
  });

  it('desmaiado continua virando morto', () => {
    const p = lutador('A', { status: 'desmaiado', eh: 0, ar: 0, ef: 10 });
    expect(M.aplicarDanoCascata(letal, p, false).status).toBe('morto');
  });

  it('ativo ainda desmaia antes de morrer', () => {
    const p = lutador('A', { status: 'ativo', eh: 0, ar: 0, ef: 10 });
    expect(M.aplicarDanoCascata(5, p, false).status).toBe('desmaiado');
  });

  it('dano leve em quem desistiu não muda o status', () => {
    const p = lutador('A', { status: 'desistiu', eh: 0, ar: 0, ef: 10 });
    expect(M.aplicarDanoCascata(3, p, false).status).toBe('desistiu');
  });
});

describe('veneno segue as MESMAS transições da cascata — aplicarDanoDiretoEF', () => {
  it('desistiu vira morto no piso de EF', () => {
    const p = lutador('A', { status: 'desistiu', ef: 10 });
    expect(M.aplicarDanoDiretoEF(40, p).status).toBe('morto');
  });

  it('desmaiado continua virando morto', () => {
    const p = lutador('A', { status: 'desmaiado', ef: 10 });
    expect(M.aplicarDanoDiretoEF(40, p).status).toBe('morto');
  });
});

describe('agir ≠ apanhar — proximoAtivo não afrouxa', () => {
  it('desmaiado e desistiu continuam sem entrar na vez', () => {
    const arr = [
      { ...lutador('A', { status: 'desmaiado' }), ordem: 1 },
      { ...lutador('B', { status: 'desistiu' }),  ordem: 2 },
    ];
    expect(M.proximoAtivo(arr, 0)).toBeFalsy();
  });
});

/* ── O painel realmente usa o predicado ───────────────────────── */

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
  pa_max: 2, pa_rest: 2, mov_rest: 5, moveu_na_rodada: false,
  ef: 10, ef_max: 10, eh: 5, eh_max: 5, ar: 0, ar_max: 0, karma: 0, karma_max: 0,
  status_temp: [], condicoes: {},
};

function montar(outros) {
  return render(
    <div className="menestrel-ui">
      <AcaoPanel
        ator={ATOR}
        participantes={[ATOR, ...outros]}
        catalogos={CATALOGOS}
        lang="pt"
        onAplicar={() => {}}
        onAplicarTeste={() => {}}
        onAplicarItem={() => {}}
        onCancel={() => {}}
        onRolagemPendenteChange={() => {}}
        rolagemSalva={null}
        onRolagemSalvaChange={() => {}}
      />
    </div>
  );
}

// SelectPill é um dropdown próprio (botão + painel em portal), não um <select>
// nativo: as opções só existem no DOM depois do clique. Em vez de dirigir o
// dropdown, aqui vale o contrato VISÍVEL do painel — "Sem alvos válidos."
// aparece exatamente quando a lista de alvos está vazia. A semântica fina da
// lista já está travada nos testes puros de podeSerAtacado, acima.
const semAlvos = () => screen.queryByText(/Sem alvos válidos/i);

describe('AcaoPanel — a lista de alvos segue a regra', () => {
  it('um desmaiado já conta como alvo', () => {
    montar([lutador('Caído', { status: 'desmaiado', inst_id: 'criatura:caido' })]);
    expect(semAlvos()).toBeNull();
  });

  it('quem desistiu também conta como alvo', () => {
    montar([lutador('Fujão', { status: 'desistiu', inst_id: 'criatura:fujao' })]);
    expect(semAlvos()).toBeNull();
  });

  it('com todos mortos, volta ao aviso de sem alvos', () => {
    montar([lutador('Lobisomem', { status: 'morto' })]);
    expect(semAlvos()).toBeTruthy();
  });

  it('morto não entra na conta quando há um desmaiado junto', () => {
    montar([
      lutador('Caído',     { status: 'desmaiado', inst_id: 'criatura:caido' }),
      lutador('Lobisomem', { status: 'morto',     inst_id: 'criatura:lobo'  }),
    ]);
    expect(semAlvos()).toBeNull();
  });
});
