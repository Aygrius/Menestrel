/* ============================================================
   ficha-info-nav.test.jsx — a setinha de navegação da aba Informações
   responde ao clique mesmo dentro da sequência real de eventos de um clique
   ============================================================
   Sintoma reportado: "a setinha aparece e não responde ao clique" na aba
   Informações da ficha. Causa raiz confirmada: `ColTitleNav` era declarado
   DENTRO de `FichaInfoView`, o que faz dele um tipo de componente novo a
   cada render — React desmonta/remonta a subárvore inteira sempre que
   `FichaInfoView` re-renderiza.

   ATENÇÃO — investigação corrigiu um detalhe da causa original: o botão
   tem DOIS `onMouseEnter` na mesma tag (um vindo de `{...propsTip(...)}`,
   outro literal logo abaixo, só de estilo). Em JS, a prop que vem depois
   por escrito GANHA — então o `onMouseEnter` do `propsTip` nunca roda de
   verdade; um `fireEvent.mouseEnter` sozinho NÃO abre o tooltip nem
   dispara `setTip` (confirmado empiricamente; ver relatório). O gatilho
   real é outro: propsTip também devolve `onFocus` (esse não tem duplicata
   e não é sobrescrito) — e em qualquer navegador real, mousedown num
   <button> foca o elemento ANTES do click dispersar (mousedown → foco →
   mouseup → click). Esse foco chama `abrirTip` → `setTip` → re-render →
   `ColTitleNav` remonta → o nó que recebeu o mousedown vira órfão antes do
   click completar. Ou seja: o problema acontece em QUALQUER clique de
   mouse no botão, não só depois de passar o mouse antes — a "sequência
   real do usuário" que dispara o bug é o próprio clique.

   Por isso o teste reproduz mousedown→focus→mouseup→click no MESMO nó
   capturado ANTES da sequência (como o navegador faz de verdade) — um
   fireEvent.click seco não pega o bug, porque dispara o evento direto no
   nó atual sem passar pela fase de foco que o remonte intercepta.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
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

// Props mínimas para montar a view. Col 1 (Identidade) sempre tem pelo menos
// duas páginas (Identidade → Atributos), então `multi` já é true sem
// precisar de caracterizações — é a coluna mais fácil de encher (ver
// ficha.jsx ~1146-1152).
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
    catalogoHab: [],
    catalogoMag: [],
    catalogoTec: [],
    habsByKey: {},
    pjHabilidades: {},
    pjMagias: {},
    pjTecnicas: {},
    nivelMagiaEfetivoFn: () => 0,
    totalHabilidadeFn: () => 0,
    totalTecnicaFn: () => 0,
    bonusHabilidades: {},
    titulo: null,
    historiaPj: null,
    ...over,
  };
}

function montar(over) {
  return render(<FichaInfoView {...props(over)} />);
}

describe('FichaInfoView — seta de navegação (ColTitleNav)', () => {
  it('clique SEM hover antes funciona (caminho simples, sem regressão)', () => {
    montar();
    const btn = document.querySelector('.fp-col-title-nav-btn');
    expect(btn).toBeTruthy();
    const rotuloAntes = document.querySelector('.fp-col-title-main').textContent;

    fireEvent.click(btn);

    expect(document.querySelector('.fp-col-title-main').textContent).not.toBe(rotuloAntes);
  });

  it('a sequência real de um clique de mouse (mousedown→foco→mouseup→click) avança a página', () => {
    montar();
    const btn = document.querySelector('.fp-col-title-nav-btn');
    expect(btn).toBeTruthy();
    const rotuloAntes = document.querySelector('.fp-col-title-main').textContent;

    // Sequência real do navegador ao clicar num <button>: mousedown foca o
    // elemento (o jsdom não faz isso sozinho, por isso o fireEvent.focus
    // explícito) ANTES do mouseup/click. `abrirTip` está pendurado em
    // onFocus via propsTip — se isso disparar `setTip` e ColTitleNav
    // remontar, `btn` vira nó órfão e mouseup/click, despachados nele,
    // não alcançam mais o onClick do botão vivo no DOM.
    fireEvent.mouseEnter(btn);
    fireEvent.mouseDown(btn);
    fireEvent.focus(btn);
    fireEvent.mouseUp(btn);
    fireEvent.click(btn);

    expect(document.querySelector('.fp-col-title-main').textContent).not.toBe(rotuloAntes);
  });
});

/* "Em informações, mostre todas as habilidades, mesmo as que o jogador não
   tenha aprendido ainda." (usuário, 14/09/2026) */
