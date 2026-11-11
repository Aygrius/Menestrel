/* ============================================================
   guia-ajuda.test.jsx — o guia como cartas da regra (11/11/2026)
   ============================================================
   "A página de ajuda, ou 'guia para criação de personagem' precisa passar
    por uma atualização de estilo, e atualização de regras. Vamos usar o
    impeccable para transformar essa página em uma apresentação mais
    didática." (usuário) — estrutura escolhida: as cartas da regra.

   Prende: o trilho de capítulos, a carta que vira, a navegação que atravessa
   capítulos, os números que vêm do código (raças, pontos de técnica e magia)
   e as regras que a auditoria de 11/11/2026 corrigiu.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/select-pill.jsx';
import './guia_personagem.jsx';

afterEach(cleanup);

let Guia;
beforeAll(() => { Guia = window.GuiaPersonagem; });

const textoDe = (capId, cartaId) => {
  const cap = window.montarCapitulosDoGuia().find((c) => c.id === capId);
  const carta = cap.cartas.find((k) => k.id === cartaId);
  const { container } = render(<div>{carta.sim ? <carta.sim>{carta.verso()}</carta.sim> : carta.verso()}</div>);
  const t = carta.frase + ' ' + container.textContent;
  cleanup();
  return t;
};

describe('o guia em cartas', () => {
  it('o trilho tem os capítulos, na ordem da criação', () => {
    render(<Guia lang="pt" />);
    const caps = [...document.querySelectorAll('.gc-cap')].map((b) => b.getAttribute('aria-label'));
    expect(caps).toEqual(['Gênero', 'Raça', 'Reino', 'Profissão', 'Especialização',
      'Atributos', 'Habilidades', 'Armas e técnicas', 'Magias', 'Combate', 'Condições']);
  });

  /* Sem virar (11/11/2026, usuário: "Remova o 'ver o porquê' e coloque o
     texto no card, pois há muito espaço vazio"). */
  it('a frase, os números e o porquê ficam juntos na carta', () => {
    render(<Guia lang="pt" />);
    expect(screen.queryByRole('button', { name: /Ver o porquê/ })).toBeNull();
    const corpo = document.querySelector('.gc-carta .gc-carta-corpo');
    expect(corpo.querySelector('.gc-frase')).toBeTruthy();
    expect(corpo.querySelector('.gc-passe')).toBeTruthy();
    expect(corpo.querySelector('.gc-porque').textContent).toMatch(/energia heroica \(EH\) é/);
  });

  /* O balão é o do sistema (11/11/2026, usuário: "Arrume o tooltip fora do
     padrão"): nada de title nativo no trilho. */
  it('o trilho usa o balão do sistema, não o title do navegador', () => {
    render(<Guia lang="pt" />);
    const fechado = document.querySelector('.gc-cap:not(.is-ativo)');
    expect(fechado.hasAttribute('title')).toBe(false);
    fireEvent.mouseEnter(fechado);
    return new Promise((ok) => setTimeout(() => {
      expect(document.querySelector('.mn-tip').textContent).toBe(fechado.getAttribute('aria-label'));
      ok();
    }, 120));
  });

  it('Próxima atravessa os capítulos; o trilho pula direto', () => {
    render(<Guia lang="pt" />);
    const proxima = () => fireEvent.click(screen.getByRole('button', { name: /Próxima/ }));
    expect(document.querySelector('.gc-titulo').textContent).toBe('Escolha seu gênero');
    proxima(); proxima(); proxima();       // as 3 cartas de Gênero
    expect(document.querySelector('.gc-cap.is-ativo').textContent).toMatch(/Raça/);
    expect(document.querySelector('.gc-titulo').textContent).toBe('Escolha sua raça');
    fireEvent.click(document.querySelector('[data-cap="combate"]'));
    expect(document.querySelector('.gc-titulo').textContent).toBe('Quem age primeiro');
    expect(screen.getByRole('button', { name: /Anterior/ }).disabled).toBe(false);
  });

  /* O padrão de página da Ficha (11/11/2026, usuário: "E o nosso padrão de
     layout? Trilhos dentro da página, cores sem transparência"). */
  it('segue o padrão da Ficha: cartão da página, trilho dentro, pé com régua, título de cartão', () => {
    render(<Guia lang="pt" />);
    const pagina = document.querySelector('.pjs.gc-page');
    expect(pagina).toBeTruthy();
    expect(pagina.querySelector(':scope > .cartoes-barra.livro-trilho .best-header-acoes .mc-acao.is-ativo')).toBeTruthy();
    expect(pagina.querySelector(':scope > .pg-rodape.gc-nav')).toBeTruthy();
    expect(document.querySelector('.gc-titulo').classList.contains('fp-col-tit')).toBe(true);
    expect(document.querySelector('h1')).toBeNull();          // o menu lateral já diz a página
  });
  it('cada carta tem o lugar da arte vertical ao lado do texto', () => {
    render(<Guia lang="pt" />);
    const arte = document.querySelector('.gc-carta > .gc-arte');
    expect(arte).toBeTruthy();
    expect(document.querySelector('.gc-carta > .gc-texto .gc-frase')).toBeTruthy();
    // "Escolha seu gênero" tem a arte do usuário (11/11/2026); public/guia/.
    expect(arte.classList.contains('is-vazia')).toBe(false);
    expect(arte.querySelector('img.gc-arte-img').getAttribute('src')).toBe('/guia/genero.jpg');
    // Sem imagem, o ícone do capítulo guarda o lugar.
    fireEvent.click(screen.getByRole('button', { name: /Próxima/ }));
    expect(document.querySelector('.gc-carta > .gc-arte').classList.contains('is-vazia')).toBe(true);
  });
});

