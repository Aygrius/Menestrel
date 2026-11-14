/* ============================================================
   saque-sai-ao-guardar.test.jsx — auditoria 13/11/2026, item 32
   ============================================================
   A peça da casa de saque rápido guardada num recipiente (ou posta no animal)
   continuava com o `slot` do saque: aparecia nos dois lugares. Agora sai dele.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../01-core/select-pill.jsx';
import './inventario.jsx';

const CAT = {
  bolsa:  { slug: 'bolsa', nome: 'Bolsa', grupo: 'Recipientes', tipo: 'S', armazena: 10, ocupa: 1 },
  pocao:  { slug: 'pocao', nome: 'Poção', grupo: 'Consumíveis', tipo: 'S', ocupa: 0.5 },
  cavalo: { slug: 'cavalo', nome: 'Cavalo', grupo: 'Transportes', criatura_id: 9, ocupa: 0 },
};
const it_ = (instanceId, slug, extra) => ({ instanceId, slug, quantidade: 1, containerId: null, equipado: false, slot: null, ...extra });

describe('quem sai do saque rápido', () => {
  it('guardar no recipiente tira do saque', () => {
    const r = window.guardarNoRecipiente([it_('b', 'bolsa'), it_('p', 'pocao', { slot: 'saque_d' })], 'p', 'b', CAT);
    expect(r.ok).toBe(true);
    expect(r.itens.find((x) => x.instanceId === 'p')).toMatchObject({ containerId: 'b', slot: null });
  });
  it('pôr no animal tira do saque', () => {
    const r = window.equiparNoAnimal([it_('cav', 'cavalo'), it_('p', 'pocao', { slot: 'saque_e' })], 'p', 'cav', CAT, { subtipo: null }, () => 'novo');
    expect(r.ok).toBe(true);
    expect(r.itens.find((x) => x.animal_id === 'cav').slot).toBeNull();
  });
  it('moverParaContainer (dentro do componente) também limpa o saque', () => {
    const fonte = fs.readFileSync(path.resolve(__dirname, 'inventario.jsx'), 'utf8');
    expect(fonte).toMatch(/containerId: containerId \|\| null, \.\.\.\(containerId && ehSlotDeSaque\(it\.slot\) \? \{ slot: null \} : \{\}\)/);
  });
});