describe('FichaInfoView — Habilidades mostra o catálogo inteiro', () => {
  const HABS = [
    { key: 'furtividade', nome: 'Furtividade', grupo: 'Subterfúgio' },
    { key: 'escapar',     nome: 'Escapar',     grupo: 'Subterfúgio' },
    { key: 'oratoria',    nome: 'Oratória',    grupo: 'Influência' },
  ];
  const linhas = () => {
    // O título da coluna é o grupo aberto (27/09/2026): "Habilidades de Subterfúgio".
    const col = [...document.querySelectorAll('.fp-col-title-main')]
      .find((el) => el.textContent.startsWith('Habilidades')).closest('.fp-col-title-nav').parentElement;
    return [...col.querySelectorAll('.fp-row')];
  };

  it('a não aprendida aparece, apagada, com o total que daria', () => {
    montar({
      parte: 'conhecimento',
      catalogoHab: HABS,
      pjHabilidades: { furtividade: 2 },
      totalHabilidadeFn: (key) => (key === 'furtividade' ? 4 : -1),
    });
    const rows = linhas();
    expect(rows.map((r) => r.querySelector('.fp-row-label').textContent)).toEqual(['Furtividade', 'Escapar']);
    expect(rows.map((r) => r.querySelector('.fp-row-value').textContent)).toEqual(['4', '-1']);
    expect(rows[0].classList.contains('fp-row--nao-aprendida')).toBe(false);
    expect(rows[1].classList.contains('fp-row--nao-aprendida')).toBe(true);
  });

  it('grupo sem nenhuma habilidade aprendida também tem página', () => {
    montar({ parte: 'conhecimento', catalogoHab: HABS, pjHabilidades: {} });
    const titulos = [...document.querySelectorAll('.fp-col-title-main')].map((s) => s.textContent);
    expect(titulos).toContain('Habilidades de Subterfúgio');
    expect(document.body.textContent).not.toMatch(/Nenhuma habilidade\./);
  });
});

/* 26/09/2026 — Informações virou duas abas, três colunas cada:
   Personagem: Identidade (Identificação, Caracterizações) · Atributos (sem
   submenu) · Complemento (Derivadas, Grupo de Armas, Habilidades
   Aperfeiçoadas). Conhecimento: Habilidades (seis grupos) · Técnicas
   (Básicas, Avançadas) · Magias (Básicas, Avançadas). */
