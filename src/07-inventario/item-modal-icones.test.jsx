/* ============================================================
   item-modal-icones.test.jsx — o modal de item no molde do Comércio
   ============================================================
   "Eu quero que o modal de itens na ficha, na loja e no inventário, abram um
    modal igual [ao do Comércio]. Mas junto do X, teremos os seguintes ícones
    [Vender, Descartar, Transferir, Equipar, Desequipar, Vestir, Despir,
    Armazenar, Comentar, Usar, Preparar]. Não teremos mais o rodapé."
   (usuário, 26/09/2026)
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/select-pill.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './inventario.jsx';
import '../09-bestiario/ataques-criatura.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../09-bestiario/conhecido-jogador.jsx';
import '../09-bestiario/catalogo-descritores.jsx';
import '../09-bestiario/catalogo-editor.jsx';
import '../09-bestiario/bestiario.jsx';

let Modal;
beforeAll(() => { Modal = window.DetalhesItemModal; });
afterEach(cleanup);

const noop = () => {};
const ESPADA = { slug: 'espada', nome: 'Espada Longa', grupo: 'Armas', categoria_equip: 'arma', grupo_armas: 'CM',
  descricao: 'Uma lâmina reta.', valor_latao: 100, dano: 12, maos_outras: 1 };
const abrir = (instance, extra = {}) => render(
  <Modal
    instance={instance} catalogoBySlug={{ espada: ESPADA }} raca="Humano"
    slotsState={{}} todosItens={[instance]} containersDisponiveis={[]} pjsHistoria={[{ id: 7, nome: 'Aliado' }]}
    lang="pt" onClose={noop} onEquipar={noop} onDesequipar={noop} onUsar={noop}
    onDestruir={noop} onObservacao={noop} onMoverParaContainer={noop} onTransferir={noop}
    onTransferReset={noop} onVestir={noop} onDespir={noop} onRemoverDoContainer={noop}
    onAbrirDetalhesFilho={noop} onVender={noop} podeVender={{ ehDono: true, historiaId: 1 }}
    {...extra}
  />,
);
const acoes = () => [...document.querySelectorAll('.mn-acoes [data-acao]')].map((b) => b.getAttribute('data-acao'));
/* Desde 23/10/2026 as características moram só na lista ("padronize"): as
   "células" são as linhas dela, pelo rótulo. */
const ROTULOS = { 'Dano': 'dano', 'Grupo': 'grupo', 'Onde está': 'onde', 'Quantidade': 'quantidade' };
const celulas = () => Object.fromEntries([...document.querySelectorAll('.best-secao--lista .best-stat')]
  .map((c) => [ROTULOS[c.querySelector('.best-stat-lbl').textContent] || c.querySelector('.best-stat-lbl').textContent,
    (c.querySelector('.best-stat-val') || { textContent: '' }).textContent]));

/* QUADRO DE INICIATIVA (22/10/2026) — três escolhas do usuário para a
   janela do item: "Barra com nome", "Passe + página única" e Usar "direto no
   rodapé". Os ícones mudos ao lado do X, as abas e o card do alvo saíram. */
