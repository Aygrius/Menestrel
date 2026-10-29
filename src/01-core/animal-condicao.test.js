/* ============================================================
   animal-condicao.test.js — o clima desgasta o bicho, e as barras o abatem
   ============================================================
   Pedido do usuário (06/10/2026):
     "Eu espero que os efeitos do tempo e do clima também estejam afetando os
      animais, e que os efeitos negativos das barras afetem os atributos do
      animal."

   O QUE PODE SE DESFAZER EM SILÊNCIO, e é o que este arquivo trava:

   1. O MOTOR TEM DE SER O MESMO. Se o desgaste do bicho passar a ter números
      próprios, a mesa fica com duas regras de fome — e a divergência só
      aparece depois de uma semana de jogo.
   2. A ESCALA DO ATRIBUTO. O personagem perde até 6 de um POÇO de dezenas; um
      atributo vive entre −2 e +6. Trocar `floor` por `round` aqui faria um
      bicho levemente com fome ficar tão fraco quanto um faminto, e −6 num
      atributo não é penalidade, é aniquilação.
   3. OS DERIVADOS GRAVADOS. As 175 criaturas têm energia_fisica,
      energia_heroica e velocidade em COLUNA, e vitalidadeDoAnimal prefere a
      coluna à fórmula. Baixar o Físico sem refazer a EF deixaria o teto da
      barra no valor do bicho saudável.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './copy.jsx';
import './constants.jsx';
import './helpers.jsx';
import './inventario-helpers.jsx';
import './clima-desgaste.jsx';
import './game-data.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import './animal-experiencia.jsx';
import './animal-condicao.jsx';

let CONDICOES_ANIMAL_ATRIBUTO, barrasDoAnimal, deltasAtributosDoAnimal;
let criaturaAbalada, comDesgasteNosAnimais, comTiqueDeClimaNosAnimais;
beforeAll(() => {
  ({ CONDICOES_ANIMAL_ATRIBUTO, barrasDoAnimal, deltasAtributosDoAnimal,
     criaturaAbalada, comDesgasteNosAnimais, comTiqueDeClimaNosAnimais } = window);
  expect(comDesgasteNosAnimais).toBeTypeOf('function');
});

const CAVALO = {
  id: 157, nome: 'Cavalo Quarter', estagio: 4, peso: 400,
  forca: 3, agilidade: 2, fisico: 3, aura: 1, intelecto: 0, carisma: 0, percepcao: 1,
  energia_fisica: 43, energia_heroica: 52, velocidade: 20,
};
const CATALOGO = {
  cavalo_quarter: { slug: 'cavalo_quarter', nome: 'Cavalo Quarter', criatura_id: 157 },
  pao: { slug: 'pao', nome: 'Pão' },
};
const animal = (extra) => ({ instanceId: 'c1', slug: 'cavalo_quarter', quantidade: 1, ...extra });

describe('as barras do bicho', () => {
  it('frio e calor saem da termorregulação, como na ficha', () => {
    expect(barrasDoAnimal({ termorregulacao: -60 })).toMatchObject({ frio: 60, calor: 0 });
    expect(barrasDoAnimal({ termorregulacao: 40 })).toMatchObject({ frio: 0, calor: 40 });
  });

  it('cada barra abate o atributo que o mapa diz', () => {
    expect(CONDICOES_ANIMAL_ATRIBUTO.vitalidade.atributo).toBe('fisico');
    expect(CONDICOES_ANIMAL_ATRIBUTO.nutricao.atributo).toBe('forca');
    expect(CONDICOES_ANIMAL_ATRIBUTO.hidratacao.atributo).toBe('aura');
    expect(CONDICOES_ANIMAL_ATRIBUTO.animo.atributo).toBe('agilidade');
    expect(CONDICOES_ANIMAL_ATRIBUTO.frio.atributo).toBe('agilidade');
    expect(CONDICOES_ANIMAL_ATRIBUTO.calor.atributo).toBe('fisico');
  });
});

describe('a escala do desconto', () => {
  it('bicho bem não perde nada', () => {
    expect(deltasAtributosDoAnimal({})).toEqual({});
    expect(deltasAtributosDoAnimal({ nutricao: 0 })).toEqual({});
  });

  it('a penalidade só começa na METADE da barra', () => {
    /* Os degraus do sistema são de 25 (COND_DEGRAU, game-data.jsx): 0–24 é o
       degrau 0, 25–49 o 1, 50–74 o 2, 75–99 o 3 e 100 o 4. Com
       `floor(2 × degrau / 4)` a conta dá:
         até 49  → 0   (o bicho está incomodado, não prejudicado)
         50–99   → −1
         100     → −2
       A armadilha é `round` em vez de `floor`: com round, o degrau 1 (25%) já
       custaria o ponto inteiro, e um cavalo levemente com fome ficaria tão
       fraco quanto um faminto. */
    expect(deltasAtributosDoAnimal({ nutricao: 24 })).toEqual({});
    expect(deltasAtributosDoAnimal({ nutricao: 49 })).toEqual({});
    expect(deltasAtributosDoAnimal({ nutricao: 50 })).toEqual({ forca: -1 });
    expect(deltasAtributosDoAnimal({ nutricao: 99 })).toEqual({ forca: -1 });
    expect(deltasAtributosDoAnimal({ nutricao: 100 })).toEqual({ forca: -2 });
  });

  it('o teto é −2 por barra: atributo não é poço', () => {
    const d = deltasAtributosDoAnimal({
      vitalidade: 100, nutricao: 100, hidratacao: 100, animo: 100 });
    Object.values(d).forEach((v) => expect(v).toBeGreaterThanOrEqual(-4));
    expect(d.forca).toBe(-2);
    expect(d.aura).toBe(-2);
  });

  it('duas barras no mesmo atributo SOMAM, como Sono+Frio na VB do PJ', () => {
    // Sono e Frio caem os dois na Agilidade.
    expect(deltasAtributosDoAnimal({ animo: 100, termorregulacao: -100 }))
      .toMatchObject({ agilidade: -4 });
    // Doença e Calor caem os dois no Físico.
    expect(deltasAtributosDoAnimal({ vitalidade: 100, termorregulacao: 100 }))
      .toMatchObject({ fisico: -4 });
  });
});

