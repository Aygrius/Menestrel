/* ============================================================
   efeitos-da-vez.jsx — a aprovação do Mestre entre as vezes e os
   efeitos que a mesa vê quando ele aprova (10/11/2026)
   ============================================================
   Usuário: "Entre cada rodada da batalha, o mestre deverá aprovar a ação
   mudar de combatente, somente essa aprovação que vai aparecer o efeito do
   golpe ou magia." E: "uma bela animação para cada tipo de ataque, magia,
   etc. Isso será usado para o mestre narrar o que aconteceu na vez do
   combatente. Magia de bola de fogo faz um efeito de fogo no alvo, raio
   brilha a tela e o alvo, etc. Crie um efeito para cada elemento."
   Escolhas dele: o resultado é calculado e gravado na hora, mas fica OCULTO
   para a mesa até o Mestre revelar; todos veem a animação; no automático a
   aprovação substitui a pausa fixa.

   A CORTINA (coluna batalhas.cortina, gravada só pelo Mestre):
     { vez, nome, log_desde, vista, revelado }
     vez        rodada + ':' + chave de quem tem a vez aberta
     nome       o nome dele (o botão do Mestre diz de quem é a vez revelada)
     log_desde  onde o log estava quando a vez abriu — o que vem depois é oculto
     vista      o que a mesa vê dos combatentes: as pools e o status de quando
                a vez abriu (o jogador não vê a EF do alvo cair antes da hora)
     revelado   { n, de, ate, antes } — a última revelação: o trecho do log
                que ela mostrou e a vista de antes, para os efeitos
   A vez mudou (o último PA, passar, a virada) e a cortina ainda é da vez
   anterior = AGUARDANDO: ninguém age até o Mestre revelar. Revelar abre a
   cortina da vez nova com a mesa de agora, e cada tela toca os efeitos do
   trecho revelado.
   ============================================================ */

const CORTINA_CAMPOS = ['ef', 'eh', 'res', 'karma', 'ef_max', 'eh_max', 'res_max', 'karma_max', 'status', 'status_temp'];
const FX_INTERVALO_MS = 1000;   // um efeito por segundo: dá para o Mestre narrar cada um
const FX_DURACAO_MS = 1500;
const FX_MAX = 12;

function chaveFx(p) {
  if (!p) return null;
  return p.inst_id || (p.tipo + ':' + p.ref_id);
}
function chaveDaVez(p, rodada) {
  return p ? (rodada || 0) + ':' + chaveFx(p) : null;
}
function vistaDaMesa(participantes) {
  return (participantes || []).map((p) => {
    const v = { chave: chaveFx(p), tipo: p.tipo, ref_id: p.ref_id };
    if (p.lado) v.lado = p.lado;
    if (p.dono_pj != null) v.dono_pj = p.dono_pj;
    CORTINA_CAMPOS.forEach((k) => { if (p[k] !== undefined) v[k] = p[k]; });
    return v;
  });
}
function daVezAtual(participantes) {
  return (participantes || []).find((p) => p && p.atual) || null;
}
/* A cortina da vez que começa agora. `anterior` leva a revelação adiante. */
function abrirCortina(participantes, rodada, log, revelado) {
  const atual = daVezAtual(participantes);
  return {
    vez: chaveDaVez(atual, rodada),
    nome: atual ? atual.nome || '' : '',
    log_desde: (log || []).length,
    vista: vistaDaMesa(participantes),
    revelado: revelado || null,
  };
}
function cortinaAguardando(cortina, participantes, rodada) {
  if (!cortina || !cortina.vez) return false;
  const atual = daVezAtual(participantes);
  if (!atual) return false;
  return cortina.vez !== chaveDaVez(atual, rodada);
}
/* O Mestre revelou: a vez nova abre, e a revelação guarda o trecho e a mesa
   de antes, para cada tela tocar os efeitos. */