describe('o modal do item do inventário', () => {
  it('sem passe no topo: página única, sem abas e sem rodapé', () => {
    abrir({ instanceId: 'e1', slug: 'espada', quantidade: 1 });
    expect(document.querySelector('.modal-best-detalhe.modal-item')).toBeTruthy();
    expect(document.querySelector('.ms-footer')).toBeNull();
    expect(document.querySelector('.best-abas')).toBeNull();
    // Os números da arma ficam em Características, como os de todo item.
    expect(document.querySelector('.item-passe')).toBeNull();
    /* 27/10/2026: o grupo deixou de ser sigla — 'CM' virou 'Corte Médio'
       (pedido do usuário: 'Grupo "PM" vira "Perfuração Média"'). */
    expect(celulas()).toMatchObject({ dano: '12', grupo: 'Corte Médio' });
    // Descrição e Características na mesma página, sem trocar de aba.
    expect(document.body.textContent).toMatch(/Uma lâmina reta\./);
    expect(document.querySelector('.best-secao--lista')).toBeTruthy();
  });

  it('a barra com nome: a principal primeiro, em ouro; Descartar por último', () => {
    abrir({ instanceId: 'e1', slug: 'espada', quantidade: 1 });
    // Sem Comentar desde 26/09/2026 (a nota do item saiu por completo).
    // Transferir saiu em 28/09/2026: agora é arrastar o item até o amigo.
    // Transferir voltou como botão em 23/10/2026 (só para o dono, com onTransferir).
    expect(acoes()).toEqual(['equipar', 'vender', 'armazenar', 'descartar']);
    const equipar = document.querySelector('[data-acao="equipar"]');
    expect(equipar.classList.contains('mn-acao--principal')).toBe(true);
    // O nome está escrito no botão, não só no tooltip.
    expect(document.querySelector('[data-acao="vender"]').textContent).toBe('Vender na loja');
    expect(document.querySelector('[data-acao="vender"] i').className).toContain('ti-coins');
    // Nada de ação no cabeçalho além do X.
    expect(document.querySelector('.ms-header [data-acao]')).toBeNull();
  });

  /* 23/10/2026: o motivo vai num balão, não escrito na página ("deve mostrar
     um tooltip com a informação de porque está bloqueado"). */
  it('ação bloqueada: o motivo aparece num balão ao tocar nela', () => {
    abrir({ instanceId: 'e1', slug: 'espada', quantidade: 1 });
    const armazenar = document.querySelector('[data-acao="armazenar"]');
    expect(armazenar.disabled).toBe(true);
    expect(document.querySelector('.mn-acoes-motivo')).toBeNull();
    const embrulho = armazenar.closest('.mn-acao-embrulho');
    expect(embrulho.getAttribute('aria-label')).toMatch(/Armazenar: Nenhum recipiente compatível/);
    fireEvent.click(embrulho);
    expect(document.querySelector('.mn-tip').textContent).toMatch(/Nenhum recipiente compatível/);
    expect(document.querySelector('.mn-acoes-motivo')).toBeNull();
  });

  it('equipado: Desequipar no lugar de Equipar', () => {
    abrir({ instanceId: 'e1', slug: 'espada', quantidade: 1, equipado: true, slot: 'mao_d' });
    expect(acoes()).toContain('desequipar');
    expect(acoes()).not.toContain('equipar');
    expect(document.querySelector('[data-acao="desequipar"] i').className).toContain('ti-shield-off');
    expect(celulas().onde).toMatch(/Equipado/);
  });

  /* 'Remova completamente o sistema de nota dos itens.' (26/09/2026) */
  it('sem nota: nem ação, nem seção, mesmo com observacao antiga gravada', () => {
    abrir({ instanceId: 'e1', slug: 'espada', quantidade: 1, observacao: 'Forjada por Parom.' });
    expect(document.querySelector('[data-acao="comentar"]')).toBeNull();
    expect(document.body.textContent).not.toMatch(/Forjada por Parom/);
  });

  /* "Nos modais, quando precisar de botão de confirme, use os botões em um
     rodapé. Mas não precisa de título como 'Descartar item'." (27/09/2026) */
  it('Descartar: a pergunta no corpo, sem título; Cancelar e Descartar no rodapé', () => {
    const onDestruir = vi.fn();
    abrir({ instanceId: 'e1', slug: 'espada', quantidade: 1 }, { onDestruir });
    expect(document.querySelector('.ms-footer')).toBeNull();
    fireEvent.click(document.querySelector('[data-acao="descartar"]'));
    expect(document.querySelector('[data-acao="descartar"]').getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('.det-act-confirm-title')).toBeNull();
    expect(document.querySelector('.det-etapa button')).toBeNull();
    const rodape = [...document.querySelectorAll('.ms-footer button')].map((x) => x.textContent);
    expect(rodape).toEqual(['Cancelar', 'Descartar']);
    fireEvent.click([...document.querySelectorAll('.ms-footer button')].find((x) => x.textContent === 'Descartar'));
    expect(onDestruir).toHaveBeenCalledWith('e1', undefined);
  });

  it('Cancelar no rodapé volta à ficha e o rodapé some', () => {
    abrir({ instanceId: 'e1', slug: 'espada', quantidade: 1 });
    fireEvent.click(document.querySelector('[data-acao="descartar"]'));
    fireEvent.click([...document.querySelectorAll('.ms-footer button')].find((x) => x.textContent === 'Cancelar'));
    expect(document.querySelector('.ms-footer')).toBeNull();
    expect(document.querySelector('.best-secao--lista')).toBeTruthy();
  });
});

/* "Usar um item consumível: o alvo é sempre o próprio personagem" — Usar
   direto no rodapé, sem aba Usar e sem card do alvo (usuário, 22/10/2026). */
