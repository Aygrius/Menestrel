/* ============================================================
   clima-desgaste.test.js — o relógio desgasta o personagem
   ============================================================
   Implementa docs/superpowers/specs/2026-09-20-clima-desgaste-design.md.

   "De 20h de um dia até 8h do dia seguinte, a barra de sono deve cair 2 pontos
    por hora. Frio extremo diminui 10 pontos de temperatura por hora, frio leve
    5 (…). Calor extremo diminui 10 pontos de sede por hora (…). Alimentação,
    hidratação diminui 1 ponto por hora que se passa." (usuário, 20/09/2026)

   TRÊS ARMADILHAS que estes testes existem para travar:

   1. SEDE E HIDRATAÇÃO SÃO A MESMA BARRA. O pedido as cita separadas, mas
      `hidratacao` é uma barra só (Desidratado ↔ Hidratado). O calor SOMA em
      cima da perda de base: calor extremo desidrata −11/h, não −10.

   2. A JANELA DO SONO É POR HORA CRUZADA. Pular de 18h para 10h do dia
      seguinte são 16 horas, das quais só 12 caem entre 20h e 8h — o sono cai
      24, não 32. Quem contar o intervalo inteiro erra.

   3. O TIQUE DO CLIMA NÃO MOVE A ÂNCORA. Mudar o degrau cobra uma hora na
      hora, mas o relógio não andou; se a âncora andasse junto, a próxima
      virada cobraria de menos.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './constants.jsx';
import './helpers.jsx';
import './clima-desgaste.jsx';

let decaimentoPorHoras, horasEntre, noiteDeSono, tiqueDeClima,
    penalidadeVentoVB, aguaPorHoraDeChuva, proximoInstante;
beforeAll(() => {
  ({ decaimentoPorHoras, horasEntre, noiteDeSono, tiqueDeClima,
     penalidadeVentoVB, aguaPorHoraDeChuva, proximoInstante } = globalThis);
  for (const [nome, fn] of Object.entries({ decaimentoPorHoras, horasEntre, noiteDeSono,
      tiqueDeClima, penalidadeVentoVB, aguaPorHoraDeChuva, proximoInstante })) {
    expect(fn, `${nome} precisa estar no window`).toBeTypeOf('function');
  }
});

const AMENO = { agua: 'fresco', vento: 'sem_vento', temperatura: 'agradavel' };
const zerado = () => ({ nutricao: 0, hidratacao: 0, termorregulacao: 0, animo: 0 });

describe('noiteDeSono — quais horas cansam', () => {
  it('as doze horas entre 20h e 8h', () => {
    const noite = [20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7];
    for (const h of noite) expect(noiteDeSono(h), `${h}h devia ser noite`).toBe(true);
    expect(noite.length).toBe(12);
  });

  it('e nenhuma das outras', () => {
    for (let h = 8; h <= 19; h++) expect(noiteDeSono(h), `${h}h não devia cansar`).toBe(false);
  });
});

describe('decaimentoPorHoras — as quatro barras', () => {
  it('uma hora amena tira 1 de fome e 1 de sede, e mais nada', () => {
    const d = decaimentoPorHoras(zerado(), 12, 1, AMENO);
    expect(d.nutricao).toBe(-1);
    expect(d.hidratacao).toBe(-1);
    expect(d.termorregulacao).toBe(0);
    expect(d.animo).toBe(0);
  });

  it('zero hora não muda nada', () => {
    expect(decaimentoPorHoras(zerado(), 12, 0, AMENO)).toEqual(zerado());
  });

  it('frio extremo tira 10 de temperatura por hora; frio leve, 5', () => {
    expect(decaimentoPorHoras(zerado(), 12, 1, { temperatura: 'frio_extremo' }).termorregulacao).toBe(-10);
    expect(decaimentoPorHoras(zerado(), 12, 1, { temperatura: 'frio_leve' }).termorregulacao).toBe(-5);
  });

  it('calor extremo SOBE 10 de temperatura por hora; calor leve, 5', () => {
    expect(decaimentoPorHoras(zerado(), 12, 1, { temperatura: 'calor_extremo' }).termorregulacao).toBe(10);
    expect(decaimentoPorHoras(zerado(), 12, 1, { temperatura: 'calor_leve' }).termorregulacao).toBe(5);
  });

  /* ARMADILHA 1. O pedido fala em "sede" e em "hidratação" como se fossem
     duas barras; são a mesma. O calor não substitui a perda de base, soma. */
  /* 24/09/2026: "Calor leve -2 de hidratação por hora, e calor extremo é -5".
     Continua somando na perda de base. */
  it('calor extremo desidrata 6 por hora, calor leve 3 — a base soma', () => {
    expect(decaimentoPorHoras(zerado(), 12, 1, { temperatura: 'calor_extremo' }).hidratacao).toBe(-6);
    expect(decaimentoPorHoras(zerado(), 12, 1, { temperatura: 'calor_leve' }).hidratacao).toBe(-3);
  });

  /* 24/09/2026: "Frio leve -1 de saúde por hora, e frio extremo é -3". */
  it('frio extremo tira 3 de saúde por hora; frio leve, 1', () => {
    expect(decaimentoPorHoras(zerado(), 12, 1, { temperatura: 'frio_extremo' }).vitalidade).toBe(-3);
    expect(decaimentoPorHoras(zerado(), 12, 1, { temperatura: 'frio_leve' }).vitalidade).toBe(-1);
    expect(decaimentoPorHoras({ vitalidade: -49 }, 12, 5, { temperatura: 'frio_extremo' }).vitalidade).toBe(-50);
  });

  it('calor e clima ameno não mexem na saúde', () => {
    expect(decaimentoPorHoras({ vitalidade: 7 }, 12, 3, { temperatura: 'calor_extremo' }).vitalidade).toBe(7);
    expect(decaimentoPorHoras({ vitalidade: 7 }, 12, 3, AMENO).vitalidade).toBe(7);
  });

  it('frio não mexe na sede além da base', () => {
    expect(decaimentoPorHoras(zerado(), 12, 1, { temperatura: 'frio_extremo' }).hidratacao).toBe(-1);
  });

  it('a noite tira 2 de sono por hora', () => {
    expect(decaimentoPorHoras(zerado(), 22, 1, AMENO).animo).toBe(-2);
    expect(decaimentoPorHoras(zerado(), 14, 1, AMENO).animo).toBe(0);
  });
});

