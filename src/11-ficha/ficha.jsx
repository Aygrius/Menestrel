/* ============================================================
   FICHA — Página principal do jogador na hora da aventura
   ============================================================
   Substitui a lista de personagens quando o jogador tem um
   `pj_ativo_id` salvo em `profiles`. Mostra a ficha completa do
   PJ ativo num layout "página de tomo":

     • Topo herói   — retrato + nome + título/estágio + meta
     • Vitalidade   — 4 barras CSS (EF/EH/AR/KA), Velocidade abaixo do nome
     • Condições    — grade de medidores 0–100 (cor por nível)
     • Defesa       — mapa corporal de casas (1 item por casa) + absorção,
                      incl. faixa de 4 dedos abaixo de Mão · Cintura · Mão
     • Arsenal      — tabela de ataques (gerarAtaques)

   Header no topo (mesmo molde de Convites/Batalhas/Lore: ms-header +
   ficha-page-header — seta de voltar, eyebrow "PERSONAGEM", título com o
   nome do PJ, abas como segmented control — diario-subtabs com
   btn-primary/btn-ghost — e editar/excluir como btn-icon à direita): Ficha ·
   Inventário · Loja · Diário. "Capacidades" não é mais uma aba separada —
   virou um card lateral (abas internas Atributos/Magias/Técnicas/
   Habilidades, agora em best-chip/best-chip--icon) dentro da própria aba
   Ficha, ao lado do Arsenal.

   Desequipar uma peça (clique na casa) devolve o item ao
   inventário (limpa equipado/slot) e salva direto em
   personagens.inventario.

   Os 7 atributos-base NÃO são exibidos aqui (vivem no wizard de
   criação, fase 08). Todos os números da ficha são derivados.

   Renderizada por `PersonagensList` (src/08-personagens) quando
   `profile === 'player' && pjAtivoId != null`. A lista por sua
   vez vira a "tela de seleção" quando `pjAtivoId === null`.

   ── CSS ───────────────────────────────────────────────────
   MIGRADA (Pedra & Bronze, Fase 11). Layout "Tomo de Pedra":
   releitura ARPG da tela de inventário de referência. O CSS vive
   em index.css (bloco "FICHA — Tomo de Pedra"), escopado em
   #root .menestrel-ui, com classes novas `fp2-*` + overrides das
   classes legadas reusadas (.fp-bars de FichaVitBars, .fp-atk,
   .fp-cap-grid, .fp-slot-abs…). O header principal (fpTabsEl) e as
   barras de busca/filtro (Inventário/Loja/Diário) foram migrados pro
   padrão de página comum (ms-header/ficha-page-header,
   best-toolbar/best-search/best-chip — mesmo molde de Convites/Batalhas/
   Lore/Bestiário); `.fp-tab`/`.fp-tab--icon` sobrevivem só nas sub-abas
   internas que não foram tocadas nesta migração de header (ex.: sub-abas
   de filtro dentro de outros painéis que não usam best-chip). A raiz
   carrega a classe `menestrel-ui` (puxa os tokens de pedra). O styles.css
   legado e o antigo bloco "FICHA v6" não são mais usados por esta tela.
   As casas do mapa corporal reusam `.inv-slot` (já migrado).

   ── Props ─────────────────────────────────────────────────
   - ac, lang, currentUserId   — herdados do AdminConsole
   - pjAtivoId                 — id do PJ ativo (já carregado do banco)
   - onVoltar()                — volta à lista (não muda pj_ativo_id)
   - onTrocar(novoPjId)        — troca de PJ ativo (atualiza profiles)

   ── Dependências (de outras fases) ────────────────────────
   - calcularFicha(p, catalogoBySlug, condicoesAtuais?) → game-data.jsx
     (3º argumento NOVO, opcional: pj.estado_atual?.condicoes — aplica o
     efeito de condição sobre atributos/derivados quando informado)
   - tituloDoPersonagem(p)                    → game-data.jsx
   - HABILIDADES_BY_KEY, totalHabilidade, totalHabilidadeComCondicoes,
     nivelMagiaEfetivo, totalTecnica          → game-data.jsx
   - gerarAtaques, getSlotsState, bonusGrupoArma,
     SLOT_LABELS, aplicarEfeitosItem                → inventario-helpers.jsx
   - invItemIcon                              → inventario.jsx
   - RolagemD20Overlay, D20_DIF_LABEL          → 02-shell/dado-d20.jsx

   ── Notificação da mesa (NOVO) ─────────────────────────────
   Ao concluir um teste de habilidade (RolagemD20Overlay -> onResultado),
   aoResolverTesteHabilidade monta o texto e chama registrarEventoMesa,
   que dispara a RPC registrar_evento_mesa (grava em mesa_log; Realtime
   distribui pra CentralMensagens de Mestre + outros Jogadores da mesma
   história). Sem historiaPj carregado, não registra nada (PJ fora de
   história). Mesmo padrão deve ser reaproveitado quando "Evocar" magia
   e técnicas de combate ganharem resolução real.

   ── Carregamento ─────────────────────────────────────────
   Em paralelo: o PJ ativo (select *), todos os PJs do jogador
   (id+nome p/ o dropdown), e os 3 catálogos (itens, magias,
   tecnicas). Sem debounce — leitura única.
   ============================================================ */

/* ============================== [11] Barras de vitalidade (CSS) ============================== */
/* Barras de vitalidade: preenchimento sólido na cor do poço + brilho
   suave deslizante (CSS) + ponta clara. Barra esgotada (val 0) vira
   trilho vazio discreto. Sem canvas — leitura limpa. */

const FICHA_VIT_COLORS = {
  ef: '#ae2f20',   // Energia Física — ember quente (Pedra & Bronze)
  eh: '#4e98c9',   // Energia Heroica — ouro-velho
  ar: '#8c8d8e',   // Armadura — aço frio
  ka: '#9150A0',   // Karma — ametista discreta
  velocidade: '#4a8f5c',  // Velocidade — verde (agilidade)
  rf: '#a86b3c',          // Resistência Física — bronze/cobre
  rm: '#5a4a8f',          // Resistência Mágica — índigo (perto de Karma, mas distinto)
};

// Cor da condição (Vitalidade/Condições reais, não isto aqui) agora é a
// função compartilhada corCondicao(val) de 01-core/helpers.jsx — sinal do
// valor (negativo/neutro/positivo), não mais nível 0–1. Ver defensive lookup
// `_corCondicao` dentro de cada componente abaixo (BarEditPopover, FichaPersonagem).

// Estado narrativo de cada barra (Vitalidade + Condições): 3 rótulos fixos
// por chave — [vazio, intermediário, cheio]. Usado só como leitura textual
// (tooltip / popover de edição), nunca substitui o valor numérico.
// PT/EN pareados por índice; fallback genérico se a chave não tiver entrada.
const FICHA_ESTADO_LABELS = {
  ef:   { pt: ['Ferido', '', 'Disposto'], en: ['Wounded', '', 'Fit'] },
  eh:   { pt: ['Abatido', '', 'Corajoso'], en: ['Shaken', '', 'Brave'] },
  ar:   { pt: ['Vulnerável', '', 'Protegido'], en: ['Vulnerable', '', 'Protected'] },
  ka:   { pt: ['Esgotado', '', 'Conectado'], en: ['Depleted', '', 'Connected'] },
  vitalidade:      { pt: ['Doente', '', 'Saudável'], en: ['Sick', '', 'Healthy'] },
  animo:           { pt: ['Sonolento', '', 'Desperto'], en: ['Drowsy', '', 'Awake'] },
  hidratacao:      { pt: ['Desidratado', '', 'Hidratado'], en: ['Dehydrated', '', 'Hydrated'] },
  nutricao:        { pt: ['Fome', '', 'Satisfeito'], en: ['Hungry', '', 'Satisfied'] },
  termorregulacao: { pt: ['Frio', '', 'Calor'], en: ['Cold', '', 'Hot'] },
  euforia:         { pt: ['Alterado', '', 'Sóbrio'], en: ['Altered', '', 'Sober'] },
  sanidade:        { pt: ['Insano', '', 'São'], en: ['Insane', '', 'Sane'] },
  reputacao:       { pt: ['Desonrado', '', 'Honrado'], en: ['Dishonored', '', 'Honored'] },
};

// val/max → 0 (vazio) | 1 (intermediário) | 2 (cheio). max<=0 trata como vazio.
// min (opcional, default 0): quando < 0, a escala é bidirecional (condições
// -COND_LIMITE..+COND_LIMITE) — os mesmos 3 rótulos passam a significar
// negativo/neutro/positivo em vez de vazio/intermediário/cheio.
function fichaEstadoLabel(key, val, max, en, min) {
  const entry = FICHA_ESTADO_LABELS[key];
  if (!entry) return null;
  const lista = en ? entry.en : entry.pt;
  const v = Number(val) || 0;
  if (min < 0) {
    if (v < 0) return lista[0];
    if (v > 0) return lista[2];
    return lista[1];
  }
  const vv = Math.max(0, v);
  const m = Math.max(0, Number(max) || 0);
  if (m <= 0 || vv <= 0) return lista[0];
  if (vv >= m) return lista[2];
  return lista[1];
}

