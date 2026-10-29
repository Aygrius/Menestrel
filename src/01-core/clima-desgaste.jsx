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
/* ESCALA NOVA (27/09/2026): as barras vão de 0 (ideal) a 100 (pior), então
   o relógio SOBE Fome, Sede e Sono. Temperatura segue com sinal (frio −,
   calor +); o frio sobe a Doença e o calor, a Sede. */
const SONO_POR_HORA = 2;
const FOME_POR_HORA = 1;
const SEDE_POR_HORA = 1;

/* Por degrau de temperatura: quanto muda a termorregulação, quanto o calor
   tira de hidratação ALÉM da perda de base e quanto o frio tira de saúde.
   Frio não dá sede; calor não tira saúde.
   24/09/2026: "Calor leve -2 de hidratação por hora, e calor extremo é -5.
   Frio leve -1 de saúde por hora, e frio extremo é -3." */
const TEMPERATURA_EFEITO = {
  frio_extremo:  { termorregulacao: -10, hidratacao: 0, vitalidade: 3 },
  frio_leve:     { termorregulacao: -5,  hidratacao: 0, vitalidade: 1 },
  agradavel:     { termorregulacao: 0,   hidratacao: 0, vitalidade: 0 },
  calor_leve:    { termorregulacao: 5,   hidratacao: 2, vitalidade: 0 },
  calor_extremo: { termorregulacao: 10,  hidratacao: 5, vitalidade: 0 },
};

/* O vento não desgasta: penaliza a Velocidade Base enquanto sopra, e some
   quando para. É a única trilha cujo pedido não dizia "por hora" — ver a spec.
   Quem aplica é calcularFicha (game-data.jsx). */
const VENTO_VB = { sem_vento: 0, leves: 1, ventania: 2, vendaval: 3, tornado: 4 };

/* Água coletada por hora de chuva, somada ao estoque da loja da história. */
const CHUVA_AGUA = { tempestade: 2, chuva_fina: 1 };

const _lim = () => (typeof COND_LIMITE !== 'undefined' ? COND_LIMITE : null)
  ?? (typeof window !== 'undefined' ? window.COND_LIMITE : null) ?? 50;

// Barra comum: 0..100. Temperatura: −100..+100 (_travaTemp).
const _trava = (v) => { const L = _lim(); return Math.max(0, Math.min(L, v)); };
const _travaTemp = (v) => { const L = _lim(); return Math.max(-L, Math.min(L, v)); };

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
    termorregulacao: _travaTemp(termo),
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
    termorregulacao: _travaTemp(_num(base.termorregulacao) + ef.termorregulacao),
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

/* A água da chuva entra na loja da mesa (pura). CORREÇÃO de 02/10/2026: a
   versão anterior só conhecia o formato ANTIGO de historias.estoque_loja
   (array flat); no formato atual — { comercios: [{ id, nome, ativo, itens }] }
   — lia "nada" e gravava só a água por cima, apagando a loja inteira.

   Soma na entrada de água que já existir (a primeira, em qualquer comércio);
   sem ela, cria a entrada no primeiro comércio ativo (ou no primeiro); sem
   comércio, cria um "Estoque" ativo. Toda entrada sai com entryId — sem ele
   o balcão não abre nem vende o item. Estoque null (infinito) segue null.
   Formato antigo vira o atual, como faz migrarEstoqueLoja (06-historias). */
