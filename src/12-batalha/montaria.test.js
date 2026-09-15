/* ============================================================
   montaria.test.js — montar é amarrar dois participantes
   ============================================================
   "As montarias já existem (inicialmente pode incluir todas as criaturas do
   tipo Cavalo), vamos criar a mecânica de montar." — decisão do usuário,
   12/09/2026, que tirou Combate Montado da lista de técnicas sem motor.

   Não há tabela nem coluna nova: a montaria é uma CRIATURA que já está na
   batalha, com posição, EH e velocidade próprias.

   O que a amarração muda, e este arquivo trava:
     • o cavaleiro anda com a velocidade DO CAVALO — o ponto de montar;
     • os dois ficam na mesma célula, sempre;
     • Combate Montado passa a ter de onde tirar "50% da EH da sua montaria".

   O que NÃO muda: a montaria apanha e morre.

   14/09/2026: montado virou COMBATENTE ÚNICO — a montaria não tem mais vez
   própria nem token; e os animais do PJ entram na batalha controlados por
   quem joga com ele. Ver o último bloco deste arquivo.
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

// Números literais do banco: Cavalo Árabe (EH 60, vel 21), Pônei (EH 20, 10).
const cavaleiro = (over = {}) => ({
  inst_id: 'pj:1', ref_id: 1, tipo: 'pj', nome: 'Cavaleiro', status: 'ativo',
  vb: 8, eh: 30, eh_max: 30, ef: 40, ef_max: 40, pos: { x: 1, y: 1 },
  status_temp: [], ...over,
});
const cavalo = (over = {}) => ({
  inst_id: 'cri:160', ref_id: 160, tipo: 'criatura', nome: 'Cavalo Árabe',
  status: 'ativo', vb: 21, eh: 60, eh_max: 60, ef: 60, ef_max: 60,
  pos: { x: 3, y: 1 }, status_temp: [], ...over,
});
const lobo = (over = {}) => ({
  inst_id: 'cri:9', ref_id: 9, tipo: 'criatura', nome: 'Lobo', status: 'ativo',
  vb: 14, eh: 10, eh_max: 10, ef: 20, ef_max: 20, pos: { x: 5, y: 5 },
  status_temp: [], ...over,
});

describe('o que conta como montaria', () => {
  it.each([
    ['Cavalo Árabe', true], ['Cavalo Lendário', true], ['Cavalo Quarter de Guerra', true],
    ['Pônei', true], ['Ponei', true],
    ['Lobo', false], ['Cavaleiro Negro', false], ['Dragão', false],
  ])('%s → %s', (nome, esperado) => {
    expect(M.ehMontaria({ nome })).toBe(esperado);
  });

  /* 14/09/2026: montaria virou característica da criatura (criaturas.montaria).
     A coluna vence o nome; o nome só vale para snapshot sem o campo. */
  it('a característica da criatura vence o nome', () => {
    expect(M.ehMontaria({ nome: 'Grifo', eh_montaria: true })).toBe(true);
    expect(M.ehMontaria({ nome: 'Cavalo Árabe', eh_montaria: false })).toBe(false);
    expect(M.ehMontaria({ nome: 'Camelo', montaria: true })).toBe(true);
  });

  it('`montaria` objeto (a do cavaleiro) não conta como característica', () => {
    expect(M.ehMontaria({ nome: 'Cavaleiro', montaria: { inst_id: 'cri:1' } })).toBe(false);
  });

  it('"Cavaleiro" NÃO é montaria — o prefixo tem que ser palavra inteira', () => {
    // Sem a fronteira de palavra, /^cavalo/ pegaria "Cavaleiro" e o Mestre
    // poderia montar num inimigo.
    expect(M.ehMontaria({ nome: 'Cavaleiro Negro' })).toBe(false);
  });
});