describe('a janela do sono conta hora a hora', () => {
  /* ARMADILHA 2. 16 horas cruzadas, 12 delas na janela. */
  it('de 18h a 10h do dia seguinte: 16 horas, 24 de sono', () => {
    const d = decaimentoPorHoras(zerado(), 18, 16, AMENO);
    expect(d.animo).toBe(-24);
    expect(d.nutricao).toBe(-16);
  });

  it('uma tarde inteira não tira sono nenhum', () => {
    expect(decaimentoPorHoras(zerado(), 8, 12, AMENO).animo).toBe(0);
  });

  it('a noite inteira tira 24', () => {
    expect(decaimentoPorHoras(zerado(), 20, 12, AMENO).animo).toBe(-24);
  });

  it('a virada de 23h para 0h não perde a conta', () => {
    expect(decaimentoPorHoras(zerado(), 23, 2, AMENO).animo).toBe(-4);
  });
});

describe('o teto de ±50 segura os saltos grandes', () => {
  it('72 horas de fome param no fundo da barra', () => {
    const d = decaimentoPorHoras(zerado(), 12, 72, AMENO);
    expect(d.nutricao).toBe(-50);
    expect(d.hidratacao).toBe(-50);
  });

  it('e o calor não estoura por cima', () => {
    expect(decaimentoPorHoras(zerado(), 12, 72, { temperatura: 'calor_extremo' }).termorregulacao).toBe(50);
  });

  it('quem já está no fundo continua no fundo', () => {
    const cheio = { nutricao: -50, hidratacao: -50, termorregulacao: 0, animo: -50 };
    expect(decaimentoPorHoras(cheio, 22, 5, AMENO)).toEqual(cheio);
  });
});

describe('condições que o motor não conhece ficam intactas', () => {
  /* São oito barras no jsonb; o relógio mexe em quatro. Sanidade, euforia,
     reputação e vitalidade não podem ser apagadas de passagem. */
  it('sanidade, euforia, reputação e vitalidade passam ilesas', () => {
    const antes = { ...zerado(), sanidade: 20, euforia: -10, reputacao: 30, vitalidade: 5 };
    const d = decaimentoPorHoras(antes, 12, 5, AMENO);
    expect(d.sanidade).toBe(20);
    expect(d.euforia).toBe(-10);
    expect(d.reputacao).toBe(30);
    expect(d.vitalidade).toBe(5);
  });

  it('condições ausentes começam do zero em vez de virar NaN', () => {
    const d = decaimentoPorHoras({}, 12, 1, AMENO);
    expect(d.nutricao).toBe(-1);
    expect(Number.isNaN(d.hidratacao)).toBe(false);
  });

  it('mesa sem clima definido só sofre o desgaste de base', () => {
    const d = decaimentoPorHoras(zerado(), 12, 1, null);
    expect(d.nutricao).toBe(-1);
    expect(d.termorregulacao).toBe(0);
  });
});