function revelarCortina(cortina, participantes, rodada, log) {
  const n = ((cortina && cortina.revelado && cortina.revelado.n) || 0) + 1;
  const de = cortina ? (cortina.log_desde || 0) : (log || []).length;
  const revelado = { n, de, ate: (log || []).length, antes: (cortina && cortina.vista) || [] };
  return abrirCortina(participantes, rodada, log, revelado);
}
/* O que a mesa vê de cada combatente enquanto a vez está oculta: pools e
   status da vista; posição, vez e o resto, ao vivo. `meus` são as chaves que
   esta tela enxerga sem cortina (o próprio PJ, o animal dele). Quem chegou
   depois da vista (invocado) fica de fora até a revelação. */
function participantesNaCortina(participantes, cortina, meus) {
  if (!cortina || !Array.isArray(cortina.vista)) return participantes;
  const porChave = new Map(cortina.vista.map((v) => [v.chave, v]));
  const livres = new Set((meus || []).filter(Boolean));
  return (participantes || []).map((p) => {
    const ch = chaveFx(p);
    if (livres.has(ch)) return p;
    const v = porChave.get(ch);
    if (!v) return { ...p, oculto_na_cortina: true };
    const out = { ...p };
    CORTINA_CAMPOS.forEach((k) => { if (k in v) out[k] = v[k]; else delete out[k]; });
    return out;
  });
}
/* O log que a mesa vê: até onde a vez abriu, mais o que a própria tela fez. */
function logNaCortina(log, cortina, ehMeu) {
  if (!cortina || cortina.log_desde == null) return log || [];
  return (log || []).filter((e, i) => i < cortina.log_desde || (ehMeu && ehMeu(e)));
}

/* ── Os efeitos de uma revelação ──────────────────────────────────
   Do trecho do log (o que aconteceu) e da diferença entre a vista de antes
   e a de agora (quem caiu, quem chegou, quem se curou). Puro. */
const GOLPES = { CORTE: 'corte', PERFURACAO: 'perfuracao', ESMAGAMENTO: 'esmagamento', DESARMADO: 'esmagamento' };
const ELEMENTOS_FX = ['fogo', 'agua', 'ar', 'terra', 'celestial', 'infernal'];

