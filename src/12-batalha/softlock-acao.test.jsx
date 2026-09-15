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
// higiene 8 (revisão final): AcaoPanel chama tecnicaEfeitoDe por nome nu
// assim que alguma fixture tiver técnica selecionada — sem este import a
// primeira que tivesse derrubava o teste com ReferenceError. Nenhuma
// fixture deste arquivo seleciona técnica hoje, então passava por sorte.
import '../01-core/tecnicas-efeito.jsx';
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

/* ── Alvo FORA DE ALCANCE (13/09/2026) ─────────────────────────────
   "Eu não devo poder atacar um adversário que está mais longe que minha arma
    alcança, fiz isso e agora estou preso no ataque pois não consigo atacar."
   (usuário)

   O Atacar já exigia alcance (podeAplicar), mas o botão de ROLAR não: dava
   pra rolar contra o alvo longe, e aí a trava de rolagem (que impede fugir de
   um resultado ruim) prendia o painel numa ação impossível de aplicar. A
   rolagem pendente fica gravada na batalha, então recarregar não soltava.

     1. rolar exige o alvo no alcance (arma e magia);
     2. rolagem que já existe com o alvo fora de alcance é DESCARTADA — no
        painel e na batalha (onRolagemSalvaChange(null)) —, e o painel solta. */
describe('AcaoPanel — alvo fora do alcance da arma', () => {
  // Machado: alcance 0 no catálogo → 1 célula (corpo a corpo). Tokens 2×2:
  // x 0 e x 10 ficam a 9 células de borda a borda; x 2 é encostado.
  const PERTO = { x: 0, y: 0 };
  const LONGE = { x: 10, y: 0 };
  const ATOR_POS = { ...ATOR, pos: PERTO };
  const ALVO_LONGE = { ...ALVO_MORTO, status: 'ativo', pa_rest: 1, ef: 30, eh: 12, pos: LONGE };

  function montarLonge({ rolagemSalva = null, onSalva = () => {}, onPendente = () => {}, alvo = ALVO_LONGE } = {}) {
    return render(
      <div className="menestrel-ui">
        <AcaoPanel
          ator={ATOR_POS}
          participantes={[ATOR_POS, alvo]}
          catalogos={CATALOGOS}
          lang="pt"
          onAplicar={() => {}} onAplicarTeste={() => {}} onAplicarItem={() => {}} onCancel={() => {}}
          onRolagemPendenteChange={onPendente}
          rolagemSalva={rolagemSalva}
          onRolagemSalvaChange={onSalva}
        />
      </div>
    );
  }
  const btnRolar = () => document.querySelector('.dado-ov-trigger button');

  it('avisa que está fora de alcance e NÃO deixa rolar o dado', () => {
    montarLonge();
    expect(screen.getByText(/Alvo fora de alcance/i)).toBeTruthy();
    expect(btnRolar().disabled).toBe(true);
    // O dado na linha é o próprio golpe (14/09/2026): não há Atacar à parte.
    expect(document.querySelector('.atacar-confirmar')).toBeNull();
  });

  it('com o alvo encostado, rolar continua liberado', () => {
    montarLonge({ alvo: { ...ALVO_LONGE, pos: { x: 2, y: 0 } } });
    expect(screen.queryByText(/Alvo fora de alcance/i)).toBeNull();
    expect(btnRolar().disabled).toBe(false);
  });

  it('quem JÁ ficou preso (rolagem gravada, alvo longe) é solto: a rolagem é descartada', () => {
    const salvas = [];
    const pendentes = [];
    montarLonge({ rolagemSalva: ROLAGEM_SALVA, onSalva: (r) => salvas.push(r), onPendente: (v) => pendentes.push(v) });
    expect(salvas, 'apaga a rolagem gravada na batalha').toContain(null);
    expect(pendentes.at(-1), 'o painel não fica mais travado').toBe(false);
    expect(screen.queryByText(/Já rolou/i)).toBeNull();
    expect(btnRolar().disabled, 'e continua sem poder rolar contra o alvo longe').toBe(true);
  });

  it('rolagem gravada com o alvo NO alcance continua valendo (a trava geral não afrouxou)', () => {
    const salvas = [];
    montarLonge({ rolagemSalva: ROLAGEM_SALVA, onSalva: (r) => salvas.push(r), alvo: { ...ALVO_LONGE, pos: { x: 2, y: 0 } } });
    expect(salvas).not.toContain(null);
    expect(screen.getByText(/Já rolou/i)).toBeTruthy();
  });
});

/* ── Rolagem RESTAURADA com a escolha errada (13/09/2026) ─────────────
   "Depois de tirar um rotineiro em desviar, o menu trava e não consigo fazer
    mais nada em batalha." (usuário)

   Batalha 96, Galadar: rolou Desviar (d20 3). Na tela do jogador, gravar a
   rolagem FECHAVA o painel; reabrir restaurava aba e dado, mas não QUAL
   técnica — o painel escolhia a primeira da lista, Imprevisibilidade, de uso
   Único e já gasta. Aplicar desabilitado, seletor travado pela rolagem, menu
   travado: sem saída. O Mestre teve de gastar os PA do Galadar com itens.

     • a rolagem passa a guardar as escolhas (`sel`) e o painel as restaura;
     • rolagem restaurada que não dá para aplicar é DESCARTADA e o painel solta
       (é o caso das rolagens antigas, sem `sel`, como a do Galadar). */
