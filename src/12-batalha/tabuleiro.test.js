/* ============================================================
   tabuleiro.test.js — camada pura do tabuleiro
   ============================================================
   Congela os valores RECUPERADOS do bundle de produção. Se algum
   número aqui mudar, é porque a regra do tabuleiro mudou — de
   propósito, nunca por acidente (mesma disciplina de
   motor-batalha.test.js).

   Referência: grid 70×35, token 3×3, movimento = max(5, floor(VB×5/20)).
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

let T;
beforeAll(() => {
  T = window.MotorTabuleiro;
  expect(T).toBeDefined();
});

describe('constantes de geometria', () => {
  it('grid 70×35, token 3×3', () => {
    expect([T.TAB_COLS, T.TAB_ROWS, T.TAB_TOKEN]).toEqual([70, 35, 3]);
  });
});

describe('movimentoBase — VB em células', () => {
  it('max(5, floor(VB × 5/20))', () => {
    expect(T.movimentoBase(20)).toBe(5);   // floor(5) = 5
    expect(T.movimentoBase(35)).toBe(8);   // floor(8.75) = 8
    expect(T.movimentoBase(100)).toBe(25);
  });
  it('piso 5: VB baixo/zero/negativo não anda menos que 5', () => {
    expect(T.movimentoBase(0)).toBe(5);
    expect(T.movimentoBase(4)).toBe(5);
    expect(T.movimentoBase(-30)).toBe(5);
    expect(T.movimentoBase(null)).toBe(5);
  });
});

describe('posValida — o token 3×3 tem que caber inteiro', () => {
  it('aceita posição interna', () => {
    expect(T.posValida({ x: 0, y: 0 })).toBe(true);
    expect(T.posValida({ x: 67, y: 32 })).toBe(true);  // 67+3=70, 32+3=35
  });
  it('recusa quando o token vazaria a borda', () => {
    expect(T.posValida({ x: 68, y: 32 })).toBe(false); // 68+3=71 > 70
    expect(T.posValida({ x: 67, y: 33 })).toBe(false); // 33+3=36 > 35
  });
  it('recusa negativo, fracionário, nulo', () => {
    expect(T.posValida({ x: -1, y: 0 })).toBe(false);
    expect(T.posValida({ x: 1.5, y: 0 })).toBe(false);
    expect(T.posValida(null)).toBe(false);
  });
});

describe('distâncias', () => {
  it('movimento é Chebyshev: diagonal custa igual a ortogonal', () => {
    expect(T.distanciaCelulas({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(3);
    expect(T.distanciaCelulas({ x: 0, y: 0 }, { x: 3, y: 3 })).toBe(3);
    expect(T.distanciaCelulas({ x: 0, y: 0 }, { x: 3, y: 5 })).toBe(5);
  });
  it('alcance é de BORDA: desconta o tamanho do token, encostados = 0', () => {
    expect(T.distanciaBordas({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(1);
    expect(T.distanciaBordas({ x: 0, y: 0 }, { x: 2, y: 0 })).toBe(0);
    expect(T.distanciaBordas({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(0);
  });
});

describe('parseAlcance / alcanceDaAcao', () => {
  it('número, "5m" e texto de corpo-a-corpo', () => {
    expect(T.parseAlcance(5)).toBe(5);
    expect(T.parseAlcance('25m')).toBe(25);
    expect(T.parseAlcance('Toque')).toBe(1);
    expect(T.parseAlcance('corpo a corpo')).toBe(1);
    expect(T.parseAlcance('')).toBe(null);
    expect(T.parseAlcance(null)).toBe(null);
  });
  it('magia usa o alcance dela; arma cede pro da técnica quando há', () => {
    expect(T.alcanceDaAcao({ magia: { alcance: '25m' } })).toBe(25);
    expect(T.alcanceDaAcao({ arma: { alcance: 0 } })).toBe(1);
    expect(T.alcanceDaAcao({ arma: { alcance: '2m' }, tecnica: { alcance: '6m' } })).toBe(6);
    expect(T.alcanceDaAcao({ arma: { alcance: '2m' }, tecnica: { alcance: null } })).toBe(2);
  });
});

describe('celulaOcupada', () => {
  const vivo = { tipo: 'pj', ref_id: 1, inst_id: 'a', pos: { x: 10, y: 10 }, status: 'ativo' };
  it('bloqueia sobreposição de tokens vivos', () => {
    expect(T.celulaOcupada({ x: 11, y: 11 }, [vivo])).toBe(true);
    expect(T.celulaOcupada({ x: 13, y: 10 }, [vivo])).toBe(false);
  });
  it('morto e desistiu NÃO bloqueiam', () => {
    expect(T.celulaOcupada({ x: 11, y: 11 }, [{ ...vivo, status: 'morto' }])).toBe(false);
    expect(T.celulaOcupada({ x: 11, y: 11 }, [{ ...vivo, status: 'desistiu' }])).toBe(false);
  });
  it('ignora o próprio participante que está se movendo', () => {
    expect(T.celulaOcupada({ x: 11, y: 11 }, [vivo], vivo)).toBe(false);
  });
});

describe('validarMovimento — ordem das guardas', () => {
  const base = { tipo: 'pj', ref_id: 1, inst_id: 'a', status: 'ativo', pa_rest: 1, vb: 20, mov_rest: 5, pos: { x: 10, y: 10 } };

  it('movimento válido devolve a distância', () => {
    expect(T.validarMovimento(base, { x: 13, y: 10 }, [base])).toEqual({ ok: true, dist: 3 });
  });
  it('não ativo', () => {
    expect(T.validarMovimento({ ...base, status: 'desmaiado' }, { x: 13, y: 10 }, []).motivo).toBe('nao_ativo');
  });
  it('PA zerado NÃO impede mover (30/08/2026): andar gasta mov_rest, não PA', () => {
    // Antes isto recusava com 'sem_pa'. Com criatura em pa_max 1, o PA
    // acabava no primeiro passo e ela ficava presa com mov_rest sobrando.
    expect(T.validarMovimento({ ...base, pa_rest: 0 }, { x: 13, y: 10 }, [])).toEqual({ ok: true, dist: 3 });
  });
  it('sem posição de origem', () => {
    expect(T.validarMovimento({ ...base, pos: null }, { x: 13, y: 10 }, []).motivo).toBe('sem_posicao');
  });
  it('destino fora do tabuleiro', () => {
    expect(T.validarMovimento(base, { x: 68, y: 10 }, []).motivo).toBe('fora_do_tabuleiro');
  });
  it('mesma célula', () => {
    expect(T.validarMovimento(base, { x: 10, y: 10 }, []).motivo).toBe('mesmo_lugar');
  });
  it('além do movimento restante', () => {
    expect(T.validarMovimento(base, { x: 16, y: 10 }, []).motivo).toBe('sem_movimento');
  });
  it('célula ocupada', () => {
    const outro = { tipo: 'pj', ref_id: 2, inst_id: 'b', status: 'ativo', pos: { x: 13, y: 10 } };
    expect(T.validarMovimento(base, { x: 13, y: 10 }, [base, outro]).motivo).toBe('celula_ocupada');
  });
  it('mov_rest ausente cai no movimentoBase(vb)', () => {
    const semMov = { ...base, mov_rest: undefined, vb: 20 };
    expect(T.validarMovimento(semMov, { x: 15, y: 10 }, []).ok).toBe(true);   // 5 == mov base
    expect(T.validarMovimento(semMov, { x: 16, y: 10 }, []).motivo).toBe('sem_movimento');
  });
});

describe('moverParticipante — desconta movimento, NÃO gasta PA', () => {
  const p = { tipo: 'pj', ref_id: 1, inst_id: 'a', status: 'ativo', pa_rest: 2, vb: 40, mov_rest: 10, pos: { x: 10, y: 10 } };

  it('aplica posição e desconta só a distância', () => {
    const r = T.moverParticipante(p, { x: 14, y: 13 }, [p]);
    expect(r.ok).toBe(true);
    expect(r.dist).toBe(4);                       // Chebyshev: max(4,3)
    expect(r.participante.pos).toEqual({ x: 14, y: 13 });
    expect(r.participante.mov_rest).toBe(6);      // 10 − 4
    expect(r.participante.pa_rest).toBe(2);       // intacto: mover não é ação
  });

  it('criatura de 1 PA move UMA vez por rodada e mantém a ação', () => {
    // Duas regras se cruzam aqui, e é fácil confundi-las:
    //   mov_rest         → o quão LONGE vai esse único movimento;
    //   moveu_na_rodada  → que ele é único.
    // O PA fica de fora das duas: andar não consome ação, senão a criatura
    // (pa_max 1) teria que escolher entre andar e atacar.
    let c = { tipo: 'criatura', ref_id: 9, inst_id: 'c', status: 'ativo',
              pa_rest: 1, vb: 32, mov_rest: 8, pos: { x: 10, y: 10 } };
    c = T.moverParticipante(c, { x: 13, y: 10 }, [c]).participante;   // 3 m
    expect(c.mov_rest).toBe(5);
    expect(c.moveu_na_rodada).toBe(true);
    expect(c.pa_rest).toBe(1);                    // ainda pode atacar
    // Sobram 5 m, mas o movimento da rodada acabou.
    expect(T.moverParticipante(c, { x: 15, y: 10 }, [c]).motivo).toBe('ja_moveu');
  });

  it('ja_moveu é checado antes de mov_rest e de célula ocupada', () => {
    const c = { tipo: 'pj', ref_id: 9, inst_id: 'c', status: 'ativo',
                pa_rest: 3, vb: 20, mov_rest: 5, pos: { x: 10, y: 10 },
                moveu_na_rodada: true };
    expect(T.validarMovimento(c, { x: 40, y: 10 }, []).motivo).toBe('ja_moveu');
  });

  it('a virada de rodada devolve o movimento a quem está ativo', () => {
    const c = { status: 'ativo', pa_max: 2, pa_rest: 0, vb: 40, mov_rest: 0,
                moveu_na_rodada: true };
    const r = window.MotorBatalha.processarViradaDeRodada(c);
    expect(r.participante.moveu_na_rodada).toBe(false);
    expect(r.participante.mov_rest).toBe(10);
  });

  it('quem não está ativo não recupera o movimento', () => {
    const c = { status: 'desmaiado', pa_max: 2, pa_rest: 0, vb: 40, mov_rest: 0,
                moveu_na_rodada: true };
    const r = window.MotorBatalha.processarViradaDeRodada(c);
    expect(r.participante.moveu_na_rodada).toBe(true);
  });
  it('não muta o original', () => {
    T.moverParticipante(p, { x: 14, y: 13 }, [p]);
    expect(p.pos).toEqual({ x: 10, y: 10 });
    expect(p.mov_rest).toBe(10);
  });
  it('recusa devolve o participante intacto', () => {
    const r = T.moverParticipante(p, { x: 30, y: 10 }, [p]);
    expect(r.ok).toBe(false);
    expect(r.motivo).toBe('sem_movimento');
    expect(r.participante).toBe(p);
  });
});

describe('preservarPosicoes — remontar snapshot sem perder o tabuleiro', () => {
  it('herda a posição quando tipo+ref_id casam no mesmo índice', () => {
    const novos   = [{ tipo: 'pj', ref_id: 1 }, { tipo: 'criatura', ref_id: 9 }];
    const antigos = [{ tipo: 'pj', ref_id: 1, pos: { x: 5, y: 5 } }, { tipo: 'criatura', ref_id: 9, pos: { x: 8, y: 8 } }];
    expect(T.preservarPosicoes(novos, antigos).map((p) => p.pos)).toEqual([{ x: 5, y: 5 }, { x: 8, y: 8 }]);
  });
  it('participante trocado no índice NÃO herda posição alheia', () => {
    const novos   = [{ tipo: 'pj', ref_id: 2 }];
    const antigos = [{ tipo: 'pj', ref_id: 1, pos: { x: 5, y: 5 } }];
    expect(T.preservarPosicoes(novos, antigos)[0].pos).toBeUndefined();
  });
});

describe('alvoNoAlcance — tabuleiro é opcional', () => {
  const a = { pos: { x: 10, y: 10 } };
  // borda a borda: |10-13| − (3−1) = 1 célula de distância
  const b = { pos: { x: 13, y: 10 } };
  it('respeita o alcance quando os dois estão posicionados', () => {
    expect(T.alvoNoAlcance(a, b, 1)).toBe(true);
    expect(T.alvoNoAlcance(a, { pos: { x: 20, y: 10 } }, 1)).toBe(false);
  });
  it('quem não está no tabuleiro não é bloqueado por alcance', () => {
    expect(T.alvoNoAlcance(a, { pos: null }, 1)).toBe(true);
    expect(T.alvoNoAlcance({ pos: null }, b, 1)).toBe(true);
  });
});

describe('motivoMovimento — textos PT/EN', () => {
  it('traduz os códigos', () => {
    expect(T.motivoMovimento('fora_do_tabuleiro', false)).toBe('Destino fora do tabuleiro.');
    expect(T.motivoMovimento('fora_do_tabuleiro', true)).toBe('Destination outside the board.');
    expect(T.motivoMovimento('celula_ocupada', false)).toBe('Célula ocupada.');
  });
  it('código desconhecido devolve ele mesmo', () => {
    expect(T.motivoMovimento('xyz', false)).toBe('xyz');
  });
});

/* ── Integração com o snapshot de combate ───────────────────────────── */
describe('montarSnapshots semeia o tabuleiro', () => {
  // Fake compartilhado — modela `.range()`, que montarSnapshots passou a usar
  // quando a leitura do catálogo virou paginada (01/09/2026).
  const fake = fakeSupabase;
  const LOBO = {
    id: 74, nome: 'Lobo Adulto', ataque: 'Presas', armadura: 'M', defesa: 3,
    absorcao: 0, velocidade: 25, energia_fisica: 17, energia_heroica: 40,
    estagio: 2, fisico: 2, aura: 0, tipo: 'Animal',
    dano_l: 6, dano_m: 5, dano_p: 4, dano_100: 11,
  };
  const montar = (parte) => {
    globalThis.supabaseClient = fake({ criaturas: [LOBO], itens: [] });
    return window.montarSnapshots([{ tipo: 'criatura', ref_id: 74, nome: 'Lobo Adulto', ...parte }], null);
  };

  it('sem posição prévia entra na bancada com movimento cheio', async () => {
    const [s] = await montar({});
    expect(s.pos).toBe(null);
    expect(s.mov_rest).toBe(6);          // max(5, floor(25 × 5/20)) = 6
    expect(s.raca).toBe('Animal');       // criatura usa o tipo como "raça" do token
    expect(s.foto_url).toBe(null);
  });

  it('posição válida é HERDADA (reabrir batalha não devolve o token à bancada)', async () => {
    const [s] = await montar({ pos: { x: 12, y: 7 } });
    expect(s.pos).toEqual({ x: 12, y: 7 });
  });

  it('posição inválida é descartada em vez de entrar torta no snapshot', async () => {
    const [s] = await montar({ pos: { x: 69, y: 7 } });   // 69+3 = 72 > 70
    expect(s.pos).toBe(null);
  });
});

