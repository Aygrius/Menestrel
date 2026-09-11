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

const CONHECIDO_VAZIO = () => ({ magias: new Map(), tecnicas: new Set(), habilidades: new Set(), itens: new Set() });

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
        const { data, error } = await supabaseClient
          .from('personagens')
          .select('id, magias, tecnicas, habilidades, inventario')
          .eq('user_id', userId);
        if (!vivo) return;
        if (error) {
          setErro(error);
          setConhecido(CONHECIDO_VAZIO());
        } else {
          setConhecido(conhecidoDoJogador(data || []));
        }
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

Object.assign(window, { conhecidoDoJogador, useConhecidoDoJogador });
