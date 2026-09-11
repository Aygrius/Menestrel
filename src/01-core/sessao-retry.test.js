/* ============================================================
   sessao-retry.test.js — token vencido renova e repete
   ============================================================
   Relato do usuário (11/09/2026): "fui salvar uma informação e recebi 'JWT
   expired', isso tem acontecido com frequência".

   O que este arquivo tranca é o comportamento da rede de segurança, não a
   causa do vencimento (que é timer de aba em segundo plano ou bloqueio de
   rede, e não dá pra consertar do lado do app).

   O caso mais importante é o NEGATIVO: um 401 de RLS não pode virar retry.
   Se virar, a gente repete um request que vai falhar igual e transforma
   "sem permissão" em "lentidão misteriosa".
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { criarFetchComRenovacao, ehTokenVencido, ehRotaDeAuth, trocarAuthorization } from './sessao-retry.js';

const resposta = (status, corpo) => new Response(corpo, { status });

describe('ehTokenVencido', () => {
  it('reconhece o PGRST301 do PostgREST', () => {
    expect(ehTokenVencido(401, '{"code":"PGRST301","message":"JWT expired"}')).toBe(true);
  });

  it('reconhece a mensagem em texto do GoTrue', () => {
    expect(ehTokenVencido(401, '{"message":"token is expired"}')).toBe(true);
    expect(ehTokenVencido(401, 'JWT expired')).toBe(true);
  });

  // O teste que mais importa.
  it('401 de RLS NÃO é token vencido', () => {
    expect(ehTokenVencido(401, '{"code":"42501","message":"permission denied for table itens"}')).toBe(false);
    expect(ehTokenVencido(401, '{"message":"new row violates row-level security policy"}')).toBe(false);
  });

  it('outros status nunca contam, nem com a mensagem certa', () => {
    expect(ehTokenVencido(500, 'JWT expired')).toBe(false);
    expect(ehTokenVencido(403, 'PGRST301')).toBe(false);
    expect(ehTokenVencido(200, 'PGRST301')).toBe(false);
  });

  it('corpo vazio/nulo não explode', () => {
    expect(ehTokenVencido(401, null)).toBe(false);
    expect(ehTokenVencido(401, '')).toBe(false);
  });
});

describe('ehRotaDeAuth', () => {
  it('a própria rota de refresh é reconhecida — senão o retry vira laço', () => {
    expect(ehRotaDeAuth('https://x.supabase.co/auth/v1/token?grant_type=refresh_token')).toBe(true);
  });
  it('rota de dados não é', () => {
    expect(ehRotaDeAuth('https://x.supabase.co/rest/v1/personagens?id=eq.1')).toBe(false);
  });
});

describe('trocarAuthorization', () => {
  it('troca o Bearer e PRESERVA os outros headers', () => {
    const init = { method: 'PATCH', headers: { apikey: 'anon', Prefer: 'return=representation', Authorization: 'Bearer velho' } };
    const novo = trocarAuthorization(init, 'novo');
    expect(novo.headers.get('Authorization')).toBe('Bearer novo');
    expect(novo.headers.get('apikey'), 'apikey não pode se perder na repetição').toBe('anon');
    expect(novo.headers.get('Prefer')).toBe('return=representation');
    expect(novo.method).toBe('PATCH');
  });

  it('sem init não quebra', () => {
    expect(trocarAuthorization(undefined, 'tok').headers.get('Authorization')).toBe('Bearer tok');
  });
});

describe('criarFetchComRenovacao', () => {
  const clientFake = (token, espiao) => ({
    auth: {
      refreshSession: async () => {
        if (espiao) espiao.refreshes += 1;
        return token ? { data: { session: { access_token: token } } } : { data: { session: null } };
      },
    },
  });

  it('token vencido: renova e REPETE, e quem chamou recebe o sucesso', async () => {
    const chamadas = [];
    const base = async (url, init) => {
      chamadas.push(new Headers((init && init.headers) || {}).get('Authorization'));
      return chamadas.length === 1
        ? resposta(401, '{"code":"PGRST301"}')
        : resposta(200, '{"ok":true}');
    };
    const f = criarFetchComRenovacao(() => clientFake('token-novo'), base);
    const r = await f('https://x/rest/v1/personagens', { headers: { Authorization: 'Bearer velho' } });
    expect(r.status).toBe(200);
    expect(chamadas).toEqual(['Bearer velho', 'Bearer token-novo']);
  });

  it('401 de RLS passa direto: não renova nem repete', async () => {
    const espiao = { refreshes: 0 };
    let n = 0;
    const base = async () => { n += 1; return resposta(401, '{"code":"42501","message":"permission denied"}'); };
    const f = criarFetchComRenovacao(() => clientFake('x', espiao), base);
    const r = await f('https://x/rest/v1/itens', {});
    expect(r.status).toBe(401);
    expect(n, 'uma chamada só').toBe(1);
    expect(espiao.refreshes, 'não tentou renovar').toBe(0);
  });

  it('resposta boa passa intocada', async () => {
    let n = 0;
    const base = async () => { n += 1; return resposta(200, '[]'); };
    const f = criarFetchComRenovacao(() => clientFake('x'), base);
    expect((await f('https://x/rest/v1/magias', {})).status).toBe(200);
    expect(n).toBe(1);
  });

  it('a rota de auth nunca entra no retry — senão vira laço infinito', async () => {
    const espiao = { refreshes: 0 };
    let n = 0;
    const base = async () => { n += 1; return resposta(401, '{"message":"token is expired"}'); };
    const f = criarFetchComRenovacao(() => clientFake('t', espiao), base);
    const r = await f('https://x/auth/v1/token?grant_type=refresh_token', {});
    expect(r.status).toBe(401);
    expect(n).toBe(1);
    expect(espiao.refreshes).toBe(0);
  });

  it('se a renovação falhar, devolve o erro ORIGINAL em vez de mascarar', async () => {
    let n = 0;
    const base = async () => { n += 1; return resposta(401, '{"code":"PGRST301"}'); };
    const f = criarFetchComRenovacao(() => clientFake(null), base);   // sessão nula
    const r = await f('https://x/rest/v1/personagens', {});
    expect(r.status).toBe(401);
    expect(n, 'não repetiu com token velho').toBe(1);
  });

  it('refreshSession que EXPLODE não derruba o request', async () => {
    let n = 0;
    const base = async () => { n += 1; return resposta(401, '{"code":"PGRST301"}'); };
    const cliente = { auth: { refreshSession: async () => { throw new Error('rede caiu'); } } };
    const f = criarFetchComRenovacao(() => cliente, base);
    const r = await f('https://x/rest/v1/personagens', {});
    expect(r.status).toBe(401);
    expect(n).toBe(1);
  });

  /* Dez requests vencendo juntos é o caso TÍPICO, não o raro: a tela toda
     recarrega ao mesmo tempo quando o usuário volta pra aba. Sem
     coalescência seriam dez refreshes simultâneos. */
  it('vários 401 ao mesmo tempo disparam UMA renovação só', async () => {
    const espiao = { refreshes: 0 };
    let primeiraLeva = 0;
    const base = async (url, init) => {
      const tem = new Headers((init && init.headers) || {}).get('Authorization');
      if (tem !== 'Bearer novo') { primeiraLeva += 1; return resposta(401, '{"code":"PGRST301"}'); }
      return resposta(200, '{}');
    };
    const f = criarFetchComRenovacao(() => clientFake('novo', espiao), base);
    const rs = await Promise.all([1, 2, 3, 4, 5].map(() =>
      f('https://x/rest/v1/t', { headers: { Authorization: 'Bearer velho' } })));
    expect(rs.every((r) => r.status === 200)).toBe(true);
    expect(primeiraLeva).toBe(5);
    expect(espiao.refreshes, 'uma renovação para as cinco').toBe(1);
  });

  it('o corpo da resposta original continua legível por quem chamou', async () => {
    // Ler o corpo pra decidir o retry consome o stream; se não clonássemos,
    // quem chamou receberia uma Response já lida.
    const base = async () => resposta(401, '{"code":"42501","message":"permission denied"}');
    const f = criarFetchComRenovacao(() => clientFake('x'), base);
    const r = await f('https://x/rest/v1/t', {});
    expect(JSON.parse(await r.text()).code).toBe('42501');
  });
});
