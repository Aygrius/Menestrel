/* ============================================================
   arreamento-animal.test.js — a sela só serve no bicho certo
   ============================================================
   Pedidos do usuário (05/10/2026):
     "Vamos criar itens para vestir os animais, roupas específicas para cada
      tipo de animal. Do tipo cavalo, grifo, dragão, avestruz, pônei, elefante,
      camelo, podemos ter Selas e Arreios, Peitorais, Cabeçadas e Rédeas,
      Caneleiras, Mantas, Alforje de Sela, Bardas, Chanfron, Crinum, Gualdrapa,
      Sela de Jorna[da], de Torne[i]o ou de Guerra."
     "Os itens carroça, carro de boi, carruagem, carruagem composta, charrete
      podem ser equipados aos cavalos, bois, vacas, touros, búfalos e camelos.
      Trenó pode ser equipado em cães, lobos, raposas, javalis."

   O "tipo de animal" é criaturas.subtipo, e quem aceita cada peça está em
   itens.animal_subtipos (CSV) — ver
   scripts/sql/arreamento-e-atrelado-2026-10-05.sql. Este arquivo trava as três
   regras que essa dupla de colunas cria:
     1. peça restrita só entra no subtipo listado;
     2. peça SEM lista continua entrando em qualquer bicho (um saco de farinha
        vai no lombo de qualquer um) — a restrição é opcional, não a regra;
     3. a casa do arreamento (slot_arreio) não cai na mochila quando está
        ocupada: a segunda sela é recusada, não guardada no bolso.

   ── 27/10/2026: A PEÇA DE MONTARIA SAIU DO CSV ────────────────────────────
   Pedido do usuário: "Os animais que podem ser montados, podem usar os itens
   de montaria." A regra 1 acima continua valendo para o ATRELADO — quem puxa
   não precisa ser montável —, mas as onze casas de montaria passaram a ler
   `criaturas.montaria`. A lista de sete subtipos escrita à mão deixava treze
   subtipos montáveis sem poder usar peça nenhuma (Pégaso, Unicórnio, Mula,
   Quimera, Mamute, Búfalo, Tigre, Águia, Drake, Dradenar, Cérberus, Cavalum,
   Vaca). Ver scripts/sql/montaria-aceita-arreamento-2026-10-27.sql.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../10-shell/shell.jsx';
import './inventario.jsx';

let equiparNoAnimal, animalAceitaAPeca, subtiposDaPeca, motivoAnimalLabel, calcCarga;
beforeAll(() => {
  ({ equiparNoAnimal, animalAceitaAPeca, subtiposDaPeca, motivoAnimalLabel, calcCarga } = window);
  expect(equiparNoAnimal).toBeTypeOf('function');
  expect(animalAceitaAPeca).toBeTypeOf('function');
});

// Linhas reais do banco, nos campos que estas regras leem.
const CAVALO_CRI = { id: 157, nome: 'Cavalo do Rei', subtipo: 'Cavalo', montaria: true };
const URSO_CRI   = { id: 142, nome: 'Urso Negro',   subtipo: 'Urso',   montaria: false };
const LOBO_CRI   = { id: 74,  nome: 'Lobo-cinzento', subtipo: 'Lobo',  montaria: false };
const PONEI_CRI  = { id: 135, nome: 'Pônei-de-telas', subtipo: 'Pônei', montaria: true };

const MONTARIAS = 'Cavalo, Grifo, Dragão, Avestruz, Pônei, Elefante, Camelo';
const CAT = {
  cavalo_quarter: { slug: 'cavalo_quarter', nome: 'Cavalo do Rei', grupo: 'Animais', criatura_id: 157 },
  urso_negro:     { slug: 'urso_negro', nome: 'Urso Negro', grupo: 'Animais', criatura_id: 142 },
  lobo:           { slug: 'lobo', nome: 'Lobo-cinzento', grupo: 'Animais', criatura_id: 74 },
  sela_de_guerra: { slug: 'sela_de_guerra', nome: 'Sela de Guerra', grupo: 'Arreios', ocupa: 6.5,
                    slot_arreio: 'sela', animal_subtipos: MONTARIAS },
  sela_de_jornada: { slug: 'sela_de_jornada', nome: 'Sela de Jornada', grupo: 'Arreios', ocupa: 5,
                     slot_arreio: 'sela', animal_subtipos: MONTARIAS },
  barda:          { slug: 'barda', nome: 'Barda', grupo: 'Arreios', ocupa: 12,
                    slot_arreio: 'barda', animal_subtipos: MONTARIAS, absorcao: 8, defesa: 3 },
  carroca:        { slug: 'carroca', nome: 'Carroça', grupo: 'Transportes', armazena: 60,
                    slot_arreio: 'atrelado', animal_subtipos: 'Cavalo, Boi, Vaca, Touro, Búfalo, Camelo' },
  treno:          { slug: 'treno', nome: 'Trenó', grupo: 'Transportes', armazena: 10,
                    slot_arreio: 'atrelado', animal_subtipos: 'Cão, Lobo, Raposa, Javali' },
  // Sem animal_subtipos: carga comum, serve em qualquer bicho.
  corda:          { slug: 'corda', nome: 'Corda', grupo: 'Itens', ocupa: 2 },
};

const inv = (...extra) => [
  { instanceId: 'cav', slug: 'cavalo_quarter', quantidade: 1 },
  { instanceId: 'urso', slug: 'urso_negro', quantidade: 1 },
  { instanceId: 'lob', slug: 'lobo', quantidade: 1 },
  ...extra,
];
const por = (itens, itemId, animalId, criatura) =>
  equiparNoAnimal(itens, itemId, animalId, CAT, criatura);

/* OS ARREIOS MORAM EM VESTIMENTAS E ARMADURAS desde 06/10/2026 ("os itens do
   tipo arreios, são vestimentas ou armaduras"). Isso criou um risco novo: a
   sela passou a casar com o teste de grupo de ehVestimenta, e o inventário
   ofereceria VESTIR uma sela no personagem. Quem segura a porta é a coluna
   slot_arreio — e é por isso que ela é testada aqui. */
