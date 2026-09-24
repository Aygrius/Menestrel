/* ============================================================
   bestiario-admin.test.jsx — o gate de admin nas listas do catálogo
   ============================================================
   O gate é CONVENIÊNCIA, não segurança: quem trava a escrita é a RLS
   (scripts/sql/admin-catalogo-rls.sql). Este arquivo cobre que o hook
   `useEhAdmin` resolve certo E que uma lista real (TecnicasList, a que
   pede menos fixture das 5) mostra/esconde o botão "Novo" e o lápis de
   acordo com ele — sem isso, o hook podia estar certo e a lista ainda
   ignorá-lo.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';

// Uma técnica só, o bastante pra render de linha existir e o lápis ter onde aparecer.
const UMA_TECNICA = { id: 1, key: 'mira', nome: 'Mira', uso: 'Único', grupo_armas: '', grupo_armaduras: '', custo: 2 };
const UMA_HABILIDADE = { key: 'escapar', nome: 'Escapar', grupo: 'Manobra', ajuste: 'agilidade', custo: 2,
  restricao: 'M, P', descricao: 'Permite escapar de amarras.' };

// Uma criatura com duas armas do catálogo e uma antiga, sem equipamento.
const CRIATURAS = [
  { id: 1, nome: 'Ogro', tipo: 'Gigante', estagio: 4, fisico: 3, aura: 1, forca: 4, agilidade: 1,
    energia_fisica: 30, energia_heroica: 52, armadura: 'M', absorcao: 6, defesa: 3, velocidade: 16, peso: 300,
    ataque: 'Porrete', dano_100: 24,
    equipamento: [{ slug: 'porrete', slot: 'arma' }, { slug: 'mordida', slot: 'arma' }] },
];
const ARMAS = [
  { slug: 'porrete', nome: 'Porrete', grupo: 'Armas', dano: 20, dano_l: 2, dano_m: 0, dano_p: -2, ajuste_atributo: 'FOR' },
  { slug: 'mordida', nome: 'Mordida', grupo: 'Armas', dano: 4, dano_l: 1, dano_m: 0, dano_p: -1, ajuste_atributo: 'FOR' },
];

let respostaEhAdmin = false;
let TecnicasList, HabilidadesList, CriaturasList;
beforeAll(async () => {
  window.supabaseClient = {
    rpc: async (nome) => (nome === 'eh_admin'
      ? { data: respostaEhAdmin, error: null }
      : { data: null, error: null }),
    from: (tabela) => ({ select: () => {
      const resposta = { data: tabela === 'tecnicas' ? [UMA_TECNICA] : tabela === 'habilidades' ? [UMA_HABILIDADE]
        : tabela === 'criaturas' ? CRIATURAS : [], error: null };
      // .order() pode encadear (criaturas ordena por estágio e nome).
      const q = { order: () => q, then: (ok, falha) => Promise.resolve(resposta).then(ok, falha) };
      return q;
    } }),
  };
  // window.UI normalmente vem de components/ui-bridge.ts (kit shadcn), que
  // importa via alias "@/..." não configurado no vitest — dublê local com
  // tags nativas é suficiente pro que este arquivo verifica (presença dos
  // controles de admin, não estilo do kit).
  window.UI = { Table: 'table', TableHeader: 'thead', TableBody: 'tbody', TableRow: 'tr', TableHead: 'th', TableCell: 'td', Badge: 'span', Input: 'input' };
  await import('./ataques-criatura.jsx');
  await import('./criatura-formulas.jsx');
  await import('./catalogo-descritores.jsx');
  await import('./conhecido-jogador.jsx');
  await import('../01-core/tecnicas-efeito.jsx');
  await import('./bestiario.jsx');
  await import('./sugestoes-magias.jsx');
  TecnicasList = window.TecnicasList;
  HabilidadesList = window.HabilidadesList;
  CriaturasList = window.CriaturasList;
  window.fetchTabelaPaginada = async () => ({ data: ARMAS, error: null });
});
afterEach(() => { cleanup(); respostaEhAdmin = false; });

describe('useEhAdmin', () => {
  it('devolve false antes da RPC responder e para não-admin', async () => {
    respostaEhAdmin = false;
    const { result } = renderHook();
    await vi.waitFor(() => expect(result.current).toBe(false));
  });

  it('devolve true quando a RPC diz que é admin', async () => {
    respostaEhAdmin = true;
    const { result } = renderHook();
    await vi.waitFor(() => expect(result.current).toBe(true));
  });
});

// Helper mínimo: renderiza um componente que só chama o hook.
function renderHook() {
  const result = { current: undefined };
  function Sonda() { result.current = window.useEhAdmin(); return null; }
  render(<Sonda />);
  return { result };
}

describe('TecnicasList — botão "Novo" e lápis de edição', () => {
  const ac = () => window.ADMIN_COPY.pt;
  const montar = () => render(<TecnicasList ac={ac()} lang="pt" />);
  const esperarLista = () => vi.waitFor(() => expect(document.body.textContent).toMatch(/Mira/));

  it('aparecem quando eh_admin devolve true', async () => {
    respostaEhAdmin = true;
    montar();
    await esperarLista();
    expect(document.querySelector('.btn-icon.btn-sm[aria-label="Novo"]')).toBeTruthy();
    expect(document.querySelector('.btn-icon.btn-sm[aria-label="Editar"]')).toBeTruthy();
  });

  it('somem quando eh_admin devolve false', async () => {
    respostaEhAdmin = false;
    montar();
    await esperarLista();
    expect(document.querySelector('[aria-label="Novo"]')).toBeNull();
    expect(document.querySelector('.btn-icon.btn-sm[aria-label="Editar"]')).toBeNull();
  });
});

/* "Remova os botões de filtro, e também o contador '1034 de 1034', e o botão
   de buscar fica ao lado do botão '+ novo'. Remova o texto 'novo' e deixe
   apenas o símbolo de +." (usuário, 14/09/2026) */
