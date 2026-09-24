/* ============================================================
   CLIMA-DESGASTE — o relógio da mesa desgasta o personagem
   ============================================================
   Implementa docs/superpowers/specs/2026-09-20-clima-desgaste-design.md.

   Exports (via window, como o resto das fases):
     - noiteDeSono(hora)                        → a hora cansa?
     - decaimentoPorHoras(cond, hora, n, tempo) → condições depois de n horas
     - horasEntre(de, para)                     → horas de um instante a outro
     - proximoInstante(atual, hora)             → a hora escolhida vira que dia?
     - tiqueDeClima(cond, trilha, degrau)       → a cobrança imediata da mudança
     - penalidadeVentoVB(degrau)                → quanto o vento tira da VB
     - aguaPorHoraDeChuva(degrau)               → água na loja por hora chovida
     - recuperacaoPorAtividade(est, n, ctx)     → o que dormir, meditar… devolve

   Depende de: FANTASY_MONTHS (constants.jsx), COND_LIMITE,
   dataFantasyParaAbsoluto e absolutoParaDataFantasy (helpers.jsx).
   Carregar DEPOIS de helpers.jsx.

   TUDO AQUI É PURO. Não fala com o banco, não conhece React, não lê o relógio
   do sistema. Quem aplica isso na mesa é o CardDataJogoAtual (10-shell), e é
   essa separação que permite provar as regras sem montar tela nenhuma.

   ── O que o relógio cobra, por hora ────────────────────────────────────────
     Alimentação (nutricao)          −1
     Hidratação  (hidratacao)        −1, mais o que o calor tira (−2 / −5)
     Temperatura (termorregulacao)   ±5 / ±10 conforme o degrau
     Saúde       (vitalidade)        −1 / −3 no frio leve / extremo
     Sono        (animo)             −2, só entre 20h e 8h

   SEDE E HIDRATAÇÃO SÃO A MESMA BARRA. O pedido original as cita como coisas
   separadas ("calor extremo diminui 10 pontos de sede por hora" e
   "alimentação, hidratação diminui 1 ponto por hora"), mas `hidratacao` é uma
   barra só — Desidratado ↔ Hidratado. Por isso o calor SOMA em cima da perda
   de base: calor extremo desidrata −6 por hora, não −5.
   ============================================================ */

const SONO_INICIO = 20;   // primeira hora que cansa
const SONO_FIM = 8;       // primeira hora que não cansa mais
const SONO_POR_HORA = -2;
const FOME_POR_HORA = -1;
const SEDE_POR_HORA = -1;

/* Por degrau de temperatura: quanto muda a termorregulação, quanto o calor
   tira de hidratação ALÉM da perda de base e quanto o frio tira de saúde.
   Frio não dá sede; calor não tira saúde.
   24/09/2026: "Calor leve -2 de hidratação por hora, e calor extremo é -5.
   Frio leve -1 de saúde por hora, e frio extremo é -3." */
const TEMPERATURA_EFEITO = {
  frio_extremo:  { termorregulacao: -10, hidratacao: 0,  vitalidade: -3 },
  frio_leve:     { termorregulacao: -5,  hidratacao: 0,  vitalidade: -1 },
  agradavel:     { termorregulacao: 0,   hidratacao: 0,  vitalidade: 0 },
  calor_leve:    { termorregulacao: 5,   hidratacao: -2, vitalidade: 0 },
  calor_extremo: { termorregulacao: 10,  hidratacao: -5, vitalidade: 0 },
};

/* O vento não desgasta: penaliza a Velocidade Base enquanto sopra, e some
   quando para. É a única trilha cujo pedido não dizia "por hora" — ver a spec.
   Quem aplica é calcularFicha (game-data.jsx). */
const VENTO_VB = { sem_vento: 0, leves: 1, ventania: 2, vendaval: 3, tornado: 4 };

/* Água coletada por hora de chuva, somada ao estoque da loja da história. */
const CHUVA_AGUA = { tempestade: 2, chuva_fina: 1 };

const _lim = () => (typeof COND_LIMITE !== 'undefined' ? COND_LIMITE : null)
  ?? (typeof window !== 'undefined' ? window.COND_LIMITE : null) ?? 50;

