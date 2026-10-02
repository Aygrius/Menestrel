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
const acoes = () => [...document.querySelectorAll('.ms-header [data-acao]')].map((b) => b.getAttribute('data-acao'));

describe('o modal do item do inventário', () => {
  it('é o modal com abas do Comércio, sem rodapé', () => {
    abrir({ instanceId: 'e1', slug: 'espada', quantidade: 1 });
    expect(document.querySelector('.modal-best-detalhe')).toBeTruthy();
    expect(document.querySelector('.ms-footer')).toBeNull();
    const abas = [...document.querySelectorAll('.best-abas [role="tab"]')].map((b) => b.textContent);
    expect(abas).toEqual(['Descrição', 'Características']);
  });

  it('os ícones ao lado do X, na ordem pedida', () => {
    abrir({ instanceId: 'e1', slug: 'espada', quantidade: 1 });
    // Sem Comentar desde 26/09/2026 (a nota do item saiu por completo).
    // Transferir saiu em 28/09/2026: agora é arrastar o item até o amigo.
    expect(acoes()).toEqual(['vender', 'descartar', 'equipar', 'armazenar']);
    // O nome de cada um mora no rótulo acessível (e no tooltip).
    expect(document.querySelector('[data-acao="vender"]').getAttribute('aria-label')).toBe('Vender na loja');
    expect(document.querySelector('[data-acao="vender"] i').className).toContain('ti-coins');
  });

  it('equipado: Desequipar no lugar de Equipar', () => {
    abrir({ instanceId: 'e1', slug: 'espada', quantidade: 1, equipado: true, slot: 'mao_d' });
    expect(acoes()).toContain('desequipar');
    expect(acoes()).not.toContain('equipar');
    expect(document.querySelector('[data-acao="desequipar"] i').className).toContain('ti-shield-off');
  });

  /* 'Remova completamente o sistema de nota dos itens.' (26/09/2026) */
  it('sem nota: nem ícone, nem aba, mesmo com observacao antiga gravada', () => {
    abrir({ instanceId: 'e1', slug: 'espada', quantidade: 1, observacao: 'Forjada por Parom.' });
    expect(document.querySelector('[data-acao="comentar"]')).toBeNull();
    const abas = [...document.querySelectorAll('.best-abas [role="tab"]')].map((b) => b.textContent);
    expect(abas).not.toContain('Nota');
    expect(document.body.textContent).not.toMatch(/Forjada por Parom/);
  });

  /* "Nos modais, quando precisar de botão de confirme, use os botões em um
     rodapé. Mas não precisa de título como 'Descartar item'." (27/09/2026) */
  it('Descartar: a pergunta no corpo, sem título; Cancelar e Descartar no rodapé', () => {
    const onDestruir = vi.fn();
    abrir({ instanceId: 'e1', slug: 'espada', quantidade: 1 }, { onDestruir });
    expect(document.querySelector('.ms-footer')).toBeNull();
    fireEvent.click(document.querySelector('[data-acao="descartar"]'));
    expect(document.querySelector('.best-abas')).toBeNull();
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
    expect(document.querySelector('.best-abas')).toBeTruthy();
  });
});

/* "Ao abrir um item para usar: comportamento igual da magia, ao clicar no
   card do alvo, o card fica selecionado e vermelho, se clicar novamente [o
   item] é usado. Ou seja, remova o ícone do lado do x." (26/09/2026) */
