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

   Abas no topo: Ficha · Capacidades · Inventário · Loja (+ editar/
   excluir/tela-cheia). A aba "Capacidades" (ícone masks-theater)
   reúne Habilidades / Magias / Técnicas (3 cartões titulados),
   que antes ficavam embutidas na própria Ficha abaixo do Arsenal.

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
   .fp-cap-grid, .fp-slot-abs, .fp-tab…). A raiz carrega a classe
   `menestrel-ui` (puxa os tokens de pedra). O styles.css legado e
   o antigo bloco "FICHA v6" não são mais usados por esta tela.
   As casas do mapa corporal reusam `.inv-slot` (já migrado).

   ── Props ─────────────────────────────────────────────────
   - ac, lang, currentUserId   — herdados do AdminConsole
   - pjAtivoId                 — id do PJ ativo (já carregado do banco)
   - onVoltar()                — volta à lista (não muda pj_ativo_id)
   - onTrocar(novoPjId)        — troca de PJ ativo (atualiza profiles)

   ── Dependências (de outras fases) ────────────────────────
   - calcularFicha(p, catalogoBySlug)         → game-data.jsx
   - tituloDoPersonagem(p)                    → game-data.jsx
   - HABILIDADES_BY_KEY, totalHabilidade,
     nivelMagiaEfetivo, totalTecnica          → game-data.jsx
   - gerarAtaques, getSlotsState, bonusGrupoArma,
     SLOT_LABELS, aplicarEfeitosItem                → inventario-helpers.jsx
   - invItemIcon                              → inventario.jsx

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
  ef: '#A23B2F',   // Energia Física — ember quente (Pedra & Bronze)
  eh: '#C9A44E',   // Energia Heroica — ouro-velho
  ar: '#6E8AA6',   // Armadura — aço frio
  ka: '#9150A0',   // Karma — ametista discreta
  vb: '#5E8A6A',   // Velocidade — verde-musgo
  cond: '#9C8F73', // Condições — tan (fallback)
};

// Cor da barra de condição conforme o nível (0–1): vigor → alerta → crítico.
const FICHA_COND_NIVEIS = { alto: '#5E9C32', medio: '#C77F1C', baixo: '#C0392B' };
function fichaCondColor(pct) {
  if (pct >= 0.67) return FICHA_COND_NIVEIS.alto;
  if (pct >= 0.34) return FICHA_COND_NIVEIS.medio;
  return FICHA_COND_NIVEIS.baixo;
}

// Estado narrativo de cada barra (Vitalidade + Condições): 3 rótulos fixos
// por chave — [vazio, intermediário, cheio]. Usado só como leitura textual
// (tooltip / popover de edição), nunca substitui o valor numérico.
// PT/EN pareados por índice; fallback genérico se a chave não tiver entrada.
const FICHA_ESTADO_LABELS = {
  ef:   { pt: ['Morto', 'Ferido', 'Disposto'], en: ['Dead', 'Wounded', 'Fit'] },
  eh:   { pt: ['Apavorado', 'Abatido', 'Corajoso'], en: ['Terrified', 'Shaken', 'Brave'] },
  ar:   { pt: ['Desprotegido', 'Vulnerável', 'Protegido'], en: ['Unprotected', 'Vulnerable', 'Protected'] },
  ka:   { pt: ['Esgotado', 'Conectado', 'Pulsante'], en: ['Depleted', 'Connected', 'Pulsing'] },
  vitalidade:      { pt: ['Doente', 'Desconfortável', 'Saudável'], en: ['Sick', 'Uncomfortable', 'Healthy'] },
  animo:           { pt: ['Dormente', 'Sonolento', 'Desperto'], en: ['Numb', 'Drowsy', 'Awake'] },
  hidratacao:      { pt: ['Desidratado', 'Sede', 'Hidratado'], en: ['Dehydrated', 'Thirsty', 'Hydrated'] },
  nutricao:        { pt: ['Fraco', 'Fome', 'Satisfeito'], en: ['Weak', 'Hungry', 'Satisfied'] },
  termorregulacao: { pt: ['Calor/Frio', 'Incomodado', 'Confortável'], en: ['Hot/Cold', 'Uncomfortable', 'Comfortable'] },
  euforia:         { pt: ['Intoxicado', 'Alterado', 'Sóbrio'], en: ['Intoxicated', 'Altered', 'Sober'] },
  sanidade:        { pt: ['Insano', 'Perturbado', 'São'], en: ['Insane', 'Disturbed', 'Sane'] },
  reputacao:       { pt: ['Infame', 'Desonrado', 'Honrado'], en: ['Infamous', 'Dishonored', 'Honored'] },
};

// val/max → 0 (vazio) | 1 (intermediário) | 2 (cheio). max<=0 trata como vazio.
function fichaEstadoLabel(key, val, max, en) {
  const entry = FICHA_ESTADO_LABELS[key];
  if (!entry) return null;
  const lista = en ? entry.en : entry.pt;
  const v = Math.max(0, Number(val) || 0);
  const m = Math.max(0, Number(max) || 0);
  if (m <= 0 || v <= 0) return lista[0];
  if (v >= m) return lista[2];
  return lista[1];
}

