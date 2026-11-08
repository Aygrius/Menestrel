/* ============================================================
   RITUAL DE SANGUE — o conhecimento roubado do alvo, por dez dias
   ============================================================
   Pedido do usuário (07/11/2026): "A magia 'Ritual de Sangue' permite que o
   evocador adquira temporariamente uma habilidade, técnica ou magia do alvo.
   Ao usar a magia, vai aparecer um modal para o mestre selecionar qual
   habilidade, magia ou técnica e o estágio que o evocador vai usar
   temporariamente, de acordo com a descrição da magia."

   A descrição: "Alguns conhecimentos (habilidades, magias, etc) podem ser
   roubados por dez dias. Utilizar esta magia novamente remove os
   conhecimentos roubados anteriormente." E os níveis: "Rouba conhecimentos
   até nível N" (1, 3, 5, 7, 9).

   Decisões do usuário (07/11/2026): o Mestre escolhe do catálogo inteiro (as
   criaturas guardam habilidades e magias como texto livre), e o roubado é
   usável de verdade na ficha e na batalha enquanto vale.

   ONDE MORA: `estado_atual.conhecimento_roubado` do evocador — UM só, porque
   evocar de novo substitui o anterior. NÃO entra em `habilidades`, `magias`
   ou `tecnicas` da ficha: essas são compradas, e a compra (subir_nivel, os
   pontos gastos) não pode contar o que foi emprestado. Quem quer o
   conhecimento em uso chama pjComConhecimentoRoubado, que devolve uma CÓPIA
   do personagem com o roubado somado — para mostrar e para usar, nunca para
   gravar.

   VENCIMENTO PREGUIÇOSO, como efeitosTemporariosVigentes: filtra na leitura
   contra a data do jogo. Sem data de jogo, vale (o lado seguro).

   Depende de somarDiasFantasy / dataFantasyParaAbsoluto (01-core/helpers.jsx)
   e de nivelMagiaEfetivo (01-core/game-data.jsx). Carregar DEPOIS deles.
   ============================================================ */

const RITUAL_DE_SANGUE_KEY = 'ritual_de_sangue';
const DIAS_DO_RITUAL_DE_SANGUE = 10;
const TIPOS_DO_ROUBO = ['habilidade', 'magia', 'tecnica'];

function ehRitualDeSangue(magia) {
  const key = magia && typeof magia === 'object' ? magia.key : magia;
  return key === RITUAL_DE_SANGUE_KEY;
}

/* Os estágios que o Mestre pode dar, pelo nível em que o ritual foi evocado
   ("Rouba conhecimentos até nível N"). Magia sobe de 1 em 1 nível ímpar
   (1, 3, 5, 7, 9); habilidade e técnica, de 1 em 1. */
function niveisDoRitualDeSangue(tipo, nivelEvocado) {
  const teto = Math.max(1, Math.trunc(Number(nivelEvocado) || 1));
  if (tipo === 'magia') return [1, 3, 5, 7, 9].filter((n) => n <= teto);
  return Array.from({ length: teto }, (_, i) => i + 1);
}

/* O roubo que ainda vale hoje, ou null. Vence NO DIA, como os efeitos
   temporários: o que vence no dia 14 vale no 13 e não vale no 14. */
function conhecimentoRoubadoVigente(estado, dataJogo) {
  const r = estado && estado.conhecimento_roubado;
  if (!r || !TIPOS_DO_ROUBO.includes(r.tipo) || !r.key) return null;
  const nivel = Math.trunc(Number(r.nivel) || 0);
  if (nivel < 1) return null;
  if (r.vence_em && dataJogo && typeof dataFantasyParaAbsoluto === 'function') {
    const hoje = dataFantasyParaAbsoluto(dataJogo);
    const fim = dataFantasyParaAbsoluto(r.vence_em);
    if (hoje != null && fim != null && hoje >= fim) return null;
  }
  return { ...r, nivel };
}

/* O estado_atual com o roubo novo — o anterior sai ("Utilizar esta magia
   novamente remove os conhecimentos roubados anteriormente"). Não muta. */
