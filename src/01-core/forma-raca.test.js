/* ============================================================
   forma-raca.test.js — vampiro e lobisomem
   ============================================================
   Pedidos do usuário (06/10/2026):
     "Vamos adicionar duas novas raças, lobisomem e vampiro."
     "Os atributos comprados previamente vão se manter, apenas os ajustes que
      vão mudar."
     "Vampiro: Altura 1,77m · INT 0 · AUR −1 · CAR +1 · FOR −1 · FIS −2 ·
      PER +1 · AGI +2"
     "Lobisomem: Altura 1,92m · INT −2 · AUR −2 · CAR −2 · FOR +2 · FIS +2 ·
      PER +2 · AGI 0"
     "Vampiros são imunes a frio, calor, doença, sede e sono. […] Vampiros só
      podem se alimentar de sangue (de qualquer origem)."

   OS QUATRO RISCOS que este arquivo trava, todos silenciosos:

   1. O TETO DE PONTOS. O Lobisomem vale 6 pontos de ajuste contra o teto de 4
      do Anão. Se ele entrar na conta de `bonusPontosRaca`, TODO personagem que
      já existe ganha +2 pontos de atributo sem ninguém pedir.
   2. OS PONTOS COMPRADOS. A forma troca o AJUSTE; o que o jogador comprou tem
      de atravessar intacto, nos dois sentidos e de volta.
   3. AS IMUNIDADES. "Remover essas barras E SEUS EFEITOS": não basta esconder
      a barra — a condição não pode descontar poço nem resistência.
   4. O SANGUE. "De qualquer origem" são os seis do catálogo, e um cavalo
      Puro-Sangue não é bebida.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './copy.jsx';
import './constants.jsx';
import './helpers.jsx';
import './inventario-helpers.jsx';
import './game-data.jsx';
import './forca-minima.jsx';   // alcancaForcaMinima: a trava passou para a Força
import './magias-efeito.jsx';   // classeDeDuracao/duracaoEmDiasDeJogo: fimDaForma lê a magia por elas
import './forma-raca.jsx';

let FORMAS, comForma, formaDoPj, ehForma, racasJogaveis, imunidadesDaForma;
let barrasImunes, imuneA, semImunes, ehSangue, podeConsumir, comFormaPosta, semForma;
let fimDaForma, formaVigente, formaVenceu, MAGIA_LICANTROPIA;
beforeAll(() => {
  ({ FORMAS, comForma, formaDoPj, ehForma, racasJogaveis, imunidadesDaForma,
     barrasImunes, imuneA, semImunes, ehSangue, podeConsumir,
     comFormaPosta, semForma,
     fimDaForma, formaVigente, formaVenceu, MAGIA_LICANTROPIA } = window);
  expect(comForma).toBeTypeOf('function');
});

/* Um humano (ajustes todos 0) que comprou Força 3 e Físico 2. Com ajuste zero,
   `_base` é exatamente o que ele comprou — é o caso mais limpo para ver a
   troca de ajuste. */
const HUMANO = {
  id: 1, nome: 'Aldric', raca: 'Humano',
  intelecto_base: 1, aura_base: 0, carisma_base: 2,
  forca_base: 3, fisico_base: 2, percepcao_base: 1, agilidade_base: 0,
  genero: 'Neutro', profissao: 'Guerreiro', experiencia: 0,
};
// Um anão: ajustes AUR −1, CAR −1, FOR +2, FIS +2, AGI −2.
const ANAO = { ...HUMANO, raca: 'Anão',
  aura_base: -1, carisma_base: -1, forca_base: 2, fisico_base: 2, agilidade_base: -2 };

const emForma = (pj, raca, temporaria) => ({
  ...pj, estado_atual: { forma: { raca, ...(temporaria ? { temporaria: true } : {}) } },
});

