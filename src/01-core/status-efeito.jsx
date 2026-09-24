/* ============================================================
   STATUS PERSISTENTE — o status que sobrevive à batalha
   ============================================================
   "Lembrando que o status da batalha também persiste depois que a luta acaba,
    mas o mestre pode remover e adicionar fora da batalha também."
    (usuário, 17/09/2026)

   Até esta data o status NÃO persistia. `estadoAoEncerrar` (12-batalha)
   devolvia à ficha apenas `vitalidade` e `condicoes`, e `montarSnapshots`
   entrava em combate com `status_temp: []`, recalculando morto/desmaiado a
   partir da EF. Um personagem que saísse do combate envenenado chegava à ficha
   curado, e a ficha não tinha onde dizer o contrário.

   ── Onde mora ───────────────────────────────────────────────
   `personagens.estado_atual.status`: array com a MESMA forma do `status_temp`
   do participante de batalha — { id, nome, icone, rodadas_rest, efeito } —
   mais um `vence_em` de calendário. Mesma forma de propósito: o que sai da
   batalha entra aqui sem tradução, e o que está aqui volta para a batalha sem
   tradução. Duas formas seriam duas chances de divergir.

   ── Como vence ──────────────────────────────────────────────
   "As rodadas viram duração no calendário da mesa e caem quando o Mestre
   avança a data." (decisão do usuário, 17/09/2026)

   O calendário do jogo tem grão de DIA — é o mesmo limite que magias-efeito.jsx
   já enfrenta ("minutos e horas vencem no mesmo dia de jogo"). Uma rodada de
   combate são segundos, então NÃO existe conversão honesta de rodada para dia,
   e este módulo não finge que existe: o status que sai do combate ainda
   contando vence NO DIA SEGUINTE — dura o resto do dia de jogo em que a luta
   aconteceu e cai no instante em que o Mestre avança a data. É exatamente o
   que o pedido descreve.

   Fora do combate o Mestre aplica em DIAS, que é a unidade do calendário, ou
   sem prazo nenhum — e aí só sai quando ele tirar.

   VENCIMENTO PREGUIÇOSO, igual a magiasAtivasVigentes: o status expira por
   comparação NA LEITURA, nunca por rotina de fundo. Nada avança a data do jogo
   sozinho; se o vencimento dependesse de um processo, nada venceria nunca. E a
   alternativa — varrer os PJs da mesa a cada mudança de data — seria uma
   escrita em N personagens disparada por um clique no pill de data.

   Depende de: somarDiasFantasy / dataFantasyParaAbsoluto (01-core/helpers.jsx).
   Carregar DEPOIS de helpers.jsx.
   ============================================================ */

/* Os status que o Mestre aplica à mão FORA do combate — o cardápio do
   controle da ficha. `valor` é o número que o efeito carrega (dano por
   rodada, colunas de penalidade); `semValor` marca quem não tem nenhum. Os
   tipos casam com os que statusAplicadoPeloMestre (12-batalha) reconhece. */
const STATUS_MESTRE_TIPOS = [
  { tipo: 'veneno',      chaveCopy: 'envenenado', ic: 'ti-flask-2',           emoji: '☠',  rotuloValor: { pt: 'Dano por rodada', en: 'Damage per round' } },
  { tipo: 'sangramento', chaveCopy: 'sangrando',  ic: 'ti-droplet',           emoji: '🩸', rotuloValor: { pt: 'Dano por rodada', en: 'Damage per round' } },
  { tipo: 'ferido',      chaveCopy: 'ferido',     ic: 'ti-bandage',           emoji: '🤕', rotuloValor: { pt: 'Colunas de penalidade', en: 'Penalty columns' } },
  { tipo: 'caido',       chaveCopy: 'caido',      ic: 'ti-arrow-down-circle', emoji: '💫', semValor: true },
  /* DESMAIADO E MORTO À MÃO (20/09/2026): "falta adicionar todos os status
     possíveis na ficha, para o mestre alterar."

     Os dois também são DERIVADOS da vitalidade (EF no piso é morto; EF ou EH
     zerada é desmaiado), e ter duas origens para o mesmo estado seria um
     conflito — se não fosse pelo fato de não existir marca manual de
     "são/ativo". Derivado e manual nunca se contradizem: só coincidem. Quando
     coincidem, o card e a ficha mostram UM chip (dedupe por tipo).

     Sem valor numérico: não há "dano por rodada" em estar desmaiado. Os
     ícones são os mesmos do mapa da batalha (ICONE_STATUS), para o estado não
     ter dois desenhos. */
  { tipo: 'desmaiado',   chaveCopy: 'statusDesmaiado', ic: 'ti-zzz',   emoji: '💤', semValor: true },
  { tipo: 'morto',       chaveCopy: 'statusMorto',     ic: 'ti-skull', emoji: '💀', semValor: true },
];

