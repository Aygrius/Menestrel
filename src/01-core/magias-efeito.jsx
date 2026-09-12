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
  // Licantropia Lupina é a única que diz "diminui" em vez de "reduz":
  // "Aumenta 1 no atributo Força e DIMINUI 1 no atributo Intelecto."
  diminui:  'menos',
  diminua:  'menos',
  restaura: 'cura',
  /* `recupera` é sinônimo de `restaura`, e entrou em 12/09/2026 depois de o
     verificador pegar o caso: o usuário corrigiu o texto do Véu de Maira e,
     no mesmo movimento, trocou "Aumente" por "Recupera". Verbo desconhecido =
     nada lido = magia com efeito zero, em silêncio.

     Duas magias usam a família: Véu de Maira e Melodia Zen. */
  recupera: 'cura',
  recupere: 'cura',
  recuperam: 'cura',
  // Gerúndio: Melodia Zen escreve "recuperando 8 de energia heroica".
  recuperando: 'cura',
  /* `cure` é o terceiro sinônimo de restaurar, e aparece em Heroísmo
     ("Cure 10 de energia heroica") e Hibernar. Varredura de 12/09/2026. */
  cure:     'cura',
  /* `adiciona` chegou com o texto novo do Véu de Maira: "Restaura 15 de
     energia heroica e ADICIONA 1 coluna de ataque". Funcionava por acaso —
     caía no ramo de cura, que passa adiante o que não é poço —, mas depender
     de acaso é o que faz magia parar de funcionar em silêncio. */
  adiciona: 'mais',
  adicione: 'mais',
  /* `recebe` entrou em 12/09/2026, depois de o usuário confirmar o sentido:
     em Necropotência ("Recebe 10 de energia heroica ADICIONAL") é ganho.

     A dúvida era "recebe 10 de dano", que significaria o oposto — e ela se
     resolve sozinha: sob a ação 'mais', a unidade `dano` não é escrita em
     campo nenhum (só 'causa' e 'reduz' a escrevem). Ossos de Aço, a única
     outra magia com o verbo, diz exatamente isso e continua ilegível de
     propósito. */
  recebe:   'mais',
  recebem:  'mais',
  recebendo: 'mais',
  causa:    'dano',
  cause:    'dano',
};

/* ── Verbos que a varredura NÃO adotou, e por quê ───────────────────
   A varredura do catálogo (12/09/2026) achou estes antes de números, e eles
   ficaram de fora porque o sentido não é inequívoco. Adotá-los seria eu
   decidir regra de jogo lendo prosa:

     [recebe foi ADOTADO em 12/09/2026 — ver MAGIA_VERBOS acima]
     absorve    absorção de dano, que é outro subsistema.
     transfere  move recurso entre alvos: precisa de origem E destino.
     converta   troca um recurso por outro.
     altera / modifique / economiza
                genéricos demais para inferir sinal ou unidade.
     conceda    "Conceda ao morto-vivo 15 de energia física" (Criatura
                Disforme) — o alvo é uma criatura INVOCADA. Ver a lacuna de
                invocação, logo abaixo.

   Se alguma delas precisar virar regra, o caminho é o de sempre: decidir o
   sentido com o usuário e acrescentar aqui, não deduzir. */

/* ── LACUNA CONHECIDA: magias de INVOCAÇÃO ─────────────────────────
   Nomeada pelo usuário em 12/09/2026. Quatro magias criam PARTICIPANTES novos
   no meio da batalha, e o motor não sabe fazer isso:

     Projeção            cria uma cópia do personagem
     Guardião Espiritual cria cópias do personagem
     Pseudomatéria       cria um personagem controlado pelo Mestre
     Criatura Disforme   anima uma carcaça

   Os números no texto do nível delas ("A projeção possui 1 de energia
   heroica", "defesa L1 e dano máximo…") NÃO são efeito sobre alguém: são a
   FICHA do invocado. Por isso ficam fora do registro, e por isso o leitor
   não deve aprender `possui` nem `conceda` — ler esses números como buff
   daria energia heroica ao conjurador.

   Entrar de verdade exige o que a batalha ainda não tem: acrescentar um
   participante depois do setup, com snapshot próprio, posição no tabuleiro e
   lugar na ordem de iniciativa. É feature de porte próprio, não primitiva.

   Enquanto isso, seguem narrativas: o Mestre invoca na mão, como já faz. */

/* Unidade = a frase que vem DEPOIS do número. Cada entrada aponta pro nome do
   campo de saída. `coluna` casa "coluna de ataque" e o plural "colunas". */