describe('as duas raças entram no catálogo, mas não no wizard', () => {
  it('estão em GAME_DATA.racas com os números do pedido', () => {
    const r = GAME_DATA.racas;
    expect(r.Vampiro.altura).toBe(1.77);
    expect(r.Vampiro.mods).toEqual({
      intelecto: 0, aura: -1, carisma: 1, forca: -1, fisico: -2, percepcao: 1, agilidade: 2 });
    expect(r.Lobisomem.altura).toBe(1.92);
    expect(r.Lobisomem.mods).toEqual({
      intelecto: -2, aura: -2, carisma: -2, forca: 2, fisico: 2, percepcao: 2, agilidade: 0 });
  });

  it('são FORMAS, e por isso ficam fora da lista de raças jogáveis', () => {
    expect(ehForma('Vampiro')).toBe(true);
    expect(ehForma('Lobisomem')).toBe(true);
    expect(ehForma('Anão')).toBe(false);
    const jogaveis = racasJogaveis();
    expect(jogaveis).not.toContain('Vampiro');
    expect(jogaveis).not.toContain('Lobisomem');
    expect(jogaveis).toContain('Humano');
    expect(jogaveis).toHaveLength(8);        // as oito de sempre
  });

  it('NÃO movem o teto do bônus de pontos de atributo', () => {
    /* O risco silencioso: o Lobisomem vale 6 e o teto era 4 (Anão/Meio-Orc).
       Entrando na conta, o Humano passaria de 4 para 6 pontos de bônus e todo
       personagem já criado ganharia +2 do nada. */
    expect(bonusPontosRaca('Humano')).toBe(4);
    expect(bonusPontosRaca('Anão')).toBe(0);
    expect(bonusPontosRaca('Meio-Orc')).toBe(0);
  });
});

describe('os atributos comprados se mantêm; só o ajuste muda', () => {
  it('humano → lobisomem: cada atributo anda o tanto do ajuste', () => {
    // Ajuste do Humano é 0 em tudo, então o delta é o mod do Lobisomem puro.
    const p = comForma(emForma(HUMANO, 'Lobisomem', true));
    /* A RAÇA NÃO MUDA — é SUB-raça (06/10/2026): "um personagem Elfo-Florestal
       que vira Vampiro permanece Elfo-Florestal, mas agora com uma sub-raça". */
    expect(p.raca).toBe('Humano');
    expect(p.subraca).toBe('Lobisomem');
    expect(p.intelecto_base).toBe(1 - 2);
    expect(p.aura_base).toBe(0 - 2);
    expect(p.carisma_base).toBe(2 - 2);
    expect(p.forca_base).toBe(3 + 2);
    expect(p.fisico_base).toBe(2 + 2);
    expect(p.percepcao_base).toBe(1 + 2);
    expect(p.agilidade_base).toBe(0 + 0);
  });

  it('anão → vampiro: TIRA o ajuste do anão e PÕE o do vampiro', () => {
    /* É aqui que "apenas os ajustes que vão mudar" se prova: o anão tem FOR +2
       de raça, e o vampiro tem FOR −1. Somar o do vampiro sem tirar o do anão
       daria FOR 1; o certo é 2 − 2 + (−1) = −1, porque a parcela COMPRADA de
       Força do anão é zero. */
    const p = comForma(emForma(ANAO, 'Vampiro'));
    expect(p.forca_base).toBe(2 - 2 + (-1));
    expect(p.fisico_base).toBe(2 - 2 + (-2));
    expect(p.agilidade_base).toBe(-2 - (-2) + 2);
    expect(p.aura_base).toBe(-1 - (-1) + (-1));
  });

  it('ir e voltar devolve exatamente o personagem de antes', () => {
    /* A LINHA DO BANCO NUNCA MUDA — é o ponto do desenho. Transformar só
       acrescenta `estado_atual.forma`, e voltar só apaga a chave; os sete
       `_base` gravados seguem sendo os da raça de origem o tempo todo. Então
       "voltar" não é desfazer uma conta: é parar de aplicá-la.
       (Rebasear a partir do personagem JÁ transformado seria o erro: ali os
       `_base` já estão com o ajuste do lobo, e a origem gravada ainda é Anão.) */
    const gravado = { ...ANAO, estado_atual: { forma: { raca: 'Lobisomem', temporaria: true } } };
    const lobo = comForma(gravado);
    expect(lobo.forca_base).toBe(ANAO.forca_base - 2 + 2);

    const voltou = { ...gravado, estado_atual: semForma(gravado.estado_atual) };
    const p = comForma(voltou);
    expect(p).toBe(voltou);                       // sem forma: nem copia
    expect(p.raca).toBe('Anão');
    expect(p.forca_base).toBe(ANAO.forca_base);
    expect(p.agilidade_base).toBe(ANAO.agilidade_base);
    expect(p.intelecto_base).toBe(ANAO.intelecto_base);
  });

  it('sem forma, devolve a MESMA referência', () => {
    expect(comForma(HUMANO)).toBe(HUMANO);
    expect(comForma({ ...HUMANO, estado_atual: {} })).toEqual(expect.objectContaining({ raca: 'Humano' }));
  });

  it('forma gravada que não existe no catálogo é ignorada', () => {
    const p = emForma(HUMANO, 'Banshee');
    expect(formaDoPj(p)).toBeNull();
    expect(comForma(p)).toBe(p);
  });
});

