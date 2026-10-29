/* ============================================================
   FORMA — vampiro e lobisomem, as raças em que se VIRA
   ============================================================
   Pedidos do usuário (06/10/2026):
     "Vamos adicionar duas novas raças, lobisomem e vampiro."
     "Um personagem pode se transformar em lobisomem temporariamente com a
      habilidade Licantropia Lupina, um personagem pode se transformar em
      vampiro permanentemente por vontade do mestre."
     "É temporariamente pois a magia Licantropia Lupina informa quando se
      encerra." (a correção: Licantropia Lupina é MAGIA, e o prazo é dela)
     "Os atributos comprados previamente vão se manter, apenas os ajustes que
      vão mudar."
     "Vampiros são imunes a frio, calor, doença, sede e sono. Então pode remover
      essas barras e seus efeitos deles. Vampiros só podem se alimentar de
      sangue (de qualquer origem)."

   ── É UMA SUB-RAÇA, E `raca` NÃO MUDA ─────────────────────────────────────
   Correção de 06/10/2026, do usuário: "a raça vampiro e lobisomem devem ser
   uma SUB-RAÇA, isso quer dizer que o ajuste dos atributos e outros detalhes já
   definidos mudam, mas todo o restante permanece o mesmo. Um personagem
   Elfo-Florestal que vira Vampiro permanece Elfo-Florestal, mas agora com uma
   sub-raça. Ou seja, as magias, armas, etc que ele pode usar com restrição de
   raça permanece inalterado."

   A primeira versão TROCAVA `raca` por 'Vampiro'. Isso vazava a forma para
   tudo que lê raça por outro motivo — o bônus de habilidade por raça+reino, os
   idiomas iniciais, os aprimoramentos, e as mãos que uma arma exige
   (getMaosRequeridas, que distingue Pequenino e Anão). Um elfo que virasse
   vampiro deixaria de ser elfo para metade do sistema.

   Agora `comForma` acrescenta `subraca` e NÃO mexe em `raca`. A sub-raça
   sobrepõe só o que ela define:
     • os AJUSTES de atributo (rebaseados, ver abaixo)
     • a ALTURA (e, por ela, o peso e a Velocidade Base)
     • as IMUNIDADES e a dieta do vampiro
   Todo o resto continua lendo `raca`, sem saber que formas existem — é o que
   torna a regra verdadeira por construção, e não por lembrança.

   ── POR QUE O AJUSTE É REBASEADO, E NÃO SOMADO ────────────────────────────
   O modificador racial neste sistema é o NÍVEL INICIAL GRATUITO do atributo,
   já embutido em `personagens.<attr>_base` desde a criação (ver calcularFicha
   e pontosGastos, 01-core/game-data.jsx). Gravar `raca = 'Lobisomem'` não
   mudaria atributo nenhum — e rebaixar os `_base` destruiria o que o jogador
   comprou, porque não há como separar depois o que era ajuste de raça do que
   era ponto gasto.

   Então a forma é uma CAMADA DE LEITURA, como a criatura evoluída do animal e
   como os bônus temporários: `estado_atual.forma` guarda em que bicho o
   personagem está, e `comForma` devolve o personagem COMO ELE ESTÁ AGORA —
   com `subraca` marcada e cada `_base` rebaseado:

       base_novo = base_atual − mod[raça de origem] + mod[forma]

   "Os atributos comprados previamente vão se manter, apenas os ajustes que vão
   mudar", literalmente: a parcela comprada atravessa a conta intacta, e só o
   ajuste é trocado. E porque nada é gravado, desfazer é apagar uma chave — o
   que a transformação TEMPORÁRIA do lobisomem exige.

   ── O QUE FICA GRAVADO ────────────────────────────────────────────────────
     estado_atual.forma = { raca: 'Lobisomem', temporaria: true, rodadas: 50 }
     estado_atual.forma = { raca: 'Vampiro' }

   ── QUEM ABRE CADA FORMA, E QUEM DIZ QUANDO ELA ACABA ─────────────────────
   Lobisomem: a MAGIA Licantropia Lupina (public.magias). Correção de
   06/10/2026 — "é temporariamente pois a MAGIA Licantropia Lupina informa
   quando se encerra". O pedido original dizia "habilidade" e eu a criei como
   tal; ela já existia como magia, com a duração declarada, e a duplicata saiu
   do banco. O PRAZO NÃO ESTÁ ESCRITO AQUI: `fimDaForma` lê a duração da magia
   pelas mesmas funções que leem a de qualquer outra (classeDeDuracao,
   duracaoEmDiasDeJogo, 01-core/magias-efeito.jsx). Hoje ela diz "50 rodadas";
   se o catálogo passar a dizer "2 dias", a forma vence no calendário sem uma
   linha de código mudar.

   Vampiro: o MESTRE, e só ele — "permanentemente por vontade do mestre". Sem
   prazo de propósito: nenhuma magia o concede, então não há o que ler.

   `temporaria` é quem decide se o PRÓPRIO JOGADOR pode voltar atrás.

   ── AS RAÇAS NÃO ENTRAM NO WIZARD ─────────────────────────────────────────
   Ninguém CRIA um vampiro — vira um. Isso não é cosmético: `bonusPontosRaca`
   (game-data) reparte pontos livres comparando cada raça com a MAIS CARA do
   catálogo, e o Lobisomem vale 6 contra o teto de 4 do Anão e do Meio-Orc.
   Entrando no catálogo sem a marca `forma: true`, ele daria +2 pontos de
   atributo a TODOS os personagens que já existem, em silêncio. Ver
   `racasJogaveis`.
   ============================================================ */

