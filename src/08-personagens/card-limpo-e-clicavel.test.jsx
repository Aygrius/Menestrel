/* ============================================================
   card-limpo-e-clicavel.test.jsx — o card de personagem sem barra de ações
   ============================================================
   Rodada de 17/09/2026, três pedidos que caem no mesmo cabeçalho do card:

     "Remova do card dos personagens o botão e o sistema de conceder moedas aos
      jogadores, pois agora o sistema de moedas será por meio da loja."
     "Remova do card dos personagens o botão de ficha, agora, ao clicar no
      card, irá entrar na ficha."
     "Remova do card dos personagens o botão de dar experiência, ao clicar
      sobre a barra de experiência dentro da ficha o mestre será capaz de
      aumentar e diminuir a experiência como as outras barras."

   Os três botões moravam lado a lado em .pj-card-actions, e com eles foi a
   barra inteira. O que este arquivo trava é o que sobrou no lugar: o CARD é
   quem abre a ficha, e ele abre a ficha certa para cada perfil — a de qualquer
   PJ para o Mestre, a do próprio ativo para o Jogador. Para quem ainda não
   escolheu personagem, o clique continua sendo o de sempre (ativar): não há
   ficha a abrir antes de haver personagem escolhido.

   A parte do XP dentro da ficha vive em 11-ficha/experiencia-barra.test.jsx.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './personagens.jsx';

let PersonagemCard;
beforeAll(() => {
  PersonagemCard = window.PersonagemCard;
  expect(PersonagemCard, 'PersonagemCard precisa estar no window').toBeTypeOf('function');
});
afterEach(cleanup);

const PJ = { id: 'pj-1', user_id: 'u-1', nome: 'Thalia', sobrenome: 'de Auren', experiencia: 40, nivel_visto: 4 };

function montar(props) {
  return render(
    <PersonagemCard p={PJ} isMaster={false} isOwn lang="pt" playerName="Richard"
      onEdit={() => {}} onDelete={() => {}} {...props} />
  );
}

const card = (c) => c.querySelector('.pj-card');

describe('a barra de ações do cabeçalho não existe mais', () => {
  it('o Mestre não vê moedas, experiência nem ficha no card', () => {
    const { container } = montar({ isMaster: true, onAbrirFicha: () => {} });
    expect(container.querySelector('.pj-card-actions')).toBeNull();
    expect(container.querySelector('.pj-card-action-moedas')).toBeNull();
    expect(container.querySelector('.pj-card-action-xp')).toBeNull();
    expect(container.querySelector('.pj-card-action-ficha')).toBeNull();
  });

  it('e o Jogador também não', () => {
    const { container } = montar({ onAtivar: () => {} });
    expect(container.querySelector('.pj-card-actions')).toBeNull();
  });
});

/* O modal de conceder moedas era o único chamador da RPC mestre_ajustar_moedas
   no front. Sem ele, quem mexe no saldo é a loja. */
describe('conceder moedas saiu do módulo', () => {
  it('DarMoedasModal não é mais exportado', () => {
    expect(window.DarMoedasModal).toBeUndefined();
  });

  it('DarExperienciaModal também não', () => {
    expect(window.DarExperienciaModal).toBeUndefined();
  });
});

describe('o clique no card abre a ficha', () => {
  it('Mestre: qualquer card leva à ficha daquele PJ', () => {
    let abriu = 0;
    const { container } = montar({ isMaster: true, onAbrirFicha: () => { abriu++; } });
    expect(card(container).classList.contains('is-clickable')).toBe(true);
    card(container).click();
    expect(abriu).toBe(1);
  });

  it('Jogador: o card do seu personagem ATIVO leva à ficha dele', () => {
    let abriu = 0; let ativou = 0;
    const { container } = montar({
      ativo: true, onAbrir: () => { abriu++; }, onAtivar: () => { ativou++; }, onDesativar: () => {},
    });
    card(container).click();
    expect(abriu).toBe(1);
    expect(ativou).toBe(0);
  });

  /* Antes de escolher, não há ficha para abrir — o clique continua ativando. */
  it('Jogador: o card de quem ainda não é ativo continua ativando', () => {
    let ativou = 0;
    const { container } = montar({ onAtivar: () => { ativou++; } });
    card(container).click();
    expect(ativou).toBe(1);
  });

  it('e o card bloqueado por outro ativo segue sem clique', () => {
    let abriu = 0; let ativou = 0;
    const { container } = montar({
      bloqueadoPorOutroAtivo: true, onAtivar: () => { ativou++; }, onAbrir: () => { abriu++; },
    });
    expect(card(container).classList.contains('is-clickable')).toBe(false);
    card(container).click();
    expect(ativou).toBe(0);
    expect(abriu).toBe(0);
  });
});

/* "Na visão do mestre e do jogador, teremos apenas 1 card de personagem por
   linha." (usuário, 17/09/2026). jsdom não resolve cascata, então quem
   responde é a folha. */
describe('um card por linha', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', 'index.css'), 'utf8');

  it('a grade tem uma coluna só', () => {
    const i = css.indexOf('#root .menestrel-ui .pjs-grid {');
    expect(i, 'não achei a regra da grade').toBeGreaterThan(-1);
    const regra = css.slice(i, css.indexOf('}', i));
    expect(regra).toMatch(/grid-template-columns:\s*1fr/);
    expect(regra).not.toMatch(/repeat\(/);
  });

  it('e não sobrou media query devolvendo colunas', () => {
    expect(css).not.toMatch(/\.pjs-grid \{ grid-template-columns: repeat/);
  });
});