describe('usar item: o card do alvo', () => {
  const POCAO = { slug: 'pocao', nome: 'Poção de Cura', grupo: 'Consumíveis', descricao: 'Cura 10.', efeito_positivo: 'Recupera 10 de EF.' };
  const abrirPocao = (extra = {}) => render(
    <Modal instance={{ instanceId: 'p1', slug: 'pocao', quantidade: 1 }} catalogoBySlug={{ pocao: POCAO }} raca="Humano"
      slotsState={{}} todosItens={[{ instanceId: 'p1', slug: 'pocao', quantidade: 1 }]} containersDisponiveis={[]} pjsHistoria={[]}
      lang="pt" onClose={noop} onEquipar={noop} onDesequipar={noop} onUsar={noop} onDestruir={noop}
      onMoverParaContainer={noop} onTransferir={noop} onTransferReset={noop} onVestir={noop} onDespir={noop}
      onRemoverDoContainer={noop} onAbrirDetalhesFilho={noop} usuario={{ nome: 'Thalia' }} {...extra} />,
  );

  it('sem ícone Usar; a aba Usar é a primeira, e o efeito mora em Características', () => {
    abrirPocao();
    expect(document.querySelector('[data-acao="usar"]')).toBeNull();
    const abas = [...document.querySelectorAll('.best-abas [role="tab"]')].map((b) => b.textContent);
    expect(abas).toEqual(['Usar', 'Descrição', 'Características']);
    expect(document.querySelector('.best-secao--lista').textContent).toMatch(/Efeito positivo\s*Recupera 10 de EF\./);
  });

  /* "adicione o rodapé com o botão de confirmar em transferir, usar,
     armazenar, etc." (27/09/2026) — o card marca; Usar no rodapé executa. */
  it('o card marca o alvo; Usar no rodapé usa e fecha', () => {
    const onUsar = vi.fn(); const onClose = vi.fn();
    abrirPocao({ onUsar, onClose });
    const card = () => document.querySelector('[data-alvo-uso="eu"]');
    const usar = () => document.querySelector('.ms-footer [data-confirmar="usar"]');
    expect(usar().disabled).toBe(true);
    fireEvent.click(card());
    expect(onUsar).not.toHaveBeenCalled();
    expect(card().classList.contains('det-opt-card--sel')).toBe(true);
    expect(document.querySelector('.mn-tip')).toBeNull();
    fireEvent.click(usar());
    expect(onUsar).toHaveBeenCalledWith('p1', undefined);
    expect(onClose).toHaveBeenCalled();
  });

  /* "O seletor de quantidade deve aparecer no modal de selecionar alvo."
     (27/09/2026) — pilha: o seletor na aba Usar; sem a segunda janela. */
  it('pilha: o seletor de quantidade fica na aba Usar e vai junto no uso', () => {
    const onUsar = vi.fn();
    render(
      <Modal instance={{ instanceId: 'a1', slug: 'pocao', quantidade: 4 }} catalogoBySlug={{ pocao: POCAO }} raca="Humano"
        slotsState={{}} todosItens={[{ instanceId: 'a1', slug: 'pocao', quantidade: 4 }]} containersDisponiveis={[]} pjsHistoria={[]}
        lang="pt" onClose={noop} onEquipar={noop} onDesequipar={noop} onUsar={onUsar} onDestruir={noop}
        onMoverParaContainer={noop} onTransferir={noop} onTransferReset={noop} onVestir={noop} onDespir={noop}
        onRemoverDoContainer={noop} onAbrirDetalhesFilho={noop} usuario={{ nome: 'Thalia' }} />,
    );
    const stepper = document.querySelector('.ms-footer-center .fp-pop-stepper');
    expect(stepper.textContent).toMatch(/1\s*de 4/);
    fireEvent.click(stepper.querySelector('[aria-label="+"]'));
    fireEvent.click(stepper.querySelector('[aria-label="+"]'));
    const card = document.querySelector('[data-alvo-uso="eu"]');
    fireEvent.click(card);
    fireEvent.click(document.querySelector('.ms-footer [data-confirmar="usar"]'));
    expect(onUsar).toHaveBeenCalledWith('a1', 3);
  });

  /* "O rodapé só aparece na aba usar." (27/09/2026) */
  it('o rodapé do Usar some nas outras abas', () => {
    abrirPocao();
    expect(document.querySelector('.ms-footer [data-confirmar="usar"]')).toBeTruthy();
    const aba = (t) => [...document.querySelectorAll('.best-abas [role="tab"]')].find((b) => b.textContent === t);
    fireEvent.click(aba('Descrição'));
    expect(document.querySelector('.ms-footer')).toBeNull();
    fireEvent.click(aba('Usar'));
    expect(document.querySelector('.ms-footer [data-confirmar="usar"]')).toBeTruthy();
  });

  it('o card do alvo leva o nome completo do personagem (27/09/2026)', () => {
    render(
      <Modal instance={{ instanceId: 'a1', slug: 'pocao', quantidade: 1 }} catalogoBySlug={{ pocao: POCAO }} raca="Humano"
        slotsState={{}} todosItens={[{ instanceId: 'a1', slug: 'pocao', quantidade: 1 }]} containersDisponiveis={[]} pjsHistoria={[]}
        lang="pt" onClose={noop} onEquipar={noop} onDesequipar={noop} onUsar={noop} onDestruir={noop}
        onMoverParaContainer={noop} onTransferir={noop} onTransferReset={noop} onVestir={noop} onDespir={noop}
        onRemoverDoContainer={noop} onAbrirDetalhesFilho={noop} usuario={{ nome: 'Thalia Vento-Norte' }} />,
    );
    expect(document.querySelector('[data-alvo-uso="eu"] .det-opt-nome').textContent).toBe('Thalia Vento-Norte');
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
