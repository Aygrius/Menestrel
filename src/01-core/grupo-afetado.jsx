/* ============================================================
   GRUPO AFETADO — quem a barra do topo move e quem o clima desgasta
   ============================================================
   Pedidos do usuário (06/10/2026):
     "Remova o seletor de localização do personagem da ficha, pois o seletor de
      localização no topo será a localização do personagem, ao invés de ser o
      seletor do local da aventura, será o seletor de onde o personagem está."
     "O clima passa a afetar os personagens individualmente. Mas para facilitar
      a vida do mestre, será possível quais personagens serão afetados em
      conjunto ou de forma individual, para agilizar."

   UMA SELEÇÃO, DOIS USOS. O Mestre marca os personagens na barra do topo, e
   essa marca responde às duas perguntas que antes tinham resposta fixa:

     • quem o seletor de local MOVE  (era: a aventura inteira, num campo só)
     • quem a mudança de clima e as horas DESGASTAM  (era: todos os
       protagonistas, sempre)

   É por isso que a seleção não é "o filtro do clima": é o grupo em cena. O
   Mestre leva a caravana para o deserto e a deixa lá com uma marcação; depois
   marca a retaguarda e trata dela sem desfazer nada.

   ONDE MORA: `historias.data_jogo_atual.afetados`, um array de ids — o MESMO
   jsonb da data, da hora e do clima. Nenhuma coluna nova, e o realtime que o
   CardDataJogoAtual já assina entrega a seleção a todo mundo de graça.

   VAZIO OU AUSENTE QUER DIZER TODOS, e isso não é um detalhe de implementação:
   é o padrão certo. Toda mesa que existe hoje tem `afetados` ausente e precisa
   continuar funcionando como funcionava — o clima pegando a mesa inteira —, e
   "em conjunto" é o caso comum. Marcar é o que custa um clique, não deixar
   como está.

   O CLIMA CONTINUA UM SÓ POR MESA (decisão do usuário): `tempo` segue no mesmo
   jsonb, um por aventura. A seleção é o PINCEL — diz em quem a tinta cai —, e
   não um clima guardado por grupo. É o que mantém o modelo pequeno e o gesto
   rápido, que era o pedido ("para agilizar").

   TUDO AQUI É PURO: nem banco, nem React. Quem leva isto à mesa é o
   CardDataJogoAtual (10-shell); quem cobra as horas é aplicarDesgasteNosPJs,
   lá mesmo.
   ============================================================ */

/* Os ids que a seleção alcança, sempre dentro dos protagonistas da história:
   id marcado que saiu da mesa não desgasta ninguém, e o Mestre não precisa
   limpar a lista quando um personagem sai. Sem seleção, todos. */
function pjsAfetados(dataJogo, protagonistaIds) {
  const todos = (Array.isArray(protagonistaIds) ? protagonistaIds : []).map(String);
  const marcados = (dataJogo && Array.isArray(dataJogo.afetados)) ? dataJogo.afetados.map(String) : [];
  if (!marcados.length) return todos;
  const dentro = todos.filter((id) => marcados.includes(id));
  // Seleção que não sobrou ninguém (todos saíram da mesa) volta a ser "todos":
  // o contrário deixaria o relógio da mesa sem efeito nenhum, em silêncio.
  return dentro.length ? dentro : todos;
}

// A seleção está em "todos" — o estado em que o clima pega a mesa inteira?
function afetaTodos(dataJogo, protagonistaIds) {
  const todos = (Array.isArray(protagonistaIds) ? protagonistaIds : []).map(String);
  return pjsAfetados(dataJogo, protagonistaIds).length === todos.length;
}

/* A seleção gravável. Marcar TODOS grava ausente em vez da lista cheia: o
   estado "a mesa inteira" tem uma representação só, e mesa antiga, mesa nova e
   mesa em que o Mestre marcou tudo de volta ficam idênticas no banco. */
function comAfetados(dataJogo, ids, protagonistaIds) {
  const base = dataJogo || {};
  const todos = (Array.isArray(protagonistaIds) ? protagonistaIds : []).map(String);
  const limpos = [...new Set((Array.isArray(ids) ? ids : []).map(String))]
    .filter((id) => todos.includes(id));
  if (!limpos.length || limpos.length === todos.length) {
    const { afetados, ...resto } = base;
    void afetados;
    return resto;
  }
  // Na ordem dos protagonistas, não na de clique: a lista gravada fica estável.
  return { ...base, afetados: todos.filter((id) => limpos.includes(id)) };
}

/* ── O LOCAL DO GRUPO ────────────────────────────────────────────────────── */

/* Onde o grupo está, para a barra do topo mostrar:
     { local, mesmo, vazios }
   `local` é a localização quando TODOS os marcados estão no mesmo lugar (e é
   isso que o pill escreve); `mesmo` é false quando eles discordam — aí o pill
   diz "Vários lugares", porque inventar um vencedor entre dois lugares seria
   mentir sobre onde metade do grupo está.

   `pjs` são linhas { id, localizacao }. Personagem sem localização conta como
   um lugar próprio (o vazio): um grupo em que metade está em Farzelo e metade
   em lugar nenhum também não tem UM local. */
function localDoGrupo(pjs, ids) {
  const alvo = new Set((Array.isArray(ids) ? ids : []).map(String));
  const locais = (Array.isArray(pjs) ? pjs : [])
    .filter((p) => p && alvo.has(String(p.id)))
    .map((p) => String(p.localizacao || '').trim());
  if (!locais.length) return { local: '', mesmo: true, vazios: 0 };
  const distintos = [...new Set(locais)];
  return {
    local: distintos.length === 1 ? distintos[0] : '',
    mesmo: distintos.length === 1,
    vazios: locais.filter((l) => !l).length,
  };
}

Object.assign(window, {
  pjsAfetados, afetaTodos, comAfetados, localDoGrupo,
});
