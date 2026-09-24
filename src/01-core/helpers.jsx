/* ============================================================
   HELPERS — Funções e hooks utilitários globais
   ============================================================
   - Desestrutura React: useState/useEffect/useMemo/useRef expostos
                         no escopo global, consumidos por todos os
                         arquivos extraídos. DECLARAÇÃO ÚNICA — não
                         redeclarar em outros arquivos, ou Babel
                         standalone joga "Identifier already declared".
   - calcDiaSemanaFantasy: nome do dia da semana no calendário fantasy
   - useTweaks: hook que persiste valores via host (editmode)

   Depende de: FANTASY_MONTHS e FANTASY_WEEKDAYS (constants.jsx).
   Carregar após constants.jsx no HTML.
   ============================================================ */

// Atalho global pros hooks do React. Babel standalone executa cada
// <script> no escopo global compartilhado — portanto esta const
// pode aparecer UMA ÚNICA VEZ em toda a árvore de scripts.
const { useState, useEffect, useMemo, useRef } = React;

// Ano 0, Mês 1, Dia 1 = Moldio (índice 3).
// Cada ano tem 361 dias: 12 meses de 30 dias + 1 Dia de Cruine (mês 13).
// Âncora: (ano*361 + diasAcumuladosAtéMes + dia-1 + 3) % 7
function calcDiaSemanaFantasy(ano, mes, dia) {
  let total = ano * 361;
  for (let m = 1; m < mes; m++) total += FANTASY_MONTHS[m - 1].dias;
  total += (dia - 1);
  return FANTASY_WEEKDAYS[(total + 3) % 7];
}

/* ── Feriado de uma data ───────────────────────────────────────────
   Devolve o nome da data comemorativa, ou null em dia comum. A tabela é
   FERIADOS (constants.jsx) — lore fixa do mundo, a mesma em qualquer mesa.

   Só dia e mês entram na conta: feriado repete todo ano. E a validação é
   estrita de propósito — a data vem de um jsonb do banco, e a barra do topo
   chama isto a cada render, então uma data pela metade tem que devolver null
   em vez de derrubar o console. */
function feriadoDe(mes, dia, en) {
  if (!Number.isInteger(mes) || !Number.isInteger(dia)) return null;
  const m = FANTASY_MONTHS[mes - 1];
  if (!m || dia < 1 || dia > m.dias) return null;
  const f = FERIADOS[mes + '-' + dia];
  if (!f) return null;
  return en ? f.en : f.pt;
}

/* ── Somar dias no calendário fantasy ──────────────────────────────
   O ano tem 361 dias: 12 meses de 30 mais o Dia de Cruine, que é o mês 13 com
   um dia só. Contar "3 dias a partir de hoje" na mão erra o Cruine, então a
   conta vira dia ABSOLUTO, soma, e volta — mesma âncora de
   calcDiaSemanaFantasy, para as duas nunca discordarem.

   Aceita delta negativo (para trás) e devolve null para data malformada, que
   é o que chega quando a história ainda não teve data definida.

   Estreou com a magia Doenças: "o tempo de cura é de 3 dias" precisa virar uma
   data concreta a partir da data atual do jogo. */
const FANTASY_DIAS_ANO = 361;

function dataFantasyParaAbsoluto(d) {
  if (!d) return null;
  const ano = Number(d.ano), mes = Number(d.mes), dia = Number(d.dia);
  if (!Number.isFinite(ano) || !Number.isFinite(mes) || !Number.isFinite(dia)) return null;
  if (mes < 1 || mes > FANTASY_MONTHS.length || dia < 1) return null;
  let total = ano * FANTASY_DIAS_ANO;
  for (let m = 1; m < mes; m++) total += FANTASY_MONTHS[m - 1].dias;
  return total + (dia - 1);
}

function absolutoParaDataFantasy(abs) {
  if (!Number.isFinite(abs)) return null;
  // Math.floor, não divisão inteira: ano negativo (antes do ano 0) tem que
  // descer, e o resto tem que ficar positivo para o laço dos meses funcionar.
  const ano = Math.floor(abs / FANTASY_DIAS_ANO);
  let resto = abs - ano * FANTASY_DIAS_ANO;
  for (let m = 0; m < FANTASY_MONTHS.length; m++) {
    const dias = FANTASY_MONTHS[m].dias;
    if (resto < dias) return { ano, mes: m + 1, dia: resto + 1 };
    resto -= dias;
  }
  return null;   // inalcançável: os meses somam 361 por definição
}

function somarDiasFantasy(data, dias) {
  const abs = dataFantasyParaAbsoluto(data);
  const n = Number(dias);
  if (abs == null || !Number.isFinite(n)) return null;
  return absolutoParaDataFantasy(abs + Math.trunc(n));
}