describe('quais montarias a batalha oferece', () => {
  it('lista o cavalo e ignora o lobo', () => {
    const arr = [cavaleiro(), cavalo(), lobo()];
    expect(M.montariasDisponiveis(arr, arr[0]).map((p) => p.nome)).toEqual(['Cavalo Árabe']);
  });

  it('cavalo MORTO não serve', () => {
    const arr = [cavaleiro(), cavalo({ status: 'morto' })];
    expect(M.montariasDisponiveis(arr, arr[0])).toEqual([]);
  });

  it('cavalo já montado por OUTRO não serve', () => {
    const arr = [cavaleiro(), cavalo({ montado_por: 'pj:9' })];
    expect(M.montariasDisponiveis(arr, arr[0])).toEqual([]);
  });

  it('mas o próprio cavalo do cavaleiro continua na lista dele', () => {
    const arr = [cavaleiro(), cavalo({ montado_por: 'pj:1' })];
    expect(M.montariasDisponiveis(arr, arr[0])).toHaveLength(1);
  });
});

describe('montar amarra os dois lados', () => {
  const montado = () => M.montar([cavaleiro(), cavalo()], 'pj:1', 'cri:160');

  it('o cavaleiro guarda a montaria', () => {
    expect(montado()[0].montaria).toMatchObject({
      inst_id: 'cri:160', nome: 'Cavalo Árabe', eh_max: 60, velocidade: 21,
    });
  });

  it('e o cavalo sabe quem está em cima', () => {
    expect(montado()[1].montado_por).toBe('pj:1');
  });

  it('quem sobe vai até o cavalo — assume a célula dele', () => {
    expect(montado()[0].pos).toEqual({ x: 3, y: 1 });
  });

  it('a EH da montaria viaja CONGELADA', () => {
    // Combate Montado soma 50% dela; o número não pode mudar no meio da
    // batalha porque o cavalo levou uma flechada.
    const arr = M.montar([cavaleiro(), cavalo({ eh: 12 })], 'pj:1', 'cri:160');
    expect(arr[0].montaria.eh_max).toBe(60);
  });

  it('montar em outro cavalo desmonta o primeiro', () => {
    const dois = [cavaleiro(), cavalo(), cavalo({ inst_id: 'cri:135', ref_id: 135, nome: 'Pônei', eh_max: 20, vb: 10 })];
    const r = M.montar(M.montar(dois, 'pj:1', 'cri:160'), 'pj:1', 'cri:135');
    expect(r[0].montaria.nome).toBe('Pônei');
    expect(r[1].montado_por).toBeUndefined();   // o Árabe ficou livre
  });

  it('não monta em quem não é montaria', () => {
    const arr = [cavaleiro(), lobo()];
    expect(M.montar(arr, 'pj:1', 'cri:9')).toBe(arr);
  });

  it('não monta em cavalo morto', () => {
    const arr = [cavaleiro(), cavalo({ status: 'morto' })];
    expect(M.montar(arr, 'pj:1', 'cri:160')).toBe(arr);
  });

  it('não rouba o cavalo de outro cavaleiro', () => {
    const arr = [cavaleiro(), cavalo({ montado_por: 'pj:9' })];
    expect(M.montar(arr, 'pj:1', 'cri:160')).toBe(arr);
  });
});

describe('desmontar solta os dois', () => {
  it('some dos dois lados', () => {
    const r = M.desmontar(M.montar([cavaleiro(), cavalo()], 'pj:1', 'cri:160'), 'pj:1');
    expect(r[0].montaria).toBeUndefined();
    expect(r[1].montado_por).toBeUndefined();
  });

  it('desmontar quem não está montado devolve o MESMO array', () => {
    const arr = [cavaleiro(), cavalo()];
    expect(M.desmontar(arr, 'pj:1')).toBe(arr);
  });
});

describe('o cavalo segue o cavaleiro', () => {
  it('mover o cavaleiro leva o cavalo junto', () => {
    let arr = M.montar([cavaleiro(), cavalo()], 'pj:1', 'cri:160');
    arr = arr.map((p) => (p.inst_id === 'pj:1' ? { ...p, pos: { x: 9, y: 4 } } : p));
    const r = M.montariaSegue(arr, 'pj:1');
    expect(r[1].pos).toEqual({ x: 9, y: 4 });
  });

  it('já na mesma célula, devolve o MESMO array', () => {
    const arr = M.montar([cavaleiro(), cavalo()], 'pj:1', 'cri:160');
    expect(M.montariaSegue(arr, 'pj:1')).toBe(arr);
  });

  it('sem montaria, não mexe em ninguém', () => {
    const arr = [cavaleiro(), cavalo()];
    expect(M.montariaSegue(arr, 'pj:1')).toBe(arr);
  });
});