describe('a altura e o que dela deriva', () => {
  it('a altura é a da forma, não a da origem', () => {
    expect(altura('Vampiro', 'Neutro')).toBe(1.77);
    expect(altura('Lobisomem', 'Neutro')).toBe(1.92);
  });

  it('calcularFicha segue a forma: o lobisomem é mais rápido e mais forte', () => {
    const base = calcularFicha(ANAO, null, null);
    const lobo = calcularFicha(emForma(ANAO, 'Lobisomem', true), null, null);
    // VB = (11 × altura) + agilidade: 1,39m de anão contra 1,92m de lobo.
    expect(lobo.derivadas.velocidade).toBeGreaterThan(base.derivadas.velocidade);
    // Físico sobe de 2 para 2 − 2 + 2 = 2… mas o PESO cresce com a altura, e
    // EF = 20% do peso + físico.
    expect(lobo.derivadas.energiaFisica).toBeGreaterThan(base.derivadas.energiaFisica);
    expect(lobo.atributos.forca).toBe(ANAO.forca_base - 2 + 2);
    expect(lobo.atributos.intelecto).toBe(ANAO.intelecto_base - 0 + (-2));
  });
});

describe('as imunidades do vampiro', () => {
  it('são frio, calor, doença, sede e sono — e não a fome', () => {
    expect(imunidadesDaForma('Vampiro').sort())
      .toEqual(['animo', 'hidratacao', 'termorregulacao', 'vitalidade']);
    // As BARRAS, com frio e calor desdobrados de termorregulacao.
    expect(barrasImunes(emForma(HUMANO, 'Vampiro')).sort())
      .toEqual(['animo', 'calor', 'frio', 'hidratacao', 'vitalidade']);
    // Fome fica: o vampiro sente fome, só não come comida.
    expect(imuneA(emForma(HUMANO, 'Vampiro'), 'nutricao')).toBe(false);
  });

  it('o lobisomem não é imune a nada', () => {
    expect(imunidadesDaForma('Lobisomem')).toEqual([]);
    expect(barrasImunes(emForma(HUMANO, 'Lobisomem', true))).toEqual([]);
  });

  it('"e seus efeitos": a condição imune não desconta poço nem resistência', () => {
    /* Doença (vitalidade) e Sede (hidratacao) no talo tiram EF, EH, RF e RM
       via deltasPocosPorCondicoes. No vampiro, não podem tirar nada. */
    const doente = { vitalidade: 100, hidratacao: 100, animo: 100, termorregulacao: -100 };
    const humanoDoente = calcularFicha(HUMANO, null, doente);
    const humanoSao = calcularFicha(HUMANO, null, {});
    expect(humanoDoente.derivadas.energiaFisica).toBeLessThan(humanoSao.derivadas.energiaFisica);

    const vampiro = emForma(HUMANO, 'Vampiro');
    const vampDoente = calcularFicha({ ...vampiro, estado_atual: { ...vampiro.estado_atual, condicoes: doente } }, null, doente);
    const vampSao = calcularFicha(vampiro, null, {});
    expect(vampDoente.derivadas.energiaFisica).toBe(vampSao.derivadas.energiaFisica);
    expect(vampDoente.derivadas.resFisica).toBe(vampSao.derivadas.resFisica);
  });

  it('semImunes devolve as chaves imunes ao que eram antes do desgaste', () => {
    // É assim que o relógio da mesa deixa de tocar no vampiro sem que
    // clima-desgaste.jsx precise saber o que é um vampiro.
    const antes = { vitalidade: 10, hidratacao: 20, nutricao: 30 };
    const depois = { vitalidade: 13, hidratacao: 26, nutricao: 31 };
    expect(semImunes(depois, antes, ['vitalidade', 'hidratacao']))
      .toEqual({ vitalidade: 10, hidratacao: 20, nutricao: 31 });
    // Sem imunidades, devolve o resultado como veio.
    expect(semImunes(depois, antes, [])).toBe(depois);
  });
});

