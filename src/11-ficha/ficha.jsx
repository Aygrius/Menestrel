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
     • Arsenal      — SAIU em 27/10/2026 ("remova o card 'armas' das fichas")

   Header no topo (mesmo molde de Convites/Batalhas/Lore: ms-header +
   ficha-page-header — seta de voltar, eyebrow "PERSONAGEM", título com o
   nome do PJ, abas como segmented control — diario-subtabs com
   btn-primary/btn-ghost — e editar/excluir como btn-icon à direita): Ficha ·
   Inventário · Loja · Diário. "Capacidades" não é mais uma aba separada —
   virou um card lateral (abas internas Atributos/Magias/Técnicas/
   Habilidades, agora em best-chip/best-chip--icon) dentro da própria aba
   Ficha, ao lado do boneco de armar.

   Desequipar uma peça (clique na casa) devolve o item ao
   inventário (limpa equipado/slot) e grava só essa mudança por
   gravarInventario (trava de versão + mescla), sem sobrescrever o
   que mudou por fora (02/10/2026).

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
   - (onTrocar saiu em 12/09/2026: trocar de PJ exige desativar antes — ver
     desativarPj em 08-personagens. O prop era morto e contradizia a regra.)

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

/* Profissões SEM Karma: NENHUMA desde 23/10/2026. Até então Guerreiro e
   Ladino não conjuravam e a barra sumia da ficha deles (15/09/2026). Agora
   todos podem usar magia (sem impedimento de profissão nem de raça), e o
   usuário pediu: "caso o personagem tenha karma, mostre a barra de karma de
   todos". Quem mostra ou não a barra é o máximo de Karma (Aura), não a
   profissão. O conjunto fica vazio para os leitores antigos (window.SEM_KARMA). */
const SEM_KARMA = new Set();

/* Cor de NÍVEL (15/09/2026): roxo embaixo, branco no meio, verde em cima.
   Vale para toda barra sem cor própria e tinge o ícone de TODAS elas — o
   círculo colorido atrás do ícone saiu. */
const COR_NIVEL_BAIXO = '#9150A0';
const COR_NIVEL_MEIO  = '#E8DDC6';
const COR_NIVEL_ALTO  = '#3E9B52';
function corNivelBarra(pct) {
  const p = Number(pct) || 0;
  if (p >= 0.6) return COR_NIVEL_ALTO;
  if (p >= 0.25) return COR_NIVEL_MEIO;
  return COR_NIVEL_BAIXO;
}

/* Cores FIXAS por stat (decisão do usuário, valendo também para o combate):
   EF vermelha, EH amarela, Karma azul, resistência de item branca. */
const FICHA_VIT_COLORS = {
  // Física, Heroica e Karma nas cores dos tubos do Resumo (23/10/2026): a
  // Heroica ficou verde. A mesma tabela pinta os cartões de personagem.
  ef: '#A3291A',   // Energia Física — vermelho
  eh: '#4E9A3E',   // Energia Heroica — verde
  ar: '#8c8d8e',   // Armadura — aço frio
  res: '#E8DDC6',  // Resistência do item — branca
  ka: '#3558B0',   // Karma — azul
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

/* `semNome` (27/09/2026): "Remova o nome das barras [...] Adicione um tooltip
   para informar o que é a barra." Nas barras de condição o nome sai de cima
   e vai para o tooltip, junto com o valor — a barra inteira responde ao hover.
   No mesmo dia valeu também para Vitalidade (EF/EH/Karma) e Experiência:
   "Remova o nome das barras da ficha (ef, eh, etc)". A barra com `edit`
   (Experiência) desenha o progresso no estágio mas conta XP total — é esse
   que o tooltip mostra, e não o "6 de 14" de dentro da faixa. */
/* `numero` (22/10/2026): o valor ao lado da barra, sem o nome (que segue no
   tooltip). Antes só aparecia ao passar o mouse — e no toque não há mouse. */
function FichaVitBars({ bars, showValue, scope, onEdit, en, onHover, onHoverEnd, semNome, numero }) {
  const [tip, abrirTip, fecharTip, manterTip] = useTooltip(60);
  const editable = typeof onEdit === 'function';
  const hasHover = typeof onHover === 'function';
  return (
    <div className={'fp-bars' + (showValue ? ' with-val' : '')}>
      {bars.map((b) => {
        const _lo = b.min ?? 0;
        const _span = b.max - _lo;
        const pct = _span > 0 ? Math.max(0, Math.min(1, (b.val - _lo) / _span)) : 0;
        const empty = pct <= 0;
        /* As legendas narrativas ("Disposto", "Corajoso", "Ferido"…) saíram das
           barras em 15/09/2026, a pedido do usuário: o número já diz tudo. */
        // Teto 0 = não há o que editar (AR sem armadura equipada, KA com a
        // Aura abaixo de 1). abrirEdicaoBarra já recusava, mas em SILÊNCIO: a
        // linha continuava com cara de botão, cursor de clique e papel de
        // button, e o clique não fazia nada nem dizia por quê (03/09/2026).
        // Agora ela some da navegação e explica no tooltip — ver o `tip`
        // montado junto de vitBars.
        const semTeto = (b.max ?? 0) === 0;
        // `semEdicao`: barra DERIVADA de outra fonte (a resistência da armadura
        // vem das peças do inventário) — clicar não abre o editor de estado.
        const podeAbrir = editable && !semTeto && !b.semEdicao;
        const abrir = podeAbrir
          ? (e) => onEdit(b, scope, e.currentTarget.getBoundingClientRect())
          : undefined;
        /* SÓ HÁ TOOLTIP SE HOUVER TEXTO (17/09/2026): "os tooltips das barras
           na ficha estão bugados, onde não há texto, aparece um tooltip
           vazio." `{ desc: undefined }` é um objeto — portanto verdadeiro —,
           então a barra sem `tip` (a maioria: EF, EH, Combate, Estágio)
           abria um balão com nada dentro. */
        const tipContent = !hasHover ? null
          : semNome
            ? { title: b.label, desc: [b.edit && b.edit.val != null ? `${b.edit.val} XP` : `${b.val} ${en ? 'of' : 'de'} ${b.max}`, b.tip].filter(Boolean).join(' — ') }
            : (b.tip ? { desc: b.tip } : null);
        const hoverTip = hasHover && tipContent ? {
          onMouseEnter: (e) => onHover(e, tipContent), onMouseLeave: onHoverEnd,
          onFocus: (e) => onHover(e, tipContent), onBlur: onHoverEnd,
        } : {};

        // Cor da barra: b.color quando definido pelo pai (condições, combatBars),
        // senão cor fixa da chave (EF/EH/AR/KA/Estágio).
        const barColor = b.color || FICHA_VIT_COLORS[b.key] || '#888';

        // Fundo do ícone dinâmico por pct — igual ao padrão das condições:
        // verde cheio · cinza médio · vermelho baixo. Aplica-se a TODAS as
        // barras (incluindo EF/EH/AR/KA) via style inline, sobrescrevendo o
        // color-mix do CSS que usava --bar-c (cor fixa da barra).
        /* Ícone SEMPRE dourado (16/09/2026): sem círculo e sem mudar de cor
           com o nível — quem conta o nível é o preenchimento da barra. */
        const iconColor = '#C9A44E';

        return (
          <div
            key={b.key}
            className={'fp-bar-row' + (podeAbrir ? ' is-editable' : '')}
            style={{ '--bar-c': barColor }}
            onClick={abrir}
            role={podeAbrir ? 'button' : undefined}
            tabIndex={podeAbrir ? 0 : undefined}
            onKeyDown={podeAbrir ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(e); }
            } : undefined}
            {...propsTip(abrirTip, fecharTip, !hasHover && podeAbrir && !numero ? `${b.val}/${b.max}` : undefined)}
          >
            {!semNome && (
            <span className="fp-bar-name-label">
              {b.label}
              {/* O selo ao lado do nome (a absorção da armadura, 12/09/2026)
                  saiu em 14/09/2026: a absorção fica no tooltip da barra. */}
            </span>
            )}
            <div className="fp-bar-pill" aria-label={semNome ? b.label : undefined} {...(semNome ? hoverTip : {})}>
              {b.icon && (
                <span className="fp-bar-icon" aria-hidden="true"
                  style={{ color: iconColor }}>
                  <i className={'ti ' + b.icon} />
                </span>
              )}
              <div
                className={'fp-bar-track' + (empty ? ' is-empty' : '')}
                {...(semNome ? {} : hoverTip)}
                {...propsTip(abrirTip, fecharTip, !hasHover && !editable && !numero ? `${b.val}${showValue ? '/' + b.max : ''}` : undefined)}
              >
                {!empty && (
                  <div className="fp-bar-fill" style={{ width: (pct * 100) + '%' }}>
                    <span className="fp-bar-tip" />
                  </div>
                )}
              </div>
              {numero && (
                /* `txt`/`txtMax` (27/10/2026): o número ESCRITO, quando ele
                   não é o mesmo que a conta da barra. A Carga do bicho tem
                   casa decimal (uma sela ocupa 6,5) e aqui saía "96.5", com
                   ponto — `b.val` alimenta a largura e não pode virar texto
                   localizado. XP e energias, que são inteiras, seguem sem
                   passar nada. */
                <span className="fp-bar-num" aria-hidden="true">
                  {b.edit && b.edit.val != null
                    ? <>{b.edit.val}{b.teto != null && <i>/{b.teto}</i>}</>
                    : <>{b.txt ?? b.val}<i>/{b.txtMax ?? b.max}</i></>}
                </span>
              )}
            </div>
            {showValue && (
              <span className="fp-bar-val">{b.val}<i> de {b.max}</i></span>
            )}
          </div>
        );
      })}
      <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </div>
  );
}

/* ============================== [11] Gemas e medalhões do Resumo ============================== */
/* O RESUMO REDESENHADO (23/10/2026), aprovado com o usuário na prévia
   preview/resumo.html ("Perfeito, pode aplicar"):

   - Energia (esquerda): Física, Heroica e Karma eram TUBOS de alquimista; em
     27/10/2026 viraram PEDRAS — rubi, esmeralda e safira. Ver o bloco das
     gemas, logo abaixo, para o talhe, a luz e a animação.
   - A Energia Física vai abaixo de zero (até −15, a morte — EF_MORTE da
     batalha): em zero o personagem desmaia, e daí para baixo a pedra enche de
     brasa apagada e trinca, conforme se aproxima do −15.
   - Condições (direita): cada uma é um MEDALHÃO — a pintura no meio (por ora o
     ícone; as pinturas do Figma entram aqui, ver .impeccable/arte-equipamentos.md)
     e, em volta, um tubo curvado com o mesmo desenho, em roxo, até a
     porcentagem. Sem texto: nome e valor ficam no tooltip.

   Os dois seguem o contrato do FichaVitBars: `onEdit(b, scope, rect)` abre o
   editor do Mestre, `onHover(e, tip)` mostra o tooltip, `semEdicao` (Pesado) e
   teto 0 (Karma sem Aura) não abrem nada. */
const EF_PISO = -15;   // a morte (EF_MORTE em 12-batalha/batalha.jsx)

function usarAbrirMedida(b, scope, onEdit, onHover, onHoverEnd, en) {
  const podeAbrir = typeof onEdit === 'function' && (b.max ?? 0) !== 0 && !b.semEdicao;
  const abrir = podeAbrir ? (e) => onEdit(b, scope, e.currentTarget.getBoundingClientRect()) : undefined;
  const dica = typeof onHover === 'function'
    ? { title: b.label, desc: [b.descVal || `${b.val} ${en ? 'of' : 'de'} ${b.max}`, b.tip].filter(Boolean).join(' — ') }
    : null;
  return {
    className: podeAbrir ? ' is-editable' : '',
    props: {
      onClick: abrir,
      role: podeAbrir ? 'button' : undefined,
      tabIndex: podeAbrir ? 0 : undefined,
      'aria-label': `${b.label}: ${b.descVal || b.val}`,
      onKeyDown: podeAbrir ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(e); } } : undefined,
      ...(dica ? {
        onMouseEnter: (e) => onHover(e, dica), onMouseLeave: onHoverEnd,
        onFocus: (e) => onHover(e, dica), onBlur: onHoverEnd,
      } : {}),
    },
  };
}

/* ── AS ENERGIAS VIRARAM PEDRAS (27/10/2026) ───────────────────────────────
   "Eu quero mudar as barras de energias, é possível transformá-las em pedras
   (gemas preciosas) animadas? Seria uma pedra rubi, uma pedra esmeralda e uma
   pedra safira." (usuário)

   Rubi é a Física, esmeralda é a Heroica, safira é o Karma — as três já eram
   vermelho, verde e azul na tabela de cores da ficha, então a troca não muda
   o que a cor significa em lugar nenhum do sistema.

   COMO A PEDRA CONTA O NÚMERO. A pedra está sempre INTEIRA: o que muda é a
   luz dentro dela. A lapidação é desenhada duas vezes, faceta por faceta —
   uma em pedra morta (quase preta, com o corte ainda visível) e outra viva,
   recortada de baixo para cima na fração da energia. Cheia, a gema arde;
   vazia, é um seixo escuro com o mesmo talhe. É a mesma leitura do tubo
   (quanto subiu), com a vantagem de o talhe não mudar de tamanho.

   TRÊS TALHES, TRÊS SILHUETAS, para a pedra se reconhecer antes da cor — que
   é o que o daltônico e o canto do olho precisam:

     rubi        brilhante redondo  — dezesseis raios, o talhe clássico
     esmeralda   lapidação degrau   — octógono de cantos chanfrados, anéis
                                      concêntricos (é o talhe que leva o nome
                                      da pedra)
     safira      gota (pera)        — ponta em cima, barriga embaixo

   A GEOMETRIA é calculada UMA VEZ, no módulo: os talhes são constantes, não
   dependem de nenhum valor da ficha. O render só escolhe a paleta e a altura
   do recorte.

   A ANIMAÇÃO fala do dado, não de si mesma (é o que separa gema de
   purpurina): o halo respira na AMPLITUDE da carga — pedra cheia pulsa, pedra
   vazia fica inerte —, o claro-escuro varre só a parte VIVA, e os estalos de
   luz nascem nas junções das facetas. Tudo morre em `prefers-reduced-motion`.

   A FÍSICA ABAIXO DE ZERO continua contando a mesma história de antes: o rubi
   enche de um vermelho morto, de brasa apagada, rumo ao −15, e ganha uma
   RACHADURA. O personagem está morrendo, e a pedra trinca.

   O contrato não mudou: `onEdit(b, scope, rect)` abre o editor do Mestre,
   `onHover(e, tip)` mostra o balão, `semEdicao` e teto 0 (Karma sem Aura) não
   abrem nada. */

/* ponto a ponto: polígono regular de n lados, o vértice 0 no topo */
const gemaPoligono = (n, raio, cx, cy) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2;
  return [cx + Math.sin(a) * raio, cy - Math.cos(a) * raio];
});

/* o octógono da lapidação degrau: um retângulo de cantos cortados */
const gemaOctogono = (w, h, c, cx, cy) => {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  return [[x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c],
    [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c]];
};

const gemaEscala = (pts, k, cx, cy) => pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
const gemaD = (pts) => 'M' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') + 'Z';

/* As facetas entre dois anéis: um quadrilátero por aresta, que é como a luz
   se reparte num talhe radial (brilhante e gota). */
const gemaFacetasRadiais = (fora, dentro, nivel) => fora.map((p, i) => {
  const j = (i + 1) % fora.length;
  return { d: gemaD([p, fora[j], dentro[j], dentro[i]]), tom: nivel + (i % 2) };
});

/* No talhe DEGRAU a faixa é contínua — não se reparte em raios. O anel é o
   contorno de fora mais o de dentro ao contrário, com fill-rule evenodd. */
const gemaFaixaDegrau = (fora, dentro, nivel) => ([
  { d: gemaD(fora) + gemaD([...dentro].reverse()), tom: nivel + 1, aro: true },
]);

/* A superfície ondulada do escoamento, e O PORQUÊ DO NÚMERO 74 (27/10/2026,
   pedido do usuário: "deixe o movimento fluir para que ao reiniciar não
   pareça que reiniciou").

   A onda anda na horizontal, e um laço só é invisível se o deslocamento for
   um PERÍODO INTEIRO da senoide: aí o quadro final é idêntico ao primeiro e
   não há volta ao início para o olho pegar. A primeira versão tinha período
   de 74px e andava 37 — meio período —, de modo que a crista virava vale e a
   onda dava um tranco a cada 4,2s.

   Daí as duas regras desta função: o período é fixo (GEMA_ONDA_PERIODO, o
   mesmo número que o CSS desloca) e a faixa é larga o bastante para que,
   deslocada de um período inteiro, ela ainda cubra a pedra toda — por isso
   vai de -170 a 170 numa caixa de 100. */
const GEMA_ONDA_PERIODO = 74;
function gemaOnda(topo) {
  const de = -170, ate = 170, amp = 3.2, passo = GEMA_ONDA_PERIODO / 8;
  let d = '';
  for (let x = de; x <= ate + 0.001; x += passo) {
    const y = topo + Math.sin(((x - de) / GEMA_ONDA_PERIODO) * Math.PI * 2) * amp;
    d += (d ? 'L' : 'M') + `${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return `${d}L${ate},150L${de},150Z`;
}

function gemaTalhe(corte) {
  if (corte === 'degrau') {
    const cx = 50, cy = 52;
    const a0 = gemaOctogono(74, 94, 21, cx, cy);
    const a1 = gemaOctogono(63, 82, 18, cx, cy);
    const a2 = gemaOctogono(52, 70, 14, cx, cy);
    const a3 = gemaOctogono(40, 56, 11, cx, cy);
    return {
      contorno: gemaD(a0),
      facetas: [...gemaFaixaDegrau(a0, a1, 0), ...gemaFaixaDegrau(a1, a2, 1),
        ...gemaFaixaDegrau(a2, a3, 2)],
      /* os cortes dos cantos: é por eles que a lapidação degrau se reconhece */
      riscos: a0.map((p, i) => [p, a1[i]]).concat(a1.map((p, i) => [p, a2[i]]))
        .concat(a2.map((p, i) => [p, a3[i]])),
      mesa: gemaD(a3),
      trinca: 'M30,16 L42,42 L32,56 L48,74 L40,90 L54,100',
    };
  }
  const cx = 50, cy = corte === 'gota' ? 58 : 52;
  const a0 = corte === 'gota'
    ? [[50, 4], [61, 19], [71, 33], [79, 49], [83, 65], [80, 81], [71, 94], [58, 103],
      [50, 105], [42, 103], [29, 94], [20, 81], [17, 65], [21, 49], [29, 33], [39, 19]]
    : gemaPoligono(16, 46, cx, cy);
  const a1 = gemaEscala(a0, 0.73, cx, cy);
  const a2 = gemaEscala(a0, 0.50, cx, cy);
  const a3 = gemaEscala(a0, 0.28, cx, cy);
  return {
    contorno: gemaD(a0),
    facetas: [...gemaFacetasRadiais(a0, a1, 0), ...gemaFacetasRadiais(a1, a2, 1),
      ...gemaFacetasRadiais(a2, a3, 2)],
    riscos: null,
    mesa: gemaD(a3),
    trinca: corte === 'gota'
      ? 'M36,22 L46,48 L36,62 L52,80 L44,96 L58,106'
      : 'M28,24 L40,44 L31,56 L45,72 L38,88 L52,96',
  };
}

const GEMA_TALHES = { redondo: gemaTalhe('redondo'), degrau: gemaTalhe('degrau'), gota: gemaTalhe('gota') };

/* As paletas. `tons` vai do cinturão (escuro) à mesa (claro) — quatro degraus,
   porque é a diferença entre faceta e faceta que faz a pedra parecer talhada
   e não pintada. `mortas` é a mesma pedra sem luz: ainda se vê o corte. */
const GEMA_PEDRAS = {
  ef: {
    corte: 'redondo',
    tons: ['#3E0B08', '#7D1710', '#B82C1B', '#E05A3E'], mesa: '#F58A68', brilho: '#FF4A28',
    mortas: ['#180D0B', '#241310', '#2E1A15', '#38211B'], mesaMorta: '#42281F',
  },
  eh: {
    corte: 'degrau',
    tons: ['#0B3018', '#1A5F28', '#2F8F3C', '#55BD57'], mesa: '#86DC80', brilho: '#3ECE47',
    mortas: ['#0D1811', '#132017', '#19291D', '#1F3223'], mesaMorta: '#263C2A',
  },
  ka: {
    corte: 'gota',
    tons: ['#0B1A4C', '#163283', '#2857BE', '#4A82E8'], mesa: '#7EA9F8', brilho: '#3C78FF',
    mortas: ['#0B1020', '#10172B', '#151D36', '#1A2441'], mesaMorta: '#212C4E',
  },
};
/* A Física morrendo: brasa apagada, não vermelho. */
const GEMA_AGONIA = {
  tons: ['#120303', '#230605', '#350A07', '#49100A'], mesa: '#5E1D0E', brilho: '#7A1E0C',
};

/* AS PEDRAS SÃO PINTADAS (27/10/2026, pedido do usuário: "você pode fazer o
   desenho das gemas no Figma e usar a animação?"). O mesmo caminho dos
   equipamentos, dos itens e das condições — Figma `generate_image`, modelo
   gemini-3.1-flash-image, fundo recortado e convertido em webp com alfa.
   Pedra pintada assenta ao lado dos medalhões das Condições de um jeito que
   faceta vetorial nenhuma assentava.

   O TALHE VETORIAL CONTINUA, de reserva: quem não tiver pintura cai nele, do
   mesmo modo que a condição sem pintura cai no ícone (ver ARTE_COND). É por
   isso que gemaTalhe não foi embora.

   Prompt, para refazer: "single large {ruby round brilliant cut / emerald
   emerald-cut / sapphire pear cut} gemstone, viewed perfectly face-up from
   directly above, centered, symmetrical, filling 92% of the square frame,
   facets clearly defined, inner fire glowing from the heart, Diablo II
   inventory icon style, flat #17110A background, no setting, no mount". */
const ARTE_GEMA = {
  ef: '/energia/gema-rubi.webp',
  eh: '/energia/gema-esmeralda.webp',
  ka: '/energia/gema-safira.webp',
};

/* COMO A PEDRA CONTA O VALOR — E POR QUE SÃO DOIS JEITOS (27/10/2026)

   A primeira tentativa recortava a pedra por uma LINHA horizontal, como o
   tubo fazia com o líquido, e era exatamente isso que se via: um copo cheio
   pela metade. A segunda acendia a pedra do meio para fora. Levei cinco modos
   à prévia (preview/gemas.html) e o usuário escolheu DOIS, um por paleta:

     Couro e Ouro  →  ESCOAMENTO. A luz escorre: a superfície ondula, uma
                      corrente desce por dentro e gotas escapam pelo pé.
     Ferro e Brasa →  MARÉ. A luz se acumula embaixo, com a superfície acesa
                      numa linha viva. É a leitura mais exata das duas.

   "Eu quero escoamento para a paleta couro e ouro e maré para a paleta ferro
   e brasa." (usuário)

   QUEM DECIDE É O CSS, não o React. As duas formas são montadas sempre, uma
   com a classe `.fp-gema-so-couro` e outra com `.fp-gema-so-ferro`, e a regra
   `:root[data-paleta=…]` esconde a que não vale (ver index.css). Assim a
   troca de paleta no menu do usuário troca o modo NA HORA, sem estado novo,
   sem passar a paleta por sete componentes até chegar aqui, e sem chance de
   as duas coisas se desencontrarem. São meia dúzia de nós a mais por pedra.

   Em cima das duas, a BATIDA ("o pulso pode ir com qualquer uma sim" —
   usuário): cheia, larga e calma; quase vazia, curta e apressada.

   A camada viva é mascarada pela SILHUETA da própria pedra, e por isso o halo
   sai com a forma dela — e não num retângulo, que era o defeito da primeira
   versão. A mesma silhueta recorta o lustro, a corrente e a trinca. */
function GemaPedra({ pedra, arte, fracao, neg, uid }) {
  const t = GEMA_TALHES[pedra.corte];
  const viva = neg ? { ...pedra, ...GEMA_AGONIA } : pedra;
  const silhueta = `${uid}s`, nivel = `${uid}h`, esfuma = `${uid}e`;
  const corrente = `${uid}r`;
  const caixa = { x: 1, y: 1, width: 98, height: 98 };
  /* O nível conta a altura da PEDRA (a pintura ocupa y 1..99 da caixa de
     124), e não a caixa inteira: medindo pela caixa, 25% de energia punha a
     superfície a 6% da pedra, porque os 25px de baixo são o vão da sombra. */
  const topo = 99 - 98 * fracao;
  const pintura = (classe) => (
    <image href={arte} {...caixa} preserveAspectRatio="xMidYMid meet" className={classe} />
  );
  const facetas = (cores, mesaCor) => (
    <>
      {t.facetas.map((f, i) => (
        <path key={i} d={f.d} fill={cores[f.tom]} fillRule={f.aro ? 'evenodd' : undefined} />
      ))}
      <path d={t.mesa} fill={mesaCor} />
    </>
  );
  return (
    <svg viewBox="0 0 100 124" preserveAspectRatio="xMidYMid meet" aria-hidden="true"
      className={'fp-gema-svg' + (arte ? ' is-pintada' : '')}
      style={{ '--gema-brilho': viva.brilho, '--n': fracao.toFixed(3) }}>
      <defs>
        {/* A silhueta: o alfa da pintura, ou o contorno do talhe de reserva. */}
        <mask id={silhueta} style={{ maskType: 'alpha' }}>
          {arte ? pintura() : <path d={t.contorno} fill="#fff" />}
        </mask>
        {/* A beirada do nível é desfocada: luz não tem aresta. */}
        <filter id={esfuma} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        {/* O NÍVEL, nas duas formas. A onda do escoamento e o corte reto da
            maré moram na mesma máscara; o CSS apaga a que a paleta não usa. */}
        <mask id={nivel}>
          <path className="fp-gema-escoa fp-gema-so-couro" d={gemaOnda(topo)} fill="#fff"
            filter={`url(#${esfuma})`} />
          <rect className="fp-gema-mare fp-gema-so-ferro" x="-12" y={topo} width="124"
            height={136 - topo} fill="#fff" filter={`url(#${esfuma})`} />
        </mask>
        {/* A corrente: faixas claras que descem por dentro da pedra. O
            desenho REPETE EXATAMENTE DUAS VEZES ao longo do retângulo (os
            cinco batentes de 0 a .5 são os mesmos de .5 a 1), porque a
            animação o desloca de meia altura — e é só assim que o laço fecha
            sem o olho ver a volta ao início. */}
        <linearGradient id={corrente} x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".09" stopColor="#fff" stopOpacity=".16" />
          <stop offset=".17" stopColor="#fff" stopOpacity="0" />
          <stop offset=".31" stopColor="#fff" stopOpacity=".12" />
          <stop offset=".40" stopColor="#fff" stopOpacity="0" />
          <stop offset=".50" stopColor="#fff" stopOpacity="0" />
          <stop offset=".59" stopColor="#fff" stopOpacity=".16" />
          <stop offset=".67" stopColor="#fff" stopOpacity="0" />
          <stop offset=".81" stopColor="#fff" stopOpacity=".12" />
          <stop offset=".90" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* a sombra da pedra sobre o pano */}
      <ellipse className="fp-gema-sombra" cx="50" cy="112" rx="24" ry="4.5" />

      {/* a pedra apagada, sempre inteira: o talhe não depende da energia */}
      <g className="fp-gema-morta">
        {arte ? pintura() : facetas(pedra.mortas, pedra.mesaMorta)}
      </g>

      {/* e o fogo dentro dela, do tamanho da energia */}
      <g className="fp-gema-viva is-pulso" mask={`url(#${nivel})`}>
        {arte ? pintura(neg ? 'fp-gema-agonia' : undefined) : facetas(viva.tons, viva.mesa)}
        {/* a corrente que desce por dentro da pedra que escoa */}
        <g className="fp-gema-so-couro" mask={`url(#${silhueta})`}>
          <rect className="fp-gema-corrente" x="0" y="-124" width="100" height="248"
            fill={`url(#${corrente})`} />
        </g>
      </g>

      {/* a superfície da maré: a luz que se acumulou tem brilho de beirada */}
      {fracao > 0 && fracao < 1 && (
        <g className="fp-gema-so-ferro" mask={`url(#${silhueta})`}>
          <rect className="fp-gema-linha-dagua" x="0" y={topo - 2} width="100" height="4"
            fill={viva.brilho} />
        </g>
      )}

      {/* as arestas do talhe de reserva (a pintura traz as suas) */}
      {!arte && (
        <g className="fp-gema-arestas">
          {t.facetas.map((f, i) => <path key={i} d={f.d} fillRule={f.aro ? 'evenodd' : undefined} />)}
          {t.riscos && t.riscos.map(([c, d], i) => (
            <line key={i} x1={c[0]} y1={c[1]} x2={d[0]} y2={d[1]} />
          ))}
          <path d={t.mesa} />
          <path d={t.contorno} className="fp-gema-cinturao" />
        </g>
      )}

      {/* a trinca da Física em agonia, recortada pela própria pedra */}
      {neg && (
        <g mask={`url(#${silhueta})`}>
          <path className="fp-gema-trinca" d={t.trinca} />
        </g>
      )}
    </svg>
  );
}

function FichaGemas({ bars, scope = 'vit', onEdit, en, onHover, onHoverEnd }) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <div className="fp-gemas">
      {bars.map((b, k) => {
        const lo = b.min ?? 0;
        // Abaixo de zero (só a EF): enche conforme se aproxima do piso.
        const neg = lo < 0 && b.val <= 0;
        const fracao = neg ? Math.min(1, b.val / lo) : (b.max > 0 ? Math.max(0, Math.min(1, b.val / b.max)) : 0);
        const m = usarAbrirMedida(b, scope, onEdit, onHover, onHoverEnd, en);
        const pedra = GEMA_PEDRAS[b.key] || GEMA_PEDRAS.ef;
        return (
          <div key={b.key} className={'fp-gema' + m.className + (neg ? ' is-neg' : '')} {...m.props}>
            <div className="fp-gema-peca">
              <GemaPedra pedra={pedra} arte={ARTE_GEMA[b.key] || null} fracao={fracao} neg={neg}
                uid={`${uid}g${k}`} />
            </div>
            <span className="fp-gema-nome" aria-hidden="true">{b.nomeCurto || b.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* Bolhas do medalhão: nascem dentro do anel, correm um trecho dele e somem. */
const BOLHAS_ANEL = [2.6, 1.8, 2.2, 3, 1.6, 2.4, 2];

/* AS PINTURAS DAS CONDIÇÕES (23/10/2026): um objeto que representa a condição,
   pintado no Figma no estilo dos equipamentos (o usuário testou retratos de
   um personagem genérico e voltou aos objetos). A chave é a da condição em
   condBars; a que ainda não tem pintura segue com o ícone. Lista e progresso
   em .impeccable/arte-equipamentos.md. */
/* Os objetos escolhidos pelo usuário (23/10/2026): Doença = frasco da peste,
   Sono = lua cheia, Sede = frasco com água, Fome = pão, Frio = floco de neve,
   Calor = sol quente, Vício = cerveja, Loucura = olho esbugalhado, Desonra =
   medalha, Pesado = bolsa. */
const ARTE_COND = {
  vitalidade: '/cond/cond-doenca.webp',
  animo: '/cond/cond-sono.webp',
  hidratacao: '/cond/cond-sede.webp',
  nutricao: '/cond/cond-fome.webp',
  frio: '/cond/cond-frio.webp',
  calor: '/cond/cond-calor.webp',
  euforia: '/cond/cond-vicio.webp',
  sanidade: '/cond/cond-loucura.webp',
  reputacao: '/cond/cond-desonra.webp',
  pesado: '/cond/cond-pesado.webp',
};
function FichaMedalhoes({ bars, scope = 'cond', onEdit, en, onHover, onHoverEnd }) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <div className="fp-medalhoes">
      {bars.map((b, k) => {
        const v = Math.max(0, Math.min(100, Math.round(Number(b.val) || 0)));
        const m = usarAbrirMedida({ ...b, descVal: v + '%' }, scope, onEdit, onHover, onHoverEnd, en);
        const rad = (v * 3.6 - 90) * Math.PI / 180;
        const vidro = `${uid}v${k}`, ferro = `${uid}f${k}`;
        return (
          <div key={b.key} className={'fp-medalhao' + (v ? '' : ' is-zero') + m.className} {...m.props}>
            <svg viewBox="0 0 86 86" aria-hidden="true">
              <defs><radialGradient id={vidro} cx="43" cy="43" r="40.5" gradientUnits="userSpaceOnUse">
                <stop offset=".827" stopColor="#0E120C" stopOpacity=".95" /><stop offset=".88" stopColor="#262C20" stopOpacity=".6" />
                <stop offset=".95" stopColor="#1E2418" stopOpacity=".65" /><stop offset="1" stopColor="#0C0F0A" stopOpacity=".95" /></radialGradient></defs>
              <circle cx="43" cy="43" r="42.2" fill="#17120C" stroke="#4A3D2E" strokeWidth="1.4" />
              <circle cx="43" cy="43" r="37" fill="none" stroke={`url(#${vidro})`} strokeWidth="7" />
            </svg>
            {v > 0 && (
              <div className="fp-medalhao-canal" style={{ '--p': v }} aria-hidden="true">
                <div className="fp-medalhao-liq" style={{ '--a': '-' + (k * 0.9).toFixed(1) + 's' }}>
                  {BOLHAS_ANEL.map((t, j) => (
                    <i key={j} style={{ '--g': ((j * 51 + k * 23) % 360) + 'deg', '--t': t + 'px', '--d': (2.2 + ((j * 5 + k) % 4) * 0.5).toFixed(1) + 's', '--a2': '-' + ((j * 0.8 + k * 0.3) % 3).toFixed(1) + 's' }} />
                  ))}
                </div>
              </div>
            )}
            <svg viewBox="0 0 86 86" className="fp-medalhao-sobre" aria-hidden="true">
              <defs><linearGradient id={ferro} x1="0" x2="1"><stop offset="0" stopColor="#1A140E" /><stop offset=".35" stopColor="#5E4E3B" /><stop offset=".6" stopColor="#3A2F23" /><stop offset="1" stopColor="#140F0A" /></linearGradient></defs>
              <path d="M17.2,24 A32,32 0 0 1 34,9.6" fill="none" stroke="rgba(235,240,220,.16)" strokeWidth="2" strokeLinecap="round" />
              {v > 0 && v < 100 && (
                <line x1={(43 + 33.6 * Math.cos(rad)).toFixed(2)} y1={(43 + 33.6 * Math.sin(rad)).toFixed(2)}
                  x2={(43 + 40.4 * Math.cos(rad)).toFixed(2)} y2={(43 + 40.4 * Math.sin(rad)).toFixed(2)}
                  stroke="#B49AE6" strokeWidth="1.6" strokeLinecap="round" opacity=".85" />
              )}
              {[90, 180, 270].map((a) => (
                <g key={a} transform={`rotate(${a} 43 43)`}>
                  <rect x="40.6" y="1.4" width="4.8" height="9.6" rx="1" fill={`url(#${ferro})`} stroke="#0C0805" strokeWidth=".6" />
                  <circle cx="43" cy="6.2" r="1.1" fill="#9C8466" />
                </g>
              ))}
              <rect x="39.4" y=".4" width="7.2" height="11.6" rx="1.6" fill={`url(#${ferro})`} stroke="#0C0805" strokeWidth=".7" />
              <circle cx="43" cy="3.6" r="1.2" fill="#9C8466" /><circle cx="43" cy="8.6" r="1.2" fill="#9C8466" />
            </svg>
            {/* A face: aqui entra a pintura da condição (Figma) no lugar do ícone. */}
            <div className={'fp-medalhao-face' + (ARTE_COND[b.key] ? ' tem-arte' : '')} aria-hidden="true">
              {ARTE_COND[b.key]
                ? <img src={ARTE_COND[b.key]} alt="" draggable="false" />
                : <i className={'ti ' + b.icon} />}
            </div>
            {/* O NOME POR EXTENSO sob o medalhão (26/10/2026, pedido do
                usuário): "no card de condições, abaixo do ícone não abrevie,
                onde está 'DOE 0' vira 'Doença'". A sigla economizava três
                letras e cobrava uma tradução mental — e o valor já está no
                medalhão, no líquido e no tooltip. */}
            {b.label && (
              <span className="fp-med-rot" aria-hidden="true">{b.label}</span>
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
/* Caixa flutuante que se fecha sozinha: clique fora, Escape ou scroll. Mesmo
   comportamento do editor de barra, extraído para o menu da peça equipada usar
   igual (15/09/2026). */
function FechaAoSair({ onClose, children, ...props }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onScroll = () => onClose();
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    // Adia o listener de clique para não capturar o mesmo clique que abriu.
    const t = setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
      clearTimeout(t);
      document.removeEventListener('mousedown', onDown);
    };
  }, [onClose]);
  return <div ref={ref} role="dialog" onClick={(e) => e.stopPropagation()} {...props}>{children}</div>;
}

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
  // Largura só para não encostar na borda da tela: o popover agora é o
  // stepper nu (ver fp-bar-pop--nu), bem mais estreito que o card antigo.
  const W = 150;
  const vw = (typeof window !== 'undefined' ? window.innerWidth : 360);
  let left = anchor ? anchor.left : 0;
  let top = anchor ? anchor.bottom + 8 : 0;
  if (left + W > vw - 10) left = Math.max(10, vw - 10 - W);
  if (left < 10) left = 10;

  const _corCondicao = (typeof corCondicao !== 'undefined' ? corCondicao : null) || window.corCondicao || (() => '#888');
  const cor = isCond
    ? _corCondicao(val)
    : (item.color || FICHA_VIT_COLORS[item.key] || '#888');

  // ── Stepper -/valor/+ — agora usado em condições E em vitalidade (antes
  // vitalidade tinha um slider simples à parte; unificado a pedido). Mesmo
  // visual do QuantityStepper de 12-batalha/batalha.jsx (pill escuro
  // translúcido, botões circulares dourados, texto Lora). Duplicado AQUI
  // porque 11-ficha carrega ANTES de 12-batalha (não tem como importar) —
  // mesmo padrão já usado pelos helpers locais de 13-diario/diario.jsx.

  /* Os botões de valor pré-determinado (0, 25%, 50%… / −50, −25, 0, +25, +50)
     saíram em 15/09/2026, a pedido do usuário — e com eles o card em volta: o
     que flutua agora é só o input. */
  // Pill central: condição mostra +/- (faixa com sinal, sempre ±COND_LIMITE);
  // vitalidade mostra val/max (o teto varia por PJ/stat, vale mais mostrar).
  /* Estágio mostra só o XP (17/09/2026): o teto aqui é o fim da tabela de
     estágios, um "2185" que não diz nada sobre o personagem e só empurraria o
     número que interessa para o canto do pill.

     E sem a sigla "XP" desde 20/09/2026, a pedido do usuário: o seletor abre
     a partir da barra de experiência, então dizer de novo o que se está
     editando é repetição. Os outros escopos também mostram só números. */
  const isXp = scope === 'estagio';
  // Condição: 0..100, sem sinal desde 27/09/2026.
  const centerLabel = isCond
    ? String(val)
    : isXp ? String(val) : `${val} / ${max}`;
  return (
    <div
      ref={ref}
      /* `fp-bar-pop--nu`: sem moldura, sem fundo, sem largura fixa — o
         stepper flutua sozinho sobre a ficha (15/09/2026). */
      className="fp-bar-pop fp-bar-pop--nu"
      style={{ position: 'fixed', left, top, '--pop-accent': cor }}
      role="dialog"
      aria-label={item.label}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Este popover é a ORIGEM do desenho, e agora o consome como todo
          mundo: QuantidadeStepper (01-core/helpers.jsx). Manter a cópia aqui
          faria a referência divergir do que ela referencia. */}
      <QuantidadeStepper
        value={val}
        min={min}
        max={max}
        onChange={aplicar}
        centro={centerLabel}
        label={item.label}
      />
    </div>
  );
}


/* ============================== [11] Status persistente ==============================
   "O status da batalha também persiste depois que a luta acaba, mas o mestre
    pode remover e adicionar fora da batalha também." (usuário, 17/09/2026)

   Esta é a metade "fora da batalha". O que se aplica aqui é O MESMO objeto que
   o menu de estado do combate aplica — statusAplicadoPeloMestre, lido do
   window porque a fase 12 carrega depois desta —, e por isso um "Ferido" posto
   na ficha entra no combate seguinte com o mod_coluna certo.

   Diferença de unidade, e é a única: em combate o Mestre conta RODADAS; aqui
   ele conta DIAS do calendário, que é o grão que o mundo fora da luta tem. Ver
   01-core/status-efeito.jsx.

   O Jogador vê os status e não mexe — mesma regra das barras de vitalidade. */
/* ── FichaStatusSeletor — o círculo na fileira das abas ───────────────────
   "O novo seletor de status deve ser um círculo, como é 'temperatura' no topo
    da página, e pode ficar ao lado do menu 'ficha'." (usuário, 17/09/2026)

   É o pill do clima (.cdj-tempo, 10-shell/shell.jsx): círculo só com ícone, o
   clique abre a escada inteira. Passou por "+" e por um pill com texto antes
   de chegar aqui.

   Mora na fileira das abas e não no painel de status porque aplicar status é
   ação do Mestre sobre a ficha, como as abas são navegação sobre a ficha — o
   painel lá embaixo mostra o que está valendo. Quem tem o passo 2 é ele: o
   clima resolve no clique, o status precisa de um prazo, e o modal o pede. */
function FichaStatusSeletor({ lista, dataJogo, lang, onAdicionar }) {
  const en = lang === 'en';
  const [aberta, setAberta] = useState(false);
  const [escolhido, setEscolhido] = useState(null);   // tipo aguardando o modal
  const dropRef = useRef(null);
  // Tooltip no círculo (27/09/2026): "Falta o tooltip em alguns: nos botões
  // de dormindo, envenenado, etc." Todo botão só-ícone da fileira tem nome.
  const [tip, abrirTip, fecharTip, manterTip] = useTooltip(80);

  const TIPOS = (typeof window !== 'undefined' && window.STATUS_MESTRE_TIPOS) || [];
  const vigentes = (typeof window !== 'undefined' && window.statusVigentes)
    ? window.statusVigentes(lista, dataJogo) : (lista || []);
  const tb = ((typeof COPY !== 'undefined' ? COPY[lang] : null) || {}).batalha || {};
  const _tipoDe = (typeof window !== 'undefined' && window.tipoDoStatus) || (() => null);

  /* "Nunca acumular o mesmo mais de uma vez": quem já está no personagem sai
     da lista. Reaplicar substituiria em silêncio — melhor não oferecer, e
     deixar o Mestre remover antes, se o que ele quer é renovar o prazo. */
  const jaTem = new Set(vigentes.map((st) => _tipoDe(st)).filter(Boolean));
  const disponiveis = TIPOS.filter((t) => !jaTem.has(t.tipo));

  /* O MESMO MODAL DOS VIZINHOS (27/10/2026, pedido do usuário: "no trilho da
     ficha do personagem, arrume o modal que abre quando clica, padronize
     ele"). Status era o único do trilho que ainda abria uma folha ancorada
     no botão — e ela sofria do mal conhecido: é descendente do .fp-card, que
     tem `zoom` e cria contexto de empilhamento, então a folha nascia ATRÁS
     da ficha. Agora é o ModalShell, com a lista .at-lista de Atividades,
     Habilidades, Magias e Itens. */
  const _ModalShell = (typeof ModalShell !== 'undefined' ? ModalShell : null) || window.ModalShell || null;

  // Sem o ModalShell (teste isolado), a folha antiga: Esc e clique fora dela.
  useEffect(() => {
    if (!aberta || _ModalShell) return undefined;
    const fora = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setAberta(false); };
    const esc = (e) => { if (e.key === 'Escape') setAberta(false); };
    document.addEventListener('mousedown', fora);
    window.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); window.removeEventListener('keydown', esc); };
  }, [aberta, _ModalShell]);

  // Com os quatro aplicados não há o que oferecer, e o círculo some.
  if (disponiveis.length === 0) return null;

  return (
    <div className="fp-status-wrap" ref={dropRef}>
      <button
        type="button"
        className={'fp-status-seletor' + (aberta ? ' is-open' : '')}
        onClick={() => { fecharTip(); setAberta((v) => !v); }}
        aria-haspopup="listbox"
        aria-expanded={aberta}
        aria-label={en ? 'Apply status' : 'Aplicar status'}
        {...(aberta ? {} : propsTip(abrirTip, fecharTip, en ? 'Status' : 'Status'))}
      >
        <i className="ti ti-bolt" aria-hidden="true" />
        {/* Na barra de ações, ícone + texto como os vizinhos (23/10/2026). */}
        <span className="mc-acao-rotulo fp-ativ-rotulo" aria-hidden="true">Status</span>
      </button>
      <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
      {aberta && _ModalShell && ReactDOM.createPortal(
        <_ModalShell
          title={<><i className="ti ti-bolt det-title-ic" aria-hidden="true" /> Status</>}
          lang={lang} size="sm" extraClass="modal-atalho"
          onClose={() => setAberta(false)}
        >
          <div className="at-lista mn-rolagem" role="listbox" aria-label="Status">
            {disponiveis.map((t) => (
              <button key={t.tipo} type="button" role="option" aria-selected="false"
                data-status={t.tipo} className="at-linha fp-status-opcao"
                onClick={() => { setAberta(false); setEscolhido(t); }}>
                <i className={'ti ' + t.ic + ' at-linha-ic'} aria-hidden="true" />
                <span className="at-linha-texto">
                  <span className="at-linha-nome">{tb[t.chaveCopy] || t.chaveCopy}</span>
                </span>
              </button>
            ))}
          </div>
        </_ModalShell>,
        document.querySelector('#root .menestrel-ui') || document.body,
      )}
      {aberta && !_ModalShell && (
        <ul className="fp-status-opcoes" role="listbox" aria-label="Status">
          {disponiveis.map((t) => (
            <li
              key={t.tipo}
              role="option"
              aria-selected="false"
              data-status={t.tipo}
              className="fp-status-opcao"
              onClick={() => { setAberta(false); setEscolhido(t); }}
            >
              <i className={'ti ' + t.ic} aria-hidden="true" />
              <span>{tb[t.chaveCopy] || t.chaveCopy}</span>
            </li>
          ))}
        </ul>
      )}
      {escolhido && (
        <StatusPrazoModal
          def={escolhido}
          lang={lang}
          onCancel={() => setEscolhido(null)}
          onConfirm={(valor, dias) => {
            const fabrica = typeof window !== 'undefined' && window.statusAplicadoPeloMestre;
            setEscolhido(null);
            if (!fabrica) return;
            /* Em combate o 3º argumento são rodadas; fora dele o prazo é o
               dias do modal, e a contagem de rodadas fica valendo 1 — é o que
               a próxima batalha encontra para descontar por virada. */
            onAdicionar(fabrica(escolhido.tipo, valor, 1, tb), dias);
          }}
        />
      )}
    </div>
  );
}

/* O painel mostra o que está VALENDO. Quem aplica é o círculo na fileira das
   abas (FichaStatusSeletor, acima); aqui ficam os chips e o x de remover. */
/* ── FichaAtividadeSeletor — o que o personagem está fazendo ───────────────
   "Adicione um botão na ficha para o jogador escolher entre as condições:
    Dormindo, Meditando, Orando, Estudando, Treinando." (usuário, 24/09/2026)

   Mesmo círculo do status, ao lado dele. Diferente do status, o JOGADOR
   também mexe (é o personagem dele descansando), e o círculo mostra a
   atividade ligada com o nome ao lado — fica ligada até alguém tirar. Quem
   recupera é o relógio da mesa (recuperacaoPorAtividade, 01-core/
   clima-desgaste.jsx), a cada hora que o Mestre avança. */
/* Fila de treino no menu (22/10/2026): "a técnica vai aparecer no menu
   treinando" — cada atividade lista o que treina nela (técnicas em
   Treinando; magias na atividade da classe), com o tempo de jogo que falta. */
function tempoDeTreino(horas) {
  const n = Math.max(0, Math.ceil(Number(horas) || 0));
  const d = Math.floor(n / 24), r = n % 24;
  return [d ? `${d} d` : '', r ? `${r} h` : ''].filter(Boolean).join(' ') || '0 h';
}

function FichaAtividadeSeletor({ atividade, podeEditar, lang, onEscolher, treinos, nomeDoTreino, atributos }) {
  const en = lang === 'en';
  const [aberta, setAberta] = useState(false);
  // A atividade em foco no segundo passo da janela (null = a lista).
  const [emFoco, setEmFoco] = useState(null);
  const dropRef = useRef(null);
  const [tip, abrirTip, fecharTip, manterTip] = useTooltip(80);   // o nome no hover (27/09/2026)
  const LISTA = (typeof window !== 'undefined' && window.ATIVIDADES) || [];
  const atual = LISTA.find((a) => a.id === (atividade && atividade.tipo)) || null;
  const nomeDe = (a) => (en ? a.en : a.pt);

  /* ── ATIVIDADES ABRE EM MODAL (26/10/2026, pedido do usuário: "os menus do
     trilho 'atividades' e 'amigos' não estão virando modal como os demais").
     Era a última folha ancorada no botão do trilho, junto com Amigos — e
     folha ancorada dentro do .fp-card tem o problema do `zoom`: o cartão cria
     contexto de empilhamento e a lista ficava atrás da ficha. O modal nasce
     no meio da tela, por portal para a raiz do app, como os atalhos.

     Com o ModalShell, o clique-fora e o Esc são dele — por isso o listener
     próprio só vale quando o ModalShell não estiver no ar. */
  const _Modal = (typeof ModalShell !== 'undefined' ? ModalShell : null) || window.ModalShell || null;
  useEffect(() => {
    if (!aberta || _Modal) return undefined;
    const fora = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setAberta(false); };
    const esc = (e) => { if (e.key === 'Escape') setAberta(false); };
    document.addEventListener('mousedown', fora);
    window.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); window.removeEventListener('keydown', esc); };
  }, [aberta, _Modal]);

  // Quem não pode mexer só vê a atividade ligada — e nada, se não houver.
  if (!podeEditar && !atual) return null;

  const escolher = (id) => { setAberta(false); setEmFoco(null); onEscolher(id); };
  const fechar = () => { setAberta(false); setEmFoco(null); };
  const listaEl = (
    <_AtividadeLista LISTA={LISTA} atual={atual} nomeDe={nomeDe} aoPedir={setEmFoco}
      en={en} treinos={treinos} nomeDoTreino={nomeDoTreino} />
  );
  /* O PASSO DE CONFIRMAÇÃO MORA NA MESMA JANELA (27/10/2026, pedido do
     usuário: "ao clicar, adicione um modal explicando o que aquela atividade
     faz e os botões de 'Dormir, Meditar, etc' e 'Cancelar'").

     Janela sobre janela seria duas moldas e dois fundos escuros empilhados
     para uma pergunta de uma linha. Em vez disso a janela TROCA de passo —
     lista → explicação —, com o título virando o nome da atividade e uma
     seta de voltar, que é o mesmo caminho da busca do Livro de Regras. O
     rodapé com Cancelar e o verbo só existe no segundo passo. */
  const ativoEmFoco = !!(emFoco && atual && atual.id === emFoco.id);
  const corpo = emFoco
    ? <_AtividadeExplicacao a={emFoco} en={en} atributos={atributos}
        treinos={treinos} nomeDoTreino={nomeDoTreino} />
    : listaEl;
  /* SEM SETA NO TÍTULO (27/10/2026, usuário: "remova o botão de voltar do
     lado do nome"). Quem leva de volta à lista é o rodapé, onde o "Cancelar"
     virou "Voltar" — duas portas para o mesmo lugar eram uma a mais, e a do
     título disputava espaço com o nome da atividade. */
  const tituloEl = emFoco
    ? (<><i className={'ti ' + emFoco.icon + ' det-title-ic'} aria-hidden="true" /> {nomeDe(emFoco)}</>)
    : (<><i className="ti ti-moon det-title-ic" aria-hidden="true" /> {en ? 'Activities' : 'Atividades'}</>);

  return (
    <div className="fp-status-wrap fp-atividade-wrap" ref={dropRef}>
      <button
        type="button"
        className={'fp-status-seletor' + (aberta ? ' is-open' : '') + (atual ? ' is-ativo' : '')}
        onClick={() => { fecharTip(); if (podeEditar) setAberta((v) => !v); }}
        /* aria-disabled em vez de disabled: botão desativado não recebe o
           hover, e quem só olha também precisa do tooltip com o nome. */
        aria-disabled={!podeEditar || undefined}
        aria-haspopup="listbox"
        aria-expanded={aberta}
        aria-label={atual ? nomeDe(atual) : (en ? 'Choose activity' : 'Escolher atividade')}
        data-atividade={atual ? atual.id : ''}
        {...(aberta ? {} : propsTip(abrirTip, fecharTip, atual
          ? { title: nomeDe(atual), desc: en ? 'Current activity' : 'Atividade atual' }
          : (en ? 'Activity' : 'Atividade')))}
      >
        <i className={'ti ' + (atual ? atual.icon : 'ti-moon')} aria-hidden="true" />
        {/* O nome aparece só na barra de ações: "Atividades" (23/10/2026). */}
        <span className="mc-acao-rotulo fp-ativ-rotulo" aria-hidden="true">{en ? 'Activities' : 'Atividades'}</span>
      </button>
      <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
      {/* Sem o nome ao lado do círculo (22/10/2026): primeiro só em
          Treinando ("não adicione o texto na barra de menus"), depois em
          todas ("Remova a palavra 'Estudando', etc do menu atividade da
          ficha"). O ícone e a dica bastam. */}
      {aberta && _Modal && ReactDOM.createPortal(
        <_Modal
          title={tituloEl}
          lang={lang} size="sm" extraClass={'modal-atalho' + (emFoco ? ' modal-atividade' : '')}
          onClose={fechar}
          {...(emFoco ? {
            onCancel: () => setEmFoco(null),
            /* "VOLTAR", não "Cancelar" (27/10/2026, usuário). E é mais
               honesto: o botão não cancela coisa alguma — nada foi gravado
               ainda —, ele volta à lista. Cancelar prometia desfazer. */
            cancelLabel: en ? 'Back' : 'Voltar',
            onConfirm: () => escolher(ativoEmFoco ? null : emFoco.id),
            /* Já está nela: a ação deixa de ser "Dormir" e vira "Parar". É
               também o que devolveu ao jogador a saída que a opção "Nenhuma"
               dava antes de sair da lista. */
            confirmLabel: ativoEmFoco
              ? (en ? 'Stop' : 'Parar')
              : nomeDe(emFoco),
          } : {})}
        >
          {corpo}
        </_Modal>,
        document.querySelector('#root .menestrel-ui') || document.body,
      )}
      {aberta && !_Modal && corpo}
    </div>
  );
}

/* A lista, fora do JSX do botão para servir aos dois caminhos (modal e, sem
   ModalShell carregado, a folha ancorada de antes). */
/* A LISTA DO SISTEMA, E NÃO A FOLHA ANCORADA (27/10/2026, pedido do usuário:
   "ao clicar em 'atividades' do trilho, o modal que abre está desconfigurado,
   quero que seja igual aos demais do mesmo trilho").

   Ela ainda vestia `.fp-status-opcoes` — a folha que PENDURA no botão, com
   posição absoluta e moldura própria. Dentro do ModalShell isso vira uma
   caixa solta no meio de outra. Agora é a `.at-lista` de Habilidades, Magias,
   Itens e Status: mesma linha, mesmo realce, mesma barra de rolagem. A fila
   de treino continua embaixo do nome, que é informação da atividade. */
function _AtividadeLista({ LISTA, atual, nomeDe, aoPedir, en, treinos, nomeDoTreino }) {
  const linha = (a) => {
    const ligada = !!(atual && atual.id === a.id);
    const fila = (Array.isArray(treinos) ? treinos : []).filter((t) => t && t.atividade === a.id);
    return (
      <button key={a.id} type="button" role="option" aria-selected={ligada}
        data-atividade={a.id}
        className={'at-linha fp-status-opcao fp-ativ-linha' + (ligada ? ' is-atual' : '')}
        onClick={() => aoPedir(a)}>
        <span className="at-linha-texto">
          {/* Só o nome (23/10/2026): os ícones saíram do submenu. */}
          <span className="at-linha-nome">{nomeDe(a)}</span>
          {!!fila.length && (
            <span className="fp-treino-fila" aria-label={en ? 'Training queue' : 'Fila de treino'}>
              {fila.map((t, i) => (
                <span key={t.id || i} className={'fp-treino-item' + (i === 0 ? ' is-agora' : '')}>
                  <span className="fp-treino-nome">{nomeDoTreino ? nomeDoTreino(t) : t.key}</span>
                  <span className="fp-treino-nivel">{en ? 'level' : 'nível'} {t.tipo === 'magia' ? (Number(t.nivel) * 2 - 1) : t.nivel}</span>
                  <span className="fp-treino-tempo">{tempoDeTreino(t.horas_restantes)}</span>
                </span>
              ))}
            </span>
          )}
        </span>
      </button>
    );
  };
  return (
    <div className="at-lista mn-rolagem" role="listbox" aria-label={en ? 'Activity' : 'Atividade'}>
      {/* "NENHUMA" SAIU (27/10/2026, pedido do usuário: "remover Nenhuma").
          Era a linha que desligava a atividade — e desligar continua
          possível: clicar na atividade LIGADA abre a mesma explicação com o
          botão "Parar" no rodapé. A saída não se perdeu, mudou de porta. */}
      {LISTA.map(linha)}
    </div>
  );
}

/* ── _AtividadeExplicacao — o que acontece se você clicar (27/10/2026) ────
   "Ao clicar, adicione um modal explicando o que aquela atividade faz."

   Duas coisas, nesta ordem: o PORQUÊ numa frase (escrito à mão — porquê não
   se deduz de tabela) e o QUE, em números gerados do próprio ATIVIDADE_EFEITO
   (01-core/clima-desgaste.jsx). Com os atributos do personagem em mãos, os
   números são os DELE: "+13" e não "+10 + Carisma". É o princípio do produto
   — custo e ganho antes do clique, não depois.

   A fila de treino entra quando existe: para quem está prestes a estudar, o
   que importa saber é que há um feitiço na fila e quanto falta. */
function _AtividadeExplicacao({ a, en, atributos, treinos, nomeDoTreino }) {
  const explicar = (typeof explicacaoDaAtividade === 'function' ? explicacaoDaAtividade : window.explicacaoDaAtividade);
  const expl = typeof explicar === 'function' ? explicar(a.id, atributos, en) : null;
  const fila = (Array.isArray(treinos) ? treinos : []).filter((t) => t && t.atividade === a.id);
  return (
    <div className="mn-janela-corpo">
      {/* A linha "é o que ele faz agora" SAIU (27/10/2026, pedido do usuário).
          Quem já diz isso é o rodapé: numa atividade ligada o botão não
          oferece o verbo, oferece Parar. Dizer duas vezes a mesma coisa, uma
          delas por extenso, era gastar a primeira linha da janela com o que o
          botão já resolve. */}
      {expl && expl.porque && <p className="mn-janela-frase">{expl.porque}</p>}
      {expl && expl.aprendizado && <p className="mn-janela-frase mn-janela-nota">{expl.aprendizado}</p>}
      {expl && expl.grupos.map((g) => (
        <section key={g.quando || 'efeito'} className="mn-janela-grupo">
          {g.quando && <h4 className="mn-rotulo">{g.quando}</h4>}
          <dl className="mn-janela-quadro">
            {g.linhas.map((l) => (
              <div key={l.rotulo} className="mn-janela-linha">
                <dt>
                  {l.rotulo}
                  {/* A cadência da exceção, ao lado do nome: é dela que o
                      leitor precisa ali, não num cabeçalho à parte. */}
                  {l.cadencia && <span className="fp-ativ-cadencia">({l.cadencia})</span>}
                </dt>
                <dd>{l.valor}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      {!!fila.length && (
        <section className="mn-janela-grupo">
          <h4 className="mn-rotulo">{en ? 'In the queue' : 'Na fila'}</h4>
          <dl className="mn-janela-quadro">
            {fila.map((t, i) => (
              <div key={t.id || i} className="mn-janela-linha">
                <dt>
                  {nomeDoTreino ? nomeDoTreino(t) : t.key}
                  <small>{(en ? 'level ' : 'nível ') + (t.tipo === 'magia' ? (Number(t.nivel) * 2 - 1) : t.nivel)}</small>
                </dt>
                <dd>{tempoDeTreino(t.horas_restantes)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}

/* ── FichaSubracaValor — a sub-raça na Identificação (22/10/2026) ─────────
   "Um personagem pode se transformar em vampiro permanentemente por vontade
   do mestre" e em lobisomem pela Licantropia Lupina. O valor da linha
   "Sub-raça"; para o Mestre ele é o próprio seletor, com a mesma lista do
   seletor de atividade (.fp-status-opcoes) — escolher é um clique, sem modal.

   Escolher aqui é a palavra final do Mestre: encerra também a Licantropia em
   curso (ver definirSubraca em FichaPersonagem). `venceEm` só vem quando o
   lobo é da magia, e aparece como prazo, igual ao do status. */
const SUBRACA_ICONE = { Vampiro: 'ti-droplet', Lobisomem: 'ti-paw' };

function FichaSubracaValor({ atual, venceEm, podeEditar, lang, onEscolher }) {
  const en = lang === 'en';
  const [aberta, setAberta] = useState(false);
  const dropRef = useRef(null);
  const NOMES = { Vampiro: en ? 'Vampire' : 'Vampiro', Lobisomem: en ? 'Werewolf' : 'Lobisomem' };
  const nenhuma = en ? 'None' : 'Nenhuma';

  useEffect(() => {
    if (!aberta) return undefined;
    const fora = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setAberta(false); };
    const esc = (e) => { if (e.key === 'Escape') setAberta(false); };
    document.addEventListener('mousedown', fora);
    window.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); window.removeEventListener('keydown', esc); };
  }, [aberta]);

  const rotulo = (
    <>
      {atual ? NOMES[atual] || atual : nenhuma}
      {atual && venceEm && typeof formatarDataFantasy === 'function' && (
        <em className="fp-status-prazo">{(en ? 'until ' : 'até ') + formatarDataFantasy(venceEm, lang)}</em>
      )}
    </>
  );
  if (!podeEditar) return <span className="fp-row-value">{rotulo}</span>;

  const escolher = (s) => { setAberta(false); if (s !== atual || venceEm) onEscolher(s); };
  const opcoes = [null, 'Vampiro', 'Lobisomem'];
  return (
    <span className="fp-row-value fp-status-wrap fp-subraca" ref={dropRef}>
      <button
        type="button"
        className={'fp-subraca-btn' + (aberta ? ' is-open' : '')}
        onClick={() => setAberta((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={aberta}
        aria-label={(en ? 'Change sub-race: ' : 'Mudar sub-raça: ') + (atual ? NOMES[atual] : nenhuma)}
      >
        {rotulo}
        <i className="ti ti-chevron-down" aria-hidden="true" />
      </button>
      {aberta && (
        <ul className="fp-status-opcoes" role="listbox" aria-label={en ? 'Sub-race' : 'Sub-raça'}>
          {opcoes.map((s) => (
            <li
              key={s || 'nenhuma'}
              role="option"
              aria-selected={s === atual}
              className={'fp-status-opcao' + (s === atual ? ' is-atual' : '')}
              onClick={() => escolher(s)}
            >
              <i className={'ti ' + (s ? SUBRACA_ICONE[s] : 'ti-x')} aria-hidden="true" />
              <span>{s ? NOMES[s] : nenhuma}</span>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}

function FichaStatusPainel({ lista, dataJogo, podeEditar, lang, onRemover }) {
  const en = lang === 'en';
  const vigentes = (typeof window !== 'undefined' && window.statusVigentes)
    ? window.statusVigentes(lista, dataJogo) : (lista || []);

  return (
    <div className="fp-status">
      <div className="fp-status-lista">
        {/* Sem status, sem texto — para ninguém (17/09/2026). Primeiro a frase
            saiu só do Jogador; agora sai também do Mestre, que tem o círculo
            de status na fileira das abas e não precisa de legenda para saber
            onde aplicar. */}
        {vigentes.map((st) => (
          <span key={st.id} className="fp-status-chip">
            <span className="fp-status-emoji" aria-hidden="true">{st.icone}</span>
            {st.nome}
            {st.vence_em && (
              <em className="fp-status-prazo">{formatarDataFantasy(st.vence_em, lang)}</em>
            )}
            {podeEditar && (
              <button type="button" className="fp-status-x"
                onClick={() => onRemover(st.id)}
                aria-label={(en ? 'Remove ' : 'Remover ') + st.nome}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

/* O passo 2 do seletor: "após selecionar, um modal para informar quantos dias
   permanecerá assim". O prazo é o motivo do modal e vem primeiro; o valor do
   efeito (dano por rodada, colunas de penalidade) só aparece para quem tem um,
   porque sem ele o status entraria mecanicamente vazio. */
function StatusPrazoModal({ def, lang, onCancel, onConfirm }) {
  const en = lang === 'en';
  const [dias, setDias] = useState(1);
  const [valor, setValor] = useState(1);
  const tb = ((typeof COPY !== 'undefined' ? COPY[lang] : null) || {}).batalha || {};
  const nome = tb[def.chaveCopy] || def.chaveCopy;

  return (
    <ModalShell
      title={<><i className={'ti ' + def.ic} aria-hidden="true" /> {nome}</>}
      lang={lang}
      size="sm"
      onClose={onCancel}
      onCancel={onCancel}
      /* Mínimo 1 (revisão de 24/09/2026): o prazo vence quando a data CHEGA
         ao dia do vencimento (statusVigentes), então 0 dias gravava um status
         que já nascia vencido e sumia da ficha na hora. 1 dia = até o Mestre
         virar o dia. */
      onConfirm={() => onConfirm(valor, Math.max(1, Number(dias) || 1))}
      confirmLabel={en ? 'Apply' : 'Aplicar'}
    >
      <div className="fp-status-modal">
        {/* A pergunta e os rótulos vestem o texto da LOJA (17/09/2026): a
            frase usa .loja-ficha-desc, os rótulos usam .loja-qtd-lbl. Dois
            modais que perguntam "quantos" não podem falar com vozes
            diferentes. */}
        <p className="loja-ficha-desc" style={{ margin: 0 }}>
          {en
            ? <>How many days will the character stay <strong>{nome}</strong>?</>
            : <>Por quantos dias o personagem ficará <strong>{nome}</strong>?</>}
        </p>
        {/* Os <input type="number"> nus saíram em 17/09/2026 — eram o quinto
            desenho para a mesma pergunta. Agora é o seletor do sistema
            (QuantidadeStepper, 01-core/helpers.jsx), o mesmo da barra de EF. */}
        <div className="fp-status-campos">
          <div className="fp-status-campo">
            <span className="loja-qtd-lbl">{en ? 'Days' : 'Dias'}</span>
            <QuantidadeStepper
              value={dias} min={1} onChange={setDias}
              label={en ? 'Days' : 'Dias'}
            />
          </div>
          {!def.semValor && (
            <div className="fp-status-campo">
              <span className="loja-qtd-lbl">{en ? def.rotuloValor.en : def.rotuloValor.pt}</span>
              <QuantidadeStepper
                value={valor} min={1} onChange={setValor}
                label={en ? def.rotuloValor.en : def.rotuloValor.pt}
              />
            </div>
          )}
        </div>
        {/* O "Sem prazo — até o Mestre remover" saiu em 17/09/2026. O prazo é
            sempre em dias agora; `statusComVencimento` continua entendendo
            null como eterno, e é assim que um status guardado sem vencimento
            (de dado antigo) segue valendo — só não há mais como criar um. */}
      </div>
    </ModalShell>
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
      if (val < -25) return { icon: 'ti-medical-cross', color: '#F26A6A' };
      if (val < 0)    return { icon: 'ti-medical-cross', color: '#f97316' };
      return null;
    },
  },
  {
    key: 'animo',
    check: (val) => {
      if (val < -25) return { icon: 'ti-zzz', color: '#F26A6A' };
      if (val < 0)    return { icon: 'ti-zzz', color: '#f97316' };
      return null;
    },
  },
  {
    key: 'hidratacao',
    check: (val) => {
      if (val < -25) return { icon: 'ti-bottle', color: '#F26A6A' };
      if (val < 0)    return { icon: 'ti-bottle', color: '#f97316' };
      return null;
    },
  },
  {
    key: 'nutricao',
    check: (val) => {
      if (val < -25) return { icon: 'ti-bowl-spoon', color: '#F26A6A' };
      if (val < 0)    return { icon: 'ti-bowl-spoon', color: '#f97316' };
      return null;
    },
  },
  {
    // Temperatura deixou de ser "ruim nos 2 extremos" (calor E frio) — agora
    // é linear como as outras (negativo ruim, positivo bom), então perde a
    // distinção de ícone sun/snow. Ver nota de rótulo em ConditionIcons.
    key: 'termorregulacao',
    check: (val) => {
      if (val < -25) return { icon: 'ti-sun-high', color: '#F26A6A' };
      if (val < 0)    return { icon: 'ti-sun-high', color: '#f97316' };
      return null;
    },
  },
  {
    key: 'euforia',
    check: (val) => {
      if (val < -25) return { icon: 'ti-cannabis', color: '#F26A6A' };
      if (val < 0)    return { icon: 'ti-cannabis', color: '#f97316' };
      return null;
    },
  },
  {
    key: 'sanidade',
    check: (val) => {
      if (val < -25) return { icon: 'ti-mood-sick', color: '#F26A6A' };
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
      if (val < 0) return { icon: 'ti-thumb-down', color: '#F26A6A' };
      return null;
    },
  },
  {
    // Peso: % da capacidade de carga (0–100, sistema à parte). Acúmulo (não
    // esgotamento): < 50% nada · 50–75% laranja · > 75% vermelho.
    key: 'peso',
    check: (pct) => {
      if (pct > 0.75) return { icon: 'ti-stack-2', color: '#F26A6A' };
      if (pct >= 0.50) return { icon: 'ti-stack-2', color: '#f97316' };
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
  saque_d: 'ti-swords',
  saque_e: 'ti-swords',
  orelha:  'ti-diamond',
  cabeca:  'ti-shield',
  capa:    'ti-shirt',
  costas:  'ti-shirt',
  pescoco: 'ti-diamond',
  ombros:  'ti-shield',
  ombro:   'ti-shield',
  // 'peito' era o peitoral; desde 26/10/2026 a região do peitoral é 'dorso'
  // e o peito guarda adornos e roupas.
  peito:   'ti-shirt',
  dorso:   'ti-shield',
  bracos:  'ti-shield',
  braco:   'ti-shield',
  pernas:  'ti-shield',
  perna:   'ti-shield',
  cintura: 'ti-shield',
  pes:     'ti-shield',
  pe:      'ti-shield',
  canela:  'ti-shield',
  dedos:   'ti-diamond',
  dedo:    'ti-diamond',
  pulso:   'ti-diamond',
  rosto:   'ti-masks-theater',
  alforje: 'ti-briefcase',
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
  'anel2': 'data:image/jpeg;base64,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',
  'colar': 'data:image/jpeg;base64,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',
  'brincos': 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCACEAIQDASIAAhEBAxEB/8QAGgAAAwEBAQEAAAAAAAAAAAAAAAECAwQFBv/EADUQAAEDAgUCBAQFAwUAAAAAAAEAAhEDIQQSMUFRYXETIoGhMpGx4QUUQsHRUvDxFSM0Q2L/xAAXAQEBAQEAAAAAAAAAAAAAAAAAAQID/8QAGxEBAQEAAwEBAAAAAAAAAAAAAAERAiExEkH/2gAMAwEAAhEDEQA/APkboCduiWiqHKJPJhLZGygEJ90uVQzfqkRwgaFPZQJOLI2ujWyAjqnyp6lCAN0RfVOOUiLoAJ/snfWUkBZCIG5QgSYUqgJuNFQDoER3smLzG+iACoFr6ojlOLaSiI0QTEE2W9LDuqUnVXubTpttmdueAN1jNl0YoHwMNDHNYaflkyCZM9kqmcKKoe7Dva/LJyfqjkcrmsQujBBxxlDw5zZxZuqyrZPzNbwiPDznKRxNlBBTgJEcp9lULZMcJJjRAhp0RdMT1TtvoOEUo6FCInZCIlVKkJxZUMGdUjpdAG9kb8KBjTQiU9ZhTvfdM9UUDeF1fh7n1a1PDGn4tLxA8tIkgD4j0tquZpsTHqu/DYWth2PqVavgNq0XAAEZ3CJFtQCpfFicVihha+Jp4NlNmZ7gyqyZycN4HVcDRA4XpPwtXGUcOMOfFFGiJYXDNJuco1IXnu1gqcSpESnJIKLR0RoNLLSCTqiLdRsifTbsntzCBaD9k4EW4ukddbKom/uUAB69kKm1MogNB6lCDIWTHXRSOqoDb6IhdkRugjsgICN9VRva3op+nVM6C0Irp/Cwx+PpeKWhoOY5tLaLLEVH1a9WpUcXPLiZ6qKVQ0qrXxMH5r2aVLCY+cXWpljWAl7qZjO6JAg7npZZty9tSbHjNe5tTM10OFwQdCuz8Wc1+La8fG+m01PLl8+9lbhg8E6arTVxLfMWz5GniBrC4Ktd2IqvqvuXG5SXaZkEQPVIi5nVAO024VG09FplMyTO6ZHrHCA2+59lR7IJO2l90Dn5pxpFwRojT12CCoECxNtghRfYoQZqgkmEQimDAKCEbaIFKI+SbZjUp02GpUaxoLi47CSivQ/B8B+areJVoOfREgEzlzbWFyOYXsYCkGUjQFIV6baVRpa0j4nfqiZ6chTTxuGcaWFrh1LChmV4pD2P/kb9ZWOKw+AqY2tWo1GtwdDK0eE6XVHRo3+dlPi8u1+px6Th8E+rjsOMXh22bLKjIcamWTebHSLwV5+PwldxfjABUpVHEktZlyngt2+i9Clivz2FrYasTFmiTyfISeQbTuCroVsPh6H+nUHVnZg4vNWLPAuGxsbhY74t9cnzpib+yc+bt7J1WZKjmDRpspI6Lo51QuCqsf7soggXvKo31t9EDtOpPKA2Z7fJI/FbZBdLXDNAnQCxQHyQrawwJyjuYQppjDS6BHCOhR7KorXVHy7oHZECEUhp1lb4N9ZmKYcMXNqmwyWN1gI/ynoZa4iNxqg63NxPhVX0XPFMgZ8pgGRusaA8Nzc0tDhrG3K3wuIyjIXubbKcokxxH6h0WtWvhSaXi1X1BRbkaynTyW6k6KzlJEvG2tTQFKjWe2sx7XPYxjmTDoOY/KyxoV6LXsccI97/ABy41M5GYf09O6rxq2M/41Bzw0QBTb5WDj7p4t9HCZ20Q9tR/wD1OdPhSL9ydJ4XO3a6Z04cTUpVcQ51GmWDjMT9VN76W1KgAkuc4am6Z16rUZtBibT6qhAbbV3KUNkxI4smGzeYA3VQFpLoA2+SBDfhu7n+FU5hlYMrRrP7qiG0+Z9/spq4k0pMl1+IJhCkufO46BCIyCYGiQ0TBuqh8wkCiT2hG2iKYuNJ4SJ4EBPe/wDhBG49UHXgKlCk6o6scr3DKx4E+Gf6oW+Fp5auJqVKjHtqUqo1+K2t+t15piSINt124OrTFFzKlPxDBDfNGU7O6xeynl1fZh4em2hRZUFei7O7z0nOIiD+obgrmxIpjEuNA/7bvM2dQDsitV8V4IAhrcrbWWdoUk/Vt/FC7doBU2mRdOBGYHTaE8oHmItsOVpkAeUl3wzbk9lWUugmzdgP2QAXHM/fQD+9EnP2B9f46KKZflGVsW9vuoO3VAbLjp3VCARGkfqGqeJ6nuShaZePdCDnBjsmOJSA+arsqggkGUryAnadEHXW/KKYEuA0Rbj0SGtvdOdZbEoFfXcJy5plpiRBypNuJKNTCBwZiL7BM7aHskDHPQ8Kp1OUZRsLSgIEZnabDlU1uc5na8c/ZAGc5iI4H97Ie8ExPrz9lFD3zIB7nn7KAM19I1KeXMRlF91M8abIjQtF2xYiQdZUjzdvonJDYmC3cfRS43MTCAfDnSJjZCeUbug8QhXRAGvZE390IQM2MbBTwhCIe6qL9BeEIRUi1ttVZaAUIQIgZR1TImqG7Tl9EIUFEnIOs+2yzPxQhCsK0aBndT2Akcyg2kixKELKoJJluwKfwiRrMIQqhIQhVH//2Q==',
  'braçadeiras': 'data:image/jpeg;base64,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',
  };
/* Imagem-placeholder por REGIÃO do mapa corporal: reaproveita as artes de
   FP_ITEM_BG pra que a casa mostre a "foto" do tipo de peça mesmo VAZIA
   (esmaecida). Quando um item é equipado, a arte própria dele (se houver)
   sobrepõe esta; senão esta serve de fallback. capa fica de fora (sem arte
   dedicada → mantém o ícone genérico). */
const FP_REGION_BG = {
  cabeca:  FP_ITEM_BG['elmo'],
  // 'peito' agora é a região de adornos e roupas (26/10/2026); o peitoral
  // mora no 'dorso'.
  peito:   FP_ITEM_BG['roupa'],
  dorso:   FP_ITEM_BG['peitoral'],
  ombros:  FP_ITEM_BG['ombreiras'],
  ombro:   FP_ITEM_BG['ombreiras'],
  pernas:  FP_ITEM_BG['calça'],
  perna:   FP_ITEM_BG['calça'],
  pes:     FP_ITEM_BG['botas'],
  pe:      FP_ITEM_BG['botas'],
  cintura: FP_ITEM_BG['cinto'],
  pescoco: FP_ITEM_BG['colar'],
  capa:   FP_ITEM_BG['capa'],
  costas:  FP_ITEM_BG['capa'],
  bracos:   FP_ITEM_BG['braçadeiras'],
  braco:    FP_ITEM_BG['braçadeiras'],
  dedos:    FP_ITEM_BG['anel2'],
  dedo:     FP_ITEM_BG['anel2'],
  pulso:    FP_ITEM_BG['anel2'],
  orelha:  FP_ITEM_BG['brincos'],
  roupa:   FP_ITEM_BG['roupa'],
  mao_d:   FP_ITEM_BG['espada'],
  maos:    FP_ITEM_BG['espada'],
  mao_e:   FP_ITEM_BG['escudo'],
  saque_d: FP_ITEM_BG['escudo'],
  saque_e: FP_ITEM_BG['espada'],
};

/* ── Arte pintada dos slots (23/10/2026) ───────────────────────────────────
   "Eu quero que a gente tenha pelo menos 3 versões de cada item equipável,
   leve, médio e pesado" (usuário). Pinturas no estilo de ícone de inventário,
   em public/equip/<peça>-<versão>.webp (320px). Armas e armaduras escolhem
   a versão pelo tipo_armadura do catálogo (L/M/P; sem tipo, médio); joias e
   roupas pelo valor (simples, ornado, nobre). A casa vazia mostra a versão do
   meio, esmaecida. Peça sem arte pintada ainda cai nas fotos antigas
   (FP_ITEM_BG/FP_REGION_BG). O que já foi pintado está em ARTE_PINTADA; a
   lista do que falta mora em .impeccable/arte-equipamentos.md. */
const ARTE_REGIAO = {
  cabeca: 'elmo', ombros: 'ombreiras', bracos: 'bracos', maos: 'luvas',
  pernas: 'pernas', pes: 'botas', mao_e: 'escudo', mao_d: 'arma',
  saque_e: 'arma', saque_d: 'arma',
  orelha: 'brincos', brinco: 'brincos', pescoco: 'colar', colar: 'colar', capa: 'capa',
  roupa: 'roupa', veste: 'roupa', cintura: 'cinto', cinto: 'cinto', dedos: 'anel', dedo: 'anel',
  // Regiões novas de 26/10/2026 — 'peito' passou a ser a região de adornos
  // e roupas (o peitoral mora no 'dorso'). O rosto é pintado pelo TIPO
  // (capuz, máscara) em ARTE_TIPO_FAMILIAS, não por este mapa; canela e
  // alforje ainda não têm pintura (ver .impeccable/arte-equipamentos.md).
  dorso: 'peitoral', peito: 'roupa', ombro: 'ombreiras', braco: 'bracos',
  perna: 'pernas', pe: 'botas', costas: 'capa', pulso: 'anel',
  /* A canela ficou sem silhueta até 26/10/2026 ("a canela ainda está vazia
     para o personagem"): não havia pintura de caneleiras. As três foram
     feitas no Figma no mesmo dia, e ela entrou na escada de peso como as
     outras peças de armadura. */
  canela: 'caneleiras',
  /* O rosto não tinha silhueta nenhuma (usuário, 26/10/2026: "rosto está
     vazio"): ele é pintado pelo TIPO (capuz, máscara), e tipo só existe com
     um item na casa. Vazio, mostra o capuz mais simples — a veste comum do
     rosto, pela regra de que vestimenta vazia é sempre a mais simples. A
     máscara é escolha de personagem, não o padrão de ninguém. */
  rosto: 'capuz',
};
/* As famílias cuja casa vazia tem versão PRÓPRIA, fora das duas escadas
   (peso e riqueza): o capuz vai por tecido, e o mais simples é o algodão. */
const ARTE_VAZIA_FIXA = { capuz: 'algodao' };
/* Região cuja silhueta vazia é uma pintura de ITEM inteira, e não uma peça de
   equipamento com versões (26/10/2026, pedido do usuário: "os ícones em
   alforje não estão aparecendo quando não há item equipado"). O alforje
   guarda bolsas, não armadura: não há escada de peso nem de material para
   percorrer.

   É a BOLSA, e não a algibeira (segundo pedido no mesmo dia: "o ícone do
   alforge padrão deve ser a bolsa"): a algibeira é a bolsinha de cinto, e o
   que a casa quer dizer é "aqui cabe o que se leva". */
const ARTE_VAZIA_ITEM = { alforje: 'bolsa' };
const ARTE_POR_RIQUEZA = new Set(['brincos', 'colar', 'capa', 'roupa', 'cinto', 'anel']);
// Faixas de valor (em latões) das joias e roupas: até 500 simples, até 5000 ornado.
const ARTE_FAIXA_SIMPLES = 500;
const ARTE_FAIXA_ORNADO = 5000;
const ARTE_PINTADA = new Set([
  'elmo-leve', 'elmo-medio', 'elmo-pesado',
  'ombreiras-leve', 'ombreiras-medio', 'ombreiras-pesado',
  'peitoral-leve', 'peitoral-medio', 'peitoral-pesado',
  'bracos-leve', 'bracos-medio', 'bracos-pesado',
  'luvas-leve', 'luvas-medio', 'luvas-pesado',
  'pernas-leve', 'pernas-medio', 'pernas-pesado',
  'botas-leve', 'botas-medio', 'botas-pesado',
  'caneleiras-leve', 'caneleiras-medio', 'caneleiras-pesado',
  'escudo-leve', 'escudo-medio', 'escudo-pesado',
  'arma-leve', 'arma-medio', 'arma-pesado',
  'brincos-simples', 'brincos-ornado', 'brincos-nobre',
  'colar-simples', 'colar-ornado', 'colar-nobre',
  'capa-simples', 'capa-ornado', 'capa-nobre',
  'roupa-simples', 'roupa-ornado', 'roupa-nobre',
  /* A CALÇA DE PANO (28/10/2026, Figma) — a vestimenta de PERNA, que até aqui
     não tinha pintura própria e por isso caía no glifo da região. Três
     tecidos, como o traje do peito: algodão cru, couro curtido e seda de
     corte. `pernas-*` continua sendo a armadura; estas são roupa. */
  'calca-algodao', 'calca-couro', 'calca-seda',
  'cinto-simples', 'cinto-ornado', 'cinto-nobre',
  'anel-simples', 'anel-ornado', 'anel-nobre',
  // as armas pelo tipo (23/10/2026) — ver ARMA_POR_NOME
  'arma-arco', 'arma-besta', 'arma-lanca', 'arma-tridente', 'arma-maca', 'arma-martelo',
  'arma-mangual', 'arma-cajado', 'arma-cetro', 'arma-chicote', 'arma-foice',
  /* 27/10/2026 — as 21 pinturas novas, já no vocabulário do TIPO: joia pelo
     metal, veste pelo tecido. "Brinco Nobre não existe mais, agora é Brinco de
     Ouro" (usuário). */
  'coroa-ouro', 'coroa-prata', 'coroa-cobre',
  'tiara-ouro', 'tiara-prata', 'tiara-cobre',
  'broche-ouro', 'broche-prata', 'broche-cobre',
  'medalha-ouro', 'medalha-prata', 'medalha-cobre',
  'pingente-ouro', 'pingente-prata', 'pingente-cobre',
  'capuz-seda', 'capuz-couro', 'capuz-algodao',
  'mascara-porcelana', 'mascara-couro', 'mascara-ferro',
  // "Os próximos itens que eu quero que faça os casacos." (usuário, 26/10/2026)
  'casaco-nobre', 'casaco-couro', 'casaco-algodao',
  /* AS ARMAS POR TIPO **E** PESO (26/10/2026): "crie imagens para espada leve,
     espada média, espada pesada, arco leve, …". Uma adaga e um montante eram a
     mesma pintura genérica de peso; agora o tipo lido do nome e a classe de
     peso do grupo de armas escolhem juntos. Ver arteDoSlot. */
  'arma-espada-leve', 'arma-espada-medio', 'arma-espada-pesado',
  'arma-arco-leve', 'arma-arco-medio', 'arma-arco-pesado',
  'arma-lanca-leve', 'arma-lanca-medio', 'arma-lanca-pesado',
  'arma-machado-leve', 'arma-machado-medio', 'arma-machado-pesado',
]);

/* A PINTURA SAI DO TIPO DA PEÇA (26/10/2026). As famílias novas são nomeadas
   pelo próprio tipo — coroa-ouro, capuz-seda, mascara-ferro — em vez das
   versões genéricas (simples/ornado/nobre) das famílias antigas: "Brinco
   Nobre não existe mais, agora é Brinco de Ouro" (usuário). A base vem do
   nome do item e a versão vem da palavra do material; quando a peça não diz
   o material (Coroa Abad'Dorim, Amuleto da Brasa), o preço decide, como em
   versaoDaArte. */
const ARTE_METAL = [
  [/\b(ouro|dourad)/, 'ouro'],
  [/\b(prata|pratead)/, 'prata'],
  [/\b(cobre|acobread|latao|marfim|rustic|ornament|bronze)/, 'cobre'],
];
const ARTE_TIPO_FAMILIAS = [
  { base: 'coroa', re: /\bcoroa\b/, versoes: ARTE_METAL },
  { base: 'tiara', re: /\btiara\b/, versoes: ARTE_METAL },
  { base: 'broche', re: /\bbroche\b/, versoes: ARTE_METAL },
  { base: 'medalha', re: /\bmedalha\b/, versoes: ARTE_METAL },
  { base: 'pingente', re: /\b(pingente|amuleto)\b/, versoes: ARTE_METAL },
  { base: 'capuz', re: /\bcapuz\b/, versoes: [
    [/\bseda\b/, 'seda'], [/\bcouro\b/, 'couro'], [/\b(algodao|linho|la)\b/, 'algodao'],
  ] },
  // Nobre é a de porcelana rachada a ouro; Selvagem, a de couro costurado;
  // Decorativa e o Olhar da Infâmia ficam com a de ferro rebitado.
  { base: 'mascara', re: /\b(mascara|olhar da infamia)\b/, versoes: [
    [/\b(nobre|porcelana|marfim)\b/, 'porcelana'],
    [/\b(selvagem|couro|rustic)\b/, 'couro'],
    [/\b(decorativ|ferro|guerra|infamia)/, 'ferro'],
  ] },
];
// Para quem não diz o material, o preço — as mesmas faixas de versaoDaArte.
const ARTE_TIPO_POR_PRECO = { ouro: 'ouro', prata: 'prata', cobre: 'cobre' };
/* A arte do TIPO, quando o nome do item diz qual é. Devolve null para a peça
   que ainda não tem família própria — aí vale o mapa por região. */
function arteDoTipo(cat) {
  if (!cat) return null;
  const n = String(cat.nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  for (const fam of ARTE_TIPO_FAMILIAS) {
    if (!fam.re.test(n)) continue;
    const achou = fam.versoes.find(([re]) => re.test(n));
    let versao = achou ? achou[1] : null;
    if (!versao) {
      const v = Number(cat.valor_latao) || 0;
      const faixa = v <= ARTE_FAIXA_SIMPLES ? 'cobre' : (v <= ARTE_FAIXA_ORNADO ? 'prata' : 'ouro');
      versao = ARTE_TIPO_POR_PRECO[faixa] || fam.versoes[fam.versoes.length - 1][1];
      // Família sem metal (capuz, máscara): a versão mais rica da lista.
      if (!ARTE_PINTADA.has(fam.base + '-' + versao)) versao = fam.versoes[0][1];
    }
    const nome = fam.base + '-' + versao;
    if (ARTE_PINTADA.has(nome)) return '/equip/' + nome + '.webp';
  }
  return null;
}
/* A VERSÃO VEM DO TIPO DA PEÇA (26/10/2026, pedido do usuário): "Escudo
   Pesado é uma imagem só, independente se é um escudo pesado verrogari ou
   padmarashka". Para armadura e escudo o tipo é a classe de peso
   (tipo_armadura L/M/P); para joia e veste é o MATERIAL do nome — ouro é
   nobre, prata é ornado, cobre/latão/marfim é simples. O valor em latões
   continua como último recurso, para a peça que não diz o material. */
const ARTE_MATERIAL = [
  [/\b(ouro|dourad)/, 'nobre'],
  [/\b(prata|pratead)/, 'ornado'],
  [/\b(cobre|acobread|latao|lat[ãa]o|ornament|marfim|rustic|bronze)/, 'simples'],
  [/\b(seda|nobre|luxuos|veludo)/, 'nobre'],
  [/\b(linho|decorad|militar|complet)/, 'ornado'],
  [/\b(algod[ãa]o|algodao|palha|couro|l[ãa]|simples|profissional)/, 'simples'],
];
/* A CASA VAZIA VESTE A PROFISSÃO (26/10/2026, pedido do usuário):

     "Quando não houver nenhum item equipado, os itens esmaecidos serão
      conforme profissão: Magos, Bardos e Ladinos: equipamentos leves;
      Rastreadores e Sacerdotes: equipamentos médios; Guerreiros:
      equipamentos pesados. Os equipamentos de vestimenta devem ser sempre os
      mais simples."

   A pintura esmaecida da casa vazia é uma SUGESTÃO do que vai ali — então
   ela mostra o que aquele personagem de fato usaria. Antes era sempre a
   versão média (e a ornada nas vestes), que não dizia nada sobre ninguém. */
/* A MÃO VAZIA TAMBÉM VESTE A PROFISSÃO (26/10/2026, pedido do usuário):

     "Guerreiro: machado pesado em duas mãos. Sacerdote: espada média em uma
      mão e escudo médio na outra. Ladino: espada leve nas duas mãos.
      Rastreador: espada média nas duas mãos. Bardo: arco médio nas duas
      mãos. Mago: cajado leve nas duas mãos."

   `d` é a mão da arma e `e` a da outra peça; quem usa a mesma arma "nas duas
   mãos" repete o arquivo, que é como a ficha já mostra a arma de duas mãos
   equipada. Vale também para as duas casas de saque rápido: são casas de
   arma, e a silhueta diz o mesmo. As pinturas são as que existem — a espada
   leve é a arma-leve, o arco e o cajado não têm versão por peso. */
const ARMA_VAZIA_POR_PROFISSAO = {
  'Guerreiro':  { d: 'arma-pesado', e: 'arma-pesado' },   // machado pesado, duas mãos
  'Sacerdote':  { d: 'arma-medio', e: 'escudo-medio' },   // espada média + escudo médio
  'Ladino':     { d: 'arma-leve', e: 'arma-leve' },
  'Rastreador': { d: 'arma-medio', e: 'arma-medio' },
  'Bardo':      { d: 'arma-arco', e: 'arma-arco' },
  'Mago':       { d: 'arma-cajado', e: 'arma-cajado' },
};
// Sem profissão conhecida: espada e escudo médios, que é o que a ficha
// mostrava antes de a regra existir.
const ARMA_VAZIA_PADRAO = { d: 'arma-medio', e: 'escudo-medio' };

const PESO_DA_PROFISSAO = {
  'Mago': 'leve', 'Bardo': 'leve', 'Ladino': 'leve',
  'Rastreador': 'medio', 'Sacerdote': 'medio',
  'Guerreiro': 'pesado',
};
const pesoVazioDaProfissao = (profissao) => PESO_DA_PROFISSAO[String(profissao || '').trim()] || 'medio';

function versaoDaArte(base, cat, profissao) {
  if (!cat && ARTE_VAZIA_FIXA[base]) return ARTE_VAZIA_FIXA[base];
  if (ARTE_POR_RIQUEZA.has(base)) {
    // Veste e joia da casa vazia: sempre a mais simples.
    if (!cat) return 'simples';
    const n = String(cat.nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    for (const [re, versao] of ARTE_MATERIAL) if (re.test(n)) return versao;
    const v = Number(cat.valor_latao) || 0;
    return v <= ARTE_FAIXA_SIMPLES ? 'simples' : (v <= ARTE_FAIXA_ORNADO ? 'ornado' : 'nobre');
  }
  const t = cat ? String(cat.tipo_armadura || '').trim().toUpperCase() : '';
  // Casa vazia: a classe de peso que a profissão usaria.
  if (!cat) return pesoVazioDaProfissao(profissao);
  return t === 'L' ? 'leve' : (t === 'P' ? 'pesado' : 'medio');
}
/* A ARMA PELO TIPO (23/10/2026): "quando a arma equipada for um arco, mostre
   nas duas mãos um arco, quando for um machado um machado, quando for uma
   lança, uma lança". O catálogo não tem o tipo — grupo_armas é a família de
   dano (CL, CM, PM…) —, então ele sai do nome; as armas de nome próprio vão
   pela descrição do catálogo (Crissaegrim é rapieira, Galadhrim é arco…).
   Arma de duas mãos já é espelhada nas duas casas (ocupanteDefesa). Sem tipo
   reconhecido (arremesso, soqueira…), fica a pintura pelo peso, como antes. */
const ARMA_POR_NOME = [
  ['besta', /\b(besta|arlabesta)\b/],
  ['arco', /\b(arco|galadhrim|impetusion)\b/],
  ['tridente', /\btridente\b/],
  ['lanca', /\b(lanca|pique|alabarda|arpao|ur)\b/],
  ['machado', /\b(machado|machadinha|labris)\b/],
  ['foice', /\b(foice|reshanta)\b/],
  ['chicote', /\b(chicote|assassina de vampiros)\b/],
  ['mangual', /\bmangual\b/],
  ['martelo', /\b(martelo|marreta|malho)\b/],
  ['maca', /\b(maca|clava|porrete|hongor-tun|estrela da manha)\b/],
  ['cetro', /\bcetro\b/],
  ['cajado', /\b(cajado|libano da luz|necroptum|coracao de lena)\b/],
  ['adaga', /\b(adaga|punhal|faca)\b/],
  ['espada', /\b(espada|montante|cimitarra|sabre|rapieira|crissaegrim|daeva do mar|jagan|kronagar|sagae|vampirus escarlate)\b/],
];
// Adaga usa a pintura genérica leve; espada e machado têm as suas por peso.
const ARMA_ARTE = { adaga: 'arma-leve' };
/* A CLASSE DE PESO DA ARMA (26/10/2026) — a mesma do grupo de armas, pela
   última letra da sigla (PL/CL/EL leve, PM/CM/EM média, PP/CP/EP pesada). É a
   mesma conta de baseDaArma (01-core/bases-item.jsx), lida de lá para não
   haver duas réguas; sem grupo gravado, não há peso. */
function pesoDaArma(cat) {
  const base = (typeof window !== 'undefined' && window.baseDaArma)
    ? window.baseDaArma(cat && cat.grupo_armas) : null;
  return base ? base.replace(/^arma-/, '') : null;
}
// Escudo também vem como categoria 'arma' no catálogo: fica com as pinturas de escudo.
const ehEscudo = (cat) => !!cat && /\bescudo\b/i.test(String(cat.nome || ''));
function tipoDaArma(cat) {
  if (!cat || cat.categoria_equip !== 'arma' || ehEscudo(cat)) return null;
  const n = String(cat.nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const achou = ARMA_POR_NOME.find(([, re]) => re.test(n));
  return achou ? achou[0] : null;
}
function arteDoSlot(regiao, cat, profissao) {
  /* A BASE MANDA TAMBÉM NA CASA DA FICHA (26/10/2026). Sem isto, a mesma peça
     teria duas pinturas: o casaco mostraria "casaco-couro" no inventário
     (arteDoItem, que lê a base) e "roupa-ornado" no corpo do personagem (a
     escada de riqueza da região). A ARMA segue de fora — a base dela é a
     classe de peso, e a mão desenha o tipo, que sabe mais. */
  if (cat && cat.base && !(typeof window !== 'undefined' && window.ehArmaDeMao && window.ehArmaDeMao(cat))) {
    const daBase = arteDaBase(cat.base);
    if (daBase) return daBase;
  }
  const porTipo = arteDoTipo(cat);
  if (porTipo) return porTipo;
  /* Região de bolsa (alforje): a casa mostra a peça que está nela — a
     pintura do próprio item, que mora em /itens — e, vazia, a algibeira. Não
     há escada de peso nem de material aqui para o mapa de região percorrer. */
  if (ARTE_VAZIA_ITEM[regiao]) {
    const arquivo = cat ? null : ARTE_VAZIA_ITEM[regiao];
    if (arquivo && (ARTE_ITEM_SLUG.has(arquivo) || ARTE_ITEM_NOVA.has(arquivo))) {
      return '/itens/' + arquivo + '.webp';
    }
    if (cat) {
      const alias = cat.slug && ARTE_SLUG_ALIAS[cat.slug];
      const slug = (alias && ARTE_ITEM_SLUG.has(alias)) ? alias
        : (cat.slug && ARTE_ITEM_SLUG.has(cat.slug)) ? cat.slug : null;
      if (slug) return '/itens/' + slug + '.webp';
    }
  }
  const base = ARTE_REGIAO[regiao];
  if (!base) return null;
  // O saque rápido mostra a MESMA arte da mão (arma pelo tipo, escudo pelo peso).
  if (regiao === 'mao_d' || regiao === 'mao_e' || regiao === 'saque_d' || regiao === 'saque_e') {
    // Casa VAZIA: o par de armas que a profissão usaria.
    if (!cat) {
      const par = ARMA_VAZIA_POR_PROFISSAO[String(profissao || '').trim()] || ARMA_VAZIA_PADRAO;
      const arquivo = (regiao === 'mao_e' || regiao === 'saque_e') ? par.e : par.d;
      return ARTE_PINTADA.has(arquivo) ? '/equip/' + arquivo + '.webp' : null;
    }
    /* TIPO E PESO (26/10/2026, pedido do usuário: "crie imagens para espada
       leve, espada média, espada pesada, arco leve, …"). Uma espada leve e um
       montante são a mesma palavra e desenhos diferentes, e o catálogo já
       sabe de qual se trata pelo grupo de armas. A escada desce do mais
       específico ao mais geral, e cada degrau só vale se a pintura existir:
         arma-espada-medio → arma-espada → arma-medio
       Assim um tipo novo entra sem peso, e um peso novo entra sem tipo. */
    const tipo = tipoDaArma(cat);
    if (tipo) {
      const peso = pesoDaArma(cat);
      const tentativas = [
        peso && ('arma-' + tipo + '-' + peso),
        ARMA_ARTE[tipo] || ('arma-' + tipo),
      ].filter(Boolean);
      for (const nomeArma of tentativas) {
        if (ARTE_PINTADA.has(nomeArma)) return '/equip/' + nomeArma + '.webp';
      }
    }
    if (ehEscudo(cat)) {
      const nomeEscudo = 'escudo-' + versaoDaArte('escudo', cat, profissao);
      return ARTE_PINTADA.has(nomeEscudo) ? '/equip/' + nomeEscudo + '.webp' : null;
    }
    // Arma sem tipo reconhecido na mão esquerda: a arte de arma pelo peso, não a de escudo.
    if (cat && cat.categoria_equip === 'arma') {
      const nomePeso = 'arma-' + versaoDaArte('arma', cat, profissao);
      return ARTE_PINTADA.has(nomePeso) ? '/equip/' + nomePeso + '.webp' : null;
    }
  }
  const nome = base + '-' + versaoDaArte(base, cat, profissao);
  return ARTE_PINTADA.has(nome) ? '/equip/' + nome + '.webp' : null;
}
/* A PINTURA DE UM ITEM DO CATÁLOGO (23/10/2026): "vamos usar essas imagens no
   slot do item no inventário e na loja". A mesma pintura da casa da Ficha,
   escolhida pelo slot do catálogo — com cuidado com o que divide o slot:
   instrumentos (mãos), coroas/tiaras/chapéus (cabeça), alforges e aljavas
   (cintura), braceletes e broches (dedos) e as armas naturais das criaturas
   ficam sem pintura (o ícone de sempre). Manopla é luva. */
/* OS 20 CONSUMÍVEIS MAIS COMUNS (23/10/2026): os que mais aparecem nos
   inventários dos personagens, com pintura própria em /itens/<slug>.webp.
   Titânico = dracônico (vermelho e ouro), Profano = infernal (preto e brasa),
   Sagrado = celestial (branco e ouro). */
const ARTE_ITEM_SLUG = new Set([
  'agua', 'racao', 'pederneira', 'tocha', 'flecha', 'lenha', 'hidromel',
  'pena_draconica', 'couro_demoniaco', 'oleo_draconico', 'sangue_draconico', 'pena_demoniaca',
  'marfim_demoniaca', 'oleo_demoniaco', 'couro_draconico', 'marfim_draconica', 'pena_celestial',
  'carne_draconica',
  // os 20 mais comuns seguintes (24/10/2026)
  'alforge', 'cantil', 'equipamento_de_viagem', 'odre', 'algibeira', 'algibeira_grande', 'bolsa',
  'moeda_cobre', 'moeda_latao', 'moeda_prata', 'moeda_ouro', 'frasco', 'aljava', 'aljava_reforcada',
  'pergaminho', 'bainha', 'cachimbo', 'carne_demoniaca', 'lamparina', 'sandalias',
]);

/* ── A PINTURA DO ITEM PELO TIPO (26/10/2026) ──────────────────────────────
   Até aqui a pintura de item era por SLUG: uma imagem por item do catálogo.
   Isso não escala — só de "Livro de …" e "Manual de …" são quase 160 entradas,
   e todas são o mesmo objeto. Daí a regra do usuário, a mesma dos equipáveis:
   "uma imagem apenas para livro".

   ARTE_ITEM_NOVA são as 20 pinturas de tipo (public/itens/<tipo>.webp) e
   ARTE_ITEM_TIPO é a tabela que leva o NOME do item ao tipo. A tabela é
   ORDENADA: a primeira que casa vence (Pérola Fantasma é um navio, não uma
   pérola, e por isso o barco vem antes da gema).

   Só vale para item SEM região (`slot_equip` nulo): peça vestível é resolvida
   antes, por arteDoTipo e pelo mapa de região, e um "Anel Dourado" não pode
   cair na pintura de minério. */
const ARTE_ITEM_NOVA = new Set([
  'livro', 'equipamento', 'gema', 'minerio', 'elixir', 'bau', 'barril', 'mochila',
  'saco', 'jarra', 'quadro', 'estatua', 'carroca', 'barco', 'sela', 'arreio',
  'casa', 'virote', 'dardo', 'cavalo',
  /* O ARREAMENTO COMPLETO (27/10/2026): as oito peças que faltavam para as
     doze casas do bicho terem pintura própria. Gualdrapa e Manta saíram da
     pintura do Arreio, que era empréstimo. Ver a família Montaria em
     01-core/bases-item.jsx e ARTE_ARREIO_VAZIO, mais abaixo. */
  'cabecada', 'manta', 'gualdrapa', 'peitoral-montaria',
  'crinum', 'chanfron', 'caneleiras-montaria', 'barda',
  /* A COLHEITA (28/10/2026, pedido do usuário: "todas as ervas devem ter a
     mesma imagem, todos os cogumelos devem ter a mesma imagem"). Eram duas
     pinturas por SLUG — `cogumelo_aria` e `erva_rubashi` —, e por isso só uma
     erva e um cogumelo tinham imagem; os outros quatro ficavam no glifo. Os
     arquivos viraram `erva.webp` e `cogumelo.webp` e a tabela abaixo leva o
     tipo inteiro a eles, como já era com Livro e Manual. */
  'erva', 'cogumelo',
]);
const ARTE_ITEM_TIPO = [
  // As obras: ~145 "Livro de …" e 14 "Manual do …" numa pintura só.
  [/^(livro|manual)\b/, 'livro'],
  [/^equipamentos?\b/, 'equipamento'],
  [/^pergaminho\b/, 'pergaminho'],
  [/^elixir\b/, 'elixir'],
  [/^frasco\b/, 'frasco'],
  [/^flecha\b/, 'flecha'],
  [/^virote\b/, 'virote'],
  [/^dardo\b/, 'dardo'],
  [/^(racao|refeicao|banquete|lembas)\b/, 'racao'],
  // A colheita: uma pintura para toda erva, outra para todo cogumelo.
  [/^erva\b/, 'erva'],
  [/^cogumelo\b/, 'cogumelo'],
  [/^(vinho|licor|cerveja|hidromel|suco)\b/, 'hidromel'],
  // Recipientes
  [/^(arca|bau|caixa)\b/, 'bau'],
  [/^(barril|tonel)\b/, 'barril'],
  [/^mochila\b/, 'mochila'],
  [/^saco\b/, 'saco'],
  [/^(jarra|urna)\b/, 'jarra'],
  [/^(cabaca|caramanhola)\b/, 'cantil'],
  // Obras de arte e relíquias
  [/^quadro\b/, 'quadro'],
  [/^(estatua|busto)\b/, 'estatua'],
  // Transportes — a Pérola Fantasma é navio, e vem antes da gema.
  [/^(barco|barcaca|canoa|caravela|nau|veleiro)\b|perola fantasma/, 'barco'],
  [/^(carroca|carruagem|charrete|carro de boi|treno)\b/, 'carroca'],
  // Montaria: a sela, o arreio e o animal
  [/^alforje\b/, 'alforge'],
  [/^sela\b/, 'sela'],
  [/^(arreio|cabecada|gualdrapa|manta de sela)\b/, 'arreio'],
  [/^(cavalo|ponei|andaluz|ardennes)\b|puro-sangue/, 'cavalo'],
  // Moedas antigas: a mesma pintura da moeda corrente do metal.
  [/^moeda antiga de cobre/, 'moeda_cobre'],
  [/^moeda antiga de latao/, 'moeda_latao'],
  [/^moeda antiga de prata/, 'moeda_prata'],
  [/^moeda (antiga )?de ouro/, 'moeda_ouro'],
  // Minerais: metal bruto e pedra preciosa
  [/^(aco|aerilium|arcanitro|bronze|carvao|cinetezio|ferro|gravornita|ignivar|inferium|luminar|nautilium|ouro|prata)\b/, 'minerio'],
  [/^(agua marinha|ambar|ametista|diamante|esmeralda|jade|obsidiana|opala|perola|quartzo|rubi|safira|topazio|turmalina|pedra vidente)\b/, 'gema'],
  [/^pedra\b/, 'minerio'],
  // Propriedades
  [/^(casa|casarao|casebre|castelo|choupana|mansao|palacio|taverna|hospedaria|forte|fortaleza|torreao|igreja|moinho|padaria|rancho|fazenda|estabulo|farol|forjaria|carpintaria|guilda|escritorio)\b/, 'casa'],
];
/* A pintura do item que não tem região. Devolve null quando o nome não cai em
   nenhum tipo — aí fica o glifo de sempre. */
function arteDoItemPorTipo(nomeNormalizado) {
  const achou = ARTE_ITEM_TIPO.find(([re]) => re.test(nomeNormalizado));
  if (!achou) return null;
  const arquivo = achou[1];
  if (!ARTE_ITEM_NOVA.has(arquivo) && !ARTE_ITEM_SLUG.has(arquivo)) return null;
  return '/itens/' + arquivo + '.webp';
}
/* Regi\u00e3o do cat\u00e1logo \u2192 base da pintura. Aceita o vocabul\u00e1rio NOVO (17 regi\u00f5es,
   26/10/2026) e o antigo das inst\u00e2ncias j\u00e1 gravadas. A base define o arquivo
   (elmo, peitoral, anel\u2026) e versaoDaArte define a vers\u00e3o pelo TIPO da pe\u00e7a. */
const ARTE_BASE_POR_REGIAO = {
  // equipamento (classe de peso)
  cabeca: 'elmo', ombro: 'ombreiras', ombros: 'ombreiras', dorso: 'peitoral',
  braco: 'bracos', bracos: 'bracos', perna: 'pernas', pernas: 'pernas',
  // vestes e adornos (material)
  peito: 'roupa', corpo: 'roupa', roupa: 'roupa',
  costas: 'capa', capa: 'capa', cintura: 'cinto', cinto: 'cinto',
  orelha: 'brincos', orelhas: 'brincos', brinco: 'brincos',
  pescoco: 'colar', colar: 'colar', dedo: 'anel', dedos: 'anel', joia: 'anel',
  pulso: 'anel',
};
/* A VARIANTE É O MESMO TIPO (26/10/2026): "Escudo Pesado é uma imagem só".
   Alforge Duplo é um alforje, Bainha Longa é uma bainha, Algibeira Planense é
   uma algibeira — usam a pintura do parente em vez do glifo. */
const ARTE_SLUG_ALIAS = {
  alforge_duplo: 'alforge',
  algibeira_planense: 'algibeira',
  bainha_5: 'bainha',          // "Bainha Longa" no catálogo
};
/* A PINTURA VEM DA BASE (26/10/2026, pedido do usuário) ───────────────────
   "Existe a base do item, por exemplo 'Máscara de Ouro', e existe o exemplar
   do item, 'Máscara Decorativa', 'Máscara Verrogari'." O que vinha antes
   disto — adivinhar o material pelo nome do exemplar — está errado na raiz:
   "Verrogari" não diz se a máscara é de ouro ou de couro. Agora quem manda é
   `itens.base`, escolhida no editor (vocabulário em 01-core/bases-item.jsx).

   O palpite pelo nome continua logo abaixo, como REDE: item sem base ainda
   não ficou sem pintura, e o Mestre corrige a base quando passar por ele. */
function arteDaBase(slugBase) {
  const base = typeof window !== 'undefined' && window.baseDoItem ? window.baseDoItem(slugBase) : null;
  if (!base) return null;
  const arquivo = base.arte || base.slug;
  if (base.onde === 'itens') {
    return (ARTE_ITEM_NOVA.has(arquivo) || ARTE_ITEM_SLUG.has(arquivo))
      ? '/itens/' + arquivo + '.webp' : null;
  }
  return ARTE_PINTADA.has(arquivo) ? '/equip/' + arquivo + '.webp' : null;
}
function arteDoItem(cat) {
  if (!cat) return null;
  /* A ARMA É A EXCEÇÃO DA BASE (26/10/2026): a base dela é a classe de peso
     (Arma Leve/Média/Pesada, tirada do grupo de armas), e a pintura da mão
     sabe mais do que isso — "quando a arma equipada for um arco, mostre nas
     duas mãos um arco" (23/10/2026). Então aqui a base não atalha: quem
     decide é arteDoSlot, pelo tipo lido do nome, com o peso como recuo. */
  const armaDeMao = typeof window !== 'undefined' && window.ehArmaDeMao
    ? window.ehArmaDeMao(cat)
    : (cat.categoria_equip === 'arma' && !ehEscudo(cat));
  if (cat.base && !armaDeMao) {
    const daBase = arteDaBase(cat.base);
    if (daBase) return daBase;
    // Base conhecida mas ainda sem pintura: é o glifo da região, e não o
    // palpite pelo nome — a base já disse o que a peça é.
    if (typeof window !== 'undefined' && window.baseDoItem && window.baseDoItem(cat.base)) return null;
  }
  const alias = cat.slug && ARTE_SLUG_ALIAS[cat.slug];
  if (alias && ARTE_ITEM_SLUG.has(alias)) return '/itens/' + alias + '.webp';
  if (cat.slug && ARTE_ITEM_SLUG.has(cat.slug)) return '/itens/' + cat.slug + '.webp';
  // o tipo tem a palavra final: coroa, tiara, broche, medalha, pingente, capuz, máscara
  const porTipo = arteDoTipo(cat);
  if (porTipo) return porTipo;
  const s = cat.slot_equip, c = cat.categoria_equip;
  const n = String(cat.nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  // Item sem regi\u00e3o: a pintura vem do TIPO do nome (livro, elixir, gema\u2026).
  if (!s) return arteDoItemPorTipo(n);
  // M\u00e3o: arma pelo tipo (arco, machado\u2026) ou escudo pela classe de peso.
  if (s === 'mao' || s === 'maos') {
    if (c !== 'arma' || cat.grupo_armas === 'Livre') return null;
    return arteDoSlot(ehEscudo(cat) ? 'mao_e' : 'mao_d', cat);
  }
  // Manoplas s\u00e3o pe\u00e7a de m\u00e3o, n\u00e3o de bra\u00e7o.
  if (c === 'armadura' && (s === 'braco' || s === 'bracos') && /manopla/.test(n)) {
    return arteDoSlot('maos', cat);
  }
  // P\u00e9: s\u00f3 bota e sand\u00e1lia t\u00eam pintura (a sand\u00e1lia tem a sua em /itens).
  if (s === 'pe' || s === 'pes') {
    if (c === 'armadura' || /\bbotas?\b/.test(n)) return arteDoSlot('pes', cat);
    return null;
  }
  // Cintura: a cinta tem pintura; a cal\u00e7a ainda n\u00e3o.
  if ((s === 'cintura' || s === 'cinto') && !/\bcint/.test(n)) return null;
  // Dedo e pulso: anel e pulseira usam a pintura do anel; o resto, nada.
  if ((s === 'dedo' || s === 'dedos' || s === 'joia' || s === 'pulso')
      && !/\b(anel|aneis|bracelete|pulseira|narya|nenya|vilya)\b/.test(n)) return null;
  const base = ARTE_BASE_POR_REGIAO[s];
  if (!base) return null;
  const nome = base + '-' + versaoDaArte(base, cat);
  return ARTE_PINTADA.has(nome) ? '/equip/' + nome + '.webp' : null;
}
window.arteDoItem = arteDoItem;
/* A galeria do Mestre (10-shell/galeria-imagens.jsx) conta as pinturas a
   partir desta mesma lista — o placar nunca discorda do que a ficha usa. */
window.ARTE_PINTADA = ARTE_PINTADA;
window.ARTE_ITEM_SLUG = ARTE_ITEM_SLUG;
window.ARTE_ITEM_NOVA = ARTE_ITEM_NOVA;
window.arteDaBase = arteDaBase;
/* ── AS PINTURAS DE UMA BASE, NO PLURAL (27/10/2026) ──────────────────────
   Pedido do usuário: "você fez o desenho de um machado duplo, que eu vi na
   ficha, mas não vejo ele nas imagens do sistema."

   Ele tinha razão e a galeria não estava errada: ela lista UMA pintura por
   base, e a ARMA é a base que não funciona assim. A base da arma é só o PESO
   (Arma Leve/Média/Pesada, tirada do grupo de armas) — o tipo vem do nome do
   exemplar, e é por isso que existem doze telas (espada, arco, lança e
   machado × leve, média e pesada) para três bases. Com uma pintura por base,
   nove delas não tinham por onde aparecer.

   Então a galeria passa a perguntar no plural. Base comum devolve a sua
   única tela; a arma devolve as que foram pintadas, com o nome do tipo. */
const ARMA_TIPO_NOME = {
  espada: 'Espada', machado: 'Machado', lanca: 'Lança', arco: 'Arco', besta: 'Besta',
  tridente: 'Tridente', foice: 'Foice', chicote: 'Chicote', mangual: 'Mangual',
  martelo: 'Martelo', maca: 'Maça', cetro: 'Cetro', cajado: 'Cajado', adaga: 'Adaga',
};
function artesDaBase(slugBase) {
  const slug = String(slugBase || '');
  const peso = /^arma-(leve|medio|pesado)$/.test(slug) ? slug.replace(/^arma-/, '') : null;
  if (!peso) {
    const src = arteDaBase(slug);
    return src ? [{ src, variante: null }] : [];
  }
  const fora = [];
  ARMA_POR_NOME.forEach(([tipo]) => {
    const arquivo = 'arma-' + tipo + '-' + peso;
    if (ARTE_PINTADA.has(arquivo)) {
      fora.push({ src: '/equip/' + arquivo + '.webp', variante: ARMA_TIPO_NOME[tipo] || tipo });
    }
  });
  // A tela genérica do peso, quando existir, fecha a lista.
  if (ARTE_PINTADA.has(slug)) fora.push({ src: '/equip/' + slug + '.webp', variante: null });
  return fora;
}
window.artesDaBase = artesDaBase;
/* A casa do boneco também é consultada de fora (teste da regra por
   profissão, e quem quiser a arte de uma região vazia). */
window.arteDoSlot = arteDoSlot;
/* Para as casas que juntam várias peças (brincos, roupas, anéis, cinto): a
   arte da primeira peça, ou a da região vazia. */
function arteDaCasaAgrupada(regiao, itens, catalogoBySlug, profissao) {
  const cat = itens && itens[0] ? catalogoBySlug[itens[0].slug] : null;
  return arteDoSlot(regiao, cat, profissao) || FP_REGION_BG[regiao] || null;
}

const fpItemBgStyle = (img, faded) => img ? {
  backgroundImage: `linear-gradient(to top, ${faded
    ? 'rgba(10,8,5,0.92), rgba(10,8,5,0.62) 60%, rgba(10,8,5,0.80)'
    : 'rgba(10,8,5,0.88), rgba(10,8,5,0.18) 55%, rgba(10,8,5,0.38)'}), url(${img})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
} : undefined;

/* Números das janelas de detalhe (14/09/2026): "use o ícone ti-number-5-small
   para mostrar o nível das habilidades, magias, etc." Mesma família que o card
   do combatente já usa (iconeNumero, 12-batalha/batalha.jsx), e com o mesmo
   limite: o Tabler só tem de 0 a 100. Fora disso (total negativo) devolve
   null e quem chama escreve o número — ícone inexistente não dá erro, some. */
function iconeNumeroFicha(n) {
  if (n == null || n === '') return null;
  const v = Number(n);
  if (!Number.isInteger(v) || v < 0 || v > 100) return null;
  return 'ti-number-' + v + '-small';
}

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
/* O texto dos itens do RITUAL de uma magia, ou null se ela não é Ritual.
   Coluna própria desde 26/09/2026; as antigas o têm no fim da descrição. */
function ritualDaMagia(m) {
  if (!m || !/ritual/i.test(m.evocacao || '')) return null;
  const sep = (typeof window !== 'undefined' && window.separarItensNecessarios) || null;
  const texto = m.itens_necessarios || (sep ? sep(m.descricao).itens : null);
  return texto && String(texto).trim() ? String(texto).trim() : null;
}

function MagiaDetalhesModal({ magia, passos, nivelMagiaEfetivoFn, eu, colegas, animais, elosAtuais, lang, onClose, onEvocar, abrirTip, fecharTip, ritual, dataJogo }) {
  const en = lang === 'en';
  const m = magia;
  const possui = passos != null;
  const nivelAtual = possui ? nivelMagiaEfetivoFn(passos) : null;

  const NIVEIS = [1, 3, 5, 7, 9].map((n) => ({
    n,
    titulo: m[`nivel_${n}`],
    valor: m[`valor_${n}`],
  // Só os níveis que o personagem JÁ aprendeu (pedido do usuário, 12/09/2026):
  // os bloqueados apareciam com cadeado e só ocupavam espaço.
  })).filter((nv) => (nv.titulo || nv.valor) && (!possui || nv.n <= nivelAtual));

  // Nível escolhido pelo jogador p/ evocar — começa no maior nível que ele
  // possui (mais comum) e só pode ser ajustado pra algo <= nivelAtual.
  const [nivelSel, setNivelSel] = useState(possui ? nivelAtual : null);
  // Alvo escolhido: 'self' (o próprio PJ) ou o id (string) de um colega.
  const [alvoSel, setAlvoSel] = useState(null);

  // Esc e o scroll do fundo: o BestDetalheModal cuida (26/09/2026).

  const escolherNivel = (n) => {
    if (n > nivelAtual) return; // bloqueado: acima do nível possuído
    setNivelSel(n);
  };

  /* O id do próprio PJ, NÃO a palavra 'self' (15/09/2026).

     Era 'self', e isso fazia a evocação em si mesmo parecer evocação em
     terceiro: `emMim` comparava com pj.id, dava falso, o efeito não pousava,
     e o pedido ia para a fila do Mestre com alvo_id='self'. Ao aprovar, o
     banco recusava: invalid input syntax for type bigint: "self". */
  /* ELO PERMANENTE (27/09/2026): a magia que cria elo (Elo Animal) tem como
     alvo os ANIMAIS do personagem, não os protagonistas. O card diz o
     estágio e, quando não dá, o porquê — estágio acima do nível escolhido,
     elo já feito ou o limite de 3 (bloqueioElo, 07-inventario). */
  const criaElo = typeof window.magiaCriaElo === 'function' && window.magiaCriaElo(m);
  /* ALCANCE PESSOAL (27/09/2026): "Magias de uso 'pessoal' só podem ser
     usados no próprio evocador." Os colegas saem da lista — o mesmo teste da
     aba Apoio da batalha (12-batalha/batalha.jsx) e do tabuleiro (alcance 0). */
  const soEmSi = /pessoal/i.test(m.alcance || '');
  /* MILAGRE (22/10/2026): "Um personagem vampiro, lobisomem ou sem religião
     não pode usar ou ser alvo de milagres" — e a Escuridão (o Mago) não
     conjura. Quem não pode usar vê o porquê e não evoca; quem não pode
     receber sai da lista de alvos. Regra em 01-core/game-data.jsx. */
  const ehMilagre = m.classe === 'Milagre';
  const _ap = window.atorMilagreDePj, _bm = window.bloqueioMilagre, _ab = window.alvoDeMilagreBloqueado;
  const bloqueioMil = ehMilagre && _ap && _bm && eu ? _bm(_ap(eu, dataJogo)) : null;
  /* O colega chega de get_pjs_historia com as magias ativas soltas
     (magias_ativas): o lobisomem da Licantropia também não recebe milagre. */
  const comEstado = (pj) => (pj && !pj.estado_atual && Array.isArray(pj.magias_ativas)
    ? { ...pj, estado_atual: { magias_ativas: pj.magias_ativas } } : pj);
  const recebeMilagre = (pj) => !(ehMilagre && _ap && _ab && pj && _ab(_ap(comEstado(pj), dataJogo)));
  const ALVOS = criaElo
    ? (animais || []).map((a) => ({
        id: 'animal:' + a.instancia.instanceId, tipo: 'animal', instanceId: a.instancia.instanceId,
        nome: (a.cat && a.cat.nome) || a.criatura.nome, estagio: a.criatura.estagio,
        bloqueio: window.bloqueioElo(a, nivelSel, elosAtuais),
      }))
    : [
    ...(recebeMilagre(eu) ? [{ id: String(eu?.id ?? 'self'), nome: [eu?.nome, eu?.sobrenome].filter(Boolean).join(' ') /* só o nome (26/09/2026, sem o '(Você)') */, foto_url: eu?.foto_url }] : []),
    ...((soEmSi ? [] : colegas || []).filter(recebeMilagre).map((c) => ({ id: String(c.id), nome: [c.nome, c.sobrenome].filter(Boolean).join(' '), foto_url: c.foto_url }))),
  ];

  const FICHA_TXT = [
    { ic: 'ti-wand', lbl: en ? 'Casting' : 'Evocação', val: m.evocacao },
    { ic: 'ti-arrows-maximize', lbl: en ? 'Range' : 'Alcance', val: m.alcance },
    { ic: 'ti-hourglass', lbl: en ? 'Duration' : 'Duração', val: m.duracao },
    { ic: 'ti-crosshair', lbl: en ? 'Target' : 'Alvo', val: m.alvo },
  ].filter((f) => f.val);

  // Ritual sem os itens não evoca (28/09/2026) — o aviso aparece na aba Evocar.
  const podeEvocar = possui && nivelSel != null && alvoSel != null && (!ritual || ritual.ok) && !bloqueioMil;

  /* PADRÃO DOS MODAIS (26/09/2026) — o modelo único de janela
     (BestDetalheModal), com as abas de detalhe do Treinamento.
     Janela de USAR (pedido do usuário, mesmo dia): "coloque os níveis junto
     com descrição, e chama tudo de descrição. Adicione uma aba nova, que
     será a principal: onde será possível escolher o alvo e o nível. O botão
     ao lado do x é para executar a magia."
     Então: aba Evocar (primeira) com nível e alvo; Descrição com os níveis
     aprendidos; Características. O ícone Evocar executa — desativado até
     haver nível e alvo, com o motivo no tooltip. */
  const Janela = window.BestDetalheModal;
  const Corpo = window.BestMagiaFicha;
  const Linha = window.BestLinha;
  const niveisPermitidos = possui ? new Set([1, 3, 5, 7, 9].filter((n) => n <= nivelAtual)) : null;
  // O card de alvo marcado, para a dica "clique aqui novamente" (26/09/2026).
  const [alvoDicaEl, setAlvoDicaEl] = useState(null);
  const _Dica = window.DicaNoAlvo;
  const evocar = () => {
    if (!podeEvocar) return;
    const alvo = ALVOS.find((a) => a.id === alvoSel) || null;
    if (onEvocar) onEvocar({ nivel: nivelSel, alvo });
    onClose();
  };

  const abaPrincipal = possui && onEvocar ? (
    <div className="best-secao det-uso">
      <h4 className="best-secao-titulo">{en ? 'Cast' : 'Evocar'}</h4>
      {/* ITENS DO RITUAL (28/09/2026): "Magias do tipo 'Ritual' consomem os
          itens necessários automaticamente do inventário, se o evocador não
          tiver os itens, ele será avisado." O que falta vem em destaque, e o
          ritual não sai enquanto faltar alguma coisa. */}
      {bloqueioMil && (
        <div className="det-ritual det-ritual--falta" role="alert">
          <p className="det-ritual-titulo">
            <i className="ti ti-alert-triangle" aria-hidden="true" />
            {window.motivoMilagreLabel ? window.motivoMilagreLabel(bloqueioMil.motivo, en) : bloqueioMil.motivo}
          </p>
        </div>
      )}
      {ritual && (
        <div className={'det-ritual' + (ritual.ok ? '' : ' det-ritual--falta')} role={ritual.ok ? undefined : 'alert'}>
          <p className="det-ritual-titulo">
            <i className={'ti ' + (ritual.ok ? 'ti-candle' : 'ti-alert-triangle')} aria-hidden="true" />
            {ritual.ok
              ? (en ? 'The ritual will consume:' : 'O ritual vai consumir:')
              : (en ? 'Missing items for the ritual:' : 'Faltam itens para o ritual:')}
          </p>
          <ul className="det-ritual-lista">
            {ritual.ok
              ? ritual.gastos.map((g) => <li key={g.nome}>{g.nome} ×{g.qtd}</li>)
              : ritual.faltam.map((f) => (
                  <li key={f.nome} className="is-falta">
                    {f.nome} — {en ? `you have ${f.tem} of ${f.precisa}` : `você tem ${f.tem} de ${f.precisa}`}
                  </li>
                ))}
          </ul>
        </div>
      )}
      {/* Sem os títulos 'Nível' e 'Alvo' (26/09/2026). Nível e alvo marcam em
          vermelho; clicar DE NOVO no alvo marcado evoca — o card é a ação,
          não há ícone ao lado do X. */}
      {NIVEIS.map((nv) => {
        const selecionado = nv.n === nivelSel;
        return (
          <button type="button" key={nv.n}
            className={'det-stat mag-nivel-card' + (selecionado ? ' mag-nivel-card--sel' : '')}
            onClick={() => escolherNivel(nv.n)} aria-pressed={selecionado}>
            <span className="mag-nivel-titulo">
              <i className={'ti ' + iconeNumeroFicha(nv.n)} aria-hidden="true" style={{ fontSize: 20 }} />
              {nv.titulo}
              {selecionado && <i className="ti ti-check" aria-hidden="true" style={{ marginLeft: 'auto', color: 'var(--gold, var(--vivo))' }} />}
            </span>
          </button>
        );
      })}
      <div className="det-opt-grid det-alvos">
        {criaElo && ALVOS.length === 0 && (
          <p className="best-desc">{en ? 'The character has no animals to bond with.' : 'O personagem não tem animais para criar o elo.'}</p>
        )}
        {ALVOS.map((a) => {
          if (a.tipo === 'animal') {
            const selecionado = alvoSel === a.id && !a.bloqueio;
            const sub = a.bloqueio ? window.motivoEloLabel(a.bloqueio, en, nivelSel) : ((en ? 'Stage ' : 'Estágio ') + (a.estagio ?? '—'));
            return (
              <button type="button" key={a.id} data-animal={a.instanceId}
                className={'det-opt-card' + (selecionado ? ' det-opt-card--sel' : '') + (a.bloqueio ? ' det-opt-card--off' : '')}
                aria-disabled={!!a.bloqueio || undefined}
                ref={(el) => { if (selecionado && el) setAlvoDicaEl(el); }}
                onClick={() => { if (a.bloqueio) return; if (selecionado && nivelSel != null) evocar(); else setAlvoSel(a.id); }}
                aria-pressed={selecionado}
                aria-label={a.nome + ' — ' + sub}>
                <span className="det-opt-foto det-opt-foto--vazia"><i className="ti ti-paw" aria-hidden="true" /></span>
                <span className="det-opt-nome">{a.nome}<span className="det-opt-sub">{sub}</span></span>
                {selecionado && <i className="ti ti-check" aria-hidden="true" style={{ color: 'var(--gold, var(--vivo))' }} />}
              </button>
            );
          }
          const selecionado = alvoSel === a.id;
          // Sem o '(Você) ' na frente, senão a inicial vira '(' (26/09/2026).
          const iniciais = (a.nome || '?').replace(/^\([^)]*\)\s*/, '').trim().slice(0, 1).toUpperCase();
          return (
            <button type="button" key={a.id}
              className={'det-opt-card' + (selecionado ? ' det-opt-card--sel' : '')}
              ref={(el) => { if (selecionado && el) setAlvoDicaEl(el); }}
              onClick={() => { if (selecionado && nivelSel != null) evocar(); else setAlvoSel(a.id); }}
              aria-pressed={selecionado}
              aria-label={selecionado ? (en ? 'Click again to cast on ' : 'Clique de novo para evocar em ') + a.nome : a.nome}>
              {a.foto_url
                ? <img className="det-opt-foto" src={a.foto_url} alt="" />
                : <span className="det-opt-foto det-opt-foto--vazia">{iniciais}</span>}
              <span className="det-opt-nome">{a.nome}</span>
              {selecionado && <i className="ti ti-check" aria-hidden="true" style={{ color: 'var(--gold, var(--vivo))' }} />}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  if (!Janela || !Corpo) return null;
  return (
    <Janela
      title={<><i className="ti ti-comet det-title-ic" aria-hidden="true" /> {m.nome}</>}
      lang={lang}
      onClose={onClose}
      acoes={[]}>
      {abaPrincipal}
      {_Dica && alvoSel != null && nivelSel != null && <_Dica alvo={alvoDicaEl} texto={en ? 'Click here again to cast' : 'Clique aqui novamente para evocar'} />}
      <Corpo m={m} lang={lang} niveisPermitidos={niveisPermitidos} niveisNaDescricao
        linhasExtras={Linha ? <Linha rotulo={en ? 'Your level' : 'Seu nível'} valor={possui ? nivelAtual : (en ? 'Not learned' : 'Não aprendida')} /> : null} />
    </Janela>
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
function HabilidadeDetalhesModal({ habilidade, total, nivel, lang, onClose, onUsar, abrirTip, fecharTip }) {
  const en = lang === 'en';
  const h = habilidade;

  const DIFICULDADES = [
    { id: 'facil', lbl: en ? 'Easy' : 'Fácil' },
    { id: 'medio', lbl: en ? 'Medium' : 'Médio' },
    { id: 'dificil', lbl: en ? 'Hard' : 'Difícil' },
    { id: 'muito_dificil', lbl: en ? 'Very hard' : 'Muito difícil' },
    { id: 'absurdo', lbl: en ? 'Absurd' : 'Absurdo' },
  ];
  /* Nenhuma marcada de início (26/09/2026): o 1º clique marca o card (em
     vermelho) e o 2º, no mesmo card, rola — igual ao alvo da magia. Com Médio
     pré-marcado, um clique só em Médio já rolaria. */
  const [dificuldadeSel, setDificuldadeSel] = useState(null);
  // O card marcado, para a dica "clique aqui novamente" (26/09/2026).
  const [difDicaEl, setDifDicaEl] = useState(null);

  // Esc e o scroll do fundo: o BestDetalheModal cuida (26/09/2026).

  const ATRIBUTO_LBL = {
    intelecto: en ? 'Intellect' : 'Intelecto',
    aura: 'Aura',
    carisma: en ? 'Charisma' : 'Carisma',
    forca: en ? 'Strength' : 'Força',
    fisico: en ? 'Body' : 'Físico',
    agilidade: en ? 'Agility' : 'Agilidade',
    percepcao: en ? 'Perception' : 'Percepção',
  };

  /* Atributo, grupo e restrição: só o ícone, e o texto no tooltip (pedido do
     usuário, 12/09/2026) — o mesmo trato dos atributos da magia e dos efeitos
     do item. O texto ao lado competia com o total. */
  const FICHA_TXT = [
    { ic: 'ti-adjustments', lbl: en ? 'Attribute' : 'Atributo', val: ATRIBUTO_LBL[h.ajuste] || h.ajuste },
    { ic: 'ti-category', lbl: en ? 'Group' : 'Grupo', val: h.grupo },
    { ic: 'ti-ban', lbl: en ? 'Restriction' : 'Restrição', val: h.restricao },
  ].filter((f) => f.val != null && f.val !== '');

  // O total com sinal de menos de verdade ("−2", não hífen).
  const totalTxt = total == null ? null : (total < 0 ? `−${Math.abs(total)}` : String(total));

  /* PADRÃO DOS MODAIS (26/09/2026) — ver MagiaDetalhesModal acima: aba Usar
     (a principal) com a dificuldade, depois as abas de detalhe do Treinamento
     (BestHabilidadeFicha) com o total do personagem. O ícone Usar, ao lado
     do X, rola o dado. */
  const Janela = window.BestDetalheModal;
  const Corpo = window.BestHabilidadeFicha;
  const Linha = window.BestLinha;
  if (!Janela || !Corpo) return null;
  return (
    <Janela
      title={<><i className="ti ti-bolt det-title-ic" aria-hidden="true" /> {h.nome}</>}
      lang={lang}
      onClose={onClose}
      /* Sem ícone de ação (26/09/2026): 'só clicar no card da dificuldade o
         dado vai rolar' — o card É a ação. */
      acoes={[]}>
      {onUsar && (
        <div className="best-secao det-uso">
          <h4 className="best-secao-titulo">{en ? 'Use' : 'Usar'}</h4>
          <div className="det-opt-grid det-dif-grid" role="radiogroup" aria-label={en ? 'Difficulty' : 'Dificuldade'}>
            {DIFICULDADES.map((d) => {
              const selecionado = dificuldadeSel === d.id;
              return (
                <button type="button" key={d.id} role="radio" aria-checked={selecionado}
                  data-dificuldade={d.id}
                  className={'det-opt-card det-dif-card' + (selecionado ? ' det-opt-card--sel' : '')}
                  ref={(el) => { if (selecionado && el) setDifDicaEl(el); }}
                  // 1º clique marca; 2º clique no mesmo card rola (26/09/2026).
                  aria-label={selecionado ? (en ? 'Click again to roll: ' : 'Clique de novo para rolar: ') + d.lbl : d.lbl}
                  onClick={() => {
                    if (selecionado) onUsar({ nome: h.nome, total: total, dificuldade: d.id });
                    else setDificuldadeSel(d.id);
                  }}>
                  <span className="det-opt-nome">{d.lbl}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {window.DicaNoAlvo && dificuldadeSel && <window.DicaNoAlvo alvo={difDicaEl} texto={en ? 'Click here again to roll' : 'Clique aqui novamente para rolar'} />}
      {/* As mesmas linhas da consulta pelo Conhecimento: Nível e Total. */}
      <Corpo h={h} lang={lang}
        linhasExtras={Linha ? (
          <>
            <Linha rotulo={en ? 'Level' : 'Nível'} valor={nivel || (en ? 'Not learned' : 'Não aprendida')} />
            {totalTxt != null && <Linha rotulo="Total" valor={totalTxt} />}
          </>
        ) : null} />
    </Janela>
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
// ── Cabeçalho de coluna com navegação por subgrupo ───────────────────────
// pages = [{ key, label }]. Quando pages.length === 1 não mostra seta nem indicadores.
//
// PRECISA ficar no escopo do MÓDULO (fora de FichaInfoView), e não "por
// organização" dentro dela: um componente declarado dentro de outro vira um
// TIPO NOVO a cada render do pai. FichaInfoView re-renderiza toda vez que
// abrirTip roda (useTooltip -> setTip), e abrirTip é chamado pelo onFocus
// deste próprio botão — que o navegador dispara sozinho no mousedown de
// QUALQUER clique de mouse (mousedown → foco → mouseup → click). Com
// ColTitleNav dentro de FichaInfoView, esse foco remonta a subárvore entre
// o mousedown e o click: o nó que recebeu o mousedown vira órfão e o clique
// nunca chega ao onClick. Resultado: a seta aparecia, mas não respondia a
// clique nenhum. Mover para cá quebra esse ciclo — FichaInfoView continua
// re-renderizando no foco/tooltip, mas ColTitleNav é o MESMO tipo entre
// renders, então React só atualiza o botão existente em vez de trocá-lo.
/* `subComoTitulo` (27/09/2026, ficha dos animais): "remova os subtítulos
   'identidade', 'coice', eles serão os títulos." A página atual vira o título
   da coluna; embaixo ficam só os traços de página, quando há mais de uma. */
const ColTitleNav = ({ mainLabel: mainLabelProp, pages, page, onNext, abrirTip, fecharTip, en, subComoTitulo }) => {
  const multi = pages.length > 1;
  const sub = pages[page] || pages[0];
  const mainLabel = subComoTitulo ? sub.label : mainLabelProp;
  return (
    <div className="fp-col-title-nav">

      {/* Linha do título principal + seta */}
      <div className="fp-col-title-top">
        <span className="fp-col-title-main">
          {mainLabel}
        </span>
        {/* SEM TOOLTIP (06/10/2026): "Remova o tooltip da seta para navegar
            nos menus caracterizações, atributos, etc." (usuário) Os traços
            abaixo já dizem quantas páginas há e em qual se está, e o título
            troca no clique — o balão repetia o que a própria tela mostra.
            O `aria-label` FICA: quem usa leitor de tela não tem os traços. */}
        <button
            className="fp-col-title-nav-btn"
            onClick={multi ? onNext : undefined}
            aria-label={multi ? `${en ? 'Next' : 'Próximo'}: ${pages[(page + 1) % pages.length].label}` : undefined}
            aria-hidden={!multi}
            onMouseEnter={(e) => { if (multi) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(201,164,78,0.12)'; } }}
            onMouseLeave={(e) => { if (multi) { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.background = 'none'; } }}
          >
            <i className="ti ti-chevron-right" aria-hidden="true" />
          </button>
      </div>

      {/* Sub-label visível; indicadores e seta só aparecem quando multi.
          Coluna SEM submenu (Atributos, 26/09/2026) — uma página só, com o
          mesmo nome da coluna — não repete o nome embaixo. */}
      {/* Com o título vindo da página (subComoTitulo), a faixa dos traços
          existe SEMPRE — vazia na coluna de página única —, para a linha sob
          o título ficar na mesma altura em todas as colunas (27/09/2026). */}
      {(subComoTitulo || !(!multi && sub.label === mainLabel)) && (
      <div className={'fp-col-title-sub-row' + (subComoTitulo ? ' fp-col-title-sub-row--fixa' : '')}>
        {!subComoTitulo && (
        <span className="fp-col-title-sub">
          {sub.label}
        </span>
        )}
        {/* Indicadores: traços largos=ativo, curtos=inativo — só quando há >1 página */}
        {multi && (
          <div className="fp-col-title-dots">
            {pages.map((_, i) => (
              <div key={i} className={'fp-col-title-dot ' + (i === page ? 'fp-col-title-dot--active' : 'fp-col-title-dot--inactive')} />
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
};

function FichaInfoView({
  pj, en,
  atributosFinais, derivadas, estagioNum, xpTotal, velocidade,
  pesoPersonagem, alturaPersonagem,
  catalogoHab, catalogoMag, catalogoTec,
  habsByKey, pjHabilidades, pjMagias, pjTecnicas,
  nivelMagiaEfetivoFn, totalHabilidadeFn, totalTecnicaFn,
  bonusHabilidades, titulo,
  historiaPj,
  // Sub-raça em vigor (22/10/2026): { atual, venceEm }. `onEscolherSubraca`
  // só chega para o Mestre — sem ele a linha é só leitura.
  subracaInfo, onEscolherSubraca, lang,
  // 'personagem' | 'conhecimento' — as duas abas que dividiram Informações.
  parte = 'personagem',
  /* Clicar numa habilidade, técnica ou magia do Conhecimento abre a janela
     de detalhe dela (26/09/2026, "ao clicar em cada habilidade, magia,
     técnica, será possível abrir o modal com a descrição"). */
  onAbrirHabilidade, onAbrirTecnica, onAbrirMagia,
}) {
  const [tip, abrirTip, fecharTip, manterTip] = useTooltip(60);
  const _d = derivadas || {};

  // ── Estado de navegação — um índice por coluna ──────────────────────────
  const [col1Page, setCol1Page] = useState(0);
  const [col2Page, setCol2Page] = useState(0);
  const [col3Page, setCol3Page] = useState(0);
  const [col4Page, setCol4Page] = useState(0);
  const [col5Page, setCol5Page] = useState(0);

  // ── helpers visuais ──────────────────────────────────────────────
  // Linha que abre a janela de detalhe: clique e Enter/Espaço.
  const clicavel = (fn) => (fn ? {
    role: 'button', tabIndex: 0, onClick: fn,
    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } },
  } : {});
  const Row = ({ label, value }) => (
    <div className="fp-row">
      <span className="fp-row-label">{label}</span>
      <span className="fp-row-value">{value ?? '—'}</span>
    </div>
  );

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

  /* 26/09/2026 — Informações virou DUAS abas ("Personagem" e
     "Conhecimento"), três colunas cada:
       Personagem   Identidade (Identificação, Caracterizações) · Atributos ·
                    Complemento (Derivadas, Grupo de Armas, Habilidades
                    Aperfeiçoadas)
       Conhecimento Habilidades (os seis grupos) · Técnicas (Básicas,
                    Avançadas) · Magias (Básicas, Avançadas)
     As páginas pedidas existem SEMPRE, mesmo vazias (dizem "Nenhuma…"): a
     coluna tem o mesmo mapa para todo personagem. */
  const col1Pages = [
    { key: 'identidade', label: en ? 'Identification' : 'Identificação' },
    { key: 'caract',     label: en ? 'Traits'         : 'Caracterizações' },
  ];
  const col1Idx = col1Page % col1Pages.length;
  const col1Sub = col1Pages[col1Idx].key;

  const col1 = (
    <div className="fp-col-pad-l">
      <ColTitleNav
        mainLabel={en ? 'Identity' : 'Identidade'} subComoTitulo
        pages={col1Pages}
        page={col1Idx}
        onNext={() => setCol1Page((p) => (p + 1) % col1Pages.length)}
        abrirTip={abrirTip} fecharTip={fecharTip} en={en}
      />

      {col1Sub === 'identidade' && (
        <>
          <Row label={en ? 'Name'           : 'Nome'}           value={pj.nome} />
          <Row label={en ? 'Surname'        : 'Sobrenome'}      value={pj.sobrenome} />
          <Row label={en ? 'Title'          : 'Título'}         value={titulo || null} />
          <Row label={en ? 'Race'           : 'Raça'}           value={pj.raca} />
          {/* Sub-raça: o Jogador só vê quando existe; o Mestre vê sempre,
              porque a linha é onde ele transforma o personagem. */}
          {(onEscolherSubraca || (subracaInfo && subracaInfo.atual)) && (
            <div className="fp-row">
              <span className="fp-row-label">{en ? 'Sub-race' : 'Sub-raça'}</span>
              <FichaSubracaValor
                atual={subracaInfo && subracaInfo.atual}
                venceEm={subracaInfo && subracaInfo.venceEm}
                podeEditar={!!onEscolherSubraca}
                lang={lang || (en ? 'en' : 'pt')}
                onEscolher={onEscolherSubraca}
              />
            </div>
          )}
          <Row label={en ? 'Gender'         : 'Gênero'}         value={pj.genero} />
          {pesoPersonagem != null && (
            <Row label={en ? 'Weight' : 'Peso'} value={`${pesoPersonagem} kg`} />
          )}
          {alturaPersonagem != null && (
            <Row label={en ? 'Height' : 'Altura'} value={`${Math.round(alturaPersonagem * 100)} cm`} />
          )}
          {(() => {
            // Idade calculada: ano atual do jogo − ano de nascimento.
            // Requer pj.data_nasc.ano e historiaPj.data_jogo_atual.ano.
            const dn = pj.data_nasc;
            const dj = historiaPj?.data_jogo_atual;
            if (dn?.ano != null && dj?.ano != null) {
              const idade = Number(dj.ano) - Number(dn.ano);
              const meses = typeof FANTASY_MONTHS !== 'undefined' ? FANTASY_MONTHS : null;
              const nomeMes = meses ? (meses[dn.mes - 1]?.nome || '').replace(/^Mês /, '') : `Mês ${dn.mes}`;
              return (
                <>
                  <Row label={en ? 'Date of Birth' : 'Nascimento'} value={`${dn.dia} ${nomeMes} de ${dn.ano}`} />
                  <Row label={en ? 'Age' : 'Idade'} value={`${idade} ${en ? 'years' : 'anos'}`} />
                </>
              );
            }
            // Fallback: campo legado pj.idade (personagens criados antes da migração)
            if (pj.idade != null) return <Row label={en ? 'Age' : 'Idade'} value={pj.idade} />;
            return null;
          })()}
          {/* Sem o ícone da profissão desde 02/10/2026 (pedido do usuário). */}
          <Row label={en ? 'Profession' : 'Profissão'} value={pj.profissao} />
          <Row label={en ? 'Group'          :  'Grupo'}         value={pj.especializacao} />
          <Row label={en ? 'Kingdom'        : 'Reino'}          value={pj.reino} />
          <Row label={en ? 'God'            : 'Deus'}           value={pj.deus} />
        </>
      )}

      {col1Sub === 'caract' && (tractosFlat.length === 0 ? (
        <div className="fp-col-empty">{en ? 'No traits.' : 'Nenhuma caracterização.'}</div>
      ) : tractosFlat.map((t, i) => {
        const nome = t.nome ? t.nome.charAt(0).toUpperCase() + t.nome.slice(1) : t.nome;
        return <Row key={i} label={GRUPO_LABEL[t.grupo] || t.grupo} value={nome} />;
      }))}
    </div>
  );

  // ── Atributos — coluna própria, sem submenu (26/09/2026) ──────────────
  const colAtributos = (
    <div>
      <ColTitleNav
        mainLabel={en ? 'Attributes' : 'Atributos'} subComoTitulo
        pages={[{ key: 'atributos', label: en ? 'Attributes' : 'Atributos' }]}
        page={0}
        onNext={() => {}}
        abrirTip={abrirTip} fecharTip={fecharTip} en={en}
      />
      <Row label={en ? 'Intellect'  : 'Intelecto'}  value={atributosFinais?.intelecto  ?? '—'} />
      <Row label="Aura"                              value={atributosFinais?.aura        ?? '—'} />
      <Row label={en ? 'Charisma'   : 'Carisma'}    value={atributosFinais?.carisma     ?? '—'} />
      <Row label={en ? 'Strength'   : 'Força'}      value={atributosFinais?.forca       ?? '—'} />
      <Row label={en ? 'Body'       : 'Físico'}     value={atributosFinais?.fisico      ?? '—'} />
      <Row label={en ? 'Perception' : 'Percepção'}  value={atributosFinais?.percepcao   ?? '—'} />
      <Row label={en ? 'Agility'    : 'Agilidade'}  value={atributosFinais?.agilidade   ?? '—'} />
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

  /* HABILIDADES APERFEIÇOADAS: o que as quatro habilidades de aprimoramento
     renderam (pj.aprimoramentos: idioma, religiao, arte, sabedoria) — a antiga
     página Idiomas era só a primeira delas. Os idiomas de nascença entram
     marcados "Nativo". */
  const APRIM_LABEL = {
    idioma: en ? 'Language' : 'Idioma', religiao: en ? 'Religion' : 'Religião',
    arte: en ? 'Art' : 'Arte', sabedoria: en ? 'Wisdom' : 'Sabedoria',
  };
  const aperfeicoadas = [
    ...idiomasTodos.map((nome) => ({ tipo: 'idioma', nome, nativo: idiomasNativos.includes(nome) })),
    ...['religiao', 'arte', 'sabedoria'].flatMap((k) =>
      (pj.aprimoramentos?.[k] || []).filter(Boolean).map((nome) => ({ tipo: k, nome }))),
  ];

  const col2Pages = [
    { key: 'derivadas', label: en ? 'Stats'          : 'Derivadas' },
    { key: 'armas',     label: en ? 'Weapon Groups'  : 'Grupo de Armas' },
    { key: 'aperf',     label: en ? 'Improved Skills' : 'Habilidades Aperfeiçoadas' },
  ];
  const col2Idx = col2Page % col2Pages.length;
  const col2Sub = col2Pages[col2Idx].key;

  const col2 = (
    <div className="fp-col-pad-r">
      <ColTitleNav
        mainLabel={en ? 'Complement' : 'Complemento'} subComoTitulo
        pages={col2Pages}
        page={col2Idx}
        onNext={() => setCol2Page((p) => (p + 1) % col2Pages.length)}
        abrirTip={abrirTip} fecharTip={fecharTip} en={en}
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

      {col2Sub === 'armas' && (gaEntries.length === 0 ? (
        <div className="fp-col-empty">{en ? 'No weapon groups.' : 'Nenhum grupo de armas.'}</div>
      ) : gaEntries.map(([sigla, val]) => {
        const nomeGrupo = _gaByS[sigla]?.nome || sigla;
        return <Row key={sigla} label={nomeGrupo} value={String(val)} />;
      }))}

      {col2Sub === 'aperf' && (aperfeicoadas.length === 0 ? (
        <div className="fp-col-empty">{en ? 'None yet.' : 'Nenhuma ainda.'}</div>
      ) : aperfeicoadas.map((a) => (
        <div key={a.tipo + ':' + a.nome} className="fp-row">
          <span className="fp-row-label">{APRIM_LABEL[a.tipo]}</span>
          <span className="fp-row-value">
            {a.nome}
            {a.nativo && <span className="fp-idioma-tag">{en ? 'Native' : 'Nativo'}</span>}
          </span>
        </div>
      )))}
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

  /* TODAS as habilidades do grupo, aprendidas ou não (pedido do usuário,
     14/09/2026). Até aqui só apareciam as compradas, e o jogador não via o
     que existia para aprender. A não aprendida sai apagada, com o total que
     ela daria hoje — a mesma conta dos atalhos da ficha, só sem os pontos
     ("nada impede que ele faça o teste com o total negativo").
     Grupo sem nenhuma habilidade no catálogo continua de fora. */
  /* O GRUPO É O TÍTULO (27/09/2026): "'habilidades profissionais',
     'habilidades de influência' será o título ao invés de 'habilidades'". */
  const TITULO_GRUPO_HAB = {
    Profissional: ['Habilidades Profissionais', 'Professional Skills'],
    'Influência': ['Habilidades de Influência', 'Influence Skills'],
    Conhecimento: ['Habilidades de Conhecimento', 'Knowledge Skills'],
    Geral: ['Habilidades Gerais', 'General Skills'],
    Manobra: ['Habilidades de Manobra', 'Maneuver Skills'],
    'Subterfúgio': ['Habilidades de Subterfúgio', 'Subterfuge Skills'],
  };
  const tituloGrupoHab = (g) => (TITULO_GRUPO_HAB[g] ? TITULO_GRUPO_HAB[g][en ? 1 : 0] : (en ? `${g} Skills` : `Habilidades de ${g}`));
  const col3Pages = Object.keys(habPorGrupo)
    .map((grupo) => {
      const lista = habPorGrupo[grupo] || [];
      return lista.length > 0 ? { key: grupo, label: tituloGrupoHab(grupo), lista } : null;
    })
    .filter(Boolean);

  const col3Idx = col3Pages.length > 0 ? (col3Page % col3Pages.length) : 0;
  const col3Current = col3Pages[col3Idx] || null;

  const col3 = (
    <div className="fp-col-pad-l">
      <ColTitleNav
        mainLabel={en ? 'Skills' : 'Habilidades'} subComoTitulo
        pages={col3Pages.length > 0 ? col3Pages : [{ key: 'empty', label: '—' }]}
        page={col3Idx}
        onNext={() => setCol3Page((p) => (p + 1) % Math.max(col3Pages.length, 1))}
        abrirTip={abrirTip} fecharTip={fecharTip} en={en}
      />
      {col3Current ? (
        col3Current.lista.map((h) => {
          const aprendida = Object.prototype.hasOwnProperty.call(pjHabilidades, h.key);
          const total = totalHabilidadeFn
            ? totalHabilidadeFn(h.key, pjHabilidades, atributosFinais, bonusHabilidades, habsByKey, {})
            : (pjHabilidades[h.key] ?? '—');
          return (
            <div key={h.key} className={'fp-row' + (aprendida ? '' : ' fp-row--nao-aprendida') + (onAbrirHabilidade ? ' fp-row--abre' : '')}
              data-aprendida={aprendida}
              {...clicavel(onAbrirHabilidade && (() => onAbrirHabilidade(h.key)))}>
              <span className="fp-row-label">{h.nome}</span>
              <span className="fp-row-value">{String(total)}</span>
            </div>
          );
        })
      ) : (
        <div className="fp-col-empty">
          {en ? 'No skills.' : 'Nenhuma habilidade.'}
        </div>
      )}
    </div>
  );

  // Técnica avançada pelo TIPO desde 22/10/2026 (tecnicas.tipo): a permissão saiu.
  const tecEsAvancada = (t) => t.tipo === 'Especializada';
  // Magias: por TIPO desde 22/10/2026 (ver Col 5 abaixo).
  const magEsRara = (m) => !!m.tipo && m.tipo !== 'Básica';

  // ── Col 4 — Técnicas de Combate (Básicas / Avançadas = tipo Especializada) ─
  const tecPossuidas = catalogoTec.filter((t) =>
    Object.prototype.hasOwnProperty.call(pjTecnicas, t.key)
  );
  const magPossuidas = catalogoMag.filter((m) => pjMagias[m.key] != null);

  const tecBasicas   = tecPossuidas.filter((t) => !tecEsAvancada(t));
  const tecAvancadas = tecPossuidas.filter((t) =>  tecEsAvancada(t));
  const col4Pages = [
    // "Técnicas Básicas" é o título (27/09/2026).
    { key: 'basicas',   label: en ? 'Basic Techniques'    : 'Técnicas Básicas',   items: tecBasicas   },
    { key: 'avancadas', label: en ? 'Advanced Techniques' : 'Técnicas Avançadas', items: tecAvancadas },
  ];
  const col4Idx  = col4Pages.length > 0 ? (col4Page % col4Pages.length) : 0;
  const col4Current = col4Pages[col4Idx] || col4Pages[0];

  /* Orçamento de técnica (22/10/2026), ao lado do de magia: "adicione pontos
     de técnicas ao lado". Mesma conta da janela Estudar e da RPC — a fila de
     treino já foi paga e entra no gasto. */
  const _pontosTec = (typeof pontosTecnicasTotal !== 'undefined' ? pontosTecnicasTotal : null) || window.pontosTecnicasTotal;
  const _gastoTec  = (typeof gastoTecnicas !== 'undefined' ? gastoTecnicas : null) || window.gastoTecnicas;
  const _filaTec   = (typeof comFila !== 'undefined' ? comFila : null) || window.comFila;
  const tecTotal = _pontosTec && pj ? _pontosTec(pj.profissao, estagioNum, pj.fisico_base, pj.agilidade_base) : null;
  const tecPagas = _filaTec ? _filaTec(pjTecnicas || {}, pj && pj.treinos, 'tecnica') : (pjTecnicas || {});
  const tecGasto = _gastoTec ? _gastoTec(tecPagas, catalogoTec || []) : null;

  const col4 = (
    <div>
      <ColTitleNav
        mainLabel={en ? 'Techniques' : 'Técnicas'} subComoTitulo
        pages={col4Pages}
        page={col4Idx}
        onNext={() => setCol4Page((p) => (p + 1) % col4Pages.length)}
        abrirTip={abrirTip} fecharTip={fecharTip} en={en}
      />
      {tecTotal != null && (
        <div className={'fp-col-pontos fp-col-pontos--tec' + (tecGasto > tecTotal ? ' fp-col-pontos--excedido' : '')}>
          {en ? 'Technique points' : 'Pontos de técnica'}: <strong>{tecGasto} / {tecTotal}</strong>
        </div>
      )}
      {col4Current.items.length === 0 ? (
        <div className="fp-col-empty">
          {en ? 'No techniques.' : 'Nenhuma técnica.'}
        </div>
      ) : col4Current.items.map((t) => {
        const tot = totalTecnicaFn ? totalTecnicaFn(t, pjTecnicas, atributosFinais) : '—';
        return (
          <div key={t.key} className={'fp-row' + (onAbrirTecnica ? ' fp-row--abre' : '')}
            {...clicavel(onAbrirTecnica && (() => onAbrirTecnica(t.key)))}>
            <span className="fp-row-label">{t.nome}</span>
            <span className="fp-row-value">{tot != null ? String(tot) : '—'}</span>
          </div>
        );
      })}
    </div>
  );

  // ── Col 5 — Magias por TIPO (22/10/2026) ───────────────────────────
  // Era Básicas / Avançadas pela permissão (avançada = de especialização). A
  // permissão saiu das magias — qualquer profissão aprende pelo item —, e a
  // divisão passou a ser a raridade: Básicas; Perdidas e Ancestrais.
  const magBasicas = magPossuidas.filter((m) => !magEsRara(m));
  const magRaras   = magPossuidas.filter((m) =>  magEsRara(m));
  const col5Pages = [
    // "Magias Básicas" é o título (27/09/2026).
    { key: 'basicas', label: en ? 'Basic Spells' : 'Magias Básicas', items: magBasicas },
    { key: 'raras',   label: en ? 'Lost and Ancestral Spells' : 'Magias Perdidas e Ancestrais', items: magRaras },
  ];
  const col5Idx     = col5Pages.length > 0 ? (col5Page % col5Pages.length) : 0;
  const col5Current = col5Pages[col5Idx] || col5Pages[0];

  // Orçamento de magia (22/10/2026): aprende-se pelo item; aqui só se vê.
  const _pontosMag = (typeof pontosMagiasTotal !== 'undefined' ? pontosMagiasTotal : null) || window.pontosMagiasTotal;
  const _gastoMag  = (typeof gastoMagias !== 'undefined' ? gastoMagias : null) || window.gastoMagias;
  const magTotal = _pontosMag && pj ? _pontosMag(pj.profissao, estagioNum, pj.intelecto_base, pj.aura_base) : null;
  // A fila de treino já foi paga: conta no gasto, como na janela Estudar e na RPC.
  const _comFila = (typeof comFila !== 'undefined' ? comFila : null) || window.comFila;
  const magPagas = _comFila ? _comFila(pjMagias || {}, pj && pj.treinos, 'magia') : (pjMagias || {});
  const magGasto = _gastoMag ? _gastoMag(magPagas, catalogoMag || []) : null;

  const col5 = (
    <div className="fp-col-pad-r">
      <ColTitleNav
        mainLabel={en ? 'Spells' : 'Magias'} subComoTitulo
        pages={col5Pages.length > 0 ? col5Pages : [{ key: 'vazio', label: '—' }]}
        page={col5Idx}
        onNext={() => setCol5Page((p) => (p + 1) % Math.max(col5Pages.length, 1))}
        abrirTip={abrirTip} fecharTip={fecharTip} en={en}
      />
      {magTotal != null && (
        <div className={'fp-col-pontos fp-col-pontos--mag' + (magGasto > magTotal ? ' fp-col-pontos--excedido' : '')}>
          {en ? 'Magic points' : 'Pontos de magia'}: <strong>{magGasto} / {magTotal}</strong>
        </div>
      )}
      {(col5Current?.items || []).length === 0 && (
        <div className="fp-col-empty">{en ? 'No spells.' : 'Nenhuma magia.'}</div>
      )}
      {(col5Current?.items || []).map((m) => {
        const passos = pjMagias[m.key];
        const nivel = nivelMagiaEfetivoFn ? nivelMagiaEfetivoFn(passos) : '—';
        return (
          <div key={m.key} className={'fp-row' + (onAbrirMagia ? ' fp-row--abre' : '')}
            {...clicavel(onAbrirMagia && (() => onAbrirMagia(m.key)))}>
            <span className="fp-row-label">{m.nome}</span>
            <span className="fp-row-value">{nivel != null ? String(nivel) : '—'}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    /* `fp-info-uma`: a fila de páginas do personagem. A mesma classe-irmã da
       do bicho (fp-animal-info-uma) divide UMA regra de recuo em index.css —
       é o que impede as duas colunas de divergirem outra vez. */
    <div className="fp-info-grid fp-info-grid--3 fp-info-uma" data-parte={parte}>
      {parte === 'conhecimento' ? (
        <>{col3}{col4}{col5}</>
      ) : (
        <>{col1}{colAtributos}{col2}</>
      )}
      <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </div>
  );
}


/* ============================== [11] A FICHA DO ANIMAL ==============================
   A aba Companheiros lista TODO animal do inventário vinculado a uma criatura
   (itens.criatura_id — animaisDoPersonagem, 07-inventario); a ficha abaixo é a
   do bicho escolhido. Os ataques, os níveis de técnica/habilidade/magia e a
   seta de navegar são os mesmos do personagem (ColTitleNav).

   O NOME DO COMPANHEIRO mora na INSTÂNCIA (`instancia.nome`), que viaja
   inteira em transferir e no anúncio da loja; companheiro com nome nunca
   empilha (normalizarPilhas e transfer_item). As regras puras estão em
   07-inventario/inventario.jsx (nomeDoAnimal, comNomeDoAnimal).
   ================================================================================= */
/* ── AS CASAS DO BICHO ─────────────────────────────────────────────────────
   As doze de `itens.slot_arreio` (scripts/sql/arreamento-e-atrelado-2026-10-05
   .sql), dispostas como o boneco do personagem: dois trilhos de cinco ao redor
   do retrato e, na base, as duas casas de carga — que são as "mãos" do bicho.

   A ordem desce o corpo, como no personagem: cabeça → cernelha → peito → dorso
   → pernas. Não é enfeite: a casa de cima é a que o jogador procura primeiro. */
const ARREIO_REGIOES = {
  cabecada:   { pt: 'Cabeçada',   en: 'Bridle',      icone: 'ti-horse' },
  chanfron:   { pt: 'Chanfron',   en: 'Chanfron',    icone: 'ti-shield' },
  crinum:     { pt: 'Crinum',     en: 'Crinet',      icone: 'ti-feather' },
  peitoral:   { pt: 'Peitoral',   en: 'Breastplate', icone: 'ti-shirt' },
  manta:      { pt: 'Manta',      en: 'Blanket',     icone: 'ti-stack-2' },
  barda:      { pt: 'Barda',      en: 'Barding',     icone: 'ti-shield-half' },
  sela:       { pt: 'Sela',       en: 'Saddle',      icone: 'ti-horse-toy' },
  gualdrapa:  { pt: 'Gualdrapa',  en: 'Caparison',   icone: 'ti-flag' },
  arreio:     { pt: 'Arreio',     en: 'Harness',     icone: 'ti-link' },
  caneleiras: { pt: 'Caneleiras', en: 'Greaves',     icone: 'ti-shoe' },
  alforje:    { pt: 'Alforje',    en: 'Saddlebag',   icone: 'ti-briefcase-2' },
  atrelado:   { pt: 'Atrelado',   en: 'Hitched',     icone: 'ti-car' },
};
/* SEIS DE CADA LADO, EM TRÊS FILEIRAS (27/10/2026, pedido do usuário: "o
   número de slots são 12, então 6 de cada lado em 3 linhas"). Eram 5 + 5 e
   uma base de 2 — a base era a fileira das MÃOS do personagem, e o bicho não
   tem mãos: Alforje e Atrelado são carga, e carga entra na conta das casas
   como qualquer outra peça. Com 6 por trilho a grade de duas colunas fecha
   exatamente três fileiras dos dois lados, sem sobra no meio.

   A ordem continua descendo o corpo (cabeça → cernelha → peito → dorso →
   pernas), com a casa de carga de cada lado no fim. */
const ARREIO_TRILHO_E = ['cabecada', 'chanfron', 'crinum', 'peitoral', 'manta', 'alforje'];
const ARREIO_TRILHO_D = ['barda', 'sela', 'gualdrapa', 'arreio', 'caneleiras', 'atrelado'];
/* A silhueta da casa vazia. Em 27/10/2026 as DOZE passaram a ter pintura
   própria (pedido do usuário: "Crie os itens no sistema e no figma para a
   montaria") — eram quatro, e as outras oito ficavam no glifo. O arquivo é o
   slug da base em public/itens; ver a família Montaria em 01-core/bases-item. */
const ARTE_ARREIO_VAZIO = {
  cabecada: 'cabecada', chanfron: 'chanfron', crinum: 'crinum',
  peitoral: 'peitoral-montaria', manta: 'manta', barda: 'barda',
  sela: 'sela', gualdrapa: 'gualdrapa', arreio: 'arreio',
  caneleiras: 'caneleiras-montaria', alforje: 'alforge', atrelado: 'carroca',
};

/* As barras do bicho. Componente PRÓPRIO porque é ele que tem hooks
   (FichaVitBars abre tooltip): FichaAnimaisView precisa poder devolver null
   antes de qualquer hook — ver ficha-hooks-antes-dos-returns.test.js —, e um
   hook aqui dentro não conta lá fora.

   São as MESMAS barras do personagem, pelo mesmo componente e na mesma ordem:
   as energias, a régua das condições e, no fim, a Experiência. `semNome` e sem
   `showValue` porque a ficha do bicho não escreve rótulo nem número — "também
   não tem '0 de 100' na ficha do animal" (usuário, 05/10/2026). */
function AnimalVitBars({ instancia, criatura, en }) {
  const vit = (window.vitalidadeDoAnimal || (() => ({ ef: 0, efMax: 0, eh: 0, ehMax: 0, cond: {}, condMax: 100 })))(instancia, criatura);
  /* A COR É O QUE A MEDIDA MOSTRA (27/10/2026, pedido do usuário: "as barras
     de EF e EH não estão mostrando os valores corretos"). O nível sempre
     esteve certo — o que faltava era `color`, e sem ela o tubo (a peça de
     então) ficava transparente: vazio qualquer que fosse o valor, e um tubo
     vazio é um valor errado para quem lê. Hoje a peça é uma GEMA e a paleta
     vem de `b.key`, mas `color` segue valendo para os cartões de personagem,
     que leem a mesma tabela. As mesmas duas cores do dono
     (FICHA_VIT_COLORS), e `nomeCurto` pelo mesmo motivo: a legenda do bicho
     dizia "Energia Física" onde a do personagem diz "Física". */
  const vitais = [
    vit.efMax > 0 && { key: 'ef', icon: 'ti-heart', color: FICHA_VIT_COLORS.ef,
      label: en ? 'Physical Energy' : 'Energia Física', nomeCurto: en ? 'Physical' : 'Física',
      val: vit.ef, max: vit.efMax },
    vit.ehMax > 0 && { key: 'eh', icon: 'ti-bolt', color: FICHA_VIT_COLORS.eh,
      label: en ? 'Heroic Energy' : 'Energia Heroica', nomeCurto: en ? 'Heroic' : 'Heroica',
      val: vit.eh, max: vit.ehMax },
  ].filter(Boolean);
  /* `sigla` entra porque o medalhão a recebia do personagem; hoje o rótulo é
     a palavra (26/10/2026), mas o campo segue no formato das barras dele. */
  const condBars = (window.CONDICOES_ANIMAL || []).map((c) => ({
    key: c.key, icon: c.icone, sigla: c.sigla, label: en ? c.labelEn : c.label,
    val: (vit.cond && vit.cond[c.key]) || 0, max: vit.condMax,
    color: window.COND_ROXO || '#8E5BD6',
  }));
  return (
    <div className="fp2-vitcond-col fp-animal-vit">
      {/* SEM `fp2-vit-section`/`fp2-vit-band` (26/10/2026): essas duas são a
          faixa de TUBOS do personagem, e levam um `flex: 1 1 auto` que mandava
          o painel crescer para encher a coluna — medido: 669px de painel para
          80px de barras. O bicho tem barras de linha, e painel de barra de
          linha tem a altura do conteúdo. */}
      {/* OS MESMOS DESENHOS DA FICHA DO PERSONAGEM (26/10/2026, pedido do
          usuário: "arrume a ficha do animal para ficar igual a ficha do
          personagem"). Eram barras de linha enquanto o dono tinha TUBOS e
          MEDALHÕES — a mesma informação em dois vocabulários visuais, lado a
          lado na mesma mesa. Agora é o mesmo componente nos dois. */}
      <section className="fp2-panel fp2-vit-section">
        <div className="fp2-panel-body fp2-vit-band">
          <h3 className="fp-col-tit">{en ? 'Energies' : 'Energias'}</h3>
          <FichaGemas bars={vitais} scope="vit-animal" en={en} />
        </div>
      </section>
      {/* SEM `fp2-vit-break` (27/10/2026, pedido do usuário: "revise o
          espaçamento entre os cards"). A classe acrescenta 4px de margem e
          uma régua no topo — ela é de quando os blocos dividiam um painel só
          e precisavam de um fio entre si. Aqui Condições é um CARTÃO, com
          borda própria: o fio virava uma segunda linha logo abaixo da
          primeira, e os 4px punham o vão desta coluna em 16px enquanto todos
          os outros vãos da ficha são 12. */}
      <section className="fp2-panel">
        <div className="fp2-panel-body">
          <h3 className="fp-col-tit">{en ? 'Conditions' : 'Condições'}</h3>
          <FichaMedalhoes bars={condBars} scope="cond-animal" en={en} />
        </div>
      </section>
    </div>
  );
}

/* ── A EXPERIÊNCIA NO PÉ DO CARTÃO (27/10/2026) ─────────────────────────────
   Pedido do usuário: "coloque a barra de experiência como na ficha do
   personagem" e "abaixo do card de condições tem um card que eu não sei o que
   é". É o MESMO card: a Experiência do bicho morava como terceiro painel da
   coluna da esquerda, montada com `semNome` e sem número — ou seja, um painel
   com um fio dentro e nenhuma palavra que dissesse o que era. Quem olha vê
   uma caixa vazia, e tem razão.

   Agora é a faixa `.fp-xp-faixa` do personagem, de ponta a ponta no pé da
   moldura, com o rótulo "Experiência" e o número — a mesma peça, o mesmo
   lugar, e enfim legível.

   A diferença deliberada de 06/10/2026 fica: não se edita. A do personagem é
   onde o Mestre concede XP; a do bicho é consequência dela ("sempre 1/5"), e
   abrir o editor aqui romperia a regra — por isso `onEdit` não vai. */
function AnimalXpFaixa({ instancia, criatura, en }) {
  const xp = window.xpDoAnimal ? window.xpDoAnimal(instancia, criatura) : null;
  if (!xp) return null;
  const bars = [{
    key: 'xp-animal', icon: 'ti-trending-up',
    label: (en ? 'Stage' : 'Estágio') + ' ' + xp.estagio,
    val: xp.dentro, max: xp.span,
    tip: xp.noTeto ? null : `${Math.ceil(xp.falta)} XP`,
  }];
  return (
    <div className="fp-xp-faixa">
      <span className="fp-xp-rot">{en ? 'Experience' : 'Experiência'}</span>
      <FichaVitBars bars={bars} scope="xp-animal" semNome numero en={en} />
    </div>
  );
}

/* ── AnimalInventarioView — o que o bicho leva (27/10/2026) ─────────────────
   Pedido do usuário: o menu lateral do companheiro ganha "Inventário", ao
   lado de Identificação e Conhecimento. Até aqui o que estava no bicho só
   aparecia nas doze casas do boneco — e casa mostra UMA peça, então a carga
   solta do lombo não tinha onde ser lida.

   Duas listas, porque são duas coisas: o ARREAMENTO, que é o que ele veste e
   tem casa certa, e a CARGA, que é o que ele leva e não tem. A ordem das
   casas é a do boneco (ARREIO_REGIOES), para quem olhou o bicho encontrar a
   mesma sequência aqui.

   Quem mexe no que está no bicho continua sendo o Inventário do dono — é de
   lá que a peça sobe e desce (equiparNoAnimal). Esta página LÊ. */
function AnimalInventarioView({ instancia, criatura, itens, catalogoBySlug, pesoDoCavaleiro, en }) {
  const dentro = (window.itensDoAnimal ? window.itensDoAnimal(itens, instancia.instanceId) : [])
    .map((it) => ({ it, cat: (catalogoBySlug || {})[it.slug] || null }))
    .filter((x) => x.cat);
  /* A ordem é a DO BONECO, e não a de ARREIO_REGIOES: os dois trilhos, na
     sequência em que o jogador acabou de ver as casas. (Em ARREIO_REGIOES o
     alforje é penúltimo; no boneco ele fecha o trilho da esquerda.) */
  const casas = [...ARREIO_TRILHO_E, ...ARREIO_TRILHO_D];
  const naCasa = dentro
    .filter((x) => casas.includes(x.it.slot_animal))
    .sort((a, b) => casas.indexOf(a.it.slot_animal) - casas.indexOf(b.it.slot_animal));
  const naCarga = dentro.filter((x) => !casas.includes(x.it.slot_animal));
  const n = (v) => (v == null ? '—' : String(Math.round(Number(v) * 10) / 10).replace('.', ','));
  const linha = ({ it, cat }, ondeLbl) => {
    const arte = window.arteDoItem ? window.arteDoItem(cat) : null;
    const qtd = Number(it.quantidade) || 1;
    return (
      <li className="mn-quadro-linha anim-inv-linha" key={it.instanceId}>
        <span className="anim-inv-ic">
          {arte
            ? <img src={arte} alt="" />
            : <i className={'ti ' + (window.invItemIcon ? window.invItemIcon(cat) : 'ti-box')} aria-hidden="true" />}
        </span>
        <span className="anim-inv-nome">{cat.nome}{qtd > 1 && <small> ×{qtd}</small>}</span>
        <span className="anim-inv-onde">{ondeLbl}</span>
        <span className="anim-inv-peso">{n((cat.ocupa != null ? Number(cat.ocupa) || 0 : 0) * qtd)}</span>
      </li>
    );
  };
  /* O quadro de linhas do sistema (.mn-quadro, ver index.css): cabeçalho
     rotulado e linhas separadas por régua fina. `fp2-panel` não serve aqui —
     ele nasce transparente e sem borda, e só ganha a pele de cartão dentro da
     moldura da ficha; esta é uma PÁGINA, como a Identificação do personagem. */
  const quadro = (titulo, lista, vazioTxt, ondeDe) => (
    <section className="anim-inv-secao">
      <h3 className="fp-col-tit">{titulo}</h3>
      {lista.length ? (
        <ul className="mn-quadro anim-inv-quadro">
          <li className="mn-quadro-cab anim-inv-linha" aria-hidden="true">
            <span /><span>{en ? 'Item' : 'Item'}</span>
            <span>{en ? 'Where' : 'Onde'}</span><span>{en ? 'Weight' : 'Peso'}</span>
          </li>
          {lista.map((x) => linha(x, ondeDe(x)))}
        </ul>
      ) : <p className="anim-inv-vazio">{vazioTxt}</p>}
    </section>
  );
  const rotuloDaCasa = (x) => {
    const def = ARREIO_REGIOES[x.it.slot_animal];
    return def ? (en ? def.en : def.pt) : x.it.slot_animal;
  };
  return (
    <div className="anim-inv">
      {quadro(en ? 'Harness' : 'Arreamento', naCasa,
        en ? 'Nothing harnessed.' : 'Nada arreado.', rotuloDaCasa)}
      {quadro(en ? 'Load' : 'Carga', naCarga,
        en ? 'Carrying nothing loose.' : 'Não leva nada solto.',
        () => (en ? 'On its back' : 'No lombo'))}
      <AnimalCargaFaixa instancia={instancia} criatura={criatura} itens={itens}
        catalogoBySlug={catalogoBySlug} pesoDoCavaleiro={pesoDoCavaleiro} en={en} />
    </div>
  );
}

/* ── A CARGA DO BICHO, NO PÉ (27/10/2026) ───────────────────────────────────
   Pedido do usuário: "adicione também uma barra para mostrar o peso que o
   animal está carregando". A mesma faixa da Experiência, logo abaixo dela:
   são as duas medidas que valem para o bicho inteiro, e nenhuma das duas é
   assunto de uma coluna só.

   A regra (capacidade = 20% do peso do corpo, e o cavaleiro montado conta)
   é do usuário e mora em `cargaDoAnimal`, 07-inventario — do lado do
   `calcCarga` do personagem, que é o espelho dela.

   Sem peso de corpo gravado não há teto, e sem teto não há barra: a criatura
   sem `peso` é dado faltando no catálogo, e inventar um máximo seria inventar
   quanto o bicho aguenta. */
function AnimalCargaFaixa({ instancia, criatura, itens, catalogoBySlug, pesoDoCavaleiro, en }) {
  const f = window.cargaDoAnimal;
  if (!f) return null;
  const c = f(instancia, criatura, itens, catalogoBySlug, pesoDoCavaleiro);
  if (!(c.capacidade > 0)) return null;
  const n = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
  const bars = [{
    key: 'carga-animal', icon: 'ti-weight',
    label: en ? 'Load' : 'Carga',
    val: c.peso, max: c.capacidade,
    txt: n(c.peso), txtMax: n(c.capacidade),
    color: c.over ? 'var(--alerta)' : undefined,
    // O cavaleiro é a maior parcela e a menos óbvia: ele não está em casa
    // nenhuma do boneco, então a faixa precisa dizer que ele está ali.
    tip: c.cavaleiro > 0
      ? (en ? `Includes ${n(c.cavaleiro)} from the rider` : `Inclui ${n(c.cavaleiro)} do cavaleiro`)
      : null,
  }];
  return (
    <div className={'fp-xp-faixa fp-carga-faixa' + (c.over ? ' is-over' : '')}>
      <span className="fp-xp-rot">{en ? 'Load' : 'Carga'}</span>
      <FichaVitBars bars={bars} scope="carga-animal" semNome numero en={en} />
    </div>
  );
}

/* A linha do NOME, com o lápis. Componente próprio pelo mesmo motivo das
   barras: ele guarda o rascunho do campo, e esse useState não pode subir.

   Sem nome dado a linha fica VAZIA e convida — nunca um "—": ali não falta um
   dado do catálogo, falta uma escolha do dono ("o nome poderá ser informado
   pelo seu dono, se assim desejar"). O convite escrito saiu em 06/10/2026
   ("remova o texto 'Dar um nome' e deixe só o ícone de lápis"), e por isso o
   lápis precisa dizer em palavras o que é para quem não o enxerga. */
function AnimalNomeLinha({ instancia, nome, en, onRenomear }) {
  const [rascunho, setRascunho] = useState(null);
  const dado = (instancia && typeof instancia.nome === 'string' ? instancia.nome : '').trim();
  if (!onRenomear) {
    return <div className="fp-row"><span className="fp-row-label">{en ? 'Name' : 'Nome'}</span>
      <span className="fp-row-value">{dado || nome || ''}</span></div>;
  }
  if (rascunho !== null) {
    return (
      <form className="fp-row" data-nome-animal
        onSubmit={(e) => { e.preventDefault(); onRenomear(instancia.instanceId, rascunho); setRascunho(null); }}>
        <span className="fp-row-label">{en ? 'Name' : 'Nome'}</span>
        <input autoFocus className="fp-row-value fp-nome-animal-input"
          maxLength={window.NOME_ANIMAL_MAX || 24} value={rascunho}
          aria-label={en ? 'Companion name' : 'Nome do companheiro'}
          onChange={(e) => setRascunho(e.target.value)}
          onBlur={() => { onRenomear(instancia.instanceId, rascunho); setRascunho(null); }}
          onKeyDown={(e) => { if (e.key === 'Escape') setRascunho(null); }} />
      </form>
    );
  }
  return (
    <div className="fp-row">
      <span className="fp-row-label">{en ? 'Name' : 'Nome'}</span>
      <span className={'fp-row-value' + (dado ? '' : ' fp-row-value--convite')}>
        {dado}
        <button type="button" className="fp-nome-animal-lapis"
          aria-label={dado ? (en ? 'Rename' : 'Renomear') : (en ? 'Give a name' : 'Dar um nome')}
          onClick={() => setRascunho(dado)}>
          <i className="ti ti-pencil" aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}

/* ============================== [11] FichaAnimaisView — a ficha de UM animal ==============================
   "A página de animais está muito diferente da ficha do personagem, eu quero
    exatamente igual. A mesma quantidade de slots, mesmo tamanho do card da
    imagem, etc." · "Com a imagem no centro também." · "Existem itens próprios
    para animais, ou seja, não precisa de seletor de equipamento na ficha do
    animal. Também não tem '0 de 100' na ficha do animal." (usuário, 05/10/2026)

   O QUE SAIU, e por quê:
     • as ABAS internas (uma por animal) — quem escolhe o companheiro é a lista
       da aba Companheiros, do lado de fora; esta view é de UM bicho;
     • o botão Montar — "o botão de montar deve ser no item do animal no
       inventário" (usuário, 06/10/2026);
     • a linha de nome na barra de abas — o nome mora no RETRATO, onde o nome
       do personagem mora.

   O ANDAIME É O DO PERSONAGEM, literalmente as mesmas classes: fp2-sheet >
   fp2-frame > fp2-columns--duas, barras à esquerda (fp2-col-vit) e o boneco à
   direita (fp2-col-main). Se o cartão do personagem mudar de respiro, este
   muda junto — é essa a trava que ficha-animal-igual-personagem.test.jsx
   guarda. O que muda são as CASAS: o bicho tem as doze do arreamento, e não as
   dezesseis regiões de gente.
   ============================================================================ */
function FichaAnimaisView({ animal, animais, en, podeEditar, itens,
  catalogoBySlug, habsByKey, tecnicasByKey, magiasByKey, onDesfazerElo, onRenomear,
  pesoDoCavaleiro = 0, parte = 'ficha' }) {
  const lista = Array.isArray(animais) ? animais : [];
  const atual = animal || lista.find((a) => a.instancia.montado) || lista[0] || null;
  if (!atual) return null;

  const inst = atual.instancia;
  const criatura = atual.criatura || {};
  const raca = window.racaDoAnimal ? window.racaDoAnimal(atual.cat, criatura) : (atual.cat && atual.cat.nome) || criatura.nome || '';
  const nome = atual.nome
    || (window.nomeDoAnimal ? window.nomeDoAnimal(inst, atual.cat, criatura) : raca);

  // As peças que estão NESTE bicho, pela casa em que entraram.
  const noBicho = window.itensDoAnimal ? window.itensDoAnimal(itens, inst.instanceId) : [];
  const porCasa = {};
  noBicho.forEach((p) => { (porCasa[p.slot_animal] = porCasa[p.slot_animal] || []).push(p); });

  const casa = (regiao) => {
    const def = ARREIO_REGIOES[regiao] || { pt: regiao, en: regiao, icone: 'ti-shield-off' };
    const pecas = porCasa[regiao] || [];
    const peca = pecas[0] || null;
    const cat = peca ? (catalogoBySlug || {})[peca.slug] : null;
    const vazia = !peca;
    const arquivo = ARTE_ARREIO_VAZIO[regiao];
    const arte = (cat && window.arteDoItem ? window.arteDoItem(cat) : null)
      || (vazia && arquivo ? '/itens/' + arquivo + '.webp' : null);
    const rotulo = en ? def.en : def.pt;
    return (
      <div className="fp3-regiao" key={'arreio-' + regiao}>
        <span className="fp3-qtd" aria-hidden="true">{pecas.length}/1</span>
        <button type="button"
          className={'inv-slot' + (vazia ? ' empty' : ' filled') + (arte ? ' has-img' : '') + (vazia && arte ? ' bg-ghost' : '')}
          style={{ cursor: 'default', ...fpItemBgStyle(arte, vazia) }}
          aria-label={rotulo + (cat ? ' — ' + cat.nome : '')}>
          {!arte && <span className="inv-slot-ic"><i className={'ti ' + def.icone} aria-hidden="true" /></span>}
        </button>
        <span className="fp3-nomr">{rotulo}</span>
      </div>
    );
  };

  /* AS PÁGINAS DO BICHO (27/10/2026): a ficha é a do boneco; Identificação,
     Conhecimento e Inventário são páginas próprias, chamadas pelo menu
     lateral. O invólucro é o mesmo das páginas do personagem (fp-info-tab),
     para os recuos baterem. */
  if (parte === 'inventario') {
    return (
      <div className="fp-animais fp-animais-parte">
        <AnimalInventarioView instancia={inst} criatura={criatura} itens={itens}
          catalogoBySlug={catalogoBySlug} pesoDoCavaleiro={pesoDoCavaleiro} en={en} />
      </div>
    );
  }
  if (parte === 'info' || parte === 'conhecimento') {
    return (
      <div className="fp-animais fp-animais-parte">
        <FichaCriaturaSheet key={inst.instanceId + ':' + parte} parte={parte}
          criatura={criatura} instancia={inst} en={en}
          catalogoBySlug={catalogoBySlug} habsByKey={habsByKey}
          tecnicasByKey={tecnicasByKey} magiasByKey={magiasByKey}
          onDesfazerElo={onDesfazerElo}
          raca={raca} nome={nome} podeEditar={podeEditar} onRenomear={onRenomear} />
      </div>
    );
  }

  return (
    <div className="fp-animais">
      <div className="fp2-sheet">
        <div className="fp2-frame">
          {/* SEM A FILEIRA DO HERÓI (27/10/2026, pedido do usuário: "não
              precisamos do trilho superior"). Ela chegou a existir aqui, mais
              cedo no mesmo dia; com o trilho na tela ficou claro que Batalha,
              Atividade e Editar são ações sobre o PERSONAGEM, e que em cima
              da ficha do cavalo elas parecem ser do cavalo. Quem apaga a
              faixa é `semTrilho`, em FichaPersonagem. */}
          <div className="fp2-columns fp2-columns--duas">
            <div className="fp2-col-vit">
              <AnimalVitBars instancia={inst} criatura={criatura} en={en} />
            </div>
            <div className="fp2-col-main">
              <div className="fp2-equip-wrap fp2-panel">
                <h3 className="fp-col-tit">{en ? 'Harness' : 'Arreamento'}</h3>
                {/* `--bicho`: sem a fileira das mãos, o retrato ocupa UMA
                    linha de grade. Sem isso ele segue com o `span 2` do
                    personagem e abre uma segunda fileira vazia. */}
                <div className="fp3-boneco fp3-boneco--bicho">
                  <div className="fp3-trilho">{ARREIO_TRILHO_E.map(casa)}</div>
                  {/* O retrato no centro, no MESMO palco do personagem — e com
                      o nome do bicho onde o nome dele fica. */}
                  <div className="fp2-stage fp3-retrato">
                    <div className="fp2-portrait is-empty">
                      <span className="fp2-mono">{(nome || '?').trim().charAt(0).toUpperCase()}</span>
                      <div className="fp2-name-block">
                        <h2 className="fp2-name">{nome}</h2>
                      </div>
                    </div>
                  </div>
                  <div className="fp3-trilho">{ARREIO_TRILHO_D.map(casa)}</div>
                </div>
              </div>
              {/* IDENTIDADE E DERIVADAS SAÍRAM DAQUI (27/10/2026, pedido do
                  usuário: "removeremos da ficha as informações de 'identidade,
                  derivadas, etc', aproximando mais a ficha do companheiro da
                  ficha do personagem"). Elas viraram páginas do bicho, abertas
                  pelo menu lateral — Identificação, Conhecimento e Inventário
                  —, exatamente como o personagem já separava Ficha de
                  Identificação. A ficha fica com o que é visual: o boneco, as
                  armas, as energias e as duas faixas do pé. */}
            </div>
          </div>
          {/* As duas faixas do pé, como no cartão do dono. */}
          <AnimalXpFaixa instancia={inst} criatura={criatura} en={en} />
          <AnimalCargaFaixa instancia={inst} criatura={criatura} itens={itens}
            catalogoBySlug={catalogoBySlug} pesoDoCavaleiro={pesoDoCavaleiro} en={en} />
        </div>
      </div>
    </div>
  );
}

/* Habilidades, técnicas e magias da criatura com o NÍVEL/TOTAL da regra do
   motor de batalha (13/09/2026): nível = estágio; total = nível + atributo de
   ajuste; magia conjura no degrau do estágio. As contas moram em
   12-batalha/batalha.jsx (habilidadesDeCriatura, tecnicasDoAtor,
   magiasConhecidasDoAtor) e são REUSADAS aqui — a ficha não pode dizer um
   número e a mesa outro. Nome do texto sem par no catálogo aparece com "—". */
function capacidadesDaCriatura(c, habsByKey, tecnicasByKey, magiasByKey) {
  const M = window.MotorBatalha || {};
  const ator = { tipo: 'criatura', ref_id: c.id };
  const cat = { criById: { [c.id]: c }, habilidadesByKey: habsByKey || {}, tecnicasByKey: tecnicasByKey || {}, magiasByKey: magiasByKey || {} };
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const nomesDoTexto = (csv) => String(csv || '').split(',').map((t) => t.trim().replace(/\s+\d+$/, '')).filter(Boolean);
  const semPar = (csv, achados) => {
    const vistos = new Set(achados.map((r) => norm(r.nome)));
    return nomesDoTexto(csv).filter((n) => !vistos.has(norm(n))).map((nome) => ({ nome, valor: null }));
  };
  const hab = M.habilidadesDeCriatura ? M.habilidadesDeCriatura(ator, cat) : [];
  const tec = M.tecnicasDoAtor ? M.tecnicasDoAtor(ator, cat) : [];
  const mag = M.magiasConhecidasDoAtor ? M.magiasConhecidasDoAtor(ator, cat) : [];
  return {
    habilidades: [...hab.map((h) => ({ nome: h.nome, valor: h.total })), ...semPar(c.habilidades, hab)],
    tecnicas: [...tec.map((t) => ({ nome: t.nome, valor: t.total })), ...semPar(c.tecnicas_especiais, tec)],
    magias: [...mag.map((m) => ({ nome: m.magia.nome, valor: m.nivel })), ...semPar(c.magia, mag.map((m) => m.magia))],
  };
}

/* Linha e coluna da ficha do animal — no escopo do MÓDULO pelo mesmo motivo
   do ColTitleNav (ver o comentário dele): declaradas dentro da ficha, virariam
   um tipo novo a cada render do tooltip e a seta deixaria de responder. */
const vazioAnimal = (v) => v === null || v === undefined || v === '';
// O item do catálogo pelo nome (sem acento e caixa) — a criatura guarda NOMES.
function itemDoCatalogoPorNome(mapa, nome) {
  const norm = (x) => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const alvo = norm(nome);
  return Object.values(mapa || {}).find((o) => o && norm(o.nome) === alvo) || null;
}
// `onAbrir` (27/09/2026): a linha abre a janela de consulta — clique e Enter/Espaço.
const AnimalRow = ({ label, value, onAbrir }) => (
  <div className={'fp-row' + (onAbrir ? ' fp-row--abre' : '')}
    {...(onAbrir ? {
      role: 'button', tabIndex: 0, onClick: onAbrir,
      onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAbrir(); } },
    } : {})}>
    <span className="fp-row-label">{label}</span>
    <span className="fp-row-value">{vazioAnimal(value) ? '—' : value}</span>
  </div>
);
const AnimalColuna = ({ titulo, paginas, pagina, onNext, abrirTip, fecharTip, en, children }) => (
  <div>
    <ColTitleNav mainLabel={titulo} pages={paginas} page={pagina} onNext={onNext}
      abrirTip={abrirTip} fecharTip={fecharTip} en={en} subComoTitulo />
    {children}
  </div>
);

/* `parte` (27/10/2026, pedido do usuário): as colunas desta ficha deixaram de
   morar todas na mesma tela e viraram PÁGINAS do bicho, chamadas pelo menu
   lateral — "adicione dentro do menu lateral esquerdo 'companheiros' […] os
   menus 'identificação, conhecimento e inventário' da criatura. Com isso,
   removeremos da ficha as informações de 'identidade, derivadas, etc'".

   É o mesmo corte que o personagem já tinha (FichaInfoView recebe `parte`):

     'info'         → quem é e o que faz: Identidade, Derivadas e Ataques;
     'conhecimento' → Habilidades, Técnicas e Magias.

   O inventário do bicho não sai daqui: ele é dos ITENS, não da criatura, e
   tem componente próprio (AnimalInventarioView). */
function FichaCriaturaSheet({ criatura, instancia, en, catalogoBySlug, habsByKey, tecnicasByKey, magiasByKey, onDesfazerElo, raca, nome, onRenomear, parte = 'info' }) {
  const c = criatura || {};
  const [tip, abrirTip, fecharTip, manterTip] = useTooltip(60);
  const [pag1, setPag1] = useState(0);
  const [pag3, setPag3] = useState(0);
  const [pag4, setPag4] = useState(0);
  /* CONSULTA NA FICHA DO ANIMAL (27/09/2026): "assim como é do personagem, ao
     clicar nas habilidades, técnicas e magias, será possível abrir um modal
     com a explicação." A mesma janela do Conhecimento do personagem
     (BestDetalheModal + BestHabilidadeFicha/Tecnica/Magia), com o total do
     animal em Características. { tipo: 'hab'|'tec'|'mag', obj, valor } */
  const [consulta, setConsulta] = useState(null);

  const vazio = vazioAnimal;
  const Row = AnimalRow;
  // Props comuns das quatro colunas; `onNext` avança a página daquela coluna.
  const navProps = { abrirTip, fecharTip, en };
  const proxima = (setPagina, total) => () => setPagina((p) => (p + 1) % total);
  const vazioCol = (txt) => <div className="fp-col-empty">{txt}</div>;

  // ── Col 1 — Identidade / Atributos / Descrição ──
  const col1Pages = [
    { key: 'identidade', label: en ? 'Identity' : 'Identidade' },
    { key: 'atributos', label: en ? 'Attributes' : 'Atributos' },
    { key: 'descricao', label: en ? 'Description' : 'Descrição' },
  ];
  const i1 = pag1 % col1Pages.length;

  // ── Col 2 — Derivadas ──
  const _resist = window.resistenciasBase;
  const resist = _resist ? _resist(c.estagio, c.fisico, c.aura) : { rf: null, rm: null };
  const defesa = !vazio(c.armadura) || !vazio(c.defesa) ? `${c.armadura || ''}${vazio(c.defesa) ? '' : c.defesa}` : null;

  // ── Col 3 — um ataque por página ──
  const _ataques = (window.CriaturaFormulas && window.CriaturaFormulas.ataquesDaCriatura) || (() => []);
  const ataques = _ataques(c, catalogoBySlug);
  const col3Pages = ataques.length
    ? ataques.map((a, i) => ({ key: 'atq' + i, label: a.nome }))
    : [{ key: 'vazio', label: en ? 'Attacks' : 'Ataques' }];
  const i3 = pag3 % col3Pages.length;
  const atq = ataques[i3] || null;

  // ── Col 4 — Habilidades / Técnicas / Magias ──
  const cap = capacidadesDaCriatura(c, habsByKey, tecnicasByKey, magiasByKey);
  const col4Grupos = [
    { key: 'hab', label: en ? 'Skills' : 'Habilidades', itens: cap.habilidades },
    { key: 'tec', label: en ? 'Techniques' : 'Técnicas', itens: cap.tecnicas },
    { key: 'mag', label: en ? 'Spells' : 'Magias', itens: cap.magias },
  ].filter((g) => g.itens.length > 0);
  const col4Pages = col4Grupos.length ? col4Grupos : [{ key: 'vazio', label: en ? 'Abilities' : 'Capacidades', itens: [] }];
  const i4 = pag4 % col4Pages.length;

  /* Três colunas nas duas páginas, e não uma na do Conhecimento: a coluna de
     capacidades sozinha esticava para 1250px, e com ela o nome à esquerda e o
     total à direita ficavam a uma tela de distância. Com a largura de terço, a
     linha se lê de uma olhada — a mesma medida da Identificação, ao lado. */
  return (
    <div className="fp-info-grid fp-info-grid--3 fp-montaria fp-animal-info-uma">
      {parte !== 'conhecimento' && (
      <AnimalColuna titulo={en ? 'Animal' : 'Animal'} paginas={col1Pages} pagina={i1} onNext={proxima(setPag1, col1Pages.length)} {...navProps}>
        {col1Pages[i1].key === 'identidade' && (
          <>
            {/* O NOME É DO DONO, A RAÇA É DO CATÁLOGO (06/10/2026): "o que é
                atualmente 'nome' será 'Raça', e o nome poderá ser informado
                pelo seu dono, se assim desejar." Duas linhas, porque são duas
                coisas: a espécie, que o catálogo dá, e o batismo, que é uma
                escolha. Sem onRenomear (Mestre olhando ficha alheia) a linha
                do nome é só leitura: quem batiza é o dono. */}
            <AnimalNomeLinha instancia={instancia} nome={nome} en={en} onRenomear={onRenomear} />
            <Row label={en ? 'Race' : 'Raça'} value={raca || c.nome} />
            <Row label={en ? 'Mount' : 'Montaria'} value={c.montaria === true ? (en ? 'Yes' : 'Sim') : (en ? 'No' : 'Não')} />
            {/* Elo Permanente (27/09/2026): com quem e desde quando. O Mestre
                desfaz pelo x (onDesfazerElo só chega para ele). */}
            {window.temElo && window.temElo(instancia) && (
              <div className="fp-row fp-row--elo">
                <span className="fp-row-label"><i className="ti ti-link" aria-hidden="true" /> {en ? 'Permanent bond' : 'Elo Permanente'}</span>
                <span className="fp-row-value">
                  {instancia.elo.conjurador_nome || '—'}
                  {onDesfazerElo && (
                    <button type="button" className="fp-status-x" data-desfazer-elo
                      onClick={() => onDesfazerElo(instancia.instanceId)}
                      aria-label={en ? 'Undo bond' : 'Desfazer elo'}
                      {...propsTip(abrirTip, fecharTip, en ? 'Undo bond' : 'Desfazer elo')}>
                      <i className="ti ti-x" aria-hidden="true" />
                    </button>
                  )}
                </span>
              </div>
            )}
            {window.temElo && window.temElo(instancia) && instancia.elo.desde && typeof formatarDataFantasy === 'function' && (
              <Row label={en ? 'Bonded since' : 'Elo desde'} value={formatarDataFantasy(instancia.elo.desde, en ? 'en' : 'pt')} />
            )}
            {/* `elemento` entrou em 18/09/2026, junto com a coluna nova. Esta
                linha mostrava "Animal · Ar" para a Águia porque o ELEMENTO
                morava em `subtipo`; a migração o mudou de coluna, e sem
                incluí-lo aqui as 15 criaturas elementais perderiam o dado na
                ficha do animal. `subtipo` continua: ele é a espécie. */}
            {/* Três coisas diferentes, três linhas (27/09/2026): "no tipo 'Animal ·
                Cavalo · Terra' sendo que isso são 3 coisas diferentes". */}
            <Row label={en ? 'Type' : 'Tipo'} value={c.tipo} />
            <Row label={en ? 'Species' : 'Espécie'} value={c.subtipo} />
            <Row label={en ? 'Element' : 'Elemento'} value={c.elemento} />
            <Row label={en ? 'Stage' : 'Estágio'} value={c.estagio} />
            <Row label={en ? 'Weight' : 'Peso'} value={vazio(c.peso) ? null : `${c.peso} kg`} />
          </>
        )}
        {col1Pages[i1].key === 'atributos' && (
          <>
            <Row label={en ? 'Intellect' : 'Intelecto'} value={c.intelecto} />
            <Row label="Aura" value={c.aura} />
            <Row label={en ? 'Charisma' : 'Carisma'} value={c.carisma} />
            <Row label={en ? 'Strength' : 'Força'} value={c.forca} />
            <Row label={en ? 'Body' : 'Físico'} value={c.fisico} />
            <Row label={en ? 'Perception' : 'Percepção'} value={c.percepcao} />
            <Row label={en ? 'Agility' : 'Agilidade'} value={c.agilidade} />
          </>
        )}
        {col1Pages[i1].key === 'descricao' && (c.descricao
          ? String(c.descricao).split(/\r?\n/).map((p) => p.trim()).filter(Boolean)
              .map((p, i) => <p key={i} className="fp-montaria-desc">{p}</p>)
          : vazioCol(en ? 'No description.' : 'Sem descrição.'))}
      </AnimalColuna>
      )}

      {parte !== 'conhecimento' && (
      <AnimalColuna titulo={en ? 'Stats' : 'Derivadas'} paginas={[{ key: 'derivadas', label: en ? 'Stats' : 'Derivadas' }]} pagina={0} onNext={() => {}} {...navProps}>
        <Row label={en ? 'Physical Energy' : 'Energia Física'} value={c.energia_fisica} />
        <Row label={en ? 'Heroic Energy' : 'Energia Heroica'} value={c.energia_heroica} />
        <Row label={en ? 'Absorption' : 'Absorção'} value={c.absorcao} />
        <Row label={en ? 'Defense' : 'Defesa'} value={defesa} />
        <Row label={en ? 'Speed' : 'Velocidade'} value={c.velocidade} />
        <Row label={en ? 'Physical Resistance' : 'Resistência Física'} value={resist.rf} />
        <Row label={en ? 'Magic Resistance' : 'Resistência Mágica'} value={resist.rm} />
      </AnimalColuna>
      )}

      {parte !== 'conhecimento' && (
      <AnimalColuna titulo={en ? 'Attacks' : 'Ataques'} paginas={col3Pages} pagina={i3} onNext={proxima(setPag3, col3Pages.length)} {...navProps}>
        {atq ? (
          <>
            {/* L/M/P são a COLUNA DE ATAQUE contra armadura Leve/Média/Pesada,
                não dano; 100%…25% é o dano (usuário, 14/09/2026). */}
            <Row label="L" value={atq.dano_l} />
            <Row label="M" value={atq.dano_m} />
            <Row label="P" value={atq.dano_p} />
            <Row label="100%" value={atq.dano_100} />
            <Row label="75%" value={atq.dano_75} />
            <Row label="50%" value={atq.dano_50} />
            <Row label="25%" value={atq.dano_25} />
          </>
        ) : vazioCol(en ? 'No attacks.' : 'Nenhum ataque.')}
      </AnimalColuna>
      )}

      {parte === 'conhecimento' && (
      <AnimalColuna titulo={en ? 'Abilities' : 'Capacidades'} paginas={col4Pages} pagina={i4} onNext={proxima(setPag4, col4Pages.length)} {...navProps}>
        {col4Pages[i4].itens.length
          ? col4Pages[i4].itens.map((it, i) => {
              // O nome vem do texto da criatura: acha o item no catálogo do grupo aberto.
              const tipo = col4Pages[i4].key;
              const mapa = tipo === 'hab' ? habsByKey : tipo === 'tec' ? tecnicasByKey : magiasByKey;
              const obj = itemDoCatalogoPorNome(mapa, it.nome);
              return <Row key={it.nome + i} label={it.nome} value={it.valor}
                onAbrir={obj ? () => setConsulta({ tipo, obj, valor: it.valor }) : undefined} />;
            })
          : vazioCol(en ? 'No skills, techniques or spells.' : 'Sem habilidades, técnicas ou magias.')}
      </AnimalColuna>
      )}

      {consulta && (() => {
        const Janela = window.BestDetalheModal;
        const Linha = window.BestLinha;
        const Corpo = consulta.tipo === 'hab' ? window.BestHabilidadeFicha
          : consulta.tipo === 'tec' ? window.BestTecnicaFicha : window.BestMagiaFicha;
        if (!Janela || !Corpo) return null;
        const lang = en ? 'en' : 'pt';
        const rotulo = consulta.tipo === 'mag' ? (en ? 'Level' : 'Nível') : 'Total';
        const extras = Linha && !vazio(consulta.valor)
          ? <Linha rotulo={(c.nome ? c.nome + ' · ' : '') + rotulo} valor={consulta.valor} /> : null;
        const fechar = () => setConsulta(null);
        const nivelMag = Number(consulta.valor) || 0;
        return (
          <Janela title={consulta.obj.nome} lang={lang} onClose={fechar}>
            {consulta.tipo === 'hab' && <Corpo h={consulta.obj} lang={lang} linhasExtras={extras} />}
            {consulta.tipo === 'tec' && <Corpo t={consulta.obj} lang={lang} linhasExtras={extras} />}
            {consulta.tipo === 'mag' && <Corpo m={consulta.obj} lang={lang} linhasExtras={extras}
              niveisPermitidos={nivelMag ? new Set([1, 3, 5, 7, 9].filter((n) => n <= nivelMag)) : null} />}
          </Janela>
        );
      })()}

      <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
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
      /* Balão que escolheu abrir À ESQUERDA (Tooltip esquerda — os atalhos
         da borda direita) não é de cima nem de baixo: o guarda o reescrevia
         para 'above' e o pedido "tooltips para a esquerda" não pegava
         (26/09/2026). */
      if (el.dataset.tipFlip === 'left') return;
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

/* `onCompanheiros`/`compPedido*` (26/10/2026, pedido do usuário: "os botões
   para selecionar o animal vão ficar no menu da esquerda como submenu de
   companheiros"). A ficha diz quem são os companheiros deste personagem, e a
   barra lateral pede qual abrir — o mesmo par relatar/pedir que o submenu de
   Personagens já usa. O estado de qual está aberto continua aqui. */
function FichaPersonagem({ ac, lang, currentUserId, pjAtivoId, onVoltar, onEditar, onExcluir, onEvoluir = null, isMestre, navSlot, onBatalha, abaPedida = null, abaToken = 0, onAba = null,
  onCompanheiros = null, compPedidoId = null, compPedidoToken = 0,
  compPedidoParte = null }) {
  const en = lang === 'en';
  /* Barra de ações da ficha (22/10/2026): os atalhos e o pacto de amizade
     moram nela quando o console a oferece (#mc-acoes-ficha, 10-shell). */
  const alvoAcoes = useAlvoPortal('mc-acoes-ficha');

  // Globals de fases anteriores — acesso via window para robustez,
  // pois nem todas são exportadas explicitamente por Object.assign/window.X.
  // Nota: habsByKey NÃO vem de global — é construído localmente a partir do
  // banco (tabela `habilidades`), pois HABILIDADES_BY_KEY nunca é exposto globalmente.
  const _slotLbls   = (typeof SLOT_LABELS           !== 'undefined' ? SLOT_LABELS           : null) || window.SLOT_LABELS           || {};
  const _bonusGA_fn = (typeof bonusGrupoArma         !== 'undefined' ? bonusGrupoArma         : null) || window.bonusGrupoArma         || (() => 0);
  const _totHab     = (typeof totalHabilidade        !== 'undefined' ? totalHabilidade        : null) || window.totalHabilidade        || (() => 0);
  // _totHabCond: mesma coisa que _totHab, só que também aplica o modificador
  // de grupo por condição — Sanidade (Conhecimento/Manobra), Reputação
  // (Influência/Subterfúgio) e Temperatura (Geral/Profissional). Fallback pra
  // _totHab puro se a função nova ainda não tiver carregado (JS ignora o
  // 6º argumento extra que _totHab não usa).
  const _totHabCond = (typeof totalHabilidadeComCondicoes !== 'undefined' ? totalHabilidadeComCondicoes : null) || window.totalHabilidadeComCondicoes || null;
  const _corCondicao = (typeof corCondicao !== 'undefined' ? corCondicao : null) || window.corCondicao || (() => '#888');
  const _COND_LIMITE = (typeof COND_LIMITE !== 'undefined' ? COND_LIMITE : null) ?? window.COND_LIMITE ?? 50;
  const _nivelMag   = (typeof nivelMagiaEfetivo      !== 'undefined' ? nivelMagiaEfetivo      : null) || window.nivelMagiaEfetivo      || (() => 0);
  const _totTec     = (typeof totalTecnica           !== 'undefined' ? totalTecnica           : null) || window.totalTecnica           || (() => 0);
  const _itemIcon   = (typeof invItemIcon            !== 'undefined' ? invItemIcon            : null) || window.invItemIcon            || (() => 'ti-box');
  const _ehContainer    = (typeof ehContainer    !== 'undefined' ? ehContainer    : null) || window.ehContainer    || (() => false);
  const _ContainerModal = (typeof ContainerModal !== 'undefined' ? ContainerModal : null) || window.ContainerModal || null;
  const _DetalhesItemModal = (typeof DetalhesItemModal !== 'undefined' ? DetalhesItemModal : null) || window.DetalhesItemModal || null;
  /* A janela do item/região usa o esqueleto do sistema (BestDetalheModal):
     título, barra de ações com nome e corpo — o mesmo da janela de item. */
  const _JanelaItem = (typeof BestDetalheModal !== 'undefined' ? BestDetalheModal : null) || window.BestDetalheModal || null;
  const _QuantidadeModal   = (typeof QuantidadeModal   !== 'undefined' ? QuantidadeModal   : null) || window.QuantidadeModal   || null;

  const [pj, setPj] = useState(null);
  const [todosPjs, setTodosPjs] = useState([]);
  const [catalogo, setCatalogo] = useState(null);
  const [magias, setMagias] = useState(null);
  /* Livro → pergaminhos (22/10/2026): "Pode mostrar 'Estudar' no livro" —
     a janela de item da ficha precisa dos vínculos para oferecer Estudar.
     Falhar aqui só esconde o Estudar. */
  const [vinculosLivros, setVinculosLivros] = useState({});
  useEffect(() => {
    let vivo = true;
    const _paginada = (typeof fetchTabelaPaginada !== 'undefined' ? fetchTabelaPaginada : null) || window.fetchTabelaPaginada;
    const _vinc = window.vinculosDeLivros;
    if (!_paginada || !_vinc) return undefined;
    Promise.resolve(_paginada('livro_pergaminhos', { colunas: 'livro_slug,pergaminho_slug', ordem: ['livro_slug', 'pergaminho_slug'] }))
      .then((res) => { if (vivo && res && !res.error) setVinculosLivros(_vinc(res.data)); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);
  const [tecnicas, setTecnicas] = useState(null);
  const [habilidades, setHabilidades] = useState(null);
  const [historiaPj, setHistoriaPj] = useState(null);       // { id, protagonista_ids } — história em que o PJ ativo está
  /* FALSE até a história ser buscada. Sem este sinal, `pausada` é undefined
     durante o carregamento e o gate de pausa abaixo deixa a ficha INTEIRA
     renderizar por um instante — com autosave e edição ligados. O Jogador
     "não entrar" numa aventura pausada (17/09/2026) tem que valer também
     nesse instante. */
  const [historiaResolvida, setHistoriaResolvida] = useState(false);
  const [pjsDaHistoria, setPjsDaHistoria] = useState([]);   // [{id, nome, sobrenome, foto_url}] — outros protagonistas (alvos possíveis p/ magia)
  const [error, setError] = useState(null);
  const [eqErro, setEqErro] = useState(null);
  const [seletorOpen, setSeletorOpen] = useState(false);
  const [fpFull, setFpFull] = useState(false);
  const [fpTab, setFpTab] = useState(abaPedida || 'ficha');
  /* A BARRA LATERAL ESCOLHE A ABA (22/10/2026, "Mesa em Sessão"): Ficha,
     Inventário e Loja são destinos do menu do Jogador. `abaToken` sobe a cada
     clique, para o mesmo destino reabrir a aba; `onAba` devolve a aba atual,
     para o menu marcar o item certo quando a troca é feita aqui dentro. */
  useEffect(() => { if (abaPedida) setFpTab(abaPedida); }, [abaPedida, abaToken]);
  /* A gaveta da Ficha no menu só mostra Animais quando há animal (23/10/2026):
     a ficha conta junto com a aba. O temAnimais é acertado no render, logo
     depois de animaisPj (não pode ser hook: há retornos antes dali). */
  const [temAnimais, setTemAnimais] = useState(null);
  useEffect(() => { if (onAba) onAba(fpTab, { temAnimais: !!temAnimais }); }, [fpTab, onAba, temAnimais]);
  // Onde a Loja põe a busca: no cabeçalho, entre o nome e os botões (02/10/2026).
  const [slotBuscaLoja, setSlotBuscaLoja] = useState(null);
  /* O nome e os botões moram DENTRO da ficha (26/10/2026, modelo aprovado):
     este é o lugar deles na fileira do herói, dentro da moldura. Enquanto a
     aba Ficha está aberta, os portais de ação miram aqui em vez da barra do
     console (alvoAcoes). */
  const [slotAcoesFicha, setSlotAcoesFicha] = useState(null);
  const [fotoUploading, setFotoUploading] = useState(false);
  const [fotoErro, setFotoErro] = useState(null);
  const [editBar, setEditBar] = useState(null); // { item, scope, anchor } — popover de edição de barra
  // Retângulo da casa clicada: o menu da peça flutua ancorado nela.
  const [contFichaId, setContFichaId] = useState(null); // instanceId do container cujo conteúdo está aberto na ficha
  const [detalheCintoId, setDetalheCintoId] = useState(null); // instanceId do item (dentro do cinto) com detalhes abertos
  /* De onde a janela de detalhes foi aberta, para o botão Voltar (28/10/2026).
     `null` = veio de lugar nenhum (o Inventário, o cinto) e não há volta;
     `{ regiao, peca }` = veio da janela da região do boneco. */
  const [voltarPara, setVoltarPara] = useState(null);
  /* O motivo da transferência recusada, mostrado dentro da janela do item
     (28/10/2026). Mora aqui em cima porque TODO hook desta ficha precisa vir
     antes do primeiro `return` de carregamento — ver ficha-abre.test.jsx. */
  const [transferErroFicha, setTransferErroFicha] = useState(null);
  const [magiaDetalheKey, setMagiaDetalheKey] = useState(null); // key da magia com modal de detalhes aberto (fora de combate)
  const [habilidadeDetalheKey, setHabilidadeDetalheKey] = useState(null);
  /* A CONSULTA aberta pelo Conhecimento (26/09/2026): { tipo, key }, tipo
     'hab' | 'tec' | 'mag'. É a janela de LER — descrição, efeito,
     características, a do Treinamento —, não a de usar: "não o modal para
     usar a habilidade ou magia" (usuário). Usar continua nos atalhos. */
  const [consulta, setConsulta] = useState(null); // key da habilidade com modal de detalhes aberto (fora de combate)
  const [receitas, setReceitas] = useState([]);
  // O que a última tentativa na bancada produziu, para a tela dizer.
  const [fabResultado, setFabResultado] = useState(null);
  const [rolagem, setRolagem] = useState(null); // { nome, total, dificuldade } -> overlay do dado d20 no centro da tela (RolagemD20Overlay)
  const [acaoQtd, setAcaoQtd] = useState(null);               // { tipo:'usar'|'destruir', instanceId, max } p/ QuantidadeModal
  const [capView, setCapView] = useState('atrib');  // 'atrib' | 'mag' | 'tec' | 'hab' — card lateral direito
  const [capPage, setCapPage] = useState(0);        // página atual na vista de cap (15 por página)
  const [tip, abrirTip, fecharTip, manterTip] = useTooltip(80);     // tooltip: itens equipados + capacidades
  const [tabTip, abrirTabTip, fecharTabTip, manterTabTip] = useTooltip(80); // tooltip: botões de navegação
  /* O diálogo das casas da REGIÃO (26/10/2026): substitui os quatro cards
     separados (joias, brincos, roupas, cinto) — qualquer região com mais de
     uma casa abre o mesmo diálogo flutuante com as casas dela. */
  const [regiaoAberta, setRegiaoAberta] = useState(null);   // chave da região (ex.: 'dedo')
  const [regiaoRect, setRegiaoRect] = useState(null);       // DOMRect do botão da região
  /* A peça escolhida DENTRO do modal da região (26/10/2026): clicar numa casa
     com item abre o modal já nela, e as ações embaixo são dela. */
  /* ── ESCOLHER A CASA VAZIA (28/10/2026) ────────────────────────────────
     `pecaNoModal` guardava o instanceId da peça em foco, e `null` queria
     dizer duas coisas ao mesmo tempo: "ainda não escolhi nada" e "escolhi uma
     casa vazia". A janela resolvia o empate caindo no primeiro ocupante — e
     com isso, numa região parcialmente cheia (uma mão com arma e outra
     livre), clicar na casa VAZIA não mudava nada: o foco voltava para a peça
     e a oferta do inventário, que só existe sem foco, nunca aparecia.

     `CASA_VAZIA` desfaz o empate. É uma string, e não `null`, justamente para
     não poder ser confundida com "nada escolhido". */
  const CASA_VAZIA = 'casa-vazia';
  const [pecaNoModal, setPecaNoModal] = useState(null);
  const fileFotoRef = useRef(null);
  const estadoTimer = useRef(null);
  // Patch acumulado de estado_atual esperando o debounce (ver salvarEstadoAtual).
  const patchEstadoRef = useRef({});
  useEffect(() => {
    if (!fpFull) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setFpFull(false); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [fpFull]);

  // Fecha o tooltip quando a aba muda (o alvo pode ter desmontado).
  useEffect(() => { setEditBar(null); setPecaNoModal(null); setContFichaId(null); setDetalheCintoId(null); setAcaoQtd(null); setMagiaDetalheKey(null); setHabilidadeDetalheKey(null); setRolagem(null); fecharTip(); setCapPage(0); setRegiaoAberta(null); }, [fpTab, fpFull]);
  // Ao trocar de PJ: fecha todos os modais, overlays e tooltips — evita
  // backdrop de modal aberto no PJ anterior bloquear cliques no novo PJ.
  // useLayoutEffect (em vez de useEffect) roda antes do browser pintar o
  // próximo frame, evitando o flash do backdrop no PJ novo.
  // Também restaura o overflow do body caso algum modal o tenha travado.
  React.useLayoutEffect(() => {
    setEditBar(null); setPecaNoModal(null); setContFichaId(null);
    setDetalheCintoId(null); setAcaoQtd(null); setMagiaDetalheKey(null);
    setHabilidadeDetalheKey(null); setRolagem(null);
    setRegiaoAberta(null);
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
      const [pjRes, pjsRes, itRes, mgRes, tcRes, habRes, recRes] = await Promise.all([
        supabaseClient.from('personagens').select('*').eq('id', pjAtivoId).maybeSingle(),
        supabaseClient.from('personagens').select('id, nome, sobrenome, raca, profissao')
          .eq('user_id', currentUserId).order('created_at', { ascending: true }),
        fetchCatalogoCompleto(),
        supabaseClient.from('magias').select('*'),
        supabaseClient.from('tecnicas').select('*'),
        supabaseClient.from('habilidades').select('*'),
        /* As receitas da bancada (06/10/2026, ligada em 26/10/2026). Falha
           aqui não derruba a ficha: sem receitas, a aba Fabricar fica vazia. */
        supabaseClient.from('receitas').select('*'),
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
      if (recRes.error) console.error('[fabricar] receitas não carregaram:', recRes.error);
      setReceitas(recRes.data || []);

      // História em que o PJ ativo é protagonista (busca reversa: array
      // protagonista_ids contém o id do PJ). Não há historia_id direto em
      // personagens — o vínculo só existe nesse array. Usado para listar
      // os outros personagens da mesa como alvos possíveis de magia.
      // O PJ pode estar em mais de uma história: vale a mais nova (como o bridge.ts). Sem o limit, o maybeSingle dava erro e a tela ficava vazia (02/10/2026).
      const histRes = await supabaseClient.from('historias')
        .select('id, protagonista_ids, pausada, data_jogo_atual').contains('protagonista_ids', [pjAtivoId]).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (cancel) return;
      setHistoriaResolvida(true);
      if (!histRes.error && histRes.data) {
        setHistoriaPj(histRes.data);
        const outrosIds = (histRes.data.protagonista_ids || []).filter((id) => id !== pjAtivoId);
        if (outrosIds.length > 0) {
          /* Pela RPC, não pelo SELECT direto (15/09/2026).

             A RLS de `personagens` só deixa o dono e o Mestre lerem: para o
             JOGADOR, o select dos colegas voltava VAZIO, sem erro — a janela
             de magia oferecia só "(Você)" e evocar num colega era impossível.
             get_pjs_historia é SECURITY DEFINER e devolve os outros PJs da
             mesma história; é a mesma porta que o inventário usa para
             transferir item. */
          const colegasRes = await supabaseClient.rpc('get_pjs_historia', { p_pj_id: pjAtivoId });
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

  /* A ficha ABERTA acompanha o banco (24/09/2026). O relógio e o clima da mesa
     gravam no estado_atual do PJ pela tela do Mestre (10-shell, desgaste), e a
     ficha só lia a linha ao abrir: as barras ficavam paradas até recarregar,
     parecendo que o clima não fazia nada.

     Só o estado_atual é trazido — inventário e o resto têm os próprios
     autosaves, e trocar a linha inteira atropelaria o que está em debounce.
     Pela mesma razão, o patch ainda pendente (patchEstadoRef) é reaplicado por
     cima do que chegou: o clique do usuário não pode sumir com o evento. A
     linha é relida em vez de usar o payload porque ele pode vir sem jsonb
     grande (TOAST). */
  useEffect(() => {
    if (!pjAtivoId || typeof supabaseClient.channel !== 'function') return undefined;
    let cancel = false;
    const channel = supabaseClient
      .channel('ficha_pj_' + pjAtivoId + '_' + Math.random().toString(36).slice(2))
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'personagens', filter: 'id=eq.' + pjAtivoId },
        async () => {
          const { data, error: err } = await supabaseClient
            .from('personagens').select('estado_atual').eq('id', pjAtivoId).maybeSingle();
          if (cancel || err || !data) return;
          const novo = mesclarEstado(data.estado_atual, patchEstadoRef.current);
          setPj((prev) => (prev && prev.id === pjAtivoId ? { ...prev, estado_atual: novo } : prev));
        })
      .subscribe();
    return () => { cancel = true; supabaseClient.removeChannel(channel); };
  }, [pjAtivoId]);

  /* A ficha ABERTA acompanha a MESA (revisão de 24/09/2026). historiaPj era
     lido uma vez, ao abrir, e três coisas ficavam velhas enquanto o Mestre
     mexia na barra do topo:
       • o vento — a Velocidade só mudava depois de recarregar;
       • a data — status vencidos continuavam na ficha, e um status novo
         contava o prazo a partir do dia VELHO (vencia antes da hora);
       • a pausa — o Jogador seguia dentro de uma mesa já pausada.
     O UPDATE traz a linha nova inteira; só estes campos são copiados. */
  const historiaPjId = historiaPj && historiaPj.id;
  useEffect(() => {
    if (!historiaPjId || typeof supabaseClient.channel !== 'function') return undefined;
    const channel = supabaseClient
      .channel('ficha_mesa_' + historiaPjId + '_' + Math.random().toString(36).slice(2))
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'historias', filter: 'id=eq.' + historiaPjId },
        (payload) => {
          const nova = payload && payload.new;
          if (!nova) return;
          setHistoriaPj((prev) => (prev && prev.id === nova.id ? {
            ...prev,
            ...('data_jogo_atual' in nova ? { data_jogo_atual: nova.data_jogo_atual } : {}),
            ...('pausada' in nova ? { pausada: nova.pausada } : {}),
            ...('protagonista_ids' in nova ? { protagonista_ids: nova.protagonista_ids } : {}),
          } : prev));
        })
      .subscribe();
    return () => { supabaseClient.removeChannel(channel); };
  }, [historiaPjId]);

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
  // Aba Animais (14/09/2026): as criaturas para as quais os animais do
  // inventário apontam (itens.criatura_id). Hook antes dos returns de loading.
  const criaturasDosAnimais = (window.useCriaturasPorIds || (() => ({})))(
    (pj?.inventario?.itens || []).map((it) => catalogoBySlug[it.slug]?.criatura_id)
  );
  /* ── OS COMPANHEIROS, PARA A BARRA LATERAL (26/10/2026) ──────────────────
     Os dois hooks moram AQUI, acima dos returns de carregamento, e por isso
     recalculam a lista em vez de usar `animaisPj`: aquele é montado 800 linhas
     abaixo, depois dos returns, e um hook lá embaixo muda a contagem de hooks
     entre o render de "Carregando" e o render com dados — é o bug que
     ficha-hooks-antes-dos-returns.test.js existe para impedir. A conta é a
     mesma função (`animaisDoPersonagem`), com os mesmos três argumentos. */
  const _comps = (window.animaisDoPersonagem || (() => []))(
    pj?.inventario?.itens, catalogoBySlug, criaturasDosAnimais);
  const _compsChave = _comps.map((a) => a.instancia.instanceId + ':' + a.nome).join('|');
  useEffect(() => {
    if (!onCompanheiros) return;
    onCompanheiros(_comps.map((a) => ({ id: a.instancia.instanceId, nome: a.nome })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_compsChave, onCompanheiros]);
  const [compSel, setCompSel] = useState(null);
  /* QUAL PÁGINA DO BICHO (27/10/2026): o menu lateral agora pede o
     companheiro E a parte dele — Identificação, Conhecimento ou
     Inventário. Sem parte no pedido (clique no nome do bicho), volta
     para a ficha: é a página que o nome abre, como no personagem. */
  const [compParte, setCompParte] = useState('ficha');
  const compVisto = useRef(compPedidoToken);
  useEffect(() => {
    if (compVisto.current === compPedidoToken) return;
    compVisto.current = compPedidoToken;
    if (compPedidoId) setCompSel(compPedidoId);
    setCompParte(compPedidoParte || 'ficha');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compPedidoToken]);
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
  // Só o que o PJ aprendeu (22/10/2026): sem permissão por profissão, o
  // "catálogo alcançável" virou o catálogo inteiro — 239 linhas de "—".
  const catalogoMag = useMemo(
    () => Object.values(magiasByKey)
      .filter((m) => magKeysPossuidas.has(m.key))
      .sort(_porPosseDepoisNome(magKeysPossuidas)),
    [magiasByKey, magKeysPossuidas]
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
    return <Carregando lang={lang} />;
  }
  /* O Jogador espera a história ser resolvida ANTES de ver qualquer coisa —
     ver historiaResolvida. O Mestre não espera: ele entra em mesa pausada de
     qualquer jeito, e para ele esta busca só alimenta a lista de alvos. */
  if (!isMestre && !historiaResolvida) {
    return <Carregando lang={lang} />;
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
  /* O VENTO DA MESA entra na Velocidade Base (20/09/2026). É o único fator da
     ficha que não vem do personagem: sai de historias.data_jogo_atual.tempo e
     penaliza 1 a 4 pontos enquanto sopra, voltando sozinho quando para. Nada
     é gravado no PJ — ver 01-core/clima-desgaste.jsx.
     PJ fora de mesa não tem clima, e aí o parâmetro é undefined: a conta é a
     de sempre. */
  const ventoDaMesa = historiaPj?.data_jogo_atual?.tempo?.vento;
  // Sub-raça com a data da mesa: a Licantropia vencida já não conta aqui.
  const subracaAtual = subracaEfetiva(pj, historiaPj?.data_jogo_atual);
  /* A data da mesa entra aqui para os bônus com prazo (06/10/2026): é ela
     que diz quais ainda valem. `dataJogoDaMesa` é declarada mais abaixo e é o
     mesmo valor — aqui a leitura é direta para não depender da ordem. */
  const ficha = calcularFicha(pj, catalogoBySlug, pj.estado_atual?.condicoes, ventoDaMesa, subracaAtual,
    historiaPj?.data_jogo_atual || null);

  const slotsState = getSlotsState(pj.inventario?.itens || [], catalogoBySlug, pj.raca);

  // ── Máximos de vitalidade (cálculo adiantado) ──────────────
  // Precisos AQUI (antes de desequiparFicha/usarItemFicha abaixo) só pro
  // clamp de teto em aplicarEstadoEfeito. Os mesmos valores são recalculados
  // mais abaixo (_d/maxEF/maxEH/maxKA/arVal/arMax, bloco "Vitalidade") pra
  // uso no JSX — duplicação proposital e barata (mesma fonte: ficha.derivadas)
  // pra não reordenar todo o bloco de Defesa/JSX que depende da ordem atual.
  const _dPre = ficha.derivadas || {};
  // Mesmo critério de calcArmadura e calcularFicha — ver pecaNoCorpo.
  const _absorcaoEquipadaPre = (pj.inventario?.itens || []).reduce((soma, it) => {
    const cat = pecaNoCorpo(it) ? catalogoBySlug[it.slug] : null;
    return soma + (cat ? absorcaoDaPeca(it, cat) : 0);
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
  /* Grava só o que MUDOU (15/09/2026). Antes mandava o objeto inteiro montado
     sobre a cópia carregada ao abrir a ficha — e apagava o que o inventário do
     jogador, a fila de magia ou a batalha tivessem gravado nesse meio tempo.
     Era isso que fazia a barra "voltar sozinha" depois de alterada.
     Ver patchDeEstado/gravarEstadoAtual (01-core/inventario-helpers.jsx). */
  const salvarEstadoAtual = (novoEstado) => {
    if (!pj) return;
    const id = pj.id;
    const patch = patchDeEstado(pj.estado_atual, novoEstado);
    setPj((prev) => (prev ? { ...prev, estado_atual: novoEstado } : prev)); // otimista
    if (Object.keys(patch).length === 0) return;
    // Acumula entre disparos: cliques seguidos no mesmo popover viram um
    // patch só, e nenhum deles se perde no debounce.
    patchEstadoRef.current = mesclarEstado(patchEstadoRef.current, patch);
    if (estadoTimer.current) clearTimeout(estadoTimer.current);
    estadoTimer.current = setTimeout(async () => {
      const pendente = patchEstadoRef.current;
      patchEstadoRef.current = {};
      const { data, error: err } = await gravarEstadoAtual(id, pendente);
      if (err) { setEqErro(err.message); return; }
      // O que voltou é a linha do banco com o patch aplicado: traz junto o que
      // outra tela mudou, em vez de deixar a ficha com um retrato velho.
      if (data) setPj((prev) => (prev && prev.id === id ? { ...prev, estado_atual: data } : prev));
    }, 400); // mesmo espírito do debounce de inventário
  };

  /* SUB-RAÇA (22/10/2026). `venceEm` só existe quando o lobo vem da
     Licantropia ainda vigente — a última magia de transformação da lista. */
  const _ativasTransf = (typeof magiasAtivasVigentes === 'function'
    ? magiasAtivasVigentes((pj.estado_atual && pj.estado_atual.magias_ativas) || [], historiaPj?.data_jogo_atual)
    : []).filter((a) => a && subracaDaMagia(a.key));
  const _transfMagia = _ativasTransf[_ativasTransf.length - 1] || null;
  const subracaInfo = {
    atual: subracaAtual,
    venceEm: (_transfMagia && subracaDaMagia(_transfMagia.key) === subracaAtual && _transfMagia.vence_em) || null,
  };
  /* O Mestre decide (pedido do usuário: "O mestre do jogo pode mudar a
     transformação dos personagens quando quiser"): a escolha vira a sub-raça
     permanente e encerra a Licantropia em curso — senão o lobo da magia
     continuaria vencendo a escolha dele até o prazo acabar. */
  const definirSubraca = async (s) => {
    const id = pj.id;
    const est = pj.estado_atual || {};
    const ativas = Array.isArray(est.magias_ativas) ? est.magias_ativas : [];
    const semMagia = ativas.filter((a) => !(a && subracaDaMagia(a.key)));
    if (semMagia.length !== ativas.length) salvarEstadoAtual({ ...est, magias_ativas: semMagia });
    // A permanente mora na coluna `subraca`; um trigger no banco recusa
    // quem não é Mestre da história do personagem.
    const antes = pj.subraca || null;
    setPj((prev) => (prev && prev.id === id ? { ...prev, subraca: s || null } : prev));   // otimista
    const { error: err } = await supabaseClient.from('personagens').update({ subraca: s || null }).eq('id', id);
    if (err) {
      setPj((prev) => (prev && prev.id === id ? { ...prev, subraca: antes } : prev));
      setEqErro(err.hint || err.message);
    }
  };
  // aplicarEstadoEfeito — porta de gravação SEM o gate de isMestre: aplica
  // efeito_positivo/negativo de UM item (catálogo `cat`, multiplicado por
  // `quantidade`) sobre o estado_atual atual do PJ. Usada por usarItemFicha
  // (consumir) e desequiparFicha (reverter efeito de vestimenta retirada).
  const aplicarEstadoEfeito = (cat, quantidade) => {
    if (!pj) return;
    /* A data da mesa decide a porta: item com prazo vira linha em
       efeitos_temporarios em vez de prender valor na barra (06/10/2026). */
    const novo = aplicarEfeitosItem(pj.estado_atual, cat, quantidade, maximosVitalidade, dataJogoDaMesa);
    if (novo !== pj.estado_atual) salvarEstadoAtual(novo);
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
  // inventário) e persiste em personagens.inventario só a mudança (gravarInventario).
  // Dono do PJ OU Mestre — mesmo critério da aba Inventário, que passa
  // currentUserId={pj.user_id} pro InventarioList quando isMestre.
  const podeEditarInv = podeEditarFoto || !!isMestre;
  const salvarItensFicha = async (novosItens) => {
    const base = pj.inventario || {};
    const novoInv = { ...base, itens: novosItens };
    const anterior = pj;
    setEqErro(null);
    setPj((prev) => ({ ...prev, inventario: novoInv }));
    // Só a peça mexida vai ao banco, mesclada com o que mudou por fora — a
    // cópia da Ficha pode estar velha (02/10/2026).
    const r = await gravarInventario(pj.id, { base, local: novoInv, versao: pj.inventario_versao });
    if (!r.ok) { setPj(anterior); setEqErro(r.error.message); return; }
    setPj((prev) => (prev.inventario === novoInv
      ? { ...prev, inventario: r.inventario, inventario_versao: r.versao }
      : { ...prev, inventario_versao: r.versao }));
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
      const novo = desfazerEfeitosItem(pj.estado_atual, cat, 1, maximosVitalidade);
      if (novo !== pj.estado_atual) salvarEstadoAtual(novo);
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
    if (estaAVenda(it)) return;   // à venda na loja: travado (02/10/2026)
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
      const nomePj = primeiroNome(pj?.nome);   // o log usa o primeiro nome (27/09/2026)
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
    /* Descartar vira linha na mesa (15/09/2026) — o mesmo texto do Inventário,
       porque o item pode sair por qualquer uma das duas telas. */
    const catDescartado = catalogoBySlug[it.slug];
    const nomePjDescarte = [pj.nome, pj.sobrenome].filter(Boolean).join(' ');
    if (catDescartado && nomePjDescarte) {
      const quanto = qtdRemover > 1 ? `${qtdRemover}× ` : '';
      registrarEventoMesa('item', en
        ? `${nomePjDescarte} discarded ${quanto}${catDescartado.nome}.`
        : `${nomePjDescarte} descartou ${quanto}${catDescartado.nome}.`,
        { item: catDescartado.nome, quantidade: qtdRemover, instanceId, acao: 'descartar' });
    }
    if (qtdRemover >= it.quantidade) {
      // remoção total: tira o item (e filhos, caso fosse container — não é, dentro do cinto)
      salvarItensFicha(itens.filter((x) => x.instanceId !== instanceId && x.containerId !== instanceId));
    } else {
      salvarItensFicha(itens.map((x) => x.instanceId === instanceId ? { ...x, quantidade: x.quantidade - qtdRemover } : x));
    }
  };
  // Pedem quantidade quando há mais de 1 em estoque (abre QuantidadeModal).
  // `qtd` vem do seletor inline da janela do item (12/09/2026): age direto.
  const solicitarUsarFicha = (instanceId, qtd) => {
    const it = (pj.inventario?.itens || []).find((x) => x.instanceId === instanceId);
    if (!it) return;
    if (qtd != null) { usarItemFicha(instanceId, Math.max(1, Math.min(it.quantidade || 1, qtd))); return; }
    if (it.quantidade > 1) setAcaoQtd({ tipo: 'usar', instanceId, max: it.quantidade });
    else usarItemFicha(instanceId, 1);
  };
  const solicitarDestruirFicha = (instanceId, qtd) => {
    const it = (pj.inventario?.itens || []).find((x) => x.instanceId === instanceId);
    if (!it) return;
    if (qtd != null) { destruirItemFicha(instanceId, Math.max(1, Math.min(it.quantidade || 1, qtd))); return; }
    if (it.quantidade > 1) setAcaoQtd({ tipo: 'destruir', instanceId, max: it.quantidade });
    else destruirItemFicha(instanceId, 1);
  };
  /* ── TRANSFERIR TAMBÉM PELA FICHA (28/10/2026) ──────────────────────────
     "Transferir o item da algibeira." (usuário)

     Até aqui a janela da ficha trazia `onTransferir` como função vazia, com
     o comentário de que transferir era coisa da aba Inventário. Mas quem abre
     a algibeira pelo boneco está olhando a peça; mandar a pessoa fechar tudo
     e procurar o mesmo item no baú é o mesmo rodeio do botão Voltar.

     É a MESMA RPC do Inventário (`transfer_item`, 07-inventario) — a trava
     está no banco, não na tela: ela recusa sem pacto de amizade, fora da
     aventura ou com o item anunciado na loja. A lista de amigos a própria
     janela busca, a partir de `pjOrigemId`. */
  const transferirDaFicha = async (instanceId, pjDestinoId, qtd) => {
    setTransferErroFicha(null);
    const itens = pj.inventario?.itens || [];
    const it = itens.find((x) => x.instanceId === instanceId);
    if (!it || !pjDestinoId) return { ok: false };
    const { data, error } = await supabaseClient.rpc('transfer_item', {
      p_from_pj_id: pj.id,
      p_to_pj_id: pjDestinoId,
      p_instance_id: instanceId,
      p_moedas: null,
      p_quantidade: qtd ?? null,
    });
    if (error || !data?.ok) {
      setTransferErroFicha(error?.message || data?.motivo || 'erro_desconhecido');
      return { ok: false };
    }
    /* A RPC já gravou no banco; a ficha relê para a casa e a carga
       acompanharem. Vira linha na mesa como no Inventário. */
    const cat = catalogoBySlug[it.slug];
    const destino = (pjsDaHistoria || []).find((x) => String(x.id) === String(pjDestinoId));
    if (cat && destino) {
      const nomeDestino = [destino.nome, destino.sobrenome].filter(Boolean).join(' ');
      const n = Number(data.quantidade) || qtd || it.quantidade || 1;
      registrarEventoMesa('item',
        en ? `${primeiroNome(pj.nome)} gave ${n}× ${cat.nome} to ${nomeDestino}.`
          : `${primeiroNome(pj.nome)} entregou ${n}× ${cat.nome} para ${nomeDestino}.`,
        { item: cat.nome, quantidade: n, acao: 'transferir' });
    }
    /* A ficha relê o inventário do banco: a RPC gravou lá, e a cópia local
       (`pj.inventario`) ficaria com a peça que já não é mais desta pessoa.
       `inventario_versao` vem junto para a próxima gravação não brigar. */
    const { data: fresco } = await supabaseClient
      .from('personagens').select('inventario, inventario_versao').eq('id', pj.id).maybeSingle();
    if (fresco) {
      setPj((prev) => ({ ...prev, inventario: fresco.inventario, inventario_versao: fresco.inventario_versao }));
    }
    return { ok: true };
  };
  const solicitarTransferirFicha = (instanceId, pjDestinoId) => {
    const it = (pj.inventario?.itens || []).find((x) => x.instanceId === instanceId);
    if (!it) return;
    if ((it.quantidade || 1) > 1) {
      setAcaoQtd({ tipo: 'transferir', instanceId, max: it.quantidade, destino: pjDestinoId });
      return;
    }
    transferirDaFicha(instanceId, pjDestinoId, 1);
    setDetalheCintoId(null);
  };

  const executarAcaoQtd = (qtd) => {
    if (!acaoQtd) return;
    if (acaoQtd.tipo === 'usar')     usarItemFicha(acaoQtd.instanceId, qtd);
    if (acaoQtd.tipo === 'destruir') destruirItemFicha(acaoQtd.instanceId, qtd);
    if (acaoQtd.tipo === 'transferir') transferirDaFicha(acaoQtd.instanceId, acaoQtd.destino, qtd);
    setAcaoQtd(null);
    // Confirmou a quantidade: a janela do item fecha junto (13/09/2026),
    // como no Inventário. Cancelar não passa por aqui.
    setDetalheCintoId(null);
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
  /* EVOCAR FORA DE COMBATE — degrau 1, 12/09/2026.
     Ver docs/fora-de-combate.md.

     Até aqui este handler só escrevia no log: a magia era anunciada e não
     acontecia. Agora ela ACONTECE, dentro de uma fronteira estreita e
     deliberada — alvo é o próprio conjurador, e o efeito é instantâneo.

     As duas regras do usuário desenham a fronteira:

       • alvo em TERCEIRO exige aprovação do Mestre (degrau 2). Aqui o
         evento vai para o log como pendente, e ninguém escreve na ficha do
         colega — o que o banco recusaria de qualquer jeito, com razão;
       • magia de RODADA é magia de combate. Fora dele, só o log.

     Quando não aplica, o log DIZ POR QUÊ. "Evoquei e não aconteceu nada" foi
     o que esta tela fez por meses, e não pode voltar a ser um mistério. */
  /* `key` entra em 28/10/2026: a janela do atalho evoca direto, sem passar
     pelo estado `magiaDetalheKey` da janela antiga — que continua existindo
     para a consulta pelo Conhecimento. Sem a chave, vale a de antes. */
  const aoEvocarMagia = ({ nivel, alvo, key }) => {
    const chave = key || magiaDetalheKey;
    if (!chave) return;
    const mag = magiasByKey[chave];
    if (!mag) return;
    /* RITUAL (28/09/2026): os itens necessários saem da mochila no ato. Faltou
       algum, a evocação não acontece — a janela já avisava, e isto é a trava
       de verdade. `itensDepois` segue adiante para o Elo não gravar por cima. */
    let itensDepois = pj.inventario?.itens || [];
    let gastouRitual = false;
    const textoRitual = podeEditarFoto ? ritualDaMagia(mag) : null;
    if (textoRitual && typeof consumirItensDoRitual === 'function') {
      const r = consumirItensDoRitual(itensDepois, textoRitual, catalogoBySlug);
      if (!r.ok) return;
      itensDepois = r.itens;
      gastouRitual = true;
    }
    const nomePj = primeiroNome(pj?.nome);   // o log usa o primeiro nome (27/09/2026)
    const nomeAlvo = alvo ? alvo.nome : null;
    /* 'self' ainda é aceito aqui por segurança: foi o id que a janela usou
       até 15/09/2026, e uma aba aberta desde antes continua mandando ele. */
    const emMim = !alvo || String(alvo.id) === String(pj.id) || String(alvo.id) === 'self';

    const motivo = (typeof motivoNaoAplicaNaFicha === 'function')
      ? motivoNaoAplicaNaFicha(mag, nivel) : 'narrativa';
    const aplicou = emMim && !motivo && podeEditarFoto;
    /* A magia SAIU do conjurador? Saiu quando ela tem o que fazer fora de
       combate — não importa em quem o efeito vai pousar. É isso que decide o
       karma (degrau 2, 12/09/2026).

       Antes o karma só era cobrado quando o efeito era aplicado na hora, e
       isso deixava evocação em terceiro sair de graça enquanto esperava o
       Mestre. Agora o custo é do ATO, como em batalha, onde o karma sai na
       largada e não volta se a evocação quebrar. */
    const saiu = !motivo && podeEditarFoto;
    const pendente = saiu && !emMim;
    /* 13/09/2026: o karma sai de TODA evocação do dono — narrativa e
       duradoura inclusive, que antes saíam de graça. Só a de rodada não sai
       fora de combate (karmaDaEvocacaoForaDeCombate, 01-core). */
    const karma = podeEditarFoto && typeof karmaDaEvocacaoForaDeCombate === 'function'
      ? karmaDaEvocacaoForaDeCombate(motivo, nivel) : 0;

    /* Karma quando o efeito NÃO pousa aqui (em terceiro, narrativa,
       duradoura): sai do conjurador agora, na linha dele — que é a única que
       ele pode escrever. */
    if (!aplicou && karma > 0) {
      const soKarma = aplicarEfeitosNaFicha(pj.estado_atual,
        [{ scope: 'vitalidade', key: 'ka', delta: -karma }], maximosVitalidade);
      if (soKarma !== pj.estado_atual) salvarEstadoAtual(soKarma);
    }

    if (aplicou) {
      /* O karma sai do NÍVEL EVOCADO, não do nível comprado. Em batalha se
         conjura sempre no máximo e a distinção não aparece; aqui o jogador
         escolhe o nível, e cobrar o máximo por uma evocação de nível 1 seria
         cobrar o que ele não usou. */
      /* aplicarEfeitosNaFicha é a MESMA porta que o item consumido usa —
         extraída de aplicarEfeitosItem justamente para isto. O clamp de poço,
         a escala de condição e o piso de zero são os mesmos, e há um lugar só
         para corrigir quando algum estiver errado. */
      /* aplicarMagiaNoEstado (01-core) é a MESMA porta que o Mestre usa ao
         aprovar a evocação no colega: efeitos instantâneos pelo caminho do
         item consumido e, depois, a magia ativa (calendário ou "para o próximo
         teste"). Duas versões divergiam — a do Mestre esquecia a ativa. */
      const novo = aplicarMagiaNoEstado(pj.estado_atual, mag, nivel, maximosVitalidade,
        historiaPj && historiaPj.data_jogo_atual,
        [{ scope: 'vitalidade', key: 'ka', delta: -nivel }]);

      if (novo !== pj.estado_atual) salvarEstadoAtual(novo);
    }

    const SUFIXO = {
      rodadas:    en ? ' — lasts in rounds, so it is a combat spell: cast it in battle.'
                     : ' — dura em rodadas, então é magia de combate: evoque em batalha.',
      calendario: en ? ' — lasts on the calendar; the GM applies it.'
                     : ' — dura no calendário; o Mestre aplica.',
      duradoura:  en ? ' — lasting effect; the GM applies it.'
                     : ' — efeito duradouro; o Mestre aplica.',
      narrativa:  en ? ' — narrative effect, resolve at the table.'
                     : ' — efeito narrativo, resolva na mesa.',
    };
    /* Ordem importa: "não aplicou em mim" só vira "aguardando o Mestre"
       quando a magia REALMENTE saiu. Uma magia de rodada lançada num colega
       não está esperando ninguém — ela é de combate, e o texto tem que dizer
       isso em vez de prometer uma aprovação que nunca virá. */
    const sufixo = aplicou ? ''
      : (pendente
          ? (en ? ' — awaiting the GM to apply it on the target.'
                : ' — aguardando o Mestre aplicar no alvo.')
          : (SUFIXO[motivo] || ''));

    /* ELO PERMANENTE (27/09/2026): evocada num animal do personagem, a magia
       grava o elo na instância dele — é o status que a ficha do animal, a aba
       e o inventário mostram. O karma já saiu acima, como em toda evocação. */
    const eloCriado = !!(alvo && alvo.tipo === 'animal' && podeEditarInv
      && typeof window.magiaCriaElo === 'function' && window.magiaCriaElo(mag));
    if (eloCriado) {
      salvarItensFicha(window.comEloNoAnimal(itensDepois, alvo.instanceId, {
        permanente: true, magia: mag.key, conjurador_pj_id: pj.id, conjurador_nome: nomePj,
        desde: (historiaPj && historiaPj.data_jogo_atual) || null,
      }));
    } else if (gastouRitual) {
      salvarItensFicha(itensDepois);
    }

    const texto = (en
      ? `${nomePj} cast the spell ${mag.nome} level ${nivel}${nomeAlvo ? ` on ${nomeAlvo}` : ''}.`
      : `${nomePj} usou a magia ${mag.nome} nível ${nivel}${nomeAlvo ? ` em ${nomeAlvo}` : ''}.`)
      + (eloCriado
          ? (en ? ' A permanent bond was created (the animal may resist — resolve at the table).'
                : ' Um Elo Permanente foi criado (o animal pode resistir — resolva na mesa).')
          : sufixo)
      // O que o ritual consumiu vai junto na mesa (28/09/2026).
      + (gastouRitual
          ? (en ? ' Ritual items used: ' : ' Itens do ritual consumidos: ')
            + conferirItensDoRitual(textoRitual, pj.inventario?.itens || [], catalogoBySlug)
                .gastos.map((g) => `${g.nome} ×${g.qtd}`).join(', ') + '.'
          : '');

    /* A forma do `meta` mora em metaDeEvocacao (01-core), e não aqui: quem
       PRODUZ o pedido é esta tela, quem o CONSOME é o painel do Mestre, e a
       forma não pode ser descrita em dois lugares. */
    registrarEventoMesa('magia', texto, metaDeEvocacao({
      magia: mag, nivel, alvo, aplicou,
      motivo: aplicou ? null : (pendente ? 'aprovacao_mestre' : motivo),
      karma,
      conjurador: nomePj,
    }));
  };

  // Resultado de um teste de habilidade (RolagemD20Overlay -> onResultado).
  // Monta o texto no padrão combinado: "Victor usou Alfabetização (Médio) e
  // obteve uma falha." — usa o nome do personagem (não da conta), pra ficar
  // no tom da mesa; quem de fato gravou (auth.uid()) é validado server-side.
  /* A BANCADA (06/10/2026, ligada em 26/10/2026) ──────────────────────────
     A tela Fabricar não grava nada: devolve a receita, e quem rola o dado é a
     ficha — o mesmo d20 de qualquer teste de habilidade. O resultado volta
     por aoResolverTesteHabilidade, que vê `rolagem.receita` e manda para
     window.fabricar. O material vai embora NOS DOIS CASOS (decisão do
     usuário em 06/10): o custo é da tentativa, não do sucesso. */
  const pedirFabricacao = (receita) => {
    if (!receita || !podeEditarInv) return;
    const hab = habsByKey[receita.habilidade_key];
    const total = (_totHabCond || _totHab)(
      receita.habilidade_key, pj.habilidades || {}, atributosFinais,
      bonusHabilidades, habsByKey, _est.condicoes, ficha.protecoes,
    );
    setFabResultado(null);
    setRolagem({
      nome: hab ? hab.nome : receita.habilidade_key,
      grupo: hab ? hab.grupo : null,
      total,
      dificuldade: receita.dificuldade,
      receita,
    });
  };

  const aoResolverTesteHabilidade = (res) => {
    if (!rolagem) return;
    const nomePj = primeiroNome(pj?.nome);   // o log usa o primeiro nome (27/09/2026)
    const difEntry = (window.D20_DIF_LABEL || {})[rolagem.dificuldade];
    const difEfetiva = difEntry ? (en ? difEntry.en : difEntry.pt) : rolagem.dificuldade;
    // Com magia de dificuldade ativa, o log mostra de onde saiu: "Médio → Fácil".
    const escEntry = rolagem.dificuldade_escolhida && rolagem.dificuldade_escolhida !== rolagem.dificuldade
      ? (window.D20_DIF_LABEL || {})[rolagem.dificuldade_escolhida] : null;
    const difLbl = escEntry ? `${en ? escEntry.en : escEntry.pt} → ${difEfetiva}` : difEfetiva;
    /* "Galadar usou furtividade, mas falhou." (27/09/2026). A dificuldade
       sai da frase e fica no meta (dificuldade, dificuldade_escolhida). */
    void difLbl;
    const hab = String(rolagem.nome || '').toLocaleLowerCase(en ? 'en-US' : 'pt-BR');
    const texto = en
      ? (res.sucesso ? `${nomePj} used ${hab} and succeeded.` : `${nomePj} used ${hab}, but failed.`)
      : (res.sucesso ? `${nomePj} usou ${hab} e teve sucesso.` : `${nomePj} usou ${hab}, mas falhou.`);
    /* Magia "para o próximo teste" (Avaliação, Faro…) some depois dele — só a
       que valia NESTA habilidade (consumirMagiasDoTeste, 01-core). */
    const ativasAntes = (pj.estado_atual && pj.estado_atual.magias_ativas) || [];
    const ativasDepois = (typeof consumirMagiasDoTeste === 'function')
      ? consumirMagiasDoTeste(ativasAntes, { nome: rolagem.nome, grupo: rolagem.grupo }, magiasByKey)
      : ativasAntes;
    if (ativasDepois.length !== ativasAntes.length) {
      salvarEstadoAtual({ ...(pj.estado_atual || {}), magias_ativas: ativasDepois });
    }
    registrarEventoMesa('teste', texto, {
      habilidade: rolagem.nome,
      dificuldade: rolagem.dificuldade,
      ...(rolagem.dificuldade_escolhida && rolagem.dificuldade_escolhida !== rolagem.dificuldade
        ? { dificuldade_escolhida: rolagem.dificuldade_escolhida } : {}),
      qualidade: res.q,
      qualidade_label: en ? res.en : res.pt,
      d20: res.d20,
      sucesso: res.sucesso,
    });

    /* Era um teste DA BANCADA: o resultado vira item em construção (ou só o
       material gasto). A conta inteira é de 01-core/fabricacao.jsx. */
    if (rolagem.receita && typeof window.fabricar === 'function') {
      const r = window.fabricar(
        itensPj, rolagem.receita, pj.habilidades || {}, res.sucesso,
        dataJogoDaMesa, undefined,
      );
      const cat = catalogoBySlug[rolagem.receita.resultado_slug];
      const nome = cat ? cat.nome : rolagem.receita.resultado_slug;
      if (!r.ok) {
        setFabResultado({ ok: false, nome, motivo: r.motivo });
      } else {
        salvarItensFicha(r.itens);
        setFabResultado({ ok: true, sucesso: r.sucesso, nome });
        const frase = en
          ? (r.sucesso ? `${nomePj} started crafting ${nome}.` : `${nomePj} tried to craft ${nome} and lost the materials.`)
          : (r.sucesso ? `${nomePj} começou a fabricar ${nome}.` : `${nomePj} tentou fabricar ${nome} e perdeu o material.`);
        registrarEventoMesa('item', frase, { receita: rolagem.receita.resultado_slug, sucesso: r.sucesso });
      }
    }
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
  /* Resistência de UMA peça (15/09/2026): "quero poder escolher qual parte da
     armadura vou remover a resistência". A durabilidade mora na instância do
     item (`res`), então é lá que se grava — a barra da ficha é só a soma. */
  const ajustarResistenciaDaPeca = (instanceId, novoValor) => {
    if (!podeEditarEstado || !pj) return;
    const itens = pj.inventario?.itens || [];
    const alvo = itens.find((it) => it.instanceId === instanceId);
    if (!alvo) return;
    const max = Number(catalogoBySlug[alvo.slug]?.resistencia) || 0;
    const v = Math.max(0, Math.min(max, Math.round(Number(novoValor) || 0)));
    salvarItensFicha(itens.map((it) => (it.instanceId === instanceId ? { ...it, res: v } : it)));
  };
  /* EXPERIÊNCIA (17/09/2026). A barra de Estágio é a única do conjunto que NÃO
     mora em estado_atual: o XP é coluna da tabela (personagens.experiencia), e
     é ela que o popover grava. Sem debounce — clicar de novo antes do update
     anterior voltar é raro aqui (XP se concede uma vez, não é dano em cascata),
     e o valor gravado é absoluto, então o último clique manda de qualquer jeito.

     Subir de estágio vira linha EM DESTAQUE na mesa. O disparo morava no
     DarExperienciaModal (08-personagens), que saiu junto com o botão do card;
     veio para cá inteiro porque é aqui que a experiência muda agora. */
  const salvarExperiencia = async (xpNovo) => {
    if (!podeEditarEstado || !pj) return;
    const xpAntes = Number(pj.experiencia) || 0;
    const xp = Math.max(0, Math.round(Number(xpNovo) || 0));
    if (xp === xpAntes) return;
    const id = pj.id;
    setPj((prev) => (prev && prev.id === id ? { ...prev, experiencia: xp } : prev)); // otimista
    const { error: err } = await supabaseClient
      .from('personagens').update({ experiencia: xp }).eq('id', id);
    if (err) {
      console.error('[xp] update falhou:', err);
      setEqErro(err.message);
      setPj((prev) => (prev && prev.id === id ? { ...prev, experiencia: xpAntes } : prev));
      return;
    }
    const estAntes = calcEstagio(xpAntes);
    const estDepois = calcEstagio(xp);
    // Só sobe: descer de estágio não vira festa.
    if (estDepois > estAntes) {
      const nomeCompleto = primeiroNome(pj.nome);   // o log usa o primeiro nome (27/09/2026)
      registrarEventoMesa('sistema',
        en ? `${nomeCompleto} reached stage ${estDepois}!`
           : `${nomeCompleto} alcançou o estágio ${estDepois}!`,
        { destaque: true, icone: 'ti-star', pj_id: id, estagio_de: estAntes, estagio_para: estDepois });
    }
  };

  const aplicarEstado = (scope, key, val) => {
    if (!podeEditarEstado || !pj) return;
    if (scope === 'estagio') { salvarExperiencia(val); return; }
    const base = pj.estado_atual || {};
    const novo = {
      ...base,
      vitalidade: { ...(base.vitalidade || {}) },
      condicoes: { ...(base.condicoes || {}) },
    };
    // Frio e Calor são os dois lados da Temperatura (−100 frio … +100 calor).
    if (scope === 'cond' && key === 'frio') novo.condicoes.termorregulacao = -Math.max(0, val);
    else if (scope === 'cond' && key === 'calor') novo.condicoes.termorregulacao = Math.max(0, val);
    else if (scope === 'cond') novo.condicoes[key] = val;
    // A barra de EH mostra própria + montaria; grava-se só a do personagem.
    else if (key === 'eh' && ehDaMontaria > 0) novo.vitalidade.eh = Math.max(0, val - ehDaMontaria);
    else novo.vitalidade[key] = val;
    salvarEstadoAtual(novo);
  };
  /* STATUS PERSISTENTE (17/09/2026) — a metade "fora da batalha". Grava em
     estado_atual.status, que é o mesmo lugar de onde montarSnapshots puxa os
     efeitos ao começar o combate seguinte. */
  const dataJogoDaMesa = (historiaPj && historiaPj.data_jogo_atual) || null;
  const adicionarStatus = (bruto, dias) => {
    if (!podeEditarEstado || !pj || !bruto) return;
    const comPrazo = window.statusComVencimento(bruto, dataJogoDaMesa, dias);
    const lista = window.comStatusPersistente(pj.estado_atual && pj.estado_atual.status, comPrazo);
    salvarEstadoAtual({ ...(pj.estado_atual || {}), status: lista });
  };
  /* Atividade (24/09/2026). O jogador mexe no próprio personagem, o Mestre em
     qualquer um da mesa. Grava a atividade INTEIRA, sem as horas de sono que
     sobraram: trocar de atividade ou acordar zera o ciclo de 8h. */
  const podeEscolherAtividade = !!isMestre || (!!pj && !!currentUserId && pj.user_id === currentUserId);
  const definirAtividade = (tipo) => {
    if (!podeEscolherAtividade || !pj) return;
    const antes = (pj.estado_atual && pj.estado_atual.atividade && pj.estado_atual.atividade.tipo) || null;
    if (antes === (tipo || null)) return;
    salvarEstadoAtual({ ...(pj.estado_atual || {}), atividade: tipo ? { tipo, horas_sono: 0 } : null });
    const texto = window.textoEventoAtividade && window.textoEventoAtividade(pj.nome, antes, tipo, en);
    if (texto && historiaPj && historiaPj.id && typeof supabaseClient.rpc === 'function') {
      supabaseClient.rpc('registrar_evento_mesa', {
        p_historia_id: historiaPj.id, p_tipo: 'sistema', p_texto: texto,
        p_meta: { atividade: { de: antes, para: tipo || null } },
      }).then(({ error: e }) => { if (e) console.error('[ficha] registrar atividade falhou:', e); });
    }
  };
  const removerStatus = (id) => {
    if (!podeEditarEstado || !pj) return;
    const lista = window.semStatusPersistente(pj.estado_atual && pj.estado_atual.status, id);
    salvarEstadoAtual({ ...(pj.estado_atual || {}), status: lista });
  };

  const abrirEdicaoBarra = (item, scope, anchor) => {
    if (!podeEditarEstado) return;
    if ((item.max ?? 0) === 0) return; // sem armadura / KA sem karma — nada a editar
    if (item.semEdicao) return;          // derivada das peças (resistência da armadura)
    /* `edit` (Estágio): o que a barra DESENHA não é o que o popover EDITA —
       a barra mostra o progresso dentro do estágio, o popover mexe no XP
       total. Quem não traz `edit` continua editando o próprio val/max. */
    setEditBar({ item: item.edit ? { ...item, ...item.edit } : item, scope, anchor });
  };

  // Armadura (AR): pool de absorção. Usa campo derivado se existir;
  // senão, soma a absorção das peças equipadas (escudos incluídos).
  const _d = ficha.derivadas || {};
  const absorcaoEquipada = (pj.inventario?.itens || []).reduce((soma, it) => {
    const cat = (it && (it.slot || it.vestido)) ? catalogoBySlug[it.slug] : null;
    return soma + (cat ? absorcaoDaPeca(it, cat) : 0);
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
  // Sem o número no rótulo (14/09/2026, a pedido do usuário); o tooltip
  // continua dizendo em qual estágio o personagem está e quanto falta.
  /* A BARRA MOSTRA O PROGRESSO DENTRO DO ESTÁGIO, MAS O QUE SE EDITA É O XP
     TOTAL (17/09/2026): "ao clicar sobre a barra de experiência dentro da ficha
     o mestre será capaz de aumentar e diminuir a experiência como as outras
     barras". Se o popover trabalhasse no val/max da barra, o Mestre ficaria
     preso dentro do estágio atual — e conceder experiência é justamente o que
     faz o personagem SAIR dele. Daí o `edit`: a faixa que o popover usa, do
     zero ao teto da última faixa da tabela de estágios. */
  const xpMaximo = Math.max(xpTotal, (_estagiosTbl[_estagiosTbl.length - 1] || { max: 0 }).max || 0);
  const estagioBars = [{
    key: 'estagio',
    /* "Onde está escrito 'Estágio' deve ser 'Experiência'" (usuário,
       17/09/2026). A barra mede o XP dentro do estágio e é por ela que o
       Mestre concede experiência — o estágio em si é o NÚMERO, que aparece ao
       lado do nome no card. O rótulo agora diz o que se lê e o que se edita. */
    label: (en ? 'Experience' : 'Experiência'),
    val: estagioXpAtual,
    max: estagioSpan,
    edit: { val: xpTotal, min: 0, max: xpMaximo },
    // "133/ o valor para completar o próximo estágio" (23/10/2026).
    teto: faixaEstagio.max,
    tip: (en ? `Stage ${estagioNum} — ${estagioFaltaPct}% left` : `Estágio ${estagioNum} — ${estagioFaltaPct}% para o estágio ${estagioNum+1}`),
    color: corNivelBarra(estagioPct),
    icon: 'ti-star',
  }];
  // Sem balão (23/10/2026, pedido do usuário): o número já está à direita.
  const elEstagio = <FichaVitBars bars={estagioBars} scope="estagio" semNome numero onEdit={podeEditarEstado ? abrirEdicaoBarra : undefined} en={en} />;

  // Estado atual salvo (valor corrente das barras) — separado do máximo derivado.
  const _est   = pj.estado_atual || {};
  const _vitAt = _est.vitalidade || {};
  const _condAt = _est.condicoes || {};
  const _clampVal = (v, mx, mn = 0) => {
    const n = Math.round(Number(v));
    return Math.max(mn, Math.min(mx, Number.isFinite(n) ? n : mx));
  };

  /* A CARGA SAIU DA FICHA (26/10/2026, pedido do usuário: "remova a barra de
     peso da ficha, pois ela já aparece no inventário"). A conta é a mesma —
     window.calcCarga —, e quem a mostra agora é só o trilho do Inventário. */

  // Barras de vitalidade. MÁXIMO derivado (calcularFicha); ATUAL editável
  // em estado_atual.vitalidade. Sem valor salvo → começa cheio (atual = máximo).
  // Ordem casa com a cascata de dano em batalha: EH → AR → EF, + Karma.
  const maxEF = Number(_d.energiaFisica) || 0;
  const maxEH = Number(_d.energiaHeroica) || 0;
  const maxKA = Number(_d.karmamax) || 0;
  // Animais do personagem (aba Animais, 14/09/2026): toda instância do
  // inventário vinculada a uma criatura. Sem nenhum, a aba não aparece.
  const animaisPj = (window.animaisDoPersonagem || (() => []))(pj.inventario?.itens, catalogoBySlug, criaturasDosAnimais);
  if ((animaisPj.length > 0) !== temAnimais) setTemAnimais(animaisPj.length > 0);
  /* EH DA MONTARIA NA FICHA (15/09/2026): "Quando um jogador monta em um
     animal, a EH do animal é somada à sua" — na batalha e na ficha. Fora de
     combate o animal não gasta EH, então entra cheia: a barra mostra
     própria + montaria, no atual e no máximo. O que se grava continua sendo só
     a EH do personagem — aplicarEstado desconta a parte do animal. */
  const montariaAtual = animaisPj.find((a) => a.instancia.montado && a.criatura.montaria === true) || null;
  const ehDaMontaria = montariaAtual ? Math.max(0, Number(montariaAtual.criatura.energia_heroica) || 0) : 0;
  const vitBars = [
    // A EF vai até −15 (a morte, EF_MORTE da batalha): em 0 o personagem desmaia.
    { key: 'ef', label: en ? 'Physical Energy' : 'Energia Física', nomeCurto: en ? 'Physical' : 'Física', color: FICHA_VIT_COLORS.ef,
      val: _clampVal(_vitAt.ef ?? maxEF, maxEF, EF_PISO), min: EF_PISO, max: maxEF, icon: 'ti-heart' },
    { key: 'eh', label: en ? 'Heroic Energy' : 'Energia Heroica', nomeCurto: en ? 'Heroic' : 'Heroica', color: FICHA_VIT_COLORS.eh,
      val: _clampVal(_vitAt.eh ?? maxEH, maxEH) + ehDaMontaria, max: maxEH + ehDaMontaria, icon: 'ti-bolt',
      ...(ehDaMontaria > 0 ? { tip: en
        ? `Includes ${ehDaMontaria} from ${montariaAtual.criatura.nome} (mount).`
        : `Inclui ${ehDaMontaria} de ${montariaAtual.criatura.nome} (montaria).` } : {}) },
    /* A barra de Armadura (resistência + absorção) SAIU em 15/09/2026:
       "pode remover a barra de defesa e resistência que fica debaixo de
       energia heroica. O personagem vai acompanhar sua defesa e resistência
       nos slots." Cada peça mostra a própria durabilidade na casa do corpo,
       e é lá que o Mestre a gerencia agora (ver o menu da peça). */

    // KA com teto 0 não é "karma gasto", é karma INEXISTENTE: a fórmula zera
    // o pool quando a Aura do PJ é menor que 1. Sem esta explicação o Mestre
    // clica na barra e nada acontece — foi o relato de 03/09/2026 ("não
    // consigo alterar o karma do Yuldrous"). Desde 08/09/2026 a Aura não é
    // mais derrubada por condição: só o valor de ficha manda, e o bônus de
    // Hidratação/Sobriedade não ressuscita um poço que não existe.
    { key: 'ka', label: en ? 'Karma' : 'Karma', nomeCurto: 'Karma', color: FICHA_VIT_COLORS.ka, val: _clampVal(_vitAt.ka ?? maxKA, maxKA), max: maxKA, icon: 'ti-sparkles',
      tip: maxKA === 0
        ? (en ? 'No Karma: this character’s Aura is below 1.'
              : 'Sem Karma: a Aura deste personagem é menor que 1.')
        : undefined },
  /* Guerreiro e Ladino não têm Karma (15/09/2026, decisão do usuário): eles
     não conjuram, e a barra só ocupava espaço com um poço que nunca é usado.
     Some da ficha em vez de aparecer vazia. */
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
  // ── Helpers de cor especializados por condição ─────────────────────────────
  // Cada função recebe o valor bruto e retorna uma cor CSS interpolada.

  // (corPesoCarga saiu em 15/09/2026: Peso passou a usar a régua de nível
  //  roxo/branco/verde, igual às barras de vitalidade.)

  // Temperatura: baixo(-COND_LIMITE) = azul claro, meio(0) = verde, alto(+COND_LIMITE) = vermelho.
  // val = valor bruto no intervalo [-limite..+limite].
  const corTemperatura = (val, limite) => {
    const lim = Math.max(1, limite ?? 50);
    const t = Math.max(-1, Math.min(1, (val ?? 0) / lim)); // -1..+1
    if (t <= 0) {
      // -1 = azul claro, 0 = verde
      const u = t + 1; // 0..1 (u=0 azul, u=1 verde)
      const r = Math.round(u * 34);
      const g = Math.round(100 + u * 97);
      const b = Math.round(220 - u * 181);
      return `rgb(${r},${g},${b})`;
    } else {
      // 0 = verde, +1 = vermelho
      const u = t; // 0..1
      const r = Math.round(u * 204);
      const g = Math.round(197 - u * 163);
      const b = Math.round(0);
      return `rgb(${r},${g},${b})`;
    }
  };

  // Sobriedade (euforia): baixo → verde, alto → vermelho (gradiente direto sem sinal).
  // val = valor bruto, faixa: -COND_LIMITE..+COND_LIMITE.
  // "baixo" = negativo/alterado = verde; "alto" = positivo/sóbrio = vermelho (conforme spec).
  const corSobriedade = (val, limite) => {
    const lim = Math.max(1, limite ?? 50);
    // Mapeia [-lim..+lim] → [0..1] onde 0 = verde, 1 = vermelho.
    const t = Math.max(0, Math.min(1, ((val ?? 0) + lim) / (lim * 2)));
    const r = Math.round(t < 0.5 ? (t * 2) * 160 : 160 + (t - 0.5) * 2 * 94);
    const g = Math.round(t < 0.5 ? 160 - (t * 2) * 30 : 130 - (t - 0.5) * 2 * 130);
    const b = 0;
    return `rgb(${r},${g},${b})`;
  };

  /* A barra de Peso foi para a DIREITA, com as outras, e se chama Pesado
     (27/09/2026). O painel da esquerda que só a mostrava sai junto. */
  const combatBars = [];
  const elCombate = <FichaVitBars bars={combatBars} scope="combate" en={en} onHover={abrirTip} onHoverEnd={fecharTip} />;

  /* AS BARRAS DE VITALIDADE da direita (27/09/2026): "Agora as barras vão de
     0 a 100. 0 é o mundo ideal e 100 é o pior cenário. Todas as barras de
     vitalidade são roxas." Nomes do mal: Doença, Sono, Sede, Fome, Frio,
     Calor, Vício, Loucura, Desonra, Pesado. A Temperatura (−100..+100) vira
     Frio e Calor: quando o calor chega a 0 e a temperatura cai mais, enche o
     frio, e vice-versa.
     27/09/2026: "nenhum valor pode chegar a negativo, e não precisa informar
     isso no tooltip. Se um item me protege 1 de desonra, quer dizer que o
     máximo que a barra chega é 99." A proteção das vestimentas é TETO: a barra
     mostra o gravado limitado a 100 − proteção (o mesmo de
     ficha.condicoesEfetivas), sem texto de proteção no tooltip. O editor do
     Mestre também para no teto (`edit.max`). */
  const _t = Number(_condAt.termorregulacao) || 0;
  const _prot = ficha.protecoes || {};
  const _teto = (k) => Math.max(0, 100 - (Number(_prot[k]) || 0));
  const _barra = (v, k) => _clampVal(v ?? 0, k ? _teto(k) : 100, 0);
  const _editTeto = (k) => (_teto(k) < 100 ? { edit: { max: _teto(k) } } : {});
  /* As nove condições do modelo de 26/10/2026, com as SIGLAS aprovadas
     (aparecem sob o medalhão): DOE SON SED FOM FRI CAL VIC SAN REP.
     Loucura ganhou o nome Sanidade (SAN) e Desonra virou Reputação (REP) —
     a barra segue como as demais: encher é ruim (decisão 8). O Peso saiu dos
     medalhões e virou uma barra no pé do cartão. */
  const condBars = [
    { key: 'vitalidade', sigla: 'DOE', label: en ? 'Illness' : 'Doença', val: _barra(_condAt.vitalidade, 'vitalidade'), max: 100, icon: 'ti-virus', ..._editTeto('vitalidade') },
    { key: 'animo', sigla: 'SON', label: en ? 'Sleepiness' : 'Sono', val: _barra(_condAt.animo, 'animo'), max: 100, icon: 'ti-zzz', ..._editTeto('animo') },
    { key: 'hidratacao', sigla: 'SED', label: en ? 'Thirst' : 'Sede', val: _barra(_condAt.hidratacao, 'hidratacao'), max: 100, icon: 'ti-bottle', ..._editTeto('hidratacao') },
    { key: 'nutricao', sigla: 'FOM', label: en ? 'Hunger' : 'Fome', val: _barra(_condAt.nutricao, 'nutricao'), max: 100, icon: 'ti-apple', ..._editTeto('nutricao') },
    { key: 'frio', sigla: 'FRI', label: en ? 'Cold' : 'Frio', val: _barra(Math.max(0, -_t), 'frio'), max: 100, icon: 'ti-snowflake', ..._editTeto('frio') },
    { key: 'calor', sigla: 'CAL', label: en ? 'Heat' : 'Calor', val: _barra(Math.max(0, _t), 'calor'), max: 100, icon: 'ti-sun-high', ..._editTeto('calor') },
    { key: 'euforia', sigla: 'VIC', label: en ? 'Addiction' : 'Vício', val: _barra(_condAt.euforia, 'euforia'), max: 100, icon: 'ti-pill', ..._editTeto('euforia') },
    /* LOUCURA E MÁ FAMA (26/10/2026, pedido do usuário). As duas voltaram a
       ser nomeadas pelo MAL, como as outras sete: com as barras indo de 0
       (ideal) a 100 (pior), "Sanidade 80" e "Reputação 90" liam ao contrário
       do que marcavam. A CHAVE do estado não muda (`sanidade`/`reputacao`):
       é o que está gravado em milhares de estado_atual e o que o parser de
       efeitos do catálogo casa — renomear coluna por causa de rótulo seria
       trocar o mundo de lugar para arrumar a legenda. */
    { key: 'sanidade', sigla: 'LOU', label: en ? 'Madness' : 'Loucura', val: _barra(_condAt.sanidade, 'sanidade'), max: 100, icon: 'ti-mood-angry', ..._editTeto('sanidade') },
    { key: 'reputacao', sigla: 'FAM', label: en ? 'Ill repute' : 'Má Fama', val: _barra(_condAt.reputacao, 'reputacao'), max: 100, icon: 'ti-thumb-down', ..._editTeto('reputacao') },
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
  /* Vestido guarda o slot do BANCO em peças antigas ('costas', 'corpo',
     'orelhas', 'dedos'): traduz pela mesma tabela do inventário (vesteSlotDe)
     para cair na casa certa — capa, roupa, brinco, joia (13/09/2026). */
  const _vesteSlotDe = (typeof window !== 'undefined' && window.vesteSlotDe) || ((s) => s);
  const regiaoDe = (it) => it.slot || (it.vestido ? _vesteSlotDe(it.vesteSlot) : null);
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

  /* `regiaoModal` separa DUAS coisas que eram uma só (28/10/2026): a região
     que a casa DESENHA e a região que o clique ABRE.

     A mão precisava disso. A casa desenha `mao_d` ou `mao_e` — a arte da mão
     vazia é um par, e cada lado tem a sua (arteDoSlot). Mas a REGIÃO, no
     vocabulário de equipamento, é `mao`, com duas casas: é assim que
     `regiaoCanonicaDe` mapeia a arma equipada e `regiaoDoCatalogo` mapeia a
     que está no bolso. Abrindo `mao_e`, a janela procurava ocupantes e
     candidatos numa região que ninguém usa — e abria vazia, sem a arma que
     estava ali e sem oferecer nada do inventário. */
  /* `oca` CHEGA DE FORA (28/10/2026). Quem sabe se a região tem peça e se o
     inventário tem o que oferecer é `regiaoSemNada`, lá embaixo — e ela
     depende de `itensDaRegiao`/`candidatosDaRegiao`, declarados DEPOIS desta
     função. Calcular aqui dentro estourava a zona morta do `const` no
     primeiro render ("Cannot access 'itensDaRegiao' before initialization").
     Quem monta a casa já está depois das declarações e sabe responder. */
  const fpSlotTile = (regiao, it, key, regiaoModal, oca) => {
    const cat = it ? catalogoBySlug[it.slug] : null;
    // filled = há item no slot. Mesmo sem cat (slug ausente do catálogo / dado legado),
    // o slot é considerado preenchido para não esconder itens equipados.
    const filled = !!it;
    const catOk = filled && !!cat;
    const abs = catOk ? absorcaoDaPeca(it, cat) : 0;
    // Sagração da peça (15/09/2026): o tooltip mostra o total e o bônus à parte.
    const bonusSag = catOk ? bonusDoItem(it) : 0;
    const comBonus = (base) => (bonusSag > 0 ? `${Number(base) + bonusSag} (+${bonusSag})` : base);
    /* Resistência (durabilidade) da peça — mesma barra do inventário.

       É na ficha que o jogador olha a armadura antes de entrar em combate,
       então é aqui que precisa dar pra ver o que está prestes a arrebentar.
       Zerada, a peça para de bloquear (ver aplicarDanoCascata). */
    const resMax = catOk ? (Number(cat.resistencia) || 0) : 0;
    const resAtual = (resMax > 0 && Number.isFinite(Number(it && it.res)))
      ? Math.max(0, Math.min(resMax, Number(it.res)))
      : resMax;
    const resPct = resMax > 0 ? Math.round((resAtual / resMax) * 100) : 0;
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
    const bg = arteDoSlot(regiao, catOk ? cat : null, pj && pj.profissao) || itemBg || regionBg;
    const ghost = !filled && !!bg;   // casa vazia exibindo a arte do tipo de peça
    /* SÓ O NOME NO BALÃO (26/10/2026, pedido do usuário: "no tooltip dos
       slots do card 'equipamentos' não precisa mostrar a descrição do item,
       nem a quantidade de slot. Mostre apenas o nome do item, ou o nome do
       slot"). A casa é um alvo de 72px e o balão vinha com descrição, dano,
       absorção e resistência — um painel inteiro por cima do boneco só para
       dizer o que a pintura já diz. Quem quer os números abre a casa.
       Casa vazia ganha balão também: o nome da região, que é o que ela é. */
    /* Sem peça e sem nada a oferecer, a casa vira leitura: o balão explica, e
       o clique não leva a janela nenhuma. */
    const ocaAqui = !filled && !!oca;
    const tipContent = ocaAqui
      ? { title: lbl, desc: en ? 'Nothing in the inventory fits here' : 'Nada no inventário cabe aqui' }
      : { title: (filled && cat) ? (cat.nome || it.slug) : lbl };
    return (
      <button
        key={key}
        type="button"
        disabled={ocaAqui}
        className={'inv-slot' + (filled ? ' filled' : ' empty')
          + (ocaAqui ? ' is-oca' : '')
          + (filled && bg ? ' has-img' : '')
          + (ghost ? ' bg-ghost' : '')}
        style={{
          ...fpItemBgStyle(bg, ghost),
          ...(!podeEditarInv ? { cursor: 'default' } : {}),
        }}
        /* Clicar na casa abre o MODAL DA REGIÃO (26/10/2026, pedido do
           usuário): as casas da região e as ações da peça escolhida. A casa
           VAZIA também abre, e lá dentro ela oferece o que do inventário cabe
           ali — antes o clique não fazia nada e a janela só dizia "equipe uma
           pelo Inventário". Dentro do próprio modal, o clique só troca a peça
           em foco. */
        onClick={(podeEditarInv && !ocaAqui) ? (ev) => {
          fecharTip();
          if (regiaoAberta) { setPecaNoModal(it ? it.instanceId : CASA_VAZIA); return; }
          setRegiaoRect(ev.currentTarget.getBoundingClientRect());
          setRegiaoAberta(regiaoModal || regiao);
          setPecaNoModal(it ? it.instanceId : CASA_VAZIA);
        } : undefined}
        onMouseEnter={(e) => abrirTip(e, tipContent)}
        onMouseLeave={fecharTip}
        onFocus={(e) => abrirTip(e, tipContent)}
        onBlur={fecharTip}>
        {!bg && (
        <span className="inv-slot-ic">
          <i className={'ti ' + iconClass} aria-hidden="true" />
        </span>
        )}
        {/* A CASA VAZIA NÃO SE NOMEIA (26/10/2026, pedido do usuário):
            "Remova a palavra 'cabeça' que está no slot cabeça acima da imagem
            da ficha do personagem." O nome da região era escrito DENTRO da
            casa, por cima da silhueta esmaecida — e a legenda .fp3-nomr logo
            abaixo já diz a mesma coisa, sem tapar a pintura. Sobra no meta só
            o nome da PEÇA, e só quando ela não tem arte própria. */}
        <span className="inv-slot-meta">
          {filled && !bg && <span className="inv-slot-item">{nomeLbl}</span>}
        </span>
        {filled && podeEditarInv && (
          <span className="fp-slot-x" aria-hidden="true"><i className={'ti ' + (isCont ? 'ti-moneybag' : (it.vestido ? 'ti-shirt-off' : 'ti-shield-off'))} /></span>
        )}
        {/* O +N DA SAGRAÇÃO, À VISTA (28/10/2026, pedido do usuário: "a
            informação que a arma está +5 precisa acompanhar o item para o
            personagem ver que a arma dele foi melhorada"). O balão já dizia,
            mas balão pede hover — e quem ganhou uma arma sagrada não sabe
            disso olhando o boneco. */}
        {bonusSag > 0 && <span className="inv-selo-bonus" aria-hidden="true">+{bonusSag}</span>}
        {/* A BARRA DE RESISTÊNCIA SAIU DO ÍCONE (26/10/2026, pedido do
            usuário: "remova a linha branca que representa a resistência de um
            item do ícone no slot"). O número não se perdeu: está no tooltip da
            casa (tipContent, acima) e no painel do item, ao lado de ocupa e
            absorção — lugares onde ele é lido, e não onde atravessa a
            pintura. */}
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
  const temHab = catalogoHab.length > 0;
  const temMag = catalogoMag.length > 0;
  const temTec = catalogoTec.length > 0;
  const temTriad = temHab || temMag || temTec;
  // Quantos cartões da tríade vão aparecer (1, 2 ou 3) — usado para o
  // grid se reequilibrar e preencher a linha toda quando algum setor
  // (ex.: Magias, em PJ sem magia) não tiver conteúdo.
  const triCount = [temHab, temMag, temTec].filter(Boolean).length;

  // As gemas do Resumo (27/10/2026) — ver FichaGemas.
  // Tubos e medalhões sem balão (23/10/2026, pedido do usuário); o valor segue no aria-label.
  const elVit = <FichaGemas bars={vitBars} scope="vit" onEdit={podeEditarEstado ? abrirEdicaoBarra : undefined} en={en} />;

  // As condições viraram medalhões (23/10/2026): o roxo é o do próprio
  // medalhão, e a régua de cor por condição (corCondicao) deixaram de valer aqui.
  /* MAGIAS ATIVAS (degrau 3, 12/09/2026). Magia de duração de calendário
     evocada fora de combate fica aqui, com a data em que vence — e vale na
     próxima batalha.

     Sem esta lista o jogador não sabe o que ainda está ativo nele: a magia
     duraria no escuro, e "por que minha coluna está +1?" viraria suporte.

     Filtra na LEITURA contra a data do jogo, nunca por rotina de fundo: nada
     avança a data sozinho, e um bônus que dependesse de um processo para
     vencer nunca venceria. */
  const magiasAtivas = (typeof magiasAtivasVigentes === 'function')
    ? magiasAtivasVigentes(
        (pj.estado_atual && pj.estado_atual.magias_ativas) || [],
        historiaPj && historiaPj.data_jogo_atual)
    : [];

  const elCond = (
    <div className="fp-cond-vit">
      {/* Os medalhões do Resumo (23/10/2026) — ver FichaMedalhoes. */}
      <FichaMedalhoes bars={condBars} scope="cond" onEdit={podeEditarEstado ? abrirEdicaoBarra : undefined} en={en} />
      {/* OS STATUS ATIVOS VOLTARAM A TER CASA (26/10/2026). Eles moravam no
          card "Status", que saiu a pedido do usuário — e saíram junto, sem
          que ninguém pedisse: o Mestre aplicava Envenenado pelo círculo do
          trilho e a ficha não dizia mais que o personagem estava envenenado.
          Condições é o lugar certo: é a mesma pergunta ("o que está pegando
          neste personagem agora?"), e as magias ativas já respondiam a ela
          logo abaixo. */}
      <FichaStatusPainel
        lista={pj.estado_atual && pj.estado_atual.status}
        dataJogo={dataJogoDaMesa}
        podeEditar={podeEditarEstado}
        lang={lang}
        onRemover={removerStatus}
      />
      {magiasAtivas.length > 0 && (
        <div className="fp-magias-ativas">
          <div className="fp-magias-ativas-tit">
            <i className="ti ti-sparkles" aria-hidden="true" />
            {en ? 'Active spells' : 'Magias ativas'}
          </div>
          {magiasAtivas.map((a) => (
            <div key={a.key} className="fp-magia-ativa">
              <span>{a.nome} {en ? 'lv' : 'nv'} {a.nivel}</span>
              <span className="fp-magia-ativa-ate">
                {/* "Para o próximo teste" não tem data: vale um teste e some. */}
                {a.consome_em === 'teste_habilidade'
                  ? (en ? 'until the next test' : 'até o próximo teste')
                  : <>{(en ? 'until ' : 'até ')}
                      {(typeof formatarDataFantasy === 'function')
                        ? formatarDataFantasy(a.vence_em, lang) : ''}</>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const elDefesa = fpBodyGrid();




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

  /* ── O BONECO DE ARMAR (26/10/2026, modelo aprovado pelo usuário) ──────────
     Duas colunas de regiões ladeiam o retrato: à esquerda os ADORNOS E
     VESTES (rosto, orelha, pescoço, costas, peito, dedo, pulso, alforje), à
     direita o EQUIPAMENTO (cabeça, ombro, dorso, braço, perna, canela,
     cintura, pé). Cada região é UMA casa com o contador ocupadas/casas; o
     clique abre o diálogo com as casas da região (regiaoAberta). Embaixo,
     as mãos com o SAQUE RÁPIDO: casa grande + reserva esmaecida + o fecho ⇄
     (trocarSaqueRapido, 01-core) na junção. */
  const REGIOES = (typeof REGIOES_EQUIP !== 'undefined' ? REGIOES_EQUIP : null) || window.REGIOES_EQUIP || {};
  const _slotCanon = (typeof slotCanonico !== 'undefined' ? slotCanonico : null) || window.slotCanonico || ((s) => s);
  const _trocarSaque = (typeof trocarSaqueRapido !== 'undefined' ? trocarSaqueRapido : null) || window.trocarSaqueRapido || null;
  const regiaoCanonicaDe = (it) => {
    if (!it) return null;
    if (it.slot) {
      const s = it.slot;
      if (s === 'mao_d' || s === 'mao_e' || s === 'maos') return 'mao';
      if (s === 'saque_d' || s === 'saque_e') return 'saque';
      if (s === 'peito') return 'dorso';   // peitoral gravado com o slot antigo
      const c = _slotCanon(s);
      return (c === 'mao_d' || c === 'mao_e') ? 'mao' : c;
    }
    if (it.vestido) return _vesteSlotDe(it.vesteSlot) || null;
    return null;
  };
  const itensDaRegiao = (reg) => itensPj.filter((it) => regiaoCanonicaDe(it) === reg);
  /* ── O QUE CABE NESTA CASA (26/10/2026, pedido do usuário) ────────────────
     "Se o usuário clicar em um slot vazio, mostre os itens que podem ser
     adicionados ali que estão no inventário do personagem."

     A região de um CANDIDATO sai do catálogo (`slot_equip`), não da
     instância — ele ainda não está vestido, então não tem `slot` nem
     `vesteSlot` para consultar. O resto é o mesmo recorte que o inventário
     usa para "pode equipar": peça livre, no bolso do personagem, e não à
     venda nem pendurada num bicho. */
  const regiaoDoCatalogo = (cat) => {
    if (!cat || !cat.slot_equip) return null;
    const s = cat.slot_equip;
    if (s === 'maos' || s === 'mao_d' || s === 'mao_e') return 'mao';
    if (s === 'peito' && String(cat.categoria_equip || '') === 'armadura') return 'dorso';
    const c = _slotCanon(s);
    return (c === 'mao_d' || c === 'mao_e') ? 'mao' : c;
  };
  /* ── CASA VAZIA SEM NADA PARA OFERECER NÃO ABRE (28/10/2026) ───────────
     "Quando não há itens no inventário, não deve ser possível clicar no slot
     para procurar itens." (usuário)

     A janela da casa vazia É o seletor: ela mostra o que do inventário cabe
     ali. Sem candidato nenhum ela abria assim mesmo — e abria OCA, porque a
     lista de oferta só nasce quando há o que oferecer. Um clique que leva a
     uma janela vazia é pior que um clique que não acontece.

     A trava vale só para a região VAZIA: havendo peça nela, a janela tem o
     que mostrar (a peça, Detalhes, Desequipar) mesmo sem candidato — e aí o
     clique continua valendo. */
  const regiaoSemNada = (reg) => {
    if (!podeEditarInv) return false;
    if (itensDaRegiao(reg).length) return false;          // há peça: a janela serve
    return candidatosDaRegiao(reg).length === 0;          // e não há o que oferecer
  };

  const candidatosDaRegiao = (reg) => {
    const livres = (typeof itensLivres !== 'undefined' ? itensLivres : null) || window.itensLivres || ((x) => x || []);
    return livres(itensPj).filter((it) => {
      if (it.equipado || it.vestido || it.montado || it.animal_id) return false;
      return regiaoDoCatalogo(catalogoBySlug[it.slug]) === reg;
    });
  };
  /* ── POR QUE ESTA PEÇA NÃO ENTRA AGORA (28/10/2026) ────────────────────
     A oferta da casa vazia listava tudo o que cabe na REGIÃO e, no clique,
     `equiparNaRegiao` recusava calada o que não cabia na hora: um arco de
     duas mãos com o escudo na outra sumia da tela sem explicação nenhuma.

     A regra é a do Inventário (07-inventario, equipar), e as funções que
     decidem são as mesmas. Devolve o motivo em português, ou null quando
     pode. */
  const bloqueioNaRegiao = (cat, regiao) => {
    const _ehVeste = (typeof ehVestimenta !== 'undefined' ? ehVestimenta : null) || window.ehVestimenta || (() => false);
    if (regiao !== 'mao' || _ehVeste(cat)) return null;
    const _maosDe = (typeof getMaosRequeridas !== 'undefined' ? getMaosRequeridas : null)
      || window.getMaosRequeridas || (() => 1);
    const maos = _maosDe(cat, pj.raca);
    if (!maos) return en ? 'Forbidden for this race' : 'Proibida para a sua raça';
    const livres = (slotsState.mao_d ? 0 : 1) + (slotsState.mao_e ? 0 : 1);
    if (livres < maos) {
      return maos === 2
        ? (en ? 'Needs both hands free' : 'Precisa das duas mãos livres')
        : (en ? 'No free hand' : 'Nenhuma mão livre');
    }
    return null;
  };

  /* Vestir/equipar a partir da casa. Qual dos dois sistemas é o do item diz
     `ehVestimenta` (07-inventario) — e vestimenta com efeito aplica o efeito
     ao vestir, como o botão do inventário faz. */
  const equiparNaRegiao = (instanceId, regiao) => {
    if (!podeEditarInv) return;
    const itens = pj.inventario?.itens || [];
    const it = itens.find((x) => x.instanceId === instanceId);
    const cat = it && catalogoBySlug[it.slug];
    if (!it || !cat) return;
    const _ehVeste = (typeof ehVestimenta !== 'undefined' ? ehVestimenta : null) || window.ehVestimenta || (() => false);
    const veste = _ehVeste(cat);
    /* ── A MÃO É REGIÃO DE DUAS CASAS (28/10/2026) ──────────────────────
       `mao` é a região; o que se grava na instância é a CASA — `mao_d` ou
       `mao_e`. Gravar `slot: 'mao'` deixaria a arma numa casa que o resto do
       sistema (ataques, defesa, o próprio boneco) não sabe ler.

       A regra das mãos é a mesma do Inventário (07-inventario, equipar):
       direita primeiro, e arma de duas mãos só entra com as duas livres. Ela
       mora lá e aqui pelo mesmo motivo que o resto da ficha repete regra do
       inventário — são duas telas sobre o mesmo inventário —, mas as funções
       que decidem (`getMaosRequeridas`, `getSlotsState`) são as mesmas. */
    let destino = regiao;
    if (regiao === 'mao' && !veste) {
      const _maosDe = (typeof getMaosRequeridas !== 'undefined' ? getMaosRequeridas : null)
        || window.getMaosRequeridas || (() => 1);
      const maos = _maosDe(cat, pj.raca);
      if (!maos) return;                                   // proibida para a raça
      const livres = (slotsState.mao_d ? 0 : 1) + (slotsState.mao_e ? 0 : 1);
      if (livres < maos) return;                           // mãos insuficientes
      destino = !slotsState.mao_d ? 'mao_d' : 'mao_e';
    }
    salvarItensFicha(itens.map((x) => (x.instanceId !== instanceId ? x : (veste
      ? { ...x, vestido: true, vesteSlot: destino, containerId: null, casa: undefined }
      : { ...x, equipado: true, slot: destino, containerId: null, casa: undefined }))));
    if (veste && (cat.efeito_positivo || cat.efeito_negativo)) {
      const novo = aplicarEfeitosItem(pj.estado_atual, cat, 1, maximosVitalidade, dataJogoDaMesa);
      if (novo !== pj.estado_atual) salvarEstadoAtual(novo);
    }
  };

  // Uma região no trilho: contador em cima, casa única no meio, nome embaixo.
  // Região de UMA casa usa a própria casa (fpSlotTile, com menu e
  // durabilidade); as demais abrem o diálogo das casas da região.
  const fpRegiao = (regiao) => {
    const casas = REGIOES[regiao] || 1;
    const ocupantes = itensDaRegiao(regiao);
    /* Sem peça na região e sem nada no inventário que caiba nela, a casa não
       abre (28/10/2026) — a janela sairia oca. Vale para as duas formas de
       casa: a de UMA vaga, que é `fpSlotTile`, e a de VÁRIAS, que é o botão
       logo abaixo. Era só a primeira que tinha a trava, e as regiões do
       trilho — Rosto, Pulso, Alforje, Canela — são todas de várias. */
    const oca = regiaoSemNada(regiao);
    let corpo;
    if (casas === 1) {
      corpo = fpSlotTile(regiao, ocupantes[0] || null, 'reg-' + regiao, undefined, oca);
    } else {
      const primeiro = ocupantes[0] || null;
      const cat = primeiro ? catalogoBySlug[primeiro.slug] : null;
      const bg = arteDoSlot(regiao, cat, pj && pj.profissao) || FP_REGION_BG[regiao] || null;
      const vazia = ocupantes.length === 0;
      corpo = (
        <button
          type="button"
          disabled={oca}
          className={'inv-slot' + (vazia ? ' empty' : ' filled') + (oca ? ' is-oca' : '')
            + (bg ? ' has-img' : '') + (vazia && bg ? ' bg-ghost' : '')}
          style={{ cursor: oca ? 'default' : 'pointer', ...fpItemBgStyle(bg, vazia) }}
          onClick={oca ? undefined : (ev) => {
            setRegiaoRect(ev.currentTarget.getBoundingClientRect());
            setPecaNoModal((ocupantes[0] && ocupantes[0].instanceId) || null);
            setRegiaoAberta((v) => (v === regiao ? null : regiao));
          }}
          /* Só o nome da região (26/10/2026): a contagem "2/4 em uso" saiu do
             balão — ela já está no contador da própria casa. Oca, o balão
             passa a dizer o porquê de não abrir. */
          onMouseEnter={(e) => abrirTip(e, oca
            ? { title: slotLbl(regiao), desc: en ? 'Nothing in the inventory fits here' : 'Nada no inventário cabe aqui' }
            : { title: slotLbl(regiao) })}
          onMouseLeave={fecharTip}
          onFocus={(e) => abrirTip(e, oca
            ? { title: slotLbl(regiao), desc: en ? 'Nothing in the inventory fits here' : 'Nada no inventário cabe aqui' }
            : { title: slotLbl(regiao) })}
          onBlur={fecharTip}
          aria-label={`${slotLbl(regiao)} — ${ocupantes.length}/${casas}`}
          aria-expanded={regiaoAberta === regiao}
        >
          {!bg && (
            <span className="inv-slot-ic"><i className={'ti ' + (FP_REGION_ICON[regiao] || 'ti-shield-off')} aria-hidden="true" /></span>
          )}
          {/* ── O +N TAMBÉM NA REGIÃO DE VÁRIAS CASAS (28/10/2026) ──────────
              "Na ficha dos personagens está aparecendo o '+5' na arma, escudo
              e peito, mas não está aparecendo dos demais itens." (usuário)

              O selo nasceu dentro de `fpSlotTile`, que desenha a casa de UMA
              vaga — e as mãos. A região de VÁRIAS vagas desenha o próprio
              botão, aqui, e ficou sem ele: Rosto, Pulso, Dedo, Alforje e
              Canela mostravam a pintura da peça sagrada sem dizer que ela é
              sagrada. O bônus é o da peça que está à vista, que é a primeira
              — a mesma de quem deu a pintura ao botão. */}
          {bonusDoItem(primeiro) > 0 && (
            <span className="inv-selo-bonus" aria-hidden="true">+{bonusDoItem(primeiro)}</span>
          )}
        </button>
      );
    }
    return (
      <div className="fp3-regiao" key={'reg-' + regiao}>
        <span className="fp3-qtd" aria-hidden="true">{ocupantes.length}/{casas}</span>
        {corpo}
        <span className="fp3-nomr">{slotLbl(regiao)}</span>
      </div>
    );
  };

  /* ── O SAQUE RÁPIDO SAIU DO BONECO (26/10/2026, pedido do usuário) ────────
     "Remova os slots de saque rápido, não vamos usar isso mais."

     A casa da mão passa a ser UMA, ocupando a largura das duas colunas do
     trilho do seu lado e a altura de duas casas — e com isso o pé dela encosta
     no pé do retrato, que é o que faltava ("os slots com as armas não estão
     alinhados com a imagem pela base").

     O MODELO continua inteiro: `saque_e`/`saque_d` seguem no vocabulário de
     slots (01-core/inventario-helpers.jsx), com `moverParaSaque` e
     `trocarSaqueRapido` e os testes deles. O que saiu foi a casa na ficha —
     se o saque voltar a ser jogado, ele volta sem refazer a regra. */
  const fpMao = (lado) => {
    const slotMao = lado === 'e' ? 'mao_e' : 'mao_d';
    return (
      <div className="fp3-mao-grupo" key={'mao-' + lado}>
        <div className="fp3-casa fp3-casa--mao">
          {/* Desenha o lado, abre a região das duas mãos — ver fpSlotTile. */}
          {fpSlotTile(slotMao, ocupanteDefesa(slotMao, 0), 'mao-' + lado, 'mao', regiaoSemNada('mao'))}
        </div>
        <span className="fp3-nomr">{slotLbl(slotMao)}</span>
      </div>
    );
  };

  const equipRow = (
    <div className="fp2-equip-wrap fp2-panel">
      <h3 className="fp-col-tit">{en ? 'Equipment' : 'Equipamentos'}</h3>
      <div className="fp3-boneco">
        {/* trilho esquerdo: adornos e vestes */}
        <div className="fp3-trilho">
          {['rosto', 'orelha', 'pescoco', 'costas', 'peito', 'dedo', 'pulso', 'alforje'].map(fpRegiao)}
        </div>

        {/* retrato no centro — a foto do personagem preenche o vão */}
        <div className="fp2-stage fp3-retrato">
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

        {/* trilho direito: equipamento */}
        <div className="fp3-trilho">
          {['cabeca', 'ombro', 'dorso', 'braco', 'perna', 'canela', 'cintura', 'pe'].map(fpRegiao)}
        </div>

        {/* a base: as mãos com o saque rápido */}
        <div className="fp3-maos">
          {fpMao('e')}
          {fpMao('d')}
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
        <div className="fp2-panel-body fp2-vit-band">
          <h3 className="fp-col-tit">{en ? 'Energies' : 'Energias'}</h3>
          {elVit}
        </div>
      </section>
      {/* O card Status SAIU em 26/10/2026, a pedido do usuário ("remova o
          card 'status'"). Foram com ele duas coisas: a fileira DEF · VEL ·
          ABS · RFI · RFM (que vivia só aqui) e a lista de status ativos
          (FichaStatusPainel) — o seletor do trilho continua aplicando status,
          mas a ficha não os mostra mais. */}
      {/* Condições voltaram para a coluna esquerda (26/10/2026, modelo
          aprovado): o boneco de armar ocupa a coluna principal inteira. */}
      <section className="fp2-panel">
        <div className="fp2-panel-body">
          <h3 className="fp-col-tit">{en ? 'Conditions' : 'Condições'}</h3>
          {elCond}
        </div>
      </section>
    </div>
  );


  // ── Header — mesmo padrão ms-header de Convites/Batalhas/Lore: seta de
  // voltar + eyebrow + título (nome do PJ), abas como segmented control
  // (mesmo estilo de diario-subtabs: btn-primary na ativa, btn-ghost nas
  // demais) e ações (editar/excluir) à direita. Tooltip próprio dos botões
  // de navegação (substitui o title nativo do browser) — mesmo já existia.
  const tabTipLabel = (label) => (e) => abrirTabTip(e, { desc: label });
  /* MONTAR SAIU DAQUI (06/10/2026): "o botão de montar deve ser no item do
     animal no inventário" (usuário). A ação já existia lá — montarItem /
     desmontarItem (07-inventario/inventario.jsx), com a mesma regra de uma
     montaria por vez e de pilha que se divide — e ter as duas era ter duas
     chances de divergirem. */
  /* SEM CABEÇALHO NO CARTÃO (23/10/2026, "aproveite melhor a tela"): para o
     Jogador no console, o nome já está no seletor do menu, as partes da ficha
     são a gaveta Ficha e o Sair é "Trocar de personagem" no seletor. O que
     sobra — Batalha, atividade e Editar — vai para a barra de ações. O Mestre,
     olhando a ficha de outro, segue com o cabeçalho completo. */
  const cabecalhoNoMenu = !isMestre && !!onAba && !!alvoAcoes;
  /* Para onde os botões vão (26/10/2026): com a aba Ficha aberta, para a
     fileira do herói DENTRO da moldura — o modelo aprovado põe nome e botões
     dentro da ficha. Nas outras abas (Inventário, Loja, Diário) seguem na
     barra do console, como antes. */
  /* A ABA COMPANHEIROS NÃO TEM TRILHO (27/10/2026, pedido do usuário: "na
     ficha do companheiro animal, não precisamos do trilho superior").

     Ele chegou a morar dentro da moldura do bicho, no pedido da manhã, e com
     ele na tela ficou claro o que estava errado desde antes: Batalha,
     Atividade, Evoluir e Editar são ações sobre o PERSONAGEM. Em cima da
     ficha do cavalo, elas parecem ser do cavalo. Nenhuma das quatro tem o que
     fazer aqui — então a faixa some inteira, e não só muda de lugar. */
  const semTrilho = fpTab === 'animais';
  const alvoAcoesAtual = semTrilho ? null : ((fpTab === 'ficha' && slotAcoesFicha) || alvoAcoes);
  const ctrlsNaBarra = (cabecalhoNoMenu && alvoAcoesAtual) ? ReactDOM.createPortal(
    <div className="menestrel-ui mc-acao-grupo fp-ctrl-grupo">
      {onBatalha && (
        /* Só o ícone (23/10/2026, pedido do usuário); o nome no tooltip. */
        <button type="button" className="mc-acao mc-acao--batalha mc-acao--ic" data-aba-ficha="batalha" onClick={onBatalha}
          aria-label={en ? 'Battle' : 'Batalha'} {...propsTip(abrirTabTip, fecharTabTip, en ? 'Battle' : 'Batalha')}>
          <i className="ti ti-sword" aria-hidden="true" />
        </button>
      )}
      <FichaAtividadeSeletor
        atividade={pj.estado_atual && pj.estado_atual.atividade}
        podeEditar={podeEscolherAtividade}
        lang={lang}
        atributos={ficha.atributos}
        onEscolher={definirAtividade}
        treinos={pj.treinos}
        nomeDoTreino={(t) => {
          const cat = t.tipo === 'tecnica' ? tecnicasByKey[t.key] : magiasByKey[t.key];
          return (cat && cat.nome) || t.key;
        }}
      />
      {/* EVOLUIR NO TRILHO (23/10/2026): "O botão 'evoluir' que hoje existe no
          card dos personagens, vai para o trilho na ficha do personagem." Só
          aparece quando há estágio novo a distribuir (onEvoluir). */}
      {onEvoluir && (
        <button type="button" className="mc-acao mc-acao--evoluir" data-aba-ficha="evoluir" onClick={onEvoluir}>
          <i className="ti ti-trending-up" aria-hidden="true" />
          <span className="mc-acao-rotulo">{en ? 'Level up' : 'Evoluir'}</span>
        </button>
      )}
      {onEditar && (
        <button type="button" className="mc-acao" data-aba-ficha="editar" onClick={onEditar}>
          <i className="ti ti-pencil" aria-hidden="true" />
          <span className="mc-acao-rotulo">{en ? 'Edit' : 'Editar'}</span>
        </button>
      )}
    </div>,
    alvoAcoesAtual
  ) : null;
  /* A BARRA DE AÇÕES TAMBÉM PARA O MESTRE (23/10/2026): "Adicione a barra na
     ficha atualmente apenas para jogadores, para o mestre também." O Mestre
     segue com o cabeçalho de abas, mas o status e a atividade saem dele para
     a barra, ao lado dos atalhos (Habilidades, Magias, Itens). */
  // `semTrilho`: na aba Companheiros a barra some para os dois papéis — as
  // ações são do personagem, e o Mestre também não as quer sobre o bicho.
  const mestreNaBarra = isMestre && !!alvoAcoes && !semTrilho;
  const statusEl = podeEditarEstado && (
    <FichaStatusSeletor
      lista={pj.estado_atual && pj.estado_atual.status}
      dataJogo={dataJogoDaMesa}
      lang={lang}
      onAdicionar={adicionarStatus}
    />
  );
  const atividadeEl = (
    <FichaAtividadeSeletor
      atividade={pj.estado_atual && pj.estado_atual.atividade}
      podeEditar={podeEscolherAtividade}
      lang={lang}
      atributos={ficha.atributos}
      onEscolher={definirAtividade}
      treinos={pj.treinos}
      nomeDoTreino={(t) => {
        const cat = t.tipo === 'tecnica' ? tecnicasByKey[t.key] : magiasByKey[t.key];
        return (cat && cat.nome) || t.key;
      }}
    />
  );
  /* A FICHA DO MESTRE COMO A DO JOGADOR (23/10/2026): "sem o título e o menu
     sem ser no trilho" (usuário). As abas, o status, a atividade, Editar e
     Excluir moram no trilho de ações; o cabeçalho com o nome sai. */
  /* O TRILHO DE ABAS SAIU DA FICHA (26/10/2026, pedido do usuário: "o trilho
     de menu 'ficha, identificação, conhecimento, etc' deve ficar apenas no
     menu lateral esquerdo"). Ele nasceu em 23/10 porque o Mestre não tinha
     outro caminho; desde 26/10 tem — a barra lateral lista Personagens ›
     <personagem> › as seis partes (PARTES_DA_FICHA, 01-core/constants.jsx).
     Com os dois, o mesmo destino aparecia em dois lugares e cada um marcava
     a página aberta à sua maneira. */
  const abasMestreEl = null;
  const ctrlsMestreNaBarra = mestreNaBarra ? ReactDOM.createPortal(
    <div className="menestrel-ui mc-acao-grupo fp-ctrl-grupo fp-ctrl-grupo--mestre">
      {statusEl}
      {atividadeEl}
      {/* EVOLUIR NO TRILHO (23/10/2026): "O botão 'evoluir' que hoje existe no
          card dos personagens, vai para o trilho na ficha do personagem." Só
          aparece quando há estágio novo a distribuir (onEvoluir). */}
      {onEvoluir && (
        <button type="button" className="mc-acao mc-acao--evoluir" data-aba-ficha="evoluir" onClick={onEvoluir}>
          <i className="ti ti-trending-up" aria-hidden="true" />
          <span className="mc-acao-rotulo">{en ? 'Level up' : 'Evoluir'}</span>
        </button>
      )}
      {/* EDITAR E EXCLUIR SAÍRAM DAQUI (26/10/2026, pedido do usuário: "os
          botões 'editar, excluir' também"). Os dois moram na barra lateral,
          em Personagens › <personagem>, junto das partes da ficha — e é lá
          que eles pertencem: são ações SOBRE o personagem, não dentro da
          página dele. `onEditar`/`onExcluir` continuam chegando aqui porque é
          a PersonagensList quem os executa; quem os dispara agora é o menu. */}
    </div>,
    alvoAcoesAtual
  ) : null;
  const fpTabsEl = (
    <header className="ms-header ficha-page-header">
      {/* NÃO HÁ SETA DE VOLTAR (17/09/2026). Ela saiu quando o "Sair" nomeado
          entrou, voltou por um momento para o Mestre — que tinha ficado sem
          saída — e saiu de vez quando o usuário apontou o caminho certo: "o
          mestre ainda pode clicar no menu 'personagens' e voltar a seleção de
          personagens".

          Era preciso uma mudança para isso valer: clicar na seção já aberta
          não fazia nada, porque `setCurrentId` recebia o mesmo valor. Agora a
          barra lateral conta os toques e a lista do Mestre fecha a ficha
          (`voltarToken`, 08-personagens/personagens.jsx).

          O Jogador segue com o "Sair" na fileira das abas: para ele sair
          significa DESLIGAR o personagem, e isso precisa de um gesto próprio —
          "quem persiste no personagem escolhido é o jogador". */}
      <div className="fp-flex-fill">
        {/* O número do estágio, dourado, ao lado do nome saiu em 14/09/2026
            (pedido do usuário). O estágio segue em Informações → Derivadas. */}
        {/* O rótulo 'Personagem' acima do nome saiu em 22/10/2026 (Título Sozinho):
            o nome se basta, e o menu já diz que esta é a Ficha. */}
        <h2 className="ms-title" style={{ margin: 0 }}>
          {nomeCompleto}
        </h2>
      </div>
      {/* A BUSCA DA LOJA mora aqui, na linha do nome e dos botões (02/10/2026):
          "O input de buscar pode ficar inline com o nome da loja e os botões
          de controle." A LojaJogador desenha o campo neste espaço por portal. */}
      {fpTab === 'loja' && <div className="ficha-page-busca" ref={setSlotBuscaLoja} />}
      <div className="diario-subtabs" role="tablist" style={{ margin: 0 }}>
        {/* ÍCONES NO LUGAR DO TEXTO (27/09/2026): "Nos botões da ficha, vamos
            usar ícone ao invés de texto, mas use tooltip em todos." O nome
            de cada um mora no tooltip e no aria-label. */}
        {navSlot /* slot legado; a Batalha agora vem por onBatalha */}
        {onBatalha && (
          <button type="button" className="fp-tab-ic fp-tab-batalha btn-sm" data-aba-ficha="batalha"
            aria-label={en ? 'Battle' : 'Batalha'}
            {...propsTip(abrirTabTip, fecharTabTip, en ? 'Battle' : 'Batalha')}
            onClick={onBatalha}>
            <i className="ti ti-sword" aria-hidden="true" />
          </button>
        )}
        <button type="button" className={'fp-tab-ic ' + (fpTab === 'ficha' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm')} role="tab" aria-selected={fpTab === 'ficha'}
          data-aba-ficha="ficha"
          onClick={() => setFpTab('ficha')}>
          {/* ABAS COM NOME (22/10/2026): o ícone sozinho obrigava a passar o
              mouse em cada um. "Resumo" porque o cabeçalho da página já diz Ficha. */}
          <span className="fp-tab-rotulo">{en ? 'Sheet' : 'Ficha'}</span>
        </button>
        {/* O círculo de status, ao lado de "Ficha" (17/09/2026). Só o Mestre o
            vê: é ele quem aplica. Não é aba — não seleciona nada —, por isso
            fica fora do role="tab". */}
        {/* Com a barra de ações (Mestre, 23/10/2026), status e atividade
            moram nela — ver ctrlsMestreNaBarra. */}
        {!mestreNaBarra && statusEl}
        {/* A atividade (24/09/2026): Mestre e dono do personagem escolhem. */}
        {!mestreNaBarra && atividadeEl}
        {/* Texto, como as outras abas. Era ícone só, e o rótulo vivia no
            tooltip — a aba destoava das vizinhas e exigia hover pra saber o
            que era (08/09/2026). Sem tooltip: com o nome escrito, é redundante. */}
        {/* Informações virou DUAS abas em 26/09/2026: Personagem (identidade,
            atributos, complemento) e Conhecimento (habilidades, técnicas,
            magias). Ver FichaInfoView, prop `parte`. */}
        <button type="button" className={'fp-tab-ic ' + (fpTab === 'info' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm')} role="tab" aria-selected={fpTab === 'info'}
          data-aba-ficha="info"
          onClick={() => setFpTab('info')}>
          <span className="fp-tab-rotulo">{en ? 'Identity' : 'Identificação'}</span>
        </button>
        <button type="button" className={'fp-tab-ic ' + (fpTab === 'conhecimento' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm')} role="tab" aria-selected={fpTab === 'conhecimento'}
          data-aba-ficha="conhecimento"
          onClick={() => setFpTab('conhecimento')}>
          <span className="fp-tab-rotulo">{en ? 'Knowledge' : 'Conhecimento'}</span>
        </button>
        {/* Página extra dos animais (e da montaria) — só quando o PJ tem algum. */}
        {animaisPj.length > 0 && (
          <button type="button" className={'fp-tab-ic ' + (fpTab === 'animais' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm')} role="tab" aria-selected={fpTab === 'animais'}
            data-aba-ficha="animais"
            onClick={() => setFpTab('animais')}>
            <span className="fp-tab-rotulo">{en ? 'Companions' : 'Companheiros'}</span>
          </button>
        )}
        {/* Inventário e Loja saem da fileira do JOGADOR quando o console os
            oferece no menu lateral (onAba, 22/10/2026) — eram o mesmo destino
            em dois lugares. O Mestre, olhando a ficha de outro, só tem estes. */}
        {(isMestre || !onAba) && (<>
        <button type="button" className={'fp-tab-ic ' + (fpTab === 'inventario' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm')} role="tab" aria-selected={fpTab === 'inventario'}
          data-aba-ficha="inventario"
          onClick={() => setFpTab('inventario')}>
          {/* Com nome, como as outras abas (23/10/2026, "abas com nome"). */}
          <span className="fp-tab-rotulo">{en ? 'Inventory' : 'Inventário'}</span>
        </button>
        {/* FABRICAR (06/10/2026: "teremos um novo menu 'Fabricar', com todos
            os possíveis itens a serem fabricados, com sua receita"). A aba fica
            entre Inventário e Loja — é onde o material vira item, entre ter e
            comprar. Só aparece com receitas carregadas. */}
        {receitas.length > 0 && (
          <button type="button" className={'fp-tab-ic ' + (fpTab === 'fabricar' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm')} role="tab" aria-selected={fpTab === 'fabricar'}
            data-aba-ficha="fabricar"
            onClick={() => setFpTab('fabricar')}>
            <span className="fp-tab-rotulo">{en ? 'Craft' : 'Fabricar'}</span>
          </button>
        )}
        <button type="button" className={'fp-tab-ic ' + (fpTab === 'loja' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm')} role="tab" aria-selected={fpTab === 'loja'}
          data-aba-ficha="loja"
          onClick={() => setFpTab('loja')}>
          <span className="fp-tab-rotulo">{en ? 'Shop' : 'Loja'}</span>
        </button>
        </>)}
        {/* SAIR É DO JOGADOR (17/09/2026): "o botão de 'sair' não precisa
            mostrar para o mestre, pois ele não precisa selecionar o
            personagem."

            Sair quer dizer "desligar este personagem para escolher outro" — um
            gesto que só existe para quem TEM personagem ativo. Para o Mestre a
            mesma porta significa apenas fechar a ficha alheia, e para isso ele
            tem a seta neutra no canto do cabeçalho: ela voltou junto com esta
            mudança, porque sem ela o Mestre ficava sem saída nenhuma.

            Não é aba — não seleciona nada, sai da tela —, por isso fica fora
            do role="tab" e ganha a pele de saída.

            SÓ O TEXTO (20/09/2026): "remova o botão de sair, deixe apenas o
            texto 'sair'" (usuário). O que saiu foi o ÍCONE de logout — a pele
            de btn-ghost continua, que é o fundo dos outros itens da fileira
            ("está sem o fundo igual os outros menus", mesmo dia). Cheguei a
            tirar as duas coisas e ficou destoando do resto da barra. */}
        {!isMestre && (
          <button type="button" className="btn-ghost btn-sm fp-tab-sair" onClick={onVoltar}>
            {en ? 'Leave' : 'Sair'}
          </button>
        )}
        {/* A aba DIÁRIO saiu da ficha para TODOS em 12/09/2026. Primeiro do
            Jogador (virou Lugares, Personagens e Memórias na barra lateral);
            depois também do Mestre, a pedido do usuário. A liberação de lore
            para os PJs não mora aqui — é do GerenciarLoreView, na história. */}
      </div>
      {onEditar && (
        <button type="button" className="fp-tab-ic btn-ghost btn-sm" data-aba-ficha="editar"
          aria-label={en ? 'Edit' : 'Editar'}
          {...propsTip(abrirTabTip, fecharTabTip, en ? 'Edit' : 'Editar')}
          onClick={onEditar}>
          <i className="ti ti-pencil" aria-hidden="true" />
        </button>
      )}
      {onExcluir && (
        <button type="button" className="fp-tab-ic btn-danger btn-sm" data-aba-ficha="excluir"
          aria-label={en ? 'Delete' : 'Excluir'}
          {...propsTip(abrirTabTip, fecharTabTip, en ? 'Delete' : 'Excluir')}
          onClick={onExcluir}>
          <i className="ti ti-trash" aria-hidden="true" />
        </button>
      )}
    </header>
  );

  /* Atalhos (11-ficha/atalhos-ficha.jsx): pronto para escolher. Só o dono age
     pela ficha — é a mesma regra de aoEvocarMagia (podeEditarFoto) —, e só em
     Ficha/Informações: em Inventário e Loja o InventarioList guarda a própria
     cópia do inventário e do estado.

     Habilidade é o CATÁLOGO INTEIRO, não só as compradas (pedido do usuário,
     12/09/2026): "nada impede que ele faça o teste com o total negativo". O
     total de uma não comprada sai da mesma conta, só sem os pontos. Magia e
     item continuam sendo o que o PJ tem — esses não se usam sem ter. */
  const _AtalhosFicha = (typeof AtalhosFicha !== 'undefined' ? AtalhosFicha : null) || window.AtalhosFicha || null;
  const _itemUsavel = (typeof itemUsavelNoAtalho !== 'undefined' ? itemUsavelNoAtalho : null) || window.itemUsavelNoAtalho || (() => false);
  // O Mestre também tem os atalhos na barra (23/10/2026).
  const mostrarAtalhos = !!_AtalhosFicha && (podeEditarFoto || isMestre) && (fpTab === 'ficha' || fpTab === 'info' || fpTab === 'conhecimento');
  /* `descricao`, `ajuste` e `restricao` entram em 28/10/2026: a janela nova
     mostra o que a habilidade É antes de pedir a dificuldade, e esses três
     campos já estavam no catálogo — só não chegavam aqui. */
  const atalhoHabilidades = mostrarAtalhos
    ? Object.values(habsByKey).map((h) => ({
        key: h.key, nome: h.nome, grupo: h.grupo,
        descricao: h.descricao, restricao: h.restricao,
        ajuste: (window.atributoPorExtenso ? window.atributoPorExtenso(h.ajuste, lang === 'en') : h.ajuste),
        total: (_totHabCond || _totHab)(h.key, pj.habilidades || {}, atributosFinais, bonusHabilidades, habsByKey, _est.condicoes, ficha.protecoes),
      }))
    : [];
  const atalhoMagias = mostrarAtalhos
    ? Object.keys(pj.magias || {}).map((k) => magiasByKey[k]).filter(Boolean).map((m) => {
        const nivelPj = _nivelMag((pj.magias || {})[m.key]);
        return {
          key: m.key, nome: m.nome, nivel: nivelPj,
          /* 28/10/2026: a janela do atalho mostra a magia inteira e evoca dali.
             Antes o clique FECHAVA a lista e abria uma segunda janela por cima
             (MagiaDetalhesModal) — o jogador perdia o lugar e, para trocar de
             magia, reabria o atalho e procurava de novo. */
          descricao: m.descricao, alcance: m.alcance, duracao: m.duracao,
          /* Só os níveis que ele JÁ aprendeu, como na janela antiga
             (12/09/2026, usuário): os bloqueados "apareciam com cadeado e só
             ocupavam espaço". A prévia os mostrava desligados; o pedido
             explícito de antes vale mais que o desenho da prévia. */
          niveis: [1, 3, 5, 7, 9]
            .map((n) => ({ n, titulo: m['nivel_' + n], valor: m['valor_' + n] }))
            .filter((nv) => (nv.titulo || nv.valor) && nv.n <= nivelPj),
        };
      })
    : [];
  /* ── O PASSO DA MAGIA, REGRA POR REGRA (28/10/2026) ─────────────────────
     A regra fica AQUI, onde os dados moram — eu com deus e sub-raça, os
     colegas da história, os animais e os elos, o ritual, a data de jogo. A
     janela (atalhos-ficha.jsx) só desenha o que esta função devolve.

     Foi assim que o molde novo entrou sem reescrever a regra: a lista de
     alvos, o milagre bloqueado e o karma continuam calculados por uma função
     só, pelas mesmas portas de 01-core que o Mestre usa ao aprovar.

     É FUNÇÃO e não objeto porque depende do nível escolhido: bloqueioElo
     compara o estágio do animal com o nível, e o karma sai do nível evocado. */
  const magiaPassoDoAtalho = (key, nivel) => {
    const m = magiasByKey[key];
    if (!m) return null;
    const _en = lang === 'en';
    /* O id do próprio PJ, NÃO a palavra 'self' (15/09/2026): com 'self' o
       efeito não pousava e o banco recusava o alvo_id na fila do Mestre. */
    const eu = { id: pj.id, nome: pj.nome, sobrenome: pj.sobrenome, foto_url: pj.foto_url,
      profissao: pj.profissao, deus: pj.deus, subraca: pj.subraca, estado_atual: pj.estado_atual };
    const dataJogo = historiaPj && historiaPj.data_jogo_atual;
    /* ELO PERMANENTE (27/09/2026): a magia que cria elo tem como alvo os
       ANIMAIS do personagem, não os protagonistas. */
    const criaElo = !!(typeof window.magiaCriaElo === 'function' && window.magiaCriaElo(m));
    /* ALCANCE PESSOAL (27/09/2026): "Magias de uso 'pessoal' só podem ser
       usados no próprio evocador" — e, 28/10/2026, "magias de alcance pessoal
       não precisam escolher alvo": a seção de alvo nem aparece. */
    const soEmSi = /pessoal/i.test(m.alcance || '');
    /* MILAGRE (22/10/2026): vampiro, lobisomem, sem religião e a Escuridão
       não usam nem recebem milagre. Quem não pode usar vê o porquê e o rodapé
       trava; quem não pode receber sai da lista de alvos. */
    const ehMilagre = m.classe === 'Milagre';
    const _ap = window.atorMilagreDePj, _bm = window.bloqueioMilagre, _ab = window.alvoDeMilagreBloqueado;
    const bm = ehMilagre && _ap && _bm ? _bm(_ap(eu, dataJogo)) : null;
    const bloqueio = bm
      ? (window.motivoMilagreLabel ? window.motivoMilagreLabel(bm.motivo, _en) : bm.motivo)
      : null;
    /* O colega chega de get_pjs_historia com as magias ativas soltas: o
       lobisomem da Licantropia também não recebe milagre. */
    const comEstado = (c) => (c && !c.estado_atual && Array.isArray(c.magias_ativas)
      ? { ...c, estado_atual: { magias_ativas: c.magias_ativas } } : c);
    const recebeMilagre = (c) => !(ehMilagre && _ap && _ab && c && _ab(_ap(comEstado(c), dataJogo)));
    const elosAtuais = animaisPj.filter((a) => window.temElo && window.temElo(a.instancia)).length;
    /* O bloqueio do animal vira TEXTO aqui: bloqueioElo devolve código
       ('estagio_alto'), e a janela não traduz código nenhum. */
    const alvos = criaElo
      ? animaisPj.map((a) => {
          const cod = window.bloqueioElo ? window.bloqueioElo(a, nivel, elosAtuais) : null;
          return {
            id: 'animal:' + a.instancia.instanceId, tipo: 'animal', instanceId: a.instancia.instanceId,
            nome: (a.cat && a.cat.nome) || a.criatura.nome,
            bloqueio: cod && window.motivoEloLabel ? window.motivoEloLabel(cod, _en, nivel) : (cod || null),
          };
        })
      : [
        ...(recebeMilagre(eu)
          ? [{ id: String(pj.id), nome: [pj.nome, pj.sobrenome].filter(Boolean).join(' '), foto_url: pj.foto_url }]
          : []),
        ...((soEmSi ? [] : pjsDaHistoria).filter(recebeMilagre).map((c) => ({
          id: String(c.id), nome: [c.nome, c.sobrenome].filter(Boolean).join(' '), foto_url: c.foto_url,
        }))),
      ];
    /* RITUAL (28/09/2026): os itens saem da mochila no ato, e sem eles não
       evoca. A conferência é a mesma de antes. */
    const textoRitual = ritualDaMagia(m);
    const ritual = textoRitual && podeEditarFoto && typeof conferirItensDoRitual === 'function'
      ? conferirItensDoRitual(textoRitual, pj.inventario?.itens || [], catalogoBySlug) : null;
    /* O KARMA REAL, não o nível (13/09/2026): fora de combate o karma sai de
       toda evocação do dono — menos a de RODADA, que não sai porque ali a
       magia nem resolve (karmaDaEvocacaoForaDeCombate, 01-core).

       É daqui que vem a resposta ao pedido de 28/10/2026 ("magias que causam
       dano dão a opção de gastar mais karma, e a coluna de ataque é o karma
       gasto"): essa escolha é da BATALHA. Na ficha, uma magia de dano dura em
       rodadas, não pousa e não cobra — então a janela diz isso em vez de
       oferecer um seletor de karma que não mudaria nada. */
    const motivo = typeof motivoNaoAplicaNaFicha === 'function'
      ? motivoNaoAplicaNaFicha(m, nivel) : 'narrativa';
    /* O DONO E O MESTRE VEEM COISAS DIFERENTES (28/10/2026). A barra de
       atalhos é dos dois (mostrarAtalhos), mas `aoEvocarMagia` só cobra karma
       e só aplica efeito quando quem clica é o DONO (podeEditarFoto): na ficha
       do jogador, o Evocar do Mestre apenas registra na mesa.

       Sem este espelho, o quadro mostrava "Karma 5" para o Mestre e o clique
       não gastava nada — a janela prometia o que o código não faz. */
    const dono = !!podeEditarFoto;
    const karma = !dono ? 0
      : (typeof karmaDaEvocacaoForaDeCombate === 'function'
        ? karmaDaEvocacaoForaDeCombate(motivo, nivel) : (Number(nivel) || 0));
    const NOTA = {
      rodadas:    _en ? 'Lasts in rounds, so it is a combat spell: cast it in battle.'
                      : 'Dura em rodadas, então é magia de combate: evoque na batalha.',
      calendario: _en ? 'Lasts on the calendar; the GM applies the effect.'
                      : 'Dura no calendário; o Mestre aplica o efeito.',
      duradoura:  _en ? 'Lasting effect; the GM applies it.'
                      : 'Efeito duradouro; o Mestre aplica.',
      narrativa:  _en ? 'Narrative effect, resolve at the table.'
                      : 'Efeito narrativo, resolva na mesa.',
    };
    return {
      karma, nota: (motivo && NOTA[motivo]) || null, alvos, ritual, bloqueio, dono,
      euId: String(pj.id),
      /* Sem alvo a escolher: alcance pessoal, onde o único alvo é ele. */
      semAlvo: soEmSi && !criaElo && alvos.length <= 1,
    };
  };
  const atalhoItens = mostrarAtalhos
    // Sem o que está à venda na loja (02/10/2026): travado até retirar.
    ? itensPj.filter((it) => !estaAVenda(it) && _itemUsavel(catalogoBySlug[it.slug])).map((it) => {
        const cat = catalogoBySlug[it.slug];
        /* `descricao` e `efeitos` entram em 28/10/2026: a janela nova mostra o
           que o item FAZ, em números, antes de gastá-lo. `efeitosEmNumeros`
           (01-core/inventario-helpers) é a mesma leitura que o editor usa —
           nada de prosa interpretada duas vezes. */
        const emNumeros = (window.efeitosEmNumeros ? window.efeitosEmNumeros(cat) : null) || {};
        return {
          id: it.instanceId, nome: cat.nome, quantidade: it.quantidade,
          icone: _itemIcon(cat), descricao: cat.descricao,
          efeitos: Object.entries(emNumeros).map(([rot, n]) => [rot, (n > 0 ? '+' : '−') + Math.abs(n)]),
        };
      })
    : [];

  return (
    <>
    <div className={'menestrel-ui fp-page' + (fpFull ? ' is-full' : '') + ((fpTab === 'inventario' || fpTab === 'loja' || fpTab === 'fabricar') ? ' is-inv is-inventario' : '')}>

      {abasMestreEl}
      {/* O trilho de busca e moedas do Inventário mora fora do painel, logo
          abaixo do trilho do topo (23/10/2026); a InvItemsTable o põe aqui. */}
      {(fpTab === 'inventario' || fpTab === 'loja') && <div id="fp-trilho-slot" className="fp-trilho-slot" />}
      <div className="fp-card">
        <div className="fp-card-top">
          {pausado && (
            <div className="fp-pause-banner">
              <i className="ti ti-player-pause" aria-hidden="true" />
              {en ? 'Story paused — the player has no access to this sheet right now.'
                  : 'História pausada — o jogador está sem acesso a esta ficha agora.'}
            </div>
          )}
          {cabecalhoNoMenu ? ctrlsNaBarra : mestreNaBarra
            /* Sem cabeçalho: só o espaço da busca da Loja, que a LojaJogador
               preenche por portal. */
            ? (fpTab === 'loja' ? <div className="ficha-page-busca ficha-page-busca--solta" ref={setSlotBuscaLoja} /> : null)
            : fpTabsEl}
          {ctrlsMestreNaBarra}
        </div>

      {(fpTab === 'info' || fpTab === 'conhecimento') ? (
        <div className="fp-invtab fp-info-tab">
          <FichaInfoView
            key={fpTab}
            parte={fpTab === 'conhecimento' ? 'conhecimento' : 'personagem'}
            onAbrirHabilidade={(key) => setConsulta({ tipo: 'hab', key })}
            onAbrirTecnica={(key) => setConsulta({ tipo: 'tec', key })}
            onAbrirMagia={(key) => setConsulta({ tipo: 'mag', key })}
            pj={pj}
            en={en}
            atributosFinais={atributosFinais}
            derivadas={_d}
            estagioNum={estagioNum}
            xpTotal={xpTotal}
            velocidade={velocidade}
            pesoPersonagem={ficha.peso}
            alturaPersonagem={ficha.altura}
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
            historiaPj={historiaPj}
            lang={lang}
            subracaInfo={subracaInfo}
            onEscolherSubraca={isMestre ? definirSubraca : undefined}
          />
        </div>
      ) : fpTab === 'animais' && animaisPj.length > 0 ? (
        <div className="fp-invtab fp-info-tab">
          {/* A ESCOLHA DO COMPANHEIRO SAIU DA PÁGINA (26/10/2026, pedido do
              usuário): "os botões para selecionar o animal vão ficar no menu
              da esquerda como submenu de companheiros". Era uma fileira de
              chips aqui em cima — e era o último resquício de navegação dentro
              da ficha, depois que o trilho de abas também foi para a barra. */}
          <FichaAnimaisView
            animal={animaisPj.find((a) => a.instancia.instanceId === compSel) || animaisPj[0]}
            parte={compParte}
            en={en} podeEditar={podeEditarInv} itens={pj.inventario?.itens || []}
            onRenomear={podeEditarInv ? (id, nome) =>
              salvarItensFicha(window.comNomeDoAnimal(pj.inventario?.itens || [], id, nome)) : undefined}
            onDesfazerElo={isMestre && podeEditarInv
              ? (id) => salvarItensFicha(window.semEloNoAnimal(pj.inventario?.itens, id)) : undefined}
            catalogoBySlug={catalogoBySlug} habsByKey={habsByKey}
            tecnicasByKey={tecnicasByKey} magiasByKey={magiasByKey}
            /* O cavaleiro pesa no bicho quando está montado nele (27/10/2026,
               decisão do usuário). O peso do PJ vem calculado da raça, do
               gênero e da sub-raça — ver `peso()` em 01-core/game-data.jsx. */
            pesoDoCavaleiro={ficha.peso} />
        </div>
      ) : fpTab === 'inventario' ? (
        <div className="fp-invtab">
          {/* Mestre visualiza inventário de outro usuário: currentUserId = Mestre, pj.user_id = dono do PJ.
              InventarioList usa currentUserId em queries RLS (user_id = auth.uid()) — passa o user_id
              real do PJ (pj.user_id) para que o Mestre, com acesso SECURITY DEFINER via RPC ou
              SELECT all policy, possa enxergar o inventário. Fallback pro currentUserId normal (jogador). */}
          {/* estado_atual passa pelo MESMO handoff que o inventário: a Ficha
              carrega `pj` uma vez por pjAtivoId e não refaz ao trocar de aba,
              então sem `onEstadoChange` a cópia daqui ficava congelada e a
              gravação seguinte da Ficha (aplicarEstado, usarItemFicha,
              desequiparFicha) apagava o efeito do item usado no Inventário.
              `estadoAtualSeed` fecha o sentido inverso — ver o cabeçalho do
              InventarioList e 11-ficha/estado-handoff.test.js. */}
          <InventarioList ac={ac} lang={lang} currentUserId={pj?.user_id ?? currentUserId} pjIdFixo={pjAtivoId} key={pjAtivoId} onInventarioChange={(novoInv) => setPj((prev) => prev ? { ...prev, inventario: novoInv } : prev)} onEstadoChange={(novoEstado) => setPj((prev) => prev ? { ...prev, estado_atual: novoEstado } : prev)} estadoAtualSeed={pj?.estado_atual} maximos={{ ef: maxEF, eh: maxEH, ka: maxKA, ar: arMax }} isMestre={!!isMestre} />
        </div>
      ) : fpTab === 'fabricar' ? (
        <div className="fp-invtab">
          {/* A bancada não grava nada: devolve a receita e a ficha rola o d20
              (pedirFabricacao). Ver 01-core/fabricacao.jsx. */}
          <FabricarView
            itens={itensPj}
            catalogoBySlug={catalogoBySlug}
            receitas={receitas}
            pjHabilidades={pj.habilidades || {}}
            habsByKey={habsByKey}
            dataJogo={dataJogoDaMesa}
            lang={lang}
            onFabricar={podeEditarInv ? pedirFabricacao : undefined}
            resultado={fabResultado}
          />
        </div>
      ) : fpTab === 'loja' ? (
        <div className="fp-invtab">
          <LojaJogador ac={ac} lang={lang} currentUserId={pj?.user_id ?? currentUserId} pjIdFixo={pjAtivoId} key={pjAtivoId} isMestre={!!isMestre} slotBusca={slotBuscaLoja} />
        </div>
      ) : (
      <div className="fp2-sheet">
        <div className="fp2-frame">
          {fotoErro && <div className="fp2-erro">{fotoErro}</div>}
          {eqErro && <div className="fp2-erro">{eqErro}</div>}

          {/* A FILEIRA DO HERÓI (26/10/2026, modelo aprovado): os botões moram
              DENTRO da ficha, por portal para `slotAcoesFicha`.

              O nome e a linha de profissão/estágio/raça/título SAÍRAM daqui a
              pedido do usuário ("Remova da ficha do personagem o texto
              'Lirael Vel'Thalas Rastreador · Estágio 9 · Elfo-Florestal ·
              Guardião'"): o nome já vive no menu lateral da mesa, e o estágio
              na barra de Experiência, no pé do cartão. Sem a identidade de um
              lado, o trilho deixa de ser um extremo da fileira e fica
              CENTRADO. */}
          <div className="fp3-heroi">
            {/* O ID É PARA O SINO (28/10/2026). Havia DOIS elementos com a
                classe `mc-acoes-ficha`: este, que é o trilho de verdade — o
                que tem Status, Atividades, Habilidades, Magias e Itens —, e o
                do shell, que fica vazio quando a ficha desenha o seu. Como o
                `useAlvoPortal` procura por ID, e só o do shell tinha um, o
                sino caía no vazio e virava uma faixa solta no topo. Agora
                este tem id próprio, e o sino o prefere. */}
            <div id="fp-acoes-ficha" className="fp3-heroi-acoes mc-acoes-ficha" ref={setSlotAcoesFicha} />
          </div>

          {/* Duas colunas desde 26/10/2026 (modelo aprovado): vitalidade +
              status + condições à esquerda, o boneco de armar à direita. */}
          <div className="fp2-columns fp2-columns--duas">
            <div className="fp2-col-vit">{vitCondCol}</div>
            <div className="fp2-col-main">{equipRow}</div>
          </div>
          {/* A Experiência saiu da coluna (23/10/2026): uma faixa simples no pé
              do cartão, de ponta a ponta. A barra é a mesma — e o Mestre segue
              concedendo XP por ela. */}
          <div className="fp-xp-faixa">
            <span className="fp-xp-rot">{en ? 'Experience' : 'Experiência'}</span>
            {elEstagio}
          </div>
          {/* SEM a barra de Peso (26/10/2026, pedido do usuário: "remova a
              barra de peso da ficha, pois ela já aparece no inventário"). A
              carga é assunto de quem está mexendo na mochila, e o trilho do
              Inventário já a mostra ali, ao lado das moedas. */}
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

    {/* Pacto de amizade e os cards dos amigos, na borda esquerda (28/09/2026).
        Em TODAS as abas: é no Inventário que se arrasta o item até o amigo. */}
    {/* O BOTÃO DE AMIGOS SAIU DO TRILHO (27/10/2026, pedido do usuário: "o
        menu 'amigos' que está no trilho vai para o menu da esquerda"). O que
        continua aqui são os CARDS dos amigos, na borda esquerda: eles são o
        destino do arraste de item do inventário, não um menu. Por isso o
        portal volta para a raiz do app, e não para a barra de ações. */}
    {podeEditarFoto && pjAtivoId && typeof AmigosFab !== 'undefined' && ReactDOM.createPortal(
      <AmigosFab lang={lang} pjId={pjAtivoId} semBotao />,
      document.getElementById('root') || document.body
    )}

    {/* Atalhos flutuantes — Habilidade, Magia e Item, na coluna dos dados.
        Portal em #root pelo mesmo motivo dos tooltips: .fp-page.is-full é
        position:fixed e prenderia os botões num contexto de empilhamento. */}
    {mostrarAtalhos && ReactDOM.createPortal(
      <AtalhosFicha
        lang={lang}
        habilidades={atalhoHabilidades}
        magias={atalhoMagias}
        itens={atalhoItens}
        /* ROLA DIRETO (28/10/2026): a dificuldade vem do rodapé da janela
           nova, e não há mais segunda janela para abrir. A conta é a mesma de
           antes — as magias de dificuldade ativas (Camuflagem, Faro…)
           deslocam a escolhida, e as duas vão para o log, para ele dizer
           "Médio → Fácil" em vez de trocar em silêncio. */
        onHabilidade={(key, extra) => {
          const hab = habsByKey[key];
          if (!hab || !extra || !extra.dificuldade) return;
          const total = (_totHabCond || _totHab)(key, pj.habilidades || {}, atributosFinais, bonusHabilidades, habsByKey, _est.condicoes, ficha.protecoes);
          const alvoHab = { nome: hab.nome, grupo: hab.grupo };
          const passos = (typeof passosDasMagiasAtivas === 'function')
            ? passosDasMagiasAtivas(magiasAtivas, alvoHab, magiasByKey) : 0;
          const efetiva = passos && typeof deslocarDificuldade === 'function'
            ? deslocarDificuldade(extra.dificuldade, passos) : extra.dificuldade;
          setRolagem({ nome: hab.nome, total, grupo: hab.grupo,
                       dificuldade: efetiva, dificuldade_escolhida: extra.dificuldade });
        }}
        /* EVOCA DIRETO (28/10/2026): nível, alvo e karma já foram escolhidos
           no segundo passo da própria janela, e o rodapé confirmou. */
        magiaPasso={magiaPassoDoAtalho}
        onMagia={(key, extra) => aoEvocarMagia({ key, nivel: (extra && extra.nivel) || null, alvo: (extra && extra.alvo) || null })}
        /* USA DIRETO (28/10/2026): a janela nova mostra quantidade e efeito e
           confirma no rodapé, então não há mais por que abrir a janela cheia
           do item só para achar o botão Usar. `solicitarUsarFicha` é o mesmo
           caminho de antes — com mais de uma unidade, ele ainda pergunta
           quantas. */
        onItem={(id) => solicitarUsarFicha(id)}
        naBarra={!!alvoAcoesAtual}
      />,
      alvoAcoesAtual || document.getElementById('root') || document.body
    )}

    {/* ── Card de Joias (portal) ──────────────────────────────────────────────
        Renderizado via ReactDOM.createPortal dentro de #root (não body!) para que
        "#root .menestrel-ui .inv-slot" e demais seletores escopados no index.css
        continuem casando. Escapa do overflow:hidden do .fp2-panel sem perder CSS.
        Posicionado com position:fixed acima do botão de Joias via joiasRect.
        zIndex 9000 — abaixo dos tooltips (9500), que também são portados pra
        #root, pra que o tooltip de um slot apareça na frente do card.
    ─────────────────────────────────────────────────────────────────────────── */}
    {/* ── MODAL DA REGIÃO (26/10/2026, pedido do usuário) ─────────────────────
        "Quando clicar em um item dos slots, abrir um modal com os slots e
        ações dos itens da ficha." Um modal só por região: as casas dela em
        cima (clicar troca a peça em foco) e, embaixo, a peça escolhida com
        suas ações — desequipar/despir, abrir o recipiente e a resistência.
        Substituiu o pop flutuante e os quatro cards antigos (joias, brincos,
        roupas, cinto). */}
    {regiaoAberta && _JanelaItem && (() => {
      const casas = REGIOES[regiaoAberta] || 1;
      const ocupantes = itensDaRegiao(regiaoAberta);
      /* Clicou numa casa vazia: NÃO há peça em foco, e é isso que faz a
         janela oferecer o que do inventário cabe ali. Sem a distinção, o foco
         caía no primeiro ocupante e a oferta sumia — ver CASA_VAZIA. */
      const emFoco = pecaNoModal === CASA_VAZIA ? null
        : (ocupantes.find((x) => x.instanceId === pecaNoModal) || ocupantes[0] || null);
      const catFoco = emFoco ? catalogoBySlug[emFoco.slug] : null;
      const nomeFoco = catFoco ? catFoco.nome : (emFoco ? emFoco.slug : null);
      const ehCont = !!catFoco && _ehContainer(catFoco);
      const resMaxFoco = Number(catFoco?.resistencia) || 0;
      const resFoco = Number.isFinite(Number(emFoco?.res))
        ? Math.max(0, Math.min(resMaxFoco, Number(emFoco.res))) : resMaxFoco;
      const podeRes = podeEditarEstado && resMaxFoco > 0 && !emFoco?.vestido;
      const fechar = () => { setRegiaoAberta(null); setPecaNoModal(null); };
      const acoes = emFoco && podeEditarInv ? [
        ehCont ? {
          chave: 'abrir', icone: 'ti-moneybag', rotulo: en ? 'Open' : 'Abrir',
          onClick: () => { fechar(); setContFichaId(emFoco.instanceId); },
        } : null,
        {
          chave: 'detalhes', icone: 'ti-info-circle', rotulo: en ? 'Details' : 'Detalhes',
          /* Guarda a região E a peça em foco: voltar tem de reabrir a mesma
             casa, não a primeira da região. */
          onClick: () => {
            const de = { regiao: regiaoAberta, peca: emFoco.instanceId };
            fechar(); setVoltarPara(de); setDetalheCintoId(emFoco.instanceId);
          },
        },
        {
          chave: 'despir', icone: emFoco.vestido ? 'ti-shirt-off' : 'ti-shield-off',
          rotulo: emFoco.vestido ? (en ? 'Take off' : 'Despir') : (en ? 'Unequip' : 'Desequipar'),
          onClick: () => { fechar(); desequiparFicha(emFoco.instanceId); },
        },
      ].filter(Boolean) : [];
      return (
        <_JanelaItem
          /* O TÍTULO É A PEÇA, não a região (26/10/2026, pedido do usuário:
             "remova a palavra 'cabeça' que está no slot cabeça acima da
             imagem"). O nome da região já está na casa de onde se clicou, e
             aqui ele repetia o óbvio acima da pintura. Com a casa vazia não
             há peça para nomear — aí vale a região, que é o que a janela é.
             O nome da região continua no aria-label, para quem não vê. */
          title={<><i className={'ti ' + (FP_REGION_ICON[regiaoAberta] || 'ti-shield')} aria-hidden="true" /> {nomeFoco || slotLbl(regiaoAberta)}</>}
          extraClass="modal-regiao"
          aria-label={slotLbl(regiaoAberta)}
          lang={lang}
          onClose={fechar}
          semAbas acoesEmBarra
          acoes={acoes}>
          <div className="fp3-modal-regiao">
            {/* O CONTADOR SAIU (26/10/2026, pedido do usuário: "ao clicar no
                slot e abrir um item, remova 'Casas 0/1 em uso'"). Ele dizia
                em palavras o que as casas logo abaixo mostram em desenho — e
                numa região de uma casa só, dizia "0/1" para explicar um
                quadrado vazio. */}
            <div className="fp2-slot-cluster fp3-cluster-regiao">
              {/* ── A ARMA DE DUAS MÃOS OCUPA AS DUAS CASAS (28/10/2026) ───
                  "Quando o arco está equipado e eu clico no item, mostra dois
                  slots. Um mostra que está vazio, mas ao clicar nele não posso
                  colocar outro item porque o arco ocupa 2 mãos. Nesse caso, já
                  mostre o arco ocupando as duas mãos." (usuário)

                  A REGRA já estava certa dos dois lados: `getSlotsState`
                  marca as duas mãos com a mesma instância, e por isso nada
                  mais entrava; e o BONECO já espelhava a arma nas duas casas,
                  por `ocupanteDefesa`. Quem mentia era só esta janela, que
                  lia `ocupantes[idx]` — uma lista com UM item para duas
                  casas, deixando a segunda vazia e oferecendo o inventário
                  para uma mão que não existe.

                  Agora ela pergunta a mesma função que o boneco pergunta. */}
              {Array.from({ length: casas }).map((_, idx) => {
                const ladoDaMao = regiaoAberta === 'mao' ? (idx === 0 ? 'mao_d' : 'mao_e') : null;
                const it = ladoDaMao ? ocupanteDefesa(ladoDaMao, 0) : (ocupantes[idx] || null);
                const emFocoAqui = !!(it && emFoco && it.instanceId === emFoco.instanceId);
                return (
                  <div key={'casa-' + idx} className={'fp3-modal-casa' + (emFocoAqui ? ' is-foco' : '')}>
                    {/* Na região da mão, a casa desenha o LADO (a arte da
                        mão vazia é um par: direita e esquerda); nas demais, a
                        própria região. */}
                    {fpSlotTile(ladoDaMao || regiaoAberta, it, 'regiao-modal-' + idx, regiaoAberta,
                      candidatosDaRegiao(regiaoAberta).length === 0)}
                  </div>
                );
              })}
            </div>
            {emFoco ? (
              <div className="fp3-modal-peca">
                {/* O nome subiu para o título da janela (26/10/2026); repetido
                    aqui, ele seria a mesma palavra duas vezes na mesma tela. */}
                {catFoco && catFoco.descricao && (
                  <p className="fp3-modal-peca-desc">{catFoco.descricao}</p>
                )}
                {podeRes && (
                  <div className="fp-pop-stepper fp3-modal-res">
                    <button type="button" className="fp-step-btn" disabled={resFoco <= 0}
                      aria-label={`${en ? 'Lower durability' : 'Reduzir resistência'} ${nomeFoco}`}
                      onClick={() => ajustarResistenciaDaPeca(emFoco.instanceId, resFoco - 1)}>
                      <i className="ti ti-minus" aria-hidden="true" />
                    </button>
                    <span className="fp-pop-stepper-label">
                      {en ? 'Durability' : 'Resistência'} {resFoco} / {resMaxFoco}
                    </span>
                    <button type="button" className="fp-step-btn" disabled={resFoco >= resMaxFoco}
                      aria-label={`${en ? 'Raise durability' : 'Aumentar resistência'} ${nomeFoco}`}
                      onClick={() => ajustarResistenciaDaPeca(emFoco.instanceId, resFoco + 1)}>
                      <i className="ti ti-plus" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            ) : (() => {
              /* A CASA VAZIA OFERECE O QUE CABE NELA (26/10/2026, pedido do
                 usuário: "se o usuário clicar em um slot vazio, mostre os
                 itens que podem ser adicionados ali que estão no inventário
                 do personagem"). Antes a janela só mandava o jogador até o
                 Inventário — duas telas para um gesto de uma. */
              /* "Remova 'Nada no inventário cabe aqui', pois basta clicar
                 no slot vazio para abrir um modal para selecionar o item que
                 vai ser equipado" (usuário, 26/10/2026): a janela da casa
                 vazia É o seletor. Sem nada para oferecer ela não escreve
                 desculpa nenhuma — as casas da região já estão desenhadas
                 acima, e elas bastam. */
              const candidatos = podeEditarInv ? candidatosDaRegiao(regiaoAberta) : [];
              if (!candidatos.length) return null;
              return (
                <div className="fp3-modal-oferta">
                  <p className="mn-rotulo">{en ? 'From the inventory' : 'Do inventário'}</p>
                  <div className="at-lista" role="list">
                    {candidatos.map((cand) => {
                      const c = catalogoBySlug[cand.slug] || {};
                      /* Bloqueado continua na lista, desligado e com o porquê
                         ao lado: sumir faria o jogador procurar no Inventário
                         uma arma que está no bolso dele. */
                      const motivo = bloqueioNaRegiao(c, regiaoAberta);
                      return (
                        <button key={cand.instanceId} type="button" role="listitem"
                          className={'at-linha' + (motivo ? ' is-bloqueado' : '')}
                          data-equipar-aqui={cand.instanceId} disabled={!!motivo}
                          onClick={() => { fechar(); equiparNaRegiao(cand.instanceId, regiaoAberta); }}>
                          <i className={'ti ' + (_itemIcon(c) || 'ti-box') + ' at-linha-ic'} aria-hidden="true" />
                          <span className="at-linha-texto">
                            <span className="at-linha-nome">{c.nome || cand.slug}</span>
                            {/* NA MESMA LINHA DO NOME (28/10/2026, usuário). O ponto
                                separa sem traço nem parêntese — é o mesmo recurso das
                                pílulas de alvo da magia ("Lobo · Já tem elo"). */}
                            {motivo && <span className="at-linha-motivo">{motivo}</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </_JanelaItem>
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
            /* O CAMINHO DE VOLTA (28/10/2026, usuário: "o botão de voltar ao
               selecionar um item dentro da algibeira"). Abrir a peça FECHA o
               recipiente; sem guardar de onde se veio, voltar era fechar a
               janela, achar a algibeira no boneco e abri-la de novo. */
            onAbrirDetalhes={(id) => {
              setVoltarPara({ tipo: 'container', container: contFichaId });
              setContFichaId(null);
              setDetalheCintoId(id);
            }}
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
            lang={lang}
            contexto="ficha"
            onClose={() => { setDetalheCintoId(null); setVoltarPara(null); }}
            /* Só há Voltar quando houve de onde vir — ver o comentário em
               `acoesTopo` (07-inventario/inventario.jsx). */
            onVoltar={voltarPara ? () => {
              const volta = voltarPara;
              setVoltarPara(null);
              setDetalheCintoId(null);
              /* Três degraus possíveis: a janela da REGIÃO (o caminho do
                 boneco), o RECIPIENTE aberto (algibeira, alforje) e outra
                 PEÇA, quando se navega de item em item lá dentro. */
              if (volta.tipo === 'container') { setContFichaId(volta.container); return; }
              if (volta.tipo === 'item') { setDetalheCintoId(volta.peca); return; }
              setRegiaoAberta(volta.regiao);
              setPecaNoModal(volta.peca);
            } : null}
            onUsar={solicitarUsarFicha}
            onDestruir={solicitarDestruirFicha}
            /* Sem Comentar na ficha (26/09/2026): era uma função vazia — o
               ícone aparecia e não fazia nada. A nota se edita no Inventário. */
            usuario={{ nome: [pj.nome, pj.sobrenome].filter(Boolean).join(' '), foto_url: pj.foto_url }}
            onEquipar={() => ({ ok: false })}
            onDesequipar={() => {}}
            onVestir={() => ({ ok: false })}
            onDespir={() => {}}
            onAprenderMagia={async () => ({ ok: false })}
            /* Estudar/Aprender aparecem também aqui (22/10/2026); a janela
               explica que o aprendizado é feito no Inventário. */
            magiasDb={magias}
            tecnicasDb={tecnicas}
            vinculos={vinculosLivros}
            pjAprendiz={pj}
            onMoverParaContainer={() => {}}
            /* `pjOrigemId` é o que faz a ação aparecer (ver acoesTopo); a
               lista de amigos a janela busca sozinha a partir dele. Só o DONO
               transfere — o Mestre olhando a ficha não tira item de ninguém. */
            pjOrigemId={podeEditarFoto ? pj.id : null}
            pjsHistoria={pjsDaHistoria}
            onTransferir={podeEditarFoto ? solicitarTransferirFicha : null}
            transferError={transferErroFicha}
            onTransferReset={() => setTransferErroFicha(null)}
            onRemoverDoContainer={() => {}}
            /* Era uma função vazia: clicar numa peça guardada dentro do item
               não fazia nada (28/10/2026). Agora abre a peça e guarda o
               degrau, para o Voltar trazer de volta ao recipiente. */
            onAbrirDetalhesFilho={(id) => {
              setVoltarPara({ tipo: 'item', peca: detalheCintoId });
              setDetalheCintoId(id);
            }}
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

      {/* Detalhes de uma magia (fora de combate) — abre pelo atalho flutuante
          de Magia (AtalhosFicha). Permite escolher o nível (até o
          nível efetivo que o PJ possui) e o alvo (o próprio PJ ou outro
          protagonista da mesma história). "Evocar" fecha o modal e notifica
          a Central de Mensagens da Mesa (aoEvocarMagia); ainda NÃO aplica
          o efeito mecânico no alvo (curar/dano/buff é trabalho futuro). */}
      {magiaDetalheKey && (() => {
        const mag = magiasByKey[magiaDetalheKey];
        if (!mag) return null;
        /* Ritual: os itens necessários, conferidos contra o inventário do dono
           (28/09/2026). O texto mora em itens_necessarios ou, nas magias
           antigas, no fim da descrição (separarItensNecessarios). */
        const textoRitual = ritualDaMagia(mag);
        const ritual = textoRitual && podeEditarFoto && typeof conferirItensDoRitual === 'function'
          ? conferirItensDoRitual(textoRitual, pj.inventario?.itens || [], catalogoBySlug) : null;
        return (
          <MagiaDetalhesModal
            ritual={ritual}
            magia={mag}
            passos={(pj.magias || {})[magiaDetalheKey] ?? null}
            nivelMagiaEfetivoFn={_nivelMag}
            /* profissão, deus, sub-raça e estado (22/10/2026): a regra dos
               milagres precisa deles — sem o deus, todo milagre ficava
               bloqueado como "sem religião". */
            eu={{ id: pj.id, nome: pj.nome, sobrenome: pj.sobrenome, foto_url: pj.foto_url,
              profissao: pj.profissao, deus: pj.deus, subraca: pj.subraca, estado_atual: pj.estado_atual }}
            dataJogo={historiaPj?.data_jogo_atual}
            colegas={pjsDaHistoria}
            animais={animaisPj}
            elosAtuais={animaisPj.filter((a) => window.temElo && window.temElo(a.instancia)).length}
            lang={lang}
            onClose={() => setMagiaDetalheKey(null)}
            onEvocar={aoEvocarMagia}
            abrirTip={abrirTip}
            fecharTip={fecharTip}
          />
        );
      })()}

      {/* CONSULTA pelo Conhecimento (26/09/2026) — a janela do Treinamento
          (BestHabilidadeFicha / BestTecnicaFicha / BestMagiaFicha), com o que
          o personagem tem no começo de Características. */}
      {consulta && (() => {
        const Janela = window.BestDetalheModal;
        const Linha = window.BestLinha;
        if (!Janela) return null;
        const fechar = () => setConsulta(null);
        const linhas = (pares) => (Linha ? <>{pares.map(([r, v]) => <Linha key={r} rotulo={r} valor={v} />)}</> : null);
        const naoTem = en ? 'Not learned' : 'Não aprendida';
        if (consulta.tipo === 'hab') {
          const hab = habsByKey[consulta.key];
          const Corpo = window.BestHabilidadeFicha;
          if (!hab || !Corpo) return null;
          const nivel = (pj.habilidades || {})[consulta.key] || 0;
          const total = (_totHabCond || _totHab)(consulta.key, pj.habilidades || {}, atributosFinais, bonusHabilidades, habsByKey, _est.condicoes, ficha.protecoes);
          return (
            <Janela title={hab.nome} lang={lang} onClose={fechar}>
              <Corpo h={hab} lang={lang} linhasExtras={linhas([
                [en ? 'Level' : 'Nível', nivel || naoTem], [en ? 'Total' : 'Total', total]])} />
            </Janela>
          );
        }
        if (consulta.tipo === 'tec') {
          const tec = tecnicasByKey[consulta.key];
          const Corpo = window.BestTecnicaFicha;
          if (!tec || !Corpo) return null;
          const nivel = (pj.tecnicas || {})[consulta.key] || 0;
          const total = _totTec ? _totTec(tec, pj.tecnicas || {}, atributosFinais) : null;
          return (
            <Janela title={tec.nome} lang={lang} onClose={fechar}>
              <Corpo t={tec} lang={lang} linhasExtras={linhas([
                [en ? 'Level' : 'Nível', nivel || naoTem],
                ...(total != null ? [[en ? 'Total' : 'Total', total]] : [])])} />
            </Janela>
          );
        }
        const mag = magiasByKey[consulta.key];
        const Corpo = window.BestMagiaFicha;
        if (!mag || !Corpo) return null;
        const passos = (pj.magias || {})[consulta.key];
        const nivel = passos ? _nivelMag(passos) : 0;
        return (
          <Janela title={mag.nome} lang={lang} onClose={fechar}>
            <Corpo m={mag} lang={lang}
              niveisPermitidos={nivel ? new Set([1, 3, 5, 7, 9].filter((n) => n <= nivel)) : null}
              linhasExtras={linhas([[en ? 'Your level' : 'Seu nível', nivel || naoTem]])} />
          </Janela>
        );
      })()}

      {/* Detalhes de uma habilidade (fora de combate) — abre pelo atalho
          flutuante de Habilidade (AtalhosFicha). Habilidade não tem
          nível: sempre usa o total já calculado (_totHab). Não tem alvo —
          só a escolha da dificuldade do uso. Só visual por ora: "Usar"
          ainda não dispara nenhuma ação. */}
      {habilidadeDetalheKey && (() => {
        const hab = habsByKey[habilidadeDetalheKey];
        if (!hab) return null;
        const total = (_totHabCond || _totHab)(habilidadeDetalheKey, pj.habilidades || {}, atributosFinais, bonusHabilidades, habsByKey, _est.condicoes, ficha.protecoes);
        return (
          <HabilidadeDetalhesModal
            habilidade={hab}
            total={total}
            nivel={(pj.habilidades || {})[habilidadeDetalheKey] || 0}
            lang={lang}
            onClose={() => setHabilidadeDetalheKey(null)}
            /* A dificuldade que VALE: a escolhida, deslocada pelas magias de
               dificuldade ativas (Camuflagem, Faro…) — a mesma conta da batalha
               (passosDeDificuldade). A escolhida vai junto para o log dizer
               "Médio → Fácil" em vez de trocar em silêncio. */
            onUsar={(p) => {
              setHabilidadeDetalheKey(null);
              const alvoHab = { nome: hab.nome, grupo: hab.grupo };
              const passos = (typeof passosDasMagiasAtivas === 'function')
                ? passosDasMagiasAtivas(magiasAtivas, alvoHab, magiasByKey) : 0;
              const efetiva = passos && typeof deslocarDificuldade === 'function'
                ? deslocarDificuldade(p.dificuldade, passos) : p.dificuldade;
              setRolagem({ ...p, grupo: hab.grupo, dificuldade: efetiva,
                           dificuldade_escolhida: p.dificuldade });
            }}
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
// FichaInfoView exportado à parte para o teste de navegação por hover/clique
// (ficha-info-nav.test.jsx) conseguir montá-lo isolado, sem depender do fetch
// de FichaPersonagem.
window.FichaInfoView = FichaInfoView;
// Aba Animais à parte pelo mesmo motivo (ficha-animais.test.jsx).
window.FichaAnimaisView = FichaAnimaisView;
// HabilidadeDetalhesModal à parte pelo mesmo motivo: o teste do total em
// destaque (habilidade-detalhes-total.test.jsx) monta só a janela.
window.HabilidadeDetalhesModal = HabilidadeDetalhesModal;
// E a da magia, pelo teste dos atributos em tooltip (magia-detalhes-tooltip.test.jsx).
window.MagiaDetalhesModal = MagiaDetalhesModal;
// As barras e o popover de edição, pelo teste da experiência clicável
// (experiencia-barra.test.jsx): montá-los isolados dispensa o fetch do PJ.
window.FichaVitBars = FichaVitBars;
window.FichaGemas = FichaGemas;
window.FichaMedalhoes = FichaMedalhoes;
window.BarEditPopover = BarEditPopover;
/* A regra de quem NÃO tem Karma e a tabela de rótulos narrativos das barras
   são conhecimento da ficha, mas o card de personagem (08-personagens) passou
   a mostrar vitais e condições em 17/09/2026 e precisa das mesmas palavras —
   duas cópias da tabela é como as duas telas começam a divergir sem ninguém
   decidir que deviam. O card lê pelo window porque carrega ANTES desta fase. */
window.SEM_KARMA = SEM_KARMA;
window.fichaEstadoLabel = fichaEstadoLabel;
/* E a cor de cada poço: EF/EH/Karma têm que ser as MESMAS no card e na ficha.
   Duas tabelas é como as duas telas começam a divergir sem ninguém decidir. */
window.FICHA_VIT_COLORS = FICHA_VIT_COLORS;
// O painel de status à parte, pelo teste do Mestre mexendo fora do combate
// (status-painel.test.jsx): montá-lo isolado dispensa o fetch do PJ.
window.FichaStatusPainel = FichaStatusPainel;
window.FichaAtividadeSeletor = FichaAtividadeSeletor;
// E o círculo de status, pelo mesmo teste (status-painel.test.jsx).
window.FichaStatusSeletor = FichaStatusSeletor;