describe('as regras vêm do código e conferem com ele (auditoria de 11/11/2026)', () => {
  it('a tabela de raças usa os modificadores do GAME_DATA', () => {
    const t = textoDe('raca', 'mods');
    // Sem tabela (11/11/2026): a frase de cada raça sai dos modificadores.
    expect(t).toMatch(/O anão é bem mais forte e bem mais resistente, mas bem mais lento, um pouco mais distante da magia e um pouco menos carismático\./);
    expect(t).toMatch(/O humano é a média em tudo/);
    expect(t).toMatch(/meio-elfo.*recebe 2,5 pontos livres/);   // bonusPontosRaca
  });
  it('técnicas e magia: base da profissão + Intelecto', () => {
    const p = textoDe('profissao', 'reservatorios');
    expect(p).toMatch(/guerreiro.*10 \+ intelecto de técnica/);
    expect(p).toMatch(/mago é o mais estudioso: 8 \+ intelecto de magia/);
    expect(p).not.toMatch(/Intelecto e Aura/);
  });
  it('aprender leva tempo só na primeira vez', () => {
    expect(textoDe('armas', 'aprender-tec')).toMatch(/36 horas/);
    expect(textoDe('magias', 'aprender-mag')).toMatch(/24 horas/);
  });
  it('vantagem de origem não soma, ação extra com VB 30 ou mais, bandos pela multidão', () => {
    expect(textoDe('reino', 'vantagens')).toMatch(/não somam/);
    expect(textoDe('combate', 'pa')).toMatch(/muito velozes podem agir duas vezes/);
    expect(textoDe('combate', 'bandos')).toMatch(/só a morte dele/);
  });
  it('condições de 0 a 100, em degraus', () => {
    const t = textoDe('condicoes', 'barras');
    expect(t).toMatch(/0 \(ideal\) a 100 \(pior\)/);
    expect(t).toMatch(/A sede enfraquece a sua resistência mágica/);
  });
  /* Falar como gente (11/11/2026, usuário: "Você não está falando com uma
     máquina"): sem o capítulo Começo, sem siglas soltas nem notação de fórmula. */
  it('o texto fala como gente: títulos que dizem a escolha, sem notação de máquina', () => {
    const caps = window.montarCapitulosDoGuia();
    expect(caps.map((c) => c.id)).not.toContain('comeco');
    expect(caps[0].cartas[0].titulo).toBe('Escolha seu gênero');
    const tudo = caps.flatMap((c) => c.cartas.map((k) => textoDe(c.id, k.id))).join(' ');
    expect(tudo).not.toMatch(/Três corpos|Corpo \+10%|⌊|⌋| \+ Int\b/);
    expect(textoDe('atributos', 'pontos')).toMatch(/15 pontos/);   // veio do Começo
    expect(textoDe('profissao', 'livro')).toMatch(/10 magias/);    // veio do Começo
  });
  /* "Você continua escrevendo energia física, velocidade, com a primeira
     letra maiúscula e continua falando de forma robótica" (usuário,
     11/11/2026): no meio da frase, as estatísticas vão em minúscula, e o
     passe da raça fala do talento, não do número. */
  it('a voz do guia: estatísticas em minúscula no meio da frase, talento em vez de número', () => {
    const caps = window.montarCapitulosDoGuia();
    const tudo = caps.flatMap((c) => c.cartas.map((k) => textoDe(c.id, k.id))).join(' ');
    expect(tudo).not.toMatch(/[a-zà-ú,] (Energia Heroica|Energia Física|Velocidade|Karma|Defesa|Absorção|Intelecto|Percepção|Aura)\b/);
    const raca = caps.find((c) => c.id === 'raca').cartas[0];
    expect(raca.numeros).toEqual([['Anão', 'Mais forte'], ['Elfo-dourado', 'Mais desperto para a magia']]);
    expect(textoDe('raca', 'mods')).toMatch(/A força é o músculo/);
  });
  /* "Ao invés de ter tabelas nos cards, porque não criamos um texto didático
     usando a tabela como fonte?" (usuário, 11/11/2026). */
  it('nenhuma carta tem tabela: os dados viram texto', () => {
    for (const c of window.montarCapitulosDoGuia()) {
      for (const k of c.cartas) {
        const { container } = render(<div>{k.sim ? <k.sim>{k.verso()}</k.sim> : k.verso()}</div>);
        expect(container.querySelector('[role="table"], table, .gc-esp'), `${c.id}/${k.id}`).toBeNull();
        cleanup();
      }
    }
    expect(textoDe('especializacao', 'escola')).toMatch(/O guerreiro pode se formar na Academia de Soldados \(soldado\)/);
    expect(textoDe('especializacao', 'escola')).toMatch(/no Colégio Alquímico \(alquimista\)/);
  });
  it('o simulador de elementos segue a regra do motor', () => {
    expect(textoDe('profissao', 'elemento')).toMatch(/um golpe de 20 vira 22/);
  });
  /* "Adicionar um card 'Quanto de energia física?' e repetir o processo"
     (usuário, 11/11/2026): a carta irmã da de Energia Heroica, com o
     simulador que usa o peso da ficha. */
  it('Gênero: Energia Heroica e Energia Física, cada uma com o seu simulador e sem o card de exemplo', () => {
    const genero = window.montarCapitulosDoGuia().find((c) => c.id === 'genero');
    expect(genero.cartas.map((k) => k.titulo)).toEqual(['Escolha seu gênero', 'Quanto de energia heroica?', 'Quanto de energia física?']);
    expect(genero.cartas[1].numeros).toBeUndefined();
    /* O resultado do simulador fica logo abaixo da frase, no lugar do passe
       (11/11/2026); a explicação e os campos vêm depois. */
    render(<Guia lang="pt" />);
    for (let i = 1; i <= 2; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Próxima/ }));
      const frase = document.querySelector('.gc-carta-corpo > .gc-frase');
      const passe = frase.nextElementSibling;
      expect(passe.classList.contains('gc-passe')).toBe(true);
      expect(passe.textContent).toMatch(/^Feminino\d+Neutro\d+Masculino\d+$/);
      expect(passe.nextElementSibling.querySelector('.gc-sim-campos')).toBeTruthy();
    }
    cleanup();
    expect(textoDe('genero', 'eh')).not.toMatch(/Exemplo: no estágio|Guerreira no estágio/);
    const ef = textoDe('genero', 'ef');
    const esperado = (g) => Math.floor(window.peso('Humano', g) / 5) + 1;   // Humano, Físico +1
    expect(ef).toContain(`Feminino${esperado('Feminino')}`);
    expect(ef).toContain(`Masculino${esperado('Masculino')}`);
    expect(esperado('Masculino')).toBeGreaterThan(esperado('Feminino'));
  });
});
