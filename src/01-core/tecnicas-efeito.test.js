/* ============================================================
   tecnicas-efeito.test.js — o registro contra o texto do banco
   ============================================================
   O campo `efeito` da tabela `tecnicas` é a fonte human-readable
   exibida na UI; TECNICA_EFEITO_MAP é a mecânica. Os dois PRECISAM
   dizer o mesmo número de rodadas, senão a tela promete uma coisa e
   o motor faz outra. Este arquivo trava esse acordo.

   As frases abaixo são cópias literais do banco em 09/09/2026.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './tecnicas-efeito.jsx';

let MAP, tecnicaEfeitoDe;
beforeAll(() => {
  MAP = window.TECNICA_EFEITO_MAP;
  tecnicaEfeitoDe = window.tecnicaEfeitoDe;
  expect(MAP).toBeDefined();
  expect(tecnicaEfeitoDe).toBeTypeOf('function');
});

// Cópia literal do campo `efeito` das 24 técnicas da Fase 1.
const EFEITO_NO_BANCO = {
  ajustar_disparo:     'Seu total de Ajustar Disparo é adicionado à sua coluna de ataque por 2 rodadas.',
  animosidade:         'Seu total de Animosidade é adicionado à sua energia heroica por 2 rodadas.',
  atirar_em_movimento: 'Seu total de Atirar em Movimento é adicionado à sua velocidade por 2 rodadas.',
  centaurizar:         'Seu total de Centaurizar é adiciona à coluna de ataque e a velocidade por 2 rodadas.',
  defletir_ataque:     'Seu total de Defletir Ataque é adicionado à sua defesa por 3 rodadas.',
  disparo_rapido:      'Seu total de Disparo Rápido é adicionado à sua velocidade por 5 rodadas.',
  expectativa:         'Seu total de Expectativa é subtraído da velocidade de seu adversário por 3 rodadas.',
  explorar_fraqueza:   'Seu total de Explorar Fraqueza é adicionado à sua coluna de ataque e ignora a armadura do adversário.',
  furia:               'Seu total de Fúria é adicionado à sua coluna de ataque, a sua energia heroica, a sua resistência física e a sua resistência mágica por 5 rodadas.',
  heroismo:            'Seu total de Heroísmo é adicionado à sua energia heroica por 5 rodadas.',
  imprevisibilidade:   'Seu total de Imprevisilibidade é adicionado à sua defesa por 3 rodadas.',
  mira:                'Seu total de Mira é adicionado à sua coluna de ataque por 1 rodada.',
  posicionamento:      'Seu total de Posicionamento é subtraído do dano máximo do adversário por 3 rodadas.',
  postura_defensiva:   'Seu total de Postura Defensiva é adicionado à sua defesa, e subtraído da sua coluna de ataque por 3 rodadas.',
  postura_ofensiva:    'Seu total de Postura Ofensiva é adicionado à sua coluna de ataque, e subtraído da sua defesa por 3 rodadas.',
  pressionar_oponente: 'Seu total de Pressionar Oponente é subtraído da defesa de 1 alvo por 3 rodadas.',
  pugilato:            'Seu total de Pugilato é adicionado ao seu grupo de armas CD por 1 rodada.',
  resguardar:          'Seu total de Resguardar é subtraído da coluna de ataque do adversário por 2 rodadas.',
  resistencia_a_dor:   'Seu total de Resistência à Dor é adicionado à sua resistência física por 5 rodadas.',
  resistencia_extrema: 'Seu total de Resistência Extrema é adicionado à sua resistência mágica por 5 rodadas.',
  ricochetear:         'Seu total de Ricochetear é adicionado à sua coluna de ataque por 1 rodada.',
  sangramento:         'Um teste de Sangramento (Difícil) causa 1 de dano na energia física em 1 alvo por 5 rodadas.',
  segundo_folego:      'Seu total de Segundo Fôlego é adicionado à sua energia heroica por 10 rodadas.',
  voz_de_comando:      'Seu total de Voz de Comando é adicionado à iniciativa de 4 alvos por 10 rodadas.',
};

const TIPOS_VALIDOS = [
  // Fase 1
  'mod_ataque', 'mod_defesa', 'mod_vb', 'mod_eh_temp',
  'mod_rf', 'mod_rm', 'mod_dano_max', 'dano_por_rodada',
  // Fase 2 — reescrevem a resolução do golpe
  'ignora_eh', 'ignora_armadura', 'dano_pct', 'dano_recebido_pct',
  'ataque_extra', 'alvos_extras', 'sem_atacar', 'sem_tecnicas',
  'sem_critico', 'derrubado', 'evita_golpe', 'usa_defesa_de',
  // Fase 3 (12/09/2026) — a varredura das oito que estavam fora do motor.
  'mantem_concentracao', 'mod_habilidade', 'dano_equipamento',
];
// Os que multiplicam o total da técnica (totalTecnica × sinal). O resto é
// valor fixo (dano_pct 25) ou flag liga/desliga (ignora_eh true).
const TIPOS_ESCALAM_COM_TOTAL = [
  'mod_ataque', 'mod_defesa', 'mod_vb', 'mod_eh_temp',
  'mod_rf', 'mod_rm', 'mod_dano_max',
  // Fase 3: Remover Debilitacao soma o PROPRIO TOTAL a uma habilidade
  // nomeada, entao escala como os de cima — so que o destino nao e um stat
  // de combate, e sim a habilidade Escapar.
  'mod_habilidade',
];
const DIFICULDADES_VALIDAS = ['facil', 'medio', 'dificil', 'muito_dificil', 'absurdo'];

describe('TECNICA_EFEITO_MAP', () => {
  // Era igualdade exata com as 24 da Fase 1. Virou contenção quando a Fase 2
  // acrescentou 26: este arquivo continua sendo o dono das 24 originais, e
  // tecnica-fase2.test.js é o dono das outras. O total fica travado aqui pra
  // uma entrada não sumir sem ninguém notar.
  it('mantém as 24 técnicas da Fase 1 e o total do sistema é 55', () => {
    for (const key of Object.keys(EFEITO_NO_BANCO)) {
      expect(MAP[key], `${key} da Fase 1 sumiu do registro`).toBeDefined();
    }
    // +1 em 12/09/2026: Combate Montado, quando a montaria virou mecanica.
    expect(Object.keys(MAP).length, '24 + 26 + 4 + Combate Montado').toBe(55);
  });

  it('toda entrada tem modo, alvo, rodadas, ícone e ao menos um efeito', () => {
    for (const [key, e] of Object.entries(MAP)) {
      expect(['total', 'teste'], key).toContain(e.modo);
      expect(['self', 'inimigo', 'aliados'], key).toContain(e.alvo);
      expect(Number.isInteger(e.rodadas) && e.rodadas > 0, key).toBe(true);
      expect(typeof e.icone === 'string' && e.icone.length > 0, key).toBe(true);
      expect(Array.isArray(e.efeitos) && e.efeitos.length > 0, key).toBe(true);
    }
  });

  it('todo efeito usa um tipo conhecido e traz sinal (modo total) ou valor (modo teste)', () => {
    for (const [key, e] of Object.entries(MAP)) {
      for (const ef of e.efeitos) {
        expect(TIPOS_VALIDOS, `${key}/${ef.tipo}`).toContain(ef.tipo);
        // O que determina a forma do efeito é o TIPO dele, não o modo da
        // técnica. Explorar Fraqueza é `modo: 'total'` e tem os dois: um
        // mod_ataque que escala com o total, e um ignora_armadura que é
        // liga/desliga. Antes este teste exigia `sinal` em todo efeito de
        // modo total, e quebrou quando a Fase 2 completou aquela técnica.
        /* Efeito cujo valor vem do ESTADO, nao do registro nem do total:
           Combate Montado le 50% da EH da montaria. Nao tem sinal nem valor
           fixo, e esta certo — quem calcula e aplicarEfeitoTecnica. */
        if (ef.do_montaria_pct != null) {
          expect(ef.do_montaria_pct, key + ' precisa de percentual').toBeGreaterThan(0);
        } else if (TIPOS_ESCALAM_COM_TOTAL.includes(ef.tipo)) {
          expect([1, -1], `${key}/${ef.tipo} escala e precisa de sinal`).toContain(ef.sinal);
        } else {
          expect(Number.isFinite(ef.valor) || ef.valor === true,
            `${key}/${ef.tipo} é valor fixo ou flag`).toBe(true);
        }
      }
    }
  });

  it('modo teste sempre traz uma dificuldade válida', () => {
    for (const [key, e] of Object.entries(MAP)) {
      if (e.modo !== 'teste') continue;
      expect(DIFICULDADES_VALIDAS, key).toContain(e.dificuldade);
    }
  });

  // O teste que realmente importa: mecânica e texto exibido não podem divergir.
  it('a duração do registro bate com o número de rodadas escrito no banco', () => {
    for (const [key, texto] of Object.entries(EFEITO_NO_BANCO)) {
      const m = texto.match(/(\d+)\s*rodadas?/i);
      if (!m) continue;   // Explorar Fraqueza não declara duração — ver abaixo
      expect(MAP[key].rodadas, `${key}: "${texto}"`).toBe(Number(m[1]));
    }
  });

  // Explorar Fraqueza é a única sem duração no texto. Fica 1 rodada por
  // decisão, e o teste trava isso pra não virar 3 sem ninguém perceber.
  it('Explorar Fraqueza, sem duração no texto, vale 1 rodada', () => {
    expect(EFEITO_NO_BANCO.explorar_fraqueza).not.toMatch(/rodadas?/i);
    expect(MAP.explorar_fraqueza.rodadas).toBe(1);
  });

  it('as técnicas de dois destinos criam os dois (ou quatro) efeitos', () => {
    expect(MAP.centaurizar.efeitos.map((e) => e.tipo).sort())
      .toEqual(['mod_ataque', 'mod_vb']);
    expect(MAP.furia.efeitos.map((e) => e.tipo).sort())
      .toEqual(['mod_ataque', 'mod_eh_temp', 'mod_rf', 'mod_rm'].sort());
  });

  it('as posturas somam num stat e subtraem no outro', () => {
    const def = MAP.postura_defensiva.efeitos;
    expect(def.find((e) => e.tipo === 'mod_defesa').sinal).toBe(1);
    expect(def.find((e) => e.tipo === 'mod_ataque').sinal).toBe(-1);
    const ofe = MAP.postura_ofensiva.efeitos;
    expect(ofe.find((e) => e.tipo === 'mod_ataque').sinal).toBe(1);
    expect(ofe.find((e) => e.tipo === 'mod_defesa').sinal).toBe(-1);
  });

  it('os debuffs de adversário são negativos e miram inimigo', () => {
    for (const key of ['expectativa', 'resguardar', 'pressionar_oponente', 'posicionamento']) {
      expect(MAP[key].alvo, key).toBe('inimigo');
      expect(MAP[key].efeitos.every((e) => e.sinal === -1), key).toBe(true);
    }
  });

  // A restrição de arma vem do banco (tecnicas.grupo_armas), não do registro —
  // este teste trava que ninguém voltou a hardcodar por técnica.
  it('nenhuma entrada declara restrição de arma no registro', () => {
    for (const [key, e] of Object.entries(MAP)) {
      expect(e.grupo, `${key} não deve declarar grupo — usa tecnicas.grupo_armas`).toBeUndefined();
    }
  });

  it('Voz de Comando atinge até 4 aliados', () => {
    expect(MAP.voz_de_comando.alvo).toBe('aliados');
    expect(MAP.voz_de_comando.maxAlvos).toBe(4);
  });
});

describe('tecnicaEfeitoDe', () => {
  it('devolve a entrada da técnica mapeada', () => {
    expect(tecnicaEfeitoDe('mira').efeitos[0].tipo).toBe('mod_ataque');
  });

  // Fallback é o comportamento narrativo de hoje, não erro: as 34 técnicas
  // de Fase 2 e as 4 puramente narrativas continuam só no log.
  it('devolve null para técnica sem entrada, sem lançar', () => {
    // Concentracao ENTROU no motor na Fase 3; o exemplo de fora virou Provocar,
    // que precisa de alvo obrigatorio — sistema que o combate nao tem.
    expect(tecnicaEfeitoDe('provocar'), 'narrativa por falta de sistema').toBeNull();
    expect(tecnicaEfeitoDe('nao_existe')).toBeNull();
    expect(tecnicaEfeitoDe(null)).toBeNull();
    expect(tecnicaEfeitoDe(undefined)).toBeNull();
  });
});
