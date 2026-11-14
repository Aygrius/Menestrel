/* ============================================================
   pilha-dividida-estado.test.jsx — auditoria 13/11/2026, item 36
   ============================================================
   Dividir a pilha (guardar parte, equipar, vestir, montar, pôr no animal)
   criava a unidade nova só com slug/quantidade/observação: a parte que saía
   perdia o bônus, o desgaste e o veneno. Agora leva o estado da original.
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
  bolsa: { slug: 'bolsa', nome: 'Bolsa', grupo: 'Recipientes', tipo: 'S', armazena: 2, ocupa: 1 },
  adaga: { slug: 'adaga', nome: 'Adaga', grupo: 'Armas', tipo: 'S', ocupa: 1 },
  cavalo: { slug: 'cavalo', nome: 'Cavalo', grupo: 'Transportes', criatura_id: 9, ocupa: 0 },
  corda: { slug: 'corda', nome: 'Corda', grupo: 'Equipamentos', tipo: 'S', ocupa: 1 },
};
const it_ = (instanceId, slug, extra) => ({ instanceId, slug, quantidade: 1, containerId: null, equipado: false, slot: null, ...extra });
const ESTADO = { bonus: 3, res: 2, veneno: { slug: 'secrecao_blueta', ef: 5, acoes: 9 } };

describe('estadoDaPilha', () => {
  it('copia o estado, não o lugar, a identidade nem o anúncio', () => {
    const e = window.estadoDaPilha(it_('a', 'adaga', { ...ESTADO, casa: 3, anuncio_id: 7, containerId: 'x', quantidade: 4 }));
    expect(e).toEqual(ESTADO);
  });
});

describe('a parte que sai leva o estado', () => {
  it('guardar parte na bolsa (só cabem 2 de 4)', () => {
    const r = window.guardarNoRecipiente([it_('b', 'bolsa'), it_('a', 'adaga', { quantidade: 4, ...ESTADO })], 'a', 'b', CAT);
    expect(r.ok).toBe(true);
    const guardada = r.itens.find((x) => x.slug === 'adaga' && x.containerId === 'b');
    expect(guardada).toMatchObject({ quantidade: 2, ...ESTADO });
  });
  it('pôr uma no animal', () => {
    const r = window.equiparNoAnimal([it_('cav', 'cavalo'), it_('c', 'corda', { quantidade: 3, res: 1 })], 'c', 'cav', CAT, { subtipo: null }, () => 'nova');
    expect(r.ok).toBe(true);
    expect(r.itens.find((x) => x.instanceId === 'nova')).toMatchObject({ animal_id: 'cav', res: 1 });
  });
  it('equipar, vestir, montar e mover (dentro do componente) usam a mesma cópia', () => {
    const fonte = fs.readFileSync(path.resolve(__dirname, 'inventario.jsx'), 'utf8');
    expect((fonte.match(/\.\.\.estadoDaPilha\(it\), instanceId: resultId/g) || []).length).toBe(3);
    expect(fonte).toMatch(/\.\.\.estadoDaPilha\(it\),\s+\/\/ a parte que sai leva o estado \(item 36\)\s+instanceId: novoInstanceId\(\)/);
  });
});
