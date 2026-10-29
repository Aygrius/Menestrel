/* ============================================================
   CONDIÇÃO DO ANIMAL — o relógio, o clima e o que as barras tiram dele
   ============================================================
   Pedido do usuário (06/10/2026):
     "Eu espero que os efeitos do tempo e do clima também estejam afetando os
      animais, e que os efeitos negativos das barras afetem os atributos do
      animal."

   DUAS COISAS, e a segunda não é a do personagem.

   ── 1. O RELÓGIO E O CLIMA DESGASTAM O BICHO ──────────────────────────────
   O animal já tinha as barras (vitalidadeDoAnimal, 07-inventario) e já tinha o
   estado onde elas moram — `condicoes` na instância do inventário, com as
   MESMAS chaves do personagem: nutricao, hidratacao, animo, vitalidade e
   termorregulacao. O que faltava era alguém cobrar: `aplicarDesgasteNosPJs`
   (10-shell) escrevia só em `personagens.estado_atual`, e o cavalo atravessava
   uma semana de deserto sem sede.

   Por isso aqui NÃO há motor novo: `decaimentoPorHoras` e `tiqueDeClima`
   (01-core/clima-desgaste.jsx) são reusados como estão. Eles espalham
   `...base` e só tocam nas cinco chaves acima — que são exatamente as do
   animal. Uma regra só para a mesa inteira: o que cobra fome do personagem
   cobra fome do bicho, com os mesmos números.

   ── 2. AS BARRAS TIRAM ATRIBUTO, E NÃO POÇO ───────────────────────────────
   No personagem, condição mexe nos POÇOS e em RF/RM, nunca em atributo — é
   decisão antiga e está escrita em calcularFicha ("Os ATRIBUTOS nunca são
   afetados por condição"). No animal o pedido é o contrário, e isso encaixa
   melhor do que parece: a criatura não tem poço editável nem ficha de
   atributos comprados — TODO derivado dela sai dos atributos pelas fórmulas do
   bestiário (EF = 2√peso + Físico; EH = (12+Aura)×Estágio; VB =
   (Físico+Agilidade)×Estágio; RF/RM = Estágio + Físico/Aura).

   Então tirar atributo do bicho faz o animal inteiro enfraquecer de uma vez,
   coerentemente, com uma conta só — em vez de seis descontos separados que
   poderiam discordar entre si.

   O MAPA (CONDICOES_ANIMAL_ATRIBUTO) traduz o mapa do personagem
   (CONDICOES_MALEFICIO) para o vocabulário da criatura, mantendo o sentido de
   cada barra:
       Doença  → Físico      (o corpo adoecido; no PJ tira EF, que é corpo)
       Fome    → Força       (no PJ tira RF, que é Estágio + Físico)
       Sede    → Aura        (no PJ tira RM, que é Estágio + Aura)
       Sono    → Agilidade   (movimento; no PJ tira VB)
       Frio    → Agilidade   (movimento; no PJ tira VB também)
       Calor   → Físico      (abate o corpo; no PJ tira EH)

   A ESCALA É OUTRA, e tem de ser. O personagem perde até 6 pontos de um POÇO
   de dezenas; um ATRIBUTO vive entre −2 e +6, e −6 ali não seria penalidade, e
   sim aniquilação. Por isso `floor(max × degrau / 4)` com teto 2, que nos
   degraus de 25 do sistema (COND_DEGRAU) dá:
       até 49    nada     — o bicho está incomodado, não prejudicado
       50 a 99   −1
       100       −2
   `floor` e não `round`: com round, o degrau 1 (barra a 25%) já custaria o
   ponto inteiro, e um cavalo levemente com fome ficaria tão fraco quanto um
   faminto. Duas barras que caem no mesmo atributo somam (Sono + Frio na
   Agilidade), como Sono + Frio + Pesado somam na VB do personagem.

   Depende de: degrauCondicao (01-core/game-data.jsx), decaimentoPorHoras e
   tiqueDeClima (01-core/clima-desgaste.jsx), CriaturaFormulas (09-bestiario) e
   itensLivres (01-core/inventario-helpers.jsx) — todos lidos na chamada.
   ============================================================ */

