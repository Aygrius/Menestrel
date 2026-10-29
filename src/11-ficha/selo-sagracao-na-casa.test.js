/* ============================================================
   selo-sagracao-na-casa.test.js — o +N aparece em TODA casa da ficha
   ============================================================
   "A informação que a arma está +5, etc, precisa acompanhar o item para o
    personagem ver que a arma dele foi melhorada." (usuário, 28/10/2026)

   "Na ficha dos personagens está aparecendo o '+5' na arma, escudo e peito,
    mas não está aparecendo dos demais itens." (usuário, 28/10/2026)

   A segunda frase é a consequência da primeira ter sido atendida pela metade.
   O boneco desenha uma casa por DOIS caminhos:

     • `fpSlotTile` — a região de UMA vaga (Cabeça, Dorso) e as mãos;
     • o botão dentro de `fpRegiao` — a região de VÁRIAS vagas (Rosto, Orelha,
       Pescoço, Dedo, Pulso, Alforje, Canela…).

   O selo nasceu só no primeiro. Quem tivesse um anel ou um capuz sagrado via
   a pintura da peça sem nenhum sinal de que ela foi melhorada.

   Este teste lê a FONTE porque é a duplicação que ele protege: os dois
   caminhos existem e vão continuar existindo, e o risco é um deles ganhar
   um adorno que o outro não ganha. Um teste de render passaria com um só.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const fonte = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'ficha.jsx'),
  'utf8',
);

/* O repositório é core.autocrlf=true: toda regex sobre a fonte precisa de
   `\r?\n` (ver CLAUDE.md). */
const corpoDe = (abre, fecha) => {
  const i = fonte.indexOf(abre);
  if (i < 0) return '';
  const j = fonte.indexOf(fecha, i);
  return j < 0 ? fonte.slice(i) : fonte.slice(i, j);
};

describe('o selo +N da Sagração', () => {
  it('existe na casa de UMA vaga (fpSlotTile)', () => {
    /* Até `fpGroup`, que é a próxima função da fonte: parar em `fpMao`
       engoliria `fpRegiao` junto, e o teste passaria com o selo em um só
       dos dois caminhos — exatamente o defeito que ele existe para pegar. */
    const corpo = corpoDe('const fpSlotTile =', 'const fpGroup');
    expect(corpo, 'fpSlotTile não foi encontrada na fonte').not.toBe('');
    expect(corpo).toMatch(/inv-selo-bonus/);
  });

  it('existe também na região de VÁRIAS vagas (o botão de fpRegiao)', () => {
    const corpo = corpoDe('const fpRegiao =', 'const fpMao');
    expect(corpo, 'fpRegiao não foi encontrada na fonte').not.toBe('');
    expect(corpo, 'a região de várias casas ficou sem o selo +N').toMatch(/inv-selo-bonus/);
  });

  /* O selo é o MESMO do inventário — mesma classe, mesma pastilha. Se alguém
     criar uma segunda classe para o mesmo sinal, as duas telas divergem. */
  it('é a mesma classe que o inventário usa', () => {
    const inv = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../07-inventario/inventario.jsx'),
      'utf8',
    );
    expect(inv).toMatch(/inv-selo-bonus/);
  });

  /* Quem pode ter bônus é arma e armadura (regra de 15/09/2026). Vestimenta,
     instrumento e recipiente não têm Sagração — e por isso nunca terão selo.
     Está aqui para a próxima pessoa não procurar um defeito onde há regra. */
  it('o destino do bônus segue sendo só arma e armadura', async () => {
    await import('../01-core/copy.jsx');
    await import('../01-core/constants.jsx');
    await import('../01-core/inventario-helpers.jsx');
    const destino = window.destinoBonusItem;
    expect(destino({ grupo: 'Armas', dano: 10 })).toBe('dano');
    expect(destino({ grupo: 'Armaduras' })).toBe('absorcao');
    expect(destino({ grupo: 'Vestimentas' })).toBeNull();
    expect(destino({ grupo: 'Instrumentos' })).toBeNull();
    expect(destino({ grupo: 'Recipientes' })).toBeNull();
  });
});
