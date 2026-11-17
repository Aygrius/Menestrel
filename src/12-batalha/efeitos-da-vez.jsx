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
const FX_DURACAO_MS = 2200;   // o efeito mais longo (a morte, o desmaio) cabe aqui
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
   e a de agora (quem caiu, quem chegou, quem se curou). Puro.

   17/11/2026 — o catálogo aprovado (efeitos-catalogo.jsx) distingue o que o
   alvo fez com o golpe. O log traz, por alvo, `fx_alvos[chave]` (gravado por
   fxDoGolpeNoAlvo em batalha.jsx): esquivou, a defesa que reduziu (aparar,
   desviar, escudo), quanto saiu da EH e da EF, se a armadura ou uma proteção
   segurou tudo e que peça quebrou. Entrada antiga, sem o campo, toca como
   antes: o golpe e o número. */
const GOLPES = { CORTE: 'corte', PERFURACAO: 'perfuracao', ESMAGAMENTO: 'esmagamento', DESARMADO: 'desarmado' };
const ELEMENTOS_FX = ['fogo', 'agua', 'ar', 'terra', 'celestial', 'infernal'];
/* O desenho de cada magia. O ELEMENTO do jogo continua sendo um dos seis
   (decisão de 12/09/2026, magias-efeito.jsx); isto é só a imagem: Dardos de
   Gelo é dano de água, mas a mesa vê gelo; Relâmpago é ar, mas a mesa vê o
   raio. Magia fora da lista usa a imagem do elemento; sem elemento, arcano. */
const VISUAL_DO_ELEMENTO = { fogo: 'fogo', agua: 'agua', ar: 'vento', terra: 'terra', celestial: 'celestial', luz: 'celestial', infernal: 'infernal' };
const VISUAL_DA_MAGIA = {
  dardos_de_gelo: 'gelo',
  aeroataque: 'vento', aeromanipulacao: 'vento',
  raio_eletrico: 'raio', relampago: 'raio',
  bastao_de_luz: 'luz', dardos_de_luz: 'luz', lamina_de_luz: 'luz', fotoataque: 'luz', fotomanipulacao: 'luz', verdade_ofuscante: 'luz',
  nictoataque: 'trevas', nictomanipulacao: 'trevas', degeneracao_fisica: 'trevas',
  nevoa_caustica: 'veneno', putrefacao: 'veneno', carne_em_vermes: 'veneno',
  covardia: 'mente', terror_fantasma: 'mente', paradoxo: 'mente', narrativa_real: 'mente', cancao_do_tormento: 'mente',
  armadilha_natural: 'natureza', auxilio_natural: 'natureza', enxame_de_espinhos: 'natureza',
  elo_vital: 'dreno', toque_gelido: 'dreno',
  garras: 'garra',
};
/* Arma natural de criatura (Presas, Garras…: itens do catálogo como as
   outras armas) risca como garra. O projétil usa a perfuração (usuário,
   17/11/2026), que já vem do grupo da arma. */
const RE_ARMA_NATURAL = /\b(garras?|presas?|mordidas?|unhas?)\b/i;