describe('o vampiro só se alimenta de sangue', () => {
  const SANGUES = ['sangue_animal', 'sangue_mistico', 'sangue_podre',
    'sangue_demoniaco', 'sangue_celestial', 'sangue_draconico'];

  it('os seis do catálogo são sangue — "de qualquer origem"', () => {
    SANGUES.forEach((slug) => expect(ehSangue({ slug }), slug).toBe(true));
  });

  it('um cavalo Puro-Sangue não é bebida', () => {
    // Pelo NOME, "Cavalo Puro-Sangue Élfico" passaria. O teste é o slug.
    expect(ehSangue({ slug: 'cavalo_puro_sangue_elfico', nome: 'Cavalo Puro-Sangue Élfico' })).toBe(false);
    expect(ehSangue({ slug: 'pao', nome: 'Pão' })).toBe(false);
    expect(ehSangue(null)).toBe(false);
  });

  it('o vampiro recusa o pão e aceita o sangue', () => {
    const v = emForma(HUMANO, 'Vampiro');
    expect(podeConsumir(v, { slug: 'pao' })).toBe(false);
    expect(podeConsumir(v, { slug: 'sangue_celestial' })).toBe(true);
  });

  it('todo o resto come de tudo, inclusive o lobisomem', () => {
    expect(podeConsumir(HUMANO, { slug: 'pao' })).toBe(true);
    expect(podeConsumir(emForma(HUMANO, 'Lobisomem', true), { slug: 'pao' })).toBe(true);
  });
});

describe('pôr e tirar a forma (puro)', () => {
  it('o lobisomem é marcado como temporário; o vampiro, não', () => {
    expect(comFormaPosta({}, 'Lobisomem')).toEqual({ forma: { raca: 'Lobisomem', temporaria: true } });
    expect(comFormaPosta({}, 'Vampiro')).toEqual({ forma: { raca: 'Vampiro' } });
  });

  it('pôr a mesma forma não muda nada — a MESMA referência', () => {
    const est = comFormaPosta({}, 'Vampiro');
    expect(comFormaPosta(est, 'Vampiro')).toBe(est);
  });

  it('o resto do estado_atual atravessa intacto', () => {
    const est = { vitalidade: { ef: 10 }, condicoes: { nutricao: 40 }, status: ['x'] };
    const posto = comFormaPosta(est, 'Vampiro');
    expect(posto.vitalidade).toEqual({ ef: 10 });
    expect(posto.condicoes).toEqual({ nutricao: 40 });
    expect(posto.status).toEqual(['x']);
    // E voltar não leva nada consigo.
    expect(semForma(posto)).toEqual(est);
  });

  it('tirar de quem não tem forma devolve a MESMA referência', () => {
    const est = { condicoes: {} };
    expect(semForma(est)).toBe(est);
  });

  it('forma desconhecida não grava nada', () => {
    const est = { condicoes: {} };
    expect(comFormaPosta(est, 'Banshee')).toBe(est);
  });
});