describe('AcaoPanel — rolagem restaurada lembra a técnica escolhida', () => {
  const TECS = {
    imprevisibilidade: { key: 'imprevisibilidade', nome: 'Imprevisibilidade', uso: 'Único', ajuste: 'percepcao', grupo_armas: 'Livre', grupo_armaduras: 'L', efeito: 'Defesa.' },
    desviar: { key: 'desviar', nome: 'Desviar', uso: 'Intermitente', ajuste: 'agilidade', grupo_armas: 'Livre', grupo_armaduras: 'L, M', efeito: 'Ignora 50% do dano.' },
  };
  const GALADAR_PJ = { ...PJ, id: 57, nome: 'Galadar', tecnicas: { imprevisibilidade: 2, desviar: 3 } };
  const GALADAR = { ...ATOR, ref_id: 57, inst_id: 'pj:57', nome: 'Galadar', pa_rest: 2, defesa_sigla: 'L',
    tecnicas_usadas: ['imprevisibilidade'] };
  const VIVO = { ...ALVO_MORTO, status: 'ativo' };
  const CATS = { pjById: { 57: GALADAR_PJ }, catalogoBySlug: CATALOGO, magiasByKey: {}, tecnicasByKey: TECS };

  function montarG(rolagemSalva) {
    const salvas = [];
    const pendentes = [];
    render(
      <div className="menestrel-ui">
        <AcaoPanel ator={GALADAR} participantes={[GALADAR, VIVO]} catalogos={CATS} lang="pt"
          onAplicar={() => {}} onAplicarTeste={() => {}} onAplicarItem={() => {}} onCancel={() => {}}
          onRolagemPendenteChange={(v) => pendentes.push(v)}
          rolagemSalva={rolagemSalva} onRolagemSalvaChange={(r) => salvas.push(r)} />
      </div>
    );
    return { salvas, pendentes };
  }
  const base = { ator: { tipo: 'pj', ref_id: 57, inst_id: 'pj:57' }, tab: 'tecnica_teste', d20: 3, d20_critico: null };

  it('com a escolha salva, volta em Desviar e dá para aplicar o Rotineiro', () => {
    const { salvas } = montarG({ ...base, sel: { tecTesteKey: 'desviar' } });
    expect(salvas).not.toContain(null);
    expect(screen.getByText(/Já rolou/i)).toBeTruthy();
    expect(document.querySelector('.select-pill-btn').textContent).toMatch(/Desviar/);
    expect(document.querySelector('.atacar-confirmar').disabled).toBe(false);
  });

  it('o CASO do Galadar (rolagem antiga, sem escolha): descarta e solta o painel', () => {
    const { salvas, pendentes } = montarG(base);
    expect(salvas).toContain(null);
    expect(pendentes.at(-1)).toBe(false);
    expect(screen.queryByText(/Já rolou/i)).toBeNull();
  });

  it('escolha salva que não existe mais (técnica sumiu): também descarta', () => {
    const { salvas } = montarG({ ...base, sel: { tecTesteKey: 'tecnica_que_nao_existe' } });
    expect(salvas).toContain(null);
  });

  /* "Resultado do ataque anterior está influenciando o novo ataque." — o
     Adrian atacou duas vezes com o MESMO d20 13 em 7 s: a rolagem já aplicada
     voltou (snapshot atrasado) e o 2º ataque a reaproveitou. A rolagem guarda
     a assinatura de ação do ator; se ele já gastou ação desde então, é de uma
     ação que JÁ ACONTECEU. */
  it('rolagem de uma ação já gasta (PA mudou desde o dado): descarta', () => {
    const M = window.MotorBatalha;
    const assinQuandoRolou = M.assinaturaDaRolagem({ ...GALADAR, pa_rest: 2 });
    // Galadar agora com 1 PA: a ação daquela rolagem já foi aplicada.
    const salvas = [];
    render(
      <div className="menestrel-ui">
        <AcaoPanel ator={{ ...GALADAR, pa_rest: 1 }} participantes={[{ ...GALADAR, pa_rest: 1 }, VIVO]} catalogos={CATS} lang="pt"
          onAplicar={() => {}} onAplicarTeste={() => {}} onAplicarItem={() => {}} onCancel={() => {}}
          onRolagemPendenteChange={() => {}}
          rolagemSalva={{ ...base, sel: { tecTesteKey: 'desviar' }, assin: assinQuandoRolou }}
          onRolagemSalvaChange={(r) => salvas.push(r)} />
      </div>
    );
    expect(salvas).toContain(null);
    expect(screen.queryByText(/Já rolou/i)).toBeNull();
  });

  it('mesma assinatura (nada gasto desde o dado): a rolagem continua valendo', () => {
    const M = window.MotorBatalha;
    const { salvas } = montarG({ ...base, sel: { tecTesteKey: 'desviar' }, assin: M.assinaturaDaRolagem(GALADAR) });
    expect(salvas).not.toContain(null);
    expect(screen.getByText(/Já rolou/i)).toBeTruthy();
  });
});

describe('AcaoPanel — rolagem pendente sem alvo possível', () => {
  it('reconhece o estado: sem alvos válidos e com a rolagem já feita', () => {
    montar();
    expect(screen.getByText(/Sem alvos válidos/i)).toBeTruthy();
    // Nada a aplicar: não há alvo pra acertar, então nenhum confirmar habilitado.
    const confirmar = document.querySelector('.atacar-confirmar');
    expect(confirmar == null || confirmar.disabled).toBe(true);
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
