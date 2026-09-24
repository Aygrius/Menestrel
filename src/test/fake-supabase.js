/* ============================================================
   fake-supabase.js — cliente falso em memória para testes
   ============================================================
   O stub de setup-fases.ts explode de propósito: teste unitário não toca
   rede. Testes de INTEGRAÇÃO leve (montarSnapshots e cia.) trocam o stub
   por este fake, como o próprio setup autoriza.

   Modela a fatia do supabase-js que o app usa nessas leituras:

     from(t).select(cols)                     → awaitable (devolve a tabela)
       .in(col, ids) / .eq(col, val)          → encadeia e FILTRA
       .not(col, 'is', null)                  → encadeia e FILTRA (só este
                                                operador; ver `not` abaixo)
       .order(col)                            → encadeia (ordem é ignorada;
                                                nenhum teste depende dela)
       .range(de, ate)                        → devolve a fatia, com o TETO
                                                de 1000 do PostgREST

   O `.range` importa: desde que as leituras de catálogo passaram por
   fetchTabelaPaginada (01/09/2026), quem não modela range recebe undefined
   e o snapshot monta sem catálogo nenhum. Vivia copiado em três arquivos de
   teste, cada um sem range — por isso virou um só.
   ============================================================ */

export const TETO_POSTGREST = 1000;

export function fakeSupabase(tabelas) {
  const linhasDe = (nome) => tabelas[nome] || [];

  // Registro do que foi pedido: tabelas.__selects recebe { tabela, colunas }
  // por chamada. Serve pra afirmar o que o componente REALMENTE requisitou,
  // em vez de afirmar sobre o texto-fonte.
  const registrar = (tabela, colunas) => {
    const entrada = { tabela, colunas, usouRange: false };
    if (Array.isArray(tabelas.__selects)) tabelas.__selects.push(entrada);
    return entrada;
  };

  const resultado = (nome, colunas) => {
    const reg = registrar(nome, colunas);
    let linhas = linhasDe(nome);
    const box = {
      in(col, ids) {
        const set = new Set(ids || []);
        linhas = linhas.filter((r) => set.has(r[col]));
        return box;
      },
      eq(col, val) {
        linhas = linhas.filter((r) => r[col] === val);
        return box;
      },
      // contains(col, [v]) — jsonb @>. Só o caso que o app usa: coluna array
      // que precisa conter o valor.
      contains(col, vals) {
        const procurados = Array.isArray(vals) ? vals : [vals];
        linhas = linhas.filter((r) => {
          const arr = r[col];
          return Array.isArray(arr) && procurados.every((v) => arr.includes(v));
        });
        return box;
      },
      /* not(col, 'is', null) — o único uso no app: "só as linhas em que a
         coluna está preenchida". É como a montagem da batalha acha os itens
         que viram animal (itens.criatura_id não nulo). Outros operadores
         explodem em vez de filtrar errado em silêncio: um `not` ignorado
         devolveria a tabela inteira e o teste passaria pelo motivo errado. */
      not(col, op, val) {
        if (op !== 'is' || val !== null) {
          throw new Error(`fakeSupabase.not: só 'is null' está modelado (recebi ${op} ${String(val)})`);
        }
        linhas = linhas.filter((r) => r[col] != null);
        return box;
      },
      order() { return box; },
      maybeSingle: () => Promise.resolve({ data: linhas[0] ?? null, error: null }),
      single: () => Promise.resolve({ data: linhas[0] ?? null, error: null }),
      range(de, ate) {
        reg.usouRange = true;
        const fim = Math.min(ate + 1, de + TETO_POSTGREST);
        return Promise.resolve({ data: linhas.slice(de, fim), error: null });
      },
      then: (res, rej) => Promise.resolve({ data: linhas, error: null }).then(res, rej),
    };
    return box;
  };

  return {
    // auth.getUser — InventarioList usa pra decidir authUserIsOwner.
    auth: { getUser: () => Promise.resolve({ data: { user: { id: tabelas.__authUserId ?? null } }, error: null }) },
    // rpc(nome, args) — devolve o que estiver em tabelas.__rpc[nome], que pode
    // ser um valor ou uma função dos args. Sem entrada, devolve null sem erro.
    rpc: (nome, args) => {
      const def = (tabelas.__rpc || {})[nome];
      const data = typeof def === 'function' ? def(args) : (def ?? null);
      return Promise.resolve({ data, error: null });
    },
    from: (nome) => ({
      select: (colunas) => resultado(nome, colunas),
      // update(campos).eq(col, val) — grava NA TABELA em memória, para que uma
      // leitura seguinte enxergue o efeito. É isso que permite testar
      // read-before-write: o teste mexe na tabela "por fora" entre a carga e a
      // escrita e verifica quem venceu.
      update: (campos) => ({
        eq: (col, val) => {
          const linhas = linhasDe(nome);
          let n = 0;
          for (let i = 0; i < linhas.length; i++) {
            if (linhas[i][col] === val) { linhas[i] = { ...linhas[i], ...campos }; n++; }
          }
          return Promise.resolve({ data: null, error: null, count: n });
        },
      }),
    }),
  };
}
