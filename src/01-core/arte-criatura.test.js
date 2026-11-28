import { describe, it, expect } from 'vitest';
import { arteDaCriatura } from './arte-criatura.jsx';

describe('arteDaCriatura — um rosto por tipo (28/11/2026)', () => {
  it('todos os Enviados dividem a mesma pintura', () => {
    for (const nome of ['Enviado Menor', 'Enviado I', 'Enviado II', 'Enviado III', 'Enviado IV', 'Enviado V']) {
      expect(arteDaCriatura({ nome })).toBe('/criaturas/enviado.webp');
    }
  });

  it('cada celestial tem o seu rosto, com ou sem acento', () => {
    expect(arteDaCriatura({ nome: 'Pégaso' })).toBe('/criaturas/pegaso.webp');
    expect(arteDaCriatura({ nome: 'Planindea' })).toBe('/criaturas/planindea.webp');
    expect(arteDaCriatura({ nome: 'Águia Real' })).toBe('/criaturas/aguia_real.webp');
    expect(arteDaCriatura({ nome: 'Cronomante' })).toBe('/criaturas/cronomante.webp');
  });

  it('infernais: todos os Demônios numa pintura, todos os Simbiontes noutra', () => {
    for (const nome of ['Demônio Menor', 'Demônio I', 'Demônio II', 'Demônio III', 'Demônio IV', 'Demônio V']) {
      expect(arteDaCriatura({ nome })).toBe('/criaturas/demonio.webp');
    }
    for (const nome of ['Simbionte', 'Simbionte I', 'Simbionte II', 'Simbionte III']) {
      expect(arteDaCriatura({ nome })).toBe('/criaturas/simbionte.webp');
    }
    expect(arteDaCriatura({ nome: 'Cérberus' })).toBe('/criaturas/cerberus.webp');
    expect(arteDaCriatura({ nome: 'Bulgae' })).toBe('/criaturas/bulgae.webp');
    expect(arteDaCriatura({ nome: 'Cavalum' })).toBe('/criaturas/cavalum.webp');
    expect(arteDaCriatura({ nome: 'Haalin' })).toBe('/criaturas/haalin.webp');
  });

  it('a Águia-careca (animal) não pega o rosto da Águia Real', () => {
    expect(arteDaCriatura({ nome: 'Águia-careca' })).toBeNull();
  });

  it('sem pintura ou sem criatura, null', () => {
    expect(arteDaCriatura({ nome: 'Lobo Alfa' })).toBeNull();
    expect(arteDaCriatura(null)).toBeNull();
  });
});
