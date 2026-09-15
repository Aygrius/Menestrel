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

let respostaEhAdmin = false;
let TecnicasList, HabilidadesList;
beforeAll(async () => {
  window.supabaseClient = {
    rpc: async (nome) => (nome === 'eh_admin'
      ? { data: respostaEhAdmin, error: null }
      : { data: null, error: null }),
    from: (tabela) => ({ select: () => ({ order: async () => ({ data: tabela === 'tecnicas' ? [UMA_TECNICA] : tabela === 'habilidades' ? [UMA_HABILIDADE] : [], error: null }) }) }),
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
