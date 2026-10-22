/* ============================================================
   estudar-na-ficha.test.js — o livro mostra "Estudar" também na ficha
   ============================================================
   Pedido do usuário (22/10/2026): "Pode mostrar 'Estudar' no livro." A
   janela de item da ficha (contexto="ficha") só ganha Estudar/Aprender se
   receber o catálogo de magias, os vínculos livro→pergaminho e o PJ. Lá o
   aprendizado em si fica para o Inventário — a janela Estudar abre e cada
   linha diz "Aprenda pelo Inventário" (mesma regra do pergaminho).

   Teste de fonte, como os outros da ficha: montar a Ficha inteira exigiria
   o Supabase da página toda.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const fonte = readFileSync('src/11-ficha/ficha.jsx', 'utf8').replace(/\r\n/g, '\n');
const i = fonte.indexOf('contexto="ficha"\n            onClose={() => setDetalheCintoId(null)}');
const bloco = fonte.slice(Math.max(0, i - 600), i + 1600);

describe('janela de item da ficha', () => {
  it('existe', () => {
    expect(i).toBeGreaterThan(-1);
  });
  it('recebe o catálogo de magias, os vínculos dos livros e o PJ', () => {
    expect(bloco).toMatch(/magiasDb=\{magias\}/);
    expect(bloco).toMatch(/vinculos=\{vinculosLivros\}/);
    expect(bloco).toMatch(/pjAprendiz=\{pj\}/);
  });
  it('a ficha carrega livro_pergaminhos', () => {
    expect(fonte).toMatch(/\('livro_pergaminhos', \{ colunas: 'livro_slug,pergaminho_slug'/);
  });
});

/* Paginação estável (22/10/2026): o banco entrega 1000 linhas por página, e
   a lista de vínculos só pagina sem pular nem repetir linha se vier sempre na
   mesma ordem — por livro E por pergaminho (a chave inteira da tabela). */
describe('leitura de livro_pergaminhos ordena pela chave inteira', () => {
  it.each([
    ['src/11-ficha/ficha.jsx'],
    ['src/07-inventario/inventario.jsx'],
  ])('%s', (arq) => {
    const src = readFileSync(arq, 'utf8');
    expect(src).toMatch(/'livro_pergaminhos', \{ colunas: 'livro_slug,pergaminho_slug', ordem: \['livro_slug', 'pergaminho_slug'\] \}/);
  });
});