function visualDaMagia(e) {
  return VISUAL_DA_MAGIA[e.magia_key] || VISUAL_DO_ELEMENTO[e.elemento] || 'arcano';
}
function varianteDoGolpe(e) {
  if (RE_ARMA_NATURAL.test(String(e.arma_nome || ''))) return 'garra';
  return GOLPES[e.golpe_tipo] || 'corte';
}
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
function derrubado(v) {
  if (!v) return false;
  if (v.status === 'caido') return true;
  return Array.isArray(v.status_temp) && v.status_temp.some((s) => s && s.efeito && s.efeito.tipo === 'derrubado');
}
/* Um golpe (arma ou magia) num alvo, com o desfecho do log quando há. */
function efeitoDoGolpe(base, e, ch, k, autor, erro) {
  const det = (e.fx_alvos && e.fx_alvos[ch]) || null;
  if (det && det.esquivou) return [{ tipo: 'esquiva', alvo: ch, autor }];
  const um = { ...base, alvo: ch, autor, erro, critico: !!e.critico && k === 0, valor: null };
  if (det && !erro) {
    const perdeu = (Number(det.eh) || 0) + (Number(det.ef) || 0);
    um.valor = perdeu > 0 ? perdeu : null;
    if (det.segurou) um.pool = det.segurou === 'armadura' ? 'ar' : 'protecao';
    else if (Number(det.ef) > 0) { um.pool = 'ef'; if (Number(det.eh) > 0) um.furou_eh = true; }
    else if (Number(det.eh) > 0) um.pool = 'eh';
    if (det.defesa) um.defesa = det.defesa;
  } else if (!erro && k === 0 && Number(e.dano) > 0) um.valor = Number(e.dano);
  const out = [um];
  if (det && Array.isArray(det.quebrou)) det.quebrou.forEach((nome) => out.push({ tipo: 'quebrou', alvo: ch, nome }));
  return out;
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
      // Falha crítica: o golpe volta contra quem atacou (dano_self no log).
      if (e.resultado === 'FC' && autor) {
        fx.push({ tipo: 'falha_critica', alvo: alvo || autor, autor, valor: Number(e.dano_self) > 0 ? Number(e.dano_self) : null });
        return;
      }
      const erro = errou(e);
      const visual = e.acao === 'magia' ? visualDaMagia(e) : null;
      const base = (e.acao === 'arma' || visual === 'garra')
        ? { tipo: 'golpe', variante: visual === 'garra' ? 'garra' : varianteDoGolpe(e) }
        : { tipo: 'magia', elemento: ELEMENTOS_FX.includes(e.elemento) ? e.elemento : 'arcano', visual };
      [alvo, ...extras].filter(Boolean).forEach((ch, k) => {
        efeitoDoGolpe(base, e, ch, k, autor, erro).forEach((f) => fx.push(f));
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
      if (e.resistiu) { fx.push({ tipo: 'resistiu', alvo, autor: autor !== alvo ? autor : null }); return; }
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
    if (e.acao === 'teste') {
      if (!autor) return;
      const furia = /f[uú]ria/i.test(String(e.chave || '') + ' ' + String(e.nome || ''));
      fx.push({ tipo: furia ? 'furia' : 'tecnica', alvo: autor, nome: e.nome || null });
      return;
    }
    // O veneno e o sangramento cobrando na virada da rodada (fx_virada).
    if (e.acao === 'sistema' && Array.isArray(e.fx_virada)) {
      e.fx_virada.forEach((v) => {
        const ch = v && (v.inst_id || (v.tipo + ':' + v.ref_id));
        if (ch && Number(v.total) > 0) fx.push({ tipo: v.sangra ? 'sangramento' : 'veneno_tick', alvo: ch, valor: Number(v.total) });
      });
    }
  });
  // Quem chegou (invocado, convocado), quem caiu e quem foi ao chão.
  depois.forEach((d) => {
    const a = vAntes.get(d.chave);
    if (!a) { if (antes.length) fx.push({ tipo: 'invocacao', alvo: d.chave }); return; }
    const caiu = (a.status || 'ativo') === 'ativo' && (d.status === 'morto' || d.status === 'desmaiado');
    if (caiu) fx.push({ tipo: 'queda', alvo: d.chave, morto: d.status === 'morto' });
    else if (derrubado(d) && !derrubado(a)) fx.push({ tipo: 'caido', alvo: d.chave });
  });
  return fx.slice(0, FX_MAX);
}

/* ── O tocador ─────────────────────────────────────────────────────
   Uma camada fixa sobre a tela; cada efeito nasce no centro do avatar do
   alvo (o token marca `data-fx-chave`). Sem o token à vista (batalha sem
   tabuleiro, alvo fora da tela), o efeito sai no meio da tela. O desenho
   mora em efeitos-catalogo.jsx (tocarEfeitoFx). */
const BATALHAS_COM_CORTINA = (typeof window !== 'undefined')
  ? (window.__menestrelCortinas = window.__menestrelCortinas || new Set())
  : new Set();

