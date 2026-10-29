/* ============================================================
   arte-arreamento.test.jsx — as doze casas do bicho, todas pintadas
   ============================================================
   Pedido do usuário em 27/10/2026: "Crie os itens no sistema e no figma para
   a montaria. Os animais que podem ser montados, podem usar os itens de
   montaria."

   As treze peças já existiam desde 05/10/2026 (arreamento-e-atrelado), mas só
   QUATRO casas tinham pintura: sela, arreio, alforje e atrelado. Gualdrapa e
   Manta tomavam emprestada a do Arreio, e seis peças caíam no glifo. As oito
   que faltavam foram pintadas no Figma e ligadas em três lugares — e são os
   três que este arquivo protege, porque esquecer qualquer um deles devolve o
   glifo sem erro nenhum:

     1. o arquivo no disco (public/itens/<base>.webp);
     2. a BASE no vocabulário (01-core/bases-item.jsx), que é quem liga o item
        do catálogo à pintura;
     3. o REGISTRO ARTE_ITEM_NOVA (ficha.jsx) — arteDaBase só devolve caminho
        para arquivo registrado, e foi exatamente aqui que a ligação falhou
        primeiro: a casa vazia já mostrava a silhueta (ARTE_ARREIO_VAZIO monta
        o caminho direto) enquanto a casa CHEIA ainda caía no glifo.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

beforeAll(async () => {
  await import('../01-core/copy.jsx');
  await import('../01-core/constants.jsx');
  await import('../01-core/helpers.jsx');
  await import('../01-core/inventario-helpers.jsx');
  await import('../01-core/bases-item.jsx');
  await import('../01-core/select-pill.jsx');
  await import('../01-core/clima-desgaste.jsx');
  await import('../01-core/game-data.jsx');
  await import('../01-core/forma-raca.jsx');
  await import('../01-core/tecnicas-efeito.jsx');
  await import('../01-core/magias-efeito.jsx');
  await import('../01-core/status-efeito.jsx');
  await import('../01-core/efeito-temporario.jsx');
  await import('../01-core/fabricacao.jsx');
  await import('../09-bestiario/criatura-formulas.jsx');
  await import('../12-batalha/batalha.jsx');
  await import('../10-shell/shell.jsx');
  await import('../07-inventario/inventario.jsx');
  await import('./atalhos-ficha.jsx');
  await import('./ficha.jsx');
});

/* As treze peças do catálogo, com a casa e a base que o banco guarda
   (scripts/sql/montaria-aceita-arreamento-2026-10-27.sql). */
const PECAS = [
  ['Cabeçada e Rédeas',      'cabecada',   'cabecada'],
  ['Arreio',                 'arreio',     'arreio'],
  ['Manta de Sela',          'manta',      'manta'],
  ['Gualdrapa',              'gualdrapa',  'gualdrapa'],
  ['Sela de Jornada',        'sela',       'sela'],
  ['Sela de Torneio',        'sela',       'sela'],
  ['Sela de Guerra',         'sela',       'sela'],
  ['Alforje de Sela',        'alforje',    'alforge'],
  ['Peitoral de Montaria',   'peitoral',   'peitoral-montaria'],
  ['Crinum',                 'crinum',     'crinum'],
  ['Chanfron',               'chanfron',   'chanfron'],
  ['Caneleiras de Montaria', 'caneleiras', 'caneleiras-montaria'],
  ['Barda',                  'barda',      'barda'],
];

describe('a pintura de cada peça de arreamento', () => {
  it.each(PECAS)('%s (casa %s) tem pintura própria pela base %s', (nome, casa, base) => {
    const cat = { nome, slug: nome.toLowerCase(), base, slot_equip: null, slot_arreio: casa };
    expect(window.arteDoItem(cat)).toBe('/itens/' + base + '.webp');
  });

  it('e o arquivo existe no disco', () => {
    for (const [, , base] of PECAS) {
      expect(existsSync(resolve(raiz, 'public/itens', base + '.webp')), base).toBe(true);
    }
  });

  /* Gualdrapa e Manta dividiam a pintura do Arreio: três casas lado a lado
     com a mesma imagem. Agora cada uma é a sua. */
  it('Gualdrapa e Manta não usam mais a pintura do Arreio', () => {
    const arte = (base) => window.arteDoItem({ nome: base, base, slot_equip: null });
    expect(arte('gualdrapa')).not.toBe(arte('arreio'));
    expect(arte('manta')).not.toBe(arte('arreio'));
    expect(new Set(PECAS.map(([, , b]) => b)).size).toBe(11); // só as 3 selas repetem
  });
});

describe('as doze casas vazias têm silhueta', () => {
  const fonte = readFileSync(resolve(raiz, 'src/11-ficha/ficha.jsx'), 'utf8');
  const bloco = (nome) => {
    const m = fonte.match(new RegExp('const ' + nome + ' = \\{[\\s\\S]*?\\n\\};'));
    return m ? m[0] : '';
  };

  it('nenhuma casa do mapa do bicho ficou sem arquivo', () => {
    const regioes = [...bloco('ARREIO_REGIOES').matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1]);
    const vazias = [...bloco('ARTE_ARREIO_VAZIO').matchAll(/(\w[\w-]*): '([\w-]+)'/g)];
    expect(regioes).toHaveLength(12);
    const porCasa = Object.fromEntries(vazias.map((m) => [m[1], m[2]]));
    for (const casa of regioes) {
      expect(porCasa[casa], 'casa sem silhueta: ' + casa).toBeTruthy();
      expect(existsSync(resolve(raiz, 'public/itens', porCasa[casa] + '.webp')), porCasa[casa]).toBe(true);
    }
  });
});

/* O elo que falhou primeiro: a base pode existir e o arquivo pode estar no
   disco, e mesmo assim arteDaBase devolver null por falta de registro. */
describe('o vocabulário e o registro andam juntos', () => {
  it('toda base da família Montaria está registrada em ARTE_ITEM_NOVA', () => {
    const montaria = window.BASES_ITEM.filter((b) => b.familia === 'Montaria');
    expect(montaria.length).toBeGreaterThanOrEqual(11);
    for (const b of montaria) {
      const arquivo = b.arte || b.slug;
      expect(existsSync(resolve(raiz, 'public/itens', arquivo + '.webp')), arquivo).toBe(true);
      // Se está no disco e no vocabulário, tem de aparecer na tela.
      expect(window.arteDoItem({ nome: b.nome, base: b.slug, slot_equip: null }), b.slug)
        .toBe('/itens/' + arquivo + '.webp');
    }
  });

  /* Peitoral e Caneleiras também são peça de GENTE: a base do bicho é outra. */
  it('o peitoral e as caneleiras do cavaleiro não viraram os do cavalo', () => {
    const pessoa = window.BASES_ITEM.filter((b) => ['peitoral-medio', 'caneleiras-medio'].includes(b.slug));
    expect(pessoa).toHaveLength(2);
    for (const b of pessoa) expect(b.familia).not.toBe('Montaria');
  });
});
