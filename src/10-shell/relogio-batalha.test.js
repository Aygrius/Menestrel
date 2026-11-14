/* ============================================================
   relogio-batalha.test.js — o relógio anda com a batalha (14/11/2026)
   ============================================================
   "Esse cálculo pode ser usado para passar o tempo de forma automática depois
   da batalha" (usuário). O encerramento chama avancarRelogioDaMesa com a
   duração da luta. Os minutos ficam no jsonb (`minuto`); a fome e a sede
   seguem por hora cheia. Com o relógio montado (cobrador registrado), a
   cobrança sai na hora e a âncora anda; sem ele, a âncora fica e as horas
   ficam devendo para o próximo movimento.
   ============================================================ */
import { describe, it, expect, afterEach } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/clima-desgaste.jsx';
import '../01-core/game-data.jsx';
import './shell.jsx';

const stubOriginal = globalThis.supabaseClient;
afterEach(() => { globalThis.supabaseClient = stubOriginal; window.__menestrelCobrarHoras = null; });

function stub(dataJogo) {
  const updates = [], eventos = [];
  globalThis.supabaseClient = {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { data_jogo_atual: dataJogo }, error: null }) }) }),
      update: (patch) => { updates.push(patch.data_jogo_atual); return { eq: async () => ({ error: null }) }; },
    }),
    rpc: async (_n, args) => { eventos.push(args.p_texto); return { data: { ok: true }, error: null }; },
  };
  return { updates, eventos };
}

const BASE = { dia: 11, mes: 11, ano: 1500, hora: 13, minuto: 40, local: 'Farzelo',
  decaimento_em: { dia: 11, mes: 11, ano: 1500, hora: 13 } };

describe('relogioDepoisDe (puro)', () => {
  it('soma os minutos, deriva o período e guarda o resto do jsonb', () => {
    const r = window.relogioDepoisDe({ ...BASE, hora: 17, minuto: 50 }, 25);
    expect(r).toMatchObject({ hora: 18, minuto: 15, periodo: 'noite', local: 'Farzelo' });
  });
  it('mesa sem data não anda', () => {
    expect(window.relogioDepoisDe({ hora: 13 }, 25)).toBeNull();
  });
  it('o texto do log diz a duração', () => {
    expect(window.textoEventoBatalhaDurou(25, false)).toBe('A batalha durou 25 min.');
    expect(window.textoEventoBatalhaDurou(75, false)).toBe('A batalha durou 1h15.');
  });
});

describe('avancarRelogioDaMesa', () => {
  it('sem o relógio na tela: anda o relógio e a âncora fica (as horas ficam devendo)', async () => {
    const { updates, eventos } = stub(BASE);
    const r = await window.avancarRelogioDaMesa(13, 30, false);
    expect(r.ok).toBe(true);
    expect(updates[0]).toMatchObject({ hora: 14, minuto: 10 });
    expect(updates[0].decaimento_em).toEqual(BASE.decaimento_em);
    expect(eventos).toContain('A batalha durou 30 min.');
  });
  it('com o relógio na tela: cobra da âncora até o instante novo, e a âncora anda', async () => {
    const { updates } = stub(BASE);
    const chamadas = [];
    window.__menestrelCobrarHoras = { historiaId: 13, cobrar: async (...a) => { chamadas.push(a); } };
    await window.avancarRelogioDaMesa(13, 30, false);
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0][0]).toEqual(BASE.decaimento_em);
    expect(chamadas[0][1]).toMatchObject({ hora: 14, minuto: 10 });
    expect(updates[0].decaimento_em).toMatchObject({ hora: 14, minuto: 10 });
  });
  it('o cobrador de OUTRA mesa não cobra esta', async () => {
    stub(BASE);
    const chamadas = [];
    window.__menestrelCobrarHoras = { historiaId: 99, cobrar: async () => { chamadas.push(1); } };
    await window.avancarRelogioDaMesa(13, 30, false);
    expect(chamadas).toHaveLength(0);
  });
  it('a fome cobra hora cheia: 13h40 → 14h10 cruza uma hora', () => {
    expect(window.horasEntre({ ...BASE }, { ...BASE, hora: 14, minuto: 10 })).toBe(1);
    expect(window.horasEntre({ ...BASE, minuto: 0 }, { ...BASE, minuto: 30 })).toBe(0);
  });
});