/* As duas formas. `mods` e `altura` seguem o formato de GAME_DATA.racas — são
   acrescentados lá por `registrarFormasNasRacas`, para toda conta que já lê
   GAME_DATA.racas (altura, peso, pontosGastos) achá-las sem mudança. */
const FORMAS = {
  Vampiro: {
    /* Altura 1,77m · INT 0 · AUR −1 · CAR +1 · FOR −1 · FIS −2 · PER +1 · AGI +2 */
    mods: { intelecto: 0, aura: -1, carisma: 1, forca: -1, fisico: -2, percepcao: 1, agilidade: 2 },
    altura: 1.77,
    icone: 'ti-droplet-filled',
    /* "Vampiros são imunes a frio, calor, doença, sede e sono." As chaves são
       as de estado_atual.condicoes (ver CONDICOES_MALEFICIO, 01-core): doença é
       `vitalidade`, sede é `hidratacao`, sono é `animo`, e frio/calor são os
       dois lados de `termorregulacao`. Fome (nutricao) NÃO entra: o vampiro
       sente fome — só não come comida. */
    imunidades: ['vitalidade', 'hidratacao', 'animo', 'termorregulacao'],
    /* "Vampiros só podem se alimentar de sangue (de qualquer origem)." */
    soComeSangue: true,
    temporaria: false,     // "permanentemente por vontade do mestre"
  },
  Lobisomem: {
    /* Altura 1,92m · INT −2 · AUR −2 · CAR −2 · FOR +2 · FIS +2 · PER +2 · AGI 0 */
    mods: { intelecto: -2, aura: -2, carisma: -2, forca: 2, fisico: 2, percepcao: 2, agilidade: 0 },
    altura: 1.92,
    icone: 'ti-mood-wrrr',
    imunidades: [],
    soComeSangue: false,
    temporaria: true,      // o prazo vem da magia — ver fimDaForma
  },
};

/* A MAGIA que vira lobisomem — `public.magias`, não habilidades (corrigido em
   06/10/2026: "é temporariamente pois a MAGIA Licantropia Lupina informa quando
   se encerra"). Ela já existia no catálogo, com tipo Básica, permissão Trilha
   de Guardiões, alcance Pessoal e duração declarada; eu a havia duplicado como
   habilidade, e a duplicata saiu.

   É a chave que importa aqui, não os números: QUANDO a forma acaba é a magia
   que diz, e `fimDaForma` lê da magia. Se o catálogo trocar "50 rodadas" por
   "2 dias", a forma passa a vencer no calendário sem uma linha de código. */
const MAGIA_LICANTROPIA = 'licantropia_lupina';

