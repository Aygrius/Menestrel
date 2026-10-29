/* ============================================================
   SHELL — Componentes raiz da aplicação
   ============================================================
   O último arquivo da árvore de extração. Concentra tudo que
   ainda não tinha tema próprio:

   - FantasyDatePicker — campo de data do mundo (abre o calendário
                         do mundo, com dia da semana e feriados).
   - CampoData         — campo de data real ('AAAA-MM-DD'), digitável,
                         com o mesmo quadro de calendário.
   - Icon              — namespace de ícones SVG ornamentais
                         (Skull, Sword, Crown, Flame, ...). É o
                         único símbolo deste arquivo exposto também
                         via `window.Icon` pra consumo retrocompat.
   - AdminEmpty        — estado vazio reutilizável (com ornamento)
   - AdminConsole      — layout principal do console (sidebar com
                         abas + main com a aba ativa). Onde quase
                         todas as features extraídas se encontram.
   - App               — raiz da aplicação. Estado de auth, callbacks
                         OAuth e a bifurcação login/console: deslogado
                         vê a LoginPage (04-auth), logado vê o console.
                         A lógica de auth foi mantida inline (decisão de
                         não refatorar agora — `useAuth` fica pra depois).

   Depende de:
   - Tudo o que foi extraído nas fases anteriores (LoginPage,
     ConvitesJogador, ItensList, etc).
   - TWEAKS_DEFAULTS (no app.jsx, último script) — resolvido em
     runtime quando App() é renderizado.

   Carregar imediatamente antes do app.jsx (que só tem TWEAKS_DEFAULTS
   + bootstrap ReactDOM).
   ============================================================ */



// ─── Calendários: CampoData (data real) e FantasyDatePicker (data do mundo) ───
/* 22/10/2026 — "Os seletores de data, fictício ou não, podem ser melhores,
   uma versão melhorada da versão de seletor de data do navegador" (usuário).

   Antes eram duas coisas sem parentesco: o <input type="date"> nativo (cada
   navegador desenha um calendário diferente, em claro, fora da identidade) e
   o FantasyDatePicker como quatro pílulas soltas — dia, mês, dia da semana e
   ano —, sem nunca mostrar o MÊS como mês. Agora os dois são um campo só que
   abre o mesmo quadro de calendário: grade da semana, dia escolhido em ouro,
   setas para andar de mês, o título que vira a lista de meses, o ano
   editável no cabeçalho e o teclado de um calendário de verdade (setas,
   PageUp/PageDown, Home/End, Enter, Esc).

   O que o navegador não faz e este faz: o calendário do mundo mostra o dia
   da semana do mundo e os FERIADOS (ponto no dia, nome no rodapé); a data
   real se digita direto (dd/mm/aaaa) ou se escolhe no quadro.

   Navegar no quadro NÃO muda o valor — só escolher um dia muda. */

/* O quadro abre num portal com position:fixed: os modais têm overflow e o
   cortariam. Abre embaixo do campo; sem espaço, abre em cima. O clique fora
   e o Esc fecham — o Esc é capturado antes do modal, para fechar só o
   calendário e não a janela inteira. */
function CalPopover({ anchorRef, onClose, children, rotulo }) {
  const [pos, setPos] = React.useState(null);
  const boxRef = React.useRef(null);

  React.useLayoutEffect(() => {
    const posicionar = () => {
      const a = anchorRef.current; const b = boxRef.current;
      if (!a) return;
      const r = a.getBoundingClientRect();
      const w = b ? b.offsetWidth : 328; const h = b ? b.offsetHeight : 360;
      const vw = window.innerWidth; const vh = window.innerHeight;
      let top = r.bottom + 6;
      if (top + h > vh - 8 && r.top - h - 6 > 8) top = r.top - h - 6;
      const left = Math.max(8, Math.min(r.left, vw - w - 8));
      setPos({ top, left });
    };
    posicionar();
    const id = requestAnimationFrame(posicionar);   // mede de novo já com o tamanho real
    window.addEventListener('resize', posicionar);
    window.addEventListener('scroll', posicionar, true);
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', posicionar); window.removeEventListener('scroll', posicionar, true); };
  }, [anchorRef]);

  React.useEffect(() => {
    const fora = (e) => {
      if (anchorRef.current && anchorRef.current.contains(e.target)) return;
      if (boxRef.current && boxRef.current.contains(e.target)) return;
      onClose(false);
    };
    const esc = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation(); e.preventDefault();
      onClose(true);
    };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc, true);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc, true); };
  }, [anchorRef, onClose]);

  const alvo = document.querySelector('.menestrel-ui') || document.body;
  return ReactDOM.createPortal(
    <div ref={boxRef} className="cal-pop" role="dialog" aria-label={rotulo}
      style={{ top: pos ? pos.top : -9999, left: pos ? pos.left : -9999, visibility: pos ? 'visible' : 'hidden' }}>
      {children}
    </div>,
    alvo
  );
}

/* QuadroCalendario — o quadro em si, sem saber de que calendário se trata.
   Quem chama diz quantos dias o mês tem, em que coluna cai o dia 1, os nomes
   das colunas e dos meses, e o que marcar. */
function QuadroCalendario({
  lang, mes, ano, meses, semana, inicio, totalDias, anoMin = null,
  selecionado = null, hoje = null, marcas = null, rotuloDia, diasDe,
  onMes, onAno, onEscolher, rodape = null, acoes = null,
}) {
  const en = lang === 'en';
  const [modo, setModo] = React.useState('dias');   // 'dias' | 'meses'
  const [foco, setFoco] = React.useState(selecionado || hoje || 1);
  const [anoTxt, setAnoTxt] = React.useState(String(ano));
  const gradeRef = React.useRef(null);
  const focarDepois = React.useRef(true);

  React.useEffect(() => { setAnoTxt(String(ano)); }, [ano]);
  React.useEffect(() => { setFoco((f) => Math.min(Math.max(1, f), totalDias)); }, [totalDias]);
  React.useEffect(() => {
    if (!focarDepois.current || modo !== 'dias') return;
    focarDepois.current = false;
    const b = gradeRef.current && gradeRef.current.querySelector('[data-dia="' + foco + '"]');
    if (b) b.focus({ preventScroll: true });
  }, [foco, modo, mes, ano]);

  const nMeses = meses.length;
  const andar = (delta) => {
    let m = mes + delta; let a = ano;
    if (m < 1) { m = nMeses; a -= 1; }
    if (m > nMeses) { m = 1; a += 1; }
    if (anoMin != null && a < anoMin) return null;
    onMes(m, a);
    return { m, a };
  };
  const confirmarAno = () => {
    const n = parseInt(anoTxt, 10);
    if (Number.isNaN(n) || (anoMin != null && n < anoMin)) { setAnoTxt(String(ano)); return; }
    if (n !== ano) onAno(n);
  };

  const teclado = (e) => {
    const mover = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    let alvo = null;
    if (mover) alvo = foco + mover;
    else if (e.key === 'Home') alvo = 1;
    else if (e.key === 'End') alvo = totalDias;
    else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault(); focarDepois.current = true; andar(e.key === 'PageUp' ? -1 : 1); return;
    } else return;
    e.preventDefault();
    focarDepois.current = true;
    // Passou da borda do mês: vira o mês e cai no dia correspondente dele.
    if (alvo < 1) { const v = andar(-1); if (v) setFoco(Math.max(1, diasDe(v.m, v.a) + alvo)); return; }
    if (alvo > totalDias) { const v = andar(1); if (v) setFoco(Math.min(diasDe(v.m, v.a), alvo - totalDias)); return; }
    setFoco(alvo);
  };

  const celulas = [];
  for (let i = 0; i < inicio; i++) celulas.push(<span key={'v' + i} className="cal-vazio" aria-hidden="true" />);
  for (let d = 1; d <= totalDias; d++) {
    const nomes = marcas ? marcas(d) : null;
    celulas.push(
      <button key={d} type="button" data-dia={d} tabIndex={d === foco ? 0 : -1}
        className={'cal-dia' + (d === selecionado ? ' is-escolhido' : '') + (d === hoje ? ' is-hoje' : '') + (nomes && nomes.length ? ' tem-marca' : '')}
        aria-pressed={d === selecionado}
        aria-label={rotuloDia(d) + (nomes && nomes.length ? ' — ' + nomes.join(', ') : '')}
        onFocus={() => setFoco(d)} onMouseEnter={() => setFoco(d)}
        onClick={() => onEscolher(d)}>
        {d}
      </button>
    );
  }

  const nomesFoco = marcas ? marcas(foco) : null;
  return (
    <div className="cal-quadro">
      <div className="cal-topo">
        <button type="button" className="cal-titulo" aria-expanded={modo === 'meses'}
          onClick={() => setModo((m) => (m === 'dias' ? 'meses' : 'dias'))}>
          <span>{meses[mes - 1]?.nome}</span>
          <i className="ti ti-chevron-down" aria-hidden="true" />
        </button>
        <input className="cal-ano" type="text" inputMode="numeric" value={anoTxt}
          aria-label={en ? 'Year' : 'Ano'}
          onChange={(e) => setAnoTxt(e.target.value.replace(/[^0-9-]/g, ''))}
          onBlur={confirmarAno}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); confirmarAno(); }
            if (e.key === 'ArrowUp') { e.preventDefault(); onAno(ano + 1); }
            if (e.key === 'ArrowDown' && (anoMin == null || ano - 1 >= anoMin)) { e.preventDefault(); onAno(ano - 1); }
          }} />
        <div className="cal-setas">
          <button type="button" className="cal-seta" aria-label={en ? 'Previous month' : 'Mês anterior'}
            disabled={anoMin != null && ano <= anoMin && mes === 1} onClick={() => andar(-1)}>
            <i className="ti ti-chevron-left" aria-hidden="true" />
          </button>
          <button type="button" className="cal-seta" aria-label={en ? 'Next month' : 'Próximo mês'} onClick={() => andar(1)}>
            <i className="ti ti-chevron-right" aria-hidden="true" />
          </button>
        </div>
      </div>

      {modo === 'meses' ? (
        <div className={'cal-meses' + (nMeses > 12 ? ' cal-meses--13' : '')}>
          {meses.map((m) => (
            <button key={m.n} type="button" className={'cal-mes' + (m.n === mes ? ' is-escolhido' : '')}
              aria-pressed={m.n === mes}
              onClick={() => { focarDepois.current = true; onMes(m.n, ano); setModo('dias'); }}>
              {m.curto || m.nome}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="cal-semana" aria-hidden="true">
            {semana.map((s, i) => <span key={i}>{s.curto}</span>)}
          </div>
          <div className="cal-grade" ref={gradeRef} role="group" aria-label={(meses[mes - 1]?.nome || '') + ' ' + ano} onKeyDown={teclado}>
            {celulas}
          </div>
          {marcas && (
            <p className="cal-marca-txt" aria-live="polite">
              {nomesFoco && nomesFoco.length ? <><i className="ti ti-star" aria-hidden="true" /> {nomesFoco.join(' · ')}</> : ' '}
            </p>
          )}
        </>
      )}

      {(rodape || acoes) && (
        <div className="cal-rodape">
          <span className="cal-rodape-txt">{rodape}</span>
          {acoes}
        </div>
      )}
    </div>
  );
}

/* ── CampoData — data REAL, valor 'AAAA-MM-DD' (o mesmo do input nativo, para
   trocar um pelo outro sem mexer em quem grava). Digita-se dd/mm/aaaa (ou
   mm/dd/yyyy em inglês) ou escolhe-se no quadro. */
const MESES_REAIS = {
  pt: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const SEMANA_REAL = {
  pt: ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
function isoDeData(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function partesDeIso(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) return null;
  const a = +m[1], mes = +m[2], d = +m[3];
  if (mes < 1 || mes > 12 || d < 1 || d > new Date(a, mes, 0).getDate()) return null;
  return { a, mes, d };
}
function textoDeIso(s, en) {
  const p = partesDeIso(s);
  if (!p) return '';
  const dd = String(p.d).padStart(2, '0'), mm = String(p.mes).padStart(2, '0');
  return en ? `${mm}/${dd}/${p.a}` : `${dd}/${mm}/${p.a}`;
}
function isoDeTexto(t, en) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((t || '').trim());
  if (!m) return null;
  const [d, mes] = en ? [+m[2], +m[1]] : [+m[1], +m[2]];
  const iso = m[3] + '-' + String(mes).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  return partesDeIso(iso) ? iso : null;
}
// Põe as barras sozinho enquanto se digita: "23102026" → "23/10/2026".
function mascaraData(t) {
  const n = t.replace(/\D/g, '').slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return n.slice(0, 2) + '/' + n.slice(2);
  return n.slice(0, 2) + '/' + n.slice(2, 4) + '/' + n.slice(4);
}

function CampoData({ value, onChange, lang = 'pt', disabled = false, id, 'aria-label': ariaLabel }) {
  const en = lang === 'en';
  const [txt, setTxt] = React.useState(textoDeIso(value, en));
  const [invalido, setInvalido] = React.useState(false);
  const [aberto, setAberto] = React.useState(false);
  const campoRef = React.useRef(null);
  const botaoRef = React.useRef(null);
  const p = partesDeIso(value);
  const agora = new Date();
  const [vista, setVista] = React.useState({ mes: p ? p.mes : agora.getMonth() + 1, ano: p ? p.a : agora.getFullYear() });

  React.useEffect(() => { setTxt(textoDeIso(value, en)); setInvalido(false); }, [value, en]);

  const confirmar = () => {
    if (!txt.trim()) { setInvalido(false); if (value) onChange(''); return; }
    const iso = isoDeTexto(txt, en);
    if (!iso) { setInvalido(true); return; }
    setInvalido(false);
    if (iso !== value) onChange(iso);
  };
  const abrir = () => {
    if (disabled) return;
    const q = partesDeIso(value);
    setVista({ mes: q ? q.mes : agora.getMonth() + 1, ano: q ? q.a : agora.getFullYear() });
    setAberto(true);
  };
  const fechar = React.useCallback((devolverFoco) => {
    setAberto(false);
    if (devolverFoco && botaoRef.current) botaoRef.current.focus();
  }, []);

  const nomesMes = MESES_REAIS[en ? 'en' : 'pt'];
  const nomesSemana = SEMANA_REAL[en ? 'en' : 'pt'];
  const ehVistaAtual = (q) => q && q.mes === vista.mes && q.a === vista.ano;
  const hojeP = { a: agora.getFullYear(), mes: agora.getMonth() + 1, d: agora.getDate() };
  const escolher = (d) => {
    onChange(vista.ano + '-' + String(vista.mes).padStart(2, '0') + '-' + String(d).padStart(2, '0'));
    fechar(true);
  };
  const legivel = p
    ? (en ? `${nomesSemana[new Date(p.a, p.mes - 1, p.d).getDay()]}, ${nomesMes[p.mes - 1]} ${p.d}, ${p.a}`
          : `${nomesSemana[new Date(p.a, p.mes - 1, p.d).getDay()]}, ${p.d} de ${nomesMes[p.mes - 1]} de ${p.a}`)
    : null;

  return (
    <div ref={campoRef} className={'cal-campo' + (invalido ? ' is-invalido' : '') + (disabled ? ' is-travado' : '') + (aberto ? ' is-aberto' : '')}>
      <input id={id} className="cal-campo-txt" type="text" inputMode="numeric" autoComplete="off"
        placeholder={en ? 'mm/dd/yyyy' : 'dd/mm/aaaa'} value={txt} disabled={disabled}
        aria-label={ariaLabel} aria-invalid={invalido || undefined}
        onChange={(e) => { setTxt(mascaraData(e.target.value)); setInvalido(false); }}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); confirmar(); }
          if (e.key === 'ArrowDown' && e.altKey) { e.preventDefault(); abrir(); }
        }} />
      <button ref={botaoRef} type="button" className="cal-campo-btn" disabled={disabled}
        aria-label={en ? 'Open calendar' : 'Abrir calendário'} aria-expanded={aberto}
        onClick={() => (aberto ? fechar(false) : abrir())}>
        <i className="ti ti-calendar" aria-hidden="true" />
      </button>
      {aberto && (
        <CalPopover anchorRef={campoRef} onClose={fechar} rotulo={en ? 'Calendar' : 'Calendário'}>
          <QuadroCalendario
            lang={lang} mes={vista.mes} ano={vista.ano}
            meses={nomesMes.map((nome, i) => ({ n: i + 1, nome: nome[0].toUpperCase() + nome.slice(1), curto: (nome[0].toUpperCase() + nome.slice(1, 3)) }))}
            semana={nomesSemana.map((s) => ({ curto: s[0].toUpperCase(), inteiro: s }))}
            inicio={new Date(vista.ano, vista.mes - 1, 1).getDay()}
            totalDias={new Date(vista.ano, vista.mes, 0).getDate()}
            diasDe={(m, a) => new Date(a, m, 0).getDate()}
            anoMin={1}
            selecionado={ehVistaAtual(p) ? p.d : null}
            hoje={ehVistaAtual(hojeP) ? hojeP.d : null}
            rotuloDia={(d) => en ? `${nomesMes[vista.mes - 1]} ${d}, ${vista.ano}` : `${d} de ${nomesMes[vista.mes - 1]} de ${vista.ano}`}
            onMes={(m, a) => setVista({ mes: m, ano: a })}
            onAno={(a) => setVista((v) => ({ ...v, ano: a }))}
            onEscolher={escolher}
            rodape={legivel}
            acoes={<>
              {value && <button type="button" className="cal-acao" onClick={() => { onChange(''); fechar(true); }}>{en ? 'Clear' : 'Limpar'}</button>}
              <button type="button" className="cal-acao cal-acao--forte" onClick={() => { onChange(isoDeData(agora)); fechar(true); }}>{en ? 'Today' : 'Hoje'}</button>
            </>}
          />
        </CalPopover>
      )}
      {invalido && <span className="cal-erro" role="alert">{en ? 'Invalid date' : 'Data inválida'}</span>}
    </div>
  );
}

/* ── FantasyDatePicker — data do MUNDO, valor { dia, mes, ano }. O ano tem
   12 meses de 30 dias e o Dia de Cruine (mês 13, um dia só); a semana tem
   sete dias com nome próprio (FANTASY_WEEKDAYS), e o dia 1 de cada mês cai
   onde calcDiaSemanaFantasy disser.

   `disabled` (12/09/2026): a data de nascimento trava depois que o personagem
   existe — "não devem ficar disponíveis para editar depois de criar o
   personagem, mesmo para o mestre" (usuário). O campo continua visível. */
function FantasyDatePicker({ value, onChange, disabled = false, lang = 'pt' }) {
  const en = lang === 'en';
  const val = value || { dia: 1, mes: 1, ano: 0 };
  const [aberto, setAberto] = React.useState(false);
  const [vista, setVista] = React.useState({ mes: val.mes, ano: val.ano });
  const campoRef = React.useRef(null);
  const botaoRef = React.useRef(null);

  const nomeMes = (n) => FANTASY_MONTHS[n - 1]?.nome || '';
  const semanaDe = (ano, mes, dia) => calcDiaSemanaFantasy(ano, mes, dia);
  const feriados = typeof feriadosDoDia === 'function' ? feriadosDoDia : () => [];
  const abrir = () => { if (disabled) return; setVista({ mes: val.mes, ano: val.ano }); setAberto(true); };
  const fechar = React.useCallback((devolverFoco) => {
    setAberto(false);
    if (devolverFoco && botaoRef.current) botaoRef.current.focus();
  }, []);
  // Cruine não é "de mês": é o próprio dia.
  const extenso = (d, m, a) => (m === 13
    ? `${nomeMes(13)}, ${en ? 'year' : 'ano'} ${a}`
    : `${d} ${en ? 'of' : 'de'} ${nomeMes(m)}, ${en ? 'year' : 'ano'} ${a}`);

  const ehVista = val.mes === vista.mes && val.ano === vista.ano;
  const feriadosVal = feriados(val.dia, val.mes);

  return (
    <div ref={campoRef} className="fdp-campo-wrap">
      <button ref={botaoRef} type="button" className={'cal-campo cal-campo--botao fdp-campo' + (aberto ? ' is-aberto' : '')}
        disabled={disabled} aria-haspopup="dialog" aria-expanded={aberto}
        onClick={() => (aberto ? fechar(false) : abrir())}>
        <span className="cal-campo-valor">{extenso(val.dia, val.mes, val.ano)}</span>
        <span className="cal-campo-semana">{semanaDe(val.ano, val.mes, val.dia)}</span>
        {feriadosVal.length > 0 && <i className="ti ti-star cal-campo-feriado" aria-label={feriadosVal.join(', ')} />}
        <i className="ti ti-calendar cal-campo-icone" aria-hidden="true" />
      </button>
      {aberto && (
        <CalPopover anchorRef={campoRef} onClose={fechar} rotulo={en ? 'World calendar' : 'Calendário do mundo'}>
          <QuadroCalendario
            lang={lang} mes={vista.mes} ano={vista.ano} anoMin={0}
            meses={FANTASY_MONTHS.map((m) => ({ n: m.n, nome: m.nome, curto: m.nome.replace(/^(Mês d[aoe]s? |Dia de )/, '') }))}
            semana={FANTASY_WEEKDAYS.map((s) => ({ curto: s.slice(0, 3), inteiro: s }))}
            inicio={Math.max(0, FANTASY_WEEKDAYS.indexOf(semanaDe(vista.ano, vista.mes, 1)))}
            totalDias={FANTASY_MONTHS[vista.mes - 1]?.dias || 30}
            diasDe={(m) => FANTASY_MONTHS[m - 1]?.dias || 30}
            selecionado={ehVista ? val.dia : null}
            marcas={(d) => feriados(d, vista.mes)}
            rotuloDia={(d) => `${semanaDe(vista.ano, vista.mes, d)}, ${extenso(d, vista.mes, vista.ano)}`}
            onMes={(m, a) => setVista({ mes: m, ano: a })}
            onAno={(a) => setVista((v) => ({ ...v, ano: a }))}
            onEscolher={(d) => { onChange({ dia: d, mes: vista.mes, ano: vista.ano }); fechar(true); }}
            rodape={`${semanaDe(val.ano, val.mes, val.dia)}, ${extenso(val.dia, val.mes, val.ano)}`}
          />
        </CalPopover>
      )}
    </div>
  );
}

/* ============================== [02] Icons — Tabler Icons (via CSS) ============================== */

// Ícones do Tabler Icons (MIT License) — mesma abordagem do inventario.jsx:
// <i className="ti ti-nome-do-icone" /> em vez de SVG inline.
// O font/CSS do Tabler deve estar carregado na página (CDN ou bundle).
//
// Cada helper aceita { style, className } e os repassa para o <i>.
// O Ornament é mantido como SVG pois é um visual decorativo único, não existente no Tabler.

const TI_cls = (tiClass) => ({ style, className, ...rest } = {}) => (
  <i
    className={['ti', tiClass, className].filter(Boolean).join(' ')}
    style={style}
    aria-hidden="true"
    {...rest}
  />
);

const Icon = {
  // ── Menu lateral ────────────────────────────────────────────────────────────
  Scroll:   TI_cls('ti-book-2'),         // Histórias / Inventário
  Crown:    TI_cls('ti-mail'),           // Convites
  Compass:  TI_cls('ti-user'),          // Personagens (jogador)
  Tower:    TI_cls('ti-bat'),           // Criaturas
  Chest:    TI_cls('ti-backpack'),      // Itens
  Flame:    TI_cls('ti-meteor'),        // Magias
  Sword:    TI_cls('ti-bow'),           // Técnicas
  Shield:   TI_cls('ti-tools'),         // Habilidades
  Sheet:    TI_cls('ti-file-description'), // Itens (lista)
  /* A Loja tinha o MESMO icone de Itens. Nao incomodava enquanto a barra
     mostrava o nome de cada secao; com a barra so de icones (12/09/2026)
     virou duas portas identicas. Um teste agora exige icones distintos. */
  Store:    TI_cls('ti-building-store'), // Loja
  BookOpen: TI_cls('ti-book'),          // Aventuras (histórias do jogador)
  // As três que vieram do Diário em 12/09/2026 — ver ADMIN_SECTIONS.
  MapPin:   TI_cls('ti-map-pin'),       // Lugares
  Users:    TI_cls('ti-users'),         // Personagens (NPCs) conhecidos
  Feather:  TI_cls('ti-feather'),       // Memórias
  // Os três grupos do menu (26/09/2026) — ver ADMIN_MENU em 01-core/constants.jsx.
  Treino:   TI_cls('ti-target-arrow'),  // Treinamento (Magias, Técnicas, Habilidades)
  Comercio: TI_cls('ti-scale'),         // Comércio (Itens por grupo)
  Diario:   TI_cls('ti-notebook'),      // Diário (Reinos, Cidades, Conhecidos, Memórias)
  Cidade:   TI_cls('ti-building-castle'), // Cidades (26/09/2026)
  Local:    TI_cls('ti-mountain'),      // Locais (22/10/2026)

  // ── Logo / cabeçalho ─────────────────────────────────────────────────────────
  Skull:   TI_cls('ti-id'),           // Logo ornamental

  // ── Utilitários ──────────────────────────────────────────────────────────────
  Dice:    TI_cls('ti-dice-3'),          // Dado
  Coin:    TI_cls('ti-coin'),            // Moeda

  // Ornamento (mantido como SVG — visual decorativo único, não disponível no Tabler)
  Ornament: (props) => (
    <svg viewBox="0 0 60 24" fill="none" stroke="currentColor" strokeWidth="1.2" {...props}>
      <path d="M0 12 L20 12" />
      <path d="M40 12 L60 12" />
      <path d="M22 12 C24 8 28 8 30 12 C32 16 36 16 38 12" />
      <path d="M30 12 L30 6 M30 12 L30 18" strokeWidth="0.8" />
      <circle cx="30" cy="3" r="1" fill="currentColor" />
      <circle cx="30" cy="21" r="1" fill="currentColor" />
    </svg>
  ),

  // ── Utilitários adicionais ───────────────────────────────────────────────────
  Check:      TI_cls('ti-check'),               // Confirmação
  Info:       TI_cls('ti-file-description'),    // Informação / ver ficha
  ArrowOut:   TI_cls('ti-upload'),              // Exportar / upload
  ArrowSwap:  TI_cls('ti-arrows-left-right'),   // Transferir / trocar
  Drop:       TI_cls('ti-droplet'),             // Líquido
  Logo:       TI_cls('ti-music'),               // Logo / música

  // ── Console (ações de UI) ────────────────────────────────────────────────────
  Logout:       TI_cls('ti-logout'),             // Sair
  ChevronLeft:  TI_cls('ti-menu-2'),             // Recolher/expandir sidebar
  ChevronRight: TI_cls('ti-chevron-right'),      // Indica que a linha abre um menu (rodapé da sidebar)

  // ── Menu de usuário ──────────────────────────────────────────────────────────
  Profile:     TI_cls('ti-user-circle'),        // Editar perfil
  Language:    TI_cls('ti-world'),              // Idioma
  Help:        TI_cls('ti-help'),               // Ajuda
};

window.Icon = Icon;

// ---------- AdminEmpty: estado vazio (migrado · Pedra & Bronze) ----------
function AdminEmpty({ ac, sectionLabel }) {
  const [tip, abrirTip, fecharTip, manterTip] = useNavTooltip(60);
  const lineL = { flex: 1, height: 1, maxWidth: 90, background: 'linear-gradient(90deg, transparent, rgba(var(--ouro-rgb),0.45))' };
  const lineR = { flex: 1, height: 1, maxWidth: 90, background: 'linear-gradient(90deg, rgba(var(--ouro-rgb),0.45), transparent)' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '64px 24px', minHeight: 280 }}>
      <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, width: '100%', maxWidth: 300, color: 'var(--vivo)' }}>
        <span style={lineL} />
        <Icon.Ornament style={{ width: 56, height: 22, flex: '0 0 auto' }} />
        <span style={lineR} />
      </div>
      <p style={{ margin: 0, fontSize: 'var(--fs-base)', color: 'var(--tinta-2)', lineHeight: 1.6, maxWidth: 420 }}>{ac.empty_sub}</p>
      <button
        disabled
        {...propsTip(abrirTip, fecharTip, ac.coming_soon)}
        style={{ marginTop: 16, fontFamily: "var(--font-body)", fontWeight: 400, fontSize: 'var(--fs-base)', color: 'var(--tinta-2)', background: 'rgba(var(--tinta-rgb),0.05)', border: '1px solid rgba(var(--tinta-rgb),0.12)', borderRadius: 6, padding: '11px 20px', cursor: 'not-allowed', opacity: 0.7 }}>
        + {ac.create} {sectionLabel ? `· ${sectionLabel}` : ''}
      </button>
      <div style={{ marginTop: 10, fontSize: 'var(--fs-base)', color: 'rgba(var(--tinta3-rgb), 1)' }}>{ac.coming_soon}</div>
      <NavTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </div>
  );
}

/* ============================== [10] ModalShell — padrão único de modal do projeto (header / body / footer) ==============================
   Substitui a função ModalShell em src/10-shell/shell.jsx (procure por `function ModalShell({`).

   Estrutura fixa, não improvisar:
   - HEADER: título à esquerda + botão "x" de fechar à direita (ícone Tabler `ti-x`).
   - BODY: conteúdo livre (children), com scrollbar customizada (mesmo padrão visual de
     .bestiario-wrap/.inv-table-wrap já usados no projeto).
   - FOOTER: botão "Cancelar" (ghost) sempre à ESQUERDA + botão de ação primária à DIREITA.
     Footer só aparece se onCancel e/ou onConfirm forem passados.

   Comportamento:
   - Clique no backdrop NÃO fecha o modal (decisão do produto — evita fechar sem querer
     no meio de um formulário). Só fecha via "x", via Cancelar, ou via Escape.
   - Escape fecha (chama onClose). Scroll do body trancado enquanto o modal está aberto.

   Props:
     title          — string ou node, vai no header
     onClose        — opcional: handler do "x" e do Escape. Se omitido, o modal
                      NÃO mostra "x" e Escape não faz nada — usar só em casos
                      de produto deliberadamente bloqueantes (ex.: o antigo PlanoEscolhaModal,
                      onboarding obrigatório). Na grande maioria dos modais, passar sempre.
     onCancel       — opcional: se presente, mostra botão Cancelar (footer, esquerda)
     cancelLabel    — opcional, default 'Cancelar' / 'Cancel' conforme `lang`
     cancelDisabled — opcional, desabilita o botão Cancelar (ex.: durante uma operação
                      que não pode ser interrompida)
     onConfirm      — opcional: se presente, mostra botão de ação primária (footer, direita)
     confirmLabel   — opcional, default 'Salvar' / 'Save' conforme `lang`
     confirmDisabled— opcional, desabilita o botão de ação primária (ex.: durante saving)
     size           — 'sm' | 'md' | 'lg' | 'full' (default 'md') — controla max-width
     headerExtra    — opcional: node extra no header, à direita do título (ex.: stepper)
     footerCenter   — opcional: node centralizado no footer, entre Cancelar e a ação
                      primária (ex.: saldo de pontos de um wizard)
     footerBeforeConfirm — opcional: node inserido no lado direito do footer, ANTES do
                      botão de ação primária (ex.: botão "Voltar" de um wizard)
     extraClass     — opcional: classe extra no .ms-modal, para overrides pontuais
     lang           — 'pt' | 'en', default 'pt' — só usado pros rótulos default dos botões
     children       — conteúdo do body

   Uso típico:
     <ModalShell
       title="Confirmar exclusão"
       lang={lang}
       onClose={onClose}
       onCancel={onClose}
       onConfirm={handleConfirm}
       confirmLabel={lang === 'en' ? 'Delete' : 'Excluir'}
       confirmDisabled={saving}
     >
       <p>Conteúdo do corpo aqui.</p>
     </ModalShell>
*/
// Modais abertos no momento. Só o de CIMA responde ao Escape — ver o
// useEffect de teclado dentro de ModalShell.
//
// O critério é ordem no documento: vale quem vier por último. Serve tanto pro
// modal aninhado (descendente sempre vem depois do ancestral) quanto pro que
// entra por portal (anexado ao fim de .mc-root, depois de quem o abriu).
//
// Não dá pra usar ordem de montagem: os efeitos do React rodam de baixo pra
// cima, então numa árvore <Wizard><Detalhe/></Wizard> quem se registra
// primeiro é o Detalhe, e "o último a entrar" elegeria o Wizard — o contrário
// do que se quer.
const MODAIS_ABERTOS = [];

