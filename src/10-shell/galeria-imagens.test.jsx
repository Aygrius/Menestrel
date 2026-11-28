/* ============================================================
   galeria-imagens.test.jsx — a página "Imagens" do Mestre
   ============================================================
   Pedido do usuário em 25/10/2026: "Adicione a página [das pinturas] no nosso
   sistema para controle do mestre, abaixo de Paleta, chamado Imagens."

   E o que reorganizou a página em 26/10/2026: "Os ícones de máscara estão
   vindo escrito 'Máscara Decorativa'… existe a base do item, por exemplo
   'Máscara de Ouro', e existe o exemplar do item."

   É esse o bug que esta página tinha: rótulos digitados à mão, com nome de
   EXEMPLAR na legenda de uma pintura de BASE. Agora a parede é desenhada a
   partir de window.BASES_ITEM, e o placar conta o que existe de verdade —
   nada é digitado duas vezes.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, screen, waitFor, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const shellFonte = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'shell.jsx'), 'utf8',
);

const CAT = [
  { slug: 'mascara_verrogari', nome: 'Máscara Verrogari', base: 'mascara-latao', slot_equip: 'rosto', grupo: 'Vestimentas' },
  { slug: 'mascara_decorativa', nome: 'Máscara Decorativa', base: 'mascara-latao', slot_equip: 'rosto', grupo: 'Vestimentas' },
  // O lenço ganhou pintura em 27/11/2026; o teste da base sem pintura a tira do conjunto por um instante.
  { slug: 'lenco_algodao', nome: 'Lenço de Algodão', base: 'lenco-algodao', slot_equip: 'pescoco', grupo: 'Vestimentas' },
  { slug: 'avestruz_pardo', nome: 'Avestruz Pardo', base: null, slot_equip: null, grupo: 'Animais' },
  { slug: 'livro_de_maira', nome: 'Livro de Maira', base: 'livro-milagres', slot_equip: null, grupo: 'Itens' },
  // Armas: uma moldura por arma (28/11/2026).
  { slug: 'espada_longa', nome: 'Espada Longa', base: 'arma-medio', slot_equip: 'mao', grupo: 'Armas', categoria_equip: 'arma', grupo_armas: 'CM' },
  { slug: 'maca_de_guerra', nome: 'Maça de Guerra', base: 'arma-medio', slot_equip: 'mao', grupo: 'Armas', categoria_equip: 'arma', grupo_armas: 'EM' },
];

beforeAll(async () => {
  const tabela = () => {
    const b = {
      select: () => b, eq: () => b, order: () => b, limit: () => b,
      single: async () => ({ data: null, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      then: (ok, falha) => Promise.resolve({ data: CAT, error: null }).then(ok, falha),
    };
    return b;
  };
  globalThis.supabaseClient = {
    from: tabela,
    rpc: async () => ({ data: [], error: null }),
    channel: () => { const ch = { on: () => ch, subscribe: () => ch }; return ch; },
    removeChannel: () => {},
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
  };

  await import('../01-core/copy.jsx');
  await import('../01-core/constants.jsx');
  await import('../01-core/helpers.jsx');
  await import('../01-core/inventario-helpers.jsx');
  await import('../01-core/bases-item.jsx');
  await import('../01-core/arte-criatura.jsx');
  await import('../01-core/select-pill.jsx');
  await import('../01-core/clima-desgaste.jsx');
  await import('../01-core/game-data.jsx');
  await import('../01-core/forma-raca.jsx');
  await import('../01-core/tecnicas-efeito.jsx');
  await import('../01-core/magias-efeito.jsx');
  await import('../01-core/status-efeito.jsx');
  await import('../01-core/efeito-temporario.jsx');
  await import('../01-core/fabricacao.jsx');
  await import('../09-bestiario/criatura-formulas.jsx');
  await import('../12-batalha/batalha.jsx');
  await import('./shell.jsx');
  await import('../07-inventario/inventario.jsx');
  await import('../11-ficha/atalhos-ficha.jsx');
  await import('../11-ficha/ficha.jsx');
  await import('./galeria-imagens.jsx');
});

afterEach(cleanup);

const abrir = () => render(<window.GaleriaImagensModal lang="pt" onClose={() => {}} />);
const celula = (rotulo) => screen.getByText(rotulo, { selector: '.mn-rotulo' })
  .closest('.mn-celula').querySelector('.mn-celula-valor').textContent;
const nomesNaParede = () => [...document.querySelectorAll('.gi-nome')].map((n) => n.textContent);

/* A PAREDE SAI DO CATÁLOGO (28/11/2026). Usuário: "Ainda está aparecendo
   máscara de prata, etc. […] Não tem como essa página de imagens só mostrar
   os itens que existem? As armas não vão mostrar por tipo, vão mostrar por
   arma." */
