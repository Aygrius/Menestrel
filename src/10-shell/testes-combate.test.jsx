/* ============================================================
   testes-combate.test.jsx — a página "Testes de combate" do Mestre
   ============================================================
   Pedido do usuário em 06/11/2026: "Insira entre os menus Paleta e Imagens
   do mestre no menu principal, a página com os testes de combate."
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const shellFonte = readFileSync(resolve(aqui, 'shell.jsx'), 'utf8');
const mainFonte = readFileSync(resolve(aqui, '../main.tsx'), 'utf8');

beforeAll(async () => {
  globalThis.supabaseClient = {
    from: () => { const b = { select: () => b, eq: () => b, order: () => b, then: (ok) => Promise.resolve({ data: [], error: null }).then(ok) }; return b; },
    rpc: async () => ({ data: [], error: null }),
    channel: () => { const ch = { on: () => ch, subscribe: () => ch }; return ch; },
    removeChannel: () => {},
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
  };
  await import('../01-core/copy.jsx');
  await import('../01-core/constants.jsx');
  await import('../01-core/helpers.jsx');
  await import('../01-core/inventario-helpers.jsx');
  await import('../01-core/bases-item.jsx');
  await import('../01-core/select-pill.jsx');
  await import('../01-core/clima-desgaste.jsx');
  await import('../01-core/game-data.jsx');
  await import('../01-core/forma-raca.jsx');
  await import('../01-core/tecnicas-efeito.jsx');
  await import('../01-core/magias-efeito.jsx');
  await import('../01-core/status-efeito.jsx');
  await import('../01-core/efeito-temporario.jsx');
  await import('../01-core/fabricacao.jsx');
  await import('../09-bestiario/criatura-formulas.jsx');
  await import('../12-batalha/batalha.jsx');
  await import('./shell.jsx');
  await import('./testes-combate.jsx');
});

afterEach(cleanup);

const abrir = () => render(<window.TestesCombateModal lang="pt" onClose={() => {}} />);

/* Nas Configurações (11/11/2026, usuário: "Os testes de combate, imagens e
   perfil também vão ficar dentro de configurações"). Só o Mestre vê. */
describe('a entrada nas Configurações', () => {
  const montarCfg = (profile, onTestesCombate) => render(<div id="root"><div className="menestrel-ui">
    <window.ConfiguracoesModal lang="pt" setLang={() => {}} paleta="couro" onSetPaleta={() => {}}
      modoNotificacao="visivel" onSetModoNotificacao={() => {}} profile={profile}
      onTestesCombate={onTestesCombate} onImagens={() => {}} onClose={() => {}} /></div></div>);
  it('o Mestre abre os testes por lá; o Jogador não vê a entrada', () => {
    const abrirTestes = vi.fn();
    montarCfg('master', abrirTestes);
    const linha = [...document.querySelectorAll('.cfg-linha')].find((l) => /Testes de combate/.test(l.textContent));
    fireEvent.click(linha.querySelector('button'));
    expect(abrirTestes).toHaveBeenCalled();
    cleanup();
    montarCfg('player', vi.fn());
    expect(document.body.textContent).not.toMatch(/Testes de combate/);
  });
  it('saiu do menu da conta; o modal é montado pelas Configurações, e o main carrega a página', () => {
    const menu = shellFonte.slice(shellFonte.indexOf('function UserMenu('), shellFonte.indexOf('function ConfiguracoesModal('));
    expect(menu).not.toMatch(/'Combat tests'/);
    expect(shellFonte).toMatch(/onTestesCombate=\{\(\) => setTestesCombateAberto\(true\)\}/);
    expect(shellFonte).toMatch(/testesCombateAberto && typeof TestesCombateModal !== 'undefined'/);
    expect(mainFonte.indexOf('10-shell/testes-combate.jsx')).toBeGreaterThan(mainFonte.indexOf('10-shell/shell.jsx'));
  });
});

describe('a página', () => {
  it('um passe por grupo de criaturas, com as 10 primeiras lutas', () => {
    abrir();
    expect(document.querySelectorAll('.tc-grupo')).toHaveLength(3);
    document.querySelectorAll('.tc-lutas').forEach((ol) => {
      expect(ol.querySelectorAll('.tc-luta')).toHaveLength(10);
    });
  });
  it('a porcentagem de vitórias sai dos dados, não de texto escrito à mão', () => {
    abrir();
    const c = window.TC_DADOS.cenarios[0];
    const passe = document.querySelectorAll('.tc-passe')[0];
    expect(passe.textContent).toContain(`${Math.round((100 * c.vit) / c.n)}%`);
  });
  it('a derrota acende em brasa; a vitória não', () => {
    abrir();
    const derrotas = window.TC_DADOS.cenarios.flatMap((c) => c.lutas).filter((l) => !l.v).length;
    expect(document.querySelectorAll('.tc-luta.is-derrota')).toHaveLength(derrotas);
  });
  it('o chip troca o grupo da tabela de combatentes', () => {
    abrir();
    const fracos = window.TC_DADOS.cenarios.find((c) => c.id === 'fracos');
    fireEvent.click(screen.getByRole('button', { name: 'Mais fracos' }));
    expect(screen.getByRole('button', { name: 'Mais fracos' }).getAttribute('aria-pressed')).toBe('true');
    fracos.comb.forEach((k) => expect(screen.getAllByText(k.nome).length).toBeGreaterThan(0));
  });
  it('coluna abaixo de −7 mostra a trava', () => {
    abrir();
    expect(screen.getAllByText(/→ −7/).length).toBeGreaterThan(0);
  });
});