function tokenDoAlvo(chave) {
  if (typeof document === 'undefined' || !chave) return null;
  try { return document.querySelector('[data-fx-chave="' + String(chave).replace(/"/g, '\\"') + '"]'); } catch (e) { return null; }
}
function rectDoAlvo(chave) {
  const el = tokenDoAlvo(chave);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, tam: r.width };
}
function camadaDosEfeitos() {
  let c = document.querySelector('body > .fx-camada');
  if (!c) {
    c = document.createElement('div');
    c.className = 'fx-camada';
    c.setAttribute('aria-hidden', 'true');
    document.body.appendChild(c);
  }
  return c;
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

/* O texto mínimo de um efeito — o que sobra sem o catálogo carregado. */
function textoDoValor(f, isEn) {
  if (f.tipo === 'golpe' || f.tipo === 'magia') {
    if (f.erro) return isEn ? 'Miss' : 'Errou';
    if (f.pool === 'ar' || f.pool === 'protecao') return '0';
    return f.valor != null ? '−' + f.valor : null;
  }
  if ((f.tipo === 'cura' || f.tipo === 'item') && f.valor) return '+' + f.valor;
  if (f.tipo === 'resistiu') return isEn ? 'Resisted' : 'Resistiu';
  if (f.tipo === 'esquiva') return isEn ? 'Dodged' : 'Esquivou';
  if (f.tipo === 'queda') return f.morto ? (isEn ? 'Dead' : 'Morto') : (isEn ? 'Down' : 'Desmaiado');
  if ((f.tipo === 'veneno_tick' || f.tipo === 'sangramento' || f.tipo === 'falha_critica') && f.valor) return '−' + f.valor;
  return null;
}

function classeDoEfeito(f) {
  const c = ['fx'];
  if (f.tipo === 'magia') { c.push('fx--' + f.elemento); if (f.visual && f.visual !== f.elemento) c.push('fx--' + f.visual); }
  else if (f.tipo === 'golpe') c.push('fx--golpe', 'fx--golpe-' + f.variante);
  else c.push('fx--' + f.tipo);
  if (f.erro) c.push('is-erro');
  if (f.critico) c.push('is-critico');
  return c.join(' ');
}

/* Toca um efeito: um invólucro `.fx` na camada, com o desenho do catálogo
   dentro, removido inteiro quando o efeito termina. */
function tocarUmEfeito(f, isEn, semMovimento) {
  const camada = camadaDosEfeitos();
  const fxEl = document.createElement('div');
  fxEl.className = classeDoEfeito(f);
  camada.appendChild(fxEl);
  const tocar = typeof tocarEfeitoFx === 'function' ? tocarEfeitoFx : window.tocarEfeitoFx;
  if (typeof tocar === 'function') {
    tocar(f, { layer: fxEl, isEn, reduzido: semMovimento, centro: rectDoAlvo, token: tokenDoAlvo });
  } else {
    const valor = textoDoValor(f, isEn);
    const r = rectDoAlvo(f.alvo) || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    if (valor) {
      const b = document.createElement('b');
      b.className = 'fx-valor';
      b.style.left = r.x + 'px'; b.style.top = (r.y - 64) + 'px';
      b.textContent = valor;
      fxEl.appendChild(b);
    }
  }
  return fxEl;
}

/* A tela que monta a batalha põe isto uma vez. `cortina` vem da linha da
   batalha; os efeitos tocam quando `cortina.revelado.n` muda (abrir a tela
   com uma revelação antiga não toca nada). Também avisa o 10-shell, que
   segura as notificações da batalha até aqui (ver o card da mesa). */
function EfeitosDaVez({ batalhaId, cortina, log, isEn, seguraCards = true }) {
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
        const el = tocarUmEfeito(f, isEn, semMovimento);
        timers.current.push(setTimeout(() => el.remove(), FX_DURACAO_MS));
      }, i * FX_INTERVALO_MS));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  return null;
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
