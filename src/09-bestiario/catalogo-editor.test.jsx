/* ============================================================
   catalogo-editor.test.jsx — o editor genérico renderizado
   ============================================================
   Cobre o contrato do editor: monta os campos do descritor, respeita
   obrigatório e somenteNovo, e recalcula derivado SEM travá-lo.
   O supabaseClient é substituído por um dublê — nenhum teste toca o banco.

   CORREÇÃO ao brief original: os rótulos (ADMIN_COPY) vivem em
   01-core/constants.jsx, não em copy.jsx — copy.jsx não tem ADMIN_COPY
   nenhum (confirmado na Task 3). E como o editor renderiza dentro de
   ModalShell (10-shell/shell.jsx), que só existe como window global se
   alguém o carregar, o teste importa esse arquivo também — mesmo padrão
   de src/08-personagens/wizard-layout.test.jsx.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/inventario-helpers.jsx';
import '../10-shell/shell.jsx';
import './ataques-criatura.jsx';
import './criatura-formulas.jsx';
import './catalogo-descritores.jsx';

let CatalogoEditor;
let ultimoInsert = null, ultimoUpdate = null, erroSimulado = null;
// Fixture do catálogo `itens` (grupo Armas) devolvida pelo `.select()`
// de leitura — separado do `.insert()/.update()` acima porque o editor de
// criaturas agora busca as armas pra completar o dropdown de `ataque`
// (fetchTabelaPaginada, ver catalogo-editor.jsx). Vazio por padrão: os
// testes que não mexem com isso não devem disparar nenhuma linha extra.
let itensArmasFixture = [];
// Nomes de técnicas/habilidades/magias para os seletores de lista da
// criatura (13/09/2026). Vazios por padrão, como a de armas.
let listasFixture = { tecnicas: [], habilidades: [], magias: [] };
// Chaves que o .like() de pré-checagem de colisão devolve. Vazio por
// padrão: sem colisão, a chave derivada do nome passa direto.
let chavesExistentesFixture = [];

beforeAll(async () => {
  // Dublê do supabaseClient ANTES de carregar o editor.
  window.supabaseClient = {
    from: (tabela) => ({
      insert: (payload) => { ultimoInsert = { tabela, payload }; return {
        select: () => ({ single: async () => ({ data: { ...payload, id: 1 }, error: erroSimulado }) }) }; },
      // Registra tabela/payload E a coluna/valor usados no .eq() — sem isso
      // o caminho de EDIÇÃO inteiro ficava sem cobertura nenhuma.
      update: (payload) => { ultimoUpdate = { tabela, payload }; return { eq: (col, val) => {
        ultimoUpdate.eqCol = col; ultimoUpdate.eqVal = val; return {
          select: () => ({ single: async () => ({ data: payload, error: erroSimulado }) }) }; } }; },
      // Leitura genérica (fetchTabelaPaginada): builder encadeável
      // eq/order que termina em .range() — mesmo contrato do PostgREST
      // real, só que devolvendo a fixture inteira numa página só.
      select: () => {
        const builder = {
          eq: () => builder,
          order: () => builder,
          range: async () => ({ data: tabela === 'itens' ? itensArmasFixture : (listasFixture[tabela] || []), error: null }),
          // Pré-checagem de colisão da chave automática: o editor pergunta
          // quais chaves já começam com a base antes de inserir.
          like: async () => ({ data: chavesExistentesFixture, error: null }),
        };
        return builder;
      },
    }),
  };
  await import('./catalogo-editor.jsx');
  CatalogoEditor = window.CatalogoEditor;
  expect(CatalogoEditor).toBeDefined();
});

afterEach(() => {
  cleanup(); ultimoInsert = null; ultimoUpdate = null; erroSimulado = null;
  itensArmasFixture = []; chavesExistentesFixture = [];
  listasFixture = { tecnicas: [], habilidades: [], magias: [] };
});

const montar = (props = {}) => render(
  <div className="menestrel-ui">
    <CatalogoEditor tabela="tecnicas" linha={null} lang="pt"
      onSalvo={() => {}} onCancel={() => {}} {...props} />
  </div>
);
const campoPorRotulo = (re) => Array.from(document.querySelectorAll('label, .motor-field'))
  .find((el) => re.test(el.textContent || ''));

describe('montagem a partir do descritor', () => {
  it('renderiza um campo por entrada do descritor', () => {
    montar();
    const d = window.descritorDe('tecnicas');
    // Cada campo aparece: input, textarea ou SelectPill — MENOS o de chave,
    // que desde 11/09/2026 é derivado do nome e não é mais renderizado.
    const visiveis = d.campos.filter((c) => !c.autoDeNome);
    expect(visiveis.length, 'o descritor precisa ter 1 campo automático').toBe(d.campos.length - 1);
    const controles = document.querySelectorAll('input, textarea, .select-pill-btn');
    expect(controles.length).toBeGreaterThanOrEqual(visiveis.length);
  });

  it('campo de opções oferece só os valores da lista', () => {
    montar();
    const pills = Array.from(document.querySelectorAll('.select-pill-btn'));
    // Abre cada pill até achar a de `uso`.
    let achou = false;
    for (const p of pills) {
      fireEvent.click(p);
      const itens = Array.from(document.querySelectorAll('.select-pill-drop li'))
        .map((li) => (li.textContent || '').trim());
      if (itens.includes('Único')) {
        expect(itens.sort()).toEqual(['Intermitente', 'Livre', 'Único'].sort());
        achou = true; break;
      }
      fireEvent.click(p);
    }
    expect(achou, 'não achei o campo `uso`').toBe(true);
  });
});

/* Era o bloco 'somenteNovo', que verificava que o input de chave nascia
   editável ao criar e travado ao editar. O usuário pediu (11/09/2026) que o
   input sumisse e a chave saísse do nome, então o comportamento antigo não
   existe mais — mas a exigência por trás dele continua, e é ela que estes
   testes guardam: a chave NUNCA muda depois de criada. */
