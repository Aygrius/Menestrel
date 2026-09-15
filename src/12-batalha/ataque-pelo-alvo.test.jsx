/* ============================================================
   ataque-pelo-alvo.test.jsx — atacar clicando no avatar do inimigo
   ============================================================
   "No tabuleiro, dê opção para o combatente de clicar no avatar do inimigo
   que ele quer atacar, e a partir daí abrir um menu para as opções."
   (usuário, 12/09/2026)

   O menu do avatar do inimigo oferece "ataca com Arma / Magia"; escolher abre
   o AcaoPanel ali mesmo, com o lutador da vez como ator e ESTE inimigo já
   marcado. O contrato que torna isso possível mora no painel —
   `alvoInicialId` e `abaInicial` — e é ele que este teste trava. A fiação nos
   dois menus (Mestre e Jogador) é conferida pelo texto-fonte.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let AcaoPanel;
beforeAll(() => {
  AcaoPanel = window.AcaoPanel;
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

const GOBLIN = lutador('Goblin');
const OGRO = lutador('Ogro');

function montar(extra = {}) {
  return render(
    <div className="menestrel-ui">
      <AcaoPanel
        ator={ATOR}
        participantes={[ATOR, GOBLIN, OGRO]}
        catalogos={CATALOGOS}
        lang="pt"
        onAplicar={() => {}}
        onAplicarTeste={() => {}}
        onAplicarItem={() => {}}
        onCancel={() => {}}
        onRolagemPendenteChange={() => {}}
        rolagemSalva={null}
        onRolagemSalvaChange={() => {}}
        {...extra}
      />
    </div>
  ).container;
}

// O alvo marcado aparece no rótulo do seletor (SelectPill). Um dos rótulos
// traz o nome do alvo; basta achar qual dos dois inimigos está lá.
const alvoMarcado = (c) => {
  const rotulos = [...c.querySelectorAll('.select-pill-btn-label')].map((el) => el.textContent);
  if (rotulos.some((t) => /Ogro/.test(t))) return 'Ogro';
  if (rotulos.some((t) => /Goblin/.test(t))) return 'Goblin';
  return null;
};

describe('AcaoPanel — nasce apontado para o inimigo clicado', () => {
  it('sem alvo inicial, marca o primeiro da lista (como sempre)', () => {
    expect(alvoMarcado(montar())).toBe('Goblin');
  });

  it('com alvoInicialId, marca ESSE inimigo', () => {
    expect(alvoMarcado(montar({ alvoInicialId: OGRO.inst_id, abaInicial: 'arma' }))).toBe('Ogro');
  });

  it('alvo inicial que não é atacável cai no primeiro, sem quebrar', () => {
    expect(alvoMarcado(montar({ alvoInicialId: 'criatura:inexistente', abaInicial: 'arma' }))).toBe('Goblin');
  });

  it('aba pedida que o ator não tem (magia, sem magias) cai na padrão', () => {
    const c = montar({ alvoInicialId: OGRO.inst_id, abaInicial: 'magia' });
    expect(alvoMarcado(c)).toBe('Ogro');
  });
});

describe('a fiação nos dois menus do tabuleiro', () => {
  const fonte = readFileSync(resolve(__dirname, 'batalha.jsx'), 'utf8');

  // 13/09/2026: sem o texto "Fulano ataca com"; os botões entram na fileira
  // única do card, no fundo dos outros círculos (sem variante primary).
  // 14/09/2026: no Jogador, UM botão "Atacar" na linha do X (batalha-head-acoes).
  it('Mestre e Jogador oferecem o ataque no avatar do inimigo, inline', () => {
    expect(fonte.match(/className="batalha-card-botoes batalha-menu-atacar"/g)).toHaveLength(1);
    expect(fonte.match(/className="batalha-card-botoes batalha-menu-atacar batalha-head-acoes"/g)).toHaveLength(1);
    expect(fonte).not.toMatch(/batalha-menu-atacar-lbl/);
    expect(fonte.match(/<BotaoAcaoMenu icone="ti-sword"\r?\n/g)).toHaveLength(1);
    expect(fonte).toContain("rotulo={isEn ? 'Attack' : 'Atacar'}");
  });

  it('os dois menus passam alvo e aba iniciais ao painel', () => {
    expect(fonte.match(/alvoInicialId=\{painelNoInimigo \? ataqueContra\.id : undefined\}/g)).toHaveLength(2);
    expect(fonte.match(/abaInicial=\{painelNoInimigo \? ataqueContra\.aba : undefined\}/g)).toHaveLength(2);
  });

  it('fechar o painel limpa o alvo escolhido, nas duas visões', () => {
    expect(fonte.match(/useEffect\(\(\) => \{ if \(!acaoOpen\) setAtaqueContra\(null\); \}, \[acaoOpen\]\);/g)).toHaveLength(2);
  });
});
