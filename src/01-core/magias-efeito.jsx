/* ============================================================
   MAGIAS — leitura do efeito e registro mecânico (Fase 1)
   ============================================================
   A tabela `magias` descreve o efeito em prosa, em cinco textos por nível
   (nivel_1/3/5/7/9). Este arquivo faz duas coisas:

     1. efeitosNoNivel() — LÊ o número de cada unidade do texto do nível;
     2. MAGIA_EFEITO_MAP — diz a SEMÂNTICA que a prosa não consegue dizer
        (alvo, nº de alvos, sinal, quais unidades valem).

   A divisão é deliberada (spec §5): a magia tem cinco textos por nível, e
   digitar ~125 números no mapa sairia de sincronia no primeiro UPDATE pelo
   editor de catálogo do admin. Já a prosa sozinha não distingue "A barreira
   reduz 1 coluna de ataque" (defesa própria) de "A área reduz 1 coluna de
   ataque" (penalidade no inimigo), nem diz que Dardos de Gelo pega 3 alvos.

   Spec: docs/superpowers/specs/2026-09-11-magias-efeitos-combate-design.md
   ============================================================ */

/* ── ANCORAR NO VERBO NÃO É OPCIONAL ───────────────────────────────
   danoMagiaNoNivel casava /(\d+)\s*de\s*dano/i sem olhar o verbo, e oito
   magias do catálogo dizem "Reduz N de dano". Três delas (Aeroproteção,
   Piroproteção, Armadura Elemental) os PJs têm, e apareciam na aba Magia
   como ATAQUES — uma proteção de 16 virava um golpe de 16.

   É o mesmo erro que modVelocidadeNoNivel já tinha corrigido ancorando em
   RE_VERBO_MOD; aqui a âncora nunca foi posta. Ver spec §7.1. */
const MAGIA_VERBOS = {
  aumenta:  'mais',
  aumente:  'mais',
  reduz:    'menos',
  reduza:   'menos',
  restaura: 'cura',
  causa:    'dano',
  cause:    'dano',
};

/* Unidade = a frase que vem DEPOIS do número. Cada entrada aponta pro nome do
   campo de saída. `coluna` casa "coluna de ataque" e o plural "colunas". */
const MAGIA_UNIDADES = [
  { re: /^\s*colunas?/i,                        campo: 'coluna'  },
  { re: /^\s*de\s+energia\s+heroica/i,          campo: 'eh'      },
  { re: /^\s*de\s+energia\s+f[íi]sica/i,        campo: 'ef'      },
  { re: /^\s*de\s+resist[êe]ncia\s+f[íi]sica/i, campo: 'rf'      },
  { re: /^\s*de\s+resist[êe]ncia\s+m[áa]gica/i, campo: 'rm'      },
  { re: /^\s*(?:pontos?\s+)?de\s+velocidade/i,  campo: 'vb'      },
  { re: /^\s*de\s+defesa/i,                     campo: 'defesa'  },
  { re: /^\s*de\s+dano/i,                       campo: 'dano'    },
];

/* O DISCRIMINADOR é a POSIÇÃO do número: modificador é sempre
   `número + unidade`, nesta ordem e colados. Quem só DESCREVE põe o número
   depois ("velocidade de 5 metros por rodada", na Telecinese) — e esses não
   podem entrar, senão Telecinese viraria um buff de +5. Erro cometido de
   verdade na investigação de 01/09/2026; há teste de regressão pra ele.

   É por isso que as regex de MAGIA_UNIDADES são ancoradas em ^: elas casam
   contra o que vem LOGO DEPOIS do número, não contra a frase inteira. */
const RE_VERBO = /\b(aumenta|aumente|reduz|reduza|restaura|causa|cause)\b/gi;