describe('arreamento não se veste em gente', () => {
  const ehVestimenta = () => window.ehVestimenta;

  it('a sela está em Vestimentas e MESMO ASSIM não é vestimenta de gente', () => {
    const sela = { ...CAT.sela_de_guerra, grupo: 'Vestimentas' };
    expect(sela.slot_arreio).toBe('sela');
    expect(ehVestimenta()(sela)).toBe(false);
  });

  it('a barda está em Armaduras e também fica fora do vestir', () => {
    expect(ehVestimenta()({ ...CAT.barda, grupo: 'Armaduras' })).toBe(false);
  });

  it('a roupa de gente continua sendo vestimenta', () => {
    expect(ehVestimenta()({ slug: 'capa_simples', grupo: 'Vestimentas' })).toBe(true);
  });

  it('a carroça também tem casa no bicho, e também não se veste', () => {
    expect(ehVestimenta()({ ...CAT.carroca, grupo: 'Vestimentas' })).toBe(false);
  });
});

describe('animalAceitaAPeca — a peça de montaria olha criaturas.montaria', () => {
  it('serve em quem pode ser montado', () => {
    expect(animalAceitaAPeca(CAT.sela_de_guerra, CAVALO_CRI)).toBe(true);
    expect(animalAceitaAPeca(CAT.sela_de_guerra, PONEI_CRI)).toBe(true);
  });

  it('e não serve em quem não pode', () => {
    expect(animalAceitaAPeca(CAT.sela_de_guerra, URSO_CRI)).toBe(false);
    expect(animalAceitaAPeca(CAT.barda, LOBO_CRI)).toBe(false);
  });

  /* O caso que a lista de sete subtipos errava: o Pégaso, o Unicórnio e a Mula
     são montaria no banco e não estavam no CSV — ficavam sem sela. */
  it('o bicho montável FORA da antiga lista de sete agora recebe a peça', () => {
    const PEGASO = { id: 201, nome: 'Pégaso', subtipo: 'Pégaso', montaria: true };
    const UNICORNIO = { id: 202, nome: 'Unicórnio', subtipo: 'Unicórnio', montaria: true };
    const MULA = { id: 203, nome: 'Mula-somali', subtipo: 'Mula', montaria: true };
    for (const bicho of [PEGASO, UNICORNIO, MULA]) {
      expect(animalAceitaAPeca(CAT.sela_de_guerra, bicho)).toBe(true);
      expect(animalAceitaAPeca(CAT.barda, bicho)).toBe(true);
    }
  });

  it('e o CSV da peça de montaria não manda mais em nada', () => {
    // Lista que exclui o cavalo: a peça continua servindo, porque ele é montaria.
    const selaComListaVelha = { ...CAT.sela_de_guerra, animal_subtipos: 'Avestruz' };
    expect(animalAceitaAPeca(selaComListaVelha, CAVALO_CRI)).toBe(true);
    // E lista nenhuma não abre a porta para quem não se monta.
    expect(animalAceitaAPeca({ ...CAT.sela_de_guerra, animal_subtipos: null }, URSO_CRI)).toBe(false);
  });

  it('montaria é o true explícito: "não sei" não é "pode"', () => {
    expect(animalAceitaAPeca(CAT.sela_de_guerra, null)).toBe(false);
    expect(animalAceitaAPeca(CAT.sela_de_guerra, { subtipo: 'Cavalo' })).toBe(false);
    expect(animalAceitaAPeca(CAT.sela_de_guerra, { montaria: 'sim' })).toBe(false);
  });
});

