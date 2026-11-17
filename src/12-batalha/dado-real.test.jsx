/* ============================================================
   dado-real.test.jsx — jogar com dado real (17/11/2026)
   ============================================================
   Usuário: "Adicione no tabuleiro de batalha a opção para jogar usando dados
   reais. Apenas o mestre habilita essa função, a batalha toda funciona com
   dado real, ou dado virtual. A diferença é que ao clicar na rolagem, abrirá
   um modal pedindo para inserir o valor. E o próprio jogador informa o valor."
   ============================================================ */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
// O dado do app (o mesmo que a mesa usa; o inline de batalha.jsx é só reserva).
import '../02-shell/dado-d20.jsx';
import './batalha.jsx';

const W = window;
const aqui = dirname(fileURLToPath(import.meta.url));
const fonte = readFileSync(resolve(aqui, 'batalha.jsx'), 'utf8');
const sql = readFileSync(resolve(aqui, '../../scripts/sql/batalha-dados-reais-2026-11-17.sql'), 'utf8');

afterEach(() => { cleanup(); vi.useRealTimers(); document.querySelectorAll('.raiz-teste').forEach((n) => n.remove()); });

/* O DadoOverlay sai por portal no primeiro .menestrel-ui da página. No app ele
   existe antes da janela abrir; aqui também, senão o portal troca de destino
   na segunda renderização e remonta o dado no meio da rolagem. */
const overlay = (dadosReais, props = {}) => {
  const raiz = document.createElement('div');
  raiz.className = 'menestrel-ui raiz-teste';
  document.body.appendChild(raiz);
  const onRolou = vi.fn();
  render(
    <W.DadosReaisCtx.Provider value={dadosReais}>
      <W.DadoOverlay titulo="Espada → Orc" coluna={3} lang="pt" onFechar={() => {}}
        onRolou={onRolou} onConfirmar={() => {}} {...props} />
    </W.DadosReaisCtx.Provider>,
  );
  return onRolou;
};

describe('a janela do d20 com dado real', () => {
  it('não rola sozinha: pede o número que caiu', () => {
    vi.useFakeTimers();
    const onRolou = overlay(true);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onRolou).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Quanto caiu no d20?')).toBeTruthy();
  });

  it('assenta no número informado e segue o caminho de sempre', () => {
    vi.useFakeTimers();
    const onRolou = overlay(true);
    const campo = screen.getByLabelText('Quanto caiu no d20?');
    fireEvent.change(campo, { target: { value: '17' } });
    fireEvent.click(screen.getByRole('button', { name: 'Informar' }));
    act(() => { vi.advanceTimersByTime(2000); });
    expect(onRolou).toHaveBeenCalledTimes(1);
    expect(onRolou.mock.calls[0][0].valor).toBe(17);
  });

  it('fora de 1 a 20 não informa', () => {
    overlay(true);
    fireEvent.change(screen.getByLabelText('Quanto caiu no d20?'), { target: { value: '25' } });
    expect(screen.getByRole('button', { name: 'Informar' }).disabled).toBe(true);
    expect(screen.getByRole('alert').textContent).toMatch(/1 a 20/);
  });

  it('dado virtual (ou modo automático): rola sozinha, sem campo', () => {
    vi.useFakeTimers();
    const onRolou = overlay(false);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onRolou).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Quanto caiu no d20?')).toBeNull();
    cleanup();
    const onAuto = overlay(true, { dadoVirtual: true });
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onAuto).toHaveBeenCalledTimes(1);
  });
});

describe('o modo é da batalha, e só o Mestre troca', () => {
  it('coluna dados_reais e o botão no trilho do Mestre', () => {
    expect(sql).toMatch(/add column if not exists dados_reais boolean not null default false/);
    expect(fonte).toMatch(/update\(\{ dados_reais: novo \}\)/);
    expect(fonte).toMatch(/data-acao="dados-reais"/);
  });
  it('as duas telas da luta fornecem o modo', () => {
    expect(fonte).toMatch(/<DadosReaisCtx\.Provider value=\{dadosReais\}>/);
    expect(fonte).toMatch(/<DadosReaisCtx\.Provider value=\{!!batalha\.dados_reais\}>/);
  });
  it('o d10 da iniciativa: o jogador informa e o servidor confere 1..10', () => {
    expect(sql).toMatch(/p_valor < 1 or p_valor > 10/);
    expect(fonte).toMatch(/p_valor: informado/);
    expect(fonte).toMatch(/if \(dadosReais\) \{ setIniReal\(/);
  });
});

/* 17/11/2026, usuário: "Rolar novamente, quando o resultado é crítico, não é
   uma escolha. É consequência. Mas o jogador deve clicar para rolar." */
describe('o dado do crítico: obrigatório, e só no clique', () => {
  it('abre parado, sem Cancelar; rola quando o jogador clica', () => {
    vi.useFakeTimers();
    const onRolou = overlay(false, { isCritico: true, tipoCritico: 'alvo' });
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onRolou).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Rolar novamente/ }));
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onRolou).toHaveBeenCalledTimes(1);
  });
  it('o Esc não fecha a janela do crítico', () => {
    const onFechar = vi.fn();
    overlay(false, { isCritico: true, tipoCritico: 'alvo', onFechar });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onFechar).not.toHaveBeenCalled();
  });
  it('no modo automático o crítico segue rolando sozinho', () => {
    vi.useFakeTimers();
    const onRolou = overlay(false, { isCritico: true, tipoCritico: 'alvo', dadoVirtual: true });
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onRolou).toHaveBeenCalledTimes(1);
  });
});

describe('o dado do crítico em série: Épico e Catástrofe (só o texto)', () => {
  const rolarCrit = (tipo, aleatorio) => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(aleatorio);
    overlay(false, { isCritico: true, tipoCritico: tipo });
    fireEvent.click(screen.getByRole('button', { name: /Rolar novamente/ }));
    act(() => { vi.advanceTimersByTime(3000); });
  };
  afterEach(() => { vi.restoreAllMocks(); });
  it('crítico no alvo e o dado do crítico em Absurdo: Épico', () => {
    rolarCrit('alvo', 0.99);
    expect(document.body.textContent).toMatch(/Épico/);
  });
  it('falha crítica e o dado em Falha Crítica: Catástrofe', () => {
    rolarCrit('si', 0);
    expect(document.body.textContent).toMatch(/Catástrofe/);
  });
  it('fora da série, segue "Crítico"', () => {
    rolarCrit('alvo', 0.5);
    expect(document.body.textContent).toMatch(/Crítico/);
    expect(document.body.textContent).not.toMatch(/Épico/);
  });
});