function efeitosNoNivel(magia, nivel) {
  const out = {};
  const txt = (magia && magia['nivel_' + nivel]) || '';
  if (!txt) return out;

  // Cada ocorrência de verbo abre um TRECHO, que vai até o próximo verbo.
  // Assim "Aumenta 1 coluna e 5 de energia heroica" mantém os dois números
  // sob o mesmo verbo, e um texto com dois verbos não mistura os sinais.
  const verbos = [...txt.matchAll(RE_VERBO)];
  if (!verbos.length) return out;

  verbos.forEach((v, i) => {
    const acao = MAGIA_VERBOS[v[1].toLowerCase()];
    if (!acao) return;
    const ini = v.index + v[0].length;
    const fim = (i + 1 < verbos.length) ? verbos[i + 1].index : txt.length;
    const trecho = txt.slice(ini, fim);

    // Todos os pares `número + unidade` deste trecho.
    for (const m of trecho.matchAll(/(\d+)/g)) {
      const valor = parseInt(m[1], 10);
      if (!Number.isFinite(valor)) continue;
      const resto = trecho.slice(m.index + m[0].length);
      const u = MAGIA_UNIDADES.find((x) => x.re.test(resto));
      if (!u) continue;
      // 'dano' é a única unidade cujo verbo muda o CAMPO, não só o sinal:
      // causar dano e reduzir dano recebido são coisas diferentes, e a
      // segunda é uma primitiva própria (reducao_dano).
      if (u.campo === 'dano') {
        if (acao === 'dano')  out.dano = valor;
        if (acao === 'menos') out.reducao_dano = valor;
        continue;
      }
      // Restaurar PREENCHE o pool; aumentar LEVANTA o teto. São primitivas
      // distintas (spec §8), então o campo é distinto.
      if (acao === 'cura') {
        if (u.campo === 'eh') out.cura_eh = valor;
        if (u.campo === 'ef') out.cura_ef = valor;
        continue;
      }
      if (acao === 'mais' || acao === 'menos') out[u.campo] = valor;
    }
  });
  return out;
}

/* ── Elemento do dano ──────────────────────────────────────────────
   Não é efeito: é o rótulo que reducao_dano precisa pra casar. Piroproteção
   corta dano de fogo e não corta dano de água.

   "dano elemental" sem qualificador (Armadura Elemental) devolve null, que
   no registro significa "casa qualquer elemento" — é a proteção genérica.
   "dano base" (Toque Gélido) também é null, mas do outro lado: dano sem
   elemento nenhum, que proteção elemental nenhuma corta. Quem distingue os
   dois é o registro, não este leitor. */
/* SEM ACENTO nas regex, de propósito — o texto é normalizado antes.
   `\b` não funciona com letra acentuada: em regex JS (sem flag u), `á` não é
   caractere de palavra, então `\bágua\b` precedido de espaço nunca casa, e
   "dano elemental água" devolvia null. Tirar o acento dos dois lados resolve
   sem precisar enumerar variantes. */
const MAGIA_ELEMENTOS = [
  { re: /\bfogo\b/,      campo: 'fogo'      },
  { re: /\bagua\b/,      campo: 'agua'      },
  { re: /\bar\b/,        campo: 'ar'        },
  { re: /\bterra\b/,     campo: 'terra'     },
  { re: /\bluz\b/,       campo: 'luz'       },
  { re: /\bcelestial\b/, campo: 'celestial' },
];