describe('animalAceitaAPeca — o atrelado continua no CSV do subtipo', () => {
  it('quem puxa não precisa ser montável: o lobo puxa o trenó', () => {
    expect(LOBO_CRI.montaria).toBe(false);
    expect(animalAceitaAPeca(CAT.treno, LOBO_CRI)).toBe(true);
    expect(subtiposDaPeca(CAT.treno)).toEqual(['cao', 'lobo', 'raposa', 'javali']);
  });

  it('e cada veículo continua no bicho da sua lista, nunca no outro', () => {
    expect(animalAceitaAPeca(CAT.carroca, CAVALO_CRI)).toBe(true);
    expect(animalAceitaAPeca(CAT.carroca, LOBO_CRI)).toBe(false);
    expect(animalAceitaAPeca(CAT.treno, CAVALO_CRI)).toBe(false);
  });

  it('acento e caixa não contam: "Cão" casa com "cao"', () => {
    expect(animalAceitaAPeca({ slot_arreio: 'atrelado', animal_subtipos: 'Cão' }, { subtipo: 'cao' })).toBe(true);
  });

  it('peça SEM casa e SEM lista serve em qualquer bicho — a restrição é opcional', () => {
    expect(animalAceitaAPeca(CAT.corda, URSO_CRI)).toBe(true);
    expect(animalAceitaAPeca(CAT.corda, { subtipo: null })).toBe(true);
  });
});