describe('usar item: direto no rodapé', () => {
  /* "EF" não é rótulo do catálogo (o parser conhece "Energia Física") — a
     prosa antiga aparecia na tela sem nunca ter sido lida. Com os efeitos em
     rótulo e número (28/10/2026), fixture que o parser não entende vira linha
     vazia, e o teste passaria a medir nada. */
  const POCAO = { slug: 'pocao', nome: 'Poção de Cura', grupo: 'Consumíveis', descricao: 'Cura 10.', efeito_positivo: 'Recupera 10 de Energia Física.' };
  const abrirPocao = (extra = {}, qtd = 1) => render(
    <Modal instance={{ instanceId: 'p1', slug: 'pocao', quantidade: qtd }} catalogoBySlug={{ pocao: POCAO }} raca="Humano"
      slotsState={{}} todosItens={[{ instanceId: 'p1', slug: 'pocao', quantidade: qtd }]} containersDisponiveis={[]} pjsHistoria={[]}
      lang="pt" onClose={noop} onEquipar={noop} onDesequipar={noop} onUsar={noop} onDestruir={noop}
      onMoverParaContainer={noop} onTransferir={noop} onTransferReset={noop} onVestir={noop} onDespir={noop}
      onRemoverDoContainer={noop} onAbrirDetalhesFilho={noop} usuario={{ nome: 'Thalia' }} {...extra} />,
  );
  const usar = () => document.querySelector('.ms-footer [data-confirmar="usar"]');

  it('sem ação Usar na barra, sem aba e sem card; o efeito mora em Características', () => {
    abrirPocao();
    expect(document.querySelector('[data-acao="usar"]')).toBeNull();
    expect(document.querySelector('.best-abas')).toBeNull();
    expect(document.querySelector('[data-alvo-uso]')).toBeNull();
    /* O EFEITO EM RÓTULO E NÚMERO (28/10/2026, usuário: "o sistema de efeitos
       dos itens (positivo, negativo) virem apenas efeitos [...] mostrar
       'Desonra 2, Frio 5, Calor 5'"). Era a prosa do banco, com o verbo e a
       divisão positivo/negativo à mostra. A poção recupera 10 de EF. */
    expect(document.querySelector('.best-secao--lista').textContent).toMatch(/Efeitos\s*Energia Física 10/);
  });

  it('Usar no rodapé já vem ativo: um clique usa e fecha', () => {
    const onUsar = vi.fn(); const onClose = vi.fn();
    abrirPocao({ onUsar, onClose });
    expect(usar().disabled).toBe(false);
    fireEvent.click(usar());
    expect(onUsar).toHaveBeenCalledWith('p1', undefined);
    expect(onClose).toHaveBeenCalled();
  });

  it('pilha: o seletor de quantidade no centro do rodapé vai junto no uso', () => {
    const onUsar = vi.fn();
    abrirPocao({ onUsar }, 4);
    expect(celulas().quantidade).toBe('4');
    const stepper = document.querySelector('.ms-footer-center .fp-pop-stepper');
    expect(stepper.textContent).toMatch(/1\s*de 4/);
    fireEvent.click(stepper.querySelector('[aria-label="+"]'));
    fireEvent.click(stepper.querySelector('[aria-label="+"]'));
    fireEvent.click(usar());
    expect(onUsar).toHaveBeenCalledWith('p1', 3);
  });
});

/* "Ao clicar em usar item, e depois clicar em excluir, o modal fica atrás."
   (26/09/2026) — a janela de quantidade (ModalShell, desenhada no lugar) abria
   atrás do modal do item (portal no fim da página). */
describe('pilha de janelas', () => {
  it('a janela aberta por último fica na frente e é a que o Esc fecha', () => {
    const fechados = [];
    const { ModalShell, BestDetalheModal } = window;
    const Dupla = ({ segunda }) => (
      <div className="menestrel-ui">
        {segunda && (
          <ModalShell title="Quantidade" lang="pt" onClose={() => fechados.push('quantidade')}>
            <span>quantos?</span>
          </ModalShell>
        )}
        <BestDetalheModal title="Poção" lang="pt" onClose={() => fechados.push('item')}>
          <p>corpo</p>
        </BestDetalheModal>
      </div>
    );
    const r = render(<Dupla segunda={false} />);
    r.rerender(<Dupla segunda />);
    const [qtd, item] = ['Quantidade', 'Poção'].map((t) => [...document.querySelectorAll('.ms-backdrop')]
      .find((b) => b.textContent.includes(t)));
    expect(Number(qtd.style.zIndex)).toBeGreaterThan(Number(item.style.zIndex));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(fechados).toEqual(['quantidade']);
  });
});

/* "Ao clicar na aba conteúdo de um item, quero ver o quadriculado igual do
   inventário." (26/09/2026) */