describe('chave automática', () => {
  it('o input de chave não existe mais, nem ao criar', () => {
    montar({ linha: null });
    expect(document.querySelector('input[name="key"]')).toBeNull();
  });

  it('nem ao editar', () => {
    montar({ linha: { key: 'mira', nome: 'Mira', custo: 2 } });
    expect(document.querySelector('input[name="key"]')).toBeNull();
  });

  it('criar deriva a chave do nome', async () => {
    montar({ linha: null });
    fireEvent.change(document.querySelector('input[name="nome"]'), { target: { value: 'Golpe da Sombra' } });
    fireEvent.change(document.querySelector('input[name="custo"]'), { target: { value: '2' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoInsert).not.toBeNull());
    expect(ultimoInsert.payload.key).toBe('golpe_da_sombra');
  });

  it('chave já usada ganha sufixo em vez de estourar unicidade no banco', async () => {
    chavesExistentesFixture = [{ key: 'mira' }];
    montar({ linha: null });
    fireEvent.change(document.querySelector('input[name="nome"]'), { target: { value: 'Mira' } });
    fireEvent.change(document.querySelector('input[name="custo"]'), { target: { value: '2' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoInsert).not.toBeNull());
    expect(ultimoInsert.payload.key).toBe('mira_2');
  });

  // A regra que mais importa: renomear NÃO pode mexer na chave. Ela é a
  // identidade da linha, e item é referenciado por slug em inventário, ficha
  // e batalha — derivar de novo aqui quebraria tudo isso em silêncio.
  it('EDITAR e renomear não manda a chave no payload', async () => {
    montar({ linha: { key: 'mira', nome: 'Mira', custo: 2 } });
    fireEvent.change(document.querySelector('input[name="nome"]'), { target: { value: 'Mira Apurada' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload.nome).toBe('Mira Apurada');
    expect('key' in ultimoUpdate.payload, 'a chave não pode viajar no update').toBe(false);
    expect(ultimoUpdate.eqCol).toBe('key');
    expect(ultimoUpdate.eqVal, 'o .eq() continua mirando a chave ORIGINAL').toBe('mira');
  });
});

describe('obrigatório', () => {
  it('salvar fica bloqueado com obrigatório vazio', () => {
    montar({ linha: null });
    const salvar = screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent));
    expect(salvar.disabled).toBe(true);
  });

  it('salvar libera quando os obrigatórios estão preenchidos', () => {
    montar({ linha: null });
    // Sem o input de chave: se ele ainda contasse como obrigatório, o botão
    // ficaria travado pra sempre, porque não há como preenchê-lo.
    fireEvent.change(document.querySelector('input[name="nome"]'), { target: { value: 'Nova' } });
    fireEvent.change(document.querySelector('input[name="custo"]'), { target: { value: '2' } });
    const salvar = screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent));
    expect(salvar.disabled).toBe(false);
  });
});