/* A barra do animal → o atributo que ela abate, e quanto no pior degrau.
   `max: 2` é o padrão; está explícito em cada linha porque é o número que se
   vai querer ajustar na mesa, e procurá-lo num default escondido é pior. */
const CONDICOES_ANIMAL_ATRIBUTO = {
  vitalidade: { atributo: 'fisico',    max: 2 },   // Doença
  nutricao:   { atributo: 'forca',     max: 2 },   // Fome
  hidratacao: { atributo: 'aura',      max: 2 },   // Sede
  animo:      { atributo: 'agilidade', max: 2 },   // Sono
  frio:       { atributo: 'agilidade', max: 2 },
  calor:      { atributo: 'fisico',    max: 2 },
};

function _degrau(v) {
  const f = (typeof degrauCondicao === 'function' ? degrauCondicao : null) || window.degrauCondicao;
  if (f) return f(v);
  // Recuo com o MESMO degrau do sistema (COND_DEGRAU = 25, game-data.jsx):
  // um 20 aqui faria o módulo sozinho discordar do resto da mesa.
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(4, Math.floor(n / 25)) : 0;
}

/* As barras do animal como números de 0 a 100, com Frio e Calor abertos a
   partir da termorregulação. A DEFINIÇÃO mora em
   01-core/inventario-helpers.jsx, que carrega antes deste módulo e antes da
   barra que o inventário desenha (vitalidadeDoAnimal): uma fonte só para a
   barra e para o desconto no atributo — duas cópias seriam duas réguas. */
const _barras = (condicoes) => {
  const f = (typeof barrasDoAnimal === 'function' ? barrasDoAnimal : null) || window.barrasDoAnimal;
  return f ? f(condicoes) : {};
};

/* Quanto cada atributo perde pelo estado do bicho → { fisico: -2, forca: -1 }.
   Só as chaves que perderam algo entram: objeto vazio quer dizer animal bem. */
function deltasAtributosDoAnimal(condicoes) {
  const barras = _barras(condicoes);
  const out = {};
  Object.entries(CONDICOES_ANIMAL_ATRIBUTO).forEach(([bar, r]) => {
    const d = _degrau(barras[bar]);
    if (!d) return;
    /* `floor`, não `round`: com round, o primeiro degrau (barra a 25%) já
       custaria o ponto inteiro, e um bicho levemente com fome ficaria tão
       fraco quanto um faminto. Com floor nada acontece até 49. */
    const perda = Math.floor((r.max ?? 2) * d / 4);
    if (perda > 0) out[r.atributo] = (out[r.atributo] || 0) - perda;
  });
  return out;
}

/* A CRIATURA ABALADA pelo estado do bicho. Sem perda nenhuma devolve a MESMA
   referência — nada de objeto novo a cada render.

   As COLUNAS DERIVADAS são recalculadas, e não só os atributos: as 175
   criaturas do catálogo têm energia_fisica, energia_heroica e velocidade
   GRAVADAS, e vitalidadeDoAnimal prefere a coluna à fórmula. Mexer no Físico
   sem refazer a EF deixaria o teto da barra no valor do bicho saudável — o
   mesmo cuidado que criaturaDoAnimal tem ao evoluir (01-core/forma-raca.jsx
   faz o análogo com a forma).

   RF e RM não entram porque não são coluna: a ficha as calcula na hora, já a
   partir dos atributos que esta função devolve. */
function criaturaAbalada(criatura, condicoes) {
  if (!criatura) return criatura;
  const deltas = deltasAtributosDoAnimal(condicoes);
  const keys = Object.keys(deltas);
  if (!keys.length) return criatura;

  const F = (typeof CriaturaFormulas !== 'undefined' ? CriaturaFormulas : null)
    || window.CriaturaFormulas || {};
  const out = { ...criatura };
  keys.forEach((k) => {
    /* PISO ZERO: atributo de criatura não vai a negativo. Um cavalo faminto
       fica fraco, não vira o contrário de forte — e o resto do motor
       (resistenciasBase, as fórmulas) assume não-negativo. */
    out[k] = Math.max(0, (Number(criatura[k]) || 0) + deltas[k]);
  });
  if (F.energiaFisica) out.energia_fisica = F.energiaFisica(out);
  if (F.energiaHeroica) out.energia_heroica = F.energiaHeroica(out);
  if (F.velocidade) out.velocidade = F.velocidade(out);
  // O que o animal perdeu, para a ficha poder DIZER por que ele está fraco.
  out._abalado = deltas;
  return out;
}

