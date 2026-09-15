/* ============================================================
   evocacao-resolve.test.jsx — a magia canalizada SAI na vez de quem evoca
   ============================================================
   "Quando faço uma ação com 2, 3 rodadas para funcionar, não está executando.
    O lamarc usou meteoros, e depois de 5 rodadas não subiu o log do dano da
    magia na sua vez." (usuário, 13/09/2026)

   Na batalha 96: Meteoros (Lamarc, rodada 1) e Relâmpago da Espada Sagae
   (Aldren, rodadas 5 e 7) começaram e nunca resolveram. Quatro defeitos:
     1. handleAcao (jogador) lia `ator`, que não existe naquela tela — toda
        magia de ataque do jogador morria com ReferenceError no clique; no
        Mestre, `ator` era lido antes do const (TDZ);
     2. a resolução pedia o karma DE NOVO (já pago na largada);
     3. o painel abria em Arma, e qualquer outra ação derrubava a evocação
        sem uma linha na mesa;
     4. no apoio, a quebra de concentração vinha ANTES de passoDeApoio e
        levava a evocação junto — a magia largava de novo, sem fim.
   Mais os estados novos pedidos na mesma mensagem: caído, sangrando, evocando.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import '../02-shell/dado-d20.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let AcaoPanel, M, T, fonte;
beforeAll(() => {
  AcaoPanel = window.AcaoPanel; M = window.MotorBatalha; T = window.MotorTabuleiro;
  fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'batalha.jsx'), 'utf8');
});
afterEach(cleanup);

const SAGAE = {
  slug: 'espada_longa_sagae', nome: 'Espada Longa Sagae', grupo: 'Armas', categoria_equip: 'arma',
  slot_equip: 'maos', magia: 'Relâmpago', nivel_magia: 9, dano: 37, alcance: 0,
  dano_l: 0, dano_m: 1, dano_p: 3, ajuste_atributo: 'FOR', grupo_armas: 'CM',
};
const RELAMPAGO = {
  key: 'relampago', nome: 'Relâmpago', alcance: '100 metros', evocacao: '1 rodada', duracao: 'Instantânea',
  descricao: 'Um raio.', nivel_9: 'Causa 44 de dano elemental de ar.',
};
const ALDREN_PJ = {
  id: 54, nome: 'Aldren', raca: 'Humano', reino: 'Verrogar', profissao: 'Guerreiro',
  intelecto_base: 1, aura_base: 1, carisma_base: 1, forca_base: 3, fisico_base: 2, agilidade_base: 2, percepcao_base: 1,
  experiencia: 40, habilidades: {}, habilidades_bonus: {}, magias: {}, tecnicas: {},
  aprimoramentos: {}, caracterizacao: {}, grupos_armas: { CM: 2 },
  estado_atual: { bonusArmas: {}, condicoes: {} },
  inventario: { itens: [{ instanceId: 's1', slug: 'espada_longa_sagae', slot: 'mao_d', equipado: true, quantidade: 1 }] },
};
const PRONTA = { magia_key: 'relampago', magia_nome: 'Relâmpago', nivel: 9, alvos: ['criatura:242'], rodadas_rest: 0, karma_pago: 0 };
const ALDREN = {
  tipo: 'pj', ref_id: 54, inst_id: 'pj:54', nome: 'Aldren Saravos', ordem: 1, status: 'ativo', atual: true,
  vb: 20, pa_max: 1, pa_rest: 1, mov_rest: 5, moveu_na_rodada: true,
  ef: 30, ef_max: 30, eh: 20, eh_max: 20, ar: 5, ar_max: 5, karma: 0, karma_max: 0, rf: 8, rm: 6,
  defesa_sigla: 'M', defesa_valor: 12, status_temp: [], tecnicas_usadas: [], condicoes: {},
  pos: { x: 34, y: 14 }, evocando: PRONTA,
};
const HAALIN = {
  tipo: 'criatura', ref_id: 242, inst_id: 'criatura:242', nome: 'Haalin', ordem: 2, status: 'ativo', atual: false,
  vb: 30, pa_max: 1, pa_rest: 1, ef: 40, ef_max: 40, eh: 50, eh_max: 50, ar: 10, ar_max: 10,
  defesa_sigla: 'M', defesa_valor: 14, rf: 10, rm: 8, status_temp: [], tecnicas_usadas: [],
  pos: { x: 41, y: 13 },
};
const VAMPIRO = { ...HAALIN, ref_id: 300, inst_id: 'criatura:300', nome: 'Vampiro', ordem: 3 };
const CATALOGOS = {
  pjById: { 54: ALDREN_PJ }, criById: {}, catalogoBySlug: { espada_longa_sagae: SAGAE },
  magiasByKey: { relampago: RELAMPAGO }, tecnicasByKey: {}, habilidadesByKey: {}, habilidadesDb: [],
};

function montar(participantes) {
  const aplicados = [];
  render(
    <div className="menestrel-ui">
      <AcaoPanel ator={participantes[0]} participantes={participantes} catalogos={CATALOGOS} lang="pt"
        onAplicar={(p) => aplicados.push(p)} onAplicarTeste={() => {}} onAplicarItem={() => {}}
        onAplicarApoio={() => {}} onCancel={() => {}} onRolagemPendenteChange={() => {}}
        rolagemSalva={null} onRolagemSalvaChange={() => {}} />
    </div>
  );
  return aplicados;
}
const aba = (nome) => screen.getAllByRole('button').find((b) => b.textContent.trim() === nome);

describe('painel na vez em que a magia fica pronta', () => {
  it('abre na aba Magia, com a instrução de rolar o dado', () => {
    montar([ALDREN, VAMPIRO, HAALIN]);
    // Aba única "Magias" desde 13/09/2026.
    expect(aba('Magia').className).toMatch(/\bon\b/);
    expect(document.querySelector('.magia-largada-instrucao').textContent)
      .toBe('Relâmpago está pronta: role o dado para soltar a magia.');
    expect(document.querySelector('.dado-ov-trigger button').disabled).toBe(false);
  });

  it('mira o alvo da LARGADA, não o primeiro da lista', () => {
    montar([ALDREN, VAMPIRO, HAALIN]);
    const campoAlvo = [...document.querySelectorAll('.motor-field')]
      .find((f) => f.querySelector('span') && f.querySelector('span').textContent === 'Alvo');
    const botao = campoAlvo.querySelector('.select-pill-btn');
    expect(botao.textContent).toBe('Haalin');
    expect(botao.disabled).toBe(true);
  });

  it('as outras abas ficam travadas, dizendo por quê', () => {
    montar([ALDREN, HAALIN]);
    // Era a aba Resistência (a única sem motivo próprio de bloqueio), que saiu
    // em 14/09/2026. Arma serve igual: o Aldren tem arma na mão.
    expect(aba('Arma').disabled).toBe(true);
    const wrap = aba('Arma').closest('.acao-tab-wrap');
    expect(wrap.getAttribute('data-motivo')).toMatch(/Resolva Relâmpago primeiro/);
  });

  it('alvo que caiu: sem dado, e o botão conclui a evocação sem efeito', () => {
    const aplicados = montar([ALDREN, { ...HAALIN, status: 'morto' }, VAMPIRO]);
    expect(document.querySelector('.magia-largada-instrucao').textContent).toMatch(/o alvo não é mais válido/);
    expect(document.querySelector('.dado-ov-trigger button')).toBeNull();
    const confirmar = document.querySelector('.atacar-confirmar');
    expect(confirmar.getAttribute('aria-label')).toBe('Concluir evocação (1 PA)');
    fireEvent.click(confirmar);
    expect(aplicados).toHaveLength(1);
    expect(aplicados[0]).toMatchObject({ tipo: 'magia', evocacao_perdida: true, alvo: null });
  });
});

describe('motor da resolução', () => {
  it('soltarEvocacao tira a evocação sem marcar quebra', () => {
    const r = M.soltarEvocacao(ALDREN);
    expect(r.evocando).toBeUndefined();
    expect(r.evocacao_quebrada).toBeUndefined();
  });

  it('concluirEvocacaoSemAlvo cobra o PA do turno e limpa', () => {
    const r = M.concluirEvocacaoSemAlvo(ALDREN);
    expect(r.evocando).toBeUndefined();
    expect(r.pa_rest).toBe(0);
  });

  it('apoio: concluir a MESMA magia não perde a evocação na quebra de concentração', () => {
    const CURAS = { key: 'curas_fisicas', nome: 'Curas Físicas', evocacao: '3 rodadas', duracao: 'Instantânea',
      nivel_1: 'Restaura 4 de energia física.' };
    const magia = { key: 'curas_fisicas', nome: 'Curas Físicas', nivel: 1, catalogo: CURAS };
    const conj = { ...ALDREN, karma: 5, evocando: { magia_key: 'curas_fisicas', nivel: 1, alvos: ['a1'], rodadas_rest: 0, karma_pago: 1 } };
    const alvo = { inst_id: 'a1', tipo: 'pj', ref_id: 9, nome: 'Alvo', raca: 'Humano', eh: 10, eh_max: 10, ef: 5, ef_max: 20, status: 'ativo', status_temp: [] };
    const next = M.quebrarAntesDoApoio([conj, alvo], 0, magia);
    expect(next[0].evocando).toBeDefined();
    const passo = M.passoDeApoio(next, 0, 1, magia, 1, false);
    expect(passo.fase).toBe('resolveu');
    expect(passo.participantes[1].ef).toBe(9);
    expect(passo.participantes[0].karma).toBe(5);
  });

  it('apoio de OUTRA magia continua derrubando a evocação', () => {
    const next = M.quebrarAntesDoApoio([ALDREN, HAALIN], 0, { key: 'bencao' });
    expect(next[0].evocando).toBeUndefined();
  });

  it('dano na EF registra o motivo "dano"', () => {
    const antes = { ...ALDREN, evocando: { ...PRONTA, rodadas_rest: 3 } };
    const depois = { ...antes, ef: 20 };
    expect(M.quebrarConcentracaoPorDano([depois], antes, depois)[0].evocacao_quebrada.motivo).toBe('dano');
  });

  it('handleAcao e aplicarAcao não leem `ator` para gastar o pergaminho', () => {
    const i = fonte.indexOf('const handleAcao = (payload) => {');
    const fim = fonte.indexOf('const iniciarCanalizacaoOfensiva', i);
    expect(fonte.slice(i, fim)).not.toMatch(/consumirItemDaMagia\(ator,/);
    const j = fonte.indexOf('const aplicarAcao = (payload) => {');
    const fimJ = fonte.indexOf('const iniciarCanalizacaoOfensiva', j);
    expect(fonte.slice(j, fimJ)).not.toMatch(/consumirItemDaMagia\(ator,/);
  });
});

describe('evocação que cai vira linha na mesa', () => {
  it('marca nova vira evento e sai do participante', () => {
    const quebrado = { ...HAALIN, evocacao_quebrada: { magia_key: 'meteoros', magia_nome: 'Meteoros', motivo: 'dano' } };
    const r = M.evocacoesQuebradas([HAALIN], [quebrado]);
    expect(r.eventos).toHaveLength(1);
    expect(r.participantes[0].evocacao_quebrada).toBeUndefined();
    expect(M.textoEvocacaoQuebrada(r.eventos[0]))
      .toBe('Haalin perdeu a evocação de Meteoros (sofreu dano na Energia Física)');
  });

  it('sem marca devolve o MESMO array', () => {
    const arr = [HAALIN];
    expect(M.evocacoesQuebradas(arr, arr).participantes).toBe(arr);
  });

  it('as duas persistências passam pela detecção', () => {
    expect(fonte.slice(fonte.indexOf('const persistir = async'), fonte.indexOf('const persistir = async') + 900))
      .toMatch(/evocacoesQuebradas\(/);
    expect(fonte.slice(fonte.indexOf('const persistJogador = async'), fonte.indexOf('const persistJogador = async') + 1200))
      .toMatch(/evocacoesQuebradas\(/);
  });
});

describe('a rolagem zerada vence a mescla', () => {
  const eu = { tipo: 'pj', ref_id: 71, inst_id: 'pj:71' };
  it('zerando: a base leva uma marca diferente de null', () => {
    const base = [{ ...eu, rolagem_pendente: null }];
    const novo = [{ ...eu, rolagem_pendente: null, pa_rest: 0 }];
    const b = M.baseQueZeraMinhaRolagem(base, novo, eu);
    expect(b[0].rolagem_pendente).not.toBeNull();
  });
  it('gravando um dado, a base fica como está', () => {
    const base = [{ ...eu, rolagem_pendente: null }];
    expect(M.baseQueZeraMinhaRolagem(base, [{ ...eu, rolagem_pendente: { d20: 7 } }], eu)).toBe(base);
  });
  it('gravação que não fala da rolagem não mexe na base', () => {
    const base = [{ ...eu }];
    expect(M.baseQueZeraMinhaRolagem(base, [{ ...eu, pa_rest: 0 }], eu)).toBe(base);
  });
  it('o dado aplica sozinho depois de assentar (os dois overlays)', () => {
    expect(fonte.match(/aplicarDepoisDoDado\(\);\s*\}\}\s*onConfirmar=\{confirmarDado\}/g)).toHaveLength(2);
  });
});

describe('caído, sangrando e evocando', () => {
  it('caído é sem_acoes; sangrando é dano por rodada com id próprio', () => {
    const tb = window.tBat ? window.tBat('pt') : {};
    const caido = M.statusAplicadoPeloMestre('caido', 0, 2, tb);
    expect(caido.efeito).toEqual({ tipo: 'sem_acoes' });
    expect(caido.rodadas_rest).toBe(2);
    const sangra = M.statusAplicadoPeloMestre('sangramento', 3, 4, tb);
    expect(sangra.id).toMatch(/^sangramento:/);
    expect(sangra.efeito).toEqual({ tipo: 'dano_por_rodada', valor: 3 });
  });

  it('sangrando morde na virada como o veneno', () => {
    const p = { ...HAALIN, status_temp: [M.statusAplicadoPeloMestre('sangramento', 3, 2, {})] };
    expect(M.processarDanoPorRodada(p).total).toBe(3);
  });

  it('selos do token: veneno, sangrando, caído e evocando separados', () => {
    const p = { ...HAALIN, evocando: PRONTA, status_temp: [
      M.statusAplicadoPeloMestre('veneno', 2, 2, {}),
      M.statusAplicadoPeloMestre('sangramento', 2, 2, {}),
      M.statusAplicadoPeloMestre('caido', 0, 1, {}),
    ] };
    expect(T.selosDoToken(p).map((s) => s.nome)).toEqual(['Envenenado', 'Sangrando', 'Caído', 'Evocando']);
    expect(T.selosDoToken({ ...HAALIN, status_temp: [M.statusAplicadoPeloMestre('sangramento', 2, 2, {})] })
      .map((s) => s.nome)).toEqual(['Sangrando']);
  });

  it('o chip Evocando aparece para todos, com a magia e as rodadas', () => {
    const StatusTempChips = window.StatusTempChips;
    render(<div className="menestrel-ui"><StatusTempChips p={{ ...HAALIN, evocando: { ...PRONTA, rodadas_rest: 3 } }}
      tb={window.tBat ? window.tBat('pt') : {}} somenteLeitura /></div>);
    const chip = document.querySelector('.batalha-status-chip-evocando');
    // Botão redondo desde 14/09/2026: o texto vai no aria-label/tooltip.
    expect(chip.getAttribute('aria-label')).toMatch(/Evocando Relâmpago/);
    expect(chip.getAttribute('aria-label')).toMatch(/3/);
  });
});