describe('montado, quem anda é o cavalo', () => {
  it('o passo sai da velocidade da montaria', () => {
    const arr = M.montar([cavaleiro(), cavalo()], 'pj:1', 'cri:160');
    expect(M.vbParaMovimento(arr[0])).toBe(21);   // do cavalo, não os 8 dele
  });

  it('a pé, o passo é o dele mesmo', () => {
    expect(M.vbParaMovimento(cavaleiro())).toBe(8);
  });

  it('mas a INICIATIVA continua sendo a do cavaleiro', () => {
    // Montar dá passo, não dá reflexo: quem age é quem está em cima.
    const arr = M.montar([cavaleiro(), cavalo()], 'pj:1', 'cri:160');
    expect(M.vbEfetivo(arr[0])).toBe(8);
  });

  it('buff de velocidade no cavaleiro não acelera o cavalo', () => {
    const arr = M.montar([cavaleiro({
      status_temp: [{ id: 'x', nome: 'Velocidade', rodadas_rest: 5,
                      efeito: { tipo: 'mod_vb', valor: 10 } }],
    }), cavalo()], 'pj:1', 'cri:160');
    expect(M.vbParaMovimento(arr[0])).toBe(21);
  });
});

describe('Combate Montado tira o número da montaria', () => {
  /* "Um teste de Combate Montado (Médio) adiciona 50% da energia heroica da
     sua montaria à sua energia heroica por 5 rodadas." O valor não cabe no
     registro: depende de em qual cavalo o combatente está. */
  const TEC = { key: 'combate_montado', nome: 'Combate Montado' };

  it('Cavalo Árabe (EH 60) empresta 30', () => {
    const arr = M.montar([cavaleiro(), cavalo()], 'pj:1', 'cri:160');
    const r = M.aplicarEfeitoTecnica(arr[0], TEC, 0);
    expect(r.status_temp[0].efeito).toMatchObject({ tipo: 'mod_eh_temp', valor: 30 });
  });

  it('Pônei (EH 20) empresta 10 — o número é do cavalo, não fixo', () => {
    const ponei = cavalo({ inst_id: 'cri:135', ref_id: 135, nome: 'Pônei', eh_max: 20, vb: 10 });
    const arr = M.montar([cavaleiro(), ponei], 'pj:1', 'cri:135');
    const r = M.aplicarEfeitoTecnica(arr[0], TEC, 0);
    expect(r.status_temp[0].efeito.valor).toBe(10);
  });

  it('e a EH emprestada entra de verdade no poço', () => {
    const arr = M.montar([cavaleiro(), cavalo()], 'pj:1', 'cri:160');
    const r = M.aplicarEfeitoTecnica(arr[0], TEC, 0);
    // 15/09/2026: montar já soma a EH do cavalo (30 + 60 = 90); a técnica
    // soma MAIS 50% da montaria por cima (+30).
    expect({ eh: r.eh, eh_max: r.eh_max }).toEqual({ eh: 120, eh_max: 120 });
  });

  it('a pé, o efeito é ZERO — não inventa montaria', () => {
    const r = M.aplicarEfeitoTecnica(cavaleiro(), TEC, 0);
    expect(r.status_temp[0].efeito.valor).toBe(0);
  });

  it('o registro declara 5 rodadas e Médio, como o banco', () => {
    expect(window.TECNICA_EFEITO_MAP.combate_montado)
      .toMatchObject({ modo: 'teste', rodadas: 5, dificuldade: 'medio', alvo: 'self' });
  });

  it('e saiu da lista de técnicas sem motor', () => {
    expect(window.tecnicaForaDoRegistro('combate_montado')).toBeNull();
  });
});

/* ============================================================
   ANIMAIS DO PERSONAGEM E COMBATENTE ÚNICO — 14/09/2026
   "Na hora do combate, o personagem irá controlar seus animais em combate.
    Se estiver montado, será um combatente único." Decisões: o Mestre escolhe
   quem entra; quem ataca escolhe mirar no cavaleiro ou na montaria; montaria
   caída derruba o cavaleiro; animal morto sai do inventário.
   ============================================================ */
