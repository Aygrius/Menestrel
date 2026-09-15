/* ============================================================
   apoio-tab.test.jsx — a aba Apoio do painel de Ação
   ============================================================
   Cobre o contrato da aba: só aparece pra quem tem magia de apoio, mostra o
   efeito no nível efetivo, e só oferece rolagem quando a magia exige teste de
   resistência ("Aumente 2 de velocidade" não rola; "Reduza 4 pontos de
   velocidade" da Distração rola, porque a descrição pede teste).

   Ver docs/superpowers/specs/2026-09-01-efeitos-batalha-velocidade-design.md §4.5
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
// higiene 8 (revisão final): AcaoPanel chama tecnicaEfeitoDe por nome nu
// assim que alguma fixture tiver técnica selecionada — sem este import a
// primeira que tivesse derrubava o teste com ReferenceError.
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let AcaoPanel;
beforeAll(() => { AcaoPanel = window.AcaoPanel; expect(AcaoPanel).toBeDefined(); });
afterEach(cleanup);

const CATALOGO = { machado_pesado: {
  slug: 'machado_pesado', nome: 'Machado Pesado', dano: 20,
  dano_l: -3, dano_m: -1, dano_p: 2, ajuste_atributo: 'FOR',
  grupo_armas: 'CM', alcance: 0 } };

const pjBase = {
  id: 64, nome: 'Yuldrous', raca: 'Anão', reino: 'Verrogar',
  profissao: 'Sacerdote', especializacao: 'Ordem de Crezir', deus: 'Crezir',
  intelecto_base: 2, aura_base: 2, carisma_base: 0,
  forca_base: 2, fisico_base: 2, agilidade_base: 2, percepcao_base: 1,
  experiencia: 42, habilidades: {}, habilidades_bonus: {}, tecnicas: {},
  aprimoramentos: {}, caracterizacao: {}, grupos_armas: { CM: 1 },
  estado_atual: { bonusArmas: {}, condicoes: {} },
  inventario: { itens: [{ slug: 'machado_pesado', slot: 'mao_d', equipado: true }] },
};

/* Textos copiados do banco de produção, com UMA exceção rotulada abaixo.

   ATUALIZADO EM 11/09/2026: a aba Apoio deixou de ser filtrada por "mexe em
   velocidade" e passou a ser filtrada pelo MAGIA_EFEITO_MAP (Fase 1 das
   magias). As fixtures antigas `distracao` e `cancao` não estão no registro —
   Distração e Canção do Ânimo não foram compradas por nenhum PJ da campanha,
   então continuam narrativas — e por isso sumiram da aba, derrubando doze
   testes deste arquivo.

   Trocadas por chaves QUE ESTÃO no registro e exercem os mesmos caminhos:
     velocidade → buff em si mesmo, sem rolagem (inalterada)
     bencao     → buff em aliado, alcance de Toque
     bravura    → buff em aliado, alcance metrado */
