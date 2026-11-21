/* ============================================================
   mapa.test.js — as contas e o contrato de dados do Mapa (15/11/2026)
   ============================================================
   Usuário: "os jogadores vão acompanhar onde seu personagem está, onde devem
   ir, sabendo distâncias". O que o Jogador lê na tela sai destas funções: a
   régua (km), o comprimento de um traçado e a rota da mesa partida em feito e
   por fazer no ponto onde a comitiva está.

   O motor (criarMotorMapa) desenha no DOM com ponteiro, zoom e o SVG do chão — é
   conferido no navegador pela prévia (/preview/?tela=mapa), não aqui.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import './mapa.jsx';

const aqui = dirname(fileURLToPath(import.meta.url));
const { mapaKm, mapaComprimento, mapaProjeta, mapaJornada, mapaSemente, mapaNormalizar, MAPA_KM, MAPA_PINTADAS } = window;

describe('a régua', () => {
  /* O mapa vetorial (21/11/2026): 365 unidades para 400 km — a média da régua
     dos Reinos (352) e da do Império (378) levadas para o mapa novo. */
  it('o mapa vetorial mede 365 unidades para 400 km', () => {
    expect(MAPA_KM * 365).toBeCloseTo(400, 6);
    expect(mapaKm(365)).toBe(400);
  });
  it('arredonda de 5 em 5 km: a posição das cidades não é mais fina que isso', () => {
    expect(mapaKm(3)).toBe(5);       // 3,3 km
    expect(mapaKm(23)).toBe(25);     // 25,2 km
  });
  it('o comprimento soma os trechos', () => {
    expect(mapaComprimento([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 10 }])).toBe(11);
    expect(mapaComprimento([{ x: 0, y: 0 }])).toBe(0);
  });
});

describe('a rota da mesa', () => {
  const rota = { id: 'r', tipo: 'rota', nome: 'Jornada', pts: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }] };
  const mesa = { lugares: [], linhas: [rota], rota: 'r', gente: {} };

  it('parte em feito e por fazer no ponto da rota mais perto da comitiva', () => {
    const j = mapaJornada(mesa, { x: 10, y: 4 });
    expect(mapaComprimento(j.feita)).toBe(14);
    expect(mapaComprimento(j.falta)).toBe(6);
    expect(j.destino).toEqual({ x: 10, y: 10 });
  });
  it('fora da rota, vale o ponto mais próximo dela', () => {
    const p = mapaProjeta({ x: 4, y: 3 }, rota.pts);
    expect(p.q).toEqual({ x: 4, y: 0 });
    expect(p.i).toBe(0);
  });
  it('sem ninguém no mapa, a rota inteira está por fazer', () => {
    const j = mapaJornada(mesa, null);
    expect(j.feita).toEqual([]);
    expect(mapaComprimento(j.falta)).toBe(20);
  });
  it('sem rota da mesa (ou com um caminho no lugar), não há jornada', () => {
    expect(mapaJornada({ ...mesa, rota: null }, { x: 0, y: 0 })).toBeNull();
    expect(mapaJornada({ ...mesa, linhas: [{ ...rota, tipo: 'caminho' }] }, { x: 0, y: 0 })).toBeNull();
  });
});