describe('animais do personagem na batalha', () => {
  const PJ = { id: 7, inventario: { itens: [
    { instanceId: 'i-cav', slug: 'cavalo_quarter', quantidade: 1, montado: true },
    { instanceId: 'i-cao', slug: 'cao', quantidade: 1 },
    { instanceId: 'i-agua', slug: 'agua', quantidade: 3 },
  ] } };
  const ITENS = { cavalo_quarter: { slug: 'cavalo_quarter', criatura_id: 157 }, cao: { slug: 'cao', criatura_id: 66 } };
  const CRIS = { 157: { id: 157, nome: 'Cavalo Quarter', montaria: true }, 66: { id: 66, nome: 'Cão', montaria: false } };

  it('animaisParaBatalha lista só os itens vinculados a criatura', () => {
    const r = M.animaisParaBatalha(PJ, ITENS, CRIS);
    expect(r.map((a) => [a.nome, a.montado, a.montaria])).toEqual([
      ['Cavalo Quarter', true, true], ['Cão', false, false],
    ]);
  });

  it('o participante carrega o dono, a instância e o "montar na largada"', () => {
    const [cav, cao] = M.animaisParaBatalha(PJ, ITENS, CRIS);
    expect(M.participanteDeAnimal(PJ, cav, 'Galadar')).toMatchObject({
      tipo: 'criatura', ref_id: 157, nome: 'Cavalo Quarter (Galadar)',
      inst_id: 'ani:7:i-cav', dono_pj: 7, item_instance_id: 'i-cav', montar_em_pj: 7,
    });
    expect(M.participanteDeAnimal(PJ, cao, 'Galadar').montar_em_pj).toBeUndefined();
  });

  it('animal de PJ não forma bando, mesmo com 5 iguais', () => {
    const caes = Array.from({ length: 5 }, (_, i) => ({ tipo: 'criatura', ref_id: 66, nome: 'Cão', inst_id: 'ani:7:c' + i, dono_pj: 7 }));
    expect(M.formarBandos(caes).every((p) => !p.bando)).toBe(true);
  });

  it('só o dono pode montar no próprio cavalo', () => {
    const meu = cavalo({ dono_pj: 1 });
    const alheio = cavalo({ inst_id: 'cri:x', dono_pj: 9 });
    const arr = [cavaleiro(), meu, alheio];
    expect(M.montariasDisponiveis(arr, arr[0]).map((p) => p.inst_id)).toEqual(['cri:160']);
  });

  it('na largada, o montado sobe no cavalo e os dois ficam na célula do cavaleiro', () => {
    const arr = M.amarrarMontariasIniciais([
      cavaleiro({ pos: { x: 2, y: 2 } }),
      cavalo({ pos: null, dono_pj: 1, montar_em_pj: 1 }),
    ]);
    expect(arr[0].montaria.inst_id).toBe('cri:160');
    expect(arr[1].montado_por).toBe('pj:1');
    expect(arr[1].pos).toEqual({ x: 2, y: 2 });
    expect(arr[1].montar_em_pj).toBeUndefined();
  });

  it('montado é combatente único: a montaria nunca recebe a vez', () => {
    const arr = M.montar([cavaleiro({ ordem: 1 }), cavalo({ ordem: 2 }), lobo({ ordem: 3 })], 'pj:1', 'cri:160');
    expect(M.ehMontariaEmUso(arr[1], arr)).toBe(true);
    expect(M.proximoAtivo(arr, 1).inst_id).toBe('cri:9');
  });

  it('montaria caída derruba o cavaleiro, que segue a pé', () => {
    const arr = M.montar([cavaleiro(), cavalo()], 'pj:1', 'cri:160')
      .map((p) => (p.inst_id === 'cri:160' ? { ...p, status: 'morto' } : p));
    const r = M.derrubarCavaleiros(arr);
    expect(r.caidos).toEqual(['Cavaleiro']);
    expect(r.participantes[0].montaria).toBeUndefined();
  });

  it('montaria de pé não derruba ninguém (mesmo array)', () => {
    const arr = M.montar([cavaleiro(), cavalo()], 'pj:1', 'cri:160');
    expect(M.derrubarCavaleiros(arr).participantes).toBe(arr);
  });

  it('a queda passa pelo funil de gravação e vira linha no log', () => {
    const arr = M.montar([cavaleiro(), cavalo()], 'pj:1', 'cri:160')
      .map((p) => (p.inst_id === 'cri:160' ? { ...p, status: 'desmaiado' } : p));
    const r = M.fugaNaGravacao({ participantes: arr }, { log: [], rodada: 2 });
    expect(r.campos.participantes[0].montaria).toBeUndefined();
    expect(r.campos.log[0].texto).toMatch(/caiu da montaria/);
  });

  it('animal morto sai do inventário; da pilha, só quem morreu', () => {
    const inv = { itens: [
      { instanceId: 'a', slug: 'cavalo_quarter', quantidade: 1, montado: true },
      { instanceId: 'b', slug: 'cao', quantidade: 3 },
    ] };
    const r = M.inventarioSemAnimaisMortos(inv, ['a', 'b', 'b']);
    expect(r.itens).toEqual([{ instanceId: 'b', slug: 'cao', quantidade: 1, montado: false }]);
    expect(M.inventarioSemAnimaisMortos(inv, [])).toBe(inv);
  });
});

