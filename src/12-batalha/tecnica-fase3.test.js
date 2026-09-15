/* ============================================================
   tecnica-fase3.test.js — as quatro que entraram na varredura
   ============================================================
   A verificação dos itens em 12/09/2026 acabou revelando um buraco maior:
   das 58 técnicas, 8 estavam fora do motor — e, diferente das magias, não
   havia motivo registrado nem painel para enxergá-las. Quatro caíam em
   mecanismos que o combate já tinha:

     Concentração        segura a magia sustentada (o motor já a derruba)
     Remover Debilitação bônus numa HABILIDADE nomeada (a aba já julga teste)
     Estilhaçar/Retalhar gastam a resistência da armadura (o golpe já gasta)

   Das outras quatro, Combate Montado entrou no mesmo dia, quando a MONTARIA
   virou mecânica. Provocar e Conduzir Oponente ficaram como arbitragem do
   Mestre até 14/09/2026, quando o usuário as trouxe para o motor — ver
   provocar-conduzir.test.js. TECNICA_FORA_DO_REGISTRO está vazia.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import '../02-shell/dado-d20.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; });

const lutador = (over = {}) => ({
  inst_id: 'p1', nome: 'Lutador', tipo: 'pj', status: 'ativo',
  eh: 10, eh_max: 10, ar: 0, ar_max: 0, ef: 20, ef_max: 20, res: 0,
  status_temp: [], ...over,
});

describe('Concentração — a única coisa que segura a magia sustentada', () => {
  /* "Um teste de Concentração (Difícil) permite continuar realizando uma
     tarefa por 2 rodadas." Em combate a tarefa é a magia sustentada. */
  const sustentando = (over = {}) => lutador({
    status_temp: [{ id: 'mag_x', nome: 'Barreira', rodadas_rest: null,
                    concentracao: { ator: 'p1', magia_key: 'barreira' },
                    efeito: { tipo: 'mod_defesa', valor: 2 } }],
    ...over,
  });
  const blindado = () => {
    const p = sustentando();
    return { ...p, status_temp: [...p.status_temp,
      { id: 'tec_concentracao', nome: 'Concentração', rodadas_rest: 2,
        efeito: { tipo: 'mantem_concentracao', valor: true } }] };
  };

  it('sem a técnica, agir derruba a magia — regra de sempre', () => {
    const r = M.quebrarConcentracao([sustentando()], 'p1');
    expect(r[0].status_temp.some((s) => s.concentracao)).toBe(false);
  });

  it('com a técnica, a magia FICA', () => {
    const r = M.quebrarConcentracao([blindado()], 'p1');
    expect(r[0].status_temp.some((s) => s.concentracao)).toBe(true);
  });

  it('e blinda contra dano na EF também, não só contra agir', () => {
    // O texto não escolhe gatilho, então a blindagem não escolhe.
    const antes = blindado();
    const depois = { ...antes, ef: 5 };
    const r = M.quebrarConcentracaoPorDano([antes], antes, depois);
    expect(r[0].status_temp.some((s) => s.concentracao)).toBe(true);
  });

  it('a blindagem é de QUEM tem o status, não de todo mundo', () => {
    const outro = { ...lutador({ inst_id: 'p2' }),
      status_temp: [{ id: 'mag_y', nome: 'Outra', rodadas_rest: null,
                      concentracao: { ator: 'p2' }, efeito: { tipo: 'mod_defesa', valor: 1 } }] };
    const r = M.quebrarConcentracao([blindado(), outro], 'p2');
    expect(r[1].status_temp.some((s) => s.concentracao)).toBe(false);
  });

  it('o registro declara 2 rodadas e dificuldade Difícil, como o banco', () => {
    expect(window.TECNICA_EFEITO_MAP.concentracao)
      .toMatchObject({ modo: 'teste', rodadas: 2, dificuldade: 'dificil', alvo: 'self' });
  });
});

describe('Remover Debilitação — bônus numa habilidade nomeada', () => {
  /* "Seu total de Remover Debilitação é adicionado à sua habilidade Escapar
     por 1 rodada." Primeiro modificador que mira numa habilidade e não num
     stat — e só virou útil quando a aba Habilidade passou a dar veredito. */
  const comBonus = (nome, valor) => lutador({
    status_temp: [{ id: 'tec_remover_debilitacao', nome: 'Remover Debilitação', rodadas_rest: 1,
                    efeito: { tipo: 'mod_habilidade', valor, habilidade: nome } }],
  });

  it('soma na habilidade certa', () => {
    expect(M.somaModHabilidade(comBonus('Escapar', 6), 'Escapar')).toBe(6);
  });

  it('e não vaza para as outras', () => {
    expect(M.somaModHabilidade(comBonus('Escapar', 6), 'Sentidos')).toBe(0);
  });

  it('casa sem acento e sem caixa — o nome vem de prosa, não de chave', () => {
    expect(M.somaModHabilidade(comBonus('Persuasão', 4), 'persuasao')).toBe(4);
  });

  it('lutador sem status nenhum soma zero', () => {
    expect(M.somaModHabilidade(lutador(), 'Escapar')).toBe(0);
  });

  it('o registro escala com o TOTAL da técnica, como o texto diz', () => {
    const reg = window.TECNICA_EFEITO_MAP.remover_debilitacao;
    expect(reg).toMatchObject({ modo: 'total', rodadas: 1 });
    expect(reg.efeitos[0]).toMatchObject({ tipo: 'mod_habilidade', sinal: 1, habilidade: 'Escapar' });
  });

  it('aplicarEfeitoTecnica leva o NOME da habilidade para o status', () => {
    // Sem o nome viajando no efeito, o consumidor não sabe a qual habilidade
    // o número pertence — mesma disciplina da restrição de arma.
    const r = M.aplicarEfeitoTecnica(lutador(),
      { key: 'remover_debilitacao', nome: 'Remover Debilitação' }, 7);
    expect(r.status_temp[0].efeito).toMatchObject({ tipo: 'mod_habilidade', valor: 7, habilidade: 'Escapar' });
  });
});

