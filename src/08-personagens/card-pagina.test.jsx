/* ============================================================
   card-pagina.test.jsx — um personagem por página, para o Jogador (17/11/2026)
   ============================================================
   Usuário: "Conectado como jogador, a página de personagens vai ter apenas um
   card por página, com a foto do personagem ocupando metade da tela, e as
   informações mais importantes do personagem ocupando a outra metade. No
   rodapé, o menu de navegação (se houver mais de um personagem)."
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/status-efeito.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './personagens.jsx';
import '../11-ficha/ficha.jsx';
import '../12-batalha/batalha.jsx';

const aqui = dirname(fileURLToPath(import.meta.url));
const fonte = readFileSync(resolve(aqui, 'personagens.jsx'), 'utf8');

let PersonagemCard;
beforeAll(() => { PersonagemCard = window.PersonagemCard; });
afterEach(cleanup);

const PJ = {
  id: 'pj-1', user_id: 'u-1', nome: 'Thalia', sobrenome: 'de Auren',
  raca: 'Humano', profissao: 'Mago', experiencia: 52, nivel_visto: 5,
  intelecto_base: 3, aura_base: 4, carisma_base: 2,
  forca_base: 3, fisico_base: 4, agilidade_base: 3, percepcao_base: 2,
};

describe('o card em página', () => {
  it('mostra as energias em células e o rodapé', () => {
    const { container } = render(
      <PersonagemCard p={PJ} isMaster={false} isOwn lang="pt" emPagina onAtivar={() => {}}
        rodape={<nav className="paginas-teste">1 2</nav>} />,
    );
    expect(container.querySelector('.pj-card-wrap--pagina')).toBeTruthy();
    const rotulos = [...container.querySelectorAll('.pj-pagina-vitais .mn-rotulo')].map((e) => e.textContent);
    expect(rotulos).toEqual(expect.arrayContaining(['Energia Física', 'Energia Heroica', 'Karma']));
    expect(container.querySelector('.pj-card-rodape .paginas-teste')).toBeTruthy();
  });

  it('clicar no rodapé (a paginação) não ativa o personagem', () => {
    const onAtivar = vi.fn();
    const { container } = render(
      <PersonagemCard p={PJ} isMaster={false} isOwn lang="pt" emPagina onAtivar={onAtivar}
        rodape={<button type="button">2</button>} />,
    );
    fireEvent.click(container.querySelector('.pj-card-rodape button'));
    expect(onAtivar).not.toHaveBeenCalled();
  });

  it('na grade (fora da página) nada muda: sem células de energia e sem rodapé', () => {
    const { container } = render(<PersonagemCard p={PJ} isMaster={false} isOwn lang="pt" onAtivar={() => {}} />);
    expect(container.querySelector('.pj-pagina-vitais')).toBeNull();
    expect(container.querySelector('.pj-card-rodape')).toBeNull();
  });
});

describe('a lista do Jogador pagina; a do Mestre segue em grade', () => {
  it('Jogador: um card por vez, abrindo na página do ativo', () => {
    expect(fonte).toMatch(/!primeiroPj && !isMaster && listaVisivel\.length > 0/);
    expect(fonte).toMatch(/const idxAtivo = listaVisivel\.findIndex\(\(q\) => q\.id === pjAtivoNoPerfil\)/);
    expect(fonte).toMatch(/rodape: total > 1 && Pag \?/);
  });
  it('Mestre: a grade de sempre', () => {
    expect(fonte).toMatch(/!primeiroPj && isMaster && <div className="pjs-grid">/);
  });
});
