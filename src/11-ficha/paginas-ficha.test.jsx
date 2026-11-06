/* ============================================================
   paginas-ficha.test.jsx — Status, Atividades, Habilidades… em casas
   ============================================================
   Pedido do usuário (02/11/2026): "As páginas status, atividades,
   habilidades, magias, companheiros, amigos, vão abrir uma página igual
   'inventário', com casas para selecionar o conteúdo, e mostrar os detalhes
   do conteúdo à direita, com os botões de ações em forma de leque."
   ============================================================ */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/status-efeito.jsx';
import '../01-core/clima-desgaste.jsx';
import '../10-shell/shell.jsx';
import '../07-inventario/inventario.jsx';
import './atalhos-ficha.jsx';
import './paginas-ficha.jsx';

// A grade mede o espaço (useGridDimensions); o jsdom não tem ResizeObserver.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}
afterEach(cleanup);

const casas = () => Array.from(document.querySelectorAll('button[data-casa]')).map((b) => b.dataset.casa);
const HABS = [
  { key: 'correr', nome: 'Correr', grupo: 'Manobra', total: 4 },
  { key: 'arrombar', nome: 'Arrombar', grupo: 'Subterfúgio', total: -5, bloqueio: 'Precisa comprar.' },
];

describe('a moldura é a do Inventário', () => {
  it('as casas moram na grade de casas do baú', () => {
    render(<window.PaginaHabilidades lang="pt" habilidades={HABS} onRolar={() => {}} />);
    expect(casas()).toEqual(['arrombar', 'correr']);
    const casa = document.querySelector('button[data-casa="correr"]');
    expect(casa.classList.contains('inv-card')).toBe(true);
    expect(casa.closest('.inv-bag-grid--slots')).toBeTruthy();
  });
});

describe('Habilidades: o leque é a dificuldade', () => {
  it('cinco discos, e escolher um rola com a dificuldade', () => {
    let rolou = null;
    render(<window.PaginaHabilidades lang="pt" habilidades={HABS} onRolar={(k, x) => { rolou = [k, x]; }} />);
    fireEvent.click(document.querySelector('button[data-casa="correr"]'));
    const bolhas = document.querySelectorAll('.inv-leque-bolha .inv-leque-disco');
    expect(bolhas.length).toBe(5);
    fireEvent.click(document.querySelector('[data-acao-leque="medio"]'));
    expect(rolou).toEqual(['correr', { dificuldade: 'medio' }]);
  });

  it('a bloqueada fica apagada e o leque não rola', () => {
    let rolou = false;
    render(<window.PaginaHabilidades lang="pt" habilidades={HABS} onRolar={() => { rolou = true; }} />);
    const casa = document.querySelector('button[data-casa="arrombar"]');
    expect(casa.classList.contains('is-apagada')).toBe(true);
    fireEvent.click(casa);
    fireEvent.click(document.querySelector('[data-acao-leque="facil"]'));
    expect(rolou).toBe(false);
  });
});

describe('Status: o que está valendo fica aceso', () => {
  it('o status vigente ganha o ponto e o leque de remover', () => {
    const removidos = [];
    render(<window.PaginaStatus lang="pt" lista={[{ id: 'veneno:abc', nome: 'Envenenado' }]}
      podeEditar onAplicar={() => {}} onRemover={(id) => removidos.push(id)} />);
    const casa = document.querySelector('button[data-casa="veneno"]');
    expect(casa.classList.contains('is-acesa')).toBe(true);
    fireEvent.click(casa);
    fireEvent.click(document.querySelector('[data-acao-leque="remover"]'));
    expect(removidos).toEqual(['veneno:abc']);
  });

  it('o Jogador só olha: sem leque', () => {
    render(<window.PaginaStatus lang="pt" lista={[]} podeEditar={false} />);
    fireEvent.click(document.querySelector('button[data-casa="veneno"]'));
    expect(document.querySelector('.inv-leque-bolha')).toBeNull();
  });
});

