/* ============================================================
   tecnica-criatura.test.js — criatura usa técnica de combate
   ============================================================
   "O Haalin tem várias técnicas de combate, mas na batalha o menu técnica
    está desativado." (usuário, 13/09/2026)

   tecnicasDoAtor abria com `ator.tipo !== 'pj' → []`: a criatura nunca tinha
   técnica na batalha, e a aba Técnica nascia desativada. O resto do caminho
   (aplicar teste, efeito, custo de ação) já não distinguia PJ de criatura —
   a lista era a única trava. Mesmo desenho das magias de criatura (12/09/2026).

   CRIATURA — `criaturas.tecnicas_especiais` é TEXTO com nomes separados por
   vírgula, às vezes com um número colado ("Esquiva 7"). Regra do usuário
   (13/09/2026): "O nível das habilidades, técnicas e magias é com base no
   nível e atributos da criatura. No caso das técnicas e habilidades o total
   leva em consideração o atributo de ajuste."
     • nível = ESTÁGIO da criatura, sempre (o número colado não conta);
     • total = nível + atributo de ajuste (totalTecnica / totalHabilidade).
   Vale igual para as HABILIDADES da criatura (habilidadesDoAtor).
   Nome sem par no catálogo ("Bote") some da lista mecânica e continua no
   texto do card, como a magia que não casa.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/magias-efeito.jsx';
import '../01-core/tecnicas-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; expect(M.tecnicasDoAtor).toBeTypeOf('function'); });

// Técnicas e Haalin com os valores do banco (13/09/2026).
const TECNICAS = {
  ataque_oportuno: { key: 'ataque_oportuno', nome: 'Ataque Oportuno', uso: 'Intermitente', ajuste: 'percepcao', grupo_armas: 'Livre', grupo_armaduras: 'Livre', efeito: 'Ignora a energia heroica.' },
  voz_de_comando:  { key: 'voz_de_comando',  nome: 'Voz de Comando',  uso: 'Único',        ajuste: 'percepcao', grupo_armas: 'Livre', grupo_armaduras: 'Livre' },
  furia:           { key: 'furia',           nome: 'Fúria',           uso: 'Único',        ajuste: 'percepcao', grupo_armas: 'Livre', grupo_armaduras: 'Livre' },
  esquiva:         { key: 'esquiva',         nome: 'Esquiva',         uso: 'Intermitente', ajuste: 'agilidade', grupo_armas: 'Livre', grupo_armaduras: 'L, M' },
};
const CAT = {
  pjById: {},
  tecnicasByKey: TECNICAS,
  catalogoBySlug: {},
  criById: {
    242: { id: 242, nome: 'Haalin', estagio: 7, percepcao: 4, agilidade: 5, tecnicas_especiais: 'Ataque Oportuno, Voz de Comando, Fúria' },
    300: { id: 300, nome: 'Tigre', estagio: 3, agilidade: 2, percepcao: 1, tecnicas_especiais: 'Esquiva 7, Bote,  fúria ' },
    301: { id: 301, nome: 'Lobo', estagio: 2, tecnicas_especiais: null },
  },
};
const cri = (id) => ({ tipo: 'criatura', ref_id: id, inst_id: 'criatura:' + id, nome: 'X' });

describe('tecnicasDoAtor — criatura', () => {
  it('Haalin: as três técnicas do catálogo aparecem', () => {
    expect(M.tecnicasDoAtor(cri(242), CAT).map((t) => t.key)).toEqual(['ataque_oportuno', 'voz_de_comando', 'furia']);
  });

  it('o nível é o estágio; total = nível + atributo de ajuste', () => {
    const furia = M.tecnicasDoAtor(cri(242), CAT).find((t) => t.key === 'furia');
    expect(furia).toMatchObject({ fonte: 'tecnica', nome: 'Fúria', nivel: 7, total: 7 + 4, uso: 'Único' });
  });

  it('número colado no nome ("Esquiva 7") não muda o nível: vale o estágio', () => {
    const esquiva = M.tecnicasDoAtor(cri(300), CAT).find((t) => t.key === 'esquiva');
    expect(esquiva).toMatchObject({ nivel: 3, total: 3 + 2, grupo_armaduras: 'L, M' });
  });

  it('nome fora do catálogo ("Bote") some; caixa e espaços não atrapalham', () => {
    expect(M.tecnicasDoAtor(cri(300), CAT).map((t) => t.key)).toEqual(['esquiva', 'furia']);
  });

  it('criatura sem técnica, ou fora do criById, devolve lista vazia', () => {
    expect(M.tecnicasDoAtor(cri(301), CAT)).toEqual([]);
    expect(M.tecnicasDoAtor(cri(999), CAT)).toEqual([]);
  });

  it('Tigre: esquiva no estágio, e o total muda com o atributo de ajuste de cada técnica', () => {
    const [esquiva, furia] = M.tecnicasDoAtor(cri(300), CAT);
    expect(esquiva.total).toBe(3 + 2);   // agilidade
    expect(furia.total).toBe(3 + 1);     // percepção
  });

  it('a técnica da criatura passa pela mesma regra de equipamento (Esquiva só L/M)', () => {
    const esquiva = M.tecnicasDoAtor(cri(300), CAT).find((t) => t.key === 'esquiva');
    expect(M.tecnicaPermitida(esquiva, { ...cri(300), defesa_sigla: 'M' }, null, CAT).pode).toBe(true);
    expect(M.tecnicaPermitida(esquiva, { ...cri(300), defesa_sigla: 'P' }, null, CAT)).toEqual({ pode: false, motivo: 'armadura' });
  });
});

describe('habilidadesDeCriatura — mesma regra das técnicas', () => {
  const HABS = {
    sentidos:  { key: 'sentidos',  nome: 'Sentidos',  grupo: 'Geral',        ajuste: 'percepcao', descricao: 'Perceber.' },
    rastrear:  { key: 'rastrear',  nome: 'Rastrear',  grupo: 'Profissional', ajuste: 'percepcao' },
    correr:    { key: 'correr',    nome: 'Correr',    grupo: 'Manobra',      ajuste: 'agilidade' },
  };
  const CAT_H = {
    ...CAT, habilidadesByKey: HABS,
    criById: {
      242: { id: 242, nome: 'Haalin', estagio: 7, percepcao: 4, agilidade: 5, habilidades: 'Sentidos, Rastrear' },
      300: { id: 300, nome: 'Lobo', estagio: 2, agilidade: 3, percepcao: 1, habilidades: 'correr, Carga, Sentidos' },
      301: { id: 301, nome: 'Pedra', estagio: 1, habilidades: null },
    },
  };

  it('Haalin: Sentidos e Rastrear com total = estágio 7 + percepção 4', () => {
    const lista = M.habilidadesDeCriatura(cri(242), CAT_H);
    expect(lista.map((h) => [h.key, h.total])).toEqual([['rastrear', 11], ['sentidos', 11]]);
    expect(lista.find((h) => h.key === 'sentidos')).toMatchObject({ nome: 'Sentidos', grupo: 'Geral', qtd: 7, descricao: 'Perceber.' });
  });

  it('atributo de ajuste de cada habilidade; "Carga" (fora do catálogo) some; ordem alfabética', () => {
    expect(M.habilidadesDeCriatura(cri(300), CAT_H).map((h) => [h.nome, h.total]))
      .toEqual([['Correr', 2 + 3], ['Sentidos', 2 + 1]]);
  });

  it('sem habilidade, ou criatura desconhecida: lista vazia', () => {
    expect(M.habilidadesDeCriatura(cri(301), CAT_H)).toEqual([]);
    expect(M.habilidadesDeCriatura(cri(999), CAT_H)).toEqual([]);
  });
});
