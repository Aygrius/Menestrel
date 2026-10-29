/* ============================================================
   armadura-karma-ficha.test.jsx — a ficha enxuta de 15/09/2026
   ============================================================
   Pedidos do usuário, na ordem em que vieram:
     • "remover todas as legendas das barras 'disposto', 'corajoso', etc.";
     • "remova os botões com os valores pré-determinados de redução, depois
        remova o card e deixe apenas o input flutuando";
     • "pode remover a barra de 'defesa e resistência' que fica debaixo de
        energia heroica. O personagem vai acompanhar sua defesa e resistência
        nos slots.";
     • "Ao clicar nos equipamentos de defesa e ataque, aparece o input
        flutuante 'despir' ou a barra de gerenciar resistência. Para o jogador,
        apenas a barra de despir.";
     • "Para os personagens ladinos e guerreiros, remova a barra de karma."

   A ficha inteira só monta com banco, então o que dá para afirmar aqui é o
   contrato no fonte — mesmo caminho de tooltip-padrao.test.js — e o
   comportamento das partes que montam sozinhas.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'ficha.jsx'), 'utf8');

describe('as barras perderam as legendas narrativas', () => {
  it('nenhuma barra monta mais o rótulo de estado', () => {
    // A tabela FICHA_ESTADO_LABELS segue viva para os alertas de condição
    // (ConditionIcons), mas as BARRAS não a consultam mais.
    const i = fonte.indexOf('function FichaVitBars');
    const trecho = fonte.slice(i, fonte.indexOf('function ', i + 30));
    expect(trecho).not.toMatch(/fichaEstadoLabel/);
    expect(trecho).not.toMatch(/sufixoEstado/);
  });

  it('o editor de barra também não mostra legenda', () => {
    const i = fonte.indexOf('function BarEditPopover');
    const trecho = fonte.slice(i, fonte.indexOf('/* ======', i));
    expect(trecho).not.toMatch(/fichaEstadoLabel/);
    expect(trecho).not.toMatch(/fp-bar-pop-estado/);
  });
});

describe('o editor de barra é só o input flutuante', () => {
  const i = fonte.indexOf('function BarEditPopover');
  const trecho = fonte.slice(i, fonte.indexOf('/* ======', i));

  it('sem botões de valor pré-determinado', () => {
    expect(trecho).not.toMatch(/fp-pop-presets/);
    expect(trecho).not.toMatch(/rawPresets/);
    expect(trecho).not.toMatch(/corPreset/);
  });

  it('sem card: a classe --nu tira fundo, borda e sombra', () => {
    expect(trecho).toMatch(/fp-bar-pop--nu/);
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', 'index.css'), 'utf8');
    const regra = css.slice(css.indexOf('.fp-bar-pop--nu'), css.indexOf('.fp-bar-pop--nu') + 160);
    expect(regra).toMatch(/background:\s*none/);
    expect(regra).toMatch(/border:\s*none/);
  });

  /* O desenho deixou de ser escrito aqui em 17/09/2026 e virou o componente
     do sistema (QuantidadeStepper, 01-core/helpers.jsx) — "onde houver
     seletor de quantidade, use esse design". Este popover é a ORIGEM do
     desenho, e agora o consome como todo mundo: manter a cópia faria a
     referência divergir do que ela referencia. */
  it('o stepper continua lá — é ele o input', () => {
    expect(trecho).toMatch(/<QuantidadeStepper/);
  });

  /* 16/09/2026: "no card de alterar EF, EH, etc, remova o card e deixe só o
     pill redondo, igual está em 'despir' e 'equipar' nos slots."

     O card ainda aparecia porque `--nu` vinha ANTES da regra base, com a
     mesma especificidade — a base devolvia fundo, borda, raio e sombra, e o
     ::before dourado nem era desfeito. Não dá para ver isso montando o
     componente (jsdom não resolve cascata), então a asserção é sobre a
     folha: a moldura saiu da regra base. */
  it('a regra base do popover não desenha mais um card', () => {
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', 'index.css'), 'utf8');
    const i = css.indexOf('#root .menestrel-ui .fp-bar-pop {');
    expect(i).toBeGreaterThan(-1);
    const base = css.slice(i, css.indexOf('}', i));
    for (const prop of [/background:/, /border:/, /box-shadow:/, /padding:/, /border-radius:/]) {
      expect(base, 'sobrou moldura na base: ' + base).not.toMatch(prop);
    }
    // E o fio dourado do topo do card não sobrevive no modificador.
    expect(css).toMatch(/\.fp-bar-pop--nu::before \{ content: none; \}/);
    // A base não pode voltar a ganhar de --nu: o modificador vem depois dela.
    expect(css.indexOf('.fp-bar-pop--nu {')).toBeGreaterThan(i);
  });

  /* O alvo copiado é o botão "Despir" dos slots: pílula escura de 40px, sem
     borda. O stepper tem que chegar na mesma pele. */
  /* A PELE MUDOU DE DONO em 20/09/2026: "as opções 'despir', 'desequipar', e o
     seletor de bônus devem ficar inline. E devem possuir cor de fundo e borda
     como os tooltips."

     Antes cada peça carregava a própria pastilha escura, e o acordo era que
     todas carregassem a MESMA. Agora quem tem fundo e borda é o pop inteiro,
     com os valores do .mn-tip, e o conteúdo é transparente por dentro — uma
     pastilha dentro de uma moldura seria caixa dentro de caixa.

     O que o teste guarda continua sendo o mesmo: botão e stepper não podem
     divergir um do outro dentro do pop. */
  /* A PELE MUDOU DE DONO DUAS VEZES em 20/09/2026, e parou aqui: "não devem
     ser um card só, são cards separados, como antes, porém o fundo e a borda
     são do tooltip."

     O pedido anterior ("inline") era sobre o ARRANJO — lado a lado em vez de
     empilhados —, e eu li como fusão: envolvi tudo numa moldura só. Voltou a
     ser uma moldura POR PEÇA, com os valores do .mn-tip.

     O acordo que este teste guarda é o mesmo de sempre: botão e stepper ficam
     lado a lado, então não podem divergir um do outro. */
  it('cada peça veste a moldura do tooltip, e o continente é transparente', () => {
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', 'index.css'), 'utf8');
    const regra = (sel) => {
      const i = css.indexOf(sel);
      expect(i, 'não achei ' + sel).toBeGreaterThan(-1);
      return css.slice(i, css.indexOf('}', i));
    };
    const pop = regra('#root .menestrel-ui .fp-peca-pop {');
    expect(pop, 'o continente não pode ter moldura própria').toMatch(/background:\s*none/);
    expect(pop, 'as peças ficam lado a lado').toMatch(/flex-direction:\s*row/);

    // Botão e stepper dividem UMA regra, que é o que garante que não divirjam.
    const peles = regra('#root .menestrel-ui .fp-peca-pop-acoes .btn-ghost,\n#root .menestrel-ui .fp-peca-pop .fp-pop-stepper {');
    expect(peles, 'falta o fundo do tooltip').toMatch(/background:\s*var\(--p-fundo\)/);
    // A borda única do sistema (23/10/2026).
    expect(peles, 'falta o aro do tooltip').toMatch(/border:\s*1px solid var\(--regua-forte\)/);
  });

  /* DECISÃO REVERTIDA, e de propósito.

     16/09/2026: "Os botões de alterar resistência ainda têm borda [...] Os
     botões de editar barra EF, EH, ainda possuem cards, devem ficar como os
     de 'desequipar'." — o stepper perdeu a borda para deixar de parecer card.

     20/09/2026: "o fundo e a borda são do tooltip" e "isso vale para os
     outros seletores da ficha" — o aro volta, agora o do .mn-tip, que é fino
     e bronze em vez da moldura de card que incomodava.

     O acordo que sobrevive aos dois pedidos é o mesmo: stepper e botão de
     despir vestem a MESMA coisa, sejam quais forem os valores. É isso que
     este teste passa a guardar. */
  it('o stepper veste a mesma pele do botão de despir', () => {
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', 'index.css'), 'utf8');
    const i = css.indexOf('#root .menestrel-ui .fp-pop-stepper {');
    const regra = css.slice(i, css.indexOf('}', i));
    expect(regra, 'o fundo do tooltip').toMatch(/background:\s*var\(--p-fundo\)/);
    expect(regra, 'o aro do tooltip').toMatch(/border:\s*1px solid var\(--regua-forte\)/);
    expect(regra, 'e a pílula de sempre').toMatch(/border-radius:\s*999px/);
  });
});

