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

describe('o companheiro é um galho, com as quatro páginas', () => {
  /* Começa por "Ficha", como PARTES_DA_FICHA do dono: clicar no nome do bicho
     já abre o boneco, mas a página tem de aparecer ESCRITA como as outras —
     senão são três páginas mais uma invisível. */
  it('as quatro partes são as mesmas palavras das do dono', () => {
    const m = shell.match(/const PARTES_DO_COMPANHEIRO = \[[\s\S]*?\];/);
    expect(m, 'não achei PARTES_DO_COMPANHEIRO').toBeTruthy();
    const partes = [...m[0].matchAll(/parte: '(\w+)'/g)].map((x) => x[1]);
    expect(partes).toEqual(['ficha', 'info', 'conhecimento', 'inventario']);
    expect(m[0]).toMatch(/Ficha/);
    expect(m[0]).toMatch(/Identificação/);
    expect(m[0]).toMatch(/Conhecimento/);
    expect(m[0]).toMatch(/Inventário/);
  });

  /* O NOME DO BICHO É DESTINO, SEMPRE (27/10/2026). Ao virar galho ele caiu
     em dois recuos do menu de uma vez: `f.filhos[0]` abria a Identificação em
     vez da ficha, e `if (!estaAberto)` fazia o clique não dar em NADA quando
     a gaveta já estava aberta — e ela abre sozinha no bicho da tela. Era o
     caminho de volta de Inventário para o boneco. */
  it('clicar no nome do companheiro abre a ficha dele, aberta ou fechada a gaveta', () => {
    expect(shell).toMatch(/if \(f\.comp\) irPara\(f\);/);
    expect(shell).toMatch(/else if \(!estaAberto\) irPara\(\(f\.aba \|\| f\.secao\) \? f : f\.filhos\[0\]\);/);
  });

  /* A gaveta de um bicho não pode abrir porque a ficha do DONO está aberta —
     senão todas abrem juntas, já que o nó passou a carregar o `pj`. */
  it('só o bicho da tela abre a gaveta sozinho', () => {
    expect(shell).toMatch(/const estaAberto = \(f\.comp\r?\n?\s*\? compPedido\.id === f\.comp/);
  });

  /* E a marcação: `comp` sozinho acendia as QUATRO páginas de uma vez, porque
     todas são do mesmo bicho. Quem distingue é a parte. */
  it('só a página aberta fica marcada, não as quatro do bicho', () => {
    expect(shell).toMatch(
      /compPedido\.id === f\.comp && \(f\.parte \|\| 'ficha'\) === \(compPedido\.parte \|\| 'ficha'\)/);
  });

  it('cada companheiro ganha os filhos, e cada filho leva a sua parte', () => {
    expect(shell).toMatch(/filhos: PARTES_DO_COMPANHEIRO\.map\(\(p\) => \(\{/);
    expect(shell).toMatch(/id: 'comp:' \+ c\.id \+ ':' \+ p\.parte, comp: c\.id, parte: p\.parte/);
  });
});

describe('a cadeia do clique até a página', () => {
  it('o clique no nó leva a parte ao pedido', () => {
    expect(shell).toMatch(/pedirCompanheiro\(no\.comp, no\.parte\);/);
    expect(shell).toMatch(/const pedirCompanheiro = \(compId, parte\) =>/);
    expect(shell).toMatch(/\{ id: compId, parte: parte \|\| null, token: c\.token \+ 1 \}/);
  });

  /* A ABA VEM JUNTO (27/10/2026). Antes o clique só pedia o bicho, apostando
     que "quem abriu o submenu passou pela aba". A aposta nunca valeu: a
     gaveta do menu FICA ABERTA ao navegar, então o item seguia clicável do
     Inventário, da Loja ou da Cena — e dali trocava o bicho de uma aba que
     não estava na tela, sem nada acontecer. */
  it('e leva à aba do companheiro, para o clique não cair no vazio', () => {
    expect(shell).toMatch(/if \(no\.pj\) \{ abrirFichaDoPj\(no\.pj, 'animais'\); ir\('personagens_m', '', true\); \}/);
    expect(shell).toMatch(/else ir\('ficha', 'animais'\);/);
  });

  /* O Mestre precisa saber de QUEM é o bicho para chegar à ficha certa. */
  it('o galho do Mestre carimba o dono em cada bicho e em cada página', () => {
    expect(shell).toMatch(/const comPj = \(nos, pjId\) => nos\.map/);
    expect(shell).toMatch(/filhos: comPj\(filhosDeCompanheiros, pj\.id\)/);
  });

  it('o pedido chega à ficha pelas duas montagens dela', () => {
    expect(shell.match(/compPedidoParte=\{compPedido\.parte\}/g) || []).toHaveLength(2);
    expect(ficha).toMatch(/compPedidoParte = null \}\) \{/);
  });

  /* Sem parte no pedido (clique no NOME do bicho) a ficha volta ao boneco —
     é a página que o nome abre, como no personagem. */
  it('e a ficha escolhe a página, com a ficha como recuo', () => {
    expect(ficha).toMatch(/const \[compParte, setCompParte\] = useState\('ficha'\);/);
    expect(ficha).toMatch(/setCompParte\(compPedidoParte \|\| 'ficha'\);/);
    expect(ficha).toMatch(/parte=\{compParte\}/);
  });
});

/* "COMPANHEIROS" É GAVETA E DESTINO (27/10/2026). Com animais ele ganha
   filhos — e um nó com filhos só abria a gaveta. Quem tinha companheiro
   clicava em "Companheiros" e não ia a lugar nenhum; de quebra a página
   perdia o título, porque `folhasDoMenu` só conta um galho como destino
   quando ele diz `navega`. */
describe('o item Companheiros leva à aba, e não só abre a gaveta', () => {
  const constantes = readFileSync(resolve(__dirname, '../01-core/constants.jsx'), 'utf8');

  it('ficha_comp é destino declarado', () => {
    expect(constantes).toMatch(
      /id: 'ficha_comp', secao: 'ficha', filtro: 'animais', navega: true,/);
  });

  it('e o clique leva o FILTRO junto, senão abre a aba Ficha', () => {
    expect(shell).toMatch(/ir\(no\.secao, no\.filtro\);/);
  });

  it('folhasDoMenu conta o galho que navega — é de lá que vem o título', () => {
    expect(constantes).toMatch(/if \(n\.navega && n\.secao\) out\.push\(n\);/);
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
    // Identidade, Derivadas e Ataques na Identificação; Capacidades no Conhecimento.
    expect((ficha.match(/\{parte !== 'conhecimento' && \(/g) || []).length).toBe(3);
    expect((ficha.match(/\{parte === 'conhecimento' && \(/g) || []).length).toBe(1);
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

/* ── AS DUAS GAVETAS DO JOGADOR (27/10/2026) ───────────────────────────────
   "Dentro do menu ficha, do lado esquerdo, coloque os menus identificação,
   conhecimento, inventário. Loja, Diário, Amigos ficam dentro de Mesa."

   A lista plana tinha crescido para nove entradas e não dizia mais a que cada
   uma pertencia. O critério separa bem: o que é DO PERSONAGEM fica na Ficha —
   o que ele é, o que sabe, o que carrega; o que é DA MESA fica na Mesa — onde
   se compra, o que se anota, com quem se joga. */
describe('o menu do Jogador em dois troncos', () => {
  const constantes = readFileSync(resolve(__dirname, '../01-core/constants.jsx'), 'utf8');
  const nav = (() => {
    const janela = {};
    // eslint-disable-next-line no-new-func
    new Function('window', constantes)(janela);
    return janela;
  })();
  const mesa = nav.NAV_MESA.player.mesa;
  const acha = (id) => mesa.find((n) => n.id === id);
  const rotulos = (nos) => (nos || []).map((n) => (n.rotulo && n.rotulo.pt) || n.secao);

  it('Ficha guarda Identificação, Conhecimento e Inventário', () => {
    expect(rotulos(acha('ficha_ficha').filhos)).toEqual(['Identificação', 'Conhecimento', 'inventario']);
  });

  it('Mesa guarda Loja, Diário e Amigos', () => {
    expect(rotulos(acha('aventuras').filhos)).toEqual(['loja', 'Diário', 'Amigos']);
  });

  /* Companheiros fica FORA das duas: cada bicho é um galho com as quatro
     páginas dele, e dentro da Ficha seriam quatro andares de menu para
     chegar ao inventário de um cavalo. */
  it('Companheiros segue no primeiro andar, por ter árvore própria', () => {
    expect(acha('ficha_comp')).toBeTruthy();
    expect(acha('ficha_comp').filhos).toBeUndefined();   // os bichos entram no 10-shell
    expect(mesa.map((n) => n.id)).toEqual(['ficha_ficha', 'ficha_comp', 'aventuras']);
  });

  /* Os dois troncos são gaveta E destino: clicar neles abre a página. */
  it('Ficha e Mesa continuam sendo destino, e por isso têm título', () => {
    for (const id of ['ficha_ficha', 'aventuras']) expect(acha(id).navega).toBe(true);
    const titulos = nav.folhasDoMenu(mesa).map((f) => f.secao + (f.filtro ? '/' + f.filtro : ''));
    expect(titulos).toContain('ficha/ficha');
    expect(titulos).toContain('aventuras');
    expect(titulos).toContain('inventario');
    expect(titulos).toContain('loja');
  });

  /* Estando na página do tronco, a gaveta está aberta e nenhum filho é
     aquela página — sem esta regra o menu ficava todo apagado justamente ali. */
  it('o tronco acende quando a página aberta é a dele', () => {
    expect(shell).toMatch(/const souAPagina = !!no\.navega && no\.secao === secaoMarcada/);
    expect(shell).toMatch(/souAPagina \|\| \(contem && !aberta\) \? ' is-active' : ''/);
  });
});