const MAGIAS = {
  velocidade: { key: 'velocidade', nome: 'Velocidade', duracao: '30 minutos',
    evocacao: 'Instantânea', alcance: 'Pessoal',
    descricao: 'Uma descarga cinética envolve seu corpo. Se sua velocidade ultrapassar 30, você terá uma segunda ação na mesma rodada.',
    nivel_1: 'Aumente 2 de velocidade.' },
  bencao: { key: 'bencao', nome: 'Bênção', duracao: '10 rodadas',
    evocacao: 'Instantânea', alcance: 'Toque',
    descricao: 'Através deste encanto, você concede uma bênção divina ao alvo.',
    nivel_1: 'Aumenta 1 coluna de ataque e 5 de energia heroica.' },
  bravura: { key: 'bravura', nome: 'Bravura', duracao: '12 horas',
    evocacao: 'Instantânea', alcance: '5 metros',
    descricao: 'Através de palavras de apoio, você fortalece a coragem de um alvo.',
    nivel_1: 'Aumenta 1 de resistência mágica e 5 de energia heroica.' },
  /* FIXTURE SINTÉTICA, não é o catálogo.

     NENHUMA das 25 magias da Fase 1 exige teste de resistência (conferido por
     SELECT em 11/09/2026), então o caminho de ROLAGEM da aba Apoio ficaria sem
     cobertura. Ele não é código morto: Distração, Tensão, Forçar Disputa e
     Região Inviolável o exercem, e entram quando algum PJ as comprar.

     Bravura com a frase de resistência enxertada é o menor sintético que
     prova o caminho. A frase em si é literal — é a mesma das quatro magias
     reais que pedem teste. */
  bravura_com_teste: { key: 'bravura', nome: 'Bravura', duracao: '12 horas',
    evocacao: 'Instantânea', alcance: '5 metros',
    descricao: 'Você fortalece a coragem de um alvo, caso ele falhe em um teste de resistência mágica.',
    nivel_1: 'Aumenta 1 de resistência mágica e 5 de energia heroica.' },
};

const ATOR = {
  tipo: 'pj', ref_id: 64, inst_id: 'pj:64', nome: 'Yuldrous', ordem: 1,
  status: 'ativo', atual: true, vb: 20, pa_max: 2, pa_rest: 2,
  mov_rest: 5, moveu_na_rodada: false,
  ef: 10, ef_max: 10, eh: 5, eh_max: 5, ar: 0, ar_max: 0,
  karma: 9, karma_max: 9, status_temp: [], condicoes: {},
};

const INIMIGO = {
  tipo: 'criatura', ref_id: 'lobo', inst_id: 'criatura:lobo', nome: 'Lobisomem',
  ordem: 2, status: 'ativo', atual: false, vb: 18, pa_max: 2, pa_rest: 2,
  mov_rest: 5, moveu_na_rodada: false,
  ef: 30, ef_max: 30, eh: 12, eh_max: 12, ar: 0, ar_max: 0,
  karma: 0, karma_max: 0, rf: 10, rm: 8, status_temp: [],
};

function montar(magiasDoPj, onAplicarApoio) {
  const pj = { ...pjBase, magias: magiasDoPj };
  return render(
    <div className="menestrel-ui">
      <AcaoPanel
        ator={ATOR}
        participantes={[ATOR, INIMIGO]}
        catalogos={{ pjById: { 64: pj }, catalogoBySlug: CATALOGO, magiasByKey: MAGIAS }}
        lang="pt"
        onAplicar={() => {}} onAplicarTeste={() => {}} onAplicarItem={() => {}}
        onAplicarApoio={onAplicarApoio || (() => {})} onCancel={() => {}}
        onRolagemPendenteChange={() => {}}
        rolagemSalva={null} onRolagemSalvaChange={() => {}}
      />
    </div>
  );
}

// Casa por TEXTO ou por aria-label: desde 02/09/2026 o botão de rolar o d20 e
// o de confirmar a ação são só-ícone, e o rótulo passou a viver no aria-label.
const btn = (re) => screen.getAllByRole('button').find(
  (b) => re.test(b.textContent) || re.test(b.getAttribute('aria-label') || '')
);
// Desde 13/09/2026 Apoio e Magia são UMA aba (ver opcoesMagias). Chamava-se
// "Magias"; é "Magia", no singular, desde 14/09/2026.
const abaApoio = () => btn(/^Magia$/);

describe('aba Magias — ataque e efeito numa aba só (13/09/2026)', () => {
  it('não existem mais os botões "Apoio" e "Magia" separados', () => {
    montar({ velocidade: 1 });
    expect(btn(/^Apoio$/)).toBeFalsy();
    expect(btn(/^Magias$/)).toBeFalsy();
    expect(screen.getAllByRole('button').filter((b) => /^Magia$/.test(b.textContent.trim()))).toHaveLength(1);
  });
});