const _trava = (v) => { const L = _lim(); return Math.max(-L, Math.min(L, v)); };

const _num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

/* A hora cansa? São as doze horas entre 20h e 8h — a janela atravessa a
   meia-noite, e é por isso que a conta é um OU em vez de um intervalo. */
function noiteDeSono(hora) {
  const h = Number(hora);
  if (!Number.isFinite(h)) return false;
  return h >= SONO_INICIO || h < SONO_FIM;
}

/* As condições depois de `horas` horas cruzadas a partir de `horaInicial`.

   Percorre HORA A HORA em vez de multiplicar, e isso não é desperdício: só o
   sono depende de QUAL hora é, e um salto que atravessa a madrugada pela
   metade precisa contar quantas das horas cruzadas caem na janela. Pular de
   18h para 10h do dia seguinte são 16 horas e apenas 12 noites — multiplicar
   daria 32 de sono em vez de 24.

   Só a data é irrelevante aqui: a janela do sono depende da hora do dia, não
   do dia. Por isso a assinatura pede a hora inicial, e não o instante inteiro.

   As barras que o relógio não conhece (sanidade, euforia, reputação)
   atravessam intactas, e a saúde só muda no frio — o objeto é espalhado, não remontado. */
function decaimentoPorHoras(condicoes, horaInicial, horas, tempo, atividade) {
  const n = Math.max(0, Math.trunc(Number(horas) || 0));
  const base = { ...(condicoes || {}) };
  if (n === 0) return base;

  const temperatura = TEMPERATURA_EFEITO[(tempo && tempo.temperatura)] || TEMPERATURA_EFEITO.agradavel;
  const h0 = Number(horaInicial);
  const inicio = Number.isFinite(h0) ? h0 : 12;

  let nutricao = _num(base.nutricao);
  let hidratacao = _num(base.hidratacao);
  let termo = _num(base.termorregulacao);
  let animo = _num(base.animo);
  let vitalidade = _num(base.vitalidade);

  for (let i = 0; i < n; i++) {
    const hora = (inicio + i) % 24;
    nutricao += FOME_POR_HORA;
    hidratacao += SEDE_POR_HORA + temperatura.hidratacao;
    termo += temperatura.termorregulacao;
    vitalidade += temperatura.vitalidade;
    // Quem dorme não se cansa: o +5 de sono do descanso SUBSTITUI o −2 da
    // noite (decisão de 24/09/2026). Quem soma o +5 é recuperacaoPorAtividade.
    if (noiteDeSono(hora) && atividade !== 'dormindo') animo += SONO_POR_HORA;
  }

  return {
    ...base,
    nutricao: _trava(nutricao),
    hidratacao: _trava(hidratacao),
    termorregulacao: _trava(termo),
    animo: _trava(animo),
    ...(temperatura.vitalidade ? { vitalidade: _trava(vitalidade) } : {}),
  };
}

/* Instante → dia absoluto × 24 + hora. Devolve null para instante incompleto,
   que é o que chega de uma mesa sem data definida. */
function _instanteAbsoluto(inst) {
  if (!inst) return null;
  const abs = dataFantasyParaAbsoluto(inst);
  if (abs == null) return null;
  const hora = Number(inst.hora);
  return abs * 24 + (Number.isFinite(hora) ? hora : 0);
}

/* Quantas horas separam dois instantes. Data e relógio são uma linha do tempo
   só: avançar três dias no calendário são 72 horas, e mudar só a hora conta
   igual.

   NUNCA devolve negativo. Tempo para trás não desfaz fome — corrigir o
   calendário para um dia anterior é acerto de relógio, e quem chama apenas
   re-ancora. */
function horasEntre(de, para) {
  const a = _instanteAbsoluto(de);
  const b = _instanteAbsoluto(para);
  if (a == null || b == null) return 0;
  return Math.max(0, b - a);
}

/* A hora escolhida na lista cai em que dia?

   O tempo só anda para frente: escolher uma hora MENOR que a atual significa
   amanhã. Às 22h, escolher 2h são quatro horas depois, não vinte antes. Para
   voltar no tempo o Mestre usa o calendário — a lista de horas não tem como
   expressar isso sem perguntar, e perguntar a cada madrugada custaria um
   clique em todas elas.

   Mesa sem data devolve só a hora: inventar um 1/1/0 aqui faria a barra
   exibir uma data que ninguém definiu. */
