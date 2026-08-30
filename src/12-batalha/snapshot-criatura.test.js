/* ============================================================
   snapshot-criatura.test.js — montarSnapshots (INTEGRAÇÃO leve)
   ============================================================
   Diferente de motor-batalha.test.js (funções puras), aqui a função sob
   teste é async e lê o banco. O stub de supabaseClient do setup-fases.ts
   explode de propósito em teste unitário — este arquivo TROCA o stub por
   um fake em memória, como o próprio setup autoriza.

   Bug que motivou o arquivo (batalha 82, 30/08/2026):
   o snapshot lia `criaturas.tipo_armadura`, coluna que existe na tabela
   mas está NULL nas 207 criaturas. O tipo real mora em `criaturas.armadura`
   (L/M/P), que é o que o formulário de criatura grava e a ficha exibe
   fundido com a defesa ("M4"). Resultado: TODA criatura defendia como Leve
   e o atacante caía na coluna L — 89 das 207 criaturas são M ou P.
   ============================================================ */
import { describe, it, expect, afterEach } from 'vitest';
import './batalha.jsx';

const stubOriginal = globalThis.supabaseClient;
afterEach(() => { globalThis.supabaseClient = stubOriginal; });

// Fake mínimo no formato do supabase-js: `.from(t).select('*')` é awaitable
// e também encadeia `.in(col, ids)`.
function fakeSupabase(tabelas) {
  const resultado = (nome) => {
    const box = {
      in: () => box,
      eq: () => box,
      then: (res, rej) => Promise.resolve({ data: tabelas[nome] || [], error: null }).then(res, rej),
    };
    return box;
  };
  return { from: (nome) => ({ select: () => resultado(nome) }) };
}

// Linha real de criaturas.id 86 (Lobisomem), reduzida aos campos usados.
const LOBISOMEM = {
  id: 86,
  nome: 'Lobisomem',
  ataque: 'Garras',
  armadura: 'M',        // ← tipo de armadura REAL
  tipo_armadura: null,  // ← coluna existe, NULL nas 207 criaturas
  defesa: 4,
  absorcao: 0,
  velocidade: 35,
  energia_fisica: 23,
  energia_heroica: 147,
  dano_l: 11, dano_m: 11, dano_p: 11,
  dano_25: 0, dano_50: 0, dano_75: 0, dano_100: 0,
};

const montar = (criatura) => {
  globalThis.supabaseClient = fakeSupabase({ criaturas: [criatura], itens: [] });
  return window.montarSnapshots([{ tipo: 'criatura', ref_id: criatura.id, nome: criatura.nome }], null);
};

describe('montarSnapshots — defesa da criatura', () => {
  it('usa criaturas.armadura como sigla (não tipo_armadura, que é NULL)', async () => {
    const [snap] = await montar(LOBISOMEM);
    expect(snap.defesa_sigla).toBe('M');
    expect(snap.defesa_valor).toBe(4);
  });

  it('armadura P vira sigla P', async () => {
    const [snap] = await montar({ ...LOBISOMEM, armadura: 'P' });
    expect(snap.defesa_sigla).toBe('P');
  });

  it('cai em L só quando a criatura não tem armadura declarada', async () => {
    const [snap] = await montar({ ...LOBISOMEM, armadura: null });
    expect(snap.defesa_sigla).toBe('L');
  });

  it('a sigla do snapshot manda na coluna escolhida pelo atacante', async () => {
    const [snap] = await montar(LOBISOMEM);
    // Marreta de Guerra na ficha do Yuldrous: L 2 / M 6 / P 10 (bonus_ga já somado).
    const marreta = { dano_l: -2, dano_m: 2, dano_p: 6, bonus_ga: 4 };
    // Com armadura M e defesa 4 → (2+4) − 4 = 2. Lendo tipo_armadura dava L: (−2+4) − 4 = −2.
    expect(window.MotorBatalha.colunaAtaque(marreta, snap)).toBe(2);
  });
});
