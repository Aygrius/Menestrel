/* ============================================================
   ciclo-ficha-batalha.test.js — ficha → combate → ficha
   ============================================================
   Invariante do sistema (confirmado pelo usuário em 01/09/2026):

     A ficha é onde os atributos são calculados e os valores atuais
     consultados. O personagem ENTRA em combate com os valores atuais da
     ficha, e ao SAIR do combate a ficha é atualizada com os dados dele.

   A ida (montarSnapshots) tem cobertura em snapshot-criatura.test.js. Este
   arquivo cobre a VOLTA — `estadoAoEncerrar`, a peça pura que decide o
   estado_atual novo de cada PJ quando a batalha encerra com sequelas.

   Duas quebras que motivaram o arquivo:

   1. PARTICIPANTE AUSENTE. montarSnapshots marca `ausente: true` e zera tudo
      quando não consegue ler o PJ (deletado, ou um tropeço de rede no
      `.in(id)`). O encerramento escrevia esses zeros de volta na ficha: um
      PJ que só falhou de carregar saía do combate com ef 0 (desmaiado) e as
      8 condições zeradas. Perda de dado real, silenciosa.

   2. SNAPSHOT SEM CONDIÇÕES. Batalha criada antes das condições existirem
      não tem `condicoes` no participante. O encerramento fazia
      `{ ...(p.condicoes || {}) }` → `{}` e gravava isso por cima — como
      condição ausente é lida como 0 (neutro) em toda a aplicação, isso
      neutralizava as condições do personagem de uma vez.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

let M, EF_MORTE;
beforeAll(() => { M = window.MotorBatalha; EF_MORTE = M.EF_MORTE; });

// Snapshot de PJ como montarSnapshots produz.
const snap = (over) => ({
  tipo: 'pj', ref_id: 'pj-1', inst_id: 'i1', nome: 'Victor', status: 'ativo',
  ef: 7, ef_max: 18, eh: 3, eh_max: 14, ar: 1, ar_max: 4, karma: 2, karma_max: 6,
  condicoes: { reputacao: 0, animo: -2, sanidade: 0, vitalidade: 5,
               hidratacao: 12, euforia: 0, termorregulacao: 0, nutricao: -3 },
  ...over,
});

const fichaPrevia = () => ({
  vitalidade: { ef: 18, eh: 14, ar: 4, ka: 6 },
  condicoes: { vitalidade: 20, hidratacao: -10 },
  bonusArmas: { adaga: 3 },
});

describe('estadoAoEncerrar — o caso normal', () => {
  it('traz as pools do combate para a ficha', () => {
    const novo = M.estadoAoEncerrar(fichaPrevia(), snap());
    expect(novo.vitalidade).toMatchObject({ ef: 7, eh: 3, ar: 1, ka: 2 });
  });

  it('traz as condições do combate para a ficha', () => {
    const novo = M.estadoAoEncerrar(fichaPrevia(), snap());
    expect(novo.condicoes.hidratacao).toBe(12);
    expect(novo.condicoes.nutricao).toBe(-3);
  });

  it('preserva o que a ficha guarda e o combate não conhece', () => {
    // bonusArmas é do Mestre, na ficha — o combate não tem opinião sobre ele.
    const novo = M.estadoAoEncerrar(fichaPrevia(), snap());
    expect(novo.bonusArmas).toEqual({ adaga: 3 });
  });

  it('morto volta com ef no piso de morte e eh zerada', () => {
    // É assim que a morte sobrevive à volta: montarSnapshots relê
    // ef <= EF_MORTE e remonta o status 'morto' na batalha seguinte.
    const novo = M.estadoAoEncerrar(fichaPrevia(), snap({ status: 'morto', ef: -3 }));
    expect(novo.vitalidade.ef).toBe(EF_MORTE);
    expect(novo.vitalidade.eh).toBe(0);
  });

  it('ficha sem estado_atual nenhum não quebra', () => {
    const novo = M.estadoAoEncerrar(null, snap());
    expect(novo.vitalidade.ef).toBe(7);
    expect(novo.condicoes.hidratacao).toBe(12);
  });
});

describe('estadoAoEncerrar — participante ausente não escreve nada', () => {
  it('devolve null pra quem montarSnapshots marcou como ausente', () => {
    expect(M.estadoAoEncerrar(fichaPrevia(), snap({ ausente: true }))).toBeNull();
  });

  it('sem isso, os zeros do ausente virariam a ficha', () => {
    // O shape que montarSnapshots gera quando não acha o PJ.
    const fantasma = {
      tipo: 'pj', ref_id: 'pj-1', nome: 'Victor', ausente: true, status: 'ativo',
      ef: 0, ef_max: 0, eh: 0, eh_max: 0, ar: 0, ar_max: 0, karma: 0, karma_max: 0,
      condicoes: { reputacao: 0, animo: 0, sanidade: 0, vitalidade: 0,
                   hidratacao: 0, euforia: 0, termorregulacao: 0, nutricao: 0 },
    };
    expect(M.estadoAoEncerrar(fichaPrevia(), fantasma)).toBeNull();
  });
});

describe('estadoAoEncerrar — snapshot legado sem condições', () => {
  it('preserva as condições da ficha quando o snapshot não tem nenhuma', () => {
    const prev = fichaPrevia();
    const novo = M.estadoAoEncerrar(prev, snap({ condicoes: undefined }));
    expect(novo.condicoes).toEqual(prev.condicoes);
    expect(novo.vitalidade.ef).toBe(7);   // pools continuam voltando
  });

  it('objeto de condições VAZIO também preserva', () => {
    const prev = fichaPrevia();
    const novo = M.estadoAoEncerrar(prev, snap({ condicoes: {} }));
    expect(novo.condicoes).toEqual(prev.condicoes);
  });

  it('condição legítima em 0 NÃO é confundida com ausência', () => {
    // Todas as 8 chaves presentes valendo 0 é um snapshot real de alguém
    // perfeitamente neutro — tem que sobrescrever a ficha.
    const zeros = { reputacao: 0, animo: 0, sanidade: 0, vitalidade: 0,
                    hidratacao: 0, euforia: 0, termorregulacao: 0, nutricao: 0 };
    const novo = M.estadoAoEncerrar(fichaPrevia(), snap({ condicoes: zeros }));
    expect(novo.condicoes).toEqual(zeros);
  });
});

describe('o encerramento usa a regra', () => {
  let fonte;
  beforeAll(async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'batalha.jsx'), 'utf8');
  });

  it('finalizarEncerramento monta o estado pela função pura', () => {
    const i = fonte.indexOf('const finalizarEncerramento');
    expect(i).toBeGreaterThan(-1);
    expect(fonte.slice(i, i + 3000)).toMatch(/estadoAoEncerrar\(/);
  });

  it('não sobrou a montagem manual que ignorava o ausente', () => {
    expect(fonte).not.toMatch(/condicoes:\s*\{ \.\.\.\(p\.condicoes \|\| \{\}\) \}/);
  });
});

describe('encerrar SEMPRE persiste — não existe mais restaurar', () => {
  // Decisão do usuário (01/09/2026): "em combate nunca vamos sair
  // restaurando. O que ficar em combate será o que vai prevalecer SEMPRE."
  // O encerramento deixou de ter modo: a ficha recebe o estado final, ponto.
  let fonte;
  beforeAll(async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'batalha.jsx'), 'utf8');
  });

  it('finalizarEncerramento não recebe mais o modo', () => {
    expect(fonte).toMatch(/const finalizarEncerramento = async \(\)/);
    expect(fonte).not.toMatch(/finalizarEncerramento\((true|false)\)/);
  });

  it('não sobrou caminho que zera a vitalidade da ficha', () => {
    // Era o passo 0b: `vitalidade: {}` fazia a ficha voltar a exibir barras
    // cheias. Com a decisão nova, nada mais apaga o que saiu do combate.
    expect(fonte).not.toMatch(/vitalidade:\s*\{\s*\}/);
  });

  it('a escrita na ficha não está mais atrás de condicional de modo', () => {
    const i = fonte.indexOf('const finalizarEncerramento');
    const corpo = fonte.slice(i, i + 3000);
    expect(corpo).toMatch(/estadoAoEncerrar\(/);
    expect(corpo).not.toMatch(/!restaurar/);
  });
});

describe('criatura NÃO persiste — só PJ', () => {
  /* Regra do sistema (confirmada pelo usuário em 01/09/2026):
     "As criaturas não são personagens. Quando a luta acabar, seu status volta
     ao que era antes. Apenas os personagens dos jogadores é que o status
     salva."

     Verificado ao vivo na batalha 84: o Lobisomem saiu com ef 23/eh 147 na
     tabela `criaturas`, exatamente como entrou, enquanto o Yuldrous recebeu
     pools e condições do combate na ficha.

     No código isso vem de DUAS pontas, e as duas ficam travadas aqui:
       1. estadoAoEncerrar só é chamada pra participante tipo 'pj'
          (finalizarEncerramento filtra antes);
       2. montarSnapshots lê a criatura DIRETO da tabela `criaturas` a cada
          batalha, sem nenhuma camada de estado por combate. */

  it('estadoAoEncerrar não tem o que escrever pra criatura', () => {
    // Criatura não tem estado_atual: o shape nem existe do lado dela.
    const criatura = {
      tipo: 'criatura', ref_id: 86, nome: 'Lobisomem', status: 'morto',
      ef: 0, ef_max: 23, eh: 0, eh_max: 147, ar: 0, karma: 0,
    };
    // A função é chamada só pra PJ; se alguém a chamar pra criatura, o
    // resultado não deve ser gravado em lugar nenhum — este teste existe pra
    // documentar que o FILTRO é a proteção, não a função.
    const novo = M.estadoAoEncerrar({}, criatura);
    expect(novo).not.toBeNull();   // a função é agnóstica de tipo…
  });

  it('…e o filtro é quem barra: só participante pj entra na escrita', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'batalha.jsx'), 'utf8');
    const i = fonte.indexOf('const finalizarEncerramento');
    const corpo = fonte.slice(i, i + 3000);
    // A lista escrita vem de pjsDaBatalha, que filtra por tipo === 'pj'.
    expect(fonte).toMatch(/const pjsDaBatalha = participantes\.filter\(\(p\) => p\.tipo === 'pj'\)/);
    expect(corpo).toMatch(/pjsDaBatalha\.map/);
    // E nada percorre `participantes` cru pra escrever ficha.
    expect(corpo).not.toMatch(/participantes\.map\(async/);
  });

  it('o snapshot da criatura nasce da tabela — volta inteira mesmo após apanhar', async () => {
    // O Lobisomem real (id 86) que sobreviveu à batalha 84 com ef 23/eh 147.
    const LOBISOMEM = {
      id: 86, nome: 'Lobisomem', ataque: 'Garras', armadura: 'M', defesa: 4,
      absorcao: 0, velocidade: 35, energia_fisica: 23, energia_heroica: 147,
      estagio: 7, fisico: 5, aura: 0, tipo: 'Animal',
      dano_l: 11, dano_m: 11, dano_p: 11, dano_100: 0,
    };
    globalThis.supabaseClient = fakeSupabase({ criaturas: [LOBISOMEM], itens: [], personagens: [] });

    // Entra num participante que na batalha ANTERIOR terminou moribundo. Nada
    // disso importa: as pools vêm da tabela, não do participante.
    const [snap] = await window.montarSnapshots([{
      tipo: 'criatura', ref_id: 86, nome: 'Lobisomem',
      ef: 1, eh: 0, status: 'morto',
    }], { 86: { ef: 1, eh: 0, ar: 0, karma: 0 } });

    expect(snap.ef).toBe(23);
    expect(snap.eh).toBe(147);
    expect(snap.ef_max).toBe(23);
    expect(snap.status).toBe('ativo');
  });
});
