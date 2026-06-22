/* ============================================================
   BATALHA — Console de Batalha
   ============================================================
   Fase 3b: launcher (a partir do HistoriaCard), lista de batalhas
   da história, e tela de montagem (setup) que cria a batalha.

   A condução em si (iniciativa, rodadas, dado, ações, dano) entra
   nas Fases 4-6. Aqui a batalha nasce em estado 'setup'.

   DB: tabela `batalhas` (migration 007). Vínculos de participantes
   vêm de historias.protagonista_ids (PJs) e historias.criatura_ids
   (criaturas) — migration 008.

   Carregar no HTML APÓS historias.jsx é desnecessário (funções são
   globais e resolvidas em runtime), mas precisa estar na lista de
   <script> antes do App renderizar.
   Depende de: supabaseClient, useState/useEffect (helpers.jsx).
   ============================================================ */

/* ============================== [26] BATALHA — Console ============================== */

function BatalhasHistoriaModal({ historia, personagens = [], criaturas = [], lang, currentUserId, onClose }) {
  const isEn = lang === 'en';
  const [view, setView] = useState('lista');     // 'lista' | 'nova' | 'conduzir'
  const [batalhas, setBatalhas] = useState(null);
  const [error, setError] = useState(null);
  const [abrindo, setAbrindo] = useState(null);   // batalha sendo aberta (placeholder Fase 4)

  // Participantes vinculados à história (PJs + criaturas)
  const pjsVinc = (historia.protagonista_ids || [])
    .map((id) => personagens.find((p) => p.id === id))
    .filter(Boolean);
  const criaturasVinc = (historia.criatura_ids || [])
    .map((id) => criaturas.find((c) => c.id === id))
    .filter(Boolean);

  const carregar = async () => {
    const { data, error: err } = await supabaseClient
      .from('batalhas')
      .select('*')
      .eq('historia_id', historia.id)
      .order('created_at', { ascending: false });
    if (err) { setError(err.message); setBatalhas([]); }
    else { setError(null); setBatalhas(data || []); }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, []);

  // Escape e travamento de scroll já são responsabilidade do ModalShell — não duplicar aqui.

  const excluirBatalha = async (id) => {
    const { error: err } = await supabaseClient.from('batalhas').delete().eq('id', id);
    if (err) { setError(err.message); return; }
    carregar();
  };

  const estadoLabel = (e) => ({
    setup:     isEn ? 'Setup'     : 'Montagem',
    ativa:     isEn ? 'Active'    : 'Ativa',
    encerrada: isEn ? 'Ended'     : 'Encerrada',
  }[e] || e);

  return (
    <ModalShell
      title={`${isEn ? 'Battles' : 'Batalhas'} · ${historia.titulo}`}
      lang={lang}
      size="lg"
      onClose={onClose}
    >
          {error && <div className="err-msg">{error}</div>}

          {view === 'nova' ? (
            <NovaBatalhaView
              isEn={isEn}
              pjsVinc={pjsVinc}
              criaturasVinc={criaturasVinc}
              onCancel={() => setView('lista')}
              onCriar={async (participantes) => {
                const { error: err } = await supabaseClient.from('batalhas').insert({
                  historia_id: historia.id,
                  mestre_id: currentUserId,
                  estado: 'setup',
                  participantes,
                });
                if (err) { setError(err.message); return; }
                setView('lista');
                carregar();
              }}
            />
          ) : abrindo ? (
            <ConduzirBatalhaView
              batalha={abrindo}
              historia={historia}
              lang={lang}
              onVoltar={() => { setAbrindo(null); carregar(); }}
              onAtualizado={() => carregar()}
            />
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button className="btn-primary btn-sm" onClick={() => setView('nova')}>
                  + {isEn ? 'New battle' : 'Nova batalha'}
                </button>
              </div>

              {batalhas === null ? (
                <div className="admin-loading"><span>{isEn ? 'Loading battles…' : 'Carregando batalhas…'}</span></div>
              ) : batalhas.length === 0 ? (
                <div className="hist-protag-empty" style={{ padding: '16px 0' }}>
                  {isEn ? 'No battles yet for this story.' : 'Nenhuma batalha nesta história ainda.'}
                </div>
              ) : (
                <div className="batalha-lista">
                  {batalhas.map((b) => {
                    const qtd = Array.isArray(b.participantes) ? b.participantes.length : 0;
                    const data = b.created_at
                      ? new Date(b.created_at).toLocaleDateString(isEn ? 'en-US' : 'pt-BR',
                          { day: '2-digit', month: 'short', year: 'numeric' })
                      : '';
                    // Rótulo descritivo sem expor o id da linha (que pula números após DELETE).
                    const titulo = b.estado === 'setup'
                      ? (isEn ? 'Battle in setup' : 'Batalha em montagem')
                      : b.estado === 'ativa'
                        ? (isEn ? `Battle in progress · round ${b.rodada || 1}` : `Batalha em andamento · rodada ${b.rodada || 1}`)
                        : (isEn ? 'Battle' : 'Batalha');
                    return (
                      <div key={b.id} className="batalha-card">
                        <div className="batalha-card-main">
                          <div className="batalha-card-titulo">
                            {titulo}
                            <span className={'batalha-estado est-' + b.estado}>{estadoLabel(b.estado)}</span>
                          </div>
                          <div className="batalha-card-meta">
                            {qtd} {isEn ? 'participants' : 'participantes'}
                            {data ? ` · ${data}` : ''}
                          </div>
                        </div>
                        <div className="batalha-card-actions">
                          <button className="btn-icon btn-sm" title={isEn ? 'Open' : 'Abrir'}
                            onClick={() => setAbrindo(b)}>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12h14" /><path d="M13 6l6 6-6 6" />
                            </svg>
                          </button>
                          <button className="btn-icon btn-danger btn-sm" title={isEn ? 'Delete' : 'Excluir'}
                            onClick={() => excluirBatalha(b.id)}>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
    </ModalShell>
  );
}

// Tela de montagem: lista PJs e criaturas vinculados, todos pré-marcados.
function NovaBatalhaView({ isEn, pjsVinc, criaturasVinc, onCancel, onCriar }) {
  const nomePj = (p) => `${p.nome}${p.sobrenome ? ' ' + p.sobrenome : ''}`;
  // chaves "pj:id" / "cri:id" — todos marcados por padrão
  const [sel, setSel] = useState(() => new Set([
    ...pjsVinc.map((p) => 'pj:' + p.id),
    ...criaturasVinc.map((c) => 'cri:' + c.id),
  ]));
  const [saving, setSaving] = useState(false);

  const toggle = (key) => setSel((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const total = sel.size;

  const criar = async () => {
    setSaving(true);
    const participantes = [
      ...pjsVinc.filter((p) => sel.has('pj:' + p.id))
        .map((p) => ({ tipo: 'pj', ref_id: p.id, nome: nomePj(p) })),
      ...criaturasVinc.filter((c) => sel.has('cri:' + c.id))
        .map((c) => ({ tipo: 'criatura', ref_id: c.id, nome: c.nome })),
    ];
    await onCriar(participantes);
    setSaving(false);
  };

  const semVinculados = pjsVinc.length === 0 && criaturasVinc.length === 0;

  return (
    <>
      <div className="wiz-field">
        <span>{isEn ? 'Players' : 'Jogadores'} ({pjsVinc.filter((p) => sel.has('pj:' + p.id)).length})</span>
        {pjsVinc.length === 0 ? (
          <div className="hist-protag-empty" style={{ padding: '8px 0' }}>
            {isEn ? 'No players linked to this story' : 'Nenhum jogador vinculado a esta história'}
          </div>
        ) : (
          <div className="hist-protag-list">
            {pjsVinc.map((p) => {
              const key = 'pj:' + p.id; const on = sel.has(key);
              return (
                <label key={key} className={'hist-protag-item' + (on ? ' on' : '')}>
                  <input type="checkbox" checked={on} onChange={() => toggle(key)} />
                  <div className="hist-protag-name">{nomePj(p)}</div>
                  <div className="hist-protag-meta">{p.raca} · {p.profissao}</div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="wiz-field">
        <span>{isEn ? 'Creatures' : 'Criaturas'} ({criaturasVinc.filter((c) => sel.has('cri:' + c.id)).length})</span>
        {criaturasVinc.length === 0 ? (
          <div className="hist-protag-empty" style={{ padding: '8px 0' }}>
            {isEn ? 'No creatures linked to this story' : 'Nenhuma criatura vinculada a esta história'}
          </div>
        ) : (
          <div className="hist-protag-list">
            {criaturasVinc.map((c) => {
              const key = 'cri:' + c.id; const on = sel.has(key);
              return (
                <label key={key} className={'hist-protag-item' + (on ? ' on' : '')}>
                  <input type="checkbox" checked={on} onChange={() => toggle(key)} />
                  <div className="hist-protag-name">{c.nome}</div>
                  <div className="hist-protag-meta">{c.tipo || '—'}{c.estagio != null ? ` · ${isEn ? 'Lvl' : 'Est.'} ${c.estagio}` : ''}</div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="wiz-actions">
        <button className="btn-ghost btn-sm" onClick={onCancel} disabled={saving}>
          {isEn ? 'Cancel' : 'Cancelar'}
        </button>
        <button className="btn-primary btn-sm" onClick={criar} disabled={saving || total === 0 || semVinculados}>
          {saving
            ? (isEn ? 'Creating…' : 'Criando…')
            : `${isEn ? 'Create battle' : 'Criar batalha'} (${total})`}
        </button>
      </div>
    </>
  );
}

/* ── Dano de uma magia no nível efetivo do conjurador ─────────── */
/* Extrai o número do texto `nivel_N` (ex.: "Cause 16 de dano base."). */
/* Fallback: campo `dano` da tabela (que costuma ser o do nível 9).    */
function danoMagiaNoNivel(magia, nivelEfetivo) {
  if (!magia) return 0;
  const campo = 'nivel_' + nivelEfetivo;
  const txt = magia[campo];
  if (txt) {
    const m = /(\d+)\s*de\s*dano/i.exec(txt);
    if (m) return parseInt(m[1], 10);
  }
  return magia.dano || 0;
}

/* ── Magias ofensivas conhecidas pelo PJ ──────────────────────── */
/* Filtra magias com passos>0 que entregam dano > 0 no nível efetivo. */
/* Custo de karma = nível efetivo (1/3/5/7/9), por decisão do sistema. */
function magiasOfensivasDoAtor(ator, catalogos) {
  if (!ator || ator.tipo !== 'pj' || !catalogos) return [];
  const pj = catalogos.pjById[ator.ref_id];
  if (!pj || !pj.magias) return [];
  const out = [];
  Object.entries(pj.magias).forEach(([key, passos]) => {
    const p = passos || 0;
    if (p <= 0) return;
    const m = catalogos.magiasByKey[key];
    if (!m) return;
    const nivel = (typeof nivelMagiaEfetivo === 'function') ? nivelMagiaEfetivo(p) : (p * 2 - 1);
    const dano  = danoMagiaNoNivel(m, nivel);
    if (dano <= 0) return; // não-ofensiva → fora desta fase (cura/buff vêm depois)
    out.push({
      fonte: 'magia',
      key, nome: m.nome,
      passos: p, nivel,           // nível efetivo (1/3/5/7/9)
      custo_karma: nivel,         // 1 karma p/ nível, conforme regra
      dano,                       // base; tier final calculado por danoNoTier
      evocacao: m.evocacao || null,
      alcance: m.alcance || null,
    });
  });
  return out;
}

/* ── Técnicas conhecidas pelo PJ ──────────────────────────────── */
/* Hoje a técnica vive como "modificador anexado ao ataque da arma". */
/* Retornamos os metadados úteis pro select; a mecânica fica TODO    */
/* até o usuário definir a fórmula numérica do bônus.                */
function tecnicasDoAtor(ator, catalogos) {
  if (!ator || ator.tipo !== 'pj' || !catalogos || !catalogos.tecnicasByKey) return [];
  const pj = catalogos.pjById[ator.ref_id];
  if (!pj || !pj.tecnicas) return [];
  const ficha = (typeof calcularFicha === 'function')
    ? calcularFicha(pj, catalogos.catalogoBySlug) : { atributos: {} };
  const atributos = ficha.atributos || {};
  const out = [];
  Object.entries(pj.tecnicas).forEach(([key, nivel]) => {
    const n = nivel || 0;
    if (n <= 0) return;
    const t = catalogos.tecnicasByKey[key];
    if (!t) return;
    const total = (typeof totalTecnica === 'function') ? totalTecnica(t, pj.tecnicas, atributos) : null;
    out.push({
      fonte: 'tecnica',
      key, nome: t.nome, nivel: n,
      total,
      uso: t.uso || null,
      grupo_armas: t.grupo_armas || null,
      efeito: t.efeito || null,
    });
  });
  return out;
}

/* ── Filtra técnicas compatíveis com a arma equipada ──────────── */
/* Regra: técnica com `grupo_armas` específico (ex.: "CM") só       */
/* aparece para armas daquele grupo. Sem `grupo_armas` ou genéricas */
/* aparecem para todas as armas.                                    */
function tecnicasCompativeisComArma(tecnicas, arma, catalogos) {
  if (!Array.isArray(tecnicas) || tecnicas.length === 0) return [];
  if (!arma || !arma.slug || !catalogos || !catalogos.catalogoBySlug) return tecnicas.filter((t) => !t.grupo_armas);
  const itemArma = catalogos.catalogoBySlug[arma.slug];
  const grupoArma = itemArma && itemArma.grupo_armas ? String(itemArma.grupo_armas) : null;
  return tecnicas.filter((t) => {
    if (!t.grupo_armas) return true;       // técnica genérica
    if (!grupoArma) return false;          // arma sem grupo → não casa específica
    // grupo_armas no DB pode ser CSV ("CM,CL"); aceita todos
    const lista = String(t.grupo_armas).split(',').map((s) => s.trim()).filter(Boolean);
    return lista.includes(grupoArma);
  });
}

/* ── Pontos de ação por classe (spec do sistema) ──────────────── */
function pontosAcaoPJ(pj) {
  const prof = pj.profissao;
  const guerreiroOuLadino = prof === 'Guerreiro' || prof === 'Ladino';
  if (guerreiroOuLadino && pj.especializacao) return 4;   // especializado (não-MVP, regra pronta)
  return guerreiroOuLadino ? 2 : 1;                        // Mago/Sacerdote/Rastreador/Bardo = 1
}

/* ── Dano em cascata EH → AR → EF (com transbordo) ────────────── */
/* Crítico pula a EH e começa na AR. Excedente após EF zerar é "sobra" (overkill). */
function aplicarDanoCascata(dano, p, critico) {
  let r = Math.max(0, Math.floor(dano || 0));
  let eh = p.eh, ar = p.ar, ef = p.ef;
  if (!critico && eh > 0) { const c = Math.min(eh, r); eh -= c; r -= c; }
  if (r > 0 && ar > 0)    { const c = Math.min(ar, r); ar -= c; r -= c; }
  if (r > 0 && ef > 0)    { const c = Math.min(ef, r); ef -= c; r -= c; }
  const morto = (ef === 0 && (p.status === 'ativo' || p.status === 'desmaiado'));
  return { ...p, eh, ar, ef, status: morto ? 'morto' : p.status, sobra: r };
}

/* ── Monta o snapshot de combate de cada participante ───────────
   personagensPools (opcional): jsonb da história { [pjId]: { ef, eh, ar, karma } }.
   Se a chave do PJ existe, esses valores entram como o "atual" do snapshot;
   max continua sendo o calculado da ficha (sequela = atual < max).      */
async function montarSnapshots(parts, personagensPools) {
  const pools = personagensPools || {};
  const pjIds  = parts.filter((p) => p.tipo === 'pj').map((p) => p.ref_id);
  const criIds = parts.filter((p) => p.tipo === 'criatura').map((p) => p.ref_id);
  const [pjRes, itRes, criRes] = await Promise.all([
    pjIds.length  ? supabaseClient.from('personagens').select('*').in('id', pjIds) : Promise.resolve({ data: [] }),
    supabaseClient.from('itens').select('*'),
    criIds.length ? supabaseClient.from('criaturas').select('*').in('id', criIds)  : Promise.resolve({ data: [] }),
  ]);
  const catalogoBySlug = {};
  (itRes.data || []).forEach((it) => { catalogoBySlug[it.slug] = it; });
  const pjById = {};  (pjRes.data  || []).forEach((p) => { pjById[p.id] = p; });
  const criById = {}; (criRes.data || []).forEach((c) => { criById[c.id] = c; });

  return parts.map((p) => {
    if (p.tipo === 'pj') {
      const pj = pjById[p.ref_id];
      if (!pj) return { ...p, vb: 0, pa_max: 1, pa_rest: 1, eh: 0, eh_max: 0, ar: 0, ar_max: 0, ef: 0, ef_max: 0, karma: 0, karma_max: 0, status: 'ativo', ausente: true };
      const d = calcularFicha(pj, catalogoBySlug).derivadas;
      const pa = pontosAcaoPJ(pj);
      const defParsed = /^([TLMP])(-?\d+)$/.exec(String(d.defesa || ''));
      // Pools atuais (se persistidos na história); senão começa no max.
      const persist = pools[p.ref_id] || null;
      const ehMax = d.energiaHeroica || 0;
      const arMax = d.absorcao || 0;
      const efMax = d.energiaFisica || 0;
      const kMax  = d.karma || 0;
      const ehCur = persist && Number.isFinite(persist.eh)    ? Math.max(0, Math.min(ehMax, persist.eh))    : ehMax;
      const arCur = persist && Number.isFinite(persist.ar)    ? Math.max(0, Math.min(arMax, persist.ar))    : arMax;
      const efCur = persist && Number.isFinite(persist.ef)    ? Math.max(0, Math.min(efMax, persist.ef))    : efMax;
      const kCur  = persist && Number.isFinite(persist.karma) ? Math.max(0, Math.min(kMax,  persist.karma)) : kMax;
      // Se EF persistido = 0, PJ entra desmaiado/morto — Mestre pode mudar o status no roster.
      const status = (efCur <= 0) ? 'morto' : (ehCur <= 0 ? 'desmaiado' : 'ativo');
      return {
        tipo: 'pj', ref_id: p.ref_id, nome: p.nome,
        vb: d.velocidade || 0, pa_max: pa, pa_rest: pa,
        eh: ehCur, eh_max: ehMax,
        ar: arCur, ar_max: arMax,
        ef: efCur, ef_max: efMax,
        karma: kCur, karma_max: kMax,
        defesa_sigla: defParsed ? defParsed[1] : 'L',
        defesa_valor: defParsed ? parseInt(defParsed[2], 10) : 0,
        status,
        status_temp: [],   // Fase 6: array de { id, nome, icone, rodadas_rest }
      };
    }
    const c = criById[p.ref_id];
    if (!c) return { ...p, vb: 0, pa_max: 1, pa_rest: 1, eh: 0, eh_max: 0, ar: 0, ar_max: 0, ef: 0, ef_max: 0, karma: 0, karma_max: 0, status: 'ativo', ausente: true };
    return {
      tipo: 'criatura', ref_id: p.ref_id, nome: p.nome,
      vb: c.velocidade || 0, pa_max: 1, pa_rest: 1,
      eh: c.energia_heroica || 0, eh_max: c.energia_heroica || 0,
      ar: c.absorcao || 0,        ar_max: c.absorcao || 0,
      ef: c.energia_fisica || 0,  ef_max: c.energia_fisica || 0,
      karma: 0, karma_max: 0,
      defesa_sigla: c.tipo_armadura || 'L',
      defesa_valor: c.defesa || 0,
      status: 'ativo',
      status_temp: [],
    };
  });
}

/* ── Ordena por VB (desc); empate: PJ antes, depois nome ──────── */
function ordenarIniciativa(snaps) {
  return [...snaps]
    .sort((a, b) => {
      if (b.vb !== a.vb) return b.vb - a.vb;
      if (a.tipo !== b.tipo) return a.tipo === 'pj' ? -1 : 1;
      return (a.nome || '').localeCompare(b.nome || '');
    })
    .map((p, i) => ({ ...p, ordem: i + 1 }));
}

/* ── próximo participante ATIVO na ordem de iniciativa ────────── */
function proximoAtivo(parts, fromOrdem) {
  return [...parts].sort((a, b) => a.ordem - b.ordem)
    .find((p) => p.ordem > fromOrdem && p.status === 'ativo') || null;
}

/* ── Ataques disponíveis para o ator ──────────────────────────── */
/* PJ: usa gerarAtaques mas só mantém ARMAS reais (com slug em itens). */
/*     Magias com dano vêm separadas via magiasOfensivasDoAtor.        */
/* Criatura: 1 ataque implícito (dano_l/m/p + dano_25/50/75/100).      */
function ataquesDoAtor(ator, catalogos) {
  if (!ator || !catalogos) return [];
  if (ator.tipo === 'pj') {
    const pj = catalogos.pjById[ator.ref_id];
    if (!pj) return [];
    const ficha = calcularFicha(pj, catalogos.catalogoBySlug);
    let lista = [];
    try {
      lista = gerarAtaques(pj, catalogos.catalogoBySlug, catalogos.magiasByKey, ficha.atributos) || [];
    } catch (e) {
      console.error('[batalha] gerarAtaques falhou:', e);
    }
    return lista
      .filter((a) => a && a.dano != null && a.slug && catalogos.catalogoBySlug[a.slug])
      .map((a) => {
        const arma = catalogos.catalogoBySlug[a.slug];
        const grupoSigla = arma && arma.grupo_armas ? arma.grupo_armas : null;
        const bonus = (typeof bonusGrupoArma === 'function')
          ? (bonusGrupoArma(grupoSigla, pj.grupos_armas || {}) || 0) : 0;
        return { ...a, bonus_ga: bonus, fonte: 'arma' };
      });
  }
  const c = catalogos.criById[ator.ref_id];
  if (!c) return [];
  return [{
    nome: c.ataque || (ator.nome + ' ataque'),
    dano_l: c.dano_l, dano_m: c.dano_m, dano_p: c.dano_p,
    dano_25: c.dano_25, dano_50: c.dano_50, dano_75: c.dano_75, dano_100: c.dano_100,
    bonus_ga: 0, fonte: 'criatura',
  }];
}

/* ── Coluna de Ação do ataque: dano_categoria_alvo + bônus − valor_defesa ──── */
function colunaAtaque(arma, alvo) {
  if (!arma || !alvo) return 0;
  const sigla = (alvo.defesa_sigla || 'L').toUpperCase();
  const campo = sigla === 'M' ? 'dano_m' : (sigla === 'P' ? 'dano_p' : 'dano_l');
  const base = arma[campo] != null ? arma[campo] : 0;
  const bonus = arma.bonus_ga || 0;
  return (base + bonus) - (alvo.defesa_valor || 0);
}

/* ── Dano final no tier do resultado da tabela ────────────────── */
function danoNoTier(arma, codigo) {
  if (!arma || !codigo || codigo === 'FC' || codigo === 'R') return 0;
  if (arma.fonte === 'criatura') {
    if (codigo === 'F')  return arma.dano_25  || 0;
    if (codigo === 'M')  return arma.dano_50  || 0;
    if (codigo === 'D')  return arma.dano_75  || 0;
    if (codigo === 'MD') return arma.dano_100 || 0;
    if (codigo === 'E')  return Math.floor((arma.dano_100 || 0) * 1.25);
    if (codigo === 'A')  return Math.floor((arma.dano_100 || 0) * 1.5);
    return 0;
  }
  const base = arma.dano || 0;
  if (codigo === 'F')  return Math.floor(base / 4);
  if (codigo === 'M')  return Math.floor(base / 2);
  if (codigo === 'D')  return Math.floor((3 * base) / 4);
  if (codigo === 'MD') return base;
  if (codigo === 'E')  return Math.floor(base * 1.25);
  if (codigo === 'A')  return Math.floor(base * 1.5);
  return 0;
}

/* ============================== Condução (Fase 4b: turnos + iniciativa) ============================== */
function ConduzirBatalhaView({ batalha, historia, lang, onVoltar, onAtualizado }) {
  const isEn = lang === 'en';
  const [estado, setEstado] = useState(batalha.estado);
  const [participantes, setParticipantes] = useState(batalha.participantes || []);
  const [rodada, setRodada] = useState(batalha.rodada || 0);
  const [iniciando, setIniciando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState(null);
  const [motorAberto, setMotorAberto] = useState(false);
  const [danoOpen, setDanoOpen] = useState(null);   // ref_id+tipo do lutador com painel de dano aberto
  const [danoVal, setDanoVal] = useState('');
  const [danoCrit, setDanoCrit] = useState(false);
  // Fase 6 — Cura, Status temporários, Encerrar com restauração
  const [curaOpen, setCuraOpen] = useState(null);   // key do lutador com painel de cura
  const [curaPool, setCuraPool] = useState('eh');   // 'eh' | 'ar' | 'ef'
  const [curaVal,  setCuraVal]  = useState('');
  const [statusOpen,    setStatusOpen]    = useState(null);  // key do lutador com painel de status temp
  const [statusNome,    setStatusNome]    = useState('');
  const [statusIcone,   setStatusIcone]   = useState('');
  const [statusRodadas, setStatusRodadas] = useState(3);
  const [encerrarOpen,  setEncerrarOpen]  = useState(false); // painel inline com toggle de restaurar
  const [catalogos, setCatalogos] = useState(null);
  const [acaoOpen, setAcaoOpen] = useState(false);
  const [testeOpen, setTesteOpen] = useState(false);
  // Mutual exclusion: abrir um painel fecha o outro (densidade visual).
  const abrirAcao  = () => { setAcaoOpen((v) => !v);  if (!acaoOpen)  setTesteOpen(false); };
  const abrirTeste = () => { setTesteOpen((v) => !v); if (!testeOpen) setAcaoOpen(false);  };
  const [log, setLog] = useState(batalha.log || []);

  const STATUS = {
    ativo:     { pt: 'Ativo',     en: 'Active'   },
    desmaiado: { pt: 'Desmaiado', en: 'Fainted'  },
    morto:     { pt: 'Morto',     en: 'Dead'     },
    desistiu:  { pt: 'Desistiu',  en: 'Withdrew' },
  };

  // Persiste no banco e aplica o estado local (locais) de forma otimista.
  const persistir = async (campos, locais) => {
    if (locais) locais();
    setSalvando(true);
    const { error: err } = await supabaseClient.from('batalhas').update(campos).eq('id', batalha.id);
    setSalvando(false);
    if (err) { setError(err.message); return false; }
    onAtualizado && onAtualizado();
    return true;
  };

  // Carrega catálogos quando a batalha está ativa (necessários p/ as ações)
  useEffect(() => {
    if (estado !== 'ativa') return;
    let cancelled = false;
    (async () => {
      const pjIds  = participantes.filter((p) => p.tipo === 'pj').map((p) => p.ref_id);
      const criIds = participantes.filter((p) => p.tipo === 'criatura').map((p) => p.ref_id);
      const [pjRes, itRes, magRes, tecRes, habRes, criRes] = await Promise.all([
        pjIds.length  ? supabaseClient.from('personagens').select('*').in('id', pjIds) : Promise.resolve({ data: [] }),
        supabaseClient.from('itens').select('*'),
        supabaseClient.from('magias').select('*'),
        supabaseClient.from('tecnicas').select('*'),
        supabaseClient.from('habilidades').select('*'),
        criIds.length ? supabaseClient.from('criaturas').select('*').in('id', criIds)  : Promise.resolve({ data: [] }),
      ]);
      if (cancelled) return;
      const cat = {
        pjById: {}, criById: {}, catalogoBySlug: {},
        magiasByKey: {}, tecnicasByKey: {},
        habilidadesByKey: {}, habilidadesDb: habRes.data || [],
      };
      (pjRes.data  || []).forEach((p) => { cat.pjById[p.id] = p; });
      (itRes.data  || []).forEach((it) => { cat.catalogoBySlug[it.slug] = it; });
      (magRes.data || []).forEach((m) => { cat.magiasByKey[m.key] = m; });
      (tecRes.data || []).forEach((t) => { cat.tecnicasByKey[t.key] = t; });
      (habRes.data || []).forEach((h) => { cat.habilidadesByKey[h.key] = h; });
      (criRes.data || []).forEach((c) => { cat.criById[c.id] = c; });
      setCatalogos(cat);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, [estado]);

    const iniciar = async () => {
    setIniciando(true); setError(null);
    try {
      // Lê personagens_pools fresh da história (Fase 6: pools persistidos).
      let pools = null;
      if (historia && historia.id) {
        const { data: histRow } = await supabaseClient
          .from('historias').select('personagens_pools').eq('id', historia.id).maybeSingle();
        pools = histRow ? (histRow.personagens_pools || {}) : null;
      }
      const snaps = await montarSnapshots(batalha.participantes || [], pools);
      let ordenados = ordenarIniciativa(snaps);
      const primeiro = [...ordenados].sort((a, b) => a.ordem - b.ordem).find((p) => p.status === 'ativo');
      ordenados = ordenados.map((p) => ({ ...p, atual: !!(primeiro && p.tipo === primeiro.tipo && p.ref_id === primeiro.ref_id) }));
      await persistir({ estado: 'ativa', rodada: 1, participantes: ordenados }, () => {
        setParticipantes(ordenados); setRodada(1); setEstado('ativa');
      });
    } catch (e) {
      setError((e && e.message) || String(e));
    } finally {
      setIniciando(false);
    }
  };

  const current = participantes.find((p) => p.atual)
    || participantes.find((p) => p.status === 'ativo') || null;

  const aplicarDano = (idx) => {
    const v = parseInt(danoVal || '0', 10) || 0;
    if (v <= 0) return;
    const p = participantes[idx];
    const atualizado = aplicarDanoCascata(v, p, !!danoCrit);
    let next = participantes.map((q, i) => (i === idx ? atualizado : q));
    // se virou morto e era o ator da vez, passa a vez
    if (atualizado.status === 'morto' && p.atual) {
      const prox = proximoAtivo(next, p.ordem);
      next = next.map((q) => ({ ...q, atual: !!(prox && q.tipo === prox.tipo && q.ref_id === prox.ref_id) }));
    }
    persistir({ participantes: next }, () => { setParticipantes(next); setDanoOpen(null); setDanoVal(''); setDanoCrit(false); });
  };

  // Fase 6 — Cura inline (espelha aplicarDano). Adiciona à pool selecionada, capped no max.
  // Se EH estava zerado e foi curada > 0 → reanima 'desmaiado' pra 'ativo'.
  const aplicarCura = (idx) => {
    const v = parseInt(curaVal || '0', 10) || 0;
    if (v <= 0) return;
    const p = participantes[idx];
    const pool = curaPool;                              // 'eh' | 'ar' | 'ef'
    const max  = p[pool + '_max'] || 0;
    const novo = Math.max(0, Math.min(max, (p[pool] || 0) + v));
    const atualizado = { ...p, [pool]: novo };
    // Reanimação narrativa: se estava desmaiado e curou EH acima de 0, volta a ativo.
    if (p.status === 'desmaiado' && pool === 'eh' && novo > 0) atualizado.status = 'ativo';
    // Cura EF acima de 0 NÃO ressuscita morto — Mestre tem que mudar status manualmente
    // (ressuscitar é decisão narrativa, não automática).
    const next = participantes.map((q, i) => (i === idx ? atualizado : q));
    persistir({ participantes: next }, () => {
      setParticipantes(next); setCuraOpen(null); setCuraVal(''); setCuraPool('eh');
    });
  };

  // Fase 6 — Status temporário: adiciona ao array do participante.
  const aplicarStatusTemp = (idx) => {
    const nome = String(statusNome || '').trim();
    const rodadas = Math.max(1, parseInt(statusRodadas || '1', 10) || 1);
    if (!nome) return;
    const novoStatus = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      nome,
      icone: String(statusIcone || '').trim() || null,
      rodadas_rest: rodadas,
    };
    const p = participantes[idx];
    const atual = Array.isArray(p.status_temp) ? p.status_temp : [];
    const atualizado = { ...p, status_temp: [...atual, novoStatus] };
    const next = participantes.map((q, i) => (i === idx ? atualizado : q));
    persistir({ participantes: next }, () => {
      setParticipantes(next);
      setStatusOpen(null); setStatusNome(''); setStatusIcone(''); setStatusRodadas(3);
    });
  };

  // Fase 6 — Remove um status temporário (clique no chip).
  const removerStatusTemp = (idx, statusId) => {
    const p = participantes[idx];
    const atual = Array.isArray(p.status_temp) ? p.status_temp : [];
    const novoArr = atual.filter((s) => s.id !== statusId);
    if (novoArr.length === atual.length) return;
    const atualizado = { ...p, status_temp: novoArr };
    const next = participantes.map((q, i) => (i === idx ? atualizado : q));
    persistir({ participantes: next }, () => setParticipantes(next));
  };

  const aplicarAcao = (payload) => {
    // payload: { tipo: 'arma'|'magia', arma?, magia?, tecnica?, alvo, coluna, d20, resultado, dano, custo_karma }
    const { tipo, arma, magia, tecnica, alvo, coluna, d20, resultado, dano, custo_karma } = payload;
    const critico = !!(resultado && resultado.critico);
    const alvoIdx = participantes.findIndex((p) => p.tipo === alvo.tipo && p.ref_id === alvo.ref_id);
    const atorIdx = participantes.findIndex((p) => p.atual);
    if (alvoIdx < 0 || atorIdx < 0) return;

    let next = [...participantes];
    if (dano > 0) {
      next[alvoIdx] = aplicarDanoCascata(dano, next[alvoIdx], critico);
    }
    // Debita PA (sempre 1) e karma (se for magia).
    const k = Math.max(0, custo_karma || 0);
    next[atorIdx] = {
      ...next[atorIdx],
      pa_rest: Math.max(0, (next[atorIdx].pa_rest || 0) - 1),
      karma:   Math.max(0, (next[atorIdx].karma   || 0) - k),
    };

    // PA zerado → auto-passa a vez
    const ator = next[atorIdx];
    if (ator.pa_rest === 0 && ator.atual) {
      const prox = proximoAtivo(next, ator.ordem);
      if (prox) {
        next = next.map((p) => ({ ...p, atual: (p.tipo === prox.tipo && p.ref_id === prox.ref_id) }));
      } else {
        // ninguém mais ativo nessa rodada → marca prox=null; nova rodada via clique manual
        next = next.map((p) => ({ ...p, atual: false }));
      }
    }

    const nomeAcao = tipo === 'magia' ? (magia && magia.nome) : (arma && arma.nome);
    const entry = {
      rodada, ts: Date.now(),
      autor_tipo: ator.tipo, autor_ref_id: ator.ref_id, autor_nome: participantes[atorIdx].nome,
      acao: tipo,                                // 'arma' | 'magia'
      alvo_tipo: alvo.tipo, alvo_ref_id: alvo.ref_id, alvo_nome: alvo.nome,
      arma_nome: nomeAcao,                       // mantém nome do campo p/ retrocompat do render
      coluna, d20,
      resultado: resultado ? resultado.codigo : null,
      resultado_nome: resultado ? resultado.pt : null,
      dano, critico,
      ...(tipo === 'magia' ? { magia_key: magia.key, magia_nivel: magia.nivel, custo_karma: k } : {}),
      ...(tecnica ? { tecnica_key: tecnica.key, tecnica_nome: tecnica.nome, tecnica_efeito: tecnica.efeito || null } : {}),
    };
    const novoLog = [...log, entry];

    persistir({ participantes: next, log: novoLog }, () => {
      setParticipantes(next); setLog(novoLog); setAcaoOpen(false);
    });
  };

  // Fase 5d — aplica um teste (Habilidade / Técnica / Resistência).
  // Debita 1 PA do testador (não necessariamente o ator da vez), não aplica
  // dano (efeito é narrativo), e loga em batalha.log com acao='teste'.
  const aplicarTeste = (payload) => {
    // payload comum: { tipo_teste, testador, d20 }
    //   tipo_teste='habilidade'|'tecnica' → { chave, nome, coluna, resultado }
    //   tipo_teste='resistencia'          → { resistencia_tipo, forca_ataque, forca_defesa, alvo_resist, resultado }
    const { tipo_teste, testador } = payload;
    const testIdx = participantes.findIndex((p) => p.tipo === testador.tipo && p.ref_id === testador.ref_id);
    if (testIdx < 0) return;

    let next = [...participantes];
    next[testIdx] = {
      ...next[testIdx],
      pa_rest: Math.max(0, (next[testIdx].pa_rest || 0) - 1),
    };
    // Se quem testou era o ator da vez e ficou sem PA → passa a vez.
    const t = next[testIdx];
    if (t.atual && t.pa_rest === 0) {
      const prox = proximoAtivo(next, t.ordem);
      if (prox) {
        next = next.map((p) => ({ ...p, atual: (p.tipo === prox.tipo && p.ref_id === prox.ref_id) }));
      } else {
        next = next.map((p) => ({ ...p, atual: false }));
      }
    }

    const base = {
      rodada, ts: Date.now(),
      autor_tipo: t.tipo, autor_ref_id: t.ref_id, autor_nome: testador.nome,
      acao: 'teste', tipo_teste,
      d20: payload.d20,
    };
    let entry;
    if (tipo_teste === 'resistencia') {
      entry = {
        ...base,
        resistencia_tipo: payload.resistencia_tipo,    // 'rf' | 'rm'
        forca_ataque:     payload.forca_ataque,
        forca_defesa:     payload.forca_defesa,
        alvo_resist:      payload.alvo_resist,
        resultado:        payload.resultado,           // 'resistiu' | 'falhou' | 'empate'
      };
    } else {
      entry = {
        ...base,
        chave: payload.chave, nome: payload.nome,
        coluna: payload.coluna,
        resultado:      payload.resultado ? payload.resultado.codigo : null,
        resultado_nome: payload.resultado ? payload.resultado.pt     : null,
        critico:       !!(payload.resultado && payload.resultado.critico),
      };
    }

    const novoLog = [...log, entry];
    persistir({ participantes: next, log: novoLog }, () => {
      setParticipantes(next); setLog(novoLog); setTesteOpen(false);
    });
  };

    const mudarStatus = (idx, novo) => {
    const alvo = participantes[idx];
    let next = participantes.map((p, i) => (i === idx ? { ...p, status: novo } : p));
    if (alvo && alvo.atual && novo !== 'ativo') {          // o ator da vez saiu → passa a vez
      const prox = proximoAtivo(next, alvo.ordem);
      next = next.map((p) => ({ ...p, atual: !!(prox && p.tipo === prox.tipo && p.ref_id === prox.ref_id) }));
    }
    persistir({ participantes: next }, () => setParticipantes(next));
  };

  const novaRodada = () => {
    // Reseta PA dos ativos + decrementa status_temp de todos (remove os que zeraram).
    const reset = participantes.map((p) => {
      const next = (p.status === 'ativo') ? { ...p, pa_rest: p.pa_max } : { ...p };
      if (Array.isArray(p.status_temp) && p.status_temp.length) {
        next.status_temp = p.status_temp
          .map((s) => ({ ...s, rodadas_rest: Math.max(0, (s.rodadas_rest || 0) - 1) }))
          .filter((s) => s.rodadas_rest > 0);
      }
      return next;
    });
    const reordered = ordenarIniciativa(reset);          // recalcula iniciativa pela VB
    const primeiro = [...reordered].sort((a, b) => a.ordem - b.ordem).find((p) => p.status === 'ativo');
    const next = reordered.map((p) => ({ ...p, atual: !!(primeiro && p.tipo === primeiro.tipo && p.ref_id === primeiro.ref_id) }));
    const novaR = rodada + 1;
    persistir({ participantes: next, rodada: novaR }, () => { setParticipantes(next); setRodada(novaR); });
  };

  const passarVez = () => {
    if (!current) return;
    const prox = proximoAtivo(participantes, current.ordem);
    if (prox) {
      const next = participantes.map((p) => ({ ...p, atual: (p.tipo === prox.tipo && p.ref_id === prox.ref_id) }));
      persistir({ participantes: next }, () => setParticipantes(next));
    } else {
      novaRodada();                                        // deu a volta → nova rodada
    }
  };

  // Fase 6 — Abrir o painel inline de encerrar (3 opções: cancelar / restaurar / sequelas).
  const encerrarBatalha = () => {
    setEncerrarOpen(true);
  };

  // Aplica a escolha: atualiza historia.personagens_pools e chama a RPC de arquivamento.
  // restaurar=true  → remove chaves dos PJs vivos do jsonb (volta ao max na próxima batalha)
  // restaurar=false → grava snapshot final dos PJs no jsonb (vivos com pools atuais; mortos com ef=0)
  const finalizarEncerramento = async (restaurar) => {
    setSalvando(true); setError(null);

    // 1) Lê personagens_pools atual da história (fresh).
    if (historia && historia.id) {
      const { data: histRow, error: histErr } = await supabaseClient
        .from('historias').select('personagens_pools').eq('id', historia.id).maybeSingle();
      if (histErr) { setSalvando(false); setError(histErr.message); return; }
      const poolsAtual = (histRow && histRow.personagens_pools) || {};
      const novoPools  = { ...poolsAtual };

      // 2) Para cada PJ da batalha, aplica a regra.
      participantes.filter((p) => p.tipo === 'pj').forEach((p) => {
        const id = p.ref_id;
        if (p.status === 'morto') {
          novoPools[id] = { ef: 0, eh: 0, ar: p.ar || 0, karma: p.karma || 0 };
        } else if (restaurar) {
          delete novoPools[id];                       // volta ao max
        } else {
          novoPools[id] = {
            ef:    Number.isFinite(p.ef)    ? p.ef    : null,
            eh:    Number.isFinite(p.eh)    ? p.eh    : null,
            ar:    Number.isFinite(p.ar)    ? p.ar    : null,
            karma: Number.isFinite(p.karma) ? p.karma : null,
          };
        }
      });

      // 3) Grava no banco.
      const { error: upErr } = await supabaseClient
        .from('historias').update({ personagens_pools: novoPools }).eq('id', historia.id);
      if (upErr) { setSalvando(false); setError(upErr.message); return; }
    }

    // 4) Arquiva o log da batalha + deleta a linha (RPC 010).
    const { data, error: err } = await supabaseClient
      .rpc('encerrar_batalha', { p_batalha_id: batalha.id });
    setSalvando(false);
    if (err) { setError(err.message); return; }
    if (data && data.ok === false) {
      const motivo = data.motivo || 'erro_desconhecido';
      setError(isEn ? `Failed: ${motivo}` : `Falha: ${motivo}`);
      return;
    }
    onAtualizado && onAtualizado();
    onVoltar && onVoltar();
  };

  const poolBar = (label, v, max) => {
    const pct = max > 0 ? Math.max(0, Math.min(100, (v / max) * 100)) : 0;
    return (
      <div className={'batalha-pool pool-' + label.toLowerCase()}>
        <span className="batalha-pool-label">{label}</span>
        <span className="batalha-pool-bar"><i style={{ width: pct + '%' }} /></span>
        <span className="batalha-pool-val">{v}/{max}</span>
      </div>
    );
  };

  // ── SETUP ──
  if (estado === 'setup') {
    return (
      <div className="batalha-conduzir">
        <p style={{ opacity: 0.85, marginBottom: 12 }}>
          {isEn
            ? 'Ready to start. Initiative is ordered by each fighter\u2019s Speed (VB).'
            : 'Pronto pra iniciar. A iniciativa é ordenada pela Velocidade (VB) de cada um.'}
        </p>
        <ul className="batalha-part-list">
          {participantes.map((p, i) => (
            <li key={i} className="batalha-part-row">
              <span className={'batalha-part-tipo tipo-' + p.tipo}>
                {p.tipo === 'pj' ? (isEn ? 'PC' : 'PJ') : (isEn ? 'Creature' : 'Criatura')}
              </span>
              <span className="batalha-part-nome">{p.nome}</span>
            </li>
          ))}
        </ul>
        {error && <div className="err-msg" style={{ marginTop: 10 }}>{error}</div>}
        <div className="wiz-actions">
          <button className="btn-ghost btn-sm" onClick={onVoltar} disabled={iniciando}>
            {isEn ? 'Back' : 'Voltar'}
          </button>
          <button className="btn-primary btn-sm" onClick={iniciar} disabled={iniciando || participantes.length === 0}>
            {iniciando ? (isEn ? 'Starting…' : 'Iniciando…') : (isEn ? 'Start battle' : 'Iniciar batalha')}
          </button>
        </div>
      </div>
    );
  }

  // ── ATIVA / ENCERRADA ──
  return (
    <div className="batalha-conduzir">
      <div className="batalha-turn-bar">
        <div className="batalha-turn-info">
          <span className="batalha-rodada">{isEn ? 'Round' : 'Rodada'} {rodada}</span>
          {estado === 'ativa' && current && (
            <span className="batalha-turn-atual">{isEn ? 'Turn:' : 'Vez:'} <strong>{current.nome}</strong></span>
          )}
          {estado === 'encerrada' && (
            <span className="batalha-estado est-encerrada">{isEn ? 'Ended' : 'Encerrada'}</span>
          )}
        </div>
        <div className="batalha-turn-actions">
          {estado === 'ativa' && (
            <>
              <button className="btn-ghost btn-sm" data-on={acaoOpen ? 'true' : undefined} onClick={abrirAcao}
                disabled={salvando || !current || !catalogos || (current && current.pa_rest <= 0)}>
                {isEn ? '⚔ Action' : '⚔ Ação'}
              </button>
              <button className="btn-ghost btn-sm" data-on={testeOpen ? 'true' : undefined} onClick={abrirTeste}
                disabled={salvando || !catalogos || participantes.filter((p) => p.status === 'ativo' && (p.pa_rest || 0) > 0).length === 0}>
                {isEn ? '🜂 Test' : '🜂 Teste'}
              </button>
              <button className="btn-ghost btn-sm" onClick={passarVez} disabled={salvando || !current}>
                {isEn ? 'Pass turn →' : 'Passar a vez →'}
              </button>
              <button className="btn-ghost btn-sm" onClick={novaRodada} disabled={salvando}>
                {isEn ? 'New round' : 'Nova rodada'}
              </button>
              <button className="btn-ghost btn-sm" data-on={motorAberto ? 'true' : undefined} onClick={() => setMotorAberto((v) => !v)}>
                {isEn ? '⚀ Dice' : '⚀ Dado'}
              </button>
              <button className="btn-danger btn-sm" onClick={encerrarBatalha} disabled={salvando}>
                {isEn ? 'End' : 'Encerrar'}
              </button>
            </>
          )}
          <button className="btn-ghost btn-sm" onClick={onVoltar}>{isEn ? 'Back' : 'Voltar'}</button>
        </div>
      </div>

      {estado === 'ativa' && motorAberto && <MotorResolucao lang={lang} />}

      {/* Fase 6 — Painel inline ao clicar Encerrar: 3 opções (cancelar / restaurar / sequelas) */}
      {estado === 'ativa' && encerrarOpen && (() => {
        const vivos = participantes.filter((p) => p.tipo === 'pj' && p.status !== 'morto');
        const mortos = participantes.filter((p) => p.tipo === 'pj' && p.status === 'morto');
        const feridos = vivos.filter((p) =>
          (p.ef || 0) < (p.ef_max || 0) ||
          (p.eh || 0) < (p.eh_max || 0) ||
          (p.ar || 0) < (p.ar_max || 0) ||
          (p.karma || 0) < (p.karma_max || 0)
        );
        return (
          <div className="batalha-encerrar-painel">
            <div className="batalha-encerrar-aviso">
              {isEn
                ? 'Ending archives the log and removes this battle. Choose how to persist pools:'
                : 'Encerrar arquiva o log e remove esta batalha. Escolha o que persistir nos PJs:'}
            </div>
            <div className="batalha-encerrar-resumo">
              {feridos.length > 0 && (
                <span>
                  {feridos.length}{' '}{isEn ? 'wounded' : 'ferido(s)'}
                </span>
              )}
              {mortos.length > 0 && (
                <span className="mortos">
                  {' · '}{mortos.length}{' '}{isEn ? 'dead' : 'morto(s)'}{' '}
                  ({isEn ? 'persist with EF=0' : 'persistem com EF=0'})
                </span>
              )}
              {feridos.length === 0 && mortos.length === 0 && (
                <span>{isEn ? 'All PCs at full pools.' : 'Todos os PJs no máximo.'}</span>
              )}
            </div>
            <div className="batalha-encerrar-acoes">
              <button className="btn-ghost btn-sm" onClick={() => setEncerrarOpen(false)} disabled={salvando}>
                {isEn ? 'Cancel' : 'Cancelar'}
              </button>
              <button className="btn-ghost btn-sm" onClick={() => finalizarEncerramento(false)} disabled={salvando}
                title={isEn ? 'Wounded PCs keep current pools in the story' : 'PJs feridos mantêm as pools atuais na história'}>
                {isEn ? 'End with consequences' : 'Encerrar com sequelas'}
              </button>
              <button className="btn-primary btn-sm" onClick={() => finalizarEncerramento(true)} disabled={salvando}
                title={isEn ? 'Wounded PCs return to max in the story' : 'PJs feridos voltam ao máximo na história'}>
                {isEn ? 'Restore & end' : 'Restaurar e encerrar'}
              </button>
            </div>
          </div>
        );
      })()}

      {estado === 'ativa' && acaoOpen && current && catalogos && (
        <AcaoPanel
          ator={current}
          participantes={participantes}
          catalogos={catalogos}
          lang={lang}
          onAplicar={aplicarAcao}
          onCancel={() => setAcaoOpen(false)}
        />
      )}
      {estado === 'ativa' && testeOpen && catalogos && (
        <TestePanel
          atorInicial={current || participantes.find((p) => p.status === 'ativo')}
          participantes={participantes}
          catalogos={catalogos}
          lang={lang}
          onAplicar={aplicarTeste}
          onCancel={() => setTesteOpen(false)}
        />
      )}

      {error && <div className="err-msg">{error}</div>}

      <div className="batalha-roster">
        {participantes.map((p, i) => (
          <div key={p.tipo + p.ref_id}
            className={'batalha-fighter status-' + (p.status || 'ativo') + (p.atual && estado === 'ativa' ? ' atual' : '')}>
            <div className="batalha-fighter-ordem">{p.ordem}</div>
            <div className="batalha-fighter-main">
              <div className="batalha-fighter-nome">
                {p.nome}
                <span className={'batalha-part-tipo tipo-' + p.tipo}>
                  {p.tipo === 'pj' ? (isEn ? 'PC' : 'PJ') : (isEn ? 'Creature' : 'Criatura')}
                </span>
                {p.ausente && <span className="batalha-aviso">{isEn ? 'missing' : 'ausente'}</span>}
                {/* Fase 6: chips de status temporários — clique remove. */}
                {Array.isArray(p.status_temp) && p.status_temp.map((s) => (
                  <span key={s.id} className="batalha-status-chip"
                    onClick={() => estado === 'ativa' && removerStatusTemp(i, s.id)}
                    title={isEn ? `${s.nome} · ${s.rodadas_rest} rounds left · click to remove`
                                : `${s.nome} · ${s.rodadas_rest} rodada(s) restantes · clique para remover`}>
                    {s.icone ? <span className="batalha-status-chip-icone">{s.icone}</span> : null}
                    {s.nome}
                    <span className="batalha-status-chip-rod">{s.rodadas_rest}</span>
                  </span>
                ))}
              </div>
              <div className="batalha-fighter-stats">
                <span className="batalha-stat">VB {p.vb}</span>
                <span className="batalha-stat">{isEn ? 'AP' : 'PA'} {p.pa_rest}/{p.pa_max}</span>
                {p.karma_max > 0 && (
                  <span className="batalha-stat">KA {p.karma}/{p.karma_max}</span>
                )}
                {estado === 'ativa' && (
                  <select className="batalha-status-sel" value={p.status || 'ativo'}
                    onChange={(e) => mudarStatus(i, e.target.value)}>
                    {Object.keys(STATUS).map((k) => (
                      <option key={k} value={k}>{isEn ? STATUS[k].en : STATUS[k].pt}</option>
                    ))}
                  </select>
                )}
                {estado === 'ativa' && (
                  <>
                    <button className="btn-ghost btn-sm" data-on={danoOpen === (p.tipo + ':' + p.ref_id) ? 'true' : undefined} onClick={() => {
                      const id = p.tipo + ':' + p.ref_id;
                      setDanoOpen(danoOpen === id ? null : id);
                      setCuraOpen(null); setStatusOpen(null);
                      setDanoVal(''); setDanoCrit(false);
                    }} title={isEn ? 'Apply damage' : 'Aplicar dano'}>
                      {isEn ? '− Dmg' : '− Dano'}
                    </button>
                    <button className="btn-ghost btn-sm" data-on={curaOpen === (p.tipo + ':' + p.ref_id) ? 'true' : undefined} data-tone="heal" onClick={() => {
                      const id = p.tipo + ':' + p.ref_id;
                      setCuraOpen(curaOpen === id ? null : id);
                      setDanoOpen(null); setStatusOpen(null);
                      setCuraVal(''); setCuraPool('eh');
                    }} title={isEn ? 'Apply healing' : 'Aplicar cura'}>
                      {isEn ? '+ Heal' : '+ Cura'}
                    </button>
                    <button className="btn-ghost btn-sm" data-on={statusOpen === (p.tipo + ':' + p.ref_id) ? 'true' : undefined} data-tone="status" onClick={() => {
                      const id = p.tipo + ':' + p.ref_id;
                      setStatusOpen(statusOpen === id ? null : id);
                      setDanoOpen(null); setCuraOpen(null);
                      setStatusNome(''); setStatusIcone(''); setStatusRodadas(3);
                    }} title={isEn ? 'Add temporary status' : 'Adicionar status temporário'}>
                      {isEn ? '+ Status' : '+ Status'}
                    </button>
                  </>
                )}
              </div>
              {estado === 'ativa' && danoOpen === (p.tipo + ':' + p.ref_id) && (
                <div className="batalha-dano-painel">
                  <input className="batalha-dano-input" type="number" min="0" value={danoVal}
                    onChange={(e) => setDanoVal(e.target.value)} placeholder={isEn ? 'amount' : 'valor'} autoFocus />
                  <label className="batalha-dano-crit">
                    <input type="checkbox" checked={danoCrit} onChange={(e) => setDanoCrit(e.target.checked)} />
                    {isEn ? 'critical (skips EH)' : 'crítico (pula EH)'}
                  </label>
                  <button className="btn-primary btn-sm" onClick={() => aplicarDano(i)} disabled={salvando}>
                    {isEn ? 'Apply' : 'Aplicar'}
                  </button>
                  <button className="btn-ghost btn-sm" onClick={() => { setDanoOpen(null); setDanoVal(''); setDanoCrit(false); }}>
                    {isEn ? 'Cancel' : 'Cancelar'}
                  </button>
                </div>
              )}
              {/* Fase 6 — Painel inline de Cura */}
              {estado === 'ativa' && curaOpen === (p.tipo + ':' + p.ref_id) && (
                <div className="batalha-dano-painel cura">
                  <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--parchment-dim)' }}>
                    {isEn ? 'Pool' : 'Pool'}:
                  </span>
                  {['eh', 'ar', 'ef'].map((pool) => (
                    <button key={pool}
                      className="btn-ghost btn-sm"
                      data-on={curaPool === pool ? 'true' : undefined}
                      data-tone="heal"
                      onClick={() => setCuraPool(pool)}
                      style={{ minWidth: 44 }}>
                      {pool.toUpperCase()}
                    </button>
                  ))}
                  <input className="batalha-dano-input" type="number" min="0" value={curaVal}
                    onChange={(e) => setCuraVal(e.target.value)} placeholder={isEn ? 'amount' : 'valor'} autoFocus />
                  <span style={{ fontSize: 10, color: 'var(--parchment-dim)' }}>
                    {p[curaPool]}/{p[curaPool + '_max']}
                  </span>
                  <button className="btn-primary btn-sm" onClick={() => aplicarCura(i)} disabled={salvando}>
                    {isEn ? 'Apply' : 'Aplicar'}
                  </button>
                  <button className="btn-ghost btn-sm" onClick={() => { setCuraOpen(null); setCuraVal(''); }}>
                    {isEn ? 'Cancel' : 'Cancelar'}
                  </button>
                </div>
              )}
              {/* Fase 6 — Painel inline de Status Temp */}
              {estado === 'ativa' && statusOpen === (p.tipo + ':' + p.ref_id) && (
                <div className="batalha-dano-painel status">
                  <input className="batalha-dano-input" type="text" value={statusNome}
                    onChange={(e) => setStatusNome(e.target.value)}
                    placeholder={isEn ? 'name (e.g. poisoned)' : 'nome (ex.: envenenado)'}
                    style={{ width: 180 }} autoFocus />
                  <input className="batalha-dano-input" type="text" value={statusIcone}
                    onChange={(e) => setStatusIcone(e.target.value)}
                    placeholder={isEn ? 'icon (optional)' : 'ícone (opcional)'}
                    style={{ width: 90 }} maxLength={4} />
                  <input className="batalha-dano-input" type="number" min="1" value={statusRodadas}
                    onChange={(e) => setStatusRodadas(parseInt(e.target.value || '1', 10) || 1)}
                    style={{ width: 70 }} title={isEn ? 'rounds' : 'rodadas'} />
                  <span style={{ fontSize: 10, color: 'var(--parchment-dim)' }}>
                    {isEn ? 'rounds' : 'rodadas'}
                  </span>
                  <button className="btn-primary btn-sm" onClick={() => aplicarStatusTemp(i)} disabled={salvando || !statusNome.trim()}>
                    {isEn ? 'Apply' : 'Aplicar'}
                  </button>
                  <button className="btn-ghost btn-sm" onClick={() => { setStatusOpen(null); setStatusNome(''); setStatusIcone(''); setStatusRodadas(3); }}>
                    {isEn ? 'Cancel' : 'Cancelar'}
                  </button>
                </div>
              )}
              <div className="batalha-pools">
                {poolBar('EH', p.eh, p.eh_max)}
                {poolBar('AR', p.ar, p.ar_max)}
                {poolBar('EF', p.ef, p.ef_max)}
                {p.karma_max > 0 && poolBar('KA', p.karma, p.karma_max)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {log.length > 0 && (
        <div className="batalha-log">
          <div className="batalha-log-head">{isEn ? 'Recent actions' : 'Ações recentes'}</div>
          <ul className="batalha-log-list">
            {[...log].slice(-5).reverse().map((e, i) => (
              <li key={log.length - i} className="batalha-log-row">
                <span className="batalha-log-rodada">R{e.rodada}</span>
                <span className="batalha-log-text">
                  <strong>{e.autor_nome}</strong>
                  {e.acao === 'teste' ? (
                    e.tipo_teste === 'resistencia' ? (
                      <>
                        {' · '}<span className="batalha-log-tag teste">🜂</span>
                        {' '}{isEn ? 'resists with' : 'resiste com'} {(e.resistencia_tipo || '').toUpperCase()}
                        {' · '}{e.forca_ataque} {isEn ? 'vs' : 'vs'} {e.forca_defesa}
                        {e.d20 != null && (<>{' · d20 '}{e.d20}</>)}
                        {' → '}<em>{
                          e.resultado === 'resistiu' ? (isEn ? 'Resisted' : 'Resistiu')
                          : e.resultado === 'falhou' ? (isEn ? 'Failed' : 'Falhou')
                          : (isEn ? 'Tie' : 'Empate')
                        }</em>
                      </>
                    ) : (
                      <>
                        {' · '}<span className="batalha-log-tag teste">🜂</span>
                        {' '}{e.nome}
                        {' · '}{isEn ? 'col' : 'col'} {e.coluna}
                        {e.d20 != null && (<>{' / d20 '}{e.d20}</>)}
                        {e.resultado_nome && (<>{' → '}<em>{e.resultado_nome}</em></>)}
                        {e.critico && (<>{' '}<span className="batalha-log-crit">crit</span></>)}
                      </>
                    )
                  ) : (
                    <>
                      {' → '}
                      <strong>{e.alvo_nome}</strong>
                      {' · '}
                      {e.acao === 'magia' && <span className="batalha-log-tag magia">✦</span>}
                      {e.arma_nome}
                      {e.tecnica_nome && (<>{' '}<span className="batalha-log-tag tecnica" title={e.tecnica_efeito || ''}>+ {e.tecnica_nome}</span></>)}
                      {e.d20 != null && (<>{' · '}{isEn ? 'col' : 'col'} {e.coluna} / d20 {e.d20}</>)}
                      {e.resultado_nome && (<>{' → '}<em>{e.resultado_nome}</em></>)}
                      {e.dano > 0 && (<>{' · '}<span className="batalha-log-dano">−{e.dano}</span></>)}
                      {e.custo_karma > 0 && (<>{' '}<span className="batalha-log-karma">−{e.custo_karma} KA</span></>)}
                      {e.critico && (<>{' '}<span className="batalha-log-crit">crit</span></>)}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── Helper de clamp 1..20 ─────────────────────────────────────── */
function _clamp1a20(v) { const n = parseInt(v || '0', 10) || 0; return Math.max(1, Math.min(20, n)); }

/* ============================== Dado d20 (sorteia + editável) ============================== */
function Dado({ value, onChange, lang }) {
  const isEn = lang === 'en';
  const [rolling, setRolling] = useState(false);
  const [disp, setDisp] = useState(null);

  const rolar = () => {
    if (rolling) return;
    setRolling(true);
    let ticks = 0;
    const iv = setInterval(() => {
      setDisp(1 + Math.floor(Math.random() * 20));
      ticks += 1;
      if (ticks > 12) {
        clearInterval(iv);
        const final = 1 + Math.floor(Math.random() * 20);
        setDisp(final);
        setRolling(false);
        onChange(final);
      }
    }, 55);
  };

  const mostrado = rolling ? disp : (value != null ? value : '\u2014');
  return (
    <div className="dado-wrap">
      <button className={'dado' + (rolling ? ' rolling' : '')} onClick={rolar} disabled={rolling}
        title={isEn ? 'Roll' : 'Rolar'}>
        <span className="dado-num">{mostrado}</span>
      </button>
      <div className="dado-side">
        <button className="btn-primary btn-sm" onClick={rolar} disabled={rolling}>
          {rolling ? (isEn ? 'Rolling\u2026' : 'Rolando\u2026') : (isEn ? 'Roll d20' : 'Rolar d20')}
        </button>
        <input className="dado-edit" type="number" min="1" max="20"
          value={value != null ? value : ''} disabled={rolling}
          placeholder={isEn ? 'or type' : 'ou digite'}
          onChange={(e) => { const n = parseInt(e.target.value || '0', 10); onChange(n ? Math.max(1, Math.min(20, n)) : null); }} />
      </div>
    </div>
  );
}

/* ============================== Motor de Resolução (Fase 5a) ============================== */
function MotorResolucao({ lang }) {
  const isEn = lang === 'en';
  const [modo, setModo] = useState('acao');
  const [coluna, setColuna] = useState(0);
  const [ataque, setAtaque] = useState(10);
  const [defesa, setDefesa] = useState(10);
  const [d20, setD20] = useState(null);

  const trocaModo = (m) => { setModo(m); setD20(null); };

  const resAcao = d20 != null ? resolverAcao(coluna, d20) : null;
  const alvoResist = resolverResistencia(ataque, defesa);
  const resResist = d20 == null ? null
    : (d20 === alvoResist ? 'empate' : (d20 > alvoResist ? 'resistiu' : 'falhou'));

  return (
    <div className="motor">
      <div className="motor-tabs">
        <button className={modo === 'acao' ? 'on' : ''} onClick={() => trocaModo('acao')}>
          {isEn ? 'Action' : 'Ação'}
        </button>
        <button className={modo === 'resistencia' ? 'on' : ''} onClick={() => trocaModo('resistencia')}>
          {isEn ? 'Resistance' : 'Resistência'}
        </button>
      </div>

      {modo === 'acao' ? (
        <div className="motor-body">
          <label className="motor-field">
            <span>{isEn ? 'Action column (-7…50)' : 'Coluna de Ação (-7…50)'}</span>
            <input type="number" value={coluna}
              onChange={(e) => setColuna(Math.max(-7, Math.min(50, parseInt(e.target.value || '0', 10) || 0)))} />
          </label>
          <Dado value={d20} onChange={setD20} lang={lang} />
          {resAcao && (
            <div className="motor-result" style={{ borderColor: resAcao.cor }}>
              <span className="motor-swatch" style={{ background: resAcao.cor }} />
              <div>
                <div className="motor-result-nome">{isEn ? resAcao.en : resAcao.pt}</div>
                <div className="motor-result-meta">
                  {isEn ? 'Col' : 'Coluna'} {resAcao.coluna} · d20 {resAcao.d20} ·{' '}
                  {resAcao.erra ? (isEn ? 'miss' : 'erra') : `${Math.round(resAcao.dano * 100)}% ${isEn ? 'dmg' : 'dano'}`}
                  {resAcao.autodano ? (isEn ? ' · self-damage' : ' · auto-dano') : ''}
                  {resAcao.critico ? (isEn ? ' · critical' : ' · crítico') : ''}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="motor-body">
          <div className="motor-row2">
            <label className="motor-field">
              <span>{isEn ? 'Attack force (1-20)' : 'Força de Ataque (1-20)'}</span>
              <input type="number" value={ataque} onChange={(e) => setAtaque(_clamp1a20(e.target.value))} />
            </label>
            <label className="motor-field">
              <span>{isEn ? 'Defense / Resist. (1-20)' : 'Defesa / Resist. (1-20)'}</span>
              <input type="number" value={defesa} onChange={(e) => setDefesa(_clamp1a20(e.target.value))} />
            </label>
          </div>
          <div className="motor-alvo">
            {isEn ? 'Target on d20' : 'Alvo no d20'}: <strong>{alvoResist}</strong>{' '}
            <span className="motor-alvo-hint">({isEn ? 'resists if d20 > target' : 'resiste se d20 > alvo'})</span>
          </div>
          <Dado value={d20} onChange={setD20} lang={lang} />
          {resResist && (
            <div className={'motor-result resist-' + resResist}>
              <div className="motor-result-nome">
                {resResist === 'empate' ? (isEn ? 'Tie — roll again' : 'Empate — role de novo')
                  : resResist === 'resistiu' ? (isEn ? 'Resisted ✓' : 'Resistiu ✓')
                  : (isEn ? 'Not resisted ✗' : 'Não resistiu ✗')}
              </div>
              <div className="motor-result-meta">
                d20 {d20} {resResist === 'empate' ? '=' : (d20 > alvoResist ? '>' : '<')} {alvoResist}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================== Painel "Ação" (Fase 5c) ============================== */
/* Tabs: Arma | Magia. Técnica vive como sub-select dentro de Arma     */
/* (modificador anexado ao golpe), filtrada por grupo_armas.           */
/* Magia ignora defesa: coluna = nível efetivo do conjurador.          */
function AcaoPanel({ ator, participantes, catalogos, lang, onAplicar, onCancel }) {
  const isEn = lang === 'en';

  // Listas pré-computadas
  const armas    = useMemo(() => ataquesDoAtor(ator, catalogos), [ator, catalogos]);
  const magias   = useMemo(() => magiasOfensivasDoAtor(ator, catalogos), [ator, catalogos]);
  const tecnicas = useMemo(() => tecnicasDoAtor(ator, catalogos), [ator, catalogos]);
  const alvos = useMemo(() => participantes.filter(
    (p) => p.status === 'ativo' && !(p.tipo === ator.tipo && p.ref_id === ator.ref_id)
  ), [participantes, ator]);

  // Tabs disponíveis: Arma sempre; Magia só se PJ é conjurador com magias ofensivas
  const podeMagia = ator.tipo === 'pj' && magias.length > 0;
  const [tab, setTab] = useState(armas.length > 0 ? 'arma' : (podeMagia ? 'magia' : 'arma'));

  // Estado por tab
  const [armaIdx, setArmaIdx]   = useState(0);
  const [tecIdx,  setTecIdx]    = useState(-1);   // -1 = sem técnica
  const [magiaIdx, setMagiaIdx] = useState(0);
  const [alvoIdx, setAlvoIdx]  = useState(0);
  const [d20, setD20] = useState(null);

  // Quando muda de tab, zera dado
  const trocaTab = (t) => { setTab(t); setD20(null); };

  // ── Tab ARMA ───────────────────────────────────────────────
  const arma = armas[armaIdx] || null;
  const tecnicasCompat = useMemo(
    () => tecnicasCompativeisComArma(tecnicas, arma, catalogos),
    [tecnicas, arma, catalogos]
  );
  const tecnica = (tecIdx >= 0 && tecnicasCompat[tecIdx]) || null;

  // ── Tab MAGIA ──────────────────────────────────────────────
  const magia = magias[magiaIdx] || null;

  // ── Alvo (compartilhado) ───────────────────────────────────
  const alvo = alvos[alvoIdx] || null;

  // ── Cálculos por tab ───────────────────────────────────────
  // Arma: coluna = dano_categoria + bônus_grupo − defesa_valor (clamp [-7,50]).
  // Magia: coluna = nível efetivo do conjurador (passa por toda defesa).
  let coluna = null, colunaClamped = null;
  if (tab === 'arma' && arma && alvo) {
    coluna = colunaAtaque(arma, alvo);
    colunaClamped = Math.max(-7, Math.min(50, coluna));
  } else if (tab === 'magia' && magia) {
    coluna = magia.nivel;
    colunaClamped = Math.max(-7, Math.min(50, coluna));
  }

  const res = (colunaClamped != null && d20 != null) ? resolverAcao(colunaClamped, d20) : null;
  const armaPraDano = tab === 'magia' ? magia : arma;        // o objeto cujo `dano` será multiplicado pelo tier
  const dano = res && !res.erra ? danoNoTier(armaPraDano, res.codigo) : 0;
  const custoKarma = tab === 'magia' && magia ? magia.custo_karma : 0;
  const semKarma = custoKarma > 0 && (ator.karma || 0) < custoKarma;
  const podeAplicar = !!res && !semKarma && alvo;

  // ── Estados-limite ─────────────────────────────────────────
  if (armas.length === 0 && !podeMagia) {
    return (
      <div className="atacar">
        <p>{isEn ? 'No actions available for this actor.' : 'Sem ações disponíveis para este lutador.'}</p>
        <button className="btn-ghost btn-sm" onClick={onCancel}>{isEn ? 'Close' : 'Fechar'}</button>
      </div>
    );
  }
  if (alvos.length === 0) {
    return (
      <div className="atacar">
        <p>{isEn ? 'No valid targets.' : 'Sem alvos válidos.'}</p>
        <button className="btn-ghost btn-sm" onClick={onCancel}>{isEn ? 'Close' : 'Fechar'}</button>
      </div>
    );
  }

  const aplicar = () => {
    if (!podeAplicar) return;
    if (tab === 'magia') {
      onAplicar({
        tipo: 'magia',
        magia, alvo,
        coluna: colunaClamped, d20: res.d20, resultado: res, dano,
        custo_karma: custoKarma,
      });
    } else {
      onAplicar({
        tipo: 'arma',
        arma, tecnica, alvo,
        coluna: colunaClamped, d20: res.d20, resultado: res, dano,
        custo_karma: 0,
      });
    }
  };

  return (
    <div className="atacar acao">
      <div className="atacar-head">
        <strong>{ator.nome}</strong> {isEn ? 'acts' : 'age'}
      </div>

      {/* Tabs */}
      <div className="acao-tabs">
        <button className={'acao-tab' + (tab === 'arma' ? ' on' : '')}
          onClick={() => trocaTab('arma')} disabled={armas.length === 0}>
          {isEn ? '⚔ Weapon' : '⚔ Arma'}
        </button>
        {podeMagia && (
          <button className={'acao-tab acao-tab-magia' + (tab === 'magia' ? ' on' : '')}
            onClick={() => trocaTab('magia')}>
            {isEn ? '✦ Spell' : '✦ Magia'}
          </button>
        )}
      </div>

      {tab === 'arma' && (
        <>
          <div className="atacar-row2">
            <label className="motor-field">
              <span>{isEn ? 'Weapon' : 'Arma'}</span>
              <select value={armaIdx} onChange={(e) => { setArmaIdx(parseInt(e.target.value, 10)); setTecIdx(-1); setD20(null); }}>
                {armas.map((a, i) => (
                  <option key={i} value={i}>
                    {a.nome}{a.bonus_ga ? ` (+${a.bonus_ga} grp)` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="motor-field">
              <span>{isEn ? 'Target' : 'Alvo'}</span>
              <select value={alvoIdx} onChange={(e) => { setAlvoIdx(parseInt(e.target.value, 10)); setD20(null); }}>
                {alvos.map((p, i) => (
                  <option key={p.tipo + p.ref_id} value={i}>
                    {p.nome} · {p.defesa_sigla || 'L'}{p.defesa_valor || 0}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {tecnicasCompat.length > 0 && (
            <label className="motor-field">
              <span>{isEn ? 'Technique (optional)' : 'Técnica (opcional)'}</span>
              <select value={tecIdx} onChange={(e) => setTecIdx(parseInt(e.target.value, 10))}>
                <option value={-1}>{isEn ? '— none —' : '— nenhuma —'}</option>
                {tecnicasCompat.map((t, i) => (
                  <option key={t.key} value={i}>
                    {t.nome}{t.total != null ? ` (tot. ${t.total})` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          {tecnica && tecnica.efeito && (
            <div className="acao-tecnica-efeito">
              <strong>{tecnica.nome}:</strong> {tecnica.efeito}
            </div>
          )}

          {arma && alvo && (
            <div className="atacar-coluna">
              <span>{isEn ? 'Action column' : 'Coluna de Ação'}: </span>
              <strong>{colunaClamped}</strong>
              <span className="atacar-coluna-calc">
                {' = '}
                {arma[(alvo.defesa_sigla === 'M' ? 'dano_m' : (alvo.defesa_sigla === 'P' ? 'dano_p' : 'dano_l'))] || 0}
                {arma.bonus_ga ? ` +${arma.bonus_ga}` : ''}
                {' − '}{alvo.defesa_valor || 0}
                {coluna !== colunaClamped ? ` (clamp ${coluna})` : ''}
              </span>
            </div>
          )}
        </>
      )}

      {tab === 'magia' && (
        <>
          <div className="atacar-row2">
            <label className="motor-field">
              <span>{isEn ? 'Spell' : 'Magia'}</span>
              <select value={magiaIdx} onChange={(e) => { setMagiaIdx(parseInt(e.target.value, 10)); setD20(null); }}>
                {magias.map((m, i) => (
                  <option key={m.key} value={i}>
                    {m.nome} · {isEn ? 'lvl' : 'nv'} {m.nivel} · {m.custo_karma} KA
                  </option>
                ))}
              </select>
            </label>
            <label className="motor-field">
              <span>{isEn ? 'Target' : 'Alvo'}</span>
              <select value={alvoIdx} onChange={(e) => { setAlvoIdx(parseInt(e.target.value, 10)); setD20(null); }}>
                {alvos.map((p, i) => (
                  <option key={p.tipo + p.ref_id} value={i}>{p.nome}</option>
                ))}
              </select>
            </label>
          </div>

          {magia && alvo && (
            <div className="atacar-coluna">
              <span>{isEn ? 'Action column' : 'Coluna de Ação'}: </span>
              <strong>{colunaClamped}</strong>
              <span className="atacar-coluna-calc">
                {' = '}{magia.nivel} ({isEn ? 'caster level — ignores defense' : 'nível do conjurador — ignora defesa'})
              </span>
            </div>
          )}

          <div className="acao-karma-line">
            {isEn ? 'Karma cost' : 'Custo de karma'}:{' '}
            <strong className={semKarma ? 'neg' : ''}>{custoKarma}</strong>{' '}
            <span className="acao-karma-have">
              ({isEn ? 'have' : 'tem'} {ator.karma || 0}/{ator.karma_max || 0})
            </span>
            {semKarma && (
              <span className="acao-karma-warn">
                {' · '}{isEn ? 'not enough karma' : 'karma insuficiente'}
              </span>
            )}
          </div>
        </>
      )}

      <Dado value={d20} onChange={setD20} lang={lang} />

      {res && (
        <div className="motor-result" style={{ borderColor: res.cor }}>
          <span className="motor-swatch" style={{ background: res.cor }} />
          <div>
            <div className="motor-result-nome">{isEn ? res.en : res.pt}</div>
            <div className="motor-result-meta">
              d20 {res.d20} ·{' '}
              {res.erra ? (isEn ? 'miss' : 'erra') : `${Math.round(res.dano * 100)}% → ${dano} ${isEn ? 'damage' : 'dano'}`}
              {res.autodano ? (isEn ? ' · self-damage' : ' · auto-dano') : ''}
              {res.critico ? (isEn ? ' · critical (skips EH)' : ' · crítico (pula EH)') : ''}
            </div>
          </div>
        </div>
      )}

      <div className="atacar-footer">
        <button className="btn-ghost btn-sm" onClick={onCancel}>{isEn ? 'Cancel' : 'Cancelar'}</button>
        <button className="btn-primary btn-sm" disabled={!podeAplicar} onClick={aplicar}>
          {isEn
            ? `Apply (1 PA${custoKarma > 0 ? `, ${custoKarma} KA` : ''})`
            : `Aplicar (1 PA${custoKarma > 0 ? `, ${custoKarma} KA` : ''})`}
        </button>
      </div>
    </div>
  );
}

/* ============================== Painel "Teste" (Fase 5d) ==============================
   Tabs: Habilidade / Técnica / Resistência.
   - Habilidade/Técnica: testador escolhe um item do catálogo dele → coluna = total → d20.
   - Resistência: testador é o ALVO (quem resiste). Mestre digita Força de Ataque (origem
     externa) e escolhe RF ou RM → Força de Defesa lida da ficha (se PJ) ou manual (criatura).
   Custo: 1 PA do testador (regra 5d). Sem dano automático — teste é narrativo.
   ====================================================================================== */
function TestePanel({ atorInicial, participantes, catalogos, lang, onAplicar, onCancel }) {
  const isEn = lang === 'en';
  const ativos = participantes.filter((p) => p.status === 'ativo');

  // ── Quem testa ─────────────────────────────────────────────
  const keyOf = (p) => `${p.tipo}:${p.ref_id}`;
  const inicialKey = atorInicial ? keyOf(atorInicial) : (ativos[0] ? keyOf(ativos[0]) : '');
  const [testadorKey, setTestadorKey] = useState(inicialKey);
  const testador = participantes.find((p) => keyOf(p) === testadorKey) || atorInicial;
  const isPJ = testador && testador.tipo === 'pj';
  const pj = (isPJ && catalogos && catalogos.pjById) ? catalogos.pjById[testador.ref_id] : null;

  // Ficha + listas dependentes do testador
  const ficha = useMemo(() => {
    if (!isPJ || !pj) return null;
    return (typeof calcularFicha === 'function')
      ? calcularFicha(pj, catalogos.catalogoBySlug) : null;
  }, [isPJ, pj, catalogos]);
  const atributos = (ficha && ficha.atributos) || {};

  const habilidades = useMemo(() => {
    if (!isPJ || !pj || !pj.habilidades) return [];
    const habsByKey = (catalogos && catalogos.habilidadesByKey) || {};
    const habsDb    = (catalogos && catalogos.habilidadesDb)    || [];
    const bonusObj  = (typeof calcBonusHabilidadesRacaReino === 'function')
      ? calcBonusHabilidadesRacaReino(pj.raca, pj.reino, habsDb) : {};
    const lista = [];
    Object.entries(pj.habilidades).forEach(([key, qtd]) => {
      const h = habsByKey[key];
      if (!h) return;
      const total = (typeof totalHabilidade === 'function')
        ? totalHabilidade(key, pj.habilidades, atributos, bonusObj, habsByKey)
        : null;
      lista.push({ key, nome: h.nome, qtd: qtd || 0, total, ajuste: h.ajuste });
    });
    return lista.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [isPJ, pj, catalogos, atributos]);

  const tecnicas = useMemo(() => tecnicasDoAtor(testador, catalogos), [testador, catalogos]);

  // ── Tabs ───────────────────────────────────────────────────
  const [tab, setTab] = useState('habilidade');
  const trocaTab = (t) => { setTab(t); setD20(null); };

  // Estados por tab
  const [habKey, setHabKey] = useState(null);
  const [tecKey, setTecKey] = useState(null);
  const [resTipo, setResTipo] = useState('rf');               // 'rf' | 'rm'
  const [forcaAtaque, setForcaAtaque] = useState(10);
  const [forcaDefesa, setForcaDefesa] = useState(10);
  const [d20, setD20] = useState(null);

  // Default seleções quando troca testador/tab
  useEffect(() => {
    if (tab === 'habilidade') {
      if (!habilidades.find((h) => h.key === habKey)) {
        setHabKey(habilidades[0] ? habilidades[0].key : null);
      }
    } else if (tab === 'tecnica') {
      if (!tecnicas.find((t) => t.key === tecKey)) {
        setTecKey(tecnicas[0] ? tecnicas[0].key : null);
      }
    }
    // eslint-disable-next-line
  }, [tab, testadorKey, habilidades.length, tecnicas.length]);

  // Auto-puxa RF/RM da ficha quando testador é PJ
  useEffect(() => {
    if (tab !== 'resistencia') return;
    if (!isPJ || !ficha) return;
    const v = resTipo === 'rf' ? ficha.derivadas.resistenciaFisica : ficha.derivadas.resistenciaMagica;
    setForcaDefesa(_clamp1a20(v));
    setD20(null);
  }, [tab, resTipo, isPJ, ficha]);

  // ── Cálculos derivados ─────────────────────────────────────
  const habilidadeSel = habilidades.find((h) => h.key === habKey) || null;
  const tecnicaSel    = tecnicas.find((t) => t.key === tecKey) || null;

  let coluna = null, colunaClamped = null, alvoResist = null;
  if (tab === 'habilidade' && habilidadeSel && habilidadeSel.total != null) {
    coluna = habilidadeSel.total;
    colunaClamped = Math.max(-7, Math.min(50, coluna));
  } else if (tab === 'tecnica' && tecnicaSel && tecnicaSel.total != null) {
    coluna = tecnicaSel.total;
    colunaClamped = Math.max(-7, Math.min(50, coluna));
  } else if (tab === 'resistencia') {
    alvoResist = (typeof resolverResistencia === 'function')
      ? resolverResistencia(forcaAtaque, forcaDefesa) : null;
  }

  const resAcao = (tab !== 'resistencia' && colunaClamped != null && d20 != null && typeof resolverAcao === 'function')
    ? resolverAcao(colunaClamped, d20) : null;
  const resResist = (tab === 'resistencia' && d20 != null && alvoResist != null)
    ? (d20 === alvoResist ? 'empate' : (d20 > alvoResist ? 'resistiu' : 'falhou'))
    : null;

  const semPA = !testador || (testador.pa_rest || 0) <= 0;
  const podeAplicar = !semPA && d20 != null && (
    (tab === 'habilidade'  && !!resAcao)   ||
    (tab === 'tecnica'     && !!resAcao)   ||
    (tab === 'resistencia' && !!resResist && resResist !== 'empate')
  );

  // ── Aplicar ────────────────────────────────────────────────
  const aplicar = () => {
    if (!podeAplicar) return;
    if (tab === 'resistencia') {
      onAplicar({
        tipo_teste: 'resistencia',
        testador,
        resistencia_tipo: resTipo,
        forca_ataque: forcaAtaque,
        forca_defesa: forcaDefesa,
        alvo_resist: alvoResist,
        d20,
        resultado: resResist,
      });
    } else if (tab === 'habilidade' && habilidadeSel) {
      onAplicar({
        tipo_teste: 'habilidade',
        testador,
        chave: habilidadeSel.key,
        nome:  habilidadeSel.nome,
        coluna: colunaClamped,
        d20,
        resultado: resAcao,
      });
    } else if (tab === 'tecnica' && tecnicaSel) {
      onAplicar({
        tipo_teste: 'tecnica',
        testador,
        chave: tecnicaSel.key,
        nome:  tecnicaSel.nome,
        coluna: colunaClamped,
        d20,
        resultado: resAcao,
      });
    }
  };

  // ── Render ─────────────────────────────────────────────────
  const semHab = !isPJ || habilidades.length === 0;
  const semTec = !isPJ || tecnicas.length === 0;
  // Fallback automático de tab: se o testador escolhido não tem habilidade/técnica,
  // pula pra próxima tab disponível. Roda em useEffect pra evitar setState durante render.
  useEffect(() => {
    if (tab === 'habilidade' && semHab && !semTec)        setTab('tecnica');
    else if (tab === 'habilidade' && semHab &&  semTec)   setTab('resistencia');
    else if (tab === 'tecnica'    && semTec && !semHab)   setTab('habilidade');
    else if (tab === 'tecnica'    && semTec &&  semHab)   setTab('resistencia');
    // (Resistência está sempre disponível — não precisa de fallback)
  }, [tab, semHab, semTec]);

  return (
    <div className="atacar acao teste">
      <div className="atacar-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
        <span>{isEn ? 'Test' : 'Teste'}</span>
        <select
          value={testadorKey}
          onChange={(e) => { setTestadorKey(e.target.value); setD20(null); setHabKey(null); setTecKey(null); }}
          style={{ background: 'var(--ink-bg-3)', color: 'var(--bone)', border: '1px solid var(--rule)', padding: '4px 8px', fontFamily: 'inherit', fontSize: 12 }}>
          {ativos.map((p) => (
            <option key={keyOf(p)} value={keyOf(p)}>
              {p.nome} · {isEn ? 'AP' : 'PA'} {p.pa_rest || 0}/{p.pa_max || 0}
            </option>
          ))}
        </select>
      </div>

      <div className="acao-tabs">
        <button className={'acao-tab' + (tab === 'habilidade' ? ' on' : '')}
          onClick={() => trocaTab('habilidade')} disabled={semHab}>
          {isEn ? 'Skill' : 'Habilidade'}
        </button>
        <button className={'acao-tab' + (tab === 'tecnica' ? ' on' : '')}
          onClick={() => trocaTab('tecnica')} disabled={semTec}>
          {isEn ? 'Technique' : 'Técnica'}
        </button>
        <button className={'acao-tab' + (tab === 'resistencia' ? ' on' : '')}
          onClick={() => trocaTab('resistencia')}>
          {isEn ? 'Resistance' : 'Resistência'}
        </button>
      </div>

      {/* Tab Habilidade */}
      {tab === 'habilidade' && (
        semHab ? (
          <p style={{ fontSize: 12, color: 'var(--parchment-muted)', margin: '8px 0' }}>
            {isEn ? 'Selected fighter has no skills.' : 'Lutador selecionado não tem habilidades.'}
          </p>
        ) : (
          <>
            <label className="motor-field">
              <span>{isEn ? 'Skill' : 'Habilidade'}</span>
              <select value={habKey || ''}
                onChange={(e) => { setHabKey(e.target.value); setD20(null); }}>
                {habilidades.map((h) => (
                  <option key={h.key} value={h.key}>
                    {h.nome} · {isEn ? 'tot' : 'tot'} {h.total != null ? h.total : '?'}
                  </option>
                ))}
              </select>
            </label>
            {habilidadeSel && (
              <div className="atacar-coluna">
                <span>{isEn ? 'Action column' : 'Coluna de Ação'}: </span>
                <strong>{colunaClamped}</strong>
                <span className="atacar-coluna-calc">
                  {' = '}{isEn ? 'skill total' : 'total da habilidade'} ({habilidadeSel.total})
                  {coluna !== colunaClamped ? ` ${isEn ? '(clamp' : '(clamp'} ${coluna})` : ''}
                </span>
              </div>
            )}
          </>
        )
      )}

      {/* Tab Técnica */}
      {tab === 'tecnica' && (
        semTec ? (
          <p style={{ fontSize: 12, color: 'var(--parchment-muted)', margin: '8px 0' }}>
            {isEn ? 'Selected fighter has no techniques.' : 'Lutador selecionado não tem técnicas.'}
          </p>
        ) : (
          <>
            <label className="motor-field">
              <span>{isEn ? 'Technique' : 'Técnica'}</span>
              <select value={tecKey || ''}
                onChange={(e) => { setTecKey(e.target.value); setD20(null); }}>
                {tecnicas.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.nome} · {isEn ? 'tot' : 'tot'} {t.total != null ? t.total : '?'}
                  </option>
                ))}
              </select>
            </label>
            {tecnicaSel && (
              <div className="atacar-coluna">
                <span>{isEn ? 'Action column' : 'Coluna de Ação'}: </span>
                <strong>{colunaClamped}</strong>
                <span className="atacar-coluna-calc">
                  {' = '}{isEn ? 'technique total' : 'total da técnica'} ({tecnicaSel.total})
                  {coluna !== colunaClamped ? ` ${isEn ? '(clamp' : '(clamp'} ${coluna})` : ''}
                  {tecnicaSel.efeito ? ` · ${tecnicaSel.efeito}` : ''}
                </span>
              </div>
            )}
          </>
        )
      )}

      {/* Tab Resistência */}
      {tab === 'resistencia' && (
        <>
          <div className="teste-resist-tipo" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--parchment-dim)', marginRight: 4 }}>
              {isEn ? 'Resists with' : 'Resiste com'}:
            </span>
            <button
              className="btn-ghost btn-sm"
              data-on={resTipo === 'rf' ? 'true' : undefined}
              onClick={() => { setResTipo('rf'); }}
              style={{ minWidth: 56 }}>RF</button>
            <button
              className="btn-ghost btn-sm"
              data-on={resTipo === 'rm' ? 'true' : undefined}
              onClick={() => { setResTipo('rm'); }}
              style={{ minWidth: 56 }}>RM</button>
            {isPJ && ficha && (
              <span style={{ fontSize: 10, color: 'var(--parchment-dim)', marginLeft: 6 }}>
                ({isEn ? 'from sheet' : 'da ficha'}: RF {ficha.derivadas.resistenciaFisica} · RM {ficha.derivadas.resistenciaMagica})
              </span>
            )}
          </div>
          <div className="atacar-row2">
            <label className="motor-field">
              <span>{isEn ? 'Attack force (1-20)' : 'Força de Ataque (1-20)'}</span>
              <input type="number" min="1" max="20" value={forcaAtaque}
                onChange={(e) => { setForcaAtaque(_clamp1a20(e.target.value)); setD20(null); }} />
            </label>
            <label className="motor-field">
              <span>
                {isEn ? 'Defense force (1-20)' : 'Força de Defesa (1-20)'}
                <em style={{ marginLeft: 6, fontStyle: 'normal', color: 'var(--gold-bright)', fontSize: 10 }}>
                  ({resTipo.toUpperCase()}{isPJ ? ` · ${isEn ? 'auto' : 'auto'}` : ''})
                </em>
              </span>
              <input type="number" min="1" max="20" value={forcaDefesa} disabled={isPJ}
                onChange={(e) => { setForcaDefesa(_clamp1a20(e.target.value)); setD20(null); }} />
            </label>
          </div>
          {alvoResist != null && (
            <div className="motor-alvo">
              {isEn ? 'Target on d20' : 'Alvo no d20'}: <strong>{alvoResist}</strong>
              <span className="motor-alvo-hint">
                ({isEn ? 'resists if d20 > target' : 'resiste se d20 > alvo'})
              </span>
            </div>
          )}
        </>
      )}

      <Dado value={d20} onChange={setD20} lang={lang} />

      {resAcao && (
        <div className="motor-result" style={{ borderColor: resAcao.cor }}>
          <span className="motor-swatch" style={{ background: resAcao.cor }} />
          <div>
            <div className="motor-result-nome">{isEn ? resAcao.en : resAcao.pt}</div>
            <div className="motor-result-meta">
              d20 {d20}
              {resAcao.critico ? (isEn ? ' · critical' : ' · crítico') : ''}
            </div>
          </div>
        </div>
      )}
      {resResist && (
        <div className={'motor-result resist-' + resResist}>
          <div>
            <div className="motor-result-nome">
              {resResist === 'empate'   ? (isEn ? 'Tie — roll again'   : 'Empate — role de novo')
               : resResist === 'resistiu' ? (isEn ? 'Resisted ✓'         : 'Resistiu ✓')
                                          : (isEn ? 'Not resisted ✗'    : 'Não resistiu ✗')}
            </div>
            <div className="motor-result-meta">
              d20 {d20} {resResist === 'empate' ? '=' : (d20 > alvoResist ? '>' : '<')} {alvoResist}
            </div>
          </div>
        </div>
      )}

      {semPA && (
        <div className="acao-karma-line">
          <strong className="neg">{isEn ? 'No AP left' : 'Sem PA disponível'}</strong>
        </div>
      )}

      <div className="atacar-footer">
        <button className="btn-ghost btn-sm" onClick={onCancel}>{isEn ? 'Cancel' : 'Cancelar'}</button>
        <button className="btn-primary btn-sm" disabled={!podeAplicar} onClick={aplicar}>
          {isEn ? 'Apply (1 AP)' : 'Aplicar (1 PA)'}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { BatalhasHistoriaModal });