describe('o que vai para o banco', () => {
  /* 21/11/2026, usuário: "Pare de criar cidades automáticas". */
  it('mesa nova nasce vazia: sem cidade automática, sem rota e sem ninguém no mapa', () => {
    expect(mapaSemente()).toEqual({ lugares: [], linhas: [], rota: null, gente: {} });
  });
  it('linha vazia do banco vira a semente; linha gravada mantém o que o Mestre fez', () => {
    expect(mapaNormalizar(null).lugares).toEqual([]);
    expect(mapaNormalizar({}).lugares).toEqual([]);
    const gravado = { lugares: [{ id: 'a', tipo: 'ponto', nome: 'Ruína', x: 1, y: 2 }] };
    expect(mapaNormalizar(gravado)).toEqual({ lugares: gravado.lugares, linhas: [], rota: null, gente: {} });
  });
  it('a cidade automática gravada (p: 1, sem ficha) não volta; a ligada a uma ficha fica', () => {
    const gravado = { lugares: [
      { id: 'c0', tipo: 'cidade', nome: 'Tória', x: 1, y: 2, p: 1 },
      { id: 'c1', tipo: 'cidade', nome: 'Abrasil', x: 3, y: 4, p: 1, ficha: 'abrasil' },
      { id: 'n1', tipo: 'cidade', nome: 'Igara', x: 5, y: 6, ficha: 'igara' },
    ] };
    expect(mapaNormalizar(gravado).lugares.map((l) => l.id)).toEqual(['c1', 'n1']);
  });
  it('as cidades cabem no mapa (1200 × 2000)', () => {
    Object.values(MAPA_PINTADAS).forEach(([x, y]) => {
      expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(1200);
      expect(y).toBeGreaterThan(0); expect(y).toBeLessThan(2000);
    });
  });
});

describe('quem grava o quê', () => {
  const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');
  const sql = readFileSync(join(aqui, '../../scripts/sql/mapa-da-mesa-2026-11-15.sql'), 'utf8');

  it('só o Mestre recebe o gravador do mapa; só o Jogador com personagem, o das marcas', () => {
    expect(fonte).toMatch(/aoMudarMesa: mestre \?/);
    expect(fonte).toMatch(/aoMudarMarcas: \(!mestre && pjId\) \?/);
  });
  it('o banco repete a regra: escrever em mapas_mesa exige ser o Mestre da história', () => {
    for (const p of ['mapas_mesa_insert_mestre', 'mapas_mesa_update_mestre', 'mapas_mesa_delete_mestre']) {
      const bloco = sql.slice(sql.indexOf('CREATE POLICY ' + p));
      expect(bloco.slice(0, bloco.indexOf(';'))).toMatch(/h\.mestre_id = \(SELECT auth\.uid\(\)\)/);
    }
    expect(sql).toMatch(/CREATE POLICY mapa_marcas_do_dono[\s\S]*?_menestrel_meus_pjs/);
  });
  it('o Jogador não lê a ficha dos colegas: nome e foto vêm pela RPC', () => {
    expect(fonte).toMatch(/rpc\('get_pjs_historia', \{ p_pj_id: pj\.id \}\)/);
  });
});

/* 15/11/2026, usuário: "não será criado uma 'nova cidade' clicando no mapa, a
   cidade será criada na aba cidades da ambientação." */
describe('cidade nova não nasce no mapa', () => {
  const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');

  it('a ferramenta Cidade só posiciona uma cadastrada, e o lugar guarda o id da ficha', () => {
    expect(fonte).not.toMatch(/Cidade nova/);
    expect(fonte).toMatch(/if \(!pondoCidade\) return;/);
    // Desde 15/11/2026 o mesmo vale para a ferramenta Local: o tipo do lugar é o da ferramenta.
    // Desde 21/11/2026 também a ferramenta Reino (CADASTRADOS).
    expect(fonte).toContain("if (CADASTRADOS.includes(modo)) {   // só posiciona um cadastrado");
    expect(fonte).toMatch(/tipo: modo, nome: pondoCidade\.nome, ficha: pondoCidade\.id/);
  });
  /* 15/11/2026, usuário: "A edição é apenas na página de cidade, etc." —
     cidade e local nunca têm campo no mapa, com ficha ou sem; só o ponto. */
  it('cidade e local não têm o nome editado no mapa; só o ponto', () => {
    expect(fonte).toMatch(/id = mestre && a\.tipo === 'ponto' \? campo\(rot\) : fixo\(rot\);/);
  });
});

/* 15/11/2026, usuário: "Quero uma opção de inserir locais no mapa, além de
   cidades." A ferramenta Local, irmã da Cidade, com os cadastrados na aba Locais. */