describe('TecnicasList — cabeçalho: busca ao lado do +, sem filtros nem contador', () => {
  const ac = () => window.ADMIN_COPY.pt;
  const esperarLista = () => vi.waitFor(() => expect(document.body.textContent).toMatch(/Mira/));

  it('o + é só o símbolo, e a busca mora ao lado dele, no cabeçalho', async () => {
    respostaEhAdmin = true;
    render(<TecnicasList ac={ac()} lang="pt" />);
    await esperarLista();
    const novo = await vi.waitFor(() => {
      const b = document.querySelector('[aria-label="Novo"]');
      expect(b).toBeTruthy();
      return b;
    });
    expect(novo.textContent.trim()).toBe('');
    expect(novo.querySelector('.ti-plus')).toBeTruthy();
    const acoes = novo.closest('.best-header-acoes');
    expect(acoes.closest('.fp-card-top')).toBeTruthy();
    expect(acoes.querySelector('.best-search input[type="search"]')).toBeTruthy();
  });

  it('sem chips de filtro, sem contador e sem a barra de baixo', async () => {
    render(<TecnicasList ac={ac()} lang="pt" />);
    await esperarLista();
    expect(document.querySelector('.best-chips')).toBeNull();
    expect(document.querySelector('.best-count')).toBeNull();
    expect(document.querySelector('.best-toolbar-bestiario')).toBeNull();
    expect(document.body.textContent).not.toMatch(/\b1 de 1\b/);
  });

  it('quem não é admin continua com a busca, só sem o +', async () => {
    respostaEhAdmin = false;
    render(<TecnicasList ac={ac()} lang="pt" />);
    await esperarLista();
    expect(document.querySelector('.fp-card-top .best-search input')).toBeTruthy();
    expect(document.querySelector('[aria-label="Novo"]')).toBeNull();
  });
});

/* "Ao invés de usarmos um texto expansível, eu quero botões ao lado de 'novo'
   no topo, para abrir um modal com as sugestões, etc." (usuário, 14/09/2026) */