function ModalShell({
  title,
  onClose = null,
  onCancel,
  cancelLabel,
  cancelDisabled = false,
  onConfirm,
  confirmLabel,
  confirmDisabled = false,
  size = 'md',
  headerExtra = null,
  footerCenter = null,
  footerBeforeConfirm = null,
  extraClass = '',
  lang = 'pt',
  children,
}) {
  const en = lang === 'en';
  const finalCancelLabel = cancelLabel || (en ? 'Cancel' : 'Cancelar');
  const finalConfirmLabel = confirmLabel || (en ? 'Save' : 'Salvar');
  const hasFooter = !!(onCancel || onConfirm || footerCenter || footerBeforeConfirm);

  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const backdropRef = useRef(null);   // usado pra saber quem é o modal mais interno

  useEffect(() => {
    // Sem onClose, o modal é bloqueante de propósito (ex.: o antigo PlanoEscolhaModal —
    // onboarding obrigatório) — Escape não faz nada nesse caso.
    //
    // O Escape só vale pro modal mais INTERNO. Cada instância registra o
    // listener em window, então com dois modais abertos um Escape fechava os
    // dois — e no wizard de personagem isso significava perder o PJ em
    // construção ao fechar a explicação de um atributo (08/09/2026).
    //
    // "De cima" = nenhum outro modal aberto vem depois dele no documento.
    // DOCUMENT_POSITION_FOLLOWING (4) cobre os dois arranjos: descendente
    // aninhado (vem como FOLLOWING|CONTAINED_BY) e irmão posterior por portal.
    const entrada = backdropRef;
    MODAIS_ABERTOS.push(entrada);
    const onKey = (e) => {
      if (e.key !== 'Escape' || !onCloseRef.current) return;
      /* 'De cima' = a aberta por último (pilha de janelas, 26/09/2026 — ver
         empilharJanela em 01-core/helpers.jsx). Pela posição no documento, o
         modal de item (portal no fim da página) roubava o Esc da janela de
         quantidade aberta por cima dele. */
      if (!window.ehJanelaDaFrente(backdropRef.current)) return;
      onCloseRef.current();
    };
    window.empilharJanela(backdropRef.current);
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      const i = MODAIS_ABERTOS.indexOf(entrada);
      if (i !== -1) MODAIS_ABERTOS.splice(i, 1);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div className="menestrel-ui ms-backdrop" ref={backdropRef}>
      {/* Sem onClick aqui de propósito: clique fora NÃO fecha o modal
          (decisão de produto — ver cabeçalho do componente). Fechar só
          via "x", via Cancelar, ou via Escape. */}
      <div
        className={['ms-modal', `ms-${size}`, extraClass].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
      >
        {/* ── Header ── */}
        <div className="ms-header">
          <h3 className="ms-title">{title}</h3>
          {headerExtra && <div className="ms-header-extra">{headerExtra}</div>}
          {onClose && (
            <button
              type="button"
              className="ms-close"
              onClick={onClose}
              aria-label={en ? 'Close' : 'Fechar'}
            >
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* ── Body ── */}
        <div className="ms-body">
          {children}
        </div>

        {/* ── Footer ── */}
        {hasFooter && (
          <div className="ms-footer">
            <div className="ms-footer-left">
              {onCancel && (
                <button type="button" className="btn-ghost btn-md" onClick={onCancel} disabled={cancelDisabled}>
                  {finalCancelLabel}
                </button>
              )}
            </div>
            {footerCenter && <div className="ms-footer-center">{footerCenter}</div>}
            <div className="ms-footer-right">
              {footerBeforeConfirm}
              {onConfirm && (
                <button type="button" className="btn-primary btn-md" onClick={onConfirm} disabled={confirmDisabled}>
                  {finalConfirmLabel}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================== [09] UserMenu — popup do avatar (estilo Claude) ==============================
   Menu flutuante ancorado ACIMA do avatar, aberto ao clicar no avatar no rodapé da sidebar.
   Renderizado via portal (document.body) com posição fixa calculada a partir do anchor —
   necessário porque .mc-sidebar tem overflow:hidden (usado na animação de collapse) e cortaria
   um popup posicionado normalmente dentro dela.
   Fecha ao clicar fora, em Escape, ou em scroll/resize.
   Cabeçalho: avatar + nome + email.
   Seletor inline de perfil (Mestre/Jogador) que persiste na hora, sem botão Salvar.
   Itens: Idioma (expande inline) + Plano + Ajuda + Sair.
*/

// Estilo-base das linhas do menu de usuário.
const MENU_ITEM_STYLE = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
  padding: '7px 6px', borderRadius: 6, border: 'none', background: 'transparent',
  color: 'var(--tinta)', fontFamily: "var(--font-body)", fontSize: 'var(--fs-sm)',
  cursor: 'pointer', textAlign: 'left', transition: 'background .14s ease',
};

// Linha de menu com hover via ESTADO (não via CSS :hover). O reset global do projeto,
// `.menestrel-ui :where(button){background: none}`, define o fundo do botão como estilo de baixa
// especificidade, mas qualquer `background` inline (como o `transparent` do estilo-base) venceria
// um `.mc-usermenu button:hover` de CSS. Aplicando o fundo do hover INLINE via estado, a iluminação
// sempre vence. Definido FORA do UserMenu para ser um tipo de componente estável (não remonta a
// cada render do pai, o que resetaria o estado de hover ao abrir/fechar o submenu de idioma).
function MenuRow({ children, onClick, disabled, danger, extraStyle, title }) {
  const [tip, abrirTip, fecharTip, manterTip] = useNavTooltip(60);
  const [hover, setHover] = useState(false);
  const bg = disabled ? 'transparent'
    : hover ? (danger ? 'rgba(200,33,44,0.14)' : 'rgba(232,221,198,0.07)')
    : 'transparent';
  return (
    <button
      role="menuitem"
      {...propsTip(abrirTip, fecharTip, title)}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...MENU_ITEM_STYLE, background: bg, cursor: disabled ? 'not-allowed' : 'pointer', ...extraStyle }}>
      {children}
      <NavTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </button>
  );
}

/* AS PALETAS (23/10/2026). A ordem e os nomes são os do estudo; a amostra é
   fundo, chão, tinta e a cor viva. O CSS de cada uma mora no fim de index.css
   (:root[data-paleta="…"]). Sem escolha, vale PALETA_PADRAO. */
const PALETAS = [
  { id: 'couro', pt: 'Couro e Ouro', en: 'Leather and Gold', amostra: ['#120D06', '#17110A', '#F1E6CF', '#E0BE68'] },
  { id: 'ferro', pt: 'Ferro e Brasa', en: 'Iron and Ember', amostra: ['#121212', '#1A1A1A', '#F0EEEA', '#F08A3C'] },
];
const PALETA_PADRAO = 'couro';
function aplicarPaleta(id) {
  const v = PALETAS.some((p) => p.id === id) ? id : PALETA_PADRAO;
  document.documentElement.dataset.paleta = v;
  try { localStorage.setItem('menestrel.paleta', v); } catch (e) {}
  return v;
}

function UserMenu({ anchorRef, email, fullName, avatarUrl, firstName, lang, setLang, profile, onSetProfile, podeTrocarPerfil = false, paleta = null, onSetPaleta = null, onHelp, onConvites, onImagens = null, onLogout, onClose }) {
  const ref = React.useRef(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    const updatePos = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ left: r.left, bottom: window.innerHeight - r.top + 8 });
    };
    updatePos();

    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target) && anchorRef.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };

    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose, anchorRef]);

  const [langOpen, setLangOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [paletaOpen, setPaletaOpen] = useState(false);

  const t = {
    roleLabel: lang === 'en' ? 'Role'     : 'Perfil',
    master:    lang === 'en' ? 'Master'   : 'Mestre',
    player:    lang === 'en' ? 'Player'   : 'Jogador',
    language:  lang === 'en' ? 'Language' : 'Idioma',
    help:      lang === 'en' ? 'Help'     : 'Ajuda',
    logout:    lang === 'en' ? 'Sign out' : 'Sair',
    soon:      lang === 'en' ? 'Coming soon' : 'Em breve',
    langLabel: lang === 'pt' ? 'PT-BR' : 'EN',
  };

  if (!pos) return null;

  return ReactDOM.createPortal(
    <div
      ref={ref}
      className="menestrel-ui mc-usermenu"
      role="menu"
      // Eventos do React propagam pela ÁRVORE REACT, não pela do DOM. Como o <UserMenu> é filho do
      // <div className="mc-user" onClick={toggleMenu}> na árvore (mesmo sendo portado pro body no DOM),
      // um clique aqui dentro subia até esse onClick e fazia setUserMenuOpen(v=>!v) → fechava o menu
      // inteiro ao clicar em "Perfil"/"Idioma". Conter o clique na raiz do menu impede esse vazamento;
      // os onClick internos (que já dispararam antes na fase de bubble) seguem funcionando normalmente.
      onClick={(e) => e.stopPropagation()}
      style={{ position: 'fixed', left: pos.left, bottom: pos.bottom, zIndex: 1000 }}
    >
      {/* ── Cabeçalho: avatar + nome/email ── */}
      <div className="mc-um-header">
        {avatarUrl ? (
          <img src={avatarUrl} alt={firstName || ''} referrerPolicy="no-referrer"
            className="mc-um-avatar-img" />
        ) : (
          <div className="mc-um-avatar-initials">
            {(firstName || email || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="mc-um-names">
          {fullName && fullName !== email && (
            <div className="mc-um-fullname">{fullName}</div>
          )}
          {email && (
            <div className="mc-um-email">{email}</div>
          )}
        </div>
      </div>

      {/* ── Perfil (Mestre / Jogador) — só o administrador troca (23/10/2026) ── */}
      {podeTrocarPerfil && <div>
        <MenuRow onClick={() => { setRoleOpen((v) => !v); setLangOpen(false); }}>
          <Icon.Profile style={{ fontSize: 16, lineHeight: 1 }} />
          {t.roleLabel}
          <i className="ti ti-chevron-down" style={{ fontSize: 'var(--fs-md)', opacity: 0.6, transition: 'transform .14s ease', transform: roleOpen ? 'rotate(180deg)' : 'none' }} aria-hidden="true" />
        </MenuRow>
        {roleOpen && (
          <div className="mc-um-submenu">
            <MenuRow onClick={() => { onSetProfile('master'); setRoleOpen(false); }}>
              {t.master} {profile === 'master' && <Icon.Check style={{ fontSize: 'var(--fs-md)', lineHeight: 1, color: 'var(--vivo)', marginLeft: 'auto' }} />}
            </MenuRow>
            <MenuRow onClick={() => { onSetProfile('player'); setRoleOpen(false); }}>
              {t.player} {profile === 'player' && <Icon.Check style={{ fontSize: 'var(--fs-md)', lineHeight: 1, color: 'var(--vivo)', marginLeft: 'auto' }} />}
            </MenuRow>
          </div>
        )}
      </div>}

      {/* ── Paleta (23/10/2026): "o usuário logado vai poder escolher qual
          paleta ele quer, essa opção vai estar entre 'Perfil' e 'Convites'". ── */}
      {onSetPaleta && <div>
        <MenuRow onClick={() => { setPaletaOpen((v) => !v); setRoleOpen(false); setLangOpen(false); }}>
          <i className="ti ti-palette" style={{ fontSize: 16, lineHeight: 1 }} aria-hidden="true" />
          {lang === 'en' ? 'Palette' : 'Paleta'}
          <i className="ti ti-chevron-down" style={{ fontSize: 'var(--fs-md)', opacity: 0.6, transition: 'transform .14s ease', transform: paletaOpen ? 'rotate(180deg)' : 'none' }} aria-hidden="true" />
        </MenuRow>
        {paletaOpen && (
          <div className="mc-um-submenu">
            {PALETAS.map((p) => (
              <MenuRow key={p.id} onClick={() => onSetPaleta(p.id)}>
                <span className="mc-um-paleta-amostra" aria-hidden="true">
                  {p.amostra.map((c, i) => <i key={i} style={{ background: c }} />)}
                </span>
                {lang === 'en' ? p.en : p.pt}
                {paleta === p.id && <Icon.Check style={{ fontSize: 'var(--fs-md)', lineHeight: 1, color: 'var(--vivo)', marginLeft: 'auto' }} />}
              </MenuRow>
            ))}
          </div>
        )}
      </div>}

      {/* ── Imagens (26/10/2026): "Adicione a página no nosso sistema para
          controle do mestre, abaixo de Paleta, chamado Imagens." A galeria
          das pinturas é pauta de produção — só o Mestre vê. ── */}
      {onImagens && profile === 'master' && (
        <MenuRow onClick={() => { onImagens(); onClose(); }}>
          <i className="ti ti-photo" style={{ fontSize: 16, lineHeight: 1 }} aria-hidden="true" />
          {lang === 'en' ? 'Images' : 'Imagens'}
        </MenuRow>
      )}

      {/* ── Convites (12/09/2026) ────────────────────────────────────
          Saiu da barra lateral e veio para cá, a pedido do usuário. Convite
          não é um lugar do mundo do jogo — como criaturas, itens ou magias
          são; é administração da conta, e aqui já moram perfil e idioma.

          Só para o Jogador: quem convida é o Mestre, de dentro da história. */}
      {profile !== 'master' && onConvites && (
        <MenuRow onClick={() => { onConvites(); onClose(); }}>
          <Icon.Crown style={{ fontSize: 16, lineHeight: 1 }} />
          {lang === 'en' ? 'Invites' : 'Convites'}
        </MenuRow>
      )}

      {/* ── Idioma — mostra valor atual, expande inline (abaixo) pra trocar ── */}
      <div>
        <MenuRow onClick={() => { setLangOpen((v) => !v); setRoleOpen(false); }}>
          <Icon.Language style={{ fontSize: 16, lineHeight: 1 }} />
          {t.language}
          <i className="ti ti-chevron-down" style={{ fontSize: 'var(--fs-md)', opacity: 0.6, transition: 'transform .14s ease', transform: langOpen ? 'rotate(180deg)' : 'none' }} aria-hidden="true" />
        </MenuRow>
        {langOpen && (
          <div className="mc-um-submenu">
            <MenuRow onClick={() => { setLang('pt'); setLangOpen(false); onClose(); }}>
              Português (Brasil) {lang === 'pt' && <Icon.Check style={{ fontSize: 'var(--fs-md)', lineHeight: 1, color: 'var(--vivo)', marginLeft: 'auto' }} />}
            </MenuRow>
            <MenuRow onClick={() => { setLang('en'); setLangOpen(false); onClose(); }}>
              English {lang === 'en' && <Icon.Check style={{ fontSize: 'var(--fs-md)', lineHeight: 1, color: 'var(--vivo)', marginLeft: 'auto' }} />}
            </MenuRow>
          </div>
        )}
      </div>

      <hr />

      {/* O item Plano saiu em 23/10/2026: não há mais plano gratuito nem Premium. */}
      <MenuRow onClick={() => { onClose(); if (onHelp) onHelp(); }}>
        <Icon.Help style={{ fontSize: 16, lineHeight: 1 }} />
        {t.help}
      </MenuRow>

      <hr />

      <MenuRow danger onClick={() => { onClose(); onLogout(); }} extraStyle={{ color: '#E08A7C' }}>
        <Icon.Logout style={{ fontSize: 16, lineHeight: 1, color: '#D08271' }} />
        {t.logout}
      </MenuRow>
    </div>,
    document.body
  );
}

// ── Tooltip local do AdminConsole ────────────────────────────────────────────
// useTooltip e Tooltip são definidos em 01-core mas não ficam no window.
// Como shell.jsx carrega antes de inventario/ficha, implementação local autônoma —
// mesmo padrão visual (.mn-tip + .mn-tip-title/.mn-tip-desc), sem dependência externa.
function useNavTooltip(delay) {
  const [tip, setTip] = React.useState(null);
  const timerRef = React.useRef(null);
  const abrirTip = React.useCallback((e, content) => {
    clearTimeout(timerRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    timerRef.current = setTimeout(() => {
      setTip({ rect, content });
    }, delay || 0);
  }, [delay]);
  const fecharTip = React.useCallback(() => {
    clearTimeout(timerRef.current);
    setTip(null);
  }, []);
  const manterTip = React.useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);
  return [tip, abrirTip, fecharTip, manterTip];
}
/* ── NavMenuPainel — o submenu da barra lateral (26/09/2026) ──────────────
   A barra é só de ícones, então os grupos do ADMIN_MENU (Diário, Comércio,
   Treinamento) abrem um painel AO LADO dela: primeira coluna com os filhos do
   grupo; filho que também tem filhos (Magias, Técnicas, Habilidades) abre uma
   segunda coluna ao passar o mouse. Escolher uma folha navega e fecha. Clique
   fora ou Escape fecha sem navegar.

   TRÊS COLUNAS desde 29/09/2026: nó `navega` (ADMIN_MENU) navega no clique e
   abre a coluna seguinte no mouse — Magias (todas) › Básicas (só básicas) ›
   Mago (as básicas do Mago). Pelo teclado, a seta para a direita abre.

   Portal para #root: a .mc-sidebar tem backdrop-filter, e um position:fixed
   dentro dela seria posicionado — e recortado — por ela, não pela janela. */
function NavMenuPainel({ grupo, ancora, lang, folhaAtual, onEscolher, onFechar }) {
  const ref = useRef(null);
  const fecharRef = useRef(onFechar);
  useEffect(() => { fecharRef.current = onFechar; }, [onFechar]);
  const rot = (n) => (n.rotulo && (n.rotulo[lang] || n.rotulo.pt)) || '';
  // Em qualquer profundidade — e o próprio nó conta, quando ele é o destino.
  const contemAtual = (n) => !!folhaAtual && !!n.filhos && folhasDoMenu([n]).includes(folhaAtual);
  // Abre já no caminho da página atual ("Magias › Básicas", se estou nas Básicas do Mago).
  const subInicial = () => grupo.filhos.find(contemAtual) || null;
  const sub2Inicial = (de) => (de && de.filhos.find((n) => n.filhos && contemAtual(n))) || null;
  const [sub, setSub] = useState(subInicial);
  const [sub2, setSub2] = useState(() => sub2Inicial(subInicial()));
  useEffect(() => {
    const s1 = subInicial(); setSub(s1); setSub2(sub2Inicial(s1));
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [grupo]);

  const margem = 16;
  const [top, setTop] = useState(Math.max(margem, ancora.top - 8));
  /* Comércio tem 15 linhas: aberto pelo ícone de baixo, o painel passaria da
     janela. Depois de medir, sobe o quanto faltar — sem sair do topo. */
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const alto = el.getBoundingClientRect().height;
    const ideal = Math.max(margem, ancora.top - 8);
    setTop(Math.max(margem, Math.min(ideal, window.innerHeight - alto - margem)));
  }, [ancora, sub, sub2]);

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && ref.current.contains(e.target)) return;
      // O próprio ícone de grupo decide (abre outro ou fecha este) no seu clique.
      if (e.target.closest && e.target.closest('.mc-navgrupo')) return;
      fecharRef.current();
    };
    const onKey = (e) => { if (e.key === 'Escape') fecharRef.current(); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
  }, []);
  /* Teclado: o foco entra no painel ao abrir, no item da página atual se ele
     estiver à vista. Subgrupo NÃO abre por foco — só por mouse ou Enter —,
     senão este foco inicial abriria o primeiro subgrupo por cima do atual. */
  useEffect(() => {
    const el = ref.current;
    const alvo = el && (el.querySelector('.mc-menu-item.is-atual') || el.querySelector('.mc-menu-item'));
    if (alvo) alvo.focus();
  }, [grupo]);

  const chave = (n, i) => (n.secao || n.id || '') + ':' + (n.filtro || '') + ':' + i;
  const folha = (n, i) => (
    <button key={chave(n, i)} type="button" role="menuitem"
      className={'mc-menu-item' + (n === folhaAtual ? ' is-atual' : '')}
      aria-current={n === folhaAtual ? 'page' : undefined}
      onClick={() => onEscolher(n)}>
      <span>{rot(n)}</span>
    </button>
  );

  // Item que abre a coluna seguinte. Clique: navega se o nó é destino
  // (`navega`), senão só abre. Mouse e seta para a direita: abre.
  const pai = (n, i, abrir, aberto) => (
    <button key={chave(n, i)} type="button" role="menuitem"
      aria-haspopup="menu" aria-expanded={aberto}
      aria-current={n === folhaAtual ? 'page' : undefined}
      className={'mc-menu-item mc-menu-item--pai' + (aberto ? ' is-open' : '') + (contemAtual(n) ? ' is-atual' : '')}
      onMouseEnter={abrir}
      onClick={() => (n.navega ? onEscolher(n) : abrir())}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); abrir(); } }}>
      <span>{rot(n)}</span>
      <i className="ti ti-chevron-right" aria-hidden="true" />
    </button>
  );
  // Folha numa coluna fecha a coluna seguinte ao passar o mouse.
  const folhaQueFecha = (n, i, fechar) => (
    <div key={chave(n, i)} onMouseEnter={fechar}>{folha(n, i)}</div>
  );

  const painel = (
    <div className="menestrel-ui mc-menu-painel" ref={ref} role="menu" aria-label={rot(grupo)}
      style={{ top, left: ancora.right + 12, maxHeight: `calc(100vh - ${margem * 2}px)` }}>
      <div className="mc-menu-col">
        {/* Sem título em cima (26/09/2026: "remova o treinamento e deixe apenas
            os menus") — o nome do grupo segue no aria-label do painel. */}
        {grupo.filhos.map((n, i) => (n.filhos
          ? pai(n, i, () => { if (sub !== n) { setSub(n); setSub2(null); } }, sub === n)
          : folhaQueFecha(n, i, () => { setSub(null); setSub2(null); })))}
      </div>
      {sub && (
        <div className="mc-menu-col mc-menu-col--sub" role="menu" aria-label={rot(sub)}>
          {sub.filhos.map((n, i) => (n.filhos
            ? pai(n, i, () => setSub2(n), sub2 === n)
            : folhaQueFecha(n, i, () => setSub2(null))))}
        </div>
      )}
      {sub && sub2 && sub.filhos.includes(sub2) && (
        <div className="mc-menu-col mc-menu-col--sub mc-menu-col--sub2" role="menu" aria-label={rot(sub2)}>
          {sub2.filhos.map(folha)}
        </div>
      )}
    </div>
  );
  const alvo = document.getElementById('root') || document.body;
  return ReactDOM.createPortal(painel, alvo);
}

function NavTooltip({ tip, onEnter, onLeave, abaixo = false }) {
  if (!tip) return null;
  const { rect, content } = tip;
  /* Nos trilhos (23/10/2026): o balão padrão do sistema (.mn-tip), abaixo do
     botão — ao lado, ele cobria o botão vizinho do trilho. */
  if (abaixo) {
    const rotulo = typeof content === 'string' ? content : (content?.title || '');
    if (!rotulo) return null;
    return ReactDOM.createPortal(
      <div className="mn-tip" data-tip-abaixo=""
        style={{ left: rect.left + rect.width / 2, top: rect.bottom, zIndex: 9999, pointerEvents: 'none' }}>
        <div className="mn-tip-title">{rotulo}</div>
      </div>,
      document.querySelector('#root .menestrel-ui') || document.body
    );
  }
  const left = rect.right + 10;
  const top  = rect.top + rect.height / 2;
  // content pode ser string ou { title }
  const label = typeof content === 'string' ? content : (content?.title || '');
  if (!label) return null;
  /* CONTRASTE (16/09/2026): "o fundo está muito parecido com o fundo do site".
     Estava mesmo — #141009 contra a página #15120C é a mesma cor a olho nu, e
     não havia borda nem sombra para desenhar a silhueta.

     Veste a mesma pele que o .mn-tip recebeu e que .at-panel/.cdj-mesa-lista já
     usavam: quase preto, aro castanho e sombra funda. As duas famílias de
     tooltip do projeto têm que combinar — o usuário não sabe (nem deve saber)
     que são componentes diferentes; o pill do clima usa esta, o slot do
     inventário usa a outra. Por isso o fundo OPACO de 17/09/2026 chegou aqui
     junto com o do CSS: ver o comentário de .mn-tip em index.css.

     As cores vivem em constantes porque a seta repete as duas, e seta fora de
     sincronia com o balão é o defeito clássico deste arranjo. */
  const TIP_FUNDO = 'var(--p-fundo)';
  const TIP_ARO   = 'rgba(var(--bronze-rgb),0.35)';
  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', left, top, transform: 'translateY(-50%)',
        zIndex: 9999,
        background: TIP_FUNDO,
        border: '1px solid ' + TIP_ARO, boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
        borderRadius: 6, padding: '10px 12px',
        pointerEvents: 'none', whiteSpace: 'nowrap',
        animation: 'fpItemTipIn .12s ease-out',
        fontFamily: "var(--font-body)", fontSize: 'var(--fs-xs)', color: 'var(--tinta)',
      }}
    >
      {/* Seta apontando para a esquerda — duas camadas: a de trás (6px) faz o
          contorno, a da frente (5px) o miolo, senão o bico sai sem aro. */}
      <div style={{
        position: 'absolute', right: '100%', top: '50%', transform: 'translateY(-50%)',
        borderWidth: 6, borderStyle: 'solid',
        borderColor: 'transparent ' + TIP_ARO + ' transparent transparent',
        width: 0, height: 0,
      }} />
      <div style={{
        position: 'absolute', right: '100%', top: '50%', transform: 'translateY(-50%)',
        borderWidth: 5, borderStyle: 'solid',
        borderColor: 'transparent ' + TIP_FUNDO + ' transparent transparent',
        width: 0, height: 0,
      }} />
      {label}
    </div>,
    document.body
  );
}

/* ============================== [9] CentralMensagens — feed retrátil de eventos da mesa ==============================
   Notifica TODOS na mesma mesa (Mestre + Jogadores) sobre avisos/ações
   uns dos outros (ex.: "Victor usou Alfabetização (Médio) e obteve uma
   falha."). Aparece em qualquer tela do AdminConsole, montada uma única
   vez fora do switch de seções — para ambos os perfis (ver chamada no
   fim do AdminConsole).

   ESTADO ATUAL: dados reais via Supabase. Histórico vem de
   listar_eventos_mesa(historiaId) (RPC, SECURITY DEFINER — já valida
   que o usuário é Mestre da história ou tem PJ vinculado); eventos novos
   chegam por Realtime (subscrição em mesa_log filtrada por historia_id).
   Quem GRAVA evento usa registrar_evento_mesa (RPC) — ver
   src/11-ficha/ficha.jsx (aoResolverTesteHabilidade) para o primeiro
   produtor real (teste de habilidade).

   Sem historiaId (Mestre sem mesa selecionada, ou Jogador sem PJ
   vinculado a uma história) o componente não monta nada — não tem o
   que mostrar.

   Tipos de evento (`tipo`) — mesmo enum da tabela mesa_log:
   magia, ataque, tecnica, item, teste, sistema, aviso.

   Comportamento (27/09/2026 — a gaveta do rodapé saiu):
   - Sino flutuante (canto inferior direito) com badge de não-lidas (e dos
     pedidos esperando o Mestre).
   - Evento novo chega → um CARD no centro da tela, na cor da categoria
     (LOG_CATEGORIAS); o anterior sai com fade-out, e o card sai sozinho.
   - O sino abre o HISTÓRICO num modal (BestDetalheModal), em lista, com a
     fila de aprovação do Mestre no topo. Mais recente primeiro; as últimas
     100 (a tabela no banco não tem teto — ver listar_eventos_mesa).
*/
const MSG_TIPO_ICON = {
  magia: 'ti-meteor',
  ataque: 'ti-bow',
  tecnica: 'ti-sword',
  item: 'ti-backpack',
  teste: 'ti-dice',
  sistema: 'ti-info-circle',
  aviso: 'ti-bell',
};

/* Eventos em DESTAQUE (15/09/2026): "Adicione no log da mesa com destaque
   quando um personagem evoluir um estágio." O evento marca `meta.destaque` e a
   linha ganha moldura dourada e o próprio ícone — subir de estágio acontece
   poucas vezes numa campanha e não pode passar batido no meio do feed. */
/* ── CATEGORIAS DO LOG, cada uma com a sua cor (27/09/2026) ──────────────
   "Cada tipo de log terá uma cor: Batalha: vermelho. Informativo: Azul. Crie
    os demais." (usuário). A categoria sai do `tipo` da mesa_log e do meta:
   tudo o que a batalha grava leva meta.batalha_id, então rodada, fuga,
   desistência e teste de combate caem em Batalha, qualquer que seja o tipo.
     batalha      vermelho  ataque, técnica e tudo com batalha_id
     magia        verde-água (arcano)
     item         verde     itens, compra e venda
     teste        âmbar     testes de habilidade fora da luta
     aviso        laranja   avisos
     informativo  azul      sistema (clima, relógio, atividade…)
     destaque     ouro      meta.destaque (subir de estágio) */
const LOG_CATEGORIAS = {
  batalha:     { cor: '#D0583F', pt: 'Batalha',     en: 'Battle',  icone: 'ti-swords' },
  magia:       { cor: '#4FB3A5', pt: 'Magia',       en: 'Magic',   icone: 'ti-meteor' },
  item:        { cor: '#7FB05A', pt: 'Item',        en: 'Item',    icone: 'ti-backpack' },
  teste:       { cor: '#D9A441', pt: 'Teste',       en: 'Test',    icone: 'ti-dice' },
  aviso:       { cor: '#E07B39', pt: 'Aviso',       en: 'Warning', icone: 'ti-alert-triangle' },
  informativo: { cor: '#5B92CF', pt: 'Informativo', en: 'Info',    icone: 'ti-info-circle' },
  destaque:    { cor: '#E0BE68', pt: 'Destaque',    en: 'Highlight', icone: 'ti-star' },
};
function categoriaDoLog(tipo, meta) {
  const m = meta && typeof meta === 'object' ? meta : {};
  if (m.destaque) return 'destaque';
  if (m.batalha_id != null || tipo === 'ataque' || tipo === 'tecnica') return 'batalha';
  if (tipo === 'magia') return 'magia';
  if (tipo === 'item') return 'item';
  if (tipo === 'teste') return 'teste';
  if (tipo === 'aviso') return 'aviso';
  return 'informativo';
}

/* A LINHA DO QUADRO (23/10/2026, modal de notificações no padrão novo): a
   hora e o texto, numa régua. Eram três sinais para a mesma coisa — a faixa
   colorida, o ícone e o rótulo "INFORMATIVO" em todas as linhas, em azul fora
   da paleta. A categoria só aparece quando diz algo (não em "Informativo"),
   em texto discreto; o aviso, em brasa. A data virou o cabeçalho do dia. */
