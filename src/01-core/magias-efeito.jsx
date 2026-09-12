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
  /* Saúde é uma das 8 CONDIÇÕES da ficha (escala −50..+50), não um poço de
     combate. Doenças é a única magia que mexe nela: "Reduz 25 de Saúde".
     Ver mod_condicao no registro e aplicarCondicoesDaMagia no motor. */
  { re: /^\s*de\s+sa[úu]de/i,                   campo: 'saude'   },
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
  // Dueto Mágico: "Aumenta 2 níveis DAS MAGIAS evocadas" — o plural entrou em
  // 12/09/2026 com a varredura das magias que nenhum personagem conhece.
  { re: /^\s*n[íi]ve(?:l|is)\s+d[ae]s?\s+magias?/i, campo: 'nivel_magia' },
  /* DIFICULDADE DE HABILIDADE — 12/09/2026.

     "Reduza 1 nível de dificuldade da habilidade Furtividade." É a forma mais
     comum do catálogo fora de dano e cura: vinte e poucas magias a usam, e
     nenhuma entrava no motor porque ele não sabia mexer em dificuldade.

     O número é quantos DEGRAUS a escala anda (Fácil · Médio · Difícil · Muito
     Difícil · Absurdo); QUAL habilidade é lido por habilidadesDaDificuldade,
     do mesmo texto — assim o admin troca a habilidade sem me chamar.

     `nível de dificuldade` vem ANTES de qualquer outra unidade que comece por
     "nível": a de cima exige "da magia", então as duas não se confundem. */
  { re: /^\s*n[íi]ve(?:l|is)\s+de\s+dificuldade/i, campo: 'dificuldade' },
  /* Licantropia Lupina: "Aumenta 2 no atributo Força e 1 no atributo Físico e
     diminui 2 no atributo Intelecto e 1 no atributo Carisma."

     Um campo por atributo, com o prefixo `atr_` para não colidir com nada —
     `forca` sozinho seria confundível com a Força que o dano da arma usa. As
     chaves batem com ATRIBUTOS_KEYS de game-data.jsx.

     `de atributo` também vale (12/09/2026): Força Sagrada escreve "Aumente 1
     de atributo força". A preposição muda, a ordem número-antes-da-unidade
     continua exigida. */
  { re: /^\s*(?:n[oa]|de)\s+atributo\s+for[çc]a/i,     campo: 'atr_forca'     },
  { re: /^\s*(?:n[oa]|de)\s+atributo\s+f[íi]sico/i,    campo: 'atr_fisico'    },
  { re: /^\s*(?:n[oa]|de)\s+atributo\s+intelecto/i,    campo: 'atr_intelecto' },
  { re: /^\s*(?:n[oa]|de)\s+atributo\s+carisma/i,      campo: 'atr_carisma'   },
  { re: /^\s*(?:n[oa]|de)\s+atributo\s+aura/i,         campo: 'atr_aura'      },
  { re: /^\s*(?:n[oa]|de)\s+atributo\s+agilidade/i,    campo: 'atr_agilidade' },
  { re: /^\s*(?:n[oa]|de)\s+atributo\s+percep[çc][ãa]o/i, campo: 'atr_percepcao' },
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
/* OS SEIS ELEMENTOS (decisão do usuário, 12/09/2026). São estes e só estes:

     Celestial · Ar · Fogo · Água · Terra · Infernal

   Duas correções entraram com a lista:

   'luz' NÃO é um sétimo elemento — era o nome antigo do Celestial, e as duas
   formas conviviam no catálogo ("dano celestial" em Dardos de Luz, "dano
   elemental de luz" em Fotomanipulação). Eram tratadas como elementos
   distintos, então proteção celestial não cortaria a Lâmina de Luz. Os textos
   do banco foram alinhados por scripts/sql/magias-elemento-luz-vira-celestial.sql,
   e 'luz' fica aqui como SINÔNIMO: texto antigo, catálogo de outra mesa ou
   digitação do admin continuam sendo lidos, e caem no mesmo elemento.

   'infernal' era lido como SEM elemento — havia um comentário dizendo que
   estava certo assim. Não estava: é elemento, e com ele Manipulação Infernal
   passa a ser cortável por proteção. */
const MAGIA_ELEMENTOS = [
  { re: /\bfogo\b/,             campo: 'fogo'      },
  { re: /\bagua\b/,             campo: 'agua'      },
  { re: /\bar\b/,               campo: 'ar'        },
  { re: /\bterra\b/,            campo: 'terra'     },
  { re: /\b(celestial|luz)\b/,  campo: 'celestial' },
  { re: /\binfernal\b/,         campo: 'infernal'  },
];
const MAGIA_ELEMENTOS_VALIDOS = ['celestial', 'ar', 'fogo', 'agua', 'terra', 'infernal'];

/* ── Penalidade que CRESCE a cada rodada ───────────────────────────
   Doenças, nível 9: "Reduz 7 colunas de ataque. Além disso, a cada rodada a
   penalidade aumenta 2 pontos (menos 9, menos 11, menos 13..)".

   NÃO entra na gramática `verbo + número + unidade`, de propósito. A unidade
   ali seria "pontos", que é palavra de enchimento em meio catálogo — Distração
   diz "Reduza 4 PONTOS de velocidade", e uma unidade `pontos` solta roubaria
   aquele número antes de `de velocidade` ser testado. Então ancora na FRASE
   inteira, que é distintiva, como RE_RESIST faz com o teste de resistência.

   Devolve o passo (sempre positivo); o sinal vem do efeito que ela modifica. */
const RE_ESCALADA = /a\s+cada\s+rodada[^.]{0,40}?(?:aumenta|cresce)\s+(\d+)/i;

function escaladaNoNivel(magia, nivel) {
  const txt = (magia && magia['nivel_' + nivel]) || '';
  const m = RE_ESCALADA.exec(txt);
  return m ? Math.abs(parseInt(m[1], 10)) || null : null;
}

/* ============================================================
   FORA DE COMBATE — 12/09/2026
   ============================================================
   Duas decisões do usuário definem esta seção inteira:

     1. "Fora de batalha, as rodadas não contam."
     2. "Magias que aplicam efeitos em outros jogadores precisam de aprovação
        do Mestre."

   A primeira não é limitação: é uma classificação que o catálogo JÁ tinha
   feito, e ela dispensa inventar qualquer taxa entre rodada e minuto.
   Ver docs/fora-de-combate.md.
   ============================================================ */
/* Em qual dos quatro baldes esta evocação cai.

   Lê o TEXTO DO NÍVEL primeiro: 53 magias têm `duracao: 'Variável'`, que
   significa "veja o nível" — e a mesma magia pode ser instantânea no nível 1 e
   durar horas no 9. A classificação é por EVOCAÇÃO, não por magia. */
const RE_DUR_RODADAS = /\brodadas?\b/i;
const RE_DUR_CALENDARIO = /\b(segundos?|minutos?|horas?|dias?|semanas?|m[êe]s|meses|anos?)\b/i;
const RE_DUR_PERM = /\b(permanente|para\s+sempre|definitiv)/i;

function classeDeDuracao(magia, nivel) {
  const doNivel = (magia && magia['nivel_' + nivel]) || '';
  // "A magia tem duração de 1 rodada." — a frase do nível manda.
  const mNivel = /dura[çc][ãa]o\s+de\s+([^.]+)/i.exec(doNivel);
  const candidatos = [mNivel ? mNivel[1] : null, (magia && magia.duracao) || ''];

  for (const txt of candidatos) {
    if (!txt) continue;
    if (RE_DUR_PERM.test(txt)) return 'permanente';
    if (RE_DUR_RODADAS.test(txt)) return 'rodadas';
    if (RE_DUR_CALENDARIO.test(txt)) return 'calendario';
    if (/instant[âa]nea/i.test(txt)) return 'instantanea';
  }
  // Sem nada legível — trata como instantânea, que é o balde que aplica e
  // acaba: erra para o lado de não deixar efeito pendurado na ficha.
  return 'instantanea';
}

/* A magia vale fora de combate? Rodada é coisa de batalha — decisão do
   usuário. Instantânea e permanente valem; calendário fica para o degrau 3. */
function valeForaDeCombate(magia, nivel) {
  const c = classeDeDuracao(magia, nivel);
  return c === 'instantanea' || c === 'permanente';
}

/* ── A magia, traduzida para o formato que a FICHA já sabe aplicar ──
   Devolve a MESMA forma de `efeitosDoItem` — [{ scope, key, delta }] — para
   que `aplicarEfeitosItem` faça o trabalho. Não é atalho: é o que impede uma
   segunda verdade. O clamp de pool, a escala de condição e o piso de zero
   passam a ser exatamente os mesmos de um item consumido, e há um lugar só
   para corrigir quando algum estiver errado.

   Só as primitivas INSTANTÂNEAS entram, e o encaixe é feliz: elas são
   exatamente as que cabem numa ficha. As duradouras (mod_ataque, mod_defesa,
   mod_vb…) precisam de `status_temp`, que conta rodadas — e rodada, fora de
   combate, não conta. As duas regras chegam à mesma fronteira por caminhos
   diferentes, o que é um bom sinal de que a fronteira é real. */
function efeitosDeMagiaNaFicha(magia, nivel) {
  const reg = magiaEfeitoDe(magia && magia.key);
  if (!reg) return [];
  const lido = efeitosNoNivel(magia, nivel);
  const out = [];

  reg.efeitos.forEach((ef) => {
    const bruto = ef.unidade != null ? lido[ef.unidade] : null;
    switch (ef.tipo) {
      case 'cura_pool':
        // `sinal: -1` existe: Necropotência cura morto-vivo e fere vivo.
        if (bruto != null && (ef.pool === 'eh' || ef.pool === 'ef')) {
          out.push({ scope: 'vitalidade', key: ef.pool, delta: (ef.sinal || 1) * bruto });
        }
        break;
      case 'dreno_eh':
        if (bruto != null) out.push({ scope: 'vitalidade', key: 'eh', delta: bruto });
        break;
      case 'dano':
        // Fora de combate não há armadura nem cascata: o dano vai direto na
        // energia física. É a mesma simplificação do veneno por rodada.
        if (bruto != null) out.push({ scope: 'vitalidade', key: 'ef', delta: -bruto });
        break;
      case 'mod_condicao':
        if (bruto != null && ef.condicao) {
          out.push({ scope: 'condicoes', key: ef.condicao, delta: (ef.sinal || 1) * bruto });
        }
        break;
      default:
        break;   // duradoura: não cabe na ficha, e a regra das rodadas já diz
    }
  });
  return out;
}