/* ============================================================
   EH EMPRESTADA — 15/09/2026
   "Quando um jogador monta em um animal, a EH do animal é somada à sua."
   Decisão: a EH PASSA para o cavaleiro (o animal fica com 0) e volta ao
   desmontar, com o dano sofrido saindo primeiro da parte do animal.
   ============================================================ */
describe('EH emprestada da montaria', () => {
  const montado = (over) => M.montar([cavaleiro(over), cavalo()], 'pj:1', 'cri:160');

  it('ao montar, o cavaleiro soma a EH do cavalo e o cavalo fica com 0', () => {
    const arr = montado();
    expect({ eh: arr[0].eh, eh_max: arr[0].eh_max }).toEqual({ eh: 90, eh_max: 90 });
    expect({ eh: arr[1].eh, eh_max: arr[1].eh_max }).toEqual({ eh: 0, eh_max: 0 });
  });

  it('o cavalo com EH 0 emprestada NÃO vira desmaiado nem derruba o cavaleiro', () => {
    const arr = montado();
    expect(arr[1].status).toBe('ativo');
    expect(M.derrubarCavaleiros(arr).participantes).toBe(arr);
  });

  it('sem dano, desmontar devolve tudo como era', () => {
    const r = M.desmontar(montado(), 'pj:1');
    expect({ eh: r[0].eh, eh_max: r[0].eh_max }).toEqual({ eh: 30, eh_max: 30 });
    expect({ eh: r[1].eh, eh_max: r[1].eh_max }).toEqual({ eh: 60, eh_max: 60 });
  });

  it('o dano sai primeiro da parte do cavalo', () => {
    const arr = montado().map((p) => (p.inst_id === 'pj:1' ? { ...p, eh: 50 } : p));   // levou 40
    const r = M.desmontar(arr, 'pj:1');
    expect(r[0].eh).toBe(30);   // o cavaleiro fica com a dele
    expect(r[1].eh).toBe(20);   // o cavalo absorveu os 40
  });

  it('dano maior que a parte do cavalo passa para o cavaleiro', () => {
    const arr = montado().map((p) => (p.inst_id === 'pj:1' ? { ...p, eh: 10 } : p));   // levou 80
    const r = M.desmontar(arr, 'pj:1');
    expect(r[1].eh).toBe(0);
    expect(r[0].eh).toBe(10);
  });

  it('remontar o mesmo cavalo não perde a EH dele', () => {
    const arr = M.montar(M.desmontar(montado(), 'pj:1'), 'pj:1', 'cri:160');
    expect(arr[0].eh).toBe(90);
  });

  it('encerrar desmonta todos: a EH emprestada não vai para a ficha', () => {
    const r = M.desmontarTodos(montado());
    expect(r[0].eh).toBe(30);
    expect(r[0].montaria).toBeUndefined();
  });
});
