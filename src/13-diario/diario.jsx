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
                            direto aqui, não só dentro do
                            SelecionarBaseModal): entradas globais
                            aparecem com tag "Mundo", checkbox + ver, SEM
                            lápis/lixeira — mesmo padrão que a aba
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
   - ⚠️ NÃO depende de BestLoading/BestErrorBox/BestNoKit/useFitPageSize/
     useSort/SortHead/BestPagination de 09-bestiario/bestiario.jsx: esses
     helpers existem só no escopo do módulo bestiario.jsx — o
     Object.assign(window,{...}) de lá expõe SÓ as 5 Lists
     (CriaturasList/MagiasList/HabilidadesList/TecnicasList/ItensList),
     não os helpers internos. Este arquivo declara suas PRÓPRIAS versões
     locais (DiarioLoading/DiarioErrorBox, prefixo diario- pra não colidir),
     já que o Diário usa grid de cards, não tabela paginada — não precisa
     de useFitPageSize/useSort/BestPagination de qualquer forma.

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
   historia_id NULL/setado — ver SelecionarBaseModal e a RPC). 3 seeds
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
   explicitamente "a definir" numa rodada anterior (só existia dentro do
   SelecionarBaseModal, pro fluxo de fork). Migration 016 fechou isso:
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
   colateral bom, SelecionarBaseModal passa a herdar os campos certos ao
   forkar um global, o que antes sempre resultava em atributos:{}; (b)
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
                          usada pelo SelecionarBaseModal E (migration 016)
                          direto em carregar() pra listar a tela principal;
                          devolve atributos por tipo desde a 016
   - salvar_lore_entrada(p_id?, p_historia_id, p_tipo, p_nome, p_descricao,
                          p_imagem_url, p_atributos, p_slug_origem?) — Mestre;
                          ramifica internamente: cria fork (p_id null, usa
                          p_slug_origem ou o seed vazio do tipo), edita
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

const DIARIO_TIPOS = ['criatura', 'npc', 'lugar', 'item', 'treinamento'];
// Abas cujo "Novo" e checkboxes de disponibilizar ainda não têm suporte de backend.
const DIARIO_TIPOS_NOVOS = new Set(['item', 'treinamento']);
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
  pt: { criatura: 'Criatura', npc: 'Personagem', lugar: 'Lugar', reino: 'Reino', cidade: 'Cidade',
        memoria: 'Memória', item: 'Item', treinamento: 'Treinamento',
        magia: 'Magia', habilidade: 'Habilidade', tecnica: 'Técnica', personagem: 'Personagem' },
  en: { criatura: 'Creature', npc: 'Character', lugar: 'Place', reino: 'Kingdom', cidade: 'City',
        memoria: 'Memory', item: 'Item', treinamento: 'Training',
        magia: 'Spell', habilidade: 'Ability', tecnica: 'Technique', personagem: 'Character' },
};