describe('FichaInfoView — Personagem e Conhecimento', () => {
  const colunas = () => [...document.querySelectorAll('.fp-col-title-main')].map((e) => e.textContent);
  const colDe = (titulo) => [...document.querySelectorAll('.fp-col-title-main')]
    .find((e) => e.textContent === titulo).closest('.fp-col-title-nav');
  const subsDe = (titulo) => {
    const col = colDe(titulo);
    const btn = col.querySelector('.fp-col-title-nav-btn');
    const vistos = [];
    for (let i = 0; i < 8; i++) {
      const sub = col.querySelector('.fp-col-title-sub');
      const t = sub ? sub.textContent : null;
      if (vistos.includes(t)) break;
      vistos.push(t);
      fireEvent.click(btn);
    }
    return vistos;
  };

  it('Personagem: as três colunas e seus submenus', () => {
    montar({ parte: 'personagem' });
    /* 27/09/2026 ("faça o mesmo em 'personagem'"): a página aberta é o
       título, como no Conhecimento; sem subtítulo. */
    expect(colunas()).toEqual(['Identificação', 'Atributos', 'Derivadas']);
    expect(document.querySelector('.fp-col-title-sub')).toBeNull();
    const titulosAoAvancar = (i) => {
      const vistos = [];
      for (let k = 0; k < 8; k++) {
        const t = colunas()[i];
        if (vistos.includes(t)) break;
        vistos.push(t);
        fireEvent.click(document.querySelectorAll('.fp-col-title-nav-btn')[i]);
      }
      return vistos;
    };
    expect(titulosAoAvancar(0)).toEqual(['Identificação', 'Caracterizações']);
    expect(titulosAoAvancar(1)).toEqual(['Atributos']);   // sem submenu
    expect(titulosAoAvancar(2)).toEqual(['Derivadas', 'Grupo de Armas', 'Habilidades Aperfeiçoadas']);
  });

  it('Conhecimento: Habilidades, Técnicas e Magias, mesmo sem nada comprado', () => {
    montar({
      parte: 'conhecimento',
      catalogoHab: ['Profissional', 'Subterfúgio', 'Manobra', 'Influência', 'Conhecimento', 'Geral']
        .map((g, i) => ({ key: 'h' + i, nome: 'H' + i, grupo: g })),
    });
    /* 27/09/2026: "'habilidades profissionais', 'habilidades de influência'
       será o título ao invés de 'habilidades'. Em técnicas, será 'técnicas
       básicas'. 'Magias básicas'." A página aberta É o título; sem subtítulo. */
    expect(colunas()).toEqual(['Habilidades Profissionais', 'Técnicas Básicas', 'Magias Básicas']);
    expect(document.querySelector('.fp-col-title-sub')).toBeNull();
    const titulosAoAvancar = (i) => {
      const vistos = [];
      for (let k = 0; k < 8; k++) {
        const t = colunas()[i];
        if (vistos.includes(t)) break;
        vistos.push(t);
        fireEvent.click(document.querySelectorAll('.fp-col-title-nav-btn')[i]);
      }
      return vistos;
    };
    expect(titulosAoAvancar(0)).toEqual(['Habilidades Profissionais', 'Habilidades de Subterfúgio', 'Habilidades de Manobra',
      'Habilidades de Influência', 'Habilidades de Conhecimento', 'Habilidades Gerais']);
    expect(titulosAoAvancar(1)).toEqual(['Técnicas Básicas', 'Técnicas Avançadas']);
    // Por TIPO desde 22/10/2026 (a permissão, que dizia 'avançada', saiu das magias).
    expect(titulosAoAvancar(2)).toEqual(['Magias Básicas', 'Magias Perdidas e Ancestrais']);
  });

  it('Habilidades Aperfeiçoadas junta idiomas, religião, arte e sabedoria', () => {
    montar({ pj: { ...props().pj, reino: 'Portis', aprimoramentos: { religiao: ['Blator'], arte: ['Música'] } } });
    const col = colDe('Derivadas');   // a coluna abre na 1ª página, que é o título
    fireEvent.click(col.querySelector('.fp-col-title-nav-btn'));
    fireEvent.click(col.querySelector('.fp-col-title-nav-btn'));
    const txt = col.parentElement.textContent;
    expect(txt).toContain('Khuzdul');
    expect(txt).toContain('Nativo');
    expect(txt).toContain('Blator');
    expect(txt).toContain('Música');
  });
});

/* "No menu 'conhecimento' dentro de ficha, ao clicar em cada habilidade,
   magia, técnica, será possível abrir o modal com a descrição." (26/09/2026) */
describe('FichaInfoView — Conhecimento abre o detalhe', () => {
  it('habilidade, técnica e magia avisam qual foi clicada (clique e Enter)', () => {
    const abertas = [];
    montar({
      parte: 'conhecimento',
      catalogoHab: [{ key: 'furtividade', nome: 'Furtividade', grupo: 'Profissional' }],
      catalogoTec: [{ key: 'golpe', nome: 'Golpe Duplo', tipo: 'Básica' }],
      catalogoMag: [{ key: 'luz', nome: 'Luz', permissao: 'Mago' }],
      pjTecnicas: { golpe: 1 }, pjMagias: { luz: 1 },
      onAbrirHabilidade: (k) => abertas.push('hab:' + k),
      onAbrirTecnica: (k) => abertas.push('tec:' + k),
      onAbrirMagia: (k) => abertas.push('mag:' + k),
    });
    const linha = (nome) => [...document.querySelectorAll('.fp-row--abre')]
      .find((r) => r.querySelector('.fp-row-label').textContent === nome);
    fireEvent.click(linha('Furtividade'));
    fireEvent.click(linha('Golpe Duplo'));
    fireEvent.keyDown(linha('Luz'), { key: 'Enter' });
    expect(abertas).toEqual(['hab:furtividade', 'tec:golpe', 'mag:luz']);
    expect(linha('Luz').getAttribute('role')).toBe('button');
  });
});

