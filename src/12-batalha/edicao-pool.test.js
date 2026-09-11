/* ============================================================
   edicao-pool.test.js — o Mestre edita EF/EH/AR/KA clicando na barra
   ============================================================
   Pedido do usuário (01/09/2026): sai o par de botões coração
   (dano/cura) do card, e o Mestre passa a editar o valor clicando
   direto na barra da pool. Mesmo gesto que a Ficha já usa.

   Duas peças puras cobertas aqui:

   `statusPorPools` — o status derivado das pools. Já existia embutido no
   fim de aplicarEfeitoItemSnapshot; virou função porque a edição manual
   precisa EXATAMENTE da mesma regra. Se divergissem, zerar a EH pela barra
   deixaria o lutador "ativo" enquanto zerá-la por um item o derrubaria.

   `valorPoolEditado` — o clamp por pool. Não é uniforme:
     EF  piso EF_MORTE (fica negativa: caído-vivo até -14, morto em -15)
     AR  SEM teto — buff de elixir passa do ar_max de propósito, mesma
         regra que montarSnapshots aplica na entrada do combate
     EH/KA  faixa 0..max
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M, EF_MORTE;
beforeAll(() => { M = window.MotorBatalha; EF_MORTE = M.EF_MORTE; });

const p = (over) => ({
  tipo: 'pj', ref_id: 1, inst_id: 'a', nome: 'Teste', status: 'ativo',
  ef: 10, ef_max: 20, eh: 5, eh_max: 14, ar: 2, ar_max: 4, karma: 3, karma_max: 6,
  ...over,
});

describe('valorPoolEditado — cada pool tem sua faixa', () => {
  it('EH e KA ficam entre 0 e o máximo', () => {
    expect(M.valorPoolEditado(p(), 'eh', 99)).toBe(14);
    expect(M.valorPoolEditado(p(), 'eh', -5)).toBe(0);
    expect(M.valorPoolEditado(p(), 'karma', 99)).toBe(6);
  });

  it('EF desce até o piso de morte, não até zero', () => {
    expect(M.valorPoolEditado(p(), 'ef', -99)).toBe(EF_MORTE);
    expect(M.valorPoolEditado(p(), 'ef', -7)).toBe(-7);
    expect(M.valorPoolEditado(p(), 'ef', 99)).toBe(20);
  });

  it('AR passa do máximo — é onde o buff de elixir vive', () => {
    // Mesma regra da entrada em combate (montarSnapshots): cortar aqui faria
    // o Mestre não conseguir registrar o buff que o item concede.
    expect(M.valorPoolEditado(p(), 'ar', 30)).toBe(30);
    expect(M.valorPoolEditado(p(), 'ar', -3)).toBe(0);
  });

  it('texto vazio ou lixo vira 0, não NaN', () => {
    expect(M.valorPoolEditado(p(), 'eh', '')).toBe(0);
    expect(M.valorPoolEditado(p(), 'eh', 'abc')).toBe(0);
    expect(M.valorPoolEditado(p(), 'eh', '7')).toBe(7);
  });
});

describe('statusPorPools — o status segue as pools', () => {
  it('EF no piso mata', () => {
    expect(M.statusPorPools(p({ ef: EF_MORTE })).status).toBe('morto');
  });

  it('EF zerada ou negativa derruba', () => {
    expect(M.statusPorPools(p({ ef: 0 })).status).toBe('desmaiado');
    expect(M.statusPorPools(p({ ef: -4 })).status).toBe('desmaiado');
  });

  it('EH zerada derruba mesmo com EF cheia', () => {
    expect(M.statusPorPools(p({ eh: 0 })).status).toBe('desmaiado');
  });

  it('quem não tem pool de EH não desmaia por ela', () => {
    // Criatura sem EH: eh 0 com eh_max 0 é o normal dela, não um desmaio.
    expect(M.statusPorPools(p({ eh: 0, eh_max: 0 })).status).toBe('ativo');
  });

  it('reanima quando as DUAS causas são sanadas', () => {
    expect(M.statusPorPools(p({ status: 'desmaiado', ef: 5, eh: 3 })).status).toBe('ativo');
    // Só a EF não basta se a EH continua zerada.
    expect(M.statusPorPools(p({ status: 'desmaiado', ef: 5, eh: 0 })).status).toBe('desmaiado');
  });

  it('morto NÃO ressuscita por edição de pool — é decisão do Mestre', () => {
    expect(M.statusPorPools(p({ status: 'morto', ef: 20, eh: 14 })).status).toBe('morto');
  });

  it('desistiu não é tocado', () => {
    expect(M.statusPorPools(p({ status: 'desistiu', ef: 0 })).status).toBe('desistiu');
  });

  it('não muta o participante recebido', () => {
    const orig = p({ ef: 0 });
    M.statusPorPools(orig);
    expect(orig.status).toBe('ativo');
  });
});

describe('a edição segue as mesmas regras do dano do motor', () => {
  it('baixar a EF pela barra derruba a concentração, como um golpe', () => {
    // Era o buraco do item 7, e a edição manual é justamente a porta pela
    // qual ele voltaria: o botão de dano sumiu, mas a mão do Mestre não.
    const sustentado = {
      id: 'mag:x', nome: 'Velocidade', rodadas_rest: null,
      efeito: { tipo: 'mod_vb', valor: 10 },
      concentracao: { ator: 'a', magia_key: 'velocidade' },
    };
    const antes = p();
    const depois = M.statusPorPools({ ...antes, ef: M.valorPoolEditado(antes, 'ef', 2) });
    const arr = [antes, { ...p({ inst_id: 'b', ref_id: 2 }), status_temp: [sustentado] }];
    const r = M.quebrarConcentracaoPorDano(
      arr.map((x) => (x.inst_id === 'a' ? depois : x)), antes, depois
    );
    expect(r[1].status_temp).toHaveLength(0);
  });

  it('SUBIR a pool não quebra concentração nenhuma', () => {
    const sustentado = {
      id: 'mag:x', nome: 'Velocidade', rodadas_rest: null,
      efeito: { tipo: 'mod_vb', valor: 10 },
      concentracao: { ator: 'a', magia_key: 'velocidade' },
    };
    const antes = p({ ef: 4 });
    const depois = M.statusPorPools({ ...antes, ef: 18 });
    const arr = [depois, { ...p({ inst_id: 'b', ref_id: 2 }), status_temp: [sustentado] }];
    expect(M.quebrarConcentracaoPorDano(arr, antes, depois)).toBe(arr);
  });
});

/* ── O editor virou MODAL (02/09/2026) ────────────────────────────
   Pedido do usuário: "quando clico nas barras de EF, EH, etc, eu quero um
   modal para editar, igual o modal para inserir veneno."

   Antes era uma faixa inline dentro do próprio card (.batalha-dano-painel),
   que espremia rótulo, valor, atual/máximo e dois botões numa linha só num
   popover estreito.

   O que estes testes trancam não é a aparência, são as três amarras que
   fazem o modal FUNCIONAR — cada uma já quebrou alguma vez neste arquivo:

   1. o clique guarda o ÍNDICE do participante. O modal é renderizado fora do
      card, sem `p` nem `i` no escopo (mesmo motivo do Envenenar);
   2. o clique FECHA o card. Ele tem z-index 9600 e nasceria por cima do
      modal, tapando o campo — foi exatamente o que aconteceu com o de veneno;
   3. o clique fecha o TOOLTIP. A barra some da tela com o balão aberto e o
      mouseleave nunca chega nela: o "EF — editar" ficava flutuando sobre o
      modal.

   São asserções sobre a FONTE porque o alvo é a fiação do componente, não um
   valor calculado — mesmo recurso que concentracao-dano.test.js usa. */