/* 16/09/2026: "Os ícones das barras devem ser sempre dourados e não mudar de
   cor." A régua roxo/branco/verde continua valendo para o PREENCHIMENTO das
   barras sem cor própria (Peso, Estágio). */
describe('ícone da barra', () => {
  it('é sempre dourado, não segue o nível', () => {
    const i = fonte.indexOf('const iconColor =');
    expect(fonte.slice(i, i + 80)).toMatch(/'#C9A44E'/);
    expect(fonte.slice(i, i + 80)).not.toMatch(/corNivelBarra/);
  });

  it('e não tem mais círculo atrás', () => {
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', 'index.css'), 'utf8');
    const i = css.indexOf('#root .menestrel-ui .fp-bar-icon {');
    const regra = css.slice(i, css.indexOf('}', i));
    expect(regra).toMatch(/background:\s*none/);
    expect(regra).toMatch(/border:\s*none/);
  });
});

describe('a barra de Armadura saiu da vitalidade', () => {
  it('vitBars não tem mais a entrada de resistência/absorção', () => {
    const i = fonte.indexOf('const vitBars = [');
    const trecho = fonte.slice(i, fonte.indexOf('];', i));
    expect(trecho).not.toMatch(/key: 'res'/);
    expect(trecho).toMatch(/key: 'ef'/);
    expect(trecho).toMatch(/key: 'eh'/);
  });

  it('e o editor de valor único não trata mais `res`', () => {
    const i = fonte.indexOf('const abrirEdicaoBarra =');
    expect(fonte.slice(i, i + 400)).not.toMatch(/item\.key === 'res'/);
  });
});

