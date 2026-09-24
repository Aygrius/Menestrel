/* ============================================================
   card-informativo.test.jsx — o card grande diz mais e brilha menos
   ============================================================
   "Como agora o card dos personagens está maior, remova os efeitos de borda
    relativos à saúde e energia, e adicione um pouco mais de informações dos
    personagens, como ef, eh, karma e condição (status: envenenado, etc).
    O estágio pode ter mais evidência. Remova o badge 'pausada' e adicione um
    aviso quando o usuário tentar acessar a ficha." (usuário, 17/09/2026)

   Os cinco pedidos são consequência de um só: com um card por linha
   (card-limpo-e-clicavel.test.jsx), há espaço para números onde antes só cabia
   sinal. A borda tingida de saúde e o pulso do crítico eram o recurso de quem
   não tinha espaço; as barras de EF/EH/Karma e os chips de condição são o que
   o espaço permitiu no lugar.

   A cor da saúde NÃO some do código — ela deixa a moldura e vai para dentro da
   barra de EF, que é onde "roxo → carmesim → dourado" continua significando
   alguma coisa.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/status-efeito.jsx';   // tipoDoStatus, para a dedupe derivado × manual
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './personagens.jsx';
import '../11-ficha/ficha.jsx';   // publica SEM_KARMA/fichaEstadoLabel/FICHA_VIT_COLORS
import '../12-batalha/batalha.jsx'; // publica ICONE_STATUS — o card usa os mesmos ícones

let PersonagemCard;
beforeAll(() => {
  PersonagemCard = window.PersonagemCard;
  expect(PersonagemCard).toBeTypeOf('function');
});
afterEach(cleanup);

/* Atributos altos o bastante para haver EF, EH e Karma de verdade — Karma só
   existe com Aura ≥ 1, e um PJ zerado não teria barra nenhuma para conferir. */
const PJ = {
  id: 'pj-1', user_id: 'u-1', nome: 'Thalia', sobrenome: 'de Auren',
  raca: 'Humano', profissao: 'Mago',
  experiencia: 52, nivel_visto: 5,
  intelecto_base: 3, aura_base: 4, carisma_base: 2,
  forca_base: 3, fisico_base: 4, agilidade_base: 3, percepcao_base: 2,
};

function montar(props, pj = PJ) {
  return render(
    <PersonagemCard p={pj} isMaster={false} isOwn lang="pt" playerName="Richard"
      onEdit={() => {}} onDelete={() => {}} onAtivar={() => {}} {...props} />
  );
}

const card = (c) => c.querySelector('.pj-card');
const vitais = () => Array.from(document.querySelectorAll('.pj-vital')).map((v) => v.className);
const chips = () => Array.from(document.querySelectorAll('.pj-cond-chip')).map((c) => c.textContent);

describe('a moldura parou de medir a saúde', () => {
  it('nem borda nem sombra pintadas a partir da EF', () => {
    const ferido = { ...PJ, estado_atual: { vitalidade: { ef: 1 } } };
    const { container } = montar({}, ferido);
    const style = card(container).getAttribute('style');
    expect(style == null || !/border-color|box-shadow/.test(style)).toBe(true);
  });

  it('e o pulso de EF crítica não existe mais', () => {
    const critico = { ...PJ, estado_atual: { vitalidade: { ef: 1 } } };
    const { container } = montar({}, critico);
    expect(card(container).classList.contains('pj-card--ef-critico')).toBe(false);
  });

  /* O degradê de saúde não migrou para dentro da barra — foi embora. Ele saía
     do ratio de EF, então cada card exibia uma barra de cor diferente e a
     lista virava um mosaico. Quem diz o nível é a LARGURA do preenchimento; a
     cor é identidade do poço e não muda. */
  it('a barra de EF tem a mesma cor com o PJ ferido ou inteiro', () => {
    const corDe = (pj) => {
      cleanup();
      montar({}, pj);
      return getComputedStyle(document.querySelector('.pj-vital--ef')).getPropertyValue('--vit-c').trim();
    };
    const ferido = corDe({ ...PJ, estado_atual: { vitalidade: { ef: 1 } } });
    const inteiro = corDe(PJ);
    expect(ferido).toBe(inteiro);
    expect(ferido, 'a cor tem que sair da tabela da ficha').toBe(window.FICHA_VIT_COLORS.ef);
  });

  it('e o preenchimento é que acompanha o nível', () => {
    montar({}, { ...PJ, estado_atual: { vitalidade: { ef: 1 } } });
    const fill = document.querySelector('.pj-vital--ef .pj-vital-fill');
    expect(fill.getAttribute('style')).toMatch(/width:/);
    expect(fill.getAttribute('style')).not.toMatch(/background/);
  });
});