describe('equiparNoAnimal — a peça no bicho', () => {
  it('a sela vai para a casa da sela no cavalo', () => {
    const r = por(inv({ instanceId: 's1', slug: 'sela_de_guerra', quantidade: 1 }), 's1', 'cav', CAVALO_CRI);
    expect(r.ok).toBe(true);
    expect(r.slot).toBe('sela');
    const peca = r.itens.find((x) => x.instanceId === 's1');
    expect(peca.animal_id).toBe('cav');
    expect(peca.slot_animal).toBe('sela');
  });

  /* O aviso da peça de montaria é uma frase, não uma lista de vinte subtipos:
     a regra cabe nela. O atrelado, que continua no CSV, segue nomeando os
     tipos — senão o jogador adivinha. */
  it('a mesma sela no urso é recusada, e o aviso diz a regra', () => {
    const r = por(inv({ instanceId: 's1', slug: 'sela_de_guerra', quantidade: 1 }), 's1', 'urso', URSO_CRI);
    expect(r.ok).toBe(false);
    expect(r.motivo).toBe('nao_e_montaria');
    expect(motivoAnimalLabel('nao_e_montaria', false, CAT.sela_de_guerra))
      .toBe('Esta peça só serve em animais que podem ser montados.');
    expect(motivoAnimalLabel('nao_e_montaria', true, CAT.sela_de_guerra))
      .toBe('This piece only fits animals that can be ridden.');
  });

  it('e o aviso do atrelado continua nomeando os tipos que puxam', () => {
    expect(motivoAnimalLabel('animal_errado', false, CAT.treno))
      .toBe('Esta peça só serve em: Cão, Lobo, Raposa, Javali.');
  });

  it('a carroça atrela no cavalo; o trenó, no lobo — e nunca o contrário', () => {
    expect(por(inv({ instanceId: 'v1', slug: 'carroca', quantidade: 1 }), 'v1', 'cav', CAVALO_CRI))
      .toMatchObject({ ok: true, slot: 'atrelado' });
    expect(por(inv({ instanceId: 'v1', slug: 'treno', quantidade: 1 }), 'v1', 'lob', LOBO_CRI))
      .toMatchObject({ ok: true, slot: 'atrelado' });
    expect(por(inv({ instanceId: 'v1', slug: 'carroca', quantidade: 1 }), 'v1', 'lob', LOBO_CRI).motivo)
      .toBe('animal_errado');
    expect(por(inv({ instanceId: 'v1', slug: 'treno', quantidade: 1 }), 'v1', 'cav', CAVALO_CRI).motivo)
      .toBe('animal_errado');
    // O atrelado não virou peça de montaria no caminho.
    expect(window.ehPecaDeMontaria(CAT.carroca)).toBe(false);
    expect(window.ehPecaDeMontaria(CAT.sela_de_guerra)).toBe(true);
  });

  it('a SEGUNDA sela é recusada, não guardada na mochila do bicho', () => {
    const itens = inv(
      { instanceId: 's1', slug: 'sela_de_guerra', quantidade: 1, animal_id: 'cav', slot_animal: 'sela' },
      { instanceId: 's2', slug: 'sela_de_jornada', quantidade: 1 },
    );
    const r = por(itens, 's2', 'cav', CAVALO_CRI);
    expect(r.ok).toBe(false);
    expect(r.motivo).toBe('slot_ocupado');
  });

  it('mas a carga comum continua caindo na mochila do bicho', () => {
    const r = por(inv({ instanceId: 'k1', slug: 'corda', quantidade: 1 }), 'k1', 'urso', URSO_CRI);
    expect(r).toMatchObject({ ok: true, slot: 'mochila' });
  });

  it('a peça sai do recipiente ao subir no bicho', () => {
    const itens = inv({ instanceId: 's1', slug: 'sela_de_guerra', quantidade: 1, containerId: 'bolsa' });
    const r = por(itens, 's1', 'cav', CAVALO_CRI);
    expect(r.ok).toBe(true);
    expect(r.itens.find((x) => x.instanceId === 's1').containerId).toBeNull();
  });
});

/* O PESO (05/10/2026): uma Barda ocupa 12 e uma Sela de Guerra 6,5. Somadas na
   carga do personagem, vestir o cavalo o deixava sobrecarregado — ele não
   carrega a sela, o cavalo carrega. */
describe('o que está no bicho não pesa nas costas do personagem', () => {
  const pesoDe = (itens) => calcCarga(itens, CAT, 3, 3).peso;

  it('a sela e a barda soltas pesam; apontadas para o animal, não', () => {
    const soltas = [
      { instanceId: 's1', slug: 'sela_de_guerra', quantidade: 1 },
      { instanceId: 'b1', slug: 'barda', quantidade: 1 },
    ];
    expect(pesoDe(soltas)).toBeCloseTo(18.5);
    const noBicho = soltas.map((x) => ({ ...x, animal_id: 'cav', slot_animal: 'sela' }));
    expect(pesoDe(noBicho)).toBe(0);
  });

  it('e o que continua na mochila segue pesando', () => {
    expect(pesoDe([
      { instanceId: 's1', slug: 'sela_de_guerra', quantidade: 1, animal_id: 'cav' },
      { instanceId: 'k1', slug: 'corda', quantidade: 1 },
    ])).toBeCloseTo(2);
  });
});
