/* ============================================================
   tecnica-aba.test.jsx — a aba Técnica do painel de Ação, de ponta a ponta
   ============================================================
   Renderiza o AcaoPanel de verdade e dirige a aba Técnica pelos cenários do
   roteiro de verificação da Fase 1 (docs/superpowers/plans/
   2026-09-09-tecnicas-efeitos-combate.md, seção "Verificação final").
   Promovido de driver descartável a teste de verdade na triagem da revisão
   final (item 12): cobre o que nenhum outro arquivo cobria — a aba inteira
   renderizada e clicada, não só as funções puras por trás dela.

   Cobre: a aba aparece e lista as técnicas do PJ com o texto do banco;
   bloqueio por arma (arco vs espada) e por armadura (L vs P); uso Único
   bloqueia a 2ª ativação e Intermitente não; multisseleção de aliados (Voz
   de Comando, teto 4) sem incluir o próprio ator; técnica de Fase 2 (sem
   entrada no registro) continua narrativa, sem quebrar, mas é bloqueada por
   equipamento (achado do driver original, comportamento novo mantido por
   decisão do usuário); modo 'total' não rola dado (I5) e o Aplicar decide
   sozinho; seletor de alvo próprio das técnicas de alvo único (C1); e a
   REGRA NOVA de ativação livre (0 PA, 1 por rodada). Molde copiado de
   apoio-tab.test.jsx.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../02-shell/dado-d20.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let AcaoPanel, M;
beforeAll(() => {
  AcaoPanel = window.AcaoPanel;
  M = window.MotorBatalha;
  expect(AcaoPanel).toBeDefined();
});
afterEach(cleanup);

const CATALOGO = {
  arco_curto: { slug: 'arco_curto', nome: 'Arco Curto', dano: 10,
    dano_l: 0, dano_m: 1, dano_p: 2, ajuste_atributo: 'AGI',
    grupo_armas: 'PL', alcance: 20 },
  espada_longa: { slug: 'espada_longa', nome: 'Espada Longa', dano: 15,
    dano_l: 0, dano_m: 1, dano_p: 3, ajuste_atributo: 'FOR',
    grupo_armas: 'CM', alcance: 0 },
};

// Cópias literais do banco de produção.
const TECNICAS = {
  mira: { key: 'mira', nome: 'Mira', custo: 2, uso: 'Intermitente',
    grupo_armas: 'PL, PM, PP', grupo_armaduras: 'Livre', ajuste: 'percepcao',
    efeito: 'Seu total de Mira é adicionado à sua coluna de ataque por 1 rodada.' },
  furia: { key: 'furia', nome: 'Fúria', custo: 2, uso: 'Único',
    grupo_armas: 'Livre', grupo_armaduras: 'Livre', ajuste: 'percepcao',
    efeito: 'Seu total de Fúria é adicionado à sua coluna de ataque, a sua energia heroica, a sua resistência física e a sua resistência mágica por 5 rodadas.' },
  posicionamento: { key: 'posicionamento', nome: 'Posicionamento', custo: 1, uso: 'Intermitente',
    grupo_armas: 'Livre', grupo_armaduras: 'L', ajuste: 'percepcao',
    efeito: 'Seu total de Posicionamento é subtraído do dano máximo do adversário por 3 rodadas.' },
  sangramento: { key: 'sangramento', nome: 'Sangramento', custo: 2, uso: 'Intermitente',
    grupo_armas: 'CL, CM, CP', grupo_armaduras: 'Livre', ajuste: 'percepcao',
    efeito: 'Um teste de Sangramento (Difícil) causa 1 de dano na energia física em 1 alvo por 5 rodadas.' },
  voz_de_comando: { key: 'voz_de_comando', nome: 'Voz de Comando', custo: 1, uso: 'Único',
    grupo_armas: 'Livre', grupo_armaduras: 'Livre', ajuste: 'percepcao',
    efeito: 'Seu total de Voz de Comando é adicionado à iniciativa de 4 alvos por 10 rodadas.' },
  golpe_duplo: { key: 'golpe_duplo', nome: 'Golpe Duplo', custo: 2, uso: 'Intermitente',
    grupo_armas: 'CP, EP', grupo_armaduras: 'L, M', ajuste: 'agilidade',
    efeito: 'Um teste de Golpe Duplo (Muito Difícil) permite atacar 1 alvo 2 vezes por 1 rodada.' },
};

const pjBase = {
  id: 7, nome: 'Arqueiro', raca: 'Humano', reino: 'Verrogar',
  profissao: 'Guerreiro', especializacao: 'Academia de Arqueiros',
  intelecto_base: 2, aura_base: 2, carisma_base: 0,
  forca_base: 2, fisico_base: 2, agilidade_base: 3, percepcao_base: 4,
  experiencia: 60, habilidades: {}, habilidades_bonus: {},
  tecnicas: { mira: 5, furia: 4, posicionamento: 3, sangramento: 3, voz_de_comando: 2, golpe_duplo: 3 },
  aprimoramentos: {}, caracterizacao: {}, grupos_armas: { PL: 2, CM: 1 },
  estado_atual: { bonusArmas: {}, condicoes: {} },
  inventario: { itens: [{ slug: 'arco_curto', slot: 'mao_d', equipado: true }] },
};

function ator(over = {}) {
  return {
    tipo: 'pj', ref_id: 7, inst_id: 'pj:7', nome: 'Arqueiro', ordem: 1,
    status: 'ativo', atual: true, vb: 20, pa_max: 2, pa_rest: 2,
    mov_rest: 5, moveu_na_rodada: false,
    ef: 30, ef_max: 30, eh: 20, eh_max: 20, ar: 5, ar_max: 5,
    karma: 0, karma_max: 0, rf: 8, rm: 6,
    defesa_sigla: 'L', defesa_valor: 12,
    status_temp: [], tecnicas_usadas: [], condicoes: {},
    ...over,
  };
}
const ALIADO = {
  tipo: 'pj', ref_id: 8, inst_id: 'pj:8', nome: 'Companheiro', ordem: 2,
  status: 'ativo', atual: false, vb: 15, pa_max: 1, pa_rest: 1,
  ef: 20, ef_max: 20, eh: 10, eh_max: 10, ar: 0, ar_max: 0,
  defesa_sigla: 'L', defesa_valor: 10, rf: 6, rm: 5,
  status_temp: [], tecnicas_usadas: [],
};
const INIMIGO = {
  tipo: 'criatura', ref_id: 'lobo', inst_id: 'criatura:lobo', nome: 'Lobisomem',
  ordem: 3, status: 'ativo', atual: false, vb: 18, pa_max: 1, pa_rest: 1,
  ef: 30, ef_max: 30, eh: 12, eh_max: 12, ar: 0, ar_max: 0,
  defesa_sigla: 'L', defesa_valor: 11, rf: 10, rm: 8,
  status_temp: [], tecnicas_usadas: [],
};

let ultimoPayload = null;
function montar(over = {}, pjOver = {}) {
  ultimoPayload = null;
  const a = ator(over);
  const pj = { ...pjBase, ...pjOver };
  return render(
    <div className="menestrel-ui">
      <AcaoPanel
        ator={a}
        participantes={[a, ALIADO, INIMIGO]}
        catalogos={{ pjById: { 7: pj }, catalogoBySlug: CATALOGO, magiasByKey: {}, tecnicasByKey: TECNICAS }}
        lang="pt"
        onAplicar={() => {}}
        onAplicarTeste={(p) => { ultimoPayload = p; }}
        onAplicarItem={() => {}} onAplicarApoio={() => {}} onCancel={() => {}}
        onRolagemPendenteChange={() => {}}
        rolagemSalva={null} onRolagemSalvaChange={() => {}}
      />
    </div>
  );
}

const btn = (re) => screen.getAllByRole('button').find(
  (b) => re.test(b.textContent) || re.test(b.getAttribute('aria-label') || '')
);
const abrirAbaTecnica = () => fireEvent.click(btn(/^Técnica$/));

// O projeto usa SelectPill (botão + <ul> de <li>), não <select> nativo.
// Abre cada pill até achar a que lista o nome pedido, e clica no item.
const escolherTecnica = (nome) => {
  const pills = Array.from(document.querySelectorAll('.select-pill-btn'));
  for (const pill of pills) {
    fireEvent.click(pill);
    const li = Array.from(document.querySelectorAll('.select-pill-drop li'))
      .find((el) => (el.textContent || '').trim() === nome);
    if (li) { fireEvent.click(li); return true; }
    fireEvent.click(pill);   // fecha e tenta a próxima
  }
  throw new Error(`SelectPill com a opção "${nome}" não encontrada`);
};
const btnRolar = () => document.querySelector('.dado-ov-trigger button');
const textoNaTela = (re) => !!Array.from(document.querySelectorAll('p, span, div'))
  .find((el) => re.test(el.textContent || ''));

describe('ROTEIRO 1 — a aba Técnica existe e lista as técnicas do PJ', () => {
  it('a aba aparece para quem tem técnicas', () => {
    montar();
    expect(btn(/^Técnica$/)).toBeTruthy();
  });

  it('as técnicas do PJ aparecem no seletor', () => {
    montar();
    abrirAbaTecnica();
    fireEvent.click(document.querySelector('.select-pill-btn'));
    const opcoes = Array.from(document.querySelectorAll('.select-pill-drop li'))
      .map((el) => (el.textContent || '').trim());
    expect(opcoes).toEqual(expect.arrayContaining(['Mira', 'Fúria', 'Posicionamento']));
  });

  it('o texto do efeito do banco é exibido', () => {
    montar();
    abrirAbaTecnica();
    escolherTecnica('Mira');
    expect(textoNaTela(/adicionado à sua coluna de ataque por 1 rodada/)).toBe(true);
  });
});

describe('ROTEIRO 2 — restrição por ARMA (arco vs espada)', () => {
  it('com ARCO equipado (PL), Mira NÃO está bloqueada', () => {
    montar();
    abrirAbaTecnica();
    escolherTecnica('Mira');
    expect(textoNaTela(/Exige arma do grupo/)).toBe(false);
  });

  it('com ESPADA equipada (CM), Mira aparece bloqueada por arma', () => {
    montar({}, { inventario: { itens: [{ slug: 'espada_longa', slot: 'mao_d', equipado: true }] } });
    abrirAbaTecnica();
    escolherTecnica('Mira');
    expect(textoNaTela(/Exige arma do grupo: PL, PM, PP/)).toBe(true);
  });

  it('Fúria (Livre) não é bloqueada por arma nenhuma', () => {
    montar({}, { inventario: { itens: [{ slug: 'espada_longa', slot: 'mao_d', equipado: true }] } });
    abrirAbaTecnica();
    escolherTecnica('Fúria');
    expect(textoNaTela(/Exige arma do grupo/)).toBe(false);
  });
});

describe('ROTEIRO 3 — restrição por ARMADURA', () => {
  it('com armadura LEVE, Posicionamento (exige L) passa', () => {
    montar({ defesa_sigla: 'L' });
    abrirAbaTecnica();
    escolherTecnica('Posicionamento');
    expect(textoNaTela(/Exige armadura do grupo/)).toBe(false);
  });

  it('com armadura PESADA, Posicionamento aparece bloqueado por armadura', () => {
    montar({ defesa_sigla: 'P' });
    abrirAbaTecnica();
    escolherTecnica('Posicionamento');
    expect(textoNaTela(/Exige armadura do grupo: L/)).toBe(true);
  });
});

describe('ROTEIRO 4 — uso Único bloqueia a segunda ativação', () => {
  it('Fúria livre quando ainda não usada', () => {
    montar();
    abrirAbaTecnica();
    escolherTecnica('Fúria');
    expect(textoNaTela(/Já usada nesta batalha/)).toBe(false);
  });

  it('Fúria bloqueada depois de gasta', () => {
    montar({ tecnicas_usadas: ['furia'] });
    abrirAbaTecnica();
    escolherTecnica('Fúria');
    expect(textoNaTela(/Já usada nesta batalha \(uso Único\)/)).toBe(true);
  });

  it('Mira (Intermitente) continua livre mesmo já usada', () => {
    montar({ tecnicas_usadas: ['mira'] });
    abrirAbaTecnica();
    escolherTecnica('Mira');
    expect(textoNaTela(/Já usada nesta batalha/)).toBe(false);
  });
});

describe('ROTEIRO 5 — multisseleção de aliados (Voz de Comando, teto 4)', () => {
  it('renderiza o contador de aliados e as caixas', () => {
    montar();
    abrirAbaTecnica();
    escolherTecnica('Voz de Comando');
    expect(textoNaTela(/Aliados \(0\/4\)/)).toBe(true);
    expect(document.querySelectorAll('input[type="checkbox"]').length).toBeGreaterThan(0);
  });

  it('marcar um aliado atualiza o contador', () => {
    montar();
    abrirAbaTecnica();
    escolherTecnica('Voz de Comando');
    fireEvent.click(document.querySelector('input[type="checkbox"]'));
    expect(textoNaTela(/Aliados \(1\/4\)/)).toBe(true);
  });

  it('trocar de técnica zera a seleção', () => {
    montar();
    abrirAbaTecnica();
    escolherTecnica('Voz de Comando');
    fireEvent.click(document.querySelector('input[type="checkbox"]'));
    expect(textoNaTela(/Aliados \(1\/4\)/)).toBe(true);
    escolherTecnica('Mira');
    escolherTecnica('Voz de Comando');
    expect(textoNaTela(/Aliados \(0\/4\)/)).toBe(true);
  });

  // item 11 (revisão final): Voz de Comando pode legitimamente mirar em
  // qualquer um (o texto do banco diz "4 alvos", sem separar aliado de
  // inimigo), mas o PRÓPRIO ATOR numa lista rotulada "Aliados" é confuso.
  it('o próprio ator NÃO aparece na lista de Aliados', () => {
    montar();
    abrirAbaTecnica();
    escolherTecnica('Voz de Comando');
    const labels = Array.from(document.querySelectorAll('.acao-aliado')).map((l) => l.textContent.trim());
    expect(labels).not.toContain('Arqueiro');   // nome do ator (ver fixture `ator()`)
    expect(labels.sort()).toEqual(['Companheiro', 'Lobisomem']);
  });
});

describe('ROTEIRO 6 — técnica de Fase 2 continua narrativa, sem quebrar', () => {
  it('Golpe Duplo (Fase 2, sem entrada no registro) não ganha multisseleção e mostra o texto do banco', () => {
    montar({}, { inventario: { itens: [{ slug: 'espada_longa', slot: 'mao_d', equipado: true }] } });
    abrirAbaTecnica();
    escolherTecnica('Golpe Duplo');
    expect(textoNaTela(/Aliados \(/)).toBe(false);
    expect(textoNaTela(/atacar 1 alvo 2 vezes por 1 rodada/)).toBe(true);
  });

  // ACHADO DO DRIVER — comportamento novo que ninguém decidiu.
  // Golpe Duplo é Fase 2: não tem entrada no registro, nada mecânico acontece,
  // o Mestre resolve na mão. Mas tecnicaPermitida lê grupo_armas direto do
  // banco, sem consultar o registro — então uma técnica NÃO IMPLEMENTADA passou
  // a ser bloqueada pelo equipamento, e o jogador nem consegue rolar o dado
  // dela. Antes desta feature, qualquer técnica podia ser rolada.
  it('DOCUMENTA: técnica de Fase 2 é bloqueada por equipamento mesmo sem efeito mecânico', () => {
    montar({}, { inventario: { itens: [{ slug: 'espada_longa', slot: 'mao_d', equipado: true }] } });
    abrirAbaTecnica();
    escolherTecnica('Golpe Duplo');   // exige CP/EP, está com CM
    expect(textoNaTela(/Exige arma do grupo: CP, EP/)).toBe(true);
    expect(btnRolar().disabled).toBe(true);
  });
});

// I5 (revisão final): modo 'total' não rola dado (spec §6, "sem overlay de
// dado; aplica e debita PA") — o botão de rolar nem aparece pra essas
// técnicas, e é o Aplicar (podeAplicar/tecBloqueio) quem decide sozinho.
// Reescrito na triagem: a versão anterior deste ROTEIRO exigia o botão de
// rolar para Fúria (modo total), que I5 removeu de propósito.
describe('ROTEIRO 7 — modo "total" não rola dado; o Aplicar decide sozinho', () => {
  const aplicarBtn = () => document.querySelector('.atacar-confirmar');

  it('Fúria (modo total) não mostra o botão de rolar dado', () => {
    montar();
    abrirAbaTecnica();
    escolherTecnica('Fúria');
    expect(btnRolar()).toBeFalsy();
  });

  it('Fúria já gasta (Único) deixa o Aplicar desabilitado, sem precisar rolar', () => {
    montar({ tecnicas_usadas: ['furia'] });
    abrirAbaTecnica();
    escolherTecnica('Fúria');
    expect(aplicarBtn().disabled).toBe(true);
  });

  it('Fúria disponível deixa o Aplicar habilitado direto, sem dado', () => {
    montar();
    abrirAbaTecnica();
    escolherTecnica('Fúria');
    expect(aplicarBtn().disabled).toBe(false);
  });

  it('Sangramento (modo teste, exige alvo) continua mostrando o botão de rolar', () => {
    montar({}, { inventario: { itens: [{ slug: 'espada_longa', slot: 'mao_d', equipado: true }] } });
    abrirAbaTecnica();
    escolherTecnica('Sangramento');
    expect(btnRolar()).toBeTruthy();
  });
});

// C1 (revisão final): as 5 técnicas de alvo único ('inimigo' — sangramento,
// expectativa, resguardar, pressionar_oponente, posicionamento) ganham um
// SelectPill de alvo PRÓPRIO, visível só pra elas — não reusam alvoIdx/alvo
// da aba Arma (estado compartilhado era o bug: default silencioso no índice
// 0, tela não dizia quem foi, dava pra sangrar o próprio aliado em silêncio).
describe('ROTEIRO 9 — C1: seletor de alvo próprio para técnicas de alvo único', () => {
  it('Sangramento (alvo: inimigo) ganha um segundo seletor, de Alvo', () => {
    montar({}, { inventario: { itens: [{ slug: 'espada_longa', slot: 'mao_d', equipado: true }] } });
    abrirAbaTecnica();
    escolherTecnica('Sangramento');
    expect(document.querySelectorAll('.select-pill-btn').length).toBe(2);
  });

  it('Mira (alvo: self) NÃO ganha seletor de Alvo', () => {
    montar();
    abrirAbaTecnica();
    escolherTecnica('Mira');
    expect(document.querySelectorAll('.select-pill-btn').length).toBe(1);
  });

  it('Voz de Comando (alvo: aliados) usa a multisseleção, não este seletor único', () => {
    montar();
    abrirAbaTecnica();
    escolherTecnica('Voz de Comando');
    expect(document.querySelectorAll('.select-pill-btn').length).toBe(1);   // só a técnica
  });

  it('trocar o alvo de Sangramento troca a opção selecionada (estado PRÓPRIO)', () => {
    montar({}, { inventario: { itens: [{ slug: 'espada_longa', slot: 'mao_d', equipado: true }] } });
    abrirAbaTecnica();
    escolherTecnica('Sangramento');
    const pills = Array.from(document.querySelectorAll('.select-pill-btn'));
    expect(pills).toHaveLength(2);
    const rotuloAntes = pills[1].querySelector('.select-pill-btn-label').textContent;
    expect(['Companheiro', 'Lobisomem']).toContain(rotuloAntes);
    const outroNome = rotuloAntes === 'Companheiro' ? 'Lobisomem' : 'Companheiro';
    fireEvent.click(pills[1]);
    const li = Array.from(document.querySelectorAll('.select-pill-drop li'))
      .find((el) => (el.textContent || '').trim() === outroNome);
    fireEvent.click(li);
    expect(pills[1].querySelector('.select-pill-btn-label').textContent).toBe(outroNome);
  });
});

// REGRA NOVA (decisão do usuário na revisão final, 09/09/2026): ativação de
// técnica modo 'total' passa a custar 0 PA, com teto de 1 ativação livre por
// rodada por combatente. modo 'teste' (só Sangramento) continua 1 PA.
describe('ROTEIRO 10 — REGRA NOVA: modo total custa 0 PA, 1 ativação livre por rodada', () => {
  const aplicarBtn = () => document.querySelector('.atacar-confirmar');

  it('o rótulo de Aplicar mostra 0 PA para Fúria (modo total)', () => {
    montar();
    abrirAbaTecnica();
    escolherTecnica('Fúria');
    expect(aplicarBtn().getAttribute('aria-label')).toMatch(/0 PA/);
  });

  it('o rótulo de Aplicar mostra 1 PA para Sangramento (modo teste)', () => {
    montar({}, { inventario: { itens: [{ slug: 'espada_longa', slot: 'mao_d', equipado: true }] } });
    abrirAbaTecnica();
    escolherTecnica('Sangramento');
    expect(aplicarBtn().getAttribute('aria-label')).toMatch(/1 PA/);
  });

  it('quem já ativou a técnica livre nesta rodada vê Fúria bloqueada, mesmo com PA sobrando', () => {
    montar({ tecnica_livre_usada: true, pa_rest: 2 });
    abrirAbaTecnica();
    escolherTecnica('Fúria');
    expect(textoNaTela(/Já ativou uma técnica gratuita nesta rodada/)).toBe(true);
    expect(aplicarBtn().disabled).toBe(true);
  });

  it('quem AINDA NÃO ativou continua livre, mesmo com pa_rest 0 (não é custo de PA)', () => {
    montar({ tecnica_livre_usada: false, pa_rest: 0 });
    abrirAbaTecnica();
    escolherTecnica('Fúria');
    expect(aplicarBtn().disabled).toBe(false);
  });

  it('a virada de rodada devolve a ativação livre (motor)', () => {
    const p = ator({ tecnica_livre_usada: true });
    const { participante } = M.processarViradaDeRodada(p);
    expect(participante.tecnica_livre_usada).toBe(false);
  });
});

// I4 (revisão final): rfEfetivo/rmEfetivo tinham um único call site (o ramo
// apoio) — a própria aba Resistência (o personagem testando RF/RM em si
// mesmo) montava a Força de Defesa a partir de ficha.derivadas, ignorando
// status_temp. Resistência à Dor/Extrema e as metades de Fúria não faziam
// nada ali.
describe('ROTEIRO 11 — I4: RF efetiva alimenta a aba Resistência', () => {
  it('Resistência à Dor (mod_rf) soma na Força de Defesa da aba Resistência', () => {
    montar({
      rf: 8,
      status_temp: [{ id: 'tec_resistencia_a_dor', nome: 'Resistência à Dor', icone: '🦾',
        rodadas_rest: 5, efeito: { tipo: 'mod_rf', valor: 5 } }],
    });
    fireEvent.click(btn(/^Resist/));
    const inputs = document.querySelectorAll('input[type="number"]');
    // Força de Ataque, depois Força de Defesa (RF por padrão) — mesma ordem do JSX.
    expect(inputs[1].value).toBe('13');   // 8 (rf) + 5 (mod_rf), não os 8 crus
  });
});

describe('ROTEIRO 8 — o motor por trás bate com o que a tela promete', () => {
  it('Mira soma o total na coluna de arma e some depois de 1 rodada', () => {
    const p0 = ator();
    const p1 = M.aplicarEfeitoTecnica(p0, { key: 'mira', nome: 'Mira', grupo_armas: 'PL, PM, PP' }, 9);
    expect(M.somaModAtaque(p1, 'PL')).toBe(9);
    expect(M.somaModAtaque(p1, 'CM')).toBe(0);   // trocou pra espada: sem bônus
    const p2 = M.processarViradaDeRodada(p1).participante;
    expect(M.somaModAtaque(p2, 'PL')).toBe(0);   // 1 rodada, expirou
  });

  it('Fúria muda as quatro coisas de uma vez', () => {
    const p = M.aplicarEfeitoTecnica(ator(), { key: 'furia', nome: 'Fúria', grupo_armas: 'Livre' }, 6);
    expect(M.somaModAtaque(p, 'PL')).toBe(6);
    expect(M.rfEfetivo(p)).toBe(14);   // 8 + 6
    expect(M.rmEfetivo(p)).toBe(12);   // 6 + 6
    expect(p.eh_max).toBe(26);         // 20 + 6
  });

  it('Posicionamento corta o dano que o alvo recebe', () => {
    const alvo = M.aplicarEfeitoTecnica(INIMIGO, { key: 'posicionamento', nome: 'Posicionamento', grupo_armas: 'Livre' }, 7);
    expect(M.danoComModMax(20, alvo)).toBe(13);
  });
});