/* Por que esta evocação não aplicou nada — texto pronto para o log da mesa.
   Devolve null quando ela APLICA; string quando não, e a string diz o motivo.
   Sem isto, "evoquei e não aconteceu nada" vira suporte. */
function motivoNaoAplicaNaFicha(magia, nivel) {
  const reg = magiaEfeitoDe(magia && magia.key);
  if (!reg) return 'narrativa';                       // sem entrada no motor
  const classe = classeDeDuracao(magia, nivel);
  if (classe === 'rodadas') return 'rodadas';         // é magia de combate
  /* Calendário ENTROU no degrau 3 (12/09/2026): passa a virar magia ativa na
     ficha, com data de vencimento, e a valer na próxima batalha. Antes caía
     aqui como "o Mestre aplica". */
  if (classe === 'calendario') return null;
  if (efeitosDeMagiaNaFicha(magia, nivel).length === 0) {
    // Dificuldade "para o próximo teste" também aplica: vira magia ativa até
    // ser consumida (magiaAtivaDaEvocacao).
    return magiaConsumidaNoTeste(magia, nivel) ? null : 'duradoura';
  }
  return null;
}

/* ── A magia POUSA na ficha: uma porta só ──────────────────────────
   Quem evoca em si mesmo (a ficha) e quem aprova a evocação no colega (o
   Mestre, na Central de Mensagens) escreviam cada um a sua versão — e a do
   Mestre esquecia a magia ativa: uma Bênção de "1 hora" aprovada no colega
   curava o que tinha de instantâneo e perdia o resto. Achado da varredura de
   12/09/2026.

   Faz as duas coisas na ordem certa: efeitos instantâneos pelo mesmo
   aplicarEfeitosNaFicha do item consumido, e depois a magia ativa, que RENOVA
   em vez de empilhar. `extras` leva o que não é da magia (o karma do
   conjurador, quando é ele próprio o alvo). */
function aplicarMagiaNoEstado(estado, magia, nivel, maximos, dataJogo, extras) {
  const efeitos = [...efeitosDeMagiaNaFicha(magia, nivel), ...(extras || [])];
  let novo = (typeof aplicarEfeitosNaFicha === 'function')
    ? aplicarEfeitosNaFicha(estado, efeitos, maximos) : estado;
  const ativa = magiaAtivaDaEvocacao(magia, nivel, dataJogo);
  if (ativa) {
    const base = novo || {};
    const outras = (base.magias_ativas || []).filter((a) => a && a.key !== ativa.key);
    novo = { ...base, magias_ativas: [...outras, ativa] };
  }
  return novo;
}

/* ── DEGRAU 2: a evocação que espera o Mestre ──────────────────────
   Decisão do usuário: "magias que aplicam efeitos em outros jogadores
   precisam de aprovação do Mestre". Isso não é contorno da regra do banco —
   é o que a torna desnecessária de contornar: o Mestre JÁ pode escrever em
   todo protagonista da história dele, então quem aplica é alguém que já
   podia. Ver docs/fora-de-combate.md §2.

   Estas duas funções leem e escrevem o `meta` do evento em mesa_log, que é a
   fila. Ficam aqui, no núcleo, porque quem PRODUZ o pedido (a ficha do
   jogador) e quem o CONSOME (o painel do Mestre) são telas diferentes — e a
   forma do pedido não pode ser descrita duas vezes. */
function pedidoDeMagiaPendente(meta) {
  if (!meta || typeof meta !== 'object') return null;
  if (!meta.pendente) return null;
  if (meta.alvo_id == null || !meta.magia_key) return null;
  return {
    magia_key: meta.magia_key,
    magia: meta.magia || meta.magia_key,
    nivel: Number(meta.nivel) || 1,
    alvo_id: meta.alvo_id,
    alvo_nome: meta.alvo_nome || null,
    conjurador: meta.conjurador_nome || null,
  };
}

/* O `meta` que a ficha grava ao evocar. Um lugar só para a forma do pedido:
   o painel do Mestre lê exatamente estes campos, e pedidoDeMagiaPendente
   acima é o leitor. */
function metaDeEvocacao({ magia, nivel, alvo, aplicou, motivo, karma, conjurador }) {
  return {
    magia: magia ? magia.nome : null,
    magia_key: magia ? magia.key : null,
    nivel,
    alvo_id: alvo ? alvo.id : null,
    alvo_nome: alvo ? alvo.nome : null,
    conjurador_nome: conjurador || null,
    aplicado: !!aplicou,
    // Pendente = saiu do conjurador e espera o Mestre pousar no alvo.
    pendente: !aplicou && !!(alvo && motivo === 'aprovacao_mestre'),
    motivo: aplicou ? null : (motivo || null),
    karma_gasto: karma || 0,
  };
}

/* ── DEGRAU 3: a magia que dura no CALENDÁRIO ──────────────────────
   57 magias duram minutos, horas, dias ou anos. Fora de combate elas não têm
   rodadas para contar — mas têm a data do jogo, que já existe e que
   somarDiasFantasy já sabe somar (construída para a cura de Doenças).

   O que as torna úteis é o que acontece DEPOIS: uma Bênção de "1 hora"
   lançada antes de entrar na masmorra precisa estar ativa quando a luta
   começa. Por isso a magia ativa fica na FICHA, com data de vencimento, e o
   snapshot de batalha a transforma em status_temp na hora de montar.

   O calendário tem grão de DIA. Minutos e horas vencem no mesmo dia de jogo —
   e é honesto: quando o Mestre avança a data, elas acabaram. Fingir precisão
   de hora num calendário que só conta dias seria mentir com mais casas. */
const RE_QUANTIDADE_TEMPO = /(\d+)\s*(minutos?|horas?|dias?|semanas?|m[êe]s|meses|anos?)/gi;
const DIAS_POR_UNIDADE = { minuto: 0, hora: 0, dia: 1, semana: 7, mes: 30, ano: 361 };

function duracaoEmDiasDeJogo(magia, nivel) {
  if (classeDeDuracao(magia, nivel) !== 'calendario') return null;
  // O texto do nível manda, como em toda a família (53 magias 'Variável').
  const doNivel = (magia && magia['nivel_' + nivel]) || '';
  const mNivel = /dura[çc][ãa]o\s+de\s+([^.]+)/i.exec(doNivel);
  const txt = (mNivel ? mNivel[1] : (magia && magia.duracao)) || '';

  let dias = 0, achou = false;
  // "1 ano e 1 dia" soma as duas parcelas — por isso o laço, e não um match.
  RE_QUANTIDADE_TEMPO.lastIndex = 0;
  let m = RE_QUANTIDADE_TEMPO.exec(txt);
  while (m) {
    const n = parseInt(m[1], 10);
    const un = semAcento(m[2]).replace(/s$/, '').replace('mese', 'mes');
    if (Number.isFinite(n) && DIAS_POR_UNIDADE[un] != null) {
      dias += n * DIAS_POR_UNIDADE[un];
      achou = true;
    }
    m = RE_QUANTIDADE_TEMPO.exec(txt);
  }
  return achou ? dias : null;
}

/* A magia ativa que a evocação cria, ou null quando ela não dura no
   calendário. `vence_em` é a data do jogo em que ela deixa de valer.

   Guarda o NÍVEL, não os efeitos já calculados: o texto do nível é a fonte, e
   congelar números aqui criaria uma segunda cópia que sairia de sincronia no
   primeiro ajuste do catálogo — o erro que este projeto passou a semana
   inteira corrigindo. */
function magiaAtivaDaEvocacao(magia, nivel, dataJogo) {
  if (!magia || !magia.key) return null;
  const dias = duracaoEmDiasDeJogo(magia, nivel);
  /* Sem data de vencimento, mas "para o próximo teste" (Avaliação, Faro):
     fica sem `vence_em` — magiasAtivasVigentes mantém quem não tem fim — e
     com `consome_em`, que consumirMagiasDoTeste queima depois do teste. */
  if (dias == null) {
    return magiaConsumidaNoTeste(magia, nivel)
      ? { key: magia.key, nome: magia.nome || magia.key, nivel, consome_em: 'teste_habilidade' }
      : null;
  }
  if (typeof somarDiasFantasy !== 'function') return null;
  const vence = somarDiasFantasy(dataJogo, dias);
  if (!vence) return null;   // história sem data definida
  return { key: magia.key, nome: magia.nome || magia.key, nivel, vence_em: vence };
}

/* VENCIMENTO PREGUIÇOSO: a magia expira por comparação NA LEITURA, nunca por
   rotina de fundo. Nada avança a data do jogo sozinho — se o vencimento
   dependesse de um processo, os bônus nunca acabariam. É o mesmo padrão da
   cura natural de Doenças.

   Vence NO DIA: uma magia que vence em 14 ainda vale no 13 e já não vale no
   14. Minutos e horas dão 0 dias e portanto vencem no mesmo dia — que é o
   grão do calendário. */
function magiasAtivasVigentes(ativas, dataJogo) {
  const lista = Array.isArray(ativas) ? ativas : [];
  if (typeof dataFantasyParaAbsoluto !== 'function') return lista;
  const hoje = dataFantasyParaAbsoluto(dataJogo);
  if (hoje == null) return lista;   // sem data, não há como vencer nada
  return lista.filter((a) => {
    const fim = a && a.vence_em ? dataFantasyParaAbsoluto(a.vence_em) : null;
    return fim == null ? true : hoje < fim;
  });
}

/* Quais pedidos ainda esperam o Mestre.

   `mesa_log` é APPEND-ONLY para o cliente — conferi no banco: só há política
   de SELECT, e a escrita passa pela RPC. Então um pedido não é "marcado como
   resolvido": o que existe é um SEGUNDO evento apontando para o primeiro, por
   `meta.responde_pedido`. Melhor assim — o histórico da mesa fica intacto, e
   dá para ler depois quem aprovou o quê.

   Recebe as linhas cruas de listar_eventos_mesa (que devolve SETOF mesa_log,
   então `meta` vem junto) e devolve só os abertos, do mais novo ao mais
   velho: o Mestre resolve o que acabou de chegar. */