describe('campo derivado (criaturas)', () => {
  it('calcula ao mudar a entrada', () => {
    montar({ tabela: 'criaturas', linha: null });
    fireEvent.change(document.querySelector('input[name="peso"]'), { target: { value: '6000' } });
    fireEvent.change(document.querySelector('input[name="fisico"]'), { target: { value: '4' } });
    expect(document.querySelector('input[name="energia_fisica"]').value).toBe('159');
  });

  // A regra que vem da spec §6: dragão tem absorção 30 fixa, e a fórmula dá 20.
  // Se o campo fosse travado, editar um dragão corromperia o valor dele.
  it('aceita sobrescrita manual e marca que foi sobrescrito', () => {
    montar({ tabela: 'criaturas', linha: null });
    fireEvent.change(document.querySelector('input[name="fisico"]'), { target: { value: '4' } });
    const abs = document.querySelector('input[name="absorcao"]');
    expect(abs.value).toBe('20');
    expect(abs.disabled).toBe(false);
    fireEvent.change(abs, { target: { value: '30' } });
    expect(abs.value).toBe('30');
    // Mexer noutra entrada NÃO pode reverter a sobrescrita.
    fireEvent.change(document.querySelector('input[name="agilidade"]'), { target: { value: '6' } });
    expect(abs.value).toBe('30');
  });

  // A CORREÇÃO da fórmula (10/09/2026): dano_l/m/p vinham de "dano da arma +
  // Agilidade" com dano da arma sempre 0 (não havia seletor de arma). Agora
  // usam o `ataque` escolhido no dropdown — Pato real do banco (Bico,
  // estágio 1, agilidade 0) dá 3/0/-3.
  it('dano_l/m/p usam o ataque escolhido + estágio + agilidade', () => {
    montar({ tabela: 'criaturas', linha: null });
    fireEvent.change(document.querySelector('input[name="estagio"]'), { target: { value: '1' } });
    fireEvent.change(document.querySelector('input[name="agilidade"]'), { target: { value: '0' } });
    const wrapperAtaque = Array.from(document.querySelectorAll('.motor-field'))
      .find((w) => (w.querySelector('span')?.textContent || '') === 'Ataque');
    expect(wrapperAtaque, 'campo ataque não achado').toBeTruthy();
    fireEvent.click(wrapperAtaque.querySelector('.select-pill-btn'));
    const opcaoBico = Array.from(document.querySelectorAll('.select-pill-drop li'))
      .find((li) => (li.textContent || '').trim() === 'Bico');
    expect(opcaoBico, 'opção Bico não achada').toBeTruthy();
    fireEvent.click(opcaoBico);
    expect(document.querySelector('input[name="dano_l"]').value).toBe('3');
    expect(document.querySelector('input[name="dano_m"]').value).toBe('0');
    expect(document.querySelector('input[name="dano_p"]').value).toBe('-3');
  });

  // Sem ataque escolhido não há offset — o campo fica em branco em vez de
  // mostrar um número inventado.
  it('sem ataque escolhido, dano_l/m/p ficam em branco', () => {
    montar({ tabela: 'criaturas', linha: null });
    expect(document.querySelector('input[name="dano_l"]').value).toBe('');
    expect(document.querySelector('input[name="dano_m"]').value).toBe('');
    expect(document.querySelector('input[name="dano_p"]').value).toBe('');
  });
});

describe('dropdown de ataque (criaturas) — 30 nomes fechados + armas do catálogo', () => {
  const abrirPillAtaque = () => {
    const wrapper = Array.from(document.querySelectorAll('.motor-field'))
      .find((w) => (w.querySelector('span')?.textContent || '') === 'Ataque');
    expect(wrapper, 'campo ataque não achado').toBeTruthy();
    fireEvent.click(wrapper.querySelector('.select-pill-btn'));
    return wrapper;
  };
  const opcoesAbertas = () => Array.from(document.querySelectorAll('.select-pill-drop li'))
    .map((li) => (li.textContent || '').trim());

  it('oferece todos os ataques do banco, inclusive "Toque" (que não tem offset mas é selecionável)', () => {
    montar({ tabela: 'criaturas', linha: null });
    abrirPillAtaque();
    const opcoes = opcoesAbertas();
    expect(opcoes.length).toBe(31);
    expect(opcoes).toContain('Toque');
    expect(opcoes).toContain('Garras');
    expect(opcoes).toContain('Hálito Encantado');
  });

  it('acrescenta armas do catálogo (grupo Armas) que ainda não estão na lista, sem duplicar as que já estão', async () => {
    itensArmasFixture = [{ nome: 'Lança Élfica' }, { nome: 'Garras' }]; // 'Garras' já é um dos 30
    montar({ tabela: 'criaturas', linha: null });
    abrirPillAtaque();
    await vi.waitFor(() => { expect(opcoesAbertas()).toContain('Lança Élfica'); });
    const opcoes = opcoesAbertas();
    expect(opcoes.filter((o) => o === 'Garras')).toHaveLength(1);
    expect(opcoes.length).toBe(32); // 31 do banco + 1 arma nova; "Garras" nao duplica
  });
});

