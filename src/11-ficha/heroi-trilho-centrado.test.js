/* ============================================================
   heroi-trilho-centrado.test.js — a fileira do herói, só o trilho
   ============================================================
   Pedidos do usuário em 26/10/2026, na mesma mensagem:

     • "O trilho da ficha de personagem onde tem 'status, atividades, etc'
        deve ficar centralizado."
     • "Remova da ficha do personagem o texto 'Lirael Vel'Thalas Rastreador ·
        Estágio 9 · Elfo-Florestal · Guardião'."

   As duas andam juntas: o trilho só podia ficar no canto porque dividia a
   fileira com a identidade do personagem. Sem ela, a fileira é dele.

   O nome não se perdeu — ele vive no menu lateral da mesa; o estágio, na
   barra de Experiência no pé do cartão.

   Fonte, e não render: a ficha inteira só monta com banco (mesmo caminho de
   armadura-karma-ficha.test.jsx).
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ficha = readFileSync(resolve(raiz, '11-ficha/ficha.jsx'), 'utf8');
const css = readFileSync(resolve(raiz, 'index.css'), 'utf8');

const regra = (seletor) => {
  const i = css.indexOf(seletor + ' {');
  expect(i, 'não achei a regra ' + seletor).toBeGreaterThan(-1);
  return css.slice(i, css.indexOf('}', i));
};

describe('a identidade saiu da ficha', () => {
  it('não há mais nome nem linha de profissão/estágio na fileira', () => {
    expect(ficha).not.toMatch(/fp3-heroi-nome/);
    expect(ficha).not.toMatch(/fp3-heroi-meta/);
    expect(ficha).not.toMatch(/fp3-heroi-id/);
  });
  it('e o CSS delas também foi embora — regra órfã envelhece calada', () => {
    expect(css).not.toMatch(/\.fp3-heroi-nome/);
    expect(css).not.toMatch(/\.fp3-heroi-meta/);
    expect(css).not.toMatch(/\.fp3-heroi-id/);
  });
});

describe('o trilho fica centralizado', () => {
  it('a fileira centra o que tem dentro', () => {
    const fileira = regra('#root .menestrel-ui .fp3-heroi');
    expect(fileira).toMatch(/justify-content:\s*center/);
    expect(fileira).not.toMatch(/justify-content:\s*space-between/);
  });
  it('a fileira ainda é a casa do trilho de ações', () => {
    expect(ficha).toMatch(/className="fp3-heroi-acoes mc-acoes-ficha" ref=\{setSlotAcoesFicha\}/);
  });
});

/* ── O CARD STATUS SAIU, E DOIS CARDS MUDARAM DE NOME (26/10/2026) ─────────
   "Na ficha do personagem, remova o card 'status'. Mude o card 'Equipamento'
   para 'Equipamentos', e 'Arsenal' para 'Armas'." (usuário)

   Com o card foi a fileira DEF · VEL · ABS · RFI · RFM, que vivia só nele. */
