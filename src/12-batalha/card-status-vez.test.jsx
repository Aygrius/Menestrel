/* ============================================================
   card-status-vez.test.jsx — vez no topo, estado na linha das pools,
   contador de rodadas em anel azul, modal de Sangrando enxuto
   ============================================================
   "Remova a mensagem 'Seu status: Desistiu' do jogador, e o status de quem é
    a vez fica em um lugar só, no topo. No tooltip de armadura, mude de 'Leve'
    para 'Armadura Leve'. O botão de Status deve ficar inline com EF, EH, etc,
    por último. Melhore o modal 'sangrando', etc: Remova o nome do jogador,
    remova o '21 no total (7 × 3)', e o título dos inputs deve ter a primeira
    letra maiúscula. O contador de rodadas do efeito será a borda azul igual
    dos outros botões. O ícone de ações usa ti-sword." (usuário, 14/09/2026)
   ============================================================ */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';
import { fakeSupabase } from '../test/fake-supabase.js';

const stubOriginal = globalThis.supabaseClient;
afterEach(() => { cleanup(); globalThis.supabaseClient = stubOriginal; });

const EU = 64;
const lutador = (over) => ({
  tipo: 'pj', ref_id: EU, inst_id: 'eu', nome: 'Yuldrous', ordem: 1,
  status: 'ativo', atual: true, vb: 20, pa_max: 2, pa_rest: 2,
  mov_rest: 5, moveu_na_rodada: false, pos: { x: 10, y: 10 },
  ef: 10, ef_max: 10, eh: 5, eh_max: 5, ar: 0, ar_max: 0, karma: 0, karma_max: 0,
  status_temp: [], ...over,
});
const outro = (over) => lutador({ ref_id: 99, inst_id: 'outro', nome: 'Aliado', ordem: 2, atual: false, pos: { x: 20, y: 10 }, ...over });

function montar(parts) {
  globalThis.supabaseClient = fakeSupabase({
    personagens: [], itens: [], magias: [], tecnicas: [], habilidades: [], criaturas: [],
  });
  return render(React.createElement(window.BatalhaJogadorView, {
    batalha: { id: 1, estado: 'ativa', rodada: 3, historia_id: 9, participantes: parts, log: [], rolagem_pendente: null },
    pjAtivoId: EU, lang: 'pt', onVoltar: () => {},
  }));
}
const pronto = (container) => waitFor(() => expect(container.querySelector('.batalha-token')).toBeTruthy());

