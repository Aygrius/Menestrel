/* ============================================================
   nome-do-animal.test.js — a raça é do catálogo, o nome é do dono
   ============================================================
   Pedido do usuário (06/10/2026):
     "Na ficha do animal, o que é atualmente 'nome' será 'Raça', e o nome
      poderá ser informado pelo seu dono, se assim desejar."

   O catálogo guarda a ESPÉCIE — "Cavalo Quarter" —, e chamar isso de nome era
   um atalho. O nome próprio é do dono e mora na instância do inventário, o que
   põe duas coisas em jogo:

   1. "SE ASSIM DESEJAR" — é opcional. Sem nome dado, o bicho continua sendo
      chamado pela raça em TODO lugar; nenhuma tela pode ficar com um vazio por
      causa de um campo que ninguém preencheu.
   2. DOIS BICHOS DA MESMA RAÇA têm nomes diferentes. É por isso que o nome não
      pode ser do catálogo: lá ele seria um só para os dois.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../09-bestiario/criatura-formulas.jsx';
import '../01-core/animal-experiencia.jsx';
import '../10-shell/shell.jsx';
import './inventario.jsx';

let nomeDoAnimal, racaDoAnimal, comNomeDoAnimal, animaisDoPersonagem, NOME_ANIMAL_MAX;
beforeAll(() => {
  ({ nomeDoAnimal, racaDoAnimal, comNomeDoAnimal, animaisDoPersonagem, NOME_ANIMAL_MAX } = window);
  expect(nomeDoAnimal).toBeTypeOf('function');
});

const CAVALO = { id: 157, nome: 'Cavalo Quarter', estagio: 4, peso: 400, aura: 0, fisico: 3, agilidade: 2 };
const CAT = { slug: 'cavalo_quarter', nome: 'Cavalo Quarter', grupo: 'Animais', criatura_id: 157 };
const CATALOGO = { cavalo_quarter: CAT };
const CRIATURAS = { 157: CAVALO };
const inst = (extra) => ({ instanceId: 'c1', slug: 'cavalo_quarter', quantidade: 1, ...extra });

describe('o nome e a raça', () => {
  it('a raça é sempre o nome do catálogo', () => {
    expect(racaDoAnimal(CAT, CAVALO)).toBe('Cavalo Quarter');
    expect(racaDoAnimal(null, CAVALO)).toBe('Cavalo Quarter');   // sem item, a criatura
    expect(racaDoAnimal(null, null)).toBe('');
  });

  it('sem nome dado, o bicho é chamado pela raça', () => {
    expect(nomeDoAnimal(inst(), CAT, CAVALO)).toBe('Cavalo Quarter');
    expect(nomeDoAnimal(inst({ nome: '' }), CAT, CAVALO)).toBe('Cavalo Quarter');
    expect(nomeDoAnimal(inst({ nome: '   ' }), CAT, CAVALO)).toBe('Cavalo Quarter');
  });

  it('com nome dado, é o nome — e a raça não muda', () => {
    const i = inst({ nome: 'Trovão' });
    expect(nomeDoAnimal(i, CAT, CAVALO)).toBe('Trovão');
    expect(racaDoAnimal(CAT, CAVALO)).toBe('Cavalo Quarter');
  });
});

describe('batizar e desbatizar', () => {
  it('grava o nome na instância, não no catálogo', () => {
    const out = comNomeDoAnimal([inst()], 'c1', 'Trovão');
    expect(out[0].nome).toBe('Trovão');
    expect(CAT.nome).toBe('Cavalo Quarter');   // o catálogo é de todos
  });

  it('dois da mesma raça, nomes diferentes', () => {
    let itens = [inst(), inst({ instanceId: 'c2' })];
    itens = comNomeDoAnimal(itens, 'c1', 'Trovão');
    itens = comNomeDoAnimal(itens, 'c2', 'Brisa');
    expect(itens.map((i) => nomeDoAnimal(i, CAT, CAVALO))).toEqual(['Trovão', 'Brisa']);
  });

  it('apagar o texto desfaz o batismo: o campo sai da instância', () => {
    const batizado = comNomeDoAnimal([inst()], 'c1', 'Trovão');
    const out = comNomeDoAnimal(batizado, 'c1', '  ');
    expect('nome' in out[0]).toBe(false);
    expect(nomeDoAnimal(out[0], CAT, CAVALO)).toBe('Cavalo Quarter');
  });

  it('espaço em volta não vira nome, e o limite é respeitado', () => {
    expect(comNomeDoAnimal([inst()], 'c1', '  Trovão  ')[0].nome).toBe('Trovão');
    const longo = 'x'.repeat(NOME_ANIMAL_MAX + 20);
    expect(comNomeDoAnimal([inst()], 'c1', longo)[0].nome).toHaveLength(NOME_ANIMAL_MAX);
  });

  it('gravar o mesmo nome devolve a MESMA lista — nada a salvar', () => {
    const itens = [inst({ nome: 'Trovão' })];
    expect(comNomeDoAnimal(itens, 'c1', 'Trovão')).toBe(itens);
    expect(comNomeDoAnimal([inst()], 'c1', '')).toBeTruthy();
    const semNome = [inst()];
    expect(comNomeDoAnimal(semNome, 'c1', '')).toBe(semNome);
  });

  it('instanceId que não existe não mexe em ninguém', () => {
    const itens = [inst()];
    expect(comNomeDoAnimal(itens, 'zzz', 'Trovão')).toBe(itens);
  });
});

describe('animaisDoPersonagem resolve nome e raça de uma vez', () => {
  it('entrega `nome` e `raca` prontos, para nenhuma tela repetir a regra', () => {
    const [a] = animaisDoPersonagem([inst({ nome: 'Trovão' })], CATALOGO, CRIATURAS);
    expect(a.nome).toBe('Trovão');
    expect(a.raca).toBe('Cavalo Quarter');
  });

  it('sem nome dado, `nome` é a raça', () => {
    const [a] = animaisDoPersonagem([inst()], CATALOGO, CRIATURAS);
    expect(a.nome).toBe('Cavalo Quarter');
    expect(a.raca).toBe('Cavalo Quarter');
  });
});
