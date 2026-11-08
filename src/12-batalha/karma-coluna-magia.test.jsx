/* ============================================================
   karma-coluna-magia.test.jsx — o karma que vai na coluna da magia de dano
   ============================================================
   "Ao selecionar uma magia para usar, é necessário perguntar ao evocador
    qual nível a ser usado e quanto de karma será usado na magia. O karma
    define a coluna de ataque da magia, sem limite. (apenas para magia que
    causa dano)" (usuário, 07/11/2026). E as respostas do mesmo dia:
      1. nível 3 com 5 de karma na coluna gasta 8;
      2. a coluna é o karma gasto nela (não soma o nível);
      3. em todos os lugares: batalha, janela da magia e atalho da ficha.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

afterEach(cleanup);

const PIRO = { key: 'piromanipulacao', nome: 'Piromanipulação', duracao: 'Instantânea',
  evocacao: 'Instantânea', alcance: '20 metros',
  nivel_1: 'Causa 4 de dano elemental de fogo.',
  nivel_3: 'Causa 8 de dano elemental de fogo.' };
const VELOCIDADE = { key: 'velocidade', nome: 'Velocidade', duracao: '30 minutos',
  evocacao: 'Instantânea', alcance: 'Pessoal', nivel_1: 'Aumente 2 de velocidade.' };

describe('a regra, em 01-core', () => {
  it('só a magia que causa dano no nível pergunta o karma', () => {
    expect(window.magiaCausaDanoNoNivel(PIRO, 3)).toBe(true);
    expect(window.magiaCausaDanoNoNivel(VELOCIDADE, 1)).toBe(false);
  });

  it('nível 3 com 5 na coluna gasta 8; o item não cobra o nível', () => {
    expect(window.karmaTotalDaEvocacao(3, 5)).toBe(8);
    expect(window.karmaTotalDaEvocacao(0, 5)).toBe(5);
  });

  it('o pedido da mesa leva a coluna', () => {
    const meta = window.metaDeEvocacao({ magia: PIRO, nivel: 3, karma: 8, karmaColuna: 5 });
    expect(meta).toMatchObject({ karma_gasto: 8, karma_coluna: 5 });
    expect(window.metaDeEvocacao({ magia: VELOCIDADE, nivel: 1, karma: 1 })).not.toHaveProperty('karma_coluna');
  });
});

describe('a batalha', () => {
  const ATOR = {
    tipo: 'pj', ref_id: 7, inst_id: 'pj:7', nome: 'Lamarc', ordem: 1,
    status: 'ativo', atual: true, vb: 20, pa_max: 2, pa_rest: 2, mov_rest: 5, moveu_na_rodada: false,
    ef: 10, ef_max: 10, eh: 5, eh_max: 5, ar: 0, ar_max: 0, karma: 12, karma_max: 12,
    status_temp: [], condicoes: {}, x: 0, y: 0,
  };
  const ALVO = { ...ATOR, tipo: 'criatura', ref_id: 9, inst_id: 'cri:9', nome: 'Lobo', ordem: 2,
    atual: false, defesa_valor: 0, defesa_sigla: 'L', x: 1, y: 0 };
  const montar = () => {
    const pj = { id: 7, nome: 'Lamarc', profissao: 'Mago', magias: { piromanipulacao: 2 }, // nível 3
      estado_atual: {}, inventario: { itens: [] } };
    render(
      <div className="menestrel-ui">
        <window.AcaoPanel ator={ATOR} participantes={[ATOR, ALVO]}
          catalogos={{ pjById: { 7: pj }, catalogoBySlug: {}, magiasByKey: { piromanipulacao: PIRO }, criById: {} }}
          lang="pt" onAplicar={() => {}} onAplicarTeste={() => {}} onAplicarItem={() => {}}
          onAplicarApoio={() => {}} onCancel={() => {}} onRolagemPendenteChange={() => {}}
          rolagemSalva={null} onRolagemSalvaChange={() => {}} />
      </div>
    );
    fireEvent.click(screen.getAllByRole('button').find((b) => b.textContent.trim() === 'Magia'));
  };

  it('pergunta o karma da coluna e diz o total que sai', () => {
    montar();
    const campo = document.querySelector('.karma-coluna');
    expect(campo).toBeTruthy();
    expect(campo.textContent).toMatch(/Gasta 3 de karma \(3 do nível \+ 0 da coluna\) · você tem 12/);
    const mais = campo.querySelector('button[aria-label="+"]');
    for (let i = 0; i < 5; i++) fireEvent.click(mais);
    expect(campo.textContent).toMatch(/Gasta 8 de karma \(3 do nível \+ 5 da coluna\)/);
  });

  it('o teto é o karma que sobra depois do nível ("Tudo")', () => {
    montar();
    fireEvent.click(document.querySelector('.karma-coluna-max'));
    expect(document.querySelector('.karma-coluna').textContent).toMatch(/Gasta 12 de karma \(3 do nível \+ 9 da coluna\)/);
    expect(document.querySelector('.karma-coluna button[aria-label="+"]').disabled).toBe(true);
  });

  it('a canalização guarda a coluna da largada', () => {
    const p = window.MotorBatalha.iniciarEvocacao({ karma: 10, pa_rest: 1 },
      { key: 'x', nome: 'X', evocacao: '2 rodadas' }, 3, ['a'], 8, 5);
    expect(p.evocando).toMatchObject({ karma_pago: 8, karma_coluna: 5 });
    expect(p.karma).toBe(2);
  });

  it('a coluna da magia é o karma posto nela, não o nível', () => {
    const fonte = readFileSync(resolve(__dirname, 'batalha.jsx'), 'utf8');
    expect(fonte).toMatch(/coluna = karmaDaColuna \+ modColunaAtor \+ somaModAtaque\(ator, null\);/);
    expect(fonte).not.toMatch(/coluna = magia\.nivel \+ modColunaAtor/);
  });
});

describe('a ficha e o atalho', () => {
  const ficha = readFileSync(resolve(__dirname, '../11-ficha/ficha.jsx'), 'utf8');
  const atalho = readFileSync(resolve(__dirname, '../11-ficha/atalhos-ficha.jsx'), 'utf8');
  it('a evocação pela ficha cobra o nível + a coluna e escreve a coluna na mesa', () => {
    expect(ficha).toContain('deDano ? karmaTotalDaEvocacao(doItem ? 0 : nivel, kColuna)');
    expect(ficha).toContain('karmaColuna: kColuna,');
  });
  it('a janela da magia e o atalho perguntam o karma da coluna', () => {
    expect(ficha).toMatch(/onEvocar\(\{ nivel: nivelSel, alvo, karmaColuna: deDano \? kColuna : 0 \}\)/);
    expect(atalho).toMatch(/passoMag\.deDano && !!nivel && \(/);
    expect(atalho).toContain('{ karmaColuna: kColunaMag }');
  });
});