describe('a criatura abalada', () => {
  it('bicho bem devolve a MESMA referência', () => {
    expect(criaturaAbalada(CAVALO, {})).toBe(CAVALO);
    expect(criaturaAbalada(CAVALO, { nutricao: 10 })).toBe(CAVALO);
  });

  it('o atributo cai, e os DERIVADOS GRAVADOS são refeitos', () => {
    /* É o ponto que mais fácil se perde: a coluna gravada venceria a fórmula
       em vitalidadeDoAnimal, e o teto da barra ficaria no valor do bicho são. */
    const c = criaturaAbalada(CAVALO, { nutricao: 100, hidratacao: 100 });
    expect(c.forca).toBe(3 - 2);
    expect(c.aura).toBe(1 - 2 < 0 ? 0 : 1 - 2);     // piso zero
    // EH = (12 + Aura) × Estágio, com a Aura nova.
    expect(c.energia_heroica).toBe((12 + c.aura) * 4);
    expect(c.energia_heroica).not.toBe(CAVALO.energia_heroica);
    // EF = 2√peso + Físico — o Físico não mudou aqui, então a EF fica.
    expect(c.energia_fisica).toBe(CAVALO.energia_fisica);
  });

  it('o Físico abatido derruba EF e VB juntos', () => {
    const c = criaturaAbalada(CAVALO, { vitalidade: 100 });
    expect(c.fisico).toBe(3 - 2);
    expect(c.energia_fisica).toBeLessThan(CAVALO.energia_fisica);
    expect(c.velocidade).toBe((c.fisico + c.agilidade) * 4);
    expect(c.velocidade).toBeLessThan(CAVALO.velocidade);
  });

  it('atributo não vai a negativo: fraco, não o contrário de forte', () => {
    const fraco = { ...CAVALO, forca: 1, aura: 0 };
    const c = criaturaAbalada(fraco, { nutricao: 100, hidratacao: 100 });
    expect(c.forca).toBe(0);
    expect(c.aura).toBe(0);
  });

  it('guarda o desconto em `_abalado`, para a ficha poder DIZER o porquê', () => {
    // Sem isto, um Força 1 não se distingue de um bicho que sempre teve 1.
    expect(criaturaAbalada(CAVALO, { nutricao: 100 })._abalado).toEqual({ forca: -2 });
  });
});

