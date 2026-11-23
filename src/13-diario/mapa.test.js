/* ============================================================
   mapa.test.js — as contas e o contrato de dados do Mapa (15/11/2026)
   ============================================================
   Usuário: "os jogadores vão acompanhar onde seu personagem está, onde devem
   ir, sabendo distâncias". O que o Jogador lê na tela sai destas funções: a
   régua (km), o comprimento de um traçado e a largura do caminho na tela.

   O motor (criarMotorMapa) desenha no DOM com ponteiro, zoom e o SVG do chão — é
   conferido no navegador pela prévia (/preview/?tela=mapa), não aqui.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import './mapa.jsx';

const aqui = dirname(fileURLToPath(import.meta.url));
const { mapaKm, mapaComprimento, mapaProjeta, mapaCaminhoNaTela, mapaSemente, mapaNormalizar, MAPA_KM, MAPA_PINTADAS } = window;

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

/* 21/11/2026, usuário: "Eu quero que exista apenas rota, e ela é global", e
   depois: "Existe a estrada fixa, e existe a rota [...] o caminho, antes de
   definir a rota, precisa existir". O que se traça é o caminho (a estrada),
   do mundo, no jeito da estrada do Google Maps: fino, e de longe some. */
describe('os caminhos', () => {
  const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');
  const css = readFileSync(join(aqui, 'mapa.css'), 'utf8');
  it('de perto é largo; de longe afina e some', () => {
    const perto = mapaCaminhoNaTela(0.05), meio = mapaCaminhoNaTela(0.5), longe = mapaCaminhoNaTela(4);
    expect(perto.largura).toBeGreaterThan(meio.largura);
    expect(perto.opacidade).toBe(1);
    expect(meio.opacidade).toBe(1);
    expect(longe.opacidade).toBe(0);
    expect(mapaCaminhoNaTela(0.001).largura).toBe(5);
    expect(mapaCaminhoNaTela(100).largura).toBe(1.2);
  });
  it('o ponto mais perto do caminho é o que o toque acha', () => {
    const p = mapaProjeta({ x: 4, y: 3 }, [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]);
    expect(p.q).toEqual({ x: 4, y: 0 });
    expect(p.i).toBe(0);
  });
  it('o caminho mora na camada do mundo; a mesa não guarda caminho nem rota', () => {
    expect(fonte).not.toContain('mapaJornada');
    expect(fonte).not.toContain('mesa.rota');
    expect(fonte).toContain("mesa.linhas = rotas.map((l) => ({ ...l, tipo: 'caminho'");
    expect(fonte).toContain('linhas: [], rota: null })));');
    expect(fonte).toContain("window.salvarNoMundo('mapa', { slug: mapaSlugMundo(p), lugares: d.lugares, linhas: d.linhas })");
  });
  it('os caminhos se ligam: o ponto gruda em outro caminho e o ponto dividido anda junto', () => {
    expect(fonte).toContain('const pontoDoCaminho = (p, l, menos) => verticeDeCaminho(p, menos) || (l ? { x: l.x, y: l.y } : null) || trechoDeCaminho(p, menos) || p;');
    expect(fonte).toContain('m.ln.pts.splice(m.i + 1, 0, m.q);');
    expect(fonte).toContain("if (m) return { ...m, ligados: ligadosA(a, m.i) };");
    expect(fonte).toContain('(g.ligados || []).forEach(({ ln, i }) => { ln.pts[i] = { x: q.x, y: q.y }; });');
  });
  it('só o Imperador traça e edita', () => {
    expect(fonte).toContain("...(cfg.aoMudarMundo ? ['caminho'] : [])");
    expect(fonte).toContain("if (foco.tipo !== 'linha' || !imperador) return null;");
    expect(fonte).toContain("if (imperador && !modo && foco.tipo === 'linha' && a) {");
  });
  it('é a estrada do Google: miolo branco, borda cinza, e o miolo zera de longe', () => {
    expect(fonte).toContain("elMundo.style.setProperty('--rota-w', rotaTela.largura + 'px');");
    expect(css).toMatch(/\.mp-cam-borda \{ stroke: #A3ACB9; stroke-opacity: var\(--rota-o, 1\)/);
    expect(css).toMatch(/\.mp-cam \{ stroke: #FFFFFF; stroke-opacity: var\(--rota-o, 1\); stroke-width: calc\(\(var\(--rota-w, 4px\) - 1\.5px\) \/ var\(--s, 1\)\)/);
  });
});

/* 21/11/2026, usuário: "Vamos criar uma forma de encontrar a rota para
   determinada origem e destino". A rota anda pelos caminhos. */
describe('a rota de origem a destino', () => {
  const { mapaRotaPelosCaminhos } = window;
  // Um T: a estrada de cima (0,0)-(20,0) e a que desce do meio (10,0)-(10,20).
  const cima = { id: 'a', pts: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }] };
  const desce = { id: 'b', pts: [{ x: 10, y: 0 }, { x: 10, y: 20 }] };
  it('passa de um caminho ao outro pelo ponto que eles dividem', () => {
    const r = mapaRotaPelosCaminhos([cima, desce], { x: 0, y: 0 }, { x: 10, y: 20 });
    expect(r.naEstrada).toBe(30);
    expect(r.foraDaEstrada).toBe(0);
    expect(r.estrada).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 20 }]);
  });
  it('fora da estrada, entra pelo ponto mais perto e conta o trecho a pé', () => {
    const r = mapaRotaPelosCaminhos([cima, desce], { x: 2, y: -3 }, { x: 13, y: 15 });
    expect(r.estrada[0]).toEqual({ x: 2, y: 0 });
    expect(r.estrada[r.estrada.length - 1]).toEqual({ x: 10, y: 15 });
    expect(r.naEstrada).toBe(23);
    expect(r.foraDaEstrada).toBe(6);
  });
  it('as duas pontas no mesmo trecho vão direto', () => {
    const r = mapaRotaPelosCaminhos([desce], { x: 10, y: 2 }, { x: 10, y: 8 });
    expect(r.naEstrada).toBe(6);
  });
  it('escolhe o menor dos trajetos', () => {
    const volta = { id: 'c', pts: [{ x: 0, y: 0 }, { x: 0, y: 50 }, { x: 20, y: 50 }, { x: 20, y: 0 }] };
    const r = mapaRotaPelosCaminhos([cima, volta], { x: 0, y: 0 }, { x: 20, y: 0 });
    expect(r.naEstrada).toBe(20);
  });
  it('sem nada ligando as pontas, avisa; sem caminhos, não há rota', () => {
    const solto = { id: 'd', pts: [{ x: 100, y: 100 }, { x: 120, y: 100 }] };
    // sem caminho contínuo: a rota sugerida liga os pedaços por fora da estrada
    const r = mapaRotaPelosCaminhos([cima, solto], { x: 0, y: 0 }, { x: 120, y: 100 });
    expect(r.sugerida).toBe(true);
    expect(r.foraDaEstrada).toBeGreaterThan(0);
    expect(r.partes.some((p) => p.fora)).toBe(true);
    expect(r.partes.some((p) => !p.fora)).toBe(true);
    // sem caminho nenhum, a sugestão é a linha reta
    const reta = mapaRotaPelosCaminhos([], { x: 0, y: 0 }, { x: 3, y: 4 });
    expect(reta).toMatchObject({ sugerida: true, naEstrada: 0, foraDaEstrada: 5 });
  });
  it('dois caminhos que se cruzam sem ponto em comum se ligam no cruzamento', () => {
    const h = { id: 'h', pts: [{ x: 0, y: 10 }, { x: 40, y: 10 }] };
    const v = { id: 'v', pts: [{ x: 20, y: 0 }, { x: 20, y: 40 }] };
    const r = mapaRotaPelosCaminhos([h, v], { x: 0, y: 10 }, { x: 20, y: 40 });
    expect(r.naEstrada).toBeCloseTo(50, 6);
    expect(r.estrada).toContainEqual({ x: 20, y: 10 });
  });
  it('o caminho que dá a volta e termina colado nele mesmo se emenda (o Caminho 4)', () => {
    // sobe de (0,0) a (0,100), vai a (100,100), desce a (100,0) e volta até (1,0): a ponta fica a 1 do início
    const volta = { id: 'v', pts: [{ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 }, { x: 100, y: 0 }, { x: 1, y: 0 }] };
    const r = mapaRotaPelosCaminhos([volta], { x: 0, y: 50 }, { x: 50, y: 0 });
    expect(r.naEstrada).toBeCloseTo(50 + 1 + 49, 6);
  });
  it('o caminho que se cruza a si mesmo vira junção no cruzamento', () => {
    const laco = { id: 'l', pts: [{ x: 0, y: 50 }, { x: 100, y: 50 }, { x: 100, y: 100 }, { x: 50, y: 100 }, { x: 50, y: 0 }] };
    const r = mapaRotaPelosCaminhos([laco], { x: 0, y: 50 }, { x: 50, y: 0 });
    expect(r.naEstrada).toBeCloseTo(100, 6);
  });
  it('a ponta que para perto de outro caminho se emenda; longe, não', () => {
    const h = { id: 'h', pts: [{ x: 0, y: 10 }, { x: 40, y: 10 }] };
    const quase = { id: 'q', pts: [{ x: 20, y: 11.5 }, { x: 20, y: 40 }] };
    const r = mapaRotaPelosCaminhos([h, quase], { x: 0, y: 10 }, { x: 20, y: 40 });
    expect(r.naEstrada).toBeCloseTo(20 + 1.5 + 28.5, 6);
    const longe = { id: 'l', pts: [{ x: 20, y: 15 }, { x: 20, y: 40 }] };
    expect(mapaRotaPelosCaminhos([h, longe], { x: 0, y: 10 }, { x: 20, y: 40 }).sugerida).toBe(true);
  });
  it('a cidade entra por todos os caminhos perto dela, não só pelo mais perto (Saravossa)', () => {
    // a cidade C fica na ponta de "volta" e a 4,8 de "reto"; "volta" só encontra "reto" muito longe
    const reto = { id: 'r', pts: [{ x: 0, y: 0 }, { x: 100, y: 0 }] };
    const volta = { id: 'v', pts: [{ x: 10, y: 4.8 }, { x: 10, y: 200 }, { x: 100, y: 200 }, { x: 100, y: 0 }] };
    const C = { x: 10, y: 4.8 }, S = { x: 60, y: 0 };
    const r = mapaRotaPelosCaminhos([reto, volta], C, S, 9);
    expect(r.naEstrada).toBeCloseTo(50, 6);
    expect(r.foraDaEstrada).toBeCloseTo(4.8, 6);
  });
  it('a estrada que termina numa cidade continua pelas que saem dela', () => {
    const chega = { id: 'c', pts: [{ x: 0, y: 0 }, { x: 50, y: 0 }] };
    const sai = { id: 's', pts: [{ x: 50, y: 5 }, { x: 50, y: 60 }] };
    const cidade = { x: 50, y: 2.5 };
    expect(mapaRotaPelosCaminhos([chega, sai], { x: 0, y: 0 }, { x: 50, y: 60 }, 9).sugerida).toBe(true);
    const r = mapaRotaPelosCaminhos([chega, sai], { x: 0, y: 0 }, { x: 50, y: 60 }, 9, 2, [cidade]);
    expect(r.naEstrada + r.foraDaEstrada).toBeCloseTo(50 + 2.5 + 2.5 + 55, 6);
  });
  it('a rota sugerida prefere a estrada: só corta por fora onde falta caminho', () => {
    // dois caminhos em fila com um buraco de 10 no meio; a reta de ponta a ponta é 100
    const c1 = { id: '1', pts: [{ x: 0, y: 0 }, { x: 45, y: 0 }] }, c2 = { id: '2', pts: [{ x: 55, y: 0 }, { x: 100, y: 0 }] };
    const r = mapaRotaPelosCaminhos([c1, c2], { x: 0, y: 0 }, { x: 100, y: 0 });
    expect(r.sugerida).toBe(true);
    expect(r.naEstrada).toBeCloseTo(90, 6);
    expect(r.foraDaEstrada).toBeCloseTo(10, 6);
  });
  it('lugar longe de qualquer caminho: a rota sugerida avisa qual ponta está solta', () => {
    expect(mapaRotaPelosCaminhos([cima, desce], { x: 0, y: -30 }, { x: 10, y: 20 }, 9)).toMatchObject({ sugerida: true, longe: 'a' });
    expect(mapaRotaPelosCaminhos([cima, desce], { x: 0, y: -5 }, { x: 10, y: 20 }, 9).naEstrada).toBe(30);
  });
  it('a ferramenta Rota é de todos; Medir e Ponto saíram', () => {
    const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');
    expect(fonte).toContain("const quais = mestre ? ['rota', ...doMundo] : (cfg.aoMudarMarcas ? ['rota', 'marcar'] : ['rota']);");
    expect(fonte).not.toMatch(/medir: \['ti-ruler-2'/);
    expect(fonte).not.toMatch(/ponto: \['ti-star'/);
  });
  it('mostra a pé e a cavalo pela estrada, e voando em linha reta', () => {
    const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');
    expect(window.MAPA_KM_DIA_A_CAVALO).toBe(60);
    expect(window.MAPA_KM_DIA_VOANDO).toBe(120);
    expect(fonte).toContain("modo(tr('Caminhando', 'Walking'), k, diasDe(R, MAPA_KM_DIA_A_PE)) + modo(tr('Cavalgando', 'Riding'), k, diasDe(R, MAPA_KM_DIA_A_CAVALO)) + modo(tr('Voando', 'Flying'), voo, voo / MAPA_KM_DIA_VOANDO)");
  });
  it('navegando: contorna a terra pela água; sem água perto ou sem ligação, não há', () => {
    const { mapaNavegacao } = window;
    // 7×5 células de 10: uma parede de terra na coluna 3, com passagem só na última linha
    const nx = 7, ny = 5, celulas = new Uint8Array(nx * ny).fill(1);
    for (let jj = 0; jj < 4; jj++) celulas[jj * nx + 3] = 0;
    const agua = { cel: 10, nx, ny, celulas };
    const r = mapaNavegacao(agua, { x: 15, y: 5 }, { x: 55, y: 5 });
    expect(r.comprimento).toBeGreaterThan(40 + 2 * 30);      // dá a volta pela passagem de baixo
    expect(r.pts.some((p) => p.y > 40)).toBe(true);
    celulas[4 * nx + 3] = 0;                                  // fecha a passagem
    expect(mapaNavegacao(agua, { x: 15, y: 5 }, { x: 55, y: 5 })).toBeNull();
    expect(mapaNavegacao(null, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull();
  });
  it('o card tem a linha Navegando', () => {
    const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');
    expect(window.MAPA_KM_DIA_NAVEGANDO).toBe(100);
    expect(fonte).toContain("modo(tr('Navegando', 'Sailing'), km(mar.comprimento), km(mar.comprimento) / MAPA_KM_DIA_NAVEGANDO)");
    expect(readFileSync(join(aqui, '../../public/mapa/agua.json'), 'utf8')).toContain('"bits"');
  });
  it('estrada primeiro: vai até a estrada próxima mesmo dando volta', () => {
    const { mapaSugestoesDeRota } = window;
    // a estrada sobe e desce (40 + 100 + 40 = 180); a reta de ponta a ponta é 100: menos de 3×, então vai pela estrada
    const volta = { id: 'v', pts: [{ x: 0, y: 0 }, { x: 0, y: -40 }, { x: 100, y: -40 }, { x: 100, y: 0 }] };
    const r = mapaSugestoesDeRota([volta], { x: 0, y: 0 }, { x: 100, y: 0 })[0];
    expect(r.naEstrada).toBeCloseTo(180, 6);
    expect(r.foraDaEstrada).toBe(0);
  });
  it('dá estrada e barco quando o lago encurta a viagem, e uma alternativa por terra', () => {
    const { mapaSugestoesDeRota } = window;
    // água numa faixa no meio (colunas 4 a 15, linhas 0 a 9, células de 10); a estrada contorna por baixo
    const nx = 20, ny = 20, celulas = new Uint8Array(nx * ny);
    for (let jj = 0; jj < 10; jj++) for (let i = 4; i < 16; i++) celulas[jj * nx + i] = 1;
    const agua = { cel: 10, nx, ny, celulas };
    const A = { x: 35, y: 50 }, B = { x: 165, y: 50 };
    const contorno = { id: 'c', pts: [A, { x: 35, y: 180 }, { x: 165, y: 180 }, B] };
    const atalho = { id: 'a', pts: [A, { x: 100, y: 120 }, B] };
    const lista = mapaSugestoesDeRota([contorno, atalho], A, B, { perto: 9, agua, cidades: [] });
    expect(lista.length).toBeGreaterThanOrEqual(2);
    expect(lista[0].tipo).toBe('estrada');
    const barco = lista.find((s) => s.tipo === 'barco');
    expect(barco.naAgua).toBeGreaterThan(0);
    expect(barco.partes.some((p) => p.modo === 'agua')).toBe(true);
    const alt = lista.find((s) => s.tipo === 'alternativa');
    expect(alt).toBeTruthy();
    expect(alt.naEstrada).not.toBeCloseTo(lista[0].naEstrada, 1);
  });
  it('com paradas, a rota passa por elas na ordem e soma os trechos', () => {
    const { mapaItinerario } = window;
    const reta = { id: 'r', pts: [{ x: 0, y: 0 }, { x: 100, y: 0 }] }, sobe = { id: 's', pts: [{ x: 50, y: 0 }, { x: 50, y: 60 }] };
    const [s] = mapaItinerario([reta, sobe], [{ x: 0, y: 0 }, { x: 50, y: 60 }, { x: 100, y: 0 }]);
    expect(s.tipo).toBe('paradas');
    expect(s.naEstrada).toBeCloseTo(50 + 60 + 60 + 50, 6);   // vai à parada e volta à estrada
    const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');
    expect(fonte).toContain("bt('rota-parada', 'ti-map-pin-plus', tr('Passar por um lugar', 'Pass through a place'))");
    expect(fonte).toContain('data-acao="rota-tira-parada"');
  });
  /* 22/11/2026, usuário: "O botão 'Nomes' não vai existir mais, eu quero que ao
     clicar em Local, Cidade, Reino, eu já tenha a opção de criar ali uma entrada
     com o texto personalizado". */
  it('Local, Cidade e Reino criam entrada nova; o local escolhe se aparece como pino ou texto', () => {
    const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');
    expect(fonte).toContain("['entrada-nova', ROT_NOVO[modo]]");
    expect(fonte).toContain("const ficha = daLista || (cadDoTipo(tipo) || []).find((e) => semAcento(e.nome) === semAcento(nome));");
    expect(fonte).toContain("const comoTexto = tipo === 'local' && geo !== 'pino';");
    expect(fonte).toContain("opcao('entrada-tipo', 'pino', !ehTexto,");
    expect(fonte).toContain("if (!daLista && tipo === 'cidade' && !novaEntrada.reino)");
    expect(fonte).toContain("p_tipo: tipo, p_nome: nome");
    // o criarEntrada usa o banco: declarado antes dele, a tela do mapa quebrava inteira (22/11/2026)
    expect(fonte.indexOf('const criarEntrada = React.useCallback')).toBeGreaterThan(fonte.indexOf('const banco = React.useMemo'));
  });
  it('o clique no cartão não é toque no mapa; o cadastrado abre o cartão com o texto editável', () => {
    const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');
    expect(fonte).toContain("if (e.target.closest && e.target.closest('.mp-aviso, input, select, textarea, label')) return;");
    expect(fonte).toContain("novaEntrada = fc ? { tipo: modo, ficha: { id: fc.id, nome: fc.nome }, nome: fc.nome, geo: 'pino', reino: '' } : null;");
    expect(fonte).toContain("...(comoTexto ? { estilo: { geo, imp: 2, ...(texto ? { texto } : {}) } } : texto ? { rotulo: texto } : {})");
    expect(fonte).toContain('<span class="mp-etiqueta">${esc(l.rotulo || l.nome)}</span>');
  });
  it('sem a ferramenta Nomes: os textos se editam na ferramenta Local', () => {
    const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');
    expect(fonte).not.toContain("['nomes']");
    expect(fonte).toContain("const ehTextos = () => modo === 'local' && podeNomes;");
    expect(fonte).toContain("tr('Tirar do mapa', 'Remove from map')");
    expect(fonte).toContain("tr('O que aparece escrito', 'What it says')");
  });
  it('a sugestão pelo lago só entra se for competitiva (até 30% mais lenta que a melhor)', () => {
    const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');
    expect(fonte).toContain('barcos.filter((s) => !s.via || tempo(s) <= melhor * 1.3)');
  });
  it('o card lista as sugestões e deixa escolher', () => {
    const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');
    expect(fonte).toContain('data-acao="rota-escolha" data-i="${i}"');
    expect(fonte).toContain("tr('Estrada e barco', 'Road and boat')");
    expect(fonte).toContain("tr('Alternativa por terra', 'Alternative by land')");
    expect(window.MAPA_FORA).toBe(3);
  });
  it('escolhe primeiro o destino, depois a origem, numa lista com busca', () => {
    const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');
    expect(fonte).toContain("if (!rotaAtual) { rotaAtual = { destino: ponto }; aviso(); desenhar(); return; }");
    expect(fonte).toContain('data-acao="rota-lugar"');
    expect(fonte).toContain("rotaAtual.sugestoes = paradas.length ? mapaItinerario(mesa.linhas, [rotaAtual.origem, ...paradas, rotaAtual.destino], op)");
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
    expect(fonte).toContain("const doMundo = imperador ? ['reino', 'cidade', 'local', ...(cfg.aoMudarMundo ? ['caminho'] : [])] : [];");
    expect(fonte).toContain("const quais = mestre ? ['rota', ...doMundo] :");
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
    expect(fonte).toMatch(/cfg\.aoMudarMesa\(JSON\.parse\(JSON\.stringify\(\{ \.\.\.mesa, lugares: mesa\.lugares\.filter\(\(l\) => !l\.mundo\), linhas: \[\], rota: null \}\)\)\)/);
    expect(fonte).toMatch(/if \(imperador && cfg\.aoMudarMundo\)/);
  });
  it('o lugar posto pelo Imperador é do mundo; o do mundo, os outros não movem', () => {
    expect(fonte).toMatch(/\.\.\.p, \.\.\.\(imperador \? \{ mundo: true \} : \{\}\) \};/);
    expect(fonte).toMatch(/if \(foco\.tipo === 'lugar'\) return \(a\.mundo && !imperador\) \? null/);
  });
  it('fora de mesa, o Imperador abre o mapa com as ferramentas, e grava no catálogo do mundo', () => {
    expect(fonte).toMatch(/papel: ehImperador \? 'mestre' : 'jogador', semMesa: true/);
    // 17/11/2026: cada plano tem a sua camada do mundo ('mundo', 'mundo-celestial', 'mundo-infernal').
    expect(fonte).toMatch(/window\.salvarNoMundo\('mapa', \{ slug: mapaSlugMundo\(p\), lugares: d\.lugares, linhas: d\.linhas \}\)/);
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
  it('"Você está em" mostra o reino e a cidade mais próxima que o personagem enxerga', () => {
    expect(fonte).toContain("nums = cel(tr('Reino', 'Kingdom'), reino ? esc(reino) : '—')");
    expect(fonte).toContain("mesa.lugares.filter((l) => l.tipo === 'cidade' && !oculto(l) && dist(l, p) >= MAPA_PERTO)");
  });
  it('o Jogador não vê a lista da comitiva', () => {
    expect(fonte).toContain("if (!cfg.semMesa && mestre) h += quadro(tr('Comitiva', 'Party'),");
  });
  it('o véu é transparente, mas fora do raio nenhum nome aparece', () => {
    const css = readFileSync(join(aqui, 'mapa.css'), 'utf8');
    expect(css).toMatch(/\.mp-nevoa-veu \{ fill: #17110A; opacity: \.6; \}/);
    expect(fonte).toContain('const oculto = (l) => naNevoa(l) ||');
    expect(fonte).toContain('geo = mesa.lugares.filter((l) => ehTexto(l) && !oculto(l)).map(geoDe);');
    expect(readFileSync(join(aqui, '../../public/mapa/tagmar.svg'), 'utf8')).not.toContain('<text');
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
  /* 23/11/2026: o infernal ganhou chão próprio, em escala real no meio da tela;
     o celestial continua sem pintura. */
  it('cada plano com o seu chão; o infernal abre no recorte do desenho', () => {
    const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');
    expect(fonte).toContain("const baseDoPlano = plano === 'material' ? (base || MAPA_PINTURA) : (MAPA_CHAO_PLANO[plano] || null);");
    expect(window.MAPA_PINTURA).toBe('/mapa/tagmar.svg');
    expect(window.MAPA_CHAO_PLANO).toEqual({ infernal: '/mapa/infernal.svg' });
    const [x0, y0, x1, y1] = window.MAPA_RECORTE.infernal;
    expect(x1 - x0).toBeCloseTo(window.MAPA_L / 2, 0);   // 1/4 da área: metade de cada lado
    expect(y1 - y0).toBeCloseTo(window.MAPA_A / 2, 0);
    expect(existsSync(join(aqui, '../../public/mapa/infernal.svg'))).toBe(true);
  });
  /* 23/11/2026, usuário: "o mapa do plano infernal está muito lento" e "No zoom máximo, ainda
     fica uma parte sem montanhas". */
  it('o chão infernal vai em ladrilhos, com o fundo inteiro por baixo, e cobre a janela', () => {
    const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');
    const lad = window.MAPA_LADRILHOS.infernal;
    for (let r = 0; r < lad.linhas; r++) for (let c = 0; c < lad.cols; c++) {
      const f = join(aqui, `../../public${lad.pasta}l${r}c${c}.svg`);
      expect(existsSync(f)).toBe(true);
      // o viewBox do ladrilho é o pedaço que o motor põe na tela
      const tw = window.MAPA_L / lad.cols, th = window.MAPA_A / lad.linhas, r2 = (v) => +v.toFixed(2);
      if (r === 3 && c === 4) expect(readFileSync(f, 'utf8').slice(0, 200)).toContain(`viewBox="${r2(c * tw - lad.sobra)} ${r2(r * th - lad.sobra)} ${r2(tw + 2 * lad.sobra)} ${r2(th + 2 * lad.sobra)}"`);
    }
    expect(existsSync(join(aqui, '../../public' + lad.fundo))).toBe(true);
    expect(fonte).toContain('sMin = lad ? Math.max(vw / L, vh / A) : Math.min(vw / L, vh / A);');
    expect((fonte.match(/ladrilhos: MAPA_LADRILHOS\[plano\] \|\| null/g) || []).length).toBe(2);
  });
  /* 23/11/2026, usuário: "As cidades, locais, reinos são compartilhadas entre
     plano material, celestial e infernal, ou seja, cadastrada em um plano, é definitivo." */
  it('a ficha posta num plano não se põe em outro', () => {
    const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');
    // a lista da ferramenta conta os lugares de todos os planos
    expect(fonte).toContain('[...mesa.lugares, ...alhures()].forEach((l) => { if (l.tipo !== tipo) return;');
    // os outros planos: a camada do mundo de cada um e o mapa da mesa neles
    expect(fonte).toContain('MAPA_PLANOS.filter((p) => p.id !== plano).forEach((p) => {');
    expect(fonte).toMatch(/outrosMesa\.current = MAPA_PLANOS\.filter\(\(p\) => p\.id !== plano\)\.flatMap/);
    // a entrada nova com o nome de uma ficha já posta não entra de novo
    expect(fonte).toContain('const ja = ficha && planoDaFicha(tipo, ficha.id, ficha.nome);');
    expect((fonte.match(/\balhures,/g) || []).length).toBeGreaterThanOrEqual(2);   // mesa e fora de mesa
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

/* A TELA CHEIA (21/11/2026, usuário: "O botão 'ver o mapa inteiro' vai fazer
   com que o mapa fique full-screen, ou seja, igual o campo de batalha"). */
describe('o mapa em tela cheia', () => {
  const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');
  const css = readFileSync(join(aqui, 'mapa.css'), 'utf8');
  it('o botão alterna a tela cheia e, ao entrar, enquadra o mapa inteiro', () => {
    expect(fonte).toContain("onClick={() => setCheia((c) => !c)}");
    expect(fonte).toContain("<div className={'pjs diario-pagina mp-pagina' + (cheia ? ' mp-cheia' : '')}>");
    expect(fonte).toContain('motor.current.inteiro()');
  });
  it('o Esc sai, mas antes desliga a ferramenta ligada', () => {
    expect(fonte).toContain("if (e.key === 'Escape' && modo) { trocarModo(modo); e.preventDefault(); }");
    expect(fonte).toContain("if (e.key === 'Escape' && !e.defaultPrevented) setCheia(false);");
  });
  it('como a batalha: a janela inteira, sem menu lateral nem trilho de abas', () => {
    expect(css).toContain('.mc-root:has(.mp-pagina.mp-cheia) .mc-sidebar { display: none; }');
    expect(css.replace(/\r?\n\s*/g, ' ')).toContain('.mp-pagina.mp-cheia { position: fixed; inset: 0;');
    expect(css).toContain('.mp-pagina.mp-cheia > .diario-pagina-barra { display: none; }');
  });
});

/* 21/11/2026, usuário: "Diminua um pouco a largura ao selecionar uma cidade, e
   onde está a comitiva". */
it('o painel do lado tem 240px, também em tela cheia', () => {
  const css = readFileSync(join(aqui, 'mapa.css'), 'utf8');
  expect(css).toContain('display: grid; grid-template-columns: 240px minmax(0, 1fr);');
  expect(css).toContain('position: absolute; left: 14px; top: 14px; z-index: 7; width: 240px;');
});

/* 21/11/2026, usuário: "Eu quero que os textos atuais virem locais" e depois
   "era pra manter o estilo de texto e a edição de texto". Os textos são locais
   do mundo com estilo; a ferramenta Nomes edita o próprio local. */
describe('os textos do mapa são locais', () => {
  const fonte = readFileSync(join(aqui, 'mapa.jsx'), 'utf8');
  const css = readFileSync(join(aqui, 'mapa.css'), 'utf8');
  it('a camada de texto vem dos locais com estilo, não de um arquivo', () => {
    expect(fonte).not.toContain('-rotulos.json');
    expect(fonte).toContain('const ehTexto = (l) => !!(l && l.estilo && l.estilo.geo);');
    expect(fonte).toContain('geo = mesa.lugares.filter((l) => ehTexto(l) && !oculto(l)).map(geoDe);');
  });
  it('o local com estilo não tem pino nem etiqueta; tocar no texto abre o local', () => {
    expect(fonte).toContain('if (texto) return;');
    expect(fonte).toContain('const l = era.face || maisPerto(p)');
  });
  it('a ferramenta Nomes é do Imperador e grava no local (camada do mundo)', () => {
    expect(fonte).toContain('const podeNomes = imperador && !!cfg.base && !!cfg.aoMudarMundo;');
    expect(fonte).toContain('const guardarGeo = () => guardarMesa();');
    expect(fonte).not.toContain('aoMudarGeografia');
  });
  it('tem Excluir (tira do mapa, com Desfazer), cor, negrito, itálico, maiúsculas, contorno e tamanho', () => {
    for (const k of ['geo-excluir', 'geo-cor', 'geo-negrito', 'geo-italico', 'geo-caixa', 'geo-contorno', 'geo-menor', 'geo-maior', 'geo-restaurar']) expect(fonte).toContain("'" + k + "'");
    expect(fonte).toContain("botoes(...(recado.antes ? [['desfazer', tr('Desfazer', 'Undo')]] : []), ['entrada-nova', ROT_NOVO[modo]])");
  });
  it('o texto escrito fica só no mapa; vazio volta ao nome da ficha', () => {
    expect(fonte).toContain('if (v && v !== l.nome) es.texto = v; else delete es.texto;');
  });
  it('o tamanho escala o texto sem brigar com o zoom', () => {
    expect(css).toContain('transform: scale(calc(var(--geo-tam, 1) / var(--s, 1)))');
  });
});