function formatarDataFantasy(d, lang) {
  if (!d) return '';
  const mes = FANTASY_MONTHS[d.mes - 1];
  const nome = mes ? mes.nome : '';
  // Dia de Cruine é o mês 13 e tem um dia só: "1 de Dia de Cruine" soa errado,
  // e o nome já é a data inteira.
  if (mes && mes.dias === 1) return nome;
  return `${d.dia} de ${nome}, ano ${d.ano}`;
}

/* ── CARREGANDO — um texto só, em toda página ──────────────────────
   Decisão do usuário, 12/09/2026: "padronize o texto de carregamento de todas
   as páginas, e adicione uma animação nele."

   Havia NOVE textos diferentes para a mesma espera — "Consultando os
   grimórios…", "Consultando o bestiário…", "Carregando fichas…",
   "Carregando os itens…", "Consultando…" e por aí. Cada tela inventava o seu,
   e o usuário aprendia que espera é uma coisa diferente em cada lugar.

   Um texto só, uma animação só. Quem quiser dizer O QUE está carregando usa
   `oQue` — mas o padrão é não dizer, porque na prática quem espera já sabe em
   que tela está.

   `role="status"` e `aria-live` para leitor de tela anunciar sem roubar o
   foco; o selo é decorativo e fica escondido dele.

   O SELO (12/09/2026): "faça uma tela de carregamento mais bonita, com estilo
   medieval entre uma página e outra". Continua um texto só — o pedido anterior
   segue de pé —, agora dentro de um selo de bronze: um anel de runas que gira
   devagar, um arco dourado que corre por dentro dele (é o arco que diz "está
   carregando"; o anel lento é só ornamento) e a marca do sistema no centro,
   acesa e respirando. Embaixo, um filete com losango e o texto em Cinzel.

   O selo aparece com um pequeno atraso (ver .mn-carregando no CSS): a maioria
   das páginas carrega em menos de um instante, e um selo que pisca e some a
   cada troca de página cansa mais do que a espera.

   `compacto` é para quem espera dentro de um modal pequeno: selo menor, sem
   filete, altura mínima menor. */
function Carregando({ lang, oQue, compacto }) {
  const txt = lang === 'en' ? 'Loading' : 'Carregando';
  // 8 losangos no anel externo, um a cada 45°.
  const estrelas = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <div className={'mn-carregando' + (compacto ? ' mn-carregando--compacto' : '')} role="status" aria-live="polite">
      <div className="mn-carregando-selo" aria-hidden="true">
        <svg viewBox="0 0 120 120" className="mn-carregando-svg">
          <g className="mn-carregando-anel">
            <circle cx="60" cy="60" r="55" className="mn-carregando-linha" />
            <circle cx="60" cy="60" r="49" className="mn-carregando-runas" />
            {estrelas.map((a) => (
              <path key={a} d="M60 0 L64 5 L60 10 L56 5 Z" transform={`rotate(${a} 60 60)`} className="mn-carregando-losango" />
            ))}
          </g>
          <circle cx="60" cy="60" r="41" className="mn-carregando-trilho" />
          <circle cx="60" cy="60" r="41" className="mn-carregando-arco" pathLength="100" />
          <circle cx="60" cy="60" r="33" className="mn-carregando-miolo" />
        </svg>
        <i className="ti ti-currency-monero mn-carregando-marca" />
      </div>
      {!compacto && (
        <div className="mn-carregando-filete" aria-hidden="true">
          <span /><i /><span />
        </div>
      )}
      <div className="mn-carregando-txt">
        {oQue ? `${txt} ${oQue}` : txt}
        <span className="mn-carregando-pontos" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>
      </div>
    </div>
  );
}

// ── useTweaks ───────────────────────────────────────────────────────────────
// Fonte única de verdade pros valores do tweak. setTweak persiste via host
// (__edit_mode_set_keys → host reescreve o bloco EDITMODE em disco).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Aceita tanto setTweak('chave', valor) quanto setTweak({ chave: valor, ... }) pra
  // que uma chamada estilo useState não escreva uma chave "[object Object]" no JSON
  // persistido.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null
      ? keyOrEdits : { [keyOrEdits]: val };
    setValues((prev) => ({ ...prev, ...edits }));
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*');
    // Sinal na mesma janela pra que listeners in-page (thumbnails de rail do deck-stage)
    // possam reagir — a mensagem do parent só chega no host, não nos peers.
    window.dispatchEvent(new CustomEvent('tweakchange', { detail: edits }));
  }, []);
  return [values, setTweak];
}

