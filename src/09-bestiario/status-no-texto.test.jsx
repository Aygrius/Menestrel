/* ============================================================
   status-no-texto.test.jsx — a frase do item e a cor de cada status
   ============================================================
   "Ao clicar no item e mostrar seus detalhes, vamos usar o sistema de
   abreviação e cor dos status. Por exemplo do item 'Calça de Couro': 'Este
   item possui 3 de defesa, 1 de absorção e 1 de resistência. Para equipá-lo,
   é necessário pelo menos -1 de força. Para carregar este item é necessário
   pelo menos 1 casa livre no inventário e 1 de peso livre por unidade. Seu
   preço original de comércio é de 2 moedas de prata.'" e as cores: Energia
   Física/Físico vermelho, Energia Heroica/Carisma verde, Karma/Aura azul,
   Velocidade/Agilidade amarelo, as condições roxo, Defesa/Absorção/
   Resistência ciano, Peso/Casa/Preço branco negrito (usuário, 30/10/2026).
   ============================================================ */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './ataques-criatura.jsx';
import './criatura-formulas.jsx';
import './conhecido-jogador.jsx';
import './catalogo-descritores.jsx';
import './catalogo-editor.jsx';
import './bestiario.jsx';

afterEach(() => cleanup());

const CALCA_ARMADURA = { slug: 'calca_couro', nome: 'Calça de Couro', grupo: 'Armaduras',
  defesa: 3, absorcao: 1, resistencia: 1, forca_req: -1, ocupa: 1, valor_latao: 200 };

const frase = (it, opcoes) => {
  const { container } = render(<div>{window.fraseDoItem(it, 'pt', opcoes)}</div>);
  return container;
};

/* O FORMATO DE 30/10/2026, SEGUNDA RODADA (usuário): "Para carregar este
   item é necessário pelo menos 1 casa livre no inventário e 3 carga livre por
   unidade. Possui 3 resistência. Para equipá-lo, é necessário -2 força. Seu
   preço original de comércio é 2 moedas de ouro e 3 moedas de prata. Seu
   dano é 21 base, possui -2 armaduras pesadas, 0 armaduras médias e +2
   armaduras leves. Pertence ao grupo de armas perfuração leve, seu ataque é
   ajustado pelo atributo agilidade e seu alcance é de 5 metros." — o número
   junto do nome, sem "de", e cada moeda destacada à parte. */
describe('a frase das Características', () => {
  const ARMA = { slug: 'x', nome: 'X', grupo: 'Armas', categoria_equip: 'arma', resistencia: 3, forca_req: -2, ocupa: 3,
    valor_latao: 2300, dano: 21, dano_p: -2, dano_m: 0, dano_l: 2, grupo_armas: 'PL', ajuste_atributo: 'AGI', alcance: 5 };

  it('a arma diz o que o usuário escreveu, na ordem dele', () => {
    const m = window.latoesToMoedas(2300);
    expect(m).toMatchObject({ ouro: 2, prata: 3 });
    expect(frase(ARMA).textContent).toBe(
      // Sem a casa desde a terceira rodada: "Para carregar este item é necessário 5 carga livre por unidade."
      'Para carregar este item é necessário 3 carga livre por unidade. '
      + 'Possui 3 resistência. '
      + 'Para equipá-lo, é necessário -2 força. '
      + 'Seu preço original de comércio é 2 moedas de ouro e 3 moedas de prata. '
      + 'Seu dano é 21 base, possui -2 armaduras pesadas, 0 armaduras médias e +2 armaduras leves. '
      + 'Pertence ao grupo de armas perfuração leve, seu ataque é ajustado pelo atributo agilidade e seu alcance é de 5 metros.',
    );
  });

  // "Para carregar este item é necessário pelo menos 1 casa livre no
  // inventário, e pode armazenar 15 carga. Seu preço original de comércio é
  // 9 moedas de prata." (usuário, itens do tipo recipiente)
  it('o recipiente diz o que armazena na frase de carregar', () => {
    expect(frase({ slug: 'mochila', nome: 'Mochila', armazena: 15, valor_latao: 900 }).textContent).toBe(
      'Pode armazenar 15 carga. '
      + 'Seu preço original de comércio é 9 moedas de prata.',
    );
  });

  it('cada status na cor dele; o que não tem cor, branco negrito', () => {
    const c = frase({ ...CALCA_ARMADURA });
    const tom = (txt) => [...c.querySelectorAll('.st-tom')].find((s) => s.textContent === txt).className;
    expect(tom('3 defesa')).toMatch(/st-tom--ciano/);
    expect(tom('1 absorção')).toMatch(/st-tom--ciano/);
    expect(tom('1 resistência')).toMatch(/st-tom--ciano/);
    expect(tom('1 carga')).toMatch(/st-tom--forte/);
    expect(tom('-1 força')).toMatch(/st-tom--forte/);
    expect(tom('2 moedas de prata')).toMatch(/st-tom--forte/);
    const agi = frase(ARMA);
    expect([...agi.querySelectorAll('.st-tom')].find((s) => s.textContent === 'agilidade').className).toMatch(/st-tom--amarelo/);
  });

  it('o que o passe do topo já mostra não se repete', () => {
    const c = frase(CALCA_ARMADURA, { fora: new Set(['defesa', 'valor']) });
    expect(c.textContent).not.toMatch(/defesa/);
    expect(c.textContent).not.toMatch(/preço/);
    expect(c.textContent).toMatch(/Possui 1 absorção e 1 resistência\./);
  });

  it('na peça gasta, a resistência é a de agora', () => {
    expect(frase(CALCA_ARMADURA, { resistenciaTexto: '1/3' }).textContent).toMatch(/1 resistência \(de 3\)/);
  });
});