function MensagemEvento({ msg, lang }) {
  const cat = LOG_CATEGORIAS[msg.categoria] || LOG_CATEGORIAS.informativo;
  const categoria = msg.categoria || 'informativo';
  return (
    <div className={'cm-msg cm-msg--' + categoria + (msg.destaque ? ' cm-msg--destaque' : '')}>
      <span className="cm-msg-hora">{msg.horaCurta || msg.hora}</span>
      <div className="cm-msg-body">
        {(categoria !== 'informativo' || msg.icone) && (
          <span className="cm-msg-cat">
            {/* Ícone só quando o evento pede um próprio (meta.icone). */}
            {msg.icone && <i className={'ti ' + msg.icone} aria-hidden="true" />}
            {categoria !== 'informativo' && (lang === 'en' ? cat.en : cat.pt)}
          </span>
        )}
        <span className="cm-msg-texto">{msg.texto}</span>
      </div>
    </div>
  );
}
/* Os dias do quadro: "Hoje", "Ontem" ou a data. */
function rotuloDoDia(iso, lang) {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
  const mesmo = (a, b) => a.toDateString() === b.toDateString();
  if (mesmo(d, hoje)) return lang === 'en' ? 'Today' : 'Hoje';
  if (mesmo(d, ontem)) return lang === 'en' ? 'Yesterday' : 'Ontem';
  return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/* ── O CARD NO CENTRO DA TELA (27/09/2026) ────────────────────────────────
   "Cada log será um card, que irá aparecer no centro da tela. Assim que um
    novo log aparecer, o log anterior desaparece com fade-out." Um card por
   evento que CHEGA (o histórico da carga não vira card). Ele também sai
   sozinho depois de alguns segundos, para não ficar sobre a mesa; e não
   pega clique — a tela embaixo continua usável. */
function LogCard({ msg, saindo, lang }) {
  const cat = LOG_CATEGORIAS[msg.categoria] || LOG_CATEGORIAS.informativo;
  const iconClass = msg.icone || cat.icone;
  return (
    <div className={'cm-card' + (saindo ? ' is-saindo' : '')} style={{ '--log-cor': cat.cor }}
      data-categoria={msg.categoria} role="status">
      <div className="cm-card-topo">
        <i className={'ti ' + iconClass} aria-hidden="true" />
        <span className="cm-card-cat">{lang === 'en' ? cat.en : cat.pt}</span>
      </div>
      <p className="cm-card-texto">{msg.texto}</p>
    </div>
  );
}

// Converte uma linha de mesa_log (banco) pro formato de exibição da gaveta.
function linhaParaMensagem(row, lang) {
  const dt = new Date(row.created_at);
  const locale = lang === 'en' ? 'en-US' : 'pt-BR';
  const dataHora = dt.toLocaleString(locale, {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
  const meta = (row.meta && typeof row.meta === 'object') ? row.meta : {};
  return {
    id: 'db-' + row.id,
    tipo: row.tipo,
    texto: row.texto,
    hora: dataHora,
    horaCurta: dt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
    criadoEm: row.created_at,
    // Quem grava o evento decide o destaque e pode pedir um ícone próprio.
    destaque: !!meta.destaque,
    categoria: categoriaDoLog(row.tipo, meta),
    icone: typeof meta.icone === 'string' && /^ti-[a-z0-9-]+$/.test(meta.icone) ? meta.icone : null,
  };
}

/* ============================================================
   FILA DE APROVAÇÃO DO MESTRE — degrau 2, 12/09/2026
   ============================================================
   "Magias que aplicam efeitos em outros jogadores precisam de aprovação do
   Mestre." — decisão do usuário.

   Isso não contorna a regra do banco: torna-a desnecessária de contornar. A
   política `personagens_update_own_or_vinculado` já autoriza o Mestre a
   escrever em todo protagonista da história dele, então a escrita acontece na
   sessão de alguém que JÁ PODIA. A alternativa seria uma RPC SECURITY DEFINER
   reimplementando em código quem pode conjurar em quem — uma segunda cópia de
   uma regra que o banco já enuncia. Ver docs/fora-de-combate.md §2.

   O que o Mestre vê: os pedidos abertos, com quem evocou, o quê, em quem. Ele
   aplica ou dispensa. A resposta é um SEGUNDO evento no log apontando para o
   primeiro (`meta.responde_pedido`), porque mesa_log é append-only — e assim o
   histórico da mesa guarda quem aprovou o quê.

   O karma JÁ FOI COBRADO do conjurador no momento da evocação, na linha dele.
   Aqui só pousa o efeito no alvo. ============================================================ */
function FilaAprovacaoMagia({ lang, historiaId, pedidos, onRespondido }) {
  const en = lang === 'en';
  const [ocupado, setOcupado] = useState(null);   // id do pedido em trânsito
  const [erro, setErro] = useState(null);

  if (!pedidos || pedidos.length === 0) return null;

  const responder = async (pedido, aplicar) => {
    setOcupado(pedido.id);
    setErro(null);
    try {
      let texto;
      if (aplicar) {
        /* Lê a ficha do alvo AGORA: o estado pode ter mudado entre a evocação
           e a aprovação, e aplicar sobre um retrato velho sobrescreveria o que
           aconteceu no meio. */
        const { data: alvoPj, error: e1 } = await supabaseClient
          .from('personagens').select('*').eq('id', pedido.alvo_id).maybeSingle();
        if (e1 || !alvoPj) throw (e1 || new Error('alvo não encontrado'));

        const { data: mag, error: e2 } = await supabaseClient
          .from('magias').select('*').eq('key', pedido.magia_key).maybeSingle();
        if (e2 || !mag) throw (e2 || new Error('magia não encontrada'));

        /* calcularFicha SEM catálogo de itens: EH, EF e Karma vêm dos
           atributos, e só a armadura dependeria do catálogo — que nenhuma
           magia instantânea toca. Evita carregar 747 itens para curar 20. */
        const fichaAlvo = calcularFicha(alvoPj, null,
          (alvoPj.estado_atual && alvoPj.estado_atual.condicoes) || null);
        const dv = fichaAlvo.derivadas || {};
        const maximos = {
          ef: Number(dv.energiaFisica) || 0,
          eh: Number(dv.energiaHeroica) || 0,
          ka: Number(dv.karmamax) || 0,
        };

        /* A MESMA porta da ficha (aplicarMagiaNoEstado, 01-core). Antes esta
           aprovação aplicava só o instantâneo: uma magia de calendário aprovada
           no colega curava e esquecia de ficar ativa. A data do jogo é lida
           AGORA, pelo mesmo motivo da ficha do alvo acima. */
        const { data: hist } = await supabaseClient
          .from('historias').select('data_jogo_atual').eq('id', historiaId).maybeSingle();
        const novo = aplicarMagiaNoEstado(alvoPj.estado_atual, mag, pedido.nivel, maximos,
          hist && hist.data_jogo_atual);
        if (novo !== alvoPj.estado_atual) {
          const { error: e3 } = await supabaseClient
            .from('personagens').update({ estado_atual: novo }).eq('id', pedido.alvo_id);
          if (e3) throw e3;
        }
        texto = en
          ? `The GM applied ${pedido.magia} level ${pedido.nivel} on ${pedido.alvo_nome}.`
          : `O Mestre aplicou ${pedido.magia} nível ${pedido.nivel} em ${pedido.alvo_nome}.`;
      } else {
        texto = en
          ? `The GM did not apply ${pedido.magia} on ${pedido.alvo_nome}.`
          : `O Mestre não aplicou ${pedido.magia} em ${pedido.alvo_nome}.`;
      }

      const { error: e4 } = await supabaseClient.rpc('registrar_evento_mesa', {
        p_historia_id: historiaId,
        p_tipo: 'magia',
        p_texto: texto,
        // `responde_pedido` é o que tira o pedido da fila — não há update em
        // mesa_log, e não deveria haver.
        p_meta: { responde_pedido: pedido.id, aplicado: !!aplicar,
                  magia_key: pedido.magia_key, alvo_id: pedido.alvo_id },
      });
      if (e4) throw e4;
      if (onRespondido) onRespondido();
    } catch (err) {
      setErro(err.message || String(err));
    } finally {
      setOcupado(null);
    }
  };

  return (
    <div className="cm-fila">
      <div className="cm-fila-titulo">
        <i className="ti ti-hand-stop" aria-hidden="true" />
        {en ? 'Waiting for you' : 'Esperando você'} · {pedidos.length}
      </div>
      {pedidos.map((p) => (
        <div key={p.id} className="cm-fila-item">
          <span className="cm-fila-texto">
            {p.conjurador ? `${p.conjurador} → ` : ''}
            <strong>{p.magia}</strong> {en ? 'lv' : 'nv'} {p.nivel}
            {p.alvo_nome ? ` · ${p.alvo_nome}` : ''}
          </span>
          <span className="cm-fila-acoes">
            <button type="button" className="btn-primary btn-sm"
              disabled={ocupado === p.id} onClick={() => responder(p, true)}>
              {en ? 'Apply' : 'Aplicar'}
            </button>
            <button type="button" className="btn-ghost btn-sm"
              disabled={ocupado === p.id} onClick={() => responder(p, false)}>
              {en ? 'Dismiss' : 'Dispensar'}
            </button>
          </span>
        </div>
      ))}
      {erro && <div className="err-msg">{erro}</div>}
    </div>
  );
}

/* A FILA DE VENDAS (negociação com o Mestre) saiu em 27/09/2026: vender
   agora é publicar na loja da aventura (07-inventario/loja.jsx). */

function CentralMensagens({ lang, historiaId, sidebarLargura = 208, ehMestre = false }) {
  /* ONDE MORA O SINO (23/10/2026): "para os jogadores na ficha deles, para o
     mestre, no menu lateral esquerdo". O Jogador o tem na barra de ações da
     ficha; o Mestre, como item do menu lateral. Sem nenhum dos dois na tela,
     segue flutuando no canto. */
  /* 26/10/2026: o sino passou para o TRILHO DA CENA (data · local · hora ·
     clima), que está em toda tela da mesa — vale para Mestre e Jogador. Os
     alvos antigos (menu lateral do Mestre, barra da ficha do Jogador) ficam
     de reserva para quando o trilho não estiver na tela. */
  const alvoCena = useAlvoPortal('cdj-sino');
  /* O sino desenha no trilho por PORTAL, então não alcança o balão de lá:
     ele tem o seu. Precisa dele desde 26/10/2026, quando a pílula voltou a
     ser só o ícone — "Localização, Horário, Umidade, Vento, Temperatura,
     Notificações vão ser somente ícones, e o tooltip será a informação
     dele" (usuário). */
  const [dicaSino, abrirDicaSino, fecharDicaSino, manterDicaSino] = useNavTooltip(60);
  /* O trilho DE VERDADE da ficha — o que tem Status, Atividades, Habilidades,
     Magias e Itens (11-ficha/ficha.jsx). O `mc-acoes-ficha` abaixo é o do
     shell, que fica VAZIO quando a ficha desenha o seu: era nele que o sino
     caía, virando uma faixa solta no topo (28/10/2026). */
  const alvoFichaHeroi = useAlvoPortal('fp-acoes-ficha');
  const alvoFicha = useAlvoPortal('mc-acoes-ficha');
  const alvoLateral = useAlvoPortal('mc-sino-lateral');
  /* O TRILHO DA FICHA GANHA A VEZ (28/10/2026, pedido do usuário: o sino vai
     para o "trilho junto com status, atividades, etc").

     A ordem era: trilho da cena primeiro, e o da ficha só como reserva. Como
     o trilho da cena está em TODA tela da mesa, a reserva nunca entrava — o
     sino vivia na faixa de data · local · hora, longe das ações.

     Agora o da ficha vem antes, e só ele: quando a ficha não está aberta o
     alvo não existe, e aí o sino volta para o trilho da cena, que segue sendo
     a casa dele no resto da mesa. O menu lateral do Mestre continua como
     última reserva, de quando nenhum dos dois está na tela. */
  const alvoBarra = alvoFichaHeroi || alvoFicha || alvoCena || (ehMestre ? alvoLateral : null);
  const [mensagens, setMensagens] = useState([]);
  // Linhas CRUAS do log — o `meta` que a fila de aprovação lê. As mensagens
  // acima são formato de exibição e perdem o meta de propósito.
  const [linhasCruas, setLinhasCruas] = useState([]);
  /* Só o Mestre tem fila, e só ela justifica varrer o log inteiro. Para o
     jogador o cálculo nem roda. */
  const pedidosAbertos = React.useMemo(
    () => (ehMestre && typeof pedidosDeMagiaAbertos === 'function'
      ? pedidosDeMagiaAbertos(linhasCruas) : []),
    [ehMestre, linhasCruas]
  );
  const [aberto, setAberto] = useState(false);   // o modal do histórico
  const [naoLidas, setNaoLidas] = useState(0);
  // Os cards no centro: o atual e, por um instante, o anterior saindo.
  const [cards, setCards] = useState([]);
  const cardTimersRef = React.useRef([]);
  const retrairTimeoutRef = React.useRef(null);
  const vistosRef = React.useRef(new Set()); // ids já inseridos — evita duplicar entre carga inicial e Realtime
  // AudioContext reutilizável. Criado (e desbloqueado) na primeira interação
  // do usuário com o FAB — browsers bloqueiam AudioContext sem gesto prévio.
  const audioCtxRef = React.useRef(null);

  // Limpa timeout pendente ao desmontar.
  useEffect(() => () => {
    if (retrairTimeoutRef.current) clearTimeout(retrairTimeoutRef.current);
    cardTimersRef.current.forEach(clearTimeout);
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch (_) {} }
  }, []);

  // Desbloqueia o AudioContext no primeiro clique em qualquer lugar da página.
  // Browsers exigem gesto do usuário — registrar no document garante que qualquer
  // interação (não só o FAB) seja suficiente para liberar o contexto.
  useEffect(() => {
    const desbloquear = () => {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
      } catch (_) {}
      // Remove o listener após o primeiro clique — não precisa mais.
      document.removeEventListener('click', desbloquear);
    };
    document.addEventListener('click', desbloquear);
    return () => document.removeEventListener('click', desbloquear);
  }, []);

  // Toca dois beeps curtos estilo notificação de sistema (notebook).
  // Beep 1: 1046 Hz (Dó5), Beep 2: 1318 Hz (Mi5) — intervalo de terça maior,
  // mesmo padrão de alertas do Windows/macOS. Cada beep: attack 5ms, sustain
  // 80ms, release 40ms. Volume baixo (0.14) para não assustar.
  const tocarSino = () => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state !== 'running') return;
      const beep = (freq, startTime) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.14, startTime + 0.005);
        gain.gain.setValueAtTime(0.14, startTime + 0.085);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.125);
        osc.start(startTime);
        osc.stop(startTime + 0.13);
      };
      const t = ctx.currentTime;
      beep(1046, t);        // Dó5 — primeiro beep
      beep(1318, t + 0.16); // Mi5  — segundo beep (160ms depois)
    } catch (_) {}
  };

  const abrirHistorico = () => { setAberto(true); setNaoLidas(0); };
  const fecharHistorico = () => setAberto(false);

  /* Chegou um evento: o card anterior começa a sumir (fade-out) e o novo
     entra. Sai sozinho em CARD_MS; o anterior é removido quando o fade acaba. */
  const CARD_MS = 6000, FADE_MS = 450;
  const mostrarCard = (msg) => {
    setCards((prev) => [...prev.map((c) => ({ ...c, saindo: true })), { msg, saindo: false }]);
    cardTimersRef.current.push(setTimeout(() => {
      setCards((prev) => prev.filter((c) => !c.saindo || c.msg.id === msg.id));
    }, FADE_MS));
    cardTimersRef.current.push(setTimeout(() => {
      setCards((prev) => prev.map((c) => (c.msg.id === msg.id ? { ...c, saindo: true } : c)));
      cardTimersRef.current.push(setTimeout(() => {
        setCards((prev) => prev.filter((c) => c.msg.id !== msg.id));
      }, FADE_MS));
    }, CARD_MS));
  };

  // Carrega histórico (listar_eventos_mesa) e assina Realtime sempre que a
  // mesa (historiaId) muda — troca de mesa do Mestre, ou troca de PJ ativo
  // do Jogador. Limpa estado e desfaz a assinatura anterior antes de montar a nova.
  useEffect(() => {
    vistosRef.current = new Set();
    setMensagens([]);
    setNaoLidas(0);
    setAberto(false);
    setCards([]);
    if (!historiaId) return undefined;

    let cancel = false;
    (async () => {
      const { data, error } = await supabaseClient.rpc('listar_eventos_mesa', { p_historia_id: historiaId });
      if (cancel || error || !data) return;
      // O modal do sino mostra as últimas 100 (antes a gaveta mostrava 20).
      const ordenado = [...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 100);
      ordenado.forEach((row) => vistosRef.current.add(row.id));
      setMensagens(ordenado.map((row) => linhaParaMensagem(row, lang)));
      /* A FILA DO MESTRE (degrau 2, 12/09/2026). Varre o log INTEIRO, não só
         as 20 da janela: um pedido feito há meia hora continua esperando, e
         sumir da lista não o resolve. Ver pedidosDeMagiaAbertos. */
      setLinhasCruas(data);
    })();

    const channel = supabaseClient
      .channel('mesa_log_' + historiaId)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mesa_log',
        filter: 'historia_id=eq.' + historiaId,
      }, (payload) => {
        const row = payload.new;
        if (!row || vistosRef.current.has(row.id)) return;
        vistosRef.current.add(row.id);
        const msg = linhaParaMensagem(row, lang);
        setMensagens((prev) => [msg, ...prev].slice(0, 100));
        // A fila acompanha em tempo real: um pedido novo aparece para o
        // Mestre sem recarregar, e a resposta some da fila do mesmo jeito.
        setLinhasCruas((prev) => [...prev, row]);
        setNaoLidas((n) => n + 1);
        tocarSino(); // sino suave — AudioContext já desbloqueado pelo FAB
        mostrarCard(msg); // o card no centro (27/09/2026), no lugar da gaveta
      })
      .subscribe();

    return () => { cancel = true; supabaseClient.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historiaId, lang]);

  if (!historiaId) return null; // sem mesa resolvida — nada pra acompanhar

  const Janela = window.BestDetalheModal;
  const en = lang === 'en';
  const qtdSino = Math.max(naoLidas, pedidosAbertos.length);
  /* NA BARRA DE AÇÕES DA FICHA (23/10/2026): "Coloque o sino de notificações
     na barra, depois de 'amigos'." Com a barra na tela, o sino entra nela como
     os outros botões (ícone e nome); sem ela, segue flutuando no canto. */
  /* No trilho da cena o sino veste a pílula das outras pastilhas (.cdj-bar),
     para ler como parte da faixa — não como um botão colado nela. Com ÍCONE E
     PALAVRA (26/10/2026, pedido do usuário: "o botão notificação deve ter o
     ícone e a palavra escrita"), como as pastilhas de data e local. */
  /* Só o texto no balão (26/10/2026): o contador já está na marca em brasa,
     no canto do ícone — repeti-lo no balão seria dizer duas vezes. */
  const rotuloSino = en ? 'Notifications' : 'Notificações';
  /* ── A FORMA SEGUE A CASA, NÃO O PAPEL (28/10/2026) ────────────────────
     "O botão de notificação não aparece no trilho para o jogador, e para o
     mestre o trilho ficou gigante." (usuário)

     Dois erros no mesmo encadeamento:

     1. `alvoCena` vinha PRIMEIRO e sem condição. Como o trilho da cena está
        em toda tela da mesa, ele ganhava sempre — e o Jogador nunca via o
        sino no trilho da ficha, por mais que eu mudasse a ordem do
        `alvoBarra`.

     2. O desenho era escolhido pelo PAPEL (`ehMestre`), não pelo lugar. O
        ramo do Mestre usa `mc-navitem`, que é a linha larga do MENU LATERAL —
        dentro do trilho da ficha ela esticava a faixa inteira. Daí o
        "gigante".

     A regra certa é a de baixo: quem manda no desenho é onde o sino vai
     parar. No trilho da ficha ele veste o botão de ação, igual a Status e
     Atividades, para Mestre e Jogador — porque ali os dois veem a mesma
     barra. Na faixa da cena veste a pastilha. No menu lateral do Mestre,
     a linha de menu. */
  const sinoDeAcao = (
    <div className="menestrel-ui mc-acao-grupo cm-barra">
      <button type="button" className={'mc-acao cm-acao' + (aberto ? ' is-aberto' : '')}
        onClick={() => (aberto ? fecharHistorico() : abrirHistorico())}
        aria-label={rotuloSino} aria-expanded={aberto}>
        <i className="ti ti-bell" aria-hidden="true" />
        <span className="mc-acao-rotulo">{rotuloSino}</span>
        {qtdSino > 0 && <span className="amg-badge cm-acao-badge">{qtdSino > 9 ? '9+' : qtdSino}</span>}
      </button>
    </div>
  );
  const alvoDeAcao = alvoFichaHeroi || alvoFicha;
  const sinoNaBarra = alvoDeAcao ? ReactDOM.createPortal(sinoDeAcao, alvoDeAcao)
    : alvoCena ? ReactDOM.createPortal(
    <>
      <button type="button" className={'cdj-bar cdj-sino is-editavel' + (aberto ? ' is-open' : '')}
        onClick={() => { fecharDicaSino(); (aberto ? fecharHistorico() : abrirHistorico()); }}
        aria-label={rotuloSino} aria-expanded={aberto}
        {...propsTip(abrirDicaSino, fecharDicaSino, rotuloSino)}>
        <i className="ti ti-bell" aria-hidden="true" />
        {qtdSino > 0 && <span className="cdj-sino-badge">{qtdSino > 9 ? '9+' : qtdSino}</span>}
      </button>
      <NavTooltip tip={dicaSino} onEnter={manterDicaSino} onLeave={fecharDicaSino} abaixo />
    </>, alvoCena)
    /* A linha larga é do MENU LATERAL, e só dele. */
    : alvoLateral && ehMestre ? ReactDOM.createPortal(
    <button type="button" className={'mc-navitem cm-nav' + (aberto ? ' is-aberto' : '')}
      onClick={() => (aberto ? fecharHistorico() : abrirHistorico())}
      aria-label={rotuloSino} aria-expanded={aberto}>
      <i className="ti ti-bell" aria-hidden="true" />
      <span>{rotuloSino}</span>
      {qtdSino > 0 && <span className="cm-nav-badge">{qtdSino > 9 ? '9+' : qtdSino}</span>}
    </button>, alvoLateral) : null;
  return (
    <div className="menestrel-ui cm-root" style={{ '--cm-sidebar': sidebarLargura + 'px' }}>
      {/* O card do evento que acabou de chegar, no centro da área da página. */}
      <div className="cm-cards" aria-live="polite">
        {cards.map((c) => <LogCard key={c.msg.id} msg={c.msg} saindo={c.saindo} lang={lang} />)}
      </div>

      {/* O sino abre o HISTÓRICO num modal (27/09/2026): "Ao clicar o ícone
          do sino para ver os logs antigos, abrir um modal com os logs em lista." */}
      {sinoNaBarra}
      {!alvoBarra && <button
        type="button"
        className={'cm-fab' + (aberto ? ' is-active' : '')}
        onClick={() => (aberto ? fecharHistorico() : abrirHistorico())}
        aria-label={en ? 'Notifications' : 'Notificações'}
        aria-expanded={aberto}
      >
        <i className="ti ti-bell" aria-hidden="true" />
        {(naoLidas > 0 || pedidosAbertos.length > 0) && (
          <span className="cm-fab-badge">{Math.max(naoLidas, pedidosAbertos.length) > 9 ? '9+' : Math.max(naoLidas, pedidosAbertos.length)}</span>
        )}
      </button>}

      {aberto && Janela && (
        <Janela
          title={en ? 'Notifications' : 'Notificações'}
          lang={lang}
          onClose={fecharHistorico}>
          <div className="cm-log-lista" role="log" aria-label={en ? 'Notifications' : 'Notificações'}>
            {/* A fila do Mestre vem antes: é a única coisa aqui que pede ação. */}
            {ehMestre && (
              <FilaAprovacaoMagia
                lang={lang}
                historiaId={historiaId}
                pedidos={pedidosAbertos}
                onRespondido={() => { /* o realtime traz a resposta e a fila encolhe */ }}
              />
            )}
            {mensagens.length === 0 ? (
              <div className="cm-empty">{en ? 'No messages yet.' : 'Nenhuma mensagem ainda.'}</div>
            ) : (
              mensagens.map((m, i) => {
                const dia = m.criadoEm ? rotuloDoDia(m.criadoEm, lang) : null;
                const anterior = i > 0 && mensagens[i - 1].criadoEm ? rotuloDoDia(mensagens[i - 1].criadoEm, lang) : null;
                return (
                  <React.Fragment key={m.id}>
                    {dia && dia !== anterior && <p className="cm-dia">{dia}</p>}
                    <MensagemEvento msg={m} lang={lang} />
                  </React.Fragment>
                );
              })
            )}
          </div>
        </Janela>
      )}
    </div>
  );
}

/* ============================== [9.4] Calendário Fantasy — feriados e visualizador ==============================
   FERIADOS_FANTASY: lista fixa de feriados do calendário do mundo.
   Formato: { dia, mes, nome }. Meses 1–12 são os meses normais; mês 13 é o
   mês especial "Cruine" (1 dia). Espelha FANTASY_MONTHS de 01-core.
*/
const FERIADOS_FANTASY = [
  { dia:  2, mes:  1, nome: 'Festival da Benção Militar' },
  { dia: 12, mes:  1, nome: 'Amor da Deusa' },
  { dia: 17, mes:  1, nome: 'Adoração a Maira Mon' },
  { dia:  1, mes:  2, nome: 'Dia do Mar' },
  { dia:  5, mes:  2, nome: 'Jejum da Piedade' },
  { dia:  5, mes:  2, nome: 'Solstício de Verão' },
  { dia: 11, mes:  2, nome: 'Festa da Carne' },
  { dia: 19, mes:  2, nome: 'Culto à Elevação' },
  { dia:  5, mes:  3, nome: 'Condecoração Póstuma' },
  { dia:  9, mes:  3, nome: 'Vitória da Justiça' },
  { dia: 15, mes:  3, nome: 'Festa da Prosperidade' },
  { dia: 20, mes:  3, nome: 'Dia do Amor e Paz' },
  { dia:  2, mes:  4, nome: 'Adoração a Maira Vet' },
  { dia:  7, mes:  4, nome: 'Festa da Fertilidade' },
  { dia: 13, mes:  4, nome: 'Festa da Purificação de Parom' },
  { dia: 30, mes:  4, nome: 'Festa da Fartura' },
  { dia:  1, mes:  5, nome: 'Festa da Fartura' },
  { dia:  5, mes:  5, nome: 'Equinócio de Outono' },
  { dia:  9, mes:  5, nome: 'Dia das Ilusões' },
  { dia: 21, mes:  5, nome: 'Dia da Multiplicação' },
  { dia: 20, mes:  6, nome: 'Jornada da Paz' },
  { dia: 24, mes:  6, nome: 'Festa dos Artífices' },
  { dia: 30, mes:  6, nome: 'Festa da Colheita' },
  { dia:  1, mes:  7, nome: 'Noite dos Prazeres' },
  { dia: 13, mes:  7, nome: 'Batismo de Fogo' },
  { dia: 19, mes:  7, nome: 'Representação de Plandis' },
  { dia:  3, mes:  8, nome: 'Festival de Renascimento de Maira' },
  { dia:  5, mes:  8, nome: 'Solstício de Inverno' },
  { dia:  9, mes:  8, nome: 'Festa da Iluminação' },
  { dia: 23, mes:  8, nome: 'Oferenda de Sangue' },
  { dia:  4, mes:  9, nome: 'Memorial dos Ancestrais' },
  { dia:  6, mes:  9, nome: 'Dia da Magia' },
  { dia: 20, mes:  9, nome: 'Adoração a Maira Nil e Prisão Dourada' },
  { dia:  1, mes: 10, nome: 'Festa do Plantio' },
  { dia: 12, mes: 10, nome: 'Festa dos Amantes' },
  { dia: 27, mes: 10, nome: 'Festa da Vitória' },
  { dia:  6, mes: 11, nome: 'Equinócio de Primavera' },
  { dia: 13, mes: 11, nome: 'Culto à Tríade' },
  { dia: 26, mes: 11, nome: 'Dia da Sobra' },
  { dia: 16, mes: 12, nome: 'Festa dos Povos' },
  { dia: 27, mes: 12, nome: 'Noite do Entendimento entre os Povos' },
  { dia: 29, mes: 12, nome: 'Noite dos Justos' },
  { dia:  1, mes: 13, nome: 'Dia de Cruine e Retorno da Escuridão' },
];

// Converte (dia, mes) em número sequencial dentro do ano fantasy.
// Assume meses 1–12 com 30 dias cada + mês 13 com 1 dia = 361 dias/ano.
// Usa FANTASY_MONTHS para dias reais se disponível (window global de 01-core).
function _diaDaData(dia, mes) {
  const meses = typeof FANTASY_MONTHS !== 'undefined' ? FANTASY_MONTHS : null;
  let acc = 0;
  for (let m = 1; m < mes; m++) {
    acc += (meses ? (meses[m - 1]?.dias || 30) : 30);
  }
  return acc + dia;
}

// Retorna o próximo feriado a partir de (dia, mes) — exclusive, ou seja,
// se hoje É feriado, retorna o PRÓXIMO (não o atual).
// Volta ao início do ano se não houver feriado nos meses restantes.
function proximoFeriado(dia, mes) {
  const hoje = _diaDaData(dia, mes);
  // Feriados ordenados por dia sequencial
  const ordenados = [...FERIADOS_FANTASY].sort((a, b) => _diaDaData(a.dia, a.mes) - _diaDaData(b.dia, b.mes));
  // Próximo estritamente depois de hoje
  const proximo = ordenados.find((f) => _diaDaData(f.dia, f.mes) > hoje);
  if (proximo) return proximo;
  // Nenhum encontrado → retorna o primeiro do próximo ano (volta ao início)
  return ordenados[0] || null;
}

// Retorna array com os nomes dos feriados de um dia/mês específico (pode haver mais de um)
function feriadosDoDia(dia, mes) {
  return FERIADOS_FANTASY.filter((f) => f.dia === dia && f.mes === mes).map((f) => f.nome);
}

/* ============================== [9.4a] O tempo da mesa vira evento no log ==============================
   "As mudanças de data, hora e condições climáticas devem ser informadas no
    log da aventura para todos. Quando a data mudar, informe quando houver um
    feriado naquele dia." (usuário, 20/09/2026)

   O log já existia (RPC registrar_evento_mesa → mesa_log → Realtime). O que
   nasce aqui são os TEXTOS, puros e testáveis sem montar tela nenhuma — ver
   10-shell/log-tempo-mesa.test.js.

   Os nomes dos feriados ficam em português mesmo na versão inglesa: são nomes
   próprios da ambientação, como Farzelo ou Cruine, não rótulos de interface. */

/* A data por extenso. Esta função existe para o log e a BARRA DO TOPO nunca
   divergirem — a barra escrevia isto inline no JSX, e duas formatações da
   mesma data em lugares diferentes é o tipo de coisa que ninguém percebe até
   estar errada. Data incompleta devolve string vazia: quem chama decide se
   isso vira evento ou silêncio. */
function rotuloDataJogo(data) {
  const dia = data && Number(data.dia);
  const mes = data && Number(data.mes);
  const ano = data && Number(data.ano);
  if (!Number.isFinite(dia) || !Number.isFinite(mes) || !Number.isFinite(ano)) return '';
  const mesData = FANTASY_MONTHS[mes - 1];
  if (!mesData) return '';
  const nomeMes = mesData.nome.replace(/^Mês /, '');
  const semana = calcDiaSemanaFantasy(ano, mes, dia);
  const semanaCap = semana.charAt(0).toUpperCase() + semana.slice(1).toLowerCase();
  return `${semanaCap}, ${dia} ${nomeMes} de ${ano}`;
}

/* O feriado entra na MESMA frase da data, e no plural quando há mais de um —
   dia 5 do Mês da Água tem dois. Anunciar só o primeiro esconderia metade do
   calendário, e é por isso que feriadosDoDia devolve array. */
function textoEventoData(data, en) {
  const rotulo = rotuloDataJogo(data);
  if (!rotulo) return '';
  const base = en ? `The adventure is now ${rotulo}.` : `A aventura agora é ${rotulo}.`;
  const feriados = feriadosDoDia(Number(data.dia), Number(data.mes));
  if (feriados.length === 0) return base;
  const lista = feriados.length === 1
    ? feriados[0]
    : feriados.slice(0, -1).join(', ') + (en ? ' and ' : ' e ') + feriados[feriados.length - 1];
  return base + (en ? ` Today is ${lista}.` : ` Hoje é ${lista}.`);
}

/* DE ONDE PARA ONDE (20/09/2026): "use 'O tempo mudou de 12h para 13h.'"

   Dizia só o destino. Quem lê o log da aventura depois não estava na mesa
   quando aconteceu — sem o ponto de partida, não dá para saber se passou uma
   hora ou doze, e é justamente isso que o desgaste por hora cobra.

   Mesa que ainda não tinha hora não tem "de onde", e a frase vira só o
   destino em vez de inventar um ponto de partida. */
/* "Agora são 13h da tarde." (27/09/2026, no lugar de "A hora da mesa agora é
   13h." e de "O tempo mudou de 12h para 13h."). O período do dia dá o
   contexto que o "de onde" dava; 0h e 12h viram meia-noite e meio-dia. */
function periodoDoDia(h, en) {
  if (h >= 1 && h <= 4) return en ? 'at night' : 'da madrugada';
  if (h >= 5 && h <= 11) return en ? 'in the morning' : 'da manhã';
  if (h >= 13 && h <= 17) return en ? 'in the afternoon' : 'da tarde';
  return en ? 'in the evening' : 'da noite';
}
/* A HORA POR EXTENSO (26/10/2026, pedido do usuário): "ao invés de 'Horário
   12h Dia' será 'Meio-Dia'". O balão do trilho diz a hora como o log já a
   diz — meia-noite, meio-dia, e o resto com o período (periodoDoDia acima),
   que é o vocabulário que o jogador já leu em "Agora são 13h da tarde". */
function horaPorExtenso(h, en) {
  const n = Number(h);
  if (!Number.isFinite(n)) return '';
  if (n === 0) return en ? 'Midnight' : 'Meia-Noite';
  if (n === 12) return en ? 'Noon' : 'Meio-Dia';
  return `${n}h ${periodoDoDia(n, en)}`;
}
function textoEventoHora(horaAnterior, horaNova, en) {
  const nova = Number(horaNova);
  if (!Number.isFinite(nova)) return '';
  const antes = Number(horaAnterior);
  if (Number.isFinite(antes) && antes === nova) return '';
  if (nova === 0) return en ? 'It is now midnight.' : 'Agora é meia-noite.';
  if (nova === 12) return en ? 'It is now noon.' : 'Agora é meio-dia.';
  if (en) return `It is now ${nova}h ${periodoDoDia(nova, true)}.`;
  return `${nova === 1 ? 'Agora é' : 'Agora são'} ${nova}h ${periodoDoDia(nova, false)}.`;
}

function textoEventoLocal(local, en) {
  const l = (local || '').trim();
  if (!l) return '';
  return en ? `The table is now at ${l}.` : `A mesa agora está em ${l}.`;
}

/* "O clima mudou de Desértico para Árido." (usuário, 20/09/2026)

   A TRILHA SAIU DA FRASE. Dizer "Água · Árido" obrigava quem lê a saber que
   Árido é um degrau da trilha da Água; os nomes dos degraus já identificam o
   eixo sozinhos, e o par "de X para Y" conta o que de fato aconteceu.

   E "CLIMA", não "tempo": o usuário separou os dois vocabulários no mesmo
   pedido — tempo é o relógio, clima é a condição atmosférica.

   Sem degrau anterior, parte do PADRÃO da trilha: é o que a barra já mostrava
   antes de alguém tocar nela, então dizer "de Fresco" é verdade, e "de nada"
   não seria. Degrau desconhecido ou igual não vira evento — o id vem de um
   jsonb do banco e pode ser de uma versão anterior da trilha. */
function textoEventoTempo(trilhaChave, degrauAnterior, degrauNovo, en) {
  const trilha = TEMPO_TRILHAS.find((t) => t.chave === trilhaChave);
  if (!trilha) return '';
  const novo = trilha.degraus.find((d) => d.id === degrauNovo);
  if (!novo) return '';
  const antes = trilha.degraus.find((d) => d.id === degrauAnterior)
    || trilha.degraus.find((d) => d.id === trilha.padrao);
  if (!antes || antes.id === novo.id) return '';
  /* "O clima era desértico e agora ficou árido." (27/09/2026) */
  const de = (en ? antes.en : antes.pt).toLowerCase();
  const para = (en ? novo.en : novo.pt).toLowerCase();
  return en
    ? `The weather was ${de} and is now ${para}.`
    : `O clima era ${de} e agora ficou ${para}.`;
}