/* ── QUEM DIZ QUANDO A FORMA ACABA (06/10/2026) ────────────────────────────
   "É temporariamente pois a magia Licantropia Lupina informa quando se
   encerra." (usuário)

   A correção que este bloco trava: o prazo NÃO está escrito no código. Ele é
   lido da magia pelas mesmas funções que leem a duração de qualquer outra
   (classeDeDuracao, duracaoEmDiasDeJogo). Se alguém voltar a escrever um
   número à mão aqui, o catálogo deixa de mandar — e era justamente isso que
   estava errado. */
describe('o prazo vem da magia, não do código', () => {
  // Licantropia Lupina, como está no catálogo: duração "50 rodadas".
  const LICANTROPIA = { key: 'licantropia_lupina', nome: 'Licantropia Lupina',
    alcance: 'Pessoal', duracao: '50 rodadas' };
  const HOJE = { dia: 11, mes: 11, ano: 1500 };

  it('a chave é de MAGIA, não de habilidade', () => {
    expect(MAGIA_LICANTROPIA).toBe('licantropia_lupina');
  });

  it('"50 rodadas" vira um prazo em RODADAS — tempo de batalha', () => {
    expect(fimDaForma(LICANTROPIA, 1, HOJE)).toEqual({ rodadas: 50 });
  });

  it('se a magia passar a durar dias, o prazo vira CALENDÁRIO — sem mexer no código', () => {
    const fim = fimDaForma({ ...LICANTROPIA, duracao: '2 dias' }, 1, HOJE);
    expect(fim.vence_em).toBeTruthy();
    expect(fim.rodadas).toBeUndefined();
    // 11/11/1500 + 2 dias.
    expect(fim.vence_em).toEqual(somarDiasFantasy(HOJE, 2));
  });

  it('o texto do NÍVEL manda sobre a coluna, como em toda magia', () => {
    const comNivel = { ...LICANTROPIA, nivel_3: 'A magia tem duração de 5 dias.' };
    expect(fimDaForma(comNivel, 3, HOJE).vence_em).toEqual(somarDiasFantasy(HOJE, 5));
  });

  it('magia permanente não deixa prazo nenhum', () => {
    expect(fimDaForma({ ...LICANTROPIA, duracao: 'Permanente' }, 1, HOJE)).toEqual({});
  });

  it('o prazo entra na forma gravada, e re-evocar RENOVA', () => {
    const posto = comFormaPosta({}, 'Lobisomem', { rodadas: 50 });
    expect(posto.forma).toEqual({ raca: 'Lobisomem', temporaria: true, rodadas: 50 });
    // Evocar de novo com prazo novo manda sobre o antigo.
    const renovado = comFormaPosta(posto, 'Lobisomem', { rodadas: 50 });
    expect(renovado).not.toBe(posto);
    expect(renovado.forma.rodadas).toBe(50);
  });

  it('o vampiro continua sem prazo: nenhuma magia o concede', () => {
    expect(comFormaPosta({}, 'Vampiro').forma).toEqual({ raca: 'Vampiro' });
  });
});