function diarioTipoLabel(tipo, lang) {
  const l = lang === 'en' ? 'en' : 'pt';
  return DIARIO_TIPO_LABEL[l][tipo] || tipo;
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

function DiarioLoading({ text }) {
  return <div className="admin-loading"><span>{text}</span></div>;
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
    'subtipo', 'grupo', 'plano', 'coletivo', 'magia', 'magia_n', 'tecnicas_especiais', 'habilidades',
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

      {/* META: plano + coletivo — mesmo padrão diario-det-attr do NPC */}
      {(get('plano') || get('coletivo')) && (
        <div className="diario-det-attrs" style={{ marginBottom: 14 }}>
          {get('plano') && (
            <div className="diario-det-attr">
              <span className="diario-det-attr-k">{en ? 'Plane' : 'Plano'}</span>
              <span className="diario-det-attr-v">{fmt('plano')}</span>
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
            {get('magia_n') && (
              <span className="cficha-badge cficha-badge--magia-n">{fmt('magia_n')}</span>
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
  // Props de liberação por PJ (usados apenas quando aberto pelo Mestre via GerenciarLoreView)
  protagonistas,      // [{ id, nome }] — lista de PJs da história
  loreAcessoPj,       // objeto jsonb { "tipo:ref_id": [pj_id, ...] }
  onToggleLiberarPj,  // (tipo, refId, pjId, ligar) => void
  savingVinculo,      // boolean — desabilita checkboxes durante save
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

  // Bloco "Liberar para" — só aparece quando o Mestre abre o modal via GerenciarLoreView
  // (protagonistas !== undefined). Mostra checkboxes dos PJs da história.
  // A chave do jsonb lore_acesso_pj é "tipo:ref_id" (ex: "npc:arissia-h3").
  const isMestreView = Array.isArray(protagonistas) && typeof onToggleLiberarPj === 'function';
  // Ref da chave de liberação: tipos NOVOS (item/magia/habilidade/tecnica)
  // usam NOME — mesma chave "tipo:nome" do filtro da RPC
  // listar_diario_disponivel (migration 019). Entradas desses tipos não têm
  // ref_id/id; sem este desvio a chave virava "item:"/"item:undefined" e o
  // seletor ficava surdo (lia uma chave, gravava outra).
  const liberarRef = (entrada.tipo === 'item' || TREINAMENTO_TIPOS.has(entrada.tipo))
    ? (entrada.nome ?? '')
    : (entrada.ref_id ?? entrada.id ?? '');
  const liberarChave = `${entrada.tipo}:${String(liberarRef)}`;
  const liberadosPara = (isMestreView && loreAcessoPj && Array.isArray(loreAcessoPj[liberarChave]))
    ? loreAcessoPj[liberarChave]
    : [];

  const liberarPjBloco = isMestreView && protagonistas.length > 0 && (
    <div className="diario-liberar-wrap">
      <div className="diario-liberar-label">
        <i className="ti ti-lock-open-2" aria-hidden="true" style={{ color: 'var(--gold)', fontSize: 13 }} />
        {lang === 'en' ? 'Release to' : 'Liberar para'}
      </div>
      <div className="diario-liberar-lista">
        {protagonistas.map((pj) => {
          const marcado = liberadosPara.includes(pj.id);
          return (
            <label key={pj.id} className={'diario-liberar-item' + (marcado ? ' diario-liberar-item--on' : '')}>
              <input
                type="checkbox"
                checked={marcado}
                disabled={!!savingVinculo}
                onChange={(ev) => onToggleLiberarPj(entrada.tipo, liberarRef, pj.id, ev.target.checked)}
              />
              <span className="diario-liberar-nome">{pj.nome}</span>
            </label>
          );
        })}
      </div>
    </div>
  );

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
      <ModalShell title={<DiarioModalNome entrada={entrada} nomeOverride={tituloModal} />} lang={lang} size="lg" onClose={onClose}>
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
        {liberarPjBloco}
        {acoes}
      </ModalShell>
    );
  }

  // NPCs, reinos, cidades: layout genérico com grade de atributos
  const JA_EXIBIDOS = new Set([
    'tipo', 'ref_id', 'id', 'nome', 'subtitulo', 'descricao', 'imagem_url',
    'comentario', 'jaImportado', 'diario_entrada_id', 'personagem_id',
    'criatura_id', 'created_at', 'updated_at', 'atributos',
    '_global', // marcador client-side (GerenciarLoreView), não é dado real
    // campos de metadado interno — não exibir no modal
    'slug', 'compartilhado', 'criado_por_personagem_id', 'criado_por_nome',
  ]);

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
    if (JA_EXIBIDOS.has(k)) continue;
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
      <ModalShell title={<DiarioModalNome entrada={entrada} />} lang={lang} size="lg" onClose={onClose}>
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

        {liberarPjBloco}
        {acoes}
      </ModalShell>
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
      <ModalShell title={<DiarioModalNome entrada={entrada} />} lang={lang} size="lg" onClose={onClose}>
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
        {liberarPjBloco}
        {acoes}
      </ModalShell>
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
      <ModalShell title={<DiarioModalNome entrada={entrada} />} lang={lang} size="lg" onClose={onClose}>
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
        {liberarPjBloco}
        {acoes}
      </ModalShell>
    );
  }

  return (
    <ModalShell title={<DiarioModalNome entrada={entrada} />} lang={lang} size="lg" onClose={onClose}>
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
      {liberarPjBloco}
      {acoes}
    </ModalShell>
  );
}

// ---------- MemoriaModal ----------

function MemoriaModal({ memoria, lang, pjId, onClose, onSaved }) {
  const en = lang === 'en';
  const isEdit = !!memoria;
  const [titulo, setTitulo] = useState(memoria?.titulo || '');
  const [conteudo, setConteudo] = useState(memoria?.conteudo || '');
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
    onSaved(data && data.entrada ? data.entrada : { ...memoria, titulo, conteudo });
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

function DiarioView({ pj, lang, papel, currentUserId, isMestre }) {
  const en = lang === 'en';
  const pjId = pj?.id;
  const PAGE_SIZE = 10;
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
  // Menu superior: 'meu' = o que o jogador importou pro catálogo próprio;
  // 'aventura' = o que o mestre ou outros jogadores compartilharam com ele.
  const [menuDiario,          setMenuDiario]          = useState('meu');
  const [tipoAba,             setTipoAba]             = useState('memoria');
  const [tipoNovo,            setTipoNovo]            = useState(null);
  const [editando,            setEditando]            = useState(null);
  const [slugOrigemEscolhido, setSlugOrigemEscolhido] = useState(null);
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
  // Ao trocar de menu superior, volta pra aba padrão de cada seção
  useEffect(() => {
    setTipoAba(menuDiario === 'meu' ? 'memoria' : 'criatura');
    setPage(1); setQuery('');
  }, [menuDiario]); // eslint-disable-line react-hooks/exhaustive-deps

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
      p_slug_origem:               slugOrigemEscolhido,
      p_criado_por_personagem_id:  pjId,
    });
    if (err) { setError(err.message); return; }
    if (data && data.ok === false) { setError(data.motivo || 'erro'); return; }
    setEditando(null);
    setSlugOrigemEscolhido(null);
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
    return <DiarioLoading text={en ? 'Loading journal…' : 'Carregando diário…'} />;
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

  const abrirNovoLugar = (tipo) => {
    setTipoNovo(tipo);
    setSlugOrigemEscolhido(null);
    setEditando({});
  };

  const formModal = editando && (
    <ModalShell
      title={editando.id
        ? (en ? `Edit ${diarioTipoLabel(tipoReal || tipoAba, lang)}` : `Editar ${diarioTipoLabel(tipoReal || tipoAba, lang)}`)
        : (en ? `New ${diarioTipoLabel(tipoReal || tipoAba, lang)}` : `Novo ${diarioTipoLabel(tipoReal || tipoAba, lang)}`)}
      lang={lang}
      onClose={() => { setEditando(null); setTipoNovo(null); }}
      onCancel={() => { setEditando(null); setTipoNovo(null); }}
      onConfirm={salvarLore}
    >
      <LoreEntradaForm
        tipo={tipoReal || tipoAba}
        entrada={editando}
        onChange={setEditando}
        reinosDaHistoria={reinosDaHistoria}
        cidadesDaHistoria={cidadesDaHistoria}
        t={COPY[lang] || COPY.pt}
      />
      {error && <div className="err-msg diario-err-mt">{error}</div>}
    </ModalShell>
  );

  // ── Render ────────────────────────────────────────────────────
  // O header (eyebrow "AS MARCAS DO PASSADO" + nome do PJ) vem da própria
  // ficha (fp-card-top). Aqui NÃO repetimos header — só a toolbar de abas.
  // No menu "Conteúdo da Aventura" o jogador só importa — não cria.
  const botaoNovo = !souDono || menuDiario === 'aventura' ? null
    : tipoAba === 'memoria' ? (
        <button className="btn-primary btn-sm" onClick={() => setMemoriaAberta({})}>
          {en ? 'New Memory' : 'Nova Memória'}
        </button>
      )
    : tipoAba === 'lugar' ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-primary btn-sm" disabled={!historiaId} onClick={() => abrirNovoLugar('reino')}>
            {en ? 'New Kingdom' : 'Novo Reino'}
          </button>
          <button className="btn-primary btn-sm" disabled={!historiaId} onClick={() => abrirNovoLugar('cidade')}>
            {en ? 'New City' : 'Nova Cidade'}
          </button>
        </div>
      )
    : tipoAba === 'criatura' || DIARIO_TIPOS_NOVOS.has(tipoAba) ? null
    : (
        <button className="btn-primary btn-sm" disabled={!historiaId}
          onClick={() => { setSlugOrigemEscolhido(null); setEditando({}); }}>
          {en ? `New ${diarioTipoLabel(tipoAba, lang)}` : `Novo ${diarioTipoLabel(tipoAba, lang)}`}
        </button>
      );

  return (
    <div className="diario-view">
      <div className="lore-mng-page-body">

        <p className="subhead">
          {en
            ? 'Use the journal as a personal glossary to organize characters, kingdoms, cities, items and other important details of your adventure. Then choose which of this information will be available for consultation during this story.'
            : 'Use o diário como um glossário pessoal para organizar personagens, reinos, cidades, itens e outros detalhes importantes da sua aventura. Depois, escolha quais dessas informações ficarão disponíveis para consulta durante esta história.'}
        </p>

        {/* Menu superior: Meu Diário / Conteúdo da Aventura — igual ao Catálogo/Estoque da Loja */}
        <div className="loja-mng-v3-tabs diario-menu-tabs">
          <button
            type="button"
            className={'loja-mng-v3-tab' + (menuDiario === 'meu' ? ' is-active' : '')}
            onClick={() => setMenuDiario('meu')}>
            {en ? 'My Journal' : 'Meu Diário'}
          </button>
          <button
            type="button"
            className={'loja-mng-v3-tab' + (menuDiario === 'aventura' ? ' is-active' : '')}
            onClick={() => setMenuDiario('aventura')}>
            {en ? 'Adventure Information' : 'Informações da Aventura'}
          </button>
        </div>

        {/* Toolbar: abas + busca + botão Novo */}
        <div className="lore-mng-toolbar">
          <div className="diario-subtabs" role="tablist">
            {(menuDiario === 'meu'
              ? ['memoria', ...DIARIO_TIPOS]        /* Meu Diário: todas as abas, incl. Memória */
              : DIARIO_TIPOS                         /* Conteúdo da Aventura: sem Memória */
            ).map((t) => (
              <button key={t}
                className={tipoAba === t ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
                onClick={() => setTipoAba(t)}>
                {t === 'memoria' ? (en ? 'Memorie' : 'Memória') : diarioTipoLabel(t, lang)}
              </button>
            ))}
          </div>
          <div className="best-search">
            <input type="search" value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder={en ? 'Search…' : 'Buscar…'}
              aria-label={en ? 'Search' : 'Buscar'} />
            {query && (
              <button type="button" className="best-search-clear"
                onClick={() => { setQuery(''); setPage(1); }}
                aria-label={en ? 'Clear' : 'Limpar'}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            )}
          </div>
          {botaoNovo}
        </div>

        {error && <div className="err-msg diario-err-mb">{error}</div>}

        {/* ── Aba Memórias ── */}
        {tipoAba === 'memoria' && (() => {
          const q = query.trim().toLowerCase();
          const filtradas = (memorias || []).filter((m) =>
            !q || (m.titulo || '').toLowerCase().includes(q) || (m.conteudo || '').toLowerCase().includes(q)
          );
          return filtradas.length === 0 ? (
            <div className="best-empty diario-empty-lg">
              <i className="ti ti-feather" style={{ fontSize: 32, opacity: 0.3, display: 'block', marginBottom: 8 }} aria-hidden="true" />
              {q
                ? (en ? `No memory matches "${query}".` : `Nenhuma memória corresponde a "${query}".`)
                : (en ? 'You haven\'t recorded any memories in your personal notes yet.' : 'Você ainda não registrou nenhuma memória em suas anotações pessoais.')}
            </div>
          ) : (
            <div className="diario-vinculo-list diario-vinculo-list--full">
              {filtradas.map((m) => (
                <div key={m.id} className="diario-vinculo-item diario-vinculo-item--mestre">
                  <span className="diario-vinculo-nome">{m.titulo || (en ? '(untitled)' : '(sem título)')}</span>
                  <button className="btn-icon btn-sm"
                    onMouseEnter={(ev) => abrirTip(ev, { desc: en ? 'View' : 'Ver' })}
                    onMouseLeave={fecharTip}
                    onClick={() => setMemoriaAberta(m)}>
                    <i className="ti ti-eye" aria-hidden="true" />
                  </button>
                  {souDono && (
                    <button className="btn-icon btn-danger btn-sm"
                      onMouseEnter={(e) => abrirTip(e, { desc: en ? 'Delete' : 'Excluir' })}
                      onMouseLeave={fecharTip}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        supabaseClient.rpc('excluir_entrada_diario', { p_id: m.id }).then(carregar);
                      }}>
                      <i className="ti ti-trash" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          );
        })()}

        {/* ── Aba Criaturas (disponibilizadas pelo Mestre + botão Importar) ── */}
        {tipoAba === 'criatura' && (() => {
          const q = query.trim().toLowerCase();
          // "Meu Diário": só as que o PJ já importou; "Conteúdo da Aventura": todas as disponíveis
          const base = menuDiario === 'meu'
            ? (criaturas || []).filter((c) => importados.has(`criatura:${c.id}`))
            : (criaturas || []);
          const lista = base.filter((c) => !q || (c.nome || '').toLowerCase().includes(q));
          const totalPages = Math.max(1, Math.ceil(lista.length / PAGE_SIZE));
          const safePage   = Math.min(page, totalPages);
          const pagina     = lista.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
          return lista.length === 0 ? (
            <div className="best-empty diario-empty-lg">
              <i className="ti ti-paw" style={{ fontSize: 32, opacity: 0.3, display: 'block', marginBottom: 8 }} aria-hidden="true" />
              {q
                ? (en ? `No creature matches "${query}".` : `Nenhuma criatura corresponde a "${query}".`)
                : menuDiario === 'meu'
                  ? (en ? 'You haven\'t recorded any creatures in your personal notes yet.' : 'Você ainda não registrou nenhuma criatura em suas anotações pessoais.')
                  : (en ? 'There are no creatures available for you to register.' : 'Não há nenhuma criatura disponível para você registrar.')}
            </div>
          ) : (
            <>
              <div className="diario-vinculo-list diario-vinculo-list--full">
                {pagina.map((c) => {
                  const foiImportado = importados.has(`criatura:${c.id}`);
                  return (
                    <div key={c.id} className="diario-vinculo-item diario-vinculo-item--mestre">
                      <span className="diario-vinculo-nome">{c.nome}</span>
                      <button className="btn-icon btn-sm"
                        onMouseEnter={(ev) => abrirTip(ev, { desc: en ? 'View' : 'Ver' })}
                        onMouseLeave={fecharTip}
                        onClick={async () => {
                          const { data } = await supabaseClient.from('criaturas').select('*').eq('id', c.id).maybeSingle();
                          setViewingLore(data ? { ...data, tipo: 'criatura', ref_id: data.id } : { ...c, tipo: 'criatura', ref_id: c.id });
                        }}>
                        <i className="ti ti-eye" aria-hidden="true" />
                      </button>
                      {souDono && (
                        foiImportado
                          ? renderBotaoImportado('criatura', c.id)
                          : (
                            <button className="btn-icon btn-sm"
                              onMouseEnter={(ev) => abrirTip(ev, { desc: en ? 'Import to journal' : 'Importar para o diário' })}
                              onMouseLeave={fecharTip}
                              onClick={() => importarEntrada('criatura', c.id)}>
                              <i className="ti ti-download" aria-hidden="true" />
                            </button>
                          )
                      )}
                    </div>
                  );
                })}
              </div>
              <LorePaginacao safePage={safePage} totalPages={totalPages} setPage={setPage} lang={lang} />
            </>
          );
        })()}

        {/* ── Aba Item / Treinamento (magia+habilidade+tecnica) — disponibilizados pelo Mestre + Importar ── */}
        {DIARIO_TIPOS_NOVOS.has(tipoAba) && (() => {
          const q = query.trim().toLowerCase();
          // 'treinamento' combina os três tipos; 'item' usa só a lista de item
          const baseDisp = tipoAba === 'treinamento'
            ? [
                ...(disponibilizados.magia      || []),
                ...(disponibilizados.habilidade  || []),
                ...(disponibilizados.tecnica     || []),
              ].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', en ? 'en' : 'pt'))
            : (disponibilizados[tipoAba] || []);
          // "Meu Diário": só os que o PJ já importou; "Conteúdo da Aventura": todos os disponíveis
          const base = menuDiario === 'meu'
            ? baseDisp.filter((e) => {
                const tipoReal = e.tipo || tipoAba;
                return importados.has(`${tipoReal}:${e.nome}`);
              })
            : baseDisp;
          const entradas = base.filter((e) => !q || (e.nome || '').toLowerCase().includes(q));
          const totalPages = Math.max(1, Math.ceil(entradas.length / PAGE_SIZE));
          const safePage   = Math.min(page, totalPages);
          const pagina     = entradas.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
          return entradas.length === 0 ? (
            <div className="best-empty diario-empty-lg">
              <i className={'ti ' + (DIARIO_TIPO_ICON[tipoAba] || 'ti-help')}
                style={{ fontSize: 32, opacity: 0.3, display: 'block', marginBottom: 8 }} aria-hidden="true" />
              {q ? (en ? `No result for "${query}".` : `Nenhum resultado para "${query}".`)
                 : menuDiario === 'meu'
                   ? (en ? 'You haven\'t imported anything in this category yet.' : 'Você ainda não importou nada nesta categoria.')
                   : (en ? 'The master has not yet recorded any information in this category.' : 'O mestre ainda não registrou nenhuma informação desta categoria.')}
            </div>
          ) : (
            <>
              <div className="diario-vinculo-list diario-vinculo-list--full">
                {pagina.map((e) => {
                  const tipoReal = e.tipo || tipoAba;
                  const foiImportado = importados.has(`${tipoReal}:${e.nome}`);
                  return (
                    <div key={`${tipoReal}:${e.nome}`} className="diario-vinculo-item diario-vinculo-item--mestre">
                      <span className="diario-vinculo-nome">{e.nome}</span>
                      <button className="btn-icon btn-sm"
                        onMouseEnter={(ev) => abrirTip(ev, { desc: en ? 'View' : 'Ver' })}
                        onMouseLeave={fecharTip}
                        onClick={() => setViewingLore({ ...e, tipo: tipoReal })}>
                        <i className="ti ti-eye" aria-hidden="true" />
                      </button>
                      {souDono && (
                        foiImportado
                          ? renderBotaoImportado(tipoReal, e.nome)
                          : (
                            <button className="btn-icon btn-sm"
                              onMouseEnter={(ev) => abrirTip(ev, { desc: en ? 'Import to journal' : 'Importar para o diário' })}
                              onMouseLeave={fecharTip}
                              onClick={() => importarEntrada(tipoReal, e.nome)}>
                              <i className="ti ti-download" aria-hidden="true" />
                            </button>
                          )
                      )}
                    </div>
                  );
                })}
              </div>
              <LorePaginacao safePage={safePage} totalPages={totalPages} setPage={setPage} lang={lang} />
            </>
          );
        })()}

        {/* ── Abas NPC / Lugares — disponibilizados pelo Mestre + criados pelo PJ + Importar ── */}
        {!DIARIO_TIPOS_NOVOS.has(tipoAba) && tipoAba !== 'criatura' && tipoAba !== 'memoria' && (() => {
          const q = query.trim().toLowerCase();

          // Entradas criadas pelo PJ (ou compartilhadas por outros PJs)
          const loreDoTipo = (lore || []).filter((e) =>
            tipoAba === 'lugar' ? LUGAR_TIPOS.has(e.tipo) : e.tipo === tipoAba
          );
          const playerIds = new Set(loreDoTipo.map((e) => String(e.slug || e.id)));

          // Entradas disponibilizadas pelo Mestre (excluindo as que o PJ já criou)
          const dispTipos = tipoAba === 'lugar' ? ['reino', 'cidade'] : [tipoAba];
          const mestreEntradas = dispTipos.flatMap((t) =>
            (disponibilizados[t] || []).filter((e) => !playerIds.has(String(e.slug || e.id)))
          );

          // "Meu Diário": só entradas criadas pelo próprio PJ ou que já importou
          // "Conteúdo da Aventura": entradas do Mestre/outros jogadores (excl. as criadas pelo PJ)
          const combinado = (menuDiario === 'meu'
            ? loreDoTipo  // apenas o que o PJ criou (lore do PJ)
            : mestreEntradas  // apenas o que veio do Mestre ou outros jogadores
          )
            .filter((e) => !q || (e.nome || '').toLowerCase().includes(q))
            .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', en ? 'en' : 'pt'));

          const totalPages = Math.max(1, Math.ceil(combinado.length / PAGE_SIZE));
          const safePage   = Math.min(page, totalPages);
          const pagina     = combinado.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

          return combinado.length === 0 ? (
            <div className="best-empty diario-empty-lg">
              <i className={'ti ' + (DIARIO_TIPO_ICON[tipoAba] || 'ti-help')}
                style={{ fontSize: 32, opacity: 0.3, display: 'block', marginBottom: 8 }} aria-hidden="true" />
              {q
                ? (en ? `No result for "${query}".` : `Nenhum resultado para "${query}".`)
                : menuDiario === 'meu'
                  ? (en ? 'You haven\'t recorded any information in your personal notes yet.' : 'Você ainda não registrou nenhuma informação em suas anotações pessoais.')
                  : (en ? 'There is no information available for you to register.' : 'Não há nenhuma informação disponível para você registrar.')}
            </div>
          ) : (
            <>
              <div className="diario-vinculo-list diario-vinculo-list--full">
                {pagina.map((e) => {
                  const refId          = e.slug || e.id;
                  const foiImportado   = importados.has(`${e.tipo}:${String(refId)}`);
                  const isOwn        = souDono && e.criado_por_personagem_id === pjId;
                  const isMestreEntry = !e.criado_por_personagem_id;
                  // Entradas de outro jogador que compartilhou — também importáveis
                  const isOutroJogador = souDono && !isOwn && !isMestreEntry;
                  const podeImportar   = (isMestreEntry || isOutroJogador) && !foiImportado;
                  return (
                    <div key={String(refId)} className="diario-vinculo-item diario-vinculo-item--mestre">
                      {isOwn ? (
                        <input type="checkbox"
                          checked={!!e.compartilhado}
                          disabled={savingVinculo}
                          onChange={(ev) => toggleCompartilhar(e.tipo, refId, ev.target.checked)}
                        />
                      ) : null}
                      <span className="diario-vinculo-nome">{e.nome}</span>
                      <button className="btn-icon btn-sm"
                        onMouseEnter={(ev) => abrirTip(ev, { desc: en ? 'View' : 'Ver' })}
                        onMouseLeave={fecharTip}
                        onClick={() => setViewingLore(e)}>
                        <i className="ti ti-eye" aria-hidden="true" />
                      </button>
                      {isOwn && (
                        <>
                          <button className="btn-icon btn-sm"
                            onMouseEnter={(ev) => abrirTip(ev, { desc: en ? 'Edit' : 'Editar' })}
                            onMouseLeave={fecharTip}
                            onClick={() => { setTipoNovo(e.tipo); setEditando({ ...e }); setSlugOrigemEscolhido(refId); }}>
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
                      {souDono && (
                        foiImportado
                          ? renderBotaoImportado(e.tipo, refId)
                          : podeImportar ? (
                              <button className="btn-icon btn-sm"
                                onMouseEnter={(ev) => abrirTip(ev, { desc: en ? 'Import to journal' : 'Importar para o diário' })}
                                onMouseLeave={fecharTip}
                                onClick={() => importarEntrada(e.tipo, refId, e)}>
                                <i className="ti ti-download" aria-hidden="true" />
                              </button>
                            ) : null
                      )}
                      {/* Selo do personagem criador — à direita de tudo */}
                      {e.criado_por_nome && (
                        <span style={{ fontSize: 11, color: 'var(--gold)', border: '1px solid rgba(201,164,78,0.35)', borderRadius: 4, padding: '1px 7px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                          {e.criado_por_nome}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <LorePaginacao safePage={safePage} totalPages={totalPages} setPage={setPage} lang={lang} />
            </>
          );
        })()}

      </div>{/* lore-mng-page-body */}

      {/* ── Modais ── */}
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

// ---------- SelecionarBaseModal: tela de escolha de base do fork ----------
// Aberta ao clicar "Novo X" em GerenciarLoreView. O Mestre escolhe entre
// começar em branco (seed vazio do tipo) ou usar uma entrada do catálogo
// GLOBAL como ponto de partida (herda os campos, sobrescreve o que quiser
// depois no LoreEntradaForm). Não lista cópias de outras histórias — só
// o catálogo global em si (listar_catalogo_global).
function SelecionarBaseModal({ tipo, lang, onClose, onEscolher }) {
  const en = lang === 'en';
  const [entradas, setEntradas] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const { data, error: err } = await supabaseClient.rpc('listar_catalogo_global', { p_tipo: tipo });
      if (cancelado) return;
      if (err) { setError(err.message); setEntradas([]); return; }
      if (data && data.ok === false) { setError(data.motivo || 'erro'); setEntradas([]); return; }
      setEntradas((data && data.entradas) || []);
    })();
    return () => { cancelado = true; };
  }, [tipo]);

  const q = query.trim().toLowerCase();
  const filtradas = (entradas || []).filter((e) => !q || e.nome.toLowerCase().includes(q));

  return (
    <ModalShell
      title={en ? `New ${diarioTipoLabel(tipo, lang)} — choose a base` : `Novo ${diarioTipoLabel(tipo, lang)} — escolha uma base`}
      lang={lang}
      onClose={onClose}
      onCancel={onClose}
      cancelLabel={en ? 'Cancel' : 'Cancelar'}
    >
      <p className="diario-modal-desc">
        {en
          ? 'Start from scratch or copy an entry from the world catalog as a starting point — you can edit everything afterwards.'
          : 'Comece em branco ou copie uma entrada do catálogo do mundo como ponto de partida — você pode editar tudo depois.'}
      </p>

      <button
        type="button"
        className="diario-vinculo-item diario-vinculo-item--mestre diario-vinculo-item--base"
        onClick={() => onEscolher(null, null)}
      >
        <span className="diario-vinculo-nome">{en ? 'Start from scratch' : 'Começar em branco'}</span>
      </button>

      {entradas === null ? (
        <DiarioLoading text={en ? 'Loading catalog…' : 'Carregando catálogo…'} />
      ) : error ? (
        <DiarioErrorBox error={error} hint={en ? 'Could not load the world catalog.' : 'Não foi possível carregar o catálogo do mundo.'} />
      ) : entradas.length === 0 ? (
        <div className="best-empty diario-empty-md">
          {en ? 'No entries in the world catalog yet.' : 'Nenhuma entrada no catálogo do mundo ainda.'}
        </div>
      ) : (
        <>
          <div className="best-search diario-search-mb">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={en ? 'Search…' : 'Buscar…'}
              aria-label={en ? 'Search' : 'Buscar'}
            />
          </div>
          <div className="diario-vinculo-list diario-vinculo-list--scroll">
            {filtradas.map((e) => (
              <button
                key={e.id}
                type="button"
                className="diario-vinculo-item diario-vinculo-item--mestre"
                onClick={() => onEscolher(e.id, e)}
              >
                <span className="diario-vinculo-nome">{e.nome}</span>
                <i className="ti ti-copy" aria-hidden="true" />
              </button>
            ))}
          </div>
        </>
      )}
    </ModalShell>
  );
}

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

  const podeDec = !disabled && (Number(value) || 0) > min;
  const podeInc = !disabled && (Number(value) || 0) < max;

  return (
    <div className="motor-field">
      {label && <span>{label}</span>}
      <div className="qty-stepper-pill">
        <button type="button" className={"qty-stepper-btn" + (!podeDec ? " is-disabled" : "")} disabled={!podeDec}
          onMouseDown={(e) => e.preventDefault()} onClick={dec}
          aria-label="-">
          <i className="ti ti-minus" aria-hidden="true" />
        </button>
        <span className="qty-stepper-val">
          {value}
        </span>
        <button type="button" className={"qty-stepper-btn" + (!podeInc ? " is-disabled" : "")} disabled={!podeInc}
          onMouseDown={(e) => e.preventDefault()} onClick={inc}
          aria-label="+">
          <i className="ti ti-plus" aria-hidden="true" />
        </button>
      </div>
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
function LoreEntradaForm({ tipo, entrada, onChange, reinosDaHistoria, cidadesDaHistoria, t }) {
  // i18n-sync (Fase 3.1, 07/2026): strings vêm de t.lore.form (COPY[lang]),
  // padrão de 05-convites — este form era PT-only. Fallback defensivo pro
  // COPY global cobre call sites que ainda não passem a prop.
  const tl = (t && t.lore && t.lore.form)
    || (typeof COPY !== 'undefined' && ((COPY[typeof lang !== 'undefined' ? lang : 'pt'] || COPY.pt).lore || {}).form)
    || {};
  const v = entrada || { nome: '', descricao: '', imagem_url: '', atributos: {} };
  const set = (patch) => onChange({ ...v, ...patch });
  const setAttr = (k, val) => onChange({ ...v, atributos: { ...(v.atributos || {}), [k]: val } });

  return (
    <>
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

// ---------- LorePaginacao — paginação da lista de criaturas/lore (padrão best-pag) ----------
function LorePaginacao({ safePage, totalPages, setPage, lang }) {
  const en = lang === 'en';
  const items = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
    .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…'); acc.push(p); return acc; }, []);
  return (
    <div className="best-pag">
      <button className="best-page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} title={en ? 'Previous' : 'Anterior'}>‹</button>
      {items.map((p, idx) => p === '…'
        ? <span key={`ell-${idx}`} className="best-page-ellipsis">…</span>
        : <button key={p} className={'best-page-btn' + (p === safePage ? ' is-active' : '')} onClick={() => setPage(p)}>{p}</button>)}
      <button className="best-page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} title={en ? 'Next' : 'Próxima'}>›</button>
    </div>
  );
}

// ---------- NovaCriaturaCampo — input reaproveitável do form completo de criatura ----------
// type: 'text' (default) | 'number' | 'textarea' | 'select' | 'calc'. Números NÃO
// levam min="0" por padrão porque atributos de criatura podem ser negativos (ver
// orbStyle em CriaturaFicha, acima) — passar minZero explicitamente nos campos
// que são sempre ≥ 0 (energia, defesa, peso, dano...). 'calc' é um valor
// computado (Energia Física/Heroica) — mostra o número, não aceita digitação.
// 'multiselect' guarda a seleção como string separada por vírgula (mesmo
// formato que CriaturaFicha já lê via .split(',')) — não vira array/jsonb.
function NovaCriaturaCampo({ label, value, onChange, type, placeholder, options, rows, minZero, autoFocus, hint, min, max }) {
  if (type === 'multiselect') {
    const selecionados = value ? value.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const toggle = (opt) => {
      const novos = selecionados.includes(opt) ? selecionados.filter((s) => s !== opt) : [...selecionados, opt];
      onChange(novos.join(', '));
    };
    return (
      <div>
        <label className="diario-field-label">{label}</label>
        <div className="diario-multiselect">
          {options.map((opt) => (
            <button key={opt} type="button"
              className={'diario-chip' + (selecionados.includes(opt) ? ' diario-chip--on' : '')}
              onClick={() => toggle(opt)}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (type === 'calc') {
    return (
      <div>
        <label className="diario-field-label">{label}</label>
        <div className="diario-calc">
          <i className="ti ti-calculator" aria-hidden="true" />
          <span className="diario-calc-val">{value}</span>
          {hint && <span className="diario-calc-hint">{hint}</span>}
        </div>
      </div>
    );
  }
  if (type === 'stepper') {
    // QuantityStepper (definido acima, cópia local de 12-batalha) — mesmo
    // seletor usado na aba Item do painel de Ação em batalha. Faixa fixa e
    // pequena (min/max), por isso +/- em vez de dropdown ou digitação livre.
    return (
      <div>
        <label className="diario-field-label">{label}</label>
        <QuantityStepper value={value} onChange={onChange} min={min} max={max} />
      </div>
    );
  }
  if (type === 'textarea') {
    return (
      <div>
        <label className="diario-field-label">{label}</label>
        <textarea
          className="diario-textarea"
          rows={rows || 3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    );
  }
  if (type === 'select') {
    // SelectPill (definido acima, cópia local de 12-batalha) é o padrão real
    // de dropdown do projeto — mesmo componente usado em Raça/Deus/Cidade/
    // Reino no LoreEntradaForm. Native <select> some daqui: o menu aberto de
    // um <select> é renderizado pelo SO, não pelo navegador, e não segue o
    // tema Pedra & Bronze (foi o que o print mostrou).
    return (
      <div>
        <label className="diario-field-label">{label}</label>
        <SelectPill value={value} onChange={onChange} options={options} placeholder={placeholder} />
      </div>
    );
  }
  return (
    <div>
      <label className="diario-field-label">{label}</label>
      <input
        className="diario-input"
        type={type || 'text'}
        min={type === 'number' && minZero ? '0' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </div>
  );
}

// roundUp: equivalente ao ROUNDUP(x, 0) do Excel — arredonda pra cima, afastando
// de zero (diferente de Math.ceil em valores negativos). Usado nas fórmulas de
// Energia Física/Heroica de NovaCriaturaModal, abaixo.
function roundUp(x) { return x < 0 ? -Math.ceil(-x) : Math.ceil(x); }

// ---------- NovaCriaturaModal (Mestre) — criação de criatura no catálogo global ----------
// Cobre os campos reais de `criaturas` já lidos por CriaturaFicha (acima, mesmo
// arquivo — get()/MAPEADOS): identidade, atributos, energia/mobilidade, combate
// e repertório de magias/habilidades/técnicas. Só Nome é obrigatório; qualquer
// outro campo deixado em branco fica DE FORA do payload de insert (→ NULL no
// banco), nunca manda '' pra coluna numérica. Nomes de campo espelham
// exatamente o que CriaturaFicha já lê — se o Supabase reclamar de alguma
// coluna específica, é sinal de schema desatualizado aqui, não erro de
// digitação (conferir contra o painel do Supabase e ajustar).
function NovaCriaturaModal({ lang, onClose, onSaved }) {
  const en = lang === 'en';
  const TIPOS_CRIATURA = ['Animal', 'Civilizado', 'Construído', 'Místico', 'Demoníaco', 'Divino', 'Dragão', 'Elemental', 'Morto'];
  const PLANO_OPCOES = ['Astral', 'Celestial', 'Elemental', 'Material', 'Infernal'];
  const COLETIVO_OPCOES = ['Solitário', 'Grupo Pequeno', 'Grupo Médio', 'Grupo Grande'];
  // Faixas do QuantityStepper (Estágio, os 7 atributos, Nível de magia).
  const ATRIBUTO_MIN = -2, ATRIBUTO_MAX = 10;
  const ESTAGIO_MIN = 1, ESTAGIO_MAX = 40;
  // Nível de magia: sem faixa confirmada pro bestiário — usei 1-9 pelo teto de
  // nível de magia já visto no PJ (custo de karma 1/3/5/7/9). Avisar se for outra.
  const NIVEL_MIN = 1, NIVEL_MAX = 9;
  // Base de Energia Heroica por Coletivo — posição no MATCH da fórmula → CHOOSE(10,13,17,21).
  const EH_BASE_POR_COLETIVO = { 'Grupo Grande': 10, 'Grupo Médio': 13, 'Grupo Pequeno': 17, 'Solitário': 21 };
  // Lista fixa (não vem do banco) — opções de Técnicas Especiais de criatura.
  const TECNICAS_ESPECIAIS_OPCOES = ['Prender', 'Bote', 'Carga de Quadrúpede', 'Carga Aérea', 'Ataques Múltiplos'];

  const CAMPOS_VAZIOS = {
    nome: '', tipo: 'Animal', estagio: ESTAGIO_MIN,
    descricao: '', imagem_url: '',
    subtipo: '', plano: '', coletivo: '',
    aura: 0, forca: 0, fisico: 0, carisma: 0, agilidade: 0, intelecto: 0, percepcao: 0,
    armadura: '', peso: '',
    ataque: '',
    magia: '', magia_n: NIVEL_MIN, tecnicas_especiais: '', habilidades: '',
  };
  const [form, setForm] = React.useState(CAMPOS_VAZIOS);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  // Habilidades: "todas" = o mesmo catálogo global usado no wizard de PJ
  // (08-personagens), já migrado do hardcode GAME_DATA.habilidades pro DB —
  // tabela pública, SELECT all, sem RLS a considerar aqui.
  const [habilidadesCatalogo, setHabilidadesCatalogo] = React.useState([]);
  React.useEffect(() => {
    supabaseClient.from('habilidades').select('*').order('nome')
      .then(({ data }) => { if (data) setHabilidadesCatalogo(data); });
  }, []);
  const HABILIDADES_OPCOES = habilidadesCatalogo.map((h) => h.nome);

  // Ataque agora é dropdown com as armas do catálogo global (`itens`), em vez de
  // texto livre. Filtro: grupo = 'Armas'. `select('*')` (não lista colunas
  // específicas) pra não quebrar caso `dano` (base, ver cálculo de Dano abaixo)
  // não exista com esse nome exato — nesse caso o campo só vem undefined e o
  // cálculo trata como 0, sem erro de query.
  const [armas, setArmas] = React.useState([]);
  const [armaSlug, setArmaSlug] = React.useState('');
  React.useEffect(() => {
    supabaseClient.from('itens').select('*')
      .eq('grupo', 'Armas')
      .order('nome')
      .then(({ data }) => { if (data) setArmas(data); });
  }, []);
  const armaSelecionada = React.useMemo(() => armas.find((a) => a.slug === armaSlug) || null, [armas, armaSlug]);
  const escolherArma = (slug) => {
    setArmaSlug(slug);
    const arma = armas.find((a) => a.slug === slug);
    set({ ataque: arma ? arma.nome : '' });
  };

  // Energia Física, Energia Heroica, Absorção, Defesa, Velocidade e L/M/P/Dano
  // não são digitados — são calculados a partir de outros campos do form.
  // Fórmulas fornecidas pelo usuário (estilo planilha):
  //   EF        = ROUNDUP(2*SQRT(peso) + atributo Físico, 0)
  //   EH        = ROUNDUP((base_por_coletivo + atributo Aura) * Estágio, 0)
  //   Absorção  = IF(atributo Físico > 0, atributo Físico * 5, 0)
  //   Defesa    = IF(Absorção > 0, atributo Agilidade + 8, atributo Agilidade)
  //   Velocidade = (atributo Agilidade + Estágio) * atributo Percepção
  //   L / M / P = dano_l/m/p da arma selecionada + atributo Agilidade
  //   Dano      = dano (base) da arma selecionada + SQRT(peso)  [corrigido —
  //               antes somava atributo Força, o usuário corrigiu pra SQRT(peso)]
  // Defesa depende da Absorção JÁ CALCULADA (não de um campo digitado) — por
  // isso é computada depois, usando absorcaoCalc. Dano usa ROUNDUP porque
  // SQRT(peso) quase sempre é fracionário (mesmo raciocínio da EF, que soma
  // SQRT(peso) e arredonda); as outras não precisam, entradas já são inteiras.
  const energiaFisicaCalc = React.useMemo(() => {
    const peso = form.peso === '' ? 0 : Number(form.peso);
    const fisico = form.fisico === '' ? 0 : Number(form.fisico);
    return roundUp(2 * Math.sqrt(Math.max(0, peso)) + fisico);
  }, [form.peso, form.fisico]);
  const energiaHeroicaCalc = React.useMemo(() => {
    const base = EH_BASE_POR_COLETIVO[form.coletivo] || 0;
    const aura = form.aura === '' ? 0 : Number(form.aura);
    const estagio = form.estagio === '' ? 0 : Number(form.estagio);
    return roundUp((base + aura) * estagio);
  }, [form.coletivo, form.aura, form.estagio]);
  const absorcaoCalc = React.useMemo(() => {
    const fisico = Number(form.fisico) || 0;
    return fisico > 0 ? fisico * 5 : 0;
  }, [form.fisico]);
  const defesaCalc = React.useMemo(() => {
    const agilidade = Number(form.agilidade) || 0;
    return absorcaoCalc > 0 ? agilidade + 8 : agilidade;
  }, [absorcaoCalc, form.agilidade]);
  const velocidadeCalc = React.useMemo(() => {
    const agilidade = Number(form.agilidade) || 0;
    const estagio = form.estagio === '' ? 0 : Number(form.estagio);
    const percepcao = Number(form.percepcao) || 0;
    return (agilidade + estagio) * percepcao;
  }, [form.agilidade, form.estagio, form.percepcao]);
  const lCalc = React.useMemo(() => (Number(armaSelecionada?.dano_l) || 0) + (Number(form.agilidade) || 0), [armaSelecionada, form.agilidade]);
  const mCalc = React.useMemo(() => (Number(armaSelecionada?.dano_m) || 0) + (Number(form.agilidade) || 0), [armaSelecionada, form.agilidade]);
  const pCalc = React.useMemo(() => (Number(armaSelecionada?.dano_p) || 0) + (Number(form.agilidade) || 0), [armaSelecionada, form.agilidade]);
  const danoCalc = React.useMemo(() => {
    const peso = form.peso === '' ? 0 : Number(form.peso);
    return roundUp((Number(armaSelecionada?.dano) || 0) + Math.sqrt(Math.max(0, peso)));
  }, [armaSelecionada, form.peso]);

  // Numéricos: viram Number() no insert; string vazia é OMITIDA (fica NULL).
  // Estágio, os 7 atributos e Nível (magia_n) entram aqui: viraram QuantityStepper
  // numérico, não texto livre nem dropdown — sempre têm valor (nunca ficam vazios).
  // energia_fisica/energia_heroica/absorcao/defesa/velocidade/dano_l/dano_m/
  // dano_p/dano_100 NÃO entram aqui — vão direto no payload em salvar(), sempre
  // (são calculados).
  const CAMPOS_NUM = [
    'estagio',
    'aura', 'forca', 'fisico', 'carisma', 'agilidade', 'intelecto', 'percepcao',
    'peso',
    'magia_n',
  ];
  // Texto opcional (inclui o select de armadura, que também é string): trim; vazio é omitido.
  const CAMPOS_TXT = [
    'descricao', 'imagem_url', 'subtipo', 'plano', 'coletivo',
    'armadura', 'ataque', 'magia', 'tecnicas_especiais', 'habilidades',
  ];

  const salvar = async () => {
    const n = form.nome.trim();
    if (!n) { setError(en ? 'Name is required.' : 'Nome obrigatório.'); return; }
    // Campos calculados não são lidos de `form` — vão sempre (nunca omitidos),
    // diferente do resto dos campos numéricos opcionais.
    const payload = {
      nome: n, tipo: form.tipo,
      energia_fisica: energiaFisicaCalc, energia_heroica: energiaHeroicaCalc,
      absorcao: absorcaoCalc, defesa: defesaCalc, velocidade: velocidadeCalc,
      dano_l: lCalc, dano_m: mCalc, dano_p: pCalc, dano_100: danoCalc,
    };
    CAMPOS_NUM.forEach((k) => { if (form[k] !== '') payload[k] = Number(form[k]); });
    CAMPOS_TXT.forEach((k) => { const v = (form[k] || '').trim(); if (v !== '') payload[k] = v; });
    setSaving(true); setError(null);
    const { error: err } = await supabaseClient.from('criaturas').insert(payload);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved();
  };

  return (
    <ModalShell title={en ? 'New Creature' : 'Nova Criatura'} lang={lang} size="lg"
      onClose={onClose} onCancel={onClose}
      onConfirm={salvar}
      confirmLabel={saving ? (en ? 'Saving…' : 'Salvando…') : (en ? 'Save' : 'Salvar')}
      confirmDisabled={saving}>
      <div className="diario-nova-criatura-body">

        <div className="diario-form-grid diario-form-grid--3col">
          <NovaCriaturaCampo label={en ? 'Name' : 'Nome'} value={form.nome} onChange={(v) => set({ nome: v })} autoFocus />
          <NovaCriaturaCampo label={en ? 'Stage' : 'Estágio'} type="stepper" value={form.estagio} onChange={(v) => set({ estagio: v })}
            min={ESTAGIO_MIN} max={ESTAGIO_MAX} />
          <NovaCriaturaCampo label={en ? 'Type' : 'Tipo'} type="select" value={form.tipo} onChange={(v) => set({ tipo: v })}
            options={TIPOS_CRIATURA.map((t) => ({ value: t, label: t }))} />
        </div>

        <div className="diario-form-section">{en ? 'Description' : 'Descrição'}</div>
        <NovaCriaturaCampo label={en ? 'Description' : 'Descrição'} type="textarea" rows={3} value={form.descricao}
          onChange={(v) => set({ descricao: v })} />
        <NovaCriaturaCampo label={en ? 'Image (URL, optional)' : 'Imagem (URL, opcional)'} value={form.imagem_url}
          onChange={(v) => set({ imagem_url: v })} placeholder="https://…" />

        <div className="diario-form-section">{en ? 'Classification' : 'Classificação'}</div>
        <div className="diario-form-grid">
          <NovaCriaturaCampo label={en ? 'Subtype' : 'Subtipo'} value={form.subtipo} onChange={(v) => set({ subtipo: v })} />
          <NovaCriaturaCampo label={en ? 'Plane' : 'Plano'} type="select" value={form.plano} onChange={(v) => set({ plano: v })}
            options={[{ value: '', label: '—' }, ...PLANO_OPCOES.map((p) => ({ value: p, label: p }))]} />
          <NovaCriaturaCampo label={en ? 'Collective noun' : 'Coletivo'} type="select" value={form.coletivo} onChange={(v) => set({ coletivo: v })}
            options={[{ value: '', label: '—' }, ...COLETIVO_OPCOES.map((c) => ({ value: c, label: c }))]} />
        </div>

        <div className="diario-form-section">{en ? 'Attributes' : 'Atributos'}</div>
        <div className="diario-form-grid">
          <NovaCriaturaCampo label={en ? 'Aura' : 'Aura'} type="stepper" value={form.aura} onChange={(v) => set({ aura: v })} min={ATRIBUTO_MIN} max={ATRIBUTO_MAX} />
          <NovaCriaturaCampo label={en ? 'Strength' : 'Força'} type="stepper" value={form.forca} onChange={(v) => set({ forca: v })} min={ATRIBUTO_MIN} max={ATRIBUTO_MAX} />
          <NovaCriaturaCampo label={en ? 'Physique' : 'Físico'} type="stepper" value={form.fisico} onChange={(v) => set({ fisico: v })} min={ATRIBUTO_MIN} max={ATRIBUTO_MAX} />
          <NovaCriaturaCampo label={en ? 'Charisma' : 'Carisma'} type="stepper" value={form.carisma} onChange={(v) => set({ carisma: v })} min={ATRIBUTO_MIN} max={ATRIBUTO_MAX} />
          <NovaCriaturaCampo label={en ? 'Agility' : 'Agilidade'} type="stepper" value={form.agilidade} onChange={(v) => set({ agilidade: v })} min={ATRIBUTO_MIN} max={ATRIBUTO_MAX} />
          <NovaCriaturaCampo label={en ? 'Intellect' : 'Intelecto'} type="stepper" value={form.intelecto} onChange={(v) => set({ intelecto: v })} min={ATRIBUTO_MIN} max={ATRIBUTO_MAX} />
          <NovaCriaturaCampo label={en ? 'Perception' : 'Percepção'} type="stepper" value={form.percepcao} onChange={(v) => set({ percepcao: v })} min={ATRIBUTO_MIN} max={ATRIBUTO_MAX} />
        </div>

        <div className="diario-form-section">{en ? 'Energy & Mobility' : 'Energia & Mobilidade'}</div>
        <div className="diario-form-grid">
          <NovaCriaturaCampo label={en ? 'Armor Type' : 'Tipo de Armadura'} type="select"
            value={form.armadura} onChange={(v) => set({ armadura: v })}
            options={[
              { value: '', label: '—' },
              { value: 'L', label: en ? 'Light (L)' : 'Leve (L)' },
              { value: 'M', label: en ? 'Medium (M)' : 'Média (M)' },
              { value: 'P', label: en ? 'Heavy (P)' : 'Pesada (P)' },
            ]} />
          <NovaCriaturaCampo label={en ? 'Weight' : 'Peso'} type="number" minZero
            value={form.peso} onChange={(v) => set({ peso: v })} />
          <NovaCriaturaCampo label={en ? 'Absorption' : 'Absorção'} type="calc" value={absorcaoCalc} />
          <NovaCriaturaCampo label={en ? 'Defense' : 'Defesa'} type="calc" value={defesaCalc} />
          <NovaCriaturaCampo label={en ? 'Speed' : 'Velocidade'} type="calc" value={velocidadeCalc} />
          <NovaCriaturaCampo label={en ? 'Physical Energy' : 'Energia Física'} type="calc" value={energiaFisicaCalc} />
          <NovaCriaturaCampo label={en ? 'Heroic Energy' : 'Energia Heroica'} type="calc" value={energiaHeroicaCalc} />
        </div>

        <div className="diario-form-section">{en ? 'Combat' : 'Combate'}</div>
        <div className="diario-form-grid diario-form-grid--5col">
          <NovaCriaturaCampo label={en ? 'Attack' : 'Ataque'} type="select" value={armaSlug} onChange={escolherArma}
            options={[{ value: '', label: '—' }, ...armas.map((a) => ({ value: a.slug, label: a.nome }))]} />
          <NovaCriaturaCampo label="L" type="calc" value={lCalc} />
          <NovaCriaturaCampo label="M" type="calc" value={mCalc} />
          <NovaCriaturaCampo label="P" type="calc" value={pCalc} />
          <NovaCriaturaCampo label={en ? 'Damage' : 'Dano'} type="calc" value={danoCalc} />
        </div>

        <div className="diario-form-section">{en ? 'Spells & Abilities' : 'Magias & Habilidades'}</div>
        <div className="diario-form-grid diario-form-grid--2col">
          <NovaCriaturaCampo label={en ? 'Spells' : 'Magias'} value={form.magia} onChange={(v) => set({ magia: v })}
            placeholder={en ? 'comma-separated' : 'separadas por vírgula'} />
          <NovaCriaturaCampo label={en ? 'Level' : 'Nível'} type="stepper" value={form.magia_n} onChange={(v) => set({ magia_n: v })}
            min={NIVEL_MIN} max={NIVEL_MAX} />
        </div>
        <NovaCriaturaCampo label={en ? 'Special Techniques' : 'Técnicas Especiais'} type="multiselect" value={form.tecnicas_especiais}
          onChange={(v) => set({ tecnicas_especiais: v })} options={TECNICAS_ESPECIAIS_OPCOES} />
        <NovaCriaturaCampo label={en ? 'Abilities' : 'Habilidades'} type="multiselect" value={form.habilidades}
          onChange={(v) => set({ habilidades: v })} options={HABILIDADES_OPCOES} />

        {error && <div className="err-msg">{error}</div>}
      </div>
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

function GerenciarLoreView({ historia, lang, onClose, onChanged }) {
  const en = lang === 'en';
  const PAGE_SIZE = 10;
  const [tipoAba, setTipoAba] = useState('npc'); // npc | reino | cidade | criatura (disponibilizar)
  const [lore, setLore] = useState(null);
  const [criaturas, setCriaturas] = useState(null);
  // Catálogo GLOBAL (canônico) de reino/cidade/npc — migration 016. Só
  // exibido (checkbox + ver), nunca editável/excluível por aqui, mesmo
  // padrão que `criaturas` já tinha. Chave por tipo pra casar com tipoAba.
  const [catalogoGlobal, setCatalogoGlobal] = useState({ reino: [], cidade: [], npc: [] });
  const [error, setError] = useState(null);
  const [editando, setEditando] = useState(null);
  const [slugOrigemEscolhido, setSlugOrigemEscolhido] = useState(null);
  const [savingVinculo, setSavingVinculo] = useState(false);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [novaCriatura, setNovaCriatura] = useState(false);
  const [viewingLore, setViewingLore] = useState(null);
  const [tipoNovo, setTipoNovo] = useState(null);
  // Catálogo lazy: 'treinamento' agrupa magia+habilidade+tecnica (cada item tem .tipo)
  const [catalogoNovos, setCatalogoNovos] = useState({ item: null, treinamento: null });
  const [loadingExtra, setLoadingExtra]   = useState(false);
  const [errorExtra,   setErrorExtra]     = useState(null);
  const [tip, abrirTip, fecharTip, manterTip] = usePortalTooltip(80);
  // Protagonistas da história — carregados uma vez, usados no seletor de liberação por PJ
  const [protagonistas, setProtagonistas] = useState([]);
  useEffect(() => { setPage(1); setQuery(''); }, [tipoAba]);

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

  // Carrega catálogo na primeira vez que o tab é aberto
  useEffect(() => {
    if (!DIARIO_TIPOS_NOVOS.has(tipoAba)) return;
    if (catalogoNovos[tipoAba] !== null) return;
    setLoadingExtra(true);
    setErrorExtra(null);
    if (tipoAba === 'treinamento') {
      // Carrega magia + habilidade + tecnica em paralelo e combina
      Promise.all([
        supabaseClient.from('magias').select('nome, descricao').order('nome'),
        supabaseClient.from('habilidades').select('nome, descricao').order('nome'),
        supabaseClient.from('tecnicas').select('nome, descricao').order('nome'),
      ]).then(([mag, hab, tec]) => {
        setLoadingExtra(false);
        const err = mag.error || hab.error || tec.error;
        if (err) { setErrorExtra(err.message); return; }
        const combined = [
          ...(mag.data || []).map((e) => ({ ...e, tipo: 'magia' })),
          ...(hab.data || []).map((e) => ({ ...e, tipo: 'habilidade' })),
          ...(tec.data || []).map((e) => ({ ...e, tipo: 'tecnica' })),
        ].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', en ? 'en' : 'pt'));
        setCatalogoNovos((prev) => ({ ...prev, treinamento: combined }));
      });
    } else if (tipoAba === 'item') {
      // Modelo A (Fase 2, 07/2026): a aba Item mescla o catálogo GLOBAL
      // (itens) com os ITENS DA CAMPANHA (itens_historia desta história).
      // A versão da campanha vence quando o nome coincide — MESMA regra da
      // RPC listar_diario_disponivel (migration 019), pra Mestre e Jogador
      // enxergarem a mesma coisa.
      Promise.all([
        supabaseClient.from('itens').select('nome, descricao').order('nome'),
        supabaseClient.from('itens_historia').select('nome, descricao').eq('historia_id', historia.id).order('nome'),
      ]).then(([cat, camp]) => {
        setLoadingExtra(false);
        const err = cat.error || camp.error;
        if (err) { setErrorExtra(err.message); return; }
        const nomesCampanha = new Set((camp.data || []).map((e) => e.nome));
        const combined = [
          ...(camp.data || []).map((e) => ({ ...e, tipo: 'item', campanha: true })),
          ...(cat.data || []).filter((e) => !nomesCampanha.has(e.nome)).map((e) => ({ ...e, tipo: 'item' })),
        ].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', en ? 'en' : 'pt'));
        setCatalogoNovos((prev) => ({ ...prev, item: combined }));
      });
    } else {
      supabaseClient.from(TIPO_TABELA[tipoAba]).select('nome, descricao').order('nome')
        .then(({ data, error: err }) => {
          setLoadingExtra(false);
          if (err) { setErrorExtra(err.message); return; }
          setCatalogoNovos((prev) => ({ ...prev, [tipoAba]: (data || []).map((e) => ({ ...e, tipo: tipoAba })) }));
        });
    }
  }, [tipoAba]); // eslint-disable-line react-hooks/exhaustive-deps

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
      p_slug_origem: slugOrigemEscolhido,
    });
    if (err) { setError(err.message); return; }
    if (data && data.ok === false) { setError(data.motivo || 'erro'); return; }
    setEditando(null);
    setSlugOrigemEscolhido(null);
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

  const toggleDisponibilizar = async (tipo, id, ligar) => {
    setSavingVinculo(true);
    setError(null);
    // Mapeamento de tipo -> coluna em historias (migration 014/015):
    // criatura_ids (bigint[], já existente) continua igual; reino/cidade/
    // npc agora têm colunas próprias (text[], por slug) em vez do antigo
    // lore_ids genérico.
    const campo = {
      criatura:   'criatura_ids',
      reino:      'reino_ids',
      cidade:     'cidade_ids',
      npc:        'npc_ids',
      item:       'item_ids',
      magia:      'magia_ids',
      habilidade: 'habilidade_ids',
      tecnica:    'tecnica_ids',
    }[tipo];
    const atual = historia[campo] || [];
    const novo = ligar ? [...new Set([...atual, id])] : atual.filter((x) => x !== id);
    // ⚠️ .select() é ESSENCIAL: sem ele, um UPDATE bloqueado por RLS retorna
    // sucesso com 0 linhas afetadas (sem erro). O checkbox "marcava" via
    // mutação local, mas nada persistia — e o personagem nunca via a entrada.
    // Com .select() detectamos esse caso e o valor real gravado no banco.
    const { data: rows, error: err } = await supabaseClient
      .from('historias')
      .update({ [campo]: novo })
      .eq('id', historia.id)
      .select(`id, ${campo}`);
    setSavingVinculo(false);
    if (err) { setError(err.message); return; }
    if (!rows || rows.length === 0) {
      // Persistência falhou silenciosamente (0 linhas). Quase sempre RLS na
      // tabela historias. A correção definitiva é uma RPC SECURITY DEFINER
      // pra gravar a coluna — mas aqui pelo menos deixamos o erro visível.
      setError(en
        ? 'Could not save: the update affected 0 rows (likely an RLS/permission rule on "historias"). A SECURITY DEFINER RPC is needed to write this column.'
        : 'Não foi possível salvar: o update não afetou nenhuma linha (provável regra de RLS/permissão em "historias"). É preciso uma RPC SECURITY DEFINER pra gravar essa coluna no banco.');
      return;
    }
    // Reflete o valor REAL retornado pelo banco (não o otimista), pra tela e
    // persistência ficarem sempre em sincronia.
    historia[campo] = rows[0][campo] || novo;
    setLore((prev) => [...(prev || [])]); // força re-render
    if (onChanged) onChanged();
  };

  // toggleLiberarPj — grava em historias.lore_acesso_pj (jsonb) a lista de
  // pj_ids que podem ver/importar uma entrada específica de lore.
  // Chave do jsonb: "<tipo>:<ref_id>" — mesmo padrão tipo:ref_id usado no
  // importados_set de montarCatalogoDisponivel.
  // Quando `ligar=true`: adiciona pjId à lista; quando false: remove.
  // Se a lista ficar vazia, remove a chave do objeto (não deixa array vazio).
  const toggleLiberarPj = async (tipo, refId, pjId, ligar) => {
    setSavingVinculo(true);
    setError(null);
    const chave = `${tipo}:${String(refId)}`;
    const atual = (historia.lore_acesso_pj && typeof historia.lore_acesso_pj === 'object')
      ? { ...historia.lore_acesso_pj }
      : {};
    const listaAtual = Array.isArray(atual[chave]) ? atual[chave] : [];
    let novaLista;
    if (ligar) {
      novaLista = [...new Set([...listaAtual, pjId])];
    } else {
      novaLista = listaAtual.filter((x) => x !== pjId);
    }
    const novoObj = { ...atual };
    if (novaLista.length > 0) {
      novoObj[chave] = novaLista;
    } else {
      delete novoObj[chave];
    }
    const { data: rows, error: err } = await supabaseClient
      .from('historias')
      .update({ lore_acesso_pj: novoObj })
      .eq('id', historia.id)
      .select('id, lore_acesso_pj');
    setSavingVinculo(false);
    if (err) { setError(err.message); return; }
    if (!rows || rows.length === 0) {
      setError(en
        ? 'Could not save access: update affected 0 rows (check RLS on "historias").'
        : 'Não foi possível salvar o acesso: update não afetou nenhuma linha (verifique RLS em "historias").');
      return;
    }
    historia.lore_acesso_pj = rows[0].lore_acesso_pj || novoObj;
    setLore((prev) => [...(prev || [])]); // força re-render
  };

  // ── Form de Novo/Editar item — CONTINUA como ModalShell por cima da página
  // reinosDaHistoria/cidadesDaHistoria: opções pros <select> de FK em
  // LoreEntradaForm (cidade.reino, npc.origem/cidade) — limitadas às
  // CÓPIAS já existentes nesta história (decisão combinada: Mestre só
  // liga a algo que ele mesmo já forkou antes, não ao catálogo global direto).
  const reinosDaHistoria = (lore || []).filter((e) => e.tipo === 'reino');
  const cidadesDaHistoria = (lore || []).filter((e) => e.tipo === 'cidade');

  const formModal = editando && (
    <ModalShell
      title={editando.id
        ? (en ? `Edit ${diarioTipoLabel(tipoNovo || tipoAba, lang)}` : `Editar ${diarioTipoLabel(tipoNovo || tipoAba, lang)}`)
        : (en ? `New ${diarioTipoLabel(tipoNovo || tipoAba, lang)}` : `Novo ${diarioTipoLabel(tipoNovo || tipoAba, lang)}`)}
      lang={lang}
      onClose={() => { setEditando(null); setTipoNovo(null); }}
      onCancel={() => { setEditando(null); setTipoNovo(null); }}
      onConfirm={salvarLore}
    >
      <LoreEntradaForm
        tipo={tipoNovo || tipoAba}
        entrada={editando}
        onChange={setEditando}
        reinosDaHistoria={reinosDaHistoria}
        cidadesDaHistoria={cidadesDaHistoria}
        t={COPY[lang] || COPY.pt}
      />
      {error && <div className="err-msg diario-err-mt">{error}</div>}
    </ModalShell>
  );

  const loreDoTipo = (lore || []).filter((e) =>
    tipoAba === 'lugar' ? LUGAR_TIPOS.has(e.tipo) : e.tipo === tipoAba
  );

  return (
    <div className="fp-page">
      <div className="fp-card lore-mng-page">
        <div className="fp-card-top">
          <header className="ms-header lore-mng-page-header">
        <button
          type="button"
          className="btn-icon btn-sm"
          onClick={onClose}
          aria-label={en ? 'Back to stories' : 'Voltar às histórias'}>
          <i className="ti ti-arrow-left" />
        </button>
        <div className="lore-mng-page-title-wrap">
          <div className="lore-mng-page-eyebrow">
            <i className="ti ti-book-2" aria-hidden="true" />
            {historia.titulo}
          </div>
          <h2 className="ms-title lore-mng-page-h2">Lore</h2>
        </div>
        {tipoAba === 'criatura' ? (
          <button className="btn-primary btn-sm" onClick={() => setNovaCriatura(true)}>
            {en ? 'New Creature' : 'Nova Criatura'}
          </button>
        ) : DIARIO_TIPOS_NOVOS.has(tipoAba) ? null
        : tipoAba === 'lugar' ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-primary btn-sm" onClick={() => { setTipoNovo('reino'); setSlugOrigemEscolhido(null); setEditando({}); }}>
              {en ? 'New Kingdom' : 'Novo Reino'}
            </button>
            <button className="btn-primary btn-sm" onClick={() => { setTipoNovo('cidade'); setSlugOrigemEscolhido(null); setEditando({}); }}>
              {en ? 'New City' : 'Nova Cidade'}
            </button>
          </div>
        ) : (
          <button className="btn-primary btn-sm" onClick={() => { setSlugOrigemEscolhido(null); setEditando({}); }}>
            {en ? `New ${diarioTipoLabel(tipoAba, lang)}` : `Novo ${diarioTipoLabel(tipoAba, lang)}`}
          </button>
        )}
          </header>
        </div>
        <div className="lore-mng-page-body">
        {lore === null ? (
          <DiarioLoading text={en ? 'Loading…' : 'Carregando…'} />
        ) : (
          <>

            <div className="lore-mng-toolbar">
              <div className="diario-subtabs" role="tablist">
                {DIARIO_TIPOS.map((t) => (
                  <button key={t} className={tipoAba === t ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'} onClick={() => setTipoAba(t)}>
                    {diarioTipoLabel(t, lang)}
                  </button>
                ))}
              </div>
              <div className="best-search">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                  placeholder={en ? 'Search…' : 'Buscar…'}
                  aria-label={en ? 'Search' : 'Buscar'}
                />
                {query && (
                  <button
                    type="button"
                    className="best-search-clear"
                    onClick={() => { setQuery(''); setPage(1); }}
                    aria-label={en ? 'Clear' : 'Limpar'}>
                    <i className="ti ti-x" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            {error && <div className="err-msg diario-err-mb">{error}</div>}

            {DIARIO_TIPOS_NOVOS.has(tipoAba) ? (() => {
              if (loadingExtra || catalogoNovos[tipoAba] === null) {
                return <DiarioLoading text={en ? 'Loading…' : 'Carregando…'} />;
              }
              if (errorExtra) {
                return <DiarioErrorBox error={errorExtra} hint={en ? 'Could not load data.' : 'Não foi possível carregar os dados.'} />;
              }
              const q = query.trim().toLowerCase();
              const entradas = catalogoNovos[tipoAba].filter(
                (e) => !q || (e.nome || '').toLowerCase().includes(q) || (e.descricao || '').toLowerCase().includes(q)
              );
              if (entradas.length === 0) return (
                <div className="best-empty diario-empty-lg">
                  <i className={'ti ' + (DIARIO_TIPO_ICON[tipoAba] || 'ti-help')}
                     style={{ fontSize: 32, opacity: 0.3, display: 'block', marginBottom: 8 }} aria-hidden="true" />
                  {q
                    ? (en ? `No result for "${query}".` : `Nenhum resultado para "${query}".`)
                    : (en ? 'Nothing here yet.' : 'Nada cadastrado ainda.')}
                </div>
              );
              const totalPages = Math.max(1, Math.ceil(entradas.length / PAGE_SIZE));
              const safePage   = Math.min(page, totalPages);
              const pagina     = entradas.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
              return (
                <>
                  <div className="diario-vinculo-list diario-vinculo-list--full">
                    {pagina.map((e) => {
                      // e.tipo é o tipo real (magia/habilidade/tecnica/item)
                      const campoReal = `${e.tipo}_ids`;
                      const ligado = (historia[campoReal] || []).includes(e.nome);
                      return (
                        <div key={`${e.tipo}:${e.nome}`} className="diario-vinculo-item diario-vinculo-item--mestre">
                          <input type="checkbox" checked={ligado} disabled={savingVinculo}
                            onChange={(ev) => toggleDisponibilizar(e.tipo, e.nome, ev.target.checked)} />
                          <span className="diario-vinculo-nome">{e.nome}</span>
                          <button className="btn-icon btn-sm"
                            onMouseEnter={(ev) => abrirTip(ev, { desc: en ? 'View' : 'Ver' })}
                            onMouseLeave={fecharTip}
                            onClick={() => setViewingLore({ ...e })}>
                            <i className="ti ti-eye" aria-hidden="true" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <LorePaginacao safePage={safePage} totalPages={totalPages} setPage={setPage} lang={lang} />
                </>
              );
            })() : tipoAba === 'criatura' ? (() => {
              const q = query.trim().toLowerCase();
              const lista = (criaturas || []).filter((c) => !q || c.nome.toLowerCase().includes(q));
              const totalPages = Math.max(1, Math.ceil(lista.length / PAGE_SIZE));
              const safePage = Math.min(page, totalPages);
              const pagina = lista.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
              return (
                <>
                  {lista.length === 0 && q ? (
                    <div className="best-empty diario-empty-lg">{en ? `No creature matches "${query}".` : `Nenhuma criatura corresponde a "${query}".`}</div>
                  ) : (
                    <>
                      <div className="diario-vinculo-list diario-vinculo-list--full">
                        {pagina.map((c) => {
                          const ligado = (historia.criatura_ids || []).includes(c.id);
                          return (
                            <div key={c.id} className="diario-vinculo-item diario-vinculo-item--mestre">
                              <input type="checkbox" checked={ligado} disabled={savingVinculo} onChange={(e) => toggleDisponibilizar('criatura', c.id, e.target.checked)} />
                              <span className="diario-vinculo-nome">{c.nome}</span>
                              <button className="btn-icon btn-sm"
                                onMouseEnter={(ev) => abrirTip(ev, { desc: en ? 'View' : 'Ver' })}
                                onMouseLeave={fecharTip}
                                onClick={async () => {
                                  const { data } = await supabaseClient.from('criaturas').select('*').eq('id', c.id).maybeSingle();
                                  setViewingLore(data ? { ...data, tipo: 'criatura', ref_id: data.id } : { ...c, tipo: 'criatura', ref_id: c.id });
                                }}>
                                <i className="ti ti-eye" aria-hidden="true" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <LorePaginacao safePage={safePage} totalPages={totalPages} setPage={setPage} lang={lang} />
                    </>
                  )}
                </>
              );
            })() : (() => {
              const q = query.trim().toLowerCase();
              // Aba Lugares: combina reino + cidade numa única lista
              const tiposDoBloco = tipoAba === 'lugar' ? ['reino', 'cidade'] : [tipoAba];
              const globaisDoTipo = tiposDoBloco.flatMap((t) =>
                (catalogoGlobal[t] || []).map((g) => ({ ...g, tipo: t, _global: true }))
              );
              const combinado = [...globaisDoTipo, ...loreDoTipo]
                .filter((e) => !q || (e.nome || '').toLowerCase().includes(q))
                .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', en ? 'en' : 'pt'));
              if (combinado.length === 0) return (
                <div className="best-empty diario-empty-lg">
                  {q ? (en ? `No result for "${query}".` : `Nenhum resultado para "${query}".`) : (en ? 'Nothing registered yet.' : 'Nada cadastrado ainda.')}
                </div>
              );
              const totalPages = Math.max(1, Math.ceil(combinado.length / PAGE_SIZE));
              const safePage = Math.min(page, totalPages);
              const pagina = combinado.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
              return (
                <>
                  <div className="diario-vinculo-list diario-vinculo-list--full">
                    {pagina.map((e) => {
                      const campoIds = { reino: 'reino_ids', cidade: 'cidade_ids', npc: 'npc_ids' }[e.tipo];
                      const ligado = (historia[campoIds] || []).includes(e.id);
                      return (
                        <div key={(e._global ? 'g-' : 'c-') + e.tipo + '-' + e.id} className="diario-vinculo-item diario-vinculo-item--mestre">
                          <input type="checkbox" checked={ligado} disabled={savingVinculo}
                            onChange={(ev) => toggleDisponibilizar(e.tipo, e.id, ev.target.checked)} />
                          <span className="diario-vinculo-nome">{e.nome}</span>
                          <button className="btn-icon btn-sm"
                            onMouseEnter={(ev) => abrirTip(ev, { desc: en ? 'View' : 'Ver' })}
                            onMouseLeave={fecharTip}
                            onClick={() => setViewingLore(e)}>
                            <i className="ti ti-eye" aria-hidden="true" />
                          </button>
                          {!e._global && (
                            <>
                              <button className="btn-icon btn-sm"
                                onMouseEnter={(ev) => abrirTip(ev, { desc: en ? 'Edit' : 'Editar' })}
                                onMouseLeave={fecharTip}
                                onClick={() => { setTipoNovo(e.tipo); setEditando(e); }}>
                                <i className="ti ti-pencil" aria-hidden="true" />
                              </button>
                              <button className="btn-icon btn-danger btn-sm"
                                onMouseEnter={(ev) => abrirTip(ev, { desc: en ? 'Delete' : 'Excluir' })}
                                onMouseLeave={fecharTip}
                                onClick={() => excluirLore(e.id)}>
                                <i className="ti ti-trash" aria-hidden="true" />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <LorePaginacao safePage={safePage} totalPages={totalPages} setPage={setPage} lang={lang} />
                </>
              );
            })()}
          </>
        )}
      </div>

      {novaCriatura && (
        <NovaCriaturaModal lang={lang} onClose={() => setNovaCriatura(false)}
          onSaved={async () => { setNovaCriatura(false); await carregar(); if (onChanged) onChanged(); }} />
      )}
      {viewingLore && (
        <DetalheEntradaModal
          entrada={viewingLore}
          lang={lang}
          lore={[...(lore || []), ...catalogoGlobal.reino, ...catalogoGlobal.cidade, ...catalogoGlobal.npc]}
          onClose={() => setViewingLore(null)}
          protagonistas={protagonistas}
          loreAcessoPj={historia.lore_acesso_pj || {}}
          onToggleLiberarPj={toggleLiberarPj}
          savingVinculo={savingVinculo}
        />
      )}
        {formModal}
      <PortalTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
      </div>
    </div>
  );
}

Object.assign(window, { DiarioView, GerenciarLoreView });
