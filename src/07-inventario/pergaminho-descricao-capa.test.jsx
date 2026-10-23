/* ============================================================
   pergaminho-descricao-capa.test.jsx — dois pedidos de 13/09/2026
   ============================================================
   "No pergaminho de magias para serem aprendidas, mostre a descrição da
    magia." — a janela do pergaminho mostra o texto da magia (descrição geral
    e o do nível que o pergaminho ensina), vindo do catálogo de magias.

   "Personagem Aldren não está conseguindo vestir a capa." — no catálogo as
    capas gravam slot_equip = 'costas', mas a tabela de vestir só conhecia
    'capa': o botão Vestir nascia desativado com "Sem slot definido". O mesmo
    valia para 'corpo' (roupas), 'orelhas' (brincos) e 'dedos' (anéis).
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import '../01-core/select-pill.jsx';
import '../07-inventario/inventario.jsx';
// O modal de item é o BestDetalheModal do bestiário desde 26/09/2026.
import '../09-bestiario/ataques-criatura.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../09-bestiario/conhecido-jogador.jsx';
import '../09-bestiario/catalogo-descritores.jsx';
import '../09-bestiario/catalogo-editor.jsx';
import '../09-bestiario/bestiario.jsx';

let Modal;
beforeAll(() => {
  Modal = window.DetalhesItemModal;
  expect(Modal).toBeTypeOf('function');
});
afterEach(cleanup);

const noop = () => {};
const abrir = (cat, instance, extra) => render(
  <Modal
    instance={instance} catalogoBySlug={{ [cat.slug]: cat }} raca="Humano"
    slotsState={{}} todosItens={[instance]} containersDisponiveis={[]} pjsHistoria={[]}
    lang="pt" onClose={noop} onEquipar={noop} onDesequipar={noop} onUsar={noop}
    onDestruir={noop} onObservacao={noop} onMoverParaContainer={noop} onTransferir={noop}
    onTransferReset={noop} onVestir={noop} onDespir={noop} onRemoverDoContainer={noop}
    onAbrirDetalhesFilho={noop}
    {...extra}
  />,
);

describe('pergaminho mostra a descrição da magia', () => {
  // Pergaminho único desde 22/10/2026: ensina todos os níveis, nivel_magia nulo.
  const PERG = { slug: 'pergaminho_voo', nome: 'Pergaminho Vôo', grupo: 'Consumíveis', magia: 'Vôo', nivel_magia: null };
  const inst = { instanceId: 'p1', slug: PERG.slug, quantidade: 1 };
  const MAGIAS = [{
    key: 'voo', nome: 'Vôo', custo: 2, permissao: 'Mago', tipo: 'Perdida',
    descricao: 'Você flutua pelo ar.\nExige concentração.',
    nivel_1: 'Voa por 1 rodada.', nivel_3: 'Voa por 3 rodadas.', nivel_5: 'Voa por 5 rodadas.',
  }];

  it('descrição geral, sem nível fixo (o pergaminho ensina todos)', () => {
    abrir(PERG, inst, { magiasDb: MAGIAS });
    // O bloco é o do Comércio (BestItemMagia) desde 26/09/2026, numa aba própria.
    const bloco = document.querySelector('.best-magia');
    expect(bloco.getAttribute('data-aba')).toBe('Magia');
    // Sem passe desde 23/10/2026: o nome da magia está na própria seção.
    expect(bloco.textContent).toMatch(/Vôo/);
    expect(bloco.textContent).not.toMatch(/Nível/);
    expect(bloco.textContent).toMatch(/Você flutua pelo ar\./);
    expect(bloco.querySelector('.best-efeito')).toBeNull();
  });

  it('o pergaminho tem a ação Aprender', () => {
    abrir(PERG, inst, { magiasDb: MAGIAS, vinculos: {}, onAprenderMagia: async () => ({ ok: true }) });
    expect(document.querySelector('[data-acao="aprender"]')).toBeTruthy();
  });

  it('livro com vínculo tem Estudar; livro sem vínculo não', () => {
    const livro = { slug: 'livro_do_mago', nome: 'Livro do Mago', grupo: 'Itens' };
    const catalogo = { [livro.slug]: livro, [PERG.slug]: PERG };
    const inst2 = { instanceId: 'l1', slug: livro.slug, quantidade: 1 };
    abrir(livro, inst2, { catalogoBySlug: catalogo, magiasDb: MAGIAS, vinculos: { livro_do_mago: ['pergaminho_voo'] } });
    expect(document.querySelector('[data-acao="estudar"]')).toBeTruthy();
    cleanup();
    abrir(livro, inst2, { catalogoBySlug: catalogo, magiasDb: MAGIAS, vinculos: {} });
    expect(document.querySelector('[data-acao="estudar"]')).toBeNull();
  });

  /* Mudou em 26/09/2026: o modal do inventário é o do Comércio, que mostra a
     magia de QUALQUER item mágico (o anel conjura aquilo) — o que fica só no
     pergaminho é o ícone Aprender. */
  it('item mágico que só carrega a magia mostra a magia, sem Aprender', () => {
    const anel = { slug: 'anel_voo', nome: 'Anel', grupo: 'Itens', magia: 'Vôo', nivel_magia: 3 };
    abrir(anel, { instanceId: 'a1', slug: anel.slug, quantidade: 1 }, { magiasDb: MAGIAS });
    expect(document.querySelector('.best-magia').textContent).toMatch(/Vôo/);
    expect(document.querySelector('.best-magia').textContent).toMatch(/Você flutua pelo ar./);
    expect(document.querySelector('[data-acao="aprender"]')).toBeNull();
  });
});