describe('Atividades: o verbo, ou Parar na ligada', () => {
  it('a ligada oferece Parar', () => {
    let escolhida = 'x';
    render(<window.PaginaAtividades lang="pt" atividade={{ tipo: 'dormindo' }} podeEditar
      onEscolher={(id) => { escolhida = id; }} />);
    fireEvent.click(document.querySelector('button[data-casa="dormindo"]'));
    fireEvent.click(document.querySelector('[data-acao-leque="parar"]'));
    expect(escolhida).toBeNull();
  });
});

describe('o trilho da ficha', () => {
  const ficha = readFileSync(resolve(__dirname, './ficha.jsx'), 'utf8');
  it('Itens saiu: os atalhos não desenham mais botão', () => {
    expect(ficha).toMatch(/semBotoes direto=\{\{ tipo: 'magia', id: magiaDireta \}\}/);
  });
  it('as páginas novas têm botão no trilho', () => {
    ['atividades', 'habilidades', 'tecnicas', 'magias', 'amigos'].forEach((aba) => {
      expect(ficha, aba).toMatch(new RegExp(`botaoPagina\\('${aba}'`));
    });
  });
  /* 04/11/2026, usuário: "Remova o menu 'status' da ficha do personagem,
     mesmo para o mestre, esse status irá acontecer apenas em batalha." */
  it('Status saiu da ficha: nem botão, nem página', () => {
    expect(ficha).not.toMatch(/botaoPagina\('status'/);
    expect(ficha).not.toMatch(/fpTab === 'status'/);
    expect(ficha).not.toMatch(/<FichaStatusSeletor/);
  });
  it('o main carrega as páginas antes da ficha', () => {
    const main = readFileSync(resolve(__dirname, '../main.tsx'), 'utf8');
    expect(main.indexOf('paginas-ficha.jsx')).toBeGreaterThan(-1);
    expect(main.indexOf('paginas-ficha.jsx')).toBeLessThan(main.indexOf('11-ficha/ficha.jsx'));
  });
});

/* TÉCNICAS VIRARAM PÁGINA (04/11/2026, usuário: "adicione a aba Técnicas").
   Só leitura: o clique escolhe, o leque não abre, e o painel conta a técnica. */
describe('Técnicas: casas e painel, sem leque', () => {
  const TECS = [
    { key: 'esquiva', nome: 'Esquiva', tipo: 'Básica', total: 7, nivel: 2, descricao: 'Desvia do golpe.', uso: '1 por rodada', custo: 2 },
    { key: 'furia', nome: 'Fúria', tipo: 'Especializada', total: 3, nivel: 1 },
  ];
  it('uma casa por técnica, com o total no canto', () => {
    render(<window.PaginaTecnicas lang="pt" tecnicas={TECS} />);
    expect(casas()).toEqual(['esquiva', 'furia']);
    expect(document.querySelector('button[data-casa="esquiva"] .pc-casa-marca').textContent).toBe('7');
  });
  it('clicar não abre leque de ações', () => {
    render(<window.PaginaTecnicas lang="pt" tecnicas={TECS} />);
    fireEvent.click(document.querySelector('button[data-casa="esquiva"]'));
    expect(document.querySelector('.inv-leque-bolha')).toBeNull();
  });
});

/* OS PONTOS NO TOPO (04/11/2026, usuário: "Quero, adicione os pontos"). */
describe('Técnicas e Magias mostram os pontos', () => {
  // 05/11/2026: o selo mostra o SALDO ("5/5" = ainda tem 5 de 5).
  it('Técnicas: saldo / total', () => {
    render(<window.PaginaTecnicas lang="pt" tecnicas={[]} pontos={{ gasto: 2, total: 14 }} />);
    const selo = document.querySelector('.pc-pontos');
    expect(selo.textContent).toMatch(/Pontos de técnica/);
    expect(selo.querySelector('.pc-pontos-num').textContent).toBe('12/14');
    expect(selo.classList.contains('is-excedido')).toBe(false);
  });
  it('Magias acima do total fica em brasa', () => {
    render(<window.PaginaMagias lang="pt" magias={[]} pontos={{ gasto: 5, total: 4 }} onEvocar={() => {}} />);
    const selo = document.querySelector('.pc-pontos');
    expect(selo.textContent).toMatch(/Pontos de magia/);
    expect(selo.querySelector('.pc-pontos-num').textContent).toBe('-1/4');
    expect(selo.classList.contains('is-excedido')).toBe(true);
  });
  it('nada gasto: 5/5', () => {
    render(<window.PaginaMagias lang="pt" magias={[]} pontos={{ gasto: 0, total: 5 }} onEvocar={() => {}} />);
    expect(document.querySelector('.pc-pontos-num').textContent).toBe('5/5');
  });
  it('sem conta, sem selo', () => {
    render(<window.PaginaMagias lang="pt" magias={[]} onEvocar={() => {}} />);
    expect(document.querySelector('.pc-pontos')).toBeNull();
  });
});

/* O NOME NO LUGAR DO ÍCONE (06/11/2026, usuário: "eu quero o nome do item ao
   invés de um ícone, dentro do card"). Atividades, Habilidades, Técnicas e
   Magias. */
describe('a casa mostra o nome, não o ícone', () => {
  const nomeDaCasa = (id) => {
    const casa = document.querySelector(`button[data-casa="${id}"]`);
    return { nome: casa.querySelector('.pc-casa-nome'), glifo: casa.querySelector('.pc-casa-ic i.ti') };
  };
  it('Habilidades', () => {
    render(<window.PaginaHabilidades lang="pt" habilidades={HABS} onRolar={() => {}} />);
    const c = nomeDaCasa('correr');
    expect(c.nome.textContent).toBe('Correr');
    expect(c.glifo).toBeNull();
  });
  it('Técnicas', () => {
    render(<window.PaginaTecnicas lang="pt" tecnicas={[{ key: 'desviar', nome: 'Desviar', tipo: 'Básica', total: 3 }]} />);
    expect(nomeDaCasa('desviar').nome.textContent).toBe('Desviar');
    expect(nomeDaCasa('desviar').glifo).toBeNull();
  });
  it('Magias', () => {
    render(<window.PaginaMagias lang="pt" magias={[{ key: 'luz', nome: 'Luz', nivel: 1 }]} onEvocar={() => {}} />);
    expect(nomeDaCasa('luz').nome.textContent).toBe('Luz');
    expect(nomeDaCasa('luz').glifo).toBeNull();
  });
  it('Atividades', () => {
    render(<window.PaginaAtividades lang="pt" atividade={null} podeEditar={false} />);
    const treinar = (window.ATIVIDADES || []).find((a) => a.id === 'treinando');
    expect(nomeDaCasa('treinando').nome.textContent).toBe(treinar.pt);
    expect(nomeDaCasa('treinando').glifo).toBeNull();
  });
});

/* MAGIA EMPRESTADA POR ITEM (06/11/2026, usuário: "ao equipar um item que
   possui uma magia, esta magia deve aparecer na lista de magias do personagem
   pra ele usar, sem gasto de karma"). */
describe('magia de item na página Magias', () => {
  it('o painel diz de qual item ela vem e que não gasta karma', () => {
    render(<window.PaginaMagias lang="pt" onEvocar={() => {}}
      magias={[{ key: 'piromanipulacao', nome: 'Piromanipulação', nivel: 3, item: 'Anel Narya' }]} />);
    fireEvent.click(document.querySelector('button[data-casa="piromanipulacao"]'));
    // Tela estreita (jsdom): o painel abre pelo "Detalhes" do leque.
    fireEvent.click(document.querySelector('[data-acao-leque="__detalhes"]'));
    const ap = document.body.textContent;
    expect(ap).toMatch(/Vem de Anel Narya enquanto ele estiver em uso\. Evocar não gasta karma\./);
  });
});

describe('a ficha liga as magias dos itens (fonte)', () => {
  const ficha = readFileSync(resolve(__dirname, 'ficha.jsx'), 'utf8');
  it('usa a mesma porta da batalha', () => {
    expect(ficha).toMatch(/window\.MotorBatalha && window\.MotorBatalha\.magiasDeItensDoAtor/);
    expect(ficha).toMatch(/new Set\(\[\.\.\.Object\.keys\(pj\.magias \|\| \{\}\), \.\.\.Object\.keys\(magiasDeItemPj\)\]\)/);
  });
  it('evocar a magia do item não cobra karma, nem sobe nível', () => {
    expect(ficha).toMatch(/const doItem = !!magiasDeItemPj\[chave\];/);
    expect(ficha).toMatch(/doItem \? \[\] : \[\{ scope: 'vitalidade', key: 'ka', delta: -nivel \}\]/);
    expect(ficha).toMatch(/subir: doItem \? null : subirDe\('magia', m\)/);
  });
});

/* OS PONTOS NO PAINEL LATERAL (06/11/2026, usuário: "Ao invés disso, insira
   essa informação no card lateral de 'visualização de item' à direita. Faça
   isso com os outros menus também. Junto com a informação dos pontos, insira
   um texto explicando como ele chegou naquele número"). */
describe('os pontos moram no painel, com a conta', () => {
  const comTelaLarga = (fn) => {
    const antes = window.matchMedia;
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    try { fn(); } finally { window.matchMedia = antes; }
  };
  const pontos = { gasto: 0, total: 30, explicacao: 'Ladino ganha 10 pontos de habilidade por estágio.' };
  it.each([
    ['Habilidades', () => <window.PaginaHabilidades lang="pt" habilidades={HABS} onRolar={() => {}} pontos={pontos} />],
    ['Técnicas', () => <window.PaginaTecnicas lang="pt" tecnicas={[]} pontos={pontos} />],
    ['Magias', () => <window.PaginaMagias lang="pt" magias={[]} onEvocar={() => {}} pontos={pontos} />],
  ])('%s: no topo do painel lateral, com a explicação', (_, el) => {
    comTelaLarga(() => {
      render(el());
      const selo = document.querySelector('.pc-pontos');
      expect(selo.closest('aside.pc-painel')).toBeTruthy();
      expect(selo.querySelector('.pc-pontos-num').textContent).toBe('30/30');
      expect(selo.querySelector('.pc-pontos-conta').textContent).toBe(pontos.explicacao);
    });
  });
});

describe('explicacaoDosPontos refaz a conta com os números do personagem', () => {
  it('habilidade: base da profissão × estágio', () => {
    const t = window.explicacaoDosPontos('habilidade', { profissao: 'Guerreiro' }, 3, 12, false);
    const total = window.pontosHabilidadesTotal('Guerreiro', 3);
    expect(t).toContain(`Estágio 3: ${total / 3} × 3 = ${total}.`);
    expect(t).toContain(`Gastos: 12`);
    expect(t).toContain(`Sobram ${total - 12}.`);
  });
  it('técnica: base + Intelecto, negativo conta 0', () => {
    const t = window.explicacaoDosPontos('tecnica', { profissao: 'Guerreiro', intelecto_base: 2 }, 3, 0, false);
    expect(t).toContain('Por estágio: 10 de Guerreiro + 2 de Intelecto = 12.');
    expect(t).toContain('Estágio 3: 12 × 3 = 36.');
    const neg = window.explicacaoDosPontos('tecnica', { profissao: 'Ladino', intelecto_base: -1 }, 1, 0, false);
    expect(neg).toContain('Por estágio: 8 de Ladino + 0 de Intelecto = 8. Intelecto negativo conta 0.');
  });
  it('magia: base + Intelecto; Aura negativa zera a base', () => {
    const t = window.explicacaoDosPontos('magia', { profissao: 'Mago', intelecto_base: 3, aura_base: -1 }, 1, 0, false);
    expect(t).toContain('Por estágio: 0 de Mago + 3 de Intelecto = 3.');
    expect(t).toContain('Aura negativa zera a base da profissão.');
  });
});
