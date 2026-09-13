/* ============================================================
   magia-dificuldade.test.js — "Reduza N níveis de dificuldade da habilidade X"
   ============================================================
   Varredura das magias que nenhum personagem conhecia (12/09/2026). Pedido do
   usuário: "vamos fazer agora das demais magias, a verificação deve ser para
   mecanizar o efeito em batalha e fora de batalha".

   A forma mais comum do catálogo fora de dano e cura é mexer na DIFICULDADE
   de um teste de habilidade — e o motor não sabia fazer isso. Esta suíte trava
   a primitiva nova nas duas pontas:

     • a leitura (quantos degraus, em QUAL habilidade ou grupo);
     • a aplicação — na batalha (status_temp) e na ficha (magias ativas),
       pela MESMA conta, para o mesmo Faro não valer um degrau num lugar e
       dois no outro.

   Os textos são cópias literais do banco.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './copy.jsx';
import './constants.jsx';
import './helpers.jsx';
import './inventario-helpers.jsx';
import './game-data.jsx';
import './tecnicas-efeito.jsx';
import './magias-efeito.jsx';
import '../12-batalha/batalha.jsx';
import '../12-batalha/tabuleiro.jsx';

let W, M;
beforeAll(() => {
  W = window;
  M = window.MotorBatalha;
  expect(W.habilidadesDaDificuldade).toBeTypeOf('function');
  expect(M.somaDificuldadeDoStatus).toBeTypeOf('function');
});

/* Os nomes CAMUFLAGEM e FARO ficaram: são os dois papéis que a suíte exercita
   (a de duração e a "para o próximo teste"). As magias em si foram fundidas em
   12/09/2026 — Camuflagem em Sombra, Faro em Conhecimento Natural — e as
   fixtures usam as finais com o texto de habilidade nomeada de antes, que o
   leitor continua tendo de entender. */
const CAMUFLAGEM = {
  key: 'sombra', nome: 'Sombra', duracao: '1 hora', evocacao: 'Instantânea',
  nivel_1: 'Reduz 1 nível de dificuldade da habilidade Furtividade.',
  nivel_3: 'Reduz 2 níveis de dificuldade da habilidade Furtividade.',
  nivel_5: 'Reduz 3 níveis de dificuldade da habilidade Furtividade.',
};
const FARO = {
  key: 'graca_felina', nome: 'Graça Felina', duracao: 'Instantânea', evocacao: 'Instantânea',
  nivel_1: 'Reduza 1 nível de dificuldade da habilidade Rastrear e Sentidos.',
  nivel_3: 'Reduza 2 níveis de dificuldade da habilidade Rastrear e Sentidos.',
};
const CONHECIMENTO = {
  key: 'conhecimento', nome: 'Conhecimento', duracao: '1 hora', evocacao: '2 rodadas',
  nivel_1: 'Reduza 1 nível de dificuldade de habilidades do grupo Profissional.',
};

describe('a leitura', () => {
  it('o número de degraus é a unidade `dificuldade`', () => {
    expect(W.efeitosNoNivel(CAMUFLAGEM, 3).dificuldade).toBe(2);
  });

  it('por extenso NÃO é lido — a regra do catálogo é dígito', () => {
    // Alucinação escreve "Aumenta um nível"; fica de fora até virar "1 nível".
    expect(W.efeitosNoNivel({ nivel_1: 'Aumenta um nível de dificuldade da habilidade Sentidos.' }, 1)
      .dificuldade).toBeUndefined();
  });

  it('não confunde com "níveis da magia" (Oferenda)', () => {
    const r = W.efeitosNoNivel({ nivel_1: 'Aumenta 2 níveis da magia e reduz 1 de energia física.' }, 1);
    expect(r.nivel_magia).toBe(2);
    expect(r.dificuldade).toBeUndefined();
  });

  it('"níveis das magias evocadas" também é nível de magia (Dueto Mágico)', () => {
    expect(W.efeitosNoNivel({ nivel_1: 'Aumenta 2 níveis das magias evocadas.' }, 1).nivel_magia).toBe(2);
  });

  it('"de atributo" é lido como "no atributo" (Força Sagrada)', () => {
    expect(W.efeitosNoNivel({ nivel_1: 'Aumente 2 de atributo força.' }, 1).atr_forca).toBe(2);
  });
});