describe('editor de pool — modal, não faixa inline', () => {
  let fonte;
  beforeAll(async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'batalha.jsx'), 'utf8');
  });

  const aberturaDoEditor = () => {
    const i = fonte.indexOf('onEditar: estado === ');
    expect(i, 'o clique que abre o editor precisa existir').toBeGreaterThan(-1);
    return fonte.slice(i, i + 700);
  };

  it('a faixa inline não existe mais', () => {
    expect(fonte).not.toMatch(/batalha-dano-painel/);
  });

  it('o editor é um ModalShell guiado por poolOpen', () => {
    const i = fonte.indexOf('{poolOpen && (');
    expect(i, 'poolOpen precisa renderizar algo').toBeGreaterThan(-1);
    expect(fonte.slice(i, i + 400)).toMatch(/<ModalShell/);
  });

  it('o clique guarda o índice do participante', () => {
    expect(aberturaDoEditor()).toMatch(/setPoolOpen\(\{\s*idx:/);
  });

  it('o clique fecha o card, senão ele tapa o modal', () => {
    expect(aberturaDoEditor()).toMatch(/\bfechar\(\)/);
  });

  /* A busca precisa aceitar \r\n além de \n.

     Este teste procurava a string com um '\n' literal embutido. O arquivo
     batalha.jsx está com CRLF no repositório (o git converte no checkout —
     é o que os avisos "LF will be replaced by CRLF" anunciam), então o
     indexOf devolvia -1 e o teste quebrava com a mensagem enganosa "a barra
     editável precisa ter onClick próprio", como se o código estivesse
     errado. Passava só em working trees onde o arquivo tinha ficado com LF.

     Descoberto em 11/09/2026 ao rodar a suíte na main recém-mesclada: o
     mesmo commit passava no branch e falhava na main, porque o checkout
     rematerializou o arquivo com CRLF. */
  it('o clique fecha o tooltip, senão ele fica órfão sobre o modal', () => {
    const m = fonte.match(/className=\{classe\}\r?\n\s*onClick=/);
    expect(m, 'a barra editável precisa ter onClick próprio').not.toBeNull();
    expect(fonte.slice(m.index, m.index + 200)).toMatch(/fecharTip\(\)/);
  });
});