describe('Estilhaçar e Retalhar — dano no equipamento', () => {
  /* "Causa N de dano em 1 equipamento de 1 alvo." O equipamento que o combate
     conhece é a armadura, e o que nela se gasta é a resistência. */
  const comPecas = (...res) => lutador({
    armadura_pecas: res.map((r, i) => ({ slug: 'p' + i, res: r })),
    res: res.reduce((a, b) => a + b, 0),
  });

  it('Estilhaçar tira 2 de resistência', () => {
    const r = M.aplicarDanoEquipamento(comPecas(5), window.TECNICA_EFEITO_MAP.estilhacar);
    expect(r.res).toBe(3);
  });

  it('Retalhar tira 3', () => {
    const r = M.aplicarDanoEquipamento(comPecas(5), window.TECNICA_EFEITO_MAP.retalhar);
    expect(r.res).toBe(2);
  });

  it('morde sempre a peça MAIS INTEIRA — uma quebra em vez de duas pela metade', () => {
    const r = M.aplicarDanoEquipamento(comPecas(1, 4), window.TECNICA_EFEITO_MAP.retalhar);
    expect(r.armadura_pecas.map((p) => p.res)).toEqual([1, 1]);
  });

  it('não deixa a resistência ficar negativa', () => {
    expect(M.aplicarDanoEquipamento(comPecas(1), window.TECNICA_EFEITO_MAP.retalhar).res).toBe(0);
  });

  it('criatura não tem peças — gasta o res escalar, como na cascata', () => {
    const r = M.aplicarDanoEquipamento(lutador({ res: 4 }), window.TECNICA_EFEITO_MAP.estilhacar);
    expect(r.res).toBe(2);
    expect(r.armadura_pecas).toBeUndefined();
  });

  it('técnica que não danifica equipamento devolve o MESMO participante', () => {
    const p = comPecas(5);
    expect(M.aplicarDanoEquipamento(p, window.TECNICA_EFEITO_MAP.mira)).toBe(p);
  });

  it('armadura em 0 para de bloquear — é o equipamento inutilizado do texto', () => {
    // Confere o elo com a cascata: sem resistência, o limiar não segura mais.
    const alvo = M.aplicarDanoEquipamento(comPecas(1, 1), window.TECNICA_EFEITO_MAP.retalhar);
    const r = M.aplicarDanoCascata(10, { ...alvo, ar: 20, eh: 0, eh_max: 0 }, false);
    expect(r.ef).toBe(10);   // passou inteiro: a armadura arrebentou
  });
});

describe('a lista de fora do motor', () => {
  /* O que faltava não era só o efeito: era o instrumento. Nas magias, a lista
     de fora-do-motor com motivo foi o que permitiu ao usuário decidir.
     Provocar e Conduzir Oponente moravam nela até 14/09/2026. */
  it.each(['provocar', 'conduzir_oponente'])(
    '%s saiu da lista e entrou no registro', (key) => {
      expect(window.tecnicaForaDoRegistro(key), key).toBeNull();
      expect(window.TECNICA_EFEITO_MAP[key], key).toBeDefined();
    });

  it('técnica LIGADA não aparece como fora', () => {
    ['concentracao', 'remover_debilitacao', 'estilhacar', 'retalhar', 'combate_montado', 'luta_as_cegas']
      .forEach((k) => expect(window.tecnicaForaDoRegistro(k), k).toBeNull());
  });

  it('registro e lista-de-fora cobrem as 58 do catálogo, sem sobra', () => {
    const ligadas = Object.keys(window.TECNICA_EFEITO_MAP).length;
    const fora = Object.keys(window.TECNICA_FORA_DO_REGISTRO).length;
    // 58 + 0. Combate Montado e Luta as Cegas sairam da lista de fora em
    // 12/09/2026; Provocar e Conduzir Oponente, em 14/09/2026.
    expect(ligadas + fora).toBe(58);
  });
});