function chaveDoAlvoNaEntrada(e, vista) {
  if (e.alvo_inst_id) return e.alvo_inst_id;
  if (!e.alvo_tipo) return null;
  const achado = (vista || []).find((v) => v.tipo === e.alvo_tipo && String(v.ref_id) === String(e.alvo_ref_id));
  return achado ? achado.chave : e.alvo_tipo + ':' + e.alvo_ref_id;
}
function chaveDoAutorNaEntrada(e, vista) {
  if (e.autor_inst_id) return e.autor_inst_id;
  if (!e.autor_tipo) return null;
  return chaveDoAlvoNaEntrada({ alvo_tipo: e.autor_tipo, alvo_ref_id: e.autor_ref_id }, vista);
}
function errou(e) {
  if (e.critico) return false;
  if (e.resultado === 'FC' || e.resultado === 'R') return true;
  return !(Number(e.dano) > 0);
}
function lado(v) {
  if (v && (v.lado === 'aliados' || v.lado === 'inimigos')) return v.lado;
  return v && (v.tipo === 'pj' || v.dono_pj != null) ? 'aliados' : 'inimigos';
}
function efeitosDaRevelacao(log, revelado, vistaDepois) {
  if (!revelado) return [];
  const antes = revelado.antes || [];
  const depois = vistaDepois || [];
  const vAntes = new Map(antes.map((v) => [v.chave, v]));
  const vDepois = new Map(depois.map((v) => [v.chave, v]));
  const trecho = (log || []).slice(revelado.de || 0, revelado.ate != null ? revelado.ate : undefined);
  const fx = [];
  const ganho = (ch) => {
    const a = vAntes.get(ch); const d = vDepois.get(ch);
    if (!a || !d) return 0;
    return Math.max(0, ((Number(d.ef) || 0) + (Number(d.eh) || 0)) - ((Number(a.ef) || 0) + (Number(a.eh) || 0)));
  };
  trecho.forEach((e) => {
    if (!e || !e.acao) return;
    const alvo = chaveDoAlvoNaEntrada(e, depois);
    const autor = chaveDoAutorNaEntrada(e, depois);
    const extras = Array.isArray(e.alvos_extras_inst_ids) ? e.alvos_extras_inst_ids : [];
    if (e.acao === 'arma' || e.acao === 'magia') {
      const erro = errou(e);
      const base = e.acao === 'arma'
        ? { tipo: 'golpe', variante: GOLPES[e.golpe_tipo] || 'corte' }
        : { tipo: 'magia', elemento: ELEMENTOS_FX.includes(e.elemento) ? e.elemento : 'arcano' };
      [alvo, ...extras].filter(Boolean).forEach((ch, k) => {
        fx.push({ ...base, alvo: ch, autor, erro, critico: !!e.critico && k === 0,
          valor: !erro && k === 0 && Number(e.dano) > 0 ? Number(e.dano) : null });
      });
      return;
    }
    if (e.acao === 'iniciou' || (e.acao === 'apoio' && e.fase_evocacao === 'iniciou')) {
      if (autor) fx.push({ tipo: 'evocacao', alvo: autor });
      return;
    }
    if (e.acao === 'perdeu') { if (autor) fx.push({ tipo: 'dissipa', alvo: autor }); return; }
    if (e.acao === 'apoio') {
      if (!alvo) return;
      if (e.resistiu) { fx.push({ tipo: 'resistiu', alvo }); return; }
      // "Até N alvos" (10/11/2026): cada um recebe o seu efeito.
      [alvo, ...extras].forEach((ch) => {
        const cura = ganho(ch);
        if (cura > 0) { fx.push({ tipo: 'cura', alvo: ch, valor: cura }); return; }
        const mesmoLado = autor && lado(vDepois.get(autor) || { chave: autor }) === lado(vDepois.get(ch) || { chave: ch });
        fx.push({ tipo: mesmoLado || ch === autor ? 'bencao' : 'maldicao', alvo: ch });
      });
      return;
    }
    if (e.acao === 'item') {
      const ch = alvo || autor;
      if (ch) fx.push({ tipo: 'item', alvo: ch, valor: ganho(ch) || null });
      return;
    }
    if (e.acao === 'teste') { if (autor) fx.push({ tipo: 'tecnica', alvo: autor }); return; }
  });
  // Quem chegou (invocado, convocado) e quem caiu.
  depois.forEach((d) => {
    const a = vAntes.get(d.chave);
    if (!a) { if (antes.length) fx.push({ tipo: 'invocacao', alvo: d.chave }); return; }
    const caiu = (a.status || 'ativo') === 'ativo' && (d.status === 'morto' || d.status === 'desmaiado');
    if (caiu) fx.push({ tipo: 'queda', alvo: d.chave, morto: d.status === 'morto' });
  });
  return fx.slice(0, FX_MAX);
}

/* ── O tocador ─────────────────────────────────────────────────────
   Uma camada fixa sobre a tela; cada efeito nasce no centro do avatar do
   alvo (o token marca `data-fx-chave`). Sem o token à vista (batalha sem
   tabuleiro, alvo fora da tela), o efeito sai no meio da tela. */
const BATALHAS_COM_CORTINA = (typeof window !== 'undefined')
  ? (window.__menestrelCortinas = window.__menestrelCortinas || new Set())
  : new Set();