function FichaVitBars({ bars, showValue, scope, onEdit, en, onHover, onHoverEnd }) {
  const editable = typeof onEdit === 'function';
  const hasHover = typeof onHover === 'function';
  return (
    <div className={'fp-bars' + (showValue ? ' with-val' : '')}>
      {bars.map((b) => {
        const _lo = b.min ?? 0;
        const _span = b.max - _lo;
        const pct = _span > 0 ? Math.max(0, Math.min(1, (b.val - _lo) / _span)) : 0;
        const empty = pct <= 0;
        const estadoLbl = fichaEstadoLabel(b.key, b.val, b.max, en, b.min);
        const sufixoEstado = estadoLbl ? ` — ${estadoLbl}` : '';
        const abrir = editable
          ? (e) => onEdit(b, scope, e.currentTarget.getBoundingClientRect())
          : undefined;
        const tipContent = hasHover ? { title: b.label, desc: b.tip ?? (estadoLbl || undefined) } : null;

        // Cor da barra: b.color quando definido pelo pai (condições, combatBars),
        // senão cor fixa da chave (EF/EH/AR/KA/Estágio).
        const barColor = b.color || FICHA_VIT_COLORS[b.key] || '#888';

        // Fundo do ícone dinâmico por pct — igual ao padrão das condições:
        // verde cheio · cinza médio · vermelho baixo. Aplica-se a TODAS as
        // barras (incluindo EF/EH/AR/KA) via style inline, sobrescrevendo o
        // color-mix do CSS que usava --bar-c (cor fixa da barra).
        const iconBgColor = pct >= 0.6
          ? 'rgba(0,133,15,0.22)'
          : pct >= 0.25
          ? 'rgba(140,130,110,0.20)'
          : 'rgba(135,0,0,0.28)';

        return (
          <div
            key={b.key}
            className={'fp-bar-row' + (editable ? ' is-editable' : '')}
            style={{ '--bar-c': barColor }}
            onClick={abrir}
            role={editable ? 'button' : undefined}
            tabIndex={editable ? 0 : undefined}
            onKeyDown={editable ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(e); }
            } : undefined}
            title={!hasHover && editable ? `${b.label}: ${b.val}/${b.max}${sufixoEstado}` : undefined}
          >
            <div className="fp-bar-pill">
              {b.icon && (
                <span className="fp-bar-icon" aria-hidden="true"
                  style={{ background: iconBgColor }}>
                  <i className={'ti ' + b.icon} />
                </span>
              )}
              <div
                className={'fp-bar-track' + (empty ? ' is-empty' : '')}
                onMouseEnter={hasHover && tipContent ? (e) => onHover(e, tipContent) : undefined}
                onMouseLeave={hasHover && tipContent ? onHoverEnd : undefined}
                onFocus={hasHover && tipContent ? (e) => onHover(e, tipContent) : undefined}
                onBlur={hasHover && tipContent ? onHoverEnd : undefined}
                title={!hasHover && !editable ? `${b.label}: ${b.val}${showValue ? '/' + b.max : ''}${sufixoEstado}` : undefined}
              >
                {!empty && (
                  <div className="fp-bar-fill" style={{ width: (pct * 100) + '%' }}>
                    <span className="fp-bar-tip" />
                  </div>
                )}
              </div>
            </div>
            {showValue && (
              <span className="fp-bar-val">{b.val}<i> de {b.max}</i></span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ============================== [11] Popover de edição de barra ============================== */
/* Clique numa barra de Vitalidade/Condição abre este popover ancorado:
   ajusta o valor ATUAL (0..max) por slider, SEM tocar no máximo (que é
   derivado por calcularFicha). O valor escolhido sobe via onChange; o pai
   persiste com debounce. Fecha no Esc, clique fora, scroll ou no ×. */
function BarEditPopover({ item, scope, anchor, lang, onChange, onClose }) {
  const en = lang === 'en';
  const min = Math.round(Number(item.min) || 0);
  const max = Math.max(min, Math.round(Number(item.max) || 0));
  const [val, setVal] = useState(() => Math.max(min, Math.min(max, Math.round(Number(item.val) || 0))));
  const ref = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onScroll = () => onClose();
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    // adia o listener de clique-fora p/ não capturar o mesmo clique que abriu
    const t = setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
      clearTimeout(t);
      document.removeEventListener('mousedown', onDown);
    };
  }, [onClose]);

  const aplicar = (v) => {
    const nv = Math.max(min, Math.min(max, Math.round(v)));
    setVal(nv);
    onChange(scope, item.key, nv);
  };

  const isCond = scope === 'cond';
  // Mesma largura pros dois escopos agora que vit e cond compartilham o
  // mesmo layout (stepper + presets) — "mesmo modal" de fato, não só
  // visual parecido.
  const W = 296;
  const vw = (typeof window !== 'undefined' ? window.innerWidth : 360);
  let left = anchor ? anchor.left : 0;
  let top = anchor ? anchor.bottom + 8 : 0;
  if (left + W > vw - 10) left = Math.max(10, vw - 10 - W);
  if (left < 10) left = 10;

  const _corCondicao = (typeof corCondicao !== 'undefined' ? corCondicao : null) || window.corCondicao || (() => '#888');
  const cor = isCond
    ? _corCondicao(val)
    : (item.color || FICHA_VIT_COLORS[item.key] || '#888');
  const estadoLbl = fichaEstadoLabel(item.key, val, max, en, item.min);

  // ── Stepper -/valor/+ — agora usado em condições E em vitalidade (antes
  // vitalidade tinha um slider simples à parte; unificado a pedido). Mesmo
  // visual do QuantityStepper de 12-batalha/batalha.jsx (pill escuro
  // translúcido, botões circulares dourados, texto Lora). Duplicado AQUI
  // porque 11-ficha carrega ANTES de 12-batalha (não tem como importar) —
  // mesmo padrão já usado pelos helpers locais de 13-diario/diario.jsx.
  const podeDec = val > min;
  const podeInc = val < max;

  // Cards de preset: condição (min<0, faixa bidirecional -COND_LIMITE..+COND_LIMITE)
  // mantém a fórmula de extremos + meio-caminho + 1/5-caminho + neutro (hoje dá
  // [-50, -25, -10, 0, +10, +25, +50]). Vitalidade (min=0) usa 0/25/50/75/100%
  // do máximo — a fórmula da condição degeneraria em zeros repetidos com min=0.
  // Set no fim descarta duplicata (max pequeno tipo 1-3 pode arredondar pro
  // mesmo preset mais de uma vez, nos dois casos).
  const rawPresets = min < 0
    ? [min, Math.round(min / 2), Math.round(min / 5), 0, Math.round(max / 5), Math.round(max / 2), max]
    : [0, Math.round(max / 6), Math.round(max / 3), Math.round(max / 2), Math.round(max * 2 / 3), Math.round(max * 5 / 6), max];
  const presets = [...new Set(rawPresets)];
  // Pill central: condição mostra +/- (faixa com sinal, sempre ±COND_LIMITE);
  // vitalidade mostra val/max (o teto varia por PJ/stat, vale mais mostrar).
  const centerLabel = isCond ? (val > 0 ? `+${val}` : String(val)) : `${val} / ${max}`;
  // Cor dos cards de preset: p === 0 é sempre cinza (neutro/vazio), em qualquer escopo.
  // Condição: cor por sinal (corCondicao). Vitalidade: cor fixa da barra.
  const corPreset = (p) => p === 0 ? '#8c8d8e' : (isCond ? _corCondicao(p) : cor);

  return (
    <div
      ref={ref}
      className="fp-bar-pop"
      style={{ position: 'fixed', left, top, width: W, overflow: 'hidden', '--pop-accent': cor }}
      role="dialog"
      aria-label={item.label}
      onClick={(e) => e.stopPropagation()}
    >
      {estadoLbl && <div className="fp-bar-pop-estado">{estadoLbl}</div>}

      <div className="fp-pop-stepper">
        <button type="button" className="fp-step-btn" disabled={!podeDec}
          onMouseDown={(e) => e.preventDefault()} onClick={() => aplicar(val - 1)} aria-label="-">
          <i className="ti ti-minus" aria-hidden="true" />
        </button>
        <span className="fp-pop-stepper-label">
          {centerLabel}
        </span>
        <button type="button" className="fp-step-btn" disabled={!podeInc}
          onMouseDown={(e) => e.preventDefault()} onClick={() => aplicar(val + 1)} aria-label="+">
          <i className="ti ti-plus" aria-hidden="true" />
        </button>
      </div>
      <div className="fp-pop-presets">
        {presets.map((p) => {
          const ativo = val === p;
          const corP = corPreset(p);
          return (
            <button
              key={p}
              type="button"
              onClick={() => aplicar(p)}
              aria-pressed={ativo}
              className="fp-pop-preset-btn"
              style={{
                border: `1px solid ${corP}`,
                background: ativo ? corP : 'rgba(24,17,8,0.6)',
                color: ativo ? '#1C1407' : '#E8DDC6',
                fontWeight: ativo ? 700 : 500,
              }}
            >
              {isCond ? (p > 0 ? `+${p}` : p) : p}
            </button>
          );
        })}
      </div>
    </div>
  );
}


/* ============================== [11] Divisor ornamental ============================== */
function FpDivider({ label, icon }) {
  return (
    <div className="fp-divider">
      <span className="fp-divider-ln" />
      <span className="fp-divider-lbl">
        {icon && <i className={'ti ' + icon} aria-hidden="true" />}
        {label}
      </span>
      <span className="fp-divider-ln" />
    </div>
  );
}

/* Cabeçalho de seção — usado no layout "Tomo" (coluna). Segue o padrão inv-divider + inv-bag-grouphead. */
function FpHead({ label, icon }) {
  return label ? (
    <div className="inv-bag-grouphead">
      {icon && <i className={'ti ' + icon} aria-hidden="true" />}
      <span className="inv-bag-grp-name">{label}</span>
    </div>
  ) : null;
}

/* ============================== [11] Medidores de condição ============================== */
/* Grade compacta de condições. Cor por SINAL (negativo vermelho / neutro /
   positivo verde — corCondicao, helpers.jsx). Sem canvas — leitura calma,
   complementar às barras de vitalidade animadas.
   NOTA: componente não é renderizado em lugar nenhum hoje (substituído pelo
   elCond baseado em FichaVitBars, ver mais abaixo) — mantido só por se
   algum dia voltar a ser usado; não remover sem confirmar com o usuário. */
function CondMeters({ conds }) {
  const _corCondicao = (typeof corCondicao !== 'undefined' ? corCondicao : null) || window.corCondicao || (() => '#888');
  return (
    <div className="fp-cond-grid">
      {conds.map((c) => {
        const lo = c.min ?? 0;
        const span = c.max - lo;
        const pct = span > 0 ? Math.max(0, Math.min(1, (c.val - lo) / span)) : 0;
        const cor = _corCondicao(c.val);
        return (
          <div key={c.key} className="fp-cond">
            <div className="fp-cond-top">
              <span className="fp-cond-lbl">{c.label}</span>
            </div>
            <div className="fp-cond-bar">
              <div className="fp-cond-fill" style={{ width: (pct * 100) + '%', background: cor }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================== [11] Ícones de alerta de condições ============================== */
/* Aparece APENAS quando uma condição está NEGATIVA (abaixo de 0 — a nova
   linha de base neutra): abaixo de -25 (metade do caminho até -COND_LIMITE)
   vermelho; entre -25 e 0, laranja. Reputação é exceção — tem ícone tanto
   pro lado negativo (vermelho) quanto positivo (verde), porque os dois lados
   são narrativamente relevantes (infame vs. honrado), não só "alerta".
   Peso continua em escala de acúmulo 0–100 (sistema à parte, não mexido
   aqui). O card some completamente quando nenhuma condição está em alerta.
   NOTA: assim como CondMeters acima, COND_ICON_RULES/ConditionIcons não são
   renderizados em lugar nenhum hoje — o card de Condições sempre mostra
   elCond (as barras reais) pra Mestre e Jogador, a pedido do usuário.
   elCond mudou de coluna mais de uma vez (vitCondCol → combatPanels, coluna
   direita, mais abaixo) — não pressupor onde ele mora, checar a definição
   de combatPanels. Mantido só por se algum dia voltar a ser usado; não
   remover sem confirmar com o usuário. */
const COND_ICON_RULES = [
  {
    key: 'vitalidade',
    check: (val) => {
      if (val < -25) return { icon: 'ti-heart-down', color: '#ef4444' };
      if (val < 0)    return { icon: 'ti-heart-down', color: '#f97316' };
      return null;
    },
  },
  {
    key: 'animo',
    check: (val) => {
      if (val < -25) return { icon: 'ti-bed', color: '#ef4444' };
      if (val < 0)    return { icon: 'ti-bed', color: '#f97316' };
      return null;
    },
  },
  {
    key: 'hidratacao',
    check: (val) => {
      if (val < -25) return { icon: 'ti-droplet-down', color: '#ef4444' };
      if (val < 0)    return { icon: 'ti-droplet-down', color: '#f97316' };
      return null;
    },
  },
  {
    key: 'nutricao',
    check: (val) => {
      if (val < -25) return { icon: 'ti-meat', color: '#ef4444' };
      if (val < 0)    return { icon: 'ti-meat', color: '#f97316' };
      return null;
    },
  },
  {
    // Temperatura deixou de ser "ruim nos 2 extremos" (calor E frio) — agora
    // é linear como as outras (negativo ruim, positivo bom), então perde a
    // distinção de ícone sun/snow. Ver nota de rótulo em ConditionIcons.
    key: 'termorregulacao',
    check: (val) => {
      if (val < -25) return { icon: 'ti-temperature', color: '#ef4444' };
      if (val < 0)    return { icon: 'ti-temperature', color: '#f97316' };
      return null;
    },
  },
  {
    key: 'euforia',
    check: (val) => {
      if (val < -25) return { icon: 'ti-glass-full', color: '#ef4444' };
      if (val < 0)    return { icon: 'ti-glass-full', color: '#f97316' };
      return null;
    },
  },
  {
    key: 'sanidade',
    check: (val) => {
      if (val < -25) return { icon: 'ti-mood-sick', color: '#ef4444' };
      if (val < 0)    return { icon: 'ti-mood-sick', color: '#f97316' };
      return null;
    },
  },
  {
    // Reputação já era bidirecional "de verdade" (infame vs. honrado, não
    // "ruim nos 2 lados") — mantém os 2 ícones, só troca pct por sinal.
    key: 'reputacao',
    check: (val) => {
      if (val > 0) return { icon: 'ti-thumb-up', color: '#22c55e' };
      if (val < 0) return { icon: 'ti-thumb-down', color: '#ef4444' };
      return null;
    },
  },
  {
    // Peso: % da capacidade de carga (0–100, sistema à parte). Acúmulo (não
    // esgotamento): < 50% nada · 50–75% laranja · > 75% vermelho.
    key: 'peso',
    check: (pct) => {
      if (pct > 0.75) return { icon: 'ti-weight', color: '#ef4444' };
      if (pct >= 0.50) return { icon: 'ti-weight', color: '#f97316' };
      return null;
    },
  },
];

function ConditionIcons({ condBars, onHover, onHoverEnd, en }) {
  const alertas = condBars.reduce((acc, c) => {
    const rule = COND_ICON_RULES.find((r) => r.key === c.key);
    if (!rule) return acc;
    // Peso continua em % (0–100). As 8 condições reais usam o valor bruto
    // (com sinal) direto — ver comentário de COND_ICON_RULES acima.
    const pct = c.max > 0 ? Math.max(0, Math.min(1, c.val / c.max)) : 0;
    const alerta = c.key === 'peso' ? rule.check(pct) : rule.check(c.val);
    if (alerta) {
      // Label narrativo base (ex.: "Saudável", "Ferido"). c.min<0 aciona a
      // leitura bidirecional em fichaEstadoLabel (negativo/neutro/positivo).
      let estadoLbl = fichaEstadoLabel(c.key, c.val, c.max, en, c.min) || c.label;
      // Peso: label conforme a faixa de carga (laranja = pesado, vermelho = sobrecarregado).
      if (c.key === 'peso') {
        estadoLbl = alerta.color === '#ef4444'
          ? (en ? 'Overloaded' : 'Sobrecarregado')
          : (en ? 'Heavy' : 'Pesado');
      }
      acc.push({ ...alerta, label: estadoLbl, key: c.key });
    }
    return acc;
  }, []);

  if (alertas.length === 0) return null;

  return (
    <div className="fp-cond-icon">
      {alertas.map(({ key, icon, color, label }) => (
        <span
          key={key}
          className="fp-cond-icon-btn"
          style={{ '--alert-c': color, flexShrink: 0 }}
          onMouseEnter={onHover ? (e) => onHover(e, { desc: label }) : undefined}
          onMouseLeave={onHoverEnd || undefined}
          aria-label={label}
        >
          <i className={'ti ' + icon} aria-hidden="true" />
        </span>
      ))}
    </div>
  );
}

/* ============================== [11] Mapa corporal (Defesa) ============================== */
/* 3 colunas, casas pareadas nas laterais e linha central do corpo,
   + faixa de 2 joias (largura total) abaixo de Mão · Cinto · Mão.
   Cada casa guarda 1 item. O vocabulário das regiões é o do catálogo
   (slot_equip); "cinto"/"dedos" usam rótulo local até o SLOT_LABELS
   do inventario-helpers.jsx ganhar as chaves.
   Slots por região: brinco 2 · cabeça 1 · capa 1 · cinto 3 · colar 1 ·
   joia 4 · pés 1 · braços 1 · mãos 2 · ombros 1 · peito 1 · pernas 1 */
const FP_BODY_ROWS = [
  ['orelha', 'cabeca',  'orelha'],
  ['ombros', 'pescoco', 'ombros'],
  ['bracos', 'peito',   'bracos'],
  ['mao_e',  'cintura', 'mao_d'],
  ['__dedos__'],                    // faixa de 2 joias (largura total do mapa)
  ['pes',    'pernas',  'pes'],
];
const FP_DEDOS_COUNT = 2;   // 2 slots de Joia, flanqueando as Mãos na fila inferior
const FP_LABELS_EXTRA = {
  pt: { maos:'Mãos', mao_d:'Mãos', mao_e:'Mãos', orelha:'Brinco', brinco:'Brinco', cabeca:'Cabeça',
        capa:'Roupa', pescoco:'Colar', colar:'Colar', ombros:'Ombros', peito:'Peito', bracos:'Braços',
        pernas:'Pernas', cintura:'Cinto', pes:'Pés', dedos:'Joia', joia:'Joia', roupa:'Roupa' },
  en: { maos:'Hands', mao_d:'Hands', mao_e:'Hands', orelha:'Earring', brinco:'Earring', cabeca:'Head',
        capa:'Cloth', pescoco:'Necklace', colar:'Necklace', ombros:'Shoulders', peito:'Chest', bracos:'Arms',
        pernas:'Legs', cintura:'Belt', pes:'Feet', dedos:'Jewel', joia:'Jewel', roupa:'Cloth' },
};

/* Ícone Tabler (webfont 3.44.0) por região — UM ícone só, igual em casa
   cheia ou vazia (sem variante -off), conforme o briefing. Braços segue o
   mesmo glifo das demais peças de armadura (ti-shirt). */
const FP_REGION_ICON = {
  mao_d:   'ti-hand-stop',
  mao_e:   'ti-hand-stop',
  maos:    'ti-hand-stop',
  orelha:  'ti-diamond',
  cabeca:  'ti-shield',
  capa:    'ti-shirt',
  pescoco: 'ti-diamond',
  ombros:  'ti-shield',
  peito:   'ti-shield',
  bracos:  'ti-shield',
  pernas:  'ti-shield',
  cintura: 'ti-shield',
  pes:     'ti-shield',
  dedos:   'ti-diamond',
  joia:    'ti-diamond',
  brinco:  'ti-diamond',
  colar:   'ti-diamond',
  roupa:   'ti-shirt',
};

/* ============================== [11] Arte por item (casas de equipamento) ============================== */
/* Algumas pecas ganham uma ilustracao propria no fundo da casa, no lugar
   do icone generico da regiao (FP_REGION_ICON). Hoje so o Colete de Couro;
   basta acrescentar novas entradas (nome do item em minusculas -> imagem)
   pra estender a outras pecas. Combinada com um degrade escuro pra manter
   o nome do item legivel por cima da arte. */
const FP_ITEM_BG = {
  'elmo': 'data:image/jpeg;base64,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',
  'peitoral': 'data:image/jpeg;base64,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',
  'ombreiras': 'data:image/jpeg;base64,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',
  'calça': 'data:image/jpeg;base64,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',
  'roupa': 'data:image/jpeg;base64,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',
  'botas': 'data:image/jpeg;base64,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',
  'espada': 'data:image/jpeg;base64,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',
  'escudo': 'data:image/jpeg;base64,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',
  'cinto': 'data:image/jpeg;base64,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',
  'capa': 'data:image/jpeg;base64,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',
  'anel1': 'data:image/jpeg;base64,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',
  'anel2': 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCACEAIQDASIAAhEBAxEB/8QAGgAAAwADAQAAAAAAAAAAAAAAAAECAwQFBv/EADcQAAEDAwMCBAQFAwMFAAAAAAEAAhEDBCESMUFRYQUicYETMpGhBhSxweEj0fAzQmJScqLC8f/EABcBAQEBAQAAAAAAAAAAAAAAAAABAgP/xAAZEQEBAQEBAQAAAAAAAAAAAAAAARExAgP/2gAMAwEAAhEDEQA/API5QE8dktlUOUSephLhHCgEJ+qXVUM57pEdEDYp8KBJxhHGUb4QEd0+qnuUIA5RGd046pEZQAT/AGTzvKSAwhEDkoQLdMKVQE5GyoB2CI9cJjMxzsllQG/uiEcdU6bXVHaabXPd0aJKCeUbro+G2NGvTuat259JtKAJ8rdXcn9Bkqza2NAD4n5h0iRJDJHWMn6ppbnXMhBC9G6ysL5pq0aPwGQBrt3ay13/ACZ0PZcy/wDCX2tE16dencU2v0P0Ag0zxqByJTSXXOVQEadgUcYQLhMdEkxsgQ27IymJ7p452HRFKOxQiJ4QiJVSpCcYVBPVMZMblTstm3pOJGkDW7OcwPTqpVbDfDiypbip5/i8BpLR7j5j2Cu1vadtVr6mPe0NIpNZ5G6uC4bx2W2y28TtQ28pVXt+FT06zpim042J29AsXilobDxG3bdUq9SkQC91QiaonzRBwO26ypeKsqMvfyzQ5zKAaG4OXFoJce5J3V3ljXdUNc6qzKvm+IwFw22MbEbQuiKA8YFwbN75pODW1HYFVsYDxuCNg7mMrCadzZ27KbKVzSqSXVXtpO8zuBIEEBXXD6S9R4Z4c9rK9xUBoimyWPMt1O4A6p293XuvxBSFwxtRtdnwKrdAh7cwXDqMH2WxRv8AxB102pUoVn27minVZWaW03TgmSIBWxUtaPhrq1es0ucwFpccASMMZOXOIIBdwJ2yh483dcbxC0sqnh1K6t3UaFy5ut1tTqF4LeSJ+U526BcWcFb77W6+G2o2kYqNe5hGC4D5iB6LQBxthI7UTyiMdxwid4T46wqFsP2TgRjplI774VROfuUAB7+iFTamkQGg9yhBiGEJDumiBga57WuMNJEkCcLcqO06nNJpUpgCcn1PJWrQ/wBdnbP2WS5aXVWs4awfU5Kl61OEKlOAfhkg8lyt9djiw66ktIgOJICwPAaxsGYJBSIkJhrt2F1WsmXNzbua0tIpkl3mhx4HP7LLR/EAoNbTFm0NaIAZc1GgLhtqjHxGmRgOG6ZfTe5rdZgzJLYUxdd+78SN7aVKbvDazgRua9V4b3iIK0Lq8dd2tm579T6dL4RHTScH3BH0W3T8cu6lSja3dxWo2ophrvgtAeRETzPsujZfhxlGg66o1aPiFJ9JwDDTgO7tM4cERpWtsxrLas2s+u9hHxKdOW1KR0lwDScHE+4haPjNlTplt1aua+jU8xLRAM7OA4nYjgj0XoXPuGeH6qHhjoD2VKdSk9rtQB3ImZIxzuuRWovotu6Qh9GnWcGtJ8wncEdCIPq1BwJk55TjHWOip9PRULdwMjuEj6LSEeNs8oHX6pxtGQRsjb34CCoEDBOOAhRngoQY00JgKoTHaKjXdDlbtyHeR3/WyD6jC0iMLo+HAXbTQcfP8zO7gNvcD6hZrUabKDqhLGgku2HdYoOOAujXqsYRTtHkkjzVAI9gsVxQcGCuG+UmHRw7+USxqtE5KQGMpjE7+yrmRtwqIALXAtJBGy7Pg/jT/D3uguNF/wDrUmn/AM29HD7/AKciIJ9VLiWkFu4Qel8QbbNvRcPNVtFwDnvtzGXfLUA6HMjggrRuqbvytxUfXZcO+IxzajXS5wggzyON1NhcfGtDbuGoMDnUx2Pzs/8AYdwsdxRc9sUwXva3TLRl7D8p7ng+yyrXu2OY6mXQS5gdLTIIIkLFgj/IWW5Y5rntLdBYBqb0I3+6w9J/hVDxO5PVAbM+n0SPzY4QXS1w1QJ2AwVQfRCtrDAnSPUwhTTGDZCPVH2VRUSilUNGoHNJHpv6jugeiRGEV3DQp3jPzdKNW9Zo4J/3j/ieehXRsLZvmZUaHMcNLmu2I6fyvNWN9UsqwcxxAB6THtyOo5XtPAruxugSxoZVaJNMZgdW9W9tws41rzfjfgNfw0/HpB9S0ds8jLOzv7rlNONtvuvf3l26qfKSKeQ1vB9eD6Ly3ilnah00f6TznS35fpwrqWOPM+qUb/5Ct1J7HfLq7jKQDgCdDgNtlUZLJ7qVbS3f5m+oytysCy4Y6iXCc09JIPm2j3wtK3pv/MUzEQ6crZrVXaLeHaSATI3EOMLN61OMDg5jKjamHAEQdwZ2+xUCA3G7kng6oJM7mUw2czAHKqAtJdAHH0QIb8uXdf7Kp1DSwaWjef3VENp9Z+/8JpiTSkyXZ6QTCFJc+eR2CERiCYGyQ2TByqg2mEAok+kI42RS06hhVQr1bZ7XMJEGRBIIPUHgo5z/APEEc/VB6Sz/ABEyvTNO8EPdvVa0En/ubsfUQey06trXuKznW1Sld6s/03eYerTkLjECSIOE/MCIOrpIlTF13LHwitXuCK7HUGMy81AW4T8VuX1T+Ws9YtqWGtaPmPUrn0/Fr6kIbc3EbYrOj7ysT7xzyS7W4neahyorLTpmlqLs1yIa2fl7notarVmr/Ty1jQ1pP6qS972EAhregESgMDRqIxwOqYgaMFzjifcq9JdBOG8AfsgAudqfzsB/myTn8A+/9uyoZfpGlsSPt/Kg8d0BsuO3qqEAiNo/3DdE6n1JQsmnp90INcGPRMdJSA+qr0VQQSDKWZATxOyDvvnqimBLgNkSP4SG+PunOTI3/VAs78hPIMziMwk3Iko5hAzMxHoEzxsfRIGOvY9FQgyYAaOAN0BAjU7bgdVTW6zqdv06/wAJAazqcPQf5wm94Jiffr/Cik90yAfU9VIGrO0blPTqI0jPKU9NuAiLLRlsYIkHeVI83p+ickNiYLeR+ilxyYmEA+HOkTHCE9I5dB6QhXRAG/oic/dCEDODHAU9EIRD5VRnsMwhCKkYxxurLQChCBEDSO6ZE1Q3idPshCgok6B3n7cLGfmhCFYVkaBrdT4AkdZQcSRglCFlUEky3gFP5RI3mEIVQkIQqj//2Q==',
  'colar': 'data:image/jpeg;base64,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',
  'brincos': 'data:image/jpeg;base64,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',
  'braçadeiras': 'data:image/jpeg;base64,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',
  };
/* Imagem-placeholder por REGIÃO do mapa corporal: reaproveita as artes de
   FP_ITEM_BG pra que a casa mostre a "foto" do tipo de peça mesmo VAZIA
   (esmaecida). Quando um item é equipado, a arte própria dele (se houver)
   sobrepõe esta; senão esta serve de fallback. capa fica de fora (sem arte
   dedicada → mantém o ícone genérico). */
const FP_REGION_BG = {
  cabeca:  FP_ITEM_BG['elmo'],
  peito:   FP_ITEM_BG['peitoral'],
  ombros:  FP_ITEM_BG['ombreiras'],
  pernas:  FP_ITEM_BG['calça'],
  pes:     FP_ITEM_BG['botas'],
  cintura: FP_ITEM_BG['cinto'],
  pescoco: FP_ITEM_BG['colar'],
  capa:   FP_ITEM_BG['capa'],
  bracos:   FP_ITEM_BG['braçadeiras'],
  dedos:    FP_ITEM_BG['anel2'],
  orelha:  FP_ITEM_BG['brincos'],
  roupa:   FP_ITEM_BG['roupa'],
  mao_d:   FP_ITEM_BG['espada'],
  maos:    FP_ITEM_BG['espada'],
  mao_e:   FP_ITEM_BG['escudo'],
};

const fpItemBgStyle = (img, faded) => img ? {
  backgroundImage: `linear-gradient(to top, ${faded
    ? 'rgba(10,8,5,0.92), rgba(10,8,5,0.62) 60%, rgba(10,8,5,0.80)'
    : 'rgba(10,8,5,0.88), rgba(10,8,5,0.18) 55%, rgba(10,8,5,0.38)'}), url(${img})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
} : undefined;

/* ============================== [11] Modal de detalhes de magia ============================== */
/* Abre ao clicar numa magia do card lateral (aba Magias), fora de combate.
   Mostra ficha completa da magia (evocação/alcance/duração/alvo) + descrição
   geral + tabela de níveis (1/3/5/7/9, cada um com seu texto de efeito em
   `valor_N`). O jogador pode selecionar qualquer nível IGUAL OU INFERIOR ao
   nível efetivo que possui (via nivelMagiaEfetivoFn) — níveis acima ficam
   visíveis mas bloqueados. Ao selecionar um nível, aparece a seleção de
   alvo: o próprio PJ ou outro protagonista da mesma história (`colegas`).
   Usa o padrão ModalShell (ms-*) + chips .det-sec-chip (mesmo padrão de
   atributos do DetalhesItemModal), igual ao resto do projeto.
   "Evocar" (onEvocar) fecha o modal e notifica a Central de Mensagens da
   Mesa com { nivel, alvo } — ainda NÃO aplica o efeito mecânico no alvo
   (curar/dano/buff fica para quando a resolução de magia for implementada,
   junto com técnicas de combate — ver onResultado de habilidade como
   referência do padrão a seguir). */
function MagiaDetalhesModal({ magia, passos, nivelMagiaEfetivoFn, eu, colegas, lang, onClose, onEvocar, abrirTip, fecharTip }) {
  const en = lang === 'en';
  const m = magia;
  const possui = passos != null;
  const nivelAtual = possui ? nivelMagiaEfetivoFn(passos) : null;

  const NIVEIS = [1, 3, 5, 7, 9].map((n) => ({
    n,
    titulo: m[`nivel_${n}`],
    valor: m[`valor_${n}`],
  })).filter((nv) => nv.titulo || nv.valor);

  // Nível escolhido pelo jogador p/ evocar — começa no maior nível que ele
  // possui (mais comum) e só pode ser ajustado pra algo <= nivelAtual.
  const [nivelSel, setNivelSel] = useState(possui ? nivelAtual : null);
  // Alvo escolhido: 'self' (o próprio PJ) ou o id (string) de um colega.
  const [alvoSel, setAlvoSel] = useState(null);

  // Esc fecha + trava o scroll do fundo, igual ao comportamento padrão do
  // ModalShell (aqui montado via classes ms-* puras, sem o componente em si).
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [onClose]);

  const escolherNivel = (n) => {
    if (n > nivelAtual) return; // bloqueado: acima do nível possuído
    setNivelSel(n);
  };

  const ALVOS = [
    { id: 'self', nome: (en ? '(You) ' : '(Você) ') + [eu?.nome, eu?.sobrenome].filter(Boolean).join(' '), foto_url: eu?.foto_url },
    ...((colegas || []).map((c) => ({ id: String(c.id), nome: [c.nome, c.sobrenome].filter(Boolean).join(' '), foto_url: c.foto_url }))),
  ];

  const FICHA_TXT = [
    { ic: 'ti-wand', lbl: en ? 'Casting' : 'Evocação', val: m.evocacao },
    { ic: 'ti-arrows-maximize', lbl: en ? 'Range' : 'Alcance', val: m.alcance },
    { ic: 'ti-hourglass', lbl: en ? 'Duration' : 'Duração', val: m.duracao },
    { ic: 'ti-crosshair', lbl: en ? 'Target' : 'Alvo', val: m.alvo },
  ].filter((f) => f.val);

  const podeEvocar = possui && nivelSel != null && alvoSel != null;

  return (
    <div className="ms-backdrop" role="presentation">
      <div className="ms-modal ms-md" role="dialog" aria-modal="true" aria-label={m.nome}>
        <div className="ms-header">
          <h3 className="ms-title">
            <i className="ti ti-comet det-title-ic" aria-hidden="true" style={{ marginRight: 8 }} />
            {m.nome}
            {possui && (
              <span className="det-title-badge">{nivelAtual}</span>
            )}
          </h3>
          <button type="button" className="ms-close" onClick={onClose} aria-label={en ? 'Close' : 'Fechar'}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <div className="ms-body">
          {FICHA_TXT.length > 0 && (
            <div className="det-sec-a">
              {FICHA_TXT.map((f) => (
                <span key={f.lbl} className="det-sec-chip"
                  onMouseEnter={(e) => abrirTip(e, { desc: f.lbl })}
                  onMouseLeave={fecharTip}
                  onFocus={(e) => abrirTip(e, { desc: f.lbl })}
                  onBlur={fecharTip}
                  tabIndex={0}
                >
                  <span className="det-sec-ic-box">
                    <i className={'ti ' + f.ic} aria-hidden="true" />
                  </span>
                  <span className="det-sec-val">{f.val}</span>
                </span>
              ))}
            </div>
          )}

          {m.descricao && (
            <div className="det-desc">
              <p>{m.descricao}</p>
            </div>
          )}

          {NIVEIS.length > 0 && (
            <div className="det-sec-head">
              <span>{en ? 'Levels' : 'Níveis'}</span>
            </div>
          )}

          {NIVEIS.map((nv) => {
            const bloqueado = nv.n > nivelAtual;
            const selecionado = nv.n === nivelSel;
            const tipNivel = (en ? 'Level ' : 'Nível ') + nv.n + (bloqueado ? (en ? ' (locked)' : ' (bloqueado)') : '');
            return (
              <button
                type="button"
                key={nv.n}
                className={'det-stat mag-nivel-card' + (selecionado ? ' mag-nivel-card--sel' : '') + (bloqueado ? ' mag-nivel-card--locked' : '')}
                onClick={() => escolherNivel(nv.n)}
                aria-disabled={bloqueado}
                aria-pressed={selecionado}
                onMouseEnter={(e) => abrirTip(e, { desc: tipNivel })}
                onMouseLeave={fecharTip}
                onFocus={(e) => abrirTip(e, { desc: tipNivel })}
                onBlur={fecharTip}
              >
                <span className="mag-nivel-titulo">
                  <i className={'ti ti-hexagon-number-' + nv.n} aria-hidden="true" style={{ fontSize: 18 }} />
                  {nv.titulo}
                  {bloqueado && <i className="ti ti-lock" aria-hidden="true" style={{ marginLeft: 'auto', fontSize: 14 }} />}
                  {selecionado && <i className="ti ti-check" aria-hidden="true" style={{ marginLeft: 'auto', color: 'var(--gold, #C9A44E)' }} />}
                </span>
                {nv.valor && <p className="fp-mag-nivel-valor">{nv.valor}</p>}
              </button>
            );
          })}

          {nivelSel != null && (
            <>
              <div className="det-sec-head">
                <span>{en ? 'Target' : 'Alvo'}</span>
              </div>
              <div className="det-opt-grid">
                {ALVOS.map((a) => {
                  const selecionado = alvoSel === a.id;
                  const iniciais = (a.nome || '?').trim().slice(0, 1).toUpperCase();
                  return (
                    <button
                      type="button"
                      key={a.id}
                      className={'det-opt-card' + (selecionado ? ' det-opt-card--sel' : '')}
                      onClick={() => setAlvoSel(a.id)}
                      aria-pressed={selecionado}
                      onMouseEnter={(e) => abrirTip(e, { desc: a.nome })}
                      onMouseLeave={fecharTip}
                      onFocus={(e) => abrirTip(e, { desc: a.nome })}
                      onBlur={fecharTip}
                    >
                      {a.foto_url ? (
                        <img className="det-opt-foto" src={a.foto_url} alt="" />
                      ) : (
                        <span className="det-opt-foto det-opt-foto--vazia">{iniciais}</span>
                      )}
                      <span className="det-opt-nome">{a.nome}</span>
                      {selecionado && <i className="ti ti-check" aria-hidden="true" style={{ color: 'var(--gold, #C9A44E)' }} />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="ms-footer">
          <div className="ms-footer-left">
            <button type="button" className="btn-ghost" onClick={onClose}>
              {en ? 'Close' : 'Fechar'}
            </button>
          </div>
          <div className="ms-footer-right">
            <button
              type="button"
              className="btn-primary"
              disabled={!podeEvocar}
              onClick={() => {
                if (!podeEvocar) return;
                const alvo = ALVOS.find((a) => a.id === alvoSel) || null;
                if (onEvocar) onEvocar({ nivel: nivelSel, alvo });
                onClose();
              }}
            >
              {en ? 'Cast' : 'Evocar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- SelectPill — cópia local de 12-batalha/batalha.jsx ----------
// SelectPill não é exportado via window por batalha.jsx. Padrão do projeto:
// cada módulo que precisa declara sua própria cópia local em vez de importar
// (ver também a cópia em 13-diario/diario.jsx, usada no LoreEntradaForm pro
// campo Raça). Copiado aqui pro seletor de Dificuldade do
// HabilidadeDetalhesModal — este é o dropdown padrão REAL do projeto (ver
// skill menestrel-rpg, seção "Padrão de dropdown/select"). CSS já existe em
// index.css (blocos .select-pill-btn / .select-pill-drop / .motor-field),
// nada novo a adicionar lá.
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

  return (
    <div className="motor-field" ref={ref} style={{ position: 'relative' }}>
      {label && <span>{label}</span>}
      <button type="button" className="select-pill-btn" data-open={open ? 'true' : 'false'} disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => { e.currentTarget.blur(); !disabled && setOpen((v) => !v); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v); } }}>
        <span className="select-pill-btn-label">{displayLabel}</span>
        <i className="ti ti-chevron-down select-pill-btn-ic" aria-hidden="true"
           style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>
      {open && (
        <ul className="select-pill-drop">
          {options.map((opt) => {
            const active = String(opt.value) === String(value);
            return (
              <li key={opt.value}
                className={active ? 'active' : undefined}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(201,164,78,0.10)'; e.currentTarget.style.color = '#E8DDC6'; } }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = active ? '#C9A44E' : '#C8BCAA'; }}
                onClick={() => { onChange(opt.value); setOpen(false); }}>
                {active && <i className="ti ti-check" style={{ fontSize: 12, color: '#C9A44E', flexShrink: 0 }} />}
                {!active && <span className="select-pill-drop-spacer" />}
                {opt.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ============================== [11] Modal de detalhes de habilidade ============================== */
/* Abre ao clicar numa habilidade do card lateral (aba Habilidades), fora de
   combate. Diferente de magia, habilidade não tem nível — sempre usa o
   total já calculado (_totHab, passado pronto via prop `total`). Mostra
   nome, descrição, ajuste (atributo-base que rege o teste) e restrição.
   Não tem alvo: o jogador só escolhe a dificuldade do teste (Fácil/Médio/
   Difícil/Muito Difícil/Absurdo) via SelectPill (dropdown padrão do
   projeto, cópia local — ver bloco acima). Chips de Ajuste/Restrição usam .det-sec-chip
   (mesmo padrão do DetalhesItemModal), mesmo sistema de tooltip
   (abrirTip/fecharTip).
   "Usar" chama onUsar({ nome, total, dificuldade }) -> o pai (FichaPersonagem)
   abre o RolagemD20Overlay (dado no centro da tela) e resolve via resolverAcao. */
function HabilidadeDetalhesModal({ habilidade, total, lang, onClose, onUsar, abrirTip, fecharTip }) {
  const en = lang === 'en';
  const h = habilidade;

  const AJUSTE_LBL = {
    intelecto: en ? 'Intellect' : 'Intelecto',
    aura: 'Aura',
    carisma: en ? 'Charisma' : 'Carisma',
    forca: en ? 'Strength' : 'Força',
    fisico: en ? 'Body' : 'Físico',
    agilidade: en ? 'Agility' : 'Agilidade',
    percepcao: en ? 'Perception' : 'Percepção',
  };

  const DIFICULDADES = [
    { id: 'facil', lbl: en ? 'Easy' : 'Fácil' },
    { id: 'medio', lbl: en ? 'Medium' : 'Médio' },
    { id: 'dificil', lbl: en ? 'Hard' : 'Difícil' },
    { id: 'muito_dificil', lbl: en ? 'Very hard' : 'Muito difícil' },
    { id: 'absurdo', lbl: en ? 'Absurd' : 'Absurdo' },
  ];
  // Padrão razoável: começa em "Médio" (nem o mais fácil, nem o mais difícil).
  const [dificuldadeSel, setDificuldadeSel] = useState('medio');

  // Esc fecha + trava o scroll do fundo, igual ao comportamento padrão do
  // ModalShell (aqui montado via classes ms-* puras, sem o componente em si).
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [onClose]);

  const FICHA_TXT = [
    { ic: 'ti-adjustments', lbl: en ? 'Adjustment' : 'Ajuste', val: AJUSTE_LBL[h.ajuste] || h.ajuste },
    { ic: 'ti-ban', lbl: en ? 'Restriction' : 'Restrição', val: h.restricao },
  ].filter((f) => f.val != null && f.val !== '');

  return (
    <div className="ms-backdrop" role="presentation">
      <div className="ms-modal ms-md" role="dialog" aria-modal="true" aria-label={h.nome}>
        <div className="ms-header">
          <h3 className="ms-title">
            <i className="ti ti-bolt det-title-ic" aria-hidden="true" style={{ marginRight: 8 }} />
            {h.nome}
            {total != null && (
              <span className="det-title-badge">{total >= 0 ? `${total}` : total}</span>
            )}
          </h3>
          <button type="button" className="ms-close" onClick={onClose} aria-label={en ? 'Close' : 'Fechar'}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <div className="ms-body">
          {FICHA_TXT.length > 0 && (
            <div className="det-sec-a">
              {FICHA_TXT.map((f) => (
                <span key={f.lbl} className="det-sec-chip"
                  onMouseEnter={(e) => abrirTip(e, { desc: f.lbl })}
                  onMouseLeave={fecharTip}
                  onFocus={(e) => abrirTip(e, { desc: f.lbl })}
                  onBlur={fecharTip}
                  tabIndex={0}
                >
                  <span className="det-sec-ic-box">
                    <i className={'ti ' + f.ic} aria-hidden="true" />
                  </span>
                  <span className="det-sec-val">{f.val}</span>
                </span>
              ))}
            </div>
          )}

          {h.descricao && (
            <div className="det-desc">
              <p>{h.descricao}</p>
            </div>
          )}

          <div className="det-sec-head">
            <span>{en ? 'Difficulty' : 'Dificuldade'}</span>
          </div>
          <SelectPill
            value={dificuldadeSel}
            onChange={setDificuldadeSel}
            options={DIFICULDADES.map((d) => ({ value: d.id, label: d.lbl }))}
          />
        </div>

        <div className="ms-footer">
          <div className="ms-footer-left">
            <button type="button" className="btn-ghost" onClick={onClose}>
              {en ? 'Close' : 'Fechar'}
            </button>
          </div>
          <div className="ms-footer-right">
            <button
              type="button"
              className="btn-primary"
              disabled={!dificuldadeSel}
              onClick={() => onUsar && onUsar({ nome: h.nome, total: total, dificuldade: dificuldadeSel })}
            >
              {en ? 'Use' : 'Usar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ============================== [11] FichaInfoView — tela de informações do PJ ==============================
   Grid de 5 colunas com todos os dados do personagem: identidade, derivadas,
   habilidades por grupo, técnicas e magias. Recebe dados já processados do pai
   (FichaPersonagem) — sem fetch próprio.

   Navegação por subgrupo: cada coluna exibe um subgrupo por vez. A seta (›)
   ao lado do título do coluna avança para o próximo subgrupo (ciclando).
   Indicadores de posição (tracinhos dourados) mostram em qual página estamos.
   Colunas com um único subgrupo não exibem a seta.
   - Col 1: Identidade → Atributos → Caracterizações
   - Col 2: Derivadas → Grupos de Armas → Idiomas
   - Col 3: cada grupo de habilidades presente (Subterfúgio, Manobra, …)
   - Col 4/5: único subgrupo — sem seta */
function FichaInfoView({
  pj, en,
  atributosFinais, derivadas, estagioNum, xpTotal, velocidade,
  pesoPersonagem,
  catalogoHab, catalogoMag, catalogoTec,
  habsByKey, pjHabilidades, pjMagias, pjTecnicas,
  nivelMagiaEfetivoFn, totalHabilidadeFn, totalTecnicaFn,
  bonusHabilidades, titulo,
}) {
  const _d = derivadas || {};

  // ── Estado de navegação — um índice por coluna ──────────────────────────
  const [col1Page, setCol1Page] = useState(0);
  const [col2Page, setCol2Page] = useState(0);
  const [col3Page, setCol3Page] = useState(0);
  const [col4Page, setCol4Page] = useState(0);
  const [col5Page, setCol5Page] = useState(0);

  // ── helpers visuais ──────────────────────────────────────────────
  const Row = ({ label, value }) => (
    <div className="fp-row">
      <span className="fp-row-label">{label}</span>
      <span className="fp-row-value">{value ?? '—'}</span>
    </div>
  );

  // ── Cabeçalho de coluna com navegação por subgrupo ─────────────────────
  // pages = [{ key, label }]. Quando pages.length === 1 não mostra seta nem indicadores.
  const ColTitleNav = ({ mainLabel, pages, page, onNext }) => {
    const multi = pages.length > 1;
    const sub = pages[page] || pages[0];
    return (
      <div className="fp-col-title-nav">

        {/* Linha do título principal + seta */}
        <div className="fp-col-title-top">
          <span className="fp-col-title-main">
            {mainLabel}
          </span>
          <button
              className="fp-col-title-nav-btn"
              onClick={multi ? onNext : undefined}
              title={multi ? `${en ? 'Next' : 'Próximo'}: ${pages[(page + 1) % pages.length].label}` : undefined}
              aria-hidden={!multi}
              onMouseEnter={(e) => { if (multi) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(201,164,78,0.12)'; } }}
              onMouseLeave={(e) => { if (multi) { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.background = 'none'; } }}
            >
              <i className="ti ti-chevron-right" aria-hidden="true" />
            </button>
        </div>

        {/* Sub-label sempre visível; indicadores e seta só aparecem quando multi */}
        <div className="fp-col-title-sub-row">
          <span className="fp-col-title-sub">
            {sub.label}
          </span>
          {/* Indicadores: traços largos=ativo, curtos=inativo — só quando há >1 página */}
          {multi && (
            <div className="fp-col-title-dots">
              {pages.map((_, i) => (
                <div key={i} className={'fp-col-title-dot ' + (i === page ? 'fp-col-title-dot--active' : 'fp-col-title-dot--inactive')} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Col 1 — Identidade / Atributos / Caracterizações ──────────────
  const caract = pj.caracterizacao || {};
  const tractosFlat = [];
  const GRUPO_LABEL = {
    fisica:    en ? 'Physical'    : 'Física',
    social:    en ? 'Social'      : 'Social',
    pessoal:   en ? 'Personal'    : 'Pessoal',
    historica: en ? 'Historical'  : 'Histórica',
  };
  ['fisica', 'social', 'pessoal'].forEach((grupo) => {
    const escolhas = caract[grupo] || {};
    Object.values(escolhas).forEach((v) => { if (v) tractosFlat.push({ grupo, nome: v }); });
  });
  if (caract.historica) tractosFlat.push({ grupo: 'historica', nome: caract.historica });

  const col1Pages = [
    { key: 'identidade',      label: en ? 'Identity'        : 'Identidade'       },
    { key: 'atributos',       label: en ? 'Attributes'      : 'Atributos'        },
    ...(tractosFlat.length > 0 ? [{ key: 'caract', label: en ? 'Traits' : 'Caracterizações' }] : []),
  ];
  const col1Idx = col1Page % col1Pages.length;
  const col1Sub = col1Pages[col1Idx].key;

  const col1 = (
    <div className="fp-col-pad-l">
      <ColTitleNav
        mainLabel={en ? 'Identity' : 'Identidade'}
        pages={col1Pages}
        page={col1Idx}
        onNext={() => setCol1Page((p) => (p + 1) % col1Pages.length)}
      />

      {col1Sub === 'identidade' && (
        <>
          <Row label={en ? 'Name'           : 'Nome'}           value={pj.nome} />
          <Row label={en ? 'Surname'        : 'Sobrenome'}      value={pj.sobrenome} />
          <Row label={en ? 'Title'          : 'Título'}         value={titulo || null} />
          <Row label={en ? 'Race'           : 'Raça'}           value={pj.raca} />
          <Row label={en ? 'Gender'         : 'Gênero'}         value={pj.genero} />
          {pesoPersonagem != null && (
            <Row label={en ? 'Weight' : 'Peso'} value={`${pesoPersonagem} kg`} />
          )}
          <Row label={en ? 'Profession'     : 'Profissão'}      value={pj.profissao} />
          <Row label={en ? 'Group'          :  'Grupo'}         value={pj.especializacao} />
          <Row label={en ? 'Kingdom'        : 'Reino'}          value={pj.reino} />
          <Row label={en ? 'God'            : 'Deus'}           value={pj.deus} />
        </>
      )}

      {col1Sub === 'atributos' && (
        <>
          <Row label={en ? 'Intellect'  : 'Intelecto'}  value={atributosFinais?.intelecto  ?? '—'} />
          <Row label="Aura"                              value={atributosFinais?.aura        ?? '—'} />
          <Row label={en ? 'Charisma'   : 'Carisma'}    value={atributosFinais?.carisma     ?? '—'} />
          <Row label={en ? 'Strength'   : 'Força'}      value={atributosFinais?.forca       ?? '—'} />
          <Row label={en ? 'Body'       : 'Físico'}     value={atributosFinais?.fisico      ?? '—'} />
          <Row label={en ? 'Perception' : 'Percepção'}  value={atributosFinais?.percepcao   ?? '—'} />
          <Row label={en ? 'Agility'    : 'Agilidade'}  value={atributosFinais?.agilidade   ?? '—'} />
        </>
      )}

      {col1Sub === 'caract' && tractosFlat.map((t, i) => {
        const nome = t.nome ? t.nome.charAt(0).toUpperCase() + t.nome.slice(1) : t.nome;
        return <Row key={i} label={GRUPO_LABEL[t.grupo] || t.grupo} value={nome} />;
      })}
    </div>
  );

  // ── Col 2 — Derivadas / Grupos de Armas / Idiomas ─────────────────
  const _gaByS = (typeof GRUPOS_ARMAS_BY_SIGLA !== 'undefined' ? GRUPOS_ARMAS_BY_SIGLA : null)
    || window.GRUPOS_ARMAS_BY_SIGLA || {};
  const gruposArmas = pj.grupos_armas || {};
  const gaEntries = Object.entries(gruposArmas)
    .filter(([, v]) => Number(v) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]));

  const _idiomasIniciais_fn = (typeof idiomasIniciais !== 'undefined' ? idiomasIniciais : null)
    || window.idiomasIniciais || null;
  const idiomasNativos = _idiomasIniciais_fn
    ? (_idiomasIniciais_fn(pj.raca, pj.reino) || [])
    : [];
  const idiomasAprim = (pj.aprimoramentos?.idioma || []).filter(Boolean);
  const idiomasTodos = [
    ...idiomasNativos,
    ...idiomasAprim.filter((id) => !idiomasNativos.includes(id)),
  ];

  const col2Pages = [
    { key: 'derivadas',   label: en ? 'Stats'         : 'Derivadas'      },
    ...(gaEntries.length > 0    ? [{ key: 'armas',   label: en ? 'Weapon Groups' : 'Grupos de Armas' }] : []),
    ...(idiomasTodos.length > 0 ? [{ key: 'idiomas', label: en ? 'Languages'    : 'Idiomas'          }] : []),
  ];
  const col2Idx = col2Page % col2Pages.length;
  const col2Sub = col2Pages[col2Idx].key;

  const col2 = (
    <div>
      <ColTitleNav
        mainLabel={en ? 'Stats' : 'Derivadas'}
        pages={col2Pages}
        page={col2Idx}
        onNext={() => setCol2Page((p) => (p + 1) % col2Pages.length)}
      />

      {col2Sub === 'derivadas' && (
        <>
          <Row label={en ? 'Defense'             : 'Defesa'}              value={_d.defesa             ?? _d.de ?? '—'} />
          <Row label={en ? 'Speed'               : 'Velocidade'}          value={velocidade             ?? '—'} />
          <Row label={en ? 'Physical Resistance' : 'Resistência Física'}  value={_d.rf ?? _d.resistenciaFisica  ?? '—'} />
          <Row label={en ? 'Magic Resistance'    : 'Resistência Mágica'}  value={_d.rm ?? _d.resistenciaMagica  ?? '—'} />
          <Row label={en ? 'Stage'               : 'Estágio'}             value={estagioNum} />
          <Row label={en ? 'Experience'          : 'Experiência'}         value={xpTotal} />
        </>
      )}

      {col2Sub === 'armas' && gaEntries.map(([sigla, val]) => {
        const nomeGrupo = _gaByS[sigla]?.nome || sigla;
        return <Row key={sigla} label={nomeGrupo} value={String(val)} />;
      })}

      {col2Sub === 'idiomas' && idiomasTodos.map((idioma) => {
        const isNativo = idiomasNativos.includes(idioma);
        return (
          <div key={idioma} className="fp-idioma-row">
            <span className="fp-idioma-nome">{idioma}</span>
            {isNativo && (
              <span className="fp-idioma-tag">
                {en ? 'Native' : 'Nativo'}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Col 3 — Habilidades (um grupo por vez) ─────────────────────────
  const GRUPOS_ORDEM = (typeof GRUPOS_HABILIDADES_ORDEM !== 'undefined' ? GRUPOS_HABILIDADES_ORDEM : null)
    || window.GRUPOS_HABILIDADES_ORDEM
    || ['Profissional', 'Subterfúgio', 'Manobra', 'Influência', 'Conhecimento', 'Geral'];

  const habPorGrupo = {};
  GRUPOS_ORDEM.forEach((g) => { habPorGrupo[g] = []; });
  catalogoHab.forEach((h) => {
    const g = h.grupo || 'Geral';
    if (!habPorGrupo[g]) habPorGrupo[g] = [];
    habPorGrupo[g].push(h);
  });

  // Apenas grupos que o PJ realmente possui habilidades
  const col3Pages = GRUPOS_ORDEM
    .map((grupo) => {
      const possuidas = (habPorGrupo[grupo] || [])
        .filter((h) => Object.prototype.hasOwnProperty.call(pjHabilidades, h.key));
      return possuidas.length > 0 ? { key: grupo, label: grupo, possuidas } : null;
    })
    .filter(Boolean);

  const col3Idx = col3Pages.length > 0 ? (col3Page % col3Pages.length) : 0;
  const col3Current = col3Pages[col3Idx] || null;

  const col3 = (
    <div>
      <ColTitleNav
        mainLabel={en ? 'Skills' : 'Habilidades'}
        pages={col3Pages.length > 0 ? col3Pages : [{ key: 'empty', label: '—' }]}
        page={col3Idx}
        onNext={() => setCol3Page((p) => (p + 1) % Math.max(col3Pages.length, 1))}
      />
      {col3Current ? (
        col3Current.possuidas.map((h) => {
          const total = totalHabilidadeFn
            ? totalHabilidadeFn(h.key, pjHabilidades, atributosFinais, bonusHabilidades, habsByKey, {})
            : (pjHabilidades[h.key] ?? '—');
          return <Row key={h.key} label={h.nome} value={String(total)} />;
        })
      ) : (
        <div className="fp-col-empty">
          {en ? 'No skills.' : 'Nenhuma habilidade.'}
        </div>
      )}
    </div>
  );

  // ── Especialidades (construídas uma vez, usadas em col4 e col5) ────
  // GAME_DATA.especializacoes contém todos os nomes de especialização
  // por profissão. Usamos isso para distinguir Básica/Avançada sem
  // depender de campos arbitrários como `custo` ou `tipo`.
  const _gd = (typeof GAME_DATA !== 'undefined' ? GAME_DATA : null) || window.GAME_DATA || {};
  const _espMap = _gd.especializacoes || {};
  // Técnicas avançadas = reservadas pelas guildas de ladinos e academias de guerreiros
  const SPECS_GUE_LAD = new Set([
    ...(_espMap['Guerreiro'] || []).map((s) => s.esp),
    ...(_espMap['Ladino']    || []).map((s) => s.esp),
  ]);
  // Magias avançadas = pertencentes a colégios, trilhas, ordens e confrarias
  // (todas as especializações EXCETO Guerreiro e Ladino, que não usam magia)
  const SPECS_MAGICAS = new Set(
    Object.entries(_espMap)
      .filter(([prof]) => prof !== 'Guerreiro' && prof !== 'Ladino')
      .flatMap(([, lista]) => lista.map((s) => s.esp))
  );

  const tecEsAvancada = (t) => {
    const lista = (t.permissao || '').split(',').map((s) => s.trim()).filter(Boolean);
    return lista.some((p) => SPECS_GUE_LAD.has(p));
  };
  const magEsAvancada = (m) => {
    const lista = (m.permissao || '').split(',').map((s) => s.trim()).filter(Boolean);
    return lista.some((p) => SPECS_MAGICAS.has(p));
  };

  // ── Col 4 — Técnicas de Combate (Básicas / Avançadas por permissao) ─
  // Avançadas: reservadas pelas guildas de ladinos e academias de guerreiros
  // Básicas:   acessíveis pela profissão base, sem especialização
  const tecPossuidas = catalogoTec.filter((t) =>
    Object.prototype.hasOwnProperty.call(pjTecnicas, t.key)
  );
  const magPossuidas = catalogoMag.filter((m) => pjMagias[m.key] != null);
  const col5Existe = magPossuidas.length > 0;

  const tecBasicas   = tecPossuidas.filter((t) => !tecEsAvancada(t));
  const tecAvancadas = tecPossuidas.filter((t) =>  tecEsAvancada(t));
  const col4Pages = [
    ...(tecBasicas.length   > 0 ? [{ key: 'basicas',   label: en ? 'Basic'    : 'Básicas',   items: tecBasicas   }] : []),
    ...(tecAvancadas.length > 0 ? [{ key: 'avancadas', label: en ? 'Advanced' : 'Avançadas', items: tecAvancadas }] : []),
    ...(tecBasicas.length === 0 && tecAvancadas.length === 0 ? [{ key: 'vazio', label: '—', items: [] }] : []),
  ];
  const col4Idx  = col4Pages.length > 0 ? (col4Page % col4Pages.length) : 0;
  const col4Current = col4Pages[col4Idx] || col4Pages[0];

  const col4 = (
    <div className={col5Existe ? undefined : 'fp-col-pad-r'}>
      <ColTitleNav
        mainLabel={en ? 'Techniques' : 'Técnicas'}
        pages={col4Pages}
        page={col4Idx}
        onNext={() => setCol4Page((p) => (p + 1) % col4Pages.length)}
      />
      {col4Current.items.length === 0 ? (
        <div className="fp-col-empty">
          {en ? 'No techniques.' : 'Nenhuma técnica.'}
        </div>
      ) : col4Current.items.map((t) => {
        const tot = totalTecnicaFn ? totalTecnicaFn(t, pjTecnicas, atributosFinais) : '—';
        return <Row key={t.key} label={t.nome} value={tot != null ? String(tot) : '—'} />;
      })}
    </div>
  );

  // ── Col 5 — Magias (Básicas / Avançadas por permissao) ─────────────
  // Avançadas: dos colégios de magia, trilhas de rastreadores,
  //            ordens de sacerdotes e confrarias de bardos (SPECS_MAGICAS)
  // Básicas:   acessíveis pela profissão base (Mago, Bardo, Sacerdote, Rastreador)
  const magBasicas   = magPossuidas.filter((m) => !magEsAvancada(m));
  const magAvancadas = magPossuidas.filter((m) =>  magEsAvancada(m));
  const col5Pages = [
    ...(magBasicas.length   > 0 ? [{ key: 'basicas',   label: en ? 'Basic'    : 'Básicas',   items: magBasicas   }] : []),
    ...(magAvancadas.length > 0 ? [{ key: 'avancadas', label: en ? 'Advanced' : 'Avançadas', items: magAvancadas }] : []),
  ];
  const col5Idx     = col5Pages.length > 0 ? (col5Page % col5Pages.length) : 0;
  const col5Current = col5Pages[col5Idx] || col5Pages[0];

  const col5 = !col5Existe ? null : (
    <div className="fp-col-pad-r">
      <ColTitleNav
        mainLabel={en ? 'Spells' : 'Magias'}
        pages={col5Pages.length > 0 ? col5Pages : [{ key: 'vazio', label: '—' }]}
        page={col5Idx}
        onNext={() => setCol5Page((p) => (p + 1) % Math.max(col5Pages.length, 1))}
      />
      {(col5Current?.items || []).map((m) => {
        const passos = pjMagias[m.key];
        const nivel = nivelMagiaEfetivoFn ? nivelMagiaEfetivoFn(passos) : '—';
        return <Row key={m.key} label={m.nome} value={nivel != null ? String(nivel) : '—'} />;
      })}
    </div>
  );

  return (
    <div className={'fp-info-grid ' + (col5 ? 'fp-info-grid--5' : 'fp-info-grid--4')}>
      {col1}
      {col2}
      {col3}
      {col4}
      {col5}
    </div>
  );
}


/* ============================== [11] FichaPersonagem ============================== */
/* TooltipFlipGuard — observa todos os .mn-tip / .fp-item-tip na página e
   corrige o transform quando o tooltip sairia para fora do topo da viewport.
   Quando top - altura < 12 px, muda para "abaixo" (seta em cima).
   Sem estado React — MutationObserver leve, sem re-renders. */
/* TooltipFlipGuard — quando o tooltip (.mn-tip/.fp-item-tip) aparece e seu topo
   ficaria acima da borda da viewport, adiciona data-tip-flip="below". O CSS então
   reposiciona o tooltip ABAIXO do ponto-âncora (sem mexer no top/left inline que o
   useTooltip define). Usa rAF + guarda para nunca entrar em loop de mutação. */
function TooltipFlipGuard() {
  React.useEffect(() => {
    const TIP_SEL = '.mn-tip, .fp-item-tip';
    const MARGIN = 8;
    let raf = 0;

    // Lê o gap padrão do token CSS (--tip-gap) para JS e CSS ficarem sincronizados.
    const GAP = (() => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--tip-gap')
        || getComputedStyle(document.querySelector('.menestrel-ui') || document.body).getPropertyValue('--tip-gap');
      const n = parseFloat(raw);
      return Number.isFinite(n) ? n : 28;
    })();

    function avaliar(el) {
      // mede a altura real e o top inline (fixed) para decidir o flip
      const top = parseFloat(el.style.top) || el.getBoundingClientRect().top;
      const h = el.offsetHeight;
      // tooltip normalmente sobe (translateY -100%): topo real ≈ top - h - gap
      const topoReal = top - h - GAP;
      const precisaBaixo = topoReal < MARGIN;
      const novo = precisaBaixo ? 'below' : 'above';
      if (el.dataset.tipFlip !== novo) el.dataset.tipFlip = novo;
    }

    function varrer() {
      document.querySelectorAll(TIP_SEL).forEach(avaliar);
    }

    const obs = new MutationObserver(() => {
      // agenda uma única avaliação por frame; só mexe em data-attr (não dispara loop de style)
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; varrer(); });
    });

    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    varrer();
    return () => { obs.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return null;
}

function FichaPersonagem({ ac, lang, currentUserId, pjAtivoId, onVoltar, onTrocar, onEditar, onExcluir, isMestre, navSlot }) {
  const en = lang === 'en';

  // Globals de fases anteriores — acesso via window para robustez,
  // pois nem todas são exportadas explicitamente por Object.assign/window.X.
  // Nota: habsByKey NÃO vem de global — é construído localmente a partir do
  // banco (tabela `habilidades`), pois HABILIDADES_BY_KEY nunca é exposto globalmente.
  const _slotLbls   = (typeof SLOT_LABELS           !== 'undefined' ? SLOT_LABELS           : null) || window.SLOT_LABELS           || {};
  const _bonusGA_fn = (typeof bonusGrupoArma         !== 'undefined' ? bonusGrupoArma         : null) || window.bonusGrupoArma         || (() => 0);
  const _totHab     = (typeof totalHabilidade        !== 'undefined' ? totalHabilidade        : null) || window.totalHabilidade        || (() => 0);
  // _totHabCond: mesma coisa que _totHab, só que também aplica o modificador
  // de grupo por Reputação (±25% Influência/Subterfúgio). Fallback pra
  // _totHab puro se a função nova ainda não tiver carregado (JS ignora o
  // 6º argumento extra que _totHab não usa).
  const _totHabCond = (typeof totalHabilidadeComCondicoes !== 'undefined' ? totalHabilidadeComCondicoes : null) || window.totalHabilidadeComCondicoes || null;
  const _corCondicao = (typeof corCondicao !== 'undefined' ? corCondicao : null) || window.corCondicao || (() => '#888');
  const _COND_LIMITE = (typeof COND_LIMITE !== 'undefined' ? COND_LIMITE : null) ?? window.COND_LIMITE ?? 50;
  const _nivelMag   = (typeof nivelMagiaEfetivo      !== 'undefined' ? nivelMagiaEfetivo      : null) || window.nivelMagiaEfetivo      || (() => 0);
  const _totTec     = (typeof totalTecnica           !== 'undefined' ? totalTecnica           : null) || window.totalTecnica           || (() => 0);
  const _usaMagia_fn = (typeof profissaoUsaMagia     !== 'undefined' ? profissaoUsaMagia     : null) || window.profissaoUsaMagia     || (() => true);
  const _podeMagia_fn = (typeof podeAcessarMagia      !== 'undefined' ? podeAcessarMagia      : null) || window.podeAcessarMagia      || (() => true);
  const _itemIcon   = (typeof invItemIcon            !== 'undefined' ? invItemIcon            : null) || window.invItemIcon            || (() => 'ti-box');
  const _ehContainer    = (typeof ehContainer    !== 'undefined' ? ehContainer    : null) || window.ehContainer    || (() => false);
  const _ContainerModal = (typeof ContainerModal !== 'undefined' ? ContainerModal : null) || window.ContainerModal || null;
  const _DetalhesItemModal = (typeof DetalhesItemModal !== 'undefined' ? DetalhesItemModal : null) || window.DetalhesItemModal || null;
  const _QuantidadeModal   = (typeof QuantidadeModal   !== 'undefined' ? QuantidadeModal   : null) || window.QuantidadeModal   || null;

  const [pj, setPj] = useState(null);
  const [todosPjs, setTodosPjs] = useState([]);
  const [catalogo, setCatalogo] = useState(null);
  const [magias, setMagias] = useState(null);
  const [tecnicas, setTecnicas] = useState(null);
  const [habilidades, setHabilidades] = useState(null);
  const [historiaPj, setHistoriaPj] = useState(null);       // { id, protagonista_ids } — história em que o PJ ativo está
  const [pjsDaHistoria, setPjsDaHistoria] = useState([]);   // [{id, nome, sobrenome, foto_url}] — outros protagonistas (alvos possíveis p/ magia)
  const [error, setError] = useState(null);
  const [eqErro, setEqErro] = useState(null);
  const [seletorOpen, setSeletorOpen] = useState(false);
  const [fpFull, setFpFull] = useState(false);
  const [fpTab, setFpTab] = useState('ficha');
  const [fotoUploading, setFotoUploading] = useState(false);
  const [fotoErro, setFotoErro] = useState(null);
  const [editBar, setEditBar] = useState(null); // { item, scope, anchor } — popover de edição de barra
  const [menuPecaId, setMenuPecaId] = useState(null);   // instanceId da peça equipada/vestida com menu de ação aberto (confirma desequipar/despir)
  const [contFichaId, setContFichaId] = useState(null); // instanceId do container cujo conteúdo está aberto na ficha
  const [detalheCintoId, setDetalheCintoId] = useState(null); // instanceId do item (dentro do cinto) com detalhes abertos
  const [magiaDetalheKey, setMagiaDetalheKey] = useState(null); // key da magia com modal de detalhes aberto (fora de combate)
  const [habilidadeDetalheKey, setHabilidadeDetalheKey] = useState(null); // key da habilidade com modal de detalhes aberto (fora de combate)
  const [rolagem, setRolagem] = useState(null); // { nome, total, dificuldade } -> overlay do dado d20 no centro da tela (RolagemD20Overlay)
  const [acaoQtd, setAcaoQtd] = useState(null);               // { tipo:'usar'|'destruir', instanceId, max } p/ QuantidadeModal
  const [capView, setCapView] = useState('atrib');  // 'atrib' | 'mag' | 'tec' | 'hab' — card lateral direito
  const [capPage, setCapPage] = useState(0);        // página atual na vista de cap (15 por página)
  const [tip, abrirTip, fecharTip, manterTip] = useTooltip(80);     // tooltip: itens equipados + capacidades
  const [tabTip, abrirTabTip, fecharTabTip, manterTabTip] = useTooltip(80); // tooltip: botões de navegação
  const [joiasOpen, setJoiasOpen] = useState(false); // card de 4 sub-slots de joia (abre ao clicar no slot único de Joias)
  const [joiasRect, setJoiasRect] = useState(null);  // DOMRect do botão de Joias — usada p/ posicionar o portal
  const joiasBtnRef = useRef(null);                  // ref do botão de Joias
  const [brincosOpen, setBrincosOpen] = useState(false); // card de 2 sub-slots de brinco
  const [brincosRect, setBrincosRect] = useState(null);
  const brincosBtnRef = useRef(null);
  const [roupasOpen, setRoupasOpen] = useState(false);  // card de 2 sub-slots de roupa
  const [roupasRect, setRoupasRect] = useState(null);
  const roupasBtnRef = useRef(null);
  const [cintoOpen, setCintoOpen] = useState(false);     // card de 3 sub-slots de cinto
  const [cintoRect, setCintoRect] = useState(null);
  const cintoBtnRef = useRef(null);
  const fileFotoRef = useRef(null);
  const estadoTimer = useRef(null);
  useEffect(() => {
    if (!fpFull) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setFpFull(false); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [fpFull]);

  // Fecha o tooltip quando a aba muda (o alvo pode ter desmontado).
  useEffect(() => { setEditBar(null); setMenuPecaId(null); setContFichaId(null); setDetalheCintoId(null); setAcaoQtd(null); setMagiaDetalheKey(null); setHabilidadeDetalheKey(null); setRolagem(null); fecharTip(); setCapPage(0); setJoiasOpen(false); setBrincosOpen(false); setCintoOpen(false); }, [fpTab, fpFull]);
  // Ao trocar de PJ: fecha todos os modais, overlays e tooltips — evita
  // backdrop de modal aberto no PJ anterior bloquear cliques no novo PJ.
  // useLayoutEffect (em vez de useEffect) roda antes do browser pintar o
  // próximo frame, evitando o flash do backdrop no PJ novo.
  // Também restaura o overflow do body caso algum modal o tenha travado.
  React.useLayoutEffect(() => {
    setEditBar(null); setMenuPecaId(null); setContFichaId(null);
    setDetalheCintoId(null); setAcaoQtd(null); setMagiaDetalheKey(null);
    setHabilidadeDetalheKey(null); setRolagem(null);
    setJoiasOpen(false); setBrincosOpen(false); setCintoOpen(false);
    manterTip(); fecharTip(); manterTabTip(); fecharTabTip();
    document.body.style.overflow = '';
  }, [pjAtivoId]);

  // Esc e travamento de scroll do menu de ação da peça já são responsabilidade
  // do ModalShell — não duplicar aqui (o ContainerModal trata o próprio Esc).

  // Tema claro "Página do Tomo": a ficha (Ficha/Inventário/Loja) agora é
  // sempre clara via CSS (ancorado em .fp-page), sem depender de classe no <body>.

  // Carregamento inicial — refaz quando troca de PJ ativo.
  useEffect(() => {
    if (!currentUserId || !pjAtivoId) return;
    let cancel = false;
    setError(null);
    // Reseta pj para null ao trocar de PJ: força o loading screen e garante
    // que os slots da ficha remontam com handlers frescos, evitando tooltips
    // presos de eventos de hover do PJ anterior.
    setPj(null);
    (async () => {
      const [pjRes, pjsRes, itRes, mgRes, tcRes, habRes] = await Promise.all([
        supabaseClient.from('personagens').select('*').eq('id', pjAtivoId).maybeSingle(),
        supabaseClient.from('personagens').select('id, nome, sobrenome, raca, profissao')
          .eq('user_id', currentUserId).order('created_at', { ascending: true }),
        supabaseClient.from('itens').select('*'),
        supabaseClient.from('magias').select('*'),
        supabaseClient.from('tecnicas').select('*'),
        supabaseClient.from('habilidades').select('*'),
      ]);
      if (cancel) return;
      if (pjRes.error) { setError(pjRes.error.message); return; }
      if (!pjRes.data) { setError(en ? 'Character not found.' : 'PJ não encontrado.'); return; }
      if (itRes.error) { setError(itRes.error.message); return; }
      if (mgRes.error) { setError(mgRes.error.message); return; }
      if (tcRes.error) { setError(tcRes.error.message); return; }
      if (habRes.error) { setError(habRes.error.message); return; }
      setPj(pjRes.data);
      setTodosPjs(pjsRes.data || []);
      setCatalogo(itRes.data || []);
      setMagias(mgRes.data || []);
      setTecnicas(tcRes.data || []);
      setHabilidades(habRes.data || []);

      // História em que o PJ ativo é protagonista (busca reversa: array
      // protagonista_ids contém o id do PJ). Não há historia_id direto em
      // personagens — o vínculo só existe nesse array. Usado para listar
      // os outros personagens da mesa como alvos possíveis de magia.
      const histRes = await supabaseClient.from('historias')
        .select('id, protagonista_ids, pausada').contains('protagonista_ids', [pjAtivoId]).maybeSingle();
      if (cancel) return;
      if (!histRes.error && histRes.data) {
        setHistoriaPj(histRes.data);
        const outrosIds = (histRes.data.protagonista_ids || []).filter((id) => id !== pjAtivoId);
        if (outrosIds.length > 0) {
          const colegasRes = await supabaseClient.from('personagens')
            .select('id, nome, sobrenome, foto_url').in('id', outrosIds);
          if (cancel) return;
          setPjsDaHistoria(colegasRes.error ? [] : (colegasRes.data || []));
        } else {
          setPjsDaHistoria([]);
        }
      } else {
        setHistoriaPj(null);
        setPjsDaHistoria([]);
      }
    })();
    return () => { cancel = true; };
  }, [currentUserId, pjAtivoId, en]);

  // Fecha dropdown clicando fora.
  useEffect(() => {
    if (!seletorOpen) return;
    const onClick = (e) => {
      if (!e.target.closest('.fp-select')) setSeletorOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [seletorOpen]);

  // Índices.
  const catalogoBySlug = useMemo(() => {
    const map = {};
    (catalogo || []).forEach((it) => { map[it.slug] = it; });
    return map;
  }, [catalogo]);
  const magiasByKey = useMemo(() => {
    const map = {};
    (magias || []).forEach((m) => { map[m.key] = m; });
    return map;
  }, [magias]);
  const tecnicasByKey = useMemo(() => {
    const map = {};
    (tecnicas || []).forEach((t) => { map[t.key] = t; });
    return map;
  }, [tecnicas]);
  const habsByKey = useMemo(() => {
    const map = {};
    (habilidades || []).forEach((h) => { map[h.key] = h; });
    return map;
  }, [habilidades]);

  // Catálogo completo de cada categoria (não só o que o PJ tem) — ordenado
  // com as ADQUIRIDAS primeiro, depois as não adquiridas, e dentro de cada
  // grupo por nome. Magias é filtrada pelo que a profissão/especialização
  // do PJ pode acessar (mesmo filtro do wizard de criação), não o catálogo
  // bruto inteiro — senão um Guerreiro veria toda magia de Mago.
  // IMPORTANTE: estes hooks ficam ANTES do early-return de loading logo
  // abaixo — `pj` ainda pode ser null aqui, daí o optional chaining. Mover
  // useMemo pra depois de um return condicional quebra a ordem de Hooks
  // entre o render de loading e o render com dados (React lança "Rendered
  // more hooks than during the previous render").
  const _porNome = (a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt');
  // Comparador "possui primeiro": recebe um Set/objeto de keys possuídas
  // e devolve uma função de sort que põe possuídas antes, com nome como
  // critério de desempate dentro de cada grupo.
  const _porPosseDepoisNome = (possuidas) => (a, b) => {
    const pa = possuidas.has(a.key) ? 0 : 1;
    const pb = possuidas.has(b.key) ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return _porNome(a, b);
  };

  const habKeysPossuidas = useMemo(
    () => new Set(Object.keys(pj?.habilidades || {})),
    [pj?.habilidades]
  );
  const magKeysPossuidas = useMemo(
    () => new Set(Object.keys(pj?.magias || {})),
    [pj?.magias]
  );
  const tecKeysPossuidas = useMemo(
    () => new Set(Object.keys(pj?.tecnicas || {})),
    [pj?.tecnicas]
  );

  const catalogoHab = useMemo(
    () => Object.values(habsByKey).sort(_porPosseDepoisNome(habKeysPossuidas)),
    [habsByKey, habKeysPossuidas]
  );
  const catalogoMag = useMemo(
    () => Object.values(magiasByKey)
      .filter((m) => _podeMagia_fn(m, pj?.profissao, pj?.especializacao || null))
      .sort(_porPosseDepoisNome(magKeysPossuidas)),
    [magiasByKey, pj?.profissao, pj?.especializacao, magKeysPossuidas]
  );
  const catalogoTec = useMemo(
    () => Object.values(tecnicasByKey).sort(_porPosseDepoisNome(tecKeysPossuidas)),
    [tecnicasByKey, tecKeysPossuidas]
  );

  // Loading / error.
  if (error) {
    return (
      <div className="admin-error">
        <div className="err-msg">{error}</div>
        <button className="btn-primary" onClick={onVoltar}>{en ? 'characters' : 'personagens'}</button>
      </div>
    );
  }
  if (!pj || catalogo === null || magias === null || tecnicas === null || habilidades === null) {
    return <div className="admin-loading"><span>{en ? 'Loading sheet…' : 'Abrindo a ficha…'}</span></div>;
  }

  // História pausada pelo Mestre → bloqueia o ACESSO à ficha, mas só pro
  // Jogador. isMestre=true SEMPRE passa reto, mesmo com a história pausada
  // (regra confirmada: pausar trava o lado do jogador, não o do Mestre).
  // Por isso nenhuma outra função deste arquivo (salvar estado, foto,
  // inventário, editar/excluir personagem) checa pausado — quem chegou até
  // elas já passou por este gate, então ou não está pausado, ou é o Mestre.
  const pausado = !!historiaPj?.pausada;
  if (pausado && !isMestre) {
    return (
      <div className="menestrel-ui fp-page fp-pause-page">
        <i className="ti ti-player-pause fp-pause-page-icon" aria-hidden="true" />
        <p className="fp-pause-page-title">
          {en ? 'Story paused' : 'História pausada'}
        </p>
        <p className="fp-pause-page-desc">
          {en
            ? 'The Game Master has put this story on pause. In the meantime, the character sheet will remain locked until the adventure resumes.'
            : 'O Mestre colocou esta história em pausa. Enquanto isso, a ficha permanecerá bloqueada até a aventura ser retomada.'}
        </p>
        <button className="btn-primary btn-sm" onClick={onVoltar}>{en ? 'Back to characters' : 'Voltar aos personagens'}</button>
      </div>
    );
  }

  // Derivações.
  // 3º argumento (condições atuais): cascateia o efeito de condição pra
  // atributos, EF/EH/RF/RM/Karma/Velocidade e totais de habilidade/magia/
  // técnica — todos derivam de `ficha.atributos`/`ficha.derivadas` abaixo.
  const ficha = calcularFicha(pj, catalogoBySlug, pj.estado_atual?.condicoes);
  const ataques = gerarAtaques(pj, catalogoBySlug, magiasByKey, ficha.atributos);
  // Tabela de armas exibe apenas itens físicos (origem === arma).
  // Magias com dano (ex.: 'Toque Gélido') aparecem na aba Magias — não aqui.
  const ataquesArmas = ataques.filter((a) => a.origem === 'arma');

  const slotsState = getSlotsState(pj.inventario?.itens || [], catalogoBySlug, pj.raca);

  // ── Máximos de vitalidade (cálculo adiantado) ──────────────
  // Precisos AQUI (antes de desequiparFicha/usarItemFicha abaixo) só pro
  // clamp de teto em aplicarEstadoEfeito. Os mesmos valores são recalculados
  // mais abaixo (_d/maxEF/maxEH/maxKA/arVal/arMax, bloco "Vitalidade") pra
  // uso no JSX — duplicação proposital e barata (mesma fonte: ficha.derivadas)
  // pra não reordenar todo o bloco de Defesa/JSX que depende da ordem atual.
  const _dPre = ficha.derivadas || {};
  const _absorcaoEquipadaPre = (pj.inventario?.itens || []).reduce((soma, it) => {
    const cat = (it && (it.slot || it.vestido)) ? catalogoBySlug[it.slug] : null;
    return soma + (cat ? (Number(cat.absorcao) || 0) : 0);
  }, 0);
  const maximosVitalidade = {
    ef: Number(_dPre.energiaFisica) || 0,
    eh: Number(_dPre.energiaHeroica) || 0,
    ka: Number(_dPre.karmamax) || 0,
    ar: Number(_dPre.armadura ?? _dPre.ar ?? _absorcaoEquipadaPre) || 0,
  };

  // ── Estado atual (persistência) ────────────────────────────
  // salvarEstadoAtual: grava personagens.estado_atual com debounce (mesmo
  // espírito do autosave de inventário). Usada tanto pela edição manual do
  // Mestre (aplicarEstado, mais abaixo) quanto pelos efeitos de item abaixo.
  const salvarEstadoAtual = (novoEstado) => {
    if (!pj) return;
    const id = pj.id;
    setPj((prev) => (prev ? { ...prev, estado_atual: novoEstado } : prev)); // otimista
    if (estadoTimer.current) clearTimeout(estadoTimer.current);
    estadoTimer.current = setTimeout(async () => {
      const { error: err } = await supabaseClient
        .from('personagens').update({ estado_atual: novoEstado }).eq('id', id);
      if (err) setEqErro(err.message);
    }, 400); // mesmo espírito do debounce de inventário
  };
  // aplicarEstadoEfeito — porta de gravação SEM o gate de isMestre: aplica
  // efeito_positivo/negativo de UM item (catálogo `cat`, multiplicado por
  // `quantidade`) sobre o estado_atual atual do PJ. Usada por usarItemFicha
  // (consumir) e desequiparFicha (reverter efeito de vestimenta retirada).
  const aplicarEstadoEfeito = (cat, quantidade) => {
    if (!pj) return;
    const novo = aplicarEfeitosItem(pj.estado_atual, cat, quantidade, maximosVitalidade);
    if (novo !== pj.estado_atual) salvarEstadoAtual(novo);
  };
  // alterarBonusArma — grava o bônus manual (0..9) de UMA arma na tabela de
  // ataques, em estado_atual.bonusArmas[slug]. Mesmo mecanismo de
  // persistência de vitalidade/condições (salvarEstadoAtual, debounce
  // 400ms). Gate de "só Mestre" é feito NA RENDERIZAÇÃO da célula (isMestre),
  // não aqui — mesmo padrão de aplicarEstado logo abaixo.
  // Chave = slug da arma, não instanceId: arma sem slug real não aparece em
  // `ataques` (gerarAtaques já filtra), então todo item aqui tem slug. Efeito
  // colateral aceito: duas cópias da MESMA arma equipadas (ex.: adaga na mão
  // esquerda e direita) compartilham um bônus só, por serem o mesmo slug —
  // se precisar de bônus por instância, teria que existir instanceId em `a`
  // (não confirmado, gerarAtaques mora em 12-batalha/batalha.jsx).
  const alterarBonusArma = (slug, novoValor) => {
    if (!pj || !slug) return;
    const v = Math.max(0, Math.min(9, Math.round(Number(novoValor) || 0)));
    const novo = {
      ...(pj.estado_atual || {}),
      bonusArmas: { ...(pj.estado_atual?.bonusArmas || {}), [slug]: v },
    };
    salvarEstadoAtual(novo);
  };

  const atributosFinais = ficha.atributos;
  const _calcBonus = (typeof calcBonusHabilidadesRacaReino !== 'undefined' ? calcBonusHabilidadesRacaReino : null) || window.calcBonusHabilidadesRacaReino || null;
  const bonusHabilidades = _calcBonus ? _calcBonus(pj.raca, pj.reino, habilidades) : {};

  const nomeCompleto = [pj.nome, pj.sobrenome].filter(Boolean).join(' ') || (en ? 'Unnamed' : 'Sem nome');
  const inicial = (pj.nome || nomeCompleto || '?').trim().charAt(0).toUpperCase();
  const fotoUrl = pj.foto_url || pj.foto || pj.avatar_url || null;
  // pausado (calculado acima) já barrou o Jogador antes de chegar aqui — se
  // a execução passou daquele ponto, ou não está pausado, ou é o Mestre
  // (que mantém acesso total mesmo com a história pausada). Por isso as
  // funções de salvar abaixo (equipar/usar/destruir/foto/estado) voltaram a
  // não checar pausado: checar de novo aqui bloquearia o próprio Mestre.
  const podeEditarFoto = !!currentUserId && pj.user_id === currentUserId;
  const handleFotoChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setFotoErro(null);
    if (!file.type.startsWith('image/')) { setFotoErro(en ? 'Choose an image file.' : 'Escolha um arquivo de imagem.'); return; }
    if (file.size > 1 * 1024 * 1024) { setFotoErro(en ? 'Image too large (max 1 MB).' : 'Imagem muito grande (máx. 1 MB).'); return; }
    setFotoUploading(true);
    try {
      const path = `${currentUserId}/${pj.id}`;
      const up = await supabaseClient.storage.from('avatares').upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' });
      if (up.error) throw up.error;
      const { data: pub } = supabaseClient.storage.from('avatares').getPublicUrl(path);
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      const upd = await supabaseClient.from('personagens').update({ foto_url: url }).eq('id', pj.id);
      if (upd.error) throw upd.error;
      setPj((prev) => ({ ...prev, foto_url: url }));
    } catch (err) {
      setFotoErro((en ? 'Upload failed: ' : 'Falha no upload: ') + (err.message || err));
    } finally {
      setFotoUploading(false);
    }
  };
  const titulo = tituloDoPersonagem(pj);
  const slotLabels = _slotLbls[lang] || _slotLbls.pt || {};
  const slotLbl = (k) => slotLabels[k] || (FP_LABELS_EXTRA[en ? 'en' : 'pt'] || {})[k] || k;

  const metaLinha = [
    pj.raca,
    pj.profissao,
    pj.deus,
  ].filter(Boolean).join(' · ');

  // ── Desequipar / Despir direto da ficha ───────────────────
  // Clique numa casa preenchida limpa as flags da peça (volta ao
  // inventário) e persiste o JSONB inteiro em personagens.inventario.
  // Dono do PJ OU Mestre — mesmo critério da aba Inventário, que passa
  // currentUserId={pj.user_id} pro InventarioList quando isMestre.
  const podeEditarInv = podeEditarFoto || !!isMestre;
  const salvarItensFicha = async (novosItens) => {
    const novoInv = { ...(pj.inventario || {}), itens: novosItens };
    const anterior = pj;
    setEqErro(null);
    setPj((prev) => ({ ...prev, inventario: novoInv }));
    const { error: err } = await supabaseClient
      .from('personagens').update({ inventario: novoInv }).eq('id', pj.id);
    if (err) { setPj(anterior); setEqErro(err.message); }
  };
  const desequiparFicha = (instanceId) => {
    if (!podeEditarInv) return;
    const it = (pj.inventario?.itens || []).find((x) => x.instanceId === instanceId);
    const cat = it ? catalogoBySlug[it.slug] : null;
    salvarItensFicha((pj.inventario?.itens || []).map((it) =>
      it.instanceId === instanceId
        ? { ...it, equipado: false, slot: null, vestido: false, vesteSlot: null }
        : it));
    // Reverte o efeito de uma vestimenta com efeito_positivo/negativo (ex.:
    // Reputação) ao desequipar pelo mapa corporal — mesma lógica do "despir"
    // da aba Inventário (07-inventario/inventario.jsx).
    if (it?.vestido && cat && (cat.efeito_positivo || cat.efeito_negativo)) {
      const catInvertido = { efeito_positivo: cat.efeito_negativo, efeito_negativo: cat.efeito_positivo };
      aplicarEstadoEfeito(catInvertido, 1);
    }
  };
  // Container vestido (ex.: cinto): retirar um item de dentro o devolve à mochila
  // (containerId: null). Sai do mapa da ficha por não estar mais equipado/vestido,
  // mas continua no inventário. Mesma semântica do "remover do container" da Fase 7.
  const removerDoContainerFicha = (instanceId) => {
    if (!podeEditarInv) return;
    salvarItensFicha((pj.inventario?.itens || []).map((it) =>
      it.instanceId === instanceId ? { ...it, containerId: null } : it));
  };
  // ── Ações locais sobre itens dentro do cinto (mesma lógica do InventarioList,
  //    porém persistindo via salvarItensFicha). Ações pesadas (transferir,
  //    pergaminho, equipar) ficam na aba Inventário — ver contexto="ficha".
  const usarItemFicha = (instanceId, quantidade = 1) => {
    if (!podeEditarInv) return;
    const it = (pj.inventario?.itens || []).find((x) => x.instanceId === instanceId);
    const cat = it ? catalogoBySlug[it.slug] : null;
    salvarItensFicha((pj.inventario?.itens || [])
      .map((it) => it.instanceId === instanceId ? { ...it, quantidade: it.quantidade - quantidade } : it)
      .filter((it) => it.quantidade > 0));
    if (cat && (cat.efeito_positivo || cat.efeito_negativo)) {
      aplicarEstadoEfeito(cat, quantidade);
    }
    // Notifica a mesa — mesmo padrão do InventarioList (07-inventario):
    // só "Usar" gera notificação. Texto combinado: "Victor usou Água".
    if (cat) {
      const nomePj = [pj?.nome, pj?.sobrenome].filter(Boolean).join(' ');
      if (nomePj) {
        const texto = en ? `${nomePj} used ${cat.nome}` : `${nomePj} usou ${cat.nome}.`;
        registrarEventoMesa('item', texto, { item: cat.nome, quantidade, instanceId });
      }
    }
  };
  const destruirItemFicha = (instanceId, quantidade) => {
    if (!podeEditarInv) return;
    const itens = pj.inventario?.itens || [];
    const it = itens.find((x) => x.instanceId === instanceId);
    if (!it) return;
    const qtdRemover = quantidade ?? it.quantidade;
    if (qtdRemover >= it.quantidade) {
      // remoção total: tira o item (e filhos, caso fosse container — não é, dentro do cinto)
      salvarItensFicha(itens.filter((x) => x.instanceId !== instanceId && x.containerId !== instanceId));
    } else {
      salvarItensFicha(itens.map((x) => x.instanceId === instanceId ? { ...x, quantidade: x.quantidade - qtdRemover } : x));
    }
  };
  // Pedem quantidade quando há mais de 1 em estoque (abre QuantidadeModal).
  const solicitarUsarFicha = (instanceId) => {
    const it = (pj.inventario?.itens || []).find((x) => x.instanceId === instanceId);
    if (!it) return;
    if (it.quantidade > 1) setAcaoQtd({ tipo: 'usar', instanceId, max: it.quantidade });
    else usarItemFicha(instanceId, 1);
  };
  const solicitarDestruirFicha = (instanceId) => {
    const it = (pj.inventario?.itens || []).find((x) => x.instanceId === instanceId);
    if (!it) return;
    if (it.quantidade > 1) setAcaoQtd({ tipo: 'destruir', instanceId, max: it.quantidade });
    else destruirItemFicha(instanceId, 1);
  };
  const executarAcaoQtd = (qtd) => {
    if (!acaoQtd) return;
    if (acaoQtd.tipo === 'usar')     usarItemFicha(acaoQtd.instanceId, qtd);
    if (acaoQtd.tipo === 'destruir') destruirItemFicha(acaoQtd.instanceId, qtd);
    setAcaoQtd(null);
  };
  // (Vestes removidas — só restam slots de defesa.)

  // ── Notificação na Central de Mensagens da Mesa ────────────────────
  // Dispara via RPC registrar_evento_mesa (SECURITY DEFINER) — grava em
  // mesa_log e o Realtime distribui pra CentralMensagens (shell.jsx) de
  // todos que estão na mesma história (Mestre + outros Jogadores).
  // Não bloqueia a UI: falha de rede aqui não deve travar o resultado já
  // mostrado no RolagemD20Overlay, só fica sem registrar o evento.
  const registrarEventoMesa = (tipo, texto, meta) => {
    if (!historiaPj || !historiaPj.id) return; // PJ fora de uma história — nada pra notificar
    supabaseClient
      .rpc('registrar_evento_mesa', {
        p_historia_id: historiaPj.id,
        p_tipo: tipo,
        p_texto: texto,
        p_meta: meta || {},
      })
      .then(({ data, error }) => {
        if (error || (data && data.ok === false)) {
          console.error('registrar_evento_mesa falhou:', error || data);
        }
      });
  };

  // Magia evocada (MagiaDetalhesModal -> onEvocar, botão "Evocar").
  // Monta o texto no padrão combinado: "Victor usou a magia Benção nível 5
  // em Galadar." Sem teste de qualidade aqui (diferente de habilidade) —
  // a magia, por ora, só notifica; aplicar o efeito mecânico no alvo é
  // trabalho futuro (curar/dano/buff), fora do escopo desta notificação.
  const aoEvocarMagia = ({ nivel, alvo }) => {
    if (!magiaDetalheKey) return;
    const mag = magiasByKey[magiaDetalheKey];
    if (!mag) return;
    const nomePj = [pj?.nome, pj?.sobrenome].filter(Boolean).join(' ');
    const nomeAlvo = alvo ? alvo.nome : null;
    const texto = en
      ? `${nomePj} cast the spell ${mag.nome} level ${nivel}${nomeAlvo ? ` on ${nomeAlvo}` : ''}.`
      : `${nomePj} usou a magia ${mag.nome} nível ${nivel}${nomeAlvo ? ` em ${nomeAlvo}` : ''}.`;
    registrarEventoMesa('magia', texto, {
      magia: mag.nome,
      nivel,
      alvo_id: alvo ? alvo.id : null,
      alvo_nome: nomeAlvo,
    });
  };

  // Resultado de um teste de habilidade (RolagemD20Overlay -> onResultado).
  // Monta o texto no padrão combinado: "Victor usou Alfabetização (Médio) e
  // obteve uma falha." — usa o nome do personagem (não da conta), pra ficar
  // no tom da mesa; quem de fato gravou (auth.uid()) é validado server-side.
  const aoResolverTesteHabilidade = (res) => {
    if (!rolagem) return;
    const nomePj = [pj?.nome, pj?.sobrenome].filter(Boolean).join(' ');
    const difEntry = (window.D20_DIF_LABEL || {})[rolagem.dificuldade];
    const difLbl = difEntry ? (en ? difEntry.en : difEntry.pt) : rolagem.dificuldade;
    const texto = en
      ? `${nomePj} used ${rolagem.nome} (${difLbl}) and got ${res.sucesso ? 'a success' : 'a failure'}.`
      : `${nomePj} usou ${rolagem.nome} (${difLbl}) e obteve uma ${res.sucesso ? 'sucesso' : 'falha'}.`;
    registrarEventoMesa('teste', texto, {
      habilidade: rolagem.nome,
      dificuldade: rolagem.dificuldade,
      qualidade: res.q,
      qualidade_label: en ? res.en : res.pt,
      d20: res.d20,
      sucesso: res.sucesso,
    });
  };

  // ── Estado atual (Vitalidade/Condições) ────────────────────
  // Valor CORRENTE e editável das barras, guardado em personagens.estado_atual
  // (JSONB). NÃO altera o máximo — esse vem derivado de calcularFicha. Chave
  // ausente cai no fallback do front (vitalidade → máximo; condição → 100).
  // Apenas o Mestre (isMestre === true) pode editar Vitalidade e Condições
  // MANUALMENTE (aplicarEstado/abrirEdicaoBarra abaixo). aplicarEstadoEfeito
  // é uma porta SEPARADA, sem esse gate: o Jogador também pode disparar
  // efeito_positivo/negativo de item (usar/vestir/despir), pois isso não é
  // edição manual da barra — é consequência mecânica de uma ação de item.
  const podeEditarEstado = !!isMestre;
  const aplicarEstado = (scope, key, val) => {
    if (!podeEditarEstado || !pj) return;
    const base = pj.estado_atual || {};
    const novo = {
      ...base,
      vitalidade: { ...(base.vitalidade || {}) },
      condicoes: { ...(base.condicoes || {}) },
    };
    if (scope === 'cond') novo.condicoes[key] = val;
    else novo.vitalidade[key] = val;
    salvarEstadoAtual(novo);
  };
  const abrirEdicaoBarra = (item, scope, anchor) => {
    if (!podeEditarEstado) return;
    if ((item.max ?? 0) === 0) return; // AR sem armadura / KA sem karma — nada a editar
    setEditBar({ item, scope, anchor });
  };

  // Armadura (AR): pool de absorção. Usa campo derivado se existir;
  // senão, soma a absorção das peças equipadas (escudos incluídos).
  const _d = ficha.derivadas || {};
  const absorcaoEquipada = (pj.inventario?.itens || []).reduce((soma, it) => {
    const cat = (it && (it.slot || it.vestido)) ? catalogoBySlug[it.slug] : null;
    return soma + (cat ? (Number(cat.absorcao) || 0) : 0);
  }, 0);
  const arVal = Number(_d.armadura ?? _d.ar ?? absorcaoEquipada) || 0;
  const arMax = Number(_d.armaduramax ?? _d.armadura_max ?? _d.armaduraMax ?? arVal) || arVal;
  const velocidade = _d.velocidade ?? _d.vb ?? null;

  // Estágio + Experiência — barra de progresso (mesmo visual de Vitalidade,
  // via FichaVitBars). Conferido em game-data.jsx: calcEstagio(xp) só devolve
  // o NÚMERO do estágio (f.n), sem xpAtual/xpProximo — e calcularFicha já
  // devolve `estagio` na RAIZ do retorno (ficha.estagio), não em `derivadas`.
  // Por isso a progressão dentro do estágio precisa ser calculada aqui, a
  // partir da faixa { min, max, n } correspondente em GAME_DATA.estagios
  // (mesma tabela que calcEstagio usa internamente).
  const _GAME_DATA = (typeof GAME_DATA !== 'undefined' ? GAME_DATA : null) || window.GAME_DATA || null;
  const estagioNum = ficha.estagio ?? 1;
  const xpTotal = Number(pj.experiencia) || 0;
  const _estagiosTbl = _GAME_DATA?.estagios || [];
  const faixaEstagio = _estagiosTbl.find((e) => xpTotal >= e.min && xpTotal <= e.max)
    || _estagiosTbl[_estagiosTbl.length - 1] || { min: 0, max: 1, n: estagioNum };
  const estagioSpan = Math.max(1, faixaEstagio.max - faixaEstagio.min); // evita divisão por zero
  const estagioXpAtual = Math.max(0, xpTotal - faixaEstagio.min);
  const estagioPct = Math.max(0, Math.min(1, estagioXpAtual / estagioSpan));
  const estagioFaltaPct = Math.round((1 - estagioPct) * 100);
  const estagioBars = [{
    key: 'estagio',
    label: (en ? `Stage ${estagioNum}` : `Estágio ${estagioNum}`),
    val: estagioXpAtual,
    max: estagioSpan,
    tip: (en ? `Stage ${estagioNum} — ${estagioFaltaPct}% left` : `${estagioFaltaPct}% para o estágio ${estagioNum+1}`),
    color: '#C9A44E',
    icon: 'ti-star',
  }];
  const elEstagio = <FichaVitBars bars={estagioBars} scope="estagio" en={en} onHover={abrirTip} onHoverEnd={fecharTip} />;

  // Estado atual salvo (valor corrente das barras) — separado do máximo derivado.
  const _est   = pj.estado_atual || {};
  const _vitAt = _est.vitalidade || {};
  const _condAt = _est.condicoes || {};
  const _clampVal = (v, mx, mn = 0) => {
    const n = Math.round(Number(v));
    return Math.max(mn, Math.min(mx, Number.isFinite(n) ? n : mx));
  };

  // Peso/carga do PJ (% da capacidade). Reusa calcCarga exposto pelo inventário
  // via window. Fallback: 0% se indisponível (não quebra a ficha).
  const _calcCarga_fn = (typeof calcCarga !== 'undefined' ? calcCarga : null) || window.calcCarga || null;
  const _carga = (() => {
    if (!_calcCarga_fn) return { peso: 0, capacidade: 0, pct: 0, over: false };
    try {
      const c = _calcCarga_fn(pj.inventario?.itens || [], catalogoBySlug, pj.forca_base, pj.fisico_base);
      return (c && Number.isFinite(c.pct)) ? c : { peso: 0, capacidade: 0, pct: 0, over: false };
    } catch { return { peso: 0, capacidade: 0, pct: 0, over: false }; }
  })();
  const _cargaPct = _carga.pct;

  // Barras de vitalidade. MÁXIMO derivado (calcularFicha); ATUAL editável
  // em estado_atual.vitalidade. Sem valor salvo → começa cheio (atual = máximo).
  // Ordem casa com a cascata de dano em batalha: EH → AR → EF, + Karma.
  const maxEF = Number(_d.energiaFisica) || 0;
  const maxEH = Number(_d.energiaHeroica) || 0;
  const maxKA = Number(_d.karmamax) || 0;
  const vitBars = [
    { key: 'ef', label: en ? 'Physical Energy' : 'Energia Física', val: _clampVal(_vitAt.ef ?? maxEF, maxEF), max: maxEF, icon: 'ti-heart' },
    { key: 'eh', label: en ? 'Heroic Energy' : 'Energia Heroica', val: _clampVal(_vitAt.eh ?? maxEH, maxEH), max: maxEH, icon: 'ti-heart' },
    { key: 'ar', label: en ? 'Armor' : 'Armadura', val: _clampVal(_vitAt.ar ?? arVal, arMax), max: arMax, icon: 'ti-shield' },
    { key: 'ka', label: en ? 'Karma' : 'Karma', val: _clampVal(_vitAt.ka ?? maxKA, maxKA), max: maxKA, icon: 'ti-sparkle-highlight' },
  ];

  // Velocidade/Resistência Física/Resistência Mágica como barras (a pedido
  // do usuário — antes eram fp2Stat, linha rótulo:valor simples). Defesa
  // esteve aqui também mas foi retirada a pedido do usuário (não precisa
  // aparecer na ficha). SEM onEdit: ao contrário de vitBars/condBars, estes
  // 3 são estatística DERIVADA pura (_d.rf/_d.rm, calculada em
  // calcularFicha) — não existe estado_atual pra eles, então não há o que
  // persistir num clique.
  // RF/RM: faixa -7 a 20 (mesmo piso -7 da coluna de Ação/Resistência do
  // motor de batalha — ver 12-batalha/batalha.jsx — mas teto próprio, não
  // confundir com a faixa -7..50 de lá). Velocidade: 0 a 40.
  const combatBars = [
    // Velocidade removida: barra de Peso (carga) ocupa seu lugar (decisão de produto).
    // val/max = peso atual e capacidade reais (kg); pct = val/max = _cargaPct/100.
    // tip: linha "X / Y kg" + rótulo de estado (Pesado / Sobrecarregado) — mesmo
    // conteúdo que o inventário exibia no tooltip da barra de carga.
    (() => {
      const pesoVal = Math.round(_carga.peso * 10) / 10;
      const capVal  = Math.round(_carga.capacidade * 10) / 10;
      const estadoPeso = _carga.over
        ? (en ? 'Heavy' : 'Pesado!')
        : _cargaPct > 75
          ? (en ? 'Overloaded!' : 'Sobrecarregado!')
          : null;
      const tipPeso = (en ? `${pesoVal} / ${capVal}` : `${pesoVal} / ${capVal}`)
        + (estadoPeso ? ` — ${estadoPeso}` : '');
      // Peso: lógica invertida — peso alto é ruim (vermelho), baixo é bom (verde).
      // Passa valor negativo para _corCondicao: quanto mais pesado, mais negativo → vermelho.
      const pesoSinal = capVal > 0 ? -(pesoVal / capVal) * 50 : 0; // mapeia 0..100% → 0..-50
      return { key: 'peso', label: en ? 'Weight' : 'Peso', val: pesoVal, max: capVal || 1, color: _corCondicao(pesoSinal), icon: 'ti-weight', tip: tipPeso };
    })(),
    { key: 'rf', label: en ? 'Physical Resistance' : 'Resistência Física', val: _clampVal(_d.rf ?? _d.resistenciaFisica ?? 0, 20, -7), max: 20, min: -7, icon: 'ti-circuit-resistor', color: _corCondicao(_clampVal(_d.rf ?? _d.resistenciaFisica ?? 0, 20, -7)) },
    { key: 'rm', label: en ? 'Magic Resistance' : 'Resistência Mágica', val: _clampVal(_d.rm ?? _d.resistenciaMagica ?? 0, 20, -7), max: 20, min: -7, icon: 'ti-sparkles', color: _corCondicao(_clampVal(_d.rm ?? _d.resistenciaMagica ?? 0, 20, -7)) },
  ];
  const elCombate = <FichaVitBars bars={combatBars} scope="combate" en={en} onHover={abrirTip} onHoverEnd={fecharTip} />;

  // Condições (-COND_LIMITE..+COND_LIMITE, 0 = neutro). ATUAL editável em
  // estado_atual.condicoes; sem valor salvo → 0 (neutro, era 100/"cheio").
  const condBars = [
    { key: 'vitalidade', label: en ? 'Health' : 'Saúde', val: _clampVal(_condAt.vitalidade ?? 0, _COND_LIMITE, -_COND_LIMITE), max: _COND_LIMITE, min: -_COND_LIMITE, icon: 'ti-heart' },
    { key: 'animo', label: en ? 'Sleep' : 'Sono', val: _clampVal(_condAt.animo ?? 0, _COND_LIMITE, -_COND_LIMITE), max: _COND_LIMITE, min: -_COND_LIMITE, icon: 'ti-bed' },
    { key: 'hidratacao', label: en ? 'Hydration' : 'Hidratação', val: _clampVal(_condAt.hidratacao ?? 0, _COND_LIMITE, -_COND_LIMITE), max: _COND_LIMITE, min: -_COND_LIMITE, icon: 'ti-droplet' },
    { key: 'nutricao', label: en ? 'Feeding' : 'Alimentação', val: _clampVal(_condAt.nutricao ?? 0, _COND_LIMITE, -_COND_LIMITE), max: _COND_LIMITE, min: -_COND_LIMITE, icon: 'ti-meat' },
    { key: 'termorregulacao', label: en ? 'Temperature' : 'Temperatura', val: _clampVal(_condAt.termorregulacao ?? 0, _COND_LIMITE, -_COND_LIMITE), max: _COND_LIMITE, min: -_COND_LIMITE, icon: 'ti-temperature' },
    { key: 'euforia', label: en ? 'Sobriety' : 'Sobriedade', val: _clampVal(_condAt.euforia ?? 0, _COND_LIMITE, -_COND_LIMITE), max: _COND_LIMITE, min: -_COND_LIMITE, icon: 'ti-glass-full' },
    { key: 'sanidade', label: en ? 'Sanity' : 'Sanidade', val: _clampVal(_condAt.sanidade ?? 0, _COND_LIMITE, -_COND_LIMITE), max: _COND_LIMITE, min: -_COND_LIMITE, icon: 'ti-mood-neutral' },
    { key: 'reputacao', label: en ? 'Reputation' : 'Reputação', val: _clampVal(_condAt.reputacao ?? 0, _COND_LIMITE, -_COND_LIMITE), max: _COND_LIMITE, min: -_COND_LIMITE, icon: 'ti-users' },
  ];

  // ── Ocupação das casas do mapa corporal ────────────────────
  const itensPj = pj.inventario?.itens || [];
  const byInstance = {};
  for (const it of itensPj) byInstance[it.instanceId] = it;

  // Defesa: ocupação lida DIRETO dos itens — equipados (it.slot) e
  // também vestidos legados (it.vesteSlot), pois agora tudo aparece no
  // mapa de defesa (a seção Vestes saiu). Regiões pareadas (orelha/
  // ombros/braços/mãos/pés têm 2 casas) preenchem casa a casa por `occ`.
  // Independe do getSlotsState — mesmo critério da faixa de dedos.
  // Nota: lê it.slot independente de it.equipado, para surfaçar dados
  // inconsistentes (slot preenchido mas equipado:false) e permitir desequipar.
  const regiaoDe = (it) => it.slot || (it.vestido ? it.vesteSlot : null);
  const equipPorRegiao = (() => {
    const m = {};
    for (const it of itensPj) {
      const reg = regiaoDe(it);
      if (!reg) continue;
      (m[reg] = m[reg] || []).push(it);
    }
    return m;
  })();
  // brinco/colar sao os valores gravados no banco; orelha/pescoco sao as chaves do layout
  const _alias = { orelha: 'brinco', pescoco: 'colar' };
  // Arma de duas mãos equipada numa das mãos (mao_d/mao_e) OCUPA AMBAS.
  // A exigência de "2 mãos" vem do catálogo (getMaosRequeridas, varia por raça),
  // não de um slot literal 'maos'. Detecta a 1ª arma equipada cuja exigência
  // p/ a raça do PJ é 2 — ela é espelhada nas duas casas (card cheio idêntico)
  // e, com isso, a outra mão fica ocupada (sem espaço p/ escudo/2ª arma).
  const armaDuasMaos = (() => {
    for (const it of itensPj) {
      const reg = regiaoDe(it);
      if (reg !== 'mao_d' && reg !== 'mao_e') continue;
      const cat = catalogoBySlug[it.slug];
      if (cat && getMaosRequeridas(cat, pj.raca) === 2) return it;
    }
    return null;
  })();
  const ocupanteDefesa = (regiao, occ) => {
    if (regiao === 'mao_e' || regiao === 'mao_d') {
      // espelha: slot literal 'maos' (legado) OU arma de 2 mãos numa das mãos
      const duasMaos = (equipPorRegiao.maos || [])[0] || armaDuasMaos;
      if (duasMaos) return duasMaos;
      return (equipPorRegiao[regiao] || [])[0] || null;
    }
    return (equipPorRegiao[regiao] || equipPorRegiao[_alias[regiao]] || [])[occ] || null;
  };

  // Dedos/Joias (até 4): lê direto dos itens equipados/vestidos cujo slot é de joia.
  // Aceita as convenções: 'joia' (VESTE_SLOTS do inventário), 'dedos', 'dedo',
  // 'dedo_1'/'dedo_2' (numeradas) e 'dedo1'/'dedo2'.
  const ehSlotJoia = (r) => r && (/^dedo/i.test(r) || r === 'joia');
  const dedosItens = itensPj.filter((it) => { const r = regiaoDe(it); return ehSlotJoia(r); });
  const ocupanteDedo = (idx) => {
    const exato = dedosItens.find((it) => { const r = regiaoDe(it); return r === 'dedo_' + (idx + 1) || r === 'dedo' + (idx + 1); });
    if (exato) return exato;
    const genericos = dedosItens.filter((it) => { const r = regiaoDe(it); return r === 'dedos' || r === 'dedo' || r === 'joia'; });
    return genericos[idx] || null;
  };

  // Brincos/Orelhas (até 2 — um por orelha). Aceita 'orelha', 'brinco' e variantes
  // numeradas 'orelha_1'/'brinco_1' etc. vindas do banco ou do VESTE_SLOTS.
  const ehSlotOrelha = (r) => r && (r === 'orelha' || r === 'brinco' || /^orelha[_\d]/.test(r) || /^brinco[_\d]/.test(r));
  const brincosItens = itensPj.filter((it) => { const r = regiaoDe(it); return ehSlotOrelha(r); });
  const ocupanteOrelha = (idx) => {
    const exato = brincosItens.find((it) => {
      const r = regiaoDe(it);
      return r === 'orelha_' + (idx + 1) || r === 'brinco_' + (idx + 1)
          || r === 'orelha' + (idx + 1)   || r === 'brinco' + (idx + 1);
    });
    if (exato) return exato;
    // Itens com slot genérico 'orelha'/'brinco' são atribuídos em ordem de índice.
    const genericos = brincosItens.filter((it) => { const r = regiaoDe(it); return r === 'orelha' || r === 'brinco'; });
    return genericos[idx] || null;
  };

  // Cinto/Cintura (até 3 — ex.: cinto + bolsa lateral + adorno). Aceita 'cintura',
  // 'cinto' e variantes numeradas.
  const ehSlotCintura = (r) => r && (r === 'cintura' || r === 'cinto' || /^cintura[_\d]/.test(r) || /^cinto[_\d]/.test(r));
  const cintoItens = itensPj.filter((it) => { const r = regiaoDe(it); return ehSlotCintura(r); });
  const ocupanteCintura = (idx) => {
    const exato = cintoItens.find((it) => {
      const r = regiaoDe(it);
      return r === 'cintura_' + (idx + 1) || r === 'cinto_' + (idx + 1)
          || r === 'cintura' + (idx + 1)   || r === 'cinto' + (idx + 1);
    });
    if (exato) return exato;
    const genericos = cintoItens.filter((it) => { const r = regiaoDe(it); return r === 'cintura' || r === 'cinto'; });
    return genericos[idx] || null;
  };

  // Roupas (2 compartimentos — abaixo da capa, acima da ombreira). Aceita
  // 'roupa', 'veste' e variantes numeradas 'roupa_1'/'roupa_2'.
  const ehSlotRoupa = (r) => r && (r === 'roupa' || r === 'veste' || /^roupa[_\d]/.test(r));
  const roupasItens = itensPj.filter((it) => { const r = regiaoDe(it); return ehSlotRoupa(r); });
  const ocupanteRoupa = (idx) => {
    const exato = roupasItens.find((it) => {
      const r = regiaoDe(it);
      return r === 'roupa_' + (idx + 1) || r === 'roupa' + (idx + 1);
    });
    if (exato) return exato;
    const genericos = roupasItens.filter((it) => { const r = regiaoDe(it); return r === 'roupa' || r === 'veste'; });
    return genericos[idx] || null;
  };

  const fpSlotTile = (regiao, it, key) => {
    const cat = it ? catalogoBySlug[it.slug] : null;
    // filled = há item no slot. Mesmo sem cat (slug ausente do catálogo / dado legado),
    // o slot é considerado preenchido para não esconder itens equipados.
    const filled = !!it;
    const catOk = filled && !!cat;
    const abs = catOk ? (Number(cat.absorcao) || 0) : 0;
    const isCont = catOk && _ehContainer(cat);   // container vestido (cinto/bolsa) → menu Ver/Despir
    const lbl = slotLbl(regiao);
    const nomeLbl = catOk ? cat.nome : (it ? (it.slug || '?') : lbl);
    // Prioridade do ícone da casa: ícone próprio do item (catalogo.icone, via
    // _itemIcon) > glifo genérico da região (FP_REGION_ICON) > fallback.
    // (A arte de fundo do item/região, quando existe, some o <i> — ver `bg` abaixo.)
    const iconClass = (catOk ? _itemIcon(cat) : null) || FP_REGION_ICON[regiao] || 'ti-shield-off';
    const itemBg = catOk ? FP_ITEM_BG[(cat.nome || '').trim().toLowerCase()] : null;
    // Placeholder da região: aparece mesmo com a casa vazia (foto esmaecida)
    // e serve de fallback pra item equipado sem arte própria.
    const regionBg = FP_REGION_BG[regiao] || null;
    const bg = itemBg || regionBg;
    const ghost = !filled && !!bg;   // casa vazia exibindo a arte do tipo de peça
    // Hover/foco mostra o tooltip de detalhes (Descrição/Absorção/Dano).
    const tipContent = filled && cat ? {
      title: cat.nome || it.slug,
      desc: [cat.descricao, cat.efeito ? `${en ? 'Effect' : 'Efeito'}: ${cat.efeito}` : null].filter(Boolean).join(' '),
      stats: [
        cat.dano != null ? { label: en ? 'Damage' : 'Dano', value: cat.dano } : null,
        Number(cat.absorcao) > 0 ? { label: en ? 'Absorb' : 'Absorção', value: cat.absorcao } : null,
      ].filter(Boolean),
    } : null;
    return (
      <button
        key={key}
        type="button"
        className={'inv-slot' + (filled ? ' filled' : ' empty')
          + (filled && bg ? ' has-img' : '')
          + (ghost ? ' bg-ghost' : '')}
        style={{
          ...fpItemBgStyle(bg, ghost),
          ...(!filled || !podeEditarInv ? { cursor: 'default' } : {}),
        }}
        onClick={filled && podeEditarInv ? () => { fecharTip(); setMenuPecaId(it.instanceId); setJoiasOpen(false); setBrincosOpen(false); setCintoOpen(false); } : undefined}
        onMouseEnter={filled && tipContent ? (e) => abrirTip(e, tipContent) : undefined}
        onMouseLeave={filled && tipContent ? fecharTip : undefined}
        onFocus={filled && tipContent ? (e) => abrirTip(e, tipContent) : undefined}
        onBlur={filled && tipContent ? fecharTip : undefined}>
        {!bg && (
        <span className="inv-slot-ic">
          <i className={'ti ' + iconClass} aria-hidden="true" />
        </span>
        )}
        <span className="inv-slot-meta">
          {filled
            ? (!bg && <span className="inv-slot-item">{nomeLbl}</span>)
            : <span className="inv-slot-lbl">{lbl}</span>}
        </span>
        {filled && podeEditarInv && (
          <span className="fp-slot-x" aria-hidden="true"><i className={'ti ' + (isCont ? 'ti-moneybag' : (it.vestido ? 'ti-shirt-off' : 'ti-shield-off'))} /></span>
        )}
      </button>
    );
  };

  const fpBodyGrid = () => {
    const seen = {};
    return (
      <div className="fp-body-grid">
        {FP_BODY_ROWS.map((row, ri) => {
          if (row[0] === '__dedos__') {
            return (
              <div key="dedos" className="fp-finger-strip">
                {Array.from({ length: FP_DEDOS_COUNT }).map((_, idx) =>
                  fpSlotTile('dedos', ocupanteDedo(idx), 'dedo-' + idx))}
              </div>
            );
          }
          return row.map((regiao, ci) => {
            const occ = (seen[regiao] = (seen[regiao] ?? -1) + 1);
            return fpSlotTile(regiao, ocupanteDefesa(regiao, occ), 'def-' + regiao + '-' + ri + '-' + ci);
          });
        })}
      </div>
    );
  };

  // Presença de conteúdo — Armas só aparece com ataque possível (PDF
  // "alterar": não mostrar setor vazio). Habilidades/Magias/Técnicas agora
  // mostram o CATÁLOGO inteiro (adquirido ou não), então "tem conteúdo"
  // passa a significar "existe catálogo pra mostrar" — Magias continua
  // condicionada à profissão usar magia (PJ sem magia não tem o que mostrar
  // ali, nem "não aprendido" faz sentido pra ele).
  const temArmas = ataquesArmas.length > 0;
  const temHab = catalogoHab.length > 0;
  const temMag = catalogoMag.length > 0;
  const temTec = catalogoTec.length > 0;
  const temTriad = temHab || temMag || temTec;
  // Quantos cartões da tríade vão aparecer (1, 2 ou 3) — usado para o
  // grid se reequilibrar e preencher a linha toda quando algum setor
  // (ex.: Magias, em PJ sem magia) não tiver conteúdo.
  const triCount = [temHab, temMag, temTec].filter(Boolean).length;

  const elVit = <FichaVitBars bars={vitBars} scope="vit" onEdit={podeEditarEstado ? abrirEdicaoBarra : undefined} en={en} onHover={abrirTip} onHoverEnd={fecharTip} />;

  // Condições com o MESMO visual das barras de vitalidade (FichaVitBars).
  // Cor por SINAL (negativo vermelho / neutro / positivo verde — corCondicao,
  // helpers.jsx). Lista única (não mais 2 colunas pares/ímpares) — o layout
  // empilha de qualquer forma na maioria dos breakpoints, e a divisão em 2
  // <FichaVitBars> quebrava a divisória entre o último item de uma coluna e
  // o primeiro da outra (Sanidade↔Sono).
  const condVitBars = condBars
    .map((c) => ({ ...c, color: _corCondicao(c.val) }));
  const elCond = (
    <div className="fp-cond-vit">
      <FichaVitBars bars={condVitBars} scope="cond" onEdit={podeEditarEstado ? abrirEdicaoBarra : undefined} en={en} onHover={abrirTip} onHoverEnd={fecharTip} />
    </div>
  );

  const elDefesa = fpBodyGrid();



  const elArmas = (
    <table className="fp-atk">
      <thead>
        <tr>
          <th className="c-nome">{en ? 'Weapon' : 'Arma'}</th>
          <th className="c-dano fp-center-col">{en ? 'Bonus' : 'Bônus'}</th>
          <th className="c-range fp-center-col">{en ? 'Range' : 'Alcance'}</th>
          <th className="c-dano fp-center-col">Total</th>
          <th className="c-dano fp-center-col">L</th>
          <th className="c-dano fp-center-col">M</th>
          <th className="c-dano fp-center-col">P</th>
          <th className="c-dano fp-center-col">25%</th>
          <th className="c-dano fp-center-col">50%</th>
          <th className="c-dano fp-center-col">75%</th>
          <th className="c-dano fp-center-col">100%</th>
        </tr>
      </thead>
      <tbody>
        {ataquesArmas.length === 0 ? (
          <tr><td colSpan={11} className="fp-empty"></td></tr>
        ) : ataquesArmas.map((a, i) => {
          const armaCat = a.slug ? catalogoBySlug[a.slug] : null;
          const grupoSigla = armaCat?.grupo_armas || null;
          const bonusGA = _bonusGA_fn(grupoSigla, pj.grupos_armas || {});
          // L/M/P somam o bônus de grupo de arma (treino, já existia) E a
          // Agilidade do personagem. 100% soma Força + o Bônus manual do
          // Mestre (0..9) por cima do dano base da arma (a.dano) — isso dá
          // dano100. 25/50/75% são FRAÇÃO DE dano100 (confirmado com o
          // usuário): atualizam junto quando Força, Bônus ou o dano base
          // mudam, não são mais fração do dano base puro.
          const forca = atributosFinais?.forca ?? 0;
          const bonusArma = Math.max(0, Math.min(9, Number(pj.estado_atual?.bonusArmas?.[a.slug]) || 0));
          const dano100 = a.dano + forca + bonusArma;
          const ap = (v) => (v != null ? v + bonusGA : null);
          const tip = (col, base) => {
            if (base == null) return undefined;
            const partes = [];
            if (bonusGA) partes.push(`${bonusGA >= 0 ? '+' : '-'} ${Math.abs(bonusGA)} (${grupoSigla})`);
            return partes.length ? `${col}: ${base} ${partes.join(' ')}` : undefined;
          };
          const cell = (base, col) => {
            const ef = ap(base);
            if (ef == null) return '—';
            if (base != null && ef !== base) return <span style={{ color: 'var(--fp-gold)' }}>{ef}</span>;
            return ef;
          };
          // Total = média dos valores de L/M/P JÁ ajustados (grupo +
          // agilidade) que existirem — categoria nula (arma sem essa
          // forma de dano) sai da conta em vez de zerar o resultado.
          // Arredondamento SEMPRE pra cima (Math.ceil), regra confirmada
          // pelo usuário — aplicada aqui e nos tiers 25/50/75% abaixo.
          const partesTotal = [ap(a.dano_l), ap(a.dano_m), ap(a.dano_p)].filter((v) => v != null);
          const total = partesTotal.length
            ? Math.ceil(partesTotal.reduce((s, v) => s + v, 0) / partesTotal.length)
            : null;
          return (
            <tr key={i}>
              <td className="c-nome">{a.nome}</td>
              <td className="c-dano fp-center-col">
                {isMestre ? (
                  <div className="fp-bonus-stepper">
                    <button type="button" className="fp-step-btn--sm" disabled={bonusArma <= 0}
                      onMouseDown={(e) => e.preventDefault()} onClick={() => alterarBonusArma(a.slug, bonusArma - 1)} aria-label="-">
                      <i className="ti ti-minus" aria-hidden="true" />
                    </button>
                    <span className="fp-bonus-val">{bonusArma}</span>
                    <button type="button" className="fp-step-btn--sm" disabled={bonusArma >= 9}
                      onMouseDown={(e) => e.preventDefault()} onClick={() => alterarBonusArma(a.slug, bonusArma + 1)} aria-label="+">
                      <i className="ti ti-plus" aria-hidden="true" />
                    </button>
                  </div>
                ) : bonusArma}
              </td>
              <td className="c-range fp-center-col">{a.alcance ? `${a.alcance}m` : '—'}</td>
              <td className="c-dano fp-center-col">{total != null ? total : '—'}</td>
              <td className="c-dano fp-center-col" title={tip('L', a.dano_l)}>{cell(a.dano_l, 'L')}</td>
              <td className="c-dano fp-center-col" title={tip('M', a.dano_m)}>{cell(a.dano_m, 'M')}</td>
              <td className="c-dano fp-center-col" title={tip('P', a.dano_p)}>{cell(a.dano_p, 'P')}</td>
              <td className="c-dano fp-center-col">{Math.ceil(dano100 * 1 / 4)}</td>
              <td className="c-dano fp-center-col">{Math.ceil(dano100 * 2 / 4)}</td>
              <td className="c-dano fp-center-col">{Math.ceil(dano100 * 3 / 4)}</td>
              <td className="c-dano fp-center-col">{dano100}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  // Hover do nome de Habilidade/Magia/Técnica (aba Capacidades): mesmo padrão
  // Tooltip de hover das capacidades (Habilidades/Magias/Técnicas): reusa o
  // mesmo useTooltip do topo — só muda o content passado.
  const abrirTipCap = (nome, descricao) => (e) => {
    if (!descricao) return;
    abrirTip(e, { title: nome, desc: descricao });
  };

  const elHab = catalogoHab.length === 0 ? (
    <div className="fp-empty">—</div>
  ) : (
    <>
      {catalogoHab.map((h) => {
        const possui = Object.prototype.hasOwnProperty.call(pj.habilidades || {}, h.key);
        const total = _totHab(h.key, pj.habilidades || {}, atributosFinais, bonusHabilidades, habsByKey);
        return (
          <div key={h.key} className={'fp2-statrow' + (possui ? '' : ' fp2-statrow--locked')}>
            <span
              className="fp2-statrow-l fp2-statrow-l--hover"
              tabIndex={0}
              onMouseEnter={abrirTipCap(h.nome, h.descricao)}
              onMouseLeave={fecharTip}
              onFocus={abrirTipCap(h.nome, h.descricao)}
              onBlur={fecharTip}
            >{h.nome}</span>
            <span className="fp2-statrow-v">{total >= 0 ? `${total}` : total}</span>
          </div>
        );
      })}
    </>
  );

  const elMag = catalogoMag.length === 0 ? (
    <div className="fp-empty">—</div>
  ) : (
    <>
      {catalogoMag.map((m) => {
        const passos = (pj.magias || {})[m.key];
        const possui = passos != null;
        return (
          <div key={m.key} className={'fp2-statrow' + (possui ? '' : ' fp2-statrow--locked')}>
            <span
              className="fp2-statrow-l fp2-statrow-l--hover"
              tabIndex={0}
              onMouseEnter={abrirTipCap(m.nome, m.descricao)}
              onMouseLeave={fecharTip}
              onFocus={abrirTipCap(m.nome, m.descricao)}
              onBlur={fecharTip}
            >{m.nome}</span>
            <span className="fp2-statrow-v">{possui ? _nivelMag(passos) : '—'}</span>
          </div>
        );
      })}
    </>
  );

  const elTec = catalogoTec.length === 0 ? (
    <div className="fp-empty">—</div>
  ) : (
    <>
      {catalogoTec.map((t) => {
        const possui = Object.prototype.hasOwnProperty.call(pj.tecnicas || {}, t.key);
        const tot = _totTec(t, pj.tecnicas || {}, atributosFinais);
        return (
          <div key={t.key} className={'fp2-statrow' + (possui ? '' : ' fp2-statrow--locked')}>
            <span
              className="fp2-statrow-l fp2-statrow-l--hover"
              tabIndex={0}
              onMouseEnter={abrirTipCap(t.nome, t.descricao)}
              onMouseLeave={fecharTip}
              onFocus={abrirTipCap(t.nome, t.descricao)}
              onBlur={fecharTip}
            >{t.nome}</span>
            <span className="fp2-statrow-v">{possui ? (tot >= 0 ? `${tot}` : tot) : '—'}</span>
          </div>
        );
      })}
    </>
  );

  // ── Layout "Tomo de Pedra" (releitura ARPG da referência) ──
  // Grupo de casas: rótulo da região + cluster de N casas. Reusa
  // fpSlotTile (mantém ícone/absorção/desequipar) e os mesmos
  // resolvedores de ocupação (ocupanteDefesa/ocupanteDedo), então
  // o comportamento de equipar/desequipar é idêntico ao da grade
  // anatômica anterior — só muda o arranjo (duas colunas flanqueando
  // o retrato, como no protótipo aprovado).
  const fpGroup = (label, regiao, n) => (
    <div className="fp2-slotgroup" key={'grp-' + regiao}>
      <div className="fp2-slot-cluster">
        {regiao === 'dedos'
          ? Array.from({ length: n }).map((_, i) => fpSlotTile('dedos', ocupanteDedo(i), 'dedo-' + i))
          : Array.from({ length: n }).map((_, i) => fpSlotTile(regiao, ocupanteDefesa(regiao, i), regiao + '-' + i))}
      </div>
    </div>
  );



  // Atributos-base (agora exibidos na ficha, como no protótipo aprovado).
  const ATTR_DEFS = [
    ['forca', en ? 'Strength' : 'Força'], ['fisico', en ? 'Body' : 'Físico'],
    ['agilidade', en ? 'Agility' : 'Agilidade'], ['percepcao', en ? 'Perception' : 'Percepção'],
    ['intelecto', en ? 'Intellect' : 'Intelecto'], ['aura', 'Aura'], ['carisma', en ? 'Charisma' : 'Carisma'],
  ];
  const moedas = pj.inventario?.moedas || {};
  const fp2Stat = (label, value, accent) => (
    <div className="fp2-statrow" key={label}>
      <span className="fp2-statrow-l">{label}</span>
      <span className={'fp2-statrow-v' + (accent ? ' is-gold' : '')}>{value}</span>
    </div>
  );

  // Grupo de uma casa solta com rótulo (reusa o visual de fp2-slotgroup).
  // Usado nas Mãos do topo, onde cada mão é uma casa independente mas
  // a ocupação respeita arma de duas mãos (ocupanteDefesa).
  const fpHand = (regiao, key) => (
    <div className="fp2-slotgroup" key={'hand-' + regiao}>
      <div className="fp2-slot-cluster">{fpSlotTile(regiao, ocupanteDefesa(regiao, 0), key)}</div>
    </div>
  );

  // Fileira de equipamento (nova disposição aprovada):
  //   • topo:    Cabeça · Brinco · Colar · Roupa (4 casas — 1 slot cada)
  //   • corpo:   col esq (Peito/Pernas/Pés) · retrato · col dir (vazio · Ombros · Braços)
  //   • base:    Joias (→ card 4 sub-slots) · Mão · Mão · Cinto (1 slot por posição)
  //
  // Joias: slot único na base col 1. Ao clicar, abre card flutuante com 4
  // sub-slots individuais de Joia (badge mostra N/4 joias equipadas).
  // `joiasOpen` controla a visibilidade do card.
  const equipRow = (
    <div className="fp2-equip-wrap fp2-panel">
      <div className="fp2-equip-grid">
        {/* ── Linha 1 — Cabeça · Brinco · Colar · Roupa ── */}
        <div className="fp2-cell fp2-pos-orelha">{fpGroup(slotLbl('cabeca'),  'cabeca',  1)}</div>
        {/* Brincos: slot único com badge N/2 — clique abre card portal com 2 sub-slots */}
        <div className="fp2-cell fp2-pos-cabeca">
          <div className="fp2-slotgroup">
            <div className="fp2-slot-cluster">
              <button
                ref={brincosBtnRef}
                type="button"
                className={'inv-slot' + (brincosItens.length > 0 ? ' filled has-img' : ' empty')}
                style={{
                  cursor: 'pointer',
                  ...(FP_REGION_BG['orelha']
                    ? fpItemBgStyle(FP_REGION_BG['orelha'], brincosItens.length === 0)
                    : {}),
                }}
                onClick={() => {
                  if (brincosBtnRef.current) setBrincosRect(brincosBtnRef.current.getBoundingClientRect());
                  setBrincosOpen((v) => !v);
                }}
                onMouseEnter={(e) => abrirTip(e, {
                  title: en ? 'Earrings' : 'Brincos',
                  desc: `${brincosItens.length}/2 ${en ? 'equipped' : 'equipados'}`,
                })}
                onMouseLeave={fecharTip}
                onFocus={(e) => abrirTip(e, {
                  title: en ? 'Earrings' : 'Brincos',
                  desc: `${brincosItens.length}/2 ${en ? 'equipped' : 'equipados'}`,
                })}
                onBlur={fecharTip}
                aria-label={`${en ? 'Earrings' : 'Brincos'} — ${brincosItens.length}/2`}
                aria-expanded={brincosOpen}
              >
                {!FP_REGION_BG['orelha'] && (
                  <span className="inv-slot-ic"><i className="ti ti-diamond" aria-hidden="true" /></span>
                )}
                <span className="inv-slot-meta">
                  <span className="inv-slot-lbl">{slotLbl('orelha')}</span>
                </span>
                {brincosItens.length > 0 && (
                <span className="fp2-joias-badge is-active">
                  {brincosItens.length}/2
                </span>
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="fp2-cell fp2-pos-capa">{fpGroup(slotLbl('pescoco'), 'pescoco', 1)}</div>
        <div className="fp2-cell fp2-pos-pescoco">{fpGroup(slotLbl('capa'),    'capa',    1)}</div>

        {/* ── Coluna 1 (linhas 2-4) — Peito · Pernas · Pés ── */}
        <div className="fp2-cell fp2-pos-peito">{fpGroup(slotLbl('peito'),  'peito',  1)}</div>
        <div className="fp2-cell fp2-pos-pernas">{fpGroup(slotLbl('pernas'), 'pernas', 1)}</div>
        <div className="fp2-cell fp2-pos-pes">{fpGroup(slotLbl('pes'),    'pes',    1)}</div>

        {/* ── Retrato — colunas 2-3, linhas 2-4 ── */}
        <div className="fp2-stage fp2-pos-stage">
          <div
            className={'fp2-portrait' + (podeEditarFoto ? ' is-editable' : '') + (!fotoUrl ? ' is-empty' : '')}
            onClick={podeEditarFoto && !fotoUploading ? () => { if (fileFotoRef.current) fileFotoRef.current.click(); } : undefined}
            onMouseEnter={podeEditarFoto ? (e) => abrirTip(e, en ? 'Change photo' : 'Trocar foto') : undefined}
            onMouseLeave={podeEditarFoto ? fecharTip : undefined}
          >
            {fotoUrl
              ? <img src={fotoUrl} alt={nomeCompleto} className="fp2-portrait-img" />
              : <span className="fp2-mono">{inicial}</span>}
            {podeEditarFoto && <input ref={fileFotoRef} type="file" accept="image/*" hidden onChange={handleFotoChange} />}
            <div className="fp2-name-block">
              <h2 className="fp2-name">{pj.nome || nomeCompleto}</h2>
            </div>
          </div>
        </div>

        {/* ── Coluna 4 (linhas 2-4) — vazio · Ombros · Braços ── */}
        {/* Linha 2: Roupas (2 compartimentos) — badge N/2, card portal */}
        <div className="fp2-cell fp2-cell--right fp2-pos-ombros">
          <div className="fp2-slotgroup">
            <div className="fp2-slot-cluster">
              <button
                ref={roupasBtnRef}
                type="button"
                className={'inv-slot' + (roupasItens.length > 0 ? ' filled has-img' : ' empty')}
                style={{
                  cursor: 'pointer',
                  ...(FP_REGION_BG['roupa']
                    ? fpItemBgStyle(FP_REGION_BG['roupa'], roupasItens.length === 0)
                    : {}),
                }}
                onClick={() => {
                  if (roupasBtnRef.current) setRoupasRect(roupasBtnRef.current.getBoundingClientRect());
                  setRoupasOpen((v) => !v);
                }}
                onMouseEnter={(e) => abrirTip(e, {
                  title: en ? 'Garments' : 'Roupas',
                  desc: `${roupasItens.length}/2 ${en ? 'equipped' : 'vestidas'}`,
                })}
                onMouseLeave={fecharTip}
                onFocus={(e) => abrirTip(e, {
                  title: en ? 'Garments' : 'Roupas',
                  desc: `${roupasItens.length}/2 ${en ? 'equipped' : 'vestidas'}`,
                })}
                onBlur={fecharTip}
                aria-label={`${en ? 'Garments' : 'Roupas'} — ${roupasItens.length}/2`}
                aria-expanded={roupasOpen}
              >
                {!FP_REGION_BG['roupa'] && (
                  <span className="inv-slot-ic"><i className="ti ti-shirt" aria-hidden="true" /></span>
                )}
                <span className="inv-slot-meta">
                  <span className="inv-slot-lbl">{slotLbl('roupa')}</span>
                </span>
                {roupasItens.length > 0 && (
                <span className="fp2-joias-badge is-active">
                  {roupasItens.length}/2
                </span>
                )}
              </button>
            </div>
          </div>
        </div>
        {/* Linha 3: Ombros */}
        <div className="fp2-cell fp2-cell--right fp2-pos-bracos">{fpGroup(slotLbl('ombros'), 'ombros', 1)}</div>
        {/* Linha 4: Braços */}
        <div className="fp2-cell fp2-cell--right fp2-pos-cintura">{fpGroup(slotLbl('bracos'), 'bracos', 1)}</div>

        {/* ── Linha 5 — Joias(→card) · Mão · Mão · Cinto ── */}

        {/* Col 1: slot único de Joias — clique abre card portal com 4 sub-slots */}
        <div className="fp2-cell fp2-pos-dedo0">
          <div className="fp2-slotgroup">
            <div className="fp2-slot-cluster">
              <button
                ref={joiasBtnRef}
                type="button"
                className={'inv-slot' + (dedosItens.length > 0 ? ' filled has-img' : ' empty')}
                style={{
                  cursor: 'pointer',
                  ...(FP_REGION_BG['dedos']
                    ? fpItemBgStyle(FP_REGION_BG['dedos'], dedosItens.length === 0)
                    : {}),
                }}
                onClick={() => {
                  if (joiasBtnRef.current) setJoiasRect(joiasBtnRef.current.getBoundingClientRect());
                  setJoiasOpen((v) => !v);
                }}
                onMouseEnter={(e) => abrirTip(e, {
                  title: en ? 'Jewels' : 'Joias',
                  desc: `${dedosItens.length}/4 ${en ? 'equipped' : 'equipadas'}`,
                })}
                onMouseLeave={fecharTip}
                onFocus={(e) => abrirTip(e, {
                  title: en ? 'Jewels' : 'Joias',
                  desc: `${dedosItens.length}/4 ${en ? 'equipped' : 'equipadas'}`,
                })}
                onBlur={fecharTip}
                aria-label={`${en ? 'Jewels' : 'Joias'} — ${dedosItens.length}/4`}
                aria-expanded={joiasOpen}
              >
                {!FP_REGION_BG['dedos'] && (
                  <span className="inv-slot-ic"><i className="ti ti-diamond" aria-hidden="true" /></span>
                )}
                <span className="inv-slot-meta">
                  <span className="inv-slot-lbl">{en ? 'Jewels' : 'Joias'}</span>
                </span>
                {/* Badge N/4 */}
                {dedosItens.length > 0 && (
                <span className="fp2-joias-badge is-active">
                  {dedosItens.length}/4
                </span>
                )}
              </button>
            </div>
          </div>
          {/* O card de joias é renderizado via portal — ver seção de overlays abaixo */}
        </div>

        {/* Col 2-3: Mãos */}
        <div className="fp2-cell fp2-pos-maoe">{fpHand('mao_e', 'arma-e')}</div>
        <div className="fp2-cell fp2-pos-maod">{fpHand('mao_d', 'arma-d')}</div>

        {/* Col 4: Cinto — slot único com badge N/3 — clique abre card portal com 3 sub-slots */}
        <div className="fp2-cell fp2-pos-dedo1">
          <div className="fp2-slotgroup">
            <div className="fp2-slot-cluster">
              <button
                ref={cintoBtnRef}
                type="button"
                className={'inv-slot' + (cintoItens.length > 0 ? ' filled has-img' : ' empty')}
                style={{
                  cursor: 'pointer',
                  ...(FP_REGION_BG['cintura']
                    ? fpItemBgStyle(FP_REGION_BG['cintura'], cintoItens.length === 0)
                    : {}),
                }}
                onClick={() => {
                  if (cintoBtnRef.current) setCintoRect(cintoBtnRef.current.getBoundingClientRect());
                  setCintoOpen((v) => !v);
                }}
                onMouseEnter={(e) => abrirTip(e, {
                  title: en ? 'Belt' : 'Cinto',
                  desc: `${cintoItens.length}/3 ${en ? 'equipped' : 'equipados'}`,
                })}
                onMouseLeave={fecharTip}
                onFocus={(e) => abrirTip(e, {
                  title: en ? 'Belt' : 'Cinto',
                  desc: `${cintoItens.length}/3 ${en ? 'equipped' : 'equipados'}`,
                })}
                onBlur={fecharTip}
                aria-label={`${en ? 'Belt' : 'Cinto'} — ${cintoItens.length}/3`}
                aria-expanded={cintoOpen}
              >
                {!FP_REGION_BG['cintura'] && (
                  <span className="inv-slot-ic"><i className="ti ti-shield" aria-hidden="true" /></span>
                )}
                <span className="inv-slot-meta">
                  <span className="inv-slot-lbl">{slotLbl('cintura')}</span>
                </span>
                {cintoItens.length > 0 && (
                <span className="fp2-joias-badge is-active">
                  {cintoItens.length}/3
                </span>
                )}
              </button>
            </div>
          </div>
          {/* O card de cinto é renderizado via portal — ver seção de overlays abaixo */}
        </div>
      </div>
    </div>
  );

  // Coluna direita: Condições (elCond) + card de abas (Atributos/Magias/
  // Técnicas/Habilidades), ao lado do mapa de equipamento. Velocidade/
  // Resistência Física/Resistência Mágica passaram por aqui antes mas já
  // saíram de novo (foram pra vitCondCol, agora como barras — ver
  // combatBars/elCombate); Defesa também passou por essa migração e depois
  // foi retirada de vez da ficha, a pedido do usuário. Condições entrou no
  // lugar delas, a pedido do usuário. Ordem importa: card de abas fica por
  // último de propósito — é o :last-child que ganha flex:1+overflow-y:auto
  // no index.css (lista paginada, precisa crescer/rolar); Condições, à
  // frente, herda o flex-shrink:0 (ver index.css) igual aos painéis fixos
  // de vitCondCol.
  // Card lateral: Atributos / Magias / Técnicas / Habilidades com abas de ícone.
  // capView: 'atrib' | 'mag' | 'tec' | 'hab'. Paginação unificada (15 por pág).
  const CAP_POR_PAG = 7; // a altura da coluna agora é resolvida via CSS (fp2-columns: align-items stretch + flex:1 no último painel + scroll interno), então este número deixou de ser crítico para "não vazar" — mantido como paginação razoável; ajuste livremente se quiser mais/menos itens por página
  const capTabs = [
    { key: 'atrib', icon: 'ti-chart-bar',   tip: en ? 'Attributes' : 'Atributos' },
    ...(temMag ? [{ key: 'mag', icon: 'ti-comet',       tip: en ? 'Spells'      : 'Magias'     }] : []),
    ...(temTec ? [{ key: 'tec', icon: 'ti-sword',      tip: en ? 'Techniques'  : 'Técnicas'   }] : []),
    ...(temHab ? [{ key: 'hab', icon: 'ti-brain',      tip: en ? 'Skills'      : 'Habilidades'}] : []),
  ];
  // lista de itens da aba activa (para paginação)
  const capLista = capView === 'mag' ? (temMag ? catalogoMag : [])
    : capView === 'tec' ? (temTec ? catalogoTec : [])
    : capView === 'hab' ? (temHab ? catalogoHab : [])
    : [];
  const capTotalPags = Math.max(1, Math.ceil(capLista.length / CAP_POR_PAG));
  const capPagAtual  = Math.min(capPage, capTotalPags - 1);
  const capFatia     = capLista.slice(capPagAtual * CAP_POR_PAG, capPagAtual * CAP_POR_PAG + CAP_POR_PAG);

  const combatPanels = (    
    <div className="fp2-combat-col">
      <section className="fp2-panel">
        <div className="fp2-panel-body">
          {elCond}
        </div>
      </section>
    </div>
  );

  // Coluna esquerda: Vitalidade + Velocidade/Resistências (elCombate) +
  // Estágio. Condições MUDOU pra coluna direita (combatPanels) a pedido do
  // usuário — ver comentário lá. Velocidade/Resistência Física/Resistência
  // Mágica também migraram pra cá antes (fp2Stat) e agora viraram barras
  // (elCombate, ver combatBars) — sem editar (são estatística derivada, não
  // estado_atual). Defesa esteve no meio dessa migração mas foi retirada da
  // ficha a pedido do usuário.
  // fp2-vitcond-col--no-recip continua fixo: com Condições fora, o último
  // filho agora é Estágio (uma barra só) — flex:0 0 auto/overflow visible
  // é o certo pra ele também (não é lista variável que precise crescer/
  // rolar), então não precisou trocar nada nessa regra.
  // Espaçamento: o gap de .fp2-vitcond-col (index.css) é 5px — igual ao
  // padding-bottom de .fp-bar-row — pra toda barra ter o mesmo respiro entre
  // si, seja dentro da mesma seção (Vitalidade→Combate→Estágio) ou entre
  // seções (painéis aqui não têm padding próprio, então o gap é o único
  // fator de distância entre a última barra de uma seção e a primeira da
  // próxima) — a pedido do usuário.
  const vitCondCol = (
    <div className="fp2-vitcond-col fp2-vitcond-col--no-recip">
      <section className="fp2-panel fp2-vit-section">
        <div className="fp2-panel-body fp2-vit-band">{elVit}</div>
      </section>
      <section className="fp2-panel">
        <div className="fp2-panel-body fp2-vit-band">{elCombate}</div>
      </section>
      <section className="fp2-panel">
        <div className="fp2-panel-body fp2-vit-band">{elEstagio}</div>
      </section>
    </div>
  );

  // Abaixo das três colunas, em largura cheia: só o arsenal.
  // A tríade (Habilidades/Magias/Técnicas) agora vive no card lateral direito
  // (abas Atributos/Magias/Técnicas/Habilidades), não mais numa aba separada.
  const lowerRest = (
    <>
      {temArmas && (
        <section className="fp2-panel fp2-wide fp2-arsenal-bar">
          <div className="fp2-panel-body fp2-arsenal">{elArmas}</div>
        </section>
      )}
    </>
  );

  // ── Header — mesmo padrão ms-header de Convites/Batalhas/Lore: seta de
  // voltar + eyebrow + título (nome do PJ), abas como segmented control
  // (mesmo estilo de diario-subtabs: btn-primary na ativa, btn-ghost nas
  // demais) e ações (editar/excluir) à direita. Tooltip próprio dos botões
  // de navegação (substitui o title nativo do browser) — mesmo já existia.
  const tabTipLabel = (label) => (e) => abrirTabTip(e, { desc: label });
  const fpTabsEl = (
    <header className="ms-header ficha-page-header">
      <button
        type="button"
        className="btn-icon btn-sm"
        onClick={onVoltar}
        aria-label={en ? 'Back to characters' : 'Voltar aos personagens'}
        onMouseEnter={tabTipLabel(en ? 'Back to characters' : 'Voltar aos personagens')}
        onMouseLeave={fecharTabTip}>
        <i className="ti ti-arrow-left" aria-hidden="true" />
      </button>
      <div className="fp-flex-fill">
        <div className="fp-estagio-nome-row">
          <span className="fp-estagio-num" aria-label={en ? `Stage ${estagioNum}` : `Estágio ${estagioNum}`}>
            {estagioNum}
          </span>
          <div>
            <div className="ficha-page-eyebrow">{en ? 'Character' : 'Personagem'}</div>
            <h2 className="ms-title" style={{ margin: 0 }}>{nomeCompleto}</h2>
          </div>
        </div>
      </div>
      <div className="diario-subtabs" role="tablist" style={{ margin: 0 }}>
        {navSlot /* slot p/ o botão "Batalha" (08-personagens/FichaComBatalha) */}
        <button type="button" className={fpTab === 'ficha' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'} role="tab" aria-selected={fpTab === 'ficha'}
          onClick={() => setFpTab('ficha')}>
          {en ? 'Sheet' : 'Ficha'}
        </button>
        <button type="button" className={fpTab === 'info' ? 'btn-icon btn-sm is-active' : 'btn-icon btn-sm'} role="tab" aria-selected={fpTab === 'info'}
          onClick={() => setFpTab('info')}
          onMouseEnter={tabTipLabel(en ? 'Information' : 'Informações')}
          onMouseLeave={fecharTabTip}
          onFocus={tabTipLabel(en ? 'Information' : 'Informações')}
          onBlur={fecharTabTip}>
          <i className="ti ti-file-description" aria-hidden="true" />
        </button>
        <button type="button" className={fpTab === 'inventario' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'} role="tab" aria-selected={fpTab === 'inventario'}
          onClick={() => setFpTab('inventario')}>
          {en ? 'Inventory' : 'Inventário'}
        </button>
        <button type="button" className={fpTab === 'loja' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'} role="tab" aria-selected={fpTab === 'loja'}
          onClick={() => setFpTab('loja')}>
          {en ? 'Shop' : 'Loja'}
        </button>
        <button type="button" className={fpTab === 'diario' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'} role="tab" aria-selected={fpTab === 'diario'}
          onClick={() => setFpTab('diario')}>
          {en ? 'Journal' : 'Diário'}
        </button>
      </div>
      {onEditar && (
        <button type="button" className="btn-icon btn-sm"
          aria-label={en ? 'Edit character' : 'Editar personagem'}
          onClick={onEditar}
          onMouseEnter={tabTipLabel(en ? 'Edit character' : 'Editar personagem')}
          onMouseLeave={fecharTabTip}>
          <i className="ti ti-pencil" aria-hidden="true" />
        </button>
      )}
      {onExcluir && (
        <button type="button" className="btn-icon btn-danger btn-sm"
          aria-label={en ? 'Delete character' : 'Excluir personagem'}
          onClick={onExcluir}
          onMouseEnter={tabTipLabel(en ? 'Delete character' : 'Excluir personagem')}
          onMouseLeave={fecharTabTip}>
          <i className="ti ti-trash" aria-hidden="true" />
        </button>
      )}
    </header>
  );

  return (
    <>
    <div className={'menestrel-ui fp-page' + (fpFull ? ' is-full' : '') + ((fpTab === 'inventario' || fpTab === 'loja' || fpTab === 'diario') ? ' is-inv' : '')}>

      <div className="fp-card">
        <div className="fp-card-top">
          {pausado && (
            <div className="fp-pause-banner">
              <i className="ti ti-player-pause" aria-hidden="true" />
              {en ? 'Story paused — the player has no access to this sheet right now.'
                  : 'História pausada — o jogador está sem acesso a esta ficha agora.'}
            </div>
          )}
          {fpTabsEl}
        </div>

      {fpTab === 'info' ? (
        <div className="fp-invtab fp-info-tab">
          <FichaInfoView
            pj={pj}
            en={en}
            atributosFinais={atributosFinais}
            derivadas={_d}
            estagioNum={estagioNum}
            xpTotal={xpTotal}
            velocidade={velocidade}
            pesoPersonagem={ficha.peso}
            catalogoHab={catalogoHab}
            catalogoMag={catalogoMag}
            catalogoTec={catalogoTec}
            habsByKey={habsByKey}
            pjHabilidades={pj.habilidades || {}}
            pjMagias={pj.magias || {}}
            pjTecnicas={pj.tecnicas || {}}
            nivelMagiaEfetivoFn={_nivelMag}
            totalHabilidadeFn={_totHabCond || _totHab}
            totalTecnicaFn={_totTec}
            bonusHabilidades={bonusHabilidades}
            titulo={titulo}
          />
        </div>
      ) : fpTab === 'inventario' ? (
        <div className="fp-invtab">
          {/* Mestre visualiza inventário de outro usuário: currentUserId = Mestre, pj.user_id = dono do PJ.
              InventarioList usa currentUserId em queries RLS (user_id = auth.uid()) — passa o user_id
              real do PJ (pj.user_id) para que o Mestre, com acesso SECURITY DEFINER via RPC ou
              SELECT all policy, possa enxergar o inventário. Fallback pro currentUserId normal (jogador). */}
          <InventarioList ac={ac} lang={lang} currentUserId={pj?.user_id ?? currentUserId} pjIdFixo={pjAtivoId} key={pjAtivoId} onInventarioChange={(novoInv) => setPj((prev) => prev ? { ...prev, inventario: novoInv } : prev)} maximos={{ ef: maxEF, eh: maxEH, ka: maxKA, ar: arMax }} isMestre={isMestre} />
        </div>
      ) : fpTab === 'loja' ? (
        <div className="fp-invtab">
          <LojaJogador ac={ac} lang={lang} currentUserId={pj?.user_id ?? currentUserId} pjIdFixo={pjAtivoId} key={pjAtivoId} isMestre={isMestre} />
        </div>
      ) : fpTab === 'diario' ? (
        <div className="fp-invtab">
          <DiarioView pj={pj} lang={lang} key={pjAtivoId} currentUserId={pj?.user_id ?? currentUserId} isMestre={isMestre} />
        </div>
      ) : (
      <div className="fp2-sheet">
        <div className="fp2-frame">
          {fotoErro && <div className="fp2-erro">{fotoErro}</div>}
          {eqErro && <div className="fp2-erro">{eqErro}</div>}

          <div className="fp2-columns">
            <div className="fp2-col-vit">{vitCondCol}</div>
            <div className="fp2-col-main">{equipRow}</div>
            <aside className="fp2-col-side">{combatPanels}</aside>
          </div>
          {lowerRest}
        </div>
      </div>
      )}
      </div>{/* /fp-card */}
    </div>
    {/* Tooltips portados para #root — escapam de qualquer stacking context da
        árvore do App (ex.: .fp-page.is-full tem position:fixed, que cria um
        stacking context) para poderem renderizar ACIMA do card de Joias, que
        também é um portal em #root. Sem o portal, z-index não resolve: o tooltip
        fica preso num contexto que inteiro está abaixo do portal do card.
        O wrapper .menestrel-ui garante que a CSS escopada (#root .menestrel-ui
        .mn-tip) continue casando fora da subárvore original. */}
    {ReactDOM.createPortal(
      <div className="menestrel-ui">
        <Tooltip tip={tabTip} onEnter={manterTabTip} onLeave={fecharTabTip} />
        <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
      </div>,
      document.getElementById('root') || document.body
    )}
    <TooltipFlipGuard />

    {/* ── Card de Joias (portal) ──────────────────────────────────────────────
        Renderizado via ReactDOM.createPortal dentro de #root (não body!) para que
        "#root .menestrel-ui .inv-slot" e demais seletores escopados no index.css
        continuem casando. Escapa do overflow:hidden do .fp2-panel sem perder CSS.
        Posicionado com position:fixed acima do botão de Joias via joiasRect.
        zIndex 9000 — abaixo dos tooltips (9500), que também são portados pra
        #root, pra que o tooltip de um slot apareça na frente do card.
    ─────────────────────────────────────────────────────────────────────────── */}
    {joiasOpen && joiasRect && ReactDOM.createPortal(
      <div className="menestrel-ui">
        {/* Backdrop invisível — fecha o card ao clicar fora */}
        <div
          className="fp-portal-backdrop"
          onClick={() => setJoiasOpen(false)}
          aria-hidden="true"
        />

        {/* Wrapper fixed — centraliza card + seta no botão de Joias.
            Só este div tem position:fixed; .fp2-joias-card NÃO é fixed,
            o que permite que overflow:hidden clipe o ::before (faixa de
            gradiente) corretamente dentro do border-radius. */}
        <div
          className="fp-portal-anchor"
          style={{
            bottom:  window.innerHeight - joiasRect.top + 10,
            left:    Math.max(8, Math.min(window.innerWidth - 324, joiasRect.left + joiasRect.width / 2 - 158)),
          }}
          role="dialog"
          aria-label={en ? 'Jewel slots' : 'Slots de joia'}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Card visual — overflow:hidden clipa o ::before no border-radius */}
          <div className="fp2-joias-card">
            {/* Cabeçalho */}
            <div className="fp2-joias-card-head">
              <span className="fp2-slot-lbl">
                {en ? 'Accessories' : 'Acessórios'}
              </span>
              <button
                type="button"
                className="btn-icon btn-sm"
                onClick={() => setJoiasOpen(false)}
                aria-label={en ? 'Close' : 'Fechar'}
              >
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>

            {/* 4 slots em linha única */}
            <div className="fp2-slot-cluster">
              {Array.from({ length: 4 }).map((_, idx) =>
                fpSlotTile('dedos', ocupanteDedo(idx), 'joia-card-' + idx)
              )}
            </div>
          </div>

          {/* Seta: irmã do card, fora do overflow:hidden — aponta para o botão */}
          <div className="fp2-joias-arrow" aria-hidden="true" />
        </div>
      </div>,
      /* portal dentro de #root para que "#root .menestrel-ui .*" case */
      document.getElementById('root') || document.body
    )}

    {/* ── Card de Brincos (portal) — 2 sub-slots ─────────────────────────────── */}
    {brincosOpen && brincosRect && ReactDOM.createPortal(
      <div className="menestrel-ui">
        <div
          className="fp-portal-backdrop"
          onClick={() => setBrincosOpen(false)}
          aria-hidden="true"
        />
        <div
          className="fp-portal-anchor"
          style={{
            bottom:  window.innerHeight - brincosRect.top + 10,
            left:    Math.max(8, Math.min(window.innerWidth - 182, brincosRect.left + brincosRect.width / 2 - 87)),
          }}
          role="dialog"
          aria-label={en ? 'Earring slots' : 'Slots de brinco'}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="fp2-joias-card" style={{ '--joias-card-w': '174px', '--joias-cols': 2 }}>
            <div className="fp2-joias-card-head">
              <span className="fp2-slot-lbl">{en ? 'Earrings' : 'Brincos'}</span>
              <button type="button" className="btn-icon btn-sm" onClick={() => setBrincosOpen(false)} aria-label={en ? 'Close' : 'Fechar'}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
            {/* 2 slots em linha */}
            <div className="fp2-slot-cluster">
              {Array.from({ length: 2 }).map((_, idx) =>
                fpSlotTile('orelha', ocupanteOrelha(idx), 'brinco-card-' + idx)
              )}
            </div>
          </div>
          <div className="fp2-joias-arrow" aria-hidden="true" />
        </div>
      </div>,
      document.getElementById('root') || document.body
    )}

    {/* ── Card de Roupas (portal) — 2 sub-slots ───────────────────────────────── */}
    {roupasOpen && roupasRect && ReactDOM.createPortal(
      <div className="menestrel-ui">
        <div
          className="fp-portal-backdrop"
          onClick={() => setRoupasOpen(false)}
          aria-hidden="true"
        />
        <div
          className="fp-portal-anchor"
          style={{
            bottom:  window.innerHeight - roupasRect.top + 10,
            left:    Math.max(8, Math.min(window.innerWidth - 182, roupasRect.left + roupasRect.width / 2 - 87)),
          }}
          role="dialog"
          aria-label={en ? 'Garment slots' : 'Slots de roupa'}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="fp2-joias-card" style={{ '--joias-card-w': '174px', '--joias-cols': 2 }}>
            <div className="fp2-joias-card-head">
              <span className="fp2-slot-lbl">{en ? 'Garments' : 'Roupas'}</span>
              <button type="button" className="btn-icon btn-sm" onClick={() => setRoupasOpen(false)} aria-label={en ? 'Close' : 'Fechar'}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
            {/* 2 slots em linha */}
            <div className="fp2-slot-cluster">
              {Array.from({ length: 2 }).map((_, idx) =>
                fpSlotTile('roupa', ocupanteRoupa(idx), 'roupa-card-' + idx)
              )}
            </div>
          </div>
          <div className="fp2-joias-arrow" aria-hidden="true" />
        </div>
      </div>,
      document.getElementById('root') || document.body
    )}

    {/* ── Card de Cinto (portal) — 3 sub-slots ───────────────────────────────── */}
    {cintoOpen && cintoRect && ReactDOM.createPortal(
      <div className="menestrel-ui">
        <div
          className="fp-portal-backdrop"
          onClick={() => setCintoOpen(false)}
          aria-hidden="true"
        />
        <div
          className="fp-portal-anchor"
          style={{
            bottom:  window.innerHeight - cintoRect.top + 10,
            left:    Math.max(8, Math.min(window.innerWidth - 260, cintoRect.left + cintoRect.width / 2 - 126)),
          }}
          role="dialog"
          aria-label={en ? 'Belt slots' : 'Slots de cinto'}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="fp2-joias-card" style={{ '--joias-card-w': '252px', '--joias-cols': 3 }}>
            <div className="fp2-joias-card-head">
              <span className="fp2-slot-lbl">{en ? 'Belt' : 'Cinto'}</span>
              <button type="button" className="btn-icon btn-sm" onClick={() => setCintoOpen(false)} aria-label={en ? 'Close' : 'Fechar'}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
            {/* 3 slots em linha */}
            <div className="fp2-slot-cluster">
              {Array.from({ length: 3 }).map((_, idx) =>
                fpSlotTile('cintura', ocupanteCintura(idx), 'cinto-card-' + idx)
              )}
            </div>
          </div>
          <div className="fp2-joias-arrow" aria-hidden="true" />
        </div>
      </div>,
      document.getElementById('root') || document.body
    )}

      {/* Menu de ação de uma peça equipada/vestida. Toda casa preenchida abre
          este menu (em vez de desequipar no clique), pra evitar desequipar sem
          querer. Container (ex.: cinto) ganha também "Ver conteúdo". */}
      {menuPecaId && (() => {
        const it = itensPj.find((x) => x.instanceId === menuPecaId);
        if (!it) return null;
        const cat = catalogoBySlug[it.slug];
        const nome = cat?.nome || it.slug;
        const isCont = !!cat && _ehContainer(cat);
        const despirLbl = it.vestido ? (en ? 'Take off' : 'Despir') : (en ? 'Unequip' : 'Desequipar');
        const despirIc  = it.vestido ? 'ti-shirt-off' : 'ti-shield-off';
        const fechar = () => setMenuPecaId(null);
        return (
          <ModalShell title={nome} lang={lang} size="sm" onClose={fechar}>
              {(cat?.descricao || cat?.efeito) && (
                <div className="det-desc">
                  {cat.descricao && <p>{cat.descricao}</p>}
                  {cat.efeito && <p className="det-efeito">{en ? 'Effect' : 'Efeito'}: {cat.efeito}</p>}
                </div>
              )}
              <div className="det-actions" style={{ marginTop: 0 }}>
                <div className="det-act-row">
                  {isCont && (
                    <button className="btn-primary"
                      onClick={() => { setMenuPecaId(null); setContFichaId(it.instanceId); }}>
                      {en ? 'Open' : 'Abrir'}
                    </button>
                  )}
                  <button className={isCont ? 'btn-ghost' : 'btn-primary'}
                    onClick={() => { setMenuPecaId(null); desequiparFicha(it.instanceId); }}>
                    {despirLbl}
                  </button>
                </div>
              </div>
          </ModalShell>
        );
      })()}

      {/* Conteúdo do container vestido — reusa o ContainerModal da Fase 7 (ver + retirar). */}
      {contFichaId && _ContainerModal && (() => {
        const inst = itensPj.find((x) => x.instanceId === contFichaId);
        if (!inst) return null;
        const CtnModal = _ContainerModal;
        return (
          <CtnModal
            containerInst={inst}
            catalogoBySlug={catalogoBySlug}
            todosItens={itensPj}
            lang={lang}
            onClose={() => setContFichaId(null)}
            onRemoverDoContainer={removerDoContainerFicha}
            onAbrirDetalhes={(id) => { setContFichaId(null); setDetalheCintoId(id); }}
          />
        );
      })()}

      {/* Detalhes de um item de dentro do cinto — modal completo, porém em
          contexto="ficha" (só Usar/Descartar; transferir/pergaminho/equipar
          continuam na aba Inventário). */}
      {detalheCintoId && _DetalhesItemModal && (() => {
        const detInst = itensPj.find((x) => x.instanceId === detalheCintoId);
        if (!detInst) return null;
        const DetModal = _DetalhesItemModal;
        return (
          <DetModal
            instance={detInst}
            catalogoBySlug={catalogoBySlug}
            raca={pj.raca}
            slotsState={null}
            todosItens={itensPj}
            containersDisponiveis={[]}
            pjsHistoria={[]}
            lang={lang}
            contexto="ficha"
            onClose={() => setDetalheCintoId(null)}
            onUsar={solicitarUsarFicha}
            onDestruir={solicitarDestruirFicha}
            onObservacao={() => {}}
            onEquipar={() => ({ ok: false })}
            onDesequipar={() => {}}
            onVestir={() => ({ ok: false })}
            onDespir={() => {}}
            onAprenderMagia={async () => ({ ok: false })}
            onMoverParaContainer={() => {}}
            onTransferir={async () => ({ ok: false })}
            transferError={null}
            onTransferReset={() => {}}
            onRemoverDoContainer={() => {}}
            onAbrirDetalhesFilho={() => {}}
          />
        );
      })()}

      {/* Pergunta de quantidade (usar/descartar mais de 1) — reusa QuantidadeModal. */}
      {acaoQtd && _QuantidadeModal && (() => {
        const it = itensPj.find((x) => x.instanceId === acaoQtd.instanceId);
        const cat = it ? catalogoBySlug[it.slug] : null;
        const nome = cat?.nome || it?.slug || '';
        const titulo = acaoQtd.tipo === 'usar'
          ? (en ? `Use ${nome}` : `Usar ${nome}`)
          : (en ? `Destroy ${nome}` : `Destruir ${nome}`);
        const QtdModal = _QuantidadeModal;
        return (
          <QtdModal titulo={titulo} max={acaoQtd.max} lang={lang}
            onConfirm={executarAcaoQtd} onCancel={() => setAcaoQtd(null)} />
        );
      })()}

      {/* Detalhes de uma magia (fora de combate) — abre ao clicar numa magia
          no card lateral (aba Magias). Permite escolher o nível (até o
          nível efetivo que o PJ possui) e o alvo (o próprio PJ ou outro
          protagonista da mesma história). "Evocar" fecha o modal e notifica
          a Central de Mensagens da Mesa (aoEvocarMagia); ainda NÃO aplica
          o efeito mecânico no alvo (curar/dano/buff é trabalho futuro). */}
      {magiaDetalheKey && (() => {
        const mag = magiasByKey[magiaDetalheKey];
        if (!mag) return null;
        return (
          <MagiaDetalhesModal
            magia={mag}
            passos={(pj.magias || {})[magiaDetalheKey] ?? null}
            nivelMagiaEfetivoFn={_nivelMag}
            eu={{ id: pj.id, nome: pj.nome, sobrenome: pj.sobrenome, foto_url: pj.foto_url }}
            colegas={pjsDaHistoria}
            lang={lang}
            onClose={() => setMagiaDetalheKey(null)}
            onEvocar={aoEvocarMagia}
            abrirTip={abrirTip}
            fecharTip={fecharTip}
          />
        );
      })()}

      {/* Detalhes de uma habilidade (fora de combate) — abre ao clicar numa
          habilidade no card lateral (aba Habilidades). Habilidade não tem
          nível: sempre usa o total já calculado (_totHab). Não tem alvo —
          só a escolha da dificuldade do uso. Só visual por ora: "Usar"
          ainda não dispara nenhuma ação. */}
      {habilidadeDetalheKey && (() => {
        const hab = habsByKey[habilidadeDetalheKey];
        if (!hab) return null;
        const total = (_totHabCond || _totHab)(habilidadeDetalheKey, pj.habilidades || {}, atributosFinais, bonusHabilidades, habsByKey, _est.condicoes);
        return (
          <HabilidadeDetalhesModal
            habilidade={hab}
            total={total}
            lang={lang}
            onClose={() => setHabilidadeDetalheKey(null)}
            onUsar={(p) => { setHabilidadeDetalheKey(null); setRolagem(p); }}
            abrirTip={abrirTip}
            fecharTip={fecharTip}
          />
        );
      })()}

      {/* Overlay do dado d20 no centro da tela — disparado pelo "Usar" do
          HabilidadeDetalhesModal. Rola sozinho e resolve via resolverAcao,
          comparando a qualidade obtida com a dificuldade escolhida. Ao
          assentar, onResultado notifica a Central de Mensagens da Mesa
          (registrar_evento_mesa) — todos na história veem via Realtime.
          Reutilizável depois para magias ("Evocar") e técnicas de combate. */}
      {rolagem && (
        <RolagemD20Overlay
          nome={rolagem.nome}
          total={rolagem.total}
          dificuldade={rolagem.dificuldade}
          lang={lang}
          onClose={() => setRolagem(null)}
          onResultado={aoResolverTesteHabilidade}
        />
      )}

      {editBar && (
        <BarEditPopover
          item={editBar.item}
          scope={editBar.scope}
          anchor={editBar.anchor}
          lang={lang}
          onChange={aplicarEstado}
          onClose={() => setEditBar(null)}
        />
      )}
    </>
  );
}


window.FichaPersonagem = FichaPersonagem;
