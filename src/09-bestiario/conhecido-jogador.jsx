/* ============================================================
   CONHECIDO DO JOGADOR — o que o jogador conhece/possui, derivado dos PJs dele
   ============================================================
   Spec: docs/superpowers/specs/2026-09-11-catalogos-visao-jogador-design.md §2
   Levantamento do banco (11/09/2026): magias, técnicas, habilidades e itens
   conhecidos já vivem em `personagens`, uma coluna jsonb cada, e a tabela tem
   user_id. Não é preciso registro novo.

   A união é sobre TODOS os PJs do usuário: quem tem dois personagens conhece
   o catálogo dos dois. Para magias guarda-se o MAIOR número de passos entre
   os PJs, porque é ele que decide até que nível o texto aparece.

   Formato de `personagens.inventario`: NÃO é um array — é
   `{ moedas: {...}, itens: [...] }` (confirmado em 07-inventario/inventario.jsx,
   ex.: linha 562 `pj.inventario || { moedas: {...}, itens: [] }`). O slug de
   cada item vive em `it.slug` (confirmado em 07-inventario/inventario.jsx —
   todo item inserido no array carrega `slug: it.slug`, ex. linhas 753/796/961).

   Carregar em main.tsx ANTES de bestiario.jsx: bestiario.jsx chama
   useConhecidoDoJogador por nome nu.
   ============================================================ */

function conhecidoDoJogador(personagens) {
  const magias = new Map();
  const tecnicas = new Set();
  const habilidades = new Set();
  const itens = new Set();
  (Array.isArray(personagens) ? personagens : []).forEach((pj) => {
    if (!pj) return;
    Object.entries(pj.magias || {}).forEach(([key, passos]) => {
      const n = Number(passos) || 0;
      if (n > 0) magias.set(key, Math.max(magias.get(key) || 0, n));
    });
    Object.keys(pj.tecnicas || {}).forEach((k) => tecnicas.add(k));
    Object.keys(pj.habilidades || {}).forEach((k) => habilidades.add(k));
    const listaItens = Array.isArray(pj.inventario?.itens) ? pj.inventario.itens : [];
    listaItens.forEach((it) => {
      const slug = it && it.slug;
      if (slug) itens.add(slug);
    });
  });
  return { magias, tecnicas, habilidades, itens };
}

/* Criaturas que o jogador pode ver.

   A spec original (§5) propunha uma tabela nova `criaturas_liberadas` com
   RLS e uma tela de liberação para o Mestre. Isso estava ERRADO: o
   mecanismo já existe inteiro no Diário desde a migration 017, e criar o
   segundo seria duas fontes de verdade para a mesma pergunta.

   Como funciona o que já existe (ver 13-diario/diario.jsx:155-175 e
   toggleLiberarPj:2749):
     • `historias.criatura_ids` — as criaturas anexadas àquela história;
     • `historias.lore_acesso_pj` — jsonb `{ "tipo:ref_id": [pj_id...] }`,
       ex. `{ "criatura:15": [42] }`.

   A regra de visibilidade é a da migration 017, e é repetida aqui porque é
   contraintuitiva: chave AUSENTE significa liberada para TODOS os PJs
   daquela história; chave PRESENTE restringe aos PJs listados. Ou seja, o
   Mestre anexar a criatura à história já a revela — `lore_acesso_pj` só
   serve para ESTREITAR.

   Recebe as histórias de que os PJs do jogador participam e os ids desses
   PJs. Devolve um Set de ids de criatura. */
function criaturasLiberadas(historias, pjIds) {
  const meus = new Set((Array.isArray(pjIds) ? pjIds : []).map(Number));
  const out = new Set();
  (Array.isArray(historias) ? historias : []).forEach((h) => {
    if (!h) return;
    const acesso = (h.lore_acesso_pj && typeof h.lore_acesso_pj === 'object') ? h.lore_acesso_pj : {};
    (Array.isArray(h.criatura_ids) ? h.criatura_ids : []).forEach((cid) => {
      const lista = acesso['criatura:' + String(cid)];
      if (!Array.isArray(lista) || lista.length === 0) { out.add(cid); return; }
      if (lista.map(Number).some((pj) => meus.has(pj))) out.add(cid);
    });
  });
  return out;
}

