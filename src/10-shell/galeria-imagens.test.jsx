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
  { slug: 'mascara_verrogari', nome: 'Máscara Verrogari', base: 'mascara-ferro', slot_equip: 'rosto', grupo: 'Vestimentas' },
  { slug: 'mascara_decorativa', nome: 'Máscara Decorativa', base: 'mascara-ferro', slot_equip: 'rosto', grupo: 'Vestimentas' },
  { slug: 'luva_algodao', nome: 'Luva de Algodão', base: 'luva-pano-algodao', slot_equip: 'pulso', grupo: 'Vestimentas' },
  { slug: 'gaiola', nome: 'Gaiola', base: null, slot_equip: null, grupo: 'Recipientes' },
  { slug: 'livro_de_maira', nome: 'Livro de Maira', base: 'livro-milagres', slot_equip: null, grupo: 'Itens' },
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

describe('o placar conta o que existe de verdade', () => {
  it('"Bases" é o tamanho do vocabulário, não um número escrito à mão', () => {
    abrir();
    expect(celula('Bases')).toBe(String(window.BASES_ITEM.length));
  });
  /* "Pintadas" conta TELAS, não bases (27/10/2026): a base da ARMA é só o
     peso, e o tipo vem do nome do exemplar — três bases cobrem as doze telas
     de espada, arco, lança e machado. "Bases sem arte" segue contando bases:
     é a encomenda seguinte do Figma, e uma base com quatro telas não está
     faltando quatro vezes. */
  it('"Pintadas" conta as telas no disco; "Bases sem arte", as bases sem nenhuma', () => {
    abrir();
    const telas = window.BASES_ITEM.reduce((s, b) => s + window.artesDaBase(b.slug).length, 0);
    const semNenhuma = window.BASES_ITEM.filter((b) => !window.artesDaBase(b.slug).length).length;
    expect(celula('Pintadas')).toBe(String(telas));
    expect(celula('Bases sem arte')).toBe(String(semNenhuma));
  });
  it('a arma pendura mais telas do que tem bases', () => {
    const doPeso = window.artesDaBase('arma-pesado');
    expect(doPeso.length).toBeGreaterThan(1);
    expect(doPeso.map((t) => t.variante)).toContain('Machado');
  });
});

describe('a legenda é o nome da BASE, nunca o do exemplar', () => {
  it('a máscara se chama pelo material, e não "Decorativa"', () => {
    abrir();
    const nomes = nomesNaParede();
    expect(nomes).toContain('Máscara de Ferro');
    expect(nomes).toContain('Máscara de Porcelana');
    expect(nomes).not.toContain('Máscara Decorativa');
    expect(nomes).not.toContain('Máscara Verrogari');
  });
  it('a joia antiga se chama pelo metal — "Brinco de Ouro", não "Brinco Nobre"', () => {
    abrir();
    const nomes = nomesNaParede();
    expect(nomes).toContain('Brinco de Ouro');
    expect(nomes).not.toContain('Brinco Nobre');
  });
  it('a parede inteira sai do vocabulário de bases', () => {
    abrir();
    const doVocabulario = new Set(window.BASES_ITEM.map((b) => b.nome));
    const foraDoVocabulario = nomesNaParede()
      /* A tela de arma leva o tipo depois do nome da base ("Arma Pesada ·
         Machado", 27/10/2026): a base continua mandando na legenda, e o que
         vem depois do ponto é qual das telas dela está na moldura. */
      .map((n) => n.split(' · ')[0])
      .filter((n) => !doVocabulario.has(n))
      // as condições não são bases de item: têm a sua própria lista
      .filter((n) => !['Doença', 'Sono', 'Sede', 'Fome', 'Frio', 'Calor', 'Vício',
        'Loucura', 'Má Fama', 'Peso (guardada)'].includes(n));
    expect(foraDoVocabulario).toEqual([]);
  });
});

