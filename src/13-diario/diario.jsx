/* ============================================================
   FASE 13 — DIÁRIO
   ============================================================
   O "caderno de descobertas" do PJ ativo, estilo Pokédex: o Mestre
   disponibiliza criaturas (bestiário) e lore (NPCs/reinos/cidades,
   catálogo novo desta fase) pra história; o Jogador "importa" pro
   diário do próprio PJ e pode escrever um comentário pessoal sobre
   cada entrada. Há também Memórias: registros de texto livre do PJ,
   sem vínculo com catálogo (diário pessoal de verdade).

   Exports:
   - DiarioView          — tela do Jogador (aba nova na ficha do PJ ativo,
                            11-ficha/ficha.jsx). 3 sub-abas internas:
                            Disponíveis / Minha Coleção / Memórias.
   - GerenciarLoreView   — PÁGINA do Mestre (chamada a partir do
                            HistoriaCard, 06-historias/historias.jsx, mesmo
                            molde de GerenciarLojaView/loja-mng-v3 — header
                            .ms-header com seta de voltar + corpo solto sem
                            moldura própria, não mais ModalShell). CRUD de
                            cópias-por-história em reinos/cidades/npcs
                            (catálogo GLOBAL, migration 014/015 — ver nota
                            abaixo) + checkboxes pra disponibilizar
                            criaturas/lore pra história (grava
                            historias.criatura_ids/reino_ids/cidade_ids/
                            npc_ids). Nas abas npc/reino/cidade a lista
                            agora MESCLA as CÓPIAS (CRUD completo, como
                            sempre) com o catálogo GLOBAL (migration 016 —
                            listar_catalogo_global passou a ser buscada
                            direto aqui): entradas globais aparecem com a
                            Fonte "Mundo", olho + lápis, SEM lixeira (o
                            lápis forka — 17/09/2026; excluir_lore_entrada
                            recusa apagar global) — mesmo padrão que a aba
                            Criatura já usava pra `criaturas`. Ver nota
                            "CATÁLOGO GLOBAL NA LISTA" abaixo. O form de
                            Novo/Editar item CONTINUA como ModalShell por
                            cima da página (decisão explícita, não
                            converter pra drawer).

   Depende de:
   - React (useState/useEffect/useMemo desestruturados, ver 01-core/helpers.jsx)
   - supabaseClient (01-core/supabase.jsx)
   - ModalShell (10-shell/shell.jsx) — usado no ComentarioModal/MemoriaModal/
     LoreEntradaForm (modais pequenos de formulário)
   - Tokens visuais "Pedra & Bronze": classes .fp-tab/.fp2-panel/.inv-divider/
     .best-toolbar/.best-chip/.best-empty já existentes no index.css —
     este arquivo só ADICIONA classes novas prefixadas .diario- pro grid
     de cards (pokedex), sem reinventar o que já existe.
   - ⚠️ DEPENDE do vocabulário de tabela que 09-bestiario/bestiario.jsx
     EXPÕE de propósito: useFitPageSize, useSort, SortHead, BestPagination,
     BestBuscaENovo. Carregue bestiario.jsx antes deste arquivo (main.tsx já
     faz; testes que renderizam DiarioView ou GerenciarLoreView precisam do
     import).

     Este comentário dizia o OPOSTO até 17/09/2026 — "não depende, usa grid
     de cards, não tabela paginada". Isso deixou de valer em duas etapas: o
     Diário do Jogador virou tabela em 12/09/2026 (e o bestiário passou a
     exportar os helpers justamente por isso), e a tela do Mestre
     (GerenciarLoreView) virou tabela em 17/09/2026. Ficou desatualizado no
     meio e mandou um teste renderizar a tela sem os helpers, que quebrou com
     "useSort is not defined".

     O que continua local aqui: DiarioLoading/DiarioErrorBox (prefixo
     diario- pra não colidir com BestLoading/BestErrorBox, que seguem
     privados do bestiário).

   ⚠️ MODELO DE DADOS (migration 014/015) — releia antes de mexer:
   reinos/cidades/npcs são um catálogo GLOBAL (tabelas próprias, slug
   como PK, SELECT aberto a todos — mesmo padrão de itens/criaturas/
   magias), não mais o lore_entradas genérico (tipo+atributos jsonb) que
   versões anteriores deste arquivo assumiam. Cada tabela tem duas
   categorias de linha: GLOBAL (historia_id NULL — o catálogo-mundo,
   visível e listável por qualquer Mestre via listar_catalogo_global, mas
   só editável fazendo fork) e CÓPIA (historia_id setado, baseado_em
   apontando pro original — criada via RPC criar_copia_*, slug gerado
   automaticamente <origem>-h<historia_id>). Mestre nunca edita o global
   direto; "editar" um global na UI dispara fork automático por baixo
   (salvar_lore_entrada decide isso sozinha, comparando o p_id contra
   historia_id NULL/setado — ver a RPC). É por isso que o lápis vale também
   nas linhas "Mundo" da tabela desde 17/09/2026: editar um global e salvar
   devolve uma cópia da mesa. 3 seeds
   vazios (novo-reino/nova-cidade/novo-npc, globais) servem de base
   padrão quando o Mestre clica "Novo" sem escolher uma entrada do
   catálogo como ponto de partida.
   lore_entradas (tabela antiga, por-história, tipo+atributos jsonb)
   continua existindo em paralelo — é o catálogo de QUEM o Diário do
   Jogador pode importar quando o Mestre quer compor lore sem usar o
   catálogo global. Este arquivo não cria/edita lore_entradas (decisão
   confirmada com o usuário); só reinos/cidades/npcs.

   ⚠️ CATÁLOGO GLOBAL NA LISTA (migration 016, ver
   016_catalogo_global_atributos_e_limpeza.sql) — releia antes de mexer:
   "mostrar o catálogo global direto em GerenciarLoreView" tinha ficado
   explicitamente "a definir" numa rodada anterior. Migration 016 fechou isso:
   carregar() agora busca listar_catalogo_global nos 3 tipos (reino/
   cidade/npc) em paralelo com listar_lore_historia, guarda em
   catalogoGlobal (state novo, { reino:[], cidade:[], npc:[] }), e a
   renderização das abas não-criatura mescla catalogoGlobal[tipoAba] com
   loreDoTipo numa lista só — globais entram com `_global:true` (marcador
   client-side, filtrado em DetalheEntradaModal.JA_EXIBIDOS pra não
   vazar como atributo visível), tag "Mundo", checkbox + ver; cópias
   continuam com checkbox + ver + editar + excluir, sem mudança de
   comportamento. `toggleDisponibilizar` NÃO mudou — já era genérico o
   bastante pra ligar/desligar qualquer slug em reino_ids/cidade_ids/
   npc_ids, seja de cópia ou global. `reinosDaHistoria`/`cidadesDaHistoria`
   (opções de <select> em LoreEntradaForm) continuam filtrando só `lore`
   (só cópias) — decisão à parte, já confirmada antes, não misturar com
   isto. O prop `lore` passado a DetalheEntradaModal agora é a união de
   `lore` + os 3 arrays de catalogoGlobal (só pra resolução de nome de
   slug em campos tipo origem/cidade/reino — loreBySlug —, não afeta
   nada além de exibição).

   Migration 016 TAMBÉM: (a) faz listar_catalogo_global devolver
   `atributos` por tipo (antes só id/nome/descricao/imagem_url) — efeito
   colateral bom, o fork de um global passa a herdar os campos certos, o que
   antes sempre resultava em atributos:{}; (b)
   dropa 3 assinaturas ANTIGAS (bigint) de excluir_lore_entrada/
   importar_diario/salvar_lore_entrada que ficaram órfãs da 014/015
   (CREATE OR REPLACE não substitui função quando o tipo de parâmetro
   muda — vira overload novo, não substituição) — confirmado em produção
   via pg_proc/pg_get_function_identity_arguments antes deste patch: as
   3 tinham duas assinaturas cada, risco real de erro de ambiguidade
   ("PGRST203 — Could not choose the best candidate function") no
   PostgREST. RODAR A 016 é pré-requisito pra este arquivo funcionar sem
   esse risco — sem ela, listar_catalogo_global ainda responde (só sem
   atributos) mas a ambiguidade de overload nas outras 3 RPCs continua.

   RPCs consumidas (Supabase, SECURITY DEFINER, retorno jsonb {ok, motivo?}
   — migration 015 aplicada; migration 016 acima AINDA PRECISA RODAR):
   - listar_diario_disponivel(p_personagem_id)
       → resolve a história do PJ internamente (protagonista_ids @> [pj_id]),
         retorna { ok, criaturas: [...], lore: [...], colecao: [...], memorias: [...] }
   - importar_diario(p_personagem_id, p_tipo, p_ref_id)
       → p_ref_id é text agora (slug pra npc/reino/cidade; id::text pra criatura)
   - salvar_comentario_diario(p_diario_entrada_id, p_comentario)
   - salvar_memoria_diario(p_id?, p_personagem_id, p_titulo, p_conteudo)
   - excluir_entrada_diario(p_id)
   - listar_lore_historia(p_historia_id)              — Mestre, só CÓPIAS da história
   - listar_catalogo_global(p_tipo)                   — Mestre, catálogo GLOBAL;
                          usada em carregar() pra listar a tela principal;
                          devolve atributos por tipo desde a 016
   - salvar_lore_entrada(p_id?, p_historia_id, p_tipo, p_nome, p_descricao,
                          p_imagem_url, p_atributos, p_slug_origem?) — Mestre;
                          ramifica internamente: cria fork (p_id null, usa
                          p_slug_origem — que NENHUMA tela passa desde
                          17/09/2026 — ou o seed vazio do tipo), edita
                          direto (p_id já é cópia minha), ou fork automático
                          (p_id é um global — Mestre não percebe a diferença)
   - excluir_lore_entrada(p_id)                       — Mestre, bloqueia exclusão de global
   - definir_arte_lore(p_tipo, p_id, p_imagem_url)    — Mestre/criatura; substitui
                          o UPDATE direto que ArteModal fazia antes (não
                          funciona contra reinos/cidades/npcs, só RPC escreve)

   Consumido por:
   - 11-ficha/ficha.jsx — nova aba 'diario' na navbar fp-tabs
     (entre Loja e Editar), <DiarioView pj={pj} lang={lang} key={pjAtivoId} />
   - 06-historias/historias.jsx — botão "Lore" no HistoriaCard (entre
     Convites e Loja, ícone de livro), abre a PÁGINA
     <GerenciarLoreView historia={h} lang={lang} onClose={...} onChanged={refetch} />
     a partir do state gerenciandoLore em HistoriasList — mesmo padrão de
     lojaAberta/GerenciarLojaView (substitui a lista inteira, não é mais
     modal). O comentário anterior sobre ModalShell/padronização de modais
     não se aplica mais a esta view específica: GerenciarLoreView migrou
     pra página, igual GerenciarLojaView migrou antes dela.

   ⚠️ MIGRATION 017 — liberar lore por PJ (nova feature):
   A feature "Liberar para personagem" grava em historias.lore_acesso_pj (jsonb).
   A coluna precisa ser criada se não existir:

     ALTER TABLE historias ADD COLUMN IF NOT EXISTS lore_acesso_pj jsonb DEFAULT '{}'::jsonb;

   Formato: { "tipo:ref_id": [pj_id_1, pj_id_2, ...] }
   Ex: { "npc:arissia-h3": [42, 87], "criatura:15": [42] }

   A RPC listar_diario_disponivel precisa filtrar pelo lore_acesso_pj:
   para cada entrada de lore disponibilizada (npc_ids/reino_ids/cidade_ids/
   criatura_ids), SÓ incluir no resultado se a chave "tipo:ref_id" NÃO existir
   em lore_acesso_pj (= disponível pra todos) OU existir e o p_personagem_id
   estar na lista (= acesso individual). Quando a lista é vazia/nula, todos veem.
   Se a lista tem elementos, só quem está nela vê — quem não está não enxerga
   nem importa a entrada.

   O UPDATE em lore_acesso_pj é feito diretamente em historias pelo cliente
   (mesmo padrão dos campos *_ids) — se RLS bloquear, o erro aparece na tela.
   Uma RPC SECURITY DEFINER (liberar_lore_pj) pode ser criada pra contornar RLS
   no futuro, seguindo o padrão das outras RPCs de gravar em historias.

   Carregar em src/main.tsx depois de 12-batalha (última fase) e antes
   de data/bridge — ver patch em main.tsx.
   ============================================================ */

// ---------- Constantes ----------

/* As abas Item e Treinamento saíram do Lore em 14/09/2026: "a regra é que os
   personagens vão acessar apenas aquilo que eles possuem ou viram na loja, no
   menu lateral esquerdo." O Mestre não libera mais item, magia, habilidade nem
   técnica pelo Lore — o jogador vê isso nas páginas Itens, Magias etc., pelo
   que o personagem tem. As colunas historias.item_ids/magia_ids/… ficam no
   banco, sem tela que as escreva. */
const DIARIO_TIPOS = ['criatura', 'npc', 'lugar'];
// Tipos reais que compõem a aba "Lugares"
const LUGAR_TIPOS = new Set(['reino', 'cidade']);
// Tipos reais que compõem a aba "Treinamento"
const TREINAMENTO_TIPOS = new Set(['magia', 'habilidade', 'tecnica']);

// Tabela do banco correspondente a cada tipo real
const TIPO_TABELA  = { item: 'itens', magia: 'magias', habilidade: 'habilidades', tecnica: 'tecnicas' };
const SUBTAB_TIPO  = { itens: 'item', magias: 'magia', habilidades: 'habilidade', tecnicas: 'tecnica' };

const DIARIO_TIPO_ICON = {
  criatura:    'ti-paw',
  npc:         'ti-user',
  lugar:       'ti-map-pin',
  reino:       'ti-flag',
  cidade:      'ti-building-castle',
  memoria:     'ti-feather',
  item:        'ti-backpack',
  treinamento: 'ti-sword',
  magia:       'ti-sparkles',
  habilidade:  'ti-bolt',
  tecnica:     'ti-swords',
  personagem:  'ti-users',
};

const DIARIO_TIPO_LABEL = {
  pt: { criatura: 'Criatura', npc: 'NPC', lugar: 'Lugar', reino: 'Reino', cidade: 'Cidade',
        memoria: 'Memória', item: 'Item', treinamento: 'Treinamento',
        magia: 'Magia', habilidade: 'Habilidade', tecnica: 'Técnica', personagem: 'Personagem' },
  en: { criatura: 'Creature', npc: 'NPC', lugar: 'Place', reino: 'Kingdom', cidade: 'City',
        memoria: 'Memory', item: 'Item', treinamento: 'Training',
        magia: 'Spell', habilidade: 'Ability', tecnica: 'Technique', personagem: 'Character' },
};

// "Novo"/"Nova" concorda com o tipo: era "Novo Cidade" (corrigido em 14/09/2026).
const DIARIO_TIPOS_FEMININOS = new Set(['cidade', 'memoria', 'criatura', 'magia', 'habilidade', 'tecnica']);
function novoDoTipo(tipo) {
  return DIARIO_TIPOS_FEMININOS.has(tipo) ? 'Nova' : 'Novo';
}

function diarioTipoLabel(tipo, lang) {
  const l = lang === 'en' ? 'en' : 'pt';
  return DIARIO_TIPO_LABEL[l][tipo] || tipo;
}

/* ---------- VISIBILIDADE DE UMA ENTRADA (17/09/2026) ----------------------
   "Do lado do botão de editar (lápis), vamos adicionar um botão de ver (olho),
   onde teremos um modal para permitir quem pode ver aquela entrada, na
   história selecionada." (usuário)

   "Quem vê" estava em DUAS colunas que ninguém olhava juntas:

     historias.<tipo>_ids     — disponibilizada pra história? (era o checkbox
                                da linha, que saiu junto com esta mudança)
     historias.lore_acesso_pj — { "tipo:ref_id": [pj_id...] }, a liberação
                                individual, que morava dentro da ficha da
                                entrada, no bloco "Liberar para"

   E a regra que as liga é ASSIMÉTRICA — chave ausente ou lista vazia quer
   dizer "todos os protagonistas veem", não "ninguém vê". É o que
   listar_diario_disponivel faz no banco (migration 017). Então o estado real
   é UM DE TRÊS, não duas caixas independentes:

     ninguem — id fora de <tipo>_ids. Quem não está disponibilizado não é
               visto por PJ nenhum, dê no que der o acesso_pj.
     todos   — id dentro, nenhum PJ listado.
     alguns  — id dentro, e a lista tem gente.

   Estas duas funções são o ÚNICO lugar que conhece a assimetria: o modal
   escolhe um dos três nomes, elas traduzem para as colunas. E `ninguem`
   LIMPA a chave do acesso_pj de propósito — sem isso, um "só a Thalia vê"
   desligado e religado meses depois voltaria com a Thalia marcada, e o Mestre
   não teria como saber por quê.

   Cobertura: visibilidade-entrada.test.js. */
const VIS_CAMPO = {
  criatura: 'criatura_ids',
  reino:    'reino_ids',
  cidade:   'cidade_ids',
  npc:      'npc_ids',
};

function chaveAcessoPj(tipo, refId) {
  return `${tipo}:${String(refId)}`;
}

/* Comparação por TEXTO porque criatura_ids é bigint[] (números) e as outras
   três são text[] (slugs) — o mesmo código serve às quatro. Onde o valor é
   GRAVADO, o original é preservado: ver patchDeVisibilidade. */
function visibilidadeDaEntrada(historia, tipo, refId) {
  const campo = VIS_CAMPO[tipo];
  const ids = (historia && campo && historia[campo]) || [];
  const disponivel = ids.some((x) => String(x) === String(refId));
  if (!disponivel) return { modo: 'ninguem', pjIds: [] };
  const acesso = (historia && historia.lore_acesso_pj) || {};
  const lista = acesso[chaveAcessoPj(tipo, refId)];
  const pjIds = Array.isArray(lista) ? lista : [];
  return { modo: pjIds.length > 0 ? 'alguns' : 'todos', pjIds };
}

/* Devolve só as colunas que MUDAM, para um único UPDATE. A versão anterior
   fazia um update por clique de checkbox — marcar três PJs eram quatro
   idas ao banco (uma do disponibilizar, três do liberar), cada uma podendo
   falhar no meio e deixar o estado pela metade. */
function patchDeVisibilidade(historia, tipo, refId, modo, pjIds) {
  const campo = VIS_CAMPO[tipo];
  if (!campo) throw new Error(`patchDeVisibilidade: tipo sem coluna de visibilidade: ${tipo}`);
  if (modo !== 'ninguem' && modo !== 'todos' && modo !== 'alguns') {
    throw new Error(`patchDeVisibilidade: modo desconhecido: ${modo}`);
  }
  const idsAtuais = (historia && historia[campo]) || [];
  const acessoAtual = (historia && historia.lore_acesso_pj && typeof historia.lore_acesso_pj === 'object')
    ? historia.lore_acesso_pj : {};
  const chave = chaveAcessoPj(tipo, refId);
  const acesso = { ...acessoAtual };

  if (modo === 'ninguem') {
    delete acesso[chave];
    return {
      [campo]: idsAtuais.filter((x) => String(x) !== String(refId)),
      lore_acesso_pj: acesso,
    };
  }

  // Disponibiliza sem duplicar, preservando o valor original dos que já estão
  // (não converter bigint pra texto na volta).
  const ids = idsAtuais.some((x) => String(x) === String(refId))
    ? [...idsAtuais]
    : [...idsAtuais, refId];

  /* "alguns" com lista vazia É "todos" — a coluna não sabe representar
     "disponibilizado para ninguém em particular". Deixar a chave com []
     gravado seria escrever um estado que o banco lê como "todos" de
     qualquer forma, com a aparência de outra coisa na tela. */
  const lista = Array.isArray(pjIds) ? pjIds : [];
  if (modo === 'alguns' && lista.length > 0) acesso[chave] = [...lista];
  else delete acesso[chave];

  return { [campo]: ids, lore_acesso_pj: acesso };
}