function rectDoAlvo(chave) {
  if (typeof document === 'undefined' || !chave) return null;
  let el = null;
  try { el = document.querySelector('[data-fx-chave="' + String(chave).replace(/"/g, '\\"') + '"]'); } catch (e) { el = null; }
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, tam: r.width };
}

function tremer(chave) {
  let el = null;
  try { el = document.querySelector('[data-fx-chave="' + String(chave).replace(/"/g, '\\"') + '"]'); } catch (e) { el = null; }
  if (!el) return;
  el.classList.remove('fx-tremor');
  void el.offsetWidth;   // reinicia a animação no golpe seguido
  el.classList.add('fx-tremor');
  setTimeout(() => el.classList.remove('fx-tremor'), 520);
}

/* O raio: um zigue-zague do alto da tela até o alvo, novo a cada golpe. */
function caminhoDoRaio(x, y, semente) {
  let s = semente || 1;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const pontos = [[x + (rnd() - 0.5) * 120, -10]];
  const passos = 7;
  for (let i = 1; i < passos; i += 1) {
    const t = i / passos;
    pontos.push([x + (rnd() - 0.5) * 90 * (1 - t), -10 + (y + 10) * t]);
  }
  pontos.push([x, y]);
  return pontos.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
}

function textoDoValor(f, isEn) {
  if (f.tipo === 'golpe' || f.tipo === 'magia') {
    if (f.erro) return isEn ? 'Miss' : 'Errou';
    return f.valor != null ? '−' + f.valor : null;
  }
  if ((f.tipo === 'cura' || f.tipo === 'item') && f.valor) return '+' + f.valor;
  if (f.tipo === 'resistiu') return isEn ? 'Resisted' : 'Resistiu';
  if (f.tipo === 'queda') return f.morto ? (isEn ? 'Dead' : 'Morto') : (isEn ? 'Down' : 'Caído');
  return null;
}

function classeDoEfeito(f) {
  const c = ['fx'];
  if (f.tipo === 'magia') c.push('fx--' + f.elemento);
  else if (f.tipo === 'golpe') c.push('fx--golpe', 'fx--golpe-' + f.variante);
  else c.push('fx--' + f.tipo);
  if (f.erro) c.push('is-erro');
  if (f.critico) c.push('is-critico');
  return c.join(' ');
}

/* As camadas de cada efeito: spans que o CSS anima (efeitos-da-vez.css). */
const CAMADAS = {
  fogo: ['brilho', 'chama', 'chama', 'chama', 'chama', 'chama', 'brasa', 'brasa', 'brasa', 'brasa', 'brasa', 'brasa'],
  agua: ['brilho', 'onda', 'onda', 'onda', 'gota', 'gota', 'gota', 'gota', 'gota', 'gota', 'gota', 'gota'],
  ar: ['brilho', 'faisca', 'faisca', 'faisca', 'faisca', 'faisca', 'faisca'],
  terra: ['poeira', 'pedra', 'pedra', 'pedra', 'pedra', 'pedra', 'pedra', 'fenda'],
  celestial: ['coluna', 'brilho', 'halo', 'luz', 'luz', 'luz', 'luz', 'luz', 'luz'],
  infernal: ['brilho', 'fumo', 'fumo', 'fumo', 'labareda', 'labareda', 'labareda', 'labareda', 'brasa', 'brasa', 'brasa', 'brasa'],
  arcano: ['brilho', 'runa', 'runa-dentro', 'estilhaco', 'estilhaco', 'estilhaco', 'estilhaco', 'estilhaco', 'estilhaco'],
  golpe: ['rastro', 'impacto', 'faisca', 'faisca', 'faisca', 'faisca'],
  evocacao: ['espiral', 'espiral'],
  dissipa: ['brilho', 'fumo', 'fumo'],
  resistiu: ['escudo'],
  cura: ['brilho', 'luz', 'luz', 'luz', 'luz', 'luz', 'luz', 'luz'],
  item: ['brilho', 'luz', 'luz', 'luz', 'luz'],
  bencao: ['halo', 'halo', 'luz', 'luz', 'luz', 'luz'],
  maldicao: ['halo', 'gota', 'gota', 'gota', 'gota', 'brilho'],
  tecnica: ['rastro', 'rastro'],
  invocacao: ['circulo', 'coluna', 'luz', 'luz', 'luz', 'luz'],
  queda: ['afundar'],
};

function UmEfeito({ f, isEn }) {
  const pos = f.pos;
  const chave = f.tipo === 'magia' ? f.elemento : (f.tipo === 'golpe' ? 'golpe' : f.tipo);
  const camadas = CAMADAS[chave] || ['brilho'];
  const valor = textoDoValor(f, isEn);
  const tam = Math.max(44, Math.min(140, pos.tam || 56));
  return React.createElement('div', {
    className: classeDoEfeito(f),
    style: { left: pos.x, top: pos.y, '--fx-tam': tam + 'px' },
  },
    camadas.map((c, i) => React.createElement('span', { key: i, className: 'fx-' + c, style: { '--i': i } })),
    valor && React.createElement('b', { className: 'fx-valor' }, valor),
  );
}

/* A tela que monta a batalha põe isto uma vez. `cortina` vem da linha da
   batalha; os efeitos tocam quando `cortina.revelado.n` muda (abrir a tela
   com uma revelação antiga não toca nada). Também avisa o 10-shell, que
   segura as notificações da batalha até aqui (ver o card da mesa). */
function EfeitosDaVez({ batalhaId, cortina, log, isEn, seguraCards = true }) {
  const [vivos, setVivos] = useState([]);
  const visto = useRef(null);
  const timers = useRef([]);
  const n = cortina && cortina.revelado ? cortina.revelado.n : 0;

  /* Só segura as notificações quando a batalha TEM a cortina: sem ela (a
     coluna ainda não existe, ou o Mestre ainda não abriu a primeira vez), a
     mesa segue como antes. E nunca na tela do Mestre (10/11/2026, usuário: "O
     mestre precisa ver a notificação da ação no combate antes dos jogadores,
     para poder narrar"): ele lê na hora; os jogadores, na revelação. */
  const ativa = !!cortina && seguraCards;
  useEffect(() => {
    if (batalhaId == null || !ativa) return undefined;
    const id = String(batalhaId);
    BATALHAS_COM_CORTINA.add(id);
    return () => {
      BATALHAS_COM_CORTINA.delete(id);
      // Saindo da tela: o que estava segurado aparece, nada fica preso.
      window.dispatchEvent(new CustomEvent('menestrel:revelacao', { detail: { batalhaId: id, intervalo: 0 } }));
    };
  }, [batalhaId, ativa]);
  /* O CARD ESPERA A REVELAÇÃO (11/11/2026, usuário: "O modal de notificação
     vai ficar ativo até o mestre revelar a ação"). Toda tela com a cortina —
     a do Mestre também — marca a batalha aqui; o card de um evento dela não
     some sozinho no tempo de sempre, só quando 'menestrel:revelacao' chega
     (CentralMensagens, 10-shell/shell.jsx). */
  const comCortina = !!cortina;
  useEffect(() => {
    if (batalhaId == null || !comCortina) return undefined;
    const id = String(batalhaId);
    const set = (window.__menestrelRevelacao = window.__menestrelRevelacao || new Set());
    set.add(id);
    return () => {
      set.delete(id);
      // Saindo da tela da batalha, o card que esperava a revelação sai também.
      window.dispatchEvent(new CustomEvent('menestrel:revelacao', { detail: { batalhaId: id, intervalo: 0 } }));
    };
  }, [batalhaId, comCortina]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (visto.current === null) { visto.current = n; return; }   // a primeira leitura não toca
    if (!n || n === visto.current) return;
    visto.current = n;
    const lista = efeitosDaRevelacao(log, cortina.revelado, cortina.vista);
    window.dispatchEvent(new CustomEvent('menestrel:revelacao', {
      detail: { batalhaId: String(batalhaId), intervalo: FX_INTERVALO_MS },
    }));
    const semMovimento = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    lista.forEach((f, i) => {
      timers.current.push(setTimeout(() => {
        const r = rectDoAlvo(f.alvo) || { x: window.innerWidth / 2, y: window.innerHeight / 2, tam: 64 };
        const id = n + ':' + i;
        const novo = { ...f, id, pos: r };
        if (f.tipo === 'magia' && f.elemento === 'ar' && !f.erro) novo.raio = caminhoDoRaio(r.x, r.y, n * 31 + i);
        setVivos((v) => [...v, novo]);
        // O raio clareia a tela; o crítico escurece as bordas. Com movimento
        // reduzido, só o efeito sobre o alvo.
        if (!semMovimento) {
          const tela = (f.tipo === 'magia' && f.elemento === 'ar' && !f.erro) ? 'raio' : (f.critico ? 'critico' : null);
          if (tela) {
            const el = document.documentElement;
            el.setAttribute('data-fx-tela', tela);
            timers.current.push(setTimeout(() => {
              if (el.getAttribute('data-fx-tela') === tela) el.removeAttribute('data-fx-tela');
            }, 700));
          }
        }
        if (!semMovimento && !f.erro && ((f.tipo === 'magia' && f.elemento === 'terra') || f.critico)) tremer(f.alvo);
        timers.current.push(setTimeout(() => setVivos((v) => v.filter((x) => x.id !== id)), FX_DURACAO_MS));
      }, i * FX_INTERVALO_MS));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  if (!vivos.length || typeof ReactDOM === 'undefined') return null;
  return ReactDOM.createPortal(
    React.createElement('div', { className: 'fx-camada', 'aria-hidden': 'true' },
      vivos.filter((f) => f.raio).map((f) => React.createElement('svg', {
        key: 'raio-' + f.id, className: 'fx-raio', width: '100%', height: '100%',
      },
        React.createElement('path', { d: f.raio, className: 'fx-raio-halo' }),
        React.createElement('path', { d: f.raio, className: 'fx-raio-nucleo' }),
      )),
      vivos.map((f) => React.createElement(UmEfeito, { key: f.id, f, isEn })),
    ),
    document.body,
  );
}

/* O botão do Mestre: a vez de X terminou, revelar. Fica no trilho, onde o
   "É a vez de" já mora. */
function BotaoRevelarVez({ cortina, proximo, isEn, disabled, onRevelar }) {
  const nome = (cortina && cortina.nome) || '';
  return React.createElement('span', { className: 'batalha-trilho-revelar', role: 'status' },
    React.createElement('span', { className: 'batalha-trilho-revelar-texto' },
      isEn ? 'Turn over: ' : 'Vez concluída: ', React.createElement('b', null, nome)),
    React.createElement('button', {
      type: 'button', className: 'btn-primary btn-sm', disabled, onClick: onRevelar,
      'aria-label': (isEn ? 'Reveal the turn of ' : 'Revelar a vez de ') + nome
        + (proximo ? (isEn ? '; then it is ' : '; depois, é a vez de ') + proximo : ''),
    },
      React.createElement('i', { className: 'ti ti-eye', 'aria-hidden': 'true' }),
      isEn ? 'Reveal' : 'Revelar'),
  );
}

Object.assign(window, {
  EfeitosDaVez, BotaoRevelarVez,
  MotorCortina: {
    CORTINA_CAMPOS, FX_INTERVALO_MS, FX_DURACAO_MS, FX_MAX,
    chaveFx, chaveDaVez, vistaDaMesa, abrirCortina, cortinaAguardando, revelarCortina,
    participantesNaCortina, logNaCortina, efeitosDaRevelacao, caminhoDoRaio, textoDoValor, classeDoEfeito,
  },
});