// Modal de calendário fantasy — visão de todos os meses com feriados destacados.
// Notas pessoais: armazenadas em historias.notas_calendario (JSONB) com chave "MES:DIA".
// Carregadas ao montar / trocar de mês; salvas/apagadas inline via Supabase.
function CalendarioFantasyModal({ dataAtual, dataNasc, lang, historiaId, podeEditar, userId, onDefinirDataAtual, onClose }) {
  const [tip, abrirTip, fecharTip, manterTip] = useNavTooltip(60);
  const en = lang === 'en';
  const meses = typeof FANTASY_MONTHS !== 'undefined' ? FANTASY_MONTHS : null;
  const totalMeses = meses ? meses.length : 13;

  // Mês inicial: o mês atual da data do jogo, ou 1
  const [mesFoco, setMesFoco] = useState(dataAtual ? dataAtual.mes : 1);
  const [anoFoco, setAnoFoco] = useState(dataAtual?.ano ?? 0);

  const mesAtual = meses ? meses[mesFoco - 1] : null;
  const nomeMes = mesAtual?.nome || `Mês ${mesFoco}`;
  const diasNoMes = mesAtual?.dias || (mesFoco === 13 ? 1 : 30);

  // Aniversário do PJ neste mês (se dataNasc fornecida)
  const ehMesAniversario = dataNasc && Number(dataNasc.mes) === mesFoco;
  const diaAniversario = ehMesAniversario ? Number(dataNasc.dia) : null;

  // Dias da semana do mês (para cabeçalho de grade)
  // FANTASY_WEEKDAYS: ['Anaesi','Basvo','Calcato','Moldio','Saegaeti','Saverieto','Sivonte']
  // Âncora: Dia 1, Mês 1, Ano 0 = Moldio (índice 3). Ano tem 361 dias (30×12 + 1 Dia de Cruine).
  const _wd = typeof FANTASY_WEEKDAYS !== 'undefined' ? FANTASY_WEEKDAYS : ['Anaesi','Basvo','Calcato','Moldio','Saegaeti','Saverieto','Sivonte'];
  const DIAS_SEMANA_FULL = _wd;
  const primeiroDiaSemana = (() => {
    const mesesArr = typeof FANTASY_MONTHS !== 'undefined' ? FANTASY_MONTHS : null;
    let acc = anoFoco * 361;
    for (let m = 1; m < mesFoco; m++) acc += (mesesArr ? (mesesArr[m - 1]?.dias || 30) : 30);
    return (acc + 3) % 7;
  })();

  const feriadosPorDia = useMemo(() => {
    const map = {};
    FERIADOS_FANTASY.filter((f) => f.mes === mesFoco).forEach((f) => {
      if (!map[f.dia]) map[f.dia] = [];
      map[f.dia].push(f.nome);
    });
    return map;
  }, [mesFoco]);

  // ── Notas ────────────────────────────────────────────────────────────────────
  // Mestre  → lê/escreve historias.notas_calendario  (JSONB { "mes:dia": texto })
  // Jogador → lê historias.notas_calendario (só leitura, notas do mestre)
  //          + lê/escreve profiles.notas_calendario  (JSONB { "historiaId:mes:dia": texto },
  //            isolado por user via RLS — cada jogador vê só as próprias notas)
  //
  // notasMestre:  { [dia]: string } — notas do mestre para o mês atual (leitura para todos)
  // notasProprias: { [dia]: string } — notas do jogador para o mês atual (só jogador)
  // notasPorDia:  { [dia]: string } — merge para exibição (mestre tem prioridade visual)
  const [notasMestre,   setNotasMestre]   = useState({});
  const [notasProprias, setNotasProprias] = useState({});
  const [todasMestre,   setTodasMestre]   = useState({}); // cache JSONB mestre
  const [todasProprias, setTodasProprias] = useState({}); // cache JSONB jogador
  const [carregandoNotas, setCarregandoNotas] = useState(false);

  // notasPorDia: merge para grade e legenda — notas próprias do jogador sobrepõem as do mestre no mesmo dia
  const notasPorDia = useMemo(() => ({ ...notasMestre, ...notasProprias }), [notasMestre, notasProprias]);

  // Carrega notas ao montar e ao trocar de mês
  useEffect(() => {
    if (!historiaId) return;
    let cancel = false;
    setNotasMestre({});
    setNotasProprias({});
    setCarregandoNotas(true);
    (async () => {
      try {
        // Notas do mestre — todos leem
        const { data: hData } = await supabaseClient
          .from('historias')
          .select('notas_calendario')
          .eq('id', historiaId)
          .single();
        if (cancel) return;
        const todasM = hData?.notas_calendario || {};
        setTodasMestre(todasM);
        const mapM = {};
        Object.entries(todasM).forEach(([k, v]) => {
          const [m, d] = k.split(':').map(Number);
          if (m === mesFoco) mapM[d] = v;
        });
        if (!cancel) setNotasMestre(mapM);

        // Notas próprias do jogador — só jogador carrega
        if (!podeEditar && userId) {
          const { data: pData } = await supabaseClient
            .from('profiles')
            .select('notas_calendario')
            .eq('id', userId)
            .single();
          if (cancel) return;
          const todasP = pData?.notas_calendario || {};
          setTodasProprias(todasP);
          const prefixo = `${historiaId}:${mesFoco}:`;
          const mapP = {};
          Object.entries(todasP).forEach(([k, v]) => {
            if (k.startsWith(prefixo)) {
              const d = Number(k.replace(prefixo, ''));
              if (d > 0) mapP[d] = v;
            }
          });
          if (!cancel) setNotasProprias(mapP);
        }
      } catch (_) {}
      if (!cancel) setCarregandoNotas(false);
    })();
    return () => { cancel = true; };
  }, [mesFoco, historiaId, podeEditar, userId]);

  // ── Dia selecionado + input de nota ─────────────────────────────────────────
  const [diaFoco, setDiaFoco] = useState(null);
  const [inputAtivo, setInputAtivo] = useState(false);
  const [rascunho, setRascunho] = useState('');
  const [salvando, setSalvando] = useState(false);
  const inputRef = useRef(null);

  // Ao focar um dia: preencher rascunho com nota própria existente (jogador) ou do mestre
  const selecionarDia = (dia) => {
    if (diaFoco === dia) { setDiaFoco(null); setInputAtivo(false); setRascunho(''); return; }
    setDiaFoco(dia);
    setInputAtivo(false);
    setRascunho(podeEditar ? (notasMestre[dia] || '') : (notasProprias[dia] || ''));
  };

  // Ao trocar de mês: desselecionar dia
  const trocarMes = (fn) => { setMesFoco(fn); setDiaFoco(null); setInputAtivo(false); setRascunho(''); };

  // Abre o input e foca
  const abrirInput = () => {
    setInputAtivo(true);
    setTimeout(() => inputRef.current?.focus(), 40);
  };

  // Salvar nota
  const salvarNota = async () => {
    if (!historiaId || diaFoco == null) return;
    const texto = rascunho.trim().slice(0, 25);
    setSalvando(true);
    try {
      if (podeEditar) {
        // Mestre → grava em historias.notas_calendario
        const chave = `${mesFoco}:${diaFoco}`;
        const novasNotas = { ...todasMestre };
        if (texto) novasNotas[chave] = texto;
        else delete novasNotas[chave];
        const { error } = await supabaseClient
          .from('historias')
          .update({ notas_calendario: novasNotas })
          .eq('id', historiaId);
        if (!error) {
          setTodasMestre(novasNotas);
          setNotasMestre((prev) => { const n = { ...prev }; if (texto) n[diaFoco] = texto; else delete n[diaFoco]; return n; });
        }
      } else if (userId) {
        // Jogador → grava em profiles.notas_calendario
        const chave = `${historiaId}:${mesFoco}:${diaFoco}`;
        const novasNotas = { ...todasProprias };
        if (texto) novasNotas[chave] = texto;
        else delete novasNotas[chave];
        const { error } = await supabaseClient
          .from('profiles')
          .update({ notas_calendario: novasNotas })
          .eq('id', userId);
        if (!error) {
          setTodasProprias(novasNotas);
          setNotasProprias((prev) => { const n = { ...prev }; if (texto) n[diaFoco] = texto; else delete n[diaFoco]; return n; });
        }
      }
    } catch (_) {}
    setSalvando(false);
    setInputAtivo(false);
  };

  // Apagar nota
  const apagarNota = async () => {
    if (!historiaId || diaFoco == null) return;
    setSalvando(true);
    try {
      if (podeEditar) {
        const chave = `${mesFoco}:${diaFoco}`;
        const novasNotas = { ...todasMestre };
        delete novasNotas[chave];
        const { error } = await supabaseClient
          .from('historias')
          .update({ notas_calendario: novasNotas })
          .eq('id', historiaId);
        if (!error) {
          setTodasMestre(novasNotas);
          setNotasMestre((prev) => { const n = { ...prev }; delete n[diaFoco]; return n; });
        }
      } else if (userId) {
        const chave = `${historiaId}:${mesFoco}:${diaFoco}`;
        const novasNotas = { ...todasProprias };
        delete novasNotas[chave];
        const { error } = await supabaseClient
          .from('profiles')
          .update({ notas_calendario: novasNotas })
          .eq('id', userId);
        if (!error) {
          setTodasProprias(novasNotas);
          setNotasProprias((prev) => { const n = { ...prev }; delete n[diaFoco]; return n; });
        }
      }
    } catch (_) {}
    setSalvando(false);
    setRascunho('');
    setInputAtivo(false);
  };

  // Definir a data atual da aventura (mestre) a partir do dia focado no calendário
  const [definindoData, setDefinindoData] = useState(false);
  const definirComoDataAtual = async () => {
    if (!onDefinirDataAtual || diaFoco == null) return;
    setDefinindoData(true);
    try { await onDefinirDataAtual({ dia: diaFoco, mes: mesFoco, ano: anoFoco }); } catch (_) {}
    setDefinindoData(false);
  };

  // Grade de dias: offset + dias
  const celulas = Array(primeiroDiaSemana).fill(null).concat(
    Array.from({ length: diasNoMes }, (_, i) => i + 1)
  );

  const hoje = dataAtual ? { dia: dataAtual.dia, mes: dataAtual.mes, ano: dataAtual.ano ?? 0 } : null;

  // O painel aparece para qualquer dia selecionado — sempre há pelo menos o botão de nota
  const temConteudoPainel = diaFoco != null;

  return ReactDOM.createPortal(
    <div
      className="cal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="menestrel-ui">
      <div className="cal-modal">

        {/* O CALENDÁRIO NO NOVO PADRÃO (23/10/2026): "Quero algo bonito,
            moderno e condizente com nosso novo layout." O mês em destaque no
            cabeçalho, a navegação num trilho (mês e ano), a grade de dias à
            esquerda e a agenda à direita — o dia escolhido ou, sem dia, o que
            acontece no mês. Mesmas ações e dados de antes. */}
        <div className="cal-header">
          <div className="cal-titulo-bloco">
            <span className="cal-titulo-mes">{nomeMes}</span>
            <span className="cal-titulo-ano">{en ? `Year ${anoFoco}` : `Ano ${anoFoco}`}</span>
          </div>
          <div className="cal-trilho" role="group" aria-label={en ? 'Navigate' : 'Navegar'}>
            <button className="cal-trilho-btn" onClick={() => trocarMes((m) => Math.max(1, m - 1))}
              disabled={mesFoco === 1} aria-label={en ? 'Previous month' : 'Mês anterior'}>
              <i className="ti ti-chevron-left" aria-hidden="true" />
            </button>
            <button className="cal-trilho-btn" onClick={() => trocarMes((m) => Math.min(totalMeses, m + 1))}
              disabled={mesFoco === totalMeses} aria-label={en ? 'Next month' : 'Próximo mês'}>
              <i className="ti ti-chevron-right" aria-hidden="true" />
            </button>
            {podeEditar && (
              <>
                <span className="cal-trilho-espaco" aria-hidden="true" />
                <button className="cal-trilho-btn" onClick={() => setAnoFoco((a) => Math.max(0, a - 1))}
                  disabled={anoFoco <= 0} aria-label={en ? 'Previous year' : 'Ano anterior'}>
                  <i className="ti ti-chevrons-left" aria-hidden="true" />
                </button>
                <span className="cal-trilho-rotulo">{en ? 'Year' : 'Ano'}</span>
                <button className="cal-trilho-btn" onClick={() => setAnoFoco((a) => a + 1)}
                  aria-label={en ? 'Next year' : 'Próximo ano'}>
                  <i className="ti ti-chevrons-right" aria-hidden="true" />
                </button>
              </>
            )}
          </div>
          <button className="cal-header-close" onClick={onClose} aria-label={en ? 'Close' : 'Fechar'}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <div className="cal-corpo">
        <div className="cal-mes-quadro">
        {/* Cabeçalho dos dias da semana: as três primeiras letras. */}
        <div className="cal-weekdays">
          {DIAS_SEMANA_FULL.map((d) => (
            <div key={d} className="cal-weekday">{String(d).slice(0, 3)}</div>
          ))}
        </div>

        {/* Grade de dias */}
        <div className="cal-grid">
          {celulas.map((dia, idx) => {
            if (dia === null) return <div key={`off-${idx}`} className="cal-dia-vazio" aria-hidden="true" />;
            const ehHoje   = hoje && hoje.ano === anoFoco && hoje.mes === mesFoco && hoje.dia === dia;
            const feriados = feriadosPorDia[dia] || [];
            const temFeriado = feriados.length > 0;
            const ehAniv   = diaAniversario === dia;
            const temNota  = !!notasPorDia[dia];
            const focado   = diaFoco === dia;
            const classes  = [
              'cal-dia',
              ehHoje   ? 'is-hoje'        : '',
              ehAniv   ? 'is-aniversario' : '',
              focado   ? 'is-focado'      : '',
            ].filter(Boolean).join(' ');
            return (
              <button
                key={dia}
                className={classes}
                onClick={() => selecionarDia(dia)}
                aria-pressed={focado}
                aria-label={`${dia}${temFeriado ? ' — ' + feriados.join(', ') : ''}${ehAniv ? (en ? ' — Birthday' : ' — Aniversário') : ''}${temNota ? ' — ' + notasPorDia[dia] : ''}`}
              >
                <span className="cal-dia-num">{dia}</span>
                {(temFeriado || ehAniv || temNota) && (
                  <div className="cal-dia-dots">
                    {temFeriado && <span className="cal-dot cal-dot-feriado" />}
                    {ehAniv     && <span className="cal-dot cal-dot-aniv" />}
                    {temNota    && <span className="cal-dot cal-dot-nota" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        </div>{/* cal-mes-quadro */}

        <aside className="cal-agenda">
        {/* Painel de detalhe do dia selecionado */}
        {temConteudoPainel && (
          <div className="cal-painel">
            <div className="cal-painel-eyebrow">
              <span className="cal-painel-dia-label">
                <span className="cal-painel-dia-num">{diaFoco}</span>
                <span className="cal-painel-dia-semana">{DIAS_SEMANA_FULL[(primeiroDiaSemana + diaFoco - 1) % 7]}</span>
              </span>
              <div className="cal-painel-acoes">
                {!inputAtivo && (
                  <button
                    className="cal-nota-del"
                    onClick={abrirInput}
                    {...propsTip(abrirTip, fecharTip, notasPorDia[diaFoco] ? (en ? 'Edit note' : 'Editar nota') : (en ? 'Add note' : 'Adicionar nota'))}
                    aria-label={notasPorDia[diaFoco] ? (en ? 'Edit note' : 'Editar nota') : (en ? 'Add note' : 'Adicionar nota')}
                  >
                    <i className={`ti ${notasPorDia[diaFoco] ? 'ti-pencil' : 'ti-plus'}`} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            {podeEditar && onDefinirDataAtual && (
              (dataAtual && dataAtual.dia === diaFoco && dataAtual.mes === mesFoco && (dataAtual.ano ?? 0) === anoFoco) ? (
                <span className="cal-data-atual-tag">
                  <i className="ti ti-map-pin-filled" aria-hidden="true" />
                  {en ? 'Current date' : 'Data atual'}
                </span>
              ) : (
                <button
                  className="cal-definir-data-btn"
                  onClick={definirComoDataAtual}
                  disabled={definindoData}
                >
                  <i className="ti ti-calendar-check" aria-hidden="true" />
                  <span>{definindoData ? (en ? 'Setting…' : 'Definindo…') : (en ? 'Set as current date' : 'Definir como data atual')}</span>
                </button>
              )
            )}

            {/* Aniversário */}
            {diaFoco === diaAniversario && (
              <div className="cal-evento cal-evento-aniv">
                <i className="ti ti-cake" aria-hidden="true" />
                <span>
                  {en ? 'Birthday' : 'Aniversário do personagem'}
                  {dataAtual?.ano && dataNasc?.ano ? ` (${Number(dataAtual.ano) - Number(dataNasc.ano)} ${en ? 'years' : 'anos'})` : ''}
                </span>
              </div>
            )}

            {/* Feriados */}
            {(feriadosPorDia[diaFoco] || []).map((nome, i) => (
              <div key={i} className="cal-evento cal-evento-feriado">
                <i className="ti ti-sparkles" aria-hidden="true" />
                <span>{nome}</span>
              </div>
            ))}

            {/* Nota existente */}
            {notasPorDia[diaFoco] && !inputAtivo && (
              <div className="cal-nota-row">
                <i className="ti ti-notebook" aria-hidden="true" />
                <span className="cal-nota-texto">{notasPorDia[diaFoco]}</span>
                <button
                  className="cal-nota-del"
                  onClick={apagarNota}
                  disabled={salvando}
                  aria-label={en ? 'Delete note' : 'Apagar nota'}
                >
                  <i className="ti ti-trash" aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Input inline de nota */}
            {inputAtivo && (
              <div className="cal-input-row">
                <input
                  ref={inputRef}
                  type="text"
                  className="cal-input"
                  maxLength={25}
                  value={rascunho}
                  onChange={(e) => setRascunho(e.target.value.slice(0, 25))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter')  { e.preventDefault(); salvarNota(); }
                    if (e.key === 'Escape') { setInputAtivo(false); setRascunho(notasPorDia[diaFoco] || ''); }
                  }}
                  placeholder={en ? 'Up to 25 characters…' : 'Até 25 caracteres…'}
                />
                <button
                  className="cal-input-ok"
                  onClick={salvarNota}
                  disabled={salvando}
                  aria-label={en ? 'Save' : 'Salvar'}
                >
                  {salvando ? '…' : (en ? 'Save' : 'Salvar')}
                </button>
                <button
                  className="cal-input-cancel"
                  onClick={() => { setInputAtivo(false); setRascunho(notasPorDia[diaFoco] || ''); }}
                  aria-label={en ? 'Cancel' : 'Cancelar'}
                >
                  <i className="ti ti-x" aria-hidden="true" />
                </button>
              </div>
            )}

            {!(feriadosPorDia[diaFoco] || []).length && diaFoco !== diaAniversario && !notasPorDia[diaFoco] && !inputAtivo && (
              <p className="cal-agenda-vazio">{en ? 'Nothing on this day.' : 'Nada neste dia.'}</p>
            )}
          </div>
        )}

        {/* O mês — visível quando nenhum dia está selecionado */}
        {!diaFoco && (() => {
          // Mescla feriados, aniversário e notas numa lista plana ordenada por dia
          const itens = [];
          if (ehMesAniversario) itens.push({ dia: diaAniversario, tipo: 'aniv', texto: en ? 'Birthday' : 'Aniversário do personagem' });
          Object.entries(feriadosPorDia).forEach(([dia, nomes]) =>
            nomes.forEach((nome, i) => itens.push({ dia: Number(dia), tipo: 'feriado', texto: nome, i }))
          );
          Object.entries(notasPorDia).forEach(([dia, texto]) =>
            itens.push({ dia: Number(dia), tipo: 'nota', texto })
          );
          itens.sort((a, b) => a.dia - b.dia);
          return (
            <div className="cal-legenda">
              <p className="cal-agenda-rotulo">{en ? 'This month' : 'Neste mês'}</p>
              {itens.length === 0 ? (
                <p className="cal-agenda-vazio">{en ? 'No holidays this month' : 'Nenhum feriado neste mês'}</p>
              ) : itens.map((item, idx) => (
                <button key={idx} type="button" className={'cal-legenda-row is-' + item.tipo} onClick={() => selecionarDia(item.dia)}>
                  <span className="cal-legenda-num">{item.dia}</span>
                  <span className="cal-legenda-nome">{item.texto}</span>
                </button>
              ))}
            </div>
          );
        })()}
        </aside>
        </div>{/* cal-corpo */}
      </div>{/* cal-modal */}
      </div>{/* menestrel-ui */}
      <NavTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </div>,
    document.body
  );
}

/* ============================== [9.4b] Condição do tempo — três trilhas de cinco degraus ==============================
   Mora ao lado de data e local, na mesma barra do topo, e é gravada no MESMO
   jsonb (historias.data_jogo_atual.tempo) — por isso já chega em todo mundo
   pelo realtime que o CardDataJogoAtual assina, sem coluna nova nem migração.

   Um botão por trilha, e o botão CICLA — mesmo trato da iluminação da batalha
   ativa (VISIBILIDADE_ORDEM em 12-batalha/batalha.jsx): são degraus numa
   escada, o ícone diz em qual você está e o Mestre avança a chuva no meio da
   narração sem abrir menu. O tooltip nomeia a trilha e o degrau, que é o que
   o ícone sozinho não consegue dizer.

   Só o Mestre cicla; o Jogador vê. E a leitura é o motivo de NÃO usar
   `disabled` no botão do Jogador: botão desabilitado não dispara mouseenter,
   e sem tooltip o ícone fica mudo justamente pra quem não pode clicar.

   Os ícones foram conferidos contra o tabler-icons.min.css que o index.html
   carrega — mesma disciplina do VISIBILIDADE_ICONE, onde um `ti-cloud-moon`
   inventado virou quadrado vazio na tela. */
const TEMPO_TRILHAS = [
  {
    chave: 'agua',
    rotulo: { pt: 'Água', en: 'Water' },
    degraus: [
      { id: 'desertico',  ic: 'ti-cactus',      pt: 'Desértico',   en: 'Desert' },
      { id: 'arido',      ic: 'ti-droplet-off', pt: 'Árido',       en: 'Arid' },
      { id: 'fresco',     ic: 'ti-droplet',     pt: 'Fresco',      en: 'Fresh' },
      { id: 'chuva_fina', ic: 'ti-cloud-rain',  pt: 'Chuva fina',  en: 'Light rain' },
      { id: 'tempestade', ic: 'ti-cloud-storm', pt: 'Tempestade',  en: 'Storm' },
    ],
    padrao: 'fresco',
  },
  {
    chave: 'vento',
    rotulo: { pt: 'Vento', en: 'Wind' },
    degraus: [
      { id: 'sem_vento', ic: 'ti-wind-off', pt: 'Sem vento',    en: 'No wind' },
      { id: 'leves',     ic: 'ti-wind',     pt: 'Ventos leves', en: 'Light winds' },
      { id: 'ventania',  ic: 'ti-windsock', pt: 'Ventania',     en: 'Strong wind' },
      { id: 'vendaval',  ic: 'ti-storm',    pt: 'Vendaval',     en: 'Gale' },
      { id: 'tornado',   ic: 'ti-tornado',  pt: 'Tornado',      en: 'Tornado' },
    ],
    padrao: 'sem_vento',
  },
  {
    chave: 'temperatura',
    rotulo: { pt: 'Temperatura', en: 'Temperature' },
    degraus: [
      { id: 'frio_extremo',  ic: 'ti-snowflake',        pt: 'Frio extremo',  en: 'Extreme cold' },
      { id: 'frio_leve',     ic: 'ti-temperature-snow', pt: 'Frio leve',     en: 'Mild cold' },
      { id: 'agradavel',     ic: 'ti-temperature',      pt: 'Agradável',     en: 'Pleasant' },
      { id: 'calor_leve',    ic: 'ti-temperature-sun',  pt: 'Calor leve',    en: 'Mild heat' },
      { id: 'calor_extremo', ic: 'ti-flame',            pt: 'Calor extremo', en: 'Extreme heat' },
    ],
    padrao: 'agradavel',
  },
];

/* Degrau em que a trilha está. Mesa antiga (sem `tempo` no jsonb) e valor
   desconhecido caem no padrão da trilha em vez de sumir da tela. */
function degrauTempo(trilha, tempo) {
  const id = tempo && tempo[trilha.chave];
  return trilha.degraus.find((d) => d.id === id)
    || trilha.degraus.find((d) => d.id === trilha.padrao);
}

/* O botão ABRE A LISTA em vez de ciclar (16/09/2026): "ao clicar em um botão,
   abre as opções para escolher". Ciclar obrigava a passar por Tempestade para
   voltar de Chuva fina a Fresco, e o Mestre não navega o clima em escada — ele
   já sabe onde quer parar. Some, com isso, o `proximoDegrauTempo`. */

/* "Água · Chuva fina" — a trilha antes do degrau, porque três ícones lado a
   lado só se distinguem quando o tooltip diz de qual eixo cada um fala. */
function textoTempo(trilha, degrau, en) {
  return `${en ? trilha.rotulo.en : trilha.rotulo.pt} · ${en ? degrau.en : degrau.pt}`;
}

/* ============================== [9.4b2] O clima pinta o fundo do console ==============================
   "Água: efeito de chuva mais forte em tempestade, e efeito de areia mais
    forte em desértico. Vento: efeito de vento mais forte em tornado, e ir
    diminuindo. Temperatura: efeito de insolação mais forte em calor extremo,
    e efeito de neve mais forte em frio extremo." (usuário, 20/09/2026)

   Duas das três trilhas são EIXOS, não escadas: a água vai de deserto a
   tempestade passando por um meio seco-nem-molhado, e a temperatura vai de
   frio a calor passando por agradável. Nesses dois, o degrau do meio não
   desenha nada, e os lados desenham coisas DIFERENTES — areia e chuva não são
   o mesmo efeito com o sinal trocado, e por isso o mapa é explícito em vez de
   uma conta sobre o índice do degrau. Vento é a única escada de verdade.

   A tabela repete os ids de TEMPO_TRILHAS de propósito: quem mexer num degrau
   lá precisa decidir o que ele pinta aqui, e um id órfão simplesmente não
   desenha (ver efeitosDoTempo) em vez de derrubar a tela. */
const CLIMA_EFEITOS = {
  agua: {
    desertico:  { tipo: 'areia', intensidade: 2 },
    arido:      { tipo: 'areia', intensidade: 1 },
    fresco:     null,
    chuva_fina: { tipo: 'chuva', intensidade: 1 },
    tempestade: { tipo: 'chuva', intensidade: 2 },
  },
  vento: {
    sem_vento: null,
    leves:     { tipo: 'vento', intensidade: 1 },
    ventania:  { tipo: 'vento', intensidade: 2 },
    vendaval:  { tipo: 'vento', intensidade: 3 },
    tornado:   { tipo: 'vento', intensidade: 4 },
  },
  temperatura: {
    frio_extremo:  { tipo: 'neve', intensidade: 2 },
    frio_leve:     { tipo: 'neve', intensidade: 1 },
    agradavel:     null,
    calor_leve:    { tipo: 'insolacao', intensidade: 1 },
    calor_extremo: { tipo: 'insolacao', intensidade: 2 },
  },
};

/* `hasOwnProperty` e não `mapa[id]` direto: o id vem de um jsonb do banco, e
   um valor como "constructor" acharia algo no protótipo e viraria um efeito
   sem tipo na tela. */
function efeitoDoDegrau(chave, id) {
  const mapa = CLIMA_EFEITOS[chave];
  return Object.prototype.hasOwnProperty.call(mapa, id) ? mapa[id] : null;
}

/* O que o fundo desenha, na ordem em que as camadas entram. Recebe o jsonb
   inteiro, não só `.tempo`, porque é assim que é chamada — e mesa sem clima
   definido, que é a maioria, tem que abrir com a tela limpa: os padrões das
   três trilhas (fresco, sem vento, agradável) são justamente os neutros. */
function efeitosDoTempo(data) {
  const tempo = (data && data.tempo) || {};
  const ventoEfeito = efeitoDoDegrau('vento', tempo.vento);
  const vento = ventoEfeito ? ventoEfeito.intensidade : 0;
  return ['agua', 'vento', 'temperatura'].reduce((acc, chave) => {
    const e = efeitoDoDegrau(chave, tempo[chave]);
    if (!e) return acc;
    // Chuva e neve caem tortas quando venta — o nível viaja junto na camada
    // em vez de ela ter que ir buscá-lo.
    const caiDoCeu = e.tipo === 'chuva' || e.tipo === 'neve';
    acc.push(caiDoCeu ? { ...e, vento } : { ...e });
    return acc;
  }, []);
}

/* ============================== [9.4c] Dia ou noite — o botão ao lado do clima ==============================
   "Juntamente com os cards de local, data e mesa do topo, adicione um botão
    para selecionar se é dia ou se é noite." (usuário, 17/09/2026)

   Mesmo arranjo do clima: mora no jsonb `historias.data_jogo_atual` (chave
   `periodo`), e por isso já chega a todo mundo pelo realtime que o card já
   assina — sem coluna nova nem migração.

   Diferente do clima, aqui o botão ALTERNA em vez de abrir lista: são dois
   estados, e uma lista de duas opções custa um clique a mais para dizer o que
   o ícone já diz. Mesa antiga (sem `periodo` no jsonb) é dia. */
const PERIODOS = [
  { id: 'dia',   ic: 'ti-sun',  pt: 'Dia',   en: 'Day' },
  { id: 'noite', ic: 'ti-moon', pt: 'Noite', en: 'Night' },
];

/* ============================== [9.4d] A hora do jogo e a luz que ela lança ==============================
   "a iluminação dourada mais à direita representa o sol nascendo no leste, e a
    luz mais à esquerda se pondo no oeste. (…) Para ambos, a iluminação ao meio
    representa meio dia e meia noite, horário onde a luz ficará mais forte."
   (usuário, 20/09/2026)

   A hora (0–23) mora no MESMO jsonb da data (`data_jogo_atual.hora`), como o
   clima e o período antes dela — nenhuma coluna nova, e o realtime que o card
   já assina entrega a mudança a todo mundo.

   O PERÍODO DEIXOU DE SER ESCOLHA e virou consequência: 6h–17h é dia, 18h–5h
   é noite. O sol/lua da barra continua lá, agora como leitura do que a hora
   diz. Isso põe meio-dia e meia-noite no centro exato de cada travessia, que é
   o que o efeito pede — o dia e a noite precisam ter a mesma duração pra luz
   chegar ao auge no meio dos dois.

   Mesa antiga não tem `hora`, e é aí que o `periodo` já gravado ainda serve:
   vale como fallback até alguém definir a hora. Sem isso, toda mesa em curso
   amanheceria à meia-noite no dia em que este código subisse. */
const HORA_NASCER = 6;          // primeira hora de dia
const HORAS_POR_PERIODO = 12;   // dia e noite têm a mesma duração

function periodoDaHora(hora) {
  return (hora >= HORA_NASCER && hora < HORA_NASCER + HORAS_POR_PERIODO) ? 'dia' : 'noite';
}

/* 0 no nascente (leste, à direita), 0.5 no meio da travessia (meio-dia ou
   meia-noite, no centro), 1 no poente (oeste, à esquerda).

   O `+ 24` antes do módulo é a virada das 23h para as 0h: sem ele a noite
   ganha fase negativa depois da meia-noite e a luz salta para fora da tela. */
function faseDoPeriodo(hora) {
  const inicio = periodoDaHora(hora) === 'dia' ? HORA_NASCER : HORA_NASCER + HORAS_POR_PERIODO;
  return ((hora - inicio + 24) % 24) / HORAS_POR_PERIODO;
}

/* Hora utilizável a partir do jsonb, que pode vir de mesa antiga, de mesa sem
   data nenhuma, ou com lixo — a barra do topo nunca pode sumir por causa disso. */
function horaDoJogo(data) {
  const h = data && data.hora;
  if (Number.isInteger(h) && h >= 0 && h <= 23) return h;
  return (data && data.periodo === 'noite') ? 0 : 12;
}

/* O que o fundo do console precisa saber. `origemX` é a posição horizontal da
   fonte de luz em %, e `forca` a intensidade — nunca 0, senão a tela fica
   chapada no nascer e no pôr do sol, onde ainda há luz rasante. `inclinacao`
   deixa os raios verticais no auge (sol a pino) e deitados no horizonte. */
function luzDaHora(data) {
  const hora = horaDoJogo(data);
  const periodo = periodoDaHora(hora);
  const fase = faseDoPeriodo(hora);
  const quente = periodo === 'dia';
  return {
    hora,
    periodo,
    fase,
    quente,
    origemX: (1 - fase) * 100,
    forca: 0.35 + 0.65 * Math.sin(Math.PI * fase),
    inclinacao: -45 + fase * 90,
    // Ouro e bronze de dia (os mesmos de sempre); luar de aço à noite.
    cor: quente ? '201,164,78' : '143,166,196',
    cor2: quente ? '184,112,46' : '92,115,146',
  };
}

/* O fundo do console pronto para aplicar: o AdminConsole não faz conta, só
   pinta. É o que permite provar a iluminação sem montar o console inteiro,
   com sessão, perfil e mesa. Os cinco valores são exatamente os que mudam com
   a hora — máscara (de onde a luz vem), inclinação (quão rasante ela é),
   opacidade (quão forte) e o par de cores dos filetes. */
function estiloLuzFundo(data) {
  const luz = luzDaHora(data);
  const doisDec = (n) => Math.round(n * 100) / 100;
  const rgba = (cor, a) => `rgba(${cor},${a})`;
  const filete = (cor) => `linear-gradient(${rgba(cor, 1)} 0%, ${rgba(cor, 0)} 100%)`;
  /* O AUGE É O PONTO ALTO (20/09/2026, "torne os horários 12h e 24h mais
     claros"). Duas coisas acontecem no meio da travessia, e nenhuma delas é
     levantar o dia inteiro:

     - a opacidade é o QUADRADO da força, não ela mesma. O teto subiu de 0.1
       para 0.24, mas o quadrado segura o horizonte onde ele já estava (0.03) e
       estreita a corcova, então o meio-dia se destaca das horas vizinhas em
       vez de arrastar a tarde toda com ele.
     - a máscara ABRE de 125% para 175%: a pino, a luz não é só mais forte,
       ela alcança mais tela. */
  const auge = Math.sin(Math.PI * luz.fase);
  return {
    mask: `radial-gradient(${doisDec(125 + 50 * auge)}% 100% at ${doisDec(luz.origemX)}% 0%, #000 0%, rgba(0,0,0,0.22) 88%, transparent 100%)`,
    transform: `skewX(${doisDec(luz.inclinacao)}deg)`,
    opacity: 0.24 * luz.forca * luz.forca,
    corA: rgba(luz.cor, 1),
    corB: rgba(luz.cor2, 1),
    gradA: filete(luz.cor),
    gradB: filete(luz.cor2),
  };
}

function periodoDoJogo(data) {
  const id = luzDaHora(data).periodo;
  return PERIODOS.find((p) => p.id === id) || PERIODOS[0];
}

/* ============================== [9.5] CardDataJogoAtual — card flutuante com data/local atual da mesa ==============================
   Mostra sempre (Mestre e Jogador) onde a aventura está agora — separado
   da "data de início" (data_inicio/data_jogo, fixas, só editadas na criação
   da história em NovaHistoriaModal). Este card lê/escreve historias.data_jogo_atual
   (jsonb: { dia, mes, ano, local }), que avança manualmente conforme o Mestre
   narra a passagem do tempo/viagem da mesa.

   Fixo no TOPO da tela (barra), igual decisão combinada com o usuário —
   diferente da CentralMensagens (FAB no rodapé). Convive bem com a Topbar
   porque só aparece dentro do AdminConsole (sessão/mesa ativa resolvida),
   nunca na landing.

   Mestre: clique no card → vira formulário inline (FantasyDatePicker + input
   de local) → Salvar grava direto em historias.data_jogo_atual (update
   simples, sem RPC — mesmo padrão de campo solto que NovaHistoriaModal usa
   pra data_inicio/data_jogo).
   Jogador: mesmo card, somente leitura (sem affordance de clique).

   Sem historiaId (mesa não resolvida) não monta nada — mesmo contrato da
   CentralMensagens.
*/
/* ── O CATÁLOGO MÍNIMO DOS ANIMAIS (06/10/2026) ────────────────────────────
   O desgaste do bicho precisa de UMA coisa do catálogo: quais slugs são
   animais (`criatura_id` não nulo). São ~60 linhas contra as 1.162 do catálogo
   inteiro, e não mudam durante a sessão — então é lido uma vez por aba e
   guardado aqui, fora do componente, para o relógio da mesa não puxar o
   catálogo completo a cada hora que o Mestre avança. */
let _animaisDoCatalogo = null;
async function catalogoDosAnimais() {
  if (_animaisDoCatalogo) return _animaisDoCatalogo;
  const { data, error } = await supabaseClient
    .from('itens').select('slug, criatura_id').not('criatura_id', 'is', null);
  if (error || !data) { console.error('[desgaste] catálogo dos animais:', error); return {}; }
  _animaisDoCatalogo = Object.fromEntries(data.map((r) => [r.slug, r]));
  return _animaisDoCatalogo;
}

function CardDataJogoAtual({ lang, historiaId, podeEditar, userId, minhasHistorias, mesaAtivaId, setMesaAtivaId, profile, onNovaHistoria, esconderSeletorEBotaoNovo, sidebarLargura = 208, onNovoPersonagem, esconderBotaoPersonagem, dataNascPjAtivo = null, onDataAtual = null }) {
  /* A ALTURA REAL DA PÍLULA (revisão, 22/10/2026): no celular e no tablet ela
     quebra em linhas — e "Novo personagem" pode abrir mais uma. Um número fixo
     deixava o conteúdo por baixo dela. Ref de callback: acompanha o elemento
     mesmo quando ele é recriado; publica a altura em --cdj-h no #root. */
  const roCdj = React.useRef(null);
  const medirCdj = React.useCallback((el) => {
    if (roCdj.current) { roCdj.current.disconnect(); roCdj.current = null; }
    /* Sem a faixa (fora de mesa), a altura dela é zero — e não o último valor
       medido nem o padrão do CSS, que deixavam um vão acima do conteúdo. */
    if (!el) { const r = document.getElementById('root'); if (r) r.style.setProperty('--cdj-h', '0px'); return; }
    if (typeof ResizeObserver === 'undefined') return;
    const raiz = el.closest('#root') || document.documentElement;
    const ro = new ResizeObserver(() => raiz.style.setProperty('--cdj-h', Math.ceil(el.getBoundingClientRect().height) + 'px'));
    ro.observe(el);
    roCdj.current = ro;
  }, []);
  const [tip, abrirTip, fecharTip, manterTip] = useNavTooltip(60);
  const [dataAtual, setDataAtual] = useState(null); // { dia, mes, ano, local } | null
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(null); // null | 'data' | 'local'
  const [rascunho, setRascunho] = useState({ dia: 1, mes: 1, ano: 0, local: '' });
  /* LUGARES DO CATÁLOGO para o local (26/09/2026): "no input de selecionar o
     local, na história, eu quero um dropdown menu com os lugares do
     catálogo". Reinos e cidades do mundo mais as cópias desta aventura,
     carregados quando o campo abre. O local continua gravado como TEXTO (o
     nome), então o que já estava salvo segue valendo — e, se não estiver no
     catálogo, aparece como primeira opção. */
  const [lugares, setLugares] = useState(null);
  /* RECARREGA A CADA ABERTURA (26/09/2026): 'criei vários reinos e cidades, mas
     eles não aparecem no seletor'. A lista era carregada na primeira vez e
     guardada até recarregar a página. Ao fechar o campo ela é descartada, e a
     próxima abertura busca de novo — o que foi criado no Diário entra. */
  useEffect(() => { if (editando !== 'local') setLugares(null); }, [editando, historiaId]);
  useEffect(() => {
    if (editando !== 'local' || lugares) return undefined;
    let cancel = false;
    /* TODOS OS LUGARES (27/09/2026): "ainda não está buscando todos os lugares
       do catálogo". A lista vinha só do mundo + da mesa aberta, e os reinos
       criados no Diário de OUTRA aventura do mesmo Mestre ficavam de fora
       (os 18 da aventura 24 não apareciam nas outras). Agora: o mundo e todas
       as aventuras deste Mestre. A RLS de reinos/cidades deixa ler tudo; o
       filtro por dono é daqui, para não listar o mundo de outros Mestres. */
    (async () => {
      let meus = [];
      try {
        const { data: au } = await supabaseClient.auth.getUser();
        const uid = au && au.user && au.user.id;
        if (uid) {
          const { data: hs } = await supabaseClient.from('historias').select('id').eq('mestre_id', uid);
          meus = (hs || []).map((h) => h.id);
        }
      } catch (_) { meus = []; }
      if (historiaId && !meus.includes(historiaId)) meus.push(historiaId);
      const filtro = meus.length ? `historia_id.is.null,historia_id.in.(${meus.join(',')})` : 'historia_id.is.null';
      const buscar = async (tabela, cols) => {
        try { return await supabaseClient.from(tabela).select(cols).or(filtro); } catch (_) { return { data: null }; }
      };
      const [r, c] = await Promise.all([
        buscar('reinos', 'slug,nome,historia_id'),
        buscar('cidades', 'slug,nome,reino,historia_id'),
      ]);
      if (cancel) return;
      const modelos = new Set(['novo-reino', 'nova-cidade']);
      const reinos = ((r && r.data) || []).filter((e) => !modelos.has(e.slug));
      const cidades = ((c && c.data) || []).filter((e) => !modelos.has(e.slug));
      const nomePorSlug = {};
      reinos.forEach((e) => { if (e.slug) nomePorSlug[e.slug] = e.nome; });
      const vistos = new Set();
      const lista = [];
      const incluir = (nome, reinoSlug) => {
        const n = String(nome || '').trim();
        if (!n || vistos.has(n.toLowerCase())) return;
        vistos.add(n.toLowerCase());
        const reino = reinoSlug ? (nomePorSlug[reinoSlug] || reinoSlug) : null;
        lista.push({ value: n, label: reino ? `${n} — ${reino}` : n, labelBotao: n });
      };
      reinos.forEach((e) => incluir(e.nome, null));
      cidades.forEach((e) => incluir(e.nome, e.reino));
      lista.sort((a, b) => a.value.localeCompare(b.value, 'pt'));
      setLugares(lista);
    })();
    return () => { cancel = true; };
  }, [editando, lugares, historiaId]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  // O seletor de local fecha ao clicar fora (ou Esc) sem ter escolhido.
  const localRef = useRef(null);
  useEffect(() => {
    if (editando !== 'local') return undefined;
    const fora = (e) => {
      if (localRef.current && localRef.current.contains(e.target)) return;
      if (e.target.closest && e.target.closest('.select-pill-drop-portal')) return;
      setEditando(null);
    };
    const esc = (e) => { if (e.key === 'Escape') setEditando(null); };
    document.addEventListener('mousedown', fora);
    window.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); window.removeEventListener('keydown', esc); };
  }, [editando]);
  const [tempoAberto, setTempoAberto] = useState(null); // chave da trilha com a lista aberta
  const [horaAberta, setHoraAberta] = useState(false); // lista das 24 horas
  const [calendarioAberto, setCalendarioAberto] = useState(false);
  const tempoDropRef = React.useRef(null);
  const horaDropRef = React.useRef(null);
  // Espelho de `editando` para o ouvinte de realtime, que é montado uma vez
  // por mesa e não pode depender do estado da edição em curso.
  const editandoRef = React.useRef(null);
  useEffect(() => { editandoRef.current = editando; }, [editando]);

  /* O fundo do console é iluminado pela hora da mesa (ver luzDaHora), e quem
     carrega e assina esse jsonb é este card — não o AdminConsole, que é o pai
     e só tem a pintura. Sem este aviso, o Mestre avançaria o relógio e a luz
     só mudaria no F5 seguinte. Vale para o Jogador também: a hora chega a ele
     pelo realtime, e o fundo dele tem que acompanhar. */
  useEffect(() => { if (onDataAtual) onDataAtual(dataAtual); }, [dataAtual, onDataAtual]);

  /* Mesmo trato para a lista do clima, mais o Escape: o grupo inteiro divide um
     ref, então clicar no pill do Vento com a lista da Água aberta troca de lista
     em vez de fechar — é um clique dentro do grupo, e o onClick do pill resolve. */
  useEffect(() => {
    if (!tempoAberto) return undefined;
    const fora = (e) => {
      if (tempoDropRef.current && !tempoDropRef.current.contains(e.target)) setTempoAberto(null);
    };
    const esc = (e) => { if (e.key === 'Escape') setTempoAberto(null); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [tempoAberto]);

  // Idem para a lista das horas, que tem o próprio ref por ser um pill só.
  useEffect(() => {
    if (!horaAberta) return undefined;
    const fora = (e) => {
      if (horaDropRef.current && !horaDropRef.current.contains(e.target)) setHoraAberta(false);
    };
    const esc = (e) => { if (e.key === 'Escape') setHoraAberta(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [horaAberta]);

  // Carrega data_jogo_atual sempre que a mesa ativa muda (troca de história do
  // Mestre, ou troca de PJ ativo do Jogador) — mesmo gatilho de CentralMensagens.
  useEffect(() => {
    setEditando(null);
    setErro(null);
    if (!historiaId) { setDataAtual(null); setCarregando(false); return undefined; }
    let cancel = false;
    setCarregando(true);
    (async () => {
      const { data, error } = await supabaseClient
        .from('historias').select('data_jogo_atual').eq('id', historiaId).maybeSingle();
      if (cancel) return;
      setCarregando(false);
      if (error) { console.error('[data-jogo-atual] carga falhou:', error); return; }
      setDataAtual(data && data.data_jogo_atual ? data.data_jogo_atual : null);
    })();

    /* A data é DA MESA, não de quem olha (15/09/2026): o Mestre avança o dia e
       todo mundo tem que ver o mesmo dia, sem recarregar a página.

       Antes a carga acontecia uma vez, quando a mesa era resolvida — o jogador
       ficava com a data velha na tela até dar F5. `historias` já está na
       publicação de realtime (a mesma que mesa_log e batalhas usam), então é
       só ouvir o UPDATE da linha desta mesa.

       O `select` acima continua sendo a fonte da primeira pintura: realtime
       traz o que MUDA, não o que já estava lá. */
    const canal = (typeof supabaseClient.channel === 'function')
      ? supabaseClient
        .channel('historia_data_' + historiaId)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'historias', filter: 'id=eq.' + historiaId,
        }, (payload) => {
          if (cancel) return;
          const nova = payload && payload.new && payload.new.data_jogo_atual;
          // Editando: não puxa o tapete de quem está com o formulário aberto.
          setDataAtual((atual) => (editandoRef.current ? atual : (nova || null)));
        })
        .subscribe()
      : null;

    return () => {
      cancel = true;
      if (canal) supabaseClient.removeChannel(canal);
    };
  }, [historiaId]);

  const abrirEdicao = (modo) => {
    if (!podeEditar) return;
    setRascunho({
      dia: (dataAtual && dataAtual.dia) || 1,
      mes: (dataAtual && dataAtual.mes) || 1,
      ano: (dataAtual && dataAtual.ano) || 0,
      local: (dataAtual && dataAtual.local) || '',
    });
    setErro(null);
    setEditando(modo);
  };

  /* O TEMPO DA MESA VIRA EVENTO NO LOG (20/09/2026). Mesmo padrão de
     registrarEventoMesa em 11-ficha e 07-inventario: RPC SECURITY DEFINER que
     grava em mesa_log, e o Realtime distribui para Mestre e Jogadores.

     Não bloqueia nem desfaz nada: a data, a hora e o clima já foram gravados e
     já estão na tela de todo mundo quando isto dispara. Falhar aqui custa uma
     linha no log, não a mudança — por isso o erro só vai para o console.

     `meta` guarda o valor estruturado ao lado do texto já escrito. O texto é
     renderizado no idioma de QUEM MEXEU (é assim que todo evento de mesa já
     funciona); o meta é o que permitiria, um dia, reescrever o evento no
     idioma de quem lê. */
  const registrarEventoMesa = (texto, meta) => {
    if (!historiaId || !texto) return;
    supabaseClient
      .rpc('registrar_evento_mesa', {
        p_historia_id: historiaId,
        p_tipo: 'sistema',
        p_texto: texto,
        p_meta: meta || {},
      })
      .then(({ data, error }) => {
        if (error || (data && data.ok === false)) {
          console.error('[data-jogo-atual] registrar_evento_mesa falhou:', error || data);
        }
      });
  };

  /* ============================== O RELÓGIO DESGASTA A MESA ==============================
     Implementa docs/superpowers/specs/2026-09-20-clima-desgaste-design.md. As
     regras todas moram em 01-core/clima-desgaste.jsx, puras; o que está aqui é
     só a ida ao banco.

     Escreve nos PJs dos OUTROS: a policy personagens_update_own_or_vinculado
     autoriza o Mestre a mexer em quem está em `protagonista_ids` da história
     dele. Não é preciso RPC — foi conferido em pg_policies antes de desenhar.

     Nada disto bloqueia a barra: a hora e o clima já foram gravados e já estão
     na tela de todo mundo quando estas funções rodam. Falhar aqui deixa horas
     PENDENTES, não perdidas — é para isso que serve a âncora. */

  // O instante em que a mesa está, ou null quando ela ainda não tem data.
  const instanteDe = (d) => {
    if (!d || d.dia == null || d.mes == null || d.ano == null) return null;
    return { ano: d.ano, mes: d.mes, dia: d.dia, hora: horaDoJogo(d) };
  };

  /* A ÂNCORA é o instante até onde o desgaste já foi cobrado, e não o relógio
     anterior. A diferença importa quando uma escrita falha: com o relógio como
     referência, aquelas horas sumiriam para sempre; com a âncora, elas ficam
     devendo e são cobradas no próximo movimento.

     Mesa sem âncora (todas, no dia em que isto subir) ancora no relógio atual:
     ninguém acorda devendo quinhentas horas de fome. */
  const ancoraDe = (d) => (d && d.decaimento_em) || instanteDe(d);

  /* ── O CLIMA DESGASTA O BICHO TAMBÉM (06/10/2026) ────────────────────────
     "Eu espero que os efeitos do tempo e do clima também estejam afetando os
      animais." (usuário)

     O estado do animal mora na INSTÂNCIA do inventário, e `personagens
     .inventario` é um jsonb gravado inteiro por três telas (Inventário, Ficha
     e batalha). Por isso a escrita passa por `alterarInventario` —
     compare-and-swap em `inventario_versao`
     (01-core/inventario-concorrencia.jsx): a primeira versão disto gravava num
     UPDATE direto junto do `estado_atual`, e o Mestre avançando o relógio
     apagava o que o jogador acabara de mexer na ficha.

     `comDesgasteNosAnimais` devolve a MESMA lista quando não há animal nenhum,
     e `alterarInventario` não grava nada nesse caso — a esmagadora maioria dos
     PJs não tem bicho, e nenhum deles paga uma escrita por hora de relógio. */
  const desgastarAnimaisDoPj = async (pjId, horas, horaInicial, tempo) => {
    if (!pjId || horas <= 0) return;
    const cat = await catalogoDosAnimais();
    const r = await window.alterarInventario(pjId, (inv) =>
      window.comDesgasteNosAnimais(inv, horas, horaInicial, tempo, cat));
    if (r && !r.ok) console.error('[desgaste] animais do PJ', pjId, r.error);
  };

  // O mesmo par do personagem: o tique cobra SÓ o degrau do clima que mudou.
  const tiqueNosAnimaisDoPj = async (pjId, trilhaChave, degrauId) => {
    if (!pjId) return;
    const cat = await catalogoDosAnimais();
    const r = await window.alterarInventario(pjId, (inv) =>
      window.comTiqueDeClimaNosAnimais(inv, trilhaChave, degrauId, cat));
    if (r && !r.ok) console.error('[desgaste] tique nos animais do PJ', pjId, r.error);
  };

  const aplicarDesgasteNosPJs = async (horas, horaInicial, tempo, instanteNovo) => {
    if (horas <= 0) return;
    const { data: hist, error } = await supabaseClient
      .from('historias').select('protagonista_ids').eq('id', historiaId).maybeSingle();
    if (error || !hist) { console.error('[desgaste] não consegui ler os protagonistas:', error); return; }
    const ids = Array.isArray(hist.protagonista_ids) ? hist.protagonista_ids : [];
    if (ids.length === 0) return;
    // A linha INTEIRA: a atividade (dormir, meditar…) recupera energia até o
    // máximo da ficha e soma atributo, e os dois saem de calcularFicha.
    const { data: pjs, error: erroPjs } = await supabaseClient
      .from('personagens').select('*').in('id', ids);
    if (erroPjs || !pjs) { console.error('[desgaste] não consegui ler os PJs:', erroPjs); return; }
    const semKarma = window.SEM_KARMA || new Set();   // vazio desde 23/10/2026: todos podem ter Karma
    await Promise.all(pjs.map((pj) => {
      /* A Licantropia que venceu nesta virada sai do estado (22/10/2026): é o
         que devolve o lobisomem à forma normal em telas que leem o PJ sem a
         data da mesa (card do Mestre, por exemplo). */
      const est = limparTransformacoesVencidas(pj.estado_atual || {}, instanteNovo);
      const tipoAtividade = est.atividade && est.atividade.tipo;
      const desgastado = { ...est, condicoes: decaimentoPorHoras(est.condicoes, horaInicial, horas, tempo, tipoAtividade) };
      /* O descanso vem DEPOIS do desgaste: o máximo de EF/EH/KA depende das
         condições (fome tira karma, por exemplo), e vale o das condições que
         a hora deixou. */
      // Morto não descansa nem treina: EF no piso da batalha (EF_MORTE, −15)
      // ou a marca manual de "morto" do Mestre.
      const morto = Number(est.vitalidade && est.vitalidade.ef) <= -15
        || (Array.isArray(est.status) && est.status.some((st) => (window.tipoDoStatus || (() => null))(st) === 'morto'));
      let novo = desgastado;
      if (tipoAtividade) {
        const ficha = calcularFicha({ ...pj, estado_atual: est }, null, desgastado.condicoes);
        const d = ficha.derivadas || {};
        novo = recuperacaoPorAtividade(desgastado, horas, {
          atributos: ficha.atributos,
          maximos: { ef: Number(d.energiaFisica) || 0, eh: Number(d.energiaHeroica) || 0, ka: Number(d.karmamax) || 0 },
          semKarma: semKarma.has(pj.profissao),
          morto,
        });
      }
      /* FILA DE TREINO (22/10/2026): as horas na atividade ligada treinam as
         técnicas e magias compradas; o nível concluído vira usável. A fila
         anda NO BANCO (RPC avancar_treinos, linha travada) — regravar a
         coluna daqui apagava a compra feita entre a leitura e a escrita. */
      const treina = tipoAtividade && !morto && Array.isArray(pj.treinos) && pj.treinos.length > 0;
      return Promise.all([
        supabaseClient.from('personagens').update({ estado_atual: novo }).eq('id', pj.id)
          .then(({ error: e }) => { if (e) console.error('[desgaste] PJ', pj.id, e); }),
        treina && Promise.resolve(supabaseClient.rpc('avancar_treinos', { p_pj_id: pj.id, p_atividade: tipoAtividade, p_horas: horas }))
          .then(({ error: e }) => { if (e) console.error('[treino] PJ', pj.id, e); }),
        // Os bichos do PJ, pela porta do compare-and-swap (ver acima).
        desgastarAnimaisDoPj(pj.id, horas, horaInicial, tempo),
      ]);
    }));
  };

  /* Chuva coletada. A entrada da água é somada à que existir — e nasce com
     preço nenhum, herdando o do catálogo, porque água da chuva não tem dono.
     CORREÇÃO de 02/10/2026: isto lia estoque_loja como array flat (formato
     antigo); no formato de comércios virava "[]" e a gravação apagava a loja
     inteira da mesa. A conta agora é somarAguaNaLoja (01-core/clima-desgaste),
     que conhece os dois formatos e não toca em nenhum outro item. */
  const aplicarChuvaNaLoja = async (horas, tempo) => {
    const porHora = aguaPorHoraDeChuva(tempo && tempo.agua);
    if (porHora <= 0 || horas <= 0) return;
    const ganho = porHora * horas;
    const { data: hist, error } = await supabaseClient
      .from('historias').select('estoque_loja').eq('id', historiaId).maybeSingle();
    if (error || !hist) { console.error('[desgaste] não consegui ler a loja:', error); return; }
    const novo = somarAguaNaLoja(hist.estoque_loja, ganho, novoInstanceId);
    const { error: erroUp } = await supabaseClient
      .from('historias').update({ estoque_loja: novo }).eq('id', historiaId);
    if (erroUp) console.error('[desgaste] não consegui gravar a loja:', erroUp);
  };

  /* O desgaste de N horas: as condições dos PJs e a água da loja. `horaInicial`
     é a hora da ÂNCORA, não a nova — é dela que o motor parte para saber
     quantas das horas cruzadas caem na janela do sono. */
  /* A cobrança avulsa de mudar o clima: uma hora daquele degrau, em todos os
     PJs da mesa. Percorre os mesmos passos de aplicarDesgasteNosPJs, mas
     chamando tiqueDeClima — que cobra SÓ o efeito do clima, sem a fome, a sede
     de base e o sono, porque o relógio não andou. */
  const aplicarTiqueDeClima = async (trilhaChave, degrauId) => {
    if (trilhaChave !== 'temperatura') return;
    const { data: hist, error } = await supabaseClient
      .from('historias').select('protagonista_ids').eq('id', historiaId).maybeSingle();
    if (error || !hist) { console.error('[desgaste] tique: protagonistas', error); return; }
    const ids = Array.isArray(hist.protagonista_ids) ? hist.protagonista_ids : [];
    if (ids.length === 0) return;
    const { data: pjs, error: erroPjs } = await supabaseClient
      .from('personagens').select('id, estado_atual').in('id', ids);
    if (erroPjs || !pjs) { console.error('[desgaste] tique: PJs', erroPjs); return; }
    await Promise.all(pjs.map((pj) => {
      const est = pj.estado_atual || {};
      const novo = { ...est, condicoes: tiqueDeClima(est.condicoes, trilhaChave, degrauId) };
      return Promise.all([
        supabaseClient.from('personagens').update({ estado_atual: novo }).eq('id', pj.id)
          .then(({ error: e }) => { if (e) console.error('[desgaste] tique PJ', pj.id, e); }),
        tiqueNosAnimaisDoPj(pj.id, trilhaChave, degrauId),
      ]);
    }));
  };

  const cobrarHoras = async (ancora, instanteNovo, tempo) => {
    const horas = horasEntre(ancora, instanteNovo);
    if (horas <= 0) return;
    await Promise.all([
      aplicarDesgasteNosPJs(horas, horaDoJogo(ancora), tempo, instanteNovo),
      aplicarChuvaNaLoja(horas, tempo),
    ]);
  };

  const salvar = async (sobrepor) => {
    const rascunhoFinal = { ...rascunho, ...(sobrepor || {}) };
    setSalvando(true);
    setErro(null);
    // Guardado ANTES do update: é com ele que se decide o que mudou de fato e,
    // portanto, o que merece virar evento no log.
    const anteriorSalvar = dataAtual;
    /* O jsonb é reescrito inteiro pelo update, então TUDO que mora nele tem
       que entrar no payload — inclusive o tempo, que este formulário nem
       mostra. Sem isso, editar o local apagava a condição do tempo. */
    const payload = {
      ...(dataAtual || {}),
      dia: rascunhoFinal.dia, mes: rascunhoFinal.mes, ano: rascunhoFinal.ano, local: String(rascunhoFinal.local || '').trim(),
      tempo: (dataAtual && dataAtual.tempo) || undefined,
    };
    const { error } = await supabaseClient
      .from('historias').update({ data_jogo_atual: payload }).eq('id', historiaId);
    setSalvando(false);
    if (error) {
      console.error('[data-jogo-atual] salvar falhou:', error);
      setErro(error.hint || error.message);
      return;
    }
    setDataAtual(payload);
    setEditando(null);
    /* Data E local numa mesma edição viram DOIS eventos: são duas informações
       diferentes para quem lê o log, e quem só mexeu no local não deve fazer o
       calendário parecer que andou. Por isso cada um só dispara se mudou de
       verdade — comparando com o que estava antes, não com o vazio. */
    const mudouData = !anteriorSalvar
      || anteriorSalvar.dia !== payload.dia
      || anteriorSalvar.mes !== payload.mes
      || anteriorSalvar.ano !== payload.ano;
    const mudouLocal = ((anteriorSalvar && anteriorSalvar.local) || '') !== payload.local;
    if (mudouData) {
      registrarEventoMesa(textoEventoData(payload, lang === "en"),
        { data: { dia: payload.dia, mes: payload.mes, ano: payload.ano } });
    }
    if (mudouLocal) registrarEventoMesa(textoEventoLocal(payload.local, lang === "en"), { local: payload.local });
  };

  // Define a data atual da aventura a partir do calendário (mestre) — preserva o local
  const definirDataAtual = async ({ dia, mes, ano }) => {
    const anterior = dataAtual;
    const ancora = ancoraDe(anterior);
    const instanteNovo = { ano, mes, dia, hora: horaDoJogo(anterior) };
    const payload = {
      ...(anterior || {}),
      dia, mes, ano,
      local: (anterior && anterior.local) || '',
      tempo: (anterior && anterior.tempo) || undefined,
      decaimento_em: instanteNovo,
    };
    const { error } = await supabaseClient
      .from('historias').update({ data_jogo_atual: payload }).eq('id', historiaId);
    if (error) { console.error('[data-jogo-atual] definir data falhou:', error); return { error }; }
    setDataAtual(payload);
    /* Avançar três dias no calendário são 72 horas de desgaste — data e
       relógio contam igual. Para TRÁS não cobra nada (horasEntre devolve 0) e
       só re-ancora: tempo que passou, passou. */
    await cobrarHoras(ancora, instanteNovo, anterior && anterior.tempo);
    registrarEventoMesa(textoEventoData(payload, lang === "en"), { data: { dia, mes, ano } });
    return {};
  };

  /* Grava UM degrau de UMA trilha. Otimista: a barra já mostra o degrau novo
     enquanto o update viaja — a lista fecha no clique, e esperar o banco para
     repintar deixaria o pill no valor velho por um tempo visível. Falhou, volta
     ao que estava e registra. */
  const definirTempo = async (trilha, prox) => {
    if (!podeEditar || !historiaId) return;
    setTempoAberto(null);
    const anterior = dataAtual;
    if (degrauTempo(trilha, anterior && anterior.tempo) === prox) return;
    /* Espalha o que já estava no jsonb em vez de remontar campo a campo: numa
       mesa que ainda não tem data, remontar inventaria um 1/1/0 e a barra
       passaria a exibir uma data que o Mestre nunca definiu. Mexer no tempo
       tem que mexer SÓ no tempo. */
    const payload = {
      ...(anterior || {}),
      tempo: { ...((anterior && anterior.tempo) || {}), [trilha.chave]: prox.id },
    };
    setDataAtual(payload);
    const { error } = await supabaseClient
      .from('historias').update({ data_jogo_atual: payload }).eq('id', historiaId);
    if (error) {
      console.error('[data-jogo-atual] definir tempo falhou:', error);
      setDataAtual(anterior);
      return;   // desfeito na tela, não anuncia no log o que não aconteceu
    }
    /* O TIQUE IMEDIATO. Mudar o degrau cobra UMA HORA daquele clima na hora,
       como se ela tivesse passado sob a condição nova — foi o que o usuário
       pediu depois de mudar o clima e ver as barras paradas.

       A ÂNCORA NÃO ANDA: o relógio não se moveu, e uma âncora adiantada faria
       a próxima virada de hora cobrar de menos. Esta é uma cobrança avulsa,
       por evento, fora da contagem de horas.

       Só a trilha que mudou tique, e na prática só a temperatura desgasta
       condição — água abastece a loja, vento penaliza a VB. Corrigir um clima
       clicado errado cobra assim mesmo: não há desfazer, pela mesma razão que
       o relógio para trás não devolve fome. */
    await aplicarTiqueDeClima(trilha.chave, prox.id);
    if (aguaPorHoraDeChuva(prox.id) > 0) await aplicarChuvaNaLoja(1, payload.tempo);
    const degrauAntes = (anterior && anterior.tempo && anterior.tempo[trilha.chave]) || null;
    registrarEventoMesa(textoEventoTempo(trilha.chave, degrauAntes, prox.id, lang === "en"),
      { tempo: { trilha: trilha.chave, de: degrauAntes, para: prox.id } });
  };

  /* Acerta o relógio da mesa. Mesmo otimismo e mesmo cuidado do definirTempo:
     o jsonb é ESPALHADO, não remontado — remontar inventaria um 1/1/0 numa mesa
     que ainda não definiu data.

     `periodo` continua sendo gravado, agora DERIVADO da hora: é o que uma mesa
     antiga lê enquanto ninguém acerta o relógio dela, e deixar o valor velho
     apodrecendo no jsonb ao lado de uma hora nova seria contradição pura. */
  const definirHora = async (hora) => {
    if (!podeEditar || !historiaId) return;
    setHoraAberta(false);
    const anterior = dataAtual;
    /* A hora de ONDE se partiu, para o log dizer "de 12h para 13h". Vem de
       horaDoJogo e não de `anterior.hora` cru: mesa antiga sem hora gravada
       cai no fallback do período, que é o que a barra estava mostrando. */
    const horaAntes = anterior ? horaDoJogo(anterior) : null;
    /* HORA MENOR VIRA O DIA. Data e relógio são uma linha do tempo só, e o
       tempo só anda para frente: às 22h, escolher 2h são quatro horas depois,
       não vinte antes. Quem precisa voltar usa o calendário. */
    const instanteNovo = proximoInstante(anterior, hora);
    const ancora = ancoraDe(anterior);
    const payload = {
      ...(anterior || {}),
      ...instanteNovo,
      periodo: periodoDaHora(hora),
      decaimento_em: instanteDe(instanteNovo) || undefined,
    };
    setDataAtual(payload);
    const { error } = await supabaseClient
      .from('historias').update({ data_jogo_atual: payload }).eq('id', historiaId);
    if (error) {
      console.error('[data-jogo-atual] definir hora falhou:', error);
      setDataAtual(anterior);
      return;   // desfeito na tela, não anuncia no log o que não aconteceu
    }
    /* A âncora já foi gravada acima; o desgaste roda depois e pode falhar sem
       derrubar a hora. Se falhar, as horas ficam devendo — e é justamente por
       isso que a âncora é gravada JUNTO com o relógio, e não depois. */
    const virouODia = instanteNovo.dia != null && anterior && anterior.dia !== instanteNovo.dia;
    await cobrarHoras(ancora, instanteDe(instanteNovo), anterior && anterior.tempo);
    registrarEventoMesa(textoEventoHora(horaAntes, hora, lang === "en"), { de: horaAntes, para: hora });
    // O dia virou junto: quem lê o log precisa saber, e é onde o feriado entra.
    if (virouODia) {
      registrarEventoMesa(textoEventoData(payload, lang === "en"),
        { data: { dia: payload.dia, mes: payload.mes, ano: payload.ano } });
    }
  };

  // Carregando ainda bloqueia tudo (evita flash). Sem historiaId mas com
  // onNovoPersonagem disponível, segue renderizando — é exatamente o caso de
  // um Jogador sem nenhum PJ ainda (sem PJ não há história vinculada, então
  // historiaId fica null), e o botão "Novo personagem" precisa aparecer pra
  // ele poder criar o primeiro. Sem historiaId e sem onNovoPersonagem (ex.:
  // outras abas, ou Mestre sem histórias), não há nada útil pra mostrar.
  if (carregando) return null;
  /* O BOTÃO ESCONDIDO TAMBÉM CONTA (27/10/2026, pedido do usuário: "acima da
     ficha ainda há um círculo marrom, parece que há um card invisível na tela
     no topo"). Na ficha do Jogador não há mesa (`historiaId` nulo) mas há
     `onNovoPersonagem` — e com o PJ ativo o botão dele vem escondido. O que
     sobrava era um trilho VAZIO: uma pílula de raio 999px com o chão e a
     borda do sistema, do tamanho do próprio respiro. Um círculo marrom. */
  const temBotaoPj = profile === 'player' && !!onNovoPersonagem && !esconderBotaoPersonagem;
  if (!historiaId && !temBotaoPj) return null;

  const en = lang === 'en';
  /* Aparece sempre que o Mestre ESTÁ numa mesa — inclusive quando ele só tem
     uma história. O dropdown antigo se escondia com `length > 1` (uma lista de
     um item não serve pra nada), mas a porta de saída serve: sem ela, um
     Mestre de mesa única entrava e nunca mais via a tela de escolha. */
  /* O "Sair" da mesa saiu da pílula em 22/10/2026 (usuário): mora no seletor
     da mesa, no topo do menu lateral, junto de trocar de mesa e "Todas as
     mesas". O bloco abaixo fica desligado em vez de apagado — a decisão de
     20/09 e o porquê dela seguem no comentário. */
  const mostrarSairMesa = false;

  return (
    <div className="menestrel-ui cdj-root" ref={medirCdj} style={{ left: sidebarLargura, transition: 'left .32s cubic-bezier(.4,0,.2,1)' }}>
      {/* O TRILHO (23/10/2026): data, lugar, hora e tempo num trilho só, como a
          barra de ações da ficha. A faixa .cdj-root continua da largura toda;
          o trilho encolhe ao conteúdo dentro dela. */}
      <div className="cdj-trilho">
      {/* SAIR DA MESA, no lugar do dropdown (20/09/2026). "Assim como o
          jogador escolhe o personagem, e continua com ele enquanto não clicar
          no botão sair. Isso deve acontecer com o mestre para a escolha a
          história" (usuário).

          O dropdown listava todas as mesas e trocava com um clique. Agora
          entrar numa mesa é clicar no card dela, e este botão é a porta de
          volta — a mesma gramática do PJ ativo do Jogador.

          O rótulo é a PALAVRA "Sair", não o título da mesa nem um ícone.
          Cheguei a pôr os dois achando que o botão deveria dizer onde o Mestre
          está; ele diz o que o clique FAZ, e quem diz onde a mesa está é a
          própria tela — a lista de histórias já mostra só a mesa ativa. Mesma
          palavra e mesma pele do "Sair" da ficha do Jogador. */}
      {mostrarSairMesa && (() => {
        const historiaAtiva = minhasHistorias.find((h) => h.id === mesaAtivaId);
        return (
          <button
            type="button"
            className="cdj-bar cdj-mesa-sair is-editavel"
            onClick={() => setMesaAtivaId(null)}
            aria-label={(en ? 'Leave table' : 'Sair da mesa') + (historiaAtiva ? ' · ' + historiaAtiva.titulo : '')}
          >
            {en ? 'Leave' : 'Sair'}
          </button>
        );
      })()}
      {/* `dataAtual` pode existir carregando SÓ o tempo (Mestre que mexeu no
          clima antes de definir a data). Data mesmo é a que tem dia. */}
      {/* A barra fica de pé enquanto o local é escolhido (02/10/2026): "A
          barra de localização no topo deve ter o comportamento como as
          demais." Antes, clicar no local trocava a barra INTEIRA por um
          seletor; agora ele abre a lista embaixo do pill, como a hora e o
          clima. */}
      {historiaId && (
          <>
            <button
              type="button"
              className="cdj-bar is-editavel"
              onClick={() => { fecharTip(); setCalendarioAberto(true); }}
              disabled={false}
              aria-label={en ? 'Current in-game date' : 'Data atual do jogo'}
              /* Os balões do trilho do topo dizem O QUE é cada botão (23/10/2026):
                 Calendário, Localização, Horário, Umidade, Vento, Temperatura. */
              {...propsTip(abrirTip, fecharTip, en ? 'Calendar' : 'Calendário')}
            >
              <i className="ti ti-calendar-event" aria-hidden="true" />
              {dataAtual && dataAtual.dia ? (
                <span className="cdj-data">
                  {(() => {
                    const nomeMes = FANTASY_MONTHS[dataAtual.mes - 1]?.nome || '';
                    const diaSemana = calcDiaSemanaFantasy(dataAtual.ano, dataAtual.mes, dataAtual.dia);
                    const nomeMesShort = nomeMes.replace(/^Mês /, '');
                    const diaSemanaCap = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1).toLowerCase();
                    return (<>
                      <span className="cdj-data-longa">{`${diaSemanaCap}, ${dataAtual.dia} ${nomeMesShort} de ${dataAtual.ano}`}</span>
                      {/* No celular, a forma curta — a pílula inteira cabe. */}
                      <span className="cdj-data-curta">{`${dataAtual.dia} ${nomeMesShort}`}</span>
                    </>);
                  })()}
                </span>
              ) : (
                <span className="cdj-vazio">
                  {podeEditar
                    ? (en ? 'Set the current date' : 'Definir data atual')
                    : (en ? 'Date not set yet' : 'Data ainda não definida')}
                </span>
              )}
            </button>
            {dataAtual && dataAtual.local && (
              <div className="cdj-local-wrap" ref={localRef}>
                <button
                  type="button"
                  className={'cdj-bar' + (podeEditar ? ' is-editavel' : '') + (editando === 'local' ? ' is-open' : '')}
                  onClick={() => {
                    if (!podeEditar) return;
                    if (editando === 'local') { setEditando(null); return; }
                    // O tooltip do pill taparia a primeira linha da lista.
                    fecharTip();
                    abrirEdicao('local');
                  }}
                  aria-disabled={!podeEditar || undefined}
                  aria-label={en ? 'Current in-game location' : 'Local atual do jogo'}
                  {...propsTip(abrirTip, fecharTip, dataAtual.local)}
                  aria-haspopup={podeEditar ? 'listbox' : undefined}
                  aria-expanded={podeEditar ? editando === 'local' : undefined}
                >
                  {/* SÓ O ÍCONE, e o balão com SÓ O TEXTO (26/10/2026):
                      "Localização, Horário, Umidade, Vento, Temperatura,
                      Notificações vão ser somente ícones, e o tooltip será a
                      informação dele" e, logo depois, "ao invés de
                      'Localização Farzelo' será apenas 'Farzelo'". */}
                  <i className="ti ti-map-pin" aria-hidden="true" />
                </button>
                {/* Os lugares do catálogo (26/09/2026), na pele da lista do
                    clima. ESCOLHER JÁ GRAVA (27/09/2026); clicar fora ou Esc
                    fecha sem mudar (efeito localFora, acima). */}
                {editando === 'local' && (
                  <ul className="cdj-local-lista" role="listbox" aria-label={en ? 'Current location' : 'Local atual'}>
                    {lugares === null ? (
                      <li className="cdj-local-aviso">{en ? 'Loading…' : 'Carregando…'}</li>
                    ) : (() => {
                      const atual = String(dataAtual.local || '').trim();
                      const ops = lugares.some((o) => o.value === atual) ? lugares : [{ value: atual, label: atual }, ...lugares];
                      return ops.map((o) => {
                        const ativa = o.value === atual;
                        return (
                          <li
                            key={o.value}
                            role="option"
                            aria-selected={ativa}
                            aria-disabled={salvando || undefined}
                            className={'cdj-tempo-opcao' + (ativa ? ' is-ativa' : '')}
                            onClick={() => {
                              if (salvando) return;
                              setRascunho((r) => ({ ...r, local: o.value }));
                              salvar({ local: o.value });
                            }}
                          >
                            <span className="cdj-tempo-opcao-nome">{o.label}</span>
                            {ativa && <i className="ti ti-check cdj-tempo-check" aria-hidden="true" />}
                          </li>
                        );
                      });
                    })()}
                    {erro && <li className="cdj-local-aviso cdj-local-aviso--erro" role="alert">{erro}</li>}
                  </ul>
                )}
              </div>
            )}
            {/* A HORA DO JOGO — ao lado da data, do local e do clima.
                Era o botão que ALTERNAVA dia↔noite (17/09/2026); virou o
                relógio da mesa (20/09/2026, "um controle apenas da hora, não
                precisa de minutos e segundos"). O sol e a lua continuam aqui,
                agora derivados da hora em vez de escolhidos — ver luzDaHora.

                Clicar ABRE A LISTA das 24, como os pills do clima: ninguém
                avança 14 cliques pra sair das 6h da manhã e chegar às 20h.
                O Jogador só lê, e o pill dele NÃO usa `disabled` — botão
                desabilitado não dispara mouseenter e o tooltip ficaria mudo
                justo pra quem não pode clicar. */}
            <div className="cdj-hora-wrap" ref={horaDropRef}>
              {(() => {
                const luz = luzDaHora(dataAtual);
                const periodo = periodoDoJogo(dataAtual);
                const texto = `${luz.hora}h · ${en ? periodo.en : periodo.pt}`;
                return (<>
                  <button
                    type="button"
                    className={'cdj-bar cdj-periodo cdj-hora' + (podeEditar ? ' is-editavel' : '') + (horaAberta ? ' is-open' : '')}
                    data-periodo={periodo.id}
                    aria-label={(en ? 'In-game hour' : 'Hora do jogo') + ' · ' + texto}
                    aria-haspopup={podeEditar ? 'listbox' : undefined}
                    aria-expanded={podeEditar ? horaAberta : undefined}
                    onClick={() => {
                      if (!podeEditar) return;
                      // O tooltip do pill taparia a primeira linha da lista.
                      fecharTip();
                      setHoraAberta((v) => !v);
                    }}
                    {...propsTip(abrirTip, fecharTip, horaPorExtenso(luz.hora, en))}
                  >
                    {/* SÓ O ÍCONE. A regra foi e voltou duas vezes: nasceu
                        assim em 20/09/2026 ("no botão de horário, não precisa
                        do texto '12h', deixe apenas o ícone"), ganhou a hora
                        escrita em 22/10 ("Escrever") e voltou ao ícone em
                        26/10 — "Localização, Horário, Umidade, Vento,
                        Temperatura, Notificações vão ser somente ícones, e o
                        tooltip será a informação dele". O sol e a lua dizem o
                        período; a hora exata vive no balão. */}
                    <i className={'ti ' + periodo.ic} aria-hidden="true" />
                  </button>
                  {horaAberta && (
                    <ul className="cdj-hora-lista" role="listbox" aria-label={en ? 'In-game hour' : 'Hora do jogo'}>
                      {Array.from({ length: 24 }, (_, h) => (
                        <li
                          key={h}
                          role="option"
                          aria-selected={h === luz.hora}
                          data-hora={h}
                          data-periodo={periodoDaHora(h)}
                          className={'cdj-hora-opcao' + (h === luz.hora ? ' is-ativa' : '')}
                          onClick={() => definirHora(h)}
                        >
                          {h}h
                        </li>
                      ))}
                    </ul>
                  )}
                </>);
              })()}
            </div>
            {/* CONDIÇÃO DO TEMPO — ao lado de data e local (16/09/2026).
                Um pill por trilha; clicar abre a lista dos cinco degraus, no
                mesmo molde do seletor de mesa aqui ao lado. Ver TEMPO_TRILHAS. */}
            <div className="cdj-tempo-grupo" role="group" ref={tempoDropRef}
              aria-label={en ? 'Weather' : 'Condição do tempo'}>
              {TEMPO_TRILHAS.map((trilha) => {
                const degrau = degrauTempo(trilha, dataAtual && dataAtual.tempo);
                const texto = textoTempo(trilha, degrau, en);
                const aberta = tempoAberto === trilha.chave;
                const nomeTrilha = en ? trilha.rotulo.en : trilha.rotulo.pt;
                return (
                  <div key={trilha.chave} className="cdj-tempo-wrap">
                    <button
                      type="button"
                      className={'cdj-bar cdj-tempo' + (podeEditar ? ' is-editavel' : '') + (aberta ? ' is-open' : '')}
                      data-tempo={degrau.id}
                      aria-label={texto}
                      aria-haspopup={podeEditar ? 'listbox' : undefined}
                      aria-expanded={podeEditar ? aberta : undefined}
                      onClick={() => {
                        if (!podeEditar) return;
                        // O tooltip do pill taparia a primeira linha da lista.
                        fecharTip();
                        setTempoAberto(aberta ? null : trilha.chave);
                      }}
                      {...propsTip(abrirTip, fecharTip, en ? degrau.en : degrau.pt)}
                    >
                      {/* SÓ O ÍCONE (26/10/2026): a palavra do clima saiu da
                          pílula e foi para o balão, que `texto` já monta como
                          "Umidade · Seco". */}
                      <i className={'ti ' + degrau.ic} aria-hidden="true" />
                    </button>
                    {aberta && (
                      <ul className="cdj-tempo-lista" role="listbox" aria-label={nomeTrilha}>
                        {trilha.degraus.map((d) => (
                          <li
                            key={d.id}
                            role="option"
                            aria-selected={d.id === degrau.id}
                            data-tempo={d.id}
                            className={'cdj-tempo-opcao' + (d.id === degrau.id ? ' is-ativa' : '')}
                            onClick={() => definirTempo(trilha, d)}
                          >
                            <i className={'ti ' + d.ic + ' cdj-tempo-ic'} aria-hidden="true" />
                            <span className="cdj-tempo-opcao-nome">{en ? d.en : d.pt}</span>
                            {d.id === degrau.id && <i className="ti ti-check cdj-tempo-check" aria-hidden="true" />}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
            {calendarioAberto && (
              <CalendarioFantasyModal
                dataAtual={dataAtual}
                dataNasc={dataNascPjAtivo}
                lang={lang}
                historiaId={historiaId}
                podeEditar={podeEditar}
                userId={podeEditar ? null : userId}
                onDefinirDataAtual={definirDataAtual}
                onClose={() => setCalendarioAberto(false)}
              />
            )}
          </>
      )}
      {/* "Nova história" só FORA de uma mesa (20/09/2026). Dentro dela a lista
          mostra um card só — o da mesa ativa — e um botão de criar ali dentro
          convida a sair do lugar sem dizer que sai. Criar pertence à tela de
          escolha, junto com os outros cards, que é para onde o "Sair" leva.
          Mesma gramática do Jogador: ele cria personagem na lista, não de
          dentro da ficha de um. */}
      {profile === 'master' && onNovaHistoria && !editando && !esconderSeletorEBotaoNovo && !mesaAtivaId && (
        <button
          type="button"
          className="cdj-pill-btn-salvar"
          onClick={onNovaHistoria}
          style={{
            pointerEvents: 'auto',
            background: 'linear-gradient(135deg,var(--ouro) 0%,var(--ouro-2) 100%)',
            border: 'none', borderRadius: 999, height: 32, outline: 'none',
            fontFamily: "var(--font-body)", fontSize: 'var(--fs-sm)', fontWeight: 600, flexShrink: 0,
            color: 'var(--sobre-vivo)',
            padding: '0 18px 0 14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {en ? 'New story' : 'Nova história'}
        </button>
      )}
      {profile === 'player' && onNovoPersonagem && !editando && !esconderBotaoPersonagem && (
        <button
          type="button"
          className="cdj-pill-btn-salvar"
          onClick={onNovoPersonagem}
          style={{
            pointerEvents: 'auto',
            background: 'linear-gradient(135deg,var(--ouro) 0%,var(--ouro-2) 100%)',
            border: 'none', borderRadius: 999, height: 32, outline: 'none',
            fontFamily: "var(--font-body)", fontSize: 'var(--fs-sm)', fontWeight: 600, flexShrink: 0,
            color: 'var(--sobre-vivo)',
            padding: '0 18px 0 14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {en ? 'New character' : 'Novo personagem'}
        </button>
      )}
      {/* O SINO NO TRILHO DA CENA (26/10/2026, pedido do usuário): "coloque o
          botão de notificação junto com o trilho no topo com data, local".
          A CentralMensagens desenha aqui por portal — Mestre e Jogador.
          Só quando HÁ mesa: sem ela não há o que notificar, e uma âncora de
          portal solta num trilho sem data atraía o sino para um trilho que
          não é o da cena (27/10/2026). */}
      {historiaId && <div id="cdj-sino" className="cdj-sino-slot" />}
      </div>
      <NavTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} abaixo />
    </div>
  );
}

/* ============================== [9.6] RolagemLivreFab — botões flutuantes D20 e D10 ==============================
   Dois botões independentes no canto superior direito da tela:
     - Fab principal (ícone ti-dice, .rl-fab) → D20 livre
     - Fab secundário (label "D10", .rl-fab-d10) → D10 livre, posicionado
       abaixo do principal com a mesma pele visual (vidro escuro + blur + dourado)

   Cada botão abre seu próprio overlay. Ambos disparam registrar_evento_mesa
   ao assentar (sem historiaId, notificação silenciosa — igual comportamento
   anterior).

   Globals defensivos (typeof + window) igual ficha.jsx:
     - RolagemD20Overlay  (dado-d20.jsx, Fase 02)
     - RolagemD10Overlay  (dado-d10.jsx, Fase 02)

   NOTA (07/2026): a cópia inline do DadoD10/RolagemD10Overlay que vivia aqui
   (antiga seção 9.5) foi removida — o canônico é src/02-shell/dado-d10.jsx,
   importado no main.tsx logo após dado-d20.jsx (mesmo padrão do D20). */
function RolagemLivreFab({ lang, historiaId, nomeUsuario }) {
  const [tip, abrirTip, fecharTip, manterTip] = useNavTooltip(60);
  const [abertoD20, setAbertoD20] = useState(false);
  const [abertoD10, setAbertoD10] = useState(false);
  const en = lang === 'en';

  /* Na barra de ações da ficha (22/10/2026), quando o console a oferece. */
  const alvoAcoes = useAlvoPortal('mc-acoes-ficha');
  const _RolagemD20Overlay = (typeof RolagemD20Overlay !== 'undefined' ? RolagemD20Overlay : null) || window.RolagemD20Overlay || null;
  const _RolagemD10Overlay = (typeof RolagemD10Overlay !== 'undefined' ? RolagemD10Overlay : null) || window.RolagemD10Overlay || null;

  const aoResultado = (res) => {
    if (!historiaId) return;
    const nome  = primeiroNome(nomeUsuario) || (en ? 'Someone' : 'Alguém');
    const valor = res.d20 ?? res.d10;
    const tipo  = res.d20 != null ? 'd20' : 'd10';
    const faces = tipo === 'd20' ? 20 : 10;
    /* "Lirael fez um rolamento livre e obteve 17 de 20." (27/09/2026) */
    const texto = en
      ? `${nome} made a free roll and got ${valor} out of ${faces}.`
      : `${nome} fez um rolamento livre e obteve ${valor} de ${faces}.`;
    supabaseClient
      .rpc('registrar_evento_mesa', {
        p_historia_id: historiaId,
        p_tipo: 'teste',
        p_texto: texto,
        p_meta: { [tipo]: valor, livre: true },
      })
      .then(({ error }) => {
        if (error) console.error('[RolagemLivreFab] registrar_evento_mesa falhou:', error);
      });
  };

  return (
    <>
      {(() => { const dados = (
      <div className={'menestrel-ui rl-root' + (alvoAcoes ? ' mc-acao-grupo' : '')}>
        {/* Fab D20 — .rl-fab garante pointer-events:auto */}
        <button
          type="button"
          className="rl-fab"
          onClick={() => setAbertoD20(true)}
          aria-label={en ? 'Free roll D20' : 'Rolamento livre D20'}
          {...(alvoAcoes ? {} : propsTip(abrirTip, fecharTip, 'D20'))}
        >
          {/* Na barra, com o nome, como Habilidades e Magias (23/10/2026). */}
          <i className="ti ti-number-20-small" aria-hidden="true" />
          {alvoAcoes && <span className="mc-acao-rotulo">D20</span>}
        </button>

        {/* Fab D10 — também usa .rl-fab para herdar pointer-events:auto;
            sobrescreve top para empilhar abaixo do D20 */}
        <button
          type="button"
          className="rl-fab"
          style={alvoAcoes ? undefined : { top: 76 }}
          onClick={() => setAbertoD10(true)}
          aria-label={en ? 'Free roll D10' : 'Rolamento livre D10'}
          {...(alvoAcoes ? {} : propsTip(abrirTip, fecharTip, 'D10'))}
        >
          <i className="ti ti-number-10-small" aria-hidden="true" />
          {alvoAcoes && <span className="mc-acao-rotulo">D10</span>}
        </button>
        <NavTooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
      </div>); /* Os dados SAÍRAM da barra de ações da ficha (23/10/2026, pedido do usuário); fora da ficha seguem flutuando. */ return alvoAcoes ? null : dados; })()}

      {/* Overlay D20 */}
      {abertoD20 && _RolagemD20Overlay && (() => {
        const D20Overlay = _RolagemD20Overlay;
        return (
          <D20Overlay
            nome={en ? 'Free Roll' : 'Rolamento Livre'}
            livre
            lang={lang}
            onClose={() => setAbertoD20(false)}
            onResultado={aoResultado}
          />
        );
      })()}

      {/* Overlay D10 */}
      {abertoD10 && _RolagemD10Overlay && (() => {
        const D10Overlay = _RolagemD10Overlay;
        return (
          <D10Overlay
            nome={en ? 'Free Roll' : 'Rolamento Livre'}
            lang={lang}
            onClose={() => setAbertoD10(false)}
            onResultado={aoResultado}
          />
        );
      })()}
    </>
  );
}

/* ============================== [10] AdminConsole — moldura migrada (Grimório do dragão) ==============================
   Substitui a função AdminConsole inteira em src/10-shell/shell.jsx
   (de `function AdminConsole(...) {` até o `}` logo antes de `function App() {`).
   NÃO mexer no Object.assign(window, { ... AdminConsole ... }) do fim do arquivo.

   O que mudou: SÓ a moldura (fundo + glows + sidebar + container do main) virou visual novo,
   inline + tokens (regra de ouro). Toda a lógica (perfil, seções, persistência) e o SWITCH das abas
   continuam idênticos — o conteúdo de cada aba segue no estilo legado, pra migrarmos um a um depois.
*/
/* Decide se a troca de perfil (Mestre/Jogador) deve ir pro banco.
   `noServidor` é o que sabemos estar gravado em profiles.perfil_tipo;
   null/undefined = ainda NÃO sabemos, e nesse estado nunca se escreve —
   é essa a guarda que impede o palpite da montagem de virar verdade.

   `noServidor` é acompanhado à parte (estado próprio, atualizado a cada
   escrita) em vez de sair da prop userProfile: a prop nunca é refetchada, e
   compará-la faria master→player→master pular a segunda escrita. */
/* Qual mesa deve ficar ativa depois que a lista de histórias chega.

   Devolve o id novo, ou `undefined` quando não há nada a mudar — e essa
   distinção é o recurso inteiro: `null` é "saia da mesa", `undefined` é "não
   toque no estado". Confundir os dois é o que fazia o console reentrar na mesa
   logo depois do Mestre sair dela.

   Lista `null`/`undefined` significa "a busca ainda não voltou", e é diferente
   de lista vazia: tratar carregamento como vazio apagava a mesa salva a cada
   recarga da página. Ver 10-shell/mesa-ativa.test.js. */
function proximaMesaAtiva(minhasHistorias, mesaAtivaId) {
  if (!Array.isArray(minhasHistorias)) return undefined;   // ainda carregando
  if (!mesaAtivaId) return undefined;                      // fora de mesa, por escolha
  if (minhasHistorias.some((h) => h.id === mesaAtivaId)) return undefined;
  return null;                                             // a mesa salva sumiu
}

function devePersistirPerfil(noServidor, local) {
  if (noServidor === null || noServidor === undefined) return false;
  return noServidor !== local;
}

function AdminConsole({ user, userProfile, onLogout, t, lang, setLang }) {
  const ac = ADMIN_COPY[lang] || ADMIN_COPY.pt;
  const [navTip, abrirNavTip, fecharNavTip, manterNavTip] = useNavTooltip(60);
  /* O MENU LATERAL (23/10/2026): sempre recolhido na coluna dos ícones e
     expandido por cima da página ao passar o mouse (ou ao navegar com o
     teclado dentro dele) — "Remova o botão de expandir o menu lateral, ele vai
     ficar sempre retraído, e vai expandir ao passar o mouse." Só CSS
     (.mc-sidebar:hover / :focus-within); ver index.css. */

  // Perfil persistido.
  // Prioridade de restauração: Supabase (userProfile prop) > localStorage > 'player' (novo usuário).
  // O valor inicial é um PALPITE: o AdminConsole monta antes de userProfile
  // chegar (App faz setUser(u) e só então `await carregarProfile(u)`).
  /* MESTRE SÓ O ADMINISTRADOR (23/10/2026): "Apenas a conta richardnanet@gmail.com
     poderá ser mestre ou jogador, todas as outras contas serão jogadores
     automaticamente." O banco garante o mesmo (trg_mestre_somente_admin). */
  const ehAdmin = String((user && user.email) || '').toLowerCase() === 'richardnanet@gmail.com';
  const [profileEscolhido, setProfile] = useState(() => {
    if (userProfile && typeof userProfile.perfil_tipo === 'string') return userProfile.perfil_tipo;
    try { const s = localStorage.getItem('menestrel.profile'); if (s === 'master' || s === 'player') return s; }
    catch (e) {}
    return 'player'; // padrão para contas novas
  });

  const profile = ehAdmin ? profileEscolhido : 'player';

  /* A PALETA DO USUÁRIO (23/10/2026): a do perfil no servidor manda; antes
     dela chegar, a da última visita (localStorage, já aplicada no index.html
     para não piscar). Escolher grava em profiles.paleta. */
  const [paleta, setPaleta] = useState(() => {
    try { const v = localStorage.getItem('menestrel.paleta'); return PALETAS.some((p) => p.id === v) ? v : PALETA_PADRAO; } catch (e) { return PALETA_PADRAO; }
  });
  useEffect(() => { aplicarPaleta(paleta); }, [paleta]);
  useEffect(() => {
    if (userProfile && PALETAS.some((p) => p.id === userProfile.paleta)) setPaleta(userProfile.paleta);
  }, [userProfile && userProfile.paleta]);
  const escolherPaleta = async (id) => {
    setPaleta(id);
    const { error } = await supabaseClient.from('profiles').update({ paleta: id }).eq('id', user.id);
    if (error) console.error('[paleta] não gravou:', error);
  };

  // O que sabemos estar GRAVADO no servidor. null = ainda não sabemos — e
  // nesse estado não se escreve nada (ver devePersistirPerfil).
  const [perfilNoServidor, setPerfilNoServidor] = useState(null);
  // O usuário clicou no seletor nesta sessão? Se sim, a escolha dele vence o
  // valor que vier do servidor — que é mais velho que o clique.
  const trocaManualRef = React.useRef(false);
  const escolherPerfil = React.useCallback((novo) => {
    trocaManualRef.current = true;
    setProfile(novo);
  }, []);

  // Primeira chegada de userProfile: registra o que o servidor tem e adota
  // esse valor, a menos que o usuário já tenha trocado à mão nesta sessão.
  useEffect(() => {
    if (perfilNoServidor !== null) return;   // já sabemos
    if (!userProfile) return;                // ainda não carregou: não sabemos nada
    const doServidor = userProfile.perfil_tipo;
    if (doServidor !== 'master' && doServidor !== 'player') {
      // Carregou, mas a coluna está vazia/inválida (linha antiga, ou trigger
      // que nasceu sem default). Isso É saber o que há lá: nada. Marca com ''
      // pra que devePersistirPerfil libere a gravação e o palpite local vire
      // o valor de verdade — sem isso a guarda de null travaria a escrita
      // para sempre nessas contas.
      setPerfilNoServidor('');
      return;
    }
    setPerfilNoServidor(doServidor);
    if (!trocaManualRef.current) setProfile(doServidor);
  }, [userProfile, perfilNoServidor]);

  useEffect(() => {
    try { localStorage.setItem('menestrel.profile', profile); } catch (e) {}
  }, [profile]);

  // Persiste no Supabase para restaurar entre dispositivos/sessões.
  //
  // ⚠️ A guarda de devePersistirPerfil é o que fecha uma corrida real: este
  // efeito rodava na MONTAGEM e mandava o palpite inicial pro banco antes de
  // userProfile chegar. Num dispositivo novo (sem localStorage) o palpite é
  // 'player', e esse UPDATE podia ganhar do SELECT do carregarProfile — o
  // Mestre entrava como jogador, e de forma PERSISTENTE, porque o valor errado
  // já tinha sido gravado. Cobertura: 10-shell/perfil-persistencia.test.js.
  useEffect(() => {
    if (!user || !user.id) return;
    if (!devePersistirPerfil(perfilNoServidor, profile)) return;
    // Otimista: assume gravado pra não reescrever em loop. Se falhar, a tela
    // fica certa e o banco velho — a próxima troca tenta de novo.
    setPerfilNoServidor(profile);
    supabaseClient
      .from('profiles')
      .update({ perfil_tipo: profile })
      .eq('id', user.id)
      .then(({ error: err }) => {
        if (err) console.error('[perfil] update de perfil_tipo falhou:', err);
      });
  }, [profile, perfilNoServidor, user]);

  // Seção atual também persiste. Se trocou de perfil e a seção não existe mais lá, cai na primeira.
  // "inventario" e "loja" foram removidos do menu lateral.
  // "guia_personagem" é tratada como seção especial (fora do ADMIN_SECTIONS) — não aparece
  // no menu lateral, só é acessada via onHelp. Por isso o useEffect de guarda não a reverte.
  /* MESA EM SESSÃO (22/10/2026): os destinos novos (Cena, Batalha, Loja da
     mesa, Jogadores; Ficha, Inventário, Loja) vêm de SECOES_DA_MESA e entram
     na FRENTE — a primeira seção é a porta de entrada de cada perfil. */
  const SECTIONS_OCULTAS = [];
  const SECTIONS_ESPECIAIS = ['guia_personagem', 'historias'];
  const _extras = ((typeof SECOES_DA_MESA !== 'undefined' && SECOES_DA_MESA[profile]) || []).map((e) => ({ id: e.id, icone: e.icone, rotulo: e.rotulo }));
  const sections = [
    ..._extras,
    ...(ADMIN_SECTIONS[profile] || []).filter((s) => !SECTIONS_OCULTAS.includes(s.id) && !_extras.some((e) => e.id === s.id)),
  ];
  const [currentId, setCurrentId] = useState(() => {
    /* A porta antiga vira a nova (22/10/2026): quem parou em Histórias entra
       na Cena; quem parou em Meus Personagens, na Ficha. */
    const MIGRA = { historias: 'cena', personagens_j: 'ficha' };
    try { const v = localStorage.getItem('menestrel.section'); return (v && (MIGRA[v] || v)) || sections[0].id; }
    catch (e) { return sections[0].id; }
  });
  useEffect(() => {
    // Não reverte seções especiais (guia_personagem etc.) — navegadas via onHelp,
    // não precisam estar no ADMIN_SECTIONS.
    if (SECTIONS_ESPECIAIS.includes(currentId)) return;
    if (!sections.find((s) => s.id === currentId)) {
      setCurrentId(sections[0].id);
    }
    // `sections` FORA das deps de propósito: é derivado de `profile` por um
    // .filter() que devolve array novo a cada render, então listá-lo fazia
    // este efeito rodar em TODO render sem nunca ter o que fazer. `profile` é
    // a única entrada que muda o conteúdo dele.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, currentId]);
  useEffect(() => {
    try { localStorage.setItem('menestrel.section', currentId); } catch (e) {}
  }, [currentId]);

  /* O FILTRO da folha do menu (26/09/2026): "Magias Básicas" é a seção
     `magias` com filtro 'Básica'. Vazio = a lista inteira. Persiste como a
     seção, para o F5 voltar à mesma página. */
  const [secaoFiltro, setSecaoFiltro] = useState(() => {
    try { return localStorage.getItem('menestrel.sectionFiltro') || ''; }
    catch (e) { return ''; }
  });
  useEffect(() => {
    try { localStorage.setItem('menestrel.sectionFiltro', secaoFiltro); } catch (e) {}
  }, [secaoFiltro]);
  /* Os personagens da mesa, para o submenu de Personagens do Mestre
     (26/10/2026). Quem os reporta é a própria PersonagensList — ela já os
     busca para a lista, e uma segunda query aqui mostraria outra coisa no
     menu e na tela no instante entre as duas. `pjPedido` é o caminho de volta:
     o menu pede a ficha, a lista abre. O token faz pedir o MESMO personagem de
     novo valer como pedido. */
  const [pjsDaMesa, setPjsDaMesa] = useState([]);
  const [pjPedido, setPjPedido] = useState({ id: null, token: 0 });
  const [abaFichaMestre, setAbaFichaMestre] = useState(null);
  const [abaTokenMestre, setAbaTokenMestre] = useState(0);
  /* Editar/Excluir pelo menu (26/10/2026): o mesmo par pedido+token das
     fichas. A ação ABRE a ficha do personagem junto — é a PersonagensList com
     a ficha aberta que hospeda os dois modais, e abrir mostra de quem é a
     ficha que está prestes a ser editada ou apagada. */
  const [acaoPj, setAcaoPj] = useState({ id: null, acao: null, token: 0 });
  /* Os companheiros do personagem aberto, relatados pela ficha (26/10/2026).
     Vêm de lá, e não de uma consulta própria, pelo mesmo motivo da lista de
     PJs: a ficha já os tem resolvidos (nome dado pelo dono ou raça), e uma
     segunda busca aqui mostraria outra coisa no menu e na tela. */
  const [compsDaMesa, setCompsDaMesa] = useState([]);
  const [compPedido, setCompPedido] = useState({ id: null, parte: null, token: 0 });
  const pedirCompanheiro = (compId, parte) =>
    setCompPedido((c) => ({ id: compId, parte: parte || null, token: c.token + 1 }));
  const abrirFichaDoPj = (pjId, aba) => {
    setAbaFichaMestre(aba || 'ficha');
    setAbaTokenMestre((n) => n + 1);
    setPjPedido((p) => ({ id: pjId, token: p.token + 1 }));
  };
  const pedirAcaoNoPj = (pjId, acao) => {
    abrirFichaDoPj(pjId, 'ficha');
    setAcaoPj((a) => ({ id: pjId, acao, token: a.token + 1 }));
  };
  const navBase = (typeof NAV_MESA !== 'undefined' && NAV_MESA[profile]) || { mesa: [], regras: [] };
  const menu = [...navBase.mesa, ...navBase.regras];
  const folhas = typeof folhasDoMenu === 'function' ? folhasDoMenu(menu) : [];
  /* A folha aberta. Filtro que não existe na seção atual (ficou de uma visita
     antiga, ou a seção veio por outro caminho) cai na PRIMEIRA folha da
     seção — não há "Todas" desde 26/09/2026. */
  /* No Livro de Regras (23/10/2026) filtro vazio quer dizer TODOS: o filtro
     agora é escolhido no trilho, e sem ele a página abria só a primeira folha
     (Criaturas mostrava só os animais, sem dizer). */
  const LIVRO_SECOES = ['criaturas', 'itens', 'magias', 'tecnicas', 'habilidades'];
  const folhaAtual = folhas.find((f) => f.secao === currentId && (f.filtro || '') === secaoFiltro)
    || (LIVRO_SECOES.includes(currentId) ? null : folhas.find((f) => f.secao === currentId)) || null;
  const filtroAtual = folhaAtual ? (folhaAtual.filtro || '') : '';
  const tituloDaFolha = folhaAtual && (folhaAtual.titulo || (folhaAtual.filtro ? folhaAtual.rotulo : null));
  const tituloPagina = tituloDaFolha ? (tituloDaFolha[lang] || tituloDaFolha.pt) : undefined;
  const [painelMenu, setPainelMenu] = useState(null); // { grupo, rect } | null

  const current = sections.find((s) => s.id === currentId) || { id: currentId };
  /* A página da mesa: "Cena" para o Mestre, "Mesa" (aventuras) para o
     Jogador — os dois nomes do mesmo lugar, o único em que o trilho de
     data/local/clima tem o que conduzir. */
  const telaDaMesa = profile === 'master' ? currentId === 'cena' : currentId === 'aventuras';
  const sectionMeta = ac.sections[current.id] || { label: current.id };
  /* Seções sem o teto de 860px. Lugares/NPCs/Memórias entraram em 12/09/2026:
     viraram a mesma tabela de Itens e Magias, mas ficaram fora desta lista e a
     tabela saía mais estreita que a das outras ("a largura da tabela em
     lugares, npcs está menor que em itens, magias" — usuário). */
  const isWide = ['criaturas', 'magias', 'habilidades', 'tecnicas', 'itens', 'itens_campanha', 'lugares', 'cidades', 'locais', 'npcs', 'memorias', 'personagens_j', 'personagens_m', 'historias', 'convites', 'aventuras', 'guia_personagem', 'cena', 'batalha', 'loja_mesa', 'jogadores', 'ficha', 'inventario', 'loja'].includes(current.id);

  // ── Modal de convite (botão "Convites" na sidebar) ───────────
  const [conviteModalAberto, setConviteModalAberto] = useState(false);
  // A galeria das pinturas (26/10/2026) — abre pelo menu do usuário, Mestre.
  const [imagensAberto, setImagensAberto] = useState(false);
  // Token que incrementa quando um convite é aceito — força AventurasJogador a recarregar.
  const [aventurasReloadToken, setAventurasReloadToken] = useState(0);

  // ── Mesa ativa (p/ Central de Mensagens) ────────────────────
  // Jogador: a mesa é resolvida automaticamente pelo PJ ativo (1 PJ -> 1
  // história via protagonista_ids), igual já faz a Ficha. Mestre pode ter
  // N histórias simultâneas — minhasHistorias alimenta um seletor simples
  // (dropdown) pra ele escolher qual mesa acompanhar agora. Persistido em
  // localStorage só pra não perder a escolha ao trocar de aba (mesmo
  // padrão de menestrel.profile/section acima).
  const [minhasHistorias, setMinhasHistorias] = useState(null); // null = ainda não carregou; [] = carregou mas vazio; [{id, titulo}] = lista real
  // Sobe a cada clique na barra lateral — ver o onClick do .mc-navitem.
  const [navToken, setNavToken] = useState(0);
  const [mesaAtivaId, setMesaAtivaId] = useState(() => {
    try { const v = localStorage.getItem('menestrel.mesaAtivaId'); return v ? Number(v) : null; }
    catch (e) { return null; }
  });
  /* SEM MESA, SÓ O QUE NÃO DEPENDE DELA (23/10/2026): "Quando não há mesa
     selecionada, não precisa mostrar o menu cena, batalha, personagens, loja,
     jogadores." Fica a Ambientação (o catálogo do mundo abre sem mesa). */
  const SECOES_SO_COM_MESA = ['cena', 'batalha', 'personagens_m', 'loja_mesa', 'jogadores'];
  /* ── PERSONAGENS › ECO › FICHA (26/10/2026, pedido do usuário) ────────────
     "Como mestre, os menus Ficha, Identificação, Conhecimento, etc viram um
      submenu em Personagens > Eco, etc."

     O galho é MONTADO AQUI, e não em NAV_MESA, porque ele depende dos dados:
     um personagem da mesa por filho, e as seis partes da ficha em cada um.
     Sem personagens (ou antes de a lista chegar), "Personagens" continua sendo
     o item simples de sempre — uma gaveta vazia seria pior que nenhuma. */
  /* Os companheiros como filhos de "Companheiros" — o submenu só nasce para o
     personagem que está aberto, porque é dele que a ficha relata a lista. */
  /* AS PARTES DO BICHO (27/10/2026, pedido do usuário: "adicione dentro do
     menu lateral esquerdo 'companheiros', os companheiros atuais e os menus
     'identificação, conhecimento e inventário' da criatura"). O companheiro
     deixa de ser folha e vira galho, como o personagem: o nome abre a ficha
     (o boneco) e os três filhos abrem as páginas dele.

     São as mesmas três palavras das PARTES_DA_FICHA do dono, e de propósito:
     é o mesmo mapa mental em dois andares. Falta "Loja", que é da mesa, e
     "Companheiros", que um bicho não tem. */
  /* "Ficha" ABERTA NA LISTA (27/10/2026): clicar no nome do bicho já abre o
     boneco, mas a página precisa aparecer ESCRITA como as outras três — é
     assim no personagem (PARTES_DA_FICHA começa por Ficha), e sem ela as
     quatro páginas do companheiro viravam três mais uma invisível. */
  const PARTES_DO_COMPANHEIRO = [
    { parte: 'ficha', rotulo: { pt: 'Ficha', en: 'Sheet' } },
    { parte: 'info', rotulo: { pt: 'Identificação', en: 'Identity' } },
    { parte: 'conhecimento', rotulo: { pt: 'Conhecimento', en: 'Knowledge' } },
    { parte: 'inventario', rotulo: { pt: 'Inventário', en: 'Inventory' } },
  ];
  const filhosDeCompanheiros = React.useMemo(() => (compsDaMesa || []).map((c) => ({
    id: 'comp:' + c.id, comp: c.id, rotulo: { pt: c.nome, en: c.nome },
    filhos: PARTES_DO_COMPANHEIRO.map((p) => ({
      id: 'comp:' + c.id + ':' + p.parte, comp: c.id, parte: p.parte, rotulo: p.rotulo,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [compsDaMesa]);
  /* O mesmo galho de companheiros, carimbado com o dono. No Jogador não há
     carimbo: a ficha é dele, e a aba é a da própria página. */
  const comPj = (nos, pjId) => nos.map((n) => ({
    ...n, pj: pjId,
    ...(n.filhos ? { filhos: n.filhos.map((f) => ({ ...f, pj: pjId })) } : {}),
  }));
  const personagensComFilhos = React.useMemo(() => {
    const partes = (typeof PARTES_DA_FICHA !== 'undefined' ? PARTES_DA_FICHA : window.PARTES_DA_FICHA) || [];
    return {
      id: 'personagens_m', secao: 'personagens_m', navega: true,
      filhos: (pjsDaMesa || []).map((pj) => ({
        id: 'pj:' + pj.id,
        rotulo: { pt: pj.nome, en: pj.nome },
        filhos: [
          ...partes.map((p) => ({
            id: 'pj:' + pj.id + ':' + p.aba,
            secao: 'personagens_m', rotulo: p.rotulo, pj: pj.id, aba: p.aba,
            /* Companheiros abre em submenu: um filho por bicho do personagem,
               e cada um carimbado com o PJ. O carimbo (27/10/2026) é o que
               deixa o clique levar o Mestre à ficha CERTA — sem ele, abrir uma
               página do bicho de outro lugar do sistema não tinha para onde
               ir. */
            ...(p.aba === 'animais' && pjPedido.id === pj.id && filhosDeCompanheiros.length
              ? { filhos: comPj(filhosDeCompanheiros, pj.id) } : {}),
          })),
          /* EDITAR E EXCLUIR (26/10/2026, pedido do usuário: "os botões
             'editar, excluir' também" devem ficar só na barra lateral). Vêm
             depois das partes e separados por uma régua: são ações SOBRE o
             personagem, não páginas dele. Excluir fica em brasa — é o único
             item do menu inteiro que não se desfaz. */
          /* Amigos, como no Jogador: folha de ação, não página (27/10/2026). */
          { id: 'pj:' + pj.id + ':amigos', secao: 'personagens_m', pj: pj.id, acao: 'amigos',
            evento: 'menestrel:amigos', rotulo: { pt: 'Amigos', en: 'Friends' } },
          { id: 'pj:' + pj.id + ':editar', secao: 'personagens_m', pj: pj.id, acao: 'editar',
            separa: true, rotulo: { pt: 'Editar', en: 'Edit' } },
          { id: 'pj:' + pj.id + ':excluir', secao: 'personagens_m', pj: pj.id, acao: 'excluir',
            perigo: true, rotulo: { pt: 'Excluir', en: 'Delete' } },
        ],
      })),
    };
  }, [pjsDaMesa, filhosDeCompanheiros, pjPedido.id]);
  const navComPjs = (profile === 'master' && (pjsDaMesa || []).length)
    ? { ...navBase, mesa: navBase.mesa.map((n) => (n.secao === 'personagens_m' ? personagensComFilhos : n)) }
    /* No JOGADOR, "Companheiros" já é item de primeiro nível (NAV_MESA): ele
       só ganha os filhos. É o mesmo submenu do Mestre, um andar acima. */
    : (filhosDeCompanheiros.length
      ? { ...navBase, mesa: navBase.mesa.map((n) => (n.id === 'ficha_comp' ? { ...n, filhos: filhosDeCompanheiros } : n)) }
      : navBase);
  const nav = profile === 'master' && !mesaAtivaId
    ? { ...navComPjs, mesa: navComPjs.mesa.filter((n) => !SECOES_SO_COM_MESA.includes(n.secao)) }
    : navComPjs;
  // Ref pra abrir o modal "Nova história" de fora — o botão fica no pill do
  // topo (CardDataJogoAtual), mas quem dono do modal continua sendo a
  // HistoriasList (regra de limite do plano free fica encapsulada lá).
  const abrirNovaHistoriaRef = React.useRef(null);
  // Mesma regra de limite que a HistoriasList aplica internamente — calculada
  // aqui também só pra decidir o estado visual (disabled + tooltip) do botão
  // do pill, que vive fora da HistoriasList.
  // Quando a HistoriasList está dentro de um menu interno da aventura (loja,
  // lore, batalhas, convites), o pill do topo inteiro (seletor de mesa +
  // "Nova história") fica escondido — esses controles só existem na tela
  // inicial de Histórias, pra nunca mostrar uma mesa no pill diferente da
  // que está sendo gerenciada na tela abaixo.
  const [historiasDentroDeMenu, setHistoriasDentroDeMenu] = useState(false);
  // Mesmo padrão pra "Novo personagem" (visão Jogador, aba personagens_j):
  // ref pra abrir o modal de fora, flag de "dentro da ficha" (esconde o
  // botão) e flag de limite do plano free — calculadas dentro da própria
  // PersonagensList (que tem os dados) e reportadas via callback, já que o
  // AdminConsole não tem uma query própria de personagens.
  const abrirNovoPersonagemRef = React.useRef(null);
  const [personagensDentroDeMenu, setPersonagensDentroDeMenu] = useState(false);
  // true quando FichaPersonagem está montada (PersonagensList reporta via onFichaAberta)
  const [fichaAtiva, setFichaAtiva] = useState(false);
  // nome do PJ ativo (PersonagensList reporta via onNomePjAtivo) — usado na notificação de rolamento livre
  const [nomePjAtivo, setNomePjAtivo] = useState(null);
  // data de nascimento do PJ ativo — passada ao CalendarioFantasyModal para marcar o aniversário
  const [dataNascPjAtivo, setDataNascPjAtivo] = useState(null);
  // O PJ ativo inteiro — as secoes Lugares/Personagens/Memorias (ex-Diario)
  // precisam dele. null = jogador sem personagem ativo, e as telas dizem isso.
  const [pjAtivo, setPjAtivo] = useState(null);
  useEffect(() => {
    if (!user || !user.id) return;
    let cancel = false;
    (async () => {
      if (profile === 'master') {
        const { data, error } = await supabaseClient
          .from('historias').select('id, titulo, pausada').eq('mestre_id', user.id)
          .order('created_at', { ascending: false });
        if (cancel) return;
        /* Falha na busca NÃO vira lista vazia (15/09/2026: "às vezes o sistema
           muda de mesa sem minha autorização"). Lista vazia zera a mesa ativa, e
           o carregamento seguinte caía na primeira história — trocando a mesa do
           Mestre sozinho. Erro agora preserva o que já estava. */
        if (error) { console.error('[mesa] não consegui listar as histórias:', error); return; }
        setMinhasHistorias(data || []);
      } else {
        // Jogador: resolve a história do PJ ativo e busca data_nasc para o calendário.
        const { data: prof } = await supabaseClient.from('profiles').select('pj_ativo_id').eq('id', user.id).maybeSingle();
        if (cancel) return;
        const pjAtivoId = prof && prof.pj_ativo_id;
        if (!pjAtivoId) { setMinhasHistorias([]); setDataNascPjAtivo(null); setPjAtivo(null); return; }
        const [histRes, pjRes] = await Promise.all([
          // O PJ pode estar em mais de uma história: vale a mais nova (como o bridge.ts). Sem o limit, o maybeSingle dava erro e a tela ficava vazia (02/10/2026).
          supabaseClient.from('historias').select('id, titulo').contains('protagonista_ids', [pjAtivoId]).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          // A linha INTEIRA agora: as seções Lugares/Personagens/Memórias
          // (ex-Diário) precisam do PJ, não só da data de nascimento.
          supabaseClient.from('personagens').select('*').eq('id', pjAtivoId).maybeSingle(),
        ]);
        if (cancel) return;
        // Mesmo critério do Mestre: erro preserva a mesa; sem história, zera.
        if (histRes.error) { console.error('[mesa] não consegui resolver a história do PJ:', histRes.error); }
        else setMinhasHistorias(histRes.data ? [histRes.data] : []);
        setDataNascPjAtivo(pjRes.data?.data_nasc ?? null);
        setPjAtivo(pjRes.data || null);
      }
    })();
    return () => { cancel = true; };
  }, [user, profile]);
  /* ENTRAR NUMA MESA É GESTO DO MESTRE (20/09/2026). Este efeito ESCOLHIA uma
     mesa sozinho (`minhasHistorias[0]`) sempre que o id salvo não casava com a
     lista. Fazia sentido enquanto existia o dropdown de mesas; com o botão de
     sair, virava uma porta trancada — o clique zerava o id e o efeito reentrava
     na mesma mesa no quadro seguinte.

     Agora ele só LIMPA o que não existe mais. A regra mora em
     proximaMesaAtiva, pura e testada em 10-shell/mesa-ativa.test.js, porque
     montada dentro do console ela só se deixaria observar montando o console
     inteiro. */
  useEffect(() => {
    /* O JOGADOR SEGUE A MESA DO PERSONAGEM (23/10/2026): "em um navegador
       aparece a trilha no topo, no outro não". A mesa do Jogador só vinha do
       que estava salvo NAQUELE navegador; onde nunca tinha sido salva, ficava
       sem mesa — e sem o trilho de data, clima e hora. O Jogador não escolhe
       mesa: ela é a do personagem ativo (minhasHistorias, resolvida pelo PJ). */
    if (profile === 'player' && Array.isArray(minhasHistorias) && minhasHistorias.length > 0) {
      const doPj = minhasHistorias[0].id;
      if (mesaAtivaId !== doPj) setMesaAtivaId(doPj);
      return;
    }
    const prox = proximaMesaAtiva(minhasHistorias, mesaAtivaId);
    if (prox !== undefined) setMesaAtivaId(prox);
  }, [minhasHistorias, mesaAtivaId, profile]);
  /* Sair precisa SOBREVIVER à recarga, e para isso a chave tem que sumir do
     localStorage — não basta parar de gravar. Sem o remove, o Mestre saía da
     mesa, recarregava a página e voltava para dentro dela. */
  useEffect(() => {
    try {
      if (mesaAtivaId) localStorage.setItem('menestrel.mesaAtivaId', String(mesaAtivaId));
      else localStorage.removeItem('menestrel.mesaAtivaId');
    } catch (e) {}
  }, [mesaAtivaId]);

  /* SIDEBAR SEMPRE PEQUENA — decisão do usuário, 12/09/2026: "remova o botão
     'expandir menu', esta opção não será mais permitida" e "o menu não irá se
     expandir mais porque ele sempre será pequeno".

     Era um estado persistido em localStorage com um botão de recolher. O
     estado inteiro saiu, não só o botão: sobrar a variável com um único valor
     possível convidaria alguém a religá-la, e a largura vira um número fixo em
     vez de um ternário repetido em quatro lugares. Quem tinha a chave antiga
     no navegador simplesmente a ignora daqui em diante.

     Só ícones, então o NOME de cada seção passa a viver inteiramente no
     tooltip — que já existia e já era acionado no hover (abrirNavTip). */
  // 232px com rótulos desde 22/10/2026 (Mesa em Sessão) — ver o comentário acima,
  // que registra a decisão anterior (64px só de ícones) e por que mudou.
  // A coluna recolhida (23/10/2026): o menu abre por cima, a página não anda.
  const SIDEBAR_LARGURA = 72;

  /* A LUZ DO FUNDO SEGUE O RELÓGIO DA MESA (20/09/2026). Quem carrega e assina
     `historias.data_jogo_atual` é o CardDataJogoAtual, lá embaixo na barra do
     topo — este console só pinta o que ele avisa. `useCallback` com deps vazias
     porque o aviso é um efeito lá dentro: uma função nova a cada render faria
     o efeito re-disparar sem parar. */
  const [dataMesa, setDataMesa] = useState(null);
  const receberDataMesa = React.useCallback((d) => setDataMesa(d), []);
  const luzFundo = estiloLuzFundo(dataMesa);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const avatarRef = React.useRef(null);

  /* ── MESA EM SESSÃO (22/10/2026): estado da navegação nova ── */
  // A aba que a ficha está mostrando (ela avisa) — o menu marca o item certo
  // mesmo quando a troca de aba é feita lá dentro.
  const [abaFichaAtual, setAbaFichaAtual] = useState(null);
  const [sairToken, setSairToken] = useState(0);     // "Trocar de personagem"
  const [identAberto, setIdentAberto] = useState(false);
  // Ação da mesa pedida pelo menu (Pausar/Editar/Excluir, 23/10/2026): a Cena executa.
  const [acaoMesa, setAcaoMesa] = useState(null);
  // Gavetas do grupo da mesa (Diário; a Loja do Mestre): quais estão abertas.
  const [gavetas, setGavetas] = useState({});
  const [navAberta, setNavAberta] = useState(false); // celular: a folha "Mais"
  /* ── O MENU EXPANDIDO NÃO FECHA NO PRIMEIRO DESLIZE (26/10/2026) ──────────
     "Quando o menu lateral esquerdo expande, muito facilmente ele se fecha.
      Revise o comportamento dele." (usuário)

     Era `:hover` puro no CSS, e `:hover` não perdoa: o menu some no instante
     em que o ponteiro sai da caixa, e a caixa é um alvo móvel. Três jeitos de
     perder o menu sem querer, todos medidos no mesmo desenho:

       1. ENQUANTO ELE ABRE. A faixa vai de 72px a 232px em 200ms; um
          movimento na diagonal, em direção a um item, chega à posição final
          antes da faixa — e sai pela direita de uma caixa que ainda é
          estreita.
       2. O PAINEL DE FILTROS. Ele é um portal `position: fixed` AO LADO do
          menu, não dentro dele: atravessar o vão para alcançá-lo já era sair
          do `:hover`.
       3. O CAMINHO ATÉ A GAVETA. Descer a lista roçando a borda direita custa
          o menu inteiro, e com ele o lugar para onde se estava indo.

     A correção é intenção de hover: abre na hora, fecha depois de uma pausa,
     e qualquer volta do ponteiro cancela o fechamento. `FECHAR_MENU_MS` é
     curto o bastante para não parecer travado e longo o bastante para cobrir
     o vão até o painel. O foco continua no CSS (`:focus-within`): teclado não
     tem deslize para perdoar. */
  const FECHAR_MENU_MS = 420;
  /* O CORREDOR (26/10/2026, segunda rodada): "ao expandir os submenus, eu
     passo o mouse em cima e não consigo selecioná-lo, há um problema de
     hover." A pausa sozinha não bastava, e o motivo é geométrico: os itens do
     submenu são CURTOS e RECUADOS, então o caminho natural do ponteiro até um
     deles — na diagonal, de um item de cima para um filho mais abaixo — sai
     pela direita da faixa e volta. Saiu: `mouseleave`; e como o ponteiro
     nunca voltou a ENTRAR por cima de outro elemento, nenhum `mouseenter`
     cancelava a pausa. O menu fechava embaixo da mão a caminho do alvo.

     Por isso a conta não é mais "está sobre o elemento?", e sim "está dentro
     da faixa mais um corredor de folga?" — medido a cada movimento do
     ponteiro enquanto o menu está aberto. */
  /* 28 → 56px (26/10/2026, segunda queixa: "ainda estou tendo problemas com o
     hover, acho que é o alcance do menu expansível"). E, antes da geometria,
     uma pergunta mais confiável: o ponteiro está sobre ALGUMA COISA do menu?
     O painel de filtros é um portal `position: fixed` fora da faixa, e medir
     só a caixa da faixa nunca o alcançaria. */
  const CORREDOR_MENU = 56;
  const SELETOR_MENU = '.mc-sidebar, .mc-menu-painel, .mc-navfilhos';
  const [navExpandida, setNavExpandida] = useState(false);
  const fecharNavRef = React.useRef(null);
  const sidebarRef = React.useRef(null);
  const abrirNavLateral = () => {
    if (fecharNavRef.current) { clearTimeout(fecharNavRef.current); fecharNavRef.current = null; }
    setNavExpandida(true);
  };
  const fecharNavLateral = () => {
    if (fecharNavRef.current) clearTimeout(fecharNavRef.current);
    fecharNavRef.current = setTimeout(() => { fecharNavRef.current = null; setNavExpandida(false); }, FECHAR_MENU_MS);
  };
  useEffect(() => {
    if (!navExpandida) return undefined;
    const aoMover = (e) => {
      const el = sidebarRef.current;
      if (!el) return;
      const alvo = e.target;
      if (alvo && alvo.closest && alvo.closest(SELETOR_MENU)) { abrirNavLateral(); return; }
      const r = el.getBoundingClientRect();
      const perto = e.clientX >= r.left - CORREDOR_MENU && e.clientX <= r.right + CORREDOR_MENU
        && e.clientY >= r.top - CORREDOR_MENU && e.clientY <= r.bottom + CORREDOR_MENU;
      if (perto) abrirNavLateral(); else fecharNavLateral();
    };
    document.addEventListener('mousemove', aoMover);
    return () => document.removeEventListener('mousemove', aoMover);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navExpandida]);
  useEffect(() => () => { if (fecharNavRef.current) clearTimeout(fecharNavRef.current); }, []);
  /* Busca no Livro de Regras (22/10/2026): Ctrl+K em qualquer tela, ou o
     campo do menu. `pedidoLivro` leva à lista a entrada escolhida, para ela
     abrir a janela daquela linha (ver useAbrirDoLivro em 09-bestiario). */
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [fichaTemAnimais, setFichaTemAnimais] = useState(false);
  const [pedidoLivro, setPedidoLivro] = useState(null);
  // A entrada escolhida na busca, aberta só em janela (23/10/2026).
  const [livroFlutuante, setLivroFlutuante] = useState(null);
  useEffect(() => {
    const atalho = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setBuscaAberta((v) => !v);
      }
    };
    document.addEventListener('keydown', atalho);
    return () => document.removeEventListener('keydown', atalho);
  }, []);
  const identRef = React.useRef(null);
  useEffect(() => {
    if (!identAberto) return undefined;
    const fora = (e) => { if (identRef.current && !identRef.current.contains(e.target)) setIdentAberto(false); };
    const esc = (e) => { if (e.key === 'Escape') setIdentAberto(false); };
    document.addEventListener('mousedown', fora);
    window.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); window.removeEventListener('keydown', esc); };
  }, [identAberto]);

  const ABAS_DA_FICHA = { ficha: 'ficha', inventario: 'inventario', loja: 'loja' };
  // A seção que o menu MARCA: dentro da ficha, a aba aberta lá decide.
  const secaoMarcada = (profile === 'player' && ABAS_DA_FICHA[currentId] && abaFichaAtual)
    ? (abaFichaAtual === 'inventario' || abaFichaAtual === 'loja' ? abaFichaAtual : 'ficha')
    : currentId;
  /* `semVoltar` (26/10/2026): o navToken vira `voltarToken` na PersonagensList
     e FECHA a ficha aberta do Mestre — é o "Personagens é a saída" de
     17/09/2026. Quando o clique é justamente para ABRIR uma ficha
     (Personagens › Eco › Ficha), bumpar o token mandaria fechar e abrir na
     mesma rodada; então aqui ele não sobe. */
  const ir = (secao, filtro, semVoltar) => {
    setPainelMenu(null); setNavAberta(false); setIdentAberto(false);
    setPedidoLivro(null);
    setCurrentId(secao);
    setSecaoFiltro(filtro || '');
    if (!semVoltar) setNavToken((n) => n + 1);
  };
  // Ícones que dizem o que são (a crítica achou balança, alvo e morcego opacos).
  const ICONE_NAV = {
    cena: 'ti-building-castle', batalha: 'ti-swords', personagens_m: 'ti-users', loja_mesa: 'ti-building-store',
    jogadores: 'ti-mail', ficha: 'ti-id', inventario: 'ti-briefcase-2', loja: 'ti-building-store',
    ficha_ficha: 'ti-layout-dashboard', ficha_ident: 'ti-id', ficha_conhec: 'ti-book', ficha_comp: 'ti-paw',
    /* AMIGOS (27/10/2026, pedido do usuário: "o ícone de 'amigos' no menu
       lateral esquerdo está estranho"). Ele não tinha entrada aqui e caía no
       recuo de `iconeDe`, que é `ti-point` — um PONTINHO, ao lado de itens
       todos com glifo. O item também não tem `secao` (de propósito: para não
       acender junto com "Ficha"), então nem pelo segundo caminho do mapa ele
       achava um. O glifo é o do próprio pacto, o mesmo do AmigosFab: o item
       do menu e a janela que ele abre passam a ser o mesmo símbolo. */
    ficha_amigos: 'ti-heart-handshake',
    aventuras: 'ti-map-2', criaturas: 'ti-skull', itens: 'ti-backpack', magias: 'ti-sparkles',
    tecnicas: 'ti-sword', habilidades: 'ti-bolt', itens_campanha: 'ti-box', diario: 'ti-notebook',
    bestiario: 'ti-skull', comercio: 'ti-backpack', historias: 'ti-books',
  };
  const iconeDe = (no) => ICONE_NAV[no.id] || ICONE_NAV[no.secao] || 'ti-point';
  const rotuloDe = (no) => {
    if (no.rotulo) return no.rotulo[lang] || no.rotulo.pt;
    const e = _extras.find((x) => x.id === no.secao);
    if (e) return e.rotulo[lang] || e.rotulo.pt;
    if (profile === 'player' && no.secao === 'aventuras') return lang === 'en' ? 'Table' : 'Mesa';
    return (ac.sections[no.secao] || { label: no.secao }).label;
  };
  // Destino de um nó com filhos: ele mesmo (se navega) ou a primeira folha.
  const destinoDe = (no) => (no.navega ? no : (folhasDoMenu([no])[0] || no));
  const contemSecao = (no) => folhasDoMenu([no]).some((f) => f.secao === secaoMarcada);
  const mesaAtiva = (minhasHistorias || []).find((h) => h.id === mesaAtivaId) || null;
  const nomePersonagem = (pjAtivo && [pjAtivo.nome, pjAtivo.sobrenome].filter(Boolean).join(' ')) || nomePjAtivo || null;
  /* Vindo da busca, a lista abre INTEIRA (sem a folha do submenu): a entrada
     escolhida pode ser de qualquer grupo, e não existe folha "Todos". */
  const viaBusca = !!(pedidoLivro && pedidoLivro.secao === current.id);
  const tituloAtual = (viaBusca ? null : tituloPagina) || rotuloDe({ secao: secaoMarcada });
  useEffect(() => {
    const g = nav.mesa.find((n) => n.filhos && contemSecao(n));
    if (g) setGavetas((v) => (v[g.id] ? v : { ...v, [g.id]: true }));
  },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [secaoMarcada]);

  /* Ir para um nó. Folha de personagem (Personagens › Eco › Ficha) pede a
     ficha daquele PJ naquela aba; o resto navega como sempre. */
  const irPara = (no) => {
    const d = destinoDe(no);
    /* COMPANHEIRO: troca o bicho aberto — E LEVA À ABA DELE.
       Até 27/10/2026 isto só pedia o bicho, com a justificativa de que "a aba
       já é a de Companheiros, quem abriu o submenu passou por ela". A
       justificativa nunca foi verdade: a gaveta do menu FICA ABERTA quando se
       navega para outro lugar, então o item seguia clicável do Inventário, da
       Loja ou da Cena — e dali o clique não fazia nada visível, porque trocava
       o bicho de uma aba que não estava na tela. Com as quatro páginas por
       companheiro o buraco ficou quatro vezes maior.

       Agora o destino vem junto: o Jogador vai para a aba Companheiros da
       própria ficha; o Mestre, para a ficha daquele PJ, na mesma aba. */
    if (no.comp) {
      if (no.pj) { abrirFichaDoPj(no.pj, 'animais'); ir('personagens_m', '', true); }
      else ir('ficha', 'animais');
      pedirCompanheiro(no.comp, no.parte);
      return;
    }
    /* FOLHA DE AÇÃO POR EVENTO (27/10/2026): o item não é página nenhuma —
       ele chega à tela certa e AVISA quem sabe fazer. É o caso de "Amigos",
       que saiu do trilho da ficha: o AmigosFab (11-ficha) ouve e abre o
       modal do pacto. O carimbo em `window.__amigosPedido` cobre a corrida
       do primeiro clique, quando a ficha ainda não montou para ouvir: quem
       monta logo depois lê o pedido recente e abre do mesmo jeito. */
    if (no.evento) {
      if (no.pj) { abrirFichaDoPj(no.pj, no.aba || 'ficha'); ir('personagens_m', '', true); }
      else if (no.abre) ir(no.abre.secao, no.abre.filtro);
      window.__amigosPedido = Date.now();
      window.dispatchEvent(new CustomEvent(no.evento));
      return;
    }
    if (no.acao) { pedirAcaoNoPj(no.pj, no.acao); ir('personagens_m', '', true); return; }
    if (no.pj) { abrirFichaDoPj(no.pj, no.aba); ir('personagens_m', '', true); return; }
    ir(d.secao, d.filtro);
  };
  const itemNav = (no, extraClasse) => {
    // As partes da ficha dividem a seção; quem marca é a aba aberta (23/10/2026).
    const ativo = !no.filhos && no.secao === secaoMarcada
      && (no.secao !== 'ficha' || !no.filtro || no.filtro === (abaFichaAtual || 'ficha'));
    return (
      <button key={(no.secao || no.id) + ':' + (no.filtro || '')} type="button"
        className={'mc-navitem' + (extraClasse ? ' ' + extraClasse : '') + (ativo ? ' is-active' : '')}
        aria-current={ativo ? 'page' : undefined}

        onClick={() => irPara(no)}>
        <i className={'ti ' + iconeDe(no)} aria-hidden="true" />
        <span>{rotuloDe(no)}</span>
      </button>
    );
  };
  // Companheiros só quando o personagem tem algum (como Animais antes).
  const podeMostrarFilho = (f) => !(f.secao === 'ficha' && f.filtro === 'animais' && !fichaTemAnimais);
  /* ── A GAVETA, EM QUALQUER PROFUNDIDADE (26/10/2026) ───────────────────────
     O menu tinha três níveis escritos à mão, e o quarto chegou com o pedido
     "os botões para selecionar o animal vão ficar no menu da esquerda como
     submenu de companheiros": Personagens › Eco › Companheiros › Trovão.
     Escrever o quarto à mão pediria o quinto amanhã, então a gaveta virou
     recursiva — o mesmo desenho vale para qualquer profundidade, e o recuo
     vem do aninhamento das próprias caixas.

     Um nó com filhos abre ao clicar; se ele mesmo é destino, o clique também
     navega (o personagem abre a ficha, Companheiros abre a aba). */
  const renderSub = (f) => {
    if (f.filhos && f.filhos.length) {
      /* `!f.comp` (27/10/2026): o nó do companheiro passou a carregar o `pj`
         do dono, e sem esta guarda a regra "abre sozinho quando a ficha deste
         PJ está aberta" valia para TODOS os bichos dele — as gavetas de todos
         os companheiros nasciam escancaradas de uma vez. Quem abre sozinho,
         entre os bichos, é só o que está na tela. */
      const estaAberto = (f.comp
        ? compPedido.id === f.comp
        : (f.pj && pjPedido.id === f.pj && !f.aba)) || !!gavetas[f.id];
      return (
        <div key={f.id} className="mc-navgaveta mc-navgaveta--neta">
          <button type="button"
            className={'mc-navitem mc-navitem--filho' + (estaAberto ? ' is-active' : '')}
            aria-expanded={estaAberto}
            onClick={() => {
              setGavetas((v) => ({ ...v, [f.id]: !estaAberto }));
              /* O COMPANHEIRO É DESTINO SEMPRE (27/10/2026). Ele virou galho
                 ao ganhar as quatro páginas, e isso o pôs em dois recuos
                 errados de uma vez:

                 1. `f.filhos[0]` — clicar no NOME do bicho abria a
                    Identificação dele, e não a ficha;
                 2. `if (!estaAberto)` — com a gaveta já aberta (e ela abre
                    sozinha no bicho da tela), clicar no nome não fazia NADA.
                    Era o caminho de volta de Inventário para o boneco.

                 Os outros galhos seguem como eram: navegam ao abrir. */
              if (f.comp) irPara(f);
              else if (!estaAberto) irPara((f.aba || f.secao) ? f : f.filhos[0]);
            }}>
            <span>{rotuloDe(f)}</span>
            <i className={'ti ti-chevron-down mc-navseta' + (estaAberto ? ' is-aberta' : '')} aria-hidden="true" />
          </button>
          {estaAberto && (
            <div className="mc-navfilhos mc-navfilhos--neta">
              {f.filhos.filter(podeMostrarFilho).map(renderSub)}
            </div>
          )}
        </div>
      );
    }
    /* Folha. Na gaveta da Ficha (23/10/2026) as folhas dividem a seção, e quem
       marca é a aba aberta; no submenu do Mestre, o par PJ + aba. */
    /* A FOLHA DO COMPANHEIRO MARCA PELO PAR (27/10/2026): com as páginas do
       bicho no menu, `comp` sozinho acendia as QUATRO de uma vez — todas são
       do mesmo companheiro. Quem distingue é a parte, e a ficha é a parte
       sem nome (clicar no bicho abre o boneco). */
    const ativo = f.comp
      ? (compPedido.id === f.comp && (f.parte || 'ficha') === (compPedido.parte || 'ficha'))
      : (f.pj
        ? (currentId === 'personagens_m' && pjPedido.id === f.pj && !f.acao && abaFichaMestre === f.aba)
        : (f.secao === secaoMarcada
          && (f.secao !== 'ficha' || !f.filtro || f.filtro === (abaFichaAtual || 'ficha'))));
    return (
      <button key={f.id || (f.secao + ':' + (f.filtro || ''))} type="button"
        className={'mc-navitem mc-navitem--filho'
          + (f.separa ? ' mc-navitem--separa' : '')
          + (f.perigo ? ' mc-navitem--perigo' : '')
          + (ativo ? ' is-active' : '')}
        aria-current={ativo ? 'page' : undefined}
        onClick={() => irPara(f)}>
        <span>{rotuloDe(f)}</span>
      </button>
    );
  };
  const renderNo = (no) => {
    if (!podeMostrarFilho(no)) return null;
    if (!no.filhos) return itemNav(no);
    // Grupo da MESA (Diário, Loja do Mestre): abre ali mesmo, como gaveta —
    // são poucas folhas.
    if (nav.mesa.includes(no)) {
      const contem = contemSecao(no);
      const aberta = !!gavetas[no.id];
      /* O GRUPO QUE TAMBÉM É PÁGINA ACENDE SOZINHO (27/10/2026). `contem &&
         !aberta` basta para gaveta pura: o pai apaga quando um filho acende.
         Mas "Ficha" e "Mesa" viraram gaveta E destino — e, estando na página
         deles, a gaveta está aberta (ela abre sozinha na seção atual) e nenhum
         filho é aquela página. Resultado: o menu inteiro apagado justamente na
         página em que se está. O predicado é o mesmo das folhas, em itemNav. */
      const souAPagina = !!no.navega && no.secao === secaoMarcada
        && (no.secao !== 'ficha' || !no.filtro || no.filtro === (abaFichaAtual || 'ficha'));
      return (
        <div key={no.id} className="mc-navgaveta">
          <button type="button" className={'mc-navitem' + (souAPagina || (contem && !aberta) ? ' is-active' : '')}
            aria-expanded={aberta}
            onClick={() => {
              setGavetas((v) => ({ ...v, [no.id]: !v[no.id] }));
              /* Personagens continua sendo a SAÍDA do Mestre (17/09/2026): o
                 toque volta à lista e fecha a ficha aberta (é o navToken que
                 vira voltarToken na PersonagensList). Sem isto, a gaveta teria
                 engolido o único caminho de volta. */
              /* `no.filtro` junto (27/10/2026): "Personagens" não tem filtro e
                 nada muda para ele, mas "Companheiros" é `ficha` + `animais` —
                 sem o filtro o clique abria a aba Ficha no lugar da dele. */
              if (no.navega && no.secao) { setPjPedido((p) => ({ id: null, token: p.token })); ir(no.secao, no.filtro); }
            }}>
            <i className={'ti ' + iconeDe(no)} aria-hidden="true" />
            <span>{rotuloDe(no)}</span>
            <i className={'ti ti-chevron-down mc-navseta' + (aberta ? ' is-aberta' : '')} aria-hidden="true" />
          </button>
          {aberta && (
            <div className="mc-navfilhos">
              {no.filhos.filter(podeMostrarFilho).map(renderSub)}
            </div>
          )}
        </div>
      );
    }
    // Livro de Regras: clicar abre a lista; a seta abre os filtros ao lado.
    const aberto = !!(painelMenu && painelMenu.grupo === no);
    const contem = contemSecao(no);
    return (
      <div key={(no.secao || no.id) + ':grupo'} className="mc-navlinha">
        <button type="button" className={'mc-navitem' + (contem ? ' is-active' : '')}
          aria-current={contem ? 'page' : undefined}
          onClick={() => { const d = destinoDe(no); ir(d.secao, d.filtro); }}>
          <i className={'ti ' + iconeDe(no)} aria-hidden="true" />
          <span>{rotuloDe(no)}</span>
        </button>
        <button type="button" className={'mc-navgrupo mc-navmais' + (aberto ? ' is-open' : '')}
          aria-haspopup="menu" aria-expanded={aberto}
          aria-label={(lang === 'en' ? 'Filters of ' : 'Filtros de ') + rotuloDe(no)}
          onClick={(e) => {
            const rect = e.currentTarget.closest('.mc-navlinha').getBoundingClientRect();
            setPainelMenu(aberto ? null : { grupo: no, rect });
          }}>
          <i className="ti ti-chevron-right" aria-hidden="true" />
        </button>
      </div>
    );
  };

  const fullName = (user.user_metadata && user.user_metadata.full_name) || user.email;
  const firstName = fullName.split(' ')[0];
  const avatarUrl = user.user_metadata && (user.user_metadata.avatar_url || user.user_metadata.picture);

  return (
    <>
      <div className="menestrel-ui mc-root" style={{ '--sidebar-w': SIDEBAR_LARGURA + 'px' }}>

        {/* ── Fundo animado — baseado em DarkGradientBg (paleta Pedra & Bronze) ── */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>

          {/* Gradiente base: a máscara é a FONTE DE LUZ, e ela atravessa o céu
              com a hora da mesa — à direita no nascente, no centro ao meio-dia
              (e à meia-noite), à esquerda no poente. Ver estiloLuzFundo. */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 1,
            background: 'radial-gradient(100% 100% at 0% 0%, #000000 0%, #000000 100%)',
            mask: luzFundo.mask,
            transition: 'mask 1.2s ease, -webkit-mask 1.2s ease',
          }} >

            {/* Filetes inclinados — os "raios". Os dois primeiros são a cor
                principal da hora (ouro de dia, luar de aço à noite), os três
                últimos a secundária. O desenho de cada máscara é o que dá o
                espaçamento irregular entre eles, e por isso continua fixo:
                quem responde à hora é a cor, a opacidade e a inclinação. */}
            {[
              { grad: luzFundo.gradA, mask: 'linear-gradient(90deg, transparent 0%, #000 20%, transparent 36%, #000 55%, rgba(0,0,0,0.13) 67%, #000 78%, transparent 97%)' },
              { grad: luzFundo.gradA, mask: 'linear-gradient(90deg, transparent 11%, #000 25%, rgba(0,0,0,0.55) 41%, rgba(0,0,0,0.13) 67%, #000 78%, transparent 97%)' },
              { grad: luzFundo.gradB, mask: 'linear-gradient(90deg, transparent 9%, #000 20%, rgba(0,0,0,0.55) 28%, rgba(0,0,0,0.42) 40%, #000 48%, rgba(0,0,0,0.27) 54%, rgba(0,0,0,0.13) 78%, #000 88%, transparent 97%)' },
              { grad: luzFundo.gradB, mask: 'linear-gradient(90deg, transparent 0%, #000 17%, rgba(0,0,0,0.55) 26%, #000 35%, transparent 47%, rgba(0,0,0,0.13) 69%, #000 79%, transparent 97%)' },
              { grad: luzFundo.gradB, mask: 'linear-gradient(90deg, transparent 0%, #000 20%, rgba(0,0,0,0.55) 27%, #000 42%, transparent 48%, rgba(0,0,0,0.13) 67%, #000 74%, #000 82%, rgba(0,0,0,0.47) 88%, transparent 97%)' },
            ].map((filete, i) => (
              <div key={i} style={{
                position: 'absolute', inset: 0,
                opacity: luzFundo.opacity,
                background: filete.grad,
                mask: filete.mask,
                transform: luzFundo.transform,
                transition: 'opacity 1.2s ease, transform 1.2s ease, background 1.2s ease',
              }} />
            ))}
          </div>

          {/* O CLIMA DA MESA, por cima da luz (20/09/2026). Uma camada por
              trilha acesa — chuva ou areia, vento, neve ou insolação. O
              desenho inteiro é CSS (.mc-clima em index.css): daqui saem só o
              tipo, o degrau e, pra chuva e a neve, o quanto está ventando,
              que é o que as inclina.

              O <i> é a TERCEIRA camada de profundidade: ::before e ::after
              dão duas, e chuva e neve precisam de três pra não parecerem um
              papel de parede rolando. */}
          {efeitosDoTempo(dataMesa).map((e) => (
            <div
              key={e.tipo}
              className={'mc-clima mc-clima-' + e.tipo}
              data-int={e.intensidade}
              style={e.vento != null ? { '--clima-vento': e.vento } : undefined}
            >
              <i aria-hidden="true" />
            </div>
          ))}

          {/* Grade de pontos sutil */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(var(--ouro-rgb),0.6) 1px, transparent 0)', backgroundSize: '20px 20px' }} />
        </div>

        {/* MENU LATERAL — Mesa em Sessão (22/10/2026). Era um trilho de 64px só
            de ícones, com o nome no tooltip ("sempre será pequeno", 12/09/2026).
            A crítica de 22/10 mostrou o custo — ícones opacos, nada no toque — e
            o usuário escolheu o menu com rótulos, nascendo da mesa (Mestre) ou do
            personagem (Jogador). No celular ele vira a folha "Mais". */}
        {/* `is-menu-aberto` agora inclui o PAINEL DE FILTROS (painelMenu): ele
            é um portal ao lado do menu, e sem isto alcançá-lo fechava a faixa
            que o abriu. */}
        <aside
          ref={sidebarRef}
          className={'mc-sidebar' + (navAberta ? ' is-aberta' : '')
            + (navExpandida ? ' is-expandida' : '')
            + (identAberto || userMenuOpen || painelMenu ? ' is-menu-aberto' : '')}
          onMouseEnter={abrirNavLateral}
          aria-label={lang === 'en' ? 'Navigation' : 'Navegação'}>
          <div className="mc-marca">
            <span className="mc-marca-nome"><SeloMenestrel size={28} /><span className="mc-marca-texto">Menestrel</span></span>
            <button type="button" className="mc-navfechar" aria-label={lang === 'en' ? 'Close menu' : 'Fechar menu'}
              onClick={() => setNavAberta(false)}>
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          </div>

          {/* IDENTIDADE: a mesa ativa (Mestre) ou o personagem ativo (Jogador). */}
          <div className="mc-ident-wrap" ref={identRef}>
            <button type="button" className="mc-ident" aria-haspopup="menu" aria-expanded={identAberto}
              aria-label={(profile === 'master' ? (lang === 'en' ? 'Table: ' : 'Mesa: ') : (lang === 'en' ? 'Character: ' : 'Personagem: ')) + (profile === 'master' ? (mesaAtiva ? mesaAtiva.titulo : '—') : (nomePersonagem || '—'))}
             
              onClick={() => setIdentAberto((v) => !v)}>
              {/* O ESTÁGIO NO RETRATO (23/10/2026): saiu da faixa de experiência
                  da ficha e virou um medalhão de ouro no canto da foto do
                  personagem ativo — lido junto com quem ele é. */}
              <span className="mc-ident-retrato">
              {profile === 'player' && pjAtivo && typeof calcEstagio === 'function' && (
                <span className="mc-ident-estagio" aria-label={(lang === 'en' ? 'Stage ' : 'Estágio ') + calcEstagio(Number(pjAtivo.experiencia) || 0)}>
                  {calcEstagio(Number(pjAtivo.experiencia) || 0)}
                </span>
              )}
              <span className="mc-ident-brasao" aria-hidden="true">
                {profile === 'player' && pjAtivo && pjAtivo.foto_url
                  ? <img src={pjAtivo.foto_url} alt="" />
                  : profile === 'player'
                    ? (nomePersonagem ? nomePersonagem.charAt(0).toUpperCase() : <i className="ti ti-user" />)
                    : (mesaAtiva ? mesaAtiva.titulo.trim().charAt(0).toUpperCase() : <i className="ti ti-shield" />)}
              </span>
              </span>
              <span className="mc-ident-txt">
                <span className="mc-ident-nome">
                  {profile === 'master'
                    ? (mesaAtiva ? mesaAtiva.titulo : (lang === 'en' ? 'Choose a table' : 'Escolher mesa'))
                    : (nomePersonagem || (lang === 'en' ? 'Choose a character' : 'Escolher personagem'))}
                </span>
              </span>
              <i className="ti ti-selector mc-ident-seta" aria-hidden="true" />
            </button>
            {identAberto && (
              <div className="mc-ident-menu" role="menu">
                {profile === 'master' ? (
                  <>
                    {(minhasHistorias || []).map((h) => (
                      <button key={h.id} type="button" role="menuitemradio" aria-checked={h.id === mesaAtivaId}
                        className={'mc-menu-item' + (h.id === mesaAtivaId ? ' is-atual' : '')}
                        onClick={() => { setMesaAtivaId(h.id); ir('cena'); }}>
                        <span>{h.titulo}</span>
                        {h.id === mesaAtivaId && <i className="ti ti-check" aria-hidden="true" />}
                      </button>
                    ))}
                    {/* "Todas as mesas" saiu do menu (23/10/2026, pedido do usuário). */}
                    {/* ESTA MESA (23/10/2026): Pausar, Editar e Excluir saíram do card
                        da Cena e moram aqui, junto do nome da mesa. A ação vai para a
                        Cena (HistoriasList), que é quem as executa (acaoMesa). */}
                    {mesaAtivaId && (() => {
                      const mesa = (minhasHistorias || []).find((h) => h.id === mesaAtivaId);
                      const pedir = (acao) => { setIdentAberto(false); setAcaoMesa((a) => ({ acao, token: (a ? a.token : 0) + 1 })); ir('cena'); };
                      return (
                        <>
                          <div className="mc-menu-regua" role="separator" />
                          <p className="mc-menu-rotulo">{lang === 'en' ? 'This table' : 'Esta mesa'}</p>
                          <button type="button" role="menuitem" className="mc-menu-item"
                            onClick={() => {
                              setMinhasHistorias((l) => (l || []).map((h) => (h.id === mesaAtivaId ? { ...h, pausada: !h.pausada } : h)));
                              pedir('pausar');
                            }}>
                            <i className={'ti ' + (mesa && mesa.pausada ? 'ti-player-play' : 'ti-player-pause')} aria-hidden="true" />
                            <span>{mesa && mesa.pausada ? (lang === 'en' ? 'Resume' : 'Retomar') : (lang === 'en' ? 'Pause' : 'Pausar')}</span>
                          </button>
                          <button type="button" role="menuitem" className="mc-menu-item" onClick={() => pedir('editar')}>
                            <i className="ti ti-pencil" aria-hidden="true" /><span>{lang === 'en' ? 'Edit' : 'Editar'}</span>
                          </button>
                          <button type="button" role="menuitem" className="mc-menu-item mc-menu-item--perigo" onClick={() => pedir('excluir')}>
                            <i className="ti ti-trash" aria-hidden="true" /><span>{lang === 'en' ? 'Delete' : 'Excluir'}</span>
                          </button>
                          <div className="mc-menu-regua" role="separator" />
                        </>
                      );
                    })()}
                    {mesaAtivaId && (
                      <button type="button" role="menuitem" className="mc-menu-item" onClick={() => { setMesaAtivaId(null); ir('historias'); }}>
                        <i className="ti ti-door-exit" aria-hidden="true" /><span>{lang === 'en' ? 'Leave' : 'Sair'}</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button type="button" role="menuitem" className="mc-menu-item" onClick={() => ir('ficha')}>
                      <i className="ti ti-id" aria-hidden="true" /><span>{lang === 'en' ? 'Open sheet' : 'Abrir ficha'}</span>
                    </button>
                    <button type="button" role="menuitem" className="mc-menu-item"
                      onClick={() => { setSairToken((n) => n + 1); ir('ficha'); }}>
                      <i className="ti ti-arrows-exchange" aria-hidden="true" /><span>{lang === 'en' ? 'Switch character' : 'Trocar de personagem'}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* MENU LATERAL REDESENHADO (23/10/2026, aprovado na prévia): a busca
              no livro logo abaixo da mesa, sempre à mão; Criaturas, Itens,
              Magias, Técnicas e Habilidades saíram do menu — a busca (Ctrl K)
              acha qualquer entrada e o "Ver todos" de cada tipo abre a lista. */}
          <button type="button" className="mc-navbusca mc-navbusca--topo" onClick={() => { fecharNavTip(); setNavAberta(false); setBuscaAberta(true); }}
            aria-keyshortcuts="Control+K">
            <i className="ti ti-eye" aria-hidden="true" />
            <span>{lang === 'en' ? 'Search' : 'Buscar'}</span>
            <kbd>Ctrl K</kbd>
          </button>
          <nav className="mc-nav">
            {/* O rótulo "Personagem"/"Mesa" saiu (23/10/2026): só aparecia com
                o menu aberto e empurrava os itens para baixo no hover. */}
            {nav.mesa.map(renderNo)}
            {/* O sino do Mestre (23/10/2026): a CentralMensagens desenha aqui. */}
            {profile === 'master' && mesaAtivaId && (
              <>
                <div className="mc-nav-regua" role="separator" />
                <div id="mc-sino-lateral" className="mc-sino-lateral" />
              </>
            )}
          </nav>
          {buscaAberta && (
            <BuscaLivro lang={lang} modoJogador={profile === 'player'} onClose={() => setBuscaAberta(false)}
              onEscolher={(r) => {
                /* Só a janela da entrada, sem sair da página (23/10/2026, "ao
                   clicar em um item, ele volta a mostrar tabela, o certo
                   deveria mostrar o modal, apenas"). A lista do tipo monta
                   escondida (.livro-flutuante, abaixo) e abre a entrada; a
                   janela vem por portal. A lista fica montada até a próxima
                   escolha: Editar abre o editor a partir dela. */
                setBuscaAberta(false);
                setLivroFlutuante({ secao: r.secao, chave: r.novo ? null : r.chave, nome: r.novo ? null : r.nome, novo: !!r.novo, token: Date.now() });
              }} />
          )}
          {/* Por portal na raiz do app: dentro do menu lateral, a janela fixa ficava presa a ele. */}
          {livroFlutuante && ReactDOM.createPortal(
            <div className="livro-flutuante" key={livroFlutuante.token}>
              {(() => {
                const Lista = { criaturas: CriaturasList, magias: MagiasList, habilidades: HabilidadesList,
                  tecnicas: TecnicasList, itens: ItensList }[livroFlutuante.secao];
                const Ctx = window.PainelLivroCtx;
                const lista = Lista ? (
                  <Lista ac={ac} lang={lang} modoJogador={profile === 'player'} historiaId={mesaAtivaId}
                    filtro="" pedido={livroFlutuante} />
                ) : null;
                // Escondida: nem painel, nem trilho — só a janela da entrada.
                return Ctx ? <Ctx.Provider value={{ el: null, desligado: true, dentro: false }}>{lista}</Ctx.Provider> : lista;
              })()}
            </div>,
            document.querySelector('#root .menestrel-ui') || document.body
          )}
          {painelMenu && (
            <NavMenuPainel
              grupo={painelMenu.grupo}
              ancora={painelMenu.rect}
              lang={lang}
              folhaAtual={folhaAtual}
              onEscolher={(folha) => ir(folha.secao, folha.filtro)}
              onFechar={() => setPainelMenu(null)}
            />
          )}

          {/* A CONTA: um botão de verdade (a crítica achou um <div> sem teclado). */}
          <div className="mc-user-wrap">
            <button type="button" className="mc-user" aria-haspopup="menu" aria-expanded={userMenuOpen}
             
              onClick={() => { fecharNavTip(); setUserMenuOpen((v) => !v); }}>
              {avatarUrl ? (
                <img ref={avatarRef} className="mc-user-foto" src={avatarUrl} alt="" referrerPolicy="no-referrer" />
              ) : (
                <span ref={avatarRef} className="mc-user-foto mc-user-foto--vazia" aria-hidden="true">{firstName.charAt(0).toUpperCase()}</span>
              )}
              <span className="mc-user-txt">
                <span className="mc-user-name">{firstName}</span>
                <span className="mc-user-papel">{profile === 'master' ? (lang === 'en' ? 'Game Master' : 'Mestre') : (lang === 'en' ? 'Player' : 'Jogador')}</span>
              </span>
              <i className="ti ti-dots-vertical" aria-hidden="true" />
            </button>
            {userMenuOpen && (
              <UserMenu
                anchorRef={avatarRef}
                email={user.email}
                fullName={fullName !== user.email ? fullName : null}
                avatarUrl={avatarUrl}
                firstName={firstName}
                podeTrocarPerfil={ehAdmin}
                paleta={paleta}
                onSetPaleta={escolherPaleta}
                profile={profile}
                onSetProfile={escolherPerfil}
                lang={lang}
                setLang={setLang}
                onHelp={() => { setUserMenuOpen(false); setCurrentId('guia_personagem'); }}
                onConvites={() => { setUserMenuOpen(false); setConviteModalAberto(true); }}
                onImagens={() => { setUserMenuOpen(false); setImagensAberto(true); }}
                onLogout={onLogout}
                onClose={() => setUserMenuOpen(false)}
              />
            )}
          </div>
        </aside>

        {/* Tooltip do menu lateral */}
        <NavTooltip tip={navTip} onEnter={manterNavTip} onLeave={fecharNavTip} />

        {/* CABEÇALHO DE PÁGINA (22/10/2026): a faixa do topo diz onde se está —
            a trilha (mesa ou personagem, e o grupo) e o título da página. A
            pílula de data, clima e ações (CardDataJogoAtual) mora à direita
            desta mesma faixa. */}
        <header className="mc-topo">
          <button type="button" className="mc-topo-menu" aria-label={lang === 'en' ? 'Open menu' : 'Abrir menu'}
            onClick={() => setNavAberta(true)}>
            <i className="ti ti-menu-2" aria-hidden="true" />
          </button>
          {/* Só o título (revisão, 22/10/2026): o rótulo em caixa-alta acima
              dele era um "kicker" — o seletor do menu já diz a mesa ou o
              personagem. */}
          <div className="mc-topo-txt">
            <h1 className="mc-topo-titulo">{tituloAtual}</h1>
          </div>
        </header>
        {navAberta && <div className="mc-nav-veu" aria-hidden="true" onClick={() => setNavAberta(false)} />}

        {/* CELULAR: barra inferior com os quatro primeiros destinos e "Mais". */}
        <nav className="mc-barra-inferior" aria-label={lang === 'en' ? 'Quick navigation' : 'Navegação rápida'}>
          {/* Gaveta conta pelo primeiro destino dela (Loja → Estoque); o
              Diário fica no "Mais" — são várias folhas de mesmo peso. */}
          {/* No celular (23/10/2026): as partes da ficha (Identificação,
              Conhecimento, Companheiros) ficam no Mais — os quatro atalhos do
              Jogador são Ficha, Inventário, Loja e Mesa —, e o destaque segue a
              aba da ficha, como no menu lateral (antes as quatro acendiam juntas). */}
          {nav.mesa.filter((n) => n.id !== 'diario' && !(n.secao === 'ficha' && n.filtro && n.filtro !== 'ficha')).slice(0, 4).map((no) => {
            const d = destinoDe(no);
            const ativo = no.filhos ? contemSecao(no) : (no.secao === secaoMarcada
              && (no.secao !== 'ficha' || !no.filtro || no.filtro === (abaFichaAtual || 'ficha')));
            return (
              <button key={no.secao || no.id} type="button" className={'mc-barra-item' + (ativo ? ' is-active' : '')}
                aria-current={ativo ? 'page' : undefined} onClick={() => ir(d.secao, d.filtro)}>
                <i className={'ti ' + iconeDe(no)} aria-hidden="true" />
                <span>{rotuloDe(no)}</span>
              </button>
            );
          })}
          <button type="button" className="mc-barra-item" aria-expanded={navAberta} onClick={() => setNavAberta(true)}>
            <i className="ti ti-dots" aria-hidden="true" />
            <span>{lang === 'en' ? 'More' : 'Mais'}</span>
          </button>
        </nav>

        <main className="mc-main">
          {/* O RESPIRO DO PÉ MUDOU-SE PARA O CSS (27/10/2026). Ele era um
              `paddingBottom: 80` embutido aqui — e estilo embutido ganha de
              qualquer folha, então a ficha não tinha como pedir outro. Era
              esse o chão que, somado aos 40px de margem do .fp-page, punha
              120px de vazio debaixo de um cartão que já não cabia na tela do
              notebook: a barra de rolagem que o usuário viu. O valor é o
              mesmo para todo mundo; quem precisa de outro agora consegue. */}
          <div className="mc-content" style={{ maxWidth: isWide ? 'none' : 860 }}>
            {/* BARRA DE AÇÕES DA FICHA (22/10/2026): dados, atalhos e amigos
                entram aqui por portal; vazia, ela some (:empty). Eram botões
                redondos flutuando nas bordas, por cima do título e da marca. */}
            {(fichaAtiva || current.id === 'personagens_m') && <div id="mc-acoes-ficha" className="mc-acoes-ficha" role="toolbar" aria-label={lang === 'en' ? 'Sheet actions' : 'Ações da ficha'} />}
            {/* O TRILHO DO LIVRO DE REGRAS (23/10/2026): as cinco seções e a busca
                da lista aberta (que a lista põe em #livro-trilho-busca). */}
            {['criaturas', 'itens', 'magias', 'tecnicas', 'habilidades'].includes(current.id) && (
              <div className="cartoes-barra livro-trilho">
                <div className="best-header-acoes">
                  <div id="livro-trilho-busca" className="livro-trilho-busca" />
                  {[
                    ['criaturas', 'ti-skull', 'Criaturas', 'Creatures'],
                    ['itens', 'ti-backpack', 'Itens', 'Items'],
                    ['magias', 'ti-sparkles', 'Magias', 'Spells'],
                    ['tecnicas', 'ti-sword', 'Técnicas', 'Techniques'],
                    ['habilidades', 'ti-bolt', 'Habilidades', 'Skills'],
                  ].map(([s, ic, pt, enR]) => (
                    <button key={s} type="button" className={'mc-acao' + (current.id === s ? ' is-ativo' : '')}
                      aria-current={current.id === s ? 'page' : undefined} onClick={() => ir(s, '')}>
                      <i className={'ti ' + ic} aria-hidden="true" />
                      <span className="mc-acao-rotulo">{lang === 'en' ? enR : pt}</span>
                    </button>
                  ))}
                  {/* O FILTRO (23/10/2026): as divisões do antigo menu (classe da
                      criatura, grupo do item, classe e tipo da magia…), num seletor
                      do trilho. "Todos" é o padrão. */}
                  {(() => {
                    const opcoes = [];
                    const andar = (nos, nivel) => (nos || []).forEach((no) => {
                      if (no.secao === current.id && no.filtro) opcoes.push({ filtro: no.filtro, rotulo: (no.rotulo && (no.rotulo[lang] || no.rotulo.pt)) || no.filtro, nivel });
                      if (no.filhos) andar(no.filhos, no.secao === current.id && no.filtro ? nivel + 1 : nivel);
                    });
                    andar(nav.regras, 0);
                    if (!opcoes.length) return null;
                    return (
                      <label className="livro-filtro">
                        <i className="ti ti-filter" aria-hidden="true" />
                        <select value={secaoFiltro || ''} aria-label={lang === 'en' ? 'Filter' : 'Filtro'}
                          onChange={(e) => { setSecaoFiltro(e.target.value); setNavToken((n) => n + 1); }}>
                          <option value="">{lang === 'en' ? 'All' : 'Todos'}</option>
                          {opcoes.map((o) => (
                            <option key={o.filtro} value={o.filtro}>{(o.nivel ? '\u2003' : '') + o.rotulo}</option>
                          ))}
                        </select>
                      </label>
                    );
                  })()}
                </div>
              </div>
            )}
            {current.id === 'criaturas' ? (
              /* `historiaId` (17/09/2026): habilita o botão de OLHO na tabela
                 — quem pode ver cada criatura NA MESA ATIVA. Disponibilizar
                 criatura pra história era a aba "Criatura" do Lore, que só se
                 alcançava por Histórias → card da mesa → botão "Lore"; o
                 botão saiu no mesmo dia e a função veio pra cá. O Jogador
                 recebe o id igual e a CriaturasList ignora (modoJogador). */
              <CriaturasList ac={ac} lang={lang} modoJogador={profile === 'player'} historiaId={mesaAtivaId} filtro={viaBusca ? '' : filtroAtual} titulo={viaBusca ? undefined : tituloPagina} pedido={pedidoLivro && pedidoLivro.secao === 'criaturas' ? pedidoLivro : null} />
            ) : (profile === 'player' && ABAS_DA_FICHA[current.id]) ? (
              /* Ficha, Inventário e Loja (22/10/2026): a ficha do personagem
                 ativo, aberta na aba que o menu pediu. Sem personagem ativo, a
                 lista para escolher — "Ficha" é a porta do Jogador. */
              <PersonagensList ac={ac} t={t} lang={lang} profile="player" currentUserId={user.id} userProfile={userProfile} soAcoes={['modal', 'editar', 'evoluir', 'deletar']} abrirNovoPersonagemRef={abrirNovoPersonagemRef} onDentroDeMenu={setPersonagensDentroDeMenu} onFichaAberta={setFichaAtiva} onNomePjAtivo={setNomePjAtivo}
                abaFicha={current.id === 'ficha' ? (filtroAtual || 'ficha') : ABAS_DA_FICHA[current.id]} abaToken={navToken}
                onAbaFicha={(aba, extra) => { setAbaFichaAtual(aba); if (extra) setFichaTemAnimais(!!extra.temAnimais); }} sairToken={sairToken} />
            ) : (profile === 'master' && ['cena', 'batalha', 'loja_mesa', 'jogadores'].includes(current.id)) ? (
              /* A MESA ATIVA (22/10/2026): Cena é o card da história; Batalha,
                 Loja e Jogadores abrem direto as páginas que eram botões dentro
                 dele. Sem mesa escolhida, todas as mesas para escolher uma. */
              <HistoriasList ac={ac} t={t} lang={lang} currentUserId={user.id} userProfile={userProfile} mesaAtivaId={mesaAtivaId} abrirNovaHistoriaRef={abrirNovaHistoriaRef} onDentroDeMenu={setHistoriasDentroDeMenu}
                onEntrarMesa={(id) => { setMesaAtivaId(id); }}
                acaoMesa={acaoMesa}
                vista={{ batalha: 'batalha', loja_mesa: 'loja', jogadores: 'convites' }[current.id] || null}
                onFecharVista={() => ir('cena')} />
            ) : current.id === 'personagens_j' ? (
              <PersonagensList ac={ac} t={t} lang={lang} profile="player" currentUserId={user.id} userProfile={userProfile} soAcoes={['modal', 'editar', 'evoluir', 'deletar']} abrirNovoPersonagemRef={abrirNovoPersonagemRef} onDentroDeMenu={setPersonagensDentroDeMenu} onFichaAberta={setFichaAtiva} onNomePjAtivo={setNomePjAtivo}
                onCompanheiros={setCompsDaMesa}
                compPedidoId={compPedido.id} compPedidoToken={compPedido.token}
                compPedidoParte={compPedido.parte} />
            ) : current.id === 'personagens_m' ? (
              /* `voltarToken`: o Mestre sai da ficha pelo próprio menu, e não
                 por um botão dentro dela — "quem persiste no personagem
                 escolhido é o jogador". Por isso o token só chega aqui. */
              <PersonagensList ac={ac} t={t} lang={lang} profile="master" currentUserId={user.id} userProfile={userProfile} mesaAtivaId={mesaAtivaId} voltarToken={navToken}
                /* O submenu Personagens › Eco › Ficha (26/10/2026): a lista
                   diz quem são, o menu pede quem abrir e em que aba. */
                onPersonagens={setPjsDaMesa}
                pjPedidoId={pjPedido.id} pjPedidoToken={pjPedido.token}
                acaoPjId={acaoPj.id} acaoPj={acaoPj.acao} acaoPjToken={acaoPj.token}
                abaFicha={abaFichaMestre} abaToken={abaTokenMestre} onAbaFicha={setAbaFichaMestre}
                onCompanheiros={setCompsDaMesa}
                compPedidoId={compPedido.id} compPedidoToken={compPedido.token}
                compPedidoParte={compPedido.parte} />
            ) : current.id === 'magias' ? (
              <MagiasList ac={ac} lang={lang} modoJogador={profile === 'player'} filtro={viaBusca ? '' : filtroAtual} titulo={viaBusca ? undefined : tituloPagina} pedido={pedidoLivro && pedidoLivro.secao === 'magias' ? pedidoLivro : null} />
            ) : current.id === 'habilidades' ? (
              <HabilidadesList ac={ac} lang={lang} modoJogador={profile === 'player'} filtro={viaBusca ? '' : filtroAtual} titulo={viaBusca ? undefined : tituloPagina} pedido={pedidoLivro && pedidoLivro.secao === 'habilidades' ? pedidoLivro : null} />
            ) : current.id === 'tecnicas' ? (
              <TecnicasList ac={ac} lang={lang} modoJogador={profile === 'player'} filtro={viaBusca ? '' : filtroAtual} titulo={viaBusca ? undefined : tituloPagina} pedido={pedidoLivro && pedidoLivro.secao === 'tecnicas' ? pedidoLivro : null} />
            ) : current.id === 'itens' ? (
              <ItensList ac={ac} lang={lang} modoJogador={profile === 'player'} filtro={viaBusca ? '' : filtroAtual} titulo={viaBusca ? undefined : tituloPagina} pedido={pedidoLivro && pedidoLivro.secao === 'itens' ? pedidoLivro : null} />
            ) : current.id === 'itens_campanha' ? (
              /* A mesa ativa (23/10/2026): sem ela a página buscava os itens de
                 história nenhuma e ficava sempre vazia. */
              <ItensCampanhaManager ac={ac} lang={lang} historiaId={mesaAtivaId}
                tituloHistoria={((minhasHistorias || []).find((h) => h.id === mesaAtivaId) || {}).titulo} />
            ) : current.id === 'historias' ? (
              /* "Todas as mesas" (seletor do topo): a lista inteira; entrar
                 numa leva à Cena dela. */
              <HistoriasList ac={ac} t={t} lang={lang} currentUserId={user.id} userProfile={userProfile} mesaAtivaId={null} abrirNovaHistoriaRef={abrirNovaHistoriaRef} onDentroDeMenu={setHistoriasDentroDeMenu} onEntrarMesa={(id) => { setMesaAtivaId(id); ir('cena'); }} />
            ) : (current.id === 'lugares' || current.id === 'cidades' || current.id === 'locais' || current.id === 'npcs' || current.id === 'memorias') ? (
              /* AS TRÊS QUE VIERAM DO DIÁRIO. Para o JOGADOR são o mesmo
                 DiarioView travado num tipo (ver `tipoFixo`), e sem personagem
                 ativo não há diário de ninguém — a tela diz isso em vez de
                 aparecer vazia.

                 Para o MESTRE (17/09/2026) Lugares e NPCs são outra coisa: o
                 lore DA MESA, o mesmo que ele já administrava em Histórias →
                 "Lore", agora também no menu lateral e preso à mesa ativa. Ele
                 não tem PJ, então o que falta aqui é mesa, não personagem.
                 Memórias segue só do Jogador: memória é do personagem. */
              profile === 'master' && current.id !== 'memorias' ? (
                <LoreDaMesa
                  historiaId={mesaAtivaId}
                  lang={lang}
                  tipoFixo={{ lugares: 'reino', cidades: 'cidade', locais: 'local' }[current.id] || 'npc'}
                />
              ) : !pjAtivo ? (
                <AdminEmpty ac={ac} sectionLabel={sectionMeta.label} />
              ) : (
                <DiarioView
                  pj={pjAtivo}
                  lang={lang}
                  currentUserId={user.id}
                  isMestre={false}
                  tipoFixo={{ lugares: 'reino', cidades: 'cidade', locais: 'local', npcs: 'npc' }[current.id] || 'memoria'}
                  key={current.id + ':' + pjAtivo.id}
                />
              )
            ) : current.id === 'aventuras' ? (
              <AventurasJogador t={t} lang={lang} currentUserId={user.id} reloadToken={aventurasReloadToken}
                mesaAtivaId={mesaAtivaId} pjAtivoId={pjAtivo ? pjAtivo.id : null} />
            ) : current.id === 'guia_personagem' ? (
              <GuiaPersonagem lang={lang} />
            ) : (
              <AdminEmpty ac={ac} sectionLabel={sectionMeta.label} />
            )}
          </div>
        </main>

        {/* Card flutuante com data/local atuais do jogo — topo da tela.
            A barra de data/local em si fica sempre visível. O seletor de
            mesa (Mestre, >1 história) e o botão "Nova história" — que vivem
            dentro do mesmo CardDataJogoAtual — desaparecem quando o Mestre
            entra num menu interno da aventura (loja/lore/batalhas/convites),
            via esconderSeletorEBotaoNovo: esses dois controles só existem na
            tela inicial de Histórias, pra nunca mostrar uma mesa diferente da
            que está sendo gerenciada na tela abaixo. Mesmo padrão pro botão
            "Novo personagem" (visão Jogador, aba personagens_j): só existe na
            view de lista — some quando o Jogador está vendo a ficha de um PJ
            ativo (esconderBotaoPersonagem). */}
        {/* ── O TRILHO NEM MONTA FORA DAS TRÊS TELAS DELE (27/10/2026) ──────
            Pedido do usuário: "a ficha do personagem ainda está sendo cortada
            por algum elemento invisível no topo da tela, onde ficava o trilho
            com a data, local, etc."

            Zerar a `historiaId` não bastava: o componente seguia montando —
            `.cdj-root` é `position: fixed` no alto, e mesmo sem dados o
            trilho dentro dele punha um chão translúcido por cima do começo da
            ficha. O corte que ele via era essa faixa.

            As telas em que o trilho tem o que dizer são três: a MESA (cena,
            no Mestre; aventuras, no Jogador), onde ele conduz data, lugar,
            clima e hora; a lista de PERSONAGENS do Jogador, pelo botão "Novo
            personagem"; e HISTÓRIAS, no Mestre, pelo "Nova história". Em
            qualquer outra, não existe. */}
        {(telaDaMesa || current.id === 'personagens_j' || current.id === 'historias') && (
        <CardDataJogoAtual
          lang={lang}
          /* A Mesa do jogador mostra a mesa ativa desde 23/10/2026 — o trilho
             de data, clima e hora volta a aparecer nela. */
          /* ── O TRILHO SÓ NA PÁGINA DA MESA (26/10/2026, pedido do usuário)
             "Para o mestre, o trilho de menu com data, localização, etc, só
              ficará visível quando estiver em 'cena'." · "Para o jogador, [...]
              só ficará visível quando estiver em 'mesa'."

             Ele é o painel de CONDUÇÃO da mesa — data, local, clima, hora. Em
             cima do Livro de Regras, do inventário ou da ficha, era uma barra
             de comando de outra coisa pairando sobre a tela que se está
             lendo. Sem `historiaId` o card não monta nada (contrato dele). */
          historiaId={telaDaMesa ? mesaAtivaId : null}
          podeEditar={profile === 'master'}
          userId={user.id}
          minhasHistorias={minhasHistorias}
          mesaAtivaId={mesaAtivaId}
          setMesaAtivaId={setMesaAtivaId}
          profile={profile}
          onNovaHistoria={(current.id === 'historias' || current.id === 'cena') ? () => abrirNovaHistoriaRef.current && abrirNovaHistoriaRef.current() : null}
          esconderSeletorEBotaoNovo={(current.id === 'historias' || current.id === 'cena') && historiasDentroDeMenu}
          sidebarLargura={SIDEBAR_LARGURA}
          onNovoPersonagem={current.id === 'personagens_j' ? () => abrirNovoPersonagemRef.current && abrirNovoPersonagemRef.current() : null}
          esconderBotaoPersonagem={current.id === 'personagens_j' && personagensDentroDeMenu}
          dataNascPjAtivo={dataNascPjAtivo}
          onDataAtual={receberDataMesa}
        />
        )}

        {/* Central de mensagens da mesa — Mestre e Jogador.
            Resolve a história via mesaAtivaId (Mestre: seletor acima;
            Jogador: PJ ativo, automático). Sem mesa resolvida, o próprio
            componente decide não montar nada. */}
        {/* O SINO SÓ NA MESA, PARA O JOGADOR (26/10/2026, pedido do usuário:
            "o ícone de notificação vai ficar apenas na página 'mesa' para o
            jogador"). Ele avisa o que acontece NA MESA; na ficha, no
            inventário ou no Livro de Regras era um alerta de outro lugar
            pairando sobre a leitura. O Mestre segue com ele em toda parte:
            é ele quem conduz, e o pedido falou do Jogador.

            Não basta zerar a história: o sino do Jogador mora por portal na
            barra de ações da ficha, e um sino sozinho ali desenhava um
            CÍRCULO MARROM no topo da ficha (a própria barra, redonda, com um
            botão só) — foi o que o usuário viu em 26/10/2026. Então o
            componente inteiro não monta fora da mesa. */}
        {/* A FICHA DO JOGADOR TAMBÉM CONTA (28/10/2026, usuário: "na página
            ficha, o botão de notificação não aparece no trilho").

            O sino já sabia ir para o trilho da ficha — mas o componente que o
            desenha não montava ali: para o Jogador, `telaDaMesa` é só a tela
            Aventuras. Na ficha dele não havia sino nenhum para colocar em
            lugar algum.

            O medo que gerou a trava continua respeitado: o sino SOZINHO numa
            barra redonda virava um círculo marrom no topo. Por isso a
            condição pede `fichaAtiva && mesaAtivaId` — dentro de uma mesa, e
            com a ficha montada, o trilho de verdade (Status, Atividades,
            Habilidades, Magias, Itens) está lá para recebê-lo. */}
        {(profile === 'master' || telaDaMesa || (fichaAtiva && mesaAtivaId)) && (
          <CentralMensagens lang={lang}
            historiaId={mesaAtivaId}
            sidebarLargura={SIDEBAR_LARGURA}
            ehMestre={profile === 'master'} />
        )}

        {/* Botão de rolagem de d20 livre — só aparece quando a FichaPersonagem
            está montada (fichaAtiva=true). O dado é vinculado ao PJ ativo, não
            à conta — fora da ficha o botão não existe. */}
        {fichaAtiva && (
          <RolagemLivreFab lang={lang} historiaId={mesaAtivaId} nomeUsuario={nomePjAtivo || firstName} />
        )}

        {/* Modal de aceite de convite — abre via botão "Convites" na sidebar */}
        {conviteModalAberto && typeof ConviteModal !== 'undefined' && (
          <ConviteModal
            t={t}
            lang={lang}
            currentUserId={user.id}
            onClose={() => setConviteModalAberto(false)}
            onAccepted={() => {
              setAventurasReloadToken((n) => n + 1);
              setConviteModalAberto(false);
            }}
          />
        )}

        {/* A galeria das pinturas — "Imagens", no menu do usuário (26/10/2026) */}
        {imagensAberto && typeof GaleriaImagensModal !== 'undefined' && (
          <GaleriaImagensModal lang={lang} onClose={() => setImagensAberto(false)} />
        )}
      </div>
    </>
  );
}

/* ============================== [25] App — Raiz da aplicação ============================== */
function App() {
  const [tweaks, setTweak] = useTweaks(TWEAKS_DEFAULTS);
  const [user, setUser] = useState(null);  // sessão Supabase
  const [profile, setProfile] = useState(null); // { plano, plano_escolhido_em }

  // Carrega/recarrega o profile do usuário (chamada depois do login e
  // depois da escolha na PrimeiraEntrada).
  const carregarProfile = async (authUser) => {
    const userId = authUser && authUser.id;
    if (!userId) { setProfile(null); return; }
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('plano, plano_escolhido_em, pj_ativo_id, perfil_tipo, paleta')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('[profile] carga falhou:', error);
      setProfile({ plano: 'free', plano_escolhido_em: new Date().toISOString(), perfil_tipo: 'player' });
      return;
    }
    if (data) {
      setProfile(data);
    } else {
      // Trigger de signup ainda não criou a linha (corrida) ou não rodou.
      // Cria via upsert JÁ COM os metadados do OAuth pra a linha nunca nascer
      // sem esses campos. NÃO toca plano_escolhido_em (preserva o onboarding).
      //
      // ⚠️ `ignoreDuplicates: true` (ON CONFLICT DO NOTHING) NÃO é detalhe.
      // Com o `onConflict:'id'` sozinho isto virava um UPDATE que sobrescrevia
      // a linha existente com plano:'free' e perfil_tipo:'player' — REBAIXANDO
      // quem já era pago ou Mestre. E o gatilho deste bloco não é "a linha não
      // existe": é "o SELECT acima não devolveu linha", que é coisa diferente.
      // O SELECT volta vazio sempre que a RLS não casa naquele instante (JWT
      // expirando, refresh de token, evento de auth com sessão ainda não
      // aplicada) — e carregarProfile roda em TODO onAuthStateChange, inclusive
      // TOKEN_REFRESHED. Ou seja: um soluço de sessão bastava pra derrubar o
      // plano e o perfil de uma conta boa.
      //
      // Reproduzido em transação abortada no banco: sem proteção, o upsert
      // levava paid→free e master→player. Hoje o gatilho
      // trg_plano_somente_admin segura o PLANO; o perfil_tipo dependia só
      // disto aqui.
      const meta = (authUser && authUser.user_metadata) || {};
      const { error: insErr } = await supabaseClient
        .from('profiles')
        .upsert({
          id: userId,
          plano: 'free',
          perfil_tipo: 'player',   // ← primeiro login sempre começa como jogador
          email: authUser.email || null,
          full_name: meta.full_name || meta.name || null,
          avatar_url: meta.avatar_url || meta.picture || null,
        }, { onConflict: 'id', ignoreDuplicates: true });
      if (insErr) console.error('[profile] upsert fallback falhou:', insErr);
      setProfile({ plano: 'free', plano_escolhido_em: null, perfil_tipo: 'player' });
    }
  };

  // ── Tema: NÃO existe claro/escuro (decisão de 05-06/2026 — light removido
  // do CSS). A máquina dark/light/auto que vivia aqui era código zumbi
  // (Topbar nem aceitava as props) e foi removida em 07/2026. O único eixo
  // visual vivo é o data-mode (grimoire/modern) abaixo.
  const lang = tweaks.lang || 'pt';
  const mode = tweaks.mode || 'grimoire';
  const t = COPY[lang] || COPY.pt;

  useEffect(() => {
    document.body.setAttribute('data-mode', mode);
    document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
  }, [mode, lang]);

  // Escutar sessão do Supabase
  useEffect(() => {
    (async () => {
      // 1. Se a URL tem #access_token=..., processa manualmente
      const hash = window.location.hash;
      if (hash.includes('access_token=')) {
        const params = new URLSearchParams(hash.slice(1)); // tira o #
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          const { data, error } = await supabaseClient.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) {
            console.error('[auth] setSession falhou:', error);
          } else {
            console.log('[auth] sessão criada manualmente:', data.session?.user?.email);
            // Limpa o hash da URL pra não ficar feio
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
      }

      // 2. Pega sessão (agora deve existir, seja do localStorage seja da que acabamos de criar)
      const { data: { session } } = await supabaseClient.auth.getSession();
      console.log('[auth] sessão final:', session?.user?.email);
      const u = session ? session.user : null;
      setUser(u);
      if (u) await carregarProfile(u);
      else setProfile(null);
    })();

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      const u = session ? session.user : null;
      setUser(u);
      if (u) {
        carregarProfile(u);
      } else {
        setProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const authCopy = AUTH_COPY[lang] || AUTH_COPY.pt;
  const adminCopy = ADMIN_COPY[lang] || ADMIN_COPY.pt;
  const logout = async () => {
    await supabaseClient.auth.signOut();
  };
  const setLang = (l) => setTweak('lang', l);

  // Logado → Admin Console. Deslogado → tela de login (única página pública).
  if (user) {
    /* Primeiro login (onboarding ainda não feito) → a PrimeiraEntrada NO
       LUGAR do console, não por cima dele (22/10/2026). O console só monta
       depois da escolha, já com o perfil certo em userProfile — se montasse
       antes, adotaria o 'player' do servidor e não veria a troca para Mestre
       (o AdminConsole só lê o perfil do servidor na primeira chegada). */
    // A escolha Mestre/Jogador só existe para o administrador (23/10/2026); as
    // outras contas entram direto como Jogador.
    if (profile && !profile.plano_escolhido_em && String(user.email || '').toLowerCase() === 'richardnanet@gmail.com') {
      const meta = user.user_metadata || {};
      const nome = String(meta.full_name || meta.name || '').trim().split(/\s+/)[0] || null;
      return (
        <PrimeiraEntrada
          lang={lang}
          setLang={setLang}
          userId={user.id}
          nome={nome}
          shader={tweaks.shader}
          shaderKind={tweaks.shaderKind}
          mode={mode}
          onSair={logout}
          onEscolhido={(papel) => {
            try { localStorage.setItem('menestrel.profile', papel); } catch (e) {}
            setProfile((p) => ({ ...p, perfil_tipo: papel, plano_escolhido_em: new Date().toISOString() }));
          }}
        />
      );
    }
    return (
      <AdminConsole
        user={user}
        userProfile={profile}
        onLogout={logout}
        t={t}
        lang={lang}
        setLang={setLang}
      />
    );
  }

  // Deslogado → a única página pública do app: o login com Google.
  return (
    <>
      <LoginPage
        lang={lang}
        setLang={setLang}
        authCopy={authCopy}
        shader={tweaks.shader}
        shaderKind={tweaks.shaderKind}
        mode={mode}
      />

      <TweaksPanel title="Tweaks">
        <TweakSection label={lang === 'en' ? 'Atmosphere' : 'Atmosfera'}>
          <TweakToggle
            label={lang === 'en' ? 'Shader background' : 'Fundo animado'}
            value={!!tweaks.shader}
            onChange={(v) => setTweak('shader', v)} />

          <TweakRadio
            label={lang === 'en' ? 'Effect' : 'Efeito'}
            value={tweaks.shaderKind || 'mesh'}
            options={[
              { value: 'mesh', label: lang === 'en' ? 'Mesh' : 'Mesh' },
              { value: 'rays', label: lang === 'en' ? 'Rays' : 'Raios' }]
            }
            onChange={(v) => setTweak('shaderKind', v)} />

          <TweakRadio
            label={lang === 'en' ? 'Mode' : 'Modo'}
            value={mode}
            options={[
              { value: 'grimoire', label: lang === 'en' ? 'Grimoire' : 'Grimório' },
              { value: 'modern', label: lang === 'en' ? 'Modern' : 'Moderno' }]
            }
            onChange={(v) => setTweak('mode', v)} />

          <TweakRadio
            label={lang === 'en' ? 'Language' : 'Idioma'}
            value={lang}
            options={[
              { value: 'pt', label: 'PT-BR' },
              { value: 'en', label: 'EN' }]
            }
            onChange={(v) => setTweak('lang', v)} />

        </TweakSection>
      </TweaksPanel>

    </>);

}

Object.assign(window, {
  ModalShell, NavMenuPainel,
  FantasyDatePicker, CampoData, AdminEmpty, AdminConsole, App,
  CentralMensagens, CardDataJogoAtual, RolagemLivreFab,
  // A linha do feed e o conversor de evento — expostos para o teste do
  // destaque (log-eventos.test.jsx) montar só eles.
  LOG_CATEGORIAS, categoriaDoLog, LogCard, MensagemEvento, linhaParaMensagem,
  // Puras, expostas pro teste da luz por horário (10-shell/luz-do-horario.test.js).
  periodoDaHora, faseDoPeriodo, horaDoJogo, luzDaHora, estiloLuzFundo,
  // Pura, exposta pro teste do clima (10-shell/clima-efeitos.test.js).
  efeitosDoTempo,
  proximaMesaAtiva,
  // Puras, expostas pro teste do log de tempo (10-shell/log-tempo-mesa.test.js).
  feriadosDoDia, rotuloDataJogo, textoEventoData, textoEventoHora, textoEventoLocal, textoEventoTempo,
  // Pura, exposta pro teste da corrida de perfil_tipo
  // (10-shell/perfil-persistencia.test.js).
  devePersistirPerfil,
});