/* Páginas de magia por tipo (22/10/2026): Básicas; Perdidas e Ancestrais. */
describe('FichaInfoView — magias por tipo', () => {
  it('a Perdida vai para a segunda página', () => {
    montar({ parte: 'conhecimento', pjMagias: { luz: 1, voo: 1 },
      catalogoMag: [{ key: 'luz', nome: 'Luz', tipo: 'Básica' }, { key: 'voo', nome: 'Vôo', tipo: 'Perdida' }] });
    const col = () => document.querySelectorAll('.fp-col-title-nav-btn')[2].closest('.fp-col-pad-r');
    expect(col().textContent).toMatch(/Luz/);
    expect(col().textContent).not.toMatch(/Vôo/);
    fireEvent.click(document.querySelectorAll('.fp-col-title-nav-btn')[2]);
    expect(col().textContent).toMatch(/Vôo/);
  });
});

/* Reforma de 22/10/2026: magia se aprende pelo item, de qualquer profissão;
   a ficha mostra o orçamento — pontos de magia gastos / total. */
describe('FichaInfoView — pontos de magia', () => {
  it('Guerreiro Int 1 Aura 0 no estágio 2: Luz 1 gasta 1 de 4', () => {
    montar({
      parte: 'conhecimento',
      pj: { nome: 'Thalia', profissao: 'Guerreiro', intelecto_base: 1, aura_base: 0, magias: { luz: 1 }, caracterizacao: {} },
      estagioNum: 2,
      catalogoMag: [{ key: 'luz', nome: 'Luz', custo: 1 }],
      pjMagias: { luz: 1 },
    });
    expect(document.querySelector('.fp-col-pontos').textContent).toMatch(/1\s*\/\s*4/);
  });
});

/* A fila de treino já foi paga (22/10/2026): o gasto da ficha conta o nível
   em treino, como a janela Estudar e a RPC aprender_magia. */
describe('FichaInfoView — pontos de magia com a fila', () => {
  it('Luz 1 sabida + Luz 2 (nível 3) em treino gasta 3', () => {
    montar({
      parte: 'conhecimento',
      pj: { nome: 'Thalia', profissao: 'Mago', intelecto_base: 0, aura_base: 0, magias: { luz: 1 }, caracterizacao: {},
        treinos: [{ id: 'a', tipo: 'magia', key: 'luz', nivel: 2, atividade: 'estudando', horas_restantes: 24 }] },
      estagioNum: 3,
      catalogoMag: [{ key: 'luz', nome: 'Luz', custo: 1 }],
      pjMagias: { luz: 1 },
    });
    expect(document.querySelector('.fp-col-pontos').textContent).toMatch(/3\s*\/\s*24/);
  });
});

/* Técnicas Avançadas = tipo Especializada (22/10/2026): a permissão saiu. */
describe('FichaInfoView — técnicas pelo tipo', () => {
  it('Especializada vai para Técnicas Avançadas; a permissão não conta', () => {
    montar({ parte: 'conhecimento', pjTecnicas: { golpe: 1, furia: 1 },
      catalogoTec: [
        { key: 'golpe', nome: 'Golpe Duplo', tipo: 'Básica', permissao: 'Academia de Soldados' },
        { key: 'furia', nome: 'Fúria', tipo: 'Especializada' },
      ] });
    const col = () => document.querySelectorAll('.fp-col-title-nav-btn')[1].closest('.fp-col-pad, .fp-col-pad-r, div');
    const texto = () => document.body.textContent;
    expect(texto()).toMatch(/Golpe Duplo/);
    expect(texto()).not.toMatch(/Fúria/);
    fireEvent.click(document.querySelectorAll('.fp-col-title-nav-btn')[1]);
    expect(texto()).toMatch(/Fúria/);
    expect(texto()).not.toMatch(/Golpe Duplo/);
  });
});
