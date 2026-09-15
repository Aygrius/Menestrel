/* ============================================================
   nivel-magia-barra.test.jsx — o nível da magia em barra
   ============================================================
   "No menu 'Magias', remova 'nível 5' do nome da magia, e remova 'nível'.
    Coloque um seletor de nível em barra, 1,3,5,7,9 quando existir, mudando a
    cor da linha de verde no 1, amarelo no 5 e 9 no vermelho." (usuário,
    14/09/2026)
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let AcaoPanel;
beforeAll(() => { AcaoPanel = window.AcaoPanel; expect(AcaoPanel).toBeDefined(); });
afterEach(cleanup);

const pjBase = {
  id: 64, nome: 'Yuldrous', raca: 'Anão', reino: 'Verrogar',
  profissao: 'Sacerdote', especializacao: 'Ordem de Crezir', deus: 'Crezir',
  intelecto_base: 2, aura_base: 2, carisma_base: 0,
  forca_base: 2, fisico_base: 2, agilidade_base: 2, percepcao_base: 1,
  experiencia: 5000, habilidades: {}, habilidades_bonus: {}, tecnicas: {},
  aprimoramentos: {}, caracterizacao: {}, grupos_armas: {},
  estado_atual: { bonusArmas: {}, condicoes: {} },
  inventario: { itens: [] },
};

const VELOCIDADE = {
  key: 'velocidade', nome: 'Velocidade', duracao: '30 minutos', evocacao: 'Instantânea', alcance: 'Pessoal',
  descricao: 'Uma descarga cinética envolve seu corpo.',
  nivel_1: 'Aumente 2 de velocidade.', nivel_3: 'Aumente 4 de velocidade.', nivel_5: 'Aumente 6 de velocidade.',
};

const ATOR = {
  tipo: 'pj', ref_id: 64, inst_id: 'pj:64', nome: 'Yuldrous', ordem: 1,
  status: 'ativo', atual: true, vb: 20, pa_max: 2, pa_rest: 2, mov_rest: 5, moveu_na_rodada: false,
  ef: 10, ef_max: 10, eh: 5, eh_max: 5, ar: 0, ar_max: 0, karma: 9, karma_max: 9, status_temp: [], condicoes: {},
};

function montar(passos) {
  const pj = { ...pjBase, magias: { velocidade: passos } };
  render(
    <div className="menestrel-ui">
      <AcaoPanel ator={ATOR} participantes={[ATOR]}
        catalogos={{ pjById: { 64: pj }, catalogoBySlug: {}, magiasByKey: { velocidade: VELOCIDADE } }}
        lang="pt" onAplicar={() => {}} onAplicarTeste={() => {}} onAplicarItem={() => {}}
        onAplicarApoio={() => {}} onCancel={() => {}} onRolagemPendenteChange={() => {}}
        rolagemSalva={null} onRolagemSalvaChange={() => {}} />
    </div>
  );
  fireEvent.click(screen.getAllByRole('button').find((b) => b.textContent.trim() === 'Magia'));
}

const pontos = () => [...document.querySelectorAll('.nivel-barra-ponto')];
const barra = () => document.querySelector('.nivel-barra');

describe('nível da magia em barra', () => {
  it('o nome da magia não traz mais "nível", e não há dropdown de Nível', () => {
    montar(3);
    expect(document.body.textContent).not.toMatch(/nível \d/);
    const rotulos = [...document.querySelectorAll('.motor-field > span')].map((s) => s.textContent);
    expect(rotulos).not.toContain('nível');
    expect(rotulos).not.toContain('Nível');
  });

  it('um ponto por nível que o combatente alcança, começando no maior', () => {
    montar(3);   // 3 passos → nível 5
    expect(pontos().map((p) => p.textContent)).toEqual(['1', '3', '5']);
    expect(document.querySelector('.nivel-barra-ponto.on').textContent).toBe('5');
  });

  it('a cor da linha acompanha o nível: verde no 1, amarelo no 5, vermelho no 9', () => {
    montar(3);
    expect(barra().style.getPropertyValue('--nivel-cor')).toBe('#e6c229');   // 5
    fireEvent.click(pontos()[0]);
    expect(document.querySelector('.nivel-barra-ponto.on').textContent).toBe('1');
    expect(barra().style.getPropertyValue('--nivel-cor')).toBe('#4caf50');   // 1
    // A escala inteira: verde → amarelo no 5 → vermelho no 9.
    const cor = window.MotorBatalha.corDoNivelMagia;
    expect([1, 3, 5, 7, 9].map(cor)).toEqual(['#4caf50', '#9cc23a', '#e6c229', '#e68a2e', '#d9534f']);
  });

  it('escolher um nível troca o efeito mostrado', () => {
    montar(3);
    expect(document.body.textContent).toMatch(/\+6/);
    fireEvent.click(pontos()[1]);
    expect(document.body.textContent).toMatch(/\+4/);
  });

  // "remova '5 de karma'" (usuário, 14/09/2026)
  it('a barra não mostra o custo em karma', () => {
    montar(3);
    expect(document.querySelector('.nivel-barra-custo')).toBeNull();
    expect(barra().textContent).not.toMatch(/karma/);
  });

  it('com um nível só, a barra aparece como indicação, sem escolha', () => {
    montar(1);
    expect(pontos().map((p) => p.textContent)).toEqual(['1']);
    expect(pontos()[0].disabled).toBe(true);
  });
});