describe('aba Apoio — quando aparece', () => {
  it('não aparece pra quem não tem magia nenhuma', () => {
    montar({});
    expect(abaApoio()).toBeFalsy();
  });

  it('aparece quando o PJ tem magia que mexe em velocidade', () => {
    montar({ velocidade: 1 });
    expect(abaApoio()).toBeTruthy();
  });

  it('não aparece se a magia conhecida não existe no catálogo', () => {
    montar({ inexistente: 1 });
    expect(abaApoio()).toBeFalsy();
  });
});

describe('aba Apoio — conteúdo', () => {
  it('mostra o efeito e a duração da magia escolhida', () => {
    montar({ velocidade: 1 });
    fireEvent.click(abaApoio());
    expect(screen.getByText(/\+2/)).toBeTruthy();
    expect(screen.getByText(/até o fim da batalha/i)).toBeTruthy();
  });

  it('magia de duração fixa mostra as rodadas', () => {
    montar({ bencao: 1 });             // Bênção dura 10 rodadas
    fireEvent.click(abaApoio());
    expect(screen.getByText(/por 10 rodadas/i)).toBeTruthy();
  });

  it('duração mais longa que a batalha vira "até o fim"', () => {
    montar({ bravura: 1 });            // Bravura dura 12 horas
    fireEvent.click(abaApoio());
    expect(screen.getByText(/até o fim da batalha/i)).toBeTruthy();
  });

  /* A PRÉVIA DEIXOU DE SER SÓ VELOCIDADE (11/09/2026).

     Antes a linha de efeito era `mod_vb + " de velocidade"`, fixo. Com a
     Fase 1, Bênção chegava nessa mesma linha e aparecia como "0 de
     velocidade" — uma afirmação ERRADA, pior do que não mostrar nada.
     resumoEfeitoMagia lê o texto do nível e lista o que a magia faz. */
  it('prévia lista TODOS os efeitos, não só velocidade', () => {
    montar({ bencao: 1 });
    fireEvent.click(abaApoio());
    expect(screen.getByText(/\+1 coluna de ataque/i)).toBeTruthy();
    expect(screen.getByText(/\+5 de energia heroica/i)).toBeTruthy();
  });

  it('prévia de buff que NÃO mexe em velocidade não diz "0 de velocidade"', () => {
    montar({ bravura: 1 });
    fireEvent.click(abaApoio());
    expect(screen.queryByText(/0 de velocidade/i)).toBeNull();
    expect(screen.getByText(/\+1 de resistência mágica/i)).toBeTruthy();
  });
});