describe('o modal da região (26/10/2026)', () => {
  /* "Quando clicar em um item dos slots, abrir um modal com os slots e ações
     dos itens da ficha do personagem" (usuário, 26/10/2026).

     O pop flutuante que ficava ancorado na casa (fp-peca-pop) saiu: clicar
     numa peça abre a JANELA DA REGIÃO — as casas dela em cima, a peça em
     foco e as ações na barra do próprio modal. Um desenho só para o que
     antes eram quatro cards (joias, brincos, roupas, cinto) e um pop. */
  const i = fonte.indexOf('{regiaoAberta && _JanelaItem && (() => {');
  const trecho = fonte.slice(i, fonte.indexOf('{/* Conteúdo do container vestido', i));

  it('é um modal do sistema, não um pop ancorado', () => {
    expect(i, 'o bloco do modal da região precisa existir').toBeGreaterThan(0);
    expect(trecho, 'usa o esqueleto de janela do sistema').toMatch(/<_JanelaItem/);
    expect(fonte, 'e o pop antigo saiu de vez').not.toMatch(/fp-peca-pop/);
    expect(fonte).not.toMatch(/setMenuPecaAnchor/);
  });

  it('mostra as casas da região, com a peça em foco marcada', () => {
    expect(trecho).toMatch(/REGIOES\[regiaoAberta\]/);
    expect(trecho).toMatch(/fp3-modal-casa/);
    expect(trecho).toMatch(/is-foco/);
  });

  /* A casa VAZIA também abre a janela desde 26/10/2026 ("se o usuário clicar
     em um slot vazio, mostre os itens que podem ser adicionados ali"), então
     o foco é a peça QUANDO há peça — daí o `it ? … : null`. */
  it('clicar numa casa abre o modal, já na peça quando há uma', () => {
    /* `CASA_VAZIA` no lugar de `null` desde 28/10/2026: `null` queria dizer
       "nada escolhido" E "escolhi a casa vazia", e a janela desempatava
       caindo no primeiro ocupante — numa região meio cheia, clicar na casa
       livre não mudava nada e a oferta do inventário nunca aparecia. */
    expect(fonte).toMatch(/setPecaNoModal\(it \? it\.instanceId : CASA_VAZIA\)/);
    /* `regiaoModal || regiao` desde 28/10/2026: a casa da MÃO desenha o lado
       (mao_d/mao_e, que é o que a arte da mão vazia precisa) e abre a região
       das duas mãos (`mao`), que é onde o sistema guarda arma equipada e de
       onde saem os candidatos do inventário. Abrindo `mao_e`, a janela vinha
       vazia: ninguém usa essa região. */
    expect(fonte).toMatch(/setRegiaoAberta\(regiaoModal \|\| regiao\)/);
  });
  it('a casa vazia oferece o que do inventário cabe nela', () => {
    expect(fonte).toMatch(/candidatosDaRegiao\(regiaoAberta\)/);
    expect(fonte).toMatch(/equiparNaRegiao\(cand\.instanceId, regiaoAberta\)/);
  });
  /* "No tooltip dos slots do card 'equipamentos' não precisa mostrar a
     descrição do item, nem a quantidade de slot" (usuário, 26/10/2026). */
  it('o balão da casa diz só o nome — da peça, ou da região', () => {
    /* A casa OCA ganhou balão próprio em 28/10/2026 ("quando não há itens no
       inventário, não deve ser possível clicar no slot"): ela não abre nada, e
       o balão diz o porquê. Fora dela, o balão continua sendo só o nome. */
    expect(fonte).toMatch(/: \{ title: \(filled && cat\) \? \(cat\.nome \|\| it\.slug\) : lbl \};/);
    expect(fonte).toMatch(/Nada no inventário cabe aqui/);
    expect(fonte).not.toMatch(/desc: cat\.descricao/);
    // Nenhum `abrirTip` da região carrega mais a contagem. (O `aria-label`
    // da casa continua com ela: quem não vê o contador precisa ouvi-lo.)
    expect(fonte).not.toMatch(/abrirTip\(e, \{ title: slotLbl\(regiao\), desc:/);
  });

  it('todo mundo vê Despir/Desequipar na barra de ações', () => {
    expect(trecho).toMatch(/'Take off' : 'Despir'/);
    expect(trecho).toMatch(/'Unequip' : 'Desequipar'/);
    expect(trecho).toMatch(/desequiparFicha\(emFoco\.instanceId\)/);
  });

  it('só o Mestre vê o stepper de resistência, e só em peça que tem durabilidade', () => {
    /* Mesma regra de 20/09/2026: o stepper é de RESISTÊNCIA e não vale para
       o que se VESTE (joias, roupas) — `!emFoco.vestido` é o corte. */
    expect(trecho).toMatch(/const podeRes = podeEditarEstado && resMaxFoco > 0 && !emFoco\?\.vestido;/);
    expect(trecho).toMatch(/ajustarResistenciaDaPeca\(emFoco\.instanceId, resFoco - 1\)/);
    expect(trecho).toMatch(/ajustarResistenciaDaPeca\(emFoco\.instanceId, resFoco \+ 1\)/);
  });

  /* A JANELA DA CASA VAZIA É O SELETOR (26/10/2026, pedido do usuário):
     "remova 'Nada no inventário cabe aqui', pois basta clicar no slot vazio
     para abrir um modal para selecionar o item que vai ser equipado". Antes
     ela mandava o jogador a outra tela; depois escrevia uma desculpa quando
     não tinha o que oferecer. Agora ou oferece, ou não escreve nada — as
     casas da região já estão desenhadas acima. */
  it('a casa vazia oferece, e quando não tem o que oferecer fica calada', () => {
    expect(trecho).not.toMatch(/fp3-modal-vazio/);
    expect(trecho).toMatch(/if \(!candidatos\.length\) return null;/);
    expect(trecho).toMatch(/fp3-modal-oferta/);
  });
  /* "Ao clicar no slot e abrir um item, remova 'Casas 0/1 em uso'." */
  it('e a janela não conta as casas em palavras', () => {
    expect(trecho).not.toMatch(/fp3-modal-conta/);
    expect(trecho).not.toMatch(/'in use' : 'em uso'/);
  });
});

/* 23/10/2026: "Lembra que agora todos os personagens podem usar magia? [...]
   caso o personagem tenha karma, mostre a barra de karma de todos." A lista
   de profissões sem Karma ficou vazia e o filtro por profissão saiu. */
describe('Karma não depende mais da profissão', () => {
  it('nenhuma profissão está na lista sem Karma', () => {
    expect(fonte).toMatch(/const SEM_KARMA = new Set\(\);/);
  });

  it('a barra de Karma não é filtrada por profissão', () => {
    expect(fonte).not.toMatch(/b\.key === 'ka' && SEM_KARMA\.has/);
  });
});