function FichaVitBars({ bars, showValue, scope, onEdit, en }) {
  const editable = typeof onEdit === 'function';
  return (
    <div className={'fp-bars' + (showValue ? ' with-val' : '')}>
      {bars.map((b) => {
        const cor = b.color || FICHA_VIT_COLORS[b.key] || '#888';
        const pct = b.max > 0 ? Math.max(0, Math.min(1, b.val / b.max)) : 0;
        const empty = pct <= 0;
        const estadoLbl = fichaEstadoLabel(b.key, b.val, b.max, en);
        const sufixoEstado = estadoLbl ? ` — ${estadoLbl}` : '';
        const abrir = editable
          ? (e) => onEdit(b, scope, e.currentTarget.getBoundingClientRect())
          : undefined;
        return (
          <div
            key={b.key}
            className={'fp-bar-row' + (editable ? ' is-editable' : '')}
            onClick={abrir}
            role={editable ? 'button' : undefined}
            tabIndex={editable ? 0 : undefined}
            onKeyDown={editable ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(e); }
            } : undefined}
            title={editable ? `${b.label}: ${b.val}/${b.max}${sufixoEstado}` : undefined}
          >
            <span className="fp-bar-label">
              <span className="fp-bar-name">{b.label}</span>
            </span>
            <div
              className={'fp-bar-track' + (empty ? ' is-empty' : '')}
              title={!editable ? `${b.label}: ${b.val}${showValue ? '/' + b.max : ''}${sufixoEstado}` : undefined}
            >
              {!empty && (
                <div className="fp-bar-fill" style={{ width: (pct * 100) + '%', background: cor }}>
                  <span className="fp-bar-tip" />
                </div>
              )}
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
  const max = Math.max(0, Math.round(Number(item.max) || 0));
  const [val, setVal] = useState(() => Math.max(0, Math.min(max, Math.round(Number(item.val) || 0))));
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
    const nv = Math.max(0, Math.min(max, Math.round(v)));
    setVal(nv);
    onChange(scope, item.key, nv);
  };

  // Posição: logo abaixo da barra, presa ao viewport.
  const W = 250;
  const vw = (typeof window !== 'undefined' ? window.innerWidth : 360);
  let left = anchor ? anchor.left : 0;
  let top = anchor ? anchor.bottom + 8 : 0;
  if (left + W > vw - 10) left = Math.max(10, vw - 10 - W);
  if (left < 10) left = 10;

  const pct = max > 0 ? val / max : 0;
  const cor = scope === 'cond'
    ? fichaCondColor(pct)
    : (item.color || FICHA_VIT_COLORS[item.key] || '#888');
  const estadoLbl = fichaEstadoLabel(item.key, val, max, en);

  return (
    <div
      ref={ref}
      className="fp-bar-pop"
      style={{ position: 'fixed', left, top, width: W, '--pop-accent': cor }}
      role="dialog"
      aria-label={item.label}
      onClick={(e) => e.stopPropagation()}
    >
      {estadoLbl && <div className="fp-bar-pop-estado">{estadoLbl}</div>}
      <div className="fp-bar-pop-val"><strong>{val}</strong><span> / {max}</span></div>
      <input
        className="fp-bar-pop-range"
        type="range" min={0} max={max || 1} step={1} value={val}
        disabled={max <= 0}
        onChange={(e) => aplicar(Number(e.target.value))}
        style={{ accentColor: cor }}
      />
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
/* Grade compacta de condições (0–100). A cor muda conforme o nível:
   verde (vigor) → âmbar (alerta) → vermelho (crítico). Sem canvas —
   leitura calma, complementar às barras de vitalidade animadas. */
function CondMeters({ conds }) {
  return (
    <div className="fp-cond-grid">
      {conds.map((c) => {
        const pct = c.max > 0 ? Math.max(0, Math.min(1, c.val / c.max)) : 0;
        const cor = fichaCondColor(pct);
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

/* ============================== [11] Mapa corporal (Defesa) ============================== */
/* 3 colunas, casas pareadas nas laterais e linha central do corpo,
   + faixa de 2 joias (largura total) abaixo de Mão · Cinto · Mão.
   Cada casa guarda 1 item. O vocabulário das regiões é o do catálogo
   (slot_equip); "cinto"/"dedos" usam rótulo local até o SLOT_LABELS
   do inventario-helpers.jsx ganhar as chaves.
   Slots por região: brinco 1 · cabeça 1 · capa 1 · cinto 1 · colar 1 ·
   joia 2 · pés 1 · braços 1 · mãos 2 · ombros 1 · peito 1 · pernas 1 */
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
        pernas:'Pernas', cintura:'Cinto', pes:'Pés', dedos:'Joia', joia:'Joia' },
  en: { maos:'Hands', mao_d:'Hands', mao_e:'Hands', orelha:'Earring', brinco:'Earring', cabeca:'Head',
        capa:'Cloth', pescoco:'Necklace', colar:'Necklace', ombros:'Shoulders', peito:'Chest', bracos:'Arms',
        pernas:'Legs', cintura:'Belt', pes:'Feet', dedos:'Jewel', joia:'Jewel' },
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
};

/* ============================== [11] Arte por item (casas de equipamento) ============================== */
/* Algumas pecas ganham uma ilustracao propria no fundo da casa, no lugar
   do icone generico da regiao (FP_REGION_ICON). Hoje so o Colete de Couro;
   basta acrescentar novas entradas (nome do item em minusculas -> imagem)
   pra estender a outras pecas. Combinada com um degrade escuro pra manter
   o nome do item legivel por cima da arte. */
const FP_ITEM_BG = {
  'elmo': 'data:image/jpeg;base64,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',
  'peitoral': 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCACEAIQDASIAAhEBAxEB/8QAGgAAAwEBAQEAAAAAAAAAAAAAAAECAwQFBv/EADQQAAIBAwMCBAQGAgEFAAAAAAECEQADIQQSMUFREyJhcQUygbGRocHR4fAjQmIUFUNS8f/EABcBAQEBAQAAAAAAAAAAAAAAAAABAgP/xAAaEQEBAQEBAQEAAAAAAAAAAAAAAREhAjES/9oADAMBAAIRAxEAPwD5HNAp49KVEOaJPcxS6UdKAoox1onnNUM59aRHagEQaZIioFTjFLEU+cUBHrT71MiiaAOaIzzREc0HmgBT/Sn6zSzQGKKIHU0UCopVUZqhVpasXLhG1TBzJwIru+H6U7GvXAttYkO4mB3A/Wq0qC9d8NNwlgGzkiQIPaorgvqto7T5niTOIqFTcpYnaoME/tV3f8l+67dXOO+asWzc0oVPnDkhe4jpQYSs4XH/ACp7uyr+FZmVMGQfWrtq907UVnPZRNAyxI6fQU0DO4XEcmeAK7P+037ahtUU0ykSA5859lGazuhf8dvT2yNwnmWYz1/appjldTvhQTuPlFeguh8G2S203B8xPCenv/8AK6vg2ktnUeNeJKqdlvaJlupHtIA9SK7b+msXiyWGW3ZRoGfmIxPt0H1NS1qR4FxNwjk9CeaxKMuGGO9fQX/hHgBWfYVYwCxhT9f1rh1NpbZFuyhbxIILHg8bfWm4mPL+1AmrdGRjIIgwR2pY68DtWkKPQ0URPSiiJrWwi3Lyq5hOWI7CshWiHbugciJ7VR2277Xrq20TfHyoTgnpPoBTtb7OpUjUCC6i5cRfKuce/wDFcSOUkqcGAfWutL4dBbuEWkNvbcKDLQZBPrMVitRk2nfTa26l8rvsuQVnLH0pXVFoheUHDd6z0xe473ncQo3MXzuPb1mtpYk5YO/C9CfsaouzqYsXEKlnZ1h2gwADjNerYd10Dbb7K5+VEYJJ7Qompt6VG+HWGtWLQvMgdg1s+YliCQTjA6V3aJxaYW0ZQSGV1WAZkbSAueJmuetY5Nbp7zKbfh+HaVi1t7vlYz0PVvwryfCu3Fu2rMKUQuzNgus5A/avsNT50CpZNt28h8RYLQJmBJIjuRXy2t0TaPX6e9cul1a4MkAYB6AGIqzR06TfbtpatkKQm1CzBOeWz1yYrq0znS3Gt3FVI8rJcwI7H+/eoR9GviFrt4Xl3NcYANLCfvjBxFcut1vjWbe1UVlYoRzCwCBP/EyBWY1ePaF83iFtXFurcaFLLudf/YKeNo79OM15PxTci2rC+EAkhQhmVPBmno9XsuI++NuO0Dt6Cn8SsrcC3LaopPAAjd6gDJ961O9qV4l7eLjq5O4GDmsgBGO2a2uqd7bizNOSe9ZxmY+prcc6APr7UVS3NogKD6miqMhiqV9o2ng5qB61aLLewn3oF4gDZlvWqAa8AlsQtZsOTiBXVomRNPeY/NEL9efyphra3YULabduDJMR8p4IitdRbVNHccQ8eQmMIT096lN40wcMgG4ECZYHvHbFaoi6zUKzXUQllmypJDeYfgOfas+rnGpNe/d+E2kUaeyge8UWEZ/LbxkwepM/euj4alu272rLA7TEqAA3qO4nFc2ttpp9S+oTU2nL3t28qz7WHAgYJHGSKV3VC2EaxaAHzLcHlk9QF4U9wc1iemsepr0sarwTbuXEv2XxctfMvdfWe1fP/GdC974edazm5eDsGLwpVQYCwMCOa9jQX7ejs77xVrkEwDhepA/U9a8z4nr2O+9bJti4AWMDa7dwCMwMTW94y+bfUI4D3d6XGEFgshxxPPNFm9YuOEdmt21+UsJknktFZXpuKskmNwz+Nc4Hmx2qfnTX0fhs2nW8VtsttwN5gkDkEtwR75qNV8ZtraNnT21usfmuNMMfufc/hXjaeydRuto8NG4KTAaOfrX0Gjs7fhl3TJpxfaY8UDYI5yefapmLuvBvXbtxgXPPYQPwqAZz2/KtrwuGAybRyBEVlEfXoK3GKqBAwTjoKKjPQ0VRnVASwE4pVSQGk9qIlvlIHE1dmfCaD9O9S48qiec07Lbd47x70VolxvMB/sIPtXVpQbuo0z2VUEXArKskkjM/WuR4VlDj/HglVxI/etLB8LVJ4TEENAIwax6+NeXutqmtbES4tm6FJt3FEkL1S6vb1ry7d2+Az2i4tB9ztMgt0J/Q0wtu5s/zbWuMReJU+RQefWeTXchuaK++mLBlt/KeDB6qex5gyKzI1a5LmsAUgu0njaIUDrPehFu659qtK21ALMfKi9P4Ayad7TW9Vq7dnTozXn5VAFP1B8v1BinZ1L6RBbVBtBkFHzHWD36bunStcRy66yli4LaYIAMsclusjp7V57Ybt+leheddRcuOVS0pBbaMAADgf3Nee89zWozWouPaG6ySoI2lo5r1BrNWzvatrb095UJZhJLRzE4E+leRbPQxBEebpXr6V0vWku3Lm1kMMcTI45MQR71Ksecys7F7js7TkkyTUqsyP6K21BQXW8N5E428EViWlWG6M8dDVZH4UVaoYE7R7mKKaYw4zRieKPQ0flVQ4mkgi4p6TVD2pGNvrRW14RhsFfsa0sCwmpsvcLtaDeeMHHasrpBclyxDLz14pW2BuIrCUYiVBj86lWPQ09vTee4+p2mSUthSzEdOMVJbyF/EfxeoYYI9D+lTb1CG6yPpx4IMKiGGT1B6n3wahdrFhdueHt4BQnd6en1rMXi7DIS/jbmZzAYf6AckevSs74LMzIsKfNs6AVp4bqQCjKdm4AiCROTUvcc2mtgqFZgSFWC3b39qK5QwIyY9DWbjcxIEDpWt0QigWnBAO6VjNZAQa1GaQEcdK0A8snJPeghZMSB0xTCzmYA60QFSWgDp+FAhfly3f9qqdw2oNqjmf1qiFt95/P8AimriTakyWz2gmKKks89R6CiiMhTA4pDimDmqh94qrIR7qC5u2TnaM1En2imCVyMHvRWrw148BgYAGAai0kuhPG4COpzRugNA8xEe3emh3FCSFMgbjx9ag7LljYxuaS47hSQQR507+49RWC5EL5pxAzNaByjsQzOLZLSjbQD3nmmuoBvpcv2w1q4fNAjd+5FRp26K0dRcQ6m9cLqfKEMtkRBY+wwJrbUCzY0x/wCndV3H/wAYgsOmT5mHOcCRXJbv2tKB4rEkTAAyR7dPrWGo+I3LpJtBbAOMZY+7ftWc1dxjdVQhDIQ26dzNGI4j9awxMjNPaPm3Ses9ae0DzMMdB3rcZAHlJPE47n2ojcROB0A/SqALHc/XgD+8UnbOPx/agZfaNqxj8v5qD09aAssfvVCARHEf7DmifU+5NFabe350UHODHtTHaaQH41XtVQQSDNLMgU8TxQeec96KAJYDiqBhgRggzFSOcfnTnJkc/ego3GJYljnmKC56HaDyV5qFyJNHJioGZLdZ6Uz04NIGO/oe1UIMmAFHQDmqCBG5uOg71SjedzZPbv8AxQBvO4j2H96UO4Jifr3qKTuTIB9z3/ipA3Z4jk09u4jaM9aU9uOgoiyoysYIkHmakeb2+1OSFiYK9R9qljkxMUA8M0iY6UU9o6tB7RRV0QBz7UTn86KKBnBjoKntRRRD61UZ9BmKKKKkYx05qyoBoooEQNo9aZE3QvSdv0ooqCiTsHrP5dKzPzRRRVhWigb2t9AJHeaDiSME0UVlUEkyvQGn8okczFFFVCoooqo//9k=',
  'ombreiras': 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCACEAIQDASIAAhEBAxEB/8QAGgAAAgMBAQAAAAAAAAAAAAAAAAECAwUEBv/EADIQAAIBAgUCBAMIAwEAAAAAAAECAwARBBIhMUFRYQUTInEyQoEUI1KRobHB0WLh8BX/xAAXAQEBAQEAAAAAAAAAAAAAAAAAAQID/8QAHBEBAQEBAAMBAQAAAAAAAAAAAAERAhIhQVEx/9oADAMBAAIRAxEAPwDyOtAp6dqW1VDvRc9TalxRxUBRT96XWqGde9IjpQNjT4qBU7aUca0b6UBbvT61Gi9AHWi2u9AFBGtACn/FPXe9KgNKKLDk0UCpio1IC+o2qgHYUW99KY1vbnagA1At/rRbrTtptei1tqCNrE6Uz3ovpQAW0A1oAnSgC+la+G8BkERn8QEsUYUsIo1vKw62+UdzWnEq4f7OPDYETzVzfdr5kwH+THQX6W061m9SNTm156Pw3Gy/BhZSOpWw/WiTw7Fx/HAw9iDWv4jFI0KiYsjhiS82IvmHTLfS1ZoEYVkSKFmIUB0e5BG5HvWZ1a14yOEqUNmUqehFqY6VpeUTAc7ZnuAsLgksOTfgCs6UBJXRTcKSAa1OtZsxEbdqNaAfenvvt2rSC3Y0UWvxRREaleoinbSqGDfekdtaAOdKOelQMbci9M9qjzXb4X4bL4nivLU5I1GaSQ7Kv90VXg8FJi2OUZUHxORcL/Z7Vv4bBJ4ZHJLEi+fHYGSXVYSdr9W7Db9+yTGYfB4COHw9QhN/KJGwG8h/jvWR9paCGMqzGS5aFXNxHf57cseL7b1jrr5GuZ9rdMilT91IhdAZYzJ6teZHPwr0G/bisrHPLMiQYVjHAPiEQyRk9vmb3O/Sq8Ajzn75mZc2bIToW6nqe5rew+EjlSNnawY2W2pb2/umSG2vNP4coiSSNAq/CwsLq3f33FU/YSxYM2UhSwbLcab3tsO9evjwUJiM6Ru3qyMqMCVANvrXFjsGCGeBXjjKlbBtWXm/QG21PY8u5mgsj3tYEAm4I6g9KgmHika5JFiAQTb86vkZsjYY2ygloyflPIHY9OtVRKryRqzZQzBS1r2BP60sJXauAwIjV29ceQtI0chvHwBYjcnYVjW1I6V2z4hoYXijkLospyE+1s1utcaDn96vOnRgfX2oqSyZRYKD3NFaZVDSmO+1RHepAcftRC9qAOaCPaigaKWYBQWJNgBzXpph/wCXgU8OTKryL5mLlB17qPbb61ieFusMz4lrXhW6A/jOg/k/Sr5yrRhgxJkGZ2O7Dv8AWluRZ7BxPmM8sg00ugPy/Kg/mrYsR5quvoLysC5K6rb8J4HFcsEgjZlxPklHYExvfN+Y+HSuzCxxDFzRo2dQ1ka+4rlntvXZhmEcxhEqpKSLK4OVr8ZuD71v4JfJginGEEhZbTOrhrdhr/1qxWw00KYiaLENDCUzsFsSzcLY104IY3EQx+ZLDh1lURx59LrzkUfzT3q/GpK8XlviPD3YB2CSCNbZu630zAc/Q7acPic7O2GyThQFJzO1lUE6FvoPzrp8Tj8jCRLg8xaEEEX3Xm563sawo5XxGEllxMPmxNbKc9lj/wAiBre+w963ayzsc8D4vKglCD4nYWzdwvApYJzD4nB5aJIGbL6hcEEWvVr4kRRSFS7TZfLTOAQqkam/XiuLw+YriQWvaNJCO3pI/mnw+ozwSJFaRSudfMS/zLfQ/WuZdr13PK2JxecR2ZsqkA6HS2nT2riK5GKncGxFIlTsLDQnTgUVDXg0VpFdSFKmKIRNKmRWhgUwWHZZsezSNYMkCX16FjwOw1oL1wLYHwxpcShSaQnKrHLkFtyNyd7CoLEZIJ5xLHlgUen5u2n81VPPh8XiDJIYoQASqrFYMehO/wBTUhipZ4AJlJfzC32kG5ta2X2rHV1vmY50jGQsSTrsOa0vDjCzBBG6zWupDZla37GrcPgWmhcyonoIUvH6XuenDe2lTgwr4EmRmzQ5rNKoPp7MDqh96kurmNSCeeWMLhpBHx5ixBiOSMx0HtXDFjVR4JcTmaeC6XOmcbg66i1/1rmLoA4EmZM2cAN6b9cvWuefHO0bxjKfMADMRdiAQQL1JLKtsxoYyd/EImeVz5SWGUHdjsoHJ78Cs+WKOGVmQpcgG8fFxqtW4ZogqMMoY7kj1X6D/VObBzxIZZ1XDxtqDO2Qt7LufyrbLjZWnYiJCxCliBwBufauCMM0hOoVVJNun/WrrJyqyDEALJYOBG2ttuKhGkKpLmdmZlATKLC9+b1NMRRmSMAt6R67d7VUFvf86bnRfcmo5roRmsL7AaGtRKf5UVNUNhfKPc2opqYo21o06UdjR+lVATV+Cw32qch3yRIuaR/wqP54FVIgdgCyoOWbYVoTz4VcMuEwj5U+J5XQgu3X+hbSiuSSDNG0guqXsgO5quF5sK+eNih/f3FaBZZ5Ufy/KhACjIc6r/X1rUh8PkxYEUMFkc6W10/EzftWNaxDwvxnDk+XOq4Z2IOdQTESNsy8e4+tb2KxMc8kRa8MxW0bRsPvL/hc+ll/xP5ViYrwuB8ED5Aw+IWRobA75QTm+vNYsHiM+BDRIyyQMfVE4zI/e38i1TPxd/W1Lg0edkigMjLmLNhWyBrbnI2g+htXIJYJFhikw2JTDR5irZxclrXJNrcVUuOwM7KS82FtoUI8xPYG4Nu1SfxDBhFjzYjFKinIh+7jRuoAN6z7X00cJNFGR5MaQq2g8pvWRp859R9lAp4xicOiAGGwHmuxVBKw+Yk+o/WsE4/EiPJGwiW3qMYyk+53rlYszFmYsx5OpreVnWhNiWzqTjVLJezC7HU33tVaSGNX8kxSZ0KEZbmx6X571xlVubXHTSmq7njrTxw8kpktlCnNbnb6UhZfh1br/VMs0ihdAo1J6+9SssY5v+v+qqEYrm5bXpYm1FRLPfkdhRVRUKNrUDarsM0SS55xmVdQlr5j37VUdmHgGFgE8qgzSC8asL5V/ER1PH59KqkRYwYzrI/x/wCP+Pv1/KnLjhNMZGaTNvdt78HTarFkilbzJJkMjHVnJB9zpas2tSLPDcFIM8yO8IX51Nv+FekTFTeGiNsayo0i6yxqLqbXtIg39xXDgQkRBikMj5s12KSLp0AYe+1GOjSYM8jHzM+bM+GfX3IJv2rLSGMkmxOLHnYyG0qk+aWGVYxuR19t6w2VMTMy4aFgpaygm7Hpfud+1W4gjDSEeW0mGdrrnBBB6joac8vlYO8UyuZPQttwPmJ7nakK4sSqI4ijYMEHqYbE827VWPTbWmBbi9v3o0tW2EhqvFgajpe41p2FswO3FqeUD1EacDrVAB6SW+G+nU+1SylrE6LwB/FABY5n52A/7akz8A/X+u1RTL5dFt/VQPHegLdjt71IWBFtj+Ib0T+o+5NFWZen60UHODb2p24vSA/Ope1VCtob0W1tT0vtQd99etFLLdgNqsjlkhN45HQ9jaoDfT9ad9Tcb/vQN5JJTeR2cjkm9RtY3vpyRQuouaObUDN72t7CmeNj7Ugbdex6VIWNzYBRwBvQFhbM23A61JVznM2/Tr/qkBnOZh7D/uKbuCbX+vX/AFUUO97gH3PX/VQAza7W3NPLmIyjXmlfptwKImVGq20IuDveo7nt+1O5C2vYryP2qLHU2vagHszXF7cUU8o5ax6Woq6IAb+1F9f1oooGdDbgVHpRRRD5qVtew1tRRRURppxvUyoBoooEQMo70yLyheL5fpRRUEiTkHe/6cVWfitRRVhVigZ2j4AuOt6DpcjQmiisqgSTdeAafwi43vaiiqhUUUVUf//Z',
  'calça': 'data:image/jpeg;base64,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',
  'botas': 'data:image/jpeg;base64,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',
  'espada': 'data:image/jpeg;base64,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',
  'escudo': 'data:image/jpeg;base64,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',
  'cinto': 'data:image/jpeg;base64,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',
  'capa': 'data:image/jpeg;base64,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',
  'anel1': 'data:image/jpeg;base64,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',
  'anel2': 'data:image/jpeg;base64,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',
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

/* ============================== [11] FichaPersonagem ============================== */
function FichaPersonagem({ ac, lang, currentUserId, pjAtivoId, onVoltar, onTrocar, onEditar, onExcluir, isMestre }) {
  const en = lang === 'en';

  // Globals de fases anteriores — acesso via window para robustez,
  // pois nem todas são exportadas explicitamente por Object.assign/window.X.
  // Nota: habsByKey NÃO vem de global — é construído localmente a partir do
  // banco (tabela `habilidades`), pois HABILIDADES_BY_KEY nunca é exposto globalmente.
  const _slotLbls   = (typeof SLOT_LABELS           !== 'undefined' ? SLOT_LABELS           : null) || window.SLOT_LABELS           || {};
  const _bonusGA_fn = (typeof bonusGrupoArma         !== 'undefined' ? bonusGrupoArma         : null) || window.bonusGrupoArma         || (() => 0);
  const _totHab     = (typeof totalHabilidade        !== 'undefined' ? totalHabilidade        : null) || window.totalHabilidade        || (() => 0);
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
  const [acaoQtd, setAcaoQtd] = useState(null);               // { tipo:'usar'|'destruir', instanceId, max } p/ QuantidadeModal
  const [hoverTip, setHoverTip] = useState(null);              // tooltip de hover: { kind:'item', it, cat, x, y } (casa equipada/vestida) ou { kind:'cap', nome, descricao, x, y } (Habilidade/Magia/Técnica)
  const fileFotoRef = useRef(null);
  const estadoTimer = useRef(null);
  const hoverTipTimer = useRef(null);
  useEffect(() => {
    if (!fpFull) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setFpFull(false); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [fpFull]);

  // Fecha o editor de barra quando a barra alvo pode ter desmontado/movido.
  useEffect(() => { setEditBar(null); setMenuPecaId(null); setContFichaId(null); setDetalheCintoId(null); setAcaoQtd(null); setHoverTip(null); }, [fpTab, fpFull]);

  // Limpa o timer de hover ao desmontar (evita setHoverTip após unmount).
  useEffect(() => () => { if (hoverTipTimer.current) clearTimeout(hoverTipTimer.current); }, []);

  // Esc e travamento de scroll do menu de ação da peça já são responsabilidade
  // do ModalShell — não duplicar aqui (o ContainerModal trata o próprio Esc).

  // Tema claro "Página do Tomo": a ficha (Ficha/Inventário/Loja) agora é
  // sempre clara via CSS (ancorado em .fp-page), sem depender de classe no <body>.

  // Carregamento inicial — refaz quando troca de PJ ativo.
  useEffect(() => {
    if (!currentUserId || !pjAtivoId) return;
    let cancel = false;
    setError(null);
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

  // Derivações.
  const ficha = calcularFicha(pj, catalogoBySlug);
  const ataques = gerarAtaques(pj, catalogoBySlug, magiasByKey, ficha.atributos);
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

  const atributosFinais = ficha.atributos;
  const _calcBonus = (typeof calcBonusHabilidadesRacaReino !== 'undefined' ? calcBonusHabilidadesRacaReino : null) || window.calcBonusHabilidadesRacaReino || null;
  const bonusHabilidades = _calcBonus ? _calcBonus(pj.raca, pj.reino, habilidades) : {};

  const nomeCompleto = [pj.nome, pj.sobrenome].filter(Boolean).join(' ') || (en ? 'Unnamed' : 'Sem nome');
  const inicial = (pj.nome || nomeCompleto || '?').trim().charAt(0).toUpperCase();
  const fotoUrl = pj.foto_url || pj.foto || pj.avatar_url || null;
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
  const podeEditarInv = podeEditarFoto;
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

  // Estado atual salvo (valor corrente das barras) — separado do máximo derivado.
  const _est   = pj.estado_atual || {};
  const _vitAt = _est.vitalidade || {};
  const _condAt = _est.condicoes || {};
  const _clampVal = (v, mx) => {
    const n = Math.round(Number(v));
    return Math.max(0, Math.min(mx, Number.isFinite(n) ? n : mx));
  };

  // Barras de vitalidade. MÁXIMO derivado (calcularFicha); ATUAL editável
  // em estado_atual.vitalidade. Sem valor salvo → começa cheio (atual = máximo).
  // Ordem casa com a cascata de dano em batalha: EH → AR → EF, + Karma.
  const maxEF = Number(_d.energiaFisica) || 0;
  const maxEH = Number(_d.energiaHeroica) || 0;
  const maxKA = Number(_d.karmamax) || 0;
  const vitBars = [
    { key: 'ef', label: en ? 'Physical Energy' : 'Energia Física', val: _clampVal(_vitAt.ef ?? maxEF, maxEF), max: maxEF },
    { key: 'eh', label: en ? 'Heroic Energy' : 'Energia Heroica', val: _clampVal(_vitAt.eh ?? maxEH, maxEH), max: maxEH },
    { key: 'ar', label: en ? 'Armor' : 'Armadura', val: _clampVal(_vitAt.ar ?? arVal, arMax), max: arMax },
    { key: 'ka', label: en ? 'Karma' : 'Karma', val: _clampVal(_vitAt.ka ?? maxKA, maxKA), max: maxKA },
  ];

  // Condições (0–100). ATUAL editável em estado_atual.condicoes; sem valor → 100.
  const condBars = [
    { key: 'vitalidade', label: en ? 'Health' : 'Saúde', val: _clampVal(_condAt.vitalidade ?? 100, 100), max: 100, color: FICHA_VIT_COLORS.cond },
    { key: 'animo', label: en ? 'Sleep' : 'Sono', val: _clampVal(_condAt.animo ?? 100, 100), max: 100, color: FICHA_VIT_COLORS.cond },
    { key: 'hidratacao', label: en ? 'Hydration' : 'Hidratação', val: _clampVal(_condAt.hidratacao ?? 100, 100), max: 100, color: FICHA_VIT_COLORS.cond },
    { key: 'nutricao', label: en ? 'Feeding' : 'Alimentação', val: _clampVal(_condAt.nutricao ?? 100, 100), max: 100, color: FICHA_VIT_COLORS.cond },
    { key: 'termorregulacao', label: en ? 'Temperature' : 'Temperatura', val: _clampVal(_condAt.termorregulacao ?? 100, 100), max: 100, color: FICHA_VIT_COLORS.cond },
    { key: 'euforia', label: en ? 'Sobriety' : 'Sobriedade', val: _clampVal(_condAt.euforia ?? 100, 100), max: 100, color: FICHA_VIT_COLORS.cond },
    { key: 'sanidade', label: en ? 'Sanity' : 'Sanidade', val: _clampVal(_condAt.sanidade ?? 100, 100), max: 100, color: FICHA_VIT_COLORS.cond },
    { key: 'reputacao', label: en ? 'Reputation' : 'Reputação', val: _clampVal(_condAt.reputacao ?? 100, 100), max: 100, color: FICHA_VIT_COLORS.cond },
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

  // Dedos/Joias (até 2): lê direto dos itens equipados/vestidos cujo slot é de joia.
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
    const _ic = FP_REGION_ICON[regiao];
    const iconClass = _ic || (catOk ? _itemIcon(cat) : 'ti-shield-off');
    const itemBg = catOk ? FP_ITEM_BG[(cat.nome || '').trim().toLowerCase()] : null;
    // Placeholder da região: aparece mesmo com a casa vazia (foto esmaecida)
    // e serve de fallback pra item equipado sem arte própria.
    const regionBg = FP_REGION_BG[regiao] || null;
    const bg = itemBg || regionBg;
    const ghost = !filled && !!bg;   // casa vazia exibindo a arte do tipo de peça
    // Hover/foco mostra o tooltip de detalhes (Descrição/Absorção/Dano); some
    // ao sair do botão. O delay curto de saída evita flicker ao mover o
    // mouse entre a casa e a borda do tooltip.
    const abrirTip = (e) => {
      if (!filled) return;
      if (hoverTipTimer.current) { clearTimeout(hoverTipTimer.current); hoverTipTimer.current = null; }
      const r = e.currentTarget.getBoundingClientRect();
      setHoverTip({ kind: 'item', it, cat, x: r.left + r.width / 2, y: r.top });
    };
    const fecharTip = () => {
      if (hoverTipTimer.current) clearTimeout(hoverTipTimer.current);
      hoverTipTimer.current = setTimeout(() => setHoverTip(null), 80);
    };
    return (
      <button
        key={key}
        type="button"
        className={'inv-slot' + (filled ? ' filled' : ' empty')
          + (filled && bg ? ' has-img' : '')
          + (ghost ? ' bg-ghost' : '')}
        style={fpItemBgStyle(bg, ghost)}
        disabled={!filled || !podeEditarInv}
        onClick={filled && podeEditarInv ? () => { setHoverTip(null); setMenuPecaId(it.instanceId); } : undefined}
        onMouseEnter={abrirTip}
        onMouseLeave={fecharTip}
        onFocus={abrirTip}
        onBlur={fecharTip}
        title={filled ? undefined : lbl}>
        {!bg && (
        <span className="inv-slot-ic">
          <i className={'ti ' + iconClass} aria-hidden="true" />
        </span>
        )}
        <span className="inv-slot-meta">
          {filled
            ? <span className="inv-slot-item">{nomeLbl}</span>
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
  const temArmas = ataques.length > 0;
  const temHab = catalogoHab.length > 0;
  const temMag = _usaMagia_fn(pj.profissao) && catalogoMag.length > 0;
  const temTec = catalogoTec.length > 0;
  const temTriad = temHab || temMag || temTec;
  // Quantos cartões da tríade vão aparecer (1, 2 ou 3) — usado para o
  // grid se reequilibrar e preencher a linha toda quando algum setor
  // (ex.: Magias, em PJ sem magia) não tiver conteúdo.
  const triCount = [temHab, temMag, temTec].filter(Boolean).length;

  const elVit = <FichaVitBars bars={vitBars} scope="vit" onEdit={podeEditarEstado ? abrirEdicaoBarra : undefined} en={en} />;

  // Condições com o MESMO visual das barras de vitalidade (FichaVitBars).
  // Cor por nível (verde → âmbar → vermelho). Lista única (não mais 2
  // colunas pares/ímpares) — o layout empilha de qualquer forma na maioria
  // dos breakpoints, e a divisão em 2 <FichaVitBars> quebrava a divisória
  // entre o último item de uma coluna e o primeiro da outra (Sanidade↔Sono).
  const condVitBars = condBars.map((c) => {
    const pct = c.max > 0 ? Math.max(0, Math.min(1, c.val / c.max)) : 0;
    return { ...c, color: fichaCondColor(pct) };
  });
  const elCond = (
    <div className="fp-cond-vit">
      <FichaVitBars bars={condVitBars} scope="cond" onEdit={podeEditarEstado ? abrirEdicaoBarra : undefined} en={en} />
    </div>
  );

  const elDefesa = fpBodyGrid();

  const elArmas = (
    <table className="fp-atk">
      <thead>
        <tr>
          <th className="c-nome">{en ? 'Weapon' : 'Arma'}</th>
          <th className="c-range">{en ? 'Range' : 'Alcance'}</th>
          <th className="c-dano">Total</th>
          <th className="c-dano">L</th>
          <th className="c-dano">M</th>
          <th className="c-dano">P</th>
          <th className="c-dano">25%</th>
          <th className="c-dano">50%</th>
          <th className="c-dano">75%</th>
          <th className="c-dano">100%</th>
        </tr>
      </thead>
      <tbody>
        {ataques.length === 0 ? (
          <tr><td colSpan={10} className="fp-empty"></td></tr>
        ) : ataques.map((a, i) => {
          const armaCat = a.slug ? catalogoBySlug[a.slug] : null;
          const grupoSigla = armaCat?.grupo_armas || null;
          const bonusGA = _bonusGA_fn(grupoSigla, pj.grupos_armas || {});
          const ap = (v) => (v != null ? v + bonusGA : null);
          const tip = (col, base) =>
            (bonusGA > 0 && base != null) ? `${col}: ${base} + ${bonusGA} (${grupoSigla})` : undefined;
          const cell = (base, col) => {
            const ef = ap(base);
            if (ef == null) return '—';
            if (bonusGA > 0 && base != null) return <span style={{ color: 'var(--fp-gold)' }}>{ef}</span>;
            return ef;
          };
          return (
            <tr key={i}>
              <td className="c-nome">{a.nome}</td>
              <td className="c-range">{a.alcance ? `${a.alcance}m` : '—'}</td>
              <td className="c-dano">—</td>
              <td className="c-dano" title={tip('L', a.dano_l)}>{cell(a.dano_l, 'L')}</td>
              <td className="c-dano" title={tip('M', a.dano_m)}>{cell(a.dano_m, 'M')}</td>
              <td className="c-dano" title={tip('P', a.dano_p)}>{cell(a.dano_p, 'P')}</td>
              <td className="c-dano">{Math.floor(a.dano * 1 / 4)}</td>
              <td className="c-dano">{Math.floor(a.dano * 2 / 4)}</td>
              <td className="c-dano">{Math.floor(a.dano * 3 / 4)}</td>
              <td className="c-dano">{a.dano}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  // Hover do nome de Habilidade/Magia/Técnica (aba Capacidades): mesmo padrão
  // do tooltip dos itens equipáveis (fpSlotTile), só com Descrição. Reusa o
  // estado hoverTip/hoverTipTimer — kind:'cap' distingue do kind:'item'.
  const abrirTipCap = (nome, descricao) => (e) => {
    if (hoverTipTimer.current) { clearTimeout(hoverTipTimer.current); hoverTipTimer.current = null; }
    const r = e.currentTarget.getBoundingClientRect();
    setHoverTip({ kind: 'cap', nome, descricao, x: r.left + r.width / 2, y: r.top });
  };
  const fecharTipCap = () => {
    if (hoverTipTimer.current) clearTimeout(hoverTipTimer.current);
    hoverTipTimer.current = setTimeout(() => setHoverTip(null), 80);
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
              onMouseLeave={fecharTipCap}
              onFocus={abrirTipCap(h.nome, h.descricao)}
              onBlur={fecharTipCap}
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
              onMouseLeave={fecharTipCap}
              onFocus={abrirTipCap(m.nome, m.descricao)}
              onBlur={fecharTipCap}
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
              onMouseLeave={fecharTipCap}
              onFocus={abrirTipCap(t.nome, t.descricao)}
              onBlur={fecharTipCap}
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

  const colEsq = (
    <div className="fp2-col">
      {fpGroup(slotLbl('peito'),  'peito',  1)}
      {fpGroup(slotLbl('pernas'), 'pernas', 1)}
      {fpGroup(slotLbl('pes'),    'pes',    1)}
    </div>
  );
  const colDir = (
    <div className="fp2-col fp2-col--right">
      {fpGroup(slotLbl('ombros'),  'ombros',  1)}
      {fpGroup(slotLbl('bracos'),  'bracos',  1)}
      {fpGroup(slotLbl('cintura'), 'cintura', 1)}
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

  // Fileira de equipamento (arranjo da referência):
  //   • topo:    Brinco · Cabeça · Capa · Colar (4 casas — 1 slot cada)
  //   • corpo:   col esq (Peito/Pernas/Pés) · retrato · col dir (Ombros/Braços/Cinto)
  //   • base:    Joia · Mão · Mão · Joia (2 joias flanqueando as 2 mãos — 1 slot cada)
  const equipRow = (
    <div className="fp2-equip-wrap">
      <div className="fp2-head-row">
        {fpGroup(slotLbl('orelha'),  'orelha',  1)}
        {fpGroup(slotLbl('cabeca'),  'cabeca',  1)}
        {fpGroup(slotLbl('capa'),    'capa',    1)}
        {fpGroup(slotLbl('pescoco'), 'pescoco', 1)}
      </div>

      <div className="fp2-equip">
        {colEsq}
        <div className="fp2-stage">
        <div className="fp2-sigil" aria-hidden="true">
          <svg viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="92" />
            <circle cx="100" cy="100" r="70" className="dash" />
            {Array.from({ length: 24 }).map((_, i) => {
              const a = (i / 24) * Math.PI * 2;
              return <line key={i} x1={100 + 80 * Math.cos(a)} y1={100 + 80 * Math.sin(a)} x2={100 + 88 * Math.cos(a)} y2={100 + 88 * Math.sin(a)} />;
            })}
          </svg>
        </div>
        <div
          className={'fp2-portrait' + (podeEditarFoto ? ' is-editable' : '') + (!fotoUrl ? ' is-empty' : '')}
          onClick={podeEditarFoto && !fotoUploading ? () => { if (fileFotoRef.current) fileFotoRef.current.click(); } : undefined}
          title={podeEditarFoto ? (en ? 'Change photo' : 'Trocar foto') : undefined}
        >
          {fotoUrl
            ? <img src={fotoUrl} alt={nomeCompleto} className="fp2-portrait-img" />
            : <span className="fp2-mono">{inicial}</span>}
          {podeEditarFoto && (
            <span className="fp2-portrait-cam">
              <i className={'ti ' + (fotoUploading ? 'ti-loader-2 fp-spin' : 'ti-camera')} aria-hidden="true" /> {en ? 'portrait' : 'retrato'}
            </span>
          )}
          {podeEditarFoto && <input ref={fileFotoRef} type="file" accept="image/*" hidden onChange={handleFotoChange} />}
        </div>
        <div className="fp2-name-block">
          <h2 className="fp2-name">{nomeCompleto}</h2>
        </div>
      </div>
      {colDir}
      </div>

      {/* base: 2 joias flanqueando as 2 mãos (Joia · Mão · Mão · Joia) */}
      <div className="fp2-fingers-row">
        <div className="fp2-slotgroup" key="dedo-grp-0">
          <div className="fp2-slot-cluster">{fpSlotTile('dedos', ocupanteDedo(0), 'dedo-0')}</div>
        </div>
        {fpHand('mao_e', 'arma-e')}
        {fpHand('mao_d', 'arma-d')}
        <div className="fp2-slotgroup" key="dedo-grp-1">
          <div className="fp2-slot-cluster">{fpSlotTile('dedos', ocupanteDedo(1), 'dedo-1')}</div>
        </div>
      </div>
    </div>
  );

  // Coluna direita: informações de combate (Atributos + Combate),
  // empilhadas verticalmente, ao lado do mapa de equipamento.
  const combatPanels = (    
    <div className="fp2-combat-col">
      <section className="fp2-panel">
        <header className="fp2-panel-head"><i className="ti ti-star" /><h3>{en ? 'Attributes' : 'Atributos'}</h3></header>
        <div className="fp2-panel-body">
          {ATTR_DEFS.map(([k, lbl]) => fp2Stat(lbl, atributosFinais?.[k] ?? '—'))}
        </div>
      </section>

      <section className="fp2-panel">
        <header className="fp2-panel-head"><i className="ti ti-crosshair" /><h3>{en ? 'Combat' : 'Combate'}</h3></header>
        <div className="fp2-panel-body">
          {fp2Stat(en ? 'Defense' : 'Defesa', _d.defesa ?? '—', true)}
          {fp2Stat(en ? 'Speed' : 'Velocidade', velocidade ?? '—')}
          {fp2Stat(en ? 'Physical Resistance' : 'Resistência Física', _d.rf ?? _d.resistenciaFisica ?? '—')}
          {fp2Stat(en ? 'Magic Resistance' : 'Resistência Mágica', _d.rm ?? _d.resistenciaMagica ?? '—')}
        </div>
      </section>
    </div>
  );

  // Coluna esquerda: Vitalidade + Condições (antes ficavam abaixo das colunas).
  const vitCondCol = (
    <div className="fp2-vitcond-col">
      <section className="fp2-panel fp2-vit-section">
        <header className="fp2-panel-head"><i className="ti ti-bolt" /><h3>{en ? 'Vitality' : 'Vitalidade'}</h3></header>
        <div className="fp2-panel-body fp2-vit-band">{elVit}</div>
      </section>

      <section className="fp2-panel">
        <header className="fp2-panel-head"><i className="ti ti-activity-heartbeat" /><h3>{en ? 'Conditions' : 'Condições'}</h3></header>
        <div className="fp2-panel-body fp2-cond-wrap fp2-cond-single">{elCond}</div>
      </section>
    </div>
  );

  // Abaixo das três colunas, em largura cheia: só o arsenal.
  // A tríade (Habilidades/Magias/Técnicas) saiu daqui e virou a aba "Capacidades"
  // (ícone masks-theater) — ver `capacidadesContent` logo abaixo.
  const lowerRest = (
    <>
      {temArmas && (
        <section className="fp2-panel fp2-wide">
          <header className="fp2-panel-head"><i className="ti ti-swords" /><h3>{en ? 'Arsenal' : 'Arsenal'}</h3></header>
          <div className="fp2-panel-body fp2-arsenal">{elArmas}</div>
        </section>
      )}
    </>
  );

  // Conteúdo da aba "Capacidades": Habilidades / Magias / Técnicas (3 cartões),
  // com empty-state quando o PJ não tem nenhuma das três.
  const capacidadesContent = (
    temTriad ? (
      <div className={'fp2-tri fp2-triad fp2-tri--' + triCount}>
        {temHab && (
          <section className="fp2-panel">
            <header className="fp2-panel-head"><i className="ti ti-tools" /><h3>{en ? 'Skills' : 'Habilidades'}</h3></header>
            <div className="fp2-panel-body">{elHab}</div>
          </section>
        )}
        {temMag && (
          <section className="fp2-panel">
            <header className="fp2-panel-head"><i className="ti ti-meteor" /><h3>{en ? 'Spells' : 'Magias'}</h3></header>
            <div className="fp2-panel-body">{elMag}</div>
          </section>
        )}
        {temTec && (
          <section className="fp2-panel">
            <header className="fp2-panel-head"><i className="ti ti-bow" /><h3>{en ? 'Techniques' : 'Técnicas'}</h3></header>
            <div className="fp2-panel-body">{elTec}</div>
          </section>
        )}
      </div>
    ) : (
      <section className="fp2-panel fp2-wide">
        <div className="fp2-panel-body" style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '28px 12px' }}>
          {en ? 'This character has no skills, spells or techniques.' : 'Este personagem não tem habilidades, magias ou técnicas.'}
        </div>
      </section>
    )
  );

  return (
    <div className={'menestrel-ui fp-page' + (fpFull ? ' is-full' : '') + ((fpTab === 'inventario' || fpTab === 'loja' || fpTab === 'diario') ? ' is-inv' : '')}>

      {/* ── Abas: personagens (voltar) · Ficha · Inventário · Loja + layout/tela cheia à direita ── */}
      <div className="fp-tabs" role="tablist" style={{ flexWrap: 'wrap' }}>
        <button className="fp-tab fp-tab--icon" onClick={onVoltar} title={en ? 'Back to characters' : 'Voltar aos personagens'}>
          <i className="ti ti-arrow-left" aria-hidden="true" />
        </button>
        <button className={'fp-tab fp-tab--icon' + (fpTab === 'ficha' ? ' on' : '')} role="tab" aria-selected={fpTab === 'ficha'} onClick={() => setFpTab('ficha')} title={en ? 'Sheet' : 'Ficha'} aria-label={en ? 'Sheet' : 'Ficha'}>
          <i className="ti ti-user" aria-hidden="true" />
        </button>
        <button className={'fp-tab fp-tab--icon' + (fpTab === 'capacidades' ? ' on' : '')} role="tab" aria-selected={fpTab === 'capacidades'} onClick={() => setFpTab('capacidades')} title={en ? 'Skills, Spells & Techniques' : 'Magias, Técnicas e Habilidades'} aria-label={en ? 'Skills, Spells & Techniques' : 'Magias, Técnicas e Habilidades'}>
          <i className="ti ti-user-bolt" aria-hidden="true" />
        </button>
        <button className={'fp-tab fp-tab--icon' + (fpTab === 'inventario' ? ' on' : '')} role="tab" aria-selected={fpTab === 'inventario'} onClick={() => setFpTab('inventario')} title={en ? 'Inventory' : 'Inventário'} aria-label={en ? 'Inventory' : 'Inventário'}>
          <i className="ti ti-backpack" aria-hidden="true" />
        </button>
        <button className={'fp-tab fp-tab--icon' + (fpTab === 'loja' ? ' on' : '')} role="tab" aria-selected={fpTab === 'loja'} onClick={() => setFpTab('loja')} title={en ? 'Shop' : 'Loja'} aria-label={en ? 'Shop' : 'Loja'}>
          <i className="ti ti-building-store" aria-hidden="true" />
        </button>
        <button className={'fp-tab fp-tab--icon' + (fpTab === 'diario' ? ' on' : '')} role="tab" aria-selected={fpTab === 'diario'} onClick={() => setFpTab('diario')} title={en ? 'Journal' : 'Diário'} aria-label={en ? 'Journal' : 'Diário'}>
          <i className="ti ti-notebook" aria-hidden="true" />
        </button>

        {onEditar && (
          <button className="fp-tab fp-tab--icon" onClick={onEditar} title={en ? 'Edit character' : 'Editar personagem'} aria-label={en ? 'Edit character' : 'Editar personagem'}>
            <i className="ti ti-pencil" aria-hidden="true" />
          </button>
        )}
        {onExcluir && (
          <button className="fp-tab fp-tab--icon fp-tab--danger" style={{ marginLeft: 'auto' }} onClick={onExcluir} title={en ? 'Delete character' : 'Excluir personagem'} aria-label={en ? 'Delete character' : 'Excluir personagem'}>
            <i className="ti ti-trash" aria-hidden="true" />
          </button>
        )}
      </div>

      {fpTab === 'inventario' ? (
        <div className="fp-invtab">
          <InventarioList ac={ac} lang={lang} currentUserId={currentUserId} pjIdFixo={pjAtivoId} key={pjAtivoId} onInventarioChange={(novoInv) => setPj((prev) => prev ? { ...prev, inventario: novoInv } : prev)} maximos={{ ef: maxEF, eh: maxEH, ka: maxKA, ar: arMax }} />
        </div>
      ) : fpTab === 'loja' ? (
        <div className="fp-invtab">
          <LojaJogador ac={ac} lang={lang} currentUserId={currentUserId} pjIdFixo={pjAtivoId} key={pjAtivoId} />
        </div>
      ) : fpTab === 'diario' ? (
        <div className="fp-invtab">
          <DiarioView pj={pj} lang={lang} key={pjAtivoId} />
        </div>
      ) : fpTab === 'capacidades' ? (
        <div className="fp2-sheet">
          <div className="fp2-frame">
            <div className="inv-divider">
              <span className="inv-divider-ln" />
              <span className="inv-divider-lbl">
                <i className="ti ti-user-bolt" aria-hidden="true" />
              </span>
              <span className="inv-divider-ln" />
            </div>            
            {capacidadesContent}
          </div>
        </div>
      ) : (
      <div className="fp2-sheet">
        <div className="fp2-frame">
          <div className="inv-divider">
            <span className="inv-divider-ln" />
            <span className="inv-divider-lbl">
              <i className="ti ti-user" aria-hidden="true" />
            </span>
            <span className="inv-divider-ln" />
          </div>          

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

      {/* Tooltip de hover: Descrição/Absorção/Dano (casa equipada/vestida,
          kind:'item') ou só Descrição (nome de Habilidade/Magia/Técnica na
          aba Capacidades, kind:'cap'). Mesmo componente/posicionamento pros
          dois — some sozinho ao tirar o mouse (fecharTip/fecharTipCap com
          delay curto). Não compete com cliques — é leitura rápida only. */}
      {hoverTip && hoverTip.kind === 'item' && hoverTip.it && (() => {
        const { it, cat, x, y } = hoverTip;
        if (!cat) return null;
        const nome = cat.nome || it.slug;
        const desc = cat.descricao || cat.efeito || null;
        const abs = Number(cat.absorcao) || 0;
        const temDano = cat.dano != null;
        const acaoLbl = (cat && _ehContainer(cat))
          ? (en ? 'Open / Take off' : 'Abrir / Despir')
          : (it.vestido ? (en ? 'Take off' : 'Despir') : (en ? 'Unequip' : 'Desequipar'));
        return (
          <div
            className="fp-item-tip"
            style={{ left: x, top: y }}
            onMouseEnter={() => { if (hoverTipTimer.current) { clearTimeout(hoverTipTimer.current); hoverTipTimer.current = null; } }}
            onMouseLeave={() => { hoverTipTimer.current = setTimeout(() => setHoverTip(null), 80); }}
          >
            <div className="fp-item-tip-title">{nome}</div>
            {desc && <p className="fp-item-tip-desc">{cat.descricao || ''}{cat.descricao && cat.efeito ? ' ' : ''}{cat.efeito && <em>{en ? 'Effect' : 'Efeito'}: {cat.efeito}</em>}</p>}
            {(abs > 0 || temDano) && (
              <div className="fp-item-tip-stats">
                {temDano && <span className="fp-item-tip-stat">{en ? 'Damage' : 'Dano'} <b>{cat.dano}</b></span>}
                {abs > 0 && <span className="fp-item-tip-stat">{en ? 'Absorb' : 'Absorção'} <b>{abs}</b></span>}
              </div>
            )}
            {podeEditarInv && <div className="fp-item-tip-hint">{acaoLbl}</div>}
          </div>
        );
      })()}

      {hoverTip && hoverTip.kind === 'cap' && (() => {
        const { nome, descricao, x, y } = hoverTip;
        if (!descricao) return null;
        return (
          <div
            className="fp-item-tip"
            style={{ left: x, top: y }}
            onMouseEnter={() => { if (hoverTipTimer.current) { clearTimeout(hoverTipTimer.current); hoverTipTimer.current = null; } }}
            onMouseLeave={() => { hoverTipTimer.current = setTimeout(() => setHoverTip(null), 80); }}
          >
            <div className="fp-item-tip-title">{nome}</div>
            <p className="fp-item-tip-desc">{descricao}</p>
          </div>
        );
      })()}

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
                    <button className="det-act det-act-primary"
                      onClick={() => { setMenuPecaId(null); setContFichaId(it.instanceId); }}>
                      <span className="det-act-lbl">{en ? 'Open' : 'Abrir'}</span>
                    </button>
                  )}
                  <button className={'det-act' + (isCont ? '' : ' det-act-primary')}
                    onClick={() => { setMenuPecaId(null); desequiparFicha(it.instanceId); }}>
                    <span className="det-act-lbl">{despirLbl}</span>
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
    </div>
  );
}


window.FichaPersonagem = FichaPersonagem;
