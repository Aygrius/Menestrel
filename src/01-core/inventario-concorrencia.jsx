/* ============================================================
   inventario-concorrencia.jsx — várias telas, o mesmo inventário (02/10/2026)
   ============================================================
   personagens.inventario é um JSONB gravado inteiro pela tela de Inventário,
   pela Ficha e pela batalha. Quem segurava cópia antiga gravava por cima do
   que mudou por fora (a flecha gasta "voltava").

   Agora toda gravação do cliente é compare-and-swap em inventario_versao
   (gatilho em scripts/sql/inventario-versao-2026-10-02.sql). Em conflito:
     • gravarInventario (quem segura cópia): relê e grava a MESCLA de três
       vias — o que esta tela mudou desde a base, por cima do banco atual;
     • alterarInventario (mudança pontual, a batalha): relê e reaplica a fn.

   Spec: docs/superpowers/specs/2026-10-02-inventario-concorrencia-design.md
   ============================================================ */

const TENTATIVAS_INVENTARIO = 3;
const COLS_INVENTARIO = 'inventario, inventario_versao';

// Igualdade profunda: null e undefined iguais, ordem das chaves não importa.
function mesmoValor(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => mesmoValor(x, b[i]));
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!mesmoValor(a[k], b[k])) return false;
  }
  return true;
}

/* Um item que os dois lados têm: parte de R e recebe só os campos que L
   mudou desde B. Quantidade mexida dos dois lados soma as diferenças; outro
   campo mexido dos dois lados fica com L (a intenção mais recente da tela). */
function mesclarItem(b, l, r) {
  const out = { ...r };
  for (const k of new Set([...Object.keys(b), ...Object.keys(l)])) {
    if (mesmoValor(b[k], l[k])) continue;
    if (k === 'quantidade' && !mesmoValor(b[k], r[k])) {
      out[k] = (Number(r[k]) || 0) + (Number(l[k]) || 0) - (Number(b[k]) || 0);
    } else if (l[k] === undefined) {
      delete out[k];
    } else {
      out[k] = l[k];
    }
  }
  return out;
}

/* Mescla de três vias: B = base (o banco quando L foi derivado), L = local,
   R = remoto (o banco agora). Remoção remota vence; item com quantidade ≤ 0
   sai; ordem de R, com os novos de L no fim.
   LIMITE CONHECIDO: se L junta duas pilhas e R gasta da pilha que L removeu,
   essa unidade volta (spec, seção 1). */
function mesclarInventario(base, local, remoto) {
  const B = base || {};
  const L = local || {};
  const R = remoto || {};
  const lista = (x) => (Array.isArray(x.itens) ? x.itens : []).filter(Boolean);
  const mB = new Map(lista(B).map((it) => [it.instanceId, it]));
  const mL = new Map(lista(L).map((it) => [it.instanceId, it]));
  const vivo = (it) => !(it.quantidade != null && Number(it.quantidade) <= 0);
  const itens = [];
  const vistos = new Set();
  lista(R).forEach((r) => {
    vistos.add(r.instanceId);
    const b = mB.get(r.instanceId);
    const l = mL.get(r.instanceId);
    if (b && !l) return;                       // L removeu
    const item = b ? mesclarItem(b, l, r) : (l || r);
    if (vivo(item)) itens.push(item);
  });
  lista(L).forEach((l) => {
    if (vistos.has(l.instanceId) || mB.has(l.instanceId)) return;   // já tratado, ou R removeu
    if (vivo(l)) itens.push(l);
  });
  const out = { ...R, itens };
  if (B.moedas || L.moedas || R.moedas) {
    const mb = B.moedas || {};
    const ml = L.moedas || {};
    const moedas = { ...(R.moedas || {}) };
    for (const k of new Set([...Object.keys(mb), ...Object.keys(ml)])) {
      const delta = (Number(ml[k]) || 0) - (Number(mb[k]) || 0);
      if (delta !== 0) moedas[k] = Math.max(0, (Number(moedas[k]) || 0) + delta);
    }
    out.moedas = moedas;
  }
  return out;
}

async function lerInventarioComVersao(pjId) {
  const { data, error } = await supabaseClient
    .from('personagens').select(COLS_INVENTARIO).eq('id', pjId).maybeSingle();
  if (error) return { error };
  if (!data) return { error: new Error('Personagem não encontrado.') };
  return { inventario: data.inventario || {}, versao: Number(data.inventario_versao) || 0 };
}

// Grava só se o banco ainda está na `versao`. Zero linhas = alguém gravou no meio.
async function gravarSeVersao(pjId, inventario, versao) {
  const { data, error } = await supabaseClient
    .from('personagens').update({ inventario })
    .eq('id', pjId).eq('inventario_versao', Number(versao) || 0)
    .select(COLS_INVENTARIO);
  if (error) return { error };
  const linha = Array.isArray(data) ? data[0] : data;
  if (!linha) return { conflito: true };
  return { ok: true, inventario: linha.inventario || inventario, versao: Number(linha.inventario_versao) || 0 };
}