describe('os locais no mapa', () => {
  const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');
  it('Cidade e Local são do Imperador, dentro ou fora de mesa; o catálogo traz os locais', () => {
    expect(fonte).toContain("const doMundo = imperador ? ['reino', 'cidade', 'local'] : [];");
    expect(fonte).toMatch(/cfg\.semMesa \? \['medir', \.\.\.doMundo\] : \['medir', \.\.\.doMundo, 'ponto', 'caminho', 'rota'\]/);
    expect(fonte).toMatch(/sb\(\)\.rpc\('listar_catalogo_global', \{ p_tipo: 'local' \}\)/);
    expect(fonte).toMatch(/locais: entradas\.filter\(\(e\) => e && e\.tipo === 'local' && e\.nome\)/);
  });
  it('o local tem o seu sinal e abre a ficha dele', () => {
    expect(fonte).toContain("const ICONE_LUGAR = { cidade: 'ti-map-pin', capital: 'ti-flag', local: 'ti-map-pin', ponto: 'ti-star', reino: 'ti-crown' };");
    expect(fonte).toMatch(/if \(l && l\.tipo === 'local'\) return \(l\.ficha && fichasLocalId\.get\(String\(l\.ficha\)\)\) \|\| null;/);
  });
  // "Nos itens do mapa 'abrir a ficha, medir daqui, etc' deixe apenas o ícone."
  it('as ações do lugar em foco são só o ícone, com o nome no aria-label', () => {
    expect(fonte).toMatch(/class="mp-acao so-ico\$\{perigo \? ' perigo' : ''\}" data-acao="\$\{acao\}" aria-label="\$\{esc\(txt\)\}" data-dica="\$\{esc\(txt\)\}"><i class="ti \$\{ico\}" aria-hidden="true"><\/i><\/button>/);
  });
});

/* 15/11/2026, usuário: "No mapa, não estou conseguindo colocar os personagens
   dentro das cidades". Toda cidade virou botão (o sinal da casinha), e o toque
   que começava num botão era ignorado pelo gesto. Com ferramenta ligada, o
   marcador conta como toque no mapa — e o clique dele não reabre a ficha. */
describe('com ferramenta ligada, tocar na cidade é tocar no mapa', () => {
  const f = require('node:fs').readFileSync(require('node:path').resolve(__dirname, 'mapa.jsx'), 'utf8');
  it('o gesto não descarta o toque que começa num marcador', () => {
    expect(f).toMatch(/const noMarcador = !!modo && !!e\.target\.closest\('\.mp-marca, \.mp-pino'\);/);
    expect(f).toMatch(/if \(!pega && !noMarcador && e\.target\.closest\('button'\)\) return;/);
  });
  it('o clique no marcador não abre a ficha enquanto a ferramenta está ligada', () => {
    expect(f).toMatch(/if \(modo && b\.closest\('\.mp-marca, \.mp-pino'\) && !\$\('listas'\)\.contains\(b\)\) return;/);
  });
});

/* 15/11/2026, usuário: "Mas porque eu preciso entrar em uma mesa, se o
   ambientação é global?" As cidades e os locais do Imperador são do mundo
   (catalogo_mundo, tipo 'mapa'); a mesa guarda só o que é dela. */
