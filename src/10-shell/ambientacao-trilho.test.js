/* ============================================================
   ambientacao-trilho.test.js — a Ambientação navega por um trilho
   ============================================================
   Pedido do usuário (04/11/2026): "Ao clicar no menu ambientação, a
   navegação pelas páginas será por um trilho superior parecido com o trilho
   da ficha. Mas os menus serão reinos, cidades, etc."

   No menu lateral a Ambientação é UM item, sem gaveta; as folhas (Reinos,
   Cidades, Locais, Pessoas) são os botões do trilho no topo das páginas. Os
   filhos continuam na árvore do menu — é deles que vem o título da página.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const constantes = readFileSync(resolve(__dirname, '../01-core/constants.jsx'), 'utf8');
const shell = readFileSync(resolve(__dirname, 'shell.jsx'), 'utf8');

const nav = (() => {
  const janela = {};
  // eslint-disable-next-line no-new-func
  new Function('window', constantes)(janela);
  return janela;
})();

describe('a Ambientação do Mestre', () => {
  const amb = nav.NAV_MESA.master.mesa.find((n) => n.rotulo && n.rotulo.pt === 'Ambientação');

  it('é um grupo de trilho, com as cinco folhas na ordem (Entidades em 08/11/2026)', () => {
    expect(amb).toBeTruthy();
    expect(amb.trilho).toBe(true);
    expect(amb.filhos.map((f) => f.secao)).toEqual(['lugares', 'cidades', 'locais', 'npcs', 'entidades', 'grupos', 'mapa']);
  });

  it('as folhas seguem contando como páginas do menu (título e acesso)', () => {
    const folhas = nav.folhasDoMenu(nav.NAV_MESA.master.mesa).map((f) => f.secao);
    expect(folhas).toEqual(expect.arrayContaining(['lugares', 'cidades', 'locais', 'npcs']));
  });

  it('no menu lateral é um item só, sem gaveta', () => {
    // A guarda `!bloqueio` (15/11/2026): o Diário do Jogador sem personagem fica inativo.
    expect(shell).toMatch(/if \(no\.trilho\) \{[\s\S]{0,700}onClick=\{\(\) => \{ if \(!bloqueio\) irPara\(no\); \}\}/);
  });

  /* Dentro da página, não numa faixa acima (04/11/2026, usuário: 'na ficha o
     trilho fica dentro da página e não fora. Você só vai unir o trilho atual
     de buscar com o trilho novo'). */
  it('as páginas entram na mesma pílula da busca e do +, antes deles', () => {
    expect(shell).toMatch(/const grupoDoTrilho = nav\.mesa\.find\(\(n\) => n\.trilho && n\.filhos && contemSecao\(n\)\)/);
    expect(shell).toMatch(/<LoreDaMesa[\s\S]{0,300}trilhoPaginas=\{trilhoPaginas\}/);
    expect(shell).not.toMatch(/ambientacao-trilho/);   // a faixa de fora saiu
    const diario = readFileSync(resolve(__dirname, '../13-diario/diario.jsx'), 'utf8');
    expect(diario).toMatch(/antes=\{trilhoPaginas\} \/>/);
    const best = readFileSync(resolve(__dirname, '../09-bestiario/bestiario.jsx'), 'utf8');
    /* A busca numa pílula própria (15/11/2026, usuário: "Separe o campo de
       busca do trilho superior"): as páginas na primeira, a busca na seguinte. */
    expect(best).toMatch(/<div className="best-header-acoes">\{antes\}<\/div>\s*\{busca\}/);
    expect(best).toMatch(/const busca = \(\s*<div className="best-header-acoes">\s*<div className="best-search">/);
  });

  it('cada folha tem ícone próprio, não o pontinho de recuo', () => {
    expect(shell).toMatch(/lugares: 'ti-crown', cidades: 'ti-building', locais: 'ti-map-pin', npcs: 'ti-user'/);
  });
});

/* COMPÊNDIO (15/11/2026, usuário: "Adicione um novo menu, abaixo de
   ambientação, chamado de compêndio [...] o conteúdo será aquele de itens,
   criaturas, magias, etc que temos no ctrl + k"). */
describe('o Compêndio', () => {
  const LISTAS = ['criaturas', 'itens', 'magias', 'tecnicas', 'habilidades'];
  it('vem logo abaixo da Ambientação (Mestre) e do Diário (Jogador)', () => {
    const m = nav.NAV_MESA.master.mesa;
    const iAmb = m.findIndex((n) => n.rotulo && n.rotulo.pt === 'Ambientação');
    expect(m[iAmb + 1].id).toBe('compendio');
    const p = nav.NAV_MESA.player.mesa;
    expect(p[p.findIndex((n) => n.id === 'diario') + 1].id).toBe('compendio');
  });
  it('é grupo de trilho com as cinco listas da busca, na ordem do trilho do livro', () => {
    const c = nav.NAV_MESA.master.mesa.find((n) => n.id === 'compendio');
    expect(c.trilho).toBe(true);
    expect(c.rotulo.pt).toBe('Compêndio');
    expect(c.filhos.map((f) => f.secao)).toEqual(LISTAS);
  });
  it('tem ícone próprio', () => {
    expect(shell).toMatch(/compendio: 'ti-book',/);
  });
});

