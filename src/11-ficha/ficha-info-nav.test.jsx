/* ============================================================
   ficha-info-nav.test.jsx — a Identificação da ficha, tudo à vista
   ============================================================
   04/11/2026, pedido do usuário: "No menu identificação, eu não quero mais
   abas internas, quero que todos os campos apareçam sem precisar navegar":
     Coluna 1  Identificação · Armas
     Coluna 2  Caracterizações · Atributos
     Coluna 3  Habilidades Aperfeiçoadas · Derivadas · Grupo de Armas
   No mesmo pedido o Conhecimento saiu ("Não precisamos mais das colunas
   habilidades, técnicas, magias, na aba Conhecimento"): as três são páginas
   de casas do trilho (paginas-ficha.jsx).

   A regressão da seta que não respondia ao clique (ColTitleNav declarado
   dentro do pai) segue travada em ficha-animais.test.jsx: a ficha do bicho
   é quem ainda usa a seta.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './ficha.jsx';

let FichaInfoView;
beforeAll(() => {
  FichaInfoView = window.FichaInfoView;
  expect(FichaInfoView, 'FichaInfoView precisa estar no window').toBeDefined();
});

afterEach(() => cleanup());

function props(over) {
  return {
    pj: {
      nome: 'Yuldrous', sobrenome: 'Ferro', raca: 'Anão', genero: 'M',
      profissao: 'Sacerdote', especializacao: null, reino: null, deus: null,
      caracterizacao: {},
    },
    en: false,
    atributosFinais: {
      intelecto: 2, aura: 1, carisma: 0, forca: 2, fisico: 2, percepcao: 1, agilidade: 1,
    },
    derivadas: {},
    estagioNum: 1,
    xpTotal: 0,
    velocidade: 5,
    pesoPersonagem: null,
    alturaPersonagem: null,
    titulo: null,
    historiaPj: null,
    ...over,
  };
}

function montar(over) {
  return render(<FichaInfoView {...props(over)} />);
}

const colunas = () => [...document.querySelectorAll('.fp-info-grid > div')]
  .map((col) => [...col.querySelectorAll('.fp-col-title-main')].map((t) => t.textContent));
const secao = (titulo) => [...document.querySelectorAll('.fp-col-title-main')]
  .find((e) => e.textContent === titulo).closest('.fp-info-secao');

describe('FichaInfoView — Identificação sem páginas internas', () => {
  it('as três colunas, com as seções na ordem pedida', () => {
    montar();
    expect(colunas()).toEqual([
      ['Identificação', 'Armas'],
      ['Caracterizações', 'Atributos'],
      ['Habilidades Aperfeiçoadas', 'Derivadas', 'Grupo de Armas'],
    ]);
  });

  it('não há seta nem traços de página: nada para navegar', () => {
    montar();
    expect(document.querySelector('.fp-col-title-nav-btn')).toBeNull();
    expect(document.querySelector('.fp-col-title-dots')).toBeNull();
  });

  it('todos os campos aparecem de uma vez', () => {
    montar({ pj: { ...props().pj, grupos_armas: { CmL: 2 } } });
    const txt = document.body.textContent;
    expect(secao('Identificação').textContent).toContain('Yuldrous');
    expect(secao('Atributos').textContent).toContain('Intelecto');
    expect(secao('Derivadas').textContent).toContain('Velocidade');
    expect(secao('Grupo de Armas').textContent).toMatch(/2/);
    expect(txt).toContain('Nenhuma caracterização.');
    expect(txt).toContain('Nenhuma arma equipada.');
  });

  it('Habilidades Aperfeiçoadas junta idiomas, religião, arte e sabedoria', () => {
    montar({ pj: { ...props().pj, reino: 'Portis', aprimoramentos: { religiao: ['Blator'], arte: ['Música'] } } });
    const txt = secao('Habilidades Aperfeiçoadas').textContent;
    expect(txt).toContain('Khuzdul');
    expect(txt).toContain('Nativo');
    expect(txt).toContain('Blator');
    expect(txt).toContain('Música');
  });
});

/* ARMAS (30/10/2026, usuário: "terá as armas equipadas do personagem e seu
   dano máximo"). O dano máximo é o da batalha: catálogo + Força + Sagração. */
