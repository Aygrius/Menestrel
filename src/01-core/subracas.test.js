/* ============================================================
   subracas.test.js — Vampiro e Lobisomem (22/10/2026)
   ============================================================
   "Os atributos comprados previamente vão se manter, apenas os ajustes que
   vão mudar." (usuário) A sub-raça TROCA o ajuste da raça pelo dela; o que o
   jogador comprou fica. Lobisomem vem da Licantropia Lupina (1 dia de
   calendário) ou do Mestre; Vampiro, só do Mestre.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './constants.jsx';             // FANTASY_MONTHS (o calendário)
import './helpers.jsx';               // dataFantasyParaAbsoluto, somarDiasFantasy
import './inventario-helpers.jsx';
import './game-data.jsx';
import './magias-efeito.jsx';         // subracaDaMagia, magiasAtivasVigentes

let G;
beforeAll(() => { G = window; });

// Humano (mods todos 0) com 1 ponto comprado em Força e 1 em Intelecto.
// `subraca` vai para a COLUNA do PJ; o resto, para estado_atual.
const humano = ({ subraca = null, ...estado } = {}) => ({
  raca: 'Humano', genero: 'Neutro', profissao: 'Guerreiro', experiencia: 0,
  intelecto_base: 1, aura_base: 0, carisma_base: 0, forca_base: 1,
  fisico_base: 0, agilidade_base: 0, percepcao_base: 0,
  subraca,
  estado_atual: estado,
});
const LICANTROPIA = (vence_em) => ({ key: 'licantropia_lupina', nome: 'Licantropia Lupina', nivel: 1, vence_em });

describe('GAME_DATA.subracas', () => {
  it('tem os ajustes e alturas pedidos', () => {
    expect(G.GAME_DATA.subracas.Vampiro).toEqual({
      mods: { intelecto: 0, aura: -1, carisma: 1, forca: -1, fisico: -2, percepcao: 1, agilidade: 2 }, altura: 1.77 });
    expect(G.GAME_DATA.subracas.Lobisomem).toEqual({
      mods: { intelecto: -2, aura: -2, carisma: -2, forca: 2, fisico: 2, percepcao: 2, agilidade: 0 }, altura: 1.92 });
  });

  it('não entra no wizard nem na equalização racial', () => {
    expect(G.GAME_DATA.racas.Vampiro).toBeUndefined();
    expect(G.GAME_DATA.racas.Lobisomem).toBeUndefined();
    expect(G.bonusPontosRaca('Humano')).toBe(4);   // teto segue sendo Anão/Meio-Orc
  });
});

describe('atributosComSubraca — troca o ajuste, mantém o comprado', () => {
  it('Anão vampiro: tira o ajuste do anão e põe o do vampiro', () => {
    // Anão: forca +2, fisico +2, agilidade −2, aura −1, carisma −1.
    // Comprou +1 de Força em cima do +2 racial → forca_base 3.
    const base = { intelecto: 0, aura: -1, carisma: -1, forca: 3, fisico: 2, agilidade: -2, percepcao: 0 };
    expect(G.atributosComSubraca(base, 'Anão', 'Vampiro')).toEqual(
      { intelecto: 0, aura: -1, carisma: 1, forca: 0, fisico: -2, agilidade: 2, percepcao: 1 });
  });

  it('sem sub-raça devolve os mesmos valores', () => {
    const base = { intelecto: 1, aura: 0, carisma: 0, forca: 1, fisico: 0, agilidade: 0, percepcao: 0 };
    expect(G.atributosComSubraca(base, 'Humano', null)).toEqual(base);
  });
});

describe('subracaEfetiva', () => {
  const hoje = { dia: 10, mes: 3, ano: 1000 };

  it('sem nada, não há sub-raça', () => {
    expect(G.subracaEfetiva(humano())).toBeNull();
  });

  it('a do Mestre vale (coluna personagens.subraca)', () => {
    expect(G.subracaEfetiva(humano({ subraca: 'Vampiro' }))).toBe('Vampiro');
  });

  it('estado_atual.subraca não é lido — a fonte é a coluna', () => {
    expect(G.subracaEfetiva({ raca: 'Humano', estado_atual: { subraca: 'Vampiro' } })).toBeNull();
  });

  it('valor desconhecido é ignorado', () => {
    expect(G.subracaEfetiva(humano({ subraca: 'Zumbi' }))).toBeNull();
  });

  it('Licantropia vigente vira Lobisomem — e vence o Vampiro do Mestre', () => {
    const pj = humano({ subraca: 'Vampiro', magias_ativas: [LICANTROPIA({ dia: 11, mes: 3, ano: 1000 })] });
    expect(G.subracaEfetiva(pj, hoje)).toBe('Lobisomem');
  });

  it('Licantropia vencida devolve à sub-raça de antes', () => {
    const pj = humano({ subraca: 'Vampiro', magias_ativas: [LICANTROPIA({ dia: 10, mes: 3, ano: 1000 })] });
    expect(G.subracaEfetiva(pj, hoje)).toBe('Vampiro');
  });
});

describe('Licantropia Lupina no motor de magias', () => {
  it('declara a transformação em Lobisomem, sem ajuste de atributo', () => {
    expect(G.subracaDaMagia('licantropia_lupina')).toBe('Lobisomem');
    expect(G.MAGIA_EFEITO_MAP.licantropia_lupina.efeitos.some((e) => e.tipo === 'mod_atributo')).toBe(false);
  });

  it('com o texto novo do banco, dura 1 dia e vira magia ativa', () => {
    const mag = { key: 'licantropia_lupina', nome: 'Licantropia Lupina', duracao: '1 dia',
      nivel_1: 'Transforma o evocador em Lobisomem.' };
    expect(G.motivoNaoAplicaNaFicha(mag, 1)).toBeNull();
    expect(G.duracaoEmDiasDeJogo(mag, 1)).toBe(1);
    const ativa = G.magiaAtivaDaEvocacao(mag, 1, { dia: 10, mes: 3, ano: 1000 });
    expect(ativa).toMatchObject({ key: 'licantropia_lupina', vence_em: { dia: 11, mes: 3, ano: 1000 } });
  });
});

describe('limparTransformacoesVencidas', () => {
  it('tira só a transformação vencida; as outras magias ficam', () => {
    const bencao = { key: 'bencao', nivel: 1, vence_em: { dia: 1, mes: 1, ano: 900 } };
    const est = { magias_ativas: [LICANTROPIA({ dia: 10, mes: 3, ano: 1000 }), bencao] };
    const novo = G.limparTransformacoesVencidas(est, { dia: 10, mes: 3, ano: 1000 });
    expect(novo.magias_ativas).toEqual([bencao]);
  });

  it('nada a tirar → o mesmo objeto (quem chama compara referência)', () => {
    const est = { magias_ativas: [LICANTROPIA({ dia: 11, mes: 3, ano: 1000 })] };
    expect(G.limparTransformacoesVencidas(est, { dia: 10, mes: 3, ano: 1000 })).toBe(est);
  });
});

describe('calcularFicha com sub-raça', () => {
  it('Lobisomem: atributos, altura 1,92 e a carga/EF do corpo novo', () => {
    const normal = G.calcularFicha(humano());
    const lobo = G.calcularFicha(humano(), undefined, undefined, undefined, 'Lobisomem');
    expect(lobo.subraca).toBe('Lobisomem');
    // Comprado: +1 Força, +1 Intelecto. Lobisomem: forca +2, intelecto −2.
    expect(lobo.atributos).toMatchObject({ forca: 3, intelecto: -1, fisico: 2, percepcao: 2, aura: -2, carisma: -2, agilidade: 0 });
    expect(lobo.altura).toBe(1.92);
    expect(normal.altura).toBe(1.77);
    expect(lobo.derivadas.energiaFisica).toBeGreaterThan(normal.derivadas.energiaFisica);
  });

  it('sem o 5º parâmetro, lê do próprio PJ', () => {
    expect(G.calcularFicha(humano({ subraca: 'Vampiro' })).subraca).toBe('Vampiro');
  });

  it('null explícito força a forma natural', () => {
    expect(G.calcularFicha(humano({ subraca: 'Vampiro' }), undefined, undefined, undefined, null).subraca).toBeNull();
  });
});