const erroDe = (e) => (e instanceof Error ? e : new Error((e && e.message) || String(e)));

/* Para quem segura cópia (Inventário, Ficha). `local` foi derivado de `base`,
   que o banco tinha na `versao`. Sem diferença, não grava. */
async function gravarInventario(pjId, { base, local, versao } = {}) {
  if (!pjId) return { ok: false, error: new Error('Sem personagem.') };
  if (mesmoValor(base, local)) return { ok: true, inventario: local, versao: Number(versao) || 0, gravou: false };
  try {
    let alvo = local;
    let v = versao;
    for (let i = 0; i < TENTATIVAS_INVENTARIO; i++) {
      const r = await gravarSeVersao(pjId, alvo, v);
      if (r.error) return { ok: false, error: erroDe(r.error) };
      if (r.ok) return { ...r, gravou: true };
      const atual = await lerInventarioComVersao(pjId);
      if (atual.error) return { ok: false, error: erroDe(atual.error) };
      // Reenvio depois de resposta perdida: a gravação anterior já chegou ao
      // banco (R já é exatamente o que queríamos), só a resposta se perdeu.
      // Mesclar de novo contaria a mesma mudança (ex.: quantidade) duas vezes.
      if (mesmoValor(atual.inventario, local)) {
        return { ok: true, inventario: atual.inventario, versao: atual.versao, gravou: false };
      }
      alvo = mesclarInventario(base, local, atual.inventario);
      v = atual.versao;
    }
    return { ok: false, error: new Error('O inventário mudou várias vezes seguidas; tente de novo.') };
  } catch (e) {
    return { ok: false, error: erroDe(e) };
  }
}

/* Para mudança pontual (a batalha): lê, aplica `fn`, grava com a trava; em
   conflito, reaplica sobre o dado novo. `fn` que devolve o mesmo objeto (ou
   null) = nada a gravar. */
async function alterarInventario(pjId, fn) {
  if (!pjId) return { ok: false, error: new Error('Sem personagem.') };
  try {
    for (let i = 0; i < TENTATIVAS_INVENTARIO; i++) {
      const atual = await lerInventarioComVersao(pjId);
      if (atual.error) return { ok: false, error: erroDe(atual.error) };
      const novo = fn(atual.inventario);
      if (!novo || novo === atual.inventario) {
        return { ok: true, inventario: atual.inventario, versao: atual.versao, gravou: false };
      }
      const r = await gravarSeVersao(pjId, novo, atual.versao);
      if (r.error) return { ok: false, error: erroDe(r.error) };
      if (r.ok) return { ...r, gravou: true };
    }
    return { ok: false, error: new Error('O inventário mudou várias vezes seguidas; tente de novo.') };
  } catch (e) {
    return { ok: false, error: erroDe(e) };
  }
}

/* Gravador por PJ para a tela que segura cópia (InventarioList). O autosave,
   o flush ao sair e o flush ao trocar de PJ podem se sobrepor na mesma aba;
   cada um calculando a diferença a partir de uma base velha contaria a mesma
   mudança duas vezes. Aqui: uma gravação por vez, cada uma partindo da última
   base que o banco confirmou, e o que a tela mudou DURANTE a gravação é
   rebaseado por cima do resultado. */
function criarGravadorInventario() {
  const regs = {};
  let fila = Promise.resolve();
  return {
    carregar(pjId, inventario, versao) { regs[pjId] = { base: inventario, versao: Number(versao) || 0, local: inventario }; },
    tem(pjId) { return !!regs[pjId]; },
    alterar(pjId, local) { if (regs[pjId]) regs[pjId].local = local; },
    atual(pjId) { return regs[pjId] ? regs[pjId].local : null; },
    sujo(pjId) { const r = regs[pjId]; return !!r && !mesmoValor(r.base, r.local); },
    salvar(pjId) {
      const tarefa = fila.then(async () => {
        const r = regs[pjId];
        if (!r) return { ok: true, gravou: false, enviado: null, inventario: null, versao: 0 };
        const enviado = r.local;
        const res = await gravarInventario(pjId, { base: r.base, local: enviado, versao: r.versao });
        if (!res.ok) return res;
        r.base = res.inventario;
        r.versao = res.versao;
        r.local = r.local === enviado ? res.inventario : mesclarInventario(enviado, r.local, res.inventario);
        return { ok: true, gravou: res.gravou, enviado, inventario: res.inventario, versao: res.versao };
      });
      fila = tarefa.catch(() => {});
      return tarefa;
    },
  };
}

Object.assign(window, { mesmoValor, mesclarInventario, gravarInventario, alterarInventario, criarGravadorInventario });