function comConhecimentoRoubado(estado, roubo, dataJogo) {
  const base = estado || {};
  if (!roubo || !TIPOS_DO_ROUBO.includes(roubo.tipo) || !roubo.key) return base;
  const vence = dataJogo && typeof somarDiasFantasy === 'function'
    ? somarDiasFantasy(dataJogo, DIAS_DO_RITUAL_DE_SANGUE) : null;
  return {
    ...base,
    conhecimento_roubado: {
      tipo: roubo.tipo,
      key: roubo.key,
      nome: roubo.nome || roubo.key,
      nivel: Math.max(1, Math.trunc(Number(roubo.nivel) || 1)),
      alvo: roubo.alvo || null,
      desde: dataJogo || null,
      vence_em: vence,
    },
  };
}

/* Tira o roubo (o Mestre desfaz). */
function semConhecimentoRoubado(estado) {
  const base = estado || {};
  if (!base.conhecimento_roubado) return base;
  const { conhecimento_roubado, ...resto } = base; // eslint-disable-line no-unused-vars
  return resto;
}

/* Magia guarda PASSOS (1 passo = nível 1, 2 = nível 3…): o inverso de
   nivelMagiaEfetivo (p * 2 - 1). */
function passosDoNivelDeMagia(nivel) {
  const n = Math.max(1, Math.trunc(Number(nivel) || 1));
  return Math.ceil((n + 1) / 2);
}

/* Uma CÓPIA do personagem com o roubado em uso: soma na lista do tipo dele,
   ficando com o maior entre o que o PJ já tem e o roubado. `_roubado` diz o
   que foi somado (para a ficha marcar a casa e não oferecer "subir"). Sem
   roubo vigente, devolve o próprio pj. Nunca gravar o resultado. */
function pjComConhecimentoRoubado(pj, dataJogo) {
  if (!pj) return pj;
  const r = conhecimentoRoubadoVigente(pj.estado_atual, dataJogo);
  if (!r) return pj;
  const campo = r.tipo === 'habilidade' ? 'habilidades' : r.tipo === 'magia' ? 'magias' : 'tecnicas';
  const atual = (pj[campo] && typeof pj[campo] === 'object') ? pj[campo] : {};
  const valor = r.tipo === 'magia' ? passosDoNivelDeMagia(r.nivel) : r.nivel;
  const proprio = Number(atual[r.key]) || 0;
  if (proprio >= valor) return { ...pj, _roubado: { ...r, superado: true } };
  return { ...pj, [campo]: { ...atual, [r.key]: valor }, _roubado: r };
}

/* A chave está na ficha SÓ por causa do roubo? (a casa ganha a marca). */
function ehConhecimentoRoubado(pjUso, tipo, key) {
  const r = pjUso && pjUso._roubado;
  return !!(r && !r.superado && r.tipo === tipo && r.key === key);
}

/* "Ritual de Sangue — até 13 do Conflito" para a casa e o painel. */
function textoDoConhecimentoRoubado(r, en) {
  if (!r) return '';
  const fmt = typeof formatarDataFantasy === 'function' ? formatarDataFantasy : null;
  const ate = r.vence_em && fmt ? fmt(r.vence_em, en ? 'en' : 'pt') : null;
  const de = r.alvo ? (en ? ` from ${r.alvo}` : ` de ${r.alvo}`) : '';
  return en
    ? `Stolen${de} by Blood Ritual${ate ? `, until ${ate}` : ''}.`
    : `Roubado${de} pelo Ritual de Sangue${ate ? `, até ${ate}` : ''}.`;
}

Object.assign(window, {
  RITUAL_DE_SANGUE_KEY, DIAS_DO_RITUAL_DE_SANGUE, TIPOS_DO_ROUBO,
  ehRitualDeSangue, niveisDoRitualDeSangue, conhecimentoRoubadoVigente,
  comConhecimentoRoubado, semConhecimentoRoubado, passosDoNivelDeMagia,
  pjComConhecimentoRoubado, ehConhecimentoRoubado, textoDoConhecimentoRoubado,
});