describe('QUAIS habilidades — habilidadesDaDificuldade', () => {
  const h = (txt) => W.habilidadesDaDificuldade({ nivel_1: txt }, 1);

  it('uma habilidade', () => {
    expect(h('Reduz 1 nível de dificuldade da habilidade Furtividade.'))
      .toEqual({ habilidades: ['Furtividade'], grupos: [] });
  });

  it('lista com vírgula e "e" (Deslocamento Natural)', () => {
    expect(h('Reduza 1 nível de dificuldade da habilidade Equilibrar, Nadar e Escalar.').habilidades)
      .toEqual(['Equilibrar', 'Nadar', 'Escalar']);
  });

  it('"ou" vale para as duas (Malabarismo)', () => {
    expect(h('Reduza 1 nível de dificuldade da habilidade Equilibrar ou Prestidigitação.').habilidades)
      .toEqual(['Equilibrar', 'Prestidigitação']);
  });

  it('"em X" (Habilidade Animal)', () => {
    expect(h('Assimila a habilidade de um lobo: Reduza 1 nível de dificuldade em Rastrear.').habilidades)
      .toEqual(['Rastrear']);
  });

  it('"na habilidade" (Empatia)', () => {
    expect(h('Reduza 1 nível de dificuldade na habilidade Empatia.').habilidades).toEqual(['Empatia']);
  });

  it('grupo, nas duas grafias do catálogo', () => {
    expect(h('Reduza 1 nível de dificuldade de habilidades do grupo Profissional.'))
      .toEqual({ habilidades: [], grupos: ['Profissional'] });
    expect(h('Reduz um nível de dificuldade do grupo de habilidades Influência.'))
      .toEqual({ habilidades: [], grupos: ['Influência'] });
  });

  it('"das habilidades", sem dizer quais, devolve null (Aprimorar Habilidades)', () => {
    expect(h('Reduz 1 nível de dificuldade das habilidades.')).toBeNull();
  });
});

describe('a escala — deslocarDificuldade', () => {
  it('reduz degraus', () => {
    expect(W.deslocarDificuldade('dificil', -1)).toBe('medio');
    expect(W.deslocarDificuldade('absurdo', -3)).toBe('medio');
  });
  it('não passa de Fácil nem de Absurdo', () => {
    expect(W.deslocarDificuldade('medio', -3)).toBe('facil');
    expect(W.deslocarDificuldade('muito_dificil', 5)).toBe('absurdo');
  });
  it('zero ou dificuldade desconhecida não mexe', () => {
    expect(W.deslocarDificuldade('medio', 0)).toBe('medio');
    expect(W.deslocarDificuldade('xyz', -1)).toBe('xyz');
  });
});

describe('em QUAL teste vale — passosDeDificuldade', () => {
  const ef = (over) => ({ tipo: 'mod_dificuldade', valor: -1, habilidades: [], grupos: [], ...over });

  it('casa pelo nome, sem acento e sem caixa', () => {
    expect(W.passosDeDificuldade([ef({ habilidades: ['Alfabetização'] })],
      { nome: 'alfabetizacao', grupo: 'Conhecimento' })).toBe(-1);
  });

  it('tolera o plural: "Idiomas" no texto, "Idioma" no catálogo', () => {
    expect(W.passosDeDificuldade([ef({ habilidades: ['Idiomas'] })], { nome: 'Idioma' })).toBe(-1);
  });

  it('casa pelo GRUPO da habilidade', () => {
    expect(W.passosDeDificuldade([ef({ grupos: ['Profissional'] })],
      { nome: 'Metalurgia', grupo: 'Profissional' })).toBe(-1);
  });

  it('não vale em habilidade de fora', () => {
    expect(W.passosDeDificuldade([ef({ habilidades: ['Rastrear'] })], { nome: 'Negociar' })).toBe(0);
  });

  it('soma magias diferentes', () => {
    expect(W.passosDeDificuldade([ef({ habilidades: ['Rastrear'] }), ef({ valor: -2, habilidades: ['Rastrear'] })],
      { nome: 'Rastrear' })).toBe(-3);
  });
});

describe('fora de combate — a ficha', () => {
  const DATA = { dia: 10, mes: 3, ano: 1200 };

  it('magia de duração (Camuflagem, 12 horas) vira ativa com data', () => {
    const a = W.magiaAtivaDaEvocacao(CAMUFLAGEM, 1, DATA);
    expect(a).toMatchObject({ key: 'sombra', nivel: 1 });
    expect(a.vence_em).toBeTruthy();
    expect(a.consome_em).toBeUndefined();
  });

  it('magia "para o próximo teste" (Faro, instantânea) vira ativa SEM data e com consumo', () => {
    const a = W.magiaAtivaDaEvocacao(FARO, 1, DATA);
    expect(a).toEqual({ key: 'graca_felina', nome: 'Graça Felina', nivel: 1, consome_em: 'teste_habilidade' });
    // e sem data ela continua vigente — não há vencimento para comparar
    expect(W.magiasAtivasVigentes([a], DATA)).toHaveLength(1);
  });

  it('Faro aplica fora de combate: não é mais "duradoura"', () => {
    expect(W.motivoNaoAplicaNaFicha(FARO, 1)).toBeNull();
  });

  it('as ativas somam degraus na habilidade testada', () => {
    const porKey = { sombra: CAMUFLAGEM, graca_felina: FARO };
    const ativas = [{ key: 'sombra', nivel: 3 }, { key: 'graca_felina', nivel: 1, consome_em: 'teste_habilidade' }];
    expect(W.passosDasMagiasAtivas(ativas, { nome: 'Furtividade' }, porKey)).toBe(-2);
    expect(W.passosDasMagiasAtivas(ativas, { nome: 'Rastrear' }, porKey)).toBe(-1);
  });

  it('o teste consome só a magia que valia NELE', () => {
    const porKey = { sombra: CAMUFLAGEM, graca_felina: FARO };
    const ativas = [{ key: 'sombra', nivel: 3 }, { key: 'graca_felina', nivel: 1, consome_em: 'teste_habilidade' }];
    // Negociar não mexe em nada
    expect(W.consumirMagiasDoTeste(ativas, { nome: 'Negociar' }, porKey)).toHaveLength(2);
    // Sentidos queima o Faro; Camuflagem (com data) fica
    expect(W.consumirMagiasDoTeste(ativas, { nome: 'Sentidos' }, porKey).map((a) => a.key))
      .toEqual(['sombra']);
  });

  it('aplicarMagiaNoEstado: efeitos, extras e a ativa, numa porta só', () => {
    const maximos = { ef: 20, eh: 10, ka: 10 };
    const estado = { vitalidade: { ka: 5 } };
    const novo = W.aplicarMagiaNoEstado(estado, FARO, 1, maximos, DATA,
      [{ scope: 'vitalidade', key: 'ka', delta: -1 }]);
    expect(novo.vitalidade.ka).toBe(4);
    expect(novo.magias_ativas).toEqual([W.magiaAtivaDaEvocacao(FARO, 1, DATA)]);
  });

  it('relançar RENOVA em vez de empilhar', () => {
    const maximos = { ef: 20, eh: 10, ka: 10 };
    const uma = W.aplicarMagiaNoEstado({}, CAMUFLAGEM, 1, maximos, DATA);
    const duas = W.aplicarMagiaNoEstado(uma, CAMUFLAGEM, 3, maximos, DATA);
    expect(duas.magias_ativas).toHaveLength(1);
    expect(duas.magias_ativas[0].nivel).toBe(3);
  });
});

