/* ============================================================
   casa-endereco.test.jsx — auditoria 13/11/2026, item 34
   ============================================================
   A regra de endereço da Casa (acessoAPropriedade) existia, mas a tela nunca
   passava a localização do personagem: a casa em Tronum abria para quem
   estava em Farzelo. Agora o inventário passa `personagens.localizacao`.
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
  casa:  { slug: 'casa', nome: 'Casa', grupo: 'Propriedades', tipo: 'S', armazena: 200, ocupa: 0 },
  pocao: { slug: 'pocao', nome: 'Poção', grupo: 'Consumíveis', tipo: 'S', ocupa: 0.5 },
};
const it_ = (instanceId, slug, extra) => ({ instanceId, slug, quantidade: 1, containerId: null, equipado: false, slot: null, ...extra });
const itens = [it_('c', 'casa', { cidade: 'Tronum' }), it_('p', 'pocao')];

describe('guardar na Casa depende de onde o personagem está', () => {
  it('na mesma cidade (acento e caixa não importam): guarda', () => {
    expect(window.guardarNoRecipiente(itens, 'p', 'c', CAT, 'tronum').ok).toBe(true);
  });
  it('em outra cidade: recusa, dizendo onde a Casa fica', () => {
    expect(window.guardarNoRecipiente(itens, 'p', 'c', CAT, 'Farzelo'))
      .toMatchObject({ ok: false, motivo: 'propriedade_longe', cidade: 'Tronum', porque: 'outra_cidade' });
  });
  it('sem localização: fechada', () => {
    expect(window.guardarNoRecipiente(itens, 'p', 'c', CAT, '')).toMatchObject({ ok: false, porque: 'sem_local' });
  });
});

describe('a tela passa a localização (fonte)', () => {
  const fonte = fs.readFileSync(path.resolve(__dirname, 'inventario.jsx'), 'utf8');
  it('lê a coluna e a passa nos dois caminhos de guardar', () => {
    expect(fonte).toMatch(/const PJ_COLS = '[^']*,localizacao'/);
    expect(fonte).toMatch(/guardarNoRecipiente\(inv\.itens, instanceId, containerId, catalogoBySlug, localDoPj\)/);
    expect(fonte).toMatch(/podeMoverParaContainer\(itemCat, c, it, inv\.itens, catalogoBySlug, localDoPj\)/);
  });
});