function semAcento(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function elementoDoNivel(magia, nivel) {
  const txt = (magia && magia['nivel_' + nivel]) || '';
  if (!txt) return null;
  const plano = semAcento(txt);
  // Só olha DEPOIS de "dano": uma magia chamada "Bola de Fogo" não pode tirar
  // o elemento do nome, e "Reduz 8 de dano elemental" não tem elemento.
  const i = plano.indexOf('dano');
  if (i < 0) return null;
  const cauda = plano.slice(i);
  const achado = MAGIA_ELEMENTOS.find((e) => e.re.test(cauda));
  return achado ? achado.campo : null;
}

/* ============================================================
   O REGISTRO — a semântica que a prosa não diz
   ============================================================
   Campos da entrada:
     alvo        'self' | 'aliado' | 'inimigo'
     alvos       número (teto de alvos) | 'escolha' (sem teto, só em área)
     icone       o chip na mesa
     efeitos[]   { tipo, unidade, sinal?, elemento?, pool? }
                   tipo     — a primitiva que o motor aplica
                   unidade  — a chave que efeitosNoNivel devolve
                   sinal    — +1 buff, -1 debuff (o texto não diz o sinal:
                              "A área reduz 1 coluna" e "Aumenta 1 coluna"
                              produzem o mesmo número)
                   elemento — só em reducao_dano; null = qualquer elemento
                   pool     — 'eh' ou 'ef'
     so_racas?   restrição de alvo por criaturas.tipo (regra, não sugestão)
     inverte_em? raças em que o efeito INVERTE de sinal
     grupo_armas? restrição de arma, no molde das técnicas
     parcial?    a metade que a Fase 1 não automatiza — vai pro log

   NÃO guarda evocacao, duracao nem alcance: os três já estão corretos no
   banco, e é lá que o editor de admin os edita.

   Magia sem entrada aqui continua narrativa. É o fallback, não um erro.
   ============================================================ */
const MAGIA_EFEITO_MAP = {
  /* ── Dano (12) ─────────────────────────────────────────────────── */
  bola_de_fogo:       { alvo: 'inimigo', alvos: 1, icone: '🔥', parcial: 'area',
                        efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  // "25% do dano é convertido em energia heroica para você, podendo
  // ultrapassar seu limite" — o dreno é o único efeito que passa do teto.
  toque_gelido:       { alvo: 'inimigo', alvos: 1, icone: '🧊',
                        efeitos: [{ tipo: 'dano',     unidade: 'dano' },
                                  { tipo: 'dreno_eh', unidade: 'dano' }] },
  // Covardia morde a EH direto: "Causa 8 de dano na energia heroica".
  covardia:           { alvo: 'inimigo', alvos: 1, icone: '😰',
                        efeitos: [{ tipo: 'dano', unidade: 'dano', pool: 'eh' }] },
  aeromanipulacao:    { alvo: 'inimigo', alvos: 1, icone: '🌪️',
                        efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  piromanipulacao:    { alvo: 'inimigo', alvos: 1, icone: '🔥',
                        efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  geomanipulacao:     { alvo: 'inimigo', alvos: 1, icone: '🪨',
                        efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  hidromanipulacao:   { alvo: 'inimigo', alvos: 1, icone: '💧',
                        efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  manipulacao_de_luz: { alvo: 'inimigo', alvos: 1, icone: '✨',
                        efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  // Multi-alvo: o número vem da DESCRIÇÃO, não do texto do nível —
  // "três dardos ... em até três alvos escolhidos".
  dardos_de_gelo:     { alvo: 'inimigo', alvos: 3, icone: '🧊',
                        efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  // "três dardos de luz ... em até dois alvos". Três dardos, dois alvos: o
  // teto que vale é o de ALVOS.
  dardos_de_luz:      { alvo: 'inimigo', alvos: 2, icone: '🌟',
                        efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  raio_eletrico:      { alvo: 'inimigo', alvos: 2, icone: '⚡',
                        efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  // Teto de 5 fragmentos E área. Vale o teto: o número está no texto, o raio
  // não. Ver spec §6.3 — quando a coluna `raio` existir, alvosDeArea liga o
  // ramo automático sozinho.
  meteoros:           { alvo: 'inimigo', alvos: 5, icone: '☄️', parcial: 'area',
                        efeitos: [{ tipo: 'dano', unidade: 'dano' }] },

  /* ── Redução de dano (3) ───────────────────────────────────────── */
  // `protecao_animal` é a KEY de Aeroproteção no banco — nome e chave
  // divergem desde algum import antigo. NÃO renomear: quebra pj.magias.
  protecao_animal:    { alvo: 'self', alvos: 1, icone: '🌬️',
                        efeitos: [{ tipo: 'reducao_dano', unidade: 'reducao_dano',
                                    elemento: 'ar' }] },
  piroprotecao:       { alvo: 'self', alvos: 1, icone: '🛡️',
                        efeitos: [{ tipo: 'reducao_dano', unidade: 'reducao_dano',
                                    elemento: 'fogo' }] },
  // elemento null = casa QUALQUER dano elemental. É a proteção genérica.
  armadura_elemental: { alvo: 'self', alvos: 1, icone: '🔰',
                        efeitos: [{ tipo: 'reducao_dano', unidade: 'reducao_dano',
                                    elemento: null }] },

  /* ── Buff / debuff (8) ─────────────────────────────────────────── */
  // "para arco": restrição de arma, mesmo mecanismo das técnicas.
  arqueirismo:        { alvo: 'self', alvos: 1, icone: '🏹', grupo_armas: 'AR',
                        efeitos: [{ tipo: 'mod_ataque', unidade: 'coluna', sinal: 1 }] },
  bencao:             { alvo: 'aliado', alvos: 1, icone: '✨',
                        efeitos: [{ tipo: 'mod_ataque',  unidade: 'coluna', sinal: 1 },
                                  { tipo: 'mod_eh_temp', unidade: 'eh',     sinal: 1 }] },
  bravura:            { alvo: 'aliado', alvos: 1, icone: '🦁',
                        efeitos: [{ tipo: 'mod_rm',      unidade: 'rm', sinal: 1 },
                                  { tipo: 'mod_eh_temp', unidade: 'eh', sinal: 1 }] },
  super_resistencia:  { alvo: 'aliado', alvos: 1, icone: '💪',
                        efeitos: [{ tipo: 'mod_rf', unidade: 'rf', sinal: 1 },
                                  { tipo: 'mod_rm', unidade: 'rm', sinal: 1 }] },
  /* O texto diz "a barreira reduz 1 coluna de ataque" — é penalidade em quem
     ataca. O motor não tem primitiva de "penalizar quem me ataca", e o
     resultado no golpe é o mesmo: vira mod_defesa POSITIVO no conjurador.
     Explicitar isto aqui é exatamente o que o mapa existe para fazer. */
  barreira_mistica:   { alvo: 'self', alvos: 1, icone: '🔮',
                        efeitos: [{ tipo: 'mod_defesa', unidade: 'coluna', sinal: 1 }] },
  /* AURA, não projétil de área — correção de 12/09/2026.

     "Esta magia envolve seu corpo em uma aura que repele demônios e
     mortos-vivos A PARTIR DE SI." O centro é o conjurador e o raio é o
     próprio `alcance` da magia (25 metros), que o catálogo já tem.

     Estava marcada `parcial: 'area'` com seleção manual, esperando a coluna
     `raio` — que ela nunca precisou. Quem precisa de `raio` é o projétil de
     área (Bola de Fogo, Meteoros), cujo centro é uma célula escolhida e cujo
     raio não está em lugar nenhum do catálogo.

     "sem direito a resistência mágica, pois não são afetadas diretamente
     pela magia" — não há rolagem. exigeResistencia devolve null porque a
     frase não é "teste de resistência mágica"; há teste de regressão pra
     isso não passar a casar depois. */
  aura_divina:        { alvo: 'inimigo', alvos: 'escolha', icone: '🕊️',
                        so_racas: ['Demônio', 'Morto'], area: 'aura',
                        efeitos: [{ tipo: 'mod_ataque', unidade: 'coluna', sinal: -1 }] },
  // PARCIAL de propósito: a raça é verificável, "sob Elo Animal" não é —
  // Elo Animal é narrativa nesta fase e não grava status nenhum. A metade
  // que falta vai pro log, pro Mestre não supor que foi conferida.
  forca_mutua:        { alvo: 'aliado', alvos: 1, icone: '🐾',
                        so_racas: ['Animal'], parcial: 'elo_animal',
                        efeitos: [{ tipo: 'mod_ataque', unidade: 'coluna', sinal: 1 }] },
  velocidade:         { alvo: 'self', alvos: 1, icone: '💨',
                        efeitos: [{ tipo: 'mod_vb', unidade: 'vb', sinal: 1 }] },

  /* ── CONTROLE (3) — Fase 2, 12/09/2026 ─────────────────────────────
     As três impedem o alvo de agir, e as três são resolvidas por DISPUTA DE
     RESISTÊNCIA, não por coluna de ataque: o texto de todas diz "caso falhe
     em um teste de resistência mágica". exigeResistencia já lê isso do banco.

     A primitiva é `sem_acoes`, que JÁ EXISTE e já é respeitada por
     proximoAtivo e temAcaoRestante desde a Falha Crítica — a Fase 2 acrescenta
     produtores, não mecanismo. Por isso o efeito declara `valor: true` e não
     `unidade`: é bandeira, não número.

     A DURAÇÃO vem do texto do nível (duracaoNoNivel), não da coluna: as três
     têm `duracao = 'Variável'`, que nelas significa "veja no nível", e não
     concentração. Medo escala 1 → 3 → 5 rodadas. */
  medo:               { alvo: 'inimigo', alvos: 1, icone: '😱',
                        efeitos: [{ tipo: 'sem_acoes', valor: true }] },
  // "repele mortos-vivos e demônios" + "Afeta criaturas de até estágio N".
  // A raça é regra (so_racas); o estágio é teto lido do texto do nível.
  esconjuracao:       { alvo: 'inimigo', alvos: 1, icone: '✝️',
                        so_racas: ['Morto', 'Demônio'], teto_estagio: true,
                        efeitos: [{ tipo: 'sem_acoes', valor: true }] },
  /* Sono é a única das três que é concentração de VERDADE: a coluna diz
     'Variável' e o nível NÃO traz duração — traz "Altera N condições do
     sono", que é outra coisa. duracaoNoNivel cai na coluna e devolve
     concentração, então o conjurador sustenta o sono e acorda o alvo se
     fizer qualquer outra coisa. É o que a magia descreve. */
  sono:               { alvo: 'inimigo', alvos: 1, icone: '💤',
                        efeitos: [{ tipo: 'sem_acoes', valor: true }] },

  /* ── Cura (2) ──────────────────────────────────────────────────── */
  // "efeito inverso em mortos-vivos": a cura de EH vira dano na EH.
  curas_espirituais:  { alvo: 'aliado', alvos: 1, icone: '💚',
                        inverte_em: ['Morto'],
                        efeitos: [{ tipo: 'cura_pool', unidade: 'cura_eh', pool: 'eh' }] },
  curas_fisicas:      { alvo: 'aliado', alvos: 1, icone: '❤️',
                        efeitos: [{ tipo: 'cura_pool', unidade: 'cura_ef', pool: 'ef' }] },
};

// Lookup tolerante: magia sem entrada devolve null, e o chamador mantém o
// comportamento narrativo de antes da Fase 1. Nunca lança.
function magiaEfeitoDe(key) {
  if (!key || typeof key !== 'string') return null;
  return MAGIA_EFEITO_MAP[key] || null;
}

/* ── Teto de estágio lido do texto do nível (Fase 2) ───────────────
   Esconjuração é a única da Fase 2 com teto de alvo por poder:

     nivel_1 "Afeta criaturas de estágio 1."
     nivel_5 "Afeta criaturas de até estágio 9."
     nivel_9 "Afeta criaturas de até estágio 17."

   O "até" aparece a partir do nível 3 e não muda o sentido — o número é o
   teto nos dois casos. Devolve null quando o nível não declara teto, e aí
   quem chama trata como "sem limite conhecido". */
const RE_TETO_ESTAGIO = /est[áa]gio\s+(\d+)/i;

function tetoEstagioNoNivel(magia, nivel) {
  const txt = (magia && magia['nivel_' + nivel]) || '';
  const m = RE_TETO_ESTAGIO.exec(txt);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

Object.assign(window, {
  efeitosNoNivel, elementoDoNivel, MAGIA_EFEITO_MAP, magiaEfeitoDe, tetoEstagioNoNivel,
});