describe('vestir: slots gravados no catálogo', () => {
  // Ícone ao lado do X desde 26/09/2026: o nome mora no aria-label.
  const botaoVestir = () => [...document.querySelectorAll('button')].find((b) => b.textContent === 'Vestir' || b.getAttribute('aria-label') === 'Vestir');

  it.each([
    ['capa_simples', 'costas'],
    ['gandola', 'corpo'],
    ['brinco_prata', 'orelhas'],
    ['anel_ouro', 'dedos'],
  ])('%s (slot_equip=%s) pode ser vestido', (slug, slot) => {
    const cat = { slug, nome: slug, grupo: 'Vestimentas', categoria_equip: null, slot_equip: slot };
    abrir(cat, { instanceId: 'v1', slug, quantidade: 1 });
    const b = botaoVestir();
    expect(b).toBeTruthy();
    expect(b.disabled).toBe(false);
  });

  /* "Reveja vestir cintos e alforjes, quando há slot livre." (13/09/2026) — a
     ficha tem 3 casas de cinto, mas a tabela de vestir deixava só 1: com um
     cinto vestido, o Alforge dava "Slot cheio (1/1)". */
  const CINTURA = [
    { slug: 'cinto_suporte', nome: 'Cinto de Suporte', grupo: 'Vestimentas', tipo: 'S', armazena: 2, slot_equip: 'cintura' },
    { slug: 'alforge', nome: 'Alforge', grupo: 'Vestimentas', tipo: 'S', armazena: 15, slot_equip: 'cintura' },
    { slug: 'algibeira', nome: 'Algibeira', grupo: 'Vestimentas', tipo: 'S', armazena: 2, tipo_item: 'Moedas', slot_equip: 'cintura' },
  ];
  const catCintura = Object.fromEntries(CINTURA.map((c) => [c.slug, c]));
  const vestidoNaCintura = (slug, id) => ({ instanceId: id, slug, quantidade: 1, vestido: true, vesteSlot: 'cintura' });
  const abrirCintura = (slug, jaVestidos) => {
    const nova = { instanceId: 'novo', slug, quantidade: 1 };
    render(
      <Modal instance={nova} catalogoBySlug={catCintura} raca="Humano" slotsState={{}}
        todosItens={[...jaVestidos, nova]} containersDisponiveis={[]} pjsHistoria={[]} lang="pt"
        onClose={noop} onVestir={noop} onDespir={noop} />,
    );
    return botaoVestir();
  };

  it('com um cinto vestido, o Alforge ainda veste (2ª casa)', () => {
    expect(abrirCintura('alforge', [vestidoNaCintura('cinto_suporte', 'c1')]).disabled).toBe(false);
  });

  it('com dois vestidos, a Algibeira ainda veste (3ª casa)', () => {
    expect(abrirCintura('algibeira', [vestidoNaCintura('cinto_suporte', 'c1'), vestidoNaCintura('alforge', 'a1')]).disabled).toBe(false);
  });

  it('com as 3 casas da cintura ocupadas, bloqueia', () => {
    const b = abrirCintura('alforge', [
      vestidoNaCintura('cinto_suporte', 'c1'), vestidoNaCintura('alforge', 'a1'), vestidoNaCintura('algibeira', 'g1'),
    ]);
    expect(b.disabled).toBe(true);
  });

  it('a capa só cabe uma: com outra vestida, bloqueia', () => {
    const cat = { slug: 'capa_simples', nome: 'Capa Simples', grupo: 'Vestimentas', slot_equip: 'costas' };
    const nova = { instanceId: 'v2', slug: cat.slug, quantidade: 1 };
    const vestida = { instanceId: 'v1', slug: cat.slug, quantidade: 1, vestido: true, vesteSlot: 'capa' };
    render(
      <Modal instance={nova} catalogoBySlug={{ [cat.slug]: cat }} raca="Humano" slotsState={{}}
        todosItens={[vestida, nova]} containersDisponiveis={[]} pjsHistoria={[]} lang="pt"
        onClose={noop} onVestir={noop} onDespir={noop} />,
    );
    expect(botaoVestir().disabled).toBe(true);
  });
});

// A ficha usa a mesma tradução (window.vesteSlotDe) para peças já vestidas
// com o slot do banco — 34 delas no banco em 13/09/2026.
describe('vesteSlotDe — slot do banco → casa da ficha', () => {
  it.each([['costas', 'capa'], ['corpo', 'roupa'], ['orelhas', 'orelha'], ['dedos', 'joia'], ['cinto', 'cintura'], ['cintura', 'cintura'], ['pescoco', 'pescoco']])(
    '%s → %s', (banco, casa) => { expect(window.vesteSlotDe(banco)).toBe(casa); });
});

/* Pergaminho de técnica (22/10/2026): ensina sem se gastar — como o de magia,
   não tem "Usar" (que baixaria a quantidade e sumiria com ele). */
describe('pergaminho de técnica não se usa', () => {
  const PERG_TEC = { slug: 'pergaminho_tecnica_golpe', nome: 'Pergaminho Golpe Duplo', grupo: 'Consumíveis', tecnica: 'Golpe Duplo' };
  const inst = { instanceId: 't1', slug: PERG_TEC.slug, quantidade: 1 };
  it('sem Usar; com Aprender', () => {
    abrir(PERG_TEC, inst, { magiasDb: [], tecnicasDb: [{ key: 'golpe', nome: 'Golpe Duplo', custo: 2 }],
      vinculos: {}, onAprenderMagia: async () => ({ ok: true }) });
    expect(document.querySelector('[data-confirmar="usar"]')).toBeNull();
    expect(document.querySelector('.det-uso')).toBeNull();
    expect(document.querySelector('[data-acao="aprender"]')).toBeTruthy();
  });
});