describe('processarViradaDeRodada repõe o movimento', () => {
  it('ativo recupera PA e movimento cheios', () => {
    const p = { status: 'ativo', pa_max: 2, pa_rest: 0, vb: 20, mov_rest: 1 };
    const r = window.MotorBatalha.processarViradaDeRodada(p);
    expect(r.participante.pa_rest).toBe(2);
    expect(r.participante.mov_rest).toBe(5);    // max(5, floor(20 × 5/20))
  });

  // 01/09/2026: velocidade acima de 30 passou a dar uma ação extra — regra do
  // sistema, lida da descrição da magia Velocidade ("Se sua velocidade
  // ultrapassar 30, você terá uma segunda ação na mesma rodada"). Este caso
  // usava vb 40 só para exercitar o movimento, e por isso passou a receber o
  // PA extra; virou dois casos, um para cada regra.
  it('acima de 30 de velocidade ganha a ação extra', () => {
    const p = { status: 'ativo', pa_max: 2, pa_rest: 0, vb: 40, mov_rest: 1 };
    const r = window.MotorBatalha.processarViradaDeRodada(p);
    expect(r.participante.pa_rest).toBe(3);     // pa_max 2 + 1
    expect(r.participante.mov_rest).toBe(10);   // floor(40 × 5/20)
  });
  it('desmaiado NÃO recupera movimento', () => {
    const p = { status: 'desmaiado', pa_max: 2, pa_rest: 0, vb: 40, mov_rest: 1 };
    const r = window.MotorBatalha.processarViradaDeRodada(p);
    expect(r.participante.mov_rest).toBe(1);
  });
});