describe('o relógio e o clima desgastam o bicho', () => {
  const TEMPO_DESERTO = { temperatura: 'calor_extremo', agua: 'desertico' };

  it('o MOTOR é o mesmo do personagem — os números conferem', () => {
    /* A trava que importa: o desgaste do animal não pode ter régua própria.
       `decaimentoPorHoras` é chamado com as mesmas horas e o mesmo tempo. */
    const antes = { nutricao: 0, hidratacao: 0, animo: 0, termorregulacao: 0 };
    const esperado = decaimentoPorHoras(antes, 10, 6, TEMPO_DESERTO, undefined);
    const out = comDesgasteNosAnimais([animal({ condicoes: antes })], 6, 10, TEMPO_DESERTO, CATALOGO);
    expect(out[0].condicoes).toEqual(esperado);
    // E o deserto de fato cobrou fome e sede.
    expect(out[0].condicoes.nutricao).toBeGreaterThan(0);
    expect(out[0].condicoes.hidratacao).toBeGreaterThan(0);
  });

  it('item que não é animal não é desgastado', () => {
    const itens = [animal(), { instanceId: 'p1', slug: 'pao', quantidade: 1 }];
    const out = comDesgasteNosAnimais(itens, 6, 10, TEMPO_DESERTO, CATALOGO);
    expect(out[1]).toBe(itens[1]);              // o pão intacto, mesma referência
    expect(out[0].condicoes.nutricao).toBeGreaterThan(0);
  });

  it('animal pendurado em outro bicho fica de fora', () => {
    const itens = [animal({ instanceId: 'c2', animal_id: 'c1' })];
    expect(comDesgasteNosAnimais(itens, 6, 10, TEMPO_DESERTO, CATALOGO)).toBe(itens);
  });

  it('zero hora não mexe em nada — a MESMA lista', () => {
    const itens = [animal()];
    expect(comDesgasteNosAnimais(itens, 0, 10, TEMPO_DESERTO, CATALOGO)).toBe(itens);
  });

  it('sem animal nenhum, a lista volta intacta', () => {
    const itens = [{ instanceId: 'p1', slug: 'pao', quantidade: 1 }];
    expect(comDesgasteNosAnimais(itens, 6, 10, TEMPO_DESERTO, CATALOGO)).toBe(itens);
  });

  it('o tique de clima também alcança o bicho', () => {
    const out = comTiqueDeClimaNosAnimais(
      [animal({ condicoes: { termorregulacao: 0 } })], 'temperatura', 'frio_extremo', CATALOGO);
    expect(out[0].condicoes.termorregulacao)
      .toBe(tiqueDeClima({ termorregulacao: 0 }, 'temperatura', 'frio_extremo').termorregulacao);
    expect(out[0].condicoes.termorregulacao).toBeLessThan(0);   // frio
  });

  it('tique que não muda nada devolve a MESMA lista', () => {
    // Trilha que o tique ignora (só temperatura cobra): nada a gravar.
    const itens = [animal({ condicoes: {} })];
    expect(comTiqueDeClimaNosAnimais(itens, 'vento', 'tornado', CATALOGO)).toBe(itens);
  });
});

describe('o caminho inteiro: deserto → bicho fraco', () => {
  it('seis horas de calor extremo deixam o cavalo mais lento', () => {
    /* O teste de ponta a ponta das duas metades do pedido: o clima desgasta
       (metade 1) e o desgaste abate os atributos (metade 2). */
    let itens = [animal({ condicoes: { nutricao: 90, hidratacao: 90 } })];
    itens = comDesgasteNosAnimais(itens, 6, 10, { temperatura: 'calor_extremo' }, CATALOGO);
    const c = criaturaAbalada(CAVALO, itens[0].condicoes);
    expect(c.forca).toBeLessThan(CAVALO.forca);
    expect(c.aura).toBeLessThan(CAVALO.aura);
    // O calor também bate no Físico, e o Físico puxa a EF e a VB.
    expect(c.velocidade).toBeLessThanOrEqual(CAVALO.velocidade);
  });
});

/* ── O CAMINHO DA GRAVAÇÃO (achado da varredura de 06/10/2026) ─────────────
   `personagens.inventario` é um jsonb gravado inteiro por três telas
   (Inventário, Ficha e batalha), e por isso toda escrita do cliente passa por
   compare-and-swap em `inventario_versao`
   (01-core/inventario-concorrencia.jsx, 02/10/2026) — é o que impede a flecha
   gasta de "voltar" quando duas telas seguram cópias diferentes.

   A primeira versão do desgaste dos animais gravava o inventário num UPDATE
   DIRETO, junto do `estado_atual`: o Mestre avançava o relógio e apagava o que
   o jogador acabara de mexer na ficha. Era exatamente o bug que aquele módulo
   existe para resolver.

   Este teste lê a FONTE do shell, e não o comportamento, porque o que importa
   é por qual PORTA a escrita passa — e isso um teste de DOM não vê. */
describe('o desgaste grava o inventário pela porta certa', () => {
  it('usa alterarInventario, e não um update direto de `inventario`', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const shell = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '..', '10-shell', 'shell.jsx'), 'utf8');

    // As duas funções que cobram o bicho passam pelo compare-and-swap.
    expect(shell).toMatch(/desgastarAnimaisDoPj[\s\S]{0,600}window\.alterarInventario/);
    expect(shell).toMatch(/tiqueNosAnimaisDoPj[\s\S]{0,600}window\.alterarInventario/);

    /* E NENHUM update de personagens leva `inventario` no payload: o único
       escritor legítimo do jsonb é o módulo de concorrência. */
    const updatesComInventario = shell.match(
      /update\(\s*\{[^}]*\binventario\b[^}]*\}\s*\)/g) || [];
    expect(updatesComInventario,
      'update direto de `inventario` no shell — use alterarInventario:\n'
      + updatesComInventario.join('\n')).toEqual([]);
  });
});
