/* ============================================================
   SESSÃO — renovar o token e repetir, em vez de falhar na cara
   ============================================================
   Problema relatado pelo usuário (11/09/2026): "fui salvar uma informação e
   recebi 'JWT expired', isso tem acontecido com frequência".

   O cliente já usa `autoRefreshToken` (padrão do supabase-js v2), então o
   token DEVERIA se renovar sozinho. Quando o erro chega até a tela é porque
   a renovação não aconteceu antes daquele request — e há duas causas
   plausíveis, nenhuma das quais dá pra consertar daqui:

     • a aba ficou parada / a máquina dormiu. O supabase-js agenda a
       renovação num timer, e o Chrome estrangula timers em aba de fundo;
     • algo na rede bloqueou a chamada de refresh.

   O que dá pra consertar é a CONSEQUÊNCIA: hoje um token vencido vira erro
   de gravação na cara do usuário. Este módulo intercepta no `fetch` do
   cliente — um lugar só, cobrindo toda query, RPC e storage —, renova a
   sessão e REPETE o request uma vez. Nos dois cenários acima o save passa a
   funcionar; o usuário não vê nada.

   Não conserta a causa, e de propósito: se a rede estiver mesmo bloqueando
   o refresh, a segunda tentativa falha igual e o erro aparece — que é o
   comportamento certo, porque aí é problema de verdade e precisa aparecer.
   ============================================================ */

/* O PostgREST devolve 401 com code PGRST301 quando o JWT venceu; o GoTrue
   usa mensagens em texto. Cobrimos os dois, e só isso: 401 por falta de
   permissão (RLS) NÃO é token vencido e não pode disparar retry, senão a
   gente mascara erro de política com uma segunda tentativa idêntica. */
export function ehTokenVencido(status, corpo) {
  if (status !== 401) return false;
  const t = String(corpo == null ? '' : corpo);
  return /PGRST301/.test(t) || /jwt expired/i.test(t) || /token is expired/i.test(t);
}

/* A chamada de refresh não pode passar por este interceptador, senão um
   refresh que devolve 401 dispara outro refresh, e assim por diante. */
export function ehRotaDeAuth(url) {
  return /\/auth\/v1\//.test(String(url || ''));
}

/* Troca o Authorization do request pelo token novo. Preserva o resto dos
   headers — o supabase-js manda apikey, Prefer, Content-Type e outros que
   não podem se perder na repetição. */
export function trocarAuthorization(init, token) {
  const h = new Headers((init && init.headers) || {});
  if (token) h.set('Authorization', 'Bearer ' + token);
  return { ...(init || {}), headers: h };
}

/* Fábrica do fetch com renovação.

   `obterClient` é uma função e não o client direto por causa do ovo-galinha:
   este fetch é passado PARA o createClient, então o client ainda não existe
   no momento em que a fábrica roda.

   `renovando` guarda a promessa em voo: se dez requests vencerem ao mesmo
   tempo — o caso típico, porque a tela toda recarrega junto —, todos esperam
   UM refresh em vez de dispararem dez. */
export function criarFetchComRenovacao(obterClient, fetchBase) {
  const doFetch = fetchBase || ((...a) => fetch(...a));
  let renovando = null;

  const renovarUmaVezSo = async () => {
    if (!renovando) {
      const client = obterClient();
      renovando = Promise.resolve(client && client.auth ? client.auth.refreshSession() : null)
        .then((r) => (r && r.data && r.data.session) ? r.data.session.access_token : null)
        .catch(() => null)
        .finally(() => { renovando = null; });
    }
    return renovando;
  };

  return async function fetchComRenovacao(input, init) {
    const url = (input && input.url) ? input.url : input;
    const resp = await doFetch(input, init);
    if (resp.status !== 401 || ehRotaDeAuth(url)) return resp;

    // Ler o corpo consome o stream: clona antes, senão quem chamou recebe
    // uma Response já lida e quebra em lugar nenhum relacionado a isto.
    let corpo = '';
    try { corpo = await resp.clone().text(); } catch (e) { corpo = ''; }
    if (!ehTokenVencido(resp.status, corpo)) return resp;

    const token = await renovarUmaVezSo();
    if (!token) return resp;          // não deu pra renovar: devolve o erro original

    // UMA repetição. Se falhar de novo, o erro sobe — é sinal de problema
    // real (rede bloqueando o refresh, sessão revogada), e esconder isso
    // atrás de um laço de tentativas só adiaria o diagnóstico.
    return doFetch(input, trocarAuthorization(init, token));
  };
}