describe('a camada do mundo', () => {
  const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');
  it('ao abrir, os lugares do mundo entram marcados; ao gravar, saem da mesa', () => {
    expect(fonte).toMatch(/const doMundo = mundo\.map\(\(l\) => \(\{ \.\.\.l, mundo: true \}\)\);/);
    expect(fonte).toMatch(/cfg\.aoMudarMesa\(JSON\.parse\(JSON\.stringify\(\{ \.\.\.mesa, lugares: mesa\.lugares\.filter\(\(l\) => !l\.mundo\) \}\)\)\)/);
    expect(fonte).toMatch(/if \(imperador && cfg\.aoMudarMundo\)/);
  });
  it('o lugar posto pelo Imperador é do mundo; o do mundo, os outros não movem', () => {
    expect(fonte).toMatch(/\.\.\.p, \.\.\.\(imperador \? \{ mundo: true \} : \{\}\) \};/);
    expect(fonte).toMatch(/if \(foco\.tipo === 'lugar'\) return \(a\.mundo && !imperador\) \? null/);
  });
  it('fora de mesa, o Imperador abre o mapa com as ferramentas, e grava no catálogo do mundo', () => {
    expect(fonte).toMatch(/papel: ehImperador \? 'mestre' : 'jogador', semMesa: true/);
    // 17/11/2026: cada plano tem a sua camada do mundo ('mundo', 'mundo-celestial', 'mundo-infernal').
    expect(fonte).toMatch(/window\.salvarNoMundo\('mapa', \{ slug: mapaSlugMundo\(p\), lugares: l \}\)/);
  });
  it('o banco aceita o tipo mapa no catálogo do mundo', () => {
    const sql = readFileSync(join(aqui, '../../scripts/sql/mapa-do-mundo-2026-11-15.sql'), 'utf8');
    expect(sql).toMatch(/ARRAY\['entidade'::text, 'grupo'::text, 'mapa'::text\]/);
  });
});

/* SÓ O QUE O PERSONAGEM CONHECE (17/11/2026): para o Jogador, cidade e local
   sem ficha no catálogo dele não têm marcador, nome, toque nem busca. */