const MAGIA_UNIDADES = [
  { re: /^\s*colunas?/i,                        campo: 'coluna'  },
  /* O `de` é OPCIONAL nestas quatro. Véu de Maira escreve "Aumente 15 energia
     heroica e 1 coluna de ataque" — sem a preposição —, e o leitor devolvia
     só a coluna: a magia daria o bônus de ataque e nenhum de EH, em silêncio.

     Afrouxar aqui é seguro porque a frase é distintiva: "15 energia heroica"
     não se confunde com nada. O que continua EXIGIDO é a ordem — número
     antes da unidade —, que é o que separa modificador de descrição. */
  { re: /^\s*(?:de\s+)?energia\s+heroica/i,          campo: 'eh'      },
  { re: /^\s*(?:de\s+)?energia\s+f[íi]sica/i,        campo: 'ef'      },
  { re: /^\s*(?:de\s+)?resist[êe]ncia\s+f[íi]sica/i, campo: 'rf'      },
  { re: /^\s*(?:de\s+)?resist[êe]ncia\s+m[áa]gica/i, campo: 'rm'      },
  { re: /^\s*(?:pontos?\s+)?de\s+velocidade/i,  campo: 'vb'      },
  { re: /^\s*de\s+defesa/i,                     campo: 'defesa'  },
  /* `de dano máximo` ANTES de `de dano`, e a ordem é a regra.

     A busca é por `.find`, então a primeira que casar vence. Ataque Infernal
     diz "Cause 28 de dano base E, MAIS 1 DE DANO MÁXIMO na energia física por
     rodada": os dois números caem sob o mesmo verbo, e com `de dano` testado
     primeiro o 1 sobrescrevia o 28 — a magia virava 1 de dano em vez de 28.
     São coisas diferentes: uma é o golpe, a outra é o teto de dano do alvo
     (mod_dano_max), que Pele de Árvore também usa. */
  { re: /^\s*de\s+dano\s+m[áa]ximo/i,           campo: 'dano_max' },
  { re: /^\s*de\s+dano/i,                       campo: 'dano'    },
  // Oferenda: "Aumenta 2 NÍVEIS DA MAGIA e reduz 1 de energia física."
  { re: /^\s*n[íi]ve(?:l|is)\s+da\s+magia/i,    campo: 'nivel_magia' },
  /* Licantropia Lupina: "Aumenta 2 no atributo Força e 1 no atributo Físico e
     diminui 2 no atributo Intelecto e 1 no atributo Carisma."

     Um campo por atributo, com o prefixo `atr_` para não colidir com nada —
     `forca` sozinho seria confundível com a Força que o dano da arma usa. As
     chaves batem com ATRIBUTOS_KEYS de game-data.jsx. */
  { re: /^\s*n[oa]\s+atributo\s+for[çc]a/i,     campo: 'atr_forca'     },
  { re: /^\s*n[oa]\s+atributo\s+f[íi]sico/i,    campo: 'atr_fisico'    },
  { re: /^\s*n[oa]\s+atributo\s+intelecto/i,    campo: 'atr_intelecto' },
  { re: /^\s*n[oa]\s+atributo\s+carisma/i,      campo: 'atr_carisma'   },
  { re: /^\s*n[oa]\s+atributo\s+aura/i,         campo: 'atr_aura'      },
  { re: /^\s*n[oa]\s+atributo\s+agilidade/i,    campo: 'atr_agilidade' },
  { re: /^\s*n[oa]\s+atributo\s+percep[çc][ãa]o/i, campo: 'atr_percepcao' },
];

/* O DISCRIMINADOR é a POSIÇÃO do número: modificador é sempre
   `número + unidade`, nesta ordem e colados. Quem só DESCREVE põe o número
   depois ("velocidade de 5 metros por rodada", na Telecinese) — e esses não
   podem entrar, senão Telecinese viraria um buff de +5. Erro cometido de
   verdade na investigação de 01/09/2026; há teste de regressão pra ele.

   É por isso que as regex de MAGIA_UNIDADES são ancoradas em ^: elas casam
   contra o que vem LOGO DEPOIS do número, não contra a frase inteira. */
/* `diminui` PRECISA estar aqui, não só em MAGIA_VERBOS: é esta regex que
   fatia o texto em trechos por verbo. Sem ela, "Aumenta 1 no atributo Força e
   diminui 1 no atributo Intelecto" virava UM trecho só, e os dois números
   entravam como 'mais'. Em Licantropia o resultado saía certo por acidente —
   o registro é que dá o sinal —, mas um texto com "Aumenta 2 de X e reduz 3
   de X" teria o segundo sobrescrevendo o primeiro sob a ação errada. */
const RE_VERBO = /\b(aumenta|aumente|reduz|reduza|diminui|diminua|restaura|recupera|recupere|recuperam|recuperando|cure|adiciona|adicione|recebe|recebem|recebendo|causa|cause)\b/gi;

