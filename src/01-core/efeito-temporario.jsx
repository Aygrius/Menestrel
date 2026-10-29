/* ============================================================
   EFEITO TEMPORÁRIO — o bônus que passa do teto e vence sozinho
   ============================================================
   Pedido do usuário (06/10/2026), com os três materiais de Elemental:

     "Fogo Vivo é um líquido que aumenta 5 de EH por unidade consumida, pode ir
      além do seu máximo, dura 2 dias."
     "Karma Líquido é um líquido que aumenta 10 de KA por unidade consumida,
      pode ir além do seu máximo, dura 2 dias."
     "Energia Cinética é um sólido que aumenta 1 de VB por unidade consumida,
      pode ir além do seu máximo, dura 2 dias."

   São duas regras novas, e nenhuma delas cabia nas barras como estavam:

   1. PASSAR DO MÁXIMO. aplicarEfeitosNaFicha trava vitalidade no teto
      derivado (calcularFicha) — é o certo para comida e cura, e o errado
      aqui. O único precedente de "sem teto" era a Absorção, que é buff
      temporário pelo mesmo motivo.
   2. VENCER. A barra guarda um número, não um prazo: gravar +5 de EH em
      estado_atual.vitalidade.eh deixaria o bônus para sempre.

   Por isso o bônus com prazo NÃO entra na barra. Entra numa lista própria,
   `estado_atual.efeitos_temporarios`, com a data de jogo em que cada linha
   morre — e a ficha SOMA essa lista na leitura, no atual e no máximo das
   barras. É exatamente o que a EH da montaria já faz (src/11-ficha/ficha.jsx):
   a barra mostra próprio + emprestado, e o que se grava é só o próprio.

   VENCIMENTO PREGUIÇOSO, como magiasAtivasVigentes e statusVigentes: filtra na
   LEITURA contra a data do jogo, nunca por rotina de fundo. Nada avança a data
   sozinho neste projeto, então um bônus que dependesse de um processo para
   vencer nunca venceria.

   Depende de: somarDiasFantasy / dataFantasyParaAbsoluto (01-core/helpers.jsx)
   e de parseEfeito (01-core/inventario-helpers.jsx). Carregar DEPOIS dos dois.
   ============================================================ */

/* As chaves que um bônus temporário pode somar. 'vb' (Velocidade Base) é a
   única que não existe em estado_atual: Velocidade é derivada (calcularFicha),
   e por isso só pode ser somada na leitura — que é justamente o que esta
   lista faz com todas. */
const EFEITO_TEMP_KEYS = ['ef', 'eh', 'ka', 'ar', 'vb'];

/* O item tem efeito com prazo? É o que `efeito_duracao_dias` diz (coluna de
   06/10/2026). Sem prazo, o efeito é o de sempre e vai direto para a barra. */
function ehEfeitoComPrazo(cat) {
  const d = Number(cat && cat.efeito_duracao_dias);
  return Number.isFinite(d) && d > 0;
}

/* As linhas que o item vira. `quantidade` multiplica, como em efeitosDoItem:
   duas doses de Fogo Vivo são +10 de EH, não +5.
   Uma linha POR EFEITO do item (um item pode mexer em mais de uma barra), e
   cada linha carrega o slug para a ficha poder dizer de onde o bônus veio. */
function efeitosTemporariosDoItem(cat, quantidade, dataJogo, novoId) {
  if (!ehEfeitoComPrazo(cat)) return [];
  const dias = Math.max(1, Math.trunc(Number(cat.efeito_duracao_dias) || 0));
  const vence = (typeof somarDiasFantasy === 'function' && dataJogo)
    ? somarDiasFantasy(dataJogo, dias) : null;
  const efs = (typeof efeitosDoItem === 'function') ? efeitosDoItem(cat, quantidade) : [];
  const idDe = novoId || (() => `tmp:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 7)}`);
  return efs
    // 'absorcao' grava na chave 'ar'; o resto já vem com a chave da barra.
    .map((e) => ({ ...e, key: e.scope === 'absorcao' ? 'ar' : e.key }))
    .filter((e) => EFEITO_TEMP_KEYS.includes(e.key) && Number(e.delta))
    .map((e) => ({
      id: idDe(),
      slug: cat.slug || null,
      nome: cat.nome || cat.slug || null,
      key: e.key,
      valor: Number(e.delta),
      dias,
      vence_em: vence,
    }));
}

/* O que ainda vale hoje. Vence NO DIA, como status e magia ativa: uma linha
   que vence em 14 ainda vale no 13 e já não vale no 14. Sem data de jogo não
   há como vencer nada — e aí tudo vale, que é o lado seguro (o jogador não
   perde um bônus porque a mesa não tem calendário). */
function efeitosTemporariosVigentes(lista, dataJogo) {
  const arr = Array.isArray(lista) ? lista : [];
  if (typeof dataFantasyParaAbsoluto !== 'function') return arr;
  const hoje = dataFantasyParaAbsoluto(dataJogo);
  if (hoje == null) return arr;
  return arr.filter((e) => {
    const fim = e && e.vence_em ? dataFantasyParaAbsoluto(e.vence_em) : null;
    return fim == null ? true : hoje < fim;
  });
}

/* A soma por barra do que está vigente → { ef, eh, ka, ar, vb }. É isto que a
   ficha acrescenta ao atual E ao máximo de cada barra. Chave sem bônus sai 0,
   para quem usa poder somar sem conferir. */
function bonusTemporarios(lista, dataJogo) {
  const out = { ef: 0, eh: 0, ka: 0, ar: 0, vb: 0 };
  efeitosTemporariosVigentes(lista, dataJogo).forEach((e) => {
    if (e && EFEITO_TEMP_KEYS.includes(e.key)) out[e.key] += Number(e.valor) || 0;
  });
  return out;
}

/* O estado_atual com as linhas novas, já limpo do que venceu — guardar lixo
   vencido só engorda o jsonb. Devolve um objeto NOVO; não muta o original. */
function comEfeitosTemporarios(estadoAtual, novas, dataJogo) {
  const base = estadoAtual || {};
  const atuais = efeitosTemporariosVigentes(base.efeitos_temporarios, dataJogo);
  const lista = [...atuais, ...(Array.isArray(novas) ? novas : [])];
  return { ...base, efeitos_temporarios: lista };
}

/* Tira uma linha pelo id — o x do painel, quando o Mestre quiser cortar um
   bônus antes do prazo. */
function semEfeitoTemporario(estadoAtual, id) {
  const base = estadoAtual || {};
  return {
    ...base,
    efeitos_temporarios: (base.efeitos_temporarios || []).filter((e) => e && e.id !== id),
  };
}

Object.assign(window, {
  EFEITO_TEMP_KEYS, ehEfeitoComPrazo, efeitosTemporariosDoItem,
  efeitosTemporariosVigentes, bonusTemporarios, comEfeitosTemporarios,
  semEfeitoTemporario,
});