describe('o card Status saiu da ficha', () => {
  it('o título e a fileira de derivados não são mais montados', () => {
    expect(ficha).not.toMatch(/<h3 className="fp-col-tit">Status<\/h3>/);
    expect(ficha).not.toMatch(/elStatusDeriv/);
    expect(ficha).not.toMatch(/fp3-status-cel/);
  });

  /* A LISTA DE STATUS ATIVOS VOLTOU (26/10/2026). Ela tinha saído junto com o
     card, sem ninguém pedir — e isso era perda de informação, não de enfeite:
     o Mestre aplicava Envenenado pelo círculo do trilho e a ficha não dizia
     mais que o personagem estava envenenado. A casa nova é o card de
     Condições, que responde à mesma pergunta e já mostrava as magias ativas. */
  it('a lista de status ativos mora no card de Condições', () => {
    const i = ficha.indexOf('const elCond = (');
    expect(i).toBeGreaterThan(-1);
    const bloco = ficha.slice(i, ficha.indexOf('\n  );', i));
    expect(bloco).toMatch(/<FichaStatusPainel/);
    expect(bloco).toMatch(/onRemover=\{removerStatus\}/);
    expect(ficha).toMatch(/window\.FichaStatusPainel = FichaStatusPainel;/);
  });
  it('e o painel vazio não cobra o vão da coluna', () => {
    expect(css).toMatch(/\.fp-status:not\(:has\(\.fp-status-chip\)\) \{ display: none/);
  });
});

describe('os dois cards renomeados', () => {
  it('"Equipamento" virou "Equipamentos"', () => {
    expect(ficha).toMatch(/\{en \? 'Equipment' : 'Equipamentos'\}/);
    expect(ficha).not.toMatch(/\{en \? 'Equipment' : 'Equipamento'\}/);
  });
});

/* ── OS ATALHOS ABREM MODAL (26/10/2026) ───────────────────────────────────
   "Na ficha do personagem, quando eu clico em habilidades, magias, etc, deve
   abrir modal."

   Duas armadilhas medidas no Chrome e fixadas aqui: o modal montado dentro da
   casa dos atalhos ficava ATRÁS da ficha (o .fp-card tem `zoom`, que cria
   contexto de empilhamento), e montado no `body` saía sem pele nenhuma (todo
   o CSS do sistema é escopado em `#root .menestrel-ui`). O alvo certo é a
   raiz do app — o mesmo que o shell usa para a janela do Livro de Regras. */
describe('os atalhos da ficha abrem modal', () => {
  const atalhos = readFileSync(resolve(raiz, '11-ficha/atalhos-ficha.jsx'), 'utf8');

  it('a lista mora num ModalShell, não mais na folha ancorada', () => {
    expect(atalhos).toMatch(/<_ModalShell/);
    /* O `extraClass` virou expressão em 28/10/2026: no passo do detalhe a
       janela ganha `modal-uso` junto. O que a trava protege é a MOLDURA ser
       a do sistema, não a folha ancorada de antes. */
    expect(atalhos).toMatch(/extraClass=\{'modal-atalho'/);
    expect(atalhos).not.toMatch(/<div className="at-panel"/);
  });
  it('e vai por portal para a RAIZ DO APP, não para o body', () => {
    expect(atalhos).toMatch(/ReactDOM\.createPortal\(/);
    expect(atalhos).toMatch(/document\.querySelector\('#root \.menestrel-ui'\) \|\| document\.body/);
  });
  it('o clique fora não fecha mais: o modal estaria sempre "fora" do rootRef', () => {
    expect(atalhos).toMatch(/const onDown = _ModalShell\s*\n?\s*\? null/);
  });
});

/* ── O CARD "ARMAS" SAIU DAS DUAS FICHAS (27/10/2026) ──────────────────────
   Pedido do usuário: "remova o card 'armas' das fichas de personagem e
   animal. Com isso, vamos ganhar um certo espaço e então diminua o card de
   'energias' para ficar alinhado."

   Ele nasceu em 26/10 e viveu um dia e meio; em 27/10 de manhã eu ainda o
   extraí para componente, de modo que a ficha do bicho usasse a MESMA peça
   do dono. Agora ele sai dos dois — e sai inteiro: o componente, a lista de
   ataques que só o alimentava na ficha do PJ, o adaptador dos ataques da
   criatura e a pele dele no CSS. Código morto que fica no bundle não é
   gratuito. O motor dos ataques segue onde sempre esteve, em
   01-core/gerarAtaques, usado pela Batalha. */
describe('o card Armas saiu das duas fichas', () => {
  it('nem o componente nem o que só o alimentava sobraram', () => {
    expect(ficha).not.toMatch(/function ArsenalCard/);
    expect(ficha).not.toMatch(/<ArsenalCard/);
    expect(ficha).not.toMatch(/LINHAS_ARSENAL/);
    expect(ficha).not.toMatch(/ataquesDoAnimalParaArsenal/);
    // A lista de ataques do PJ só servia a ele.
    expect(ficha).not.toMatch(/const ataques = gerarAtaques\(/);
  });

  it('e a pele dele saiu do CSS junto', () => {
    expect(css).not.toMatch(/\.fp3-arsenal/);
  });

  /* O motor continua: quem monta ataques de verdade é a Batalha. */
  it('mas gerarAtaques segue de pé, para quem precisa dele', () => {
    const helpers = readFileSync(resolve(raiz, '01-core/inventario-helpers.jsx'), 'utf8');
    expect(helpers).toMatch(/function gerarAtaques\(/);
  });
});

/* ── E O ENERGIAS VIROU A FOLGA DA COLUNA (27/10/2026) ─────────────────────
   "Com isso, vamos ganhar um certo espaço e então diminua o card de
   'energias' para ficar alinhado." A segunda metade do mesmo pedido.

   Medido no navegador, com o Armas fora: coluna da esquerda 963px, da
   direita 748 — 215px de degrau. O que prendia a esquerda era o piso de
   300px dos tubos; eles já crescem sozinhos (`flex: 1 1 auto`), então o piso
   não era altura desejada, era chão alto demais. Com ele em 120 os dois pés
   batem em 837px, o mesmo pixel.

   O número que se trava aqui é o PISO, não a altura: a altura é a folga da
   coluna e muda com o conteúdo. */
describe('o Energias encolhe até a coluna da direita', () => {
  it('o piso das pedras deixa o card encolher', () => {
    const pisos = [...css.matchAll(/\.fp-gemas \{[^}]*min-height:\s*(\d+)px/g)].map((m) => Number(m[1]));
    expect(pisos.length).toBeGreaterThan(0);
    // O último é quem vale: o bloco de 27/10 fica no fim do arquivo.
    expect(pisos[pisos.length - 1]).toBe(120);
  });

  it('e as pedras continuam crescendo para ocupar o que a coluna der', () => {
    expect(css).toMatch(/\.fp-gemas \{\r?\n\s*flex: 1 1 auto;/);
  });
});

/* ── A CASA VAZIA NÃO SE NOMEIA (26/10/2026) ───────────────────────────────
   "Remova a palavra 'cabeça' que está no slot cabeça acima da imagem da ficha
   do personagem." (usuário, duas vezes — a primeira leitura desta frase foi
   errada: mexi no título da janela da região, e a palavra continuou na tela.)

   O alvo era `inv-slot-meta`: a casa VAZIA escrevia o nome da região dentro
   de si, por cima da silhueta esmaecida (o Lirael tem a cabeça vazia, e é
   por isso que era justo "Cabeça" que ele via). A legenda `.fp3-nomr` logo
   abaixo da casa já diz a região; a de dentro era repetição que tapava a
   pintura. Fica no meta só o nome da PEÇA, quando ela não tem arte própria. */
describe('a casa vazia não escreve o nome da região', () => {
  it('o meta da casa só carrega o nome da peça, e só sem arte', () => {
    expect(ficha).toMatch(/\{filled && !bg && <span className="inv-slot-item">\{nomeLbl\}<\/span>\}/);
  });
  it('não há mais rótulo de região dentro da casa', () => {
    expect(ficha).not.toMatch(/<span className="inv-slot-lbl">/);
  });
  it('e a legenda de fora continua nomeando a região', () => {
    expect(ficha).toMatch(/<span className="fp3-nomr">\{slotLbl\(regiao\)\}<\/span>/);
  });
});

/* A janela da região também se chama pela peça — mudança da mesma leva. */
describe('a janela da região se chama pela peça', () => {
  it('o título é o nome da peça em foco, e a região é a reserva', () => {
    expect(ficha).toMatch(/title=\{<><i className=\{'ti ' \+ \(FP_REGION_ICON\[regiaoAberta\] \|\| 'ti-shield'\)\} aria-hidden="true" \/> \{nomeFoco \|\| slotLbl\(regiaoAberta\)\}<\/>\}/);
  });
  it('e o nome não aparece duas vezes na mesma janela', () => {
    expect(ficha).not.toMatch(/<h4 className="fp3-modal-peca-nome">\{nomeFoco\}<\/h4>/);
  });
});
