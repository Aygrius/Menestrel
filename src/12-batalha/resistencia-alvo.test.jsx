/* ============================================================
   resistencia-alvo.test.jsx — a resistência do alvo (18/11/2026)
   ============================================================
   Usuário: "Os testes de resistência física e resistência mágica estão
   funcionando? Para não contrair veneno, o alvo pode usar resistência
   física, e alguns efeitos de magia podem ser resistidos com resistência à
   magia." E: "O alvo rola 2 dados de 10 faces, de uma só vez na tela."

   O veneno (veneno-municao.test.js) e o efeito secundário da magia de dano
   ficam pendentes no alvo; quem o controla rola 2d10 na janela
   RolagemResistencia. Aqui: a leitura do texto da magia, a pendência da
   magia, quem rola e a janela.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/magias-efeito.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../10-shell/shell.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const fonte = fs.readFileSync(path.resolve(__dirname, 'batalha.jsx'), 'utf8');

describe('a leitura do texto: quando a magia pede resistência', () => {
  const r = (descricao) => M.exigeResistencia({ descricao });
  it('as frases de sempre e as que o regex antigo perdia', () => {
    expect(r('Se o alvo falhar em um teste de resistência mágica, sofre os efeitos.')).toBe('rm');
    expect(r('passar em um teste de resistência física contra o nível usado')).toBe('rf');
    expect(r('causando-lhe uma ação falha, caso não obtenha êxito em uma resistência mágica.')).toBe('rm');
    expect(r('você lança a magia sobre o alvo, que tem direito a resistência mágica.')).toBe('rm');
    expect(r('devendo ele fazer uma resistência mágica ou ficar inconsciente')).toBe('rm');
  });
  it('a negação não conta', () => {
    expect(r('Esta magia serve como castigo, sem direito a resistência mágica.')).toBe(null);
    expect(r('Não existe teste de resistência mágica, pois o feitiço não foi lançado contra ninguém.')).toBe(null);
    expect(r('Rouba conhecimentos.')).toBe(null);
  });
});

describe('o efeito secundário da magia de dano espera a resistência', () => {
  const PIRO = { key: 'piroataque', nome: 'Piroataque', evocacao: 'Instantânea', alcance: '20 metros',
    descricao: 'Com esta magia, você incendeia o alvo: o golpe o queima na hora e, se ele falhar em um teste de resistência mágica, as queimaduras continuam a cada rodada.',
    nivel_1: 'Causa 6 de dano elemental de fogo.' };
  const mago = { tipo: 'criatura', inst_id: 'cri:1', nome: 'Xamã', status: 'ativo' };
  const alvo = { tipo: 'pj', inst_id: 'pj:7', ref_id: 7, nome: 'Lia', status: 'ativo', ef: 20, eh: 0, rm: 3, status_temp: [] };
  it('o dano entrou; o efeito vira pendência de RM com a força do nível', () => {
    const antes = alvo;
    const depois = [mago, { ...alvo, ef: 14 }];
    const out = M.efeitoDaMagiaNoGolpe(depois, 0, 1, antes, { key: 'piroataque', nome: 'Piroataque', nivel: 3, catalogo: PIRO });
    expect(out).not.toBe(depois);   // o registro tem a queimadura (dano_por_rodada)
    expect(out[1].ef).toBe(14);
    const [pend] = M.resistenciasPendentes(out[1]);
    expect(pend).toMatchObject({ tipo: 'rm', forca_ataque: 3, forca_defesa: 3, autor_nome: 'Xamã',
      efeito: { kind: 'magia', magia_key: 'piroataque', nivel: 3 } });
    expect(out[1].status_temp).toEqual([]);
  });
});

describe('quem rola', () => {
  it('o jogador pelo personagem e pelo animal; o Mestre pelas criaturas e pelo automático', () => {
    expect(M.quemRolaResistencia({ tipo: 'pj', ref_id: 7 })).toBe('7');
    expect(M.quemRolaResistencia({ tipo: 'criatura', dono_pj: 7 })).toBe('7');
    expect(M.quemRolaResistencia({ tipo: 'criatura' })).toBe('mestre');
    expect(M.resistenciaDoMestre({ tipo: 'pj', ref_id: 7, auto: true })).toBe(true);
    expect(M.resistenciaDoMestre({ tipo: 'pj', ref_id: 7 })).toBe(false);
  });
  it('a soma automática nunca é empate', () => {
    const pend = { alvo_resist: 11 };
    for (let k = 0; k < 30; k++) expect(M.somaAutomaticaDaResistencia(pend)).not.toBe(11);
  });
  it('o jogador só vê a janela depois do Revelar; o automático do Mestre espera', () => {
    expect(fonte).toMatch(/if \(aguardandoRevelar \|\| !catalogos \|\| pjAtivoId == null\) return null;\s+const r = proximaResistencia\(/);
    expect(fonte).toMatch(/if \(proximaResistencia\(participantes, resistenciaDoMestre\)\) return undefined;/);
  });
});

describe('a janela: 2d10 de uma vez', () => {
  const pend = { id: 'res:1', tipo: 'rf', forca_ataque: 8, forca_defesa: 4, alvo_resist: 12, nome: 'Veneno (Toxina)', autor_nome: 'Orc' };
  const alvo = { tipo: 'pj', ref_id: 7, nome: 'Lia' };
  const abrir = (onResultado) => render(
    <div className="menestrel-ui">
      <M.RolagemResistencia alvo={alvo} pend={pend} lang="pt" onResultado={onResultado} />
    </div>);
  it('rola, mostra o desfecho e entrega a soma', () => {
    // 0.95 → 10 nos dois dados: 20, acima de 12.
    vi.spyOn(Math, 'random').mockReturnValue(0.95);
    const onResultado = vi.fn();
    abrir(onResultado);
    expect(screen.getByText(/acima de/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Rolar 2d10' }));
    return Promise.resolve().then(() => {
      expect(screen.getByRole('status').textContent).toBe('Resistiu');
      fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
      expect(onResultado).toHaveBeenCalledWith(20, 'resistiu');
    });
  });
  it('não tem como fechar sem rolar', () => {
    abrir(() => {});
    expect(screen.queryByRole('button', { name: /cancelar/i })).toBeNull();
  });
});