/* ── O leitor, com diagnóstico ─────────────────────────────────────
   `efeitosNoNivel` devolve só os valores; esta devolve também o que o parser
   NÃO entendeu. É o que permite auditar o catálogo sem adivinhação: número
   sem unidade conhecida, número sem verbo nenhum, e campo escrito duas vezes
   (a armadilha que Ataque Infernal expôs).

   Uma função só para as duas saídas, de propósito: duplicar a caminhada
   garantiria que auditoria e execução divergissem no primeiro conserto feito
   num lugar só. */
function lerNivel(magia, nivel) {
  const out = {};
  const avisos = [];
  const txt = (magia && magia['nivel_' + nivel]) || '';
  if (!txt) return { valores: out, avisos, texto: '' };

  const escrever = (campo, valor) => {
    if (out[campo] !== undefined && out[campo] !== valor) {
      avisos.push({ tipo: 'sobrescrita', campo, de: out[campo], para: valor });
    }
    out[campo] = valor;
  };

  // Cada ocorrência de verbo abre um TRECHO, que vai até o próximo verbo.
  // Assim "Aumenta 1 coluna e 5 de energia heroica" mantém os dois números
  // sob o mesmo verbo, e um texto com dois verbos não mistura os sinais.
  const verbos = [...txt.matchAll(RE_VERBO)];
  /* Sem verbo de efeito não há nada a ler, e isso NÃO é aviso aqui.

     A primeira versão avisava `sem_verbo` sempre que houvesse número no
     texto, e a auditoria do catálogo real mostrou o erro na hora: Medo diz
     "A magia tem duração de 1 rodada" e Esconjuração "Afeta criaturas de
     estágio 1" — número legítimo, de duração e de teto, que verbo de efeito
     nenhum governa. As duas apareciam como ambíguas nos cinco níveis.

     Quem sabe se a ausência é suspeita é a AUDITORIA, que conhece o registro:
     magia que declara unidade numérica e não entrega nada é problema; magia
     de bandeira ou narrativa, não. Ver auditarMagias. */
  if (!verbos.length) return { valores: out, avisos, texto: txt };

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
      if (!u) {
        avisos.push({ tipo: 'unidade_desconhecida', valor,
                      trecho: resto.slice(0, 40).trim() });
        continue;
      }
      // 'dano' é a única unidade cujo verbo muda o CAMPO, não só o sinal:
      // causar dano e reduzir dano recebido são coisas diferentes, e a
      // segunda é uma primitiva própria (reducao_dano).
      if (u.campo === 'dano') {
        if (acao === 'dano')  escrever('dano', valor);
        if (acao === 'menos') escrever('reducao_dano', valor);
        continue;
      }
      // dano_max não muda de campo por verbo: o sinal quem dá é o registro
      // (Pele de Árvore reduz o teto; Ataque Infernal o aumenta).
      if (u.campo === 'dano_max') { escrever('dano_max', valor); continue; }
      // Restaurar PREENCHE o pool; aumentar LEVANTA o teto. São primitivas
      // distintas (spec §8), então o campo é distinto.
      if (acao === 'cura') {
        if (u.campo === 'eh') { escrever('cura_eh', valor); continue; }
        if (u.campo === 'ef') { escrever('cura_ef', valor); continue; }
        /* Unidade que NÃO é poço, sob verbo de cura, cai no ramo de bônus.

           Véu de Maira diz "Recupera 15 de energia heroica e 1 coluna de
           ataque": o verbo governa os dois, mas "recuperar uma coluna" só
           pode significar ganhar uma. Antes, o `continue` engolia a coluna e
           a magia entregava metade do que promete.

           Não há leitura alternativa, então não é chute — é a única. */
        escrever(u.campo, valor);
        continue;
      }
      if (acao === 'mais' || acao === 'menos') escrever(u.campo, valor);
    }
  });
  return { valores: out, avisos, texto: txt };
}

