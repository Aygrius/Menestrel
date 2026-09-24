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
    expect(peles, 'falta o fundo do tooltip').toMatch(/background:\s*#120D06/);
    expect(peles, 'falta o aro do tooltip').toMatch(/border:\s*1px solid rgba\(106,85,48,0\.35\)/);
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
    expect(regra, 'o fundo do tooltip').toMatch(/background:\s*#120D06/);
    expect(regra, 'o aro do tooltip').toMatch(/border:\s*1px solid rgba\(106,85,48,0\.35\)/);
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

describe('o menu da peça equipada', () => {
  const i = fonte.indexOf('{menuPecaId && (() => {');
  const trecho = fonte.slice(i, fonte.indexOf('{/* Conteúdo do container vestido', i));

  /* POR PORTAL, e não inline na árvore da ficha (20/09/2026).

     "Não estou conseguindo clicar no item de despir dos anéis" — reportado
     duas vezes. O pop é `position: fixed`, e fixed é frágil a ancestrais:
     basta um `transform`, `filter`, `backdrop-filter` ou `overflow` no
     caminho para ele deixar de medir pela janela, ser recortado, ou ficar
     preso num contexto de empilhamento. Nada disso dá erro no console.

     Os anéis eram o caso mais fundo: as casas deles moram DENTRO de outro
     portal (o card flutuante de joias), e o pop nascia noutro galho da
     árvore. Duas tentativas por parâmetro (largura do clamp, pointer-events)
     não resolveram; subir para a raiz resolve a classe inteira do problema,
     e é o que o card de joias, os atalhos e os brincos já fazem nesta fase.

     O invólucro `.menestrel-ui` é obrigatório junto: as regras do pop são
     descendentes dele, e sem o wrapper ele perde a pele e os tokens. */
  it('sobe para a raiz por portal, com o invólucro do tema', () => {
    expect(trecho, 'o pop precisa ir por createPortal').toMatch(/ReactDOM\.createPortal\(/);
    expect(trecho, 'e aterrissar no #root').toMatch(/document\.getElementById\('root'\)/);
    expect(trecho, 'dentro de um .menestrel-ui, senão perde o CSS')
      .toMatch(/<div className="menestrel-ui">/);
  });

  it('flutua ancorado na casa clicada, sem card nem modal', () => {
    expect(trecho).toMatch(/fp-peca-pop/);
    expect(trecho).not.toMatch(/ModalShell/);
    expect(fonte).toMatch(/setMenuPecaAnchor\(ev\.currentTarget\.getBoundingClientRect\(\)\)/);
  });

  it('todo mundo vê Despir/Desequipar', () => {
    expect(trecho).toMatch(/despirLbl/);
  });

  it('só o Mestre vê o stepper de resistência, e só em peça que tem durabilidade', () => {
    /* `!it.vestido` entrou em 20/09/2026: "anéis, roupas, etc, não precisam do
       seletor de bônus, pois eles não recebem bônus". O stepper é de
       RESISTÊNCIA, e aparecia em qualquer peça com `resistencia` no catálogo —
       inclusive joias, que nunca a usam. `vestido` separa o que se VESTE do
       que se EQUIPA. */
    expect(trecho).toMatch(/const podeGerenciarRes = podeEditarEstado && resMaxPeca > 0 && !it\.vestido;/);
    expect(trecho).toMatch(/\{podeGerenciarRes && \(/);
    expect(trecho).toMatch(/ajustarResistenciaDaPeca\(it\.instanceId, resPeca - 1\)/);
    expect(trecho).toMatch(/ajustarResistenciaDaPeca\(it\.instanceId, resPeca \+ 1\)/);
  });

  it('abrir o menu NÃO fecha o card de joias/brincos/cinto', () => {
    // 16/09/2026: "Quando eu clico no brinco para despir, o card fecha."
    // Só o CLIQUE NA CASA importa aqui; trocar de aba segue fechando tudo.
    const i = fonte.indexOf('setMenuPecaAnchor(ev.currentTarget.getBoundingClientRect())');
    const cliqueNaCasa = fonte.slice(i, fonte.indexOf('}', i));
    expect(cliqueNaCasa).not.toMatch(/setJoiasOpen|setBrincosOpen|setCintoOpen/);
  });

  it('e fica ACIMA das casas flutuantes, senão ninguém clica nele', () => {
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', 'index.css'), 'utf8');
    const z = (sel) => Number(css.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^}]*z-index:\\s*(\\d+)'))[1]);
    expect(z('.fp-peca-pop')).toBeGreaterThan(z('.fp-portal-anchor'));
    expect(z('.fp-peca-pop')).toBeGreaterThan(z('.fp2-slot-flutuante'));
    // E as casas, por sua vez, acima do resto da ficha (16/09/2026: "estão
    // sendo escondidas").
    expect(z('.fp2-slot-flutuante')).toBeGreaterThan(z('.fp-portal-backdrop'));
  });

  it('fecha no clique fora, Escape ou scroll', () => {
    expect(trecho).toMatch(/FechaAoSair/);
    const i2 = fonte.indexOf('function FechaAoSair');
    const comp = fonte.slice(i2, i2 + 900);
    expect(comp).toMatch(/Escape/);
    expect(comp).toMatch(/mousedown/);
    expect(comp).toMatch(/scroll/);
  });
});

describe('Karma some da ficha de quem não conjura', () => {
  it('Guerreiro e Ladino estão na lista sem Karma', () => {
    const i = fonte.indexOf('const SEM_KARMA =');
    expect(fonte.slice(i, i + 120)).toMatch(/'Guerreiro'.*'Ladino'/);
  });

  it('a barra de Karma é filtrada por profissão', () => {
    const i = fonte.indexOf("b.key === 'ka' && SEM_KARMA.has");
    expect(i, 'o filtro tem que estar no vitBars').toBeGreaterThan(0);
    expect(fonte.slice(i - 200, i)).toMatch(/\.filter\(/);
  });
});