describe('aba Conteúdo: o quadriculado do inventário', () => {
  it('cards do inventário, casas vazias, e o clique abre o item de dentro', () => {
    const onAbrirDetalhesFilho = vi.fn();
    const CAT = {
      mochila: { slug: 'mochila', nome: 'Mochila', grupo: 'Recipientes', armazena: 20 },
      adaga: { slug: 'adaga', nome: 'Adaga', grupo: 'Armas', ocupa: 1 },
      pocao: { slug: 'pocao', nome: 'Poção', grupo: 'Consumíveis', ocupa: 0.5 },
    };
    const itens = [
      { instanceId: 'm', slug: 'mochila', quantidade: 1 },
      { instanceId: 'a', slug: 'adaga', quantidade: 1, containerId: 'm' },
      { instanceId: 'p', slug: 'pocao', quantidade: 3, containerId: 'm' },
    ];
    render(<Modal instance={itens[0]} catalogoBySlug={CAT} raca="Humano" slotsState={{}} todosItens={itens}
      containersDisponiveis={[]} pjsHistoria={[]} lang="pt" onClose={noop} onEquipar={noop} onDesequipar={noop}
      onUsar={noop} onDestruir={noop} onMoverParaContainer={noop} onTransferir={noop} onTransferReset={noop}
      onVestir={noop} onDespir={noop} onRemoverDoContainer={noop} onAbrirDetalhesFilho={onAbrirDetalhesFilho} />);
    const grade = document.querySelector('.det-grade-recipiente');
    expect(grade.classList.contains('inv-bag-grid--slots')).toBe(true);
    expect(grade.querySelectorAll('.inv-card')).toHaveLength(2);
    expect(grade.querySelectorAll('.inv-slot-ghost').length).toBeGreaterThan(0);
    // A quantidade é o ícone ti-number-3-small (26/09/2026); o número fica no aria-label.
    const qtd = grade.querySelector('[data-filho="p"] .inv-card-qty');
    expect(qtd.querySelector('i').className).toBe('ti ti-number-3-small');
    expect(qtd.getAttribute('aria-label')).toBe('3');
    fireEvent.click(grade.querySelector('[data-filho="a"]'));
    expect(onAbrirDetalhesFilho).toHaveBeenCalledWith('a');
  });
});

/* Recipiente (23/10/2026): a seção Conteúdo mostra quanto está ocupado e
   aparece também vazia, com o caminho para guardar. */
describe('seção Conteúdo do recipiente', () => {
  const CAT = {
    bolsa: { slug: 'bolsa', nome: 'Bolsa', grupo: 'Recipientes', armazena: 2 },
    adaga: { slug: 'adaga', nome: 'Adaga', grupo: 'Armas', ocupa: 0.5 },
  };
  const abrir = (itens) => render(<Modal instance={itens[0]} catalogoBySlug={CAT} raca="Humano" slotsState={{}} todosItens={itens}
    containersDisponiveis={[]} pjsHistoria={[]} lang="pt" onClose={noop} onEquipar={noop} onDesequipar={noop}
    onUsar={noop} onDestruir={noop} onMoverParaContainer={noop} onVestir={noop} onDespir={noop}
    onRemoverDoContainer={noop} onAbrirDetalhesFilho={noop} />);
  it('vazio: medidor 0/2 e aviso, sem grade', () => {
    abrir([{ instanceId: 'b', slug: 'bolsa', quantidade: 1 }]);
    const secao = document.querySelector('.det-recipiente');
    expect(secao.querySelector('.det-recip-num').textContent).toBe('0/2');
    expect(secao.querySelector('.det-recip-vazio').textContent).toMatch(/^Vazio\./);
    expect(secao.querySelector('.det-grade-recipiente')).toBeNull();
  });
  /* AS CASAS SÃO AS DO PORTE (29/10/2026, usuário: "vamos definir 4 tipos de
     quantidades de slots para os itens: pequenos 3, médios 6, grandes 9,
     muito grandes 15").

     Esta linha mudou três vezes em dois dias, e vale registrar por quê: o
     número de casas já veio da LARGURA da janela (5, em jsdom), já veio do
     PESO que o recipiente suporta (2 — meu erro, peso não é casa), e agora
     vem do PORTE, que é propriedade declarada do recipiente. A Bolsa
     armazena 2 e por isso cai em `pequeno`: 3 casas.

     Os dois limites convivem: `1/2` continua sendo o peso, e as 3 casas são
     quantas peças cabem. */
  it('com itens: o medidor traz casas e peso, e a grade mostra as casas do porte', () => {
    abrir([{ instanceId: 'b', slug: 'bolsa', quantidade: 1 }, { instanceId: 'a', slug: 'adaga', quantidade: 2, containerId: 'b' }]);
    const secao = document.querySelector('.det-recipiente');
    expect(secao.querySelector('.det-recip-num').textContent).toBe('1/2');
    expect(secao.querySelector('.det-recip-casas').textContent.replace(/\s+/g, ' ')).toBe('1/3 casas');
    expect(secao.querySelectorAll('.det-grade-recipiente > *')).toHaveLength(3);
  });
});