describe('TecnicasList — Verificação e Sugestões são botões ao lado do +', () => {
  const ac = () => window.ADMIN_COPY.pt;
  const esperarLista = () => vi.waitFor(() => expect(document.body.textContent).toMatch(/Mira/));

  it('ficam no cabeçalho, entre a busca e o +, e nenhuma faixa sobra abaixo', async () => {
    respostaEhAdmin = true;
    render(<TecnicasList ac={ac()} lang="pt" />);
    await esperarLista();
    const acoes = await vi.waitFor(() => {
      const a = document.querySelector('.fp-card-top .best-header-acoes');
      expect(a && a.querySelector('[aria-label="Novo"]')).toBeTruthy();
      return a;
    });
    const ordem = [...acoes.children].map((el) => (
      el.classList.contains('best-search') ? 'busca'
        : el.getAttribute('aria-label') === 'Novo' ? '+'
        : el.textContent
    ));
    expect(ordem).toEqual(['busca', 'Verificação', 'Sugestões', '+']);
    expect(document.querySelector('.best-auditoria')).toBeNull();
    expect(document.querySelector('.best-aud-head')).toBeNull();
  });

  it('abrir a Sugestões mostra o documento numa janela', async () => {
    respostaEhAdmin = true;
    render(<TecnicasList ac={ac()} lang="pt" />);
    await esperarLista();
    const botao = await vi.waitFor(() => {
      const b = [...document.querySelectorAll('.best-painel-abrir')].find((x) => x.textContent === 'Sugestões');
      expect(b).toBeTruthy();
      return b;
    });
    fireEvent.click(botao);
    expect(document.querySelector('[role="dialog"][aria-label="Sugestões de técnicas"] .sug-md')).toBeTruthy();
  });

  /* "Nos botões de verificação, sugestão, etc, remova o ícone. E em todos esses
     botões, até o '+' adicione tooltip." (usuário, 14/09/2026) */
  it('sem ícone nos botões de painel, e tooltip em todos, inclusive no +', async () => {
    respostaEhAdmin = true;
    render(<TecnicasList ac={ac()} lang="pt" />);
    await esperarLista();
    const botoes = await vi.waitFor(() => {
      const bs = [...document.querySelectorAll('.best-painel-abrir')];
      expect(bs).toHaveLength(2);
      return bs;
    });
    botoes.forEach((b) => expect(b.querySelector('.ti')).toBeNull());

    // Cada botão tem o próprio tooltip; o anterior some com atraso, então
    // confere que o esperado está entre os abertos.
    const dicas = (el) => {
      fireEvent.mouseEnter(el);
      return [...document.querySelectorAll('.mn-tip')].map((t) => t.textContent);
    };
    expect(dicas(botoes[0])).toContain('Verificação do catálogo');
    expect(dicas(botoes[1])).toContain('Sugestões de técnicas');
    expect(dicas(document.querySelector('[aria-label="Novo"]'))).toContain('Nova técnica');
  });

  it('para quem não é admin, não aparecem', async () => {
    respostaEhAdmin = false;
    render(<TecnicasList ac={ac()} lang="pt" />);
    await esperarLista();
    expect(document.querySelector('.best-painel-botao')).toBeNull();
  });
});

/* "No modal de editar criaturas, não precisa mostrar os campos preenchidos
   automaticamente, mas mostre ao expandir a criatura na tabela." e "ao invés
   do texto 'Dano 100% - Porrete', use 'Porrete'" (usuário, 15/09/2026) */