function proximoInstante(atual, hora) {
  const h = Math.max(0, Math.min(23, Math.trunc(Number(hora) || 0)));
  const abs = atual ? dataFantasyParaAbsoluto(atual) : null;
  if (abs == null) return { hora: h };
  const horaAtual = Number(atual.hora);
  const virouODia = Number.isFinite(horaAtual) && h < horaAtual;
  const d = absolutoParaDataFantasy(abs + (virouODia ? 1 : 0));
  return { ano: d.ano, mes: d.mes, dia: d.dia, hora: h };
}

/* A cobrança IMEDIATA de mudar um degrau de clima: uma hora daquele clima,
   aplicada na hora, como se ela tivesse passado sob a condição nova.

   Só o efeito DO CLIMA entra. Fome, sede de base e sono são efeito do tempo
   que passa, e aqui o relógio não andou — por isso este tique não reaproveita
   decaimentoPorHoras. Água e vento não desgastam condição nenhuma, então para
   eles o tique é no-op por construção.

   Quem chama NÃO deve mover a âncora: o relógio ficou onde estava, e uma
   âncora adiantada faria a próxima virada de hora cobrar de menos. */
function tiqueDeClima(condicoes, trilhaChave, degrauId) {
  const base = { ...(condicoes || {}) };
  if (trilhaChave !== 'temperatura') return base;
  const ef = TEMPERATURA_EFEITO[degrauId];
  if (!ef) return base;
  return {
    ...base,
    termorregulacao: _trava(_num(base.termorregulacao) + ef.termorregulacao),
    hidratacao: _trava(_num(base.hidratacao) + ef.hidratacao),
    ...(ef.vitalidade ? { vitalidade: _trava(_num(base.vitalidade) + ef.vitalidade) } : {}),
  };
}

function penalidadeVentoVB(degrauId) {
  return VENTO_VB[degrauId] || 0;
}

function aguaPorHoraDeChuva(degrauId) {
  return CHUVA_AGUA[degrauId] || 0;
}

/* ============================== Atividades — o descanso recupera ==============================
   Pedido do usuário (24/09/2026): o jogador escolhe na ficha o que o
   personagem está fazendo, e cada hora que o relógio da mesa anda recupera.
   Mora em `estado_atual.atividade = { tipo, horas_sono }`.

   Por hora ('hora') ou por ciclo de 8h ('ciclo'). `base` + o atributo em
   `attr`; atributo negativo encolhe o ganho, mas nunca abaixo de zero. As
   horas de sono ACUMULAM entre movimentos do relógio (4h + 4h fecham um
   ciclo) — `horas_sono` guarda o resto. Trocar de atividade zera o resto
   (quem troca grava a atividade nova sem ele). */
const ATIVIDADES = [
  { id: 'dormindo',  pt: 'Dormindo',  en: 'Sleeping',   icon: 'ti-zzz' },
  { id: 'meditando', pt: 'Meditando', en: 'Meditating', icon: 'ti-yoga' },
  { id: 'orando',    pt: 'Orando',    en: 'Praying',    icon: 'ti-pray' },
  { id: 'estudando', pt: 'Estudando', en: 'Studying',   icon: 'ti-book' },
  { id: 'treinando', pt: 'Treinando', en: 'Training',   icon: 'ti-barbell' },
];

const HORAS_CICLO_SONO = 8;

const ATIVIDADE_EFEITO = {
  dormindo: {
    hora:  [{ cond: 'animo', base: 5 }],
    ciclo: [{ vit: 'eh', base: 10, attr: 'carisma' }, { vit: 'ef', base: 1, attr: 'fisico' }, { vit: 'ka', base: 5, attr: 'aura' }],
  },
  meditando: { hora: [{ vit: 'eh', base: 2, attr: 'carisma' }, { vit: 'ka', base: 1, attr: 'aura' }] },
  orando:    { hora: [{ cond: 'sanidade', base: 5 }] },
  estudando: { hora: [{ cond: 'reputacao', base: 5 }] },
  treinando: { hora: [{ cond: 'reputacao', base: 5 }] },
};

