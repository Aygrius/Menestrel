/* ============================================================
   efeitos-da-vez.test.jsx — a aprovação do Mestre entre as vezes (10/11/2026)
   ============================================================
   Usuário: "Entre cada rodada da batalha, o mestre deverá aprovar a ação
   mudar de combatente, somente essa aprovação que vai aparecer o efeito do
   golpe ou magia." + "Crie um efeito para cada elemento." + "O mestre precisa
   ver a notificação da ação no combate antes dos jogadores, para poder narrar."
   ============================================================ */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import './efeitos-da-vez.jsx';

const MC = window.MotorCortina;

const orc = { tipo: 'criatura', ref_id: 1, inst_id: 'cri:1', nome: 'Orc', ef: 20, ef_max: 20, eh: 10, eh_max: 10, status: 'ativo', pos: { x: 1, y: 1 } };
const lira = { tipo: 'pj', ref_id: 7, inst_id: 'pj:7', nome: 'Lirael', ef: 15, ef_max: 15, eh: 30, eh_max: 30, status: 'ativo', pos: { x: 2, y: 1 } };
const mesa = (vez) => [{ ...lira, atual: vez === 'lira' }, { ...orc, atual: vez === 'orc' }];

describe('a cortina', () => {
  it('na vez aberta não espera; quando a vez muda, espera o Mestre', () => {
    const c = MC.abrirCortina(mesa('lira'), 1, [], null);
    expect(c).toMatchObject({ vez: '1:pj:7', nome: 'Lirael', log_desde: 0 });
    expect(MC.cortinaAguardando(c, mesa('lira'), 1)).toBe(false);
    expect(MC.cortinaAguardando(c, mesa('orc'), 1)).toBe(true);
    // A rodada virou e a vez voltou à mesma pessoa: também é outra vez.
    expect(MC.cortinaAguardando(c, mesa('lira'), 2)).toBe(true);
    expect(MC.cortinaAguardando(null, mesa('orc'), 1)).toBe(false);
  });
  it('revelar abre a vez nova e guarda o trecho do log e a mesa de antes', () => {
    const c = MC.abrirCortina(mesa('lira'), 1, [{ acao: 'x' }], null);
    const depois = mesa('orc').map((p) => (p.inst_id === 'cri:1' ? { ...p, ef: 8 } : p));
    const log = [{ acao: 'x' }, { acao: 'arma' }];
    const r = MC.revelarCortina(c, depois, 1, log);
    expect(r.vez).toBe('1:cri:1');
    expect(r.revelado).toMatchObject({ n: 1, de: 1, ate: 2 });
    expect(r.revelado.antes.find((v) => v.chave === 'cri:1').ef).toBe(20);
    expect(MC.cortinaAguardando(r, depois, 1)).toBe(false);
    expect(MC.revelarCortina(r, depois, 1, log).revelado.n).toBe(2);
  });
  it('o jogador vê os outros como estavam; a si mesmo, ao vivo; quem chegou depois, não', () => {
    const c = MC.abrirCortina(mesa('lira'), 1, [], null);
    const agora = [{ ...lira, atual: true, ef: 3 }, { ...orc, ef: 2, status: 'desmaiado', pos: { x: 5, y: 5 } },
      { tipo: 'criatura', ref_id: 9, inst_id: 'inv:9', nome: 'Enviado' }];
    const vis = MC.participantesNaCortina(agora, c, ['pj:7']);
    expect(vis[0].ef).toBe(3);
    expect(vis[1]).toMatchObject({ ef: 20, status: 'ativo', pos: { x: 5, y: 5 } });
    expect(vis[2].oculto_na_cortina).toBe(true);
  });
});