describe('tomDoStatus', () => {
  it('as cores ditadas pelo usuário', () => {
    const t = window.tomDoStatus;
    expect(t('Energia Física')).toBe('vermelho');
    expect(t('Físico')).toBe('vermelho');
    expect(t('Energia Heroica')).toBe('verde');
    expect(t('Carisma')).toBe('verde');
    expect(t('Karma')).toBe('azul');
    expect(t('Aura')).toBe('azul');
    expect(t('Velocidade')).toBe('amarelo');
    expect(t('Agilidade')).toBe('amarelo');
    for (const c of ['Doença', 'Sono', 'Sede', 'Fome', 'Frio', 'Calor', 'Vício', 'Loucura', 'Má Fama', 'Desonra']) {
      expect(t(c), c).toBe('roxo');
    }
    expect(t('Defesa')).toBe('ciano');
    expect(t('Peso')).toBe('forte');
    expect(t('Força')).toBeNull();
  });
});

/* "Este item protege 30 de frio, mas causa 1 de má fama." (usuário,
   30/10/2026) — a frase dos efeitos fecha o parágrafo. */
describe('efeitos e proteções na frase', () => {
  const CAPA = { slug: 'capa', nome: 'Capa', grupo: 'Vestimentas', resistencia: 1, ocupa: 1,
    valor_latao: 20, efeito_positivo: 'Protege 30 de Frio', efeito_negativo: 'Aumenta 1 de Má Fama' };

  it('protege, mas causa — como o usuário escreveu', () => {
    expect(frase(CAPA).textContent).toMatch(/Este item protege 30 de frio, mas causa 1 de má fama\.$/);
  });

  it('frio e má fama em roxo', () => {
    const c = frase(CAPA);
    const tom = (txt) => [...c.querySelectorAll('.st-tom')].find((s) => s.textContent === txt).className;
    expect(tom('30 de frio')).toMatch(/st-tom--roxo/);
    expect(tom('1 de má fama')).toMatch(/st-tom--roxo/);
  });

  it('o que só ajuda não tem "mas"', () => {
    // A água do catálogo, com o texto gravado no banco.
    const t = frase({ slug: 'agua', nome: 'Água', efeito_positivo: 'Reduz 35 de Sede, 1 de Vício e 5 de Calor.' }).textContent;
    expect(t).toMatch(/Este item reduz 35 de sede, 1 de vício e 5 de calor\./);
    expect(t).not.toMatch(/mas/);
  });

  // A proteção Pesado saiu em 30/10/2026: o que sobrar escrito não vira frase.
  it('"Protege 20 de Pesado" não aparece', () => {
    expect(frase({ slug: 'alforge', nome: 'Alforge', efeito_positivo: 'Protege 20 de Pesado.' }).textContent).not.toMatch(/pesado/i);
  });
});

/* O que ainda era linha (30/10/2026, usuário: "Em relação ao que ficou
   faltando como linha, faça a mudança"). */
describe('mãos e criatura na frase', () => {
  it('o escudo diz as mãos de cada raça, e quem não pode usar', () => {
    const t = frase({ slug: 'pipa', nome: 'Escudo Pipa', categoria_equip: 'escudo',
      maos_pequenino: 2, maos_anao: 1, maos_outras: null }).textContent;
    expect(t).toMatch(/Ocupa 2 mãos para pequeninos e 1 mão para anões\./);
    expect(t).toMatch(/Não pode ser usado pelas demais raças\./);
  });

  it('o animal diz a criatura e se é montaria', () => {
    const t = frase({ slug: 'cavalo', nome: 'Cavalo', criatura_id: 7 },
      { criaturasPorId: { 7: { nome: 'Cavalo', montaria: true } } }).textContent;
    expect(t).toMatch(/Corresponde à criatura Cavalo, que pode ser montada\./);
  });
});

/* O TEXTO OCUPA A JANELA INTEIRA (30/10/2026, usuário: "Sempre que você faz
   uma mudança de texto, você quebra a linha antes de ocupar todo o modal").
   A frase nasceu com `max-width: 68ch` — o mesmo erro que a descrição do item
   já tinha corrigido em 28/10. A janela tem teto próprio; um segundo teto só
   deixa um vão à direita. */
describe('a frase do item sem teto de largura', () => {
  it('nenhum max-width em ch na frase nem na descrição da compra', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');
    for (const sel of ['.best-frase-item {', '.loja-compra-desc {']) {
      const i = css.indexOf(sel);
      expect(i, sel).toBeGreaterThan(-1);
      expect(css.slice(i, css.indexOf('}', i)), sel).not.toMatch(/max-width:\s*\d+ch/);
    }
  });
});