describe('a forma vencida', () => {
  const HOJE = { dia: 11, mes: 11, ano: 1500 };
  const comPrazo = (fim) => ({ ...HUMANO, estado_atual: { forma: { raca: 'Lobisomem', temporaria: true, ...fim } } });

  it('vale até o dia do vencimento, e não vale nele', () => {
    const vence13 = comPrazo({ vence_em: { dia: 13, mes: 11, ano: 1500 } });
    expect(formaVigente(vence13, { dia: 12, mes: 11, ano: 1500 })).toBeTruthy();
    expect(formaVigente(vence13, { dia: 13, mes: 11, ano: 1500 })).toBeNull();
    expect(formaVenceu(vence13, { dia: 13, mes: 11, ano: 1500 })).toBe(true);
  });

  it('prazo em RODADAS não vence no calendário — rodada é tempo de batalha', () => {
    // A mesma fronteira que valeForaDeCombate traça para as magias de rodada.
    const emRodadas = comPrazo({ rodadas: 50 });
    expect(formaVigente(emRodadas, { dia: 999, mes: 11, ano: 2000 })).toBeTruthy();
    expect(formaVenceu(emRodadas, HOJE)).toBe(false);
  });

  it('forma sem prazo (o vampiro) nunca vence', () => {
    const v = { ...HUMANO, estado_atual: { forma: { raca: 'Vampiro' } } };
    expect(formaVigente(v, { dia: 999, mes: 11, ano: 3000 })).toBeTruthy();
    expect(formaVenceu(v, HOJE)).toBe(false);
  });

  it('sem data de jogo, nada vence — não há com o que comparar', () => {
    const vence13 = comPrazo({ vence_em: { dia: 13, mes: 11, ano: 1500 } });
    expect(formaVigente(vence13, null)).toBeTruthy();
    expect(formaVenceu(vence13, null)).toBe(false);
  });

  it('sem forma, não há o que vencer', () => {
    expect(formaVigente(HUMANO, HOJE)).toBeNull();
    expect(formaVenceu(HUMANO, HOJE)).toBe(false);
  });
});

/* ── SUB-RAÇA: SÓ O QUE ELA DEFINE MUDA (06/10/2026) ──────────────────────
   "A raça vampiro e lobisomem devem ser uma SUB-RAÇA, isso quer dizer que o
   ajuste dos atributos e outros detalhes já definidos mudam, mas todo o
   restante permanece o mesmo. Um personagem Elfo-Florestal que vira Vampiro
   permanece Elfo-Florestal […] Ou seja, as magias, armas, etc que ele pode
   usar com restrição de raça permanece inalterado." (usuário)

   A primeira versão TROCAVA `raca`, e isso vazava a forma para tudo que lê
   raça por outro motivo: o bônus de habilidade por raça+reino, os idiomas
   iniciais, os aprimoramentos e as mãos que uma arma exige. Estes testes
   trancam a fronteira — o que a sub-raça sobrepõe, e o que ela não toca. */