/* "Está fora do nosso padrão de cores." (usuário, 17/09/2026) — o card tinha
   ganhado um roxo inventado para o Karma e chips em verde/vermelho puros. A
   regra que sobra é: cor de poço vem da tabela da ficha, e nada mais no card
   pinta fora dos tokens. */
describe('as cores saem da tabela da ficha, não do card', () => {
  it.each([['ef'], ['eh'], ['ka']])('a barra de %s usa a cor canônica', (k) => {
    montar({});
    const el = document.querySelector('.pj-vital--' + k);
    expect(getComputedStyle(el).getPropertyValue('--vit-c').trim()).toBe(window.FICHA_VIT_COLORS[k]);
  });

  /* corCondicao devolve #00850f / #870000 — cor de PREENCHIMENTO de barra.
     Como texto e aro de chip, é verde e vermelho puros dentro de um card
     "Pedra & Bronze". Nenhum chip pode vestir aquilo. */
  it('nenhum chip de condição veste a cor de preenchimento de barra', () => {
    montar({}, { ...PJ, estado_atual: { condicoes: { hidratacao: -30, nutricao: 20 } } });
    for (const chip of document.querySelectorAll('.pj-cond-chip')) {
      const style = chip.getAttribute('style');
      expect(style == null || !/#00850f|#870000/i.test(style)).toBe(true);
    }
  });
});

describe('os vitais deixaram de ser privilégio do personagem ativo', () => {
  it('qualquer card mostra EF, EH e Karma', () => {
    montar({});
    expect(vitais()).toEqual([
      expect.stringContaining('pj-vital--ef'),
      expect.stringContaining('pj-vital--eh'),
      expect.stringContaining('pj-vital--ka'),
    ]);
  });

  it('o número é o do estado atual, não o máximo', () => {
    montar({}, { ...PJ, estado_atual: { vitalidade: { ef: 3 } } });
    const ef = document.querySelector('.pj-vital--ef .pj-vital-num');
    expect(ef.textContent).toMatch(/^3\//);
  });

  /* Guerreiro e Ladino não conjuram: a barra existia e ficava sempre vazia —
     a mesma regra (SEM_KARMA) que já tirava a barra da ficha deles. */
  it('quem não conjura não ganha barra de Karma', () => {
    montar({}, { ...PJ, profissao: 'Guerreiro' });
    expect(document.querySelector('.pj-vital--ka')).toBeNull();
    expect(document.querySelector('.pj-vital--ef')).toBeTruthy();
  });
});

/* "Remova as informações de vitalidade 'insano', 'desonrado', etc."
   (usuário, 17/09/2026). Eu tinha lido "condição" no pedido anterior e posto
   no card os rótulos narrativos das oito barras da ficha. Não era isso: as
   condições continuam na ficha, uma barra por condição, e o que o card mostra
   é o STATUS (ver o describe adiante). */
describe('as condições da ficha não aparecem no card', () => {
  it('nem a faixa, nem os chips, nem o texto narrativo', () => {
    const { container } = montar({}, { ...PJ, estado_atual: { condicoes: { sanidade: -10, reputacao: -20 } } });
    expect(container.querySelector('.pj-cond-chips')).toBeNull();
    expect(container.querySelector('.pj-cond-chip')).toBeNull();
    expect(container.textContent).not.toMatch(/Insano|Desonrado/);
  });

  /* As condições seguem entrando no CÁLCULO — elas mexem nos poços, e um card
     que ignorasse isso contradiria a ficha do mesmo personagem na linha
     seguinte. O que saiu foi a exibição, não a conta. */
  it('mas continuam pesando no cálculo dos poços', () => {
    const fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'personagens.jsx'), 'utf8');
    expect(fonte).toContain('calcularFicha(p, undefined, p.estado_atual?.condicoes)');
  });
});

