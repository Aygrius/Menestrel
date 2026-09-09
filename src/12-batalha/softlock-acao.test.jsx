/* ============================================================
   softlock-acao.test.jsx — o painel de Ação nunca fica sem saída
   ============================================================
   Bug relatado: o combatente atacava, matava o último alvo válido, e o
   painel ficava preso mostrando ao mesmo tempo

       "Sem alvos válidos."          (não há mais em quem bater)
       "Já rolou — continue em Atacar."  (a trava "rolou, não rola de novo")

   sem nenhuma saída: Atacar desabilitado (podeAplicar exige alvo), abas
   travadas por temRolagemPendente, Cancelar substituído pelo aviso e o X
   do menu do token escondido por menuTravado. Só recarregando a página.

   A trava de rolagem existe pra impedir que se escape de um resultado ruim
   sem gastar o PA. Mas quando NÃO HÁ alvo, a ação rolada é impossível de
   aplicar — não há o que escapar, e prender o painel é só um beco sem
   saída. Mesma exceção que o empate na Resistência já abria.

   O caminho que levava até esse estado (uma virada de rodada deixando o
   painel aberto) foi fechado em novaRodada; este teste tranca a rede de
   segurança do próprio painel, que vale para qualquer outra rota até lá
   (ex.: o alvo morrer via realtime com a rolagem já feita).
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
// Tabuleiro depois de batalha: alcanceDaAcao/alvoNoAlcance vivem lá e o
// painel os chama pra checar alcance (mesma ordem do main.tsx).
import './tabuleiro.jsx';

let AcaoPanel;
beforeAll(() => {
  AcaoPanel = window.AcaoPanel;
  expect(AcaoPanel).toBeDefined();
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

// O único oponente, já derrubado pelo golpe que acabou de ser aplicado.
const ALVO_MORTO = {
  tipo: 'criatura', ref_id: 'lobo', inst_id: 'criatura:lobo', nome: 'Lobisomem', ordem: 2,
  status: 'morto', atual: false, vb: 18,
  pa_max: 2, pa_rest: 0, mov_rest: 0, moveu_na_rodada: false,
  ef: 0, ef_max: 30, eh: 0, eh_max: 12, ar: 0, ar_max: 0, karma: 0, karma_max: 0,
  status_temp: [],
};

// Rolagem já feita e não aplicada, na aba Arma — é ela que liga a trava.
const ROLAGEM_SALVA = {
  ator: { tipo: 'pj', ref_id: 64, inst_id: 'pj:64' },
  tab: 'arma', d20: 11, d20_critico: null,
};

function montar(onRolagemPendenteChange = () => {}) {
  return render(
    <div className="menestrel-ui">
      <AcaoPanel
        ator={ATOR}
        participantes={[ATOR, ALVO_MORTO]}
        catalogos={CATALOGOS}
        lang="pt"
        onAplicar={() => {}}
        onAplicarTeste={() => {}}
        onAplicarItem={() => {}}
        onCancel={() => {}}
        onRolagemPendenteChange={onRolagemPendenteChange}
        rolagemSalva={ROLAGEM_SALVA}
        onRolagemSalvaChange={() => {}}
      />
    </div>
  );
}

// Casa por TEXTO ou por aria-label: desde 02/09/2026 o botão de rolar o d20 e
// o de confirmar a ação são só-ícone, e o rótulo passou a viver no aria-label.
const botao = (re) => screen.getAllByRole('button').find(
  (b) => re.test(b.textContent) || re.test(b.getAttribute('aria-label') || '')
);

describe('AcaoPanel — rolagem pendente sem alvo possível', () => {
  it('reconhece o estado: sem alvos válidos e com a rolagem já feita', () => {
    montar();
    expect(screen.getByText(/Sem alvos válidos/i)).toBeTruthy();
    // Atacar continua (corretamente) desabilitado: não há alvo pra acertar.
    const atacar = botao(/Atacar \(1 PA\)/i);
    expect(atacar).toBeTruthy();
    expect(atacar.disabled).toBe(true);
  });

  it('oferece uma saída: destrava o menu, no lugar do aviso "Já rolou"', () => {
    // A saída ERA o botão Cancelar, removido do painel em 02/09/2026. A
    // garantia não mudou de existência, mudou de porta: o painel reporta
    // `temRolagemPendente = false` neste estado, e é esse false que faz o
    // ConduzirBatalhaView soltar `menuTravado` e devolver o X do menu do
    // token — que é hoje a saída. Testar o RELATO em vez do botão trava o
    // mecanismo, não um sintoma dele.
    const reportou = [];
    montar((v) => reportou.push(v));
    expect(reportou.at(-1), 'painel sem alvo tem que reportar SEM rolagem pendente').toBe(false);
    expect(screen.queryByText(/Já rolou/i)).toBeNull();
  });

  it('com alvo vivo, a trava continua de pé (não afrouxou a regra geral)', () => {
    const vivo = { ...ALVO_MORTO, status: 'ativo' };
    render(
      <div className="menestrel-ui">
        <AcaoPanel
          ator={ATOR}
          participantes={[ATOR, vivo]}
          catalogos={CATALOGOS}
          lang="pt"
          onAplicar={() => {}}
          onAplicarTeste={() => {}}
          onAplicarItem={() => {}}
          onCancel={() => {}}
          onRolagemPendenteChange={() => {}}
          rolagemSalva={ROLAGEM_SALVA}
          onRolagemSalvaChange={() => {}}
        />
      </div>
    );
    expect(screen.getByText(/Já rolou/i)).toBeTruthy();
    expect(botao(/^Cancelar$/i)).toBeFalsy();
  });
});