// ---------- Helpers de dados ----------

/* Normaliza o retorno de listar_diario_disponivel num único array de
   "fichas" prontas pra render, já cruzando com o que foi importado. */
function montarCatalogoDisponivel(resp) {
  if (!resp) return [];
  const importadosSet = new Set((resp.importados || []).map((r) => `${r.tipo}:${r.ref_id}`));
  const criaturas = (resp.criaturas || []).map((c) => ({
    // Preserva todos os campos vindos do banco (grupo, atributos, nível, etc.)
    // e sobrescreve os normalizados para o formato de entrada do diário.
    ...c,
    tipo: 'criatura', ref_id: c.id, nome: c.nome, subtitulo: c.tipo,
    descricao: c.descricao, imagem_url: c.imagem_url || null,
    jaImportado: importadosSet.has(`criatura:${String(c.id)}`),
  }));
  // Para npc/reino/cidade o identificador é o slug (text PK).
  // A RPC pode devolver no campo 'id' (quando slug é a PK) ou 'slug' separado.
  // Usamos slug ?? id para cobrir os dois casos e garantir que ref_id bate
  // com o que importar_diario espera (p_ref_id text).
  const lore = (resp.lore || []).map((e) => {
    const refId = e.slug != null ? e.slug : e.id;
    return {
      tipo: e.tipo, ref_id: refId, nome: e.nome, subtitulo: diarioTipoLabel(e.tipo, 'pt'),
      descricao: e.descricao, imagem_url: e.imagem_url || null,
      // atributos DEVE ser preservado: o modal de detalhe lê attrs?.rumores,
      // attrs?.governo, attrs?.cultura etc. — sem ele as abas ficam vazias.
      atributos: e.atributos ?? null,
      jaImportado: importadosSet.has(`${e.tipo}:${String(refId)}`),
    };
  });
  return [...criaturas, ...lore];
}

// ---------- Loading / erro (versões locais — ver nota "Depende de" no topo) ----------

function DiarioLoading({ lang }) {
  return <Carregando lang={lang} />;
}

function DiarioErrorBox({ error, hint }) {
  return (
    <div className="diario-error-box">
      <div className="diario-error-title">{error}</div>
      <div className="diario-error-hint">{hint}</div>
    </div>
  );
}

// ---------- DiarioCard: célula pequena (50×50, igual Inventário/Loja) ----------
// O card mostra só o ícone do tipo da entrada — nome via tooltip (onTipHover/
// onTipLeave, mesmo padrão PortalTooltip usado no InvItemsTable). Os botões
// de Importar/Anotar/Excluir saíram do card e foram para o DetalheEntradaModal,
// que abre ao clicar (onClick). onArte continua disponível pro Mestre, mas
// sem botão próprio no card — é acionado a partir do modal.

function DiarioCard({ entrada, lang, onClick, onTipHover, onTipLeave }) {
  return (
    <button
      type="button"
      className="diario-card"
      onClick={onClick}
      onMouseEnter={onTipHover ? (e) => onTipHover(e, { title: entrada.nome }) : undefined}
      onMouseLeave={onTipLeave || undefined}
      aria-label={entrada.nome}
    >
      <span className="diario-card-ic">
        <i className={'ti ' + (DIARIO_TIPO_ICON[entrada.tipo] || 'ti-help')} aria-hidden="true" />
      </span>
    </button>
  );
}

// ---------- DiarioModalNome: título dos modais de detalhe — thumb + ícone + nome ----------
// Passado como React node no prop title={} do ModalShell.
// O ms-title agora tem display:flex (patch em index.css), então os filhos
// alinham horizontalmente: img-thumb (se houver) → ícone de tipo → nome truncado.
// nomeOverride: permite substituir entrada.nome por uma string montada (ex: criatura c/ estágio).
function DiarioModalNome({ entrada, nomeOverride }) {
  const nome = nomeOverride || entrada.nome;
  return (
    <>
      {entrada.imagem_url && (
        <img
          src={entrada.imagem_url}
          alt=""
          aria-hidden="true"
          style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0,
                   border: '1px solid rgba(201,164,78,0.22)', display: 'block' }}
        />
      )}
      <i
        className={'ti ' + (DIARIO_TIPO_ICON[entrada.tipo] || 'ti-help')}
        aria-hidden="true"
        style={{ flexShrink: 0, fontSize: 16, color: 'var(--gold)' }}
      />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
        {nome}
      </span>
    </>
  );
}

// ---------- ComentarioModal ----------

