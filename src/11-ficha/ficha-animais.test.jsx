/* ============================================================
   ficha-animais.test.jsx — a aba Animais da ficha
   ============================================================
   Pedido do usuário (14/09/2026): "Na ficha dos animais, é preciso montar
   todos os ataques, o nível das técnicas e habilidades e magias. Use a seta
   para o lado igual nas informações do personagem."

   Trava: a seta de Ataques passa pelos ataques (com a sequência real de
   clique — ver ficha-info-nav.test.jsx, é o mesmo risco de remontagem) e
   Capacidades mostra os níveis.

   ── O QUE SAIU DESTE ARQUIVO (05–06/10/2026) ─────────────────────────────
   As ABAS INTERNAS ("use abas internas para selecionar a ficha do animal",
   14/09) e o botão MONTAR foram desfeitos por pedidos posteriores do mesmo
   usuário: "eu quero exatamente igual [à ficha do personagem]" — e a do
   personagem não tem abas de personagem dentro dela — e "o botão de montar
   deve ser no item do animal no inventário". A view passou a ser de UM bicho;
   quem escolhe o companheiro é a fileira de chips da aba Companheiros, fora
   dela (ficha.jsx), e Montar vive em montarItem (07-inventario).
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../12-batalha/batalha.jsx';
import './ficha.jsx';

let FichaAnimaisView;
beforeAll(() => {
  FichaAnimaisView = window.FichaAnimaisView;
  expect(FichaAnimaisView).toBeDefined();
});
afterEach(() => cleanup());

const CAT = {
  garras: { slug: 'garras', nome: 'Garras', grupo: 'Armas', slot_equip: 'maos', dano: 8, dano_l: 1, dano_m: 2, dano_p: 3, ajuste_atributo: 'AGI', maos_outras: 1 },
  presas: { slug: 'presas', nome: 'Presas', grupo: 'Armas', slot_equip: 'maos', dano: 10, dano_l: 0, dano_m: 1, dano_p: 2, ajuste_atributo: 'FOR', maos_outras: 1 },
};
const LOBO = {
  id: 9, nome: 'Lobo Alfa', tipo: 'Animal', estagio: 5, peso: 50, montaria: false,
  forca: 2, agilidade: 3, fisico: 1, aura: 0, carisma: 0, percepcao: 2, intelecto: '0',
  equipamento: [{ slug: 'presas', slot: 'mao_d' }, { slug: 'garras', slot: 'mao_e' }],
  habilidades: 'Rastrear', tecnicas_especiais: '', magia: '',
};
const CAVALO = { id: 157, nome: 'Cavalo Quarter', tipo: 'Animal', estagio: 4, montaria: true, equipamento: [] };
const HABS = { rastrear: { key: 'rastrear', nome: 'Rastrear', grupo: 'Geral', ajuste: 'PER' } };

const animais = [
  { instancia: { instanceId: 'a1', slug: 'lobo_alfa' }, cat: { nome: 'Lobo Alfa' }, criatura: LOBO },
  { instancia: { instanceId: 'a2', slug: 'cavalo_quarter', montado: true }, cat: { nome: 'Cavalo Quarter' }, criatura: CAVALO },
];

const montar = (over) => render(
  <FichaAnimaisView animal={animais[0]} en={false} podeEditar itens={[]} parte="info"
    catalogoBySlug={CAT} habsByKey={HABS} tecnicasByKey={{}} magiasByKey={{}} {...over} />
);
const coluna = (titulo) => [...document.querySelectorAll('.fp-col-title-main')]
  .find((el) => el.textContent === titulo).closest('.fp-col-title-nav').parentElement;

describe('FichaAnimaisView', () => {
  it('abre a ficha do bicho recebido, com a 1ª coluna em Identidade', () => {
    montar();
    // O subtítulo virou o título (27/09/2026): a 1ª coluna abre em "Identidade".
    expect(coluna('Identidade').textContent).toContain('Lobo Alfa');
    expect(document.querySelector('.fp-col-title-sub')).toBeNull();
  });

  it('sem `animal`, cai no montado da lista — e depois no primeiro', () => {
    // O recuo que mantém a view viva enquanto o chamador não escolheu ninguém.
    // O retrato é da FICHA — as páginas de informação não o têm.
    montar({ animal: undefined, animais, parte: 'ficha' });
    expect(document.querySelector('.fp2-name').textContent).toBe('Cavalo Quarter');
  });

  it('a seta de Ataques passa por todos os ataques (clique real)', () => {
    montar();
    // O nome do ataque É o título da coluna ("remova os subtítulos … 'coice'").
    const col = coluna('Presas');
    const btn = col.querySelector('.fp-col-title-nav-btn');
    fireEvent.mouseDown(btn); fireEvent.focus(btn); fireEvent.mouseUp(btn); fireEvent.click(btn);
    expect(coluna('Garras')).toBeTruthy();
  });

  it('Capacidades mostra a habilidade com o total da regra da criatura', () => {
    // Capacidades virou a página Conhecimento do bicho (27/10/2026).
    montar({ parte: 'conhecimento' });
    const linha = [...coluna('Habilidades').querySelectorAll('.fp-row')]
      .find((r) => r.textContent.includes('Rastrear'));
    expect(linha).toBeTruthy();
    expect(linha.querySelector('.fp-row-value').textContent).not.toBe('—');
  });
});