describe('CriaturasList — a linha expandida mostra os calculados', () => {
  const expandir = async () => {
    render(<CriaturasList ac={window.ADMIN_COPY.pt} lang="pt" />);
    const td = await vi.waitFor(() => {
      const x = [...document.querySelectorAll('td')].find((c) => /Ogro/.test(c.textContent));
      expect(x).toBeTruthy();
      return x;
    });
    fireEvent.click(td.closest('tr'));
  };
  /* A linha expandida virou OITO SEÇÕES com subtítulo em 17/09/2026 ("use
     cards depois de cada subtítulo"), e os rótulos voltaram a ser palavras —
     o contrário dos EF/RF/AGI que 15/09/2026 pediu. A estrutura nova está
     coberta em criatura-ficha-secoes.test.jsx; o que sobrou aqui são os
     NÚMEROS deste Ogro, que exercitam o caminho do equipamento (Porrete 24 =
     dano 20 + FOR 4, absorção e defesa vindas da peça) e que aquele arquivo,
     com uma Águia de atributos zerados, não alcança.

     ⚠️ Este arquivo NÃO importa 12-batalha, e é de propósito: é ele que
     exercita a guarda `doMotor` do bestiário — sem o motor carregado,
     Habilidades/Técnicas/Magias vêm vazias e o resto da ficha continua de pé.
     Se alguém adicionar o import, essa cobertura se perde em silêncio. */
  const secao = (titulo) => [...document.querySelectorAll('.best-secao')]
    .find((s) => (s.querySelector('.best-secao-titulo') || {}).textContent?.trim() === titulo);
  const par = (titulo, rotulo) => {
    const s = secao(titulo);
    expect(s, `seção "${titulo}" não existe`).toBeTruthy();
    const card = [...s.querySelectorAll('.best-stat')]
      .find((c) => c.querySelector('.best-stat-lbl').textContent.trim() === rotulo);
    return card && card.querySelector('.best-stat-val').textContent.trim();
  };

  /* Atributos e Informações usam SIGLA, com o nome inteiro no tooltip
     (17/09/2026: "Int (tooltip Intelecto)", "EF (tooltip Energia Física)").
     Características e as seções de nome próprio seguem com as palavras — a
     correção foi dirigida a duas seções, não à ficha toda. */
  it('as seções aparecem, com sigla em CAIXA ALTA em Atributos', async () => {
    await expandir();
    await vi.waitFor(() => expect(secao('Atributos')).toBeTruthy());
    expect(par('Atributos', 'FIS')).toBe('3');
    expect(par('Atributos', 'FOR')).toBe('4');
  });

  it('as Informações, com as resistências calculadas', async () => {
    await expandir();
    await vi.waitFor(() => expect(secao('Informações')).toBeTruthy());
    expect(par('Informações', 'EF')).toBe('30');
    expect(par('Informações', 'RF')).toBe('7');   // estágio 4 + físico 3
    expect(par('Informações', 'RM')).toBe('5');   // estágio 4 + aura 1
    expect(par('Informações', 'AB')).toBe('6');
    expect(par('Informações', 'DF')).toBe('3');
    expect(par('Informações', 'VB')).toBe('16');
    // O valor da armadura é a SIGLA que o banco guarda, não a palavra.
    expect(par('Informações', 'AR')).toBe('M');
  });

  it('os Ataques saem do equipamento, com o dano somado ao atributo', async () => {
    await expandir();
    await vi.waitFor(() => expect(secao('Ataques')).toBeTruthy());
    expect(par('Ataques', 'Porrete')).toBe('24');   // 20 + FOR 4
    expect(par('Ataques', 'Mordida')).toBe('8');
    // Sem a linha "L 6 · M 4 · P 2" nem o texto "Dano 100%" (15/09/2026).
    expect(document.querySelector('.best-stat-sub')).toBeNull();
    expect(document.body.textContent).not.toMatch(/Dano 100%/);
    expect(document.body.textContent).not.toMatch(/L 6 · M 4/);
  });

  /* A degradação sem o motor: as três seções que dependem dele vêm sem cards
     e, desde 17/09/2026 ("seção vazia não aparece"), simplesmente não são
     renderizadas. O que importa é que a ficha NÃO QUEBRA — antes da guarda
     `doMotor`, um `window.MotorBatalha` indefinido derrubava a linha
     expandida inteira. */
  it('e sem 12-batalha carregado, a ficha não quebra: as três seções do motor somem', async () => {
    await expandir();
    await vi.waitFor(() => expect(secao('Atributos')).toBeTruthy());
    expect(secao('Habilidades')).toBeUndefined();
    expect(secao('Técnicas de Combate')).toBeUndefined();
    expect(secao('Magias')).toBeUndefined();
    // E o resto da ficha continua de pé, com os dados do Ogro.
    expect(par('Características', 'Estágio')).toBe('4');
    expect(par('Informações', 'EF')).toBe('30');
    // Gigante não tem ícone mapeado, então a Classe cai na palavra.
    expect(par('Características', 'Classe')).toBe('Gigante');
  });
});

/* "Nas habilidades, remova informações sobre restrição de uso na descrição"
   (usuário, 14/09/2026) */
describe('HabilidadesList — o detalhe mostra só a descrição', () => {
  it('abre a descrição sem o bloco de Restrição', async () => {
    render(<HabilidadesList ac={window.ADMIN_COPY.pt} lang="pt" />);
    const linha = await vi.waitFor(() => {
      const td = [...document.querySelectorAll('td')].find((x) => /Escapar/.test(x.textContent));
      expect(td).toBeTruthy();
      return td;
    });
    fireEvent.click(linha.closest('tr'));
    expect(document.body.textContent).toMatch(/Permite escapar de amarras/);
    expect(document.body.textContent).not.toMatch(/Restrição/);
    expect(document.body.textContent).not.toMatch(/M, P/);
  });
});