/* O estado depois de `horas` horas na atividade gravada em est.atividade.

   ctx = { atributos: {carisma, fisico, aura}, maximos: {ef, eh, ka}, semKarma, morto }.
   Energia não passa do máximo da ficha; barra sem valor gravado é barra
   cheia (convenção da ficha), e continua cheia. Guerreiro e Ladino não
   recuperam karma — eles nem têm a barra.

   Revisão de 24/09/2026: a EF atual vai até −15 (a morte), e a primeira
   versão prendia o resultado em 0 — EF −10 dormindo saltava para 0, e um
   morto voltava desmaiado. Agora a barra sobe só o que a receita dá, quem
   já está acima do máximo (elixir) não é puxado para baixo, e MORTO não
   recupera nada. */
function recuperacaoPorAtividade(estado, horas, ctx) {
  const e = estado || {};
  const tipo = e.atividade && e.atividade.tipo;
  const regra = ATIVIDADE_EFEITO[tipo];
  const n = Math.max(0, Math.trunc(Number(horas) || 0));
  const c = ctx || {};
  if (!regra || n === 0 || c.morto) return e;

  const attrs = c.atributos || {};
  const max = c.maximos || {};
  const condicoes = { ...(e.condicoes || {}) };
  const vitalidade = { ...(e.vitalidade || {}) };

  const aplicar = (efeitos, vezes) => {
    if (!efeitos || vezes <= 0) return;
    efeitos.forEach((ef) => {
      const ganho = Math.max(0, ef.base + (ef.attr ? _num(attrs[ef.attr]) : 0)) * vezes;
      if (ef.cond) {
        condicoes[ef.cond] = _trava(_num(condicoes[ef.cond]) + ganho);
        return;
      }
      if (ef.vit === 'ka' && c.semKarma) return;
      const teto = Number(max[ef.vit]);
      if (!Number.isFinite(teto)) return;
      const atual = Number.isFinite(Number(vitalidade[ef.vit])) && vitalidade[ef.vit] != null
        ? Number(vitalidade[ef.vit]) : teto;
      vitalidade[ef.vit] = atual >= teto ? atual : Math.min(teto, atual + ganho);
    });
  };

  aplicar(regra.hora, n);
  const out = { ...e, condicoes, vitalidade };
  if (regra.ciclo) {
    const total = _num(e.atividade.horas_sono) + n;
    aplicar(regra.ciclo, Math.floor(total / HORAS_CICLO_SONO));
    out.atividade = { ...e.atividade, horas_sono: total % HORAS_CICLO_SONO };
  }
  return out;
}

/* A linha do log da mesa quando a atividade muda: "Eco começou a dormir.",
   "Eco parou de meditar.", ou as duas coisas numa troca direta. */
const ATIVIDADE_VERBO = {
  dormindo:  { pt: 'dormir',  en: 'sleeping' },
  meditando: { pt: 'meditar', en: 'meditating' },
  orando:    { pt: 'orar',    en: 'praying' },
  estudando: { pt: 'estudar', en: 'studying' },
  treinando: { pt: 'treinar', en: 'training' },
};
function textoEventoAtividade(nome, de, para, en) {
  const quem = nome || (en ? 'The character' : 'O personagem');
  const v = (id) => ATIVIDADE_VERBO[id] && ATIVIDADE_VERBO[id][en ? 'en' : 'pt'];
  const vDe = v(de);
  const vPara = v(para);
  if (vDe && vPara) return en ? `${quem} stopped ${vDe} and started ${vPara}.` : `${quem} parou de ${vDe} e começou a ${vPara}.`;
  if (vPara) return en ? `${quem} started ${vPara}.` : `${quem} começou a ${vPara}.`;
  if (vDe) return en ? `${quem} stopped ${vDe}.` : `${quem} parou de ${vDe}.`;
  return null;
}

Object.assign(window, {
  ATIVIDADES, ATIVIDADE_EFEITO, recuperacaoPorAtividade, textoEventoAtividade,
  noiteDeSono, decaimentoPorHoras, horasEntre, proximoInstante,
  tiqueDeClima, penalidadeVentoVB, aguaPorHoraDeChuva,
  TEMPERATURA_EFEITO, VENTO_VB, CHUVA_AGUA,
});