describe('em batalha — status_temp', () => {
  const pj = (over = {}) => ({ inst_id: 'p1', nome: 'P', tipo: 'pj', status: 'ativo', status_temp: [], ...over });

  it('aplicarEfeitoMagia grava as habilidades lidas do texto', () => {
    const p = M.aplicarEfeitoMagia(pj(), CAMUFLAGEM, 3);
    const st = p.status_temp.find((s) => s.efeito.tipo === 'mod_dificuldade');
    expect(st.efeito).toMatchObject({ valor: -2, habilidades: ['Furtividade'], grupos: [] });
  });

  it('grupo inteiro (Conhecimento → Profissional)', () => {
    const p = M.aplicarEfeitoMagia(pj(), CONHECIMENTO, 1);
    expect(M.somaDificuldadeDoStatus(p, { nome: 'Agricultura', grupo: 'Profissional' })).toBe(-1);
    expect(M.somaDificuldadeDoStatus(p, { nome: 'Empatia', grupo: 'Influência' })).toBe(0);
  });

  it('a instantânea é consumida no teste da habilidade dela, e só nele', () => {
    const p = M.aplicarEfeitoMagia(pj(), FARO, 1);
    expect(M.consumirDificuldadeDoTeste(p, { nome: 'Negociar' })).toBe(p);
    const depois = M.consumirDificuldadeDoTeste(p, { nome: 'Rastrear' });
    expect(M.somaDificuldadeDoStatus(depois, { nome: 'Rastrear' })).toBe(0);
  });

  it('a de duração NÃO é consumida pelo teste', () => {
    const p = M.aplicarEfeitoMagia(pj(), CAMUFLAGEM, 1);
    expect(M.consumirDificuldadeDoTeste(p, { nome: 'Furtividade' })).toBe(p);
  });
});

describe('a conferência — magias fora do motor aparecem com o motivo', () => {
  /* Alucinação foi o exemplo destes dois testes enquanto esperava a correção
     de texto. O usuário corrigiu ("1 nível") e ela ENTROU no motor em
     12/09/2026 — o ciclo que eles descreviam se fechou. Ficam as duas pontas
     dele: com o texto certo, ok; com o texto por extenso, o motor não lê. */
  it('corrigida para dígito, Alucinação está no motor e passa na conferência', () => {
    const r = W.auditarMagias([{ key: 'alucinacao', nome: 'Alucinação',
      nivel_1: 'Aumenta 1 nível de dificuldade da habilidade Sentidos.' }]);
    expect(r.ok.map((x) => x.key)).toEqual(['alucinacao']);
    expect(W.motivoForaDoRegistro('alucinacao')).toBeNull();
  });

  it('se o texto voltar para "um nível", a conferência acusa quebrada', () => {
    const r = W.auditarMagias([{ key: 'alucinacao', nome: 'Alucinação',
      nivel_1: 'Aumenta um nível de dificuldade da habilidade Sentidos.' }]);
    expect(r.quebrada.map((x) => x.key)).toEqual(['alucinacao']);
  });

  it('narrativa registrada também aparece, com a classe própria', () => {
    const r = W.auditarMagias([{ key: 'leitura', nome: 'Leitura', nivel_1: 'Compreenda todo o conteúdo de um livro.' }]);
    expect(r.orfa).toHaveLength(1);
    expect(W.motivoForaDoRegistro('leitura').classe).toBe('narrativa');
  });
});
