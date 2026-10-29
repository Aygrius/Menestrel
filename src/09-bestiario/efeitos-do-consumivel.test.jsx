/* ============================================================
   efeitos-do-consumivel.test.jsx — a grade de efeitos no editor
   ============================================================
   Pedido do usuário (26/10/2026): "no modal de editar item, quando for
   consumível, adicione um campo para cada campo que aquele item consumível
   pode alterar. Campos de vitalidade, condições, etc. Ali será informado um
   valor positivo ou negativo, que indicará os efeitos de seu uso."

   O que este arquivo trava:
     • a grade só aparece no grupo Consumíveis;
     • ela LÊ o que já está gravado em prosa (ida e volta pelo parser);
     • digitar numa célula ESCREVE as duas prosas — que continuam sendo o
       armazenamento (nenhuma coluna nova foi criada).
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/bases-item.jsx';
import '../10-shell/shell.jsx';
import './criatura-formulas.jsx';
import './catalogo-descritores.jsx';

let CatalogoEditor;

beforeAll(async () => {
  /* Dublê do supabaseClient: toda chamada devolve a própria corrente e a
     corrente resolve vazia. Este arquivo não testa banco nenhum — só não
     pode explodir enquanto o editor carrega as listas dele. */
  const corrente = () => {
    const alvo = Promise.resolve({ data: [], error: null, count: 0 });
    return new Proxy(alvo, {
      get(obj, prop) {
        if (prop === 'then' || prop === 'catch' || prop === 'finally') {
          return obj[prop].bind(obj);
        }
        return () => corrente();
      },
    });
  };
  window.supabaseClient = { from: () => corrente(), rpc: () => corrente() };
  await import('./catalogo-editor.jsx');
  CatalogoEditor = window.CatalogoEditor;
  expect(CatalogoEditor).toBeDefined();
});

afterEach(cleanup);

const montar = (linha) => render(
  <div className="menestrel-ui">
    <CatalogoEditor tabela="itens" linha={linha} lang="pt"
      onSalvo={() => {}} onCancel={() => {}} />
  </div>
);

/* ── DUAS GRADES, DOIS BUSCADORES (28/10/2026) ────────────────────────────
   A grade de PROTEÇÕES entrou ao lado da de efeitos, e as duas usam os mesmos
   rótulos: `getByLabelText('Fome')` passou a achar dois campos. A busca agora
   diz em qual grade procurar, que é o que a pergunta sempre quis dizer. */
const celulaEm = (grupo, rotulo) => {
  const alvo = [...document.querySelectorAll(grupo + ' .cat-efeito')]
    .find((l) => l.querySelector('.cat-efeito-rot').textContent === rotulo);
  expect(alvo, `célula "${rotulo}" em ${grupo}`).toBeTruthy();
  return alvo.querySelector('.cat-efeito-num');
};
const celula = (rotulo) => celulaEm('.cat-efeitos-grupo:not(.cat-efeitos-grupo--prot)', rotulo);
const celulaProt = (rotulo) => celulaEm('.cat-efeitos-grupo--prot', rotulo);

const POCAO = {
  id: 7, slug: 'pocao-de-cura', nome: 'Poção de Cura', grupo: 'Consumíveis',
  efeito_positivo: 'Aumenta 10 de Energia Física.',
  efeito_negativo: 'Reduz 5 de Fome.',
};