const carregada = () => waitFor(() => expect(document.querySelectorAll('.gi-peca').length).toBeGreaterThan(0));

describe('a parede mostra só o que o catálogo usa', () => {
  it('a base sem item nenhum não aparece — só a que algum exemplar usa', async () => {
    abrir();
    await carregada();
    const nomes = nomesNaParede();
    expect(nomes).toContain('Máscara de Latão');
    for (const fora of ['Máscara de Marfim', 'Coroa de Ouro', 'Tiara de Prata', 'Elmo Pesado']) {
      expect(nomes, fora).not.toContain(fora);
    }
  });
  it('a pintura aparece uma vez, com quantos itens a usam e, no balão, quais', async () => {
    abrir();
    await carregada();
    const mascara = [...document.querySelectorAll('.gi-peca')]
      .find((p) => p.querySelector('.gi-nome').textContent === 'Máscara de Latão');
    expect(mascara.querySelector('.gi-arq').textContent).toBe('2 itens');
    fireEvent.mouseEnter(mascara);
    await waitFor(() => expect(screen.getByText('Máscara Decorativa · Máscara Verrogari')).toBeTruthy());
    expect(nomesNaParede().filter((n) => n === 'Máscara de Latão')).toHaveLength(1);
  });
  it('as armas aparecem uma a uma, pelo nome da arma', async () => {
    abrir();
    await carregada();
    const sec = [...document.querySelectorAll('.gi-sec')].find((s) => s.querySelector('.gi-sec-titulo').textContent === 'Armas');
    const nomes = [...sec.querySelectorAll('.gi-nome')].map((n) => n.textContent);
    expect(nomes).toEqual(['Espada Longa', 'Maça de Guerra']);
    const img = [...sec.querySelectorAll('.gi-peca')].map((p) => p.querySelector('img').getAttribute('src'));
    expect(img).toEqual(['/equip/arma-espada-medio.webp', '/equip/arma-maca-medio.webp']);
  });
  it('o placar conta pinturas e itens do catálogo', async () => {
    abrir();
    await carregada();
    expect(celula('Itens pintados')).toBe(String(CAT.length - 1));   // o avestruz não tem pintura
    expect(celula('Itens sem pintura')).toBe('1');
    expect(celula('Criaturas')).toBe(String(window.rostosDeCriatura().length));
  });
  it('as imagens do sistema seguem na parede: criaturas, condições e energias', async () => {
    abrir();
    await carregada();
    const srcs = new Set([...document.querySelectorAll('.gi-peca img')].map((i) => i.getAttribute('src')));
    expect(srcs.has('/criaturas/enviado.webp')).toBe(true);
    expect(srcs.has('/cond/cond-sono.webp')).toBe(true);
    expect(srcs.has('/energia/gema-rubi.webp')).toBe(true);
  });
});

describe('a busca filtra a parede', () => {
  it('procura também pelos itens da pintura', async () => {
    abrir();
    await carregada();
    fireEvent.change(document.querySelector('.gi-barra input'), { target: { value: 'verrogari' } });
    await waitFor(() => expect(nomesNaParede()).toEqual(['Máscara de Latão']));
  });
  it('a busca sem resultado diz isso em vez de mostrar a parede vazia', async () => {
    abrir();
    await carregada();
    fireEvent.change(document.querySelector('.gi-barra input'), { target: { value: 'zzzz' } });
    await waitFor(() => {
      expect(document.querySelectorAll('.gi-peca').length).toBe(0);
      expect(screen.getAllByText(/Nenhuma pintura com/).length).toBeGreaterThan(0);
    });
  });
});