describe('destinoAlcancavel — o clique não precisa mais cair numa célula legal', () => {
  const andarilho = (extra) => ({
    tipo: 'pj', ref_id: 'x', nome: 'Andarilho',
    pos: { x: 10, y: 10 }, status: 'ativo', vb: 20, mov_rest: 5, pa_rest: 3,
    ...extra,
  });

  it('clique dentro do alcance devolve exatamente a célula clicada', () => {
    const d = T.destinoAlcancavel(andarilho(), { x: 13, y: 10 }, []);
    expect(d).toEqual({ x: 13, y: 10 });
  });

  it('clique longe demais anda o máximo NAQUELA direção, em vez de recusar', () => {
    const d = T.destinoAlcancavel(andarilho(), { x: 40, y: 10 }, []);
    expect(d).toEqual({ x: 15, y: 10 });          // 5 células de mov_rest
    expect(T.distanciaCelulas({ x: 10, y: 10 }, d)).toBe(5);
  });

  it('a direção diagonal é preservada na projeção', () => {
    const d = T.destinoAlcancavel(andarilho(), { x: 30, y: 30 }, []);
    expect(T.distanciaCelulas({ x: 10, y: 10 }, d)).toBe(5);
    expect(d.x - 10).toBe(d.y - 10);
  });

  it('destino ocupado recua pela mesma reta até a primeira célula livre', () => {
    const bloqueio = { tipo: 'pj', ref_id: 'y', pos: { x: 15, y: 10 }, status: 'ativo' };
    const d = T.destinoAlcancavel(andarilho(), { x: 15, y: 10 }, [bloqueio]);
    expect(d).not.toBeNull();
    expect(T.celulaOcupada(d, [bloqueio], andarilho())).toBe(false);
    expect(T.distanciaCelulas({ x: 10, y: 10 }, d)).toBeLessThan(5);
  });

  it('morto no caminho não bloqueia — celulaOcupada já o ignora', () => {
    const morto = { tipo: 'pj', ref_id: 'y', pos: { x: 15, y: 10 }, status: 'morto' };
    expect(T.destinoAlcancavel(andarilho(), { x: 15, y: 10 }, [morto])).toEqual({ x: 15, y: 10 });
  });

  it('clicar na própria célula não vira movimento', () => {
    expect(T.destinoAlcancavel(andarilho(), { x: 10, y: 10 }, [])).toBeNull();
  });

  it('sem posição no tabuleiro não há projeção', () => {
    expect(T.destinoAlcancavel(andarilho({ pos: null }), { x: 12, y: 10 }, [])).toBeNull();
  });

  it('NÃO afrouxa a regra: validarMovimento continua recusando destino fora de alcance', () => {
    const v = T.validarMovimento(andarilho(), { x: 40, y: 10 }, []);
    expect(v).toEqual({ ok: false, motivo: 'sem_movimento' });
  });
});