/* "Está aproveitando pouco o card horizontalmente." A causa era uma linha de
   CSS: só o card ATIVO ganhava flex:1 na coluna de conteúdo, e os demais
   encolhiam no conteúdo — metade do card de largura inteira ficava morta, e o
   ativo ainda parecia de outra família. */
describe('o card usa a largura que tem', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', 'index.css'), 'utf8');
  const regra = (sel) => {
    const i = css.indexOf(sel);
    expect(i, 'não achei ' + sel).toBeGreaterThan(-1);
    return css.slice(i, css.indexOf('}', i));
  };

  it('a coluna de conteúdo estica em todo card, não só no ativo', () => {
    expect(regra('#root .menestrel-ui .pj-card-info {')).toMatch(/flex:\s*1 1 auto/);
  });

  it('os três poços dividem a largura em colunas iguais', () => {
    const r = regra('#root .menestrel-ui .pj-vitais {');
    expect(r).toMatch(/grid-template-columns:\s*repeat\(3,\s*1fr\)/);
    expect(r, 'auto-fit refluía diferente em cada card').not.toMatch(/auto-fit/);
  });

  it('e o status vai para a ponta direita da linha do topo', () => {
    expect(regra('#root .menestrel-ui .pj-card-status {')).toMatch(/margin-left:\s*auto/);
  });

  /* "Os números de EF, etc devem ser do mesmo tamanho e o texto branco." Eram
     14px creme e 12px marrom apagado — dois tamanhos e duas cores para ler um
     número só. */
  /* O acordo de 17/09 era "rótulo, valor e máximo são a MESMA coisa", e
     continua valendo — mudou QUAL coisa. Em 20/09 o usuário pediu a pele do
     .pj-meta ("a mesma fonte tamanho e cor de 'elfo-florestal rastreador'"),
     primeiro para o rótulo e logo depois para o número: Lora 13px no marrom
     claro, no lugar do Cinzel 15px creme. */
  it('rótulo, valor e máximo vestem a pele da linha de raça e profissão', () => {
    /* Os MESMOS seletores aparecem duas vezes no arquivo: a regra base e uma
       dentro de `@media (max-width: 560px)`, que só reduz o tamanho junto com
       o .pj-meta. Procurar pelo seletor pegaria a primeira das duas, que não
       tem família nem cor — por isso a busca é pelo BLOCO que declara a
       família. */
    const blocos = css.split('}')
      .filter((b) => b.includes('.pj-vital-rot,') && b.includes('font-family'));
    expect(blocos, 'não achei a regra base dos poços').toHaveLength(1);
    const r = blocos[0];
    const meta = regra('#root .menestrel-ui .pj-meta { display:');

    // A referência que o usuário citou: a linha de raça e profissão.
    expect(meta).toMatch(/font-family:\s*'Lora'/);
    expect(meta).toMatch(/font-size:\s*15px/);

    // E os poços vestem exatamente ela — inclusive o peso, que já foi 600.
    expect(r).toMatch(/font-family:\s*'Lora'/);
    expect(r).toMatch(/font-size:\s*15px/);
    expect(r).toMatch(/color:\s*#9C8F73/);
    expect(r).toMatch(/font-weight:\s*400/);
  });
});

