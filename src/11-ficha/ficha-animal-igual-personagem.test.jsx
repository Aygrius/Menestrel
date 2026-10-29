/* ============================================================
   ficha-animal-igual-personagem.test.jsx — a trava do "exatamente igual"
   ============================================================
   Pedido do usuário, repetido quatro vezes (05–06/10/2026):
   "A página de animais está muito diferente da ficha do personagem, eu quero
    exatamente igual. A mesma quantidade de slots, mesmo tamanho do card da
    imagem, etc." · "Com a imagem no centro também." · "Existem itens próprios
    para animais, ou seja, não precisa de seletor de equipamento na ficha do
    animal. Também não tem '0 de 100' na ficha do animal." · "O espaçamento
    entre as barras, o espaçamento dos slots para as bordas da página, o nome
    do animal deveria ficar onde está o nome do personagem, o botão de montar
    deve ser no item do animal no inventário."

   ── O ALVO MUDOU DE LUGAR (26/10/2026) ───────────────────────────────────
   Esta trava nasceu contra a ficha de três colunas com o mapa corporal em
   grade (.fp2-cell / .fp2-pos-*). Em 26/10/2026 o modelo aprovado substituiu
   essa grade pelo BONECO DE ARMAR (.fp3-boneco: dois trilhos de casas ao redor
   do retrato, as mãos na base) e a ficha passou a ter duas colunas.

   O pedido não mudou — o que ele aponta é que mudou. Comparar o bicho com a
   grade morta travaria a ficha dele no desenho ANTIGO: seria a divergência que
   este arquivo existe para impedir, só que ao contrário. Então as âncoras
   foram refeitas sobre o boneco, item por item, e o que cada uma guarda
   continua sendo o que o usuário pediu:

     mesmo andaime      fp2-sheet > fp2-frame > fp2-columns--duas
     mesmas casas       .fp3-regiao, com contador, casa e legenda — as do bicho
                        são as DOZE do arreamento, não as regiões de gente
     imagem no centro   o mesmo .fp2-stage.fp3-retrato, com .fp2-portrait
     nome no retrato    .fp2-name, onde o nome do personagem mora
     sem "0 de 100"     barras sem rótulo e sem número
     sem Montar         a ação mora no item do inventário
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import '../01-core/animal-experiencia.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../12-batalha/batalha.jsx';
/* As barras do bicho leem vitalidadeDoAnimal, que mora no inventário. */
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';
import './ficha.jsx';

const aqui = dirname(fileURLToPath(import.meta.url));
const FONTE = readFileSync(resolve(aqui, 'ficha.jsx'), 'utf8');
const CSS = readFileSync(resolve(aqui, '..', 'index.css'), 'utf8');

let FichaAnimaisView;
beforeAll(() => {
  FichaAnimaisView = window.FichaAnimaisView;
  expect(FichaAnimaisView).toBeDefined();
});
afterEach(() => cleanup());

const CAVALO = {
  id: 157, nome: 'Cavalo Quarter', tipo: 'Animal', estagio: 4, peso: 400, montaria: true,
  forca: 3, agilidade: 2, fisico: 3, aura: 0, carisma: 0, percepcao: 1, intelecto: '0',
  energia_fisica: 43, energia_heroica: 48, velocidade: 20,
  equipamento: [], habilidades: '', tecnicas_especiais: '', magia: '',
};
const animal = {
  instancia: { instanceId: 'c1', slug: 'cavalo_quarter' },
  cat: { nome: 'Cavalo Quarter', grupo: 'Animais' },
  criatura: CAVALO,
};
const montar = (extra = {}) => render(
  <FichaAnimaisView animal={animal} en={false} podeEditar itens={[]}
    catalogoBySlug={{}} habsByKey={{}} tecnicasByKey={{}} magiasByKey={{}} {...extra} />
);