/* ── O DESGASTE DAS HORAS E DO CLIMA ────────────────────────────────────── */

/* Quais instâncias são animais do personagem — o mesmo teste do quinto de
   experiência (ehAnimalDoPersonagem, 01-core/animal-experiencia.jsx): item
   solto, ligado a uma criatura e não pendurado em outro bicho. */
function _animais(itens, catalogoBySlug) {
  const livres = (typeof itensLivres === 'function' ? itensLivres : null) || window.itensLivres
    || ((xs) => (Array.isArray(xs) ? xs.filter(Boolean) : []));
  const eh = window.ehAnimalDoPersonagem
    || ((it, cat) => !!(it && !it.animal_id && cat[it.slug] && cat[it.slug].criatura_id != null));
  return livres(itens).filter((it) => eh(it, catalogoBySlug || {}));
}

/* O inventário depois de N horas de relógio: as condições de cada animal
   desgastadas pelo MESMO motor do personagem. Devolve a MESMA lista quando não
   há nada a fazer, para não disparar gravação à toa.

   O animal não tem `atividade` (dormir, meditar): é o jogador que escolhe isso
   na ficha dele, e o bicho não tem ficha de atividade. Então o parâmetro vai
   undefined e o sono do animal corre como o de quem está acordado. */
function comDesgasteNosAnimais(itens, horas, horaInicial, tempo, catalogoBySlug) {
  const lista = Array.isArray(itens) ? itens : [];
  const n = Math.max(0, Math.trunc(Number(horas) || 0));
  if (!n) return lista;
  const decair = (typeof decaimentoPorHoras === 'function' ? decaimentoPorHoras : null)
    || window.decaimentoPorHoras;
  if (!decair) return lista;

  const alvos = new Set(_animais(lista, catalogoBySlug).map((it) => it.instanceId));
  if (!alvos.size) return lista;

  let mudou = false;
  const out = lista.map((it) => {
    if (!it || !alvos.has(it.instanceId)) return it;
    const antes = it.condicoes || {};
    const depois = decair(antes, horaInicial, n, tempo, undefined);
    if (_igual(antes, depois)) return it;
    mudou = true;
    return { ...it, condicoes: depois };
  });
  return mudou ? out : lista;
}

/* A cobrança avulsa de mudar o clima, nos animais. Mesmo par do personagem:
   `tiqueDeClima` cobra SÓ o efeito do degrau, sem a fome e a sede de base,
   porque o relógio não andou. */
function comTiqueDeClimaNosAnimais(itens, trilhaChave, degrauId, catalogoBySlug) {
  const lista = Array.isArray(itens) ? itens : [];
  const tique = (typeof tiqueDeClima === 'function' ? tiqueDeClima : null) || window.tiqueDeClima;
  if (!tique) return lista;
  const alvos = new Set(_animais(lista, catalogoBySlug).map((it) => it.instanceId));
  if (!alvos.size) return lista;

  let mudou = false;
  const out = lista.map((it) => {
    if (!it || !alvos.has(it.instanceId)) return it;
    const antes = it.condicoes || {};
    const depois = tique(antes, trilhaChave, degrauId);
    if (_igual(antes, depois)) return it;
    mudou = true;
    return { ...it, condicoes: depois };
  });
  return mudou ? out : lista;
}

// As cinco chaves que o desgaste mexe. Comparar só elas evita gravar por causa
// de uma chave que o motor espalhou sem mudar.
const _COND_DESGASTE = ['nutricao', 'hidratacao', 'animo', 'vitalidade', 'termorregulacao'];
function _igual(a, b) {
  return _COND_DESGASTE.every((k) => (Number(a[k]) || 0) === (Number(b[k]) || 0));
}

Object.assign(window, {
  CONDICOES_ANIMAL_ATRIBUTO, deltasAtributosDoAnimal,
  criaturaAbalada, comDesgasteNosAnimais, comTiqueDeClimaNosAnimais,
});