describe('de quem é a vez: um lugar só, no topo', () => {
  it('na minha vez, uma mensagem só, antes do tabuleiro', async () => {
    const { container } = montar([lutador(), outro()]);
    await pronto(container);
    const msgs = container.querySelectorAll('.batalha-vez-msg');
    expect(msgs).toHaveLength(1);
    expect(msgs[0].textContent).toMatch(/É a sua vez/);
    expect(msgs[0].compareDocumentPosition(container.querySelector('.batalha-tabuleiro, .batalha-token'))
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('quem desistiu não vê "Seu status: Desistiu" — o topo diz de quem é a vez', async () => {
    const { container } = montar([lutador({ status: 'desistiu', atual: false }), outro({ atual: true })]);
    await pronto(container);
    expect(container.textContent).not.toMatch(/Seu status/);
    expect(container.querySelector('.batalha-status-inativo')).toBeNull();
    const msgs = container.querySelectorAll('.batalha-vez-msg');
    expect(msgs).toHaveLength(1);
    expect(msgs[0].textContent).toMatch(/Aliado/);
  });
});

describe('contador de rodadas do efeito', () => {
  it('é um círculo com anel azul que encolhe conforme as rodadas passam', async () => {
    const M = window.MotorBatalha;
    const [depois] = M.decrementarStatusTemp([{ id: 'sangramento:1', nome: 'Sangrando', rodadas_rest: 4 }]);
    expect(depois).toMatchObject({ rodadas_rest: 3, rodadas_total: 4 });
    const { container } = montar([lutador({ status_temp: [depois] })]);
    await pronto(container);
    container.querySelector('.batalha-token').click();
    await waitFor(() => expect(document.querySelector('.batalha-token-menu')).toBeTruthy());
    // "o botão de status tenha a borda azul, sem um badge extra" (14/09/2026)
    const botao = document.querySelector('.batalha-card-pools-nome .batalha-efeito-botao');
    expect(botao.querySelector('svg .batalha-efeito-anel-nivel')).toBeTruthy();
    expect(botao.querySelector('i').className).toContain('ti-droplet');
    expect(botao.textContent.trim()).toBe('');
    expect(botao.getAttribute('data-pct')).toBe('75');
    expect(botao.getAttribute('aria-label')).toMatch(/Sangrando · 3/);
    // O botão de estado continua por último na linha — aqui é o próprio PJ,
    // sem estado; o efeito vem depois das pools.
    expect(document.querySelector('.batalha-status-chip-rod')).toBeNull();
  });

  it('efeito até o fim da batalha: anel cheio', async () => {
    const { container } = montar([lutador({ status_temp: [{ id: 'fc_defesa', nome: 'Defesa −5', rodadas_rest: null }] })]);
    await pronto(container);
    container.querySelector('.batalha-token').click();
    await waitFor(() => expect(document.querySelector('.batalha-status-chip')).toBeTruthy());
    expect(document.querySelector('.batalha-efeito-botao').getAttribute('data-pct')).toBe('100');
  });

  it('no card de outro combatente, o efeito vem antes do estado, que fica por último', async () => {
    const { container } = montar([lutador(), outro({ status_temp: [{ id: 'sangramento:1', nome: 'Sangrando', rodadas_rest: 2 }] })]);
    await pronto(container);
    [...container.querySelectorAll('.batalha-token')].find((t) => t.textContent.includes('Aliado')).click();
    await waitFor(() => expect(document.querySelector('.batalha-token-menu')).toBeTruthy());
    const linha = document.querySelector('.batalha-card-pools-nome');
    expect(linha.querySelector('.batalha-efeito-botao')).toBeTruthy();
    expect(linha.lastElementChild.classList.contains('batalha-stat-estado')).toBe(true);
  });
});

describe('card', () => {
  it('o botão Ação usa ti-sword', async () => {
    const { container } = montar([lutador()]);
    await pronto(container);
    container.querySelector('.batalha-token').click();
    await waitFor(() => expect(document.querySelector('.batalha-token-menu')).toBeTruthy());
    const acao = [...document.querySelectorAll('.batalha-card-botoes button')]
      .find((b) => b.getAttribute('aria-label') === 'Ação');
    expect(acao.querySelector('i').className).toContain('ti-sword');
    expect(acao.querySelector('i').className).not.toContain('ti-swords');
  });

  it('o próprio card diz só "Você"', async () => {
    const { container } = montar([lutador({ nome: "Lirael Vel'Thalas" })]);
    await pronto(container);
    container.querySelector('.batalha-token').click();
    await waitFor(() => expect(document.querySelector('.batalha-token-menu')).toBeTruthy());
    expect(document.querySelector('.batalha-token-menu .batalha-fighter-nome').textContent).toBe('Você');
  });

  it('no inimigo, na minha vez: um botão "Atacar" na linha do nome, sem números dele', async () => {
    globalThis.supabaseClient = fakeSupabase({
      personagens: [{
        id: EU, nome: 'Yuldrous', raca: 'Anão', profissao: 'Guerreiro', experiencia: 40,
        forca_base: 2, fisico_base: 2, agilidade_base: 2, percepcao_base: 1, intelecto_base: 1, aura_base: 1, carisma_base: 0,
        habilidades: {}, habilidades_bonus: {}, magias: {}, tecnicas: {}, aprimoramentos: {}, caracterizacao: {}, grupos_armas: {},
        estado_atual: {}, inventario: { itens: [{ instanceId: 'e1', slug: 'espada', slot: 'mao_d', equipado: true, quantidade: 1 }] },
      }],
      itens: [{ slug: 'espada', nome: 'Espada', categoria_equip: 'arma', dano: 6, dano_l: 0, dano_m: 0, dano_p: 0, alcance: 0 }],
      magias: [], tecnicas: [], habilidades: [], criaturas: [],
    });
    const inimigo = { tipo: 'criatura', ref_id: 5, inst_id: 'cri', nome: 'Lobo', ordem: 2, status: 'ativo', atual: false,
      vb: 30, pa_max: 1, pa_rest: 1, ef: 10, ef_max: 10, eh: 0, eh_max: 0, ar: 2, ar_max: 2,
      defesa_sigla: 'L', defesa_valor: 3, status_temp: [], pos: { x: 11, y: 10 } };
    const { container } = render(React.createElement(window.BatalhaJogadorView, {
      batalha: { id: 1, estado: 'ativa', rodada: 1, historia_id: 9, participantes: [lutador(), inimigo], log: [], rolagem_pendente: null },
      pjAtivoId: EU, lang: 'pt', onVoltar: () => {},
    }));
    await pronto(container);
    [...container.querySelectorAll('.batalha-token')].find((t) => t.textContent.includes('Lobo')).click();
    await waitFor(() => expect(document.querySelector('.batalha-token-menu')).toBeTruthy());
    const menu = document.querySelector('.batalha-token-menu');
    await waitFor(() => expect(menu.querySelector('.batalha-fighter-head .batalha-head-acoes')).toBeTruthy());
    const botoes = [...menu.querySelectorAll('.batalha-head-acoes button')].map((b) => b.getAttribute('aria-label'));
    expect(botoes).toEqual(['Atacar']);
    expect(menu.querySelectorAll('.batalha-stat-num')).toHaveLength(0);
  });

  const fonte = readFileSync(resolve(__dirname, 'batalha.jsx'), 'utf8');

  it('Mestre: o EstadoDrop vem por último dentro da linha das pools', () => {
    const ini = fonte.indexOf('<span className="batalha-card-pools-nome">');
    const fim = fonte.indexOf('</span>', fonte.indexOf('<EstadoDrop', ini));
    const trecho = fonte.slice(ini, fim);
    expect(trecho).toContain('<EstadoDrop');
    expect(trecho.indexOf('<PoolBotao')).toBeLessThan(trecho.indexOf('<EstadoDrop'));
    expect(fonte).not.toContain('icone="ti-swords" variante="primary"');
  });

  it('modal Sangrando/Envenenado/Caído: sem nome, sem total, campos "Dano" e "Rodadas"', () => {
    const ini = fonte.indexOf('{venenoOpen && (() => {');
    const trecho = fonte.slice(ini, fonte.indexOf('</ModalShell>', ini));
    expect(trecho).not.toContain('venenoOpen.nome');
    expect(trecho).not.toContain('<p className="batalha-modal-total"');
    expect(trecho).not.toContain('tb.danoRodada');
    expect(trecho).toContain("isEn ? 'Damage' : 'Dano'");
    expect(trecho).toContain('primeiraMaiuscula(tb.rodadas)');
  });
});