/* As duas chaves de barra que `termorregulacao` desdobra na ficha. A imunidade
   é declarada na coluna de estado (termorregulacao), mas as BARRAS são duas, e
   é por elas que a ficha pergunta. */
const COND_DOIS_LADOS = { termorregulacao: ['frio', 'calor'] };

/* ── O CATÁLOGO ─────────────────────────────────────────────────────────── */

function _racas() {
  const G = (typeof GAME_DATA !== 'undefined' ? GAME_DATA : null) || window.GAME_DATA || null;
  return (G && G.racas) || {};
}

/* Põe as formas em GAME_DATA.racas, marcadas com `forma: true`. Idempotente —
   chamar duas vezes não duplica nem sobrescreve uma edição manual. */
function registrarFormasNasRacas() {
  const racas = _racas();
  Object.entries(FORMAS).forEach(([nome, f]) => {
    if (racas[nome]) return;
    racas[nome] = { mods: { ...f.mods }, altura: f.altura, forma: true };
  });
  return racas;
}

// Esta raça é uma forma em que se vira, e não uma origem de personagem?
function ehForma(raca) {
  return Object.prototype.hasOwnProperty.call(FORMAS, String(raca || ''));
}

/* As raças que o wizard oferece: as de origem. É esta lista — e não
   Object.keys(GAME_DATA.racas) — que o teto de `bonusPontosRaca` tem de
   atravessar, senão o Lobisomem (que vale 6) move o teto de 4 para 6 e
   presenteia todo personagem já criado com dois pontos de atributo. */
function racasJogaveis() {
  return Object.entries(_racas())
    .filter(([nome, r]) => !ehForma(nome) && !(r && r.forma))
    .map(([nome]) => nome);
}

/* ── A FORMA DE UM PERSONAGEM ───────────────────────────────────────────── */

/* Em que forma o personagem está → { raca, temporaria, def } ou null.
   Forma gravada que não existe mais no catálogo é ignorada: vale como "sem
   forma", e não como um personagem com raça fantasma. */
function formaDoPj(pj) {
  const f = pj && pj.estado_atual && pj.estado_atual.forma;
  const nome = f && String(f.raca || '');
  if (!nome || !FORMAS[nome]) return null;
  return { raca: nome, temporaria: !!f.temporaria, def: FORMAS[nome] };
}

// A raça de ORIGEM — a que está em personagens.raca, sem a forma por cima.
function racaDeOrigem(pj) {
  return (pj && pj.raca) || null;
}

/* O PERSONAGEM COMO ELE ESTÁ AGORA. Sem forma devolve a MESMA referência (não
   cria objeto a cada render); em forma, devolve a cópia com `raca` trocada e
   os sete `_base` rebaseados — ver o cabeçalho deste arquivo.

   As condições de que a forma é IMUNE são zeradas aqui também: é o que tira o
   efeito delas dos poços e de RF/RM (deltasPocosPorCondicoes, game-data) sem
   que cada conta precise conhecer vampiro. O valor gravado continua intacto no
   banco — se a forma sair, a doença que estava lá volta a contar. */
function comForma(pj) {
  if (!pj) return pj;
  const forma = formaDoPj(pj);
  if (!forma) return pj;
  const racas = _racas();
  const origem = (racas[racaDeOrigem(pj)] && racas[racaDeOrigem(pj)].mods) || {};
  const alvo = forma.def.mods;
  const keys = (typeof ATRIBUTOS_KEYS !== 'undefined' ? ATRIBUTOS_KEYS : null)
    || window.ATRIBUTOS_KEYS || Object.keys(alvo);

  /* `raca` SEGUE INTACTA — é uma sub-raça (06/10/2026). O elfo que virou
     vampiro continua elfo para o bônus de raça+reino, para os idiomas, para os
     aprimoramentos e para as mãos que uma arma exige. O que a sub-raça
     sobrepõe está logo abaixo, e é só isso. */
  const out = { ...pj, subraca: forma.raca };
  keys.forEach((k) => {
    const base = Number(pj[`${k}_base`]) || 0;
    out[`${k}_base`] = base - (Number(origem[k]) || 0) + (Number(alvo[k]) || 0);
  });
  const imunes = forma.def.imunidades || [];
  if (imunes.length && pj.estado_atual && pj.estado_atual.condicoes) {
    const cond = { ...pj.estado_atual.condicoes };
    imunes.forEach((k) => { cond[k] = 0; });
    out.estado_atual = { ...pj.estado_atual, condicoes: cond };
  }
  return out;
}