describe('o jogador só vê cidades e locais que conhece', () => {
  const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');
  it('a regra cobre cidade e local, e só vale fora do Mestre', () => {
    expect(fonte).toContain('const oculto = (l) => naNevoa(l) || (!mestre && CADASTRADOS.includes(l.tipo)');
    expect(fonte).toContain("const CADASTRADOS = ['cidade', 'local', 'reino'];");
  });
  it('o marcador, o toque (perto) e a busca pulam o oculto', () => {
    expect(fonte).toMatch(/mesa\.lugares\.forEach\(\(l\) => \{\s*if \(oculto\(l\)\) return;/);
    expect(fonte).toMatch(/for \(const l of mesa\.lugares\) \{ if \(oculto\(l\)\) continue;/);
    expect(fonte).toMatch(/mesa\.lugares\.filter\(\(l\) => !oculto\(l\)\)\.map\(\(l\) => \[semAcento\(l\.nome\), l\]\)/);
  });
});

/* A NÉVOA (17/11/2026): o Jogador numa mesa só enxerga 100 km em volta do
   personagem; o Mestre e o mapa fora de mesa, tudo. */
describe('a névoa do jogador', () => {
  const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');
  it('100 km, só para o Jogador numa mesa', () => {
    expect(fonte).toMatch(/const MAPA_NEVOA_KM = 100;/);
    expect(fonte).toMatch(/const comNevoa = !mestre && !cfg\.semMesa;/);
    expect(fonte).toMatch(/const raioNevoa = MAPA_NEVOA_KM \/ MAPA_KM;/);
  });
  it('sem posição no mapa, não enxerga nada; fora do raio some', () => {
    expect(fonte).toMatch(/return !eu \|\| dist\(eu, p\) > raioNevoa;/);
  });
  it('os outros personagens fora do raio não aparecem', () => {
    expect(fonte).toMatch(/postos\(\)\.filter\(\(g\) => g\.eu \|\| !naNevoa\(g\)\)/);
  });
  it('a camada da névoa fica entre as linhas e os marcadores', () => {
    expect(fonte).toMatch(/data-el="linhas"[^\n]*\r?\n\s*<svg className="mp-nevoa" data-el="nevoa"/);
  });
});

/* OS PLANOS (17/11/2026): material, celestial e infernal. O Jogador vê só o
   plano em que o personagem está; cada personagem fica num plano só. */
describe('os planos do mapa', () => {
  it('o plano material é a raiz; os outros moram em planos[plano] e nascem vazios', () => {
    const dados = { lugares: [{ id: 'a' }], linhas: [], rota: null, gente: { 1: { x: 1, y: 1 } }, planos: { celestial: { lugares: [{ id: 'c' }], linhas: [], rota: null, gente: {} } } };
    expect(window.mapaDoPlano(dados, 'material').planos).toBeUndefined();
    expect(window.mapaDoPlano(dados, 'material').lugares).toEqual([{ id: 'a' }]);
    expect(window.mapaDoPlano(dados, 'celestial').lugares).toEqual([{ id: 'c' }]);
    expect(window.mapaDoPlano(dados, 'infernal').lugares).toEqual([]);
    expect(window.mapaNormalizar(null, 'infernal').lugares).toEqual([]);
    expect(window.mapaNormalizar(null).lugares).toEqual([]);   // sem semente desde 21/11/2026
  });
  it('pôr o personagem num plano o tira dos outros', () => {
    const dados = { lugares: [], linhas: [], rota: null, gente: { 7: { x: 1, y: 1 }, 8: { x: 2, y: 2 } } };
    const novo = window.mapaComPlano(dados, 'infernal', { lugares: [], linhas: [], rota: null, gente: { 7: { x: 5, y: 5 } } });
    expect(novo.gente).toEqual({ 8: { x: 2, y: 2 } });
    expect(novo.planos.infernal.gente).toEqual({ 7: { x: 5, y: 5 } });
    const volta = window.mapaComPlano(novo, 'material', { ...window.mapaDoPlano(novo, 'material'), gente: { 7: { x: 9, y: 9 }, 8: { x: 2, y: 2 } } });
    expect(volta.planos.infernal.gente).toEqual({});
    expect(volta.gente[7]).toEqual({ x: 9, y: 9 });
  });
  it('o plano do personagem é onde ele tem posição; sem posição, o material', () => {
    const dados = { gente: { 1: { x: 0, y: 0 } }, planos: { celestial: { gente: { 2: { x: 0, y: 0 } } } } };
    expect(window.mapaPlanoDe(dados, 1)).toBe('material');
    expect(window.mapaPlanoDe(dados, 2)).toBe('celestial');
    expect(window.mapaPlanoDe(dados, 3)).toBe('material');
    expect(window.mapaPlanoDe(null, 2)).toBe('material');
  });
  it('só quem conduz troca o plano; o Jogador segue o personagem', () => {
    const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');
    expect(fonte).toContain('const podeTrocarPlano = mestre || (semMesa && ehImperador);');
    expect(fonte).toContain('if (!mestre) { const p = mapaPlanoDe(dadosTodos, pjId); if (p !== plano) { setPlano(p); return; } }');
    // O Mestre leva o personagem para outro plano: o mapa do Jogador vai junto.
    expect(fonte).toContain('if (!mestre) { const p = mapaPlanoDe(dados, pjId); if (p !== plano) { setPlano(p); return; } }');
  });
  it('fora do material não há pintura; no material, o mapa vetorial', () => {
    const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');
    expect(fonte).toContain("const baseDoPlano = plano === 'material' ? (base || MAPA_PINTURA) : null;");
    expect(window.MAPA_PINTURA).toBe('/mapa/tagmar.svg');
  });
  /* 21/11/2026, usuário: "Não precisamos mais dos botões 'mapa antigo' e 'mapa novo'". */
  it('não há mais escolha de pintura', () => {
    const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');
    expect(fonte).not.toMatch(/MAPA_PINTURAS|mp-pinturas|mapaPinturaGuardada/);
  });
  it('as unidades do mapa são o viewBox do SVG do chão', () => {
    const svg = readFileSync(join(aqui, '../../public/mapa/tagmar.svg'), 'utf8').slice(0, 300);
    expect(svg).toContain(`viewBox="0 0 ${window.MAPA_L} ${window.MAPA_A}"`);
  });
});
