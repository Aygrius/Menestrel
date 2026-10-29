/* ============================================================
   loja-vendedor-e-moeda.test.js — o painel do item na loja
   ============================================================
   Pedido do usuário (27/10/2026): "no campo 'vendedor' da loja, deve mostrar
   o nome completo do personagem que está vendendo, apenas isso. Acima do
   campo vendedor, onde está escrito preço, o ícone da moeda deve ficar como
   é no trilho das moedas, sem borda."

   O campo dizia "Você · 3 à venda": a conta no lugar do personagem, e a
   quantidade no lugar do vendedor. O `vendedor_nome` já é nome + sobrenome
   (ver publicar_item_loja, scripts/sql/anuncios-loja-2026-09-27.sql), então
   é só mostrá-lo.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const loja = readFileSync(resolve(__dirname, './loja.jsx'), 'utf8');
const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');

describe('o campo Vendedor', () => {
  it('mostra o nome do personagem, e só isso', () => {
    expect(loja).toMatch(
      /<dt>\{en \? 'Seller' : 'Vendedor'\}<\/dt><dd>\{sel\.anuncio\.vendedor_nome \|\| \(en \? 'An adventurer' : 'Um aventureiro'\)\}<\/dd>/
    );
  });

  it('não diz mais "Você" — quem vende é o personagem, não a conta', () => {
    expect(loja).not.toMatch(/sel\.meu \? \(en \? 'You' : 'Você'\)/);
  });

  it('não carrega mais a quantidade no campo do vendedor', () => {
    expect(loja).not.toMatch(/\$\{sel\.qtd\} à venda/);
  });
});

describe('o ícone da moeda no Preço', () => {
  it('fica solto, como no trilho das moedas: sem caixa e sem aro', () => {
    expect(css).toMatch(
      /#root \.menestrel-ui \.loja-painel-dados \.moeda-pill-ic \{\r?\n\s*width: auto; height: auto; padding: 0; border: 0;/
    );
  });

  it('a regra do trilho, que é o modelo, continua de pé', () => {
    expect(css).toMatch(/#root \.menestrel-ui \.inv-trilho \.moeda-pill-ic \{/);
  });
});

/* ── A JANELA DO "GERENCIAR" (27/10/2026) ────────────────────────────────────
   "Quando eu clico em 'gerenciar' o item à venda, abre o modal. Não precisa
   repetir em 'características' o preço, pois ele já aparece no topo do modal.
   O ícone da moeda não precisa de borda, vamos usar o padrão do trilho, e a
   fonte deve ter o tamanho do conteúdo em 'vendedor' e 'armazena'." */
const bestiario = readFileSync(resolve(__dirname, '../09-bestiario/bestiario.jsx'), 'utf8');