/* ── AS IMUNIDADES ──────────────────────────────────────────────────────── */

/* As chaves de CONDIÇÃO de que esta forma é imune (as de estado_atual). */
function imunidadesDaForma(raca) {
  const f = FORMAS[String(raca || '')];
  return (f && f.imunidades) || [];
}

/* As chaves de BARRA que a ficha deve esconder — as de estado desdobradas nos
   dois lados onde há dois (frio/calor saem de termorregulacao). */
function barrasImunes(pj) {
  const forma = formaDoPj(pj);
  if (!forma) return [];
  return (forma.def.imunidades || []).flatMap((k) => COND_DOIS_LADOS[k] || [k]);
}

// Esta condição não toca neste personagem?
function imuneA(pj, chave) {
  const forma = formaDoPj(pj);
  if (!forma) return false;
  const k = String(chave || '');
  return (forma.def.imunidades || []).some((i) => i === k || (COND_DOIS_LADOS[i] || []).includes(k));
}

/* As condições depois de o relógio (ou o clima) cobrar, com as imunes
   DEVOLVIDAS ao que eram. É assim que o desgaste da mesa deixa de tocar no
   vampiro sem que clima-desgaste.jsx precise saber o que é um vampiro: ele
   continua puro e cobrando de todos, e esta função desfaz o que não valia.

   `antes` é o estado que havia; `depois`, o que o motor devolveu. */
function semImunes(depois, antes, imunes) {
  const lista = Array.isArray(imunes) ? imunes : [];
  if (!lista.length) return depois;
  const out = { ...(depois || {}) };
  const velho = antes || {};
  lista.forEach((k) => { out[k] = Number(velho[k]) || 0; });
  return out;
}

/* ── O QUE O VAMPIRO COME ───────────────────────────────────────────────── */

/* Este item é sangue? "De qualquer origem": os seis do catálogo — Sangue,
   Sangue Arcano, Sangue Podre, Sangue Profano, Sangue Sagrado e Sangue
   Titânico — compartilham o prefixo `sangue_` no slug, e é esse o teste. Pelo
   NOME seria pior: "Cavalo Puro-Sangue Élfico" é um cavalo. */
function ehSangue(cat) {
  if (!cat) return false;
  return String(cat.slug || '').startsWith('sangue_');
}

/* O personagem pode consumir este item? Só o vampiro tem o que dizer aqui —
   para todo o resto, qualquer consumível serve, como sempre. */
function podeConsumir(pj, cat) {
  const forma = formaDoPj(pj);
  if (!forma || !forma.def.soComeSangue) return true;
  return ehSangue(cat);
}

/* ── TRANSFORMAR E DESFAZER (puro) ──────────────────────────────────────── */

/* O estado_atual com a forma posta. Devolve o MESMO objeto quando já está
   nessa forma — nada a gravar. */
/* `fim` é o que fimDaForma devolveu — { }, { vence_em } ou { rodadas }. Posto
   pela magia, ele vem preenchido; posto pelo Mestre (o vampiro), vem vazio, e
   o vampiro é permanente de propósito. */
function comFormaPosta(estadoAtual, raca, fim) {
  const f = FORMAS[String(raca || '')];
  if (!f) return estadoAtual || {};
  const base = estadoAtual || {};
  const atual = base.forma && base.forma.raca;
  // Re-evocar a MESMA forma renova o prazo: é o que "informa quando se
  // encerra" pede — a magia nova manda sobre a antiga.
  const prazo = fim && (fim.vence_em || fim.rodadas) ? fim : null;
  if (atual === raca && !prazo) return base;
  return { ...base, forma: {
    raca,
    ...(f.temporaria ? { temporaria: true } : {}),
    ...(prazo || {}),
  } };
}

// O estado_atual sem forma nenhuma — de volta à raça de origem.
function semForma(estadoAtual) {
  const base = estadoAtual || {};
  if (!base.forma) return base;
  const { forma, ...resto } = base;
  void forma;
  return resto;
}