describe('a busca filtra a parede', () => {
  it('"coroa" deixa só as três coroas', async () => {
    abrir();
    fireEvent.change(document.querySelector('.gi-barra input'), { target: { value: 'coroa' } });
    await waitFor(() => {
      expect(nomesNaParede()).toEqual(['Coroa de Ouro', 'Coroa de Prata', 'Coroa de Cobre']);
    });
  });
  it('a busca sem resultado diz isso em vez de mostrar a parede vazia', async () => {
    abrir();
    fireEvent.change(document.querySelector('.gi-barra input'), { target: { value: 'zzzz' } });
    await waitFor(() => {
      expect(document.querySelectorAll('.gi-peca').length).toBe(0);
      expect(screen.getAllByText(/Nenhuma base com/).length).toBeGreaterThan(0);
    });
  });
});

describe('o que falta sai do catálogo', () => {
  it('o item sem base nenhuma entra na lista, agrupado pelo grupo', async () => {
    abrir();
    await waitFor(() => expect(screen.getByText(/Gaiola/)).toBeTruthy());
    const linhas = [...document.querySelectorAll('.gi-falta-linha')]
      .map((l) => l.querySelector('.gi-falta-regiao').textContent);
    expect(linhas).toContain('Recipientes');
    // A máscara e o livro têm base pintada: não entram.
    const nomes = [...document.querySelectorAll('.gi-falta-nomes')].map((n) => n.textContent).join(' ');
    expect(nomes).not.toContain('Máscara Verrogari');
    expect(nomes).not.toContain('Livro de Maira');
  });
  it('a base sem pintura aparece com quantos itens ela cobre', async () => {
    abrir();
    await waitFor(() => expect(document.querySelectorAll('.gi-base-linha').length).toBeGreaterThan(0));
    const linha = [...document.querySelectorAll('.gi-base-linha')]
      .find((l) => l.querySelector('.gi-base-nome').textContent === 'Luva de Algodão');
    expect(linha, 'a base sem arte da luva de pano está na lista').toBeTruthy();
    expect(linha.querySelector('.mn-quadro-num').textContent).toBe('1');
  });
});

describe('as faixas', () => {
  it('"Condições" esconde as bases', async () => {
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Condições' }));
    await waitFor(() => {
      expect(screen.queryByText('Elmo Pesado')).toBeNull();
      expect(screen.getByText('Loucura')).toBeTruthy();
    });
  });
});

/* O UserMenu não é um global, então o que dá para afirmar é o contrato na
   fonte — mesmo caminho de armadura-karma-ficha.test.jsx. O que importa aqui
   é o LUGAR ("abaixo de Paleta") e quem vê. */
describe('a entrada no menu do usuário', () => {
  it('fica abaixo de Paleta e acima de Convites', () => {
    const paleta = shellFonte.indexOf("lang === 'en' ? 'Palette' : 'Paleta'");
    const imagens = shellFonte.indexOf("lang === 'en' ? 'Images' : 'Imagens'");
    const convites = shellFonte.indexOf("lang === 'en' ? 'Invites' : 'Convites'");
    expect(paleta).toBeGreaterThan(-1);
    expect(imagens).toBeGreaterThan(paleta);
    expect(convites).toBeGreaterThan(imagens);
  });
  it('é só do Mestre — a galeria é pauta de produção', () => {
    const i = shellFonte.indexOf("lang === 'en' ? 'Images' : 'Imagens'");
    expect(shellFonte.slice(i - 400, i)).toMatch(/onImagens && profile === 'master'/);
  });
  it('o modal é montado quando a entrada é clicada', () => {
    expect(shellFonte).toMatch(/onImagens=\{\(\) => \{ setUserMenuOpen\(false\); setImagensAberto\(true\); \}\}/);
    expect(shellFonte).toMatch(/imagensAberto && typeof GaleriaImagensModal !== 'undefined'/);
  });
});