function pedidosDeMagiaAbertos(linhas) {
  const rows = Array.isArray(linhas) ? linhas : [];
  const respondidos = new Set();
  rows.forEach((r) => {
    const id = r && r.meta && r.meta.responde_pedido;
    if (id != null) respondidos.add(String(id));
  });
  return rows
    .filter((r) => r && !respondidos.has(String(r.id)) && pedidoDeMagiaPendente(r.meta))
    .map((r) => ({ ...pedidoDeMagiaPendente(r.meta), id: r.id, quando: r.created_at }))
    .reverse();
}

/* ── Até qual escuridão a magia deixa enxergar ─────────────────────
   Visão Animal, e a escada está no texto dos níveis:

     nível 1  "Permite enxergar na escuridão parcial."
     nível 3  "...na escuridão total."
     nível 5  "...na escuridão mágica."

   Os três nomes são os mesmos que a própria descrição da magia define (noite
   sem lua / ambiente fechado / ausência total de luz) e os mesmos que o
   tabuleiro usa. Ler daqui em vez de fixar no registro mantém a regra do
   projeto: o número está no texto, e você pode reescalonar sem me chamar.

   Devolve 1, 2 ou 3 — ou null quando o nível não fala de enxergar. */
const ESCURIDAO_NIVEL = { parcial: 1, total: 2, magica: 3 };
const RE_VISAO = /enxergar\s+na\s+escurid[aã]o\s+(parcial|total|m[áa]gica)/i;

function visaoEscuridaoNoNivel(magia, nivel) {
  const txt = (magia && magia['nivel_' + nivel]) || '';
  const m = RE_VISAO.exec(txt);
  if (!m) return null;
  return ESCURIDAO_NIVEL[semAcento(m[1])] || null;
}

/* ── Teste de HABILIDADE exigido pela magia ────────────────────────
   Proteção Natural: "Com um teste da habilidade Sentidos (Absurdo), reduz 4 de
   dano." A dificuldade AFROUXA com o nível — Absurdo no 1, Fácil no 9 —, então
   ela é lida do texto como qualquer outro número, e não fica no registro.

   Irmã de exigeResistencia, e a diferença é de quem rola:
     • resistência  — rola o ALVO, para escapar da magia;
     • habilidade   — rola o CONJURADOR, para a magia sair.

   Devolve { habilidade, dificuldade } ou null. `dificuldade` já vem na chave
   que D20_QUALIDADE_MINIMA usa, para o motor não ter duas grafias da mesma
   escala. */
const DIFICULDADE_POR_NOME = {
  facil: 'facil', medio: 'medio', dificil: 'dificil',
  'muito dificil': 'muito_dificil', absurdo: 'absurdo',
};
const RE_TESTE_HAB = /teste\s+d[ae]\s+habilidade\s+([^(,.]+?)\s*\(([^)]+)\)/i;

function testeHabilidadeNoNivel(magia, nivel) {
  const txt = (magia && magia['nivel_' + nivel]) || '';
  const m = RE_TESTE_HAB.exec(txt);
  if (!m) return null;
  const habilidade = m[1].trim();
  const dif = DIFICULDADE_POR_NOME[semAcento(m[2]).trim()];
  if (!habilidade || !dif) return null;
  return { habilidade, dificuldade: dif };
}

/* ── DIFICULDADE DE HABILIDADE — 12/09/2026 ────────────────────────
   Vinte e poucas magias dizem "Reduza N níveis de dificuldade da habilidade
   X": Camuflagem em Furtividade, Faro em Rastrear e Sentidos, Conhecimento em
   todo o grupo Profissional. Nenhuma entrava no motor, porque ele não sabia
   mexer em dificuldade — só em coluna.

   Três peças, e as três moram aqui porque a FICHA e a BATALHA rolam teste de
   habilidade com a mesma escala (D20_QUALIDADE_MINIMA): se cada uma deslocasse
   a dificuldade por conta, o mesmo Faro valeria um degrau num lugar e dois no
   outro.

     habilidadesDaDificuldade  QUAIS habilidades, lidas do texto do nível
     passosDeDificuldade       quantos degraus os efeitos ativos somam numa
                               habilidade (por nome ou pelo grupo dela)
     deslocarDificuldade       anda na escala, sem passar de Fácil nem de
                               Absurdo

   O NÚMERO de degraus vem de efeitosNoNivel (unidade `dificuldade`), como todo
   número deste catálogo. */
const DIFICULDADE_ORDEM = ['facil', 'medio', 'dificil', 'muito_dificil', 'absurdo'];

/* Os alvos da dificuldade, do jeito que o catálogo os escreve:

     "da habilidade Equilibrar, Nadar e Escalar"       → três habilidades
     "da habilidade Equilibrar ou Prestidigitação"     → as duas valem
     "em Rastrear"                                     → Habilidade Animal
     "de habilidades do grupo Profissional"            → o grupo inteiro
     "do grupo de habilidades Influência"              → idem

   "das habilidades", sem nome (Aprimorar Habilidades), devolve null: a
   habilidade é escolhida na hora, e o texto não diz qual. */
function habilidadesDaDificuldade(magia, nivel) {
  const txt = (magia && magia['nivel_' + nivel]) || '';
  const m = /dificuldade\s+([^.]*)/i.exec(txt);
  if (!m) return null;
  let resto = m[1].trim();
  const g = /grupo\s+(?:de\s+habilidades\s+)?([A-Za-zÀ-ÿ]+)/i.exec(resto);
  if (g) return { habilidades: [], grupos: [g[1]] };
  resto = resto.replace(/^(?:d[aoe]s?|n[ao]s?|em)\s+/i, '').replace(/^habilidades?\b\s*/i, '');
  const nomes = resto.split(/\s*,\s*|\s+e\s+|\s+ou\s+/i).map((s) => s.trim()).filter(Boolean);
  return nomes.length ? { habilidades: nomes, grupos: [] } : null;
}

/* Casa nome de habilidade sem acento, sem caixa e tolerando o PLURAL: o texto
   de Linguagem diz "Idiomas" e a habilidade do catálogo se chama "Idioma". */
function nomeDeHabilidadeCasa(a, b) {
  const x = semAcento(a || '').trim();
  const y = semAcento(b || '').trim();
  if (!x || !y) return false;
  return x === y || x.replace(/s$/, '') === y.replace(/s$/, '');
}

/* Soma os degraus que uma lista de efeitos dá a UMA habilidade.
   `hab` = { nome, grupo }. Negativo = mais fácil. */
function passosDeDificuldade(efeitos, hab) {
  if (!hab || !Array.isArray(efeitos)) return 0;
  return efeitos.reduce((soma, ef) => {
    if (!ef || ef.tipo !== 'mod_dificuldade') return soma;
    const porNome = (ef.habilidades || []).some((n) => nomeDeHabilidadeCasa(n, hab.nome));
    const porGrupo = (ef.grupos || []).some((g) => nomeDeHabilidadeCasa(g, hab.grupo));
    return (porNome || porGrupo) ? soma + (Number(ef.valor) || 0) : soma;
  }, 0);
}

function deslocarDificuldade(dificuldade, passos) {
  const i = DIFICULDADE_ORDEM.indexOf(dificuldade);
  const n = Number(passos) || 0;
  if (i < 0 || !n) return dificuldade;
  return DIFICULDADE_ORDEM[Math.max(0, Math.min(DIFICULDADE_ORDEM.length - 1, i + n))];
}

/* Os efeitos de dificuldade de uma magia num nível, já no formato que a
   batalha (status_temp) e a ficha (magias ativas) usam. Vazio quando a magia
   não mexe em dificuldade ou o texto não diz em qual habilidade. */
function efeitosDeDificuldade(magia, nivel) {
  const reg = magiaEfeitoDe(magia && magia.key);
  if (!reg) return [];
  const alvos = habilidadesDaDificuldade(magia, nivel);
  if (!alvos) return [];
  const lido = efeitosNoNivel(magia, nivel);
  return reg.efeitos
    .filter((ef) => ef.tipo === 'mod_dificuldade' && lido[ef.unidade] != null)
    .map((ef) => ({
      tipo: 'mod_dificuldade',
      valor: (ef.sinal || 1) * lido[ef.unidade],
      habilidades: alvos.habilidades,
      grupos: alvos.grupos,
      ...(ef.consome_em ? { consome_em: ef.consome_em } : {}),
    }));
}

/* A magia vale no PRÓXIMO teste de habilidade, e some depois dele?

   "A magia e a habilidade devem ser usadas juntas" (Avaliação, Detectar
   Intenção) — são as de duração Instantânea. Fora de combate não há rodada
   para contar, e o calendário não serve: a magia não dura um dia, dura um
   teste. Por isso ela fica na ficha até o teste seguinte daquela habilidade. */
function magiaConsumidaNoTeste(magia, nivel) {
  return efeitosDeDificuldade(magia, nivel).some((e) => e.consome_em === 'teste_habilidade');
}

/* Quantos degraus as MAGIAS ATIVAS da ficha dão a uma habilidade.
   `magiasPorKey` é o catálogo (a magia ativa guarda só key e nível — o texto
   do nível é a fonte, ver magiaAtivaDaEvocacao). */
function passosDasMagiasAtivas(ativas, hab, magiasPorKey) {
  const lista = Array.isArray(ativas) ? ativas : [];
  return lista.reduce((soma, a) => {
    const mag = a && magiasPorKey ? magiasPorKey[a.key] : null;
    return mag ? soma + passosDeDificuldade(efeitosDeDificuldade(mag, a.nivel), hab) : soma;
  }, 0);
}

/* Depois do teste, some a magia que era "para este teste" — e só a que valia
   NESTA habilidade: Faro consumido num teste de Negociar seria roubo. */
function consumirMagiasDoTeste(ativas, hab, magiasPorKey) {
  const lista = Array.isArray(ativas) ? ativas : [];
  return lista.filter((a) => {
    if (!a || a.consome_em !== 'teste_habilidade') return true;
    const mag = magiasPorKey ? magiasPorKey[a.key] : null;
    if (!mag) return true;
    return passosDeDificuldade(efeitosDeDificuldade(mag, a.nivel), hab) === 0;
  });
}

