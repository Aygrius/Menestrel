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
/* SeloMenestrel — a marca do sistema (22/10/2026). Antes era o ícone Tabler
   ti-currency-monero, que é o símbolo de uma criptomoeda; o usuário escolheu
   um monograma em selo de cera. É SVG desenhado (não fonte) para sair igual
   no login, no menu, na tela de carregamento e na aba do navegador
   (public/favicon.svg repete o mesmo desenho).

   A borda da cera é irregular de propósito — cera derramada não é círculo. Os
   ids dos degradês saem de useId: o selo aparece mais de uma vez na página. */
function SeloMenestrel({ size = 32, className = '', titulo = null }) {
  const id = React.useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={'mn-selo ' + className}
      role={titulo ? 'img' : undefined} aria-label={titulo || undefined} aria-hidden={titulo ? undefined : 'true'}>
      <defs>
        <radialGradient id={id + 'c'} cx="38%" cy="32%" r="72%">
          <stop offset="0" stopColor="#B4472C" />
          <stop offset="0.55" stopColor="#8A2E1C" />
          <stop offset="1" stopColor="#5C1B10" />
        </radialGradient>
      </defs>
      <path fill={`url(#${id}c)`} d="M61.4 32.0C61.4 34.8 61.3 37.9 60.2 40.3C59.1 42.7 56.1 44.3 54.6 46.5C53.0 48.8 52.8 52.2 50.9 53.9C49.1 55.6 45.8 55.4 43.3 56.8C40.9 58.1 38.9 61.5 36.3 62.1C33.8 62.6 30.6 61.0 27.9 60.2C25.3 59.5 22.7 58.8 20.3 57.6C17.9 56.5 15.5 55.1 13.6 53.2C11.7 51.4 10.9 48.8 9.1 46.7C7.3 44.6 3.7 43.0 2.8 40.6C2.0 38.1 3.8 34.8 4.0 32.0C4.1 29.2 2.8 26.1 3.7 23.7C4.6 21.3 7.6 19.6 9.3 17.4C11.0 15.3 11.9 12.8 13.6 10.8C15.4 8.8 17.4 6.5 19.8 5.3C22.2 4.1 25.2 4.3 27.9 3.8C30.7 3.3 33.8 1.6 36.3 2.3C38.8 3.0 40.6 6.6 43.0 7.9C45.4 9.2 48.8 8.7 50.9 10.2C52.9 11.7 53.9 14.7 55.4 16.9C57.0 19.2 59.4 21.2 60.4 23.7C61.4 26.2 61.4 29.2 61.4 32.0Z" />
      {/* O anel prensado: sombra por dentro, brilho por fora. */}
      <circle cx="32" cy="32" r="21.5" fill="none" stroke="#4A140B" strokeOpacity="0.55" strokeWidth="2.2" />
      <circle cx="32" cy="32.8" r="21.5" fill="none" stroke="#E9A27E" strokeOpacity="0.22" strokeWidth="1" />
      {/* O monograma: um M de capitular, com serifas, em ouro. */}
      <path d="M21.5 41.5V23.5L32 36.5L42.5 23.5V41.5M18.5 41.5h6M39.5 41.5h6M18.5 23.5h3M42.5 23.5h3"
        fill="none" stroke="#E0BE68" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

/* useAlvoPortal — acha um elemento do DOM por id para servir de destino de
   portal, mesmo quando ele nasce no MESMO commit de quem o procura (no
   primeiro render ainda não está no DOM; o efeito tenta de novo e, achando,
   rerenderiza). Usado pela barra de ações da ficha (22/10/2026). */
function useAlvoPortal(id) {
  const [alvo, setAlvo] = React.useState(() => (typeof document !== 'undefined' ? document.getElementById(id) : null));
  React.useEffect(() => {
    const el = document.getElementById(id);
    if (el !== alvo) setAlvo(el);
  });
  return alvo;
}

/* CARREGANDO — opção A, "Respira" (23/10/2026, escolhida na prévia): o selo
   novo grande no centro (132px; 72px no compacto), pulsando devagar, e um
   arco de ouro correndo num trilho em volta. Saíram o anel de runas, os
   losangos e o filete. Parado para quem pede menos movimento. */
function Carregando({ lang, oQue, compacto }) {
  const txt = lang === 'en' ? 'Loading' : 'Carregando';
  return (
    <div className={'mn-carregando' + (compacto ? ' mn-carregando--compacto' : '')} role="status" aria-live="polite">
      <div className="mn-carregando-selo" aria-hidden="true">
        <svg viewBox="0 0 168 168" className="mn-carregando-svg">
          <circle cx="84" cy="84" r="80" className="mn-carregando-trilho" />
          <circle cx="84" cy="84" r="80" className="mn-carregando-arco" />
        </svg>
        <SeloMenestrel className="mn-carregando-marca" size={compacto ? 72 : 132} />
      </div>
      <div className="mn-carregando-txt">{oQue ? `${txt} ${oQue}` : txt}</div>
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
    // lx/ly: a borda esquerda e o meio da âncora — para o balão à esquerda.
    const lx = r ? r.left : x;
    const ly = r ? (r.top + (r.height || 0) / 2) : y;
    setTip({ x, y, lx, ly, content });
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
/* `esquerda` (26/09/2026): abre o balão À ESQUERDA da âncora, centrado na
   altura dela — para o que mora colado à borda direita da tela (os atalhos
   flutuantes da ficha: "Tooltips para a esquerda"). */
function Tooltip({ tip, onEnter, onLeave, abaixo = false, esquerda = false }) {
  if (!tip) return null;
  const { x, y, content } = tip;
  const rich = content && typeof content === 'object' && !React.isValidElement(content);
  const pos = esquerda && tip.lx != null ? { left: tip.lx, top: tip.ly } : { left: x, top: y };
  return (
    <div
      className="mn-tip"
      data-tip-flip={esquerda ? 'left' : (abaixo ? 'below' : undefined)}
      style={{ position: 'fixed', ...pos }}
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

// ── Pilha de janelas: a aberta por ÚLTIMO fica na frente ─────────────────────
/* 26/09/2026: "Ao clicar em usar item, e depois clicar em excluir, o modal
   fica atrás." O ModalShell (quantidade, confirmações) é desenhado onde é
   chamado; o BestDetalheModal (item, magia…) vai por portal para o fim da
   página. Com a mesma camada (z-index 120), ganhava quem vinha depois NO
   DOCUMENTO — e a janela nova abria atrás da de detalhe.
   Agora cada janela, ao abrir, recebe um número de ordem e sobe uma camada
   acima das abertas: a mais recente fica na frente em qualquer arranjo. O Esc
   fecha só a de ordem mais alta (a da frente), não a última do documento. */
let _ordemJanela = 0;
function empilharJanela(el) {
  if (!el) return;
  const abertas = document.querySelectorAll('.ms-backdrop[data-ordem]').length;
  _ordemJanela += 1;
  el.dataset.ordem = String(_ordemJanela);
  el.style.zIndex = String(120 + abertas + 1);
}
function ehJanelaDaFrente(el) {
  if (!el || !el.dataset.ordem) return true;
  const minha = Number(el.dataset.ordem);
  /* Janela DENTRO de outra (aninhada no React) está sempre acima dela — e o
     React monta a de dentro primeiro, então ela recebe o número menor. Entre
     janelas independentes, vale a ordem de abertura. */
  return ![...document.querySelectorAll('.ms-backdrop[data-ordem]')].some((o) => {
    if (o === el) return false;
    if (el.contains(o)) return true;       // aninhada em mim: está na frente
    if (o.contains(el)) return false;      // eu estou dentro dela
    return Number(o.dataset.ordem) > minha;
  });
}

// ── DicaNoAlvo — um tooltip que aparece SOZINHO sobre um elemento ────────────
/* 26/09/2026: "Ao selecionar um card e ele ficar vermelho, mostre um tooltip
   dizendo 'clique aqui novamente para usar'." Não depende de hover: aparece
   enquanto o card estiver marcado. Usa o mesmo balão (Tooltip, position:
   fixed), então não é cortado pela borda do corpo do modal. Acompanha rolagem
   e redimensionamento. `alvo` é o elemento (via ref callback). */
function DicaNoAlvo({ alvo, texto }) {
  const [pos, setPos] = useState(null);
  React.useLayoutEffect(() => {
    if (!alvo) { setPos(null); return undefined; }
    const medir = () => {
      if (!alvo.isConnected) { setPos(null); return; }
      const r = alvo.getBoundingClientRect();
      setPos({ x: r.left + r.width / 2, y: r.top });
    };
    medir();
    window.addEventListener('scroll', medir, true);
    window.addEventListener('resize', medir);
    return () => { window.removeEventListener('scroll', medir, true); window.removeEventListener('resize', medir); };
  }, [alvo]);
  if (!pos || !texto) return null;
  return <Tooltip tip={{ x: pos.x, y: pos.y, content: texto }} />;
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
  /* Sem balão nos trilhos de ações da ficha (23/10/2026: "Remova o tooltip do
     trilho do personagem"): ali todo botão já diz o próprio nome. */
  const abrir = (e) => {
    const el = e && e.currentTarget;
    if (el && el.closest && el.closest('.mc-acoes-ficha, .fp-abas-trilho')) return;
    abrirTip(e, content);
  };
  return { onMouseEnter: abrir, onMouseLeave: fecharTip, onFocus: abrir, onBlur: fecharTip };
}

Object.assign(window, { calcDiaSemanaFantasy, useTweaks, useTooltip, Tooltip, DicaNoAlvo, empilharJanela, ehJanelaDaFrente, propsTip, Carregando, SeloMenestrel, useAlvoPortal,
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
/* ESCALA NOVA (27/09/2026): "Agora as barras vão de 0 a 100. 0 é o mundo
   ideal e 100 é o pior cenário. Todas as barras de vitalidade são roxas."
   COND_LIMITE é o TETO (100). A Temperatura é a única com sinal: −100 (frio)
   a +100 (calor); a ficha a desenha como duas barras (Frio e Calor). */
const COND_LIMITE = 100;
const COND_ROXO = '#8E5BD6';
function corCondicao() {
  return COND_ROXO;
}

Object.assign(window, { corCondicao, COND_LIMITE, COND_ROXO });
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

   `propsMenos`/`propsMais` vão para os botões: o assistente de personagem
   pendura neles o tooltip de "Pontos insuficientes" (22/10/2026).
   ============================================================ */
function QuantidadeStepper({
  value, onChange, min = 0, max = Infinity, step = 1,
  centro, disabled, label, className, propsMenos, propsMais,
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
        onMouseDown={(e) => e.preventDefault()} onClick={() => ir(v - step)} aria-label="-" {...propsMenos}>
        <i className="ti ti-minus" aria-hidden="true" />
      </button>
      <span className="fp-pop-stepper-label">{centro == null ? v : centro}</span>
      <button type="button" className="fp-step-btn" disabled={!podeInc}
        onMouseDown={(e) => e.preventDefault()} onClick={() => ir(v + step)} aria-label="+" {...propsMais}>
        <i className="ti ti-plus" aria-hidden="true" />
      </button>
    </div>
  );
}

Object.assign(window, { QuantidadeStepper });

/* primeiroNome — o nome no LOG DA MESA (27/09/2026): "No nome, identifique
   sempre com o primeiro nome, mesmo para criaturas." "Lirael Vel'Thalas" →
   "Lirael"; "Lobo Adulto" → "Lobo". */
function primeiroNome(nome) {
  const n = String(nome == null ? '' : nome).trim();
  const partes = n.split(/\s+/);
  const primeiro = partes[0] || n;
  // O número do bando fica ("Lobo Adulto 2" → "Lobo 2"), senão dois lobos
  // viram o mesmo "Lobo" no log.
  const ultimo = partes[partes.length - 1];
  return partes.length > 1 && /^\d+$/.test(ultimo) ? `${primeiro} ${ultimo}` : primeiro;
}
Object.assign(window, { primeiroNome });