/* CENA, BATALHA E LOJA NUMA PÁGINA SÓ (04/11/2026, usuário: "Cena, Batalha e
   Loja do mestre também vão ficar na mesma página com trilho superior"). */
describe('a Mesa do Mestre', () => {
  const mesa = nav.NAV_MESA.master.mesa;
  const grupo = mesa.find((n) => n.id === 'mesa_mestre');

  /* A Loja saiu do trilho em 15/11/2026 (usuário: "agora ele só deve aparecer
     no mapa ao clicar na cidade"): o passe da cidade leva a loja_mesa. */
  it('é um grupo de trilho com Cena e Batalha; a Loja abre pelo mapa', () => {
    expect(grupo.trilho).toBe(true);
    expect(grupo.rotulo.pt).toBe('Mesa');
    expect(grupo.filhos.map((f) => f.secao)).toEqual(['cena', 'batalha']);
    expect(shell).toMatch(/<MapaView [^\n]*\n[^\n]*onLoja=\{profile === 'master' && mesaAtivaId \? \(\) => ir\('loja_mesa'\) : null\}/);
    // As três saíram do primeiro andar do menu.
    expect(mesa.filter((n) => ['cena', 'batalha', 'loja_mesa'].includes(n.secao))).toHaveLength(0);
  });

  it('o trilho chega às três páginas, no início da pílula delas', () => {
    expect(shell).toMatch(/<HistoriasList[\s\S]{0,700}trilhoPaginas=\{trilhoPaginas\}/);
    const hist = readFileSync(resolve(__dirname, '../06-historias/historias.jsx'), 'utf8');
    expect(hist).toMatch(/<CenaCronica [^\n]*trilhoPaginas=\{trilhoPaginas\}/);
    expect(hist).toMatch(/antes=\{trilhoPaginas\}/);
    const bat = readFileSync(resolve(__dirname, '../12-batalha/batalha.jsx'), 'utf8');
    expect(bat).toMatch(/antes=\{trilhoPaginas\}/);
    const est = readFileSync(resolve(__dirname, '../06-historias/estoque-mestre.jsx'), 'utf8');
    expect(est).toMatch(/\{trilhoPaginas && <div className="best-header-acoes">\{trilhoPaginas\}<\/div>\}\s*<div className="best-header-acoes">/);
  });
});

/* O RODAPÉ DA CENA EM BATALHA E LOJA (04/11/2026, usuário: "O rodapé com
   data, localização, etc que tem na página cena, se repete em batalha, loja,
   etc."). Sempre dentro da página (soNoRodape), nunca fixo no alto. */
describe('o rodapé da Mesa nas três páginas', () => {
  it('o shell monta a faixa em Batalha e Loja, só no rodapé', () => {
    expect(shell).toMatch(/const rodapeDaMesa = profile === 'master' && \['batalha', 'loja_mesa'\]\.includes\(currentId\);/);
    expect(shell).toMatch(/soNoRodape=\{rodapeDaMesa \|\| /);
    expect(shell).toMatch(/historiaId=\{\(telaDaMesa \|\| rodapeDaMesa \|\| fichaNaTela\) \? mesaAtivaId : null\}/);
  });
  it('Batalha e Loja abrem o espaço do rodapé, como a Cena', () => {
    const bat = readFileSync(resolve(__dirname, '../12-batalha/batalha.jsx'), 'utf8');
    const est = readFileSync(resolve(__dirname, '../06-historias/estoque-mestre.jsx'), 'utf8');
    expect(bat).toMatch(/\{trilhoPaginas && <div id="pg-rodape-slot" className="pg-rodape" \/>\}/);
    expect(est).toMatch(/\{trilhoPaginas && <div id="pg-rodape-slot" className="pg-rodape estoque-rodape" \/>\}/);
  });
});

/* 15/11/2026, usuário: "Para o jogador, o menu 'Mesa' ficará inativo se não
   houver personagem vinculado a nenhuma mesa. E o menu 'Diário' ficará
   inativo se não houver personagem criado." */
describe('Mesa e Diário do Jogador inativos', () => {
  it('Mesa apaga sem personagem em mesa; Diário, sem personagem', () => {
    expect(shell).toMatch(/no\.secao === 'aventuras' && !acessoJogador\.temMesa/);
    expect(shell).toMatch(/no\.id === 'diario' && !acessoJogador\.temPj/);
  });
  it('vale qualquer personagem do Jogador, não só o ativo', () => {
    expect(shell).toMatch(/from\('personagens'\)\.select\('id'\)\.eq\('user_id', user\.id\)/);
    expect(shell).toMatch(/overlaps\('protagonista_ids', ids\)/);
  });
  it('o item inativo não navega e diz o porquê no balão', () => {
    expect(shell).toMatch(/aria-disabled=\{bloqueio \? true : undefined\}\s*\{\.\.\.propsTip\(abrirNavTip, fecharNavTip, bloqueio\)\}\s*onClick=\{\(\) => \{ if \(!bloqueio\) irPara\(no\); \}\}/);
  });
});
