/* ============================================================
   estado-atual-merge.test.js — gravar estado_atual sem apagar o do outro
   ============================================================
   "Alguns atributos da barra de vitalidade não estão salvando quando eu
   altero." (usuário, 15/09/2026)

   Não era a barra: era perda de atualização. Quatro telas escrevem
   personagens.estado_atual — ficha (Mestre), inventário (usar/vestir), fila de
   aprovação de magia e encerramento de batalha — e cada uma mandava o objeto
   INTEIRO montado sobre a cópia que tinha em memória. A última gravação
   apagava as outras, e o valor "voltava sozinho".

   Agora cada tela manda só o que mudou, e a gravação relê a linha antes de
   mesclar.
   ============================================================ */
import { describe, it, expect, beforeEach } from 'vitest';
import './helpers.jsx';
import './inventario-helpers.jsx';

const G = globalThis;

describe('patchDeEstado — só o que mudou', () => {
  it('pega a chave mexida dentro de vitalidade, e só ela', () => {
    const antes = { vitalidade: { ef: 10, eh: 8 }, condicoes: { sanidade: 3 } };
    const depois = { vitalidade: { ef: 4, eh: 8 }, condicoes: { sanidade: 3 } };
    expect(G.patchDeEstado(antes, depois)).toEqual({ vitalidade: { ef: 4 } });
  });

  it('condição e vitalidade na mesma mexida', () => {
    const antes = { vitalidade: { ka: 2 }, condicoes: { animo: 0 } };
    const depois = { vitalidade: { ka: 5 }, condicoes: { animo: -7 } };
    expect(G.patchDeEstado(antes, depois)).toEqual({ vitalidade: { ka: 5 }, condicoes: { animo: -7 } });
  });

  it('chave de topo nova entra inteira (magias ativas)', () => {
    const depois = { magias_ativas: [{ key: 'bencao' }] };
    expect(G.patchDeEstado({}, depois)).toEqual({ magias_ativas: [{ key: 'bencao' }] });
  });

  it('sem mudança, patch vazio — nada vai ao banco', () => {
    const est = { vitalidade: { ef: 10 }, condicoes: { sanidade: 3 } };
    expect(G.patchDeEstado(est, { ...est })).toEqual({});
    expect(G.patchDeEstado(null, null)).toEqual({});
  });
});

describe('mesclarEstado — aplica o patch sem tocar no resto', () => {
  it('preserva as chaves que o patch não menciona', () => {
    const base = { vitalidade: { ef: 10, eh: 8 }, condicoes: { sanidade: 3 }, magias_ativas: [1] };
    expect(G.mesclarEstado(base, { vitalidade: { ef: 2 } })).toEqual({
      vitalidade: { ef: 2, eh: 8 }, condicoes: { sanidade: 3 }, magias_ativas: [1],
    });
  });

  it('não muta a base recebida', () => {
    const base = { vitalidade: { ef: 10 } };
    G.mesclarEstado(base, { vitalidade: { ef: 1 } });
    expect(base.vitalidade.ef).toBe(10);
  });
});

describe('gravarEstadoAtual — relê a linha antes de escrever', () => {
  let linha, ultimoUpdate;
  beforeEach(() => {
    linha = { id: 7, estado_atual: { vitalidade: { ef: 20, eh: 10 }, condicoes: { sanidade: 0 } } };
    ultimoUpdate = null;
    G.supabaseClient = {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { estado_atual: linha.estado_atual }, error: null }) }) }),
        update: (campos) => ({ eq: async (col, val) => { ultimoUpdate = { campos, col, val }; linha.estado_atual = campos.estado_atual; return { error: null }; } }),
      }),
    };
  });

  it('a mudança do Mestre NÃO apaga o que o jogador gravou no meio do caminho', async () => {
    // O jogador bebeu uma poção depois que a ficha do Mestre carregou.
    linha.estado_atual = { vitalidade: { ef: 20, eh: 14 }, condicoes: { hidratacao: 35 } };
    // O Mestre mexeu só na Energia Física.
    const r = await G.gravarEstadoAtual(7, { vitalidade: { ef: 5 } });
    expect(r.error).toBeNull();
    expect(r.data).toEqual({ vitalidade: { ef: 5, eh: 14 }, condicoes: { hidratacao: 35 } });
    expect(ultimoUpdate).toMatchObject({ col: 'id', val: 7 });
  });

  it('patch vazio não vai ao banco', async () => {
    const r = await G.gravarEstadoAtual(7, {});
    expect(r).toEqual({ data: null, error: null });
    expect(ultimoUpdate).toBeNull();
  });

  it('erro na leitura não vira gravação', async () => {
    G.supabaseClient.from = () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: 'off' } }) }) }),
      update: () => ({ eq: async () => { ultimoUpdate = 'nunca'; return { error: null }; } }),
    });
    const r = await G.gravarEstadoAtual(7, { vitalidade: { ef: 1 } });
    expect(r.error).toMatchObject({ message: 'off' });
    expect(ultimoUpdate).toBeNull();
  });
});