/* ── A prévia do efeito (02/09/2026) ──────────────────────────────
   O modal pedia um valor ABSOLUTO e não mostrava consequência nenhuma. Duas
   coisas ficaram visíveis, ambas caladas antes:

   • o DELTA. "Levou 5" é como o dano chega na mesa; o campo pede o valor
     final, então a subtração era feita de cabeça e sem conferência;
   • o CLAMP. valorPoolEditado apara em SILÊNCIO — digitar 99 numa EH de 14
     grava 14 e nada avisava. Este é o teste que importa: a prévia tem que
     dizer o que vai ser gravado, não o que foi digitado.

   Renderiza o componente de verdade porque o alvo é justamente o que chega
   aos olhos do Mestre antes do Aplicar. */
describe('PreviaPool — o que o Mestre vê antes de aplicar', () => {
  const tbFake = { foraDaFaixa: 'Fora da faixa — será salvo como' };
  const montar = (poolOpen, bruto) => render(
    React.createElement('div', { className: 'menestrel-ui' },
      React.createElement(window.PreviaPool, { poolOpen, bruto, tb: tbFake }))
  );
  const ef = { pool: 'ef', atual: 8, max: 11, sigla: 'EF', nome: 'X', icone: 'ti-heart' };
  const eh = { pool: 'eh', atual: 5, max: 14, sigla: 'EH', nome: 'X', icone: 'ti-heart' };

  afterEach(cleanup);

  it('mostra o delta de uma perda', () => {
    montar(ef, '3');
    expect(screen.getByText('-5')).toBeTruthy();
  });

  it('mostra o delta de um ganho com o sinal', () => {
    montar(ef, '11');
    expect(screen.getByText('+3')).toBeTruthy();
  });

  it('não inventa delta quando o valor não mudou', () => {
    montar(ef, '8');
    expect(screen.queryByText(/^[+-]\d/)).toBeNull();
  });

  it('avisa quando o valor digitado vai ser aparado', () => {
    montar(eh, '99');
    expect(screen.getByText(/Fora da faixa.*14/)).toBeTruthy();
  });

  it('mostra o valor APARADO, não o digitado', () => {
    const { container } = montar(eh, '99');
    expect(container.querySelector('.bpp-novo').textContent).toBe('14');
  });

  it('não avisa nada quando o valor está na faixa', () => {
    montar(eh, '9');
    expect(screen.queryByText(/Fora da faixa/)).toBeNull();
  });

  it('EF negativa é faixa válida, não clamp (caído-vivo)', () => {
    montar(ef, '-9');
    expect(screen.queryByText(/Fora da faixa/)).toBeNull();
    expect(screen.getByText('-17')).toBeTruthy();   // 8 → -9
  });
});
