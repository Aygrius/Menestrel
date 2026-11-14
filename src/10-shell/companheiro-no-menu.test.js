/* ============================================================
   companheiro-no-menu.test.js — o bicho vira galho do menu
   ============================================================
   Pedido do usuário (27/10/2026): "adicione dentro do menu lateral esquerdo
   'companheiros', os companheiros atuais e os menus 'identificação,
   conhecimento e inventário' da criatura. Com isso, removeremos da ficha as
   informações de 'identidade, derivadas, etc', aproximando mais a ficha do
   companheiro da ficha do personagem."

   O companheiro deixou de ser FOLHA e virou GALHO, como o personagem: o nome
   abre a ficha (o boneco) e os três filhos abrem as páginas dele. O que este
   arquivo trava é a cadeia inteira, porque ela atravessa dois módulos e se
   parte em silêncio: o menu monta o nó com `parte`, o clique leva a `parte`
   ao pedido, o pedido chega à ficha, e a ficha escolhe a página.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const shell = readFileSync(resolve(__dirname, './shell.jsx'), 'utf8');
const ficha = readFileSync(resolve(__dirname, '../11-ficha/ficha.jsx'), 'utf8');

/* ── COMPANHEIROS SAIU DO MENU LATERAL (04/11/2026) ─────────────────────────
   "O menu 'companheiros' está no trilho superior para o personagem, então
   pode remover do menu lateral esquerdo." (usuário) A árvore de 27/10/2026 —
   cada bicho um galho com as quatro páginas dele — saiu inteira. O caminho
   até as quatro páginas é o trilho da ficha: o botão Companheiros abre a
   grade dos bichos, e o leque de cada um leva a Ficha, Identificação,
   Conhecimento e Inventário. */
describe('os companheiros pelo trilho, não pelo menu', () => {
  const constantes = readFileSync(resolve(__dirname, '../01-core/constants.jsx'), 'utf8');
  const paginas = readFileSync(resolve(__dirname, '../11-ficha/paginas-ficha.jsx'), 'utf8');

  it('o menu do Jogador não tem mais o item nem a árvore dos bichos', () => {
    expect(constantes).not.toMatch(/id: 'ficha_comp'/);
    expect(shell).not.toMatch(/PARTES_DO_COMPANHEIRO|filhosDeCompanheiros|pedirCompanheiro/);
  });

  it('o trilho da ficha leva à página dos bichos', () => {
    expect(ficha).toMatch(/botaoPagina\('animais', 'ti-paw', 'Companheiros', 'Companions'\)/);
  });

  it('e o leque de cada bicho leva às quatro páginas dele', () => {
    const m = paginas.match(/function PaginaCompanheiros[\s\S]*?acoesDe=\{\(\) => \[([\s\S]*?)\]\}/);
    expect(m, 'não achei o leque da página Companheiros').toBeTruthy();
    expect([...m[1].matchAll(/chave: '(\w+)'/g)].map((x) => x[1])).toEqual(['ficha', 'info', 'conhecimento', 'inventario']);
  });

  /* 08/11/2026: o galho do personagem saiu do menu do Mestre — nem páginas,
     nem Editar/Excluir. "Personagens" abre os cards; editar e excluir uma
     ficha é pelo card em Jogadores. */
  it('o menu do Mestre não pendura os personagens', () => {
    expect(shell).not.toMatch(/personagensComFilhos/);
    expect(shell).not.toMatch(/':editar', secao: 'personagens_m'/);
    expect(shell).not.toMatch(/':excluir', secao: 'personagens_m'/);
  });

  /* A ficha segue escolhendo a página do bicho, com o boneco como recuo. */
  it('a ficha escolhe a página, com a ficha como recuo', () => {
    expect(ficha).toMatch(/const \[compParte, setCompParte\] = useState\('ficha'\);/);
    expect(ficha).toMatch(/parte=\{compParte\}/);
  });
});

