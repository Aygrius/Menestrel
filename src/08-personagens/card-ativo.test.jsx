/* ============================================================
   card-ativo.test.jsx — o card de personagem sob a regra do PJ ativo
   ============================================================
   Regra do usuário (12/09/2026): "Depois que um jogador selecionar o
   personagem, todos os demais menus serão seu ponto de vista" e "depois de
   selecionar um personagem, ele vira o centro das atenções, é ele que
   importa."

   O que se exige aqui:
     • a seta de evoluir (.pj-evoluiu) só aparece no personagem ATIVO. Ela
       aparecia em qualquer card com pontos a distribuir e convidava o
       jogador a evoluir alguém que ele nem selecionou;
     • o Mestre é a exceção — ele não tem PJ ativo e administra todos;
     • o card bloqueado (há outro ativo) não oferece ação nenhuma nem
       explica por quê: ele apenas recua;
     • o ativo carrega o selo "Ativo" e a classe que o faz tomar a linha
       inteira da grade.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './personagens.jsx';

let PersonagemCard;
beforeAll(() => { PersonagemCard = window.PersonagemCard; });
afterEach(cleanup);

/* experiencia alta + nivel_visto 1 = estágio novo com pontos a distribuir,
   que é o gatilho de temLevelUpPendente (e, portanto, da seta). */
const PJ = {
  id: 'pj-1', user_id: 'u-1',
  nome: 'Thalia', sobrenome: 'de Auren',
  experiencia: 100000, nivel_visto: 1,
};

function montar(props) {
  return render(
    <PersonagemCard
      p={PJ}
      isMaster={false}
      isOwn
      lang="pt"
      playerName="Richard"
      onEdit={() => {}}
      onDelete={() => {}}
      onGiveXp={() => {}}
      onGiveMoedas={() => {}}
      {...props}
    />
  );
}

describe('seta de evoluir', () => {
  it('aparece no personagem ativo', () => {
    const { container } = montar({ ativo: true, onDesativar: () => {} });
    expect(container.querySelector('.pj-evoluiu')).not.toBeNull();
  });

  it('NÃO aparece em personagem bloqueado por outro ativo', () => {
    const { container } = montar({ bloqueadoPorOutroAtivo: true });
    expect(container.querySelector('.pj-evoluiu')).toBeNull();
  });

  it('NÃO aparece enquanto o jogador não escolheu ninguém', () => {
    const { container } = montar({ onAtivar: () => {} });
    expect(container.querySelector('.pj-evoluiu')).toBeNull();
  });

  it('aparece para o Mestre, que não tem PJ ativo', () => {
    const { container } = montar({ isMaster: true });
    expect(container.querySelector('.pj-evoluiu')).not.toBeNull();
  });
});

describe('ativo, inativo e bloqueado', () => {
  it('o ativo mostra o selo e a ação de desativar', () => {
    const { container } = montar({ ativo: true, onDesativar: () => {} });
    expect(container.querySelector('.pj-card-selo').textContent).toContain('Ativo');
    expect(screen.getByRole('button', { name: /Desativar/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Selecionar/ })).toBeNull();
  });

  it('o ativo toma a linha inteira da grade', () => {
    const { container } = montar({ ativo: true, onDesativar: () => {} });
    expect(container.querySelector('.pj-card-wrap--ativo')).not.toBeNull();
  });

  it('o inativo oferece selecionar, sem selo', () => {
    const { container } = montar({ onAtivar: () => {} });
    expect(screen.getByRole('button', { name: /Selecionar/ })).toBeTruthy();
    expect(container.querySelector('.pj-card-selo')).toBeNull();
  });

  it('o bloqueado não oferece ação nem explica por quê', () => {
    const { container } = montar({ bloqueadoPorOutroAtivo: true, onAtivar: () => {} });
    expect(container.querySelector('.pj-card-foot')).toBeNull();
    expect(container.querySelector('.pj-card--inerte')).not.toBeNull();
    // A frase "outro personagem está ativo" saiu a pedido do usuário.
    expect(container.textContent).not.toMatch(/outro personagem/i);
  });
});