describe('a grade de efeitos do consumível', () => {
  it('só aparece no grupo Consumíveis', () => {
    montar({ id: 1, slug: 'espada', nome: 'Espada', grupo: 'Armas' });
    expect(document.querySelector('.cat-efeitos')).toBeNull();
    cleanup();
    montar(POCAO);
    expect(document.querySelector('.cat-efeitos')).not.toBeNull();
  });

  it('tem uma célula para cada barra que um consumível pode mexer', () => {
    montar(POCAO);
    const rots = (g) => [...document.querySelectorAll(g + ' .cat-efeito-rot')].map((e) => e.textContent);
    expect(rots('.cat-efeitos-grupo:not(.cat-efeitos-grupo--prot)'))
      .toEqual(window.EFEITOS_EDITAVEIS.map((d) => d.rotulo));
    /* Proteções entraram em 28/10/2026 como terceiro passe, com as mesmas
       condições menos a Temperatura (tronco legado de Frio e Calor). */
    expect(rots('.cat-efeitos-grupo--prot'))
      .toEqual(window.PROTECOES_EDITAVEIS.map((d) => d.rotulo));
    const titulos = [...document.querySelectorAll('.cat-efeitos-tit')].map((e) => e.textContent);
    expect(titulos).toEqual(['Vitalidade', 'Condições', 'Proteções']);
  });

  it('lê o que já está gravado em prosa, com o sinal da barra', () => {
    montar(POCAO);
    expect(celula('Energia Física').value).toBe('10');
    // "Reduz 5 de Fome" DESCE a barra de Fome: negativo.
    expect(celula('Fome').value).toBe('-5');
    // Barra que o item não mexe fica em branco — não é zero gravado.
    expect(celula('Karma').value).toBe('');
  });

  it('digitar na célula reescreve as duas prosas', () => {
    montar(POCAO);
    fireEvent.change(celula('Karma'), { target: { value: '3' } });
    const pos = document.querySelector('[name="efeito_positivo"]');
    const neg = document.querySelector('[name="efeito_negativo"]');
    expect(pos.value).toBe('Aumenta 10 de Energia Física, 3 de Karma.');
    expect(neg.value).toBe('Reduz 5 de Fome.');
  });

  it('aceita o sinal de menos sendo digitado sem perder o resto', () => {
    montar(POCAO);
    const alvo = celula('Sede');
    fireEvent.change(alvo, { target: { value: '-' } });
    expect(alvo.value).toBe('-');      // estado legítimo de quem está digitando
    fireEvent.change(alvo, { target: { value: '-20' } });
    // A prosa sai na ordem da grade (Sede vem antes de Fome), não na de digitação.
    expect(document.querySelector('[name="efeito_negativo"]').value)
      .toBe('Reduz 20 de Sede, 5 de Fome.');
  });

  it('zerar a célula tira a barra da prosa', () => {
    montar(POCAO);
    fireEvent.change(celula('Fome'), { target: { value: '' } });
    expect(document.querySelector('[name="efeito_negativo"]').value).toBe('');
    expect(document.querySelector('[name="efeito_positivo"]').value)
      .toBe('Aumenta 10 de Energia Física.');
  });

  /* ── A PROTEÇÃO VIROU GRADE (28/10/2026, decisão do usuário) ───────────
     Era outro tipo de efeito (scope `protecao`) que a grade não conhecia: a
     gravação a relia do item e a reemitia intacta, para não apagá-la. Agora
     ela tem passe próprio e se edita como o resto — "vira linha própria na
     grade", perguntado se devia virar efeito comum.

     A diferença que justifica o passe separado: proteção não mexe na barra,
     LIMITA O TETO dela enquanto a peça está vestida. */
  it('não destrói a proteção da peça ao reescrever', () => {
    montar({ ...POCAO, efeito_positivo: 'Aumenta 10 de Energia Física, Protege 25 de Frio.' });
    fireEvent.change(celula('Karma'), { target: { value: '1' } });
    expect(document.querySelector('[name="efeito_positivo"]').value)
      .toContain('Protege 25 de Frio');
  });

  it('lê a proteção gravada na grade própria, sem confundir com o delta', () => {
    montar({ ...POCAO, efeito_positivo: 'Aumenta 10 de Energia Física, Protege 25 de Frio.' });
    expect(celulaProt('Frio').value).toBe('25');
    // A mesma barra, no passe dos efeitos, continua vazia: são coisas diferentes.
    expect(celula('Frio').value).toBe('');
  });

  it('digitar na proteção escreve "Protege N de X" sem tocar nos deltas', () => {
    montar(POCAO);
    fireEvent.change(celulaProt('Calor'), { target: { value: '15' } });
    expect(document.querySelector('[name="efeito_positivo"]').value)
      .toBe('Aumenta 10 de Energia Física, Protege 15 de Calor.');
    expect(document.querySelector('[name="efeito_negativo"]').value).toBe('Reduz 5 de Fome.');
  });

  it('zerar a proteção a apaga — que antes era impossível pelo editor', () => {
    montar({ ...POCAO, efeito_positivo: 'Aumenta 10 de Energia Física, Protege 25 de Frio.' });
    fireEvent.change(celulaProt('Frio'), { target: { value: '' } });
    expect(document.querySelector('[name="efeito_positivo"]').value)
      .toBe('Aumenta 10 de Energia Física.');
  });

  // Teto negativo não quer dizer nada: o campo nem aceita o sinal.
  it('a proteção não aceita sinal de menos', () => {
    montar(POCAO);
    fireEvent.change(celulaProt('Frio'), { target: { value: '-5' } });
    expect(celulaProt('Frio').value).toBe('5');
  });
});

describe('efeitosEmNumeros / efeitosParaTexto — ida e volta', () => {
  it('o que a grade lê é o que a grade escreve', () => {
    const numeros = window.efeitosEmNumeros(POCAO);
    expect(numeros).toEqual({ 'Energia Física': 10, Fome: -5 });
    const prosa = window.efeitosParaTexto(numeros, POCAO);
    expect(window.efeitosEmNumeros(prosa)).toEqual(numeros);
  });

  it('item sem efeito nenhum vira dois campos vazios', () => {
    expect(window.efeitosParaTexto({}, {})).toEqual({ efeito_positivo: '', efeito_negativo: '' });
  });
});