/* ── QUANDO A FORMA ACABA ───────────────────────────────────────────────── */

/* O fim da forma, LIDO DA MAGIA que a criou. Devolve o pedaço que vai dentro
   de `estado_atual.forma`:

     { }                        permanente — a magia não acaba
     { vence_em: <data> }       a magia dura no calendário
     { rodadas: N }             a magia dura N rodadas (tempo de batalha)

   Nada é inventado aqui: classeDeDuracao e duracaoEmDiasDeJogo
   (01-core/magias-efeito.jsx) são as MESMAS funções que leem a duração de
   qualquer outra magia, e o texto do nível manda sobre a coluna, como em toda
   a família. Uma leitura só do catálogo, e nenhum prazo escrito à mão. */
function fimDaForma(magia, nivel, dataJogo) {
  const classe = (typeof classeDeDuracao === 'function' ? classeDeDuracao : null)
    || window.classeDeDuracao;
  if (!classe || !magia) return {};
  const c = classe(magia, nivel);
  if (c === 'permanente') return {};
  if (c === 'calendario') {
    const dias = ((typeof duracaoEmDiasDeJogo === 'function' ? duracaoEmDiasDeJogo : null)
      || window.duracaoEmDiasDeJogo || (() => null))(magia, nivel);
    const somar = (typeof somarDiasFantasy === 'function' ? somarDiasFantasy : null)
      || window.somarDiasFantasy;
    const vence = (dias != null && somar && dataJogo) ? somar(dataJogo, dias) : null;
    return vence ? { vence_em: vence } : {};
  }
  if (c === 'rodadas') {
    const txt = String((magia && magia['nivel_' + nivel]) || magia.duracao || '');
    const m = /(\d+)\s*rodadas?/i.exec(txt);
    const n = m ? parseInt(m[1], 10) : null;
    return Number.isFinite(n) ? { rodadas: n } : {};
  }
  return {};   // instantânea: não há forma a manter
}

/* A forma, se ainda vale — VENCIMENTO PREGUIÇOSO, como magiasAtivasVigentes e
   statusVigentes: a forma expira por comparação NA LEITURA, nunca por rotina
   de fundo. Nada avança a data do jogo sozinho neste projeto; uma forma que
   dependesse de um processo para acabar nunca acabaria.

   Vence NO DIA: uma forma que vence em 14 ainda vale no 13.

   `rodadas` NÃO vence aqui — rodada é tempo de BATALHA, e fora dela não corre.
   É a mesma fronteira que valeForaDeCombate já traça para as magias de
   rodada; quem conta as rodadas é a mesa. */
function formaVigente(pj, dataJogo) {
  const f = formaDoPj(pj);
  if (!f) return null;
  const bruta = (pj.estado_atual && pj.estado_atual.forma) || {};
  if (!bruta.vence_em) return f;
  const abs = (typeof dataFantasyParaAbsoluto === 'function' ? dataFantasyParaAbsoluto : null)
    || window.dataFantasyParaAbsoluto;
  if (!abs) return f;
  const hoje = abs(dataJogo);
  const fim = abs(bruta.vence_em);
  if (hoje == null || fim == null) return f;   // sem data, não há como vencer
  return hoje < fim ? f : null;
}

// A forma gravada venceu? É o sinal para a ficha limpar a chave do banco.
function formaVenceu(pj, dataJogo) {
  return !!formaDoPj(pj) && !formaVigente(pj, dataJogo);
}

Object.assign(window, {
  FORMAS, MAGIA_LICANTROPIA, COND_DOIS_LADOS,
  fimDaForma, formaVigente, formaVenceu,
  registrarFormasNasRacas, ehForma, racasJogaveis,
  formaDoPj, racaDeOrigem, comForma,
  imunidadesDaForma, barrasImunes, imuneA, semImunes,
  ehSangue, podeConsumir,
  comFormaPosta, semForma,
});

// As duas formas entram no catálogo de raças assim que este arquivo carrega:
// altura(), peso() e pontosGastos() leem GAME_DATA.racas e precisam achá-las.
registrarFormasNasRacas();