/* "O estágio pode ficar escrito junto com o nome, assim: Lysandra Vel'Thals 9"
   (usuário, 17/09/2026). Passou por selo em pílula antes de chegar aqui; o que
   ele queria é o número colado ao nome, lido como parte dele. */
describe('o estágio é escrito junto com o nome', () => {
  it('o nome termina no número do estágio', () => {
    const { container } = montar({});
    expect(container.querySelector('.pj-name').textContent).toBe('Thalia de Auren5');
    expect(container.querySelector('.pj-name .pj-name-estagio').textContent).toBe('5');
  });

  it('e a pílula de selo não existe mais', () => {
    const { container } = montar({});
    expect(container.querySelector('.pj-card-estagio')).toBeNull();
  });

  it('e saiu da linha de meta, que ficou com raça, profissão e título', () => {
    const { container } = montar({});
    expect(container.querySelector('.pj-meta').textContent).not.toMatch(/Estágio/);
    expect(container.querySelector('.pj-meta').textContent).toMatch(/Humano Mago/);
  });
});

/* "Quando eu disse sobre o status, eu digo o status que ficou de batalha:
   ferido, envenenado, desmaiado, morto, etc. E esta informação fica no lado
   direito no topo." (usuário, 17/09/2026) — eu tinha entendido "condição" e
   mostrado as oito barras da ficha, que são outra coisa.

   Morto e Desmaiado saem da vitalidade, do mesmo jeito que montarSnapshots os
   deriva ao entrar em combate; o resto vem de estado_atual.status. */
describe('o status de batalha, no canto direito do topo', () => {
  /* O NOME saiu do texto visível e foi para o rótulo acessível (20/09/2026):
     "o status vai aparecer apenas os ícones, sem o texto e sem o fundo e borda
     colorido" (usuário). O que estes testes afirmam não mudou — quais status
     aparecem, em que ordem, e qual deles é grave —, só mudou onde o nome
     viaja. Ler `textContent` agora devolveria string vazia para todos. */
  const statusTexto = () => Array.from(document.querySelectorAll('.pj-status-chip')).map((c) => c.getAttribute('aria-label'));

  it('o chip não escreve o nome na tela — só o ícone', () => {
    montar({}, { ...PJ, estado_atual: { vitalidade: { ef: 0 } } });
    expect(document.querySelector('.pj-status-chip').textContent).toBe('');
    expect(document.querySelector('.pj-status-chip i')).toBeTruthy();
  });

  it('personagem inteiro não mostra status nenhum', () => {
    montar({});
    expect(document.querySelector('.pj-card-status')).toBeNull();
  });

  it('EF no piso é Morto — e é a vitalidade que diz, não um campo à parte', () => {
    montar({}, { ...PJ, estado_atual: { vitalidade: { ef: -15 } } });
    expect(statusTexto()).toEqual(['Morto']);
    expect(document.querySelector('.pj-status-chip').classList.contains('is-grave')).toBe(true);
  });

  it('EF zerada é Desmaiado', () => {
    montar({}, { ...PJ, estado_atual: { vitalidade: { ef: 0 } } });
    expect(statusTexto()).toEqual(['Desmaiado']);
  });

  it('EH zerada também desmaia', () => {
    montar({}, { ...PJ, estado_atual: { vitalidade: { eh: 0 } } });
    expect(statusTexto()).toEqual(['Desmaiado']);
  });

  it('os efeitos guardados viram chip, com nome e ícone', () => {
    montar({}, { ...PJ, estado_atual: { status: [
      { id: 'veneno:abc', nome: 'Envenenado', rodadas_rest: 3, efeito: { tipo: 'dano_por_rodada', valor: 2 } },
      { id: 'ferido:def', nome: 'Ferido', rodadas_rest: 2, efeito: { tipo: 'mod_coluna', valor: -7 } },
    ] } });
    expect(statusTexto()).toEqual(['Envenenado', 'Ferido']);
    // Nenhum é "grave": grave é só o que a vitalidade impõe.
    expect(document.querySelectorAll('.pj-status-chip.is-grave')).toHaveLength(0);
  });

  /* O par status→ícone já divergiu uma vez DENTRO da batalha; não pode
     divergir entre a batalha e o card. */
  it('o ícone sai do mapa da própria batalha', () => {
    montar({}, { ...PJ, estado_atual: { status: [{ id: 'veneno:abc', nome: 'Envenenado' }] } });
    const i = document.querySelector('.pj-status-chip i');
    expect(i.className).toBe('ti ' + window.ICONE_STATUS.envenenado);
  });

  it('a vitalidade e os efeitos guardados convivem', () => {
    montar({}, { ...PJ, estado_atual: {
      vitalidade: { ef: -15 },
      status: [{ id: 'sangramento:x', nome: 'Sangrando' }],
    } });
    expect(statusTexto()).toEqual(['Morto', 'Sangrando']);
  });
});