// ── useTooltip ───────────────────────────────────────────────────────────────
// Hook que gerencia o estado de um tooltip: posição (x, y) + conteúdo livre.
// Retorna [tip, abrirTip, fecharTip] onde:
//   tip       — { x, y, content } | null
//   abrirTip  — (e, content) => void  (e = MouseEvent ou elemento com getBoundingClientRect)
//   fecharTip — () => void  (com delay curto pra não fechar ao ir pro próprio tip)
function useTooltip(delay = 80) {
  const [tip, setTip] = useState(null);
  const timer = useRef(null);
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const abrirTip = (e, content) => {
    clear();
    const r = (e?.currentTarget || e?.target || e)?.getBoundingClientRect?.() ?? e;
    const x = r ? (r.left + r.width / 2) : (e?.clientX ?? 0);
    const y = r ? r.top : (e?.clientY ?? 0);
    setTip({ x, y, content });
  };
  const fecharTip = () => { clear(); timer.current = setTimeout(() => setTip(null), delay); };
  const manterTip = () => clear();
  useEffect(() => () => clear(), []);
  return [tip, abrirTip, fecharTip, manterTip];
}

// ── Tooltip — componente visual (renderizado via portal no body) ─────────────
// Props:
//   tip      — objeto { x, y, content } vindo do useTooltip
//   onEnter  — manterTip (evita fechar ao passar o mouse no próprio tip)
//   onLeave  — fecharTip
//
// `content` pode ser:
//   • string simples → vira <span> no título
//   • { title, desc, stats, hint } → layout rico (igual ao fp-item-tip original)
//     stats = [{ label, value }]
// ── Tooltip — componente visual sem portal ───────────────────────────────────
// Renderiza inline (position:fixed) — mesmo comportamento do fp-item-tip
// original, sem depender de ReactDOM.createPortal.
// `content` pode ser:
//   • string simples → só título
//   • { title, desc, stats, hint } → layout rico
//     stats = [{ label, value }]
/* `abaixo` (20/09/2026): abre o balão PARA BAIXO da âncora, em vez de para
   cima. Serve a quem tem o botão colado na borda de cima de um card — o balão
   subindo cobre a própria borda do card, e foi assim que o filete de gradiente
   do card de histórias "sumia" no hover (cinco relatos até a causa aparecer).

   Não é um flip novo: reusa o `data-tip-flip="below"` que o CSS já desenha,
   com seta para cima e tudo, e que o TooltipFlipGuard da ficha aplica sozinho
   quando o balão sairia pelo topo da viewport. A diferença é que aqui a
   decisão é FIXA, não medida — o botão está sempre no alto do card. */