describe('posicionarMenu — o painel de ação não deve rolar', () => {
  /* Pedido do usuário (01/09/2026): "o card modal com as ações em combate não
     deve ter barra de rolagem".

     A causa: o menu do token limitava a própria altura ao espaço que sobrava
     ENTRE o token e a borda da tela (piso de 140px). Com o painel de Ação
     dentro — abas, dois selects, prévia de efeito e rodapé — isso passa de
     300px fácil, e todo token na metade de baixo do tabuleiro abria um painel
     espremido, com rolagem interna. Foi o que aconteceu ao testar a batalha
     84: precisei rolar dentro do painel pra alcançar o botão "Usar".

     A regra nova: o menu prefere o token, mas quando não cabe nem embaixo nem
     em cima ele DESGRUDA e se prende ao viewport, inteiro. Rolagem só sobra
     quando o painel é maior que a própria janela. */
  const T = () => window.MotorTabuleiro;
  const tokenEm = (top, altura = 44) => ({ top, bottom: top + altura, left: 500, width: 44 });

  it('cabendo embaixo, abre sob o token', () => {
    const r = T().posicionarMenu(tokenEm(100), 300, 900);
    expect(r.modo).toBe('abaixo');
    expect(r.y).toBe(152);            // bottom(144) + 8
  });

  it('não cabendo embaixo mas cabendo em cima, sobe', () => {
    // Token embaixo: 700..744 numa janela de 800. Abaixo sobram 44px.
    const r = T().posicionarMenu(tokenEm(700), 300, 800);
    expect(r.modo).toBe('acima');
    expect(r.y).toBe(692);            // top(700) - 8
  });

  it('não cabendo em lado nenhum, PRENDE no viewport em vez de espremer', () => {
    // Token no meio: nem acima nem abaixo cabem 500px numa janela de 700.
    const r = T().posicionarMenu(tokenEm(330), 500, 700);
    expect(r.modo).toBe('preso');
    // Inteiro dentro da janela, com margem.
    expect(r.y).toBeGreaterThanOrEqual(12);
    expect(r.y + 500).toBeLessThanOrEqual(700 - 12 + 1);
  });

  it('a altura máxima é a JANELA, não a fresta ao lado do token', () => {
    // Era isto que criava a rolagem: maxH virava ~44px de espaço disponível.
    const r = T().posicionarMenu(tokenEm(700), 500, 800);
    expect(r.maxH).toBe(800 - 24);
    expect(r.maxH).toBeGreaterThan(500);   // o painel inteiro cabe
  });

  it('painel maior que a janela: aí sim rola, e começa no topo', () => {
    const r = T().posicionarMenu(tokenEm(300), 2000, 700);
    expect(r.modo).toBe('preso');
    expect(r.y).toBe(12);
    expect(r.maxH).toBe(700 - 24);
  });

  it('token colado no topo abre pra baixo', () => {
    const r = T().posicionarMenu(tokenEm(0), 300, 900);
    expect(r.modo).toBe('abaixo');
  });
});