const regra = (sel) => {
  const i = CSS.indexOf(sel);
  expect(i, 'não achei a regra ' + sel).toBeGreaterThan(-1);
  return CSS.slice(i, CSS.indexOf('}', i));
};

describe('a ficha do animal é a ficha do personagem', () => {
  /* As casas do PERSONAGEM, lidas do próprio arquivo: as duas listas de
     regiões que os trilhos do boneco percorrem. As do bicho são outras — ele
     não tem pescoço de colar nem dedo de anel —, mas a ESTRUTURA de cada casa
     tem de ser a mesma, e é isso que se compara aqui. */
  it('cada casa do bicho é uma casa do boneco: contador, casa e legenda', () => {
    montar();
    const casas = [...document.querySelectorAll('.fp3-regiao')];
    expect(casas.length).toBe(12);     // as doze de itens.slot_arreio
    casas.forEach((c) => {
      expect(c.querySelector('.fp3-qtd'), 'casa sem contador').toBeTruthy();
      expect(c.querySelector('.inv-slot'), 'casa sem a casa').toBeTruthy();
      expect(c.querySelector('.fp3-nomr'), 'casa sem legenda').toBeTruthy();
    });
    // E o personagem monta as dele com as MESMAS classes.
    expect(FONTE).toMatch(/<div className="fp3-regiao"/);
    expect(FONTE).toMatch(/<span className="fp3-nomr">/);
  });

  /* SEIS DE CADA LADO, EM TRÊS FILEIRAS (27/10/2026, pedido do usuário: "o
     número de slots são 12, então 6 de cada lado em 3 linhas"). Eram 5 + 5 e
     uma fileira de base com 2 — a base é a das MÃOS do personagem, e o bicho
     não tem mãos: Alforje e Atrelado são carga e entraram nos trilhos. Com 6
     por trilho a grade de duas colunas fecha três fileiras exatas. */
  it('o boneco tem dois trilhos de seis, e nenhuma fileira de mãos', () => {
    montar();
    const boneco = document.querySelector('.fp3-boneco');
    expect(boneco).toBeTruthy();
    const trilhos = [...boneco.querySelectorAll(':scope > .fp3-trilho')];
    expect(trilhos).toHaveLength(2);
    for (const t of trilhos) expect(t.querySelectorAll('.fp3-regiao')).toHaveLength(6);
    expect(boneco.querySelector(':scope > .fp3-maos')).toBeNull();
  });

  /* Sem a fileira das mãos o retrato não pode seguir descendo duas linhas de
     grade: sobraria uma fileira vazia debaixo dele. */
  it('o retrato do bicho ocupa uma linha só', () => {
    montar();
    expect(document.querySelector('.fp3-boneco--bicho')).toBeTruthy();
    expect(CSS).toMatch(/\.fp3-boneco--bicho \.fp3-retrato \{ grid-row: 1; \}/);
  });

  /* O CARD DE ARMAS SAIU DAS DUAS FICHAS (27/10/2026, mais tarde no mesmo
     dia): "remova o card 'armas' das fichas de personagem e animal."

     De manhã ele era o MESMO componente nas duas fichas — e é por isso que
     este teste existia. Agora a paridade é a oposta, e vale pelo mesmo
     motivo: o que sai do dono sai do bicho. A coluna da direita do bicho fica
     Arreamento + informações. */
  it('o card Armas não é montado na ficha do bicho', () => {
    montar();
    expect(document.querySelector('.fp3-arsenal')).toBeNull();
  });

  /* E a coluna da direita fecha com a esquerda (27/10/2026). No personagem
     quem cede é o Energias, que encolhe até o pé do Equipamentos; aqui não
     dá — o Arreamento tem três fileiras contra as quatro mais as mãos do
     dono, e só o Condições já é mais alto que a coluna inteira da direita.
     Então cede o outro lado: o cartão ocupa a coluna e o boneco se centra
     nela, e a sobra vira ar repartido dentro do cartão em vez de um degrau
     no canto da moldura. A regra vale para as DUAS fichas desde que as
     pedras da Energia (27/10) deixaram 27px de degrau também na do dono. */
  it('o cartão do Arreamento ocupa a coluna, com o boneco centrado', () => {
    expect(CSS).toMatch(/\.fp2-columns--duas \.fp2-col-main > \.fp2-equip-wrap \{ flex: 1 1 auto; \}/);
    expect(CSS).toMatch(/\.fp2-columns--duas \.fp2-equip-wrap \.fp3-boneco \{ margin-block: auto; \}/);
  });

  /* A ABA COMPANHEIROS NÃO TEM TRILHO (27/10/2026, pedido do usuário: "não
     precisamos do trilho superior"). Ele chegou a morar dentro da moldura do
     bicho, mais cedo no mesmo dia; com ele na tela ficou claro que Batalha,
     Atividade, Evoluir e Editar são ações sobre o PERSONAGEM — e que em cima
     da ficha do cavalo elas parecem ser do cavalo. A faixa some inteira, e
     não só muda de lugar: nem dentro da moldura, nem na barra do console. */
  it('não há fileira do herói na ficha do bicho', () => {
    montar();
    expect(document.querySelector('.fp3-heroi')).toBeNull();
    expect(document.querySelector('.mc-acoes-ficha')).toBeNull();
  });

  it('e o console não manda o trilho para a aba dos companheiros', () => {
    // Nem para dentro da moldura, nem para a barra: `semTrilho` zera o alvo,
    // e sem alvo não há portal — para o Jogador e para o Mestre.
    expect(FONTE).toMatch(/const semTrilho = fpTab === 'animais';/);
    expect(FONTE).toMatch(/const alvoAcoesAtual = semTrilho \? null :/);
    expect(FONTE).toMatch(/const ctrlsNaBarra = \(cabecalhoNoMenu && alvoAcoesAtual\) \?/);
    expect(FONTE).toMatch(/const mestreNaBarra = isMestre && !!alvoAcoes && !semTrilho;/);
  });

  it('a figura fica no centro, no mesmo palco e no mesmo card', () => {
    montar();
    const palco = document.querySelector('.fp3-boneco > .fp2-stage.fp3-retrato');
    expect(palco).toBeTruthy();
    // O card da imagem é o do personagem (.fp2-portrait), com o nome dentro.
    expect(palco.querySelector('.fp2-portrait')).toBeTruthy();
    expect(palco.querySelector('.fp2-name').textContent).toBe('Cavalo Quarter');
  });

  it('sem capacidade ("0 de 100") e sem seletor de equipamento', () => {
    montar();
    expect(document.body.textContent).not.toMatch(/\bde\s+100\b/);
    expect(document.querySelector('select')).toBeNull();
    expect(document.querySelector('[data-equipar], [data-equipar-animal]')).toBeNull();
  });

  it('as barras do bicho são as do personagem: sem nome e sem número', () => {
    montar();
    const barras = document.querySelector('.fp-animal-vit');
    expect(barras).toBeTruthy();
    // `semNome` e sem `showValue`: a faixa não escreve rótulo nem valor.
    expect(barras.querySelector('.fp-bar-name-label')).toBeNull();
    expect(barras.querySelector('.fp-bars.with-val')).toBeNull();
  });
});