describe('aba Apoio — rolagem só quando a magia exige', () => {
  /* NENHUMA das 25 magias da Fase 1 exige teste de resistência (conferido por
     SELECT em 11/09/2026), então o caminho de rolagem é exercido pela fixture
     sintética `bravura_com_teste` — ver o comentário no bloco MAGIAS. Ele não
     é código morto: Distração, Tensão, Forçar Disputa e Região Inviolável o
     usam, e entram quando algum PJ as comprar. */
  const MAGIAS_COM_TESTE = { ...MAGIAS, bravura: MAGIAS.bravura_com_teste };
  const montarComTeste = (magias) => {
    const pj = { ...pjBase, magias };
    return render(
      <div className="menestrel-ui">
        <AcaoPanel
          ator={ATOR}
          participantes={[ATOR, INIMIGO]}
          catalogos={{ pjById: { 64: pj }, catalogoBySlug: CATALOGO, magiasByKey: MAGIAS_COM_TESTE }}
          lang="pt"
          onAplicar={() => {}} onAplicarTeste={() => {}} onAplicarItem={() => {}}
          onAplicarApoio={() => {}} onCancel={() => {}}
          onRolagemPendenteChange={() => {}}
          rolagemSalva={null} onRolagemSalvaChange={() => {}}
        />
      </div>
    );
  };

  it('magia SEM teste não oferece rolagem de dado', () => {
    montar({ velocidade: 1 });
    fireEvent.click(abaApoio());
    expect(btn(/Rolar d20/i)).toBeFalsy();
  });

  it('magia COM teste de resistência oferece a rolagem', () => {
    montarComTeste({ bravura: 1 });
    fireEvent.click(abaApoio());
    expect(btn(/Rolar d20/i)).toBeTruthy();
  });

  it('magia sem teste já pode ser confirmada, sem rolar nada', () => {
    montar({ velocidade: 1 });
    fireEvent.click(abaApoio());
    const usar = btn(/Usar \(1 PA/i);
    expect(usar).toBeTruthy();
    expect(usar.disabled).toBe(false);
  });

  // Dado na linha (14/09/2026): com teste, a ação É o dado — não há Usar à
  // parte para apertar antes de rolar.
  it('magia com teste só age pelo dado', () => {
    montarComTeste({ bravura: 1 });
    fireEvent.click(abaApoio());
    expect(document.querySelector('.atacar-confirmar')).toBeNull();
    expect(btn(/Rolar d20 · Usar \(1 PA/i)).toBeTruthy();
  });
});

/* ── Alvo: o conjurador precisa poder mirar em si mesmo ───────────
   A spec pedia "a lista de alvos MAIS o próprio ator", e a implementação
   saiu só com os outros. Isso não é uma opção a menos: a magia Velocidade
   tem alcance "Pessoal", ou seja, SÓ pode ser lançada em si mesmo — então a
   única magia de velocidade que os PJs conhecem hoje era impossível de usar
   corretamente. */
describe('aba Apoio — mirar em si mesmo', () => {
  it('magia Pessoal aplica no PRÓPRIO conjurador', () => {
    let payload = null;
    montar({ velocidade: 1 }, (p) => { payload = p; });
    fireEvent.click(abaApoio());
    fireEvent.click(btn(/Usar \(1 PA/i));
    expect(payload).toBeTruthy();
    expect(payload.alvo.inst_id).toBe(ATOR.inst_id);
  });

  it('magia Pessoal não oferece mais ninguém como alvo', () => {
    montar({ velocidade: 1 });
    fireEvent.click(abaApoio());
    // O SelectPill fechado mostra o rótulo do valor atual; com um alvo só,
    // o nome do inimigo não pode aparecer em lugar nenhum do painel.
    expect(screen.queryByText(/Lobisomem/)).toBeNull();
  });

  it('buff de alcance metrado mira em SI por padrão', () => {
    let payload = null;
    montar({ bravura: 1 }, (p) => { payload = p; });
    fireEvent.click(abaApoio());
    fireEvent.click(btn(/Usar \(1 PA/i));
    expect(payload.alvo.inst_id).toBe(ATOR.inst_id);
  });

  it('buff de Toque também mira em SI por padrão, mas oferece o outro', () => {
    let payload = null;
    montar({ bencao: 1 }, (p) => { payload = p; });
    fireEvent.click(abaApoio());
    /* O SelectPill FECHADO só mostra o rótulo do valor atual, então procurar
       "Lobisomem" na tela não prova que ele está na lista — prova só que não
       é o selecionado. O sinal observável de "há mais de um alvo" é o select
       de alvo estar HABILITADO: ele desabilita com alvosApoio.length <= 1. */
    const selects = Array.from(document.querySelectorAll('.select-pill-btn'));
    expect(selects.some((s) => !s.disabled && /Yuldrous/.test(s.textContent))).toBe(true);
    fireEvent.click(btn(/Usar \(1 PA/i));
    expect(payload.alvo.inst_id).toBe(ATOR.inst_id);
  });

  /* O critério do alvo padrão mudou em 11/09/2026: era `mod_vb < 0`
     ("debuff mira no outro"), passou a vir do registro (`alvo` da entrada).
     Debuff em inimigo vive na aba Magia e não chega aqui, então toda magia
     de apoio hoje mira em si por padrão — e é o comportamento certo. */
});