describe('horasEntre — data e relógio são uma linha do tempo só', () => {
  const inst = (ano, mes, dia, hora) => ({ ano, mes, dia, hora });

  it('conta as horas do mesmo dia', () => {
    expect(horasEntre(inst(1500, 11, 11, 10), inst(1500, 11, 11, 18))).toBe(8);
  });

  it('atravessa a meia-noite', () => {
    expect(horasEntre(inst(1500, 11, 11, 22), inst(1500, 11, 12, 2))).toBe(4);
  });

  it('atravessa meses e o Dia de Cruine', () => {
    // 30 do mês 12 → 1 do mês 13 (Cruine) é um dia.
    expect(horasEntre(inst(1500, 12, 30, 0), inst(1500, 13, 1, 0))).toBe(24);
    // Cruine → primeiro dia do ano seguinte.
    expect(horasEntre(inst(1500, 13, 1, 0), inst(1501, 1, 1, 0))).toBe(24);
  });

  /* Tempo para trás não desfaz nada: devolve 0 e quem chama só re-ancora. */
  it('tempo para trás devolve zero, nunca negativo', () => {
    expect(horasEntre(inst(1500, 11, 11, 18), inst(1500, 11, 11, 10))).toBe(0);
    expect(horasEntre(inst(1500, 11, 11, 0), inst(1500, 11, 10, 0))).toBe(0);
  });

  it('instante incompleto devolve zero em vez de quebrar', () => {
    expect(horasEntre(null, inst(1500, 11, 11, 10))).toBe(0);
    expect(horasEntre(inst(1500, 11, 11, 10), null)).toBe(0);
    expect(horasEntre({}, {})).toBe(0);
  });
});

describe('proximoInstante — hora menor vira o dia', () => {
  const hoje = { ano: 1500, mes: 11, dia: 11, hora: 22 };

  it('escolher uma hora maior fica no mesmo dia', () => {
    expect(proximoInstante(hoje, 23)).toEqual({ ano: 1500, mes: 11, dia: 11, hora: 23 });
  });

  /* O tempo só anda para frente: às 22h, escolher 2h é 2h de amanhã. */
  it('escolher uma hora menor avança o calendário', () => {
    expect(proximoInstante(hoje, 2)).toEqual({ ano: 1500, mes: 11, dia: 12, hora: 2 });
  });

  it('a mesma hora não move o dia', () => {
    expect(proximoInstante(hoje, 22)).toEqual({ ano: 1500, mes: 11, dia: 11, hora: 22 });
  });

  it('a virada do ano funciona', () => {
    const cruine = { ano: 1500, mes: 13, dia: 1, hora: 23 };
    expect(proximoInstante(cruine, 1)).toEqual({ ano: 1501, mes: 1, dia: 1, hora: 1 });
  });

  it('mesa sem data devolve só a hora, sem inventar calendário', () => {
    expect(proximoInstante(null, 5)).toEqual({ hora: 5 });
    expect(proximoInstante({ hora: 10 }, 5)).toEqual({ hora: 5 });
  });
});

describe('tiqueDeClima — mudar o degrau cobra uma hora na hora', () => {
  it('ligar calor extremo cobra +10 de temperatura e −5 de sede', () => {
    const d = tiqueDeClima(zerado(), 'temperatura', 'calor_extremo');
    expect(d.termorregulacao).toBe(10);
    expect(d.hidratacao).toBe(-5);
  });

  it('ligar frio extremo cobra −10 de temperatura e −3 de saúde', () => {
    const d = tiqueDeClima(zerado(), 'temperatura', 'frio_extremo');
    expect(d.termorregulacao).toBe(-10);
    expect(d.vitalidade).toBe(-3);
  });

  it('ligar frio leve cobra −1 de saúde; calor não mexe nela', () => {
    expect(tiqueDeClima(zerado(), 'temperatura', 'frio_leve').vitalidade).toBe(-1);
    expect(tiqueDeClima({ vitalidade: 4 }, 'temperatura', 'calor_leve').vitalidade).toBe(4);
  });

  /* O tique é do CLIMA. Fome, sede de base e sono são efeito do tempo que
     passa, e o relógio não andou. */
  it('e NÃO cobra a perda de base de fome nem o sono', () => {
    const d = tiqueDeClima(zerado(), 'temperatura', 'calor_extremo');
    expect(d.nutricao).toBe(0);
    expect(d.animo).toBe(0);
  });

  it('água e vento não desgastam condição nenhuma', () => {
    expect(tiqueDeClima(zerado(), 'agua', 'tempestade')).toEqual(zerado());
    expect(tiqueDeClima(zerado(), 'vento', 'tornado')).toEqual(zerado());
  });

  it('o degrau neutro não cobra nada', () => {
    expect(tiqueDeClima(zerado(), 'temperatura', 'agradavel')).toEqual(zerado());
  });

  it('degrau desconhecido não cobra nada', () => {
    expect(tiqueDeClima(zerado(), 'temperatura', 'inventado')).toEqual(zerado());
  });
});

