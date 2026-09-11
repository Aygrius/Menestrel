/* ============================================================
   concentracao-dano.test.js — levar dano derruba a magia sustentada
   ============================================================
   A regra (quebrarConcentracao, 12-batalha/batalha.jsx): sustentar uma
   magia de duração Variável exige não fazer mais nada. Entre os gatilhos
   que a derrubam estão "levar dano que chegue na EF" e "desmaiar/morrer".
   Dano contido inteiramente por EH ou AR NÃO quebra — a cascata é
   EH → AR → EF, e a regra é dano na Energia Física.

   Dois buracos que motivaram o arquivo (auditoria 01/09/2026):

   1. O dano MANUAL do Mestre (aplicarDano) não quebrava nada — nem ao
      chegar na EF, nem ao derrubar/matar. É o caminho mais usado para dano
      vindo de fora do motor (queda, armadilha, narrativa), então era o
      furo mais fácil de encostar: a vítima morria e o buff que ela
      sustentava seguia ativo no alvo até o fim da batalha.

   2. aplicarAcao e handleAcao só olhavam a EF. Quem zera a EH DESMAIA sem
      a EF ser tocada, e desmaiar quebra por si só — esse caso escapava dos
      dois lados.

   `quebrarConcentracaoPorDano` é a regra única que os três passaram a usar.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; expect(M).toBeDefined(); });

const lutador = (nome, ordem, extra) => ({
  tipo: 'pj', ref_id: nome, inst_id: nome, nome, ordem,
  status: 'ativo', atual: false, vb: 20,
  pa_max: 2, pa_rest: 2, mov_rest: 5, moveu_na_rodada: false,
  ef: 10, ef_max: 10, eh: 5, eh_max: 5, ar: 3, ar_max: 3, karma: 0, karma_max: 0,
  // res entrou em 11/09/2026 com o modelo de limiar + durabilidade.
  res: 6, res_max: 6,
  status_temp: [], ...extra,
});

// Buff sustentado por `ator` — shape que aplicarEfeitoApoio gera.
const sustentado = (ator) => ({
  id: 'mag:velocidade:x', nome: 'Velocidade', icone: '🌀',
  rodadas_rest: null, efeito: { tipo: 'mod_vb', valor: 10 },
  concentracao: { ator, magia_key: 'velocidade' },
});

// Aplica `dano` no participante `alvo` e devolve o array já processado pela
// regra — reproduz o que os três call sites fazem.
function levarDano(participantes, alvoNome, dano, critico) {
  const i = participantes.findIndex((p) => p.nome === alvoNome);
  const antes = participantes[i];
  const depois = M.aplicarDanoCascata(dano, antes, !!critico);
  const arr = participantes.map((p, k) => (k === i ? depois : p));
  return M.quebrarConcentracaoPorDano(arr, antes, depois);
}

describe('quebrarConcentracaoPorDano — o que NÃO quebra', () => {
  it('dano contido na EH não quebra', () => {
    // EH 5, dano 3: sobra EH, a EF nem é tocada.
    const arr = [lutador('A', 1, { status_temp: [sustentado('A')] })];
    const r = levarDano(arr, 'A', 3);
    expect(r[0].eh).toBe(2);
    expect(r[0].status_temp).toHaveLength(1);
  });

  it('dano contido pelo limiar da armadura (crítico pula a EH) não quebra', () => {
    // Crítico pula a EH e bate no limiar 3. Dano 2 <= 3: bloqueado inteiro,
    // sem custar nem resistência. A EF nem é tocada, então nada quebra.
    const arr = [lutador('A', 1, { status_temp: [sustentado('A')] })];
    const r = levarDano(arr, 'A', 2, true);
    expect(r[0].ar, 'o limiar não se gasta').toBe(3);
    expect(r[0].res, 'nem a resistência, porque não furou').toBe(6);
    expect(r[0].ef).toBe(10);
    expect(r[0].status_temp).toHaveLength(1);
  });

  it('golpe que FURA o limiar mas para na resistência também não quebra', () => {
    // Dano 9 > limiar 3: gasta 1 de resistência e a EF segue intacta. É o
    // caso novo do modelo — antes esse golpe teria chegado na EF.
    const arr = [lutador('A', 1, { status_temp: [sustentado('A')] })];
    const r = levarDano(arr, 'A', 9, true);
    expect(r[0].res).toBe(5);
    expect(r[0].ef).toBe(10);
    expect(r[0].status_temp, 'a magia continua de pé').toHaveLength(1);
  });

  it('sem motivo pra quebrar devolve o MESMO array', () => {
    // Checado direto na regra: o helper levarDano faz .map(), que sempre cria
    // array novo, então a identidade só é observável aqui. Os chamadores usam
    // isso pra decidir se vale persistir.
    const p = lutador('A', 1, { status_temp: [sustentado('A')] });
    const arr = [p];
    expect(M.quebrarConcentracaoPorDano(arr, p, p)).toBe(arr);
    // Nem antes nem depois → também não mexe.
    expect(M.quebrarConcentracaoPorDano(arr, null, p)).toBe(arr);
    expect(M.quebrarConcentracaoPorDano(arr, p, null)).toBe(arr);
  });
});

describe('quebrarConcentracaoPorDano — o que quebra', () => {
  it('dano que chega na EF quebra — e agora só chega com a armadura quebrada', () => {
    // A EH come 5; sobram 5 contra o limiar 3. Com resistência ZERADA a
    // armadura não segura mais nada e os 5 vão inteiros na EF.
    const arr = [lutador('A', 1, { status_temp: [sustentado('A')], res: 0 })];
    const r = levarDano(arr, 'A', 10);
    expect(r[0].ef).toBe(5);
    expect(r[0].status_temp).toHaveLength(0);
  });

  it('zerar a EH desmaia e quebra, mesmo sem a EF ser tocada', () => {
    // O buraco nº 2: EH 5, AR 0, dano exatamente 5 → EH zera, EF intacta.
    // Olhar só a EF deixava passar; desmaiar quebra por si só.
    const arr = [lutador('A', 1, { ar: 0, ar_max: 0, status_temp: [sustentado('A')] })];
    const r = levarDano(arr, 'A', 5);
    expect(r[0].ef).toBe(10);          // EF não foi tocada
    expect(r[0].status).toBe('desmaiado');
    expect(r[0].status_temp).toHaveLength(0);
  });

  it('morrer quebra — com a armadura já vencida', () => {
    const arr = [lutador('A', 1, { status_temp: [sustentado('A')], res: 0 })];
    const r = levarDano(arr, 'A', 99);
    expect(r[0].status).toBe('morto');
    expect(r[0].status_temp).toHaveLength(0);
  });

  /* CONSEQUÊNCIA DO MODELO NOVO, registrada de propósito: com a armadura
     inteira, NENHUM golpe único mata, por maior que seja. 99 de dano contra
     limiar 3 gasta 1 de resistência e para ali. Só depois de a resistência
     zerar o dano volta a chegar na EF.

     Isso é a regra pedida ("quando toda a durabilidade acabar é que o dano
     será na energia física"), não um bug — mas muda o combate: matar alguém
     de armadura passa a exigir tantos golpes quanto a resistência dela. */
  it('com a armadura inteira, um golpe gigante NÃO mata', () => {
    const arr = [lutador('A', 1, { status_temp: [sustentado('A')] })];
    const r = levarDano(arr, 'A', 99);
    expect(r[0].status, 'sobreviveu a 99 de dano').toBe('desmaiado');
    expect(r[0].res, 'custou 1 de resistência').toBe(5);
    expect(r[0].ef, 'a EF nem foi tocada').toBe(10);
  });

  it('derruba a magia no ALVO dela, não em quem apanhou', () => {
    // Quem sustenta é A; o buff mora no status_temp de B. A apanha → cai em B.
    const arr = [
      lutador('A', 1),
      lutador('B', 2, { status_temp: [sustentado('A')] }),
    ];
    const r = levarDano(arr, 'A', 10);
    expect(r[1].status_temp).toHaveLength(0);
  });

  it('não derruba a magia sustentada por outra pessoa', () => {
    const arr = [
      lutador('A', 1),
      lutador('B', 2, { status_temp: [sustentado('C')] }),
      lutador('C', 3),
    ];
    const r = levarDano(arr, 'A', 10);
    expect(r[1].status_temp).toHaveLength(1);
  });

  it('quem já estava desmaiado e leva mais dano na EF também quebra', () => {
    const arr = [lutador('A', 1, { status: 'desmaiado', eh: 0, ar: 0, status_temp: [sustentado('A')] })];
    const r = levarDano(arr, 'A', 4);
    expect(r[0].ef).toBe(6);
    expect(r[0].status_temp).toHaveLength(0);
  });
});

