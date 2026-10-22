/* ============================================================
   milagre-evocar.test.jsx — o Evocar de um milagre na ficha (22/10/2026)
   ============================================================
   "Um personagem vampiro, lobisomem ou sem religião não pode usar ou ser
   alvo de milagres." E a Escuridão (o Mago) não conjura. Fora da batalha,
   quem não pode usar vê o porquê e não evoca; quem não pode receber não
   aparece entre os alvos.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/select-pill.jsx';
import '../01-core/game-data.jsx';
import '../01-core/magias-efeito.jsx';
import '../10-shell/shell.jsx';
import '../09-bestiario/ataques-criatura.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../09-bestiario/conhecido-jogador.jsx';
import '../09-bestiario/catalogo-descritores.jsx';
import '../09-bestiario/catalogo-editor.jsx';
import '../09-bestiario/bestiario.jsx';
import './ficha.jsx';

let Modal;
beforeAll(() => { Modal = window.MagiaDetalhesModal; });
afterEach(cleanup);

const CURA = { key: 'curas_fisicas', nome: 'Curas Físicas', classe: 'Milagre', evocacao: 'Instantânea',
  alcance: 'Toque', duracao: 'Instantânea', descricao: 'Cura.', nivel_1: 'Cura 4 pontos.' };
const COLEGAS = [{ id: 2, nome: 'Bia', deus: null }, { id: 3, nome: 'Caio', deus: 'Lena' }];
const montar = (props = {}) => render(
  <div className="menestrel-ui">
    <Modal magia={CURA} passos={1} nivelMagiaEfetivoFn={() => 1}
      eu={{ id: 7, nome: 'Ana', profissao: 'Sacerdote', deus: 'Lena' }}
      colegas={COLEGAS} lang="pt" onClose={() => {}} onEvocar={() => {}} abrirTip={() => {}} fecharTip={() => {}} {...props} />
  </div>,
);
const nomesAlvos = () => [...document.querySelectorAll('.det-alvos .det-opt-card')].map((c) => c.textContent.trim());

describe('Evocar milagre', () => {
  it('colega sem religião não aparece como alvo', () => {
    montar();
    const nomes = nomesAlvos().join('|');
    expect(nomes).toMatch(/Ana/);
    expect(nomes).toMatch(/Caio/);
    expect(nomes).not.toMatch(/Bia/);
  });

  it('Mago não evoca milagre: aviso com o motivo e o duplo clique não evoca', () => {
    const onEvocar = vi.fn();
    montar({ eu: { id: 7, nome: 'Ana', profissao: 'Mago', deus: 'Lena' }, onEvocar });
    expect(document.body.textContent).toMatch(/A Escuridão não conjura milagres\./);
    const card = [...document.querySelectorAll('.det-alvos .det-opt-card')][0];
    if (card) { fireEvent.click(card); fireEvent.click(card); }
    expect(onEvocar).not.toHaveBeenCalled();
  });

  it('feitiço não liga para religião', () => {
    montar({ magia: { ...CURA, classe: 'Feitiço' } });
    expect(nomesAlvos().join('|')).toMatch(/Bia/);
  });
});

/* Revisão final (22/10/2026): a Ficha passava como `eu` só id, nome e foto —
   sem deus nem profissão, TODO milagre ficava bloqueado ("sem religião")
   para todo mundo. O teste trava o formato real que a Ficha entrega. */
import { readFileSync } from 'node:fs';
describe('a Ficha entrega o personagem inteiro à regra', () => {
  const fonte = readFileSync('src/11-ficha/ficha.jsx', 'utf8').replace(/\r\n/g, '\n');
  const i = fonte.indexOf('<MagiaDetalhesModal\n            ritual={ritual}');
  const bloco = fonte.slice(i, i + 1200);
  it('eu leva profissão, deus, sub-raça e estado', () => {
    expect(i).toBeGreaterThan(-1);
    expect(bloco).toMatch(/eu=\{\{[^}]*profissao: pj\.profissao[^}]*deus: pj\.deus[^}]*subraca: pj\.subraca[^}]*estado_atual: pj\.estado_atual/);
  });
  it('e a data do jogo, para a Licantropia vencida não contar', () => {
    expect(bloco).toMatch(/dataJogo=\{historiaPj\?\.data_jogo_atual\}/);
  });
});

/* "Transformado em Lobisomem, realmente a magia não vai funcionar nele."
   (usuário, 22/10/2026) — o colega que conjurou a própria Licantropia sai da
   lista de alvos de milagre. A lista de colegas traz as magias ativas dele
   (get_pjs_historia.magias_ativas). Depende da sub-raça (subracaEfetiva). */
describe('colega transformado', () => {
  it.skipIf(typeof window.subracaEfetiva !== 'function')('colega com Licantropia ativa não é alvo de milagre', () => {
    montar({ colegas: [{ id: 3, nome: 'Caio', deus: 'Lena', magias_ativas: [{ key: 'licantropia_lupina' }] }] });
    expect(nomesAlvos().join('|')).not.toMatch(/Caio/);
  });
});