describe('os efeitos da revelação', () => {
  const antes = MC.vistaDaMesa(mesa('lira'));
  const rev = (log, depoisArr) => MC.efeitosDaRevelacao(log, { n: 1, de: 0, ate: log.length, antes }, MC.vistaDaMesa(depoisArr || mesa('orc')));

  it.each(['fogo', 'agua', 'ar', 'terra', 'celestial', 'infernal'])('magia de %s anima o elemento no alvo', (el) => {
    const [f] = rev([{ acao: 'magia', autor_inst_id: 'pj:7', alvo_inst_id: 'cri:1', elemento: el, resultado: 'M', dano: 9 }]);
    expect(f).toMatchObject({ tipo: 'magia', elemento: el, alvo: 'cri:1', valor: 9, erro: false });
    expect(MC.classeDoEfeito(f)).toContain('fx--' + el);
  });
  it('magia sem elemento é arcana; errou não mostra número', () => {
    const [f] = rev([{ acao: 'magia', alvo_inst_id: 'cri:1', resultado: 'R', dano: 0 }]);
    expect(f).toMatchObject({ elemento: 'arcano', erro: true, valor: null });
    expect(MC.textoDoValor(f, false)).toBe('Errou');
  });
  it('golpe de arma: o tipo do golpe, o crítico e os alvos extras', () => {
    const fx = rev([{ acao: 'arma', alvo_inst_id: 'cri:1', golpe_tipo: 'PERFURACAO', critico: true, dano: 14, alvos_extras_inst_ids: ['pj:7'] }]);
    expect(fx[0]).toMatchObject({ tipo: 'golpe', variante: 'perfuracao', critico: true, valor: 14 });
    expect(fx[1]).toMatchObject({ alvo: 'pj:7', critico: false });
    expect(MC.classeDoEfeito(fx[0])).toContain('is-critico');
  });
  it('entrada antiga sem inst_id acha o alvo por tipo e ref_id', () => {
    const [f] = rev([{ acao: 'arma', alvo_tipo: 'criatura', alvo_ref_id: 1, dano: 3, resultado: 'F' }]);
    expect(f.alvo).toBe('cri:1');
  });
  it('apoio: cura quando a energia sobe, bênção no aliado, maldição no inimigo', () => {
    const curado = mesa('orc').map((p) => (p.inst_id === 'pj:7' ? { ...p, ef: 15, eh: 34 } : p));
    expect(rev([{ acao: 'apoio', autor_inst_id: 'pj:7', alvo_tipo: 'pj', alvo_ref_id: 7 }], curado)[0]).toMatchObject({ tipo: 'cura', valor: 4 });
    expect(rev([{ acao: 'apoio', autor_tipo: 'pj', autor_ref_id: 7, alvo_tipo: 'pj', alvo_ref_id: 7 }])[0].tipo).toBe('bencao');
    expect(rev([{ acao: 'apoio', autor_tipo: 'pj', autor_ref_id: 7, alvo_tipo: 'criatura', alvo_ref_id: 1 }])[0].tipo).toBe('maldicao');
  });
  it('quem caiu e quem chegou também aparecem', () => {
    const depois = [...mesa('orc').map((p) => (p.inst_id === 'cri:1' ? { ...p, status: 'morto' } : p)),
      { tipo: 'criatura', ref_id: 9, inst_id: 'inv:9', nome: 'Enviado', status: 'ativo' }];
    const fx = rev([], depois);
    expect(fx).toEqual(expect.arrayContaining([
      expect.objectContaining({ tipo: 'queda', alvo: 'cri:1', morto: true }),
      expect.objectContaining({ tipo: 'invocacao', alvo: 'inv:9' }),
    ]));
  });
  it('o raio desce do alto da tela até o alvo', () => {
    const d = MC.caminhoDoRaio(200, 300, 7);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('L200.0 300.0')).toBe(true);
  });
});

describe('o tocador', () => {
  afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });
  const cortinaCom = (n, log) => ({ vez: '1:cri:1', log_desde: log.length, vista: MC.vistaDaMesa(mesa('orc')),
    revelado: n ? { n, de: 0, ate: log.length, antes: MC.vistaDaMesa(mesa('lira')) } : null });
  const log = [{ acao: 'magia', alvo_inst_id: 'cri:1', elemento: 'fogo', dano: 9, resultado: 'M' }];

  it('abrir a tela com uma revelação antiga não toca; a nova toca e avisa o shell', () => {
    vi.useFakeTimers();
    const avisos = [];
    const ouvir = (e) => avisos.push(e.detail);
    window.addEventListener('menestrel:revelacao', ouvir);
    const { rerender } = render(<window.EfeitosDaVez batalhaId={5} cortina={cortinaCom(1, log)} log={log} />);
    act(() => { vi.advanceTimersByTime(50); });
    expect(document.querySelector('.fx')).toBeNull();
    rerender(<window.EfeitosDaVez batalhaId={5} cortina={cortinaCom(2, log)} log={log} />);
    act(() => { vi.advanceTimersByTime(10); });
    expect(document.querySelector('.fx.fx--fogo')).not.toBeNull();
    expect(document.querySelector('.fx-valor').textContent).toBe('−9');
    expect(avisos).toContainEqual({ batalhaId: '5', intervalo: MC.FX_INTERVALO_MS });
    act(() => { vi.advanceTimersByTime(MC.FX_DURACAO_MS + 10); });
    expect(document.querySelector('.fx')).toBeNull();
    window.removeEventListener('menestrel:revelacao', ouvir);
  });
  it('a tela do jogador segura as notificações da batalha; a do Mestre, não', () => {
    const c = cortinaCom(1, log);
    const { unmount } = render(<window.EfeitosDaVez batalhaId={8} cortina={c} log={log} />);
    expect(window.__menestrelCortinas.has('8')).toBe(true);
    unmount();
    expect(window.__menestrelCortinas.has('8')).toBe(false);
    render(<window.EfeitosDaVez batalhaId={9} cortina={c} log={log} seguraCards={false} />);
    expect(window.__menestrelCortinas.has('9')).toBe(false);
  });
});