describe('a ficha do bicho responde às quatro páginas', () => {
  it('inventário e as duas de informação têm saída própria', () => {
    expect(ficha).toMatch(/if \(parte === 'inventario'\) \{/);
    expect(ficha).toMatch(/if \(parte === 'info' \|\| parte === 'conhecimento'\) \{/);
    // E a ficha (o boneco) é o padrão.
    expect(ficha).toMatch(/pesoDoCavaleiro = 0, parte = 'ficha' \}\) \{/);
  });

  it('as colunas da criatura obedecem à parte', () => {
    expect(ficha).toMatch(/function FichaCriaturaSheet\(\{[\s\S]{0,400}parte = 'info' \}\)/);
    // Identidade, Atributos, Derivadas e Ataques na Identificação; Habilidades,
    // Técnicas e Magias no Conhecimento — uma bifurcação só (04/11/2026).
    expect(ficha).toMatch(/\{parte === 'conhecimento' \? \(\s*<>\s*<div className="fp-col-pad-l">\{secGrupo\(grupos\[0\]\)\}/);
  });
});

/* ── O ÍCONE DE AMIGOS (27/10/2026) ────────────────────────────────────────
   "O ícone de 'amigos' no menu lateral esquerdo está estranho." Ele não tinha
   entrada em ICONE_NAV e caía no recuo de `iconeDe` — `ti-point`, um pontinho
   ao lado de itens todos com glifo. E não achava pelo segundo caminho do mapa
   porque o item não tem `secao` (de propósito: para não acender junto com
   "Ficha"). O glifo é o do próprio pacto, o mesmo do AmigosFab. */
describe('todo item do menu tem ícone próprio', () => {
  const constantes = readFileSync(resolve(__dirname, '../01-core/constants.jsx'), 'utf8');
  const fab = readFileSync(resolve(__dirname, '../11-ficha/amigos-fab.jsx'), 'utf8');

  it('Amigos tem o ícone do pacto, e não o pontinho do recuo', () => {
    expect(shell).toMatch(/ficha_amigos: 'ti-heart-handshake',/);
    // É o mesmo símbolo da janela que o item abre.
    expect(fab).toMatch(/ti-heart-handshake/);
  });

  it('e nenhum outro item do NAV_MESA ficou sem o seu', () => {
    const mapa = shell.match(/const ICONE_NAV = \{([\s\S]*?)\n {2}\};/)[1];
    const tem = new Set([...mapa.matchAll(/(\w+):\s*'ti-/g)].map((m) => m[1]));
    const nav = constantes.match(/const NAV_MESA = \{([\s\S]*?)\n\};/)[1];
    const chaves = new Set([
      ...[...nav.matchAll(/id: '([\w_]+)'/g)].map((m) => m[1]),
      ...[...nav.matchAll(/secao: '([\w_]+)'/g)].map((m) => m[1]),
    ]);
    expect([...chaves].filter((k) => !tem.has(k))).toEqual([]);
  });
});

/* ── FICHA, MESA E DIÁRIO (04/11/2026) ─────────────────────────────────────
   "O menu mesa não está atualizado como fizemos para o mestre" (usuário),
   com a escolha "Mesa + Diário em trilho". Eram dois troncos com gaveta
   (27/10/2026); hoje Loja, Amigos e Companheiros são botões do trilho da
   ficha, e o Diário é um grupo de trilho como a Ambientação do Mestre. */
describe('o menu do Jogador: Ficha, Mesa e Diário', () => {
  const constantes = readFileSync(resolve(__dirname, '../01-core/constants.jsx'), 'utf8');
  const nav = (() => {
    const janela = {};
    // eslint-disable-next-line no-new-func
    new Function('window', constantes)(janela);
    return janela;
  })();
  const mesa = nav.NAV_MESA.player.mesa;
  const acha = (id) => mesa.find((n) => n.id === id);

  it('três itens, nenhuma gaveta', () => {
    expect(mesa.map((n) => n.id)).toEqual(['ficha_ficha', 'aventuras', 'diario']);
    expect(acha('ficha_ficha').filhos).toBeUndefined();
    expect(acha('aventuras').filhos).toBeUndefined();
  });

  // 04/11/2026: Conhecimento saiu do trilho; Técnicas entrou como página.
  it('Identificação, Loja e Amigos moram no trilho da ficha', () => {
    expect(ficha).toMatch(/botaoPagina\('info', 'ti-user', 'Identificação', 'Identity'\)/);
    expect(ficha).toMatch(/botaoPagina\('loja', 'ti-building-store', 'Loja', 'Shop'\)/);
    expect(ficha).toMatch(/botaoPagina\('amigos', 'ti-heart-handshake', 'Amigos', 'Friends'\)/);
    expect(ficha).not.toMatch(/botaoPagina\('conhecimento'/);
  });

  it('o Diário é grupo de trilho, com as seis páginas na ordem (Entidades em 08/11/2026)', () => {
    const diario = acha('diario');
    expect(diario.trilho).toBe(true);
    expect(diario.filhos.map((f) => f.secao)).toEqual(['lugares', 'cidades', 'locais', 'npcs', 'entidades', 'grupos', 'memorias']);
  });

  it('as páginas seguem sendo destino, e por isso têm título', () => {
    const titulos = nav.folhasDoMenu(mesa).map((f) => f.secao + (f.filtro ? '/' + f.filtro : ''));
    expect(titulos).toEqual(expect.arrayContaining(['ficha/ficha', 'aventuras', 'lugares', 'memorias']));
  });

  it('o trilho do Diário chega à página do Jogador', () => {
    const diarioJsx = readFileSync(resolve(__dirname, '../13-diario/diario.jsx'), 'utf8');
    expect(shell).toMatch(/<DiarioView[\s\S]{0,400}trilhoPaginas=\{trilhoPaginas\}/);
    expect(diarioJsx).toMatch(/function DiarioView\(\{[^}]*trilhoPaginas = null \}\)/);
  });
});
