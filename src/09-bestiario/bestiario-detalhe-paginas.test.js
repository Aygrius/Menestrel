/* AS PÁGINAS DA JANELA DE LEITURA (17/11/2026, usuário: "Ao invés do uso de
   barra de rolagem vertical, vamos adicionar um botão de navegação de páginas
   nos modais de ambientação e compêndio" — só nas de leitura). A medida é do
   navegador (colunas); aqui, o contrato da fonte. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fonte = readFileSync(resolve(__dirname, 'bestiario.jsx'), 'utf8');
const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');

describe('a janela de leitura em páginas', () => {
  it('só nas janelas da Ambientação e do Compêndio, fora do painel', () => {
    expect(fonte).toContain("const paginar = !alvoPainelProp && !!extraClass && extraClass.split(' ').includes('modal-ambientacao');");
  });
  it('a navegação é a paginação do sistema, no rodapé, só com mais de uma página', () => {
    expect(fonte).toMatch(/paginar && !alvoPainel && paginas\.total > 1 && \(\s*<div className="ms-footer ms-footer--centro best-paginas-rodape">/);
    expect(fonte).toMatch(/<BestPagination page=\{paginas\.pagina \+ 1\}/);
  });
  it('com imagem no Prefácio, pagina a coluna do texto', () => {
    expect(fonte).toContain(".best-secao:not([hidden]) .grp-epigrafe--com-imagem .grp-epigrafe-texto') || corpo;");
  });
  it('o que pagina não rola em pé', () => {
    expect(css).toContain('#root .menestrel-ui .em-paginas { overflow: hidden !important; column-fill: auto; scrollbar-width: none; }');
  });
  it('trocar de aba volta à primeira página', () => {
    expect(fonte).toContain('React.useLayoutEffect(() => { paginaRef.current = 0; setPagina(0); medir(); }, [medir, chave]);');
  });
});