describe('a seção Armas', () => {
  const CAT = {
    marreta: { slug: 'marreta', nome: 'Marreta', grupo: 'Armas', dano: 30 },
    escudo: { slug: 'escudo', nome: 'Escudo', grupo: 'Armaduras' },
    adaga: { slug: 'adaga', nome: 'Adaga', grupo: 'Armas', dano: 12 },
  };
  const comArmas = (itens) => ({
    catalogoBySlug: CAT,
    pj: { ...props().pj, inventario: { itens } },
  });

  it('lista as armas das mãos com o dano máximo (catálogo + Força + Sagração)', () => {
    montar(comArmas([
      { instanceId: 'm', slug: 'marreta', equipado: true, slot: 'mao_d', bonus: 5 },
      { instanceId: 'e', slug: 'escudo', equipado: true, slot: 'mao_e' },
      { instanceId: 'a', slug: 'adaga', equipado: false, slot: null },
    ]));
    const texto = secao('Armas').textContent;
    // Força 2: 30 + 2 + 5. Sem ajuste nem grupo, L/M/P = o do catálogo (0).
    expect(texto).toMatch(/Marreta \+5\s*L0M0P0Dano37/);
    expect(texto).not.toMatch(/Escudo/);    // sem dano, não é arma
    expect(texto).not.toMatch(/Adaga/);     // na mochila, não conta
  });

  /* L/M/P junto do dano (07/11/2026): a coluna da batalha — catálogo + ajuste
     × 2 + o nível no grupo da arma (o bonus_ga de colunaAtaque). */
  it('mostra o L/M/P da arma: catálogo + ajuste × 2 + grupo de armas', () => {
    const cat = { ...CAT, espada: { slug: 'espada', nome: 'Espada', grupo: 'Armas', dano: 20,
      dano_l: 5, dano_m: 3, dano_p: 1, ajuste_atributo: 'FOR', grupo_armas: 'CmM' } };
    montar({ catalogoBySlug: cat, pj: { ...props().pj, grupos_armas: { CmM: 3 },
      inventario: { itens: [{ instanceId: 's', slug: 'espada', equipado: true, slot: 'mao_d' }] } } });
    // Força 2 → +4 de ajuste; grupo +3: L 5+4+3, M 3+4+3, P 1+4+3; dano 20 + 2.
    expect(secao('Armas').textContent).toMatch(/EspadaL12M10P8Dano22/);
  });

  it('sem arma nas mãos, diz que não há', () => {
    montar(comArmas([]));
    expect(secao('Armas').textContent).toMatch(/Nenhuma arma equipada\./);
  });
});

/* O Conhecimento do PERSONAGEM saiu; Técnicas entrou no trilho. */
describe('o trilho da ficha', () => {
  const fonte = readFileSync(resolve(__dirname, 'ficha.jsx'), 'utf8');
  it('sem Conhecimento e com Técnicas entre Habilidades e Magias', () => {
    expect(fonte).not.toMatch(/botaoPagina\('conhecimento'/);
    expect(fonte).not.toMatch(/data-aba-ficha="conhecimento"/);
    const hab = fonte.indexOf("botaoPagina('habilidades'");
    const tec = fonte.indexOf("botaoPagina('tecnicas', 'ti-sword', 'Técnicas', 'Techniques')");
    const mag = fonte.indexOf("botaoPagina('magias'");
    expect(tec).toBeGreaterThan(hab);
    expect(mag).toBeGreaterThan(tec);
    // 05/11/2026: a página também recebe onSubir (o "Subir nível").
    expect(fonte).toMatch(/<PaginaTecnicas lang=\{lang\} tecnicas=\{paginaTecnicas\} pontos=\{pontosDaPagina\}/);
  });
});