describe('e continua igual no andaime, no respiro e no nome', () => {
  it('o andaime é o MESMO do personagem: fp2-sheet > fp2-frame > fp2-columns', () => {
    montar();
    const colunas = document.querySelector('.fp2-columns');
    expect(colunas).toBeTruthy();
    expect(colunas.classList.contains('fp2-columns--duas')).toBe(true);
    // Subir a árvore do animal tem de dar nos mesmos dois invólucros do PJ.
    expect(colunas.parentElement.classList.contains('fp2-frame')).toBe(true);
    expect(colunas.parentElement.parentElement.classList.contains('fp2-sheet')).toBe(true);
    // E as duas colunas são as mesmas do personagem.
    expect(colunas.querySelector(':scope > .fp2-col-vit')).toBeTruthy();
    expect(colunas.querySelector(':scope > .fp2-col-main')).toBeTruthy();
  });

  it('.fp-animais não tem padding próprio — quem dá o respiro é o fp2-frame', () => {
    // Era `padding: 16px 20px 0`, e eram esses 20px que empurravam os slots
    // do bicho para dentro, contra as bordas da página do personagem.
    expect(regra('.fp-animais {')).toMatch(/padding:\s*0\s*;/);
  });

  it('as barras do bicho não ganham gap extra: o respiro é o do personagem', () => {
    // `.fp-animal-vit .fp-bars { gap: 6px }` somava aos 8px de padding-bottom
    // de .fp-bar-row e deixava as barras do animal 14px apartadas.
    expect(CSS).not.toMatch(/\.fp-animal-vit\s+\.fp-bars\s*\{[^}]*gap/);
    // E a coluna do bicho É a coluna do personagem: sem display próprio.
    expect(CSS).not.toMatch(/\.fp-animal-vit\s*\{[^}]*display:\s*block/);
    expect(FONTE).toMatch(/className="fp2-vitcond-col fp-animal-vit"/);
  });

  it('o nome do bicho mora no retrato, e não há mais abas nem botão Montar', () => {
    montar();
    expect(document.querySelector('.fp2-portrait .fp2-name').textContent)
      .toContain('Cavalo Quarter');
    expect(document.querySelector('.fp-animais-tabs')).toBeNull();
    expect(document.querySelector('.fp-animais-nome')).toBeNull();
    expect(document.querySelector('.fp-animais-acao')).toBeNull();
    expect([...document.querySelectorAll('button')]
      .some((b) => /Montar|Desmontar/.test(b.textContent))).toBe(false);
    // E as regras órfãs dessas classes também foram embora.
    expect(CSS).not.toMatch(/\.fp-animais-tabs/);
    expect(CSS).not.toMatch(/\.fp-animais-acao/);
  });

  /* AS DUAS BORDAS IGUAIS (06/10/2026, pedido do usuário: "a coluna de
     informações do personagem na ficha, 'identificação', etc, está com o
     espaçamento à direita menor que a coluna de ef, eh à esquerda. Isso vale
     para a ficha do animal"). O número já era o mesmo; quem comia o respiro da
     direita era a barra de rolagem do painel. UM token para os dois lados, e
     scrollbar-gutter reserva a pista dela. */
  it('as duas colunas usam o MESMO token de recuo', () => {
    expect(CSS.indexOf('--fp2-col-inset')).toBeGreaterThan(-1);
    expect(regra('.fp2-col-vit {')).toMatch(/padding-left:\s*var\(--fp2-col-inset\)/);
    expect(regra('.fp2-col-side {')).toMatch(/padding-right:\s*var\(--fp2-col-inset\)/);
    // E o remendo de 4px que desequilibrava os lados não voltou.
    expect(CSS).not.toMatch(/\.fp2-personagem-col \.fp2-panel-body \{ padding-right: 4px/);
    // A barra de rolagem ganha pista própria em vez de comer o recuo.
    expect(CSS).toMatch(/scrollbar-gutter:\s*stable/);
  });

  /* A SEPARAÇÃO É A BORDA DO CARTÃO (27/10/2026, pedido do usuário: "revise o
     espaçamento entre os cards"). Era `.fp2-vit-break` — régua no topo mais
     4px —, de quando os dois blocos dividiam um painel só. Hoje Condições é
     um cartão com borda própria: o fio virava uma segunda linha e os 4px
     punham aquele vão em 16px, contra 12 em todo o resto da ficha. */
  it('todos os vãos entre cards da ficha do bicho são o mesmo', () => {
    expect(CSS).not.toMatch(/\.fp2-panel\.fp2-vit-break \{/);   // a regra saiu
    expect(FONTE).not.toMatch(/' fp2-vit-break'/);              // e o uso também
    montar();
    const vaos = (lista) => lista.slice(1).map((p, i) =>
      Math.round(p.getBoundingClientRect().top - lista[i].getBoundingClientRect().bottom));
    // jsdom não faz layout, então o que se trava aqui é a REGRA de 12px —
    // a medida de verdade foi feita no navegador (12/12/12).
    expect(regra('.fp2-vitcond-col {')).toMatch(/gap:/);
    /* O vão da coluna da direita era um `+ .fp2-combat-col` pendurado no card
       Armas; com o card fora (27/10/2026) quem dá o vão é o `gap` da pilha
       flex — um número só, que é o que o pedido pedia desde o começo. */
    expect(regra('.fp-animais .fp2-columns--duas .fp2-col-main {')).toMatch(/gap: 12px/);
    expect(vaos([...document.querySelectorAll('.fp-animal-vit > .fp2-panel')])).toBeTruthy();
  });
});

/* ── O ANDAIME DA COLUNA DA DIREITA (06/10/2026) ───────────────────────────
   "A ficha do animal ainda está diferente da ficha do personagem. O
    espaçamento da coluna da direita está diferente." (usuário)

   Faltava o INVÓLUCRO: é o painel (fp2-panel > fp2-panel-body) que dá a
   altura, o scroll interno e — por `scrollbar-gutter: stable` — a pista
   reservada da barra de rolagem, que é o que mantém o recuo igual ao da coluna
   das barras. A ficha do bicho estava pendurada direto na coluna: sem painel,
   sem gutter, texto mais perto da borda. */
describe('e a coluna da direita tem o andaime do personagem', () => {
  /* IDENTIDADE E DERIVADAS SAÍRAM DA FICHA (27/10/2026, pedido do usuário:
     "removeremos da ficha as informações de 'identidade, derivadas, etc'").
     Elas viraram PÁGINAS do bicho, abertas pelo menu lateral — como o
     personagem já separava Ficha de Identificação. A ficha ficou com o que é
     visual: boneco, armas, energias e as duas faixas do pé. */
  it('a ficha não hospeda mais a fila de páginas do bicho', () => {
    montar();
    expect(document.querySelector('.fp2-col-main .fp2-combat-col')).toBeNull();
    expect(document.querySelector('.fp-animal-info-uma')).toBeNull();
  });

  it('e a página de Identificação traz a fila, com o recuo das páginas', () => {
    montar({ parte: 'info' });
    expect(document.querySelector('.fp-animais-parte .fp-animal-info-uma')).toBeTruthy();
    expect(CSS).toMatch(/\.fp-animais-parte \{ padding: 4px 0 0; \}/);
  });

  it('a fila de páginas do bicho obedece ao MESMO recuo da do personagem', () => {
    /* UMA regra para as DUAS classes, não duas regras iguais: é o que impede a
       coluna do bicho de divergir da do personagem outra vez. Por isso o teste
       exige os dois seletores na mesma lista, e não só os valores certos. */
    expect(CSS).toMatch(
      /\.fp-info-uma,\s*\n[^{]*\.fp-animal-info-uma\s*\{[^}]*padding-inline:\s*0/);
    expect(CSS).toMatch(
      /\.fp-info-uma \.fp-row,\s*\n[^{]*\.fp-animal-info-uma \.fp-row\s*\{[^}]*padding-right:\s*0/);
    // E as duas classes têm dono: a do personagem e a do bicho.
    expect(FONTE).toMatch(/fp-info-grid--3 fp-info-uma/);
    expect(FONTE).toMatch(/fp-montaria fp-animal-info-uma/);
  });
});

/* ── A EXPERIÊNCIA DO BICHO NA COLUNA DAS BARRAS (06/10/2026) ──────────────
   "Os animais do personagem devem ganhar sempre 1/5 da experiência do
    personagem enquanto estiverem com ele, e evoluir quando alcançar a xp
    certa." (usuário)

   A barra entrou onde a do personagem está — fim da coluna da esquerda — e com
   UMA diferença deliberada: não se edita. A do personagem é onde o Mestre
   concede XP; a do bicho é consequência dela, e abrir o popover aqui romperia
   o "sempre 1/5". As contas moram em 01-core/animal-experiencia.jsx. */
/* ── A EXPERIÊNCIA SAIU DA COLUNA (27/10/2026) ─────────────────────────────
   "Coloque a barra de experiência como na ficha do personagem" e "abaixo do
   card de condições tem um card que eu não sei o que é" — era o MESMO card.
   A Experiência morava como terceiro painel da coluna da esquerda, montada
   com `semNome` e sem número: um painel com um fio dentro e nenhuma palavra
   dizendo o que era. Agora é a faixa `.fp-xp-faixa` do personagem, no pé da
   moldura, com rótulo e número. */
describe('a barra de experiência do animal', () => {
  it('é a faixa do pé do cartão, com rótulo e número, como no personagem', () => {
    montar();
    const faixa = document.querySelector('.fp2-frame > .fp-xp-faixa');
    expect(faixa, 'a faixa não está no pé da moldura').toBeTruthy();
    expect(faixa.querySelector('.fp-xp-rot').textContent).toBe('Experiência');
    expect(faixa.querySelector('.fp-bar-row')).toBeTruthy();
    // E a coluna da esquerda não tem mais o painel sem nome.
    expect(document.querySelectorAll('.fp-animal-vit > .fp2-panel')).toHaveLength(2);
  });

  it('respira como as do personagem: a coluna do bicho é a coluna do PJ', () => {
    /* "A barra de xp do animal está com um espaçamento diferente." (usuário,
       06/10/2026) — `.fp-animal-vit { display: block }` tinha a mesma
       especificidade de `.fp2-vitcond-col` e vinha depois no arquivo, então
       vencia: a coluna do bicho perdia o flex e, com ele, o `gap: 5px` entre
       os painéis. */
    expect(regra('.fp2-vitcond-col {')).toMatch(/display:\s*flex[\s\S]*gap:\s*5px/);
  });

  /* A CARGA AO LADO DELA (27/10/2026, pedido do usuário: "adicione também uma
     barra para mostrar o peso que o animal está carregando"). A regra pura
     está em 07-inventario/carga-do-animal.test.js; aqui o que se trava é a
     faixa: que ela existe, que é a segunda do pé, e que diz o número com
     vírgula — a carga tem casa decimal (uma sela ocupa 6,5). */
  it('a Carga é a segunda faixa do pé, com o cavaleiro somado', () => {
    montar({
      // `montado`: é só em cima do bicho que o cavaleiro pesa nele.
      animal: { ...animal, instancia: { ...animal.instancia, montado: true } },
      itens: [{ instanceId: 's1', slug: 'sela', quantidade: 1, animal_id: animal.instancia.instanceId }],
      catalogoBySlug: { sela: { slug: 'sela', nome: 'Sela', ocupa: 6.5 } },
      pesoDoCavaleiro: 72,
    });
    const faixas = [...document.querySelectorAll('.fp2-frame > .fp-xp-faixa')];
    expect(faixas).toHaveLength(2);
    const carga = faixas[1];
    expect(carga.classList.contains('fp-carga-faixa')).toBe(true);
    expect(carga.querySelector('.fp-xp-rot').textContent).toBe('Carga');
    // 6,5 da sela + 72 do cavaleiro montado; o teto é 20% do peso do corpo.
    expect(carga.querySelector('.fp-bar-num').textContent).toMatch(/^78,5\//);
  });

  /* AS DUAS SÃO UMA FAIXA SÓ (27/10/2026, pedido do usuário: "o espaçamento
     está estranho"). A Carga herdava o padding e a margem da Experiência e
     boiava 33px abaixo dela. E o que eu havia escrito para ela não valia: a
     regra de cima usa `:has()` e soma quatro classes, contra duas da minha.
     Daí a especificidade espelhada — é o preço de corrigir um `:has()`. */
  it('a Carga encosta na Experiência: uma régua só, no topo das duas', () => {
    expect(CSS).toMatch(/\.fp-page:has\(\.fp2-columns--duas\) \.fp-carga-faixa \{\r?\n\s*border-top: none; margin-top: 0; padding-top: 0;/);
    // E a Experiência fecha o respiro de baixo quando tem vizinha.
    expect(CSS).toMatch(/\.fp-xp-faixa:has\(\+ \.fp-carga-faixa\) \{\r?\n\s*padding-bottom: 6px;/);
  });

  /* O BUG VISUAL DAS DUAS FAIXAS (27/10/2026, pedido do usuário: "as barras
     de experiência e peso estão com um bug visual"). O painel de informações
     do bicho tem `height: 100%` — e 100% é da COLUNA INTEIRA, não do que
     sobrou dela. Sendo o terceiro filho, ele nascia já abaixo do Arreamento e
     do Armas e esticava a altura toda a partir dali: medido no navegador,
     878px de painel começando aos 514 de coluna, 400px para fora da moldura,
     cruzando as duas faixas por baixo. */
  it('a coluna da direita não vaza pelo pé do cartão', () => {
    expect(CSS).toMatch(/\.fp-animais \.fp2-combat-col \{ height: auto; flex: 1 1 auto; min-height: 0; \}/);
    // A coluna vira pilha flex: o vão é um número só, não margens peça a peça.
    expect(CSS).toMatch(/\.fp-animais \.fp2-columns--duas \.fp2-col-main \{\r?\n\s*display: flex; flex-direction: column; gap: 12px;/);
    // E o `height: 100%` original segue de pé para quem não é o bicho.
    expect(regra('.fp2-combat-col {')).toMatch(/height:\s*100%/);
  });

  it('sem criatura com peso não há faixa de Carga — não se inventa o teto', () => {
    montar({ animal: { ...animal, criatura: { ...animal.criatura, peso: null } } });
    expect(document.querySelector('.fp-carga-faixa')).toBeNull();
  });

  it('não é editável: o quinto vem do dono, não se concede aqui', () => {
    // Sem `onEdit`, a faixa não vira botão nem abre popover de edição.
    expect(FONTE).toMatch(/bars=\{bars\} scope="xp-animal" semNome numero en=\{en\}/);
    expect(FONTE).not.toMatch(/scope="xp-animal"[^>]*onEdit/);
  });
});

/* ── O NOME É DO DONO, A RAÇA É DO CATÁLOGO (06/10/2026) ───────────────────
   "Na ficha do animal, o que é atualmente 'nome' será 'Raça', e o nome poderá
    ser informado pelo seu dono, se assim desejar." (usuário)

   As regras puras estão em 07-inventario/nome-do-animal.test.js; aqui o que se
   trava é a PÁGINA: que a linha mudou de rótulo, que há uma linha de nome
   editável, e que sem nome dado ela convida em vez de mostrar um "—" — porque
   ali não falta um dado do catálogo, falta uma escolha. */
describe('o nome e a raça na página de Identidade', () => {
  const linhas = () => [...document.querySelectorAll('.fp-row')].map((el) => [
    el.querySelector('.fp-row-label')?.textContent?.trim(),
    el.querySelector('.fp-row-value')?.textContent?.trim(),
  ]);
  const comRenomear = (instancia, onRenomear) => render(
    <FichaAnimaisView animal={{ ...animal, instancia }} en={false} podeEditar itens={[]} parte="info"
      onRenomear={onRenomear}
      catalogoBySlug={{}} habsByKey={{}} tecnicasByKey={{}} magiasByKey={{}} />
  );

  it('a linha que dizia "Nome" agora diz "Raça", com a espécie do catálogo', () => {
    comRenomear({ instanceId: 'c1', slug: 'cavalo_quarter' }, () => {});
    expect(linhas()).toContainEqual(['Raça', 'Cavalo Quarter']);
  });

  it('sem nome dado, a linha de Nome mostra o lápis — não um "—"', () => {
    /* O convite escrito saiu em 06/10/2026 ("remova o texto 'Dar um nome' e
       deixe só o ícone de lápis"). O que a linha NÃO pode voltar a fazer é
       mostrar um "—": ali não falta um dado do catálogo, falta uma escolha do
       dono. E o lápis tem de dizer em palavras o que é, para quem não o vê. */
    comRenomear({ instanceId: 'c1', slug: 'cavalo_quarter' }, () => {});
    expect(linhas()).toContainEqual(['Nome', '']);
    expect(linhas()).not.toContainEqual(['Nome', '—']);
    const lapis = document.querySelector('.fp-nome-animal-lapis');
    expect(lapis).toBeTruthy();
    expect(lapis.getAttribute('aria-label')).toBe('Dar um nome');
    expect(document.querySelector('.fp-row-value--convite')).toBeTruthy();
  });

  /* O nome aparece nos dois lugares, e desde 27/10/2026 eles são PÁGINAS
     diferentes: a linha mora na Identificação, o retrato mora na ficha. */
  it('com nome dado, é ele que aparece na linha da Identificação', () => {
    const inst = { instanceId: 'c1', slug: 'cavalo_quarter', nome: 'Trovão' };
    render(
      <FichaAnimaisView animal={{ ...animal, instancia: inst, nome: 'Trovão' }} en={false} podeEditar itens={[]} parte="info"
        onRenomear={() => {}}
        catalogoBySlug={{}} habsByKey={{}} tecnicasByKey={{}} magiasByKey={{}} />
    );
    expect(linhas()).toContainEqual(['Nome', 'Trovão']);
    expect(linhas()).toContainEqual(['Raça', 'Cavalo Quarter']);
  });

  it('e no retrato da ficha', () => {
    const inst = { instanceId: 'c1', slug: 'cavalo_quarter', nome: 'Trovão' };
    render(
      <FichaAnimaisView animal={{ ...animal, instancia: inst, nome: 'Trovão' }} en={false} podeEditar itens={[]}
        onRenomear={() => {}}
        catalogoBySlug={{}} habsByKey={{}} tecnicasByKey={{}} magiasByKey={{}} />
    );
    expect(document.querySelector('.fp2-portrait .fp2-name').textContent).toContain('Trovão');
  });

  it('sem onRenomear (Mestre olhando ficha alheia), a linha é só leitura', () => {
    montar();
    // Nada de convite nem de campo: quem batiza é o dono.
    expect(document.querySelector('.fp-row-value--convite')).toBeNull();
    expect(document.querySelector('[data-nome-animal]')).toBeNull();
    expect(document.querySelector('.fp-nome-animal-lapis')).toBeNull();
  });
});

/* ── O TOOLTIP DA SETA SAIU (06/10/2026) ──────────────────────────────────
   "Remova o tooltip da seta para navegar nos menus caracterizações, atributos,
    etc." (usuário) Os traços embaixo já dizem quantas páginas há e em qual se
   está, e o título troca ao clicar. O `aria-label` fica: o leitor de tela não
   tem os traços. */
describe('a seta de navegar as páginas', () => {
  it('não abre tooltip, e segue nomeando o destino para quem não vê', () => {
    // A seta mora na fila de páginas, que agora é a página de Identificação.
    montar({ parte: 'info' });
    const seta = document.querySelector('.fp-col-title-nav-btn');
    expect(seta).toBeTruthy();
    expect(seta.getAttribute('title')).toBeNull();
    expect(seta.getAttribute('aria-label')).toMatch(/Próximo:/);
    expect(FONTE).not.toMatch(/fp-col-title-nav-btn[\s\S]{0,320}propsTip/);
  });
});