describe('parseAlcance — Pessoal não é Toque', () => {
  /* 62 magias têm alcance Pessoal e 65 têm Toque; tratá-las igual fazia uma
     magia "só em si mesmo" aceitar alvo adjacente. Spec §7.3. */
  it('Pessoal é 0 — só o próprio conjurador', () => {
    expect(T.parseAlcance('Pessoal')).toBe(0);
  });

  it('Toque continua 1 — adjacente', () => {
    expect(T.parseAlcance('Toque')).toBe(1);
  });

  it('corpo a corpo continua 1', () => {
    expect(T.parseAlcance('Corpo a corpo')).toBe(1);
  });

  it('distância em metros não muda', () => {
    expect(T.parseAlcance('20 metros')).toBe(20);
  });

  it('alcanceDaAcao não transforma o 0 de Pessoal em 1', () => {
    // O `|| 1` antigo fazia exatamente isso e anulava a correção.
    expect(T.alcanceDaAcao({ magia: { alcance: 'Pessoal' } })).toBe(0);
  });

  it('alcanceDaAcao ainda dá 1 para magia sem alcance declarado', () => {
    expect(T.alcanceDaAcao({ magia: { alcance: null } })).toBe(1);
  });

  it('dentroDoAlcance aceita 0 sem virar 1', () => {
    /* O piso de dentroDoAlcance era 1; com 0 ele deixa de somar uma célula de
       folga. Note que 0 NÃO significa "só eu" no tabuleiro: distanciaBordas
       desconta TAB_TOKEN-1, então dois tokens 3×3 encostados já dão 0.

       Restringir a si mesmo é IDENTIDADE, não distância — quem faz isso é a
       flag `pessoal` de magiasDeApoioDoAtor (batalha.jsx), e é lá que a regra
       tem que continuar. O 0 aqui só tira a folga extra. */
    expect(T.dentroDoAlcance({ x: 3, y: 3 }, { x: 3, y: 3 }, 0)).toBe(true);
    expect(T.dentroDoAlcance({ x: 3, y: 3 }, { x: 7, y: 3 }, 0)).toBe(false);
    expect(T.dentroDoAlcance({ x: 3, y: 3 }, { x: 7, y: 3 }, 1)).toBe(false);
    expect(T.dentroDoAlcance({ x: 3, y: 3 }, { x: 6, y: 3 }, 1)).toBe(true);
  });
});