/* ── Prazo de cura natural, em dias ────────────────────────────────
   Doenças: "o tempo de cura é de 3 dias" nos níveis 1 a 7, e "de duas
   semanas" no 9. O prazo vira DATA no motor, somada à data atual do jogo —
   ver curaNaturalDaMagia em 12-batalha.

   POR EXTENSO É ACEITO AQUI, e só aqui. A regra do catálogo é usar dígito
   (ver docs/manutencao-magias.md), e ela vale para EFEITO: número por extenso
   num efeito vira silenciosamente efeito zero, que é o pior tipo de erro. Um
   prazo não tem esse risco — ou é lido, ou não há data para mostrar, e a
   ausência é visível. Então em vez de obrigar o usuário a reescrever uma frase
   que está boa em português, o leitor aprende a contar até doze.

   Semana = 7 dias, mês = 30 (o mês do calendário fantasy). */
const NUM_EXTENSO = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6,
  sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12,
};
const RE_CURA = /tempo\s+de\s+cura\s+(?:é|e)\s+de\s+([\wá-ú]+)\s+(dias?|semanas?|m[êe]s|meses)/i;

function curaEmDiasNoNivel(magia, nivel) {
  const txt = (magia && magia['nivel_' + nivel]) || '';
  const m = RE_CURA.exec(txt);
  if (!m) return null;
  const cru = m[1];
  const n = /^\d+$/.test(cru) ? parseInt(cru, 10) : NUM_EXTENSO[semAcento(cru)];
  if (!n || n <= 0) return null;
  const un = semAcento(m[2]);
  const fator = un.startsWith('semana') ? 7 : (un.startsWith('mes') || un === 'meses' ? 30 : 1);
  return n * fator;
}

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
                   ignora_eh — só em dano: o golpe pula a EH e cai direto na
                              cascata AR→EF. Mesma chave que Golpe Letal
                              acende nas técnicas (modsDoGolpe)
     so_racas?   restrição de alvo por criaturas.tipo (regra, não sugestão)
     inverte_em? raças em que o efeito INVERTE de sinal
     grupo_armas? restrição de arma, no molde das técnicas
     parcial?    a metade que a Fase 1 não automatiza — vai pro log

   NÃO guarda evocacao, duracao nem alcance: os três já estão corretos no
   banco, e é lá que o editor de admin os edita.

   Magia sem entrada aqui continua narrativa. É o fallback, não um erro.
   ============================================================ */