describe('o que falta sai do catálogo', () => {
  it('o item sem pintura entra na lista, agrupado pelo grupo', async () => {
    abrir();
    await waitFor(() => expect(screen.getByText(/Avestruz Pardo/)).toBeTruthy());
    const linhas = [...document.querySelectorAll('.gi-falta-linha')]
      .map((l) => l.querySelector('.gi-falta-regiao').textContent);
    expect(linhas).toContain('Animais');
    const nomes = [...document.querySelectorAll('.gi-falta-nomes')].map((n) => n.textContent).join(' ');
    expect(nomes).not.toContain('Máscara Verrogari');
    expect(nomes).not.toContain('Livro de Maira');
  });
});

describe('as faixas', () => {
  it('"Condições" esconde os itens', async () => {
    abrir();
    await carregada();
    fireEvent.click(screen.getByRole('button', { name: 'Condições' }));
    await waitFor(() => {
      expect(screen.queryByText('Máscara de Latão')).toBeNull();
      expect(screen.getByText('Loucura')).toBeTruthy();
    });
  });
  it('"Armas" mostra só as armas', async () => {
    abrir();
    await carregada();
    fireEvent.click(screen.getByRole('button', { name: 'Armas' }));
    await waitFor(() => expect(nomesNaParede()).toEqual(['Espada Longa', 'Maça de Guerra']));
  });
});

/* O UserMenu não é um global, então o que dá para afirmar é o contrato na
   fonte — mesmo caminho de armadura-karma-ficha.test.jsx. O que importa aqui
   é o LUGAR ("abaixo de Paleta") e quem vê. */
describe('a entrada no menu do usuário', () => {
  /* Nas Configurações (11/11/2026, usuário: "Os testes de combate, imagens e
     perfil também vão ficar dentro de configurações"). */
  it('saiu do menu da conta e mora nas Configurações', () => {
    const cfg = shellFonte.indexOf('function ConfiguracoesModal(');
    const menu = shellFonte.slice(shellFonte.indexOf('function UserMenu('), cfg);
    expect(menu).not.toMatch(/'Imagens'/);
    expect(shellFonte.indexOf("en ? 'Images' : 'Imagens'", cfg)).toBeGreaterThan(cfg);
  });
  it('é só do Mestre — a galeria é pauta de produção', () => {
    // Do Imperador desde 15/11/2026: Nobres e Conselheiros também mestram.
    expect(shellFonte).toMatch(/const ferramentasMestre = profile === 'master' && ehImperador;/);
  });
  it('o modal é montado quando a entrada é clicada', () => {
    expect(shellFonte).toMatch(/onImagens=\{\(\) => setImagensAberto\(true\)\}/);
    expect(shellFonte).toMatch(/imagensAberto && typeof GaleriaImagensModal !== 'undefined'/);
  });
});

/* "Lista na página imagens, as imagens que estão sobrando" (28/11/2026). */
describe('a seção Sobrando', () => {
  it('lista a pintura registrada que nenhum item usa, e não a que algum usa', async () => {
    abrir();
    await carregada();
    fireEvent.click(screen.getByRole('button', { name: 'Sobrando' }));
    await waitFor(() => expect(document.querySelectorAll('.gi-peca').length).toBeGreaterThan(0));
    const srcs = [...document.querySelectorAll('.gi-peca img')].map((i) => i.getAttribute('src'));
    expect(srcs).toContain('/equip/mascara-couro.webp');      // nenhum item é máscara de couro
    expect(srcs).not.toContain('/equip/mascara-ferro.webp');  // a máscara de latão usa
    expect(srcs).not.toContain('/equip/arma-espada-medio.webp'); // a Espada Longa usa
  });
});
