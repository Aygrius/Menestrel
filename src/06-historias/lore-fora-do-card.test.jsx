/* ============================================================
   lore-fora-do-card.test.jsx — o card de histórias perdeu o "Lore"
   ============================================================
   "No card de histórias, remova o botão de 'lore'." (usuário, 17/09/2026)

   O botão abria o GerenciarLoreView como PÁGINA sobre a lista de histórias.
   Ele ficou redundante em 17/09/2026, quando o Mestre ganhou as seções
   Lugares e NPCs na própria barra lateral (ADMIN_SECTIONS) — a MESMA tela,
   travada num tipo e lendo a mesa ativa, por um caminho de um clique em vez
   de três (Histórias → card da mesa → Lore).

   ⚠️ O que este teste protege de verdade: o botão levava a TRÊS abas, e a
   barra lateral só tem duas seções. A aba "Criatura" — disponibilizar
   criatura pra história — ficaria sem porta nenhuma. Ela não ficou: virou o
   botão de olho da tabela de Criaturas (09-bestiario, ver
   criatura-permissao-olho.test.jsx). Quem reabrir este assunto precisa saber
   que remover o botão e mover a função foram a mesma decisão, não duas.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './historias.jsx';

const aqui = dirname(fileURLToPath(import.meta.url));
const fonte = readFileSync(resolve(aqui, 'historias.jsx'), 'utf8');

let HistoriaCard;
beforeAll(() => {
  HistoriaCard = window.HistoriaCard;
  expect(HistoriaCard, 'HistoriaCard precisa estar no window').toBeTypeOf('function');
});
afterEach(cleanup);

const HISTORIA = {
  id: 13, titulo: 'As Marcas do Passado',
  protagonista_ids: [], estoque_loja: [], criatura_ids: [],
  npc_ids: [], reino_ids: [], cidade_ids: [], lore_acesso_pj: {},
};

const montar = (props = {}) => render(
  <div className="menestrel-ui">
    <HistoriaCard
      h={HISTORIA}
      personagens={[]}
      t={window.COPY.pt}
      lang="pt"
      onEdit={() => {}}
      onDelete={() => {}}
      onManageLoja={() => {}}
      onManageConvites={() => {}}
      onBatalhas={() => {}}
      {...props}
    />
  </div>
);

const botoes = () => [...document.querySelectorAll('.hist-card-actions button')]
  .map((b) => b.getAttribute('aria-label'));

describe('o botão saiu do card', () => {
  it('não há mais "Lore" entre as ações', () => {
    montar();
    expect(botoes()).not.toContain('Lore');
    expect(document.querySelector('.hist-card-actions .ti-book')).toBeNull();
  });

  it('e os outros três continuam', () => {
    montar();
    expect(botoes()).toEqual(expect.arrayContaining(['Batalhas', 'Convites', 'Loja']));
  });

  it('a fileira de ações ainda aparece com os que sobraram', () => {
    montar();
    expect(document.querySelector('.hist-card-actions')).toBeTruthy();
  });
});

describe('nada ficou pendurado no fonte', () => {
  it('sem a prop onManageLore', () => {
    expect(fonte).not.toMatch(/onManageLore/);
  });

  it('sem o state nem a página de lore', () => {
    expect(fonte).not.toMatch(/gerenciandoLore/);
    expect(fonte).not.toMatch(/<GerenciarLoreView/);
  });

  /* As outras páginas internas seguem: loja, convites e batalhas continuam
     abrindo por cima da lista, e `dentroDeMenu` avisa o AdminConsole. Se o
     `lojaAberta` tivesse saído junto por descuido, o card perderia três
     funções em vez de uma. */
  it('mas as outras páginas internas do card continuam', () => {
    expect(fonte).toMatch(/lojaAberta/);
    expect(fonte).toMatch(/gerenciandoConvites/);
    expect(fonte).toMatch(/<GerenciarLojaView/);
  });
});

describe('as palavras do botão saíram do COPY', () => {
  it('nos dois idiomas', () => {
    const copy = readFileSync(resolve(aqui, '..', '01-core', 'copy.jsx'), 'utf8');
    expect(copy).not.toMatch(/loreTip:/);
    // `lore:` sobrevive como NAMESPACE (COPY.lore.form, COPY.lore.permissao) —
    // o que saiu é a chave do botão do card, dentro de `card:`.
    expect(copy).not.toMatch(/lore: 'Lore'/);
    expect(copy).not.toMatch(/loreTip/);
  });
});

describe('o caminho que substituiu o botão existe', () => {
  it('o Mestre tem Lugares e NPCs na barra lateral', () => {
    const ids = (window.ADMIN_SECTIONS.master || []).map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(['lugares', 'npcs']));
  });

  /* A terceira aba do Lore era Criatura, e é para a tabela de Criaturas que a
     função dela foi. Sem esta linha, o teste acima descreveria uma remoção
     que perdeu uma função pelo caminho. */
  it('e disponibilizar criatura mora na tabela de Criaturas', () => {
    const bestiario = readFileSync(resolve(aqui, '..', '09-bestiario', 'bestiario.jsx'), 'utf8');
    expect(bestiario).toMatch(/PermissaoEntradaModal/);
    expect(bestiario).toMatch(/tipo: 'criatura'/);
  });
});