function ComentarioModal({ entrada, lang, onClose, onSaved }) {
  const en = lang === 'en';
  const [texto, setTexto] = useState(entrada.comentario || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const salvar = async () => {
    setSaving(true); setError(null);
    const { data, error: err } = await supabaseClient.rpc('salvar_comentario_diario', {
      p_diario_entrada_id: entrada.diario_entrada_id,
      p_comentario: texto,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    if (data && data.ok === false) { setError(data.motivo || 'erro'); return; }
    onSaved({ ...entrada, comentario: texto });
  };

  return (
    <ModalShell
      title={en ? `Notes — ${entrada.nome}` : `Anotações — ${entrada.nome}`}
      lang={lang}
      onClose={onClose}
      onCancel={onClose}
      cancelLabel={en ? 'Cancel' : 'Cancelar'}
      onConfirm={salvar}
      confirmLabel={saving ? (en ? 'Saving…' : 'Salvando…') : (en ? 'Save' : 'Salvar')}
      confirmDisabled={saving}
    >
      <p className="diario-modal-desc">
        {en
          ? 'A personal note only you can see — your character\'s impressions, theories, or memories about this entry.'
          : 'Uma anotação pessoal só sua — impressões, teorias ou lembranças do seu personagem sobre esta entrada.'}
      </p>
      <textarea
        className="diario-textarea"
        rows={6}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={en ? 'Write your notes…' : 'Escreva suas anotações…'}
        autoFocus
      />
      {error && <div className="err-msg diario-err-mt">{error}</div>}
    </ModalShell>
  );
}

// ---------- CriaturaFicha: layout rico de bestiário (usado em DetalheEntradaModal) ----------
// Exibe todos os campos de uma criatura com hierarquia visual: descrição → atributos
// → energia/mobilidade → combate. Campos desconhecidos vão num bloco extra no fim
// (future-proof: novos campos no DB aparecem automaticamente).
function CriaturaFicha({ entrada, lang, onEditNote, hideDescricao }) {
  const en = lang === 'en';

  // Resolve campo: tenta no nível raiz; cai no JSONB atributos se presente.
  const get = (k) => {
    const v = entrada[k];
    if (v !== null && v !== undefined && v !== '') return v;
    const a = entrada.atributos;
    if (a && typeof a === 'object') {
      const av = a[k];
      if (av !== null && av !== undefined && av !== '') return av;
    }
    return null;
  };
  const fmt = (k) => { const v = get(k); return v !== null ? String(v) : '—'; };

  const ATRIBUTOS = [
    { key: 'aura',      label: en ? 'Aura'       : 'Aura'       },
    { key: 'forca',     label: en ? 'Strength'   : 'Força'      },
    { key: 'fisico',    label: en ? 'Physique'   : 'Físico'     },
    { key: 'carisma',   label: en ? 'Charisma'   : 'Carisma'    },
    { key: 'agilidade', label: en ? 'Agility'    : 'Agilidade'  },
    { key: 'intelecto', label: en ? 'Intellect'  : 'Intelecto'  },
    { key: 'percepcao', label: en ? 'Perception' : 'Percepção'  },
  ];

  const THRESH = [
    { pct: '25%',  key: 'dano_25',  bg: '#B8472F',                 w: '25%'  },
    { pct: '50%',  key: 'dano_50',  bg: '#B8702E',                 w: '50%'  },
    { pct: '75%',  key: 'dano_75',  bg: '#C9A44E',                 w: '75%'  },
    { pct: '100%', key: 'dano_100', bg: 'rgba(232,221,198,0.35)',   w: '100%' },
  ];

  // Codificação de cor dos orbs de atributo
  const orbStyle = (k) => {
    const n = Number(get(k));
    if (isNaN(n) || get(k) === null) return { bg: 'rgba(232,221,198,0.03)', border: 'rgba(232,221,198,0.08)', color: '#7A5E2A' };
    if (n < 0) return { bg: 'rgba(184,70,47,0.14)', border: 'rgba(184,70,47,0.35)', color: '#F0A6A0' };
    if (n === 0) return { bg: 'rgba(201,164,78,0.05)', border: 'rgba(201,164,78,0.15)', color: '#9C8F73' };
    return { bg: 'rgba(201,164,78,0.10)', border: 'rgba(201,164,78,0.30)', color: '#C9A44E' };
  };

  // Campos mapeados explicitamente (não duplicar no bloco extras)
  const MAPEADOS = new Set([
    'aura', 'forca', 'fisico', 'carisma', 'agilidade', 'intelecto', 'percepcao',
    'energia_fisica', 'energia_heroica', 'velocidade', 'defesa', 'armadura', 'absorcao', 'peso', 'estagio',
    'ataque', 'dano_l', 'dano_m', 'dano_p', 'dano_25', 'dano_50', 'dano_75', 'dano_100',
    'subtipo', 'elemento', 'grupo', 'plano', 'coletivo', 'magia', 'magia_n', 'tecnicas_especiais', 'habilidades',
    'tipo', 'ref_id', 'id', 'nome', 'subtitulo', 'descricao', 'imagem_url',
    'comentario', 'jaImportado', 'diario_entrada_id', 'personagem_id',
    'criatura_id', 'created_at', 'updated_at', 'atributos',
    'importado_em',  // timestamp de importação (diario_entradas)
  ]);
  const extras = Object.entries(entrada).filter(
    ([k, v]) => !MAPEADOS.has(k) && v !== null && v !== undefined && v !== '' && typeof v !== 'object'
  );

  const hasCombate  = get('ataque') || get('dano_l') !== null || get('dano_m') !== null || get('dano_p') !== null || THRESH.some(({ key }) => get(key) !== null);
  const hasDanoLMP  = ['dano_l', 'dano_m', 'dano_p'].some((k) => get(k) !== null);
  const hasThresh   = THRESH.some(({ key }) => get(key) !== null);

  return (
    <div className="cficha">

      {/* Imagem */}
      {entrada.imagem_url && (
        <div className="cficha-art">
          <img src={entrada.imagem_url} alt={entrada.nome} />
        </div>
      )}

      {/* Descrição — acima dos atributos; oculta na aba Ficha (hideDescricao=true) */}
      {!hideDescricao && entrada.descricao && (
        <>
          <p className="cficha-desc">{entrada.descricao}</p>
        </>
      )}

      {/* META: plano + elemento + coletivo — mesmo padrão diario-det-attr do NPC.
          `elemento` entrou em 18/09/2026 com a coluna nova; sem esta linha ele
          cairia no bloco de "extras", que só sabe imprimir a chave crua
          ("elemento") em vez de um rótulo traduzido. */}
      {(get('plano') || get('elemento') || get('coletivo')) && (
        <div className="diario-det-attrs" style={{ marginBottom: 14 }}>
          {get('plano') && (
            <div className="diario-det-attr">
              <span className="diario-det-attr-k">{en ? 'Plane' : 'Plano'}</span>
              <span className="diario-det-attr-v">{fmt('plano')}</span>
            </div>
          )}
          {get('elemento') && (
            <div className="diario-det-attr">
              <span className="diario-det-attr-k">{en ? 'Element' : 'Elemento'}</span>
              <span className="diario-det-attr-v">{fmt('elemento')}</span>
            </div>
          )}
          {get('coletivo') && (
            <div className="diario-det-attr">
              <span className="diario-det-attr-k">{en ? 'Group' : 'Coletivo'}</span>
              <span className="diario-det-attr-v">{fmt('coletivo')}</span>
            </div>
          )}
        </div>
      )}

      {/* ATRIBUTOS — mesmo padrão diario-det-attr do NPC */}
      <div className="diario-det-attrs" style={{ gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 14 }}>
        {ATRIBUTOS.map(({ key, label }) => (
          <div key={key} className="diario-det-attr">
            <span className="diario-det-attr-k">{label}</span>
            <span className="diario-det-attr-v">{fmt(key)}</span>
          </div>
        ))}
      </div>

      {/* ENERGIA & MOBILIDADE */}
      {/* STATS — 6 itens em linha única: energias + velocidade + defesa(+armadura) + peso */}
      <div className="cficha-stat-grid">
        {/* Energias — sem prefixo, sem barra */}
        {[
          { key: 'energia_fisica',  label: 'Energ. Física'  },
          { key: 'energia_heroica', label: 'Energ. Heroica' },
          { key: 'absorcao',        label: 'Absorção'        },
          { key: 'velocidade',      label: 'Velocidade'      },
        ].map(({ key, label }) => (
          <div key={key} className="cficha-stat cficha-stat--energy">
            <div className="cficha-stat-val">{fmt(key)}</div>
            <div className="cficha-stat-lbl">{label}</div>
          </div>
        ))}
        {/* Defesa + Armadura fundidos → "L2" */}
        <div className="cficha-stat cficha-stat--energy">
          <div className="cficha-stat-val">
            {[get('armadura'), get('defesa')].filter((v) => v !== null).map(String).join('') || '—'}
          </div>
          <div className="cficha-stat-lbl">Defesa</div>
        </div>
        {/* Peso */}
        <div className="cficha-stat cficha-stat--energy">
          <div className="cficha-stat-val">{fmt('peso')}</div>
          <div className="cficha-stat-lbl">Peso</div>
        </div>
      </div>

      {/* COMBATE */}
      {hasCombate && (
        <>
          {/* Tipo de ataque + dano L/M/P na mesma linha */}
          {(get('ataque') || hasDanoLMP) && (
            <div className="cficha-combate-row">
              {get('ataque') && (
                <div className="cficha-ataque">
                  <i className="ti ti-sword cficha-ataque-icon" aria-hidden="true" />
                  <div className="cficha-ataque-val">{fmt('ataque')}</div>
                </div>
              )}

              {hasDanoLMP && (
                <div className="cficha-dano-row">
                  {[
                    { key: 'dano_l', label: 'L', cls: 'cficha-dano--l' },
                    { key: 'dano_m', label: 'M', cls: 'cficha-dano--m' },
                    { key: 'dano_p', label: 'P', cls: 'cficha-dano--p' },
                  ].filter(({ key }) => get(key) !== null).map(({ key, label, cls }) => (
                    <div key={key} className={'cficha-dano ' + cls}>
                      <div className="cficha-dano-val">{label}{fmt(key)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {hasThresh && (
            <div className="cficha-thresh">
              <div className="cficha-thresh-grid">
                {THRESH.filter(({ key }) => get(key) !== null).map(({ pct, key, bg, w }) => (
                  <div key={key} className="cficha-thresh-item">
                    <div className="cficha-thresh-row">
                      <span className="cficha-thresh-pct">{pct}</span>
                      <span className="cficha-thresh-num">{fmt(key)}</span>
                    </div>
                    <div className="cficha-thresh-bar">
                      <div className="cficha-thresh-fill" style={{ width: w, background: bg }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Campos extras não mapeados (future-proof: novos campos do DB aparecem aqui) */}
      {extras.length > 0 && (
        <>
          <div className="cficha-extras">
            {extras.map(([k, v]) => (
              <div key={k} className="cficha-extra-row">
                <span className="cficha-extra-k">{k.replace(/_/g, ' ')}</span>
                <span className="cficha-extra-v">{String(v)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* TÉCNICAS ESPECIAIS */}
      {get('tecnicas_especiais') && (
        <div className="cficha-abilities">
          <div className="cficha-abilities-head">
            <i className="ti ti-bolt cficha-abilities-icon" aria-hidden="true" />
            <span className="cficha-abilities-lbl">{en ? 'Special Techniques' : 'Técnicas Especiais'}</span>
          </div>
          <div className="cficha-pill-list">
            {fmt('tecnicas_especiais').split(',').map((t) => (
              <span key={t} className="cficha-pill cficha-pill--tech">{t.trim()}</span>
            ))}
          </div>
        </div>
      )}

      {/* MAGIAS */}
      {get('magia') && (
        <div className="cficha-abilities">
          <div className="cficha-abilities-head">
            <i className="ti ti-sparkles cficha-abilities-icon" aria-hidden="true" />
            <span className="cficha-abilities-lbl">{en ? 'Spells' : 'Magias'}</span>
            {/* Nível das magias = estágio da criatura (13/09/2026), o mesmo
                que a batalha usa — não mais `magia_n`. */}
            {get('estagio') !== null && typeof nivelMagiaDeCriatura === 'function' && (
              <span className="cficha-badge cficha-badge--magia-n">{nivelMagiaDeCriatura(get('estagio'))}</span>
            )}
          </div>
          <div className="cficha-pill-list">
            {fmt('magia').split(',').map((m) => (
              <span key={m} className="cficha-pill cficha-pill--magia">{m.trim()}</span>
            ))}
          </div>
        </div>
      )}

      {/* HABILIDADES */}
      {get('habilidades') && (
        <div className="cficha-abilities">
          <div className="cficha-abilities-head">
            <i className="ti ti-star cficha-abilities-icon" aria-hidden="true" />
            <span className="cficha-abilities-lbl">{en ? 'Abilities' : 'Habilidades'}</span>
          </div>
          <div className="cficha-pill-list">
            {fmt('habilidades').split(',').map((h) => (
              <span key={h} className="cficha-pill cficha-pill--hab">{h.trim()}</span>
            ))}
          </div>
        </div>
      )}

      {/* Anotação do jogador */}
      {entrada.comentario && (
        <>
          <div className="cficha-nota">
            <p className="cficha-nota-texto">{entrada.comentario}</p>
          </div>
        </>
      )}

    </div>
  );
}

/* ---------- DetalheMoldura — modal OU linha expandida ---------------------
   A mesma ficha serve dois lugares desde 17/09/2026: o modal que o Jogador
   abre no Diário, e a EXPANSÃO DA LINHA nas tabelas do Mestre ("as
   informações dentro de NPCs e lugares vão ser mostradas quando expandir a
   entrada" — usuário).

   Só a moldura muda; o corpo, que ramifica em quatro layouts por tipo
   (criatura, npc, reino, cidade) e passa de 500 linhas, é o mesmo. Fatiá-lo
   em componentes por tipo seria a refatoração maior — e, para este pedido,
   sem ganho: o que a linha expandida precisa é exatamente o que o modal
   mostra, menos o modal.

   ⚠️ Componente de MÓDULO, não uma função criada dentro do
   DetalheEntradaModal. Criada lá dentro, a identidade mudaria a cada render e
   o React desmontaria e remontaria a ficha inteira — as abas (Descrição /
   Rumores / Ficha) voltariam à primeira a cada tecla digitada em qualquer
   lugar da tela acima. */
function DetalheMoldura({ inline, title, lang, onClose, children }) {
  if (inline) return <div className="diario-det-inline">{children}</div>;
  return (
    <ModalShell title={title} lang={lang} size="lg" onClose={onClose}>
      {children}
    </ModalShell>
  );
}

// ---------- DetalheEntradaModal: ficha completa da entrada (criatura/lore) ----------
// Para criaturas → delega a CriaturaFicha (layout rico de bestiário).
// Para NPCs/reinos/cidades → layout genérico com grade de atributos.
// As ações (Importar / Anotar / Excluir) que antes viviam no DiarioCard agora
// moram aqui, num bloco único reaproveitado pelos dois ramos (criatura e
// genérico) — mesmo padrão visual de .det-actions/.det-act-row usado no
// DetalhesItemModal do inventário.
function DetalheEntradaModal({
  entrada, lang, onClose, onEditNote,
  onImport, importLabel, importIcon, importDisabled,
  onDelete, deleteLabel, onArte,
  lore,
  /* `inline` (17/09/2026): sem o modal em volta, pra caber na linha expandida
     da tabela. Ver DetalheMoldura acima. Sem título e sem X — quem abre a
     linha a fecha clicando nela de novo, e o nome já está na primeira
     coluna. */
  inline,
  /* SAÍRAM em 17/09/2026: `protagonistas`, `loreAcessoPj`, `onToggleLiberarPj`
     e `savingVinculo`, com o bloco "Liberar para" que elas alimentavam.

     Aquele bloco era METADE da resposta a "quem vê esta entrada" — a lista de
     PJs liberados, escondida no fim da ficha —, e a outra metade era o
     checkbox de disponibilizar, na linha da lista. As duas viraram um lugar
     só: o PermissaoEntradaModal, que o botão de olho abre. Ficha é ficha;
     permissão é permissão.

     Quem procurar a liberação por PJ aqui: ela está em
     patchDeVisibilidade/visibilidadeDaEntrada (topo deste arquivo), que é o
     único lugar que sabe traduzir os três estados para as duas colunas. */
}) {
  const en = lang === 'en';
  const loreBySlug = React.useMemo(() => {
    const m = {};
    if (Array.isArray(lore)) lore.forEach((e) => { if (e.id) m[e.id] = e.nome; });
    return m;
  }, [lore]);

  // Estados de abas — ANTES de qualquer return condicional (Rules of Hooks).
  // abaModal: criatura (ficha/descricao) e NPC (ficha/descricao/rumores).
  // abaReino / abaCidade: seus respectivos modais com 5 abas cada.
  const [abaModal, setAbaModal] = useState('descricao');
  const [abaReino, setAbaReino] = useState('descricao');
  const [abaCidade, setAbaCidade] = useState('descricao');

  const acoes = (onImport || onEditNote || onDelete || onArte) && (
    <div className="det-actions">
      <div className="det-act-row">
        {onImport && (
          <button
            type="button"
            className="det-act det-act-primary"
            onClick={() => { if (!importDisabled) onImport(); }}
            disabled={importDisabled}
          >
            <i className={'ti ' + (importIcon || 'ti-download')} aria-hidden="true" />
            <span className="det-act-lbl">{importLabel || (en ? 'Import' : 'Importar')}</span>
          </button>
        )}
        {onEditNote && (
          <button type="button" className="det-act" onClick={onEditNote}>
            <i className="ti ti-edit" aria-hidden="true" />
            <span className="det-act-lbl">{entrada.comentario ? (en ? 'Edit note' : 'Editar anotação') : (en ? 'Add note' : 'Anotar')}</span>
          </button>
        )}
        {onArte && (
          <button type="button" className="det-act" onClick={onArte}>
            <i className="ti ti-photo" aria-hidden="true" />
            <span className="det-act-lbl">{en ? 'Set artwork' : 'Definir arte'}</span>
          </button>
        )}
        {onDelete && (
          <button type="button" className="det-act danger" onClick={onDelete}>
            <i className="ti ti-trash" aria-hidden="true" />
            <span className="det-act-lbl">{deleteLabel || (en ? 'Remove from collection' : 'Remover da coleção')}</span>
          </button>
        )}
      </div>
    </div>
  );

  // Criaturas: layout rico de bestiário
  if (entrada.tipo === 'criatura') {
    const _est = entrada.estagio ?? entrada.atributos?.estagio;
    const tituloModal = (_est != null && String(_est) !== '' && String(_est) !== '—')
      ? `${entrada.nome} ${_est}`
      : entrada.nome;
    return (
      <DetalheMoldura inline={inline} title={<DiarioModalNome entrada={entrada} nomeOverride={tituloModal} />} lang={lang} onClose={onClose}>
        {/* subtitulo = tipo da criatura (ex: "Humanoide") — preservado abaixo do título */}
        {entrada.subtitulo && (
          <div className="diario-det-sub" style={{ marginTop: -8, marginBottom: 14 }}>
            {entrada.subtitulo}
          </div>
        )}
        {/* Abas Ficha / Descrição */}
        <div className="hist-modal-tabs">
          <button
            type="button"
            className={'hist-modal-tab' + (abaModal === 'ficha' ? ' is-active' : '')}
            onClick={() => setAbaModal('ficha')}
          >
            {en ? 'Sheet' : 'Ficha'}
          </button>
          <button
            type="button"
            className={'hist-modal-tab' + (abaModal === 'descricao' ? ' is-active' : '')}
            onClick={() => setAbaModal('descricao')}
          >
            {en ? 'Description' : 'Descrição'}
          </button>
        </div>
        {/* ABA: FICHA — stats sem a descrição em prosa (vai na aba Descrição) */}
        {abaModal === 'ficha' && <CriaturaFicha entrada={entrada} lang={lang} hideDescricao />}
        {/* ABA: DESCRIÇÃO */}
        {abaModal === 'descricao' && (
          <div className="diario-det">
            {entrada.imagem_url && (
              <div className="diario-det-art">
                <img src={entrada.imagem_url} alt={entrada.nome} />
              </div>
            )}
            {entrada.descricao ? (
              entrada.descricao.split(/\n+/).map((par, i) => (
                <p key={i} className="diario-det-desc">{par}</p>
              ))
            ) : (
              <p className="diario-det-desc" style={{ fontStyle: 'italic', color: 'var(--muted-foreground)' }}>
                {en ? 'No description available.' : 'Nenhuma descrição disponível.'}
              </p>
            )}
          </div>
        )}
        {acoes}
      </DetalheMoldura>
    );
  }

  // NPCs, reinos, cidades: layout genérico com grade de atributos
  const JA_EXIBIDOS = new Set([
    'tipo', 'ref_id', 'id', 'nome', 'subtitulo', 'descricao', 'imagem_url',
    'comentario', 'jaImportado', 'diario_entrada_id', 'personagem_id',
    'criatura_id', 'created_at', 'updated_at', 'atributos',
    // campos de metadado interno — não exibir no modal
    'slug', 'compartilhado', 'criado_por_personagem_id', 'criado_por_nome',
  ]);

  /* PREFIXO `_` = CAMPO DA TELA, NÃO DA ENTRADA. Regra, não lista: a grade de
     atributos monta varrendo Object.entries(entrada), então qualquer campo que
     uma tela pendure no objeto aparece como atributo do NPC.

     `_global` (migration 016) era a única exceção e estava nominalmente no
     JA_EXIBIDOS. Em 17/09/2026 a tabela do Mestre passou a pendurar cinco:
     _fonte, _tipoLabel, _raca, _cidade e _visibilidade, derivados para o
     SortHead poder ordenar por eles. Os cinco vazaram para a ficha da linha
     expandida como " fonte", " visibilidade", " visModo" — com espaço no
     lugar do underscore, porque rotulo() troca `_` por espaço, o que também
     fez o vazamento passar despercebido numa leitura rápida.

     Uma lista nominal voltaria a ficar para trás na próxima coluna derivada.
     A regra não fica. */
  const ehCampoDeTela = (k) => k.startsWith('_');

  const LABELS = {
    grupo: en ? 'Group' : 'Grupo',
    nivel: en ? 'Level' : 'Nível',
    raca: en ? 'Race' : 'Raça',
    profissao: en ? 'Social Class' : 'Classe Social',
    afiliacao: en ? 'Affiliation' : 'Afiliação',
    governante: en ? 'Ruler' : 'Governante',
    idioma: en ? 'Language' : 'Idioma',
    reino: en ? 'Kingdom' : 'Reino',
    populacao: en ? 'Population' : 'População',
    pontos_vida: en ? 'Hit Points' : 'Pontos de Vida',
    defesa: en ? 'Defense' : 'Defesa',
    dano: en ? 'Damage' : 'Dano',
    forca: en ? 'Strength' : 'Força',
    agilidade: en ? 'Agility' : 'Agilidade',
    fisico: en ? 'Physique' : 'Físico',
    // NPC — campos renomeados
    origem: en ? 'Hometown' : 'Cidade Natal',
    cidade: en ? 'Location' : 'Localização',
    // NPC — campos novos
    idade: en ? 'Age' : 'Idade',
    familia: en ? 'Family' : 'Família',
    relacao: en ? 'Relationship' : 'Relação',
    status: en ? 'Status' : 'Status',
  };
  const rotulo = (k) => {
    const base = LABELS[k] || k.replace(/_/g, ' ');
    return base.charAt(0).toUpperCase() + base.slice(1);
  };

  const SLUG_CAMPOS = new Set(['cidade', 'origem', 'reino']);
  const BOOL_CAMPOS = new Set(['capital']);
  // Campos texto-longo de reino/cidade — saem da grade genérica e ganham aba própria.
  const REINO_PARAGRAFO_CAMPOS = new Set(['governo', 'cultura', 'historia_recente', 'rumores']);
  // Campos texto-longo do NPC que ganham aba própria (não aparecem na grade).
  const NPC_PARAGRAFO_CAMPOS = new Set(['rumores']);
  // Campos ocultos no modal Cidade (redundantes ou irrelevantes para o contexto).
  const CIDADE_EXCLUIR_CAMPOS = new Set(['reino', 'populacao']);
  const resolverValor = (k, v) => {
    if (SLUG_CAMPOS.has(k) && loreBySlug[v]) { const n = loreBySlug[v]; return n.charAt(0).toUpperCase() + n.slice(1); }
    if (typeof v === 'string' && v.length > 0) return v.charAt(0).toUpperCase() + v.slice(1);
    return v;
  };
  const pares = [];
  let eCapital = false;
  const attrs = entrada.atributos && typeof entrada.atributos === 'object' ? entrada.atributos : null;
  // Campos NPC com posição fixa na grade — não entram em pares (evita duplicata
  // quando o campo existe tanto em entrada.atributos quanto em entrada direto).
  const NPC_FIXOS_KEYS = new Set(['deus', 'raca', 'profissao', 'origem', 'cidade', 'idade', 'familia', 'relacao', 'status']);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (BOOL_CAMPOS.has(k)) { if (v === true || v === 'true') eCapital = true; continue; }
      if ((entrada.tipo === 'reino' || entrada.tipo === 'cidade') && REINO_PARAGRAFO_CAMPOS.has(k)) continue;
      if (entrada.tipo === 'npc' && NPC_PARAGRAFO_CAMPOS.has(k)) continue;
      if (entrada.tipo === 'npc' && NPC_FIXOS_KEYS.has(k)) continue; // renderizado na grade fixa
      if (entrada.tipo === 'cidade' && CIDADE_EXCLUIR_CAMPOS.has(k)) continue;
      if (v != null && v !== '' && v !== false && typeof v !== 'object') pares.push([rotulo(k), resolverValor(k, String(v))]);
    }
  }
  for (const [k, v] of Object.entries(entrada)) {
    if (JA_EXIBIDOS.has(k) || ehCampoDeTela(k)) continue;
    if (BOOL_CAMPOS.has(k)) { if (v === true || v === 'true') eCapital = true; continue; }
    if ((entrada.tipo === 'reino' || entrada.tipo === 'cidade') && REINO_PARAGRAFO_CAMPOS.has(k)) continue;
    if (entrada.tipo === 'npc' && NPC_PARAGRAFO_CAMPOS.has(k)) continue;
    if (entrada.tipo === 'npc' && NPC_FIXOS_KEYS.has(k)) continue; // renderizado na grade fixa
    if (entrada.tipo === 'cidade' && CIDADE_EXCLUIR_CAMPOS.has(k)) continue;
    if (v == null || v === '' || v === false || typeof v === 'object') continue;
    pares.push([rotulo(k), resolverValor(k, String(v))]);
  }

  // Abas do modal NPC: Ficha · Descrição · Rumores.
  // Abas do modal Reino/Cidade: Descrição · Cultura · Governo · História Recente · Rumores.
  // (estados declarados no topo da função antes de qualquer return condicional)

  const getAttr = (k) => {
    if (attrs && attrs[k] != null && attrs[k] !== '') return String(attrs[k]);
    if (entrada[k] != null && entrada[k] !== '') return String(entrada[k]);
    return null;
  };
  const fmtAttr = (k) => {
    const v = getAttr(k);
    if (!v) return null;
    // Resolve slug para nome se for campo de slug
    if (SLUG_CAMPOS.has(k) && loreBySlug[v]) { const n = loreBySlug[v]; return n.charAt(0).toUpperCase() + n.slice(1); }
    return v.charAt(0).toUpperCase() + v.slice(1);
  };

  // Grade fixa do NPC — 3 colunas × 2 linhas (6 células), campos sempre na
  // mesma posição independente de preenchimento. Só exibe a linha se ao menos
  // um dos campos dela tiver valor.
  const NPC_GRADE = [
    [
      { key: 'deus',     label: en ? 'God'        : 'Deus'        },
      { key: 'raca',     label: en ? 'Race'        : 'Raça'        },
      { key: 'cidade',   label: en ? 'Location'    : 'Localização' },
    ],
    [
      { key: 'origem',   label: en ? 'Hometown'    : 'Cidade Natal' },
      { key: 'profissao',label: en ? 'Social Class': 'Classe Social'},
      { key: 'idade',    label: en ? 'Age'         : 'Idade'        },
    ],
    [
      { key: 'familia',  label: en ? 'Family'      : 'Família'      },
      { key: 'relacao',  label: en ? 'Relationship': 'Relação'      },
      { key: 'status',   label: en ? 'Status'      : 'Status'       },
    ],
  ];

  // pares restantes (campos do JSONB não mapeados pelos fixos)
  const paresExtras = pares.filter(([k]) => {
    // k já veio capitalizado pelo rotulo(); revertemos pra checar contra NPC_FIXOS_KEYS
    const keyRaw = k.toLowerCase().replace(/ /g, '_');
    return !NPC_FIXOS_KEYS.has(keyRaw);
  });

  if (entrada.tipo === 'npc') {
    return (
      <DetalheMoldura inline={inline} title={<DiarioModalNome entrada={entrada} />} lang={lang} onClose={onClose}>
        {/* Abas — mesmo estilo do "Editar História" */}
        <div className="hist-modal-tabs">
          <button
            type="button"
            className={'hist-modal-tab' + (abaModal === 'descricao' ? ' is-active' : '')}
            onClick={() => setAbaModal('descricao')}
          >
            {en ? 'Description' : 'Descrição'}
          </button>
          <button
            type="button"
            className={'hist-modal-tab' + (abaModal === 'rumores' ? ' is-active' : '')}
            onClick={() => setAbaModal('rumores')}
          >
            {en ? 'Rumors' : 'Rumores'}
          </button>
          <button
            type="button"
            className={'hist-modal-tab' + (abaModal === 'ficha' ? ' is-active' : '')}
            onClick={() => setAbaModal('ficha')}
          >
            {en ? 'Sheet' : 'Ficha'}
          </button>
        </div>

        {/* ABA: FICHA */}
        {abaModal === 'ficha' && (
          <div className="diario-det">
            {entrada.imagem_url && (
              <div className="diario-det-art">
                <img src={entrada.imagem_url} alt={entrada.nome} />
              </div>
            )}

            {/* Grade fixa de atributos NPC — 3 colunas, posição determinística */}
            <div className="diario-det-attrs diario-det-attrs--npc">
              {NPC_GRADE.flat().map(({ key, label }) => (
                <div key={key} className="diario-det-attr">
                  <span className="diario-det-attr-k">{label}</span>
                  <span className="diario-det-attr-v">{fmtAttr(key) || '—'}</span>
                </div>
              ))}
            </div>

            {/* Campos extras do JSONB não cobertos pela grade fixa */}
            {paresExtras.length > 0 && (
              <div className="diario-det-attrs">
                {paresExtras.map(([k, v], i) => (
                  <div key={i} className="diario-det-attr">
                    <span className="diario-det-attr-k">{k}</span>
                    <span className="diario-det-attr-v">{v}</span>
                  </div>
                ))}
              </div>
            )}

            {entrada.comentario && (
              <div className="diario-det-nota">
                <div className="diario-det-nota-lbl">
                  <i className="ti ti-quote" aria-hidden="true" />
                  {en ? 'Your notes' : 'Suas anotações'}
                </div>
                <p>{entrada.comentario}</p>
              </div>
            )}
          </div>
        )}

        {/* ABA: DESCRIÇÃO */}
        {abaModal === 'descricao' && (
          <div className="diario-det">
            {entrada.imagem_url && (
              <div className="diario-det-art">
                <img src={entrada.imagem_url} alt={entrada.nome} />
              </div>
            )}
            {entrada.descricao ? (
              <div>
                {entrada.descricao.split(/\n+/).map((par, i) => (
                  <p key={i} className="diario-det-desc">{par}</p>
                ))}
              </div>
            ) : (
              <p className="diario-det-desc" style={{ fontStyle: 'italic', color: 'var(--muted-foreground)' }}>
                {en ? 'No description available.' : 'Nenhuma descrição disponível.'}
              </p>
            )}
          </div>
        )}

        {/* ABA: RUMORES */}
        {abaModal === 'rumores' && (
          <div className="diario-det">
            {(attrs?.rumores ?? entrada.rumores) ? (
              (attrs?.rumores ?? entrada.rumores).split(/\n+/).map((par, i) => (
                <p key={i} className="diario-det-desc">{par}</p>
              ))
            ) : (
              <p className="diario-det-desc" style={{ fontStyle: 'italic', color: 'var(--muted-foreground)' }}>
                {en ? 'No rumors available.' : 'Nenhum rumor disponível.'}
              </p>
            )}
          </div>
        )}

        {acoes}
      </DetalheMoldura>
    );
  }

  // Reinos: abas Descrição · Cultura · Governo · História Recente · Rumores.
  // Cidades: layout original (sem abas — só descrição + atributos).
  const REINO_ABAS = [
    { key: 'descricao',       label: en ? 'Description'    : 'Descrição'        },
    { key: 'cultura',         label: en ? 'Culture'        : 'Cultura'           },
    { key: 'governo',         label: en ? 'Government'     : 'Governo'           },
    { key: 'historia_recente',label: en ? 'Recent History' : 'História Recente'  },
    { key: 'rumores',         label: en ? 'Rumors'         : 'Rumores'           },
  ];
  const emptyMsg = (en ? 'No content available.' : 'Nenhum conteúdo disponível.');

  if (entrada.tipo === 'reino') {
    const renderReinoAba = () => {
      if (abaReino === 'descricao') {
        return (
          <div className="diario-det">
            {entrada.imagem_url && (
              <div className="diario-det-art">
                <img src={entrada.imagem_url} alt={entrada.nome} />
              </div>
            )}
            {pares.length > 0 && (
              <div className="diario-det-attrs">
                {pares.map(([k, v], i) => (
                  <div key={i} className="diario-det-attr">
                    <span className="diario-det-attr-k">{k}</span>
                    <span className="diario-det-attr-v">{v}</span>
                  </div>
                ))}
              </div>
            )}
            {entrada.descricao ? (
              entrada.descricao.split(/\n+/).map((par, i) => (
                <p key={i} className="diario-det-desc">{par}</p>
              ))
            ) : (
              <p className="diario-det-desc" style={{ fontStyle:'italic', color:'var(--muted-foreground)' }}>{emptyMsg}</p>
            )}
            {entrada.comentario && (
              <div className="diario-det-nota">
                <div className="diario-det-nota-lbl">
                  <i className="ti ti-quote" aria-hidden="true" />
                  {en ? 'Your notes' : 'Suas anotações'}
                </div>
                <p>{entrada.comentario}</p>
              </div>
            )}
          </div>
        );
      }
      // Abas de texto longo — cultura, governo, historia_recente, rumores
      const textoMap = {
        cultura:          attrs?.cultura          ?? entrada.cultura,
        governo:          attrs?.governo          ?? entrada.governo,
        historia_recente: attrs?.historia_recente ?? entrada.historia_recente,
        rumores:          attrs?.rumores          ?? entrada.rumores,
      };
      const texto = textoMap[abaReino];
      return (
        <div className="diario-det">
          {texto ? (
            texto.split(/\n+/).map((par, i) => (
              <p key={i} className="diario-det-desc">{par}</p>
            ))
          ) : (
            <p className="diario-det-desc" style={{ fontStyle:'italic', color:'var(--muted-foreground)' }}>{emptyMsg}</p>
          )}
        </div>
      );
    };

    return (
      <DetalheMoldura inline={inline} title={<DiarioModalNome entrada={entrada} />} lang={lang} onClose={onClose}>
        {/* Abas — mesmo estilo do "Editar História" */}
        <div className="hist-modal-tabs">
          {REINO_ABAS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={'hist-modal-tab' + (abaReino === key ? ' is-active' : '')}
              onClick={() => setAbaReino(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {renderReinoAba()}
        {acoes}
      </DetalheMoldura>
    );
  }

  // Cidades — 5 abas: Descrição · Cultura · Governo · História Recente · Rumores
  const CIDADE_ABAS = [
    { key: 'descricao',        label: en ? 'Description'    : 'Descrição'        },
    { key: 'cultura',          label: en ? 'Culture'        : 'Cultura'           },
    { key: 'governo',          label: en ? 'Government'     : 'Governo'           },
    { key: 'historia_recente', label: en ? 'Recent History' : 'História Recente'  },
    { key: 'rumores',          label: en ? 'Rumors'         : 'Rumores'           },
  ];
  const emptyMsgCidade = (en ? 'No content available.' : 'Nenhum conteúdo disponível.');

  const renderCidadeAba = () => {
    if (abaCidade === 'descricao') {
      return (
        <div className="diario-det">
          {entrada.imagem_url && (
            <div className="diario-det-art">
              <img src={entrada.imagem_url} alt={entrada.nome} />
            </div>
          )}
          {pares.length > 0 && (
            <div className="diario-det-attrs">
              {pares.map(([k, v], i) => (
                <div key={i} className="diario-det-attr">
                  <span className="diario-det-attr-k">{k}</span>
                  <span className="diario-det-attr-v">{v}</span>
                </div>
              ))}
            </div>
          )}
          {entrada.descricao ? (
            entrada.descricao.split(/\n+/).map((par, i) => (
              <p key={i} className="diario-det-desc">{par}</p>
            ))
          ) : (
            <p className="diario-det-desc" style={{ fontStyle:'italic', color:'var(--muted-foreground)' }}>{emptyMsgCidade}</p>
          )}
          {entrada.comentario && (
            <div className="diario-det-nota">
              <div className="diario-det-nota-lbl">
                <i className="ti ti-quote" aria-hidden="true" />
                {en ? 'Your notes' : 'Suas anotações'}
              </div>
              <p>{entrada.comentario}</p>
            </div>
          )}
        </div>
      );
    }
    const textoMapCidade = {
      cultura:          attrs?.cultura          ?? entrada.cultura,
      governo:          attrs?.governo          ?? entrada.governo,
      historia_recente: attrs?.historia_recente ?? entrada.historia_recente,
      rumores:          attrs?.rumores          ?? entrada.rumores,
    };
    const textoCidade = textoMapCidade[abaCidade];
    return (
      <div className="diario-det">
        {textoCidade ? (
          textoCidade.split(/\n+/).map((par, i) => (
            <p key={i} className="diario-det-desc">{par}</p>
          ))
        ) : (
          <p className="diario-det-desc" style={{ fontStyle:'italic', color:'var(--muted-foreground)' }}>{emptyMsgCidade}</p>
        )}
      </div>
    );
  };

  // Item / Magia / Habilidade / Técnica — catálogo simples (só nome + descrição).
  // Modal enxuto sem abas nem grade de atributos.
  if (['item', 'magia', 'habilidade', 'tecnica'].includes(entrada.tipo)) {
    return (
      <DetalheMoldura inline={inline} title={<DiarioModalNome entrada={entrada} />} lang={lang} onClose={onClose}>
        <div className="diario-det">
          {entrada.imagem_url && (
            <div className="diario-det-art">
              <img src={entrada.imagem_url} alt={entrada.nome} />
            </div>
          )}
          {entrada.descricao ? (
            entrada.descricao.split(/\n+/).map((par, i) => (
              <p key={i} className="diario-det-desc">{par}</p>
            ))
          ) : (
            <p className="diario-det-desc" style={{ fontStyle: 'italic', color: 'var(--muted-foreground)' }}>
              {en ? 'No description available.' : 'Nenhuma descrição disponível.'}
            </p>
          )}
        </div>
        {acoes}
      </DetalheMoldura>
    );
  }

  return (
    <DetalheMoldura inline={inline} title={<DiarioModalNome entrada={entrada} />} lang={lang} onClose={onClose}>
      {/* Abas — mesmo estilo do "Editar História" */}
      <div className="hist-modal-tabs">
        {CIDADE_ABAS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={'hist-modal-tab' + (abaCidade === key ? ' is-active' : '')}
            onClick={() => setAbaCidade(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {renderCidadeAba()}
      {acoes}
    </DetalheMoldura>
  );
}

// ---------- MemoriaModal ----------

function MemoriaModal({ memoria, lang, pjId, onClose, onSaved }) {
  const en = lang === 'en';
  const isEdit = !!memoria;
  const [titulo, setTitulo] = useState(memoria?.titulo || '');
  /* O corpo da memória mora em `diario_entradas.comentario` — o `conteudo` é
     só o nome do PARÂMETRO da RPC (p_conteudo). A tela lia `memoria.conteudo`,
     campo que não existe em lugar nenhum: abrir uma memória salva mostrava o
     texto em branco, e salvar por cima apagava o que estava escrito.
     Descoberto em 12/09/2026 ao montar a tabela, que precisava do trecho. */
  const [conteudo, setConteudo] = useState(memoria?.comentario ?? memoria?.conteudo ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const salvar = async () => {
    if (!titulo.trim()) { setError(en ? 'Title is required.' : 'Título é obrigatório.'); return; }
    setSaving(true); setError(null);
    const { data, error: err } = await supabaseClient.rpc('salvar_memoria_diario', {
      p_id: memoria?.id ?? null,
      p_personagem_id: pjId,
      p_titulo: titulo,
      p_conteudo: conteudo,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    if (data && data.ok === false) { setError(data.motivo || 'erro'); return; }
    onSaved(data && data.entrada ? data.entrada : { ...memoria, titulo, comentario: conteudo });
  };

  return (
    <ModalShell
      title={isEdit ? (en ? 'Edit memory' : 'Editar memória') : (en ? 'New memory' : 'Nova memória')}
      lang={lang}
      onClose={onClose}
      onCancel={onClose}
      cancelLabel={en ? 'Cancel' : 'Cancelar'}
      onConfirm={salvar}
      confirmLabel={saving ? (en ? 'Saving…' : 'Salvando…') : (en ? 'Save' : 'Salvar')}
      confirmDisabled={saving}
    >
      <label className="diario-field-label">{en ? 'Title' : 'Título'}</label>
      <input
        className="diario-input"
        type="text"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder={en ? 'E.g. "The night in Verrogar"' : 'Ex.: "A noite em Verrogar"'}
        autoFocus
      />
      <label className="diario-field-label diario-field-label--mt">{en ? 'Content' : 'Conteúdo'}</label>
      <textarea
        className="diario-textarea"
        rows={8}
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
        placeholder={en ? 'Write freely…' : 'Escreva livremente…'}
      />
      {error && <div className="err-msg diario-err-mt">{error}</div>}
    </ModalShell>
  );
}

// ---------- DiarioView (Jogador) ----------

/* Moldura da tabela do diário (12/09/2026).

   As telas Lugares, Personagens e Memórias da barra lateral são este mesmo
   Diário travado num tipo, e o usuário pediu que fossem "uma tabela igual às
   demais — itens, magias, etc.". Igual quer dizer as MESMAS peças: o kit de
   tabela do bestiário (UI.Table dentro de .best-table-wrap), cabeçalho que
   ordena ao clique (SortHead) e a mesma paginação.

   Só a moldura mora aqui; as linhas cada aba desenha por conta, porque as
   ações de cada uma são diferentes (importar, compartilhar, excluir).

   `cols`: [{ key, label, style?, ordena? }] — ordena:false vira cabeçalho
   morto, para a coluna de ações e para o que não faz sentido ordenar. */
/* Primeira linha de uma memória, para a coluna "Trecho". Sem isso a tabela
   teria uma coluna só (título) e pareceria uma lista com bordas. */
function resumoDeTexto(txt, max = 90) {
  const s = String(txt || '').replace(/\s+/g, ' ').trim();
  if (!s) return '—';
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

/* De onde veio uma entrada de Personagens/Lugares, do ponto de vista do PJ
   dono do diário: 'pessoal' se foi ele que escreveu, 'aventura' se chegou
   pelo Mestre ou por outro jogador. String() dos dois lados porque o id vem
   ora número, ora texto, conforme a RPC. */
function origemDaEntrada(e, pjId) {
  return e.criado_por_personagem_id != null && pjId != null
    && String(e.criado_por_personagem_id) === String(pjId)
    ? 'pessoal' : 'aventura';
}

function DiarioTabela({ cols, wrapRef, sortKey, sortDir, toggleSort, children }) {
  const { Table, TableHeader, TableBody, TableRow, TableHead } = (typeof UI !== 'undefined' ? UI : {});
  if (!Table) return null;
  return (
    <div className="best-table-wrap" ref={wrapRef}>
      <Table>
        <TableHeader><TableRow>
          {cols.map((c) => (c.ordena === false
            ? <TableHead key={c.key} style={c.style}>{c.label || ''}</TableHead>
            : <SortHead key={c.key} col={c.key} sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>{c.label}</SortHead>
          ))}
        </TableRow></TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

// Tooltip portal — mesmo padrão .mn-tip do projeto (Pedra & Bronze), renderizado
// dentro do .menestrel-ui ativo para escapar de overflow:hidden/transform.
function usePortalTooltip(delay) {
  const [tip, setTip] = React.useState(null);
  const timerRef = React.useRef(null);
  const abrirTip = React.useCallback((e, content) => {
    clearTimeout(timerRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    timerRef.current = setTimeout(() => setTip({ rect, content }), delay || 0);
  }, [delay]);
  const fecharTip = React.useCallback(() => { clearTimeout(timerRef.current); setTip(null); }, []);
  const manterTip = React.useCallback(() => { clearTimeout(timerRef.current); }, []);
  return [tip, abrirTip, fecharTip, manterTip];
}
function PortalTooltip({ tip, onEnter, onLeave }) {
  if (!tip) return null;
  const { rect, content } = tip;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top;
  const rich = content && typeof content === 'object' && !React.isValidElement(content);
  const portalTarget = document.querySelector('.menestrel-ui') || document.body;
  return ReactDOM.createPortal(
    <div
      className="mn-tip diario-portal-tip"
      style={{ left: cx, top: cy }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {rich ? (
        <>
          {content.title && <div className="mn-tip-title">{content.title}</div>}
          {content.desc  && <p   className="mn-tip-desc">{content.desc}</p>}
          {content.hint && <div className="mn-tip-hint">{content.hint}</div>}
        </>
      ) : (
        <div className="mn-tip-title">{content}</div>
      )}
    </div>,
    portalTarget
  );
}

// useGridDimensions — réplica fiel do hook de 07-inventario/inventario.jsx
// (também exposto via window por aquela fase, mas duplicado aqui para manter
// o Diário coeso/autocontido, no mesmo padrão de usePortalTooltip acima).
// Calcula quantas colunas/linhas de slots (50px) cabem na área visível do
// .mc-main, pro grid pequeno do diário (.diario-grid--slots) se comportar
// exatamente como o do Inventário/Loja.
const DIARIO_SLOT_SIZE = 54; // 50px de célula + 4px de gap = 54px por unidade (19 itens/linha)
// Teto de colunas por linha.
const DIARIO_MAX_GRID_COLS = 20;
// Teto de linhas da grade do Diário: o preenchimento com slots fantasmas para
// em DIARIO_MAX_GRID_ROWS linhas em vez de descer pela viewport inteira (mesmo
// teto do Inventário/Loja). Itens reais acima do teto continuam renderizando.
const DIARIO_MAX_GRID_ROWS = 11;
function useGridDimensions() {
  const [dims, setDims] = React.useState({ cols: 7, rows: 4, totalSlots: 28 });
  const elRef = React.useRef(null);
  const roRef = React.useRef(null);

  const calc = React.useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    const w = el.clientWidth - 8;
    let mcMain = el.parentElement;
    while (mcMain && !mcMain.classList.contains('mc-main')) {
      mcMain = mcMain.parentElement;
    }
    const containerH = mcMain ? mcMain.clientHeight : window.innerHeight;
    const elTop = mcMain
      ? (el.getBoundingClientRect().top - mcMain.getBoundingClientRect().top)
      : el.getBoundingClientRect().top;
    const h = Math.max(200, containerH - elTop - 8);
    const cols = Math.min(DIARIO_MAX_GRID_COLS, Math.max(3, Math.floor(w / DIARIO_SLOT_SIZE)));
    const rows = Math.min(DIARIO_MAX_GRID_ROWS, Math.max(2, Math.floor(h / DIARIO_SLOT_SIZE)));
    setDims((prev) =>
      (prev.cols === cols && prev.rows === rows) ? prev : { cols, rows, totalSlots: cols * rows }
    );
  }, []);

  const setGridEl = React.useCallback((node) => {
    if (roRef.current) { roRef.current.disconnect(); roRef.current = null; }
    elRef.current = node;
    if (node) {
      requestAnimationFrame(calc);
      const ro = new ResizeObserver(calc);
      ro.observe(node);
      roRef.current = ro;
    }
  }, [calc]);

  React.useEffect(() => {
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [calc]);

  return [setGridEl, dims];
}

function DiarioView({ pj, lang, papel, currentUserId, isMestre, tipoFixo }) {
  const en = lang === 'en';
  const pjId = pj?.id;
  // Fallback: quantas linhas mostrar antes de useFitPageSize medir a tela.
  const PAGE_SIZE = 10;
  // Kit de tabela do projeto — o mesmo que Itens, Magias e o Bestiário usam.
  const { TableRow, TableCell } = (typeof UI !== 'undefined' ? UI : {});
  // O jogador dono do PJ pode criar/editar/compartilhar. O Mestre vendo a
  // ficha de outro jogador tem acesso de leitura (não é o autor das entradas).
  const souDono = !isMestre && (currentUserId == null || pj?.user_id == null || pj.user_id === currentUserId);

  // ── Estado principal ──────────────────────────────────────────
  const [historiaId,    setHistoriaId]    = useState(null);
  const [historiaNome,  setHistoriaNome]  = useState('');
  // lore: entradas criadas pelo próprio PJ ou compartilhadas por outros PJs
  const [lore,          setLore]          = useState(null);
  // criaturas/memorias: do listar_diario_disponivel
  const [criaturas,     setCriaturas]     = useState(null);
  const [memorias,      setMemorias]      = useState(null);
  // disponibilizados: o que o Mestre liberou por tipo (vem do disponivel)
  const [disponibilizados, setDisponibilizados] = useState({
    npc: [], reino: [], cidade: [], item: [], magia: [], habilidade: [], tecnica: [],
  });
  // importados: Set de "tipo:ref_id" já na coleção do PJ
  const [importados,    setImportados]    = useState(new Set());
  // importadosIds: Map<"tipo:ref_id", diario_entrada_id> — usado para cancelar importação
  const [importadosIds, setImportadosIds] = useState(new Map());

  // ── UI ────────────────────────────────────────────────────────
  /* Origem da linha (12/09/2026): tudo numa tabela só, "com marcação de
     criação do usuário ou da aventura" — a coluna Origem. Os chips que
     filtravam por ela saíram em 14/09/2026, com os das páginas do catálogo:
     "vão seguir o mesmo padrão das demais páginas 'itens', 'magias', etc, no
     que diz respeito aos botões de filtro, botão de buscar, etc." A coluna
     continua e ordena pelo cabeçalho. */
  /* tipoFixo (12/09/2026): as secoes Lugares/Personagens/Memorias da barra
     lateral sao este mesmo Diario travado num tipo so. Deixar de ser uma aba
     dentro da ficha e virar tres destinos foi decisao do usuario — e o codigo
     nao precisou de tres telas novas, so de nao oferecer a escolha. */
  const [tipoAba,             setTipoAba]             = useState(tipoFixo || 'memoria');
  const [tipoNovo,            setTipoNovo]            = useState(null);
  const [editando,            setEditando]            = useState(null);
  const [savingVinculo,       setSavingVinculo]       = useState(false);
  const [page,                setPage]                = useState(1);
  const [query,               setQuery]               = useState('');
  const [error,               setError]               = useState(null);
  const [memoriaAberta,       setMemoriaAberta]       = useState(null);
  const [viewingLore,         setViewingLore]         = useState(null);
  // confirmandoCancelar: chave "tipo:ref_id" da entrada aguardando confirmação
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(null);
  const [tip, abrirTip, fecharTip, manterTip]         = usePortalTooltip(80);

  // ── Fetch ─────────────────────────────────────────────────────
  const carregar = async () => {
    if (!pjId) return null;
    setError(null);
    const [
      { data: loreData, error: loreErr },
      { data: disp,     error: dispErr },
    ] = await Promise.all([
      supabaseClient.rpc('listar_diario_lore',       { p_personagem_id: pjId }),
      supabaseClient.rpc('listar_diario_disponivel', { p_personagem_id: pjId }),
    ]);
    if (loreErr) {
      setError(loreErr.message);
      setLore([]); setCriaturas([]); setMemorias([]);
      return null;
    }
    if (loreData && loreData.ok === false) {
      setError(loreData.motivo || 'erro');
      setLore([]); setCriaturas([]); setMemorias([]);
      return null;
    }
    setHistoriaId(loreData?.historia_id   ?? null);
    setHistoriaNome(loreData?.historia_nome ?? '');
    setLore(loreData?.entradas || []);
    let impsMap = new Map();
    if (!dispErr && disp && disp.ok !== false) {
      setCriaturas(disp.criaturas || []);
      setMemorias(disp.memorias   || []);
      // Distribui entradas disponibilizadas por tipo
      const loreDisp = disp.lore || [];
      setDisponibilizados({
        npc:        loreDisp.filter((e) => e.tipo === 'npc'),
        reino:      loreDisp.filter((e) => e.tipo === 'reino'),
        cidade:     loreDisp.filter((e) => e.tipo === 'cidade'),
        item:       disp.itens       || [],
        magia:      disp.magias      || [],
        habilidade: disp.habilidades || [],
        tecnica:    disp.tecnicas    || [],
      });
      // Importados: Set para lookup rápido + Map para cancelamento (precisa do ID)
      const impsSet = new Set();
      (disp.colecao || []).forEach((e) => {
        const key = `${e.tipo}:${String(e.ref_id)}`;
        impsSet.add(key);
        if (e.diario_entrada_id) impsMap.set(key, e.diario_entrada_id);
      });
      setImportados(impsSet);
      setImportadosIds(impsMap);
    }
    // Retorna o Map atualizado para uso síncrono em cancelarImport
    return impsMap;
  };

  useEffect(() => { carregar(); }, [pjId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); setQuery(''); }, [tipoAba]);

  /* ── A lista da aba, num lugar só ─────────────────────────────────────
     "A página de lugares, personagens, memórias deve ser uma tabela igual
     às demais — itens, magias, etc." (usuário, 12/09/2026)

     Tabela igual de verdade quer dizer as MESMAS peças do bestiário —
     ordenação por clique no cabeçalho (useSort), quantas linhas cabem na
     tela (useFitPageSize), paginação. E hook não pode ser chamado dentro de
     um ramo do JSX: cada aba montava a própria lista lá embaixo, repetindo
     busca e paginação quatro vezes.

     Então a lista sobe pra cá e o JSX volta a ser só desenho.

     `base` é tudo o que a aba tem; `lista`, o que sobra depois da busca. */
  // Só Personagens e Lugares misturam as duas origens. Memória é sempre do
  // jogador e criatura/item/treinamento sempre da aventura: nessas a coluna
  // repetiria a mesma palavra em todas as linhas.
  const temOrigem = tipoAba === 'npc' || tipoAba === 'lugar';
  const { lista: listaDaAba } = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const casa = (nome) => !q || String(nome || '').toLowerCase().includes(q);
    const porNome = (a, b) => (a.nome || '').localeCompare(b.nome || '', en ? 'en' : 'pt');

    if (tipoAba === 'memoria') {
      const base = memorias || [];
      return { base, lista: base.filter(
        (m) => casa(m.titulo) || (!!q && String(m.comentario || '').toLowerCase().includes(q))
      ) };
    }

    if (tipoAba === 'criatura') {
      const base = criaturas || [];
      return { base, lista: base.filter((c) => casa(c.nome)) };
    }

    // NPC / Lugares: o que está no diário do PJ (criado por ele ou
    // compartilhado por outro jogador) + o que o Mestre disponibilizou,
    // sem repetir o que já veio pela primeira lista.
    const loreDoTipo = (lore || []).filter((e) =>
      tipoAba === 'lugar' ? LUGAR_TIPOS.has(e.tipo) : e.tipo === tipoAba
    );
    const idsDoDiario = new Set(loreDoTipo.map((e) => String(e.slug || e.id)));
    const dispTipos = tipoAba === 'lugar' ? ['reino', 'cidade'] : [tipoAba];
    const doMestre = dispTipos.flatMap((t) =>
      (disponibilizados[t] || []).filter((e) => !idsDoDiario.has(String(e.slug || e.id)))
    );
    /* `origem` entra na linha (e não só na célula) para o cabeçalho poder
       ordenar por ela. Pessoal é o que ESTE personagem escreveu; o resto —
       Mestre ou outro jogador da mesa — chegou pela aventura. */
    const base = [
      ...loreDoTipo.map((e) => ({ ...e, origem: origemDaEntrada(e, pjId) })),
      ...doMestre.map((e) => ({ ...e, origem: 'aventura' })),
    ].sort(porNome);
    return { base, lista: base.filter((e) => casa(e.nome)) };
  }, [tipoAba, query, memorias, criaturas, lore, disponibilizados, pjId, en]);

  const { sorted: linhas, sortKey, sortDir, toggleSort } = useSort(listaDaAba);
  const wrapRef = React.useRef(null);
  const porPagina = useFitPageSize(wrapRef, { fallback: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(linhas.length / porPagina));
  const safePage   = Math.min(page, totalPages);
  const pagina     = linhas.slice((safePage - 1) * porPagina, safePage * porPagina);

  // ── CRUD ──────────────────────────────────────────────────────
  const salvarLore = async () => {
    setError(null);
    const tipoReal = tipoNovo || tipoAba; // 'reino'/'cidade' quando vem de Lugares
    const { data, error: err } = await supabaseClient.rpc('salvar_lore_entrada', {
      p_id:                        editando.id ?? null,
      p_historia_id:               historiaId,
      p_tipo:                      tipoReal,
      p_nome:                      editando.nome,
      p_descricao:                 editando.descricao,
      p_imagem_url:                editando.imagem_url || null,
      p_atributos:                 editando.atributos || {},
      p_criado_por_personagem_id:  pjId,
    });
    if (err) { setError(err.message); return; }
    if (data && data.ok === false) { setError(data.motivo || 'erro'); return; }
    setEditando(null);
    setTipoNovo(null);
    await carregar();
  };

  const excluirLore = async (id) => {
    setError(null);
    const { data, error: err } = await supabaseClient.rpc('excluir_lore_entrada', { p_id: id });
    if (err) { setError(err.message); return; }
    if (data && data.ok === false) { setError(data.motivo || 'erro'); return; }
    await carregar();
  };

  // Compartilhar/descompartilhar com outros jogadores da mesa
  const toggleCompartilhar = async (tipo, slug, ligar) => {
    setSavingVinculo(true);
    setError(null);
    // Optimistic update para feedback imediato
    setLore((prev) => (prev || []).map((e) =>
      String(e.slug || e.id) === String(slug) ? { ...e, compartilhado: ligar } : e
    ));
    const { data, error: err } = await supabaseClient.rpc('compartilhar_lore_entrada', {
      p_tipo:          tipo,
      p_slug:          String(slug),
      p_personagem_id: pjId,
      p_ligar:         ligar,
    });
    setSavingVinculo(false);
    if (err || (data && data.ok === false)) {
      setError(err?.message || data?.motivo || 'erro');
      await carregar(); // reverte optimistic
    }
  };

  // Importar entrada para a coleção pessoal do PJ.
  // Armazena uma cópia dos dados — a entrada fica disponível mesmo que o
  // autor original a exclua posteriormente.
  const importarEntrada = async (tipo, refId, entradaSnapshot) => {
    const { data, error: err } = await supabaseClient.rpc('importar_lore_diario', {
      p_personagem_id: pjId,
      p_tipo:          tipo,
      p_ref_id:        String(refId),
      p_nome:          entradaSnapshot?.nome       || null,
      p_descricao:     entradaSnapshot?.descricao  || null,
      p_imagem_url:    entradaSnapshot?.imagem_url || null,
      p_atributos:     entradaSnapshot?.atributos  || null,
    });
    if (err || (data && data.ok === false)) {
      setError(err?.message || data?.motivo || 'erro');
      return;
    }
    const key = `${tipo}:${String(refId)}`;
    setImportados((prev) => new Set([...prev, key]));
    // Se a RPC devolver o ID da entrada criada, já registrar no Map para que
    // cancelarImport consiga excluir sem precisar de um carregar() extra.
    const novoId = data?.entrada?.id ?? data?.id ?? null;
    if (novoId) {
      setImportadosIds((prev) => { const m = new Map(prev); m.set(key, novoId); return m; });
    }
  };

  // Cancela importação — remove da coleção pessoal sem afetar a entrada original
  const cancelarImport = async (tipo, refId) => {
    const key = `${tipo}:${String(refId)}`;
    let entradaId = importadosIds.get(key);
    // Fallback: se o ID não estiver no Map (importação feita na mesma sessão e a
    // RPC não retornou o ID), recarregar e usar o Map fresco diretamente.
    if (!entradaId) {
      const mapaFresco = await carregar();
      entradaId = mapaFresco?.get(key);
    }
    if (!entradaId) return;
    const { error: err } = await supabaseClient.rpc('excluir_entrada_diario', { p_id: entradaId });
    if (err) { setError(err.message); return; }
    setImportados((prev)    => { const s = new Set(prev); s.delete(key); return s; });
    setImportadosIds((prev) => { const m = new Map(prev); m.delete(key); return m; });
    setConfirmandoCancelar(null);
  };

  // ── Early returns ─────────────────────────────────────────────
  if (!pjId) return null;
  if (lore === null && criaturas === null) {
    return <DiarioLoading lang={lang} />;
  }

  // ── Helpers ───────────────────────────────────────────────────
  // Helper: botão ✓ importado com fluxo de cancelamento em dois cliques.
  // 1º clique → mostra 🗑️ (confirmar) + ← (cancelar). 2º clique no 🗑️ → remove.
  const renderBotaoImportado = (tipo, refId) => {
    const key = `${tipo}:${String(refId)}`;
    if (confirmandoCancelar === key) {
      return (
        <>
          <button className="btn-icon btn-danger btn-sm"
            onMouseEnter={(ev) => abrirTip(ev, { desc: en ? 'Confirm cancellation' : 'Confirmar cancelamento' })}
            onMouseLeave={fecharTip}
            onClick={() => cancelarImport(tipo, refId)}>
            <i className="ti ti-trash" aria-hidden="true" />
          </button>
          <button className="btn-icon btn-sm"
            onMouseEnter={(ev) => abrirTip(ev, { desc: en ? 'Keep import' : 'Manter importação' })}
            onMouseLeave={fecharTip}
            onClick={() => setConfirmandoCancelar(null)}>
            <i className="ti ti-arrow-back" aria-hidden="true" />
          </button>
        </>
      );
    }
    return (
      <button className="btn-icon btn-sm" style={{ color: 'var(--gold)' }}
        onMouseEnter={(ev) => abrirTip(ev, { desc: en ? 'Cancel import?' : 'Cancelar importação?' })}
        onMouseLeave={fecharTip}
        onClick={() => setConfirmandoCancelar(key)}>
        <i className="ti ti-check" aria-hidden="true" />
      </button>
    );
  };

  const reinosDaHistoria  = (lore || []).filter((e) => e.tipo === 'reino');
  const cidadesDaHistoria = (lore || []).filter((e) => e.tipo === 'cidade');
  const tipoReal = tipoNovo || (LUGAR_TIPOS.has(tipoAba) ? null : tipoAba);

  /* O + de Lugares abre o formulário DIRETO (17/09/2026). Antes abria um modal
     de escolha Reino/Cidade e só então o formulário — dois passos para um
     campo. O tipo é o primeiro campo do LoreEntradaForm agora; 'reino' é o
     padrão só porque alguma opção tem que vir marcada. */
  const abrirNovoLugar = () => {
    setTipoNovo('reino');
    setEditando({});
  };

  const formModal = editando && (
    <ModalShell
      title={editando.id
        ? (en ? `Edit ${diarioTipoLabel(tipoReal || tipoAba, lang)}` : `Editar ${diarioTipoLabel(tipoReal || tipoAba, lang)}`)
        : (en ? `New ${diarioTipoLabel(tipoReal || tipoAba, lang)}` : `${novoDoTipo(tipoReal || tipoAba)} ${diarioTipoLabel(tipoReal || tipoAba, lang)}`)}
      lang={lang}
      onClose={() => { setEditando(null); setTipoNovo(null); }}
      onCancel={() => { setEditando(null); setTipoNovo(null); }}
      onConfirm={salvarLore}
    >
      <LoreEntradaForm
        tipo={tipoReal || tipoAba}
        entrada={editando}
        onChange={setEditando}
        // O seletor de Reino/Cidade grava aqui: é `tipoNovo` que salvarLore lê
        // como p_tipo. Ver a nota em LoreEntradaForm.
        onTipoChange={setTipoNovo}
        reinosDaHistoria={reinosDaHistoria}
        cidadesDaHistoria={cidadesDaHistoria}
        t={COPY[lang] || COPY.pt}
        lang={lang}
      />
      {error && <div className="err-msg diario-err-mt">{error}</div>}
    </ModalShell>
  );

  // ── Render ────────────────────────────────────────────────────
  /* A página segue o molde de Magias peça por peça (12/09/2026) — e desde
     14/09/2026 o molde é: cabeçalho com a busca e o + à direita → tabela →
     paginação do bestiário. Sem chips de filtro e sem o "X de Y". */

  /* Criar: o MESMO + das listas do bestiário (só o símbolo, com tooltip) —
     14/09/2026. Lugares tinha dois botões, "Novo Reino" e "Nova Cidade"; com
     um + só, ele abre a escolha. Quem não é dono do PJ só lê. */
  const criar = !souDono ? null
    : tipoAba === 'memoria'
      ? { onNovo: () => setMemoriaAberta({}), dica: en ? 'New memory' : 'Nova memória', desativado: false }
    : tipoAba === 'lugar'
      ? { onNovo: abrirNovoLugar, dica: en ? 'New place' : 'Novo lugar', desativado: !historiaId }
    : tipoAba === 'npc'
      ? { onNovo: () => { setEditando({}); },
          dica: en ? 'New NPC' : 'Novo NPC', desativado: !historiaId }
    : null;

  /* Título da PÁGINA, quando ela é uma (tipoFixo). As palavras saem de
     ADMIN_COPY, as mesmas da barra lateral: se um dia "Memórias" virar outra
     coisa, o menu e o título da página mudam juntos. */
  const SECAO_DO_TIPO = { lugar: 'lugares', npc: 'npcs', memoria: 'memorias' };
  const tituloDaSecao = tipoFixo
    ? ((ADMIN_COPY[lang] || ADMIN_COPY.pt).sections[SECAO_DO_TIPO[tipoFixo]] || {}).label
    : null;

  const rotuloOrigem = (o) => (o === 'pessoal' ? (en ? 'Personal' : 'Pessoal') : (en ? 'Adventure' : 'Aventura'));

  // Sigla fica em maiúsculas: "Buscar NPC…", não "Buscar npc…".
  const rotuloTipo = diarioTipoLabel(tipoAba, lang);
  const rotuloBusca = rotuloTipo === rotuloTipo.toUpperCase() ? rotuloTipo : rotuloTipo.toLowerCase();
  /* Busca + o +, juntos — o cabeçalho de Itens e Magias (BestBuscaENovo,
     09-bestiario/bestiario.jsx). Sem chips de filtro e sem o "X de Y". */
  const buscaENovo = (
    <BestBuscaENovo
      ac={ADMIN_COPY[lang] || ADMIN_COPY.pt}
      placeholder={en ? `Search ${rotuloBusca}…` : `Buscar ${rotuloBusca}…`}
      query={query}
      setQuery={(v) => { setQuery(v); setPage(1); }}
      podeCriar={!!criar && !criar.desativado}
      onNovo={criar ? criar.onNovo : undefined}
      dicaNovo={criar ? criar.dica : undefined} />
  );

  const textoVazio = query.trim()
    ? (en ? `No result for "${query}".` : `Nenhum resultado para "${query}".`)
    : tipoAba === 'memoria'
      ? (en ? 'You haven\'t recorded any memories yet.' : 'Você ainda não registrou nenhuma memória.')
    : tipoAba === 'criatura'
      ? (en ? 'There are no creatures available to you yet.' : 'Ainda não há nenhuma criatura disponível para você.')
    : (en ? 'Nothing here yet — neither written by you nor revealed by the adventure.'
          : 'Nada aqui ainda — nem criado por você, nem revelado pela aventura.');

  // ── Linhas de cada aba ──
  const botaoVer = (onClick) => (
    <button className="btn-icon btn-sm"
      onMouseEnter={(ev) => abrirTip(ev, { desc: en ? 'View' : 'Ver' })}
      onMouseLeave={fecharTip}
      onClick={onClick}>
      <i className="ti ti-eye" aria-hidden="true" />
    </button>
  );
  const botaoImportar = (tipo, refId, snapshot) => (
    <button className="btn-icon btn-sm"
      onMouseEnter={(ev) => abrirTip(ev, { desc: en ? 'Import to journal' : 'Importar para o diário' })}
      onMouseLeave={fecharTip}
      onClick={() => importarEntrada(tipo, refId, snapshot)}>
      <i className="ti ti-download" aria-hidden="true" />
    </button>
  );

  let cols;
  let linha;
  if (tipoAba === 'memoria') {
    cols = [
      { key: 'titulo', label: en ? 'Title' : 'Título' },
      /* O trecho não ordena: ordenar por começo de texto não
         responde nenhuma pergunta que alguém faça. */
      { key: 'comentario', label: en ? 'Excerpt' : 'Trecho', ordena: false },
      { key: 'acoes', label: '', ordena: false, style: { width: 96 } },
    ];
    linha = (m) => (
      <TableRow key={m.id} style={{ cursor: 'pointer' }} onClick={() => setMemoriaAberta(m)}>
        <TableCell className="best-name">{m.titulo || (en ? '(untitled)' : '(sem título)')}</TableCell>
        <TableCell className="diario-td-trecho">{resumoDeTexto(m.comentario)}</TableCell>
        <TableCell className="diario-td-acoes" onClick={(ev) => ev.stopPropagation()}>
          {botaoVer(() => setMemoriaAberta(m))}
          {souDono && (
            <button className="btn-icon btn-danger btn-sm"
              onMouseEnter={(ev) => abrirTip(ev, { desc: en ? 'Delete' : 'Excluir' })}
              onMouseLeave={fecharTip}
              onClick={() => supabaseClient.rpc('excluir_entrada_diario', { p_id: m.id }).then(carregar)}>
              <i className="ti ti-trash" aria-hidden="true" />
            </button>
          )}
        </TableCell>
      </TableRow>
    );
  } else if (tipoAba === 'criatura') {
    cols = [
      { key: 'nome', label: en ? 'Name' : 'Nome' },
      { key: 'acoes', label: '', ordena: false, style: { width: 96 } },
    ];
    linha = (c) => {
      const abrir = async () => {
        const { data } = await supabaseClient.from('criaturas').select('*').eq('id', c.id).maybeSingle();
        setViewingLore(data ? { ...data, tipo: 'criatura', ref_id: data.id } : { ...c, tipo: 'criatura', ref_id: c.id });
      };
      return (
        <TableRow key={c.id} style={{ cursor: 'pointer' }} onClick={abrir}>
          <TableCell className="best-name">{c.nome}</TableCell>
          <TableCell className="diario-td-acoes" onClick={(ev) => ev.stopPropagation()}>
            {botaoVer(abrir)}
            {souDono && (importados.has(`criatura:${c.id}`)
              ? renderBotaoImportado('criatura', c.id)
              : botaoImportar('criatura', c.id))}
          </TableCell>
        </TableRow>
      );
    };
  } else {
    // Personagens / Lugares — as duas origens na mesma tabela.
    cols = [
      { key: 'nome', label: en ? 'Name' : 'Nome' },
      /* Lugares mistura Reino e Cidade — a coluna diz qual é. */
      ...(tipoAba === 'lugar' ? [{ key: 'tipo', label: en ? 'Type' : 'Tipo' }] : []),
      { key: 'origem', label: en ? 'Origin' : 'Origem' },
      { key: 'acoes', label: '', ordena: false, style: { width: 140 } },
    ];
    linha = (e) => {
      const refId          = e.slug || e.id;
      const foiImportado   = importados.has(`${e.tipo}:${String(refId)}`);
      const isOwn          = souDono && e.origem === 'pessoal';
      const isMestreEntry  = !e.criado_por_personagem_id;
      // Entradas de outro jogador que compartilhou — também importáveis
      const isOutroJogador = souDono && !isOwn && !isMestreEntry;
      const podeImportar   = (isMestreEntry || isOutroJogador) && !foiImportado;
      return (
        <TableRow key={`${e.tipo}:${String(refId)}`} style={{ cursor: 'pointer' }} onClick={() => setViewingLore(e)}>
          <TableCell className="best-name">
            {/* Compartilhar com a mesa continua sendo um clique só,
                dentro da célula do nome — o que é do PJ ele marca; o que
                veio da aventura não tem o que marcar. */}
            {isOwn && (
              <input type="checkbox"
                className="diario-check-compartilha"
                checked={!!e.compartilhado}
                disabled={savingVinculo}
                onMouseEnter={(ev) => abrirTip(ev, { desc: en ? 'Share with the table' : 'Compartilhar com a mesa' })}
                onMouseLeave={fecharTip}
                onClick={(ev) => ev.stopPropagation()}
                onChange={(ev) => toggleCompartilhar(e.tipo, refId, ev.target.checked)}
              />
            )}
            {e.nome}
          </TableCell>
          {tipoAba === 'lugar' && <TableCell>{diarioTipoLabel(e.tipo, lang)}</TableCell>}
          {/* Quem registrou continua à mão no tooltip: "Aventura" junta o
              Mestre e os outros jogadores da mesa. */}
          <TableCell
            onMouseEnter={e.origem === 'aventura'
              ? (ev) => abrirTip(ev, { desc: (en ? 'Recorded by ' : 'Registrado por ') + (e.criado_por_nome || (en ? 'Game Master' : 'Mestre')) })
              : undefined}
            onMouseLeave={e.origem === 'aventura' ? fecharTip : undefined}>
            {rotuloOrigem(e.origem)}
          </TableCell>
          <TableCell className="diario-td-acoes" onClick={(ev) => ev.stopPropagation()}>
            {botaoVer(() => setViewingLore(e))}
            {isOwn && (
              <>
                <button className="btn-icon btn-sm"
                  onMouseEnter={(ev) => abrirTip(ev, { desc: en ? 'Edit' : 'Editar' })}
                  onMouseLeave={fecharTip}
                  onClick={() => { setTipoNovo(e.tipo); setEditando({ ...e }); }}>
                  <i className="ti ti-pencil" aria-hidden="true" />
                </button>
                <button className="btn-icon btn-danger btn-sm"
                  onMouseEnter={(ev) => abrirTip(ev, { desc: en ? 'Delete' : 'Excluir' })}
                  onMouseLeave={fecharTip}
                  onClick={() => excluirLore(refId)}>
                  <i className="ti ti-trash" aria-hidden="true" />
                </button>
              </>
            )}
            {souDono && (foiImportado
              ? renderBotaoImportado(e.tipo, refId)
              : podeImportar ? botaoImportar(e.tipo, refId, e) : null)}
          </TableCell>
        </TableRow>
      );
    };
  }

  const tabela = pagina.length === 0 ? (
    <div className="best-empty">{textoVazio}</div>
  ) : (
    <>
      <DiarioTabela cols={cols} wrapRef={wrapRef} sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>
        {pagina.map(linha)}
      </DiarioTabela>
      <BestPagination page={page} safePage={safePage} totalPages={totalPages} setPage={setPage} lang={lang} />
    </>
  );

  const erro = error && <div className="err-msg" style={{ margin: '0 20px 20px' }}>{error}</div>;

  const modais = (
    <>
      {viewingLore && (
        <DetalheEntradaModal
          entrada={viewingLore}
          lang={lang}
          lore={lore || []}
          onClose={() => setViewingLore(null)}
        />
      )}
      {formModal}
      {memoriaAberta !== null && (
        <MemoriaModal
          memoria={memoriaAberta.id ? memoriaAberta : null}
          pjId={pjId}
          lang={lang}
          onClose={() => setMemoriaAberta(null)}
          onSaved={() => { setMemoriaAberta(null); carregar(); }}
        />
      )}
      <PortalTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </>
  );

  /* Dentro da ficha (Mestre) isto é uma ABA, e o cabeçalho é o da ficha —
     repetir um aqui daria dois títulos empilhados. A aba ainda escolhe o
     tipo; na barra lateral cada tipo é uma página própria. */
  if (!tipoFixo) {
    return (
      <div className="diario-view">
        <div className="lore-mng-page-body">
          <p className="subhead">
            {en
              ? 'Use the journal as a personal glossary to organize characters, kingdoms, cities, items and other important details of your adventure. Then choose which of this information will be available for consultation during this story.'
              : 'Use o diário como um glossário pessoal para organizar personagens, reinos, cidades, itens e outros detalhes importantes da sua aventura. Depois, escolha quais dessas informações ficarão disponíveis para consulta durante esta história.'}
          </p>
          <div className="lore-mng-toolbar">
            <div className="diario-subtabs" role="tablist">
              {['memoria', ...DIARIO_TIPOS].map((t) => (
                <button key={t}
                  className={tipoAba === t ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
                  onClick={() => setTipoAba(t)}>
                  {diarioTipoLabel(t, lang)}
                </button>
              ))}
            </div>
          </div>
          <div className="best-toolbar-bestiario">{buscaENovo}</div>
          {erro}
          {tabela}
        </div>
        {modais}
      </div>
    );
  }

  /* Na barra lateral é uma PÁGINA, com a mesma moldura de Itens, Magias e
     Bestiário — as peças soltas direto no card, sem wrapper próprio, porque
     .best é coluna flex e é ela que estica a tabela e centraliza o vazio. */
  return (
    <div className="fp-page">
      <div className="fp-card best best-auto">
        <BestPageHeader
          eyebrow={en ? 'JOURNAL' : 'DIÁRIO'}
          title={tituloDaSecao}
          right={buscaENovo}
        />
        {erro}
        {tabela}
      </div>
      {modais}
    </div>
  );
}


// ---------- ArteModal (Mestre) — define imagem_url de criatura ou entrada de lore ----------
function ArteModal({ entrada, lang, onClose, onSaved }) {
  const en = lang === 'en';
  const [url, setUrl] = useState(entrada.imagem_url || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [imgOk, setImgOk] = useState(!!entrada.imagem_url);

  const salvar = async () => {
    setSaving(true); setError(null);
    // definir_arte_lore (migration 015): substitui o UPDATE direto que
    // quebraria contra reinos/cidades/npcs (só RPC escreve nessas tabelas)
    // e já não funcionava contra lore_entradas (mesmo padrão de RPC-only).
    const id = entrada.ref_id ?? entrada.id;
    const { data, error: err } = await supabaseClient.rpc('definir_arte_lore', {
      p_tipo: entrada.tipo,
      p_id: String(id),
      p_imagem_url: url.trim() || null,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    if (data && data.ok === false) { setError(data.motivo || 'erro'); return; }
    onSaved(url.trim() || null);
  };

  return (
    <ModalShell
      title={en ? `Artwork — ${entrada.nome}` : `Arte — ${entrada.nome}`}
      lang={lang}
      onClose={onClose}
      onCancel={onClose}
      cancelLabel={en ? 'Cancel' : 'Cancelar'}
      onConfirm={salvar}
      confirmLabel={saving ? (en ? 'Saving…' : 'Salvando…') : (en ? 'Save' : 'Salvar')}
      confirmDisabled={saving}
    >
      <label className="diario-field-label">{en ? 'Image URL' : 'URL da imagem'}</label>
      <input
        className="diario-input"
        type="url"
        value={url}
        onChange={(e) => { setUrl(e.target.value); setImgOk(false); }}
        placeholder="https://…"
        autoFocus
      />
      {url.trim() && (
        <div className="diario-img-preview-wrap">
          <img
            src={url.trim()}
            alt=""
            className="diario-img-preview" style={{ display: imgOk ? 'inline-block' : 'none' }}
            onLoad={() => setImgOk(true)}
            onError={() => setImgOk(false)}
          />
          {!imgOk && (
            <div className="diario-img-preview-msg">
              {en ? 'Preview unavailable' : 'Pré-visualização indisponível'}
            </div>
          )}
        </div>
      )}
      {error && <div className="err-msg diario-err-mt">{error}</div>}
    </ModalShell>
  );
}

/* A SelecionarBaseModal viveu neste ponto do arquivo até 17/09/2026.

   Era a tela de "escolher a base do fork": ao clicar no + de um reino, cidade
   ou NPC, ela perguntaria "começar em branco, ou partir de uma entrada do
   catálogo do mundo?", e a escolhida seria copiada como ponto de partida
   (p_slug_origem em salvar_lore_entrada).

   Nunca foi RENDERIZADA por ninguém. O + sempre foi direto ao formulário
   vazio, e o comentário dela ainda dizia "Aberta ao clicar Novo X em
   GerenciarLoreView" — descrição de um fluxo que não existia. Ficou
   inalcançável por tempo indeterminado, com lista, busca e tudo pronto.

   Removida quando o objetivo dela ganhou um caminho melhor: o lápis nas linhas
   "Mundo" da tabela (ver `editavel` em GerenciarLoreView). Partir de uma
   entrada do mundo agora é ver a entrada na tabela, clicar no lápis e editar —
   sem escolher a base antes de poder olhar o que se está escolhendo. O fork em
   si continua no banco, pelo p_id: salvar_lore_entrada, ao receber o slug de um
   global, cai em `slug_base := p_id → criar_copia_*`. */

// ---------- SelectPill — cópia local de 12-batalha/batalha.jsx ----------
// SelectPill não é exportado via window pelo batalha.jsx (só BatalhasHistoriaView
// é exposto). Seguindo o padrão do projeto de cada módulo declarar suas próprias
// versões locais (ver nota no cabeçalho), copiamos aqui pra uso no LoreEntradaForm.
// Se o SelectPill for futuramente movido para um módulo compartilhado (ex: shell.jsx),
// remover esta cópia e usar o import compartilhado.
function SelectPill({ options = [], value, onChange, placeholder, disabled, label }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find((o) => String(o.value) === String(value));
  const displayLabel = selected
    ? (selected.labelBotao != null ? selected.labelBotao : selected.label)
    : (placeholder || '—');

  const pillStyle = {
    background: 'rgba(24,17,8,0.92)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(106,85,48,0.50)', borderRadius: 999, height: 40,
    fontFamily: "'Lora', serif", fontSize: 13, flexShrink: 0, width: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
    color: '#E8DDC6', padding: '0 12px 0 16px', cursor: disabled ? 'default' : 'pointer',
    outline: 'none', outlineOffset: 0, boxShadow: 'none', appearance: 'none', WebkitAppearance: 'none',
    WebkitTapHighlightColor: 'transparent', transition: 'border-color .15s',
  };

  const dropStyle = {
    position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: '100%',
    background: 'rgba(18,12,5,0.98)', border: '1px solid rgba(201,164,78,0.20)', borderRadius: 8,
    padding: 4, margin: 0, listStyle: 'none', zIndex: 200,
    boxShadow: '0 16px 40px -12px rgba(0,0,0,0.9)',
    maxHeight: 220, overflowY: 'auto',
  };

  return (
    <div className="motor-field" ref={ref} style={{ position: 'relative' }}>
      {label && <span>{label}</span>}
      <button type="button" className="select-pill-btn" data-open={open ? 'true' : 'false'} style={pillStyle} disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => { e.currentTarget.blur(); !disabled && setOpen((v) => !v); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v); } }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayLabel}</span>
        <i className="ti ti-chevron-down" aria-hidden="true"
           style={{ fontSize: 12, color: '#C9A44E', opacity: 0.7, flexShrink: 0,
                    transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>
      {open && (
        <ul className="select-pill-drop" style={dropStyle}>
          {options.map((opt) => {
            const active = String(opt.value) === String(value);
            return (
              <li key={opt.value}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                  borderRadius: 6, cursor: 'pointer', fontFamily: "'Lora', serif", fontSize: 13,
                  color: active ? '#C9A44E' : '#C8BCAA', background: 'transparent', whiteSpace: 'pre-wrap' }}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(201,164,78,0.10)'; e.currentTarget.style.color = '#E8DDC6'; } }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = active ? '#C9A44E' : '#C8BCAA'; }}
                onClick={() => { onChange(opt.value); setOpen(false); }}>
                {active && <i className="ti ti-check" style={{ fontSize: 12, color: '#C9A44E', flexShrink: 0 }} />}
                {!active && <span style={{ width: 20, flexShrink: 0 }} />}
                {opt.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------- QuantityStepper — cópia local de 12-batalha/batalha.jsx ----------
// Mesmo padrão do SelectPill acima: batalha.jsx não exporta QuantityStepper via
// window (só BatalhasHistoriaModal é exposto), então copiamos aqui. É o
// seletor padrão do projeto pra quantidade/contagem numérica (usado na aba
// Item do painel de Ação em batalha) — pill igual ao SelectPill, mas com
// botões +/- em vez de dropdown. Usado aqui pra Estágio, os 7 atributos e
// Nível (magia), que têm faixa numérica fixa e pequena.
function QuantityStepper({ value, onChange, min = 1, max = Infinity, step = 1, disabled, label }) {
  const clamp = (v) => Math.max(min, Math.min(max, v));
  const dec = () => { if (disabled) return; const v = clamp((Number(value) || 0) - step); if (v !== value) onChange(v); };
  const inc = () => { if (disabled) return; const v = clamp((Number(value) || 0) + step); if (v !== value) onChange(v); };

  // estilos movidos para CSS (.qty-stepper-pill, .qty-stepper-btn)


  return (
    <div className="motor-field">
      {label && <span>{label}</span>}
      {/* O pill próprio saiu em 17/09/2026: o desenho do sistema é um só, e
          mora em 01-core (QuantidadeStepper). Esta função continua existindo
          pela ASSINATURA — dezenas de chamadas passam min/max/step/label —,
          mas o que ela desenha agora é o mesmo de todo o resto. */}
      <QuantidadeStepper
        value={value} onChange={onChange}
        min={min} max={max === Infinity ? undefined : max} step={step}
        disabled={disabled} label={label}
      />
    </div>
  );
}

// ---------- LoreEntradaForm (corpo do form, usado dentro do modal manual de GerenciarLoreModal) ----------
// Campos REAIS de cada tabela (reinos/cidades/npcs — catálogo global,
// migration 014/015), não mais o JSONB livre de versões anteriores.
// reino (cidade) e origem/cidade (npc) são FK por slug — viram <select>
// com as opções limitadas às CÓPIAS da própria história (decisão
// combinada: Mestre só liga a algo que ele mesmo já "importou"/forkou
// antes, não ao catálogo global direto).
/* `onTipoChange` (17/09/2026): "Novo reino e nova cidade serão a mesma coisa,
   então pode usar uma única tabela." (usuário)

   Reino e cidade deixaram de ter dois botões "Novo" (Mestre) e um modalzinho
   de escolha antes do formulário (Jogador): são um "Lugar" só, e o tipo é o
   PRIMEIRO CAMPO daqui. Como as duas telas já compartilhavam este formulário,
   pôr o seletor nele resolveu a bifurcação nas duas de uma vez — em vez de
   dois arranjos que começariam a divergir.

   No banco nada mudou: reinos e cidades continuam em tabelas próprias e
   salvar_lore_entrada segue recebendo p_tipo (decisão explícita do usuário,
   "só na tela").

   Só na CRIAÇÃO. Trocar o tipo de um lugar que já existe não é mudar um
   campo: é mover a linha de uma tabela pra outra, levando o slug e as FKs que
   apontam pra ela (cidade.reino, npc.cidade, npc.origem). Sem `onTipoChange`
   ou com `entrada.id` preenchido, o seletor não aparece. */
function LoreEntradaForm({ tipo, entrada, onChange, onTipoChange, reinosDaHistoria, cidadesDaHistoria, t, lang }) {
  // i18n-sync (Fase 3.1, 07/2026): strings vêm de t.lore.form (COPY[lang]),
  // padrão de 05-convites — este form era PT-only. Fallback defensivo pro
  // COPY global cobre call sites que ainda não passem a prop.
  const tl = (t && t.lore && t.lore.form)
    || (typeof COPY !== 'undefined' && ((COPY[typeof lang !== 'undefined' ? lang : 'pt'] || COPY.pt).lore || {}).form)
    || {};
  const v = entrada || { nome: '', descricao: '', imagem_url: '', atributos: {} };
  const set = (patch) => onChange({ ...v, ...patch });
  const setAttr = (k, val) => onChange({ ...v, atributos: { ...(v.atributos || {}), [k]: val } });

  // Um lugar NOVO escolhe aqui se é reino ou cidade. Ver a nota acima.
  const escolheTipoLugar = typeof onTipoChange === 'function'
    && LUGAR_TIPOS.has(tipo)
    && !(entrada && entrada.id);

  return (
    <>
      {escolheTipoLugar && (
        <>
          <label className="diario-field-label">{tl.tipoDeLugar}</label>
          <div className="diario-lugar-tipo" role="radiogroup" aria-label={tl.tipoDeLugar}>
            {[
              { valor: 'reino',  icone: DIARIO_TIPO_ICON.reino },
              { valor: 'cidade', icone: DIARIO_TIPO_ICON.cidade },
            ].map((o) => (
              <label key={o.valor} className={'diario-lugar-tipo-op' + (tipo === o.valor ? ' on' : '')}>
                <input
                  type="radio"
                  name="diario-lugar-tipo"
                  value={o.valor}
                  checked={tipo === o.valor}
                  onChange={() => onTipoChange(o.valor)}
                />
                <i className={'ti ' + o.icone} aria-hidden="true" />
                {diarioTipoLabel(o.valor, lang)}
              </label>
            ))}
          </div>
        </>
      )}

      <label className="diario-field-label">{tl.nome}</label>
      <input className="diario-input" type="text" value={v.nome} onChange={(e) => set({ nome: e.target.value })} autoFocus />

      <label className="diario-field-label diario-field-label--mt">{tl.descricao}</label>
      <textarea className="diario-textarea" rows={5} value={v.descricao} onChange={(e) => set({ descricao: e.target.value })} />

      <label className="diario-field-label diario-field-label--mt">{tl.imagem}</label>
      <input className="diario-input" type="text" value={v.imagem_url || ''} onChange={(e) => set({ imagem_url: e.target.value })} placeholder="https://…" />

      {tipo === 'npc' && (
        <div className="diario-form-grid">
          <div>
            <label className="diario-field-label">{tl.deus}</label>
            <SelectPill
              value={v.atributos?.deus || ''}
              onChange={(val) => setAttr('deus', val || '')}
              options={[
                { value: '', label: '—' },
                ...(typeof GAME_DATA !== 'undefined' && GAME_DATA.deuses
                  ? GAME_DATA.deuses.map((d) => ({ value: d, label: d }))
                  : []),
              ]}
            />
          </div>
          <div>
            <label className="diario-field-label">{tl.raca}</label>
            <SelectPill
              value={v.atributos?.raca || ''}
              onChange={(val) => setAttr('raca', val || '')}
              options={[
                { value: '', label: '—' },
                ...(typeof GAME_DATA !== 'undefined' && GAME_DATA.racas
                  ? Object.keys(GAME_DATA.racas).map((r) => ({ value: r, label: r }))
                  : []),
              ]}
            />
          </div>
          <div>
            <label className="diario-field-label">{tl.localizacao}</label>
            <SelectPill
              value={v.atributos?.cidade || ''}
              onChange={(val) => setAttr('cidade', val || null)}
              options={[
                { value: '', label: '—' },
                ...(cidadesDaHistoria || []).map((c) => ({ value: c.id, label: c.nome })),
              ]}
            />
          </div>
          <div>
            <label className="diario-field-label">{tl.cidadeNatal}</label>
            <SelectPill
              value={v.atributos?.origem || ''}
              onChange={(val) => setAttr('origem', val || null)}
              options={[
                { value: '', label: '—' },
                ...(cidadesDaHistoria || []).map((c) => ({ value: c.id, label: c.nome })),
              ]}
            />
          </div>
          <div>
            <label className="diario-field-label">{tl.classeSocial}</label>
            <input className="diario-input" type="text" value={v.atributos?.profissao || ''} onChange={(e) => setAttr('profissao', e.target.value)} />
          </div>
          <div>
            <label className="diario-field-label">{tl.idade}</label>
            <input className="diario-input" type="text" value={v.atributos?.idade || ''} onChange={(e) => setAttr('idade', e.target.value)} />
          </div>
          <div>
            <label className="diario-field-label">{tl.familia}</label>
            <input className="diario-input" type="text" value={v.atributos?.familia || ''} onChange={(e) => setAttr('familia', e.target.value)} />
          </div>
          <div>
            <label className="diario-field-label">{tl.relacao}</label>
            <input className="diario-input" type="text" value={v.atributos?.relacao || ''} onChange={(e) => setAttr('relacao', e.target.value)} />
          </div>
          <div>
            <label className="diario-field-label">{tl.status}</label>
            <input className="diario-input" type="text" value={v.atributos?.status || ''} onChange={(e) => setAttr('status', e.target.value)} />
          </div>
          <div className="diario-form-col-span">
            <label className="diario-field-label">{tl.rumores}</label>
            <textarea className="diario-textarea" rows={3} value={v.atributos?.rumores || ''} onChange={(e) => setAttr('rumores', e.target.value)} />
          </div>
        </div>
      )}
      {tipo === 'reino' && (
        <div className="diario-form-grid">
          <div>
            <label className="diario-field-label">{tl.icone}</label>
            <input className="diario-input" type="text" value={v.atributos?.icone || ''} onChange={(e) => setAttr('icone', e.target.value)} placeholder="https://…" />
          </div>
          <div className="diario-form-col-span">
            <label className="diario-field-label">{tl.governo}</label>
            <textarea className="diario-textarea" rows={3} value={v.atributos?.governo || ''} onChange={(e) => setAttr('governo', e.target.value)} />
          </div>
          <div className="diario-form-col-span">
            <label className="diario-field-label">{tl.cultura}</label>
            <textarea className="diario-textarea" rows={3} value={v.atributos?.cultura || ''} onChange={(e) => setAttr('cultura', e.target.value)} />
          </div>
          <div className="diario-form-col-span">
            <label className="diario-field-label">{tl.historiaRecente}</label>
            <textarea className="diario-textarea" rows={3} value={v.atributos?.historia_recente || ''} onChange={(e) => setAttr('historia_recente', e.target.value)} />
          </div>
          <div className="diario-form-col-span">
            <label className="diario-field-label">{tl.rumores}</label>
            <textarea className="diario-textarea" rows={3} value={v.atributos?.rumores || ''} onChange={(e) => setAttr('rumores', e.target.value)} />
          </div>
        </div>
      )}
      {tipo === 'cidade' && (
        <div className="diario-form-grid">
          <div>
            <label className="diario-field-label">{tl.reino}</label>
            <SelectPill
              value={v.atributos?.reino || ''}
              onChange={(val) => setAttr('reino', val || null)}
              options={[
                { value: '', label: '—' },
                ...(reinosDaHistoria || []).map((r) => ({ value: r.id, label: r.nome })),
              ]}
            />
          </div>
          <div>
            <label className="diario-field-label">{tl.populacao}</label>
            <input className="diario-input" type="number" min="0" value={v.atributos?.populacao ?? ''} onChange={(e) => setAttr('populacao', e.target.value === '' ? null : Number(e.target.value))} />
          </div>
          <div>
            <label className="diario-field-label">
              <input type="checkbox" checked={!!v.atributos?.capital} onChange={(e) => setAttr('capital', e.target.checked)} className="diario-checkbox-inline" />
              {tl.capitalDoReino}
            </label>
          </div>
          <div className="diario-form-col-span">
            <label className="diario-field-label">{tl.rumores}</label>
            <textarea className="diario-textarea" rows={3} value={v.atributos?.rumores || ''} onChange={(e) => setAttr('rumores', e.target.value)} />
          </div>
        </div>
      )}
    </>
  );
}


/* A LorePaginacao — uma paginação .best-pag escrita à mão aqui — viveu neste
   ponto do arquivo até 17/09/2026. Ela existia porque a tela do Mestre era
   uma lista solta, não uma tabela do catálogo. Com a tela virando tabela
   padrão, a paginação passou a ser a BestPagination do bestiário, a mesma de
   Itens e Magias — o mesmo motivo pelo qual a busca virou BestBuscaENovo. */

/* O formulário "Nova Criatura" viveu aqui até 10/09/2026. Ele fazia
   .from('criaturas').insert() direto e estava QUEBRADO em produção por DOIS
   motivos independentes, cada um suficiente sozinho: (a) as 5 tabelas de
   catálogo têm RLS ligada e só tinham política de SELECT, então a escrita
   nunca passava; e (b) o payload incluía `imagem_url`, coluna que não existe
   em `criaturas` (existe em diario_entradas e lore_entradas) — o PostgREST
   rejeitaria por schema antes mesmo de chegar na RLS. Criar criatura agora é
   no Bestiário, pelo editor de catálogo do admin. As fórmulas derivadas dele
   viraram 09-bestiario/criatura-formulas.jsx. */

/* ---------- PermissaoEntradaModal — o modal do botão de olho -------------
   "Do lado do botão de editar (lápis), vamos adicionar um botão de ver (olho),
   onde teremos um modal para permitir quem pode ver aquela entrada, na
   história selecionada." (usuário, 17/09/2026)

   O olho MUDOU DE FUNÇÃO nesta rodada. Ele abria a ficha da entrada; a ficha
   é o que a EXPANSÃO DA LINHA mostra agora, que era o outro pedido do mesmo
   dia ("as informações dentro de NPCs e lugares vão ser mostradas quando
   expandir a entrada"). O olho ficou livre para a permissão.

   Três rádios, não caixas de seleção, porque os três estados são exclusivos —
   é o que as colunas do banco sabem representar (ver visibilidadeDaEntrada).
   Oferecer "ninguém" e "só a Thalia" marcáveis juntos convidaria a um estado
   que não existe.

   O Salvar entrega UM patch, pra UM update. A versão anterior gravava por
   clique de checkbox, dentro da ficha: marcar três PJs eram quatro idas ao
   banco (o disponibilizar, mais uma por PJ), cada uma podendo falhar no meio
   e deixar a permissão pela metade.

   Sem protagonista nenhum, "alguns" não é oferecido: não há quem escolher, e
   o Salvar ficaria travado para sempre sem dizer por quê.

   Cobertura: permissao-entrada-modal.test.jsx. */
function PermissaoEntradaModal({ entrada, historia, protagonistas, lang, onClose, onSalvar, salvando }) {
  const en = lang === 'en';
  const tp = ((COPY[lang] || COPY.pt).lore || {}).permissao || {};
  const pjs = Array.isArray(protagonistas) ? protagonistas : [];

  /* O tipo REAL, não o da aba: "lugar" é uma aba que mistura reino e cidade,
     e a coluna a escrever depende de qual dos dois a entrada é. */
  const tipo = entrada.tipo;
  const refId = entrada.id;

  const inicial = visibilidadeDaEntrada(historia, tipo, refId);
  const [modo, setModo] = useState(inicial.modo);
  const [pjIds, setPjIds] = useState(inicial.pjIds);

  const togglePj = (id) => setPjIds((prev) => (
    prev.some((x) => String(x) === String(id))
      ? prev.filter((x) => String(x) !== String(id))
      : [...prev, id]
  ));

  // "alguns" sem ninguém marcado é "todos" disfarçado — ver patchDeVisibilidade.
  const faltaEscolher = modo === 'alguns' && pjIds.length === 0;

  const opcoes = [
    { valor: 'ninguem', rotulo: tp.ninguem, dica: tp.ninguemDica, icone: 'ti-eye-off' },
    { valor: 'todos',   rotulo: tp.todos,   dica: tp.todosDica,   icone: 'ti-users' },
    // Sem PJs na história não há terceira opção.
    ...(pjs.length > 0
      ? [{ valor: 'alguns', rotulo: tp.alguns, dica: tp.algunsDica, icone: 'ti-user-check' }]
      : []),
  ];

  return (
    <ModalShell
      title={`${tp.titulo}: ${entrada.nome || ''}`}
      lang={lang}
      size="sm"
      extraClass="diario-permissao-modal"
      onClose={onClose}
      onCancel={onClose}
      cancelDisabled={!!salvando}
      onConfirm={() => onSalvar(patchDeVisibilidade(historia, tipo, refId, modo, pjIds))}
      confirmDisabled={!!salvando || faltaEscolher}
    >
      <div className="diario-permissao-opcoes" role="radiogroup">
        {opcoes.map((o) => (
          <label key={o.valor} className={'diario-permissao-opcao' + (modo === o.valor ? ' on' : '')}>
            <input
              type="radio"
              name="diario-permissao"
              value={o.valor}
              checked={modo === o.valor}
              disabled={!!salvando}
              onChange={() => setModo(o.valor)}
            />
            <span className="diario-permissao-texto">
              <span className="diario-permissao-rotulo">
                <i className={'ti ' + o.icone} aria-hidden="true" />
                {o.rotulo}
              </span>
              <span className="diario-permissao-dica">{o.dica}</span>
            </span>
          </label>
        ))}
      </div>

      {modo === 'alguns' && (
        <div className="diario-liberar-wrap diario-liberar-wrap--modal">
          <div className="diario-liberar-lista">
            {pjs.map((pj) => {
              const on = pjIds.some((x) => String(x) === String(pj.id));
              return (
                <label key={pj.id} className={'diario-liberar-item' + (on ? ' diario-liberar-item--on' : '')}>
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={!!salvando}
                    onChange={() => togglePj(pj.id)}
                  />
                  <span className="diario-liberar-nome">{pj.nome}</span>
                </label>
              );
            })}
          </div>
          {faltaEscolher && (
            <div className="diario-permissao-aviso">{tp.escolhaAlguem}</div>
          )}
        </div>
      )}

      {pjs.length === 0 && (
        <div className="diario-permissao-aviso">{tp.semProtagonistas}</div>
      )}
    </ModalShell>
  );
}

// ---------- GerenciarLoreView (Mestre) — página, não modal ----------
// Segue o mesmo molde de src/06-historias/historias.jsx::GerenciarLojaView:
// header .ms-header + classe própria (seta de voltar, eyebrow, título da
// história), corpo solto em .lore-mng-page-body (sem moldura/caixa própria,
// igual ao bestiário/loja). O form de Novo/Editar item de lore CONTINUA como
// ModalShell normal por cima da página (decisão explícita — não amassar
// nesse outro padrão).

/* `tipoFixo` (17/09/2026): "Não está aparecendo para o mestre o menu NPCs e
   lugares, vinculados à história selecionada." (usuário)

   O Mestre já administrava este Lore, mas só por dentro — Histórias → card da
   mesa → botão "Lore". O menu lateral dele não tinha as duas seções que o
   Jogador tem há tempos. Agora tem, e são ESTA MESMA tela travada num tipo:
   mesmo caminho que o DiarioView do Jogador tomou em 12/09/2026, e pelo mesmo
   motivo — não é tela nova, é a escolha de aba que deixa de ser oferecida.

   Com tipoFixo, também some o "voltar": quem chegou pelo menu lateral não veio
   de lugar nenhum. É por isso que o botão depende de `onClose`, e não de uma
   flag própria. */
function GerenciarLoreView({ historia, lang, onClose, onChanged, tipoFixo }) {
  const en = lang === 'en';
  // Fallback: quantas linhas mostrar antes de useFitPageSize medir a tela.
  // Mesmo arranjo do DiarioView do Jogador.
  const PAGE_SIZE_FALLBACK = 10;
  const [tipoAba, setTipoAba] = useState(tipoFixo || 'npc'); // npc | lugar | criatura (disponibilizar)
  const [lore, setLore] = useState(null);
  const [criaturas, setCriaturas] = useState(null);
  // Catálogo GLOBAL (canônico) de reino/cidade/npc — migration 016. Só
  // exibido (checkbox + ver), nunca editável/excluível por aqui, mesmo
  // padrão que `criaturas` já tinha. Chave por tipo pra casar com tipoAba.
  const [catalogoGlobal, setCatalogoGlobal] = useState({ reino: [], cidade: [], npc: [] });
  const [error, setError] = useState(null);
  const [editando, setEditando] = useState(null);
  const [savingVinculo, setSavingVinculo] = useState(false);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [tipoNovo, setTipoNovo] = useState(null);
  /* A linha ABERTA, por chave (17/09/2026). O `viewingLore` que existia aqui
     era a entrada aberta no modal de ficha — a ficha virou a expansão da
     linha ("as informações dentro de NPCs e lugares vão ser mostradas quando
     expandir a entrada", usuário), e o modal saiu junto com o olho antigo.
     Uma chave e não a entrada inteira: a lista se recarrega (carregar()) e uma
     referência velha manteria a linha aberta mostrando dados de antes. */
  const [expandida, setExpandida] = useState(null);
  // A entrada cuja PERMISSÃO está aberta — o novo papel do olho.
  const [permissaoDe, setPermissaoDe] = useState(null);
  const [tip, abrirTip, fecharTip, manterTip] = usePortalTooltip(80);
  // Protagonistas da história — carregados uma vez, usados no modal de permissão
  const [protagonistas, setProtagonistas] = useState([]);
  const wrapRef = React.useRef(null);
  useEffect(() => { setPage(1); setQuery(''); setExpandida(null); }, [tipoAba]);

  const carregar = async () => {
    setError(null); 
    const [
      { data: loreData, error: loreErr },
      { data: critData, error: critErr },
      { data: reinoGData, error: reinoGErr },
      { data: cidadeGData, error: cidadeGErr },
      { data: npcGData, error: npcGErr },
    ] = await Promise.all([
      supabaseClient.rpc('listar_lore_historia', { p_historia_id: historia.id }),
      supabaseClient.from('criaturas').select('id, nome, tipo').order('nome'),
      supabaseClient.rpc('listar_catalogo_global', { p_tipo: 'reino' }),
      supabaseClient.rpc('listar_catalogo_global', { p_tipo: 'cidade' }),
      supabaseClient.rpc('listar_catalogo_global', { p_tipo: 'npc' }),
    ]);
    if (loreErr) { setError(loreErr.message); return; }
    if (loreData && loreData.ok === false) { setError(loreData.motivo || 'erro'); return; }
    setLore((loreData && loreData.entradas) || []);
    if (critErr) { setError(critErr.message); return; }
    setCriaturas(critData || []);
    // Catálogo global: erro num tipo não derruba a tela (Mestre ainda
    // vê cópias/criaturas normalmente) — só loga e cai pra lista vazia
    // naquele tipo. Diferente de lore/criaturas, que bloqueiam a tela via
    // setError porque são o dado principal da aba.
    [['reino', reinoGData, reinoGErr], ['cidade', cidadeGData, cidadeGErr], ['npc', npcGData, npcGErr]]
      .forEach(([t, data, err]) => {
        if (err || (data && data.ok === false)) console.error('listar_catalogo_global', t, err || data.motivo);
      });
    setCatalogoGlobal({
      reino: (reinoGData && reinoGData.ok !== false && reinoGData.entradas) || [],
      cidade: (cidadeGData && cidadeGData.ok !== false && cidadeGData.entradas) || [],
      npc: (npcGData && npcGData.ok !== false && npcGData.entradas) || [],
    });
    // Protagonistas: carrega nomes dos PJs vinculados à história pra exibir
    // no seletor de liberação por PJ dentro de DetalheEntradaModal (Mestre).
    // protagonista_ids vem do objeto historia passado como prop; se não tiver
    // ou estiver vazio, o seletor ficará vazio mas não quebra.
    const pjIds = historia.protagonista_ids || [];
    if (pjIds.length > 0) {
      const { data: pjData } = await supabaseClient
        .from('personagens')
        .select('id, nome')
        .in('id', pjIds)
        .order('nome');
      setProtagonistas(pjData || []);
    } else {
      setProtagonistas([]);
    }
  };

  useEffect(() => { carregar(); }, [historia.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const salvarLore = async () => {
    const tipoReal = tipoNovo || tipoAba;
    const { data, error: err } = await supabaseClient.rpc('salvar_lore_entrada', {
      p_id: editando.id ?? null,
      p_historia_id: historia.id,
      p_tipo: tipoReal,
      p_nome: editando.nome,
      p_descricao: editando.descricao,
      p_imagem_url: editando.imagem_url || null,
      p_atributos: editando.atributos || {},
    });
    if (err) { setError(err.message); return; }
    if (data && data.ok === false) { setError(data.motivo || 'erro'); return; }
    setEditando(null);
    setTipoNovo(null);
    await carregar();
    if (onChanged) onChanged();
  };

  const excluirLore = async (id) => {
    const { data, error: err } = await supabaseClient.rpc('excluir_lore_entrada', { p_id: id });
    if (err) { setError(err.message); return; }
    if (data && data.ok === false) { setError(data.motivo || 'erro'); return; }
    await carregar();
    if (onChanged) onChanged();
  };

  /* salvarVisibilidade — grava o patch que o PermissaoEntradaModal montou.
     Substituiu `toggleDisponibilizar` e `toggleLiberarPj` (17/09/2026): as
     duas escreviam em `historias` por CLIQUE, uma a coluna <tipo>_ids e a
     outra a lore_acesso_pj, e liberar uma entrada pra três PJs eram quatro
     updates em sequência — cada um podendo falhar no meio e deixar a
     permissão pela metade. Agora o modal decide tudo e entrega um patch só.

     ⚠️ .select() é ESSENCIAL, e não é zelo: sem ele um UPDATE bloqueado por
     RLS volta como SUCESSO com 0 linhas afetadas, sem erro. O checkbox antigo
     "marcava" na tela e nada persistia — o personagem nunca via a entrada e
     ninguém sabia por quê. Com .select() dá pra detectar o caso E ler o valor
     que o banco realmente gravou. */
  const salvarVisibilidade = async (patch) => {
    setSavingVinculo(true);
    setError(null);
    const colunas = ['id', ...Object.keys(patch)].join(', ');
    const { data: rows, error: err } = await supabaseClient
      .from('historias')
      .update(patch)
      .eq('id', historia.id)
      .select(colunas);
    setSavingVinculo(false);
    if (err) { setError(err.message); return; }
    if (!rows || rows.length === 0) {
      setError(en
        ? 'Could not save: the update affected 0 rows (likely an RLS/permission rule on "historias"). A SECURITY DEFINER RPC is needed to write this column.'
        : 'Não foi possível salvar: o update não afetou nenhuma linha (provável regra de RLS/permissão em "historias"). É preciso uma RPC SECURITY DEFINER pra gravar essa coluna no banco.');
      return;
    }
    // O valor REAL do banco, não o otimista — tela e persistência em sincronia.
    Object.keys(patch).forEach((k) => {
      historia[k] = rows[0][k] !== undefined ? rows[0][k] : patch[k];
    });
    setPermissaoDe(null);
    setLore((prev) => [...(prev || [])]); // força re-render
    if (onChanged) onChanged();
  };

  // ── Form de Novo/Editar item — CONTINUA como ModalShell por cima da página
  // reinosDaHistoria/cidadesDaHistoria: opções pros <select> de FK em
  // LoreEntradaForm (cidade.reino, npc.origem/cidade) — limitadas às
  // CÓPIAS já existentes nesta história (decisão combinada: Mestre só
  // liga a algo que ele mesmo já forkou antes, não ao catálogo global direto).
  const reinosDaHistoria = (lore || []).filter((e) => e.tipo === 'reino');
  const cidadesDaHistoria = (lore || []).filter((e) => e.tipo === 'cidade');

  /* As palavras do título saem de ADMIN_COPY, as mesmas da barra lateral —
     mesmo arranjo do DiarioView do Jogador: se "NPCs" virar outra coisa, o
     menu e o título da página mudam juntos. */
  const tituloDaSecao = tipoFixo
    ? ((ADMIN_COPY[lang] || ADMIN_COPY.pt).sections[{ lugar: 'lugares', npc: 'npcs' }[tipoFixo]] || {}).label
    : null;

  const formModal = editando && (
    <ModalShell
      title={editando.id
        ? (en ? `Edit ${diarioTipoLabel(tipoNovo || tipoAba, lang)}` : `Editar ${diarioTipoLabel(tipoNovo || tipoAba, lang)}`)
        : (en ? `New ${diarioTipoLabel(tipoNovo || tipoAba, lang)}` : `${novoDoTipo(tipoNovo || tipoAba)} ${diarioTipoLabel(tipoNovo || tipoAba, lang)}`)}
      lang={lang}
      onClose={() => { setEditando(null); setTipoNovo(null); }}
      onCancel={() => { setEditando(null); setTipoNovo(null); }}
      onConfirm={salvarLore}
    >
      {/* EDITANDO UM GLOBAL: salvar não altera o catálogo do mundo, cria uma
          CÓPIA desta mesa (salvar_lore_entrada forka quando p_id é global).
          O aviso existe porque o efeito é visível — a lista passa a ter duas
          linhas com o mesmo nome, uma "Mundo" e uma "Mesa" — e sem explicação
          isso parece bug. O desenho quer que o Mestre "não perceba a
          diferença" no MECANISMO, não que ele seja pego de surpresa pelo
          resultado. */}
      {editando._global && (
        <div className="diario-fork-aviso">
          <i className="ti ti-info-circle" aria-hidden="true" />
          <span>
            {en
              ? 'This entry belongs to the world catalog. Saving creates a copy for this table — the original stays untouched.'
              : 'Esta entrada é do catálogo do mundo. Salvar cria uma cópia desta mesa — o original fica intacto.'}
          </span>
        </div>
      )}
      <LoreEntradaForm
        tipo={tipoNovo || tipoAba}
        entrada={editando}
        onChange={setEditando}
        // Idem DiarioView: o seletor Reino/Cidade grava em `tipoNovo`, que é o
        // que salvarLore manda como p_tipo.
        onTipoChange={setTipoNovo}
        reinosDaHistoria={reinosDaHistoria}
        cidadesDaHistoria={cidadesDaHistoria}
        t={COPY[lang] || COPY.pt}
        lang={lang}
      />
      {error && <div className="err-msg diario-err-mt">{error}</div>}
    </ModalShell>
  );

  const loreDoTipo = (lore || []).filter((e) =>
    tipoAba === 'lugar' ? LUGAR_TIPOS.has(e.tipo) : e.tipo === tipoAba
  );

  /* ── A LISTA, que virou TABELA (17/09/2026) ─────────────────────────────
     "A página e tabela de NPCs e lugares será igual a de criaturas, itens,
     etc. Isso quer dizer que será uma tabela com colunas, botão de buscar e
     '+'. Isso quer dizer que as informações dentro de NPCs e lugares vão ser
     mostradas quando expandir a entrada." (usuário)

     Era uma .diario-vinculo-list: uma linha solta por entrada, com checkbox,
     nome e os botões. Agora são as MESMAS peças das outras páginas do
     catálogo — as que o bestiário exporta de propósito (ver a nota "O
     VOCABULÁRIO DA TABELA" no fim de 09-bestiario/bestiario.jsx):
     BestBuscaENovo no cabeçalho, DiarioTabela (UI.Table + SortHead), a linha
     de detalhe .best-detail e BestPagination. Escrever uma tabela parecida
     aqui é como as duas telas começam a divergir sem ninguém decidir que
     deviam.

     A COLUNA DE CHECKBOX SAIU. Ela ligava historias.<tipo>_ids, metade da
     resposta a "quem vê isto" — a outra metade morava dentro da ficha, no
     bloco "Liberar para". As duas viraram um lugar só, o modal do olho
     (PermissaoEntradaModal), e a coluna Visibilidade só MOSTRA o resultado.

     PAGE_SIZE vem de useFitPageSize, não do 10 fixo de antes: é o que faz a
     tabela ocupar a altura da página como as outras. */
  const q = query.trim().toLowerCase();

  /* Lista única por aba. Nas abas de lore, cópias da história + catálogo
     GLOBAL (migration 016) na mesma tabela; globais entram com `_global` e a
     coluna Fonte diz "Mundo". Na aba Criatura, o bestiário inteiro. */
  /* ⚠️ `tipo` na criatura é AMBÍGUO: na tabela `criaturas` ele é o tipo do
     bestiário (Animal, Dragão, Morto…), e aqui a tela precisa do tipo de
     ENTRADA ('criatura') pra achar a coluna de visibilidade. O do bestiário
     vira `tipo_criatura` antes de ser sobrescrito — a mesma armadilha que
     token-icone-criatura.test.jsx documenta no tabuleiro, onde o tipo do
     bestiário viaja como `raca`. */
  const listaCrua = tipoAba === 'criatura'
    ? (criaturas || []).map((c) => ({ ...c, tipo_criatura: c.tipo, tipo: 'criatura' }))
    : (() => {
        const tiposDoBloco = tipoAba === 'lugar' ? ['reino', 'cidade'] : [tipoAba];
        const globais = tiposDoBloco.flatMap((t) =>
          (catalogoGlobal[t] || []).map((g) => ({ ...g, tipo: t, _global: true }))
        );
        return [...globais, ...loreDoTipo];
      })();

  const attrDe = (e, k) => {
    const a = e.atributos && typeof e.atributos === 'object' ? e.atributos : {};
    const v = a[k] != null && a[k] !== '' ? a[k] : e[k];
    return v == null || v === '' ? '—' : String(v);
  };

  /* Campos como npc.cidade guardam o SLUG do lugar, não o nome. Na coluna
     Localização o slug não serve ("brann-h3"), então resolve pelo nome —
     mesma tradução que DetalheEntradaModal faz com loreBySlug, aqui contra
     cópias e globais juntos. Slug sem lugar correspondente cai no próprio
     slug: melhor um identificador feio que um travessão mentindo que o campo
     está vazio. */
  const nomePorSlug = {};
  [...(lore || []), ...catalogoGlobal.reino, ...catalogoGlobal.cidade, ...catalogoGlobal.npc]
    .forEach((x) => { if (x && x.id) nomePorSlug[x.id] = x.nome; });
  const nomeDeSlug = (e, k) => {
    const v = attrDe(e, k);
    if (v === '—') return v;
    const nome = nomePorSlug[v] || v;
    return nome.charAt(0).toUpperCase() + nome.slice(1);
  };

  const rotuloFonte = (e) => (e._global
    ? (en ? 'World' : 'Mundo')
    : (en ? 'Table' : 'Mesa'));

  /* A coluna Visibilidade: o estado que o modal do olho edita, legível na
     tabela. Sem ela o Mestre teria que abrir entrada por entrada pra saber o
     que os jogadores enxergam — que era justamente o problema do checkbox
     mais o bloco escondido na ficha. */
  const rotuloVisibilidade = (vis) => {
    const tp = ((COPY[lang] || COPY.pt).lore || {}).permissao || {};
    if (vis.modo === 'ninguem') return tp.ninguem;
    if (vis.modo === 'todos') return tp.todos;
    // "alguns": o número diz mais que o rótulo — 1 de 4 é diferente de 3 de 4.
    return `${vis.pjIds.length}/${protagonistas.length || vis.pjIds.length}`;
  };

  // Ordenação e busca: mesmas peças das outras tabelas.
  const listaFiltrada = listaCrua
    .filter((e) => !q || (e.nome || '').toLowerCase().includes(q))
    .map((e) => {
      const refId = e.id;
      const vis = visibilidadeDaEntrada(historia, e.tipo, refId);
      return {
        ...e,
        /* Campos derivados existem pra que o SortHead ordene por eles: o
           useSort ordena pelo VALOR da chave da coluna, não por uma função
           de comparação por coluna. Sem `_raca`/`_cidade` aqui, clicar
           naqueles dois cabeçalhos ordenaria por undefined — ou seja, não
           ordenaria, sem dizer por quê. */
        _fonte: rotuloFonte(e),
        _tipoLabel: diarioTipoLabel(e.tipo, lang),
        _raca: attrDe(e, 'raca'),
        _cidade: nomeDeSlug(e, 'cidade'),
        _visibilidade: rotuloVisibilidade(vis),
        _visModo: vis.modo,
      };
    });

  const { sorted, sortKey, sortDir, toggleSort } = useSort(listaFiltrada);
  const lista = sorted || listaFiltrada;
  const porPagina = useFitPageSize(wrapRef, { fallback: PAGE_SIZE_FALLBACK });
  const totalPages = Math.max(1, Math.ceil(lista.length / porPagina));
  const safePage = Math.min(page, totalPages);
  const pagina = lista.slice((safePage - 1) * porPagina, safePage * porPagina);

  const cols = [
    { key: 'nome', label: en ? 'Name' : 'Nome' },
    // Lugares mistura Reino e Cidade — a coluna diz qual é. Mesma decisão da
    // tabela do Jogador.
    ...(tipoAba === 'lugar' ? [{ key: '_tipoLabel', label: en ? 'Type' : 'Tipo' }] : []),
    ...(tipoAba === 'npc' ? [
      { key: '_raca', label: en ? 'Race' : 'Raça' },
      { key: '_cidade', label: en ? 'Location' : 'Localização' },
    ] : []),
    ...(tipoAba === 'criatura' ? [
      { key: 'tipo_criatura', label: en ? 'Kind' : 'Tipo' },
      { key: 'estagio', label: en ? 'Stage' : 'Estágio' },
    ] : []),
    { key: '_visibilidade', label: en ? 'Visibility' : 'Visibilidade' },
    ...(tipoAba === 'criatura' ? [] : [{ key: '_fonte', label: en ? 'Source' : 'Fonte' }]),
    { key: 'acoes', label: '', ordena: false, style: { width: 120 } },
  ];

  const chaveDa = (e) => `${e._global ? 'g' : 'c'}:${e.tipo}:${String(e.id)}`;

  const { TableRow, TableCell } = (typeof UI !== 'undefined' ? UI : {});

  const linhaDe = (e) => {
    const chave = chaveDa(e);
    const aberta = expandida === chave;
    /* EDITAR vale para os dois, global incluído (17/09/2026). A pergunta do
       usuário — "como o mestre vai editar os reinos e cidades, e npcs se não
       tem o botão de edição?" — não tinha resposta: o lápis só existia nas
       cópias da mesa, e a única outra porta — a SelecionarBaseModal, tela de
       "escolher a base do fork" — nunca foi renderizada por ninguém (removida
       em 17/09/2026; ver a nota no lugar em que ela ficava). Não havia caminho
       até uma entrada do catálogo do mundo.

       Ligar o lápis no global foi suficiente porque o banco já fazia a parte
       difícil: salvar_lore_entrada, ao receber o slug de um global em p_id,
       cai no ramo `slug_base := p_id → criar_copia_*` e FORKA (conferido na
       definição da função, não só no comentário). O Mestre edita e sai com uma
       cópia da mesa.

       EXCLUIR é que continua só nas cópias, e não por esquecimento:
       excluir_lore_entrada recusa apagar global, então uma lixeira ali abriria
       para dar erro. */
    const editavel = tipoAba !== 'criatura';
    const excluivel = editavel && !e._global;
    return (
      <React.Fragment key={chave}>
        <TableRow
          style={{ cursor: 'pointer' }}
          onClick={() => setExpandida(aberta ? null : chave)}
        >
          <TableCell className="best-name">{e.nome}</TableCell>
          {tipoAba === 'lugar' && <TableCell>{e._tipoLabel}</TableCell>}
          {tipoAba === 'npc' && <TableCell>{attrDe(e, 'raca')}</TableCell>}
          {tipoAba === 'npc' && <TableCell>{nomeDeSlug(e, 'cidade')}</TableCell>}
          {tipoAba === 'criatura' && <TableCell>{e.tipo_criatura || e.raca || '—'}</TableCell>}
          {tipoAba === 'criatura' && <TableCell>{e.estagio != null ? e.estagio : '—'}</TableCell>}
          <TableCell>
            <span className={'diario-vis-chip diario-vis-chip--' + e._visModo}>
              {e._visibilidade}
            </span>
          </TableCell>
          {tipoAba !== 'criatura' && <TableCell>{e._fonte}</TableCell>}
          <TableCell className="diario-td-acoes" onClick={(ev) => ev.stopPropagation()}>
            {/* O OLHO É PERMISSÃO desde 17/09/2026, não mais "ver a ficha" —
                a ficha é a expansão da linha. */}
            <button className="btn-icon btn-sm"
              onMouseEnter={(ev) => abrirTip(ev, { desc: ((COPY[lang] || COPY.pt).lore || {}).permissao?.titulo })}
              onMouseLeave={fecharTip}
              onClick={() => setPermissaoDe(e)}>
              <i className="ti ti-eye" aria-hidden="true" />
            </button>
            {editavel && (
              <button className="btn-icon btn-sm"
                onMouseEnter={(ev) => abrirTip(ev, {
                  desc: e._global
                    // O tooltip já conta o que vai acontecer, antes do clique.
                    ? (en ? 'Edit (creates a copy for this table)' : 'Editar (cria uma cópia desta mesa)')
                    : (en ? 'Edit' : 'Editar'),
                })}
                onMouseLeave={fecharTip}
                onClick={() => { setTipoNovo(e.tipo); setEditando(e); }}>
                <i className="ti ti-pencil" aria-hidden="true" />
              </button>
            )}
            {excluivel && (
              <button className="btn-icon btn-danger btn-sm"
                onMouseEnter={(ev) => abrirTip(ev, { desc: en ? 'Delete' : 'Excluir' })}
                onMouseLeave={fecharTip}
                onClick={() => excluirLore(e.id)}>
                <i className="ti ti-trash" aria-hidden="true" />
              </button>
            )}
          </TableCell>
        </TableRow>
        {aberta && (
          <TableRow className="best-detail">
            <TableCell colSpan={cols.length}>
              {/* A MESMA ficha do modal do Jogador, sem o modal em volta. */}
              <DetalheEntradaModal
                inline
                entrada={e}
                lang={lang}
                lore={[...(lore || []), ...catalogoGlobal.reino, ...catalogoGlobal.cidade, ...catalogoGlobal.npc]}
              />
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
  };

  /* O + do cabeçalho. Na aba Criatura não há: o bestiário é catálogo global e
     criatura nova se cria na página Criaturas, não aqui — aqui só se decide
     quem a vê. */
  const podeCriar = tipoAba !== 'criatura';
  const dicaNovo = tipoAba === 'lugar'
    ? (en ? 'New place' : 'Novo lugar')
    : (en ? `New ${diarioTipoLabel(tipoAba, lang)}` : `${novoDoTipo(tipoAba)} ${diarioTipoLabel(tipoAba, lang)}`);

  /* Um + SÓ para Lugares (17/09/2026): "Novo reino e nova cidade serão a mesma
     coisa." Eram dois botões no cabeçalho; o tipo é o primeiro campo do
     formulário agora (ver LoreEntradaForm), e 'reino' é só o padrão marcado. */
  const abrirNovoLugar = () => {
    setTipoNovo(tipoAba === 'lugar' ? 'reino' : tipoAba);
    setEditando({});
  };

  return (
    <div className="fp-page">
      <div className="fp-card lore-mng-page">
        <div className="fp-card-top">
          <header className="ms-header lore-mng-page-header">
            {onClose && (
              <button
                type="button"
                className="btn-icon btn-sm"
                onClick={onClose}
                aria-label={en ? 'Back to stories' : 'Voltar às histórias'}>
                <i className="ti ti-arrow-left" />
              </button>
            )}
            <div className="lore-mng-page-title-wrap">
              <div className="lore-mng-page-eyebrow">
                <i className="ti ti-book-2" aria-hidden="true" />
                {historia.titulo}
              </div>
              {/* Como página do menu lateral, o título é o nome da seção — as
                  mesmas palavras do menu, tiradas do mesmo ADMIN_COPY. */}
              <h2 className="ms-title lore-mng-page-h2">{tituloDaSecao || 'Lore'}</h2>
            </div>
            {/* Busca + "+" no cabeçalho: a MESMA peça das cinco listas do
                bestiário (BestBuscaENovo), não uma barra própria abaixo do
                título como era aqui até 17/09/2026. */}
            <BestBuscaENovo
              ac={ADMIN_COPY[lang] || ADMIN_COPY.pt}
              placeholder={en ? 'Search…' : 'Buscar…'}
              query={query}
              setQuery={(v) => { setQuery(v); setPage(1); setExpandida(null); }}
              podeCriar={podeCriar}
              onNovo={abrirNovoLugar}
              dicaNovo={dicaNovo} />
          </header>
        </div>
        <div className="lore-mng-page-body">
          {lore === null ? (
            <DiarioLoading lang={lang} />
          ) : (
            <>
              {/* As sub-abas só existem sem tipoFixo — quem chega pelo menu
                  lateral já escolheu a seção.

                  ⚠️ HOJE NINGUÉM CHEGA SEM tipoFixo. O único call site que não
                  o passava era Histórias → card da mesa → botão "Lore", e o
                  botão saiu em 17/09/2026; o LoreDaMesa (o caminho do menu
                  lateral) sempre passa 'lugar' ou 'npc'. Ou seja: estas
                  sub-abas e a aba Criatura abaixo estão sem porta.

                  A aba Criatura em particular NÃO é mais a casa de
                  "disponibilizar criatura pra história" — isso virou o botão
                  de olho da tabela de Criaturas (09-bestiario/bestiario.jsx),
                  que é a tabela padrão delas. O que sobrou aqui é uma segunda
                  implementação da mesma coisa, inalcançável. Quem for mexer
                  nisto: a decisão de tirar o botão e a de mover a função foram
                  a MESMA; se a aba voltar a ter porta, ela é que deve sair. */}
              {!tipoFixo && (
                <div className="lore-mng-toolbar">
                  <div className="diario-subtabs" role="tablist">
                    {DIARIO_TIPOS.map((t) => (
                      <button key={t} className={tipoAba === t ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'} onClick={() => setTipoAba(t)}>
                        {diarioTipoLabel(t, lang)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && <div className="err-msg diario-err-mb">{error}</div>}

              {pagina.length === 0 ? (
                <div className="best-empty diario-empty-lg">
                  {q
                    ? (en ? `No result for "${query}".` : `Nenhum resultado para "${query}".`)
                    : (en ? 'Nothing registered yet.' : 'Nada cadastrado ainda.')}
                </div>
              ) : (
                <>
                  <DiarioTabela cols={cols} wrapRef={wrapRef} sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}>
                    {pagina.map(linhaDe)}
                  </DiarioTabela>
                  <BestPagination page={page} safePage={safePage} totalPages={totalPages} setPage={setPage} setExpandida={setExpandida} lang={lang} />
                </>
              )}
            </>
          )}
        </div>

        {permissaoDe && (
          <PermissaoEntradaModal
            entrada={permissaoDe}
            historia={historia}
            protagonistas={protagonistas}
            lang={lang}
            salvando={savingVinculo}
            onClose={() => setPermissaoDe(null)}
            onSalvar={salvarVisibilidade}
          />
        )}
        {formModal}
        <PortalTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
      </div>
    </div>
  );
}

/* ============================== LoreDaMesa — o Lore como seção do menu ==============================
   O GerenciarLoreView precisa da LINHA INTEIRA da história (npc_ids,
   criatura_ids, lore_acesso_pj, protagonista_ids…), e o que o AdminConsole tem
   em mãos é só `{ id, titulo }` — a lista do seletor de mesa é estreita de
   propósito. Em vez de alargá-la para todo mundo, quem precisa do resto vai
   buscar: é este componente.

   Sem mesa selecionada não há Lore de mesa nenhuma, e a tela diz isso em vez
   de aparecer vazia — mesmo contrato das seções do Jogador sem PJ ativo. */
function LoreDaMesa({ historiaId, lang, tipoFixo, vazio }) {
  const [historia, setHistoria] = useState(null);   // null = carregando
  const [erro, setErro] = useState(null);
  useEffect(() => {
    if (!historiaId) return undefined;
    let cancel = false;
    setHistoria(null); setErro(null);
    (async () => {
      const { data, error } = await supabaseClient
        .from('historias').select('*').eq('id', historiaId).maybeSingle();
      if (cancel) return;
      if (error) { setErro(error.message); return; }
      setHistoria(data || null);
    })();
    return () => { cancel = true; };
  }, [historiaId]);

  if (!historiaId) return vazio || null;
  if (erro) return <DiarioErrorBox error={erro} hint={lang === 'en' ? 'Could not load the table lore.' : 'Não consegui carregar o lore da mesa.'} />;
  if (!historia) return <DiarioLoading lang={lang} />;
  return (
    <GerenciarLoreView
      historia={historia}
      lang={lang}
      tipoFixo={tipoFixo}
      key={tipoFixo + ':' + historia.id}
    />
  );
}

Object.assign(window, {
  DiarioView, GerenciarLoreView, LoreDaMesa,
  // O modal do botão de olho (17/09/2026). Exposto porque a CriaturasList
  // (09-bestiario) também o abre — ver permissao-entrada-modal.test.jsx.
  PermissaoEntradaModal,
  /* O formulário compartilhado pelas duas telas de lore. Exposto pro teste do
     seletor Reino/Cidade (lugar-tipo-unico.test.jsx), que é justamente sobre
     o formulário ser UM — se cada tela tivesse o seu, o pedido "reino e
     cidade são a mesma coisa" teria que ser resolvido duas vezes. */
  LoreEntradaForm,
  /* Núcleo PURO da visibilidade de uma entrada (17/09/2026). Num objeto
     próprio pra não disputar nomes no window com as outras fases —
     12-batalha já tem uma `proximaVisibilidade`, que é a da luz da batalha e
     não tem nada a ver com esta. Ver visibilidade-entrada.test.js. */
  DiarioVisibilidade: { visibilidadeDaEntrada, patchDeVisibilidade, chaveAcessoPj, VIS_CAMPO },
});