describe('penalidadeVentoVB — o vento não acumula, penaliza enquanto sopra', () => {
  it('sobe com o degrau, até 4 no tornado', () => {
    expect(penalidadeVentoVB('leves')).toBe(1);
    expect(penalidadeVentoVB('ventania')).toBe(2);
    expect(penalidadeVentoVB('vendaval')).toBe(3);
    expect(penalidadeVentoVB('tornado')).toBe(4);
  });

  it('sem vento não penaliza', () => {
    expect(penalidadeVentoVB('sem_vento')).toBe(0);
    expect(penalidadeVentoVB(null)).toBe(0);
    expect(penalidadeVentoVB('inventado')).toBe(0);
  });
});

describe('aguaPorHoraDeChuva — a chuva enche a loja', () => {
  it('2 por hora em tempestade, 1 em chuva fina', () => {
    expect(aguaPorHoraDeChuva('tempestade')).toBe(2);
    expect(aguaPorHoraDeChuva('chuva_fina')).toBe(1);
  });

  it('clima seco não põe água nenhuma', () => {
    expect(aguaPorHoraDeChuva('fresco')).toBe(0);
    expect(aguaPorHoraDeChuva('arido')).toBe(0);
    expect(aguaPorHoraDeChuva('desertico')).toBe(0);
    expect(aguaPorHoraDeChuva(null)).toBe(0);
  });
});

describe('o vento chega à ficha pela Velocidade Base', () => {
  /* O vento é a única trilha que não desgasta: penaliza enquanto sopra e some
     quando para. Por isso entra em calcularFicha como parâmetro, não no jsonb
     do personagem — nada a gravar, nada a desfazer. */
  let calcularFicha, PJ;
  beforeAll(async () => {
    await import('./game-data.jsx');
    calcularFicha = globalThis.calcularFicha;
    expect(calcularFicha, 'calcularFicha precisa estar no window').toBeTypeOf('function');
    PJ = {
      nome: 'Adrian', raca: 'Humano', profissao: 'Guerreiro', experiencia: 0,
      intelecto_base: 1, aura_base: 1, carisma_base: 1, forca_base: 1,
      fisico_base: 1, agilidade_base: 3, percepcao_base: 1,
      habilidades: {}, magias: {}, tecnicas: {}, grupos_armas: {},
    };
  });

  const vb = (vento) => calcularFicha(PJ, undefined, undefined, vento).derivadas.velocidade;

  it('sem vento, a VB é a de sempre', () => {
    expect(vb(undefined)).toBe(vb('sem_vento'));
  });

  it('cada degrau tira mais um ponto, até 4 no tornado', () => {
    const base = vb('sem_vento');
    expect(vb('leves')).toBe(base - 1);
    expect(vb('ventania')).toBe(base - 2);
    expect(vb('vendaval')).toBe(base - 3);
    expect(vb('tornado')).toBe(base - 4);
  });

  /* Os nove pontos de chamada antigos não passam o parâmetro. Nenhum deles
     pode mudar de resultado por causa disto. */
  it('quem chama sem o parâmetro não muda de resultado', () => {
    expect(calcularFicha(PJ, undefined, undefined).derivadas.velocidade)
      .toBe(calcularFicha(PJ, undefined, undefined, 'sem_vento').derivadas.velocidade);
  });

  it('a VB nunca fica negativa por causa do vento', () => {
    const fraco = { ...PJ, agilidade_base: 0 };
    expect(calcularFicha(fraco, undefined, undefined, 'tornado').derivadas.velocidade)
      .toBeGreaterThanOrEqual(0);
  });
});