/* "Não precisa mostrar tooltip no card de personagens." (usuário, 17/09/2026)

   O card teve tooltip em vitais, status, estágio e no motivo do card
   bloqueado. Todos saíram — e com eles o problema de posicionamento que o
   transform do .pj-card-wrap causava (transform cria bloco de contenção para
   descendentes position:fixed, e o .mn-tip é fixed com coordenadas de
   viewport). O que o balão dizia está escrito na tela agora: poços com nome
   por extenso, status com o nome ao lado do ícone, estágio depois do nome. */
describe('o card não tem tooltip', () => {
  const eventos = (el) => ['mouseenter', 'mouseover'].map((t) => {
    el.dispatchEvent(new MouseEvent(t, { bubbles: true }));
    return document.querySelector('.mn-tip');
  });

  it('passar o mouse nos poços não abre balão', () => {
    const { container } = montar({}, { ...PJ, estado_atual: { vitalidade: { ef: 5 } } });
    expect(eventos(container.querySelector('.pj-vital')).filter(Boolean)).toHaveLength(0);
  });

  it('nem no status', () => {
    const { container } = montar({}, { ...PJ, estado_atual: { status: [{ id: 'veneno:a', nome: 'Envenenado' }] } });
    expect(eventos(container.querySelector('.pj-status-chip')).filter(Boolean)).toHaveLength(0);
  });

  it('nem no card bloqueado por outro ativo', () => {
    const { container } = montar({ bloqueadoPorOutroAtivo: true });
    expect(eventos(container.querySelector('.pj-card')).filter(Boolean)).toHaveLength(0);
  });

  it('e o componente de balão não é mais montado no card', () => {
    const fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'personagens.jsx'), 'utf8');
    const i = fonte.indexOf('function PersonagemCard(');
    const corpo = fonte.slice(i, fonte.indexOf('\nfunction ', i + 10));
    expect(corpo).not.toMatch(/<PortalTooltip/);
    expect(corpo).not.toMatch(/<Tooltip/);
    expect(corpo).not.toMatch(/abrirTip/);
  });
});

/* "Adicione o ícone da profissão dos personagens no card e na ficha."
   (usuário, 17/09/2026). A tabela mora em 01-core/game-data.jsx porque card,
   ficha e tabuleiro a consomem. */
