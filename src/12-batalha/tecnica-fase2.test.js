/* ============================================================
   tecnica-fase2.test.js — as 26 entradas da Fase 2 no registro
   ============================================================
   Mesma disciplina do teste da Fase 1: o texto do banco é a fonte
   human-readable, o registro é a mecânica, e este arquivo trava o acordo
   entre os dois — em especial a duração e a dificuldade.

   Dados lidos do banco em 10/09/2026.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/tecnicas-efeito.jsx';

let MAP;
beforeAll(() => { MAP = window.TECNICA_EFEITO_MAP; expect(MAP).toBeDefined(); });

// key | dificuldade | rodadas — cópia do banco.
const FASE2 = {
  ambidestria:         ['medio', 1],  aparar:            ['muito_dificil', 1],
  aprimorar:           ['muito_dificil', 3], ataque_oportuno: ['medio', 1],
  atravessar_oponente: ['medio', 1],  brutalizar:        ['dificil', 1],
  carga:               ['dificil', 1], carga_de_arremesso: ['medio', 1],
  carga_montada:       ['medio', 2],  combate_com_escudo: ['medio', 2],
  combate_nao_letal:   ['medio', 2],  contra_ataque:     ['dificil', 1],
  dano_agravado:       ['muito_dificil', 1], desequilibrar: ['muito_dificil', 1],
  desviar:             ['muito_dificil', 3], disparo_certeiro: ['medio', 3],
  escolta:             ['medio', 3],  esquiva:           ['muito_dificil', 1],
  flechadas_multiplas: ['muito_dificil', 1], forca_interior: ['medio', 2],
  golpe_duplo:         ['muito_dificil', 1], golpe_giratorio: ['dificil', 1],
  golpe_letal:         ['muito_dificil', 1], inibir_ataque: ['dificil', 1],
  intimidar:           ['muito_dificil', 1], leitura_de_batalha: ['medio', 2],
};

const TIPOS_FASE2 = ['ignora_eh','ignora_armadura','dano_pct','dano_recebido_pct',
  'ataque_extra','alvos_extras','sem_atacar','sem_tecnicas','sem_critico',
  'derrubado','evita_golpe','usa_defesa_de'];

describe('as 26 entradas', () => {
  it('todas existem no registro', () => {
    for (const key of Object.keys(FASE2)) {
      expect(MAP[key], `${key} faltando`).toBeDefined();
    }
  });

  it('todas são modo teste, com a dificuldade do banco', () => {
    for (const [key, [dif]] of Object.entries(FASE2)) {
      expect(MAP[key].modo, key).toBe('teste');
      expect(MAP[key].dificuldade, key).toBe(dif);
    }
  });

  it('a duração bate com o número de rodadas do banco', () => {
    for (const [key, [, rodadas]] of Object.entries(FASE2)) {
      expect(MAP[key].rodadas, key).toBe(rodadas);
    }
  });

  it('todo efeito usa um tipo da Fase 2 e traz valor fixo', () => {
    for (const key of Object.keys(FASE2)) {
      for (const ef of MAP[key].efeitos) {
        expect(TIPOS_FASE2, `${key}/${ef.tipo}`).toContain(ef.tipo);
        expect(Number.isFinite(ef.valor) || ef.valor === true, `${key}/${ef.tipo}`).toBe(true);
      }
    }
  });
});

describe('as primitivas caíram nas técnicas certas', () => {
  const tipos = (k) => MAP[k].efeitos.map((e) => e.tipo).sort();

  it('as 6 de ignora_eh', () => {
    for (const k of ['ataque_oportuno','atravessar_oponente','carga','carga_de_arremesso','carga_montada','golpe_letal']) {
      expect(tipos(k), k).toContain('ignora_eh');
    }
  });

  it('os percentuais de dano causado', () => {
    expect(MAP.brutalizar.efeitos.find((e) => e.tipo === 'dano_pct').valor).toBe(50);
    for (const k of ['ambidestria','aprimorar','dano_agravado','forca_interior']) {
      expect(MAP[k].efeitos.find((e) => e.tipo === 'dano_pct').valor, k).toBe(25);
    }
  });

  it('os percentuais de dano recebido são NEGATIVOS', () => {
    expect(MAP.aparar.efeitos.find((e) => e.tipo === 'dano_recebido_pct').valor).toBe(-75);
    expect(MAP.desviar.efeitos.find((e) => e.tipo === 'dano_recebido_pct').valor).toBe(-50);
    expect(MAP.combate_com_escudo.efeitos.find((e) => e.tipo === 'dano_recebido_pct').valor).toBe(-25);
  });

  it('as 3 de ataque extra', () => {
    for (const k of ['contra_ataque','golpe_duplo','flechadas_multiplas']) {
      expect(tipos(k), k).toContain('ataque_extra');
    }
  });

  it('Golpe Giratório tem os DOIS: +25% e até 3 alvos', () => {
    expect(tipos('golpe_giratorio')).toEqual(['alvos_extras','dano_pct']);
    expect(MAP.golpe_giratorio.efeitos.find((e) => e.tipo === 'alvos_extras').valor).toBe(3);
  });

  it('as que atuam no alvo miram inimigo', () => {
    for (const k of ['ataque_oportuno','golpe_letal','inibir_ataque','intimidar','leitura_de_batalha','desequilibrar']) {
      expect(MAP[k].alvo, k).toBe('inimigo');
    }
  });

  it('as defensivas e as de auto-buff miram self', () => {
    for (const k of ['aparar','desviar','combate_com_escudo','esquiva','combate_nao_letal','ambidestria','aprimorar','brutalizar']) {
      expect(MAP[k].alvo, k).toBe('self');
    }
  });

  it('Escolta mira aliado e carrega usa_defesa_de', () => {
    expect(MAP.escolta.alvo).toBe('aliados');
    expect(tipos('escolta')).toContain('usa_defesa_de');
  });

  it('Esquiva é consumida por evento, não só por tempo', () => {
    expect(MAP.esquiva.consome_em).toBe('golpe_recebido');
  });
});

describe('o total do sistema', () => {
  it('o registro passa a cobrir 50 das 58 técnicas', () => {
    expect(Object.keys(MAP).length).toBe(50);
  });
});