// A leitura crua, sem diagnóstico — o que o motor usa em combate.
function efeitosNoNivel(magia, nivel) {
  return lerNivel(magia, nivel).valores;
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
  fotomanipulacao:    { alvo: 'inimigo', alvos: 1, icone: '✨',
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
  // A key era `protecao_animal` até 12/09/2026, quando as seis chaves que
  // divergiam do nome foram alinhadas — ver scripts/sql/magias-key-alinha-nome.sql.
  aeroprotecao:       { alvo: 'self', alvos: 1, icone: '🌬️',
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

  /* ── MAGIAS DE CRIATURA (7) — 12/09/2026 ───────────────────────────
     Levantamento das 60 criaturas com magia: 89 menções, 39 nomes distintos,
     100% casando com o catálogo. Destas sete, NENHUMA precisou de primitiva
     nova — todas caem em coisas que o motor já sabe fazer, inclusive duas que
     as técnicas já produziam e as magias ainda não usavam (`dano_por_rodada`
     e `mod_dano_max`).

     Entram porque são as magias que os monstros da mesa realmente usam:
     Piromanipulação e Hidromanipulação lideram com 18 menções juntas, e estas
     sete somam mais 24. */
  bastao_de_luz:      { alvo: 'inimigo', alvos: 1, icone: '🔦',
                        efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  relampago:          { alvo: 'inimigo', alvos: 1, icone: '🌩️',
                        efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  // "Cause 28 de dano base E, mais 1 de dano máximo na energia física POR
  // RODADA" — golpe imediato mais sangramento. dano_por_rodada é a mesma
  // primitiva do Sangramento das técnicas.
  ataque_infernal:    { alvo: 'inimigo', alvos: 1, icone: '😈',
                        efeitos: [{ tipo: 'dano',            unidade: 'dano' },
                                  { tipo: 'dano_por_rodada', unidade: 'dano_max' }] },
  // "Reduza 1 de energia física por rodada" — só o sangramento.
  campo_de_trevas:    { alvo: 'inimigo', alvos: 1, icone: '🌑',
                        efeitos: [{ tipo: 'dano_por_rodada', unidade: 'ef' }] },
  // Irmã de Piroproteção e Aeroproteção, para o elemento terra.
  geoprotecao:        { alvo: 'self', alvos: 1, icone: '🪨',
                        efeitos: [{ tipo: 'reducao_dano', unidade: 'reducao_dano',
                                    elemento: 'terra' }] },
  // "Reduza 4 de dano máximo": baixa o teto de dano de quem bate nela.
  // mod_dano_max já existe — é o que Posicionamento faz nas técnicas.
  pele_de_arvore:     { alvo: 'self', alvos: 1, icone: '🌳',
                        efeitos: [{ tipo: 'mod_dano_max', unidade: 'dano_max', sinal: -1 }] },
  ruido_extenuante:   { alvo: 'inimigo', alvos: 1, icone: '📢',
                        efeitos: [{ tipo: 'mod_ataque', unidade: 'coluna', sinal: -1 },
                                  { tipo: 'mod_vb',     unidade: 'vb',     sinal: -1 }] },

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

  /* ══ VARREDURA DAS ÓRFÃS (28) — 12/09/2026 ═════════════════════════
     O verificador apontou 39 magias com número mecânico legível e sem entrada
     no registro. Destas, 28 tinham alvo e sinal INEQUÍVOCOS na descrição, e
     entram aqui. As 11 que sobraram estão listadas no fim deste bloco, cada
     uma com o motivo — nenhuma delas foi adivinhada.

     Nenhuma primitiva nova foi precisa. `mod_coluna` estreia produtor mágico:
     existia desde a Falha Crítica e só as técnicas a usavam.

     ── Dano em inimigo ───────────────────────────────────────────── */
  armadilha_natural:     { alvo: 'inimigo', alvos: 1, icone: '🪤',
                           efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  energia_primordial:    { alvo: 'inimigo', alvos: 1, icone: '🌌',
                           efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  feixes_incandescentes: { alvo: 'inimigo', alvos: 1, icone: '☀️',
                           efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  flecha_divina:         { alvo: 'inimigo', alvos: 1, icone: '🏹',
                           efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  fogo_divino:           { alvo: 'inimigo', alvos: 1, icone: '🔥',
                           efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  // "dano infernal" não é elemento conhecido, e está certo assim:
  // elementoDoNivel devolve null e proteção elemental nenhuma o corta.
  manipulacao_infernal:  { alvo: 'inimigo', alvos: 1, icone: '👿',
                           efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  putrefacao:            { alvo: 'inimigo', alvos: 1, icone: '🦠',
                           efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  // "onda de choque A PARTIR DO EVOCADOR" e "todos que ouvirem sua voz" são
  // área. Sem raio no catálogo, seguem alvo único com a marca no log —
  // mesmo tratamento de Bola de Fogo e Meteoros.
  onda_destrutiva:       { alvo: 'inimigo', alvos: 1, icone: '💥', parcial: 'area',
                           efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  narrativa_real:        { alvo: 'inimigo', alvos: 1, icone: '📖', parcial: 'area',
                           efeitos: [{ tipo: 'dano', unidade: 'dano' }] },

  /* ── Redução de dano ──────────────────────────────────────────────
     A key era `protecao_elemental` — soava genérica e era especificamente
     água, e procurar por `hidroprotecao` não achava nada. Alinhada ao nome em
     12/09/2026 junto de outras cinco; ver scripts/sql/magias-key-alinha-nome.sql. */
  hidroprotecao:         { alvo: 'self', alvos: 1, icone: '💧',
                           efeitos: [{ tipo: 'reducao_dano', unidade: 'reducao_dano',
                                       elemento: 'agua' }] },

  /* ── Buff em si mesmo ─────────────────────────────────────────── */
  destreza_animal:       { alvo: 'self', alvos: 1, icone: '🐆',
                           efeitos: [{ tipo: 'mod_ataque', unidade: 'coluna', sinal: 1 }] },
  obstinacao:            { alvo: 'self', alvos: 1, icone: '🙏',
                           efeitos: [{ tipo: 'mod_ataque',  unidade: 'coluna', sinal: 1 },
                                     { tipo: 'mod_rf',      unidade: 'rf',     sinal: 1 },
                                     { tipo: 'mod_rm',      unidade: 'rm',     sinal: 1 },
                                     { tipo: 'mod_eh_temp', unidade: 'eh',     sinal: 1 }] },

  /* ── Buff em aliado ─────────────────────────────────────────────── */
  // "coordenando até 4 dos seus companheiros" — o teto está na descrição.
  coordenacao:           { alvo: 'aliado', alvos: 4, icone: '🧭',
                           efeitos: [{ tipo: 'mod_ataque', unidade: 'coluna', sinal: 1 },
                                     { tipo: 'mod_vb',     unidade: 'vb',     sinal: 1 }] },
  perspicacia:           { alvo: 'aliado', alvos: 1, icone: '🔎',
                           efeitos: [{ tipo: 'mod_vb',     unidade: 'vb',      sinal: 1 },
                                     { tipo: 'mod_defesa', unidade: 'defesa',  sinal: 1 },
                                     { tipo: 'mod_ataque', unidade: 'coluna',  sinal: 1 }] },
  cancao_do_alento:      { alvo: 'aliado', alvos: 1, icone: '🎵', parcial: 'area',
                           efeitos: [{ tipo: 'mod_ataque',  unidade: 'coluna', sinal: 1 },
                                     { tipo: 'mod_eh_temp', unidade: 'eh',     sinal: 1 }] },
  cancao_do_animo:       { alvo: 'aliado', alvos: 1, icone: '🎶', parcial: 'area',
                           efeitos: [{ tipo: 'mod_vb',      unidade: 'vb', sinal: 1 },
                                     { tipo: 'mod_eh_temp', unidade: 'eh', sinal: 1 }] },
  // "protege os animais que possui um elo ativo" — mesma metade pendente de
  // Força Mútua: a raça é verificável, o elo não.
  /* O texto diz "RECUPERA 15 de energia heroica", não "aumenta": é cura, que
     preenche o poço até o teto — não `mod_eh_temp`, que levanta o teto. A
     entrada foi corrigida junto com o texto, em 12/09/2026. */
  veu_de_maira:          { alvo: 'aliado', alvos: 1, icone: '🐾',
                           so_racas: ['Animal'], parcial: 'elo_animal',
                           efeitos: [{ tipo: 'cura_pool',  unidade: 'cura_eh', pool: 'eh' },
                                     { tipo: 'mod_ataque', unidade: 'coluna',  sinal: 1 }] },
  // "concede proteção contra ataques de animais, PORÉM isso consome parte de
  // sua energia vital" — buff com custo, como a Oferenda.
  bencao_selvagem:       { alvo: 'aliado', alvos: 1, icone: '🌿',
                           efeitos: [{ tipo: 'mod_ataque', unidade: 'coluna', sinal: 1 },
                                     { tipo: 'cura_pool',  unidade: 'eh', pool: 'eh', sinal: -1 }] },

  /* ── Debuff em inimigo ────────────────────────────────────────────
     ato_falho usa mod_coluna, e NÃO mod_ataque: "reduza 1 coluna de resolução
     para TODAS as ações". mod_ataque só morde arma e magia; mod_coluna pune
     toda ação, que é o que o texto pede. A distinção é a mesma que separa a
     Falha Crítica das técnicas de postura. */
  ato_falho:             { alvo: 'inimigo', alvos: 1, icone: '🎭',
                           efeitos: [{ tipo: 'mod_coluna', unidade: 'coluna', sinal: -1 }] },
  degeneracao_fisica:    { alvo: 'inimigo', alvos: 1, icone: '🦴',
                           efeitos: [{ tipo: 'mod_ataque', unidade: 'coluna', sinal: -1 }] },
  ruido:                 { alvo: 'inimigo', alvos: 1, icone: '🔊',
                           efeitos: [{ tipo: 'mod_ataque', unidade: 'coluna', sinal: -1 }] },
  distracao:             { alvo: 'inimigo', alvos: 1, icone: '👀',
                           efeitos: [{ tipo: 'mod_vb', unidade: 'vb', sinal: -1 }] },
  regiao_inviolavel:     { alvo: 'inimigo', alvos: 1, icone: '🕸️', parcial: 'area',
                           efeitos: [{ tipo: 'mod_vb', unidade: 'vb', sinal: -1 }] },
  cancao_do_sono:        { alvo: 'inimigo', alvos: 1, icone: '🎼', parcial: 'area',
                           efeitos: [{ tipo: 'mod_ataque',  unidade: 'coluna', sinal: -1 },
                                     { tipo: 'mod_eh_temp', unidade: 'eh',     sinal: -1 }] },

  /* ── Dano + debuff no mesmo golpe ───────────────────────────────── */
  cancao_do_tormento:    { alvo: 'inimigo', alvos: 1, icone: '🎻', parcial: 'area',
                           efeitos: [{ tipo: 'dano',       unidade: 'dano' },
                                     { tipo: 'mod_ataque', unidade: 'coluna', sinal: -1 }] },
  carne_em_vermes:       { alvo: 'inimigo', alvos: 1, icone: '🐛',
                           efeitos: [{ tipo: 'dano',       unidade: 'dano' },
                                     { tipo: 'mod_ataque', unidade: 'coluna', sinal: -1 }] },

  /* ── Cura ─────────────────────────────────────────────────────────
     curas_naturais restaura EH no nível 1 e ganha EF nos altos; declarar as
     duas é correto — a conferência exige a unidade em ALGUM nível. */
  curas_naturais:        { alvo: 'aliado', alvos: 1, icone: '🌱',
                           efeitos: [{ tipo: 'cura_pool', unidade: 'cura_eh', pool: 'eh' },
                                     { tipo: 'cura_pool', unidade: 'cura_ef', pool: 'ef' }] },
  curas_heroicas:        { alvo: 'aliado', alvos: 1, icone: '💗',
                           efeitos: [{ tipo: 'cura_pool', unidade: 'cura_eh', pool: 'eh' }] },

  /* ── AS 11 QUE FICARAM DE FORA, e por quê ──────────────────────────
     Nenhuma foi adivinhada. Todas seguem aparecendo como órfãs no
     verificador, que é o comportamento certo: número legível, motor ignora.

       aura_ameacadora  alvo é um OBJETO de arte tocado, e o efeito recai em
                        quem olhar. Não há alvo de combate a escolher.
       auxilio_natural  "Cause 4 de DANO MÁXIMO" — no motor, dano_max é o teto
                        de dano do alvo, não dano causado. O texto é ambíguo.
       campo_abencoado  "Restaura 1 de energia física POR HORA" — fora de
                        combate.
       doencas          doenças nomeadas, com efeito por atributo. Subsistema.
       forcar_disputa   "+2 de velocidade" em quem? A descrição é sobre atrair
                        o adversário; o bônus não tem dono claro.
       garras           alcance Pessoal e causa dano: são as SUAS garras. O
                        modelo trata Pessoal como "só em si mesmo".
       lamina_de_luz    idem, e ainda "não tem efeito sobre outros seres" que
                        não demônios e mortos-vivos.
       manjar_de_lena   restaura karma, que não é primitiva de rodada, e é
                        ritual de comida.
       parede_de_cristal  é uma PAREDE no terreno, não um buff num alvo.
       protecao_natural "com um teste de atributo percepção (Absurdo)" — teste
                        de atributo não é mecanismo que o combate tenha.
       tensao           buff de defesa/velocidade/coluna que EXIGE teste de
                        resistência. Buff que o alvo resiste não faz sentido
                        como buff; provável que seja debuff mal redigido.

     Quatro delas (garras, lamina_de_luz, auxilio_natural, tensao) são
     candidatas a CORREÇÃO DE TEXTO, não a código. Ver docs/manutencao-magias.md
     ══════════════════════════════════════════════════════════════════ */

  /* ── META e ATRIBUTO (2) — 12/09/2026 ──────────────────────────────
     As duas que a Fase 1 adiou em §2.3 por não serem "um número somado a um
     stat por N rodadas". Continuam não sendo — cada uma trouxe a primitiva
     que faltava.

     OFERENDA: "A próxima magia que evocar terá seus níveis ampliados.
     Enquanto este efeito durar, você não poderá recuperar sua energia física
     de nenhuma forma." Três coisas de uma vez:

       mod_nivel_magia — status consumido pela PRÓXIMA magia, não por rodada.
                         Usa consome_em, o mesmo mecanismo da Esquiva.
       cura_pool −1    — o sangue oferecido: custo imediato de EF. Reusa
                         aplicarCuraPool invertido, que já tem piso 0.
       sem_cura_ef     — bandeira que bloqueia recuperação de EF enquanto dura.

     O nível soma direto na escala 1/3/5/7/9, e cai certo: "+2 níveis" leva 1
     a 3, e "+6" leva 1 a 7. Teto em 9. */
  oferenda:           { alvo: 'self', alvos: 1, icone: '🩸',
                        efeitos: [{ tipo: 'mod_nivel_magia', unidade: 'nivel_magia',
                                    sinal: 1, consome_em: 'magia_evocada' },
                                  { tipo: 'cura_pool', unidade: 'ef', pool: 'ef', sinal: -1 },
                                  { tipo: 'sem_cura_ef', valor: true }] },
  /* LICANTROPIA LUPINA: o atributo sobe e desce junto — Força e Físico para
     cima, Intelecto e Carisma para baixo, nos três níveis. Por isso o sinal
     mora aqui: o parser devolve só a magnitude ("diminui 2" vira 2).

     `mod_atributo` entra na coluna de ataque, que é onde o atributo toca a
     rodada — NÃO nos poços. Ver aplicarModsAtributo para o porquê. */
  licantropia_lupina: { alvo: 'self', alvos: 1, icone: '🐺',
                        efeitos: [{ tipo: 'mod_atributo', unidade: 'atr_forca',
                                    atributo: 'forca', sinal: 1 },
                                  { tipo: 'mod_atributo', unidade: 'atr_fisico',
                                    atributo: 'fisico', sinal: 1 },
                                  { tipo: 'mod_atributo', unidade: 'atr_intelecto',
                                    atributo: 'intelecto', sinal: -1 },
                                  { tipo: 'mod_atributo', unidade: 'atr_carisma',
                                    atributo: 'carisma', sinal: -1 }] },

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

/* ============================================================
   AUDITORIA DO CATÁLOGO
   ============================================================
   Responde a pergunta de manutenção: "mudei o texto de uma magia — o motor
   ainda entende?"

   POR QUE ISTO EXISTE. O acordo entre o registro e o texto é travado por um
   teste (magias-efeito.test.js), mas esse teste compara o mapa contra CÓPIAS
   do texto coladas no próprio arquivo. Ele pega mudança no CÓDIGO; não pega
   mudança no BANCO. Editar uma magia pelo admin e quebrar o padrão não
   dispara nada — a magia só para de fazer efeito, em silêncio, e a mesa
   descobre no meio do combate.

   Esta auditoria roda contra o catálogo DE VERDADE e classifica cada magia:

     ok         — tem registro, e todas as unidades declaradas são lidas
     quebrada   — tem registro, e alguma unidade NÃO é lida em nível nenhum
                  (o caso grave: a magia virou um efeito de zero)
     ambigua    — o texto tem número que o leitor não entende, ou um campo
                  escrito duas vezes no mesmo nível
     orfa       — NÃO tem registro, mas o texto tem número mecânico legível.
                  Pode ser magia nova esperando entrada, ou narrativa que por
                  acaso cita um número. É a lista para o Mestre olhar.
     narrativa  — sem registro e sem número: tudo certo, nada a fazer

   NÍVEL A NÍVEL, e a unidade precisa aparecer em ALGUM nível, não em todos:
   Licantropia só menciona Físico e Carisma a partir do nível 5, e isso é
   legítimo.
   ============================================================ */
const MAGIA_NIVEIS = [1, 3, 5, 7, 9];

function auditarMagias(magiasDb) {
  const lista = Array.isArray(magiasDb) ? magiasDb : [];
  const out = { ok: [], quebrada: [], ambigua: [], orfa: [], narrativa: [] };

  lista.forEach((m) => {
    if (!m || !m.key) return;
    const reg = MAGIA_EFEITO_MAP[m.key] || null;

    // Lê os cinco níveis uma vez só.
    const leituras = MAGIA_NIVEIS.map((n) => ({ nivel: n, ...lerNivel(m, n) }))
      .filter((l) => l.texto);

    const avisos = [];
    leituras.forEach((l) => {
      l.avisos.forEach((a) => avisos.push({ ...a, nivel: l.nivel }));
    });

    const unidadesLidas = new Set();
    leituras.forEach((l) => Object.keys(l.valores).forEach((k) => unidadesLidas.add(k)));

    if (!reg) {
      // Sem registro: narrativa, a menos que o texto entregue número legível.
      if (unidadesLidas.size > 0) {
        out.orfa.push({ key: m.key, nome: m.nome, unidades: [...unidadesLidas] });
      } else {
        out.narrativa.push({ key: m.key, nome: m.nome });
      }
      return;
    }

    // Com registro: toda unidade declarada tem que ser lida em ALGUM nível.
    // Efeito de bandeira (valor: true) não lê número — não entra na conta.
    const declaradas = reg.efeitos.filter((ef) => ef.valor === undefined)
      .map((ef) => ef.unidade);
    const faltando = declaradas.filter((u) => !unidadesLidas.has(u));

    if (faltando.length) {
      out.quebrada.push({ key: m.key, nome: m.nome, faltando, avisos });
      return;
    }
    if (avisos.length) {
      out.ambigua.push({ key: m.key, nome: m.nome, avisos });
      return;
    }
    out.ok.push({ key: m.key, nome: m.nome });
  });

  return out;
}

/* Resumo de uma linha, para o cabeçalho do painel e para o log do script. */
function resumoAuditoria(r) {
  return {
    ok: r.ok.length, quebrada: r.quebrada.length, ambigua: r.ambigua.length,
    orfa: r.orfa.length, narrativa: r.narrativa.length,
    total: r.ok.length + r.quebrada.length + r.ambigua.length
         + r.orfa.length + r.narrativa.length,
  };
}

Object.assign(window, { lerNivel, auditarMagias, resumoAuditoria, MAGIA_NIVEIS });

/* ── Casamento nome → magia, usado pelas criaturas ─────────────────
   `criaturas.magia` é TEXTO com os nomes separados por vírgula
   ("Geoproteção, Transformação"), e não chaves. Quem resolve isso em combate
   é magiasConhecidasDoAtor; quem audita é auditarCriaturas.

   Os dois chamam ESTAS funções, e não cada um a sua cópia: auditoria que não
   usa exatamente a mesma regra do motor mente — diria que está tudo certo
   enquanto a mesa vê a magia sumir.

   O índice é por nome normalizado (sem caixa, sem espaço nas pontas), que é a
   tolerância que o editor de catálogo pede: o Mestre digita à mão. */
function indiceMagiasPorNome(magias) {
  const lista = Array.isArray(magias) ? magias : Object.values(magias || {});
  const idx = {};
  lista.forEach((m) => {
    if (m && m.nome) idx[String(m.nome).trim().toLowerCase()] = m;
  });
  return idx;
}

/* Devolve `{ achadas, naoAchadas }`. `naoAchadas` é o que o motor ignora em
   silêncio — e é exatamente o que a auditoria precisa ver. */
function resolverNomesDeMagia(csv, indice) {
  const achadas = [];
  const naoAchadas = [];
  String(csv || '').split(',').forEach((txt) => {
    const nome = txt.trim();
    if (!nome) return;
    const m = indice[nome.toLowerCase()];
    if (m) achadas.push(m); else naoAchadas.push(nome);
  });
  return { achadas, naoAchadas };
}

/* ── Auditoria das magias DE CRIATURA ──────────────────────────────
   A auditoria de `magias` não pega o furo mais traiçoeiro do catálogo:
   renomear uma magia. `personagens.magias` referencia por `key` e sobrevive,
   mas `criaturas.magia` referencia por NOME — trocar "Piromanipulação" por
   outra coisa quebra as 10 criaturas que a citam, sem nada avisando.

   `nome` parece conteúdo editável, e não é: é identidade. Daí esta auditoria.

   Classifica cada criatura com magia:
     ok          — todos os nomes casam, e ao menos um tem efeito no motor
     nome_orfao  — algum nome NÃO casa com magia nenhuma (o caso grave)
     sem_nivel   — casa, mas `magia_n` está vazio: o motor cai em nível 1
     so_narrativa— todos casam e nenhum tem entrada no registro (informativo)
   ============================================================ */
function auditarCriaturas(criaturasDb, magiasDb) {
  const criaturas = Array.isArray(criaturasDb) ? criaturasDb : [];
  const indice = indiceMagiasPorNome(magiasDb);
  const out = { ok: [], nome_orfao: [], sem_nivel: [], so_narrativa: [] };

  criaturas.forEach((c) => {
    if (!c || !c.magia || !String(c.magia).trim()) return;
    const { achadas, naoAchadas } = resolverNomesDeMagia(c.magia, indice);

    if (naoAchadas.length) {
      out.nome_orfao.push({ id: c.id, nome: c.nome, nomes: naoAchadas });
      return;
    }
    if (c.magia_n == null || !Number(c.magia_n)) {
      out.sem_nivel.push({ id: c.id, nome: c.nome,
                           magias: achadas.map((m) => m.nome) });
      return;
    }
    const comEfeito = achadas.filter((m) => MAGIA_EFEITO_MAP[m.key]);
    if (!comEfeito.length) {
      out.so_narrativa.push({ id: c.id, nome: c.nome,
                              magias: achadas.map((m) => m.nome) });
      return;
    }
    out.ok.push({ id: c.id, nome: c.nome,
                  magias: comEfeito.map((m) => m.nome) });
  });

  return out;
}

function resumoAuditoriaCriaturas(r) {
  return {
    ok: r.ok.length, nome_orfao: r.nome_orfao.length,
    sem_nivel: r.sem_nivel.length, so_narrativa: r.so_narrativa.length,
    total: r.ok.length + r.nome_orfao.length + r.sem_nivel.length + r.so_narrativa.length,
  };
}

Object.assign(window, {
  indiceMagiasPorNome, resolverNomesDeMagia,
  auditarCriaturas, resumoAuditoriaCriaturas,
});