function somarAguaNaLoja(estoqueLoja, ganho, novoId) {
  if (!(Number(ganho) > 0)) return estoqueLoja;
  const gerarId = novoId || (() => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const atual = estoqueLoja && !Array.isArray(estoqueLoja) && Array.isArray(estoqueLoja.comercios)
    ? estoqueLoja
    : {
      ...(estoqueLoja && !Array.isArray(estoqueLoja) ? estoqueLoja : {}),
      comercios: Array.isArray(estoqueLoja) && estoqueLoja.length
        ? [{ id: gerarId(), nome: 'Estoque', ativo: true, itens: estoqueLoja }]
        : [],
    };
  const comercios = atual.comercios.map((c) => ({ ...c, itens: Array.isArray(c.itens) ? c.itens : [] }));
  const somar = (it) => ({
    ...it,
    entryId: it.entryId || gerarId(),
    estoque: it.estoque == null ? null : (Number(it.estoque) || 0) + Number(ganho),
  });
  const ci = comercios.findIndex((c) => c.itens.some((it) => it && it.slug === 'agua'));
  if (ci >= 0) {
    let feito = false;
    comercios[ci] = {
      ...comercios[ci],
      itens: comercios[ci].itens.map((it) => {
        if (feito || !it || it.slug !== 'agua') return it;
        feito = true;
        return somar(it);
      }),
    };
    return { ...atual, comercios };
  }
  const nova = { entryId: gerarId(), slug: 'agua', estoque: Number(ganho) };
  const alvo = comercios.findIndex((c) => c.ativo) >= 0 ? comercios.findIndex((c) => c.ativo) : (comercios.length ? 0 : -1);
  if (alvo < 0) return { ...atual, comercios: [{ id: gerarId(), nome: 'Estoque', ativo: true, itens: [nova] }] };
  comercios[alvo] = { ...comercios[alvo], itens: [...comercios[alvo].itens, nova] };
  return { ...atual, comercios };
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
/* OS VERBOS DA ATIVIDADE. Servem a duas coisas que precisam concordar: o
   NOME na lista da ficha e a linha do log da mesa ("Eco começou a dormir").
   Uma tabela só, para não divergirem.

   `pt`/`enInf` são o infinitivo — o nome da AÇÃO, que é o que a lista
   oferece e o que o botão do modal confirma. `enGer` é o gerúndio, que o log
   precisa ("started sleeping"). */
const ATIVIDADE_VERBO = {
  dormindo:   { pt: 'dormir',   enInf: 'Sleep',    enGer: 'sleeping' },
  meditando:  { pt: 'meditar',  enInf: 'Meditate', enGer: 'meditating' },
  orando:     { pt: 'orar',     enInf: 'Pray',     enGer: 'praying' },
  estudando:  { pt: 'estudar',  enInf: 'Study',    enGer: 'studying' },
  treinando:  { pt: 'treinar',  enInf: 'Train',    enGer: 'training' },
  praticando: { pt: 'praticar', enInf: 'Practice', enGer: 'practicing' },
};
const _maiuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/* A LISTA PASSOU AO INFINITIVO (27/10/2026, pedido do usuário: "em
   'atividades' vamos mudar o nome para: Dormir, Meditar, Orar, Estudar,
   Treinar, Praticar").

   Eram gerúndios — "Dormindo", "Meditando" —, que diziam o ESTADO. Desde que
   escolher abre um modal de confirmação, a lista deixou de ser um retrato do
   que o personagem faz e virou um menu de AÇÕES: o nome é o que acontece se
   você clicar, e é a mesma palavra que vai no botão que confirma.

   As CHAVES (`dormindo`, `meditando`…) não mudaram — elas estão gravadas em
   `estado_atual.atividade.tipo` de toda ficha que já existe, e em
   ATIVIDADE_DA_CLASSE e ATIVIDADE_EFEITO. Renomear id por causa de rótulo é
   como se perde personagem. */
const ATIVIDADES = [
  { id: 'dormindo',   icon: 'ti-zzz' },
  { id: 'meditando',  icon: 'ti-yoga' },
  { id: 'orando',     icon: 'ti-pray' },
  { id: 'estudando',  icon: 'ti-book' },
  { id: 'treinando',  icon: 'ti-barbell' },
  // Praticar (22/10/2026): é onde os ENCANTOS treinam (fila de treino).
  { id: 'praticando', icon: 'ti-music' },
].map((a) => ({
  ...a,
  pt: _maiuscula(ATIVIDADE_VERBO[a.id].pt),
  en: ATIVIDADE_VERBO[a.id].enInf,
}));

const HORAS_CICLO_SONO = 8;

const ATIVIDADE_EFEITO = {
  dormindo: {
    hora:  [{ cond: 'animo', base: 5 }],
    ciclo: [{ vit: 'eh', base: 10, attr: 'carisma' }, { vit: 'ef', base: 1, attr: 'fisico' }, { vit: 'ka', base: 5, attr: 'aura' }],
  },
  meditando: { hora: [{ vit: 'eh', base: 2, attr: 'carisma' }, { vit: 'ka', base: 1, attr: 'aura' }] },
  // Orar tira 2 de Loucura por hora (27/10/2026, usuário: "Loucura -2 (a
  // cada hora)"). Eram 5, o mesmo de estudar e treinar.
  orando:    { hora: [{ cond: 'sanidade', base: 2 }] },
  /* CADA OFÍCIO CUIDA DE UMA BARRA (27/10/2026, usuário, cartão por cartão:
     "Vício -2", "Má Fama -2", "Loucura -2"). As três eram a MESMA receita —
     Má Fama −5 — desde 22/10 ("recupera igual estudando e treinando"), e
     agora cada uma tem a sua: o estudo lava o nome, o treino tira o vício, a
     prática acalma a cabeça (como a prece). O passo caiu de 5 para 2. */
  estudando:  { hora: [{ cond: 'reputacao', base: 2 }] },
  treinando:  { hora: [{ cond: 'euforia',   base: 2 }] },
  praticando: { hora: [{ cond: 'sanidade',  base: 2 }] },
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
      // Descansar, orar, estudar TIRAM da barra (0 é o ideal, 27/09/2026).
      if (ef.cond) {
        condicoes[ef.cond] = _trava(_num(condicoes[ef.cond]) - ganho);
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

/* ── FILA DE TREINO (22/10/2026) ─────────────────────────────────────────
   "a técnica vai aparecer no menu treinando, e só vai efetivamente ficar
   disponível para uso após [o] treinamento" (usuário). Técnica: 72 h de
   Treinando por nível; magia: 24 h da atividade da classe. As horas que o
   Mestre avança vão para o PRIMEIRO item da fila com a atividade ligada; a
   sobra passa ao seguinte da mesma atividade. Outras atividades não andam. */
function avancarTreinos(treinos, atividade, horas) {
  const lista = Array.isArray(treinos) ? treinos.map((t) => ({ ...t })) : [];
  let resto = Math.max(0, Number(horas) || 0);
  const concluidos = [];
  if (!atividade || resto <= 0) return { treinos: lista, concluidos };
  for (const t of lista) {
    if (resto <= 0) break;
    if (!t || t.atividade !== atividade) continue;
    const falta = Math.max(0, Number(t.horas_restantes) || 0);
    const usa = Math.min(falta, resto);
    t.horas_restantes = falta - usa;
    resto -= usa;
    if (t.horas_restantes <= 0) concluidos.push(t);
  }
  return { treinos: lista.filter((t) => !concluidos.includes(t)), concluidos };
}

/* O que muda no personagem quando o relógio anda `horas` com `atividade`
   ligada: a fila nova e os níveis concluídos gravados em tecnicas/magias
   (nunca rebaixa). null = nada mudou (quem chama não grava à toa). */
function aplicarTreinoNoPj(pj, atividade, horas) {
  const atual = Array.isArray(pj && pj.treinos) ? pj.treinos : [];
  if (!atual.length) return null;
  const { treinos, concluidos } = avancarTreinos(atual, atividade, horas);
  const mudou = concluidos.length > 0
    || treinos.some((t, i) => t.horas_restantes !== (atual.find((a) => a.id === t.id) || atual[i] || {}).horas_restantes);
  if (!mudou) return null;
  const tecnicas = { ...((pj && pj.tecnicas) || {}) };
  const magias = { ...((pj && pj.magias) || {}) };
  concluidos.forEach((c) => {
    const alvo = c.tipo === 'tecnica' ? tecnicas : magias;
    alvo[c.key] = Math.max(Number(alvo[c.key]) || 0, Number(c.nivel) || 0);
  });
  return { treinos, tecnicas, magias };
}

/* A linha do log da mesa quando a atividade muda: "Eco começou a dormir.",
   "Eco parou de meditar.", ou as duas coisas numa troca direta. O verbo vem
   da tabela lá de cima — a mesma que nomeia a atividade na ficha. */
function textoEventoAtividade(nome, de, para, en) {
  const quem = nome || (en ? 'The character' : 'O personagem');
  const v = (id) => ATIVIDADE_VERBO[id] && ATIVIDADE_VERBO[id][en ? 'enGer' : 'pt'];
  const vDe = v(de);
  const vPara = v(para);
  if (vDe && vPara) return en ? `${quem} stopped ${vDe} and started ${vPara}.` : `${quem} parou de ${vDe} e começou a ${vPara}.`;
  if (vPara) return en ? `${quem} started ${vPara}.` : `${quem} começou a ${vPara}.`;
  if (vDe) return en ? `${quem} stopped ${vDe}.` : `${quem} parou de ${vDe}.`;
  return null;
}

/* ══ O QUE A ATIVIDADE FAZ, EM PALAVRAS (27/10/2026) ═══════════════════════
   "Ao clicar, adicione um modal explicando o que aquela atividade faz."
   (usuário)

   O texto é GERADO do ATIVIDADE_EFEITO, e não escrito à mão. Explicação
   escrita à parte envelhece calada: alguém afina o ganho de karma do sono e
   o modal segue prometendo o número velho. Aqui, mudar a receita muda a
   explicação no mesmo commit.

   Quando há atributos, mostra o NÚMERO DESTE personagem (base + atributo),
   que é o que o princípio do produto pede — custo e ganho antes do clique.
   Sem eles, mostra a fórmula. */
const ATIVIDADE_ROTULO = {
  animo:      { pt: 'Sono',      en: 'Sleepiness' },
  sanidade:   { pt: 'Loucura',   en: 'Madness' },
  reputacao:  { pt: 'Má Fama',   en: 'Infamy' },
  vitalidade: { pt: 'Doença',    en: 'Illness' },
  hidratacao: { pt: 'Sede',      en: 'Thirst' },
  nutricao:   { pt: 'Fome',      en: 'Hunger' },
  euforia:    { pt: 'Vício',     en: 'Addiction' },
  ef: { pt: 'Energia Física',  en: 'Physical Energy' },
  eh: { pt: 'Energia Heroica', en: 'Heroic Energy' },
  ka: { pt: 'Karma',           en: 'Karma' },
};
const ATIVIDADE_ATRIBUTO = {
  carisma: { pt: 'Carisma', en: 'Charisma' },
  fisico:  { pt: 'Físico',  en: 'Physique' },
  aura:    { pt: 'Aura',    en: 'Aura' },
};
/* O que a atividade É, numa frase. Isto sim é escrito à mão: é o porquê, e
   porquê não se deduz de uma tabela de números. */
const ATIVIDADE_PORQUE = {
  dormindo: {
    pt: 'O sono é o único descanso que devolve energia de verdade — mas só fecha a conta a cada oito horas inteiras.',
    en: 'Sleep is the only rest that truly returns energy — but it only settles up every full eight hours.',
  },
  meditando: {
    pt: 'Recolhimento: devolve energia heroica e karma a cada hora, sem precisar fechar ciclo nenhum.',
    en: 'Inward rest: returns heroic energy and karma every hour, with no cycle to complete.',
  },
  orando: {
    pt: 'Orar acalma a mente e o espírito, mas também aqui é onde você aprenderá novos milagres.',
    en: 'Prayer settles mind and spirit — and it is also here that you will learn new miracles.',
  },
  estudando: {
    pt: 'Estudar afia o cérebro e desenvolve sua energia interior, mas também aqui é onde você aprenderá novas magias.',
    en: 'Study sharpens the mind and builds your inner energy — and it is also here that you will learn new spells.',
  },
  treinando: {
    pt: 'Treinar torna você a cada dia mais apto para o combate, mas também é aqui que você aprenderá novas técnicas de combate.',
    en: 'Training makes you fitter for battle by the day — and it is also here that you will learn new combat techniques.',
  },
  praticando: {
    pt: 'Praticar torna você um artista mais próximo da perfeição, mas também é aqui que você aprenderá novos encantamentos.',
    en: 'Practice brings the artist in you closer to perfection — and it is also here that you will learn new enchantments.',
  },
};

function explicacaoDaAtividade(id, atributos, en) {
  const regra = ATIVIDADE_EFEITO[id];
  if (!regra) return null;
  const attrs = atributos || null;
  const nome = (chave) => {
    const r = ATIVIDADE_ROTULO[chave];
    return r ? r[en ? 'en' : 'pt'] : chave;
  };
  const linhaDe = (ef) => {
    const base = Number(ef.base) || 0;
    const somaAttr = ef.attr && attrs ? _num(attrs[ef.attr]) : null;
    // Condição: o ganho TIRA da barra (0 é o ideal), e por isso vai com sinal.
    const sinal = ef.cond ? -1 : 1;
    const valor = somaAttr == null
      ? (ef.attr
        ? `${sinal < 0 ? '−' : '+'}${base} + ${ATIVIDADE_ATRIBUTO[ef.attr][en ? 'en' : 'pt']}`
        : `${sinal < 0 ? '−' : '+'}${base}`)
      : `${sinal < 0 ? '−' : '+'}${Math.max(0, base + somaAttr)}`;
    return { rotulo: nome(ef.cond || ef.vit), valor, atributo: ef.attr || null };
  };
  /* UMA LISTA SÓ (27/10/2026, pelo recorte que o usuário escreveu):

       A cada 8 horas recupera:
       Sono −5 (por hora)
       Energia Heroica +16
       …

     Quando há ciclo, é ELE que dá o título — é o que a atividade entrega — e
     a linha por hora, que é a exceção, carrega a cadência entre parênteses.
     Sem ciclo não há título nenhum: a cadência cabe na própria linha, e um
     cabeçalho para uma linha só é moldura em volta de nada. */
  const porHora = en ? 'per hour' : 'por hora';
  const grupos = [];
  if (regra.ciclo) {
    grupos.push({
      quando: en ? `Every ${HORAS_CICLO_SONO} hours slept it recovers` : `A cada ${HORAS_CICLO_SONO} horas recupera`,
      linhas: [
        ...(regra.hora || []).map((ef) => ({ ...linhaDe(ef), cadencia: porHora })),
        ...regra.ciclo.map(linhaDe),
      ],
    });
  } else if (regra.hora) {
    const cada = en ? 'every hour' : 'a cada hora';
    grupos.push({ quando: null, linhas: regra.hora.map((ef) => ({ ...linhaDe(ef), cadencia: cada })) });
  }
  const porque = ATIVIDADE_PORQUE[id];
  return { porque: porque ? porque[en ? 'en' : 'pt'] : null, grupos, aprendizado: _aprendizado(id, en) };
}

/* QUANTO DEMORA PARA APRENDER (27/10/2026, usuário: "informe na descrição
   quanto tempo demora para aprender um milagre").

   Também gerado, e das MESMAS constantes que a fila consome: ATIVIDADE_DA_CLASSE
   diz qual classe treina em qual atividade e HORAS_TREINO diz o preço em horas
   (01-core/game-data.jsx). Pelo window porque game-data carrega depois desta
   fase — e a conta só acontece quando a janela abre, nunca na carga.

   Vale para as quatro que ensinam, não só orar: a regra é uma só, e escrever
   a de milagre à mão deixaria as outras três mudas sobre o mesmo assunto. */
const _APRENDE_O_QUE = {
  orando:     { pt: 'um milagre',       en: 'a miracle',        custo: 'magia' },
  estudando:  { pt: 'uma magia',        en: 'a spell',          custo: 'magia' },
  meditando:  { pt: 'uma transmutação', en: 'a transmutation',  custo: 'magia' },
  praticando: { pt: 'um encantamento',  en: 'an enchantment',   custo: 'magia' },
  /* Treinar é o único que ensina TÉCNICA, e técnica custa outro tanto de
     horas (72 contra 24) — por isso o custo é campo, não constante. */
  treinando:  { pt: 'uma técnica',      en: 'a technique',      custo: 'tecnica' },
};
function _aprendizado(id, en) {
  const oQue = _APRENDE_O_QUE[id];
  const tabela = (typeof window !== 'undefined' && window.HORAS_TREINO) || {};
  const horas = oQue ? tabela[oQue.custo] : 0;
  if (!oQue || !horas) return null;
  /* SÓ A PRIMEIRA COMPRA CUSTA TEMPO (28/10/2026, usuário):

       "Magia, Técnica, Habilidade só precisa de aprendizado quando o
        personagem não tem nenhum nível, representa uma compra nova; depois
        de aprender o nível 1, ao comprar ativa instantaneamente."

     Até aqui a frase dizia "por nível", o que prometia uma fila a cada
     degrau — e era errado: o tempo é o preço de APRENDER a coisa, não de
     subir nela. Quem já tem o nível 1 compra os seguintes e usa na hora.

     Duas frases, e não uma com ressalva no fim: a segunda metade é a que o
     jogador com a magia na ficha precisa ler, e ressalva depois de ponto
     final é ressalva que ninguém lê.

     "NÍVEL" e não "passo" (27/10/2026): a fila fala em passo por dentro, mas
     quem lê a ficha conhece nível — é a palavra das magias (1, 3, 5, 7, 9) e
     das técnicas. Uma palavra por coisa. */
  return en
    ? `Learning ${oQue.en} for the first time takes ${horas} hours of this activity. Once you have level 1, further levels activate the moment you buy them.`
    : `Aprender ${oQue.pt} pela primeira vez leva ${horas} horas nesta atividade. Com o nível 1 na ficha, os níveis seguintes valem assim que você compra.`;
}

Object.assign(window, {
  ATIVIDADES, ATIVIDADE_EFEITO, ATIVIDADE_VERBO, explicacaoDaAtividade,
  recuperacaoPorAtividade, textoEventoAtividade,
  avancarTreinos, aplicarTreinoNoPj,
  noiteDeSono, decaimentoPorHoras, horasEntre, proximoInstante,
  tiqueDeClima, penalidadeVentoVB, aguaPorHoraDeChuva, somarAguaNaLoja,
  TEMPERATURA_EFEITO, VENTO_VB, CHUVA_AGUA,
});
