/* ============================================================
   log-tempo-mesa.test.js — data, hora e clima no log da aventura
   ============================================================
   "As mudanças de data, hora e condições climáticas devem ser informadas no
    log da aventura para todos. Quando a data mudar, informe quando houver um
    feriado naquele dia." (usuário, 20/09/2026)

   O log já existia: RPC registrar_evento_mesa grava em mesa_log e o Realtime
   distribui para a mesa inteira. O que é novo são os TEXTOS — e é só isso que
   este arquivo testa, porque é só isso que tem regra.

   O feriado vem de feriadosDoDia (10-shell/shell.jsx), que devolve ARRAY: há
   datas com mais de um. Dia 5 do Mês da Água tem dois, e é o caso que separa
   um texto correto de um que só sabe anunciar o primeiro.

   `rotuloDataJogo` é a mesma função que a barra do topo usa para escrever a
   data. Ela virou função em vez de continuar inline no JSX exatamente para o
   log e a barra nunca divergirem — duas formatações da mesma data em lugares
   diferentes é o tipo de coisa que ninguém percebe até estar errada.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './shell.jsx';

let rotuloDataJogo, textoEventoData, textoEventoHora, textoEventoTempo, feriadosDoDia;
beforeAll(() => {
  ({ rotuloDataJogo, textoEventoData, textoEventoHora, textoEventoTempo, feriadosDoDia } = globalThis);
  for (const [nome, fn] of Object.entries({ rotuloDataJogo, textoEventoData, textoEventoHora, textoEventoTempo, feriadosDoDia })) {
    expect(fn, `${nome} precisa estar no window`).toBeTypeOf('function');
  }
});

// 11 do Mês da Vida (11) de 1500 — a mesma data usada nos outros testes da barra.
const DIA_11 = { dia: 11, mes: 11, ano: 1500 };

describe('rotuloDataJogo — a data escrita por extenso', () => {
  it('traz dia da semana, dia, mês e ano', () => {
    const txt = rotuloDataJogo(DIA_11);
    expect(txt).toContain('11');
    expect(txt).toContain('Vida');
    expect(txt).toContain('1500');
  });

  /* O nome do mês entra SEM o "Mês da/do" — a barra do topo já escrevia assim,
     e o log tem que dizer a mesma coisa que a tela. */
  it('corta o prefixo "Mês da/do"', () => {
    expect(rotuloDataJogo(DIA_11)).not.toContain('Mês');
  });

  it('mesa sem data devolve vazio em vez de quebrar', () => {
    expect(rotuloDataJogo(null)).toBe('');
    expect(rotuloDataJogo({})).toBe('');
    expect(rotuloDataJogo({ dia: 1 })).toBe('');
  });
});

describe('textoEventoData — a data muda, e o feriado vai junto', () => {
  it('dia comum anuncia só a data', () => {
    const txt = textoEventoData(DIA_11, false);
    expect(txt).toContain(rotuloDataJogo(DIA_11));
    expect(txt).not.toMatch(/feriado|Hoje é/i);
  });

  it('dia de feriado anuncia o nome dele', () => {
    // 1 do Mês da Água = Dia do Mar.
    const txt = textoEventoData({ dia: 1, mes: 2, ano: 1500 }, false);
    expect(txt).toContain('Dia do Mar');
  });

  /* O CASO QUE SEPARA O TEXTO CERTO DO QUASE-CERTO: dia 5 do Mês da Água tem
     Jejum da Piedade E Solstício de Verão. Anunciar só o primeiro esconde
     metade do calendário. */
  it('dia com DOIS feriados anuncia os dois', () => {
    const feriados = feriadosDoDia(5, 2);
    expect(feriados.length, 'o calendário precisa ter 2 feriados em 5/2').toBe(2);
    const txt = textoEventoData({ dia: 5, mes: 2, ano: 1500 }, false);
    for (const f of feriados) expect(txt).toContain(f);
  });

  it('o Dia de Cruine também é feriado', () => {
    const txt = textoEventoData({ dia: 1, mes: 13, ano: 1500 }, false);
    expect(txt).toContain('Cruine');
  });

  it('mesa sem data não vira evento', () => {
    expect(textoEventoData(null, false)).toBe('');
  });
});

/* DE ONDE PARA ONDE (20/09/2026): "use 'O tempo mudou de 12h para 13h.'" e
   "use 'O clima mudou de Desértico para Árido.'"

   Os dois textos diziam só o destino ("A hora da mesa agora é 13h", "O tempo
   mudou: Água · Árido"). Quem lê o log da aventura depois não estava na mesa
   quando aconteceu: sem o ponto de partida, não dá para saber se passou uma
   hora ou doze, nem se o clima melhorou ou piorou.

   Repare no vocabulário, que o usuário separou: "TEMPO" é o relógio, "CLIMA"
   é a condição atmosférica. A trilha (Água, Vento, Temperatura) sai da frase
   — os nomes dos degraus já dizem de qual eixo se está falando. */
describe('textoEventoHora — de que hora para que hora', () => {
  it('diz de onde para onde', () => {
    expect(textoEventoHora(12, 13, false)).toBe('O tempo mudou de 12h para 13h.');
  });

  it('a meia-noite é 0h, não some', () => {
    expect(textoEventoHora(23, 0, false)).toContain('para 0h');
  });

  it('e fala inglês quando pedido', () => {
    expect(textoEventoHora(12, 13, true)).not.toBe(textoEventoHora(12, 13, false));
    expect(textoEventoHora(12, 13, true)).toContain('13h');
  });

  /* Mesa que ainda não tinha hora não tem "de onde": a frase vira só o
     destino, em vez de inventar um ponto de partida. */
  it('sem hora anterior, anuncia só a hora nova', () => {
    const txt = textoEventoHora(null, 13, false);
    expect(txt).toContain('13h');
    expect(txt).not.toContain('de null');
  });

  it('hora igual não vira evento', () => {
    expect(textoEventoHora(13, 13, false)).toBe('');
  });
});

describe('textoEventoTempo — de que degrau para que degrau', () => {
  it('nomeia os dois degraus, sem a trilha', () => {
    expect(textoEventoTempo('agua', 'desertico', 'arido', false))
      .toBe('O clima mudou de Desértico para Árido.');
  });

  it('vale para as três trilhas', () => {
    expect(textoEventoTempo('vento', 'leves', 'tornado', false))
      .toBe('O clima mudou de Ventos leves para Tornado.');
    expect(textoEventoTempo('temperatura', 'agradavel', 'calor_extremo', false))
      .toBe('O clima mudou de Agradável para Calor extremo.');
  });

  /* Mesa sem aquela trilha definida cai no degrau PADRÃO, que é o que a barra
     já mostrava — dizer "de nada para Árido" seria mentira. */
  it('sem degrau anterior, parte do padrão da trilha', () => {
    expect(textoEventoTempo('agua', null, 'arido', false))
      .toBe('O clima mudou de Fresco para Árido.');
  });

  it('degrau desconhecido não vira evento', () => {
    expect(textoEventoTempo('agua', 'fresco', 'granizo_roxo', false)).toBe('');
    expect(textoEventoTempo('inexistente', 'a', 'b', false)).toBe('');
  });

  it('degrau igual não vira evento', () => {
    expect(textoEventoTempo('agua', 'arido', 'arido', false)).toBe('');
  });
});