describe('gravação', () => {
  it('criar chama insert na tabela do descritor', async () => {
    montar({ linha: null });
    fireEvent.change(document.querySelector('input[name="nome"]'), { target: { value: 'Nova' } });
    fireEvent.change(document.querySelector('input[name="custo"]'), { target: { value: '2' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoInsert).not.toBeNull());
    expect(ultimoInsert.tabela).toBe('tecnicas');
    expect(ultimoInsert.payload.key).toBe('nova');
  });

  it('erro do banco aparece na tela, com o texto do Postgres', async () => {
    erroSimulado = { message: 'duplicate key value violates unique constraint' };
    montar({ linha: null });
    fireEvent.change(document.querySelector('input[name="nome"]'), { target: { value: 'Mira' } });
    fireEvent.change(document.querySelector('input[name="custo"]'), { target: { value: '2' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => {
      expect(document.body.textContent).toMatch(/duplicate key value/);
    });
  });
});

/* Apagar o conteúdo de um campo e salvar.

   Até 11/09/2026 o editor OMITIA do payload todo campo vazio. No insert
   isso dá NULL e está certo; no update, não — o PostgREST só toca nas
   colunas que chegam, então apagar o texto e salvar deixava o valor antigo
   no banco. Havia um comentário no código dizendo que resolver isso era
   "decisão de produto separada".

   O usuário tomou a decisão ao pedir "ao editar uma magia, permitir excluir
   um nível": agora o payload leva `null` explícito, mas SÓ para o campo que
   tinha valor na linha carregada. Campo que já nasceu vazio continua fora
   do payload — é isso que impede o editor de sobrescrever com NULL colunas
   que ele nem mostra. */
describe('apagar campo ao editar', () => {
  it('campo que TINHA valor e foi esvaziado vira null no payload', async () => {
    montar({ linha: { key: 'mira', nome: 'Mira', custo: 2, descricao: 'Texto antigo.' } });
    fireEvent.change(document.querySelector('textarea[name="descricao"]'), { target: { value: '' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect('descricao' in ultimoUpdate.payload, 'precisa viajar no payload').toBe(true);
    expect(ultimoUpdate.payload.descricao).toBeNull();
  });

  it('campo que JÁ nascia vazio continua fora do payload', async () => {
    montar({ linha: { key: 'mira', nome: 'Mira', custo: 2 } });
    fireEvent.change(document.querySelector('input[name="nome"]'), { target: { value: 'Mira Apurada' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect('descricao' in ultimoUpdate.payload, 'nunca teve valor: não sobrescreve').toBe(false);
  });

  it('campo numérico esvaziado também vira null', async () => {
    montar({ tabela: 'itens', linha: { slug: 'corda', nome: 'Corda', forca_req: 5 } });
    fireEvent.change(document.querySelector('input[name="forca_req"]'), { target: { value: '' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload.forca_req).toBeNull();
  });

  it('CRIAR não manda null — campo vazio simplesmente não vai', async () => {
    montar({ linha: null });
    fireEvent.change(document.querySelector('input[name="nome"]'), { target: { value: 'Nova' } });
    fireEvent.change(document.querySelector('input[name="custo"]'), { target: { value: '2' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoInsert).not.toBeNull());
    expect('descricao' in ultimoInsert.payload).toBe(false);
  });

  // O caso que originou o pedido: nível de magia é uma coluna de texto.
  it('nível de magia apagado chega como null', async () => {
    montar({ tabela: 'magias', linha: { key: 'bola_de_fogo', nome: 'Bola de Fogo', nivel_1: 'Um', nivel_3: 'Três' } });
    fireEvent.change(document.querySelector('textarea[name="nivel_3"]'), { target: { value: '' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload.nivel_3).toBeNull();
    expect(ultimoUpdate.payload.nivel_1, 'o nível que ficou não é tocado').toBe('Um');
  });
});

describe('itens.magico — coluna GERADA, só leitura', () => {
  /* CORREÇÃO DE 11/09/2026.

     Este describe travava a expectativa `payload.magico === true` — isto é,
     que o editor MANDASSE a coluna no UPDATE. Contra o banco real isso nunca
     funcionou: `magico` é

       GENERATED ALWAYS AS (magia IS NOT NULL AND magia <> '') STORED

     e o Postgres recusa qualquer UPDATE que a mencione, com
     "column magico can only be updated to DEFAULT". O resultado era que
     NENHUMA edição de item salvava — o erro que o usuário reportou.

     A suíte ficava verde porque o fake do Supabase (src/test/fake-supabase.js)
     aceita qualquer payload; a coluna gerada só existe no banco de verdade.
     Lição registrada aqui pra não voltar: teste de payload prova o que o
     cliente MANDA, não o que o banco ACEITA.

     O valor continua sendo EXIBIDO — o Mestre precisa ver se o item é mágico
     —, mas deriva de `magia` e não é editável nem enviado. */
  it('carrega magico=true mostrando "Sim"', () => {
    montar({ tabela: 'itens', linha: { slug: 'anel', nome: 'Anel', magico: true } });
    const pill = Array.from(document.querySelectorAll('.select-pill-btn'))
      .find((b) => /Sim|Não/.test(b.textContent));
    expect(pill, 'campo magico não achado').toBeTruthy();
    expect(pill.textContent).toMatch(/Sim/);
  });

  it('carrega magico=false mostrando "Não"', () => {
    montar({ tabela: 'itens', linha: { slug: 'corda', nome: 'Corda', magico: false } });
    const pill = Array.from(document.querySelectorAll('.select-pill-btn'))
      .find((b) => /Sim|Não/.test(b.textContent));
    expect(pill.textContent).toMatch(/Não/);
  });

  it('o controle fica desabilitado', () => {
    montar({ tabela: 'itens', linha: { slug: 'anel', nome: 'Anel', magico: true } });
    const pill = Array.from(document.querySelectorAll('.select-pill-btn'))
      .find((b) => /Sim|Não/.test(b.textContent));
    expect(pill.disabled).toBe(true);
  });

  it('NUNCA entra no payload — é o que fazia todo save de item falhar', async () => {
    montar({ tabela: 'itens', linha: { slug: 'anel', nome: 'Anel', magico: true } });
    fireEvent.change(document.querySelector('textarea[name="descricao"]'), { target: { value: 'nova' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect('magico' in ultimoUpdate.payload).toBe(false);
    expect(ultimoUpdate.payload.descricao, 'o resto do payload segue normal').toBe('nova');
  });
});

describe('opções com sigla no banco e palavra na tela', () => {
  it('itens.tipo mostra Sólido e grava S', async () => {
    montar({ tabela: 'itens', linha: { slug: 'pocao', nome: 'Poção', tipo: 'S' } });
    const pill = Array.from(document.querySelectorAll('.select-pill-btn'))
      .find((b) => /Sólido|Líquido/.test(b.textContent));
    expect(pill, 'campo tipo não achado').toBeTruthy();
    expect(pill.textContent).toMatch(/Sólido/);

    fireEvent.change(document.querySelector('textarea[name="descricao"]'), { target: { value: 'x' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload.tipo, 'a SIGLA vai pro banco, não o rótulo').toBe('S');
  });

  it('itens.tipo_armadura mostra Médio e grava M', async () => {
    montar({ tabela: 'itens', linha: { slug: 'cota', nome: 'Cota', tipo_armadura: 'M' } });
    const pill = Array.from(document.querySelectorAll('.select-pill-btn'))
      .find((b) => /Leve|Médio|Pesado/.test(b.textContent));
    expect(pill, 'campo tipo_armadura não achado').toBeTruthy();
    expect(pill.textContent).toMatch(/Médio/);

    fireEvent.change(document.querySelector('textarea[name="descricao"]'), { target: { value: 'x' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload.tipo_armadura).toBe('M');
  });
});

describe('largura dos campos — área ocupa a largura cheia, o resto fica na coluna estreita', () => {
  // 13/09/2026: o modal tinha 800px e a grade só 682px (4 colunas de 160px).
  // A classe modal-catalogo ajusta a largura à grade (index.css).
  it('o modal do editor leva a classe modal-catalogo, que o ajusta à grade', () => {
    montar({ tabela: 'criaturas', linha: null });
    expect(document.querySelector('.ms-modal').classList.contains('modal-catalogo')).toBe(true);
  });

  it('o grid do editor usa a classe própria catalogo-form-grid (NÃO a diario-form-grid compartilhada)', () => {
    montar({ tabela: 'tecnicas', linha: null });
    const grid = document.querySelector('.catalogo-form-grid');
    expect(grid).toBeTruthy();
    expect(grid.classList.contains('diario-form-grid')).toBe(false);
  });

  it('campo `area` (textarea) recebe a classe de largura cheia', () => {
    montar({ tabela: 'tecnicas', linha: null });
    const textarea = document.querySelector('textarea[name="descricao"]');
    const wrapper = textarea.closest('.catalogo-campo-full');
    expect(wrapper, 'textarea de descrição deveria estar dentro de .catalogo-campo-full').toBeTruthy();
  });

  it('campo `numero` NÃO recebe a classe de largura cheia', () => {
    montar({ tabela: 'tecnicas', linha: null });
    const input = document.querySelector('input[name="custo"]');
    expect(input.closest('.catalogo-campo-full')).toBeNull();
  });

  it('campo `opcoes` NÃO recebe a classe de largura cheia', () => {
    montar({ tabela: 'tecnicas', linha: null });
    const pill = document.querySelector('.motor-field');
    expect(pill.closest('.catalogo-campo-full')).toBeNull();
  });

  it('campo `texto` NÃO recebe a classe de largura cheia', () => {
    montar({ tabela: 'tecnicas', linha: null });
    const input = document.querySelector('input[name="nome"]');
    expect(input.closest('.catalogo-campo-full')).toBeNull();
  });

  it('campo `derivado` (criaturas) NÃO recebe a classe de largura cheia', () => {
    montar({ tabela: 'criaturas', linha: null });
    const input = document.querySelector('input[name="energia_fisica"]');
    expect(input.closest('.catalogo-campo-full')).toBeNull();
  });
});

describe('coluna do update (.eq) — chave certa por tabela', () => {
  it('tecnicas usa key', async () => {
    montar({ tabela: 'tecnicas', linha: { key: 'mira', nome: 'Mira', custo: 2 } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.eqCol).toBe('key');
    expect(ultimoUpdate.eqVal).toBe('mira');
  });

  it('itens usa slug', async () => {
    montar({ tabela: 'itens', linha: { slug: 'anel', nome: 'Anel', magico: true } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.eqCol).toBe('slug');
    expect(ultimoUpdate.eqVal).toBe('anel');
  });

  it('criaturas usa id (sem chave própria no descritor)', async () => {
    montar({ tabela: 'criaturas', linha: { id: 42, nome: 'Dragão' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.eqCol).toBe('id');
    expect(ultimoUpdate.eqVal).toBe(42);
  });
});

/* ── Criatura: armadura, absorção e listas do catálogo (13/09/2026) ──
   "Na hora de criação e edição de criaturas, onde eu informo a absorção e onde
    eu informo o tipo de armadura? Quero poder escolher quais técnicas,
    habilidades e magias a criatura possui, escolhendo na lista que temos
    disponíveis." (usuário)

   • Havia DOIS campos de armadura: "Armadura" (texto livre, a sigla L/M/P que
     a batalha lê) e "Tipo de Armadura" (`tipo_armadura`, vazio em 224 das 228
     criaturas e ignorado pela batalha). Fica um só: `armadura`, escolhido
     entre Leve/Médio/Pesado, com o rótulo "Tipo de Armadura", junto da
     Absorção e da Defesa.
   • Técnicas, habilidades e magias continuam gravando texto separado por
     vírgula (o formato que batalha e Diário leem), mas são escolhidas na lista
     do catálogo. O que já estava gravado e não existe no catálogo ("Bote",
     "Esquiva 7") continua lá — nada some ao editar. */
describe('criatura — tipo de armadura', () => {
  const pillPorRotulo = (rotulo) => Array.from(document.querySelectorAll('.motor-field'))
    .find((w) => (w.querySelector('span')?.textContent || '') === rotulo);

  it('um só campo "Tipo de Armadura", com Leve/Médio/Pesado', () => {
    montar({ tabela: 'criaturas', linha: null });
    const rotulos = Array.from(document.querySelectorAll('label, .motor-field > span'))
      .map((el) => el.textContent.trim());
    expect(rotulos.filter((r) => r === 'Tipo de Armadura')).toHaveLength(1);
    expect(rotulos, 'o campo "Armadura" de texto livre sai').not.toContain('Armadura');
    const w = pillPorRotulo('Tipo de Armadura');
    expect(w, 'tipo de armadura deve ser uma seleção').toBeTruthy();
    fireEvent.click(w.querySelector('.select-pill-btn'));
    const opcoes = Array.from(document.querySelectorAll('.select-pill-drop li')).map((li) => li.textContent.trim());
    expect(opcoes).toEqual(['Leve', 'Médio', 'Pesado']);
  });

  it('grava a SIGLA em `armadura` e não manda `tipo_armadura`', async () => {
    montar({ tabela: 'criaturas', linha: { id: 7, nome: 'Lobo', armadura: 'L', tipo_armadura: 'X' } });
    const w = pillPorRotulo('Tipo de Armadura');
    expect(w.querySelector('.select-pill-btn').textContent).toMatch(/Leve/);
    fireEvent.click(w.querySelector('.select-pill-btn'));
    fireEvent.click(Array.from(document.querySelectorAll('.select-pill-drop li')).find((li) => li.textContent.trim() === 'Pesado'));
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload.armadura).toBe('P');
    expect('tipo_armadura' in ultimoUpdate.payload).toBe(false);
  });

  it('absorção continua calculada e editável, logo depois do tipo de armadura', () => {
    const cols = window.descritorDe('criaturas').campos.map((c) => c.col);
    expect(cols.indexOf('absorcao')).toBe(cols.indexOf('armadura') + 1);
    expect(cols).not.toContain('tipo_armadura');
  });

  /* 13/09/2026: "O nível das habilidades, técnicas e magias é com base no
     nível e atributos da criatura." O nível das magias é o estágio — o campo
     de nível à parte sai do formulário. */
  it('não há campo de nível das magias: o nível é o estágio da criatura', () => {
    montar({ tabela: 'criaturas', linha: null });
    expect(document.querySelector('input[name="magia_n"]')).toBeNull();
    expect(window.descritorDe('criaturas').campos.map((c) => c.col)).not.toContain('magia_n');
  });
});

/* "Na criação/edição de criaturas, não precisa mostrar dano 75, 50, 25 do
    dano, só 100, é óbvio." (usuário, 13/09/2026) — os três continuam
   gravados (a batalha os lê), sempre derivados do Dano 100% que está na tela. */
describe('criatura — só o Dano 100% aparece', () => {
  it('Dano 25/50/75 não são renderizados', () => {
    montar({ tabela: 'criaturas', linha: null });
    ['dano_25', 'dano_50', 'dano_75'].forEach((col) => expect(document.querySelector(`input[name="${col}"]`), col).toBeNull());
    expect(document.querySelector('input[name="dano_100"]')).toBeTruthy();
  });

  it('ao criar, os três vão no payload calculados do Dano 100%', async () => {
    montar({ tabela: 'criaturas', linha: null });
    fireEvent.change(document.querySelector('input[name="nome"]'), { target: { value: 'Urso' } });
    fireEvent.change(document.querySelector('input[name="dano_100"]'), { target: { value: '30' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoInsert).not.toBeNull());
    expect(ultimoInsert.payload).toMatchObject({ dano_100: 30, dano_25: 8, dano_50: 15, dano_75: 23 });
  });

  it('ao editar, mudar o Dano 100% recalcula os três (não ficam presos no valor antigo)', async () => {
    montar({ tabela: 'criaturas', linha: { id: 9, nome: 'Urso', dano_100: 20, dano_25: 5, dano_50: 10, dano_75: 15 } });
    fireEvent.change(document.querySelector('input[name="dano_100"]'), { target: { value: '40' } });
    fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload).toMatchObject({ dano_100: 40, dano_25: 10, dano_50: 20, dano_75: 30 });
  });
});

describe('criatura — técnicas, habilidades e magias escolhidas na lista', () => {
  const blocoDe = (col) => document.querySelector('[data-lista="' + col + '"]');
  const chips = (col) => Array.from(blocoDe(col).querySelectorAll('.catalogo-lista-chip-nome')).map((c) => c.textContent);
  const buscar = (col, txt) => fireEvent.change(blocoDe(col).querySelector('input'), { target: { value: txt } });
  const sugestoes = (col) => Array.from(blocoDe(col).querySelectorAll('.select-pill-drop li')).map((li) => li.textContent.trim());
  const salvar = () => fireEvent.click(screen.getAllByRole('button').find((b) => /salvar/i.test(b.textContent)));

  it('mostra o que está gravado como etiquetas, inclusive o que não está no catálogo', async () => {
    listasFixture.tecnicas = [{ nome: 'Esquiva' }, { nome: 'Fúria' }];
    montar({ tabela: 'criaturas', linha: { id: 3, nome: 'Tigre', tecnicas_especiais: 'Esquiva 7, Bote' } });
    expect(chips('tecnicas_especiais')).toEqual(['Esquiva 7', 'Bote']);
    await vi.waitFor(() => expect(blocoDe('tecnicas_especiais').querySelector('.catalogo-lista-chip--fora')).toBeTruthy());
    const fora = Array.from(blocoDe('tecnicas_especiais').querySelectorAll('.catalogo-lista-chip--fora')).map((c) => c.textContent);
    expect(fora).toHaveLength(1);
    expect(fora[0]).toMatch(/Bote/);
  });

  it('busca na lista do catálogo, sem oferecer o que já foi escolhido, e grava com vírgula', async () => {
    listasFixture.tecnicas = [{ nome: 'Esquiva' }, { nome: 'Fúria' }, { nome: 'Fúria Cega' }];
    montar({ tabela: 'criaturas', linha: { id: 3, nome: 'Tigre', tecnicas_especiais: 'Esquiva 7, Bote' } });
    buscar('tecnicas_especiais', 'fur');
    await vi.waitFor(() => expect(sugestoes('tecnicas_especiais')).toEqual(['Fúria', 'Fúria Cega']));
    buscar('tecnicas_especiais', 'esq');
    expect(sugestoes('tecnicas_especiais'), 'Esquiva já está (com nível 7)').toEqual([]);
    buscar('tecnicas_especiais', 'fur');
    fireEvent.click(Array.from(blocoDe('tecnicas_especiais').querySelectorAll('.select-pill-drop li')).find((li) => li.textContent.trim() === 'Fúria'));
    expect(chips('tecnicas_especiais')).toEqual(['Esquiva 7', 'Bote', 'Fúria']);
    salvar();
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload.tecnicas_especiais).toBe('Esquiva 7, Bote, Fúria');
  });

  it('remover a etiqueta tira do texto gravado; remover todas grava null', async () => {
    montar({ tabela: 'criaturas', linha: { id: 3, nome: 'Tigre', habilidades: 'Correr, Sentidos' } });
    fireEvent.click(blocoDe('habilidades').querySelector('button[aria-label="Remover Correr"]'));
    expect(chips('habilidades')).toEqual(['Sentidos']);
    fireEvent.click(blocoDe('habilidades').querySelector('button[aria-label="Remover Sentidos"]'));
    salvar();
    await vi.waitFor(() => expect(ultimoUpdate).not.toBeNull());
    expect(ultimoUpdate.payload.habilidades).toBeNull();
  });

  it('magias vêm da tabela de magias; Enter adiciona a primeira sugestão', async () => {
    listasFixture.magias = [{ nome: 'Bola de Fogo' }, { nome: 'Silêncio' }];
    montar({ tabela: 'criaturas', linha: null });
    buscar('magia', 'sil');
    await vi.waitFor(() => expect(sugestoes('magia')).toEqual(['Silêncio']));
    fireEvent.keyDown(blocoDe('magia').querySelector('input'), { key: 'Enter' });
    expect(chips('magia')).toEqual(['Silêncio']);
    expect(blocoDe('magia').querySelector('input').value).toBe('');
  });

  it('texto que não está na lista não vira etiqueta (escolha é só do catálogo)', async () => {
    listasFixture.habilidades = [{ nome: 'Correr' }];
    montar({ tabela: 'criaturas', linha: null });
    buscar('habilidades', 'Voar');
    fireEvent.keyDown(blocoDe('habilidades').querySelector('input'), { key: 'Enter' });
    expect(chips('habilidades')).toEqual([]);
  });
});