describe('os três caminhos de dano usam a regra', () => {
  // Era `fonte.slice(i, i + 2200)`: uma janela de tamanho fixo a partir da
  // declaração. Duas coisas erradas nisso — se o corpo passasse de 2200
  // caracteres o teste virava falso-negativo silencioso, e na prática ele
  // passou a LIMITAR quanto comentário cabe perto do ponto de dano (na Fase 2
  // um comentário de regra teve de ser encurtado para não estourar a janela).
  // Agora o corpo é delimitado por contagem de chaves: não há teto.
  const fonteDe = (nome) => {
    const i = fonte.indexOf(nome);
    expect(i, `${nome} precisa existir`).toBeGreaterThan(-1);
    const abre = fonte.indexOf('{', i);
    expect(abre, `${nome} precisa ter corpo`).toBeGreaterThan(-1);
    let nivel = 0;
    for (let j = abre; j < fonte.length; j += 1) {
      if (fonte[j] === '{') nivel += 1;
      else if (fonte[j] === '}') {
        nivel -= 1;
        if (nivel === 0) return fonte.slice(i, j + 1);
      }
    }
    throw new Error(`chaves desbalanceadas ao delimitar ${nome}`);
  };
  let fonte;
  beforeAll(async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'batalha.jsx'), 'utf8');
  });

  it('a edição manual de pool pelo Mestre passa pela regra', () => {
    // Era o buraco nº 1: o dano manual não chamava quebrarConcentracao nenhuma.
    // Em 01/09/2026 os botões coração viraram edição direta da barra
    // (aplicarPool) — a porta mudou de nome, a exigência não: baixar a EF na
    // mão tem que derrubar a magia igual a um golpe.
    expect(fonteDe('const aplicarPool = (idx, pool)')).toMatch(/quebrarConcentracaoPorDano/);
  });

  /* Os dois ataques chamavam quebrarConcentracaoPorDano diretamente. Em
     11/09/2026 o miolo do golpe (esquiva → cascata → quebra) virou
     aplicarGolpeEmAlvo, porque alvos_extras precisava do MESMO tratamento
     em cada alvo adicional e duplicar o bloco garantiria divergência.

     A exigência não mudou: todo caminho de dano passa pela regra. O que
     mudou é que agora ela é alcançada por uma indireção, então o teste
     segue a indireção em vez de baixar a régua — exige o elo dos dois
     lados. Aceitar só "o handler chama alguma coisa" seria enfraquecer. */
  it('o ataque do Mestre passa pela regra, via aplicarGolpeEmAlvo', () => {
    expect(fonteDe('const aplicarAcao = (payload)')).toMatch(/aplicarGolpeEmAlvo\(/);
  });

  it('o ataque do Jogador passa pela regra, via aplicarGolpeEmAlvo', () => {
    expect(fonteDe('const handleAcao = (payload)')).toMatch(/aplicarGolpeEmAlvo\(/);
  });

  it('e aplicarGolpeEmAlvo é quem chama a regra — o outro elo da corrente', () => {
    const corpo = fonteDe('function aplicarGolpeEmAlvo(');
    expect(corpo).toMatch(/quebrarConcentracaoPorDano/);
    expect(corpo, 'a esquiva continua dentro do mesmo caminho').toMatch(/consumirEvitaGolpe/);
  });

  it('os alvos EXTRAS passam pelo mesmo caminho, não por um atalho', () => {
    // Se alguém aplicar dano no alvo extra sem passar por aplicarGolpeEmAlvo,
    // o golpe giratório ignoraria esquiva e concentração só nos extras — o
    // tipo de buraco que só aparece em jogo.
    for (const nome of ['const aplicarAcao = (payload)', 'const handleAcao = (payload)']) {
      const corpo = fonteDe(nome);
      const trecho = corpo.slice(corpo.indexOf('alvos_extras'));
      expect(trecho, nome).toMatch(/aplicarGolpeEmAlvo\(/);
      expect(trecho, nome + ' não pode chamar a cascata direto')
        .not.toMatch(/aplicarDanoCascata\(/);
    }
  });

  it('ninguém ficou com a checagem antiga de só-EF', () => {
    // A comparação manual `.ef < ....ef` era o que deixava passar o desmaio
    // por EH zerada. Se voltar, é sinal de que alguém recriou o buraco.
    expect(fonte).not.toMatch(/next\[alvoIdx\]\.ef < participantes\[alvoIdx\]\.ef/);
  });
});

describe('veneno: dano por rodada também derruba a concentração', () => {
  // Decisão do usuário (01/09/2026): "dano na EF quebra a concentração, ou
  // seja, veneno quebra". O dano_por_rodada vai DIRETO na EF (ignora EH e AR),
  // então cai na mesma regra dos golpes.
  //
  // A consequência de ORDEM importa: a magia que cai muda o vb de quem a
  // recebia, e é o vb que define movimento, ação extra e iniciativa da rodada
  // nova. Por isso a quebra é resolvida ANTES da renovação de recursos.
  const envenenado = (nome, ordem, extra) => lutador(nome, ordem, {
    status_temp: [{ id: 'v1', nome: 'Envenenado', rodadas_rest: 3,
                    efeito: { tipo: 'dano_por_rodada', valor: 4 } }],
    ...extra,
  });

  it('quem sustenta magia e é envenenado a perde na virada', () => {
    const arr = [
      envenenado('A', 1),
      lutador('B', 2, { status_temp: [sustentado('A')] }),
    ];
    const { participantes } = M.montarNovaRodada(arr);
    const b = participantes.find((p) => p.nome === 'B');
    expect(b.status_temp).toHaveLength(0);
  });

  it('o veneno continua mordendo — a quebra não substitui o dano', () => {
    const arr = [envenenado('A', 1, { ef: 10 })];
    const { participantes, eventos } = M.montarNovaRodada(arr);
    expect(participantes[0].ef).toBe(6);
    expect(eventos).toHaveLength(1);
  });

  it('quem NÃO está envenenado mantém a magia que sustenta', () => {
    const arr = [
      lutador('A', 1),
      lutador('B', 2, { status_temp: [sustentado('A')] }),
    ];
    const { participantes } = M.montarNovaRodada(arr);
    expect(participantes.find((p) => p.nome === 'B').status_temp).toHaveLength(1);
  });

  it('morto e desistente não sofrem veneno, logo não quebram nada', () => {
    const arr = [
      envenenado('A', 1, { status: 'morto' }),
      lutador('B', 2, { status_temp: [sustentado('A')] }),
    ];
    const { participantes } = M.montarNovaRodada(arr);
    expect(participantes.find((p) => p.nome === 'B').status_temp).toHaveLength(1);
  });

  it('a magia cai ANTES da renovação: o alvo perde o bônus de movimento', () => {
    // B recebia +10 de vb. Se a quebra viesse depois da renovação, B entraria
    // na rodada nova com movimento calculado sobre vb 30 — bônus de uma magia
    // que já tinha caído.
    const MT = window.MotorTabuleiro;
    const arr = [
      envenenado('A', 1),
      lutador('B', 2, { vb: 20, status_temp: [sustentado('A')] }),
    ];
    const { participantes } = M.montarNovaRodada(arr);
    const b = participantes.find((p) => p.nome === 'B');
    expect(b.mov_rest).toBe(MT.movimentoBase(20));
    expect(b.mov_rest).not.toBe(MT.movimentoBase(30));
  });

  it('e também perde a ação extra de velocidade > 30', () => {
    // Regra do sistema: vb acima de 30 dá uma segunda ação na rodada. Com a
    // magia caindo antes da renovação, o alvo não a ganha.
    const MT = window.MotorTabuleiro;
    expect(MT.movimentoBase).toBeTypeOf('function');
    const arr = [
      envenenado('A', 1),
      lutador('B', 2, { vb: 25, pa_max: 2, status_temp: [sustentado('A')] }),
    ];
    const { participantes } = M.montarNovaRodada(arr);
    const b = participantes.find((p) => p.nome === 'B');
    expect(b.pa_rest).toBe(2);   // 2 + 0; com o buff seria 35 de vb → 3
  });
});
