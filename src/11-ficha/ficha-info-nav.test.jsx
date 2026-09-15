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
    const rotuloAntes = document.querySelector('.fp-col-title-sub').textContent;

    fireEvent.click(btn);

    expect(document.querySelector('.fp-col-title-sub').textContent).not.toBe(rotuloAntes);
  });

  it('a sequência real de um clique de mouse (mousedown→foco→mouseup→click) avança a página', () => {
    montar();
    const btn = document.querySelector('.fp-col-title-nav-btn');
    expect(btn).toBeTruthy();
    const rotuloAntes = document.querySelector('.fp-col-title-sub').textContent;

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

    expect(document.querySelector('.fp-col-title-sub').textContent).not.toBe(rotuloAntes);
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
    const col = [...document.querySelectorAll('.fp-col-title-main')]
      .find((el) => el.textContent === 'Habilidades').closest('.fp-col-title-nav').parentElement;
    return [...col.querySelectorAll('.fp-row')];
  };

  it('a não aprendida aparece, apagada, com o total que daria', () => {
    montar({
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
    montar({ catalogoHab: HABS, pjHabilidades: {} });
    const subs = [...document.querySelectorAll('.fp-col-title-sub')].map((s) => s.textContent);
    expect(subs).toContain('Subterfúgio');
    expect(document.body.textContent).not.toMatch(/Nenhuma habilidade\./);
  });
});