const CONHECIDO_VAZIO = () => ({
  magias: new Map(), tecnicas: new Set(), habilidades: new Set(),
  itens: new Set(), criaturas: new Set(),
});

/* Busca os personagens do usuário logado uma vez e devolve o conhecido.
   `{ carregando, conhecido, erro }` — a lista não pode filtrar enquanto
   carrega, senão pisca "nada encontrado" antes de saber a resposta.

   `ativo` falso não consulta nada (ex.: Mestre olhando a mesma lista não
   precisa desta query). Cancela no unmount — padrão `let vivo = true` já
   usado em useEhAdmin (bestiario.jsx:285). */
function useConhecidoDoJogador(ativo) {
  const [carregando, setCarregando] = useState(!!ativo);
  const [conhecido, setConhecido] = useState(CONHECIDO_VAZIO);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!ativo) { setCarregando(false); return; }
    let vivo = true;
    setCarregando(true);
    setErro(null);
    (async () => {
      try {
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();
        if (!vivo) return;
        const userId = authData?.user?.id;
        if (authError || !userId) {
          setErro(authError || new Error('sem usuário logado'));
          setConhecido(CONHECIDO_VAZIO());
          return;
        }
        /* O PONTO DE VISTA É DE UM PERSONAGEM SÓ — decisão do usuário,
           12/09/2026: "depois que um jogador selecionar o personagem, todos os
           demais menus serão seu ponto de vista em relação a magias, técnicas,
           animais, etc que conhece".

           Antes esta consulta trazia TODOS os PJs do jogador (.eq user_id) e
           unia o que cada um sabia. O jogador com três personagens via a soma
           dos três — e nenhum deles sabia tudo aquilo. Agora lê o PJ ATIVO do
           perfil, e é só ele.

           Sem PJ ativo o conjunto é VAZIO, de propósito: é o estado em que o
           jogador ainda não escolheu por quais olhos está olhando, e as telas
           dizem isso em vez de mostrar um recorte que não é de ninguém. */
        const { data: perfil, error: errPerfil } = await supabaseClient
          .from('profiles').select('pj_ativo_id').eq('id', userId).maybeSingle();
        if (!vivo) return;
        if (errPerfil) {
          setErro(errPerfil);
          setConhecido(CONHECIDO_VAZIO());
          return;
        }
        const pjAtivoId = perfil && perfil.pj_ativo_id;
        if (!pjAtivoId) { setConhecido(CONHECIDO_VAZIO()); return; }

        const { data, error } = await supabaseClient
          .from('personagens')
          .select('id, magias, tecnicas, habilidades, inventario')
          .eq('user_id', userId)
          .eq('id', pjAtivoId);
        if (!vivo) return;
        if (error) {
          setErro(error);
          setConhecido(CONHECIDO_VAZIO());
          return;
        }
        const pjs = data || [];
        const pjIds = pjs.map((p) => p.id);
        // Criaturas vêm das HISTÓRIAS de que os PJs participam, não dos PJs
        // (ver criaturasLiberadas). Sem PJ não há história, então nem
        // consulta: o conjunto é vazio por construção.
        let historias = [];
        if (pjIds.length) {
          const { data: hs, error: errH } = await supabaseClient
            .from('historias')
            .select('id, criatura_ids, lore_acesso_pj, protagonista_ids')
            .overlaps('protagonista_ids', pjIds);
          if (!vivo) return;
          // Falhar aqui não pode esvaziar o resto: as outras 4 categorias
          // já foram calculadas e não dependem de história nenhuma.
          if (errH) setErro(errH); else historias = hs || [];
        }
        setConhecido({
          ...conhecidoDoJogador(pjs),
          criaturas: criaturasLiberadas(historias, pjIds),
        });
      } catch (e) {
        if (!vivo) return;
        setErro(e);
        setConhecido(CONHECIDO_VAZIO());
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => { vivo = false; };
  }, [ativo]);

  return { carregando, conhecido, erro };
}

Object.assign(window, { conhecidoDoJogador, criaturasLiberadas, useConhecidoDoJogador });