function Tooltip({ tip, onEnter, onLeave, abaixo = false }) {
  if (!tip) return null;
  const { x, y, content } = tip;
  const rich = content && typeof content === 'object' && !React.isValidElement(content);
  return (
    <div
      className="mn-tip"
      data-tip-flip={abaixo ? 'below' : undefined}
      style={{ position: 'fixed', left: x, top: y }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {rich ? (
        <>
          {content.title && <div className="mn-tip-title">{content.title}</div>}
          {content.desc  && <p   className="mn-tip-desc">{content.desc}</p>}
          {content.stats && content.stats.length > 0 && (
            <div className="mn-tip-stats">
              {content.stats.map((s, i) => (
                <span key={i} className="mn-tip-stat">{s.label} <b>{s.value}</b></span>
              ))}
            </div>
          )}
          {content.hint && <div className="mn-tip-hint">{content.hint}</div>}
        </>
      ) : React.isValidElement(content) ? content : (
        <div className="mn-tip-title">{content}</div>
      )}
    </div>
  );
}

// ── propsTip ─────────────────────────────────────────────────────────────────
// Espalha os handlers de um tooltip num elemento, no lugar do atributo `title`
// nativo (padronização de 08/09/2026 — o `title` do navegador ignora o nosso
// CSS: fonte do sistema, fundo claro, atraso próprio e nenhum estilo possível).
//
// Uso:  <button {...propsTip(abrirTip, fecharTip, 'Pontos insuficientes')}>
//
// `content` aceita o mesmo que o Tooltip: string ou { title, desc, stats, hint }.
// Conteúdo vazio devolve {} — assim um `title` condicional (title={bloqueio ||
// ''}) não abre balão em branco, que era o comportamento do nativo.
//
// Inclui foco/blur além do mouse: quem navega por teclado nunca via o `title`.
function propsTip(abrirTip, fecharTip, content) {
  const vazio = content == null || content === '' || content === false
    || (typeof content === 'object' && !React.isValidElement(content)
        && !content.title && !content.desc && !content.hint
        && !(content.stats && content.stats.length));
  if (vazio) return {};
  const abrir = (e) => abrirTip(e, content);
  return { onMouseEnter: abrir, onMouseLeave: fecharTip, onFocus: abrir, onBlur: fecharTip };
}

Object.assign(window, { calcDiaSemanaFantasy, feriadoDe, useTweaks, useTooltip, Tooltip, propsTip, Carregando,
  somarDiasFantasy, dataFantasyParaAbsoluto, absolutoParaDataFantasy, formatarDataFantasy,
  FANTASY_DIAS_ANO });

// ── interpolate ──────────────────────────────────────────────────────────────
// Substitui placeholders {chave} numa string de copy (t.algumaCoisa.texto)
// pelos valores de `vars`. Usado pelas fases que migraram pra t.* mas ainda
// precisam de strings com variável (ex.: t.convites.mng.falhouComMotivo =
// 'Falhou: {motivo}' -> interpolate(str, { motivo: 'expirado' })).
// Chave sem valor correspondente em vars é substituída por string vazia
// (silencioso, não lança erro) — evita "[object Object]" ou {undefined}
// vazando pra UI se algum caller esquecer uma variável.
function interpolate(str, vars) {
  if (!str) return str;
  return str.replace(/\{(\w+)\}/g, (_, key) => (vars && vars[key] !== undefined ? vars[key] : ''));
}

Object.assign(window, { interpolate });

// ── corCondicao / COND_LIMITE ─────────────────────────────────────────────
// Sistema de condições (Saúde, Sono, Hidratação, Alimentação, Temperatura,
// Sobriedade, Sanidade, Reputação) migrou de escala 0–100 (100 = pleno) pra
// escala bidirecional -COND_LIMITE..+COND_LIMITE com 0 = neutro. Cor é só
// pelo SINAL do valor — não por nível/percentual: negativo vermelho,
// positivo verde, zero neutro (tom aço já usado em FICHA_VIT_COLORS.ar,
// pra combinar com a paleta "Pedra & Bronze"). Compartilhado entre
// 11-ficha/ficha.jsx e 12-batalha/batalha.jsx pra nunca divergir a cor de
// uma condição entre as duas telas.
const COND_LIMITE = 50;
function corCondicao(val) {
  const v = Number(val) || 0;
  if (v > 0) return '#00850f';
  if (v < 0) return '#870000';
  return '#8c8d8e';
}

Object.assign(window, { corCondicao, COND_LIMITE });
/* ============================================================
   QuantidadeStepper — O seletor de quantidade do sistema
   ============================================================
   "O seletor de quantidade padrão do nosso sistema é o que está sendo usado na
    hora de clicar em uma barra de ef, eh, etc. Por isso, onde houver seletor de
    quantidade, use esse design. Seja para selecionar quantidade de itens,
    status, loja." (usuário, 17/09/2026)

   Havia CINCO desenhos diferentes para a mesma pergunta — "quantos?":

     1. .fp-pop-stepper, do BarEditPopover (11-ficha) — este, o eleito;
     2. .qty-stepper-pill, do QuantityStepper (12-batalha), copiado tal e qual
        em 13-diario — quase igual ao primeiro, com borda e 8px mais baixo;
     3. um pill de estilo inline dentro do modal de quantidade do inventário,
        com uma fileira de chips de atalho por baixo;
     4. a loja, que não era stepper: dois botões com uma BARRA arrastável no
        meio, como um controle de volume;
     5. o modal de status, que era um <input type="number"> nu.

   Cinco perguntas iguais com cinco respostas diferentes. Agora é um componente
   só, aqui na fase 01 — que carrega antes de todas as outras, então ninguém
   precisa copiá-lo de novo para usá-lo.

   `centro` permite o texto do meio: a ficha mostra "12 / 18", o inventário
   "3 de 5", o modal de status só o número. Quando não vem, mostra o valor.
   ============================================================ */
function QuantidadeStepper({
  value, onChange, min = 0, max = Infinity, step = 1,
  centro, disabled, label, className,
}) {
  const v = Number(value) || 0;
  const podeDec = !disabled && v > min;
  const podeInc = !disabled && v < max;
  const ir = (alvo) => onChange(Math.max(min, Math.min(max, alvo)));
  return (
    <div className={'fp-pop-stepper' + (className ? ' ' + className : '')}
      role="group" aria-label={label || undefined}>
      <button type="button" className="fp-step-btn" disabled={!podeDec}
        /* onMouseDown/preventDefault: sem isto o clique tira o foco do campo
           que abriu o stepper e alguns popovers se fechavam sozinhos. */
        onMouseDown={(e) => e.preventDefault()} onClick={() => ir(v - step)} aria-label="-">
        <i className="ti ti-minus" aria-hidden="true" />
      </button>
      <span className="fp-pop-stepper-label">{centro == null ? v : centro}</span>
      <button type="button" className="fp-step-btn" disabled={!podeInc}
        onMouseDown={(e) => e.preventDefault()} onClick={() => ir(v + step)} aria-label="+">
        <i className="ti ti-plus" aria-hidden="true" />
      </button>
    </div>
  );
}

Object.assign(window, { QuantidadeStepper });