/* A FÁBRICA DE STATUS (statusAplicadoPeloMestre) NÃO mora aqui.

   Ela ficou em 12-batalha/batalha.jsx, que é a dona do vocabulário de status,
   e é exposta no window. Tentei trazê-la para cá e foi erro meu: aquela fase a
   cita no Object.assign do fim do arquivo, que roda na carga do módulo, e os
   56 testes de batalha — que não importam a fase 01 inteira — quebraram todos
   de uma vez. Quem precisa dela fora do combate (a ficha) lê pelo window em
   tempo de render, quando a fase 12 já carregou.

   O que mora aqui é só o que a PERSISTÊNCIA precisa: vencimento, leitura
   vigente e as duas operações de lista. */

/* ── Vencimento ────────────────────────────────────────────────────────────
   `dias` null/indefinido = sem prazo: fica até o Mestre remover. Zero ou mais
   vira uma data concreta. Mesa sem data definida devolve o status sem
   `vence_em` — sem calendário não há como vencer, e perder o status por causa
   disso seria pior do que mantê-lo. */
function statusComVencimento(status, dataJogo, dias) {
  if (!status) return null;
  /* `dias == null` ANTES de Number(): Number(null) é 0, e zero é um prazo
     legítimo (vence hoje). Sem esta guarda, "sem prazo" virava "já venceu" —
     o status era gravado e sumia na primeira leitura. */
  if (dias == null) return { ...status, vence_em: null };
  const n = Number(dias);
  if (!Number.isFinite(n)) return { ...status, vence_em: null };
  if (typeof somarDiasFantasy !== 'function') return { ...status, vence_em: null };
  const vence = somarDiasFantasy(dataJogo, Math.max(0, Math.trunc(n)));
  return { ...status, vence_em: vence || null };
}

/* O status que sai do combate ainda contando rodadas. Dura o resto do dia de
   jogo e cai quando o Mestre avança a data — ver a nota de conversão no topo.
   Quem sai SEM rodadas (rodadas_rest null = "até o fim da batalha") não
   atravessa: o fim da batalha chegou. */
function statusAoEncerrarBatalha(statusTemp, dataJogo) {
  const lista = Array.isArray(statusTemp) ? statusTemp : [];
  return lista
    .filter((st) => st && st.rodadas_rest != null && Number(st.rodadas_rest) > 0)
    .map((st) => statusComVencimento(st, dataJogo, 1))
    .filter(Boolean);
}

/* VENCIMENTO PREGUIÇOSO — gêmeo de magiasAtivasVigentes (magias-efeito.jsx).
   Vence NO DIA: um status que vence em 14 ainda vale no 13 e já não vale no 14. */
function statusVigentes(lista, dataJogo) {
  const arr = Array.isArray(lista) ? lista : [];
  if (typeof dataFantasyParaAbsoluto !== 'function') return arr;
  const hoje = dataFantasyParaAbsoluto(dataJogo);
  if (hoje == null) return arr;   // sem data, não há como vencer nada
  return arr.filter((st) => {
    const fim = st && st.vence_em ? dataFantasyParaAbsoluto(st.vence_em) : null;
    return fim == null ? true : hoje < fim;
  });
}

/* O TIPO de um status sai do prefixo do id — 'veneno:k3f' → 'veneno'. É assim
   que statusAplicadoPeloMestre o monta, e é o mesmo prefixo que o tabuleiro lê
   para escolher o selo. */
function tipoDoStatus(st) {
  const id = st && typeof st.id === 'string' ? st.id : '';
  const i = id.indexOf(':');
  return i > 0 ? id.slice(0, i) : (id || null);
}

/* Acrescenta SEM REPETIR O MESMO TIPO (17/09/2026): "um mesmo personagem pode
   acumular mais de um status ao mesmo tempo, sem restrição. Mas nunca acumular
   o mesmo mais de uma vez."

   A dedupe era por `id`, e o id traz sufixo aleatório — dois "Envenenado"
   aplicados pelo Mestre tinham ids diferentes e conviviam. Por TIPO, o
   segundo substitui o primeiro: reaplicar veneno renova o veneno, não empilha
   dois. Envenenado + Ferido + Caído seguem convivendo, que é o "sem restrição"
   da outra metade da frase. */
function comStatusPersistente(lista, novo) {
  if (!novo) return Array.isArray(lista) ? lista : [];
  const tipoNovo = tipoDoStatus(novo);
  const arr = (Array.isArray(lista) ? lista : [])
    .filter((st) => st && st.id !== novo.id && (tipoNovo == null || tipoDoStatus(st) !== tipoNovo));
  return [...arr, novo];
}

function semStatusPersistente(lista, id) {
  return (Array.isArray(lista) ? lista : []).filter((st) => st && st.id !== id);
}

Object.assign(window, {
  STATUS_MESTRE_TIPOS, statusComVencimento,
  statusAoEncerrarBatalha, statusVigentes, comStatusPersistente, semStatusPersistente,
  tipoDoStatus,
});
