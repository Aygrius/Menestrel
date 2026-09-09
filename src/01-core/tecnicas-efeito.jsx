/* ============================================================
   TÉCNICAS DE COMBATE — registro de efeito mecânico (Fase 1)
   ============================================================
   Traduz o campo `efeito` da tabela `tecnicas` (prosa, exibida na
   UI) para primitivas que o motor de batalha sabe aplicar. O texto
   do banco continua sendo a fonte para o jogador LER; este mapa é o
   que a rodada EXECUTA. tecnicas-efeito.test.js trava o acordo entre
   os dois — em especial o número de rodadas.

   Fase 1 = as 24 técnicas cujo efeito é "um número somado a um stat
   por N rodadas". As ~21 que reescrevem a resolução do golpe
   (ignora_eh, dano %, ataque duplo, impedir ataque…) são Fase 2 e
   NÃO têm entrada aqui — técnica sem entrada segue narrativa, que é
   exatamente o comportamento de antes desta fase.

   Campos:
     modo        'total' → valor = totalTecnica() × sinal, sem dado.
                 'teste' → rola d20 na `dificuldade`; aplica `valor`
                           fixo só no sucesso.
     alvo        'self' | 'inimigo' | 'aliados'
     rodadas     duração CONTANDO a rodada da ativação.
     efeitos[]   { tipo, sinal }  no modo total
                 { tipo, valor }  no modo teste
     maxAlvos?   teto de alvos quando alvo === 'aliados'.
     parcial?    metade do efeito que a Fase 1 não automatiza (só aviso na UI).

   A restrição por arma/armadura NÃO mora aqui: vem das colunas
   `grupo_armas` e `grupo_armaduras` da própria tabela `tecnicas`.

   Spec: docs/superpowers/specs/2026-09-09-tecnicas-efeitos-combate-design.md
   ============================================================ */