describe('o preço no topo e Características', () => {
  it('o passe com Preço manda o "Valor" sair de Características', () => {
    expect(bestiario).toMatch(/if \(omitir\.includes\('preco'\)\) omitir\.push\('valor'\);/);
  });

  it('a linha "Valor" obedece ao omitir, como as outras', () => {
    expect(bestiario).toMatch(/\{se\('valor', <BestLinha rotulo=\{lang === 'en' \? 'Value' : 'Valor'\}/);
  });

  it('Características sem linha nenhuma não deixa um título sozinho', () => {
    expect(css).toMatch(/\.best-secao--lista:not\(:has\(li\)\) \{ display: none; \}/);
  });
});

describe('a moeda no passe do item', () => {
  it('fica solta, como no trilho: sem caixa e sem aro', () => {
    expect(css).toMatch(
      /#root \.menestrel-ui \.item-passe \.mn-celula-valor \.moeda-pill-ic \{\r?\n\s*width: auto; height: auto; padding: 0; border: 0;/
    );
  });

  it('fala no tamanho do valor da célula (o de Vendedor e Armazena)', () => {
    expect(css).toMatch(/\.item-passe \.mn-celula-valor > \.moeda-pills,\r?\n[^\n]*\.gratis \{ font-size: inherit; \}/);
    expect(css).toMatch(/\.item-passe \.mn-celula-valor \.moeda-pill-qtd \{ font: inherit; color: inherit; \}/);
  });
});

/* "No card de visualização de item, o botão gerenciar está muito colado e sem
   espaçamento para baixo." Com descrição longa ele nem aparecia: o card tem
   teto de altura e overflow:hidden. */
describe('o botão do painel da loja', () => {
  it('tem respiro em cima e embaixo', () => {
    expect(css).toMatch(/\.loja-painel-corpo \{ flex: 1 1 auto; min-height: 0; padding-bottom: 24px; \}/);
    expect(css).toMatch(/\.loja-painel-botao \{ margin-top: 8px; \}/);
  });

  it('quem rola dentro do card é a descrição, para o botão não ser cortado', () => {
    expect(css).toMatch(/\.loja-painel-desc \{ min-height: 0; overflow-y: auto; \}/);
    expect(loja).toMatch(/className="loja-painel-desc mn-rolagem"/);
  });
});

/* Com seis células (Vendedor, Preço, Quantidade, Resistência, Armazena,
   Ocupa) a fileira do passe não cabe na janela de 680px: o flex encolhia
   cada célula abaixo do próprio rótulo, e "QUANTIDADE" — palavra só, que
   não quebra — vazava por cima da régua da vizinha. */
describe('o passe do item quando não cabe numa fileira', () => {
  it('a régua é o vão entre as células, para a fileira poder quebrar', () => {
    expect(css).toMatch(
      /#root \.menestrel-ui \.item-passe \{\r?\n\s*flex-wrap: wrap; gap: 1px; background: var\(--regua-forte\); overflow: hidden;/
    );
    expect(css).toMatch(/\.item-passe \.mn-celula \{ background: var\(--chao-celula-opaco\); border-left: none; \}/);
  });

  it('nenhuma célula fica mais estreita que o próprio rótulo', () => {
    expect(css).toMatch(/\.item-passe \.mn-celula \{ min-width: min-content; \}/);
  });
});

/* ── A CASA DO PAINEL É A CASA DA GRADE (27/10/2026) ───────────────────────
   "No card de visualização de item na loja/inventário, o tamanho do slot deve
   ser igual (ou próximo) ao slot de loja/inventário." Media 52px contra os 78
   da casa — dois terços — e, pior, mostrava o GLIFO onde a grade mostra a
   PINTURA: escolher um item trocava o desenho dele por um símbolo genérico.
   Medido depois: as duas em 78, com a pintura preenchendo a casa. */
describe('a casa do item no painel da loja', () => {
  it('mede o mesmo token da casa da grade, e não um número à parte', () => {
    expect(css).toMatch(
      /#root \.menestrel-ui \.loja-painel-ic \{\r?\n\s*width: var\(--inv-casa, 78px\); height: var\(--inv-casa, 78px\);/);
    // O glifo cresce na mesma proporção da grade (52% da casa).
    expect(css).toMatch(/font-size: calc\(var\(--inv-casa, 78px\) \* 0\.52\);/);
    expect(css).toMatch(/font-size: calc\(var\(--inv-casa\) \* 0\.52\);/);  // a da grade
  });

  it('e mostra a pintura do item, pelo mesmo componente da grade', () => {
    expect(loja).toMatch(/<ItemIcone cat=\{sel\.cat\} icon=\{invItemIcon\(sel\.cat\)\} \/>/);
    // A pintura preenche a casa, como na grade.
    expect(css).toMatch(/\.loja-painel-ic \.inv-card-arte \{\r?\n\s*width: 100%; height: 100%; object-fit: contain;/);
  });

  /* O mesmo ícone é reusado no cabeçalho da proposta do Estoque, a 38px: a
     regra de lá é mais específica e continua vencendo (medido: 38 contra 78). */
  it('sem atropelar o uso dele no Estoque', () => {
    expect(css).toMatch(/\.estoque-prop-top \.loja-painel-ic \{ width: 38px; height: 38px;/);
  });
});

/* ── A CASA DO RECIPIENTE (27/10/2026) ─────────────────────────────────────
   "O slot do item que fica armazenado dentro de um recipiente" deve ser igual
   (ou próximo) ao slot de loja/inventário. Ela era 50px — medido, 51 contra
   os 78 da grade: o mesmo item aparecia menor dentro da mochila do que solto
   ao lado dela. O 50 vinha de quando "o painel tem 360px"; hoje ele tem 440 e
   a casa da grade subiu para 78, então a conta que justificava o número não
   é mais a conta de hoje. */
describe('a casa do item dentro do recipiente', () => {
  it('não tem mais tamanho próprio — herda o token da grade', () => {
    expect(css).not.toMatch(/\.det-grade-recipiente \{ --inv-casa: 50px; \}/);
    expect(css).toMatch(/\.menestrel-ui \{ --inv-casa: 78px;/);
  });

  /* A regra que vale NO PAINEL é a de `.det-recipiente >` (mais específica
     que as outras três que também pintam esta grade). A aba "Conteúdo" da
     JANELA do item fica de fora de propósito: lá o 50 é calibrado — "o modal
     tem 728px: 13 casas de 50px + 12 vãos + 2 respiros = 725,6px". */
  it('e a faixa do painel sai do token, não de um número escrito à mão', () => {
    /* O seletor aparece em mais de um bloco (margens num, faixas noutro):
       o que interessa é o que declara as COLUNAS. */
    const blocos = css.split('#root .menestrel-ui .best-detail .det-recipiente > .det-grade-recipiente {')
      .slice(1).map((t) => t.slice(0, t.indexOf('}')));
    const comColunas = blocos.filter((b) => b.includes('grid-template-columns'));
    expect(comColunas, 'nenhum bloco do painel declara as colunas').toHaveLength(1);
    expect(comColunas[0]).toMatch(/repeat\(auto-fill, minmax\(calc\(var\(--inv-casa\) \* 0\.9\), 1fr\)\)/);
    expect(comColunas[0]).not.toMatch(/50px/);
  });

  /* O piso 10% abaixo é a regra, não arredondamento: medido no painel de
     440px, com o piso em 78 cabem 4 colunas e o `1fr` infla a casa para 92
     (18% maior que a da grade); com o piso abaixo cabe uma quinta e a casa
     fica em 74 — 5% menor, e a fileira enche. */
  it('o piso fica abaixo do token de propósito, para caber mais uma coluna', () => {
    const i = css.indexOf('o piso da faixa sai do TOKEN');
    expect(i).toBeGreaterThan(-1);
    expect(css.slice(i, i + 900)).toMatch(/10% ABAIXO/);
  });
});

/* ── A MOEDA NÃO ESCREVE O NOME (27/10/2026) ───────────────────────────────
   "Ao invés de escrever 'ícone 0 latão', deve aparecer como 'ícone 0', isso
   vale para a descrição de valor nos itens também."

   O padrão era escrever, e SETE regras espalhadas pelo index.css o apagavam
   caso a caso: topo do inventário, pé do card da loja, grade de compra,
   tabela do bestiário, texto do resgate e nota de venda. Cada uma entrou no
   dia em que alguém reparou naquele canto; o trilho e o preço do item ainda
   escreviam. Sete exceções para uma regra querem dizer que a regra é a
   exceção — o padrão virou NÃO escrever, e as sete saíram. */
describe('o nome da denominação', () => {
  it('não se escreve em lugar nenhum, por padrão', () => {
    expect(css).toMatch(/#root \.menestrel-ui \.moeda-pill-nome \{ display: none; \}/);
  });

  it('e as sete exceções que faziam isso à mão saíram', () => {
    for (const ctx of ['inv-topo-moedas', 'loja-it-foot', 'loja-compra-grade',
      'best-table-wrap', 'loja-resgate-texto', 'det-venda-nota']) {
      expect(css, ctx).not.toMatch(new RegExp('\.' + ctx + ' \.moeda-pill-nome \{ display: ?none'));
    }
  });

  /* "Grátis" não é denominação, é ESTADO: sem ela a pílula do item sem preço
     vira um "0" sem explicação — que é como ela já aparecia nos seis
     contextos que apagavam o nome à mão. */
  it('mas "Grátis" continua escrito', () => {
    expect(css).toMatch(/\.moeda-pill--gratis \.moeda-pill-nome \{\r?\n\s*display: inline;/);
  });

  /* Nada se perde: a denominação está na cor do ícone e no tooltip. */
  it('e a denominação segue no tooltip de cada pílula', () => {
    const inv = readFileSync(resolve(__dirname, './inventario.jsx'), 'utf8');
    expect(inv).toMatch(/\{\.\.\.propsTip\(abrirTip, fecharTip, nome\)\}/);
    expect(inv).toMatch(/style=\{\{ color: MOEDA_COR\[tipo\] \}\}/);
  });
});

/* ── O VALOR EM MOEDAS, E NÃO POR EXTENSO (27/10/2026) ─────────────────────
   "Ainda está aparecendo 'Valor 1 moeda de prata' na descrição de
   visualização do item." É o fecho do pedido anterior sobre as moedas: eu o
   tinha lido como sendo só das pílulas e deixei esta linha de fora porque ela
   é PROSA — não tem ícone para pôr no lugar da palavra. Mas era a última que
   ainda escrevia a denominação, e dizia o mesmo preço num vocabulário
   diferente do resto da janela. */
describe('a linha de Valor do item', () => {
  it('mostra a pílula, como o Preço, e não a frase por extenso', () => {
    expect(bestiario).toMatch(/function valorEmMoedas\(latao, lang\) \{/);
    expect(bestiario).toMatch(/valor=\{valorEmMoedas\(it\.valor_latao, lang\)\}/);
    expect(bestiario).toMatch(/<Pills latao=\{n\} lang=\{lang\} tamanho="sm" \/>/);
  });

  /* "Sem valor" é um fato sobre o item, não uma quantia: uma pílula de 0
     diria outra coisa. */
  it('mas o zero continua em palavra', () => {
    expect(bestiario).toMatch(/if \(n <= 0\) return lang === 'en' \? 'No value' : 'Sem valor';/);
  });

  /* Na mesma janela o Preço já tinha o ícone solto; o Valor vinha com a
     caixinha do chip de atributo, duas linhas abaixo. */
  it('e o ícone fica solto, como nas outras linhas de dados', () => {
    expect(css).toMatch(
      /#root \.menestrel-ui \.best-stat-val \.moeda-pill-ic \{\r?\n\s*width: auto; height: auto; padding: 0; border: 0;/);
  });

  /* A frase continua existindo para quem precisa de TEXTO (tooltip, aria). */
  it('a versão por extenso segue disponível, só não é mais a da tela', () => {
    expect(bestiario).toMatch(/function valorPorExtenso\(latao, lang\)/);
    expect(bestiario).toMatch(/valorPorExtenso, valorEmMoedas,/);
  });
});