/* ABATER (28/09/2026): "quando um animal é abatido [...] vai virar a carne do
   seu tipo [...] metade do peso total do animal. O item porém não irá para o
   inventário, ele irá para a loja." A conta é da RPC; a janela só pergunta. */
describe('abater o animal manda a carne para a loja', () => {
  const LOBO = { slug: 'lobo', nome: 'Lobo', grupo: 'Animais', criatura_id: 5, valor_latao: 30 };
  const inst = { instanceId: 'l1', slug: 'lobo', quantidade: 1 };
  const abrirLobo = (onPreparar) => render(
    <Modal instance={inst} catalogoBySlug={{ lobo: LOBO }} raca="Humano" slotsState={{}} todosItens={[inst]}
      containersDisponiveis={[]} pjsHistoria={[]} lang="pt" onClose={noop} onEquipar={noop} onDesequipar={noop}
      onUsar={noop} onDestruir={noop} onMoverParaContainer={noop} onVestir={noop} onDespir={noop}
      onRemoverDoContainer={noop} onAbrirDetalhesFilho={noop} onPreparar={onPreparar} />,
  );

  it('o ícone Abater aparece para o animal ligado a uma criatura, e o texto fala da loja', async () => {
    const onPreparar = vi.fn(async () => ({ ok: true }));
    abrirLobo(onPreparar);
    fireEvent.click(document.querySelector('[data-acao="preparar"]'));
    expect(document.querySelector('.det-etapa').textContent).toMatch(/vai para a loja da aventura/);
    fireEvent.click(document.querySelector('[data-confirmar="abater"]'));
    expect(onPreparar).toHaveBeenCalledWith('l1');
  });

  it('criatura sem carne: a janela diz o porquê', async () => {
    abrirLobo(async () => ({ ok: false, motivo: 'sem_carne' }));
    fireEvent.click(document.querySelector('[data-acao="preparar"]'));
    fireEvent.click(document.querySelector('[data-confirmar="abater"]'));
    expect(await screen.findByText('Esta criatura não rende carne.')).toBeTruthy();
  });
});

/* À venda na loja (02/10/2026): o item fica no inventário, travado até
   retirar o anúncio — decisão do usuário. Toda ação vem desativada, com o
   motivo; "Onde está" diz que está à venda. */
describe('item à venda na janela do inventário', () => {
  it('todas as ações desativadas, com o motivo, e "À venda na loja" na lista', () => {
    abrir({ instanceId: 'e1', slug: 'espada', quantidade: 1, anuncio_id: 7 });
    const botoes = [...document.querySelectorAll('.mn-acoes [data-acao]')];
    expect(botoes.length).toBeGreaterThan(0);
    for (const b of botoes) expect(b.disabled).toBe(true);
    expect(celulas().onde).toBe('À venda na loja');
    // A principal (Equipar) segue em primeiro; o motivo vai no balão (23/10/2026).
    expect(botoes[0].getAttribute('data-acao')).toBe('equipar');
    expect(botoes[0].closest('.mn-acao-embrulho').getAttribute('aria-label')).toMatch(/Equipar: .*retire o anúncio/);
    expect(document.querySelector('.mn-acoes-motivo')).toBeNull();
  });

  it('item livre segue com as ações ativas', () => {
    abrir({ instanceId: 'e1', slug: 'espada', quantidade: 1 });
    const botoes = [...document.querySelectorAll('.mn-acoes [data-acao]')];
    expect(botoes.some((b) => !b.disabled)).toBe(true);
  });
});

/* Revisão de 22/10/2026: a principal bloqueada não troca de lugar e diz o
   porquê sem toque — no tablet, um botão apagado sem explicação falha mudo. */
describe('principal bloqueada', () => {
  it('Equipar sem mãos livres: primeiro na barra, apagado, motivo no balão', () => {
    abrir({ instanceId: 'e1', slug: 'espada', quantidade: 1 }, { slotsState: { mao_d: 'x', mao_e: 'y' } });
    expect(acoes()[0]).toBe('equipar');
    expect(document.querySelector('[data-acao="equipar"]').disabled).toBe(true);
    expect(document.querySelector('[data-acao="equipar"]').closest('.mn-acao-embrulho').getAttribute('aria-label'))
      .toBe('Equipar: Precisa de 1 mão livre; nenhuma livre.');
  });
});