const MAGIA_EFEITO_MAP = {
  /* ── Dano (14) ─────────────────────────────────────────────────── */
  bola_de_fogo:       { alvo: 'inimigo', alvos: 1, icone: '🔥', parcial: 'area',
                        efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  /* Garras e Lâmina de Luz entraram em 12/09/2026, depois de o usuário
     trocar `alcance` de "Pessoal" para "Toque" — era só isso que as segurava
     fora: dano em inimigo com alcance que não alcança inimigo nenhum.

     "Causa 4 de dano, IGNORA A ENERGIA HEROICA": a garra é sua, crava na
     carne. `ignora_eh` manda a cascata pular a EH — a mesma chave que Golpe
     Letal acende. `duracao: 20 rodadas` no banco quer dizer que a garra fica
     na mão por 20 rodadas; o motor não tem arma temporária, então na mesa ela
     é conjurada a cada golpe. Vale o dano, que é o que importa. */
  garras:             { alvo: 'inimigo', alvos: 1, icone: '🐾',
                        efeitos: [{ tipo: 'dano', unidade: 'dano', ignora_eh: true }] },
  // "Causa 24 de dano elemental de luz" — elemento sai do texto (elementoDoNivel),
  // então Fotoproteção do alvo corta esta e não corta as outras.
  lamina_de_luz:      { alvo: 'inimigo', alvos: 1, icone: '⚔️',
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

  /* ── Redução de dano (4) ───────────────────────────────────────── */
  /* PROTEÇÃO NATURAL — entrou em 12/09/2026, quando o motor aprendeu a rolar
     teste de HABILIDADE (decisão do usuário: "o motor deve rolar habilidade
     também"). Era a última órfã que não era ritual.

     "Com um teste da habilidade Sentidos (Absurdo), reduz 4 de dano." Quem
     rola é o CONJURADOR, e a magia só sai se ele passar — diferente do teste
     de resistência, que é o alvo tentando escapar. A dificuldade afrouxa com o
     nível (Absurdo no 1, Fácil no 9), então é lida do texto, não do registro.

     `base: true` como na Parede: é campo de força contra desastre natural —
     queda, avalanche, incêndio —, e queda não tem elemento. */
  protecao_natural:   { alvo: 'self', alvos: 1, icone: '🍃',
                        efeitos: [{ tipo: 'reducao_dano', unidade: 'reducao_dano',
                                    elemento: null, base: true }] },
  /* PAREDE DE CRISTAL — decisão do usuário, 12/09/2026: "o dano é reduzido em
     uma área de 5 metros a partir do jogador". Por isso `area: 'aura'` com o
     raio vindo do `alcance` (5 metros), e `elemento: null` de verdade — a
     parede barra objeto físico, não elemento, então corta dano BASE também.
     É a primeira redução assim; ver danoAposReducao.

     E o conjurador está DENTRO: a parede nasce a partir dele.

     PARCIAL: a descrição diz "caso um ataque faça dano menor que o
     especificado, este é totalmente absorvido" e "deve-se fazer um dano igual
     ou maior para quebrar a magia" — isso é LIMIAR que arrebenta, como a
     armadura, não redução fixa. Entrou como redução fixa, que é o que o
     usuário pediu; o limiar fica registrado como pergunta em aberto. */
  parede_de_cristal:  { alvo: 'aliado', alvos: 'escolha', icone: '🧱',
                        area: 'aura', parcial: 'limiar_quebra',
                        efeitos: [{ tipo: 'reducao_dano', unidade: 'reducao_dano',
                                    elemento: null, base: true }] },
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
  /* VISÃO ANIMAL — entrou em 12/09/2026, junto com a visibilidade do
     tabuleiro. Antes não havia escuridão para enxergar, e a magia era
     narrativa por falta de alvo, não por falta de clareza.

     `unidade` nenhuma: o valor não é "verbo + número + unidade", é qual
     escuridão o nível vence, e quem lê isso é visaoEscuridaoNoNivel. Por isso
     o efeito é declarado como bandeira (`valor: true`) e o motor troca pelo
     número na hora de aplicar — mesmo tratamento de Combate Montado, cujo
     número também vem de fora do registro. */
  visao_animal:       { alvo: 'self', alvos: 1, icone: '🦉',
                        efeitos: [{ tipo: 'visao_escuridao', valor: true }] },
  /* DOENÇAS — entrou em 12/09/2026, depois de o usuário reescrever os cinco
     níveis com doenças nomeadas e efeito concreto. Duas peças novas no motor,
     ambas gerais e não específicas desta magia:

       mod_condicao  "Reduz 25 de Saúde" (níveis 1 a 7). Saúde é uma das 8
                     CONDIÇÕES da ficha, escala −50..+50 — não é poço de
                     combate. O snapshot de batalha já carregava `condicoes` e
                     já as devolvia para estado_atual; faltava a ponte entre
                     magia e condição. Instantâneo, como dano e cura.
       escala        "a cada rodada a penalidade aumenta 2 pontos" (nível 9).
                     O valor do status CRESCE na virada de rodada, em vez de
                     ficar parado até expirar.

     Os níveis pedem coisas diferentes: 1–7 mexem em Saúde, 9 troca para
     coluna de ataque com escalada. Declarar as duas unidades está certo — o
     verificador cobre a UNIÃO dos cinco níveis, e cada nível aplica só o que
     o próprio texto traz.

     PARCIAL: "caso a doença não seja tratada até 2 dias após a contaminação
     [...] morrerá" é prazo em DIAS, fora de qualquer batalha. */
  doencas:            { alvo: 'inimigo', alvos: 1, icone: '🦠',
                        parcial: 'agravamento', ruido_esperado: true,
                        efeitos: [{ tipo: 'mod_condicao', unidade: 'saude',
                                    condicao: 'vitalidade', sinal: -1 },
                                  { tipo: 'mod_ataque', unidade: 'coluna',
                                    sinal: -1, escala: true }] },
  /* FORÇAR DISPUTA — decisão do usuário, 12/09/2026: o bônus é do ADVERSÁRIO.
     "atrair a atenção do adversário e forçá-lo ao combate, aumentando sua
     velocidade, caso falhe em um teste de resistência mágica": ele vem para
     cima de você mais rápido. Buff em inimigo, e é intencional.

     PARCIAL: rendição, recusa e maldição divina são arbitragem do Mestre. */
  forcar_disputa:     { alvo: 'inimigo', alvos: 1, icone: '🎯',
                        parcial: 'rendicao',
                        efeitos: [{ tipo: 'mod_vb', unidade: 'vb', sinal: 1 }] },
  /* TENSÃO — "dentro da área de efeito, TODOS devem fazer um teste de
     resistência mágica. Uma vez tensa, a pessoa estará muito mais atenta, o
     que lhe garante um bônus em combate."

     Aura de 10 metros que pega todo mundo no raio, aliado ou não — é o que
     `area: 'aura'` já faz, porque o filtro de alvo não separa lado.

     Sobre o teste: regra geral do usuário (12/09/2026) — "todas as magias
     evocadas por terceiros podem ser resistidas, se o alvo assim desejar".
     Resistir é ESCOLHA de quem recebe, não sinal de que a magia é debuff. Foi
     o que segurou Tensão fora do registro até hoje.

     PARCIAL: o troco no fim ("sofreram 100 de energia heroica") não entra —
     a magia dura 1 hora, então ela nunca termina dentro de uma batalha. */
  tensao:             { alvo: 'aliado', alvos: 'escolha', icone: '🎻',
                        area: 'aura', parcial: 'desgaste_final',
                        efeitos: [{ tipo: 'mod_defesa', unidade: 'defesa',  sinal: 1 },
                                  { tipo: 'mod_vb',     unidade: 'vb',      sinal: 1 },
                                  { tipo: 'mod_ataque', unidade: 'coluna',  sinal: 1 }] },

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
  // "dano infernal" É elemento desde 12/09/2026 — o comentário aqui dizia o
  // contrário, e dizia errado. Agora elementoDoNivel devolve 'infernal', e uma
  // proteção contra infernal corta esta magia como Piroproteção corta fogo.
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
  /* Entrou em 12/09/2026, depois de o usuário desfazer a ambiguidade: o texto
     dizia "Cause 4 de DANO MÁXIMO e reduza 1 coluna", e dano máximo no motor
     é o TETO de dano do alvo, não dano causado. Virou "Causa 4 de dano", que
     é inequívoco — e a magia ficou idêntica em forma a Canção do Tormento. */
  auxilio_natural:       { alvo: 'inimigo', alvos: 1, icone: '🌾',
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
  /* Heroísmo entrou em 12/09/2026, e a razão de ter demorado vale registrar:
     o texto dizia "Cure 8 de energia heroica" — verbo que o leitor não
     conhecia —, então a varredura das órfãs nem a viu. O usuário corrigiu
     para "Restaura", ela ficou legível, e não havia dificuldade nenhuma. */
  heroismo:              { alvo: 'aliado', alvos: 1, icone: '🦸',
                           efeitos: [{ tipo: 'cura_pool', unidade: 'cura_eh', pool: 'eh' }] },

  /* ── AS 8 QUE FICARAM DE FORA, e por quê ───────────────────────────
     Nenhuma foi adivinhada. Todas seguem aparecendo como órfãs no
     verificador, que é o comportamento certo: número legível, motor ignora.

       aura_ameacadora  alvo é um OBJETO de arte tocado, e o efeito recai em
                        quem olhar. Não há alvo de combate a escolher.
       campo_abencoado  "Restaura 1 de energia física POR HORA" — fora de
                        combate.
       doencas          doenças nomeadas, com efeito por atributo. Subsistema.
       forcar_disputa   "+2 de velocidade" em quem? A descrição é sobre atrair
                        o adversário; o bônus não tem dono claro.
       manjar_de_lena   restaura karma, que não é primitiva de rodada, e é
                        ritual de comida.
       parede_de_cristal  é uma PAREDE no terreno, não um buff num alvo.
       protecao_natural "com um teste de atributo percepção (Absurdo)" — teste
                        de atributo não é mecanismo que o combate tenha.
       tensao           buff de defesa/velocidade/coluna que EXIGE teste de
                        resistência. Buff que o alvo resiste não faz sentido
                        como buff; provável que seja debuff mal redigido.

     Três (garras, lamina_de_luz, auxilio_natural) eram candidatas a CORREÇÃO
     DE TEXTO e já entraram — sobrou tensao na mesma condição. Ver
     docs/manutencao-magias.md
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

  /* ══ AS MAGIAS QUE NENHUM PERSONAGEM CONHECIA — 12/09/2026 ══════════
     "Anteriormente fizemos a validação dos efeitos de magias, mas apenas das
     magias que há personagens que as conhecem. Vamos fazer agora das demais,
     para mecanizar o efeito em batalha e fora de batalha." (usuário)

     Foram 111. As que cabem entram aqui; as outras ganharam motivo em
     MAGIA_FORA_DO_REGISTRO, e aparecem na verificação do catálogo agrupadas.

     ── DIFICULDADE DE HABILIDADE (17) ────────────────────────────────
     A primitiva nova. `sinal: -1` = mais fácil (todas destas "reduzem").
     QUAL habilidade não mora aqui: vem do texto (habilidadesDaDificuldade).

     `consome_em: 'teste_habilidade'` nas de duração Instantânea (ou
     Variável sem duração no nível): "a magia e a habilidade devem ser usadas
     juntas" — valem para UM teste e somem. As de 1 hora, 12 horas etc. valem
     até vencer no calendário, fora de combate, e a batalha inteira dentro. */
  ausencia:             { alvo: 'self', alvos: 1, icone: '🫥',
                          efeitos: [{ tipo: 'mod_dificuldade', unidade: 'dificuldade', sinal: -1 }] },
  avaliacao:            { alvo: 'self', alvos: 1, icone: '⚖️',
                          efeitos: [{ tipo: 'mod_dificuldade', unidade: 'dificuldade', sinal: -1,
                                      consome_em: 'teste_habilidade' }] },
  camuflagem:           { alvo: 'self', alvos: 1, icone: '🍂',
                          efeitos: [{ tipo: 'mod_dificuldade', unidade: 'dificuldade', sinal: -1 }] },
  conhecimento:         { alvo: 'self', alvos: 1, icone: '📚',
                          efeitos: [{ tipo: 'mod_dificuldade', unidade: 'dificuldade', sinal: -1 }] },
  conhecimento_linguistico: { alvo: 'self', alvos: 1, icone: '🗣️',
                          efeitos: [{ tipo: 'mod_dificuldade', unidade: 'dificuldade', sinal: -1 }] },
  conhecimento_natural: { alvo: 'self', alvos: 1, icone: '🌿',
                          efeitos: [{ tipo: 'mod_dificuldade', unidade: 'dificuldade', sinal: -1 }] },
  convocacao:           { alvo: 'self', alvos: 1, icone: '📯',
                          efeitos: [{ tipo: 'mod_dificuldade', unidade: 'dificuldade', sinal: -1,
                                      consome_em: 'teste_habilidade' }] },
  deslocamento_natural: { alvo: 'self', alvos: 1, icone: '🧗',
                          efeitos: [{ tipo: 'mod_dificuldade', unidade: 'dificuldade', sinal: -1,
                                      consome_em: 'teste_habilidade' }] },
  detectar_intencao:    { alvo: 'self', alvos: 1, icone: '🧠',
                          efeitos: [{ tipo: 'mod_dificuldade', unidade: 'dificuldade', sinal: -1,
                                      consome_em: 'teste_habilidade' }] },
  escrita:              { alvo: 'self', alvos: 1, icone: '✍️',
                          efeitos: [{ tipo: 'mod_dificuldade', unidade: 'dificuldade', sinal: -1,
                                      consome_em: 'teste_habilidade' }] },
  faro:                 { alvo: 'self', alvos: 1, icone: '👃',
                          efeitos: [{ tipo: 'mod_dificuldade', unidade: 'dificuldade', sinal: -1,
                                      consome_em: 'teste_habilidade' }] },
  // Conhecida por personagem, e entra pela mesma porta: cada nível é um animal
  // e uma habilidade diferente ("de um lobo: ... em Rastrear").
  habilidade_animal:    { alvo: 'self', alvos: 1, icone: '🐺',
                          efeitos: [{ tipo: 'mod_dificuldade', unidade: 'dificuldade', sinal: -1 }] },
  linguagem:            { alvo: 'self', alvos: 1, icone: '💬',
                          efeitos: [{ tipo: 'mod_dificuldade', unidade: 'dificuldade', sinal: -1 }] },
  // "Equilibrar OU Prestidigitação": vale nas duas — qualquer uma que for
  // testada consome a magia.
  malabarismo:          { alvo: 'self', alvos: 1, icone: '🤹',
                          efeitos: [{ tipo: 'mod_dificuldade', unidade: 'dificuldade', sinal: -1,
                                      consome_em: 'teste_habilidade' }] },
  // Ritual: não se evoca em batalha (evocacaoEmRodadas bloqueia), só na ficha.
  mestre_da_forja:      { alvo: 'self', alvos: 1, icone: '⚒️',
                          efeitos: [{ tipo: 'mod_dificuldade', unidade: 'dificuldade', sinal: -1,
                                      consome_em: 'teste_habilidade' }] },
  orientacao:           { alvo: 'self', alvos: 1, icone: '🧭',
                          efeitos: [{ tipo: 'mod_dificuldade', unidade: 'dificuldade', sinal: -1 }] },
  // Alcance Toque: é a única destas que se lança em OUTRO personagem — fora
  // de combate, com aprovação do Mestre.
  sexto_sentido:        { alvo: 'aliado', alvos: 1, icone: '👁️',
                          efeitos: [{ tipo: 'mod_dificuldade', unidade: 'dificuldade', sinal: -1 }] },

  /* ── Com primitivas que já existiam (3) ─────────────────────────── */
  /* CORRENTE: "O alvo não poderá realizar magias, atacar ou usar habilidades
     que exijam movimento". É sem_acoes, a mesma bandeira de Medo e Sono. A
     duração é de minutos a horas — mais que qualquer batalha, que é como
     duracaoNoNivel já trata calendário dentro do combate. */
  corrente:             { alvo: 'inimigo', alvos: 1, icone: '⛓️',
                          efeitos: [{ tipo: 'sem_acoes', valor: true }] },
  /* FASCÍNIO: hipnotiza todos no raio que falharem na resistência. Dura
     enquanto o conjurador toca — concentração, que é o que 'Variável' sem
     duração no nível já significa.

     PARCIAL: "caso o alvo seja atacado, ele irá despertar" não é automático;
     o log avisa. */
  fascinio:             { alvo: 'inimigo', alvos: 'escolha', icone: '🌀',
                          area: 'aura', parcial: 'desperta_ao_ser_atacado',
                          efeitos: [{ tipo: 'sem_acoes', valor: true }] },
  /* DUETO MÁGICO: "Aumenta 2 níveis das magias evocadas" no local, enquanto a
     música dura. É mod_nivel_magia — o da Oferenda —, mas SEM consome_em: vale
     para toda magia evocada na aura durante as 10 rodadas, não só a próxima. */
  dueto_magico:         { alvo: 'aliado', alvos: 'escolha', icone: '🎶', area: 'aura',
                          efeitos: [{ tipo: 'mod_nivel_magia', unidade: 'nivel_magia', sinal: 1 }] },
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
  efeitosNoNivel, elementoDoNivel, escaladaNoNivel, curaEmDiasNoNivel,
  testeHabilidadeNoNivel, visaoEscuridaoNoNivel, DIFICULDADE_POR_NOME, MAGIA_ELEMENTOS_VALIDOS,
  classeDeDuracao, valeForaDeCombate, efeitosDeMagiaNaFicha, motivoNaoAplicaNaFicha,
  pedidoDeMagiaPendente, metaDeEvocacao, pedidosDeMagiaAbertos,
  duracaoEmDiasDeJogo, magiaAtivaDaEvocacao, magiasAtivasVigentes,
  MAGIA_EFEITO_MAP, magiaEfeitoDe, tetoEstagioNoNivel,
  DIFICULDADE_ORDEM, habilidadesDaDificuldade, passosDeDificuldade, deslocarDificuldade,
  efeitosDeDificuldade, magiaConsumidaNoTeste, passosDasMagiasAtivas, consumirMagiasDoTeste,
  aplicarMagiaNoEstado,
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
      /* Sem registro: narrativa, a menos que o texto entregue número legível
         OU que a magia tenha motivo registrado. A segunda condição entrou em
         12/09/2026 com a varredura das magias que nenhum personagem conhece:
         a maioria das que pedem correção de texto é justamente a que o leitor
         NÃO lê ("um nível", por extenso), e sem isto ela sumia no rodapé das
         narrativas em vez de aparecer com o motivo na conferência. */
      if (unidadesLidas.size > 0 || MAGIA_FORA_DO_REGISTRO[m.key]) {
        // A LINHA inteira vai junto: o painel precisa dela para avaliar o
        // predicado `resolvido` de MAGIA_FORA_DO_REGISTRO contra o texto atual.
        out.orfa.push({ key: m.key, nome: m.nome, unidades: [...unidadesLidas], magia: m });
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
    /* RUÍDO DECLARADO.

       Doenças (a única até agora) tem texto de nível que é meio prosa: "o
       tempo de cura é de 3 dias", "a penalidade aumenta 2 pontos (menos 9,
       menos 11, menos 13..)". São números REAIS no texto e o leitor faz certo
       em não reconhecê-los — mas as unidades que importam (Saúde, coluna) ele
       lê certinho, e não há nada a corrigir.

       Sem isto a magia ficaria ambígua para sempre, e aviso que ninguém pode
       resolver ensina a ignorar o painel. `ruido_esperado` no registro é a
       declaração de que aqueles números são prosa.

       Só vale para 'unidade_desconhecida'. 'sobrescrita' — mesmo campo escrito
       duas vezes — continua acusando: aquilo é conflito, não prosa. */
    const relevantes = reg.ruido_esperado
      ? avisos.filter((a) => a.tipo !== 'unidade_desconhecida')
      : avisos;
    if (relevantes.length) {
      out.ambigua.push({ key: m.key, nome: m.nome, avisos: relevantes });
      return;
    }
    out.ok.push({ key: m.key, nome: m.nome });
  });

  return out;
}

/* ============================================================
   ESTATÍSTICAS DO CATÁLOGO — 12/09/2026
   ============================================================
   "Na página de conferência, informa uma estatística de magias. Quantas
   magias para cada profissão, magias de suporte, de ataque, etc." (usuário)

   É a pergunta de BALANCEAMENTO, vizinha da de manutenção que a auditoria
   responde: não "o motor lê?", mas "o catálogo está equilibrado?" — quem
   tem muita cura e nenhum ataque, quanto de cada profissão só se compra com
   item especial, quanto é ritual.

   Três eixos, cada um com a sua fonte, e nenhum inventado aqui:

     PROFISSÃO  `permissao` (CSV). Uma magia conta para a profissão quando cita
                a profissão (básica — todo membro alcança) OU uma especialização
                dela (avançada). É a mesma regra de podeAcessarMagia e
                magiaEhAvancada, em game-data.jsx.
     RARIDADE   `tipo`: Básica se compra com pontos; Perdida e Ancestral
                dependem de item especial (magiaEhTravada).
     FUNÇÃO     o REGISTRO do motor, que é o único lugar onde "alvo inimigo" e
                "causa dano" estão escritos sem ambiguidade. Magia fora do motor
                cai na classe do motivo registrado (ritual, narrativa…). */
const FUNCAO_DA_MAGIA = {
  ataque:    { pt: 'Ataque',    en: 'Attack' },
  controle:  { pt: 'Controle e debuff', en: 'Control & debuff' },
  suporte:   { pt: 'Suporte',   en: 'Support' },
  cura:      { pt: 'Cura',      en: 'Healing' },
  protecao:  { pt: 'Proteção',  en: 'Protection' },
  sistema:   { pt: 'Fora do motor: falta sistema', en: 'Off-engine: missing system' },
  decisao:   { pt: 'Fora do motor: decisão ou texto', en: 'Off-engine: decision or text' },
  narrativa: { pt: 'Narrativa', en: 'Narrative' },
  ritual:    { pt: 'Ritual',    en: 'Ritual' },
  invocado:  { pt: 'Invocação', en: 'Summoning' },
};

/* A função de UMA magia. A ordem dos testes é a prioridade: uma magia que
   causa dano E aplica penalidade (Canção do Tormento) é de ataque; uma que
   cura E dá bônus (Véu de Maira) é de cura. */
function funcaoDaMagia(magia) {
  const key = magia && magia.key;
  const reg = key ? MAGIA_EFEITO_MAP[key] : null;
  if (reg) {
    const tipos = reg.efeitos.map((e) => e.tipo);
    if (tipos.includes('dano') && reg.alvo === 'inimigo') return 'ataque';
    if (reg.efeitos.some((e) => e.tipo === 'cura_pool' && (e.sinal || 1) > 0)) return 'cura';
    if (tipos.includes('reducao_dano')) return 'protecao';
    if (reg.alvo === 'inimigo') return 'controle';
    return 'suporte';
  }
  const fora = key ? MAGIA_FORA_DO_REGISTRO[key] : null;
  if (fora && FUNCAO_DA_MAGIA[fora.classe]) return fora.classe;
  // Sem registro e sem motivo: é a narrativa que a auditoria conta no rodapé.
  return 'narrativa';
}

function estatisticasMagias(magiasDb, gameData) {
  const lista = (Array.isArray(magiasDb) ? magiasDb : []).filter((m) => m && m.key);
  const gd = gameData || (typeof GAME_DATA !== 'undefined' ? GAME_DATA : null);
  const espPorProfissao = (gd && gd.especializacoes) || {};
  const profissoes = Object.keys((gd && gd.profissoes) || espPorProfissao);
  const espParaProfissao = {};
  Object.entries(espPorProfissao).forEach(([prof, esps]) => {
    (esps || []).forEach((e) => { espParaProfissao[e.esp] = prof; });
  });

  const zeraFuncoes = () => Object.fromEntries(Object.keys(FUNCAO_DA_MAGIA).map((f) => [f, 0]));
  const porProfissao = Object.fromEntries(profissoes.map((p) => [p, {
    total: 0, basicas: 0, avancadas: 0, compraveis: 0, travadas: 0, noMotor: 0,
    funcoes: zeraFuncoes(),
  }]));
  const porEspecializacao = {};
  const porFuncao = zeraFuncoes();
  const porRaridade = {};
  const porEvocacao = { instantanea: 0, canalizada: 0, ritual: 0 };
  const porDuracao = { instantanea: 0, rodadas: 0, calendario: 0, permanente: 0 };
  const semPermissao = [];
  const permissaoDesconhecida = {};
  let noMotor = 0;
  /* POR ELEMENTO (12/09/2026): "quero magias de proteção e dano por elemento —
     fogo, terra, água, ar, celestial e infernal" (usuário). Conta só o que o
     MOTOR aplica: dano em inimigo pelo elemento lido do texto do nível mais
     alto, e redução de dano pelo elemento do registro. 'sem_elemento' é dano
     base; 'qualquer' é proteção que corta todo elemento. */
  const porElemento = Object.fromEntries(['fogo', 'terra', 'agua', 'ar', 'celestial', 'infernal', 'sem_elemento', 'qualquer']
    .map((el) => [el, { dano: 0, protecao: 0 }]));

  lista.forEach((m) => {
    const funcao = funcaoDaMagia(m);
    porFuncao[funcao] = (porFuncao[funcao] || 0) + 1;
    const ehMotor = !!MAGIA_EFEITO_MAP[m.key];
    if (ehMotor) noMotor += 1;
    if (ehMotor) {
      const reg = MAGIA_EFEITO_MAP[m.key];
      if (reg.alvo === 'inimigo' && reg.efeitos.some((ef) => ef.tipo === 'dano')) {
        const nivelTexto = [9, 7, 5, 3, 1].find((n) => m['nivel_' + n]);
        const el = (nivelTexto && elementoDoNivel(m, nivelTexto)) || 'sem_elemento';
        if (porElemento[el]) porElemento[el].dano += 1;
      }
      const protecoes = new Set(reg.efeitos.filter((ef) => ef.tipo === 'reducao_dano')
        .map((ef) => (ef.elemento == null ? 'qualquer' : ef.elemento)));
      protecoes.forEach((el) => { if (porElemento[el]) porElemento[el].protecao += 1; });
    }

    const tipo = m.tipo || '—';
    porRaridade[tipo] = (porRaridade[tipo] || 0) + 1;
    const travada = m.tipo !== 'Básica';

    const ev = String(m.evocacao || '');
    if (!ev || /instant[âa]nea/i.test(ev)) porEvocacao.instantanea += 1;
    else if (/\d+\s*rodadas?/i.test(ev)) porEvocacao.canalizada += 1;
    else porEvocacao.ritual += 1;   // Ritual, Variável, horas, dias

    const dur = classeDeDuracao(m, 1);
    porDuracao[dur] = (porDuracao[dur] || 0) + 1;

    const nomes = String(m.permissao || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!nomes.length) { semPermissao.push(m.nome || m.key); return; }

    /* Uma magia conta UMA vez por profissão, mesmo citando a profissão e duas
       especializações dela. "Básica" ganha de "avançada" quando os dois
       aparecem: se a profissão está citada, todo membro alcança. */
    const alcance = {};   // profissão → 'basica' | 'avancada'
    nomes.forEach((nome) => {
      if (porProfissao[nome]) { alcance[nome] = 'basica'; return; }
      const prof = espParaProfissao[nome];
      if (prof) {
        if (!alcance[prof]) alcance[prof] = 'avancada';
        const e = porEspecializacao[nome] || (porEspecializacao[nome] = { profissao: prof, total: 0 });
        e.total += 1;
        return;
      }
      (permissaoDesconhecida[nome] = permissaoDesconhecida[nome] || []).push(m.nome || m.key);
    });
    Object.entries(alcance).forEach(([prof, como]) => {
      const p = porProfissao[prof];
      if (!p) return;
      p.total += 1;
      if (como === 'basica') p.basicas += 1; else p.avancadas += 1;
      if (travada) p.travadas += 1; else p.compraveis += 1;
      if (ehMotor) p.noMotor += 1;
      p.funcoes[funcao] += 1;
    });
  });

  return {
    total: lista.length, noMotor,
    porProfissao, porEspecializacao, porFuncao, porRaridade, porEvocacao, porDuracao, porElemento,
    semPermissao, permissaoDesconhecida,
  };
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

Object.assign(window, { lerNivel, auditarMagias, resumoAuditoria, MAGIA_NIVEIS,
  FUNCAO_DA_MAGIA, funcaoDaMagia, estatisticasMagias });

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

/* ============================================================
   POR QUE ESTA MAGIA NÃO ESTÁ NO MOTOR
   ============================================================
   O painel de verificação listava as magias fora do registro e parava aí. O
   usuário perguntou, com razão: "qual é a dificuldade com a magia Heroísmo?"
   — e a resposta era "nenhuma, eu só não a liguei ainda". O painel não tinha
   como dizer isso.

   Este mapa põe o motivo na tela. Cada entrada diz em que CLASSE a magia cai
   e o que fazer com ela:

     'decisao'  — o motor daria conta; falta você decidir uma regra
     'ritual'   — Ritual ou evocação longa: não se lança em combate
     'sistema'  — precisa de subsistema que o combate não tem
     'invocado' — os números são a ficha de uma criatura invocada

   Magia legível e SEM entrada aqui é a que vale perguntar: ou é narrativa de
   verdade, ou é candidata esquecida — como Heroísmo era.
   ============================================================ */
const MAGIA_FORA_DO_REGISTRO = {
  /* ── Falta uma decisão de regra ───────────────────────────────────
     Cada uma traz `resolvido(magia)`: o predicado que diz se o texto já
     deixou de ser ambíguo.

     Existe porque o usuário corrigiu Auxílio Natural e a magia continuou
     aparecendo com o motivo antigo — o painel dizia "falta uma decisão sua",
     ele decidiu, e nada no sistema percebeu. Com o predicado, a magia muda de
     grupo sozinha e passa a dizer "pronta para entrar, me avise". */
  /* Garras e Lâmina de Luz SAÍRAM daqui em 12/09/2026: o usuário trocou o
     alcance para "Toque" e as duas entraram no MAGIA_EFEITO_MAP. É o ciclo
     completo que o predicado existe para fechar — pendência marcada, texto
     corrigido, painel percebe, magia ligada, pendência apagada. */
  /* Em 12/09/2026 as TRÊS ÚLTIMAS pendências de decisão foram respondidas e o
     grupo ficou vazio — por isso não há nenhuma entrada 'decisao' aqui:

       forcar_disputa     o bônus de velocidade é do ADVERSÁRIO ("forçá-lo ao
                          combate, aumentando sua velocidade");
       parede_de_cristal  a redução vale numa área de 5 metros a partir do
                          conjurador;
       tensao             resistir é ESCOLHA de quem recebe — regra geral,
                          não sinal de debuff (ver a nota no registro).

     O grupo vazio é o estado saudável. Entrada nova aqui significa magia
     legível cuja REGRA ninguém decidiu ainda — e o painel vai cobrar. */

  /* ── Ritual ou evocação longa: fora de combate ──────────────────── */
  hibernar: { classe: 'ritual', motivo: 'Evocação de 8 horas.' },
  aura_ameacadora: { classe: 'ritual', motivo: 'Ritual, e o alvo é um objeto de arte.' },
  campo_abencoado: { classe: 'ritual', motivo: 'Ritual, e restaura "por hora".' },
  manjar_de_lena: { classe: 'ritual', motivo: 'Ritual de comida.' },
  necropotencia: { classe: 'ritual', motivo:
    'Ritual com 30 dias de duração — lançada antes da batalha, o bônus já está na ficha.' },
  ossos_de_aco: { classe: 'ritual', motivo: 'O dano é de queda, por metro — fora de combate.' },
  melodia_zen: { classe: 'ritual', motivo: 'Exige meia hora de música ininterrupta.' },

  /* ── Precisa de subsistema que o combate não tem ────────────────── */
  /* O grupo 'sistema' esvaziou em 12/09/2026. Duas saíram no mesmo dia:

       doencas           ganhou a ponte com as condições de ficha (Saúde) e o
                         modificador que cresce por rodada;
       protecao_natural  o motor aprendeu a rolar teste de HABILIDADE.

     As duas dependiam de sistema que não existia — e sistema, diferente de
     decisão, é trabalho meu. */
  invisibilidade: { classe: 'sistema', motivo:
    'Precisa de primitiva de seleção de alvo: ficar difícil de ser alvejado.' },
  ordens: { classe: 'sistema', motivo:
    'O nível só define quantas palavras a ordem tem. É narrativa pura.' },
  possessao: { classe: 'sistema', motivo:
    'Troca de corpo entre participantes. Subsistema próprio.' },

  /* ── Os números são a ficha de um INVOCADO ──────────────────────── */
  projecao: { classe: 'invocado', motivo:
    'Cria uma cópia do personagem. Os números são a ficha dela, não efeito em alguém.' },
  guardiao_espiritual: { classe: 'invocado', motivo: 'Cria cópias do personagem.' },
  pseudomateria: { classe: 'invocado', motivo:
    'Cria um personagem controlado pelo Mestre.' },
  criatura_disforme: { classe: 'invocado', motivo: 'Anima uma carcaça.' },

  /* ══ VARREDURA DAS MAGIAS QUE NENHUM PERSONAGEM CONHECIA — 12/09/2026 ══
     Cada uma das 111 foi lida. As que cabiam entraram no registro; as de
     baixo ficaram de fora COM MOTIVO. Nenhuma regra foi adivinhada — o
     usuário pediu, para as dúvidas, "ignore por agora, ela vai aparecer na
     conferência depois". É aqui que ela aparece. */

  /* ── Falta uma decisão sua ou uma correção de texto ─────────────── */
  /* A primitiva de dificuldade já existe; o texto é que escreve o número POR
     EXTENSO, e a regra do catálogo é dígito (docs/manutencao-magias.md §1).
     Com "1 nível" no lugar de "um nível", o predicado percebe e a magia vai
     para "pronta para entrar". */
  alucinacao: { classe: 'decisao', resolvido: (m) => leUnidadeEmAlgumNivel(m, 'dificuldade'), motivo:
    'Aumenta a dificuldade de Sentidos do alvo, mas escreve o número por extenso ("um nível"). Com dígito ("1 nível") ela entra.' },
  dominacao_animal: { classe: 'decisao', resolvido: (m) => leUnidadeEmAlgumNivel(m, 'dificuldade'), motivo:
    'Reduz a dificuldade de Adestrar, mas escreve o número por extenso ("um nível"). Com dígito ela entra.' },
  rastreamento: { classe: 'decisao', resolvido: (m) => leUnidadeEmAlgumNivel(m, 'dificuldade'), motivo:
    'Reduz a dificuldade de Rastrear para o próximo teste, mas escreve o número por extenso ("um nível"). Com dígito ela entra.' },
  forca_da_montanha: { classe: 'decisao',
    resolvido: (m) => ['atr_fisico', 'atr_forca', 'atr_agilidade', 'atr_percepcao']
      .every((u) => leUnidadeEmAlgumNivel(m, u)),
    motivo: 'Um número para dois atributos ("Aumente 1 de atributo físico e atributo força"). Escreva cada um com o seu número: "Aumenta 1 no atributo Físico e 1 no atributo Força e reduz 1 no atributo Agilidade e 1 no atributo Percepção".' },
  ataque_impetuoso: { classe: 'decisao', motivo:
    '"Cause mais 4 no dano máximo de um ataque": é bônus de dano no PRÓXIMO golpe? Se for, o texto precisa virar "Aumenta 4 de dano" e eu ligo como bônus consumido no golpe.' },
  apontar_sufocante: { classe: 'decisao', motivo:
    'O efeito (não pode atacar, perde 1 de energia física por rodada) está na descrição; o nível só diz "Sufoca o alvo por N rodadas". Com "A magia tem duração de N rodadas. Reduz 1 de energia física por rodada." no nível, ela entra.' },
  teriantropia: { classe: 'decisao', motivo:
    'Cada nível é uma forma diferente (felina, canina…) e escreve "reduza 1 dificuldade" sem "nível de". Precisa de "Reduza 1 nível de dificuldade da habilidade X" — e depende de Licantropia estar ativa.' },
  vigilia: { classe: 'decisao', motivo:
    '"Reduza 9 níveis da habilidade Sentidos" diminui com o nível da magia e não diz "de dificuldade". É penalidade enquanto dorme? Falta a regra.' },

  /* ── Falta um sistema que o combate não tem ─────────────────────── */
  amizade: { classe: 'sistema', motivo:
    'O bônus em Influência é do conjurador, mas só contra o alvo que falhou na resistência — o motor não prende bônus a um alvo. (O número também está por extenso.)' },
  empatia: { classe: 'sistema', motivo:
    'O bônus em Empatia é do conjurador, mas só contra o alvo que falhou na resistência — o motor não prende bônus a um alvo.' },
  seducao: { classe: 'sistema', motivo:
    'O bônus em Persuadir é do conjurador, só contra o alvo seduzido — o motor não prende bônus a um alvo. (O número também está por extenso.)' },
  aprimorar_habilidades: { classe: 'sistema', motivo:
    'A habilidade é escolhida na hora ("uma habilidade escolhida do grupo Subterfúgio, Manobra ou Geral") — a evocação não tem essa escolha.' },
  despistamento: { classe: 'sistema', motivo:
    'A trilha falsa dificulta quem PERSEGUE, e o perseguidor não é escolhido na evocação.' },
  terreno_hostil: { classe: 'sistema', motivo:
    'O terreno dificulta forasteiros que usam os recursos do local; e "Sobrevivência" não existe no catálogo de habilidades.' },
  aeroataque: { classe: 'sistema', motivo: 'Derruba, move ou arrasta por peso (kg) — o combate não tem peso nem empurrão.' },
  aprimoramento_animal: { classe: 'sistema', motivo: 'Mexe no companheiro animal com elo — o combate não tem companheiro.' },
  area_de_paz: { classe: 'sistema', motivo: 'Quem ataca alguém na área precisa resistir antes — o motor não testa o ATACANTE.' },
  bote: { classe: 'sistema', motivo: 'Executa a técnica Bote no nível da magia — magia que dispara técnica.' },
  cancao_do_controle: { classe: 'sistema', motivo: 'O conjurador controla o corpo do alvo — troca de controle entre participantes.' },
  cataclisma: { classe: 'sistema', motivo: 'Rouba karma máximo e o transfere — karma como alvo de efeito.' },
  explosao_mistica: { classe: 'sistema', motivo: 'Reduz karma máximo de quem está na área — karma como alvo de efeito.' },
  rompimento_de_harmonia: { classe: 'sistema', motivo: 'Reduz karma dos ouvintes — karma como alvo de efeito.' },
  mutualidade: { classe: 'sistema', motivo: 'Karma compartilhado entre dois seres.' },
  conversao_energetica: { classe: 'sistema', motivo: 'Magia recebida vira karma.' },
  dadivas_da_guerra: { classe: 'sistema', motivo: 'Concede uso temporário de técnicas de outras profissões.' },
  desfazer: { classe: 'sistema', motivo: 'Desfaz criaturas criadas por magia — o combate não sabe quem foi invocado.' },
  escuridao: { classe: 'sistema', motivo:
    'O tabuleiro tem escuridão, mas quem a pinta é o Mestre; magia ainda não cria área de escuridão.' },
  expulsao: { classe: 'sistema', motivo: 'Bane criaturas de outros planos.' },
  forma_espectral: { classe: 'sistema', motivo: 'Intangível: atravessa obstáculos e não ataca fisicamente.' },
  /* O texto já é legível ("Aumente 1 de atributo força" — o leitor aprendeu "de
     atributo"), mas mod_atributo ainda NÃO tem consumidor no combate: é a
     pendência da Licantropia (ver magia-efeitos.test.js, PENDENTES). Ligar a
     magia agora a faria aparecer "no motor" sem fazer nada. */
  forca_sagrada: { classe: 'sistema', motivo:
    'Atributo de combate ainda não tem consumidor no motor — a mesma pendência da Licantropia Lupina.' },
  intercessao_divina: { classe: 'sistema', motivo: 'Reduz níveis de dano CRÍTICO — o motor não gradua crítico.' },
  julgamento_de_cruine: { classe: 'sistema', motivo: 'Dano em PORCENTAGEM da energia heroica e física — o leitor só lê números absolutos.' },
  nutricao_natural: { classe: 'sistema', motivo: 'Restaura PORCENTAGEM da energia heroica e física — o leitor só lê números absolutos.' },
  pele_ignea: { classe: 'sistema', motivo: 'Reduz dano de fogo em PORCENTAGEM — a redução do motor é absoluta.' },
  passagem_vital: { classe: 'sistema', motivo: 'Doa porcentagem da própria energia a outro personagem.' },
  toque_de_furia: { classe: 'sistema', motivo: 'Transfere porcentagem da energia heroica como bônus.' },
  maldicao_da_justica: { classe: 'sistema', motivo: 'Contra-ataque mágico em quem ataca desarmado ou rendido.' },
  milagre_analogo: { classe: 'sistema', motivo: 'Reproduz uma magia de outro deus.' },
  olhar_de_predador: { classe: 'sistema', motivo: 'Perda de iniciativa, revelação de ficha e visão 180º.' },
  prolongamento: { classe: 'sistema', motivo: 'Estende a duração de outras magias.' },
  purificacao: { classe: 'sistema', motivo: 'Remove magias e venenos por nível.' },
  recuperecao_fisica: { classe: 'sistema', motivo: 'Cura veneno, vício ou doença por TIPO (e a chave tem erro de grafia: "recuperecao").' },
  refletir: { classe: 'sistema', motivo: 'Reflete magias de volta ao conjurador.' },
  rugido_intimidador: { classe: 'sistema', motivo: 'Teste de MORAL — o combate não tem moral.' },
  silencio: { classe: 'sistema', motivo: 'Área onde magia não-instantânea não pode ser evocada.' },
  soneto_da_morte: { classe: 'sistema', motivo: 'Morte ao ouvir as quatro estrofes, e perdas em porcentagem por rodada.' },
  transferencia_celeste: { classe: 'sistema', motivo: 'Transfere doença, ferimento ou possessão entre corpos.' },
  vinculo_vital: { classe: 'sistema', motivo: 'Divide o dano com o companheiro animal.' },
  visao_termica: { classe: 'sistema', motivo: 'Vê seres invisíveis — o combate não tem invisibilidade.' },
  voo: { classe: 'sistema', motivo: 'Voo, e teste de "Concentração", que não existe no catálogo de habilidades.' },

  /* ── Narrativa: sem número, o Mestre resolve na mesa ────────────── */
  cacada_marcada: { classe: 'narrativa', motivo: 'Guia até o alvo por dias.' },
  comunhao_natural: { classe: 'narrativa', motivo: 'Percebe eventos numa área natural.' },
  convivencia: { classe: 'narrativa', motivo: 'Um dia de convivência para colher informações.' },
  hidrotolerancia: { classe: 'narrativa', motivo: 'Respira debaixo d’água.' },
  intuicao: { classe: 'narrativa', motivo: 'Pressente perigo com uma rodada de antecedência.' },
  invocar_instrumento: { classe: 'narrativa', motivo: 'O instrumento marcado voa até as mãos.' },
  leitura: { classe: 'narrativa', motivo: 'Compreende um texto pelo toque.' },
  leitura_de_habitos: { classe: 'narrativa', motivo: 'Descobre origem, segredos e pecados do alvo.' },
  levitacao: { classe: 'narrativa', motivo: 'Movimento vertical no ar.' },
  localizar_objeto: { classe: 'narrativa', motivo: 'Localiza um objeto pela aura.' },
  maldicoes: { classe: 'narrativa', motivo: 'Maldições livres, limitadas pela imaginação.' },
  marca_da_morte: { classe: 'narrativa', motivo: 'Marca para achar o alvo depois.' },
  memorizacao: { classe: 'narrativa', motivo: 'Grava informação na memória.' },
  modificar_espirito: { classe: 'narrativa', motivo: 'Muda o estado de espírito numa escala narrativa.' },
  mutacao: { classe: 'narrativa', motivo: 'Disfarce e troca de forma.' },
  pseudoconsciencia: { classe: 'narrativa', motivo: 'Dispensa a concentração de Ilusões.' },
  santuario_natural: { classe: 'narrativa', motivo: 'Abrigo contra perigos ambientais.' },
  sentido_natural: { classe: 'narrativa', motivo: 'Projeta os sentidos pela vegetação.' },
  transformacao_metalica: { classe: 'narrativa', motivo: 'Altera a maleabilidade do metal.' },
  unidade_natural: { classe: 'narrativa', motivo: 'Teleporte pela vegetação.' },

  /* ── Ritual ou fora de combate ──────────────────────────────────── */
  abrigo: { classe: 'ritual', motivo: 'Ritual: localiza abrigo natural.' },
  ambiente_natural: { classe: 'ritual', motivo: 'Ritual: libera magias de ambiente natural.' },
  analise: { classe: 'ritual', motivo: 'Ritual: revela propriedades de um item.' },
  aprisionar: { classe: 'ritual', motivo: 'Ritual: prisão de escuridão com armadura própria.' },
  assombracao: { classe: 'ritual', motivo: 'Ritual: atrai mortos-vivos a um local.' },
  aura_emocional: { classe: 'ritual', motivo: 'Ritual: marca emocional em pessoa ou lugar.' },
  carcere_de_almas: { classe: 'ritual', motivo: 'Ritual: aprisiona a alma numa gema.' },
  centro_de_poder: { classe: 'ritual', motivo: 'Ritual: elo permanente com um local.' },
  circulo_profano: { classe: 'ritual', motivo: 'Ritual: círculo de 10 anos contra mortos-vivos.' },
  criptograma_mistico: { classe: 'ritual', motivo:
    'Ritual sobre um texto: a dificuldade em Alfabetização é de quem tentar lê-lo, não de um alvo.' },
  dominio_demoniaco: { classe: 'ritual', motivo: 'Ritual: submete um demônio.' },
  encarnacao: { classe: 'ritual', motivo: 'Ritual: encarna um espírito num corpo.' },
  fusao_natural: { classe: 'ritual', motivo: 'Ritual: funde-se aos animais com elo.' },
  interdicao_dimensional: { classe: 'ritual', motivo: 'Ritual: bloqueia acesso a outros planos.' },
  laco_mortal: { classe: 'ritual', motivo: 'Ritual: vínculo de alma entre dois seres.' },
  lenda_viva: { classe: 'ritual', motivo: 'Ritual: dá vida a uma lenda local.' },
  lendas: { classe: 'ritual', motivo: 'Ritual: descobre uma lenda.' },
  piedade: { classe: 'ritual', motivo: 'Ritual: juramento de servidão do adversário poupado.' },
  receptaculo_de_elementos: { classe: 'ritual', motivo: 'Ritual: item que amplia dano elemental.' },
  retorno_do_martir: { classe: 'ritual', motivo: 'Ritual: ressuscita.' },
  runas: { classe: 'ritual', motivo: 'Ritual: guarda uma magia numa runa.' },
  solo_divino: { classe: 'ritual', motivo: 'Ritual: purifica um local profanado.' },
  visao_de_cena: { classe: 'ritual', motivo: 'Ritual: vê uma cena do passado.' },

  /* ── Os números são a ficha de um invocado ──────────────────────── */
  conjuracao_demoniaca: { classe: 'invocado', motivo: 'Evoca um demônio.' },
  convocacao_animal: { classe: 'invocado', motivo: 'Convoca animais por estágio.' },
  criacao: { classe: 'invocado', motivo: 'Cria um morto-vivo.' },
  ultima_oracao: { classe: 'invocado', motivo: 'Convoca um enviado celestial.' },
};

/* O predicado mais comum das pendências de texto: o leitor passou a achar a
   unidade em ALGUM dos cinco níveis — o mesmo critério da auditoria. */
function leUnidadeEmAlgumNivel(magia, unidade) {
  if (!magia) return false;
  return MAGIA_NIVEIS.some((n) => efeitosNoNivel(magia, n)[unidade] != null);
}

/* Lookup tolerante: magia sem motivo registrado devolve null, e o painel a
   mostra como "sem motivo registrado" — que é o convite para perguntar.

   Recebe a LINHA da magia, não só a chave, para poder avaliar o predicado
   `resolvido` contra o texto que está no banco agora. Devolve a classe
   'resolvido' quando a pendência já foi sanada: é o sinal de que a magia
   está pronta para entrar no motor e só falta alguém ligá-la. */
function motivoForaDoRegistro(magiaOuKey) {
  const m = (magiaOuKey && typeof magiaOuKey === 'object') ? magiaOuKey : null;
  const key = m ? m.key : magiaOuKey;
  if (!key || typeof key !== 'string') return null;
  const reg = MAGIA_FORA_DO_REGISTRO[key];
  if (!reg) return null;
  if (m && typeof reg.resolvido === 'function' && reg.resolvido(m)) {
    return { ...reg, classe: 'resolvido' };
  }
  return reg;
}

Object.assign(window, { MAGIA_FORA_DO_REGISTRO, motivoForaDoRegistro });
