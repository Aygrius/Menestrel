/* ============================================================
   acao-arma-magia-linha.test.jsx — Arma com descrição, sem duplicata de
   duas mãos; Magia com o dado (ou usar) na linha
   ============================================================
   "Menu Arma: Mostre a descrição da arma selecionada, armas de duas mãos não
    precisam aparecer duas vezes no dropdown menu. Menu Magia: O ícone de dado
    ou usar deve ficar inline com 'magia' e 'alvo'." (usuário, 14/09/2026)
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import '../02-shell/dado-d20.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let AcaoPanel;
beforeAll(() => { AcaoPanel = window.AcaoPanel; expect(AcaoPanel).toBeDefined(); });
afterEach(cleanup);

const MONTANTE = {
  slug: 'montante', nome: 'Montante', grupo: 'Armas', categoria_equip: 'arma',
  descricao: 'Espada enorme, empunhada com as duas mãos.',
  dano: 12, alcance: 0, dano_l: 1, dano_m: 0, dano_p: -1, ajuste_atributo: 'FOR', grupo_armas: 'CP',
  maos_outras: 2, maos_anao: 2, maos_pequenino: 2,
};
const ADAGA = {
  slug: 'adaga', nome: 'Adaga', grupo: 'Armas', categoria_equip: 'arma',
  dano: 4, alcance: 0, dano_l: 0, dano_m: 0, dano_p: 0, ajuste_atributo: 'AGI', grupo_armas: 'CL',
  maos_outras: 1, maos_anao: 1, maos_pequenino: 1,
};
const RELAMPAGO = {
  key: 'relampago', nome: 'Relâmpago', alcance: '100 metros', evocacao: 'Instantânea', duracao: 'Instantânea',
  descricao: 'Um raio.', nivel_1: 'Causa 28 de dano elemental de ar.',
};

const pjCom = (itens, magias = {}) => ({
  id: 54, nome: 'Aldren', raca: 'Humano', reino: 'Verrogar', profissao: 'Guerreiro',
  intelecto_base: 1, aura_base: 3, carisma_base: 1, forca_base: 3, fisico_base: 2, agilidade_base: 2, percepcao_base: 1,
  experiencia: 40, habilidades: {}, habilidades_bonus: {}, magias, tecnicas: {},
  aprimoramentos: {}, caracterizacao: {}, grupos_armas: {},
  estado_atual: { bonusArmas: {}, condicoes: {} },
  inventario: { itens },
});
const ATOR = {
  tipo: 'pj', ref_id: 54, inst_id: 'pj:54', nome: 'Aldren', ordem: 1, status: 'ativo', atual: true,
  vb: 20, pa_max: 1, pa_rest: 1, mov_rest: 5, moveu_na_rodada: false,
  ef: 30, ef_max: 30, eh: 20, eh_max: 20, ar: 5, ar_max: 5, karma: 9, karma_max: 9, rf: 8, rm: 6,
  status_temp: [], tecnicas_usadas: [], condicoes: {}, pos: { x: 10, y: 10 },
};
const ALVO = {
  tipo: 'criatura', ref_id: 242, inst_id: 'criatura:242', nome: 'Haalin', ordem: 2, status: 'ativo', atual: false,
  vb: 30, pa_max: 1, pa_rest: 1, ef: 40, ef_max: 40, eh: 50, eh_max: 50, ar: 10, ar_max: 10,
  defesa_sigla: 'M', defesa_valor: 14, rf: 10, rm: 8, status_temp: [], tecnicas_usadas: [],
  pos: { x: 12, y: 10 },
};

function montar(pj) {
  const catalogos = {
    pjById: { 54: pj }, criById: {}, catalogoBySlug: { montante: MONTANTE, adaga: ADAGA },
    magiasByKey: { relampago: RELAMPAGO }, tecnicasByKey: {}, habilidadesByKey: {}, habilidadesDb: [],
  };
  render(
    <div className="menestrel-ui">
      <AcaoPanel ator={ATOR} participantes={[ATOR, ALVO]} catalogos={catalogos} lang="pt"
        onAplicar={() => {}} onAplicarTeste={() => {}} onAplicarItem={() => {}}
        onAplicarApoio={() => {}} onCancel={() => {}} onRolagemPendenteChange={() => {}}
        rolagemSalva={null} onRolagemSalvaChange={() => {}} />
    </div>
  );
  return catalogos;
}

describe('aba Arma', () => {
  it('arma de duas mãos aparece UMA vez no seletor', () => {
    const cats = montar(pjCom([{ instanceId: 'm1', slug: 'montante', slot: 'mao_d', equipado: true, quantidade: 1 }]));
    const lista = window.MotorBatalha.ataquesDoAtor(ATOR, cats);
    expect(lista.map((a) => a.nome)).toEqual(['Montante']);
  });

  it('duas armas de uma mão iguais continuam duas', () => {
    const cats = montar(pjCom([
      { instanceId: 'a1', slug: 'adaga', slot: 'mao_d', equipado: true, quantidade: 1 },
      { instanceId: 'a2', slug: 'adaga', slot: 'mao_e', equipado: true, quantidade: 1 },
    ]));
    expect(window.MotorBatalha.ataquesDoAtor(ATOR, cats).map((a) => a.nome)).toEqual(['Adaga', 'Adaga']);
  });

  it('mostra a descrição da arma escolhida', () => {
    montar(pjCom([{ instanceId: 'm1', slug: 'montante', slot: 'mao_d', equipado: true, quantidade: 1 }]));
    expect(document.querySelector('.acao-arma-descricao').textContent).toBe(MONTANTE.descricao);
  });

  it('arma sem descrição no catálogo não deixa parágrafo vazio', () => {
    montar(pjCom([{ instanceId: 'a1', slug: 'adaga', slot: 'mao_d', equipado: true, quantidade: 1 }]));
    expect(document.querySelector('.acao-arma-descricao')).toBeNull();
  });
});

describe('aba Magia', () => {
  it('o dado fica na mesma linha de Magia e Alvo', () => {
    montar(pjCom([], { relampago: 1 }));
    fireEvent.click(screen.getAllByRole('button').find((b) => b.textContent.trim() === 'Magia'));
    const linha = document.querySelector('.atacar-row-acao');
    expect(linha).toBeTruthy();
    expect(linha.querySelectorAll('.select-pill-btn')).toHaveLength(2);
    expect(linha.querySelector('.dado-ov-trigger button')).toBeTruthy();
  });
});

describe('Encerrar batalha', () => {
  const fonte = readFileSync(resolve(__dirname, 'batalha.jsx'), 'utf8');
  it('confirma num modal, não num aviso dentro do tabuleiro', () => {
    expect(fonte).toContain('batalha-encerrar-modal');
    expect(fonte).not.toContain('batalha-encerrar-painel');
  });
});