describe('a sub-raça sobrepõe o ajuste e a altura, e nada mais', () => {
  const ELFO = { ...HUMANO, raca: 'Elfo-Florestal',
    forca_base: -1, fisico_base: -1, agilidade_base: 1, percepcao_base: 2 };

  it('o elfo que vira vampiro CONTINUA Elfo-Florestal', () => {
    const p = comForma(emForma(ELFO, 'Vampiro'));
    expect(p.raca).toBe('Elfo-Florestal');
    expect(p.subraca).toBe('Vampiro');
  });

  it('as mãos que uma peça exige são as MESMAS para todos', () => {
    /* A limitação por raça saiu em 06/10/2026 ("remova a limitação de uso de
       armas das raças anão, pequenino, etc"): uma coluna de mãos
       (`maos_outras`) vale para qualquer um, e nem raça nem sub-raça mexem
       nisso. As colunas antigas seguem no banco sem efeito de regra. */
    const ESPADONA = { maos_pequenino: 2, maos_anao: 2, maos_outras: 1 };
    expect(getMaosRequeridas(ESPADONA)).toBe(1);
    const anaoVampiro = comForma(emForma({ ...ANAO }, 'Vampiro'));
    expect(getMaosRequeridas(ESPADONA, anaoVampiro.raca)).toBe(1);   // a raça é ignorada
  });

  it('a FORÇA limita a arma — e a sub-raça mexe nela, de propósito', () => {
    /* A trava de uso passou da linhagem para o atributo (06/10/2026: "a
       limitação será pelo campo força mínima"). Então a sub-raça PODE mudar o
       acesso a uma arma, e isso é coerente: ela não mudou uma regra de raça,
       mudou a Força do personagem.
       Anão: FOR +2 de ajuste e 2 gravado em forca_base. Vampiro: FOR −1, logo
       2 − 2 + (−1) = −1. Lobisomem: FOR +2, logo 2 − 2 + 2 = 2. */
    const MACHADO = { forca_req: 2, maos_outras: 2 };
    expect(alcancaForcaMinima(MACHADO, ANAO.forca_base).ok).toBe(true);

    const vampiro = comForma(emForma(ANAO, 'Vampiro'));
    expect(vampiro.forca_base).toBe(-1);
    expect(alcancaForcaMinima(MACHADO, vampiro.forca_base).ok).toBe(false);

    const lobo = comForma(emForma(ANAO, 'Lobisomem', true));
    expect(alcancaForcaMinima(MACHADO, lobo.forca_base).ok).toBe(true);

    // Peça sem força mínima não trava ninguém, nem o mais fraco.
    expect(alcancaForcaMinima({ maos_outras: 1 }, -2).ok).toBe(true);
  });

  it('o que CONTINUA sendo da raça: o bônus de pontos, não a arma', () => {
    const p = comForma(emForma(HUMANO, 'Lobisomem', true));
    expect(bonusPontosRaca(p.raca)).toBe(bonusPontosRaca('Humano'));
  });

  it('o bônus de pontos da raça é o da RAÇA, não o da sub-raça', () => {
    // bonusPontosRaca lê a raça de origem; o Lobisomem vale 6 e não entra.
    const p = comForma(emForma(HUMANO, 'Lobisomem', true));
    expect(bonusPontosRaca(p.raca)).toBe(bonusPontosRaca('Humano'));
  });

  it('a ALTURA é a da sub-raça — é detalhe que ela define', () => {
    expect(altura('Anão', 'Neutro')).toBe(1.39);
    expect(altura('Anão', 'Neutro', 'Vampiro')).toBe(1.77);
    expect(altura('Anão', 'Neutro', 'Lobisomem')).toBe(1.92);
    // Sub-raça desconhecida não derruba nada: vale a raça.
    expect(altura('Anão', 'Neutro', 'Banshee')).toBe(1.39);
  });

  it('o FATOR DE PESO continua o da raça: o anão é compacto', () => {
    /* A sub-raça declara altura, não compleição — "todo o restante permanece o
       mesmo". Um anão vampiro é um anão de 1,77m, e pesa como tal: 1,77² × 40,
       não × 28. */
    const h = altura('Anão', 'Neutro', 'Vampiro');
    expect(peso('Anão', 'Neutro', 'Vampiro')).toBe(Math.floor(h * h * 40));
    expect(peso('Humano', 'Neutro', 'Vampiro')).toBe(Math.floor(h * h * 28));
  });

  it('calcularFicha segue a sub-raça na altura e a raça no resto', () => {
    const base = calcularFicha(ELFO, null, null);
    const vamp = calcularFicha(emForma(ELFO, 'Vampiro'), null, null);
    // 1,71m de elfo-florestal contra 1,77m de vampiro: VB sobe.
    expect(vamp.derivadas.velocidade).toBeGreaterThan(base.derivadas.velocidade);
    // E os ajustes trocaram: AGI do elfo é +1, do vampiro é +2.
    expect(vamp.atributos.agilidade).toBe(ELFO.agilidade_base - 1 + 2);
    // PER do elfo é +2, do vampiro é +1.
    expect(vamp.atributos.percepcao).toBe(ELFO.percepcao_base - 2 + 1);
  });

  it('as imunidades saem da SUB-raça, não da raça', () => {
    const vamp = comForma(emForma(ELFO, 'Vampiro'));
    expect(imunidadesDaForma(vamp.subraca).length).toBe(4);
    expect(imunidadesDaForma(vamp.raca)).toEqual([]);   // Elfo-Florestal não é forma
  });
});