const TECNICA_EFEITO_MAP = {
  /* ── Coluna de ataque ───────────────────────────────────────── */
  mira:              { modo: 'total', alvo: 'self',    rodadas: 1,  icone: '🎯',
                       efeitos: [{ tipo: 'mod_ataque', sinal: 1 }] },
  ricochetear:       { modo: 'total', alvo: 'self',    rodadas: 1,  icone: '🏹',
                       efeitos: [{ tipo: 'mod_ataque', sinal: 1 }] },
  ajustar_disparo:   { modo: 'total', alvo: 'self',    rodadas: 2,  icone: '📐',
                       efeitos: [{ tipo: 'mod_ataque', sinal: 1 }] },
  // "adicionado ao seu grupo de armas CD": é bônus de ataque, mas só com arma
  // desarmada. A restrição NÃO é declarada aqui — vem de tecnicas.grupo_armas
  // ('CD' no banco), que aplicarEfeitoTecnica copia para o efeito.
  pugilato:          { modo: 'total', alvo: 'self',    rodadas: 1,  icone: '👊',
                       efeitos: [{ tipo: 'mod_ataque', sinal: 1 }] },
  // Sem duração no texto do banco; `uso` é Único. 1 rodada por decisão —
  // ver o teste que trava isso em tecnicas-efeito.test.js.
  // METADE PENDENTE: o "ignora a armadura do adversário" é Fase 2.
  explorar_fraqueza: { modo: 'total', alvo: 'self',    rodadas: 1,  icone: '🔍',
                       parcial: 'ignora_armadura',
                       efeitos: [{ tipo: 'mod_ataque', sinal: 1 }] },
  // Debuff: sai da coluna de ataque do adversário.
  resguardar:        { modo: 'total', alvo: 'inimigo', rodadas: 2,  icone: '🛡️',
                       efeitos: [{ tipo: 'mod_ataque', sinal: -1 }] },

  /* ── Defesa ─────────────────────────────────────────────────── */
  defletir_ataque:   { modo: 'total', alvo: 'self',    rodadas: 3,  icone: '↩️',
                       efeitos: [{ tipo: 'mod_defesa', sinal: 1 }] },
  imprevisibilidade: { modo: 'total', alvo: 'self',    rodadas: 3,  icone: '🎲',
                       efeitos: [{ tipo: 'mod_defesa', sinal: 1 }] },
  pressionar_oponente: { modo: 'total', alvo: 'inimigo', rodadas: 3, icone: '⬇️',
                       efeitos: [{ tipo: 'mod_defesa', sinal: -1 }] },

  /* ── Posturas: trade-off entre ataque e defesa ──────────────── */
  postura_defensiva: { modo: 'total', alvo: 'self',    rodadas: 3,  icone: '🐢',
                       efeitos: [{ tipo: 'mod_defesa', sinal: 1 },
                                 { tipo: 'mod_ataque', sinal: -1 }] },
  postura_ofensiva:  { modo: 'total', alvo: 'self',    rodadas: 3,  icone: '⚔️',
                       efeitos: [{ tipo: 'mod_ataque', sinal: 1 },
                                 { tipo: 'mod_defesa', sinal: -1 }] },

  /* ── Velocidade ─────────────────────────────────────────────────
     mod_vb governa iniciativa, passo do tabuleiro E a ação extra acima
     de 30 (processarViradaDeRodada). Um buff de velocidade portanto faz
     as três coisas — é a mesma regra que as magias de aceleração já
     seguem, e é intencional. */
  atirar_em_movimento: { modo: 'total', alvo: 'self',  rodadas: 2,  icone: '🏃',
                       efeitos: [{ tipo: 'mod_vb', sinal: 1 }] },
  disparo_rapido:    { modo: 'total', alvo: 'self',    rodadas: 5,  icone: '💨',
                       efeitos: [{ tipo: 'mod_vb', sinal: 1 }] },
  expectativa:       { modo: 'total', alvo: 'inimigo', rodadas: 3,  icone: '👁️',
                       efeitos: [{ tipo: 'mod_vb', sinal: -1 }] },
  // "adicionado à iniciativa de 4 alvos" — iniciativa é ordenada por vb.
  voz_de_comando:    { modo: 'total', alvo: 'aliados', rodadas: 10, icone: '📣',
                       maxAlvos: 4,
                       efeitos: [{ tipo: 'mod_vb', sinal: 1 }] },

  /* ── Energia heroica temporária ─────────────────────────────── */
  animosidade:       { modo: 'total', alvo: 'self',    rodadas: 2,  icone: '😠',
                       efeitos: [{ tipo: 'mod_eh_temp', sinal: 1 }] },
  heroismo:          { modo: 'total', alvo: 'self',    rodadas: 5,  icone: '✨',
                       efeitos: [{ tipo: 'mod_eh_temp', sinal: 1 }] },
  segundo_folego:    { modo: 'total', alvo: 'self',    rodadas: 10, icone: '🌬️',
                       efeitos: [{ tipo: 'mod_eh_temp', sinal: 1 }] },

  /* ── Resistências ───────────────────────────────────────────── */
  resistencia_a_dor:   { modo: 'total', alvo: 'self',  rodadas: 5,  icone: '🦾',
                       efeitos: [{ tipo: 'mod_rf', sinal: 1 }] },
  resistencia_extrema: { modo: 'total', alvo: 'self',  rodadas: 5,  icone: '🔮',
                       efeitos: [{ tipo: 'mod_rm', sinal: 1 }] },

  /* ── Dano ───────────────────────────────────────────────────── */
  posicionamento:    { modo: 'total', alvo: 'inimigo', rodadas: 3,  icone: '📍',
                       efeitos: [{ tipo: 'mod_dano_max', sinal: -1 }] },

  /* ── Combinadas ─────────────────────────────────────────────── */
  centaurizar:       { modo: 'total', alvo: 'self',    rodadas: 2,  icone: '🐎',
                       efeitos: [{ tipo: 'mod_ataque', sinal: 1 },
                                 { tipo: 'mod_vb',     sinal: 1 }] },
  furia:             { modo: 'total', alvo: 'self',    rodadas: 5,  icone: '😤',
                       efeitos: [{ tipo: 'mod_ataque',  sinal: 1 },
                                 { tipo: 'mod_eh_temp', sinal: 1 },
                                 { tipo: 'mod_rf',      sinal: 1 },
                                 { tipo: 'mod_rm',      sinal: 1 }] },

  /* ── Única de Família B na Fase 1 ───────────────────────────────
     Entra porque dano_por_rodada já existe pronto (Fase 1.2, veneno).
     Valor FIXO 1, não o total da técnica — o texto diz "1 de dano". */
  sangramento:       { modo: 'teste', alvo: 'inimigo', rodadas: 5,  icone: '🩸',
                       dificuldade: 'dificil',
                       efeitos: [{ tipo: 'dano_por_rodada', valor: 1 }] },
};

// Lookup tolerante: técnica sem entrada devolve null, e o chamador mantém o
// comportamento narrativo de antes da Fase 1. Nunca lança.
function tecnicaEfeitoDe(key) {
  if (!key || typeof key !== 'string') return null;
  return TECNICA_EFEITO_MAP[key] || null;
}

Object.assign(window, { TECNICA_EFEITO_MAP, tecnicaEfeitoDe });
