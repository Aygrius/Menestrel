/* ============================================================
   iniciativa-lista.test.jsx — 08/11/2026
   ============================================================
   "Depois que um npc morre, ele some da lista de iniciativa" — e, perguntado:
   sumir só da LISTA (o corpo fica no campo) e o personagem sempre fica.
   ============================================================ */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

afterEach(cleanup);
const p = (over) => ({ tipo: 'criatura', ref_id: 1, inst_id: over.nome, ordem: 1, status: 'ativo', ef: 5, ef_max: 10, ...over });

describe('a ordem sem as criaturas mortas', () => {
  it('criatura morta sai; desmaiada e personagem morto ficam', () => {
    const lista = [
      p({ nome: 'Vampiro', status: 'morto', ordem: 1 }),
      p({ nome: 'Haalin', status: 'desmaiado', ordem: 2 }),
      p({ nome: 'Lamarc', tipo: 'pj', status: 'morto', ordem: 3 }),
      p({ nome: 'Nenrode', ordem: 4 }),
    ];
    const { container } = render(<window.IniciativaLista participantes={lista} meta={{}} isEn={false} rodada={1} escolhido={null} onEscolher={() => {}} />);
    const nomes = [...container.querySelectorAll('.batalha-ini-nome')].map((n) => n.textContent);
    expect(nomes).toEqual(['Haalin', 'Lamarc', 'Nenrode']);
  });
});