describe('o ícone da profissão', () => {
  it('abre a linha de meta, com o desenho da profissão', () => {
    const { container } = montar({});   // PJ é Mago
    const ic = container.querySelector('.pj-meta .pj-meta-profissao-ic');
    expect(ic, 'não achei o ícone na linha de meta').toBeTruthy();
    expect(ic.className).toContain(window.iconeProfissao('Mago'));
  });

  it('muda com a profissão', () => {
    const { container } = montar({}, { ...PJ, profissao: 'Guerreiro' });
    expect(container.querySelector('.pj-meta-profissao-ic').className).toContain('ti-shield');
  });

  it('e profissão sem desenho não deixa um quadrado vazio', () => {
    const { container } = montar({}, { ...PJ, profissao: 'Alquimista' });
    expect(container.querySelector('.pj-meta-profissao-ic')).toBeNull();
    expect(container.querySelector('.pj-meta').textContent).toMatch(/Alquimista/);
  });
});

/* O selo "Pausada" saiu do card em 17/09/2026, e o aviso que o substituiu
   durou poucas horas: "não precisa de mostrar 'história pausada' para o
   mestre, na hora de entrar no personagem". O Mestre é quem pausa a mesa —
   confirmar o próprio ato a cada ficha era só um clique. Quem a pausa tranca é
   o Jogador, na própria ficha (ver 11-ficha/ficha-pausada.test.js). */
describe('história pausada não aparece no card nem barra o Mestre', () => {
  it('o card não traz a etiqueta "Pausada"', () => {
    const { container } = montar({ isMaster: true, onAbrirFicha: () => {}, pausado: true });
    expect(container.querySelector('.pj-card-pausada')).toBeNull();
    expect(container.textContent).not.toMatch(/Pausada/);
  });

  it('e o aviso do Mestre não existe mais', () => {
    expect(window.AvisoHistoriaPausadaModal).toBeUndefined();
  });

  it('o Mestre abre a ficha no primeiro clique, sem confirmar nada', () => {
    let abriu = 0;
    const { container } = montar({ isMaster: true, onAbrirFicha: () => { abriu++; } });
    container.querySelector('.pj-card').click();
    expect(abriu).toBe(1);
  });
});

/* ============================================================
   Dedupe: derivado × manual (20/09/2026)
   ============================================================
   O Mestre passou a poder marcar desmaiado/morto à mão, e os dois continuam
   sendo DERIVADOS da vitalidade. Quando as duas origens dizem a mesma coisa,
   o card mostra UM chip — nunca dois iguais lado a lado.

   Não há conflito possível na outra direção: não existe marca manual de
   "são/ativo", então derivado e manual só podem coincidir.
   ============================================================ */
describe('derivado e manual não viram dois chips iguais', () => {
  const statusTipos = () => Array.from(document.querySelectorAll('.pj-status-chip'))
    .map((c) => c.getAttribute('aria-label'));

  it('EF zerada mais marca manual de desmaiado rende um chip só', () => {
    montar({}, { ...PJ, estado_atual: {
      vitalidade: { ef: 0 },
      status: [{ id: 'desmaiado:abc', nome: 'Desmaiado' }],
    } });
    expect(statusTipos()).toEqual(['Desmaiado']);
  });

  it('a marca manual aparece mesmo com a ficha cheia', () => {
    montar({}, { ...PJ, estado_atual: {
      status: [{ id: 'desmaiado:abc', nome: 'Desmaiado' }],
    } });
    expect(statusTipos()).toEqual(['Desmaiado']);
  });

  /* O chip que sobrevive é o GRAVE: é a vitalidade que manda na cor, e um
     desmaio real não pode se pintar como efeito qualquer. */
  it('e o chip que fica é o grave', () => {
    montar({}, { ...PJ, estado_atual: {
      vitalidade: { ef: 0 },
      status: [{ id: 'desmaiado:abc', nome: 'Desmaiado' }],
    } });
    expect(document.querySelector('.pj-status-chip').classList.contains('is-grave')).toBe(true);
  });

  it('status de tipo diferente continuam convivendo', () => {
    montar({}, { ...PJ, estado_atual: {
      vitalidade: { ef: 0 },
      status: [{ id: 'veneno:abc', nome: 'Envenenado' }],
    } });
    expect(statusTipos()).toEqual(['Desmaiado', 'Envenenado']);
  });
});
